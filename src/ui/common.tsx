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
  positive: { label: '강점', icon: '＋', bar: 'bg-sky-500', pill: 'bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-200' },
  negative: { label: '약점·리스크', icon: '－', bar: 'bg-rose-500', pill: 'bg-rose-100 text-rose-900 dark:bg-rose-950 dark:text-rose-200' },
  caution: { label: '주의', icon: '！', bar: 'bg-amber-500', pill: 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200' },
  neutral: { label: '해설', icon: '·', bar: 'bg-stone-300 dark:bg-stone-600', pill: 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300' },
} as const;

/** 명리 용어 쉬운 풀이 (점선 밑줄 + 탭/호버 시 설명) */
export const GLOSSARY: Record<string, string> = {
  일간: '태어난 날의 천간. 사주에서 “나 자신”을 뜻하는 글자입니다.',
  일주: '태어난 날의 기둥(천간+지지). 나와 배우자 자리를 봅니다.',
  십성: '일간(나)을 기준으로 다른 글자와의 관계를 10가지로 나눈 것. 재물·직업·인간관계를 읽는 핵심 도구입니다.',
  용신: '사주의 균형을 맞추기 위해 가장 필요한 기운. 이 기운이 들어오는 시기가 대체로 유리합니다.',
  기신: '사주의 균형을 더 무너뜨리는 기운. 이 기운이 강한 시기는 조심하는 것이 좋습니다.',
  대운: '10년 단위로 바뀌는 큰 운의 흐름입니다.',
  세운: '해마다 바뀌는 그 해의 운입니다.',
  월운: '절기(입춘·경칩 등) 기준으로 바뀌는 달의 운입니다.',
  신강: '일간(나)의 힘이 강한 사주. 주도적이지만 고집이 세질 수 있습니다.',
  신약: '일간(나)의 힘이 약한 사주. 협력·환경의 도움이 중요합니다.',
  격국: '사주의 큰 틀(구조). 주로 태어난 달을 기준으로 정하며 적성을 볼 때 씁니다.',
  신살: '특정 글자 조합에 붙는 별칭. 장단점이 함께 있는 보조 지표입니다.',
  지장간: '지지(아래 글자) 속에 숨어 있는 천간. 겉으로 드러나지 않는 성향·잠재력입니다.',
  오행: '목(나무)·화(불)·토(흙)·금(쇠)·수(물) 다섯 가지 기운입니다.',
};

export function Term({ t, children }: { t: keyof typeof GLOSSARY | string; children?: ReactNode }) {
  const desc = GLOSSARY[t];
  if (!desc) return <>{children ?? t}</>;
  return (
    <Tip content={desc}>
      <span tabIndex={0} className="cursor-help underline decoration-stone-400 decoration-dotted underline-offset-4 outline-none">
        {children ?? t}
      </span>
    </Tip>
  );
}
