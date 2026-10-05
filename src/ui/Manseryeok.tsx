import type { ReactNode } from 'react';
import { BRANCHES, STEMS, fmtKst, pillarHanja, type SajuAnalysis } from '../engine/index.ts';
import { CharTile, Disclosure, ElementTag, SectionTitle } from './common.tsx';

const ORDER = ['hour', 'day', 'month', 'year'] as const;
const LABEL: Record<string, string> = { hour: '시주', day: '일주', month: '월주', year: '년주' };
const MEANING: Record<string, string> = { hour: '자녀·말년', day: '나·배우자', month: '부모·사회', year: '조상·초년' };

function fmtLocal(ms: number) {
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
}
function signed(min: number) {
  const s = min >= 0 ? '+' : '−';
  const a = Math.abs(min);
  return `${s}${Math.floor(a)}분 ${Math.round((a % 1) * 60)}초`;
}

export function PillarHeader({ a }: { a: SajuAnalysis }) {
  const cols = ORDER.map((k) => a.positions.find((p) => p.pos === k) ?? null);
  return (
    <div className="grid grid-cols-4 gap-2 sm:gap-4">
      {cols.map((p, i) => (
        <div key={ORDER[i]} className="flex flex-col items-center gap-1.5">
          <div className="text-xs font-semibold text-stone-500">
            {LABEL[ORDER[i]]}
            <span className="hidden sm:inline"> · {MEANING[ORDER[i]]}</span>
          </div>
          {p ? (
            <>
              <div className="text-[11px] text-stone-600 dark:text-stone-400">{p.stemTenGod}</div>
              <CharTile kind="stem" idx={p.pillar.stem} />
              <CharTile kind="branch" idx={p.pillar.branch} />
              <div className="text-[11px] text-stone-600 dark:text-stone-400">{p.branchTenGod}</div>
            </>
          ) : (
            <div className="flex h-[10.5rem] w-16 items-center justify-center rounded-xl border-2 border-dashed border-stone-300 text-center text-xs text-stone-400 sm:w-20 dark:border-stone-700">
              시간
              <br />
              미상
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export function Manseryeok({ a }: { a: SajuAnalysis }) {
  const p = a.pillars;
  const cols = ORDER.map((k) => a.positions.find((x) => x.pos === k) ?? null);
  const tz = a.input.timeZone;
  const row = (title: string, render: (x: NonNullable<(typeof cols)[number]>) => ReactNode) => (
    <tr className="border-t border-stone-100 dark:border-stone-800">
      <th scope="row" className="py-2 pr-1 text-left text-[11px] font-semibold text-stone-500 sm:pr-2 sm:text-xs">
        {title}
      </th>
      {cols.map((c, i) => (
        <td key={i} className="px-0.5 py-2 text-center text-xs sm:px-1 sm:text-sm">
          {c ? render(c) : <span className="text-stone-300">—</span>}
        </td>
      ))}
    </tr>
  );

  return (
    <section className="card">
      <SectionTitle id="manse" kicker="만세력" title="사주 원국" desc="천문 계산으로 산출한 네 기둥과 각 글자의 십성·지장간·12운성·신살입니다." />
      <div className="-mx-2 overflow-x-auto">
        <table className="w-full min-w-[330px] table-fixed">
          <thead>
            <tr>
              <th className="w-14 sm:w-20" />
              {ORDER.map((k) => (
                <th key={k} className="pb-2 text-center text-xs font-semibold text-stone-500">
                  {LABEL[k]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {row('천간 십성', (c) => <span className="font-medium">{c.stemTenGod}</span>)}
            {row('천간', (c) => (
              <div className="flex flex-col items-center gap-0.5">
                <span className="hanja text-2xl font-bold">{STEMS[c.pillar.stem].hanja}</span>
                <ElementTag el={STEMS[c.pillar.stem].element} />
              </div>
            ))}
            {row('지지', (c) => (
              <div className="flex flex-col items-center gap-0.5">
                <span className="hanja text-2xl font-bold">{BRANCHES[c.pillar.branch].hanja}</span>
                <ElementTag el={BRANCHES[c.pillar.branch].element} />
              </div>
            ))}
            {row('지지 십성', (c) => <span className="font-medium">{c.branchTenGod}</span>)}
            {row('지장간', (c) => (
              <div className="flex flex-col gap-0.5 text-xs">
                {c.hidden.map((h) => (
                  <span key={h.stem} title={`${h.days}일`}>
                    <span className="hanja font-semibold">{STEMS[h.stem].hanja}</span> {h.tenGod}
                  </span>
                ))}
              </div>
            ))}
            {row('12운성', (c) => <span>{c.stage}</span>)}
            {row('12신살', (c) => <span className="text-xs">{c.twelveSinsal}</span>)}
            {row('공망', (c) => (c.gongmang ? <span className="chip">공망</span> : <span className="text-stone-300">·</span>))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-stone-500">12운성은 일간 기준(봉법), 12신살은 년지 기준입니다. 지장간은 여기·중기·정기 순이며 마우스를 올리면 월률분야 일수가 보입니다.</p>

      <div className="mt-5 space-y-3">
        <Disclosure summary="시간 보정 내역 — 어떻게 계산했나요?" defaultOpen={a.warnings.length > 0}>
          <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs text-stone-500">입력</dt>
              <dd>
                {a.input.calendar === 'lunar'
                  ? `음력 ${a.input.year}년 ${a.input.leapMonth ? '윤' : ''}${a.input.month}월 ${a.input.day}일`
                  : `양력 ${a.input.year}년 ${a.input.month}월 ${a.input.day}일`}
                {p.timeKnown ? ` ${String(a.input.hour).padStart(2, '0')}:${String(a.input.minute ?? 0).padStart(2, '0')}` : ' (시간 미상)'} · {a.input.placeName}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-stone-500">양력 / 음력</dt>
              <dd>
                {p.solarDate.year}-{String(p.solarDate.month).padStart(2, '0')}-{String(p.solarDate.day).padStart(2, '0')} / 음력 {p.lunarDate.year}년 {p.lunarDate.leap ? '윤' : ''}
                {p.lunarDate.month}월 {p.lunarDate.day}일
              </dd>
            </div>
            <div>
              <dt className="text-xs text-stone-500">당시 표준시 · 서머타임</dt>
              <dd>
                UTC{p.conversion.standardOffsetMinutes >= 0 ? '+' : '−'}
                {Math.floor(Math.abs(p.conversion.standardOffsetMinutes) / 60)}:{String(Math.round(Math.abs(p.conversion.standardOffsetMinutes) % 60)).padStart(2, '0')}
                {p.conversion.dst ? ' · 서머타임 시행 중 (−60분 보정)' : ' · 서머타임 없음'}
              </dd>
            </div>
            {p.timeKnown && p.localSolarMs !== null && (
              <>
                <div>
                  <dt className="text-xs text-stone-500">경도 보정 (출생지 경도 {a.input.longitude.toFixed(3)}°)</dt>
                  <dd>{a.input.timeCorrection === 'none' ? '적용 안 함' : signed(p.longitudeCorrectionMinutes)}</dd>
                </div>
                {a.input.timeCorrection === 'true' && (
                  <div>
                    <dt className="text-xs text-stone-500">균시차</dt>
                    <dd>{signed(p.equationOfTimeMinutes)}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-xs text-stone-500">사주 계산에 쓴 현지 태양시</dt>
                  <dd className="font-semibold">{fmtLocal(p.localSolarMs)}</dd>
                </div>
              </>
            )}
            <div>
              <dt className="text-xs text-stone-500">절입 (월주 기준)</dt>
              <dd>
                {p.prevJie.name} {fmtKst(p.prevJie.ms, tz)} → 다음 {p.nextJie.name} {fmtKst(p.nextJie.ms, tz)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-stone-500">출생 순간 태양 황경</dt>
              <dd>
                {p.sunLongitude.toFixed(4)}° (절입 후 {p.daysSincePrevJie.toFixed(2)}일)
              </dd>
            </div>
          </dl>
          <p className="mt-3 text-xs leading-relaxed text-stone-500">
            절기 시각은 VSOP87 행성 이론으로 태양 황경을 직접 계산합니다(1900~2100년 오차 약 ±30초). 음력은 한국천문연구원 기준(한국 표준시 합삭, 무중치윤)으로
            계산하며 1900~2050년 전 구간이 KASI 자료와 일치함을 검증했습니다.
          </p>
        </Disclosure>

        {a.warnings.length > 0 && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm dark:border-amber-800 dark:bg-amber-950/40">
            <div className="mb-2 font-semibold text-amber-950 dark:text-amber-100">⚠ 경계 민감도 — 결과가 달라질 수 있는 지점</div>
            <ul className="space-y-2 text-amber-950 dark:text-amber-100">
              {a.warnings.map((w, i) => (
                <li key={i}>
                  {w.message}
                  {w.alternative && <div className="mt-0.5 text-xs font-semibold">{w.alternative}</div>}
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="chip">일주 {pillarHanja(p.day)}</span>
          <span className="chip">사주 기준 연도 {p.sajuYear}년(입춘 기준)</span>
          <span className="chip">{a.input.timeCorrection === 'true' ? '진태양시' : a.input.timeCorrection === 'none' ? '표준시(보정 없음)' : '평태양시'}</span>
          <span className="chip">{a.input.ziHourRule === 'split' ? '야·조자시' : '23시 일진 변경'}</span>
        </div>
      </div>
    </section>
  );
}
