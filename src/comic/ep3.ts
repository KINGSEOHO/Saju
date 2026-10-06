/**
 * 3화 · 나의 인생 연대기 — 인생을 RPG로 치면? 어린 시절(월지)은 튜토리얼, 대운 열 해는 STAGE 하나.
 * 운이 좋은 시기는 '레벨 업·보상', 보통인 시기는 '퀘스트', 힘든 시기는 '보스전'으로 그린다.
 * 시기 판정(대운 십성·점수·충합 신호)은 이야기형 풀이(인생 연대기)와 같은 기준을 쓴다.
 */
import { pillarHanja, type SajuAnalysis, type TenGodGroup } from '../engine/index.ts';
import { groupOf } from '../engine/tenGods.ts';
import { lifeShape } from '../report/metrics.ts';
import { DECADE_THEME, GENDER_NOTE, STAGE_SCENE, flagText, lifeStage, toneText, type LifeStage } from '../report/storyKb.ts';
import { cutRaw, makeCtx, say, shout, text, think, toneOf, type Ctx, type Scene } from './ctx.ts';
import type { Age, Beat, Comic, MonsterKind, PanelTone } from './types.ts';

function ageOfStage(s: LifeStage): Age {
  if (s === 'child') return 'kid';
  if (s === 'teen') return 'teen';
  if (s === 'senior') return 'senior';
  return 'adult';
}
type Band = 'young' | 'adult' | 'senior';
const bandOf = (age: Age): Band => (age === 'kid' || age === 'teen' ? 'young' : age === 'senior' ? 'senior' : 'adult');

/** 튜토리얼 — 어린 시절 (월지 십성) */
const CHILD: Record<TenGodGroup, { skill: string; s: (c: Ctx) => Scene }> = {
  비겁: { skill: '고집 스킬 습득', s: (c) => ({ bg: 'park', cast: [c.me(170, 'rage', 'hold', { age: 'kid', held: 'plush' }), c.other('child', 430, 'cry', 'stand', { dir: -1 })], talk: [shout(0, '내 거야!'), say(1, '나도 갖고 놀래…')] }) },
  식상: { skill: '표현력 스킬 습득', s: (c) => ({ bg: 'room', cast: [c.me(170, 'happy', 'hold', { age: 'kid', held: 'crayon' }), c.other('parent', 430, 'shock', 'stand', { dir: -1 })], talk: [say(0, '엄마! 내 작품 봐!'), shout(1, '벽에다…?')], marks: [{ text: '거실 벽 = 첫 전시회', x: 300, y: 420 }] }) },
  재성: { skill: '계산 스킬 습득', s: (c) => ({ bg: 'room', cast: [c.me(260, 'money', 'hold', { age: 'kid', held: 'piggy' })], talk: [think(0, '(3주만 모으면 장난감 산다.)')], props: [{ kind: 'calendar', x: 470, y: 170, label: 'D-21' }] }) },
  관성: {
    skill: '책임감 스킬 습득',
    s: (c) => ({ bg: 'room', cast: [c.other('parent', 170, 'smile', 'stand'), c.me(430, 'nervous', 'hold', { age: 'kid', held: 'test', heldLabel: '100', fx: ['sweat'], dir: -1 })], talk: [say(0, '이번에도 100점이지?'), think(1, '(더 잘해야 해…)')] }),
  },
  인성: {
    skill: '학습 스킬 습득',
    s: (c) => ({ bg: 'library', cast: [c.me(170, 'star', 'hold', { age: 'kid', held: 'book' }), c.other('parent', 430, 'surprised', 'stand', { dir: -1 })], talk: [say(0, '공룡 이름 다 외웠어요!'), say(1, c.given ? `우리 ${c.given}, 천재 아니야?` : '우리 애 천재 아니야?')] }),
  },
};

interface Ev {
  name: string;
  s: Scene;
}
type EvFn = (c: Ctx, age: Age, v: 0 | 1) => Ev;

