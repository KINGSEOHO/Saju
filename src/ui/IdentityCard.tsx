/** MY 명경 카드 — 한 줄 정체성 · 겉과 속 · 해시태그 · 체계별 한 줄 (화면은 HTML, 저장은 같은 디자인의 SVG→PNG) */
import { useState } from 'react';
import { textWidth, wrap, wrapBalanced } from '../comic/text.ts';
import { escXml, SVG_FONT, shareOrDownload, svgStringToPng } from '../lib/svgImage.ts';
import type { IdentityCard } from '../report/cross.ts';

const ICON_COLOR: Record<string, string> = { 命: '#f2c14e', 氣: '#7dd3a8', 運: '#8ab4f8', 年: '#f9a8d4', 性: '#c4b5fd', 業: '#fdba74' };
/** 띠 카드(아이콘이 띠의 한자)는 붉은 계열 */
const TTI_COLOR = '#fca5a5';

export function IdentityCardView({ card, title }: { card: IdentityCard; title: string }) {
  const [msg, setMsg] = useState('');
  const save = async () => {
    setMsg('');
    try {
      const { svg, width, height } = cardSvg(card, `${window.location.host}${window.location.pathname}`.replace(/\/$/, ''));
      const blob = await svgStringToPng(svg, width, height, 2);
      const r = await shareOrDownload(blob, 'myeonggyeong-card.png', title, '명경사주 · 사주·MBTI·직업 교차 분석 카드');
      if (r === 'downloaded') setMsg('이미지로 저장했어요.');
    } catch (e) {
      setMsg(e instanceof Error ? e.message : '이미지를 만들지 못했어요.');
    }
  };
  return (
    <div>
      <div className="relative overflow-hidden rounded-3xl border border-amber-700/40 bg-gradient-to-b from-[#10172e] to-[#1c2546] px-5 py-8 text-center text-white sm:px-8">
        <div className="bg-stars pointer-events-none absolute inset-0 opacity-80" aria-hidden />
        <div className="relative">
          <div className="text-[11px] font-semibold tracking-[0.35em] text-amber-200/70">MY 명경 CARD</div>
          <div aria-hidden className="mt-2 text-xs text-amber-300">
            ◆
          </div>
          <h2 className="mx-auto mt-2 max-w-md text-[1.6rem] leading-snug font-extrabold text-amber-300 sm:text-3xl">{card.headline}</h2>
          <p className="mx-auto mt-2 max-w-md text-[15px] text-stone-200/90">{card.subline}</p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-sm">
            <span className="rounded-full bg-white/10 px-3 py-1.5">
              <b className="text-amber-300">겉</b> · {card.outer}
            </span>
            <span aria-hidden className="text-stone-400">
              ↔
            </span>
            <span className="rounded-full bg-white/10 px-3 py-1.5">
              <b className="text-amber-300">속</b> · {card.inner}
            </span>
          </div>
          <div className="mt-4 flex flex-wrap justify-center gap-x-3 gap-y-1 text-sm text-stone-300/80">
            {card.tags.map((t) => (
              <span key={t}>{t}</span>
            ))}
          </div>
          <div className="mt-6 grid gap-2 text-left sm:grid-cols-2">
            {card.cards.map((c) => (
              <div key={c.system} className="flex gap-3 rounded-xl bg-white/[0.06] px-3.5 py-3">
                <span aria-hidden className="hanja shrink-0 text-xl leading-7" style={{ color: ICON_COLOR[c.icon] ?? TTI_COLOR }}>
                  {c.icon}
                </span>
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold" style={{ color: ICON_COLOR[c.icon] ?? TTI_COLOR }}>
                    {c.system}
                  </div>
                  <div className="text-[15px] leading-snug font-bold">{c.line}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 text-sm font-bold text-amber-300">✧ {card.consensus}</div>
        </div>
      </div>
      <div className="no-print mt-3 flex flex-col items-center gap-1.5">
        <button type="button" onClick={save} className="btn rounded-full border border-amber-600/50 bg-amber-50 px-5 text-amber-900 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-200 dark:hover:bg-amber-950/70">
          이 카드 이미지로 저장
        </button>
        {msg && <p className="text-xs text-stone-500">{msg}</p>}
      </div>
    </div>
  );
}

/** 저장용 SVG (화면 카드와 같은 디자인, 폭 640) */
export function cardSvg(card: IdentityCard, site: string): { svg: string; width: number; height: number } {
  const W = 640;
  const P = 28;
  const inner = W - P * 2;
  const out: string[] = [];
  let y = 58;
  const center = (text: string, size: number, color: string, weight = 400, extra = '') =>
    out.push(`<text x="${W / 2}" y="${y}" font-size="${size}" font-weight="${weight}" fill="${color}" text-anchor="middle"${extra}>${escXml(text)}</text>`);
  center('MY 명경 CARD', 13, '#c9b27a', 600, ' letter-spacing="4"');
  y += 26;
  out.push(`<path d="M ${W / 2} ${y - 7} L ${W / 2 + 6} ${y - 1} L ${W / 2} ${y + 5} L ${W / 2 - 6} ${y - 1} Z" fill="#f2c14e"/>`);
  y += 44;
  for (const l of wrapBalanced(card.headline, 30, inner - 20, 2)) {
    center(l, 30, '#f2c14e', 800);
    y += 40;
  }
  y += 2;
  for (const l of wrapBalanced(card.subline, 17, inner - 40, 2)) {
    center(l, 17, '#e7e5e4');
    y += 26;
  }
  y += 18;
  // 겉 ↔ 속
  const chip = (label: string, text: string) => ({ label, text, w: textWidth(`${label} · ${text}`, 15) + 30 });
  const chips = [chip('겉', card.outer), chip('속', card.inner)];
  const drawChip = (c: (typeof chips)[number], x: number, yy: number) => {
    out.push(`<rect x="${x}" y="${yy - 22}" width="${c.w}" height="34" rx="17" fill="#ffffff" fill-opacity="0.1"/>`);
    out.push(`<text x="${x + 15}" y="${yy}" font-size="15" fill="#e7e5e4"><tspan fill="#f2c14e" font-weight="700">${c.label}</tspan> · ${escXml(c.text)}</text>`);
  };
  if (chips[0].w + chips[1].w + 40 <= inner) {
    const total = chips[0].w + chips[1].w + 40;
    const x0 = (W - total) / 2;
    drawChip(chips[0], x0, y);
    out.push(`<text x="${x0 + chips[0].w + 20}" y="${y - 1}" font-size="15" fill="#a8a29e" text-anchor="middle">↔</text>`);
    drawChip(chips[1], x0 + chips[0].w + 40, y);
    y += 48;
  } else {
    for (const c of chips) {
      drawChip(c, (W - c.w) / 2, y);
      y += 44;
    }
    y += 4;
  }
  for (const l of wrap(card.tags.join('   '), 15, inner, 2)) {
    center(l, 15, '#c7c2bd');
    y += 24;
  }
  y += 14;
  // 체계별 카드 (2열)
  const cw = (inner - 12) / 2;
  const ch = 88;
  card.cards.forEach((c, i) => {
    const x = P + (i % 2) * (cw + 12);
    const yy = y + Math.floor(i / 2) * (ch + 10);
    const color = ICON_COLOR[c.icon] ?? TTI_COLOR;
    out.push(`<rect x="${x}" y="${yy}" width="${cw}" height="${ch}" rx="14" fill="#ffffff" fill-opacity="0.06"/>`);
    out.push(`<text x="${x + 18}" y="${yy + 34}" font-size="22" fill="${color}">${escXml(c.icon)}</text>`);
    out.push(`<text x="${x + 52}" y="${yy + 26}" font-size="12" font-weight="600" fill="${color}">${escXml(c.system)}</text>`);
    wrap(c.line, 15.5, cw - 66, 2).forEach((l, k) => out.push(`<text x="${x + 52}" y="${yy + 50 + k * 22}" font-size="15.5" font-weight="700" fill="#ffffff">${escXml(l)}</text>`));
  });
  y += Math.ceil(card.cards.length / 2) * (ch + 10) + 26;
  center(`✧ ${card.consensus}`, 15, '#f2c14e', 700);
  y += 26;
  out.push(`<line x1="${P}" y1="${y}" x2="${W - P}" y2="${y}" stroke="#ffffff" stroke-opacity="0.12"/>`);
  y += 32;
  center(site, 16, '#f2c14e', 600);
  y += 22;
  center('사주 · 운 · MBTI · 직업 교차 분석 — 명경사주', 12, '#a8a29e');
  const H = y + 30;
  // 별
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const stars = Array.from({ length: 40 }, () => `<circle cx="${(rnd() * W).toFixed(1)}" cy="${(rnd() * H).toFixed(1)}" r="${(0.6 + rnd() * 1.3).toFixed(2)}" fill="#ffffff" fill-opacity="${(0.25 + rnd() * 0.5).toFixed(2)}"/>`);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="${escXml(SVG_FONT)}">
<defs><linearGradient id="cg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#10172e"/><stop offset="1" stop-color="#1c2546"/></linearGradient></defs>
<rect width="${W}" height="${H}" rx="28" fill="url(#cg)"/>
${stars.join('')}
<rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="27" fill="none" stroke="#8a7440" stroke-opacity="0.7" stroke-width="2"/>
${out.join('\n')}
</svg>`;
  return { svg, width: W, height: H };
}
