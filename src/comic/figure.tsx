/**
 * 웹툰 인물 v2 — 외부 이미지 없이 SVG로 그린다.
 *  - 3.5등신 비율, 턱선이 있는 얼굴, 홍채 그라데이션·하이라이트가 있는 눈, 결과 광택이 있는 머리카락
 *  - 셀 음영(얼굴·몸통·앞머리 그림자), 손 모양(주먹·편 손·가리키기), 직업과 장면에 맞는 옷차림
 *  - 거울 요정 '명경이'(해설 역할)
 * 좌표는 발 중심(0,0) 기준이며 위쪽이 음수다. 오른쪽(+x)을 보는 모습으로 그리고, 왼쪽을 볼 때는 뒤집는다.
 */
import type { ReactNode } from 'react';
import { d, darken, elbowIK, heartPath, lerp, lighten, starPath, type Pt } from './draw.ts';
import { HeldView } from './scene.tsx';
import type { Actor, Age, Face, Fx, Pose, Wear } from './types.ts';

export const LINE = '#47342e';
export const SKIN = '#ffe4d1';
export const SKIN_SHADE = '#f5c1a5';
const WHITE = '#ffffff';
const BLUSH = '#ff8a8a';

// ---------------------------------------------------------------------------
// 몸의 치수
// ---------------------------------------------------------------------------
export interface Geo {
  /** 머리(두개) 반지름 */
  R: number;
  /** 머리 중심 높이 */
  hy: number;
  /** 어깨 높이·반폭 */
  sy: number;
  sw: number;
  /** 허리 */
  wy: number;
  ww: number;
  /** 골반 */
  py: number;
  pw: number;
  /** 발목 */
  ay: number;
  leg: number;
  neck: number;
  arm: number;
  hand: number;
  ua: number;
  fa: number;
}

const GEO: Record<Age, { m: Geo; f: Geo }> = {
  adult: {
    m: { R: 33, hy: -205, sy: -158, sw: 30, wy: -110, ww: 23, py: -96, pw: 25, ay: -12, leg: 11, neck: 10, arm: 12.5, hand: 8.5, ua: 34, fa: 32 },
    f: { R: 33, hy: -200, sy: -155, sw: 26, wy: -108, ww: 19.5, py: -95, pw: 24, ay: -12, leg: 10, neck: 8.5, arm: 11, hand: 8, ua: 33, fa: 31 },
  },
  teen: {
    m: { R: 32, hy: -190, sy: -145, sw: 27, wy: -101, ww: 21, py: -88, pw: 22.5, ay: -11, leg: 10, neck: 9, arm: 11.5, hand: 8, ua: 31, fa: 29 },
    f: { R: 32, hy: -186, sy: -142, sw: 24, wy: -99, ww: 18.5, py: -87, pw: 22, ay: -11, leg: 9.5, neck: 8, arm: 10.5, hand: 7.5, ua: 30, fa: 28 },
  },
  kid: {
    m: { R: 30, hy: -136, sy: -96, sw: 21, wy: -66, ww: 19, py: -58, pw: 19, ay: -9, leg: 9, neck: 7, arm: 10, hand: 7, ua: 22, fa: 20 },
    f: { R: 30, hy: -136, sy: -96, sw: 20, wy: -66, ww: 18, py: -58, pw: 18.5, ay: -9, leg: 8.5, neck: 7, arm: 9.5, hand: 7, ua: 22, fa: 20 },
  },
  senior: {
    m: { R: 33, hy: -198, sy: -151, sw: 30, wy: -104, ww: 26, py: -91, pw: 26, ay: -12, leg: 11, neck: 10, arm: 12.5, hand: 8.5, ua: 33, fa: 31 },
    f: { R: 33, hy: -192, sy: -147, sw: 26.5, wy: -101, ww: 23, py: -89, pw: 25.5, ay: -12, leg: 10, neck: 8.5, arm: 11.5, hand: 8, ua: 32, fa: 30 },
  },
};

export function geoOf(a: Pick<Actor, 'age' | 'gender'>): Geo {
  return GEO[a.age ?? 'adult'][a.gender === 'female' ? 'f' : 'm'];
}

// ---------------------------------------------------------------------------
// 생김새 (역할·성별·나이·옷)
// ---------------------------------------------------------------------------
type Hair = 'swept' | 'comma' | 'spiky' | 'slick' | 'buzz' | 'balding' | 'long' | 'side' | 'bob' | 'ponytail' | 'bun' | 'lowbun' | 'pigtails' | 'perm';
type Lower = 'pants' | 'skirt' | 'shorts' | 'longskirt';

interface Look {
  hair: Hair;
  hairColor: string;
  wear: Wear;
  /** 겉옷(주된 옷) 색 */
  color: string;
  /** 안에 받쳐 입은 옷 색 (정장·가운·앞치마·카디건) */
  inner: string;
  /** 넥타이·리본 색 */
  accent: string;
  bottom: string;
  lower: Lower;
  shoes: string;
  glasses: boolean;
  ahoge: boolean;
  lashes: boolean;
  iris: string;
  wrinkles: boolean;
}

const HAIR_DARK = '#33262a';
const GRAY = '#d4cec7';

function lookOf(a: Actor): Look {
  const f = a.gender === 'female';
  const age = a.age ?? 'adult';
  const L: Look = {
    hair: f ? 'long' : 'swept',
    hairColor: HAIR_DARK,
    wear: 'tee',
    color: a.outfit ?? '#5a8fd8',
    inner: '#f7f5f0',
    accent: a.outfit ?? '#e5484d',
    bottom: '#4a5068',
    lower: 'pants',
    shoes: '#4a3a38',
    glasses: false,
    ahoge: false,
    lashes: f,
    iris: '#6a4536',
    wrinkles: age === 'senior',
  };
  switch (a.role) {
    case 'me': {
      L.ahoge = true;
      if (age === 'kid') Object.assign(L, { hair: f ? 'pigtails' : 'buzz', wear: 'kidtee', bottom: '#5b7fb8', lower: f ? 'skirt' : 'shorts', shoes: '#f3efe9' });
      else if (age === 'teen') Object.assign(L, { hair: f ? 'long' : 'swept', wear: 'uniform', color: '#3e4a6c', bottom: f ? '#56607c' : '#454b62', lower: f ? 'skirt' : 'pants', shoes: '#3b2f2d' });
      else if (age === 'senior') Object.assign(L, { hair: f ? 'perm' : 'swept', hairColor: GRAY, wear: 'cardigan', glasses: true, bottom: '#5a5f70', lower: f ? 'longskirt' : 'pants' });
      else Object.assign(L, { wear: 'knit', lower: 'pants', bottom: f ? '#56607a' : '#454c63' });
      break;
    }
    case 'partner':
      if (f) Object.assign(L, { hair: 'side', hairColor: '#7a4a35', wear: 'blouse', color: '#f4a9bb', bottom: '#5a5f78', lower: 'skirt', iris: '#8a5a44' });
      else Object.assign(L, { hair: 'comma', hairColor: '#4a3328', wear: 'shirt', color: '#62b5aa', bottom: '#3f4a5c' });
      break;
    case 'friend':
      if (f) Object.assign(L, { hair: 'ponytail', hairColor: '#5e3a2c', wear: 'knit', color: '#b9a0e2', bottom: '#4b5873' });
      else Object.assign(L, { hair: 'spiky', hairColor: '#8a5a3a', wear: 'hoodie', color: '#a68ad6', bottom: '#4b5873', iris: '#7a5238' });
      break;
    case 'coworker':
      if (f) Object.assign(L, { hair: 'bob', hairColor: '#5a3f33', wear: 'blouse', color: '#e8cba3', bottom: '#5c6175', lower: 'skirt' });
      else Object.assign(L, { hair: 'swept', hairColor: '#6a4a3a', wear: 'shirt', color: '#a9c6e8', bottom: '#4f566b', glasses: true });
      break;
    case 'boss':
      if (f) Object.assign(L, { hair: 'lowbun', hairColor: '#3b302c', wear: 'suit', color: '#3f4a63', inner: '#efe8dc', accent: '#efe8dc', bottom: '#3f4a63', glasses: true });
      else Object.assign(L, { hair: 'slick', hairColor: '#3a3433', wear: 'suit', color: '#4d5566', accent: '#c9483f', bottom: '#4d5566', glasses: true });
      break;
    case 'teacher':
      Object.assign(L, { hair: f ? 'bob' : 'slick', hairColor: '#4a3a33', wear: 'cardigan', color: f ? '#8bb38e' : '#7fa47f', inner: '#f4f1ea', glasses: true, bottom: '#575c6c', lower: f ? 'skirt' : 'pants' });
      break;
    case 'parent':
      if (f) Object.assign(L, { hair: 'lowbun', hairColor: '#4a3a33', wear: 'apron', color: '#fbf3e6', inner: '#e8a07c', bottom: '#6a6070' });
      else Object.assign(L, { hair: 'swept', hairColor: '#4a3a33', wear: 'knit', color: '#9c8672', bottom: '#4f5566' });
      break;
    case 'child':
      Object.assign(L, { hair: f ? 'pigtails' : 'buzz', hairColor: '#3b2b25', wear: 'kidtee', color: f ? '#ffd166' : '#7cc3e8', bottom: '#5b7fb8', lower: f ? 'skirt' : 'shorts', shoes: '#f3efe9' });
      break;
    case 'elder':
      if (f) Object.assign(L, { hair: 'perm', hairColor: GRAY, wear: 'cardigan', color: '#c9a3c4', inner: '#f6efe6', bottom: '#5f6372', lower: 'longskirt' });
      else Object.assign(L, { hair: 'balding', hairColor: GRAY, wear: 'cardigan', color: '#9db79c', inner: '#f3efe6', bottom: '#5a5f70', glasses: true });
      break;
    case 'mirror':
      break;
  }
  if (a.wear) {
    L.wear = a.wear;
    if (a.wear === 'coat' && a.role !== 'me') Object.assign(L, { inner: L.color, color: '#f8f9fb' });
    if (a.role === 'me') {
      // 주인공의 오행 색은 옷 종류에 따라 다른 곳에 들어간다
      const c = a.outfit ?? '#5a8fd8';
      if (a.wear === 'suit') Object.assign(L, { color: '#3f4658', inner: '#f7f5f0', accent: c, bottom: '#3f4658' });
      else if (a.wear === 'coat') Object.assign(L, { color: '#f8f9fb', inner: c });
      else if (a.wear === 'apron') Object.assign(L, { color: '#5b4a40', inner: c });
      else if (a.wear === 'uniform') Object.assign(L, { color: '#3e4a6c', accent: c });
      else if (a.wear === 'dress') Object.assign(L, { color: c, lower: 'skirt' });
      else Object.assign(L, { color: c });
      if (f && (a.wear === 'blouse' || a.wear === 'dress' || (a.wear === 'uniform' && age !== 'adult'))) L.lower = 'skirt';
      else if (age === 'kid') L.lower = f ? 'skirt' : 'shorts';
      else if (age === 'senior' && f) L.lower = 'longskirt';
      else L.lower = 'pants';
      if (a.wear === 'pajama') Object.assign(L, { bottom: c, lower: 'pants' });
    }
  }
  return L;
}

// ---------------------------------------------------------------------------
// 표정
// ---------------------------------------------------------------------------
type EyeK = 'open' | 'smile' | 'closed' | 'squeeze' | 'heart' | 'shock' | 'teary' | 'sparkle';
type BrowK = 'normal' | 'up' | 'worry' | 'angry' | 'firm' | 'relaxed' | 'flat';
type MouthK = 'smile' | 'small' | 'open' | 'laugh' | 'flat' | 'frown' | 'o' | 'O' | 'wavy' | 'smirk' | 'shout' | 'cat' | 'cry';

interface FaceSpec {
  eye: EyeK;
  open?: number;
  iris?: number;
  look?: Pt;
  brow: BrowK;
  mouth: MouthK;
  blush?: 0 | 1 | 2;
  tilt?: number;
  tears?: boolean;
  shade?: boolean;
  sweat?: boolean;
  bags?: boolean;
}

const FACES: Record<Face, FaceSpec> = {
  neutral: { eye: 'open', brow: 'normal', mouth: 'small' },
  smile: { eye: 'open', open: 0.9, brow: 'relaxed', mouth: 'smile', blush: 1, tilt: 3 },
  grin: { eye: 'smile', brow: 'relaxed', mouth: 'open', blush: 1, tilt: 3 },
  laugh: { eye: 'smile', brow: 'up', mouth: 'laugh', blush: 1, tilt: -4 },
  sad: { eye: 'open', open: 0.74, look: [0, 0.3], brow: 'worry', mouth: 'frown', tilt: 5 },
  cry: { eye: 'teary', open: 0.85, brow: 'worry', mouth: 'cry', blush: 1, tilt: 4, tears: true },
  angry: { eye: 'open', open: 0.8, iris: 0.78, brow: 'angry', mouth: 'shout', tilt: 2 },
  surprised: { eye: 'open', open: 1.22, iris: 0.68, brow: 'up', mouth: 'o', tilt: -3 },
  worried: { eye: 'open', open: 0.95, iris: 0.86, brow: 'worry', mouth: 'wavy', tilt: 3 },
  determined: { eye: 'open', open: 0.84, brow: 'firm', mouth: 'smirk', tilt: 2 },
  nervous: { eye: 'open', open: 1.05, iris: 0.66, brow: 'worry', mouth: 'wavy', sweat: true, tilt: -2 },
  love: { eye: 'heart', brow: 'up', mouth: 'open', blush: 2, tilt: 5 },
  tired: { eye: 'open', open: 0.42, look: [0, 0.25], brow: 'relaxed', mouth: 'o', bags: true, tilt: 6 },
  proud: { eye: 'closed', brow: 'up', mouth: 'cat', blush: 1, tilt: -6 },
  thinking: { eye: 'open', open: 0.82, look: [0.35, -0.32], brow: 'firm', mouth: 'smirk', tilt: -5 },
  shock: { eye: 'shock', brow: 'up', mouth: 'O', shade: true },
  shy: { eye: 'open', open: 0.78, look: [-0.42, 0.28], brow: 'worry', mouth: 'small', blush: 2, tilt: 7 },
  calm: { eye: 'closed', brow: 'relaxed', mouth: 'smile', blush: 1, tilt: 3 },
  annoyed: { eye: 'open', open: 0.48, iris: 0.86, brow: 'flat', mouth: 'flat' },
  sparkle: { eye: 'sparkle', open: 1.08, brow: 'up', mouth: 'open', blush: 1, tilt: -3 },
};

