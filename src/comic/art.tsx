/**
 * 인생 웹툰 그림 — 외부 이미지·라이브러리 없이 SVG만으로 그린다.
 * 화면에는 SVG를 그대로 보여 주고, 저장할 때는 같은 SVG를 캔버스로 옮겨 PNG로 만든다.
 * (모든 스타일을 속성으로 넣어, CSS 없이 이미지로 옮겨도 똑같이 보이게 한다)
 */
import type { ReactNode } from 'react';
import { textWidth, widest, wrap, wrapBalanced } from './text.ts';
import type { Actor, Age, Bg, Face, Fx, Held, Panel, PanelTone, Pose, PropSpec } from './types.ts';

export const PW = 600;
export const PH = 440;
export const GROUND = 404;
export const INK = '#3a302b';
export const FONT =
  "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', 'Malgun Gothic', 'Noto Sans KR', 'Noto Sans CJK KR', sans-serif";
const SKIN = '#ffe2cb';
const WHITE = '#ffffff';

type Pt = [number, number];

/** 경로 문자열 — 숫자를 소수 한 자리로 줄인다 */
function d(s: TemplateStringsArray, ...v: number[]): string {
  let out = s[0];
  for (let i = 0; i < v.length; i++) out += String(Math.round(v[i] * 10) / 10) + s[i + 1];
  return out;
}
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
function rng(seed: number) {
  let s = seed % 2147483647 || 1;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}
function heartPath(cx: number, cy: number, s: number): string {
  return d`M ${cx} ${cy + s * 0.9} C ${cx - s * 1.25} ${cy + s * 0.05} ${cx - s * 1.1} ${cy - s * 0.95} ${cx - s * 0.5} ${cy - s * 0.95} C ${cx - s * 0.18} ${cy - s * 0.95} ${cx} ${cy - s * 0.7} ${cx} ${cy - s * 0.42} C ${cx} ${cy - s * 0.7} ${cx + s * 0.18} ${cy - s * 0.95} ${cx + s * 0.5} ${cy - s * 0.95} C ${cx + s * 1.1} ${cy - s * 0.95} ${cx + s * 1.25} ${cy + s * 0.05} ${cx} ${cy + s * 0.9} Z`;
}
function starPath(cx: number, cy: number, s: number): string {
  return d`M ${cx} ${cy - s} Q ${cx + s * 0.16} ${cy - s * 0.16} ${cx + s} ${cy} Q ${cx + s * 0.16} ${cy + s * 0.16} ${cx} ${cy + s} Q ${cx - s * 0.16} ${cy + s * 0.16} ${cx - s} ${cy} Q ${cx - s * 0.16} ${cy - s * 0.16} ${cx} ${cy - s} Z`;
}
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

// ---------------------------------------------------------------------------
// 인물
// ---------------------------------------------------------------------------
interface Geo {
  leg: number;
  th: number;
  tw: number;
  hr: number;
  s: number;
  top: number;
  hy: number;
}
const GEO: Record<Age, [number, number, number, number, number]> = {
  kid: [34, 60, 60, 46, 0.8],
  teen: [50, 74, 66, 48, 0.9],
  adult: [56, 82, 72, 50, 0.9],
  senior: [52, 80, 74, 50, 0.9],
};
function geo(age: Age = 'adult'): Geo {
  const [leg, th, tw, hr, s] = GEO[age];
  const top = -(leg + th);
  return { leg, th, tw, hr, s, top, hy: top - hr + 8 };
}

const ABOVE_FX: Fx[] = ['bulb', 'cloud', 'exclaim', 'question', 'zzz', 'steam'];

/** 패널 좌표에서 인물 머리의 위치 (말풍선 배치용) */
export function headOf(a: Actor) {
  const g = geo(a.age);
  const bare = GROUND + (g.hy - g.hr - 12) * g.s;
  let top = bare;
  if (a.fx?.some((f) => ABOVE_FX.includes(f))) top -= 56 * g.s;
  if (a.held === 'umbrella' || a.pose === 'cheer') top -= 34 * g.s;
  return { x: a.x, cy: GROUND + g.hy * g.s, r: g.hr * g.s, top, bare };
}

type HairStyle = 'short' | 'spiky' | 'long' | 'bob' | 'ponytail' | 'pigtails' | 'bun' | 'slick' | 'balding';
interface Look {
  hair: HairStyle;
  hairColor: string;
  top: string;
  bottom: string;
  skirt: boolean;
  glasses: boolean;
  collar: 'v' | 'suit' | 'uniform' | 'round' | 'apron';
  accent?: string;
}

function lookOf(a: Actor): Look {
  const f = a.gender === 'female';
  const age = a.age ?? 'adult';
  const base = { bottom: '#4b5168', skirt: false, glasses: false, collar: 'v' as const };
  switch (a.role) {
    case 'me': {
      const top = a.outfit ?? '#4a86d0';
      if (age === 'kid') return { ...base, hair: f ? 'pigtails' : 'short', hairColor: '#3b2b25', top, skirt: f, collar: 'round' };
      if (age === 'teen') return { ...base, hair: f ? 'long' : 'short', hairColor: '#2f2420', top: '#34405a', bottom: '#3a4256', skirt: f, collar: 'uniform', accent: top };
      if (age === 'senior') return { ...base, hair: f ? 'bun' : 'balding', hairColor: '#d6d3cf', top, bottom: '#5a5f70', glasses: true };
      return { ...base, hair: f ? 'long' : 'short', hairColor: '#2f2420', top, skirt: f };
    }
    case 'partner':
      return f
        ? { ...base, hair: 'bob', hairColor: '#7a4b33', top: '#f29bb5', bottom: '#5a5f78', skirt: true }
        : { ...base, hair: 'short', hairColor: '#4a3426', top: '#4fb3a9' };
    case 'friend':
      return f ? { ...base, hair: 'ponytail', hairColor: '#9a6438', top: '#b48ad8', collar: 'round' } : { ...base, hair: 'spiky', hairColor: '#8a5a3b', top: '#b48ad8', collar: 'round' };
    case 'coworker':
      return f ? { ...base, hair: 'bob', hairColor: '#5b4033', top: '#d8b48a', skirt: true } : { ...base, hair: 'short', hairColor: '#5b4033', top: '#d8b48a' };
    case 'boss':
      return f
        ? { ...base, hair: 'bun', hairColor: '#3b302b', top: '#5b6170', bottom: '#5b6170', glasses: true, collar: 'suit' }
        : { ...base, hair: 'slick', hairColor: '#5d5955', top: '#5b6170', bottom: '#5b6170', glasses: true, collar: 'suit', accent: '#c94a3f' };
    case 'teacher':
      return { ...base, hair: f ? 'bun' : 'slick', hairColor: '#4a3a33', top: '#6d9f71', glasses: true };
    case 'parent':
      return f ? { ...base, hair: 'bun', hairColor: '#4a3a33', top: '#e59a72', bottom: '#6a5f70', collar: 'apron' } : { ...base, hair: 'short', hairColor: '#4a3a33', top: '#8c7a6b' };
    case 'child':
      return { ...base, hair: f ? 'pigtails' : 'short', hairColor: '#3b2b25', top: '#ffd166', bottom: '#4b8fd9', skirt: f, collar: 'round' };
    case 'elder':
      return { ...base, hair: f ? 'bun' : 'balding', hairColor: '#d6d3cf', top: '#9bb59a', bottom: '#5a5f70', glasses: !f };
  }
}

