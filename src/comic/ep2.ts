/**
 * 2화 · 일과 나 — 월요일 아침의 영혼 가출부터 금요일 퇴근의 점프까지.
 * 직업 궁합 점수 → 사주가 준 무기 두 가지 → 이 일에서 걸리는 부분 → 지금의 대운(상태창) → 지금 준비할 것 → 기회의 해.
 * 직업을 입력하지 않으면 나이에 맞는 일상(학교·일터·하루)으로 그린다.
 */
import { ELEMENT_HANJA, ELEMENT_KO, pillarHanja, type SajuAnalysis, type TenGodGroup } from '../engine/index.ts';
import { josa } from '../engine/josa.ts';
import type { CrossReport } from '../report/cross.ts';
import { textWidth } from './text.ts';
import { cut, hey, heySsi, later, makeCtx, pct, phaseOf, say, shout, text, think, topGroups, whisper, type Ctx, type Scene } from './ctx.ts';
import type { Beat, Comic, Panel, PanelTone } from './types.ts';

type Kind = 'work' | 'study' | 'life';

const STRENGTH_TITLE: Record<TenGodGroup, string> = {
  비겁: '혼자서도 버티는 자립심',
  식상: '만들고 표현하는 힘',
  재성: '성과로 바꾸는 현실 감각',
  관성: '책임지고 신뢰받는 힘',
  인성: '깊이 배우고 이해하는 힘',
};

interface Gag {
  cap?: string;
  s: Scene;
}
type Gags = (Gag | Beat)[];
const isGag = (g: Gag | Beat): g is Gag => 's' in g;

/** 무기 ① — 일터에서 강점이 드러나는 장면 (두세 컷) */
const STRENGTH: Record<TenGodGroup, (c: Ctx, k: Kind) => Gags> = {
  비겁: (c, k) => [
    {
      s: {
        bg: c.work.bg,
        cast: [c.other(k === 'study' ? 'teacher' : k === 'life' ? 'friend' : 'boss', 170, 'surprised', 'stand'), c.me(440, 'smug', 'hips', { fx: ['aura'], dir: -1 })],
        talk:
          k === 'work'
            ? [say(0, '이걸 혼자 하겠다고?'), say(1, '제 방식으로 끝내 보겠습니다!')]
            : k === 'study'
              ? [say(0, '이 과제를 혼자 하겠다고?'), say(1, '제 힘으로 해 볼게요!')]
              : [say(0, '이걸 혼자 다 하겠다고?'), say(1, '내 힘으로 해 볼래!')],
      },
    },
    { s: { bg: 'burst', cast: [c.other('coworker', 110, 'star', 'cheer'), c.me(300, 'proud', 'hold', { held: 'flag' }), c.other('friend', 490, 'star', 'cheer', { dir: -1 })], talk: [], sfx: [{ text: '완료!', x: 300, y: 70, size: 54 }, { text: '짝짝짝', x: 120, y: 120, size: 30, color: '#ffb000' }] } },
  ],
  식상: (c, k) => [
    {
      s: {
        bg: c.work.bg,
        cast: [c.me(240, 'star', 'point', { fx: ['bulb'] }), c.other(k === 'work' ? 'coworker' : 'friend', 480, 'surprised', 'stand', { dir: -1 })],
        talk: [say(0, k === 'work' ? '이렇게 바꾸면 반응 터집니다!' : k === 'study' ? '발표는 내가 재밌게 만들어 볼게!' : '이렇게 해 보면 재밌을 거야!')],
        props: c.work.bg === 'office' || c.work.bg === 'school' ? [{ kind: 'whiteboard', x: 120, y: 200 }] : undefined,
      },
    },
    {
      s: {
        bg: 'burst',
        cast: [c.other(k === 'work' ? 'coworker' : 'friend', 160, 'star', 'cheer'), c.other(k === 'work' ? 'boss' : k === 'study' ? 'teacher' : 'friend', 440, 'star', 'cheer', { dir: -1 })],
        talk: [say(0, '천재다…'), shout(1, k === 'work' ? '바로 진행시켜!' : '좋아, 해 보자!')],
      },
    },
  ],
  재성: (c, k) =>
    k === 'work'
      ? [
          { s: { bg: c.work.bg, cast: [c.me(170, 'proud', 'hold', { held: 'tablet' }), c.other('boss', 440, 'surprised', 'stand', { dir: -1 })], talk: [say(0, '숫자로 정리해 봤는데요, 이익이 20% 늘었습니다.'), shout(1, '뭐라고?')] } },
          { s: { bg: 'sparkle', shot: 'bust', focus: 0, cast: [c.other('boss', 300, 'money', 'stand', { front: true })], talk: [say(0, heySsi(c, '혹시… 보너스 받고 싶나?'))] } },
        ]
      : [
          {
            s: {
              bg: k === 'study' ? 'school' : 'room',
              cast: [c.me(170, 'money', 'hold', { held: k === 'study' ? 'book' : 'calculator' }), c.other('friend', 440, 'surprised', 'stand', { dir: -1 })],
              talk: [say(0, k === 'study' ? '중고로 산 문제집, 되팔아서 남겼어!' : '가계부 보니까 이번 달 20만 원 아꼈어!'), say(1, k === 'study' ? '너 장사해도 되겠다!' : '대박, 비결이 뭐야?')],
            },
          },
        ],
  관성: (c, k) => [
    {
      s: {
        bg: c.work.bg,
        cast: [c.other(k === 'work' ? 'boss' : k === 'study' ? 'teacher' : 'friend', 170, 'smile', 'hold', { held: 'document' }), c.me(440, 'proud', 'stand', { dir: -1 })],
        talk:
          k === 'work'
            ? [say(0, heySsi(c, '이 건은 맡기죠.')), say(1, '끝까지 책임지겠습니다!')]
            : k === 'study'
              ? [say(0, '이번 행사 책임자는 너다.'), say(1, '맡겨 주세요!')]
              : [say(0, '모임 총무는 역시 너밖에 없어.'), say(1, '맡은 건 끝까지 할게!')],
      },
    },
    { cap: '책임감 히어로, 출동.', s: { bg: 'speed', cast: [c.me(300, 'serious', 'fist', { acc: ['cape'], lift: 50, fx: ['speed'] })], talk: [], sfx: [{ text: '슈웅', x: 470, y: 120, size: 48, color: '#3b82f6' }] } },
  ],
  인성: (c, k) => [
    {
      s: {
        bg: c.work.bg,
        cast: [c.other(k === 'work' ? 'coworker' : 'friend', 170, 'nervous', 'hold', { held: 'document' }), c.me(440, 'smile', 'stand', { dir: -1 })],
        talk: k === 'work' ? [say(0, '이거 어떻게 하는지 아세요?'), say(1, '아, 원리부터 보면 쉬워요.')] : [say(0, '이 문제 어떻게 풀어?'), say(1, '개념부터 보면 쉬워!')],
      },
    },
    later('40분 후…'),
    {
      s: {
        bg: c.work.bg,
        cast: [c.me(170, 'star', 'point'), c.other(k === 'work' ? 'coworker' : 'friend', 440, 'soul', 'stand', { fx: ['soul'], dir: -1 })],
        talk: [say(0, '…그래서 이 이론이 처음 나온 게 1990년대인데…'), think(1, '(괜히 물어봤다…)')],
      },
    },
  ],
};

