/** 전문 분석 탭 — 사주를 몰라도 읽히도록 쉬운 말을 앞에, 전문 용어는 회색 꼬리표로 */
import type { ReactNode } from 'react';
import { ELEMENT_HANJA, STEMS, type Element, type GodRole, type Interaction, type SajuAnalysis, type TenGodGroup } from '../engine/index.ts';
import { josa } from '../engine/josa.ts';
import { elementOfGroup } from '../engine/tenGods.ts';
import {
  EL_FORCE, EL_WORD, GROUP_PLAIN, GYEOK_PLAIN, INTER_PLAIN, LEVEL_PLAIN, POS_LIFE, POS_SHORT, ROLE_PLAIN, SINSAL_NICK, TEN_GOD_PLAIN,
  elWord, strengthChecks, yongsinWhy,
} from '../report/plain.ts';
import { ElementBars, GroupBars, TugBar } from './Charts.tsx';
import { Disclosure, EL_VAR, Gloss, SectionTitle, Term } from './common.tsx';

const GROUPS: TenGodGroup[] = ['비겁', '식상', '재성', '관성', '인성'];

function Step({ no, title, children }: { no: string; title: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-stone-200 p-4 sm:p-5 dark:border-stone-800">
      <div className="text-xs font-bold text-brand-700 dark:text-brand-300">
        {no} {title}
      </div>
      {children}
    </div>
  );
}

function Expert({ lines }: { lines: string[] }) {
  return (
    <div className="mt-4">
      <Disclosure summary={<span className="text-stone-500">전문가용 판단 근거 보기</span>}>
        <ul className="space-y-1.5 text-sm text-stone-700 dark:text-stone-300">
          {lines.map((r, i) => (
            <li key={i} className="flex gap-2">
              <span aria-hidden className="text-stone-400">
                ›
              </span>
              <span>
                <Gloss text={r} />
              </span>
            </li>
          ))}
        </ul>
      </Disclosure>
    </div>
  );
}

export function ElementsPanel({ a }: { a: SajuAnalysis }) {
  const me = STEMS[a.pillars.day.stem].element;
  const pc = a.elements.percent;
  const tgc = a.elements.tenGodCount;
  const order = (Object.keys(pc) as Element[]).sort((x, y) => pc[y] - pc[x]);
  const top = order[0];
  const missing = a.elements.missing;
  const gp = a.elements.groupPercent;
  const gTop = [...GROUPS].sort((x, y) => gp[y] - gp[x])[0];
  return (
    <section className="card">
      <SectionTitle
        id="elements"
        kicker="오행 · 십성"
        title="내 사주의 다섯 기운"
        desc="사주 여덟 글자는 나무·불·흙·쇠·물 다섯 기운으로 이루어져 있어요. 막대가 길수록 그 기운이 강해요. 글자 수만 세지 않고 태어난 계절과 글자 속에 숨은 기운까지 반영한 실제 세기예요."
      />
      <div className="grid gap-8 lg:grid-cols-2">
        <div>
          <h3 className="mb-3 text-sm font-bold">
            다섯 기운의 세기 <span className="font-normal text-stone-500">· <Term t="오행" /></span>
          </h3>
          <ElementBars percent={pc} count={a.elements.count} me={me} />
          <ul className="mt-4 space-y-1.5 text-sm text-stone-700 dark:text-stone-300">
            <li>
              <b>‘나’는 {josa(elWord(me), '이에요/예요')}.</b> {EL_FORCE[me].force}({EL_FORCE[me].keys})을 타고났어요.
            </li>
            <li>
              <b>
                가장 강한 기운은 {elWord(top)}, {pc[top].toFixed(0)}%예요.
              </b>{' '}
              {top === me ? '나와 같은 기운이라 내 색깔이 진하게 드러나요.' : `${EL_FORCE[top].force}(${EL_FORCE[top].keys})이 삶에서 크게 작용해요.`}
            </li>
            {missing.length > 0 && (
              <li>
                <b>글자에 없는 기운: {missing.map(elWord).join('·')}</b> — 없다고 나쁜 건 아니지만, 그 기운이 맡는 일({missing.map((e) => EL_FORCE[e].keys).join(' / ')})은 의식해서 채워야 해요.
              </li>
            )}
          </ul>
        </div>
        <div>
          <h3 className="mb-1 text-sm font-bold">
            나와의 관계로 본 다섯 가지 힘 <span className="font-normal text-stone-500">· <Term t="십성" /></span>
          </h3>
          <p className="mb-3 text-xs leading-relaxed text-stone-500">같은 기운도 ‘나’와 어떤 사이냐에 따라 뜻이 달라져요. 나를 뺀 나머지 글자의 힘을 다섯 갈래로 나눴어요.</p>
          <GroupBars
            data={GROUPS.map((g) => {
              const el = elementOfGroup(me, g);
              return {
                label: GROUP_PLAIN[g].name,
                sub: (
                  <>
                    <Term t={g} /> · {GROUP_PLAIN[g].who}
                  </>
                ),
                value: gp[g],
                el,
              };
            })}
          />
          <p className="mt-3 text-sm text-stone-700 dark:text-stone-300">
            가장 큰 힘은 <b>{GROUP_PLAIN[gTop].name}</b>({gp[gTop].toFixed(0)}%)이에요. 삶에서 {GROUP_PLAIN[gTop].who} 이야기가 자주 중심에 놓여요.
          </p>
          <div className="mt-4 grid grid-cols-5 gap-1 text-center text-xs">
            {(['비견', '겁재', '식신', '상관', '편재', '정재', '편관', '정관', '편인', '정인'] as const).map((t) => (
              <div key={t} className={`rounded-lg px-0.5 py-1.5 ${tgc[t] ? 'bg-stone-100 dark:bg-stone-800' : 'text-stone-400'}`}>
                <div className="font-semibold">{t}</div>
                <div className="text-[10px] leading-tight opacity-80">{TEN_GOD_PLAIN[t]}</div>
                <div className="mt-0.5 font-bold tabular-nums">{tgc[t]}</div>
              </div>
            ))}
          </div>
          <p className="mt-1.5 text-[11px] text-stone-500">열 가지로 더 잘게 나눈 글자 수(위 글자 + 아래 글자의 주된 기운)</p>
        </div>
      </div>
    </section>
  );
}

