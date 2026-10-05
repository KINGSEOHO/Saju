/**
 * 한국 음력(태음태양력) 계산
 *
 * 한국천문연구원(KASI) 역법 규칙을 천문 계산으로 재현한다.
 *  1) 한국 표준시 기준으로 합삭(삭)이 든 날이 음력 초하루
 *  2) 동지(冬至)가 든 달이 11월
 *  3) 동지~다음 동지 사이에 달이 13개면, 중기(中氣)가 없는 첫 달이 윤달(무중치윤법)
 *
 * 역법 계산의 기준 자오선은 시기별로 다르다.
 * (~1911-12-31: UTC+8, 1954-03-21~1961-08-09: UTC+8:30, 그 외: UTC+9)
 * 이 규칙은 tests/calendar.test.ts 에서 KASI 데이터(1900~2050) 전 구간과 대조 검증한다.
 */
import { jdn, jdnToDate, newMoonKBefore, newMoonUT, solarTermInYear, julianDay } from './astro.ts';

export interface LunarMonth {
  /** 음력 연도 */
  year: number;
  /** 1~12 */
  month: number;
  leap: boolean;
  /** 초하루의 JDN */
  startJdn: number;
  /** 해당 월의 일수(29 또는 30) */
  days: number;
}

export interface LunarDate {
  year: number;
  month: number;
  day: number;
  leap: boolean;
}

/** 역법 계산용 기준 시차(시간). JD(UT) 시점의 한국 표준 자오선 */
export function calendarOffsetHours(jdUT: number): number {
  // 1912년 이전: 동경 120° (UTC+8) — KASI 1900~1911 자료와 일치
  if (jdUT < julianDay(1912, 1, 1) - 9 / 24) return 8;
  // 1954-03-21 ~ 1961-08-09: 동경 127.5° (UTC+8:30)
  if (jdUT >= julianDay(1954, 3, 21) - 9 / 24 && jdUT < julianDay(1961, 8, 10) - 8.5 / 24) return 8.5;
  return 9;
}

/** JD(UT) → 한국 역법 기준의 그 날짜 JDN */
function localJdn(jdUT: number): number {
  return Math.floor(jdUT + 0.5 + calendarOffsetHours(jdUT) / 24);
}

const chunkCache = new Map<number, LunarMonth[]>();

/** 동지(Y-1)가 든 달(11월)부터 동지(Y)가 든 달 직전까지의 음력 달 목록 */
function monthsChunk(Y: number): LunarMonth[] {
  const cached = chunkCache.get(Y);
  if (cached) return cached;

  const ws1 = solarTermInYear(Y - 1, 270);
  const ws2 = solarTermInYear(Y, 270);
  const ws1Jdn = localJdn(ws1.jdUT);
  const ws2Jdn = localJdn(ws2.jdUT);

  // 동지가 든 날 이전(또는 같은 날)의 삭 → 11월 초하루
  const startOfMonthContaining = (dayJdn: number): number => {
    // dayJdn 하루가 끝나기 전(현지 자정)까지의 마지막 삭
    let k = newMoonKBefore(dayJdn);
    while (localJdn(newMoonUT(k)) > dayJdn) k--;
    while (localJdn(newMoonUT(k + 1)) <= dayJdn) k++;
    return k;
  };
  const k1 = startOfMonthContaining(ws1Jdn);
  const k2 = startOfMonthContaining(ws2Jdn);

  const starts: number[] = [];
  for (let k = k1; k <= k2; k++) starts.push(localJdn(newMoonUT(k)));
  const monthCount = starts.length - 1; // 12 또는 13

  // 중기(황경 30° 배수)의 날짜 목록: Y-1 동지 ~ Y 동지 이후 넉넉히
  const zhongqi: number[] = [];
  for (const yy of [Y - 1, Y, Y + 1]) {
    for (let lon = 0; lon < 360; lon += 30) {
      const t = solarTermInYear(yy, lon);
      zhongqi.push(localJdn(t.jdUT));
    }
  }
  const hasZhongqi = (i: number) => zhongqi.some((z) => z >= starts[i] && z < starts[i + 1]);

  let leapIndex = -1;
  if (monthCount === 13) {
    for (let i = 1; i < monthCount; i++) {
      if (!hasZhongqi(i)) {
        leapIndex = i;
        break;
      }
    }
  }

  const months: LunarMonth[] = [];
  let num = 11;
  for (let i = 0; i < monthCount; i++) {
    const leap = i === leapIndex;
    if (i > 0 && !leap) num = num === 12 ? 1 : num + 1;
    const year = num >= 11 ? Y - 1 : Y;
    months.push({ year, month: num, leap, startJdn: starts[i], days: starts[i + 1] - starts[i] });
  }
  chunkCache.set(Y, months);
  return months;
}

/** 양력 → 음력 */
export function solarToLunar(year: number, month: number, day: number): LunarDate {
  const n = jdn(year, month, day);
  for (const Y of [year, year + 1]) {
    const chunk = monthsChunk(Y);
    for (const m of chunk) {
      if (n >= m.startJdn && n < m.startJdn + m.days) {
        return { year: m.year, month: m.month, day: n - m.startJdn + 1, leap: m.leap };
      }
    }
  }
  throw new Error(`음력 변환 실패: ${year}-${month}-${day}`);
}

/** 해당 음력 연도의 모든 달 (1월~12월, 윤달 포함, 시간순) */
export function lunarYearMonths(lunarYear: number): LunarMonth[] {
  const all = [...monthsChunk(lunarYear), ...monthsChunk(lunarYear + 1)];
  return all.filter((m) => m.year === lunarYear);
}

/** 음력 → 양력. 존재하지 않는 날짜면 null */
export function lunarToSolar(
  lunarYear: number,
  lunarMonth: number,
  lunarDay: number,
  leap = false,
): { year: number; month: number; day: number } | null {
  const m = lunarYearMonths(lunarYear).find((x) => x.month === lunarMonth && x.leap === leap);
  if (!m) return null;
  if (lunarDay < 1 || lunarDay > m.days) return null;
  return jdnToDate(m.startJdn + lunarDay - 1);
}

/** 해당 음력 연도의 윤달(없으면 0) */
export function leapMonthOf(lunarYear: number): number {
  const m = lunarYearMonths(lunarYear).find((x) => x.leap);
  return m ? m.month : 0;
}

/** 해당 음력 월의 일수(29/30). 없으면 0 */
export function lunarMonthDays(lunarYear: number, lunarMonth: number, leap = false): number {
  const m = lunarYearMonths(lunarYear).find((x) => x.month === lunarMonth && x.leap === leap);
  return m ? m.days : 0;
}