const EYE: Record<Age, { ew: number; eh: number; ex: number; ey: number; my: number; chin: number }> = {
  kid: { ew: 0.25, eh: 0.31, ex: 0.42, ey: 0.36, my: 0.8, chin: 1.03 },
  teen: { ew: 0.235, eh: 0.285, ex: 0.41, ey: 0.32, my: 0.84, chin: 1.12 },
  adult: { ew: 0.225, eh: 0.265, ex: 0.4, ey: 0.3, my: 0.85, chin: 1.14 },
  senior: { ew: 0.21, eh: 0.21, ex: 0.4, ey: 0.3, my: 0.86, chin: 1.14 },
};

// ---------------------------------------------------------------------------
// 머리카락
// ---------------------------------------------------------------------------
interface FringeOpt {
  /** 앞머리 끝 높이 (R 단위, 머리 중심 기준) */
  tip: number;
  n: number;
  /** 가르마 위치 (R 단위) */
  part: number;
  /** 옆머리 끝 높이·바깥 폭 */
  side: number;
  sideX: number;
  vol?: number;
  depth?: number;
  /** 끝이 뾰족한 정도 (0~1) */
  sharp?: number;
}

function capOf(R: number, vol = 0) {
  return { cy: -0.05 * R, rx: (1.08 + vol * 0.4) * R, ry: (1.1 + vol) * R };
}

/** 앞머리 + 옆머리 한 덩어리 (윗선은 머리 둥근 선, 아랫선은 뾰족한 머리 결) */
function fringePath(R: number, o: FringeOpt): string {
  const { cy, rx, ry } = capOf(R, o.vol);
  const sx = o.sideX * R;
  const sy = o.side * R;
  const tip = o.tip * R;
  const depth = (o.depth ?? 0.34) * R;
  const sharp = o.sharp ?? 0.6;
  const end = 0.84 * R;
  const endY = tip - 0.1 * R;
  let p = d`M ${-sx} ${sy} C ${-sx - 0.08 * R} ${lerp(sy, cy, 0.5)} ${-rx} ${cy + 0.35 * R} ${-rx} ${cy} A ${rx} ${ry} 0 0 1 ${rx} ${cy} C ${rx} ${cy + 0.35 * R} ${sx + 0.08 * R} ${lerp(sy, cy, 0.5)} ${sx} ${sy}`;
  // 옆머리 안쪽 선 → 앞머리 오른쪽 끝
  p += d` C ${sx - 0.1 * R} ${sy - 0.3 * R} ${end + 0.02 * R} ${endY + 0.25 * R} ${end} ${endY}`;
  // 앞머리 결: 오른쪽에서 왼쪽으로
  const span = end * 2;
  const step = span / o.n;
  let prev: Pt = [end, endY];
  for (let i = 0; i < o.n; i++) {
    const cx = end - step * (i + 0.5);
    const lean = cx > o.part * R ? 1 : -1;
    const ty = tip + 0.05 * R * (1 - Math.abs(cx) / R) + (i % 2 ? 0.03 * R : 0);
    const T: Pt = [cx + lean * step * 0.22, ty];
    const vx = end - step * (i + 1);
    const nearPart = Math.abs(vx - o.part * R) < step * 0.6;
    const V: Pt = i === o.n - 1 ? [-end, endY] : [vx, (nearPart ? tip - depth * 1.7 : tip - depth) + (i % 2 ? -0.04 * R : 0)];
    // 골짜기 → 끝: 끝으로 갈수록 세로로 떨어지게
    p += d` Q ${lerp(prev[0], T[0], sharp)} ${lerp(prev[1], T[1], 1 - sharp)} ${T[0]} ${T[1]}`;
    p += d` Q ${lerp(T[0], V[0], 1 - sharp)} ${lerp(T[1], V[1], sharp)} ${V[0]} ${V[1]}`;
    prev = V;
  }
  // 왼쪽 끝 → 왼쪽 옆머리 안쪽 선
  p += d` C ${-end - 0.02 * R} ${endY + 0.25 * R} ${-sx + 0.1 * R} ${sy - 0.3 * R} ${-sx} ${sy} Z`;
  return p;
}

/** 뒷머리 (머리·몸 뒤) — len은 R 단위 길이, w는 아래쪽 반폭 */
function backPath(R: number, len: number, w: number, n: number, vol = 0, round = false): string {
  const { cy, rx, ry } = capOf(R, vol);
  const L = len * R;
  const W = w * R;
  let p = d`M ${-rx} ${cy} A ${rx} ${ry} 0 0 1 ${rx} ${cy} C ${rx + 0.1 * R} ${cy + 0.6 * R} ${W} ${L - 0.9 * R} ${W} ${L}`;
  if (round) {
    p += d` Q ${W * 0.9} ${L + 0.22 * R} ${W * 0.55} ${L + 0.08 * R} Q 0 ${L + 0.2 * R} ${-W * 0.55} ${L + 0.08 * R} Q ${-W * 0.9} ${L + 0.22 * R} ${-W} ${L}`;
  } else {
    const step = (W * 2) / n;
    for (let i = 0; i < n; i++) {
      const x0 = W - step * i;
      const tx = x0 - step * 0.5;
      const x1 = x0 - step;
      const ty = L + (i % 2 ? 0.1 : 0.22) * R;
      p += d` Q ${x0 - step * 0.15} ${ty - 0.05 * R} ${tx} ${ty} Q ${tx - step * 0.1} ${L - 0.15 * R} ${x1} ${L - (i === n - 1 ? 0 : 0.12 * R)}`;
    }
  }
  p += d` C ${-W} ${L - 0.9 * R} ${-rx - 0.1 * R} ${cy + 0.6 * R} ${-rx} ${cy} Z`;
  return p;
}

