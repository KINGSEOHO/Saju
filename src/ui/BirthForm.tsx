import { useMemo, useState, type FormEvent } from 'react';
import type { BirthInput } from '../engine/index.ts';
import { leapMonthOf, lunarMonthDays } from '../engine/calendar.ts';
import { CITIES } from '../engine/timezone.ts';

const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

function solarDays(y: number, m: number) {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

export function BirthForm({ initial, onSubmit }: { initial?: BirthInput | null; onSubmit: (i: BirthInput) => void }) {
  const [name, setName] = useState(initial?.name ?? '');
  const [gender, setGender] = useState<'male' | 'female' | ''>(initial?.gender ?? '');
  const [calendar, setCalendar] = useState<'solar' | 'lunar'>(initial?.calendar ?? 'solar');
  const [year, setYear] = useState<number>(initial?.year ?? 1990);
  const [month, setMonth] = useState<number>(initial?.month ?? 1);
  const [day, setDay] = useState<number>(initial?.day ?? 1);
  const [leap, setLeap] = useState<boolean>(initial?.leapMonth ?? false);
  const [timeUnknown, setTimeUnknown] = useState<boolean>(initial ? initial.hour === null : false);
  const [hour, setHour] = useState<number>(initial?.hour ?? 12);
  const [minute, setMinute] = useState<number>(initial?.minute ?? 0);
  const initialCity = CITIES.find((c) => c.name === initial?.placeName)?.name ?? (initial ? '__custom' : '서울');
  const [city, setCity] = useState<string>(initialCity);
  const [lon, setLon] = useState<string>(String(initial?.longitude ?? 126.978));
  const [tz, setTz] = useState<string>(initial?.timeZone ?? 'Asia/Seoul');
  const [tc, setTc] = useState<'mean' | 'true' | 'none'>(initial?.timeCorrection ?? 'mean');
  const [zr, setZr] = useState<'traditional' | 'split'>(initial?.ziHourRule ?? 'traditional');
  const [showAdv, setShowAdv] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validYear = year >= 1900 && year <= 2100;
  const leapMonth = useMemo(() => (calendar === 'lunar' && validYear ? leapMonthOf(year) : 0), [calendar, year, validYear]);
  const maxDay = useMemo(() => {
    if (!validYear) return 31;
    if (calendar === 'solar') return solarDays(year, month);
    return lunarMonthDays(year, month, leap && leapMonth === month) || 30;
  }, [calendar, year, month, leap, leapMonth, validYear]);

  function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!gender) return setError('성별을 선택해 주세요. 대운의 방향(순행·역행)을 정하는 데 필요합니다.');
    if (!validYear) return setError('1900년부터 2100년까지 계산할 수 있습니다.');
    if (day > maxDay) return setError(`${calendar === 'lunar' ? '음력 ' : ''}${year}년 ${leap ? '윤' : ''}${month}월은 ${maxDay}일까지 있습니다.`);
    const c = CITIES.find((x) => x.name === city);
    const longitude = c ? c.longitude : Number(lon);
    if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) return setError('경도를 -180~180 사이 숫자로 입력해 주세요.');
    try {
      new Intl.DateTimeFormat('en-US', { timeZone: c ? c.timeZone : tz });
    } catch {
      return setError('시간대(IANA 이름, 예: Asia/Seoul)가 올바르지 않습니다.');
    }
    onSubmit({
      name: name.trim() || undefined,
      gender,
      calendar,
      year,
      month,
      day,
      leapMonth: calendar === 'lunar' && leap && leapMonth === month,
      hour: timeUnknown ? null : hour,
      minute: timeUnknown ? null : minute,
      longitude,
      timeZone: c ? c.timeZone : tz,
      placeName: c ? c.name : `경도 ${longitude}`,
      timeCorrection: tc,
      ziHourRule: zr,
    });
  }

  const seg = (active: boolean) =>
    `flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition ${
      active ? 'bg-stone-900 text-white shadow dark:bg-stone-100 dark:text-stone-900' : 'text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800'
    }`;

  return (
    <form onSubmit={submit} className="card space-y-5" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold">이름 <span className="font-normal text-stone-500">(선택)</span></span>
          <input className="field" value={name} onChange={(e) => setName(e.target.value)} maxLength={20} placeholder="홍길동" autoComplete="off" />
        </label>
        <fieldset>
          <legend className="mb-1.5 block text-sm font-semibold">성별</legend>
          <div className="flex gap-1 rounded-xl border border-stone-300 p-1 dark:border-stone-700">
            <button type="button" className={seg(gender === 'male')} onClick={() => setGender('male')} aria-pressed={gender === 'male'}>
              남성
            </button>
            <button type="button" className={seg(gender === 'female')} onClick={() => setGender('female')} aria-pressed={gender === 'female'}>
              여성
            </button>
          </div>
        </fieldset>
      </div>

      <fieldset>
        <legend className="mb-1.5 block text-sm font-semibold">생년월일</legend>
        <div className="mb-2 flex max-w-xs gap-1 rounded-xl border border-stone-300 p-1 dark:border-stone-700">
          <button type="button" className={seg(calendar === 'solar')} onClick={() => setCalendar('solar')} aria-pressed={calendar === 'solar'}>
            양력
          </button>
          <button type="button" className={seg(calendar === 'lunar')} onClick={() => setCalendar('lunar')} aria-pressed={calendar === 'lunar'}>
            음력
          </button>
        </div>
        <div className="grid grid-cols-[1.4fr_1fr_1fr] gap-2">
          <label>
            <span className="sr-only">년</span>
            <div className="relative">
              <input
                className="field pr-8"
                type="number"
                inputMode="numeric"
                min={1900}
                max={2100}
                value={Number.isNaN(year) ? '' : year}
                onChange={(e) => setYear(parseInt(e.target.value, 10))}
              />
              <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-stone-500">년</span>
            </div>
          </label>
          <label>
            <span className="sr-only">월</span>
            <select className="field" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
              {range(1, 12).map((m) => (
                <option key={m} value={m}>
                  {m}월
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="sr-only">일</span>
            <select className="field" value={day} onChange={(e) => setDay(Number(e.target.value))}>
              {range(1, 31).map((d) => (
                <option key={d} value={d} disabled={d > maxDay}>
                  {d}일
                </option>
              ))}
            </select>
          </label>
        </div>
        {calendar === 'lunar' && (
          <label className={`mt-2 flex items-center gap-2 text-sm ${leapMonth === month ? '' : 'opacity-50'}`}>
            <input type="checkbox" checked={leap && leapMonth === month} disabled={leapMonth !== month} onChange={(e) => setLeap(e.target.checked)} />
            윤달
            <span className="text-xs text-stone-500">
              {leapMonth ? `(${year}년은 윤${leapMonth}월이 있습니다)` : validYear ? `(${year}년은 윤달이 없습니다)` : ''}
            </span>
          </label>
        )}
      </fieldset>

      <fieldset>
        <legend className="mb-1.5 block text-sm font-semibold">태어난 시각</legend>
        <div className="grid grid-cols-2 gap-2 sm:max-w-sm">
          <select className="field" value={hour} disabled={timeUnknown} onChange={(e) => setHour(Number(e.target.value))} aria-label="시">
            {range(0, 23).map((h) => (
              <option key={h} value={h}>
                {h < 12 ? '오전' : '오후'} {h === 0 ? 12 : h > 12 ? h - 12 : h}시 ({String(h).padStart(2, '0')}시)
              </option>
            ))}
          </select>
          <select className="field" value={minute} disabled={timeUnknown} onChange={(e) => setMinute(Number(e.target.value))} aria-label="분">
            {range(0, 59).map((m) => (
              <option key={m} value={m}>
                {String(m).padStart(2, '0')}분
              </option>
            ))}
          </select>
        </div>
        <label className="mt-2 flex items-center gap-2 text-sm">
          <input type="checkbox" checked={timeUnknown} onChange={(e) => setTimeUnknown(e.target.checked)} />
          시간을 모릅니다 <span className="text-xs text-stone-500">(시주 제외 6글자로 분석)</span>
        </label>
        <p className="mt-1.5 text-xs text-stone-500">출생신고서·산모수첩에 기록된 “시계 시각” 그대로 입력하세요. 서머타임·표준시 변경·경도 보정은 자동으로 계산합니다.</p>
      </fieldset>

      <fieldset>
        <legend className="mb-1.5 block text-sm font-semibold">태어난 곳</legend>
        <select className="field sm:max-w-sm" value={city} onChange={(e) => setCity(e.target.value)}>
          <optgroup label="국내">
            {CITIES.filter((c) => c.timeZone === 'Asia/Seoul').map((c) => (
              <option key={c.name} value={c.name}>
                {c.name} (동경 {c.longitude.toFixed(1)}°)
              </option>
            ))}
          </optgroup>
          <optgroup label="해외">
            {CITIES.filter((c) => c.timeZone !== 'Asia/Seoul').map((c) => (
              <option key={c.name} value={c.name}>
                {c.name}
              </option>
            ))}
          </optgroup>
          <option value="__custom">직접 입력 (경도·시간대)</option>
        </select>
        {city === '__custom' && (
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <label className="text-sm">
              경도 (동경 +, 서경 −)
              <input className="field mt-1" inputMode="decimal" value={lon} onChange={(e) => setLon(e.target.value)} />
            </label>
            <label className="text-sm">
              시간대 (IANA)
              <input className="field mt-1" value={tz} onChange={(e) => setTz(e.target.value)} placeholder="Asia/Seoul" />
            </label>
          </div>
        )}
      </fieldset>

      <div>
        <button type="button" className="text-sm font-semibold text-stone-600 underline-offset-4 hover:underline dark:text-stone-300" onClick={() => setShowAdv((s) => !s)} aria-expanded={showAdv}>
          {showAdv ? '▾' : '▸'} 고급 설정 (시간 보정·자시 처리)
        </button>
        {showAdv && (
          <div className="mt-3 grid gap-4 rounded-xl bg-stone-50 p-4 sm:grid-cols-2 dark:bg-stone-800/50">
            <label className="text-sm">
              <span className="font-semibold">시간 보정 방식</span>
              <select className="field mt-1" value={tc} onChange={(e) => setTc(e.target.value as typeof tc)}>
                <option value="mean">평태양시 — 경도 보정 (권장)</option>
                <option value="true">진태양시 — 경도 + 균시차 보정</option>
                <option value="none">보정 없음 — 표준시 그대로</option>
              </select>
              <span className="mt-1 block text-xs text-stone-500">서울은 표준시보다 약 32분 늦게 해가 뜹니다. 대부분의 정통 만세력은 평태양시를 씁니다.</span>
            </label>
            <label className="text-sm">
              <span className="font-semibold">자시(23~01시) 처리</span>
              <select className="field mt-1" value={zr} onChange={(e) => setZr(e.target.value as typeof zr)}>
                <option value="traditional">23시에 날짜 변경 (정통·통자시)</option>
                <option value="split">0시에 날짜 변경 (야자시·조자시)</option>
              </select>
              <span className="mt-1 block text-xs text-stone-500">23시~자정 출생자만 영향을 받습니다. 결과 화면에서 다른 기준의 결과도 함께 보여 드립니다.</span>
            </label>
          </div>
        )}
      </div>

      {error && (
        <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-900 dark:bg-rose-950/50 dark:text-rose-100">
          {error}
        </p>
      )}

      <button type="submit" className="btn-primary w-full py-3.5 text-base">
        사주 분석하기
      </button>
      <p className="text-center text-xs text-stone-500">입력한 생년월일시는 브라우저 안에서만 계산되며 서버로 전송되지 않습니다.</p>
    </form>
  );
}
