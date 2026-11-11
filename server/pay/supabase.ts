/**
 * 결제 확인 서버 — Supabase Edge Function(Deno)에 올리는 입구. 규칙은 core.ts, 여기는 저장소·포트원·주소만.
 * scripts/build-pay.mjs가 이 파일을 한 덩어리(supabase/functions/pay/index.js)로 묶는다. 설정: docs/SETUP-PAYMENT.md
 *
 * 주소 (모두 POST, JSON)
 *   /pay/account    새 구매 코드
 *   /pay/purchases  { code } → 그 코드의 구매 기록
 *   /pay/prepare    { code, purchase, season } → { paymentId, amount, orderName }
 *   /pay/confirm    { paymentId } → 결제 확인 뒤 기록
 *   /pay/redeem     { code, target } → 다른 기기의 코드로 합치기
 *   /pay/webhook    포트원 웹훅 (손님이 결제 뒤 창을 닫아도 기록이 남게) — 내용을 믿지 않고 포트원에 다시 묻는다
 *
 * 비밀값은 Supabase의 함수 비밀값(Secrets)에만: PORTONE_API_SECRET. SUPABASE_URL·SUPABASE_SERVICE_ROLE_KEY는 Supabase가 넣어 준다.
 * 표는 RLS를 켜고 정책을 두지 않아, 사이트의 공개 키로는 읽거나 쓸 수 없다 (이 함수만 쓴다).
 */
import { confirm, createAccount, listPurchases, prepare, redeem, type Gateway, type Order, type Store, type StoredPurchase } from './core.ts';

declare const Deno: { env: { get(k: string): string | undefined }; serve(h: (req: Request) => Response | Promise<Response>): void };

const env = (k: string) => Deno.env.get(k) ?? '';
const REST = `${env('SUPABASE_URL')}/rest/v1`;
const KEY = env('SUPABASE_SERVICE_ROLE_KEY');
const ORIGINS = (env('ALLOWED_ORIGINS') || 'https://mgsaju.io.kr').split(',').map((s) => s.trim());

async function db(path: string, init: RequestInit = {}, prefer = 'return=minimal'): Promise<Response> {
  return fetch(`${REST}/${path}`, {
    ...init,
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json', Prefer: prefer, ...(init.headers ?? {}) },
  });
}
async function rows<T>(path: string): Promise<T[]> {
  const r = await db(path, {}, '');
  if (!r.ok) throw new Error(`db ${r.status}`);
  return (await r.json()) as T[];
}
const q = encodeURIComponent;

interface PurchaseRow {
  kind: StoredPurchase['kind'];
  item: StoredPurchase['item'];
  target: string;
  amount: number;
  refunded: number;
  year: number | null;
  payment_id: string | null;
  at: number;
}
const fromRow = (r: PurchaseRow): StoredPurchase => ({
  kind: r.kind,
  item: r.item,
  target: r.target,
  amount: r.amount,
  at: Number(r.at),
  ...(r.refunded ? { refunded: r.refunded } : {}),
  ...(r.year ? { year: r.year } : {}),
  ...(r.payment_id ? { paymentId: r.payment_id } : {}),
});

const store: Store = {
  async createAccount(code) {
    const r = await db('pay_accounts', { method: 'POST', body: JSON.stringify({ code }) });
    if (r.status === 409) return false;
    if (!r.ok) throw new Error(`db ${r.status}`);
    return true;
  },
  hasAccount: async (code) => (await rows<{ code: string }>(`pay_accounts?code=eq.${q(code)}&select=code`)).length > 0,
  aliasOf: async (code) => (await rows<{ new_code: string }>(`pay_aliases?old_code=eq.${q(code)}&select=new_code`))[0]?.new_code ?? null,
  async setAlias(from, to) {
    await db('pay_aliases', { method: 'POST', body: JSON.stringify({ old_code: from, new_code: to }) }, 'resolution=merge-duplicates,return=minimal');
  },
  purchases: async (code) => (await rows<PurchaseRow>(`pay_purchases?code=eq.${q(code)}&select=kind,item,target,amount,refunded,year,payment_id,at&order=id`)).map(fromRow),
  async addPurchase(code, p) {
    const body = { code, kind: p.kind, item: p.item, target: p.target, amount: p.amount, refunded: p.refunded ?? 0, year: p.year ?? null, payment_id: p.paymentId ?? null, at: p.at };
    const r = await db('pay_purchases', { method: 'POST', body: JSON.stringify(body) });
    if (!r.ok) throw new Error(`db ${r.status}`);
  },
  async movePurchases(from, to) {
    await db(`pay_purchases?code=eq.${q(from)}`, { method: 'PATCH', body: JSON.stringify({ code: to }) });
  },
  async addRefund(code, paymentId, amount) {
    const cur = await rows<{ id: number; refunded: number }>(`pay_purchases?code=eq.${q(code)}&payment_id=eq.${q(paymentId)}&select=id,refunded`);
    for (const r of cur) await db(`pay_purchases?id=eq.${r.id}`, { method: 'PATCH', body: JSON.stringify({ refunded: r.refunded + amount }) });
  },
  async saveOrder(o) {
    const r = await db('pay_orders', { method: 'POST', body: JSON.stringify({ payment_id: o.paymentId, code: o.code, purchase: o.purchase, season: o.season, status: o.status }) });
    if (!r.ok) throw new Error(`db ${r.status}`);
  },
  async getOrder(paymentId) {
    const r = (
      await rows<{ payment_id: string; code: string; purchase: Order['purchase']; season: Order['season']; status: Order['status']; created_at: string }>(`pay_orders?payment_id=eq.${q(paymentId)}`)
    )[0];
    return r ? { paymentId: r.payment_id, code: r.code, purchase: r.purchase, season: r.season, status: r.status, at: Date.parse(r.created_at) } : null;
  },
  async claimOrder(paymentId) {
    const r = await db(`pay_orders?payment_id=eq.${q(paymentId)}&status=eq.ready`, { method: 'PATCH', body: JSON.stringify({ status: 'confirming' }) }, 'return=representation');
    return r.ok && ((await r.json()) as unknown[]).length === 1;
  },
  async setOrderStatus(paymentId, status) {
    await db(`pay_orders?payment_id=eq.${q(paymentId)}`, { method: 'PATCH', body: JSON.stringify({ status }) });
  },
};

