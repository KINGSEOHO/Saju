/** 교차 검증 · MBTI × 사주 · 직업 × 운 */
import { useState, type ReactNode } from 'react';
import type { BirthInput, SajuAnalysis } from '../engine/index.ts';
import { encodeInput } from '../lib/share.ts';
import { SYSTEM_LABEL, type CrossReport, type ThemeResult } from '../report/cross.ts';
import { JOB_SUGGEST } from '../report/job.ts';
import { AXES, AXIS_INFO, MBTI_LIST, MBTI_PROFILE, sajuAxes } from '../report/mbti.ts';
import { elWord } from '../report/plain.ts';
import { Chevron, Gloss, Lead, SectionTitle } from './common.tsx';
import { IdentityCardView } from './IdentityCard.tsx';
import { JobPicker } from './JobPicker.tsx';

function setExtras(input: BirthInput, patch: Partial<Pick<BirthInput, 'mbti' | 'job'>>) {
  window.location.hash = `/r?${encodeInput({ ...input, ...patch })}`;
}

/** 결과 화면에서 MBTI·직업 넣기 */
export function ExtrasForm({ input, focus }: { input: BirthInput; focus?: 'mbti' | 'job' }) {
  const [mbti, setMbti] = useState(input.mbti ?? '');
  const [job, setJob] = useState(input.job ?? '');
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        setExtras(input, { mbti: mbti || undefined, job: job.trim().slice(0, 30) || undefined });
      }}
    >
      <label className="block">
        <span className="mb-2 block text-label font-semibold text-ink">MBTI</span>
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
      <button type="submit" className="btn-primary w-full">
        반영하기
      </button>
    </form>
  );
}

/** 가로 막대 하나 (조심할 점은 먹색) */
function Bar({ value, dark = false }: { value: number; dark?: boolean }) {
  return (
    <div className="h-1.5 flex-1 overflow-hidden rounded bg-fill">
      <div className={`h-full rounded ${dark ? 'bg-ink' : 'bg-accent'}`} style={{ width: `${Math.round(value)}%` }} />
    </div>
  );
}

/** 누르면 펼쳐지는 작은 버튼 */
function MoreToggle({ label, children }: { label: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-3">
      <button type="button" className="flex items-center gap-1 text-label font-semibold text-sub" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        {open ? '접기' : label}
        <Chevron open={open} className="size-4" />
      </button>
      {open && <div className="mt-3">{children}</div>}
    </div>
  );
}

function Basis({ text }: { text: string }) {
  return (
    <p className="mt-2 text-cap text-sub">
      <Gloss text={text} />
    </p>
  );
}

function ThemeItem({ t }: { t: ThemeResult }) {
  const pct = Math.round(t.ratio * 100);
  return (
    <article className="border-b border-line py-6">
      <div className="flex items-center gap-2">
        <span className={t.challenge ? 'tag-neg' : 'tag-pos'}>
          {t.agree}/{t.total} 일치
        </span>
        {t.challenge && <span className="text-cap text-sub">조심할 점</span>}
      </div>
      <h4 className="mt-2 font-serif text-title3 font-bold text-ink">{t.title}</h4>
      <div className="mt-3 flex items-center gap-3">
        <Bar value={pct} dark={t.challenge} />
        <span className="shrink-0 text-cap text-sub tabular-nums">{pct}% 일치</span>
      </div>
      <p className="read mt-4">
        <Lead text={t.text} />
      </p>
      <MoreToggle label={`${t.total}개 체계별 근거 보기`}>
        <ul className="space-y-2.5 text-label">
          {t.evidence.map((e) => (
            <li key={e.system} className="flex gap-2.5">
              <span className={`mt-0.5 h-fit w-9 justify-center ${e.agree ? 'tag-pos' : 'tag-mute'}`}>{e.agree ? '맞음' : '다름'}</span>
              <span className="text-ink-2">
                <b className="text-ink">{SYSTEM_LABEL[e.system]}</b> · <Gloss text={e.text} />
              </span>
            </li>
          ))}
        </ul>
      </MoreToggle>
    </article>
  );
}

const YEAR_TONE = {
  good: { label: '힘이 되는 해', tag: 'tag-pos' },
  neutral: { label: '무난한 해', tag: 'tag-mute' },
  bad: { label: '조심할 해', tag: 'tag-neg' },
};

