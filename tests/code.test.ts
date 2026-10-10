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
import { concernOffers, entOf, isOpen, PAID_CONCERNS, partnerOffers, purchaseOf, type Purchase, type SeasonKey } from '../src/lib/entitlements.ts';

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
    await demoApi.record(P('one', 'career', 3900));
    const c1 = (await demoApi.current()).code;
    await demoApi.record(P('one', 'love', 3900));
    expect((await demoApi.current()).code).toBe(c1);
    expect(await demoApi.purchases()).toHaveLength(2);
  });

  it('다른 휴대폰에서 따로 산 뒤 코드를 넣어도, 양쪽에서 산 것이 모두 남는다', async () => {
    // 휴대폰 A: 이직·진로 + 연애·결혼 (3,900원씩)
    await demoApi.record(P('one', 'career', 3900));
    await demoApi.record(P('one', 'love', 3900));
    const codeA = (await demoApi.current()).code;
    // 휴대폰 B: 코드를 잊고 3,900원 돈
    newPhone();
    await demoApi.record(P('one', 'money', 3900));
    const codeB = (await demoApi.current()).code;
    expect(codeB).not.toBe(codeA);
    // B에서 A 코드를 넣는다 — A에서 7,800원을 낸 뒤라 B는 2,100원만 더 내면 전부 열 수 있었다. 겹쳐 낸 1,800원은 환불
    const r = await demoApi.redeem(codeA.toLowerCase());
    expect(r).toEqual({ ok: true, merged: 1, code: codeA, refund: 1800 });
    const e = entOf(await demoApi.purchases(), S);
    expect(['career', 'love', 'money'].every((id) => isOpen(e, id as Purchase['item']))).toBe(true);
    expect(e.spent).toBe(9900);
    // 환불하고도 묶음 가격(9,900원)에 이르렀으니 전부 열린다
    expect(e.all).toBe(true);
    // 세 번째 휴대폰에서 예전 B 코드를 넣어도 합쳐진 기록으로 이어진다
    newPhone();
    const r2 = await demoApi.redeem(codeB);
    expect(r2).toMatchObject({ ok: true, code: codeA });
    expect(await demoApi.purchases()).toHaveLength(3);
  });

  it('예전 시안에서 두 기기가 각각 무료로 고른 것도 합치면 둘 다 열려 있다', () => {
    const e = entOf([P('free', 'career', 0), P('free', 'money', 0)], S);
    expect(isOpen(e, 'career') && isOpen(e, 'money')).toBe(true);
  });

  it('합친 뒤 낸 돈이 9,900원에 이르면 전부 열린다 — 더 낼 일이 없다', () => {
    const e = entOf([P('one', 'career', 3900), P('one', 'love', 3900), P('one', 'money', 3900)], S);
    expect(e.all).toBe(true);
    expect(PAID_CONCERNS.every((id) => isOpen(e, id))).toBe(true);
  });

  it('없는 코드는 아무것도 바꾸지 않는다', async () => {
    await demoApi.record(P('one', 'career', 3900));
    const before = await demoApi.purchases();
    expect((await demoApi.redeem('MG-2222-2222')).ok).toBe(false);
    expect(await demoApi.purchases()).toEqual(before);
  });
});

// ---------------------------------------------------------------------------
// 중복 결제 막기 — 결제는 서버가 최신 기록으로 다시 본 뒤에만 된다 (시안의 흉내 서버로 확인)
// ---------------------------------------------------------------------------
const Y27: SeasonKey = { year: 2027, title: '2027 신년운세' };
/** 지금 화면에 보이는 선택지 중 하나로 결제 */
async function payOffer(id: Purchase['item'], kind: string, list?: Purchase[]) {
  const e = entOf(list ?? (await demoApi.purchases()), S, Y27);
  const o = concernOffers(e, id, undefined).find((x) => x.kind === kind)!;
  expect(o, `${id} ${kind}`).toBeTruthy();
  return { o, r: await demoApi.pay(purchaseOf(o, S, id, undefined, Y27.year), Y27) };
}

