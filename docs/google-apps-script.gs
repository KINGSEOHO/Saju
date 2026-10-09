/**
 * 명경사주 — 리뷰·평가 수집용 Google Apps Script
 *
 * 사용법은 docs/SETUP-SHEETS.md 참고.
 * 1) 구글 스프레드시트 > 확장 프로그램 > Apps Script 에 이 파일 전체를 붙여 넣기
 * 2) 프로젝트 설정 > 스크립트 속성에 ADMIN_TOKEN 추가 (관리자 통계 화면 비밀번호)
 * 3) 배포 > 새 배포 > 웹 앱 (실행: 나, 액세스: 모든 사용자) → 웹 앱 URL 을 사이트 설정에 입력
 *
 * 개인정보: 이름·생년월일·출생 시각은 사이트에서 보내지 않으며, 여기서도 허용된 항목만 저장한다.
 */

var META = [
  ['dayStem', '일간'],
  ['dayPillar', '일주번호'],
  ['gender', '성별'],
  ['ageGroup', '연령대'],
  ['strength', '신강약'],
  ['gyeokguk', '격국'],
  ['yongsin', '용신'],
  ['yongsinMethod', '용신방법'],
  ['confidence', '확실성'],
  ['timeKnown', '시간앎'],
  ['calendar', '달력'],
  ['mbti', 'MBTI'],
  ['jobCat', '직업분야'],
  // 단계별 측정(이벤트)용 — 뒤에 붙여야 예전 행의 열 위치가 그대로다
  ['item', '항목'],
  ['offer', '선택'],
  ['amount', '금액'],
  // 지인 리뷰 링크(?from=friend)로 들어온 기기 — 통계에서 따로 본다
  ['from', '유입'],
];

var TABLES = {
  feedback: {
    title: '섹션평가',
    cols: [['created_at', '시각'], ['session_id', '세션'], ['section', '섹션'], ['rating', '정확도'], ['comment', '코멘트']],
  },
  reviews: {
    title: '리뷰',
    cols: [
      ['created_at', '시각'], ['session_id', '세션'], ['overall', '만족도'], ['accuracy', '정확도'], ['detail', '상세함'],
      ['text', '의견'], ['price', '지불의향'], ['features', '원하는기능'], ['compare', '타서비스비교'], ['is_public', '공개동의'],
    ],
  },
  events: {
    title: '이벤트',
    cols: [['created_at', '시각'], ['session_id', '세션'], ['type', '종류']],
  },
};

var SECTIONS = ['summary', 'personality', 'love', 'career', 'wealth', 'health', 'gaeun', 'webtoon'];
// 지금 묻는 가격: 무료 / 1,900원 / 3,900원 / 6,900원 / 9,900원 (예전 응답 값도 계속 받는다)
var PRICES = ['free_only', 'p990', 'p1900', 'p1990', 'p2900', 'p3900', 'p4900', 'p6900', 'p9900', 'p19900', 'p29900'];
var FEATURES = ['monthly', 'compat', 'daeun_detail', 'pdf', 'expert', 'career_deep', 'date_pick', 'name'];
var COMPARES = ['much_better', 'better', 'same', 'worse', 'never'];
// 단계별 측정: 접속 → 결과 봄 → 고민 펼침 → (궁합 결과) → 상세·가격 화면 봄 → 결제 버튼 → 결제 완료
var EVENTS = ['analyze', 'share', 'print', 'premium_interest', 'visit', 'concern_open', 'match_result', 'detail_view', 'lock_view', 'pay_click', 'paid'];

function json(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

/** 수식 주입 방지 + 길이 제한 */
function safe(v, max) {
  if (v === null || v === undefined) return '';
  var s = String(v).slice(0, max || 200);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}
function int15(v) {
  return typeof v === 'number' && v % 1 === 0 && v >= 1 && v <= 5 ? v : null;
}

function sheetFor(kind) {
  var t = TABLES[kind];
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(t.title);
  var header = t.cols.map(function (c) { return c[1]; }).concat(META.map(function (m) { return m[1]; }));
  if (!sh) {
    sh = ss.insertSheet(t.title);
    sh.appendRow(header);
    sh.setFrozenRows(1);
  } else if (sh.getLastColumn() < header.length) {
    // 스크립트 업데이트로 열이 늘어난 경우 머리글만 보충 (기존 데이터 위치는 그대로)
    sh.getRange(1, 1, 1, header.length).setValues([header]);
  }
  return sh;
}

function metaCells(m) {
  m = m && typeof m === 'object' ? m : {};
  return META.map(function (k) {
    var v = m[k[0]];
    return typeof v === 'number' || typeof v === 'boolean' || typeof v === 'string' ? safe(v, 32) : '';
  });
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var b = JSON.parse(e.postData.contents);
    var now = new Date();
    var sid = typeof b.sessionId === 'string' ? safe(b.sessionId, 64) : 'anon';
    var row;
    if (b.kind === 'feedback') {
      var rating = int15(b.rating);
      if (SECTIONS.indexOf(b.section) < 0 || rating === null) return json({ error: 'invalid feedback' });
      row = [now, sid, b.section, rating, safe(b.comment, 300)];
    } else if (b.kind === 'reviews') {
      var overall = int15(b.overall);
      var accuracy = int15(b.accuracy);
      if (overall === null || accuracy === null) return json({ error: 'invalid review' });
      var feats = (Array.isArray(b.features) ? b.features : []).filter(function (f) { return FEATURES.indexOf(f) >= 0; });
      row = [
        now, sid, overall, accuracy, int15(b.detail) || '', safe(b.text, 2000),
        PRICES.indexOf(b.price) >= 0 ? b.price : '', feats.join(','),
        COMPARES.indexOf(b.compare) >= 0 ? b.compare : '', b.public === true ? 1 : 0,
      ];
    } else if (b.kind === 'events') {
      if (EVENTS.indexOf(b.type) < 0) return json({ error: 'invalid event' });
      row = [now, sid, b.type];
    } else {
      return json({ error: 'unknown kind' });
    }
    sheetFor(b.kind).appendRow(row.concat(metaCells(b.meta)));
    return json({ ok: true });
  } catch (err) {
    return json({ error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

/** 관리자 통계용 원본 데이터 (토큰 필요) */
function doGet(e) {
  var token = PropertiesService.getScriptProperties().getProperty('ADMIN_TOKEN');
  if (!token || !e.parameter || e.parameter.token !== token) return json({ error: 'unauthorized' });
  var out = {};
  Object.keys(TABLES).forEach(function (kind) {
    var keys = TABLES[kind].cols.map(function (c) { return c[0]; });
    var metaKeys = META.map(function (m) { return m[0]; });
    var values = sheetFor(kind).getDataRange().getValues().slice(1);
    out[kind] = values.map(function (r) {
      var o = {};
      keys.forEach(function (k, i) { o[k] = r[i] instanceof Date ? r[i].toISOString() : r[i]; });
      var meta = {};
      metaKeys.forEach(function (k, i) {
        var v = r[keys.length + i];
        if (v !== '' && v !== null && v !== undefined) meta[k] = v;
      });
      o.meta = meta;
      return o;
    });
  });
  return json(out);
}
