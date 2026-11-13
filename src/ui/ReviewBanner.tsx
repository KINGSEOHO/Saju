/**
 * 심사용 접속 안내 띠 — 심사용 주소로 들어온 브라우저에서만 보인다 (config/plans.ts의 REVIEW).
 * 테스트 결제 화면이라는 것을 분명히 하고, 끝내기를 누르면 일반 화면으로 돌아간다.
 */
import { REVIEW } from '../config/plans.ts';
import { STORAGE } from '../lib/storageKeys.ts';

export function ReviewBanner() {
  if (!REVIEW) return null;
  const exit = () => {
    try {
      localStorage.removeItem(STORAGE.review);
    } catch {
      /* 지울 수 없으면 주소에서 토큰만 빼고 돌아간다 */
    }
    location.replace(`${location.pathname}${location.hash}`);
  };
  return (
    <div role="note" className="no-print border-b border-line bg-fill px-4 py-2 text-center text-cap text-ink">
      <b>심사용 테스트 화면이에요.</b> 결제는 테스트 결제로 진행돼요.{' '}
      <button type="button" className="underline" onClick={exit}>
        끝내기
      </button>
    </div>
  );
}
