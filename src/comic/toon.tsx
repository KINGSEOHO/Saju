/**
 * 개그 웹툰 캐릭터 — 큰 감자형 머리, 점 눈, 굵은 선. 외부 이미지 없이 SVG로만 그린다.
 *
 * 좌표: 인물의 발 가운데가 (0,0), 위쪽이 -y. 오른쪽(+x)을 보고 서 있다고 놓고 그린 뒤
 * 컷에서 dir = -1이면 좌우를 뒤집는다. 글자가 들어가는 것(이름표·효과 글자)은 뒤집히지 않게 컷 좌표에서 따로 쓴다.
 */
import type { ReactNode } from 'react';
import type { Element } from '../engine/index.ts';
import { d, darken, heartPath, lighten, starPath, type Pt } from './draw.ts';
import type { Acc, Actor, Age, Face, Held, MonsterKind, Sym, Wear } from './types.ts';

export const INK = '#1f1b1a';
export const PAPER = '#fffdf7';
const SKIN = '#ffe2c6';
const PANTS = '#4b5066';
const SHOE = '#2f2a28';
const BLUSH = '#ff9aa8';
const TEAR = '#8fd3ff';

/** 주인공 옷 색 = 일간 오행 */
export const EL_COLOR: Record<Element, string> = { wood: '#7cc68d', fire: '#f2836b', earth: '#f0c25e', metal: '#b9c4da', water: '#6aa1e6' };

// ---------------------------------------------------------------------------
// 몸 치수와 자세(골격)
// ---------------------------------------------------------------------------
export interface Dims {
  rx: number;
  ry: number;
  torso: number;
  topW: number;
  botW: number;
  leg: number;
  arm: number;
  limb: number;
}

const DIMS: Record<Age, Dims> = {
  kid: { rx: 44, ry: 46, torso: 40, topW: 42, botW: 48, leg: 24, arm: 36, limb: 11 },
  teen: { rx: 45, ry: 49, torso: 54, topW: 50, botW: 58, leg: 35, arm: 46, limb: 11.5 },
  adult: { rx: 46, ry: 50, torso: 60, topW: 54, botW: 64, leg: 40, arm: 50, limb: 12 },
  senior: { rx: 46, ry: 50, torso: 58, topW: 54, botW: 64, leg: 37, arm: 48, limb: 12 },
};

export function dimsOf(a: Pick<Actor, 'age' | 'role'>): Dims {
  return DIMS[a.age ?? (a.role === 'child' ? 'kid' : a.role === 'elder' ? 'senior' : 'adult')];
}

export interface Rig {
  hip: Pt;
  neck: Pt;
  /** 몸통 기울기 (도, +는 앞으로) */
  lean: number;
  head: Pt;
  /** 머리 기울기 (도) */
  tilt: number;
  shL: Pt;
  shR: Pt;
  hL: Pt;
  hR: Pt;
  eL?: Pt;
  eR?: Pt;
  fL: Pt;
  fR: Pt;
  kL?: Pt;
  kR?: Pt;
  /** 엎어져서 뒤통수만 보인다 */
  back?: boolean;
  crossed?: boolean;
  /** 앞손이 가리키는 손가락 */
  pointR?: boolean;
  /** 앞손을 얼굴 앞에 (얼굴 위에 그린다) */
  handOnFace?: boolean;
  /** 든 물건의 자리 */
  item: Pt;
  /** 물건을 머리 위로 */
  overhead?: boolean;
}

const rot = ([x, y]: Pt, deg: number): Pt => {
  const r = (deg * Math.PI) / 180;
  return [x * Math.cos(r) - y * Math.sin(r), x * Math.sin(r) + y * Math.cos(r)];
};
const add = (a: Pt, b: Pt): Pt => [a[0] + b[0], a[1] + b[1]];

/** 서 있는 몸의 기본 골격 */
function upright(D: Dims, lean = 0, tilt = 0): Pick<Rig, 'hip' | 'neck' | 'lean' | 'head' | 'tilt' | 'shL' | 'shR'> {
  const hip: Pt = [0, -D.leg];
  // lean > 0 이면 앞(+x)으로 숙인다: (0,-torso)를 시계 방향으로 돌린다
  const neck = add(hip, rot([0, -D.torso], lean));
  const head = add(neck, rot([0, -(D.ry - 10)], lean * 0.7));
  const shR = add(neck, rot([D.topW / 2 - 5, 9], lean));
  const shL = add(neck, rot([-(D.topW / 2 - 5), 9], lean));
  return { hip, neck, lean, head, tilt, shL, shR };
}

export function rigOf(a: Pick<Actor, 'pose' | 'age' | 'role' | 'held'>): Rig {
  const D = dimsOf(a);
  const lean0 = (a.age ?? 'adult') === 'senior' ? 4 : 0;
  const feet = { fL: [-13, 0] as Pt, fR: [13, 0] as Pt };
  const hang = (u: ReturnType<typeof upright>) => ({ hL: add(u.shL, [-7, D.arm * 0.86]) as Pt, hR: add(u.shR, [7, D.arm * 0.86]) as Pt });
  const chest = (u: ReturnType<typeof upright>, dx = 0): Pt => [D.topW * 0.36 + dx, u.neck[1] + D.torso * 0.42];
  switch (a.pose) {
    case 'wave': {
      const u = upright(D, lean0, -4);
      return { ...u, ...feet, hL: hang(u).hL, hR: add(u.head, [D.rx + 12, -D.ry * 0.35]), eR: add(u.shR, [D.arm * 0.62, -D.arm * 0.08]), item: add(u.head, [D.rx + 14, -D.ry * 0.5]) };
    }
    case 'cheer': {
      const u = upright(D, lean0, -6);
      const hy = u.head[1] - D.ry * 0.15;
      return { ...u, ...feet, hL: [-(D.rx + 16), hy], hR: [D.rx + 16, hy], eL: add(u.shL, [-D.arm * 0.5, -D.arm * 0.15]), eR: add(u.shR, [D.arm * 0.5, -D.arm * 0.15]), item: [D.rx + 20, hy - 10] };
    }
    case 'point': {
      const u = upright(D, lean0 + 3);
      const hR = add(u.shR, [D.arm * 0.96, -8]);
      return { ...u, ...feet, hL: hang(u).hL, hR, pointR: true, item: hR };
    }
    case 'hold': {
      const u = upright(D, lean0);
      const hR = chest(u, 8);
      const hL: Pt = [D.topW * 0.08, u.neck[1] + D.torso * 0.46];
      return { ...u, ...feet, hR, hL, item: [hR[0] - 2, hR[1] - 14] };
    }
    case 'think': {
      const u = upright(D, lean0, 6);
      const hR = add(u.head, [D.rx * 0.42, D.ry * 0.86]);
      return { ...u, ...feet, hR, hL: [D.topW * 0.28, u.neck[1] + D.torso * 0.56], eR: add(u.shR, [D.arm * 0.34, D.arm * 0.5]), item: hR };
    }
    case 'cross': {
      const u = upright(D, lean0, -3);
      return { ...u, ...feet, hL: chest(u), hR: chest(u), crossed: true, item: chest(u) };
    }
    case 'shrug': {
      const u = upright(D, lean0, 9);
      return { ...u, ...feet, hL: add(u.shL, [-D.arm * 0.76, -6]), hR: add(u.shR, [D.arm * 0.76, -6]), eL: add(u.shL, [-D.arm * 0.42, D.arm * 0.34]), eR: add(u.shR, [D.arm * 0.42, D.arm * 0.34]), item: add(u.shR, [D.arm * 0.8, -12]) };
    }
    case 'facepalm': {
      const u = upright(D, lean0 + 4, 12);
      const hR = add(u.head, [D.rx * 0.3, D.ry * 0.08]);
      return { ...u, ...feet, hL: hang(u).hL, hR, handOnFace: true, eR: add(u.shR, [D.arm * 0.5, D.arm * 0.3]), item: hR };
    }
    case 'fist': {
      const u = upright(D, lean0, -4);
      return { ...u, ...feet, hR: add(u.shR, [18, -D.arm * 0.8]), hL: chest(u, -10), item: add(u.shR, [18, -D.arm * 0.9]) };
    }
    case 'hips': {
      const u = upright(D, lean0, -5);
      return {
        ...u,
        ...feet,
        hL: [-(D.botW / 2 + 2), u.hip[1] - 8],
        hR: [D.botW / 2 + 2, u.hip[1] - 8],
        eL: add(u.shL, [-D.arm * 0.58, D.arm * 0.36]),
        eR: add(u.shR, [D.arm * 0.58, D.arm * 0.36]),
        item: [D.botW / 2 + 8, u.hip[1] - 14],
      };
    }
    case 'run': {
      const u = upright(D, 14, -4);
      return {
        ...u,
        hR: add(u.shR, [D.arm * 0.72, D.arm * 0.28]),
        hL: add(u.shL, [-D.arm * 0.62, D.arm * 0.5]),
        kR: [18, -D.leg * 0.5],
        fR: [32, -2],
        kL: [-12, -D.leg * 0.42],
        fL: [-36, -16],
        item: add(u.shR, [D.arm * 0.8, D.arm * 0.2]),
      };
    }
    case 'jump': {
      const u0 = upright(D, lean0, -8);
      const up = D.leg * 0.9;
      const lift = (p: Pt): Pt => [p[0], p[1] - up];
      const u = { ...u0, hip: lift(u0.hip), neck: lift(u0.neck), head: lift(u0.head), shL: lift(u0.shL), shR: lift(u0.shR) };
      return {
        ...u,
        hL: add(u.shL, [-24, -D.arm * 0.9]),
        hR: add(u.shR, [24, -D.arm * 0.9]),
        kR: [16, u.hip[1] + D.leg * 0.52],
        fR: [8, u.hip[1] + D.leg * 0.95],
        kL: [-14, u.hip[1] + D.leg * 0.55],
        fL: [-24, u.hip[1] + D.leg * 0.92],
        item: add(u.shR, [24, -D.arm]),
      };
    }
    case 'otl': {
      const knee: Pt = [-D.leg * 0.55, -3];
      const hip: Pt = [-D.leg * 0.55, -D.leg * 1.1];
      const neck: Pt = [hip[0] + D.torso * 0.98, hip[1] - 2];
      const head: Pt = [neck[0] + D.rx * 0.82, -D.ry * 0.92];
      const shR: Pt = add(neck, [-4, 8]);
      const shL: Pt = add(neck, [-14, 6]);
      return {
        hip,
        neck,
        lean: 88,
        head,
        tilt: 34,
        shL,
        shR,
        hR: [neck[0] + 6, -3],
        hL: [neck[0] - 12, -3],
        kR: knee,
        kL: [knee[0] - 8, -3],
        fR: [hip[0] - D.leg * 1.05, -5],
        fL: [hip[0] - D.leg * 1.1, -4],
        item: [neck[0] + 30, -8],
      };
    }
    case 'lie':
    case 'flat': {
      const y = -D.botW * 0.42;
      const hip: Pt = [-D.leg * 0.6, y];
      const neck: Pt = [hip[0] + D.torso, y];
      const head: Pt = [neck[0] + D.ry * 0.82, -D.rx * 0.96];
      const back = a.pose === 'lie';
      return {
        hip,
        neck,
        lean: 90,
        head,
        tilt: back ? 90 : -90,
        shL: add(neck, [-6, -6]),
        shR: add(neck, [-6, 6]),
        hL: back ? [head[0] + D.rx * 0.2, -10] : [neck[0] - 4, -D.botW * 0.9],
        hR: back ? [hip[0] + 10, -6] : [neck[0] + 4, -6],
        fL: [hip[0] - D.leg - 8, -10],
        fR: [hip[0] - D.leg - 4, -6],
        kL: [hip[0] - D.leg * 0.5, -10],
        kR: [hip[0] - D.leg * 0.5, -6],
        back,
        item: [neck[0] - 10, -D.botW - 10],
      };
    }
    case 'sit': {
      const hip: Pt = [-4, -D.leg * 1.0];
      const u0 = upright(D, lean0);
      const dy = hip[1] - u0.hip[1];
      const sh = (p: Pt): Pt => [p[0] - 4, p[1] + dy];
      const u = { ...u0, hip, neck: sh(u0.neck), head: sh(u0.head), shL: sh(u0.shL), shR: sh(u0.shR) };
      const held = !!a.held;
      return {
        ...u,
        kR: [D.leg * 0.78, hip[1] + 2],
        fR: [D.leg * 0.86, 0],
        kL: [D.leg * 0.66, hip[1] + 4],
        fL: [D.leg * 0.7, 0],
        hR: held ? chest(u, 6) : [D.leg * 0.62, hip[1] - 6],
        hL: held ? [D.topW * 0.06, u.neck[1] + D.torso * 0.46] : [D.leg * 0.4, hip[1] - 4],
        item: held ? [D.topW * 0.42 + 6, u.neck[1] + D.torso * 0.36] : [D.leg * 0.7, hip[1] - 16],
      };
    }
    case 'bow': {
      const u = upright(D, 72, 70);
      return { ...u, ...feet, hR: [u.hip[0] + 14, u.hip[1] + D.leg * 0.42], hL: [u.hip[0] + 4, u.hip[1] + D.leg * 0.46], item: [u.hip[0] + 20, u.hip[1]] };
    }
    case 'beg': {
      const hip: Pt = [-2, -D.leg * 0.95];
      const u0 = upright(D, 4, -10);
      const dy = hip[1] - u0.hip[1];
      const sh = (p: Pt): Pt => [p[0] - 2, p[1] + dy];
      const u = { ...u0, hip, neck: sh(u0.neck), head: sh(u0.head), shL: sh(u0.shL), shR: sh(u0.shR) };
      const hR: Pt = [D.topW * 0.46, u.neck[1] + D.torso * 0.32];
      return { ...u, hR, hL: [D.topW * 0.34, u.neck[1] + D.torso * 0.36], kR: [12, -3], kL: [4, -3], fR: [-D.leg * 0.9, -4], fL: [-D.leg * 0.95, -3], item: add(hR, [6, -8]) };
    }
    case 'lift': {
      const u = upright(D, lean0, -2);
      const top = u.head[1] - D.ry - 6;
      return { ...u, ...feet, hR: [D.rx * 0.62, top], hL: [-D.rx * 0.62, top], eR: add(u.shR, [D.arm * 0.45, -D.arm * 0.28]), eL: add(u.shL, [-D.arm * 0.45, -D.arm * 0.28]), overhead: true, item: [0, top - 8] };
    }
    case 'phone': {
      const u = upright(D, lean0 + 2, 14);
      const hR = add(u.head, [D.rx * 0.62, D.ry * 0.9]);
      return { ...u, ...feet, hL: hang(u).hL, hR, eR: add(u.shR, [D.arm * 0.38, D.arm * 0.46]), item: add(hR, [6, -10]) };
    }
    case 'stand':
    default: {
      const u = upright(D, lean0);
      return { ...u, ...feet, ...hang(u), item: add(hang(u).hR, [8, -6]) };
    }
  }
}

// ---------------------------------------------------------------------------
// 생김새 — 역할별 머리 모양·옷
// ---------------------------------------------------------------------------
type Hair = 'short' | 'bob' | 'pony' | 'spiky' | 'long' | 'wavy' | 'bald3' | 'perm' | 'part' | 'bun' | 'pigtails' | 'bob2';

interface Look {
  hair: Hair;
  hairColor: string;
  outfit: string;
  wear: Wear;
  acc: Acc[];
  mustache?: boolean;
  skirt?: boolean;
}

