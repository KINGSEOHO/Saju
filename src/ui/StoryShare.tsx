/**
 * 자랑하기 — 사주 정리 한 장(인스타그램 스토리 9:16, 1080×1920) 저장·공유와 카카오톡 공유.
 * 인스타그램은 웹에서 스토리 편집 화면을 바로 여는 방법을 열어 두지 않아서,
 * 휴대폰 공유 창에 이미지를 넘기고 거기서 'Instagram → 스토리'를 고르게 한다.
 */
import { useState } from 'react';
import { wrap, wrapBalanced } from '../comic/text.ts';
import { BRANCHES, ELEMENTS, STEMS, type SajuAnalysis } from '../engine/index.ts';
import { send, sessionId } from '../lib/api.ts';
import { shareKakao, siteUrl } from '../lib/kakao.ts';
import { downloadBlob, escXml, SVG_FONT, SVG_SERIF, svgStringToPng } from '../lib/svgImage.ts';
import { EL_WORD } from '../report/plain.ts';

const C = { bg: '#ffffff', soft: '#f3f6f5', line: '#e4e3e0', strong: '#343331', ink: '#1e1d1b', sub: '#6a6966', faint: '#a9a7a5', accent: '#33574d' };
const SHADES = ['#33574d', '#466a60', '#62887d', '#86a79d', '#b1c6c0'];

/** 저장 이미지 안에 함초롬바탕을 넣는다(이미지로 그릴 때는 웹 글꼴을 못 쓰므로). 실패하면 기기 명조로. */
let fontCss: Promise<string> | null = null;
function embeddedFonts(): Promise<string> {
  fontCss ??= (async () => {
    const one = async (file: string, weight: number) => {
      const r = await fetch(`fonts/${file}`);
      if (!r.ok) throw new Error(file);
      const buf = new Uint8Array(await r.arrayBuffer());
      let bin = '';
      for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
      return `@font-face{font-family:'HCRB';font-weight:${weight};src:url(data:font/woff2;base64,${btoa(bin)}) format('woff2')}`;
    };
    try {
      return (await Promise.all([one('HCRBatang.woff2', 400), one('HCRBatang-Bold.woff2', 700)])).join('');
    } catch {
      return '';
    }
  })();
  return fontCss;
}

export interface StoryData {
  name?: string;
  headline: string;
  subline: string;
  facts: { label: string; value: string }[];
}