/** 무기 ② — 혼잣말 */
const STRENGTH2: Record<TenGodGroup, string> = {
  비겁: '(누가 뭐래도 끝까지 버티는 게 내 힘.)',
  식상: '(머릿속 생각을 꺼내 보여 주는 게 내 힘.)',
  재성: '(뭐가 남고 뭐가 손해인지 바로 보여.)',
  관성: '(맡으면 끝까지 — 그게 나야.)',
  인성: '(깊이 알수록 흔들리지 않아.)',
};

/** 걸림돌 — 이 일이 쓰는데 사주에 약한 기운 */
const STRAIN: Record<TenGodGroup, { title: string; gags: (c: Ctx, k: Kind) => Gags; note: string }> = {
  비겁: {
    title: '내 몫을 지키는 힘이 약하다',
    gags: (c, k) => [
      {
        s: {
          bg: c.work.bg,
          cast: [c.other(k === 'work' ? 'coworker' : 'friend', 170, 'smug', 'hold', { held: 'document' }), c.other(k === 'work' ? 'boss' : k === 'study' ? 'teacher' : 'friend', 400, 'happy', 'stand', { dir: -1 }), c.me(540, 'shock', 'stand', { dir: -1, scale: 0.62 })],
          talk:
            k === 'work'
              ? [say(0, '이번 성과는 제가 정리해서 보고했어요~'), think(2, '(그거 내가 한 건데…)')]
              : k === 'study'
                ? [say(0, '발표 자료는 제가 만들었어요~'), think(2, '(그거 내가 만든 건데…)')]
                : [say(0, '이번 계획, 내 아이디어야~'), think(2, '(그거 내가 낸 건데…)')],
        },
      },
      { s: { bg: 'room', shot: 'bust', cast: [c.mirror(160, 'smug', 'point'), c.me(440, 'nervous', 'fist', { dir: -1 })], talk: [say(0, '따라 해 봐. ‘그건 제가 했습니다!’'), whisper(1, '그건… 제가… 했…')] } },
    ],
    note: '이 일은 혼자 버티고 경쟁하는 힘이 필요한데, 사주상 자기 주장을 밀어붙이는 기운이 약합니다. 성과의 공을 분명히 남기고, 내 몫을 요구하는 연습이 필요합니다.',
  },
  식상: {
    title: '실력만큼 드러내지 못한다',
    gags: (c, k) => [
      {
        s: {
          bg: c.work.bg,
          cast: [c.other(k === 'work' ? 'boss' : k === 'study' ? 'teacher' : 'friend', 170, 'plain', 'cross', { fx: ['vein'] }), c.me(440, 'nervous', 'stand', { fx: ['drops'], dir: -1 })],
          talk: [say(0, k === 'work' ? '그래서 결론이 뭐죠?' : k === 'study' ? '그래서 하고 싶은 말이 뭐니?' : '그래서 서운했던 게 뭔데?'), say(1, '그, 그게…')],
        },
      },
      { s: { bg: 'white', shot: 'bust', cast: [c.mirror(160, 'smug'), c.me(440, 'blank', 'stand', { dir: -1 })], talk: [say(0, '머릿속은 4K인데 입은 240p야.'), say(1, '…화질 개선 부탁드려요.')] } },
    ],
    note: '이 일은 생각을 밖으로 표현하는 힘이 많이 필요한데, 사주상 그 기운이 약해 실력만큼 인정받지 못할 수 있습니다. 보고서와 발표를 정해 둔 틀에 맞춰 미리 준비해 두면 보완됩니다.',
  },
  재성: {
    title: '숫자·돈 감각이 약하다',
    gags: (c, k) => [
      k === 'work'
        ? { s: { bg: c.work.bg, cast: [c.other('boss', 170, 'plain', 'hold', { held: 'document', fx: ['vein'] }), c.me(440, 'nervous', 'hold', { held: 'calculator', fx: ['steam'], dir: -1 })], talk: [say(0, '예산 계산이 또 틀렸네요.'), say(1, '숫자가 절 싫어하는 것 같아요…')] } }
        : { s: { bg: 'room', cast: [c.me(300, 'nervous', 'hold', { held: 'wallet', fx: ['drops'] })], talk: [think(0, k === 'study' ? '(용돈 계산이 또 안 맞아…)' : '(이번 달 카드값… 계산이 안 맞아.)')] } },
      { s: { bg: 'room', shot: 'bust', cast: [c.mirror(160, 'smile', 'point'), c.me(440, 'nervous', 'stand', { dir: -1 })], talk: [say(0, '체크리스트랑 계산기를 친구로 만들자.'), say(1, '계산기가… 친구…')] } },
    ],
    note: '성과와 돈을 다뤄야 하는 일인데, 사주상 현실 계산과 재물 감각이 약한 편입니다. 내 성과를 수치로 기록하고, 돈이 걸린 판단은 체크리스트로 하세요.',
  },
  관성: {
    title: '규칙과 위계가 버겁다',
    gags: (c, k) => [
      {
        s: {
          bg: c.work.bg,
          cast: [c.other(k === 'work' ? 'boss' : k === 'study' ? 'teacher' : 'friend', 170, 'angry', 'point'), c.me(440, 'plain', 'stand', { dir: -1 })],
          talk: [say(0, k === 'work' ? '보고는 순서대로 해야죠!' : k === 'study' ? '규칙은 지켜야지!' : '약속 시간 또 늦었어!'), think(1, k === 'life' ? '(시간 약속은 왜 이렇게 어렵지…)' : '(내 방식이 더 빠른데…)')],
        },
      },
      { s: { bg: 'white', cast: [c.me(300, 'cry', 'stand', { scale: 0.78 }), c.mirror(500, 'plain', 'stand', { dir: -1 })], talk: [say(1, '틀을 ‘내 루틴’으로 바꾸면 덜 답답해.')], props: [{ kind: 'cage', x: 300, label: k === 'work' ? '결재 라인' : k === 'study' ? '교칙' : '약속 시간' }] } },
    ],
    note: '규칙과 위계가 분명한 일인데, 사주상 통제를 견디는 기운이 약합니다. 스스로 정한 마감과 루틴으로 조직의 규칙을 ‘내 것’으로 만드는 것이 열쇠입니다.',
  },
  인성: {
    title: '공부와 쉼이 밀리기 쉽다',
    gags: (c, k) => [
      { s: { bg: 'room', cast: [c.me(300, 'tired', 'stand')], talk: [think(0, k === 'work' ? '(자격증 공부는… 내일부터.)' : k === 'study' ? '(복습은… 내일부터.)' : '(나를 위한 시간은… 내일부터.)')], props: [{ kind: 'books', x: 480 }, { kind: 'calendar', x: 120, y: 170, label: '내일' }] } },
      later('한 달 후…'),
      { s: { bg: 'room', cast: [c.me(300, 'tired', 'stand', { acc: ['cobweb'] }), c.mirror(500, 'smug', 'stand', { dir: -1 })], talk: [say(1, '달력이 한 달째 ‘내일’이야.')], props: [{ kind: 'books', x: 480 }, { kind: 'calendar', x: 120, y: 170, label: '내일' }] } },
    ],
    note: '꾸준히 공부하고 자격을 갖춰야 하는 일인데, 사주상 배우고 쉬어 가는 기운이 약합니다. 공부 시간을 일정에 고정해 두지 않으면 금방 밀립니다.',
  },
};

