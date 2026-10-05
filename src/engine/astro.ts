/**
 * 천문 계산 모듈
 *
 * - 율리우스일(JD) 변환
 * - ΔT (지구자전 보정, Espenak & Meeus 다항식)
 * - VSOP87 (Meeus 축약판) 기반 태양 시황경(apparent longitude)
 * - IAU 1980 장동(주요항) · 광행차 보정
 * - 절기(24기) 시각 역산 (뉴턴 반복)
 * - 합삭(삭) 시각 (Meeus 49장)
 * - 균시차(Equation of Time)
 *
 * 모든 시각은 JD(UT) 기준으로 반환한다. 역학시(TT/JDE)는 내부 계산에만 사용한다.
 */

const DEG = Math.PI / 180;

export function normDeg(x: number): number {
  const r = x % 360;
  return r < 0 ? r + 360 : r;
}

/** 그레고리력(1582-10-15 이후) / 율리우스력 날짜 → JD. day 는 소수(시각 포함) 가능. */
export function julianDay(year: number, month: number, day: number): number {
  let y = year;
  let m = month;
  if (m <= 2) {
    y -= 1;
    m += 12;
  }
  const isGregorian = year > 1582 || (year === 1582 && (month > 10 || (month === 10 && day >= 15)));
  const a = Math.floor(y / 100);
  const b = isGregorian ? 2 - a + Math.floor(a / 4) : 0;
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + day + b - 1524.5;
}

/** Unix ms(UTC) ↔ JD(UT) */
export function msToJd(ms: number): number {
  return ms / 86400000 + 2440587.5;
}
export function jdToMs(jd: number): number {
  return (jd - 2440587.5) * 86400000;
}

/** 정수 그레고리력 날짜의 율리우스 일수(JDN, 정오 기준 정수) */
export function jdn(year: number, month: number, day: number): number {
  return Math.round(julianDay(year, month, day) + 0.5);
}