/** 오른쪽 빈자리에 두 줄로 쌓는 'LEVEL UP!' */
const LEVEL_UP = [
  { text: 'LEVEL', x: 500, y: 300, size: 46, color: '#ffb000', rot: -8 },
  { text: 'UP!', x: 512, y: 356, size: 54, color: '#ff8a3d', rot: -8 },
];

/** 레벨 업 (운이 좋은 시기) */
const REWARD: Record<TenGodGroup, EvFn> = {
  비겁: (c, age, v) => {
    const b = bandOf(age);
    return {
      name: b === 'young' ? '친구 합류!' : b === 'senior' ? '벗 합류!' : '동료 합류!',
      s: { bg: 'burst', cast: [c.me(140, 'happy', 'cheer', { age }), c.other(b === 'young' ? 'child' : b === 'senior' ? 'elder' : 'friend', 335, 'happy', 'cheer', { dir: -1, age: b === 'young' ? age : undefined })], talk: [shout(0, v ? '든든한 동료가 생겼다!' : '파티원이 늘었다!')], sfx: LEVEL_UP },
    };
  },
  식상: (c, age, v) => ({
    name: bandOf(age) === 'senior' ? '새 취미 각성!' : '재능 스킬 각성!',
    s: { bg: 'burst', cast: [c.me(230, 'star', 'cheer', { age, fx: ['bulbs'], sym: 'flare' })], talk: [shout(0, v ? '만든 게 대박 났다!' : '숨은 재능이 깨어났다!')], sfx: LEVEL_UP },
  }),
  재성: (c, age, v) => {
    const b = bandOf(age);
    return {
      name: b === 'young' ? '용돈 획득!' : b === 'senior' ? '보물 정리 완료!' : '골드 획득!',
      s: { bg: 'burst', cast: [c.me(160, 'money', 'hold', { age, held: 'moneybag' })], talk: [shout(0, v ? '통장이 두둑해졌다!' : '골드를 획득했다!')], props: [{ kind: 'chest', x: 335 }], sfx: LEVEL_UP },
    };
  },
  관성: (c, age, v) => {
    const b = bandOf(age);
    const title = b === 'young' ? '반장' : b === 'senior' ? '동네 어른' : '믿음직한 리더';
    return { name: `칭호 획득: ${title}`, s: { bg: 'burst', cast: [c.me(230, 'proud', 'hips', { age, acc: ['crown'] })], talk: [say(0, v ? '승급 성공!' : `칭호: ${title}!`)], sfx: LEVEL_UP } };
  },
  인성: (c, age, v) => {
    const b = bandOf(age);
    const item = b === 'young' ? '상장' : b === 'senior' ? '지혜' : '자격증';
    return { name: `아이템 획득: ${item}`, s: { bg: 'burst', cast: [c.me(230, 'proud', 'hold', { age, held: 'paper', heldLabel: item })], talk: [shout(0, v ? '스킬 레벨이 올랐다!' : '귀한 아이템을 얻었다!')], sfx: LEVEL_UP } };
  },
};

