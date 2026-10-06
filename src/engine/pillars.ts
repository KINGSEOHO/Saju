/**
 * 사주 원국(년·월·일·시주) 계산
 *
 * - 년주: 입춘 시각(태양 황경 315°) 기준으로 해가 바뀜
 * - 월주: 12절(節) 시각 기준. 출생 순간의 태양 시황경으로 직접 판정
 * - 일주: 지방태양시 날짜의 JDN 기준 60갑자 (기준: 2000-01-01 = 戊午)
 * - 시주: 지방태양시(평태양시/진태양시) 기준, 일간에 따른 시두법
 */
import { jdn, msToJd, normDeg, solarTermInYear, sunApparentLongitude, utToTT } from './astro.ts';
import { lunarToSolar, solarToLunar, type LunarDate } from './calendar.ts';
import { BRANCHES, JIE_LONGITUDES, JIE_NAMES, MONTH_BRANCH_ORDER, STEMS, ganzhi, ganzhiIndex } from './constants.ts';
import { localSolarTime, wallTimeToUtc, type TimeCorrection, type UtcConversion } from './timezone.ts';

export type Gender = 'male' | 'female';
export type ZiHourRule = 'traditional' | 'split';

export interface BirthInput {
  name?: string;
  gender: Gender;
  calendar: 'solar' | 'lunar';
  year: number;
  month: number;
  day: number;
  /** 음력 윤달 여부 */
  leapMonth?: boolean;
  /** 시간을 모르면 null */
  hour: number | null;
  minute: number | null;
  /** 출생지 경도 (동경 +) */
  longitude: number;
  /** IANA 시간대 */
  timeZone: string;
  placeName?: string;
  /** 시간 보정 방식 (기본: 평태양시) */
  timeCorrection?: TimeCorrection;
  /** 자시 처리 (기본: 23시 일진 변경) */
  ziHourRule?: ZiHourRule;
  /** (선택) MBTI 4글자 — 사주 계산에는 쓰지 않고 교차 분석에만 쓴다 */
  mbti?: string;
  /** (선택) 직업·직무 — 사주 계산에는 쓰지 않고 직업 분석에만 쓴다 */
  job?: string;
}

export interface Pillar {
  stem: number;
  branch: number;
  /** 60갑자 index */
  index: number;
}

export interface JieInfo {
  name: string;
  longitude: number;
  ms: number;
}

export interface PillarResult {
  year: Pillar;
  month: Pillar;
  day: Pillar;
  hour: Pillar | null;
  /** 입력 양력 날짜 (음력 입력이면 변환 결과) */
  solarDate: { year: number; month: number; day: number };
  lunarDate: LunarDate;
  conversion: UtcConversion;
  /** 보정된 현지 태양시 (getUTC* 로 읽는 ms) */
  localSolarMs: number | null;
  longitudeCorrectionMinutes: number;
  equationOfTimeMinutes: number;
  /** 출생 순간 태양 시황경 */
  sunLongitude: number;
  /** 사주 기준 연도(입춘 기준) */
  sajuYear: number;
  prevJie: JieInfo;
  nextJie: JieInfo;
  /** 절입 후 경과 일수 */
  daysSincePrevJie: number;
  timeKnown: boolean;
  options: { timeCorrection: TimeCorrection; ziHourRule: ZiHourRule };
}

function pillarOf(stem: number, branch: number): Pillar {
  return { stem, branch, index: ganzhiIndex(stem, branch) };
}

/** 양력 날짜의 일진 */
export function dayPillarOfDate(y: number, m: number, d: number): Pillar {
  const idx = (((jdn(y, m, d) + 49) % 60) + 60) % 60;
  const g = ganzhi(idx);
  return { stem: g.stem, branch: g.branch, index: idx };
}

/** 사주 연도(입춘 기준)의 년주 */
export function yearPillarOf(sajuYear: number): Pillar {
  const idx = (((sajuYear - 4) % 60) + 60) % 60;
  const g = ganzhi(idx);
  return { stem: g.stem, branch: g.branch, index: idx };
}