function lookOf(a: Actor): Look {
  const f = a.gender === 'female';
  const senior = a.age === 'senior';
  const kid = a.age === 'kid';
  const gray = '#bdb7b0';
  const base = (l: Look): Look => ({ ...l, outfit: a.outfit ?? l.outfit, wear: a.wear ?? l.wear, acc: [...l.acc, ...(a.acc ?? [])] });
  switch (a.role) {
    case 'me':
      return base({
        hair: f ? (kid ? 'pigtails' : senior ? 'perm' : 'bob') : senior ? 'part' : 'short',
        hairColor: senior ? gray : '#2b2522',
        outfit: '#f2836b',
        wear: 'tee',
        acc: senior ? ['glasses'] : [],
        skirt: f && (a.wear === 'uniform' || (kid && !a.wear)),
      });
    case 'friend':
      return base({ hair: f ? 'pony' : 'spiky', hairColor: senior ? gray : '#7a5136', outfit: f ? '#f5a3c0' : '#7fcfc4', wear: 'tee', acc: senior ? ['glasses'] : [], skirt: f && a.wear === 'uniform' });
    case 'partner':
      return base({ hair: f ? 'long' : 'wavy', hairColor: '#4a3426', outfit: '#b9a3f0', wear: f ? 'cardigan' : 'shirt', acc: [] });
    case 'boss':
      return f
        ? base({ hair: 'bun', hairColor: '#3a3230', outfit: '#6f7687', wear: 'suit', acc: ['glasses'] })
        : base({ hair: 'bald3', hairColor: '#6b6460', outfit: '#6f7687', wear: 'suit', acc: [], mustache: true });
    case 'coworker':
      return base({ hair: f ? 'bob2' : 'part', hairColor: '#3a2f2a', outfit: '#8fd1c8', wear: 'shirt', acc: f ? [] : ['glasses'] });
    case 'parent':
      return f ? base({ hair: 'perm', hairColor: '#7a4b35', outfit: '#f4a46b', wear: 'apron', acc: [] }) : base({ hair: 'part', hairColor: '#3a3230', outfit: '#9db0d6', wear: 'cardigan', acc: [], mustache: true });
    case 'teacher':
      return f ? base({ hair: 'bun', hairColor: '#4a3a30', outfit: '#c9a7e8', wear: 'cardigan', acc: ['glasses'] }) : base({ hair: 'part', hairColor: '#2f2a28', outfit: '#8a9bb8', wear: 'suit', acc: ['glasses'] });
    case 'child':
      return base({ hair: f ? 'pigtails' : 'spiky', hairColor: '#4a3426', outfit: '#ffd166', wear: 'tee', acc: [] });
    case 'elder':
      return base({ hair: f ? 'perm' : 'part', hairColor: gray, outfit: '#c6b49a', wear: 'cardigan', acc: ['glasses'] });
    default:
      return base({ hair: 'short', hairColor: '#2b2522', outfit: '#cccccc', wear: 'tee', acc: [] });
  }
}

// ---------------------------------------------------------------------------
// 그리기 도구
// ---------------------------------------------------------------------------
interface Pen {
  /** 굵은 외곽선 */
  w: number;
  /** 가는 선 */
  t: number;
  /** 얼굴 선 */
  f: number;
  /** 극화체 */
  drama: boolean;
}

/** 굵은 외곽선이 있는 띠(팔·다리) — 검은 굵은 선 위에 색 선 */
function Limb({ dPath, color, width, pen }: { dPath: string; color: string; width: number; pen: Pen }) {
  return (
    <g fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d={dPath} stroke={INK} strokeWidth={width + pen.w * 2} />
      <path d={dPath} stroke={color} strokeWidth={width} />
    </g>
  );
}

function curveThrough(s: Pt, e: Pt, h: Pt): string {
  // e를 지나는 2차 곡선의 조절점
  const c: Pt = [2 * e[0] - (s[0] + h[0]) / 2, 2 * e[1] - (s[1] + h[1]) / 2];
  return d`M ${s[0]} ${s[1]} Q ${c[0]} ${c[1]} ${h[0]} ${h[1]}`;
}

function autoElbow(s: Pt, h: Pt, out: 1 | -1, len: number): Pt {
  const mx = (s[0] + h[0]) / 2;
  const my = (s[1] + h[1]) / 2;
  const dx = h[0] - s[0];
  const dy = h[1] - s[1];
  const dist = Math.hypot(dx, dy) || 1;
  const slack = Math.max(0, len - dist) * 0.5 + 3;
  // 수직 방향 (바깥쪽·아래쪽으로)
  let px = -dy / dist;
  let py = dx / dist;
  if (px * out < 0 || (Math.abs(px) < 0.2 && py < 0)) {
    px = -px;
    py = -py;
  }
  return [mx + px * slack, my + py * slack];
}

// ---------------------------------------------------------------------------
// 몸
// ---------------------------------------------------------------------------
function torsoPath(D: Dims): string {
  const t = -D.torso;
  const tw = D.topW / 2;
  const bw = D.botW / 2;
  return d`M ${-bw} ${0} L ${-tw - 2} ${t + 16} Q ${-tw} ${t} ${-tw + 14} ${t} L ${tw - 14} ${t} Q ${tw} ${t} ${tw + 2} ${t + 16} L ${bw} ${0} Q ${bw} ${6} ${bw - 8} ${6} L ${-bw + 8} ${6} Q ${-bw} ${6} ${-bw} ${0} Z`;
}

