import { ELEMENT_HANJA, ELEMENT_KO, STEMS, type Element, type GodRole, type SajuAnalysis, type TenGodGroup } from '../engine/index.ts';
import { elementOfGroup } from '../engine/tenGods.ts';
import { ElementBars, GroupBars, StrengthGauge } from './Charts.tsx';
import { EL_VAR, SectionTitle } from './common.tsx';

const GROUPS: TenGodGroup[] = ['비겁', '식상', '재성', '관성', '인성'];
const GROUP_DESC: Record<TenGodGroup, string> = { 비겁: '나·동료', 식상: '표현·재능', 재성: '재물·현실', 관성: '조직·명예', 인성: '학습·보호' };
const POS_KO: Record<string, string> = { year: '년', month: '월', day: '일', hour: '시', daeun: '대운', seun: '세운' };

export function ElementsPanel({ a }: { a: SajuAnalysis }) {
  const dayEl = STEMS[a.pillars.day.stem].element;
  const tgc = a.elements.tenGodCount;
  return (
    <section className="card">
      <SectionTitle
        id="elements"
        kicker="오행 · 십성"
        title="기운의 분포"
        desc="글자 수만 세지 않고 지장간 비율, 월지(계절) 가중치, 삼합·방합의 합화까지 반영한 실제 세력입니다."
      />
      <div className="grid gap-8 lg:grid-cols-2">
        <div>
          <h3 className="mb-3 text-sm font-bold">오행 세력 (가중)</h3>
          <ElementBars percent={a.elements.percent} count={a.elements.count} />
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            {a.elements.missing.length > 0 && <span className="chip">글자에 없는 오행: {a.elements.missing.map((e) => ELEMENT_KO[e]).join(', ')}</span>}
            {a.elements.excessive.length > 0 && <span className="chip">과다: {a.elements.excessive.map((e) => ELEMENT_KO[e]).join(', ')}</span>}
          </div>
        </div>
        <div>
          <h3 className="mb-3 text-sm font-bold">십성 세력 (일간 제외)</h3>
          <GroupBars
            data={GROUPS.map((g) => ({ label: g, sub: `${GROUP_DESC[g]}·${ELEMENT_KO[elementOfGroup(dayEl, g)]}`, value: a.elements.groupPercent[g], el: elementOfGroup(dayEl, g) }))}
          />
          <div className="mt-4 grid grid-cols-5 gap-1 text-center text-xs">
            {(['비견', '겁재', '식신', '상관', '편재', '정재', '편관', '정관', '편인', '정인'] as const).map((t) => (
              <div key={t} className={`rounded-lg px-1 py-1.5 ${tgc[t] ? 'bg-stone-100 dark:bg-stone-800' : 'text-stone-400'}`}>
                <div>{t}</div>
                <div className="font-bold tabular-nums">{tgc[t]}</div>
              </div>
            ))}
          </div>
          <p className="mt-1.5 text-[11px] text-stone-500">천간 + 지지 본기 기준 개수</p>
        </div>
      </div>
    </section>
  );
}

const ROLE_STYLE: Record<GodRole, string> = {
  용신: 'ring-2 ring-sky-500',
  희신: 'ring-1 ring-sky-300',
  한신: '',
  구신: 'ring-1 ring-rose-300',
  기신: 'ring-2 ring-rose-500',
};
const ROLE_DESC: Record<GodRole, string> = {
  용신: '가장 필요한 기운',
  희신: '용신을 돕는 기운',
  한신: '영향이 적은 기운',
  구신: '기신을 돕는 기운',
  기신: '가장 해로운 기운',
};

