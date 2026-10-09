/** 관리자 통계 — 리뷰 데이터로 유료화 의사결정 */
import { useState, type FormEvent, type ReactNode } from 'react';
import { FEATURE_OPTIONS, PRICE_LABEL } from '../config/plans.ts';
import { STEMS } from '../engine/index.ts';
import { SHEET_URL } from '../config/backend.ts';
import { checkConnection, fetchStats, flushQueue, pendingCount } from '../lib/api.ts';
import type { Funnel, Stats } from '../lib/stats.ts';

const SECTION_KO: Record<string, string> = { summary: '종합', personality: '성향', love: '연애·결혼', career: '직업·이직', wealth: '재물', health: '건강', gaeun: '개운법', webtoon: '인생 웹툰' };
const PRICE_KO = PRICE_LABEL;
const FEATURE_KO = Object.fromEntries(FEATURE_OPTIONS.map((p) => [p.id, p.label]));
const COMPARE_KO: Record<string, string> = { much_better: '훨씬 낫다', better: '조금 낫다', same: '비슷하다', worse: '못하다', never: '비교 경험 없음' };

function HBars({ rows, unit = '건' }: { rows: { label: string; n: number; extra?: string }[]; unit?: string }) {
  const max = Math.max(1, ...rows.map((r) => r.n));
  if (!rows.length) return <p className="text-label text-sub">아직 데이터가 없어요</p>;
  return (
    <div className="space-y-2">
      {rows.map((r) => (
        <div key={r.label} className="grid grid-cols-[7rem_1fr_auto] items-center gap-3 text-label">
          <span className="truncate text-ink-2" title={r.label}>
            {r.label}
          </span>
          <div className="h-2 overflow-hidden rounded bg-fill" title={`${r.label}: ${r.n}${unit}`}>
            <div className="h-full rounded bg-accent" style={{ width: `${(r.n / max) * 100}%` }} />
          </div>
          <span className="text-right text-sub tabular-nums">
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
    <div className="rounded-xl bg-subtle p-4">
      <div className="text-cap text-sub">{label}</div>
      <div className="mt-1 font-serif text-title2 font-bold text-ink tabular-nums">{value}</div>
    </div>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h3 className="mb-3 text-ui font-semibold text-ink">{title}</h3>
      {children}
    </div>
  );
}

const OFFER_KO: Record<string, string> = { first: '첫 결제 1,900원', one: '하나 열기', all: '전부 열기', partner: '궁합·재회 1명' };
const pct = (n: number, d: number) => (d ? `${Math.round((n / d) * 100)}%` : '-');
const won = (n: number) => `${Math.round(n).toLocaleString('ko-KR')}원`;

/** 결제까지 가는 길 — 단계마다 몇 명이 남았는지, 어디서 가장 많이 빠지는지 */
function FunnelView({ f }: { f: Funnel }) {
  if (!f.since)
    return (
      <section>
        <h2 className="text-title2 text-ink">결제까지 가는 길</h2>
        <p className="mt-2 text-label text-sub">아직 측정 기록이 없어요. 측정을 넣은 버전이 배포되고, 시트의 Apps Script도 새 코드로 다시 배포한 뒤부터 쌓여요 (docs/SETUP-SHEETS.md).</p>
      </section>
    );
  const top = f.steps[0].n;
  return (
    <section>
      <h2 className="text-title2 text-ink">결제까지 가는 길</h2>
      <p className="mt-1 text-cap text-sub">{f.since}부터 · 사람 수는 기기 기준 · 이름·생년월일 없이 단계만 세요</p>
      <ol className="mt-4 border-t border-line">
        {f.steps.map((s, i) => (
          <li key={s.key} className="border-b border-line py-3">
            <div className="flex items-baseline justify-between gap-3 text-label">
              <span className="text-ink">
                {i + 1}. {s.label}
              </span>
              <span className="shrink-0 tabular-nums text-ink">
                <b>{s.n}</b>명
                {i > 0 && (
                  <span className="text-sub">
                    {' '}
                    · 앞 단계의 {pct(s.n, f.steps[i - 1].n)} · 처음의 {pct(s.n, top)}
                  </span>
                )}
              </span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded bg-fill">
              <div className="h-full rounded bg-accent" style={{ width: top ? `${(s.n / top) * 100}%` : '0%' }} />
            </div>
          </li>
        ))}
      </ol>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Stat label="매출 (결제 완료 합계)" value={won(f.revenue)} />
        <Stat label="접속한 사람 1명당 매출" value={f.perVisitor === null ? '-' : won(f.perVisitor)} />
      </div>
      <p className="mt-3 text-cap text-sub">
        가격 화면은 보는데 버튼을 안 누르면 가격이나 맛보기 문제, 버튼은 누르는데 결제를 끝내지 않으면 결제 과정 문제, 고민 리포트를 안 펼치면 무료 부분이 궁금증을 못 만드는 거예요. 베타 기간에는 잠금
        화면이 없어 ‘상세까지 봄’이 곧 관심도예요.
      </p>
      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[30rem] text-label tabular-nums">
          <thead>
            <tr className="border-b border-line-strong text-left text-cap text-sub">
              <th className="py-2 font-semibold">고민</th>
              <th className="py-2 text-right font-semibold">펼침</th>
              <th className="py-2 text-right font-semibold">상세·가격 봄</th>
              <th className="py-2 text-right font-semibold">결제 버튼</th>
              <th className="py-2 text-right font-semibold">결제</th>
              <th className="py-2 text-right font-semibold">매출</th>
            </tr>
          </thead>
          <tbody>
            {f.items.map((r) => (
              <tr key={r.item} className="border-b border-line">
                <td className="py-2 text-ink">{r.label}</td>
                <td className="py-2 text-right">{r.open}</td>
                <td className="py-2 text-right">{r.view}</td>
                <td className="py-2 text-right">{r.click}</td>
                <td className="py-2 text-right">{r.paid}</td>
                <td className="py-2 text-right">{won(r.revenue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-cap text-sub">
        궁합·재회는 펼친 {f.match.open}명 중 {f.match.result}명({pct(f.match.result, f.match.open)})이 상대 정보를 넣고 결과까지 봤어요.
      </p>
      {f.offers.length > 0 && (
        <div className="mt-6">
          <Group title="결제 버튼에서 고른 것">
            <HBars rows={f.offers.map((o) => ({ label: OFFER_KO[o.key] ?? o.key, n: o.n }))} unit="번" />
          </Group>
        </div>
      )}
    </section>
  );
}

/** 시트 연결 확인 — 리뷰가 시트에 안 보일 때 가장 먼저 볼 곳 */
function Connection() {
  const [res, setRes] = useState<{ ok: boolean; target: string; message: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState(pendingCount);
  const check = async () => {
    setBusy(true);
    const r = await checkConnection();
    if (r.ok && pendingCount() > 0) await flushQueue();
    setPending(pendingCount());
    setRes(r);
    setBusy(false);
  };
  return (
    <section className="panel">
      <h2 className="text-title3 text-ink">시트 연결</h2>
      <p className="mt-1 text-cap break-all text-sub">{SHEET_URL || '자체 서버(/api)'}</p>
      <button type="button" className="btn-small mt-4" onClick={check} disabled={busy}>
        {busy ? '확인하는 중…' : '연결 확인'}
      </button>
      {res && <p className={`mt-3 text-label font-semibold ${res.ok ? 'text-accent' : 'text-ink'}`}>{res.message}</p>}
      {pending > 0 && <p className="mt-2 text-cap text-sub">이 기기에 아직 보내지 못한 리뷰·평가가 {pending}개 있어요. 연결이 되면 자동으로 다시 보내요.</p>}
      <p className="mt-3 text-cap text-sub">
        리뷰가 시트에 안 보이면: ① 위 주소를 시크릿 창에서 열어 {'{"error":"unauthorized"}'}가 나오는지 ② Apps Script의 배포 관리에서 이 주소가 지금 배포와 같은지 ③ 액세스 권한이
        ‘모든 사용자’인지 확인해 주세요. 주소가 다르면 GitHub 저장소 변수 SHEET_URL을 바꾸고 다시 배포해야 해요.
      </p>
    </section>
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
    <div className="space-y-12">
      <h1 className="text-title1 text-ink">관리</h1>
      <Connection />
      <form onSubmit={load} className="space-y-3">
        <label className="block">
          <span className="mb-2 block text-label font-semibold text-ink">관리자 토큰</span>
          <input className="field" type="password" value={token} onChange={(e) => setToken(e.target.value)} autoComplete="off" />
          <span className="mt-1.5 block text-cap text-sub">{SHEET_URL ? 'Apps Script의 스크립트 속성 ADMIN_TOKEN' : '서버 환경변수 ADMIN_TOKEN'}</span>
        </label>
        <button className="btn-primary w-full" type="submit">
          통계 불러오기
        </button>
        {err && <p className="text-label font-semibold text-ink">{err}</p>}
      </form>
      {stats && (
        <>
          <FunnelView f={stats.funnel} />
          <section>
            <h2 className="text-title2 text-ink">유료화 판단 지표</h2>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Stat label="분석 실행" value={stats.totals.analyses} />
              <Stat label="리뷰" value={stats.totals.reviews} />
              <Stat label="평균 정확도 (5점)" value={f(stats.overall.avgAccuracy)} />
              <Stat label="유료 의향 비율" value={stats.decision.wtpPaidShare === null ? '-' : `${Math.round(stats.decision.wtpPaidShare * 100)}%`} />
            </div>
            <div className="mt-4 border-l-2 border-accent pl-4 text-label text-ink-2">
              <b className="text-ink">{stats.decision.ready ? '유료 전환 검토 가능' : '아직 데이터 수집 단계'}</b>
              {stats.decision.medianPrice && <span> · 지불 의향 중앙값: {PRICE_KO[stats.decision.medianPrice] ?? stats.decision.medianPrice}</span>}
              <ul className="mt-2 list-disc space-y-0.5 pl-5">
                {stats.decision.notes.map((n, i) => (
                  <li key={i}>{n}</li>
                ))}
              </ul>
            </div>
          </section>
          <section className="space-y-10">
            <Group title="섹션별 정확도 (유료 후보 선정 근거)">
              <HBars rows={stats.sections.map((s) => ({ label: SECTION_KO[s.section] ?? s.section, n: s.n, extra: `평균 ${f(s.avg)}` }))} />
            </Group>
            <Group title="1회 지불 의향 가격">
              <HBars rows={stats.price.map((p) => ({ label: PRICE_KO[p.key] ?? p.key, n: p.n }))} unit="명" />
            </Group>
            <Group title="유료 기능 수요">
              <HBars rows={stats.features.map((p) => ({ label: FEATURE_KO[p.key] ?? p.key, n: p.n }))} unit="명" />
            </Group>
            <Group title="타 서비스 대비">
              <HBars rows={stats.compare.map((p) => ({ label: COMPARE_KO[p.key] ?? p.key, n: p.n }))} unit="명" />
            </Group>
            <Group title="신강약별 정확도 (엔진 약점 탐지)">
              <HBars rows={stats.byStrength.map((p) => ({ label: p.key, n: p.n, extra: `정확도 ${f(p.avg)}` }))} />
            </Group>
            <Group title="일간별 정확도">
              <HBars rows={stats.byDayStem.map((p) => ({ label: `${STEMS[Number(p.key)]?.hanja ?? p.key} ${STEMS[Number(p.key)]?.ko ?? ''}`, n: p.n, extra: `정확도 ${f(p.avg)}` }))} />
            </Group>
            <Group title="용신 확실성별 정확도">
              <HBars rows={stats.byConfidence.map((p) => ({ label: p.key, n: p.n, extra: `정확도 ${f(p.avg)}` }))} />
            </Group>
            <Group title="출생시간 유무별 정확도">
              <HBars rows={stats.byTimeKnown.map((p) => ({ label: p.key === '1' ? '시간 앎' : '시간 모름', n: p.n, extra: `정확도 ${f(p.avg)}` }))} />
            </Group>
          </section>
          <section>
            <h3 className="text-title3 text-ink">최근 리뷰</h3>
            <ul className="mt-2 border-t border-line text-label">
              {stats.recentReviews.map((r, i) => (
                <li key={i} className="border-b border-line py-3">
                  <div className="text-cap text-sub">
                    {r.created_at} · 만족 {r.overall} · 정확 {r.accuracy} · {r.price ? PRICE_KO[r.price] : '가격 미응답'} · {String(r.meta?.strength ?? '')} {String(r.meta?.gyeokguk ?? '')}
                  </div>
                  {r.text && <p className="mt-1 text-ink-2">{r.text}</p>}
                </li>
              ))}
            </ul>
            <h3 className="mt-10 text-title3 text-ink">섹션 코멘트</h3>
            <ul className="mt-2 border-t border-line text-label">
              {stats.recentComments.map((r, i) => (
                <li key={i} className="border-b border-line py-3">
                  <span className="text-cap text-sub">
                    {r.created_at} · {SECTION_KO[r.section] ?? r.section} · {r.rating}점
                  </span>
                  <p className="mt-1 text-ink-2">{r.comment}</p>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
