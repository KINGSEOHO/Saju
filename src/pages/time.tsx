/** /time/ — 출생시간 보정 계산기 (검색으로 들어오는 페이지). 계산은 이 브라우저 안에서만 해요 */
import { StrictMode, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import 'pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css';
import '../index.css';
import { BRANCHES, STEMS } from '../engine/constants.ts';
import { computePillars, type BirthInput, type Pillar } from '../engine/pillars.ts';
import { REGIONS } from '../engine/timezone.ts';
import { encodeInput } from '../lib/share.ts';

const KOREA = REGIONS.filter((r) => r.cities[0].timeZone === 'Asia/Seoul');
const ko = (p: Pillar | null) => (p ? STEMS[p.stem].ko + BRANCHES[p.branch].ko : '-');
const hanja = (p: Pillar | null) => (p ? STEMS[p.stem].hanja + BRANCHES[p.branch].hanja : '');
const hhmm = (ms: number) => {
  const d = new Date(ms);
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
};
const sign = (n: number) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${Math.abs(Math.round(n))}분`;

function Calc() {
  const [date, setDate] = useState('1988-07-15');
  const [time, setTime] = useState('01:40');
  const [region, setRegion] = useState(KOREA[0].name);
  const [city, setCity] = useState(KOREA[0].cities[0].name);
  const [gender, setGender] = useState<'male' | 'female'>('female');
  const cities = KOREA.find((r) => r.name === region)!.cities;
  const out = useMemo(() => {
    const [y, m, d] = date.split('-').map(Number);
    const [h, mi] = time.split(':').map(Number);
    const c = cities.find((x) => x.name === city) ?? cities[0];
    if (!y || y < 1900 || y > 2100 || !m || !d || Number.isNaN(h) || Number.isNaN(mi)) return null;
    const input: BirthInput = { gender, calendar: 'solar', year: y, month: m, day: d, hour: h, minute: mi, longitude: c.longitude, timeZone: c.timeZone, placeName: c.name };
    const real = computePillars(input);
    // 보정을 하나도 하지 않는 계산: 시계 시각을 그대로 동경 135° 표준시로 본다
    const raw = computePillars({ ...input, longitude: 135, timeZone: 'Etc/GMT-9' });
    return { input, real, raw, c };
  }, [date, time, city, cities, gender]);

  return (
    <div className="panel">
      <div className="grid grid-cols-2 gap-3">
        <label className="col-span-2 block">
          <span className="text-label font-semibold text-ink">태어난 날 (양력)</span>
          <input type="date" className="field mt-2" min="1900-01-01" max="2100-12-31" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <label className="block">
          <span className="text-label font-semibold text-ink">기록된 시각</span>
          <input type="time" className="field mt-2" value={time} onChange={(e) => setTime(e.target.value)} />
        </label>
        <label className="block">
          <span className="text-label font-semibold text-ink">성별</span>
          <select className="field mt-2" value={gender} onChange={(e) => setGender(e.target.value as 'male' | 'female')}>
            <option value="female">여자</option>
            <option value="male">남자</option>
          </select>
        </label>
        <label className="block">
          <span className="text-label font-semibold text-ink">태어난 곳</span>
          <select
            className="field mt-2"
            value={region}
            onChange={(e) => {
              setRegion(e.target.value);
              setCity(KOREA.find((r) => r.name === e.target.value)!.cities[0].name);
            }}
          >
            {KOREA.map((r) => (
              <option key={r.name} value={r.name}>
                {r.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-label font-semibold text-ink">시·군</span>
          <select className="field mt-2" value={city} onChange={(e) => setCity(e.target.value)} disabled={cities.length < 2}>
            {cities.map((c) => (
              <option key={c.name} value={c.name}>
                {c.label ?? c.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      {out ? <Result {...out} /> : <p className="mt-5 text-label text-sub">1900~2100년 사이 날짜와 시각을 넣어 주세요.</p>}
    </div>
  );
}

function Result({ input, real, raw, c }: { input: BirthInput; real: ReturnType<typeof computePillars>; raw: ReturnType<typeof computePillars>; c: { name: string } }) {
  const dst = real.conversion.dst;
  const std = real.conversion.standardOffsetMinutes;
  const changed = ko(real.hour) !== ko(raw.hour);
  const dayChanged = ko(real.day) !== ko(raw.day);
  const rows: [string, string][] = [
    ['기록된 시각', `${String(input.hour).padStart(2, '0')}:${String(input.minute).padStart(2, '0')}`],
    ...(dst ? ([['서머타임', '−60분 (그때 시계를 1시간 앞당겼어요)']] as [string, string][]) : []),
    ...(std !== 540 ? ([['그때 표준시', `지금보다 ${Math.round(540 - std)}분 늦은 시계를 썼어요`]] as [string, string][]) : []),
    [`${c.name}의 해 시각 보정`, sign(real.longitudeCorrectionMinutes)],
    ['사주에 쓰는 시각', real.localSolarMs !== null ? hhmm(real.localSolarMs) : '-'],
  ];
  return (
    <div className="mt-6 border-t border-paper-edge pt-5">
      <dl className="space-y-2">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-4 text-label">
            <dt className="text-sub">{k}</dt>
            <dd className="text-right font-semibold text-ink tabular-nums">{v}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-5 grid grid-cols-2 gap-3 text-center">
        <div className="rounded-xl bg-bg p-3">
          <p className="text-cap text-sub">보정하지 않으면</p>
          <p className="mt-1 text-title3 font-bold text-ink">
            {BRANCHES[raw.hour!.branch].ko}시 <span className="hanja text-sub">{hanja(raw.hour)}</span>
          </p>
          <p className="text-cap text-sub">일주 {ko(raw.day)}</p>
        </div>
        <div className="rounded-xl bg-bg p-3 ring-1 ring-accent">
          <p className="text-cap text-accent">보정하면</p>
          <p className="mt-1 text-title3 font-bold text-ink">
            {BRANCHES[real.hour!.branch].ko}시 <span className="hanja text-sub">{hanja(real.hour)}</span>
          </p>
          <p className="text-cap text-sub">일주 {ko(real.day)}</p>
        </div>
      </div>
      <p className="mt-4 text-label text-ink">
        {changed || dayChanged
          ? `보정하면 ${dayChanged ? '일주와 시주가' : '시주가'} 달라져요. 보정하지 않는 만세력에서는 다른 사주로 나와요.`
          : '이 시각은 보정해도 시주가 그대로예요. 다만 시의 경계(홀수 시 정각) 가까이 태어났다면 몇 분 차이로 바뀔 수 있어요.'}
      </p>
      {real.conversion.note ? <p className="mt-2 text-cap text-sub">{real.conversion.note}</p> : null}
      <a className="btn-primary mt-5 w-full" href={`../#/r?${encodeInput(input)}`}>
        이 시각으로 내 사주 전체 보기
      </a>
      <p className="mt-2 text-center text-cap text-sub">입력한 값은 서버로 보내지 않아요. 이 브라우저 안에서만 계산해요.</p>
    </div>
  );
}

createRoot(document.getElementById('calc')!).render(
  <StrictMode>
    <Calc />
  </StrictMode>,
);