const TILE: Record<GodRole, string> = { 용신: '가장 필요', 희신: '도와줌', 한신: '무난', 구신: '부담 키움', 기신: '가장 부담' };
const TILE_STYLE: Record<GodRole, string> = {
  용신: 'border-sky-500 bg-sky-50 ring-2 ring-sky-500 dark:bg-sky-950/40',
  희신: 'border-sky-300 bg-sky-50/50 dark:border-sky-800 dark:bg-sky-950/20',
  한신: 'border-stone-200 bg-white dark:border-stone-700 dark:bg-stone-900',
  구신: 'border-rose-300 bg-rose-50/50 dark:border-rose-800 dark:bg-rose-950/20',
  기신: 'border-rose-500 bg-rose-50 ring-2 ring-rose-500 dark:bg-rose-950/40',
};

export function StrengthPanel({ a }: { a: SajuAnalysis }) {
  const st = a.strength;
  const lv = LEVEL_PLAIN[st.level];
  const checks = strengthChecks(a);
  const y = a.yongsin;
  const why = yongsinWhy(a);
  const order: GodRole[] = ['용신', '희신', '한신', '구신', '기신'];
  const byRole = Object.fromEntries((Object.entries(y.roles) as [Element, GodRole][]).map(([e, r]) => [r, e])) as Record<GodRole, Element>;
  const gk = GYEOK_PLAIN[a.gyeokguk.name];
  const strongTerm = st.score >= 48 ? '신강' : '신약';
  return (
    <section className="card">
      <SectionTitle
        id="strength"
        kicker="사주의 힘 · 필요한 기운 · 큰 틀"
        title="내 사주는 어떤 구조일까?"
        desc="사주를 몰라도 읽을 수 있게 풀었어요. 회색 글씨는 전문 용어이고, 점선 밑줄이 있는 말은 누르면 뜻이 나와요."
      />
      <div className="space-y-4">
        <Step no="①" title="내 힘은 센 편일까, 약한 편일까?">
          <div className="mt-1 flex flex-wrap items-baseline gap-x-2">
            <span className="text-2xl font-extrabold">{lv.title}</span>
            <span className="text-sm text-stone-500">
              <Term t={st.level.startsWith('중화') ? st.level : strongTerm}>{st.level}</Term> · {st.score.toFixed(1)}%
            </span>
          </div>
          <div className="mt-4">
            <TugBar mine={st.score} />
          </div>
          <p className="mt-4 text-[15px] leading-relaxed text-stone-800 dark:text-stone-200">{lv.desc}</p>
          {st.score < 48 && <p className="mt-2 text-sm text-stone-600 dark:text-stone-400">‘약하다’는 건 나쁘다는 뜻이 아니에요. 내 엔진과 짊어진 짐의 비율일 뿐이에요.</p>}
          <h4 className="mt-5 text-sm font-bold">이렇게 판단했어요</h4>
          <ul className="mt-2 space-y-2">
            {checks.map((c) => (
              <li key={c.term} className="flex gap-3 rounded-xl bg-stone-50 p-3 dark:bg-stone-800/50">
                <span
                  aria-label={c.ok ? '예' : '아니요'}
                  className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-sm font-bold ${c.ok ? 'bg-sky-600 text-white' : 'bg-stone-300 text-stone-700 dark:bg-stone-600 dark:text-stone-200'}`}
                >
                  {c.ok ? '✓' : '×'}
                </span>
                <div className="min-w-0">
                  <div className="text-sm font-bold">
                    {c.q} <span className="ml-0.5 text-xs font-normal text-stone-500"><Term t={c.term} /></span>
                  </div>
                  <p className="mt-0.5 text-sm leading-relaxed text-stone-700 dark:text-stone-300">{c.text}</p>
                </div>
              </li>
            ))}
          </ul>
          <Expert lines={st.reasoning} />
        </Step>

        <Step no="②" title="나에게 필요한 기운, 부담되는 기운">
          <div className="mt-1 text-2xl font-extrabold">{josa(elWord(y.yongsin), '이/가')} 가장 필요해요</div>
          <div className="text-sm text-stone-500">
            <Term t="용신">용신</Term> · 기울어진 균형을 맞춰 주는 기운
          </div>
          <p className="mt-3 text-[15px] leading-relaxed text-stone-800 dark:text-stone-200">
            {why.why} {why.final}
          </p>
          <div className="mt-4 grid grid-cols-5 gap-1.5">
            {order.map((r) => {
              const e = byRole[r];
              return (
                <div key={r} className={`rounded-xl border px-0.5 py-1.5 text-center ${TILE_STYLE[r]}`}>
                  <div className="text-[11px] leading-tight font-bold text-stone-600 dark:text-stone-300">{TILE[r]}</div>
                  <div className="mt-1 flex items-center justify-center gap-1 text-[15px] font-extrabold whitespace-nowrap sm:text-lg">
                    <span aria-hidden className="hidden size-2 shrink-0 rounded-full sm:inline-block" style={{ background: EL_VAR[e] }} />
                    {EL_WORD[e]}
                  </div>
                  <div className="hanja text-xs text-stone-500">{ELEMENT_HANJA[e]}</div>
                  <div className="mt-0.5 text-[10px] text-stone-500">
                    <Term t={r} />
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-sm leading-relaxed text-stone-700 dark:text-stone-300">
            쉽게 말해 {elWord(y.yongsin)}·{elWord(y.heesin)} 기운이 들어오는 해·사람·환경은 힘이 되고, {elWord(y.gisin)}·{elWord(y.gusin)} 기운이 강해지는 때는 무리하지 않는 게 좋아요. 색·음식·습관으로 채우는 법은 풀이 리포트의 ‘개운법’ 탭에 있어요.
          </p>
          <p className="mt-1.5 text-xs text-stone-500">
            {ROLE_PLAIN.용신.long}을 찾는 방법은 학파마다 조금씩 달라요. {why.sure}
          </p>
          <Expert
            lines={[
              ...y.reasoning,
              `판단 방법: ${y.method} · 확실성 ${y.confidence}`,
              ...(y.johu.stems.length ? [`궁통보감 조후 천간: ${y.johu.stems.map((s) => `${STEMS[s].hanja}(${STEMS[s].ko})`).join(' → ')}`] : []),
            ]}
          />
        </Step>

        {gk && (
          <Step no="③" title="사주의 큰 틀 — 타고난 역할">
            <div className="mt-1 text-2xl font-extrabold">{gk.title}</div>
            <div className="text-sm text-stone-500">
              <Term t={a.gyeokguk.name}>{a.gyeokguk.name}</Term> · 태어난 달의 기운으로 정하는 사주의 틀이에요
            </div>
            <p className="mt-3 text-[15px] leading-relaxed text-stone-800 dark:text-stone-200">
              {gk.text}
              {!a.gyeokguk.transparent && ' 다만 이 구조가 겉으로 뚜렷하게 드러난 편은 아니라, 성향이 은근하게 나타나요.'}
            </p>
            <Expert lines={[`${a.gyeokguk.name}: ${a.gyeokguk.description}`]} />
          </Step>
        )}
      </div>
    </section>
  );
}

/** 글자 관계를 쉬운 말로 */
function interPlain(it: Interaction): string {
  switch (it.kind) {
    case '천간합':
    case '육합':
      return '손을 잡아 서로 묶여요. 협력과 인연이 생기지만, 각자의 색깔은 옅어질 수 있어요.';
    case '삼합':
    case '반합':
    case '방합':
      return it.element ? `뭉쳐서 ${elWord(it.element)} 기운이 강해져요.` : '뭉쳐서 한 기운이 강해져요.';
    case '천간충':
      return '생각과 결정이 서로 부딪혀요. 마음이 자주 흔들릴 수 있어요.';
    case '육충':
      return '정면으로 부딪혀요. 이동·변동·헤어짐이 잦을 수 있어요.';
    case '삼형':
    case '형':
      return '서로 긁어 대요. 마찰·다툼, 수술·서류 문제를 조심하라는 신호예요.';
    case '자형':
      return '같은 글자끼리 부딪혀 스스로를 괴롭혀요. 자책하기 쉬워요.';
    case '파':
      return '계획이 깨지거나 어긋나기 쉬워요.';
    case '해':
      return '은근히 방해하고 서운함이 쌓이기 쉬워요.';
    case '원진':
      return '끌리면서도 미운, 애증이 생기기 쉬워요.';
    case '귀문':
      return '촉이 좋고 예민해요. 신경이 날카로워지기 쉬워요.';
  }
}

const NATURE: Record<'good' | 'bad' | 'mixed', { label: string; cls: string }> = {
  good: { label: '도움이 되는 별', cls: 'bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-100' },
  bad: { label: '조심할 별', cls: 'bg-rose-100 text-rose-900 dark:bg-rose-950 dark:text-rose-100' },
  mixed: { label: '양날의 별', cls: 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-100' },
};

export function InteractionsPanel({ a }: { a: SajuAnalysis }) {
  const goodSinsal = a.sinsal.filter((s) => s.nature === 'good');
  const otherSinsal = a.sinsal.filter((s) => s.nature !== 'good');
  return (
    <section className="card">
      <SectionTitle
        id="sinsal"
        kicker="합·충 · 신살"
        title="글자끼리의 사이"
        desc="사주 글자들끼리도 손을 잡는 짝, 부딪히는 짝이 있어요. 손을 잡으면 협력·인연을, 부딪히면 변화·마찰을 뜻해요. 신살은 글자 조합에 붙는 별명으로, 좋은 쪽과 조심할 쪽이 함께 있어요."
      />
      <div className="grid gap-8 lg:grid-cols-2">
        <div>
          <h3 className="mb-3 text-sm font-bold">손잡는 글자, 부딪히는 글자</h3>
          {a.interactions.length === 0 ? (
            <p className="text-sm text-stone-500">사주 안에 뚜렷하게 손잡거나 부딪히는 글자가 없어요. 글자들이 서로 간섭하지 않아 성향이 비교적 한결같아요.</p>
          ) : (
            <ul className="space-y-2">
              {a.interactions.map((it, i) => {
                const good = it.kind.includes('합');
                return (
                  <li key={i} className="rounded-xl bg-stone-50 px-3 py-2.5 dark:bg-stone-800/50">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className={`rounded-md px-1.5 py-0.5 text-xs font-bold ${good ? 'bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-100' : 'bg-rose-100 text-rose-900 dark:bg-rose-950 dark:text-rose-100'}`}>
                        {INTER_PLAIN[it.kind] ?? it.kind}
                      </span>
                      <span className="hanja font-bold">{it.chars}</span>
                      <span className="text-xs text-stone-500">
                        <Term t={it.kind} />
                        {it.adjacent ? ' · 바로 옆이라 힘이 큼' : ''}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-stone-500">{it.positions.map((p) => POS_LIFE[p] ?? p).join(' ↔ ')}</div>
                    <p className="mt-0.5 text-sm text-stone-800 dark:text-stone-200">{interPlain(it)}</p>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <div>
          <h3 className="mb-3 text-sm font-bold">
            사주에 붙은 별명 <span className="font-normal text-stone-500">· <Term t="신살" /></span>
          </h3>
          <ul className="space-y-2">
            {[...goodSinsal, ...otherSinsal].map((s) => (
              <li key={s.name} className="rounded-xl border border-stone-200 px-3 py-2.5 dark:border-stone-800">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="font-bold">{SINSAL_NICK[s.name] ?? s.name}</span>
                  <span className="text-xs text-stone-500">
                    <Term t={s.name.replace(/\(.*\)$/, '')}>{s.name}</Term>
                  </span>
                  <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${NATURE[s.nature].cls}`}>{NATURE[s.nature].label}</span>
                </div>
                <p className="mt-1 text-sm text-stone-800 dark:text-stone-200">
                  <Gloss text={s.meaning} />
                </p>
                <p className="mt-0.5 text-[11px] text-stone-500">
                  자리: {s.positions.map((p) => POS_SHORT[p] ?? POS_LIFE[p] ?? p).join('·')} · {s.basis}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
