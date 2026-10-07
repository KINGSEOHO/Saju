/**
 * 궁합 · 재회에서 입력한 상대 정보.
 * 상대는 이 서비스에 동의한 적이 없는 사람이라, 이 탭(sessionStorage)에만 두고 서버로 보내지 않으며 링크에도 담지 않는다.
 */
import type { BirthInput } from '../engine/index.ts';
import type { Relation } from '../report/compat.ts';
import { draftToInput, EMPTY_DRAFT } from './birthDraft.ts';

export interface PartnerDraft {
  relation: Relation;
  name: string;
  calendar: 'solar' | 'lunar';
  /** 생년월일 숫자만 (최대 8자리) */
  ymd: string;
  leap: boolean;
  /** 시각 숫자만 (최대 4자리, 24시간) */
  time: string;
  timeUnknown: boolean;
  gender: 'male' | 'female' | '';
  city: string;
  mbti: string;
  /** 헤어진 때 YYYYMM (선택) */
  breakup: string;
  /** 결과를 보고 있는가 */
  shown: boolean;
}

const KEY = 'myeong-partner-v1';

export function emptyPartner(myGender?: 'male' | 'female'): PartnerDraft {
  return {
    relation: 'dating',
    name: '',
    calendar: 'solar',
    ymd: '',
    leap: false,
    time: '',
    timeUnknown: false,
    gender: myGender === 'male' ? 'female' : myGender === 'female' ? 'male' : '',
    city: '서울',
    mbti: '',
    breakup: '',
    shown: false,
  };
}

export function loadPartner(myGender?: 'male' | 'female'): PartnerDraft {
  const base = emptyPartner(myGender);
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? { ...base, ...(JSON.parse(raw) as Partial<PartnerDraft>) } : base;
  } catch {
    return base;
  }
}

export function savePartner(p: PartnerDraft) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* 저장이 안 되는 환경에서도 계산은 된다 */
  }
}

export function clearPartner() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* noop */
  }
}

export function partnerInput(p: PartnerDraft): BirthInput | null {
  const input = draftToInput({
    ...EMPTY_DRAFT,
    calendar: p.calendar,
    ymd: p.ymd,
    leap: p.leap,
    time: p.time,
    timeUnknown: p.timeUnknown,
    gender: p.gender,
    city: p.city,
    name: p.name,
    mbti: p.mbti,
  });
  // 상대의 직업은 받지 않는다
  return input ? { ...input, job: undefined } : null;
}

/** 202503 → 2025.03 */
export function formatYm(digits: string): string {
  const s = digits.replace(/\D/g, '').slice(0, 6);
  return s.length <= 4 ? s : `${s.slice(0, 4)}.${s.slice(4)}`;
}

/** 헤어진 때 — 비워 두면 그 부분만 빼고 본다 */
export function checkBreakup(digits: string, now: number): { ok: boolean; value: { year: number; month: number } | null; error: string } {
  const s = digits.replace(/\D/g, '');
  if (!s) return { ok: true, value: null, error: '' };
  if (s.length < 6) return { ok: false, value: null, error: '' };
  const year = Number(s.slice(0, 4));
  const month = Number(s.slice(4, 6));
  const d = new Date(now);
  const cy = d.getFullYear();
  const cm = d.getMonth() + 1;
  if (month < 1 || month > 12) return { ok: false, value: null, error: '월은 01부터 12 사이로 입력해 주세요.' };
  if (year < 1950 || year > cy || (year === cy && month > cm)) return { ok: false, value: null, error: '지나간 연월로 입력해 주세요.' };
  return { ok: true, value: { year, month }, error: '' };
}