describe('중복 결제 막기', () => {
  beforeEach(() => mem.clear());

  it('결제하면 구매 코드를 돌려주고, 같은 리포트를 다시 결제하려 하면 결제하지 않는다', async () => {
    const { r } = await payOffer('career', 'one');
    expect(r).toEqual({ ok: true, code: (await demoApi.current()).code });
    // 옛 화면(아직 잠겨 보이던 탭)에 남은 버튼으로 또 눌러도 서버가 막는다
    const again = await demoApi.pay(purchaseOf({ kind: 'one', cost: 3900, label: '' }, S, 'career', undefined, 2027), Y27);
    expect(again).toEqual({ ok: false, reason: 'owned' });
    expect(await demoApi.purchases()).toHaveLength(1);
  });

  it('다른 탭에서 먼저 하나를 산 뒤 옛 값으로 전부 열기를 누르면, 값이 바뀌었다고 다시 고르게 한다', async () => {
    const stale = entOf([], S, Y27);
    const oldAll = concernOffers(stale, 'love').find((x) => x.kind === 'all')!;
    expect(oldAll.cost).toBe(9900);
    await payOffer('career', 'one'); // 다른 탭에서 첫 결제 1,900원
    const r = await demoApi.pay(purchaseOf(oldAll, S, 'love', undefined, 2027), Y27);
    expect(r).toEqual({ ok: false, reason: 'price' });
    // 새 값(8,000원)으로는 결제된다
    const { o, r: r2 } = await payOffer('love', 'all');
    expect(o.cost).toBe(8000);
    expect(r2.ok).toBe(true);
    // 전부 열린 뒤에는 어떤 고민도, 신년운세도 다시 결제되지 않는다
    for (const id of PAID_CONCERNS) {
      expect(await demoApi.pay({ kind: 'one', item: id, target: S, amount: 3900, at: Date.now(), year: 2027 }, Y27)).toEqual({ ok: false, reason: 'owned' });
    }
  });

  it('궁합 상대도 같은 사람은 한 번만', async () => {
    const o = partnerOffers(entOf([], S, Y27), 'p1')[0];
    expect((await demoApi.pay(purchaseOf(o, S, null, 'p1'), Y27)).ok).toBe(true);
    expect(await demoApi.pay(purchaseOf(o, S, null, 'p1'), Y27)).toEqual({ ok: false, reason: 'owned' });
    expect((await demoApi.pay(purchaseOf(o, S, null, 'p2'), Y27)).ok).toBe(true);
  });

  it('코드를 모른 채 새 휴대폰에서 같은 리포트를 또 샀다면, 코드를 넣어 합칠 때 겹친 결제를 환불한다', async () => {
    await payOffer('career', 'one'); // 휴대폰 A: 첫 결제 1,900원
    await payOffer('love', 'one'); // A: 3,900원
    const codeA = (await demoApi.current()).code;
    newPhone();
    const { o } = await payOffer('career', 'one'); // 휴대폰 B: 코드를 몰라 이직·진로를 또 삼 (B에서는 첫 결제라 1,900원)
    expect(o.cost).toBe(1900);
    const r = await demoApi.redeem(codeA);
    expect(r).toMatchObject({ ok: true, merged: 1, refund: 1900 });
    const list = await demoApi.purchases();
    expect(list.map((p) => p.refunded ?? 0)).toEqual([0, 0, 1900]);
    const e = entOf(list, S, Y27);
    expect(isOpen(e, 'career') && isOpen(e, 'love')).toBe(true);
    // 환불한 돈은 차액에 넣지 않는다 — 나머지 전부는 9,900 − 5,800 = 4,100원
    expect(e.spent).toBe(5800);
    expect(concernOffers(e, 'money').find((x) => x.kind === 'all')?.cost).toBe(4100);
    // 같은 코드를 또 넣어도 두 번 환불하지 않는다
    expect(await demoApi.redeem(codeA)).toEqual({ ok: true, merged: 0, code: codeA });
  });
});
