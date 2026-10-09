/**
 * 4화 · MBTI와 사주 — 명경이가 진행하는 퀴즈쇼 ‘겉과 속 대결’.
 * 네 축마다 겉(MBTI)과 속(사주)을 비교: 같으면 한 컷(딩동댕), 다르면 기대 vs 현실 분할 컷, 사주가 반반이면 ‘반반 치킨’.
 * 마지막에 필살기(강점)·약점 공격·개운 아이템 상점.
 */
import { ELEMENT_HANJA, ELEMENT_KO, type Element, type SajuAnalysis } from '../engine/index.ts';
import type { CrossReport } from '../report/cross.ts';
import { EL_WORD, cut, hey, makeCtx, say, shout, text, think, type Ctx, type Scene } from './ctx.ts';
import { EL_COLOR } from './toon.tsx';
import type { Beat, Comic, Face, Half } from './types.ts';

const KO: Record<string, string> = { E: '외향', I: '내향', S: '감각', N: '직관', T: '사고', F: '감정', J: '계획', P: '즉흥' };

/** 글자별 겉모습 장면 */
const LETTER: Record<string, (c: Ctx, x0: number, x1: number) => Scene> = {
  E: (c, x0, x1) => ({
    bg: 'cafe',
    cast: [c.me(x0, 'happy', 'cheer'), c.other('friend', x1, 'happy', 'stand', { dir: -1 })],
    talk: [shout(0, '오늘 2차는 내가 쏜다!', { young: '끝나고 다 같이 놀자!', senior: '오늘 모임은 내가 쏠게!' }), say(1, '역시 분위기 메이커!')],
  }),
  I: (c, x0) => ({ bg: 'bedroom', cast: [c.me(x0, 'happy', 'hold', { held: 'plush' })], talk: [think(0, '(주말엔 이불 밖은 위험해.)')] }),
  S: (c, x0, x1) => ({ bg: 'room', cast: [c.me(x0, 'proud', 'hold', { held: 'paper' }), c.other('friend', x1, 'surprised', 'stand', { dir: -1 })], talk: [say(0, '준비물, 일정, 예산까지 다 체크했어.'), say(1, '꼼꼼하다…')] }),
  N: (c, x0, x1) => ({ bg: 'space', cast: [c.me(x0, 'star', 'think', { fx: ['bulb'] }), c.other('friend', x1, 'blank', 'stand', { dir: -1 })], talk: [say(0, '만약에 내일 지구가 멈추면 뭐 할 거야?'), say(1, '…또 시작이다.')] }),
  T: (c, x0, x1) => ({
    bg: 'cafe',
    cast: [c.other('friend', x0, 'cry', 'stand'), c.me(x1, 'serious', 'cross', { dir: -1 })],
    talk: [say(0, '나 오늘 혼났어…', 'say', { young: '나 오늘 선생님한테 혼났어…' }), say(1, '그럼 해결책은 세 가지야.')],
  }),
  F: (c, x0, x1) => ({ bg: 'cafe', cast: [c.other('friend', x0, 'cry', 'stand'), c.me(x1, 'cry', 'stand', { dir: -1 })], talk: [say(0, '나 오늘 진짜 힘들었어…'), say(1, '어떡해… 나까지 눈물 나…')] }),
  J: (c, x0) => ({ bg: 'room', cast: [c.me(x0, 'proud', 'hold', { held: 'paper' })], talk: [say(0, '계획표대로 착착! 완벽해.')], props: [{ kind: 'calendar', x: x0 + 250, y: 170, label: '계획' }] }),
  P: (c, x0, x1) => ({ bg: 'street', cast: [c.me(x0, 'happy', 'wave', { held: 'bag' }), c.other('friend', x1, 'shock', 'stand', { dir: -1 })], talk: [say(0, '계획? 일단 가 보면 알아!'), shout(1, '또 즉흥 여행이야?!')] }),
};

