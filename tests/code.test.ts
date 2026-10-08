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

// ---------------------------------------------------------------------------
// 코드를 넣어도 산 것이 사라지지 않는다 (시안의 흉내 서버로 확인)
// ---------------------------------------------------------------------------
import { beforeEach } from 'vitest';
import { demoApi } from '../src/lib/account.ts';
import { entOf, isOpen, PAID_CONCERNS, type Purchase } from '../src/lib/entitlements.ts';

const mem = new Map<string, string>();
Object.assign(globalThis, {
  localStorage: { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v), removeItem: (k: string) => void mem.delete(k) },
});
/** 다른 휴대폰 = 이 기기 계정만 지운 상태 (서버 쪽 기록은 남는다) */
const newPhone = () => mem.delete('mg_demo_device');
const S = 'saju1';
const P = (kind: Purchase['kind'], item: Purchase['item'], amount: number): Purchase => ({ kind, item, target: S, amount, at: Date.now() + Math.random() });

describe('구매 코드 합치기', () => {
  beforeEach(() => mem.clear());

  it('더 사도 코드는 하나 — 같은 코드에 쌓인다', async () => {
    await demoApi.record(P('free', 'career', 0));
    const c1 = (await demoApi.current()).code;
    await demoApi.record(P('one', 'love', 990));
    expect((await demoApi.current()).code).toBe(c1);
    expect(await demoApi.purchases()).toHaveLength(2);
  });

  it('다른 휴대폰에서 따로 산 뒤 코드를 넣어도, 양쪽에서 산 것이 모두 남는다', async () => {
    // 휴대폰 A: 무료 이직·진로 + 990원 연애·결혼
    await demoApi.record(P('free', 'career', 0));
    await demoApi.record(P('one', 'love', 990));
    const codeA = (await demoApi.current()).code;
    // 휴대폰 B: 코드를 잊고 990원 돈
    newPhone();
    await demoApi.record(P('one', 'money', 990));
    const codeB = (await demoApi.current()).code;
    expect(codeB).not.toBe(codeA);
    // B에서 A 코드를 넣는다
    const r = await demoApi.redeem(codeA.toLowerCase());
    expect(r).toEqual({ ok: true, merged: 1, code: codeA });
    const e = entOf(await demoApi.purchases(), S);
    expect(['career', 'love', 'money'].every((id) => isOpen(e, id as Purchase['item']))).toBe(true);
    expect(e.spent).toBe(1980);
    // 세 번째 휴대폰에서 예전 B 코드를 넣어도 합쳐진 기록으로 이어진다
    newPhone();
    const r2 = await demoApi.redeem(codeB);
    expect(r2).toMatchObject({ ok: true, code: codeA });
    expect(await demoApi.purchases()).toHaveLength(3);
  });

  it('두 기기에서 각각 무료를 골랐어도 합치면 둘 다 열려 있다', () => {
    const e = entOf([P('free', 'career', 0), P('free', 'money', 0)], S);
    expect(isOpen(e, 'career') && isOpen(e, 'money')).toBe(true);
  });

  it('합친 뒤 낸 돈이 2,490원에 이르면 고민 전부가 열린다 — 더 낼 일이 없다', () => {
    const e = entOf([P('one', 'career', 990), P('one', 'love', 990), P('one', 'money', 990)], S);
    expect(e.all).toBe(true);
    expect(PAID_CONCERNS.every((id) => isOpen(e, id))).toBe(true);
  });

  it('없는 코드는 아무것도 바꾸지 않는다', async () => {
    await demoApi.record(P('free', 'career', 0));
    const before = await demoApi.purchases();
    expect((await demoApi.redeem('MG-2222-2222')).ok).toBe(false);
    expect(await demoApi.purchases()).toEqual(before);
  });
});
