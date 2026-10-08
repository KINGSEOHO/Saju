/**
 * 개운법 — 내 사주의 강점과 약점에서 "가까이할 것"과 "멀리할 것"을 고른다.
 *
 * 근거
 *  - 용신·희신(필요한 기운) → 가까이할 색·방향·장소·시간·음식·물건·숫자·분야
 *  - 기신·구신(부담되는 기운) → 멀리할 환경·음식·습관
 *  - 용신이 맡은 십성 그룹 → 채울 습관과 가까이할 사람 / 가장 강한(부담되는) 그룹 → 덜어 낼 습관과 멀리할 사람
 *  - 신강·신약, 계절(조후), 신살(역마·귀인·화개·도화), 올해 운과 띠
 * 개운법은 부적이나 비싼 물건이 아니라 기운의 균형을 맞추는 생활 지침이다.
 */
import { BRANCHES, ELEMENT_HANJA, ELEMENT_KO, STEMS, mainStemOf, type Element, type SajuAnalysis, type TenGodGroup } from '../engine/index.ts';
import { josa } from '../engine/josa.ts';
import { elementOfGroup, groupOfElement } from '../engine/tenGods.ts';
import { ELEMENT_JOBS } from './kb.ts';
import { isStrong } from './metrics.ts';
import type { StoryPara } from './story.ts';
import { ttiOf } from './tti.ts';

export interface GaeunItem {
  key: string;
  /** 한자 아이콘 */
  icon: string;
  label: string;
  value: string;
  basis: string;
  /** 색 견본 */
  swatch?: string[];
}

export interface GaeunData {
  need: Element;
  help: Element;
  avoid: Element;
  why: string;
  close: GaeunItem[];
  away: GaeunItem[];
  routine: { text: string; basis: string }[];
  year: { title: string; text: string; tone: 'good' | 'neutral' | 'bad'; basis: string } | null;
}

interface ElKit {
  word: string;
  color: string;
  swatch: string[];
  direction: string;
  place: string;
  time: string;
  food: string;
  items: string;
  number: string;
  habit: string;
  people: string;
  short: string;
  routine: string;
  avoidColor: string;
  avoidPlace: string;
  avoidFood: string;
  avoidHabit: string;
  avoidShort: string;
}

const KIT: Record<Element, ElKit> = {
  wood: {
    word: '나무',
    color: '초록·청록',
    swatch: ['#4f9a5d', '#2a9d8f', '#8ccf7e'],
    direction: '동쪽 — 책상은 동쪽 창가, 여행은 동쪽으로',
    place: '숲·공원·식물원처럼 나무가 많은 곳',
    time: '아침 — 중요한 일은 오전에',
    food: '신맛(레몬·매실·식초)과 푸른 잎채소·새싹',
    items: '화분, 원목 가구, 종이책, 나무 소재 소품',
    number: '3 · 8',
    habit: '아침 산책, 식물 키우기, 새로운 분야 배우기',
    people: '성장을 응원해 주는 사람, 함께 배우는 모임',
    short: '배우고 걷기',
    routine: '아침에 10분 걷고, 화분 하나 들이기',
    avoidColor: '초록 일색으로 꾸민 공간',
    avoidPlace: '할 일이 끝없이 늘어나는 환경',
    avoidFood: '신 음식의 과식',
    avoidHabit: '무리하게 일 벌이기, 고집으로 밀어붙이기',
    avoidShort: '일 벌이기',
  },
  fire: {
    word: '불',
    color: '빨강·주황·분홍',
    swatch: ['#e8615a', '#f4a259', '#f7a1c4'],
    direction: '남쪽 — 볕이 잘 드는 남향 공간',
    place: '햇빛이 잘 드는 밝은 곳, 사람이 모이는 활기찬 곳',
    time: '한낮 — 점심 무렵 햇볕 쬐기',
    food: '쓴맛(녹차·쑥·커피 한 잔)과 따뜻한 음식',
    items: '밝은 조명, 캔들, 붉은 포인트 소품, 사진',
    number: '2 · 7',
    habit: '햇볕 아래 걷기, 땀 나는 운동, 사람 만나 이야기하기',
    people: '밝고 표현을 잘하는 사람, 나를 무대에 세워 주는 사람',
    short: '햇빛과 사람',
    routine: '점심 뒤 15분, 햇볕 쬐며 걷기',
    avoidColor: '빨강 위주의 강렬한 공간',
    avoidPlace: '과열된 경쟁의 자리, 시끄럽고 자극적인 곳',
    avoidFood: '맵고 자극적인 음식, 과한 카페인',
    avoidHabit: '밤샘, 욱하는 말, 성급한 결정',
    avoidShort: '과열',
  },
  earth: {
    word: '흙',
    color: '노랑·베이지·갈색',
    swatch: ['#e6b553', '#d9c3a0', '#a47148'],
    direction: '중앙 — 멀리 떠나기보다 생활 터전 가까이',
    place: '흙을 밟는 공원·텃밭, 안정된 우리 집',
    time: '규칙적인 식사 시간, 계절이 바뀌는 환절기',
    food: '단맛(곡물·고구마·호박·대추)과 뿌리채소',
    items: '도자기, 돌·흙 소재 소품, 두툼한 러그',
    number: '5 · 10',
    habit: '같은 시간에 먹고 자기, 요리, 저축, 약속 지키기',
    people: '꾸준하고 믿음직한 사람, 오래된 친구와 가족',
    short: '규칙과 약속',
    routine: '매일 같은 시간에 아침 먹기',
    avoidColor: '탁하고 무거운 갈색 일색',
    avoidPlace: '변화가 전혀 없는 답답한 환경',
    avoidFood: '단 음식과 과식',
    avoidHabit: '걱정만 하며 미루기, 변화를 무조건 피하기',
    avoidShort: '미루기',
  },
  metal: {
    word: '쇠',
    color: '흰색·은색·금색',
    swatch: ['#f2f2f0', '#c0c6cf', '#d4af37'],
    direction: '서쪽 — 서쪽 창가, 서쪽 여행지',
    place: '깔끔하게 정돈된 공간, 탁 트인 높은 곳',
    time: '저녁 — 하루를 정리하는 시간',
    food: '매운맛 조금(생강·무·마늘), 흰 음식(배·도라지), 견과류',
    items: '시계·금속 액세서리, 흰색 소품, 정리함',
    number: '4 · 9',
    habit: '방과 책상 정리, 근력 운동, 악기·서예처럼 규칙 있는 연습',
    people: '기준이 분명한 사람, 솔직하게 조언해 주는 사람',
    short: '정리와 결단',
    routine: '자기 전 5분, 책상 정리하기',
    avoidColor: '차가운 무채색뿐인 공간',
    avoidPlace: '규칙만 있고 숨 쉴 틈 없는 곳',
    avoidFood: '매운 음식의 과식',
    avoidHabit: '완벽주의, 날 선 말, 관계를 칼같이 끊기',
    avoidShort: '날 선 완벽주의',
  },
  water: {
    word: '물',
    color: '검정·남색',
    swatch: ['#1f2a44', '#34518c', '#4a86d0'],
    direction: '북쪽 — 조용한 북쪽 방, 북쪽 여행지',
    place: '바다·강·호수 같은 물가, 조용한 곳',
    time: '밤 — 밤 11시 전에 잠들기',
    food: '물 충분히, 검은 음식(검은콩·김·미역·흑임자)',
    items: '물병, 작은 수조, 남색 소품, 기록용 노트',
    number: '1 · 6',
    habit: '충분한 수면, 독서·명상·기록, 수영·반신욕',
    people: '깊은 대화가 되는 소수의 사람, 지혜로운 조언자',
    short: '잠과 사색',
    routine: '밤 11시 전에 휴대폰 내려놓기',
    avoidColor: '검정 일색의 어두운 공간',
    avoidPlace: '습하고 어두운 곳, 혼자 고립되는 환경',
    avoidFood: '짠 음식과 찬 음료의 과다',
    avoidHabit: '생각만 하고 움직이지 않기, 밤낮이 바뀐 생활',
    avoidShort: '고립과 밤샘',
  },
};

