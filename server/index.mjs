/**
 * 명경사주 API 서버 — 리뷰·정확도 평가·이벤트 수집 + 관리자 통계 + 정적 파일 서빙
 *
 * 외부 의존성 없음: Node 22.5+ 의 node:http, node:sqlite 사용
 *   개발:  npm run dev      (Vite 5173 → /api 프록시 → 이 서버 8787)
 *   운영:  npm run build && ADMIN_TOKEN=... npm start   (dist/ 정적 파일 + /api)
 *
 * 개인정보 원칙: 이름·생년월일·출생시각은 받지 않는다. 클라이언트가 보내는 익명 요약(meta)만 저장.
 */
import { createReadStream, existsSync, mkdirSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { dirname, extname, join, normalize, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.PORT ?? 8787);
const DEV = process.argv.includes('--dev');
const ADMIN_TOKEN = process.env.ADMIN_TOKEN ?? (DEV ? 'dev-admin' : '');
const DB_PATH = process.env.DB_PATH ?? join(ROOT, 'data', 'saju.db');
const DIST = join(ROOT, 'dist');
const PROD = process.argv.includes('--prod') || process.env.NODE_ENV === 'production';

mkdirSync(dirname(DB_PATH), { recursive: true });
const db = new DatabaseSync(DB_PATH);
db.exec(`
  PRAGMA journal_mode = WAL;
  CREATE TABLE IF NOT EXISTS feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    session_id TEXT NOT NULL,
    section TEXT NOT NULL,
    rating INTEGER NOT NULL,
    comment TEXT,
    meta TEXT
  );
  CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    session_id TEXT NOT NULL,
    overall INTEGER NOT NULL,
    accuracy INTEGER NOT NULL,
    detail INTEGER,
    text TEXT,
    price TEXT,
    features TEXT,
    compare TEXT,
    is_public INTEGER NOT NULL DEFAULT 0,
    meta TEXT
  );
  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    session_id TEXT NOT NULL,
    type TEXT NOT NULL,
    meta TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_feedback_section ON feedback(section);
  CREATE INDEX IF NOT EXISTS idx_events_type ON events(type, created_at);
`);

// ---------------------------------------------------------------------------
// 유틸
// ---------------------------------------------------------------------------
const SECTIONS = new Set(['summary', 'personality', 'love', 'career', 'wealth', 'health', 'gaeun', 'webtoon']);
const PRICE_ORDER = ['free_only', 'p990', 'p1900', 'p1990', 'p2900', 'p3900', 'p4900', 'p6900', 'p9900', 'p19900', 'p29900'];
const PRICES = new Set(PRICE_ORDER);
const FEATURES = new Set(['monthly', 'compat', 'daeun_detail', 'pdf', 'expert', 'career_deep', 'date_pick', 'name']);
const COMPARES = new Set(['much_better', 'better', 'same', 'worse', 'never']);
// 단계별 측정(src/lib/funnel.ts)과 같은 이름
const FUNNEL_TYPES = ['visit', 'analyze', 'concern_open', 'match_result', 'detail_view', 'lock_view', 'pay_click', 'paid'];
const EVENT_TYPES = new Set(['share', 'print', 'premium_interest', ...FUNNEL_TYPES]);
const CHART_KEYS = ['dayPillar', 'dayStem', 'gender', 'ageGroup', 'strength', 'gyeokguk', 'yongsin', 'yongsinMethod', 'confidence', 'timeKnown', 'calendar', 'mbti', 'jobCat'];
// 단계별 측정(이벤트)용 — 어느 고민 · 고른 선택지 · 금액
const META_KEYS = [...CHART_KEYS, 'item', 'offer', 'amount'];

const int15 = (v) => (Number.isInteger(v) && v >= 1 && v <= 5 ? v : null);
const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) || null : null);
const sid = (v) => (typeof v === 'string' && /^[\w-]{1,64}$/.test(v) ? v : 'anon');