export function StrengthPanel({ a }: { a: SajuAnalysis }) {
  const y = a.yongsin;
  const order: GodRole[] = ['용신', '희신', '한신', '구신', '기신'];
  const byRole = Object.fromEntries((Object.entries(y.roles) as [Element, GodRole][]).map(([e, r]) => [r, e])) as Record<GodRole, Element>;
  return (
    <section className="card">
      <SectionTitle id="strength" kicker="신강약 · 격국 · 용신" title="명식의 구조" desc="판단 과정을 모두 공개합니다. 용신은 학파에 따라 달라질 수 있어, 억부·조후를 함께 보여 드립니다." />
      <div className="grid gap-8 lg:grid-cols-2">
        <div>
          <h3 className="mb-3 text-sm font-bold">일간의 힘</h3>
          <StrengthGauge score={a.strength.score} level={a.strength.level} />
          <ul className="mt-4 space-y-1.5 text-sm text-stone-700 dark:text-stone-300">
            {a.strength.reasoning.map((r, i) => (
              <li key={i} className="flex gap-2">
                <span aria-hidden className="text-stone-400">
                  ›
                </span>
                {r}
              </li>
            ))}
          </ul>
        </div>
        <div className="space-y-5">
          <div>
            <h3 className="mb-2 text-sm font-bold">격국</h3>
            <div className="rounded-xl bg-stone-50 p-4 dark:bg-stone-800/50">
              <div className="text-lg font-bold">{a.gyeokguk.name}</div>
              <p className="mt-1 text-sm text-stone-700 dark:text-stone-300">{a.gyeokguk.description}</p>
            </div>
          </div>
          <div>
            <h3 className="mb-2 text-sm font-bold">
              용신 체계 <span className="ml-1 text-xs font-normal text-stone-500">판단 방법: {y.method} · 확실성 {y.confidence}</span>
            </h3>
            <div className="grid grid-cols-5 gap-2">
              {order.map((r) => {
                const e = byRole[r];
                return (
                  <div key={r} className={`rounded-xl bg-white p-2 text-center dark:bg-stone-900 ${ROLE_STYLE[r]} border border-stone-200 dark:border-stone-700`}>
                    <div className="text-[11px] font-semibold text-stone-500">{r}</div>
                    <div className="mt-1 flex items-center justify-center gap-1 text-xl font-bold">
                      <span aria-hidden className="size-2.5 rounded-full" style={{ background: EL_VAR[e] }} />
                      {ELEMENT_KO[e]}
                    </div>
                    <div className="hanja text-xs text-stone-500">{ELEMENT_HANJA[e]}</div>
                    <div className="mt-1 hidden text-[10px] leading-tight text-stone-500 sm:block">{ROLE_DESC[r]}</div>
                  </div>
                );
              })}
            </div>
            <ul className="mt-3 space-y-1.5 text-sm text-stone-700 dark:text-stone-300">
              {y.reasoning.map((r, i) => (
                <li key={i} className="flex gap-2">
                  <span aria-hidden className="text-stone-400">
                    ›
                  </span>
                  {r}
                </li>
              ))}
              {y.johu.stems.length > 0 && (
                <li className="flex gap-2 text-xs text-stone-500">
                  <span aria-hidden>›</span>궁통보감 조후 천간: {y.johu.stems.map((s) => `${STEMS[s].hanja}(${STEMS[s].ko})`).join(' → ')}
                </li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

export function InteractionsPanel({ a }: { a: SajuAnalysis }) {
  const goodSinsal = a.sinsal.filter((s) => s.nature === 'good');
  const otherSinsal = a.sinsal.filter((s) => s.nature !== 'good');
  return (
    <section className="card">
      <SectionTitle id="sinsal" kicker="합충형파해 · 신살" title="글자 사이의 관계" desc="신살은 “있다/없다”보다 어디에 어떻게 놓였는지가 중요합니다. 현대적 의미로 장단점을 함께 적었습니다." />
      <div className="grid gap-8 lg:grid-cols-2">
        <div>
          <h3 className="mb-3 text-sm font-bold">합·충·형·파·해</h3>
          {a.interactions.length === 0 ? (
            <p className="text-sm text-stone-500">원국 안에 뚜렷한 합·충·형 관계가 없습니다. 글자들이 서로 간섭하지 않아 성향이 비교적 일관됩니다.</p>
          ) : (
            <ul className="space-y-2">
              {a.interactions.map((it, i) => (
                <li key={i} className="flex items-start gap-3 rounded-lg bg-stone-50 px-3 py-2 dark:bg-stone-800/50">
                  <span
                    className={`mt-0.5 shrink-0 rounded-md px-1.5 py-0.5 text-xs font-bold ${
                      it.kind.includes('합') ? 'bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-100' : 'bg-rose-100 text-rose-900 dark:bg-rose-950 dark:text-rose-100'
                    }`}
                  >
                    {it.kind}
                  </span>
                  <div className="text-sm">
                    <span className="hanja font-bold">{it.chars}</span>
                    <span className="ml-1 text-xs text-stone-500">({it.positions.map((p) => POS_KO[p]).join('·')}){it.adjacent ? ' · 인접' : ''}</span>
                    <div className="text-stone-700 dark:text-stone-300">{it.description}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <h3 className="mb-3 text-sm font-bold">신살</h3>
          <ul className="space-y-2">
            {[...goodSinsal, ...otherSinsal].map((s) => (
              <li key={s.name} className="rounded-lg border border-stone-200 px-3 py-2 dark:border-stone-800">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold">{s.name}</span>
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                      s.nature === 'good'
                        ? 'bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-100'
                        : s.nature === 'bad'
                          ? 'bg-rose-100 text-rose-900 dark:bg-rose-950 dark:text-rose-100'
                          : 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-100'
                    }`}
                  >
                    {s.nature === 'good' ? '길신' : s.nature === 'bad' ? '흉살' : '양면'}
                  </span>
                  <span className="text-xs text-stone-500">{s.positions.map((p) => POS_KO[p] + '주').join('·')} · {s.basis}</span>
                </div>
                <p className="mt-1 text-sm text-stone-700 dark:text-stone-300">{s.meaning}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

