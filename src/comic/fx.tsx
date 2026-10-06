/**
 * 인물 주변 효과 (컷 좌표) — 땀·핏대·영혼 가출·전구·먹구름 같은 개그 만화 기호.
 * 글자가 들어가는 효과(?, !, Zzz)도 있어서 인물과 따로, 뒤집지 않고 그린다.
 */
import type { ReactNode } from 'react';
import { d, heartPath, rng, starPath, type Pt } from './draw.ts';
import { INK, starPath5, type Anchor } from './toon.tsx';
import type { Fx } from './types.ts';

const TEAR = '#8fd3ff';

/** 인물 뒤에 그리는 효과 (불꽃 오라·달리는 선) */
export const BEHIND_FX = new Set<Fx>(['aura', 'speed']);

export function FxBehind({ fx, an, k }: { fx: Fx[]; an: Anchor; k: number }): ReactNode {
  const out: ReactNode[] = [];
  const { body } = an;
  if (fx.includes('aura')) {
    const cx = an.x;
    const top = an.top - 10 * k;
    const bottom = body.y + body.h + 6;
    const w = Math.max(an.r * 1.5, body.w * 0.9);
    const n = 9;
    let s = d`M ${cx - w} ${bottom}`;
    for (let i = 0; i < n; i++) {
      const t0 = i / n;
      const t1 = (i + 1) / n;
      const xa = cx - w + t0 * w * 2;
      const xb = cx - w + t1 * w * 2;
      const tip = top + Math.pow(Math.abs((t0 + t1) / 2 - 0.5) * 2, 1.6) * (bottom - top) * 0.75;
      const base = tip + (bottom - top) * 0.22;
      s += d` Q ${xa} ${base} ${(xa + xb) / 2} ${tip} Q ${xb} ${base} ${xb} ${base + 6 * k}`;
    }
    s += d` L ${cx + w} ${bottom} Z`;
    out.push(<path key="aura" d={s} fill="#ff8a3d" opacity={0.45} stroke="#ff6b2b" strokeWidth={3 * k} strokeLinejoin="round" />);
    out.push(<path key="aura2" d={s} fill="#ffd166" opacity={0.35} transform={`translate(${cx} ${bottom}) scale(0.78) translate(${-cx} ${-bottom})`} />);
  }
  if (fx.includes('speed')) {
    const dir = an.dir;
    const r = rng(Math.round(an.x));
    for (let i = 0; i < 7; i++) {
      const y = an.top + 20 * k + i * ((body.y + body.h - an.top) / 7);
      const x0 = an.x - dir * (an.r + 10 * k + r() * 20 * k);
      const len = (40 + r() * 70) * k;
      out.push(<path key={`sp${i}`} d={d`M ${x0} ${y} L ${x0 - dir * len} ${y}`} stroke={INK} strokeWidth={3 * k} strokeLinecap="round" />);
    }
  }
  return <g>{out}</g>;
}

function text(x: number, y: number, size: number, t: string, color: string, key: string, rot = 0) {
  return (
    <g key={key} transform={rot ? `rotate(${rot} ${x} ${y})` : undefined}>
      <text x={x} y={y} fontSize={size} fontWeight={900} textAnchor="middle" fill="#ffffff" stroke="#ffffff" strokeWidth={size * 0.22} strokeLinejoin="round">
        {t}
      </text>
      <text x={x} y={y} fontSize={size} fontWeight={900} textAnchor="middle" fill={color} stroke={INK} strokeWidth={size * 0.05}>
        {t}
      </text>
    </g>
  );
}

function drop(x: number, y: number, s: number, key: string, rot = 0) {
  return <path key={key} d={d`M ${x} ${y - s} C ${x + s * 0.5} ${y - s * 0.3} ${x + s * 0.7} ${y + s * 0.2} ${x} ${y + s * 0.6} C ${x - s * 0.7} ${y + s * 0.2} ${x - s * 0.5} ${y - s * 0.3} ${x} ${y - s} Z`} fill={TEAR} stroke={INK} strokeWidth={s * 0.16} transform={rot ? `rotate(${rot} ${x} ${y})` : undefined} />;
}

