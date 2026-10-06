/** 관리자 통계 — 리뷰 데이터로 유료화 의사결정 */
import { useState, type FormEvent } from 'react';
import { FEATURE_OPTIONS, PRICE_OPTIONS } from '../config/plans.ts';
import { STEMS } from '../engine/index.ts';
import { SHEET_URL } from '../config/backend.ts';
import { fetchStats } from '../lib/api.ts';
import type { Stats } from '../lib/stats.ts';

const SECTION_KO: Record<string, string> = { summary: '종합', personality: '성향', love: '연애·결혼', career: '직업·이직', wealth: '재물', health: '건강', gaeun: '개운법', webtoon: '인생 웹툰' };
const PRICE_KO = Object.fromEntries(PRICE_OPTIONS.map((p) => [p.id, p.label]));
const FEATURE_KO = Object.fromEntries(FEATURE_OPTIONS.map((p) => [p.id, p.label]));
const COMPARE_KO: Record<string, string> = { much_better: '훨씬 낫다', better: '조금 낫다', same: '비슷하다', worse: '못하다', never: '비교 경험 없음' };

function HBars({ rows, unit = '건' }: { rows: { label: string; n: number; extra?: string }[]; unit?: string }) {
  const max = Math.max(1, ...rows.map((r) => r.n));
  if (!rows.length) return <p className="text-sm text-stone-500">데이터 없음</p>;
  return (
    <div className="space-y-1.5">
      {rows.map((r) => (
        <div key={r.label} className="grid grid-cols-[8rem_1fr_5rem] items-center gap-2 text-sm">
          <span className="truncate text-stone-700 dark:text-stone-300" title={r.label}>
            {r.label}
          </span>
          <div className="h-2.5 rounded-sm bg-stone-100 dark:bg-stone-800" title={`${r.label}: ${r.n}${unit}`}>
            <div className="h-full rounded-r-[4px]" style={{ width: `${(r.n / max) * 100}%`, background: 'var(--el-water)' }} />
          </div>
          <span className="text-right tabular-nums text-stone-600 dark:text-stone-400">
            {r.n}
            {unit}
            {r.extra ? ` · ${r.extra}` : ''}
          </span>
        </div>
      ))}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-stone-200 p-4 dark:border-stone-800">
      <div className="text-xs text-stone-500">{label}</div>
      <div className="mt-1 text-2xl font-bold tabular-nums">{value}</div>
    </div>
  );
}

