/**
 * 과금 구조 설정 (기능 플래그)
 *
 * 현재는 베타 무료(BETA_FREE = true) — 모든 섹션이 열려 있다.
 * 리뷰·정확도 평가 데이터를 보고 유료 전환 시 BETA_FREE 를 false 로 바꾸고
 * PREMIUM_SECTIONS 에 잠글 섹션을 지정한다. 설계 근거는 docs/MONETIZATION.md 참고.
 */
import type { SectionId } from '../report/generate.ts';

export const BETA_FREE = true;

/** 유료 전환 시 잠글 후보 (지금은 '베타 무료' 배지로만 표시) */
export const PREMIUM_SECTIONS: SectionId[] = ['love', 'career', 'wealth', 'health'];

/** 리뷰에서 지불 의향을 물을 가격 (원) — A/B 테스트 가능하도록 설정값으로 둔다 */
export const PRICE_OPTIONS = [
  { id: 'free_only', label: '무료' },
  { id: 'p990', label: '990원' },
  { id: 'p1990', label: '1,990원' },
] as const;

/** 가격 표시 이름 — 예전에 받은 응답(2,900원~29,900원)도 통계에서 읽을 수 있게 남겨 둔다 */
export const PRICE_LABEL: Record<string, string> = {
  free_only: '무료',
  p990: '990원',
  p1990: '1,990원',
  p2900: '2,900원',
  p4900: '4,900원',
  p9900: '9,900원',
  p19900: '19,900원',
  p29900: '29,900원 이상',
};
/** 통계에서 가격 순서 */
export const PRICE_ORDER = ['free_only', 'p990', 'p1990', 'p2900', 'p4900', 'p9900', 'p19900', 'p29900'];

/** 유료화 후보 기능 — 리뷰에서 수요 조사 */
export const FEATURE_OPTIONS = [
  { id: 'monthly', label: '월별 상세 운세 (매달 업데이트)' },
  { id: 'compat', label: '궁합 (두 사람 비교 분석)' },
  { id: 'daeun_detail', label: '대운별 10년 상세 해설' },
  { id: 'pdf', label: 'PDF 리포트 저장·인쇄' },
  { id: 'expert', label: '전문가 1:1 상담 연결' },
  { id: 'career_deep', label: '직업·이직 심층 분석' },
  { id: 'date_pick', label: '택일 (이사·계약·결혼 날짜)' },
  { id: 'name', label: '작명·개명 분석' },
] as const;