/** 곱슬 파마 (뽀글머리) 윤곽 */
function curlyPath(rx: number, ry: number, cy: number, from: number, to: number, bumps: number, bottomY: number): string {
  const pts: Pt[] = [];
  for (let i = 0; i <= bumps; i++) {
    const a = lerp(from, to, i / bumps);
    pts.push([Math.cos(a) * rx, cy + Math.sin(a) * ry]);
  }
  const br = (Math.hypot(pts[1][0] - pts[0][0], pts[1][1] - pts[0][1]) / 2) * 1.15;
  let p = d`M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) p += d` A ${br} ${br} 0 0 1 ${pts[i][0]} ${pts[i][1]}`;
  // 이마 쪽 아랫선 (작은 곱슬)
  const last = pts[pts.length - 1];
  const n2 = 5;
  for (let i = 1; i <= n2; i++) {
    const x = lerp(last[0], pts[0][0], i / n2);
    const y = bottomY + (i === n2 ? pts[0][1] - bottomY : 0);
    p += d` A ${br * 0.9} ${br * 0.9} 0 0 1 ${x} ${i === n2 ? pts[0][1] : y}`;
  }
  return `${p} Z`;
}

interface HairParts {
  back: ReactNode;
  /** 머리 위·뒤에 붙는 것 (묶은 머리 등) — 뒷머리와 함께 그린다 */
  front: string;
  /** 앞머리 아래 이마 그림자 대신 쓰는 모양 (없으면 앞머리 모양) */
  extra?: ReactNode;
  ears: 'both' | 'near' | 'none';
  /** 머리 꼭대기 추가 높이 (R 단위) */
  topExtra: number;
}

function hairOf(L: Look, R: number, ol: number): HairParts {
  const c = L.hairColor;
  const back = darken(c, 0.14);
  const st = { stroke: LINE, strokeWidth: ol, strokeLinejoin: 'round' as const };
  const tie = (x: number, y: number, r: number) => <ellipse cx={x} cy={y} rx={r * 0.55} ry={r} fill="#ff7aa0" {...st} />;
  switch (L.hair) {
    case 'swept':
      return { back: <path d={backPath(R, 0.55, 1.02, 4, 0.04, true)} fill={back} {...st} />, front: fringePath(R, { tip: -0.14, n: 5, part: 0.42, side: 0.42, sideX: 1.0, vol: 0.06, depth: 0.3 }), ears: 'near', topExtra: 0.06 };
    case 'comma':
      return {
        back: <path d={backPath(R, 0.55, 1.02, 4, 0.05, true)} fill={back} {...st} />,
        front: fringePath(R, { tip: -0.06, n: 4, part: 0.55, side: 0.4, sideX: 0.99, vol: 0.08, depth: 0.36, sharp: 0.7 }),
        extra: <path d={d`M ${0.5 * R} ${-0.2 * R} C ${0.86 * R} ${-0.12 * R} ${0.86 * R} ${0.22 * R} ${0.6 * R} ${0.24 * R} C ${0.66 * R} ${0.1 * R} ${0.62 * R} ${-0.06 * R} ${0.5 * R} ${-0.2 * R} Z`} fill={c} {...st} />,
        ears: 'near',
        topExtra: 0.08,
      };
    case 'spiky': {
      const spikes: ReactNode[] = [];
      [-0.7, -0.35, 0, 0.35, 0.68].forEach((k, i) => {
        const a = -Math.PI / 2 + k * 1.2;
        const bx = Math.cos(a) * 1.0 * R;
        const by = -0.05 * R + Math.sin(a) * 1.05 * R;
        const tx = Math.cos(a) * 1.42 * R + k * 0.12 * R;
        const ty = -0.05 * R + Math.sin(a) * 1.42 * R;
        spikes.push(<path key={i} d={d`M ${bx - Math.sin(a) * 0.26 * R} ${by + Math.cos(a) * 0.26 * R} Q ${lerp(bx, tx, 0.6)} ${lerp(by, ty, 0.4)} ${tx} ${ty} Q ${lerp(bx, tx, 0.4) + 0.08 * R} ${lerp(by, ty, 0.7)} ${bx + Math.sin(a) * 0.26 * R} ${by - Math.cos(a) * 0.26 * R} Z`} fill={c} {...st} />);
      });
      return { back: <g>{spikes}<path d={backPath(R, 0.5, 1.02, 4, 0.1, true)} fill={back} {...st} /></g>, front: fringePath(R, { tip: -0.12, n: 5, part: 0.1, side: 0.38, sideX: 1.0, vol: 0.12, depth: 0.34, sharp: 0.75 }), ears: 'near', topExtra: 0.4 };
    }
    case 'slick': {
      const { cy, rx, ry } = capOf(R, 0.04);
      const front = d`M ${-1.0 * R} ${0.36 * R} C ${-1.08 * R} ${0.1 * R} ${-rx} ${cy + 0.2 * R} ${-rx} ${cy} A ${rx} ${ry} 0 0 1 ${rx} ${cy} C ${rx} ${cy + 0.2 * R} ${1.08 * R} ${0.1 * R} ${1.0 * R} ${0.36 * R} C ${0.9 * R} ${0.1 * R} ${0.86 * R} ${-0.36 * R} ${0.5 * R} ${-0.5 * R} C ${0.2 * R} ${-0.62 * R} ${-0.12 * R} ${-0.5 * R} ${-0.3 * R} ${-0.62 * R} C ${-0.5 * R} ${-0.5 * R} ${-0.86 * R} ${-0.36 * R} ${-0.92 * R} ${0.1 * R} Z`;
      return {
        back: <path d={backPath(R, 0.5, 1.02, 4, 0.04, true)} fill={back} {...st} />,
        front,
        extra: (
          <g stroke={darken(c, 0.35)} strokeWidth={ol * 0.6} fill="none" strokeLinecap="round">
            <path d={d`M ${-0.3 * R} ${-0.66 * R} Q ${0.1 * R} ${-1.0 * R} ${0.6 * R} ${-0.8 * R}`} />
            <path d={d`M ${-0.1 * R} ${-0.58 * R} Q ${0.3 * R} ${-0.84 * R} ${0.78 * R} ${-0.56 * R}`} />
          </g>
        ),
        ears: 'near',
        topExtra: 0.04,
      };
    }
    case 'buzz':
      return { back: <path d={backPath(R, 0.5, 1.02, 4, 0.03, true)} fill={back} {...st} />, front: fringePath(R, { tip: -0.32, n: 6, part: 0.3, side: 0.3, sideX: 1.0, vol: 0.03, depth: 0.14, sharp: 0.5 }), ears: 'both', topExtra: 0.03 };
    case 'balding': {
      const side = (s: 1 | -1) => d`M ${s * 1.02 * R} ${0.36 * R} C ${s * 1.12 * R} ${0.0 * R} ${s * 1.06 * R} ${-0.42 * R} ${s * 0.78 * R} ${-0.6 * R} C ${s * 0.8 * R} ${-0.3 * R} ${s * 0.86 * R} ${0.02 * R} ${s * 0.88 * R} ${0.36 * R} Z`;
      return {
        back: <path d={backPath(R, 0.5, 1.03, 4, 0, true)} fill={back} {...st} />,
        front: `${side(1)} ${side(-1)}`,
        extra: (
          <g fill="none" stroke={LINE} strokeWidth={ol * 0.8} strokeLinecap="round">
            <path d={d`M ${-0.22 * R} ${-1.0 * R} Q ${0 * R} ${-1.18 * R} ${0.24 * R} ${-1.02 * R}`} />
            <path d={d`M ${0.02 * R} ${-0.98 * R} Q ${0.16 * R} ${-1.14 * R} ${0.36 * R} ${-1.0 * R}`} />
          </g>
        ),
        ears: 'both',
        topExtra: 0.1,
      };
    }
    case 'long':
      return { back: <path d={backPath(R, 2.55, 1.32, 6, 0.08)} fill={back} {...st} />, front: fringePath(R, { tip: -0.02, n: 5, part: -0.15, side: 1.3, sideX: 1.02, vol: 0.08, depth: 0.3 }), ears: 'none', topExtra: 0.08 };
    case 'side':
      return { back: <path d={backPath(R, 2.3, 1.3, 6, 0.1)} fill={back} {...st} />, front: fringePath(R, { tip: -0.06, n: 4, part: -0.45, side: 1.25, sideX: 1.03, vol: 0.1, depth: 0.36 }), ears: 'none', topExtra: 0.1 };
    case 'bob':
      return { back: <path d={backPath(R, 1.02, 1.2, 5, 0.1, true)} fill={back} {...st} />, front: fringePath(R, { tip: -0.02, n: 5, part: 0.0, side: 1.02, sideX: 1.1, vol: 0.1, depth: 0.26 }), ears: 'none', topExtra: 0.1 };
    case 'ponytail':
      return {
        back: (
          <g>
            <path d={d`M ${-0.6 * R} ${-0.92 * R} C ${-1.5 * R} ${-1.0 * R} ${-1.85 * R} ${0.1 * R} ${-1.55 * R} ${1.0 * R} C ${-1.5 * R} ${1.3 * R} ${-1.28 * R} ${1.5 * R} ${-1.2 * R} ${1.62 * R} C ${-1.3 * R} ${1.1 * R} ${-1.22 * R} ${0.3 * R} ${-0.86 * R} ${-0.42 * R} Z`} fill={back} {...st} />
            <path d={backPath(R, 0.56, 1.02, 4, 0.06, true)} fill={back} {...st} />
            {tie(-0.98 * R, -0.66 * R, 0.16 * R)}
          </g>
        ),
        front: fringePath(R, { tip: -0.06, n: 5, part: 0.25, side: 0.75, sideX: 1.0, vol: 0.06, depth: 0.3 }),
        ears: 'near',
        topExtra: 0.06,
      };
    case 'bun':
      return {
        back: (
          <g>
            <circle cx={-0.2 * R} cy={-1.12 * R} r={0.44 * R} fill={back} {...st} />
            <path d={backPath(R, 0.56, 1.02, 4, 0.04, true)} fill={back} {...st} />
          </g>
        ),
        front: fringePath(R, { tip: -0.22, n: 5, part: -0.35, side: 0.55, sideX: 1.0, vol: 0.04, depth: 0.26 }),
        ears: 'near',
        topExtra: 0.56,
      };
    case 'lowbun':
      return {
        back: (
          <g>
            <circle cx={-1.0 * R} cy={0.0 * R} r={0.42 * R} fill={back} {...st} />
            <path d={backPath(R, 0.56, 1.02, 4, 0.04, true)} fill={back} {...st} />
          </g>
        ),
        front: fringePath(R, { tip: -0.24, n: 5, part: -0.3, side: 0.62, sideX: 1.0, vol: 0.04, depth: 0.28 }),
        ears: 'near',
        topExtra: 0.04,
      };
    case 'pigtails':
      return {
        back: (
          <g>
            {[-1, 1].map((s) => (
              <g key={s}>
                <path d={d`M ${s * 0.92 * R} ${-0.15 * R} C ${s * 1.6 * R} ${-0.1 * R} ${s * 1.7 * R} ${0.8 * R} ${s * 1.32 * R} ${1.25 * R} C ${s * 1.4 * R} ${0.7 * R} ${s * 1.2 * R} ${0.4 * R} ${s * 0.95 * R} ${0.25 * R} Z`} fill={back} {...st} />
                {tie(s * 1.08 * R, -0.08 * R, 0.15 * R)}
              </g>
            ))}
            <path d={backPath(R, 0.55, 1.02, 4, 0.05, true)} fill={back} {...st} />
          </g>
        ),
        front: fringePath(R, { tip: -0.02, n: 5, part: 0.0, side: 0.5, sideX: 1.0, vol: 0.05, depth: 0.26 }),
        ears: 'none',
        topExtra: 0.05,
      };
    case 'perm': {
      const cy = -0.08 * R;
      return {
        back: <path d={curlyPath(1.22 * R, 1.16 * R, cy, Math.PI * 0.82, Math.PI * 2.18, 12, 0.5 * R)} fill={back} {...st} />,
        front: curlyPath(1.14 * R, 1.12 * R, cy, Math.PI * 0.95, Math.PI * 2.05, 11, -0.42 * R),
        ears: 'near',
        topExtra: 0.14,
      };
    }
  }
}

// ---------------------------------------------------------------------------
// 얼굴
// ---------------------------------------------------------------------------
function facePath(R: number, age: Age, female: boolean, turn: number): string {
  const t = turn * 0.07 * R;
  const chin = EYE[age].chin * R;
  const kid = age === 'kid';
  const jawX = (kid ? 0.66 : female ? 0.5 : 0.6) * R;
  const jawY = (kid ? 0.84 : female ? 0.9 : 0.9) * R;
  const cheekY = (kid ? 0.42 : 0.32) * R;
  const top = -0.05 * R;
  const fr = 1 - turn * 0.06;
  return (
    d`M ${-R * fr} ${top} A ${R} ${R} 0 0 1 ${R} ${top}` +
    d` C ${R * 1.01} ${cheekY * 0.5} ${R * 0.99} ${cheekY} ${R * 0.93} ${cheekY + 0.14 * R}` +
    d` C ${R * 0.86} ${jawY - 0.12 * R} ${jawX + 0.16 * R + t * 0.5} ${jawY - 0.02 * R} ${jawX * 0.5 + t} ${(jawY + chin) / 2 + 0.05 * R}` +
    d` Q ${t + 0.12 * R} ${chin + 0.01 * R} ${t} ${chin}` +
    d` Q ${t - 0.12 * R} ${chin + 0.01 * R} ${-jawX * 0.5 * fr + t} ${(jawY + chin) / 2 + 0.05 * R}` +
    d` C ${(-jawX - 0.16 * R) * fr + t * 0.5} ${jawY - 0.02 * R} ${-R * 0.86 * fr} ${jawY - 0.12 * R} ${-R * 0.93 * fr} ${cheekY + 0.14 * R}` +
    d` C ${-R * 0.99 * fr} ${cheekY} ${-R * 1.01 * fr} ${cheekY * 0.5} ${-R * fr} ${top} Z`
  );
}

interface EyeArgs {
  x: number;
  y: number;
  /** 바깥 눈꼬리 방향 (+1 = 오른눈) */
  o: 1 | -1;
  ew: number;
  eh: number;
  F: FaceSpec;
  L: Look;
  R: number;
  ol: number;
  uid: string;
  detail: boolean;
  look: Pt;
}

function eyeShape(x: number, y: number, o: number, ew: number, eh: number, open: number) {
  const topY = y + eh - 2 * eh * open;
  const ci: Pt = [x - o * ew, y + 0.18 * eh];
  const co: Pt = [x + o * ew * 1.03, y - 0.02 * eh];
  const c1: Pt = [x - o * 0.72 * ew, topY + 0.04 * eh];
  const c2: Pt = [x + o * 0.58 * ew, topY - 0.06 * eh];
  const path = d`M ${ci[0]} ${ci[1]} C ${c1[0]} ${c1[1]} ${c2[0]} ${c2[1]} ${co[0]} ${co[1]} C ${x + o * 0.86 * ew} ${y + 0.92 * eh} ${x - o * 0.72 * ew} ${y + 1.0 * eh} ${ci[0]} ${ci[1]} Z`;
  return { path, ci, co, c1, c2, topY };
}

function EyeView({ x, y, o, ew, eh, F, L, R, ol, uid, detail, look }: EyeArgs) {
  const line = { stroke: LINE, fill: 'none', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  const k = F.eye;
  if (k === 'smile') {
    return (
      <g>
        <path d={d`M ${x - 0.98 * ew} ${y + 0.32 * eh} Q ${x} ${y - 0.82 * eh} ${x + 0.98 * ew} ${y + 0.32 * eh}`} {...line} strokeWidth={0.1 * R} />
        {L.lashes && <path d={d`M ${x + o * 0.95 * ew} ${y + 0.22 * eh} l ${o * 0.22 * ew} ${-0.3 * eh}`} {...line} strokeWidth={0.06 * R} />}
      </g>
    );
  }
  if (k === 'closed') {
    return (
      <g>
        <path d={d`M ${x - 0.98 * ew} ${y + 0.02 * eh} Q ${x} ${y + 0.78 * eh} ${x + 0.98 * ew} ${y + 0.02 * eh}`} {...line} strokeWidth={0.09 * R} />
        {L.lashes && <path d={d`M ${x + o * 0.92 * ew} ${y + 0.12 * eh} l ${o * 0.22 * ew} ${0.12 * eh}`} {...line} strokeWidth={0.06 * R} />}
      </g>
    );
  }
  if (k === 'squeeze') {
    return <path d={d`M ${x + o * 0.82 * ew} ${y - 0.72 * eh} L ${x - o * 0.62 * ew} ${y + 0.02 * eh} L ${x + o * 0.82 * ew} ${y + 0.74 * eh}`} {...line} strokeWidth={0.09 * R} />;
  }
  const open = k === 'shock' ? 1.18 : (F.open ?? 1);
  const S = eyeShape(x, y, o, ew, eh, open);
  const clip = `${uid}-eye${o}`;
  const is = (F.iris ?? 1) * (k === 'shock' ? 0.26 : 1);
  const ix = x + look[0] * ew;
  const iy = y + 0.08 * eh + look[1] * eh;
  const irx = 0.68 * ew * is;
  const iry = 0.84 * eh * is;
  // 윗눈꺼풀 띠 (바깥쪽으로 갈수록 두꺼워진다)
  const t1 = 0.035 * R;
  const t2 = 0.085 * R;
  const flick = L.lashes ? 0.22 : 0.1;
  const lid = d`M ${S.ci[0]} ${S.ci[1]} C ${S.c1[0]} ${S.c1[1] - t1} ${S.c2[0]} ${S.c2[1] - t2} ${S.co[0] + o * flick * ew} ${S.co[1] - (L.lashes ? 0.3 : 0.12) * eh} L ${S.co[0]} ${S.co[1] + 0.06 * eh} C ${S.c2[0]} ${S.c2[1]} ${S.c1[0]} ${S.c1[1]} ${S.ci[0]} ${S.ci[1]} Z`;
  return (
    <g>
      <defs>
        <clipPath id={clip}>
          <path d={S.path} />
        </clipPath>
      </defs>
      <path d={S.path} fill={WHITE} />
      <g clipPath={`url(#${clip})`}>
        {/* 윗눈꺼풀 그늘 */}
        <ellipse cx={x} cy={S.topY} rx={ew * 1.2} ry={eh * 0.45} fill="#d9c9df" opacity={0.7} />
        {k === 'heart' ? (
          <g>
            <path d={heartPath(ix, iy, ew * 0.82)} fill="#ff5d86" stroke={darken('#ff5d86', 0.3)} strokeWidth={ol * 0.5} />
            <circle cx={ix - 0.3 * ew} cy={iy - 0.35 * eh} r={0.16 * ew} fill={WHITE} />
          </g>
        ) : k === 'shock' ? (
          <circle cx={ix} cy={iy} r={0.16 * ew} fill={LINE} />
        ) : (
          <g>
            <ellipse cx={ix} cy={iy} rx={irx} ry={iry} fill={`url(#${uid}-iris)`} />
            <ellipse cx={ix} cy={iy} rx={irx} ry={iry} fill="none" stroke={darken(L.iris, 0.45)} strokeWidth={ol * 0.45} />
            <ellipse cx={ix} cy={iy - 0.04 * eh} rx={irx * 0.46} ry={iry * 0.52} fill={darken(L.iris, 0.55)} />
            {/* 홍채 위쪽 그늘 */}
            <ellipse cx={ix} cy={iy - iry * 0.78} rx={irx * 1.3} ry={iry * 0.5} fill="#1d1020" opacity={0.28} />
            {k === 'sparkle' ? (
              <g fill={WHITE}>
                <path d={starPath(ix - 0.22 * ew, iy - 0.3 * eh, 0.32 * ew)} />
                <path d={starPath(ix + 0.26 * ew, iy + 0.34 * eh, 0.16 * ew)} />
              </g>
            ) : (
              <g fill={WHITE}>
                <ellipse cx={ix - 0.24 * ew} cy={iy - 0.34 * eh} rx={0.22 * ew} ry={0.26 * ew} />
                <circle cx={ix + 0.28 * ew} cy={iy + 0.36 * eh} r={0.1 * ew} />
                {k === 'teary' && <circle cx={ix + 0.2 * ew} cy={iy - 0.42 * eh} r={0.11 * ew} />}
              </g>
            )}
          </g>
        )}
        {k === 'teary' && <ellipse cx={x} cy={y + 0.85 * eh} rx={ew * 1.1} ry={eh * 0.42} fill="#9fd6ff" opacity={0.75} />}
      </g>
      {k === 'shock' && <path d={S.path} fill="none" stroke={LINE} strokeWidth={ol * 0.8} />}
      <path d={lid} fill={LINE} stroke={LINE} strokeWidth={ol * 0.35} strokeLinejoin="round" />
      {L.lashes && open >= 0.7 && <path d={d`M ${S.co[0] - o * 0.18 * ew} ${S.co[1] - 0.22 * eh} l ${o * 0.2 * ew} ${-0.34 * eh}`} {...line} strokeWidth={0.04 * R} />}
      {/* 아랫속눈썹 */}
      <path d={d`M ${x + o * 0.06 * ew} ${y + 0.98 * eh} Q ${x + o * 0.72 * ew} ${y + 0.94 * eh} ${x + o * 0.96 * ew} ${y + 0.3 * eh}`} {...line} strokeWidth={0.03 * R} opacity={0.75} />
      {detail && open >= 0.8 && L.hair !== 'buzz' && <path d={d`M ${x - o * 0.3 * ew} ${S.topY - 0.3 * eh} Q ${x + o * 0.3 * ew} ${S.topY - 0.46 * eh} ${x + o * 0.86 * ew} ${S.topY - 0.06 * eh}`} {...line} strokeWidth={0.02 * R} opacity={0.45} />}
    </g>
  );
}