const PORTONE = 'https://api.portone.io';
const portone = (path: string, init: RequestInit = {}) =>
  fetch(`${PORTONE}${path}`, { ...init, headers: { Authorization: `PortOne ${env('PORTONE_API_SECRET')}`, 'Content-Type': 'application/json', ...(init.headers ?? {}) } });

const gateway: Gateway = {
  async getPayment(paymentId) {
    const r = await portone(`/payments/${q(paymentId)}`);
    if (!r.ok) return { status: `HTTP_${r.status}`, total: -1, currency: '', why: (await r.text().catch(() => '')).slice(0, 200) };
    const p = (await r.json()) as { status?: string; amount?: { total?: number }; currency?: string; failure?: { reason?: string; pgCode?: string; pgMessage?: string } };
    const f = p.failure;
    const why = f ? [f.pgCode, f.pgMessage, f.reason].filter(Boolean).join(' ').slice(0, 200) : '';
    return { status: p.status ?? '', total: p.amount?.total ?? -1, currency: p.currency ?? '', ...(why ? { why } : {}) };
  },
  async cancel(paymentId, amount, reason) {
    const r = await portone(`/payments/${q(paymentId)}/cancel`, { method: 'POST', body: JSON.stringify({ reason, ...(amount ? { amount } : {}) }) });
    if (!r.ok) throw new Error(`cancel ${r.status}`);
  },
  async approve(paymentId, token, amount) {
    const r = await portone(`/payments/${q(paymentId)}/confirm`, { method: 'POST', body: JSON.stringify({ paymentToken: token, totalAmount: amount, currency: 'KRW' }) });
    if (!r.ok) throw new Error(`approve ${r.status} ${(await r.text().catch(() => '')).slice(0, 160)}`);
  },
};

function cors(req: Request): Record<string, string> {
  const o = req.headers.get('Origin') ?? '';
  // 시험용: 같은 와이파이의 휴대폰에서 개발 서버(컴퓨터 주소:5173)로 들어온 것도 받는다. 주소를 아는 것만으로는 아무것도 못 한다(결제는 포트원에 다시 확인).
  const lan = /^http:\/\/(192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}):5173$/.test(o);
  return ORIGINS.includes(o) || lan ? { 'Access-Control-Allow-Origin': o, 'Access-Control-Allow-Headers': 'content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS', Vary: 'Origin' } : {};
}

Deno.serve(async (req) => {
  const head = cors(req);
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: head });
  if (req.method !== 'POST') return new Response('', { status: 405 });
  const route = new URL(req.url).pathname.split('/').pop();
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const now = Date.now();
  try {
    let out: Record<string, unknown>;
    if (route === 'account') out = await createAccount(store);
    else if (route === 'purchases') out = await listPurchases(store, body.code);
    else if (route === 'prepare') out = await prepare(store, body, now);
    else if (route === 'confirm') out = await confirm(store, gateway, body.paymentId, now, body.paymentToken);
    else if (route === 'redeem') out = await redeem(store, gateway, body);
    else if (route === 'webhook') {
      const data = body.data as { paymentId?: unknown } | undefined;
      out = data?.paymentId ? await confirm(store, gateway, data.paymentId, now) : { ok: true };
    } else return new Response('', { status: 404, headers: head });
    return new Response(JSON.stringify(out), { headers: { ...head, 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error(route, e instanceof Error ? e.message : e);
    return new Response(JSON.stringify({ ok: false, reason: 'server' }), { status: 500, headers: { ...head, 'Content-Type': 'application/json' } });
  }
});
