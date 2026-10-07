import { useState, type ReactNode } from 'react';
import { BRANCHES, STEMS, pillarHanja, pillarKo, type LuckPillar, type SajuAnalysis, type Wolun } from '../engine/index.ts';
import { groupOf } from '../engine/tenGods.ts';
import { readLuck, type LuckReading } from '../report/luckReading.ts';
import { DECADE_THEME } from '../report/storyKb.ts';
import { DivergingBars, ScorePill } from './Charts.tsx';
import { Chevron, Gloss, SectionTitle } from './common.tsx';

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

/** 좋은 것은 포인트 색 점, 조심할 것은 먹색 점, 참고는 회색 점 */
function Points({ title, items, dot, titleCls }: { title: string; items: string[]; dot: string; titleCls: string }) {
  return (
    <div>
      <h4 className={`font-sans text-label font-semibold ${titleCls}`}>{title}</h4>
      <ul className="mt-2 space-y-2">
        {items.map((t, i) => (
          <li key={i} className="flex gap-2.5">
            <span aria-hidden className={`mt-[0.7em] size-1.5 shrink-0 rounded-full ${dot}`} />
            <span className="font-serif text-[16px] leading-[1.75] text-ink-2">
              <Gloss text={t} />
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ReadingLists({ r }: { r: LuckReading }) {
  return (
    <div className="space-y-6">
      <Points title="이렇게 하면 좋아요" items={r.good} dot="bg-accent" titleCls="text-accent" />
      <Points title="이건 조심하세요" items={r.caution} dot="bg-ink" titleCls="text-ink" />
      {r.notes.length > 0 && <Points title="함께 알아 두세요" items={r.notes} dot="bg-faint" titleCls="text-sub" />}
    </div>
  );
}

/** 이번 달·올해처럼 강조해서 보여 주는 풀이 */
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
    <div className="panel">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p className="kicker">
          {label} <span className="font-normal text-sub">· {sub}</span>
        </p>
        <div className="flex items-baseline gap-2">
          <span className="font-serif text-[17px] font-bold text-ink">{pillarHanja(pillar)}</span>
          <ScorePill score={score} />
        </div>
      </div>
      <h3 className="mt-3 text-title2 text-ink">{r.headline}</h3>
      <div className="mt-6">
        <ReadingLists r={r} />
      </div>
      <p className="mt-6 text-cap text-sub">
        <Gloss text={`근거 · ${r.evidence}`} />
      </p>
      {footer}
    </div>
  );
}

/** 다음 달 운으로 곧 바뀔 때 보여 주는 안내 */
export function SwitchNote({ a, w }: { a: SajuAnalysis; w: Wolun }) {
  const sw = upcomingSwitch(a, w);
  if (!sw) return null;
  return (
    <p className="mt-4 border-t border-line pt-4 text-label text-ink-2">
      <b className="text-ink">곧 바뀌어요</b> · {sw.when}부터는 「{readLuck(a, sw.next, '달').headline}」로 넘어가요.
    </p>
  );
}

function MonthRow({ a, w }: { a: SajuAnalysis; w: Wolun }) {
  const [open, setOpen] = useState(false);
  const r = readLuck(a, w, '달');
  const lbl = monthLabel(a, w);
  const more = r.good.length > 1 || r.caution.length > 1 || r.notes.length > 0;
  return (
    <li className="border-b border-line py-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-ui font-semibold text-ink">{lbl.title}</div>
          <div className="text-cap text-sub">
            {lbl.since} · <span className="font-serif">{pillarHanja(w.pillar)}</span>
          </div>
        </div>
        <ScorePill score={w.score} />
      </div>
      <p className="mt-2 font-serif text-[17px] leading-snug font-bold text-ink">{r.headline}</p>
      {!open && (
        <dl className="mt-3 space-y-2 text-label text-ink-2">
          <div className="flex gap-2.5">
            <dt className="tag-pos mt-0.5 h-fit">좋아요</dt>
            <dd>
              <Gloss text={r.good[0]} />
            </dd>
          </div>
          <div className="flex gap-2.5">
            <dt className="tag-neg mt-0.5 h-fit">조심</dt>
            <dd>
              <Gloss text={r.caution[0]} />
            </dd>
          </div>
        </dl>
      )}
      {open && (
        <div className="mt-4">
          <ReadingLists r={r} />
          <p className="mt-4 text-cap text-sub">
            <Gloss text={`근거 · ${r.evidence}`} />
          </p>
        </div>
      )}
      {more && (
        <button type="button" className="mt-3 flex items-center gap-1 text-label font-semibold text-sub" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
          {open ? '접기' : '자세히 보기'}
          <Chevron open={open} className="size-4" />
        </button>
      )}
    </li>
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
    <button type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={`tab ${tab === id ? 'tab-on' : ''}`}>
      {label}
    </button>
  );
  return (
    <section>
      <SectionTitle
        id="luck"
        kicker="월운 · 세운 · 대운"
        title="운의 흐름"
        desc={
          <Gloss text="그 달·그해에 들어오는 기운이 나에게 필요한 기운(용신·희신)인지 부담되는 기운(기신·구신)인지, 타고난 글자(원국)와 부딪히거나 손잡는지를 보고 풀이했어요. 50점이 보통이에요. 좋은 시기에도 조심할 것이 있고, 힘든 시기에도 할 수 있는 일이 있어요." />
        }
      />
      <div className="tabs mb-8" role="tablist" aria-label="운의 단위">
        {tabBtn('wolun', '이번 달 · 월별')}
        {tabBtn('seun', '올해 · 연도별')}
        {tabBtn('daeun', '대운 · 10년')}
      </div>

      {tab === 'wolun' && thisMonth && (
        <div>
          <FeaturedReading
            label="이번 달"
            sub={`${monthLabel(a, thisMonth).title}`}
            pillar={thisMonth.pillar}
            score={thisMonth.score}
            r={readLuck(a, thisMonth, '달')}
            footer={<SwitchNote a={a} w={thisMonth} />}
          />
          <h3 className="mt-12 text-title3 text-ink">앞으로 11개월</h3>
          <p className="mt-1 text-label text-sub">사주의 달은 양력 1일이 아니라 절기(입춘·경칩 등)가 들어오는 날 바뀌어요. 날짜는 그 기준이에요.</p>
          <ul className="mt-3 border-t border-line">
            {months.slice(1).map((w) => (
              <MonthRow key={w.startMs} a={a} w={w} />
            ))}
          </ul>
        </div>
      )}

      {tab === 'seun' && (
        <div className="space-y-12">
          {thisYear && (
            <FeaturedReading label="올해" sub={`${thisYear.year}년 · 대운 합산 ${thisYear.combined}점`} pillar={thisYear.pillar} score={thisYear.combined} r={readLuck(a, thisYear, '해', thisYear.combined)} />
          )}
          {nextYear && (
            <FeaturedReading label="내년" sub={`${nextYear.year}년 · 대운 합산 ${nextYear.combined}점`} pillar={nextYear.pillar} score={nextYear.combined} r={readLuck(a, nextYear, '해', nextYear.combined)} />
          )}
          <div>
            <h3 className="mb-5 text-title3 text-ink">연도별 흐름</h3>
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
            <ul className="mt-6 border-t border-line">
              {a.seun.map((s) => {
                const now = s.year === nowYear;
                return (
                  <li key={s.year} className="border-b border-line py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="text-label">
                        <b className={`tabular-nums ${now ? 'text-accent' : 'text-ink'}`}>{s.year}</b> <span className="text-sub">만 {s.age}세</span>{' '}
                        <span className="font-serif font-bold text-ink">{pillarHanja(s.pillar)}</span>{' '}
                        <span className="text-micro text-sub">
                          {s.stemTenGod}/{s.branchTenGod}
                        </span>
                        {now && <span className="tag ml-1.5 bg-accent text-on-accent">올해</span>}
                      </div>
                      <ScorePill score={s.combined} />
                    </div>
                    <p className="mt-1.5 font-serif text-[16px] leading-[1.7] text-ink-2">{readLuck(a, s, '해', s.combined).headline}</p>
                    {s.flags.length > 0 && (
                      <p className="mt-1 text-cap text-sub">
                        <Gloss text={s.flags.join(' · ')} />
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}

      {tab === 'daeun' && (
        <div>
          <p className="read">
            10년마다 바뀌는 큰 운(<Gloss text="대운" />)은{' '}
            <b className="text-ink">
              만 {d.startAgeYears}세 {d.startAgeMonths}개월
            </b>
            부터 시작해요. 인생의 계절이 바뀌는 것과 비슷해서, 같은 사람도 어떤 10년을 지나느냐에 따라 관심사와 고민이 달라져요.
          </p>
          <p className="mt-2 mb-8 text-cap text-sub">
            {d.forward ? '순행' : '역행'} 대운 · {d.basisJie}까지 {d.diffDays.toFixed(2)}일 ÷ 3 = 만 {d.startAgeYears}세 {d.startAgeMonths}개월 (전통 대운수 {d.daeunsu})
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
          <ul className="mt-6 border-t border-line">
            {d.list.map((x) => {
              const current = a.currentDaeun?.pillar.index === x.pillar.index;
              return (
                <li key={x.pillar.index} className="border-b border-line py-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="font-serif text-title3 font-bold text-ink">{pillarHanja(x.pillar)}</span> <span className="text-label text-sub">{pillarKo(x.pillar)}</span>
                      {current && <span className="tag ml-2 bg-accent text-on-accent">지금</span>}
                      <div className="text-cap text-sub">
                        만 {Math.floor(x.startAge)}세부터 · {x.startYear}~{x.endYear}년
                      </div>
                    </div>
                    <ScorePill score={x.score} />
                  </div>
                  <p className="mt-2 font-serif text-[17px] font-bold text-ink">{DECADE_THEME[groupOf(x.stemTenGod)].label}의 10년</p>
                  <p className="mt-1 text-cap text-sub">
                    <Gloss text={`${roleLine(x)} · 12운성 ${x.stage}`} />
                  </p>
                  {x.flags.length > 0 && (
                    <p className="mt-1 text-cap font-semibold text-ink-2">
                      <Gloss text={x.flags.join(' · ')} />
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}
