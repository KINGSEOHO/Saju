import { describe, expect, it } from 'vitest';
import { josa } from '../src/engine/josa.ts';

describe('조사 자동 선택', () => {
  it.each([
    ['목', '을/를', '목을'],
    ['나무', '을/를', '나무를'],
    ['‘따뜻함’', '을/를', '‘따뜻함’을'],
    ['‘재능’', '이/가', '‘재능’이'],
    ['“지혜”', '으로/로', '“지혜”로'],
    ['회사원(사무직)', '은/는', '회사원(사무직)은'],
    ['ENFP', '와', 'ENFP와'],
    ['서호', '아/야', '서호야'],
    ['지원', '아/야', '지원아'],
    ['2027년', '은/는', '2027년은'],
  ] as const)('%s + %s → %s', (w, pair, out) => {
    if (pair === '와') expect(josa(w, '과/와')).toBe(out);
    else expect(josa(w, pair)).toBe(out);
  });
});
