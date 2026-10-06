/**
 * 인생 웹툰 컷 — 외부 이미지·라이브러리 없이 SVG만으로 그린다.
 * 화면에는 SVG를 그대로 보여 주고, 저장할 때는 같은 SVG를 캔버스로 옮겨 PNG로 만든다.
 * (모든 스타일을 속성으로 넣어, CSS 없이 이미지로 옮겨도 똑같이 보이게 한다)
 *
 * 그림체: 굵은 손그림 선(살짝 흔들리는 필터) + 단색 면 + 점 눈. 카메라는 full(전신)·bust(상반신)·face(얼굴).
 */
import { useId, type ReactNode } from 'react';
import { clamp, d, lighten, type Pt } from './draw.ts';
import { BEHIND_FX, FxBehind, FxFront } from './fx.tsx';
import { Backdrop, DARK_BG, EMOTION_BG, FRONT_PROPS, OVERLAY_PROPS, PropArt } from './stage.tsx';
import { textWidth, widest, wrap, wrapBalanced } from './text.ts';
import { INK, MIRROR_Y, MONSTER_TOP, PAPER, Toon, anchorOf, dimsOf, placeOf, rigOf, toPanel, type Anchor, type Place } from './toon.tsx';
import type { Actor, Bg, Half, Line, Mark, Panel, PropSpec, Sfx, Shot, TextBeat } from './types.ts';

export const PW = 600;
export const FONT =
  "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', 'Malgun Gothic', 'Noto Sans KR', 'Noto Sans CJK KR', sans-serif";
export const SERIF = "'Noto Serif KR', 'Nanum Myeongjo', AppleMyungjo, Batang, 'Noto Serif CJK KR', serif";
const WHITE = '#ffffff';
const TEXT = '#231f1d';

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

// ---------------------------------------------------------------------------
// 카메라
// ---------------------------------------------------------------------------
export const CAP = { size: 19, lh: 26, px: 14, py: 10 };
export const SAY = { size: 21, lh: 27, px: 16, py: 11, maxW: 232 };
const Z_FULL = 1.22;
const Z_HALF = 0.92;

export function panelHeight(p: Panel): number {
  if (p.h) return p.h;
  if (p.cover) return 520;
  if (p.split) return 430;
  switch (p.shot ?? 'full') {
    case 'face':
      return 400;
    case 'bust':
      return 420;
    default: {
      const capLines = p.cap ? wrap(p.cap, CAP.size, PW - 24 - (p.badge ? 150 : 0) - CAP.px * 2, 9).length : 0;
      const n = p.talk.length;
      return n >= 3 || (n >= 2 && capLines >= 1) ? 480 : 440;
    }
  }
}

export interface Camera {
  shot: Shot;
  W: number;
  H: number;
  /** 인물 배율 */
  z: number;
  /** 바닥 높이 (컷 좌표) */
  G: number;
  /** 배경(전신 컷 좌표) → 컷 변환 */
  bg: string;
  /** 배경 확대 배율 */
  m: number;
  /** 배경을 그릴 때의 바닥 높이 */
  Gf: number;
  /** 집중선의 가운데 */
  cx: number;
  cy: number;
}

export function focusIndex(p: Pick<Panel, 'focus' | 'cast'>): number {
  if (p.focus !== undefined) return p.focus;
  const i = p.cast.findIndex((a) => a.role === 'me');
  return i >= 0 ? i : 0;
}

/** 인물 머리 가운데의 높이 (인물 좌표) */
function headLocalY(a: Actor): number {
  if (a.role === 'mirror') return MIRROR_Y - (a.lift ?? 0);
  if (a.role === 'monster') return MONSTER_TOP[a.monster ?? 'slime'] * 0.7;
  return rigOf(a).head[1] - (a.lift ?? 0);
}

export function cameraOf(p: Panel, W = PW): Camera {
  const H = panelHeight(p);
  const shot: Shot = p.cover ? 'full' : (p.shot ?? 'full');
  const Gf = H - 34;
  const f = p.cast[focusIndex(p)];
  if (shot === 'full') {
    const z = p.cover ? 1.5 : Z_FULL;
    const G = p.cover ? H - 28 : Gf;
    let cx = W / 2;
    let cy = H * 0.42;
    if (f) {
      const an = anchorOf(f, placeOf(f, G, z));
      cx = an.x;
      cy = an.cy;
    }
    return { shot, W, H, z, G, bg: '', m: 1, Gf, cx, cy };
  }
  const z = shot === 'bust' ? 2.0 : 2.8;
  const s = f?.scale ?? 1;
  const target = shot === 'bust' ? H * 0.46 : H * 0.56;
  const hy = f ? headLocalY(f) : -140;
  const G = target - hy * z * s;
  const fx = f?.x ?? W / 2;
  const m = z / Z_FULL;
  const bg = `translate(${fx} ${G.toFixed(1)}) scale(${m.toFixed(3)}) translate(${-fx} ${-Gf})`;
  return { shot, W, H, z, G, bg, m, Gf, cx: fx, cy: target };
}

/** 컷 안 인물들의 자리 */
export function placesOf(cast: Actor[], cam: Camera): Place[] {
  return cast.map((a) => placeOf(a, cam.G, cam.z));
}

export function anchorsOf(cast: Actor[], cam: Camera): Anchor[] {
  return cast.map((a, i) => anchorOf(a, placesOf(cast, cam)[i]));
}

// ---------------------------------------------------------------------------
// 글자 칸 · 말풍선 배치
// ---------------------------------------------------------------------------
export interface BubbleBox extends Rect {
  lines: string[];
  kind: 'say' | 'think' | 'shout' | 'whisper';
  tail: { bx: number; by: number; tx: number; ty: number; side: 'bottom' | 'left' | 'right' | 'top' };
}

export interface PanelLayout {
  H: number;
  cap: (Rect & { lines: string[] }) | null;
  bubbles: BubbleBox[];
}

