import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { analyze, ELEMENT_KO, pillarHanja, type BirthInput, type SajuAnalysis } from './engine/index.ts';
import { flushQueue, send, sessionId } from './lib/api.ts';
import { decodeInput, encodeInput } from './lib/share.ts';
import { generateReport } from './report/generate.ts';
import { Admin } from './ui/Admin.tsx';
import { ElementsPanel, InteractionsPanel, StrengthPanel } from './ui/Analysis.tsx';
import { BirthForm } from './ui/BirthForm.tsx';
import { GLOSSARY, Term } from './ui/common.tsx';
import { ReviewForm } from './ui/Feedback.tsx';
import { LuckPanel } from './ui/Luck.tsx';
import { Manseryeok, PillarHeader } from './ui/Manseryeok.tsx';
import { ReportView } from './ui/ReportView.tsx';

type Route = { name: 'home' } | { name: 'result'; input: BirthInput } | { name: 'admin' };

function parseRoute(): Route {
  const h = window.location.hash.replace(/^#/, '');
  if (h.startsWith('/admin')) return { name: 'admin' };
  if (h.startsWith('/r?')) {
    const input = decodeInput(h.slice(3));
    if (input) return { name: 'result', input };
  }
  return { name: 'home' };
}

export default function App() {
  const [route, setRoute] = useState<Route>(parseRoute);
  useEffect(() => {
    const on = () => setRoute(parseRoute());
    window.addEventListener('hashchange', on);
    flushQueue();
    return () => window.removeEventListener('hashchange', on);
  }, []);

  return (
    <div className="min-h-screen">
      <header className="no-print sticky top-0 z-30 border-b border-stone-200/80 bg-paper/90 backdrop-blur dark:border-stone-800 dark:bg-stone-950/90">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <a href="#/" className="flex items-center gap-2.5 font-bold">
            <span className="hanja flex size-8 items-center justify-center rounded-full bg-brand-800 text-white dark:bg-brand-300 dark:text-brand-900">命</span>
            <span className="text-lg tracking-tight">명경사주</span>
            <span className="rounded-md bg-emerald-100 px-1.5 py-0.5 text-[11px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">베타 무료</span>
          </a>
          {route.name === 'result' && (
            <a href="#/" className="text-sm font-semibold text-brand-700 hover:underline dark:text-brand-300">
              새로 보기
            </a>
          )}
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 pt-6 pb-24 sm:pt-10">
        {route.name === 'home' && <Home />}
        {route.name === 'result' && <Result input={route.input} />}
        {route.name === 'admin' && <Admin />}
      </main>
      <footer className="no-print border-t border-stone-200 py-8 text-center text-xs leading-relaxed text-stone-500 dark:border-stone-800">
        명경사주(明鏡四柱) — 맑은 거울처럼 있는 그대로.
        <br />
        사주 해석은 전통적 경향에 대한 참고 자료이며 의학·법률·투자 판단을 대신하지 않습니다.
      </footer>
    </div>
  );
}

function Home() {
  const go = (i: BirthInput) => {
    window.location.hash = `/r?${encodeInput(i)}`;
    window.scrollTo({ top: 0 });
  };
  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_1.1fr] lg:items-start">
      <div className="lg:sticky lg:top-24">
        <p className="text-sm font-semibold text-brand-700 dark:text-brand-300">정밀 만세력 · 근거 있는 사주 풀이</p>
        <h1 className="mt-2 text-[2rem] leading-[1.25] font-extrabold tracking-tight sm:text-[2.6rem]">
          정확하게 계산하고,
          <br />
          있는 그대로 말합니다.
        </h1>
        <p className="mt-5 text-base text-stone-600 dark:text-stone-400">
          좋은 말만 늘어놓지 않습니다. 성향·연애·이직·재물·건강을 <b className="text-stone-900 dark:text-stone-100">강점과 약점 모두</b>, 왜 그렇게 보는지 근거와 함께 알려 드립니다.
        </p>
        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          {[
            ['🔭', '천문 계산 만세력', '절기·합삭을 천문학 공식으로 직접 계산해요.'],
            ['🕰️', '출생 시각 자동 보정', '서머타임·표준시 변경·출생지 경도까지 반영해요.'],
            ['✅', '한국천문연구원과 일치', '1900~2050년 음력 전 구간을 대조 검증했어요.'],
            ['⚖️', '좋은 말만 하지 않기', '모든 해석에 강점·약점·주의와 근거를 붙여요.'],
          ].map(([icon, t, d]) => (
            <div key={t} className="rounded-2xl border border-stone-200 bg-white/70 p-4 dark:border-stone-800 dark:bg-stone-900/60">
              <div className="text-xl" aria-hidden>
                {icon}
              </div>
              <div className="mt-1.5 font-bold">{t}</div>
              <div className="mt-0.5 text-sm text-stone-600 dark:text-stone-400">{d}</div>
            </div>
          ))}
        </div>
      </div>
      <BirthForm onSubmit={go} />
    </div>
  );
}

