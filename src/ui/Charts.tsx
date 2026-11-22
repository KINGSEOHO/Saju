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
          <div className="flex items-baseline gap-1 font-serif text-[1rem] font-bold whitespace-nowrap text-ink">
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
          <div className="mt-2 font-serif text-[0.9375rem] font-bold text-ink">
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
            <div className="font-serif text-[0.9375rem] leading-snug font-bold text-ink">{d.label}</div>
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

const WHEEL_AT: Record<Element, [number, number]> = { wood: [160, 52], fire: [262, 126], earth: [223, 246], metal: [97, 246], water: [58, 126] };
const WHEEL_OPACITY = [1, 0.72, 0.5, 0.34, 0.22];

/**
 * 다섯 기운을 그림으로 — 서로 낳아 주는 순서(나무→불→흙→쇠→물)로 둥글게 놓고, 센 기운일수록 크고 진한 원으로 그린다.
 * 없는 기운은 점선 빈 원. 색은 포인트 색 하나의 농담만 쓴다.
 */
export function ElementWheel({ percent, me }: { percent: Record<Element, number>; me: Element }) {
  const rank = [...ELEMENTS].sort((a, b) => percent[b] - percent[a]);
  const r = (e: Element) => (percent[e] > 0 ? 17 + Math.sqrt(percent[e]) * 4.2 : 20);
  return (
    <svg viewBox="0 0 320 312" className="mx-auto w-full max-w-[340px]" role="img" aria-label={`다섯 기운의 세기. ${rank.map((e) => `${EL_WORD[e]} ${percent[e].toFixed(0)}%`).join(', ')}`}>
      {ELEMENTS.map((e, i) => {
        const [x1, y1] = WHEEL_AT[e];
        const [x2, y2] = WHEEL_AT[ELEMENTS[(i + 1) % 5]];
        return <line key={e} x1={x1} y1={y1} x2={x2} y2={y2} strokeWidth="1" strokeDasharray="2 4" className="stroke-line-strong" />;
      })}
      {ELEMENTS.map((e) => {
        const [x, y] = WHEEL_AT[e];
        const none = percent[e] <= 0;
        const dark = rank.indexOf(e) < 2 && !none;
        return (
          <g key={e}>
            <circle cx={x} cy={y} r={r(e) + 2} className="fill-bg" />
            {none ? (
              <circle cx={x} cy={y} r={r(e)} strokeWidth="1.5" strokeDasharray="4 4" className="fill-bg stroke-faint" />
            ) : (
              <circle cx={x} cy={y} r={r(e)} className="fill-accent" opacity={WHEEL_OPACITY[rank.indexOf(e)]} />
            )}
            {me === e && <circle cx={x} cy={y} r={r(e) + 5} fill="none" strokeWidth="1.5" className="stroke-ink" />}
            <text x={x} y={y - 1} textAnchor="middle" className={`hanja text-[19px] font-bold ${dark ? 'fill-on-accent' : none ? 'fill-faint' : 'fill-ink'}`}>
              {ELEMENT_HANJA[e]}
            </text>
            <text x={x} y={y + 14} textAnchor="middle" className={`text-[11px] font-semibold tabular-nums ${dark ? 'fill-on-accent' : none ? 'fill-faint' : 'fill-ink'}`}>
              {none ? '없음' : `${percent[e].toFixed(0)}%`}
            </text>
            <text x={x} y={y + r(e) + (me === e ? 22 : 17)} textAnchor="middle" className="fill-sub text-[12px]">
              {EL_WORD[e]}
              {me === e ? ' · 나' : ''}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export interface LifePoint {
  key: string | number;
  /** 아래 눈금 — '4세' */
  label: string;
  score: number;
  now?: boolean;
}

/** 인생 흐름을 선 하나로 — 10년 운의 점수를 이어 그리고 '지금'을 점으로 찍는다. 가운데 점선이 보통(50점) */
export function LifeLine({ data, ariaLabel }: { data: LifePoint[]; ariaLabel: string }) {
  const W = 320;
  const H = 150;
  const [top, bottom, pad] = [26, 106, 18];
  const x = (i: number) => pad + (i * (W - pad * 2)) / Math.max(1, data.length - 1);
  const y = (s: number) => bottom - (Math.max(0, Math.min(100, s)) / 100) * (bottom - top);
  const pts = data.map((d, i) => [x(i), y(d.score)] as const);
  // 점 사이를 부드럽게 (가로 방향 곡선)
  const path = pts.map(([px, py], i) => (i === 0 ? `M${px} ${py}` : `C${(pts[i - 1][0] + px) / 2} ${pts[i - 1][1]} ${(pts[i - 1][0] + px) / 2} ${py} ${px} ${py}`)).join(' ');
  const best = data.reduce((b, d, i) => (d.score > data[b].score ? i : b), 0);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={ariaLabel}>
      <line x1={pad} x2={W - pad} y1={y(50)} y2={y(50)} strokeWidth="1" strokeDasharray="3 4" className="stroke-line-strong" />
      <text x={pad} y={bottom + 12} className="fill-sub text-[10px]">
        점선 = 보통
      </text>
      <path d={`${path} L${pts[pts.length - 1][0]} ${bottom} L${pts[0][0]} ${bottom} Z`} className="fill-accent" opacity="0.1" />
      <path d={path} fill="none" strokeWidth="2.5" strokeLinecap="round" className="stroke-accent" />
      {data.map((d, i) => (
        <g key={d.key}>
          {d.now ? (
            <>
              <circle cx={pts[i][0]} cy={pts[i][1]} r="9" className="fill-accent" opacity="0.2" />
              <circle cx={pts[i][0]} cy={pts[i][1]} r="5" className="fill-accent" />
              <text x={pts[i][0]} y={pts[i][1] - 14} textAnchor="middle" paintOrder="stroke" strokeWidth="4" className="fill-ink stroke-bg text-[12px] font-bold">
                지금
              </text>
            </>
          ) : (
            <circle cx={pts[i][0]} cy={pts[i][1]} r="3" strokeWidth="1.5" className="fill-bg stroke-accent" />
          )}
          {i === best && !d.now && (
            <text x={pts[i][0]} y={pts[i][1] - 10} textAnchor={i === 0 ? 'start' : i === data.length - 1 ? 'end' : 'middle'} className="fill-accent text-[10px] font-semibold">
              가장 좋은 때
            </text>
          )}
          <text x={pts[i][0]} y={H - 8} textAnchor="middle" className={`text-[10px] tabular-nums ${d.now ? 'fill-ink font-bold' : 'fill-sub'}`}>
            {d.label}
          </text>
        </g>
      ))}
    </svg>
  );
}