/** 필요한 기운(용신이 맡은 십성 그룹)을 채우는 습관·사람 */
const FILL: Record<TenGodGroup, { habit: string; people: string; routine: string }> = {
  비겁: { habit: '혼자 결정하고 끝까지 해 보는 경험, 체력을 기르는 운동', people: '같은 목표를 가진 동료, 편하게 기댈 친구', routine: '하루 한 가지, 남에게 묻지 않고 스스로 정하기' },
  식상: { habit: '일기·SNS·작은 발표처럼 생각을 밖으로 꺼내는 연습', people: '잘 웃고 말이 통하는 사람, 창작 모임', routine: '하루 세 줄, 느낀 점을 글로 적기' },
  재성: { habit: '가계부와 자동이체 저축, 성과를 숫자로 기록하기', people: '현실 감각 있는 사람, 꾸준히 재테크하는 사람', routine: '오늘 쓴 돈 세 줄로 기록하기' },
  관성: { habit: '스스로 정한 마감과 루틴, 작은 책임 맡아 보기', people: '규칙과 길을 알려 주는 선배·멘토', routine: '내일 할 일 세 가지를 정하고 자기' },
  인성: { habit: '책·강의·쉬는 시간을 일정에 먼저 넣기', people: '선생님·멘토처럼 배울 수 있는 어른', routine: '하루 20분 책 읽기' },
};

/** 넘치는 기운(가장 강하거나 부담되는 십성 그룹)에서 덜어 낼 습관·사람 */
const REDUCE: Record<TenGodGroup, { habit: string; people: string; routine: string }> = {
  비겁: { habit: '동업·보증·돈 빌려주기, 지기 싫어서 하는 경쟁', people: '돈 부탁이 잦은 사람, 경쟁심을 부추기는 사람', routine: '돈·보증 부탁엔 “생각해 볼게”로 하루 미루기' },
  식상: { habit: '윗사람 앞의 직언, 일을 한꺼번에 벌이기, 충동 퇴사', people: '남의 뒷말이 많은 모임', routine: '하고 싶은 말은 한 번 삼키고 다음 날 말하기' },
  재성: { habit: '한 방을 노리는 투자·대출, 일 중독', people: '고수익을 장담하는 사람', routine: '큰 지출은 24시간 뒤에 결정하기' },
  관성: { habit: '과로와 완벽주의, 모든 책임을 혼자 떠안기', people: '압박하고 통제하는 사람', routine: '퇴근 후 한 시간은 일 생각 끄기' },
  인성: { habit: '준비만 하다 미루기, 결정을 남에게 맡기기', people: '모든 걸 대신해 주는 과잉보호형 사람', routine: '준비가 70%면 일단 시작하기' },
};

const GROUPS: TenGodGroup[] = ['비겁', '식상', '재성', '관성', '인성'];
const GROUP_MEAN: Record<TenGodGroup, string> = { 비겁: '나를 지키는 힘', 식상: '표현하고 만드는 힘', 재성: '돈과 현실을 다루는 힘', 관성: '규칙과 책임의 힘', 인성: '배우고 쉬는 힘' };
const p0 = (n: number) => `${n.toFixed(0)}%`;
const el = (e: Element) => `${KIT[e].word}(${ELEMENT_HANJA[e]})`;
const elKo = (e: Element) => `${ELEMENT_KO[e]}(${ELEMENT_HANJA[e]})`;

/** 개운법 공통 재료 — 올해의 개운법과 고민별 개운법이 함께 쓴다 */
function ctxOf(a: SajuAnalysis) {
  const Y = a.yongsin;
  const need = Y.yongsin;
  const help = Y.heesin;
  const avoid = Y.gisin;
  const gp = a.elements.groupPercent;
  const ranked = [...GROUPS].sort((x, y) => gp[y] - gp[x]);
  const strongest = ranked[0];
  const weakest = ranked[4];
  const dayEl = STEMS[a.pillars.day.stem].element;
  // 채울 힘: 용신이 맡은 십성 그룹 (신약에게 식상을 늘리라고 하는 식의 모순을 막는다)
  const fillG = groupOfElement(dayEl, need);
  // 덜어 낼 힘: 가장 강한 그룹이 부담되는 기운이면 그것, 필요한 기운이면 기신이 맡은 그룹
  const strongRole = Y.roles[elementOfGroup(dayEl, strongest)];
  const cutG = strongRole === '용신' || strongRole === '희신' ? groupOfElement(dayEl, avoid) : strongest;
  return {
    Y,
    need,
    help,
    avoid,
    K: KIT[need],
    H: KIT[help],
    G: KIT[avoid],
    gp,
    strongest,
    weakest,
    fillG,
    cutG,
    fillBasis: `용신 ${elKo(need)} = ${fillG}${fillG === weakest ? ` ${p0(gp[fillG])}로 가장 약함` : ''}`,
    cutBasis: cutG === strongest ? `${strongest} ${p0(gp[strongest])}로 가장 강함` : `기신 ${elKo(avoid)} = ${cutG}`,
    strong: isStrong(a),
    strengthBasis: `${a.strength.level} ${p0(a.strength.score)}`,
    has: (n: string) => a.sinsal.some((s) => s.name.includes(n)),
    yBasis: `용신 ${elKo(need)} · 희신 ${elKo(help)}`,
    who: a.input.name ? `${a.input.name}님` : '당신',
  };
}

