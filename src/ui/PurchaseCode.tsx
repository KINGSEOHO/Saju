/**
 * 결제가 끝나면 구매 코드를 가운데 창으로 바로 보여 준다 — '저장했어요'를 누르면 닫히고 열린 리포트가 보인다.
 * 컴퓨터(결제창이 같은 화면에서 닫힘)와 휴대폰(다른 주소로 갔다 돌아옴) 모두 같은 창을 쓰도록
 * 화면 어디서든 `showPurchaseCode(code)`로 연다 (App에 한 번만 둔다).
 */
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const EVENT = 'mg-pay-code';
let listening = false;
/** 창이 아직 그려지기 전에 결제 확인이 끝난 경우 (휴대폰에서 돌아온 직후) — 그려지면 바로 연다 */
let pending: Shown | null = null;
type Shown = { code: string; title: string };

/** title: 창 제목 (기본 '결제됐어요', 무료 코드는 '무료 코드로 열었어요') */
export function showPurchaseCode(code: string, title = '결제됐어요') {
  if (!listening) pending = { code, title };
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { code, title } }));
}

export function PurchaseCodeDialog() {
  const [shown, setShown] = useState<Shown | null>(() => {
    const c = pending;
    pending = null;
    return c;
  });
  const [copied, setCopied] = useState(false);
  const okRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const on = (e: Event) => {
      const d = (e as CustomEvent<Partial<Shown>>).detail;
      if (d?.code) {
        setCopied(false);
        setShown({ code: d.code, title: d.title ?? '결제됐어요' });
      }
    };
    window.addEventListener(EVENT, on);
    listening = true;
    return () => {
      listening = false;
      window.removeEventListener(EVENT, on);
    };
  }, []);

  const code = shown?.code ?? null;
  useEffect(() => {
    if (!code) return;
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    okRef.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShown(null);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [code]);

  if (!code) return null;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
    } catch {
      /* 길게 눌러 복사 */
    }
  };
  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-5" role="dialog" aria-modal="true" aria-labelledby="pay-code-title">
      {/* 바깥을 눌러도 닫히지 않는다 — 코드를 저장하고 '저장했어요'로 닫게 */}
      <div className="sheet-backdrop absolute inset-0" aria-hidden />
      <div className="sheet-panel relative w-full max-w-[360px] rounded-2xl border border-line bg-bg p-6 text-center">
        <span aria-hidden className="seal mx-auto size-12 text-[15px]">
          <span>明</span>
          <span>鏡</span>
        </span>
        <h2 id="pay-code-title" className="mt-3 text-title3 font-bold text-ink">
          {shown?.title}
        </h2>
        <p className="mt-1 text-label text-sub">아래 구매 코드를 꼭 저장해 주세요.</p>
        <div className="panel mt-5 rounded-xl px-4 py-4">
          <p className="font-mono text-title2 font-bold tracking-wider text-ink select-all">{code}</p>
          <button type="button" className="btn-small mt-3" onClick={copy}>
            {copied ? '복사했어요' : '코드 복사'}
          </button>
        </div>
        <p className="mt-4 text-left text-cap leading-relaxed text-sub">
          다른 휴대폰이나 브라우저에서 열 때, 또는 기록이 지워졌을 때 이 코드를 넣으면 다시 결제하지 않고 열 수 있어요. 캡처하거나 메모에 붙여 두세요.
        </p>
        <button ref={okRef} type="button" className="btn-primary mt-5 w-full" onClick={() => setShown(null)}>
          저장했어요
        </button>
      </div>
    </div>,
    document.body,
  );
}