/** JDN → 그레고리력 날짜 */
export function jdnToDate(n: number): { year: number; month: number; day: number } {
  const ms = jdToMs(n - 0.5);
  const d = new Date(ms);
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

/**
 * ΔT = TT − UT (초). NASA Espenak & Meeus(2006) 다항식.
 * 1900~2100 구간 오차는 수 초 이내이며, 절기 시각에 미치는 영향은 무시 가능한 수준.
 */
export function deltaT(yearDecimal: number): number {
  const y = yearDecimal;
  let t: number;
  if (y < 1800) {
    t = (y - 1820) / 100;
    return -20 + 32 * t * t;
  }
  if (y < 1860) {
    t = y - 1800;
    return (
      13.72 -
      0.332447 * t +
      0.0068612 * t ** 2 +
      0.0041116 * t ** 3 -
      0.00037436 * t ** 4 +
      0.0000121272 * t ** 5 -
      0.0000001699 * t ** 6 +
      0.000000000875 * t ** 7
    );
  }
  if (y < 1900) {
    t = y - 1860;
    return 7.62 + 0.5737 * t - 0.251754 * t ** 2 + 0.01680668 * t ** 3 - 0.0004473624 * t ** 4 + t ** 5 / 233174;
  }
  if (y < 1920) {
    t = y - 1900;
    return -2.79 + 1.494119 * t - 0.0598939 * t ** 2 + 0.0061966 * t ** 3 - 0.000197 * t ** 4;
  }
  if (y < 1941) {
    t = y - 1920;
    return 21.2 + 0.84493 * t - 0.0761 * t ** 2 + 0.0020936 * t ** 3;
  }
  if (y < 1961) {
    t = y - 1950;
    return 29.07 + 0.407 * t - t ** 2 / 233 + t ** 3 / 2547;
  }
  if (y < 1986) {
    t = y - 1975;
    return 45.45 + 1.067 * t - t ** 2 / 260 - t ** 3 / 718;
  }
  if (y < 2005) {
    t = y - 2000;
    return 63.86 + 0.3345 * t - 0.060374 * t ** 2 + 0.0017275 * t ** 3 + 0.000651814 * t ** 4 + 0.00002373599 * t ** 5;
  }
  if (y < 2050) {
    t = y - 2000;
    return 62.92 + 0.32217 * t + 0.005589 * t ** 2;
  }
  if (y < 2150) {
    return -20 + 32 * ((y - 1820) / 100) ** 2 - 0.5628 * (2150 - y);
  }
  t = (y - 1820) / 100;
  return -20 + 32 * t * t;
}

function jdToDecimalYear(jd: number): number {
  return 2000 + (jd - 2451545.0) / 365.25;
}

/** JD(UT) → JDE(TT) */
export function utToTT(jdUT: number): number {
  return jdUT + deltaT(jdToDecimalYear(jdUT)) / 86400;
}
/** JDE(TT) → JD(UT) */
export function ttToUT(jde: number): number {
  return jde - deltaT(jdToDecimalYear(jde)) / 86400;
}

// ---------------------------------------------------------------------------
// VSOP87 지구 계열 (Meeus, Astronomical Algorithms 2nd ed., Appendix III 축약)
// 각 항: [A, B, C] → A·cos(B + C·τ),  단위 1e-8 rad, τ = 율리우스 천년
// ---------------------------------------------------------------------------
type Term = readonly [number, number, number];

const L0: Term[] = [
  [175347046, 0, 0], [3341656, 4.6692568, 6283.07585], [34894, 4.6261, 12566.1517],
  [3497, 2.7441, 5753.3849], [3418, 2.8289, 3.5231], [3136, 3.6277, 77713.7715],
  [2676, 4.4181, 7860.4194], [2343, 6.1352, 3930.2097], [1324, 0.7425, 11506.7698],
  [1273, 2.0371, 529.691], [1199, 1.1096, 1577.3435], [990, 5.233, 5884.927],
  [902, 2.045, 26.298], [857, 3.508, 398.149], [780, 1.179, 5223.694],
  [753, 2.533, 5507.553], [505, 4.583, 18849.228], [492, 4.205, 775.523],
  [357, 2.92, 0.067], [317, 5.849, 11790.629], [284, 1.899, 796.298],
  [271, 0.315, 10977.079], [243, 0.345, 5486.778], [206, 4.806, 2544.314],
  [205, 1.869, 5573.143], [202, 2.458, 6069.777], [156, 0.833, 213.299],
  [132, 3.411, 2942.463], [126, 1.083, 20.775], [115, 0.645, 0.98],
  [103, 0.636, 4694.003], [102, 0.976, 15720.839], [102, 4.267, 7.114],
  [99, 6.21, 2146.17], [98, 0.68, 155.42], [86, 5.98, 161000.69],
  [85, 1.3, 6275.96], [85, 3.67, 71430.7], [80, 1.81, 17260.15],
  [79, 3.04, 12036.46], [75, 1.76, 5088.63], [74, 3.5, 3154.69],
  [74, 4.68, 801.82], [70, 0.83, 9437.76], [62, 3.98, 8827.39],
  [61, 1.82, 7084.9], [57, 2.78, 6286.6], [56, 4.39, 14143.5],
  [56, 3.47, 6279.55], [52, 0.19, 12139.55], [52, 1.33, 1748.02],
  [51, 0.28, 5856.48], [49, 0.49, 1194.45], [41, 5.37, 8429.24],
  [41, 2.4, 19651.05], [39, 6.17, 10447.39], [37, 6.04, 10213.29],
  [37, 2.57, 1059.38], [36, 1.71, 2352.87], [36, 1.78, 6812.77],
  [33, 0.59, 17789.85], [30, 0.44, 83996.85], [30, 2.74, 1349.87],
  [25, 3.16, 4690.48],
];
const L1: Term[] = [
  [628331966747, 0, 0], [206059, 2.678235, 6283.07585], [4303, 2.6351, 12566.1517],
  [425, 1.59, 3.523], [119, 5.796, 26.298], [109, 2.966, 1577.344],
  [93, 2.59, 18849.23], [72, 1.14, 529.69], [68, 1.87, 398.15],
  [67, 4.41, 5507.55], [59, 2.89, 5223.69], [56, 2.17, 155.42],
  [45, 0.4, 796.3], [36, 0.47, 775.52], [29, 2.65, 7.11],
  [21, 5.34, 0.98], [19, 1.85, 5486.78], [19, 4.97, 213.3],
  [17, 2.99, 6275.96], [16, 0.03, 2544.31], [16, 1.43, 2146.17],
  [15, 1.21, 10977.08], [12, 2.83, 1748.02], [12, 3.26, 5088.63],
  [12, 5.27, 1194.45], [12, 2.08, 4694.0], [11, 0.77, 553.57],
  [10, 1.3, 6286.6], [10, 4.24, 1349.87], [9, 2.7, 242.73],
  [9, 5.64, 951.72], [8, 5.3, 2352.87], [6, 2.65, 9437.76],
  [6, 4.67, 4690.48],
];
const L2: Term[] = [
  [52919, 0, 0], [8720, 1.0721, 6283.0758], [309, 0.867, 12566.152],
  [27, 0.05, 3.52], [16, 5.19, 26.3], [16, 3.68, 155.42],
  [10, 0.76, 18849.23], [9, 2.06, 77713.77], [7, 0.83, 775.52],
  [5, 4.66, 1577.34], [4, 1.03, 7.11], [4, 3.44, 5573.14],
  [3, 5.14, 796.3], [3, 6.05, 5507.55], [3, 1.19, 242.73],
  [3, 6.12, 529.69], [3, 0.31, 398.15], [3, 2.28, 553.57],
  [2, 4.38, 5223.69], [2, 3.75, 0.98],
];
const L3: Term[] = [
  [289, 5.844, 6283.076], [35, 0, 0], [17, 5.49, 12566.15],
  [3, 5.2, 155.42], [1, 4.72, 3.52], [1, 5.3, 18849.23], [1, 5.97, 242.73],
];
const L4: Term[] = [[114, 3.142, 0], [8, 4.13, 6283.08], [1, 3.84, 12566.15]];
const L5: Term[] = [[1, 3.14, 0]];

const R0: Term[] = [
  [100013989, 0, 0], [1670700, 3.0984635, 6283.07585], [13956, 3.05525, 12566.1517],
  [3084, 5.1985, 77713.7715], [1628, 1.1739, 5753.3849], [1576, 2.8469, 7860.4194],
  [925, 5.453, 11506.77], [542, 4.564, 3930.21], [472, 3.661, 5884.927],
  [346, 0.964, 5507.553], [329, 5.9, 5223.694], [307, 0.299, 5573.143],
  [243, 4.273, 11790.629], [212, 5.847, 1577.344], [186, 5.022, 10977.079],
  [175, 3.012, 18849.228], [110, 5.055, 5486.778], [98, 0.89, 6069.78],
  [86, 5.69, 15720.84], [86, 1.27, 161000.69], [65, 0.27, 17260.15],
  [63, 0.92, 529.69], [57, 2.01, 83996.85], [56, 5.24, 71430.7],
  [49, 3.25, 2544.31], [47, 2.58, 775.52], [45, 5.54, 9437.76],
  [43, 6.01, 6275.96], [39, 5.36, 4694.0], [38, 2.39, 8827.39],
  [37, 0.83, 19651.05], [37, 4.9, 12139.55], [36, 1.67, 12036.46],
  [35, 1.84, 2942.46], [33, 0.24, 7084.9], [32, 0.18, 5088.63],
  [32, 1.78, 398.15], [28, 1.21, 6286.6], [28, 1.9, 6279.55],
  [26, 4.59, 10447.39],
];
const R1: Term[] = [
  [103019, 1.10749, 6283.07585], [1721, 1.0644, 12566.1517], [702, 3.142, 0],
  [32, 1.02, 18849.23], [31, 2.84, 5507.55], [25, 1.32, 5223.69],
  [18, 1.42, 1577.34], [10, 5.91, 10977.08], [9, 1.42, 6275.96], [9, 0.27, 5486.78],
];
const R2: Term[] = [
  [4359, 5.7846, 6283.0758], [124, 5.579, 12566.152], [12, 3.14, 0],
  [9, 3.63, 77713.77], [6, 1.87, 5573.14], [3, 5.47, 18849.23],
];
const R3: Term[] = [[145, 4.273, 6283.076], [7, 3.92, 12566.15]];
const R4: Term[] = [[4, 2.56, 6283.08]];

function series(terms: Term[], tau: number): number {
  let s = 0;
  for (const [a, b, c] of terms) s += a * Math.cos(b + c * tau);
  return s;
}

function poly(seriesList: Term[][], tau: number): number {
  let s = 0;
  let tp = 1;
  for (const t of seriesList) {
    s += series(t, tau) * tp;
    tp *= tau;
  }
  return s / 1e8;
}

// IAU 1980 장동 주요항: [D, M, M', F, Ω, Δψ 계수(0.0001"), Δψ T계수, Δε 계수, Δε T계수]
const NUTATION: readonly (readonly number[])[] = [
  [0, 0, 0, 0, 1, -171996, -174.2, 92025, 8.9],
  [-2, 0, 0, 2, 2, -13187, -1.6, 5736, -3.1],
  [0, 0, 0, 2, 2, -2274, -0.2, 977, -0.5],
  [0, 0, 0, 0, 2, 2062, 0.2, -895, 0.5],
  [0, 1, 0, 0, 0, 1426, -3.4, 54, -0.1],
  [0, 0, 1, 0, 0, 712, 0.1, -7, 0],
  [-2, 1, 0, 2, 2, -517, 1.2, 224, -0.6],
  [0, 0, 0, 2, 1, -386, -0.4, 200, 0],
  [0, 0, 1, 2, 2, -301, 0, 129, -0.1],
  [-2, -1, 0, 2, 2, 217, -0.5, -95, 0.3],
  [-2, 0, 1, 0, 0, -158, 0, 0, 0],
  [-2, 0, 0, 2, 1, 129, 0.1, -70, 0],
  [0, 0, -1, 2, 2, 123, 0, -53, 0],
  [2, 0, 0, 0, 0, 63, 0, 0, 0],
  [0, 0, 1, 0, 1, 63, 0.1, -33, 0],
  [2, 0, -1, 2, 2, -59, 0, 26, 0],
  [0, 0, -1, 0, 1, -58, -0.1, 32, 0],
  [0, 0, 1, 2, 1, -51, 0, 27, 0],
  [-2, 0, 2, 0, 0, 48, 0, 0, 0],
  [0, 0, -2, 2, 1, 46, 0, -24, 0],
  [2, 0, 0, 2, 2, -38, 0, 16, 0],
  [0, 0, 2, 2, 2, -31, 0, 13, 0],
  [0, 0, 2, 0, 0, 29, 0, 0, 0],
  [-2, 0, 1, 2, 2, 29, 0, -12, 0],
  [0, 0, 0, 2, 0, 26, 0, 0, 0],
  [-2, 0, 0, 2, 0, -22, 0, 0, 0],
  [0, 0, -1, 2, 1, 21, 0, -10, 0],
  [0, 2, 0, 0, 0, 17, -0.1, 0, 0],
  [2, 0, -1, 0, 1, 16, 0, -8, 0],
  [-2, 2, 0, 2, 2, -16, 0.1, 7, 0],
  [0, 1, 0, 0, 1, -15, 0, 9, 0],
  [-2, 0, 1, 0, 1, -13, 0, 7, 0],
  [0, -1, 0, 0, 1, -12, 0, 6, 0],
];

/** 장동: Δψ, Δε (도) */
export function nutation(jde: number): { dPsi: number; dEps: number } {
  const T = (jde - 2451545.0) / 36525;
  const D = normDeg(297.85036 + 445267.11148 * T - 0.0019142 * T * T + (T * T * T) / 189474);
  const M = normDeg(357.52772 + 35999.05034 * T - 0.0001603 * T * T - (T * T * T) / 300000);
  const Mp = normDeg(134.96298 + 477198.867398 * T + 0.0086972 * T * T + (T * T * T) / 56250);
  const F = normDeg(93.27191 + 483202.017538 * T - 0.0036825 * T * T + (T * T * T) / 327270);
  const O = normDeg(125.04452 - 1934.136261 * T + 0.0020708 * T * T + (T * T * T) / 450000);
  let dPsi = 0;
  let dEps = 0;
  for (const [d, m, mp, f, o, ps, psT, ep, epT] of NUTATION) {
    const arg = (d * D + m * M + mp * Mp + f * F + o * O) * DEG;
    dPsi += (ps + psT * T) * Math.sin(arg);
    dEps += (ep + epT * T) * Math.cos(arg);
  }
  return { dPsi: dPsi / 36000000, dEps: dEps / 36000000 };
}

/** 평균 황도경사 (도) */
export function meanObliquity(jde: number): number {
  const T = (jde - 2451545.0) / 36525;
  const sec = 21.448 - 46.815 * T - 0.00059 * T * T + 0.001813 * T * T * T;
  return 23 + 26 / 60 + sec / 3600;
}

/** 태양 시황경 (도, 0~360). 입력은 JDE(TT). 정확도 약 ±1″ (절기 시각 ±30초 수준). */
export function sunApparentLongitude(jde: number): number {
  const tau = (jde - 2451545.0) / 365250;
  const L = poly([L0, L1, L2, L3, L4, L5], tau);
  const R = poly([R0, R1, R2, R3, R4], tau);
  // 지심 황경 = 일심 황경 + 180°
  // FK5 기준계 보정 ΔΘ = −0.09033″
  const theta = L / DEG + 180 - 0.09033 / 3600;
  const { dPsi } = nutation(jde);
  const aberration = -20.4898 / 3600 / R;
  return normDeg(theta + dPsi + aberration);
}

/** 태양 시적경 (도) — 균시차 계산용 */
function sunApparentRA(jde: number): { ra: number; lambda: number; eps: number; dPsi: number } {
  const lambda = sunApparentLongitude(jde);
  const { dPsi, dEps } = nutation(jde);
  const eps = meanObliquity(jde) + dEps;
  const ra = normDeg(Math.atan2(Math.cos(eps * DEG) * Math.sin(lambda * DEG), Math.cos(lambda * DEG)) / DEG);
  return { ra, lambda, eps, dPsi };
}

/** 균시차 (분). 진태양시 = 평태양시 + 균시차 */
export function equationOfTime(jdUT: number): number {
  const jde = utToTT(jdUT);
  const tau = (jde - 2451545.0) / 365250;
  const L0m = normDeg(
    280.4664567 + 360007.6982779 * tau + 0.03032028 * tau ** 2 + tau ** 3 / 49931 - tau ** 4 / 15300 - tau ** 5 / 2000000,
  );
  const { ra, eps, dPsi } = sunApparentRA(jde);
  let E = L0m - 0.0057183 - ra + dPsi * Math.cos(eps * DEG);
  E = ((E + 180) % 360 + 360) % 360 - 180;
  return E * 4;
}

/**
 * 태양 시황경이 targetDeg 가 되는 시각(JD, UT)을 구한다.
 * approxJdUT 근처(±20일)의 해를 뉴턴 반복으로 구한다.
 */
export function solveSunLongitude(targetDeg: number, approxJdUT: number): number {
  let jde = utToTT(approxJdUT);
  for (let i = 0; i < 50; i++) {
    const lon = sunApparentLongitude(jde);
    let diff = targetDeg - lon;
    diff = ((diff + 180) % 360 + 360) % 360 - 180;
    const step = diff / 0.98564736; // 평균 일운동(도/일)
    jde += step;
    if (Math.abs(step) < 1e-7) break; // ≈ 0.01초
  }
  return ttToUT(jde);
}

/** 24절기 이름 (황경 0°=춘분부터 15°씩) */
export const SOLAR_TERM_NAMES = [
  '춘분', '청명', '곡우', '입하', '소만', '망종', '하지', '소서', '대서', '입추', '처서', '백로',
  '추분', '한로', '상강', '입동', '소설', '대설', '동지', '소한', '대한', '입춘', '우수', '경칩',
] as const;
export const SOLAR_TERM_HANJA = [
  '春分', '淸明', '穀雨', '立夏', '小滿', '芒種', '夏至', '小暑', '大暑', '立秋', '處暑', '白露',
  '秋分', '寒露', '霜降', '立冬', '小雪', '大雪', '冬至', '小寒', '大寒', '立春', '雨水', '驚蟄',
] as const;

export interface SolarTerm {
  /** 황경 (도) */
  longitude: number;
  name: string;
  hanja: string;
  /** 절(節, 월의 시작)이면 true, 중기(中氣)면 false */
  isJie: boolean;
  jdUT: number;
  /** Unix ms (UTC) */
  ms: number;
}

const termCache = new Map<string, SolarTerm>();

/** 해당 그레고리력 연도 안에서 태양 황경이 lon 이 되는 시각 (결과 캐시) */
export function solarTermInYear(year: number, longitude: number): SolarTerm {
  const key = `${year}:${normDeg(longitude)}`;
  const hit = termCache.get(key);
  if (hit) return hit;
  const t = computeSolarTermInYear(year, longitude);
  if (termCache.size > 20000) termCache.clear();
  termCache.set(key, t);
  return t;
}

function computeSolarTermInYear(year: number, longitude: number): SolarTerm {
  // 춘분(0°) ≈ 3/20. 황경 → 대략적 날짜
  const daysFromVernal = (normDeg(longitude) / 360) * 365.2422;
  let approx = julianDay(year, 3, 20.5) + daysFromVernal;
  // 소한(285°)·대한(300°)·입춘(315°)·우수(330°)·경칩(345°) 은 같은 해 1~3월
  if (approx > julianDay(year + 1, 1, 1)) approx -= 365.2422;
  const jdUT = solveSunLongitude(longitude, approx);
  const idx = Math.round(normDeg(longitude) / 15) % 24;
  return {
    longitude: normDeg(longitude),
    name: SOLAR_TERM_NAMES[idx],
    hanja: SOLAR_TERM_HANJA[idx],
    isJie: idx % 2 === 1,
    jdUT,
    ms: jdToMs(jdUT),
  };
}

/** 그레고리력 연도의 24절기 전체 (시간순) */
export function solarTermsOfYear(year: number): SolarTerm[] {
  const list: SolarTerm[] = [];
  for (let i = 0; i < 24; i++) list.push(solarTermInYear(year, i * 15));
  return list.sort((a, b) => a.jdUT - b.jdUT);
}

// ---------------------------------------------------------------------------
// 합삭 (Meeus 49장)
// ---------------------------------------------------------------------------

/** k(정수) 번째 삭의 JDE. k=0 은 2000-01-06 */
export function newMoonJDE(k: number): number {
  const T = k / 1236.85;
  const T2 = T * T;
  const T3 = T2 * T;
  const T4 = T3 * T;
  let jde = 2451550.09766 + 29.530588861 * k + 0.00015437 * T2 - 0.00000015 * T3 + 0.00000000073 * T4;
  const E = 1 - 0.002516 * T - 0.0000074 * T2;
  const M = normDeg(2.5534 + 29.1053567 * k - 0.0000014 * T2 - 0.00000011 * T3) * DEG;
  const Mp = normDeg(201.5643 + 385.81693528 * k + 0.0107582 * T2 + 0.00001238 * T3 - 0.000000058 * T4) * DEG;
  const F = normDeg(160.7108 + 390.67050284 * k - 0.0016118 * T2 - 0.00000227 * T3 + 0.000000011 * T4) * DEG;
  const Om = normDeg(124.7746 - 1.56375588 * k + 0.0020672 * T2 + 0.00000215 * T3) * DEG;
  const s = Math.sin;
  jde +=
    -0.4072 * s(Mp) +
    0.17241 * E * s(M) +
    0.01608 * s(2 * Mp) +
    0.01039 * s(2 * F) +
    0.00739 * E * s(Mp - M) -
    0.00514 * E * s(Mp + M) +
    0.00208 * E * E * s(2 * M) -
    0.00111 * s(Mp - 2 * F) -
    0.00057 * s(Mp + 2 * F) +
    0.00056 * E * s(2 * Mp + M) -
    0.00042 * s(3 * Mp) +
    0.00042 * E * s(M + 2 * F) +
    0.00038 * E * s(M - 2 * F) -
    0.00024 * E * s(2 * Mp - M) -
    0.00017 * s(Om) -
    0.00007 * s(Mp + 2 * M) +
    0.00004 * s(2 * Mp - 2 * F) +
    0.00004 * s(3 * M) +
    0.00003 * s(Mp + M - 2 * F) +
    0.00003 * s(2 * Mp + 2 * F) -
    0.00003 * s(Mp + M + 2 * F) +
    0.00003 * s(Mp - M + 2 * F) -
    0.00002 * s(Mp - M - 2 * F) -
    0.00002 * s(3 * Mp + M) +
    0.00002 * s(4 * Mp);
  const A = [
    299.77 + 0.107408 * k - 0.009173 * T2,
    251.88 + 0.016321 * k,
    251.83 + 26.651886 * k,
    349.42 + 36.412478 * k,
    84.66 + 18.206239 * k,
    141.74 + 53.303771 * k,
    207.14 + 2.453732 * k,
    154.84 + 7.30686 * k,
    34.52 + 27.261239 * k,
    207.19 + 0.121824 * k,
    291.34 + 1.844379 * k,
    161.72 + 24.198154 * k,
    239.56 + 25.513099 * k,
    331.55 + 3.592518 * k,
  ];
  const C = [0.000325, 0.000165, 0.000164, 0.000126, 0.00011, 0.000062, 0.00006, 0.000056, 0.000047, 0.000042, 0.00004, 0.000037, 0.000035, 0.000023];
  for (let i = 0; i < 14; i++) jde += C[i] * Math.sin(normDeg(A[i]) * DEG);
  return jde;
}

/** 삭 시각(JD UT) */
export function newMoonUT(k: number): number {
  return ttToUT(newMoonJDE(k));
}

/** 주어진 JD(UT) 이전(또는 같은) 가장 가까운 삭의 k */
export function newMoonKBefore(jdUT: number): number {
  let k = Math.floor((jdUT - 2451550.09766) / 29.530588861);
  while (newMoonUT(k + 1) <= jdUT) k++;
  while (newMoonUT(k) > jdUT) k--;
  return k;
}
