/**
 * 인생 웹툰 컷 — 외부 이미지·라이브러리 없이 SVG만으로 그린다.
 * 화면에는 SVG를 그대로 보여 주고, 저장할 때는 같은 SVG를 캔버스로 옮겨 PNG로 만든다.
 * (모든 스타일을 속성으로 넣어, CSS 없이 이미지로 옮겨도 똑같이 보이게 한다)
 *
 * 카메라: full(전신) · bust(상반신) · close(얼굴) · eyes(눈) — 가까울수록 배경은 덜 확대하고 흐리게 해서 깊이감을 준다.
 */
import { useId } from 'react';
import { clamp, d, lighten } from './draw.ts';
import { Figure, LINE, hasAboveFx, metricsOf } from './figure.tsx';
import { Background, FRONT_PROPS, GROUND, MoodBg, SH, SW, SceneProp } from './scene.tsx';
import { textWidth, widest, wrap, wrapBalanced } from './text.ts';
import type { Actor, Panel, Sfx, Shot, TextBeat } from './types.ts';

export const PW = 600;
export const FONT =
  "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', 'Malgun Gothic', 'Noto Sans KR', 'Noto Sans CJK KR', sans-serif";
const WHITE = '#ffffff';
const TEXT = '#2b2522';

// ---------------------------------------------------------------------------
// 카메라
// ---------------------------------------------------------------------------
export function panelHeight(p: Panel): number {
  if (p.height) return p.height;
  if (p.cover) return 540;
  switch (p.shot ?? 'full') {
    case 'eyes':
      return 230;
    case 'close':
      return 420;
    case 'bust':
      return 440;
    default: {
      // 말이 많은 전신 컷은 머리 위 공간을 넉넉하게
      const capLines = p.caption ? wrap(p.caption, CAP.size, PW - 24 - (p.badge ? 150 : 0) - CAP.px * 2, 9).length : 0;
      const n = p.lines.length;
      return n >= 3 || (n >= 2 && capLines >= 2) ? 500 : 440;
    }
  }
}

export interface Camera {
  shot: Shot;
  H: number;
  /** 인물 배율 */
  z: number;
  /** 발이 놓이는 높이 (컷 좌표) */
  G: number;
  /** 무대(배경) → 컷 변환 */
  bg: string;
  /** 무대 소품 → 컷 변환 */
  props: string;
  blur: number;
  veil: number;
}

export function focusIndex(p: Panel): number {
  if (p.focus !== undefined) return p.focus;
  const i = p.actors.findIndex((a) => a.role === 'me');
  return i >= 0 ? i : 0;
}

export function cameraOf(p: Panel): Camera {
  const H = panelHeight(p);
  const shot: Shot = p.cover ? 'bust' : (p.shot ?? 'full');
  if (shot === 'full') {
    const z = p.zoom ?? 1;
    const G = H - 36;
    const zb = Math.max(1, H / SH);
    const bg = `translate(${SW / 2} ${H}) scale(${zb}) translate(${-SW / 2} ${-SH})`;
    const props = z === 1 ? `translate(0 ${G - GROUND})` : `translate(${SW / 2} ${G}) scale(${z}) translate(${-SW / 2} ${-GROUND})`;
    return { shot, H, z, G, bg, props, blur: 0, veil: 0.04 };
  }
  const f = p.actors[focusIndex(p)];
  const m = f ? metricsOf(f) : metricsOf({ role: 'me', x: 300, face: 'neutral', pose: 'idle' });
  const base = shot === 'bust' ? 1.8 : shot === 'close' ? 3.0 : 4.6;
  const z = (base * 33) / m.R;
  let G: number;
  if (shot === 'bust') G = H * (p.cover ? 0.6 : 0.63) - m.chin * z;
  else if (shot === 'close') G = H * 0.9 - m.chin * z;
  else G = H * 0.56 - (m.hy + 0.3 * m.R) * z;
  const fx = f?.x ?? 300;
  const zb = shot === 'bust' ? 1.3 : shot === 'close' ? 1.6 : 1.9;
  const bg = `translate(${fx} ${H * 0.45}) scale(${zb}) translate(${-fx} -250)`;
  const props = `translate(${fx} ${G}) scale(${z}) translate(${-fx} ${-GROUND})`;
  return { shot, H, z, G, bg, props, blur: shot === 'bust' ? 2.2 : shot === 'close' ? 3.4 : 4.4, veil: shot === 'bust' ? 0.14 : 0.22 };
}

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface HeadPos {
  x: number;
  cy: number;
  r: number;
  /** 머리 꼭대기 (효과 포함) */
  top: number;
  /** 머리카락 꼭대기 */
  bare: number;
  chin: number;
  mouth: number;
  body: Rect;
}