/** 월주: 년간 + 월 순번(0=인월) */
export function monthPillarOf(yearStem: number, monthOrder: number): Pillar {
  const firstStem = ((yearStem % 5) * 2 + 2) % 10;
  return pillarOf((firstStem + monthOrder) % 10, MONTH_BRANCH_ORDER[monthOrder]);
}

/** 시주: 일간 + 시지 */
export function hourPillarOf(dayStem: number, hourBranch: number): Pillar {
  const firstStem = ((dayStem % 5) * 2) % 10;
  return pillarOf((firstStem + hourBranch) % 10, hourBranch);
}

/** 주어진 순간 직전·직후의 절(節) */
export function jieAround(utcMs: number): { prev: JieInfo; next: JieInfo } {
  const y = new Date(utcMs).getUTCFullYear();
  const list: JieInfo[] = [];
  for (const yy of [y - 1, y, y + 1]) {
    JIE_LONGITUDES.forEach((lon, i) => {
      const t = solarTermInYear(yy, lon);
      list.push({ name: JIE_NAMES[i], longitude: lon, ms: t.ms });
    });
  }
  list.sort((a, b) => a.ms - b.ms);
  let prev = list[0];
  let next = list[list.length - 1];
  for (let i = 0; i < list.length - 1; i++) {
    if (list[i].ms <= utcMs && list[i + 1].ms > utcMs) {
      prev = list[i];
      next = list[i + 1];
      break;
    }
  }
  return { prev, next };
}

/** 해당 그레고리력 연도의 입춘 시각(ms) */
export function ipchunMs(year: number): number {
  return solarTermInYear(year, 315).ms;
}

/** 순간(UTC ms)의 년주·월주 */
export function yearMonthPillarsAt(utcMs: number): { year: Pillar; month: Pillar; sajuYear: number; sunLongitude: number } {
  const y = new Date(utcMs).getUTCFullYear();
  const sajuYear = utcMs >= ipchunMs(y) ? y : y - 1;
  const yearP = yearPillarOf(sajuYear);
  const lon = sunApparentLongitude(utToTT(msToJd(utcMs)));
  const order = Math.floor(normDeg(lon - 315) / 30) % 12;
  return { year: yearP, month: monthPillarOf(yearP.stem, order), sajuYear, sunLongitude: lon };
}

export function resolveSolarDate(input: BirthInput): { year: number; month: number; day: number } {
  if (input.calendar === 'solar') return { year: input.year, month: input.month, day: input.day };
  const s = lunarToSolar(input.year, input.month, input.day, !!input.leapMonth);
  if (!s) {
    throw new Error(
      `존재하지 않는 음력 날짜입니다: ${input.year}년 ${input.leapMonth ? '윤' : ''}${input.month}월 ${input.day}일`,
    );
  }
  return s;
}

