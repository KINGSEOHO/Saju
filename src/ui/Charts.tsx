/**
 * 차트 컴포넌트 (의존성 없는 SVG/HTML)
 * - 얇은 막대, 데이터 끝 4px 라운드, 막대 사이 표면색 간격
 * - 모든 막대에 호버/포커스 툴팁, 색 외에 텍스트 라벨 병기
 * - 운세 점수는 발산형(50 기준): 유리=파랑, 불리=빨강, 중립축=회색
 */
import { useState } from 'react';
import { ELEMENT_KO, ELEMENTS, type Element } from '../engine/index.ts';
import { EL_VAR } from './common.tsx';

export function ElementBars({ percent, count, label = '세력' }: { percent: Record<Element, number>; count: Record<Element, number>; label?: string }) {
  const max = Math.max(...ELEMENTS.map((e) => percent[e]), 1);
  return (
    <div className="space-y-2.5" role="list" aria-label={`오행 ${label} 분포`}>
      {ELEMENTS.map((e) => (
        <div key={e} role="listitem" className="grid grid-cols-[3.5rem_1fr_5.5rem] items-center gap-3">
          <div className="flex items-center gap-1.5 text-sm font-semibold text-stone-800 dark:text-stone-200">
            <span aria-hidden className="size-2.5 rounded-full" style={{ background: EL_VAR[e] }} />
            {ELEMENT_KO[e]}
          </div>
          <div className="relative h-3 rounded-sm bg-stone-100 dark:bg-stone-800" title={`${ELEMENT_KO[e]} ${percent[e].toFixed(1)}% · ${count[e]}글자`}>
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

export function GroupBars({ data }: { data: { label: string; sub: string; value: number; el: Element }[] }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="space-y-2.5">
      {data.map((d) => (
        <div key={d.label} className="grid grid-cols-[6.5rem_1fr_3rem] items-center gap-3">
          <div className="text-sm font-semibold whitespace-nowrap text-stone-800 dark:text-stone-200">
            {d.label}
            <span className="ml-1 text-[10px] font-normal text-stone-500">{d.sub}</span>
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

const LEVELS = [
  { at: 0, name: '극약' },
  { at: 18, name: '태약' },
  { at: 29, name: '신약' },
  { at: 40, name: '중화신약' },
  { at: 48, name: '중화신강' },
  { at: 56, name: '신강' },
  { at: 68, name: '태강' },
  { at: 80, name: '극왕' },
];

/** 신강·신약 게이지: 단일 값 + 구간 눈금 */
export function StrengthGauge({ score, level }: { score: number; level: string }) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <div className="text-3xl font-bold tabular-nums text-stone-900 dark:text-stone-50">
          {score.toFixed(1)}
          <span className="text-base font-medium text-stone-500">%</span>
        </div>
        <div className="text-lg font-semibold text-stone-800 dark:text-stone-200">{level}</div>
      </div>
      <div className="relative mt-3 h-2.5 rounded-full bg-gradient-to-r from-[var(--div-neg)] via-[var(--div-mid)] to-[var(--div-pos)] opacity-80">
        <div
          className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-stone-900 shadow dark:border-stone-900 dark:bg-white"
          style={{ left: `${Math.min(100, Math.max(0, score))}%` }}
          aria-label={`현재 위치 ${score.toFixed(1)}%`}
        />
        <div className="absolute top-[-4px] h-[18px] w-px bg-stone-500" style={{ left: '48%' }} aria-hidden />
      </div>
      <div className="relative mt-1.5 h-4 text-[10px] text-stone-500">
        {LEVELS.map((l) => (
          <span key={l.name} className="absolute -translate-x-0" style={{ left: `${l.at}%` }}>
            {['극약', '신약', '중화신강', '태강'].includes(l.name) ? l.name : ''}
          </span>
        ))}
      </div>
      <p className="mt-1 text-xs text-stone-500">← 일간이 약함 · 48% 기준선(균형) · 일간이 강함 →</p>
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
