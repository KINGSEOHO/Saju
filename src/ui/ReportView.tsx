import { useMemo, useState } from 'react';
import { BETA_FREE, PREMIUM_SECTIONS } from '../config/plans.ts';
import type { SajuAnalysis } from '../engine/index.ts';
import type { GaeunData, GaeunItem } from '../report/gaeun.ts';
import { generateReport, type ReportSection, type SectionId, type Statement } from '../report/generate.ts';
import type { StoryPara } from '../report/story.ts';
import { DivergingBars } from './Charts.tsx';
import { Gloss, TONE_STYLE } from './common.tsx';
import { SectionRating } from './Feedback.tsx';

const TAB_ORDER: SectionId[] = ['summary', 'gaeun', 'personality', 'love', 'career', 'wealth', 'health'];

function StatementItem({ s, showEvidence }: { s: Statement; showEvidence: boolean }) {
  const t = TONE_STYLE[s.tone];
  return (
    <li className="flex gap-3 rounded-2xl border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900">
      <span aria-hidden className={`w-1 shrink-0 rounded-full ${t.bar}`} />
      <div className="min-w-0">
        {s.tone !== 'neutral' && <span className={`inline-block rounded-md px-2 py-0.5 text-xs font-bold ${t.pill}`}>{t.label}</span>}
        <p className={`${s.tone !== 'neutral' ? 'mt-1.5' : ''} text-base leading-relaxed text-stone-800 dark:text-stone-200`}>
          <Gloss text={s.text} />
        </p>
        {showEvidence && s.evidence && (
          <p className="mt-1.5 text-xs text-stone-500 dark:text-stone-400">
            <Gloss text={`근거 · ${s.evidence}`} />
          </p>
        )}
      </div>
    </li>
  );
}