/** 띠로 본 나 — 성향, 올해·내년과의 관계, 잘 맞는 띠 */
function TtiSection({ x }: { x: CrossReport }) {
  const t = x.tti;
  return (
    <section>
      <p className="kicker">띠로 본 나</p>
      <h3 className="mt-1 text-title2 text-ink">
        {t.name} <span className="text-sub">· {t.nick}</span>
      </h3>
      <p className="mt-2 text-label text-sub">{t.keywords.map((k) => `#${k}`).join('  ')}</p>
      <dl className="mt-5 space-y-3">
        <div>
          <dt className="text-label font-semibold text-accent">강점</dt>
          <dd className="read mt-0.5">{t.good}</dd>
        </div>
        <div>
          <dt className="text-label font-semibold text-ink">그림자</dt>
          <dd className="read mt-0.5">{t.shadow}</dd>
        </div>
      </dl>
      <ul className="mt-6 border-t border-line">
        {[t.thisYear, t.nextYear].map((y) => (
          <li key={y.year} className="border-b border-line py-4">
            <div className="flex items-center gap-2">
              <span className="text-label font-semibold text-ink tabular-nums">
                {y.year}년 · {y.animal} 해
              </span>
              <span className={YEAR_TONE[y.tone].tag}>{YEAR_TONE[y.tone].label}</span>
            </div>
            <p className="mt-1.5 font-serif text-[17px] font-bold text-ink">{y.line}</p>
            <p className="mt-1 text-label text-ink-2">
              <Gloss text={y.text} />
            </p>
          </li>
        ))}
      </ul>
      <dl className="mt-5 space-y-1.5 text-label">
        <div className="flex gap-3">
          <dt className="w-24 shrink-0 font-semibold text-accent">잘 맞는 띠</dt>
          <dd className="text-ink-2">{t.best.join(' · ')}</dd>
        </div>
        <div className="flex gap-3">
          <dt className="w-24 shrink-0 font-semibold text-ink">부딪히기 쉬운 띠</dt>
          <dd className="text-ink-2">{t.caution.join(' · ')}</dd>
        </div>
      </dl>
      <p className="mt-4 text-cap text-sub">
        띠 성향과 삼재는 민간에서 전해 오는 해석이라 교차 검증에서 한 체계로만 세요.{t.lunarNote ? ` ${t.lunarNote}` : ''}
      </p>
    </section>
  );
}

function Dots({ items, dot = 'bg-accent' }: { items: string[]; dot?: string }) {
  return (
    <ul className="space-y-2">
      {items.map((g) => (
        <li key={g} className="flex gap-2.5">
          <span aria-hidden className={`mt-[0.7em] size-1.5 shrink-0 rounded-full ${dot}`} />
          <span className="font-serif text-[16px] leading-[1.75] text-ink-2">
            <Gloss text={g} />
          </span>
        </li>
      ))}
    </ul>
  );
}

