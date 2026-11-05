/**
 * 과금 구조 설정 (기능 플래그)
 *
 * 현재는 베타 무료(BETA_FREE = true) — 모든 섹션이 열려 있다.
 * 유료 전환 시 BETA_FREE 를 false 로 바꾸면 고민 리포트 상세가 잠기고, 무료 칸에서 '언제' 이야기를 덜어 낸다(TRIM_FREE).
 * 설계 근거는 docs/MONETIZATION.md 참고.
 */
import type { SectionId } from '../report/generate.ts';

export const BETA_FREE = true;

/**
 * 무료 풀이 리포트에서 앞부분(이야기 첫 문단 · 핵심 첫 묶음)만 보여 줄 주제 — 나머지는 그 고민 리포트(연애·결혼 · 이직·진로 · 돈)에서.
 * 성향·건강은 다 보여 준다 (건강은 겁을 주고 파는 인상을 주지 않도록). TRIM_FREE일 때만.
 */
export const PREMIUM_SECTIONS: SectionId[] = ['love', 'career', 'wealth'];

/**
 * 궁합 · 재회의 상세 리포트(ui/Premium.tsx로 감싼 부분)도 BETA_FREE를 따른다.
 *  - 궁합: 반복되는 다툼 · 서로에게 하는 말 · MBTI 대화 가이드 · 앞으로 10년 · 오래 가려면
 *  - 재회: 연락하기 좋은 달 · 피할 달 · 지금 할 일 · 다시 만난다면 하는 말
 * 점수·잘 맞는 점·부딪히는 점·띠/MBTI 한 줄은 무료로 둔다.
 */

/**
 * 가격 (원) — 2026년 10월 다른 사주 서비스 가격을 보고 정했다 (docs/MONETIZATION.md 0절).
 *  - 웹 사주 리포트는 한 건 9,900원대가 많고, 신년운세 상품권은 8,800~18,700원, 궁합은 5천 원 안팎.
 *  - 처음 보는 사이트라 단건은 그보다 낮게 둔다.
 *  - '전부 열기'는 처음 9,900원이었다가 2026년 11월 19,900원으로 올렸다 (하나씩 사면 22,500원 — 묶음이 여전히 2,600원 싸다).
 * 무료로 통째로 열어 주는 고민은 없다 (가장 궁금한 고민을 공짜로 풀면 살 이유가 사라진다).
 * 대신 고민마다 한 줄 답·이유·신호·개운법 한 가지는 늘 무료다.
 */
export const PRICES = {
  /** 고민 하나 상세 — 이직·진로, 연애·결혼, 돈, 시험·합격 */
  concern: 3900,
  /** 그해 신년운세(입춘이 지나면 '올해 운세') 상세 — 해마다 따로 산다 */
  year: 6900,
  /** 전부 열기 — 고민 4개 + 그해 신년운세. 하나씩 산 금액은 빼 준다 */
  all: 19900,
  /** 궁합·재회 상세 — 상대 한 명마다 (그 사람과의 궁합·재회가 함께 열린다) */
  partner: 4900,
  /** 첫 결제 혜택 — 아직 한 번도 결제하지 않은 계정이 고민 하나(신년운세 빼고)를 처음 열 때만 */
  first: 1900,
};
/**
 * 결제 규칙 스위치 — PG 심사에 맞춰 출시 때는 '정해진 상품표' 그대로 판다 (2026-10 결정).
 *  - welcome: 첫 결제 1,900원 혜택. PG 승인 뒤에 켠다 (켤 때 정가 3,900원도 함께 보여 준다).
 *  - topup: '전부 열기'에서 이미 산 금액을 빼 주는 차액 결제. 출시 때는 끈다 — 결제 금액이 사람마다 달라지지 않게.
 */
export const OFFER_RULES = { welcome: false, topup: false };
export type OfferRules = typeof OFFER_RULES;

/** 미리보기에서만 결제 흐름을 흉내 낸다 (node scripts/preview-artifact.mjs --paywall) */
export const PAYWALL_DEMO = import.meta.env.VITE_PAYWALL_DEMO === '1';

/**
 * 결제를 팔 때(과 그 시안) 무료 칸에서 고민 리포트·신년운세와 겹치는 '언제' 이야기를 덜어 낸다.
 *  - 풀이 리포트: 연애·일·돈은 앞부분만 (PREMIUM_SECTIONS)
 *  - 운의 흐름: 다음 달 풀이, 올해 뒤 해마다의 한 줄 풀이를 빼고 점수만
 * 지금 실제 사이트(베타·결제 전)는 다 보여 준다 — 살 수 없는데 무료만 줄이면 이용자에게 손해라서.
 */
export const TRIM_FREE = PAYWALL_DEMO || !BETA_FREE;

/**
 * 리뷰에서 지불 의향을 물을 가격 (원) — 실제로 팔 가격과 같은 칸으로 묻는다
 * (첫 결제 1,900원 · 고민 하나 3,900원 · 신년운세 6,900원 · 전부 열기 9,900원)
 */
export const PRICE_OPTIONS = [
  { id: 'free_only', label: '무료' },
  { id: 'p1900', label: '1,900원' },
  { id: 'p3900', label: '3,900원' },
  { id: 'p6900', label: '6,900원' },
  { id: 'p9900', label: '9,900원' },
] as const;

/** 가격 표시 이름 — 예전에 받은 응답(990원~29,900원)도 통계에서 읽을 수 있게 남겨 둔다 */
export const PRICE_LABEL: Record<string, string> = {
  free_only: '무료',
  p990: '990원',
  p1900: '1,900원',
  p1990: '1,990원',
  p2900: '2,900원',
  p3900: '3,900원',
  p4900: '4,900원',
  p6900: '6,900원',
  p9900: '9,900원',
  p19900: '19,900원',
  p29900: '29,900원 이상',
};
/** 통계에서 가격 순서 */
export const PRICE_ORDER = ['free_only', 'p990', 'p1900', 'p1990', 'p2900', 'p3900', 'p4900', 'p6900', 'p9900', 'p19900', 'p29900'];

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