interface Arm {
  e: Pt;
  h: Pt;
  front: boolean;
}
/** 자세별 팔꿈치(곡선 조절점)·손 위치 — [왼팔, 오른팔] (x가 +인 쪽이 오른팔) */
function arms(pose: Pose, g: Geo): [Arm, Arm] {
  const sx = g.tw / 2 - 9;
  const sy = g.top + 15;
  const { hy, hr } = g;
  const waist = -g.leg;
  const idle: Arm = { e: [sx + 9, sy + 30], h: [sx + 11, waist - 2], front: false };
  const m = (a: Arm): Arm => ({ e: [-a.e[0], a.e[1]], h: [-a.h[0], a.h[1]], front: a.front });
  let r: Arm;
  let l: Arm | null = null;
  switch (pose) {
    case 'cheer':
      r = { e: [sx + 28, sy - 14], h: [sx + 30, hy - hr * 0.55], front: false };
      break;
    case 'point':
      r = { e: [sx + 30, sy + 4], h: [sx + 60, sy - 6], front: false };
      l = m(idle);
      break;
    case 'think':
      r = { e: [sx + 10, sy + 36], h: [hr * 0.3, hy + hr * 0.82], front: true };
      l = m(idle);
      break;
    case 'hold':
      r = { e: [sx + 10, sy + 36], h: [17, sy + 34], front: true };
      break;
    case 'wave':
      r = { e: [sx + 28, sy - 4], h: [sx + 34, hy - 6], front: false };
      l = m(idle);
      break;
    case 'facepalm':
      r = { e: [sx + 12, sy + 30], h: [hr * 0.18, hy - hr * 0.08], front: true };
      l = m(idle);
      break;
    case 'fist':
      r = { e: [sx + 30, sy + 6], h: [sx + 28, sy - 34], front: false };
      l = m(idle);
      break;
    case 'fighting':
      r = { e: [sx + 12, sy + 38], h: [15, sy + 8], front: true };
      break;
    case 'shrug':
      r = { e: [sx + 16, sy + 30], h: [sx + 40, sy + 14], front: false };
      break;
    case 'cross':
      r = { e: [sx + 8, sy + 38], h: [-sx + 12, sy + 30], front: true };
      break;
    case 'cheeks':
      r = { e: [sx + 10, sy + 34], h: [hr * 0.7, hy + hr * 0.46], front: true };
      break;
    default:
      r = idle;
  }
  return [l ?? m(r), r];
}

function ArmView({ s, arm, color }: { s: Pt; arm: Arm; color: string }) {
  const p = d`M ${s[0]} ${s[1]} Q ${arm.e[0]} ${arm.e[1]} ${arm.h[0]} ${arm.h[1]}`;
  return (
    <g>
      <path d={p} stroke={INK} strokeWidth={20} fill="none" strokeLinecap="round" />
      <path d={p} stroke={color} strokeWidth={14.5} fill="none" strokeLinecap="round" />
      <circle cx={arm.h[0]} cy={arm.h[1]} r={9.5} fill={SKIN} stroke={INK} strokeWidth={2.6} />
    </g>
  );
}

function hair(style: HairStyle, c: string, g: Geo): { back: ReactNode; front: ReactNode; ears: boolean } {
  const r = g.hr;
  const y = g.hy;
  const st = { fill: c, stroke: INK, strokeWidth: 3, strokeLinejoin: 'round' as const };
  const vol = <ellipse cx={0} cy={y - 5} rx={r + 4} ry={r + 3} {...st} />;
  const fringe = (
    <path
      d={d`M ${-r - 3} ${y - 2} C ${-r - 7} ${y - r * 0.9} ${-r * 0.55} ${y - r - 11} 0 ${y - r - 9} C ${r * 0.55} ${y - r - 11} ${r + 7} ${y - r * 0.9} ${r + 3} ${y - 2} L ${r - 6} ${y - 4} L ${r * 0.8} ${y - r * 0.3} L ${r * 0.56} ${y - r * 0.44} L ${r * 0.36} ${y - r * 0.22} L ${r * 0.16} ${y - r * 0.46} L ${-r * 0.06} ${y - r * 0.24} L ${-r * 0.28} ${y - r * 0.46} L ${-r * 0.5} ${y - r * 0.27} L ${-r * 0.7} ${y - r * 0.43} L ${-r * 0.84} ${y - r * 0.27} L ${-r + 6} ${y - 4} Z`}
      {...st}
    />
  );
  const bangs = (lock: number) => {
    const c1 = Math.min(0.15, lock - 0.12);
    return (
      <path
        d={d`M ${-r - 4} ${y + r * lock} C ${-r - 8} ${y - r * 0.5} ${-r * 0.6} ${y - r - 10} 0 ${y - r - 9} C ${r * 0.6} ${y - r - 10} ${r + 8} ${y - r * 0.5} ${r + 4} ${y + r * lock} L ${r - 7} ${y + r * (lock - 0.08)} C ${r - 6} ${y + r * c1} ${r * 0.82} ${y - r * 0.2} ${r * 0.62} ${y - r * 0.36} Q ${r * 0.2} ${y - r * 0.16} ${-r * 0.12} ${y - r * 0.5} Q ${-r * 0.4} ${y - r * 0.22} ${-r * 0.66} ${y - r * 0.34} C ${-r * 0.84} ${y - r * 0.16} ${-r + 6} ${y + r * c1} ${-r + 7} ${y + r * (lock - 0.08)} Z`}
        {...st}
      />
    );
  };
  const longBack = (end: number) => (
    <path
      d={d`M 0 ${y - r - 9} C ${r * 0.95} ${y - r - 9} ${r + 13} ${y - r * 0.35} ${r + 11} ${y + r * 0.5} C ${r + 10} ${y + r * (end - 0.3)} ${r + 4} ${y + r * end} ${r - 8} ${y + r * end} L ${-r + 8} ${y + r * end} C ${-r - 4} ${y + r * end} ${-r - 10} ${y + r * (end - 0.3)} ${-r - 11} ${y + r * 0.5} C ${-r - 13} ${y - r * 0.35} ${-r * 0.95} ${y - r - 9} 0 ${y - r - 9} Z`}
      {...st}
    />
  );
  const neat = (
    <path
      d={d`M ${-r - 3} ${y + 4} C ${-r - 6} ${y - r * 0.85} ${-r * 0.5} ${y - r - 10} 0 ${y - r - 9} C ${r * 0.5} ${y - r - 10} ${r + 6} ${y - r * 0.85} ${r + 3} ${y + 4} L ${r - 6} ${y + 2} C ${r - 6} ${y - r * 0.3} ${r * 0.5} ${y - r * 0.58} 0 ${y - r * 0.6} C ${-r * 0.5} ${y - r * 0.58} ${-r + 6} ${y - r * 0.3} ${-r + 6} ${y + 2} Z`}
      {...st}
    />
  );
  switch (style) {
    case 'short':
      return { back: vol, front: fringe, ears: true };
    case 'spiky':
      return {
        back: vol,
        front: (
          <g>
            {[-0.62, -0.31, 0, 0.31, 0.62].map((k) => {
              const bx = k * r;
              const by = y - Math.sqrt(1 - k * k) * (r + 6) + 2;
              return <path key={k} d={d`M ${bx - 10} ${by + 8} L ${bx + k * 12} ${by - 13} L ${bx + 10} ${by + 8} Z`} {...st} />;
            })}
            {fringe}
          </g>
        ),
        ears: true,
      };
    case 'long':
      return { back: longBack(1.5), front: bangs(0.9), ears: false };
    case 'bob':
      return { back: longBack(0.98), front: bangs(0.72), ears: false };
    case 'ponytail':
      return {
        back: (
          <g>
            <path
              d={d`M ${r * 0.5} ${y - r * 0.78} C ${r + 22} ${y - r * 0.95} ${r + 36} ${y + r * 0.1} ${r + 18} ${y + r * 1.05} C ${r + 12} ${y + r * 0.6} ${r + 6} ${y + r * 0.1} ${r * 0.7} ${y - r * 0.28} Z`}
              {...st}
            />
            {vol}
          </g>
        ),
        front: (
          <g>
            {bangs(0.42)}
            <circle cx={r * 0.74} cy={y - r * 0.66} r={6} fill="#ff7aa2" stroke={INK} strokeWidth={2} />
          </g>
        ),
        ears: true,
      };
    case 'pigtails':
      return {
        back: (
          <g>
            {[-1, 1].map((sd) => (
              <ellipse key={sd} cx={sd * (r + 9)} cy={y + r * 0.3} rx={12} ry={22} transform={`rotate(${sd * -18} ${sd * (r + 9)} ${y + r * 0.3})`} {...st} />
            ))}
            {vol}
          </g>
        ),
        front: (
          <g>
            {bangs(0.4)}
            {[-1, 1].map((sd) => (
              <circle key={sd} cx={sd * (r - 1)} cy={y - r * 0.02} r={6} fill="#ff7aa2" stroke={INK} strokeWidth={2} />
            ))}
          </g>
        ),
        ears: false,
      };
    case 'bun':
      return {
        back: (
          <g>
            <circle cx={0} cy={y - r - 8} r={r * 0.36} {...st} />
            {vol}
          </g>
        ),
        front: (
          <g>
            {neat}
            <path d={d`M 0 ${y - r * 0.6} L 2 ${y - r - 6}`} stroke={INK} strokeWidth={2} />
          </g>
        ),
        ears: true,
      };
    case 'slick':
      return {
        back: vol,
        front: (
          <g>
            <path
              d={d`M ${-r - 3} ${y + 2} C ${-r - 6} ${y - r * 0.85} ${-r * 0.5} ${y - r - 10} 0 ${y - r - 9} C ${r * 0.5} ${y - r - 10} ${r + 6} ${y - r * 0.85} ${r + 3} ${y + 2} L ${r - 6} ${y} C ${r - 4} ${y - r * 0.35} ${r * 0.5} ${y - r * 0.64} ${-r * 0.3} ${y - r * 0.6} C ${-r * 0.62} ${y - r * 0.55} ${-r + 6} ${y - r * 0.3} ${-r + 6} ${y} Z`}
              {...st}
            />
            <path d={d`M ${-r * 0.3} ${y - r * 0.6} Q ${-r * 0.38} ${y - r * 0.92} ${-r * 0.2} ${y - r - 6}`} stroke={INK} strokeWidth={2} fill="none" />
          </g>
        ),
        ears: true,
      };
    case 'balding':
      return {
        back: null,
        front: (
          <g>
            {[-1, 1].map((sd) => (
              <path
                key={sd}
                d={d`M ${sd * (r + 2)} ${y + 6} C ${sd * (r + 6)} ${y - r * 0.35} ${sd * r * 0.75} ${y - r * 0.72} ${sd * r * 0.42} ${y - r * 0.66} C ${sd * r * 0.66} ${y - r * 0.45} ${sd * (r - 7)} ${y - r * 0.12} ${sd * (r - 6)} ${y + 4} Z`}
                {...st}
              />
            ))}
            <path d={d`M -10 ${y - r + 2} Q 0 ${y - r - 9} 12 ${y - r + 1}`} stroke={INK} strokeWidth={2.4} fill="none" strokeLinecap="round" />
          </g>
        ),
        ears: true,
      };
  }
}

