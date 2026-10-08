import { describe, expect, it } from 'vitest';
import { newCode, normalizeCode } from '../src/lib/account.ts';

describe('구매 코드', () => {
  it('MG-XXXX-XXXX 꼴이고 헷갈리는 글자가 없다', () => {
    for (let i = 0; i < 200; i++) expect(newCode()).toMatch(/^MG-[2-9A-HJKMNP-Z]{4}-[2-9A-HJKMNP-Z]{4}$/);
  });
  it('소문자·공백·하이픈이 빠져도 알아본다', () => {
    expect(normalizeCode('mg-7k2p-9qx4')).toBe('MG-7K2P-9QX4');
    expect(normalizeCode(' 7K2P 9QX4 ')).toBe('MG-7K2P-9QX4');
    expect(normalizeCode('MG7K2P9QX4')).toBe('MG-7K2P-9QX4');
  });
  it('자리 수가 틀리거나 쓰지 않는 글자가 있으면 거른다', () => {
    expect(normalizeCode('MG-7K2P-9QX')).toBeNull();
    expect(normalizeCode('MG-0K2P-9QX4')).toBeNull();
  });
});