/** 분할 컷 왼쪽(겉) — 한 사람만, 짧게 */
const LETTER_HALF: Record<string, (c: Ctx) => Omit<Half, 'label'>> = {
  E: (c) => ({ bg: 'cafe', cast: [c.me(150, 'happy', 'cheer')], talk: [say(0, '2차는 내가 쏜다!', 'say', { young: '다 같이 놀자!' })] }),
  I: (c) => ({ bg: 'bedroom', cast: [c.me(150, 'happy', 'hold', { held: 'plush' })], talk: [think(0, '(이불 밖은 위험해.)')] }),
  S: (c) => ({ bg: 'room', cast: [c.me(150, 'proud', 'hold', { held: 'paper' })], talk: [say(0, '체크리스트 완료.')] }),
  N: (c) => ({ bg: 'space', cast: [c.me(150, 'star', 'think', { fx: ['bulb'] })], talk: [say(0, '만약에 말이야…')] }),
  T: (c) => ({ bg: 'cafe', cast: [c.me(150, 'serious', 'cross')], talk: [say(0, '해결책은 세 가지야.')] }),
  F: (c) => ({ bg: 'cafe', cast: [c.me(150, 'cry', 'stand')], talk: [say(0, '나까지 눈물 나…')] }),
  J: (c) => ({ bg: 'room', cast: [c.me(150, 'proud', 'hold', { held: 'paper' })], talk: [say(0, '계획대로 착착.')] }),
  P: (c) => ({ bg: 'street', cast: [c.me(150, 'happy', 'wave', { held: 'bag' })], talk: [say(0, '일단 가 보자!')] }),
};

/** 사주가 가리키는 속마음 (MBTI와 다를 때) */
const INNER: Record<string, { line: string; face: Face; bg: Half['bg'] }> = {
  E: { line: '(사실 사람들 틈에서 힘이 나.)', face: 'blush', bg: 'flowers' },
  I: { line: '(집에 오면 완전 방전…)', face: 'dead', bg: 'bedroom' },
  S: { line: '(결국 디테일이 날 지켜 줘.)', face: 'think', bg: 'room' },
  N: { line: '(정해진 대로만 하면 답답해.)', face: 'plain', bg: 'space' },
  T: { line: '(머릿속은 이미 해결책 정리 중.)', face: 'serious', bg: 'room' },
  F: { line: '(사실 속으로는 상처받았어…)', face: 'cry', bg: 'rain' },
  J: { line: '(마음속엔 늘 계획표가 있어.)', face: 'smile', bg: 'room' },
  P: { line: '(결국 그날 기분대로 하게 돼.)', face: 'grin', bg: 'street' },
};

/** 사주로는 반반인 축 — 라운드마다 다른 장면 */
const HALF_HALF: ((c: Ctx) => Scene)[] = [
  (c) => ({ bg: 'kitchen', cast: [c.me(170, 'happy', 'hold', { held: 'chicken' }), c.mirror(440, 'smile', 'stand', { dir: -1 })], talk: [say(1, '사주로는 반반이야!'), say(0, '반반은 치킨만 좋은 줄 알았는데.')] }),
  (c) => ({ bg: 'space', cast: [c.me(170, 'think', 'hold', { held: 'magnifier' }), c.mirror(440, 'smile', 'stand', { dir: -1 })], talk: [say(1, '현실도 보고 꿈도 꾸는 반반 타입!'), say(0, '그럼 난 현실적인 몽상가?')] }),
  (c) => ({ bg: 'room', cast: [c.me(170, 'cry', 'cross'), c.mirror(440, 'smug', 'stand', { dir: -1 })], talk: [say(1, '머리랑 가슴이 반반이네.'), say(0, '…논리적으로 우는 중이야.')] }),
  (c) => ({ bg: 'room', cast: [c.me(170, 'smug', 'hold', { held: 'paper' }), c.mirror(440, 'plain', 'stand', { dir: -1 })], talk: [say(0, '계획은 세웠어. 지킬지는 몰라.'), say(1, '…완벽한 반반이다.')] }),
];