/** 대운 단계 */
const PHASE: Record<TenGodGroup, { title: string } & Record<PanelTone, string>> = {
  비겁: { title: '독립과 경쟁의 시기', good: '내 이름을 걸고 움직여도 좋은 때야!', neutral: '독립은 준비를 마친 다음에!', bad: '동업·보증은 잠깐 멈춤! 기반부터.' },
  식상: { title: '실력을 결과물로 보여 줄 시기', good: '만든 걸 세상에 보여 줄 때야!', neutral: '작게 실험하면서 방향을 찾아봐.', bad: '일을 줄이고 하나에만 집중하자.' },
  재성: { title: '성과를 돈으로 바꿀 시기', good: '수입을 키우기 좋은 때야!', neutral: '수입 구조를 한번 점검해 봐.', bad: '지출과 투자는 보수적으로!' },
  관성: { title: '책임과 자리를 얻는 시기', good: '책임 있는 자리를 피하지 마!', neutral: '평가에 대비해 기록을 남겨 둬.', bad: '건강이 먼저야. 무리하지 마.' },
  인성: { title: '배우고 자격을 갖출 시기', good: '자격·공부에 투자하면 길이 열려!', neutral: '지금의 공부가 다음 무기가 돼.', bad: '공부를 핑계로 결정을 미루지 마!' },
};

