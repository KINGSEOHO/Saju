/**
 * 고민 리포트 (시안) — 고민을 고르면 그 고민에 맞춰 '한 줄 답'부터 보여 준다.
 * 지금은 이직·진로만 만들었고, 궁합·재회는 기존 칸으로 보낸다.
 */
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type { SajuAnalysis } from '../engine/index.ts';
import { PAYWALL_DEMO } from '../config/plans.ts';
import { resetDemo } from '../lib/account.ts';
import { concernOffers, isOpen, purchaseLabel, sajuKey } from '../lib/entitlements.ts';
import { careerConcern, STANCE_LABEL, type CareerConcern, type Stance } from '../report/concern.ts';
import { CONCERNS, type ConcernId } from '../report/concernList.ts';
import type { Report, YearSignal } from '../report/generate.ts';
import { Gloss, Lead, TONE_STYLE } from './common.tsx';
import { monthTitle, upcomingMonths } from './Luck.tsx';
import { Premium, useUnlock } from './Premium.tsx';

type Unlock = ReturnType<typeof useUnlock>;

const SIG_TAG = { positive: 'tag-pos', negative: 'tag-neg', caution: 'tag-mute', neutral: 'tag-mute' } as const;
const STANCES: Stance[] = ['move', 'prepare', 'stay', 'hold'];

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

