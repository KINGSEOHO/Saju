import { useState, type ReactNode } from 'react';
import { BRANCHES, ELEMENT_HANJA, ELEMENT_KO, STEMS, type Element } from '../engine/index.ts';

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

/** 호버/포커스 툴팁 */
export function Tip({ content, children }: { content: ReactNode; children: ReactNode }) {
  const [show, setShow] = useState(false);
  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onFocus={() => setShow(true)}
      onBlur={() => setShow(false)}
    >
      {children}
      {show && (
        <span
          role="tooltip"
          className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 w-max max-w-[16rem] -translate-x-1/2 rounded-lg bg-stone-900 px-3 py-2 text-xs leading-relaxed text-white shadow-lg dark:bg-stone-100 dark:text-stone-900"
        >
          {content}
        </span>
      )}
    </span>
  );
}

export const TONE_STYLE = {
  positive: { label: '강점', icon: '＋', cls: 'border-sky-300 bg-sky-50 text-sky-900 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-100' },
  negative: { label: '약점·리스크', icon: '－', cls: 'border-rose-300 bg-rose-50 text-rose-900 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-100' },
  caution: { label: '주의', icon: '！', cls: 'border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100' },
  neutral: { label: '해설', icon: '·', cls: 'border-stone-200 bg-stone-50 text-stone-800 dark:border-stone-700 dark:bg-stone-800/50 dark:text-stone-200' },
} as const;
