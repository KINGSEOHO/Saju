/**
 * 고민 리포트 — 결과 화면 아래 '고민 리포트' 칸에서 고민 한 줄을 펼치면 그 고민에 맞춰 '한 줄 답'부터 보여 준다.
 * 다섯 고민이 모두 같은 모양(report/concern.ts의 ConcernReport)이라 화면도 하나로 그린다.
 * 궁합·재회 줄은 상대 정보를 넣는 화면(Match.tsx)을 그대로 쓴다.
 */
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type { SajuAnalysis } from '../engine/index.ts';
import { PAYWALL_DEMO, PRICES } from '../config/plans.ts';
import { resetDemo } from '../lib/account.ts';
import { clearFunnel, funnelLog, ITEM_LABEL, STEP_LABEL } from '../lib/funnel.ts';
import { formatYm } from '../lib/partnerDraft.ts';
import { concernOffers, isOpen, purchaseLabel, sajuKey } from '../lib/entitlements.ts';
import { concernReport, examMonthOf, LOVE_STATUS_LABEL, type ConcernReport, type LoveStatus, type MonthRow, type MonthSign } from '../report/concern.ts';
import { concernMeta, type ConcernId } from '../report/concernList.ts';
import type { Report, Statement, YearSignal } from '../report/generate.ts';
import { seasonKey } from '../report/season.ts';
import { Gloss, Lead, TONE_STYLE } from './common.tsx';
import { GaeunDetail, GaeunTaste } from './Gaeun.tsx';
import { monthTitle, upcomingMonths } from './Luck.tsx';
import { Premium, useUnlock, type Peek } from './Premium.tsx';

type Unlock = ReturnType<typeof useUnlock>;

const SIG_TAG = { positive: 'tag-pos', negative: 'tag-neg', caution: 'tag-mute', neutral: 'tag-mute' } as const;

/** 이 탭 안에서만 기억하는 선택 (연애 상태 · 시험 달) */
function useTabState<T>(key: string, initial: T): [T, (v: T) => void] {
  const [v, setV] = useState<T>(() => {
    try {
      const raw = sessionStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : initial;
    } catch {
      return initial;
    }
  });
  return [
    v,
    (next: T) => {
      setV(next);
      try {
        sessionStorage.setItem(key, JSON.stringify(next));
      } catch {
        /* 이번 화면에서만 */
      }
    },
  ];
}

