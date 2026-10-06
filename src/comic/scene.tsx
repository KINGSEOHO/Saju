/**
 * 웹툰 무대 — 배경(장소·감정), 무대 소품, 손에 드는 소품.
 * 배경은 600×440 무대 좌표로 그리고, 컷의 카메라가 확대·이동해서 쓴다.
 */
import type { ReactNode } from 'react';
import { d, heartPath, rng, starPath, type Pt } from './draw.ts';
import type { Bg, Held, Mood, PanelTone, PropSpec } from './types.ts';

/** 무대 크기와 바닥선 */
export const SW = 600;
export const SH = 440;
export const GROUND = 404;
export const INK = '#47342e';
const WHITE = '#ffffff';
const PW = SW;
const PH = SH;

function coin(cx: number, cy: number, r: number, key?: string | number) {
  return (
    <g key={key}>
      <circle cx={cx} cy={cy} r={r} fill="#ffd34d" stroke="#c98f00" strokeWidth={2} />
      <circle cx={cx} cy={cy} r={r * 0.72} fill="none" stroke="#e6ad12" strokeWidth={1.6} />
      <text x={cx} y={cy + r * 0.38} fontSize={r * 1.05} fontWeight={800} textAnchor="middle" fill="#b07800">
        ₩
      </text>
    </g>
  );
}

/** 손에 든 소품 (뒤집히지 않는 좌표계에서 그린다 — 글자가 거울상이 되지 않게) */
export function HeldView({ kind, at, inHand }: { kind: Held; at: Pt; inHand?: boolean }) {
  const [x, y] = at;
  const st = { stroke: INK, strokeWidth: 2.4, strokeLinejoin: 'round' as const };
  switch (kind) {
    case 'document':
      return (
        <g transform={`rotate(-8 ${x} ${y})`}>
          <rect x={x - 22} y={y - 28} width={44} height={56} rx={4} fill={WHITE} {...st} />
          {[-16, -8, 0, 8].map((o, i) => (
            <path key={o} d={d`M ${x - 14} ${y + o} L ${x + (i === 3 ? 4 : 14)} ${y + o}`} stroke="#b8b2ab" strokeWidth={2.6} strokeLinecap="round" />
          ))}
        </g>
      );
    case 'certificate':
      return (
        <g transform={`rotate(-5 ${x} ${y})`}>
          <rect x={x - 30} y={y - 24} width={60} height={46} rx={3} fill="#fff8e1" {...st} />
          <rect x={x - 25} y={y - 19} width={50} height={36} fill="none" stroke="#d9b54a" strokeWidth={1.6} />
          {[-10, -3, 4].map((o) => (
            <path key={o} d={d`M ${x - 16} ${y + o} L ${x + 12} ${y + o}`} stroke="#b8a77a" strokeWidth={2.2} strokeLinecap="round" />
          ))}
          <circle cx={x + 17} cy={y + 13} r={8} fill="#e8b33a" stroke={INK} strokeWidth={1.8} />
        </g>
      );
    case 'phone':
      return (
        <g transform={`rotate(${inHand ? -12 : 0} ${x} ${y})`}>
          <rect x={x - 14} y={y - 24} width={28} height={48} rx={6} fill="#2d3142" {...st} />
          <rect x={x - 10} y={y - 19} width={20} height={36} rx={3} fill="#9fd3ff" />
        </g>
      );
    case 'book':
      return (
        <g>
          <path d={d`M ${x} ${y - 13} Q ${x - 15} ${y - 22} ${x - 32} ${y - 16} L ${x - 32} ${y + 16} Q ${x - 15} ${y + 10} ${x} ${y + 19} Q ${x + 15} ${y + 10} ${x + 32} ${y + 16} L ${x + 32} ${y - 16} Q ${x + 15} ${y - 22} ${x} ${y - 13} Z`} fill={WHITE} {...st} />
          <path d={d`M ${x} ${y - 13} L ${x} ${y + 19}`} stroke={INK} strokeWidth={2} />
          {[-6, 1, 8].map((o) => (
            <g key={o}>
              <path d={d`M ${x - 26} ${y + o - 4} Q ${x - 14} ${y + o - 8} ${x - 5} ${y + o - 3}`} stroke="#c4bdb4" strokeWidth={2} fill="none" />
              <path d={d`M ${x + 5} ${y + o - 3} Q ${x + 14} ${y + o - 8} ${x + 26} ${y + o - 4}`} stroke="#c4bdb4" strokeWidth={2} fill="none" />
            </g>
          ))}
        </g>
      );
    case 'notebook':
      return (
        <g transform={`rotate(-6 ${x} ${y})`}>
          <rect x={x - 21} y={y - 26} width={42} height={52} rx={4} fill="#ffe08a" {...st} />
          {[-12, -2, 8].map((o) => (
            <path key={o} d={d`M ${x - 13} ${y + o} L ${x + 13} ${y + o}`} stroke="#d6a93a" strokeWidth={2.2} strokeLinecap="round" />
          ))}
          {[-12, -4, 4, 12].map((o) => (
            <circle key={o} cx={x + o} cy={y - 26} r={3} fill={WHITE} stroke={INK} strokeWidth={1.6} />
          ))}
        </g>
      );
    case 'drawing':
      return (
        <g transform={`rotate(-6 ${x} ${y})`}>
          <rect x={x - 28} y={y - 24} width={56} height={46} rx={3} fill={WHITE} {...st} />
          <circle cx={x - 13} cy={y - 10} r={7} fill="#ffd34d" />
          <path d={d`M ${x - 4} ${y + 14} L ${x + 9} ${y - 2} L ${x + 22} ${y + 14} Z`} fill="#ff7b7b" stroke={INK} strokeWidth={1.6} />
          <path d={d`M ${x - 24} ${y + 16} Q ${x - 10} ${y + 10} ${x + 4} ${y + 16}`} stroke="#5ab55a" strokeWidth={3} fill="none" />
        </g>
      );
    case 'money':
      return (
        <g>
          <rect x={x - 30} y={y - 12} width={60} height={30} rx={3} fill="#6fbf6a" {...st} transform={`rotate(-10 ${x} ${y})`} />
          <rect x={x - 30} y={y - 18} width={60} height={30} rx={3} fill="#8fd18a" {...st} />
          <circle cx={x} cy={y - 3} r={9} fill="#6fbf6a" stroke="#3f8a3c" strokeWidth={1.6} />
          <text x={x} y={y + 2} fontSize={13} fontWeight={800} textAnchor="middle" fill="#2f6b2e">
            ₩
          </text>
        </g>
      );
    case 'coin':
      return coin(x, y - 4, 15);
    case 'trophy':
      return (
        <g>
          <path d={d`M ${x - 22} ${y - 30} L ${x + 22} ${y - 30} Q ${x + 22} ${y - 2} ${x} ${y + 2} Q ${x - 22} ${y - 2} ${x - 22} ${y - 30} Z`} fill="#ffcd3c" {...st} />
          <path d={d`M ${x - 22} ${y - 24} Q ${x - 36} ${y - 22} ${x - 22} ${y - 10} M ${x + 22} ${y - 24} Q ${x + 36} ${y - 22} ${x + 22} ${y - 10}`} fill="none" {...st} />
          <rect x={x - 5} y={y + 1} width={10} height={10} fill="#e0a800" {...st} />
          <rect x={x - 16} y={y + 10} width={32} height={9} rx={2} fill="#9a6b45" {...st} />
          <path d={starPath(x, y - 17, 7)} fill={WHITE} opacity={0.8} />
        </g>
      );
    case 'coffee':
      return (
        <g>
          <path d={d`M ${x - 14} ${y - 18} L ${x + 14} ${y - 18} L ${x + 11} ${y + 18} L ${x - 11} ${y + 18} Z`} fill={WHITE} {...st} />
          <rect x={x - 13.5} y={y - 6} width={27} height={11} fill="#b07a4f" />
          <rect x={x - 16} y={y - 24} width={32} height={7} rx={3} fill="#e9e3dc" {...st} />
          <path d={d`M ${x - 4} ${y - 30} q -5 -7 0 -14 M ${x + 5} ${y - 30} q -5 -7 0 -14`} stroke="#b8b2ab" strokeWidth={2.4} fill="none" strokeLinecap="round" />
        </g>
      );
    case 'gift':
      return (
        <g>
          <rect x={x - 22} y={y - 16} width={44} height={34} rx={3} fill="#ff7b7b" {...st} />
          <rect x={x - 25} y={y - 24} width={50} height={10} rx={2} fill="#ff9a9a" {...st} />
          <rect x={x - 4} y={y - 24} width={8} height={42} fill="#ffd34d" />
          <path d={d`M ${x} ${y - 24} C ${x - 18} ${y - 40} ${x - 22} ${y - 22} ${x} ${y - 24} C ${x + 22} ${y - 22} ${x + 18} ${y - 40} ${x} ${y - 24} Z`} fill="#ffd34d" {...st} />
        </g>
      );
    case 'cake':
      return (
        <g>
          <rect x={x - 26} y={y - 8} width={52} height={24} rx={4} fill="#ffd9e2" {...st} />
          <path d={d`M ${x - 26} ${y - 2} Q ${x - 19} ${y + 5} ${x - 13} ${y - 2} Q ${x - 6} ${y + 5} ${x} ${y - 2} Q ${x + 6} ${y + 5} ${x + 13} ${y - 2} Q ${x + 19} ${y + 5} ${x + 26} ${y - 2}`} fill="none" stroke="#ff8fab" strokeWidth={3} />
          <rect x={x - 2.5} y={y - 26} width={5} height={18} fill="#8fc3e8" stroke={INK} strokeWidth={1.6} />
          <path d={d`M ${x} ${y - 38} Q ${x + 6} ${y - 31} ${x} ${y - 27} Q ${x - 6} ${y - 31} ${x} ${y - 38} Z`} fill="#ffb347" />
        </g>
      );
    case 'heart':
      return <path d={heartPath(x, y - 2, 22)} fill="#ff5d7a" {...st} />;
    case 'wallet':
      return (
        <g>
          <rect x={x - 25} y={y - 14} width={50} height={30} rx={5} fill="#8b5e3c" {...st} />
          <path d={d`M ${x - 21} ${y - 14} L ${x - 17} ${y - 30} L ${x + 19} ${y - 30} L ${x + 21} ${y - 14}`} fill="#6b4529" {...st} />
          <circle cx={x - 12} cy={y - 40} r={2.6} fill="#c4bdb4" />
          <circle cx={x + 2} cy={y - 47} r={2} fill="#c4bdb4" />
          <circle cx={x + 13} cy={y - 39} r={2.4} fill="#c4bdb4" />
        </g>
      );
    case 'mic':
      return (
        <g transform={`rotate(-20 ${x} ${y})`}>
          <rect x={x - 5} y={y - 22} width={10} height={30} rx={4} fill="#333" {...st} />
          <circle cx={x} cy={y - 30} r={11} fill="#888" {...st} />
          <path d={d`M ${x - 7} ${y - 34} L ${x + 7} ${y - 34} M ${x - 8} ${y - 28} L ${x + 8} ${y - 28}`} stroke="#555" strokeWidth={1.6} />
        </g>
      );
    case 'brush':
      return (
        <g transform={`rotate(-30 ${x} ${y})`}>
          <rect x={x - 3} y={y - 34} width={6} height={44} rx={2} fill="#c08a5b" {...st} />
          <path d={d`M ${x - 5} ${y - 34} L ${x + 5} ${y - 34} L ${x} ${y - 50} Z`} fill="#e8615a" {...st} />
        </g>
      );
    case 'bag':
      return (
        <g>
          <path d={d`M ${x - 10} ${y - 6} Q ${x - 10} ${y - 18} ${x} ${y - 18} Q ${x + 10} ${y - 18} ${x + 10} ${y - 6}`} fill="none" {...st} strokeWidth={3} />
          <rect x={x - 24} y={y - 6} width={48} height={34} rx={4} fill="#7a5230" {...st} />
          <rect x={x - 4} y={y + 2} width={8} height={7} fill="#ffcd3c" stroke={INK} strokeWidth={1.4} />
        </g>
      );
    case 'laptop':
      return (
        <g>
          <path d={d`M ${x - 30} ${y - 26} L ${x + 30} ${y - 26} L ${x + 26} ${y + 10} L ${x - 26} ${y + 10} Z`} fill="#c9ced6" {...st} />
          <circle cx={x} cy={y - 8} r={5} fill="#e9ecf1" />
          <rect x={x - 36} y={y + 8} width={72} height={7} rx={3} fill="#aeb4bf" {...st} strokeWidth={2} />
        </g>
      );
    case 'tablet':
      return (
        <g transform={`rotate(-8 ${x} ${y})`}>
          <rect x={x - 22} y={y - 30} width={44} height={58} rx={6} fill="#2d3142" {...st} />
          <rect x={x - 18} y={y - 25} width={36} height={46} rx={2} fill="#bfe3ff" />
          <path d={d`M ${x - 12} ${y + 12} L ${x - 4} ${y} L ${x + 4} ${y + 6} L ${x + 13} ${y - 10}`} stroke="#e5484d" strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      );
    case 'flower':
      return (
        <g>
          <path d={d`M ${x} ${y + 26} L ${x - 2} ${y - 6} M ${x} ${y + 10} Q ${x + 12} ${y + 2} ${x + 14} ${y - 6}`} stroke="#4f9a5d" strokeWidth={3.4} fill="none" strokeLinecap="round" />
          <path d={d`M ${x - 16} ${y + 6} L ${x + 16} ${y + 6} L ${x + 8} ${y + 30} L ${x - 8} ${y + 30} Z`} fill="#fbe3ec" {...st} />
          {[0, 72, 144, 216, 288].map((a) => (
            <ellipse key={a} cx={x - 2 + Math.cos((a * Math.PI) / 180) * 8} cy={y - 14 + Math.sin((a * Math.PI) / 180) * 8} rx={7} ry={7} fill="#ff8fab" stroke={INK} strokeWidth={1.6} />
          ))}
          <circle cx={x - 2} cy={y - 14} r={5} fill="#ffd34d" stroke={INK} strokeWidth={1.4} />
        </g>
      );
    case 'umbrella': {
      const cx = x * 0.35;
      const cy = y - 70;
      return (
        <g>
          <path d={d`M ${x} ${y} L ${cx} ${cy}`} stroke={INK} strokeWidth={3} />
          <path
            d={d`M ${cx - 60} ${cy + 6} Q ${cx} ${cy - 58} ${cx + 60} ${cy + 6} Q ${cx + 45} ${cy - 4} ${cx + 30} ${cy + 6} Q ${cx + 15} ${cy - 4} ${cx} ${cy + 6} Q ${cx - 15} ${cy - 4} ${cx - 30} ${cy + 6} Q ${cx - 45} ${cy - 4} ${cx - 60} ${cy + 6} Z`}
            fill="#5b8fd9"
            {...st}
          />
        </g>
      );
    }
  }
}

