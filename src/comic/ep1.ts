/**
 * 1화 · 나라는 사람 — 일간(타고난 기질) → 겉(월간) → 속(일지) → 가장 강한 기운 → 솔직한 약점 → 명경이의 처방(용신)
 * 모든 장면은 사주 구조에서 고르고, 컷마다 근거를 남긴다. 좋은 장면만 고르지 않는다.
 */
import { ELEMENT_HANJA, ELEMENT_KO, STEMS, pillarHanja, type Element, type SajuAnalysis, type TenGod, type TenGodGroup } from '../engine/index.ts';
import { groupOf } from '../engine/tenGods.ts';
import type { CrossReport } from '../report/cross.ts';
import { wealthCapacity } from '../report/metrics.ts';
import { EL_WORD, cut, hey, makeCtx, pct, say, shot, text, think, topGroups, type Ctx, type Scene } from './ctx.ts';
import type { Beat, Comic, Face, Mood, Pose } from './types.ts';

interface DayMaster {
  /** 비유 */
  image: string;
  /** 한 줄 기질 */
  trait: string;
  /** 표지 한 줄 */
  tag: string;
  cover: [Face, Pose];
  scene: (c: Ctx) => Scene;
  note: string;
}

const DM: Record<number, DayMaster> = {
  0: {
    image: '하늘로 곧게 뻗는 큰 나무',
    trait: '방향이 정해지면 일단 직진한다',
    tag: '방향이 정해지면 직진하는 사람',
    cover: ['grin', 'hips'],
    scene: (c) => ({
      bg: 'street',
      actors: [c.me(200, 'determined', 'point'), c.other('friend', 430, 'surprised', 'idle', { dir: -1 })],
      lines: [say(0, '여행 코스는 내가 다 짜 왔어. 따라와!', 'say', { young: '조별 과제, 역할 다 나눠 왔어!', senior: '산악회 코스는 내가 정했어. 따라와!' }), say(1, hey(c, '벌써?!'), 'shout')],
    }),
    note: '갑목은 스스로 방향을 정하고 앞장서는 기질입니다. 모임에서 자연스럽게 결정을 맡게 되는 일이 많습니다.',
  },
  1: {
    image: '휘어도 꺾이지 않는 덩굴',
    trait: '분위기를 읽고 사람 사이를 잇는다',
    tag: '분위기를 읽고 사람을 잇는 사람',
    cover: ['smile', 'wave'],
    scene: (c) => ({
      bg: 'cafe',
      actors: [c.other('friend', 190, 'laugh', 'idle'), c.me(420, 'smile', 'hold', { held: 'coffee', dir: -1 })],
      lines: [say(0, hey(c, '너랑 있으면 진짜 편해~')), think(1, '(사실 눈치 엄청 보는 중)')],
    }),
    note: '을목은 상대에게 맞추는 능력이 뛰어나지만, 그만큼 속으로 신경을 많이 쓰는 기질입니다.',
  },
  2: {
    image: '하늘 한가운데 뜬 태양',
    trait: '숨김없이 밝고, 사람들 앞에서 힘이 난다',
    tag: '어디서든 분위기를 밝히는 사람',
    cover: ['laugh', 'fist'],
    scene: (c) => ({
      bg: 'stage',
      actors: [c.me(300, 'grin', 'wave', { held: 'mic', fx: ['sparkle'] })],
      lines: [say(0, '자, 오늘 다들 신나게 놀아요!', 'shout', { young: '장기자랑 1등은 우리 반이다!', senior: '자, 오늘 노래자랑 신나게 갑시다!' })],
    }),
    note: '병화는 감정과 생각이 그대로 드러나고, 주목받는 자리에서 에너지가 오르는 기질입니다.',
  },
  3: {
    image: '어둠을 밝히는 촛불',
    trait: '겉은 차분해도 한 사람을 깊이 챙긴다',
    tag: '한 사람을 깊이 비추는 사람',
    cover: ['calm', 'cheeks'],
    scene: (c) => ({
      bg: 'night',
      actors: [c.other('friend', 190, 'cry', 'idle'), c.me(420, 'calm', 'hold', { held: 'coffee', dir: -1 })],
      lines: [say(0, '나 오늘 진짜 힘들었어…'), say(1, '얘기해 봐. 끝까지 들을게.')],
    }),
    note: '정화는 넓게 비추기보다 가까운 사람을 따뜻하게 지키는 기질입니다. 대신 한번 서운하면 오래 기억합니다.',
  },
  4: {
    image: '묵직한 큰 산',
    trait: '쉽게 흔들리지 않아 모두가 기댄다',
    tag: '흔들리지 않는 큰 산 같은 사람',
    cover: ['smile', 'cross'],
    scene: (c) => ({
      bg: 'mountain',
      actors: [c.other('friend', 190, 'shock', 'cheeks'), c.me(420, 'calm', 'cross', { dir: -1 })],
      lines: [say(0, '큰일 났어! 어떡해?!', 'shout'), say(1, '괜찮아. 하나씩 하면 돼.')],
    }),
    note: '무토는 위기에도 표정이 크게 흔들리지 않아 주변의 기둥이 되는 기질입니다. 대신 변화에는 느린 편입니다.',
  },
  5: {
    image: '곡식을 길러 내는 밭',
    trait: '사람을 먹이고 챙기며 실속을 지킨다',
    tag: '사람을 챙기고 길러 내는 사람',
    cover: ['smile', 'hold'],
    scene: (c) => ({
      bg: 'home',
      actors: [c.me(190, 'smile', 'hold', { held: 'cake' }), c.other('friend', 420, 'love', 'idle', { dir: -1 })],
      lines: [say(0, '밥은 먹었어? 이거 먹어.'), say(1, '엄마…?')],
    }),
    note: '기토는 주변 사람을 세심하게 챙기고 길러 내는 기질입니다. 대신 걱정이 많고 속마음을 잘 드러내지 않습니다.',
  },
  6: {
    image: '단련될수록 강해지는 쇠',
    trait: '결단이 빠르고 할 말은 한다',
    tag: '결단이 빠르고 할 말은 하는 사람',
    cover: ['determined', 'point'],
    scene: (c) => ({
      bg: 'office',
      actors: [c.me(190, 'determined', 'point'), c.other('coworker', 420, 'surprised', 'hold', { held: 'document', dir: -1 })],
      lines: [say(0, '결론부터 말할게요.', 'say', { young: '결론부터 말할게.' }), think(1, '(회의 시작 1분 만에…?)', { young: '(조별 과제 회의 1분 만에…?)' })],
    }),
    note: '경금은 판단이 빠르고 원칙이 분명한 기질입니다. 돌려 말하지 않아 신뢰를 얻지만, 말이 날카롭게 들릴 때가 있습니다.',
  },
  7: {
    image: '정교하게 다듬어진 보석',
    trait: '감각이 예리하고 디테일을 놓치지 않는다',
    tag: '디테일로 완성도를 만드는 사람',
    cover: ['proud', 'think'],
    scene: (c) => ({
      bg: 'office',
      actors: [c.me(190, 'thinking', 'hold', { held: 'document' }), c.other('coworker', 420, 'nervous', 'idle', { dir: -1 })],
      lines: [say(0, '여기 글자 간격, 1픽셀 틀렸어요.', 'say', { young: '여기 글자 간격, 1픽셀 틀렸어.' }), say(1, '그게… 보여요?', 'say', { young: '그게… 보여?' })],
    }),
    note: '신금은 섬세한 감각과 높은 기준을 가진 기질입니다. 완성도가 높지만 스스로와 남에게 엄격해지기 쉽습니다.',
  },
  8: {
    image: '끝없이 흐르는 큰 바다',
    trait: '생각의 스케일이 크고 자유롭다',
    tag: '바다처럼 크게 생각하는 사람',
    cover: ['sparkle', 'wave'],
    scene: (c) => ({
      bg: 'sea',
      actors: [c.me(190, 'sparkle', 'cheer'), c.other('friend', 420, 'surprised', 'idle', { dir: -1 })],
      lines: [say(0, '이번엔 세계 일주 어때?'), say(1, '지난주엔 창업한다며?!', 'shout', { young: '지난주엔 유튜버 한다며?!', senior: '지난주엔 귀농한다며?!' })],
    }),
    note: '임수는 아이디어와 활동 범위가 넓은 기질입니다. 시야가 크지만 한곳에 오래 머무르기 어려워합니다.',
  },
  9: {
    image: '조용히 스며드는 빗물',
    trait: '말수는 적어도 사람 속을 꿰뚫어 본다',
    tag: '말없이 마음을 읽는 사람',
    cover: ['shy', 'mouth'],
    scene: (c) => ({
      bg: 'rain',
      actors: [c.other('friend', 190, 'surprised', 'idle'), c.me(420, 'smile', 'wave', { held: 'umbrella', dir: -1 })],
      lines: [say(0, '어떻게 알았어? 나 말 안 했는데.'), say(1, '그냥… 표정이 그랬어.')],
    }),
    note: '계수는 직관과 공감 능력이 뛰어난 기질입니다. 대신 생각이 많아 혼자 걱정을 키우기 쉽습니다.',
  },
};

