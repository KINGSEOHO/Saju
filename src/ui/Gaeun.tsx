/**
 * 개운법 화면 조각 — 고민 리포트(고민별 개운법)와 궁합(두 사람의 개운법)이 함께 쓴다.
 *  - GaeunTaste: 무료 부분에서 한 가지만 먼저 보여 주는 카드
 *  - GaeunDetail: 상세 리포트 안의 가까이할 것 · 멀리할 것 · 매일 체크하는 루틴
 */
import { useState } from 'react';
import type { ConcernGaeun, GaeunItem } from '../report/gaeun.ts';
import { Gloss, Lead } from './common.tsx';

/** 가까이할 것 / 멀리할 것 한 묶음 */
export function GaeunRows({ title, note, items, tone }: { title: string; note?: string; items: GaeunItem[]; tone: 'close' | 'away' }) {
  return (
    <div>
      <p className={`text-label font-semibold ${tone === 'close' ? 'text-accent' : 'text-ink'}`}>{title}</p>
      {note && <p className="mt-0.5 text-cap text-sub">{note}</p>}
      <dl className="mt-3 border-t border-line">
        {items.map((it) => (
          <div key={it.key} className="grid grid-cols-[5.5rem_1fr] gap-3 border-b border-line py-4">
            <dt className="pt-0.5 text-label font-semibold text-sub">{it.label}</dt>
            <dd className="min-w-0">
              <p className="font-serif text-[16px] leading-[1.75] text-ink-2">
                <Gloss text={it.value} />
              </p>
              <p className="mt-1.5 text-cap text-sub">
                <Gloss text={`근거 · ${it.basis}`} />
              </p>
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/** 오늘 날짜 (이 기기 기준) — 체크는 날마다 새로 */
function today() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}
const routineKey = (id: string) => `gaeun-routine-${id}-${today()}`;

function GaeunRoutine({ id, routine }: { id: string; routine: { text: string; basis: string }[] }) {
  const [done, setDone] = useState<number[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(routineKey(id)) ?? '[]') as number[];
    } catch {
      return [];
    }
  });
  const toggle = (i: number) => {
    const next = done.includes(i) ? done.filter((x) => x !== i) : [...done, i];
    setDone(next);
    try {
      localStorage.setItem(routineKey(id), JSON.stringify(next));
    } catch {
      /* 저장이 안 되는 브라우저에서도 화면은 그대로 */
    }
  };
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-label font-semibold text-ink">오늘부터 하는 개운 루틴</p>
        <span className="text-label text-sub tabular-nums">
          오늘 {done.length}/{routine.length}
        </span>
      </div>
      <ul className="mt-3 border-t border-line">
        {routine.map((r, i) => (
          <li key={r.text} className="border-b border-line">
            <label className="flex cursor-pointer items-start gap-3 py-4">
              <input type="checkbox" className="mt-0.5 size-5 shrink-0 accent-accent" checked={done.includes(i)} onChange={() => toggle(i)} />
              <span className={`text-ui ${done.includes(i) ? 'text-faint line-through' : 'text-ink'}`}>
                {r.text}
                <span className="ml-1.5 text-cap text-sub">({r.basis})</span>
              </span>
            </label>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-cap text-sub">체크는 이 기기에만 저장돼요. 3주만 이어 가 보세요.</p>
    </div>
  );
}

/** 상세 리포트 안의 고민별 개운법 */
export function GaeunDetail({ id, g }: { id: string; g: ConcernGaeun }) {
  return (
    <div className="space-y-10">
      <p className="read">
        <Lead text={g.why} />
      </p>
      <GaeunRows title="가까이할 것" note="부족한 기운을 채워 주는 것들" items={g.close} tone="close" />
      <GaeunRows title="멀리할 것" note="이미 넘치는 기운을 더 키우는 것들" items={g.away} tone="away" />
      {g.year && (
        <div className="panel">
          <p className={`text-label font-semibold ${g.year.tone === 'good' ? 'text-accent' : g.year.tone === 'bad' ? 'text-ink' : 'text-sub'}`}>{g.year.title}</p>
          <p className="read mt-2">
            <Gloss text={g.year.text} />
          </p>
          <p className="mt-2 text-cap text-sub">
            <Gloss text={`근거 · ${g.year.basis}`} />
          </p>
        </div>
      )}
      <GaeunRoutine id={id} routine={g.routine} />
      <p className="text-cap text-sub">색·방향·숫자는 전통적으로 쓰이는 상징이에요. 물건이 운을 바꾸지는 않아요. 실제로 도움이 되는 건 매일의 습관이에요.</p>
    </div>
  );
}

/** 무료 부분의 맛보기 — 이 고민의 개운법 한 가지 */
export function GaeunTaste({ g }: { g: ConcernGaeun }) {
  const t = g.taste;
  // 맛보기는 가까이할 것일 수도, 멀리할 것(예: 돈이 새는 길)일 수도 있다
  const side = g.close.includes(t) ? 'close' : g.away.includes(t) ? 'away' : null;
  const rest = g.close.length + g.away.length - (side ? 1 : 0);
  return (
    <section className="mt-12 rounded-2xl border border-line px-5 py-5" aria-label={`${g.title} 한 가지`}>
      <p className="kicker">{g.title} · 하나 먼저</p>
      <div className="mt-4 flex gap-4">
        <span aria-hidden className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent-soft font-serif text-title3 font-bold text-accent">
          {t.icon}
        </span>
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2 text-label font-semibold text-sub">
            {t.label}
            {side && <span className={side === 'close' ? 'tag-pos' : 'tag-neg'}>{side === 'close' ? '가까이할 것' : '멀리할 것'}</span>}
          </p>
          <p className="mt-1 font-serif text-[17px] leading-[1.7] font-bold text-ink">
            <Gloss text={t.value} />
          </p>
          <p className="mt-1.5 text-cap text-sub">
            <Gloss text={`근거 · ${t.basis}`} />
          </p>
        </div>
      </div>
      <p className="mt-4 border-t border-line pt-3 text-label text-ink-2">나머지 {rest}가지와 매일 체크하는 개운 루틴은 상세 리포트에 있어요.</p>
    </section>
  );
}
