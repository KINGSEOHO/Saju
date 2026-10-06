/** 리포트 카드와 이야기형 풀이가 함께 쓰는 판정 공식 (한곳에서 관리) */
import type { SajuAnalysis, TenGodGroup } from '../engine/index.ts';

export function isStrong(a: SajuAnalysis): boolean {
  return a.strength.score >= 48;
}

/** 조직형 비율(%) — 관성·인성·정관·정인이 많을수록 조직형, 식상·비겁·편재·상관이 많을수록 독립형 */
export function orgRatio(a: SajuAnalysis): number {
  const gp = a.elements.groupPercent;
  const tgc = a.elements.tenGodCount;
  const org = gp['관성'] + gp['인성'] + tgc['정관'] * 4 + tgc['정인'] * 2;
  const ind = gp['식상'] + gp['비겁'] + tgc['편재'] * 4 + tgc['상관'] * 3;
  return Math.round((org / (org + ind)) * 100);
}

export type WealthCapacity = '큼' | '부담' | '작음' | '보통';

/** 재물 그릇: 신강약 × 재성 세력 */
export function wealthCapacity(a: SajuAnalysis): WealthCapacity {
  const jae = a.elements.groupPercent['재성'];
  const strong = isStrong(a);
  if (strong && jae >= 15) return '큼';
  if (!strong && jae >= 28) return '부담';
  if (jae < 8) return '작음';
  return '보통';
}

/** 재성 외에 돈이 들어오는 주 경로 */
export function incomeRoute(a: SajuAnalysis): TenGodGroup {
  const gp = a.elements.groupPercent;
  return (['식상', '관성', '인성', '비겁'] as TenGodGroup[]).sort((x, y) => gp[y] - gp[x])[0];
}

/** 공격적 투자 적합도 0~3 */
export function investmentRisk(a: SajuAnalysis): number {
  const gp = a.elements.groupPercent;
  const tgc = a.elements.tenGodCount;
  return (isStrong(a) ? 1 : 0) + (gp['재성'] >= 15 ? 1 : 0) + (gp['비겁'] < 28 ? 1 : 0) - (tgc['겁재'] > 0 && tgc['편재'] > 0 ? 1 : 0);
}

export type LifeShape = '대기만성형' | '초년 강세형' | '중년 절정형' | '고른 흐름형';

/** 대운 점수로 본 인생 곡선 — 초년(1~3)·중년(4~6)·말년(7~9) 대운 평균 비교 */
export function lifeShape(a: SajuAnalysis): { shape: LifeShape; early: number; mid: number; late: number } {
  const list = a.daeun.list;
  const avg = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / Math.max(1, xs.length);
  const early = avg(list.slice(0, 3).map((d) => d.score));
  const mid = avg(list.slice(3, 6).map((d) => d.score));
  const late = avg(list.slice(6, 9).map((d) => d.score));
  let shape: LifeShape = '고른 흐름형';
  if (late - early >= 8) shape = '대기만성형';
  else if (early - late >= 8) shape = '초년 강세형';
  else if (mid - Math.max(early, late) >= 6) shape = '중년 절정형';
  return { shape, early, mid, late };
}