/** 겉 — 월간 십성: 사회에서 보이는 얼굴 */
const OUTER: Record<TenGod, { tag: string; other: string; me: string; face: Face; young?: string }> = {
  비견: { tag: '자기 길을 가는 사람', other: '넌 누가 뭐래도 네 방식대로 하더라.', me: '그게 나니까!', face: 'proud' },
  겁재: { tag: '승부욕 강한 사람', other: '너랑 내기하면 절대 안 져 주더라!', me: '승부는 승부지!', face: 'grin' },
  식신: { tag: '여유 있고 손재주 좋은 사람', other: '넌 뭘 해도 즐겁게 하더라.', me: '인생 뭐 있어~', face: 'calm' },
  상관: { tag: '말 잘하고 재치 있는 사람', other: '너 말하는 거 진짜 웃겨!', me: '에이, 그 정도는 아니고~', face: 'grin' },
  편재: { tag: '통 크고 발 넓은 사람', other: '넌 어딜 가도 아는 사람이 있더라?', me: '세상은 넓고 친구는 많지!', face: 'laugh' },
  정재: { tag: '꼼꼼하고 알뜰한 사람', other: '가계부까지 쓴다고? 대단하다.', me: '새는 돈이 제일 아깝거든.', face: 'proud', young: '용돈 기입장까지 써? 대단하다.' },
  편관: { tag: '카리스마 있는 사람', other: '솔직히 처음엔 좀 무서웠어.', me: '내, 내가…?', face: 'shock' },
  정관: { tag: '반듯하고 믿음직한 사람', other: '역시 믿고 맡길 사람은 너야.', me: '맡은 건 끝까지 해야지.', face: 'smile' },
  편인: { tag: '생각이 독특한 사람', other: '넌 가끔 4차원 같아.', me: '…칭찬이지?', face: 'annoyed' },
  정인: { tag: '따뜻하고 아는 게 많은 사람', other: '너한테 물어보면 다 알려 주더라.', me: '같이 알면 좋잖아.', face: 'smile' },
};

/** 속 — 일지 십성: 속마음의 자리 */
const INNER: Record<TenGod, { tag: string; line: string; face: Face; mood: Mood }> = {
  비견: { tag: '혼자서도 괜찮고 싶은 마음', line: '(남한테 기대는 건 내 스타일이 아니야.)', face: 'determined', mood: 'cool' },
  겁재: { tag: '누구에게도 지기 싫은 마음', line: '(지는 건 진짜 못 참겠어…!)', face: 'angry', mood: 'warm' },
  식신: { tag: '편안하고 싶은 마음', line: '(그냥 편하게, 내 속도로 살고 싶다.)', face: 'calm', mood: 'soft' },
  상관: { tag: '하고 싶은 말이 많은 마음', line: '(그 말, 하고 싶었는데… 참았다.)', face: 'annoyed', mood: 'tone' },
  편재: { tag: '더 넓은 세상을 원하는 마음', line: '(다음엔 더 크게 해 보고 싶어!)', face: 'sparkle', mood: 'sparkle' },
  정재: { tag: '안정을 지키고 싶은 마음', line: '(이번 달 통장… 괜찮겠지?)', face: 'worried', mood: 'cool' },
  편관: { tag: '긴장을 놓지 못하는 마음', line: '(실수하면 안 돼. 완벽해야 해.)', face: 'nervous', mood: 'tone' },
  정관: { tag: '인정받고 싶은 마음', line: '(다들 날 믿는데… 실망시키면 어쩌지.)', face: 'worried', mood: 'cool' },
  편인: { tag: '아무도 모르는 혼자만의 세계', line: '(아무도 내 진짜 생각은 모를 거야.)', face: 'thinking', mood: 'cool' },
  정인: { tag: '기대고 싶은 마음', line: '(누가 날 좀 챙겨 줬으면 좋겠다.)', face: 'shy', mood: 'soft' },
};