function WearDetail({ wear, D, color, pen, female }: { wear: Wear; D: Dims; color: string; pen: Pen; female: boolean }) {
  const t = -D.torso;
  const dark = darken(color, 0.22);
  const s = { stroke: INK, strokeWidth: pen.t, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  switch (wear) {
    case 'tee':
      return <path d={d`M ${-10} ${t + 1} Q ${0} ${t + 9} ${10} ${t + 1}`} fill="none" {...s} />;
    case 'shirt':
      return (
        <g>
          <path d={d`M ${-12} ${t} L ${0} ${t + 12} L ${12} ${t} L ${8} ${t + 2} L ${0} ${t + 8} L ${-8} ${t + 2} Z`} fill="#ffffff" {...s} />
          {[0.38, 0.6, 0.82].map((k) => (
            <circle key={k} cx={0} cy={t + D.torso * k} r={1.8} fill={INK} />
          ))}
        </g>
      );
    case 'suit':
      return (
        <g>
          <path d={d`M ${-13} ${t} L ${0} ${t + 22} L ${13} ${t} Z`} fill="#ffffff" {...s} />
          <path d={d`M ${0} ${t + 5} L ${-4} ${t + 9} L ${-2} ${t + 26} L ${0} ${t + 30} L ${2} ${t + 26} L ${4} ${t + 9} Z`} fill={female ? '#7a3b4f' : '#c0392b'} {...s} />
          <path d={d`M ${-13} ${t} L ${-4} ${t + 30} M ${13} ${t} L ${4} ${t + 30}`} fill="none" {...s} />
        </g>
      );
    case 'hoodie':
      return (
        <g>
          <path d={d`M ${-18} ${t + 2} Q ${0} ${t + 18} ${18} ${t + 2}`} fill={dark} {...s} />
          <path d={d`M ${-5} ${t + 10} L ${-6} ${t + 24} M ${5} ${t + 10} L ${6} ${t + 24}`} fill="none" {...s} />
          <path d={d`M ${-16} ${-14} L ${16} ${-14} L ${12} ${-4} L ${-12} ${-4} Z`} fill={dark} {...s} />
        </g>
      );
    case 'coat':
      return (
        <g>
          <path d={d`M ${-D.topW / 2 + 2} ${t + 4} L ${-6} ${t + 2} L ${-3} ${4} L ${-D.botW / 2 + 2} ${4} Z M ${D.topW / 2 - 2} ${t + 4} L ${6} ${t + 2} L ${3} ${4} L ${D.botW / 2 - 2} ${4} Z`} fill="#ffffff" {...s} />
          <path d={d`M ${-6} ${t + 2} L ${0} ${t + 14} L ${6} ${t + 2}`} fill="none" {...s} />
          <path d={d`M ${D.topW / 2 - 14} ${t + 20} l ${8} ${0}`} stroke="#3b82f6" strokeWidth={pen.t * 1.1} />
        </g>
      );
    case 'apron':
      return (
        <g>
          <path d={d`M ${-14} ${t + 8} L ${14} ${t + 8} L ${18} ${2} L ${-18} ${2} Z`} fill="#fff4ec" {...s} />
          <path d={d`M ${-14} ${t + 8} L ${-10} ${t} M ${14} ${t + 8} L ${10} ${t}`} fill="none" {...s} />
          <path d={d`M ${-8} ${-18} L ${8} ${-18} L ${8} ${-8} L ${-8} ${-8} Z`} fill="none" {...s} />
        </g>
      );
    case 'uniform':
      return (
        <g>
          <path d={d`M ${-12} ${t} L ${0} ${t + 16} L ${12} ${t} Z`} fill="#ffffff" {...s} />
          {female ? (
            <path d={d`M ${-7} ${t + 12} L ${0} ${t + 16} L ${7} ${t + 12} L ${4} ${t + 22} L ${0} ${t + 18} L ${-4} ${t + 22} Z`} fill="#e04f5f" {...s} />
          ) : (
            <path d={d`M ${0} ${t + 6} L ${-3} ${t + 10} L ${0} ${t + 28} L ${3} ${t + 10} Z`} fill="#2d5aa8" {...s} />
          )}
          <path d={d`M ${-D.topW / 2 + 8} ${t + 26} l ${10} ${0}`} stroke="#f0c25e" strokeWidth={pen.t * 1.4} />
        </g>
      );
    case 'pajama':
      return (
        <g>
          {[-14, 0, 14].map((x) => (
            <path key={x} d={d`M ${x} ${t + 6} L ${x * 1.08} ${2}`} stroke="#ffffff" strokeWidth={pen.t * 1.6} opacity={0.7} />
          ))}
          <path d={d`M ${-10} ${t + 1} Q ${0} ${t + 9} ${10} ${t + 1}`} fill="none" {...s} />
        </g>
      );
    case 'cardigan':
      return (
        <g>
          <path d={d`M ${-11} ${t} L ${0} ${t + 26} L ${11} ${t} Z`} fill="#ffffff" {...s} />
          <path d={d`M ${0} ${t + 26} L ${0} ${4}`} fill="none" {...s} />
          {[0.56, 0.74, 0.9].map((k) => (
            <circle key={k} cx={-4} cy={t + D.torso * k} r={2} fill={INK} />
          ))}
        </g>
      );
    case 'armor':
      return (
        <g>
          <path d={d`M ${-D.topW / 2 + 4} ${t + 18} L ${D.topW / 2 - 4} ${t + 18} M ${-D.botW / 2 + 6} ${-18} L ${D.botW / 2 - 6} ${-18}`} fill="none" {...s} />
          {[-16, 16].map((x) => (
            <circle key={x} cx={x} cy={t + 10} r={2.2} fill={INK} />
          ))}
          <path d={d`M ${-8} ${t + 26} L ${8} ${t + 26} L ${0} ${t + 40} Z`} fill="#ffffff" opacity={0.6} />
        </g>
      );
  }
}

function hand(p: Pt, pen: Pen, r: number, fill = SKIN, key?: string) {
  return <circle key={key} cx={p[0]} cy={p[1]} r={r} fill={fill} stroke={INK} strokeWidth={pen.w * 0.85} />;
}

// ---------------------------------------------------------------------------
// 머리 — 모양·머리카락·얼굴
// ---------------------------------------------------------------------------
export function headPath(rx: number, ry: number): string {
  // 아래가 살짝 넓은 감자형
  return d`M ${0} ${-ry} C ${rx * 0.6} ${-ry} ${rx} ${-ry * 0.58} ${rx} ${-ry * 0.06} C ${rx * 1.02} ${ry * 0.52} ${rx * 0.62} ${ry} ${0} ${ry} C ${-rx * 0.62} ${ry} ${-rx * 1.02} ${ry * 0.52} ${-rx} ${-ry * 0.06} C ${-rx} ${-ry * 0.58} ${-rx * 0.6} ${-ry} ${0} ${-ry} Z`;
}

/** 머리카락 — 뒤(얼굴보다 먼저 그리는 부분) */
function HairBack({ hair, D, color, pen }: { hair: Hair; D: Dims; color: string; pen: Pen }) {
  const { rx, ry } = D;
  const st = { fill: color, stroke: INK, strokeWidth: pen.w, strokeLinejoin: 'round' as const };
  switch (hair) {
    case 'bob':
      return <path d={d`M ${-rx * 1.1} ${-ry * 0.2} C ${-rx * 1.2} ${-ry * 1.2} ${rx * 1.2} ${-ry * 1.2} ${rx * 1.1} ${-ry * 0.2} L ${rx * 1.08} ${ry * 0.6} Q ${rx * 0.9} ${ry * 0.72} ${rx * 0.7} ${ry * 0.6} L ${-rx * 0.7} ${ry * 0.6} Q ${-rx * 0.9} ${ry * 0.72} ${-rx * 1.08} ${ry * 0.6} Z`} {...st} />;
    case 'bob2':
      return <path d={d`M ${-rx * 1.08} ${-ry * 0.2} C ${-rx * 1.16} ${-ry * 1.16} ${rx * 1.16} ${-ry * 1.16} ${rx * 1.08} ${-ry * 0.2} L ${rx * 1.02} ${ry * 0.3} L ${-rx * 1.02} ${ry * 0.3} Z`} {...st} />;
    case 'long':
      return <path d={d`M ${-rx * 1.1} ${-ry * 0.3} C ${-rx * 1.2} ${-ry * 1.2} ${rx * 1.2} ${-ry * 1.2} ${rx * 1.1} ${-ry * 0.3} L ${rx * 1.18} ${ry * 1.7} Q ${0} ${ry * 1.9} ${-rx * 1.18} ${ry * 1.7} Z`} {...st} />;
    case 'pony':
      return (
        <g>
          <path d={d`M ${-rx * 0.8} ${-ry * 0.5} C ${-rx * 1.7} ${-ry * 0.6} ${-rx * 1.6} ${ry * 0.6} ${-rx * 1.3} ${ry * 0.9} C ${-rx * 1.15} ${ry * 0.4} ${-rx * 1.05} ${-ry * 0.1} ${-rx * 0.8} ${-ry * 0.5} Z`} {...st} />
          <circle cx={-rx * 0.86} cy={-ry * 0.48} r={5} fill="#ff6b8a" stroke={INK} strokeWidth={pen.t} />
        </g>
      );
    case 'pigtails':
      return (
        <g>
          {[-1, 1].map((s) => (
            <path key={s} d={d`M ${s * rx * 0.85} ${-ry * 0.3} C ${s * rx * 1.6} ${-ry * 0.3} ${s * rx * 1.7} ${ry * 0.4} ${s * rx * 1.35} ${ry * 0.6} C ${s * rx * 1.2} ${ry * 0.2} ${s * rx * 1.0} ${-ry * 0.05} ${s * rx * 0.85} ${-ry * 0.3} Z`} {...st} />
          ))}
        </g>
      );
    case 'bun':
      return <circle cx={-rx * 0.15} cy={-ry * 1.02} r={ry * 0.32} {...st} />;
    case 'perm': {
      const pts: [number, number, number][] = [
        [-rx * 0.95, -ry * 0.1, 0.34],
        [-rx * 1.0, ry * 0.32, 0.3],
        [rx * 0.95, -ry * 0.1, 0.34],
        [rx * 1.0, ry * 0.32, 0.3],
      ];
      return (
        <g>
          {pts.map(([x, y, r], i) => (
            <circle key={i} cx={x} cy={y} r={ry * r} {...st} />
          ))}
        </g>
      );
    }
    default:
      return null;
  }
}

/** 머리카락 — 앞(얼굴 위에 덮이는 부분) */
function HairFront({ hair, D, color, pen, sym }: { hair: Hair; D: Dims; color: string; pen: Pen; sym: boolean }) {
  const { rx, ry } = D;
  const st = { fill: color, stroke: INK, strokeWidth: pen.w, strokeLinejoin: 'round' as const };
  const cap = (fringe: number) => d`M ${-rx * 1.02} ${-ry * 0.02} C ${-rx * 1.06} ${-ry * 0.9} ${-rx * 0.5} ${-ry * 1.08} ${0} ${-ry * 1.08} C ${rx * 0.5} ${-ry * 1.08} ${rx * 1.06} ${-ry * 0.9} ${rx * 1.02} ${-ry * 0.02} L ${rx * 0.92} ${-ry * fringe}`;
  switch (hair) {
    case 'short': {
      const f = -ry * 0.3;
      return (
        <g>
          <path d={cap(0.3) + d` L ${rx * 0.62} ${f - 4} L ${rx * 0.46} ${f + 8} L ${rx * 0.26} ${f - 2} L ${rx * 0.06} ${f + 9} L ${-rx * 0.16} ${f - 2} L ${-rx * 0.36} ${f + 8} L ${-rx * 0.56} ${f - 3} L ${-rx * 0.92} ${-ry * 0.24} Z`} {...st} />
          {!sym && <path d={d`M ${-4} ${-ry * 1.06} Q ${-12} ${-ry * 1.4} ${8} ${-ry * 1.36}`} fill="none" stroke={INK} strokeWidth={pen.w} strokeLinecap="round" />}
        </g>
      );
    }
    case 'spiky': {
      const top = -ry * 1.04;
      return (
        <path
          d={d`M ${-rx * 1.02} ${-ry * 0.1} L ${-rx * 1.12} ${-ry * 0.62} L ${-rx * 0.8} ${-ry * 0.74} L ${-rx * 0.86} ${-ry * 1.14} L ${-rx * 0.4} ${top + 2} L ${-rx * 0.22} ${-ry * 1.36} L ${rx * 0.12} ${top} L ${rx * 0.42} ${-ry * 1.3} L ${rx * 0.6} ${-ry * 0.96} L ${rx * 1.02} ${-ry * 1.0} L ${rx * 0.96} ${-ry * 0.6} L ${rx * 1.1} ${-ry * 0.3} L ${rx * 0.9} ${-ry * 0.34} L ${rx * 0.5} ${-ry * 0.24} L ${rx * 0.36} ${-ry * 0.44} L ${0} ${-ry * 0.3} L ${-rx * 0.4} ${-ry * 0.46} L ${-rx * 0.7} ${-ry * 0.26} Z`}
          {...st}
        />
      );
    }
    case 'bob':
      return <path d={cap(0.24) + d` L ${-rx * 0.92} ${-ry * 0.24} Z M ${rx * 0.86} ${-ry * 0.26} Q ${rx * 1.0} ${ry * 0.1} ${rx * 1.02} ${ry * 0.5} L ${rx * 0.92} ${ry * 0.48} Q ${rx * 0.9} ${ry * 0.1} ${rx * 0.86} ${-ry * 0.26} Z M ${-rx * 0.86} ${-ry * 0.26} Q ${-rx * 1.0} ${ry * 0.1} ${-rx * 1.02} ${ry * 0.5} L ${-rx * 0.92} ${ry * 0.48} Q ${-rx * 0.9} ${ry * 0.1} ${-rx * 0.86} ${-ry * 0.26} Z`} {...st} />;
    case 'bob2':
      return <path d={cap(0.2) + d` Q ${rx * 0.2} ${-ry * 0.5} ${-rx * 0.5} ${-ry * 0.22} L ${-rx * 0.92} ${-ry * 0.1} Z`} {...st} />;
    case 'pony':
    case 'pigtails':
      return <path d={cap(0.32) + d` Q ${rx * 0.4} ${-ry * 0.46} ${0} ${-ry * 0.34} Q ${-rx * 0.4} ${-ry * 0.48} ${-rx * 0.92} ${-ry * 0.28} Z`} {...st} />;
    case 'long':
      return <path d={cap(0.3) + d` Q ${rx * 0.5} ${-ry * 0.4} ${rx * 0.06} ${-ry * 0.74} Q ${-rx * 0.5} ${-ry * 0.4} ${-rx * 0.92} ${-ry * 0.3} Z`} {...st} />;
    case 'wavy':
      return (
        <path
          d={cap(0.34) + d` Q ${rx * 0.72} ${-ry * 0.2} ${rx * 0.5} ${-ry * 0.38} Q ${rx * 0.3} ${-ry * 0.2} ${rx * 0.1} ${-ry * 0.4} Q ${-rx * 0.12} ${-ry * 0.22} ${-rx * 0.3} ${-ry * 0.42} Q ${-rx * 0.6} ${-ry * 0.2} ${-rx * 0.92} ${-ry * 0.3} Z`}
          {...st}
        />
      );
    case 'part':
      return <path d={cap(0.36) + d` Q ${rx * 0.2} ${-ry * 0.62} ${-rx * 0.26} ${-ry * 0.5} Q ${-rx * 0.6} ${-ry * 0.34} ${-rx * 0.92} ${-ry * 0.26} Z`} {...st} />;
    case 'bun':
      return <path d={cap(0.4) + d` Q ${0} ${-ry * 0.66} ${-rx * 0.92} ${-ry * 0.34} Z`} {...st} />;
    case 'perm': {
      const n = 7;
      return (
        <g>
          {Array.from({ length: n }, (_, i) => {
            const t = Math.PI * (1.05 + (i / (n - 1)) * 0.9);
            return <circle key={i} cx={Math.cos(t) * rx * 0.86} cy={Math.sin(t) * ry * 0.82 - ry * 0.12} r={ry * 0.3} {...st} />;
          })}
        </g>
      );
    }
    case 'bald3':
      return (
        <g fill="none" stroke={INK} strokeLinecap="round">
          <path d={d`M ${-rx * 0.4} ${-ry * 0.96} Q ${0} ${-ry * 1.24} ${rx * 0.4} ${-ry * 0.98} M ${-rx * 0.3} ${-ry * 0.9} Q ${rx * 0.1} ${-ry * 1.2} ${rx * 0.5} ${-ry * 0.88} M ${-rx * 0.2} ${-ry * 0.82} Q ${rx * 0.2} ${-ry * 1.1} ${rx * 0.58} ${-ry * 0.78}`} strokeWidth={pen.t} />
          <path d={d`M ${-rx * 0.98} ${-ry * 0.3} Q ${-rx * 1.12} ${0} ${-rx * 0.96} ${ry * 0.18} M ${rx * 0.98} ${-ry * 0.3} Q ${rx * 1.12} ${0} ${rx * 0.96} ${ry * 0.18}`} stroke={color} strokeWidth={pen.w * 2.4} />
          <path d={d`M ${-rx * 0.5} ${-ry * 0.6} Q ${-rx * 0.36} ${-ry * 0.8} ${-rx * 0.14} ${-ry * 0.82}`} stroke="#ffffff" strokeWidth={pen.w * 1.2} opacity={0.8} />
        </g>
      );
  }
}

/** 오행 마크 (주인공 머리 위 바보털 끝) */
function ElementMark({ el, state, D, pen }: { el: Element; state: Sym; D: Dims; pen: Pen }) {
  const top = -D.ry * 1.06;
  const wilt = state === 'wilt';
  const off = state === 'off';
  const big = state === 'flare' ? 1.55 : 1;
  const up = state === 'jump' ? -16 : 0;
  // 바보털 줄기
  const tip: Pt = wilt ? [16, top - 8] : [4, top - 18 + up];
  const stem = wilt ? d`M ${0} ${top + 2} Q ${2} ${top - 18} ${tip[0]} ${tip[1]}` : d`M ${0} ${top + 2} Q ${-6} ${top - 10 + up / 2} ${tip[0]} ${tip[1]}`;
  const st = { stroke: INK, strokeWidth: pen.t * 1.1, strokeLinejoin: 'round' as const };
  let mark: ReactNode = null;
  const [x, y] = tip;
  const s = 11 * big;
  switch (el) {
    case 'wood': {
      const leaf = (sx: number, ang: number) => <ellipse cx={x + sx * s * 0.62} cy={y - s * 0.12} rx={s * 0.62} ry={s * 0.3} transform={`rotate(${ang} ${x + sx * s * 0.62} ${y - s * 0.12})`} fill={off ? '#b9a27a' : '#7cc68d'} {...st} />;
      mark = wilt ? (
        <g>
          {leaf(1, 60)}
          {leaf(-1, -10)}
        </g>
      ) : (
        <g>
          {leaf(1, -28)}
          {leaf(-1, 28)}
        </g>
      );
      break;
    }
    case 'fire': {
      const k = off ? 0.6 : 1;
      mark = off ? (
        <path d={d`M ${x - 6} ${y} q ${-4} ${-8} ${2} ${-12} q ${-2} ${-6} ${6} ${-8}`} fill="none" stroke="#9a9a9a" strokeWidth={pen.t * 1.4} strokeLinecap="round" />
      ) : (
        <g>
          <path d={d`M ${x} ${y + 3} C ${x - s * 1.1} ${y + 2} ${x - s * 0.9} ${y - s * 1.1} ${x - s * 0.1} ${y - s * 2.1 * k} C ${x + s * 0.1} ${y - s * 1.2} ${x + s * 1.1} ${y - s * 1.0} ${x + s * 0.8} ${y - s * 0.2} C ${x + s * 0.7} ${y + 2} ${x + s * 0.3} ${y + 3} ${x} ${y + 3} Z`} fill="#ff8a3d" {...st} />
          <path d={d`M ${x} ${y} C ${x - s * 0.5} ${y - 1} ${x - s * 0.4} ${y - s * 0.8} ${x} ${y - s * 1.2} C ${x + s * 0.4} ${y - s * 0.7} ${x + s * 0.5} ${y - 1} ${x} ${y} Z`} fill="#ffd166" />
        </g>
      );
      break;
    }
    case 'earth':
      mark = (
        <g>
          <path d={d`M ${x - s * 1.1} ${y + 2} L ${x - s * 0.3} ${y - s * 1.3} L ${x + s * 0.1} ${y - s * 0.7} L ${x + s * 0.5} ${y - s * 1.1} L ${x + s * 1.1} ${y + 2} Z`} fill={off ? '#a89a8a' : '#c9965b'} {...st} />
          {!off && <path d={d`M ${x - s * 0.5} ${y - s * 0.95} L ${x - s * 0.3} ${y - s * 1.3} L ${x - s * 0.1} ${y - s * 0.98}`} fill="#ffffff" stroke="none" />}
          {wilt && <path d={d`M ${x} ${y - s * 0.8} l ${3} ${6} l ${-4} ${5}`} fill="none" stroke={INK} strokeWidth={pen.t} />}
        </g>
      );
      break;
    case 'metal':
      mark = (
        <g>
          <path d={d`M ${x} ${y + 2} L ${x - s} ${y - s * 0.7} L ${x - s * 0.5} ${y - s * 1.3} L ${x + s * 0.5} ${y - s * 1.3} L ${x + s} ${y - s * 0.7} Z`} fill={off || wilt ? '#a9adb5' : '#d6e2f2'} {...st} />
          <path d={d`M ${x - s} ${y - s * 0.7} L ${x + s} ${y - s * 0.7} M ${x - s * 0.5} ${y - s * 1.3} L ${x} ${y + 2} L ${x + s * 0.5} ${y - s * 1.3}`} fill="none" stroke={INK} strokeWidth={pen.t * 0.7} />
          {state === 'flare' && <path d={starPath(x + s * 1.3, y - s * 1.5, 6)} fill="#fff6b0" stroke={INK} strokeWidth={pen.t * 0.6} />}
        </g>
      );
      break;
    case 'water': {
      const flat = wilt ? 0.6 : 1;
      mark = (
        <g>
          <path d={d`M ${x} ${y - s * 1.7 * flat} C ${x + s * 0.4} ${y - s * 0.9} ${x + s * 0.95} ${y - s * 0.5} ${x + s * 0.8} ${y - s * 0.05} C ${x + s * 0.6} ${y + 4} ${x - s * 0.6} ${y + 4} ${x - s * 0.8} ${y - s * 0.05} C ${x - s * 0.95} ${y - s * 0.5} ${x - s * 0.4} ${y - s * 0.9} ${x} ${y - s * 1.7 * flat} Z`} fill={off ? '#b8c4cf' : '#6ab4ff'} {...st} />
          <ellipse cx={x - s * 0.3} cy={y - s * 0.4} rx={s * 0.16} ry={s * 0.3} fill="#ffffff" />
        </g>
      );
      break;
    }
  }
  return (
    <g>
      <path d={stem} fill="none" stroke={INK} strokeWidth={pen.w * 0.9} strokeLinecap="round" />
      {mark}
      {state === 'jump' && <path d={d`M ${x - 18} ${y - 4} l ${-6} ${4} M ${x + 18} ${y - 4} l ${6} ${4} M ${x - 14} ${y - 18} l ${-6} ${-2} M ${x + 14} ${y - 18} l ${6} ${-2}`} stroke={INK} strokeWidth={pen.t} strokeLinecap="round" />}
    </g>
  );
}

const dot = (x: number, y: number, r: number, key?: string) => <circle key={key} cx={x} cy={y} r={r} fill={INK} />;

/** 얼굴 (개그체) — 머리 가운데 기준, 오른쪽을 본다 */
function FaceArt({ face, D, pen, lx }: { face: Face; D: Dims; pen: Pen; lx: number }) {
  const { rx, ry } = D;
  const ex = 15;
  const ey = 4;
  const L: Pt = [lx - ex, ey];
  const R: Pt = [lx + ex, ey];
  const my = ry * 0.5;
  const mx = lx + 2;
  const line = { fill: 'none', stroke: INK, strokeWidth: pen.f, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  const cheeks = (o = 0.55) => (
    <g opacity={o}>
      <ellipse cx={lx - 28} cy={ry * 0.28} rx={8} ry={4.5} fill={BLUSH} />
      <ellipse cx={lx + 28} cy={ry * 0.28} rx={8} ry={4.5} fill={BLUSH} />
    </g>
  );
  const eyes = (r = 4.3) => (
    <g>
      {dot(L[0], L[1], r)}
      {dot(R[0], R[1], r)}
    </g>
  );
  const arcEyes = (down = false) => (
    <g {...line}>
      {[L, R].map(([x, y], i) => (
        <path key={i} d={down ? d`M ${x - 6} ${y - 2} Q ${x} ${y + 5} ${x + 6} ${y - 2}` : d`M ${x - 6} ${y + 3} Q ${x} ${y - 5} ${x + 6} ${y + 3}`} />
      ))}
    </g>
  );
  switch (face) {
    case 'plain':
      return (
        <g>
          {eyes()}
          <path d={d`M ${mx - 7} ${my} L ${mx + 7} ${my}`} {...line} />
        </g>
      );
    case 'smile':
      return (
        <g>
          {eyes()}
          {cheeks(0.35)}
          <path d={d`M ${mx - 9} ${my - 2} Q ${mx} ${my + 7} ${mx + 9} ${my - 2}`} {...line} />
        </g>
      );
    case 'happy':
      return (
        <g>
          {arcEyes()}
          {cheeks()}
          <path d={d`M ${mx - 12} ${my - 4} Q ${mx} ${my + 16} ${mx + 12} ${my - 4} Z`} fill="#7a2e2e" stroke={INK} strokeWidth={pen.f} strokeLinejoin="round" />
          <path d={d`M ${mx - 6} ${my + 4} Q ${mx} ${my + 1} ${mx + 6} ${my + 4} Q ${mx} ${my + 9} ${mx - 6} ${my + 4} Z`} fill="#ff8a8a" />
        </g>
      );
    case 'grin':
      return (
        <g>
          {eyes()}
          <path d={d`M ${mx - 15} ${my - 6} Q ${mx} ${my - 4} ${mx + 15} ${my - 6} Q ${mx + 14} ${my + 8} ${mx} ${my + 9} Q ${mx - 14} ${my + 8} ${mx - 15} ${my - 6} Z`} fill="#ffffff" stroke={INK} strokeWidth={pen.f} strokeLinejoin="round" />
          <path d={d`M ${mx - 14} ${my + 1} L ${mx + 14} ${my + 1} M ${mx - 5} ${my - 5} L ${mx - 5} ${my + 8} M ${mx + 5} ${my - 5} L ${mx + 5} ${my + 8}`} stroke={INK} strokeWidth={pen.t * 0.8} />
        </g>
      );
    case 'smug':
      return (
        <g>
          {[L, R].map(([x, y], i) => (
            <g key={i}>
              <path d={d`M ${x - 7} ${y - 1} L ${x + 7} ${y - 1}`} {...line} />
              <path d={d`M ${x - 4} ${y - 1} A ${4} ${4} 0 0 0 ${x + 4} ${y - 1} Z`} fill={INK} />
            </g>
          ))}
          <path d={d`M ${mx - 9} ${my + 1} Q ${mx + 2} ${my + 5} ${mx + 10} ${my - 5}`} {...line} />
        </g>
      );
    case 'proud':
      return (
        <g>
          {arcEyes()}
          {cheeks(0.4)}
          <path d={d`M ${mx - 9} ${my - 2} Q ${mx} ${my + 6} ${mx + 9} ${my - 2}`} {...line} />
          <path d={starPath(lx + 34, -ry * 0.12, 6)} fill="#fff6b0" stroke={INK} strokeWidth={pen.t * 0.6} />
        </g>
      );
    case 'surprised':
      return (
        <g>
          {eyes(5.6)}
          <ellipse cx={mx} cy={my + 2} rx={5} ry={7} fill="#5a2424" stroke={INK} strokeWidth={pen.f * 0.8} />
        </g>
      );
    case 'shock':
      return (
        <g>
          <path d={d`M ${-rx * 0.7} ${-ry * 0.62} L ${-rx * 0.7} ${-ry * 0.2} M ${-rx * 0.4} ${-ry * 0.8} L ${-rx * 0.4} ${-ry * 0.18} M ${-rx * 0.1} ${-ry * 0.86} L ${-rx * 0.1} ${-ry * 0.22} M ${rx * 0.2} ${-ry * 0.84} L ${rx * 0.2} ${-ry * 0.2} M ${rx * 0.5} ${-ry * 0.74} L ${rx * 0.5} ${-ry * 0.2}`} stroke="#5b6b9a" strokeWidth={pen.t} opacity={0.75} />
          {[L, R].map(([x, y], i) => (
            <g key={i}>
              <circle cx={x} cy={y} r={9.5} fill="#ffffff" stroke={INK} strokeWidth={pen.f * 0.9} />
              {dot(x, y, 1.8)}
            </g>
          ))}
          <path d={d`M ${mx - 8} ${my + 4} Q ${mx - 4} ${my - 2} ${mx} ${my + 4} Q ${mx + 4} ${my + 10} ${mx + 8} ${my + 4}`} {...line} />
        </g>
      );
    case 'scream':
      return (
        <g>
          <g {...line}>
            <path d={d`M ${L[0] - 7} ${L[1] - 6} L ${L[0] + 4} ${L[1]} L ${L[0] - 7} ${L[1] + 6}`} />
            <path d={d`M ${R[0] + 7} ${R[1] - 6} L ${R[0] - 4} ${R[1]} L ${R[0] + 7} ${R[1] + 6}`} />
          </g>
          <path d={d`M ${mx - 14} ${my - 6} Q ${mx} ${my - 10} ${mx + 14} ${my - 6} Q ${mx + 16} ${my + 18} ${mx} ${my + 22} Q ${mx - 16} ${my + 18} ${mx - 14} ${my - 6} Z`} fill="#5a2424" stroke={INK} strokeWidth={pen.f} strokeLinejoin="round" />
          <ellipse cx={mx} cy={my + 15} rx={8} ry={4.5} fill="#ff8a8a" />
        </g>
      );
    case 'sad':
      return (
        <g>
          {eyes(4)}
          <path d={d`M ${L[0] - 9} ${L[1] - 8} L ${L[0] + 5} ${L[1] - 13} M ${R[0] + 9} ${R[1] - 8} L ${R[0] - 5} ${R[1] - 13}`} {...line} />
          <path d={d`M ${mx - 8} ${my + 4} Q ${mx} ${my - 4} ${mx + 8} ${my + 4}`} {...line} />
        </g>
      );
    case 'cry':
      return (
        <g>
          {[L, R].map(([x, y], i) => (
            <g key={i}>
              <path d={d`M ${x - 7} ${y + 6} L ${x - 7} ${ry * 1.5} Q ${x} ${ry * 1.62} ${x + 7} ${ry * 1.5} L ${x + 7} ${y + 6} Z`} fill={TEAR} stroke={INK} strokeWidth={pen.t} />
              <path d={d`M ${x - 2} ${y + 10} L ${x - 2} ${ry * 1.4}`} stroke="#ffffff" strokeWidth={pen.t} opacity={0.9} />
            </g>
          ))}
          <path d={d`M ${L[0] - 8} ${L[1] + 2} Q ${L[0]} ${L[1] - 6} ${L[0] + 8} ${L[1] + 2} M ${R[0] - 8} ${R[1] + 2} Q ${R[0]} ${R[1] - 6} ${R[0] + 8} ${R[1] + 2}`} {...line} />
          <path d={d`M ${mx - 10} ${my + 8} Q ${mx - 5} ${my - 2} ${mx} ${my + 4} Q ${mx + 5} ${my - 2} ${mx + 10} ${my + 8} Z`} fill="#5a2424" stroke={INK} strokeWidth={pen.f * 0.8} strokeLinejoin="round" />
        </g>
      );
    case 'angry':
      return (
        <g>
          {eyes()}
          <path d={d`M ${L[0] - 9} ${L[1] - 13} L ${L[0] + 7} ${L[1] - 6} M ${R[0] + 9} ${R[1] - 13} L ${R[0] - 7} ${R[1] - 6}`} {...line} strokeWidth={pen.f * 1.3} />
          <path d={d`M ${mx - 12} ${my - 3} L ${mx + 12} ${my - 3} L ${mx + 11} ${my + 7} L ${mx - 11} ${my + 7} Z`} fill="#ffffff" stroke={INK} strokeWidth={pen.f} strokeLinejoin="round" />
          <path d={d`M ${mx - 11} ${my + 2} L ${mx - 6} ${my - 2} L ${mx - 1} ${my + 3} L ${mx + 4} ${my - 2} L ${mx + 9} ${my + 3}`} fill="none" stroke={INK} strokeWidth={pen.t * 0.8} />
        </g>
      );
    case 'rage':
      return (
        <g>
          <path d={headPath(rx * 0.98, ry * 0.98)} fill="#ff5a4e" opacity={0.42} />
          {[L, R].map(([x, y], i) => (
            <ellipse key={i} cx={x} cy={y} rx={7.5} ry={5} fill="#ffffff" stroke={INK} strokeWidth={pen.f * 0.8} />
          ))}
          <path d={d`M ${L[0] - 11} ${L[1] - 14} L ${L[0] + 8} ${L[1] - 6} M ${R[0] + 11} ${R[1] - 14} L ${R[0] - 8} ${R[1] - 6}`} {...line} strokeWidth={pen.f * 1.5} />
          <path d={d`M ${mx - 16} ${my - 6} L ${mx + 16} ${my - 6} L ${mx + 12} ${my + 14} L ${mx - 12} ${my + 14} Z`} fill="#ffffff" stroke={INK} strokeWidth={pen.f} strokeLinejoin="round" />
          <path d={d`M ${mx - 14} ${my + 4} L ${mx + 14} ${my + 4}`} stroke={INK} strokeWidth={pen.t} />
        </g>
      );
    case 'dead':
      return (
        <g>
          <g {...line}>
            {[L, R].map(([x, y], i) => (
              <path key={i} d={d`M ${x - 6} ${y - 6} L ${x + 6} ${y + 6} M ${x + 6} ${y - 6} L ${x - 6} ${y + 6}`} />
            ))}
          </g>
          <path d={d`M ${mx - 10} ${my} Q ${mx - 5} ${my - 4} ${mx} ${my} Q ${mx + 5} ${my + 4} ${mx + 10} ${my}`} {...line} />
          <path d={d`M ${mx + 2} ${my + 1} Q ${mx + 4} ${my + 12} ${mx + 9} ${my + 10} Q ${mx + 11} ${my + 3} ${mx + 7} ${my + 1}`} fill="#ff8a8a" stroke={INK} strokeWidth={pen.t} />
        </g>
      );
    case 'soul':
      return (
        <g>
          {[L, R].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r={6} fill="#ffffff" stroke={INK} strokeWidth={pen.f * 0.8} />
          ))}
          <ellipse cx={mx} cy={my + 2} rx={6} ry={8} fill="#5a2424" stroke={INK} strokeWidth={pen.f * 0.8} />
        </g>
      );
    case 'star':
      return (
        <g>
          {[L, R].map(([x, y], i) => (
            <path key={i} d={starPath5(x, y, 9)} fill="#ffd84d" stroke={INK} strokeWidth={pen.t} strokeLinejoin="round" />
          ))}
          {cheeks()}
          <path d={d`M ${mx - 11} ${my - 3} Q ${mx} ${my + 14} ${mx + 11} ${my - 3} Z`} fill="#7a2e2e" stroke={INK} strokeWidth={pen.f} strokeLinejoin="round" />
        </g>
      );
    case 'money':
      return (
        <g>
          {[L, R].map(([x, y], i) => (
            <g key={i} fill="none" stroke="#1f8a4c" strokeWidth={pen.f * 0.95} strokeLinecap="round" strokeLinejoin="round">
              <path d={d`M ${x - 9} ${y - 8} L ${x - 5} ${y + 8} L ${x} ${y - 3} L ${x + 5} ${y + 8} L ${x + 9} ${y - 8}`} />
              <path d={d`M ${x - 10} ${y - 1} L ${x + 10} ${y - 1} M ${x - 9} ${y + 3} L ${x + 9} ${y + 3}`} strokeWidth={pen.t * 0.9} />
            </g>
          ))}
          <path d={d`M ${mx - 12} ${my - 3} Q ${mx} ${my + 13} ${mx + 12} ${my - 3} Z`} fill="#7a2e2e" stroke={INK} strokeWidth={pen.f} strokeLinejoin="round" />
          <path d={d`M ${mx + 9} ${my + 2} Q ${mx + 11} ${my + 12} ${mx + 9} ${my + 16} Q ${mx + 6} ${my + 12} ${mx + 9} ${my + 2} Z`} fill={TEAR} stroke={INK} strokeWidth={pen.t * 0.7} />
        </g>
      );
    case 'love':
      return (
        <g>
          {[L, R].map(([x, y], i) => (
            <path key={i} d={heartPath(x, y + 1, 8)} fill="#ff4d6d" stroke={INK} strokeWidth={pen.t} />
          ))}
          {cheeks(0.7)}
          <path d={d`M ${mx - 8} ${my - 1} Q ${mx} ${my + 7} ${mx + 8} ${my - 1}`} {...line} />
        </g>
      );
    case 'blush':
      return (
        <g>
          {eyes(4)}
          {cheeks(0.85)}
          {[-1, 1].map((s) => (
            <path key={s} d={d`M ${lx + s * 32} ${ry * 0.2} l ${-3} ${7} M ${lx + s * 27} ${ry * 0.2} l ${-3} ${7} M ${lx + s * 22} ${ry * 0.2} l ${-3} ${7}`} stroke="#e0566a" strokeWidth={pen.t * 0.8} />
          ))}
          <path d={d`M ${mx - 8} ${my} Q ${mx - 4} ${my - 3} ${mx} ${my} Q ${mx + 4} ${my + 3} ${mx + 8} ${my}`} {...line} />
        </g>
      );
    case 'nervous':
      return (
        <g>
          {eyes(4)}
          <path d={d`M ${mx - 11} ${my} L ${mx - 6} ${my - 4} L ${mx - 1} ${my} L ${mx + 4} ${my - 4} L ${mx + 9} ${my}`} {...line} />
        </g>
      );
    case 'tired':
      return (
        <g>
          {[L, R].map(([x, y], i) => (
            <g key={i}>
              <path d={d`M ${x - 7} ${y} L ${x + 7} ${y}`} {...line} />
              <path d={d`M ${x - 7} ${y + 6} Q ${x} ${y + 11} ${x + 7} ${y + 6}`} fill="none" stroke="#8b7aa8" strokeWidth={pen.t} />
            </g>
          ))}
          <path d={d`M ${mx - 5} ${my + 1} L ${mx + 5} ${my + 1}`} {...line} />
        </g>
      );
    case 'sleep':
      return (
        <g>
          {arcEyes(true)}
          <path d={d`M ${mx - 5} ${my + 2} Q ${mx} ${my + 6} ${mx + 5} ${my + 2}`} {...line} />
          <circle cx={lx + 16} cy={ry * 0.3} r={11} fill="#d9f2ff" stroke={INK} strokeWidth={pen.t * 0.7} opacity={0.92} />
          <path d={d`M ${lx + 11} ${ry * 0.22} q ${3} ${-4} ${7} ${-3}`} fill="none" stroke="#ffffff" strokeWidth={pen.t} />
        </g>
      );
    case 'think':
      return (
        <g>
          {dot(L[0] + 3, L[1] - 3, 4)}
          {dot(R[0] + 3, R[1] - 3, 4)}
          <path d={d`M ${L[0] - 6} ${L[1] - 12} L ${L[0] + 6} ${L[1] - 13} M ${R[0] - 6} ${R[1] - 14} L ${R[0] + 6} ${R[1] - 11}`} {...line} />
          <path d={d`M ${mx - 3} ${my + 1} L ${mx + 8} ${my - 2}`} {...line} />
        </g>
      );
    case 'serious':
      return (
        <g>
          <path d={d`M ${L[0] - 10} ${L[1] - 9} L ${L[0] + 8} ${L[1] - 7} M ${R[0] - 8} ${R[1] - 7} L ${R[0] + 10} ${R[1] - 9}`} {...line} strokeWidth={pen.f * 1.5} />
          {[L, R].map(([x, y], i) => (
            <g key={i}>
              <ellipse cx={x} cy={y + 1} rx={6.5} ry={3.6} fill="#ffffff" stroke={INK} strokeWidth={pen.f * 0.7} />
              {dot(x + 1, y + 1, 2.6)}
            </g>
          ))}
          <path d={d`M ${mx - 8} ${my + 1} L ${mx + 8} ${my + 1}`} {...line} strokeWidth={pen.f * 1.2} />
        </g>
      );
    case 'drool':
      return (
        <g>
          {[L, R].map(([x, y], i) => (
            <g key={i}>
              {dot(x, y, 5.5)}
              <circle cx={x + 1.8} cy={y - 1.8} r={1.8} fill="#ffffff" />
            </g>
          ))}
          {cheeks()}
          <path d={d`M ${mx - 10} ${my - 2} Q ${mx} ${my + 10} ${mx + 10} ${my - 2} Z`} fill="#7a2e2e" stroke={INK} strokeWidth={pen.f} strokeLinejoin="round" />
          <path d={d`M ${mx + 7} ${my + 2} Q ${mx + 10} ${my + 16} ${mx + 7} ${my + 20} Q ${mx + 3} ${my + 14} ${mx + 7} ${my + 2} Z`} fill={TEAR} stroke={INK} strokeWidth={pen.t * 0.7} />
        </g>
      );
    case 'blank':
      return (
        <g>
          {dot(lx - 22, ey, 2.2)}
          {dot(lx + 22, ey, 2.2)}
          {dot(mx, my + 2, 1.6)}
        </g>
      );
  }
}

