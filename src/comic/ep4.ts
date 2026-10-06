/**
 * 4화 · MBTI와 사주 — 네 축마다 겉(MBTI)과 속(사주)을 장면으로 비교한다.
 * 같은 축은 한 컷, 다른 축은 '겉 장면 → 속마음 클로즈업' 두 컷. 마지막에 강점·약점·개운법.
 */
import { ELEMENT_HANJA, ELEMENT_KO, type Element, type SajuAnalysis } from '../engine/index.ts';
import type { CrossReport } from '../report/cross.ts';
import { GAEUN } from '../report/mbti.ts';
import { OUTFIT, cut, hey, makeCtx, say, shot, text, think, type Ctx, type Scene } from './ctx.ts';
import type { Beat, Bg, Comic, Face, Mood } from './types.ts';

const KO: Record<string, string> = { E: '외향', I: '내향', S: '감각', N: '직관', T: '사고', F: '감정', J: '계획', P: '즉흥' };

/** 글자별 겉모습 장면 */
const LETTER: Record<string, (c: Ctx) => Scene> = {
  E: (c) => ({
    bg: 'cafe',
    actors: [c.me(200, 'laugh', 'cheer'), c.other('friend', 430, 'grin', 'idle', { dir: -1 })],
    lines: [say(0, '오늘 모임 2차는 내가 쏜다!', 'say', { young: '끝나고 다 같이 놀자!', senior: '오늘 모임은 내가 쏠게!' }), say(1, '역시 분위기 메이커!')],
  }),
  I: (c) => ({ bg: 'bedroom', actors: [c.me(260, 'calm', 'hold', { held: 'book' })], lines: [think(0, '(주말엔 집에서 충전해야지…)')] }),
  S: (c) => ({
    bg: 'home',
    actors: [c.me(200, 'determined', 'hold', { held: 'notebook' }), c.other('friend', 430, 'surprised', 'idle', { dir: -1 })],
    lines: [say(0, '준비물, 일정, 예산까지 다 체크했어.'), say(1, '꼼꼼하다…')],
  }),
  N: (c) => ({
    bg: 'night',
    actors: [c.me(200, 'sparkle', 'think', { fx: ['bulb'] }), c.other('friend', 430, 'annoyed', 'idle', { dir: -1 })],
    lines: [say(0, '만약에… 10년 뒤 우리는 뭘 할까?'), say(1, '또 상상 시작이다.')],
  }),
  T: (c) => ({
    bg: 'cafe',
    actors: [c.other('friend', 190, 'cry', 'idle'), c.me(430, 'thinking', 'cross', { dir: -1 })],
    lines: [say(0, '나 오늘 회사에서 혼났어…', 'say', { young: '나 오늘 선생님한테 혼났어…' }), say(1, '그럼 해결책은 이거야.'), say(0, '…그냥 들어 주면 안 돼?')],
  }),
  F: (c) => ({
    bg: 'cafe',
    actors: [c.other('friend', 190, 'cry', 'idle'), c.me(430, 'sad', 'hold', { held: 'coffee', dir: -1 })],
    lines: [say(0, '나 오늘 진짜 힘들었어…'), say(1, '많이 속상했겠다… 괜찮아?')],
  }),
  J: (c) => ({ bg: 'home', actors: [c.me(260, 'proud', 'hold', { held: 'notebook' })], lines: [say(0, '계획표대로 착착! 완벽해.')], props: [{ kind: 'calendar', x: 470, y: 150 }] }),
  P: (c) => ({
    bg: 'street',
    actors: [c.me(220, 'grin', 'wave', { held: 'bag' }), c.other('friend', 440, 'surprised', 'idle', { dir: -1 })],
    lines: [say(0, '계획? 일단 가 보면 알아!'), say(1, '또 즉흥 여행이야?!', 'shout')],
  }),
};

/** 사주가 가리키는 속마음 (MBTI와 다를 때) */
const INNER: Record<string, { line: string; face: Face; mood: Mood }> = {
  E: { line: '(사실 사람들 틈에서 힘이 나.)', face: 'shy', mood: 'warm' },
  I: { line: '(집에 오면 완전 방전이야…)', face: 'tired', mood: 'cool' },
  S: { line: '(결국 디테일이 날 지켜 줘.)', face: 'thinking', mood: 'soft' },
  N: { line: '(정해진 대로만 하면 답답해.)', face: 'annoyed', mood: 'cool' },
  T: { line: '(머릿속은 이미 해결책 정리 중.)', face: 'thinking', mood: 'cool' },
  F: { line: '(사실 속으로는 상처받았어…)', face: 'sad', mood: 'tone' },
  J: { line: '(마음속엔 늘 계획표가 있어.)', face: 'smile', mood: 'soft' },
  P: { line: '(결국 그날 기분대로 하게 돼.)', face: 'grin', mood: 'sparkle' },
};

const LUCKY: Record<Element, { bg: Bg; line: string }> = {
  wood: { bg: 'park', line: '아침 산책 가자!' },
  fire: { bg: 'street', line: '햇빛 받으러 나가자!' },
  earth: { bg: 'home', line: '오늘도 같은 시간에 밥!' },
  metal: { bg: 'home', line: '정리 정돈 완료!' },
  water: { bg: 'sea', line: '바다 보면서 쉬어야지.' },
};

