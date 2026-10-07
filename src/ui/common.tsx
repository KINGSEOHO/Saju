import { useCallback, useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { glossOf, glossSplit } from '../report/glossary.ts';

export { GLOSSARY } from '../report/glossary.ts';

/** 펼치기 표시 (아래 꺾쇠, 열리면 위로) */
export function Chevron({ open = false, className = '' }: { open?: boolean; className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className={`size-5 shrink-0 text-sub transition-transform ${open ? 'rotate-180' : ''} ${className}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

/** 뒤로 가기 표시 */
export function BackIcon() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 5l-7 7 7 7" />
    </svg>
  );
}

/** 화면 아래에 고정되는 큰 버튼 자리 (아이폰 아래쪽 안전 영역까지 고려) */
export function BottomBar({ children }: { children: ReactNode }) {
  return (
    <div className="no-print fixed inset-x-0 bottom-0 z-30 bg-bg">
      <div className="wrap pt-3 pb-[max(16px,env(safe-area-inset-bottom))]">{children}</div>
    </div>
  );
}

export function SectionTitle({ id, kicker, title, desc }: { id?: string; kicker?: string; title: string; desc?: ReactNode }) {
  return (
    <div id={id} className="mb-6 scroll-mt-20">
      {kicker && <div className="kicker">{kicker}</div>}
      <h2 className="mt-1 text-title2 text-ink">{title}</h2>
      {desc && <p className="mt-2 text-label text-sub">{desc}</p>}
    </div>
  );
}

export function Disclosure({ summary, children, defaultOpen = false }: { summary: ReactNode; children: ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-y border-line">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-center justify-between gap-3 py-4 text-left text-ui font-semibold text-ink">
        <span>{summary}</span>
        <Chevron open={open} />
      </button>
      {open && <div className="pb-5">{children}</div>}
    </div>
  );
}

/** 화면 위에 붙어 다니는 머리말(헤더 + 결과 탭 막대)의 높이 */
export function stickyHeight(): number {
  const head = document.querySelector<HTMLElement>('[data-sticky-head]')?.offsetHeight ?? 0;
  const tabs = document.querySelector<HTMLElement>('[data-sticky-tabs]')?.offsetHeight ?? 0;
  return head + tabs;
}

/** 요소의 시작이 머리말 바로 아래에 오도록 부드럽게 스크롤 */
export function scrollToStart(el: HTMLElement | null | undefined, gap = 12) {
  if (!el) return;
  const top = el.getBoundingClientRect().top + window.scrollY - stickyHeight() - gap;
  window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
}

/** 해석 문장의 성격 — 강점은 포인트 색, 약점은 먹색, 나머지는 회색 꼬리표 */
export const TONE_STYLE = {
  positive: { label: '강점', tag: 'tag-pos' },
  negative: { label: '약점·리스크', tag: 'tag-neg' },
  caution: { label: '주의', tag: 'tag-mute' },
  neutral: { label: '해설', tag: 'tag-mute' },
} as const;

/** 한 번에 하나의 풀이만 열어 둔다 */
let closeOpenTerm: (() => void) | null = null;

/**
 * 사주 용어 — 점선 밑줄, 누르면(마우스는 올리면) 쉬운 풀이가 뜬다.
 * 풀이 상자는 화면 밖으로 넘치지 않게 화면 기준으로 띄우고, 스크롤하면 닫는다.
 */
export function Term({ t, children }: { t: string; children?: ReactNode }) {
  const hit = glossOf(t);
  const ref = useRef<HTMLSpanElement>(null);
  const id = useId();
  const [box, setBox] = useState<{ left: number; top: number; up: boolean; w: number; pinned: boolean } | null>(null);
  const close = useCallback(() => setBox(null), []);
  useEffect(() => {
    if (!box) return;
    closeOpenTerm = close;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) close();
    };
    window.addEventListener('scroll', close, { passive: true, capture: true });
    window.addEventListener('resize', close);
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown);
    return () => {
      window.removeEventListener('scroll', close, { capture: true });
      window.removeEventListener('resize', close);
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onDown);
      if (closeOpenTerm === close) closeOpenTerm = null;
    };
  }, [box, close]);
  if (!hit) return <>{children ?? t}</>;
  const open = (pinned: boolean) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const vw = document.documentElement.clientWidth;
    const w = Math.min(300, vw - 24);
    const left = Math.min(Math.max(12, r.left + r.width / 2 - w / 2), vw - w - 12);
    const up = r.top > window.innerHeight * 0.6;
    if (closeOpenTerm && closeOpenTerm !== close) closeOpenTerm();
    setBox({ left, top: up ? r.top - 8 : r.bottom + 8, up, w, pinned });
  };
  return (
    <span
      ref={ref}
      role="button"
      tabIndex={0}
      aria-expanded={!!box}
      aria-describedby={box ? id : undefined}
      onClick={(e) => {
        // 체크박스 라벨·카드 안에서도 용어만 열리게
        e.preventDefault();
        e.stopPropagation();
        if (box?.pinned) close();
        else open(true);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (box) close();
          else open(true);
        }
      }}
      onPointerEnter={(e) => e.pointerType === 'mouse' && !box && open(false)}
      onPointerLeave={(e) => e.pointerType === 'mouse' && box && !box.pinned && close()}
      className="cursor-help underline decoration-faint decoration-dotted underline-offset-[5px] outline-none focus-visible:rounded focus-visible:ring-2 focus-visible:ring-accent"
    >
      {children ?? t}
      {box &&
        createPortal(
          <span
            id={id}
            role="tooltip"
            style={{ left: box.left, top: box.top, width: box.w, transform: box.up ? 'translateY(-100%)' : undefined }}
            className="pointer-events-none fixed z-50 block rounded-xl bg-ink px-4 py-3 text-left font-sans text-cap font-normal text-bg"
          >
            <b className="mr-1.5 text-accent-tint">{hit.key}</b>
            {hit.desc}
          </span>,
          document.body,
        )}
    </span>
  );
}

/** 글 속 사주 용어에 자동으로 밑줄을 긋는다(같은 용어는 처음 한 번만) */
export function Gloss({ text, max }: { text: string; max?: number }) {
  const parts = useMemo(() => glossSplit(text, max), [text, max]);
  return (
    <>
      {parts.map((p, i) =>
        typeof p === 'string' ? (
          p
        ) : (
          <Term key={i} t={p.key}>
            {p.text}
          </Term>
        ),
      )}
    </>
  );
}

/**
 * 풀이 문단 — 첫 문장(요점)만 굵게, 나머지는 보통으로. 굵은 문장만 훑어 읽어도 뜻이 잡히게 한다.
 * 첫 문장이 너무 짧거나 문장이 하나뿐이면 그대로 둔다.
 */
export function Lead({ text }: { text: string }) {
  const m = text.match(/^([\s\S]+?[.!?。][”"’)]?)(\s+)([\s\S]+)$/);
  if (!m || m[1].length < 10) return <Gloss text={text} />;
  return (
    <>
      <b className="font-bold text-ink">
        <Gloss text={m[1]} />
      </b>
      {m[2]}
      <Gloss text={m[3]} />
    </>
  );
}
