/**
 * 출생 시각 보정
 *
 * 1) 벽시계 시각(출생신고·병원기록 시각) → UTC
 *    - 한국: 시기별 표준시(UTC+8:27:52 LMT / +8:30 / +9) 및 서머타임(1948~1951, 1955~1960, 1987~1988)을
 *      IANA tz 데이터베이스(Asia/Seoul)와 동일한 표로 직접 계산한다.
 *    - 그 외 지역: 브라우저/Node 의 Intl(IANA tz) 데이터로 계산한다.
 * 2) UTC → 지방평균태양시(평태양시) = UTC + 경도/15 시간
 * 3) 진태양시 = 평태양시 + 균시차
 */
import { equationOfTime, msToJd } from './astro.ts';

export interface City {
  name: string;
  longitude: number;
  latitude: number;
  timeZone: string;
}

export const CITIES: City[] = [
  { name: '서울', longitude: 126.978, latitude: 37.566, timeZone: 'Asia/Seoul' },
  { name: '부산', longitude: 129.075, latitude: 35.18, timeZone: 'Asia/Seoul' },
  { name: '대구', longitude: 128.601, latitude: 35.871, timeZone: 'Asia/Seoul' },
  { name: '인천', longitude: 126.705, latitude: 37.456, timeZone: 'Asia/Seoul' },
  { name: '광주', longitude: 126.851, latitude: 35.16, timeZone: 'Asia/Seoul' },
  { name: '대전', longitude: 127.385, latitude: 36.351, timeZone: 'Asia/Seoul' },
  { name: '울산', longitude: 129.311, latitude: 35.539, timeZone: 'Asia/Seoul' },
  { name: '세종', longitude: 127.289, latitude: 36.48, timeZone: 'Asia/Seoul' },
  { name: '수원', longitude: 127.028, latitude: 37.263, timeZone: 'Asia/Seoul' },
  { name: '성남', longitude: 127.126, latitude: 37.42, timeZone: 'Asia/Seoul' },
  { name: '고양', longitude: 126.832, latitude: 37.658, timeZone: 'Asia/Seoul' },
  { name: '용인', longitude: 127.177, latitude: 37.241, timeZone: 'Asia/Seoul' },
  { name: '의정부', longitude: 127.033, latitude: 37.738, timeZone: 'Asia/Seoul' },
  { name: '춘천', longitude: 127.73, latitude: 37.881, timeZone: 'Asia/Seoul' },
  { name: '원주', longitude: 127.92, latitude: 37.342, timeZone: 'Asia/Seoul' },
  { name: '강릉', longitude: 128.876, latitude: 37.752, timeZone: 'Asia/Seoul' },
  { name: '속초', longitude: 128.592, latitude: 38.207, timeZone: 'Asia/Seoul' },
  { name: '청주', longitude: 127.489, latitude: 36.642, timeZone: 'Asia/Seoul' },
  { name: '충주', longitude: 127.926, latitude: 36.991, timeZone: 'Asia/Seoul' },
  { name: '천안', longitude: 127.114, latitude: 36.815, timeZone: 'Asia/Seoul' },
  { name: '공주', longitude: 127.119, latitude: 36.446, timeZone: 'Asia/Seoul' },
  { name: '전주', longitude: 127.148, latitude: 35.824, timeZone: 'Asia/Seoul' },
  { name: '군산', longitude: 126.737, latitude: 35.968, timeZone: 'Asia/Seoul' },
  { name: '익산', longitude: 126.957, latitude: 35.948, timeZone: 'Asia/Seoul' },
  { name: '목포', longitude: 126.392, latitude: 34.812, timeZone: 'Asia/Seoul' },
  { name: '여수', longitude: 127.662, latitude: 34.76, timeZone: 'Asia/Seoul' },
  { name: '순천', longitude: 127.487, latitude: 34.951, timeZone: 'Asia/Seoul' },
  { name: '포항', longitude: 129.343, latitude: 36.019, timeZone: 'Asia/Seoul' },
  { name: '경주', longitude: 129.225, latitude: 35.856, timeZone: 'Asia/Seoul' },
  { name: '안동', longitude: 128.729, latitude: 36.568, timeZone: 'Asia/Seoul' },
  { name: '구미', longitude: 128.344, latitude: 36.12, timeZone: 'Asia/Seoul' },
  { name: '창원', longitude: 128.681, latitude: 35.228, timeZone: 'Asia/Seoul' },
  { name: '진주', longitude: 128.108, latitude: 35.18, timeZone: 'Asia/Seoul' },
  { name: '김해', longitude: 128.889, latitude: 35.229, timeZone: 'Asia/Seoul' },
  { name: '통영', longitude: 128.433, latitude: 34.854, timeZone: 'Asia/Seoul' },
  { name: '제주', longitude: 126.531, latitude: 33.5, timeZone: 'Asia/Seoul' },
  { name: '서귀포', longitude: 126.56, latitude: 33.254, timeZone: 'Asia/Seoul' },
  { name: '울릉', longitude: 130.906, latitude: 37.484, timeZone: 'Asia/Seoul' },
  { name: '평양', longitude: 125.754, latitude: 39.039, timeZone: 'Asia/Pyongyang' },
  { name: '도쿄', longitude: 139.692, latitude: 35.69, timeZone: 'Asia/Tokyo' },
  { name: '오사카', longitude: 135.502, latitude: 34.694, timeZone: 'Asia/Tokyo' },
  { name: '베이징', longitude: 116.407, latitude: 39.904, timeZone: 'Asia/Shanghai' },
  { name: '상하이', longitude: 121.474, latitude: 31.23, timeZone: 'Asia/Shanghai' },
  { name: '홍콩', longitude: 114.169, latitude: 22.319, timeZone: 'Asia/Hong_Kong' },
  { name: '타이베이', longitude: 121.565, latitude: 25.033, timeZone: 'Asia/Taipei' },
  { name: '싱가포르', longitude: 103.82, latitude: 1.352, timeZone: 'Asia/Singapore' },
  { name: '방콕', longitude: 100.502, latitude: 13.756, timeZone: 'Asia/Bangkok' },
  { name: '호치민', longitude: 106.63, latitude: 10.823, timeZone: 'Asia/Ho_Chi_Minh' },
  { name: '하노이', longitude: 105.834, latitude: 21.028, timeZone: 'Asia/Bangkok' },
  { name: '마닐라', longitude: 120.984, latitude: 14.6, timeZone: 'Asia/Manila' },
  { name: '시드니', longitude: 151.209, latitude: -33.869, timeZone: 'Australia/Sydney' },
  { name: '오클랜드', longitude: 174.764, latitude: -36.848, timeZone: 'Pacific/Auckland' },
  { name: '런던', longitude: -0.128, latitude: 51.507, timeZone: 'Europe/London' },
  { name: '파리', longitude: 2.352, latitude: 48.857, timeZone: 'Europe/Paris' },
  { name: '베를린', longitude: 13.405, latitude: 52.52, timeZone: 'Europe/Berlin' },
  { name: '뉴욕', longitude: -74.006, latitude: 40.713, timeZone: 'America/New_York' },
  { name: '시카고', longitude: -87.63, latitude: 41.878, timeZone: 'America/Chicago' },
  { name: '로스앤젤레스', longitude: -118.244, latitude: 34.052, timeZone: 'America/Los_Angeles' },
  { name: '시애틀', longitude: -122.332, latitude: 47.606, timeZone: 'America/Los_Angeles' },
  { name: '밴쿠버', longitude: -123.121, latitude: 49.283, timeZone: 'America/Vancouver' },
  { name: '토론토', longitude: -79.383, latitude: 43.653, timeZone: 'America/Toronto' },
  { name: '호놀룰루', longitude: -157.858, latitude: 21.307, timeZone: 'Pacific/Honolulu' },
  { name: '상파울루', longitude: -46.633, latitude: -23.55, timeZone: 'America/Sao_Paulo' },
];

