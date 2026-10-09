/**
 * 지인 리뷰 링크 — 주소에 ?from=friend 를 붙여 보내면 이 기기를 '지인'으로 표시해 둔다.
 * 리뷰·섹션 평가·단계 기록에 from: 'friend'가 붙어서, 관리 화면에서 지인 의견을 따로 보고
 * 실제 손님 통계(결제까지 가는 길, 유료 전환 판단)에서는 뺄 수 있다. 이름·연락처는 남기지 않는다.
 */
const KEY = 'mg_from';

export type Source = 'friend' | '';

/** 처음 들어올 때 한 번 — 주소의 ?from=friend 를 이 기기에 기억한다 */
export function initSource(): void {
  try {
    if (new URLSearchParams(window.location.search).get('from') === 'friend') localStorage.setItem(KEY, 'friend');
  } catch {
    /* 저장이 안 되면 표시하지 않는다 */
  }
}

export function sourceTag(): Source {
  try {
    return localStorage.getItem(KEY) === 'friend' ? 'friend' : '';
  } catch {
    return '';
  }
}

/** 기록에 덧붙일 값 — 지인일 때만 */
export const sourceMeta = (): { from?: 'friend' } => (sourceTag() ? { from: 'friend' } : {});