function CareerDetail({ a, c }: { a: SajuAnalysis; c: CareerConcern }) {
  const go = c.months.filter((m) => m.kind === 'go');
  const avoid = c.months.filter((m) => m.kind === 'avoid');
  return (
    <>
      <Block title="앞으로 12개월" desc="면접·제안·협상을 언제 하면 좋은지, 언제 미뤄야 하는지예요.">
        <p className="text-label font-semibold text-accent">{c.stance === 'move' ? '움직이기 좋은 달' : '그래도 기회를 살펴볼 만한 달'}</p>
        {go.length ? (
          <ul className="mt-2 border-t border-line">
            {go.map((m) => (
              <li key={m.w.startMs} className="border-b border-line py-4">
                <p className="font-serif text-[17px] font-bold text-ink">{monthTitle(a, m.w)}</p>
                <p className="mt-1 text-ui text-ink-2">{m.why}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-ui text-sub">앞으로 12개월 안에는 뚜렷하게 좋은 달이 없어요. 지금은 준비에 쓰는 게 나아요.</p>
        )}
        <p className="mt-6 text-label font-semibold text-ink">피할 달</p>
        {avoid.length ? (
          <ul className="mt-2 border-t border-line">
            {avoid.map((m) => (
              <li key={m.w.startMs} className="border-b border-line py-4">
                <p className="font-serif text-[17px] font-bold text-ink">{monthTitle(a, m.w)}</p>
                <p className="mt-1 text-ui text-ink-2">{m.why}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-ui text-sub">앞으로 12개월 안에 특별히 피할 달은 없어요.</p>
        )}
      </Block>

      <Block title="앞으로 10년 이직 신호" desc="해마다 들어오는 기운과 운의 힘을 함께 봤어요.">
        <ul className="border-t border-line">
          {c.timeline.map((y) => (
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

      <Block title="지금 회사에 남는다면">
        <ul className="space-y-3">
          {c.stay.map((t) => (
            <li key={t} className="flex gap-2.5 text-ui text-ink-2">
              <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" />
              {t}
            </li>
          ))}
        </ul>
      </Block>

      <Block title="옮긴다면 이것부터">
        <ol className="space-y-4">
          {c.move.map((t, i) => (
            <li key={t} className="flex gap-4">
              <span className="w-4 shrink-0 font-serif text-title3 font-bold text-accent tabular-nums">{i + 1}</span>
              <p className="read">{t}</p>
            </li>
          ))}
        </ol>
      </Block>

      {c.risks.length > 0 && (
        <Block title="직장에서 반복되기 쉬운 문제">
          <ul className="border-t border-line">
            {c.risks.map((s) => (
              <li key={s.text} className="border-b border-line py-4">
                {s.tone !== 'neutral' && <span className={TONE_STYLE[s.tone].tag}>{TONE_STYLE[s.tone].label}</span>}
                <p className={`read ${s.tone !== 'neutral' ? 'mt-2' : ''}`}>
                  <Lead text={s.text} />
                </p>
              </li>
            ))}
          </ul>
        </Block>
      )}

      {c.story.length > 0 && (
        <Block title="이야기로 읽기" desc="직업과 일에 대한 긴 풀이예요.">
          {c.story.slice(0, 4).map((p) => (
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

function CareerView({ a, report, u }: { a: SajuAnalysis; report: Report; u: Unlock }) {
  const months = useMemo(() => upcomingMonths(a, 12), [a]);
  const c = useMemo(() => careerConcern(a, report, months), [a, report, months]);
  if (!c) return <p className="text-ui text-sub">이직·진로 풀이를 만들지 못했어요.</p>;
  return (
    <>
      <section aria-labelledby="career-answer">
        <p className="kicker">이직·진로 · 지금 옮겨도 될까?</p>
        <h3 id="career-answer" className="mt-2 text-title1 text-ink">
          {c.answer}
        </h3>
        <div className="mt-4 grid grid-cols-4 gap-1" aria-label={`지금은 ${STANCE_LABEL[c.stance]}`}>
          {STANCES.map((s) => (
            <span
              key={s}
              className={`rounded-lg py-1.5 text-center text-cap ${s === c.stance ? 'bg-accent font-bold text-on-accent' : 'bg-fill text-sub'}`}
              aria-hidden
            >
              {STANCE_LABEL[s]}
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
        <YearRow label="올해" y={c.thisYear} />
        {c.nextYear && <YearRow label="내년" y={c.nextYear} />}
      </dl>
      <p className="mt-4 text-ui font-semibold text-accent">{c.teaser}</p>

      <section className="mt-12">
        <h4 className="text-title2 text-ink">나에게 맞는 일</h4>
        {c.job && (
          <p className="panel mt-4 text-ui text-ink-2">
            지금 하는 일 <b className="text-ink">{c.job.field}</b> · 사주와 {c.job.label} <span className="text-sub tabular-nums">({c.job.score}점)</span>
          </p>
        )}
        <ul className="mt-2">
          {c.fit.map((s) => (
            <li key={s.text} className="border-b border-line py-4 last:border-b-0">
              <p className="read">
                <Lead text={s.text} />
              </p>
            </li>
          ))}
        </ul>
      </section>

      <Premium
        id="career"
        title="이직·진로 상세 리포트"
        what="이직·진로"
        locked={PAYWALL_DEMO ? !isOpen(u.ent, 'career') : undefined}
        offers={concernOffers(u.ent, 'career')}
        onTake={(o) => u.buy(o, 'career')}
        onRedeem={u.redeem}
        items={['앞으로 12개월 — 좋은 달과 피할 달', '앞으로 10년 이직 신호', '지금 회사에 남는다면 할 일', '옮긴다면 이것부터 (체크리스트)', '직장에서 반복되기 쉬운 문제', '이야기로 읽는 긴 풀이']}
      >
        <CareerDetail a={a} c={c} />
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

/** 시안 전용 — 지금까지 연 것과 처음부터 다시 */
function DemoBox({ u }: { u: Unlock }) {
  const free = u.ent.free ? CONCERNS.find((c) => c.id === u.ent.free)?.title : null;
  return (
    <div className="mb-4 rounded-xl border border-dashed border-line-strong px-4 py-3">
      <p className="text-cap font-semibold text-sub">시안 · 결제 흐름 체험 (실제로 결제되지 않아요)</p>
      <p className="mt-1 text-label text-ink-2">
        무료 {free ? `‘${free}’에 사용` : '1개 남음'} · 고민에 낸 돈 {u.ent.spent.toLocaleString('ko-KR')}원 · 기록 {u.purchases.length}건
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
      <button type="button" className="link mt-2 text-label" onClick={resetDemo}>
        새 휴대폰처럼 처음부터 (코드 입력 시험용)
      </button>
    </div>
  );
}

/** 아직 만들지 않은 고민 — 시안에서는 가격 사다리만 눌러 볼 수 있게 자리를 둔다 */
function Upcoming({ id, u }: { id: ConcernId; u: Unlock }) {
  const c = CONCERNS.find((x) => x.id === id)!;
  return (
    <>
      <div className="panel">
        <p className="text-ui font-semibold text-ink">{c.title} 고민 리포트는 준비 중이에요</p>
        <p className="mt-1 text-label text-sub">이직·진로와 같은 틀(한 줄 답 → 이유 → 올해 신호 → 상세)로 채울 거예요.</p>
      </div>
      {PAYWALL_DEMO && (
        <Premium
          id={id}
          title={`${c.title} 상세 리포트`}
          what={c.title}
          items={['앞으로 12개월 — 좋은 달과 피할 달', '앞으로 10년 신호', '지금 할 일']}
          locked={!isOpen(u.ent, id)}
          offers={concernOffers(u.ent, id)}
          onTake={(o) => u.buy(o, id)}
          onRedeem={u.redeem}
        >
          <p className="read">시안이라 아직 내용이 없어요. 가격 사다리와 버튼 문구를 눌러 보는 자리예요.</p>
        </Premium>
      )}
    </>
  );
}

export function ConcernPanel({ a, report, concern, onPick }: { a: SajuAnalysis; report: Report; concern: ConcernId; onPick: (id: ConcernId) => void }) {
  const u = useUnlock(sajuKey(a.input));
  return (
    <>
      {PAYWALL_DEMO && <DemoBox u={u} />}
      <CodeBox u={u} />
      <div className="-mx-5 overflow-x-auto px-5 pb-1">
        <div className="flex w-max gap-2" role="tablist" aria-label="고민 고르기">
          {CONCERNS.map((c) => (
            <button
              key={c.id}
              type="button"
              role="tab"
              aria-selected={concern === c.id}
              onClick={() => onPick(c.id)}
              className={`h-10 shrink-0 rounded-full border px-4 text-label font-semibold transition-colors ${concern === c.id ? 'border-accent bg-accent text-on-accent' : 'border-line text-ink active:bg-fill'}`}
            >
              {c.title}
              {PAYWALL_DEMO && c.id !== 'match' && isOpen(u.ent, c.id) && <span className="ml-1 font-normal opacity-80">· 열림</span>}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-8">
        {concern === 'career' ? <CareerView a={a} report={report} u={u} /> : <Upcoming id={concern} u={u} />}
      </div>
    </>
  );
}