/** 가장 강한 기운 = 타고난 무기 (장면 + 주변의 반응) */
const STRONG: Record<TenGodGroup, { line2: string; scene: (c: Ctx) => Scene; react: (c: Ctx) => Scene; note: string }> = {
  비겁: {
    line2: '자존심과 자립심이 엔진이다',
    scene: (c) => ({ bg: 'gym', actors: [c.me(250, 'determined', 'fighting', { fx: ['flame'] })], lines: [say(0, '남한테 기대긴 싫어. 내 힘으로 해낸다!')], props: [{ kind: 'dumbbell', x: 470 }] }),
    react: (c) => ({ bg: 'gym', ...shot('bust'), actors: [c.me(170, 'proud', 'hips'), c.other('friend', 440, 'surprised', 'idle', { dir: -1 })], lines: [say(1, '그걸 혼자 다 했다고?'), say(0, '내 힘으로 해 보고 싶었어.')] }),
    note: '비겁이 강하면 스스로 해내려는 힘과 경쟁심이 큽니다. 독립·창업에 유리하지만 고집과 지출도 함께 커집니다.',
  },
  식상: {
    line2: '재능과 말솜씨로 나를 드러낸다',
    scene: (c) => ({ bg: 'cafe', actors: [c.me(200, 'sparkle', 'cheer', { fx: ['bulb'] }), c.other('friend', 430, 'tired', 'idle', { dir: -1 })], lines: [say(0, '방금 엄청난 아이디어가 떠올랐어!'), say(1, '오늘만 세 번째야.')] }),
    react: (c) => ({ bg: 'cafe', ...shot('bust'), actors: [c.me(170, 'proud', 'point'), c.other('friend', 440, 'grin', 'idle', { dir: -1 })], lines: [say(1, '근데… 이번 건 진짜 좋다!'), say(0, '그치? 그치?!')] }),
    note: '식상이 강하면 아이디어와 표현력이 넘칩니다. 만들고 말하는 일에서 빛나지만 마무리가 약해지기 쉽습니다.',
  },
  재성: {
    line2: '돈과 기회를 알아보는 현실 감각',
    scene: (c) => ({ bg: 'money', actors: [c.me(220, 'proud', 'hold', { held: 'money', fx: ['sparkle'] })], lines: [say(0, '이건 돈 되겠는데?')], props: [{ kind: 'chartUp', x: 450, y: 196 }, { kind: 'coins', x: 460 }] }),
    react: (c) => ({ bg: 'cafe', ...shot('bust'), actors: [c.other('friend', 160, 'surprised', 'idle'), c.me(440, 'determined', 'think', { dir: -1 })], lines: [say(0, '넌 그런 게 어떻게 보여?'), say(1, '숫자가 말해 주거든.')] }),
    note: '재성이 강하면 돈의 흐름과 현실 감각이 빠릅니다. 기회를 잘 잡지만, 욕심이 앞서면 무리한 투자를 하기 쉽습니다.',
  },
  관성: {
    line2: '책임감과 원칙으로 인정받는다',
    scene: (c) => ({
      bg: 'office',
      actors: [c.me(190, 'proud', 'hold', { held: 'trophy' }), c.other('boss', 420, 'smile', 'idle', { dir: -1 })],
      lines: [say(1, '역시 믿고 맡길 사람은 자네야.', 'say', { young: '역시 믿고 맡길 사람은 너야.' }), say(0, '맡은 일은 끝까지 합니다!', 'say', { young: '맡은 일은 끝까지 할게요!' })],
    }),
    react: (c) => ({ bg: 'officeNight', ...shot('close', 'cool'), actors: [c.me(200, 'tired', 'idle', { front: true })], lines: [think(0, '(사실 어젯밤 세 번이나 확인했어…)')] }),
    note: '관성이 강하면 책임감과 규범 의식이 뚜렷해 조직에서 인정받기 쉽습니다. 대신 압박과 스트레스도 크게 받습니다.',
  },
  인성: {
    line2: '배우고 생각하며 내공을 쌓는다',
    scene: (c) => ({ bg: 'library', actors: [c.me(250, 'thinking', 'hold', { held: 'book' })], lines: [say(0, '이건 제대로 알고 시작해야지.')], props: [{ kind: 'books', x: 450 }] }),
    react: (c) => ({ bg: 'library', ...shot('bust'), actors: [c.other('friend', 160, 'sparkle', 'idle'), c.me(440, 'smile', 'scratch', { dir: -1 })], lines: [say(0, '모르는 게 없네! 어떻게 알았어?'), say(1, '어제 책에서 봤거든.')] }),
    note: '인성이 강하면 배우고 이해하는 힘이 큽니다. 자격·전문성으로 인정받지만 생각이 많아 실행이 늦어지기 쉽습니다.',
  },
};

