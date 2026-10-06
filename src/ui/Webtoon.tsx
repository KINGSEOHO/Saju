/** 인생 웹툰 탭 — 사주로 그린 회차별 웹툰, 컷별 해설, 이미지 저장·공유 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { FONT, PW, PanelArt, TextBeatArt } from '../comic/art.tsx';
import { episodes } from '../comic/episodes.ts';
import { isText, type Comic, type EpisodeId } from '../comic/types.ts';
import type { SajuAnalysis } from '../engine/index.ts';
import { send, sessionId } from '../lib/api.ts';
import { downloadBlob, escXml, shareOrDownload, svgStringToPng } from '../lib/svgImage.ts';
import { crossReport } from '../report/cross.ts';
import type { Report } from '../report/generate.ts';
import { ExtrasForm } from './Cross.tsx';
import { SectionRating } from './Feedback.tsx';
import { SectionTitle } from './common.tsx';

const TABS: { id: EpisodeId; no: number; label: string }[] = [
  { id: 'persona', no: 1, label: '나라는 사람' },
  { id: 'work', no: 2, label: '일과 나' },
  { id: 'life', no: 3, label: '인생 연대기' },
  { id: 'mbti', no: 4, label: 'MBTI와 사주' },
];

/** 화면에 그려진 컷(SVG)을 한 장의 세로 웹툰으로 이어 붙여 PNG로 만든다 */
export async function comicToPng(comic: Comic, els: SVGSVGElement[], site: string): Promise<Blob> {
  const M = 24;
  const HEAD = 128;
  const GAP = 14;
  const FOOT = 92;
  const W = PW + M * 2;
  const heights = els.map((el) => Number(el.getAttribute('data-h')) || el.viewBox.baseVal.height || 440);
  const H = HEAD + heights.reduce((s, h) => s + h, 0) + GAP * Math.max(0, els.length - 1) + FOOT;
  const ser = new XMLSerializer();
  let y = HEAD;
  const body = els
    .map((el, i) => {
      const h = heights[i];
      const s = ser
        .serializeToString(el)
        .replace(/^<svg\b[^>]*>/, `<svg xmlns="http://www.w3.org/2000/svg" x="${M}" y="${y}" width="${PW}" height="${h}" viewBox="0 0 ${PW} ${h}" font-family="${escXml(FONT)}">`);
      y += h + GAP;
      return s;
    })
    .join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="${escXml(FONT)}">
<rect width="${W}" height="${H}" fill="#fffdf8"/>
<text x="${M}" y="38" font-size="15" font-weight="700" fill="#34518c">명경사주 · 사주로 그린 인생 웹툰</text>
<text x="${M}" y="78" font-size="29" font-weight="800" fill="#1c1917">${escXml(`${comic.no}화 · ${comic.title}`)}</text>
<text x="${M}" y="106" font-size="16" fill="#57534e">${escXml(comic.subtitle)}</text>
${body}
<text x="${W / 2}" y="${H - 54}" font-size="14" fill="#78716c" text-anchor="middle">사주에 나타난 경향을 그린 만화이며, 실제 사건을 예언하지 않습니다.</text>
<text x="${W / 2}" y="${H - 28}" font-size="16" font-weight="700" fill="#22355d" text-anchor="middle">${escXml(site)}</text>
</svg>`;
  // 아이폰 캔버스 한도(약 1,670만 화소) 안에서 가장 선명하게
  const scale = Math.min(2, Math.sqrt(15_000_000 / (W * H)));
  return svgStringToPng(svg, W, H, scale);
}

export function WebtoonPanel({ a, report }: { a: SajuAnalysis; report: Report }) {
  const x = useMemo(() => crossReport(a, report), [a, report]);
  const list = useMemo(() => episodes(a, x), [a, x]);
  const [id, setId] = useState<EpisodeId>('persona');
  const comic = list.find((c) => c.id === id) ?? null;
  const [notes, setNotes] = useState(false);
  const stripRef = useRef<HTMLDivElement>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const [png, setPng] = useState<{ key: string; blob: Blob } | null>(null);
  const [msg, setMsg] = useState('');
  const key = comic ? `${comic.id}:${comic.title}:${comic.subtitle}:${comic.beats.length}` : '';
  const site = `${window.location.host}${window.location.pathname}`.replace(/\/$/, '');
  const filename = `saju-webtoon-ep${comic?.no ?? 1}.png`;
  const svgs = () => Array.from(stripRef.current?.querySelectorAll<SVGSVGElement>('svg[data-panel]') ?? []);

  // 공유 버튼은 사용자 동작 직후에 바로 실행돼야 해서(특히 아이폰) 이미지를 미리 만들어 둔다
  useEffect(() => {
    if (!comic) return;
    let alive = true;
    const t = window.setTimeout(async () => {
      const els = svgs();
      if (!els.length) return;
      try {
        const blob = await comicToPng(comic, els, site);
        if (alive) setPng({ key, blob });
      } catch {
        /* 저장 버튼을 누를 때 다시 시도 */
      }
    }, 600);
    return () => {
      alive = false;
      window.clearTimeout(t);
    };
  }, [comic, key, site]);

  const choose = (next: EpisodeId) => {
    setId(next);
    setMsg('');
  };
  const goNext = () => {
    const i = TABS.findIndex((t) => t.id === id);
    const next = TABS[i + 1];
    if (!next) return;
    choose(next.id);
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const ready = png?.key === key ? png.blob : null;
  const track = () => send('events', { sessionId: sessionId(), type: 'share' });
  const exportPng = async (mode: 'save' | 'share') => {
    if (!comic) return;
    setMsg('');
    try {
      const blob = ready ?? (await comicToPng(comic, svgs(), site));
      if (mode === 'share') {
        const r = await shareOrDownload(blob, filename, `${comic.no}화 · ${comic.title}`, '명경사주에서 내 사주로 그린 인생 웹툰');
        if (r === 'cancelled') return;
        if (r === 'downloaded') setMsg('이 브라우저는 바로 공유를 지원하지 않아 이미지로 저장했어요. 저장된 이미지를 메신저나 SNS에 올려 주세요.');
      } else downloadBlob(blob, filename);
      track();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : '이미지를 만들지 못했어요.');
    }
  };

  const tabIndex = TABS.findIndex((t) => t.id === id);
  const nextTab = TABS[tabIndex + 1];
  const hasJob = !!a.input.job || a.age < 20;

  return (
    <section className="card">
      <div ref={topRef} className="scroll-mt-20" />
      <SectionTitle
        kicker="명경사주에만 있는 기능"
        title="인생 웹툰"
        desc="풀이 리포트를 바탕으로 그린 회차별 만화예요. 장면 하나하나가 사주의 구조에서 나왔고, 컷마다 왼쪽 아래에 근거를 적어 두었어요. 좋은 장면만 고르지 않고, 약점도 솔직하게 넣었습니다."
      />
      <div className="grid grid-cols-2 gap-1 rounded-2xl border border-stone-200 bg-stone-50 p-1 sm:grid-cols-4 dark:border-stone-800 dark:bg-stone-900" role="tablist" aria-label="웹툰 회차">
        {TABS.map((t) => {
          const locked = t.id === 'mbti' && !list.some((c) => c.id === 'mbti');
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={id === t.id}
              onClick={() => choose(t.id)}
              className={`rounded-xl px-2 py-2.5 text-center transition ${id === t.id ? 'tab-on' : 'tab-off'}`}
            >
              <div className={`text-xs font-semibold ${id === t.id ? 'opacity-80' : 'text-stone-500'}`}>
                {t.no}화{locked ? ' · 🔒' : ''}
              </div>
              <div className="text-sm font-bold sm:text-base">{t.label}</div>
            </button>
          );
        })}
      </div>

      {id === 'work' && !hasJob && (
        <div className="no-print mt-4 rounded-2xl border border-amber-200 bg-amber-50/70 p-4 dark:border-amber-900 dark:bg-amber-950/30">
          <p className="mb-3 text-sm font-semibold text-amber-900 dark:text-amber-200">직업을 알려 주면, 내 일터와 내 직업 이야기로 2화를 다시 그려 드려요.</p>
          <ExtrasForm input={a.input} focus="job" />
        </div>
      )}

      {!comic ? (
        <div className="mt-6 rounded-2xl border border-stone-200 p-5 text-center dark:border-stone-800">
          <p className="text-base font-bold">4화는 MBTI를 알려 주면 열려요</p>
          <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">MBTI(겉)와 사주(속)가 같은 축과 다른 축을 장면으로 비교하고, 강점·약점·개운법을 그려 드려요.</p>
          <div className="mx-auto mt-4 max-w-xl text-left">
            <ExtrasForm input={a.input} focus="mbti" />
          </div>
        </div>
      ) : (
        <>
          <div ref={stripRef} className="-mx-5 mt-6 sm:mx-auto sm:max-w-[600px]">
            <div className="px-5 text-center sm:px-0">
              <div className="text-sm font-bold text-amber-700 dark:text-amber-300">{comic.no}화</div>
              <h3 className="text-xl font-extrabold sm:text-2xl">{comic.title}</h3>
              <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">{comic.subtitle}</p>
            </div>
            <div className="mt-4 space-y-3 sm:space-y-4">
              {comic.beats.map((b, i) => (
                <figure key={`${comic.id}-${i}`} className="m-0">
                  <div className="overflow-hidden shadow-sm sm:rounded-[3px]">
                    {isText(b) ? <TextBeatArt b={b} /> : <PanelArt p={b} label={[b.caption, ...b.lines.map((l) => l.text)].filter(Boolean).join(' / ') || b.title} />}
                  </div>
                  {notes && b.note && (
                    <figcaption className="mx-5 mt-2 rounded-xl bg-stone-50 px-4 py-3 text-sm leading-relaxed text-stone-700 sm:mx-0 dark:bg-stone-800/60 dark:text-stone-300">
                      <b className="text-stone-900 dark:text-stone-100">{b.title}</b> {b.note}
                    </figcaption>
                  )}
                </figure>
              ))}
            </div>
          </div>

          <div className="no-print mt-6 flex flex-wrap justify-center gap-2">
            <button type="button" className="btn-primary" onClick={() => exportPng('save')}>
              이미지로 저장
            </button>
            <button type="button" className="btn-ghost" onClick={() => exportPng('share')}>
              공유하기
            </button>
            <button type="button" className="btn-ghost" aria-pressed={notes} onClick={() => setNotes((v) => !v)}>
              {notes ? '해설 숨기기' : '컷별 해설 보기'}
            </button>
          </div>
          {msg && <p className="mt-3 text-center text-sm text-stone-600 dark:text-stone-400">{msg}</p>}
          {nextTab && (
            <div className="no-print mt-5 text-center">
              <button type="button" onClick={goNext} className="btn rounded-full border border-amber-600/50 bg-amber-50 px-5 text-amber-900 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-200 dark:hover:bg-amber-950/70">
                다음 화 · {nextTab.no}화 {nextTab.label} →
              </button>
            </div>
          )}
        </>
      )}
      <p className="mt-4 text-center text-xs leading-relaxed text-stone-500">
        웹툰은 사주에 나타난 경향을 장면으로 옮긴 것이며, 실제 사건을 예언하지 않습니다.
        <br />
        인생 연대기의 시기 구분은 대운(10년 단위의 큰 운)을 따릅니다.
      </p>
      <SectionRating a={a} section="webtoon" question="이 웹툰, 실제 내 삶과 얼마나 닮았나요?" />
    </section>
  );
}
