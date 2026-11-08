/**
 * 결제 확인 서버의 규칙 — 저장소(Store)와 결제대행(Gateway)만 바꿔 끼우면 어디서든 같다 (Supabase Edge Function · 시험).
 *
 *  1. prepare: 손님이 고른 상품을 서버가 그 계정의 최신 구매 기록으로 다시 계산한다(checkPurchase).
 *     값이 맞을 때만 주문(결제 번호 · 금액)을 만든다. 화면이 보낸 금액을 그대로 믿지 않는다.
 *  2. 손님이 포트원 결제창에서 결제한다.
 *  3. confirm: 포트원에 그 결제를 직접 물어 '결제됨 · 금액 · 원화'가 주문과 같을 때만 구매 기록을 남긴다.
 *     그사이 다른 기기에서 먼저 산 것이 있어 이미 열린 것이면(owned) 결제를 전액 취소한다.
 *     같은 결제를 두 번 확인해도(화면 · 웹훅) 기록은 한 번만 남는다.
 *  4. redeem: 다른 기기의 구매 코드로 합칠 때 겹쳐 낸 돈(overpaid)은 그 결제를 부분 취소해 돌려준다.
 *
 * 기록에는 '구매 코드 · 산 항목 · 사주 구분값(생일로 만든 짧은 암호값) · 금액 · 결제 번호 · 언제'만 남는다.
 */
import { checkPurchase, overpaid, type Purchase, type SeasonKey } from '../../src/lib/entitlements.ts';
import { CONCERNS } from '../../src/report/concernList.ts';
import { newCode, normalizeCode } from '../../src/lib/code.ts';

/** 저장한 구매 기록 — 결제 번호가 있어야 나중에 환불(부분 취소)할 수 있다 */
export interface StoredPurchase extends Purchase {
  paymentId?: string;
}

export interface Order {
  paymentId: string;
  code: string;
  purchase: Purchase;
  season: SeasonKey;
  status: 'ready' | 'confirming' | 'paid' | 'cancelled';
  at: number;
}

export interface Store {
  createAccount(code: string): Promise<boolean>;
  hasAccount(code: string): Promise<boolean>;
  /** 합쳐진 예전 코드 → 지금 코드 (없으면 그대로) */
  aliasOf(code: string): Promise<string | null>;
  setAlias(from: string, to: string): Promise<void>;
  purchases(code: string): Promise<StoredPurchase[]>;
  addPurchase(code: string, p: StoredPurchase): Promise<void>;
  /** from 계정의 기록을 to 계정으로 옮긴다 */
  movePurchases(from: string, to: string): Promise<void>;
  /** 그 결제의 돌려준 돈을 더한다 */
  addRefund(code: string, paymentId: string, amount: number): Promise<void>;
  saveOrder(o: Order): Promise<void>;
  getOrder(paymentId: string): Promise<Order | null>;
  /** ready → confirming 을 한 번만 허락한다 (동시에 두 번 확인해도 기록이 한 번만 남게) */
  claimOrder(paymentId: string): Promise<boolean>;
  setOrderStatus(paymentId: string, status: Order['status']): Promise<void>;
}

export interface PaymentInfo {
  status: string;
  total: number;
  currency: string;
  /** 결제가 안 됐을 때 포트원이 알려 준 사유 (PG 코드·메시지) — 시험·고객센터용 */
  why?: string;
}

export interface Gateway {
  getPayment(paymentId: string): Promise<PaymentInfo | null>;
  cancel(paymentId: string, amount: number | null, reason: string): Promise<void>;
  /** 수동 승인 — 결제창이 인증만 받고 승인표(paymentToken)를 주면 서버가 승인을 요청해야 돈이 나간다 */
  approve?(paymentId: string, token: string, amount: number): Promise<void>;
}

export type ApiResult = Record<string, unknown> & { ok: boolean };

const KINDS = new Set(['one', 'all', 'partner']);
const ITEMS = new Set<string>(CONCERNS.map((c) => c.id));

/** 사주의 해 — 입춘(2월 4일 무렵) 전이거나 10월부터는 다음 해 신년운세를 판다 (report/season.ts와 같은 셈, 서버 시각 기준) */
export function seasonYearsAt(now: number): number[] {
  const kst = new Date(now + 9 * 3600_000);
  const y = kst.getUTCFullYear();
  // 화면은 손님 기기 시각으로 정하므로 경계 날짜 앞뒤 하루씩은 둘 다 받아 준다
  return [y, y + 1];
}