/** 컷 좌표에서 인물 머리·몸의 자리 (말풍선 배치용) */
export function headOf(a: Actor, cam: Camera): HeadPos {
  const m = metricsOf(a);
  const z = cam.z;
  const cy = cam.G + m.hy * z;
  const r = m.R * 1.12 * z;
  const bare = cam.G + m.top * z;
  let top = bare;
  if (hasAboveFx(a)) top -= 62 * z;
  if (a.held === 'umbrella' || a.pose === 'cheer') top = Math.min(top, cam.G + (m.hy - m.R * 2.4) * z);
  const half = (m.sw + 8) * z;
  return {
    x: a.x,
    cy,
    r,
    top,
    bare,
    chin: cam.G + m.chin * z,
    mouth: cam.G + m.mouth * z,
    body: { x: a.x - half, y: cam.G + m.sy * z, w: half * 2, h: -m.sy * z },
  };
}

// ---------------------------------------------------------------------------
// 내레이션 · 말풍선 배치
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

export const CAP = { size: 19, lh: 26, px: 14, py: 10 };
export const SAY = { size: 21, lh: 27, px: 16, py: 11, maxW: 232 };

function hit(a: Rect, b: Rect, gap = 8): boolean {
  return a.x < b.x + b.w + gap && b.x < a.x + a.w + gap && a.y < b.y + b.h + gap && b.y < a.y + a.h + gap;
}

function badgeRect(text: string): Rect {
  const w = textWidth(text, 17) + 30;
  return { x: PW - 16 - w - 6, y: 8, w: w + 12, h: 52 };
}

const COVER_TEXT: Rect = { x: 0, y: 0, w: 300, h: 540 };