/** 인스타그램 스토리 한 장 (위아래 250px은 인스타 화면 글자에 가려지므로 비워 둔다) */
export function storySvg(a: SajuAnalysis, d: StoryData, site: string, fonts = ''): string {
  const W = 1080;
  const H = 1920;
  const P = 80;
  const inner = W - P * 2;
  const serif = `'HCRB', ${SVG_SERIF}`;
  const o: string[] = [];
  const t = (x: number, y: number, s: string, size: number, color: string, opt: { w?: number; mid?: boolean; serif?: boolean; ls?: number } = {}) =>
    o.push(
      `<text x="${x}" y="${y}" font-size="${size}" font-weight="${opt.w ?? 400}" fill="${color}"${opt.mid ? ' text-anchor="middle"' : ''}${
        opt.serif ? ` font-family="${escXml(serif)}"` : ''
      }${opt.ls ? ` letter-spacing="${opt.ls}"` : ''}>${escXml(s)}</text>`,
    );
  let y = 220;
  t(P, y, '명경사주', 34, C.accent, { w: 700, serif: true });
  t(W - P, y, '사주 정리 한 장', 26, C.sub);
  o[o.length - 1] = o[o.length - 1].replace('<text ', '<text text-anchor="end" ');
  y += 80;
  t(P, y, d.name ? `${d.name}님의 사주` : '사주로 본 나', 32, C.accent, { w: 600 });
  y += 84;
  const head = wrapBalanced(d.headline, 64, inner, 3);
  for (const l of head) {
    t(P, y, l, 64, C.ink, { w: 700, serif: true });
    y += 86;
  }
  y -= 16;
  for (const l of wrapBalanced(d.subline, 34, inner, 2)) {
    t(P, y, l, 34, C.sub, { serif: true });
    y += 50;
  }

  // 원국 표 — 시·일·월·년
  y += 40;
  const cols = (['hour', 'day', 'month', 'year'] as const).map((k) => ({ k, p: a.positions.find((x) => x.pos === k) ?? null }));
  const LABEL = { hour: '시주', day: '일주', month: '월주', year: '년주' };
  const cw = inner / 4;
  const top = y;
  const rowH = [62, 46, 130, 130, 54];
  const tableH = rowH.reduce((s, h) => s + h, 0);
  o.push(`<rect x="${P + cw}" y="${top}" width="${cw}" height="${tableH}" fill="${C.soft}"/>`);
  o.push(`<line x1="${P}" y1="${top}" x2="${W - P}" y2="${top}" stroke="${C.strong}" stroke-width="3"/>`);
  o.push(`<line x1="${P}" y1="${top + tableH}" x2="${W - P}" y2="${top + tableH}" stroke="${C.strong}" stroke-width="3"/>`);
  o.push(`<line x1="${P}" y1="${top + rowH[0]}" x2="${W - P}" y2="${top + rowH[0]}" stroke="${C.line}" stroke-width="2"/>`);
  for (let i = 1; i < 4; i++) o.push(`<line x1="${P + cw * i}" y1="${top}" x2="${P + cw * i}" y2="${top + tableH}" stroke="${C.line}" stroke-width="2"/>`);
  cols.forEach(({ k, p }, i) => {
    const cx = P + cw * i + cw / 2;
    t(cx, top + 42, LABEL[k], 30, C.ink, { w: 700, mid: true });
    if (!p) {
      t(cx, top + rowH[0] + rowH[1] + 160, '모름', 32, C.faint, { mid: true });
      return;
    }
    t(cx, top + rowH[0] + 36, p.stemTenGod === '일간' ? '나' : p.stemTenGod, 26, p.stemTenGod === '일간' ? C.accent : C.sub, { w: p.stemTenGod === '일간' ? 700 : 400, mid: true });
    const s = STEMS[p.pillar.stem];
    const b = BRANCHES[p.pillar.branch];
    const y1 = top + rowH[0] + rowH[1];
    t(cx, y1 + 86, s.hanja, 84, C.ink, { w: 700, mid: true, serif: true });
    t(cx, y1 + 120, `${s.ko} · ${EL_WORD[s.element]}`, 24, C.sub, { mid: true });
    t(cx, y1 + rowH[2] + 86, b.hanja, 84, C.ink, { w: 700, mid: true, serif: true });
    t(cx, y1 + rowH[2] + 120, `${b.ko} · ${EL_WORD[b.element]}`, 24, C.sub, { mid: true });
    t(cx, y1 + rowH[2] + rowH[3] + 40, p.branchTenGod, 26, C.sub, { mid: true });
  });
  y = top + tableH + 70;

  // 다섯 기운
  t(P, y, '다섯 기운의 세기', 30, C.ink, { w: 700 });
  y += 30;
  const pc = a.elements.percent;
  const max = Math.max(...ELEMENTS.map((e) => pc[e]), 1);
  const rank = [...ELEMENTS].sort((x, z) => pc[z] - pc[x]);
  const bw = inner / 5;
  const barH = 90;
  ELEMENTS.forEach((e, i) => {
    const cx = P + bw * i + bw / 2;
    const h = Math.max(pc[e] > 0 ? 6 : 0, (pc[e] / max) * barH);
    o.push(`<rect x="${cx - 26}" y="${y + barH - h}" width="52" height="${h}" rx="4" fill="${SHADES[rank.indexOf(e)]}"/>`);
    o.push(`<line x1="${P + bw * i + 8}" y1="${y + barH}" x2="${P + bw * (i + 1) - 8}" y2="${y + barH}" stroke="${C.line}" stroke-width="2"/>`);
    t(cx, y + barH + 40, EL_WORD[e], 30, C.ink, { w: 700, mid: true, serif: true });
    t(cx, y + barH + 74, `${pc[e].toFixed(0)}%`, 26, C.sub, { mid: true });
  });
  y += barH + 130;

  // 한눈에 (세 줄)
  for (const f of d.facts) {
    o.push(`<line x1="${P}" y1="${y - 42}" x2="${W - P}" y2="${y - 46}" stroke="${C.line}" stroke-width="2"/>`);
    t(P, y, f.label, 28, C.sub);
    const v = wrap(f.value, 32, inner - 300, 1)[0];
    o.push(`<text x="${W - P}" y="${y}" font-size="32" font-weight="700" fill="${C.ink}" text-anchor="end" font-family="${escXml(serif)}">${escXml(v)}</text>`);
    y += 66;
  }

  // 아래 (인스타 화면 글자 영역 위)
  t(W / 2, 1650, '나도 내 사주 보기', 30, C.sub, { mid: true });
  t(W / 2, 1696, site, 34, C.accent, { w: 700, mid: true });
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="${escXml(SVG_FONT)}">
${fonts ? `<style>${fonts}</style>` : ''}<rect width="${W}" height="${H}" fill="${C.bg}"/>
${o.join('\n')}
</svg>`;
}

async function storyPng(a: SajuAnalysis, d: StoryData): Promise<Blob> {
  const site = siteUrl().replace(/^https?:\/\//, '').replace(/\/$/, '');
  return svgStringToPng(storySvg(a, d, site, await embeddedFonts()), 1080, 1920, 1);
}

export function ShareSection({ a, d }: { a: SajuAnalysis; d: StoryData }) {
  const [busy, setBusy] = useState<'' | 'save' | 'insta' | 'kakao'>('');
  const [msg, setMsg] = useState('');
  const track = () => send('events', { sessionId: sessionId(), type: 'share' });
  const file = 'myeonggyeong-story.png';

  const save = async () => {
    setBusy('save');
    setMsg('');
    try {
      downloadBlob(await storyPng(a, d), file);
      setMsg('사진을 저장했어요. 인스타그램 스토리에서 이 사진을 골라 올려 보세요.');
      track();
    } catch {
      setMsg('이미지를 만들지 못했어요.');
    }
    setBusy('');
  };
  const insta = async () => {
    setBusy('insta');
    setMsg('');
    try {
      const blob = await storyPng(a, d);
      const f = new File([blob], file, { type: 'image/png' });
      if (navigator.canShare?.({ files: [f] })) {
        try {
          await navigator.share({ files: [f] });
          track();
        } catch (e) {
          if (!(e instanceof DOMException && e.name === 'AbortError')) throw e;
        }
      } else {
        downloadBlob(blob, file);
        setMsg('이 기기에서는 바로 넘길 수 없어 사진으로 저장했어요. 인스타그램 앱 → 스토리에서 저장한 사진을 골라 주세요.');
        track();
      }
    } catch {
      setMsg('이미지를 만들지 못했어요.');
    }
    setBusy('');
  };
  const kakao = async () => {
    setBusy('kakao');
    setMsg('');
    const r = await shareKakao({ title: `내 사주: ${d.headline}`, description: '명경사주 — 정확하게 계산하고, 있는 그대로 말하는 사주. 너도 해 봐!' });
    if (r === 'copied') setMsg('공유할 문구와 링크를 복사했어요. 카카오톡 대화방에 붙여 넣어 주세요.');
    if (r === 'failed') setMsg('공유하지 못했어요. 주소창의 링크를 직접 보내 주세요.');
    if (r !== 'cancelled' && r !== 'failed') track();
    setBusy('');
  };

  return (
    <section className="no-print mt-14" aria-labelledby="share-title">
      <h2 id="share-title" className="text-title2 text-ink">
        친구에게 자랑하기
      </h2>
      <p className="mt-1 text-label text-sub">사주 정리 한 장을 인스타그램 스토리 크기(9:16)로 만들어 드려요. 생년월일과 시간은 사진에 넣지 않아요.</p>
      <div className="mt-5 space-y-2">
        <button type="button" className="btn-primary w-full" onClick={insta} disabled={!!busy}>
          {busy === 'insta' ? '만드는 중…' : '인스타그램 스토리에 올리기'}
        </button>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" className="btn-secondary" onClick={kakao} disabled={!!busy}>
            카카오톡 공유
          </button>
          <button type="button" className="btn-secondary" onClick={save} disabled={!!busy}>
            {busy === 'save' ? '만드는 중…' : '사진으로 저장'}
          </button>
        </div>
      </div>
      <p className="mt-3 text-cap text-sub">‘인스타그램 스토리에 올리기’를 누르면 공유 창이 떠요. 거기서 Instagram → 스토리를 고르면 돼요.</p>
      {msg && <p className="mt-2 text-label font-semibold text-accent">{msg}</p>}
    </section>
  );
}
