/**
 * 사업자 정보 — 사이트 아래(푸터)와 약관·개인정보처리방침에 나온다 (전자상거래법상 표시 의무).
 *
 * 대표자 이름·주소·번호는 이 저장소에 적지 않는다. 빌드할 때 GitHub 저장소 변수(Settings → Secrets and variables →
 * Actions → Variables)에서 들어온다: BIZ_OWNER, BIZ_REG_NO, BIZ_MAIL_ORDER_NO, BIZ_ADDRESS, BIZ_PHONE, BIZ_EMAIL.
 * 값이 비어 있으면 그 줄은 '등록 준비 중'으로 나온다.
 */
const env = (k: string) => ((import.meta.env as Record<string, string | undefined>)[k] ?? '').trim();

export const BUSINESS = {
  /** 상호 */
  name: env('VITE_BIZ_NAME') || '명경사주',
  /** 대표자 (개인정보 보호책임자를 따로 두지 않으면 대표자가 맡는다) */
  owner: env('VITE_BIZ_OWNER'),
  /** 사업자등록번호 000-00-00000 */
  regNo: env('VITE_BIZ_REG_NO'),
  /** 통신판매업 신고번호 제0000-지역-0000호 */
  mailOrderNo: env('VITE_BIZ_MAIL_ORDER_NO'),
  address: env('VITE_BIZ_ADDRESS'),
  phone: env('VITE_BIZ_PHONE'),
  email: env('VITE_BIZ_EMAIL'),
  site: 'https://mgsaju.io.kr',
};

/** 약관을 고치면 새 시행일을 위에 더하고, 예전 것은 아래에 그대로 남긴다 (예전 판을 볼 수 있어야 한다) */
export const POLICY_VERSIONS = [{ date: '2026년 10월 15일', note: '처음 만듦' }];
export const POLICY_DATE = POLICY_VERSIONS[0].date;
