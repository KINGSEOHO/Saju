import { useState, type ReactNode } from 'react';
import { BRANCHES, STEMS, pillarHanja, pillarKo, type LuckPillar, type SajuAnalysis, type Wolun } from '../engine/index.ts';
import { readLuck, type LuckReading } from '../report/luckReading.ts';
import { DivergingBars, ScorePill } from './Charts.tsx';
import { SectionTitle } from './common.tsx';

function roleLine(l: LuckPillar) {
  return `천간 ${STEMS[l.pillar.stem].hanja} ${l.stemTenGod}(${l.stemRole}) · 지지 ${BRANCHES[l.pillar.branch].hanja} ${l.branchTenGod}(${l.branchRole})`;
}

/** 해당 시간대 기준 년·월·일 */
function ymd(ms: number, timeZone: string) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: 'numeric', day: 'numeric' }).formatToParts(new Date(ms)).map((p) => [p.type, p.value]),
  );
  return { y: Number(parts.year), m: Number(parts.month), d: Number(parts.day) };
}

/** 지금 속한 월운과 그 이후 달들 */
export function upcomingMonths(a: SajuAnalysis, count = 12): Wolun[] {
  const idx = a.wolun.reduce((acc, w, i) => (w.startMs <= a.now ? i : acc), 0);
  return a.wolun.slice(idx, idx + count);
}

/** 사주의 달은 절기에 바뀌므로 실제 날짜 범위로 표시 (예: 9월 7일 ~ 10월 7일) */
export function monthLabel(a: SajuAnalysis, w: Wolun) {
  const tz = a.input.timeZone;
  const s = ymd(w.startMs, tz);
  const next = a.wolun[a.wolun.indexOf(w) + 1];
  let end: { m: number; d: number } | null = null;
  if (next) {
    const n = ymd(next.startMs, tz);
    const dt = new Date(Date.UTC(n.y, n.m - 1, n.d - 1));
    end = { m: dt.getUTCMonth() + 1, d: dt.getUTCDate() };
  }
  return {
    title: end ? `${s.m}월 ${s.d}일 ~ ${end.m}월 ${end.d}일` : `${s.m}월 ${s.d}일부터`,
    since: `${s.y}년 ${w.jieName}부터`,
  };
}

