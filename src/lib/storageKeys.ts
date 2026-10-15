/**
 * 이용자 기기(localStorage)에 남기는 기록의 이름표 — 한곳에 모아 둔다.
 *
 * ⚠️ 사이트를 업데이트해도 이용자 기록이 사라지지 않게 하는 규칙
 * - 여기 있는 이름은 절대 바꾸거나 지우지 않는다. 이름이 바뀌면 그 기록은 새 코드에서 안 보이게 된다(= 사라진 것과 같다).
 * - 담는 모양(형식)을 바꿔야 하면, 새 코드가 예전 모양도 읽을 수 있게 하고(읽을 때 바꿔 주기) 테스트에 예전 모양 예시를 더한다.
 * - 새 기록을 더할 때는 여기에 이름을 더하고 tests/storage.test.ts의 목록도 같이 고친다.
 * - 결과 주소(#/r?…)의 형식도 같은 규칙을 따른다 — 최근 본 사주·공유 링크가 그 주소를 그대로 들고 있다.
 */

export const STORAGE = {
  /** 무작위 기기 식별값 — 후기·이용 단계 기록을 이름 없이 묶을 때 */
  session: 'mg_session_v1',
  /** 인터넷이 끊겨 보내지 못한 후기·의견 (다음 방문 때 다시 보냄) */
  pending: 'mg_pending_v1',
  /** 최근 본 사주 목록 */
  recent: 'mg_recent',
  /** 시안 전용 계정·구매 기록 (실제 사이트에서는 쓰지 않음) */
  demoDevice: 'mg_demo_device',
  demoPurchases: 'mg_demo_purchases',
  demoAlias: 'mg_demo_alias',
  /** 미리보기 전용 — 지난번 결과 주소 */
  previewLast: 'mg_preview_last',
} as const;

/** 사람·날짜마다 이름이 달라지는 기록의 앞부분 */
export const STORAGE_PREFIX = {
  /** 명경이가 맞혀 볼게요 — 사람별 답 */
  hits: 'myeong-hits:',
  /** 개운법 오늘의 실천 체크 */
  gaeunRoutine: 'gaeun-routine-',
} as const;

const ours = (k: string) => Object.values(STORAGE).includes(k as never) || Object.values(STORAGE_PREFIX).some((p) => k.startsWith(p));

/** 이용자가 개인정보처리방침에서 ‘이 기기의 기록 모두 지우기’를 눌렀을 때 — 명경사주 것만 지운다 */
export function clearAllLocal() {
  try {
    const keys = Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i)).filter((k): k is string => !!k && ours(k));
    for (const k of keys) localStorage.removeItem(k);
  } catch {
    /* 저장소를 쓸 수 없는 브라우저 */
  }
  try {
    sessionStorage.clear();
  } catch {
    /* noop */
  }
  window.dispatchEvent(new Event('mg-account'));
}

/** 삭제 요청 때 알려 줄 기기 식별값 (없으면 만들지 않는다) */
export function deviceIdForRequest(): string {
  try {
    return localStorage.getItem(STORAGE.session) ?? '';
  } catch {
    return '';
  }
}
