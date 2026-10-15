/**
 * 사이트를 업데이트해도 이용자 기록이 사라지지 않는지 지키는 테스트.
 * 여기가 깨졌다면 — 이름표나 형식을 바꾼 것이다. 테스트를 고치기 전에, 예전 기록을 새 코드가 계속 읽을 수 있는지부터 확인한다.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { loadRecent } from '../src/lib/recent.ts';
import { decodeInput } from '../src/lib/share.ts';
import { STORAGE, STORAGE_PREFIX, clearAllLocal } from '../src/lib/storageKeys.ts';

const mem = new Map<string, string>();
const store = {
  getItem: (k: string) => mem.get(k) ?? null,
  setItem: (k: string, v: string) => void mem.set(k, v),
  removeItem: (k: string) => void mem.delete(k),
  key: (i: number) => [...mem.keys()][i] ?? null,
  get length() {
    return mem.size;
  },
};
Object.assign(globalThis, {
  localStorage: store,
  sessionStorage: { clear: () => {} },
  window: { dispatchEvent: () => true },
  Event: class {
    constructor(public type: string) {}
  },
});

describe('이용자 기록 이름표는 바뀌지 않는다', () => {
  it('저장 이름이 처음 정한 그대로다 (바꾸면 이용자 기록이 안 보이게 돼요)', () => {
    expect(STORAGE).toEqual({
      session: 'mg_session_v1',
      pending: 'mg_pending_v1',
      recent: 'mg_recent',
      demoDevice: 'mg_demo_device',
      demoPurchases: 'mg_demo_purchases',
      demoAlias: 'mg_demo_alias',
      previewLast: 'mg_preview_last',
    });
    expect(STORAGE_PREFIX).toEqual({ hits: 'myeong-hits:', gaeunRoutine: 'gaeun-routine-' });
  });

  it('코드 곳곳에 이름을 따로 적지 않고 storageKeys.ts만 쓴다', () => {
    const files: string[] = [];
    const walk = (d: string) => {
      for (const f of readdirSync(d)) {
        const p = join(d, f);
        if (statSync(p).isDirectory()) walk(p);
        else if (/\.tsx?$/.test(f) && !p.endsWith('storageKeys.ts')) files.push(p);
      }
    };
    walk('src');
    const bad = files.filter((f) => {
      const src = readFileSync(f, 'utf8');
      return /localStorage/.test(src) && /['"`](mg_|myeong-hits|gaeun-routine)/.test(src);
    });
    expect(bad).toEqual([]);
  });
});

describe('예전 형식의 기록도 그대로 읽는다', () => {
  beforeEach(() => mem.clear());

  it('최근 본 사주 — 예전에 저장된 목록', () => {
    mem.set('mg_recent', JSON.stringify([{ hash: '#/r?n=%EA%B9%80&g=f&c=s&y=1994&m=3&d=15&h=9&mi=30&lon=126.98&tz=Asia%2FSeoul', label: '김 · 1994.3.15 · 여성', at: 1 }]));
    expect(loadRecent()).toHaveLength(1);
  });

  it('결과 주소(공유 링크·최근 본 사주) — 처음 만든 형식을 계속 풀어낸다', () => {
    const i = decodeInput(
      'n=%EA%B9%80%EB%AA%85%EA%B2%BD&g=f&c=l&y=1994&m=3&d=15&lp=1&h=9&mi=30&lon=127.5&tz=Asia%2FSeoul&p=%EC%B6%A9%EC%A3%BC&tc=none&zr=split&mb=infj&job=%EB%A7%88%EC%BC%80%ED%84%B0',
    );
    expect(i).toEqual({
      name: '김명경',
      gender: 'female',
      calendar: 'lunar',
      year: 1994,
      month: 3,
      day: 15,
      leapMonth: true,
      hour: 9,
      minute: 30,
      longitude: 127.5,
      timeZone: 'Asia/Seoul',
      placeName: '충주',
      timeCorrection: 'none',
      ziHourRule: 'split',
      mbti: 'INFJ',
      job: '마케터',
    });
    // 시간 모름 · 최소 형식
    expect(decodeInput('g=m&c=s&y=2001&m=12&d=1&lon=126.978&tz=Asia%2FSeoul')).toMatchObject({ hour: null, minute: null, gender: 'male' });
  });

  it('‘모두 지우기’는 명경사주 기록만 지운다', () => {
    mem.set('mg_recent', '[]');
    mem.set('myeong-hits:solar-1994-3-15-9-30-female', '{}');
    mem.set('gaeun-routine-career-2026-10-15', '[]');
    mem.set('other-site-key', 'keep');
    clearAllLocal();
    expect([...mem.keys()]).toEqual(['other-site-key']);
  });
});
