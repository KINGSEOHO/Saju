/**
 * 궁합 한 장 — 두 사람이 마주 보고, 명경이가 옆에서 한마디.
 * 점수 아래에는 '점수는 단순한 지표'라는 안내를 늘 함께 싣는다.
 * 재회 결과는 사적인 내용이라 공유 사진을 만들지 않는다.
 */
import { useMemo, useRef, type RefObject } from 'react';
import { ageGroup } from '../comic/ctx.ts';
import { textWidth, wrapBalanced } from '../comic/text.ts';
import { EL_COLOR, INK, Toon } from '../comic/toon.tsx';
import type { Actor, Face, Fx, Pose } from '../comic/types.ts';
import { STEMS, type SajuAnalysis } from '../engine/index.ts';
import { svgStringToPng } from '../lib/svgImage.ts';
import type { CompatReport } from '../report/compat.ts';
import { C, Draw, embeddedFonts, ShareButtons, siteLabel, svgOpen, type ShareKit } from './StoryShare.tsx';

interface CoupleCast {
  me: string;
  you: string;
  mirror: string;
}

/** 점수대별 표정과 명경이의 말 */
export function coupleMood(score: number): { me: Face; you: Face; pose: Pose; fx: Fx[]; bubble: string[]; sfx: string } {
  if (score >= 85) return { me: 'love', you: 'love', pose: 'stand', fx: ['hearts'], bubble: ['이 정도면', '거의 천생연분?'], sfx: '두근!' };
  if (score >= 72) return { me: 'happy', you: 'blush', pose: 'stand', fx: ['sparkle'], bubble: ['어머,', '꽤 잘 맞잖아?'], sfx: '두근!' };
  if (score >= 58) return { me: 'smile', you: 'smile', pose: 'stand', fx: [], bubble: ['맞춰 갈수록', '좋아지는 사이!'], sfx: '흠…' };
  return { me: 'nervous', you: 'nervous', pose: 'stand', fx: ['sweat'], bubble: ['쉽진 않아도', '방법은 있어!'], sfx: '흠…' };
}

/** 두 사람 사이의 하트 — 점수대에 따라 꽉 찬 하트 / 빈 하트 / 금 간 하트 */
function heart(g: Draw, cx: number, cy: number, r: number, score: number) {
  const d = `M ${cx} ${cy + r * 0.9} C ${cx - r * 1.5} ${cy - r * 0.1} ${cx - r * 0.9} ${cy - r * 1.25} ${cx} ${cy - r * 0.45} C ${cx + r * 0.9} ${cy - r * 1.25} ${cx + r * 1.5} ${cy - r * 0.1} ${cx} ${cy + r * 0.9} Z`;
  const full = score >= 72;
  g.raw(`<path d="${d}" fill="${full ? '#e0564a' : '#ffffff'}" stroke="${INK}" stroke-width="${r * 0.16}" stroke-linejoin="round"/>`);
  if (score < 58)
    g.raw(
      `<path d="M ${cx - r * 0.1} ${cy - r * 0.42} L ${cx + r * 0.18} ${cy - r * 0.05} L ${cx - r * 0.16} ${cy + r * 0.25} L ${cx + r * 0.08} ${cy + r * 0.62}" fill="none" stroke="${INK}" stroke-width="${r * 0.14}" stroke-linejoin="round" stroke-linecap="round"/>`,
    );
}

