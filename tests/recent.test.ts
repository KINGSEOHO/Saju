import { beforeEach, describe, expect, it } from 'vitest';
import type { BirthInput } from '../src/engine/index.ts';
import { loadRecent, removeRecent, saveRecent } from '../src/lib/recent.ts';

const mem = new Map<string, string>();
Object.assign(globalThis, {
  localStorage: { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v), removeItem: (k: string) => void mem.delete(k) },
});
const person = (name: string | undefined, day: number): BirthInput => ({
  name,
  gender: 'female',
  calendar: 'solar',
  year: 1996,
  month: 3,
  day,
  hour: 9,
  minute: 30,
  longitude: 126.978,
  timeZone: 'Asia/Seoul',
});

describe('최근 본 사주 (이 기기에만)', () => {
  beforeEach(() => mem.clear());

  it('연 결과를 맨 앞에 남기고, 같은 결과는 하나만, 최대 6개', () => {
    saveRecent('#/r?a', person('하이', 14), 1);
    saveRecent('#/r?b', person(undefined, 15), 2);
    saveRecent('#/r?a', person('하이', 14), 3);
    expect(loadRecent().map((r) => [r.hash, r.label])).toEqual([
      ['#/r?a', '하이 · 1996.3.14 · 여성'],
      ['#/r?b', '이름 없음 · 1996.3.15 · 여성'],
    ]);
    for (let i = 0; i < 10; i++) saveRecent(`#/r?x${i}`, person('x', 1), 10 + i);
    expect(loadRecent()).toHaveLength(6);
  });

  it('지우면 바로 사라지고, 깨진 값은 무시한다', () => {
    saveRecent('#/r?a', person('하이', 14));
    removeRecent('#/r?a');
    expect(loadRecent()).toEqual([]);
    mem.set('mg_recent', '{bad');
    expect(loadRecent()).toEqual([]);
  });
});
