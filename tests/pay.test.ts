/**
 * 결제 확인 서버의 규칙 (server/pay/core.ts) — 저장소와 포트원을 흉내 내서 검사한다.
 * 돈이 걸린 곳이라 '화면이 보낸 금액을 믿지 않는다', '겹친 결제는 돌려준다', '같은 결제를 두 번 기록하지 않는다'를 지킨다.
 */
import { describe, expect, it } from 'vitest';
import { PRICES } from '../src/config/plans.ts';
import type { Purchase, SeasonKey } from '../src/lib/entitlements.ts';
import {
  claimGift,
  cleanPurchase,
  confirm,
  couponHash,
  createAccount,
  listPurchases,
  normalizeCoupon,
  orderName,
  prepare,
  redeem,
  useCoupon,
  type Gateway,
  type Order,
  type PaymentInfo,
  type Store,
  type StoredPurchase,
} from '../server/pay/core.ts';

function memStore() {
  const accounts = new Set<string>();
  const alias = new Map<string, string>();
  const rows = new Map<string, StoredPurchase[]>();
  const orders = new Map<string, Order>();
  const coupons = new Map<string, { expires: number; used: boolean }>();
  const gifts: { code: string; pid?: string; to?: string }[] = [];
  const store: Store = {
    async createAccount(code) {
      if (accounts.has(code)) return false;
      accounts.add(code);
      return true;
    },
    hasAccount: async (code) => accounts.has(code),
    aliasOf: async (code) => alias.get(code) ?? null,
    setAlias: async (from, to) => void alias.set(from, to),
    purchases: async (code) => [...(rows.get(code) ?? [])],
    addPurchase: async (code, p) => void rows.set(code, [...(rows.get(code) ?? []), p]),
    async movePurchases(from, to) {
      rows.set(to, [...(rows.get(to) ?? []), ...(rows.get(from) ?? [])]);
      rows.delete(from);
    },
    async addRefund(code, pid, amount) {
      rows.set(
        code,
        (rows.get(code) ?? []).map((p) => (p.paymentId === pid ? { ...p, refunded: (p.refunded ?? 0) + amount } : p)),
      );
    },
    saveOrder: async (o) => void orders.set(o.paymentId, { ...o }),
    getOrder: async (id) => (orders.has(id) ? { ...orders.get(id)! } : null),
    async claimOrder(id) {
      const o = orders.get(id);
      if (!o || o.status !== 'ready') return false;
      o.status = 'confirming';
      return true;
    },
    setOrderStatus: async (id, status) => void (orders.get(id)!.status = status),
    async takeCoupon(hash, now) {
      const c = coupons.get(hash);
      if (!c || c.used || c.expires <= now) return false;
      c.used = true;
      return true;
    },
    releaseCoupon: async (hash) => void (coupons.get(hash)!.used = false),
    async takeGift(pid, code) {
      const had = gifts.find((g) => g.pid === pid);
      if (had) return had.code;
      const g = gifts.find((x) => !x.pid);
      if (!g) return null;
      g.pid = pid;
      g.to = code;
      return g.code;
    },
    giftsOf: async (code) => gifts.filter((g) => g.to === code).map((g) => ({ code: g.code, used: false, paymentId: g.pid as string })),
    giftsLeft: async () => gifts.filter((g) => !g.pid).length,
  };
  return { store, rows, orders, coupons, gifts };
}

function fakeGateway() {
  const paid = new Map<string, PaymentInfo>();
  const cancels: { id: string; amount: number | null }[] = [];
  const approvals: { id: string; token: string; amount: number }[] = [];
  const gw: Gateway = {
    getPayment: async (id) => paid.get(id) ?? null,
    cancel: async (id, amount) => void cancels.push({ id, amount }),
    async approve(id, token, amount) {
      approvals.push({ id, token, amount });
      if (paid.get(id)?.status === 'READY') paid.set(id, { status: 'PAID', total: amount, currency: 'KRW' });
    },
  };
  return { gw, paid, cancels, approvals };
}

const NOW = Date.UTC(2026, 10, 5);
const Y27: SeasonKey = { year: 2027, title: '2027 신년운세' };
const S = 'abc123';
const one = (item: Purchase['item'], amount = PRICES.concern): Purchase => ({ kind: 'one', item, target: S, amount, at: 0, year: 2027 });
const allOf = (): Purchase => ({ kind: 'all', item: 'career', target: S, amount: PRICES.all, at: 0, year: 2027 });