/** 극화체 얼굴 — 갑자기 진지해지는 컷 */
function DramaFace({ face, D, pen, lx }: { face: Face; D: Dims; pen: Pen; lx: number }) {
  const { rx, ry } = D;
  const L: Pt = [lx - 16, 2];
  const R: Pt = [lx + 16, 2];
  const angry = face === 'angry' || face === 'rage';
  const shock = face === 'shock' || face === 'scream' || face === 'surprised';
  const sad = face === 'sad' || face === 'cry';
  const line = { fill: 'none', stroke: INK, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return (
    <g>
      {/* 얼굴 그늘 (빗금) */}
      <path d={d`M ${-rx * 0.98} ${-ry * 0.1} C ${-rx} ${ry * 0.5} ${-rx * 0.6} ${ry * 0.98} ${0} ${ry} L ${-rx * 0.2} ${ry * 0.4} Q ${-rx * 0.6} ${ry * 0.2} ${-rx * 0.98} ${-ry * 0.1} Z`} fill="#3a2f2f" opacity={0.22} />
      <g stroke={INK} strokeWidth={pen.t * 0.6} opacity={0.55}>
        {[0, 1, 2, 3, 4].map((i) => (
          <path key={i} d={d`M ${-rx * 0.86 + i * 7} ${ry * 0.08 + i * 4} l ${10} ${-9}`} />
        ))}
      </g>
      {/* 눈썹 */}
      <path d={d`M ${L[0] - 13} ${L[1] - (angry ? 16 : 10)} Q ${L[0]} ${L[1] - 14} ${L[0] + 10} ${L[1] - (angry ? 6 : sad ? 14 : 9)} M ${R[0] + 13} ${R[1] - (angry ? 16 : 10)} Q ${R[0]} ${R[1] - 14} ${R[0] - 10} ${R[1] - (angry ? 6 : sad ? 14 : 9)}`} {...line} strokeWidth={pen.f * 1.7} />
      {/* 눈 */}
      {[L, R].map(([x, y], i) => (
        <g key={i}>
          <path d={d`M ${x - 10} ${y} Q ${x} ${y - (shock ? 9 : 6)} ${x + 10} ${y} Q ${x} ${y + (shock ? 9 : 5)} ${x - 10} ${y} Z`} fill="#ffffff" stroke={INK} strokeWidth={pen.f * 0.9} />
          <circle cx={x + 1} cy={y} r={shock ? 2 : 3.6} fill={INK} />
          {!shock && <circle cx={x + 2.2} cy={y - 1.4} r={1.2} fill="#ffffff" />}
          <path d={d`M ${x - 9} ${y + 6} Q ${x} ${y + 9} ${x + 8} ${y + 6}`} {...line} strokeWidth={pen.t * 0.6} />
        </g>
      ))}
      {/* 코 */}
      <path d={d`M ${lx + 3} ${ry * 0.06} L ${lx + 7} ${ry * 0.34} L ${lx + 1} ${ry * 0.38}`} {...line} strokeWidth={pen.t * 0.9} />
      {/* 입 */}
      {shock ? (
        <path d={d`M ${lx - 8} ${ry * 0.6} Q ${lx + 1} ${ry * 0.5} ${lx + 10} ${ry * 0.6} Q ${lx + 1} ${ry * 0.76} ${lx - 8} ${ry * 0.6} Z`} fill="#4a2020" stroke={INK} strokeWidth={pen.t} />
      ) : (
        <g>
          <path d={d`M ${lx - 10} ${ry * 0.6} Q ${lx + 1} ${ry * (angry ? 0.56 : sad ? 0.66 : 0.58)} ${lx + 11} ${ry * 0.6}`} {...line} strokeWidth={pen.f * 1.2} />
          <path d={d`M ${lx - 4} ${ry * 0.7} L ${lx + 6} ${ry * 0.7}`} {...line} strokeWidth={pen.t * 0.6} />
        </g>
      )}
      {/* 땀 한 방울 */}
      {(shock || sad) && <path d={d`M ${rx * 0.72} ${-ry * 0.3} q ${5} ${10} ${0} ${14} q ${-5} ${-4} ${0} ${-14} Z`} fill={TEAR} stroke={INK} strokeWidth={pen.t * 0.7} />}
      {face === 'cry' && <path d={d`M ${R[0] + 2} ${R[1] + 7} Q ${R[0] + 4} ${ry * 0.5} ${R[0]} ${ry * 0.7}`} stroke={TEAR} strokeWidth={pen.t * 1.4} fill="none" />}
    </g>
  );
}

function starPath5(cx: number, cy: number, r: number): string {
  let s = '';
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.45 : r;
    s += `${i ? 'L' : 'M'} ${Math.round((cx + Math.cos(a) * rr) * 10) / 10} ${Math.round((cy + Math.sin(a) * rr) * 10) / 10} `;
  }
  return `${s}Z`;
}
export { starPath5 };