const DOMINANT_NOTE: Record<TenGod, string> = {
  비견: '그중에서도 비견이 두드러져, 대등한 관계와 자기 방식을 중시합니다.',
  겁재: '그중에서도 겁재가 두드러져, 승부욕이 강하고 돈이 나가는 일도 잦습니다.',
  식신: '그중에서도 식신이 두드러져, 한 분야를 꾸준히 파고드는 장인 기질이 있습니다.',
  상관: '그중에서도 상관이 두드러져, 틀을 깨는 말과 재치가 강점이자 구설의 원인이 됩니다.',
  편재: '그중에서도 편재가 두드러져, 크게 벌고 크게 쓰는 활동형 재물 감각이 있습니다.',
  정재: '그중에서도 정재가 두드러져, 꼼꼼하게 모으고 관리하는 안정형 재물 감각이 있습니다.',
  편관: '그중에서도 편관이 두드러져, 압박 속에서 강해지지만 스트레스도 큽니다.',
  정관: '그중에서도 정관이 두드러져, 원칙과 신뢰로 인정받는 모범생 기질이 있습니다.',
  편인: '그중에서도 편인이 두드러져, 남다른 직관과 특수한 분야에 대한 관심이 큽니다.',
  정인: '그중에서도 정인이 두드러져, 배움과 보살핌, 자격과 문서 운이 강합니다.',
};

interface Weak {
  line2: string;
  scene: (c: Ctx) => Scene;
  basis: (a: SajuAnalysis) => string;
  note: string;
  after: { line: string; face: Face; mood: Mood };
}

const gpOf = (a: SajuAnalysis, g: TenGodGroup) => pct(a.elements.groupPercent[g]);

