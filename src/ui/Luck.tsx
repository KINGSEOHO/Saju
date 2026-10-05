import { useState } from 'react';
import { BRANCHES, STEMS, fmtKst, pillarHanja, pillarKo, type LuckPillar, type SajuAnalysis } from '../engine/index.ts';
import { DivergingBars, ScorePill } from './Charts.tsx';
import { SectionTitle } from './common.tsx';

function roleLine(l: LuckPillar) {
  return `천간 ${STEMS[l.pillar.stem].hanja} ${l.stemTenGod}(${l.stemRole}) · 지지 ${BRANCHES[l.pillar.branch].hanja} ${l.branchTenGod}(${l.branchRole})`;
}

export function LuckPanel({ a }: { a: SajuAnalysis }) {
  const [tab, setTab] = useState<'daeun' | 'seun' | 'wolun'>('daeun');
  const d = a.daeun;
  const nowYear = new Date(a.now).getUTCFullYear();
  const tabBtn = (id: typeof tab, label: string) => (
    <button
      type="button"
      role="tab"
      aria-selected={tab === id}
      onClick={() => setTab(id)}
      className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${tab === id ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900' : 'text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800'}`}
    >
      {label}
    </button>
  );
  return (
    <section className="card">
      <SectionTitle
        id="luck"
        kicker="대운 · 세운 · 월운"
        title="운의 흐름"
        desc={
          <>
            점수는 들어오는 기운이 용신·희신(＋)인지 기신·구신(－)인지와 원국과의 충·형을 반영한 값입니다(50점 = 중립). 좋은 운에도 할 일은 있고, 나쁜 운에도 피할 방법이 있습니다.
          </>
        }
      />
      <div className="mb-4 flex gap-1" role="tablist">
        {tabBtn('daeun', '대운 (10년)')}
        {tabBtn('seun', '세운 (연도별)')}
        {tabBtn('wolun', '월운 (월별)')}
      </div>

      {tab === 'daeun' && (
        <div>
          <p className="mb-4 text-sm text-stone-700 dark:text-stone-300">
            {d.forward ? '순행' : '역행'} 대운 · {d.basisJie}까지 {d.diffDays.toFixed(2)}일 ÷ 3 ={' '}
            <b>
              만 {d.startAgeYears}세 {d.startAgeMonths}개월
            </b>
            부터 시작 (전통 대운수 {d.daeunsu})
          </p>
          <DivergingBars
            ariaLabel="대운별 점수"
            data={d.list.map((x) => ({
              key: x.pillar.index,
              label: pillarHanja(x.pillar),
              sub: `${Math.floor(x.startAge)}세`,
              score: x.score,
              highlight: a.currentDaeun?.pillar.index === x.pillar.index,
              tooltip: `${x.startYear}~${x.endYear}년 (만 ${Math.floor(x.startAge)}세~)\n${roleLine(x)}${x.flags.length ? '\n' + x.flags.join('\n') : ''}`,
            }))}
          />
          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            {d.list.map((x) => {
              const current = a.currentDaeun?.pillar.index === x.pillar.index;
              return (
                <div key={x.pillar.index} className={`rounded-xl border p-3 ${current ? 'border-stone-900 dark:border-stone-100' : 'border-stone-200 dark:border-stone-800'}`}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-bold">
                      <span className="hanja text-lg">{pillarHanja(x.pillar)}</span> <span className="text-sm text-stone-500">{pillarKo(x.pillar)}</span>
                      {current && <span className="ml-2 chip">현재</span>}
                    </div>
                    <ScorePill score={x.score} />
                  </div>
                  <div className="mt-1 text-xs text-stone-500">
                    만 {Math.floor(x.startAge)}세~ · {x.startYear}~{x.endYear}년 · 12운성 {x.stage}
                  </div>
                  <div className="mt-1 text-sm text-stone-700 dark:text-stone-300">{roleLine(x)}</div>
                  {x.flags.length > 0 && <div className="mt-1 text-xs text-amber-800 dark:text-amber-300">{x.flags.join(' · ')}</div>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === 'seun' && (
        <div>
          <DivergingBars
            ariaLabel="연도별 종합 점수"
            data={a.seun.map((s) => ({
              key: s.year,
              label: pillarHanja(s.pillar),
              sub: String(s.year).slice(2),
              score: s.combined,
              highlight: s.year === nowYear,
              tooltip: `${s.year}년 (만 ${s.age}세)\n세운 ${s.score}점 · 대운 ${s.daeun?.score ?? '-'}점\n${roleLine(s)}${s.flags.length ? '\n' + s.flags.join('\n') : ''}`,
            }))}
          />
          <div className="mt-5 -mx-2 overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="text-left text-xs text-stone-500">
                  <th className="px-2 py-1.5">연도</th>
                  <th className="px-2 py-1.5">세운</th>
                  <th className="px-2 py-1.5">십성</th>
                  <th className="px-2 py-1.5">종합</th>
                  <th className="px-2 py-1.5">원국과의 관계</th>
                </tr>
              </thead>
              <tbody>
                {a.seun.map((s) => (
                  <tr key={s.year} className={`border-t border-stone-100 dark:border-stone-800 ${s.year === nowYear ? 'bg-stone-50 font-semibold dark:bg-stone-800/50' : ''}`}>
                    <td className="px-2 py-2 tabular-nums">
                      {s.year} <span className="text-xs text-stone-500">({s.age}세)</span>
                    </td>
                    <td className="hanja px-2 py-2">{pillarHanja(s.pillar)}</td>
                    <td className="px-2 py-2 text-xs">
                      {s.stemTenGod}/{s.branchTenGod}
                    </td>
                    <td className="px-2 py-2">
                      <ScorePill score={s.combined} />
                    </td>
                    <td className="px-2 py-2 text-xs text-stone-600 dark:text-stone-400">{s.flags.join(' · ') || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'wolun' && (
        <div>
          <p className="mb-3 text-sm text-stone-600 dark:text-stone-400">월은 양력 1일이 아니라 절입일(입춘·경칩…)에 바뀝니다. 날짜는 절입 시각 기준입니다.</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {a.wolun.map((w) => {
              const isNow = a.now >= w.startMs && a.wolun.find((x) => x.startMs > w.startMs && x.startMs <= a.now) === undefined;
              return (
                <div key={w.startMs} className={`rounded-xl border p-3 ${isNow ? 'border-stone-900 dark:border-stone-100' : 'border-stone-200 dark:border-stone-800'}`}>
                  <div className="flex items-center justify-between">
                    <span className="hanja text-lg font-bold">{pillarHanja(w.pillar)}</span>
                    {isNow && <span className="chip">이번 달</span>}
                  </div>
                  <div className="text-xs text-stone-500">
                    {w.jieName} {fmtKst(w.startMs, a.input.timeZone).slice(0, 13)}~
                  </div>
                  <div className="mt-1 text-xs">
                    {w.stemTenGod}/{w.branchTenGod}
                  </div>
                  <div className="mt-1.5">
                    <ScorePill score={w.score} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