// ---------------------------------------------------------------------------
// 배경
// ---------------------------------------------------------------------------
function Grad({ id, from, to, x2 = 0, y2 = 1 }: { id: string; from: string; to: string; x2?: number; y2?: number }) {
  return (
    <defs>
      <linearGradient id={id} x1={0} y1={0} x2={x2} y2={y2}>
        <stop offset="0" stopColor={from} />
        <stop offset="1" stopColor={to} />
      </linearGradient>
    </defs>
  );
}

function Glow({ id, cx, cy, r, color, opacity }: { id: string; cx: number; cy: number; r: number; color: string; opacity: number }) {
  return (
    <g>
      <defs>
        <radialGradient id={id}>
          <stop offset="0" stopColor={color} stopOpacity={opacity} />
          <stop offset="1" stopColor={color} stopOpacity={0} />
        </radialGradient>
      </defs>
      <circle cx={cx} cy={cy} r={r} fill={`url(#${id})`} />
    </g>
  );
}

function Floor({ y = 330, color, line }: { y?: number; color: string; line?: string }) {
  return (
    <g>
      <rect x={0} y={y} width={PW} height={PH - y} fill={color} />
      {line && <rect x={0} y={y - 4} width={PW} height={6} fill={line} />}
    </g>
  );
}

function Cloud({ x, y, s = 1, fill = WHITE, opacity = 0.95 }: { x: number; y: number; s?: number; fill?: string; opacity?: number }) {
  return (
    <g fill={fill} opacity={opacity}>
      <ellipse cx={x} cy={y} rx={34 * s} ry={14 * s} />
      <circle cx={x - 12 * s} cy={y - 8 * s} r={14 * s} />
      <circle cx={x + 10 * s} cy={y - 12 * s} r={17 * s} />
    </g>
  );
}