function HeadAcc({ acc, D, pen, lx }: { acc: Acc[]; D: Dims; pen: Pen; lx: number }) {
  const { rx, ry } = D;
  const st = { stroke: INK, strokeWidth: pen.t, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };
  return (
    <g>
      {acc.includes('redface') && <path d={headPath(rx * 0.96, ry * 0.96)} fill="#ff5a4e" opacity={0.3} />}
      {acc.includes('darkcircles') &&
        [lx - 15, lx + 15].map((x) => <path key={x} d={d`M ${x - 7} ${12} Q ${x} ${17} ${x + 7} ${12}`} fill="none" stroke="#7b6a98" strokeWidth={pen.t * 1.1} />)}
      {acc.includes('glasses') && (
        <g fill="none" {...st}>
          <circle cx={lx - 15} cy={4} r={10} />
          <circle cx={lx + 15} cy={4} r={10} />
          <path d={d`M ${lx - 5} ${3} L ${lx + 5} ${3}`} />
        </g>
      )}
      {acc.includes('sunglasses') && (
        <g {...st}>
          <path d={d`M ${lx - 28} ${-4} L ${lx - 3} ${-4} L ${lx - 5} ${10} Q ${lx - 15} ${16} ${lx - 25} ${10} Z M ${lx + 28} ${-4} L ${lx + 3} ${-4} L ${lx + 5} ${10} Q ${lx + 15} ${16} ${lx + 25} ${10} Z`} fill="#1f1b1a" />
          <path d={d`M ${lx - 3} ${-2} L ${lx + 3} ${-2}`} fill="none" />
          <path d={d`M ${lx - 22} ${-1} L ${lx - 16} ${-1}`} stroke="#ffffff" strokeWidth={pen.t} />
        </g>
      )}
      {acc.includes('bandage') && (
        <g transform={`rotate(-20 ${lx + 16} ${-ry * 0.42})`}>
          <rect x={lx + 2} y={-ry * 0.42 - 6} width={28} height={12} rx={4} fill="#ffe7c4" {...st} />
          <rect x={lx + 10} y={-ry * 0.42 - 14} width={12} height={28} rx={4} fill="#ffe7c4" {...st} />
        </g>
      )}
      {acc.includes('zipper') && (
        <g>
          <rect x={lx - 14} y={ry * 0.42} width={30} height={10} rx={3} fill="#c9ced8" {...st} />
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <path key={i} d={d`M ${lx - 12 + i * 5} ${ry * 0.42} l ${0} ${10}`} stroke={INK} strokeWidth={pen.t * 0.6} />
          ))}
          <rect x={lx + 14} y={ry * 0.4} width={6} height={14} rx={2} fill="#9aa1ab" {...st} />
        </g>
      )}
      {acc.includes('headband') && (
        <g>
          <path d={d`M ${-rx * 0.98} ${-ry * 0.46} Q ${0} ${-ry * 0.62} ${rx * 0.98} ${-ry * 0.46} L ${rx * 0.96} ${-ry * 0.3} Q ${0} ${-ry * 0.46} ${-rx * 0.96} ${-ry * 0.3} Z`} fill="#ffffff" {...st} />
          <circle cx={lx} cy={-ry * 0.44} r={5} fill="#e5484d" />
          <path d={d`M ${-rx * 0.96} ${-ry * 0.4} l ${-16} ${-8} M ${-rx * 0.96} ${-ry * 0.36} l ${-14} ${8}`} stroke={INK} strokeWidth={pen.w} />
        </g>
      )}
      {acc.includes('beard') && (
        <path d={d`M ${-rx * 0.62} ${ry * 0.46} Q ${0} ${ry * 0.6} ${rx * 0.62} ${ry * 0.46} Q ${rx * 0.5} ${ry * 2.2} ${lx + 4} ${ry * 2.6} Q ${-rx * 0.4} ${ry * 2.1} ${-rx * 0.62} ${ry * 0.46} Z`} fill="#f2f2f2" {...st} />
      )}
      {acc.includes('crown') && <path d={d`M ${-22} ${-ry * 0.96} L ${-26} ${-ry * 1.5} L ${-12} ${-ry * 1.2} L ${0} ${-ry * 1.6} L ${12} ${-ry * 1.2} L ${26} ${-ry * 1.5} L ${22} ${-ry * 0.96} Z`} fill="#ffd84d" {...st} />}
      {acc.includes('halo') && <ellipse cx={0} cy={-ry * 1.4} rx={rx * 0.62} ry={9} fill="none" stroke="#ffcc33" strokeWidth={pen.w * 1.6} />}
      {acc.includes('cap') && <path d={d`M ${-rx * 1.0} ${-ry * 0.3} C ${-rx} ${-ry * 1.2} ${rx} ${-ry * 1.2} ${rx} ${-ry * 0.3} Z M ${rx * 0.6} ${-ry * 0.36} L ${rx * 1.5} ${-ry * 0.26} L ${rx * 0.9} ${-ry * 0.2}`} fill="#e5484d" {...st} />}
      {acc.includes('nest') && (
        <g>
          <ellipse cx={0} cy={-ry * 1.02} rx={rx * 0.62} ry={12} fill="#a87a4a" {...st} />
          {[-1, 0, 1].map((i) => (
            <path key={i} d={d`M ${-rx * 0.5 + i * 4} ${-ry * 1.02 + i * 3} Q ${0} ${-ry * 0.94} ${rx * 0.5} ${-ry * 1.02 - i * 2}`} fill="none" stroke="#6f4b2a" strokeWidth={pen.t * 0.8} />
          ))}
          <circle cx={6} cy={-ry * 1.24} r={9} fill="#ffd166" {...st} />
          <path d={d`M ${14} ${-ry * 1.25} l ${7} ${2} l ${-7} ${3} Z`} fill="#ff9f43" {...st} />
          <circle cx={9} cy={-ry * 1.27} r={1.6} fill={INK} />
        </g>
      )}
      {acc.includes('cobweb') && (
        <g fill="none" stroke="#8a8a8a" strokeWidth={pen.t * 0.6}>
          <path d={d`M ${-rx * 0.9} ${-ry * 0.9} L ${-rx * 0.3} ${-ry * 0.5} M ${-rx * 0.9} ${-ry * 0.9} L ${-rx * 0.5} ${-ry * 0.3} M ${-rx * 0.9} ${-ry * 0.9} L ${-rx * 0.1} ${-ry * 0.8}`} />
          <path d={d`M ${-rx * 0.62} ${-ry * 0.72} Q ${-rx * 0.6} ${-ry * 0.6} ${-rx * 0.68} ${-ry * 0.5} M ${-rx * 0.46} ${-ry * 0.62} Q ${-rx * 0.4} ${-ry * 0.5} ${-rx * 0.5} ${-ry * 0.38}`} />
        </g>
      )}
    </g>
  );
}

