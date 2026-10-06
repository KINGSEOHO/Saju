/**
 * 인생 웹툰 대본 — 사주 분석 결과로 장면을 고른다.
 *
 * 원칙
 *  - 모든 컷은 사주 구조에서 나온다. 컷마다 근거(basis)를 찍고, 아래 해설(note)로 이유를 설명한다.
 *  - 좋은 장면만 고르지 않는다. 4컷의 세 번째 컷은 언제나 '솔직한 약점'이다.
 *  - 인생 6컷의 각 시기는 이야기형 풀이(인생 연대기)와 같은 기준(대운 십성·점수)으로 고른다.
 */
import { ELEMENT_HANJA, ELEMENT_KO, STEMS, pillarHanja, type Element, type SajuAnalysis, type TenGod, type TenGodGroup } from '../engine/index.ts';
import { groupOf } from '../engine/tenGods.ts';
import { lifeShape, wealthCapacity } from '../report/metrics.ts';
import { DECADE_THEME, GENDER_NOTE, STAGE_SCENE, flagText, lifeStage, toneText, type LifeStage } from '../report/storyKb.ts';
import type { Actor, Age, Bg, Comic, Face, Line, Panel, PanelTone, Pose, PropSpec, Role } from './types.ts';

/** 주인공 옷 색 = 일간 오행 */
export const OUTFIT: Record<Element, string> = { wood: '#5aa469', fire: '#e8615a', earth: '#e7b04a', metal: '#8e9ab3', water: '#4a86d0' };

const GROUPS: TenGodGroup[] = ['비겁', '식상', '재성', '관성', '인성'];
const pct = (n: number) => `${n.toFixed(0)}%`;

interface Ctx {
  a: SajuAnalysis;
  name: string;
  male: boolean;
  age: Age;
  me: (x: number, face: Face, pose: Pose, extra?: Partial<Actor>) => Actor;
  other: (role: Role, x: number, face: Face, pose: Pose, extra?: Partial<Actor>) => Actor;
}

function makeCtx(a: SajuAnalysis): Ctx {
  const male = a.input.gender === 'male';
  const age: Age = a.age < 13 ? 'kid' : a.age < 20 ? 'teen' : a.age >= 65 ? 'senior' : 'adult';
  const ds = a.pillars.day.stem;
  const outfit = OUTFIT[STEMS[ds].element];
  const genderOf = (role: Role): 'male' | 'female' => {
    switch (role) {
      case 'partner':
      case 'child':
        return male ? 'female' : 'male';
      case 'friend':
      case 'elder':
        return male ? 'male' : 'female';
      case 'parent':
        return 'female';
      default:
        return ds % 2 === 0 ? 'male' : 'female';
    }
  };
  return {
    a,
    name: a.input.name?.trim() ?? '',
    male,
    age,
    me: (x, face, pose, extra = {}) => ({ role: 'me', x, face, pose, gender: male ? 'male' : 'female', outfit, age, ...extra }),
    other: (role, x, face, pose, extra = {}) => ({
      role,
      x,
      face,
      pose,
      gender: genderOf(role),
      age: role === 'child' ? 'kid' : role === 'elder' ? 'senior' : 'adult',
      ...extra,
    }),
  };
}

type Scene = Pick<Panel, 'bg' | 'actors' | 'lines'> & { props?: PropSpec[] };
const say = (by: number, text: string, kind: Line['kind'] = 'say', alt?: Line['alt']): Line => ({ by, text, kind, alt });

// ---------------------------------------------------------------------------
// 4컷 — 나는 이런 사람
// ---------------------------------------------------------------------------

/** 1컷: 일간(나를 뜻하는 글자)의 기질 */
const DM_PANEL: Record<number, (c: Ctx) => Scene & { caption: string; note: string }> = {
  0: (c) => ({
    bg: 'park',
    caption: '갑목(甲木) — 하늘로 곧게 뻗는 큰 나무.\n방향이 정해지면 일단 직진한다.',
    actors: [c.me(200, 'determined', 'point'), c.other('friend', 430, 'surprised', 'idle', { dir: -1 })],
    lines: [say(0, '여행 코스는 내가 다 짜 왔어. 따라와!'), say(1, '벌써?!', 'shout')],
    note: '갑목은 스스로 방향을 정하고 앞장서는 기질입니다. 모임에서 자연스럽게 결정을 맡게 되는 일이 많습니다.',
  }),
  1: (c) => ({
    bg: 'cafe',
    caption: '을목(乙木) — 휘어도 꺾이지 않는 덩굴.\n분위기를 읽고 사람 사이를 잇는다.',
    actors: [c.other('friend', 190, 'laugh', 'idle'), c.me(420, 'smile', 'hold', { held: 'coffee', dir: -1 })],
    lines: [say(0, '너랑 있으면 진짜 편해~'), say(1, '(사실 눈치 엄청 보는 중)', 'think')],
    note: '을목은 상대에게 맞추는 능력이 뛰어나지만, 그만큼 속으로 신경을 많이 쓰는 기질입니다.',
  }),
  2: (c) => ({
    bg: 'stage',
    caption: '병화(丙火) — 하늘 한가운데 뜬 태양.\n숨김없이 밝고, 사람들 앞에서 힘이 난다.',
    actors: [c.me(300, 'grin', 'hold', { held: 'mic', fx: ['sparkle'] })],
    lines: [say(0, '자, 오늘 다들 신나게 놀아요!', 'shout')],
    note: '병화는 감정과 생각이 그대로 드러나고, 주목받는 자리에서 에너지가 오르는 기질입니다.',
  }),
  3: (c) => ({
    bg: 'night',
    caption: '정화(丁火) — 어둠을 밝히는 촛불.\n겉은 차분해도 한 사람을 깊이 챙긴다.',
    actors: [c.other('friend', 190, 'cry', 'idle'), c.me(420, 'smile', 'hold', { held: 'coffee', dir: -1 })],
    lines: [say(0, '나 오늘 진짜 힘들었어…'), say(1, '얘기해 봐. 끝까지 들을게.')],
    note: '정화는 넓게 비추기보다 가까운 사람을 따뜻하게 지키는 기질입니다. 대신 한번 서운하면 오래 기억합니다.',
  }),
  4: (c) => ({
    bg: 'mountain',
    caption: '무토(戊土) — 묵직한 큰 산.\n쉽게 흔들리지 않아 모두가 기댄다.',
    actors: [c.other('friend', 190, 'shock', 'cheeks'), c.me(420, 'neutral', 'cross', { dir: -1 })],
    lines: [say(0, '큰일 났어! 어떡해?!', 'shout'), say(1, '괜찮아. 하나씩 하면 돼.')],
    note: '무토는 위기에도 표정이 크게 흔들리지 않아 주변의 기둥이 되는 기질입니다. 대신 변화에는 느린 편입니다.',
  }),
  5: (c) => ({
    bg: 'home',
    caption: '기토(己土) — 곡식을 길러 내는 밭.\n사람을 먹이고 챙기며 실속을 지킨다.',
    actors: [c.me(190, 'smile', 'hold', { held: 'cake' }), c.other('friend', 420, 'love', 'idle', { dir: -1 })],
    lines: [say(0, '밥은 먹었어? 이거 먹어.'), say(1, '엄마…?')],
    note: '기토는 주변 사람을 세심하게 챙기고 길러 내는 기질입니다. 대신 걱정이 많고 속마음을 잘 드러내지 않습니다.',
  }),
  6: (c) => ({
    bg: 'office',
    caption: '경금(庚金) — 단련될수록 강해지는 쇠.\n결단이 빠르고 할 말은 한다.',
    actors: [c.me(190, 'determined', 'point'), c.other('coworker', 420, 'surprised', 'hold', { held: 'document', dir: -1 })],
    lines: [say(0, '결론부터 말할게요.', 'say', { young: '결론부터 말할게.' }), say(1, '(회의 시작 1분 만에…?)', 'think', { young: '(조별 과제 회의 1분 만에…?)' })],
    note: '경금은 판단이 빠르고 원칙이 분명한 기질입니다. 돌려 말하지 않아 신뢰를 얻지만, 말이 날카롭게 들릴 때가 있습니다.',
  }),
  7: (c) => ({
    bg: 'office',
    caption: '신금(辛金) — 정교하게 다듬어진 보석.\n감각이 예리하고 디테일을 놓치지 않는다.',
    actors: [c.me(190, 'thinking', 'hold', { held: 'document' }), c.other('coworker', 420, 'nervous', 'idle', { dir: -1 })],
    lines: [say(0, '여기 글자 간격, 1픽셀 틀렸어요.', 'say', { young: '여기 글자 간격, 1픽셀 틀렸어.' }), say(1, '그게… 보여요?', 'say', { young: '그게… 보여?' })],
    note: '신금은 섬세한 감각과 높은 기준을 가진 기질입니다. 완성도가 높지만 스스로와 남에게 엄격해지기 쉽습니다.',
  }),
  8: (c) => ({
    bg: 'sea',
    caption: '임수(壬水) — 끝없이 흐르는 큰 바다.\n생각의 스케일이 크고 자유롭다.',
    actors: [c.me(190, 'grin', 'cheer'), c.other('friend', 420, 'surprised', 'idle', { dir: -1 })],
    lines: [say(0, '이번엔 세계 일주 어때?'), say(1, '지난주엔 창업한다며?!', 'shout', { young: '지난주엔 유튜버 한다며?!' })],
    note: '임수는 아이디어와 활동 범위가 넓은 기질입니다. 시야가 크지만 한곳에 오래 머무르기 어려워합니다.',
  }),
  9: (c) => ({
    bg: 'rain',
    caption: '계수(癸水) — 조용히 스며드는 빗물.\n말수는 적어도 사람 속을 꿰뚫어 본다.',
    actors: [c.other('friend', 190, 'surprised', 'idle'), c.me(420, 'smile', 'wave', { held: 'umbrella', dir: -1 })],
    lines: [say(0, '어떻게 알았어? 나 말 안 했는데.'), say(1, '그냥… 표정이 그랬어.')],
    note: '계수는 직관과 공감 능력이 뛰어난 기질입니다. 대신 생각이 많아 혼자 걱정을 키우기 쉽습니다.',
  }),
};