// ---------------------------------------------------------------------------
// 한국 표준시 / 서머타임 (IANA tzdata Asia/Seoul, Rule ROK)
// ---------------------------------------------------------------------------

/** 벽시계 기준 [시작, 끝) 구간 (현지 표준시 분 단위 비교용) */
interface DstPeriod {
  /** 서머타임 시작: 현지 표준시 기준 */
  start: [number, number, number, number]; // y, m, d, hour
  /** 서머타임 종료: 현지 서머타임 기준 벽시계 */
  end: [number, number, number, number];
}

function nthWeekdayOnOrAfter(y: number, m: number, d: number, weekday: number): number {
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return d + ((weekday - dow + 7) % 7);
}

function koreaDstPeriods(): DstPeriod[] {
  const p: DstPeriod[] = [];
  // 1948: 6/1 00:00 ~ 9/12 24:00
  p.push({ start: [1948, 6, 1, 0], end: [1948, 9, 13, 0] });
  // 1949: 4/3 00:00 ~ Sep Sat>=7 24:00
  p.push({ start: [1949, 4, 3, 0], end: [1949, 9, nthWeekdayOnOrAfter(1949, 9, 7, 6) + 1, 0] });
  p.push({ start: [1950, 4, 1, 0], end: [1950, 9, nthWeekdayOnOrAfter(1950, 9, 7, 6) + 1, 0] });
  p.push({ start: [1951, 5, 6, 0], end: [1951, 9, nthWeekdayOnOrAfter(1951, 9, 7, 6) + 1, 0] });
  p.push({ start: [1955, 5, 5, 0], end: [1955, 9, 9, 0] });
  p.push({ start: [1956, 5, 20, 0], end: [1956, 9, 30, 0] });
  for (let y = 1957; y <= 1960; y++) {
    p.push({
      start: [y, 5, nthWeekdayOnOrAfter(y, 5, 1, 0), 0],
      end: [y, 9, nthWeekdayOnOrAfter(y, 9, 17, 6) + 1, 0],
    });
  }
  for (const y of [1987, 1988]) {
    p.push({
      start: [y, 5, nthWeekdayOnOrAfter(y, 5, 8, 0), 2],
      end: [y, 10, nthWeekdayOnOrAfter(y, 10, 8, 0), 3],
    });
  }
  return p;
}
const KOREA_DST = koreaDstPeriods();

