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
  /** 고유 이름 — 결과 화면과 공유 주소에 그대로 쓴다 */
  name: string;
  longitude: number;
  latitude: number;
  timeZone: string;
  /** 고르는 칸에 보이는 짧은 이름 (없으면 name) */
  label?: string;
}

/** 국내 출생지는 시·도를 먼저 고르고 그 안의 시·군을 고른다 */
export interface Region {
  /** 탭에 보이는 짧은 이름 */
  name: string;
  full: string;
  cities: City[];
  /** 옛 지명 안내 */
  note?: string;
}

/**
 * 좌표는 시청·군청 자리(소수 셋째 자리). 경도 0.1°가 해의 시각 24초라, 같은 시·군 안의 차이는 계산에 거의 영향이 없다.
 * 이름은 겹치지 않게: 광주광역시는 '광주', 경기도 광주시는 '경기 광주', 고성군은 '강원 고성'·'경남 고성'.
 */
const kr = (name: string, longitude: number, latitude: number, label?: string): City => ({ name, longitude, latitude, timeZone: 'Asia/Seoul', ...(label ? { label } : {}) });
const nk = (name: string, longitude: number, latitude: number): City => ({ name, longitude, latitude, timeZone: 'Asia/Pyongyang' });

export const REGIONS: Region[] = [
  { name: '서울', full: '서울특별시', cities: [kr('서울', 126.978, 37.566)] },
  { name: '부산', full: '부산광역시', cities: [kr('부산', 129.075, 35.18), kr('기장', 129.219, 35.245)] },
  { name: '대구', full: '대구광역시', cities: [kr('대구', 128.601, 35.871), kr('달성', 128.431, 35.775), kr('군위', 128.573, 36.243)], note: '군위는 2023년부터 대구에 속해요.' },
  {
    name: '인천',
    full: '인천광역시',
    cities: [kr('인천', 126.705, 37.456), kr('강화', 126.488, 37.747), kr('옹진', 126.47, 37.25), kr('백령도', 124.7, 37.96, '백령·대청도'), kr('연평도', 125.7, 37.665)],
    note: '서해 섬은 육지와 해의 시각이 몇 분씩 달라서 백령·대청도와 연평도를 따로 두었어요. 영흥·덕적 같은 그 밖의 섬은 옹진을 고르세요.',
  },
  { name: '광주', full: '광주광역시', cities: [kr('광주', 126.851, 35.16)] },
  { name: '대전', full: '대전광역시', cities: [kr('대전', 127.385, 36.351)] },
  { name: '울산', full: '울산광역시', cities: [kr('울산', 129.311, 35.539), kr('울주', 129.242, 35.522)] },
  { name: '세종', full: '세종특별자치시', cities: [kr('세종', 127.289, 36.48)] },
  {
    name: '경기',
    full: '경기도',
    cities: [
      kr('수원', 127.028, 37.263),
      kr('성남', 127.126, 37.42),
      kr('고양', 126.832, 37.658),
      kr('용인', 127.177, 37.241),
      kr('부천', 126.766, 37.504),
      kr('화성', 126.831, 37.2),
      kr('안산', 126.831, 37.322),
      kr('남양주', 127.216, 37.636),
      kr('안양', 126.957, 37.394),
      kr('평택', 127.113, 36.992),
      kr('시흥', 126.803, 37.38),
      kr('파주', 126.78, 37.76),
      kr('의정부', 127.033, 37.738),
      kr('김포', 126.716, 37.615),
      kr('경기 광주', 127.255, 37.43, '광주'),
      kr('광명', 126.865, 37.479),
      kr('군포', 126.935, 37.362),
      kr('하남', 127.215, 37.539),
      kr('오산', 127.077, 37.15),
      kr('양주', 127.046, 37.785),
      kr('이천', 127.443, 37.272),
      kr('구리', 127.13, 37.594),
      kr('안성', 127.28, 37.008),
      kr('포천', 127.2, 37.895),
      kr('의왕', 126.968, 37.345),
      kr('양평', 127.487, 37.492),
      kr('여주', 127.638, 37.298),
      kr('동두천', 127.061, 37.904),
      kr('과천', 126.988, 37.429),
      kr('가평', 127.51, 37.832),
      kr('연천', 127.075, 38.096),
    ],
    note: '송탄은 평택, 미금은 남양주, 일산은 고양, 분당은 성남으로 골라 주세요.',
  },
  {
    name: '강원',
    full: '강원특별자치도',
    cities: [
      kr('춘천', 127.73, 37.881),
      kr('원주', 127.92, 37.342),
      kr('강릉', 128.876, 37.752),
      kr('동해', 129.114, 37.525),
      kr('태백', 128.986, 37.164),
      kr('속초', 128.592, 38.207),
      kr('삼척', 129.165, 37.45),
      kr('홍천', 127.889, 37.697),
      kr('횡성', 127.985, 37.492),
      kr('영월', 128.462, 37.184),
      kr('평창', 128.391, 37.371),
      kr('정선', 128.661, 37.381),
      kr('철원', 127.313, 38.147),
      kr('화천', 127.708, 38.106),
      kr('양구', 127.99, 38.11),
      kr('인제', 128.171, 38.07),
      kr('강원 고성', 128.468, 38.381, '고성'),
      kr('양양', 128.619, 38.075),
    ],
  },
  {
    name: '충북',
    full: '충청북도',
    cities: [
      kr('청주', 127.489, 36.642),
      kr('충주', 127.926, 36.991),
      kr('제천', 128.191, 37.133),
      kr('보은', 127.729, 36.49),
      kr('옥천', 127.571, 36.306),
      kr('영동', 127.783, 36.175),
      kr('증평', 127.581, 36.785),
      kr('진천', 127.436, 36.855),
      kr('괴산', 127.787, 36.815),
      kr('음성', 127.69, 36.94),
      kr('단양', 128.366, 36.985),
    ],
    note: '청원은 청주로 골라 주세요.',
  },
  {
    name: '충남',
    full: '충청남도',
    cities: [
      kr('천안', 127.114, 36.815),
      kr('공주', 127.119, 36.446),
      kr('보령', 126.613, 36.333),
      kr('아산', 127.002, 36.79),
      kr('서산', 126.45, 36.785),
      kr('논산', 127.099, 36.187),
      kr('계룡', 127.249, 36.275),
      kr('당진', 126.646, 36.89),
      kr('금산', 127.488, 36.109),
      kr('부여', 126.91, 36.276),
      kr('서천', 126.692, 36.08),
      kr('청양', 126.802, 36.459),
      kr('홍성', 126.661, 36.601),
      kr('예산', 126.845, 36.683),
      kr('태안', 126.298, 36.746),
    ],
    note: '온양은 아산, 대천은 보령으로 골라 주세요.',
  },
  {
    name: '전북',
    full: '전북특별자치도',
    cities: [
      kr('전주', 127.148, 35.824),
      kr('군산', 126.737, 35.968),
      kr('익산', 126.957, 35.948),
      kr('정읍', 126.856, 35.57),
      kr('남원', 127.39, 35.416),
      kr('김제', 126.881, 35.804),
      kr('완주', 127.162, 35.905),
      kr('진안', 127.425, 35.792),
      kr('무주', 127.661, 36.007),
      kr('장수', 127.521, 35.647),
      kr('임실', 127.279, 35.618),
      kr('순창', 127.137, 35.374),
      kr('고창', 126.702, 35.436),
      kr('부안', 126.733, 35.732),
    ],
    note: '이리는 익산, 정주는 정읍으로 골라 주세요.',
  },
  {
    name: '전남',
    full: '전라남도',
    cities: [
      kr('목포', 126.392, 34.812),
      kr('여수', 127.662, 34.76),
      kr('순천', 127.487, 34.951),
      kr('나주', 126.711, 35.016),
      kr('광양', 127.696, 34.941),
      kr('담양', 126.988, 35.321),
      kr('곡성', 127.292, 35.282),
      kr('구례', 127.463, 35.203),
      kr('고흥', 127.285, 34.611),
      kr('보성', 127.08, 34.771),
      kr('화순', 126.987, 35.064),
      kr('장흥', 126.907, 34.682),
      kr('강진', 126.767, 34.642),
      kr('해남', 126.599, 34.573),
      kr('영암', 126.697, 34.8),
      kr('무안', 126.481, 34.99),
      kr('함평', 126.516, 35.066),
      kr('영광', 126.512, 35.277),
      kr('장성', 126.785, 35.302),
      kr('완도', 126.755, 34.311),
      kr('진도', 126.263, 34.487),
      kr('신안', 126.351, 34.834),
    ],
    note: '여천은 여수, 승주는 순천, 동광양은 광양으로 골라 주세요.',
  },
  {
    name: '경북',
    full: '경상북도',
    cities: [
      kr('포항', 129.343, 36.019),
      kr('경주', 129.225, 35.856),
      kr('김천', 128.114, 36.14),
      kr('안동', 128.729, 36.568),
      kr('구미', 128.344, 36.12),
      kr('영주', 128.624, 36.806),
      kr('영천', 128.939, 35.973),
      kr('상주', 128.159, 36.411),
      kr('문경', 128.187, 36.587),
      kr('경산', 128.741, 35.825),
      kr('의성', 128.697, 36.353),
      kr('청송', 129.057, 36.436),
      kr('영양', 129.112, 36.667),
      kr('영덕', 129.365, 36.415),
      kr('청도', 128.734, 35.647),
      kr('고령', 128.263, 35.726),
      kr('성주', 128.283, 35.919),
      kr('칠곡', 128.402, 35.996),
      kr('예천', 128.453, 36.658),
      kr('봉화', 128.732, 36.893),
      kr('울진', 129.4, 36.993),
      kr('울릉', 130.906, 37.484),
    ],
    note: '영일은 포항, 점촌은 문경으로 골라 주세요. 군위는 2023년부터 대구에 속해서 대구 탭에 있어요.',
  },
  {
    name: '경남',
    full: '경상남도',
    cities: [
      kr('창원', 128.681, 35.228),
      kr('진주', 128.108, 35.18),
      kr('통영', 128.433, 34.854),
      kr('사천', 128.064, 35.004),
      kr('김해', 128.889, 35.229),
      kr('밀양', 128.746, 35.504),
      kr('거제', 128.621, 34.881),
      kr('양산', 129.037, 35.335),
      kr('의령', 128.262, 35.322),
      kr('함안', 128.407, 35.273),
      kr('창녕', 128.492, 35.545),
      kr('경남 고성', 128.322, 34.973, '고성'),
      kr('남해', 127.892, 34.838),
      kr('하동', 127.751, 35.067),
      kr('산청', 127.874, 35.416),
      kr('함양', 127.725, 35.521),
      kr('거창', 127.909, 35.687),
      kr('합천', 128.166, 35.567),
    ],
    note: '마산·진해는 창원, 충무는 통영, 삼천포는 사천, 장승포는 거제로 골라 주세요.',
  },
  { name: '제주', full: '제주특별자치도', cities: [kr('제주', 126.531, 33.5), kr('서귀포', 126.56, 33.254)] },
  {
    name: '북한',
    full: '북한',
    cities: [
      nk('평양', 125.754, 39.039),
      nk('개성', 126.554, 37.971),
      nk('남포', 125.408, 38.737),
      nk('사리원', 125.756, 38.508),
      nk('해주', 125.716, 38.04),
      nk('신의주', 124.398, 40.1),
      nk('원산', 127.443, 39.153),
      nk('함흥', 127.536, 39.918),
      nk('청진', 129.775, 41.796),
    ],
  },
];

export const OVERSEAS: City[] = [
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

/** 모든 출생지 (이름은 겹치지 않는다) */
export const CITIES: City[] = [...REGIONS.flatMap((r) => r.cities), ...OVERSEAS];

/** 이 출생지가 든 시·도 (국내가 아니면 undefined) */
export const regionOf = (name: string): Region | undefined => REGIONS.find((r) => r.cities.some((c) => c.name === name));

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
