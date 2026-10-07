import type { ReactNode } from 'react';
import { BRANCHES, STEMS, fmtKst, pillarHanja, type PositionInfo, type SajuAnalysis } from '../engine/index.ts';
import { EL_WORD } from '../report/plain.ts';
import { Disclosure, Gloss, SectionTitle, Term } from './common.tsx';

/** 전통 표기 순서: 오른쪽에서 왼쪽으로 년·월·일·시 → 화면에는 시·일·월·년 */
const ORDER = ['hour', 'day', 'month', 'year'] as const;
const LABEL: Record<string, string> = { hour: '시주', day: '일주', month: '월주', year: '년주' };
const MEANING: Record<string, string> = { hour: '자녀·말년', day: '나·배우자', month: '부모·사회', year: '조상·초년' };

const columns = (a: SajuAnalysis) => ORDER.map((k) => ({ key: k, p: a.positions.find((x) => x.pos === k) ?? null }));
/** 한자 아래 붙이는 한글 독음과 오행 — 甲 → 갑 · 나무 */
const stemReading = (i: number) => `${STEMS[i].ko} · ${EL_WORD[STEMS[i].element]}`;
const branchReading = (i: number) => `${BRANCHES[i].ko} · ${EL_WORD[BRANCHES[i].element]}`;

function TenGod({ p, branch = false }: { p: PositionInfo; branch?: boolean }) {
  if (!branch && p.stemTenGod === '일간') {
    return (
      <span className="font-bold text-accent">
        나 <span className="font-normal text-sub">(<Term t="일간">일간</Term>)</span>
      </span>
    );
  }
  const t = branch ? p.branchTenGod : p.stemTenGod;
  return <Term t={t}>{t}</Term>;
}

/**
 * 사주 원국 — 네 기둥을 세로로 세운 전통 표.
 * 위아래 굵은 선, 기둥 사이 가는 선, '나'의 기둥(일주)만 옅은 포인트 면.
 */
