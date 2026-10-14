/**
 * 아래에서 올라오는 풀이 창 — 세부 풀이 카드를 누르면 열린다.
 * 뒤 화면은 흐리게 두고, 창 안에서만 스크롤된다. 닫기: X · 바깥 누르기 · Esc · 휴대폰 뒤로 가기.
 */
import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

/** 휴대폰 뒤로 가기로 창이 닫히도록 기록을 하나 쌓는다 (주소는 그대로) — 창을 여는 쪽에서 부른다 */
export function pushSheetState() {
  if (!window.history.state?.mgSheet) window.history.pushState({ mgSheet: true }, '');
}

/** 쌓아 둔 기록을 걷어 낸다. 걷을 것이 없으면 false */
export function popSheetState(): boolean {
  if (!window.history.state?.mgSheet) return false;
  window.history.back();
  return true;
}

/** onClose: X · 바깥 · Esc로 닫을 때 (기록을 걷고 닫기). onGone: 뒤로 가기로 이미 기록이 걷혔을 때 */
export function Sheet({ title, kicker, onClose, onGone, children }: { title: string; kicker?: string; onClose: () => void; onGone: () => void; children: ReactNode }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const onGoneRef = useRef(onGone);
  onGoneRef.current = onGone;

  useEffect(() => {
    const back = document.activeElement as HTMLElement | null;
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus({ preventScroll: true });
    const onPop = () => {
      if (!window.history.state?.mgSheet) onGoneRef.current();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current();
    };
    window.addEventListener('popstate', onPop);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('popstate', onPop);
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      back?.focus({ preventScroll: true });
    };
  }, []);

  return createPortal(
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={title}>
      <div className="sheet-backdrop absolute inset-0" onClick={onClose} aria-hidden />
      <div data-scroller className="sheet-panel absolute inset-x-0 bottom-0 mx-auto h-[calc(100%-2.75rem)] max-w-[600px] overflow-y-auto overscroll-contain rounded-t-[22px] border-x border-t border-line bg-bg">
        <div className="sticky top-0 z-30 flex justify-end bg-bg px-4 pt-4 pb-2">
          <button ref={closeRef} type="button" onClick={onClose} aria-label="닫기" className="flex size-9 items-center justify-center rounded-full bg-ink text-bg">
            <svg viewBox="0 0 16 16" className="size-3.5" aria-hidden>
              <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        {/* 풀이마다 제목이 있으므로 창 제목은 화면 읽기 프로그램에만 */}
        <div className="px-5 pb-16">
          <h2 className="sr-only">
            {kicker ? `${kicker} · ` : ''}
            {title}
          </h2>
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}
