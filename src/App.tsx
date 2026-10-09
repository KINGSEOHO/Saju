import { lazy, Suspense, useEffect, useMemo, useState, type ReactNode } from 'react';
import { PAYWALL_DEMO } from './config/plans.ts';
import { analyze, pillarHanja, STEMS, type BirthInput, type SajuAnalysis } from './engine/index.ts';
import { groupOf } from './engine/tenGods.ts';
import { flushQueue } from './lib/api.ts';
import { track } from './lib/funnel.ts';
import { clearDraft, inputToDraft, saveDraft } from './lib/birthDraft.ts';
import { decodeInput, encodeInput } from './lib/share.ts';
import { CONCERNS, concernsFor, type ConcernId } from './report/concernList.ts';
import { crossReport } from './report/cross.ts';
import { generateReport, type Report } from './report/generate.ts';
import { AXES, sajuAxes } from './report/mbti.ts';
import { readLuck } from './report/luckReading.ts';
import { seasonOf } from './report/season.ts';
import { elWord, LEVEL_PLAIN } from './report/plain.ts';
import { DECADE_THEME } from './report/storyKb.ts';
import { Admin } from './ui/Admin.tsx';
import { ElementsPanel, InteractionsPanel, StrengthPanel } from './ui/Analysis.tsx';
import { BirthFlow, FLOW_STEPS, goToStep } from './ui/BirthForm.tsx';
import { ElementStrip } from './ui/Charts.tsx';
import { BottomBar, Chevron, Disclosure, Gloss, GLOSSARY, Lead, Term } from './ui/common.tsx';
import { ConcernBridge } from './ui/ConcernBridge.tsx';
import { ErrorBoundary } from './ui/ErrorBoundary.tsx';
import { Faq } from './ui/Faq.tsx';
import { ReviewForm } from './ui/Feedback.tsx';
import { HitsCard } from './ui/Hits.tsx';
import { ImageSheet } from './ui/ImageSheet.tsx';
import { LuckPanel, monthLabel, SwitchNote, upcomingMonths } from './ui/Luck.tsx';
import { Manseryeok, PillarTable } from './ui/Manseryeok.tsx';
import { ReportView } from './ui/ReportView.tsx';
import { ShareSection, type StoryData } from './ui/StoryShare.tsx';

// 웹툰 그림·대본과 교차 분석 화면은 크기가 커서 펼칠 때 따로 불러온다.
// 페이지를 열어 둔 사이 새 버전이 배포되면 예전 파일을 못 찾을 수 있어, 그때는 새로고침을 안내한다.
function ChunkError() {
  return (
    <p className="py-6 text-ui text-sub">
      사이트가 업데이트되어 이 내용을 불러오지 못했어요.{' '}
      <button type="button" className="link" onClick={() => window.location.reload()}>
        새로고침
      </button>
    </p>
  );
}
const WebtoonPanel = lazy(() =>
  import('./ui/Webtoon.tsx').then(
    (m) => ({ default: m.WebtoonPanel }),
    () => ({ default: ChunkError }),
  ),
);
const ConcernBody = lazy(() =>
  import('./ui/Concern.tsx').then(
    (m) => ({ default: m.ConcernBody }),
    () => ({ default: ChunkError }),
  ),
);
const ConcernTop = lazy(() =>
  import('./ui/Concern.tsx').then(
    (m) => ({ default: m.ConcernTop }),
    () => ({ default: ChunkError }),
  ),
);
const MatchPanel = lazy(() =>
  import('./ui/Match.tsx').then(
    (m) => ({ default: m.MatchPanel }),
    () => ({ default: ChunkError }),
  ),
);
const CrossTabs = lazy(() =>
  import('./ui/CrossTabs.tsx').then(
    (m) => ({ default: m.CrossTabs }),
    () => ({ default: ChunkError }),
  ),
);

type Route = { name: 'home' } | { name: 'start'; step: number } | { name: 'result'; input: BirthInput } | { name: 'admin' };

