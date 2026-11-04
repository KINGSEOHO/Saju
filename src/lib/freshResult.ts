/**
 * 입력 화면에서 막 결과로 넘어왔는지 — 그때만 '계산하는 중' 화면(ui/Analyzing.tsx)을 보여 준다.
 * 기기에 저장하지 않는다(새로고침·최근 본 사주·공유 링크로 열면 바로 결과). 첫 화면을 가볍게 두려고 엔진과 떼어 둔 파일이다.
 */
let fresh = false;

/** 입력 화면이 결과로 넘길 때 부른다 */
export function markFreshResult() {
  fresh = true;
}

/** 결과 화면이 읽는다 (읽은 뒤 clearFreshResult로 지운다 — 개발 모드에서 두 번 그려도 같은 값을 읽도록 따로 둔다) */
export function isFreshResult(): boolean {
  return fresh;
}

export function clearFreshResult() {
  fresh = false;
}