async function newAccount(store: Store) {
  const r = await createAccount(store);
  expect(r.ok).toBe(true);
  return r.code as string;
}

/** 준비 → (포트원에서 결제됐다고 치고) → 확인 */
async function buy(store: Store, g: ReturnType<typeof fakeGateway>, code: string, p: Purchase, paidTotal = p.amount) {
  const prep = await prepare(store, { code, purchase: p, season: Y27 }, NOW);
  if (!prep.ok) return prep;
  g.paid.set(prep.paymentId as string, { status: 'PAID', total: paidTotal, currency: 'KRW' });
  return { ...(await confirm(store, g.gw, prep.paymentId, NOW)), paymentId: prep.paymentId as string };
}

describe('주문 준비 — 화면이 보낸 값을 그대로 믿지 않는다', () => {
  it('정해진 값이면 결제 번호와 금액·상품명을 준다', async () => {
    const { store } = memStore();
    const code = await newAccount(store);
    const r = await prepare(store, { code, purchase: one('career'), season: Y27 }, NOW);
    expect(r).toMatchObject({ ok: true, amount: 3900, orderName: '명경사주 이직·진로 리포트' });
    expect(r.paymentId).toMatch(/^mg-/);
  });

  it('금액을 고쳐 보내면(1원) 주문을 만들지 않는다', async () => {
    const { store, orders } = memStore();
    const code = await newAccount(store);
    expect(await prepare(store, { code, purchase: one('career', 1), season: Y27 }, NOW)).toEqual({ ok: false, reason: 'price' });
    expect(orders.size).toBe(0);
  });

  it('없는 구매 코드, 이상한 상품, 지난 시즌은 받지 않는다', async () => {
    const { store } = memStore();
    const code = await newAccount(store);
    expect((await prepare(store, { code: 'MG-2222-2222', purchase: one('career'), season: Y27 }, NOW)).reason).toBe('unknown');
    expect(cleanPurchase({ kind: 'free', item: 'career', target: S, amount: 0 })).toBeNull();
    expect(cleanPurchase({ kind: 'one', item: 'hack', target: S, amount: 3900 })).toBeNull();
    expect(cleanPurchase({ kind: 'one', item: 'career', target: '<script>', amount: 3900 })).toBeNull();
    expect((await prepare(store, { code, purchase: { ...one('year', PRICES.year), year: 2020 }, season: { year: 2020, title: '' } }, NOW)).reason).toBe('bad');
  });

  it('상품명 — 카드 명세서에 나오는 이름', () => {
    expect(orderName(allOf(), Y27)).toBe('명경사주 전체 묶음');
    expect(orderName(one('year', PRICES.year), Y27)).toBe('명경사주 2027 신년운세 리포트');
    expect(orderName({ kind: 'partner', item: 'match', target: `${S}>p1`, amount: PRICES.partner, at: 0 }, Y27)).toBe('명경사주 궁합·재회 리포트');
  });
});