function Block({ title, desc, children }: { title: string; desc?: string; children: ReactNode }) {
  return (
    <section>
      <h4 className="text-title3 text-ink">{title}</h4>
      {desc && <p className="mt-1 text-label text-sub">{desc}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function YearRow({ label, y }: { label: string; y: YearSignal }) {
  return (
    <div className="flex items-center gap-3 border-b border-line py-3.5">
      <dt className="w-24 shrink-0">
        <span className="block text-label font-semibold text-ink">{label}</span>
        <span className="block text-micro text-sub tabular-nums">
          {y.year} {y.pillar}
        </span>
      </dt>
      <dd className="flex min-w-0 flex-1 items-center justify-between gap-3">
        <span className={SIG_TAG[y.tone]}>{y.verdict}</span>
        <span className="text-cap text-sub tabular-nums">운의 힘 {y.score}</span>
      </dd>
    </div>
  );
}

function StatementList({ items }: { items: Statement[] }) {
  return (
    <ul className="border-t border-line">
      {items.map((s) => (
        <li key={s.text} className="border-b border-line py-4">
          {s.tone !== 'neutral' && <span className={TONE_STYLE[s.tone].tag}>{TONE_STYLE[s.tone].label}</span>}
          <p className={`read ${s.tone !== 'neutral' ? 'mt-2' : ''}`}>
            <Lead text={s.text} />
          </p>
        </li>
      ))}
    </ul>
  );
}

function MonthList({ a, list, empty }: { a: SajuAnalysis; list: MonthSign[]; empty: string }) {
  if (!list.length) return <p className="mt-2 text-ui text-sub">{empty}</p>;
  return (
    <ul className="mt-2 border-t border-line">
      {list.map((m) => (
        <li key={m.w.startMs} className="border-b border-line py-4">
          <p className="font-serif text-[17px] font-bold text-ink">{monthTitle(a, m.w)}</p>
          <p className="mt-1 text-ui text-ink-2">{m.why}</p>
        </li>
      ))}
    </ul>
  );
}

function Calendar({ a, rows }: { a: SajuAnalysis; rows: MonthRow[] }) {
  return (
    <ul className="border-t border-line">
      {rows.map((r) => (
        <li key={r.w.startMs} className={`border-b border-line py-3.5 ${r.past ? 'opacity-45' : ''}`}>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-label font-semibold text-ink">{monthTitle(a, r.w)}</span>
            {r.now && <span className="text-micro font-bold text-accent">지금</span>}
            <span className={`${SIG_TAG[r.tone]} ml-auto`}>{r.tag}</span>
          </div>
          <p className="mt-1 text-ui text-ink-2">{r.text}</p>
        </li>
      ))}
    </ul>
  );
}

/** 시험이 있는 달 — 넣으면 그달의 기운을 본다 */
function ExamMonth({ a }: { a: SajuAnalysis }) {
  const [ym, setYm] = useTabState<string>('mg_exam_month', '');
  const digits = ym.replace(/\D/g, '');
  const parsed = digits.length === 6 ? { year: Number(digits.slice(0, 4)), month: Number(digits.slice(4)) } : null;
  const valid = parsed && parsed.month >= 1 && parsed.month <= 12;
  const r = valid ? examMonthOf(a, parsed) : null;
  return (
    <Block title="시험이 있는 달" desc="시험 연월을 넣으면 그달의 기운을 봐요.">
      <input className="field" inputMode="numeric" placeholder="예) 202703" value={formatYm(ym)} onChange={(e) => setYm(e.target.value.replace(/\D/g, '').slice(0, 6))} autoComplete="off" />
      {digits.length === 6 && !valid && <p className="mt-2 text-label font-semibold text-ink">월은 01부터 12 사이로 넣어 주세요.</p>}
      {r && !r.ok && <p className="mt-3 text-ui text-sub">{r.text}</p>}
      {r && r.ok && (
        <div className="panel mt-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-serif text-[17px] font-bold text-ink">{monthTitle(a, r.w)}</span>
            <span className={SIG_TAG[r.tone]}>{r.tag}</span>
          </div>
          <p className="read mt-2">{r.text}</p>
          <p className="mt-2 text-cap text-sub">
            <Gloss text={`근거 · ${r.basis}`} />
          </p>
        </div>
      )}
    </Block>
  );
}

function ConcernDetail({ a, c }: { a: SajuAnalysis; c: ConcernReport }) {
  const d = c.detail;
  return (
    <>
      {c.id === 'exam' && <ExamMonth a={a} />}
      {d.months && (
        <Block title={d.months.title} desc={d.months.desc}>
          <p className="text-label font-semibold text-accent">{d.months.goLabel}</p>
          <MonthList a={a} list={d.months.list.filter((m) => m.kind === 'go')} empty={d.months.noGo} />
          <p className="mt-6 text-label font-semibold text-ink">{d.months.avoidLabel}</p>
          <MonthList a={a} list={d.months.list.filter((m) => m.kind === 'avoid')} empty={d.months.noAvoid} />
        </Block>
      )}
      {d.calendar && (
        <Block title={d.calendar.title} desc={d.calendar.desc}>
          <Calendar a={a} rows={d.calendar.rows} />
        </Block>
      )}
      {d.fields && d.fields.rows.length > 0 && (
        <Block title={d.fields.title} desc={d.fields.desc}>
          <dl className="border-t border-line">
            {d.fields.rows.map((r) => (
              <div key={r.label}>
                <YearRow label={r.label} y={r.y} />
                {r.y.notes.length > 0 && (
                  <p className="-mt-1 border-b border-line pb-3 text-label text-ink-2">
                    <Gloss text={r.y.notes.join(' · ')} />
                  </p>
                )}
              </div>
            ))}
          </dl>
        </Block>
      )}
      {d.timeline && (
        <Block title={d.timeline.title} desc={d.timeline.desc}>
          <ul className="border-t border-line">
            {d.timeline.items.map((y) => (
              <li key={y.year} className="flex gap-4 border-b border-line py-4">
                <span className="w-12 shrink-0 font-serif text-title3 font-bold text-ink tabular-nums">{y.year}</span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={SIG_TAG[y.tone]}>{y.verdict}</span>
                    <span className="text-micro text-sub tabular-nums">
                      {y.pillar} · 운의 힘 {y.score}
                    </span>
                  </div>
                  {y.notes.length > 0 && (
                    <p className="mt-1.5 text-label text-ink-2">
                      <Gloss text={y.notes.join(' · ')} />
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </Block>
      )}
      {d.lists.map((l) =>
        l.items.length ? (
          <Block key={l.title} title={l.title}>
            {l.numbered ? (
              <ol className="space-y-4">
                {l.items.map((t, i) => (
                  <li key={t} className="flex gap-4">
                    <span className="w-4 shrink-0 font-serif text-title3 font-bold text-accent tabular-nums">{i + 1}</span>
                    <p className="read">{t}</p>
                  </li>
                ))}
              </ol>
            ) : (
              <ul className="space-y-3">
                {l.items.map((t) => (
                  <li key={t} className="flex gap-2.5 text-ui text-ink-2">
                    <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" />
                    {t}
                  </li>
                ))}
              </ul>
            )}
          </Block>
        ) : null,
      )}
      {c.gaeun && (
        <Block title={c.gaeun.title} desc="같은 기운이라도 고민마다 쓰는 법이 달라요. 이 고민에 맞춰 골랐어요.">
          <GaeunDetail id={c.id} g={c.gaeun} />
        </Block>
      )}
      {d.statements.map((s) => (
        <Block key={s.title} title={s.title}>
          <StatementList items={s.items} />
        </Block>
      ))}
      {d.story && (
        <Block title={d.story.title} desc={d.story.desc}>
          {d.story.paras.map((p) => (
            <section key={p.title} className="mb-8">
              <h5 className="font-serif text-[17px] font-bold text-ink">{p.title}</h5>
              <p className="read mt-2">
                <Lead text={p.text} />
              </p>
            </section>
          ))}
        </Block>
      )}
    </>
  );
}

/**
 * 잠금 화면에서 먼저 보여 줄 결과 하나 — 좋은 달 중 첫 달. 신년운세는 무료에서 힘이 실리는 달을 이미 보여 주므로 조심할 달을.
 * 달이 하나도 없으면 첫 목록(지금 할 일 등)의 첫 줄.
 */
export function concernPeek(a: SajuAnalysis, c: ConcernReport): Peek | undefined {
  const m = c.detail.months;
  if (m) {
    const go = m.list.filter((x) => x.kind === 'go');
    const avoid = m.list.filter((x) => x.kind === 'avoid');
    const order = c.id === 'year' ? [{ list: avoid, label: m.avoidLabel, other: go, otherLabel: m.goLabel }] : [];
    order.push({ list: go, label: m.goLabel, other: avoid, otherLabel: m.avoidLabel }, { list: avoid, label: m.avoidLabel, other: go, otherLabel: m.goLabel });
    const pick = order.find((x) => x.list.length);
    if (pick) {
      const rest = [pick.list.length > 1 ? `나머지 ${pick.list.length - 1}개` : '', pick.other.length ? `${pick.otherLabel} ${pick.other.length}개` : ''].filter(Boolean);
      return {
        label: `먼저 보여 드려요 · ${pick.label} ${pick.list.length}개 중 1개`,
        title: monthTitle(a, pick.list[0].w),
        text: pick.list[0].why,
        rest: `${rest.length ? `${rest.join('와 ')}, ` : ''}그 밖의 내용은 열면 볼 수 있어요.`,
      };
    }
  }
  const l = c.detail.lists.find((x) => x.items.length);
  if (!l) return undefined;
  return { label: `먼저 보여 드려요 · ${l.title}`, title: `${l.items.length}가지 중 첫째`, text: l.items[0], rest: '나머지와 그 밖의 내용은 열면 볼 수 있어요.' };
}

function ConcernView({ a, report, id, u }: { a: SajuAnalysis; report: Report; id: ConcernId; u: Unlock }) {
  const months = useMemo(() => upcomingMonths(a, 12), [a]);
  const [love, setLove] = useTabState<LoveStatus>('mg_love_status', 'single');
  const c = useMemo(() => concernReport(id, a, report, months, { love }), [id, a, report, months, love]);
  if (!c) return <p className="text-ui text-sub">이 고민의 풀이를 만들지 못했어요.</p>;
  const title = concernMeta(id, a).title;
  return (
    <>
      {id === 'love' && (
        <div className="mb-6">
          <p className="text-label font-semibold text-ink-2">지금은</p>
          <div className="mt-2 grid grid-cols-3 gap-2" role="radiogroup" aria-label="지금 연애 상태">
            {(Object.keys(LOVE_STATUS_LABEL) as LoveStatus[]).map((s) => (
              <button
                key={s}
                type="button"
                role="radio"
                aria-checked={love === s}
                onClick={() => setLove(s)}
                className={`min-h-11 rounded-xl border px-2 py-2 text-label leading-snug transition-colors ${love === s ? 'border-accent bg-accent-soft font-bold text-accent' : 'border-line text-ink active:bg-fill'}`}
              >
                {LOVE_STATUS_LABEL[s]}
              </button>
            ))}
          </div>
        </div>
      )}

      <section aria-labelledby={`concern-${id}`}>
        <p className="kicker">
          {title} · {c.ask}
        </p>
        <h3 id={`concern-${id}`} className="mt-2 text-title1 text-ink">
          {c.answer}
        </h3>
        <div className="mt-4 grid grid-cols-4 gap-1" aria-label={`지금은 ${c.stances[c.stance]}`}>
          {c.stances.map((s, i) => (
            <span key={s} aria-hidden className={`rounded-lg px-0.5 py-1.5 text-center text-cap leading-tight ${i === c.stance ? 'bg-accent font-bold text-on-accent' : 'bg-fill text-sub'}`}>
              {s}
            </span>
          ))}
        </div>
        <p className="read mt-6">
          <Lead text={c.why.text} />
        </p>
        <p className="mt-2 text-cap text-sub">
          <Gloss text={`근거 · ${c.why.basis}`} />
        </p>
      </section>

      <dl className="mt-8 border-t border-line">
        {c.signals.map((s) => (
          <YearRow key={s.label} label={s.label} y={s.y} />
        ))}
      </dl>
      <p className="mt-4 text-ui font-semibold text-accent">{c.teaser}</p>

      <section className="mt-12">
        <h4 className="text-title2 text-ink">{c.free.title}</h4>
        {c.free.note && <p className="panel mt-4 text-label text-ink-2">{c.free.note}</p>}
        <ul className="mt-2">
          {c.free.items.map((s, i) => (
            <li key={s.text} className="border-b border-line py-4 last:border-b-0">
              {c.free.labels ? (
                <span className={SIG_TAG[s.tone]}>{c.free.labels[i]}</span>
              ) : (
                s.tone !== 'neutral' && <span className={TONE_STYLE[s.tone].tag}>{TONE_STYLE[s.tone].label}</span>
              )}
              <p className={`read ${s.tone !== 'neutral' || c.free.labels ? 'mt-2' : ''}`}>
                <Lead text={s.text} />
              </p>
            </li>
          ))}
        </ul>
      </section>

      {c.gaeun && <GaeunTaste g={c.gaeun} />}

      {c.notice && <p className="mt-6 rounded-xl bg-fill px-4 py-3 text-label text-sub">{c.notice}</p>}

      <Premium
        id={id}
        title={c.detail.title}
        what={title}
        items={c.detail.items}
        locked={PAYWALL_DEMO ? !isOpen(u.ent, id) : undefined}
        offers={concernOffers(u.ent, id)}
        onTake={(o) => u.buy(o, id)}
        onRedeem={u.redeem}
        peek={concernPeek(a, c)}
      >
        <ConcernDetail a={a} c={c} />
      </Premium>
    </>
  );
}

/** 내 구매 코드 — 산 게 있으면 늘 보여 준다. 다른 휴대폰에서 이 코드를 넣으면 그대로 열린다 */
function CodeBox({ u }: { u: Unlock }) {
  const [copied, setCopied] = useState(false);
  const [note, setNote] = useState('');
  useEffect(() => {
    const on = () => {
      try {
        setNote(sessionStorage.getItem('mg_redeem_note') ?? '');
        sessionStorage.removeItem('mg_redeem_note');
      } catch {
        /* noop */
      }
    };
    window.addEventListener('mg-redeem-note', on);
    return () => window.removeEventListener('mg-redeem-note', on);
  }, []);
  if (!u.account || !u.purchases.length) return null;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(u.account!.code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* 길게 눌러 복사 */
    }
  };
  return (
    <div className="panel mb-6">
      <p className="text-label font-semibold text-ink">내 구매 코드</p>
      <div className="mt-2 flex items-center justify-between gap-3">
        <span className="font-mono text-title3 font-bold tracking-wider text-ink select-all">{u.account.code}</span>
        <button type="button" className="btn-small shrink-0" onClick={copy}>
          {copied ? '복사됨' : '복사'}
        </button>
      </div>
      {note && <p className="mt-2 text-label font-semibold text-accent">{note}</p>}
      <p className="mt-2 text-cap text-sub">코드는 한 사람에 하나예요. 더 사도 같은 코드에 쌓여요. 다른 휴대폰이나 카카오톡 안에서 열 때 이 코드를 넣으면 산 리포트가 그대로 열려요. 캡처해 두세요.</p>
    </div>
  );
}

/** 시안 전용 — 이 기기에서 남긴 측정 단계 (시안이라 어디에도 보내지 않는다) */
function FunnelLog() {
  const [log, setLog] = useState(funnelLog);
  useEffect(() => {
    const on = () => setLog(funnelLog());
    window.addEventListener('mg-funnel', on);
    return () => window.removeEventListener('mg-funnel', on);
  }, []);
  return (
    <details className="mt-2 border-t border-line pt-2" data-funnel-log>
      <summary className="cursor-pointer text-label font-semibold text-ink-2">측정 기록 {log.length}개 보기</summary>
      <p className="mt-1 text-cap text-sub">실제 사이트에서는 이 단계들이 이름·생년월일 없이 통계 시트로 가요. 시안에서는 보내지 않고 여기에만 남겨요.</p>
      {log.length > 0 && (
        <ol className="mt-2 space-y-0.5 text-label text-ink-2">
          {log.map((x, i) => (
            <li key={`${x.at}-${i}`} className="tabular-nums">
              {i + 1}. {STEP_LABEL[x.step]}
              {x.meta.item ? ` · ${ITEM_LABEL[String(x.meta.item)] ?? x.meta.item}` : ''}
              {typeof x.meta.amount === 'number' ? ` · ${x.meta.amount.toLocaleString('ko-KR')}원` : ''}
              {x.meta.offer === 'first' ? ' (첫 결제 혜택)' : ''}
            </li>
          ))}
        </ol>
      )}
    </details>
  );
}

/** 시안 전용 — 지금까지 연 것과 처음부터 다시 */
function DemoBox({ u }: { u: Unlock }) {
  return (
    <div className="mb-4 rounded-xl border border-dashed border-line-strong px-4 py-3">
      <p className="text-cap font-semibold text-sub">시안 · 결제 흐름 체험 (실제로 결제되지 않아요)</p>
      <p className="mt-1 text-label text-ink-2">
        이번 묶음에 낸 돈 {u.ent.spent.toLocaleString('ko-KR')}원 · 기록 {u.purchases.length}건 · 전부 열기 {PRICES.all.toLocaleString('ko-KR')}원까지만 · 첫 결제 혜택{' '}
        {u.ent.first ? '남아 있음' : '씀'}
      </p>
      {u.purchases.length > 0 && (
        <ul className="mt-2 border-t border-line text-label">
          {u.purchases.map((p) => (
            <li key={`${p.at}-${p.target}`} className="flex justify-between gap-3 border-b border-line py-1.5">
              <span className="min-w-0 text-ink-2">{purchaseLabel(p)}</span>
              <span className="shrink-0 text-sub tabular-nums">{p.amount ? `${p.amount.toLocaleString('ko-KR')}원` : '무료'}</span>
            </li>
          ))}
        </ul>
      )}
      <button
        type="button"
        className="link mt-2 text-label"
        onClick={() => {
          resetDemo();
          clearFunnel();
        }}
      >
        새 휴대폰처럼 처음부터 (코드 입력 시험용)
      </button>
      <FunnelLog />
    </div>
  );
}

/** 고민 하나 — 고민 리포트 칸의 줄을 펼치면 보인다 */
export function ConcernBody({ a, report, id }: { a: SajuAnalysis; report: Report; id: ConcernId }) {
  const u = useUnlock(sajuKey(a.input), seasonKey(a));
  return <ConcernView a={a} report={report} id={id} u={u} />;
}

/** 고민 리포트 칸 맨 위 — 내 구매 코드(산 것이 있을 때)와 시안 체험 상자. 궁합·재회에서 산 것도 같은 코드에 쌓인다 */
export function ConcernTop({ a }: { a: SajuAnalysis }) {
  const u = useUnlock(sajuKey(a.input), seasonKey(a));
  return (
    <>
      {PAYWALL_DEMO && <DemoBox u={u} />}
      <CodeBox u={u} />
    </>
  );
}