function hit(a: Rect, b: Rect, gap = 8): boolean {
  return a.x < b.x + b.w + gap && b.x < a.x + a.w + gap && a.y < b.y + b.h + gap && b.y < a.y + a.h + gap;
}

function badgeRect(text: string, W: number): Rect {
  const w = textWidth(text, 17) + 30;
  return { x: W - 16 - w - 6, y: 8, w: w + 12, h: 52 };
}

export function sfxRect(s: Sfx): Rect {
  const size = s.size ?? 44;
  const w = textWidth(s.text, size) * 1.05;
  return { x: s.x - w / 2, y: s.y - size * 0.95, w, h: size * 1.2 };
}

export function markRect(m: Mark): Rect {
  const lines = m.text.split('\n');
  const w = widest(lines, 16) + 8;
  return { x: m.x - w / 2, y: m.y - 18, w, h: lines.length * 20 + 6 };
}

export function overlayRect(p: PropSpec): Rect | null {
  const rows = p.rows?.length ?? 0;
  switch (p.kind) {
    case 'status': {
      const w = p.w ?? 300;
      return { x: p.x - w / 2, y: p.y ?? 0, w, h: 62 + rows * 32 };
    }
    case 'rx': {
      const w = p.w ?? 250;
      return { x: p.x - w / 2 - 6, y: (p.y ?? 0) - 8, w: w + 12, h: 70 + rows * 30 + 16 };
    }
    case 'graph':
      return { x: p.x - (p.w ?? 300) / 2, y: (p.y ?? 0) - 6, w: p.w ?? 300, h: (p.h ?? 170) + 10 };
    case 'score':
      return { x: p.x - (p.w ?? 230) / 2, y: p.y ?? 0, w: (p.w ?? 230) + 6, h: 126 };
    case 'board':
      return { x: p.x - (p.w ?? 240) / 2, y: p.y ?? 0, w: (p.w ?? 240) + 6, h: (p.h ?? 54 + rows * 30) + 6 };
    case 'phonebig':
      return { x: p.x - (p.w ?? 200) / 2, y: p.y ?? 0, w: p.w ?? 200, h: 90 + rows * 44 };
    case 'shelf': {
      const w = p.w ?? 520;
      const cols = Math.min(4, Math.max(1, rows));
      return { x: p.x - w / 2, y: p.y ?? 0, w, h: Math.ceil(rows / cols) * 96 };
    }
    case 'battery':
      return { x: p.x - (p.w ?? 110) / 2, y: (p.y ?? 0) - 26, w: (p.w ?? 110) + 12, h: 52 };
    case 'cloudcoin':
      return { x: p.x - 72, y: (p.y ?? 0) - 44, w: 150, h: 68 };
    default:
      return null;
  }
}

const COVER_TEXT: Rect = { x: 0, y: 0, w: 300, h: 520 };

interface LayoutInput {
  W: number;
  H: number;
  cap?: string;
  badge?: string;
  basis?: string;
  cover?: boolean;
  talk: Line[];
  anchors: Anchor[];
  obstacles: Rect[];
  /** 위쪽에 비워 둘 높이 (분할 컷의 이름표) */
  top?: number;
}