/** 퀘스트 (보통인 시기) */
const QUEST: Record<TenGodGroup, { name: Record<Band, string>; s: (c: Ctx, age: Age, v: 0 | 1) => Scene }> = {
  비겁: { name: { young: '친구와 겨루며 크기', adult: '내 힘으로 서 보기', senior: '내 사람들과 어울리기' }, s: (c, age, v) => ({ bg: 'map', cast: [c.me(300, 'smug', 'hold', { age, held: 'flag' })], talk: [think(0, v ? '(이번엔 누구 도움 없이 가 본다.)' : '(내 길은 내가 정한다.)')] }) },
  식상: { name: { young: '좋아하는 것 찾기', adult: '내 걸 만들어 보기', senior: '새 취미 배우기' }, s: (c, age, v) => ({ bg: 'map', cast: [c.me(300, 'think', 'think', { age, fx: ['bulb'] })], talk: [say(0, v ? '하고 싶은 일, 조금씩 준비 중!' : '이번엔 진짜 내 걸 만들어 볼까?')] }) },
  재성: { name: { young: '용돈 관리 배우기', adult: '수입 구조 점검하기', senior: '재산 정리하기' }, s: (c, age, v) => ({ bg: 'map', cast: [c.me(300, 'think', 'hold', { age, held: 'calculator' })], talk: [say(0, v ? '새는 돈부터 막자.' : '들어오는 돈, 나가는 돈 점검 중.')] }) },
  관성: { name: { young: '규칙에 적응하기', adult: '맡은 자리 지키기', senior: '건강 챙기기' }, s: (c, age, v) => ({ bg: 'map', cast: [c.me(300, 'proud', 'hold', { age, held: 'document' })], talk: [say(0, v ? '기록은 꼼꼼하게.' : '맡은 건 끝까지.')] }) },
  인성: { name: { young: '기초 다지기', adult: '내공 쌓기', senior: '지혜 나누기' }, s: (c, age, v) => ({ bg: 'map', cast: [c.me(300, 'think', 'hold', { age, held: 'book' })], talk: [say(0, v ? '오늘도 한 장씩.' : '지금은 배울 때.')] }) },
};

/** 보스전 (힘든 시기) */
const BOSS: Record<TenGodGroup, { monster: MonsterKind; name: Record<Band, string>; line: [string, string] }> = {
  비겁: { monster: 'slime', name: { young: '경쟁 슬라임', adult: '보증 슬라임', senior: '돈 부탁 슬라임' }, line: ['보증은 안 서!', '내 몫은 내가 지킨다!'] },
  식상: { monster: 'bat', name: { young: '말실수 박쥐', adult: '구설 박쥐', senior: '잔소리 박쥐' }, line: ['말 한마디 조심…!', '입조심 방어막 전개!'] },
  재성: { monster: 'dragon', name: { young: '용돈 탕진 드래곤', adult: '지출 드래곤', senior: '큰돈 드래곤' }, line: ['지갑을 지켜라!', '충동구매 금지!'] },
  관성: { monster: 'golem', name: { young: '시험 골렘', adult: '과로 골렘', senior: '건강 경고 골렘' }, line: ['쉬어 가면서 싸우자!', '무리하면 진다…!'] },
  인성: { monster: 'ghost', name: { young: '미루기 유령', adult: '미루기 유령', senior: '걱정 유령' }, line: ['오늘 할 일은 오늘!', '생각은 그만, 일단 시작!'] },
};

const LOVE: EvFn = (c, age, v) => ({
  name: '이벤트: 인연 등장!',
  s: { bg: 'flowers', cast: [c.me(170, 'love', 'stand', { age, fx: ['hearts'] }), c.other('partner', 430, 'blush', 'stand', { dir: -1 })], talk: v ? [say(1, '오래오래 같이 걷자.'), say(0, '응, 약속!')] : [say(1, '우리, 같이 갈래?'), say(0, '…응!')] },
});
const MOVE: Record<'good' | 'bad', EvFn> = {
  good: (c, age, v) => ({ name: '맵 이동: 새 마을!', s: { bg: 'street', cast: [c.me(300, 'happy', 'hold', { age, held: 'box' })], talk: [say(0, v ? '새 동네, 새 생활! 설렌다.' : '새 마을로 이사! 새 출발!')] } }),
  bad: (c, age, v) => ({ name: '맵 이동: 험한 길', s: { bg: 'rain', cast: [c.me(300, 'nervous', 'hold', { age, held: 'box', fx: ['drops'] })], talk: [say(0, v ? '요즘 왜 이렇게 다 흔들리지…' : '또 짐을 싸야 하네…')] } }),
};
const JOB: Record<'good' | 'bad', EvFn> = {
  good: (c, age, v) => ({ name: '전직 이벤트!', s: { bg: 'burst', cast: [c.me(230, 'star', 'fist', { age })], talk: [shout(0, v ? '새 무대에서 다시 시작!' : '새 직업으로 전직!')], sfx: LEVEL_UP } }),
  bad: (c, age, v) => ({ name: '전직 갈림길', s: { bg: 'street', cast: [c.me(200, 'think', 'think', { age })], talk: [think(0, v ? '(조직 개편이라니… 내 자리는?)' : '(여기 계속 있어야 할까…)')], props: [{ kind: 'signpost', x: 450, label: '이직', label2: '잔류' }] } }),
};