// ---------------------------------------------------------------------------
// 손에 든 물건 — 물건 가운데가 (0,0)
// ---------------------------------------------------------------------------
export function HeldArt({ held, pen }: { held: Held; pen: Pen }) {
  const st = { stroke: INK, strokeWidth: pen.w * 0.85, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };
  const thin = { stroke: INK, strokeWidth: pen.t, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };
  switch (held) {
    case 'phone':
      return (
        <g>
          <rect x={-9} y={-16} width={18} height={30} rx={4} fill="#2f3542" {...st} />
          <rect x={-6} y={-12} width={12} height={20} rx={2} fill="#a8d8ff" />
        </g>
      );
    case 'coffee':
    case 'tea':
      return (
        <g>
          <path d={d`M ${-10} ${-12} L ${10} ${-12} L ${8} ${12} L ${-8} ${12} Z`} fill={held === 'tea' ? '#ffffff' : '#c08b5c'} {...st} />
          {held === 'coffee' && <rect x={-11} y={-17} width={22} height={6} rx={2} fill="#ffffff" {...thin} />}
          {held === 'tea' && <path d={d`M ${10} ${-6} q ${8} ${2} ${0} ${10}`} fill="none" {...thin} />}
          <path d={d`M ${-3} ${-22} q ${-4} ${-6} ${0} ${-12} M ${4} ${-22} q ${-4} ${-6} ${0} ${-12}`} fill="none" stroke="#9a9a9a" strokeWidth={pen.t} />
        </g>
      );
    case 'document':
    case 'paper':
    case 'test':
      return (
        <g>
          <path d={d`M ${-14} ${-18} L ${8} ${-18} L ${14} ${-12} L ${14} ${18} L ${-14} ${18} Z`} fill="#ffffff" {...st} />
          {[-8, -2, 4, 10].map((y) => (
            <path key={y} d={d`M ${-9} ${y} L ${held === 'test' && y === -8 ? 0 : 9} ${y}`} stroke="#9aa1ab" strokeWidth={pen.t * 0.8} />
          ))}
        </g>
      );
    case 'docs':
      return (
        <g>
          {Array.from({ length: 9 }, (_, i) => (
            <rect key={i} x={-34 + (i % 2) * 4} y={-12 - i * 13} width={66} height={12} rx={2} fill={i % 3 === 0 ? '#ffffff' : i % 3 === 1 ? '#f4f1ea' : '#e9f0ff'} {...thin} />
          ))}
        </g>
      );
    case 'book':
      return (
        <g>
          <rect x={-16} y={-13} width={32} height={26} rx={3} fill="#5b7bd5" {...st} />
          <path d={d`M ${0} ${-13} L ${0} ${13}`} {...thin} />
          <rect x={-12} y={-8} width={9} height={4} fill="#ffffff" />
        </g>
      );
    case 'laptop':
      return (
        <g>
          <rect x={-22} y={-18} width={44} height={28} rx={3} fill="#c9ced8" {...st} />
          <rect x={-18} y={-14} width={36} height={20} fill="#a8d8ff" />
          <path d={d`M ${-27} ${12} L ${27} ${12} L ${24} ${16} L ${-24} ${16} Z`} fill="#9aa1ab" {...st} />
        </g>
      );
    case 'tablet':
      return (
        <g>
          <rect x={-15} y={-19} width={30} height={38} rx={4} fill="#2f3542" {...st} />
          <rect x={-11} y={-15} width={22} height={30} rx={2} fill="#ffe7a8" />
        </g>
      );
    case 'money':
      return (
        <g>
          {[0, 1, 2].map((i) => (
            <g key={i} transform={`rotate(${-12 + i * 12})`}>
              <rect x={-20} y={-11 - i * 2} width={40} height={22} rx={2} fill="#9ad49a" {...thin} />
              <circle cx={0} cy={-i * 2} r={5} fill="none" stroke="#2f7a3f" strokeWidth={pen.t * 0.7} />
            </g>
          ))}
        </g>
      );
    case 'moneybag':
      return (
        <g>
          <path d={d`M ${-14} ${-46} Q ${0} ${-38} ${14} ${-46} L ${10} ${-36} Q ${46} ${-20} ${40} ${18} Q ${36} ${40} ${0} ${40} Q ${-36} ${40} ${-40} ${18} Q ${-46} ${-20} ${-10} ${-36} Z`} fill="#d9b071" {...st} />
          <path d={d`M ${-12} ${-36} L ${12} ${-36}`} {...thin} strokeWidth={pen.w} />
          <g fill="none" stroke="#7a5a2a" strokeWidth={pen.w} strokeLinecap="round" strokeLinejoin="round">
            <path d={d`M ${-14} ${-6} L ${-8} ${18} L ${0} ${2} L ${8} ${18} L ${14} ${-6}`} />
            <path d={d`M ${-17} ${4} L ${17} ${4} M ${-16} ${10} L ${16} ${10}`} strokeWidth={pen.t} />
          </g>
        </g>
      );
    case 'wallet':
      return (
        <g>
          <path d={d`M ${-20} ${-6} L ${20} ${-6} L ${20} ${14} L ${-20} ${14} Z`} fill="#8a5a3c" {...st} />
          <path d={d`M ${-20} ${-6} L ${-14} ${-20} L ${26} ${-20} L ${20} ${-6}`} fill="#a87050" {...st} />
          <path d={d`M ${-12} ${2} L ${12} ${2}`} stroke="#5a3a22" strokeWidth={pen.t} />
        </g>
      );
    case 'card':
      return (
        <g>
          <rect x={-18} y={-11} width={36} height={22} rx={3} fill="#ffd84d" {...st} />
          <rect x={-14} y={-6} width={8} height={6} rx={1} fill="#c9a227" />
        </g>
      );
    case 'mic':
      return (
        <g>
          <rect x={-3.5} y={-4} width={7} height={22} rx={3} fill="#2f3542" {...st} />
          <circle cx={0} cy={-9} r={8} fill="#c9ced8" {...st} />
        </g>
      );
    case 'trophy':
      return (
        <g>
          <path d={d`M ${-16} ${-22} L ${16} ${-22} Q ${16} ${0} ${0} ${4} Q ${-16} ${0} ${-16} ${-22} Z`} fill="#ffd84d" {...st} />
          <path d={d`M ${-16} ${-16} q ${-10} ${2} ${-4} ${12} M ${16} ${-16} q ${10} ${2} ${4} ${12}`} fill="none" {...thin} />
          <rect x={-10} y={4} width={20} height={6} fill="#ffd84d" {...thin} />
          <rect x={-14} y={10} width={28} height={7} rx={2} fill="#8a5a3c" {...thin} />
        </g>
      );
    case 'candle':
      return (
        <g>
          <rect x={-7} y={-10} width={14} height={26} rx={2} fill="#fff4dc" {...st} />
          <path d={d`M ${0} ${-34} C ${-7} ${-22} ${-6} ${-14} ${0} ${-12} C ${6} ${-14} ${7} ${-22} ${0} ${-34} Z`} fill="#ffb347" {...thin} />
        </g>
      );
    case 'magnifier':
      return (
        <g>
          <path d={d`M ${-4} ${6} L ${-18} ${22}`} stroke={INK} strokeWidth={pen.w * 2.6} strokeLinecap="round" />
          <path d={d`M ${-4} ${6} L ${-18} ${22}`} stroke="#8a5a3c" strokeWidth={pen.w * 1.3} strokeLinecap="round" />
          <circle cx={6} cy={-6} r={15} fill="#dff3ff" {...st} />
          <path d={d`M ${-2} ${-12} Q ${2} ${-17} ${8} ${-16}`} stroke="#ffffff" strokeWidth={pen.t * 1.4} fill="none" />
        </g>
      );
    case 'water':
      return (
        <g>
          <path d={d`M ${-8} ${-34} L ${8} ${-34} L ${8} ${-26} Q ${16} ${-20} ${16} ${-10} L ${16} ${26} Q ${16} ${32} ${10} ${32} L ${-10} ${32} Q ${-16} ${32} ${-16} ${26} L ${-16} ${-10} Q ${-16} ${-20} ${-8} ${-26} Z`} fill="#d9f2ff" {...st} />
          <rect x={-16} y={-4} width={32} height={14} fill="#6ab4ff" opacity={0.8} />
          <rect x={-6} y={-40} width={12} height={7} rx={2} fill="#3b82f6" {...thin} />
        </g>
      );
    case 'noodle':
      return (
        <g>
          <path d={d`M ${-22} ${-6} L ${22} ${-6} Q ${20} ${18} ${0} ${18} Q ${-20} ${18} ${-22} ${-6} Z`} fill="#ff6b4a" {...st} />
          <path d={d`M ${-16} ${-8} q ${4} ${-6} ${8} ${0} q ${4} ${-6} ${8} ${0} q ${4} ${-6} ${8} ${0}`} fill="none" stroke="#ffd166" strokeWidth={pen.w} />
          <path d={d`M ${6} ${-10} L ${26} ${-34} M ${10} ${-8} L ${30} ${-30}`} stroke="#c08b5c" strokeWidth={pen.t * 1.4} />
          <path d={d`M ${-12} ${-12} C ${-20} ${-24} ${-10} ${-30} ${-8} ${-40} C ${0} ${-30} ${4} ${-24} ${-2} ${-12} Z`} fill="#ff8a3d" {...thin} />
        </g>
      );
    case 'barbell':
      return (
        <g>
          <rect x={-70} y={-3} width={140} height={6} fill="#9aa1ab" {...thin} />
          {[-1, 1].map((s) => (
            <g key={s}>
              <rect x={s * 58 - 10} y={-26} width={20} height={52} rx={4} fill="#2f3542" {...st} />
              <rect x={s * 76 - 8} y={-20} width={16} height={40} rx={4} fill="#2f3542" {...st} />
            </g>
          ))}
        </g>
      );
    case 'umbrella':
      return (
        <g>
          <path d={d`M ${0} ${-6} L ${0} ${40} q ${0} ${8} ${-8} ${6}`} fill="none" stroke={INK} strokeWidth={pen.w} strokeLinecap="round" />
          <path d={d`M ${-44} ${-6} Q ${0} ${-56} ${44} ${-6} Q ${30} ${-12} ${22} ${-6} Q ${11} ${-12} ${0} ${-6} Q ${-11} ${-12} ${-22} ${-6} Q ${-30} ${-12} ${-44} ${-6} Z`} fill="#6ab4ff" {...st} />
        </g>
      );
    case 'calculator':
      return (
        <g>
          <rect x={-14} y={-18} width={28} height={36} rx={4} fill="#9aa1ab" {...st} />
          <rect x={-10} y={-14} width={20} height={8} fill="#d9f2c4" />
          {[0, 1, 2].map((r) =>
            [0, 1, 2].map((c) => <rect key={`${r}${c}`} x={-10 + c * 7} y={-2 + r * 6} width={5} height={4} rx={1} fill="#2f3542" />),
          )}
        </g>
      );
    case 'flag':
      return (
        <g>
          <path d={d`M ${0} ${24} L ${0} ${-44}`} stroke={INK} strokeWidth={pen.w * 1.2} strokeLinecap="round" />
          <path d={d`M ${0} ${-44} L ${34} ${-34} L ${0} ${-22} Z`} fill="#e5484d" {...st} />
        </g>
      );
    case 'cake':
      return (
        <g>
          <rect x={-20} y={-10} width={40} height={20} rx={3} fill="#fff1e0" {...st} />
          <path d={d`M ${-20} ${-4} Q ${-10} ${2} ${0} ${-4} Q ${10} ${2} ${20} ${-4}`} fill="none" stroke="#ff8fab" strokeWidth={pen.w} />
          <circle cx={0} cy={-15} r={5} fill="#e5484d" {...thin} />
        </g>
      );
    case 'plant':
      return (
        <g>
          <path d={d`M ${-14} ${0} L ${14} ${0} L ${10} ${20} L ${-10} ${20} Z`} fill="#c97b4a" {...st} />
          <path d={d`M ${0} ${0} L ${0} ${-16}`} stroke="#3f9b58" strokeWidth={pen.w} />
          <ellipse cx={-8} cy={-18} rx={9} ry={5} fill="#7cc68d" transform="rotate(25 -8 -18)" {...thin} />
          <ellipse cx={8} cy={-20} rx={9} ry={5} fill="#7cc68d" transform="rotate(-25 8 -20)" {...thin} />
        </g>
      );
    case 'globe':
      return (
        <g>
          <circle cx={0} cy={-40} r={46} fill="#8fc7ff" {...st} />
          <path d={d`M ${-30} ${-60} Q ${-10} ${-70} ${0} ${-56} Q ${14} ${-44} ${-6} ${-36} Q ${-24} ${-30} ${-30} ${-46} Z M ${12} ${-24} Q ${30} ${-30} ${36} ${-14} Q ${20} ${-2} ${10} ${-12} Z`} fill="#7cc68d" {...thin} />
        </g>
      );
    case 'crayon':
      return (
        <g transform="rotate(-30)">
          <rect x={-4} y={-16} width={8} height={26} rx={2} fill="#e5484d" {...thin} />
          <path d={d`M ${-4} ${-16} L ${0} ${-24} L ${4} ${-16} Z`} fill="#ffd0d0" {...thin} />
        </g>
      );
    case 'piggy':
      return (
        <g>
          <ellipse cx={0} cy={0} rx={22} ry={16} fill="#ffb3c6" {...st} />
          <ellipse cx={20} cy={-2} rx={6} ry={7} fill="#ff8fab" {...thin} />
          <path d={d`M ${-12} ${-14} l ${-4} ${-8} l ${8} ${4} Z`} fill="#ffb3c6" {...thin} />
          <rect x={-6} y={-17} width={12} height={3} rx={1} fill={INK} />
          <circle cx={10} cy={-6} r={2} fill={INK} />
        </g>
      );
    case 'bag':
      return (
        <g>
          <path d={d`M ${-16} ${-10} L ${16} ${-10} L ${19} ${20} L ${-19} ${20} Z`} fill="#ff8fab" {...st} />
          <path d={d`M ${-8} ${-10} Q ${0} ${-26} ${8} ${-10}`} fill="none" {...thin} strokeWidth={pen.w} />
        </g>
      );
    case 'box':
      return (
        <g>
          <rect x={-26} y={-20} width={52} height={40} rx={2} fill="#d9a066" {...st} />
          <path d={d`M ${-26} ${-8} L ${26} ${-8} M ${-6} ${-20} L ${-6} ${-8} M ${6} ${-20} L ${6} ${-8}`} {...thin} fill="none" />
        </g>
      );
    case 'sword':
      return (
        <g transform="rotate(40)">
          <rect x={-4} y={-50} width={8} height={46} rx={2} fill="#dfe6f0" {...thin} />
          <rect x={-12} y={-6} width={24} height={6} rx={2} fill="#c9a227" {...thin} />
          <rect x={-3} y={0} width={6} height={14} rx={2} fill="#8a5a3c" {...thin} />
        </g>
      );
    case 'controller':
      return (
        <g>
          <path d={d`M ${-22} ${-8} Q ${0} ${-14} ${22} ${-8} Q ${30} ${12} ${16} ${12} Q ${0} ${4} ${-16} ${12} Q ${-30} ${12} ${-22} ${-8} Z`} fill="#3a3f52" {...st} />
          <circle cx={12} cy={-2} r={2.6} fill="#e5484d" />
          <path d={d`M ${-15} ${-3} l ${8} ${0} M ${-11} ${-7} l ${0} ${8}`} stroke="#ffffff" strokeWidth={pen.t} />
        </g>
      );
    case 'plush':
      return (
        <g>
          <circle cx={-14} cy={-26} r={8} fill="#c99a6b" {...thin} />
          <circle cx={14} cy={-26} r={8} fill="#c99a6b" {...thin} />
          <circle cx={0} cy={-14} r={18} fill="#d9aa7b" {...st} />
          <ellipse cx={0} cy={16} rx={20} ry={18} fill="#d9aa7b" {...st} />
          <circle cx={-6} cy={-16} r={2} fill={INK} />
          <circle cx={6} cy={-16} r={2} fill={INK} />
          <ellipse cx={0} cy={-9} rx={5} ry={3.5} fill="#f2d2b0" />
        </g>
      );
    case 'ticket':
      return (
        <g>
          <path d={d`M ${-24} ${-12} L ${24} ${-12} L ${24} ${-4} Q ${19} ${0} ${24} ${4} L ${24} ${12} L ${-24} ${12} L ${-24} ${4} Q ${-19} ${0} ${-24} ${-4} Z`} fill="#a8d8ff" {...st} />
          <path d={d`M ${-6} ${-2} L ${10} ${-6} L ${12} ${-3} L ${2} ${0} L ${8} ${6} L ${5} ${7} L ${-2} ${2} Z`} fill="#ffffff" stroke={INK} strokeWidth={pen.t * 0.6} />
        </g>
      );
    case 'chicken':
      return (
        <g>
          <rect x={-30} y={-14} width={60} height={28} rx={3} fill="#ffefd2" {...st} />
          <path d={d`M ${0} ${-14} L ${0} ${14}`} {...thin} />
          {[-18, -8].map((x) => (
            <ellipse key={x} cx={x} cy={-2} rx={7} ry={6} fill="#d98a3a" {...thin} />
          ))}
          {[8, 18].map((x) => (
            <ellipse key={x} cx={x} cy={-2} rx={7} ry={6} fill="#c0392b" {...thin} />
          ))}
        </g>
      );
    case 'spoon':
      return (
        <g transform="rotate(-30)">
          <rect x={-2.5} y={-4} width={5} height={30} rx={2} fill="#c9ced8" {...thin} />
          <ellipse cx={0} cy={-10} rx={8} ry={10} fill="#ffffff" {...thin} />
          <ellipse cx={0} cy={-13} rx={6} ry={5} fill="#ffffff" stroke="#e0e0e0" strokeWidth={pen.t} />
        </g>
      );
    case 'bowl':
      return (
        <g>
          <path d={d`M ${-30} ${-8} Q ${-30} ${-30} ${0} ${-34} Q ${30} ${-30} ${30} ${-8} Z`} fill="#ffffff" {...st} />
          <path d={d`M ${-30} ${-8} L ${30} ${-8} Q ${26} ${18} ${0} ${18} Q ${-26} ${18} ${-30} ${-8} Z`} fill="#e9f0ff" {...st} />
        </g>
      );
    case 'shovel':
      return (
        <g transform="rotate(20)">
          <rect x={-2.5} y={-40} width={5} height={44} fill="#8a5a3c" {...thin} />
          <path d={d`M ${-12} ${4} L ${12} ${4} L ${8} ${26} Q ${0} ${32} ${-8} ${26} Z`} fill="#9aa1ab" {...st} />
        </g>
      );
    case 'heart':
      return <path d={heartPath(0, 0, 16)} fill="#ff4d6d" {...st} />;
  }
}

