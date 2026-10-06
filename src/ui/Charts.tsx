/**
 * 차트 컴포넌트 (의존성 없는 SVG/HTML)
 * - 얇은 막대, 데이터 끝 4px 라운드, 막대 사이 표면색 간격
 * - 모든 막대에 호버/포커스 툴팁, 색 외에 텍스트 라벨 병기
 * - 운세 점수는 발산형(50 기준): 유리=파랑, 불리=빨강, 중립축=회색
 */
import { useState, type ReactNode } from 'react';
import { ELEMENT_HANJA, ELEMENT_KO, ELEMENTS, type Element } from '../engine/index.ts';
import { EL_WORD } from '../report/plain.ts';
import { EL_VAR } from './common.tsx';

export function ElementBars({ percent, count, me, label = '세력' }: { percent: Record<Element, number>; count: Record<Element, number>; me?: Element; label?: string }) {
  const max = Math.max(...ELEMENTS.map((e) => percent[e]), 1);
  return (
    <div className="space-y-2.5" role="list" aria-label={`오행 ${label} 분포`}>
      {ELEMENTS.map((e) => (
        <div key={e} role="listitem" className="grid grid-cols-[5.25rem_1fr_4.75rem] items-center gap-2.5">
          <div className="flex items-center gap-1.5 text-sm font-semibold whitespace-nowrap text-stone-800 dark:text-stone-200">
            <span aria-hidden className="size-2.5 shrink-0 rounded-full" style={{ background: EL_VAR[e] }} />
            {EL_WORD[e]}
            <span className="hanja text-xs font-normal text-stone-500">{ELEMENT_HANJA[e]}</span>
            {me === e && <span className="rounded bg-brand-700 px-1 text-[10px] leading-4 font-bold text-white dark:bg-brand-300 dark:text-brand-900">나</span>}
          </div>
          <div className="relative h-3 rounded-sm bg-stone-100 dark:bg-stone-800" title={`${EL_WORD[e]}(${ELEMENT_KO[e]}) ${percent[e].toFixed(1)}% · ${count[e]}글자`}>
            <div
              className="absolute inset-y-0 left-0 rounded-r-[4px]"
              style={{ width: `${(percent[e] / max) * 100}%`, background: EL_VAR[e], minWidth: percent[e] > 0 ? 3 : 0 }}
            />
          </div>
          <div className="text-right text-sm tabular-nums text-stone-700 dark:text-stone-300">
            {percent[e].toFixed(0)}% <span className="text-xs text-stone-500">· {count[e]}자</span>
          </div>
        </div>
      ))}
    </div>
  );
}

export function GroupBars({ data }: { data: { label: string; sub: ReactNode; value: number; el: Element }[] }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="space-y-3">
      {data.map((d) => (
        <div key={d.label} className="grid grid-cols-[8.25rem_1fr_2.75rem] items-center gap-2.5">
          <div className="min-w-0 leading-tight">
            <div className="text-sm font-semibold text-stone-800 dark:text-stone-200">{d.label}</div>
            <div className="mt-0.5 text-[11px] text-stone-500">{d.sub}</div>
          </div>
          <div className="relative h-3 rounded-sm bg-stone-100 dark:bg-stone-800" title={`${d.label} ${d.value.toFixed(1)}%`}>
            <div className="absolute inset-y-0 left-0 rounded-r-[4px]" style={{ width: `${(d.value / max) * 100}%`, background: EL_VAR[d.el], minWidth: d.value > 0 ? 3 : 0 }} />
          </div>
          <div className="text-right text-sm tabular-nums text-stone-700 dark:text-stone-300">{d.value.toFixed(0)}%</div>
        </div>
      ))}
    </div>
  );
}

/** 내 편 vs 바깥 기운 줄다리기 막대 (50% = 균형) */
export function TugBar({ mine }: { mine: number }) {
  const m = Math.min(100, Math.max(0, mine));
  return (
    <div>
      <div className="flex items-end justify-between text-sm font-bold">
        <span className="text-sky-700 dark:text-sky-300">내 편 {m.toFixed(0)}%</span>
        <span className="text-rose-600 dark:text-rose-300">바깥 기운 {(100 - m).toFixed(0)}%</span>
      </div>
      <div className="relative mt-1.5 flex h-3.5 overflow-hidden rounded-full" role="img" aria-label={`내 편 ${m.toFixed(0)}%, 바깥 기운 ${(100 - m).toFixed(0)}%`}>
        <div className="h-full bg-sky-500" style={{ width: `${m}%` }} />
        <div className="h-full flex-1 bg-rose-400/80" />
        <div aria-hidden className="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-white/90 dark:bg-stone-900/90" />
      </div>
      <div className="mt-1.5 grid grid-cols-[1fr_auto_1fr] gap-2 text-[11px] leading-snug text-stone-500">
        <span>나와 같은 기운 + 나를 키워 주는 기운</span>
        <span className="text-center">↑ 균형</span>
        <span className="text-right">내가 쓰고·다루고·눌리는 기운</span>
      </div>
    </div>
  );
}