type EyeK = 'dot' | 'down' | 'up' | 'happy' | 'closed' | 'line' | 'wide' | 'blank' | 'heart' | 'squeeze';
type BrowK = 'angry' | 'worry' | 'up' | 'firm';
type MouthK = 'smile' | 'grin' | 'laugh' | 'flat' | 'frown' | 'o' | 'O' | 'wavy' | 'smirk' | 'shout' | 'small';
const FACE: Record<Face, { e: EyeK; b?: BrowK; m: MouthK; blush?: boolean; tears?: boolean; shade?: boolean; bags?: boolean }> = {
  neutral: { e: 'dot', m: 'flat' },
  smile: { e: 'dot', m: 'smile', blush: true },
  grin: { e: 'happy', m: 'grin', blush: true },
  laugh: { e: 'happy', b: 'up', m: 'laugh', blush: true },
  sad: { e: 'down', b: 'worry', m: 'frown' },
  cry: { e: 'squeeze', b: 'worry', m: 'wavy', tears: true },
  angry: { e: 'dot', b: 'angry', m: 'shout' },
  surprised: { e: 'wide', b: 'up', m: 'o' },
  worried: { e: 'dot', b: 'worry', m: 'wavy' },
  determined: { e: 'dot', b: 'firm', m: 'smirk' },
  nervous: { e: 'dot', b: 'worry', m: 'smile' },
  love: { e: 'heart', m: 'grin', blush: true },
  tired: { e: 'line', b: 'worry', m: 'o', bags: true },
  proud: { e: 'closed', b: 'up', m: 'smirk', blush: true },
  thinking: { e: 'up', m: 'small' },
  shock: { e: 'blank', m: 'O', shade: true },
};