/** 허용된 키·원시값만 남겨 저장 (생년월일 등이 섞여 들어오지 않도록) */
function cleanMeta(m) {
  if (!m || typeof m !== 'object') return null;
  const out = {};
  for (const k of META_KEYS) {
    const v = m[k];
    if (typeof v === 'number' || typeof v === 'boolean') out[k] = v;
    else if (typeof v === 'string') out[k] = v.slice(0, 32);
  }
  return JSON.stringify(out);
}

// 단순 IP 기반 속도 제한 (분당 60회)
const hits = new Map();
function rateLimited(ip) {
  const now = Date.now();
  const arr = (hits.get(ip) ?? []).filter((t) => now - t < 60000);
  arr.push(now);
  hits.set(ip, arr);
  if (hits.size > 10000) hits.clear();
  return arr.length > 60;
}

function send(res, status, body, headers = {}) {
  const data = typeof body === 'string' ? body : JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': typeof body === 'string' ? 'text/plain; charset=utf-8' : 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    ...headers,
  });
  res.end(data);
}

function readJson(req, limit = 16 * 1024) {
  return new Promise((resolveP, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) {
        reject(new Error('payload too large'));
        req.destroy();
      } else chunks.push(c);
    });
    req.on('end', () => {
      try {
        resolveP(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'));
      } catch {
        reject(new Error('invalid json'));
      }
    });
    req.on('error', reject);
  });
}

// ---------------------------------------------------------------------------
// 핸들러
// ---------------------------------------------------------------------------
const insFeedback = db.prepare('INSERT INTO feedback (session_id, section, rating, comment, meta) VALUES (?, ?, ?, ?, ?)');
const insReview = db.prepare(
  'INSERT INTO reviews (session_id, overall, accuracy, detail, text, price, features, compare, is_public, meta) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
);
const insEvent = db.prepare('INSERT INTO events (session_id, type, meta) VALUES (?, ?, ?)');

function postFeedback(b) {
  const rating = int15(b.rating);
  if (!SECTIONS.has(b.section) || rating === null) return [400, { error: 'invalid feedback' }];
  insFeedback.run(sid(b.sessionId), b.section, rating, str(b.comment, 300), cleanMeta(b.meta));
  return [201, { ok: true }];
}

function postReview(b) {
  const overall = int15(b.overall);
  const accuracy = int15(b.accuracy);
  if (overall === null || accuracy === null) return [400, { error: 'overall and accuracy are required (1-5)' }];
  const features = Array.isArray(b.features) ? b.features.filter((f) => FEATURES.has(f)).slice(0, 8) : [];
  insReview.run(
    sid(b.sessionId),
    overall,
    accuracy,
    int15(b.detail),
    str(b.text, 2000),
    PRICES.has(b.price) ? b.price : null,
    JSON.stringify(features),
    COMPARES.has(b.compare) ? b.compare : null,
    b.public === true ? 1 : 0,
    cleanMeta(b.meta),
  );
  return [201, { ok: true }];
}

function postEvent(b) {
  if (!EVENT_TYPES.has(b.type)) return [400, { error: 'invalid event' }];
  insEvent.run(sid(b.sessionId), b.type, cleanMeta(b.meta));
  return [201, { ok: true }];
}

function q(sql, ...params) {
  return db.prepare(sql).all(...params);
}