function Skyline({ seed, y, colors, win, h0 = 60, h1 = 150, lit = 0 }: { seed: number; y: number; colors: string[]; win: string; h0?: number; h1?: number; lit?: number }) {
  const r = rng(seed);
  const out: ReactNode[] = [];
  let x = -10;
  let i = 0;
  while (x < PW + 10) {
    const w = 46 + Math.floor(r() * 50);
    const h = h0 + Math.floor(r() * (h1 - h0));
    const c = colors[i % colors.length];
    out.push(<rect key={`b${i}`} x={x} y={y - h} width={w} height={h} fill={c} />);
    for (let wy = y - h + 12; wy < y - 14; wy += 20) {
      for (let wx = x + 8; wx < x + w - 12; wx += 16) {
        const on = r() < lit;
        out.push(<rect key={`w${i}-${wx}-${wy}`} x={wx} y={wy} width={8} height={11} fill={on ? '#ffd76a' : win} opacity={on ? 0.95 : 0.7} />);
      }
    }
    x += w + 4;
    i++;
  }
  return <g>{out}</g>;
}

function Window({ x, y, w, h, sky, frame = WHITE, night = false, u }: { x: number; y: number; w: number; h: number; sky: string; frame?: string; night?: boolean; u: string }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} fill={sky} />
      <g>
        <clipPath id={`${u}win-${x}-${y}`}>
          <rect x={x} y={y} width={w} height={h} />
        </clipPath>
        <g clipPath={`url(#${u}win-${x}-${y})`}>
          <g transform={`translate(${x} ${y + h}) scale(${w / PW} 0.6) translate(0 0)`}>
            <Skyline seed={x + y} y={0} colors={night ? ['#24305a', '#1d2850'] : ['#a9c0dd', '#b9cbe3']} win={night ? '#2d3a66' : '#dfe9f6'} h0={60} h1={200} lit={night ? 0.35 : 0} />
          </g>
        </g>
      </g>
      <rect x={x} y={y} width={w} height={h} fill="none" stroke={frame} strokeWidth={7} />
      <path d={d`M ${x + w / 2} ${y} L ${x + w / 2} ${y + h} M ${x} ${y + h / 2} L ${x + w} ${y + h / 2}`} stroke={frame} strokeWidth={5} />
    </g>
  );
}

function WallClock({ x, y, ring = '#9aa6b8' }: { x: number; y: number; ring?: string }) {
  return (
    <g>
      <circle cx={x} cy={y} r={24} fill={WHITE} stroke={ring} strokeWidth={5} />
      <path d={d`M ${x} ${y} L ${x} ${y - 14} M ${x} ${y} L ${x + 10} ${y + 4}`} stroke={INK} strokeWidth={3} strokeLinecap="round" />
    </g>
  );
}

function Tree({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g>
      <rect x={x - 8 * s} y={y - 70 * s} width={16 * s} height={70 * s} rx={4} fill="#9a6b45" />
      <circle cx={x} cy={y - 100 * s} r={44 * s} fill="#6fbf6a" />
      <circle cx={x - 30 * s} cy={y - 78 * s} r={30 * s} fill="#64b45f" />
      <circle cx={x + 30 * s} cy={y - 80 * s} r={32 * s} fill="#79c873" />
    </g>
  );
}

function Plant({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <path d={d`M ${x - 10} ${y - 40} Q ${x - 40} ${y - 70} ${x - 20} ${y - 96} Q ${x - 6} ${y - 70} ${x - 10} ${y - 40} Z`} fill="#5aa469" />
      <path d={d`M ${x + 6} ${y - 40} Q ${x + 34} ${y - 76} ${x + 16} ${y - 104} Q ${x - 2} ${y - 74} ${x + 6} ${y - 40} Z`} fill="#6dbb78" />
      <path d={d`M ${x} ${y - 40} Q ${x - 4} ${y - 90} ${x + 2} ${y - 116} Q ${x + 12} ${y - 84} ${x} ${y - 40} Z`} fill="#4f9a5d" />
      <path d={d`M ${x - 20} ${y - 42} L ${x + 20} ${y - 42} L ${x + 15} ${y} L ${x - 15} ${y} Z`} fill="#c97b52" stroke="#a5603c" strokeWidth={2} />
    </g>
  );
}

function rays(cx: number, cy: number, n: number, color: string, R = 700) {
  return Array.from({ length: n }, (_, i) => {
    const a0 = (i / n) * Math.PI * 2;
    const a1 = a0 + Math.PI / n;
    return <path key={i} d={d`M ${cx} ${cy} L ${cx + Math.cos(a0) * R} ${cy + Math.sin(a0) * R} L ${cx + Math.cos(a1) * R} ${cy + Math.sin(a1) * R} Z`} fill={color} />;
  });
}

const TONE_BURST: Record<PanelTone, [string, string]> = {
  good: ['#fff3c2', '#ffe48f'],
  neutral: ['#eaf1fb', '#d9e5f6'],
  bad: ['#e8e4f5', '#d4ccee'],
};

