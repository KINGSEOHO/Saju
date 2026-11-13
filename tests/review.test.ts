/** 심사용 접속 — 토큰이 맞을 때만 켜지고, 토큰이 없거나 바뀌면 꺼진다 */
import { describe, expect, it } from 'vitest';
import { reviewOn } from '../src/config/plans.ts';

describe('심사용 접속 판단', () => {
  it('주소에 토큰이 맞게 있으면 켜진다', () => expect(reviewOn('?review=abc', null, 'abc')).toBe(true));
  it('이미 그 토큰으로 들어온 적 있는 브라우저는 계속 켜진다', () => expect(reviewOn('', 'abc', 'abc')).toBe(true));
  it('토큰이 틀리면 꺼져 있다', () => expect(reviewOn('?review=zzz', null, 'abc')).toBe(false));
  it('토큰을 바꾸면 예전에 들어온 브라우저도 꺼진다', () => expect(reviewOn('', 'old', 'new')).toBe(false));
  it('토큰이 비어 있으면(변수를 안 넣으면) 항상 꺼져 있다', () => {
    expect(reviewOn('?review=', null, '')).toBe(false);
    expect(reviewOn('', '', '')).toBe(false);
  });
});