/** 다음 달 운으로 바뀌는 시점이 7일 이내면 안내 */
export function upcomingSwitch(a: SajuAnalysis, w: Wolun): { when: string; next: Wolun } | null {
  const next = a.wolun[a.wolun.indexOf(w) + 1];
  if (!next || next.startMs - a.now > 7 * 86400000) return null;
  const t = new Intl.DateTimeFormat('ko-KR', { timeZone: a.input.timeZone, month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(
    new Date(next.startMs),
  );
  return { when: `${t} ${next.jieName}`, next };
}

const TONE_HEAD: Record<LuckReading['tone'], string> = {
  positive: 'text-sky-800 dark:text-sky-300',
  neutral: 'text-stone-900 dark:text-stone-100',
  negative: 'text-rose-800 dark:text-rose-300',
};

function ReadingLists({ r, compact = false }: { r: LuckReading; compact?: boolean }) {
  return (
    <div className={`grid gap-4 ${compact ? '' : 'md:grid-cols-2'}`}>
      <div>
        <div className="text-sm font-bold text-sky-800 dark:text-sky-300">이렇게 하면 좋아요</div>
        <ul className="mt-1.5 space-y-1.5">
          {r.good.map((t, i) => (
            <li key={i} className="flex gap-2 text-[15px] leading-relaxed">
              <span aria-hidden className="mt-0.5 font-bold text-sky-600">
                ✓
              </span>
              <span>{t}</span>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <div className="text-sm font-bold text-rose-800 dark:text-rose-300">이건 조심하세요</div>
        <ul className="mt-1.5 space-y-1.5">
          {r.caution.map((t, i) => (
            <li key={i} className="flex gap-2 text-[15px] leading-relaxed">
              <span aria-hidden className="mt-0.5 font-bold text-rose-600">
                !
              </span>
              <span>{t}</span>
            </li>
          ))}
        </ul>
      </div>
      {r.notes.length > 0 && (
        <div className={compact ? '' : 'md:col-span-2'}>
          <div className="text-sm font-bold text-stone-700 dark:text-stone-300">함께 알아 두세요</div>
          <ul className="mt-1.5 space-y-1.5">
            {r.notes.map((t, i) => (
              <li key={i} className="flex gap-2 text-[15px] leading-relaxed text-stone-700 dark:text-stone-300">
                <span aria-hidden className="mt-0.5 text-stone-400">
                  ·
                </span>
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/** 이번 달·올해처럼 강조해서 보여 주는 풀이 카드 */
export function FeaturedReading({
  label,
  sub,
  pillar,
  score,
  r,
  footer,
}: {
  label: string;
  sub: string;
  pillar: LuckPillar['pillar'];
  score: number;
  r: LuckReading;
  footer?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-brand-200 bg-brand-50/50 p-5 dark:border-brand-800 dark:bg-brand-900/30">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm font-semibold text-brand-700 dark:text-brand-300">
          {label} <span className="font-normal text-stone-500">· {sub}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="hanja text-lg font-bold">{pillarHanja(pillar)}</span>
          <ScorePill score={score} />
        </div>
      </div>
      <h3 className={`mt-2 text-xl leading-snug font-extrabold sm:text-2xl ${TONE_HEAD[r.tone]}`}>{r.headline}</h3>
      <div className="mt-4">
        <ReadingLists r={r} />
      </div>
      <p className="mt-4 text-xs text-stone-500">근거 · {r.evidence}</p>
      {footer}
    </div>
  );
}

/** 다음 달 운으로 곧 바뀔 때 보여 주는 안내 */
export function SwitchNote({ a, w }: { a: SajuAnalysis; w: Wolun }) {
  const sw = upcomingSwitch(a, w);
  if (!sw) return null;
  return (
    <p className="mt-3 rounded-xl bg-white/70 px-3 py-2 text-sm text-stone-700 dark:bg-stone-900/60 dark:text-stone-300">
      <b>곧 바뀌어요</b> · {sw.when}부터는 「{readLuck(a, sw.next, '달').headline}」로 넘어갑니다.
    </p>
  );
}

function MonthCard({ a, w }: { a: SajuAnalysis; w: Wolun }) {
  const r = readLuck(a, w, '달');
  const lbl = monthLabel(a, w);
  return (
    <div className="rounded-2xl border border-stone-200 p-4 dark:border-stone-800">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="font-bold">{lbl.title}</div>
          <div className="text-xs text-stone-500">
            {lbl.since} · <span className="hanja">{pillarHanja(w.pillar)}</span>
          </div>
        </div>
        <ScorePill score={w.score} />
      </div>
      <div className={`mt-2 text-base leading-snug font-bold ${TONE_HEAD[r.tone]}`}>{r.headline}</div>
      <div className="mt-2 space-y-1 text-sm">
        <div className="flex gap-2">
          <span aria-hidden className="font-bold text-sky-600">
            ✓
          </span>
          <span>{r.good[0]}</span>
        </div>
        <div className="flex gap-2">
          <span aria-hidden className="font-bold text-rose-600">
            !
          </span>
          <span>{r.caution[0]}</span>
        </div>
      </div>
      {(r.good.length > 1 || r.caution.length > 1 || r.notes.length > 0) && (
        <details className="group mt-2">
          <summary className="cursor-pointer list-none text-sm font-semibold text-brand-700 dark:text-brand-300 [&::-webkit-details-marker]:hidden">
            <span className="group-open:hidden">자세히 보기 ▾</span>
            <span className="hidden group-open:inline">접기 ▴</span>
          </summary>
          <div className="mt-3 border-t border-stone-100 pt-3 dark:border-stone-800">
            <ReadingLists r={r} compact />
            <p className="mt-3 text-xs text-stone-500">근거 · {r.evidence}</p>
          </div>
        </details>
      )}
    </div>
  );
}

export function LuckPanel({ a }: { a: SajuAnalysis }) {
  const [tab, setTab] = useState<'wolun' | 'seun' | 'daeun'>('wolun');
  const d = a.daeun;
  const nowYear = new Date(a.now).getUTCFullYear();
  const months = upcomingMonths(a);
  const thisMonth = months[0];
  const thisYear = a.seun.find((s) => s.year === a.currentSajuYear);
  const nextYear = a.seun.find((s) => s.year === a.currentSajuYear + 1);
  const tabBtn = (id: typeof tab, label: string) => (
    <button
      type="button"
      role="tab"
      aria-selected={tab === id}
      onClick={() => setTab(id)}
      className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${tab === id ? 'tab-on' : 'tab-off'}`}
    >
      {label}
    </button>
  );
  return (
    <section className="card">
      <SectionTitle
        id="luck"
        kicker="월운 · 세운 · 대운"
        title="운의 흐름"
        desc="들어오는 기운이 이 사주에 도움이 되는지(용신·희신) 부담이 되는지(기신·구신), 원국과 부딪히거나 합하는지를 보고 풀이했습니다. 점수 50점이 보통입니다. 좋은 시기에도 조심할 것이 있고, 힘든 시기에도 할 수 있는 일이 있습니다."
      />
      <div className="mb-5 flex flex-wrap gap-1" role="tablist">
        {tabBtn('wolun', '이번 달 · 월별')}
        {tabBtn('seun', '올해 · 연도별')}
        {tabBtn('daeun', '대운 · 10년')}
      </div>

      {tab === 'wolun' && thisMonth && (
        <div className="space-y-5">
          <FeaturedReading
            label="이번 달 풀이"
            sub={`${monthLabel(a, thisMonth).title} (${monthLabel(a, thisMonth).since})`}
            pillar={thisMonth.pillar}
            score={thisMonth.score}
            r={readLuck(a, thisMonth, '달')}
            footer={<SwitchNote a={a} w={thisMonth} />}
          />
          <div>
            <h3 className="mb-1 text-lg font-bold">앞으로 11개월</h3>
            <p className="mb-3 text-sm text-stone-600 dark:text-stone-400">사주의 달은 양력 1일이 아니라 절기(입춘·경칩 등)가 들어오는 날 바뀝니다. 날짜는 그 기준입니다.</p>
            <div className="grid gap-3 md:grid-cols-2">
              {months.slice(1).map((w) => (
                <MonthCard key={w.startMs} a={a} w={w} />
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'seun' && (
        <div className="space-y-6">
          <div className="grid gap-4 lg:grid-cols-2">
            {thisYear && (
              <FeaturedReading label="올해 풀이" sub={`${thisYear.year}년 · 대운 합산 ${thisYear.combined}점`} pillar={thisYear.pillar} score={thisYear.combined} r={readLuck(a, thisYear, '해', thisYear.combined)} />
            )}
            {nextYear && (
              <FeaturedReading label="내년 풀이" sub={`${nextYear.year}년 · 대운 합산 ${nextYear.combined}점`} pillar={nextYear.pillar} score={nextYear.combined} r={readLuck(a, nextYear, '해', nextYear.combined)} />
            )}
          </div>
          <div>
            <h3 className="mb-3 text-lg font-bold">연도별 흐름</h3>
            <DivergingBars
              ariaLabel="연도별 종합 점수"
              data={a.seun.map((s) => ({
                key: s.year,
                label: pillarHanja(s.pillar),
                sub: String(s.year).slice(2),
                score: s.combined,
                highlight: s.year === nowYear,
                tooltip: `${s.year}년 (만 ${s.age}세)\n${readLuck(a, s, '해', s.combined).headline}\n세운 ${s.score}점 · 대운 ${s.daeun?.score ?? '-'}점`,
              }))}
            />
          </div>
          <div className="-mx-2 overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="text-left text-xs text-stone-500">
                  <th className="px-2 py-1.5">연도</th>
                  <th className="px-2 py-1.5">세운</th>
                  <th className="px-2 py-1.5">한 줄 풀이</th>
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
                    <td className="px-2 py-2">
                      <span className="hanja">{pillarHanja(s.pillar)}</span>
                      <div className="text-[11px] text-stone-500">
                        {s.stemTenGod}/{s.branchTenGod}
                      </div>
                    </td>
                    <td className="px-2 py-2">{readLuck(a, s, '해', s.combined).headline}</td>
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
                <div key={x.pillar.index} className={`rounded-xl border p-3 ${current ? 'border-brand-600 ring-1 ring-brand-600 dark:border-brand-300 dark:ring-brand-300' : 'border-stone-200 dark:border-stone-800'}`}>
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
    </section>
  );
}