/** 학생에게 맞춘 대운 단계 */
const PHASE_STUDY: Record<TenGodGroup, { title: string } & Record<PanelTone, string>> = {
  비겁: { title: '친구와 겨루며 크는 시기', good: '경쟁이 너를 키워 주는 때야!', neutral: '혼자보다 함께 겨뤄 봐.', bad: '친구와 다툼은 조심! 내 페이스대로.' },
  식상: { title: '재능과 끼를 펼칠 시기', good: '하고 싶은 걸 마음껏 해 봐!', neutral: '이것저것 해 보며 좋아하는 걸 찾자.', bad: '벌인 일은 줄이고 하나만 끝까지!' },
  재성: { title: '현실 감각을 익힐 시기', good: '경험이 곧 공부가 되는 때야!', neutral: '용돈 관리부터 연습해 봐.', bad: '갖고 싶은 것보다 필요한 것 먼저!' },
  관성: { title: '책임과 규칙을 배우는 시기', good: '맡은 역할이 너를 키워 줄 거야!', neutral: '시험·규칙에 차근차근 적응하자.', bad: '압박이 크지? 잠과 휴식이 먼저야.' },
  인성: { title: '배움이 쌓이는 시기', good: '좋은 선생님을 만나기 좋은 때야!', neutral: '지금의 공부가 단단한 바탕이 돼.', bad: '생각만 하지 말고 오늘 한 장!' },
};

/** 은퇴 뒤 일상에 맞춘 대운 단계 */
const PHASE_SENIOR: Record<TenGodGroup, { title: string } & Record<PanelTone, string>> = {
  비겁: { title: '내 사람들과 어울리는 시기', good: '친구들과 함께라 든든한 때야!', neutral: '오랜 친구를 자주 만나 봐.', bad: '돈 얽힌 부탁은 정중히 거절!' },
  식상: { title: '배우고 표현하는 즐거움의 시기', good: '새 취미가 활력을 줄 거야!', neutral: '배운 걸 나누면 더 즐거워.', bad: '무리하지 말고 쉬엄쉬엄!' },
  재성: { title: '모은 것을 정리하는 시기', good: '정리할수록 마음이 가벼워져!', neutral: '재산과 지출을 한번 정리해 봐.', bad: '큰돈 오가는 결정은 피하자.' },
  관성: { title: '건강과 규칙을 챙길 시기', good: '규칙적인 생활이 최고의 보약!', neutral: '검진은 꼭 챙기자.', bad: '몸이 먼저야. 무리하지 마!' },
  인성: { title: '지혜를 나누는 시기', good: '그동안의 지혜를 나눌 때야!', neutral: '마음공부·독서가 잘 맞는 때.', bad: '걱정은 내려놓고 푹 쉬자.' },
};