/** 인물 앞에 그리는 효과 */
export function FxFront({ fx, an, k, hand }: { fx: Fx[]; an: Anchor; k: number; hand?: Pt }): ReactNode {
  const out: ReactNode[] = [];
  const { x, cy, r, dir } = an;
  const side = dir;
  const lw = 3.2 * k;
  for (const f of fx) {
    switch (f) {
      case 'sweat':
        out.push(drop(x - side * r * 0.92, cy - r * 0.42, 15 * k, 'sweat', -side * 15));
        break;
      case 'drops':
        [
          [-1.05, -0.6, -30],
          [-1.15, -0.1, -60],
          [1.05, -0.55, 30],
          [1.15, -0.05, 60],
        ].forEach(([dx, dy, rt], i) => out.push(drop(x + dx * r, cy + dy * r, 11 * k, `dr${i}`, rt)));
        break;
      case 'vein': {
        const vx = x + side * r * 0.58;
        const vy = cy - r * 0.62;
        const s = 11 * k;
        out.push(
          <g key="vein" fill="none" stroke="#e5484d" strokeWidth={lw * 1.2} strokeLinecap="round">
            <path d={d`M ${vx - s} ${vy - s * 0.3} Q ${vx - s * 0.3} ${vy - s * 0.3} ${vx - s * 0.3} ${vy - s}`} />
            <path d={d`M ${vx + s} ${vy - s * 0.3} Q ${vx + s * 0.3} ${vy - s * 0.3} ${vx + s * 0.3} ${vy - s}`} />
            <path d={d`M ${vx - s} ${vy + s * 0.3} Q ${vx - s * 0.3} ${vy + s * 0.3} ${vx - s * 0.3} ${vy + s}`} />
            <path d={d`M ${vx + s} ${vy + s * 0.3} Q ${vx + s * 0.3} ${vy + s * 0.3} ${vx + s * 0.3} ${vy + s}`} />
          </g>,
        );
        break;
      }
      case 'steam':
        [-1, 1].forEach((s) => {
          const px = x + s * r * 0.62;
          const py = an.bare + r * 0.12;
          out.push(
            <g key={`st${s}`}>
              <path d={d`M ${px} ${py} q ${s * 2 * k} ${-12 * k} ${s * 14 * k} ${-12 * k} q ${s * 6 * k} ${-14 * k} ${s * 20 * k} ${-4 * k} q ${s * 12 * k} ${6 * k} ${s * 2 * k} ${16 * k} Z`} fill="#ffffff" stroke={INK} strokeWidth={lw * 0.8} strokeLinejoin="round" />
              <circle cx={px + s * 30 * k} cy={py - 24 * k} r={6 * k} fill="#ffffff" stroke={INK} strokeWidth={lw * 0.6} />
            </g>,
          );
        });
        break;
      case 'gloom': {
        const y0 = an.bare + r * 0.42;
        out.push(
          <g key="gloom" opacity={0.85}>
            {[-0.62, -0.38, -0.14, 0.1, 0.34, 0.58].map((t, i) => (
              <path key={i} d={d`M ${x + t * r} ${y0} L ${x + t * r} ${y0 + (26 + (i % 3) * 10) * k}`} stroke="#4b4f72" strokeWidth={lw * 0.9} strokeLinecap="round" />
            ))}
            {[-1, 1].map((s) => (
              <path key={`w${s}`} d={d`M ${x + s * r * 1.1} ${cy - r * 0.2} q ${s * 10 * k} ${-10 * k} ${0} ${-20 * k} q ${-s * 10 * k} ${-10 * k} ${0} ${-20 * k}`} fill="none" stroke="#4b4f72" strokeWidth={lw * 0.8} strokeLinecap="round" />
            ))}
          </g>,
        );
        break;
      }
      case 'sparkle':
        [
          [-1.15, -0.7, 12],
          [1.2, -0.35, 10],
          [-0.9, 0.55, 8],
        ].forEach(([dx, dy, s], i) => out.push(<path key={`sk${i}`} d={starPath(x + dx * r, cy + dy * r, s * k)} fill="#fff6b0" stroke={INK} strokeWidth={lw * 0.6} />));
        break;
      case 'hearts':
        [
          [1.1, -0.9, 11],
          [1.4, -0.4, 8],
          [-1.15, -0.8, 9],
        ].forEach(([dx, dy, s], i) => out.push(<path key={`ht${i}`} d={heartPath(x + dx * r * side, cy + dy * r, s * k)} fill="#ff6b8a" stroke={INK} strokeWidth={lw * 0.6} />));
        break;
      case 'question':
        out.push(text(x + side * r * 0.95, an.bare + 4 * k, 42 * k, '?', '#3b82f6', 'q', side * 12));
        break;
      case 'exclaim':
        out.push(text(x + side * r * 0.95, an.bare + 4 * k, 46 * k, '!', '#e5484d', 'ex', side * 10));
        break;
      case 'bulb': {
        const bx = x + side * r * 0.7;
        const by = an.bare - 26 * k;
        out.push(
          <g key="bulb">
            {[0, 1, 2, 3, 4].map((i) => {
              const a = Math.PI * (1.1 + i * 0.2);
              return <path key={i} d={d`M ${bx + Math.cos(a) * 24 * k} ${by + Math.sin(a) * 24 * k} L ${bx + Math.cos(a) * 34 * k} ${by + Math.sin(a) * 34 * k}`} stroke={INK} strokeWidth={lw} strokeLinecap="round" />;
            })}
            <circle cx={bx} cy={by} r={16 * k} fill="#fff07a" stroke={INK} strokeWidth={lw} />
            <rect x={bx - 7 * k} y={by + 13 * k} width={14 * k} height={10 * k} fill="#9aa1ab" stroke={INK} strokeWidth={lw * 0.8} />
          </g>,
        );
        break;
      }
      case 'bulbs': {
        const n = 7;
        for (let i = 0; i < n; i++) {
          const a = Math.PI * (1.0 + (i / (n - 1)) * 1.0);
          const bx = x + Math.cos(a) * r * 1.55;
          const by = cy + Math.sin(a) * r * 1.35 - r * 0.2;
          out.push(
            <g key={`bb${i}`} transform={`rotate(${(i - 3) * 14} ${bx} ${by})`}>
              <circle cx={bx} cy={by} r={12 * k} fill="#fff07a" stroke={INK} strokeWidth={lw * 0.8} />
              <rect x={bx - 5 * k} y={by + 10 * k} width={10 * k} height={7 * k} fill="#9aa1ab" stroke={INK} strokeWidth={lw * 0.6} />
            </g>,
          );
        }
        break;
      }
      case 'zzz':
        out.push(text(x + side * r * 0.8, an.bare + 2 * k, 30 * k, 'Z', '#6aa1e6', 'z1', 0));
        out.push(text(x + side * (r * 0.8 + 26 * k), an.bare - 22 * k, 22 * k, 'z', '#6aa1e6', 'z2', 0));
        out.push(text(x + side * (r * 0.8 + 44 * k), an.bare - 40 * k, 16 * k, 'z', '#6aa1e6', 'z3', 0));
        break;
      case 'music':
        out.push(text(x + side * r * 1.0, an.bare + 6 * k, 34 * k, '♪', '#b9a3f0', 'm1', 0));
        out.push(text(x + side * (r * 1.0 + 30 * k), an.bare - 14 * k, 26 * k, '♫', '#f2836b', 'm2', 0));
        break;
      case 'soul': {
        const [mx, my] = an.mouth;
        const sx = mx + side * 30 * k;
        const sy = an.bare - 40 * k;
        out.push(
          <g key="soul">
            <path d={d`M ${mx} ${my} C ${mx + side * 30 * k} ${my - 10 * k} ${sx - side * 40 * k} ${sy + 50 * k} ${sx - 18 * k} ${sy + 10 * k} Q ${sx - 22 * k} ${sy - 24 * k} ${sx + 4 * k} ${sy - 26 * k} Q ${sx + 28 * k} ${sy - 24 * k} ${sx + 22 * k} ${sy + 6 * k} C ${sx + 10 * k} ${sy + 40 * k} ${mx + side * 10 * k} ${my + 4 * k} ${mx} ${my} Z`} fill="#ffffff" stroke={INK} strokeWidth={lw * 0.85} opacity={0.95} />
            <circle cx={sx - 6 * k} cy={sy - 8 * k} r={2.6 * k} fill={INK} />
            <circle cx={sx + 8 * k} cy={sy - 8 * k} r={2.6 * k} fill={INK} />
            <ellipse cx={sx + 1 * k} cy={sy + 2 * k} rx={3 * k} ry={4 * k} fill={INK} />
          </g>,
        );
        break;
      }
      case 'stars': {
        const oy = an.bare + 6 * k;
        out.push(<ellipse key="orb" cx={x} cy={oy} rx={r * 0.95} ry={r * 0.24} fill="none" stroke={INK} strokeWidth={lw * 0.6} strokeDasharray={`${6 * k} ${5 * k}`} />);
        [-0.8, 0.1, 0.85].forEach((t, i) => out.push(<path key={`sr${i}`} d={starPath5(x + t * r, oy + (i === 1 ? r * 0.22 : -r * 0.12), 10 * k)} fill="#ffd84d" stroke={INK} strokeWidth={lw * 0.6} strokeLinejoin="round" />));
        break;
      }
      case 'shake':
        [-1, 1].forEach((s) => {
          const bx = x + s * (an.body.w / 2 + 10 * k);
          const by = an.body.y + an.body.h * 0.3;
          out.push(<path key={`sh${s}`} d={d`M ${bx} ${by} l ${s * 8 * k} ${-6 * k} M ${bx} ${by + 14 * k} l ${s * 10 * k} ${0} M ${bx} ${by + 28 * k} l ${s * 8 * k} ${6 * k}`} stroke={INK} strokeWidth={lw} strokeLinecap="round" />);
        });
        break;
      case 'moths': {
        const [hx, hy] = hand ?? [x + side * r, cy + r];
        [
          [0.2, -0.9, 1],
          [-0.4, -1.5, 0.8],
          [0.6, -2.0, 0.7],
        ].forEach(([dx, dy, s], i) => {
          const mx = hx + dx * r;
          const my = hy + dy * r * 0.8;
          out.push(
            <g key={`mo${i}`}>
              <path d={d`M ${mx} ${my} q ${-14 * k * s} ${-12 * k * s} ${-18 * k * s} ${2 * k * s} q ${8 * k * s} ${8 * k * s} ${18 * k * s} ${-2 * k * s} q ${14 * k * s} ${-12 * k * s} ${18 * k * s} ${2 * k * s} q ${-8 * k * s} ${8 * k * s} ${-18 * k * s} ${-2 * k * s} Z`} fill="#d9cfbf" stroke={INK} strokeWidth={lw * 0.6} />
              <path d={d`M ${mx - 3 * k} ${my + 6 * k} Q ${mx - 10 * k} ${my + 14 * k} ${mx - 4 * k} ${my + 20 * k}`} fill="none" stroke={INK} strokeWidth={lw * 0.4} strokeDasharray={`${3 * k} ${3 * k}`} />
            </g>,
          );
        });
        break;
      }
      case 'cloud': {
        const top = an.bare - 70 * k;
        out.push(
          <g key="cloud">
            <path d={d`M ${x - r * 0.9} ${top + 34 * k} q ${-4 * k} ${-26 * k} ${24 * k} ${-26 * k} q ${10 * k} ${-24 * k} ${42 * k} ${-12 * k} q ${30 * k} ${-14 * k} ${42 * k} ${14 * k} q ${26 * k} ${2 * k} ${16 * k} ${24 * k} Z`} fill="#8a93a8" stroke={INK} strokeWidth={lw * 0.8} />
            {[-0.5, -0.1, 0.3].map((t, i) => (
              <path key={i} d={d`M ${x + t * r} ${top + 42 * k} l ${-4 * k} ${14 * k}`} stroke="#6aa1e6" strokeWidth={lw} strokeLinecap="round" />
            ))}
          </g>,
        );
        break;
      }
      case 'dots':
        out.push(text(x + side * r * 0.6, an.bare - 2 * k, 34 * k, '…', INK, 'dots', 0));
        break;
      case 'lightning':
        [-1, 1].forEach((s) => {
          const bx = x + s * r * 1.05;
          const by = cy - r * 0.6;
          out.push(<path key={`lt${s}`} d={d`M ${bx} ${by - 22 * k} L ${bx - s * 12 * k} ${by} L ${bx + s * 2 * k} ${by} L ${bx - s * 10 * k} ${by + 24 * k} L ${bx + s * 14 * k} ${by - 4 * k} L ${bx} ${by - 4 * k} Z`} fill="#ffe14d" stroke={INK} strokeWidth={lw * 0.7} strokeLinejoin="round" />);
        });
        break;
      case 'fire': {
        const [mx, my] = an.mouth;
        out.push(
          <g key="fire">
            <path d={d`M ${mx} ${my} C ${mx + side * 30 * k} ${my - 30 * k} ${mx + side * 70 * k} ${my - 10 * k} ${mx + side * 96 * k} ${my - 30 * k} C ${mx + side * 84 * k} ${my} ${mx + side * 100 * k} ${my + 10 * k} ${mx + side * 110 * k} ${my + 14 * k} C ${mx + side * 70 * k} ${my + 30 * k} ${mx + side * 30 * k} ${my + 20 * k} ${mx} ${my} Z`} fill="#ff8a3d" stroke={INK} strokeWidth={lw * 0.8} strokeLinejoin="round" />
            <path d={d`M ${mx + side * 10 * k} ${my} C ${mx + side * 40 * k} ${my - 12 * k} ${mx + side * 60 * k} ${my} ${mx + side * 76 * k} ${my - 6 * k} C ${mx + side * 60 * k} ${my + 12 * k} ${mx + side * 30 * k} ${my + 10 * k} ${mx + side * 10 * k} ${my} Z`} fill="#ffd166" />
          </g>,
        );
        break;
      }
      default:
        break;
    }
  }
  return <g>{out}</g>;
}

/** 효과가 차지하는 머리 위 높이 (말풍선 배치용, 인물 단위) */
export const FX_ABOVE = new Set<Fx>(['question', 'exclaim', 'bulb', 'zzz', 'music', 'steam', 'gloom', 'cloud', 'dots', 'stars', 'soul']);
