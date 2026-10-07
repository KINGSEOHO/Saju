/** MY 명경 카드 — 한 줄 정체성 · 겉과 속 · 해시태그 · 체계별 한 줄 (화면은 HTML, 저장은 같은 디자인의 SVG→PNG) */
import { useState } from 'react';
import { textWidth, wrap, wrapBalanced } from '../comic/text.ts';
import { escXml, SVG_FONT, SVG_SERIF, shareOrDownload, svgStringToPng } from '../lib/svgImage.ts';
import type { IdentityCard } from '../report/cross.ts';

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
      <figure className="rounded-2xl bg-subtle px-5 pt-8 pb-7">
        <p className="text-center text-micro font-semibold tracking-[0.25em] text-accent">MY 명경 카드</p>
        <h3 className="mx-auto mt-4 max-w-[22em] text-center text-title1 text-ink">{card.headline}</h3>
        <p className="mx-auto mt-2 max-w-[26em] text-center font-serif text-ui text-sub">{card.subline}</p>
        <dl className="mt-7 grid grid-cols-2 border-y border-line">
          <div className="border-r border-line py-3.5 pr-3">
            <dt className="text-micro font-semibold text-sub">겉</dt>
            <dd className="mt-0.5 font-serif text-[16px] leading-snug font-bold text-ink">{card.outer}</dd>
          </div>
          <div className="py-3.5 pl-4">
            <dt className="text-micro font-semibold text-sub">속</dt>
            <dd className="mt-0.5 font-serif text-[16px] leading-snug font-bold text-ink">{card.inner}</dd>
          </div>
        </dl>
        <p className="mt-4 text-center text-cap text-sub">
          {card.tags.map((t) => (
            <span key={t} className="mx-1.5 inline-block">
              {t}
            </span>
          ))}
        </p>
        <ul className="mt-6 border-t border-line">
          {card.cards.map((c) => (
            <li key={c.system} className="grid grid-cols-[4.75rem_1fr] gap-3 border-b border-line py-3">
              <span className="pt-0.5 text-micro font-semibold text-sub">{c.system}</span>
              <span className="font-serif text-[15px] leading-snug font-bold text-ink">{c.line}</span>
            </li>
          ))}
        </ul>
        <p className="mt-6 text-center font-serif text-ui font-bold text-accent">{card.consensus}</p>
      </figure>
      <div className="no-print mt-3">
        <button type="button" onClick={save} className="btn-secondary w-full">
          이 카드 이미지로 저장
        </button>
        {msg && <p className="mt-2 text-center text-cap text-sub">{msg}</p>}
      </div>
    </div>
  );
}

/** 저장용 색 — 화면의 밝은 테마와 같다 */
const C = { bg: '#f8f7f4', line: '#e4e3e0', ink: '#1e1d1b', sub: '#6a6966', faint: '#a9a7a5', accent: '#33574d' };

/** 저장용 SVG (화면 카드와 같은 디자인, 폭 640) */
export function cardSvg(card: IdentityCard, site: string): { svg: string; width: number; height: number } {
  const W = 640;
  const P = 36;
  const inner = W - P * 2;
  const out: string[] = [];
  let y = 66;
  const text = (x: number, yy: number, t: string, size: number, color: string, opts: { weight?: number; anchor?: 'middle' | 'start'; serif?: boolean; extra?: string } = {}) =>
    out.push(
      `<text x="${x}" y="${yy}" font-size="${size}" font-weight="${opts.weight ?? 400}" fill="${color}"${opts.anchor === 'middle' ? ' text-anchor="middle"' : ''}${
        opts.serif ? ` font-family="${escXml(SVG_SERIF)}"` : ''
      }${opts.extra ?? ''}>${escXml(t)}</text>`,
    );
  const hline = (yy: number) => out.push(`<line x1="${P}" y1="${yy}" x2="${W - P}" y2="${yy}" stroke="${C.line}" stroke-width="1"/>`);

  text(W / 2, y, 'MY 명경 카드', 13, C.accent, { weight: 600, anchor: 'middle', extra: ' letter-spacing="4"' });
  y += 54;
  for (const l of wrapBalanced(card.headline, 32, inner - 20, 2)) {
    text(W / 2, y, l, 32, C.ink, { weight: 700, anchor: 'middle', serif: true });
    y += 46;
  }
  y -= 4;
  for (const l of wrapBalanced(card.subline, 17, inner - 40, 2)) {
    text(W / 2, y, l, 17, C.sub, { anchor: 'middle', serif: true });
    y += 28;
  }

  // 겉 | 속
  y += 16;
  hline(y);
  const colW = inner / 2 - 22;
  const outer = wrap(card.outer, 17, colW, 2);
  const innerLines = wrap(card.inner, 17, colW, 2);
  const rows = Math.max(outer.length, innerLines.length);
  const boxH = 30 + rows * 25 + 16;
  out.push(`<line x1="${W / 2}" y1="${y}" x2="${W / 2}" y2="${y + boxH}" stroke="${C.line}" stroke-width="1"/>`);
  text(P, y + 26, '겉', 12, C.sub, { weight: 600 });
  text(W / 2 + 20, y + 26, '속', 12, C.sub, { weight: 600 });
  outer.forEach((l, k) => text(P, y + 52 + k * 25, l, 17, C.ink, { weight: 700, serif: true }));
  innerLines.forEach((l, k) => text(W / 2 + 20, y + 52 + k * 25, l, 17, C.ink, { weight: 700, serif: true }));
  y += boxH;
  hline(y);

  // 해시태그
  y += 34;
  for (const l of wrap(card.tags.join('    '), 14, inner, 2)) {
    text(W / 2, y, l, 14, C.sub, { anchor: 'middle' });
    y += 22;
  }

  // 체계별 한 줄
  y += 14;
  hline(y);
  const labelW = 96;
  for (const c of card.cards) {
    const lines = wrap(c.line, 16, inner - labelW, 2);
    text(P, y + 28, c.system, 12, C.sub, { weight: 600 });
    lines.forEach((l, k) => text(P + labelW, y + 29 + k * 24, l, 16, C.ink, { weight: 700, serif: true }));
    y += 18 + lines.length * 24;
    hline(y);
  }

  // 공통 결론
  y += 42;
  for (const l of wrapBalanced(card.consensus, 17, inner - 20, 2)) {
    text(W / 2, y, l, 17, C.accent, { weight: 700, anchor: 'middle', serif: true });
    y += 28;
  }

  y += 18;
  hline(y);
  y += 34;
  text(W / 2, y, site, 15, C.accent, { weight: 600, anchor: 'middle' });
  y += 22;
  text(W / 2, y, '사주 · 운 · MBTI · 직업 교차 분석 — 명경사주', 12, C.faint, { anchor: 'middle' });
  const H = y + 34;
  // 머리글자 폭이 기기 글꼴마다 달라도 넘치지 않게 겉/속 칸 폭을 넉넉히 잡았다
  void textWidth;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="${escXml(SVG_FONT)}">
<rect x="0.75" y="0.75" width="${W - 1.5}" height="${H - 1.5}" rx="24" fill="${C.bg}" stroke="${C.line}" stroke-width="1.5"/>
${out.join('\n')}
</svg>`;
  return { svg, width: W, height: H };
}