/** 솔직한 약점 — 위에서부터 먼저 해당하는 것 하나 */
const WEAKNESS: (Weak & { test: (a: SajuAnalysis) => boolean })[] = [
  {
    test: (a) => a.elements.tenGodCount['상관'] > 0 && a.elements.tenGodCount['정관'] > 0,
    line2: '옳은 말도 윗사람 앞에서 참지 못한다',
    scene: (c) => ({
      bg: 'office',
      actors: [c.me(190, 'angry', 'point', { fx: ['anger'] }), c.other('boss', 420, 'angry', 'cross', { dir: -1 })],
      lines: [say(0, '그 방식은 틀렸다고 생각합니다!', 'shout', { young: '선생님, 그건 틀린 것 같아요!' }), say(1, '…자네, 지금 뭐라고 했나?', 'say', { young: '…너, 지금 뭐라고 했니?' })],
    }),
    basis: (a) => `상관 ${a.elements.tenGodCount['상관']}개 · 정관 ${a.elements.tenGodCount['정관']}개 (상관견관)`,
    note: '상관과 정관이 함께 있으면 재능과 비판 정신이 규칙·윗사람과 부딪히기 쉽습니다. 말의 내용보다 “때와 방식”을 고르는 것이 손해를 줄이는 방법입니다.',
    after: { line: '(맞는 말이었는데… 왜 또 이렇게 됐지.)', face: 'sad', mood: 'tone' },
  },
  {
    test: (a) => wealthCapacity(a) === '작음',
    line2: '돈을 붙잡아 두는 힘이 약하다',
    scene: (c) => ({
      bg: 'home',
      actors: [c.me(300, 'shock', 'hold', { held: 'wallet', fx: ['gloom'] })],
      lines: [say(0, '월급날이 엊그제였는데… 다 어디 갔지?', 'say', { young: '용돈 받은 지 사흘 만에… 다 어디 갔지?', senior: '연금 들어온 지 며칠 됐다고…' })],
    }),
    basis: (a) => `재성 ${gpOf(a, '재성')}`,
    note: '재성이 약하면 돈에 대한 감각이 무디고 새는 돈을 알아차리기 어렵습니다. 의지보다 자동이체·통장 쪼개기 같은 구조가 효과적입니다.',
    after: { line: '(이번 달도 적자다… 어디서 샌 거지?)', face: 'tired', mood: 'gloom' },
  },
  {
    test: (a) => wealthCapacity(a) === '부담',
    line2: '돈과 일이 내 힘보다 크다',
    scene: (c) => ({
      bg: 'money',
      actors: [c.me(230, 'tired', 'hold', { held: 'money', fx: ['sweat'] })],
      lines: [say(0, '벌긴 버는데… 왜 이렇게 힘들지?', 'say', { young: '하고 싶은 건 많은데… 왜 벅차지?' })],
      props: [{ kind: 'moneyBag', x: 440 }, { kind: 'coins', x: 520 }],
    }),
    basis: (a) => `신약 ${pct(a.strength.score)} · 재성 ${gpOf(a, '재성')} (재다신약)`,
    note: '재물의 기운은 많은데 나를 돕는 힘이 약한 구조(재다신약)입니다. 기회는 많아도 감당할 체력과 사람이 부족하면 손에 쥐는 것이 적습니다. 욕심을 줄이고 함께할 사람을 구하세요.',
    after: { line: '(욕심만큼 몸이 따라 주질 않네…)', face: 'tired', mood: 'tone' },
  },
  {
    test: (a) => a.elements.groupPercent['비겁'] >= 30,
    line2: '사람 때문에 돈이 새기 쉽다',
    scene: (c) => ({
      bg: 'cafe',
      actors: [c.other('friend', 190, 'nervous', 'cheeks'), c.me(420, 'nervous', 'scratch', { dir: -1 })],
      lines: [say(0, '이번 달만… 조금만 빌려줄 수 있어?'), think(1, '(이번이 몇 번째더라…)')],
    }),
    basis: (a) => `비겁 ${gpOf(a, '비겁')}`,
    note: '비겁이 많으면 의리가 강하고 사람을 잘 챙기지만, 나눠 가질 사람도 많아 돈이 모이기 어렵습니다. 빌려줄 돈은 “돌려받지 못해도 괜찮은 만큼”만 정하세요.',
    after: { line: '(거절하면 사이가 멀어질까 봐…)', face: 'worried', mood: 'cool' },
  },
  {
    test: (a) => a.elements.groupPercent['관성'] >= 35,
    line2: '책임과 압박을 혼자 짊어진다',
    scene: (c) => ({
      bg: 'officeNight',
      actors: [c.me(230, 'tired', 'facepalm', { fx: ['cloud'] })],
      lines: [think(0, '다 내 책임 같아… 숨 좀 쉬자.')],
      props: [{ kind: 'desk', x: 300 }, { kind: 'papers', x: 352 }],
    }),
    basis: (a) => `관성 ${gpOf(a, '관성')}`,
    note: '관성이 많으면 책임감이 강한 만큼 스트레스를 몸으로 받기 쉽습니다. 일을 나누는 연습과 퇴근 후의 확실한 휴식이 필요합니다.',
    after: { line: '(나도 누가 좀 기대게 해 줬으면…)', face: 'sad', mood: 'gloom' },
  },
  {
    test: (a) => a.elements.groupPercent['인성'] >= 35,
    line2: '생각이 많아 실행이 늦다',
    scene: (c) => ({ bg: 'bedroom', actors: [c.me(250, 'worried', 'think', { fx: ['question'] })], lines: [think(0, '준비가 덜 된 것 같아. 다음 달에 할까…')] }),
    basis: (a) => `인성 ${gpOf(a, '인성')}`,
    note: '인성이 많으면 신중하고 배우는 힘이 크지만, 준비만 하다 기회를 놓치기 쉽습니다. “70% 준비되면 시작”을 원칙으로 삼으세요.',
    after: { line: '(이번에도 생각만 하다 끝났네…)', face: 'worried', mood: 'tone' },
  },
  {
    test: (a) => a.elements.groupPercent['식상'] >= 35,
    line2: '벌여 놓은 일은 많은데 마무리가 약하다',
    scene: (c) => ({
      bg: 'cafe',
      actors: [c.me(190, 'grin', 'shrug'), c.other('friend', 420, 'annoyed', 'cross', { dir: -1 })],
      lines: [say(0, '이것도 하고, 저것도 하고!'), say(1, '지난번에 시작한 건 끝냈어?')],
    }),
    basis: (a) => `식상 ${gpOf(a, '식상')}`,
    note: '식상이 많으면 재능과 아이디어가 넘치지만 에너지가 흩어지기 쉽고, 말이 앞서 구설도 생깁니다. 동시에 진행하는 일을 두세 개로 제한하세요.',
    after: { line: '(시작한 것만 벌써 열 개째…)', face: 'nervous', mood: 'tone' },
  },
  {
    test: (a) => a.elements.groupPercent['관성'] < 4,
    line2: '규칙과 통제를 유독 못 견딘다',
    scene: (c) => ({
      bg: 'office',
      actors: [c.other('boss', 190, 'angry', 'point'), c.me(420, 'annoyed', 'idle', { dir: -1, fx: ['sweat'] })],
      lines: [say(0, '출근은 9시까지라고 했지?', 'say', { young: '등교는 8시 반까지라고 했지?' }), think(1, '(규칙… 너무 답답해)')],
    }),
    basis: (a) => `관성 ${gpOf(a, '관성')}`,
    note: '관성이 거의 없으면 자유롭고 독립적이지만, 정해진 규칙과 상하 관계를 견디기 어렵습니다. 스스로 정한 마감과 루틴이 그 빈자리를 채워 줍니다.',
    after: { line: '(틀에 맞추는 건 정말 숨이 막혀.)', face: 'annoyed', mood: 'cool' },
  },
  {
    test: (a) => a.elements.groupPercent['인성'] < 4,
    line2: '쉬어 갈 줄 모르고 달린다',
    scene: (c) => ({ bg: 'officeNight', actors: [c.me(300, 'tired', 'fighting', { fx: ['sweat'] })], lines: [say(0, '쉬면 뒤처질 것 같아. 계속 달려!')] }),
    basis: (a) => `인성 ${gpOf(a, '인성')}`,
    note: '인성이 거의 없으면 배우고 쉬는 데 서툴러, 에너지를 채우지 못한 채 쓰기만 하기 쉽습니다. 일정에 “쉬는 시간”을 먼저 넣으세요.',
    after: { line: '(쉬는 법을 모르겠어…)', face: 'tired', mood: 'gloom' },
  },
  {
    test: (a) => a.elements.groupPercent['식상'] < 4,
    line2: '속마음을 말하지 못해 오해가 쌓인다',
    scene: (c) => ({
      bg: 'cafe',
      actors: [c.other('friend', 190, 'sad', 'idle'), c.me(420, 'nervous', 'idle', { dir: -1 })],
      lines: [say(0, '서운했으면 그때 말을 하지 그랬어.'), say(1, '…말하기가 좀 그래서.')],
    }),
    basis: (a) => `식상 ${gpOf(a, '식상')}`,
    note: '식상이 거의 없으면 실력이 있어도 드러내지 못하고, 감정을 표현하지 못해 관계가 오해로 꼬이기 쉽습니다. 작게라도 말로 꺼내는 연습이 필요합니다.',
    after: { line: '(왜 그때 말을 못 했을까…)', face: 'sad', mood: 'gloom' },
  },
  {
    test: (a) => a.elements.groupPercent['비겁'] < 4,
    line2: '주관을 지키는 힘이 약하다',
    scene: (c) => ({
      bg: 'city',
      actors: [c.other('friend', 150, 'grin', 'point'), c.other('coworker', 300, 'grin', 'idle'), c.me(460, 'worried', 'idle', { dir: -1 })],
      lines: [say(0, '다들 이걸로 하자는데?'), think(2, '(나는 아닌데… 그냥 따라가자)')],
      zoom: 0.92,
    }),
    basis: (a) => `비겁 ${gpOf(a, '비겁')}`,
    note: '비겁이 거의 없으면 협조적이지만 내 몫과 내 의견을 지키는 힘이 약합니다. 중요한 결정은 하루 미루고 혼자 생각해 보는 습관이 도움이 됩니다.',
    after: { line: '(내 의견은 늘 뒷전이네…)', face: 'sad', mood: 'gloom' },
  },
];