const PREP_TITLE: Record<'study' | 'senior', Record<TenGodGroup, string>> = {
  study: { 비겁: '내 이름으로 도전해 보기', 식상: '작품·결과물 만들어 보기', 재성: '경제 감각 기르기', 관성: '책임 있는 역할 맡아 보기', 인성: '개념을 깊이 파고들기' },
  senior: { 비겁: '나만의 소일거리 만들기', 식상: '배운 것을 나누고 표현하기', 재성: '재산·지출 정리하기', 관성: '모임에서 역할 맡기', 인성: '새로운 배움 시작하기' },
};

/** 지금 준비할 것 — 장면 */
const PREP: Record<TenGodGroup, { title: string; scene: (c: Ctx, k: Kind) => Scene }> = {
  비겁: {
    title: '내 이름으로 할 수 있는 일 만들기',
    scene: (c, k) => ({
      bg: 'night',
      cast: [c.me(260, 'serious', 'hold', { held: 'laptop', acc: ['headband'] })],
      talk: [say(0, k === 'work' ? '퇴근 후엔 내 이름 건 프로젝트!' : k === 'study' ? '내 이름으로 대회 나간다!' : '나만의 일, 작게라도 시작!')],
      sfx: [{ text: '타닥타닥', x: 470, y: 330, size: 32, color: '#8ab4f8', rot: -6 }],
    }),
  },
  식상: {
    title: '결과물을 쌓아 밖으로 보여 주기',
    scene: (c, k) => ({
      bg: k === 'study' ? 'school' : 'studio',
      cast: [c.me(190, 'star', 'hold', { held: 'tablet' })],
      talk: [say(0, k === 'work' ? '포트폴리오 공개 완료!' : k === 'study' ? '작품 올렸다! 반응 어떨까?' : '블로그에 첫 글 올렸다!')],
      props: [{ kind: 'phonebig', x: 450, y: 40, label: '알림', rows: ['좋아요 3개', '조회수 12회'] }],
    }),
  },
  재성: {
    title: '성과를 숫자로 정리해 몸값 키우기',
    scene: (c, k) =>
      k === 'work'
        ? { bg: 'office', cast: [c.me(170, 'serious', 'hold', { held: 'document' }), c.other('boss', 440, 'surprised', 'stand', { dir: -1 })], talk: [say(0, '제 성과, 숫자로 정리해 왔습니다.'), say(1, '…근거가 확실하군.')] }
        : { bg: 'room', cast: [c.me(260, 'proud', 'hold', { held: 'piggy' })], talk: [say(0, k === 'study' ? '용돈 모아서 첫 적금 시작!' : '통장 쪼개기 완료!')], props: [{ kind: 'coins', x: 460 }] },
  },
  관성: {
    title: '책임 있는 역할로 리더 경험 쌓기',
    scene: (c, k) => ({
      bg: k === 'work' ? 'office' : k === 'study' ? 'school' : 'cafe',
      cast: [c.me(190, 'proud', 'point'), c.other(k === 'work' ? 'coworker' : 'friend', 440, 'star', 'cheer', { dir: -1 })],
      talk: [say(0, k === 'work' ? '이번 건, 제가 리드해 보겠습니다!' : k === 'study' ? '이번 학기 목표는 반장!' : '모임 운영, 내가 맡아 볼게!'), say(1, '오…!')],
    }),
  },
  인성: {
    title: '다음 10년의 몸값이 될 공부',
    scene: (c, k) => ({
      bg: 'library',
      cast: [c.me(240, 'serious', 'hold', { held: 'book', acc: ['headband'] })],
      talk: [say(0, k === 'work' ? '자격증 시험까지 D-60!' : k === 'study' ? '기말까지 개념 정리 끝낸다!' : '새로 배우는 거, 이번엔 끝까지!')],
      props: [{ kind: 'calendar', x: 480, y: 170, label: 'D-60' }],
    }),
  },
};