function parseRoute(): Route {
  const h = window.location.hash.replace(/^#/, '');
  if (h.startsWith('/admin')) return { name: 'admin' };
  if (h.startsWith('/start')) {
    const n = Number(h.split('/')[2]);
    return { name: 'start', step: Number.isInteger(n) && n >= 1 && n <= FLOW_STEPS ? n : 1 };
  }
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
    // 단계별 측정의 첫 단계 — 관리 화면으로 들어온 것은 세지 않는다 (한 번 방문에 한 번)
    if (parseRoute().name !== 'admin') track('visit');
    return () => window.removeEventListener('hashchange', on);
  }, []);

  if (route.name === 'start')
    return (
      <ErrorBoundary resetKey={route}>
        <BirthFlow step={route.step} />
      </ErrorBoundary>
    );

  return (
    <div className="flex min-h-screen flex-col">
      <header data-sticky-head className="no-print sticky top-0 z-30 border-b border-line bg-bg">
        <div className="wrap flex h-14 items-center justify-between">
          <a href="#/" className="flex items-baseline gap-2">
            <span className="font-serif text-[19px] font-bold text-ink">명경사주</span>
            <span className="text-micro text-sub">베타 · 무료</span>
          </a>
          {route.name === 'result' && (
            <button
              type="button"
              className="text-label font-semibold text-sub"
              onClick={() => {
                clearDraft();
                goToStep(1);
              }}
            >
              새로 보기
            </button>
          )}
        </div>
      </header>
      <main className="flex-1">
        <ErrorBoundary resetKey={route}>
          {route.name === 'home' && <Home />}
          {route.name === 'result' && <Result input={route.input} />}
          {route.name === 'admin' && (
            <div className="wrap py-8">
              <Admin />
            </div>
          )}
        </ErrorBoundary>
      </main>
      <ImageSheet />
      <footer className={`no-print border-t border-line ${route.name === 'home' ? 'pb-28' : ''}`}>
        <p className="wrap py-8 text-cap text-sub">
          명경사주(明鏡四柱) — 맑은 거울처럼 있는 그대로.
          <br />
          사주 해석은 전통적 경향에 대한 참고 자료이며 의학·법률·투자 판단을 대신하지 않습니다.
        </p>
      </footer>
      {route.name === 'home' && (
        <BottomBar>
          <button type="button" className="btn-primary w-full" onClick={() => goToStep(1)}>
            내 사주 보기
          </button>
        </BottomBar>
      )}
    </div>
  );
}

const FEATURES: [string, string][] = [
  ['천문 계산 만세력', '절기와 합삭을 천문학 공식으로 직접 계산해요.'],
  ['출생 시각 자동 보정', '서머타임과 표준시 변경, 태어난 곳의 경도까지 반영해요.'],
  ['한국천문연구원 자료와 일치', '1900~2050년 음력 전 구간을 대조해 확인했어요.'],
  ['좋은 말만 하지 않기', '모든 해석에 강점·약점·주의와 근거를 함께 붙여요.'],
  ['내 사주로 그린 개그 웹툰', '결과 화면에서 4화까지 볼 수 있어요.'],
];

function Home() {
  return (
    <>
      <div className="wrap pt-12 pb-4">
        <p className="kicker">정밀 만세력 · 근거 있는 풀이</p>
        <h1 className="mt-3 text-display text-ink">
          정확하게 계산하고,
          <br />
          있는 그대로 말합니다.
        </h1>
        <p className="mt-4 text-ui text-sub">좋은 말만 늘어놓지 않아요. 성향·연애·직업·재물·건강을 강점과 약점 모두, 왜 그렇게 보는지 근거와 함께 알려 드려요.</p>
        <dl className="mt-10 border-t border-line">
          {FEATURES.map(([t, d]) => (
            <div key={t} className="border-b border-line py-5">
              <dt className="font-serif text-title3 font-bold text-ink">{t}</dt>
              <dd className="mt-1 text-label text-sub">{d}</dd>
            </div>
          ))}
        </dl>
      </div>
      <Faq />
    </>
  );
}