/** 해당하는 약점이 없을 때: 일간의 그림자 */
const DM_SHADOW: Record<number, Omit<Weak, 'basis'>> = {
  0: {
    line2: '자존심 때문에 먼저 굽히지 못한다',
    scene: (c) => ({ bg: 'home', actors: [c.other('friend', 190, 'sad', 'idle'), c.me(420, 'angry', 'cross', { dir: -1 })], lines: [say(0, '그냥 미안하다고 하면 되잖아.'), think(1, '(내가 왜 먼저…?)')] }),
    note: '갑목의 곧은 기질은 자존심이 걸린 순간 고집이 됩니다. 관계를 지키는 쪽은 결국 먼저 손을 내미는 사람입니다.',
    after: { line: '(먼저 사과하면 지는 것 같아서…)', face: 'sad', mood: 'tone' },
  },
  1: {
    line2: '거절을 못 해 남의 일까지 떠안는다',
    scene: (c) => ({ bg: 'office', actors: [c.other('coworker', 190, 'smile', 'hold', { held: 'document' }), c.me(420, 'nervous', 'idle', { dir: -1 })], lines: [say(0, '이것도 좀 부탁해도 될까?'), say(1, '아… 네, 할게요.', 'say', { young: '아… 응, 할게.' })] }),
    note: '을목은 맞춰 주는 능력이 큰 만큼 거절이 어렵습니다. 속으로 쌓인 서운함이 한 번에 터지기 전에, 작은 거절부터 연습하세요.',
    after: { line: '(또 거절 못 했다…)', face: 'tired', mood: 'gloom' },
  },
  2: {
    line2: '시작은 뜨겁지만 뒷심이 약하다',
    scene: (c) => ({ bg: 'office', actors: [c.me(190, 'grin', 'cheer'), c.other('coworker', 420, 'tired', 'idle', { dir: -1 })], lines: [say(0, '이 프로젝트, 내가 해 볼게!', 'say', { young: '이 발표, 내가 해 볼게!' }), say(1, '지난번 것도 아직인데…')] }),
    note: '병화는 시작하는 힘이 누구보다 크지만, 반복되는 일에서 금방 흥미를 잃습니다. 마무리를 맡아 줄 꼼꼼한 파트너가 필요합니다.',
    after: { line: '(처음의 열정은 다 어디 갔지?)', face: 'annoyed', mood: 'tone' },
  },
  3: {
    line2: '상처를 오래 기억하고 혼자 삭인다',
    scene: (c) => ({ bg: 'night', actors: [c.me(300, 'sad', 'idle', { fx: ['gloom'] })], lines: [think(0, '그때 그 말… 아직도 서운해.')] }),
    note: '정화는 마음이 깊은 만큼 서운함도 오래갑니다. 혼자 삭이다 한 번에 터지기 전에, 그때그때 짧게 말하는 편이 관계를 지킵니다.',
    after: { line: '(괜찮은 척했지만, 아직 아파.)', face: 'cry', mood: 'gloom' },
  },
  4: {
    line2: '변화를 미루다 타이밍을 놓친다',
    scene: (c) => ({ bg: 'crossroad', actors: [c.me(200, 'thinking', 'cross')], lines: [think(0, '바꾸는 건… 다음에 생각하자.')], props: [{ kind: 'signpost', x: 440, label: '그대로', label2: '변화' }] }),
    note: '무토의 묵직함은 안정감을 주지만, 바꿔야 할 때도 버티게 만듭니다. 결정을 미루는 것도 하나의 선택이라는 점을 기억하세요.',
    after: { line: '(바꿀 때를 또 놓친 걸까…)', face: 'worried', mood: 'tone' },
  },
  5: {
    line2: '걱정과 생각이 많아 혼자 마음고생',
    scene: (c) => ({ bg: 'bedroom', actors: [c.me(250, 'worried', 'think', { fx: ['question'] })], lines: [think(0, '내가 괜히 그 말을 했나…?')] }),
    note: '기토는 세심한 만큼 걱정이 많습니다. 머릿속에서 돌리는 대신 종이에 적어 보면 생각보다 별일 아닌 경우가 많습니다.',
    after: { line: '(괜한 걱정인 줄 알면서도 멈춰지질 않아.)', face: 'worried', mood: 'gloom' },
  },
  6: {
    line2: '맞는 말을 너무 날카롭게 한다',
    scene: (c) => ({ bg: 'office', actors: [c.me(190, 'neutral', 'cross'), c.other('coworker', 420, 'cry', 'idle', { dir: -1 })], lines: [say(0, '틀린 걸 틀렸다고 한 것뿐인데?'), say(1, '말을 꼭 그렇게 해야 돼요?', 'say', { young: '말을 꼭 그렇게 해야 돼?' })] }),
    note: '경금의 직설은 신뢰를 주지만, 같은 말도 날이 서면 사람을 잃습니다. 결론 앞에 한 문장의 배려를 붙여 보세요.',
    after: { line: '(내가 너무 심했나…?)', face: 'sad', mood: 'tone' },
  },
  7: {
    line2: '기준이 높아 스스로를 지치게 만든다',
    scene: (c) => ({ bg: 'home', actors: [c.me(300, 'tired', 'facepalm')], lines: [think(0, '이것도 별로, 저것도 별로… 다시 해야 해.')] }),
    note: '신금의 높은 기준은 완성도를 만들지만, 끝없이 고치다 지치기 쉽습니다. “여기까지면 충분하다”는 선을 미리 정해 두세요.',
    after: { line: '(완벽하지 않으면 안 될 것 같아…)', face: 'tired', mood: 'gloom' },
  },
  8: {
    line2: '관심사가 자주 바뀌어 뿌리내리기 어렵다',
    scene: (c) => ({ bg: 'home', actors: [c.me(230, 'nervous', 'shrug')], lines: [say(0, '이번 것도… 조금 하다 말았네.')], props: [{ kind: 'boxes', x: 450 }] }),
    note: '임수는 흐르는 물처럼 새로운 곳을 향하지만, 한곳에 머물러야 쌓이는 것들을 놓치기 쉽습니다. 하나만은 끝까지 해 보는 경험이 필요합니다.',
    after: { line: '(나는 왜 한곳에 머물지 못할까.)', face: 'sad', mood: 'cool' },
  },
  9: {
    line2: '생각이 꼬리를 물어 불안을 키운다',
    scene: (c) => ({ bg: 'rain', actors: [c.me(300, 'worried', 'idle', { fx: ['gloom'] })], lines: [think(0, '혹시 나 때문인가…')] }),
    note: '계수는 예민한 직관 덕분에 남의 마음을 잘 읽지만, 그만큼 걱정도 잘 만듭니다. 확인되지 않은 걱정은 일단 내려놓는 연습이 필요합니다.',
    after: { line: '(별일 아닐 거야… 아마도.)', face: 'worried', mood: 'gloom' },
  },
};