/** 아침 — 월요병 */
function morning(c: Ctx, k: Kind): { cap: string; s: Scene } {
  if (k === 'work')
    return { cap: '월요일 아침.', s: { bg: 'bedroom', cast: [c.me(250, 'soul', 'stand', { fx: ['soul'] })], talk: [think(0, '(월요일이 또 왔다…)')], props: [{ kind: 'clock', x: 480, y: 140 }], sfx: [{ text: '따르르릉!', x: 470, y: 250, size: 40 }] } };
  if (k === 'study')
    return { cap: '등교하는 날 아침.', s: { bg: 'bedroom', cast: [c.me(250, 'soul', 'stand', { fx: ['soul'] })], talk: [think(0, '(학교… 가기 싫다…)')], props: [{ kind: 'clock', x: 480, y: 140 }], sfx: [{ text: '따르르릉!', x: 470, y: 250, size: 40 }] } };
  if (c.senior) return { cap: '오늘도 아침이 밝았다.', s: { bg: 'room', cast: [c.me(250, 'happy', 'cheer')], talk: [say(0, '오늘은 뭐부터 해 볼까!')], props: [{ kind: 'clock', x: 480, y: 140 }] } };
  return { cap: '아침이 밝았다.', s: { bg: 'room', cast: [c.me(250, 'tired', 'hold', { held: 'coffee' })], talk: [think(0, '(커피부터 수혈…)')], props: [{ kind: 'clock', x: 480, y: 140 }] } };
}

/** 출근길 */
function commute(c: Ctx, k: Kind): { cap: string; s: Scene } {
  if (k === 'study') return { cap: '등굣길 = 매일 아침 달리기 대회.', s: { bg: 'street', cast: [c.me(300, 'scream', 'run', { held: 'bag', fx: ['speed', 'drops'] })], talk: [shout(0, '지각이다!!')] } };
  if (c.senior) return { cap: '아침 산책은 국룰.', s: { bg: 'park', cast: [c.me(200, 'happy', 'wave'), c.other('elder', 440, 'happy', 'wave', { dir: -1 })], talk: [say(0, '오늘도 공원 한 바퀴!'), say(1, '좋지!')] } };
  if (k === 'life') return { cap: `오늘의 할 일: ${c.work.task}.`, s: { bg: c.work.bg, cast: [c.me(260, 'serious', 'hold', { held: c.work.held })], talk: [say(0, c.work.id === 'transition' ? '지원서 세 곳, 오늘 다 넣는다!' : '오늘 할 일: 장보기, 정리, 가계부!')] } };
  return {
    cap: '출근길 지하철 = 인간 테트리스.',
    s: { bg: 'subway', cast: [c.other('coworker', 130, 'tired', 'stand'), c.me(300, 'soul', 'stand', { fx: ['soul'] }), c.other('friend', 470, 'tired', 'phone', { held: 'phone', dir: -1 })], talk: [think(1, '(내 영혼은 아직 집에…)')] },
  };
}

