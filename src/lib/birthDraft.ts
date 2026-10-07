/**
 * 단계별 입력의 임시 값(초안)과 검사
 * - 생년월일은 8자리 숫자, 시각은 4자리 숫자로 받아 화면에 보기 좋게 바꿔 보여 준다.
 * - 입력 중인 값은 이 탭(sessionStorage)에만 남겨 새로고침해도 이어서 쓸 수 있게 한다. 서버로는 보내지 않는다.
 */
import { leapMonthOf, lunarMonthDays, lunarToSolar, solarToLunar } from '../engine/calendar.ts';
import type { BirthInput } from '../engine/index.ts';
import { CITIES } from '../engine/timezone.ts';

export interface Draft {
  calendar: 'solar' | 'lunar';
  /** 생년월일 숫자만 (최대 8자리) */
  ymd: string;
  leap: boolean;
  /** 시각 숫자만 (최대 4자리, 24시간) */
  time: string;
  timeUnknown: boolean;
  gender: 'male' | 'female' | '';
  /** 도시 이름 또는 '__custom' */
  city: string;
  lon: string;
  tz: string;
  tc: 'mean' | 'true' | 'none';
  zr: 'traditional' | 'split';
  name: string;
  mbti: string;
  job: string;
}

export const EMPTY_DRAFT: Draft = {
  calendar: 'solar',
  ymd: '',
  leap: false,
  time: '',
  timeUnknown: false,
  gender: '',
  city: '서울',
  lon: '126.978',
  tz: 'Asia/Seoul',
  tc: 'mean',
  zr: 'traditional',
  name: '',
  mbti: '',
  job: '',
};

const KEY = 'myeong-draft-v1';

export function loadDraft(): Draft {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? { ...EMPTY_DRAFT, ...(JSON.parse(raw) as Partial<Draft>) } : { ...EMPTY_DRAFT };
  } catch {
    return { ...EMPTY_DRAFT };
  }
}
export function saveDraft(d: Draft) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(d));
  } catch {
    /* 저장이 안 되는 환경에서도 입력은 계속된다 */
  }
}
export function clearDraft() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* noop */
  }
}

const pad = (n: number, w = 2) => String(n).padStart(w, '0');
const WEEK = ['일', '월', '화', '수', '목', '금', '토'];
const weekday = (y: number, m: number, d: number) => WEEK[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];

/** 19900707 → 1990.07.07 (입력하는 동안에도) */
export function formatYmd(digits: string): string {
  const s = digits.replace(/\D/g, '').slice(0, 8);
  if (s.length <= 4) return s;
  if (s.length <= 6) return `${s.slice(0, 4)}.${s.slice(4)}`;
  return `${s.slice(0, 4)}.${s.slice(4, 6)}.${s.slice(6)}`;
}
/** 0730 → 07:30 */
export function formatTime(digits: string): string {
  const s = digits.replace(/\D/g, '').slice(0, 4);
  return s.length <= 2 ? s : `${s.slice(0, 2)}:${s.slice(2)}`;
}

export interface DateCheck {
  ok: boolean;
  y: number;
  m: number;
  d: number;
  /** 음력이고 그해 윤달이 이 달일 때 윤달 선택을 보여 준다 */
  leapMonth: number;
  /** 확인용 안내 (양력↔음력, 요일) */
  note: string;
  /** 틀렸을 때 알려 줄 말 */
  error: string;
}

export function checkDate(digits: string, calendar: 'solar' | 'lunar', leap: boolean): DateCheck {
  const s = digits.replace(/\D/g, '');
  const y = Number(s.slice(0, 4));
  const m = Number(s.slice(4, 6));
  const d = Number(s.slice(6, 8));
  const base = { ok: false, y, m, d, leapMonth: 0, note: '', error: '' };
  if (s.length < 8) return base;
  if (y < 1900 || y > 2100) return { ...base, error: '1900년부터 2100년 사이로 입력해 주세요.' };
  if (m < 1 || m > 12) return { ...base, error: '월은 01부터 12 사이로 입력해 주세요.' };
  if (calendar === 'solar') {
    const max = new Date(Date.UTC(y, m, 0)).getUTCDate();
    if (d < 1 || d > max) return { ...base, error: `${y}년 ${m}월은 ${max}일까지 있어요.` };
    let note = `${y}년 ${m}월 ${d}일 ${weekday(y, m, d)}요일`;
    try {
      const l = solarToLunar(y, m, d);
      note += ` · 음력 ${l.leap ? '윤' : ''}${l.month}월 ${l.day}일`;
    } catch {
      /* 음력 변환 범위 밖이면 양력만 보여 준다 */
    }
    return { ...base, ok: true, note };
  }
  let leapMonth = 0;
  try {
    leapMonth = leapMonthOf(y);
  } catch {
    return { ...base, error: '이 해는 음력으로 계산할 수 없어요. 양력으로 입력해 주세요.' };
  }
  const isLeap = leap && leapMonth === m;
  const max = lunarMonthDays(y, m, isLeap) || 30;
  if (d < 1 || d > max) return { ...base, leapMonth, error: `음력 ${y}년 ${isLeap ? '윤' : ''}${m}월은 ${max}일까지 있어요.` };
  const sol = lunarToSolar(y, m, d, isLeap);
  if (!sol) return { ...base, leapMonth, error: '없는 날짜예요. 다시 확인해 주세요.' };
  return { ...base, ok: true, leapMonth, note: `양력으로 ${sol.year}년 ${sol.month}월 ${sol.day}일 ${weekday(sol.year, sol.month, sol.day)}요일` };
}

