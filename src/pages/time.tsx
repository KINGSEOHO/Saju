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

const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const YEARS = range(1900, new Date().getFullYear()).reverse();

/** 아이폰의 날짜·시각 칸은 자기 너비를 고집해 칸 밖으로 넘쳐서, 어디서나 같은 고르기 칸을 쓴다 */
function Pick({ label, value, set, list, unit }: { label: string; value: number; set: (n: number) => void; list: number[]; unit: string }) {
  return (
    <select aria-label={label} className="field min-w-0 px-3 tabular-nums" value={value} onChange={(e) => set(Number(e.target.value))}>
      {list.map((n) => (
        <option key={n} value={n}>
          {n}
          {unit}
        </option>
      ))}
    </select>
  );
}

function Calc() {
  const [y, setY] = useState(1988);
  const [m, setM] = useState(7);
  const [d, setD] = useState(15);
  const [h, setH] = useState(1);
  const [mi, setMi] = useState(40);
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const [region, setRegion] = useState(KOREA[0].name);
  const [city, setCity] = useState(KOREA[0].cities[0].name);
  const [gender, setGender] = useState<'male' | 'female'>('female');
  const cities = KOREA.find((r) => r.name === region)!.cities;
  const out = useMemo(() => {
    const c = cities.find((x) => x.name === city) ?? cities[0];
    const input: BirthInput = { gender, calendar: 'solar', year: y, month: m, day: Math.min(d, days), hour: h, minute: mi, longitude: c.longitude, timeZone: c.timeZone, placeName: c.name };
    const real = computePillars(input);
    // 보정을 하나도 하지 않는 계산: 시계 시각을 그대로 동경 135° 표준시로 본다
    const raw = computePillars({ ...input, longitude: 135, timeZone: 'Etc/GMT-9' });
    return { input, real, raw, c };
  }, [y, m, d, days, h, mi, city, cities, gender]);

  return (
    <div className="panel">
      <div role="group" aria-label="태어난 날 (양력)" className="min-w-0">
        <p className="text-label font-semibold text-ink">태어난 날 (양력)</p>
        <div className="mt-2 grid grid-cols-[1.4fr_1fr_1fr] gap-2">
          <Pick label="년" value={y} set={setY} list={YEARS} unit="년" />
          <Pick label="월" value={m} set={setM} list={range(1, 12)} unit="월" />
          <Pick label="일" value={Math.min(d, days)} set={setD} list={range(1, days)} unit="일" />
        </div>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        <div role="group" aria-label="기록된 시각" className="col-span-2 min-w-0">
          <p className="text-label font-semibold text-ink">기록된 시각</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <Pick label="시" value={h} set={setH} list={range(0, 23)} unit="시" />
            <Pick label="분" value={mi} set={setMi} list={range(0, 59)} unit="분" />
          </div>
        </div>
        <label className="block min-w-0">
          <span className="block text-label font-semibold text-ink">성별</span>
          <select className="field mt-2 min-w-0 px-3" value={gender} onChange={(e) => setGender(e.target.value as 'male' | 'female')}>
            <option value="female">여자</option>
            <option value="male">남자</option>
          </select>
        </label>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <label className="block min-w-0">
          <span className="block text-label font-semibold text-ink">태어난 곳</span>
          <select
            className="field mt-2 min-w-0 px-3"
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
        <label className="block min-w-0">
          <span className="block text-label font-semibold text-ink">시·군</span>
          <select className="field mt-2 min-w-0 px-3" value={city} onChange={(e) => setCity(e.target.value)} disabled={cities.length < 2}>
            {cities.map((c) => (
              <option key={c.name} value={c.name}>
                {c.label ?? c.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <Result {...out} />
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
