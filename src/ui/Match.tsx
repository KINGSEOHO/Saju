/**
 * 궁합 · 재회 — 상대 정보를 넣으면 두 사람의 사주·띠·MBTI를 함께 비교한다.
 *  - 궁합: 점수와 함께 '점수는 단순한 지표'라는 안내를 늘 붙인다.
 *  - 재회: 점수를 매기지 않고, 헤어진 시기·반복될 조건·연락하기 좋은 달만 알려 준다.
 * 상대 정보는 이 기기 안에서만 계산한다 (partnerDraft.ts).
 */
import { useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { analyze, type BirthInput, type SajuAnalysis } from '../engine/index.ts';
import { CITIES } from '../engine/timezone.ts';
import { checkDate, checkTime, formatTime, formatYmd } from '../lib/birthDraft.ts';
import { checkBreakup, formatYm, loadPartner, partnerInput, savePartner, type PartnerDraft } from '../lib/partnerDraft.ts';
import { compatReport, RELATION_LABEL, reunionReport, SCORE_NOTE, type CompatReport, type Factor, type Relation, type YearSign } from '../report/compat.ts';
import { MBTI_LIST } from '../report/mbti.ts';
import { Gloss, Lead } from './common.tsx';
import { CoupleShare } from './CoupleShare.tsx';
import { monthTitle, upcomingMonths } from './Luck.tsx';
import { Premium } from './Premium.tsx';

// ---------------------------------------------------------------------------
// 상대 정보 입력
// ---------------------------------------------------------------------------
function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: ReactNode }) {
  return (
    <div>
      <p className="text-label font-semibold text-ink-2">{label}</p>
      <div className="mt-2">{children}</div>
      {hint}
    </div>
  );
}

function Hint({ error, note }: { error?: string; note?: string }) {
  if (error)
    return (
      <p role="alert" className="mt-2 text-label font-semibold text-ink">
        {error}
      </p>
    );
  if (note) return <p className="mt-2 text-label font-medium text-accent">{note}</p>;
  return null;
}