function eye(k: EyeK, x: number, y: number, sd: -1 | 1) {
  const line = { stroke: INK, strokeWidth: 3.2, fill: 'none', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  switch (k) {
    case 'dot':
    case 'down':
    case 'up': {
      const ox = k === 'up' ? 1.5 : 0;
      const oy = k === 'up' ? -2.5 : k === 'down' ? 2 : 0;
      return (
        <g key={sd}>
          <ellipse cx={x + ox} cy={y + oy} rx={4.8} ry={k === 'down' ? 5.6 : 6.4} fill={INK} />
          <circle cx={x + ox + 1.6} cy={y + oy - 2.4} r={1.9} fill={WHITE} />
        </g>
      );
    }
    case 'happy':
      return <path key={sd} d={d`M ${x - 6} ${y + 2} Q ${x} ${y - 7} ${x + 6} ${y + 2}`} {...line} />;
    case 'closed':
      return <path key={sd} d={d`M ${x - 6} ${y - 1} Q ${x} ${y + 5} ${x + 6} ${y - 1}`} {...line} />;
    case 'line':
      return <path key={sd} d={d`M ${x - 6} ${y + 1} L ${x + 6} ${y + 1}`} {...line} />;
    case 'wide':
      return (
        <g key={sd}>
          <circle cx={x} cy={y} r={7.5} fill={WHITE} stroke={INK} strokeWidth={2.4} />
          <circle cx={x} cy={y + 0.5} r={3.4} fill={INK} />
        </g>
      );
    case 'blank':
      return <circle key={sd} cx={x} cy={y} r={7.5} fill={WHITE} stroke={INK} strokeWidth={2.4} />;
    case 'heart':
      return <path key={sd} d={heartPath(x, y, 8)} fill="#ff4d6d" stroke={INK} strokeWidth={1.4} />;
    case 'squeeze':
      return <path key={sd} d={d`M ${x - sd * 5} ${y - 5} L ${x + sd * 4} ${y} L ${x - sd * 5} ${y + 5}`} {...line} />;
  }
}

function mouth(k: MouthK, y: number) {
  const line = { stroke: INK, strokeWidth: 3, fill: 'none', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  const fillM = { fill: '#7c2f2f', stroke: INK, strokeWidth: 2.4, strokeLinejoin: 'round' as const };
  switch (k) {
    case 'smile':
      return <path d={d`M -8 ${y - 1} Q 0 ${y + 7} 8 ${y - 1}`} {...line} />;
    case 'grin':
      return (
        <g>
          <path d={d`M -10 ${y - 2} Q 0 ${y + 15} 10 ${y - 2} Z`} {...fillM} />
          <path d={d`M -4.5 ${y + 6} Q 0 ${y + 2.5} 4.5 ${y + 6} Q 0 ${y + 9} -4.5 ${y + 6} Z`} fill="#ff8f8f" />
        </g>
      );
    case 'laugh':
      return (
        <g>
          <path d={d`M -12 ${y - 3} Q 0 ${y + 19} 12 ${y - 3} Z`} {...fillM} />
          <path d={d`M -6 ${y + 8} Q 0 ${y + 3} 6 ${y + 8} Q 0 ${y + 12} -6 ${y + 8} Z`} fill="#ff8f8f" />
        </g>
      );
    case 'flat':
      return <path d={d`M -6 ${y + 1} L 6 ${y + 1}`} {...line} />;
    case 'frown':
      return <path d={d`M -7 ${y + 4} Q 0 ${y - 3} 7 ${y + 4}`} {...line} />;
    case 'o':
      return <ellipse cx={0} cy={y + 2} rx={4.5} ry={5.5} {...fillM} />;
    case 'O':
      return <ellipse cx={0} cy={y + 4} rx={7.5} ry={10} {...fillM} />;
    case 'wavy':
      return <path d={d`M -9 ${y + 1} Q -6 ${y - 3} -3 ${y + 1} Q 0 ${y + 5} 3 ${y + 1} Q 6 ${y - 3} 9 ${y + 1}`} {...line} strokeWidth={2.6} />;
    case 'smirk':
      return <path d={d`M -7 ${y} Q 1 ${y + 5} 8 ${y - 3}`} {...line} />;
    case 'shout':
      return (
        <g>
          <path d={d`M -10 ${y - 3} L 10 ${y - 3} L 7 ${y + 9} L -7 ${y + 9} Z`} {...fillM} />
          <rect x={-8.5} y={y - 2.2} width={17} height={3.4} fill={WHITE} />
        </g>
      );
    case 'small':
      return <path d={d`M 1 ${y + 1} L 7 ${y}`} {...line} />;
  }
}

function FaceView({ f, g }: { f: Face; g: Geo }) {
  const F = FACE[f];
  const ex = g.hr * 0.36;
  const ey = g.hy + g.hr * 0.12;
  return (
    <g>
      {F.blush &&
        [-1, 1].map((sd) => <ellipse key={sd} cx={sd * g.hr * 0.6} cy={g.hy + g.hr * 0.38} rx={8} ry={4.5} fill="#ff9a9a" opacity={0.6} />)}
      {eye(F.e, -ex, ey, -1)}
      {eye(F.e, ex, ey, 1)}
      {F.bags && [-1, 1].map((sd) => <path key={sd} d={d`M ${sd * ex - 6} ${ey + 8} Q ${sd * ex} ${ey + 12} ${sd * ex + 6} ${ey + 8}`} stroke="#a99ac0" strokeWidth={2} fill="none" />)}
      {F.tears &&
        [-1, 1].map((sd) => (
          <path key={sd} d={d`M ${sd * ex} ${ey + 6} Q ${sd * (ex + 3)} ${ey + 18} ${sd * ex} ${ey + 32}`} stroke="#79c3f0" strokeWidth={5.5} fill="none" strokeLinecap="round" opacity={0.95} />
        ))}
      {mouth(F.m, g.hy + g.hr * 0.5)}
    </g>
  );
}

/** 눈썹·충격 그늘은 앞머리 위에 그린다 (앞머리에 가려지지 않게) */
function BrowView({ f, g }: { f: Face; g: Geo }) {
  const F = FACE[f];
  const ex = g.hr * 0.36;
  const by = g.hy - g.hr * 0.16;
  const line = { stroke: INK, strokeWidth: 3, fill: 'none', strokeLinecap: 'round' as const };
  const brow = (sd: -1 | 1) => {
    const x = sd * ex;
    switch (F.b) {
      case 'angry':
        return <path key={sd} d={d`M ${x - sd * 8} ${by - 3} L ${x + sd * 7} ${by + 3}`} {...line} />;
      case 'worry':
        return <path key={sd} d={d`M ${x - sd * 8} ${by + 2} L ${x + sd * 7} ${by - 4}`} {...line} />;
      case 'up':
        return <path key={sd} d={d`M ${x - 7} ${by - 3} Q ${x} ${by - 8} ${x + 7} ${by - 3}`} {...line} />;
      case 'firm':
        return <path key={sd} d={d`M ${x - sd * 8} ${by - 2} L ${x + sd * 7} ${by + 1.5}`} {...line} />;
      default:
        return null;
    }
  };
  return (
    <g>
      {F.b && [brow(-1), brow(1)]}
      {F.shade &&
        [-16, -6, 4, 14].map((x) => (
          <path key={x} d={d`M ${x} ${g.hy - g.hr * 0.36} L ${x} ${g.hy - g.hr * 0.04}`} stroke="#6e7fc4" strokeWidth={2.6} opacity={0.8} />
        ))}
    </g>
  );
}

function Collar({ g, L }: { g: Geo; L: Look }) {
  const t = g.top;
  const b = -g.leg + 6;
  switch (L.collar) {
    case 'v':
      return <path d={d`M -10 ${t + 1} L 0 ${t + 15} L 10 ${t + 1}`} fill={SKIN} stroke={INK} strokeWidth={2.2} strokeLinejoin="round" />;
    case 'round':
      return <path d={d`M -13 ${t + 1} Q 0 ${t + 13} 13 ${t + 1}`} fill={SKIN} stroke={INK} strokeWidth={2.2} />;
    case 'suit':
      return (
        <g>
          <path d={d`M -15 ${t} L 0 ${t + 36} L 15 ${t} Z`} fill={WHITE} stroke={INK} strokeWidth={2.2} strokeLinejoin="round" />
          {L.accent && (
            <path d={d`M -4.5 ${t + 6} L 4.5 ${t + 6} L 6.5 ${t + 27} L 0 ${t + 35} L -6.5 ${t + 27} Z`} fill={L.accent} stroke={INK} strokeWidth={1.6} strokeLinejoin="round" />
          )}
          <path d={d`M 0 ${t + 36} L 0 ${b - 2}`} stroke={INK} strokeWidth={1.8} />
          <circle cx={0} cy={t + 50} r={2.6} fill={INK} />
        </g>
      );
    case 'uniform':
      return (
        <g>
          <path d={d`M -12 ${t} L 0 ${t + 26} L 12 ${t} Z`} fill={WHITE} stroke={INK} strokeWidth={2.2} strokeLinejoin="round" />
          <path d={d`M -4 ${t + 6} L 4 ${t + 6} L 5.5 ${t + 20} L 0 ${t + 26} L -5.5 ${t + 20} Z`} fill={L.accent ?? '#c94a3f'} stroke={INK} strokeWidth={1.6} strokeLinejoin="round" />
        </g>
      );
    case 'apron':
      return (
        <g>
          <path d={d`M -10 ${t + 1} L 0 ${t + 13} L 10 ${t + 1}`} fill={SKIN} stroke={INK} strokeWidth={2.2} strokeLinejoin="round" />
          <rect x={-g.tw / 2 + 9} y={t + 30} width={g.tw - 18} height={b - t - 34} rx={8} fill="#fffaf0" stroke={INK} strokeWidth={2.2} />
          <path d={d`M ${-g.tw / 2 + 14} ${t + 31} L -13 ${t + 4} M ${g.tw / 2 - 14} ${t + 31} L 13 ${t + 4}`} stroke={INK} strokeWidth={2} />
        </g>
      );
  }
}

function torsoPath(g: Geo): string {
  const t = g.top;
  const b = -g.leg + 6;
  const hw = g.tw / 2;
  const ht = hw - 4;
  return d`M ${-ht} ${t + 20} Q ${-ht} ${t} ${-ht + 20} ${t} L ${ht - 20} ${t} Q ${ht} ${t} ${ht} ${t + 20} L ${hw} ${b - 10} Q ${hw} ${b} ${hw - 10} ${b} L ${-hw + 10} ${b} Q ${-hw} ${b} ${-hw} ${b - 10} Z`;
}

function Legs({ g, L }: { g: Geo; L: Look }) {
  const lx = g.tw * 0.17;
  const top = -g.leg + 6;
  return (
    <g>
      {[-1, 1].map((sd) => (
        <g key={sd}>
          <path d={d`M ${sd * lx} ${top} L ${sd * lx} -10`} stroke={INK} strokeWidth={21} strokeLinecap="round" />
          <path d={d`M ${sd * lx} ${top} L ${sd * lx} -10`} stroke={L.bottom} strokeWidth={15.5} strokeLinecap="round" />
          <ellipse cx={sd * (lx + 2)} cy={-6} rx={13} ry={7.5} fill="#5b4636" stroke={INK} strokeWidth={2.4} />
        </g>
      ))}
      {L.skirt && (
        <path
          d={d`M ${-g.tw / 2 + 3} ${-g.leg + 2} L ${-g.tw / 2 - 9} ${-g.leg + 30} Q 0 ${-g.leg + 37} ${g.tw / 2 + 9} ${-g.leg + 30} L ${g.tw / 2 - 3} ${-g.leg + 2} Z`}
          fill={L.bottom}
          stroke={INK}
          strokeWidth={2.8}
          strokeLinejoin="round"
        />
      )}
    </g>
  );
}

function Glasses({ g }: { g: Geo }) {
  const ex = g.hr * 0.36;
  const ey = g.hy + g.hr * 0.12;
  return (
    <g fill={WHITE} fillOpacity={0.2} stroke={INK} strokeWidth={2.4}>
      <circle cx={-ex} cy={ey} r={10.5} />
      <circle cx={ex} cy={ey} r={10.5} />
      <path d={d`M ${-ex + 10.5} ${ey} L ${ex - 10.5} ${ey}`} fill="none" />
    </g>
  );
}

/** 손에 든 소품 (뒤집히지 않는 좌표계에서 그린다 — 글자가 거울상이 되지 않게) */
function HeldView({ kind, at, inHand }: { kind: Held; at: Pt; inHand?: boolean }) {
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

function behindFx(fx: Fx[], g: Geo) {
  return (
    <g>
      {fx.includes('shine') && (
        <g opacity={0.6}>
          {Array.from({ length: 12 }, (_, i) => {
            const a0 = (i / 12) * Math.PI * 2;
            const a1 = a0 + Math.PI / 24;
            const R = 150;
            return <path key={i} d={d`M 0 ${g.hy} L ${Math.cos(a0) * R} ${g.hy + Math.sin(a0) * R} L ${Math.cos(a1) * R} ${g.hy + Math.sin(a1) * R} Z`} fill="#ffe58a" />;
          })}
        </g>
      )}
      {fx.includes('flame') && (
        <g>
          <path
            d={d`M ${-g.tw * 0.95} 0 C ${-g.tw * 1.5} ${g.top} ${-g.hr * 1.2} ${g.hy - g.hr * 0.6} ${-g.hr * 0.5} ${g.hy - g.hr - 50} C ${-g.hr * 0.2} ${g.hy - g.hr - 10} ${0} ${g.hy - g.hr - 30} ${g.hr * 0.25} ${g.hy - g.hr - 70} C ${g.hr * 0.6} ${g.hy - g.hr - 20} ${g.hr * 1.3} ${g.hy - g.hr * 0.5} ${g.hr * 0.9} ${g.hy - g.hr - 36} C ${g.hr * 1.7} ${g.hy - g.hr * 0.3} ${g.tw * 1.5} ${g.top} ${g.tw * 0.95} 0 Z`}
            fill="#ff8a3d"
            opacity={0.35}
          />
          <path d={d`M ${-g.tw * 0.7} 0 C ${-g.tw} ${g.top} ${-g.hr} ${g.hy} 0 ${g.hy - g.hr - 30} C ${g.hr} ${g.hy} ${g.tw} ${g.top} ${g.tw * 0.7} 0 Z`} fill="#ffc94a" opacity={0.35} />
        </g>
      )}
    </g>
  );
}

function frontFx(fx: Fx[], g: Geo, dir: 1 | -1) {
  const r = g.hr;
  const y = g.hy;
  const out: ReactNode[] = [];
  for (const f of fx) {
    switch (f) {
      case 'sweat': {
        const x = dir * r * 0.98;
        const yy = y - r * 0.5;
        out.push(<path key={f} d={d`M ${x} ${yy - 12} C ${x + 8} ${yy - 1} ${x + 9} ${yy + 8} ${x} ${yy + 9} C ${x - 9} ${yy + 8} ${x - 8} ${yy - 1} ${x} ${yy - 12} Z`} fill="#9fd8ff" stroke="#3b8ac4" strokeWidth={2} />);
        break;
      }
      case 'anger': {
        const x = dir * r * 0.82;
        const yy = y - r * 0.82;
        out.push(
          <g key={f} stroke="#e5484d" strokeWidth={3.6} fill="none" strokeLinecap="round">
            {[0, 90, 180, 270].map((rot) => (
              <path key={rot} d={d`M ${x + 3} ${yy - 11} Q ${x + 3} ${yy - 3} ${x + 11} ${yy - 3}`} transform={`rotate(${rot} ${x} ${yy})`} />
            ))}
          </g>,
        );
        break;
      }
      case 'sparkle':
        out.push(
          <g key={f} fill="#ffd23f" stroke="#d49b00" strokeWidth={1.5}>
            <path d={starPath(-r - 28, y - r * 0.5, 12)} />
            <path d={starPath(r + 30, y - r * 0.1, 15)} />
            <path d={starPath(r * 0.7, y - r - 28, 10)} />
          </g>,
        );
        break;
      case 'hearts':
        out.push(
          <g key={f} fill="#ff5d7a" stroke={INK} strokeWidth={1.6}>
            <path d={heartPath(dir * (r + 22), y - r * 0.6, 11)} />
            <path d={heartPath(dir * (r + 40), y - r - 6, 8)} />
            <path d={heartPath(-dir * (r + 22), y - r * 0.85, 9)} />
          </g>,
        );
        break;
      case 'gloom':
        out.push(
          <g key={f} stroke="#5b4f9a" strokeWidth={3} opacity={0.6} strokeLinecap="round">
            {[-26, -13, 0, 13, 26].map((x) => (
              <path key={x} d={d`M ${x} ${y - r * 0.62} L ${x} ${y - (Math.abs(x) > 20 ? r * 0.08 : 0)}`} />
            ))}
          </g>,
        );
        break;
      case 'exclaim': {
        const x = dir * r * 0.75;
        const yy = y - r - 34;
        out.push(
          <g key={f} transform={`rotate(${dir * 10} ${x} ${yy})`}>
            <path d={d`M ${x - 5} ${yy - 24} L ${x + 5} ${yy - 24} L ${x + 3} ${yy + 4} L ${x - 3} ${yy + 4} Z`} fill="#e5484d" stroke={INK} strokeWidth={2} strokeLinejoin="round" />
            <circle cx={x} cy={yy + 13} r={4.6} fill="#e5484d" stroke={INK} strokeWidth={2} />
          </g>,
        );
        break;
      }
      case 'question': {
        const x = dir * r * 0.75;
        const yy = y - r - 32;
        out.push(
          <g key={f} transform={`rotate(${dir * 12} ${x} ${yy})`}>
            <path d={d`M ${x - 10} ${yy - 12} C ${x - 10} ${yy - 28} ${x + 12} ${yy - 28} ${x + 12} ${yy - 12} C ${x + 12} ${yy - 2} ${x} ${yy - 3} ${x} ${yy + 6}`} stroke="#4566a6" strokeWidth={6} fill="none" strokeLinecap="round" />
            <circle cx={x} cy={yy + 17} r={4} fill="#4566a6" />
          </g>,
        );
        break;
      }
      case 'bulb': {
        const x = dir * r * 0.2;
        const yy = y - r - 46;
        out.push(
          <g key={f}>
            {[0, 1, 2, 3, 4, 5, 6].map((i) => {
              const a = Math.PI * (1 + i / 6);
              return <path key={i} d={d`M ${x + Math.cos(a) * 22} ${yy + Math.sin(a) * 22} L ${x + Math.cos(a) * 31} ${yy + Math.sin(a) * 31}`} stroke="#f2b600" strokeWidth={3} strokeLinecap="round" />;
            })}
            <circle cx={x} cy={yy} r={15} fill="#ffe066" stroke={INK} strokeWidth={2.4} />
            <rect x={x - 7} y={yy + 12} width={14} height={10} rx={2} fill="#b8b8b8" stroke={INK} strokeWidth={2} />
          </g>,
        );
        break;
      }
      case 'zzz':
        out.push(
          <g key={f} stroke="#4566a6" strokeWidth={3} fill="none" strokeLinejoin="round" strokeLinecap="round">
            {[0, 1, 2].map((i) => {
              const s = 5 + i * 2.5;
              const x = dir * (r * 0.55 + i * 14);
              const yy = y - r - 8 - i * 20;
              return <path key={i} d={d`M ${x - s} ${yy - s} L ${x + s} ${yy - s} L ${x - s} ${yy + s} L ${x + s} ${yy + s}`} />;
            })}
          </g>,
        );
        break;
      case 'music':
        out.push(
          <g key={f}>
            {[
              [dir * (r + 18), y - r * 0.7],
              [dir * (r + 40), y - r - 8],
            ].map(([x, yy], i) => (
              <g key={i}>
                <ellipse cx={x} cy={yy} rx={6} ry={4.5} transform={`rotate(-20 ${x} ${yy})`} fill={INK} />
                <path d={d`M ${x + 5} ${yy - 1} L ${x + 5} ${yy - 24} Q ${x + 15} ${yy - 18} ${x + 13} ${yy - 8}`} stroke={INK} strokeWidth={2.4} fill="none" />
              </g>
            ))}
          </g>,
        );
        break;
      case 'steam':
        out.push(
          <g key={f} fill="#ffffff" stroke={INK} strokeWidth={2}>
            {[-1, 1].map((sd) => (
              <g key={sd}>
                <circle cx={sd * r * 0.62} cy={y - r - 8} r={10} />
                <circle cx={sd * r * 0.86} cy={y - r - 22} r={8} />
                <circle cx={sd * r * 1.06} cy={y - r - 34} r={6} />
              </g>
            ))}
          </g>,
        );
        break;
      case 'cloud': {
        const yy = y - r - 52;
        const blobs: [number, number, number][] = [
          [-26, 4, 16],
          [-6, -6, 21],
          [18, 0, 17],
          [34, 7, 12],
        ];
        out.push(
          <g key={f}>
            {[1, 2, 3, 4].map((i) => (
              <path key={i} d={d`M ${-24 + i * 12} ${yy + 22} l -5 12`} stroke="#6aa6e8" strokeWidth={3} strokeLinecap="round" />
            ))}
            {blobs.map(([x, oy, rr], i) => (
              <circle key={`o${i}`} cx={x} cy={yy + oy} r={rr} fill="#7c8597" stroke={INK} strokeWidth={4.4} />
            ))}
            {blobs.map(([x, oy, rr], i) => (
              <circle key={`f${i}`} cx={x} cy={yy + oy} r={rr} fill="#7c8597" />
            ))}
          </g>,
        );
        break;
      }
      case 'tears':
        out.push(
          <g key={f} fill="#9fd8ff" stroke="#3b8ac4" strokeWidth={1.6}>
            {[-1, 1].map((sd) => {
              const x = sd * (r + 10);
              const yy = y - 2;
              return <path key={sd} d={d`M ${x} ${yy - 8} C ${x + 5} ${yy} ${x + 6} ${yy + 6} ${x} ${yy + 7} C ${x - 6} ${yy + 6} ${x - 5} ${yy} ${x} ${yy - 8} Z`} />;
            })}
          </g>,
        );
        break;
      default:
        break;
    }
  }
  return out;
}

export function Character({ a, layer = 'body' }: { a: Actor; layer?: 'behind' | 'body' }) {
  const g = geo(a.age);
  const L = lookOf(a);
  const [la, ra] = arms(a.pose, g);
  const dir = a.dir ?? 1;
  const H = hair(L.hair, L.hairColor, g);
  const sx = g.tw / 2 - 9;
  const sy = g.top + 15;
  const fx = [...(a.fx ?? [])];
  if (a.face === 'nervous' && !fx.includes('sweat')) fx.push('sweat');
  const base = `translate(${a.x} ${GROUND}) scale(${g.s})`;
  const flip = `${base} scale(${dir} 1)`;
  const armEl = (arm: Arm, sd: -1 | 1) => <ArmView key={sd} s={[sd * sx, sy]} arm={arm} color={L.top} />;
  const holding = a.pose === 'hold';
  const heldAt: Pt = holding ? [0, sy + 26] : [ra.h[0] * dir, ra.h[1]];
  if (layer === 'behind') {
    return (
      <g transform={base}>
        {behindFx(fx, g)}
        <ellipse cx={0} cy={-2} rx={g.tw * 0.62} ry={7} fill="#000000" opacity={0.12} />
      </g>
    );
  }
  return (
    <g>
      <g transform={flip}>
        {H.back}
        {!la.front && armEl(la, -1)}
        {!ra.front && armEl(ra, 1)}
        <Legs g={g} L={L} />
        <path d={torsoPath(g)} fill={L.top} stroke={INK} strokeWidth={3} strokeLinejoin="round" />
        <Collar g={g} L={L} />
        {H.ears && [-1, 1].map((sd) => <circle key={sd} cx={sd * (g.hr - 3)} cy={g.hy + 6} r={9} fill={SKIN} stroke={INK} strokeWidth={2.6} />)}
        <circle cx={0} cy={g.hy} r={g.hr} fill={SKIN} stroke={INK} strokeWidth={3} />
        <FaceView f={a.face} g={g} />
        {H.front}
        <BrowView f={a.face} g={g} />
        {L.glasses && <Glasses g={g} />}
      </g>
      {a.held && holding && (
        <g transform={base}>
          <HeldView kind={a.held} at={heldAt} />
        </g>
      )}
      <g transform={flip}>
        {la.front && armEl(la, -1)}
        {ra.front && armEl(ra, 1)}
      </g>
      {a.held && !holding && (
        <g transform={base}>
          <HeldView kind={a.held} at={heldAt} inHand />
        </g>
      )}
      <g transform={base}>{frontFx(fx, g, a.x < PW / 2 ? -1 : 1)}</g>
    </g>
  );
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

function Window({ x, y, w, h, sky, frame = WHITE, night = false }: { x: number; y: number; w: number; h: number; sky: string; frame?: string; night?: boolean }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} fill={sky} />
      <g>
        <clipPath id={`win-${x}-${y}-${night ? 'n' : 'd'}`}>
          <rect x={x} y={y} width={w} height={h} />
        </clipPath>
        <g clipPath={`url(#win-${x}-${y}-${night ? 'n' : 'd'})`}>
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

export function Background({ kind, tone = 'neutral' }: { kind: Bg; tone?: PanelTone }) {
  switch (kind) {
    case 'office':
    case 'officeNight': {
      const night = kind === 'officeNight';
      return (
        <g>
          <rect width={PW} height={PH} fill={night ? '#3a4566' : '#e8eef6'} />
          <Window x={40} y={70} w={210} h={160} sky={night ? '#18213f' : '#cfe7ff'} frame={night ? '#55618a' : WHITE} night={night} />
          <WallClock x={500} y={96} ring={night ? '#7b86a8' : '#9aa6b8'} />
          <Floor color={night ? '#2c3550' : '#cdd5e1'} line={night ? '#252d45' : '#b7c1d0'} />
          {!night && <Plant x={560} y={330} />}
          {night && <Glow id="glow-office" cx={300} cy={300} r={260} color="#ffe7a8" opacity={0.22} />}
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
          <Grad id="g-park" from="#bfe4ff" to="#eef8ff" />
          <rect width={PW} height={PH} fill="url(#g-park)" />
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
          <Grad id="g-city" from="#cfe9ff" to="#f3f9ff" />
          <rect width={PW} height={PH} fill="url(#g-city)" />
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
          <Grad id="g-night" from="#1b2550" to="#3d4b80" />
          <rect width={PW} height={PH} fill="url(#g-night)" />
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
          <Grad id="g-mtn" from="#ffd3a1" to="#fff2e2" />
          <rect width={PW} height={PH} fill="url(#g-mtn)" />
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
          <Grad id="g-dinner" from="#3d2f4f" to="#5c4567" />
          <rect width={PW} height={PH} fill="url(#g-dinner)" />
          <Window x={360} y={64} w={190} h={150} sky="#1b2246" frame="#7d6a8a" night />
          <Glow id="glow-sconce" cx={90} cy={130} r={90} color="#ffcf8a" opacity={0.45} />
          <path d="M 76 136 L 104 136 L 98 116 L 82 116 Z" fill="#f2c14e" />
          <Glow id="glow-dinner" cx={300} cy={320} r={300} color="#ffcf8a" opacity={0.22} />
          <Floor color="#4a3a46" line="#3c2e3a" />
        </g>
      );
    case 'crossroad':
      return (
        <g>
          <Grad id="g-cross" from="#c7e6ff" to="#f2f9ff" />
          <rect width={PW} height={PH} fill="url(#g-cross)" />
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
          <Grad id="g-rain" from="#93a0b4" to="#c9d0da" />
          <rect width={PW} height={PH} fill="url(#g-rain)" />
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
          <Grad id="g-sea" from="#a8dcff" to="#e6f6ff" />
          <rect width={PW} height={PH} fill="url(#g-sea)" />
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
          <Window x={60} y={70} w={200} h={140} sky="#d4efff" />
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
          <Glow id="glow-bed" cx={330} cy={240} r={120} color="#ffe7a8" opacity={0.4} />
          <Floor color="#d3c7b6" line="#c1b39f" />
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
          <Grad id="g-gloom" from="#4d5170" to="#868aa8" />
          <rect width={PW} height={PH} fill="url(#g-gloom)" />
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
          <Grad id="g-spark" from="#ffe1ec" to="#e3e6ff" x2={1} y2={1} />
          <rect width={PW} height={PH} fill="url(#g-spark)" />
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
export const FRONT_PROPS = new Set<PropSpec['kind']>(['desk', 'papers', 'laptop', 'coins', 'moneyBag', 'books', 'table', 'boxes', 'dumbbell']);
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
  }
}

// ---------------------------------------------------------------------------
// 내레이션 · 말풍선 · 스티커 · 근거
// ---------------------------------------------------------------------------
interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}
export interface BubbleBox extends Rect {
  lines: string[];
  kind: 'say' | 'think' | 'shout';
  tail: { bx: number; by: number; tx: number; ty: number; side: 'bottom' | 'left' | 'right' };
}
export interface PanelLayout {
  cap: (Rect & { lines: string[] }) | null;
  bubbles: BubbleBox[];
}

const CAP = { size: 20, lh: 27, px: 14, py: 10 };
const SAY = { size: 22, lh: 28, px: 17, py: 12, maxW: 230 };

function hit(a: Rect, b: Rect, gap = 8): boolean {
  return a.x < b.x + b.w + gap && b.x < a.x + a.w + gap && a.y < b.y + b.h + gap && b.y < a.y + a.h + gap;
}

export function layoutPanel(p: Panel): PanelLayout {
  const capMax = PW - 24 - (p.badge ? 130 : 0);
  const capLines = p.caption ? wrapBalanced(p.caption, CAP.size, capMax - CAP.px * 2, 2) : [];
  const cap = capLines.length
    ? { x: 12, y: 12, w: Math.min(capMax, widest(capLines, CAP.size) + CAP.px * 2), h: capLines.length * CAP.lh + CAP.py * 2, lines: capLines }
    : null;
  const zoneTop = cap ? cap.y + cap.h + 6 : 14;
  const heads = p.actors.map(headOf);
  const headRects: Rect[] = heads.map((h) => ({ x: h.x - h.r, y: h.bare + 8, w: h.r * 2, h: h.cy + h.r - h.bare - 8 }));
  const obstacles: Rect[] = [];
  if (cap) obstacles.push(cap);
  if (p.badge) obstacles.push({ x: PW - 150, y: 6, w: 144, h: 56 });
  const bubbles: BubbleBox[] = [];
  let prev: Rect | null = null;
  for (const ln of p.lines) {
    const head = heads[ln.by];
    if (!head) continue;
    const kind = ln.kind ?? 'say';
    const extra = kind === 'shout' ? 14 : kind === 'think' ? 8 : 0;
    const toward = head.x < PW / 2 ? 1 : -1;
    const before = prev;
    // 읽는 순서: 앞 말풍선보다 왼쪽에 놓이면 더 아래에 있어야 나중에 읽힌다
    const orderOk = (r: Rect) => !before || r.y >= before.y + (r.x + r.w / 2 < before.x + before.w / 2 - 10 ? 36 : 0);
    const free = (r: Rect) =>
      r.x >= 8 &&
      r.x + r.w <= PW - 8 &&
      r.y >= 8 &&
      r.y + r.h <= PH - 36 &&
      orderOk(r) &&
      !obstacles.some((o) => hit(r, o)) &&
      !headRects.some((o, i) => hit(r, o, i === ln.by ? 2 : 8));
    const place = (maxW: number) => {
      const lines = wrapBalanced(ln.text, SAY.size, maxW, 3);
      const w = Math.max(84, widest(lines, SAY.size) + SAY.px * 2 + extra * 2);
      const h = lines.length * SAY.lh + SAY.py * 2 + extra;
      const minY = Math.max(zoneTop, before ? before.y : zoneTop);
      const above = (limit: number): Rect | null => {
        for (let y = minY; y + h <= limit - 4; y += 4) {
          for (const dx of [toward * 20, 0, toward * 60, -toward * 30, toward * 100, -toward * 70, toward * 140]) {
            const cx = clamp(head.x + dx, w / 2 + 10, PW - w / 2 - 10);
            if (Math.abs(cx - head.x) > w / 2 + 50) continue;
            const r = { x: cx - w / 2, y, w, h };
            if (free(r)) return r;
          }
        }
        return null;
      };
      const beside = (): { r: Rect; side: 'left' | 'right' } | null => {
        for (let y = minY; y <= head.cy - 10; y += 4) {
          for (const sd of [toward, -toward]) {
            const r = { x: sd > 0 ? head.x + head.r + 16 : head.x - head.r - 16 - w, y, w, h };
            if (free(r)) return { r, side: sd > 0 ? 'left' : 'right' };
          }
        }
        return null;
      };
      const a = above(head.top);
      if (a) return { box: a, side: 'bottom' as const, lines };
      const b = beside();
      if (b) return { box: b.r, side: b.side, lines };
      const c = head.top < head.bare ? above(head.bare) : null;
      if (c) return { box: c, side: 'bottom' as const, lines };
      return null;
    };
    const placed =
      place(SAY.maxW) ??
      place(170) ??
      (() => {
        // 마지막 수단: 머리는 조금 가려도 내레이션·다른 말풍선과는 겹치지 않는 가장 가까운 빈자리
        const lines = wrapBalanced(ln.text, SAY.size, 170, 3);
        const w = Math.max(84, widest(lines, SAY.size) + SAY.px * 2 + extra * 2);
        const h = lines.length * SAY.lh + SAY.py * 2 + extra;
        let best: Rect = { x: clamp(head.x - w / 2, 10, PW - w - 10), y: zoneTop, w, h };
        let bestD = Infinity;
        for (let y = zoneTop; y + h <= PH - 36; y += 4) {
          for (let x = 10; x + w <= PW - 10; x += 10) {
            const r = { x, y, w, h };
            if (obstacles.some((o) => hit(r, o, 6))) continue;
            const dist = Math.hypot(x + w / 2 - head.x, y + h - head.bare) + (orderOk(r) ? 0 : 400);
            if (dist < bestD) {
              bestD = dist;
              best = r;
            }
          }
        }
        return { box: best, side: 'bottom' as const, lines };
      })();
    const { box, side, lines } = placed;
    obstacles.push(box);
    prev = box;
    let tail: BubbleBox['tail'];
    if (side === 'bottom') {
      const tx0 = head.x + (box.x + box.w / 2 < head.x ? -0.3 : 0.3) * head.r;
      const bx = clamp(tx0, box.x + 26, box.x + box.w - 26);
      const by = box.y + box.h;
      let tx = tx0;
      let ty = Math.max(head.bare + 6, by + 14);
      const len = Math.hypot(tx - bx, ty - by);
      if (len > 58) {
        tx = bx + ((tx - bx) * 58) / len;
        ty = by + ((ty - by) * 58) / len;
      }
      tail = { bx, by, tx, ty, side };
    } else {
      const tx = head.x + (side === 'left' ? 1 : -1) * head.r * 0.95;
      const ty = head.cy - head.r * 0.3;
      const bx = side === 'left' ? box.x : box.x + box.w;
      const by = clamp(ty, box.y + 18, box.y + box.h - 18);
      tail = { bx, by, tx, ty, side };
    }
    bubbles.push({ ...box, lines, kind, tail });
  }
  return { cap, bubbles };
}

function tailPath(t: BubbleBox['tail'], wide = 11): string {
  if (t.side === 'bottom') {
    return d`M ${t.bx - wide} ${t.by - 6} Q ${(t.bx + t.tx) / 2 - 2} ${(t.by + t.ty) / 2} ${t.tx} ${t.ty} Q ${(t.bx + t.tx) / 2 + 6} ${(t.by + t.ty) / 2} ${t.bx + wide} ${t.by - 6} Z`;
  }
  const sd = t.side === 'left' ? 1 : -1;
  return d`M ${t.bx + sd * 6} ${t.by - wide} Q ${(t.bx + t.tx) / 2} ${(t.by + t.ty) / 2 - 2} ${t.tx} ${t.ty} Q ${(t.bx + t.tx) / 2} ${(t.by + t.ty) / 2 + 6} ${t.bx + sd * 6} ${t.by + wide} Z`;
}

function shoutPath(b: Rect): string {
  const cx = b.x + b.w / 2;
  const cy = b.y + b.h / 2;
  const rx = b.w / 2 + 6;
  const ry = b.h / 2 + 8;
  const n = 22;
  let s = '';
  for (let i = 0; i < n * 2; i++) {
    const a = (i / (n * 2)) * Math.PI * 2;
    const k = i % 2 ? 0.86 : 1.06;
    s += `${i ? 'L' : 'M'} ${Math.round((cx + Math.cos(a) * rx * k) * 10) / 10} ${Math.round((cy + Math.sin(a) * ry * k) * 10) / 10} `;
  }
  return `${s}Z`;
}

function BubbleView({ b }: { b: BubbleBox }) {
  const textEl = (
    <text x={b.x + b.w / 2} y={b.y + SAY.py + SAY.size * 0.84 + (b.kind === 'shout' ? 7 : b.kind === 'think' ? 4 : 0)} fontSize={SAY.size} fontWeight={b.kind === 'shout' ? 800 : 650} textAnchor="middle" fill={b.kind === 'think' ? '#4a403a' : '#2b2522'}>
      {b.lines.map((l, i) => (
        <tspan key={i} x={b.x + b.w / 2} dy={i ? SAY.lh : 0}>
          {l}
        </tspan>
      ))}
    </text>
  );
  if (b.kind === 'think') {
    const bumps: [number, number, number][] = [];
    const step = 26;
    for (let x = b.x + 16; x <= b.x + b.w - 16; x += step) {
      bumps.push([x, b.y + 2, 15], [x, b.y + b.h - 2, 15]);
    }
    for (let y = b.y + 18; y <= b.y + b.h - 18; y += step) bumps.push([b.x + 2, y, 15], [b.x + b.w - 2, y, 15]);
    const t = b.tail;
    const dots: [number, number, number][] = [
      [t.bx + (t.tx - t.bx) * 0.45, t.by + (t.ty - t.by) * 0.45, 7],
      [t.bx + (t.tx - t.bx) * 0.85, t.by + (t.ty - t.by) * 0.85, 4.5],
    ];
    return (
      <g>
        {bumps.map(([x, y, r], i) => (
          <circle key={`o${i}`} cx={x} cy={y} r={r} fill={INK} stroke={INK} strokeWidth={5} />
        ))}
        <rect x={b.x} y={b.y} width={b.w} height={b.h} rx={22} fill={INK} stroke={INK} strokeWidth={5} />
        {bumps.map(([x, y, r], i) => (
          <circle key={`f${i}`} cx={x} cy={y} r={r} fill="#fbfaff" />
        ))}
        <rect x={b.x} y={b.y} width={b.w} height={b.h} rx={22} fill="#fbfaff" />
        {dots.map(([x, y, r], i) => (
          <circle key={`d${i}`} cx={x} cy={y} r={r} fill="#fbfaff" stroke={INK} strokeWidth={2.4} />
        ))}
        {textEl}
      </g>
    );
  }
  const shape = b.kind === 'shout' ? <path d={shoutPath(b)} /> : <rect x={b.x} y={b.y} width={b.w} height={b.h} rx={22} />;
  return (
    <g>
      <g fill={INK} stroke={INK} strokeWidth={5.5} strokeLinejoin="round">
        {shape}
        <path d={tailPath(b.tail)} />
      </g>
      <g fill={WHITE}>
        {shape}
        <path d={tailPath(b.tail)} />
      </g>
      {textEl}
    </g>
  );
}

function CaptionView({ cap }: { cap: Rect & { lines: string[] } }) {
  return (
    <g>
      <rect x={cap.x + 3} y={cap.y + 3} width={cap.w} height={cap.h} rx={6} fill="#000000" opacity={0.15} />
      <rect x={cap.x} y={cap.y} width={cap.w} height={cap.h} rx={6} fill="#1b2a49" />
      <text x={cap.x + CAP.px} y={cap.y + CAP.py + CAP.size * 0.84} fontSize={CAP.size} fontWeight={600} fill={WHITE}>
        {cap.lines.map((l, i) => (
          <tspan key={i} x={cap.x + CAP.px} dy={i ? CAP.lh : 0}>
            {l}
          </tspan>
        ))}
      </text>
    </g>
  );
}

function Badge({ text }: { text: string }) {
  const w = textWidth(text, 18) + 30;
  const x = PW - 16 - w;
  const y = 16;
  return (
    <g transform={`rotate(5 ${x + w / 2} ${y + 19})`}>
      <rect x={x + 3} y={y + 3} width={w} height={38} rx={10} fill="#000000" opacity={0.15} />
      <rect x={x} y={y} width={w} height={38} rx={10} fill="#ffd84d" stroke={INK} strokeWidth={2.6} />
      <text x={x + w / 2} y={y + 26} fontSize={18} fontWeight={800} textAnchor="middle" fill={INK}>
        {text}
      </text>
    </g>
  );
}

function BasisTag({ text }: { text: string }) {
  const lines = wrap(`근거 · ${text}`, 13, PW - 60, 1);
  const w = widest(lines, 13) + 18;
  return (
    <g>
      <rect x={10} y={PH - 32} width={w} height={22} rx={11} fill={WHITE} opacity={0.9} stroke="#d6d3d1" strokeWidth={1} />
      <text x={19} y={PH - 16.5} fontSize={13} fontWeight={500} fill="#57534e">
        {lines[0]}
      </text>
    </g>
  );
}

/** 한 컷 — 화면에도, PNG 저장에도 그대로 쓰는 독립 SVG */
export function PanelArt({ p, label }: { p: Panel; label?: string }) {
  const L = layoutPanel(p);
  const props = p.props ?? [];
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${PW} ${PH}`}
      width={PW}
      height={PH}
      role="img"
      data-panel=""
      aria-label={label ?? [p.caption, ...p.lines.map((l) => l.text)].join(' / ')}
      fontFamily={FONT}
      style={{ display: 'block', width: '100%', height: 'auto' }}
    >
      <Background kind={p.bg} tone={p.tone} />
      {props
        .filter((x) => !FRONT_PROPS.has(x.kind))
        .map((x, i) => (
          <SceneProp key={`b${i}`} p={x} />
        ))}
      {p.actors.map((a, i) => (
        <Character key={`s${i}`} a={a} layer="behind" />
      ))}
      {p.actors.map((a, i) => (
        <Character key={i} a={a} />
      ))}
      {props
        .filter((x) => FRONT_PROPS.has(x.kind))
        .map((x, i) => (
          <SceneProp key={`f${i}`} p={x} />
        ))}
      {L.cap && <CaptionView cap={L.cap} />}
      {L.bubbles.map((b, i) => (
        <BubbleView key={i} b={b} />
      ))}
      {p.badge && <Badge text={p.badge} />}
      <BasisTag text={p.basis} />
      <rect x={1.5} y={1.5} width={PW - 3} height={PH - 3} fill="none" stroke={INK} strokeWidth={3} />
    </svg>
  );
}