function layoutBubbles(inp: LayoutInput): PanelLayout {
  const { W, H } = inp;
  const capMax = W - 24 - (inp.badge ? 150 : 0);
  const capLines = inp.cap ? wrapBalanced(inp.cap, CAP.size, capMax - CAP.px * 2, 3) : [];
  const y0 = inp.top ?? 0;
  const cap = capLines.length ? { x: 12, y: 12 + y0, w: Math.min(capMax, widest(capLines, CAP.size) + CAP.px * 2), h: capLines.length * CAP.lh + CAP.py * 2, lines: capLines } : null;
  const bottom = H - (inp.basis ? 40 : 12);
  const heads = inp.anchors;
  const headRects: Rect[] = heads.map((h) => ({ x: h.x - h.r, y: Math.max(h.bare + 6, 0), w: h.r * 2, h: Math.max(10, h.chin - h.bare - 4) }));
  const obstacles: Rect[] = [...inp.obstacles];
  if (cap) obstacles.push(cap);
  if (inp.badge) obstacles.push(badgeRect(inp.badge, W));
  if (inp.cover) obstacles.push(COVER_TEXT);
  const bubbles: BubbleBox[] = [];
  let prev: Rect | null = null;
  const sayMax = Math.min(SAY.maxW, W - 40);
  for (const ln of inp.talk) {
    const kind = ln.kind ?? 'say';
    const extra = kind === 'shout' ? 14 : kind === 'think' ? 8 : 0;
    const head = heads[ln.by];
    const before: Rect | null = prev;
    // 읽는 순서: 앞 말풍선보다 왼쪽에 놓이면 더 아래에 있어야 나중에 읽힌다
    const orderOk = (r: Rect): boolean => !before || r.y >= before.y + (r.x + r.w / 2 < before.x + before.w / 2 - 10 ? 34 : 0);
    const free = (r: Rect, strict = true) =>
      r.x >= 8 &&
      r.x + r.w <= W - 8 &&
      r.y >= 8 + y0 &&
      r.y + r.h <= bottom &&
      orderOk(r) &&
      !obstacles.some((o) => hit(r, o)) &&
      (!strict || (!headRects.some((o, i) => hit(r, o, i === ln.by ? 3 : 8)) && !heads.some((h, i) => hit(r, h.body, i === ln.by ? 2 : 4))));
    const size = (maxW: number, maxLines = 3) => {
      const fits = wrap(ln.text, SAY.size, maxW, 99).length <= maxLines;
      const lines = wrapBalanced(ln.text, SAY.size, maxW, maxLines);
      const w = Math.max(84, widest(lines, SAY.size) + SAY.px * 2 + extra * 2);
      const h = lines.length * SAY.lh + SAY.py * 2 + extra;
      return { lines, w, h, fits };
    };
    let placed: { box: Rect; side: BubbleBox['tail']['side']; lines: string[] } | null = null;
    if (!head) {
      for (const maxW of [sayMax, 190]) {
        const { lines, w, h, fits } = size(maxW);
        if (!fits && maxW !== sayMax) continue;
        for (let y = 8 + y0; y + h <= bottom && !placed; y += 4) {
          for (const x of [W - w - 14, (W - w) / 2, 14]) {
            const r = { x, y, w, h };
            if (free(r)) {
              placed = { box: r, side: 'top', lines };
              break;
            }
          }
        }
        if (placed) break;
      }
    } else {
      const others = heads.filter((_, i) => i !== ln.by);
      const right = others.some((h) => h.x > head.x + 40);
      const left = others.some((h) => h.x < head.x - 40);
      const toward: 1 | -1 = right && !left ? -1 : left && !right ? 1 : head.x < W / 2 ? 1 : -1;
      for (const maxW of [sayMax, 196, 168, 148]) {
        const { lines, w, h, fits } = size(maxW);
        if (!fits) continue;
        const above = (limit: number): Rect | null => {
          for (let y = 8 + y0; y + h <= limit - 4; y += 4) {
            for (const dx of [toward * 20, 0, toward * 60, -toward * 30, toward * 100, -toward * 70, toward * 140]) {
              const cx = clamp(head.x + dx, w / 2 + 10, W - w / 2 - 10);
              if (Math.abs(cx - head.x) > w / 2 + 60) continue;
              const r = { x: cx - w / 2, y, w, h };
              if (free(r)) return r;
            }
          }
          return null;
        };
        const beside = (): { r: Rect; side: 'left' | 'right' } | null => {
          for (let y = 8 + y0; y <= head.cy - 6; y += 4) {
            for (const sd of [toward, -toward]) {
              const r = { x: sd > 0 ? head.x + head.r + 14 : head.x - head.r - 14 - w, y, w, h };
              if (free(r)) return { r, side: sd > 0 ? 'left' : 'right' };
            }
          }
          return null;
        };
        const a = above(head.top);
        if (a) {
          placed = { box: a, side: 'bottom', lines };
          break;
        }
        const b = beside();
        if (b) {
          placed = { box: b.r, side: b.side, lines };
          break;
        }
        const c = head.top < head.bare ? above(head.bare) : null;
        if (c) {
          placed = { box: c, side: 'bottom', lines };
          break;
        }
      }
    }
    if (!placed) {
      // 마지막 수단: 몸은 조금 가려도 글자 칸·다른 말풍선과는 겹치지 않는 가장 가까운 빈자리
      const fitW = [168, 196, sayMax, Math.min(300, W - 24)].find((mw) => size(mw).fits);
      const { lines, w, h } = fitW ? size(fitW) : size(Math.min(300, W - 24), 4);
      const hx = head?.x ?? W - 40;
      const hy = head?.bare ?? 0;
      let best: Rect = { x: clamp(hx - w / 2, 10, W - w - 10), y: cap ? cap.y + cap.h + 8 : 10 + y0, w, h };
      let bestD = Infinity;
      for (let y = 8 + y0; y + h <= bottom; y += 4) {
        for (let x = 10; x + w <= W - 10; x += 10) {
          const r = { x, y, w, h };
          if (obstacles.some((o) => hit(r, o, 6))) continue;
          const onFace = headRects.some((o) => hit(r, o, 0)) ? 300 : 0;
          const dist = Math.hypot(x + w / 2 - hx, y + h - hy) + (orderOk(r) ? 0 : 400) + onFace;
          if (dist < bestD) {
            bestD = dist;
            best = r;
          }
        }
      }
      placed = { box: best, side: head ? 'bottom' : 'top', lines };
    }
    const box: Rect = placed.box;
    const side = placed.side;
    obstacles.push(box);
    prev = box;
    let tail: BubbleBox['tail'];
    if (!head) {
      tail = { bx: box.x + box.w * 0.8, by: box.y, tx: box.x + box.w * 0.8 + 14, ty: Math.max(y0, box.y - 14), side: 'top' };
    } else if (side === 'bottom') {
      const tx0 = head.x + (box.x + box.w / 2 < head.x ? -0.3 : 0.3) * head.r;
      const bx = clamp(tx0, box.x + 26, box.x + box.w - 26);
      const by = box.y + box.h;
      let tx = tx0;
      let ty = Math.max(head.bare + 4, by + 14);
      const len = Math.hypot(tx - bx, ty - by);
      if (len > 52) {
        tx = bx + ((tx - bx) * 52) / len;
        ty = by + ((ty - by) * 52) / len;
      }
      tail = { bx, by, tx, ty, side };
    } else {
      const sd = side === 'left' ? 1 : -1;
      let tx = head.x + sd * head.r * 0.92;
      let ty = clamp(head.mouth[1], head.cy - head.r * 0.4, head.chin);
      const bx = side === 'left' ? box.x : box.x + box.w;
      const by = clamp(ty, box.y + 18, box.y + box.h - 18);
      const len = Math.hypot(tx - bx, ty - by);
      if (len > 46) {
        tx = bx + ((tx - bx) * 46) / len;
        ty = by + ((ty - by) * 46) / len;
      }
      tail = { bx, by, tx, ty, side };
    }
    bubbles.push({ ...box, lines: placed.lines, kind, tail });
  }
  return { H, cap, bubbles };
}

function obstaclesOf(props: PropSpec[] | undefined, sfx: Sfx[] | undefined, marks: Mark[] | undefined): Rect[] {
  const out: Rect[] = [];
  for (const p of props ?? []) {
    const r = overlayRect(p);
    if (r) out.push(r);
  }
  for (const s of sfx ?? []) out.push(sfxRect(s));
  for (const m of marks ?? []) out.push(markRect(m));
  return out;
}

