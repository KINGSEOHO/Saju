/**
 * 카카오톡 공유
 * - 카카오 JavaScript 키(빌드 환경변수 VITE_KAKAO_KEY, GitHub 저장소 변수 KAKAO_KEY)가 있으면
 *   카카오 SDK로 카드 모양 메시지를 보낸다. (카카오 개발자 콘솔에 사이트 도메인을 등록해야 한다)
 * - 키가 없거나 SDK를 못 불러오면 휴대폰 공유 창(여기서 카카오톡 선택), 그것도 없으면 링크 복사.
 */
const KEY = (import.meta.env.VITE_KAKAO_KEY as string | undefined) ?? '';
const SDK = 'https://t1.kakaocdn.net/kakao_js_sdk/2.7.4/kakao.min.js';

interface KakaoSDK {
  isInitialized(): boolean;
  init(key: string): void;
  Share: { sendDefault(o: unknown): void };
}
declare global {
  interface Window {
    Kakao?: KakaoSDK;
  }
}

let loading: Promise<KakaoSDK | null> | null = null;
function loadKakao(): Promise<KakaoSDK | null> {
  if (!KEY) return Promise.resolve(null);
  loading ??= new Promise((resolve) => {
    const done = () => {
      const k = window.Kakao;
      if (!k) return resolve(null);
      if (!k.isInitialized()) k.init(KEY);
      resolve(k);
    };
    if (window.Kakao) return done();
    const s = document.createElement('script');
    s.src = SDK;
    s.crossOrigin = 'anonymous';
    s.onload = done;
    s.onerror = () => {
      loading = null;
      resolve(null);
    };
    document.head.appendChild(s);
  });
  return loading;
}

/** 첫 화면 주소 (공유 링크에는 생년월일을 넣지 않는다) */
export function siteUrl(): string {
  return `${window.location.origin}${window.location.pathname}`;
}

export type ShareResult = 'kakao' | 'sheet' | 'copied' | 'cancelled' | 'failed';

export async function shareKakao(o: { title: string; description: string }): Promise<ShareResult> {
  const url = siteUrl();
  const k = await loadKakao();
  if (k) {
    try {
      k.Share.sendDefault({
        objectType: 'feed',
        content: { title: o.title, description: o.description, imageUrl: `${url}og.png`, link: { mobileWebUrl: url, webUrl: url } },
        buttons: [{ title: '나도 사주 보기', link: { mobileWebUrl: url, webUrl: url } }],
      });
      return 'kakao';
    } catch {
      /* 아래 방법으로 */
    }
  }
  return shareLink(`${o.title}\n${o.description}`);
}

/** 휴대폰 공유 창 → 없으면 링크 복사 */
export async function shareLink(text: string): Promise<ShareResult> {
  const url = siteUrl();
  if (navigator.share) {
    try {
      await navigator.share({ title: '명경사주', text, url });
      return 'sheet';
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return 'cancelled';
    }
  }
  try {
    await navigator.clipboard.writeText(`${text}\n${url}`);
    return 'copied';
  } catch {
    return 'failed';
  }
}