export function computePillars(input: BirthInput): PillarResult {
  const timeCorrection: TimeCorrection = input.timeCorrection ?? 'mean';
  const ziHourRule: ZiHourRule = input.ziHourRule ?? 'traditional';
  const solar = resolveSolarDate(input);
  const timeKnown = input.hour !== null && input.hour !== undefined;
  const hour = timeKnown ? input.hour! : 12;
  const minute = timeKnown ? (input.minute ?? 0) : 0;

  const conv = wallTimeToUtc(solar.year, solar.month, solar.day, hour, minute, input.timeZone);
  const ym = yearMonthPillarsAt(conv.utcMs);
  const { prev, next } = jieAround(conv.utcMs);

  let dayP: Pillar;
  let hourP: Pillar | null = null;
  let localSolarMs: number | null = null;
  let longitudeCorrectionMinutes = 0;
  let equationOfTimeMinutes = 0;

  if (timeKnown) {
    const st = localSolarTime(conv, input.longitude, timeCorrection);
    localSolarMs = st.localMs;
    longitudeCorrectionMinutes = st.longitudeCorrectionMinutes;
    equationOfTimeMinutes = st.equationOfTimeMinutes;
    const lt = new Date(st.localMs);
    const ly = lt.getUTCFullYear();
    const lm = lt.getUTCMonth() + 1;
    const ld = lt.getUTCDate();
    const minutesOfDay = lt.getUTCHours() * 60 + lt.getUTCMinutes() + lt.getUTCSeconds() / 60;
    const hourBranch = Math.floor((minutesOfDay + 60) / 120) % 12;
    const isLateZi = minutesOfDay >= 23 * 60;
    if (isLateZi && ziHourRule === 'traditional') {
      // 23시 이후는 다음 날 자시: 일주도 다음 날
      const nextDay = new Date(Date.UTC(ly, lm - 1, ld + 1));
      dayP = dayPillarOfDate(nextDay.getUTCFullYear(), nextDay.getUTCMonth() + 1, nextDay.getUTCDate());
      hourP = hourPillarOf(dayP.stem, 0);
    } else if (isLateZi) {
      // 야자시: 일주는 당일, 시주는 다음 날 자시(시두법상 다음 날 일간 기준)
      dayP = dayPillarOfDate(ly, lm, ld);
      hourP = hourPillarOf((dayP.stem + 1) % 10, 0);
    } else {
      dayP = dayPillarOfDate(ly, lm, ld);
      hourP = hourPillarOf(dayP.stem, hourBranch);
    }
  } else {
    dayP = dayPillarOfDate(solar.year, solar.month, solar.day);
  }

  return {
    year: ym.year,
    month: ym.month,
    day: dayP,
    hour: hourP,
    solarDate: solar,
    lunarDate: solarToLunar(solar.year, solar.month, solar.day),
    conversion: conv,
    localSolarMs,
    longitudeCorrectionMinutes,
    equationOfTimeMinutes,
    sunLongitude: ym.sunLongitude,
    sajuYear: ym.sajuYear,
    prevJie: prev,
    nextJie: next,
    daysSincePrevJie: (conv.utcMs - prev.ms) / 86400000,
    timeKnown,
    options: { timeCorrection, ziHourRule },
  };
}

// ---------------------------------------------------------------------------
// 경계 민감도 분석: 입력 오차·학파 차이로 기둥이 바뀔 수 있는지
// ---------------------------------------------------------------------------
export interface BoundaryWarning {
  kind: 'jie' | 'hour' | 'zi' | 'correction' | 'unknownTime' | 'dst';
  message: string;
  alternative?: string;
}

function pName(p: Pillar | null): string {
  return p ? STEMS[p.stem].ko + BRANCHES[p.branch].ko : '-';
}