// ---------------------------------------------------------------------------
// 명경이 — 말하는 손거울 (가운데가 (0,0), 몸 기준점은 발 대신 거울 아래 공중)
// ---------------------------------------------------------------------------
export const MIRROR_Y = -158;

function MirrorArt({ a, pen }: { a: Actor; pen: Pen }) {
  const R = 36;
  const st = { stroke: INK, strokeWidth: pen.w, strokeLinejoin: 'round' as const };
  const y0 = MIRROR_Y - (a.lift ?? 0);
  const face = a.face;
  const L: Pt = [-12, y0 - 2];
  const Rr: Pt = [12, y0 - 2];
  const my = y0 + 13;
  const line = { fill: 'none', stroke: INK, strokeWidth: pen.f, strokeLinecap: 'round' as const };
  const arm = (side: 1 | -1, to: Pt) => (
    <g key={side}>
      <path d={d`M ${side * (R + 5)} ${y0 + 6} Q ${side * (R + 18)} ${(y0 + 6 + to[1]) / 2 + 6} ${to[0]} ${to[1]}`} fill="none" stroke={INK} strokeWidth={pen.w * 1.2} strokeLinecap="round" />
      <circle cx={to[0]} cy={to[1]} r={5.5} fill="#ffffff" stroke={INK} strokeWidth={pen.t} />
    </g>
  );
  const pose = a.pose;
  const armR: Pt = pose === 'point' ? [R + 40, y0 - 6] : pose === 'cheer' ? [R + 20, y0 - 44] : pose === 'hold' ? [R + 6, y0 + 34] : pose === 'cross' ? [8, y0 + R + 14] : [R + 16, y0 + 36];
  const armL: Pt = pose === 'cheer' ? [-R - 20, y0 - 44] : pose === 'cross' ? [-8, y0 + R + 14] : pose === 'shrug' ? [-R - 26, y0 - 8] : [-R - 16, y0 + 36];
  return (
    <g>
      {/* 손잡이 */}
      <g transform={`rotate(18 0 ${y0})`}>
        <rect x={-8} y={y0 + R + 2} width={16} height={36} rx={6} fill="#d9a35a" {...st} />
        <rect x={-11} y={y0 + R - 2} width={22} height={9} rx={3} fill="#e8c27a" {...st} />
      </g>
      {arm(-1, armL)}
      {arm(1, armR)}
      {/* 테두리 */}
      <circle cx={0} cy={y0} r={R + 7} fill="#e8c27a" {...st} />
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
        const t = (i / 8) * Math.PI * 2;
        return <circle key={i} cx={Math.cos(t) * (R + 3.5)} cy={y0 + Math.sin(t) * (R + 3.5)} r={1.8} fill="#fff6d0" />;
      })}
      <circle cx={0} cy={y0} r={R} fill="#e3f4ff" stroke={INK} strokeWidth={pen.t} />
      <path d={d`M ${-R * 0.7} ${y0 - R * 0.1} L ${-R * 0.1} ${y0 - R * 0.72} M ${-R * 0.62} ${y0 + R * 0.12} L ${-R * 0.42} ${y0 - R * 0.08}`} stroke="#ffffff" strokeWidth={pen.w * 1.6} strokeLinecap="round" />
      {/* 얼굴 */}
      {face === 'happy' || face === 'proud' ? (
        <g {...line}>
          <path d={d`M ${L[0] - 5} ${L[1] + 2} Q ${L[0]} ${L[1] - 4} ${L[0] + 5} ${L[1] + 2} M ${Rr[0] - 5} ${Rr[1] + 2} Q ${Rr[0]} ${Rr[1] - 4} ${Rr[0] + 5} ${Rr[1] + 2}`} />
        </g>
      ) : face === 'smug' ? (
        <g>
          {[L, Rr].map(([x, y], i) => (
            <g key={i}>
              <path d={d`M ${x - 6} ${y - 1} L ${x + 6} ${y - 1}`} {...line} />
              <path d={d`M ${x - 3.5} ${y - 1} A ${3.5} ${3.5} 0 0 0 ${x + 3.5} ${y - 1} Z`} fill={INK} />
            </g>
          ))}
        </g>
      ) : face === 'shock' || face === 'surprised' || face === 'scream' ? (
        <g>
          {[L, Rr].map(([x, y], i) => (
            <g key={i}>
              <circle cx={x} cy={y} r={6.5} fill="#ffffff" stroke={INK} strokeWidth={pen.t} />
              {dot(x, y, 1.6)}
            </g>
          ))}
        </g>
      ) : face === 'angry' || face === 'rage' ? (
        <g>
          {dot(L[0], L[1] + 1, 3.4)}
          {dot(Rr[0], Rr[1] + 1, 3.4)}
          <path d={d`M ${L[0] - 7} ${L[1] - 9} L ${L[0] + 5} ${L[1] - 4} M ${Rr[0] + 7} ${Rr[1] - 9} L ${Rr[0] - 5} ${Rr[1] - 4}`} {...line} />
        </g>
      ) : face === 'sad' || face === 'cry' ? (
        <g>
          {dot(L[0], L[1], 3.2)}
          {dot(Rr[0], Rr[1], 3.2)}
          <path d={d`M ${L[0] - 6} ${L[1] - 6} L ${L[0] + 4} ${L[1] - 9} M ${Rr[0] + 6} ${Rr[1] - 6} L ${Rr[0] - 4} ${Rr[1] - 9}`} {...line} />
        </g>
      ) : face === 'serious' ? (
        <g>
          <path d={d`M ${L[0] - 7} ${L[1] - 6} L ${L[0] + 6} ${L[1] - 5} M ${Rr[0] - 6} ${Rr[1] - 5} L ${Rr[0] + 7} ${Rr[1] - 6}`} {...line} strokeWidth={pen.f * 1.4} />
          {dot(L[0], L[1] + 1, 3)}
          {dot(Rr[0], Rr[1] + 1, 3)}
        </g>
      ) : (
        <g>
          {dot(L[0], L[1], 3.6)}
          {dot(Rr[0], Rr[1], 3.6)}
        </g>
      )}
      {face === 'happy' || face === 'grin' ? (
        <path d={d`M ${-9} ${my - 3} Q ${0} ${my + 10} ${9} ${my - 3} Z`} fill="#7a2e2e" stroke={INK} strokeWidth={pen.f * 0.9} strokeLinejoin="round" />
      ) : face === 'smug' ? (
        <path d={d`M ${-7} ${my} Q ${2} ${my + 4} ${9} ${my - 4}`} {...line} />
      ) : face === 'shock' || face === 'surprised' || face === 'scream' ? (
        <ellipse cx={0} cy={my + 1} rx={4.5} ry={6} fill="#5a2424" />
      ) : face === 'angry' || face === 'rage' ? (
        <path d={d`M ${-8} ${my + 3} Q ${0} ${my - 4} ${8} ${my + 3}`} {...line} />
      ) : face === 'sad' || face === 'cry' ? (
        <path d={d`M ${-6} ${my + 3} Q ${0} ${my - 2} ${6} ${my + 3}`} {...line} />
      ) : face === 'plain' || face === 'serious' || face === 'blank' ? (
        <path d={d`M ${-5} ${my} L ${5} ${my}`} {...line} />
      ) : (
        <path d={d`M ${-7} ${my - 1} Q ${0} ${my + 6} ${7} ${my - 1}`} {...line} />
      )}
      {(face === 'smile' || face === 'happy' || face === 'grin' || face === 'proud') && (
        <g opacity={0.6}>
          <ellipse cx={-20} cy={y0 + 8} rx={5} ry={3} fill={BLUSH} />
          <ellipse cx={20} cy={y0 + 8} rx={5} ry={3} fill={BLUSH} />
        </g>
      )}
      {a.held && (
        <g transform={`translate(${armR[0] + 8} ${armR[1] - 6}) scale(0.8)`}>
          <HeldArt held={a.held} pen={pen} />
        </g>
      )}
    </g>
  );
}

// ---------------------------------------------------------------------------
// 인생 RPG 몬스터
// ---------------------------------------------------------------------------
export const MONSTER_TOP: Record<MonsterKind, number> = { slime: -96, ghost: -190, golem: -200, dragon: -190, bat: -170 };

function MonsterArt({ kind, face, pen }: { kind: MonsterKind; face: Face; pen: Pen }) {
  const st = { stroke: INK, strokeWidth: pen.w, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };
  const angry = face === 'angry' || face === 'rage' || face === 'smug';
  const eyes = (cx: number, cy: number, gap: number, r = 5, glow = false) => (
    <g>
      {[-1, 1].map((s) => (
        <g key={s}>
          {glow ? <ellipse cx={cx + s * gap} cy={cy} rx={r * 1.3} ry={r} fill="#ffe14d" stroke={INK} strokeWidth={pen.t} /> : <circle cx={cx + s * gap} cy={cy} r={r} fill={INK} />}
          {!glow && <circle cx={cx + s * gap + 1.5} cy={cy - 1.5} r={1.6} fill="#ffffff" />}
          {angry && <path d={d`M ${cx + s * (gap + 9)} ${cy - 12} L ${cx + s * (gap - 5)} ${cy - 6}`} stroke={INK} strokeWidth={pen.f * 1.2} strokeLinecap="round" />}
        </g>
      ))}
    </g>
  );
  switch (kind) {
    case 'slime':
      return (
        <g>
          <path d={d`M ${-62} ${0} Q ${-70} ${-50} ${-30} ${-76} Q ${-8} ${-98} ${8} ${-88} Q ${16} ${-102} ${30} ${-82} Q ${66} ${-60} ${62} ${0} Z`} fill="#8fd694" {...st} />
          <path d={d`M ${-40} ${-50} Q ${-34} ${-66} ${-18} ${-72}`} stroke="#ffffff" strokeWidth={pen.w * 1.5} fill="none" strokeLinecap="round" />
          {eyes(4, -42, 18)}
          <path d={d`M ${-10} ${-22} Q ${4} ${-12} ${18} ${-22}`} fill="none" stroke={INK} strokeWidth={pen.f} strokeLinecap="round" />
        </g>
      );
    case 'ghost':
      return (
        <g>
          <path d={d`M ${-52} ${-40} Q ${-56} ${-186} ${0} ${-190} Q ${56} ${-186} ${52} ${-40} Q ${40} ${-24} ${30} ${-40} Q ${18} ${-24} ${6} ${-40} Q ${-6} ${-24} ${-18} ${-40} Q ${-30} ${-24} ${-40} ${-40} Q ${-46} ${-30} ${-52} ${-40} Z`} fill="#f4f6fb" {...st} />
          <ellipse cx={-17} cy={-128} rx={7} ry={11} fill={INK} />
          <ellipse cx={17} cy={-128} rx={7} ry={11} fill={INK} />
          <ellipse cx={0} cy={-96} rx={9} ry={12} fill="#5a2424" />
          <path d={d`M ${52} ${-100} q ${20} ${-6} ${26} ${10}`} fill="none" {...st} />
        </g>
      );
    case 'golem':
      return (
        <g>
          <path d={d`M ${-56} ${0} L ${-62} ${-60} L ${-40} ${-120} L ${38} ${-126} L ${62} ${-64} L ${56} ${0} Z`} fill="#9aa1ab" {...st} />
          <path d={d`M ${-30} ${-126} L ${-36} ${-176} L ${-6} ${-200} L ${30} ${-186} L ${34} ${-128} Z`} fill="#b3b9c2" {...st} />
          <path d={d`M ${-62} ${-100} L ${-92} ${-56} L ${-78} ${-14} L ${-56} ${-40} Z M ${62} ${-100} L ${92} ${-56} L ${78} ${-14} L ${56} ${-40} Z`} fill="#8a919b" {...st} />
          <path d={d`M ${-20} ${-70} l ${14} ${10} l ${-6} ${16} M ${20} ${-40} l ${-10} ${-8}`} fill="none" stroke={INK} strokeWidth={pen.t} />
          {eyes(0, -160, 13, 5, true)}
          <path d={d`M ${-12} ${-140} L ${12} ${-140}`} stroke={INK} strokeWidth={pen.f} strokeLinecap="round" />
        </g>
      );
    case 'dragon':
      return (
        <g>
          <path d={d`M ${-40} ${-70} Q ${-80} ${-140} ${-104} ${-120} Q ${-90} ${-100} ${-98} ${-78} Q ${-70} ${-86} ${-40} ${-70} Z`} fill="#9b7ae0" {...st} />
          <path d={d`M ${-50} ${-20} Q ${-100} ${-10} ${-110} ${-40} Q ${-96} ${-28} ${-80} ${-36}`} fill="#ef6b5b" {...st} />
          <ellipse cx={-8} cy={-58} rx={52} ry={56} fill="#ef6b5b" {...st} />
          <ellipse cx={4} cy={-44} rx={30} ry={36} fill="#ffd9a8" {...st} />
          <path d={d`M ${-20} ${-110} Q ${-30} ${-190} ${30} ${-186} Q ${84} ${-180} ${78} ${-140} Q ${74} ${-112} ${30} ${-112} Z`} fill="#ef6b5b" {...st} />
          <path d={d`M ${-6} ${-180} L ${-14} ${-204} L ${6} ${-186} M ${30} ${-186} L ${34} ${-210} L ${46} ${-184}`} fill="#ffd166" {...st} />
          {eyes(26, -156, 14, 5)}
          <circle cx={66} cy={-140} r={2.4} fill={INK} />
          <path d={d`M ${40} ${-126} Q ${56} ${-118} ${70} ${-128}`} fill="none" stroke={INK} strokeWidth={pen.f} strokeLinecap="round" />
          <path d={d`M ${-30} ${-4} L ${-30} ${4} M ${16} ${-4} L ${16} ${4}`} stroke={INK} strokeWidth={pen.w * 3} strokeLinecap="round" />
        </g>
      );
    case 'bat':
      return (
        <g>
          <path d={d`M ${-30} ${-120} Q ${-70} ${-170} ${-110} ${-140} Q ${-96} ${-128} ${-100} ${-110} Q ${-84} ${-118} ${-76} ${-100} Q ${-60} ${-114} ${-30} ${-96} Z M ${30} ${-120} Q ${70} ${-170} ${110} ${-140} Q ${96} ${-128} ${100} ${-110} Q ${84} ${-118} ${76} ${-100} Q ${60} ${-114} ${30} ${-96} Z`} fill="#6b4fa8" {...st} />
          <ellipse cx={0} cy={-110} rx={36} ry={34} fill="#8a6fd0" {...st} />
          <path d={d`M ${-24} ${-136} L ${-30} ${-160} L ${-10} ${-142} M ${24} ${-136} L ${30} ${-160} L ${10} ${-142}`} fill="#8a6fd0" {...st} />
          {eyes(0, -116, 12, 4.5)}
          <path d={d`M ${-10} ${-96} L ${-6} ${-88} L ${-2} ${-96} M ${2} ${-96} L ${6} ${-88} L ${10} ${-96}`} fill="#ffffff" stroke={INK} strokeWidth={pen.t} />
        </g>
      );
  }
}

// ---------------------------------------------------------------------------
// 인물 한 명 — 인물 좌표로 그린다 (컷에서 옮기고 키운다)
// ---------------------------------------------------------------------------
export interface ToonOpts {
  /** 화면 확대 비율 (선 굵기를 맞추는 데 쓴다) */
  z: number;
  drama?: boolean;
}

export function penOf(z: number, drama = false): Pen {
  const k = 1 / Math.sqrt(Math.max(0.4, z));
  return { w: 4.2 * k * (drama ? 1.15 : 1), t: 2.6 * k, f: 3.6 * k, drama };
}