/** 2컷: 가장 강한 십성 그룹 = 타고난 무기 */
const STRONG_PANEL: Record<TenGodGroup, (c: Ctx) => Scene & { line2: string; note: string }> = {
  비겁: (c) => ({
    bg: 'gym',
    line2: '자존심과 자립심이 엔진이다',
    actors: [c.me(260, 'determined', 'fighting', { fx: ['flame'] })],
    lines: [say(0, '남한테 기대긴 싫어. 내 힘으로 해낸다!')],
    props: [{ kind: 'dumbbell', x: 470 }],
    note: '비겁이 강하면 스스로 해내려는 힘과 경쟁심이 큽니다. 독립·창업에 유리하지만 고집과 지출도 함께 커집니다.',
  }),
  식상: (c) => ({
    bg: 'cafe',
    line2: '재능과 말솜씨로 나를 드러낸다',
    actors: [c.me(200, 'grin', 'cheer', { fx: ['bulb'] }), c.other('friend', 430, 'tired', 'idle', { dir: -1 })],
    lines: [say(0, '방금 엄청난 아이디어가 떠올랐어!'), say(1, '오늘만 세 번째야.')],
    note: '식상이 강하면 아이디어와 표현력이 넘칩니다. 만들고 말하는 일에서 빛나지만 마무리가 약해지기 쉽습니다.',
  }),
  재성: (c) => ({
    bg: 'money',
    line2: '돈과 기회를 알아보는 현실 감각',
    actors: [c.me(220, 'proud', 'hold', { held: 'money', fx: ['sparkle'] })],
    lines: [say(0, '이건 돈 되겠는데?')],
    props: [
      { kind: 'chartUp', x: 450, y: 196 },
      { kind: 'coins', x: 460 },
    ],
    note: '재성이 강하면 돈의 흐름과 현실 감각이 빠릅니다. 기회를 잘 잡지만, 욕심이 앞서면 무리한 투자를 하기 쉽습니다.',
  }),
  관성: (c) => ({
    bg: 'office',
    line2: '책임감과 원칙으로 인정받는다',
    actors: [c.me(190, 'proud', 'hold', { held: 'trophy' }), c.other('boss', 420, 'smile', 'idle', { dir: -1 })],
    lines: [say(1, '역시 믿고 맡길 사람은 자네야.', 'say', { young: '역시 믿고 맡길 사람은 너야.' }), say(0, '맡은 일은 끝까지 합니다!', 'say', { young: '맡은 일은 끝까지 할게요!' })],
    note: '관성이 강하면 책임감과 규범 의식이 뚜렷해 조직에서 인정받기 쉽습니다. 대신 압박과 스트레스도 크게 받습니다.',
  }),
  인성: (c) => ({
    bg: 'library',
    line2: '배우고 생각하며 내공을 쌓는다',
    actors: [c.me(250, 'thinking', 'hold', { held: 'book' })],
    lines: [say(0, '이건 제대로 알고 시작해야지.')],
    props: [{ kind: 'books', x: 450 }],
    note: '인성이 강하면 배우고 이해하는 힘이 큽니다. 자격·전문성으로 인정받지만 생각이 많아 실행이 늦어지기 쉽습니다.',
  }),
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

interface Weakness {
  test: (a: SajuAnalysis) => boolean;
  scene: (c: Ctx) => Scene & { line2: string; note: string; basis: string };
}

/** 3컷: 솔직한 약점 — 위에서부터 먼저 해당하는 것 하나 */
const WEAKNESS: Weakness[] = [
  {
    test: (a) => a.elements.tenGodCount['상관'] > 0 && a.elements.tenGodCount['정관'] > 0,
    scene: (c) => ({
      bg: 'office',
      line2: '옳은 말도 윗사람 앞에서 참지 못한다',
      actors: [c.me(190, 'angry', 'point', { fx: ['anger'] }), c.other('boss', 420, 'angry', 'cross', { dir: -1 })],
      lines: [say(0, '그 방식은 틀렸다고 생각합니다!', 'shout', { young: '선생님, 그건 틀린 것 같아요!' }), say(1, '…자네, 지금 뭐라고 했나?', 'say', { young: '…너, 지금 뭐라고 했니?' })],
      basis: `상관 ${c.a.elements.tenGodCount['상관']}개 · 정관 ${c.a.elements.tenGodCount['정관']}개 (상관견관)`,
      note: '상관과 정관이 함께 있으면 재능과 비판 정신이 규칙·윗사람과 부딪히기 쉽습니다. 말의 내용보다 “때와 방식”을 고르는 것이 손해를 줄이는 방법입니다.',
    }),
  },
  {
    test: (a) => wealthCapacity(a) === '작음',
    scene: (c) => ({
      bg: 'home',
      line2: '돈을 붙잡아 두는 힘이 약하다',
      actors: [c.me(300, 'shock', 'hold', { held: 'wallet', fx: ['gloom'] })],
      lines: [say(0, '월급날이 엊그제였는데… 다 어디 갔지?', 'say', { young: '용돈 받은 지 사흘 만에… 다 어디 갔지?', senior: '연금 들어온 지 며칠 됐다고… 다 어디 갔지?' })],
      basis: `재성 ${pct(c.a.elements.groupPercent['재성'])}`,
      note: '재성이 약하면 돈에 대한 감각이 무디고 새는 돈을 알아차리기 어렵습니다. 의지보다 자동이체·통장 쪼개기 같은 구조가 효과적입니다.',
    }),
  },
  {
    test: (a) => wealthCapacity(a) === '부담',
    scene: (c) => ({
      bg: 'money',
      line2: '돈과 일이 내 힘보다 크다',
      actors: [c.me(230, 'tired', 'hold', { held: 'money', fx: ['sweat'] })],
      lines: [say(0, '벌긴 버는데… 왜 이렇게 힘들지?', 'say', { young: '하고 싶은 건 많은데… 왜 이렇게 벅차지?' })],
      props: [
        { kind: 'moneyBag', x: 440 },
        { kind: 'coins', x: 520 },
      ],
      basis: `신약 ${pct(c.a.strength.score)} · 재성 ${pct(c.a.elements.groupPercent['재성'])} (재다신약)`,
      note: '재물의 기운은 많은데 나를 돕는 힘이 약한 구조(재다신약)입니다. 기회는 많아도 감당할 체력과 사람이 부족하면 손에 쥐는 것이 적습니다. 욕심을 줄이고 함께할 사람을 구하세요.',
    }),
  },
  {
    test: (a) => a.elements.groupPercent['비겁'] >= 30,
    scene: (c) => ({
      bg: 'cafe',
      line2: '사람 때문에 돈이 새기 쉽다',
      actors: [c.other('friend', 190, 'nervous', 'cheeks'), c.me(420, 'nervous', 'idle', { dir: -1 })],
      lines: [say(0, '이번 달만… 조금만 빌려줄 수 있어?'), say(1, '(이번이 몇 번째더라…)', 'think')],
      basis: `비겁 ${pct(c.a.elements.groupPercent['비겁'])}`,
      note: '비겁이 많으면 의리가 강하고 사람을 잘 챙기지만, 나눠 가질 사람도 많아 돈이 모이기 어렵습니다. 빌려줄 돈은 “돌려받지 못해도 괜찮은 만큼”만 정하세요.',
    }),
  },
  {
    test: (a) => a.elements.groupPercent['관성'] >= 35,
    scene: (c) => ({
      bg: 'officeNight',
      line2: '책임과 압박을 혼자 짊어진다',
      actors: [c.me(230, 'tired', 'facepalm', { fx: ['cloud'] })],
      lines: [say(0, '다 내 책임 같아… 숨 좀 쉬자.', 'think')],
      props: [
        { kind: 'desk', x: 300 },
        { kind: 'papers', x: 352 },
      ],
      basis: `관성 ${pct(c.a.elements.groupPercent['관성'])}`,
      note: '관성이 많으면 책임감이 강한 만큼 스트레스를 몸으로 받기 쉽습니다. 일을 나누는 연습과 퇴근 후의 확실한 휴식이 필요합니다.',
    }),
  },
  {
    test: (a) => a.elements.groupPercent['인성'] >= 35,
    scene: (c) => ({
      bg: 'bedroom',
      line2: '생각이 많아 실행이 늦다',
      actors: [c.me(250, 'worried', 'think', { fx: ['question'] })],
      lines: [say(0, '준비가 덜 된 것 같아. 다음 달에 시작할까…', 'think')],
      basis: `인성 ${pct(c.a.elements.groupPercent['인성'])}`,
      note: '인성이 많으면 신중하고 배우는 힘이 크지만, 준비만 하다 기회를 놓치기 쉽습니다. “70% 준비되면 시작”을 원칙으로 삼으세요.',
    }),
  },
  {
    test: (a) => a.elements.groupPercent['식상'] >= 35,
    scene: (c) => ({
      bg: 'cafe',
      line2: '벌여 놓은 일은 많은데 마무리가 약하다',
      actors: [c.me(190, 'grin', 'shrug'), c.other('friend', 420, 'tired', 'cross', { dir: -1 })],
      lines: [say(0, '이것도 하고, 저것도 하고!'), say(1, '지난번에 시작한 건 끝냈어?')],
      basis: `식상 ${pct(c.a.elements.groupPercent['식상'])}`,
      note: '식상이 많으면 재능과 아이디어가 넘치지만 에너지가 흩어지기 쉽고, 말이 앞서 구설도 생깁니다. 동시에 진행하는 일을 두세 개로 제한하세요.',
    }),
  },
  {
    test: (a) => a.elements.groupPercent['관성'] < 4,
    scene: (c) => ({
      bg: 'office',
      line2: '규칙과 통제를 유독 못 견딘다',
      actors: [c.other('boss', 190, 'angry', 'point'), c.me(420, 'tired', 'idle', { dir: -1, fx: ['sweat'] })],
      lines: [say(0, '출근은 9시까지라고 했지?', 'say', { young: '등교는 8시 반까지라고 했지?' }), say(1, '(규칙… 너무 답답해)', 'think')],
      basis: `관성 ${pct(c.a.elements.groupPercent['관성'])}`,
      note: '관성이 거의 없으면 자유롭고 독립적이지만, 정해진 규칙과 상하 관계를 견디기 어렵습니다. 스스로 정한 마감과 루틴이 그 빈자리를 채워 줍니다.',
    }),
  },
  {
    test: (a) => a.elements.groupPercent['인성'] < 4,
    scene: (c) => ({
      bg: 'officeNight',
      line2: '쉬어 갈 줄 모르고 달린다',
      actors: [c.me(300, 'tired', 'fighting', { fx: ['sweat'] })],
      lines: [say(0, '쉬면 뒤처질 것 같아. 계속 달려!')],
      basis: `인성 ${pct(c.a.elements.groupPercent['인성'])}`,
      note: '인성이 거의 없으면 배우고 쉬는 데 서툴러, 에너지를 채우지 못한 채 쓰기만 하기 쉽습니다. 일정에 “쉬는 시간”을 먼저 넣으세요.',
    }),
  },
  {
    test: (a) => a.elements.groupPercent['식상'] < 4,
    scene: (c) => ({
      bg: 'cafe',
      line2: '속마음을 말하지 못해 오해가 쌓인다',
      actors: [c.other('friend', 190, 'sad', 'idle'), c.me(420, 'nervous', 'idle', { dir: -1 })],
      lines: [say(0, '서운했으면 그때 말을 하지 그랬어.'), say(1, '…말하기가 좀 그래서.')],
      basis: `식상 ${pct(c.a.elements.groupPercent['식상'])}`,
      note: '식상이 거의 없으면 실력이 있어도 드러내지 못하고, 감정을 표현하지 못해 관계가 오해로 꼬이기 쉽습니다. 작게라도 말로 꺼내는 연습이 필요합니다.',
    }),
  },
  {
    test: (a) => a.elements.groupPercent['비겁'] < 4,
    scene: (c) => ({
      bg: 'city',
      line2: '주관을 지키는 힘이 약하다',
      actors: [c.other('friend', 150, 'grin', 'point'), c.other('coworker', 300, 'grin', 'idle'), c.me(460, 'worried', 'idle', { dir: -1 })],
      lines: [say(0, '다들 이걸로 하자는데?'), say(2, '(나는 아닌데… 그냥 따라가자)', 'think')],
      basis: `비겁 ${pct(c.a.elements.groupPercent['비겁'])}`,
      note: '비겁이 거의 없으면 협조적이지만 내 몫과 내 의견을 지키는 힘이 약합니다. 중요한 결정은 하루 미루고 혼자 생각해 보는 습관이 도움이 됩니다.',
    }),
  },
];

/** 해당하는 약점이 없을 때: 일간의 그림자 */
const DM_SHADOW: Record<number, (c: Ctx) => Scene & { line2: string; note: string }> = {
  0: (c) => ({
    bg: 'home',
    line2: '자존심 때문에 먼저 굽히지 못한다',
    actors: [c.other('friend', 190, 'sad', 'idle'), c.me(420, 'angry', 'cross', { dir: -1 })],
    lines: [say(0, '그냥 미안하다고 하면 되잖아.'), say(1, '(내가 왜 먼저…?)', 'think')],
    note: '갑목의 곧은 기질은 자존심이 걸린 순간 고집이 됩니다. 관계를 지키는 쪽은 결국 먼저 손을 내미는 사람입니다.',
  }),
  1: (c) => ({
    bg: 'office',
    line2: '거절을 못 해 남의 일까지 떠안는다',
    actors: [c.other('coworker', 190, 'smile', 'hold', { held: 'document' }), c.me(420, 'nervous', 'idle', { dir: -1 })],
    lines: [say(0, '이것도 좀 부탁해도 될까?'), say(1, '아… 네, 할게요.', 'say', { young: '아… 응, 할게.' })],
    note: '을목은 맞춰 주는 능력이 큰 만큼 거절이 어렵습니다. 속으로 쌓인 서운함이 한 번에 터지기 전에, 작은 거절부터 연습하세요.',
  }),
  2: (c) => ({
    bg: 'office',
    line2: '시작은 뜨겁지만 뒷심이 약하다',
    actors: [c.me(190, 'grin', 'cheer'), c.other('coworker', 420, 'tired', 'idle', { dir: -1 })],
    lines: [say(0, '이 프로젝트, 내가 해 볼게!', 'say', { young: '이 발표, 내가 해 볼게!' }), say(1, '지난번 것도 아직인데…')],
    note: '병화는 시작하는 힘이 누구보다 크지만, 반복되는 일에서 금방 흥미를 잃습니다. 마무리를 맡아 줄 꼼꼼한 파트너가 필요합니다.',
  }),
  3: (c) => ({
    bg: 'night',
    line2: '상처를 오래 기억하고 혼자 삭인다',
    actors: [c.me(300, 'sad', 'idle', { fx: ['gloom'] })],
    lines: [say(0, '그때 그 말… 아직도 서운해.', 'think')],
    note: '정화는 마음이 깊은 만큼 서운함도 오래갑니다. 혼자 삭이다 한 번에 터지기 전에, 그때그때 짧게 말하는 편이 관계를 지킵니다.',
  }),
  4: (c) => ({
    bg: 'crossroad',
    line2: '변화를 미루다 타이밍을 놓친다',
    actors: [c.me(200, 'thinking', 'cross')],
    lines: [say(0, '바꾸는 건… 다음에 생각하자.', 'think')],
    props: [{ kind: 'signpost', x: 440, label: '그대로', label2: '변화' }],
    note: '무토의 묵직함은 안정감을 주지만, 바꿔야 할 때도 버티게 만듭니다. 결정을 미루는 것도 하나의 선택이라는 점을 기억하세요.',
  }),
  5: (c) => ({
    bg: 'bedroom',
    line2: '걱정과 생각이 많아 혼자 마음고생',
    actors: [c.me(250, 'worried', 'think', { fx: ['question'] })],
    lines: [say(0, '내가 괜히 그 말을 했나…?', 'think')],
    note: '기토는 세심한 만큼 걱정이 많습니다. 머릿속에서 돌리는 대신 종이에 적어 보면 생각보다 별일 아닌 경우가 많습니다.',
  }),
  6: (c) => ({
    bg: 'office',
    line2: '맞는 말을 너무 날카롭게 한다',
    actors: [c.me(190, 'neutral', 'cross'), c.other('coworker', 420, 'cry', 'idle', { dir: -1 })],
    lines: [say(0, '틀린 걸 틀렸다고 한 것뿐인데?'), say(1, '말을 꼭 그렇게 해야 돼요?', 'say', { young: '말을 꼭 그렇게 해야 돼?' })],
    note: '경금의 직설은 신뢰를 주지만, 같은 말도 날이 서면 사람을 잃습니다. 결론 앞에 한 문장의 배려를 붙여 보세요.',
  }),
  7: (c) => ({
    bg: 'home',
    line2: '기준이 높아 스스로를 지치게 만든다',
    actors: [c.me(300, 'tired', 'facepalm')],
    lines: [say(0, '이것도 별로, 저것도 별로… 다시 해야 해.', 'think')],
    note: '신금의 높은 기준은 완성도를 만들지만, 끝없이 고치다 지치기 쉽습니다. “여기까지면 충분하다”는 선을 미리 정해 두세요.',
  }),
  8: (c) => ({
    bg: 'home',
    line2: '관심사가 자주 바뀌어 뿌리내리기 어렵다',
    actors: [c.me(230, 'nervous', 'shrug')],
    lines: [say(0, '이번 것도… 조금 하다 말았네.')],
    props: [{ kind: 'boxes', x: 450 }],
    note: '임수는 흐르는 물처럼 새로운 곳을 향하지만, 한곳에 머물러야 쌓이는 것들을 놓치기 쉽습니다. 하나만은 끝까지 해 보는 경험이 필요합니다.',
  }),
  9: (c) => ({
    bg: 'rain',
    line2: '생각이 꼬리를 물어 불안을 키운다',
    actors: [c.me(300, 'worried', 'idle', { fx: ['gloom'] })],
    lines: [say(0, '혹시 나 때문인가…', 'think')],
    note: '계수는 예민한 직관 덕분에 남의 마음을 잘 읽지만, 그만큼 걱정도 잘 만듭니다. 확인되지 않은 걱정은 일단 내려놓는 연습이 필요합니다.',
  }),
};

/** 4컷: 용신 처방 */
const YONGSIN_PANEL: Record<Element, (c: Ctx) => Scene & { line2: string; note: string }> = {
  wood: (c) => ({
    bg: 'park',
    line2: '배우고 키우고 걷는 습관이 운을 연다',
    actors: [c.me(200, 'grin', 'wave', { fx: ['sparkle'] }), c.other('friend', 420, 'smile', 'idle', { dir: -1 })],
    lines: [say(0, '아침 산책 30분, 오늘도 성공!'), say(1, '요즘 얼굴 좋아 보인다?')],
    note: '목(木) 기운은 성장과 시작의 힘입니다. 아침 시간에 새로 배우고, 식물을 키우고, 숲길을 걷는 습관이 부족한 기운을 채워 줍니다.',
  }),
  fire: (c) => ({
    bg: 'city',
    line2: '햇빛·사람·땀 흘리는 운동이 기운을 뚫는다',
    actors: [c.me(200, 'laugh', 'cheer', { fx: ['sparkle'] }), c.other('friend', 420, 'grin', 'wave', { dir: -1 })],
    lines: [say(0, '햇빛 보고 사람 만나니까 살 것 같아!'), say(1, '그치? 자주 나오자!')],
    note: '화(火) 기운은 열정과 표현의 힘입니다. 햇빛을 충분히 쬐고, 사람을 만나 이야기하고, 땀이 날 만큼 움직이는 습관이 도움이 됩니다.',
  }),
  earth: (c) => ({
    bg: 'home',
    line2: '규칙적인 생활과 약속이 중심을 잡아 준다',
    actors: [c.me(260, 'smile', 'hold', { held: 'notebook' })],
    lines: [say(0, '같은 시간에 자고, 같은 시간에 먹기!')],
    props: [{ kind: 'calendar', x: 470, y: 150 }],
    note: '토(土) 기운은 중심과 안정의 힘입니다. 먹고 자는 시간을 일정하게 지키고, 약속과 신용을 지키는 습관이 흔들리는 기운을 잡아 줍니다.',
  }),
  metal: (c) => ({
    bg: 'home',
    line2: '덜어 내고 정리할 때 운이 선명해진다',
    actors: [c.me(220, 'proud', 'shrug', { fx: ['sparkle'] })],
    lines: [say(0, '안 쓰는 건 싹 정리! 머리가 맑아졌어.')],
    props: [{ kind: 'boxes', x: 450 }],
    note: '금(金) 기운은 결단과 정리의 힘입니다. 주변의 물건과 관계를 덜어 내고, 스스로 규칙을 세우는 습관이 흐트러진 기운을 모아 줍니다.',
  }),
  water: (c) => ({
    bg: 'bedroom',
    line2: '충분한 잠과 혼자 생각하는 시간이 답이다',
    actors: [c.me(250, 'smile', 'hold', { held: 'notebook', fx: ['zzz'] })],
    lines: [say(0, '오늘 생각 정리 끝. 푹 자자.')],
    note: '수(水) 기운은 휴식과 지혜의 힘입니다. 충분히 자고 쉬며, 혼자 생각하고 기록하는 시간을 따로 두는 습관이 과열된 기운을 식혀 줍니다.',
  }),
};

function dominantOf(a: SajuAnalysis, g: TenGodGroup): TenGod | null {
  const tgc = a.elements.tenGodCount;
  const tgh = a.elements.tenGodHidden;
  const list = (Object.keys(tgc) as TenGod[]).filter((t) => groupOf(t) === g && tgc[t] + tgh[t] > 0);
  if (!list.length) return null;
  return list.sort((x, y) => tgc[y] + tgh[y] * 0.3 - (tgc[x] + tgh[x] * 0.3))[0];
}

/** 사용자 나이에 맞게 장면을 다듬는다: 10대 이하는 학교 장면으로, 65세 이상은 또래 인물로 */
function adapt(s0: Scene, c: Ctx): Scene {
  const young = c.age === 'kid' || c.age === 'teen';
  const s: Scene = {
    ...s0,
    lines: s0.lines.map((l) => ({ ...l, text: (young ? l.alt?.young : c.age === 'senior' ? l.alt?.senior : undefined) ?? l.text })),
  };
  if (c.age === 'senior') {
    const actors = s.actors.map((x): Actor => (x.role === 'friend' || x.role === 'coworker' ? { ...x, role: 'elder', age: 'senior', gender: c.male ? 'male' : 'female' } : x));
    return { ...s, actors };
  }
  if (!young) return s;
  const bg: Bg = s.bg === 'office' || s.bg === 'officeNight' ? 'school' : s.bg;
  const actors = s.actors.map((x): Actor => {
    if (x.role === 'boss') return { ...x, role: 'teacher' };
    if (x.role === 'coworker' || x.role === 'partner') return { ...x, role: 'friend', age: c.age, gender: c.male ? 'male' : 'female' };
    if (x.role === 'friend') return { ...x, age: c.age };
    return x;
  });
  return { ...s, bg, actors };
}

export function personaComic(a: SajuAnalysis): Comic {
  const c = makeCtx(a);
  const ds = a.pillars.day.stem;
  const dmEl = STEMS[ds].element;
  const gp = a.elements.groupPercent;
  const ys = a.yongsin.yongsin;
  const who = c.name ? `${c.name}님` : '당신';
  const panels: Panel[] = [];

  const p1 = DM_PANEL[ds](c);
  panels.push({
    title: '타고난 기질',
    ...adapt(p1, c),
    caption: p1.caption,
    basis: `일간 ${STEMS[ds].hanja}(${ELEMENT_KO[dmEl]}) · ${pillarHanja(a.pillars.day)}일주`,
    note: p1.note,
    tone: 'neutral',
  });

  const top = [...GROUPS].sort((x, y) => gp[y] - gp[x])[0];
  const p2 = STRONG_PANEL[top](c);
  const dom = dominantOf(a, top);
  panels.push({
    title: '타고난 무기',
    ...adapt(p2, c),
    caption: `가장 강한 기운은 ${top}(${pct(gp[top])})\n${p2.line2}`,
    basis: `${top} ${pct(gp[top])}${dom ? ` · 중심 십성 ${dom}` : ''}`,
    note: `${p2.note}${dom ? ` ${DOMINANT_NOTE[dom]}` : ''}`,
    tone: 'good',
  });

  const weak = WEAKNESS.find((w) => w.test(a));
  if (weak) {
    const p3 = weak.scene(c);
    panels.push({ title: '솔직한 약점', ...adapt(p3, c), caption: `솔직히 말하면…\n${p3.line2}`, basis: p3.basis, note: p3.note, tone: 'bad' });
  } else {
    const p3 = DM_SHADOW[ds](c);
    panels.push({
      title: '솔직한 약점',
      ...adapt(p3, c),
      caption: `솔직히 말하면…\n${p3.line2}`,
      basis: `일간 ${STEMS[ds].hanja}의 그림자`,
      note: p3.note,
      tone: 'bad',
    });
  }

  const p4 = YONGSIN_PANEL[ys](c);
  panels.push({
    title: '나에게 맞는 처방',
    ...adapt(p4, c),
    caption: `처방: 필요한 기운은 ${ELEMENT_KO[ys]}(${ELEMENT_HANJA[ys]})\n${p4.line2}`,
    basis: `용신 ${ELEMENT_KO[ys]}(${ELEMENT_HANJA[ys]}) · ${a.yongsin.method}`,
    note: p4.note,
    tone: 'good',
  });

  return {
    id: 'persona',
    title: `${who}은 이런 사람`,
    subtitle: `${pillarHanja(a.pillars.day)}일주 · ${a.strength.level} · 용신 ${ELEMENT_KO[ys]}(${ELEMENT_HANJA[ys]})`,
    panels,
  };
}

// ---------------------------------------------------------------------------
// 6컷 — 나의 인생 (어린 시절 + 대운 다섯 개)
// ---------------------------------------------------------------------------

const CHILD_PANEL: Record<TenGodGroup, (c: Ctx) => Scene & { line2: string }> = {
  비겁: (c) => ({
    bg: 'park',
    line2: '고집과 자립심이 일찍 자란 아이',
    actors: [c.me(200, 'determined', 'fist', { age: 'kid' }), c.other('child', 420, 'angry', 'cross', { dir: -1, gender: c.male ? 'male' : 'female' })],
    lines: [say(0, '내가 할래! 내가 먼저야!', 'shout'), say(1, '치사해!')],
  }),
  식상: (c) => ({
    bg: 'home',
    line2: '말 많고 재주 많은 아이',
    actors: [c.me(200, 'grin', 'hold', { age: 'kid', held: 'drawing' }), c.other('parent', 420, 'laugh', 'idle', { dir: -1 })],
    lines: [say(0, '엄마! 이거 봐! 내가 그렸어!'), say(1, '어머, 천재 아니야?')],
  }),
  재성: (c) => ({
    bg: 'city',
    line2: '셈이 빠르고 현실 감각이 일찍 생긴 아이',
    actors: [c.me(260, 'thinking', 'hold', { age: 'kid', held: 'coin' })],
    lines: [say(0, '용돈 모아서 저거 사야지. 앞으로 3주!', 'think')],
  }),
  관성: (c) => ({
    bg: 'home',
    line2: '기대 속에서 일찍 철든 아이',
    actors: [c.me(200, 'nervous', 'hold', { age: 'kid', held: 'document' }), c.other('parent', 420, 'smile', 'cross', { dir: -1 })],
    lines: [say(1, '이번에도 100점이지?'), say(0, '(더 잘해야 해…)', 'think')],
  }),
  인성: (c) => ({
    bg: 'library',
    line2: '보살핌 속에서 배우기를 좋아한 아이',
    actors: [c.me(200, 'smile', 'hold', { age: 'kid', held: 'book' }), c.other('parent', 420, 'smile', 'idle', { dir: -1 })],
    lines: [say(0, '이 책 벌써 다 읽었어요!'), say(1, c.name ? `우리 ${c.name}, 최고야!` : '역시 우리 아이 최고야!')],
  }),
};

type DecadeScene = Scene & { line2: string };
type DecadeFn = (c: Ctx, age: Age) => DecadeScene;

/** 성인기(20~59세 무렵) 대운 장면: 그룹 × 길흉 × 2가지 (같은 장면이 이어지지 않게) */
const DECADE_SCENE: Record<TenGodGroup, Record<PanelTone, [DecadeFn, DecadeFn]>> = {
  비겁: {
    good: [
      (c, age) => ({
        bg: 'city',
        line2: '내 힘으로 자리를 잡는다',
        actors: [c.me(190, 'grin', 'cheer', { age }), c.other('friend', 420, 'laugh', 'cheer', { dir: -1 })],
        lines: [say(0, '드디어 내 이름 건 첫 시작!'), say(1, '우리가 해냈다!')],
      }),
      (c, age) => ({
        bg: 'office',
        line2: '내 사람들과 함께 일군다',
        actors: [c.other('friend', 190, 'grin', 'cheer'), c.me(420, 'proud', 'fist', { dir: -1, age })],
        lines: [say(0, '드디어 우리 팀이 생겼네!'), say(1, '이제 시작이야. 가 보자!')],
      }),
    ],
    neutral: [
      (c, age) => ({
        bg: 'crossroad',
        line2: '독립하고 싶은 마음이 커진다',
        actors: [c.me(200, 'determined', 'point', { age })],
        lines: [say(0, '이제 내 길은 내가 정할래.')],
        props: [{ kind: 'signpost', x: 450, label: '독립', label2: '안정' }],
      }),
      (c, age) => ({
        bg: 'home',
        line2: '내 힘으로 서 보는 시간',
        actors: [c.me(230, 'determined', 'hold', { age, held: 'bag' })],
        lines: [say(0, '이번엔 누구 도움 없이 해 볼래.')],
        props: [{ kind: 'boxes', x: 450 }],
      }),
    ],
    bad: [
      (c, age) => ({
        bg: 'cafe',
        line2: '사람과 돈 문제로 마음고생',
        actors: [c.other('friend', 190, 'nervous', 'hold', { held: 'document' }), c.me(420, 'shock', 'idle', { dir: -1, age, fx: ['sweat'] })],
        lines: [say(0, '딱 한 번만 보증 좀 서 줘…'), say(1, '(이걸 어떡하지…)', 'think')],
      }),
      (c, age) => ({
        bg: 'office',
        line2: '경쟁자에게 몫을 빼앗기기 쉽다',
        actors: [c.other('coworker', 190, 'smile', 'point'), c.me(420, 'angry', 'cross', { dir: -1, age, fx: ['anger'] })],
        lines: [say(0, '그 자리는 제가 맡기로 했어요.'), say(1, '(그건 내 몫이었는데…!)', 'think')],
      }),
    ],
  },
  식상: {
    good: [
      (c, age) => ({
        bg: 'stage',
        line2: '재능이 빛을 본다',
        actors: [c.me(300, 'grin', 'hold', { age, held: 'mic', fx: ['sparkle'] })],
        lines: [say(0, '내가 만든 걸 사람들이 좋아해!')],
      }),
      (c, age) => ({
        bg: 'cafe',
        line2: '실력이 결과물로 증명된다',
        actors: [c.me(200, 'laugh', 'hold', { age, held: 'phone', fx: ['sparkle'] }), c.other('friend', 420, 'surprised', 'idle', { dir: -1 })],
        lines: [say(1, '이거 네가 만든 거야? 대박!'), say(0, '반응이 이렇게 좋을 줄이야!')],
      }),
    ],
    neutral: [
      (c, age) => ({
        bg: 'cafe',
        line2: '새로운 일을 꿈꾸게 된다',
        actors: [c.me(260, 'thinking', 'think', { age, fx: ['bulb'] })],
        lines: [say(0, '이번엔 진짜 내 걸 만들어 볼까?')],
      }),
      (c, age) => ({
        bg: 'home',
        line2: '하고 싶은 일을 준비하게 된다',
        actors: [c.me(250, 'determined', 'hold', { age, held: 'notebook' })],
        lines: [say(0, '퇴근하고 내 일 준비 중!')],
      }),
    ],
    bad: [
      (c, age) => ({
        bg: 'office',
        line2: '말과 행동이 앞서 구설이 생긴다',
        actors: [c.other('boss', 190, 'angry', 'point'), c.me(420, 'nervous', 'idle', { dir: -1, age })],
        lines: [say(0, '또 말부터 앞섰구먼.'), say(1, '(벌여 놓은 일만 산더미…)', 'think')],
      }),
      (c, age) => ({
        bg: 'cafe',
        line2: '말 한마디가 구설로 번진다',
        actors: [c.other('friend', 190, 'sad', 'idle'), c.me(420, 'nervous', 'facepalm', { dir: -1, age })],
        lines: [say(0, '네가 한 말, 벌써 다 퍼졌더라.'), say(1, '(괜히 말했다…)', 'think')],
      }),
    ],
  },
  재성: {
    good: [
      (c, age) => ({
        bg: 'money',
        line2: '돈과 기회의 규모가 커진다',
        actors: [c.me(220, 'laugh', 'hold', { age, held: 'money', fx: ['sparkle'] })],
        lines: [say(0, '통장이 이렇게 불어나다니!')],
        props: [
          { kind: 'chartUp', x: 450, y: 196 },
          { kind: 'moneyBag', x: 460 },
        ],
      }),
      (c, age) => ({
        bg: 'city',
        line2: '활동 반경과 수입이 넓어진다',
        actors: [c.me(250, 'proud', 'wave', { age, held: 'bag' })],
        lines: [say(0, '이번 거래도 성공! 다음은 어디로?')],
      }),
    ],
    neutral: [
      (c, age) => ({
        bg: 'city',
        line2: '돈과 생활이 최대 관심사',
        actors: [c.me(260, 'thinking', 'hold', { age, held: 'phone' })],
        lines: [say(0, '이번 달 고정비가 얼마더라…', 'think')],
      }),
      (c, age) => ({
        bg: 'home',
        line2: '돈의 흐름을 배우는 때',
        actors: [c.me(260, 'thinking', 'hold', { age, held: 'notebook' })],
        lines: [say(0, '가계부를 써 보니 이제 좀 보이네.')],
      }),
    ],
    bad: [
      (c, age) => ({
        bg: 'gloom',
        line2: '욕심이 손실로 이어지기 쉽다',
        actors: [c.me(230, 'shock', 'hold', { age, held: 'wallet' })],
        lines: [say(0, '들어온 만큼 다 나가네…')],
        props: [{ kind: 'chartDown', x: 450, y: 196 }],
      }),
      (c, age) => ({
        bg: 'gloom',
        line2: '무리한 투자는 손실로 돌아온다',
        actors: [c.me(230, 'cry', 'hold', { age, held: 'phone' })],
        lines: [say(0, '투자한 게… 반토막?!', 'shout')],
        props: [{ kind: 'chartDown', x: 450, y: 196 }],
      }),
    ],
  },
  관성: {
    good: [
      (c, age) => ({
        bg: 'office',
        line2: '인정받고 자리가 잡힌다',
        actors: [c.me(190, 'proud', 'hold', { age, held: 'certificate' }), c.other('boss', 420, 'smile', 'idle', { dir: -1 })],
        lines: [say(1, '축하하네. 이제 팀을 맡아 주게.'), say(0, '열심히 하겠습니다!')],
      }),
      (c, age) => ({
        bg: 'stage',
        line2: '이름이 알려지고 명예가 따른다',
        actors: [c.me(300, 'proud', 'hold', { age, held: 'trophy', fx: ['shine'] })],
        lines: [say(0, '이 상은 함께한 모두 덕분입니다!')],
      }),
    ],
    neutral: [
      (c, age) => ({
        bg: 'office',
        line2: '맡는 책임과 역할이 늘어난다',
        actors: [c.me(230, 'determined', 'hold', { age, held: 'document' })],
        lines: [say(0, '책임이 늘었네. 그래도 해 보자.')],
        props: [{ kind: 'whiteboard', x: 450, y: 210 }],
      }),
      (c, age) => ({
        bg: 'office',
        line2: '책임질 사람과 일이 늘어난다',
        actors: [c.other('coworker', 190, 'nervous', 'hold', { held: 'document' }), c.me(420, 'determined', 'cross', { dir: -1, age })],
        lines: [say(0, '선배, 이건 어떻게 해요?'), say(1, '같이 보자. 내가 책임질게.')],
      }),
    ],
    bad: [
      (c, age) => ({
        bg: 'officeNight',
        line2: '압박에 짓눌리기 쉽다. 건강이 먼저',
        actors: [c.me(230, 'tired', 'facepalm', { age, fx: ['cloud'] })],
        lines: [say(0, '숨 좀 쉬고 싶다…', 'think')],
        props: [
          { kind: 'desk', x: 300 },
          { kind: 'papers', x: 352 },
        ],
      }),
      (c, age) => ({
        bg: 'office',
        line2: '평가와 압박이 거세진다',
        actors: [c.other('boss', 190, 'angry', 'point'), c.me(420, 'tired', 'idle', { dir: -1, age, fx: ['sweat'] })],
        lines: [say(0, '이번 실적, 어떻게 된 건가?'), say(1, '(숨이 턱 막힌다…)', 'think')],
      }),
    ],
  },
  인성: {
    good: [
      (c, age) => ({
        bg: 'library',
        line2: '배움과 귀인의 도움이 길을 연다',
        actors: [c.me(190, 'smile', 'hold', { age, held: 'certificate' }), c.other('teacher', 420, 'smile', 'idle', { dir: -1 })],
        lines: [say(1, '자네라면 할 수 있어.'), say(0, '도와주셔서 감사합니다!')],
      }),
      (c, age) => ({
        bg: 'home',
        line2: '공부와 자격이 결실을 맺는다',
        actors: [c.me(260, 'grin', 'hold', { age, held: 'certificate', fx: ['sparkle'] })],
        lines: [say(0, '드디어 합격이다!', 'shout')],
      }),
    ],
    neutral: [
      (c, age) => ({
        bg: 'library',
        line2: '드러나지 않게 내공이 쌓인다',
        actors: [c.me(260, 'thinking', 'hold', { age, held: 'book' })],
        lines: [say(0, '지금은 실력을 쌓을 때야.')],
      }),
      (c, age) => ({
        bg: 'cafe',
        line2: '배우고 준비하는 시간',
        actors: [c.me(260, 'smile', 'hold', { age, held: 'book' })],
        lines: [say(0, '퇴근 후 공부, 오늘도 한 장!')],
      }),
    ],
    bad: [
      (c, age) => ({
        bg: 'bedroom',
        line2: '생각만 많고 실행이 막힌다',
        actors: [c.me(250, 'worried', 'think', { age, fx: ['question'] })],
        lines: [say(0, '생각만 하다 또 한 달이 갔네…', 'think')],
      }),
      (c, age) => ({
        bg: 'home',
        line2: '미루는 습관이 기회를 놓치게 한다',
        actors: [c.me(250, 'nervous', 'shrug', { age })],
        lines: [say(0, '다음 달부터는 진짜 시작할게…')],
      }),
    ],
  },
};

type Lines = { kid: string; teen: string };
const pick = (age: Age, l: Lines) => (age === 'kid' ? l.kid : l.teen);

/** 어린이·10대 대운 장면 — 나이(어린이/10대)마다 대사가 달라 같은 그룹이 이어져도 겹치지 않는다 */
const YOUNG_SCENE: Record<TenGodGroup, (c: Ctx, age: Age, tone: PanelTone) => DecadeScene> = {
  비겁: (c, age, tone) => ({
    bg: age === 'kid' ? 'park' : 'school',
    line2: tone === 'bad' ? '경쟁과 다툼이 잦다' : '친구들과 겨루며 자란다',
    actors: [c.me(200, tone === 'bad' ? 'angry' : 'determined', 'fist', { age }), c.other('friend', 420, tone === 'bad' ? 'angry' : 'grin', 'cross', { dir: -1, age })],
    lines:
      tone === 'bad'
        ? [say(0, pick(age, { kid: '내 장난감 만지지 마!', teen: '쟤한테만은 절대 안 져!' })), say(1, pick(age, { kid: '치사해!', teen: '흥, 두고 봐!' }))]
        : [say(0, pick(age, { kid: '달리기는 내가 1등!', teen: '이번 시합은 꼭 이긴다!' })), say(1, pick(age, { kid: '다음엔 내가 이길 거야!', teen: '좋아, 붙어 보자!' }))],
  }),
  식상: (c, age, tone) => ({
    bg: 'school',
    line2: tone === 'bad' ? '하고 싶은 것과 해야 할 것 사이의 갈등' : '재주와 끼가 드러난다',
    actors: [c.me(200, tone === 'bad' ? 'nervous' : 'grin', tone === 'bad' ? 'idle' : 'cheer', { age }), c.other('teacher', 420, tone === 'bad' ? 'angry' : 'surprised', 'idle', { dir: -1 })],
    lines:
      tone === 'bad'
        ? [say(1, pick(age, { kid: '수업 시간엔 조용히 해야지!', teen: '수업 시간에 딴짓하지 말랬지!' })), say(0, pick(age, { kid: '(할 말이 너무 많은데…)', teen: '(이게 더 재밌는데…)' }), 'think')]
        : [say(1, pick(age, { kid: '장기자랑 나갈 사람?', teen: '장래 희망은 정했니?' })), say(0, pick(age, { kid: '저요! 저요!', teen: '하고 싶은 게 너무 많아요!' }))],
  }),
  재성: (c, age, tone) => ({
    bg: 'city',
    line2: tone === 'bad' ? '갖고 싶은 것 앞에서 애가 탄다' : '돈과 현실에 일찍 눈뜬다',
    actors: [c.me(260, tone === 'bad' ? 'worried' : 'proud', 'hold', { age, held: 'coin' })],
    lines: [
      say(
        0,
        tone === 'bad'
          ? pick(age, { kid: '용돈이 벌써 다 떨어졌어…', teen: '사고 싶은 건 많은데 돈이 없어…' })
          : pick(age, { kid: '저금통이 꽉 찼다!', teen: '알바해서 번 내 첫 돈!' }),
      ),
    ],
  }),
  관성: (c, age, tone) => ({
    bg: 'school',
    line2: tone === 'bad' ? '평가와 규칙에 짓눌린다' : '책임 있는 역할을 맡는다',
    actors: [c.me(260, tone === 'bad' ? 'tired' : 'proud', 'hold', { age, held: tone === 'bad' ? 'document' : 'certificate' })],
    lines: [
      say(
        0,
        tone === 'bad'
          ? pick(age, { kid: '숙제, 또 숙제…', teen: '시험, 시험, 또 시험…' })
          : pick(age, { kid: '받아쓰기 100점 받았어요!', teen: '반장이 됐다! 책임감 뿜뿜!' }),
      ),
    ],
  }),
  인성: (c, age, tone) =>
    tone === 'bad' && age === 'kid'
      ? {
          bg: 'home',
          line2: '어른에게 기대고 미루는 습관이 생기기 쉽다',
          actors: [c.me(200, 'nervous', 'hold', { age, held: 'notebook' }), c.other('parent', 420, 'tired', 'cross', { dir: -1 })],
          lines: [say(0, '숙제… 엄마가 도와주면 안 돼요?'), say(1, '또? 이번엔 혼자 해 보자.')],
        }
      : {
          bg: 'library',
          line2: tone === 'bad' ? '생각이 많아 고민이 깊어진다' : '좋은 선생님과 배움을 만난다',
          actors: [c.me(260, tone === 'bad' ? 'worried' : 'smile', tone === 'bad' ? 'think' : 'hold', { age, held: tone === 'bad' ? undefined : 'book' })],
          lines: [
            tone === 'bad'
              ? say(0, '생각이 많아서 잠이 안 와…', 'think')
              : say(0, pick(age, { kid: '이 책 너무 재밌어요!', teen: '공부가 재밌어지기 시작했어!' })),
          ],
        },
};

/** 60대 이후 대운 장면 — [보통·좋음, 나쁨] 각각 2가지 */
const SENIOR_SCENE: Record<TenGodGroup, { ok: [DecadeFn, DecadeFn]; bad: [DecadeFn, DecadeFn] }> = {
  비겁: {
    ok: [
      (c) => ({
        bg: 'park',
        line2: '또래와 어울리는 자립의 시간',
        actors: [c.me(190, 'laugh', 'wave', { age: 'senior' }), c.other('elder', 420, 'laugh', 'wave', { dir: -1 })],
        lines: [say(0, '역시 친구들이랑 걷는 게 최고야!')],
      }),
      (c) => ({
        bg: 'cafe',
        line2: '오랜 친구가 힘이 되는 때',
        actors: [c.other('elder', 190, 'grin', 'hold', { held: 'coffee' }), c.me(420, 'laugh', 'idle', { dir: -1, age: 'senior' })],
        lines: [say(0, '우리 동창 모임, 이번 달도 꼭 와!'), say(1, '당연하지, 그게 낙인데!')],
      }),
    ],
    bad: [
      (c) => ({
        bg: 'park',
        line2: '사람 사이의 돈 문제를 조심할 때',
        actors: [c.other('elder', 190, 'grin', 'point'), c.me(420, 'worried', 'idle', { dir: -1, age: 'senior' })],
        lines: [say(0, '이번에 같이 투자 하나 할래?'), say(1, '(이 나이에 모험은…)', 'think')],
      }),
      (c) => ({
        bg: 'home',
        line2: '고집이 외로움이 되지 않게',
        actors: [c.me(260, 'sad', 'cross', { age: 'senior' })],
        lines: [say(0, '내 말이 맞는데… 다들 왜 안 듣지?', 'think')],
      }),
    ],
  },
  식상: {
    ok: [
      (c) => ({
        bg: 'home',
        line2: '배우고 표현하는 즐거움',
        actors: [c.me(220, 'grin', 'wave', { age: 'senior', held: 'brush' })],
        lines: [say(0, '요즘 그림 배우는 재미에 산다!')],
        props: [{ kind: 'easel', x: 440 }],
      }),
      (c) => ({
        bg: 'park',
        line2: '손주와 취미가 삶을 젊게 만든다',
        actors: [c.me(200, 'laugh', 'cheer', { age: 'senior', fx: ['music'] }), c.other('child', 420, 'grin', 'cheer', { dir: -1 })],
        lines: [say(1, c.male ? '할아버지 노래 또 불러 주세요!' : '할머니 노래 또 불러 주세요!'), say(0, '그래, 따라 불러 봐!')],
      }),
    ],
    bad: [
      (c) => ({
        bg: 'home',
        line2: '마음은 앞서는데 몸이 따라 주지 않는다',
        actors: [c.me(220, 'tired', 'wave', { age: 'senior', held: 'brush' })],
        lines: [say(0, '하고 싶은 건 많은데 몸이 안 따라 주네.')],
        props: [{ kind: 'easel', x: 440 }],
      }),
      (c) => ({
        bg: 'home',
        line2: '잔소리가 서운함을 부르기 쉽다',
        actors: [c.me(200, 'angry', 'point', { age: 'senior' }), c.other('child', 420, 'sad', 'idle', { dir: -1 })],
        lines: [say(0, '그건 그렇게 하는 게 아니라니까!'), say(1, '(또 시작이다…)', 'think')],
      }),
    ],
  },
  재성: {
    ok: [
      (c) => ({
        bg: 'home',
        line2: '모은 것을 정리하고 나누는 때',
        actors: [c.me(260, 'thinking', 'hold', { age: 'senior', held: 'document' })],
        lines: [say(0, '재산 정리는 미리미리 해 두자.')],
      }),
      (c) => ({
        bg: 'home',
        line2: '쓰고 남기는 균형을 잡는 때',
        actors: [c.me(200, 'smile', 'hold', { age: 'senior', held: 'gift' }), c.other('child', 420, 'love', 'idle', { dir: -1 })],
        lines: [say(0, '이건 우리 손주 몫이야.'), say(1, '와, 고맙습니다!')],
      }),
    ],
    bad: [
      (c) => ({
        bg: 'home',
        line2: '노후 자금을 단단히 챙겨야 할 때',
        actors: [c.me(260, 'worried', 'hold', { age: 'senior', held: 'document' })],
        lines: [say(0, '노후 자금이 생각보다 빠듯하네…')],
      }),
      (c) => ({
        bg: 'gloom',
        line2: '큰돈이 오가는 결정은 피할 때',
        actors: [c.me(260, 'shock', 'hold', { age: 'senior', held: 'phone' })],
        lines: [say(0, '이 수익률… 너무 좋아서 수상한데?', 'think')],
      }),
    ],
  },
  관성: {
    ok: [
      (c) => ({
        bg: 'park',
        line2: '건강과 규칙적인 생활이 가장 큰 과제',
        actors: [c.me(280, 'smile', 'fist', { age: 'senior' })],
        lines: [say(0, '매일 걷고, 검진은 꼭 챙기자!')],
      }),
      (c) => ({
        bg: 'gym',
        line2: '몸을 돌보는 습관이 운을 지킨다',
        actors: [c.me(260, 'determined', 'fighting', { age: 'senior' })],
        lines: [say(0, '오늘도 운동 완료! 몸이 가볍네.')],
        props: [{ kind: 'dumbbell', x: 460 }],
      }),
    ],
    bad: [
      (c) => ({
        bg: 'home',
        line2: '건강과 규칙적인 생활이 가장 큰 과제',
        actors: [c.me(280, 'tired', 'idle', { age: 'senior', fx: ['sweat'] })],
        lines: [say(0, '여기저기 쑤시네… 병원 예약해야지.')],
      }),
      (c) => ({
        bg: 'home',
        line2: '무리하지 말고 쉬어 가야 할 때',
        actors: [c.me(260, 'tired', 'facepalm', { age: 'senior' })],
        lines: [say(0, '예전 같지 않네… 오늘은 쉬자.', 'think')],
      }),
    ],
  },
  인성: {
    ok: [
      (c) => ({
        bg: 'home',
        line2: '지혜를 나누고 보살핌을 받는 때',
        actors: [c.me(200, 'smile', 'hold', { age: 'senior', held: 'book' }), c.other('child', 420, 'grin', 'idle', { dir: -1 })],
        lines: [say(1, '옛날이야기 또 해 주세요!'), say(0, '그래, 그럼 오늘은…')],
      }),
      (c) => ({
        bg: 'library',
        line2: '마음공부와 배움이 즐거운 때',
        actors: [c.me(260, 'smile', 'hold', { age: 'senior', held: 'book' })],
        lines: [say(0, '이 나이에 배우는 게 제일 재밌네.')],
      }),
    ],
    bad: [
      (c) => ({
        bg: 'home',
        line2: '기대고 싶은 마음과 미안한 마음 사이',
        actors: [c.me(280, 'worried', 'think', { age: 'senior' })],
        lines: [say(0, '자식들한테 짐이 될까 봐 걱정이야.', 'think')],
      }),
      (c) => ({
        bg: 'night',
        line2: '생각이 많아 잠 못 드는 밤',
        actors: [c.me(280, 'tired', 'idle', { age: 'senior', fx: ['gloom'] })],
        lines: [say(0, '이런저런 생각에 잠이 안 오네…', 'think')],
      }),
    ],
  },
};

function ageOfStage(s: LifeStage): Age {
  if (s === 'child') return 'kid';
  if (s === 'teen') return 'teen';
  if (s === 'senior') return 'senior';
  return 'adult';
}

/** 결혼·이사·이직처럼 특정 신호가 있는 시기의 장면 (2가지씩) */
const LOVE: [DecadeFn, DecadeFn] = [
  (c, age) => ({
    bg: 'dinner',
    line2: '깊은 인연이 들어오기 쉽다',
    actors: [c.me(150, 'love', 'cheeks', { age }), c.other('partner', 450, 'smile', 'idle', { dir: -1, fx: ['hearts'] })],
    lines: [say(1, '우리, 앞으로도 함께할래?'), say(0, '응, 좋아!')],
    props: [{ kind: 'table', x: 300 }],
  }),
  (c, age) => ({
    bg: 'park',
    line2: '인연이 깊어지는 시기',
    actors: [c.me(200, 'love', 'idle', { age }), c.other('partner', 410, 'smile', 'wave', { dir: -1, fx: ['hearts'] })],
    lines: [say(1, '오래오래 같이 걷자.'), say(0, '응, 약속!')],
    props: [{ kind: 'bench', x: 300 }],
  }),
];
const MOVE: Record<'good' | 'bad', [DecadeFn, DecadeFn]> = {
  good: [
    (c, age) => ({
      bg: 'home',
      line2: '이사·관계·생활에 변동이 생긴다',
      actors: [c.me(230, 'grin', 'cheer', { age })],
      lines: [say(0, '새집으로 이사! 새 출발이다!')],
      props: [{ kind: 'boxes', x: 450 }],
    }),
    (c, age) => ({
      bg: 'city',
      line2: '생활의 무대가 바뀐다',
      actors: [c.me(250, 'grin', 'wave', { age, held: 'bag' })],
      lines: [say(0, '새 동네, 새 생활! 설렌다.')],
    }),
  ],
  bad: [
    (c, age) => ({
      bg: 'home',
      line2: '이사·관계·건강에 변동이 생긴다',
      actors: [c.me(230, 'nervous', 'shrug', { age })],
      lines: [say(0, '또 짐을 싸야 하네… 정신없다.')],
      props: [{ kind: 'boxes', x: 450 }],
    }),
    (c, age) => ({
      bg: 'rain',
      line2: '집과 관계에 흔들림이 생긴다',
      actors: [c.me(260, 'worried', 'wave', { age, held: 'umbrella' })],
      lines: [say(0, '요즘 왜 이렇게 다 흔들리지…', 'think')],
    }),
  ],
};
const JOB: Record<'good' | 'bad', [DecadeFn, DecadeFn]> = {
  good: [
    (c, age) => ({
      bg: 'city',
      line2: '직장과 환경이 크게 바뀐다',
      actors: [c.me(260, 'grin', 'wave', { age, held: 'bag' })],
      lines: [say(0, '새 회사 첫 출근! 잘해 보자.')],
    }),
    (c, age) => ({
      bg: 'office',
      line2: '새 무대에서 다시 시작한다',
      actors: [c.me(240, 'determined', 'fighting', { age })],
      lines: [say(0, '새 팀, 새 업무. 다시 시작이다!')],
    }),
  ],
  bad: [
    (c, age) => ({
      bg: 'crossroad',
      line2: '직장과 환경이 크게 바뀐다',
      actors: [c.me(200, 'thinking', 'think', { age })],
      lines: [say(0, '여기 계속 있어야 할까…?', 'think')],
      props: [{ kind: 'signpost', x: 450, label: '이직', label2: '잔류' }],
    }),
    (c, age) => ({
      bg: 'office',
      line2: '자리가 흔들리기 쉽다',
      actors: [c.me(260, 'worried', 'hold', { age, held: 'bag' })],
      lines: [say(0, '조직 개편이라니… 내 자리는?', 'think')],
    }),
  ],
};

interface DecadePick {
  scene: DecadeScene;
  kind: 'love' | 'move' | 'job' | 'normal';
}

function decadeScene(c: Ctx, g: TenGodGroup, tone: PanelTone, stage: LifeStage, flags: string[], used: Set<string>): DecadePick {
  const age = ageOfStage(stage);
  const once = (key: string, fns: [DecadeFn, DecadeFn]): DecadeScene => {
    const v = used.has(key) ? 1 : 0;
    used.add(key);
    return fns[v](c, age);
  };
  if (age === 'kid' || age === 'teen') return { scene: YOUNG_SCENE[g](c, age, tone), kind: 'normal' };
  if (age === 'senior') {
    const t = tone === 'bad' ? 'bad' : 'ok';
    return { scene: once(`senior-${g}-${t}`, SENIOR_SCENE[g][t]), kind: 'normal' };
  }
  const spouseStar: TenGodGroup = c.male ? '재성' : '관성';
  const loveStage = stage === 'youth' || stage === 'settle';
  if (loveStage && (flags.some((f) => f.startsWith('일지합')) || (g === spouseStar && tone !== 'bad'))) return { scene: once('love', LOVE), kind: 'love' };
  const t = tone === 'good' ? 'good' : 'bad';
  if (flags.some((f) => f.startsWith('일지충'))) return { scene: once(`move-${t}`, MOVE[t]), kind: 'move' };
  if (flags.some((f) => f.startsWith('월지충'))) return { scene: once(`job-${t}`, JOB[t]), kind: 'job' };
  return { scene: once(`${g}-${tone}`, DECADE_SCENE[g][tone]), kind: 'normal' };
}

export function lifeComic(a: SajuAnalysis): Comic {
  const c = makeCtx(a);
  const who = c.name ? `${c.name}님` : '당신';
  const panels: Panel[] = [];
  const monthInfo = a.positions.find((p) => p.pos === 'month')!;
  const cg = groupOf(monthInfo.branchTenGod);
  const child = CHILD_PANEL[cg](c);
  const firstAge = a.daeun.startAgeYears;
  const list = a.daeun.list;
  const ageNow = (a.now - a.pillars.conversion.utcMs) / (365.2422 * 86400000);
  panels.push({
    title: '어린 시절',
    ...child,
    badge: ageNow < list[0].startAge ? '지금 여기!' : undefined,
    caption: `어린 시절${firstAge >= 1 ? ` (만 0~${firstAge}세)` : ''}\n${child.line2}`,
    basis: `월지 ${pillarHanja(a.pillars.month).slice(1)}(${monthInfo.branchTenGod}) · 성장 환경`,
    note: `태어난 달은 부모와 성장 환경을 뜻하는 자리입니다. 이 자리에 ${monthInfo.branchTenGod}(${cg})이 있어 이런 어린 시절을 보냈을 가능성이 큽니다. 실제 기억과 비교해 보세요.`,
    tone: 'neutral',
  });

  const found = list.findIndex((d) => ageNow >= d.startAge && ageNow < d.startAge + 10);
  const cur = found >= 0 ? found : ageNow >= list[0].startAge ? list.length - 1 : 0;
  const start = Math.max(0, Math.min(cur - 2, list.length - 5));
  const shown = list.slice(start, start + 5);
  const best = shown.reduce((m, d) => (d.score > m.score ? d : m), shown[0]);
  const worst = shown.reduce((m, d) => (d.score < m.score ? d : m), shown[0]);
  const used = new Set<string>();
  for (const d of shown) {
    const g = groupOf(d.stemTenGod);
    const tone: PanelTone = d.score >= 58 ? 'good' : d.score < 42 ? 'bad' : 'neutral';
    const stage = lifeStage(d.startAge);
    const { scene, kind } = decadeScene(c, g, tone, stage, d.flags, used);
    const a0 = Math.floor(d.startAge);
    const isNow = ageNow >= d.startAge && ageNow < d.startAge + 10;
    const badge = isNow ? '지금 여기!' : d === best && d.score >= 58 ? '전성기' : d === worst && d.score < 42 ? '버티는 시기' : undefined;
    const theme = DECADE_THEME[g];
    const flagNote = d.flags
      .map((f) => flagText(f, stage))
      .filter(Boolean)
      .join(' ');
    const genderNote = kind === 'love' ? (GENDER_NOTE[g]?.[c.male ? 'male' : 'female'] ?? '') : '';
    panels.push({
      title: `만 ${a0}~${a0 + 9}세`,
      ...scene,
      caption: `만 ${a0}~${a0 + 9}세 · ${theme.label}의 10년\n${scene.line2}`,
      badge,
      basis: `${pillarHanja(d.pillar)} 대운 · ${d.stemTenGod}(${d.stemRole}) · ${d.score}점`,
      note: [`${d.startYear}~${d.endYear}년.`, STAGE_SCENE[g][stage], toneText(g, tone, stage), genderNote, flagNote].filter(Boolean).join(' '),
      tone,
    });
  }

  const { shape } = lifeShape(a);
  return {
    id: 'life',
    title: `${who}의 인생 웹툰`,
    subtitle: `${pillarHanja(a.pillars.day)}일주 · ${shape} · 대운 ${a.daeun.forward ? '순행' : '역행'}`,
    panels,
  };
}
