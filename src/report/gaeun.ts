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

export function buildGaeun(a: SajuAnalysis): { data: GaeunData; story: StoryPara[]; headline: string } {
  const Y = a.yongsin;
  const need = Y.yongsin;
  const help = Y.heesin;
  const avoid = Y.gisin;
  const K = KIT[need];
  const H = KIT[help];
  const G = KIT[avoid];
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
  const fillBasis = `용신 ${elKo(need)} = ${fillG}${fillG === weakest ? ` ${p0(gp[fillG])}로 가장 약함` : ''}`;
  const cutBasis = cutG === strongest ? `${strongest} ${p0(gp[strongest])}로 가장 강함` : `기신 ${elKo(avoid)} = ${cutG}`;
  const strong = isStrong(a);
  const has = (n: string) => a.sinsal.some((s) => s.name.includes(n));
  const mb = a.pillars.month.branch;
  const winterCold = [11, 0, 1].includes(mb) && a.elements.percent.fire < 15;
  const summerHot = [5, 6, 7].includes(mb) && a.elements.percent.water < 15;
  const yBasis = `용신 ${elKo(need)} · 희신 ${elKo(help)}`;

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
  if (has('역마')) close.push({ key: 'move', icon: '馬', label: '이동', value: '여행·출장·이사처럼 움직일 때 기회가 열립니다. 막힐 때는 장소를 바꿔 보세요', basis: '역마살' });
  if (has('천을귀인')) close.push({ key: 'noble', icon: '貴', label: '귀인', value: '혼자 버티지 말고 윗사람·선배에게 먼저 도움을 청하세요. 돕는 사람이 나타나는 사주입니다', basis: '천을귀인' });
  if (has('화개')) close.push({ key: 'solo', icon: '蓋', label: '혼자만의 시간', value: '종교·예술·명상·깊은 공부처럼 혼자 몰입하는 시간이 마음을 채워 줍니다', basis: '화개살' });

  // 멀리할 것
  const away: GaeunItem[] = [
    { key: 'env', icon: '處', label: '환경', value: `${G.avoidPlace}, ${G.avoidColor}`, basis: `기신 ${elKo(avoid)}` },
    { key: 'food', icon: '食', label: '음식', value: G.avoidFood, basis: `기신 ${elKo(avoid)}` },
    { key: 'habit', icon: '習', label: '습관', value: `${REDUCE[cutG].habit}. 그리고 ${G.avoidHabit}`, basis: `${cutBasis} · 기신 ${elKo(avoid)}` },
    { key: 'people', icon: '人', label: '사람', value: REDUCE[cutG].people, basis: cutBasis },
    strong
      ? { key: 'stuck', icon: '滯', label: '고인 물', value: '혼자 고집하며 같은 자리만 지키기 — 힘이 센 사주는 쓰지 않으면 탈이 납니다', basis: `${a.strength.level} ${p0(a.strength.score)}` }
      : { key: 'over', icon: '勞', label: '무리', value: '무리한 확장과 과로, 감당 못 할 약속 — 힘이 약한 사주는 채우는 것이 먼저입니다', basis: `${a.strength.level} ${p0(a.strength.score)}` },
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
        ? `${y.year}년은 필요한 ${pick(goodRole, need)} 기운이 들어오는 해입니다. 미뤄 둔 일을 시작하기 좋습니다.`
        : tone === 'bad'
          ? `${y.year}년은 부담되는 ${pick(badRole, avoid)} 기운이 강한 해입니다. 위의 ‘가까이할 것’을 평소보다 더 챙기세요.`
          : `${y.year}년은 좋고 나쁜 기운이 섞인 해입니다. 큰 변화보다 생활의 균형을 지키는 것이 개운입니다.`,
    ];
    const { samjae, relation } = tti.thisYear;
    const helped = relation === '육합' || relation === '삼합';
    if (samjae && helped) parts.push(`띠로 보면 ${samjae}지만 올해 띠와 ${josa(relation, '이/가')} 받쳐 주는 해라, 큰 계약·보증만 한 번 더 확인하면 됩니다.`);
    else if (samjae) parts.push(`띠로 보면 ${josa(samjae, '이라/라')} 큰 계약·보증은 한 번 더 확인하세요.`);
    else if (relation === '충') parts.push('띠로 보면 올해 띠와 충이 되는 해라 이사·이직 같은 큰 변화는 서두르지 마세요.');
    else if (relation === '원진') parts.push('띠로 보면 올해 띠와 원진이라 가까운 사람과의 말을 조심하면 좋습니다.');
    else if (helped) parts.push(`띠로도 올해 띠와 ${josa(relation, '이라/라')} 사람의 도움을 받기 좋습니다.`);
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

/** 리포트 카드(핵심 카드 보기)용 */
export function gaeunBlocks(d: GaeunData) {
  return [
    { heading: '가까이할 것', items: d.close.map((i) => ({ text: `${i.label}: ${i.value}`, tone: 'positive' as const, evidence: i.basis })) },
    { heading: '멀리할 것', items: d.away.map((i) => ({ text: `${i.label}: ${i.value}`, tone: 'negative' as const, evidence: i.basis })) },
    { heading: '오늘부터 하는 개운 루틴', items: d.routine.map((r) => ({ text: r.text, tone: 'neutral' as const, evidence: r.basis })) },
    {
      heading: '주의',
      items: [{ text: '개운법은 사주의 치우친 기운을 생활 습관으로 맞추는 지침입니다. 특정 물건이나 색이 운명을 바꾸지는 않으며, 효과는 꾸준함에 비례합니다.', tone: 'neutral' as const }],
    },
  ];
}

