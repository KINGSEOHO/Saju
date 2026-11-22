import { lazy, Suspense, useEffect, useState, type ReactNode } from 'react';
import { type BirthInput } from './engine/index.ts';
import { flushQueue } from './lib/api.ts';
import { track } from './lib/funnel.ts';
import { clearDraft } from './lib/birthDraft.ts';
import { decodeInput } from './lib/share.ts';
import { loadRecent, removeRecent, saveRecent, type Recent } from './lib/recent.ts';
import { STORAGE } from './lib/storageKeys.ts';
import { TEXT_SIZES, loadTextSize, saveTextSize } from './lib/textSize.ts';
import { Admin } from './ui/Admin.tsx';
import { BirthFlow, FLOW_STEPS, goToStep } from './ui/BirthForm.tsx';
import { BottomBar } from './ui/common.tsx';
import { ErrorBoundary } from './ui/ErrorBoundary.tsx';
import { Faq } from './ui/Faq.tsx';
import { BusinessFooter, Legal, type LegalDoc } from './ui/Legal.tsx';
import { ImageSheet } from './ui/ImageSheet.tsx';
import { ReviewBanner } from './ui/ReviewBanner.tsx';
import { PurchaseCodeDialog } from './ui/PurchaseCode.tsx';

// 결과 화면은 사주 계산 엔진을 함께 쓰는 큰 덩어리라 따로 불러온다 — 첫 화면(소개·입력)이 먼저 뜨게.
// 페이지를 열어 둔 사이 새 버전이 배포되면 예전 파일을 못 찾을 수 있어, 그때는 새로고침을 안내한다.
function ChunkError() {
  return (
    <p className="wrap py-12 text-ui text-sub">
      사이트가 업데이트되어 이 화면을 불러오지 못했어요.{' '}
      <button type="button" className="link" onClick={() => window.location.reload()}>
        새로고침
      </button>
    </p>
  );
}
const Result = lazy(() => import('./ui/ResultPage.tsx').catch(() => ({ default: ChunkError })));

type Route = { name: 'home' } | { name: 'start'; step: number } | { name: 'result'; input: BirthInput } | { name: 'admin' } | { name: 'legal'; doc: LegalDoc };