export function workEpisode(a: SajuAnalysis, x: CrossReport | null): Comic {
  const c = makeCtx(a, x, 'work');
  const job = x?.job ?? null;
  const gp = a.elements.groupPercent;
  const k: Kind = c.work.kind;
  const [top, second] = topGroups(a);
  const P = phaseOf(a);
  const label = job ? job.input : k === 'study' ? (c.age === 'kid' ? '초등학생' : '학생') : c.senior ? '인생 2막' : '일하는 사람';
  const title = job ? '일과 나' : k === 'study' ? '공부와 나' : c.senior ? '나의 하루' : '일과 나';
  const phaseG = P.switching && P.next ? P.ng : P.g;
  const PH = c.young ? PHASE_STUDY : c.senior ? PHASE_SENIOR : PHASE;
  const prepDefault = c.young ? PREP_TITLE.study[phaseG] : c.senior ? PREP_TITLE.senior[phaseG] : PREP[phaseG].title;
  const beats: Beat[] = [];
  const push = (title0: string, list: Gags, first: Partial<Panel>) => {
    let done = false;
    list.forEach((g, i) => {
      if (!isGag(g)) {
        beats.push(g);
        return;
      }
      beats.push(cut(c, i ? `${title0} ${i + 1}` : title0, g.cap ?? '', g.s, done ? {} : first));
      done = true;
    });
  };

  beats.push(cut(c, '표지', '', { bg: 'burst', cast: [c.me(430, 'smug', 'hold', { held: c.work.held, dir: -1 })], talk: [] }, { cover: { kicker: '2화', title, tagline: `${label} — 지금은 ‘${PH[phaseG].title}’` } }));

  // 아침과 출근길
  const m = morning(c, k);
  beats.push(cut(c, '아침', m.cap, m.s));
  const cm = commute(c, k);
  beats.push(cut(c, '출근길', cm.cap, cm.s));

  // 직업 궁합 퀴즈쇼
  const fit = job?.fit ?? null;
  beats.push(
    cut(c, '궁합 발표', fit ? `직업 궁합: ‘${fit.label}’` : '직업을 알려 주면 궁합 점수가 나온다.', {
      bg: 'stage',
      cast: [c.mirror(130, 'happy', 'hold', { held: 'mic' })],
      talk: [say(0, fit ? '두구두구… 네 일과 사주의 궁합은!' : '직업을 알려 주면 점수를 볼 수 있어!')],
      props: [{ kind: 'score', x: 420, y: 70, label: '사주 궁합', label2: fit ? `${fit.score}점` : '??점', color: fit && fit.score < 50 ? '#ff8a8a' : '#7cf29a' }],
    }, {
      basis: fit?.basis,
      note: fit ? fit.text : '직업을 입력하면 그 일이 쓰는 힘과 사주를 비교해 궁합을 그려 드립니다.',
    }),
  );
  if (fit) {
    const s: Scene =
      fit.score >= 70
        ? { bg: 'burst', cast: [c.me(300, 'star', 'cheer', { fx: ['sparkle'], sym: 'flare' })], talk: [shout(0, '천직이었구나!')] }
        : fit.score >= 50
          ? { bg: 'white', cast: [c.me(200, 'think', 'think'), c.mirror(460, 'smile', 'stand', { dir: -1 })], talk: [think(0, '(애매하다… 괜찮은 건가?)'), say(1, '쓰는 법에 따라 점수는 달라져.')] }
          : { bg: 'lightning', cast: [c.me(200, 'shock', 'stand', { fx: ['lightning'] }), c.mirror(460, 'smug', 'stand', { dir: -1 })], talk: [shout(0, '이 일… 나랑 안 맞는 거야?!'), say(1, '점수보다 버티는 법이 중요해.')] };
    beats.push(cut(c, '궁합 반응', '', s));
  }

  // 무기 ①②
  push('무기 ①', STRENGTH[top](c, k).map((g, i) => (i === 0 && isGag(g) ? { ...g, cap: `무기 ① ${STRENGTH_TITLE[top]}` } : g)), {
    basis: `${top} ${pct(gp[top])}`,
    note: job?.strengths[0]?.text ?? `사주에서 가장 강한 기운은 ${top}(${pct(gp[top])})입니다. 일에서는 ‘${STRENGTH_TITLE[top]}’으로 드러납니다.`,
    tone: 'good',
  });
  beats.push(
    cut(c, '무기 ②', `무기 ② ${STRENGTH_TITLE[second]}`, { bg: 'sparkle', shot: 'bust', cast: [c.me(300, 'proud', 'hips', { front: true, sym: 'flare' })], talk: [think(0, STRENGTH2[second])], sfx: [{ text: '필살기!', x: 500, y: 330, size: 40, color: '#ffb000' }] }, {
      basis: `${second} ${pct(gp[second])}`,
      note: job?.strengths[1]?.text ?? `두 번째로 강한 기운은 ${second}(${pct(gp[second])})입니다.`,
    }),
  );

  // 걸림돌: 이 일이 쓰는데 약한 기운 → 없으면 사주 전체에서 가장 약한 기운
  const needs = job?.category.groups ?? [];
  const weakNeed = needs.filter((g) => gp[g] < 10).sort((p, q) => gp[p] - gp[q])[0];
  const lowest = topGroups(a)[4];
  const sg: TenGodGroup = weakNeed ?? lowest;
  const ST = STRAIN[sg];
  beats.push(text(k === 'study' ? '하지만 공부할 때\n늘 걸리는 부분이 있다.' : k === 'life' ? '하지만 생활하다 보면\n늘 걸리는 부분이 있다.' : '하지만 일할 때\n늘 걸리는 부분이 있다.', 'black'));
  push('걸림돌', ST.gags(c, k).map((g, i) => (i === 0 && isGag(g) ? { ...g, cap: `걸림돌: ${ST.title}` } : g)), {
    basis: `${sg} ${pct(gp[sg])}${weakNeed ? ' · 이 일에 필요한 힘' : ' · 사주에서 가장 약한 기운'}`,
    note: job?.cautions[0]?.text && weakNeed ? job.cautions[0].text : ST.note,
    tone: 'bad',
  });

  // 지금의 운 — 상태창
  const d = P.d;
  const phaseNow = PH[P.g];
  const short = (t: string, n: number) => (textWidth(t, 17) > n * 17 ? `${Array.from(t).slice(0, n - 1).join('')}…` : t);
  const rows = [
    `이름: ${short(c.given || '나', 10)}`,
    `직업: ${short(label, 11)}`,
    d ? `대운: ${pillarHanja(d.pillar)} · ${P.g}의 10년` : '대운: 시작 전',
    `스테이지: ${short(phaseNow.title, 12)}`,
    P.year ? `${P.year.year}년: ${P.year.stemTenGod}의 해` : '',
  ].filter(Boolean);
  beats.push(
    cut(c, '상태창', '[시스템] 현재 상태를 확인합니다.', { bg: 'map', cast: [c.me(120, 'smug', 'hips')], talk: [], props: [{ kind: 'status', x: 400, y: 70, w: 340, label: '상태창', rows }] }, {
      basis: d ? `${pillarHanja(d.pillar)} 대운 · ${d.stemTenGod}(${d.stemRole}) · ${d.score}점` : '대운 시작 전',
      note: job?.now.text ?? `대운은 10년 단위의 큰 흐름입니다. 지금은 ${P.g}의 10년으로, ‘${phaseNow.title}’입니다.`,
    }),
  );
  const mirrorLines = [say(0, P.switching && P.next && P.ng !== P.g ? `곧 ${P.next.startYear}년부터는 ‘${PH[P.ng].title}’야!` : hey(c, `지금은 ${phaseNow.title}야.`)), say(0, PH[phaseG][P.switching ? P.ntone : P.tone])];
  beats.push(
    cut(c, '명경이의 조언', '', { bg: 'map', shot: 'bust', cast: [c.mirror(160, 'smile', 'point'), c.me(440, 'think', 'think', { dir: -1 })], talk: mirrorLines }, {
      basis: P.year ? `${P.year.year}년 세운 ${P.year.stemTenGod} · ${P.year.combined}점` : undefined,
    }),
  );

  // 지금 준비할 것
  const prepTitle = job?.prepare[0]?.title ?? prepDefault;
  beats.push(
    cut(c, '지금 준비할 것', `지금 가장 먼저 준비할 것: ${prepTitle}`, PREP[phaseG].scene(c, k), {
      basis: job?.prepare[0]?.basis ?? `대운 ${phaseG}`,
      note: job?.prepare.map((p) => `${p.title}: ${p.text}`).join(' ') ?? `지금의 대운(${phaseG})에 맞춰 ${josa(prepDefault, '을/를')} 먼저 준비하세요.`,
      tone: 'good',
    }),
  );

  // 기회의 해
  const t = job?.timing;
  const yrs = (ys: number[]) => ys.slice(0, 2).join('·');
  const tRows = t ? [t.good.length ? `전환 기회: ${yrs(t.good)}년` : '', t.promote.length ? `인정받는 해: ${yrs(t.promote)}년` : '', t.caution.length ? `버티며 준비: ${yrs(t.caution)}년` : ''].filter(Boolean) : [];
  beats.push(
    cut(
      c,
      '기회의 해',
      tRows.length ? '' : '운보다 조건을 보고, 차근차근.',
      tRows.length
        ? { bg: 'room', cast: [c.me(120, 'smug', 'point')], talk: [say(0, '달력에 동그라미 쳐 놨다.')], props: [{ kind: 'board', x: 400, y: 50, w: 300, label: '내 인생 달력', rows: tRows }] }
        : { bg: c.work.bg, shot: 'bust', cast: [c.me(300, P.tone === 'bad' ? 'proud' : 'grin', 'fist', { front: true })], talk: [say(0, '좋아, 차근차근 해 보자!')] },
      { note: t?.text ?? '직업을 입력하면 이직·승진에 유리한 해와 버텨야 할 해를 함께 알려 드립니다.' },
    ),
  );

  // 금요일 저녁
  beats.push(
    cut(c, '금요일', k === 'work' ? '그리고 금요일 저녁.' : k === 'study' ? '그리고 종업식 날.' : '그리고 하루의 끝.', {
      bg: 'burst',
      cast: [c.me(300, 'star', 'jump', { fx: ['speed'], sym: 'jump' })],
      talk: [shout(0, k === 'work' ? '퇴근이다!!!' : k === 'study' ? '방학이다!!!' : c.senior ? '오늘도 잘 놀았다!' : '오늘도 수고했다, 나!')],
      sfx: k === 'work' ? [{ text: '불금!', x: 480, y: 360, size: 50, color: '#ff6b2b' }] : [],
    }),
  );
  beats.push(text('다음 화 예고 — 3화 「나의 인생 연대기」\n내 인생, 게임으로 치면 무슨 장르일까?', 'soft'));

  return {
    id: 'work',
    no: 2,
    title,
    subtitle: `${label} · 대운 ${P.g} · 용신 ${ELEMENT_KO[a.yongsin.yongsin]}(${ELEMENT_HANJA[a.yongsin.yongsin]})`,
    beats,
  };
}