interface Pick {
  ev: Ev;
  kind: 'love' | 'move' | 'job' | 'normal';
}

function stageEvent(c: Ctx, g: TenGodGroup, tone: PanelTone, stage: LifeStage, flags: string[], used: Map<string, number>): Pick {
  const age = ageOfStage(stage);
  const once = (key: string): 0 | 1 => {
    const n = used.get(key) ?? 0;
    used.set(key, n + 1);
    return (n % 2) as 0 | 1;
  };
  const adult = age === 'adult';
  const spouseStar: TenGodGroup = c.male ? '재성' : '관성';
  const loveStage = stage === 'youth' || stage === 'settle';
  if (adult && loveStage && (flags.some((f) => f.startsWith('일지합')) || (g === spouseStar && tone !== 'bad'))) return { ev: LOVE(c, age, once('love')), kind: 'love' };
  const t = tone === 'good' ? 'good' : 'bad';
  if (adult && flags.some((f) => f.startsWith('일지충'))) return { ev: MOVE[t](c, age, once(`move-${t}`)), kind: 'move' };
  if (adult && flags.some((f) => f.startsWith('월지충'))) return { ev: JOB[t](c, age, once(`job-${t}`)), kind: 'job' };
  const v = once(`${g}-${tone}`);
  if (tone === 'good') return { ev: REWARD[g](c, age, v), kind: 'normal' };
  if (tone === 'neutral') return { ev: { name: `퀘스트: ${QUEST[g].name[bandOf(age)]}`, s: QUEST[g].s(c, age, v) }, kind: 'normal' };
  const B = BOSS[g];
  const name = B.name[bandOf(age)];
  return {
    ev: {
      name: `보스전: ${name}`,
      s: {
        bg: 'dungeon',
        cast: [c.me(150, 'serious', 'point', { age, held: 'sword' }), { role: 'monster', monster: B.monster, x: 430, face: 'angry', pose: 'stand', dir: -1, tag: name, scale: 0.92 }],
        talk: [shout(0, B.line[v])],
        sfx: [{ text: '보스 등장!', x: 450, y: 420, size: 34, color: '#e5484d', rot: -3 }],
      },
    },
    kind: 'normal',
  };
}

const SHAPE_DESC: Record<string, string> = {
  대기만성형: '시간이 갈수록 단단해지는 인생',
  '초년 강세형': '일찍 꽃피고, 지키는 힘이 중요한 인생',
  '중년 절정형': '한가운데에서 가장 빛나는 인생',
  '고른 흐름형': '큰 굴곡 없이 꾸준히 나아가는 인생',
};
const SHAPE_LINE: Record<string, string> = {
  대기만성형: '초반엔 더디지만, 뒤로 갈수록 운이 받쳐 준다.',
  '초년 강세형': '젊은 시절 운이 강하고, 뒤로 갈수록 지키는 힘이 중요해진다.',
  '중년 절정형': '인생의 한가운데, 중년에 가장 큰 운이 몰려 있다.',
  '고른 흐름형': '시기마다 큰 차이 없이, 꾸준함이 무기인 흐름이다.',
};
const SHAPE_JOKE: Record<string, string> = {
  대기만성형: '끝판 보상이 늦게 나오는 타입이야.',
  '초년 강세형': '튜토리얼부터 강캐였던 타입.',
  '중년 절정형': '중간 보스 잡을 때 제일 센 타입.',
  '고른 흐름형': '꾸준히 레벨 업하는 성실 플레이어.',
};