function parseRoute(): Route {
  const h = window.location.hash.replace(/^#/, '');
  if (h.startsWith('/admin')) return { name: 'admin' };
  const legal = h.match(/^\/(terms|privacy|refund|pricing)\b/);
  if (legal) return { name: 'legal', doc: legal[1] as LegalDoc };
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

/**
 * 미리보기(Claude 앱에 띄우는 시안) 전용 — 지난번에 본 결과를 이 기기에 기억해 두었다가, 열자마자 그 결과로 바로 간다.
 * 매번 생년월일을 다시 넣지 않아도 되게. 실제 사이트에서는 쓰지 않는다 (VITE_PREVIEW는 scripts/preview-artifact.mjs만 켠다).
 */
const PREVIEW = import.meta.env.VITE_PREVIEW === '1';
const LAST_RESULT = STORAGE.previewLast;
if (PREVIEW) {
  try {
    const last = localStorage.getItem(LAST_RESULT);
    if (last && /^#?\/?$/.test(window.location.hash)) window.history.replaceState(null, '', last);
  } catch {
    /* 저장이 막힌 화면에서는 처음부터 */
  }
}

/** 글자 크기 고르기 — '가' 세 개 (어른들이 바로 알아보는 모양). 머리말에 늘 있다 */
function TextSize() {
  const [cur, setCur] = useState(loadTextSize);
  return (
    <div className="flex items-end gap-0.5 rounded-lg bg-fill p-0.5" role="group" aria-label="글자 크기">
      {TEXT_SIZES.map((t, i) => (
        <button
          key={t.label}
          type="button"
          aria-pressed={cur === i}
          aria-label={`글자 ${t.label}`}
          className={`flex size-8 items-center justify-center rounded-md font-bold ${cur === i ? 'bg-bg text-ink ring-1 ring-line' : 'text-sub'}`}
          style={{ fontSize: 12 + i * 3 }}
          onClick={() => {
            saveTextSize(i);
            setCur(i);
          }}
        >
          가
        </button>
      ))}
    </div>
  );
}

export default function App() {
  const [route, setRoute] = useState<Route>(parseRoute);
  // 결과를 열면 이 기기의 '최근 본 사주'에 남긴다 (첫 화면에서 바로 불러오기)
  useEffect(() => {
    if (route.name === 'result') saveRecent(window.location.hash, route.input);
  }, [route]);
  useEffect(() => {
    if (!PREVIEW || route.name !== 'result') return;
    try {
      localStorage.setItem(LAST_RESULT, window.location.hash);
    } catch {
      /* noop */
    }
  }, [route]);
  useEffect(() => {
    const on = () => {
      const r = parseRoute();
      setRoute(r);
      if (r.name === 'legal') window.scrollTo(0, 0);
    };
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
      <ReviewBanner />
      <PurchaseCodeDialog />
      <header data-sticky-head className="no-print sticky top-0 z-30 border-b border-line bg-bg">
        <div className="wrap flex h-14 items-center justify-between">
          <a href="#/" className="flex items-center gap-2">
            <span aria-hidden className="seal size-[22px] self-center text-[9px]">
              <span>明</span>
              <span>鏡</span>
            </span>
            <span className="hanja text-[19px] font-bold text-ink">명경사주</span>
          </a>
          <div className="flex items-center gap-4">
            <TextSize />
            {route.name === 'result' && (
              <button
                type="button"
                className="tap text-label font-semibold text-sub"
                onClick={() => {
                  clearDraft();
                  goToStep(1);
                }}
              >
                새로 보기
              </button>
            )}
          </div>
        </div>
      </header>
      <main className="flex-1">
        <ErrorBoundary resetKey={route}>
          {route.name === 'home' && <Home />}
          {route.name === 'result' && (
            <Suspense fallback={<p className="wrap py-12 text-ui text-sub">사주를 계산하는 중…</p>}>
              <Result input={route.input} />
            </Suspense>
          )}
          {route.name === 'legal' && <Legal doc={route.doc} />}
          {route.name === 'admin' && (
            <div className="wrap py-8">
              <Admin />
            </div>
          )}
        </ErrorBoundary>
      </main>
      <ImageSheet />
      <footer className={`no-print border-t border-line ${route.name === 'home' ? 'pb-28' : ''}`}>
        <p className="wrap pt-8 text-cap text-sub">
          명경사주(明鏡四柱) — 맑은 거울처럼 있는 그대로.
          <br />
          사주 해석은 전통적 경향에 대한 참고 자료이며 의학·법률·투자 판단을 대신하지 않아요.
        </p>
        <div className="wrap pb-8">
          <BusinessFooter />
        </div>
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

/** 이 기기에 남은 최근 본 사주 — 누르면 입력 없이 바로 결과로. 새 정보는 아래 '내 사주 보기'로 */
function RecentList() {
  const [list, setList] = useState<Recent[]>(loadRecent);
  if (!list.length) return null;
  return (
    <section className="wrap pt-8" aria-labelledby="recent-h">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="recent-h" className="text-title3 text-ink">
          최근 본 사주
        </h2>
        <span className="text-cap text-sub">이 휴대폰에만 저장돼요</span>
      </div>
      <ul className="mt-3 border-t border-line">
        {list.map((r) => (
          <li key={r.hash} className="flex items-center gap-2 border-b border-line">
            <a href={r.hash} className="min-w-0 flex-1 py-3.5 text-ui font-semibold text-ink">
              {r.label}
              <span className="ml-2 text-cap font-normal text-accent">불러오기</span>
            </a>
            <button
              type="button"
              className="shrink-0 px-2 py-3 text-cap text-sub"
              aria-label={`${r.label} 기록 지우기`}
              onClick={() => {
                removeRecent(r.hash);
                setList(loadRecent());
              }}
            >
              지우기
            </button>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-cap text-sub">다른 사람이나 새 정보로 보려면 아래 ‘내 사주 보기’를 누르세요.</p>
    </section>
  );
}

const NoSample = () => <></>;
const HomeSample = lazy(() => import('./ui/HomeSample.tsx').catch(() => ({ default: NoSample })));

/** 신년운세 시즌(10월~이듬해 입춘 무렵)에 첫 화면에서 보여 주는 해 — 검색용 페이지(/2027/…)가 있는 해만 잇는다 */
function seasonYear(): number | null {
  const kst = new Date(Date.now() + 9 * 3600_000);
  const y = kst.getUTCMonth() + 1 >= 10 ? kst.getUTCFullYear() + 1 : kst.getUTCFullYear();
  return y === 2027 ? y : null;
}

/** 보정 계산기 예시(1988-07-15 01:40 서울)를 시간 띠로 — 기록된 시각이 자시 쪽으로 옮겨 가는 모습 */
function TimeShift() {
  // 23시~03시를 0~300으로. 자시 23~01, 축시 01~03
  const x = (h: number, m: number) => (((h + 1) % 24) * 60 + m) * (300 / 240);
  const from = x(1, 40);
  const to = x(0, 7);
  return (
    <svg viewBox="0 0 300 96" className="mt-5 w-full" role="img" aria-label="기록된 시각 1시 40분이 서머타임 60분과 서울의 시차 32분을 빼면 0시 7분이 되어, 축시가 자시로 바뀌어요">
      <rect x="0" y="52" width="150" height="26" rx="6" className="fill-accent" />
      <rect x="150" y="52" width="150" height="26" rx="6" className="fill-fill" />
      <text x="75" y="70" textAnchor="middle" className="fill-on-accent text-[12px] font-bold">
        자시 子
      </text>
      <text x="225" y="70" textAnchor="middle" className="fill-sub text-[12px] font-bold">
        축시 丑
      </text>
      <text x="0" y="92" className="fill-sub text-[10px]">
        23시
      </text>
      <text x="150" y="92" textAnchor="middle" className="fill-sub text-[10px]">
        1시
      </text>
      <text x="300" y="92" textAnchor="end" className="fill-sub text-[10px]">
        3시
      </text>
      <path d={`M${from} 40 V30 H${to + 5}`} fill="none" strokeWidth="1.5" className="stroke-ink" />
      <path d={`M${to} 46 l5 -9 h-10 z`} className="fill-ink" />
      <circle cx={from} cy="46" r="4" className="fill-bg stroke-ink" strokeWidth="1.5" />
      <text x={from} y="18" textAnchor="middle" className="fill-sub text-[11px]">
        기록 01:40
      </text>
      <text x={to} y="18" textAnchor="middle" className="fill-ink text-[11px] font-bold">
        사주 00:07
      </text>
    </svg>
  );
}

const PROOF: [string, string, string][] = [
  ['55,152일', '음력 변환', '1900~2050년 하루도 빠짐없이 한국천문연구원 자료와 같아요'],
  ['1분 이내', '절기 시각', '1900~2100년 전 구간이 독립된 천문 계산과 맞아요'],
  ['15,000건', '사주 네 기둥', '무작위로 뽑아 다른 만세력 계산과 대조했고 모두 같았어요'],
];

/** 명경사주가 다른 네 가지 — 첫 화면 위쪽에 한눈에, 아래에서 하나씩 실제 예시로 */
const STRENGTHS: { short: string; title: string; text: string }[] = [
  { short: '시차 보정', title: '시계가 아니라 해의 시각으로 계산해요', text: '서울은 시계보다 해가 32분 늦어요. 서머타임과 태어난 곳의 시차를 빼서 사주에 쓰는 진짜 시각을 구해요.' },
  { short: '직설 풀이', title: '좋게 포장하지 않고 있는 그대로 말해요', text: '강점 옆에 약점을 나란히 적고, 왜 그렇게 보는지 근거를 붙여요.' },
  { short: '웹툰 요약', title: '긴 풀이를 웹툰으로 요약해요', text: '내 사주에서 나온 장면으로 4화까지 그려요. 글을 다 읽지 않아도 내가 어떤 사람인지 보여요.' },
  { short: 'MBTI 결합', title: 'MBTI와 사주를 나란히 놓고 봐요', text: 'MBTI는 내가 고른 겉모습, 사주는 타고난 속이에요. 네 글자마다 같은 곳과 다른 곳을 짚어 드려요.' },
];

function Strength({ no, children }: { no: number; children: ReactNode }) {
  const s = STRENGTHS[no - 1];
  return (
    <section className="mt-14" aria-labelledby={`why-${no}`}>
      <div className="flex items-start gap-3">
        <span aria-hidden className="hanja flex size-9 shrink-0 items-center justify-center rounded-full bg-accent text-title3 font-bold text-on-accent">
          {no}
        </span>
        <div>
          <h2 id={`why-${no}`} className="text-title2 text-ink">
            {s.title}
          </h2>
          <p className="mt-2 text-ui text-sub">{s.text}</p>
        </div>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

const Sample = ({ part, min }: { part: 'card' | 'toon' | 'mbti'; min: string }) => (
  <div className={min}>
    <Suspense fallback={<p className="py-10 text-center text-label text-sub">예시를 계산하는 중…</p>}>
      <HomeSample part={part} />
    </Suspense>
  </div>
);
const SAMPLE_NOTE = '예시 · 김명경(지어낸 인물) 1995년 12월 25일 03:10 서울';

function Home() {
  const year = seasonYear();
  return (
    <>
      <RecentList />
      <div className="wrap pt-10 pb-4">
        <h1 className="text-display text-ink">
          정확하게 계산하고,
          <br />
          있는 그대로 말해요.
        </h1>

        <ol className="mt-7 grid grid-cols-2 gap-2.5" aria-label="명경사주가 다른 네 가지">
          {STRENGTHS.map((s, i) => (
            <li key={s.short} className="flex items-center gap-2.5 rounded-xl border border-line px-3.5 py-3">
              <span aria-hidden className="hanja text-title2 font-bold text-accent">
                {i + 1}
              </span>
              <span className="text-ui font-bold text-ink">{s.short}</span>
            </li>
          ))}
        </ol>

        {year && (
          <div className="panel mt-6 flex items-center gap-4">
            <span className="hanja flex shrink-0 flex-col items-center justify-center rounded-xl border border-ink/70 px-3 py-2 text-[26px] leading-[1.1] font-bold text-ink" aria-hidden>
              <span>丁</span>
              <span>未</span>
            </span>
            <div className="min-w-0">
              <p className="text-title3 font-bold text-ink">{year} 정미년, 내 운은 어떻게 흐를까요?</p>
              <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-label">
                <a href={`./${year}/`} className="link">
                  일간별 {year} 운세
                </a>
                <a href="./time/" className="link">
                  출생시간 보정 계산기
                </a>
              </p>
            </div>
          </div>
        )}

        <Strength no={1}>
          <TimeShift />
          <p className="mt-3 text-label text-sub">1988년 7월 15일 새벽 1시 40분 서울 출생이라면 서머타임 60분과 시차 32분을 빼요. 축시가 자시로 바뀌어요.</p>
        </Strength>

        <Strength no={2}>
          <Sample part="card" min="min-h-[330px]" />
          <p className="mt-2 text-center text-cap text-sub">{SAMPLE_NOTE}</p>
        </Strength>

        <Strength no={3}>
          <Sample part="toon" min="min-h-[240px]" />
          <p className="mt-2 text-center text-cap text-sub">같은 예시 사주로 그린 1화의 한 컷</p>
        </Strength>

        <Strength no={4}>
          <Sample part="mbti" min="min-h-[250px]" />
          <p className="mt-2 text-center text-cap text-sub">같은 예시에 MBTI를 ENFJ로 넣었을 때</p>
        </Strength>

        <section className="mt-14" aria-labelledby="proof-h">
          <h2 id="proof-h" className="text-title2 text-ink">
            계산은 이렇게 확인했어요
          </h2>
          <ul className="mt-4 border-t border-line">
            {PROOF.map(([n, what, how]) => (
              <li key={n} className="grid grid-cols-[7.5rem_1fr] items-center gap-4 border-b border-line py-5">
                <span className="hanja text-[26px] leading-tight font-bold text-accent tabular-nums">{n}</span>
                <span>
                  <span className="block text-ui font-semibold text-ink">{what}</span>
                  <span className="mt-0.5 block text-label text-sub">{how}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
      <Faq />
    </>
  );
}