export function Background({ kind, tone = 'neutral', u }: { kind: Bg; tone?: PanelTone; u: string }) {
  switch (kind) {
    case 'office':
    case 'officeNight': {
      const night = kind === 'officeNight';
      return (
        <g>
          <rect width={PW} height={PH} fill={night ? '#3a4566' : '#e8eef6'} />
          <Window u={u} x={40} y={70} w={210} h={160} sky={night ? '#18213f' : '#cfe7ff'} frame={night ? '#55618a' : WHITE} night={night} />
          <WallClock x={500} y={96} ring={night ? '#7b86a8' : '#9aa6b8'} />
          <Floor color={night ? '#2c3550' : '#cdd5e1'} line={night ? '#252d45' : '#b7c1d0'} />
          {!night && <Plant x={560} y={330} />}
          {night && <Glow id={`${u}glow-office`} cx={300} cy={300} r={260} color="#ffe7a8" opacity={0.22} />}
        </g>
      );
    }
    case 'home':
      return (
        <g>
          <rect width={PW} height={PH} fill="#fbefe2" />
          {Array.from({ length: 16 }, (_, i) => (
            <rect key={i} x={i * 40} y={0} width={18} height={330} fill="#f6e5d2" />
          ))}
          <rect x={60} y={86} width={96} height={74} rx={4} fill={WHITE} stroke="#c9a77f" strokeWidth={6} />
          <path d="M 70 150 L 98 116 L 116 136 L 128 124 L 146 150 Z" fill="#9fd08f" />
          <circle cx={134} cy={106} r={8} fill="#ffcf5c" />
          <rect x={400} y={70} width={150} height={150} fill="#d7efff" stroke={WHITE} strokeWidth={7} />
          <path d="M 400 70 Q 430 140 410 220 L 400 220 Z M 550 70 Q 520 140 540 220 L 550 220 Z" fill="#f4b6b6" />
          <rect x={392} y={62} width={166} height={10} rx={4} fill="#c9a77f" />
          <Floor color="#e6cda6" line="#d4b58a" />
          {[0, 1, 2, 3].map((i) => (
            <path key={i} d={d`M 0 ${352 + i * 26} L ${PW} ${352 + i * 26}`} stroke="#d8bb92" strokeWidth={2} />
          ))}
        </g>
      );
    case 'cafe':
      return (
        <g>
          <rect width={PW} height={PH} fill="#f3e5d5" />
          <rect x={0} y={250} width={PW} height={80} fill="#dcbfa0" />
          {Array.from({ length: 20 }, (_, i) => (
            <path key={i} d={d`M ${i * 32} 252 L ${i * 32} 330`} stroke="#c9a888" strokeWidth={2} />
          ))}
          <rect x={410} y={96} width={150} height={110} rx={6} fill="#3d3d3d" stroke="#8b5e3c" strokeWidth={7} />
          <text x={485} y={128} fontSize={20} fontWeight={800} textAnchor="middle" fill="#f5f0e6">
            MENU
          </text>
          {[148, 166, 184].map((yy) => (
            <path key={yy} d={d`M 430 ${yy} L 540 ${yy}`} stroke="#f5f0e6" strokeWidth={2.4} strokeDasharray="6 6" opacity={0.7} />
          ))}
          {[110, 300].map((x) => (
            <g key={x}>
              <circle cx={x} cy={92} r={46} fill="#fff1c4" opacity={0.55} />
              <path d={d`M ${x} 0 L ${x} 56`} stroke="#5b4636" strokeWidth={2} />
              <path d={d`M ${x - 24} 82 L ${x + 24} 82 L ${x + 11} 56 L ${x - 11} 56 Z`} fill="#3f6b5c" />
            </g>
          ))}
          <Floor color="#b98e6a" line="#a37a58" />
        </g>
      );
    case 'park':
      return (
        <g>
          <Grad id={`${u}g-park`} from="#bfe4ff" to="#eef8ff" />
          <rect width={PW} height={PH} fill={`url(#${u}g-park)`} />
          <circle cx={540} cy={150} r={50} fill="#ffd95e" opacity={0.25} />
          <circle cx={540} cy={150} r={30} fill="#ffd95e" />
          <Cloud x={140} y={120} />
          <Cloud x={360} y={86} s={0.8} />
          <path d="M 0 300 Q 150 250 300 290 Q 450 330 600 280 L 600 440 L 0 440 Z" fill="#b5e3a0" />
          <Tree x={64} y={330} />
          <Tree x={548} y={326} s={0.9} />
          <rect x={0} y={330} width={PW} height={110} fill="#a6da86" />
          <path d="M 240 440 Q 280 380 300 330 L 330 330 Q 330 380 380 440 Z" fill="#e9dcae" opacity={0.8} />
        </g>
      );
    case 'city':
      return (
        <g>
          <Grad id={`${u}g-city`} from="#cfe9ff" to="#f3f9ff" />
          <rect width={PW} height={PH} fill={`url(#${u}g-city)`} />
          <Cloud x={480} y={70} s={0.9} />
          <Skyline seed={7} y={330} colors={['#b9c7dd', '#a9b9d1', '#c6d2e4', '#d3dceb']} win="#eef4fb" h0={80} h1={230} />
          <Floor color="#ddd6cb" line="#c8beb0" />
          <path d="M 0 400 L 600 400" stroke="#cfc6b8" strokeWidth={3} strokeDasharray="30 22" />
        </g>
      );
    case 'school':
      return (
        <g>
          <rect width={PW} height={PH} fill="#eef3e4" />
          <rect x={110} y={58} width={380} height={168} fill="#2f5d4a" stroke="#b08457" strokeWidth={9} />
          <text x={170} y={120} fontSize={26} fontWeight={700} fill="#ffffff" opacity={0.8}>
            1 + 1 = 2
          </text>
          <path d="M 170 150 Q 230 136 290 156 T 410 150" stroke="#ffffff" strokeWidth={3} fill="none" opacity={0.6} />
          <path d="M 330 100 L 440 100 M 330 122 L 410 122" stroke="#ffffff" strokeWidth={3} opacity={0.5} />
          <rect x={150} y={226} width={300} height={8} fill="#a07650" />
          <WallClock x={548} y={86} />
          <Floor color="#d9c9a9" line="#c4b18e" />
        </g>
      );
    case 'night': {
      const r = rng(11);
      return (
        <g>
          <Grad id={`${u}g-night`} from="#1b2550" to="#3d4b80" />
          <rect width={PW} height={PH} fill={`url(#${u}g-night)`} />
          {Array.from({ length: 34 }, (_, i) => (
            <circle key={i} cx={r() * PW} cy={r() * 230} r={0.8 + r() * 1.8} fill={WHITE} opacity={0.4 + r() * 0.5} />
          ))}
          <circle cx={500} cy={86} r={44} fill="#ffe9a8" opacity={0.18} />
          <circle cx={500} cy={86} r={28} fill="#ffe9a8" />
          <Skyline seed={23} y={330} colors={['#151d3d', '#1a2347']} win="#202a52" h0={60} h1={170} lit={0.3} />
          <Floor color="#232c52" line="#1c2445" />
        </g>
      );
    }
    case 'mountain':
      return (
        <g>
          <Grad id={`${u}g-mtn`} from="#ffd3a1" to="#fff2e2" />
          <rect width={PW} height={PH} fill={`url(#${u}g-mtn)`} />
          <circle cx={300} cy={214} r={46} fill="#ffb35c" />
          <path d="M -20 300 L 120 150 L 220 240 L 330 120 L 460 250 L 540 190 L 640 300 Z" fill="#c9b6d8" />
          <path d="M -20 330 L 90 230 L 200 300 L 300 210 L 420 310 L 520 250 L 640 330 Z" fill="#8fb996" />
          <path d="M 330 120 L 330 92 L 352 100 L 330 108" stroke="#7a5638" strokeWidth={2.4} fill="#e8615a" />
          <Floor color="#7fae6a" />
        </g>
      );
    case 'stage':
      return (
        <g>
          <rect width={PW} height={PH} fill="#2b2244" />
          <path d="M 260 0 L 340 0 L 470 404 L 130 404 Z" fill="#fff6c8" opacity={0.22} />
          <path d="M 0 0 L 110 0 Q 90 120 120 240 Q 90 320 110 440 L 0 440 Z" fill="#b8333f" />
          <path d="M 600 0 L 490 0 Q 510 120 480 240 Q 510 320 490 440 L 600 440 Z" fill="#b8333f" />
          <path d="M 30 0 Q 20 200 40 440 M 70 0 Q 60 200 76 440 M 570 0 Q 580 200 560 440 M 530 0 Q 540 200 524 440" stroke="#8f2430" strokeWidth={4} fill="none" />
          <path d="M 0 0 L 600 0 L 600 34 Q 550 52 500 34 Q 450 52 400 34 Q 350 52 300 34 Q 250 52 200 34 Q 150 52 100 34 Q 50 52 0 34 Z" fill="#c94a55" stroke="#f2c14e" strokeWidth={3} />
          <rect x={0} y={346} width={PW} height={94} fill="#7a5638" />
          <rect x={0} y={342} width={PW} height={6} fill="#5c3f28" />
          <ellipse cx={300} cy={404} rx={160} ry={20} fill="#fff6c8" opacity={0.35} />
        </g>
      );
    case 'library': {
      const r = rng(5);
      const cols = ['#c97a6d', '#6f93c2', '#9cbb75', '#9a83b8', '#e0a35f', '#68aebf', '#d6bb5c'];
      const books: ReactNode[] = [];
      for (const sx of [24, 316]) {
        for (let row = 0; row < 4; row++) {
          let x = sx + 10;
          const yb = 116 + row * 62;
          while (x < sx + 250) {
            const w = 10 + Math.floor(r() * 9);
            const h = 38 + Math.floor(r() * 16);
            books.push(<rect key={`${sx}-${row}-${x}`} x={x} y={yb - h} width={w} height={h} fill={cols[Math.floor(r() * cols.length)]} opacity={0.85} />);
            x += w + 2;
          }
        }
      }
      return (
        <g>
          <rect width={PW} height={PH} fill="#efe5d6" />
          <rect x={24} y={46} width={260} height={290} fill="#a67c52" />
          <rect x={316} y={46} width={260} height={290} fill="#a67c52" />
          <rect x={30} y={52} width={248} height={278} fill="#8d6642" />
          <rect x={322} y={52} width={248} height={278} fill="#8d6642" />
          {books}
          {[0, 1, 2, 3].map((row) => (
            <g key={row}>
              <rect x={24} y={116 + row * 62} width={260} height={7} fill="#b88a5e" />
              <rect x={316} y={116 + row * 62} width={260} height={7} fill="#b88a5e" />
            </g>
          ))}
          <Floor color="#cdb393" line="#b99e7c" />
        </g>
      );
    }
    case 'dinner':
      return (
        <g>
          <Grad id={`${u}g-dinner`} from="#3d2f4f" to="#5c4567" />
          <rect width={PW} height={PH} fill={`url(#${u}g-dinner)`} />
          <Window u={u} x={360} y={64} w={190} h={150} sky="#1b2246" frame="#7d6a8a" night />
          <Glow id={`${u}glow-sconce`} cx={90} cy={130} r={90} color="#ffcf8a" opacity={0.45} />
          <path d="M 76 136 L 104 136 L 98 116 L 82 116 Z" fill="#f2c14e" />
          <Glow id={`${u}glow-dinner`} cx={300} cy={320} r={300} color="#ffcf8a" opacity={0.22} />
          <Floor color="#4a3a46" line="#3c2e3a" />
        </g>
      );
    case 'crossroad':
      return (
        <g>
          <Grad id={`${u}g-cross`} from="#c7e6ff" to="#f2f9ff" />
          <rect width={PW} height={PH} fill={`url(#${u}g-cross)`} />
          <Cloud x={130} y={90} s={0.9} />
          <Cloud x={470} y={120} s={0.7} />
          <rect x={0} y={250} width={PW} height={190} fill="#b5dd98" />
          <path d="M 170 440 Q 210 330 30 262 L 96 254 Q 250 296 300 316 Q 350 296 504 254 L 570 262 Q 390 330 430 440 Z" fill="#cfc9be" />
          <path d="M 300 436 L 300 336 M 286 322 Q 200 290 64 259 M 314 322 Q 400 290 536 259" stroke={WHITE} strokeWidth={4} strokeDasharray="16 14" fill="none" />
        </g>
      );
    case 'rain': {
      const r = rng(3);
      return (
        <g>
          <Grad id={`${u}g-rain`} from="#93a0b4" to="#c9d0da" />
          <rect width={PW} height={PH} fill={`url(#${u}g-rain)`} />
          <Skyline seed={41} y={330} colors={['#aab4c3', '#b6bfcc']} win="#c5ccd8" h0={70} h1={190} />
          <Floor color="#8e98a7" />
          <ellipse cx={150} cy={392} rx={70} ry={10} fill="#a9b6c6" />
          <ellipse cx={470} cy={414} rx={60} ry={8} fill="#a9b6c6" />
          {Array.from({ length: 70 }, (_, i) => {
            const x = r() * (PW + 60) - 30;
            const y = r() * PH;
            return <path key={i} d={d`M ${x} ${y} l -6 18`} stroke={WHITE} strokeWidth={2} opacity={0.55} strokeLinecap="round" />;
          })}
        </g>
      );
    }
    case 'sea':
      return (
        <g>
          <Grad id={`${u}g-sea`} from="#a8dcff" to="#e6f6ff" />
          <rect width={PW} height={PH} fill={`url(#${u}g-sea)`} />
          <circle cx={470} cy={96} r={30} fill="#ffe27a" />
          <Cloud x={160} y={96} s={0.9} />
          <path d="M 120 150 q 8 -8 16 0 q 8 -8 16 0 M 200 128 q 6 -6 12 0 q 6 -6 12 0" stroke="#5a6b80" strokeWidth={2.4} fill="none" />
          <rect x={0} y={230} width={PW} height={110} fill="#4f9fe0" />
          {[256, 282, 308].map((y, i) => (
            <path key={y} d={d`M ${-20 + i * 30} ${y} q 25 -10 50 0 t 50 0 t 50 0 t 50 0 t 50 0 t 50 0 t 50 0 t 50 0 t 50 0 t 50 0 t 50 0 t 50 0 t 50 0`} stroke="#8cc8f2" strokeWidth={3} fill="none" />
          ))}
          <path d="M 0 336 Q 150 320 300 338 Q 450 356 600 332 L 600 440 L 0 440 Z" fill="#f1dfb2" />
        </g>
      );
    case 'money': {
      const r = rng(17);
      return (
        <g>
          <rect width={PW} height={PH} fill="#fff4cf" />
          {rays(300, 230, 18, '#ffeaa6')}
          {Array.from({ length: 10 }, (_, i) => {
            const x = 30 + r() * 540;
            const y = 40 + r() * 220;
            return r() < 0.5 ? (
              coin(x, y, 10 + r() * 8, i)
            ) : (
              <g key={i} transform={`rotate(${-20 + r() * 40} ${x} ${y})`}>
                <rect x={x - 22} y={y - 11} width={44} height={22} rx={3} fill="#9ed49a" stroke="#5fa35a" strokeWidth={2} />
                <circle cx={x} cy={y} r={6} fill="#7cc477" />
              </g>
            );
          })}
          <Floor color="#f4dfa0" line="#e8cd80" />
        </g>
      );
    }
    case 'gym':
      return (
        <g>
          <rect width={PW} height={PH} fill="#e3f2ef" />
          <Window u={u} x={60} y={70} w={200} h={140} sky="#d4efff" />
          <rect x={380} y={264} width={180} height={12} rx={4} fill="#9aa6b8" />
          <path d="M 392 276 L 392 330 M 548 276 L 548 330" stroke="#9aa6b8" strokeWidth={6} />
          {[400, 440, 480, 520].map((x) => (
            <g key={x}>
              <rect x={x - 12} y={244} width={8} height={20} rx={2} fill="#4b5168" />
              <rect x={x + 4} y={244} width={8} height={20} rx={2} fill="#4b5168" />
              <rect x={x - 6} y={251} width={12} height={6} fill="#7c8597" />
            </g>
          ))}
          <Floor color="#9fd1c6" line="#86bfb3" />
        </g>
      );
    case 'bedroom':
      return (
        <g>
          <rect width={PW} height={PH} fill="#e5e3f4" />
          <rect x={70} y={70} width={150} height={140} fill="#27325c" stroke={WHITE} strokeWidth={7} />
          <circle cx={170} cy={110} r={18} fill="#ffe9a8" />
          <path d="M 145 70 L 145 210 M 70 140 L 220 140" stroke={WHITE} strokeWidth={5} />
          <rect x={410} y={210} width={190} height={80} rx={10} fill="#b79b7a" />
          <rect x={400} y={270} width={200} height={70} rx={12} fill={WHITE} stroke="#d6d3d1" strokeWidth={2} />
          <path d="M 430 280 Q 520 262 600 286 L 600 340 L 420 340 Z" fill="#9db7e8" />
          <rect x={420} y={250} width={70} height={28} rx={12} fill="#fdfbff" stroke="#d6d3d1" strokeWidth={2} />
          <Glow id={`${u}glow-bed`} cx={330} cy={240} r={120} color="#ffe7a8" opacity={0.4} />
          <Floor color="#d3c7b6" line="#c1b39f" />
        </g>
      );
    case 'hospital':
      return (
        <g>
          <rect width={PW} height={PH} fill="#eef6f5" />
          <rect x={0} y={236} width={PW} height={14} fill="#cfe9e3" />
          <rect x={40} y={60} width={190} height={150} fill="#d8eefc" stroke={WHITE} strokeWidth={7} />
          {Array.from({ length: 9 }, (_, i) => (
            <rect key={i} x={40} y={64 + i * 16} width={190} height={7} fill="#f4f8fb" opacity={0.85} />
          ))}
          <rect x={300} y={70} width={84} height={64} rx={8} fill={WHITE} stroke="#b9d3cf" strokeWidth={3} />
          <path d="M 342 84 L 342 120 M 324 102 L 360 102" stroke="#e5484d" strokeWidth={9} />
          <path d="M 420 36 L 600 36" stroke="#9fb3b8" strokeWidth={5} />
          <path d="M 430 38 Q 445 180 432 330 L 600 330 L 600 38 Z" fill="#bcd9f2" />
          {[460, 495, 530, 565].map((x) => (
            <path key={x} d={d`M ${x} 40 Q ${x + 8} 180 ${x - 4} 330`} stroke="#a3c6e6" strokeWidth={4} fill="none" />
          ))}
          <Floor color="#d5e1e4" line="#c2d0d4" />
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <path key={i} d={d`M ${i * 100 - 20} 330 L ${i * 120 - 80} 440`} stroke="#c5d3d7" strokeWidth={2} />
          ))}
        </g>
      );
    case 'studio': {
      const r = rng(13);
      return (
        <g>
          <rect width={PW} height={PH} fill="#f6f0e8" />
          <rect x={50} y={60} width={230} height={150} rx={6} fill="#d9b48a" stroke="#b98e62" strokeWidth={5} />
          {[
            [70, 76, 70, 54, '#ffffff'],
            [152, 72, 58, 72, '#fff4c9'],
            [220, 84, 46, 56, '#e3f1ff'],
            [86, 140, 84, 54, '#ffe3ea'],
            [186, 150, 70, 48, '#ffffff'],
          ].map(([x, y, w, h, c], i) => (
            <g key={i} transform={`rotate(${-4 + r() * 8} ${x as number} ${y as number})`}>
              <rect x={x} y={y} width={w} height={h} fill={c as string} stroke="#d6c7b6" strokeWidth={1.5} />
              <path d={d`M ${(x as number) + 8} ${(y as number) + (h as number) - 12} Q ${(x as number) + (w as number) / 2} ${(y as number) + 8} ${(x as number) + (w as number) - 8} ${(y as number) + (h as number) - 16}`} stroke={['#e5484d', '#4a86d0', '#5aa469', '#e7b04a', '#9a83b8'][i]} strokeWidth={3} fill="none" />
              <circle cx={(x as number) + (w as number) / 2} cy={(y as number) + 4} r={4} fill={['#e5484d', '#4a86d0', '#e7b04a', '#5aa469', '#9a83b8'][i]} />
            </g>
          ))}
          <rect x={390} y={150} width={180} height={10} rx={3} fill="#b98e62" />
          {[
            [410, '#e8615a'],
            [440, '#4a86d0'],
            [470, '#e7b04a'],
          ].map(([x, c]) => (
            <g key={x as number}>
              <rect x={x as number} y={124} width={22} height={26} rx={4} fill={c as string} opacity={0.85} />
              <rect x={(x as number) - 2} y={120} width={26} height={6} rx={2} fill="#8d6642" />
            </g>
          ))}
          <Plant x={535} y={150} />
          <path d="M 560 0 L 520 60 L 470 78" stroke="#5b4636" strokeWidth={5} fill="none" />
          <path d="M 446 70 L 494 70 L 486 92 L 454 92 Z" fill="#e7b04a" stroke="#5b4636" strokeWidth={3} />
          <Glow id={`${u}glow-studio`} cx={470} cy={140} r={110} color="#fff1c4" opacity={0.5} />
          <Floor color="#cdb79a" line="#bba283" />
        </g>
      );
    }
    case 'street':
      return (
        <g>
          <Grad id={`${u}g-street`} from="#cfe9ff" to="#f4faff" />
          <rect width={PW} height={PH} fill={`url(#${u}g-street)`} />
          <Cloud x={120} y={60} s={0.8} />
          {[
            [0, 190, '#f2d7c0', '#e5484d'],
            [200, 210, '#dfe7f1', '#4a86d0'],
            [410, 200, '#f5e7c6', '#5aa469'],
          ].map(([x, w, c, aw]) => (
            <g key={x as number}>
              <rect x={x as number} y={70} width={w as number} height={260} fill={c as string} />
              <rect x={(x as number) + 14} y={96} width={(w as number) - 28} height={40} rx={4} fill={WHITE} opacity={0.8} />
              <rect x={(x as number) + 18} y={196} width={(w as number) - 36} height={110} fill="#bfe0f7" stroke={WHITE} strokeWidth={5} />
              {Array.from({ length: 6 }, (_, i) => (
                <path key={i} d={d`M ${(x as number) + 6 + i * (((w as number) - 12) / 6)} 160 l ${((w as number) - 12) / 6} 0 l 0 22 q ${-((w as number) - 12) / 12} 10 ${-((w as number) - 12) / 6} 0 Z`} fill={i % 2 ? WHITE : (aw as string)} />
              ))}
            </g>
          ))}
          <path d="M 560 330 L 560 150 Q 560 130 540 130" stroke="#5b6170" strokeWidth={6} fill="none" />
          <circle cx={536} cy={136} r={9} fill="#ffe7a8" stroke="#5b6170" strokeWidth={3} />
          <Floor color="#ddd6cb" line="#c8beb0" />
          <path d="M 0 392 L 600 392" stroke="#cfc6b8" strokeWidth={3} strokeDasharray="34 20" />
        </g>
      );
    case 'burst': {
      const [c1, c2] = TONE_BURST[tone];
      return (
        <g>
          <rect width={PW} height={PH} fill={c1} />
          {rays(300, 230, 26, c2)}
        </g>
      );
    }
    case 'gloom': {
      const r = rng(29);
      return (
        <g>
          <Grad id={`${u}g-gloom`} from="#4d5170" to="#868aa8" />
          <rect width={PW} height={PH} fill={`url(#${u}g-gloom)`} />
          {Array.from({ length: 22 }, (_, i) => (
            <rect key={i} x={r() * PW} y={0} width={2 + r() * 5} height={PH} fill={WHITE} opacity={0.05 + r() * 0.05} />
          ))}
          <Cloud x={120} y={70} s={1.2} fill="#5d6180" opacity={0.9} />
          <Cloud x={470} y={56} s={1.4} fill="#5d6180" opacity={0.9} />
        </g>
      );
    }
    case 'sparkle': {
      const r = rng(31);
      return (
        <g>
          <Grad id={`${u}g-spark`} from="#ffe1ec" to="#e3e6ff" x2={1} y2={1} />
          <rect width={PW} height={PH} fill={`url(#${u}g-spark)`} />
          {Array.from({ length: 16 }, (_, i) => (
            <path key={i} d={starPath(r() * PW, r() * 300, 5 + r() * 9)} fill={i % 3 ? WHITE : '#ffe27a'} opacity={0.9} />
          ))}
        </g>
      );
    }
  }
}

