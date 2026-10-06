/** 웹툰 그림 공용 도구 — 경로 문자열, 색 섞기, 별·하트 모양 */

export type Pt = [number, number];

/** 경로 문자열 — 숫자를 소수 한 자리로 줄인다 */
export function d(s: TemplateStringsArray, ...v: number[]): string {
  let out = s[0];
  for (let i = 0; i < v.length; i++) out += String(Math.round(v[i] * 10) / 10) + s[i + 1];
  return out;
}

export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const r1 = (v: number) => Math.round(v * 10) / 10;

export function rng(seed: number) {
  let s = seed % 2147483647 || 1;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

function hex(c: string): [number, number, number] {
  const h = c.replace('#', '');
  const v = h.length === 3 ? h.replace(/./g, (x) => x + x) : h;
  return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)];
}

/** 두 색을 t(0~1) 비율로 섞는다 */
export function mix(a: string, b: string, t: number): string {
  const x = hex(a);
  const y = hex(b);
  return `#${x
    .map((v, i) => Math.round(v + (y[i] - v) * t)
      .toString(16)
      .padStart(2, '0'))
    .join('')}`;
}
/** 그늘색 — 검정 대신 따뜻한 보랏빛 갈색 쪽으로 어둡게 한다 */
export const darken = (c: string, t = 0.2) => mix(c, '#2a1a2e', t);
export const lighten = (c: string, t = 0.3) => mix(c, '#ffffff', t);

export function heartPath(cx: number, cy: number, s: number): string {
  return d`M ${cx} ${cy + s * 0.9} C ${cx - s * 1.25} ${cy + s * 0.05} ${cx - s * 1.1} ${cy - s * 0.95} ${cx - s * 0.5} ${cy - s * 0.95} C ${cx - s * 0.18} ${cy - s * 0.95} ${cx} ${cy - s * 0.7} ${cx} ${cy - s * 0.42} C ${cx} ${cy - s * 0.7} ${cx + s * 0.18} ${cy - s * 0.95} ${cx + s * 0.5} ${cy - s * 0.95} C ${cx + s * 1.1} ${cy - s * 0.95} ${cx + s * 1.25} ${cy + s * 0.05} ${cx} ${cy + s * 0.9} Z`;
}

/** 네 갈래 반짝임 */
export function starPath(cx: number, cy: number, s: number): string {
  return d`M ${cx} ${cy - s} Q ${cx + s * 0.16} ${cy - s * 0.16} ${cx + s} ${cy} Q ${cx + s * 0.16} ${cy + s * 0.16} ${cx} ${cy + s} Q ${cx - s * 0.16} ${cy + s * 0.16} ${cx - s} ${cy} Q ${cx - s * 0.16} ${cy - s * 0.16} ${cx} ${cy - s} Z`;
}

/** 두 마디 팔(어깨 s → 손 h)의 팔꿈치 위치. bend = 1이면 팔꿈치가 바깥(+x)·아래로 */
export function elbowIK(s: Pt, h: Pt, upper: number, fore: number, bend: 1 | -1): { e: Pt; h: Pt } {
  let dx = h[0] - s[0];
  let dy = h[1] - s[1];
  let dist = Math.hypot(dx, dy) || 1;
  const max = (upper + fore) * 0.995;
  if (dist > max) {
    dx = (dx / dist) * max;
    dy = (dy / dist) * max;
    dist = max;
  }
  const min = Math.abs(upper - fore) + 1;
  if (dist < min) {
    dx = (dx / dist) * min;
    dy = (dy / dist) * min;
    dist = min;
  }
  const cos = clamp((upper * upper + dist * dist - fore * fore) / (2 * upper * dist), -1, 1);
  const ang = Math.acos(cos) * bend;
  const ux = dx / dist;
  const uy = dy / dist;
  // 진행 방향을 ang만큼 돌린다 (화면 좌표: y가 아래)
  const ex = s[0] + upper * (ux * Math.cos(ang) + uy * Math.sin(ang));
  const ey = s[1] + upper * (-ux * Math.sin(ang) + uy * Math.cos(ang));
  return { e: [ex, ey], h: [s[0] + dx, s[1] + dy] };
}