describe('결제 확인 — 포트원에 직접 물어본 뒤에만 기록한다', () => {
  it('결제되면 기록이 남고, 결제 번호는 손님에게 보이지 않는다', async () => {
    const { store } = memStore();
    const g = fakeGateway();
    const code = await newAccount(store);
    expect(await buy(store, g, code, one('career'))).toMatchObject({ ok: true, code });
    const list = await listPurchases(store, code);
    expect(list.purchases).toHaveLength(1);
    expect((list.purchases as StoredPurchase[])[0].paymentId).toBeUndefined();
  });

  it('결제되지 않았으면 기록하지 않는다', async () => {
    const { store } = memStore();
    const g = fakeGateway();
    const code = await newAccount(store);
    const prep = await prepare(store, { code, purchase: one('career'), season: Y27 }, NOW);
    expect(await confirm(store, g.gw, prep.paymentId, NOW)).toEqual({ ok: false, reason: 'not_paid', status: 'none' });
    expect((await listPurchases(store, code)).purchases).toHaveLength(0);
  });

  it('포트원에서 다른 금액으로 결제됐으면 기록하지 않고 전액 취소한다', async () => {
    const { store } = memStore();
    const g = fakeGateway();
    const code = await newAccount(store);
    const r = await buy(store, g, code, one('career'), 100);
    expect(r).toMatchObject({ ok: false, reason: 'mismatch' });
    expect(g.cancels).toEqual([{ id: r.paymentId, amount: null }]);
    expect((await listPurchases(store, code)).purchases).toHaveLength(0);
  });

  it('인증만 된 결제(READY)는 승인표로 주문 금액만큼 승인한 뒤 기록한다', async () => {
    const { store } = memStore();
    const g = fakeGateway();
    const code = await newAccount(store);
    const prep = await prepare(store, { code, purchase: one('career'), season: Y27 }, NOW);
    g.paid.set(prep.paymentId as string, { status: 'READY', total: 3900, currency: 'KRW' });
    expect(await confirm(store, g.gw, prep.paymentId, NOW)).toMatchObject({ ok: false, status: 'READY' });
    expect(await confirm(store, g.gw, prep.paymentId, NOW, 'tok')).toMatchObject({ ok: true, code });
    expect(g.approvals).toEqual([{ id: prep.paymentId, token: 'tok', amount: 3900 }]);
  });

  it('이미 열린 것이면 승인 자체를 하지 않는다', async () => {
    const { store } = memStore();
    const g = fakeGateway();
    const code = await newAccount(store);
    const b = await prepare(store, { code, purchase: one('career'), season: Y27 }, NOW);
    await buy(store, g, code, one('career'));
    g.paid.set(b.paymentId as string, { status: 'READY', total: 3900, currency: 'KRW' });
    expect(await confirm(store, g.gw, b.paymentId, NOW, 'tok')).toEqual({ ok: false, reason: 'owned' });
    expect(g.approvals).toEqual([]);
  });

  it('테스트 채널 결제는 기록하지 않고 취소한다 (켜 두면 기록)', async () => {
    const { store } = memStore();
    const g = fakeGateway();
    const code = await newAccount(store);
    const prep = await prepare(store, { code, purchase: one('career'), season: Y27 }, NOW);
    g.paid.set(prep.paymentId as string, { status: 'PAID', total: 3900, currency: 'KRW', test: true });
    expect(await confirm(store, g.gw, prep.paymentId, NOW)).toEqual({ ok: false, reason: 'test' });
    expect(g.cancels).toEqual([{ id: prep.paymentId, amount: null }]);
    expect((await listPurchases(store, code)).purchases).toHaveLength(0);
    const p2 = await prepare(store, { code, purchase: one('love'), season: Y27 }, NOW);
    g.paid.set(p2.paymentId as string, { status: 'PAID', total: 3900, currency: 'KRW', test: true });
    expect(await confirm(store, { ...g.gw, allowTest: true }, p2.paymentId, NOW)).toMatchObject({ ok: true });
  });

  it('웹훅이 먼저 기록하는 중이면 실패로 답하지 않고 기다렸다가 성공으로 답한다', async () => {
    const m = memStore();
    const g = fakeGateway();
    const code = await newAccount(m.store);
    const prep = await prepare(m.store, { code, purchase: one('career'), season: Y27 }, NOW);
    g.paid.set(prep.paymentId as string, { status: 'PAID', total: 3900, currency: 'KRW' });
    m.orders.get(prep.paymentId as string)!.status = 'confirming'; // 웹훅이 잡은 상태
    setTimeout(() => (m.orders.get(prep.paymentId as string)!.status = 'paid'), 300);
    expect(await confirm(m.store, g.gw, prep.paymentId, NOW)).toMatchObject({ ok: true, code });
  });

  it('같은 결제를 화면과 웹훅이 두 번 확인해도 기록은 한 번', async () => {
    const { store } = memStore();
    const g = fakeGateway();
    const code = await newAccount(store);
    const r = await buy(store, g, code, one('career'));
    expect(await confirm(store, g.gw, r.paymentId, NOW)).toMatchObject({ ok: true });
    expect((await listPurchases(store, code)).purchases).toHaveLength(1);
  });

  it('결제창을 연 사이 다른 기기에서 먼저 같은 것을 샀으면 나중 결제는 전액 취소한다', async () => {
    const { store } = memStore();
    const g = fakeGateway();
    const code = await newAccount(store);
    // 두 화면에서 같은 고민의 주문을 먼저 만들어 둔다
    const a = await prepare(store, { code, purchase: one('career'), season: Y27 }, NOW);
    const b = await prepare(store, { code, purchase: one('career'), season: Y27 }, NOW);
    for (const x of [a, b]) g.paid.set(x.paymentId as string, { status: 'PAID', total: 3900, currency: 'KRW' });
    expect((await confirm(store, g.gw, a.paymentId, NOW)).ok).toBe(true);
    expect(await confirm(store, g.gw, b.paymentId, NOW)).toEqual({ ok: false, reason: 'owned' });
    expect(g.cancels).toEqual([{ id: b.paymentId, amount: null }]);
    expect((await listPurchases(store, code)).purchases).toHaveLength(1);
  });

  it('하나를 산 뒤에는 묶음(19,900원) 주문을 만들지 않는다 — 출시 규칙(차액 결제 끔)', async () => {
    const { store } = memStore();
    const g = fakeGateway();
    const code = await newAccount(store);
    await buy(store, g, code, one('career'));
    expect((await prepare(store, { code, purchase: allOf(), season: Y27 }, NOW)).reason).toBe('price');
  });
});