export function mbtiEpisode(a: SajuAnalysis, x: CrossReport): Comic | null {
  const m = x.mbti;
  if (!m) return null;
  const c = makeCtx(a, x, 'mbti');
  const beats: Beat[] = [];
  const clear = m.sajuType.replace(/x/g, '').split('');
  const sajuLine =
    clear.length === 4 ? `사주로 본 나는 ${m.sajuType}.` : clear.length === 0 ? '사주로 보면 네 축 모두 반반.' : `사주로 본 나는 ${clear.join('·')}가 뚜렷하고,\n나머지 ${4 - clear.length}축은 반반.`;
  const sajuShort = clear.length === 4 ? m.sajuType : clear.length ? `${clear.join('·')} 뚜렷` : '모두 반반';
  const tagline = m.agree === 4 ? '네 글자 모두 사주와 같은 방향' : m.agree === 0 ? '겉과 속이 다른, 반전 매력의 조합' : `네 글자 중 ${m.agree}개가 사주와 같은 방향`;

  beats.push(
    cut(c, '표지', '', { bg: 'home', actors: [c.me(410, 'sparkle', 'point', { dir: -1 })], lines: [] }, { cover: { kicker: '4화', title: `${m.type}와 사주`, tagline } }),
  );
  beats.push(
    text(`MBTI로 본 나는 ${m.type}, ‘${m.profile.nick}’.\n${sajuLine}\n겉과 속은 얼마나 같을까?`, 'plain', {
      title: '겉과 속',
      basis: '사주 축: 십성·오행 분포로 계산',
      note: m.summary,
    }),
  );

  for (const ax of m.axes) {
    const u = ax.user;
    const lean = ax.saju.lean;
    const basis = `사주 ${ax.saju.basis.join(' · ') || '기운 분포'}`;
    if (ax.verdict === 'agree') {
      beats.push(cut(c, `${ax.info.name}`, `${ax.info.name} — MBTI도 사주도 ${u}(${KO[u]})`, LETTER[u](c), { basis, note: ax.text, tone: 'good' }));
    } else if (ax.verdict === 'differ' && lean) {
      const I = INNER[lean];
      beats.push(cut(c, `${ax.info.name} · 겉`, `${ax.info.name} — 겉으로는 ${u}(${KO[u]})`, LETTER[u](c), { note: ax.text }));
      beats.push(cut(c, `${ax.info.name} · 속`, `…하지만 사주는 ${lean}(${KO[lean]}) 쪽`, { bg: 'night', ...shot('close', I.mood), actors: [c.me(380, I.face, 'idle', { dir: -1 })], lines: [think(0, I.line)] }, { basis }));
    } else {
      beats.push(cut(c, `${ax.info.name}`, `${ax.info.name} — ${u}(${KO[u]}), 사주로는 반반`, LETTER[u](c), { basis, note: ax.text }));
    }
  }

  // 강점
  const [s0, s1] = m.strengths;
  beats.push(text('그래서, 내가 살릴 강점은 —', 'soft'));
  beats.push(
    cut(c, '살릴 강점', `강점: ${s0.title}${s1 ? `\n그리고 ${s1.title}` : ''}`, { bg: 'home', ...shot('bust', 'sparkle'), actors: [c.mirror(160, 'grin'), c.me(440, 'proud', 'hips', { dir: -1 })], lines: [say(0, hey(c, '이게 네 진짜 무기야!')), say(1, '역시, 그럴 줄 알았어!')] }, {
      basis: s0.basis,
      note: m.strengths.map((s) => `${s.title}: ${s.text}`).join(' '),
      tone: 'good',
    }),
  );

  // 약점
  const w0 = m.weaknesses[0];
  beats.push(
    cut(c, '보완할 약점', `조심할 점: ${w0.title}`, { bg: 'home', ...shot('bust', 'tone'), actors: [c.mirror(160, 'worried'), c.me(440, 'nervous', 'scratch', { dir: -1 })], lines: [say(0, '여기만 조심하면 돼.'), say(1, '뜨끔…')] }, {
      basis: w0.basis,
      note: m.weaknesses.map((w) => `${w.title}: ${w.text}`).join(' '),
      tone: 'bad',
    }),
  );

  // 개운법
  const ys = a.yongsin.yongsin;
  const g = GAEUN[ys];
  const L = LUCKY[ys];
  const scene: Scene = {
    bg: L.bg,
    actors: [c.me(220, 'grin', 'wave', { outfit: OUTFIT[ys] }), c.mirror(450, 'smile', { dir: -1 })],
    lines: [say(1, `행운의 색은 ${g.color}!`), say(0, L.line)],
  };
  beats.push(
    cut(c, '개운법', `개운법 — ${ELEMENT_KO[ys]}(${ELEMENT_HANJA[ys]}) 기운 채우기\n${g.time} · ${g.place}`, scene, {
      basis: `용신 ${ELEMENT_KO[ys]}(${ELEMENT_HANJA[ys]})`,
      note: `${m.gaeun.items.map((i) => `${i.label}: ${i.value}`).join(' · ')}. ${m.gaeun.habits.join(' / ')}. ${m.gaeun.avoid}`,
      tone: 'good',
    }),
  );

  beats.push(
    cut(c, '마무리', '겉과 속을 알면, 덜 지치고 더 빛난다.', { bg: 'home', ...shot('bust', 'soft'), actors: [c.me(300, 'smile', 'fighting', { front: true })], lines: [say(0, `${m.type}인 나, 꽤 괜찮잖아?`)] }),
  );

  return {
    id: 'mbti',
    no: 4,
    title: `${m.type}와 사주`,
    subtitle: `${m.type} · 사주 ${sajuShort} · ${m.agree}/4 일치`,
    beats,
  };
}
