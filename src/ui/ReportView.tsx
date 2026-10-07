import { useMemo, useState } from 'react';
import { BETA_FREE, PREMIUM_SECTIONS } from '../config/plans.ts';
import type { SajuAnalysis } from '../engine/index.ts';
import type { GaeunData, GaeunItem } from '../report/gaeun.ts';
import { generateReport, type ReportSection, type SectionId, type Statement } from '../report/generate.ts';
import type { StoryPara } from '../report/story.ts';
import { DivergingBars } from './Charts.tsx';
import { Gloss, Lead, SectionTitle, TONE_STYLE } from './common.tsx';
import { SectionRating } from './Feedback.tsx';

const TAB_ORDER: SectionId[] = ['summary', 'gaeun', 'personality', 'love', 'career', 'wealth', 'health'];

function Evidence({ text, show }: { text?: string; show: boolean }) {
  if (!show || !text) return null;
  return (
    <p className="mt-2 text-cap text-sub">
      <Gloss text={`근거 · ${text}`} />
    </p>
  );
}

function StatementItem({ s, showEvidence }: { s: Statement; showEvidence: boolean }) {
  const t = TONE_STYLE[s.tone];
  return (
    <li className="border-b border-line py-5">
      {s.tone !== 'neutral' && <span className={t.tag}>{t.label}</span>}
      <p className={`read ${s.tone !== 'neutral' ? 'mt-2' : ''}`}>
        <Lead text={s.text} />
      </p>
      <Evidence text={s.evidence} show={showEvidence} />
    </li>
  );
}

const WHEN: Record<'past' | 'now' | 'future', { label: string; tag: string; dot: string }> = {
  past: { label: '지나온 시간', tag: 'tag-mute', dot: 'bg-bg border-faint' },
  now: {
    label: '지금',
    tag: 'tag bg-accent text-on-accent',
    dot: 'bg-accent border-accent',
  },
  future: { label: '다가올 시간', tag: 'tag-pos', dot: 'bg-bg border-accent' },
};

function StoryView({ story, showEvidence }: { story: StoryPara[]; showEvidence: boolean }) {
  const firstWhen = story.findIndex((x) => x.when);
  return (
    <article>
      {story.map((p, i) => {
        if (!p.when) {
          return (
            <section key={i} className="mb-10">
              <h3 className="text-title3 text-ink">{p.title}</h3>
              <p className="read mt-3">
                <Lead text={p.text} />
              </p>
              <Evidence text={p.basis} show={showEvidence} />
            </section>
          );
        }
        const w = WHEN[p.when];
        return (
          <section key={i} className="relative pb-8 pl-7">
            {i === firstWhen && <h3 className="-ml-7 mb-5 text-title3 text-ink">인생 연대기</h3>}
            <div className="relative">
              <span aria-hidden className="absolute top-2 -bottom-8 -left-7 ml-[5px] w-px bg-line" />
              <span aria-hidden className={`absolute top-[7px] -left-7 size-[11px] rounded-full border-2 ${w.dot}`} />
              <div className="flex flex-wrap items-center gap-2">
                <h4 className={`font-serif text-[17px] font-bold ${p.when === 'past' ? 'text-sub' : 'text-ink'}`}>{p.title}</h4>
                <span className={w.tag}>{w.label}</span>
              </div>
              <p className={`read mt-2 ${p.when === 'past' ? 'text-sub' : ''}`}>
                <Lead text={p.text} />
              </p>
              <Evidence text={p.basis} show={showEvidence} />
            </div>
          </section>
        );
      })}
    </article>
  );
}

