/**
 * 최근 본 사주 — 결과를 열면 이 기기(localStorage)에만 남겨, 첫 화면에서 다시 입력하지 않고 바로 불러온다.
 * 서버로는 보내지 않는다. 남기는 것은 결과 주소(입력값이 든 #/r?…)와 목록에 보일 이름·생년월일·성별뿐이고, 언제든 지울 수 있다.
 */
import type { BirthInput } from '../engine/index.ts';
import { STORAGE } from './storageKeys.ts';

export interface Recent {
  /** 결과 주소 (#/r?…) */
  hash: string;
  label: string;
  at: number;
}

const KEY = STORAGE.recent;
const MAX = 6;

export function loadRecent(): Recent[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? '[]') as Recent[];
    return Array.isArray(v) ? v.filter((r) => typeof r.hash === 'string' && r.hash.startsWith('#/r?')) : [];
  } catch {
    return [];
  }
}

const write = (list: Recent[]) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* 저장이 막힌 브라우저에서는 남기지 않는다 */
  }
};

export const recentLabel = (i: BirthInput) => [i.name || '이름 없음', `${i.calendar === 'lunar' ? '음력 ' : ''}${i.year}.${i.month}.${i.day}`, i.gender === 'male' ? '남성' : '여성'].join(' · ');

/** 같은 사람(같은 주소)은 맨 앞으로 올리고 하나만 남긴다 */
export function saveRecent(hash: string, input: BirthInput, now = Date.now()) {
  const list = loadRecent().filter((r) => r.hash !== hash);
  write([{ hash, label: recentLabel(input), at: now }, ...list].slice(0, MAX));
}

export function removeRecent(hash: string) {
  write(loadRecent().filter((r) => r.hash !== hash));
}