export function PillarTable({ a }: { a: SajuAnalysis }) {
  const cols = columns(a);
  const cell = (key: string, i: number) => `${i > 0 ? 'border-l border-line' : ''} ${key === 'day' ? 'bg-accent-soft' : ''}`;
  const hanja = (ch: string, reading: string) => (
    <div className="flex flex-col items-center">
      <span className="font-serif text-[40px] leading-none font-bold text-ink">{ch}</span>
      <span className="mt-2 text-micro text-sub">{reading}</span>
    </div>
  );
  const unknown = <span className="text-label text-faint">모름</span>;
  return (
    <figure>
      <table className="w-full table-fixed border-collapse border-y-[1.5px] border-line-strong text-center">
        <caption className="sr-only">사주 원국 — 시주, 일주, 월주, 년주</caption>
        <thead>
          <tr className="border-b border-line">
            {cols.map(({ key }, i) => (
              <th key={key} scope="col" className={`px-1 py-2.5 font-normal ${cell(key, i)}`}>
                <span className="block text-label font-semibold text-ink">{LABEL[key]}</span>
                <span className="mt-0.5 block text-micro text-sub">{MEANING[key]}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            {cols.map(({ key, p }, i) => (
              <td key={key} className={`px-1 pt-3 pb-2 text-cap text-sub ${cell(key, i)}`}>
                {p ? <TenGod p={p} /> : '·'}
              </td>
            ))}
          </tr>
          <tr>
            {cols.map(({ key, p }, i) => (
              <td key={key} className={`h-[84px] px-1 py-2 ${cell(key, i)}`}>
                {p ? hanja(STEMS[p.pillar.stem].hanja, stemReading(p.pillar.stem)) : unknown}
              </td>
            ))}
          </tr>
          <tr>
            {cols.map(({ key, p }, i) => (
              <td key={key} className={`h-[84px] px-1 py-2 ${cell(key, i)}`}>
                {p ? hanja(BRANCHES[p.pillar.branch].hanja, branchReading(p.pillar.branch)) : unknown}
              </td>
            ))}
          </tr>
          <tr>
            {cols.map(({ key, p }, i) => (
              <td key={key} className={`px-1 pt-2 pb-3 text-cap text-sub ${cell(key, i)}`}>
                {p ? <TenGod p={p} branch /> : '·'}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
      <figcaption className="mt-3 text-cap text-sub">
        위 글자는 <Term t="천간">천간</Term>, 아래 글자는 <Term t="지지">지지</Term>예요. 작은 글씨는 나를 기준으로 본 관계(<Term t="십성">십성</Term>)예요.
        {!a.pillars.timeKnown && ' 태어난 시간을 몰라 시주는 비워 두고 여섯 글자로 풀었어요.'}
      </figcaption>
    </figure>
  );
}

function fmtLocal(ms: number) {
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
}
function signed(min: number) {
  const s = min >= 0 ? '+' : '−';
  const x = Math.abs(min);
  return `${s}${Math.floor(x)}분 ${Math.round((x % 1) * 60)}초`;
}

/** 경계 민감도 — 결과가 달라질 수 있는 지점 */
export function BoundaryWarnings({ a }: { a: SajuAnalysis }) {
  if (a.warnings.length === 0) return null;
  return (
    <div className="border-l-2 border-ink pl-4">
      <p className="text-ui font-semibold text-ink">결과가 달라질 수 있는 지점</p>
      <ul className="mt-2 space-y-3 text-label text-ink-2">
        {a.warnings.map((w, i) => (
          <li key={i}>
            <Gloss text={w.message} />
            {w.alternative && <div className="mt-1 font-semibold text-ink">{w.alternative}</div>}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** 만세력 상세 — 원국 상세표, 계산 기준, 시간 보정 내역 */
export function Manseryeok({ a }: { a: SajuAnalysis }) {
  const p = a.pillars;
  const cols = columns(a);
  const tz = a.input.timeZone;
  const row = (title: string, render: (x: PositionInfo) => ReactNode, top = true) => (
    <tr className={top ? 'border-t border-line' : ''}>
      <th scope="row" className="py-3 pr-2 text-left align-middle text-micro font-semibold text-sub">
        <Gloss text={title} />
      </th>
      {cols.map(({ key, p: c }) => (
        <td key={key} className={`px-0.5 py-3 text-center align-middle text-cap text-ink-2 ${key === 'day' ? 'bg-accent-soft' : ''}`}>
          {c ? render(c) : <span className="text-faint">—</span>}
        </td>
      ))}
    </tr>
  );
  const big = (ch: string, reading: string) => (
    <div className="flex flex-col items-center">
      <span className="font-serif text-[26px] leading-none font-bold text-ink">{ch}</span>
      <span className="mt-1.5 text-micro text-sub">{reading}</span>
    </div>
  );
  const basis: [string, string][] = [
    ['일주', pillarHanja(p.day)],
    ['사주 기준 연도', `${p.sajuYear}년 (입춘 기준)`],
    ['시간 보정', a.input.timeCorrection === 'true' ? '진태양시' : a.input.timeCorrection === 'none' ? '표준시 (보정 없음)' : '평태양시'],
    ['자시 기준', a.input.ziHourRule === 'split' ? '야자시·조자시 나눔' : '23시에 날짜 바뀜'],
  ];

  return (
    <section>
      <SectionTitle
        id="manse"
        kicker="만세력"
        title="원국 상세표"
        desc={<Gloss text="천문 계산으로 구한 네 기둥과 각 글자의 십성·지장간·12운성·신살이에요. 점선 밑줄을 누르면 뜻이 나와요." />}
      />
      <div className="-mx-1 overflow-x-auto">
        <table className="w-full min-w-[320px] table-fixed border-collapse border-y-[1.5px] border-line-strong">
          <thead>
            <tr>
              <th className="w-[3.75rem]" />
              {cols.map(({ key }) => (
                <th key={key} scope="col" className={`py-2.5 text-center text-label font-semibold text-ink ${key === 'day' ? 'bg-accent-soft' : ''}`}>
                  {LABEL[key]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {row('천간 십성', (c) => <TenGod p={c} />)}
            {row('천간', (c) => big(STEMS[c.pillar.stem].hanja, stemReading(c.pillar.stem)))}
            {row('지지', (c) => big(BRANCHES[c.pillar.branch].hanja, branchReading(c.pillar.branch)))}
            {row('지지 십성', (c) => <TenGod p={c} branch />)}
            {row('지장간', (c) => (
              <div className="flex flex-col gap-1">
                {c.hidden.map((h) => (
                  <span key={h.stem} title={`${h.days}일`}>
                    <span className="font-serif font-bold text-ink">{STEMS[h.stem].hanja}</span> {h.tenGod}
                  </span>
                ))}
              </div>
            ))}
            {row('12운성', (c) => <Term t={c.stage}>{c.stage}</Term>)}
            {row('12신살', (c) => <Term t={c.twelveSinsal}>{c.twelveSinsal}</Term>)}
            {row('공망', (c) => (c.gongmang ? <span className="tag-mute">공망</span> : <span className="text-faint">·</span>))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-cap text-sub">12운성은 일간 기준(봉법), 12신살은 년지 기준이에요. 지장간은 여기·중기·정기 순이고, 마우스를 올리면 월률분야 일수가 보여요.</p>

      <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-4">
        {basis.map(([k, v]) => (
          <div key={k}>
            <dt className="text-micro text-sub">
              <Gloss text={k} />
            </dt>
            <dd className="mt-0.5 text-label font-semibold text-ink">{v}</dd>
          </div>
        ))}
      </dl>

      {a.warnings.length > 0 && (
        <div className="mt-8">
          <BoundaryWarnings a={a} />
        </div>
      )}

      <div className="mt-8">
        <Disclosure summary="시간 보정 내역 — 어떻게 계산했나요?" defaultOpen={a.warnings.length > 0}>
          <dl className="grid gap-x-6 gap-y-3 text-label text-ink-2 sm:grid-cols-2">
            <div>
              <dt className="text-micro text-sub">입력</dt>
              <dd>
                {a.input.calendar === 'lunar'
                  ? `음력 ${a.input.year}년 ${a.input.leapMonth ? '윤' : ''}${a.input.month}월 ${a.input.day}일`
                  : `양력 ${a.input.year}년 ${a.input.month}월 ${a.input.day}일`}
                {p.timeKnown ? ` ${String(a.input.hour).padStart(2, '0')}:${String(a.input.minute ?? 0).padStart(2, '0')}` : ' (시간 모름)'} · {a.input.placeName}
              </dd>
            </div>
            <div>
              <dt className="text-micro text-sub">양력 / 음력</dt>
              <dd>
                {p.solarDate.year}-{String(p.solarDate.month).padStart(2, '0')}-{String(p.solarDate.day).padStart(2, '0')} / 음력 {p.lunarDate.year}년 {p.lunarDate.leap ? '윤' : ''}
                {p.lunarDate.month}월 {p.lunarDate.day}일
              </dd>
            </div>
            <div>
              <dt className="text-micro text-sub">당시 표준시 · 서머타임</dt>
              <dd>
                UTC{p.conversion.standardOffsetMinutes >= 0 ? '+' : '−'}
                {Math.floor(Math.abs(p.conversion.standardOffsetMinutes) / 60)}:{String(Math.round(Math.abs(p.conversion.standardOffsetMinutes) % 60)).padStart(2, '0')}
                {p.conversion.dst ? ' · 서머타임 시행 중 (−60분 보정)' : ' · 서머타임 없음'}
              </dd>
            </div>
            {p.timeKnown && p.localSolarMs !== null && (
              <>
                <div>
                  <dt className="text-micro text-sub">경도 보정 (출생지 경도 {a.input.longitude.toFixed(3)}°)</dt>
                  <dd>{a.input.timeCorrection === 'none' ? '적용 안 함' : signed(p.longitudeCorrectionMinutes)}</dd>
                </div>
                {a.input.timeCorrection === 'true' && (
                  <div>
                    <dt className="text-micro text-sub">균시차</dt>
                    <dd>{signed(p.equationOfTimeMinutes)}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-micro text-sub">사주 계산에 쓴 현지 태양시</dt>
                  <dd className="font-semibold text-ink">{fmtLocal(p.localSolarMs)}</dd>
                </div>
              </>
            )}
            <div>
              <dt className="text-micro text-sub">절입 (월주 기준)</dt>
              <dd>
                {p.prevJie.name} {fmtKst(p.prevJie.ms, tz)} → 다음 {p.nextJie.name} {fmtKst(p.nextJie.ms, tz)}
              </dd>
            </div>
            <div>
              <dt className="text-micro text-sub">출생 순간 태양 황경</dt>
              <dd>
                {p.sunLongitude.toFixed(4)}° (절입 후 {p.daysSincePrevJie.toFixed(2)}일)
              </dd>
            </div>
          </dl>
          <p className="mt-4 text-cap text-sub">
            절기 시각은 VSOP87 행성 이론으로 태양 황경을 직접 계산해요(1900~2100년 오차 약 ±30초). 음력은 한국천문연구원 기준(한국 표준시 합삭, 무중치윤)으로
            계산하며 1900~2050년 전 구간이 한국천문연구원 자료와 일치함을 확인했어요.
          </p>
        </Disclosure>
      </div>
    </section>
  );
}
