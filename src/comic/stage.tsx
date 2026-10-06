/**
 * 개그 웹툰 배경·소품 — 장소는 몇 개의 굵은 선과 단색 면으로만, 감정 배경(집중선·번쩍·먹구름·꽃)은 컷 전체를 채운다.
 * 배경은 '전신 컷' 좌표(바닥 높이 G)로 그리고, 가까이 잡는 컷에서는 컷 쪽에서 확대한다.
 */
import type { ReactNode } from 'react';
import { d, heartPath, lighten, rng, starPath } from './draw.ts';
import { INK, PAPER, starPath5 } from './toon.tsx';
import type { Bg, PropSpec } from './types.ts';

export const EMOTION_BG = new Set<Bg>(['white', 'speed', 'burst', 'gloom', 'sparkle', 'flame', 'dark', 'drama', 'space', 'flowers', 'lightning', 'blue']);
/** 글자가 있는 소품 (확대하지 않고 컷 좌표에 그대로 둔다) */
export const OVERLAY_PROPS = new Set<PropSpec['kind']>(['status', 'rx', 'graph', 'score', 'phonebig', 'board', 'battery', 'cloudcoin', 'shelf']);
/** 인물보다 앞에 그리는 소품 */
export const FRONT_PROPS = new Set<PropSpec['kind']>(['desk', 'table', 'podium', 'bookfort', 'coins', 'crumpled', 'bulbpile', 'trash', 'cage']);

export const DARK_BG = new Set<Bg>(['officeNight', 'night', 'stage', 'dungeon', 'gloom', 'dark', 'drama', 'space', 'lightning']);

const LW = 4.2;
const st = (w = LW) => ({ stroke: INK, strokeWidth: w, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const });

function Floor({ W, H, G, wall, floor, line = true }: { W: number; H: number; G: number; wall: string; floor: string; line?: boolean }) {
  return (
    <g>
      <rect width={W} height={H} fill={wall} />
      <rect y={G - 6} width={W} height={H - G + 6} fill={floor} />
      {line && <path d={d`M ${-10} ${G - 6} L ${W + 10} ${G - 6}`} {...st()} />}
    </g>
  );
}

function Win({ x, y, w, h, sky = '#bfe6ff', night = false }: { x: number; y: number; w: number; h: number; sky?: string; night?: boolean }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} fill={night ? '#22284a' : sky} {...st()} />
      {night ? (
        <g>
          <circle cx={x + w * 0.7} cy={y + h * 0.32} r={11} fill="#fff3b0" />
          <circle cx={x + w * 0.76} cy={y + h * 0.28} r={10} fill="#22284a" />
          {[0.2, 0.42, 0.3].map((k, i) => (
            <circle key={i} cx={x + w * k} cy={y + h * (0.3 + i * 0.18)} r={1.8} fill="#ffffff" />
          ))}
        </g>
      ) : (
        <path d={d`M ${x + w * 0.18} ${y + h * 0.4} q ${10} ${-12} ${22} ${-4} q ${12} ${-6} ${18} ${4} Z`} fill="#ffffff" stroke="none" />
      )}
      <path d={d`M ${x + w / 2} ${y} L ${x + w / 2} ${y + h} M ${x} ${y + h / 2} L ${x + w} ${y + h / 2}`} {...st(3)} />
    </g>
  );
}

function Lines({ cx, cy, W, H, n, color, inner, seed, width = 2 }: { cx: number; cy: number; W: number; H: number; n: number; color: string; inner: number; seed: number; width?: number }) {
  const r = rng(seed);
  const R = Math.hypot(W, H);
  let s = '';
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + r() * 0.05;
    const r0 = inner * (0.8 + r() * 0.7);
    const x0 = cx + Math.cos(a) * r0;
    const y0 = cy + Math.sin(a) * r0;
    const x1 = cx + Math.cos(a) * R;
    const y1 = cy + Math.sin(a) * R;
    const w = width * (0.6 + r() * 1.6);
    const px = -Math.sin(a) * w;
    const py = Math.cos(a) * w;
    s += d`M ${x0} ${y0} L ${x1 + px} ${y1 + py} L ${x1 - px} ${y1 - py} Z `;
  }
  return <path d={s} fill={color} />;
}

function Clouds({ W, y, seed }: { W: number; y: number; seed: number }) {
  const r = rng(seed);
  return (
    <g>
      {[0, 1, 2].map((i) => {
        const x = W * (0.12 + i * 0.36 + r() * 0.08);
        const yy = y + r() * 30;
        return <path key={i} d={d`M ${x} ${yy} q ${8} ${-22} ${30} ${-14} q ${14} ${-16} ${34} ${-2} q ${22} ${0} ${18} ${16} Z`} fill="#ffffff" {...st(3)} />;
      })}
    </g>
  );
}