export function layoutPanel(p: Panel, cam: Camera = cameraOf(p)): PanelLayout {
  return layoutBubbles({
    W: cam.W,
    H: cam.H,
    cap: p.cap,
    badge: p.badge,
    basis: p.basis,
    cover: !!p.cover,
    talk: p.talk,
    anchors: anchorsOf(p.cast, cam),
    obstacles: obstaclesOf(p.props, p.sfx, p.marks),
  });
}

/** 분할 컷 한쪽의 너비·카메라 */
export const HALF_W = PW / 2 - 4;
export const HALF_TAG = 40;

export function halfCamera(H: number): Camera {
  const G = H - 30;
  return { shot: 'full', W: HALF_W, H, z: Z_HALF, G, bg: '', m: 1, Gf: G, cx: HALF_W / 2, cy: H * 0.45 };
}

export function layoutHalf(h: Half, H: number, basis?: string): PanelLayout {
  const cam = halfCamera(H);
  return layoutBubbles({ W: HALF_W, H, basis, talk: h.talk, anchors: anchorsOf(h.cast, cam), obstacles: obstaclesOf(h.props, h.sfx, undefined), top: HALF_TAG });
}

// ---------------------------------------------------------------------------
// 말풍선 · 글자 칸 그리기
// ---------------------------------------------------------------------------
function tailPath(t: BubbleBox['tail'], wide = 10): string {
  if (t.side === 'bottom' || t.side === 'top') {
    const s = t.side === 'bottom' ? -6 : 6;
    return d`M ${t.bx - wide} ${t.by + s} Q ${(t.bx + t.tx) / 2 - 2} ${(t.by + t.ty) / 2} ${t.tx} ${t.ty} Q ${(t.bx + t.tx) / 2 + 5} ${(t.by + t.ty) / 2} ${t.bx + wide} ${t.by + s} Z`;
  }
  const sd = t.side === 'left' ? 1 : -1;
  return d`M ${t.bx + sd * 6} ${t.by - wide} Q ${(t.bx + t.tx) / 2} ${(t.by + t.ty) / 2 - 2} ${t.tx} ${t.ty} Q ${(t.bx + t.tx) / 2} ${(t.by + t.ty) / 2 + 5} ${t.bx + sd * 6} ${t.by + wide} Z`;
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
    const k = i % 2 ? 0.86 : 1.07;
    s += `${i ? 'L' : 'M'} ${Math.round((cx + Math.cos(a) * rx * k) * 10) / 10} ${Math.round((cy + Math.sin(a) * ry * k) * 10) / 10} `;
  }
  return `${s}Z`;
}

/** 말풍선 모양 (흔들림 필터를 받는 층) */
function BubbleShape({ b }: { b: BubbleBox }) {
  if (b.kind === 'think') {
    const bumps: [number, number, number][] = [];
    const step = 26;
    for (let x = b.x + 16; x <= b.x + b.w - 16; x += step) bumps.push([x, b.y + 2, 14], [x, b.y + b.h - 2, 14]);
    for (let y = b.y + 18; y <= b.y + b.h - 18; y += step) bumps.push([b.x + 2, y, 14], [b.x + b.w - 2, y, 14]);
    const t = b.tail;
    const dots: [number, number, number][] = [
      [t.bx + (t.tx - t.bx) * 0.45, t.by + (t.ty - t.by) * 0.45, 6.5],
      [t.bx + (t.tx - t.bx) * 0.88, t.by + (t.ty - t.by) * 0.88, 4],
    ];
    return (
      <g>
        {bumps.map(([x, y, r], i) => (
          <circle key={`o${i}`} cx={x} cy={y} r={r} fill={INK} stroke={INK} strokeWidth={4} />
        ))}
        <rect x={b.x} y={b.y} width={b.w} height={b.h} rx={22} fill={INK} stroke={INK} strokeWidth={4} />
        {bumps.map(([x, y, r], i) => (
          <circle key={`f${i}`} cx={x} cy={y} r={r} fill="#fbfaff" />
        ))}
        <rect x={b.x} y={b.y} width={b.w} height={b.h} rx={22} fill="#fbfaff" />
        {dots.map(([x, y, r], i) => (
          <circle key={`d${i}`} cx={x} cy={y} r={r} fill="#fbfaff" stroke={INK} strokeWidth={2.4} />
        ))}
      </g>
    );
  }
  const rx = Math.min(b.h / 2, 26);
  const shape = b.kind === 'shout' ? <path d={shoutPath(b)} /> : <rect x={b.x} y={b.y} width={b.w} height={b.h} rx={rx} />;
  const dash = b.kind === 'whisper' ? '7 6' : undefined;
  return (
    <g>
      <g fill={INK} stroke={INK} strokeWidth={b.kind === 'shout' ? 5.4 : 4.6} strokeLinejoin="round" strokeDasharray={dash}>
        {shape}
        {b.kind !== 'whisper' && <path d={tailPath(b.tail)} />}
      </g>
      <g fill={b.kind === 'shout' ? '#fffbe0' : WHITE}>
        {shape}
        <path d={tailPath(b.tail)} />
      </g>
      {b.kind === 'whisper' && <path d={tailPath(b.tail)} fill="none" stroke={INK} strokeWidth={2} strokeDasharray="5 5" />}
    </g>
  );
}

function BubbleText({ b, serif }: { b: BubbleBox; serif?: boolean }) {
  return (
    <text
      x={b.x + b.w / 2}
      y={b.y + SAY.py + SAY.size * 0.84 + (b.kind === 'shout' ? 7 : b.kind === 'think' ? 4 : 0)}
      fontSize={SAY.size}
      fontWeight={b.kind === 'shout' ? 900 : 700}
      fontFamily={serif ? SERIF : undefined}
      textAnchor="middle"
      fill={b.kind === 'think' ? '#4a403a' : b.kind === 'whisper' ? '#5b524c' : TEXT}
    >
      {b.lines.map((l, i) => (
        <tspan key={i} x={b.x + b.w / 2} dy={i ? SAY.lh : 0}>
          {l}
        </tspan>
      ))}
    </text>
  );
}

