/**
 * 자랑하기 — 명경사주만의 '한 장'.
 *  - 인스타그램 스토리(1080×1920): 웹툰 한 컷(내 캐릭터 + 명경이) → 한 줄 정체성 → 명경이의 솔직한 한마디
 *    → 원국 네 기둥 → 해시태그 → 적중 결과 → '나도 명경이한테 사주 털리기'
 *  - 카카오톡(1080×1080): 같은 컷과 한 줄 정체성을 담은 정사각 카드를 카카오에 올려 메시지 사진으로 쓴다
 * 인스타그램은 웹에서 스토리 편집 화면을 바로 여는 방법을 막아 두어, 휴대폰 공유 창으로 넘긴다.
 */
import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { ageGroup } from '../comic/ctx.ts';
import { textWidth, wrap, wrapBalanced } from '../comic/text.ts';
import { EL_COLOR, INK, Toon } from '../comic/toon.tsx';
import type { Actor } from '../comic/types.ts';
import { BRANCHES, STEMS, type SajuAnalysis } from '../engine/index.ts';
import { send, sessionId } from '../lib/api.ts';
import { shareKakao, siteUrl } from '../lib/kakao.ts';
import { externalHint, IN_APP_NAME, inApp, openExternal } from '../lib/inapp.ts';
import { downloadBlob, escXml, saveImage, showImage, SVG_FONT, SVG_SERIF, svgStringToPng } from '../lib/svgImage.ts';
import { hitScore } from './Hits.tsx';

const C = { bg: '#ffffff', soft: '#f3f6f5', line: '#e4e3e0', strong: '#343331', ink: '#1e1d1b', sub: '#6a6966', faint: '#a9a7a5', accent: '#33574d', paper: '#fbf6ea' };

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
  tags: string[];
}

/** 화면에 그려 둔 캐릭터 그림(SVG 조각) */
interface Cast {
  me: string;
  mirror: string;
}

const SERIF = `'HCRB', ${SVG_SERIF}`;

class Draw {
  o: string[] = [];
  text(x: number, y: number, s: string, size: number, color: string, opt: { w?: number; anchor?: 'middle' | 'end'; serif?: boolean; ls?: number } = {}) {
    this.o.push(
      `<text x="${x}" y="${y}" font-size="${size}" font-weight="${opt.w ?? 400}" fill="${color}"${opt.anchor ? ` text-anchor="${opt.anchor}"` : ''}${
        opt.serif ? ` font-family="${escXml(SERIF)}"` : ''
      }${opt.ls ? ` letter-spacing="${opt.ls}"` : ''}>${escXml(s)}</text>`,
    );
  }
  raw(s: string) {
    this.o.push(s);
  }
}

/**
 * 웹툰 한 컷 — 왼쪽에 '나'(놀란 얼굴), 오른쪽에 명경이가 가리키며 한마디.
 * 캐릭터 좌표는 발 가운데가 (0,0)이라 크기를 키워 바닥선에 세운다.
 */