/** 한국 표준시 오프셋(분) — 해당 벽시계 시각 기준 */
function koreaStandardOffsetMinutes(y: number, m: number, d: number): number {
  const key = y * 10000 + m * 100 + d;
  if (key < 19080401) return 8 * 60 + 27 + 52 / 60; // 서울 지방평균시 LMT
  if (key < 19120101) return 8 * 60 + 30;
  if (key < 19540321) return 9 * 60;
  if (key < 19610810) return 8 * 60 + 30;
  return 9 * 60;
}

export interface UtcConversion {
  /** UTC Unix ms */
  utcMs: number;
  /** 적용된 표준시 오프셋(분) */
  standardOffsetMinutes: number;
  /** 서머타임 적용 여부 */
  dst: boolean;
  /** 서머타임 전환 경계의 모호/불가능 시각 여부 */
  ambiguous: boolean;
  note?: string;
}

function koreaWallToUtc(y: number, mo: number, d: number, h: number, mi: number): UtcConversion {
  const std = koreaStandardOffsetMinutes(y, mo, d);
  const wall = Date.UTC(y, mo - 1, d, h, mi);
  let dst = false;
  let ambiguous = false;
  for (const p of KOREA_DST) {
    const s = Date.UTC(p.start[0], p.start[1] - 1, p.start[2], p.start[3]);
    const e = Date.UTC(p.end[0], p.end[1] - 1, p.end[2], p.end[3]);
    if (wall >= s && wall < e) {
      dst = true;
      // 시작 직후 1시간은 존재하지 않는 시각(시계를 1시간 앞당김)
      if (wall < s + 3600000) ambiguous = true;
    }
    // 종료 직전 1시간은 두 번 존재(서머타임/표준시)
    if (wall >= e - 3600000 && wall < e) ambiguous = true;
  }
  const offset = std + (dst ? 60 : 0);
  return {
    utcMs: wall - offset * 60000,
    standardOffsetMinutes: std,
    dst,
    ambiguous,
    note: ambiguous ? '서머타임 전환 시점 부근의 시각이라 실제 시각이 1시간 다를 수 있어요.' : undefined,
  };
}

