/**
 * 결제가 끝나면 구매 코드를 가운데 창으로 바로 보여 준다 — '저장했어요'를 누르면 닫히고 열린 리포트가 보인다.
 * 컴퓨터(결제창이 같은 화면에서 닫힘)와 휴대폰(다른 주소로 갔다 돌아옴) 모두 같은 창을 쓰도록
 * 화면 어디서든 `showPurchaseCode(code)`로 연다 (App에 한 번만 둔다).
 */
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { STORAGE } from '../lib/storageKeys.ts';
import { accountApi } from '../lib/account.ts';

const EVENT = 'mg-pay-code';
let listening = false;
/** 창이 아직 그려지기 전에 결제 확인이 끝난 경우 (휴대폰에서 돌아온 직후) — 그려지면 바로 연다 */
let pending: Shown | null = null;
type Shown = { code: string; title: string; gift?: string };

/** title: 창 제목 (기본 '결제됐어요'). gift: 결제 이벤트로 받은 무료 코드 */
export function showPurchaseCode(code: string, title = '결제됐어요', gift?: string) {
  if (!listening) pending = { code, title, gift };
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { code, title, gift } }));
}

/** 결제 이벤트 선물 코드와 쓰는 법 — 구매 창·결제 안내·내 구매 코드 칸에서 함께 쓴다 */
export function GiftBox({ code, used }: { code: string; used?: boolean }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
    } catch {
      /* 길게 눌러 복사 */
    }
  };
  return (
    <div className="mt-4 rounded-xl border border-accent/40 px-4 py-4 text-left" data-gift>
      <p className="text-label font-semibold text-ink">이벤트 선물 · 고민 리포트 무료 코드</p>
      <div className="mt-2 flex items-center justify-between gap-3">
        <span className={`font-mono text-ui font-bold tracking-wider select-all ${used ? 'text-faint line-through' : 'text-ink'}`}>{code}</span>
        {!used && (
          <button type="button" className="btn-small shrink-0" onClick={copy}>
            {copied ? '복사했어요' : '복사'}
          </button>
        )}
      </div>
      {used ? (
        <p className="mt-2 text-cap text-sub">이미 쓴 코드예요.</p>
      ) : (
        <ol className="mt-2 list-decimal space-y-0.5 pl-5 text-cap text-ink-2">
          <li>결과 화면 → 고민 리포트 탭에서 보고 싶은 고민(이직·진로, 연애·결혼, 돈, 시험·합격)을 눌러요.</li>
          <li>아래 '구매 코드 넣기'에 이 코드를 넣고 불러오기를 눌러요.</li>
          <li>한 번 쓰면 끝이고, 12월 31일까지 쓸 수 있어요. 친구에게 선물해도 돼요.</li>
        </ol>
      )}
    </div>
  );
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
        setShown({ code: d.code, title: d.title ?? '결제됐어요', gift: d.gift });
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
      <div className="sheet-panel relative max-h-[calc(100dvh-2rem)] w-full max-w-[360px] overflow-y-auto rounded-2xl border border-line bg-bg p-6 text-center">
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
        {shown?.gift && <GiftBox code={shown.gift} />}
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

/**
 * 결제 이벤트 안내 창 — 결과 화면에서 한 번(브라우저 탭마다) 띄운다. 남은 코드가 없으면 띄우지 않는다 (이벤트 끝).
 */
export function EventPopup({ left }: { left: number }) {
  const [open, setOpen] = useState(() => {
    try {
      return left > 0 && !sessionStorage.getItem(STORAGE.eventSeen);
    } catch {
      return left > 0;
    }
  });
  useEffect(() => {
    if (left > 0)
      try {
        if (!sessionStorage.getItem(STORAGE.eventSeen)) setOpen(true);
      } catch {
        setOpen(true);
      }
  }, [left]);
  const close = () => {
    try {
      sessionStorage.setItem(STORAGE.eventSeen, '1');
    } catch {
      /* 이번 화면에서만 */
    }
    setOpen(false);
  };
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);
  if (!open || left <= 0) return null;
  return createPortal(
    <div className="fixed inset-0 z-[55] flex items-center justify-center px-5" role="dialog" aria-modal="true" aria-labelledby="event-title">
      <div className="sheet-backdrop absolute inset-0" onClick={close} aria-hidden />
      <div className="sheet-panel relative w-full max-w-[340px] rounded-2xl border border-line bg-bg p-6 text-center">
        <h2 id="event-title" className="text-title3 font-bold text-ink">
          결제하면 리포트 하나 더
        </h2>
        <p className="mt-2 text-label text-ink-2">
          12월 31일까지 결제하신 분께 고민 리포트(3,900원) <b className="text-ink">무료 코드 1개</b>를 드려요. 직접 써도 되고 친구에게 선물해도 돼요.
        </p>
        <p className="mt-3 text-cap text-sub">
          남은 코드 <b className="text-ink tabular-nums">{left}</b>개 · 다 떨어지면 이벤트가 끝나요.
        </p>
        <button type="button" className="btn-primary mt-5 w-full" onClick={close} autoFocus>
          확인
        </button>
      </div>
    </div>,
    document.body,
  );
}

/** 남은 이벤트 코드 수를 물어 안내 창을 띄운다 (결제를 파는 결과 화면에만 둔다) */
export function EventGate() {
  const [left, setLeft] = useState(0);
  useEffect(() => {
    let live = true;
    void accountApi
      .eventLeft()
      .then((n) => live && setLeft(n))
      .catch(() => null);
    return () => {
      live = false;
    };
  }, []);
  return <EventPopup left={left} />;
}
