/**
 * 사진 크게 보기 — 카카오톡·인스타그램 안 브라우저처럼 내려받기가 막히는 곳에서
 * 사진을 화면에 띄우고 '길게 눌러 저장'하게 안내한다. (showImage()로 연다)
 */
import { useEffect, useState } from 'react';
import { externalHint, IN_APP_NAME, inApp, isIOS, openExternal } from '../lib/inapp.ts';

interface Shown {
  src: string;
  title: string;
  hint?: string;
}

/** 일부 앱 안 브라우저는 blob: 주소 사진을 저장하지 못해 data: 주소로 바꿔 띄운다 */
function toDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

export function ImageSheet() {
  const [shown, setShown] = useState<Shown | null>(null);
  useEffect(() => {
    const on = async (e: Event) => {
      const { blob, title, hint } = (e as CustomEvent<{ blob: Blob; title: string; hint?: string }>).detail;
      setShown({ src: await toDataUrl(blob), title, hint });
    };
    window.addEventListener('mg-show-image', on);
    return () => window.removeEventListener('mg-show-image', on);
  }, []);
  useEffect(() => {
    if (!shown) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setShown(null);
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
    };
  }, [shown]);
  if (!shown) return null;
  const app = inApp();
  return (
    <div role="dialog" aria-modal="true" aria-label={shown.title} className="fixed inset-0 z-[60] flex flex-col bg-bg">
      <div className="wrap flex h-14 shrink-0 items-center justify-between border-b border-line">
        <p className="truncate text-ui font-semibold text-ink">{shown.title}</p>
        <button type="button" className="btn-small" onClick={() => setShown(null)}>
          닫기
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="wrap py-5">
          <p className="text-ui font-bold text-ink">사진을 길게 눌러 저장해 주세요</p>
          <p className="mt-1 text-label text-sub">
            {isIOS() ? '‘사진 앱에 저장’이나 ‘이미지 저장’을 고르면 돼요.' : '‘이미지 저장’이나 ‘이미지 다운로드’를 고르면 돼요.'}
            {shown.hint ? ` ${shown.hint}` : ''}
          </p>
          <img src={shown.src} alt={shown.title} className="mt-4 w-full rounded-xl border border-line" />
          {app && (
            <div className="mt-5 panel">
              <p className="text-label font-semibold text-ink">{IN_APP_NAME[app]} 안에서 열려 있어요</p>
              <p className="mt-1 text-label text-sub">
                길게 눌러도 저장이 안 되면 휴대폰 기본 브라우저로 열어 주세요. 그러면 공유 창도 바로 쓸 수 있어요. {externalHint(app)}
              </p>
              {app === 'kakao' && (
                <button type="button" className="btn-secondary mt-3 w-full" onClick={() => openExternal()}>
                  다른 브라우저로 열기
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