export function Toon({ a, z, drama }: { a: Actor } & ToonOpts) {
  const pen = penOf(z, drama);
  if (a.role === 'mirror') return <MirrorArt a={a} pen={pen} />;
  if (a.role === 'monster') return <MonsterArt kind={a.monster ?? 'slime'} face={a.face} pen={pen} />;
  const D = dimsOf(a);
  const g = rigOf(a);
  const look = lookOf(a);
  const female = a.gender === 'female';
  const acc = look.acc;
  const skin = acc.includes('stone') ? '#c4c4c4' : SKIN;
  const outfit = acc.includes('stone') ? '#a9a9a9' : look.outfit;
  const sleeve = look.wear === 'coat' ? '#ffffff' : look.wear === 'armor' ? '#b9c4da' : outfit;
  const torsoColor = look.wear === 'coat' ? outfit : look.wear === 'armor' ? '#b9c4da' : outfit;
  const pants = acc.includes('stone') ? '#9a9a9a' : look.wear === 'pajama' ? lighten(outfit, 0.15) : PANTS;
  const handR = D.limb * 0.66;
  const lx = a.front ? 0 : 7;
  const torsoAngle = Math.atan2(g.neck[0] - g.hip[0], -(g.neck[1] - g.hip[1])) * (180 / Math.PI);
  const hipJ = (side: 1 | -1): Pt => add(g.hip, rot([side * D.botW * 0.24, 0], torsoAngle));
  const leg = (side: 1 | -1) => {
    const h = hipJ(side);
    const f = side > 0 ? g.fR : g.fL;
    const k = side > 0 ? g.kR : g.kL;
    const path = k ? d`M ${h[0]} ${h[1]} L ${k[0]} ${k[1]} L ${f[0]} ${f[1] - 4}` : d`M ${h[0]} ${h[1]} L ${f[0]} ${f[1] - 4}`;
    return (
      <g key={`leg${side}`}>
        <Limb dPath={path} color={pants} width={D.limb + 3} pen={pen} />
        <ellipse cx={f[0] + 4} cy={f[1] - 3} rx={12} ry={6.5} fill={SHOE} stroke={INK} strokeWidth={pen.w * 0.8} />
      </g>
    );
  };
  const arm = (side: 1 | -1) => {
    const s = side > 0 ? g.shR : g.shL;
    const h = side > 0 ? g.hR : g.hL;
    const e = (side > 0 ? g.eR : g.eL) ?? autoElbow(s, h, side, D.arm);
    return <Limb key={`arm${side}`} dPath={curveThrough(s, e, h)} color={sleeve} width={D.limb} pen={pen} />;
  };
  const handAt = (side: 1 | -1) => {
    const h = side > 0 ? g.hR : g.hL;
    const pointing = side > 0 && g.pointR;
    return (
      <g key={`hand${side}`}>
        {pointing && <path d={d`M ${h[0]} ${h[1]} l ${14} ${-2}`} stroke={INK} strokeWidth={pen.w * 2.6} strokeLinecap="round" />}
        {pointing && <path d={d`M ${h[0]} ${h[1]} l ${14} ${-2}`} stroke={skin} strokeWidth={pen.w * 1.1} strokeLinecap="round" />}
        {hand(h, pen, handR, skin)}
      </g>
    );
  };
  // 큰 물건은 얼굴을 가리지 않게 조금 아래로
  const shift: Pt = !g.overhead && a.held === 'moneybag' ? [10, 30] : !g.overhead && (a.held === 'box' || a.held === 'chicken' || a.held === 'bowl') ? [4, 10] : [0, 0];
  const heldNode = a.held ? (
    <g transform={`translate(${g.item[0] + shift[0]} ${g.item[1] + shift[1]})`}>
      <HeldArt held={a.held} pen={pen} />
    </g>
  ) : null;
  const bigItem = a.held === 'barbell' || a.held === 'globe' || a.held === 'docs' || a.held === 'moneybag' || a.held === 'umbrella';
  const sym = a.el && a.role === 'me' ? a.sym ?? 'normal' : null;

  const headNode = (
    <g transform={`translate(${g.head[0]} ${g.head[1]}) rotate(${g.tilt})`}>
      <HairBack hair={look.hair} D={D} color={look.hairColor} pen={pen} />
      {/* 귀 */}
      {!g.back && look.hair !== 'long' && look.hair !== 'bob' && (
        <g>
          <ellipse cx={-D.rx + 1} cy={6} rx={7} ry={9} fill={skin} stroke={INK} strokeWidth={pen.w * 0.8} />
          <ellipse cx={D.rx - 1} cy={6} rx={7} ry={9} fill={skin} stroke={INK} strokeWidth={pen.w * 0.8} />
        </g>
      )}
      <path d={headPath(D.rx, D.ry)} fill={skin} stroke={INK} strokeWidth={pen.w} strokeLinejoin="round" />
      {g.back ? (
        // 엎어진 뒤통수
        <path d={headPath(D.rx * 0.96, D.ry * 0.96)} fill={look.hair === 'bald3' ? skin : look.hairColor} stroke={INK} strokeWidth={pen.w * 0.9} />
      ) : (
        <g>
          {drama || a.face === 'serious' ? <DramaFace face={a.face} D={D} pen={pen} lx={lx} /> : <FaceArt face={a.face} D={D} pen={pen} lx={lx} />}
          {look.mustache && <path d={d`M ${lx - 13} ${D.ry * 0.38} Q ${lx - 6} ${D.ry * 0.3} ${lx} ${D.ry * 0.38} Q ${lx + 6} ${D.ry * 0.3} ${lx + 13} ${D.ry * 0.38} Q ${lx + 6} ${D.ry * 0.48} ${lx} ${D.ry * 0.42} Q ${lx - 6} ${D.ry * 0.48} ${lx - 13} ${D.ry * 0.38} Z`} fill="#3a3230" stroke={INK} strokeWidth={pen.t * 0.8} />}
        </g>
      )}
      {!g.back && <HairFront hair={look.hair} D={D} color={look.hairColor} pen={pen} sym={!!sym} />}
      {!g.back && <HeadAcc acc={acc} D={D} pen={pen} lx={lx} />}
      {sym && a.el && <ElementMark el={a.el} state={sym} D={D} pen={pen} />}
      {acc.includes('stone') && (
        <g>
          <path d={headPath(D.rx, D.ry)} fill="#9a9a9a" opacity={0.45} />
          <path d={d`M ${-D.rx * 0.2} ${-D.ry} l ${8} ${18} l ${-10} ${12} l ${8} ${16}`} fill="none" stroke={INK} strokeWidth={pen.t} />
        </g>
      )}
    </g>
  );

  const behind = [acc.includes('cape') && <path key="cape" d={d`M ${g.shL[0]} ${g.shL[1]} L ${g.shR[0]} ${g.shR[1]} L ${g.hip[0] - 46} ${-4} L ${g.hip[0] - 70} ${-20} Z`} fill="#e5484d" stroke={INK} strokeWidth={pen.w} strokeLinejoin="round" />, acc.includes('wings') && (
    <g key="wings">
      {[-1, 1].map((s) => (
        <path key={s} d={d`M ${g.neck[0] - 6} ${g.neck[1] + 20} Q ${g.neck[0] - 70} ${g.neck[1] - 50 + s * 16} ${g.neck[0] - 96} ${g.neck[1] - 4 + s * 10} Q ${g.neck[0] - 70} ${g.neck[1] + 6} ${g.neck[0] - 74} ${g.neck[1] + 30} Q ${g.neck[0] - 40} ${g.neck[1] + 20} ${g.neck[0] - 6} ${g.neck[1] + 20} Z`} fill="#ffffff" stroke={INK} strokeWidth={pen.w} strokeLinejoin="round" />
      ))}
    </g>
  )];

  const longBack = look.hair === 'long' && !g.back ? (
    <g transform={`translate(${g.head[0]} ${g.head[1]}) rotate(${g.tilt})`}>
      <HairBack hair="long" D={D} color={look.hairColor} pen={pen} />
    </g>
  ) : null;

  return (
    <g>
      {behind}
      {longBack}
      {acc.includes('roots') && (
        <g fill="none" stroke="#8a5a3c" strokeWidth={pen.w * 1.4} strokeLinecap="round">
          {[-18, -6, 8, 20].map((x, i) => (
            <path key={x} d={d`M ${x} ${-4} Q ${x + (i % 2 ? 14 : -14)} ${10} ${x + (i % 2 ? 6 : -10)} ${24}`} />
          ))}
        </g>
      )}
      {/* 뒤쪽 팔 */}
      {!g.crossed && arm(-1)}
      {!g.crossed && !g.overhead && handAt(-1)}
      {leg(-1)}
      {leg(1)}
      {/* 몸통 */}
      <g transform={`translate(${g.hip[0]} ${g.hip[1]}) rotate(${torsoAngle})`}>
        <path d={torsoPath(D)} fill={torsoColor} stroke={INK} strokeWidth={pen.w} strokeLinejoin="round" />
        {look.skirt && <path d={d`M ${-D.botW / 2 - 2} ${-4} L ${D.botW / 2 + 2} ${-4} L ${D.botW / 2 + 10} ${D.leg * 0.5} L ${-D.botW / 2 - 10} ${D.leg * 0.5} Z`} fill="#3d4f7a" stroke={INK} strokeWidth={pen.w} strokeLinejoin="round" />}
        <WearDetail wear={look.wear} D={D} color={outfit} pen={pen} female={female} />
      </g>
      {/* 큰 물건은 머리 뒤·앞 사이 */}
      {bigItem && g.overhead && heldNode}
      {headNode}
      {g.crossed && (
        <g>
          <Limb dPath={d`M ${g.shL[0] + 4} ${g.shL[1] + 6} Q ${0} ${g.neck[1] + D.torso * 0.5} ${D.topW * 0.36} ${g.neck[1] + D.torso * 0.4}`} color={sleeve} width={D.limb} pen={pen} />
          <Limb dPath={d`M ${g.shR[0] - 2} ${g.shR[1] + 6} Q ${4} ${g.neck[1] + D.torso * 0.62} ${-D.topW * 0.34} ${g.neck[1] + D.torso * 0.42}`} color={sleeve} width={D.limb} pen={pen} />
          {hand([D.topW * 0.38, g.neck[1] + D.torso * 0.4], pen, handR, skin)}
          {hand([-D.topW * 0.36, g.neck[1] + D.torso * 0.42], pen, handR, skin)}
        </g>
      )}
      {!g.crossed && arm(1)}
      {!bigItem && !g.overhead && heldNode}
      {bigItem && !g.overhead && heldNode}
      {!g.crossed && handAt(1)}
      {g.overhead && handAt(-1)}
      {g.overhead && !bigItem && heldNode}
      {acc.includes('stone') && <path d={d`M ${-D.botW / 2} ${-10} l ${10} ${-20} l ${-6} ${-14}`} fill="none" stroke={INK} strokeWidth={pen.t} />}
    </g>
  );
}

// ---------------------------------------------------------------------------
// 컷 좌표에서의 자리 (말풍선·효과 배치용)
// ---------------------------------------------------------------------------
export interface Anchor {
  /** 머리 가운데 */
  x: number;
  cy: number;
  /** 머리 반지름(가로) */
  r: number;
  /** 머리(효과·마크 포함) 꼭대기 */
  top: number;
  /** 머리카락 꼭대기 */
  bare: number;
  chin: number;
  mouth: Pt;
  /** 몸통 영역 */
  body: { x: number; y: number; w: number; h: number };
  /** 오른쪽(+1)/왼쪽(-1)을 본다 */
  dir: 1 | -1;
}

/** 인물 좌표 → 컷 좌표 변환 정보 */
export interface Place {
  x: number;
  /** 바닥 높이 (컷 좌표) */
  G: number;
  /** 배율 (scale 포함) */
  s: number;
  dir: 1 | -1;
  /** 띄운 높이 (인물 단위) */
  lift: number;
}

export function placeOf(a: Actor, G: number, z: number): Place {
  return { x: a.x, G, s: z * (a.scale ?? 1), dir: a.dir ?? 1, lift: a.role === 'mirror' ? 0 : (a.lift ?? 0) };
}

export function toPanel(p: Place, [x, y]: Pt): Pt {
  return [p.x + x * p.s * p.dir, p.G + (y - p.lift) * p.s];
}

export function anchorOf(a: Actor, p: Place): Anchor {
  if (a.role === 'mirror') {
    const y0 = MIRROR_Y - (a.lift ?? 0);
    const c = toPanel(p, [0, y0]);
    const r = 43 * p.s;
    return { x: c[0], cy: c[1], r, top: c[1] - r - 6 * p.s, bare: c[1] - r, chin: c[1] + r, mouth: toPanel(p, [0, y0 + 14]), body: { x: c[0] - r * 0.4, y: c[1] + r, w: r * 0.8, h: 40 * p.s }, dir: p.dir };
  }
  if (a.role === 'monster') {
    const top = MONSTER_TOP[a.monster ?? 'slime'];
    const k = a.monster ?? 'slime';
    const headY = k === 'slime' ? top * 0.5 : k === 'golem' ? -160 : k === 'dragon' ? -150 : k === 'ghost' ? -120 : -112;
    const c = toPanel(p, [k === 'dragon' ? 28 : 0, headY]);
    const r = (k === 'slime' ? 62 : 52) * p.s;
    const t = toPanel(p, [0, top]);
    const b = toPanel(p, [0, 0]);
    return { x: c[0], cy: c[1], r, top: t[1], bare: t[1], chin: c[1] + r * 0.8, mouth: [c[0], c[1] + r * 0.4], body: { x: b[0] - 60 * p.s, y: c[1], w: 120 * p.s, h: b[1] - c[1] }, dir: p.dir };
  }
  const D = dimsOf(a);
  const g = rigOf(a);
  const tiltY = Math.abs(g.tilt) > 45;
  const hx = tiltY ? D.ry : D.rx;
  const hy = tiltY ? D.rx : D.ry;
  const c = toPanel(p, g.head);
  const r = hx * 1.06 * p.s;
  const hairTop = hy * 1.08;
  let topLocal = g.head[1] - hairTop;
  if (a.el && !tiltY) topLocal -= a.sym === 'flare' ? 44 : 32;
  const fxUp = (a.fx ?? []).some((f) => ['question', 'exclaim', 'bulb', 'bulbs', 'zzz', 'music', 'steam', 'cloud', 'dots', 'lightning', 'stars', 'soul'].includes(f));
  if (fxUp) topLocal -= 30;
  if ((a.acc ?? []).some((x) => x === 'halo' || x === 'crown' || x === 'nest')) topLocal -= 22;
  if (g.overhead && a.held) topLocal = Math.min(topLocal, g.item[1] - (a.held === 'docs' ? 120 : a.held === 'globe' ? 90 : 30));
  if (a.pose === 'cheer' || a.pose === 'wave') topLocal = Math.min(topLocal, Math.min(g.hR[1], g.hL[1]) - 14);
  const top = p.G + (topLocal - p.lift) * p.s;
  const bare = p.G + (g.head[1] - hairTop - p.lift) * p.s;
  const chin = c[1] + hy * p.s;
  const mouth = toPanel(p, [g.head[0] + 6, g.head[1] + D.ry * 0.5]);
  const bTop = toPanel(p, g.neck);
  const bBot = toPanel(p, [0, 0]);
  const half = (D.botW / 2 + 10) * p.s;
  const bx = Math.min(bTop[0], bBot[0]) - half;
  const bw = Math.abs(bTop[0] - bBot[0]) + half * 2;
  return { x: c[0], cy: c[1], r, top, bare, chin, mouth, body: { x: bx, y: Math.min(bTop[1], bBot[1]), w: bw, h: Math.abs(bBot[1] - bTop[1]) }, dir: p.dir };
}

export type { Pen };