/** 장소·감정 배경 — (cx, cy)는 집중선의 가운데 */
export function Backdrop({ bg, W, H, G, cx, cy, seed }: { bg: Bg; W: number; H: number; G: number; cx: number; cy: number; seed: number }): ReactNode {
  switch (bg) {
    case 'white':
      return <rect width={W} height={H} fill={PAPER} />;
    case 'speed':
      return (
        <g>
          <rect width={W} height={H} fill={PAPER} />
          <Lines cx={cx} cy={cy} W={W} H={H} n={90} color={INK} inner={Math.min(W, H) * 0.36} seed={seed} width={1.6} />
        </g>
      );
    case 'drama':
      return (
        <g>
          <rect width={W} height={H} fill="#121016" />
          <Lines cx={cx} cy={cy} W={W} H={H} n={110} color="#ffffff" inner={Math.min(W, H) * 0.4} seed={seed} width={1.3} />
        </g>
      );
    case 'burst': {
      const n = 22;
      let s = '';
      const R = Math.hypot(W, H);
      for (let i = 0; i < n; i += 2) {
        const a0 = (i / n) * Math.PI * 2;
        const a1 = ((i + 1) / n) * Math.PI * 2;
        s += d`M ${cx} ${cy} L ${cx + Math.cos(a0) * R} ${cy + Math.sin(a0) * R} L ${cx + Math.cos(a1) * R} ${cy + Math.sin(a1) * R} Z `;
      }
      return (
        <g>
          <rect width={W} height={H} fill="#ffe066" />
          <path d={s} fill="#fff3b0" />
        </g>
      );
    }
    case 'gloom': {
      const r = rng(seed);
      return (
        <g>
          <rect width={W} height={H} fill="#4a4e69" />
          {Array.from({ length: 26 }, (_, i) => {
            const x = (i / 26) * W + r() * 10;
            return <path key={i} d={d`M ${x} ${0} L ${x} ${H * (0.3 + r() * 0.5)}`} stroke="#6c7096" strokeWidth={2 + r() * 3} />;
          })}
          {[0.2, 0.6, 0.85].map((k, i) => (
            <path key={`c${i}`} d={d`M ${W * k - 40} ${40 + i * 20} q ${10} ${-30} ${40} ${-20} q ${20} ${-24} ${50} ${-2} q ${26} ${4} ${14} ${26} Z`} fill="#363a55" />
          ))}
        </g>
      );
    }
    case 'blue': {
      const r = rng(seed);
      return (
        <g>
          <rect width={W} height={H} fill="#dbe9ff" />
          {Array.from({ length: 30 }, (_, i) => (
            <path key={i} d={d`M ${(i / 30) * W + r() * 8} ${0} L ${(i / 30) * W + r() * 8} ${H * (0.2 + r() * 0.4)}`} stroke="#9db8e8" strokeWidth={2} />
          ))}
        </g>
      );
    }
    case 'sparkle': {
      const r = rng(seed);
      return (
        <g>
          <rect width={W} height={H} fill="#ffe8f1" />
          {Array.from({ length: 14 }, (_, i) => (
            <circle key={`o${i}`} cx={r() * W} cy={r() * H} r={10 + r() * 26} fill="#ffffff" opacity={0.6} />
          ))}
          {Array.from({ length: 12 }, (_, i) => (
            <path key={i} d={starPath(r() * W, r() * H, 6 + r() * 10)} fill="#ffffff" stroke="#f7a8c4" strokeWidth={1.5} />
          ))}
        </g>
      );
    }
    case 'flowers': {
      const r = rng(seed);
      const flower = (x: number, y: number, s: number, c: string, k: number) => (
        <g key={k}>
          {[0, 1, 2, 3, 4].map((i) => {
            const a = (i / 5) * Math.PI * 2;
            return <circle key={i} cx={x + Math.cos(a) * s} cy={y + Math.sin(a) * s} r={s * 0.75} fill={c} stroke="#e58fb0" strokeWidth={1.4} />;
          })}
          <circle cx={x} cy={y} r={s * 0.5} fill="#fff1a8" />
        </g>
      );
      return (
        <g>
          <rect width={W} height={H} fill="#fff0f6" />
          {Array.from({ length: 16 }, (_, i) => flower(r() * W, r() * H, 8 + r() * 12, ['#ffd1e1', '#ffe3f0', '#fbd3ff'][i % 3], i))}
        </g>
      );
    }
    case 'flame': {
      const r = rng(seed);
      return (
        <g>
          <rect width={W} height={H} fill="#ff6b4a" />
          {Array.from({ length: 12 }, (_, i) => {
            const x = (i / 11) * W;
            const h = H * (0.35 + r() * 0.35);
            return <path key={i} d={d`M ${x - 40} ${H} C ${x - 50} ${H - h * 0.5} ${x - 10} ${H - h * 0.7} ${x} ${H - h} C ${x + 10} ${H - h * 0.7} ${x + 50} ${H - h * 0.5} ${x + 40} ${H} Z`} fill={i % 2 ? '#ffb347' : '#ff8a3d'} />;
          })}
        </g>
      );
    }
    case 'dark':
      return <rect width={W} height={H} fill="#17151d" />;
    case 'space': {
      const r = rng(seed);
      return (
        <g>
          <rect width={W} height={H} fill="#141a3a" />
          {Array.from({ length: 40 }, (_, i) => (
            <circle key={i} cx={r() * W} cy={r() * H} r={0.8 + r() * 2} fill="#ffffff" opacity={0.5 + r() * 0.5} />
          ))}
          <circle cx={W * 0.82} cy={H * 0.24} r={38} fill="#f2a65a" {...st(3)} />
          <ellipse cx={W * 0.82} cy={H * 0.24} rx={62} ry={12} fill="none" stroke="#ffd166" strokeWidth={4} transform={`rotate(-16 ${W * 0.82} ${H * 0.24})`} />
        </g>
      );
    }
    case 'lightning': {
      const bolt = (x: number, y: number, s: number, k: number) => <path key={k} d={d`M ${x} ${y} L ${x - 18 * s} ${y + 50 * s} L ${x + 2 * s} ${y + 46 * s} L ${x - 14 * s} ${y + 100 * s} L ${x + 26 * s} ${y + 34 * s} L ${x + 6 * s} ${y + 38 * s} L ${x + 18 * s} ${y} Z`} fill="#ffe14d" {...st(3)} />;
      return (
        <g>
          <rect width={W} height={H} fill="#2b2140" />
          {bolt(W * 0.12, 20, 1.2, 0)}
          {bolt(W * 0.86, 40, 1, 1)}
          {bolt(W * 0.5, -30, 0.8, 2)}
        </g>
      );
    }
    // ---------------- 장소 ----------------
    case 'room':
      return (
        <g>
          <Floor W={W} H={H} G={G} wall="#fff3e3" floor="#efd9bd" />
          <Win x={W * 0.64} y={G - 250} w={130} h={104} />
          <rect x={W * 0.12} y={G - 236} width={70} height={52} fill="#ffffff" {...st(3)} />
          <path d={d`M ${W * 0.12 + 10} ${G - 196} l ${16} ${-20} l ${12} ${12} l ${10} ${-8} l ${22} ${16}`} fill="none" {...st(2.4)} />
        </g>
      );
    case 'bedroom':
      return (
        <g>
          <Floor W={W} H={H} G={G} wall="#eceeff" floor="#d9d3ef" />
          <Win x={W * 0.08} y={G - 250} w={120} h={100} night />
          <path d={d`M ${W * 0.62} ${G - 240} l ${0} ${24}`} {...st(2.4)} />
          <path d={d`M ${W * 0.62 - 26} ${G - 186} Q ${W * 0.62} ${G - 230} ${W * 0.62 + 26} ${G - 186} Z`} fill="#fff3b0" {...st(3)} />
        </g>
      );
    case 'office':
    case 'meeting':
      return (
        <g>
          <Floor W={W} H={H} G={G} wall={bg === 'meeting' ? '#f3f1ec' : '#eef3f7'} floor="#d6dde4" />
          <rect x={W * 0.7} y={G - 262} width={136} height={120} fill="#cfe8ff" {...st()} />
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <path key={i} d={d`M ${W * 0.7} ${G - 248 + i * 18} L ${W * 0.7 + 136} ${G - 248 + i * 18}`} {...st(2)} />
          ))}
          <circle cx={W * 0.16} cy={G - 300} r={22} fill="#ffffff" {...st(3)} />
          <path d={d`M ${W * 0.16} ${G - 300} l ${0} ${-13} M ${W * 0.16} ${G - 300} l ${9} ${4}`} {...st(2.6)} />
        </g>
      );
    case 'officeNight':
      return (
        <g>
          <Floor W={W} H={H} G={G} wall="#384057" floor="#2b3044" />
          <rect x={W * 0.62} y={G - 270} width={180} height={128} fill="#1b2140" {...st()} />
          {Array.from({ length: 12 }, (_, i) => (
            <rect key={i} x={W * 0.62 + 10 + (i % 6) * 28} y={G - 230 + Math.floor(i / 6) * 40 - (i % 3) * 14} width={14} height={60} fill="#2c355e" />
          ))}
          {Array.from({ length: 10 }, (_, i) => (
            <rect key={`l${i}`} x={W * 0.62 + 14 + (i * 17) % 160} y={G - 218 + ((i * 23) % 70)} width={4} height={4} fill="#ffe28a" />
          ))}
          <path d={d`M ${W * 0.2} ${0} L ${W * 0.2} ${G - 300}`} {...st(2)} />
          <path d={d`M ${W * 0.2 - 30} ${G - 268} Q ${W * 0.2} ${G - 316} ${W * 0.2 + 30} ${G - 268} Z`} fill="#ffe9a8" {...st(3)} />
          <path d={d`M ${W * 0.2 - 30} ${G - 266} L ${W * 0.2 - 90} ${G - 6} L ${W * 0.2 + 90} ${G - 6} L ${W * 0.2 + 30} ${G - 266} Z`} fill="#ffe9a8" opacity={0.1} />
        </g>
      );
    case 'cafe':
      return (
        <g>
          <Floor W={W} H={H} G={G} wall="#fbe8d4" floor="#e6cba9" />
          <rect x={W * 0.08} y={G - 250} width={170} height={120} fill="#d4efff" {...st()} />
          <path d={d`M ${W * 0.08 - 8} ${G - 250} L ${W * 0.08 + 178} ${G - 250} L ${W * 0.08 + 168} ${G - 220} L ${W * 0.08 + 2} ${G - 220} Z`} fill="#f2836b" {...st(3)} />
          {[0, 1, 2, 3].map((i) => (
            <path key={i} d={d`M ${W * 0.08 + 22 + i * 40} ${G - 250} L ${W * 0.08 + 18 + i * 40} ${G - 220}`} stroke="#ffffff" strokeWidth={10} />
          ))}
          {[W * 0.6, W * 0.82].map((x) => (
            <g key={x}>
              <path d={d`M ${x} ${0} L ${x} ${G - 270}`} {...st(2)} />
              <path d={d`M ${x - 22} ${G - 250} Q ${x} ${G - 290} ${x + 22} ${G - 250} Z`} fill="#ffd166" {...st(3)} />
            </g>
          ))}
        </g>
      );
    case 'street':
      return (
        <g>
          <rect width={W} height={H} fill="#dff1ff" />
          {[
            [0.02, 230, 120, '#e8e3f0'],
            [0.24, 290, 100, '#f3e5d8'],
            [0.44, 210, 130, '#e3ecf3'],
            [0.7, 270, 110, '#efe6f7'],
            [0.88, 200, 90, '#e8efe3'],
          ].map(([k, h, w, c], i) => (
            <g key={i}>
              <rect x={W * (k as number)} y={G - (h as number)} width={w as number} height={h as number} fill={c as string} {...st(3)} />
              {Array.from({ length: 6 }, (_, j) => (
                <rect key={j} x={W * (k as number) + 14 + (j % 2) * ((w as number) / 2 - 4)} y={G - (h as number) + 18 + Math.floor(j / 2) * 40} width={20} height={22} fill="#bfe1ff" {...st(2)} />
              ))}
            </g>
          ))}
          <rect y={G - 6} width={W} height={H - G + 6} fill="#e3ddd4" />
          <path d={d`M ${-10} ${G - 6} L ${W + 10} ${G - 6}`} {...st()} />
          <path d={d`M ${W * 0.56} ${G - 6} L ${W * 0.56} ${G - 200} Q ${W * 0.56} ${G - 214} ${W * 0.56 + 22} ${G - 214}`} fill="none" {...st()} />
          <ellipse cx={W * 0.56 + 26} cy={G - 208} rx={12} ry={7} fill="#fff3b0" {...st(3)} />
        </g>
      );
    case 'subway':
      return (
        <g>
          <Floor W={W} H={H} G={G} wall="#e4eef3" floor="#b9c2cc" />
          {[0.04, 0.38, 0.72].map((k) => (
            <rect key={k} x={W * k} y={G - 250} width={140} height={90} rx={12} fill="#3d4766" {...st()} />
          ))}
          <path d={d`M ${-10} ${30} L ${W + 10} ${30}`} {...st(6)} />
          {Array.from({ length: 8 }, (_, i) => (
            <g key={i}>
              <path d={d`M ${30 + i * 76} ${30} L ${30 + i * 76} ${72}`} {...st(3)} />
              <path d={d`M ${30 + i * 76} ${84} m ${-11} ${0} a ${11} ${11} 0 1 0 ${22} ${0} a ${11} ${11} 0 1 0 ${-22} ${0}`} fill="none" {...st(3)} />
            </g>
          ))}
          <rect x={-10} y={G - 130} width={W + 20} height={20} fill="#6aa1e6" {...st(3)} />
        </g>
      );
    case 'park':
      return (
        <g>
          <rect width={W} height={H} fill="#e1f5ff" />
          <Clouds W={W} y={70} seed={seed} />
          <path d={d`M ${-10} ${G - 40} Q ${W * 0.3} ${G - 90} ${W * 0.6} ${G - 50} Q ${W * 0.85} ${G - 20} ${W + 10} ${G - 60} L ${W + 10} ${H} L ${-10} ${H} Z`} fill="#cdeec0" {...st(3)} />
          <rect y={G - 6} width={W} height={H - G + 6} fill="#b5e09c" />
          <path d={d`M ${-10} ${G - 6} L ${W + 10} ${G - 6}`} {...st()} />
          <g>
            <rect x={W * 0.86} y={G - 150} width={22} height={146} fill="#a9774d" {...st()} />
            <circle cx={W * 0.88} cy={G - 180} r={62} fill="#7cc68d" {...st()} />
          </g>
        </g>
      );
    case 'school':
      return (
        <g>
          <Floor W={W} H={H} G={G} wall="#f2f5e6" floor="#e1c9a3" />
          <rect x={W * 0.1} y={G - 262} width={W * 0.62} height={130} fill="#2f5d50" {...st()} />
          <path d={d`M ${W * 0.16} ${G - 226} q ${30} ${-16} ${60} ${0} M ${W * 0.16} ${G - 196} l ${90} ${0} M ${W * 0.46} ${G - 220} l ${40} ${30}`} fill="none" stroke="#ffffff" strokeWidth={3} opacity={0.8} />
          <rect x={W * 0.1} y={G - 134} width={W * 0.62} height={8} fill="#c9a26d" {...st(3)} />
        </g>
      );
    case 'library':
      return (
        <g>
          <Floor W={W} H={H} G={G} wall="#f6eee2" floor="#dcc3a0" />
          {[0.03, 0.66].map((k) => (
            <g key={k}>
              <rect x={W * k} y={G - 286} width={180} height={280} fill="#b98a5e" {...st()} />
              {[0, 1, 2, 3].map((r) => (
                <g key={r}>
                  <rect x={W * k + 8} y={G - 276 + r * 68} width={164} height={58} fill="#8a603c" />
                  {Array.from({ length: 9 }, (_, i) => (
                    <rect key={i} x={W * k + 12 + i * 18} y={G - 268 + r * 68 + (i % 3) * 4} width={14} height={50 - (i % 3) * 4} fill={['#e5484d', '#6aa1e6', '#f0c25e', '#7cc68d', '#b9a3f0'][(i + r) % 5]} {...st(1.6)} />
                  ))}
                </g>
              ))}
            </g>
          ))}
        </g>
      );
    case 'gym':
      return (
        <g>
          <Floor W={W} H={H} G={G} wall="#eef1f5" floor="#c9ced8" />
          <rect x={W * 0.06} y={G - 250} width={W * 0.88} height={150} fill="#e0f0ff" {...st()} />
          <path d={d`M ${W * 0.2} ${G - 236} L ${W * 0.12} ${G - 130} M ${W * 0.3} ${G - 236} L ${W * 0.22} ${G - 130}`} stroke="#ffffff" strokeWidth={8} />
        </g>
      );
    case 'beach':
      return (
        <g>
          <rect width={W} height={H} fill="#d6f0ff" />
          <circle cx={W * 0.82} cy={80} r={34} fill="#ffd166" {...st(3)} />
          <rect y={G - 130} width={W} height={130} fill="#7cc7f0" />
          <path d={d`M ${-10} ${G - 130} L ${W + 10} ${G - 130}`} {...st(3)} />
          {[0.15, 0.45, 0.75].map((k) => (
            <path key={k} d={d`M ${W * k} ${G - 90} q ${12} ${-10} ${24} ${0} q ${12} ${-10} ${24} ${0}`} fill="none" stroke="#ffffff" strokeWidth={3} />
          ))}
          <path d={d`M ${-10} ${G - 40} Q ${W * 0.4} ${G - 60} ${W + 10} ${G - 34} L ${W + 10} ${H} L ${-10} ${H} Z`} fill="#f4dfb0" {...st(3)} />
        </g>
      );
    case 'mountain':
      return (
        <g>
          <rect width={W} height={H} fill="#e5f4ff" />
          <Clouds W={W} y={60} seed={seed} />
          <path d={d`M ${-20} ${G - 6} L ${W * 0.2} ${G - 230} L ${W * 0.38} ${G - 120} L ${W * 0.58} ${G - 270} L ${W * 0.86} ${G - 110} L ${W + 20} ${G - 180} L ${W + 20} ${G} Z`} fill="#9fd3a0" {...st()} />
          <path d={d`M ${W * 0.58} ${G - 270} L ${W * 0.52} ${G - 230} L ${W * 0.56} ${G - 236} L ${W * 0.6} ${G - 226} L ${W * 0.64} ${G - 238} Z`} fill="#ffffff" {...st(3)} />
          <rect y={G - 6} width={W} height={H - G + 6} fill="#c9b48c" />
          <path d={d`M ${-10} ${G - 6} L ${W + 10} ${G - 6}`} {...st()} />
        </g>
      );
    case 'night': {
      const r = rng(seed);
      return (
        <g>
          <rect width={W} height={H} fill="#1f2547" />
          {Array.from({ length: 26 }, (_, i) => (
            <circle key={i} cx={r() * W} cy={r() * (G - 120)} r={1 + r() * 1.6} fill="#ffffff" opacity={0.8} />
          ))}
          <circle cx={W * 0.82} cy={70} r={30} fill="#fff3b0" {...st(3)} />
          <circle cx={W * 0.82 + 14} cy={62} r={26} fill="#1f2547" />
          {[0.02, 0.2, 0.62, 0.8].map((k, i) => (
            <rect key={k} x={W * k} y={G - 120 - (i % 2) * 50} width={90} height={120 + (i % 2) * 50} fill="#2c3360" {...st(3)} />
          ))}
          <rect y={G - 6} width={W} height={H - G + 6} fill="#2a2f52" />
          <path d={d`M ${-10} ${G - 6} L ${W + 10} ${G - 6}`} {...st()} />
        </g>
      );
    }
    case 'rain': {
      const r = rng(seed);
      return (
        <g>
          <rect width={W} height={H} fill="#cfd8e3" />
          <path d={d`M ${-20} ${70} q ${40} ${-50} ${100} ${-20} q ${50} ${-40} ${110} ${0} q ${60} ${-30} ${120} ${10} q ${70} ${-30} ${120} ${0} q ${60} ${-20} ${100} ${20} L ${W + 20} ${-10} L ${-20} ${-10} Z`} fill="#9aa6b8" {...st(3)} />
          {Array.from({ length: 40 }, (_, i) => {
            const x = r() * W;
            const y = 60 + r() * (G - 80);
            return <path key={i} d={d`M ${x} ${y} l ${-5} ${16}`} stroke="#6f8bb3" strokeWidth={2.4} strokeLinecap="round" />;
          })}
          <rect y={G - 6} width={W} height={H - G + 6} fill="#a9b4c2" />
          <path d={d`M ${-10} ${G - 6} L ${W + 10} ${G - 6}`} {...st()} />
        </g>
      );
    }
    case 'stage':
      return (
        <g>
          <rect width={W} height={H} fill="#2a1f45" />
          {[0.25, 0.75].map((k) => (
            <path key={k} d={d`M ${W * k - 20} ${0} L ${W * k + 20} ${0} L ${W * k + 140} ${G} L ${W * k - 140} ${G} Z`} fill="#fff6c8" opacity={0.18} />
          ))}
          <path d={d`M ${0} ${0} Q ${50} ${H * 0.4} ${20} ${H} L ${0} ${H} Z M ${W} ${0} Q ${W - 50} ${H * 0.4} ${W - 20} ${H} L ${W} ${H} Z`} fill="#c0392b" {...st(3)} />
          <rect y={G - 6} width={W} height={H - G + 6} fill="#8a5a3c" />
          <path d={d`M ${-10} ${G - 6} L ${W + 10} ${G - 6}`} {...st()} />
          {Array.from({ length: 10 }, (_, i) => (
            <circle key={i} cx={30 + i * 60} cy={16} r={6} fill="#ffe28a" {...st(2)} />
          ))}
        </g>
      );
    case 'shop':
      return (
        <g>
          <Floor W={W} H={H} G={G} wall="#fdf0d8" floor="#d9b98d" />
          <path d={d`M ${-10} ${20} L ${W + 10} ${20} L ${W + 10} ${56} L ${-10} ${56} Z`} fill="#7cc68d" {...st(3)} />
          {Array.from({ length: 10 }, (_, i) => (
            <path key={i} d={d`M ${i * 64} ${56} q ${32} ${26} ${64} ${0}`} fill={i % 2 ? '#ffffff' : '#7cc68d'} {...st(3)} />
          ))}
          <rect x={W * 0.04} y={G - 90} width={W * 0.92} height={84} fill="#c08b5c" {...st()} />
        </g>
      );
    case 'hospital':
      return (
        <g>
          <Floor W={W} H={H} G={G} wall="#eef8f5" floor="#d2e4df" />
          <rect x={W * 0.8} y={G - 270} width={60} height={60} rx={8} fill="#ffffff" {...st(3)} />
          <path d={d`M ${W * 0.8 + 30} ${G - 258} L ${W * 0.8 + 30} ${G - 222} M ${W * 0.8 + 12} ${G - 240} L ${W * 0.8 + 48} ${G - 240}`} stroke="#3fae8a" strokeWidth={10} />
          <path d={d`M ${W * 0.06} ${G - 280} L ${W * 0.06} ${G - 40} M ${W * 0.06} ${G - 280} Q ${W * 0.14} ${G - 200} ${W * 0.08} ${G - 40}`} fill="#cfe9ff" {...st(3)} />
        </g>
      );
    case 'studio':
      return (
        <g>
          <Floor W={W} H={H} G={G} wall="#f6f0fb" floor="#ddd0ec" />
          {[0.1, 0.32].map((k, i) => (
            <rect key={k} x={W * k} y={G - 250 + i * 20} width={80} height={100} fill={i ? '#ffe3a8' : '#c9e8ff'} {...st(3)} transform={`rotate(${i ? 4 : -3} ${W * k + 40} ${G - 200})`} />
          ))}
        </g>
      );
    case 'kitchen':
      return (
        <g>
          <Floor W={W} H={H} G={G} wall="#eef6f8" floor="#d8c6ae" />
          {Array.from({ length: 6 }, (_, i) =>
            Array.from({ length: 3 }, (_, j) => <rect key={`${i}${j}`} x={W * 0.52 + i * 44} y={G - 250 + j * 44} width={44} height={44} fill="none" stroke="#c6dbe2" strokeWidth={2} />),
          )}
          <rect x={W * 0.5} y={G - 110} width={W * 0.5} height={104} fill="#ffffff" {...st()} />
          <ellipse cx={W * 0.7} cy={G - 120} rx={36} ry={12} fill="#9aa1ab" {...st(3)} />
        </g>
      );
    case 'map': {
      const r = rng(seed);
      return (
        <g>
          <rect width={W} height={H} fill="#f3e3bf" />
          <rect x={6} y={6} width={W - 12} height={H - 12} fill="none" stroke="#c9a46a" strokeWidth={6} />
          <path d={d`M ${30} ${H - 60} C ${W * 0.3} ${H - 160} ${W * 0.5} ${H - 20} ${W * 0.7} ${H - 140} S ${W - 40} ${80} ${W - 30} ${60}`} fill="none" stroke="#b5552c" strokeWidth={4} strokeDasharray="10 9" />
          {Array.from({ length: 7 }, (_, i) => {
            const x = 40 + r() * (W - 80);
            const y = 40 + r() * (H - 120);
            return i % 2 ? (
              <path key={i} d={d`M ${x - 18} ${y + 14} L ${x} ${y - 14} L ${x + 18} ${y + 14} Z`} fill="#b9a27a" {...st(2.4)} />
            ) : (
              <g key={i}>
                <rect x={x - 3} y={y} width={6} height={12} fill="#8a5a3c" />
                <circle cx={x} cy={y - 6} r={11} fill="#7cc68d" {...st(2.4)} />
              </g>
            );
          })}
        </g>
      );
    }
    case 'dungeon':
      return (
        <g>
          <Floor W={W} H={H} G={G} wall="#3b3a48" floor="#2c2b36" />
          {Array.from({ length: 8 }, (_, row) =>
            Array.from({ length: 8 }, (_, col) => <rect key={`${row}-${col}`} x={col * 80 - (row % 2) * 40} y={row * 40} width={78} height={38} fill="none" stroke="#4d4c5c" strokeWidth={2} />),
          )}
          {[0.12, 0.88].map((k) => (
            <g key={k}>
              <rect x={W * k - 5} y={G - 230} width={10} height={40} fill="#8a5a3c" {...st(2.4)} />
              <path d={d`M ${W * k} ${G - 270} C ${W * k - 14} ${G - 250} ${W * k - 8} ${G - 234} ${W * k} ${G - 232} C ${W * k + 8} ${G - 234} ${W * k + 14} ${G - 250} ${W * k} ${G - 270} Z`} fill="#ffb347" {...st(2.4)} />
              <circle cx={W * k} cy={G - 240} r={50} fill="#ffb347" opacity={0.12} />
            </g>
          ))}
        </g>
      );
  }
}

