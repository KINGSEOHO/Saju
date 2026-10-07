/** 인생 웹툰 탭 — 사주로 그린 회차별 웹툰, 컷별 해설, 이미지 저장·공유 */
import { Children, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { FONT, PW, PanelArt, TextBeatArt } from '../comic/art.tsx';
import { episodes } from '../comic/episodes.ts';
import { isText, type Comic, type EpisodeId, type Panel } from '../comic/types.ts';
import type { SajuAnalysis } from '../engine/index.ts';
import { send, sessionId } from '../lib/api.ts';
import { downloadBlob, escXml, shareOrDownload, SVG_SERIF, svgStringToPng } from '../lib/svgImage.ts';
import { crossReport } from '../report/cross.ts';
import type { Report } from '../report/generate.ts';
import { ExtrasForm } from './Cross.tsx';
import { SectionRating } from './Feedback.tsx';
import { Chevron, scrollToStart, SectionTitle } from './common.tsx';

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
<rect width="${W}" height="${H}" fill="#ffffff"/>
<text x="${M}" y="38" font-size="14" font-weight="600" fill="#33574d">명경사주 · 내 사주로 그린 개그 웹툰</text>
<text x="${M}" y="78" font-size="29" font-weight="700" fill="#1e1d1b" font-family="${escXml(SVG_SERIF)}">${escXml(`${comic.no}화 · ${comic.title}`)}</text>
<text x="${M}" y="106" font-size="16" fill="#6a6966">${escXml(comic.subtitle)}</text>
${body}
<text x="${W / 2}" y="${H - 54}" font-size="14" fill="#6a6966" text-anchor="middle">사주에 나타난 경향을 그린 만화이며, 실제 사건을 예언하지 않습니다.</text>
<text x="${W / 2}" y="${H - 28}" font-size="16" font-weight="600" fill="#33574d" text-anchor="middle">${escXml(site)}</text>
</svg>`;
  // 아이폰 캔버스 한도(약 1,670만 화소) 안에서 가장 선명하게
  const scale = Math.min(2, Math.sqrt(15_000_000 / (W * H)));
  return svgStringToPng(svg, W, H, scale);
}

/**
 * 컷을 한 장씩 옆으로 넘겨 보는 카드 — 손가락으로 밀거나 화살표 버튼·키보드로 넘긴다.
 * 모든 컷이 화면(DOM)에 그려져 있어 이미지 저장은 그대로 된다.
 */
function Carousel({ count, children, last, onLast }: { count: number; children: ReactNode; last: string | null; onLast: () => void }) {
  const track = useRef<HTMLDivElement>(null);
  const [cur, setCur] = useState(0);
  const go = (i: number) => {
    const el = track.current;
    if (!el) return;
    const n = Math.max(0, Math.min(count - 1, i));
    el.scrollTo({ left: n * el.clientWidth, behavior: 'smooth' });
  };
  const onScroll = () => {
    const el = track.current;
    if (el) setCur(Math.round(el.scrollLeft / el.clientWidth));
  };
  const end = cur >= count - 1;
  return (
    <div className="mt-5">
      <div
        ref={track}
        onScroll={onScroll}
        tabIndex={0}
        role="region"
        aria-roledescription="carousel"
        aria-label={`웹툰 컷 ${cur + 1} / ${count}`}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight') go(cur + 1);
          if (e.key === 'ArrowLeft') go(cur - 1);
        }}
        className="flex snap-x snap-mandatory items-start overflow-x-auto overscroll-x-contain outline-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {Children.map(children, (c, i) => (
          <div className="w-full shrink-0 snap-center snap-always px-5 sm:px-0" aria-hidden={i !== cur}>
            {c}
          </div>
        ))}
      </div>
      <div className="no-print mt-4 px-5 sm:px-0">
        <div className="h-0.5 bg-line" aria-hidden>
          <div className="h-0.5 bg-accent transition-[width]" style={{ width: `${((cur + 1) / count) * 100}%` }} />
        </div>
        <div className="mt-3 flex items-center justify-between gap-3">
          <button type="button" onClick={() => go(cur - 1)} disabled={cur === 0} className="btn-small w-24 disabled:opacity-40" aria-label="이전 컷">
            이전
          </button>
          <span className="text-label text-sub tabular-nums">
            {cur + 1} / {count}
          </span>
          {end && last ? (
            <button type="button" onClick={onLast} className="btn h-10 w-24 rounded-xl bg-accent px-3 text-label text-on-accent" aria-label={`다음 화 ${last}`}>
              다음 화
            </button>
          ) : (
            <button type="button" onClick={() => go(cur + 1)} disabled={end} className="btn h-10 w-24 rounded-xl bg-accent px-3 text-label text-on-accent disabled:bg-fill disabled:text-faint" aria-label="다음 컷">
              다음
            </button>
          )}
        </div>
        {cur === 0 && <p className="mt-2 text-center text-cap text-sub">옆으로 밀어서 넘겨 보세요</p>}
      </div>
    </div>
  );
}

/** 화면 낭독기용 컷 설명 */
function panelLabel(p: Panel): string {
  const talk = p.split ? p.split.flatMap((h) => [h.label, ...h.talk.map((l) => l.text)]) : p.talk.map((l) => l.text);
  return [p.cover?.title, p.cap, ...talk].filter(Boolean).join(' / ') || p.title;
}

export function WebtoonPanel({ a, report }: { a: SajuAnalysis; report: Report }) {
  const x = useMemo(() => crossReport(a, report), [a, report]);
  const list = useMemo(() => episodes(a, x), [a, x]);
  const [id, setId] = useState<EpisodeId>('persona');
  const comic = list.find((c) => c.id === id) ?? null;
  const [notes, setNotes] = useState(false);
  const stripRef = useRef<HTMLDivElement>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const jumpRef = useRef(false);
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
    jumpRef.current = true;
  };
  // 다음 화가 화면에 그려진 뒤, 그 화의 제목(웹툰 시작)이 머리말 바로 아래 오도록 올린다
  useEffect(() => {
    if (!jumpRef.current) return;
    jumpRef.current = false;
    scrollToStart(stripRef.current ?? topRef.current);
  }, [id]);

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
    <section>
      <div ref={topRef} />
      <SectionTitle
        kicker="내 사주로 그린 웹툰"
        title="인생 웹툰"
        desc="웃기게 그렸지만 장면의 뼈대는 모두 사주 구조에서 나왔고, 컷마다 왼쪽 아래에 근거를 적어 두었어요. 거울 요정 명경이는 좋은 말만 하지 않아요."
      />
      <div className="seg" role="tablist" aria-label="웹툰 회차">
        {TABS.map((t) => {
          const locked = t.id === 'mbti' && !list.some((c) => c.id === 'mbti');
          return (
            <button key={t.id} type="button" role="tab" aria-selected={id === t.id} onClick={() => choose(t.id)} className={`seg-item px-1 py-2 ${id === t.id ? 'seg-on' : ''}`}>
              <span className="block text-micro font-semibold">{t.no}화</span>
              <span className="block text-[13px] leading-tight">{t.label}</span>
              {locked && <span className="mt-0.5 block text-[10px] font-normal text-faint">MBTI 필요</span>}
            </button>
          );
        })}
      </div>

      {id === 'work' && !hasJob && (
        <div className="no-print panel mt-6">
          <p className="mb-4 text-ui font-semibold text-ink">직업을 알려 주면, 내 일터와 내 직업 이야기로 2화를 다시 그려 드려요.</p>
          <ExtrasForm input={a.input} focus="job" />
        </div>
      )}

      {!comic ? (
        <div className="panel mt-6">
          <p className="text-title3 font-serif font-bold text-ink">4화는 MBTI를 알려 주면 열려요</p>
          <p className="mt-1 text-label text-sub">MBTI(겉)와 사주(속)가 같은 축과 다른 축을 장면으로 비교하고, 강점·약점·개운법을 그려 드려요.</p>
          <div className="mt-5">
            <ExtrasForm input={a.input} focus="mbti" />
          </div>
        </div>
      ) : (
        <>
          <div ref={stripRef} className="-mx-5 mt-8 sm:mx-0">
            <div className="px-5 sm:px-0">
              <p className="kicker">{comic.no}화</p>
              <h3 className="mt-1 text-title2 text-ink">{comic.title}</h3>
              <p className="mt-1 text-label text-sub">{comic.subtitle}</p>
            </div>
            <Carousel key={key} count={comic.beats.length} last={nextTab ? `${nextTab.no}화 · ${nextTab.label}` : null} onLast={goNext}>
              {comic.beats.map((b, i) => (
                <figure key={`${comic.id}-${i}`} className="m-0">
                  <div className="overflow-hidden sm:rounded-md">{isText(b) ? <TextBeatArt b={b} /> : <PanelArt p={b} label={panelLabel(b)} />}</div>
                  {notes && b.note && (
                    <figcaption className="mt-2 rounded-xl bg-subtle px-4 py-3 text-label text-ink-2">
                      <b className="text-ink">{b.title}</b> {b.note}
                    </figcaption>
                  )}
                </figure>
              ))}
            </Carousel>
          </div>

          <div className="no-print mt-8 space-y-2">
            <button type="button" className="btn-primary w-full" onClick={() => exportPng('save')}>
              이미지로 저장
            </button>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" className="btn-secondary" onClick={() => exportPng('share')}>
                공유하기
              </button>
              <button type="button" className="btn-secondary" aria-pressed={notes} onClick={() => setNotes((v) => !v)}>
                {notes ? '해설 숨기기' : '컷별 해설 보기'}
              </button>
            </div>
          </div>
          {msg && <p className="mt-3 text-center text-cap text-sub">{msg}</p>}
          {nextTab && (
            <button type="button" onClick={goNext} className="no-print mt-8 flex w-full items-center justify-between border-y border-line py-4 text-left">
              <span>
                <span className="block text-cap text-sub">다음 화</span>
                <span className="block font-serif text-title3 font-bold text-ink">
                  {nextTab.no}화 · {nextTab.label}
                </span>
              </span>
              <Chevron className="-rotate-90" />
            </button>
          )}
        </>
      )}
      <p className="mt-6 text-cap text-sub">
        웹툰은 사주에 나타난 경향을 장면으로 옮긴 것이며, 실제 사건을 예언하지 않아요. 인생 연대기의 시기 구분은 대운(10년 단위의 큰 운)을 따라요.
      </p>
      <SectionRating a={a} section="webtoon" question="이 웹툰, 실제 내 삶과 얼마나 닮았나요?" />
    </section>
  );
}