function browPath(x: number, by: number, o: number, ew: number, R: number, k: BrowK): string {
  const B: Record<BrowK, [number, number, number]> = {
    normal: [0, 0.02, 0.07],
    up: [-0.08, -0.06, 0.12],
    worry: [-0.13, 0.06, 0.02],
    angry: [0.09, -0.08, 0],
    firm: [0.05, -0.02, 0.02],
    relaxed: [0.03, 0.05, 0.05],
    flat: [0.04, 0.04, 0],
  };
  const [di, dout, arch] = B[k];
  const ix = x - o * 0.72 * ew;
  const ox = x + o * 1.08 * ew;
  const iy = by + di * R;
  const oy = by + dout * R;
  const mx = lerp(ix, ox, 0.45);
  const my = Math.min(iy, oy) - arch * R;
  return d`M ${ix} ${iy + 0.035 * R} Q ${mx} ${my} ${ox} ${oy} Q ${mx} ${my + 0.05 * R} ${ix} ${iy - 0.035 * R} Z`;
}

function MouthView({ k, x, y, R, ol }: { k: MouthK; x: number; y: number; R: number; ol: number }) {
  const w = 0.2 * R;
  const line = { stroke: LINE, strokeWidth: 0.055 * R, fill: 'none', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  const fillM = { fill: '#9a3c42', stroke: LINE, strokeWidth: ol * 0.9, strokeLinejoin: 'round' as const };
  const tongue = '#ff8f94';
  switch (k) {
    case 'smile':
      return <path d={d`M ${x - w} ${y - 0.02 * R} Q ${x} ${y + 0.15 * R} ${x + w} ${y - 0.02 * R}`} {...line} />;
    case 'small':
      return <path d={d`M ${x - 0.45 * w} ${y + 0.02 * R} Q ${x} ${y + 0.07 * R} ${x + 0.45 * w} ${y + 0.02 * R}`} {...line} strokeWidth={0.045 * R} />;
    case 'open':
    case 'laugh': {
      const s = k === 'laugh' ? 1.35 : 1;
      const top = y - 0.04 * R;
      const bot = y + 0.34 * R * s;
      const hw = 1.05 * w * s;
      const p = d`M ${x - hw} ${top} Q ${x} ${top + 0.05 * R} ${x + hw} ${top} Q ${x + hw * 0.85} ${bot} ${x} ${bot} Q ${x - hw * 0.85} ${bot} ${x - hw} ${top} Z`;
      return (
        <g>
          <path d={p} {...fillM} />
          <path d={d`M ${x - hw * 0.55} ${bot - 0.02 * R} Q ${x} ${bot - 0.18 * R * s} ${x + hw * 0.55} ${bot - 0.02 * R} Q ${x} ${bot + 0.01 * R} ${x - hw * 0.55} ${bot - 0.02 * R} Z`} fill={tongue} />
          <path d={d`M ${x - hw * 0.8} ${top + 0.02 * R} Q ${x} ${top + 0.1 * R} ${x + hw * 0.8} ${top + 0.02 * R} L ${x + hw * 0.7} ${top + 0.07 * R} Q ${x} ${top + 0.13 * R} ${x - hw * 0.7} ${top + 0.07 * R} Z`} fill={WHITE} />
        </g>
      );
    }
    case 'flat':
      return <path d={d`M ${x - 0.6 * w} ${y + 0.04 * R} L ${x + 0.6 * w} ${y + 0.04 * R}`} {...line} />;
    case 'frown':
      return <path d={d`M ${x - 0.8 * w} ${y + 0.11 * R} Q ${x} ${y - 0.03 * R} ${x + 0.8 * w} ${y + 0.11 * R}`} {...line} />;
    case 'o':
      return <ellipse cx={x} cy={y + 0.06 * R} rx={0.42 * w} ry={0.1 * R} {...fillM} />;
    case 'O':
      return (
        <g>
          <ellipse cx={x} cy={y + 0.14 * R} rx={0.8 * w} ry={0.22 * R} {...fillM} />
          <ellipse cx={x} cy={y + 0.27 * R} rx={0.45 * w} ry={0.07 * R} fill={tongue} />
        </g>
      );
    case 'wavy':
      return <path d={d`M ${x - w} ${y + 0.05 * R} Q ${x - 0.66 * w} ${y - 0.04 * R} ${x - 0.33 * w} ${y + 0.05 * R} Q ${x} ${y + 0.14 * R} ${x + 0.33 * w} ${y + 0.05 * R} Q ${x + 0.66 * w} ${y - 0.04 * R} ${x + w} ${y + 0.05 * R}`} {...line} strokeWidth={0.045 * R} />;
    case 'smirk':
      return <path d={d`M ${x - 0.75 * w} ${y + 0.04 * R} Q ${x + 0.2 * w} ${y + 0.12 * R} ${x + 0.95 * w} ${y - 0.06 * R}`} {...line} />;
    case 'cat':
      return <path d={d`M ${x - w} ${y - 0.01 * R} Q ${x - 0.5 * w} ${y + 0.13 * R} ${x} ${y + 0.01 * R} Q ${x + 0.5 * w} ${y + 0.13 * R} ${x + w} ${y - 0.01 * R}`} {...line} strokeWidth={0.05 * R} />;
    case 'shout': {
      const hw = 1.05 * w;
      return (
        <g>
          <path d={d`M ${x - hw} ${y - 0.04 * R} L ${x + hw} ${y - 0.04 * R} L ${x + hw * 0.7} ${y + 0.3 * R} L ${x - hw * 0.7} ${y + 0.3 * R} Z`} {...fillM} />
          <rect x={x - hw * 0.86} y={y - 0.025 * R} width={hw * 1.72} height={0.07 * R} fill={WHITE} />
          <ellipse cx={x} cy={y + 0.26 * R} rx={hw * 0.45} ry={0.05 * R} fill={tongue} />
        </g>
      );
    }
    case 'cry': {
      const hw = 0.9 * w;
      return (
        <g>
          <path d={d`M ${x - hw} ${y + 0.08 * R} Q ${x - hw * 0.5} ${y - 0.02 * R} ${x} ${y + 0.04 * R} Q ${x + hw * 0.5} ${y - 0.02 * R} ${x + hw} ${y + 0.08 * R} Q ${x} ${y + 0.36 * R} ${x - hw} ${y + 0.08 * R} Z`} {...fillM} />
          <ellipse cx={x} cy={y + 0.22 * R} rx={hw * 0.45} ry={0.05 * R} fill={tongue} />
        </g>
      );
    }
  }
}

// ---------------------------------------------------------------------------
// 팔·손
// ---------------------------------------------------------------------------
type HandK = 'rest' | 'fist' | 'open' | 'point' | 'wave';
interface ArmSpec {
  h: Pt;
  bend: 1 | -1;
  hand: HandK;
  front: boolean;
  /** 손 방향을 고정 (도) */
  rot?: number;
}

/** 자세 → [앞쪽 팔(+x), 뒤쪽 팔(−x)] */
function poseArms(pose: Pose, g: Geo, turn: number): [ArmSpec, ArmSpec] {
  const { R, hy, sy, sw, ua, fa, ww, wy } = g;
  const reach = ua + fa;
  const t = turn * 0.07 * R;
  const idle = (s: 1 | -1): ArmSpec => ({ h: [s * (sw + 4), sy + 8 + reach * 0.94], bend: s, hand: 'rest', front: false });
  const chin: Pt = [t + 0.32 * R, hy + EYE.adult.chin * R + 0.12 * R];
  switch (pose) {
    case 'cheer':
      return [
        { h: [sw + 0.42 * reach, sy - 0.62 * reach], bend: -1, hand: 'open', front: false, rot: -70 },
        { h: [-sw - 0.42 * reach, sy - 0.62 * reach], bend: 1, hand: 'open', front: false, rot: -110 },
      ];
    case 'point':
      return [{ h: [sw + reach * 0.86, sy + 2], bend: -1, hand: 'point', front: false }, idle(-1)];
    case 'think':
      return [
        { h: chin, bend: 1, hand: 'fist', front: true, rot: -60 },
        { h: [sw * 0.55, sy + 0.62 * reach], bend: -1, hand: 'rest', front: true },
      ];
    case 'hold':
      return [
        { h: [0.42 * R, sy + 0.5 * reach], bend: 1, hand: 'fist', front: true, rot: -100 },
        { h: [-0.42 * R, sy + 0.5 * reach], bend: -1, hand: 'fist', front: true, rot: -80 },
      ];
    case 'wave':
      return [{ h: [sw + 0.5 * reach, hy + 0.15 * R], bend: 1, hand: 'wave', front: false, rot: -90 }, idle(-1)];
    case 'facepalm':
      return [{ h: [t + 0.22 * R, hy + 0.12 * R], bend: 1, hand: 'open', front: true, rot: -120 }, idle(-1)];
    case 'fist':
      return [{ h: [sw + 0.3 * reach, sy - 0.3 * reach], bend: 1, hand: 'fist', front: false, rot: -95 }, idle(-1)];
    case 'fighting':
      return [
        { h: [0.62 * R, sy + 0.25 * reach], bend: 1, hand: 'fist', front: true, rot: -100 },
        { h: [-0.48 * R, sy + 0.3 * reach], bend: -1, hand: 'fist', front: true, rot: -80 },
      ];
    case 'shrug':
      return [
        { h: [sw + 0.5 * reach, sy + 0.32 * reach], bend: 1, hand: 'open', front: false, rot: -25 },
        { h: [-sw - 0.5 * reach, sy + 0.32 * reach], bend: -1, hand: 'open', front: false, rot: -155 },
      ];
    case 'cross':
      return [
        { h: [-sw * 0.62, sy + 0.42 * reach], bend: 1, hand: 'rest', front: true },
        { h: [sw * 0.62, sy + 0.4 * reach], bend: -1, hand: 'rest', front: true },
      ];
    case 'cheeks':
      return [
        { h: [t + 0.86 * R, hy + 0.62 * R], bend: 1, hand: 'open', front: true, rot: -100 },
        { h: [t - 0.8 * R, hy + 0.62 * R], bend: -1, hand: 'open', front: true, rot: -80 },
      ];
    case 'hips':
      return [
        { h: [ww + 4, wy + 2], bend: 1, hand: 'fist', front: false, rot: 150 },
        { h: [-ww - 4, wy + 2], bend: -1, hand: 'fist', front: false, rot: 30 },
      ];
    case 'scratch':
      return [{ h: [0.98 * R, hy - 0.2 * R], bend: 1, hand: 'open', front: false, rot: -150 }, idle(-1)];
    case 'mouth':
      return [{ h: [t + 0.08 * R, hy + 0.98 * R], bend: 1, hand: 'open', front: true, rot: -150 }, idle(-1)];
    default:
      return [idle(1), idle(-1)];
  }
}

function HandView({ at, rot, k, s, color, ol }: { at: Pt; rot: number; k: HandK; s: number; color: string; ol: number }) {
  const st = { fill: color, stroke: LINE, strokeWidth: ol, strokeLinejoin: 'round' as const };
  let shape: ReactNode;
  switch (k) {
    case 'fist':
      shape = (
        <g>
          <rect x={-0.1 * s} y={-0.82 * s} width={1.75 * s} height={1.64 * s} rx={0.7 * s} {...st} />
          <path d={d`M ${0.95 * s} ${-0.45 * s} Q ${1.35 * s} ${-0.38 * s} ${1.38 * s} ${-0.02 * s} M ${0.95 * s} ${0.12 * s} Q ${1.35 * s} ${0.18 * s} ${1.38 * s} ${0.48 * s}`} fill="none" stroke={LINE} strokeWidth={ol * 0.55} strokeLinecap="round" />
        </g>
      );
      break;
    case 'point':
      shape = (
        <g>
          <rect x={0.9 * s} y={-0.62 * s} width={1.7 * s} height={0.5 * s} rx={0.25 * s} {...st} />
          <rect x={-0.1 * s} y={-0.72 * s} width={1.5 * s} height={1.44 * s} rx={0.62 * s} {...st} />
        </g>
      );
      break;
    case 'open':
      shape = (
        <g>
          <path d={d`M ${0.55 * s} ${-0.55 * s} Q ${0.9 * s} ${-1.25 * s} ${1.35 * s} ${-0.95 * s} Q ${1.1 * s} ${-0.6 * s} ${1.05 * s} ${-0.35 * s}`} {...st} />
          <path d={d`M 0 ${-0.62 * s} Q ${1.4 * s} ${-0.8 * s} ${2.05 * s} ${-0.3 * s} Q ${2.3 * s} ${0.05 * s} ${2.05 * s} ${0.4 * s} Q ${1.4 * s} ${0.85 * s} 0 ${0.62 * s} Z`} {...st} />
        </g>
      );
      break;
    case 'wave':
      shape = (
        <g>
          {[-0.5, -0.17, 0.17, 0.5].map((a, i) => (
            <rect key={i} x={1.1 * s} y={-0.2 * s} width={1.1 * s} height={0.42 * s} rx={0.21 * s} transform={`rotate(${a * 50} ${0.8 * s} 0)`} {...st} />
          ))}
          <path d={d`M ${0.4 * s} ${0.5 * s} Q ${0.6 * s} ${1.2 * s} ${1.05 * s} ${1.05 * s}`} {...st} />
          <ellipse cx={0.85 * s} cy={0} rx={0.85 * s} ry={0.78 * s} {...st} />
        </g>
      );
      break;
    default:
      shape = (
        <g>
          <ellipse cx={0.9 * s} cy={0.05 * s} rx={1.0 * s} ry={0.74 * s} {...st} />
          <path d={d`M ${0.55 * s} ${-0.55 * s} Q ${1.0 * s} ${-0.82 * s} ${1.2 * s} ${-0.5 * s}`} fill="none" stroke={LINE} strokeWidth={ol * 0.7} strokeLinecap="round" />
        </g>
      );
  }
  return <g transform={`translate(${at[0].toFixed(1)} ${at[1].toFixed(1)}) rotate(${rot.toFixed(1)})`}>{shape}</g>;
}

// ---------------------------------------------------------------------------
// 옷
// ---------------------------------------------------------------------------
interface WearSpec {
  neck: 'round' | 'v' | 'collar' | 'hood' | 'open';
  sleeve: 'long' | 'short';
  /** 소매 색 (겉옷 색과 다를 때) */
  sleeveColor?: (L: Look) => string;
  /** 겉옷이 골반 아래로 내려오는 길이 */
  hem: number;
}

const WEAR: Record<Wear, WearSpec> = {
  tee: { neck: 'round', sleeve: 'short', hem: 4 },
  kidtee: { neck: 'round', sleeve: 'short', hem: 4 },
  knit: { neck: 'round', sleeve: 'long', hem: 6 },
  hoodie: { neck: 'hood', sleeve: 'long', hem: 8 },
  shirt: { neck: 'collar', sleeve: 'long', hem: 5 },
  blouse: { neck: 'collar', sleeve: 'long', hem: 3 },
  suit: { neck: 'open', sleeve: 'long', hem: 12 },
  uniform: { neck: 'open', sleeve: 'long', hem: 8 },
  coat: { neck: 'open', sleeve: 'long', hem: 48 },
  apron: { neck: 'round', sleeve: 'short', sleeveColor: (L) => L.inner, hem: 4 },
  track: { neck: 'collar', sleeve: 'long', hem: 6 },
  cardigan: { neck: 'open', sleeve: 'long', hem: 10 },
  dress: { neck: 'round', sleeve: 'short', hem: 0 },
  pajama: { neck: 'collar', sleeve: 'long', hem: 8 },
};

function torsoPath(g: Geo, hem: number, neck: WearSpec['neck']): string {
  const { sy, sw, wy, ww, py, pw } = g;
  const nb = g.neck + 3;
  const top = neck === 'round' || neck === 'hood' ? d`Q 0 ${sy + 9} ${nb} ${sy - 1}` : neck === 'collar' ? d`Q 0 ${sy + 5} ${nb} ${sy - 1}` : d`L ${nb} ${sy - 1}`;
  const by = py + hem;
  const bw = hem > 20 ? pw + 6 : pw + 1;
  return (
    d`M ${-nb} ${sy - 1} ` +
    top +
    d` Q ${sw * 0.75} ${sy - 2} ${sw} ${sy + 7} C ${sw + 1.5} ${sy + 20} ${ww + 1} ${wy - 18} ${ww} ${wy} L ${bw} ${by} Q ${bw} ${by + 3} ${bw - 3} ${by + 3} L ${-bw + 3} ${by + 3} Q ${-bw} ${by + 3} ${-bw} ${by} L ${-ww} ${wy} C ${-ww - 1} ${wy - 18} ${-sw - 1.5} ${sy + 20} ${-sw} ${sy + 7} Q ${-sw * 0.75} ${sy - 2} ${-nb} ${sy - 1} Z`
  );
}

function Clothes({ g, L, ol, uid }: { g: Geo; L: Look; ol: number; uid: string }) {
  const W = WEAR[L.wear];
  const { sy, wy, py, pw, ww } = g;
  const nb = g.neck + 3;
  const body = torsoPath(g, W.hem, W.neck);
  const clip = `${uid}-torso`;
  const shade = darken(L.color, 0.16);
  const st = { stroke: LINE, strokeWidth: ol, strokeLinejoin: 'round' as const };
  const thin = { stroke: LINE, strokeWidth: ol * 0.6, fill: 'none', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  const by = py + W.hem;
  const details: ReactNode[] = [];
  // 옷 종류별 디테일
  switch (L.wear) {
    case 'tee':
    case 'kidtee':
    case 'dress':
      details.push(<path key="rib" d={d`M ${-nb - 1} ${sy} Q 0 ${sy + 13} ${nb + 1} ${sy}`} {...thin} />);
      if (L.wear === 'kidtee') details.push(<rect key="stripe" x={-pw - 4} y={sy + 26} width={pw * 2 + 8} height={7} fill={WHITE} opacity={0.85} />);
      if (L.wear === 'dress') details.push(<path key="belt" d={d`M ${-ww} ${wy} Q 0 ${wy + 4} ${ww} ${wy}`} {...thin} strokeWidth={ol} />);
      break;
    case 'knit':
      details.push(<path key="rib" d={d`M ${-nb - 1} ${sy} Q 0 ${sy + 13} ${nb + 1} ${sy}`} {...thin} />);
      details.push(
        <g key="hem" opacity={0.5}>
          {Array.from({ length: 7 }, (_, i) => {
            const x = lerp(-pw + 3, pw - 3, i / 6);
            return <path key={i} d={d`M ${x} ${by - 4} L ${x} ${by + 1}`} {...thin} />;
          })}
        </g>,
      );
      details.push(<path key="hemline" d={d`M ${-pw} ${by - 5} L ${pw} ${by - 5}`} {...thin} />);
      break;
    case 'hoodie':
      details.push(<path key="str1" d={d`M -4 ${sy + 5} L -5 ${sy + 26} M 5 ${sy + 5} L 6 ${sy + 24}`} {...thin} strokeWidth={ol * 0.8} />);
      details.push(<path key="pocket" d={d`M ${-ww + 2} ${by - 3} L ${-ww + 7} ${wy + 2} L ${ww - 7} ${wy + 2} L ${ww - 2} ${by - 3}`} {...thin} />);
      details.push(<path key="hemline" d={d`M ${-pw} ${by - 5} L ${pw} ${by - 5}`} {...thin} />);
      break;
    case 'shirt':
    case 'pajama':
    case 'track': {
      const collar = L.wear === 'track' ? L.color : lighten(L.color, 0.45);
      details.push(<path key="placket" d={d`M 0 ${sy + 8} L 0 ${by}`} {...thin} />);
      if (L.wear !== 'track')
        [0, 1, 2].forEach((i) => details.push(<circle key={`b${i}`} cx={2.5} cy={sy + 16 + i * 15} r={1.2} fill={LINE} opacity={0.7} />));
      else details.push(<rect key="zip" x={-1.2} y={sy + 6} width={2.4} height={8} rx={1} fill={WHITE} stroke={LINE} strokeWidth={ol * 0.4} />);
      details.push(<path key="cl" d={d`M ${-nb} ${sy - 4} L ${-nb - 9} ${sy + 5} L -1.5 ${sy + 11} Z`} fill={collar} {...st} strokeWidth={ol * 0.8} />);
      details.push(<path key="cr" d={d`M ${nb} ${sy - 4} L ${nb + 9} ${sy + 5} L 1.5 ${sy + 11} Z`} fill={collar} {...st} strokeWidth={ol * 0.8} />);
      if (L.wear === 'pajama')
        [
          [-12, sy + 30],
          [10, sy + 44],
          [-6, wy + 4],
          [14, sy + 20],
        ].forEach(([x, y], i) => details.push(<circle key={`p${i}`} cx={x} cy={y} r={2.2} fill={WHITE} opacity={0.7} />));
      break;
    }
    case 'blouse':
      details.push(<path key="cl" d={d`M ${-nb - 1} ${sy - 3} Q ${-nb - 10} ${sy + 4} ${-nb - 5} ${sy + 10} Q -4 ${sy + 12} -1 ${sy + 6} Z`} fill={WHITE} {...st} strokeWidth={ol * 0.8} />);
      details.push(<path key="cr" d={d`M ${nb + 1} ${sy - 3} Q ${nb + 10} ${sy + 4} ${nb + 5} ${sy + 10} Q 4 ${sy + 12} 1 ${sy + 6} Z`} fill={WHITE} {...st} strokeWidth={ol * 0.8} />);
      break;
    case 'suit':
    case 'uniform':
    case 'coat':
    case 'cardigan': {
      // 앞섶 사이로 보이는 안쪽 옷
      const vy = L.wear === 'cardigan' ? by : L.wear === 'coat' ? wy - 6 : sy + 42;
      const innerC = L.wear === 'suit' || L.wear === 'uniform' ? WHITE : L.inner;
      details.push(<path key="inner" d={d`M ${-nb + 1} ${sy - 1} L ${nb - 1} ${sy - 1} L ${L.wear === 'cardigan' ? 7 : 2} ${vy} L ${L.wear === 'cardigan' ? -7 : -2} ${vy} Z`} fill={innerC} {...st} strokeWidth={ol * 0.8} />);
      if (L.wear === 'suit' || L.wear === 'uniform') {
        const female = g.sw < 27;
        if (L.wear === 'uniform' && female)
          details.push(
            <g key="ribbon">
              <path d={d`M 0 ${sy + 6} L -9 ${sy + 1} L -9 ${sy + 12} Z M 0 ${sy + 6} L 9 ${sy + 1} L 9 ${sy + 12} Z`} fill={L.accent} {...st} strokeWidth={ol * 0.7} />
              <circle cx={0} cy={sy + 6} r={2.6} fill={L.accent} {...st} strokeWidth={ol * 0.7} />
            </g>,
          );
        else if (!(L.wear === 'suit' && L.accent === L.inner))
          details.push(<path key="tie" d={d`M -2.6 ${sy + 2} L 2.6 ${sy + 2} L 3.6 ${sy + 30} L 0 ${sy + 36} L -3.6 ${sy + 30} Z`} fill={L.accent} {...st} strokeWidth={ol * 0.7} />);
        details.push(<path key="lapel" d={d`M ${-nb} ${sy - 1} L -12 ${sy + 20} L -2 ${sy + 42} M ${nb} ${sy - 1} L 12 ${sy + 20} L 2 ${sy + 42}`} {...thin} strokeWidth={ol * 0.8} />);
        details.push(<circle key="btn" cx={4} cy={wy + 2} r={1.6} fill={LINE} />);
        if (L.wear === 'uniform') details.push(<path key="emb" d={d`M 10 ${sy + 26} l 9 0 l 0 7 q -4.5 4 -9 0 Z`} fill="#f2c14e" {...st} strokeWidth={ol * 0.5} />);
      }
      if (L.wear === 'coat') {
        details.push(<path key="lapel" d={d`M ${-nb} ${sy - 1} L -13 ${sy + 18} L -2 ${wy - 6} M ${nb} ${sy - 1} L 13 ${sy + 18} L 2 ${wy - 6}`} {...thin} strokeWidth={ol * 0.8} />);
        details.push(<path key="split" d={d`M 0 ${wy - 6} L 0 ${by}`} {...thin} />);
        details.push(<path key="pk" d={d`M ${-pw + 1} ${py + 4} l 13 0 M ${pw - 14} ${py + 4} l 13 0 M 10 ${sy + 26} l 10 0`} {...thin} />);
      }
      if (L.wear === 'cardigan') {
        details.push(<path key="edge" d={d`M -7 ${sy + 6} L -7 ${by} M 7 ${sy + 6} L 7 ${by}`} {...thin} />);
        [0, 1, 2].forEach((i) => details.push(<circle key={`b${i}`} cx={9.5} cy={sy + 18 + i * 14} r={1.5} fill={LINE} opacity={0.7} />));
      }
      break;
    }
    case 'apron':
      details.push(<path key="rib" d={d`M ${-nb - 1} ${sy} Q 0 ${sy + 13} ${nb + 1} ${sy}`} {...thin} />);
      break;
  }
  // 앞치마는 겉옷(안쪽 옷 위)에 따로 덧그린다
  const base = L.wear === 'apron' ? L.inner : L.color;
  const baseShade = darken(base, 0.16);
  return (
    <g>
      <defs>
        <clipPath id={clip}>
          <path d={body} />
        </clipPath>
      </defs>
      <path d={body} fill={base} />
      <g clipPath={`url(#${clip})`}>
        <ellipse cx={-g.sw * 1.15} cy={(sy + by) / 2} rx={g.sw * 0.6} ry={(by - sy) * 0.75} fill={L.wear === 'apron' ? baseShade : shade} />
        <ellipse cx={0} cy={sy - 2} rx={nb + 7} ry={7} fill={darken(base, 0.24)} opacity={0.5} />
      </g>
      <path d={body} fill="none" {...st} />
      {L.wear === 'apron' && (
        <g>
          <path d={d`M ${-nb - 1} ${sy - 1} L ${-ww + 6} ${sy + 22} M ${nb + 1} ${sy - 1} L ${ww - 6} ${sy + 22}`} stroke={L.color} strokeWidth={4} />
          <path d={d`M ${-ww + 4} ${sy + 20} L ${ww - 4} ${sy + 20} L ${ww - 2} ${wy} L ${pw + 2} ${py + 40} L ${-pw - 2} ${py + 40} L ${-ww + 2} ${wy} Z`} fill={L.color} {...st} />
          <path d={d`M ${-ww + 2} ${wy} L ${ww - 2} ${wy}`} {...thin} />
          <path d={d`M -9 ${wy + 12} l 18 0 l 0 12 l -18 0 Z`} {...thin} />
        </g>
      )}
      {details}
    </g>
  );
}

function LowerBody({ g, L, ol }: { g: Geo; L: Look; ol: number }) {
  const { py, pw, ay, leg } = g;
  const st = { stroke: LINE, strokeWidth: ol, strokeLinejoin: 'round' as const };
  const lx = pw - leg - 0.5;
  const legStroke = (x: number, y0: number, y1: number, color: string, w: number, key: string) => (
    <g key={key}>
      <path d={d`M ${x} ${y0} L ${x} ${y1}`} stroke={LINE} strokeWidth={w + ol * 2} strokeLinecap="round" />
      <path d={d`M ${x} ${y0} L ${x} ${y1}`} stroke={color} strokeWidth={w} strokeLinecap="round" />
    </g>
  );
  const shoes = [-1, 1].map((s) => {
    const x = s * lx;
    const sh = L.shoes;
    return (
      <g key={`s${s}`}>
        <path d={d`M ${x - leg * 0.95} ${ay + 1} Q ${x - leg * 1.05} ${-0.5} ${x - leg * 0.55} 0 L ${x + leg * 1.55} 0 Q ${x + leg * 2.0} ${-0.5} ${x + leg * 1.6} ${ay * 0.5} Q ${x + leg * 0.9} ${ay - 1} ${x - leg * 0.95} ${ay + 1} Z`} fill={sh} {...st} />
        {sh === '#f3efe9' && <path d={d`M ${x - leg * 0.85} ${-2.5} L ${x + leg * 1.6} ${-2.5}`} stroke="#cfc6bb" strokeWidth={ol * 0.8} />}
      </g>
    );
  });
  const skinLegs = (y0: number, w: number) => [-1, 1].map((s) => legStroke(s * lx, y0, ay + 2, SKIN, w, `k${s}`));
  if (L.lower === 'pants') {
    const hip = d`M ${-pw} ${py - 8} L ${pw} ${py - 8} L ${pw} ${py + 10} Q 0 ${py + 18} ${-pw} ${py + 10} Z`;
    return (
      <g>
        {[-1, 1].map((s) => legStroke(s * lx, py + 4, ay + 2, L.bottom, leg * 2, `l${s}`))}
        <path d={hip} fill={L.bottom} stroke={LINE} strokeWidth={ol} strokeLinejoin="round" />
        <path d={d`M ${-pw + ol} ${py + 9} Q 0 ${py + 16} ${pw - ol} ${py + 9} L ${pw - ol} ${py} L ${-pw + ol} ${py} Z`} fill={L.bottom} />
        <path d={d`M 0 ${py + 6} L 0 ${py + 16}`} stroke={LINE} strokeWidth={ol * 0.6} />
        <path d={d`M ${-lx + leg} ${py + 8} L ${-lx + leg - 1} ${ay}`} stroke={darken(L.bottom, 0.25)} strokeWidth={ol * 0.8} opacity={0.6} />
        {shoes}
      </g>
    );
  }
  if (L.lower === 'shorts') {
    return (
      <g>
        {skinLegs(py + 14, leg * 1.7)}
        {[-1, 1].map((s) => legStroke(s * lx, py + 2, py + 18, L.bottom, leg * 2.3, `h${s}`))}
        <path d={d`M ${-pw} ${py - 8} L ${pw} ${py - 8} L ${pw} ${py + 8} Q 0 ${py + 14} ${-pw} ${py + 8} Z`} fill={L.bottom} stroke={LINE} strokeWidth={ol} strokeLinejoin="round" />
        {shoes}
      </g>
    );
  }
  const len = L.lower === 'longskirt' ? ay - 26 - py : 36;
  const flare = L.lower === 'longskirt' ? 10 : 9;
  const skirt = d`M ${-pw + 2} ${py - 8} L ${pw - 2} ${py - 8} L ${pw + flare} ${py + len} Q 0 ${py + len + 6} ${-pw - flare} ${py + len} Z`;
  return (
    <g>
      {skinLegs(py + len - 6, leg * 1.65)}
      <path d={skirt} fill={L.bottom} {...st} />
      <path d={d`M -6 ${py - 2} L -9 ${py + len} M 8 ${py - 2} L 12 ${py + len}`} stroke={darken(L.bottom, 0.25)} strokeWidth={ol * 0.6} opacity={0.6} />
      {shoes}
    </g>
  );
}

// ---------------------------------------------------------------------------
// 인물 전체
// ---------------------------------------------------------------------------
export interface FigureMetrics {
  R: number;
  hy: number;
  /** 머리 꼭대기 (머리카락·더듬이 포함) */
  top: number;
  chin: number;
  mouth: number;
  sy: number;
  sw: number;
  py: number;
}

export function metricsOf(a: Actor): FigureMetrics {
  if (a.role === 'mirror') return { R: 27, hy: -178, top: -212, chin: -150, mouth: -170, sy: -150, sw: 26, py: -130 };
  const g = geoOf(a);
  const L = lookOf(a);
  const H = hairOf(L, g.R, 1);
  const age = a.age ?? 'adult';
  return {
    R: g.R,
    hy: g.hy,
    top: g.hy - (1.15 + H.topExtra + (L.ahoge ? 0.45 : 0)) * g.R,
    chin: g.hy + EYE[age].chin * g.R,
    mouth: g.hy + EYE[age].my * g.R,
    sy: g.sy,
    sw: g.sw,
    py: g.py,
  };
}

const ABOVE_FX: Fx[] = ['bulb', 'cloud', 'exclaim', 'question', 'zzz', 'steam'];
export const hasAboveFx = (a: Actor) => !!a.fx?.some((f) => ABOVE_FX.includes(f));

/** 인물 한 명. 부모 그룹이 (발 위치, 배율)로 옮겨 준다 */
export function Figure({ a, uid, z, layer }: { a: Actor; uid: string; z: number; layer: 'shadow' | 'body' }) {
  if (a.role === 'mirror') return layer === 'body' ? <Mascot a={a} uid={uid} /> : null;
  const g = geoOf(a);
  const L = lookOf(a);
  const age = a.age ?? 'adult';
  const female = a.gender === 'female';
  const F = FACES[a.face];
  const dir = a.dir ?? 1;
  const lw = z ** -0.45;
  const ol = 2.1 * lw;
  const detail = z >= 1.4;
  const R = g.R;
  const turn = a.front ? 0 : 0.7;
  const fx = [...(a.fx ?? [])];
  if (F.sweat && !fx.includes('sweat')) fx.push('sweat');
  const fxSide: 1 | -1 = a.x < 300 ? -1 : 1;

  if (layer === 'shadow') {
    return (
      <g>
        {fx.includes('shine') && <Rays y={g.hy} />}
        {fx.includes('flame') && <Aura g={g} />}
        <ellipse cx={0} cy={-1} rx={g.pw * 1.7} ry={6} fill="#1d1020" opacity={0.14} />
      </g>
    );
  }

  const H = hairOf(L, R, ol);
  const E = EYE[age];
  const ew = E.ew * R;
  const eh = E.eh * R * (female ? 1.04 : 0.94);
  const tf = turn * 0.07 * R;
  const look: Pt = a.front ? (F.look ?? [0, 0]) : [(F.look?.[0] ?? 0) + 0.18 * turn, F.look?.[1] ?? 0];
  const tilt = F.tilt ?? 0;
  const [lead, back] = poseArms(a.pose, g, turn);
  const sL: Pt = [g.sw - 5, g.sy + 8];
  const sB: Pt = [-(g.sw - 5), g.sy + 8];
  // 팔꿈치는 바깥·아래쪽으로 굽는 쪽을 고른다
  const solve = (s0: Pt, h: Pt, side: 1 | -1) => {
    const a1 = elbowIK(s0, h, g.ua, g.fa, 1);
    const a2 = elbowIK(s0, h, g.ua, g.fa, -1);
    const score = (x: { e: Pt }) => side * x.e[0] + 0.35 * x.e[1];
    return score(a1) >= score(a2) ? a1 : a2;
  };
  const armLead = solve(sL, lead.h, 1);
  const armBack = solve(sB, back.h, -1);
  const W = WEAR[L.wear];
  const sleeve = W.sleeveColor ? W.sleeveColor(L) : L.color;

  const armView = (s: Pt, arm: { e: Pt; h: Pt }, spec: ArmSpec, key: string) => {
    const ang = (Math.atan2(arm.h[1] - arm.e[1], arm.h[0] - arm.e[0]) * 180) / Math.PI;
    const rot = spec.rot ?? ang;
    const len = Math.hypot(arm.h[0] - arm.e[0], arm.h[1] - arm.e[1]) || 1;
    const cut: Pt = [arm.h[0] - ((arm.h[0] - arm.e[0]) / len) * g.hand * 0.4, arm.h[1] - ((arm.h[1] - arm.e[1]) / len) * g.hand * 0.4];
    const full = d`M ${s[0]} ${s[1]} L ${arm.e[0]} ${arm.e[1]} L ${cut[0]} ${cut[1]}`;
    const mid: Pt = [lerp(s[0], arm.e[0], 0.62), lerp(s[1], arm.e[1], 0.62)];
    const short = d`M ${s[0]} ${s[1]} L ${mid[0]} ${mid[1]}`;
    const stroke = (p: string, color: string, w: number) => (
      <g>
        <path d={p} stroke={LINE} strokeWidth={w + ol * 2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <path d={p} stroke={color} strokeWidth={w} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    );
    const isLong = W.sleeve === 'long';
    return (
      <g key={key}>
        {isLong ? stroke(full, sleeve, g.arm) : stroke(full, SKIN, g.arm * 0.82)}
        {!isLong && stroke(short, sleeve, g.arm + 2)}
        {L.wear === 'track' && <path d={full} stroke={WHITE} strokeWidth={1.6} fill="none" strokeLinecap="round" opacity={0.9} transform="translate(0 -3)" />}
        <HandView at={cut} rot={rot} k={spec.hand} s={g.hand} color={SKIN} ol={ol} />
      </g>
    );
  };

  // 머리 (기울임: 목을 축으로)
  const face = facePath(R, age, female && age !== 'kid', turn);
  const faceClip = `${uid}-face`;
  const hairClip = `${uid}-hair`;
  const exL = -E.ex * R + tf * 1.15;
  const exR = E.ex * R + tf;
  const ey = E.ey * R;
  const browY = ey - eh * 1.32 - 0.02 * R;
  const ny = (E.ey + E.my) / 2 * R + 0.04 * R;
  const my = E.my * R;
  const blush = F.blush ?? (age === 'kid' ? 1 : 0);
  const ears = H.ears === 'both' || (H.ears === 'near' && turn > 0) ? (H.ears === 'both' || a.front ? [-1, 1] : [1]) : [];
  const head = (
    <g transform={`translate(0 ${g.hy}) rotate(${tilt} 0 ${R * 1.1})`}>
      <defs>
        <clipPath id={faceClip}>
          <path d={face} />
        </clipPath>
        <clipPath id={hairClip}>
          <path d={H.front} />
        </clipPath>
        <linearGradient id={`${uid}-iris`} x1={0} y1={0} x2={0} y2={1}>
          <stop offset="0" stopColor={darken(L.iris, 0.35)} />
          <stop offset="0.55" stopColor={L.iris} />
          <stop offset="1" stopColor={lighten(L.iris, 0.45)} />
        </linearGradient>
        <radialGradient id={`${uid}-blush`}>
          <stop offset="0" stopColor={BLUSH} stopOpacity={blush === 2 ? 0.75 : 0.5} />
          <stop offset="1" stopColor={BLUSH} stopOpacity={0} />
        </radialGradient>
      </defs>
      {ears.map((s) => (
        <g key={s}>
          <path d={d`M ${s * 0.9 * R} ${0.1 * R} C ${s * 1.16 * R} ${0.02 * R} ${s * 1.2 * R} ${0.5 * R} ${s * 0.92 * R} ${0.56 * R}`} fill={SKIN} stroke={LINE} strokeWidth={ol} />
          <path d={d`M ${s * 0.98 * R} ${0.2 * R} Q ${s * 1.08 * R} ${0.3 * R} ${s * 0.98 * R} ${0.42 * R}`} fill="none" stroke={SKIN_SHADE} strokeWidth={ol * 1.2} strokeLinecap="round" />
        </g>
      ))}
      <path d={face} fill={SKIN} />
      <g clipPath={`url(#${faceClip})`}>
        {/* 얼굴 옆 그늘 · 앞머리 그림자 */}
        <ellipse cx={-1.35 * R} cy={0.3 * R} rx={0.6 * R} ry={1.3 * R} fill={SKIN_SHADE} opacity={0.75} />
        <path d={H.front} fill={SKIN_SHADE} transform={`translate(${(0.03 * R).toFixed(1)} ${(0.1 * R).toFixed(1)})`} />
        {F.shade && (
          <g>
            <rect x={-R * 1.2} y={-R * 1.2} width={R * 2.4} height={R * 1.3} fill="#5b4f9a" opacity={0.22} />
            {[-0.5, -0.25, 0, 0.25, 0.5].map((k) => (
              <path key={k} d={d`M ${k * R} ${-0.7 * R} L ${k * R} ${-0.1 * R}`} stroke="#5b56a8" strokeWidth={ol * 1.1} opacity={0.75} />
            ))}
          </g>
        )}
      </g>
      <path d={face} fill="none" stroke={LINE} strokeWidth={ol} strokeLinejoin="round" />
      {blush > 0 &&
        [exL, exR].map((x, i) => (
          <g key={i}>
            <ellipse cx={x + (i ? 0.06 : -0.06) * R} cy={ey + 0.42 * R} rx={0.27 * R} ry={0.15 * R} fill={`url(#${uid}-blush)`} />
            {blush === 2 &&
              [-1, 0, 1].map((k) => (
                <path key={k} d={d`M ${x + k * 0.09 * R + 0.04 * R} ${ey + 0.36 * R} l ${-0.06 * R} ${0.1 * R}`} stroke="#e8686c" strokeWidth={ol * 0.6} strokeLinecap="round" />
              ))}
          </g>
        ))}
      {F.bags &&
        [exL, exR].map((x, i) => <path key={i} d={d`M ${x - 0.6 * ew} ${ey + 1.25 * eh} Q ${x} ${ey + 1.5 * eh} ${x + 0.6 * ew} ${ey + 1.25 * eh}`} stroke="#a58fbf" strokeWidth={ol * 0.7} fill="none" strokeLinecap="round" />)}
      {L.wrinkles &&
        [exL, exR].map((x, i) => {
          const o = i ? 1 : -1;
          return <path key={i} d={d`M ${x + o * 1.25 * ew} ${ey - 0.1 * eh} l ${o * 0.1 * R} ${-0.04 * R} M ${x + o * 1.25 * ew} ${ey + 0.25 * eh} l ${o * 0.1 * R} ${0.03 * R}`} stroke={SKIN_SHADE} strokeWidth={ol * 0.8} strokeLinecap="round" />;
        })}
      <EyeView x={exL} y={ey} o={-1} ew={ew * (1 - turn * 0.1)} eh={eh} F={F} L={L} R={R} ol={ol} uid={uid} detail={detail} look={look} />
      <EyeView x={exR} y={ey} o={1} ew={ew} eh={eh} F={F} L={L} R={R} ol={ol} uid={uid} detail={detail} look={look} />
      {/* 코 */}
      <path d={d`M ${tf * 1.4 + 0.04 * R} ${ny - 0.07 * R} L ${tf * 1.4 + 0.07 * R} ${ny + 0.03 * R} L ${tf * 1.4 - 0.01 * R} ${ny + 0.045 * R}`} stroke={darken(SKIN_SHADE, 0.25)} strokeWidth={ol * 0.75} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <MouthView k={F.mouth} x={tf * 1.2} y={my} R={R} ol={ol} />
      {F.tears &&
        [exL, exR].map((x, i) => {
          const o = i ? 1 : -1;
          const x0 = x + o * 0.15 * ew;
          const y0 = ey + 0.85 * eh;
          const y1 = ey + 2.7 * eh;
          return (
            <g key={i} opacity={0.92}>
              <path d={d`M ${x0 - 0.06 * R} ${y0} C ${x0 - 0.08 * R} ${lerp(y0, y1, 0.4)} ${x0 + o * 0.1 * R} ${lerp(y0, y1, 0.7)} ${x0 + o * 0.06 * R} ${y1} Q ${x0 + o * 0.03 * R} ${y1 + 0.04 * R} ${x0 + o * 0.02 * R} ${y1} C ${x0 + o * 0.02 * R} ${lerp(y0, y1, 0.7)} ${x0 + 0.08 * R} ${lerp(y0, y1, 0.4)} ${x0 + 0.06 * R} ${y0} Z`} fill="#9ad6ff" stroke="#5aaee8" strokeWidth={ol * 0.4} />
              <path d={d`M ${x0 + o * 0.05 * R} ${y1 + 0.1 * R} q ${0.035 * R} ${0.06 * R} 0 ${0.1 * R} q ${-0.035 * R} ${-0.04 * R} 0 ${-0.1 * R} Z`} fill="#9ad6ff" stroke="#5aaee8" strokeWidth={ol * 0.4} />
            </g>
          );
        })}
      {/* 앞머리 */}
      <path d={H.front} fill={L.hairColor} />
      <g clipPath={`url(#${hairClip})`}>
        <path d={shinePath(R)} fill={lighten(L.hairColor, L.hairColor === GRAY ? 0.7 : 0.42)} opacity={L.hairColor === GRAY ? 0.8 : 0.5} />
        <ellipse cx={-1.15 * R} cy={0.2 * R} rx={0.55 * R} ry={1.2 * R} fill={darken(L.hairColor, 0.25)} opacity={0.35} />
        {detail &&
          [-0.55, -0.2, 0.15, 0.5].map((k) => (
            <path key={k} d={d`M ${k * R * 0.6} ${-1.0 * R} Q ${k * R * 1.2 + 0.1 * R} ${-0.5 * R} ${k * R * 1.1} ${-0.2 * R}`} stroke={L.hairColor === GRAY ? darken(L.hairColor, 0.3) : lighten(L.hairColor, 0.3)} strokeWidth={ol * 0.45} fill="none" opacity={0.6} />
          ))}
      </g>
      <path d={H.front} fill="none" stroke={LINE} strokeWidth={ol} strokeLinejoin="round" />
      {H.extra}
      {L.ahoge && <path d={d`M ${0.02 * R} ${-1.12 * R} C ${0.04 * R} ${-1.5 * R} ${0.42 * R} ${-1.62 * R} ${0.52 * R} ${-1.42 * R} C ${0.38 * R} ${-1.46 * R} ${0.2 * R} ${-1.4 * R} ${0.17 * R} ${-1.1 * R} Z`} fill={L.hairColor} stroke={LINE} strokeWidth={ol * 0.85} strokeLinejoin="round" />}
      {/* 눈썹은 앞머리 위에 */}
      {[
        [exL, -1],
        [exR, 1],
      ].map(([x, o]) => (
        <g key={o}>
          <path d={browPath(x, browY, o, ew, R, F.brow)} fill={SKIN} stroke={SKIN} strokeWidth={ol * 1.5} strokeLinejoin="round" />
          <path d={browPath(x, browY, o, ew, R, F.brow)} fill={darken(L.hairColor === GRAY ? '#8a837c' : L.hairColor, 0.2)} />
        </g>
      ))}
      {L.glasses && (
        <g fill={WHITE} fillOpacity={0.18} stroke={LINE} strokeWidth={ol * 0.9}>
          <rect x={exL - 1.45 * ew} y={ey - 1.15 * eh} width={2.9 * ew} height={2.3 * eh} rx={0.9 * ew} />
          <rect x={exR - 1.45 * ew} y={ey - 1.15 * eh} width={2.9 * ew} height={2.3 * eh} rx={0.9 * ew} />
          <path d={d`M ${exL + 1.45 * ew} ${ey - 0.2 * eh} Q ${(exL + exR) / 2} ${ey - 0.5 * eh} ${exR - 1.45 * ew} ${ey - 0.2 * eh}`} fill="none" />
          <path d={d`M ${exR - 0.9 * ew} ${ey + 0.7 * eh} L ${exR - 0.3 * ew} ${ey - 0.6 * eh}`} stroke={WHITE} strokeOpacity={0.8} strokeWidth={ol * 0.8} />
        </g>
      )}
    </g>
  );

  const heldAtHold: Pt = [0, g.sy + 0.5 * (g.ua + g.fa) - 8];
  const holding = a.pose === 'hold' && !!a.held;
  const handAt = armLead.h;
  const heldScale = age === 'kid' ? 0.72 : 0.86;
  const neckTop = g.hy + EYE[age].chin * R - 8;

  return (
    <g>
      <g transform={dir < 0 ? 'scale(-1 1)' : undefined}>
        {/* 뒷머리 (몸 뒤) */}
        <g transform={`translate(0 ${g.hy}) rotate(${tilt} 0 ${R * 1.1})`}>{H.back}</g>
        {L.wear === 'hoodie' && <path d={d`M ${-g.sw * 0.82} ${g.sy + 4} Q ${-g.sw * 0.7} ${g.sy - 15} 0 ${g.sy - 13} Q ${g.sw * 0.7} ${g.sy - 15} ${g.sw * 0.82} ${g.sy + 4} Z`} fill={darken(L.color, 0.1)} stroke={LINE} strokeWidth={ol} />}
        {!back.front && a.pose !== 'scratch' && armView(sB, armBack, back, 'b')}
        {a.pose === 'scratch' && armView(sL, armLead, lead, 'l')}
        {!lead.front && a.pose !== 'scratch' && armView(sL, armLead, lead, 'l')}
        {!back.front && a.pose === 'scratch' && armView(sB, armBack, back, 'b')}
        <LowerBody g={g} L={L} ol={ol} />
        {/* 목 */}
        <rect x={-g.neck} y={neckTop} width={g.neck * 2} height={g.sy - neckTop + 4} fill={SKIN_SHADE} stroke={LINE} strokeWidth={ol} />
        <rect x={-g.neck + ol / 2} y={neckTop + 12} width={g.neck * 2 - ol} height={Math.max(0, g.sy - neckTop - 8)} fill={SKIN} />
        <Clothes g={g} L={L} ol={ol} uid={uid} />
        {head}
      </g>
      {holding && (
        <g transform={`translate(${heldAtHold[0]} ${heldAtHold[1]}) scale(${heldScale})`}>
          <HeldView kind={a.held!} at={[0, 0]} />
        </g>
      )}
      <g transform={dir < 0 ? 'scale(-1 1)' : undefined}>
        {back.front && armView(sB, armBack, back, 'b')}
        {lead.front && armView(sL, armLead, lead, 'l')}
      </g>
      {a.held && !holding && (
        <g transform={`translate(${(handAt[0] * dir).toFixed(1)} ${handAt[1].toFixed(1)}) scale(${heldScale})`}>
          <HeldView kind={a.held} at={[0, 0]} inHand />
        </g>
      )}
      <FrontFx fx={fx} g={g} side={fxSide} ol={ol} />
    </g>
  );
}

/** 머리 위쪽 둥근 광택 띠 (천사링) */
function shinePath(R: number): string {
  const cy = -0.05 * R;
  const a0 = -Math.PI * 0.8;
  const a1 = -Math.PI * 0.4;
  const r1 = 0.9 * R;
  const r2 = 0.77 * R;
  const pt = (a: number, r: number): Pt => [Math.cos(a) * r, cy + Math.sin(a) * r];
  const [x0, y0] = pt(a0, r1);
  const [x1, y1] = pt(a1, r1);
  let p = d`M ${x0} ${y0} A ${r1} ${r1} 0 0 1 ${x1} ${y1}`;
  const n = 6;
  for (let i = 0; i <= n; i++) {
    const a = lerp(a1, a0, i / n);
    const [x, y] = pt(a, i % 2 ? r2 - 0.06 * R : r2 + 0.05 * R);
    p += d` L ${x} ${y}`;
  }
  return `${p} Z`;
}

function Rays({ y }: { y: number }) {
  return (
    <g opacity={0.55}>
      {Array.from({ length: 14 }, (_, i) => {
        const a0 = (i / 14) * Math.PI * 2;
        const a1 = a0 + Math.PI / 28;
        const R = 170;
        return <path key={i} d={d`M 0 ${y} L ${Math.cos(a0) * R} ${y + Math.sin(a0) * R} L ${Math.cos(a1) * R} ${y + Math.sin(a1) * R} Z`} fill="#ffe58a" />;
      })}
    </g>
  );
}

function Aura({ g }: { g: Geo }) {
  const top = g.hy - g.R * 2.2;
  return (
    <g>
      <path d={d`M ${-g.sw * 2} 0 C ${-g.sw * 2.6} ${g.sy} ${-g.R * 1.6} ${g.hy} ${-g.R * 0.6} ${top} C ${-g.R * 0.2} ${g.hy - g.R * 1.2} ${g.R * 0.1} ${g.hy - g.R * 1.6} ${g.R * 0.4} ${top - 24} C ${g.R * 0.7} ${g.hy - g.R * 1.3} ${g.R * 1.5} ${g.hy - g.R} ${g.R * 1.2} ${top + 10} C ${g.R * 2} ${g.hy} ${g.sw * 2.6} ${g.sy} ${g.sw * 2} 0 Z`} fill="#ff8a3d" opacity={0.3} />
      <path d={d`M ${-g.sw * 1.4} 0 C ${-g.sw * 1.8} ${g.sy} ${-g.R} ${g.hy} 0 ${g.hy - g.R * 1.6} C ${g.R} ${g.hy} ${g.sw * 1.8} ${g.sy} ${g.sw * 1.4} 0 Z`} fill="#ffc94a" opacity={0.35} />
    </g>
  );
}

function FrontFx({ fx, g, side, ol }: { fx: Fx[]; g: Geo; side: 1 | -1; ol: number }) {
  const r = g.R * 1.08;
  const y = g.hy;
  const out: ReactNode[] = [];
  for (const f of fx) {
    switch (f) {
      case 'sweat': {
        const x = side * r * 1.0;
        const yy = y - r * 0.45;
        out.push(
          <g key={f}>
            <path d={d`M ${x} ${yy - 13} C ${x + 9} ${yy - 1} ${x + 10} ${yy + 9} ${x} ${yy + 10} C ${x - 10} ${yy + 9} ${x - 9} ${yy - 1} ${x} ${yy - 13} Z`} fill="#a9dcff" stroke="#3b8ac4" strokeWidth={ol * 0.8} />
            <ellipse cx={x - 2.5} cy={yy + 3} rx={2} ry={3} fill={WHITE} opacity={0.9} />
          </g>,
        );
        break;
      }
      case 'anger': {
        const x = side * r * 0.85;
        const yy = y - r * 0.85;
        out.push(
          <g key={f} stroke="#e5484d" strokeWidth={3.4} fill="none" strokeLinecap="round">
            {[0, 90, 180, 270].map((rot) => (
              <path key={rot} d={d`M ${x + 3} ${yy - 11} Q ${x + 3} ${yy - 3} ${x + 11} ${yy - 3}`} transform={`rotate(${rot} ${x} ${yy})`} />
            ))}
          </g>,
        );
        break;
      }
      case 'sparkle':
        out.push(
          <g key={f} fill="#ffe066" stroke="#e0a800" strokeWidth={ol * 0.6}>
            <path d={starPath(-r - 30, y - r * 0.4, 13)} />
            <path d={starPath(r + 32, y - r * 0.05, 16)} />
            <path d={starPath(r * 0.75, y - r - 30, 10)} />
            <path d={starPath(-r * 0.6, y - r - 22, 7)} />
          </g>,
        );
        break;
      case 'hearts':
        out.push(
          <g key={f} fill="#ff5d7a" stroke={LINE} strokeWidth={ol * 0.6}>
            <path d={heartPath(side * (r + 24), y - r * 0.55, 11)} />
            <path d={heartPath(side * (r + 42), y - r - 8, 8)} />
            <path d={heartPath(-side * (r + 20), y - r * 0.9, 9)} />
          </g>,
        );
        break;
      case 'gloom':
        out.push(
          <g key={f} stroke="#5b4f9a" strokeWidth={2.6} opacity={0.6} strokeLinecap="round">
            {[-28, -14, 0, 14, 28].map((x) => (
              <path key={x} d={d`M ${x} ${y - r * 1.25} L ${x} ${y - r * (Math.abs(x) > 20 ? 0.75 : 0.6)}`} />
            ))}
          </g>,
        );
        break;
      case 'exclaim': {
        const x = side * r * 0.8;
        const yy = y - r - 36;
        out.push(
          <g key={f} transform={`rotate(${side * 10} ${x} ${yy})`}>
            <path d={d`M ${x - 5} ${yy - 24} L ${x + 5} ${yy - 24} L ${x + 3} ${yy + 4} L ${x - 3} ${yy + 4} Z`} fill="#e5484d" stroke={LINE} strokeWidth={ol * 0.8} strokeLinejoin="round" />
            <circle cx={x} cy={yy + 13} r={4.6} fill="#e5484d" stroke={LINE} strokeWidth={ol * 0.8} />
          </g>,
        );
        break;
      }
      case 'question': {
        const x = side * r * 0.8;
        const yy = y - r - 34;
        out.push(
          <g key={f} transform={`rotate(${side * 12} ${x} ${yy})`}>
            <path d={d`M ${x - 10} ${yy - 12} C ${x - 10} ${yy - 28} ${x + 12} ${yy - 28} ${x + 12} ${yy - 12} C ${x + 12} ${yy - 2} ${x} ${yy - 3} ${x} ${yy + 6}`} stroke="#4566a6" strokeWidth={6} fill="none" strokeLinecap="round" />
            <circle cx={x} cy={yy + 17} r={4} fill="#4566a6" />
          </g>,
        );
        break;
      }
      case 'bulb': {
        const x = side * r * 0.2;
        const yy = y - r - 48;
        out.push(
          <g key={f}>
            {[0, 1, 2, 3, 4, 5, 6].map((i) => {
              const a = Math.PI * (1 + i / 6);
              return <path key={i} d={d`M ${x + Math.cos(a) * 22} ${yy + Math.sin(a) * 22} L ${x + Math.cos(a) * 31} ${yy + Math.sin(a) * 31}`} stroke="#f2b600" strokeWidth={3} strokeLinecap="round" />;
            })}
            <circle cx={x} cy={yy} r={15} fill="#ffe066" stroke={LINE} strokeWidth={ol} />
            <rect x={x - 7} y={yy + 12} width={14} height={10} rx={2} fill="#b8b8b8" stroke={LINE} strokeWidth={ol * 0.9} />
          </g>,
        );
        break;
      }
      case 'zzz':
        out.push(
          <g key={f} stroke="#4566a6" strokeWidth={3} fill="none" strokeLinejoin="round" strokeLinecap="round">
            {[0, 1, 2].map((i) => {
              const s = 5 + i * 2.5;
              const x = side * (r * 0.6 + i * 14);
              const yy = y - r - 10 - i * 20;
              return <path key={i} d={d`M ${x - s} ${yy - s} L ${x + s} ${yy - s} L ${x - s} ${yy + s} L ${x + s} ${yy + s}`} />;
            })}
          </g>,
        );
        break;
      case 'music':
        out.push(
          <g key={f}>
            {[
              [side * (r + 18), y - r * 0.7],
              [side * (r + 40), y - r - 8],
            ].map(([x, yy], i) => (
              <g key={i}>
                <ellipse cx={x} cy={yy} rx={6} ry={4.5} transform={`rotate(-20 ${x} ${yy})`} fill={LINE} />
                <path d={d`M ${x + 5} ${yy - 1} L ${x + 5} ${yy - 24} Q ${x + 15} ${yy - 18} ${x + 13} ${yy - 8}`} stroke={LINE} strokeWidth={2.4} fill="none" />
              </g>
            ))}
          </g>,
        );
        break;
      case 'steam':
        out.push(
          <g key={f} fill={WHITE} stroke={LINE} strokeWidth={ol * 0.8}>
            {[-1, 1].map((sd) => (
              <g key={sd}>
                <circle cx={sd * r * 0.62} cy={y - r - 10} r={10} />
                <circle cx={sd * r * 0.86} cy={y - r - 24} r={8} />
                <circle cx={sd * r * 1.06} cy={y - r - 36} r={6} />
              </g>
            ))}
          </g>,
        );
        break;
      case 'cloud': {
        const yy = y - r - 56;
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
              <circle key={`o${i}`} cx={x} cy={yy + oy} r={rr} fill="#7c8597" stroke={LINE} strokeWidth={4} />
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
          <g key={f} fill="#a9dcff" stroke="#3b8ac4" strokeWidth={ol * 0.6}>
            {[-1, 1].map((sd) => {
              const x = sd * (r + 12);
              const yy = y - 2;
              return <path key={sd} d={d`M ${x} ${yy - 8} C ${x + 5} ${yy} ${x + 6} ${yy + 6} ${x} ${yy + 7} C ${x - 6} ${yy + 6} ${x - 5} ${yy} ${x} ${yy - 8} Z`} />;
            })}
          </g>,
        );
        break;
      case 'dots':
        out.push(
          <g key={f} fill={LINE}>
            {[0, 1, 2].map((i) => (
              <circle key={i} cx={side * (r * 0.4 + i * 13)} cy={y - r - 18} r={3.4} />
            ))}
          </g>,
        );
        break;
      default:
        break;
    }
  }
  return <g>{out}</g>;
}

// ---------------------------------------------------------------------------
// 거울 요정 '명경이'
// ---------------------------------------------------------------------------
function Mascot({ a, uid }: { a: Actor; uid: string }) {
  const y = -178;
  const ol = 2;
  const happy = ['smile', 'grin', 'laugh', 'proud', 'love', 'sparkle', 'calm'].includes(a.face);
  const surprised = ['surprised', 'shock'].includes(a.face);
  const worried = ['worried', 'sad', 'nervous', 'tired'].includes(a.face);
  return (
    <g>
      <defs>
        <radialGradient id={`${uid}-glow`}>
          <stop offset="0" stopColor="#fff6c8" stopOpacity={0.9} />
          <stop offset="1" stopColor="#fff6c8" stopOpacity={0} />
        </radialGradient>
        <linearGradient id={`${uid}-rim`} x1={0} y1={0} x2={1} y2={1}>
          <stop offset="0" stopColor="#ffe08a" />
          <stop offset="1" stopColor="#c9952c" />
        </linearGradient>
        <linearGradient id={`${uid}-glass`} x1={0} y1={0} x2={0.6} y2={1}>
          <stop offset="0" stopColor="#f2fbff" />
          <stop offset="1" stopColor="#b8dcf5" />
        </linearGradient>
      </defs>
      <circle cx={0} cy={y} r={52} fill={`url(#${uid}-glow)`} />
      {/* 손잡이 */}
      <path d={d`M -6 ${y + 24} L -7 ${y + 52} Q 0 ${y + 60} 7 ${y + 52} L 6 ${y + 24} Z`} fill={`url(#${uid}-rim)`} stroke={LINE} strokeWidth={ol} strokeLinejoin="round" />
      <circle cx={0} cy={y + 60} r={4.5} fill="none" stroke="#c9952c" strokeWidth={3} />
      {/* 작은 팔 */}
      <path d={d`M -26 ${y + 4} Q -40 ${y - 2} -40 ${y - 14}`} stroke="#d9a63a" strokeWidth={5} fill="none" strokeLinecap="round" />
      <path d={d`M 26 ${y + 4} Q 38 ${y + 10} 42 ${y + 0}`} stroke="#d9a63a" strokeWidth={5} fill="none" strokeLinecap="round" />
      <circle cx={0} cy={y} r={28} fill={`url(#${uid}-rim)`} stroke={LINE} strokeWidth={ol} />
      <circle cx={0} cy={y} r={21.5} fill={`url(#${uid}-glass)`} stroke={darken('#c9952c', 0.2)} strokeWidth={1.2} />
      <path d={d`M -14 ${y - 9} Q -8 ${y - 17} 2 ${y - 18}`} stroke={WHITE} strokeWidth={4} fill="none" strokeLinecap="round" opacity={0.85} />
      {/* 얼굴 */}
      {happy ? (
        <g stroke={LINE} strokeWidth={2.4} fill="none" strokeLinecap="round">
          <path d={d`M -11 ${y + 1} Q -7 ${y - 5} -3 ${y + 1}`} />
          <path d={d`M 3 ${y + 1} Q 7 ${y - 5} 11 ${y + 1}`} />
        </g>
      ) : (
        <g fill={LINE}>
          <ellipse cx={-7} cy={y} rx={surprised ? 3.4 : 2.8} ry={surprised ? 4.2 : 3.6} />
          <ellipse cx={7} cy={y} rx={surprised ? 3.4 : 2.8} ry={surprised ? 4.2 : 3.6} />
          <circle cx={-6} cy={y - 1.5} r={1} fill={WHITE} />
          <circle cx={8} cy={y - 1.5} r={1} fill={WHITE} />
        </g>
      )}
      <ellipse cx={-13} cy={y + 7} rx={4} ry={2.4} fill={BLUSH} opacity={0.6} />
      <ellipse cx={13} cy={y + 7} rx={4} ry={2.4} fill={BLUSH} opacity={0.6} />
      {surprised ? (
        <ellipse cx={0} cy={y + 9} rx={2.6} ry={3.2} fill="#9a3c42" />
      ) : worried ? (
        <path d={d`M -4 ${y + 10} Q 0 ${y + 6} 4 ${y + 10}`} stroke={LINE} strokeWidth={2} fill="none" strokeLinecap="round" />
      ) : (
        <path d={d`M -4 ${y + 7} Q -2 ${y + 10} 0 ${y + 7} Q 2 ${y + 10} 4 ${y + 7}`} stroke={LINE} strokeWidth={2} fill="none" strokeLinecap="round" />
      )}
      <g fill="#ffe066" stroke="#e0a800" strokeWidth={1}>
        <path d={starPath(-38, y - 30, 7)} />
        <path d={starPath(40, y - 24, 5)} />
        <path d={starPath(34, y + 30, 4)} />
      </g>
    </g>
  );
}