// ---------------------------------------------------------------------------
// 소품 (배경에 놓는 것)
// ---------------------------------------------------------------------------
export const FRONT_PROPS = new Set<PropSpec['kind']>(['desk', 'papers', 'laptop', 'coins', 'moneyBag', 'books', 'table', 'boxes', 'dumbbell', 'monitor']);
const DESK_TOP = GROUND - 92;

export function SceneProp({ p }: { p: PropSpec }) {
  const { x } = p;
  const st = { stroke: INK, strokeWidth: 2.6, strokeLinejoin: 'round' as const };
  switch (p.kind) {
    case 'desk':
      return (
        <g>
          <rect x={x - 112} y={DESK_TOP + 12} width={224} height={PH - DESK_TOP} fill="#a8744a" {...st} />
          <rect x={x - 122} y={DESK_TOP} width={244} height={15} rx={4} fill="#c08a5b" {...st} />
          <path d={d`M ${x - 70} ${DESK_TOP + 48} L ${x + 70} ${DESK_TOP + 48}`} stroke="#8a5d38" strokeWidth={3} />
          <circle cx={x} cy={DESK_TOP + 66} r={4} fill="#8a5d38" />
        </g>
      );
    case 'papers':
      return (
        <g>
          {Array.from({ length: 7 }, (_, i) => (
            <rect key={i} x={x - 26 + (i % 2) * 4} y={DESK_TOP - 12 - i * 11} width={50} height={12} fill={WHITE} {...st} strokeWidth={2} />
          ))}
          {Array.from({ length: 4 }, (_, i) => (
            <rect key={`b${i}`} x={x + 30 + (i % 2) * 3} y={DESK_TOP - 12 - i * 11} width={42} height={12} fill="#f5f0e6" {...st} strokeWidth={2} />
          ))}
        </g>
      );
    case 'laptop':
      return (
        <g>
          <rect x={x - 40} y={DESK_TOP - 52} width={80} height={52} rx={5} fill="#c9ced6" {...st} />
          <circle cx={x} cy={DESK_TOP - 26} r={6} fill="#e9ecf1" />
          <rect x={x - 46} y={DESK_TOP - 4} width={92} height={6} rx={2} fill="#aeb4bf" {...st} strokeWidth={2} />
        </g>
      );
    case 'coins':
      return (
        <g>
          {[-34, 0, 34].map((ox, k) => (
            <g key={ox}>
              {Array.from({ length: [5, 8, 6][k] }, (_, i) => (
                <ellipse key={i} cx={x + ox} cy={GROUND - 6 - i * 8} rx={16} ry={6} fill="#ffd34d" stroke="#b07800" strokeWidth={2} />
              ))}
            </g>
          ))}
        </g>
      );
    case 'moneyBag':
      return (
        <g>
          <path d={d`M ${x - 14} ${GROUND - 78} L ${x + 14} ${GROUND - 78} L ${x + 8} ${GROUND - 66} Q ${x + 46} ${GROUND - 50} ${x + 40} ${GROUND - 16} Q ${x + 36} ${GROUND} ${x} ${GROUND} Q ${x - 36} ${GROUND} ${x - 40} ${GROUND - 16} Q ${x - 46} ${GROUND - 50} ${x - 8} ${GROUND - 66} Z`} fill="#e8c27a" {...st} />
          <path d={d`M ${x - 10} ${GROUND - 66} L ${x + 10} ${GROUND - 66}`} stroke="#a5603c" strokeWidth={4} />
          <text x={x} y={GROUND - 22} fontSize={30} fontWeight={800} textAnchor="middle" fill="#9a6b20">
            ₩
          </text>
        </g>
      );
    case 'chartUp':
    case 'chartDown': {
      const up = p.kind === 'chartUp';
      const y = p.y ?? 190;
      const col = up ? '#23a55a' : '#e5484d';
      const pts = up ? [0, -8, 14, 6, 30, 50] : [50, 40, 46, 20, 10, -8];
      const xs = [-46, -26, -6, 12, 30, 46];
      const line = xs.map((xx, i) => `${i ? 'L' : 'M'} ${x + xx} ${y + 30 - pts[i]}`).join(' ');
      return (
        <g>
          <rect x={x - 62} y={y - 40} width={124} height={92} rx={8} fill={WHITE} {...st} />
          <path d={d`M ${x - 50} ${y - 28} L ${x - 50} ${y + 40} L ${x + 52} ${y + 40}`} stroke="#b8b2ab" strokeWidth={2.4} fill="none" />
          <path d={line} stroke={col} strokeWidth={5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          {up ? (
            <path d={d`M ${x + 46} ${y - 30} l -14 2 l 10 10 Z`} fill={col} stroke={col} strokeWidth={3} strokeLinejoin="round" />
          ) : (
            <path d={d`M ${x + 46} ${y + 40} l -14 -2 l 10 -10 Z`} fill={col} stroke={col} strokeWidth={3} strokeLinejoin="round" />
          )}
        </g>
      );
    }
    case 'books':
      return (
        <g>
          {['#c97a6d', '#6f93c2', '#d6bb5c', '#9cbb75'].map((c, i) => (
            <rect key={c} x={x - 34 + (i % 2) * 6} y={GROUND - 18 - i * 17} width={68} height={17} rx={3} fill={c} {...st} strokeWidth={2.2} />
          ))}
        </g>
      );
    case 'signpost': {
      const y0 = GROUND - 224;
      return (
        <g>
          <rect x={x - 5} y={y0} width={10} height={224} fill="#9a6b45" {...st} />
          <path d={d`M ${x + 6} ${y0 + 12} L ${x + 110} ${y0 + 12} L ${x + 128} ${y0 + 30} L ${x + 110} ${y0 + 48} L ${x + 6} ${y0 + 48} Z`} fill="#ffe08a" {...st} />
          <path d={d`M ${x - 6} ${y0 + 62} L ${x - 110} ${y0 + 62} L ${x - 128} ${y0 + 80} L ${x - 110} ${y0 + 98} L ${x - 6} ${y0 + 98} Z`} fill="#bfe0ff" {...st} />
          {p.label && (
            <text x={x + 62} y={y0 + 37} fontSize={19} fontWeight={800} textAnchor="middle" fill={INK}>
              {p.label}
            </text>
          )}
          {p.label2 && (
            <text x={x - 62} y={y0 + 87} fontSize={19} fontWeight={800} textAnchor="middle" fill={INK}>
              {p.label2}
            </text>
          )}
        </g>
      );
    }
    case 'bench':
      return (
        <g>
          <rect x={x - 90} y={GROUND - 92} width={180} height={12} rx={3} fill="#c08a5b" {...st} />
          <rect x={x - 90} y={GROUND - 70} width={180} height={12} rx={3} fill="#c08a5b" {...st} />
          <rect x={x - 96} y={GROUND - 46} width={192} height={12} rx={3} fill="#b07a4f" {...st} />
          <path d={d`M ${x - 80} ${GROUND - 34} L ${x - 84} ${GROUND} M ${x + 80} ${GROUND - 34} L ${x + 84} ${GROUND}`} stroke={INK} strokeWidth={6} strokeLinecap="round" />
        </g>
      );
    case 'table':
      return (
        <g>
          <path d={d`M ${x - 130} ${GROUND - 92} L ${x + 130} ${GROUND - 92} L ${x + 136} ${GROUND - 40} Q ${x + 100} ${GROUND - 30} ${x + 68} ${GROUND - 40} Q ${x + 34} ${GROUND - 30} ${x} ${GROUND - 40} Q ${x - 34} ${GROUND - 30} ${x - 68} ${GROUND - 40} Q ${x - 100} ${GROUND - 30} ${x - 136} ${GROUND - 40} Z`} fill={WHITE} {...st} />
          <path d={d`M ${x - 80} ${GROUND - 36} L ${x - 84} ${GROUND + 10} M ${x + 80} ${GROUND - 36} L ${x + 84} ${GROUND + 10}`} stroke={INK} strokeWidth={7} strokeLinecap="round" />
          <ellipse cx={x - 64} cy={GROUND - 96} rx={26} ry={6} fill="#f5f0e6" {...st} strokeWidth={2} />
          <ellipse cx={x + 64} cy={GROUND - 96} rx={26} ry={6} fill="#f5f0e6" {...st} strokeWidth={2} />
          <rect x={x - 5} y={GROUND - 128} width={10} height={34} fill="#fff8e1" {...st} strokeWidth={2} />
          <circle cx={x} cy={GROUND - 136} r={14} fill="#ffcf8a" opacity={0.45} />
          <path d={d`M ${x} ${GROUND - 146} Q ${x + 6} ${GROUND - 136} ${x} ${GROUND - 130} Q ${x - 6} ${GROUND - 136} ${x} ${GROUND - 146} Z`} fill="#ffb347" />
        </g>
      );
    case 'plant':
      return <Plant x={x} y={GROUND - 4} />;
    case 'boxes':
      return (
        <g>
          {[
            [-46, 0, 84, 62],
            [34, 0, 70, 52],
            [-30, 62, 70, 50],
          ].map(([ox, oy, w, h], i) => (
            <g key={i}>
              <rect x={x + ox} y={GROUND - oy - h} width={w} height={h} fill="#d9a96a" {...st} />
              <path d={d`M ${x + ox + w / 2} ${GROUND - oy - h} L ${x + ox + w / 2} ${GROUND - oy - h + 16}`} stroke="#a7783f" strokeWidth={6} />
            </g>
          ))}
        </g>
      );
    case 'calendar': {
      const y = p.y ?? 120;
      return (
        <g>
          <rect x={x - 38} y={y - 40} width={76} height={86} rx={4} fill={WHITE} {...st} />
          <rect x={x - 38} y={y - 40} width={76} height={20} fill="#e5484d" {...st} />
          {[0, 1, 2, 3].map((r) =>
            [0, 1, 2, 3, 4].map((c) => <rect key={`${r}-${c}`} x={x - 30 + c * 13} y={y - 12 + r * 13} width={8} height={8} fill="#d6d3d1" />),
          )}
          <circle cx={x + 9} cy={y + 9} r={9} fill="none" stroke="#e5484d" strokeWidth={2.6} />
        </g>
      );
    }
    case 'clock':
      return <WallClock x={x} y={p.y ?? 110} />;
    case 'whiteboard': {
      const y = p.y ?? 170;
      return (
        <g>
          <rect x={x - 110} y={y - 70} width={220} height={130} rx={6} fill={WHITE} {...st} />
          <path d={d`M ${x - 86} ${y - 40} L ${x - 20} ${y - 40} M ${x - 86} ${y - 18} L ${x + 30} ${y - 18}`} stroke="#6f93c2" strokeWidth={4} strokeLinecap="round" />
          <path d={d`M ${x - 80} ${y + 34} L ${x - 40} ${y + 10} L ${x} ${y + 24} L ${x + 60} ${y - 20}`} stroke="#e5484d" strokeWidth={4} fill="none" strokeLinecap="round" />
        </g>
      );
    }
    case 'bed':
      return (
        <g>
          <rect x={x - 100} y={GROUND - 150} width={30} height={150} rx={8} fill="#b79b7a" {...st} />
          <rect x={x - 90} y={GROUND - 74} width={200} height={50} rx={10} fill={WHITE} {...st} />
          <path d={d`M ${x - 40} ${GROUND - 70} Q ${x + 40} ${GROUND - 90} ${x + 110} ${GROUND - 70} L ${x + 110} ${GROUND - 24} L ${x - 50} ${GROUND - 24} Z`} fill="#9db7e8" {...st} />
        </g>
      );
    case 'dumbbell':
      return (
        <g>
          <rect x={x - 30} y={GROUND - 14} width={60} height={8} rx={3} fill="#9aa6b8" {...st} strokeWidth={2} />
          <rect x={x - 44} y={GROUND - 26} width={16} height={32} rx={4} fill="#4b5168" {...st} strokeWidth={2} />
          <rect x={x + 28} y={GROUND - 26} width={16} height={32} rx={4} fill="#4b5168" {...st} strokeWidth={2} />
        </g>
      );
    case 'easel':
      return (
        <g>
          <path d={d`M ${x - 40} ${GROUND} L ${x} ${GROUND - 210} L ${x + 40} ${GROUND} M ${x} ${GROUND - 210} L ${x} ${GROUND}`} stroke="#9a6b45" strokeWidth={7} strokeLinecap="round" fill="none" />
          <rect x={x - 56} y={GROUND - 190} width={112} height={90} fill={WHITE} {...st} />
          <circle cx={x - 22} cy={GROUND - 160} r={12} fill="#ffd34d" />
          <path d={d`M ${x - 50} ${GROUND - 106} Q ${x - 10} ${GROUND - 150} ${x + 50} ${GROUND - 120}`} stroke="#5aa469" strokeWidth={6} fill="none" />
        </g>
      );
    case 'monitor':
      return (
        <g>
          <rect x={x - 12} y={DESK_TOP - 20} width={24} height={20} fill="#9aa3b0" {...st} strokeWidth={2} />
          <rect x={x - 30} y={DESK_TOP - 6} width={60} height={7} rx={3} fill="#aeb4bf" {...st} strokeWidth={2} />
          <rect x={x - 64} y={DESK_TOP - 96} width={128} height={80} rx={6} fill="#2d3142" {...st} />
          <rect x={x - 57} y={DESK_TOP - 89} width={114} height={66} rx={3} fill="#1f2a44" />
          {[
            [0, 40, '#7dd3a8'],
            [1, 62, '#8ab4f8'],
            [2, 30, '#f9a8d4'],
            [3, 74, '#fdba74'],
            [4, 48, '#8ab4f8'],
          ].map(([i, w, c]) => (
            <rect key={i as number} x={x - 50 + ((i as number) % 2) * 8} y={DESK_TOP - 82 + (i as number) * 12} width={w as number} height={5} rx={2} fill={c as string} opacity={0.9} />
          ))}
        </g>
      );
  }
}

/** 가까이 잡은 컷의 감정 배경 — 컷 좌표(w×h)로 그린다 */
export function MoodBg({ mood, w, h, u, tint }: { mood: Mood; w: number; h: number; u: string; tint?: string }) {
  const r = rng(Math.round(w * 7 + h * 3) + mood.length * 101);
  const cx = w / 2;
  const cy = h / 2;
  switch (mood) {
    case 'soft':
    case 'warm':
    case 'cool': {
      const [a, b, dot] =
        mood === 'soft' ? [tint ? mixHex(tint, '#ffffff', 0.78) : '#ffeef3', '#fff9ef', '#ffffff'] : mood === 'warm' ? ['#ffd9b8', '#fff3e0', '#fff8e8'] : ['#d8e6ff', '#f2f6ff', '#ffffff'];
      return (
        <g>
          <defs>
            <radialGradient id={`${u}mood`} cx="0.5" cy="0.45" r="0.75">
              <stop offset="0" stopColor={b} />
              <stop offset="1" stopColor={a} />
            </radialGradient>
          </defs>
          <rect width={w} height={h} fill={`url(#${u}mood)`} />
          {Array.from({ length: 14 }, (_, i) => {
            const rr = 10 + r() * 34;
            return <circle key={i} cx={r() * w} cy={r() * h} r={rr} fill={dot} opacity={0.25 + r() * 0.4} />;
          })}
        </g>
      );
    }
    case 'sparkle':
      return (
        <g>
          <Grad id={`${u}mood`} from={tint ? mixHex(tint, '#ffffff', 0.7) : '#ffe1ec'} to="#e6e3ff" x2={1} y2={1} />
          <rect width={w} height={h} fill={`url(#${u}mood)`} />
          {Array.from({ length: 18 }, (_, i) => (
            <path key={i} d={starPath(r() * w, r() * h, 4 + r() * 10)} fill={i % 3 ? WHITE : '#ffe27a'} opacity={0.9} />
          ))}
          {Array.from({ length: 10 }, (_, i) => (
            <circle key={`c${i}`} cx={r() * w} cy={r() * h} r={2 + r() * 3} fill={WHITE} opacity={0.8} />
          ))}
        </g>
      );
    case 'flowers':
      return (
        <g>
          <Grad id={`${u}mood`} from="#ffe4ec" to="#fff6f0" />
          <rect width={w} height={h} fill={`url(#${u}mood)`} />
          {Array.from({ length: 16 }, (_, i) => {
            const x = r() * w;
            const y = r() * h;
            const s = 6 + r() * 9;
            return (
              <g key={i} opacity={0.75}>
                {[0, 72, 144, 216, 288].map((a) => (
                  <ellipse key={a} cx={x + Math.cos((a * Math.PI) / 180) * s} cy={y + Math.sin((a * Math.PI) / 180) * s} rx={s * 0.75} ry={s * 0.75} fill={i % 2 ? '#ffc2d4' : '#ffd9e4'} />
                ))}
                <circle cx={x} cy={y} r={s * 0.5} fill="#fff1b8" />
              </g>
            );
          })}
        </g>
      );
    case 'gloom':
      return (
        <g>
          <Grad id={`${u}mood`} from="#3d3f5c" to="#6e7193" />
          <rect width={w} height={h} fill={`url(#${u}mood)`} />
          {Array.from({ length: 26 }, (_, i) => (
            <rect key={i} x={r() * w} y={0} width={1.5 + r() * 4} height={h} fill={WHITE} opacity={0.04 + r() * 0.06} />
          ))}
          {Array.from({ length: 30 }, (_, i) => {
            const x = r() * w;
            const y = r() * h;
            return <path key={`r${i}`} d={d`M ${x} ${y} l -3 14`} stroke={WHITE} strokeWidth={1.6} opacity={0.3} strokeLinecap="round" />;
          })}
        </g>
      );
    case 'tone':
      return (
        <g>
          <defs>
            <pattern id={`${u}dots`} width={9} height={9} patternUnits="userSpaceOnUse" patternTransform="rotate(30)">
              <circle cx={4.5} cy={4.5} r={1.9} fill="#6b6f86" />
            </pattern>
          </defs>
          <rect width={w} height={h} fill="#e6e8ef" />
          <rect width={w} height={h} fill={`url(#${u}dots)`} opacity={0.55} />
        </g>
      );
    case 'lines': {
      const n = 64;
      const R = Math.hypot(w, h);
      return (
        <g>
          <rect width={w} height={h} fill={WHITE} />
          {Array.from({ length: n }, (_, i) => {
            const a = (i / n) * Math.PI * 2 + r() * 0.04;
            const wid = 0.012 + r() * 0.018;
            const inner = 0.36 + r() * 0.12;
            const p = (t: number, rr: number) => `${(cx + Math.cos(t) * rr * (w / R) * 1.4).toFixed(1)} ${(cy + Math.sin(t) * rr * (h / R) * 1.4).toFixed(1)}`;
            return <path key={i} d={`M ${p(a - wid, R)} L ${p(a, R * inner)} L ${p(a + wid, R)} Z`} fill="#2b2522" opacity={0.85} />;
          })}
        </g>
      );
    }
    case 'dark':
      return (
        <g>
          <defs>
            <radialGradient id={`${u}mood`} cx="0.5" cy="0.45" r="0.8">
              <stop offset="0" stopColor="#3a3550" />
              <stop offset="1" stopColor="#14121c" />
            </radialGradient>
          </defs>
          <rect width={w} height={h} fill={`url(#${u}mood)`} />
        </g>
      );
  }
}

function mixHex(a: string, b: string, t: number): string {
  const p = (c: string) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
  const x = p(a);
  const y = p(b);
  return `#${x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join('')}`;
}
