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

/**
 * 궁합 · 재회의 상세 리포트(ui/Premium.tsx로 감싼 부분)도 BETA_FREE를 따른다.
 *  - 궁합: 반복되는 다툼 · 서로에게 하는 말 · MBTI 대화 가이드 · 앞으로 10년 · 오래 가려면
 *  - 재회: 연락하기 좋은 달 · 피할 달 · 지금 할 일 · 다시 만난다면 하는 말
 * 점수·잘 맞는 점·부딪히는 점·띠/MBTI 한 줄은 무료로 둔다.
 */

/**
 * 고민 리포트 가격 — 고민 하나는 무료로 고르고, 그다음부터 묶음 사다리.
 * 하나씩 사도 '지금까지 낸 금액'과의 차액만 받는다 (lib/entitlements.ts).
 *  tiers[k-1] = 돈 내고 연 고민이 k개일 때 합계 · all = 나머지 전부
 */
export const CONCERN_PRICING = { tiers: [990, 1390], all: 2490 };
/** 궁합·재회 상세는 상대 한 명마다 따로 연다 */
export const PARTNER_PRICE = 990;
/** 미리보기에서만 결제 흐름을 흉내 낸다 (node scripts/preview-artifact.mjs --paywall) */
export const PAYWALL_DEMO = import.meta.env.VITE_PAYWALL_DEMO === '1';

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
