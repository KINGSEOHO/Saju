/**
 * 신년운세 시즌 — 1년 중 가장 큰 대목.
 * 10월부터 다음 해 입춘 전까지는 고민 리포트의 '올해 운세' 칸이 다음 해 신년운세가 된다.
 * 입춘이 지나면 같은 해의 '올해 운세'로 이어지고, 산 사람은 그해 내내 그대로 본다 (구매는 해마다 따로).
 */
import type { SajuAnalysis } from '../engine/index.ts';

export interface Season {
  /** 운세를 보는 해 (사주의 해 — 입춘부터 다음 입춘 전까지) */
  year: number;
  /** 신년운세 시즌인지 (다음 해를 미리 본다) */
  newYear: boolean;
  /** 칸 이름 — '2027 신년운세' 또는 '올해 운세' */
  title: string;
  /** 칸 아래 한 줄 */
  ask: string;
  /** 문장 속에서 부르는 이름 — '2027년' 또는 '올해' */
  word: string;
}

/** 시즌이 시작되는 달 (양력, 한국 시각) */
const SEASON_START_MONTH = 10;

export function seasonOf(a: SajuAnalysis): Season {
  const kst = new Date(a.now + 9 * 3600_000);
  const y = kst.getUTCFullYear();
  const m = kst.getUTCMonth() + 1;
  // 입춘 전 1월(사주의 해가 아직 지난해)이거나, 10월 이후면 다음 해를 본다
  const newYear = a.currentSajuYear < y || m >= SEASON_START_MONTH;
  const year = newYear ? a.currentSajuYear + 1 : a.currentSajuYear;
  return newYear
    ? { year, newYear, title: `${year} 신년운세`, ask: `${year}년엔 무엇이 달라질까?`, word: `${year}년` }
    : { year, newYear, title: '올해 운세', ask: '올해 무엇을 조심할까?', word: '올해' };
}

/** 이용권 계산에 쓰는 열쇠 (lib/entitlements.ts의 SeasonKey와 같은 모양) */
export function seasonKey(a: SajuAnalysis): { year: number; title: string } {
  const s = seasonOf(a);
  return { year: s.year, title: s.title };
}