type MainTab = 'report' | 'luck' | 'chart' | 'detail';
const MAIN_TABS: { id: MainTab; label: string; desc: string }[] = [
  { id: 'report', label: '풀이 리포트', desc: '성향·연애·직업·재물·건강' },
  { id: 'luck', label: '운의 흐름', desc: '대운·올해·이번 달' },
  { id: 'chart', label: '만세력', desc: '사주 원국과 계산 근거' },
  { id: 'detail', label: '전문 분석', desc: '오행·용신·신살' },
];

function Result({ input }: { input: BirthInput }) {
  const [now] = useState(() => Date.now());
  const result = useMemo((): { a: SajuAnalysis } | { error: string } => {
    try {
      return { a: analyze(input, now) };
    } catch (e) {
      return { error: e instanceof Error ? e.message : String(e) };
    }
  }, [input, now]);
  const [editing, setEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState<MainTab>('report');
  const tabsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if ('a' in result) {
      send('events', { sessionId: sessionId(), type: 'analyze', meta: { dayStem: result.a.pillars.day.stem, gender: input.gender, timeKnown: result.a.pillars.timeKnown } });
    }
  }, [result, input.gender]);

  const summary = useMemo(() => ('a' in result ? generateReport(result.a).sections.find((s) => s.id === 'summary') : undefined), [result]);

  if ('error' in result) {
    return (
      <div className="card">
        <p className="text-rose-700 dark:text-rose-300">{result.error}</p>
        <a href="#/" className="btn-ghost mt-4">
          다시 입력하기
        </a>
      </div>
    );
  }
  const a = result.a;
  const p = a.pillars;
  const title = input.name ? `${input.name}님의 사주` : '사주 풀이 결과';
  const share = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* 클립보드 불가 */
    }
  };
  const selectTab = (t: MainTab) => {
    setTab(t);
    const top = (tabsRef.current?.getBoundingClientRect().top ?? 0) + window.scrollY - 56;
    if (window.scrollY > top) window.scrollTo({ top });
  };
  const strengths = summary?.blocks.find((b) => b.heading.includes('무기'))?.items ?? [];
  const weaknesses = summary?.blocks.find((b) => b.heading.includes('약점'))?.items ?? [];
  const clean = (t: string) => t.replace(/^\[[^\]]+\]\s*/, '').replace(/^그러나 과하면:\s*/, '');
  const facts: { label: string; value: ReactNode; term: string }[] = [
    { label: '일주', value: <span className="hanja text-lg">{pillarHanja(p.day)}</span>, term: '일주' },
    { label: '타고난 힘', value: a.strength.level, term: a.strength.score >= 48 ? '신강' : '신약' },
    { label: '필요한 기운', value: `${ELEMENT_KO[a.yongsin.yongsin]} (용신)`, term: '용신' },
    { label: '지금의 10년', value: a.currentDaeun ? <span className="hanja text-lg">{pillarHanja(a.currentDaeun.pillar)}</span> : '-', term: '대운' },
  ];

  return (
    <div className="space-y-6">
      <section className="card">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold sm:text-3xl">{title}</h1>
            <p className="mt-1.5 text-sm text-stone-600 dark:text-stone-400">
              {input.gender === 'male' ? '남성' : '여성'} · 양력 {p.solarDate.year}년 {p.solarDate.month}월 {p.solarDate.day}일 (음력 {p.lunarDate.leap ? '윤' : ''}
              {p.lunarDate.month}월 {p.lunarDate.day}일)
              {p.timeKnown ? ` ${String(input.hour).padStart(2, '0')}:${String(input.minute ?? 0).padStart(2, '0')}` : ' · 시간 모름'} · {input.placeName} · 만 {a.age}세
            </p>
          </div>
          <div className="no-print flex gap-2">
            <button type="button" className="btn-ghost" onClick={() => setEditing((e) => !e)}>
              {editing ? '닫기' : '정보 수정'}
            </button>
            <button type="button" className="btn-ghost" onClick={share}>
              {copied ? '✓ 복사됨' : '링크 복사'}
            </button>
          </div>
        </div>
        {editing && (
          <div className="mt-5">
            <BirthForm
              initial={input}
              onSubmit={(i) => {
                setEditing(false);
                window.location.hash = `/r?${encodeInput(i)}`;
              }}
            />
          </div>
        )}

        <div className="mt-7">
          <PillarHeader a={a} />
        </div>

        <div className="mt-7 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {facts.map((f) => (
            <div key={f.label} className="rounded-2xl bg-stone-50 px-4 py-3 dark:bg-stone-800/60">
              <div className="text-xs text-stone-500">
                <Term t={f.term}>{f.label}</Term>
              </div>
              <div className="mt-0.5 text-base font-bold">{f.value}</div>
            </div>
          ))}
        </div>

        {(strengths.length > 0 || weaknesses.length > 0) && (
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-sky-200 bg-sky-50/60 p-4 dark:border-sky-900 dark:bg-sky-950/30">
              <div className="text-sm font-bold text-sky-900 dark:text-sky-200">이런 점이 강해요</div>
              <ul className="mt-2 space-y-2 text-sm text-stone-800 dark:text-stone-200">
                {strengths.slice(0, 3).map((s, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-sky-600" aria-hidden>
                      ●
                    </span>
                    <span className="line-clamp-2">{clean(s.text)}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-rose-200 bg-rose-50/60 p-4 dark:border-rose-900 dark:bg-rose-950/30">
              <div className="text-sm font-bold text-rose-900 dark:text-rose-200">이런 점을 조심하세요</div>
              <ul className="mt-2 space-y-2 text-sm text-stone-800 dark:text-stone-200">
                {weaknesses.slice(0, 3).map((s, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-rose-600" aria-hidden>
                      ●
                    </span>
                    <span className="line-clamp-2">{clean(s.text)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {a.warnings.some((w) => w.kind !== 'unknownTime') && (
          <button
            type="button"
            onClick={() => selectTab('chart')}
            className="no-print mt-5 w-full rounded-xl bg-amber-50 px-4 py-2.5 text-left text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200"
          >
            ⚠ 출생 시각이 경계에 가까워 결과가 달라질 수 있어요. <u>만세력 탭에서 확인하기</u>
          </button>
        )}
      </section>

      <div ref={tabsRef} className="no-print sticky top-14 z-20 -mx-4 bg-paper/95 px-4 py-2 backdrop-blur dark:bg-stone-950/95">
        <div className="grid grid-cols-4 gap-1 rounded-2xl border border-stone-200 bg-white p-1 dark:border-stone-800 dark:bg-stone-900" role="tablist">
          {MAIN_TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => selectTab(t.id)}
              className={`rounded-xl px-1 py-2 text-center transition ${tab === t.id ? 'tab-on' : 'tab-off'}`}
            >
              <div className="text-sm font-bold sm:text-base">{t.label}</div>
              <div className={`hidden text-[11px] sm:block ${tab === t.id ? 'opacity-80' : 'text-stone-500'}`}>{t.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {tab === 'report' && (
        <>
          <ReportView a={a} />
          <ReviewForm a={a} />
        </>
      )}
      {tab === 'luck' && <LuckPanel a={a} />}
      {tab === 'chart' && (
        <>
          <Manseryeok a={a} />
          <Glossary />
        </>
      )}
      {tab === 'detail' && (
        <>
          <ElementsPanel a={a} />
          <StrengthPanel a={a} />
          <InteractionsPanel a={a} />
        </>
      )}
    </div>
  );
}

function Glossary() {
  return (
    <section className="card">
      <h2 className="text-xl font-bold">용어 풀이</h2>
      <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">결과 화면에서 점선 밑줄이 있는 단어는 눌러서 설명을 볼 수 있어요.</p>
      <dl className="mt-4 grid gap-x-8 gap-y-3 sm:grid-cols-2">
        {Object.entries(GLOSSARY).map(([k, v]) => (
          <div key={k}>
            <dt className="font-bold">{k}</dt>
            <dd className="text-sm text-stone-600 dark:text-stone-400">{v}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
