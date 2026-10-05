import { useEffect, useMemo, useState, type MouseEvent } from 'react';
import { analyze, ELEMENT_KO, pillarHanja, type BirthInput, type SajuAnalysis } from './engine/index.ts';
import { flushQueue, send, sessionId } from './lib/api.ts';
import { decodeInput, encodeInput } from './lib/share.ts';
import { Admin } from './ui/Admin.tsx';
import { ElementsPanel, InteractionsPanel, StrengthPanel } from './ui/Analysis.tsx';
import { BirthForm } from './ui/BirthForm.tsx';
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
      <header className="no-print sticky top-0 z-20 border-b border-stone-200 bg-stone-50/90 backdrop-blur dark:border-stone-800 dark:bg-stone-950/90">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <a href="#/" className="flex items-center gap-2 font-bold">
            <span className="hanja flex size-8 items-center justify-center rounded-full bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900">命</span>
            <span>명경사주</span>
            <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">BETA 무료</span>
          </a>
          {route.name === 'result' && (
            <nav className="hidden gap-4 text-sm text-stone-600 md:flex dark:text-stone-400">
              <a href="#manse" onClick={scrollTo('manse')}>만세력</a>
              <a href="#elements" onClick={scrollTo('elements')}>오행</a>
              <a href="#strength" onClick={scrollTo('strength')}>용신</a>
              <a href="#luck" onClick={scrollTo('luck')}>대운</a>
              <a href="#report" onClick={scrollTo('report')}>리포트</a>
              <a href="#review" onClick={scrollTo('review')}>리뷰</a>
            </nav>
          )}
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 pt-6 pb-24">
        {route.name === 'home' && <Home />}
        {route.name === 'result' && <Result input={route.input} />}
        {route.name === 'admin' && <Admin />}
      </main>
      <footer className="no-print border-t border-stone-200 py-8 text-center text-xs leading-relaxed text-stone-500 dark:border-stone-800">
        명경사주(明鏡四柱) — 맑은 거울처럼 있는 그대로.
        <br />
        사주 해석은 통계적·전통적 경향에 대한 참고 자료이며 의학·법률·투자 판단을 대신하지 않습니다.
      </footer>
    </div>
  );
}

/** 해시 라우팅과 충돌하지 않도록 앵커 이동을 직접 처리 */
function scrollTo(id: string) {
  return (e: MouseEvent) => {
    e.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
}

function Home() {
  const go = (i: BirthInput) => {
    window.location.hash = `/r?${encodeInput(i)}`;
    window.scrollTo({ top: 0 });
  };
  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_1.1fr] lg:items-start">
      <div className="lg:sticky lg:top-24">
        <h1 className="text-3xl leading-tight font-black tracking-tight sm:text-4xl">
          정확하게 계산하고,
          <br />
          있는 그대로 말합니다.
        </h1>
        <p className="mt-4 text-base leading-relaxed text-stone-600 dark:text-stone-400">
          명경사주는 절기와 합삭을 천문학 공식으로 직접 계산하는 정밀 만세력 위에서, 성향·연애·이직·재물·건강을 <b>근거와 함께</b> 분석합니다. 듣기 좋은 말보다 실제로 도움이 되는 사실을
          우선합니다.
        </p>
        <ul className="mt-6 space-y-3 text-sm">
          {[
            ['절기 시각을 초 단위로', 'VSOP87 태양 이론으로 입춘·경칩 등 24절기를 직접 계산 (1900~2100년)'],
            ['한국 표준시의 역사까지', '1908·1954·1961년 표준시 변경, 1948~1988년 서머타임, 출생지 경도 보정 자동 적용'],
            ['KASI 음력과 100% 일치', '1900~2050년 55,152일 전체를 한국천문연구원 자료와 대조 검증'],
            ['결과가 흔들리는 지점 공개', '절입·시 경계·야자시·보정 방식에 따라 기둥이 바뀌면 대안까지 표시'],
            ['좋은 말만 하지 않는 리포트', '모든 문장을 강점·약점·주의로 구분하고 명식상의 근거를 함께 제시'],
          ].map(([t, d]) => (
            <li key={t} className="flex gap-3">
              <span aria-hidden className="mt-1 size-1.5 shrink-0 rounded-full bg-stone-900 dark:bg-stone-100" />
              <span>
                <b>{t}</b>
                <span className="block text-stone-600 dark:text-stone-400">{d}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
      <BirthForm onSubmit={go} />
    </div>
  );
}

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

  useEffect(() => {
    if ('a' in result) {
      send('events', { sessionId: sessionId(), type: 'analyze', meta: { dayStem: result.a.pillars.day.stem, gender: input.gender, timeKnown: result.a.pillars.timeKnown } });
    }
  }, [result, input.gender]);

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
  const title = input.name ? `${input.name}님의 사주` : '사주 분석 결과';
  const share = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* 클립보드 불가 */
    }
  };

  return (
    <div className="space-y-6">
      <section className="card">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black">{title}</h1>
            <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">
              {input.gender === 'male' ? '남성' : '여성'} · 양력 {p.solarDate.year}.{p.solarDate.month}.{p.solarDate.day} (음력 {p.lunarDate.leap ? '윤' : ''}
              {p.lunarDate.month}.{p.lunarDate.day})
              {p.timeKnown ? ` ${String(input.hour).padStart(2, '0')}:${String(input.minute ?? 0).padStart(2, '0')}` : ' · 시간 미상'} · {input.placeName} · 만 {a.age}세
            </p>
          </div>
          <div className="no-print flex gap-2">
            <button type="button" className="btn-ghost" onClick={() => setEditing((e) => !e)}>
              {editing ? '닫기' : '정보 수정'}
            </button>
            <button type="button" className="btn-ghost" onClick={share}>
              {copied ? '링크 복사됨' : '링크 복사'}
            </button>
            <button type="button" className="btn-ghost hidden sm:inline-flex" onClick={() => window.print()}>
              인쇄
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
        <div className="mt-6">
          <PillarHeader a={a} />
        </div>
        <div className="mt-6 flex flex-wrap justify-center gap-2 text-sm">
          <span className="chip text-sm">
            일주 <b className="hanja">{pillarHanja(p.day)}</b>
          </span>
          <span className="chip text-sm">{a.gyeokguk.name}</span>
          <span className="chip text-sm">
            {a.strength.level} {a.strength.score.toFixed(0)}%
          </span>
          <span className="chip text-sm">
            용신 {ELEMENT_KO[a.yongsin.yongsin]} · 기신 {ELEMENT_KO[a.yongsin.gisin]}
          </span>
          {a.currentDaeun && <span className="chip text-sm">현재 대운 {pillarHanja(a.currentDaeun.pillar)}</span>}
        </div>
        {a.warnings.some((w) => w.kind !== 'unknownTime') && (
          <p className="mt-4 text-center text-xs text-amber-800 dark:text-amber-300">⚠ 출생 시각이 경계에 가까워 결과가 달라질 수 있습니다. 아래 ‘경계 민감도’를 확인하세요.</p>
        )}
      </section>

      <Manseryeok a={a} />
      <ElementsPanel a={a} />
      <StrengthPanel a={a} />
      <InteractionsPanel a={a} />
      <LuckPanel a={a} />
      <ReportView a={a} />
      <ReviewForm a={a} />
    </div>
  );
}