function CaptionView({ cap, drama }: { cap: Rect & { lines: string[] }; drama?: boolean }) {
  return (
    <g>
      <rect x={cap.x + 4} y={cap.y + 4} width={cap.w} height={cap.h} fill="#000000" opacity={0.2} />
      <rect x={cap.x} y={cap.y} width={cap.w} height={cap.h} fill={drama ? '#121016' : '#fff6c9'} stroke={drama ? '#ffffff' : INK} strokeWidth={2.6} />
      <text x={cap.x + CAP.px} y={cap.y + CAP.py + CAP.size * 0.84} fontSize={CAP.size} fontWeight={drama ? 800 : 700} fontFamily={drama ? SERIF : undefined} fill={drama ? '#ffffff' : TEXT}>
        {cap.lines.map((l, i) => (
          <tspan key={i} x={cap.x + CAP.px} dy={i ? CAP.lh : 0}>
            {l}
          </tspan>
        ))}
      </text>
    </g>
  );
}

function Badge({ text, W }: { text: string; W: number }) {
  const w = textWidth(text, 17) + 30;
  const x = W - 16 - w;
  const y = 16;
  return (
    <g transform={`rotate(5 ${x + w / 2} ${y + 18})`}>
      <rect x={x + 3} y={y + 3} width={w} height={36} rx={10} fill="#000000" opacity={0.15} />
      <rect x={x} y={y} width={w} height={36} rx={10} fill="#ffd84d" stroke={INK} strokeWidth={2.6} />
      <text x={x + w / 2} y={y + 24.5} fontSize={17} fontWeight={900} textAnchor="middle" fill={INK}>
        {text}
      </text>
    </g>
  );
}

export const BASIS = { size: 13 };

function BasisTag({ text, H, W = PW, dark }: { text: string; H: number; W?: number; dark?: boolean }) {
  const lines = wrap(`근거 · ${text}`, BASIS.size, W - 60, 1);
  const w = widest(lines, BASIS.size) + 18;
  return (
    <g>
      <rect x={10} y={H - 32} width={w} height={22} rx={11} fill={dark ? '#000000' : WHITE} opacity={0.82} stroke={dark ? '#57534e' : '#d6d3d1'} strokeWidth={1} />
      <text x={19} y={H - 16.5} fontSize={BASIS.size} fontWeight={600} fill={dark ? '#e7e5e4' : '#57534e'}>
        {lines[0]}
      </text>
    </g>
  );
}

function SfxView({ s }: { s: Sfx }) {
  const size = s.size ?? 44;
  const color = s.color ?? '#e5484d';
  const common = { x: s.x, y: s.y, fontSize: size, fontWeight: 900, textAnchor: 'middle' as const, transform: `rotate(${s.rot ?? -8} ${s.x} ${s.y})` };
  return (
    <g>
      <text {...common} fill={WHITE} stroke={WHITE} strokeWidth={size * 0.26} strokeLinejoin="round">
        {s.text}
      </text>
      <text {...common} fill={color} stroke={INK} strokeWidth={size * 0.05}>
        {s.text}
      </text>
    </g>
  );
}

function MarkView({ m, dark }: { m: Mark; dark?: boolean }) {
  const lines = m.text.split('\n');
  const color = dark ? '#ffd84d' : '#d6336c';
  let arrow: ReactNode = null;
  if (m.to) {
    const [tx, ty] = m.to;
    const r = markRect(m);
    const sx = tx < r.x ? r.x - 4 : tx > r.x + r.w ? r.x + r.w + 4 : m.x;
    const sy = ty > r.y + r.h ? r.y + r.h + 2 : ty < r.y ? r.y - 4 : m.y;
    const mx = (sx + tx) / 2 + (ty - sy) * 0.2;
    const my = (sy + ty) / 2 - (tx - sx) * 0.2;
    const ang = Math.atan2(ty - my, tx - mx);
    const hx1 = tx - Math.cos(ang - 0.5) * 12;
    const hy1 = ty - Math.sin(ang - 0.5) * 12;
    const hx2 = tx - Math.cos(ang + 0.5) * 12;
    const hy2 = ty - Math.sin(ang + 0.5) * 12;
    arrow = <path d={d`M ${sx} ${sy} Q ${mx} ${my} ${tx} ${ty} M ${hx1} ${hy1} L ${tx} ${ty} L ${hx2} ${hy2}`} fill="none" stroke={color} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />;
  }
  return (
    <g>
      {arrow}
      {lines.map((l, i) => (
        <g key={i}>
          <text x={m.x} y={m.y + i * 20} fontSize={16} fontWeight={800} textAnchor="middle" fill={dark ? '#17151d' : WHITE} stroke={dark ? '#17151d' : WHITE} strokeWidth={4} strokeLinejoin="round">
            {l}
          </text>
          <text x={m.x} y={m.y + i * 20} fontSize={16} fontWeight={800} textAnchor="middle" fill={color}>
            {l}
          </text>
        </g>
      ))}
    </g>
  );
}

/** 회차 표지 글씨 (왼쪽) */
function CoverText({ c, tint }: { c: NonNullable<Panel['cover']>; tint: string }) {
  const titleLines = wrap(c.title, 46, 280, 3);
  const tagLines = wrap(c.tagline, 19, 260, 4);
  let y = 76;
  const plateH = 154 + (titleLines.length - 1) * 56 + 48 + tagLines.length * 28 - 6;
  return (
    <g>
      <rect x={14} y={22} width={300} height={plateH} rx={14} fill="#ffffff" opacity={0.82} />
      <text x={30} y={46} fontSize={14} fontWeight={800} fill="#6b5f57" letterSpacing={2}>
        명경사주 · 사주 개그 웹툰
      </text>
      <rect x={30} y={60} width={textWidth(c.kicker, 20) + 28} height={34} rx={4} fill={INK} transform="rotate(-3 40 76)" />
      <text x={44} y={84} fontSize={20} fontWeight={900} fill={WHITE} transform="rotate(-3 40 76)">
        {c.kicker}
      </text>
      {titleLines.map((l, i) => {
        y = 154 + i * 56;
        return (
          <g key={i} transform={`rotate(-2 30 ${y})`}>
            <rect x={26} y={y - 16} width={textWidth(l, 46) + 10} height={20} fill={lighten(tint, 0.2)} opacity={0.9} />
            <text x={30} y={y} fontSize={46} fontWeight={900} fill={WHITE} stroke={WHITE} strokeWidth={9} strokeLinejoin="round">
              {l}
            </text>
            <text x={30} y={y} fontSize={46} fontWeight={900} fill={TEXT}>
              {l}
            </text>
          </g>
        );
      })}
      {tagLines.map((l, i) => (
        <text key={i} x={30} y={y + 48 + i * 28} fontSize={19} fontWeight={700} fill="#4a403a">
          {l}
        </text>
      ))}
    </g>
  );
}

