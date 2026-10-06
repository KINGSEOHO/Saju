import { useCallback, useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { BRANCHES, ELEMENT_HANJA, ELEMENT_KO, STEMS, type Element } from '../engine/index.ts';
import { glossOf, glossSplit } from '../report/glossary.ts';

export { GLOSSARY } from '../report/glossary.ts';

export const EL_VAR: Record<Element, string> = {
  wood: 'var(--el-wood)',
  fire: 'var(--el-fire)',
  earth: 'var(--el-earth)',
  metal: 'var(--el-metal)',
  water: 'var(--el-water)',
};

/** 오행 색 점 + 글자 라벨 (색에만 의존하지 않도록 항상 라벨 동반) */
export function ElementTag({ el, showHanja = false }: { el: Element; showHanja?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-stone-600 dark:text-stone-300">
      <span aria-hidden className="inline-block size-2 rounded-full" style={{ background: EL_VAR[el] }} />
      {ELEMENT_KO[el]}
      {showHanja && <span className="hanja">({ELEMENT_HANJA[el]})</span>}
    </span>
  );
}

/** 천간/지지 글자 타일 */
export function CharTile({ kind, idx, size = 'lg' }: { kind: 'stem' | 'branch'; idx: number; size?: 'lg' | 'md' | 'sm' }) {
  const d = kind === 'stem' ? STEMS[idx] : BRANCHES[idx];
  const el = d.element;
  const dims = size === 'lg' ? 'size-16 sm:size-20 text-4xl sm:text-5xl' : size === 'md' ? 'size-12 text-2xl' : 'size-9 text-lg';
  return (
    <div
      className={`relative flex ${dims} flex-col items-center justify-center rounded-xl border-2 bg-white dark:bg-stone-900`}
      style={{ borderColor: EL_VAR[el] }}
      title={`${d.ko} (${ELEMENT_KO[el]}·${d.polarity === 'yang' ? '양' : '음'})`}
    >
      <span className="hanja leading-none font-bold text-stone-900 dark:text-stone-50">{d.hanja}</span>
      {size !== 'sm' && (
        <span className="mt-0.5 text-[10px] leading-none text-stone-500 dark:text-stone-400">
          {d.ko}·{ELEMENT_KO[el]}
          {d.polarity === 'yang' ? '+' : '−'}
        </span>
      )}
      <span aria-hidden className="absolute top-1 right-1 size-1.5 rounded-full" style={{ background: EL_VAR[el] }} />
    </div>
  );
}

export function SectionTitle({ id, kicker, title, desc }: { id?: string; kicker?: string; title: string; desc?: ReactNode }) {
  return (
    <div id={id} className="mb-4 scroll-mt-24">
      {kicker && <div className="text-xs font-semibold tracking-wider text-stone-500 uppercase dark:text-stone-400">{kicker}</div>}
      <h2 className="mt-1 text-xl font-bold text-stone-900 sm:text-2xl dark:text-stone-50">{title}</h2>
      {desc && <p className="mt-1.5 text-sm leading-relaxed text-stone-600 dark:text-stone-400">{desc}</p>}
    </div>
  );
}

export function Disclosure({ summary, children, defaultOpen = false }: { summary: ReactNode; children: ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border border-stone-200 dark:border-stone-800">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-semibold text-stone-800 dark:text-stone-200"
      >
        <span>{summary}</span>
        <span aria-hidden className={`transition ${open ? 'rotate-180' : ''}`}>
          ▾
        </span>
      </button>
      {open && <div className="border-t border-stone-200 px-4 py-3 dark:border-stone-800">{children}</div>}
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

export const TONE_STYLE = {
  positive: { label: '강점', icon: '＋', bar: 'bg-sky-500', pill: 'bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-200' },
  negative: { label: '약점·리스크', icon: '－', bar: 'bg-rose-500', pill: 'bg-rose-100 text-rose-900 dark:bg-rose-950 dark:text-rose-200' },
  caution: { label: '주의', icon: '！', bar: 'bg-amber-500', pill: 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200' },
  neutral: { label: '해설', icon: '·', bar: 'bg-stone-300 dark:bg-stone-600', pill: 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300' },
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
      className="cursor-help underline decoration-stone-400 decoration-dotted underline-offset-[5px] outline-none focus-visible:rounded focus-visible:ring-2 focus-visible:ring-brand-300 dark:decoration-stone-500"
    >
      {children ?? t}
      {box &&
        createPortal(
          <span
            id={id}
            role="tooltip"
            style={{ left: box.left, top: box.top, width: box.w, transform: box.up ? 'translateY(-100%)' : undefined }}
            className="pointer-events-none fixed z-50 block rounded-xl bg-stone-900 px-3.5 py-2.5 text-left text-[13px] leading-relaxed font-normal text-white shadow-xl dark:bg-stone-100 dark:text-stone-900"
          >
            <b className="mr-1 text-amber-300 dark:text-amber-700">{hit.key}</b>
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
