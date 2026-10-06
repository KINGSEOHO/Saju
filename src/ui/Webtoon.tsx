/** 인생 웹툰 탭 — 사주로 그린 4컷·6컷 만화, 컷별 해설, 이미지 저장·공유 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { FONT, PH, PW, PanelArt } from '../comic/art.tsx';
import { lifeComic, personaComic } from '../comic/script.ts';
import type { Comic } from '../comic/types.ts';
import type { SajuAnalysis } from '../engine/index.ts';
import { send, sessionId } from '../lib/api.ts';
import { SectionRating } from './Feedback.tsx';
import { SectionTitle } from './common.tsx';

type Kind = 'persona' | 'life';
const KINDS: { id: Kind; label: string; sub: string }[] = [
  { id: 'persona', label: '나는 이런 사람', sub: '성격 4컷' },
  { id: 'life', label: '나의 인생', sub: '인생 6컷' },
];

const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** 화면에 그려진 컷(SVG)을 한 장의 세로 웹툰으로 이어 붙여 PNG로 만든다 */
export async function comicToPng(comic: Comic, panels: SVGSVGElement[], site: string, scale = 2): Promise<Blob> {
  const M = 24;
  const HEAD = 124;
  const GAP = 18;
  const FOOT = 92;
  const W = PW + M * 2;
  const H = HEAD + panels.length * (PH + GAP) - GAP + FOOT;
  const ser = new XMLSerializer();
  const body = panels
    .map((el, i) =>
      ser
        .serializeToString(el)
        .replace(/^<svg\b[^>]*>/, `<svg xmlns="http://www.w3.org/2000/svg" x="${M}" y="${HEAD + i * (PH + GAP)}" width="${PW}" height="${PH}" viewBox="0 0 ${PW} ${PH}" font-family="${esc(FONT)}">`),
    )
    .join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="${esc(FONT)}">
<rect width="${W}" height="${H}" fill="#fffdf8"/>
<text x="${M}" y="38" font-size="15" font-weight="700" fill="#34518c">명경사주 · 사주로 그린 인생 웹툰</text>
<text x="${M}" y="76" font-size="29" font-weight="800" fill="#1c1917">${esc(comic.title)}</text>
<text x="${M}" y="104" font-size="16" fill="#57534e">${esc(comic.subtitle)}</text>
${body}
<text x="${W / 2}" y="${H - 54}" font-size="14" fill="#78716c" text-anchor="middle">사주에 나타난 경향을 그린 만화이며, 실제 사건을 예언하지 않습니다.</text>
<text x="${W / 2}" y="${H - 28}" font-size="16" font-weight="700" fill="#22355d" text-anchor="middle">${esc(site)}</text>
</svg>`;
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('이미지를 만들지 못했어요.'));
      img.src = url;
    });
    const canvas = document.createElement('canvas');
    canvas.width = W * scale;
    canvas.height = H * scale;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('이 브라우저에서는 이미지를 만들 수 없어요.');
    ctx.scale(scale, scale);
    ctx.drawImage(img, 0, 0, W, H);
    return await new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('이미지를 만들지 못했어요.'))), 'image/png'));
  } finally {
    URL.revokeObjectURL(url);
  }
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function WebtoonPanel({ a }: { a: SajuAnalysis }) {
  const [kind, setKind] = useState<Kind>('persona');
  const comics = useMemo(() => ({ persona: personaComic(a), life: lifeComic(a) }), [a]);
  const comic = comics[kind];
  const [notes, setNotes] = useState(false);
  const stripRef = useRef<HTMLDivElement>(null);
  const [png, setPng] = useState<{ key: string; blob: Blob } | null>(null);
  const [msg, setMsg] = useState('');
  const key = `${kind}:${comic.title}:${comic.subtitle}`;
  const site = `${window.location.host}${window.location.pathname}`.replace(/\/$/, '');
  // 한글 파일명은 일부 기기에서 'download'로 바뀌어 영문으로 쓴다
  const filename = `saju-webtoon-${kind === 'persona' ? '4cut' : '6cut'}.png`;

  // 공유 버튼은 사용자 동작 직후에 바로 실행돼야 해서(특히 아이폰) 이미지를 미리 만들어 둔다
  useEffect(() => {
    let alive = true;
    const t = window.setTimeout(async () => {
      const els = Array.from(stripRef.current?.querySelectorAll<SVGSVGElement>('svg[data-panel]') ?? []);
      if (!els.length) return;
      try {
        const blob = await comicToPng(comic, els, site);
        if (alive) setPng({ key, blob });
      } catch {
        /* 저장 버튼을 누를 때 다시 시도 */
      }
    }, 400);
    return () => {
      alive = false;
      window.clearTimeout(t);
    };
  }, [comic, key, site]);

  const ready = png?.key === key ? png.blob : null;
  const makePng = async () => ready ?? (await comicToPng(comic, Array.from(stripRef.current?.querySelectorAll<SVGSVGElement>('svg[data-panel]') ?? []), site));
  const track = () => send('events', { sessionId: sessionId(), type: 'share' });

  const save = async () => {
    setMsg('');
    try {
      download(await makePng(), filename);
      track();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : '이미지를 만들지 못했어요.');
    }
  };

  const share = async () => {
    setMsg('');
    try {
      const blob = ready ?? (await makePng());
      const file = new File([blob], filename, { type: 'image/png' });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: comic.title, text: '명경사주에서 내 사주로 그린 인생 웹툰' });
        track();
      } else {
        download(blob, filename);
        track();
        setMsg('이 브라우저는 바로 공유를 지원하지 않아 이미지로 저장했어요. 저장된 이미지를 메신저나 SNS에 올려 주세요.');
      }
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      setMsg(e instanceof Error ? e.message : '공유하지 못했어요.');
    }
  };

  return (
    <section className="card">
      <SectionTitle
        kicker="명경사주에만 있는 기능"
        title="인생 웹툰"
        desc="풀이 리포트를 바탕으로 그린 만화예요. 장면 하나하나가 사주의 구조에서 나왔고, 컷마다 왼쪽 아래에 그 근거를 적어 두었어요. 좋은 장면만 고르지 않고, 약점도 한 컷 솔직하게 넣었습니다."
      />
      <div className="grid grid-cols-2 gap-1 rounded-2xl border border-stone-200 bg-stone-50 p-1 dark:border-stone-800 dark:bg-stone-900" role="tablist" aria-label="웹툰 종류">
        {KINDS.map((k) => (
          <button
            key={k.id}
            type="button"
            role="tab"
            aria-selected={kind === k.id}
            onClick={() => setKind(k.id)}
            className={`rounded-xl px-2 py-2.5 text-center transition ${kind === k.id ? 'tab-on' : 'tab-off'}`}
          >
            <div className="text-sm font-bold sm:text-base">{k.label}</div>
            <div className={`text-xs ${kind === k.id ? 'opacity-80' : 'text-stone-500'}`}>{k.sub}</div>
          </button>
        ))}
      </div>

      <div ref={stripRef} className="-mx-5 mt-6 sm:mx-auto sm:max-w-[600px]">
        <div className="px-5 text-center sm:px-0">
          <h3 className="text-xl font-extrabold sm:text-2xl">{comic.title}</h3>
          <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">{comic.subtitle}</p>
        </div>
        <div className="mt-4 space-y-3 sm:space-y-4">
          {comic.panels.map((p, i) => (
            <figure key={`${kind}-${i}`} className="m-0">
              <div className="overflow-hidden shadow-sm sm:rounded-[3px]">
                <PanelArt p={p} label={`${i + 1}컷. ${p.caption.replace('\n', ' ')} ${p.lines.map((l) => l.text).join(' ')}`} />
              </div>
              {notes && (
                <figcaption className="mx-5 mt-2 rounded-xl bg-stone-50 px-4 py-3 text-sm leading-relaxed text-stone-700 sm:mx-0 dark:bg-stone-800/60 dark:text-stone-300">
                  <b className="text-stone-900 dark:text-stone-100">
                    {i + 1}컷 · {p.title}
                  </b>{' '}
                  {p.note}
                </figcaption>
              )}
            </figure>
          ))}
        </div>
      </div>

      <div className="no-print mt-6 flex flex-wrap justify-center gap-2">
        <button type="button" className="btn-primary" onClick={save}>
          이미지로 저장
        </button>
        <button type="button" className="btn-ghost" onClick={share}>
          공유하기
        </button>
        <button type="button" className="btn-ghost" aria-pressed={notes} onClick={() => setNotes((v) => !v)}>
          {notes ? '해설 숨기기' : '컷별 해설 보기'}
        </button>
      </div>
      {msg && <p className="mt-3 text-center text-sm text-stone-600 dark:text-stone-400">{msg}</p>}
      <p className="mt-4 text-center text-xs leading-relaxed text-stone-500">
        웹툰은 사주에 나타난 경향을 장면으로 옮긴 것이며, 실제 사건을 예언하지 않습니다.
        <br />
        인생 6컷의 시기 구분은 대운(10년 단위의 큰 운)을 따릅니다.
      </p>
      <SectionRating a={a} section="webtoon" question="이 웹툰, 실제 내 삶과 얼마나 닮았나요?" />
    </section>
  );
}