// ---------------------------------------------------------------------------
// 소품
// ---------------------------------------------------------------------------
function T({ x, y, size, children, color = INK, weight = 800, anchor = 'middle' as 'middle' | 'start' | 'end' }: { x: number; y: number; size: number; children: string; color?: string; weight?: number; anchor?: 'middle' | 'start' | 'end' }) {
  return (
    <text x={x} y={y} fontSize={size} fontWeight={weight} fill={color} textAnchor={anchor}>
      {children}
    </text>
  );
}

export function PropArt({ p, G }: { p: PropSpec; G: number }): ReactNode {
  const s = p.s ?? 1;
  const x = p.x;
  const y = p.y ?? G;
  const g = (node: ReactNode) => (s === 1 ? node : <g transform={`translate(${x} ${y}) scale(${s}) translate(${-x} ${-y})`}>{node}</g>);
  switch (p.kind) {
    case 'desk':
      return g(
        <g>
          <rect x={x - 90} y={y - 74} width={180} height={14} rx={3} fill="#c99a6b" {...st()} />
          <rect x={x - 80} y={y - 60} width={12} height={58} fill="#a9774d" {...st(3)} />
          <rect x={x + 68} y={y - 60} width={12} height={58} fill="#a9774d" {...st(3)} />
          <rect x={x + 18} y={y - 60} width={56} height={38} fill="#b98a5e" {...st(3)} />
        </g>,
      );
    case 'monitor':
      return g(
        <g>
          <rect x={x - 40} y={y - 160} width={80} height={56} rx={4} fill="#2f3542" {...st()} />
          <rect x={x - 34} y={y - 154} width={68} height={44} fill="#a8d8ff" />
          <path d={d`M ${x} ${y - 104} L ${x} ${y - 82} M ${x - 18} ${y - 78} L ${x + 18} ${y - 78}`} {...st()} />
        </g>,
      );
    case 'chair':
      return g(
        <g>
          <rect x={x - 26} y={y - 120} width={52} height={60} rx={10} fill="#6f7687" {...st()} />
          <rect x={x - 30} y={y - 62} width={60} height={14} rx={5} fill="#5b6273" {...st()} />
          <path d={d`M ${x} ${y - 48} L ${x} ${y - 14} M ${x - 24} ${y - 4} L ${x + 24} ${y - 4}`} {...st()} />
        </g>,
      );
    case 'sofa':
      return g(
        <g>
          <rect x={x - 120} y={y - 110} width={240} height={60} rx={18} fill="#e58f6b" {...st()} />
          <rect x={x - 130} y={y - 64} width={260} height={50} rx={14} fill="#f0a07f" {...st()} />
          <rect x={x - 140} y={y - 90} width={30} height={78} rx={12} fill="#e58f6b" {...st()} />
          <rect x={x + 110} y={y - 90} width={30} height={78} rx={12} fill="#e58f6b" {...st()} />
          <path d={d`M ${x - 110} ${y - 14} L ${x - 110} ${y} M ${x + 110} ${y - 14} L ${x + 110} ${y}`} {...st()} />
        </g>,
      );
    case 'bed':
      return g(
        <g>
          <rect x={x - 130} y={y - 64} width={260} height={50} rx={8} fill="#ffffff" {...st()} />
          <rect x={x - 140} y={y - 110} width={20} height={106} rx={6} fill="#b98a5e" {...st()} />
          <rect x={x - 116} y={y - 86} width={60} height={26} rx={12} fill="#ffffff" {...st(3)} />
          <path d={d`M ${x - 50} ${y - 66} Q ${x + 30} ${y - 90} ${x + 128} ${y - 66} L ${x + 128} ${y - 26} L ${x - 50} ${y - 26} Z`} fill="#9db8f0" {...st(3)} />
          <path d={d`M ${x - 126} ${y - 14} L ${x - 126} ${y} M ${x + 124} ${y - 14} L ${x + 124} ${y}`} {...st()} />
        </g>,
      );
    case 'table':
      return g(
        <g>
          <ellipse cx={x} cy={y - 76} rx={80} ry={14} fill="#c99a6b" {...st()} />
          <path d={d`M ${x} ${y - 64} L ${x} ${y - 4} M ${x - 30} ${y - 2} L ${x + 30} ${y - 2}`} {...st()} />
        </g>,
      );
    case 'whiteboard':
      return g(
        <g>
          <rect x={x - 100} y={y - 70} width={200} height={110} rx={4} fill="#ffffff" {...st()} />
          <path d={d`M ${x - 80} ${y - 40} q ${30} ${-20} ${60} ${0} M ${x - 80} ${y - 10} l ${80} ${0} M ${x + 20} ${y - 50} l ${50} ${50} M ${x + 30} ${y + 10} l ${30} ${-40}`} fill="none" stroke="#3b82f6" strokeWidth={3} strokeLinecap="round" />
          {p.label && <T x={x} y={y + 30} size={18} color="#e5484d">{p.label}</T>}
        </g>,
      );
    case 'window':
      return g(<Win x={x - 60} y={y - 50} w={120} h={100} />);
    case 'door':
      return g(
        <g>
          <rect x={x - 46} y={y - 220} width={92} height={216} fill="#c99a6b" {...st()} />
          <circle cx={x + 30} cy={y - 110} r={6} fill="#ffd166" {...st(2.4)} />
        </g>,
      );
    case 'wall':
      return g(
        <g>
          <rect x={x - 40} y={y - 340} width={80} height={336} fill="#d98a6b" {...st()} />
          {Array.from({ length: 10 }, (_, i) => (
            <path key={i} d={d`M ${x - 40} ${y - 306 + i * 34} L ${x + 40} ${y - 306 + i * 34} M ${x + (i % 2 ? -6 : 14)} ${y - 340 + i * 34} L ${x + (i % 2 ? -6 : 14)} ${y - 306 + i * 34}`} {...st(2.4)} />
          ))}
        </g>,
      );
    case 'tree':
      return g(
        <g>
          <rect x={x - 14} y={y - 170} width={28} height={166} fill="#a9774d" {...st()} />
          <circle cx={x} cy={y - 200} r={70} fill="#7cc68d" {...st()} />
          <circle cx={x - 40} cy={y - 170} r={36} fill="#7cc68d" {...st()} />
          <circle cx={x + 42} cy={y - 166} r={34} fill="#7cc68d" {...st()} />
        </g>,
      );
    case 'bench':
      return g(
        <g>
          <rect x={x - 90} y={y - 96} width={180} height={12} rx={3} fill="#c99a6b" {...st()} />
          <rect x={x - 96} y={y - 56} width={192} height={14} rx={3} fill="#c99a6b" {...st()} />
          <path d={d`M ${x - 80} ${y - 42} L ${x - 80} ${y} M ${x + 80} ${y - 42} L ${x + 80} ${y}`} {...st()} />
        </g>,
      );
    case 'signpost':
      return g(
        <g>
          <rect x={x - 6} y={y - 210} width={12} height={206} fill="#a9774d" {...st()} />
          <path d={d`M ${x - 80} ${y - 196} L ${x + 60} ${y - 196} L ${x + 80} ${y - 176} L ${x + 60} ${y - 156} L ${x - 80} ${y - 156} Z`} fill="#ffe7a8" {...st()} />
          <path d={d`M ${x + 80} ${y - 136} L ${x - 60} ${y - 136} L ${x - 80} ${y - 116} L ${x - 60} ${y - 96} L ${x + 80} ${y - 96} Z`} fill="#ffd1d1" {...st()} />
          {p.label && <T x={x - 6} y={y - 168} size={20}>{p.label}</T>}
          {p.label2 && <T x={x + 6} y={y - 108} size={20}>{p.label2}</T>}
        </g>,
      );
    case 'calendar':
      return g(
        <g>
          <rect x={x - 54} y={y - 64} width={108} height={110} rx={6} fill="#ffffff" {...st()} />
          <rect x={x - 54} y={y - 64} width={108} height={28} rx={6} fill="#e5484d" {...st()} />
          {p.label && <T x={x} y={y + 22} size={p.label.length > 3 ? 24 : 40}>{p.label}</T>}
          {p.label2 && <T x={x} y={y - 44} size={15} color="#ffffff">{p.label2}</T>}
        </g>,
      );
    case 'clock':
      return g(
        <g>
          <circle cx={x} cy={y} r={34} fill="#ffffff" {...st()} />
          <path d={d`M ${x} ${y} L ${x} ${y - 22} M ${x} ${y} L ${x + 16} ${y + 6}`} {...st()} />
        </g>,
      );
    case 'books':
      return g(
        <g>
          {[0, 1, 2, 3, 4].map((i) => (
            <rect key={i} x={x - 44 + (i % 2) * 6} y={y - 22 - i * 22} width={88} height={20} rx={3} fill={['#e5484d', '#6aa1e6', '#f0c25e', '#7cc68d', '#b9a3f0'][i]} {...st(3)} />
          ))}
        </g>,
      );
    case 'bookfort':
      return g(
        <g>
          {[-1, 1].map((side) => (
            <g key={side}>
              {Array.from({ length: 7 }, (_, i) => (
                <rect key={i} x={x + side * 110 - 46 + (i % 2) * 8} y={y - 24 - i * 24} width={92} height={22} rx={3} fill={['#e5484d', '#6aa1e6', '#f0c25e', '#7cc68d', '#b9a3f0', '#f2836b', '#8fd1c8'][i]} {...st(3)} />
              ))}
            </g>
          ))}
        </g>,
      );
    case 'papers':
      return g(
        <g>
          {Array.from({ length: 6 }, (_, i) => (
            <rect key={i} x={x - 34 + (i % 2) * 6} y={y - 12 - i * 9} width={68} height={8} fill="#ffffff" {...st(2.4)} />
          ))}
        </g>,
      );
    case 'crumpled': {
      const r = rng(Math.round(x));
      return g(
        <g>
          {Array.from({ length: 9 }, (_, i) => {
            const cx = x - 150 + r() * 300;
            const rr = 12 + r() * 6;
            const cy = y - rr - 2 - r() * 6;
            const pts = Array.from({ length: 9 }, (_, k) => {
              const a = (k / 9) * Math.PI * 2;
              const q = rr * (0.78 + r() * 0.34);
              return `${(cx + Math.cos(a) * q).toFixed(1)} ${(cy + Math.sin(a) * q * 0.86).toFixed(1)}`;
            });
            return (
              <g key={i}>
                <path d={`M ${pts.join(' L ')} Z`} fill="#ffffff" {...st(2.4)} />
                <path d={d`M ${cx - rr * 0.5} ${cy - rr * 0.2} L ${cx} ${cy + rr * 0.1} L ${cx + rr * 0.3} ${cy - rr * 0.4} M ${cx - rr * 0.1} ${cy + rr * 0.1} L ${cx + rr * 0.1} ${cy + rr * 0.5}`} fill="none" stroke="#9aa1ab" strokeWidth={1.6} strokeLinecap="round" />
              </g>
            );
          })}
        </g>,
      );
    }
    case 'boxes':
      return g(
        <g>
          <rect x={x - 60} y={y - 64} width={70} height={60} fill="#d9a066" {...st()} />
          <rect x={x + 14} y={y - 54} width={60} height={50} fill="#d9a066" {...st()} />
          <rect x={x - 40} y={y - 116} width={66} height={52} fill="#e3b07a" {...st()} />
          {p.label && <T x={x - 24} y={y - 26} size={13}>{p.label}</T>}
          {p.label2 && <T x={x + 44} y={y - 22} size={13}>{p.label2}</T>}
        </g>,
      );
    case 'bulbpile': {
      const r = rng(Math.round(x) + 3);
      return g(
        <g>
          {Array.from({ length: 16 }, (_, i) => {
            const cx = x - 120 + r() * 240;
            const cy = y - 14 - (i % 4) * 16 - r() * 10;
            return (
              <g key={i} transform={`rotate(${r() * 60 - 30} ${cx} ${cy})`}>
                <circle cx={cx} cy={cy} r={12} fill="#fff3a0" {...st(2.4)} />
                <rect x={cx - 5} y={cy + 9} width={10} height={7} fill="#9aa1ab" {...st(2)} />
              </g>
            );
          })}
        </g>,
      );
    }
    case 'coins':
      return g(
        <g>
          {[0, 1, 2].map((c) =>
            Array.from({ length: 5 - c }, (_, i) => <ellipse key={`${c}${i}`} cx={x - 30 + c * 30} cy={y - 8 - i * 9} rx={16} ry={6} fill="#ffd84d" {...st(2.4)} />),
          )}
        </g>,
      );
    case 'trash':
      return g(
        <g>
          <path d={d`M ${x - 30} ${y - 80} L ${x + 30} ${y - 80} L ${x + 24} ${y - 2} L ${x - 24} ${y - 2} Z`} fill="#9aa1ab" {...st()} />
          {[-14, 4, 18].map((dx) => (
            <circle key={dx} cx={x + dx} cy={y - 90 - (dx % 7)} r={12} fill="#ffffff" {...st(2.4)} />
          ))}
        </g>,
      );
    case 'plant':
      return g(
        <g>
          <path d={d`M ${x - 24} ${y - 50} L ${x + 24} ${y - 50} L ${x + 18} ${y - 2} L ${x - 18} ${y - 2} Z`} fill="#c97b4a" {...st()} />
          {[-30, 0, 30].map((a) => (
            <ellipse key={a} cx={x + a * 0.6} cy={y - 84} rx={14} ry={34} fill="#7cc68d" transform={`rotate(${a} ${x} ${y - 50})`} {...st(3)} />
          ))}
        </g>,
      );
    case 'tv':
      return g(
        <g>
          <rect x={x - 70} y={y - 150} width={140} height={90} rx={6} fill="#2f3542" {...st()} />
          <rect x={x - 62} y={y - 142} width={124} height={74} fill="#8fd1ff" />
          <rect x={x - 50} y={y - 58} width={100} height={54} fill="#b98a5e" {...st()} />
        </g>,
      );
    case 'podium':
      return g(
        <g>
          <path d={d`M ${x - 70} ${y - 120} L ${x + 70} ${y - 120} L ${x + 56} ${y - 2} L ${x - 56} ${y - 2} Z`} fill={p.color ?? '#6aa1e6'} {...st()} />
          <rect x={x - 78} y={y - 132} width={156} height={16} rx={4} fill="#ffffff" {...st()} />
          {p.label && <T x={x} y={y - 64} size={26} color="#ffffff">{p.label}</T>}
        </g>,
      );
    case 'cage':
      return g(
        <g>
          <path d={d`M ${x - 80} ${y - 2} L ${x - 80} ${y - 200} Q ${x} ${y - 270} ${x + 80} ${y - 200} L ${x + 80} ${y - 2} Z`} fill="none" {...st()} />
          {Array.from({ length: 7 }, (_, i) => (
            <path key={i} d={d`M ${x - 60 + i * 20} ${y - 2} L ${x - 60 + i * 20} ${y - 226 + Math.abs(i - 3) * 8}`} {...st(3)} />
          ))}
          <rect x={x - 86} y={y - 12} width={172} height={14} rx={4} fill="#c9a227" {...st()} />
          {p.label && (
            <g>
              <path d={d`M ${x} ${y - 238} L ${x} ${y - 256}`} {...st(2.4)} />
              <rect x={x - 56} y={y - 286} width={112} height={30} rx={6} fill="#ffffff" {...st(3)} />
              <T x={x} y={y - 264} size={17}>{p.label}</T>
            </g>
          )}
        </g>,
      );
    case 'wheel':
      return g(
        <g>
          <circle cx={x} cy={y - 130} r={128} fill="none" {...st(6)} />
          <circle cx={x} cy={y - 130} r={116} fill="none" {...st(3)} />
          {Array.from({ length: 12 }, (_, i) => {
            const a = (i / 12) * Math.PI * 2;
            return <path key={i} d={d`M ${x + Math.cos(a) * 116} ${y - 130 + Math.sin(a) * 116} L ${x + Math.cos(a) * 128} ${y - 130 + Math.sin(a) * 128}`} {...st(3)} />;
          })}
          <path d={d`M ${x} ${y - 130} L ${x - 70} ${y} M ${x} ${y - 130} L ${x + 70} ${y}`} {...st(5)} />
        </g>,
      );
    case 'battery': {
      const v = p.values?.[0] ?? 3;
      const w = p.w ?? 110;
      return (
        <g>
          <rect x={x - w / 2} y={y - 26} width={w} height={52} rx={8} fill="#ffffff" {...st()} />
          <rect x={x + w / 2} y={y - 12} width={10} height={24} rx={3} fill={INK} />
          <rect x={x - w / 2 + 6} y={y - 20} width={Math.max(4, ((w - 12) * v) / 100)} height={40} rx={4} fill={v < 20 ? '#e5484d' : '#7cc68d'} />
          <T x={x} y={y + 9} size={24}>{`${v}%`}</T>
        </g>
      );
    }
    case 'chest':
      return g(
        <g>
          <rect x={x - 54} y={y - 60} width={108} height={56} rx={4} fill="#c08b5c" {...st()} />
          <path d={d`M ${x - 54} ${y - 60} Q ${x} ${y - 110} ${x + 54} ${y - 60}`} fill="#d9a066" {...st()} />
          <rect x={x - 10} y={y - 66} width={20} height={22} rx={3} fill="#ffd84d" {...st(3)} />
          <path d={starPath(x + 50, y - 96, 12)} fill="#fff6b0" {...st(2)} />
        </g>,
      );
    case 'lockdoor':
      return g(
        <g>
          <rect x={x - 70} y={y - 250} width={140} height={246} rx={8} fill="#6b5a8a" {...st()} />
          <path d={d`M ${x - 70} ${y - 180} L ${x + 70} ${y - 180} M ${x - 70} ${y - 100} L ${x + 70} ${y - 100}`} {...st(3)} />
          <rect x={x - 26} y={y - 150} width={52} height={44} rx={6} fill="#ffd84d" {...st()} />
          <path d={d`M ${x - 16} ${y - 150} L ${x - 16} ${y - 170} Q ${x} ${y - 192} ${x + 16} ${y - 170} L ${x + 16} ${y - 150}`} fill="none" {...st()} />
          <T x={x} y={y - 210} size={44} color="#ffffff">?</T>
        </g>,
      );
    case 'flag':
      return g(
        <g>
          <path d={d`M ${x} ${y - 2} L ${x} ${y - 200}`} {...st(6)} />
          <path d={d`M ${x} ${y - 200} L ${x + 110} ${y - 176} L ${x} ${y - 140} Z`} fill={p.color ?? '#e5484d'} {...st()} />
          {p.label && <T x={x + 40} y={y - 164} size={18} color="#ffffff">{p.label}</T>}
        </g>,
      );
    case 'gift':
      return g(
        <g>
          <rect x={x - 34} y={y - 60} width={68} height={56} fill="#ff8fab" {...st()} />
          <rect x={x - 40} y={y - 74} width={80} height={16} fill="#ff8fab" {...st()} />
          <path d={d`M ${x} ${y - 74} L ${x} ${y - 4}`} stroke="#ffd84d" strokeWidth={10} />
          <path d={d`M ${x} ${y - 74} q ${-26} ${-24} ${-20} ${-4} M ${x} ${y - 74} q ${26} ${-24} ${20} ${-4}`} fill="none" {...st(3)} />
        </g>,
      );
    case 'cloudcoin':
      return (
        <g>
          <path d={d`M ${x - 60} ${y + 20} q ${-10} ${-34} ${20} ${-40} q ${10} ${-30} ${44} ${-20} q ${34} ${-12} ${46} ${20} q ${26} ${10} ${10} ${40} Z`} fill="#ffffff" {...st()} />
          <circle cx={x} cy={y} r={22} fill="#ffd84d" {...st(3)} />
          <T x={x} y={y + 8} size={22} color="#8a6a1a">₩</T>
        </g>
      );
    case 'board': {
      const w = p.w ?? 240;
      const rows = p.rows ?? [];
      const h = p.h ?? 54 + rows.length * 30;
      return (
        <g>
          <rect x={x - w / 2 + 5} y={y + 5} width={w} height={h} rx={10} fill="#000000" opacity={0.18} />
          <rect x={x - w / 2} y={y} width={w} height={h} rx={10} fill={p.color ?? '#ffffff'} {...st()} />
          {p.label && <T x={x} y={y + 34} size={22}>{p.label}</T>}
          {rows.map((r, i) => (
            <T key={i} x={x - w / 2 + 18} y={y + 66 + i * 30} size={18} weight={600} anchor="start">
              {r}
            </T>
          ))}
        </g>
      );
    }
    case 'score': {
      const w = p.w ?? 230;
      return (
        <g>
          <rect x={x - w / 2 + 5} y={y + 5} width={w} height={120} rx={14} fill="#000000" opacity={0.2} />
          <rect x={x - w / 2} y={y} width={w} height={120} rx={14} fill="#22355d" {...st()} />
          <rect x={x - w / 2 + 10} y={y + 44} width={w - 20} height={66} rx={8} fill="#111827" />
          {p.label && <T x={x} y={y + 31} size={18} color="#ffe28a">{p.label}</T>}
          {p.label2 && <T x={x} y={y + 92} size={44} color={p.color ?? '#7cf29a'}>{p.label2}</T>}
        </g>
      );
    }
    case 'rx': {
      const rows = p.rows ?? [];
      const w = p.w ?? 250;
      const h = 70 + rows.length * 30;
      return (
        <g transform={`rotate(-3 ${x} ${y + h / 2})`}>
          <rect x={x - w / 2 + 5} y={y + 5} width={w} height={h} fill="#000000" opacity={0.16} />
          <rect x={x - w / 2} y={y} width={w} height={h} fill="#ffffff" {...st()} />
          <rect x={x - w / 2} y={y} width={w} height={40} fill="#e3f4ff" {...st()} />
          <T x={x} y={y + 28} size={20}>{p.label ?? '처방전'}</T>
          {rows.map((r, i) => (
            <T key={i} x={x - w / 2 + 16} y={y + 70 + i * 30} size={18} weight={600} anchor="start">
              {r}
            </T>
          ))}
          <circle cx={x + w / 2 - 34} cy={y + h - 30} r={20} fill="none" stroke="#e5484d" strokeWidth={3} />
          <T x={x + w / 2 - 34} y={y + h - 24} size={14} color="#e5484d">명경</T>
        </g>
      );
    }
    case 'graph': {
      const v = p.values ?? [50, 50, 50];
      const w = p.w ?? 300;
      const h = p.h ?? 170;
      const x0 = x - w / 2;
      const labels = (p.rows ?? ['초년', '중년', '말년']).slice(0, v.length);
      const px = (i: number) => x0 + 40 + (i * (w - 80)) / Math.max(1, v.length - 1);
      const py = (val: number) => y + h - 40 - ((val - 20) / 70) * (h - 70);
      return (
        <g>
          <rect x={x0 + 5} y={y + 5} width={w} height={h} rx={10} fill="#000000" opacity={0.16} />
          <rect x={x0} y={y} width={w} height={h} rx={10} fill="#ffffff" {...st()} />
          <path d={d`M ${x0 + 24} ${y + h - 40} L ${x0 + w - 16} ${y + h - 40}`} {...st(2.4)} />
          <path d={v.map((val, i) => `${i ? 'L' : 'M'} ${px(i).toFixed(1)} ${py(val).toFixed(1)}`).join(' ')} fill="none" stroke="#e5484d" strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
          {v.map((val, i) => (
            <g key={i}>
              <circle cx={px(i)} cy={py(val)} r={7} fill="#ffffff" {...st(3)} />
              <T x={px(i)} y={py(val) - 14} size={15} weight={700}>{`${val}`}</T>
              <T x={px(i)} y={y + h - 14} size={16} weight={700}>{labels[i] ?? ''}</T>
            </g>
          ))}
        </g>
      );
    }
    case 'phonebig': {
      const rows = p.rows ?? [];
      const w = p.w ?? 200;
      const h = 90 + rows.length * 44;
      return (
        <g>
          <rect x={x - w / 2} y={y} width={w} height={h} rx={22} fill="#2f3542" {...st()} />
          <rect x={x - w / 2 + 10} y={y + 26} width={w - 20} height={h - 44} rx={8} fill="#f4f6fb" />
          {p.label && <T x={x} y={y + 52} size={16}>{p.label}</T>}
          {rows.map((r, i) => (
            <g key={i}>
              <rect x={x - w / 2 + 18} y={y + 66 + i * 44} width={w - 36} height={36} rx={10} fill={i % 2 ? '#ffe7a8' : '#ffffff'} stroke="#d6d3d1" strokeWidth={1.5} />
              <T x={x - w / 2 + 28} y={y + 90 + i * 44} size={15} weight={600} anchor="start">
                {r}
              </T>
            </g>
          ))}
        </g>
      );
    }
    case 'status': {
      const rows = p.rows ?? [];
      const w = p.w ?? 300;
      const h = 62 + rows.length * 32;
      return (
        <g>
          <rect x={x - w / 2} y={y} width={w} height={h} rx={8} fill="#13204a" opacity={0.92} />
          <rect x={x - w / 2 + 4} y={y + 4} width={w - 8} height={h - 8} rx={6} fill="none" stroke="#9fd0ff" strokeWidth={2.4} />
          <T x={x} y={y + 34} size={20} color="#9fd0ff">{p.label ?? '상태창'}</T>
          <path d={d`M ${x - w / 2 + 16} ${y + 46} L ${x + w / 2 - 16} ${y + 46}`} stroke="#9fd0ff" strokeWidth={1.5} />
          {rows.map((r, i) => (
            <T key={i} x={x - w / 2 + 18} y={y + 74 + i * 32} size={17} weight={600} color="#ffffff" anchor="start">
              {r}
            </T>
          ))}
        </g>
      );
    }
    case 'shelf': {
      const rows = p.rows ?? [];
      const w = p.w ?? 520;
      const cols = Math.min(4, Math.max(1, rows.length));
      const cw = w / cols;
      const colors = ['#7cc68d', '#f2836b', '#f0c25e', '#b9c4da', '#6aa1e6', '#b9a3f0'];
      return (
        <g>
          {rows.map((r, i) => {
            const cx = x - w / 2 + cw * (i % cols) + cw / 2;
            const cy = y + Math.floor(i / cols) * 96;
            return (
              <g key={i}>
                <rect x={cx - cw / 2 + 8} y={cy} width={cw - 16} height={84} rx={10} fill="#fffaf0" {...st(3)} />
                <circle cx={cx} cy={cy + 28} r={16} fill={p.color ?? colors[i % colors.length]} {...st(3)} />
                <path d={starPath(cx + 10, cy + 20, 5)} fill="#ffffff" />
                <T x={cx} y={cy + 72} size={15} weight={700}>{r}</T>
              </g>
            );
          })}
        </g>
      );
    }
  }
}

export { heartPath, lighten, starPath5 };
