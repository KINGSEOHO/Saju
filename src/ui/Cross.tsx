/** 교차 검증 · MBTI × 사주 · 직업 × 운 탭 */
import { useState, type ReactNode } from 'react';
import { ELEMENT_HANJA, ELEMENT_KO, type BirthInput, type SajuAnalysis } from '../engine/index.ts';
import { encodeInput } from '../lib/share.ts';
import { SYSTEM_LABEL, type CrossReport, type ThemeResult } from '../report/cross.ts';
import { JOB_SUGGEST } from '../report/job.ts';
import { AXES, AXIS_INFO, MBTI_LIST, MBTI_PROFILE, sajuAxes } from '../report/mbti.ts';
import { IdentityCardView } from './IdentityCard.tsx';
import { JobPicker } from './JobPicker.tsx';
import { SectionTitle } from './common.tsx';

function setExtras(input: BirthInput, patch: Partial<Pick<BirthInput, 'mbti' | 'job'>>) {
  window.location.hash = `/r?${encodeInput({ ...input, ...patch })}`;
}

/** 결과 화면에서 MBTI·직업 넣기 */
export function ExtrasForm({ input, focus }: { input: BirthInput; focus?: 'mbti' | 'job' }) {
  const [mbti, setMbti] = useState(input.mbti ?? '');
  const [job, setJob] = useState(input.job ?? '');
  return (
    <form
      className="grid gap-3 sm:grid-cols-[1fr_1.4fr_auto] sm:items-end"
      onSubmit={(e) => {
        e.preventDefault();
        setExtras(input, { mbti: mbti || undefined, job: job.trim().slice(0, 30) || undefined });
      }}
    >
      <label className="block">
        <span className="mb-1 block text-sm font-semibold">MBTI</span>
        <select className="field" value={mbti} onChange={(e) => setMbti(e.target.value)} autoFocus={focus === 'mbti'}>
          <option value="">모름 / 입력 안 함</option>
          {MBTI_LIST.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </label>
      <JobPicker value={job} onChange={setJob} onPick={(j) => setExtras(input, { mbti: mbti || undefined, job: j })} autoFocus={focus === 'job'} />
      <button type="submit" className="btn-primary">
        반영하기
      </button>
    </form>
  );
}

function Bar({ value, tone = 'amber' }: { value: number; tone?: 'amber' | 'brand' }) {
  return (
    <div className="h-2 flex-1 overflow-hidden rounded-full bg-stone-200 dark:bg-stone-700">
      <div className={`h-full rounded-full ${tone === 'amber' ? 'bg-amber-400' : 'bg-brand-500'}`} style={{ width: `${Math.round(value)}%` }} />
    </div>
  );
}

function ThemeCard({ t }: { t: ThemeResult }) {
  const pct = Math.round(t.ratio * 100);
  return (
    <article className="rounded-2xl border border-stone-200 p-4 sm:p-5 dark:border-stone-800">
      <div className={`rounded-xl border-l-4 px-4 py-3 ${t.challenge ? 'border-rose-400 bg-rose-50/70 dark:bg-rose-950/30' : 'border-amber-400 bg-amber-50/70 dark:bg-amber-950/20'}`}>
        <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${t.challenge ? 'bg-rose-500 text-white' : 'bg-amber-400 text-amber-950'}`}>
          {t.agree}/{t.total} 일치
        </span>
        <h4 className="mt-2 text-[17px] font-bold">
          {t.challenge && <span aria-hidden>⚠ </span>}
          {t.title}
        </h4>
        <div className="mt-2 flex items-center gap-3">
          <Bar value={pct} />
          <span className="shrink-0 text-xs font-semibold text-stone-600 dark:text-stone-300">{pct}% 일치</span>
        </div>
      </div>
      <p className="mt-3 text-[15px] leading-relaxed text-stone-800 dark:text-stone-200">{t.text}</p>
      <details className="group mt-3">
        <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 rounded-lg border border-stone-300 px-3 py-1.5 text-sm font-semibold text-stone-700 dark:border-stone-700 dark:text-stone-300 [&::-webkit-details-marker]:hidden">
          <span aria-hidden className="transition group-open:rotate-90">
            ▶
          </span>
          {t.total}개 체계별 근거 보기
        </summary>
        <ul className="mt-2 space-y-1.5 text-sm">
          {t.evidence.map((e) => (
            <li key={e.system} className="flex gap-2">
              <span aria-hidden className={e.agree ? 'font-bold text-emerald-600' : 'text-stone-400'}>
                {e.agree ? '✓' : '✗'}
              </span>
              <span>
                <b>{SYSTEM_LABEL[e.system]}</b> <span className="text-stone-600 dark:text-stone-400">— {e.text}</span>
              </span>
            </li>
          ))}
        </ul>
      </details>
    </article>
  );
}

const TONE_CLS = {
  good: 'border-emerald-300 bg-emerald-50/70 dark:border-emerald-800 dark:bg-emerald-950/30',
  neutral: 'border-stone-200 bg-stone-50 dark:border-stone-700 dark:bg-stone-800/40',
  bad: 'border-rose-300 bg-rose-50/70 dark:border-rose-800 dark:bg-rose-950/30',
};

/** 띠로 본 나 — 성향, 올해·내년과의 관계, 잘 맞는 띠 */
function TtiCard({ x }: { x: CrossReport }) {
  const t = x.tti;
  return (
    <div className="rounded-2xl border border-rose-200 p-4 sm:p-5 dark:border-rose-900/60">
      <div className="flex items-baseline gap-2">
        <span aria-hidden className="hanja text-2xl text-rose-500">
          {t.hanja}
        </span>
        <h3 className="text-lg font-bold">
          띠로 본 나 — {t.name} <span className="text-stone-500 dark:text-stone-400">· {t.nick}</span>
        </h3>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {t.keywords.map((k) => (
          <span key={k} className="chip">
            #{k}
          </span>
        ))}
      </div>
      <p className="mt-3 text-[15px] leading-relaxed">
        <b>강점</b> · {t.good}
        <br />
        <b>그림자</b> · {t.shadow}
      </p>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {[t.thisYear, t.nextYear].map((y) => (
          <div key={y.year} className={`rounded-xl border p-3 ${TONE_CLS[y.tone]}`}>
            <div className="text-xs font-semibold text-stone-500">
              {y.year}년 · {y.animal} 해
            </div>
            <div className="mt-0.5 font-bold">{y.line}</div>
            <p className="mt-1 text-sm leading-relaxed text-stone-700 dark:text-stone-300">{y.text}</p>
          </div>
        ))}
      </div>
      <p className="mt-3 text-sm">
        <b className="text-emerald-700 dark:text-emerald-400">잘 맞는 띠</b> {t.best.join(' · ')}
        <span className="mx-2 text-stone-300">|</span>
        <b className="text-rose-600 dark:text-rose-400">부딪히기 쉬운 띠</b> {t.caution.join(' · ')}
      </p>
      <p className="mt-2 text-xs leading-relaxed text-stone-500">
        띠 성향과 삼재는 민간에서 전해 오는 해석이라 교차 검증에서 한 체계로만 셉니다.{t.lunarNote ? ` ${t.lunarNote}` : ''}
      </p>
    </div>
  );
}

export function CrossPanel({ a, x }: { a: SajuAnalysis; x: CrossReport }) {
  const title = a.input.name ? `${a.input.name}님의 명경 카드` : '나의 명경 카드';
  const missing = [!x.mbti && 'MBTI', !x.job && '직업'].filter(Boolean) as string[];
  return (
    <section className="card space-y-8">
      <SectionTitle
        kicker="사주 · 운 · 띠 · MBTI · 직업"
        title="교차 검증"
        desc="한 가지 체계만 보면 우연일 수 있지만, 여러 체계가 같은 방향을 가리키면 그 특성은 더 확실합니다. 체계마다 따로 판정하고, 일치한 개수를 그대로 보여 드려요."
      />
      <IdentityCardView card={x.card} title={title} />

      {missing.length > 0 && (
        <div className="no-print rounded-2xl border border-dashed border-brand-300 bg-brand-50/50 p-4 dark:border-brand-700 dark:bg-brand-900/20">
          <p className="text-sm font-semibold">{missing.join('·')}을 넣으면 교차 검증이 더 정확해져요.</p>
          <p className="mt-0.5 text-xs text-stone-500">지금은 사주 원국·대운·띠 세 체계로 비교했어요. 입력값은 서버로 보내지 않습니다.</p>
          <div className="mt-3">
            <ExtrasForm input={a.input} />
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-amber-300/60 bg-amber-50/50 p-4 sm:p-5 dark:border-amber-800/60 dark:bg-amber-950/20">
        <div className="font-bold">⬡ 교차 검증 리포트</div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {x.systems.map((s) => (
            <span key={s} className="chip">
              {SYSTEM_LABEL[s]}
            </span>
          ))}
        </div>
        <p className="mt-2 text-xs text-stone-500">{x.systems.length}개 체계에서 공통으로 확인된 포인트입니다.</p>
      </div>

      <div>
        <h3 className="text-lg font-bold text-amber-700 dark:text-amber-300">한눈에 보기</h3>
        <ul className="mt-2 space-y-1.5 text-[15px]">
          {x.glance.map((g) => (
            <li key={g}>· {g}</li>
          ))}
        </ul>
      </div>

      <div>
        <h3 className="text-lg font-bold text-amber-700 dark:text-amber-300">종합 요약</h3>
        <p className="mt-2 text-[15px] leading-relaxed text-stone-800 dark:text-stone-200">{x.summary}</p>
      </div>

      <TtiCard x={x} />

      <div>
        <h3 className="text-lg font-bold text-amber-700 dark:text-amber-300">상세 교차 포인트</h3>
        <div className="mt-3 space-y-4">
          {x.themes.map((t) => (
            <ThemeCard key={t.id} t={t} />
          ))}
        </div>
      </div>
      <p className="text-xs leading-relaxed text-stone-500">
        교차 검증은 각 체계의 판정 기준(사주: 십성·오행 비율, 운: 지금의 대운·세운, MBTI: 입력한 유형, 직업: 분야의 특성)을 미리 정해 두고 기계적으로 비교한 결과입니다. 한 체계만으로 결론
        내리지 않도록 돕는 도구이며, 점수가 낮다고 틀린 것은 아닙니다.
      </p>
    </section>
  );
}

// ---------------------------------------------------------------------------
// MBTI × 사주
// ---------------------------------------------------------------------------
const VERDICT_STYLE = {
  agree: { label: '일치', cls: 'bg-emerald-600 text-white' },
  neutral: { label: '반반', cls: 'bg-stone-400 text-white dark:bg-stone-600' },
  differ: { label: '겉과 속', cls: 'bg-violet-600 text-white' },
};

function AxisScale({ axis, score, user }: { axis: (typeof AXES)[number]; score: number; user?: string }) {
  const info = AXIS_INFO[axis];
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className={`w-14 shrink-0 text-right font-bold ${user === info.a ? 'text-brand-700 dark:text-brand-300' : 'text-stone-500'}`}>
        {info.a} {info.aKo}
      </span>
      <div className="relative h-3 flex-1 rounded-full bg-gradient-to-r from-sky-200 via-stone-200 to-violet-200 dark:from-sky-900 dark:via-stone-700 dark:to-violet-900">
        <div className="absolute top-1/2 h-5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-stone-900 dark:bg-white" style={{ left: `${score}%` }} title={`사주 경향 ${score}`} />
        <div className="absolute top-0 left-[42%] h-3 w-[16%] rounded-full bg-white/50 dark:bg-white/10" aria-hidden />
      </div>
      <span className={`w-14 shrink-0 font-bold ${user === info.b ? 'text-brand-700 dark:text-brand-300' : 'text-stone-500'}`}>
        {info.bKo} {info.b}
      </span>
    </div>
  );
}

export function MbtiPanel({ a, x }: { a: SajuAnalysis; x: CrossReport }) {
  const m = x.mbti;
  const axes = sajuAxes(a);
  if (!m) {
    const st = AXES.map((k) => axes[k].lean ?? '·').join('');
    return (
      <section className="card space-y-6">
        <SectionTitle kicker="MBTI × 사주" title="내 MBTI를 골라 주세요" desc="MBTI와 사주를 네 가지 축(에너지·인식·판단·생활 방식)으로 비교해, 같은 점과 다른 점(겉과 속), 살릴 강점과 보완할 약점, 개운법을 알려 드려요." />
        <div className="grid grid-cols-4 gap-2">
          {MBTI_LIST.map((t) => (
            <button key={t} type="button" onClick={() => setExtras(a.input, { mbti: t })} className="rounded-xl border border-stone-300 px-1 py-3 text-center hover:border-brand-500 hover:bg-brand-50 dark:border-stone-700 dark:hover:bg-brand-900/30">
              <div className="font-bold tracking-wide">{t}</div>
              <div className="mt-0.5 text-[11px] text-stone-500">{MBTI_PROFILE[t].nick}</div>
            </button>
          ))}
        </div>
        <div className="rounded-2xl bg-stone-50 p-4 dark:bg-stone-800/50">
          <div className="text-sm font-bold">MBTI를 모른다면: 사주로만 본 경향</div>
          <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">
            사주 구조로 계산한 네 가지 축의 기울기입니다. 가운데에 가까운 축은 어느 쪽도 뚜렷하지 않다는 뜻이에요. 사주로 본 경향: <b className="tracking-widest">{st}</b>
          </p>
          <div className="mt-3 space-y-3">
            {AXES.map((k) => (
              <AxisScale key={k} axis={k} score={axes[k].score} />
            ))}
          </div>
        </div>
      </section>
    );
  }
  const g = m.gaeun;
  return (
    <section className="card space-y-8">
      <SectionTitle kicker="MBTI × 사주" title={`${m.type} · ${m.profile.nick}`} desc={m.profile.one} />
      <div className="rounded-2xl bg-brand-50/70 p-4 sm:p-5 dark:bg-brand-900/30">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-amber-400 px-2.5 py-0.5 text-xs font-bold text-amber-950">{m.agree}/4 일치</span>
          {m.differ > 0 && <span className="rounded-full bg-violet-600 px-2.5 py-0.5 text-xs font-bold text-white">겉과 속이 다른 축 {m.differ}개</span>}
          <span className="text-xs text-stone-500">사주로 본 경향 {m.sajuType.replaceAll('x', '·')}</span>
        </div>
        <p className="mt-2 text-[15px] leading-relaxed">{m.summary}</p>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-bold">네 가지 축으로 비교</h3>
        {m.axes.map((ax) => (
          <article key={ax.axis} className="rounded-2xl border border-stone-200 p-4 dark:border-stone-800">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-stone-500">{ax.info.name}</span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${VERDICT_STYLE[ax.verdict].cls}`}>{VERDICT_STYLE[ax.verdict].label}</span>
            </div>
            <h4 className="mt-1 font-bold">{ax.title}</h4>
            <div className="mt-3">
              <AxisScale axis={ax.axis} score={ax.saju.score} user={ax.user} />
              <p className="mt-1 text-center text-[11px] text-stone-500">막대 위 표시가 사주로 계산한 위치 · 진하게 표시된 글자가 내 MBTI</p>
            </div>
            <p className="mt-3 text-[15px] leading-relaxed text-stone-800 dark:text-stone-200">{ax.text}</p>
            {ax.saju.basis.length > 0 && <p className="mt-2 text-xs text-stone-500">사주 근거: {ax.saju.basis.join(' · ')}</p>}
          </article>
        ))}
      </div>

      <div className="rounded-2xl border border-stone-200 p-4 dark:border-stone-800">
        <h3 className="font-bold">핵심 엔진 비교</h3>
        <p className="mt-2 text-[15px] leading-relaxed">{m.engine.text}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <InsightList title="살릴 수 있는 강점" tone="good" items={m.strengths} />
        <InsightList title="보완할 약점" tone="bad" items={m.weaknesses} />
      </div>

      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 sm:p-5 dark:border-emerald-900 dark:bg-emerald-950/20">
        <h3 className="font-bold text-emerald-900 dark:text-emerald-200">
          개운법 — 필요한 기운 {ELEMENT_KO[g.element]}({ELEMENT_HANJA[g.element]}) 채우기
        </h3>
        <ul className="mt-3 space-y-2 text-[15px]">
          {g.habits.map((h) => (
            <li key={h} className="flex gap-2">
              <span aria-hidden className="text-emerald-600">
                ✓
              </span>
              <span>{h}</span>
            </li>
          ))}
          <li className="flex gap-2">
            <span aria-hidden className="text-rose-600">
              ✕
            </span>
            <span>{g.avoid}</span>
          </li>
        </ul>
        <dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {g.items.map((it) => (
            <div key={it.label} className="rounded-xl bg-white/80 px-3 py-2 dark:bg-stone-900/60">
              <dt className="text-xs text-stone-500">{it.label}</dt>
              <dd className="text-sm font-semibold">{it.value}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-xs text-stone-500">색·방향·숫자는 전통적으로 쓰이는 상징이며 효과가 검증된 것은 아닙니다. 실제로 도움이 되는 것은 위의 생활 습관입니다.</p>
      </div>
      <div className="no-print rounded-2xl bg-stone-50 p-4 dark:bg-stone-800/50">
        <div className="mb-2 text-sm font-semibold">MBTI나 직업이 바뀌었나요?</div>
        <ExtrasForm input={a.input} />
      </div>
    </section>
  );
}

function InsightList({ title, tone, items }: { title: string; tone: 'good' | 'bad'; items: { title: string; text: string; basis: string }[] }) {
  return (
    <div className={`rounded-2xl border p-4 ${tone === 'good' ? 'border-sky-200 bg-sky-50/60 dark:border-sky-900 dark:bg-sky-950/30' : 'border-rose-200 bg-rose-50/60 dark:border-rose-900 dark:bg-rose-950/30'}`}>
      <h3 className={`font-bold ${tone === 'good' ? 'text-sky-900 dark:text-sky-200' : 'text-rose-900 dark:text-rose-200'}`}>{title}</h3>
      <ol className="mt-3 space-y-3">
        {items.map((it, i) => (
          <li key={it.title}>
            <div className="font-semibold">
              {i + 1}. {it.title}
            </div>
            <p className="mt-0.5 text-sm leading-relaxed text-stone-700 dark:text-stone-300">{it.text}</p>
            <p className="mt-0.5 text-xs text-stone-500">근거: {it.basis}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 직업 × 사주 × 운
// ---------------------------------------------------------------------------
function YearChips({ years, cls }: { years: number[]; cls: string }) {
  return (
    <>
      {years.map((y) => (
        <span key={y} className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${cls}`}>
          {y}
        </span>
      ))}
    </>
  );
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h3 className="text-lg font-bold">{title}</h3>
      <div className="mt-2">{children}</div>
    </div>
  );
}

export function JobPanel({ a, x }: { a: SajuAnalysis; x: CrossReport }) {
  const j = x.job;
  if (!j) {
    return (
      <section className="card space-y-5">
        <SectionTitle kicker="직업 × 사주 × 운" title="지금 하는 일을 알려 주세요" desc="직업을 넣으면 사주와의 궁합, 살릴 강점, 그리고 지금의 대운·올해 운에서 무엇을 가장 먼저 준비해야 하는지 알려 드려요. 학생·취업 준비생·주부도 넣을 수 있어요." />
        <ExtrasForm input={a.input} focus="job" />
        <div className="flex flex-wrap gap-1.5">
          {JOB_SUGGEST.map((s) => (
            <button key={s} type="button" className="chip hover:border-brand-500" onClick={() => setExtras(a.input, { job: s })}>
              {s}
            </button>
          ))}
        </div>
      </section>
    );
  }
  return (
    <section className="card space-y-8">
      <SectionTitle kicker="직업 × 사주 × 운" title={`${j.input} · ${j.category.id === 'other' || j.category.id === 'freelance' ? '내 일' : j.category.label}`} desc="이 일이 요구하는 힘을 사주와 비교하고, 지금의 운에서 무엇을 먼저 준비해야 하는지 정리했어요." />
      <div className="rounded-2xl bg-gradient-to-br from-brand-800 to-brand-900 p-5 text-white">
        <div className="text-xs font-semibold tracking-wider text-brand-200">지금 가장 먼저 할 일</div>
        <p className="mt-1.5 text-lg leading-snug font-extrabold sm:text-xl">{j.headline}</p>
      </div>

      {j.fit && (
        <Block title="사주와 이 일의 궁합">
          <div className="flex items-center gap-3">
            <span className="text-3xl font-extrabold">{j.fit.score}</span>
            <span className="rounded-full bg-amber-400 px-2.5 py-0.5 text-xs font-bold text-amber-950">{j.fit.label}</span>
            <Bar value={j.fit.score} tone="brand" />
          </div>
          <p className="mt-3 text-[15px] leading-relaxed">{j.fit.text}</p>
          <p className="mt-1 text-xs text-stone-500">근거: {j.fit.basis}</p>
          <p className="mt-1 text-xs text-stone-500">적합도는 사주 구조와 이 일이 쓰는 힘의 겹침일 뿐, 실제 성과는 경험·노력·환경이 더 크게 좌우합니다.</p>
        </Block>
      )}

      <Block title="지금의 운">
        <div className="rounded-2xl border border-stone-200 p-4 dark:border-stone-800">
          <div className="font-bold">{j.now.title}</div>
          <p className="mt-1.5 text-[15px] leading-relaxed">{j.now.text}</p>
          <p className="mt-1 text-xs text-stone-500">근거: {j.now.basis}</p>
        </div>
      </Block>

      <Block title="지금 준비할 것">
        <ol className="space-y-3">
          {j.prepare.map((p, i) => (
            <li key={p.title} className="flex gap-3 rounded-2xl border border-stone-200 p-4 dark:border-stone-800">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-700 text-sm font-bold text-white dark:bg-brand-300 dark:text-brand-900">{i + 1}</span>
              <div>
                <div className="font-bold">{p.title}</div>
                <p className="mt-0.5 text-[15px] leading-relaxed text-stone-700 dark:text-stone-300">{p.text}</p>
                <p className="mt-0.5 text-xs text-stone-500">근거: {p.basis}</p>
              </div>
            </li>
          ))}
        </ol>
      </Block>

      <div className="grid gap-4 md:grid-cols-2">
        <InsightList title="이 일에서 살릴 강점" tone="good" items={j.strengths} />
        {j.cautions.length > 0 && <InsightList title="이 일에서 조심할 점" tone="bad" items={j.cautions} />}
      </div>

      <Block title="움직이기 좋은 해 · 버틸 해">
        <div className="flex flex-wrap items-center gap-1.5 text-sm">
          {j.timing.good.length > 0 && <span className="mr-1 text-stone-500">이직·전환</span>}
          <YearChips years={j.timing.good} cls="bg-sky-600 text-white" />
          {j.timing.promote.length > 0 && <span className="mr-1 ml-2 text-stone-500">성과·인정</span>}
          <YearChips years={j.timing.promote.slice(0, 5)} cls="bg-emerald-600 text-white" />
          {j.timing.caution.length > 0 && <span className="mr-1 ml-2 text-stone-500">버티며 준비</span>}
          <YearChips years={j.timing.caution.slice(0, 5)} cls="bg-rose-500 text-white" />
        </div>
        <p className="mt-2 text-[15px] leading-relaxed">{j.timing.text}</p>
      </Block>

      {j.role && (
        <Block title="이 분야에서 잘 맞는 역할">
          <p className="text-[15px] leading-relaxed">{j.role}</p>
        </Block>
      )}

      <Block title="사주가 가리키는 다른 길">
        <ul className="space-y-1 text-[15px]">
          {j.alternatives.map((t) => (
            <li key={t}>· {t}</li>
          ))}
        </ul>
      </Block>
      <div className="no-print rounded-2xl bg-stone-50 p-4 dark:bg-stone-800/50">
        <div className="mb-2 text-sm font-semibold">직업을 바꿔서 비교해 보기</div>
        <ExtrasForm input={a.input} />
      </div>
    </section>
  );
}