export function buildGaeun(a: SajuAnalysis): { data: GaeunData; story: StoryPara[]; headline: string } {
  const { Y, need, help, avoid, K, H, G, gp, strongest, weakest, fillG, cutG, fillBasis, cutBasis, strong, strengthBasis, has, yBasis } = ctxOf(a);
  const mb = a.pillars.month.branch;
  const winterCold = [11, 0, 1].includes(mb) && a.elements.percent.fire < 15;
  const summerHot = [5, 6, 7].includes(mb) && a.elements.percent.water < 15;

  // 왜 이 기운이 필요한가
  let why: string;
  if (Y.method === '조후') {
    why = `${BRANCHES[mb].hanja}월(${[11, 0, 1].includes(mb) ? '한겨울' : [5, 6, 7].includes(mb) ? '한여름' : '환절기'}) 태생이라 계절의 ${[11, 0, 1].includes(mb) ? '차가움' : '뜨거움'}을 먼저 풀어 줄 ${el(need)} 기운이 필요합니다.`;
  } else if (Y.method === '억부') {
    why = `사주가 ${a.strength.level}이라 ${strong ? '넘치는 힘을 밖으로 써 줄' : '부족한 힘을 채워 줄'} ${el(need)} 기운이 필요합니다.`;
  } else {
    why = `한쪽 기운이 매우 강한 특수한 구조라, 그 흐름을 거스르지 않는 ${el(need)} 기운이 필요합니다.`;
  }
  const whyBasis = Y.method === '조후' ? Y.johu.reason : Y.method === '억부' ? Y.eokbuReason : (Y.special ?? Y.method);

  // 가까이할 것
  const close: GaeunItem[] = [
    { key: 'color', icon: '色', label: '색', value: `${K.color} (희신 ${H.color.split('·')[0]}도 좋음)`, basis: yBasis, swatch: [...K.swatch, H.swatch[0]] },
    { key: 'place', icon: '方', label: '방향·장소', value: `${K.direction}. ${K.place}`, basis: `용신 ${elKo(need)}` },
    { key: 'time', icon: '時', label: '시간', value: K.time, basis: `용신 ${elKo(need)}` },
    { key: 'food', icon: '食', label: '음식', value: K.food, basis: `용신 ${elKo(need)}` },
    { key: 'items', icon: '物', label: '곁에 둘 물건', value: K.items, basis: `용신 ${elKo(need)}` },
    { key: 'number', icon: '數', label: '숫자', value: `${K.number} (희신 ${H.number})`, basis: yBasis },
    { key: 'people', icon: '人', label: '사람', value: `${FILL[fillG].people}. 그리고 ${K.people}`, basis: fillBasis },
    { key: 'habit', icon: '習', label: '습관', value: `${FILL[fillG].habit}. ${strong ? '그리고 땀 흘리는 운동처럼 힘을 밖으로 쓰는 일' : '그리고 충분한 휴식과 도움 받기'}`, basis: `${fillBasis} · ${a.strength.level}` },
    { key: 'field', icon: '業', label: '잘 맞는 분야', value: ELEMENT_JOBS[need].slice(0, 4).join(', '), basis: `용신 ${elKo(need)}` },
  ];
  if (winterCold) close.push({ key: 'warm', icon: '暖', label: '온기', value: '몸을 따뜻하게 — 따뜻한 차, 반신욕, 한낮의 햇볕', basis: `${BRANCHES[mb].hanja}월생 · 화 ${p0(a.elements.percent.fire)}` });
  if (summerHot) close.push({ key: 'cool', icon: '潤', label: '수분', value: '물과 잠으로 열을 식히기 — 물 자주 마시기, 충분한 수면', basis: `${BRANCHES[mb].hanja}월생 · 수 ${p0(a.elements.percent.water)}` });
  if (has('역마')) close.push({ key: 'move', icon: '馬', label: '이동', value: '여행·출장·이사처럼 움직일 때 기회가 열려요. 막힐 때는 장소를 바꿔 보세요', basis: '역마살' });
  if (has('천을귀인')) close.push({ key: 'noble', icon: '貴', label: '귀인', value: '혼자 버티지 말고 윗사람·선배에게 먼저 도움을 청하세요. 돕는 사람이 나타나는 사주예요', basis: '천을귀인' });
  if (has('화개')) close.push({ key: 'solo', icon: '蓋', label: '혼자만의 시간', value: '종교·예술·명상·깊은 공부처럼 혼자 몰입하는 시간이 마음을 채워 줘요', basis: '화개살' });

  // 멀리할 것
  const away: GaeunItem[] = [
    { key: 'env', icon: '處', label: '환경', value: `${G.avoidPlace}, ${G.avoidColor}`, basis: `기신 ${elKo(avoid)}` },
    { key: 'food', icon: '食', label: '음식', value: G.avoidFood, basis: `기신 ${elKo(avoid)}` },
    { key: 'habit', icon: '習', label: '습관', value: `${REDUCE[cutG].habit}. 그리고 ${G.avoidHabit}`, basis: `${cutBasis} · 기신 ${elKo(avoid)}` },
    { key: 'people', icon: '人', label: '사람', value: REDUCE[cutG].people, basis: cutBasis },
    strong
      ? { key: 'stuck', icon: '滯', label: '고인 물', value: '혼자 고집하며 같은 자리만 지키기 — 힘이 센 사주는 쓰지 않으면 탈이 나요', basis: strengthBasis }
      : { key: 'over', icon: '勞', label: '무리', value: '무리한 확장과 과로, 감당 못 할 약속 — 힘이 약한 사주는 채우는 것이 먼저예요', basis: strengthBasis },
  ];
  if (has('도화') || has('홍염')) away.push({ key: 'romance', icon: '花', label: '구설', value: '충동적인 만남과 이성 관계의 구설 — 매력이 큰 만큼 선을 분명히', basis: '도화·홍염' });

  // 올해의 개운 포인트
  const y = a.seun.find((s) => s.year === a.currentSajuYear) ?? null;
  const tti = ttiOf(a);
  let year: GaeunData['year'] = null;
  if (y) {
    const yEls = [STEMS[y.pillar.stem].element, STEMS[mainStemOf(y.pillar.branch)].element];
    const goodRole = (r: string) => r === '용신' || r === '희신';
    const badRole = (r: string) => r === '기신' || r === '구신';
    const goodCnt = [y.stemRole, y.branchRole].filter(goodRole).length;
    const badCnt = [y.stemRole, y.branchRole].filter(badRole).length;
    const tone: 'good' | 'neutral' | 'bad' = goodCnt > badCnt ? 'good' : badCnt > goodCnt ? 'bad' : 'neutral';
    // 천간·지지가 같은 오행이면 한 번만 쓴다 (예: 丙午년 → 화(火))
    const pick = (role: (r: string) => boolean, fallback: Element) => [...new Set(yEls.filter((e) => role(a.yongsin.roles[e])))].map(el).join('·') || el(fallback);
    const parts = [
      tone === 'good'
        ? `${y.year}년은 필요한 ${pick(goodRole, need)} 기운이 들어오는 해예요. 미뤄 둔 일을 시작하기 좋아요.`
        : tone === 'bad'
          ? `${y.year}년은 부담되는 ${pick(badRole, avoid)} 기운이 강한 해예요. 위의 ‘가까이할 것’을 평소보다 더 챙기세요.`
          : `${y.year}년은 좋고 나쁜 기운이 섞인 해예요. 큰 변화보다 생활의 균형을 지키는 것이 개운이에요.`,
    ];
    const { samjae, relation } = tti.thisYear;
    const helped = relation === '육합' || relation === '삼합';
    if (samjae && helped) parts.push(`띠로 보면 ${samjae}지만 올해 띠와 ${josa(relation, '이/가')} 받쳐 주는 해라, 큰 계약·보증만 한 번 더 확인하면 돼요.`);
    else if (samjae) parts.push(`띠로 보면 ${josa(samjae, '이라/라')} 큰 계약·보증은 한 번 더 확인하세요.`);
    else if (relation === '충') parts.push('띠로 보면 올해 띠와 충이 되는 해라 이사·이직 같은 큰 변화는 서두르지 마세요.');
    else if (relation === '원진') parts.push('띠로 보면 올해 띠와 원진이라 가까운 사람과의 말을 조심하면 좋아요.');
    else if (helped) parts.push(`띠로도 올해 띠와 ${josa(relation, '이라/라')} 사람의 도움을 받기 좋아요.`);
    year = { title: `${y.year}년의 개운 포인트`, text: parts.join(' '), tone, basis: `${y.year}년 세운 ${y.stemTenGod}(${y.stemRole})·${y.branchTenGod}(${y.branchRole}) · ${tti.name} ${tti.thisYear.line}` };
  }

  // 오늘부터 하는 세 가지
  const routine = [
    { text: K.routine, basis: `용신 ${elKo(need)}` },
    { text: FILL[fillG].routine, basis: `용신 = ${fillG}` },
    { text: REDUCE[cutG].routine, basis: cutG === strongest ? `${cutG} 과다` : `기신 = ${cutG}` },
  ];
  // 힘의 균형 습관 — 앞의 세 가지와 겹치지 않는 것으로 (예: 수 용신의 '밤 11시…'와 신약의 '밤 11시…')
  const balance = strong ? ['하루 30분, 땀이 날 만큼 몸 움직이기', '일주일에 한 번, 안 해 본 일 해 보기'] : ['밤 11시 전에 잠들기', '주말 반나절은 약속 없이 쉬기'];
  routine.push({ text: balance.find((t) => !routine.some((r) => r.text.slice(0, 5) === t.slice(0, 5))) ?? balance[1], basis: a.strength.level });

  const headline = `${josa(el(need), '을/를')} 가까이, ${josa(el(avoid), '은/는')} 멀리 — ${josa(K.short, '은/는')} 늘리고 ${josa(G.avoidShort, '은/는')} 줄이기`;

  const who = a.input.name ? `${a.input.name}님` : '당신';
  const story: StoryPara[] = [
    {
      title: '내 사주에 필요한 기운',
      text: `${why} 개운법은 부적이나 비싼 물건이 아니라, 매일의 작은 선택으로 부족한 기운을 채우고 넘치는 기운을 덜어 내는 생활 습관입니다. ${who}에게는 ${josa(el(need), '이/가')} 가장 필요하고, ${josa(el(help), '이/가')} 그 기운을 도우며, ${josa(el(avoid), '은/는')} 지나치면 균형을 무너뜨립니다.`,
      basis: `${Y.method} · ${whyBasis}`,
    },
    {
      title: '가까이할 것',
      text: `생활 공간에는 ${K.color} 계열을 한두 군데 들이고, ${K.items} 같은 물건을 곁에 두세요. 하루 중에는 ${K.time.split(' — ')[0]} 시간이 ${who}의 편입니다. 마음이 답답할 때는 ${josa(K.place, '을/를')} 찾아가 보세요. 식탁에는 ${josa(K.food, '이/가')} 잘 맞습니다. 습관으로는 ${josa(FILL[fillG].habit, '이/가')} 가장 효과적입니다. 필요한 ${el(need)} 기운이 ${who}에게는 ${fillG}, 곧 ‘${GROUP_MEAN[fillG]}’이기 때문입니다.${fillG === weakest ? ` 실제로 사주에서 ${fillG}(${p0(gp[fillG])})이 가장 약해, 채울수록 막힌 곳이 풀립니다.` : ''}`,
      basis: `${yBasis} · ${fillBasis}`,
    },
    {
      title: '멀리할 것',
      text: `${el(avoid)} 기운이 지나치면 균형이 무너지는 사주라, ${G.avoidPlace}에 오래 머물지 않는 것이 좋습니다. 음식은 ${josa(G.avoidFood, '을/를')} 조심하세요. 습관 중에는 ${josa(REDUCE[cutG].habit, '을/를')} 가장 경계해야 합니다. ${cutG === strongest ? `가장 강한 기운인 ${strongest}(${p0(gp[strongest])})이 넘칠 때` : `부담되는 ${el(avoid)} 기운이 ${who}에게는 ${cutG}에 해당해, 이 힘이 넘칠 때`} 생기기 쉬운 일이기 때문입니다. ${strong ? '힘이 센 사주는 쓰지 않고 쌓아 두면 고집과 답답함이 되니, 혼자 버티기보다 밖으로 움직이세요.' : '힘이 약한 사주는 무리할수록 손에 남는 것이 줄어드니, 감당할 만큼만 약속하세요.'}`,
      basis: `기신 ${elKo(avoid)} · ${cutBasis} · ${a.strength.level}`,
    },
    {
      title: '사람으로 여는 운',
      text: `곁에 두면 좋은 사람은 ${FILL[fillG].people}, 그리고 ${K.people}입니다. 반대로 ${josa(REDUCE[cutG].people, '과/와')}는 거리를 두세요. 띠로는 ${tti.best.join('·')}와 잘 맞고, ${tti.caution.join('·')}와는 부딪히기 쉬운 편입니다.${has('천을귀인') ? ' 사주에 천을귀인이 있어, 어려울 때 먼저 손을 내밀면 돕는 사람이 나타납니다.' : ''}`,
      basis: `${fillBasis} · ${cutBasis} · ${tti.name}`,
    },
  ];
  if (year) story.push({ title: year.title, text: year.text, basis: year.basis });
  story.push({
    title: '오늘부터 할 수 있는 네 가지',
    text: routine.map((r, i) => `${i + 1}) ${r.text}`).join('. ') + '. 거창한 결심보다 이 작은 습관을 3주만 이어 가 보세요. 기운의 균형은 꾸준함에 비례합니다.',
    basis: routine.map((r) => r.basis).join(' · '),
  });

  return { data: { need, help, avoid, why, close, away, routine, year }, story, headline };
}