export interface DivDatum {
  key: string | number;
  label: string;
  sub?: string;
  score: number;
  highlight?: boolean;
  tooltip: string;
}

/** 발산형 세로 막대: 50점을 기준선으로 위(유리)·아래(불리) */
export function DivergingBars({ data, height = 140, ariaLabel }: { data: DivDatum[]; height?: number; ariaLabel: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const half = height / 2;
  return (
    <div className="relative">
      <div className="flex items-stretch gap-[2px]" style={{ height }} role="img" aria-label={ariaLabel}>
        {data.map((d, i) => {
          const v = d.score - 50;
          const h = (Math.abs(v) / 50) * (half - 4);
          const pos = v >= 0;
          return (
            <button
              type="button"
              key={d.key}
              className="group relative flex-1 cursor-default rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-stone-400"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(i)}
              onBlur={() => setHover(null)}
              aria-label={d.tooltip}
            >
              {d.highlight && <span className="absolute inset-0 rounded-sm bg-stone-200/60 dark:bg-stone-700/40" aria-hidden />}
              <span
                className="absolute left-1/2 w-[min(70%,22px)] -translate-x-1/2"
                style={{
                  height: Math.max(2, h),
                  background: pos ? 'var(--div-pos)' : 'var(--div-neg)',
                  bottom: pos ? half : undefined,
                  top: pos ? undefined : half,
                  borderRadius: pos ? '4px 4px 0 0' : '0 0 4px 4px',
                  opacity: hover === null || hover === i ? 1 : 0.45,
                }}
              />
            </button>
          );
        })}
      </div>
      <div className="pointer-events-none absolute inset-x-0 h-px bg-stone-300 dark:bg-stone-600" style={{ top: half }} aria-hidden />
      <div className="mt-1 flex gap-[2px]">
        {data.map((d) => (
          <div key={d.key} className={`flex-1 text-center text-[10px] leading-tight sm:text-xs ${d.highlight ? 'font-bold text-stone-900 dark:text-stone-50' : 'text-stone-500'}`}>
            <div className="hanja">{d.label}</div>
            {d.sub && <div className="tabular-nums">{d.sub}</div>}
          </div>
        ))}
      </div>
      {hover !== null && (
        <div
          className="pointer-events-none absolute -top-2 z-20 w-56 -translate-x-1/2 -translate-y-full rounded-lg bg-stone-900 px-3 py-2 text-xs leading-relaxed text-white shadow-lg dark:bg-stone-100 dark:text-stone-900"
          style={{ left: `${Math.min(85, Math.max(15, ((hover + 0.5) / data.length) * 100))}%` }}
          role="tooltip"
        >
          <div className="font-semibold">
            {data[hover].label} · {data[hover].score}점
          </div>
          <div className="mt-0.5 whitespace-pre-line opacity-90">{data[hover].tooltip}</div>
        </div>
      )}
      <div className="mt-2 flex items-center gap-4 text-[11px] text-stone-500">
        <span className="inline-flex items-center gap-1">
          <span className="inline-block h-2 w-3 rounded-sm" style={{ background: 'var(--div-pos)' }} /> 유리(50점 초과)
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="inline-block h-2 w-3 rounded-sm" style={{ background: 'var(--div-neg)' }} /> 불리(50점 미만)
        </span>
      </div>
    </div>
  );
}

export function ScorePill({ score }: { score: number }) {
  const label = score >= 70 ? '매우 유리' : score >= 58 ? '유리' : score > 42 ? '보통' : score > 30 ? '불리' : '매우 불리';
  const cls =
    score >= 58
      ? 'bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-100'
      : score > 42
        ? 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300'
        : 'bg-rose-100 text-rose-900 dark:bg-rose-950 dark:text-rose-100';
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${cls}`}>
      {score}점 · {label}
    </span>
  );
}