function stats() {
  const one = (sql) => db.prepare(sql).get();
  const totals = {
    analyses: one("SELECT COUNT(*) AS n FROM events WHERE type = 'analyze'").n,
    feedback: one('SELECT COUNT(*) AS n FROM feedback').n,
    reviews: one('SELECT COUNT(*) AS n FROM reviews').n,
    sessions: one("SELECT COUNT(DISTINCT session_id) AS n FROM events WHERE type = 'analyze'").n,
  };
  const ov = one('SELECT COUNT(*) AS n, AVG(overall) AS o, AVG(accuracy) AS a, AVG(detail) AS d FROM reviews');
  const sections = [...SECTIONS].map((s) => {
    const r = db.prepare('SELECT COUNT(*) AS n, AVG(rating) AS avg FROM feedback WHERE section = ?').get(s);
    const dist = [1, 2, 3, 4, 5].map((k) => db.prepare('SELECT COUNT(*) AS n FROM feedback WHERE section = ? AND rating = ?').get(s, k).n);
    return { section: s, n: r.n, avg: r.avg, dist };
  });
  const price = q('SELECT price AS key, COUNT(*) AS n FROM reviews WHERE price IS NOT NULL GROUP BY price').sort(
    (a, b) => PRICE_ORDER.indexOf(a.key) - PRICE_ORDER.indexOf(b.key),
  );
  const features = q('SELECT j.value AS key, COUNT(*) AS n FROM reviews, json_each(reviews.features) AS j GROUP BY j.value ORDER BY n DESC');
  const compare = q('SELECT compare AS key, COUNT(*) AS n FROM reviews WHERE compare IS NOT NULL GROUP BY compare ORDER BY n DESC');
  const byMeta = (field) =>
    q(
      `SELECT CAST(json_extract(meta, '$.${field}') AS TEXT) AS key, COUNT(*) AS n, AVG(accuracy) AS avg
       FROM reviews WHERE json_extract(meta, '$.${field}') IS NOT NULL GROUP BY key ORDER BY n DESC`,
    );
  const daily = q(
    `SELECT day, SUM(a) AS analyses, SUM(r) AS reviews FROM (
       SELECT date(created_at) AS day, 1 AS a, 0 AS r FROM events WHERE type = 'analyze'
       UNION ALL SELECT date(created_at), 0, 1 FROM reviews
     ) GROUP BY day ORDER BY day DESC LIMIT 30`,
  );
  const recentReviews = q('SELECT created_at, overall, accuracy, text, price, meta FROM reviews ORDER BY id DESC LIMIT 30').map((r) => ({
    ...r,
    meta: r.meta ? JSON.parse(r.meta) : {},
  }));
  const recentComments = q('SELECT created_at, section, rating, comment FROM feedback WHERE comment IS NOT NULL ORDER BY id DESC LIMIT 30');
  // 단계별 측정 — 최근 90일 원본을 넘기고, 계산은 관리 화면(src/lib/stats.ts의 computeFunnel)이 한다
  const funnelEvents = q(
    `SELECT created_at, session_id, type, meta FROM events WHERE type IN (${FUNNEL_TYPES.map(() => '?').join(',')}) AND created_at >= datetime('now', '-90 days') ORDER BY id`,
    ...FUNNEL_TYPES,
  ).map((r) => ({ ...r, meta: r.meta ? JSON.parse(r.meta) : {} }));

  // 유료 전환 판단 보조 (docs/MONETIZATION.md 의 게이트 기준)
  const priced = price.reduce((a, p) => a + p.n, 0);
  const paid = price.filter((p) => p.key !== 'free_only').reduce((a, p) => a + p.n, 0);
  const wtpPaidShare = priced ? paid / priced : null;
  let medianPrice = null;
  if (paid) {
    let acc = 0;
    for (const p of price.filter((x) => x.key !== 'free_only')) {
      acc += p.n;
      if (acc >= paid / 2) {
        medianPrice = p.key;
        break;
      }
    }
  }
  const notes = [];
  const minReviews = 100;
  if (totals.reviews < minReviews) notes.push(`리뷰 ${totals.reviews}/${minReviews}건 — 통계적으로 의미 있는 표본까지 수집을 계속하세요.`);
  if (ov.a !== null && ov.a < 3.8) notes.push(`평균 정확도 ${ov.a.toFixed(2)} < 3.8 — 과금보다 해석 엔진 개선이 먼저예요.`);
  if (wtpPaidShare !== null && wtpPaidShare < 0.25) notes.push(`유료 의향 ${Math.round(wtpPaidShare * 100)}% < 25% — 가격 제시 전에 가치 증명이 더 필요해요.`);
  const weak = sections.filter((s) => s.n >= 20 && s.avg !== null && s.avg < 3.5).map((s) => s.section);
  if (weak.length) notes.push(`정확도가 낮은 섹션(${weak.join(', ')})은 유료 후보에서 제외하고 개선하세요.`);
  const strong = sections.filter((s) => s.n >= 20 && s.avg !== null && s.avg >= 4).map((s) => s.section);
  if (strong.length) notes.push(`정확도 4.0 이상 섹션(${strong.join(', ')})은 유료 상세 리포트의 1순위 후보예요.`);
  const ready = totals.reviews >= minReviews && ov.a !== null && ov.a >= 3.8 && wtpPaidShare !== null && wtpPaidShare >= 0.25;
  if (ready) notes.push('게이트 통과: 상위 수요 기능을 묶어 유료 상품 A/B 테스트를 시작할 수 있어요.');

  return {
    totals,
    overall: { n: ov.n, avgOverall: ov.o, avgAccuracy: ov.a, avgDetail: ov.d },
    sections,
    price,
    features,
    compare,
    byStrength: byMeta('strength'),
    byDayStem: byMeta('dayStem'),
    byConfidence: byMeta('confidence'),
    byTimeKnown: byMeta('timeKnown'),
    daily,
    recentReviews,
    recentComments,
    funnelEvents,
    decision: { ready, notes, wtpPaidShare, medianPrice },
  };
}