function GaeunList({ title, note, items, showEvidence }: { title: string; note: string; items: GaeunItem[]; showEvidence: boolean }) {
  return (
    <div>
      <h3 className="text-title3 text-ink">{title}</h3>
      <p className="mt-0.5 text-label text-sub">{note}</p>
      <dl className="mt-3 border-t border-line">
        {items.map((it) => (
          <div key={it.key} className="grid grid-cols-[5.5rem_1fr] gap-3 border-b border-line py-4">
            <dt className="pt-0.5 text-label font-semibold text-sub">{it.label}</dt>
            <dd className="min-w-0">
              <p className="font-serif text-[16px] leading-[1.75] text-ink-2">
                <Gloss text={it.value} />
              </p>
              <Evidence text={it.basis} show={showEvidence} />
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

const routineKey = () => `gaeun-routine-${new Date().toISOString().slice(0, 10)}`;
function loadRoutine(): number[] {
  try {
    return JSON.parse(localStorage.getItem(routineKey()) ?? '[]') as number[];
  } catch {
    return [];
  }
}

function GaeunBoard({ g, showEvidence }: { g: GaeunData; showEvidence: boolean }) {
  const [done, setDone] = useState<number[]>(loadRoutine);
  const toggle = (i: number) => {
    const next = done.includes(i) ? done.filter((x) => x !== i) : [...done, i];
    setDone(next);
    try {
      localStorage.setItem(routineKey(), JSON.stringify(next));
    } catch {
      /* 저장이 안 되는 브라우저에서도 화면은 그대로 */
    }
  };
  return (
    <div className="mb-12 space-y-12">
      <p className="read">
        <Lead text={g.why} />
      </p>
      <GaeunList title="가까이할 것" note="부족한 기운을 채워 주는 것들" items={g.close} showEvidence={showEvidence} />
      <GaeunList title="멀리할 것" note="이미 넘치는 기운을 더 키우는 것들" items={g.away} showEvidence={showEvidence} />
      {g.year && (
        <div className="panel">
          <p className={`text-label font-semibold ${g.year.tone === 'good' ? 'text-accent' : g.year.tone === 'bad' ? 'text-ink' : 'text-sub'}`}>{g.year.title}</p>
          <p className="read mt-2">
            <Gloss text={g.year.text} />
          </p>
          <Evidence text={g.year.basis} show={showEvidence} />
        </div>
      )}
      <div>
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="text-title3 text-ink">오늘부터 하는 개운 루틴</h3>
          <span className="text-label text-sub tabular-nums">
            오늘 {done.length}/{g.routine.length}
          </span>
        </div>
        <ul className="mt-3 border-t border-line">
          {g.routine.map((r, i) => (
            <li key={r.text} className="border-b border-line">
              <label className="flex cursor-pointer items-start gap-3 py-4">
                <input type="checkbox" className="mt-0.5 size-5 shrink-0 accent-accent" checked={done.includes(i)} onChange={() => toggle(i)} />
                <span className={`text-ui ${done.includes(i) ? 'text-faint line-through' : 'text-ink'}`}>
                  {r.text}
                  {showEvidence && <span className="ml-1.5 text-cap text-sub">({r.basis})</span>}
                </span>
              </label>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-cap text-sub">체크는 이 기기에만 저장돼요. 3주만 이어 가 보세요.</p>
      </div>
    </div>
  );
}

function SectionBody({ a, sec, showEvidence }: { a: SajuAnalysis; sec: ReportSection; showEvidence: boolean }) {
  const locked = !BETA_FREE && PREMIUM_SECTIONS.includes(sec.id);
  const [mode, setMode] = useState<'story' | 'cards'>('story');
  const thisYear = new Date(a.now).getUTCFullYear();
  return (
    <div>
      <p className="kicker">{sec.title} 한 줄 요약</p>
      <p className="mt-2 font-serif text-title2 font-bold text-ink">
        <Gloss text={sec.headline} />
      </p>
      <div className="mt-10">
        {!locked && sec.gaeun && <GaeunBoard g={sec.gaeun} showEvidence={showEvidence} />}
        {!locked && (
          <div className="mb-8 flex items-center justify-between gap-3">
            <div className="seg w-full max-w-[17rem]" role="tablist" aria-label="보기 방식">
              {(
                [
                  ['story', '이야기로 읽기'],
                  ['cards', '핵심만 보기'],
                ] as const
              ).map(([id, label]) => (
                <button key={id} type="button" role="tab" aria-selected={mode === id} onClick={() => setMode(id)} className={`seg-item ${mode === id ? 'seg-on' : ''}`}>
                  {label}
                </button>
              ))}
            </div>
            {mode === 'story' && sec.readMinutes && <span className="shrink-0 text-cap text-sub">약 {sec.readMinutes}분</span>}
          </div>
        )}
        {locked ? (
          <p className="panel text-center text-ui text-sub">이 부분은 상세 리포트에 들어 있어요.</p>
        ) : (
          <div className="space-y-12">
            {mode === 'story' && sec.story && <StoryView story={sec.story} showEvidence={showEvidence} />}
            {mode === 'cards' &&
              sec.blocks.map((b) => (
                <div key={b.heading}>
                  <h3 className="text-title3 text-ink">{b.heading}</h3>
                  <ul className="mt-2 border-t border-line">
                    {b.items.map((s, i) => (
                      <StatementItem key={i} s={s} showEvidence={showEvidence} />
                    ))}
                  </ul>
                </div>
              ))}
            {sec.timeline && (
              <div>
                <h3 className="mb-5 text-title3 text-ink">{sec.timeline.title}</h3>
                <DivergingBars
                  ariaLabel={sec.timeline.title}
                  data={sec.timeline.items.map((t) => ({
                    key: t.year,
                    label: String(t.year).slice(2),
                    sub: t.verdict.length <= 4 ? t.verdict : t.verdict.slice(0, 4),
                    score: t.score,
                    highlight: t.year === thisYear,
                    tooltip: `${t.year}년 ${t.pillar} · ${t.verdict}${t.notes.length ? '\n' + t.notes.join('\n') : ''}`,
                  }))}
                />
                <ul className="mt-6 border-t border-line">
                  {sec.timeline.items.map((t) => (
                    <li key={t.year} className="grid grid-cols-[4.75rem_1fr] gap-3 border-b border-line py-3.5">
                      <span className={`text-label font-semibold tabular-nums ${t.year === thisYear ? 'text-accent' : 'text-ink'}`}>
                        {t.year} <span className="font-serif text-cap font-normal text-sub">{t.pillar}</span>
                      </span>
                      <div className="min-w-0">
                        <span className={t.tone === 'positive' ? 'tag-pos' : t.tone === 'negative' ? 'tag-neg' : 'tag-mute'}>{t.verdict}</span>
                        <p className="mt-1.5 text-label text-ink-2">{t.notes.length ? <Gloss text={t.notes.join(' · ')} /> : '특별한 신호 없음'}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
      <SectionRating key={sec.id} a={a} section={sec.id} />
    </div>
  );
}

export function ReportView({ a }: { a: SajuAnalysis }) {
  const report = useMemo(() => generateReport(a), [a]);
  const [tab, setTab] = useState<SectionId>('summary');
  const [showEvidence, setShowEvidence] = useState(true);
  const sec = report.sections.find((s) => s.id === tab)!;
  return (
    <section>
      <SectionTitle
        id="report"
        kicker="풀이 리포트"
        title="사실 그대로의 해석"
        desc="좋은 말만 하지 않아요. 이야기로 읽으며 내 삶의 장면과 비교해 보시고, 왜 그렇게 보는지는 문단 아래 ‘근거’에서 확인하세요."
      />
      {report.confidenceNotes.length > 0 && (
        <div className="mb-8 border-l-2 border-line-strong pl-4">
          <p className="text-label font-semibold text-ink">먼저 알아 두세요</p>
          <ul className="mt-1 space-y-1 text-label text-ink-2">
            {report.confidenceNotes.map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
        </div>
      )}
      <div className="tabs" role="tablist" aria-label="풀이 주제">
        {TAB_ORDER.map((id) => {
          const s = report.sections.find((x) => x.id === id)!;
          return (
            <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={`tab ${tab === id ? 'tab-on' : ''}`}>
              {s.title}
            </button>
          );
        })}
      </div>
      <label className="mt-4 flex w-fit cursor-pointer items-center gap-2 text-label text-sub">
        <input type="checkbox" className="size-4 accent-accent" checked={showEvidence} onChange={(e) => setShowEvidence(e.target.checked)} />
        근거 함께 보기
      </label>
      <div className="mt-8">
        <SectionBody a={a} sec={sec} showEvidence={showEvidence} />
      </div>
    </section>
  );
}
