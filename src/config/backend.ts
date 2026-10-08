/**
 * 리뷰 저장 위치
 *
 * - SHEET_URL 이 있으면: Google 스프레드시트(Apps Script 웹 앱)로 전송  ← GitHub Pages 배포용
 * - 없으면: 같은 도메인의 /api (server/index.mjs)로 전송
 *
 * 값은 빌드 시 환경변수 VITE_SHEET_URL 로 넣거나(GitHub 저장소 변수 SHEET_URL),
 * 아래 FALLBACK_SHEET_URL 에 직접 붙여 넣어도 된다. 설정 방법: docs/SETUP-SHEETS.md
 */
const FALLBACK_SHEET_URL = '';

export const SHEET_URL: string = (import.meta.env.VITE_SHEET_URL as string | undefined) || FALLBACK_SHEET_URL;

/**
 * 로그인·구매 기록 (Supabase) — 둘 다 사이트에 공개돼도 되는 값이다.
 * 비밀 키(service_role · sb_secret_…)는 절대 여기에 넣지 않는다.
 */
export const SUPABASE_URL = 'https://xtubxywlsehlsphnnzsr.supabase.co';
export const SUPABASE_KEY = 'sb_publishable_1SDzq-ggVfaGcd4ivrKSnA_KshOK3Tu';