function StoryView({ story, showEvidence }: { story: StoryPara[]; showEvidence: boolean }) {
  const hasChronicle = story.some((p) => p.when);
  return (
    <article className="mx-auto max-w-2xl">
      {story.map((p, i) => {
        if (!p.when) {
          return (
            <section key={i} className="mb-8">
              <h3 className="mb-2.5 text-lg font-bold text-stone-900 sm:text-xl dark:text-stone-50">{p.title}</h3>
              <p className="text-[17px] leading-[1.95] text-stone-800 dark:text-stone-200">
                <Gloss text={p.text} />
              </p>
              {showEvidence && p.basis && (
                <p className="mt-2 text-xs text-stone-500">
                  <Gloss text={`근거 · ${p.basis}`} />
                </p>
              )}
            </section>
          );
        }
        const first = i === story.findIndex((x) => x.when);
        return (
          <section key={i} className="relative pb-7 pl-7">
            {first && hasChronicle && <h3 className="-ml-7 mb-4 text-lg font-bold sm:text-xl">인생 연대기</h3>}
            <span aria-hidden className="absolute top-1 bottom-0 left-[7px] w-px bg-stone-200 dark:bg-stone-700" />
            <span
              aria-hidden
              className={`absolute top-1.5 left-0 size-[15px] rounded-full border-2 ${
                p.when === 'now'
                  ? 'border-brand-700 bg-brand-700 dark:border-brand-300 dark:bg-brand-300'
                  : p.when === 'past'
                    ? 'border-stone-300 bg-stone-100 dark:border-stone-600 dark:bg-stone-800'
                    : 'border-brand-300 bg-white dark:border-brand-500 dark:bg-stone-900'
              }`}
            />
            <div className="flex flex-wrap items-center gap-2">
              <h4 className={`text-base font-bold ${p.when === 'past' ? 'text-stone-600 dark:text-stone-400' : 'text-stone-900 dark:text-stone-50'}`}>{p.title}</h4>
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                  p.when === 'now'
                    ? 'bg-brand-700 text-white dark:bg-brand-300 dark:text-brand-900'
                    : p.when === 'past'
                      ? 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400'
                      : 'bg-brand-50 text-brand-700 dark:bg-brand-900/50 dark:text-brand-200'
                }`}
              >
                {p.when === 'now' ? '지금' : p.when === 'past' ? '지나온 시간' : '다가올 시간'}
              </span>
            </div>
            <p className={`mt-1.5 text-[16px] leading-[1.9] ${p.when === 'past' ? 'text-stone-600 dark:text-stone-400' : 'text-stone-800 dark:text-stone-200'}`}>
              <Gloss text={p.text} />
            </p>
            {showEvidence && p.basis && (
              <p className="mt-1.5 text-xs text-stone-500">
                <Gloss text={`근거 · ${p.basis}`} />
              </p>
            )}
          </section>
        );
      })}
    </article>
  );
}

function GaeunColumn({ title, mark, tone, items, showEvidence }: { title: string; mark: string; tone: 'good' | 'bad'; items: GaeunItem[]; showEvidence: boolean }) {
  const good = tone === 'good';
  return (
    <div className={`rounded-2xl border p-4 ${good ? 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-900 dark:bg-emerald-950/20' : 'border-rose-200 bg-rose-50/50 dark:border-rose-900 dark:bg-rose-950/20'}`}>
      <h3 className={`flex items-center gap-2 text-lg font-extrabold ${good ? 'text-emerald-800 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'}`}>
        <span aria-hidden className={`flex size-7 items-center justify-center rounded-full text-sm text-white ${good ? 'bg-emerald-600' : 'bg-rose-500'}`}>
          {mark}
        </span>
        {title}
      </h3>
      <ul className="mt-3 space-y-3">
        {items.map((it) => (
          <li key={it.key} className="flex gap-3">
            <span aria-hidden className={`hanja flex size-9 shrink-0 items-center justify-center rounded-xl text-lg ${good ? 'bg-white text-emerald-700 dark:bg-stone-900 dark:text-emerald-300' : 'bg-white text-rose-600 dark:bg-stone-900 dark:text-rose-300'}`}>
              {it.icon}
            </span>
            <div className="min-w-0">
              <div className="text-xs font-bold text-stone-500 dark:text-stone-400">{it.label}</div>
              <p className="text-[15px] leading-relaxed text-stone-800 dark:text-stone-200">
                <Gloss text={it.value} />
              </p>
              {it.swatch && (
                <div className="mt-1.5 flex gap-1.5" aria-hidden>
                  {it.swatch.map((c) => (
                    <span key={c} className="size-5 rounded-full border border-black/10 dark:border-white/20" style={{ background: c }} />
                  ))}
                </div>
              )}
              {showEvidence && (
                <p className="mt-0.5 text-xs text-stone-500">
                  <Gloss text={`근거 · ${it.basis}`} />
                </p>
              )}
            </div>
          </li>
        ))}
      </ul>
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
  const YEAR_CLS = { good: 'border-emerald-300 bg-emerald-50/60 dark:border-emerald-800 dark:bg-emerald-950/20', neutral: 'border-stone-200 bg-stone-50 dark:border-stone-700 dark:bg-stone-800/40', bad: 'border-amber-300 bg-amber-50/60 dark:border-amber-800 dark:bg-amber-950/20' };
  return (
    <div className="mb-8 space-y-5">
      <p className="text-[15px] leading-relaxed text-stone-700 dark:text-stone-300">
        <Gloss text={g.why} />
      </p>
      <div className="grid gap-3 md:grid-cols-2">
        <GaeunColumn title="가까이할 것" mark="○" tone="good" items={g.close} showEvidence={showEvidence} />
        <GaeunColumn title="멀리할 것" mark="✕" tone="bad" items={g.away} showEvidence={showEvidence} />
      </div>
      {g.year && (
        <div className={`rounded-2xl border p-4 ${YEAR_CLS[g.year.tone]}`}>
          <div className="font-bold">{g.year.title}</div>
          <p className="mt-1 text-[15px] leading-relaxed">
            <Gloss text={g.year.text} />
          </p>
          {showEvidence && (
            <p className="mt-1 text-xs text-stone-500">
              <Gloss text={`근거 · ${g.year.basis}`} />
            </p>
          )}
        </div>
      )}
      <div className="rounded-2xl border border-brand-200 p-4 dark:border-brand-800">
        <div className="flex items-baseline justify-between gap-2">
          <div className="font-bold">오늘부터 하는 개운 루틴</div>
          <span className="text-xs text-stone-500">
            오늘 {done.length}/{g.routine.length}
          </span>
        </div>
        <ul className="mt-2 space-y-1.5">
          {g.routine.map((r, i) => (
            <li key={r.text}>
              <label className="flex cursor-pointer items-start gap-2.5 text-[15px] leading-relaxed">
                <input type="checkbox" className="mt-1 size-4 accent-emerald-600" checked={done.includes(i)} onChange={() => toggle(i)} />
                <span className={done.includes(i) ? 'text-stone-400 line-through' : ''}>
                  {r.text}
                  {showEvidence && <span className="ml-1 text-xs text-stone-500">({r.basis})</span>}
                </span>
              </label>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-stone-500">체크는 이 기기에만 저장돼요. 3주만 이어 가 보세요.</p>
      </div>
    </div>
  );
}

function SectionBody({ a, sec, showEvidence }: { a: SajuAnalysis; sec: ReportSection; showEvidence: boolean }) {
  const locked = !BETA_FREE && PREMIUM_SECTIONS.includes(sec.id);
  const [mode, setMode] = useState<'story' | 'cards'>('story');
  return (
    <div>
      <div className="mb-5 rounded-2xl bg-brand-50 px-5 py-4 dark:bg-brand-900/40">
        <div className="text-xs font-semibold text-brand-700 dark:text-brand-300">{sec.title} 한 줄 요약</div>
        <div className="mt-1 text-lg leading-snug font-bold text-brand-900 dark:text-brand-50">
          <Gloss text={sec.headline} />
        </div>
      </div>
      {!locked && sec.gaeun && <GaeunBoard g={sec.gaeun} showEvidence={showEvidence} />}
      {!locked && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
          <div className="inline-flex rounded-xl border border-stone-200 p-1 dark:border-stone-700" role="tablist" aria-label="보기 방식">
            {(
              [
                ['story', '이야기로 읽기'],
                ['cards', '핵심 카드로 보기'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={mode === id}
                onClick={() => setMode(id)}
                className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${mode === id ? 'tab-on' : 'tab-off'}`}
              >
                {label}
              </button>
            ))}
          </div>
          {mode === 'story' && sec.readMinutes && <span className="text-xs text-stone-500">읽는 데 약 {sec.readMinutes}분</span>}
        </div>
      )}
      {locked ? (
        <div className="rounded-xl border border-stone-300 p-6 text-center text-sm">이 섹션은 프리미엄 리포트에 포함됩니다.</div>
      ) : (
        <div className="space-y-7">
          {mode === 'story' && sec.story && <StoryView story={sec.story} showEvidence={showEvidence} />}
          {mode === 'cards' &&
            sec.blocks.map((b) => (
              <div key={b.heading}>
                <h3 className="mb-3 text-lg font-bold">{b.heading}</h3>
                <ul className="space-y-2">
                  {b.items.map((s, i) => (
                    <StatementItem key={i} s={s} showEvidence={showEvidence} />
                  ))}
                </ul>
              </div>
            ))}
          {sec.timeline && (
            <div>
              <h3 className="mb-3 text-lg font-bold">{sec.timeline.title}</h3>
              <DivergingBars
                ariaLabel={sec.timeline.title}
                data={sec.timeline.items.map((t) => ({
                  key: t.year,
                  label: String(t.year).slice(2),
                  sub: t.verdict.length <= 4 ? t.verdict : t.verdict.slice(0, 4),
                  score: t.score,
                  highlight: t.year === new Date(a.now).getUTCFullYear(),
                  tooltip: `${t.year}년 ${t.pillar} · ${t.verdict}${t.notes.length ? '\n' + t.notes.join('\n') : ''}`,
                }))}
              />
              <ul className="mt-4 divide-y divide-stone-100 text-sm dark:divide-stone-800">
                {sec.timeline.items.map((t) => (
                  <li key={t.year} className="grid grid-cols-[4.5rem_5.5rem_1fr] items-start gap-2 py-2">
                    <span className="tabular-nums font-semibold">
                      {t.year} <span className="hanja text-xs font-normal text-stone-500">{t.pillar}</span>
                    </span>
                    <span
                      className={`justify-self-start rounded-full px-2 py-0.5 text-xs font-bold ${
                        t.tone === 'positive'
                          ? 'bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-100'
                          : t.tone === 'negative'
                            ? 'bg-rose-100 text-rose-900 dark:bg-rose-950 dark:text-rose-100'
                            : 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300'
                      }`}
                    >
                      {t.verdict}
                    </span>
                    <span className="text-xs leading-relaxed text-stone-600 dark:text-stone-400">{t.notes.length ? <Gloss text={t.notes.join(' · ')} /> : '특이 신호 없음'}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
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
    <section className="card">
      <div id="report" className="scroll-mt-24">
        <div className="text-xs font-semibold tracking-wider text-stone-500 uppercase">리포트</div>
        <h2 className="mt-1 text-xl font-bold sm:text-2xl">사실 그대로의 해석</h2>
        <p className="mt-1.5 text-sm text-stone-600 dark:text-stone-400">
          좋은 말만 하지 않습니다. 이야기로 읽으며 내 삶의 장면과 비교해 보시고, 근거가 궁금하면 문단 아래 “근거”나 <b>핵심 카드</b>(＋강점 · －약점·리스크 · ！주의)로 확인하세요.
        </p>
      </div>
      {report.confidenceNotes.length > 0 && (
        <div className="mt-4 rounded-xl bg-amber-50 p-3 text-xs leading-relaxed text-amber-950 dark:bg-amber-950/40 dark:text-amber-100">
          <b>신뢰도 안내</b>
          <ul className="mt-1 list-disc space-y-0.5 pl-4">
            {report.confidenceNotes.map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
        </div>
      )}
      <div className="mt-5 border-b border-stone-200 pb-2 dark:border-stone-800">
        <div className="flex items-center gap-1 overflow-x-auto" role="tablist">
          {TAB_ORDER.map((id) => {
            const s = report.sections.find((x) => x.id === id)!;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                onClick={() => setTab(id)}
                className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-semibold ${
                  tab === id ? 'tab-on' : 'tab-off'
                }`}
              >
                {s.title}
                {id === 'gaeun' && <span className="ml-1 align-middle text-[9px] font-bold text-amber-600 dark:text-amber-400">NEW</span>}
                {BETA_FREE && PREMIUM_SECTIONS.includes(id) && <span className="ml-1 align-middle text-[9px] font-bold text-emerald-600 dark:text-emerald-400">β무료</span>}
              </button>
            );
          })}
          <label className="ml-auto flex shrink-0 items-center gap-1.5 pl-3 text-xs text-stone-500">
            <input type="checkbox" checked={showEvidence} onChange={(e) => setShowEvidence(e.target.checked)} /> 근거 보기
          </label>
        </div>
      </div>
      <div className="mt-5">
        <SectionBody a={a} sec={sec} showEvidence={showEvidence} />
      </div>
    </section>
  );
}