export function layoutPanel(p: Panel, cam: Camera = cameraOf(p)): PanelLayout {
  const H = cam.H;
  const capMax = PW - 24 - (p.badge ? 150 : 0);
  const capLines = p.caption ? wrapBalanced(p.caption, CAP.size, capMax - CAP.px * 2, 3) : [];
  const cap = capLines.length ? { x: 12, y: 12, w: Math.min(capMax, widest(capLines, CAP.size) + CAP.px * 2), h: capLines.length * CAP.lh + CAP.py * 2, lines: capLines } : null;
  const bottom = H - (p.basis ? 40 : 12);
  const heads = p.actors.map((a) => headOf(a, cam));
  const headRects: Rect[] = heads.map((h) => ({ x: h.x - h.r, y: Math.max(h.bare + 6, 0), w: h.r * 2, h: Math.max(10, h.chin - h.bare - 4) }));
  const obstacles: Rect[] = [];
  if (cap) obstacles.push(cap);
  if (p.badge) obstacles.push(badgeRect(p.badge));
  if (p.cover) obstacles.push(COVER_TEXT);
  for (const s of p.sfx ?? []) obstacles.push(sfxRect(s));
  const bubbles: BubbleBox[] = [];
  let prev: Rect | null = null;
  for (const ln of p.lines) {
    const kind = ln.kind ?? 'say';
    const extra = kind === 'shout' ? 14 : kind === 'think' ? 8 : 0;
    const head = heads[ln.by];
    const before: Rect | null = prev;
    // 읽는 순서: 앞 말풍선보다 왼쪽에 놓이면 더 아래에 있어야 나중에 읽힌다
    const orderOk = (r: Rect): boolean => !before || r.y >= before.y + (r.x + r.w / 2 < before.x + before.w / 2 - 10 ? 34 : 0);
    const free = (r: Rect, strict = true) =>
      r.x >= 8 &&
      r.x + r.w <= PW - 8 &&
      r.y >= 8 &&
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
      // 화면 밖 목소리: 위쪽 빈자리, 꼬리는 컷 가장자리로
      for (const maxW of [SAY.maxW, 190]) {
        const { lines, w, h, fits } = size(maxW);
        if (!fits && maxW !== SAY.maxW) continue;
        for (let y = 8; y + h <= bottom && !placed; y += 4) {
          for (const x of [PW - w - 14, (PW - w) / 2, 14]) {
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
      // 다른 인물이 한쪽에만 있으면 말풍선은 그 반대쪽으로 (다음 사람의 자리를 남긴다)
      const others = heads.filter((_, i) => i !== ln.by);
      const right = others.some((h) => h.x > head.x + 40);
      const left = others.some((h) => h.x < head.x - 40);
      const toward: 1 | -1 = right && !left ? -1 : left && !right ? 1 : head.x < PW / 2 ? 1 : -1;
      for (const maxW of [SAY.maxW, 196, 168, 148]) {
        const { lines, w, h, fits } = size(maxW);
        if (!fits) continue;
        const above = (limit: number): Rect | null => {
          for (let y = 8; y + h <= limit - 4; y += 4) {
            for (const dx of [toward * 20, 0, toward * 60, -toward * 30, toward * 100, -toward * 70, toward * 140]) {
              const cx = clamp(head.x + dx, w / 2 + 10, PW - w / 2 - 10);
              if (Math.abs(cx - head.x) > w / 2 + 60) continue;
              const r = { x: cx - w / 2, y, w, h };
              if (free(r)) return r;
            }
          }
          return null;
        };
        const beside = (): { r: Rect; side: 'left' | 'right' } | null => {
          for (let y = 8; y <= head.cy - 6; y += 4) {
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
      // 마지막 수단: 몸은 조금 가려도 내레이션·다른 말풍선과는 겹치지 않는 가장 가까운 빈자리 (글자가 잘리지 않는 가장 좁은 폭)
      const fitW = [168, 196, SAY.maxW, 300].find((mw) => size(mw).fits);
      const { lines, w, h } = fitW ? size(fitW) : size(300, 4);
      const hx = head?.x ?? PW - 40;
      const hy = head?.bare ?? 0;
      let best: Rect = { x: clamp(hx - w / 2, 10, PW - w - 10), y: cap ? cap.y + cap.h + 8 : 10, w, h };
      let bestD = Infinity;
      for (let y = 8; y + h <= bottom; y += 4) {
        for (let x = 10; x + w <= PW - 10; x += 10) {
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
    const lines = placed.lines;
    obstacles.push(box);
    prev = box;
    let tail: BubbleBox['tail'];
    if (!head) {
      tail = { bx: box.x + box.w * 0.8, by: box.y, tx: box.x + box.w * 0.8 + 14, ty: Math.max(0, box.y - 14), side: 'top' };
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
      let ty = clamp(head.mouth, head.cy - head.r * 0.4, head.chin);
      const bx = side === 'left' ? box.x : box.x + box.w;
      const by = clamp(ty, box.y + 18, box.y + box.h - 18);
      const len = Math.hypot(tx - bx, ty - by);
      if (len > 46) {
        tx = bx + ((tx - bx) * 46) / len;
        ty = by + ((ty - by) * 46) / len;
      }
      tail = { bx, by, tx, ty, side };
    }
    bubbles.push({ ...box, lines, kind, tail });
  }
  return { H, cap, bubbles };
}

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
    const k = i % 2 ? 0.86 : 1.06;
    s += `${i ? 'L' : 'M'} ${Math.round((cx + Math.cos(a) * rx * k) * 10) / 10} ${Math.round((cy + Math.sin(a) * ry * k) * 10) / 10} `;
  }
  return `${s}Z`;
}

function BubbleView({ b }: { b: BubbleBox }) {
  const textEl = (
    <text
      x={b.x + b.w / 2}
      y={b.y + SAY.py + SAY.size * 0.84 + (b.kind === 'shout' ? 7 : b.kind === 'think' ? 4 : 0)}
      fontSize={SAY.size}
      fontWeight={b.kind === 'shout' ? 800 : 600}
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
          <circle key={`o${i}`} cx={x} cy={y} r={r} fill={LINE} stroke={LINE} strokeWidth={4} />
        ))}
        <rect x={b.x} y={b.y} width={b.w} height={b.h} rx={22} fill={LINE} stroke={LINE} strokeWidth={4} />
        {bumps.map(([x, y, r], i) => (
          <circle key={`f${i}`} cx={x} cy={y} r={r} fill="#fbfaff" />
        ))}
        <rect x={b.x} y={b.y} width={b.w} height={b.h} rx={22} fill="#fbfaff" />
        {dots.map(([x, y, r], i) => (
          <circle key={`d${i}`} cx={x} cy={y} r={r} fill="#fbfaff" stroke={LINE} strokeWidth={2.2} />
        ))}
        {textEl}
      </g>
    );
  }
  const rx = Math.min(b.h / 2, 26);
  const shape = b.kind === 'shout' ? <path d={shoutPath(b)} /> : <rect x={b.x} y={b.y} width={b.w} height={b.h} rx={rx} />;
  const dash = b.kind === 'whisper' ? '7 6' : undefined;
  return (
    <g>
      <g fill={LINE} stroke={LINE} strokeWidth={b.kind === 'shout' ? 5 : 4.4} strokeLinejoin="round" strokeDasharray={dash}>
        {shape}
        {b.kind !== 'whisper' && <path d={tailPath(b.tail)} />}
      </g>
      <g fill={WHITE}>
        {shape}
        <path d={tailPath(b.tail)} />
      </g>
      {b.kind === 'whisper' && <path d={tailPath(b.tail)} fill="none" stroke={LINE} strokeWidth={2} strokeDasharray="5 5" />}
      {textEl}
    </g>
  );
}

function CaptionView({ cap }: { cap: Rect & { lines: string[] } }) {
  return (
    <g>
      <rect x={cap.x + 3} y={cap.y + 3} width={cap.w} height={cap.h} rx={5} fill="#000000" opacity={0.16} />
      <rect x={cap.x} y={cap.y} width={cap.w} height={cap.h} rx={5} fill="#fffaf0" stroke={LINE} strokeWidth={2} />
      <text x={cap.x + CAP.px} y={cap.y + CAP.py + CAP.size * 0.84} fontSize={CAP.size} fontWeight={600} fill={TEXT}>
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
  const w = textWidth(text, 17) + 30;
  const x = PW - 16 - w;
  const y = 16;
  return (
    <g transform={`rotate(5 ${x + w / 2} ${y + 18})`}>
      <rect x={x + 3} y={y + 3} width={w} height={36} rx={10} fill="#000000" opacity={0.15} />
      <rect x={x} y={y} width={w} height={36} rx={10} fill="#ffd84d" stroke={LINE} strokeWidth={2.4} />
      <text x={x + w / 2} y={y + 24.5} fontSize={17} fontWeight={800} textAnchor="middle" fill={LINE}>
        {text}
      </text>
    </g>
  );
}

function BasisTag({ text, H }: { text: string; H: number }) {
  const lines = wrap(`근거 · ${text}`, 13, PW - 60, 1);
  const w = widest(lines, 13) + 18;
  return (
    <g>
      <rect x={10} y={H - 32} width={w} height={22} rx={11} fill={WHITE} opacity={0.92} stroke="#d6d3d1" strokeWidth={1} />
      <text x={19} y={H - 16.5} fontSize={13} fontWeight={500} fill="#57534e">
        {lines[0]}
      </text>
    </g>
  );
}

function sfxRect(s: Sfx): Rect {
  const size = s.size ?? 40;
  const w = textWidth(s.text, size) * 1.05;
  return { x: s.x - w / 2, y: s.y - size * 0.9, w, h: size * 1.1 };
}

function SfxView({ s }: { s: Sfx }) {
  const size = s.size ?? 40;
  const color = s.color ?? '#e5484d';
  const common = { x: s.x, y: s.y, fontSize: size, fontWeight: 800, textAnchor: 'middle' as const, transform: `rotate(${s.rot ?? -8} ${s.x} ${s.y})` };
  return (
    <g>
      <text {...common} fill={WHITE} stroke={WHITE} strokeWidth={size * 0.24} strokeLinejoin="round">
        {s.text}
      </text>
      <text {...common} fill={color} stroke={LINE} strokeWidth={1.4}>
        {s.text}
      </text>
    </g>
  );
}

/** 회차 표지 글씨 (왼쪽) */
function CoverText({ c, tint }: { c: NonNullable<Panel['cover']>; tint: string }) {
  const titleLines = wrap(c.title, 44, 270, 3);
  const tagLines = wrap(c.tagline, 19, 250, 4);
  let y = 76;
  return (
    <g>
      <text x={30} y={48} fontSize={14} fontWeight={700} fill="#6b5f57" letterSpacing={2}>
        명경사주 · 인생 웹툰
      </text>
      <rect x={30} y={60} width={textWidth(c.kicker, 18) + 26} height={30} rx={15} fill={LINE} />
      <text x={43} y={81} fontSize={18} fontWeight={800} fill={WHITE}>
        {c.kicker}
      </text>
      {titleLines.map((l, i) => {
        y = 146 + i * 54;
        return (
          <g key={i}>
            <rect x={28} y={y - 14} width={textWidth(l, 44) + 6} height={18} fill={lighten(tint, 0.35)} opacity={0.85} />
            <text x={30} y={y} fontSize={44} fontWeight={800} fill={WHITE} stroke={WHITE} strokeWidth={8} strokeLinejoin="round">
              {l}
            </text>
            <text x={30} y={y} fontSize={44} fontWeight={800} fill={TEXT}>
              {l}
            </text>
          </g>
        );
      })}
      {tagLines.map((l, i) => (
        <text key={i} x={30} y={y + 46 + i * 28} fontSize={19} fontWeight={600} fill="#4a403a">
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

/** 한 컷 — 화면에도, PNG 저장에도 그대로 쓰는 독립 SVG */
export function PanelArt({ p, label }: { p: Panel; label?: string }) {
  const u = uidOf(useId(), p);
  const cam = cameraOf(p);
  const H = cam.H;
  const L = layoutPanel(p, cam);
  const props = p.props ?? [];
  const me = p.actors.find((a) => a.role === 'me');
  const tint = me?.outfit ?? '#f2c14e';
  const moodBg = p.mood ?? (p.cover ? 'soft' : undefined);
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${PW} ${H}`}
      width={PW}
      height={H}
      role="img"
      data-panel=""
      data-h={H}
      aria-label={label ?? [p.caption, ...p.lines.map((l) => l.text)].join(' / ')}
      fontFamily={FONT}
      style={{ display: 'block', width: '100%', height: 'auto' }}
    >
      <defs>
        <clipPath id={`${u}clip`}>
          <rect width={PW} height={H} />
        </clipPath>
        {cam.blur > 0 && !moodBg && (
          <filter id={`${u}blur`} x="-5%" y="-5%" width="110%" height="110%">
            <feGaussianBlur stdDeviation={cam.blur} />
          </filter>
        )}
      </defs>
      <g clipPath={`url(#${u}clip)`}>
        {moodBg ? (
          <MoodBg mood={moodBg} w={PW} h={H} u={u} tint={tint} />
        ) : (
          <g filter={cam.blur > 0 ? `url(#${u}blur)` : undefined}>
            <g transform={cam.bg}>
              <Background kind={p.bg} tone={p.tone} u={u} />
              {cam.shot !== 'full' &&
                props
                  .filter((x) => !FRONT_PROPS.has(x.kind))
                  .map((x, i) => (
                    <SceneProp key={`bb${i}`} p={x} />
                  ))}
            </g>
          </g>
        )}
        {cam.veil > 0 && !moodBg && <rect width={PW} height={H} fill={WHITE} opacity={cam.veil} />}
        {p.cover && <circle cx={me ? me.x : 400} cy={H * 0.42} r={190} fill={tint} opacity={0.22} />}
        {cam.shot === 'full' && (
          <g transform={cam.props}>
            {props
              .filter((x) => !FRONT_PROPS.has(x.kind))
              .map((x, i) => (
                <SceneProp key={`b${i}`} p={x} />
              ))}
          </g>
        )}
        {p.actors.map((a, i) => (
          <g key={`s${i}`} transform={`translate(${a.x} ${cam.G.toFixed(1)}) scale(${cam.z.toFixed(3)})`}>
            <Figure a={a} uid={`${u}a${i}s`} z={cam.z} layer="shadow" />
          </g>
        ))}
        {p.actors.map((a, i) => (
          <g key={i} transform={`translate(${a.x} ${cam.G.toFixed(1)}) scale(${cam.z.toFixed(3)})`}>
            <Figure a={a} uid={`${u}a${i}`} z={cam.z} layer="body" />
          </g>
        ))}
        <g transform={cam.props}>
          {props
            .filter((x) => FRONT_PROPS.has(x.kind))
            .map((x, i) => (
              <SceneProp key={`f${i}`} p={x} />
            ))}
        </g>
        {(p.sfx ?? []).map((s, i) => (
          <SfxView key={`x${i}`} s={s} />
        ))}
        {p.cover && <CoverText c={p.cover} tint={tint} />}
        {L.cap && <CaptionView cap={L.cap} />}
        {L.bubbles.map((b, i) => (
          <BubbleView key={i} b={b} />
        ))}
        {p.badge && <Badge text={p.badge} />}
        {p.basis && <BasisTag text={p.basis} H={H} />}
      </g>
      <rect x={1.25} y={1.25} width={PW - 2.5} height={H - 2.5} fill="none" stroke={LINE} strokeWidth={2.5} />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// 글 칸 (장면 전환·독백)
// ---------------------------------------------------------------------------
export const BEAT = { size: 23, lh: 37, maxW: 500 };

export function textBeatHeight(b: TextBeat): number {
  const lines = wrap(b.text, BEAT.size, BEAT.maxW, 8);
  return Math.max(150, lines.length * BEAT.lh + 100);
}

export function TextBeatArt({ b }: { b: TextBeat }) {
  const u = uidOf(useId(), b);
  const lines = wrap(b.text, BEAT.size, BEAT.maxW, 8);
  const H = textBeatHeight(b);
  const style = b.style ?? 'plain';
  const dark = style === 'dark';
  const y0 = H / 2 - ((lines.length - 1) * BEAT.lh) / 2 + BEAT.size * 0.35;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${PW} ${H}`}
      width={PW}
      height={H}
      role="img"
      data-panel=""
      data-h={H}
      aria-label={b.text}
      fontFamily={FONT}
      style={{ display: 'block', width: '100%', height: 'auto' }}
    >
      {style === 'soft' ? (
        <>
          <defs>
            <linearGradient id={`${u}g`} x1={0} y1={0} x2={1} y2={1}>
              <stop offset="0" stopColor="#fff1f4" />
              <stop offset="1" stopColor="#eef2ff" />
            </linearGradient>
          </defs>
          <rect width={PW} height={H} fill={`url(#${u}g)`} />
        </>
      ) : (
        <rect width={PW} height={H} fill={dark ? '#1c1a24' : '#fffdf8'} />
      )}
      {dark && <rect x={0} y={0} width={PW} height={H} fill="none" stroke="#000" strokeWidth={2} />}
      <text x={PW / 2} y={y0} fontSize={BEAT.size} fontWeight={600} textAnchor="middle" fill={dark ? '#f3ede4' : '#3a322d'}>
        {lines.map((l, i) => (
          <tspan key={i} x={PW / 2} dy={i ? BEAT.lh : 0}>
            {l}
          </tspan>
        ))}
      </text>
      {b.basis && (
        <text x={PW / 2} y={H - 22} fontSize={13} textAnchor="middle" fill={dark ? '#a8a29e' : '#8a817a'}>
          {`근거 · ${b.basis}`}
        </text>
      )}
    </svg>
  );
}