// ---------------------------------------------------------------------------
// 고민별 개운법 — 뿌리는 같은 용신이지만, 고민마다 그 기운을 쓰는 자리가 다르다
//  - 이직·진로: 일하는 자리·중요한 날·잘 맞는 분야, 일에서 채울 힘(용신의 십성)
//  - 연애·결혼: 만남·데이트 장소와 색, 띠, 끌림의 별(도화·홍염), 배우자를 뜻하는 기운
//  - 돈: 돈 버는 길(용신의 십성), 지갑 색·자동이체 날짜, 새는 길(넘치는 십성)
//  - 시험·합격: 공부 시간·자리·필기구, 문창귀인, 공부를 막는 습관
//  - 올해 운세: 생활 전체의 가까이할 것·멀리할 것 + 올해의 개운 포인트 + 루틴
// 고민 리포트 무료 부분에는 taste 하나만, 나머지는 상세 리포트에 넣는다.
// ---------------------------------------------------------------------------
export type GaeunConcern = 'career' | 'love' | 'money' | 'exam' | 'year';
type Status = 'single' | 'dating' | 'married';

export interface ConcernGaeun {
  /** 예: 돈이 머무는 개운법 */
  title: string;
  /** 이 고민에서 필요한 기운이 하는 일 */
  why: string;
  /** 무료 부분에서 먼저 보여 주는 한 가지 (가까이할 것이나 멀리할 것 가운데 하나) */
  taste: GaeunItem;
  close: GaeunItem[];
  away: GaeunItem[];
  /** 매일 체크하는 루틴 */
  routine: { text: string; basis: string }[];
  /** 올해의 개운 포인트 (올해 운세만) */
  year?: GaeunData['year'];
}

/** 일·공부 자리 */
const DESK: Record<Element, string> = {
  wood: '동쪽 창가나 동쪽을 바라보는 자리, 곁에 화분 하나',
  fire: '볕이 잘 드는 남향 자리, 밝은 조명 아래',
  earth: '등 뒤가 벽인 안정된 자리, 자주 옮기지 않는 고정석',
  metal: '서쪽을 향한 정돈된 자리, 책상 위는 꼭 필요한 것만',
  water: '북쪽의 조용한 자리, 물병 하나를 곁에',
};

// 이직·진로 ------------------------------------------------------------------
const WORK_TIME: Record<Element, string> = {
  wood: '오전 — 새 일의 시작과 중요한 미팅은 오전에',
  fire: '한낮 — 발표·협상은 점심 전후의 밝은 시간에',
  earth: '늘 같은 시간 — 마감과 회의 시간을 일정하게 지킬 때 힘이 나요',
  metal: '오후 늦게 — 결정과 마무리는 하루를 정리하는 시간에',
  water: '조용한 시간 — 기획·분석처럼 생각하는 일은 이른 아침이나 저녁에 (밤샘은 빼고)',
};
const WORK_AVOID: Record<Element, string> = {
  wood: '일이 끝없이 불어나는 조직, 벌여 놓은 프로젝트만 많은 곳',
  fire: '과열된 실적 경쟁, 늘 시끄럽고 급한 분위기',
  earth: '몇 년째 아무것도 바뀌지 않는 답답한 자리',
  metal: '규칙만 있고 숨 쉴 틈 없는 조직',
  water: '혼자 고립되는 자리, 밤낮이 바뀌는 근무',
};
const WORK_FILL: Record<TenGodGroup, string> = {
  비겁: '혼자 맡아 끝까지 해내는 일을 하나 만들기 — 내 이름이 걸린 결과물',
  식상: '결과물을 밖으로 보여 주기 — 포트폴리오·발표·사내 공유',
  재성: '성과를 숫자로 남기기 — 매달 한 줄 성과 기록',
  관성: '스스로 마감을 정하고 지키기, 작은 책임부터 맡아 보기',
  인성: '자격증·강의처럼 배우는 시간을 일정에 먼저 넣기',
};
const WORK_PEOPLE: Record<TenGodGroup, string> = {
  비겁: '같은 목표를 가진 동료, 함께 버텨 줄 동기',
  식상: '내 생각을 끝까지 들어 주는 동료와 후배',
  재성: '현실 감각 있는 선배, 거래처와 고객',
  관성: '길을 알려 주는 상사·멘토',
  인성: '배울 수 있는 선배, 업계의 스승',
};
const WORK_CUT: Record<TenGodGroup, string> = {
  비겁: '동료와의 기 싸움, 동업 제안에 바로 응하기',
  식상: '윗사람 앞의 직언, 홧김의 퇴사',
  재성: '연봉만 보고 옮기기, 쉬는 날 없는 일 중독',
  관성: '모든 책임을 혼자 떠안기, 연달아 이어지는 야근',
  인성: '준비만 하다 기회를 놓치기, 결정을 남에게 미루기',
};
const WORK_ROUTINE_FILL: Record<TenGodGroup, string> = {
  비겁: '하루 한 가지, 내 판단으로 끝낸 일 적기',
  식상: '퇴근 전 5분, 오늘 만든 것 한 줄 기록하기',
  재성: '퇴근 전 5분, 오늘 낸 성과를 숫자로 한 줄',
  관성: '내일 할 일 세 가지를 정하고 퇴근하기',
  인성: '출퇴근길 20분, 일에 필요한 공부',
};
const WORK_ROUTINE_CUT: Record<TenGodGroup, string> = {
  비겁: '동업·보증 제안엔 “생각해 볼게”로 하루 미루기',
  식상: '하고 싶은 말은 한 번 삼키고 다음 날 말하기',
  재성: '이직 제안은 연봉 말고 일·사람·배움 세 가지로 비교하기',
  관성: '퇴근 후 한 시간은 일 생각 끄기',
  인성: '준비가 70%면 일단 지원하기',
};

