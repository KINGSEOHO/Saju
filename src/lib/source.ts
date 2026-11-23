/**
 * 들어온 경로 — 방문자가 어디서 왔는지(공유한 카드, 쓰레드 프로필, 검색 등)를 단계별 측정(lib/funnel.ts)에 함께 남긴다.
 * 외부 분석 도구는 쓰지 않는다. 남기는 것은 네 가지뿐이고 누구인지는 알 수 없다:
 *   src    주소 꼬리표의 utm_source (예: kakao · threads · copy)
 *   medium 주소 꼬리표의 utm_medium (예: share · bio)
 *   app    앱 안 브라우저 종류 (카카오톡·인스타그램 등, lib/inapp.ts)
 *   ref    넘어온 사이트의 도메인만 (주소 전체나 검색어는 남기지 않는다)
 * 한 번 방문(탭)에 처음 들어온 값 하나만 기억한다(sessionStorage). 생년월일이 든 결과 주소(#/r?…)는 읽지 않는다.
 * 개인정보처리방침 시행일(SOURCE_FROM)부터만 기억하고 보낸다 — 그 전에는 아무것도 남기지 않는다.
 */
import { inApp } from './inapp.ts';
import { STORAGE } from './storageKeys.ts';

/** 2026-12-01 00:00 한국 시각 — 처리방침에 적은 시행일 */
export const SOURCE_FROM = Date.UTC(2026, 10, 30, 15);

export interface Source {
  src?: string;
  medium?: string;
  app?: string;
  ref?: string;
}

const word = (v: string | null) => (v && /^[a-z0-9_-]{1,24}$/i.test(v) ? v.toLowerCase() : undefined);

/** 주소 꼬리표·앱·넘어온 곳에서 경로를 읽는다 (화면과 무관한 순수 계산 — 테스트용으로 따로 둔다) */
export function readSource(search: string, ua: string, referrer: string, host: string): Source {
  const q = new URLSearchParams(search);
  const out: Source = {};
  const src = word(q.get('utm_source'));
  const medium = word(q.get('utm_medium'));
  if (src) out.src = src;
  if (medium) out.medium = medium;
  const app = inApp(ua);
  if (app) out.app = app;
  try {
    const h = referrer ? new URL(referrer).hostname.replace(/^www\./, '') : '';
    if (h && h !== host.replace(/^www\./, '') && /^[a-z0-9.-]{1,40}$/i.test(h)) out.ref = h.toLowerCase();
  } catch {
    /* 읽을 수 없는 주소는 남기지 않는다 */
  }
  return out;
}

/** 사이트를 열 때 한 번 — 이번 방문의 경로를 기억해 둔다 */
export function captureSource(now: number = Date.now()): void {
  if (now < SOURCE_FROM) return;
  try {
    if (sessionStorage.getItem(STORAGE.source) !== null) return;
    sessionStorage.setItem(STORAGE.source, JSON.stringify(readSource(location.search, navigator.userAgent, document.referrer, location.hostname)));
  } catch {
    /* 저장이 막힌 브라우저에서는 남기지 않는다 */
  }
}

/** 단계별 측정에 붙일 값 (기억해 둔 것이 없으면 빈 값) */
export function sourceMeta(): Source {
  try {
    const raw = sessionStorage.getItem(STORAGE.source);
    return raw ? (JSON.parse(raw) as Source) : {};
  } catch {
    return {};
  }
}

/** 공유하는 주소에 꼬리표를 붙인다 — 받은 사람이 이 링크로 들어오면 어느 공유에서 왔는지 알 수 있다 */
export function tagged(url: string, source: string, campaign = 'story', medium = 'share'): string {
  return `${url}${url.includes('?') ? '&' : '?'}utm_source=${source}&utm_medium=${medium}&utm_campaign=${campaign}`;
}
