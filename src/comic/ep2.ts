/**
 * 2화 · 일과 나 — 입력한 직업의 일터에서: 사주가 준 무기 두 가지 → 이 일에서 걸리는 부분 → 지금의 대운 → 지금 준비할 것 → 기회의 해
 * 직업을 입력하지 않으면 나이에 맞는 일상(학교·일터·하루)으로 그린다.
 */
import { ELEMENT_HANJA, ELEMENT_KO, pillarHanja, type SajuAnalysis, type TenGodGroup } from '../engine/index.ts';
import { josa } from '../engine/josa.ts';
import type { CrossReport } from '../report/cross.ts';
import { cut, hey, heySsi, makeCtx, pct, phaseOf, say, shot, text, think, topGroups, type Ctx, type Scene } from './ctx.ts';
import type { Beat, Comic, Face, Mood, PanelTone } from './types.ts';

type Kind = 'work' | 'study' | 'life';

const STRENGTH_TITLE: Record<TenGodGroup, string> = {
  비겁: '혼자서도 버티는 자립심',
  식상: '만들고 표현하는 힘',
  재성: '성과로 바꾸는 현실 감각',
  관성: '책임지고 신뢰받는 힘',
  인성: '깊이 배우고 이해하는 힘',
};

/** 무기 ① — 일터에서 강점이 드러나는 장면 */
const STRENGTH: Record<TenGodGroup, (c: Ctx, k: Kind) => Scene> = {
  비겁: (c, k) => ({
    bg: c.work.bg,
    actors: [c.me(200, 'determined', 'hips'), c.other(k === 'study' ? 'teacher' : k === 'life' ? 'friend' : 'boss', 430, 'worried', 'idle', { dir: -1 })],
    lines:
      k === 'work'
        ? [say(1, '이걸 혼자 하겠다고?'), say(0, '제 방식으로 끝내 보겠습니다!')]
        : k === 'study'
          ? [say(1, '이 과제를 혼자 하겠다고?'), say(0, '제 힘으로 해 볼게요!')]
          : [say(1, '이걸 혼자 다 하겠다고?'), say(0, '내 힘으로 해 볼래!')],
  }),
  식상: (c, k) => ({
    bg: c.work.bg,
    actors: [c.me(190, 'sparkle', 'point'), c.other(k === 'work' ? 'coworker' : 'friend', 430, 'surprised', 'idle', { dir: -1 })],
    lines:
      k === 'work'
        ? [say(0, '이렇게 바꾸면 반응이 확 달라질 거예요!'), say(1, '오, 그거 좋은데요?')]
        : k === 'study'
          ? [say(0, '발표는 내가 재밌게 만들어 볼게!'), say(1, '오, 기대된다!')]
          : [say(0, '이렇게 해 보면 어때? 재밌을 거야!'), say(1, '오, 좋은데?')],
    props: c.work.bg === 'office' || c.work.bg === 'school' ? [{ kind: 'whiteboard', x: 470, y: 200 }] : undefined,
  }),
  재성: (c, k) => ({
    bg: c.work.bg,
    actors: [c.me(200, 'proud', 'hold', { held: k === 'work' ? 'tablet' : 'notebook' }), c.other(k === 'work' ? 'boss' : 'friend', 430, 'surprised', 'idle', { dir: -1 })],
    lines:
      k === 'work'
        ? [say(0, '이번 숫자, 제가 정리해 봤어요.'), say(1, '이익이 20%나 늘었다고?')]
        : k === 'study'
          ? [say(0, '중고로 산 책, 되팔아서 남겼어!'), say(1, '너 장사해도 되겠다!')]
          : [say(0, '가계부 보니까 이번 달 20만 원 아꼈어!'), say(1, '대박, 비결이 뭐야?')],
  }),
  관성: (c, k) => ({
    bg: c.work.bg,
    actors: [c.other(k === 'work' ? 'boss' : k === 'study' ? 'teacher' : 'friend', 190, 'smile', 'idle'), c.me(430, 'determined', 'hold', { held: 'document', dir: -1 })],
    lines:
      k === 'work'
        ? [say(0, heySsi(c, '이 건은 맡기죠.')), say(1, '끝까지 책임지겠습니다.')]
        : k === 'study'
          ? [say(0, '이번 행사 책임자는 너다.'), say(1, '맡겨 주세요!')]
          : [say(0, '모임 총무는 역시 너밖에 없어.'), say(1, '맡은 건 끝까지 할게!')],
  }),
  인성: (c, k) => ({
    bg: c.work.bg,
    actors: [c.other(k === 'work' ? 'coworker' : 'friend', 190, 'nervous', 'hold', { held: 'document' }), c.me(430, 'smile', 'hold', { held: 'book', dir: -1 })],
    lines:
      k === 'work'
        ? [say(0, '이거 어떻게 하는지 아세요?'), say(1, '아, 원리부터 보면 쉬워요.')]
        : k === 'study'
          ? [say(0, '이 문제 어떻게 풀어?'), say(1, '개념부터 보면 쉬워!')]
          : [say(0, '넌 모르는 게 없네?'), say(1, '궁금하면 찾아보는 편이라.')],
  }),
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
const STRAIN: Record<TenGodGroup, { title: string; scene: (c: Ctx, k: Kind) => Scene; after: string; note: string }> = {
  비겁: {
    title: '내 몫을 지키는 힘이 약하다',
    scene: (c, k) => ({
      bg: c.work.bg,
      actors: [c.other(k === 'work' ? 'coworker' : 'friend', 190, 'grin', 'hold', { held: 'document' }), c.me(430, 'shock', 'idle', { dir: -1 })],
      lines:
        k === 'work'
          ? [say(0, '이번 성과는 제가 정리해서 보고했어요~'), think(1, '(그거 내가 한 건데…)')]
          : k === 'study'
            ? [say(0, '발표는 내가 할게~'), think(1, '(자료는 내가 다 만들었는데…)')]
            : [say(0, '이번 계획, 내 아이디어로 하자!'), think(1, '(그거 내가 낸 건데…)')],
    }),
    after: '(내 몫을 말하는 게 왜 이렇게 어렵지.)',
    note: '이 일은 혼자 버티고 경쟁하는 힘이 필요한데, 사주상 자기 주장을 밀어붙이는 기운이 약합니다. 성과의 공을 분명히 남기고, 내 몫을 요구하는 연습이 필요합니다.',
  },
  식상: {
    title: '실력만큼 드러내지 못한다',
    scene: (c, k) => ({
      bg: c.work.bg,
      actors: [c.other(k === 'work' ? 'boss' : k === 'study' ? 'teacher' : 'friend', 190, 'annoyed', 'cross'), c.me(430, 'nervous', 'idle', { dir: -1 })],
      lines: [say(0, k === 'work' ? '그래서 결론이 뭐죠?' : k === 'study' ? '그래서 하고 싶은 말이 뭐니?' : '그래서 서운했던 게 뭔데?'), say(1, '그, 그게…')],
    }),
    after: '(머릿속엔 다 있는데… 말이 안 나와.)',
    note: '이 일은 생각을 밖으로 표현하는 힘이 많이 필요한데, 사주상 그 기운이 약해 실력만큼 인정받지 못할 수 있습니다. 보고서와 발표를 정해 둔 틀에 맞춰 미리 준비해 두면 보완됩니다.',
  },
  재성: {
    title: '숫자·돈 감각이 약하다',
    scene: (c, k) => ({
      bg: c.work.bg,
      actors:
        k === 'work'
          ? [c.other('boss', 190, 'annoyed', 'hold', { held: 'document' }), c.me(430, 'nervous', 'scratch', { dir: -1 })]
          : [c.me(300, 'nervous', 'hold', { held: 'wallet', fx: ['sweat'] })],
      lines:
        k === 'work'
          ? [say(0, '예산 계산이 또 틀렸네요.'), think(1, '(숫자는 왜 이렇게 어렵지…)')]
          : [think(0, k === 'study' ? '(용돈 계산이 또 안 맞아…)' : '(이번 달 카드값… 계산이 안 맞아.)')],
    }),
    after: '(돈 감각도 연습하면 늘까?)',
    note: '성과와 돈을 다뤄야 하는 일인데, 사주상 현실 계산과 재물 감각이 약한 편입니다. 내 성과를 수치로 기록하고, 돈이 걸린 판단은 체크리스트로 하세요.',
  },
  관성: {
    title: '규칙과 위계가 버겁다',
    scene: (c, k) => ({
      bg: c.work.bg,
      actors: [c.other(k === 'work' ? 'boss' : k === 'study' ? 'teacher' : 'friend', 190, 'angry', 'point'), c.me(430, 'annoyed', 'idle', { dir: -1 })],
      lines: [say(0, k === 'work' ? '보고 순서는 지켜야죠!' : k === 'study' ? '규칙은 지켜야지!' : '약속 시간 또 늦었어!'), think(1, k === 'life' ? '(시간 약속은 왜 이렇게 어렵지…)' : '(내 방식이 더 빠른데…)')],
    }),
    after: '(틀에 맞추는 건 정말 숨이 막혀.)',
    note: '규칙과 위계가 분명한 일인데, 사주상 통제를 견디는 기운이 약합니다. 스스로 정한 마감과 루틴으로 조직의 규칙을 ‘내 것’으로 만드는 것이 열쇠입니다.',
  },
  인성: {
    title: '공부와 쉼이 밀리기 쉽다',
    scene: (c, k) => ({
      bg: k === 'study' ? 'bedroom' : 'officeNight',
      actors: [c.me(260, 'tired', 'facepalm', { fx: ['cloud'] })],
      lines: [think(0, k === 'work' ? '(공부해야 하는데… 오늘도 못 했다.)' : k === 'study' ? '(복습해야 하는데… 또 미뤘다.)' : '(나를 위한 시간이 하나도 없어.)')],
      props: k === 'study' ? undefined : [{ kind: 'desk', x: 330 }, { kind: 'papers', x: 380 }],
    }),
    after: '(채우지 않고 쓰기만 하니 지칠 수밖에.)',
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
      actors: [c.me(300, 'determined', 'hold', { held: 'laptop' })],
      lines: [say(0, k === 'work' ? '퇴근 후엔 내 이름으로 하는 프로젝트!' : k === 'study' ? '내 이름으로 대회에 나가 볼래!' : '나만의 일, 작게라도 시작해 볼래!')],
      sfx: [{ text: '타닥타닥', x: 480, y: 330, size: 30, color: '#8ab4f8', rot: -6 }],
    }),
  },
  식상: {
    title: '결과물을 쌓아 밖으로 보여 주기',
    scene: (c, k) => ({
      bg: k === 'study' ? 'school' : 'studio',
      actors: [c.me(260, 'sparkle', 'hold', { held: 'tablet' })],
      lines: [say(0, k === 'work' ? '포트폴리오 공개 완료!' : k === 'study' ? '작품 올렸다! 반응 어떨까?' : '블로그에 첫 글 올렸다!')],
      sfx: [{ text: '업로드!', x: 470, y: 150, size: 36, color: '#ec7966' }],
    }),
  },
  재성: {
    title: '성과를 숫자로 정리해 몸값 키우기',
    scene: (c, k) =>
      k === 'work'
        ? { bg: 'office', actors: [c.other('boss', 190, 'surprised', 'idle'), c.me(430, 'determined', 'hold', { held: 'document', dir: -1 })], lines: [say(1, '숫자로 정리해 왔습니다.'), say(0, '…근거가 확실하군.')] }
        : { bg: 'home', actors: [c.me(260, 'proud', 'hold', { held: 'notebook' })], lines: [say(0, k === 'study' ? '알바비 모아서 첫 적금 시작!' : '통장 쪼개기 완료!')], props: [{ kind: 'coins', x: 460 }] },
  },
  관성: {
    title: '책임 있는 역할로 리더 경험 쌓기',
    scene: (c, k) => ({
      bg: k === 'work' ? 'office' : k === 'study' ? 'school' : 'cafe',
      actors: [c.me(200, 'determined', 'point'), c.other(k === 'work' ? 'coworker' : 'friend', 440, 'smile', 'idle', { dir: -1 })],
      lines: [say(0, k === 'work' ? '이번 건, 제가 리드해 보겠습니다!' : k === 'study' ? '이번 학기 목표는 반장!' : '모임 운영, 내가 맡아 볼게!'), say(1, '좋아요, 믿어요!', 'say', { young: '좋아, 믿는다!' })],
      props: k === 'work' ? [{ kind: 'whiteboard', x: 330, y: 170 }] : undefined,
    }),
  },
  인성: {
    title: '다음 10년의 몸값이 될 공부',
    scene: (c, k) => ({
      bg: 'library',
      actors: [c.me(260, 'determined', 'hold', { held: 'book' })],
      lines: [say(0, k === 'work' ? '자격증 시험까지 D-60!' : k === 'study' ? '기말까지 개념 정리 끝낸다!' : '새로 배우는 거, 이번엔 끝까지!')],
      props: [{ kind: 'books', x: 460 }],
    }),
  },
};