let clipN = 0;
function comicPanel(g: Draw, cast: Cast, x: number, y: number, w: number, h: number, lines: string[]) {
  const k = h / 300;
  const id = `cp${clipN++}`;
  g.raw(`<clipPath id="${id}"><rect x="${x}" y="${y}" width="${w}" height="${h}"/></clipPath>`);
  g.raw(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${C.paper}"/>`);
  g.raw(`<g clip-path="url(#${id})">`);
  // 집중선 (나를 향해)
  const cx = x + w * 0.27;
  const cy = y + h * 0.55;
  for (let i = 0; i < 16; i++) {
    const a = (Math.PI * 2 * (i + 0.3)) / 16;
    g.raw(`<line x1="${cx + Math.cos(a) * h * 0.42}" y1="${cy + Math.sin(a) * h * 0.42}" x2="${cx + Math.cos(a) * h * 1.2}" y2="${cy + Math.sin(a) * h * 1.2}" stroke="#efe5cc" stroke-width="${7 * k}" stroke-linecap="round"/>`);
  }
  g.raw(`<line x1="${x}" y1="${y + h - 26 * k}" x2="${x + w}" y2="${y + h - 26 * k}" stroke="#e3d7ba" stroke-width="${3 * k}"/>`);
  const sm = k * 1.16;
  g.raw(`<g transform="translate(${cx} ${y + h - 28 * k}) scale(${sm})">${cast.me}</g>`);
  const mx = x + w * 0.77;
  const sMirror = k * 1.35;
  const my = y + h * 0.66;
  g.raw(`<g transform="translate(${mx} ${my + 158 * sMirror}) scale(${-sMirror} ${sMirror})">${cast.mirror}</g>`);
  g.raw('</g>');
  g.raw(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="${INK}" stroke-width="${4 * k}"/>`);
  // 말풍선 (명경이) — 꼬리는 명경이 머리 쪽으로
  const size = Math.round(27 * k);
  const bw = Math.max(...lines.map((l) => textWidth(l, size))) + 56 * k;
  const bh = lines.length * size * 1.28 + 30 * k;
  const bx = Math.min(x + w - bw - 22 * k, mx - bw / 2 + 20 * k);
  const by = y + 18 * k;
  const tail = Math.min(bx + bw - 30 * k, Math.max(bx + 30 * k, mx));
  const r = 16 * k;
  g.raw(
    `<path d="M ${bx + r} ${by} H ${bx + bw - r} Q ${bx + bw} ${by} ${bx + bw} ${by + r} V ${by + bh - r} Q ${bx + bw} ${by + bh} ${bx + bw - r} ${by + bh} H ${tail + 14 * k} L ${tail} ${by + bh + 24 * k} L ${tail - 14 * k} ${by + bh} H ${bx + r} Q ${bx} ${by + bh} ${bx} ${by + bh - r} V ${by + r} Q ${bx} ${by} ${bx + r} ${by} Z" fill="#ffffff" stroke="${INK}" stroke-width="${3.5 * k}" stroke-linejoin="round"/>`,
  );
  lines.forEach((l, i) => g.text(bx + bw / 2, by + 14 * k + size * (i + 1) * 1.2, l, size, INK, { w: 800, anchor: 'middle' }));
  // 효과 글자
  g.text(x + 24 * k, y + 52 * k, '뜨끔!', Math.round(30 * k), '#e0564a', { w: 900 });
}

/** 원국 네 기둥 (한자 두 줄 + 작은 독음) */
function pillars(g: Draw, a: SajuAnalysis, x: number, y: number, w: number, big: number) {
  const cols = (['hour', 'day', 'month', 'year'] as const).map((k) => ({ k, p: a.positions.find((q) => q.pos === k) ?? null }));
  const LABEL = { hour: '시', day: '일', month: '월', year: '년' };
  const cw = w / 4;
  const h = big * 2 + 130;
  g.raw(`<rect x="${x + cw}" y="${y}" width="${cw}" height="${h}" fill="${C.soft}"/>`);
  g.raw(`<line x1="${x}" y1="${y}" x2="${x + w}" y2="${y}" stroke="${C.strong}" stroke-width="3"/><line x1="${x}" y1="${y + h}" x2="${x + w}" y2="${y + h}" stroke="${C.strong}" stroke-width="3"/>`);
  for (let i = 1; i < 4; i++) g.raw(`<line x1="${x + cw * i}" y1="${y}" x2="${x + cw * i}" y2="${y + h}" stroke="${C.line}" stroke-width="2"/>`);
  cols.forEach(({ k, p }, i) => {
    const cx = x + cw * i + cw / 2;
    g.text(cx, y + 38, k === 'day' ? '일주 · 나' : `${LABEL[k]}주`, 24, k === 'day' ? C.accent : C.sub, { w: 700, anchor: 'middle' });
    if (!p) {
      g.text(cx, y + h / 2 + 20, '모름', 28, C.faint, { anchor: 'middle' });
      return;
    }
    const s = STEMS[p.pillar.stem];
    const b = BRANCHES[p.pillar.branch];
    g.text(cx, y + 50 + big, s.hanja, big, C.ink, { w: 700, anchor: 'middle', serif: true });
    g.text(cx, y + 62 + big * 2, b.hanja, big, C.ink, { w: 700, anchor: 'middle', serif: true });
    g.text(cx, y + h - 16, `${s.ko}${b.ko}`, 22, C.sub, { anchor: 'middle' });
  });
  return h;
}

const svgOpen = (W: number, H: number, fonts: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="${escXml(SVG_FONT)}">${fonts ? `<style>${fonts}</style>` : ''}<rect width="${W}" height="${H}" fill="${C.bg}"/>`;

/** 명경이의 말 — 좋은 말만 하지 않는 거울 */
const BUBBLE = ['좋은 말만', '해 줄 줄 알았지?'];

/** 인스타그램 스토리 한 장 (위 200px·아래 250px쯤은 인스타 화면 글자에 가려지므로 비워 둔다) */
export function storySvg(a: SajuAnalysis, d: StoryData, cast: Cast, site: string, hits: { done: number; hit: number } | null, fonts = ''): string {
  const W = 1080;
  const P = 80;
  const inner = W - P * 2;
  const g = new Draw();
  let y = 200;
  g.text(P, y, '명경사주', 34, C.accent, { w: 700, serif: true });
  g.text(W - P, y, '명경이가 털어 본 내 사주', 26, C.sub, { anchor: 'end' });
  y += 34;
  comicPanel(g, cast, P, y, inner, 420, BUBBLE);
  y += 420 + 76;
  g.text(P, y, d.name ? `명경이가 본 ${d.name}님` : '명경이가 본 나', 30, C.accent, { w: 700 });
  y += 80;
  for (const l of wrapBalanced(d.headline, 60, inner, 2)) {
    g.text(P, y, l, 60, C.ink, { w: 700, serif: true });
    y += 80;
  }
  // 명경이의 솔직한 한마디 — 좋은 말만 하지 않는 거울
  y += 6;
  const quote = wrap(d.subline, 32, inner - 40, 3);
  g.raw(`<rect x="${P}" y="${y - 36}" width="6" height="${quote.length * 48 + 52}" fill="${C.accent}"/>`);
  g.text(P + 34, y, '명경이의 솔직한 한마디', 24, C.accent, { w: 700 });
  y += 48;
  for (const l of quote) {
    g.text(P + 34, y, l, 32, C.ink, { w: 700, serif: true });
    y += 48;
  }
  y += 40;
  y += pillars(g, a, P, y, inner, 64) + 56;
  if (d.tags.length) {
    for (const l of wrap(d.tags.slice(0, 3).join('  '), 30, inner, 1)) g.text(P, y, l, 30, C.accent, { w: 700 });
    y += 58;
  }
  if (hits) g.text(P, y, `명경이가 평소 내 모습 ${hits.done}개 중 ${hits.hit}개를 맞혔어요`, 28, C.ink, { w: 600 });
  // 아래 (인스타 화면 글자 영역 위)
  g.raw(`<line x1="${P}" y1="1590" x2="${W - P}" y2="1590" stroke="${C.line}" stroke-width="2"/>`);
  g.text(P, 1648, '나도 명경이한테 사주 털리기', 30, C.ink, { w: 700 });
  g.text(P, 1694, site, 28, C.accent, { w: 600 });
  g.text(W - P, 1670, '정확하게 계산하고, 있는 그대로', 22, C.sub, { anchor: 'end' });
  return `${svgOpen(W, 1920, fonts)}\n${g.o.join('\n')}\n</svg>`;
}

/** 카카오톡 메시지 사진 (정사각) */
export function squareSvg(d: StoryData, cast: Cast, site: string, fonts = ''): string {
  const W = 1080;
  const P = 70;
  const g = new Draw();
  comicPanel(g, cast, P, P, W - P * 2, 520, BUBBLE);
  let y = P + 520 + 90;
  g.text(P, y, d.name ? `명경이가 본 ${d.name}님` : '명경이가 본 나', 30, C.accent, { w: 700 });
  y += 82;
  for (const l of wrapBalanced(d.headline, 62, W - P * 2, 2)) {
    g.text(P, y, l, 62, C.ink, { w: 700, serif: true });
    y += 82;
  }
  g.text(P, W - P, '명경사주', 32, C.accent, { w: 700, serif: true });
  g.text(W - P, W - P, site, 26, C.sub, { anchor: 'end' });
  return `${svgOpen(W, W, fonts)}\n${g.o.join('\n')}\n</svg>`;
}

/** 캐릭터 그림은 웹툰과 같은 컴포넌트로 화면 밖에 그려 두고, 이미지를 만들 때 꺼내 쓴다 */
function CastArt({ a, refEl }: { a: SajuAnalysis; refEl: RefObject<SVGSVGElement | null> }) {
  const me: Actor = useMemo(() => {
    const el = STEMS[a.pillars.day.stem].element;
    return { role: 'me', x: 0, face: 'shock', pose: 'stand', front: true, gender: a.input.gender, outfit: EL_COLOR[el], el, age: ageGroup(a.age) };
  }, [a]);
  const mirror: Actor = { role: 'mirror', x: 0, face: 'smug', pose: 'point' };
  return (
    <svg ref={refEl} width="0" height="0" className="absolute" aria-hidden>
      <g data-cast="me">
        <Toon a={me} z={1} />
      </g>
      <g data-cast="mirror">
        <Toon a={mirror} z={1} />
      </g>
    </svg>
  );
}

function readCast(svg: SVGSVGElement | null): Cast {
  const ser = new XMLSerializer();
  const get = (k: string) => {
    const el = svg?.querySelector(`[data-cast="${k}"]`);
    return el ? ser.serializeToString(el) : '';
  };
  return { me: get('me'), mirror: get('mirror') };
}

const siteLabel = () => siteUrl().replace(/^https?:\/\//, '').replace(/\/$/, '');

export function ShareSection({ a, d }: { a: SajuAnalysis; d: StoryData }) {
  const [busy, setBusy] = useState<'' | 'save' | 'insta' | 'kakao'>('');
  const [msg, setMsg] = useState('');
  const castRef = useRef<SVGSVGElement>(null);
  const app = inApp();
  const track = () => send('events', { sessionId: sessionId(), type: 'share' });
  const file = 'myeonggyeong-story.png';

  const makeStory = async () => svgStringToPng(storySvg(a, d, readCast(castRef.current), siteLabel(), hitScore(a), await embeddedFonts()), 1080, 1920, 1);
  const makeSquare = async () => new File([await svgStringToPng(squareSvg(d, readCast(castRef.current), siteLabel(), await embeddedFonts()), 1080, 1080, 1)], 'myeonggyeong-card.png', { type: 'image/png' });
  // 공유 창은 누른 직후에 열어야 해서(특히 아이폰) 사진을 미리 만들어 둔다. 퀴즈 답이 바뀌면 누를 때 새로 만든다.
  const ready = useRef<{ key: string; story: Blob; square: File } | null>(null);
  const keyNow = () => JSON.stringify([d, hitScore(a)]);
  useEffect(() => {
    let alive = true;
    const t = window.setTimeout(async () => {
      try {
        const key = keyNow();
        const [story, square] = await Promise.all([makeStory(), makeSquare()]);
        if (alive) ready.current = { key, story, square };
      } catch {
        /* 누를 때 다시 만든다 */
      }
    }, 1500);
    return () => {
      alive = false;
      window.clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [a, d.headline, d.subline]);
  const fresh = () => (ready.current && ready.current.key === keyNow() ? ready.current : null);
  const storyPng = async () => fresh()?.story ?? makeStory();
  const squareFile = async () => fresh()?.square ?? makeSquare();
  /** 인스타 스토리의 '링크' 스티커에 바로 붙일 수 있게 주소를 복사해 둔다 */
  const copySite = async () => {
    try {
      await navigator.clipboard.writeText(siteUrl());
      return true;
    } catch {
      return false;
    }
  };

  const linkTip = (copied: boolean) =>
    copied ? '사이트 주소를 복사해 뒀어요. 스토리의 ‘링크’ 스티커에 붙여 넣으면 친구가 바로 들어올 수 있어요.' : '스토리의 ‘링크’ 스티커로 사이트 주소를 달면 친구가 바로 들어올 수 있어요.';
  const save = async () => {
    setBusy('save');
    setMsg('');
    try {
      const r = await saveImage(await storyPng(), file, '명경이가 털어 본 내 사주');
      const copied = await copySite();
      if (r === 'downloaded' || r === 'shared') setMsg(`사진을 저장했어요. ${linkTip(copied)}`);
      if (r === 'shown') setMsg(linkTip(copied));
      if (r !== 'cancelled') track();
    } catch {
      setMsg('이미지를 만들지 못했어요.');
    }
    setBusy('');
  };
  const insta = async () => {
    setBusy('insta');
    setMsg('');
    try {
      const blob = await storyPng();
      const f = new File([blob], file, { type: 'image/png' });
      const copied = await copySite();
      if (app) {
        // 앱 안 브라우저는 공유 창을 못 쓰니 사진을 띄워 저장하게 한다
        showImage(blob, '명경이가 털어 본 내 사주', '저장한 뒤 인스타그램 앱 → 스토리에서 이 사진을 골라 주세요.');
        setMsg(linkTip(copied));
        track();
      } else if (navigator.canShare?.({ files: [f] })) {
        try {
          await navigator.share({ files: [f] });
          track();
          if (copied) setMsg(linkTip(true));
        } catch (e) {
          if (!(e instanceof DOMException && e.name === 'AbortError')) throw e;
        }
      } else {
        downloadBlob(blob, file);
        setMsg(`이 기기에서는 바로 넘길 수 없어 사진으로 저장했어요. 인스타그램 앱 → 스토리에서 저장한 사진을 골라 주세요. ${linkTip(copied)}`);
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
    let image: File | undefined;
    try {
      image = await squareFile();
    } catch {
      /* 사진 없이 기본 미리보기로 */
    }
    const r = await shareKakao({ title: `명경이가 본 나: ${d.headline}`, description: '좋은 말만 하지 않는 사주 — 너도 명경이한테 털려 볼래?', image });
    if (r === 'copied') setMsg('공유할 문구와 링크를 복사했어요. 카카오톡 대화방에 붙여 넣어 주세요.');
    if (r === 'failed') setMsg('공유하지 못했어요. 주소창의 링크를 직접 보내 주세요.');
    if (r !== 'cancelled' && r !== 'failed') track();
    setBusy('');
  };

  return (
    <section className="no-print mt-14" aria-labelledby="share-title">
      <CastArt a={a} refEl={castRef} />
      <h2 id="share-title" className="text-title2 text-ink">
        친구에게 자랑하기
      </h2>
      <p className="mt-1 text-label text-sub">명경이가 털어 본 내 사주를 한 장으로 만들어 드려요. 생년월일과 시간은 넣지 않아요.</p>
      <div className="mt-5 space-y-2">
        <button type="button" className="btn-primary w-full" onClick={insta} disabled={!!busy}>
          {busy === 'insta' ? '만드는 중…' : '인스타그램 스토리에 올리기'}
        </button>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" className="btn-secondary" onClick={kakao} disabled={!!busy}>
            {busy === 'kakao' ? '만드는 중…' : '카카오톡 공유'}
          </button>
          <button type="button" className="btn-secondary" onClick={save} disabled={!!busy}>
            {busy === 'save' ? '만드는 중…' : '사진으로 저장'}
          </button>
        </div>
      </div>
      {app ? (
        <div className="panel mt-4">
          <p className="text-label font-semibold text-ink">{IN_APP_NAME[app]} 안에서 열려 있어요</p>
          <p className="mt-1 text-label text-sub">
            여기서는 사진을 화면에 띄워 드려요. 길게 눌러 저장한 뒤 올려 주세요. 휴대폰 기본 브라우저로 열면 인스타그램으로 바로 넘길 수 있어요. {externalHint(app)}
          </p>
          {app === 'kakao' && (
            <button type="button" className="btn-small mt-3" onClick={() => openExternal()}>
              다른 브라우저로 열기
            </button>
          )}
        </div>
      ) : (
        <p className="mt-3 text-cap text-sub">‘인스타그램 스토리에 올리기’를 누르면 공유 창이 떠요. 거기서 Instagram → 스토리를 고르면 돼요.</p>
      )}
      {msg && <p className="mt-2 text-label font-semibold text-accent">{msg}</p>}
    </section>
  );
}