describe('구매 코드 합치기 — 겹쳐 낸 돈은 그 결제를 부분 취소해 돌려준다', () => {
  it('다른 기기에서 같은 고민을 또 샀으면 합칠 때 나중 결제를 돌려준다', async () => {
    const { store } = memStore();
    const g = fakeGateway();
    const a = await newAccount(store);
    const b = await newAccount(store);
    await buy(store, g, a, one('career'));
    const second = await buy(store, g, b, one('career'));
    const r = await redeem(store, g.gw, { code: b, target: a });
    expect(r).toMatchObject({ ok: true, merged: 1, code: a, refund: 3900 });
    expect(g.cancels).toEqual([{ id: second.paymentId, amount: 3900 }]);
    // 합친 뒤에는 예전 코드로 들어와도 같은 기록이 보인다
    expect((await listPurchases(store, b)).code).toBe(a);
    expect((await listPurchases(store, a)).purchases).toHaveLength(2);
  });

  it('겹치지 않으면 돌려줄 돈 없이 합친다', async () => {
    const { store } = memStore();
    const g = fakeGateway();
    const a = await newAccount(store);
    const b = await newAccount(store);
    await buy(store, g, a, one('career'));
    await buy(store, g, b, one('love'));
    expect(await redeem(store, g.gw, { code: b, target: a })).toEqual({ ok: true, merged: 1, code: a });
    expect(g.cancels).toEqual([]);
  });

  it('없는 코드는 합치지 않는다', async () => {
    const { store } = memStore();
    const g = fakeGateway();
    const a = await newAccount(store);
    expect(await redeem(store, g.gw, { code: a, target: 'MG-ZZZZ-ZZZZ' })).toEqual({ ok: false, merged: 0 });
  });
});

describe('무료 코드 — 한 번 쓰면 끝, 3,900원짜리 고민 리포트 하나만', () => {
  const EXP = Date.UTC(2026, 11, 31, 15, 0); // 12/31 24:00 KST
  async function setup() {
    const m = memStore();
    const code = await newAccount(m.store);
    m.coupons.set(await couponHash('FREE-AB2C-3DEF'), { expires: EXP, used: false });
    return { ...m, code };
  }

  it('코드 모양을 정리한다 (소문자·띄어쓰기·하이픈 상관없이)', () => {
    expect(normalizeCoupon('free ab2c-3def')).toBe('FREE-AB2C-3DEF');
    expect(normalizeCoupon('FREE-AB2C-3DE')).toBeNull();
    expect(normalizeCoupon('MG-AB2C-3DEF')).toBeNull();
  });

  it('쓰면 그 고민이 열리고, 같은 코드는 다시 못 쓴다', async () => {
    const { store, code } = await setup();
    expect(await useCoupon(store, { code, coupon: 'free-ab2c-3def', item: 'career', target: S }, NOW)).toEqual({ ok: true, code });
    const list = (await listPurchases(store, code)).purchases as StoredPurchase[];
    expect(list).toEqual([{ kind: 'free', item: 'career', target: S, amount: 0, at: NOW }]);
    // 다른 계정이 같은 코드를 넣어도 안 된다
    const other = await newAccount(store);
    expect(await useCoupon(store, { code: other, coupon: 'FREE-AB2C-3DEF', item: 'love', target: 'zzz' }, NOW)).toEqual({ ok: false, reason: 'coupon' });
  });

  it('이미 열린 고민이면 코드를 쓰지 않는다', async () => {
    const { store, code, coupons } = await setup();
    const g = fakeGateway();
    await buy(store, g, code, one('career'));
    expect(await useCoupon(store, { code, coupon: 'FREE-AB2C-3DEF', item: 'career', target: S }, NOW)).toEqual({ ok: false, reason: 'owned' });
    expect([...coupons.values()][0].used).toBe(false);
  });

  it('신년운세·궁합(3,900원이 아닌 것)은 열 수 없고, 기간이 지나면 못 쓴다', async () => {
    const { store, code } = await setup();
    expect((await useCoupon(store, { code, coupon: 'FREE-AB2C-3DEF', item: 'year', target: S }, NOW)).reason).toBe('bad');
    expect((await useCoupon(store, { code, coupon: 'FREE-AB2C-3DEF', item: 'match', target: S }, NOW)).reason).toBe('bad');
    expect((await useCoupon(store, { code, coupon: 'FREE-AB2C-3DEF', item: 'love', target: S }, EXP + 1)).reason).toBe('coupon');
  });

  it('무료로 연 고민은 다시 결제하지 않는다 (산 것으로 본다)', async () => {
    const { store, code } = await setup();
    await useCoupon(store, { code, coupon: 'FREE-AB2C-3DEF', item: 'money', target: S }, NOW);
    expect((await prepare(store, { code, purchase: one('money'), season: Y27 }, NOW)).reason).toBe('owned');
  });
});

