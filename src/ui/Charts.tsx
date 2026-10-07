/**
 * 차트 — 화려한 그래프 대신 단순한 막대와 수치.
 * 색은 포인트 색의 농담(shade-1 진함 ~ shade-5 옅음)만 쓰고, 막대 옆에는 항상 글자와 수치를 함께 적는다.
 * 운세 점수(50점 기준): 유리 = 포인트 색, 불리 = 흐린 회색.
 */
import { useState, type ReactNode } from 'react';
import { ELEMENT_HANJA, ELEMENT_KO, ELEMENTS, type Element } from '../engine/index.ts';
import { EL_WORD } from '../report/plain.ts';

const SHADES = ['bg-shade-1', 'bg-shade-2', 'bg-shade-3', 'bg-shade-4', 'bg-shade-5'];
/** 값이 큰 순서대로 진한 농담 */
function shadeByRank<T>(items: T[], value: (x: T) => number): Map<T, string> {
  const sorted = [...items].sort((a, b) => value(b) - value(a));
  return new Map(sorted.map((x, i) => [x, SHADES[Math.min(i, SHADES.length - 1)]]));
}

export function ElementBars({ percent, count, me, label = '세력' }: { percent: Record<Element, number>; count: Record<Element, number>; me?: Element; label?: string }) {
  const max = Math.max(...ELEMENTS.map((e) => percent[e]), 1);
  const shade = shadeByRank(ELEMENTS, (e) => percent[e]);
  const order = [...ELEMENTS].sort((a, b) => percent[b] - percent[a]);
  return (
    <div role="list" aria-label={`오행 ${label} 분포`}>
      {order.map((e) => (
        <div key={e} role="listitem" className="grid grid-cols-[5.5rem_1fr_4.25rem] items-center gap-3 py-2">
          <div className="flex items-baseline gap-1 font-serif text-[16px] font-bold whitespace-nowrap text-ink">
            {EL_WORD[e]}
            <span className="text-label font-normal text-sub">{ELEMENT_HANJA[e]}</span>
            {me === e && <span className="ml-1 self-center rounded border border-accent px-1 font-sans text-[11px] leading-4 font-bold text-accent">나</span>}
          </div>
          <div className="h-2 overflow-hidden rounded bg-fill" title={`${EL_WORD[e]}(${ELEMENT_KO[e]}) ${percent[e].toFixed(1)}% · ${count[e]}글자`}>
            <div className={`h-full rounded ${shade.get(e)}`} style={{ width: `${(percent[e] / max) * 100}%`, minWidth: percent[e] > 0 ? 3 : 0 }} />
          </div>
          <div className="text-right text-label text-ink-2 tabular-nums">
            {percent[e].toFixed(0)}% <span className="text-micro text-sub">{count[e]}자</span>
          </div>
        </div>
      ))}
    </div>
  );
}

