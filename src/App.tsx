import { lazy, Suspense, useEffect, useState } from 'react';
import { type BirthInput } from './engine/index.ts';
import { flushQueue } from './lib/api.ts';
import { track } from './lib/funnel.ts';
import { clearDraft } from './lib/birthDraft.ts';
import { decodeInput } from './lib/share.ts';
import { loadRecent, removeRecent, saveRecent, type Recent } from './lib/recent.ts';
import { STORAGE } from './lib/storageKeys.ts';
import { Admin } from './ui/Admin.tsx';
import { BirthFlow, FLOW_STEPS, goToStep } from './ui/BirthForm.tsx';
import { BottomBar } from './ui/common.tsx';
import { ErrorBoundary } from './ui/ErrorBoundary.tsx';
import { Faq } from './ui/Faq.tsx';
import { BusinessFooter, Legal, type LegalDoc } from './ui/Legal.tsx';
import { ImageSheet } from './ui/ImageSheet.tsx';

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
  const legal = h.match(/^\/(terms|privacy|refund)\b/);
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
      <header data-sticky-head className="no-print sticky top-0 z-30 border-b border-line bg-bg">
        <div className="wrap flex h-14 items-center justify-between">
          <a href="#/" className="flex items-baseline gap-2">
            <span className="hanja text-[19px] font-bold text-ink">명경사주</span>
            <span className="text-micro text-sub">베타 · 무료</span>
          </a>
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

const FEATURES: [string, string][] = [
  ['천문 계산 만세력', '절기와 합삭을 천문학 공식으로 직접 계산해요.'],
  ['출생 시각 자동 보정', '서머타임과 표준시 변경, 태어난 곳의 경도까지 반영해요.'],
  ['한국천문연구원 자료와 일치', '1900~2050년 음력 전 구간을 대조해 확인했어요.'],
  ['좋은 말만 하지 않기', '모든 해석에 강점·약점·주의와 근거를 함께 붙여요.'],
  ['내 사주로 그린 개그 웹툰', '결과 화면에서 4화까지 볼 수 있어요.'],
];

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

function Home() {
  return (
    <>
      <RecentList />
      <div className="wrap pt-12 pb-4">
        <p className="kicker">정밀 만세력 · 근거 있는 풀이</p>
        <h1 className="mt-3 text-display text-ink">
          정확하게 계산하고,
          <br />
          있는 그대로 말해요.
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