let clipN = 0;
function couplePanel(g: Draw, cast: CoupleCast, x: number, y: number, w: number, h: number, score: number) {
  const k = h / 300;
  const mood = coupleMood(score);
  const id = `cpl${clipN++}`;
  g.raw(`<clipPath id="${id}"><rect x="${x}" y="${y}" width="${w}" height="${h}"/></clipPath>`);
  g.raw(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${C.paper}"/>`);
  g.raw(`<g clip-path="url(#${id})">`);
  const floor = y + h - 26 * k;
  g.raw(`<line x1="${x}" y1="${floor}" x2="${x + w}" y2="${floor}" stroke="#e3d7ba" stroke-width="${3 * k}"/>`);
  const s = k * 0.98;
  const meX = x + w * 0.2;
  const youX = x + w * 0.5;
  g.raw(`<g transform="translate(${meX} ${floor - 2 * k}) scale(${s})">${cast.me}</g>`);
  g.raw(`<g transform="translate(${youX} ${floor - 2 * k}) scale(${-s} ${s})">${cast.you}</g>`);
  heart(g, (meX + youX) / 2, floor - 150 * s, 22 * k, score);
  // 명경이 — 오른쪽 아래에서 고개를 내민다 (StoryShare의 컷과 같은 자리 잡기)
  const mx = x + w * 0.83;
  const sMirror = k * 1.2;
  const my = y + h * 0.7;
  g.raw(`<g transform="translate(${mx} ${my + 158 * sMirror}) scale(${-sMirror} ${sMirror})">${cast.mirror}</g>`);
  g.raw('</g>');
  g.raw(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="${INK}" stroke-width="${4 * k}"/>`);
  // 말풍선 — 꼬리는 명경이 쪽으로
  const size = Math.round(25 * k);
  const lines = mood.bubble;
  const bw = Math.max(...lines.map((l) => textWidth(l, size))) + 52 * k;
  const bh = lines.length * size * 1.28 + 28 * k;
  const bx = Math.min(x + w - bw - 18 * k, mx - bw / 2 + 10 * k);
  const by = y + 16 * k;
  const tail = Math.min(bx + bw - 30 * k, Math.max(bx + 30 * k, mx));
  const r = 16 * k;
  g.raw(
    `<path d="M ${bx + r} ${by} H ${bx + bw - r} Q ${bx + bw} ${by} ${bx + bw} ${by + r} V ${by + bh - r} Q ${bx + bw} ${by + bh} ${bx + bw - r} ${by + bh} H ${tail + 14 * k} L ${tail} ${by + bh + 22 * k} L ${tail - 14 * k} ${by + bh} H ${bx + r} Q ${bx} ${by + bh} ${bx} ${by + bh - r} V ${by + r} Q ${bx} ${by} ${bx + r} ${by} Z" fill="#ffffff" stroke="${INK}" stroke-width="${3.5 * k}" stroke-linejoin="round"/>`,
  );
  lines.forEach((l, i) => g.text(bx + bw / 2, by + 13 * k + size * (i + 1) * 1.2, l, size, INK, { w: 800, anchor: 'middle' }));
  g.text(x + 22 * k, y + 48 * k, mood.sfx, Math.round(28 * k), '#e0564a', { w: 900 });
}

export interface CoupleData {
  me?: string;
  you?: string;
  relation: string;
  score: number;
  tier: string;
  headline: string;
  good: string[];
  bad: string[];
  tti: string;
  mbti: string | null;
}

export function coupleData(a: SajuAnalysis, b: SajuAnalysis, r: CompatReport, relation: string): CoupleData {
  const ttiWord = r.tti.tone === 'good' ? '띠로도 잘 맞아요' : r.tti.tone === 'bad' ? '띠로는 부딪혀요' : '띠로는 무난해요';
  return {
    me: a.input.name?.trim() || undefined,
    you: b.input.name?.trim() || undefined,
    relation,
    score: r.score,
    tier: r.tier,
    headline: r.headline,
    // 큰 제목으로 쓴 말은 아래 목록에서 뺀다
    good: r.good
      .map((f) => f.title)
      .filter((t) => t !== r.headline)
      .slice(0, 2),
    bad: r.bad
      .map((f) => f.title)
      .filter((t) => t !== r.headline)
      .slice(0, 1),
    tti: `${r.tti.me} × ${r.tti.you} — ${ttiWord}`,
    mbti: r.mbti ? `${r.mbti.me} × ${r.mbti.you} — 같은 글자 ${r.mbti.axes.filter((x) => x.same).length}개` : null,
  };
}

const NOTE_SHORT = '점수는 단순한 지표예요. 관계는 두 사람이 만들어 가요.';

function namesLine(d: CoupleData) {
  return d.me && d.you ? `${d.me} × ${d.you}` : '명경이가 본 두 사람';
}

/** 점수 칸 — 숫자 · 점 · 등급 · 네 칸 막대 */
function scoreBlock(g: Draw, d: CoupleData, x: number, y: number, w: number, big: number) {
  g.text(x, y, String(d.score), big, C.ink, { w: 700, serif: true });
  // 명조 숫자 폭은 글자 크기의 0.55배쯤
  const nw = String(d.score).length * big * 0.56;
  g.text(x + nw + 14, y, '점', Math.round(big * 0.3), C.sub, { w: 700 });
  g.text(x + w, y, d.tier, Math.round(big * 0.27), C.accent, { w: 800, anchor: 'end' });
  const by = y + 34;
  const labels = ['노력 많이', '노력하면', '잘 맞는 편', '아주 잘 맞음'];
  const idx = d.score >= 85 ? 3 : d.score >= 72 ? 2 : d.score >= 58 ? 1 : 0;
  const cw = (w - 3 * 10) / 4;
  labels.forEach((l, i) => {
    const bx = x + i * (cw + 10);
    g.raw(`<rect x="${bx}" y="${by}" width="${cw}" height="12" rx="6" fill="${i <= idx ? C.accent : C.soft}"/>`);
    g.text(bx, by + 46, l, 22, i === idx ? C.accent : C.sub, { w: i === idx ? 800 : 400 });
  });
  return by + 46 - y;
}

export function coupleStorySvg(d: CoupleData, cast: CoupleCast, site: string, fonts = ''): string {
  const W = 1080;
  const P = 80;
  const inner = W - P * 2;
  const LIMIT = 1556;
  const g = new Draw();
  let y = 200;
  g.text(P, y, '명경사주', 34, C.accent, { w: 700, serif: true });
  g.text(W - P, y, `명경이가 본 우리 궁합 · ${d.relation}`, 26, C.sub, { anchor: 'end' });
  y += 34;
  couplePanel(g, cast, P, y, inner, 460, d.score);
  y += 460 + 76;
  g.text(P, y, namesLine(d), 30, C.accent, { w: 800 });
  y += 150;
  y += scoreBlock(g, d, P, y, inner, 150) + 70;
  for (const l of wrapBalanced(d.headline, 50, inner, 2)) {
    g.text(P, y, l, 50, C.ink, { w: 700, serif: true });
    y += 66;
  }
  y += 18;
  // 남는 자리에만: 잘 맞는 점 → 부딪히는 점 → 띠 → MBTI
  const rows: { h: number; draw: (yy: number) => void }[] = [];
  const point = (label: string, items: string[], color: string) => ({
    h: 46 * items.length + 8,
    draw: (yy: number) => {
      items.forEach((t, i) => {
        g.text(P, yy + i * 46, label, 22, color, { w: 800 });
        g.text(P + 130, yy + i * 46, t, 28, C.ink, { w: 600 });
      });
    },
  });
  if (d.good.length) rows.push(point('잘 맞는 점', d.good, C.accent));
  if (d.bad.length) rows.push(point('부딪히는 점', d.bad, C.ink));
  rows.push({ h: 46, draw: (yy) => g.text(P, yy, d.tti, 26, C.sub, { w: 600 }) });
  if (d.mbti) rows.push({ h: 46, draw: (yy) => g.text(P, yy, d.mbti!, 26, C.sub, { w: 600 }) });
  const noteH = 76;
  for (const row of rows) {
    if (y + row.h + noteH > LIMIT) continue;
    row.draw(y);
    y += row.h;
  }
  // 점수 안내 — 늘 싣는다
  y = Math.min(y + 12, LIMIT - noteH + 20);
  g.raw(`<rect x="${P}" y="${y - 30}" width="${inner}" height="58" rx="14" fill="${C.soft}"/>`);
  g.text(P + 24, y + 8, NOTE_SHORT, 24, C.sub, { w: 600 });
  // 아래 (인스타 화면 글자 영역 위)
  g.raw(`<line x1="${P}" y1="1590" x2="${W - P}" y2="1590" stroke="${C.line}" stroke-width="2"/>`);
  g.text(P, 1648, '우리 궁합도 명경이한테 물어보기', 30, C.ink, { w: 700 });
  g.text(P, 1694, site, 28, C.accent, { w: 600 });
  g.text(W - P, 1670, '정확하게 계산하고, 있는 그대로', 22, C.sub, { anchor: 'end' });
  return `${svgOpen(W, 1920, fonts)}\n${g.o.join('\n')}\n</svg>`;
}

export function coupleSquareSvg(d: CoupleData, cast: CoupleCast, site: string, fonts = ''): string {
  const W = 1080;
  const P = 70;
  const g = new Draw();
  couplePanel(g, cast, P, P, W - P * 2, 470, d.score);
  let y = P + 470 + 76;
  g.text(P, y, namesLine(d), 30, C.accent, { w: 800 });
  y += 128;
  y += scoreBlock(g, d, P, y, W - P * 2, 128) + 62;
  g.text(P, y, NOTE_SHORT, 26, C.sub, { w: 600 });
  g.text(P, W - P, '명경사주', 32, C.accent, { w: 700, serif: true });
  g.text(W - P, W - P, site, 26, C.sub, { anchor: 'end' });
  return `${svgOpen(W, W, fonts)}\n${g.o.join('\n')}\n</svg>`;
}

/** 두 사람과 명경이를 화면 밖에 그려 두고, 사진을 만들 때 꺼내 쓴다 */
function CoupleArt({ a, b, score, refEl }: { a: SajuAnalysis; b: SajuAnalysis; score: number; refEl: RefObject<SVGSVGElement | null> }) {
  const actors = useMemo(() => {
    const mood = coupleMood(score);
    const e1 = STEMS[a.pillars.day.stem].element;
    const e2 = STEMS[b.pillars.day.stem].element;
    const me: Actor = { role: 'me', x: 0, face: mood.me, pose: mood.pose, gender: a.input.gender, outfit: EL_COLOR[e1], el: e1, age: ageGroup(a.age), fx: mood.fx };
    const you: Actor = { role: 'partner', x: 0, face: mood.you, pose: mood.pose, gender: b.input.gender, outfit: EL_COLOR[e2], el: e2, age: ageGroup(b.age) };
    const mirror: Actor = { role: 'mirror', x: 0, face: 'smug', pose: 'point' };
    return { me, you, mirror };
  }, [a, b, score]);
  return (
    <svg ref={refEl} width="0" height="0" className="absolute" aria-hidden>
      <g data-cast="me">
        <Toon a={actors.me} z={1} />
      </g>
      <g data-cast="you">
        <Toon a={actors.you} z={1} />
      </g>
      <g data-cast="mirror">
        <Toon a={actors.mirror} z={1} />
      </g>
    </svg>
  );
}

function readCast(svg: SVGSVGElement | null): CoupleCast {
  const ser = new XMLSerializer();
  const get = (k: string) => {
    const el = svg?.querySelector(`[data-cast="${k}"]`);
    return el ? ser.serializeToString(el) : '';
  };
  return { me: get('me'), you: get('you'), mirror: get('mirror') };
}

export function CoupleShare({ a, b, r, relation }: { a: SajuAnalysis; b: SajuAnalysis; r: CompatReport; relation: string }) {
  const castRef = useRef<SVGSVGElement>(null);
  const d = useMemo(() => coupleData(a, b, r, relation), [a, b, r, relation]);
  const kit: ShareKit = {
    makeStory: async () => svgStringToPng(coupleStorySvg(d, readCast(castRef.current), siteLabel(), await embeddedFonts()), 1080, 1920, 1),
    makeSquare: async () =>
      new File([await svgStringToPng(coupleSquareSvg(d, readCast(castRef.current), siteLabel(), await embeddedFonts()), 1080, 1080, 1)], 'myeonggyeong-match.png', {
        type: 'image/png',
      }),
    keyNow: () => JSON.stringify(d),
    file: 'myeonggyeong-match.png',
    title: '명경이가 본 우리 궁합',
    kakao: {
      title: `${d.me && d.you ? `${d.me} × ${d.you} ` : '우리 '}궁합 ${d.score}점 · ${d.tier}`,
      description: '점수는 참고만! 두 사람 궁합, 명경이가 솔직하게 봐 드려요',
    },
  };
  return (
    <section className="no-print mt-14" aria-labelledby="couple-share">
      <CoupleArt a={a} b={b} score={r.score} refEl={castRef} />
      <h4 id="couple-share" className="text-title2 text-ink">
        우리 궁합 자랑하기
      </h4>
      <p className="mt-1 text-label text-sub">두 사람의 궁합을 한 장으로 만들어 드려요. 생년월일은 넣지 않아요.</p>
      <ShareButtons kit={kit} />
    </section>
  );
}