export function Admin() {
  const [token, setToken] = useState(() => {
    try {
      return sessionStorage.getItem('mg_admin') ?? '';
    } catch {
      return '';
    }
  });
  const [stats, setStats] = useState<Stats | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function load(e?: FormEvent) {
    e?.preventDefault();
    setErr(null);
    try {
      const s = await fetchStats(token);
      setStats(s);
      try {
        sessionStorage.setItem('mg_admin', token);
      } catch {
        /* noop */
      }
    } catch (x) {
      setErr(x instanceof Error ? x.message : String(x));
    }
  }

  const f = (n: number | null | undefined) => (n === null || n === undefined ? '-' : n.toFixed(2));

  return (
    <div className="space-y-6">
      <form onSubmit={load} className="card flex flex-wrap items-end gap-3">
        <label className="grow">
          <span className="mb-1 block text-sm font-semibold">관리자 토큰 ({SHEET_URL ? 'Apps Script 스크립트 속성 ADMIN_TOKEN' : '서버 환경변수 ADMIN_TOKEN'})</span>
          <input className="field" type="password" value={token} onChange={(e) => setToken(e.target.value)} autoComplete="off" />
        </label>
        <button className="btn-primary" type="submit">
          통계 불러오기
        </button>
        {err && <p className="w-full text-sm text-rose-700">{err}</p>}
      </form>
      {stats && (
        <>
          <section className="card">
            <h2 className="mb-4 text-lg font-bold">유료화 판단 지표</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="분석 실행" value={stats.totals.analyses} />
              <Stat label="리뷰" value={stats.totals.reviews} />
              <Stat label="평균 정확도 (5점)" value={f(stats.overall.avgAccuracy)} />
              <Stat label="유료 의향 비율" value={stats.decision.wtpPaidShare === null ? '-' : `${Math.round(stats.decision.wtpPaidShare * 100)}%`} />
            </div>
            <div className={`mt-4 rounded-xl p-4 text-sm ${stats.decision.ready ? 'bg-sky-50 text-sky-950 dark:bg-sky-950/40 dark:text-sky-100' : 'bg-stone-50 dark:bg-stone-800/50'}`}>
              <b>{stats.decision.ready ? '유료 전환 검토 가능' : '아직 데이터 수집 단계'}</b>
              {stats.decision.medianPrice && <span> · 지불 의향 중앙값: {PRICE_KO[stats.decision.medianPrice] ?? stats.decision.medianPrice}</span>}
              <ul className="mt-2 list-disc space-y-0.5 pl-5">
                {stats.decision.notes.map((n, i) => (
                  <li key={i}>{n}</li>
                ))}
              </ul>
            </div>
          </section>
          <section className="card grid gap-8 lg:grid-cols-2">
            <div>
              <h3 className="mb-3 font-bold">섹션별 정확도 (유료 후보 선정 근거)</h3>
              <HBars rows={stats.sections.map((s) => ({ label: SECTION_KO[s.section] ?? s.section, n: s.n, extra: `평균 ${f(s.avg)}` }))} />
            </div>
            <div>
              <h3 className="mb-3 font-bold">1회 지불 의향 가격</h3>
              <HBars rows={stats.price.map((p) => ({ label: PRICE_KO[p.key] ?? p.key, n: p.n }))} unit="명" />
            </div>
            <div>
              <h3 className="mb-3 font-bold">유료 기능 수요</h3>
              <HBars rows={stats.features.map((p) => ({ label: FEATURE_KO[p.key] ?? p.key, n: p.n }))} unit="명" />
            </div>
            <div>
              <h3 className="mb-3 font-bold">타 서비스 대비</h3>
              <HBars rows={stats.compare.map((p) => ({ label: COMPARE_KO[p.key] ?? p.key, n: p.n }))} unit="명" />
            </div>
            <div>
              <h3 className="mb-3 font-bold">신강약별 정확도 (엔진 약점 탐지)</h3>
              <HBars rows={stats.byStrength.map((p) => ({ label: p.key, n: p.n, extra: `정확도 ${f(p.avg)}` }))} />
            </div>
            <div>
              <h3 className="mb-3 font-bold">일간별 정확도</h3>
              <HBars rows={stats.byDayStem.map((p) => ({ label: `${STEMS[Number(p.key)]?.hanja ?? p.key} ${STEMS[Number(p.key)]?.ko ?? ''}`, n: p.n, extra: `정확도 ${f(p.avg)}` }))} />
            </div>
            <div>
              <h3 className="mb-3 font-bold">용신 확실성별 정확도</h3>
              <HBars rows={stats.byConfidence.map((p) => ({ label: p.key, n: p.n, extra: `정확도 ${f(p.avg)}` }))} />
            </div>
            <div>
              <h3 className="mb-3 font-bold">출생시간 유무별 정확도</h3>
              <HBars rows={stats.byTimeKnown.map((p) => ({ label: p.key === '1' ? '시간 앎' : '시간 모름', n: p.n, extra: `정확도 ${f(p.avg)}` }))} />
            </div>
          </section>
          <section className="card">
            <h3 className="mb-3 font-bold">최근 리뷰</h3>
            <ul className="divide-y divide-stone-100 text-sm dark:divide-stone-800">
              {stats.recentReviews.map((r, i) => (
                <li key={i} className="py-2">
                  <div className="text-xs text-stone-500">
                    {r.created_at} · 만족 {r.overall} · 정확 {r.accuracy} · {r.price ? PRICE_KO[r.price] : '가격 미응답'} · {String(r.meta?.strength ?? '')} {String(r.meta?.gyeokguk ?? '')}
                  </div>
                  {r.text && <p className="mt-0.5">{r.text}</p>}
                </li>
              ))}
            </ul>
            <h3 className="mt-6 mb-3 font-bold">섹션 코멘트</h3>
            <ul className="divide-y divide-stone-100 text-sm dark:divide-stone-800">
              {stats.recentComments.map((r, i) => (
                <li key={i} className="py-2">
                  <span className="text-xs text-stone-500">
                    {r.created_at} · {SECTION_KO[r.section] ?? r.section} · {r.rating}점
                  </span>
                  <p>{r.comment}</p>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