/** 컷마다 다른 SVG id — 같은 화면의 컷끼리(useId), 따로 그린 컷끼리(내용 해시) 모두 겹치지 않게 */
function uidOf(raw: string, content: unknown): string {
  const text = JSON.stringify(content);
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h * 33) ^ text.charCodeAt(i)) >>> 0;
  return `c${h.toString(36)}${raw.replace(/[^a-zA-Z0-9]/g, '')}`;
}

function seedOf(content: unknown): number {
  const text = JSON.stringify(content);
  let h = 7;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) % 100000;
  return h + 1;
}

/** 손그림 느낌의 흔들림 필터 */
function Wobble({ id, seed, scale = 2.6 }: { id: string; seed: number; scale?: number }) {
  return (
    <filter id={id} x="-3%" y="-3%" width="106%" height="106%">
      <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves={2} seed={seed % 97} result="n" />
      <feDisplacementMap in="SourceGraphic" in2="n" scale={scale} xChannelSelector="R" yChannelSelector="G" />
    </filter>
  );
}

// ---------------------------------------------------------------------------
// 무대 (배경 + 소품 + 인물 + 효과) — 컷·분할 컷이 함께 쓴다
// ---------------------------------------------------------------------------
interface StageProps {
  bg: Bg;
  cam: Camera;
  cast: Actor[];
  props?: PropSpec[];
  drama?: boolean;
  seed: number;
}

function Scene({ bg, cam, cast, props = [], drama, seed }: StageProps) {
  const { W, H } = cam;
  const places = placesOf(cast, cam);
  const anchors = cast.map((a, i) => anchorOf(a, places[i]));
  const emotion = EMOTION_BG.has(bg);
  const zoomed = cam.shot !== 'full' && !emotion;
  const sceneProps = props.filter((p) => !OVERLAY_PROPS.has(p.kind));
  const back = sceneProps.filter((p) => !FRONT_PROPS.has(p.kind));
  const front = sceneProps.filter((p) => FRONT_PROPS.has(p.kind));
  const k = (i: number) => Math.sqrt(places[i].s / Z_FULL);
  const actor = (a: Actor, i: number) => {
    const p = places[i];
    return (
      <g key={`a${i}`} transform={`translate(${p.x.toFixed(1)} ${p.G.toFixed(1)}) scale(${(p.s * p.dir).toFixed(3)} ${p.s.toFixed(3)}) translate(0 ${-p.lift})`}>
        <Toon a={a} z={p.s} drama={drama} />
      </g>
    );
  };
  const scaled = (node: ReactNode) => (zoomed ? <g transform={cam.bg}>{node}</g> : node);
  const Gb = zoomed ? cam.Gf : cam.G;
  return (
    <g>
      {scaled(<Backdrop bg={bg} W={zoomed ? W : W} H={H} G={Gb} cx={cam.cx} cy={cam.cy} seed={seed} />)}
      {zoomed && <rect width={W} height={H} fill={WHITE} opacity={0.18} />}
      {scaled(
        back.map((p, i) => (
          <g key={`bp${i}`}>
            <PropArt p={p} G={Gb} />
          </g>
        )),
      )}
      {cast.map((a, i) => ((a.fx ?? []).some((f) => BEHIND_FX.has(f)) ? <g key={`fb${i}`}>{FxBehind({ fx: a.fx ?? [], an: anchors[i], k: k(i) })}</g> : null))}
      {cast.map(actor)}
      {scaled(
        front.map((p, i) => (
          <g key={`fp${i}`}>
            <PropArt p={p} G={Gb} />
          </g>
        )),
      )}
      {cast.map((a, i) => {
        if (!(a.fx ?? []).length) return null;
        const hand: Pt | undefined = a.role !== 'mirror' && a.role !== 'monster' ? toPanel(places[i], rigOf(a).item) : undefined;
        return <g key={`ff${i}`}>{FxFront({ fx: a.fx ?? [], an: anchors[i], k: k(i), hand })}</g>;
      })}
    </g>
  );
}

/** 글자가 들어가는 위층 (흔들림 없이) — 이름표·든 물건 글자·글자 소품 */
function Labels({ cast, cam, props = [], dark }: { cast: Actor[]; cam: Camera; props?: PropSpec[]; dark?: boolean }) {
  const places = placesOf(cast, cam);
  return (
    <g>
      {props
        .filter((p) => OVERLAY_PROPS.has(p.kind))
        .map((p, i) => (
          <g key={`ov${i}`}>
            <PropArt p={p} G={cam.G} />
          </g>
        ))}
      {cast.map((a, i) => {
        const out: ReactNode[] = [];
        const an = anchorOf(a, places[i]);
        if (a.tag) {
          const w = textWidth(a.tag, 16) + 22;
          const y = an.top - 30;
          out.push(
            <g key="tag">
              <rect x={an.x - w / 2} y={y} width={w} height={26} rx={13} fill={a.role === 'monster' ? '#e5484d' : INK} />
              <text x={an.x} y={y + 18} fontSize={16} fontWeight={800} textAnchor="middle" fill={WHITE}>
                {a.tag}
              </text>
            </g>,
          );
        }
        if (a.heldLabel && a.held && a.role !== 'mirror' && a.role !== 'monster') {
          const [x, y] = toPanel(places[i], rigOf(a).item);
          const size = Math.max(12, 15 * Math.sqrt(places[i].s / Z_FULL));
          out.push(
            <g key="hl">
              <text x={x} y={y + size * 0.36} fontSize={size} fontWeight={900} textAnchor="middle" fill={WHITE} stroke={WHITE} strokeWidth={size * 0.3} strokeLinejoin="round">
                {a.heldLabel}
              </text>
              <text x={x} y={y + size * 0.36} fontSize={size} fontWeight={900} textAnchor="middle" fill={dark ? '#ffd84d' : '#c0392b'}>
                {a.heldLabel}
              </text>
            </g>,
          );
        }
        return <g key={`l${i}`}>{out}</g>;
      })}
    </g>
  );
}

