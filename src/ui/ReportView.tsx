import { useMemo, useState } from 'react';
import { BETA_FREE, PREMIUM_SECTIONS } from '../config/plans.ts';
import type { SajuAnalysis } from '../engine/index.ts';
import { generateReport, type ReportSection, type SectionId, type Statement } from '../report/generate.ts';
import { DivergingBars } from './Charts.tsx';
import { TONE_STYLE } from './common.tsx';
import { SectionRating } from './Feedback.tsx';

const TAB_ORDER: SectionId[] = ['summary', 'personality', 'love', 'career', 'wealth', 'health'];

function StatementItem({ s, showEvidence }: { s: Statement; showEvidence: boolean }) {
  const t = TONE_STYLE[s.tone];
  return (
    <li className="flex gap-3 rounded-2xl border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900">
      <span aria-hidden className={`w-1 shrink-0 rounded-full ${t.bar}`} />
      <div className="min-w-0">
        {s.tone !== 'neutral' && <span className={`inline-block rounded-md px-2 py-0.5 text-xs font-bold ${t.pill}`}>{t.label}</span>}
        <p className={`${s.tone !== 'neutral' ? 'mt-1.5' : ''} text-base leading-relaxed text-stone-800 dark:text-stone-200`}>{s.text}</p>
        {showEvidence && s.evidence && <p className="mt-1.5 text-xs text-stone-500 dark:text-stone-400">근거 · {s.evidence}</p>}
      </div>
    </li>
  );
}

function SectionBody({ a, sec, showEvidence }: { a: SajuAnalysis; sec: ReportSection; showEvidence: boolean }) {
  const locked = !BETA_FREE && PREMIUM_SECTIONS.includes(sec.id);
  return (
    <div>
      <div className="mb-6 rounded-2xl bg-brand-50 px-5 py-4 dark:bg-brand-900/40">
        <div className="text-xs font-semibold text-brand-700 dark:text-brand-300">{sec.title} 한 줄 요약</div>
        <div className="mt-1 text-lg leading-snug font-bold text-brand-900 dark:text-brand-50">{sec.headline}</div>
      </div>
      {locked ? (
        <div className="rounded-xl border border-stone-300 p-6 text-center text-sm">이 섹션은 프리미엄 리포트에 포함됩니다.</div>
      ) : (
        <div className="space-y-7">
          {sec.blocks.map((b) => (
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
                    <span className="text-xs leading-relaxed text-stone-600 dark:text-stone-400">{t.notes.join(' · ') || '특이 신호 없음'}</span>
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
          좋은 말만 하지 않습니다. <span className="font-semibold text-sky-800 dark:text-sky-300">＋강점</span>,{' '}
          <span className="font-semibold text-rose-800 dark:text-rose-300">－약점·리스크</span>, <span className="font-semibold text-amber-800 dark:text-amber-300">！주의</span>를 구분하고
          모든 문장에 명식상의 근거를 붙였습니다.
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