// 연애·결혼 ------------------------------------------------------------------
const DATE_PLACE: Record<Element, string> = {
  wood: '공원·수목원·숲길 산책, 함께 배우는 원데이 클래스',
  fire: '햇빛 좋은 야외, 공연·전시처럼 활기찬 곳',
  earth: '익숙한 동네의 단골 식당, 함께 요리하는 집 데이트',
  metal: '깔끔한 카페, 전망 좋은 높은 곳, 조용한 미술관',
  water: '바다·강변·호숫가, 조용한 북카페',
};
const DATE_AVOID: Record<Element, string> = {
  wood: '일정이 빽빽한 데이트, 서로 바빠 쫓기듯 하는 만남',
  fire: '시끄럽고 자극적인 곳, 술자리에서 이어지는 만남',
  earth: '늘 같은 곳만 가는 데이트, 집에만 머무는 만남',
  metal: '각자 휴대폰만 보는 자리, 잘잘못을 따지는 대화',
  water: '늦은 밤의 긴 연락, 감정이 깊어지는 새벽 대화',
};
const LOVE_FILL: Record<TenGodGroup, string> = {
  비겁: '상대에게 다 맞추지 말고 내 생활 지키기 — 나다울 때 매력이 살아나요',
  식상: '마음을 말로 꺼내기 — 고마움과 서운함을 그날 짧게',
  재성: '함께할 계획을 구체적으로 — 여행·저축처럼 날짜와 숫자가 있는 약속',
  관성: '작은 약속 지키기 — 연락 시간·기념일 같은 약속이 신뢰가 돼요',
  인성: '먼저 챙기기 — 받기만 하는 관계가 되지 않게',
};
const LOVE_CUT: Record<TenGodGroup, string> = {
  비겁: '지기 싫어서 이어 가는 말다툼, 친구 연애와 비교하기',
  식상: '홧김에 하는 말, 상대를 고치려는 잔소리',
  재성: '조건과 계산이 앞서는 만남',
  관성: '서로를 통제하거나, 체면 때문에 참기만 하기',
  인성: '상대에게 기대기만 하기, 중요한 결정을 미루기',
};
const LOVE_ROUTINE: Record<Status, string> = {
  single: '한 달에 한 번, 새로운 모임이나 자리에 나가기',
  dating: '일주일에 한 번, 휴대폰 내려놓고 30분 대화하기',
  married: '한 달에 한 번, 일·아이 이야기 없이 둘만의 시간',
};
const LOVE_ROUTINE_FILL: Record<TenGodGroup, string> = {
  비겁: '일주일에 하루는 내 취미에 쓰기',
  식상: '서운한 일은 그날 안에 한 줄로 말하기',
  재성: '함께할 계획 하나를 날짜까지 정하기',
  관성: '연락하기로 한 시간은 꼭 지키기',
  인성: '하루 한 번, 먼저 안부 묻기',
};
const LOVE_ROUTINE_CUT: Record<TenGodGroup, string> = {
  비겁: '다툼이 길어지면 이기려 하지 말고 “오늘은 여기까지” 하기',
  식상: '하고 싶은 말은 한 번 삼키고 다음 날 말하기',
  재성: '상대의 좋았던 점 하나를 그날 말해 주기',
  관성: '상대의 일정·연락을 확인하고 싶을 때 한 번 쉬어 가기',
  인성: '미뤄 둔 결정 하나에 날짜 정하기',
};

// 돈 -----------------------------------------------------------------------
const MONEY_FILL: Record<TenGodGroup, string> = {
  비겁: '내 기술과 체력으로 버는 돈 — 몸값을 올리는 쪽이 빨라요',
  식상: '재능을 파는 돈 — 만들고 알릴수록 돈이 따라와요',
  재성: '관리로 불리는 돈 — 가계부·자동이체·나눠 담기',
  관성: '조직 안에서 쌓는 돈 — 월급·승진·장기 적금',
  인성: '자격과 지식으로 버는 돈 — 공부가 몸값이 되는 길',
};
const MONEY_TIME: Record<Element, string> = {
  wood: '오전에, 메모하며 — 새 투자는 공부부터',
  fire: '한낮에, 밝은 곳에서 — 분위기에 휩쓸린 밤의 결정은 피하기',
  earth: '매달 정한 날에 몰아서 — 그때그때 결정하지 않기',
  metal: '저녁에 하루를 정리하며 — 숫자를 두 번 확인',
  water: '하룻밤 자고 다음 날 — 조용히 따져 본 뒤에',
};
const MONEY_CUT: Record<TenGodGroup, string> = {
  비겁: '동업·보증·돈 빌려주기 — 형제·친구 사이의 돈거래',
  식상: '기분 따라 쓰는 지출, 한꺼번에 벌이는 부업',
  재성: '한 방을 노리는 투자·대출',
  관성: '체면 지출 — 경조사·접대·명품',
  인성: '배우는 데만 쓰고 수입으로 잇지 못하기, 돈 관리를 남에게 맡기기',
};
const MONEY_PEOPLE: Record<TenGodGroup, string> = {
  비겁: '돈 부탁이 잦은 사람',
  식상: '같이 지르자고 부추기는 사람',
  재성: '고수익을 장담하는 사람',
  관성: '체면을 앞세우는 모임',
  인성: '돈 관리를 대신해 주겠다는 사람',
};
const MONEY_ROUTINE_CUT: Record<TenGodGroup, string> = {
  비겁: '돈 부탁엔 “생각해 볼게”로 하루 미루기',
  식상: '사고 싶은 건 장바구니에 넣고 하루 뒤에 결정하기',
  재성: '투자 정보는 하루 묵혀 두고 다시 보기',
  관성: '경조사·모임 지출은 이번 달 한도 안에서만',
  인성: '오늘 배운 것 하나를 돈 버는 일과 이어 보기',
};