// ---------------------------------------------------------------------------
// 한 컷 — 화면에도, PNG 저장에도 그대로 쓰는 독립 SVG
// ---------------------------------------------------------------------------
export function PanelArt({ p, label }: { p: Panel; label?: string }) {
  if (p.split) return <SplitArt p={p} label={label} />;
  const u = uidOf(useId(), p);
  const seed = seedOf(p);
  const cam = cameraOf(p);
  const { H, W } = cam;
  const L = layoutPanel(p, cam);
  const me = p.cast.find((a) => a.role === 'me');
  const tint = me?.outfit ?? '#f2c14e';
  const dark = !!p.drama || DARK_BG.has(p.bg);
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${W} ${H}`}
      width={W}
      height={H}
      role="img"
      data-panel=""
      data-h={H}
      aria-label={label ?? [p.cap, ...p.talk.map((l) => l.text)].filter(Boolean).join(' / ')}
      fontFamily={FONT}
      style={{ display: 'block', width: '100%', height: 'auto' }}
    >
      <defs>
        <clipPath id={`${u}clip`}>
          <rect width={W} height={H} />
        </clipPath>
        <Wobble id={`${u}w`} seed={seed} scale={p.drama ? 1.6 : 2.6} />
      </defs>
      <g clipPath={`url(#${u}clip)`}>
        <rect width={W} height={H} fill={PAPER} />
        <g filter={`url(#${u}w)`}>
          <Scene bg={p.drama && !p.cover ? (EMOTION_BG.has(p.bg) ? p.bg : 'drama') : p.bg} cam={cam} cast={p.cast} props={p.props} drama={p.drama} seed={seed} />
          {p.cover && <circle cx={me ? me.x : 420} cy={H * 0.44} r={170} fill={tint} opacity={0.18} />}
          {L.bubbles.map((b, i) => (
            <BubbleShape key={`bs${i}`} b={b} />
          ))}
        </g>
        <Labels cast={p.cast} cam={cam} props={p.props} dark={dark} />
        {(p.sfx ?? []).map((s, i) => (
          <SfxView key={`x${i}`} s={s} />
        ))}
        {(p.marks ?? []).map((m, i) => (
          <MarkView key={`m${i}`} m={m} dark={dark} />
        ))}
        {p.cover && <CoverText c={p.cover} tint={tint} />}
        {L.cap && <CaptionView cap={L.cap} drama={p.drama} />}
        {L.bubbles.map((b, i) => (
          <BubbleText key={`bt${i}`} b={b} serif={p.drama} />
        ))}
        {p.badge && <Badge text={p.badge} W={W} />}
        {p.basis && <BasisTag text={p.basis} H={H} dark={dark} />}
      </g>
      <rect x={1.5} y={1.5} width={W - 3} height={H - 3} fill="none" stroke={INK} strokeWidth={3} />
    </svg>
  );
}

/** 기대 vs 현실 — 두 칸을 한 장에 */
function SplitArt({ p, label }: { p: Panel; label?: string }) {
  const u = uidOf(useId(), p);
  const seed = seedOf(p);
  const H = panelHeight(p);
  const [A, B] = p.split!;
  const cam = halfCamera(H);
  const halves: [Half, number][] = [
    [A, 0],
    [B, PW / 2 + 4],
  ];
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${PW} ${H}`}
      width={PW}
      height={H}
      role="img"
      data-panel=""
      data-h={H}
      aria-label={label ?? [A.label, ...A.talk.map((l) => l.text), B.label, ...B.talk.map((l) => l.text)].join(' / ')}
      fontFamily={FONT}
      style={{ display: 'block', width: '100%', height: 'auto' }}
    >
      <defs>
        {halves.map(([, x], i) => (
          <clipPath key={i} id={`${u}c${i}`}>
            <rect x={x} width={HALF_W} height={H} />
          </clipPath>
        ))}
        <Wobble id={`${u}w`} seed={seed} />
      </defs>
      <rect width={PW} height={H} fill={WHITE} />
      {halves.map(([h, x], i) => {
        const L = layoutHalf(h, H, p.basis);
        const tagW = textWidth(h.label, 18) + 30;
        const dark = DARK_BG.has(h.bg);
        return (
          <g key={i} clipPath={`url(#${u}c${i})`}>
            <g transform={`translate(${x} 0)`}>
              <rect width={HALF_W} height={H} fill={PAPER} />
              <g filter={`url(#${u}w)`}>
                <Scene bg={h.bg} cam={cam} cast={h.cast} props={h.props} seed={seed + i} />
                {L.bubbles.map((b, j) => (
                  <BubbleShape key={`bs${j}`} b={b} />
                ))}
              </g>
              <Labels cast={h.cast} cam={cam} props={h.props} dark={dark} />
              {(h.sfx ?? []).map((s, j) => (
                <SfxView key={`x${j}`} s={s} />
              ))}
              <rect x={HALF_W / 2 - tagW / 2} y={8} width={tagW} height={30} rx={4} fill={i === 0 ? '#ffffff' : INK} stroke={INK} strokeWidth={2.6} />
              <text x={HALF_W / 2} y={29} fontSize={18} fontWeight={900} textAnchor="middle" fill={i === 0 ? INK : WHITE}>
                {h.label}
              </text>
              {L.bubbles.map((b, j) => (
                <BubbleText key={`bt${j}`} b={b} />
              ))}
              <rect x={1.5} y={1.5} width={HALF_W - 3} height={H - 3} fill="none" stroke={INK} strokeWidth={3} />
            </g>
          </g>
        );
      })}
      {p.basis && <BasisTag text={p.basis} H={H} dark={DARK_BG.has(A.bg) || DARK_BG.has(B.bg)} />}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// 글 칸 (장 제목·시간 경과·독백)