describe('결제 이벤트 — 결제하고 후기를 남기면 무료 코드 하나 (결제 한 건에 하나, 준비한 코드가 떨어지면 끝)', () => {
  it('결제만으로는 주지 않고, 후기 뒤에 받으면 결제 한 건에 하나', async () => {
    const m = memStore();
    m.gifts.push({ code: 'FREE-AAAA-BBBB' }, { code: 'FREE-CCCC-DDDD' });
    const g = fakeGateway();
    const code = await newAccount(m.store);
    const r = await buy(m.store, g, code, one('career'));
    expect(r).not.toHaveProperty('gift');
    expect(await claimGift(m.store, { code })).toEqual({ ok: true, gift: 'FREE-AAAA-BBBB' });
    expect(await claimGift(m.store, { code })).toEqual({ ok: false, reason: 'done' });
    expect((await listPurchases(m.store, code)).gifts).toEqual([{ code: 'FREE-AAAA-BBBB', used: false }]);
    // 한 번 더 결제하면 하나 더
    await buy(m.store, g, code, one('love'));
    expect(await claimGift(m.store, { code })).toEqual({ ok: true, gift: 'FREE-CCCC-DDDD' });
  });

  it('유료 결제가 없으면(무료 코드로만 열었어도) 주지 않는다', async () => {
    const m = memStore();
    m.gifts.push({ code: 'FREE-AAAA-BBBB' });
    const code = await newAccount(m.store);
    expect(await claimGift(m.store, { code })).toEqual({ ok: false, reason: 'nopay' });
    m.coupons.set(await couponHash('FREE-AB2C-3DEF'), { expires: Date.UTC(2027, 0, 1), used: false });
    await useCoupon(m.store, { code, coupon: 'FREE-AB2C-3DEF', item: 'career', target: S }, NOW);
    expect(await claimGift(m.store, { code })).toEqual({ ok: false, reason: 'nopay' });
  });

  it('전체 묶음을 사면 결제하자마자 선물 코드 (같은 결제를 다시 확인해도 같은 코드, 후기로 또 받지는 않음)', async () => {
    const m = memStore();
    m.gifts.push({ code: 'FREE-AAAA-BBBB' }, { code: 'FREE-CCCC-DDDD' });
    const g = fakeGateway();
    const code = await newAccount(m.store);
    const r = await buy(m.store, g, code, allOf());
    expect(r).toMatchObject({ ok: true, gift: 'FREE-AAAA-BBBB' });
    expect(await confirm(m.store, g.gw, r.paymentId, NOW)).toMatchObject({ ok: true, gift: 'FREE-AAAA-BBBB' });
    expect(await claimGift(m.store, { code })).toEqual({ ok: false, reason: 'done' });
  });

  it('준비한 코드가 떨어지면 끝', async () => {
    const m = memStore();
    const g = fakeGateway();
    const code = await newAccount(m.store);
    await buy(m.store, g, code, one('money'));
    expect(await claimGift(m.store, { code })).toEqual({ ok: false, reason: 'soldout' });
  });
});