// 시험·합격 ------------------------------------------------------------------
const STUDY_TIME: Record<Element, string> = {
  wood: '아침 — 일어나서 두 시간이 가장 잘 들어가요',
  fire: '오전부터 한낮 — 어려운 과목은 밝을 때',
  earth: '매일 같은 시간 — 시간표를 지킬수록 머리에 남아요',
  metal: '저녁 — 하루를 정리하는 복습이 잘 맞아요',
  water: '밤에 집중이 잘 되지만 11시 전에는 자기 — 잠이 곧 암기예요',
};
const STUDY_AVOID: Record<Element, string> = {
  wood: '새 교재를 자꾸 사고 과목을 한꺼번에 벌이기',
  fire: '밤샘 벼락치기와 카페인 과다',
  earth: '걱정만 하며 미루기, 공부 중 과식',
  metal: '처음부터 완벽한 노트 만들기, 틀린 문제에 자책하기',
  water: '생각만 하고 손이 안 움직이기, 밤낮이 바뀐 생활',
};
const STUDY_FILL: Record<TenGodGroup, string> = {
  비겁: '스터디로 함께 달리기 — 진도를 서로 확인하면 끝까지 가요',
  식상: '말로 설명하며 외우기 — 남에게 가르치듯 정리하기',
  재성: '목표 점수를 숫자로 쪼개기 — 하루 분량을 정량으로',
  관성: '시간표와 모의고사로 규칙 만들기 — 실전처럼 연습하기',
  인성: '개념 강의를 듣고 노트로 정리하기 — 이해부터 채우기',
};
const STUDY_CUT: Record<TenGodGroup, string> = {
  비겁: '남과 비교하며 조급해지기, 지기 싫어 세운 무리한 계획',
  식상: '공부 중 휴대폰·SNS, 이 과목 저 과목 옮겨 다니기',
  재성: '아르바이트·돈 일로 공부 시간을 내주기',
  관성: '완벽하게 하려다 진도를 못 나가기',
  인성: '강의만 듣고 문제는 안 풀기 — 준비만 하는 공부',
};
const STUDY_ROUTINE_FILL: Record<TenGodGroup, string> = {
  비겁: '하루 한 번, 스터디원과 진도 확인하기',
  식상: '하루 10분, 오늘 배운 것을 소리 내어 설명하기',
  재성: '하루 분량을 숫자로 정하고 체크하기',
  관성: '하루 한 번, 시간을 재고 문제 풀기',
  인성: '하루 20분, 오답 노트 정리하기',
};
const STUDY_ROUTINE_EL: Record<Element, string> = {
  wood: '아침에 일어나 10분, 어제 외운 것 떠올리기',
  fire: '공부 전 10분, 햇볕 쬐며 걷기',
  earth: '매일 같은 시간에 책상 앞에 앉기',
  metal: '공부 시작 전 5분, 책상 정리하기',
  water: '자기 전 10분, 오늘 외운 것 훑어보기',
};

/** 앞의 루틴과 겹치지 않는 힘의 균형 습관 하나 */
function balanceRoutine(strong: boolean, before: { text: string }[], basis: string) {
  const pool = strong ? ['하루 30분, 땀이 날 만큼 몸 움직이기', '일주일에 한 번, 안 해 본 일 해 보기'] : ['밤 11시 전에 잠들기', '주말 반나절은 약속 없이 쉬기'];
  return { text: pool.find((t) => !before.some((r) => r.text.slice(0, 5) === t.slice(0, 5))) ?? pool[1], basis };
}

const stuckOrOver = (strong: boolean, basis: string, stuck: string, over: string): GaeunItem =>
  strong ? { key: 'stuck', icon: '滯', label: '혼자 버티기', value: stuck, basis } : { key: 'over', icon: '勞', label: '무리', value: over, basis };