type Sec = 'report' | 'luck' | 'cross' | 'mbti' | 'job' | 'webtoon' | 'chart' | 'detail';
/** 펼치는 줄 — 세부 풀이의 칸이거나 고민 리포트의 고민 하나. 한 번에 하나만 펼친다 */
type RowId = Sec | ConcernId;
const DETAILS: { id: Sec; title: string; desc: string }[] = [
  { id: 'report', title: '풀이 리포트', desc: '나는 어떤 사람인지 — 성향 · 연애 · 일 · 돈 · 건강' },
  { id: 'luck', title: '운의 흐름', desc: '이번 달 · 올해 · 10년 대운' },
  { id: 'cross', title: '교차 검증', desc: '사주·운·띠·MBTI·직업이 함께 가리키는 것' },
  { id: 'mbti', title: 'MBTI × 사주', desc: '겉(MBTI)과 속(사주)이 같은 점과 다른 점' },
  { id: 'job', title: '지금 하는 일과 나', desc: '지금 하는 일과의 궁합, 지금 준비할 것' },
  { id: 'webtoon', title: '인생 웹툰', desc: '내 사주로 그린 개그 웹툰 4화' },
  { id: 'chart', title: '만세력', desc: '원국 상세표 · 시간 보정 내역 · 용어 사전' },
  { id: 'detail', title: '전문 분석', desc: '다섯 기운 · 힘의 세기 · 필요한 기운 · 신살' },
];

function Loading({ children }: { children: ReactNode }) {
  return <p className="py-6 text-ui text-sub">{children}</p>;
}

/** onConcern — 풀이 끝의 '그래서 언제?' 카드가 고민 리포트의 그 고민을 연다 */
function DetailContent({ id, a, report, onConcern }: { id: Sec; a: SajuAnalysis; report: Report; onConcern: (c: ConcernId) => void }) {
  switch (id) {
    case 'report':
      return <ReportView a={a} onConcern={onConcern} />;
    case 'luck':
      return (
        <>
          <LuckPanel a={a} />
          <ConcernBridge a={a} report={report} id="year" lead={seasonOf(a).newYear ? `${seasonOf(a).year}년은 어떤 해일까요?` : '올해 남은 달은 어떻게 보내면 좋을까요?'} onGo={onConcern} />
        </>
      );
    case 'cross':
    case 'mbti':
    case 'job':
      return (
        <Suspense fallback={<Loading>교차 분석을 계산하는 중…</Loading>}>
          <CrossTabs a={a} report={report} tab={id} />
          {id === 'mbti' && <ConcernBridge a={a} report={report} id="match" lead="그 사람과는 얼마나 잘 맞을까요?" onGo={onConcern} />}
          {id === 'job' && <ConcernBridge a={a} report={report} id="career" lead="그래서 지금 옮겨도 될까요?" onGo={onConcern} />}
        </Suspense>
      );
    case 'webtoon':
      return (
        <Suspense fallback={<Loading>웹툰을 그리는 중…</Loading>}>
          <WebtoonPanel a={a} report={report} />
        </Suspense>
      );
    case 'chart':
      return (
        <>
          <Manseryeok a={a} />
          <Glossary />
        </>
      );
    case 'detail':
      return (
        <div className="space-y-14">
          <ElementsPanel a={a} />
          <StrengthPanel a={a} />
          <InteractionsPanel a={a} />
        </div>
      );
  }
}

function ConcernContent({ id, a, report }: { id: ConcernId; a: SajuAnalysis; report: Report }) {
  if (id === 'match')
    return (
      <Suspense fallback={<Loading>궁합 화면을 불러오는 중…</Loading>}>
        <MatchPanel a={a} />
      </Suspense>
    );
  return (
    <Suspense fallback={<Loading>고민 리포트를 불러오는 중…</Loading>}>
      <ConcernBody a={a} report={report} id={id} />
    </Suspense>
  );
}