/** 명경이의 처방 — 용신 */
const YONGSIN: Record<Element, { say: string; line2: string; scene: (c: Ctx) => Scene; note: string }> = {
  wood: {
    say: '걷고, 배우고, 키우는 거야!',
    line2: '배우고 키우고 걷는 습관이 운을 연다',
    scene: (c) => ({ bg: 'park', actors: [c.me(200, 'grin', 'wave', { fx: ['sparkle'] }), c.other('friend', 420, 'smile', 'idle', { dir: -1 })], lines: [say(0, '아침 산책 30분, 오늘도 성공!'), say(1, '요즘 얼굴 좋아 보인다?')] }),
    note: '목(木) 기운은 성장과 시작의 힘입니다. 아침 시간에 새로 배우고, 식물을 키우고, 숲길을 걷는 습관이 부족한 기운을 채워 줍니다.',
  },
  fire: {
    say: '햇빛, 사람, 땀! 밖으로 나가!',
    line2: '햇빛·사람·땀 흘리는 운동이 기운을 뚫는다',
    scene: (c) => ({ bg: 'street', actors: [c.me(200, 'laugh', 'cheer', { fx: ['sparkle'] }), c.other('friend', 420, 'grin', 'wave', { dir: -1 })], lines: [say(0, '햇빛 보고 사람 만나니까 살 것 같아!'), say(1, '그치? 자주 나오자!')] }),
    note: '화(火) 기운은 열정과 표현의 힘입니다. 햇빛을 충분히 쬐고, 사람을 만나 이야기하고, 땀이 날 만큼 움직이는 습관이 도움이 됩니다.',
  },
  earth: {
    say: '같은 시간에 먹고, 자고, 약속 지키기!',
    line2: '규칙적인 생활과 약속이 중심을 잡아 준다',
    scene: (c) => ({ bg: 'home', actors: [c.me(260, 'smile', 'hold', { held: 'notebook' })], lines: [say(0, '같은 시간에 자고, 같은 시간에 먹기!')], props: [{ kind: 'calendar', x: 470, y: 150 }] }),
    note: '토(土) 기운은 중심과 안정의 힘입니다. 먹고 자는 시간을 일정하게 지키고, 약속과 신용을 지키는 습관이 흔들리는 기운을 잡아 줍니다.',
  },
  metal: {
    say: '덜어 내고 정리하는 거야!',
    line2: '덜어 내고 정리할 때 운이 선명해진다',
    scene: (c) => ({ bg: 'home', actors: [c.me(220, 'proud', 'shrug', { fx: ['sparkle'] })], lines: [say(0, '안 쓰는 건 싹 정리! 머리가 맑아졌어.')], props: [{ kind: 'boxes', x: 450 }] }),
    note: '금(金) 기운은 결단과 정리의 힘입니다. 주변의 물건과 관계를 덜어 내고, 스스로 규칙을 세우는 습관이 흐트러진 기운을 모아 줍니다.',
  },
  water: {
    say: '푹 자고, 혼자 생각하는 시간!',
    line2: '충분한 잠과 혼자 생각하는 시간이 답이다',
    scene: (c) => ({ bg: 'bedroom', actors: [c.me(250, 'calm', 'hold', { held: 'notebook', fx: ['zzz'] })], lines: [say(0, '오늘 생각 정리 끝. 푹 자자.')] }),
    note: '수(水) 기운은 휴식과 지혜의 힘입니다. 충분히 자고 쉬며, 혼자 생각하고 기록하는 시간을 따로 두는 습관이 과열된 기운을 식혀 줍니다.',
  },
};

function dominantOf(a: SajuAnalysis, g: TenGodGroup): TenGod | null {
  const tgc = a.elements.tenGodCount;
  const tgh = a.elements.tenGodHidden;
  const list = (Object.keys(tgc) as TenGod[]).filter((t) => groupOf(t) === g && tgc[t] + tgh[t] > 0);
  if (!list.length) return null;
  return list.sort((x, y) => tgc[y] + tgh[y] * 0.3 - (tgc[x] + tgh[x] * 0.3))[0];
}

export function dmLabel(a: SajuAnalysis): string {
  const s = STEMS[a.pillars.day.stem];
  return `${s.ko}${ELEMENT_KO[s.element]}(${s.hanja}${ELEMENT_HANJA[s.element]})`;
}