export function concernGaeun(id: GaeunConcern, a: SajuAnalysis, opt: { love?: Status } = {}): ConcernGaeun {
  const c = ctxOf(a);
  const { need, avoid, K, H, gp, fillG, cutG, fillBasis, cutBasis, strong, strengthBasis, has, yBasis, who } = c;
  const needBasis = `용신 ${elKo(need)}`;
  const avoidBasis = `기신 ${elKo(avoid)}`;
  const helpColor = H.color.split('·')[0];
  const tti = ttiOf(a);
  const pick = (list: GaeunItem[], key: string) => list.find((x) => x.key === key) ?? list[0];

  if (id === 'year') {
    const { data } = buildGaeun(a);
    return {
      title: '올해의 개운법',
      why: data.why.replace(/필요합니다\.$/, '필요해요.'),
      taste: { key: 'routine', icon: '習', label: '오늘부터 한 가지', value: data.routine[0].text, basis: data.routine[0].basis },
      close: data.close,
      away: data.away,
      routine: data.routine,
      year: data.year,
    };
  }

  if (id === 'career') {
    const noble = has('천을귀인');
    const close: GaeunItem[] = [
      { key: 'desk', icon: '方', label: '일하는 자리', value: DESK[need], basis: needBasis },
      { key: 'color', icon: '色', label: '면접·발표 날', value: `${K.color} 가운데 한 가지를 작게 — 넥타이·스카프·시계줄처럼 (희신 ${helpColor}도 좋아요)`, basis: yBasis },
      { key: 'time', icon: '時', label: '중요한 일', value: WORK_TIME[need], basis: needBasis },
      { key: 'field', icon: '業', label: '잘 맞는 분야', value: `${ELEMENT_JOBS[need].slice(0, 4).join(', ')} — 옮긴다면 이쪽 분야나 역할부터`, basis: needBasis },
      { key: 'habit', icon: '習', label: '채울 힘', value: WORK_FILL[fillG], basis: fillBasis },
      { key: 'people', icon: '人', label: '도와줄 사람', value: `${WORK_PEOPLE[fillG]}${noble ? '. 사주에 천을귀인이 있어, 막힐 때 윗사람에게 먼저 물으면 길이 열려요' : ''}`, basis: noble ? `${fillBasis} · 천을귀인` : fillBasis },
    ];
    if (has('역마')) close.push({ key: 'move', icon: '馬', label: '이동', value: '출장·외근·이동이 있는 일에서 기회가 열려요. 막히면 부서나 근무지를 바꾸는 것도 방법이에요', basis: '역마살' });
    if (has('문창')) close.push({ key: 'doc', icon: '文', label: '문서', value: '글·보고서·자료로 실력을 보여 줄 때 인정받기 쉬워요', basis: '문창귀인' });
    if (has('화개')) close.push({ key: 'depth', icon: '蓋', label: '전문성', value: '혼자 깊이 파고드는 전문 분야에서 오래 빛나요', basis: '화개살' });
    const away: GaeunItem[] = [
      { key: 'habit', icon: '習', label: '덜어 낼 것', value: WORK_CUT[cutG], basis: cutBasis },
      { key: 'env', icon: '處', label: '피할 일터', value: WORK_AVOID[avoid], basis: avoidBasis },
      stuckOrOver(strong, strengthBasis, '한자리에서 혼자 고집하기 — 힘이 센 사주는 움직여야 풀려요', '감당 못 할 일을 떠안고 야근을 이어 가기 — 힘이 약한 사주는 채우는 것이 먼저예요'),
    ];
    if (tti.thisYear.relation === '충') away.push({ key: 'tti', icon: '支', label: '올해 띠', value: '올해는 띠와 충이 되는 해라, 이직과 이사를 한꺼번에 하지 마세요', basis: `${tti.name} · ${tti.thisYear.line}` });
    const routine = [
      { text: WORK_ROUTINE_FILL[fillG], basis: fillBasis },
      { text: WORK_ROUTINE_CUT[cutG], basis: cutBasis },
    ];
    routine.push(balanceRoutine(strong, routine, a.strength.level));
    const WORK_WHY: Record<TenGodGroup, string> = {
      비겁: '내 힘으로 해낸 경험이 쌓일수록 자리가 단단해지는 사주예요.',
      식상: '만든 것을 보여 줄수록 기회가 오는 사주라, 결과물을 숨기지 마세요.',
      재성: '성과가 숫자로 보일 때 인정받는 사주라, 실적을 기록해 두세요.',
      관성: '필요한 기운이 곧 직장과 자리의 기운이라, 맡은 일을 해내는 만큼 운이 열려요.',
      인성: '필요한 기운이 배움의 기운이라, 자격과 공부가 곧 이직 준비예요.',
    };
    const extra = ` ${WORK_WHY[fillG]}`;
    return {
      title: '일이 풀리는 개운법',
      why: `${who}에게 필요한 ${el(need)} 기운은 일에서 ‘${GROUP_MEAN[fillG]}’(${fillG})으로 나타나요. 이 힘을 일터에 들일수록 막힌 흐름이 풀려요.${extra}`,
      taste: pick(close, 'desk'),
      close,
      away,
      routine,
    };
  }

  if (id === 'love') {
    const status = opt.love ?? 'single';
    const single = status === 'single';
    const spouse: TenGodGroup = a.input.gender === 'male' ? '재성' : '관성';
    const charm = has('도화') || has('홍염');
    const close: GaeunItem[] = [
      { key: 'color', icon: '色', label: '데이트 색', value: `${K.color} — 옷이나 소품에 한 가지 (희신 ${helpColor}도 좋아요)`, basis: yBasis },
      { key: 'place', icon: '方', label: single ? '만남의 장소' : '데이트 장소', value: DATE_PLACE[need], basis: needBasis },
      { key: 'habit', icon: '習', label: '채울 힘', value: LOVE_FILL[fillG], basis: fillBasis },
    ];
    if (single) {
      close.push({ key: 'tti', icon: '支', label: '잘 맞는 띠', value: tti.best.join('·'), basis: `${tti.name} · 삼합·육합` });
      close.push(
        charm
          ? { key: 'charm', icon: '花', label: '끌림', value: '매력이 눈에 띄는 사주예요. 첫인상보다 오래 보는 자리(동호회·스터디)에서 진짜 인연을 알아보기 쉬워요', basis: '도화·홍염' }
          : { key: 'charm', icon: '花', label: '만남의 자리', value: '끌림의 별(도화)이 약한 편이라, 소개·모임처럼 만남의 자리를 내가 만들 때 인연이 와요', basis: '도화·홍염 없음' },
      );
      if (has('천을귀인')) close.push({ key: 'noble', icon: '貴', label: '소개', value: '주변 사람이 이어 주는 인연이 좋은 사주예요. 소개를 마다하지 마세요', basis: '천을귀인' });
    }
    const away: GaeunItem[] = [
      { key: 'habit', icon: '習', label: '덜어 낼 것', value: LOVE_CUT[cutG], basis: cutBasis },
      { key: 'env', icon: '處', label: '피할 만남', value: DATE_AVOID[avoid], basis: avoidBasis },
    ];
    if (single) away.push({ key: 'tti', icon: '支', label: '조심할 띠', value: `${tti.caution.join('·')} — 끌려도 부딪히기 쉬운 짝이라 천천히`, basis: `${tti.name} · 충·원진` });
    if (charm) away.push({ key: 'romance', icon: '花', label: '구설', value: single ? '애매한 관계를 오래 끌기, 충동적인 만남 — 매력이 큰 만큼 선을 분명히' : '이성과의 애매한 거리 — 매력이 큰 만큼 선을 분명히', basis: '도화·홍염' });
    const routine = [
      { text: LOVE_ROUTINE[status], basis: '지금 상태' },
      { text: LOVE_ROUTINE_FILL[fillG], basis: fillBasis },
      { text: LOVE_ROUTINE_CUT[cutG], basis: cutBasis },
    ];
    const extra =
      fillG === spouse
        ? ` 필요한 기운이 곧 배우자를 뜻하는 기운(${spouse})이라, 좋은 인연이 운까지 함께 끌어올리는 사주예요.`
        : ` 배우자를 뜻하는 기운은 ${spouse}이지만, 내 균형을 먼저 맞출 때 좋은 인연을 알아보기 쉬워요.`;
    return {
      title: single ? '인연을 위한 개운법' : status === 'dating' ? '관계를 다지는 개운법' : '부부를 위한 개운법',
      why: `연애에서 ${el(need)} 기운은 ‘${GROUP_MEAN[fillG]}’이에요.${extra}`,
      taste: pick(close, 'color'),
      close,
      away,
      routine,
    };
  }

  if (id === 'money') {
    const days = K.number
      .split(' · ')
      .map((n) => `${n}일`)
      .join('이나 ');
    const close: GaeunItem[] = [
      { key: 'earn', icon: '財', label: '돈 버는 길', value: MONEY_FILL[fillG], basis: fillBasis },
      { key: 'wallet', icon: '色', label: '지갑 색', value: `지갑과 카드 지갑은 ${K.color} 계열로 (희신 ${helpColor}도 좋아요)`, basis: yBasis },
      { key: 'number', icon: '數', label: '자동이체 날', value: `저축 자동이체는 매달 ${days}에 — 쓰고 남은 돈이 아니라 먼저 떼어 두는 돈으로`, basis: `${needBasis} · 숫자 ${K.number}` },
      { key: 'time', icon: '時', label: '큰돈 결정', value: MONEY_TIME[need], basis: needBasis },
    ];
    if (has('역마')) close.push({ key: 'move', icon: '馬', label: '움직이는 돈', value: '출장·무역·온라인 판매처럼 움직이며 버는 일에 돈이 붙어요', basis: '역마살' });
    if (has('천을귀인')) close.push({ key: 'noble', icon: '貴', label: '돈 상담', value: '돈 문제는 혼자 끙끙대지 말고 믿을 만한 윗사람에게 먼저 물어보세요', basis: '천을귀인' });
    const away: GaeunItem[] = [
      { key: 'leak', icon: '漏', label: '새는 길', value: MONEY_CUT[cutG], basis: cutBasis },
      { key: 'people', icon: '人', label: '멀리할 사람', value: MONEY_PEOPLE[cutG], basis: cutBasis },
      stuckOrOver(strong, strengthBasis, '현금을 쌓아 두기만 하기 — 힘이 센 사주는 공부한 만큼 굴려야 불어나요', '감당 못 할 대출과 빚투 — 힘이 약한 사주는 지키는 돈이 먼저예요'),
    ];
    if (cutG !== '비겁' && gp['비겁'] >= 30) away.push({ key: 'rival', icon: '比', label: '돈거래', value: '형제·친구와의 돈거래와 보증 — 나눠 쓰다 새기 쉬운 사주예요', basis: `비겁 ${p0(gp['비겁'])}` });
    const routine = [
      { text: '오늘 쓴 돈 세 줄로 기록하기', basis: '재성 — 돈을 다루는 습관' },
      { text: MONEY_ROUTINE_CUT[cutG], basis: cutBasis },
      { text: '지갑 속 영수증은 그날 비우기', basis: '새는 돈 확인' },
    ];
    const extra =
      fillG === '재성'
        ? ' 필요한 기운이 곧 돈의 기운이라, 돈을 다루는 습관이 그대로 개운이 돼요.'
        : fillG === '식상'
          ? ' 재능의 기운(식상)이 돈의 기운(재성)을 낳으니, 만들고 알리는 일이 돈으로 이어져요.'
          : fillG === '비겁'
            ? ' 내 힘이 받쳐 줘야 돈을 감당할 수 있는 사주라, 체력과 기술이 먼저예요.'
            : fillG === '관성'
              ? ' 자리와 신용이 돈을 지켜 주는 사주라, 안정된 수입이 먼저예요.'
              : ' 배움이 돈이 되는 사주라, 자격과 지식에 쓰는 돈은 아끼지 마세요.';
    return {
      title: '돈이 머무는 개운법',
      why: `돈에서 ${el(need)} 기운은 ‘${GROUP_MEAN[fillG]}’이에요.${extra}`,
      taste: pick(away, 'leak'),
      close,
      away,
      routine,
    };
  }

  // 시험·합격
  const close: GaeunItem[] = [
    { key: 'habit', icon: '習', label: '공부 방법', value: STUDY_FILL[fillG], basis: fillBasis },
    { key: 'desk', icon: '方', label: '공부 장소', value: DESK[need], basis: needBasis },
    { key: 'time', icon: '時', label: '공부 시간', value: STUDY_TIME[need], basis: needBasis },
    { key: 'color', icon: '色', label: '필기구 색', value: `${K.color} 계열의 펜이나 노트 (희신 ${helpColor}도 좋아요)`, basis: yBasis },
    { key: 'food', icon: '食', label: '시험 기간 음식', value: K.food, basis: needBasis },
  ];
  if (has('문창')) close.push({ key: 'doc', icon: '文', label: '문창귀인', value: '요약 노트와 필기가 힘이 되는 사주예요 — 손으로 정리한 만큼 남아요', basis: '문창귀인' });
  if (has('화개')) close.push({ key: 'solo', icon: '蓋', label: '혼자 몰입', value: '독서실처럼 혼자 몰입하는 공간에서 집중이 잘 돼요', basis: '화개살' });
  if (has('천을귀인')) close.push({ key: 'noble', icon: '貴', label: '질문', value: '모르는 건 바로 물어보세요 — 도와줄 선생님이 붙는 사주예요', basis: '천을귀인' });
  if (has('역마')) close.push({ key: 'move', icon: '馬', label: '장소 바꾸기', value: '막히면 자리를 옮겨 보세요 — 도서관·카페를 오가며 공부해도 좋아요', basis: '역마살' });
  const away: GaeunItem[] = [
    { key: 'habit', icon: '習', label: '막는 습관', value: STUDY_CUT[cutG], basis: cutBasis },
    { key: 'env', icon: '處', label: '피할 것', value: STUDY_AVOID[avoid], basis: avoidBasis },
    stuckOrOver(strong, strengthBasis, '내 방식만 고집하기 — 모의고사로 확인하며 고쳐 가세요', '하루 12시간 같은 무리한 계획 — 힘이 약한 사주는 꾸준함이 이겨요'),
  ];
  const routine = [
    { text: STUDY_ROUTINE_FILL[fillG], basis: fillBasis },
    { text: STUDY_ROUTINE_EL[need], basis: needBasis },
  ];
  routine.push(balanceRoutine(strong, routine, a.strength.level));
  const STUDY_WHY: Record<TenGodGroup, string> = {
    비겁: '혼자보다 함께 달릴 때 끝까지 가는 사주라, 스터디와 페이스메이커가 개운이에요.',
    식상: '배운 걸 밖으로 꺼낼 때 남는 사주라, 설명하고 써 보는 공부가 개운이에요.',
    재성: '목표가 숫자로 보일 때 힘이 나는 사주라, 점수와 분량을 쪼개는 공부가 개운이에요.',
    관성: '합격의 기운(관성)이 필요한 사주라, 규칙과 실전 연습이 점수로 이어져요.',
    인성: '필요한 기운이 곧 공부의 기운이라, 공부 습관이 그대로 개운이 돼요.',
  };
  const extra = ` ${STUDY_WHY[fillG]}`;
  return {
    title: '공부가 잘 되는 개운법',
    why: `공부에서 ${el(need)} 기운은 ‘${GROUP_MEAN[fillG]}’이에요.${extra}`,
    taste: pick(close, 'color'),
    close,
    away,
    routine,
  };
}

