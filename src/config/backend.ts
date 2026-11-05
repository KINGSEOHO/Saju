import { BETA_FREE } from './plans.ts';

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
/**
 * 결제 — 결제 확인 함수 주소와 포트원의 상점 아이디·채널 키. 셋 다 사이트에 공개돼도 되는 값이다 (저장소 변수로 넣는다).
 * PAY_API가 비어 있으면 시안처럼 이 기기 안에서 흉내만 낸다. 포트원 API Secret은 절대 여기에 넣지 않는다 (함수 비밀값에만).
 */
const ENV = import.meta.env as Record<string, string | undefined>;
export const PAY_API = (ENV.VITE_PAY_API ?? '').replace(/\/$/, '');
export const PORTONE_STORE_ID = ENV.VITE_PORTONE_STORE_ID ?? '';
export const PORTONE_CHANNEL_KEY = ENV.VITE_PORTONE_CHANNEL_KEY ?? '';
/** 실제 결제를 쓰는지 — 주소가 있고 결제를 파는 때(시안 포함)만. 베타(결제 전)에는 방문자마다 서버 계정을 만들지 않는다 */
export const PAY_LIVE = !!PAY_API && (ENV.VITE_PAYWALL_DEMO === '1' || !BETA_FREE);

export const SUPABASE_URL = 'https://xtubxywlsehlsphnnzsr.supabase.co';
export const SUPABASE_KEY = 'sb_publishable_1SDzq-ggVfaGcd4ivrKSnA_KshOK3Tu';
