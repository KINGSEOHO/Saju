/**
 * 앱 안 브라우저(카카오톡·인스타그램 등에서 링크를 누르면 열리는 창) 알아보기.
 * 이런 창에서는 파일 내려받기와 휴대폰 공유 창이 자주 막혀서, 사진은 화면에 띄워 길게 눌러 저장하게 한다.
 */
export type InApp = 'kakao' | 'instagram' | 'facebook' | 'naver' | 'line' | 'band' | 'other';

export function inApp(ua: string = typeof navigator === 'undefined' ? '' : navigator.userAgent): InApp | null {
  if (/KAKAOTALK/i.test(ua)) return 'kakao';
  if (/Instagram/i.test(ua)) return 'instagram';
  if (/FBAN|FBAV|FB_IAB|FBIOS/i.test(ua)) return 'facebook';
  if (/NAVER\(inapp|NAVER\/|whale.*inapp/i.test(ua)) return 'naver';
  if (/\bLine\//i.test(ua)) return 'line';
  if (/BAND\//i.test(ua)) return 'band';
  // 안드로이드 웹뷰 표시('; wv)')나 다른 앱 표시
  if (/; wv\)|DaumApps|everytimeApp|KAKAOSTORY/i.test(ua)) return 'other';
  return null;
}

export const IN_APP_NAME: Record<InApp, string> = {
  kakao: '카카오톡',
  instagram: '인스타그램',
  facebook: '페이스북',
  naver: '네이버',
  line: '라인',
  band: '밴드',
  other: '앱',
};

export function isIOS(ua: string = navigator.userAgent): boolean {
  return /iP(hone|ad|od)/.test(ua) || (/Macintosh/.test(ua) && typeof document !== 'undefined' && 'ontouchend' in document);
}

/** 카카오톡 안이면 휴대폰 기본 브라우저로 다시 연다. 열 수 있으면 true */
export function openExternal(): boolean {
  if (inApp() !== 'kakao') return false;
  window.location.href = `kakaotalk://web/openExternal?url=${encodeURIComponent(window.location.href)}`;
  return true;
}

/** 다른 브라우저로 여는 방법 안내 (카카오톡은 버튼으로 바로 열 수 있다) */
export function externalHint(app: InApp): string {
  if (app === 'kakao') return '';
  return isIOS() ? '오른쪽 위(또는 아래) ··· 메뉴에서 ‘외부 브라우저로 열기’나 ‘Safari로 열기’를 눌러 주세요.' : '오른쪽 위 ⋮ 메뉴에서 ‘다른 브라우저로 열기’나 ‘Chrome으로 열기’를 눌러 주세요.';
}