export function CrossPanel({ a, x }: { a: SajuAnalysis; x: CrossReport }) {
  const title = a.input.name ? `${a.input.name}님의 명경 카드` : '나의 명경 카드';
  const missing = [!x.mbti && 'MBTI', !x.job && '직업'].filter(Boolean) as string[];
  return (
    <section className="space-y-14">
      <div>
        <SectionTitle
          kicker="사주 · 운 · 띠 · MBTI · 직업"
          title="교차 검증"
          desc="한 가지 체계만 보면 우연일 수 있지만, 여러 체계가 같은 방향을 가리키면 그 특성은 더 확실해요. 체계마다 따로 판정하고, 일치한 개수를 그대로 보여 드려요."
        />
        <IdentityCardView card={x.card} title={title} />
      </div>

      {missing.length > 0 && (
        <div className="no-print border-t border-line pt-8">
          <h3 className="text-title3 text-ink">{missing.join('·')}을 넣으면 더 정확해져요</h3>
          <p className="mt-1 text-label text-sub">지금은 사주 원국·대운·띠 세 체계로 비교했어요. 입력값은 서버로 보내지 않아요.</p>
          <div className="mt-5">
            <ExtrasForm input={a.input} />
          </div>
        </div>
      )}

      <div>
        <h3 className="text-title3 text-ink">한눈에 보기</h3>
        <p className="mt-1 text-label text-sub">
          비교한 체계 {x.systems.length}개 · {x.systems.map((s) => SYSTEM_LABEL[s]).join(' · ')}
        </p>
        <div className="mt-4">
          <Dots items={x.glance} />
        </div>
      </div>

      <div>
        <h3 className="text-title3 text-ink">종합 요약</h3>
        <p className="read mt-3">
          <Lead text={x.summary} />
        </p>
      </div>

      <TtiSection x={x} />

      <div>
        <h3 className="text-title3 text-ink">상세 교차 포인트</h3>
        <div className="mt-2 border-t border-line">
          {x.themes.map((t) => (
            <ThemeItem key={t.id} t={t} />
          ))}
        </div>
        <p className="mt-5 text-cap text-sub">
          교차 검증은 각 체계의 판정 기준(사주: 십성·오행 비율, 운: 지금의 대운·세운, MBTI: 입력한 유형, 직업: 분야의 특성)을 미리 정해 두고 기계적으로 비교한 결과예요. 한 체계만으로
          결론 내리지 않도록 돕는 도구이며, 점수가 낮다고 틀린 것은 아니에요.
        </p>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// MBTI × 사주
// ---------------------------------------------------------------------------
const VERDICT = {
  agree: { label: '일치', tag: 'tag-pos' },
  neutral: { label: '반반', tag: 'tag-mute' },
  differ: { label: '겉과 속', tag: 'tag-neg' },
};

/** MBTI 축 위 사주의 위치 — 가운데 옅은 칸은 '어느 쪽도 뚜렷하지 않음' */
function AxisScale({ axis, score, user }: { axis: (typeof AXES)[number]; score: number; user?: string }) {
  const info = AXIS_INFO[axis];
  return (
    <div className="flex items-center gap-3 text-label">
      <span className={`w-16 shrink-0 text-right ${user === info.a ? 'font-bold text-accent' : 'text-sub'}`}>
        {info.a} {info.aKo}
      </span>
      <div className="relative h-1.5 flex-1 rounded bg-fill">
        <div className="absolute inset-y-0 left-[42%] w-[16%] bg-line" aria-hidden />
        <div className="absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-bg bg-ink" style={{ left: `${score}%` }} title={`사주 경향 ${score}`} />
      </div>
      <span className={`w-16 shrink-0 ${user === info.b ? 'font-bold text-accent' : 'text-sub'}`}>
        {info.bKo} {info.b}
      </span>
    </div>
  );
}

function NumberedList({ title, items, tone }: { title: string; tone: 'good' | 'bad'; items: { title: string; text: string; basis: string }[] }) {
  return (
    <div>
      <h3 className="text-title3 text-ink">{title}</h3>
      <ol className="mt-4 space-y-6">
        {items.map((it, i) => (
          <li key={it.title} className="flex gap-4">
            <span className={`w-4 shrink-0 font-serif text-title3 font-bold tabular-nums ${tone === 'good' ? 'text-accent' : 'text-ink'}`}>{i + 1}</span>
            <div className="min-w-0">
              <p className="text-ui font-semibold text-ink">{it.title}</p>
              <p className="read mt-1">
                <Lead text={it.text} />
              </p>
              <Basis text={`근거 · ${it.basis}`} />
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function MbtiPanel({ a, x }: { a: SajuAnalysis; x: CrossReport }) {
  const m = x.mbti;
  const axes = sajuAxes(a);
  if (!m) {
    const st = AXES.map((k) => axes[k].lean ?? '·').join('');
    return (
      <section className="space-y-12">
        <div>
          <SectionTitle
            kicker="MBTI × 사주"
            title="내 MBTI를 골라 주세요"
            desc="MBTI와 사주를 네 가지 축(에너지·인식·판단·생활 방식)으로 비교해, 같은 점과 다른 점(겉과 속), 살릴 강점과 보완할 약점, 기운을 채우는 습관을 알려 드려요."
          />
          <div className="grid grid-cols-4 gap-2">
            {MBTI_LIST.map((t) => (
              <button key={t} type="button" onClick={() => setExtras(a.input, { mbti: t })} className="rounded-xl bg-fill px-1 py-3 text-center active:bg-line">
                <div className="text-ui font-bold tracking-wide text-ink">{t}</div>
                <div className="mt-0.5 text-[11px] text-sub">{MBTI_PROFILE[t].nick}</div>
              </button>
            ))}
          </div>
        </div>
        <div className="border-t border-line pt-8">
          <h3 className="text-title3 text-ink">MBTI를 모른다면 · 사주로만 본 경향</h3>
          <p className="mt-1 text-label text-sub">
            사주 구조로 계산한 네 가지 축의 기울기예요. 가운데에 가까운 축은 어느 쪽도 뚜렷하지 않다는 뜻이에요. 사주로 본 경향: <b className="tracking-widest text-ink">{st}</b>
          </p>
          <div className="mt-5 space-y-4">
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
    <section className="space-y-14">
      <div>
        <SectionTitle kicker="MBTI × 사주" title={`${m.type} · ${m.profile.nick}`} desc={m.profile.one} />
        <div className="panel">
          <div className="flex flex-wrap items-center gap-2">
            <span className="tag-pos">{m.agree}/4 일치</span>
            {m.differ > 0 && <span className="tag-neg">겉과 속이 다른 축 {m.differ}개</span>}
            <span className="text-cap text-sub">사주로 본 경향 {m.sajuType.replaceAll('x', '·')}</span>
          </div>
          <p className="read mt-3">
            <Lead text={m.summary} />
          </p>
        </div>
      </div>

      <div>
        <h3 className="text-title3 text-ink">네 가지 축으로 비교</h3>
        <p className="mt-1 text-label text-sub">까만 점이 사주로 계산한 위치, 초록 글자가 내 MBTI예요.</p>
        <div className="mt-2 border-t border-line">
          {m.axes.map((ax) => (
            <article key={ax.axis} className="border-b border-line py-6">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-label font-semibold text-sub">{ax.info.name}</span>
                <span className={VERDICT[ax.verdict].tag}>{VERDICT[ax.verdict].label}</span>
              </div>
              <h4 className="mt-1.5 font-serif text-title3 font-bold text-ink">{ax.title}</h4>
              <div className="mt-4">
                <AxisScale axis={ax.axis} score={ax.saju.score} user={ax.user} />
              </div>
              <p className="read mt-4">
                <Lead text={ax.text} />
              </p>
              {ax.saju.basis.length > 0 && <Basis text={`사주 근거 · ${ax.saju.basis.join(' · ')}`} />}
            </article>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-title3 text-ink">핵심 엔진 비교</h3>
        <p className="read mt-3">
          <Lead text={m.engine.text} />
        </p>
      </div>

      <NumberedList title="살릴 수 있는 강점" tone="good" items={m.strengths} />
      <NumberedList title="보완할 약점" tone="bad" items={m.weaknesses} />

      <div>
        <h3 className="text-title3 text-ink">MBTI에 맞게 {elWord(g.element)} 기운 채우기</h3>
        <div className="mt-4">
          <Dots items={g.habits} />
        </div>
        <p className="mt-3 flex gap-2.5 text-ui">
          <span className="tag-neg mt-0.5 h-fit">피할 것</span>
          <span className="text-ink-2">{g.avoid.replace(/^피할 것:\s*/, '')}</span>
        </p>
        <p className="mt-4 text-cap text-sub">색·장소·시간처럼 고민마다 다르게 쓰는 개운법은 고민 리포트에 나눠 담았어요.</p>
      </div>

      <div className="no-print border-t border-line pt-8">
        <h3 className="text-title3 text-ink">MBTI나 직업이 바뀌었나요?</h3>
        <div className="mt-5">
          <ExtrasForm input={a.input} />
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// 직업 × 사주 × 운
// ---------------------------------------------------------------------------
const ENV_TONE = {
  good: { label: '나에게 필요한 기운', tag: 'tag-pos' },
  mid: { label: '무난한 기운', tag: 'tag-mute' },
  bad: { label: '나에게 부담되는 기운', tag: 'tag-neg' },
};

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h3 className="text-title3 text-ink">{title}</h3>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function YearRow({ label, years, tag }: { label: string; years: number[]; tag: string }) {
  if (years.length === 0) return null;
  return (
    <div className="flex gap-3 border-b border-line py-3">
      <dt className="w-24 shrink-0 pt-0.5 text-label font-semibold text-sub">{label}</dt>
      <dd className="flex flex-wrap gap-1.5">
        {years.map((y) => (
          <span key={y} className={`${tag} tabular-nums`}>
            {y}
          </span>
        ))}
      </dd>
    </div>
  );
}

export function JobPanel({ a, x }: { a: SajuAnalysis; x: CrossReport }) {
  const j = x.job;
  if (!j) {
    return (
      <section>
        <SectionTitle
          kicker="직업 × 사주 × 운"
          title="지금 하는 일을 알려 주세요"
          desc="직업을 넣으면 사주와의 궁합, 살릴 강점, 그리고 지금의 대운·올해 운에서 무엇을 가장 먼저 준비해야 하는지 알려 드려요. 학생·취업 준비생·주부도 넣을 수 있어요."
        />
        <ExtrasForm input={a.input} focus="job" />
        <p className="mt-8 text-label font-semibold text-ink">바로 고르기</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {JOB_SUGGEST.map((s) => (
            <button key={s} type="button" className="rounded-lg bg-fill px-3 py-2 text-label text-ink active:bg-line" onClick={() => setExtras(a.input, { job: s })}>
              {s}
            </button>
          ))}
        </div>
      </section>
    );
  }
  return (
    <section className="space-y-14">
      <div>
        <SectionTitle
          kicker="직업 × 사주 × 운"
          title={`${j.input} · ${j.category.id === 'other' || j.category.id === 'freelance' ? '내 일' : j.category.label}`}
          desc="이 일이 요구하는 힘을 사주와 비교하고, 지금의 운에서 무엇을 먼저 준비해야 하는지 정리했어요."
        />
        <div className="rounded-2xl bg-accent-soft p-5">
          <p className="kicker">지금 가장 먼저 할 일</p>
          <p className="mt-2 font-serif text-title2 font-bold text-ink">{j.headline}</p>
        </div>
      </div>

      {j.fit && (
        <Block title="사주와 이 일의 궁합">
          <div className="flex items-center gap-3">
            <span className="font-serif text-title1 font-bold text-ink tabular-nums">{j.fit.score}</span>
            <span className="tag-pos">{j.fit.label}</span>
            <Bar value={j.fit.score} />
          </div>
          <p className="read mt-4">
            <Lead text={j.fit.text} />
          </p>
          {j.fit.env.length > 0 && (
            <div className="mt-8">
              <h4 className="font-sans text-ui font-semibold text-ink">이 일의 환경과 나</h4>
              <p className="mt-1 text-label text-sub">
                일마다 많이 쓰는 기운(오행)이 있어요. 그 기운이 나에게 필요한 쪽인지, 부담되는 쪽인지 하나씩 풀었어요. 부담이 된다는 건 그 일이 나쁘다는 뜻이 아니라, 그런 일이 몰릴수록 남보다 빨리
                지친다는 뜻이에요.
              </p>
              <ul className="mt-3 border-t border-line">
                {j.fit.env.map((e) => (
                  <li key={e.el} className="border-b border-line py-5">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="font-serif text-[17px] font-bold text-ink">
                        {elWord(e.el)} = {e.short}
                      </span>
                      <span className={ENV_TONE[e.tone].tag}>{ENV_TONE[e.tone].label}</span>
                    </div>
                    <dl className="mt-3 space-y-2.5">
                      <div>
                        <dt className="text-cap font-semibold text-sub">이 일에서는</dt>
                        <dd className="text-ui text-ink-2">{e.what}</dd>
                      </div>
                      <div>
                        <dt className="text-cap font-semibold text-sub">나에게는</dt>
                        <dd className="text-ui text-ink-2">{e.me}</dd>
                      </div>
                      {e.tip && (
                        <div>
                          <dt className="text-cap font-semibold text-accent">이렇게 해 보세요</dt>
                          <dd className="text-ui text-ink-2">{e.tip}</dd>
                        </div>
                      )}
                    </dl>
                    <Basis text={`근거 · ${e.basis}`} />
                  </li>
                ))}
              </ul>
            </div>
          )}
          <Basis text={`근거 · ${j.fit.basis}`} />
          <p className="mt-1 text-cap text-sub">적합도는 사주 구조와 이 일이 쓰는 힘의 겹침일 뿐, 실제 성과는 경험·노력·환경이 더 크게 좌우해요.</p>
        </Block>
      )}

      <Block title="지금의 운">
        <p className="font-serif text-[17px] font-bold text-ink">{j.now.title}</p>
        <p className="read mt-2">
          <Lead text={j.now.text} />
        </p>
        <Basis text={`근거 · ${j.now.basis}`} />
      </Block>

      <NumberedList title="지금 준비할 것" tone="good" items={j.prepare} />
      <NumberedList title="이 일에서 살릴 강점" tone="good" items={j.strengths} />
      {j.cautions.length > 0 && <NumberedList title="이 일에서 조심할 점" tone="bad" items={j.cautions} />}

      <Block title="움직이기 좋은 해 · 버틸 해">
        <dl className="border-t border-line">
          <YearRow label="이직·전환" years={j.timing.good} tag="tag-pos" />
          <YearRow label="성과·인정" years={j.timing.promote.slice(0, 5)} tag="tag bg-accent text-on-accent" />
          <YearRow label="버티며 준비" years={j.timing.caution.slice(0, 5)} tag="tag-neg" />
        </dl>
        <p className="read mt-4">
          <Lead text={j.timing.text} />
        </p>
      </Block>

      {j.role && (
        <Block title="이 분야에서 잘 맞는 역할">
          <p className="read">{j.role}</p>
        </Block>
      )}

      <Block title="사주가 가리키는 다른 길">
        <Dots items={j.alternatives} dot="bg-faint" />
      </Block>

      <div className="no-print border-t border-line pt-8">
        <h3 className="text-title3 text-ink">직업을 바꿔서 비교해 보기</h3>
        <div className="mt-5">
          <ExtrasForm input={a.input} />
        </div>
      </div>
    </section>
  );
}