const WORKDAY: Record<Kind, (c: Ctx) => Scene> = {
  work: (c) => ({
    bg: c.work.bg,
    actors: [c.me(200, 'smile', 'hold', { held: c.work.held }), c.other('coworker', 430, 'smile', 'wave', { dir: -1 })],
    lines: [say(1, heySsi(c, `오늘 ${josa(c.work.task, '은/는')} 준비됐어요?`)), say(0, '네, 어제 다 해 뒀어요!')],
    props: c.work.props.map((p) => ({ ...p, x: p.x + 40 })),
  }),
  study: (c) => ({
    bg: c.work.bg,
    actors: [c.me(200, 'smile', 'hold', { held: 'book' }), c.other('friend', 430, 'grin', 'wave', { dir: -1, age: c.age === 'adult' ? 'adult' : c.age })],
    lines: [say(1, hey(c, '오늘 과제 다 했어?')), say(0, '당연하지!')],
  }),
  life: (c) => ({
    bg: c.work.bg,
    actors: [c.me(260, 'smile', 'hold', { held: c.work.held })],
    lines: [say(0, c.work.id === 'transition' ? '지원서 세 곳, 오늘 다 넣는다!' : c.work.id === 'home' ? '오늘 할 일: 장보기, 정리, 가계부!' : '오늘은 도서관 갔다가 산책!')],
  }),
};

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

  beats.push(
    cut(c, '표지', '', { bg: c.work.bg, actors: [c.me(410, 'determined', 'hold', { held: c.work.held, dir: -1 })], lines: [] }, { cover: { kicker: '2화', title, tagline: `${label} — 지금은 ‘${PH[phaseG].title}’` } }),
  );
  beats.push(
    text(
      job
        ? `나는 ${label}.\n오늘도 ${c.work.place}에서 하루가 시작된다.`
        : k === 'study'
          ? `나는 ${label}.\n오늘도 ${c.work.place}에서 하루가 시작된다.`
          : c.senior
            ? '일을 내려놓은 뒤에도\n하루는 바쁘게 흘러간다.'
            : '아직 직업을 알려 주지 않았다.\n그래도 일하는 나의 모습은 사주에 담겨 있다.',
    ),
  );

  // 일터의 하루 (직업 궁합)
  const fit = job?.fit ?? null;
  beats.push(
    cut(c, '일터의 하루', fit ? `이 일과 내 사주의 궁합은 ‘${fit.label}’(${fit.score}점).` : '오늘도 하루가 시작된다.', WORKDAY[k](c), {
      basis: fit?.basis,
      note: fit ? fit.text : '직업을 입력하면 그 일이 쓰는 힘과 사주를 비교해 궁합을 그려 드립니다.',
    }),
  );

  // 무기 ①②
  beats.push(
    cut(c, '무기 ①', `무기 ① ${STRENGTH_TITLE[top]}`, STRENGTH[top](c, k), {
      basis: `${top} ${pct(gp[top])}`,
      note: job?.strengths[0]?.text ?? `사주에서 가장 강한 기운은 ${top}(${pct(gp[top])})입니다. 일에서는 ‘${STRENGTH_TITLE[top]}’으로 드러납니다.`,
      tone: 'good',
    }),
  );
  beats.push(
    cut(c, '무기 ②', `무기 ② ${STRENGTH_TITLE[second]}`, { bg: c.work.bg, ...shot('bust', 'sparkle'), actors: [c.me(300, 'proud', 'hips', { front: true })], lines: [think(0, STRENGTH2[second])] }, {
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
  beats.push(text(k === 'study' ? '하지만 공부할 때\n늘 걸리는 부분이 있다.' : k === 'life' ? '하지만 생활하다 보면\n늘 걸리는 부분이 있다.' : '하지만 일할 때\n늘 걸리는 부분이 있다.', 'dark'));
  beats.push(
    cut(c, '걸림돌', `걸림돌: ${ST.title}`, ST.scene(c, k), {
      basis: `${sg} ${pct(gp[sg])}${weakNeed ? ` · 이 일에 필요한 힘` : ' · 사주에서 가장 약한 기운'}`,
      note: job?.cautions[0]?.text && weakNeed ? job.cautions[0].text : ST.note,
      tone: 'bad',
    }),
  );
  beats.push(cut(c, '걸림돌 뒤의 마음', '', { bg: 'night', ...shot('close', 'tone'), actors: [c.me(380, 'sad', 'idle', { dir: -1 })], lines: [think(0, ST.after)] }));

  // 지금의 운
  const d = P.d;
  const phaseNow = PH[P.g];
  beats.push(
    text(`지금 내 운은 —\n‘${phaseNow.title}’`, 'soft', {
      title: '지금의 대운',
      basis: d ? `${pillarHanja(d.pillar)} 대운 · ${d.stemTenGod}(${d.stemRole}) · ${d.score}점` : '대운 시작 전',
      note: job?.now.text ?? `대운은 10년 단위의 큰 흐름입니다. 지금은 ${P.g}의 10년으로, ‘${phaseNow.title}’입니다.`,
    }),
  );
  const mirrorLines = [say(0, P.switching && P.next && P.ng !== P.g ? `곧 ${P.next.startYear}년부터는 ‘${PH[P.ng].title}’야!` : hey(c, `지금은 ${phaseNow.title}야.`)), say(0, PH[phaseG][P.switching ? P.ntone : P.tone])];
  beats.push(
    cut(c, '명경이의 조언', `${a.currentSajuYear}년, 거울 속 명경이가 다시 나타났다.`, { bg: c.work.bg === 'school' ? 'school' : 'home', ...shot('bust', 'soft'), actors: [c.mirror(160, 'smile'), c.me(440, 'thinking', 'think', { dir: -1 })], lines: mirrorLines }, {
      basis: P.year ? `${P.year.year}년 세운 ${P.year.stemTenGod} · ${P.year.combined}점` : undefined,
    }),
  );

  // 지금 준비할 것
  const prepTitle = job?.prepare[0]?.title ?? prepDefault;
  beats.push(
    cut(c, '지금 준비할 것', `지금 가장 먼저 준비할 것\n${prepTitle}`, PREP[phaseG].scene(c, k), {
      basis: job?.prepare[0]?.basis ?? `대운 ${phaseG}`,
      note: job?.prepare.map((p) => `${p.title}: ${p.text}`).join(' ') ?? `지금의 대운(${phaseG})에 맞춰 ${josa(prepDefault, '을/를')} 먼저 준비하세요.`,
      tone: 'good',
    }),
  );

  // 기회의 해
  const t = job?.timing;
  const parts = t
    ? [t.good.length ? `전환의 기회 ${t.good.slice(0, 2).join('·')}년` : '', t.promote.length ? `인정받는 해 ${t.promote.slice(0, 2).join('·')}년` : '', t.caution.length ? `버티며 준비 ${t.caution.slice(0, 2).join('·')}년` : ''].filter(Boolean)
    : [];
  const face: Face = P.tone === 'bad' ? 'determined' : 'grin';
  const mood: Mood = P.tone === 'bad' ? 'cool' : 'sparkle';
  beats.push(
    cut(c, '다짐', parts.length ? parts.join(' · ') : '운보다 조건을 보고, 차근차근.', { bg: c.work.bg, ...shot('bust', mood), actors: [c.me(300, face, 'fighting', { front: true })], lines: [say(0, '좋아, 차근차근 해 보자!')] }, {
      note: t?.text ?? '직업을 입력하면 이직·승진에 유리한 해와 버텨야 할 해를 함께 알려 드립니다.',
    }),
  );

  return {
    id: 'work',
    no: 2,
    title,
    subtitle: `${label} · 대운 ${P.g} · 용신 ${ELEMENT_KO[a.yongsin.yongsin]}(${ELEMENT_HANJA[a.yongsin.yongsin]})`,
    beats,
  };
}