// ---------------------------------------------------------------------------
export const BEAT = { size: 23, lh: 37, maxW: 500 };

export function textBeatHeight(b: TextBeat): number {
  const style = b.style ?? 'plain';
  const lines = wrap(b.text, BEAT.size, BEAT.maxW, 8);
  if (style === 'time') return 120;
  if (style === 'chapter') return Math.max(170, lines.length * 44 + 110);
  return Math.max(150, lines.length * BEAT.lh + 100);
}

export function TextBeatArt({ b }: { b: TextBeat }) {
  const u = uidOf(useId(), b);
  const style = b.style ?? 'plain';
  const H = textBeatHeight(b);
  const W = PW;
  const svgProps = {
    xmlns: 'http://www.w3.org/2000/svg',
    viewBox: `0 0 ${W} ${H}`,
    width: W,
    height: H,
    role: 'img',
    'data-panel': '',
    'data-h': H,
    'aria-label': b.text,
    fontFamily: FONT,
    style: { display: 'block', width: '100%', height: 'auto' },
  };
  if (style === 'time') {
    return (
      <svg {...svgProps}>
        <rect width={W} height={H} fill="#f4f1ea" />
        <circle cx={W / 2 - textWidth(b.text, 26) / 2 - 30} cy={H / 2} r={18} fill="#ffffff" stroke={INK} strokeWidth={3} />
        <path d={d`M ${W / 2 - textWidth(b.text, 26) / 2 - 30} ${H / 2} l ${0} ${-11} M ${W / 2 - textWidth(b.text, 26) / 2 - 30} ${H / 2} l ${8} ${4}`} stroke={INK} strokeWidth={3} strokeLinecap="round" />
        <text x={W / 2 + 10} y={H / 2 + 9} fontSize={26} fontWeight={900} textAnchor="middle" fill="#57534e">
          {b.text}
        </text>
      </svg>
    );
  }
  if (style === 'chapter') {
    const lines = wrap(b.text, 34, BEAT.maxW, 4);
    const y0 = H / 2 - ((lines.length - 1) * 44) / 2 + 22;
    return (
      <svg {...svgProps}>
        <rect width={W} height={H} fill={PAPER} />
        <path d={d`M ${40} ${y0 + (lines.length - 1) * 44 + 14} Q ${W / 2} ${y0 + (lines.length - 1) * 44 + 2} ${W - 40} ${y0 + (lines.length - 1) * 44 + 16}`} stroke="#ffd84d" strokeWidth={16} strokeLinecap="round" fill="none" opacity={0.85} />
        {b.no && (
          <g>
            <rect x={W / 2 - textWidth(b.no, 16) / 2 - 14} y={y0 - 70} width={textWidth(b.no, 16) + 28} height={28} rx={14} fill={INK} />
            <text x={W / 2} y={y0 - 50} fontSize={16} fontWeight={800} textAnchor="middle" fill={WHITE}>
              {b.no}
            </text>
          </g>
        )}
        <text x={W / 2} y={y0} fontSize={34} fontWeight={900} textAnchor="middle" fill={TEXT}>
          {lines.map((l, i) => (
            <tspan key={i} x={W / 2} dy={i ? 44 : 0}>
              {l}
            </tspan>
          ))}
        </text>
        {b.basis && (
          <text x={W / 2} y={H - 16} fontSize={13} textAnchor="middle" fill="#8a817a">
            {`근거 · ${b.basis}`}
          </text>
        )}
        <rect x={1.5} y={1.5} width={W - 3} height={H - 3} fill="none" stroke={INK} strokeWidth={3} />
      </svg>
    );
  }
  const lines = wrap(b.text, BEAT.size, BEAT.maxW, 8);
  const dark = style === 'black';
  const y0 = H / 2 - ((lines.length - 1) * BEAT.lh) / 2 + BEAT.size * 0.35;
  return (
    <svg {...svgProps}>
      {style === 'soft' ? (
        <>
          <defs>
            <linearGradient id={`${u}g`} x1={0} y1={0} x2={1} y2={1}>
              <stop offset="0" stopColor="#fff1f4" />
              <stop offset="1" stopColor="#eef2ff" />
            </linearGradient>
          </defs>
          <rect width={W} height={H} fill={`url(#${u}g)`} />
        </>
      ) : (
        <rect width={W} height={H} fill={dark ? '#17151d' : PAPER} />
      )}
      <text x={W / 2} y={y0} fontSize={BEAT.size} fontWeight={dark ? 800 : 700} fontFamily={dark ? SERIF : undefined} textAnchor="middle" fill={dark ? '#f3ede4' : '#3a322d'}>
        {lines.map((l, i) => (
          <tspan key={i} x={W / 2} dy={i ? BEAT.lh : 0}>
            {l}
          </tspan>
        ))}
      </text>
      {b.basis && (
        <text x={W / 2} y={H - 22} fontSize={13} textAnchor="middle" fill={dark ? '#a8a29e' : '#8a817a'}>
          {`근거 · ${b.basis}`}
        </text>
      )}
      <rect x={1.5} y={1.5} width={W - 3} height={H - 3} fill="none" stroke={INK} strokeWidth={3} />
    </svg>
  );
}

export { dimsOf };