const NOW_LINE: Record<PanelTone, (theme: string) => string> = {
  good: (t) => `(지금이 바로 ${t}의 때. 놓치지 말자!)`,
  neutral: () => '(지금은 퀘스트 진행 중. 차근차근 가자.)',
  bad: () => '(지금은 보스전. 그래도 지나간다.)',
};

export function lifeEpisode(a: SajuAnalysis): Comic {
  const c = makeCtx(a, null, 'life');
  const beats: Beat[] = [];
  const ls = lifeShape(a);
  const shape = ls.shape;
  const [early, mid, late] = [ls.early, ls.mid, ls.late].map((v) => Math.round(v));
  const monthInfo = a.positions.find((p) => p.pos === 'month')!;
  const cg = groupOf(monthInfo.branchTenGod);
  const firstAge = a.daeun.startAgeYears;
  const list = a.daeun.list;
  const ageNow = (a.now - a.pillars.conversion.utcMs) / (365.2422 * 86400000);

  beats.push(cutRaw(c, '표지', '', { bg: 'map', cast: [c.me(430, 'smug', 'hips', { dir: -1 })], talk: [] }, { cover: { kicker: '3화', title: '나의 인생 연대기', tagline: `${shape} — ${SHAPE_DESC[shape]}` } }));
  beats.push(cutRaw(c, '인생 게임', '', { bg: 'room', shot: 'bust', cast: [c.mirror(160, 'smug', 'point'), c.me(440, 'surprised', 'stand', { dir: -1 })], talk: [say(0, '네 인생을 게임으로 치면 말이야…'), say(1, '설마 RPG?')] }));
  beats.push(
    cutRaw(c, '인생 그래프', `장르: ${shape}`, { bg: 'white', cast: [c.mirror(500, 'smile', 'point', { dir: -1 })], talk: [say(0, SHAPE_JOKE[shape])], props: [{ kind: 'graph', x: 220, y: 110, values: [early, mid, late] }] }, {
      basis: `대운 평균 초년 ${early} · 중년 ${mid} · 말년 ${late}점`,
      note: `10년마다 바뀌는 대운의 점수를 이어 보면 인생의 큰 흐름이 보입니다. 초년 ${early}점, 중년 ${mid}점, 말년 ${late}점으로 ‘${shape}’에 가깝습니다. ${SHAPE_LINE[shape]}`,
    }),
  );

  const ch = CHILD[cg];
  beats.push(
    cutRaw(c, '튜토리얼', `튜토리얼: 어린 시절${firstAge >= 1 ? ` (만 0~${firstAge}세)` : ''} — ${ch.skill}`, ch.s(c), {
      badge: ageNow < list[0].startAge ? '지금 여기!' : undefined,
      basis: `월지 ${pillarHanja(a.pillars.month).slice(1)}(${monthInfo.branchTenGod}) · 성장 환경`,
      note: `태어난 달은 부모와 성장 환경을 뜻하는 자리입니다. 이 자리에 ${monthInfo.branchTenGod}(${cg})이 있어 이런 어린 시절을 보냈을 가능성이 큽니다. 실제 기억과 비교해 보세요.`,
      tone: 'neutral',
    }),
  );

  const found = list.findIndex((d) => ageNow >= d.startAge && ageNow < d.startAge + 10);
  const cur = found >= 0 ? found : ageNow >= list[0].startAge ? list.length - 1 : 0;
  const start = Math.max(0, Math.min(cur - 2, list.length - 5));
  const shown = list.slice(start, start + 5);
  const best = shown.reduce((m, d) => (d.score > m.score ? d : m), shown[0]);
  const worst = shown.reduce((m, d) => (d.score < m.score ? d : m), shown[0]);
  const used = new Map<string, number>();
  shown.forEach((d, i) => {
    const g = groupOf(d.stemTenGod);
    const tone = toneOf(d.score);
    const stage = lifeStage(d.startAge);
    const { ev, kind } = stageEvent(c, g, tone, stage, d.flags, used);
    const a0 = Math.floor(d.startAge);
    const isNow = ageNow >= d.startAge && ageNow < d.startAge + 10;
    const badge = isNow ? '지금 여기!' : d === best && d.score >= 58 ? '전성기' : d === worst && d.score < 42 ? '버티는 시기' : undefined;
    const theme = DECADE_THEME[g];
    const flagNote = d.flags
      .map((f) => flagText(f, stage))
      .filter(Boolean)
      .join(' ');
    const genderNote = kind === 'love' ? (GENDER_NOTE[g]?.[c.male ? 'male' : 'female'] ?? '') : '';
    beats.push(
      cutRaw(c, `STAGE ${start + i + 1}`, `STAGE ${start + i + 1} · 만 ${a0}~${a0 + 9}세 · ${theme.label}의 10년\n${ev.name}`, ev.s, {
        badge,
        basis: `${pillarHanja(d.pillar)} 대운 · ${d.stemTenGod}(${d.stemRole}) · ${d.score}점`,
        note: [`${d.startYear}~${d.endYear}년.`, STAGE_SCENE[g][stage], toneText(g, tone, stage), genderNote, flagNote].filter(Boolean).join(' '),
        tone,
      }),
    );
    if (isNow) {
      const face = tone === 'good' ? 'star' : tone === 'bad' ? 'serious' : 'think';
      beats.push(
        cutRaw(c, '지금 여기', '그리고 지금, 나는 여기에 서 있다.', { bg: tone === 'bad' ? 'drama' : 'speed', drama: tone === 'bad', shot: 'face', cast: [c.me(300, face, 'stand', { front: true })], talk: [think(0, NOW_LINE[tone](theme.label))] }, {
          basis: `현재 대운 ${pillarHanja(d.pillar)} · ${d.score}점`,
          note: `지금은 ${d.startYear}~${d.endYear}년의 대운, ‘${theme.label}’의 10년입니다. ${toneText(g, tone, stage)}`,
        }),
      );
      const next = list[list.indexOf(d) + 1];
      if (next) {
        const ng = groupOf(next.stemTenGod);
        beats.push(
          cutRaw(c, '다음 스테이지', `NEXT STAGE · ${next.startYear}~${next.endYear}년\n‘${DECADE_THEME[ng].label}’의 10년`, { bg: 'dungeon', cast: [c.me(170, 'think', 'think')], talk: [think(0, '(문 너머엔 뭐가 있을까…)')], props: [{ kind: 'lockdoor', x: 440 }] }, {
            basis: `${pillarHanja(next.pillar)} 대운 · ${next.stemTenGod} · ${next.score}점`,
            note: toneText(ng, toneOf(next.score), lifeStage(next.startAge)),
          }),
        );
      }
    }
  });

  beats.push(text('사주는 정해진 운명이 아니라\n공략집이 있는 게임이다.', 'soft'));
  beats.push(cutRaw(c, '세이브', '앞으로도, 나답게.', { bg: 'map', cast: [c.me(200, 'happy', 'wave'), c.mirror(440, 'smile', 'stand', { dir: -1 })], talk: [say(0, '세이브 포인트는 어디야?'), say(1, '오늘. 바로 지금.')] }));
  beats.push(text('다음 화 예고 — 4화 「MBTI와 사주」\nMBTI를 알려 주면, 겉과 속의 대결이 시작된다.', 'soft'));

  return {
    id: 'life',
    no: 3,
    title: '나의 인생 연대기',
    subtitle: `${pillarHanja(a.pillars.day)}일주 · ${shape} · 대운 ${a.daeun.forward ? '순행' : '역행'}`,
    beats,
  };
}