/** 세부 풀이와 고민 리포트가 함께 쓰는 펼침 줄. 펼친 줄의 제목은 화면 위에 붙어 다닌다 */
function Row({ id, title, desc, open, onToggle, children }: { id: RowId; title: string; desc: string; open: boolean; onToggle: () => void; children: ReactNode }) {
  return (
    <li className="border-b border-line">
      <button
        type="button"
        data-row={id}
        data-sticky-tabs={open ? '' : undefined}
        aria-expanded={open}
        onClick={onToggle}
        className={`flex items-center justify-between gap-3 py-4 text-left ${open ? 'sticky top-14 z-20 -mx-5 w-[calc(100%+2.5rem)] border-b border-line bg-bg px-5' : 'w-full'}`}
      >
        <span className="min-w-0">
          <span className="block font-serif text-title3 font-bold text-ink">{title}</span>
          <span className="mt-0.5 block text-cap text-sub">{open ? '접으려면 다시 누르세요' : desc}</span>
        </span>
        <Chevron open={open} />
      </button>
      {open && (
        <div className="pt-6 pb-12">
          <ErrorBoundary inline resetKey={id}>
            {children}
          </ErrorBoundary>
        </div>
      )}
    </li>
  );
}

/** 결론 바로 아래의 고민 리포트 지름길 — 누르면 아래 고민 리포트 칸에서 그 고민이 열리고 그 자리로 간다 */
function ConcernShortcuts({ a, onPick }: { a: SajuAnalysis; onPick: (id: ConcernId) => void }) {
  const season = seasonOf(a);
  return (
    <nav className="no-print mt-6" aria-label="고민 리포트 바로 가기">
      <p className="text-label font-semibold text-ink">지금 고민이 있다면</p>
      <div className="mt-2.5 flex flex-wrap gap-2">
        {concernsFor(a).map((c) => {
          const hero = c.id === 'year' && season.newYear;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => onPick(c.id)}
              className={`h-10 rounded-full border px-4 text-label font-semibold transition-colors ${hero ? 'border-accent bg-accent text-on-accent' : 'border-line text-ink active:bg-fill'}`}
            >
              {c.title}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

/** 고민 리포트 칸 제목으로 (머리말 아래로) */
function scrollToConcerns() {
  const el = document.getElementById('concerns');
  if (!el) return;
  const head = document.querySelector<HTMLElement>('[data-sticky-head]')?.offsetHeight ?? 56;
  window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - head - 16, behavior: 'smooth' });
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
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState<RowId | null>(null);
  const [jump, setJump] = useState<{ id: RowId; n: number } | null>(null);

  useEffect(() => {
    if ('a' in result) track('analyze', { dayStem: result.a.pillars.day.stem, gender: input.gender, timeKnown: result.a.pillars.timeKnown }, false);
  }, [result, input.gender]);
  // 고민 리포트를 펼치면 (줄을 누르든, 결론 아래 지름길이나 세부 풀이의 안내로 오든) 그 고민을 한 번 센다
  useEffect(() => {
    if (open && CONCERNS.some((c) => c.id === open)) track('concern_open', { item: open });
  }, [open]);

  const report = useMemo(() => ('a' in result ? generateReport(result.a) : null), [result]);
  const cross = useMemo(() => ('a' in result && report ? crossReport(result.a, report) : null), [result, report]);
  const month = useMemo(() => {
    if (!('a' in result)) return null;
    const w = upcomingMonths(result.a, 1)[0];
    return w ? { w, r: readLuck(result.a, w, '달'), label: monthLabel(result.a, w) } : null;
  }, [result]);

  // 펼치거나 접은 뒤, 그 항목의 제목이 머리말 바로 아래 오도록.
  // 펼친 항목의 제목 줄은 화면 위에 붙어 다니므로(sticky) 제 자리를 알려면 감싼 <li>의 위치를 읽는다.
  useEffect(() => {
    if (!jump) return;
    const row = document.querySelector<HTMLElement>(`[data-row="${jump.id}"]`)?.closest('li');
    if (!row) return;
    const head = document.querySelector<HTMLElement>('[data-sticky-head]')?.offsetHeight ?? 56;
    const top = row.getBoundingClientRect().top + window.scrollY - head;
    // 위에 펼쳐 둔 긴 풀이가 접히면 거리가 멀어지므로, 멀 때는 바로 옮긴다
    const far = Math.abs(top - window.scrollY) > window.innerHeight * 1.5;
    window.scrollTo({ top, behavior: far ? 'auto' : 'smooth' });
  }, [jump]);

  if ('error' in result || !report || !cross) {
    return (
      <div className="wrap py-12">
        <p className="text-ui text-ink">{'error' in result ? result.error : '결과를 만들지 못했어요.'}</p>
        <button type="button" className="btn-secondary mt-6" onClick={() => goToStep(1)}>
          다시 입력하기
        </button>
      </div>
    );
  }
  const a = result.a;
  const p = a.pillars;
  const toggle = (id: RowId) => {
    setOpen((cur) => (cur === id ? null : id));
    setJump({ id, n: Date.now() });
  };
  const openSection = (id: RowId) => {
    setOpen(id);
    setJump({ id, n: Date.now() });
  };
  const edit = () => {
    saveDraft(inputToDraft(input));
    goToStep(1);
  };
  const share = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* 클립보드 불가 */
    }
  };

  const summary = report.sections.find((s) => s.id === 'summary');
  const strengths = summary?.blocks.find((b) => b.heading.includes('무기'))?.items ?? [];
  const weaknesses = summary?.blocks.find((b) => b.heading.includes('약점'))?.items ?? [];
  const clean = (t: string) => t.replace(/^\[[^\]]+\]\s*/, '').replace(/^그러나 과하면:\s*/, '');
  const cd = a.currentDaeun;
  const facts: { label: string; value: string; sub: string; term: string }[] = [
    { label: '타고난 힘', value: LEVEL_PLAIN[a.strength.level].short, sub: `${a.strength.level} · ${a.strength.score.toFixed(0)}%`, term: a.strength.score >= 48 ? '신강' : '신약' },
    { label: '가장 필요한 기운', value: elWord(a.yongsin.yongsin), sub: '용신', term: '용신' },
    {
      label: '지금의 10년',
      value: cd ? `${DECADE_THEME[groupOf(cd.stemTenGod)].label}의 10년` : '-',
      sub: cd ? `${pillarHanja(cd.pillar)} 대운 · ${cd.startYear}–${cd.endYear}` : '',
      term: '대운',
    },
  ];
  const lean = sajuAxes(a);
  const shareData: StoryData = {
    name: input.name,
    headline: cross.card.headline,
    subline: cross.card.subline,
    tags: cross.card.tags,
    outer: cross.card.outer,
    inner: cross.card.inner,
    mbti: cross.mbti ? { type: cross.mbti.type, nick: cross.mbti.profile.nick, letters: cross.mbti.axes.map((v) => ({ user: v.user ?? '', saju: v.saju.lean, verdict: v.verdict })) } : null,
    sajuLetters: AXES.map((k) => lean[k].lean),
  };
  const born = `${input.calendar === 'lunar' ? `음력 ${p.lunarDate.year}년 ${p.lunarDate.leap ? '윤' : ''}${p.lunarDate.month}월 ${p.lunarDate.day}일` : `양력 ${p.solarDate.year}년 ${p.solarDate.month}월 ${p.solarDate.day}일`}${
    p.timeKnown ? ` ${String(input.hour).padStart(2, '0')}:${String(input.minute ?? 0).padStart(2, '0')}` : ' · 시간 모름'
  }`;

  return (
    <div className="wrap pb-20">
      <div className="no-print flex items-start justify-between gap-4 pt-5">
        <p className="text-cap text-sub">
          {[input.name, input.gender === 'male' ? '남성' : '여성', born, input.placeName, `만 ${a.age}세`].filter(Boolean).join(' · ')}
        </p>
        <div className="flex shrink-0 gap-3 text-cap font-semibold">
          <button type="button" className="text-accent" onClick={edit}>
            정보 수정
          </button>
          <button type="button" className="text-accent" onClick={share}>
            {copied ? '복사됨' : '링크 복사'}
          </button>
        </div>
      </div>

      <section className="pt-8" aria-labelledby="conclusion">
        <p className="kicker">{input.name ? `${input.name}님의 사주` : '사주로 본 나'}</p>
        <h1 id="conclusion" className="mt-2 text-display text-ink">
          {cross.card.headline}
        </h1>
        <p className="mt-3 font-serif text-read text-sub">{cross.card.subline}</p>
        <button type="button" className="link no-print mt-3 text-label" onClick={() => openSection('cross')}>
          이 결론의 근거 보기
        </button>
      </section>

      <ConcernShortcuts a={a} onPick={openSection} />

      <div className="mt-10">
        <PillarTable a={a} />
      </div>

      <section className="mt-10" aria-labelledby="elements-strip">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="elements-strip" className="font-sans text-label font-semibold text-ink">
            다섯 기운의 세기
          </h2>
          <span className="text-micro text-sub">태어난 계절과 숨은 기운까지 반영</span>
        </div>
        <div className="mt-4">
          <ElementStrip percent={a.elements.percent} me={STEMS[p.day.stem].element} />
        </div>
      </section>

      <dl className="mt-8 border-t border-line">
        {facts.map((f) => (
          <div key={f.label} className="flex items-baseline justify-between gap-4 border-b border-line py-3.5">
            <dt className="text-label text-sub">{f.label}</dt>
            <dd className="text-right">
              <div className="font-serif text-[17px] font-bold text-ink">{f.value}</div>
              {f.sub && (
                <div className="mt-0.5 text-micro text-sub">
                  <Term t={f.term}>{f.sub}</Term>
                </div>
              )}
            </dd>
          </div>
        ))}
      </dl>

      {a.warnings.some((w) => w.kind !== 'unknownTime') && (
        <div className="mt-6 border-l-2 border-ink pl-4">
          <p className="text-label font-semibold text-ink">태어난 시각이 경계에 가까워요</p>
          <p className="mt-1 text-label text-sub">계산 기준에 따라 사주가 달라질 수 있어요.</p>
          <button type="button" className="link no-print mt-1 text-label" onClick={() => openSection('chart')}>
            만세력에서 확인하기
          </button>
        </div>
      )}

      <HitsCard key={encodeInput(input)} a={a} />

      {(strengths.length > 0 || weaknesses.length > 0) && (
        <>
          <section className="mt-14">
            <h2 className="text-title2 text-ink">이런 점이 강해요</h2>
            <ol className="mt-5 space-y-5">
              {strengths.slice(0, 3).map((s, i) => (
                <li key={i} className="flex gap-4">
                  <span className="w-4 shrink-0 font-serif text-title3 font-bold text-accent tabular-nums">{i + 1}</span>
                  <p className="read">
                    <Lead text={clean(s.text)} />
                  </p>
                </li>
              ))}
            </ol>
          </section>
          <section className="mt-12">
            <h2 className="text-title2 text-ink">이런 점은 조심하세요</h2>
            <ol className="mt-5 space-y-5">
              {weaknesses.slice(0, 3).map((s, i) => (
                <li key={i} className="flex gap-4">
                  <span className="w-4 shrink-0 font-serif text-title3 font-bold text-ink tabular-nums">{i + 1}</span>
                  <p className="read">
                    <Lead text={clean(s.text)} />
                  </p>
                </li>
              ))}
            </ol>
          </section>
        </>
      )}

      {month && (
        <section className="panel mt-12">
          <p className="kicker">
            이번 달 운세 <span className="font-normal text-sub">· {month.label.title}</span>
          </p>
          <h3 className="mt-2 text-title3 text-ink">{month.r.headline}</h3>
          <dl className="mt-4 space-y-3 text-ui text-ink-2">
            <div className="flex gap-3">
              <dt className="tag-pos mt-0.5 h-fit">좋아요</dt>
              <dd>
                <Gloss text={month.r.good[0]} />
              </dd>
            </div>
            <div className="flex gap-3">
              <dt className="tag-neg mt-0.5 h-fit">조심</dt>
              <dd>
                <Gloss text={month.r.caution[0]} />
              </dd>
            </div>
          </dl>
          <SwitchNote a={a} w={month.w} />
          <button type="button" className="link no-print mt-4 text-label" onClick={() => openSection('luck')}>
            월별 풀이 전체 보기
          </button>
        </section>
      )}

      <ShareSection a={a} d={shareData} />

      <section className="mt-16" aria-labelledby="details">
        <h2 id="details" className="text-title2 text-ink">
          세부 풀이
        </h2>
        <p className="mt-1 text-label text-sub">
          누르면 이 자리에서 펼쳐져요. 고민이 있다면{' '}
          <button type="button" className="link no-print" onClick={scrollToConcerns}>
            고민 리포트로 바로 가기
          </button>
        </p>
        <ul className="mt-4 border-t border-line">
          {DETAILS.map((d) => (
            <Row key={d.id} id={d.id} title={d.title} desc={d.desc} open={open === d.id} onToggle={() => toggle(d.id)}>
              <DetailContent id={d.id} a={a} report={report} onConcern={openSection} />
            </Row>
          ))}
        </ul>
      </section>

      <section className="mt-16" aria-labelledby="concerns">
        <p className="kicker">고민 리포트</p>
        <h2 id="concerns" className="mt-2 text-title2 text-ink">
          지금 어떤 고민이 있어요?
        </h2>
        <p className="mt-1 text-label text-sub">세부 풀이가 ‘나는 어떤 사람인지’라면, 고민 리포트는 ‘그래서 언제, 어떻게’를 알려 드려요.</p>
        {/* 지금은 베타라 산 기록이 없어 시안에서만 보인다. 결제를 붙이면 산 것이 있을 때 늘 보이게 바꾼다 */}
        {PAYWALL_DEMO && (
          <div className="mt-5">
            <Suspense fallback={null}>
              <ConcernTop a={a} />
            </Suspense>
          </div>
        )}
        <ul className="mt-4 border-t border-line">
          {concernsFor(a).map((c) => (
            <Row key={c.id} id={c.id} title={c.title} desc={c.ask} open={open === c.id} onToggle={() => toggle(c.id)}>
              <ConcernContent id={c.id} a={a} report={report} />
            </Row>
          ))}
        </ul>
      </section>

      <ReviewForm a={a} />
    </div>
  );
}

function Glossary() {
  const entries = Object.entries(GLOSSARY);
  return (
    <section className="mt-14">
      <h3 className="text-title3 text-ink">용어 사전</h3>
      <p className="mt-1 text-label text-sub">점선 밑줄이 있는 말은 눌러서 바로 뜻을 볼 수 있어요. 여기에는 {entries.length}개 용어를 모두 모았어요.</p>
      <div className="mt-4">
        <Disclosure summary={`용어 ${entries.length}개 펼쳐 보기`}>
          <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
            {entries.map(([k, v]) => (
              <div key={k}>
                <dt className="font-serif font-bold text-ink">{k}</dt>
                <dd className="text-label text-sub">{v}</dd>
              </div>
            ))}
          </dl>
        </Disclosure>
      </div>
    </section>
  );
}