export function personaEpisode(a: SajuAnalysis, x: CrossReport | null): Comic {
  const c = makeCtx(a, x, 'persona');
  const ds = a.pillars.day.stem;
  const D = DM[ds];
  const dm = dmLabel(a);
  const gp = a.elements.groupPercent;
  const ys = a.yongsin.yongsin;
  const month = a.positions.find((p) => p.pos === 'month')!;
  const day = a.positions.find((p) => p.pos === 'day')!;
  const outerTg = month.stemTenGod === '일간' ? '비견' : month.stemTenGod;
  const O = OUTER[outerTg];
  const I = INNER[day.branchTenGod];
  const beats: Beat[] = [];

  // 표지
  beats.push(
    cut(c, '표지', '', { bg: 'home', actors: [c.me(410, D.cover[0], D.cover[1], { dir: -1, held: D.cover[1] === 'hold' ? 'cake' : undefined })], lines: [] }, { cover: { kicker: '1화', title: '나라는 사람', tagline: `${dm} — ${D.tag}` } }),
  );
  beats.push(text(`내 사주의 주인공 글자, 일간은 ${dm}.\n${D.image}처럼 — 그게 나다.`, 'plain', { title: '일간', note: '일간(태어난 날의 천간)은 사주에서 “나 자신”을 뜻하는 글자입니다. 성격의 바탕을 가장 크게 좌우합니다.', basis: `${pillarHanja(a.pillars.day)}일주` }));

  // 1. 타고난 기질
  beats.push(cut(c, '타고난 기질', `나는 ${dm}. ${D.image}다.\n${D.trait}.`, D.scene(c), { basis: `일간 ${STEMS[ds].hanja} · ${pillarHanja(a.pillars.day)}일주`, note: D.note, tone: 'neutral' }));

  // 2. 겉 — 남들이 보는 나
  const outerScene = {
    bg: c.young ? 'school' : 'cafe',
    ...shot('bust'),
    actors: [c.other('friend', 160, 'smile', 'idle'), c.me(440, O.face, O.face === 'shock' ? 'mouth' : O.face === 'proud' ? 'hips' : 'idle', { dir: -1 })],
    lines: [say(0, hey(c, c.young && O.young ? O.young : O.other)), say(1, O.me)],
  } satisfies Scene;
  beats.push(
    cut(c, '남들이 보는 나', `사람들 눈에 비친 나는\n‘${O.tag}’.`, outerScene, {
      basis: `월간 ${STEMS[month.pillar.stem].hanja}(${outerTg}) · 사회에서 보이는 얼굴`,
      note: `태어난 달의 천간(월간)은 사회에서 드러나는 얼굴입니다. 이 자리에 ${outerTg}이 있어 밖에서는 ‘${O.tag}’으로 보이기 쉽습니다.`,
    }),
  );

  // 3. 속 — 속마음
  beats.push(
    cut(c, '속마음', '하지만 속마음은 조금 다르다.', { bg: 'bedroom', ...shot('close', I.mood), actors: [c.me(230, I.face, 'idle', { dir: 1 })], lines: [think(0, I.line)] }, {
      basis: `일지 ${pillarHanja(a.pillars.day).slice(1)}(${day.branchTenGod}) · 속마음의 자리`,
      note: `태어난 날의 지지(일지)는 가장 가까운 사람에게만 보이는 속마음의 자리입니다. 이 자리의 ${day.branchTenGod}은 ‘${I.tag}’을 뜻합니다. 겉(${outerTg})과 속(${day.branchTenGod})이 다를수록 남들이 모르는 피로가 쌓입니다.`,
    }),
  );

  // 4. 타고난 무기
  const top = topGroups(a)[0];
  const S = STRONG[top];
  const dom = dominantOf(a, top);
  beats.push(text('그리고 나에게는 타고난 무기가 하나 있다.', 'soft'));
  beats.push(
    cut(c, '타고난 무기', `가장 강한 기운은 ${top}(${pct(gp[top])})\n${S.line2}`, S.scene(c), {
      basis: `${top} ${pct(gp[top])}${dom ? ` · 중심 십성 ${dom}` : ''}`,
      note: `${S.note}${dom ? ` ${DOMINANT_NOTE[dom]}` : ''}`,
      tone: 'good',
    }),
  );
  beats.push(cut(c, '무기의 반응', '', S.react(c)));

  // 5. 솔직한 약점
  const weak = WEAKNESS.find((w) => w.test(a));
  const W = weak ?? { ...DM_SHADOW[ds], basis: () => `일간 ${STEMS[ds].hanja}의 그림자` };
  beats.push(text('하지만… 솔직히 말하면,\n나에게도 약점은 있다.', 'dark'));
  beats.push(cut(c, '솔직한 약점', `솔직히 말하면…\n${W.line2}`, W.scene(c), { basis: W.basis(a), note: W.note, tone: 'bad' }));
  beats.push(cut(c, '약점 뒤의 마음', '', { bg: 'night', ...shot('close', W.after.mood), actors: [c.me(380, W.after.face, 'idle', { dir: -1 })], lines: [think(0, W.after.line)] }));

  // 6. 명경이의 처방
  const Y = YONGSIN[ys];
  const el = `${EL_WORD[ys]}(${ELEMENT_HANJA[ys]})`;
  beats.push(
    cut(c, '명경이 등장', '그때, 방 안의 거울이 반짝였다.', { bg: 'home', ...shot('bust', 'sparkle'), actors: [c.me(180, 'surprised', 'mouth'), c.mirror(450, 'grin', { dir: -1 })], lines: [say(1, '안녕! 나는 네 사주를 비추는 거울, 명경이야.'), say(0, '거울이… 말을 한다고?!', 'shout')] }),
  );
  beats.push(
    cut(c, '필요한 기운', `용신 — 사주의 균형을 잡아 주는 기운.\n나에게 필요한 건 ${el}의 기운이다.`, { bg: 'home', ...shot('bust', 'soft'), actors: [c.mirror(150, 'smile'), c.me(430, 'thinking', 'think', { dir: -1 })], lines: [say(0, `${hey(c, `너한테 필요한 건 ${el} 기운!`)}`), say(0, Y.say)] }, {
      basis: `용신 ${ELEMENT_KO[ys]}(${ELEMENT_HANJA[ys]}) · ${a.yongsin.method}`,
      note: `용신은 사주의 치우친 기운을 바로잡아 주는 오행입니다. ${c.who}의 사주는 ${a.strength.level}이고, ${a.yongsin.method}의 방법으로 ${ELEMENT_KO[ys]}(${ELEMENT_HANJA[ys]})을 용신으로 봅니다.`,
    }),
  );
  beats.push(cut(c, '나에게 맞는 처방', `처방: ${Y.line2}`, Y.scene(c), { note: Y.note, tone: 'good' }));

  // 마무리
  const headline = x?.card.headline ?? D.tag;
  beats.push(
    cut(c, '마무리', `그래서 나는 — ${headline}.`, { bg: 'home', ...shot('bust', 'sparkle'), actors: [c.me(300, 'grin', 'fighting', { front: true })], lines: [say(0, '이게 바로 나야!')] }, {
      note: x ? '마지막 한 줄은 사주·운·MBTI·직업을 교차 검증한 ‘정체성 한 줄’에서 가져왔습니다.' : '마지막 한 줄은 일간의 기질을 요약한 것입니다.',
    }),
  );

  return {
    id: 'persona',
    no: 1,
    title: '나라는 사람',
    subtitle: `${pillarHanja(a.pillars.day)}일주 · ${a.strength.level} · 용신 ${ELEMENT_KO[ys]}(${ELEMENT_HANJA[ys]})`,
    beats,
  };
}