function publicReviews() {
  return q('SELECT created_at, overall, accuracy, text FROM reviews WHERE is_public = 1 AND text IS NOT NULL ORDER BY id DESC LIMIT 20');
}

// ---------------------------------------------------------------------------
// 정적 파일
// ---------------------------------------------------------------------------
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.json': 'application/json',
  '.woff2': 'font/woff2',
};

function serveStatic(req, res) {
  const urlPath = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  let file = normalize(join(DIST, urlPath));
  if (!file.startsWith(DIST)) return send(res, 403, 'forbidden');
  if (!existsSync(file) || statSync(file).isDirectory()) file = join(DIST, 'index.html');
  if (!existsSync(file)) return send(res, 404, 'not built — run `npm run build`');
  const ext = extname(file);
  res.writeHead(200, {
    'Content-Type': MIME[ext] ?? 'application/octet-stream',
    'Cache-Control': file.includes(`${join('dist', 'assets')}`) ? 'public, max-age=31536000, immutable' : 'no-cache',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
  });
  createReadStream(file).pipe(res);
}

// ---------------------------------------------------------------------------
// 서버
// ---------------------------------------------------------------------------
const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  const ip = (req.headers['x-forwarded-for']?.toString().split(',')[0] ?? req.socket.remoteAddress ?? '').trim();
  try {
    if (url.pathname.startsWith('/api/')) {
      if (req.method === 'POST') {
        if (rateLimited(ip)) return send(res, 429, { error: 'too many requests' });
        const body = await readJson(req);
        const route = { '/api/feedback': postFeedback, '/api/reviews': postReview, '/api/events': postEvent }[url.pathname];
        if (!route) return send(res, 404, { error: 'not found' });
        const [status, out] = route(body);
        return send(res, status, out);
      }
      if (req.method === 'GET' && url.pathname === '/api/stats') {
        const auth = req.headers.authorization ?? '';
        if (!ADMIN_TOKEN || auth !== `Bearer ${ADMIN_TOKEN}`) return send(res, 401, { error: 'unauthorized' });
        return send(res, 200, stats());
      }
      if (req.method === 'GET' && url.pathname === '/api/reviews/public') return send(res, 200, publicReviews());
      if (req.method === 'GET' && url.pathname === '/api/health') return send(res, 200, { ok: true });
      return send(res, 404, { error: 'not found' });
    }
    if (PROD && (req.method === 'GET' || req.method === 'HEAD')) return serveStatic(req, res);
    return send(res, 404, 'API server. In development open the Vite dev server (http://localhost:5173).');
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return send(res, msg === 'payload too large' ? 413 : 400, { error: msg });
  }
});

server.listen(PORT, () => {
  console.log(`[명경사주 API] http://localhost:${PORT}  (db: ${DB_PATH}${ADMIN_TOKEN ? '' : ', ADMIN_TOKEN 미설정 → /api/stats 비활성'})`);
});