/** 손님이 보낸 구매 기록을 믿을 수 있는 모양으로만 받는다 */
export function cleanPurchase(raw: unknown): Purchase | null {
  if (!raw || typeof raw !== 'object') return null;
  const p = raw as Record<string, unknown>;
  if (typeof p.kind !== 'string' || !KINDS.has(p.kind)) return null;
  if (typeof p.item !== 'string' || !ITEMS.has(p.item)) return null;
  if (typeof p.target !== 'string' || !/^[0-9a-z>]{1,40}$/.test(p.target)) return null;
  if (typeof p.amount !== 'number' || !Number.isInteger(p.amount) || p.amount <= 0 || p.amount > 100000) return null;
  const year = typeof p.year === 'number' && Number.isInteger(p.year) ? p.year : undefined;
  if ((p.kind === 'partner') !== (p.item === 'match')) return null;
  return { kind: p.kind as Purchase['kind'], item: p.item as Purchase['item'], target: p.target, amount: p.amount, at: 0, ...(year ? { year } : {}) };
}

async function resolve(store: Store, code: string): Promise<string> {
  const seen = new Set<string>();
  let cur = code;
  for (;;) {
    const next = await store.aliasOf(cur);
    if (!next || seen.has(next)) return cur;
    seen.add(cur);
    cur = next;
  }
}

export async function createAccount(store: Store, rand: () => number = Math.random): Promise<ApiResult> {
  for (let i = 0; i < 5; i++) {
    const code = newCode(rand);
    if (await store.createAccount(code)) return { ok: true, code };
  }
  return { ok: false, reason: 'busy' };
}

export async function listPurchases(store: Store, rawCode: unknown): Promise<ApiResult> {
  const code = typeof rawCode === 'string' ? normalizeCode(rawCode) : null;
  if (!code || !(await store.hasAccount(code))) return { ok: false, reason: 'unknown' };
  const cur = await resolve(store, code);
  const list = await store.purchases(cur);
  // 결제 번호는 손님 화면에 필요 없다
  return {
    ok: true,
    code: cur,
    purchases: list.map((p) => {
      const out: Purchase = { ...p };
      delete (out as StoredPurchase).paymentId;
      return out;
    }),
  };
}

export async function prepare(store: Store, body: { code?: unknown; purchase?: unknown; season?: unknown }, now: number, rand: () => number = Math.random): Promise<ApiResult> {
  const code = typeof body.code === 'string' ? normalizeCode(body.code) : null;
  if (!code || !(await store.hasAccount(code))) return { ok: false, reason: 'unknown' };
  const p = cleanPurchase(body.purchase);
  if (!p) return { ok: false, reason: 'bad' };
  const s = body.season as SeasonKey | undefined;
  const year = s && typeof s.year === 'number' ? s.year : 0;
  if (!seasonYearsAt(now).includes(year)) return { ok: false, reason: 'bad' };
  const season: SeasonKey = { year, title: typeof s?.title === 'string' ? s.title.slice(0, 20) : '' };
  if ((p.item === 'year' || p.kind === 'all') && p.year !== year) return { ok: false, reason: 'bad' };
  const cur = await resolve(store, code);
  const check = checkPurchase(await store.purchases(cur), p, season);
  if (check !== 'ok') return { ok: false, reason: check };
  const paymentId = `mg-${now.toString(36)}-${Math.floor(rand() * 36 ** 6)
    .toString(36)
    .padStart(6, '0')}`;
  await store.saveOrder({ paymentId, code: cur, purchase: p, season, status: 'ready', at: now });
  return { ok: true, paymentId, amount: p.amount, orderName: orderName(p, season) };
}

/** 결제창과 카드 명세서에 나오는 이름 */
export function orderName(p: Purchase, season: SeasonKey): string {
  if (p.kind === 'partner') return '명경사주 궁합·재회 리포트';
  if (p.kind === 'all') return '명경사주 전체 묶음';
  if (p.item === 'year') return `명경사주 ${season.title || '신년운세'} 리포트`;
  return `명경사주 ${CONCERNS.find((c) => c.id === p.item)?.title ?? ''} 리포트`;
}