/** 개운 아이템 상점 진열대 (짧은 이름) */
const SHOP: Record<Element, string[]> = {
  wood: ['초록 소품', '아침 산책', '신맛 음식', '화분', '새 배움'],
  fire: ['빨강 포인트', '햇빛 20분', '따뜻한 차', '밝은 조명', '사람 만남'],
  earth: ['노랑·베이지', '규칙적 식사', '뿌리채소', '도자기', '약속 지키기'],
  metal: ['흰색·은색', '정리 정돈', '흰 음식', '시계', '덜어 내기'],
  water: ['검정·남색', '숙면 7시간', '검은콩', '물병', '혼자 생각'],
};

export function mbtiEpisode(a: SajuAnalysis, x: CrossReport): Comic | null {
  const m = x.mbti;
  if (!m) return null;
  const c = makeCtx(a, x, 'mbti');
  const beats: Beat[] = [];
  const clear = m.sajuType.replace(/x/g, '').split('');
  const sajuLine = clear.length === 4 ? `사주로 본 나는 ${m.sajuType}.` : clear.length === 0 ? '사주로 보면 네 축 모두 반반.' : `사주로 본 나는 ${clear.join('·')}가 뚜렷하고, 나머지 ${4 - clear.length}축은 반반.`;
  const sajuShort = clear.length === 4 ? m.sajuType : clear.length ? `${clear.join('·')} 뚜렷` : '모두 반반';
  const tagline = m.agree === 4 ? '네 글자 모두 사주와 같은 방향' : m.agree === 0 ? '겉과 속이 다른, 반전 매력의 조합' : `네 글자 중 ${m.agree}개가 사주와 같은 방향`;

  beats.push(cut(c, '표지', '', { bg: 'stage', cast: [c.me(430, 'smug', 'point', { dir: -1 })], talk: [] }, { cover: { kicker: '4화', title: `${m.type}와 사주`, tagline } }));
  beats.push(
    cut(c, '퀴즈쇼', '명경이의 퀴즈쇼 — 겉과 속 대결!', {
      bg: 'stage',
      cast: [c.mirror(300, 'happy', 'hold', { held: 'mic' })],
      talk: [shout(0, 'MBTI 대 사주! 누가 진짜 너를 알까?')],
      props: [
        { kind: 'podium', x: 110, label: 'MBTI', color: '#6aa1e6' },
        { kind: 'podium', x: 490, label: '사주', color: '#f2836b' },
      ],
      sfx: [{ text: '두둥!', x: 300, y: 420, size: 40, color: '#ffb000' }],
    }),
  );
  beats.push(text(`MBTI로 본 나는 ${m.type}, ‘${m.profile.nick}’.\n${sajuLine}`, 'plain', { title: '겉과 속', basis: '사주 축: 십성·오행 분포로 계산', note: m.summary }));

  m.axes.forEach((ax, i) => {
    const u = ax.user;
    const lean = ax.saju.lean;
    const basis = `사주 ${ax.saju.basis.join(' · ') || '기운 분포'}`;
    const round = `ROUND ${i + 1} · ${ax.info.name}`;
    if (ax.verdict === 'agree') {
      beats.push(cut(c, round, `${round} — MBTI도 사주도 ${u}(${KO[u]})`, LETTER[u](c, 170, 440), { basis, note: ax.text, tone: 'good', badge: '딩동댕! 일치' }));
    } else if (ax.verdict === 'differ' && lean) {
      const I = INNER[lean];
      beats.push(
        cut(c, round, '', {
          bg: 'white',
          cast: [],
          talk: [],
          split: [
            { label: `MBTI(겉): ${u}`, ...LETTER_HALF[u](c) },
            { label: `사주(속): ${lean}`, bg: I.bg, cast: [c.me(150, I.face, 'stand')], talk: [think(0, I.line)] },
          ],
        }, { basis, note: `${round}: 겉으로는 ${u}(${KO[u]}), 사주는 ${lean}(${KO[lean]}) 쪽이에요. ${ax.text}` }),
      );
    } else {
      beats.push(cut(c, round, `${round} — ${u}(${KO[u]}), 사주로는 반반`, HALF_HALF[i % 4](c), { basis, note: ax.text }));
    }
  });

  // 필살기 (강점)
  const [s0, s1] = m.strengths;
  beats.push(
    cut(c, '필살기', `필살기: ${s0.title}!`, { bg: 'drama', drama: true, cast: [c.me(300, 'serious', 'fist', { fx: ['aura'], sym: 'flare' })], talk: [shout(0, '받아라!')] }, {
      basis: s0.basis,
      note: m.strengths.map((s) => `${s.title}: ${s.text}`).join(' '),
      tone: 'good',
    }),
  );
  beats.push(
    cut(c, '필살기 반응', s1 ? `보조 스킬: ${s1.title}` : '', { bg: 'sparkle', shot: 'bust', cast: [c.mirror(160, 'happy'), c.me(440, 'proud', 'hips', { dir: -1 })], talk: [say(0, hey(c, '이게 네 진짜 무기야!')), say(1, '역시, 그럴 줄 알았어!')] }),
  );

  // 약점
  const w0 = m.weaknesses[0];
  beats.push(
    cut(c, '약점 공격', `약점: ${w0.title}`, { bg: 'speed', cast: [c.me(240, 'dead', 'otl'), c.mirror(490, 'smug', 'stand', { dir: -1 })], talk: [say(1, '여기만 조심하면 돼.')], sfx: [{ text: '퍽!', x: 120, y: 200, size: 64 }] }, {
      basis: w0.basis,
      note: m.weaknesses.map((w) => `${w.title}: ${w.text}`).join(' '),
      tone: 'bad',
    }),
  );

  // 개운 아이템 상점
  const ys = a.yongsin.yongsin;
  beats.push(
    cut(c, '개운 상점', `개운법 — ${EL_WORD[ys]}(${ELEMENT_HANJA[ys]}) 기운 채우기`, {
      bg: 'shop',
      cast: [c.mirror(520, 'happy', 'hold', { dir: -1 })],
      talk: [say(0, '개운 아이템 입고됐습니다~')],
      props: [{ kind: 'shelf', x: 240, y: 90, w: 440, rows: SHOP[ys], color: EL_COLOR[ys] }],
    }, {
      basis: `용신 ${ELEMENT_KO[ys]}(${ELEMENT_HANJA[ys]})`,
      note: `진짜 개운 아이템은 물건이 아니라 습관 — ${m.gaeun.habits[0]}. 일·연애·돈·시험에 맞춘 개운법은 고민 리포트에 있어요.`,
      tone: 'good',
    }),
  );
  beats.push(cut(c, '결제', '', { bg: 'shop', shot: 'bust', cast: [c.me(170, 'money', 'point'), c.mirror(440, 'smug', 'stand', { dir: -1 })], talk: [shout(0, '전부 주세요!'), say(1, '결제는 돈 말고 습관으로 받아.')] }));

  beats.push(
    cut(c, '마무리', '겉과 속을 알면, 덜 지치고 더 빛난다.', { bg: 'sparkle', shot: 'bust', cast: [c.me(300, 'proud', 'hips', { front: true, sym: 'flare' })], talk: [say(0, `${m.type}인 나, 꽤 괜찮잖아?`)] }),
  );
  beats.push(text('인생 웹툰 시즌 1 끝.\n내 사주가 궁금해질 때마다, 명경이는 여기 있을게.', 'soft'));

  return {
    id: 'mbti',
    no: 4,
    title: `${m.type}와 사주`,
    subtitle: `${m.type} · 사주 ${sajuShort} · ${m.agree}/4 일치`,
    beats,
  };
}
