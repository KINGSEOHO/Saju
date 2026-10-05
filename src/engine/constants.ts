/** 명리 기초 상수: 천간·지지·오행·지장간 */

export type Element = 'wood' | 'fire' | 'earth' | 'metal' | 'water';
export type Polarity = 'yang' | 'yin';

export const ELEMENTS: Element[] = ['wood', 'fire', 'earth', 'metal', 'water'];
export const ELEMENT_KO: Record<Element, string> = { wood: '목', fire: '화', earth: '토', metal: '금', water: '수' };
export const ELEMENT_HANJA: Record<Element, string> = { wood: '木', fire: '火', earth: '土', metal: '金', water: '水' };

export interface Stem {
  index: number;
  ko: string;
  hanja: string;
  element: Element;
  polarity: Polarity;
}
export interface Branch {
  index: number;
  ko: string;
  hanja: string;
  element: Element;
  /** 체(體)의 음양 (순서 기준) */
  polarity: Polarity;
  animal: string;
  /** 지장간: [천간 index, 일수] 여기→중기→정기 순 */
  hidden: [number, number][];
}

const STEM_DATA: [string, string, Element, Polarity][] = [
  ['갑', '甲', 'wood', 'yang'],
  ['을', '乙', 'wood', 'yin'],
  ['병', '丙', 'fire', 'yang'],
  ['정', '丁', 'fire', 'yin'],
  ['무', '戊', 'earth', 'yang'],
  ['기', '己', 'earth', 'yin'],
  ['경', '庚', 'metal', 'yang'],
  ['신', '辛', 'metal', 'yin'],
  ['임', '壬', 'water', 'yang'],
  ['계', '癸', 'water', 'yin'],
];
export const STEMS: Stem[] = STEM_DATA.map(([ko, hanja, element, polarity], index) => ({ index, ko, hanja, element, polarity }));

// 지장간(월률분야 기준 일수, 30일 단위)
const BRANCH_DATA: [string, string, Element, Polarity, string, [number, number][]][] = [
  ['자', '子', 'water', 'yang', '쥐', [[8, 10], [9, 20]]],
  ['축', '丑', 'earth', 'yin', '소', [[9, 9], [7, 3], [5, 18]]],
  ['인', '寅', 'wood', 'yang', '호랑이', [[4, 7], [2, 7], [0, 16]]],
  ['묘', '卯', 'wood', 'yin', '토끼', [[0, 10], [1, 20]]],
  ['진', '辰', 'earth', 'yang', '용', [[1, 9], [9, 3], [4, 18]]],
  ['사', '巳', 'fire', 'yin', '뱀', [[4, 7], [6, 7], [2, 16]]],
  ['오', '午', 'fire', 'yang', '말', [[2, 10], [5, 9], [3, 11]]],
  ['미', '未', 'earth', 'yin', '양', [[3, 9], [1, 3], [5, 18]]],
  ['신', '申', 'metal', 'yang', '원숭이', [[4, 7], [8, 7], [6, 16]]],
  ['유', '酉', 'metal', 'yin', '닭', [[6, 10], [7, 20]]],
  ['술', '戌', 'earth', 'yang', '개', [[7, 9], [3, 3], [4, 18]]],
  ['해', '亥', 'water', 'yin', '돼지', [[4, 7], [0, 7], [8, 16]]],
];
export const BRANCHES: Branch[] = BRANCH_DATA.map(([ko, hanja, element, polarity, animal, hidden], index) => ({
  index,
  ko,
  hanja,
  element,
  polarity,
  animal,
  hidden,
}));

/** 지지의 정기(본기) 천간 index — 십성 판단은 정기 기준(체용 변화 반영: 子=癸, 午=丁, 巳=丙, 亥=壬) */
export function mainStemOf(branchIndex: number): number {
  const h = BRANCHES[branchIndex].hidden;
  return h[h.length - 1][0];
}

/** 60갑자 index(0=갑자) → 천간·지지 index */
export function ganzhi(index60: number): { stem: number; branch: number } {
  const i = ((index60 % 60) + 60) % 60;
  return { stem: i % 10, branch: i % 12 };
}
/** 천간·지지 index → 60갑자 index */
export function ganzhiIndex(stem: number, branch: number): number {
  for (let i = 0; i < 60; i++) if (i % 10 === stem && i % 12 === branch) return i;
  throw new Error('invalid ganzhi');
}
export function ganzhiName(stem: number, branch: number, hanja = false): string {
  return hanja ? STEMS[stem].hanja + BRANCHES[branch].hanja : STEMS[stem].ko + BRANCHES[branch].ko;
}

/** 오행 상생: a 가 b 를 생하는가 */
export function generates(a: Element, b: Element): boolean {
  const order: Element[] = ['wood', 'fire', 'earth', 'metal', 'water'];
  return order[(order.indexOf(a) + 1) % 5] === b;
}
/** 오행 상극: a 가 b 를 극하는가 */
export function controls(a: Element, b: Element): boolean {
  const order: Element[] = ['wood', 'fire', 'earth', 'metal', 'water'];
  return order[(order.indexOf(a) + 2) % 5] === b;
}
export function generatorOf(e: Element): Element {
  const order: Element[] = ['wood', 'fire', 'earth', 'metal', 'water'];
  return order[(order.indexOf(e) + 4) % 5];
}
export function generatedBy(e: Element): Element {
  const order: Element[] = ['wood', 'fire', 'earth', 'metal', 'water'];
  return order[(order.indexOf(e) + 1) % 5];
}
export function controllerOf(e: Element): Element {
  const order: Element[] = ['wood', 'fire', 'earth', 'metal', 'water'];
  return order[(order.indexOf(e) + 3) % 5];
}
export function controlledBy(e: Element): Element {
  const order: Element[] = ['wood', 'fire', 'earth', 'metal', 'water'];
  return order[(order.indexOf(e) + 2) % 5];
}

/** 12지 시간대 (평태양시 기준 시작 시각, 시) — 자시 23시 시작 */
export const HOUR_BRANCH_START = [23, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21];

/** 월지 순서: 인월(寅)=0 → 지지 index 2 */
export const MONTH_BRANCH_ORDER = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 0, 1];

/** 12절(節): 각 월의 시작 황경과 이름 (인월부터) */
export const JIE_LONGITUDES = [315, 345, 15, 45, 75, 105, 135, 165, 195, 225, 255, 285];
export const JIE_NAMES = ['입춘', '경칩', '청명', '입하', '망종', '소서', '입추', '백로', '한로', '입동', '대설', '소한'];

export const SEASON_OF_BRANCH: Record<number, '봄' | '여름' | '가을' | '겨울' | '환절기'> = {
  2: '봄', 3: '봄', 4: '환절기',
  5: '여름', 6: '여름', 7: '환절기',
  8: '가을', 9: '가을', 10: '환절기',
  11: '겨울', 0: '겨울', 1: '환절기',
};