function Choice<T extends string>({ value, options, onChange, label }: { value: T | ''; options: [T, string][]; onChange: (v: T) => void; label: string }) {
  return (
    <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label={label}>
      {options.map(([v, l]) => (
        <button
          key={v}
          type="button"
          role="radio"
          aria-checked={value === v}
          onClick={() => onChange(v)}
          className={`h-12 rounded-xl border px-2 text-ui transition-colors ${value === v ? 'border-accent bg-accent-soft font-bold text-accent' : 'border-line text-ink active:bg-fill'}`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}

const RELATIONS: [Relation, string][] = (['some', 'dating', 'married', 'ex'] as Relation[]).map((r) => [r, RELATION_LABEL[r]]);

function PartnerForm({ a, p, update, onSubmit }: { a: SajuAnalysis; p: PartnerDraft; update: (patch: Partial<PartnerDraft>) => void; onSubmit: () => void }) {
  const date = checkDate(p.ymd, p.calendar, p.leap);
  const time = checkTime(p.time);
  const br = checkBreakup(p.breakup, a.now);
  const valid = date.ok && (p.timeUnknown || time.ok) && p.gender !== '' && br.ok;
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (valid) onSubmit();
  };
  return (
    <form onSubmit={submit} noValidate>
      <p className="read">
        <Lead text="상대의 생년월일을 넣으면 두 사람의 사주와 띠, MBTI를 함께 비교해요. 헤어진 사이라면 점수 대신 다시 연락하기 좋은 때와 반복될 수 있는 문제를 알려 드려요." />
      </p>
      <div className="mt-8 grid gap-7">
        <Field label="어떤 사이인가요?">
          <Choice value={p.relation} options={RELATIONS} onChange={(relation) => update({ relation })} label="관계" />
        </Field>
        <Field label="상대 이름 (선택)">
          <input className="field" value={p.name} onChange={(e) => update({ name: e.target.value })} maxLength={20} placeholder="풀이에서 부를 이름" autoComplete="off" />
        </Field>
        <Field label="상대 성별">
          <Choice
            value={p.gender}
            options={[
              ['female', '여성'],
              ['male', '남성'],
            ]}
            onChange={(gender) => update({ gender })}
            label="상대 성별"
          />
        </Field>
        <Field label="상대 생년월일 8자리" hint={<Hint error={date.error} note={date.note} />}>
          <div className="seg mb-3" role="radiogroup" aria-label="달력">
            {(
              [
                ['solar', '양력'],
                ['lunar', '음력'],
              ] as const
            ).map(([v, l]) => (
              <button
                key={v}
                type="button"
                role="radio"
                aria-checked={p.calendar === v}
                onClick={() => update({ calendar: v, leap: false })}
                className={`seg-item ${p.calendar === v ? 'seg-on' : ''}`}
              >
                {l}
              </button>
            ))}
          </div>
          <input
            className="field h-14 text-[20px] font-semibold tracking-wide"
            inputMode="numeric"
            placeholder="예) 19920304"
            value={formatYmd(p.ymd)}
            onChange={(e) => update({ ymd: e.target.value.replace(/\D/g, '').slice(0, 8) })}
            autoComplete="off"
          />
          {p.calendar === 'lunar' && date.leapMonth > 0 && date.leapMonth === date.m && (
            <label className="mt-3 flex items-center gap-2.5 text-ui text-ink-2">
              <input type="checkbox" className="size-5 accent-accent" checked={p.leap} onChange={(e) => update({ leap: e.target.checked })} />
              윤달이에요
            </label>
          )}
        </Field>
        <Field label="상대가 태어난 시각 4자리 (24시간)" hint={!p.timeUnknown && <Hint error={time.error} note={time.note} />}>
          <input
            className="field h-14 text-[20px] font-semibold tracking-wide disabled:opacity-40"
            inputMode="numeric"
            placeholder="예) 1505"
            value={p.timeUnknown ? '' : formatTime(p.time)}
            disabled={p.timeUnknown}
            onChange={(e) => update({ time: e.target.value.replace(/\D/g, '').slice(0, 4) })}
            autoComplete="off"
          />
          <label className="mt-3 flex items-center gap-2.5 text-ui text-ink-2">
            <input type="checkbox" className="size-5 accent-accent" checked={p.timeUnknown} onChange={(e) => update({ timeUnknown: e.target.checked })} />
            시간을 몰라요 <span className="text-label text-sub">(여섯 글자로 비교해요)</span>
          </label>
        </Field>
        <Field label="상대가 태어난 곳">
          <select className="field" value={p.city} onChange={(e) => update({ city: e.target.value })}>
            {CITIES.map((c) => (
              <option key={c.name} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="상대 MBTI (선택)">
          <select className="field" value={p.mbti} onChange={(e) => update({ mbti: e.target.value })}>
            <option value="">모름 / 입력 안 함</option>
            {MBTI_LIST.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </Field>
        {p.relation === 'ex' && (
          <Field label="헤어진 때 (선택, 연월 6자리)" hint={<Hint error={br.error} note={br.value ? `${br.value.year}년 ${br.value.month}월` : undefined} />}>
            <input
              className="field"
              inputMode="numeric"
              placeholder="예) 202503"
              value={formatYm(p.breakup)}
              onChange={(e) => update({ breakup: e.target.value.replace(/\D/g, '').slice(0, 6) })}
              autoComplete="off"
            />
          </Field>
        )}
      </div>
      <p className="mt-8 text-cap text-sub">상대 정보는 이 기기 안에서만 계산해요. 서버로 보내지 않고, 결과 링크에도 담기지 않아요.</p>
      <button type="submit" className="btn-primary mt-4 w-full" disabled={!valid}>
        {p.relation === 'ex' ? '재회 흐름 보기' : '궁합 보기'}
      </button>
    </form>
  );
}

// ---------------------------------------------------------------------------
// 결과 공통
// ---------------------------------------------------------------------------
const TONE_TAG = { good: 'tag-pos', bad: 'tag-neg', neutral: 'tag-mute' } as const;

function FactorList({ items, empty }: { items: Factor[]; empty: string }) {
  if (!items.length) return <p className="mt-4 text-ui text-sub">{empty}</p>;
  return (
    <ul className="mt-2">
      {items.map((f) => (
        <li key={f.id} className="border-b border-line py-5 last:border-b-0">
          <span className={TONE_TAG[f.tone]}>{f.system}</span>
          <h4 className="mt-2 font-serif text-title3 font-bold text-ink">{f.title}</h4>
          <p className="read mt-2">
            <Lead text={f.text} />
          </p>
          <p className="mt-2 text-cap text-sub">
            <Gloss text={f.basis} />
          </p>
        </li>
      ))}
    </ul>
  );
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

function Notice({ title, text }: { title: string; text: string }) {
  return (
    <div className="mt-5 rounded-xl bg-fill px-4 py-3.5">
      <p className="text-label font-bold text-ink">{title}</p>
      <p className="mt-1 text-label text-sub">{text}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 궁합
// ---------------------------------------------------------------------------
const TIERS = [
  { min: 0, label: '노력 많이' },
  { min: 58, label: '노력하면' },
  { min: 72, label: '잘 맞는 편' },
  { min: 85, label: '아주 잘 맞음' },
];

function TierScale({ score }: { score: number }) {
  const idx = TIERS.reduce((acc, t, i) => (score >= t.min ? i : acc), 0);
  return (
    <div className="mt-4 grid grid-cols-4 gap-1" aria-hidden>
      {TIERS.map((t, i) => (
        <div key={t.label}>
          <div className={`h-1.5 rounded-full ${i <= idx ? 'bg-accent' : 'bg-fill'}`} />
          <p className={`mt-1.5 text-micro ${i === idx ? 'font-bold text-accent' : 'text-sub'}`}>{t.label}</p>
        </div>
      ))}
    </div>
  );
}

const YEAR_KIND: Record<YearSign['kind'], { label: string; tag: string }> = {
  both: { label: '함께 좋은 해', tag: 'tag-pos' },
  bond: { label: '관계에 힘', tag: 'tag-pos' },
  shake: { label: '흔들리는 해', tag: 'tag-neg' },
  split: { label: '엇갈리는 해', tag: 'tag-mute' },
};

function CompatDetail({ r }: { r: CompatReport }) {
  return (
    <>
      <Block title="반복되는 다툼과 푸는 법" desc="두 사람의 구조에서 자주 생기는 갈등이에요.">
        <ol className="space-y-5">
          {r.conflict.map((c, i) => (
            <li key={c.title} className="flex gap-4">
              <span className="w-4 shrink-0 font-serif text-title3 font-bold text-ink tabular-nums">{i + 1}</span>
              <div>
                <p className="font-serif text-[17px] font-bold text-ink">{c.title}</p>
                <p className="read mt-1">{c.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </Block>
      <Block title="서로에게 하면 좋은 말" desc="사주에서 가장 센 기운으로 본 마음 여는 말과 닫는 말이에요.">
        <div className="space-y-4">
          {r.talk.map((t) => (
            <div key={t.who} className="panel">
              <p className="font-serif text-[17px] font-bold text-ink">{t.who}</p>
              <p className="mt-3 flex gap-2.5 text-ui text-ink-2">
                <span className="tag-pos h-fit shrink-0">좋아요</span>
                <span>{t.good}</span>
              </p>
              <p className="mt-2 flex gap-2.5 text-ui text-ink-2">
                <span className="tag-neg h-fit shrink-0">피해요</span>
                <span>{t.avoid}</span>
              </p>
            </div>
          ))}
        </div>
      </Block>
      {r.mbti && (
        <Block title={`MBTI 대화 가이드 · ${r.mbti.me} × ${r.mbti.you}`} desc={r.mbti.summary}>
          <ul className="border-t border-line">
            {r.mbti.axes.map((x) => (
              <li key={x.axis} className="flex gap-4 border-b border-line py-4">
                <span className="w-14 shrink-0 font-serif text-title3 font-bold text-ink">
                  {x.me}
                  <span className="text-sub"> · </span>
                  {x.you}
                </span>
                <div>
                  <p className="text-label font-semibold text-ink">
                    {x.name} {x.same ? <span className="text-accent">같음</span> : <span className="text-sub">다름</span>}
                  </p>
                  <p className="mt-1 text-ui text-ink-2">{x.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </Block>
      )}
      <Block title="앞으로 10년" desc="두 사람의 배우자 자리와 해마다 바뀌는 운을 함께 봤어요.">
        {r.years.length ? (
          <ul className="border-t border-line">
            {r.years.map((y) => (
              <li key={y.year} className="flex gap-4 border-b border-line py-4">
                <span className={`${r.years.some((x) => x.to) ? 'w-[4.5rem]' : 'w-12'} shrink-0 font-serif text-title3 font-bold text-ink tabular-nums`}>
                  {y.to ? `${y.year}–${String(y.to).slice(2)}` : y.year}
                </span>
                <div>
                  <span className={YEAR_KIND[y.kind].tag}>{YEAR_KIND[y.kind].label}</span>
                  <p className="mt-1.5 text-ui text-ink-2">{y.text}</p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-ui text-sub">앞으로 10년 동안 관계를 크게 묶거나 흔드는 해는 두드러지지 않아요.</p>
        )}
      </Block>
      <Block title="오래 가려면">
        <ul className="space-y-3">
          {r.advice.map((t) => (
            <li key={t} className="flex gap-2.5 text-ui text-ink-2">
              <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" />
              {t}
            </li>
          ))}
        </ul>
      </Block>
    </>
  );
}

function CompatView({ a, b, rel }: { a: SajuAnalysis; b: SajuAnalysis; rel: Relation }) {
  const r = useMemo(() => compatReport(a, b), [a, b]);
  const noMbti = !a.input.mbti && !b.input.mbti ? '두 사람' : !a.input.mbti ? '내' : '상대';
  return (
    <>
      <section aria-labelledby="compat-head">
        <p className="kicker">두 사람의 궁합 · {RELATION_LABEL[rel]}</p>
        <h3 id="compat-head" className="mt-2 text-title1 text-ink">
          {r.headline}
        </h3>
        <div className="mt-6 flex items-end gap-2">
          <span className="font-serif text-[56px] leading-none font-bold text-ink tabular-nums">{r.score}</span>
          <span className="pb-1.5 text-ui font-semibold text-sub">점</span>
          <span className="tag-pos mb-2 ml-auto">{r.tier}</span>
        </div>
        <TierScale score={r.score} />
        <p className="mt-4 text-ui text-ink-2">{r.tierText}</p>
        <Notice title="점수는 참고만 하세요" text={SCORE_NOTE} />
      </section>

      <section className="mt-12">
        <h4 className="text-title2 text-ink">잘 맞는 점</h4>
        <FactorList items={r.good.slice(0, 3)} empty="타고난 구조에서 특별히 끌어당기는 점은 두드러지지 않아요. 함께 쌓은 시간이 더 중요한 사이예요." />
      </section>
      <section className="mt-10">
        <h4 className="text-title2 text-ink">부딪히는 점</h4>
        <FactorList items={r.bad.slice(0, 3)} empty="타고난 구조에서 크게 부딪히는 점은 없어요." />
      </section>

      <section className="mt-10">
        <h4 className="text-title2 text-ink">띠와 MBTI로 보면</h4>
        <dl className="mt-4 border-t border-line">
          <div className="flex gap-4 border-b border-line py-4">
            <dt className="w-12 shrink-0 text-label font-semibold text-sub">띠</dt>
            <dd className="text-ui text-ink-2">{r.tti.text}</dd>
          </div>
          <div className="flex gap-4 border-b border-line py-4">
            <dt className="w-12 shrink-0 text-label font-semibold text-sub">MBTI</dt>
            <dd className="text-ui text-ink-2">{r.mbti ? r.mbti.summary : `${noMbti} MBTI를 넣으면 두 사람의 대화 방식까지 비교해 드려요.`}</dd>
          </div>
        </dl>
        <p className="mt-2 text-cap text-sub">띠와 MBTI는 점수에 작게만 반영했어요. 사주의 구조가 중심이에요.</p>
      </section>

      <Premium
        id="compat"
        title="궁합 상세 리포트"
        items={['반복되는 다툼과 푸는 법', '서로에게 하면 좋은 말 · 피해야 할 말', 'MBTI로 본 대화 가이드', '앞으로 10년 — 함께 좋은 해와 흔들리는 해', '오래 가려면']}
      >
        <CompatDetail r={r} />
      </Premium>

      <CoupleShare a={a} b={b} r={r} relation={RELATION_LABEL[rel]} />
    </>
  );
}

// ---------------------------------------------------------------------------
// 재회 — 점수 없음
// ---------------------------------------------------------------------------
function ReunionView({ a, b, p, onEdit }: { a: SajuAnalysis; b: SajuAnalysis; p: PartnerDraft; onEdit: () => void }) {
  const breakup = checkBreakup(p.breakup, a.now).value;
  const months = useMemo(() => upcomingMonths(a, 12), [a]);
  const r = useMemo(() => reunionReport(a, b, breakup, months), [a, b, breakup?.year, breakup?.month, months]); // eslint-disable-line react-hooks/exhaustive-deps
  const c = useMemo(() => compatReport(a, b), [a, b]);
  const head = r.breakup ? (r.breakup.shaken ? '그때는 흔들리기 쉬운 시기였어요' : '시기보다 두 사람 사이의 문제에 가까웠어요') : '다시 만난다면, 이것부터 봐야 해요';
  return (
    <>
      <section aria-labelledby="reunion-head">
        <p className="kicker">재회 흐름</p>
        <h3 id="reunion-head" className="mt-2 text-title1 text-ink">
          {head}
        </h3>
        <Notice title="재회는 점수로 보지 않아요" text={r.note} />
      </section>

      <section className="mt-12">
        <h4 className="text-title2 text-ink">헤어진 시기</h4>
        {r.breakup ? (
          <div className="mt-4">
            <span className={r.breakup.shaken ? 'tag-neg' : 'tag-mute'}>{r.breakup.when}</span>
            <p className="read mt-3">
              <Lead text={r.breakup.text} />
            </p>
            <p className="mt-2 text-cap text-sub">
              <Gloss text={`헤어질 무렵의 운: ${r.breakup.basis}`} />
            </p>
          </div>
        ) : (
          <p className="mt-3 text-ui text-sub">
            헤어진 연월을 넣으면 그 시기의 운이 관계를 흔들었는지 함께 볼게요.{' '}
            <button type="button" className="link" onClick={onEdit}>
              넣으러 가기
            </button>
          </p>
        )}
      </section>

      <section className="mt-12">
        <h4 className="text-title2 text-ink">그래도 끌렸던 이유</h4>
        <FactorList items={c.good.slice(0, 2)} empty="타고난 구조보다 함께한 시간과 상황이 두 사람을 이어 준 사이예요." />
      </section>
      <section className="mt-10">
        <h4 className="text-title2 text-ink">다시 만나면 반복될 수 있는 문제</h4>
        <ul className="mt-2">
          {r.repeat.map((x) => (
            <li key={x.title} className="border-b border-line py-5 last:border-b-0">
              <h5 className="font-serif text-title3 font-bold text-ink">{x.title}</h5>
              <p className="read mt-2">
                <Lead text={x.text} />
              </p>
            </li>
          ))}
        </ul>
      </section>

      <Premium id="reunion" title="재회 상세 리포트" items={['앞으로 12개월 — 연락하기 좋은 달과 피할 달', '지금 할 일 네 가지', '다시 만난다면 서로에게 하면 좋은 말 · 피할 말']}>
        <Block title="연락하기 좋은 달" desc="두 사람의 배우자 자리와 손잡는 달, 내 운이 좋은 달이에요.">
          {r.good.length ? (
            <ul className="border-t border-line">
              {r.good.map((g) => (
                <li key={g.w.startMs} className="border-b border-line py-4">
                  <p className="font-serif text-[17px] font-bold text-ink">{monthTitle(a, g.w)}</p>
                  <p className="mt-1 text-ui text-ink-2">{g.why}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-ui text-sub">앞으로 12개월 안에는 두드러지게 좋은 달이 없어요. 서두르기보다 나를 돌보는 시간으로 쓰세요.</p>
          )}
        </Block>
        <Block title="연락을 피할 달">
          {r.avoid.length ? (
            <ul className="border-t border-line">
              {r.avoid.map((g) => (
                <li key={g.w.startMs} className="border-b border-line py-4">
                  <p className="font-serif text-[17px] font-bold text-ink">{monthTitle(a, g.w)}</p>
                  <p className="mt-1 text-ui text-ink-2">{g.why}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-ui text-sub">앞으로 12개월 안에 관계 자리를 크게 흔드는 달은 없어요.</p>
          )}
        </Block>
        <Block title="지금 할 일">
          <ol className="space-y-4">
            {r.actions.map((t, i) => (
              <li key={t} className="flex gap-4">
                <span className="w-4 shrink-0 font-serif text-title3 font-bold text-accent tabular-nums">{i + 1}</span>
                <p className="read">{t}</p>
              </li>
            ))}
          </ol>
        </Block>
        <Block title="다시 만난다면, 서로에게 하는 말">
          <div className="space-y-4">
            {c.talk.map((t) => (
              <div key={t.who} className="panel">
                <p className="font-serif text-[17px] font-bold text-ink">{t.who}</p>
                <p className="mt-3 flex gap-2.5 text-ui text-ink-2">
                  <span className="tag-pos h-fit shrink-0">좋아요</span>
                  <span>{t.good}</span>
                </p>
                <p className="mt-2 flex gap-2.5 text-ui text-ink-2">
                  <span className="tag-neg h-fit shrink-0">피해요</span>
                  <span>{t.avoid}</span>
                </p>
              </div>
            ))}
          </div>
        </Block>
      </Premium>
    </>
  );
}

// ---------------------------------------------------------------------------
// 패널
// ---------------------------------------------------------------------------
function summary(input: BirthInput, p: PartnerDraft) {
  const pad = (n: number) => String(n).padStart(2, '0');
  const born = `${p.calendar === 'lunar' ? '음력 ' : ''}${input.year}.${pad(input.month)}.${pad(input.day)}`;
  const time = input.hour === null ? '시간 모름' : `${pad(input.hour)}:${pad(input.minute ?? 0)}`;
  return [input.gender === 'male' ? '남성' : '여성', born, time, input.placeName, input.mbti].filter(Boolean).join(' · ');
}

function MatchResult({ a, p, input, onEdit }: { a: SajuAnalysis; p: PartnerDraft; input: BirthInput; onEdit: () => void }) {
  const b = useMemo((): SajuAnalysis | null => {
    try {
      return analyze(input, a.now);
    } catch {
      return null;
    }
  }, [input, a.now]);
  return (
    <>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-label font-semibold text-ink">
            {a.input.name || '나'} × {input.name || '상대'}
          </p>
          <p className="mt-0.5 text-cap text-sub">{summary(input, p)}</p>
        </div>
        <button type="button" className="shrink-0 text-cap font-semibold text-accent" onClick={onEdit}>
          상대 정보 수정
        </button>
      </div>
      <div className="mt-8">
        {!b ? (
          <p className="text-ui text-sub">상대의 사주를 계산하지 못했어요. 입력한 날짜를 다시 확인해 주세요.</p>
        ) : p.relation === 'ex' ? (
          <ReunionView a={a} b={b} p={p} onEdit={onEdit} />
        ) : (
          <CompatView a={a} b={b} rel={p.relation} />
        )}
      </div>
    </>
  );
}

export function MatchPanel({ a }: { a: SajuAnalysis }) {
  const [p, setP] = useState<PartnerDraft>(() => loadPartner(a.input.gender));
  const update = (patch: Partial<PartnerDraft>) =>
    setP((cur) => {
      const next = { ...cur, ...patch };
      savePartner(next);
      return next;
    });
  const input = useMemo(() => partnerInput(p), [p.calendar, p.ymd, p.leap, p.time, p.timeUnknown, p.gender, p.city, p.name, p.mbti]); // eslint-disable-line react-hooks/exhaustive-deps
  // 입력 ↔ 결과를 바꾸면 '궁합 · 재회' 칸의 맨 위로 옮긴다
  const turn = (shown: boolean) => {
    update({ shown });
    window.requestAnimationFrame(() => {
      const row = document.querySelector<HTMLElement>('[data-row="match"]')?.closest('li');
      if (!row) return;
      const head = document.querySelector<HTMLElement>('[data-sticky-head]')?.offsetHeight ?? 56;
      window.scrollTo({ top: row.getBoundingClientRect().top + window.scrollY - head, behavior: 'auto' });
    });
  };
  if (p.shown && input) return <MatchResult a={a} p={p} input={input} onEdit={() => turn(false)} />;
  return <PartnerForm a={a} p={p} update={update} onSubmit={() => turn(true)} />;
}