/** 결과 첫 화면용 — 다섯 기운을 목·화·토·금·수 순서의 세로 막대와 수치로 */
export function ElementStrip({ percent, me }: { percent: Record<Element, number>; me: Element }) {
  const max = Math.max(...ELEMENTS.map((e) => percent[e]), 1);
  const shade = shadeByRank(ELEMENTS, (e) => percent[e]);
  return (
    <div className="grid grid-cols-5 gap-2" role="list" aria-label="다섯 기운의 세기">
      {ELEMENTS.map((e) => (
        <div key={e} role="listitem" className="text-center" aria-label={`${EL_WORD[e]} ${percent[e].toFixed(0)}%`}>
          <div className="flex h-16 items-end justify-center border-b border-line">
            <div className={`w-7 rounded-t-[3px] ${shade.get(e)}`} style={{ height: `${Math.max(percent[e] > 0 ? 4 : 0, (percent[e] / max) * 100)}%` }} />
          </div>
          <div className="mt-2 font-serif text-[15px] font-bold text-ink">
            {EL_WORD[e]}
            <span className="ml-0.5 text-micro font-normal text-sub">{ELEMENT_HANJA[e]}</span>
          </div>
          <div className="text-cap text-sub tabular-nums">
            {percent[e].toFixed(0)}%{me === e && <span className="ml-1 font-semibold text-accent">나</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

export function GroupBars({ data }: { data: { label: string; sub: ReactNode; value: number; el: Element }[] }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  const shade = shadeByRank(data, (d) => d.value);
  return (
    <div>
      {data.map((d) => (
        <div key={d.label} className="grid grid-cols-[8.5rem_1fr_2.75rem] items-center gap-3 py-2">
          <div className="min-w-0">
            <div className="font-serif text-[15px] leading-snug font-bold text-ink">{d.label}</div>
            <div className="mt-0.5 text-micro text-sub">{d.sub}</div>
          </div>
          <div className="h-2 overflow-hidden rounded bg-fill" title={`${d.label} ${d.value.toFixed(1)}%`}>
            <div className={`h-full rounded ${shade.get(d)}`} style={{ width: `${(d.value / max) * 100}%`, minWidth: d.value > 0 ? 3 : 0 }} />
          </div>
          <div className="text-right text-label text-ink-2 tabular-nums">{d.value.toFixed(0)}%</div>
        </div>
      ))}
    </div>
  );
}

/** 내 편 vs 바깥 기운 (50% = 균형) */
export function TugBar({ mine }: { mine: number }) {
  const m = Math.min(100, Math.max(0, mine));
  return (
    <div>
      <div className="flex items-end justify-between text-label font-semibold">
        <span className="text-accent">내 편 {m.toFixed(0)}%</span>
        <span className="text-ink-2">바깥 기운 {(100 - m).toFixed(0)}%</span>
      </div>
      <div className="relative mt-2 flex h-2.5 overflow-hidden rounded bg-fill" role="img" aria-label={`내 편 ${m.toFixed(0)}%, 바깥 기운 ${(100 - m).toFixed(0)}%`}>
        <div className="h-full bg-shade-2" style={{ width: `${m}%` }} />
        <div aria-hidden className="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-bg" />
      </div>
      <div className="mt-2 grid grid-cols-[1fr_auto_1fr] gap-2 text-micro text-sub">
        <span>나와 같은 기운 + 나를 키워 주는 기운</span>
        <span className="text-center">가운데가 균형</span>
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

/** 50점을 기준선으로 위(유리)·아래(불리)로 뻗는 세로 막대 */
export function DivergingBars({ data, height = 128, ariaLabel }: { data: DivDatum[]; height?: number; ariaLabel: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const half = height / 2;
  return (
    <div className="relative">
      <div className="flex items-stretch gap-[3px]" style={{ height }} role="img" aria-label={ariaLabel}>
        {data.map((d, i) => {
          const v = d.score - 50;
          const h = (Math.abs(v) / 50) * (half - 4);
          const pos = v >= 0;
          return (
            <button
              type="button"
              key={d.key}
              className="relative flex-1 cursor-default rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-accent"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(i)}
              onBlur={() => setHover(null)}
              aria-label={d.tooltip}
            >
              {d.highlight && <span className="absolute inset-0 rounded-sm bg-subtle" aria-hidden />}
              <span
                className={`absolute left-1/2 w-[min(64%,18px)] -translate-x-1/2 ${pos ? 'bg-shade-2' : 'bg-faint'}`}
                style={{
                  height: Math.max(2, h),
                  bottom: pos ? half : undefined,
                  top: pos ? undefined : half,
                  borderRadius: pos ? '3px 3px 0 0' : '0 0 3px 3px',
                  opacity: hover === null || hover === i ? 1 : 0.4,
                }}
              />
            </button>
          );
        })}
      </div>
      <div className="pointer-events-none absolute inset-x-0 h-px bg-line" style={{ top: half }} aria-hidden />
      <div className="mt-1.5 flex gap-[3px]">
        {data.map((d) => (
          <div key={d.key} className={`flex-1 text-center text-[10px] leading-tight sm:text-micro ${d.highlight ? 'font-bold text-ink' : 'text-sub'}`}>
            <div className="hanja">{d.label}</div>
            {d.sub && <div className="tabular-nums">{d.sub}</div>}
          </div>
        ))}
      </div>
      {hover !== null && (
        <div
          className="pointer-events-none absolute -top-2 z-20 w-56 -translate-x-1/2 -translate-y-full rounded-xl bg-ink px-3.5 py-2.5 text-cap text-bg"
          style={{ left: `${Math.min(85, Math.max(15, ((hover + 0.5) / data.length) * 100))}%` }}
          role="tooltip"
        >
          <div className="font-semibold">
            {data[hover].label} · {data[hover].score}점
          </div>
          <div className="mt-0.5 whitespace-pre-line opacity-90">{data[hover].tooltip}</div>
        </div>
      )}
      <div className="mt-3 flex items-center gap-4 text-micro text-sub">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2 w-3 rounded-sm bg-shade-2" /> 유리 (50점 초과)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2 w-3 rounded-sm bg-faint" /> 불리 (50점 미만)
        </span>
      </div>
    </div>
  );
}

export function scoreLabel(score: number) {
  return score >= 70 ? '매우 유리' : score >= 58 ? '유리' : score > 42 ? '보통' : score > 30 ? '불리' : '매우 불리';
}

/** 점수는 색 알약 대신 숫자와 말로 */
export function ScorePill({ score }: { score: number }) {
  const good = score >= 58;
  return (
    <span className="inline-flex shrink-0 items-baseline gap-1 text-label whitespace-nowrap tabular-nums">
      <b className="text-ink">{score}점</b>
      <span className={good ? 'font-semibold text-accent' : 'text-sub'}>{scoreLabel(score)}</span>
    </span>
  );
}
