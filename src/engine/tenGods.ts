/** 십성(十星)·12운성 */
import { BRANCHES, STEMS, controls, generates, mainStemOf, type Element } from './constants.ts';

export type TenGod = '비견' | '겁재' | '식신' | '상관' | '편재' | '정재' | '편관' | '정관' | '편인' | '정인';
export type TenGodGroup = '비겁' | '식상' | '재성' | '관성' | '인성';

export const TEN_GODS: TenGod[] = ['비견', '겁재', '식신', '상관', '편재', '정재', '편관', '정관', '편인', '정인'];
export const TEN_GOD_GROUPS: TenGodGroup[] = ['비겁', '식상', '재성', '관성', '인성'];

export const TEN_GOD_HANJA: Record<TenGod, string> = {
  비견: '比肩', 겁재: '劫財', 식신: '食神', 상관: '傷官', 편재: '偏財',
  정재: '正財', 편관: '偏官', 정관: '正官', 편인: '偏印', 정인: '正印',
};

export function groupOf(g: TenGod): TenGodGroup {
  if (g === '비견' || g === '겁재') return '비겁';
  if (g === '식신' || g === '상관') return '식상';
  if (g === '편재' || g === '정재') return '재성';
  if (g === '편관' || g === '정관') return '관성';
  return '인성';
}

/** 일간 기준 대상 오행이 어떤 십성 그룹인가 */
export function groupOfElement(dayElement: Element, target: Element): TenGodGroup {
  if (dayElement === target) return '비겁';
  if (generates(dayElement, target)) return '식상';
  if (controls(dayElement, target)) return '재성';
  if (controls(target, dayElement)) return '관성';
  return '인성';
}

/** 그룹 → 오행 */
export function elementOfGroup(dayElement: Element, group: TenGodGroup): Element {
  const order: Element[] = ['wood', 'fire', 'earth', 'metal', 'water'];
  const i = order.indexOf(dayElement);
  const offset = { 비겁: 0, 식상: 1, 재성: 2, 관성: 3, 인성: 4 }[group];
  return order[(i + offset) % 5];
}

/** 일간 대비 천간의 십성 */
export function tenGodOfStem(dayStem: number, otherStem: number): TenGod {
  const d = STEMS[dayStem];
  const o = STEMS[otherStem];
  const same = d.polarity === o.polarity;
  const g = groupOfElement(d.element, o.element);
  switch (g) {
    case '비겁':
      return same ? '비견' : '겁재';
    case '식상':
      return same ? '식신' : '상관';
    case '재성':
      return same ? '편재' : '정재';
    case '관성':
      return same ? '편관' : '정관';
    default:
      return same ? '편인' : '정인';
  }
}

/** 일간 대비 지지의 십성 (정기 기준) */
export function tenGodOfBranch(dayStem: number, branch: number): TenGod {
  return tenGodOfStem(dayStem, mainStemOf(branch));
}

export const TWELVE_STAGES = ['장생', '목욕', '관대', '건록', '제왕', '쇠', '병', '사', '묘', '절', '태', '양'] as const;
export type TwelveStage = (typeof TWELVE_STAGES)[number];

// 각 천간의 장생지 (양간 순행, 음간 역행)
const CHANGSAENG: Record<number, number> = { 0: 11, 1: 6, 2: 2, 3: 9, 4: 2, 5: 9, 6: 5, 7: 0, 8: 8, 9: 3 };

/** 천간이 지지에서 갖는 12운성 */
export function twelveStage(stem: number, branch: number): TwelveStage {
  const start = CHANGSAENG[stem];
  const forward = STEMS[stem].polarity === 'yang';
  const diff = forward ? (branch - start + 12) % 12 : (start - branch + 12) % 12;
  return TWELVE_STAGES[diff];
}

/** 12운성의 기세 점수(0~10) — 통근 강도 참고용 */
export const STAGE_ENERGY: Record<TwelveStage, number> = {
  장생: 7, 목욕: 5, 관대: 8, 건록: 10, 제왕: 10, 쇠: 6, 병: 4, 사: 2, 묘: 3, 절: 1, 태: 2, 양: 4,
};

export function branchName(b: number): string {
  return BRANCHES[b].ko;
}