export async function confirm(store: Store, gw: Gateway, rawId: unknown, now: number, rawToken?: unknown): Promise<ApiResult> {
  const paymentId = typeof rawId === 'string' && /^mg-[0-9a-z-]{4,40}$/.test(rawId) ? rawId : null;
  if (!paymentId) return { ok: false, reason: 'bad' };
  const order = await store.getOrder(paymentId);
  if (!order) return { ok: false, reason: 'unknown' };
  if (order.status === 'paid') return { ok: true, code: order.code };
  if (order.status === 'cancelled') return { ok: false, reason: 'cancelled' };
  let pay = await gw.getPayment(paymentId);
  // 인증만 끝난 결제(READY) + 승인표가 왔으면 승인을 요청한다. 금액은 화면 말고 주문에 적힌 값으로,
  // 이미 열린 것이면 승인하지 않는다(돈을 뺐다가 돌려주지 않게).
  const token = typeof rawToken === 'string' && rawToken.length < 2000 ? rawToken : '';
  if (pay?.status === 'READY' && token && gw.approve) {
    const pre = checkPurchase(await store.purchases(order.code), order.purchase, order.season);
    if (pre !== 'ok') return { ok: false, reason: pre };
    try {
      await gw.approve(paymentId, token, order.purchase.amount);
    } catch (e) {
      return { ok: false, reason: 'not_paid', status: 'APPROVE_FAILED', why: e instanceof Error ? e.message.slice(0, 200) : '' };
    }
    pay = await gw.getPayment(paymentId);
  }
  // 포트원이 답한 상태를 함께 돌려준다 (READY: 결제창에서 안 끝남 · FAILED · HTTP_401: 키 문제 등) — 고객센터·시험용
  if (!pay || pay.status !== 'PAID') return { ok: false, reason: 'not_paid', status: pay?.status ?? 'none', ...(pay?.why ? { why: pay.why } : {}) };
  // 같은 결제를 화면과 웹훅이 동시에 확인해도 한 번만 남긴다
  if (!(await store.claimOrder(paymentId))) {
    const again = await store.getOrder(paymentId);
    return again?.status === 'paid' ? { ok: true, code: order.code } : { ok: false, reason: 'busy' };
  }
  const refundAll = async (reason: string, why: string) => {
    await gw.cancel(paymentId, null, reason);
    await store.setOrderStatus(paymentId, 'cancelled');
    return { ok: false, reason: why };
  };
  if (pay.total !== order.purchase.amount || pay.currency !== 'KRW') return refundAll('결제 금액이 주문과 달라 자동 취소', 'mismatch');
  // 결제창을 연 사이 다른 기기에서 먼저 산 것이 있으면 겹친 결제다 — 기록하지 않고 돌려준다
  const check = checkPurchase(await store.purchases(order.code), order.purchase, order.season);
  if (check !== 'ok') return refundAll('이미 열린 리포트라 자동 취소', check);
  await store.addPurchase(order.code, { ...order.purchase, at: now, paymentId });
  await store.setOrderStatus(paymentId, 'paid');
  return { ok: true, code: order.code };
}

export async function redeem(store: Store, gw: Gateway, body: { code?: unknown; target?: unknown }): Promise<ApiResult> {
  const own = typeof body.code === 'string' ? normalizeCode(body.code) : null;
  const want = typeof body.target === 'string' ? normalizeCode(body.target) : null;
  if (!want || !(await store.hasAccount(want))) return { ok: false, merged: 0 };
  const target = await resolve(store, want);
  const mine = own && (await store.hasAccount(own)) ? await resolve(store, own) : null;
  if (!mine || mine === target) return { ok: true, merged: 0, code: target };
  const mineList = await store.purchases(mine);
  let refund = 0;
  if (mineList.length) {
    const theirs = await store.purchases(target);
    const joined = [...theirs, ...mineList];
    const back = overpaid(joined);
    await store.movePurchases(mine, target);
    for (let i = 0; i < joined.length; i++) {
      const amt = back[i];
      const pid = joined[i].paymentId;
      if (!amt || !pid) continue;
      await gw.cancel(pid, amt, '구매 코드를 합치며 겹쳐 낸 금액 환불');
      await store.addRefund(target, pid, amt);
      refund += amt;
    }
  }
  await store.setAlias(mine, target);
  return { ok: true, merged: mineList.length, code: target, ...(refund ? { refund } : {}) };
}