export interface TimeCheck {
  ok: boolean;
  h: number;
  m: number;
  note: string;
  error: string;
}

export function checkTime(digits: string): TimeCheck {
  const s = digits.replace(/\D/g, '');
  const h = Number(s.slice(0, 2));
  const m = Number(s.slice(2, 4));
  const base = { ok: false, h, m, note: '', error: '' };
  if (s.length < 4) return base;
  if (h > 23) return { ...base, error: '시는 00부터 23 사이로 입력해 주세요.' };
  if (m > 59) return { ...base, error: '분은 00부터 59 사이로 입력해 주세요.' };
  const ampm = h < 12 ? '오전' : '오후';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  let note = `${ampm} ${h12}시${m ? ` ${m}분` : ''}`;
  if (h === 23 || h === 0) note += ' · 날짜가 바뀌는 자시라, 결과에서 두 가지 기준을 함께 알려 드려요';
  return { ...base, ok: true, note };
}

export function placeOk(d: Draft): boolean {
  if (d.city !== '__custom') return CITIES.some((c) => c.name === d.city);
  const lon = Number(d.lon);
  if (!Number.isFinite(lon) || lon < -180 || lon > 180) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: d.tz });
    return true;
  } catch {
    return false;
  }
}

/** 단계별로 이 단계가 채워졌는가 (생년월일 · 시각 · 성별 · 태어난 곳 · 선택 정보) */
export function stepValid(d: Draft): boolean[] {
  return [checkDate(d.ymd, d.calendar, d.leap).ok, d.timeUnknown || checkTime(d.time).ok, d.gender !== '', placeOk(d), true];
}

export function draftToInput(d: Draft): BirthInput | null {
  const date = checkDate(d.ymd, d.calendar, d.leap);
  const time = checkTime(d.time);
  if (!date.ok || !(d.timeUnknown || time.ok) || !d.gender || !placeOk(d)) return null;
  const c = CITIES.find((x) => x.name === d.city);
  const longitude = c ? c.longitude : Number(d.lon);
  return {
    name: d.name.trim() || undefined,
    gender: d.gender,
    calendar: d.calendar,
    year: date.y,
    month: date.m,
    day: date.d,
    leapMonth: d.calendar === 'lunar' && d.leap && date.leapMonth === date.m,
    hour: d.timeUnknown ? null : time.h,
    minute: d.timeUnknown ? null : time.m,
    longitude,
    timeZone: c ? c.timeZone : d.tz,
    placeName: c ? c.name : `경도 ${longitude}`,
    timeCorrection: d.tc,
    ziHourRule: d.zr,
    mbti: d.mbti || undefined,
    job: d.job.trim().slice(0, 30) || undefined,
  };
}

export function inputToDraft(i: BirthInput): Draft {
  const city = CITIES.find((c) => c.name === i.placeName)?.name ?? '__custom';
  return {
    calendar: i.calendar,
    ymd: `${pad(i.year, 4)}${pad(i.month)}${pad(i.day)}`,
    leap: !!i.leapMonth,
    time: i.hour === null || i.hour === undefined ? '' : `${pad(i.hour)}${pad(i.minute ?? 0)}`,
    timeUnknown: i.hour === null || i.hour === undefined,
    gender: i.gender,
    city,
    lon: String(i.longitude),
    tz: i.timeZone,
    tc: i.timeCorrection ?? 'mean',
    zr: i.ziHourRule ?? 'traditional',
    name: i.name ?? '',
    mbti: i.mbti ?? '',
    job: i.job ?? '',
  };
}