// ---------------------------------------------------------------------------
// 두 사람의 개운법 (궁합) — 둘 다에게 좋은 곳과 색, 함께 피할 것
// ---------------------------------------------------------------------------
export interface CoupleGaeun {
  why: string;
  close: GaeunItem[];
  away: GaeunItem[];
}

export function coupleGaeun(a: SajuAnalysis, b: SajuAnalysis, you: string): CoupleGaeun {
  const eA = a.yongsin.yongsin;
  const eB = b.yongsin.yongsin;
  const gA = a.yongsin.gisin;
  const gB = b.yongsin.gisin;
  const basis = `나 용신 ${elKo(eA)} · ${you} 용신 ${elKo(eB)}`;
  const avoidBasis = `나 기신 ${elKo(gA)} · ${you} 기신 ${elKo(gB)}`;
  const same = eA === eB;
  // 한 사람에게 필요한 기운이 다른 사람에게는 부담일 때
  const mineHurts = eA === gB;
  const yoursHurts = eB === gA;
  const first = (e: Element) => KIT[e].habit.split(', ')[0];

  const why = same
    ? `두 사람 모두 ${el(eA)} 기운이 필요한 사이예요. 같은 곳에서 함께 채울 수 있어 개운이 쉬운 짝이에요.`
    : mineHurts || yoursHurts
      ? `한 사람에게 필요한 기운이 다른 사람에게는 부담이 되는 사이예요. 함께할 때는 둘 다 무난한 곳을 고르고, 각자의 개운은 따로 챙기세요.`
      : `두 사람에게 필요한 기운이 달라요 — 나에게는 ${el(eA)}, ${you}에게는 ${el(eB)}. 번갈아 맞춰 주면 둘 다 채워져요.`;

  const placeNote =
    mineHurts && yoursHurts
      ? ' 다만 서로에게 좋은 곳이 상대에게는 부담이라, 한쪽에 오래 머물기보다 짧게 번갈아 가세요.'
      : mineHurts
        ? ` 다만 나에게 좋은 곳은 ${you}에게 부담이 될 수 있어 짧게 들르는 정도가 좋아요.`
        : yoursHurts
          ? ` 다만 ${you}에게 좋은 곳은 나에게 부담이 될 수 있어 짧게 들르는 정도가 좋아요.`
          : ' 번갈아 가 보세요.';
  const close: GaeunItem[] = [
    {
      key: 'place',
      icon: '方',
      label: '함께 갈 곳',
      value: same ? `${DATE_PLACE[eA]} — 둘 다에게 좋은 곳이에요` : `나에게 좋은 곳은 ${josa(DATE_PLACE[eA], '이에요/예요')}. ${you}에게 좋은 곳은 ${josa(DATE_PLACE[eB], '이에요/예요')}.${placeNote}`,
      basis,
    },
    { key: 'color', icon: '色', label: '데이트 색', value: same ? `${KIT[eA].color} — 같은 계열로 맞춰도 좋아요` : `나는 ${KIT[eA].color}, ${josa(you, '은/는')} ${KIT[eB].color}`, basis },
    {
      key: 'habit',
      icon: '習',
      label: '함께 하는 습관',
      value: same
        ? `${KIT[eA].habit} — 같이 하면 둘 다 채워져요`
        : `나는 ${first(eA)}, ${josa(you, '은/는')} ${first(eB)} — ${mineHurts || yoursHurts ? '각자 따로 챙기고, 함께할 때는 산책처럼 무난한 것으로' : '서로의 습관을 한 번씩 함께해 주세요'}`,
      basis,
    },
  ];
  const away: GaeunItem[] = [
    {
      key: 'env',
      icon: '處',
      label: '함께 피할 것',
      value:
        gA === gB
          ? `${DATE_AVOID[gA]} — 둘 다 이런 자리에서 쉽게 지치고 다투기 쉬워요`
          : `나에게는 ${josa(DATE_AVOID[gA], '이/가')} 부담이에요. ${you}에게는 ${josa(DATE_AVOID[gB], '이/가')} 부담이에요.`,
      basis: avoidBasis,
    },
  ];
  if (mineHurts) away.push({ key: 'push', icon: '衝', label: '권하지 말 것', value: `나에게 맞는 방식(${KIT[eA].short})을 ${you}에게 권하지 마세요. 나에게는 약이지만 ${you}에게는 부담이에요`, basis: `나 용신 = ${you} 기신 ${elKo(eA)}` });
  if (yoursHurts) away.push({ key: 'pull', icon: '衝', label: '따라 하지 말 것', value: `${you}에게 맞는 방식(${KIT[eB].short})을 무리해서 따라 하지 마세요. ${you}에게는 약이지만 나에게는 부담이에요`, basis: `${you} 용신 = 나 기신 ${elKo(eB)}` });
  return { why, close, away };
}