export function boundaryAnalysis(input: BirthInput, base: PillarResult): BoundaryWarning[] {
  const w: BoundaryWarning[] = [];
  const birth = base.conversion.utcMs;
  const minToPrev = (birth - base.prevJie.ms) / 60000;
  const minToNext = (base.nextJie.ms - birth) / 60000;

  if (!base.timeKnown) {
    // 시간 모름: 그날 하루 중 절입이 있으면 월주(경우에 따라 년주)가 불확실
    const dayStart = wallTimeToUtc(base.solarDate.year, base.solarDate.month, base.solarDate.day, 0, 0, input.timeZone).utcMs;
    const dayEnd = dayStart + 86400000;
    for (const j of [base.prevJie, base.nextJie]) {
      if (j.ms >= dayStart && j.ms < dayEnd) {
        w.push({
          kind: 'unknownTime',
          message: `출생일에 ${j.name} 절입(${fmtKst(j.ms, input.timeZone)})이 있어, 출생 시각에 따라 월주${j.name === '입춘' ? '·년주' : ''}가 달라집니다. 시각을 확인하면 정확도가 크게 올라갑니다.`,
        });
      }
    }
    w.push({
      kind: 'unknownTime',
      message: '출생 시간을 모르면 시주(時柱)를 제외한 6글자로 분석합니다. 자녀·말년·성향의 일부(약 25%) 해석의 신뢰도가 낮아집니다.',
    });
    return w;
  }

  if (minToPrev < 120 || minToNext < 120) {
    const near = minToPrev < minToNext ? base.prevJie : base.nextJie;
    const mins = Math.round(Math.min(minToPrev, minToNext));
    const altMs = minToPrev < minToNext ? base.prevJie.ms - 60000 : base.nextJie.ms + 60000;
    const alt = yearMonthPillarsAt(altMs);
    w.push({
      kind: 'jie',
      message: `${near.name} 절입 시각(${fmtKst(near.ms, input.timeZone)})과 ${mins}분 차이입니다. 기록된 출생 시각이 실제와 ${mins}분 이상 다르면 월주가 바뀝니다.`,
      alternative: `대안 월주: ${pName(alt.month)}${near.name === '입춘' ? ` / 대안 년주: ${pName(alt.year)}` : ''}`,
    });
  }

  if (base.localSolarMs !== null && base.hour) {
    const lt = new Date(base.localSolarMs);
    const mod = lt.getUTCHours() * 60 + lt.getUTCMinutes();
    // 시 경계: 홀수 정시
    const r = ((mod - 60) % 120 + 120) % 120; // 직전 경계로부터 분
    const toBoundary = Math.min(r, 120 - r);
    if (toBoundary <= 15) {
      const shifted = computePillars({
        ...input,
        ...shiftMinutes(input, r < 60 ? -(r + 1) : 120 - r + 1),
      });
      w.push({
        kind: 'hour',
        message: `보정된 태양시가 시(時)의 경계와 ${Math.round(toBoundary)}분 차이입니다. 출생 시각 기록 오차가 이보다 크면 시주가 달라집니다.`,
        alternative: `대안 시주: ${pName(shifted.hour)}${shifted.day.index !== base.day.index ? ` / 대안 일주: ${pName(shifted.day)}` : ''}`,
      });
    }
    if (mod >= 23 * 60) {
      const otherRule: ZiHourRule = base.options.ziHourRule === 'traditional' ? 'split' : 'traditional';
      const other = computePillars({ ...input, ziHourRule: otherRule });
      w.push({
        kind: 'zi',
        message: `23시~24시(야자시) 출생입니다. 학파에 따라 일주가 달라지는 구간입니다. 현재는 '${base.options.ziHourRule === 'traditional' ? '23시 일진 변경(정통)' : '야·조자시 구분'}' 기준으로 계산했습니다.`,
        alternative: `다른 기준 적용 시: 일주 ${pName(other.day)}, 시주 ${pName(other.hour)}`,
      });
    }
  }

  // 보정 방식에 따른 차이
  const modes: TimeCorrection[] = ['mean', 'true', 'none'];
  const labels: Record<TimeCorrection, string> = { mean: '평태양시', true: '진태양시', none: '보정 없음(표준시)' };
  const diffs: string[] = [];
  for (const m of modes) {
    if (m === base.options.timeCorrection) continue;
    const r = computePillars({ ...input, timeCorrection: m });
    if (r.hour?.index !== base.hour?.index || r.day.index !== base.day.index) {
      diffs.push(`${labels[m]} 기준: 일주 ${pName(r.day)}, 시주 ${pName(r.hour)}`);
    }
  }
  if (diffs.length) {
    w.push({
      kind: 'correction',
      message: '시간 보정 방식에 따라 시주가 달라지는 출생 시각입니다. 다른 사이트와 결과가 다르다면 이 차이 때문일 가능성이 큽니다.',
      alternative: diffs.join(' / '),
    });
  }

  if (base.conversion.dst) {
    w.push({
      kind: 'dst',
      message: '출생 당시 서머타임(일광절약시간)이 시행 중이어서 1시간을 빼고 계산했습니다. 기록된 시각이 이미 표준시라면 결과가 달라집니다.',
    });
  }
  if (base.conversion.ambiguous) {
    w.push({ kind: 'dst', message: base.conversion.note ?? '서머타임 전환 시각 부근입니다.' });
  }
  return w;
}

function shiftMinutes(input: BirthInput, deltaMin: number): Partial<BirthInput> {
  const solar = resolveSolarDate(input);
  const t = Date.UTC(solar.year, solar.month - 1, solar.day, input.hour ?? 12, input.minute ?? 0) + deltaMin * 60000;
  const d = new Date(t);
  return {
    calendar: 'solar',
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
    hour: d.getUTCHours(),
    minute: d.getUTCMinutes(),
    leapMonth: false,
  };
}

/** UTC ms → 해당 시간대 벽시계 문자열 */
export function fmtKst(ms: number, timeZone = 'Asia/Seoul'): string {
  const dtf = new Intl.DateTimeFormat('ko-KR', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  return dtf.format(new Date(ms));
}