/** Intl 로 특정 UTC 시점의 해당 지역 오프셋(분) */
function intlOffsetMinutes(utcMs: number, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const parts = Object.fromEntries(dtf.formatToParts(new Date(utcMs)).map((p) => [p.type, p.value]));
  let year = Number(parts.year);
  if (parts.era === 'BC') year = 1 - year;
  const asUtc = Date.UTC(year, Number(parts.month) - 1, Number(parts.day), Number(parts.hour) % 24, Number(parts.minute), Number(parts.second));
  return Math.round((asUtc - Math.floor(utcMs / 1000) * 1000) / 1000) / 60;
}

function intlWallToUtc(y: number, mo: number, d: number, h: number, mi: number, timeZone: string): UtcConversion {
  const wall = Date.UTC(y, mo - 1, d, h, mi);
  const off1 = intlOffsetMinutes(wall, timeZone);
  let utc = wall - off1 * 60000;
  const off2 = intlOffsetMinutes(utc, timeZone);
  let ambiguous = false;
  if (off2 !== off1) {
    utc = wall - off2 * 60000;
    const off3 = intlOffsetMinutes(utc, timeZone);
    if (off3 !== off2) ambiguous = true;
  }
  const finalOffset = intlOffsetMinutes(utc, timeZone);
  // 표준시 오프셋: 1월과 7월 중 작은 값 (남반구 포함)
  const jan = intlOffsetMinutes(Date.UTC(y, 0, 15), timeZone);
  const jul = intlOffsetMinutes(Date.UTC(y, 6, 15), timeZone);
  const std = Math.min(jan, jul);
  return {
    utcMs: utc,
    standardOffsetMinutes: std,
    dst: finalOffset > std,
    ambiguous,
    note: ambiguous ? '서머타임 전환 시점 부근의 시각이라 실제 시각이 1시간 다를 수 있어요.' : undefined,
  };
}

/** 벽시계 시각 → UTC */
export function wallTimeToUtc(y: number, mo: number, d: number, h: number, mi: number, timeZone: string): UtcConversion {
  if (timeZone === 'Asia/Seoul') return koreaWallToUtc(y, mo, d, h, mi);
  return intlWallToUtc(y, mo, d, h, mi, timeZone);
}

export type TimeCorrection = 'mean' | 'true' | 'none';

export interface SolarTimeResult {
  /** 보정 후 '현지 태양시'를 UTC 표기 필드로 담은 ms (getUTC* 로 읽는다) */
  localMs: number;
  /** 경도 보정(분) = 경도×4 − 표준시 오프셋 */
  longitudeCorrectionMinutes: number;
  /** 균시차(분), 진태양시일 때만 */
  equationOfTimeMinutes: number;
  /** 서머타임 보정(분) */
  dstCorrectionMinutes: number;
}

/**
 * 사주 시주·일주 판정에 쓰는 현지 시각.
 * - mean: 지방평균태양시 (경도 보정)
 * - true: 진태양시 (경도 보정 + 균시차)
 * - none: 보정 없음 (서머타임만 제거한 표준시)
 */
export function localSolarTime(conv: UtcConversion, longitude: number, mode: TimeCorrection): SolarTimeResult {
  const dstCorrectionMinutes = conv.dst ? -60 : 0;
  if (mode === 'none') {
    return {
      localMs: conv.utcMs + conv.standardOffsetMinutes * 60000,
      longitudeCorrectionMinutes: 0,
      equationOfTimeMinutes: 0,
      dstCorrectionMinutes,
    };
  }
  const lmtMs = conv.utcMs + longitude * 4 * 60000;
  const longitudeCorrectionMinutes = longitude * 4 - conv.standardOffsetMinutes;
  if (mode === 'mean') {
    return { localMs: lmtMs, longitudeCorrectionMinutes, equationOfTimeMinutes: 0, dstCorrectionMinutes };
  }
  const eot = equationOfTime(msToJd(conv.utcMs));
  return {
    localMs: lmtMs + eot * 60000,
    longitudeCorrectionMinutes,
    equationOfTimeMinutes: eot,
    dstCorrectionMinutes,
  };
}
