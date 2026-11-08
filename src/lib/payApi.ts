/**
 * 실제 결제 — 포트원 결제창 + 결제 확인 함수(server/pay/supabase.ts). lib/account.ts의 AccountApi와 같은 모양.
 *
 * 순서: 서버가 값을 다시 계산해 주문을 만든다(prepare) → 포트원 결제창 → 서버가 포트원에 직접 물어 확인하고 기록한다(confirm).
 * 휴대폰에서는 결제창이 다른 주소로 넘어갔다가 돌아온다. 그때는 resumePayment()가 돌아온 주소에서 확인을 마저 한다.
 *
 * 서버로 보내는 것: 구매 코드 · 산 항목 · 사주 구분값(양력 생일로 만든 짧은 암호값) · 금액 · 시즌. 이름·생년월일은 보내지 않는다.
 */
import { PAY_API, PAY_LIVE, PAY_PC_REDIRECT, PORTONE_CHANNEL_KEY, PORTONE_STORE_ID } from '../config/backend.ts';
import type { AccountApi, Buyer, PayResult, RedeemResult } from './account.ts';
import type { Purchase } from './entitlements.ts';
import { STORAGE } from './storageKeys.ts';

type Json = Record<string, unknown>;

async function call(route: string, body: Json = {}): Promise<Json> {
  const r = await fetch(`${PAY_API}/${route}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const j = (await r.json().catch(() => ({ ok: false }))) as Json;
  if (!r.ok && !('reason' in j)) throw new Error(`pay ${r.status}`);
  return j;
}

const readCode = (): string | null => {
  try {
    return (JSON.parse(localStorage.getItem(STORAGE.account) ?? 'null') as { code?: string } | null)?.code ?? null;
  } catch {
    return null;
  }
};
const writeCode = (code: string) => {
  try {
    localStorage.setItem(STORAGE.account, JSON.stringify({ code }));
  } catch {
    /* 저장이 안 되는 브라우저 — 이번 화면에서만 (구매 코드로 다시 불러올 수 있다) */
  }
};

let creating: Promise<string> | null = null;
/** 이 기기의 구매 코드 — 없으면 서버에서 새로 받는다 (여러 칸이 동시에 불러도 한 번만) */
async function myCode(): Promise<string> {
  const have = readCode();
  if (have) return have;
  creating ??= call('account').then((r) => {
    if (!r.ok || typeof r.code !== 'string') throw new Error('account');
    writeCode(r.code);
    return r.code;
  });
  try {
    return await creating;
  } finally {
    creating = null;
  }
}

interface PortOneSdk {
  requestPayment(
    req: Json,
  ): Promise<{ code?: string; message?: string; paymentId?: string; paymentToken?: string; txId?: string; transactionType?: string; pgCode?: string; pgMessage?: string } | undefined>;
}
let sdk: Promise<PortOneSdk> | null = null;
/** 포트원 결제창 스크립트 — 결제할 때만 불러온다 */
function loadSdk(): Promise<PortOneSdk> {
  sdk ??= new Promise((ok, fail) => {
    const s = document.createElement('script');
    s.src = 'https://cdn.portone.io/v2/browser-sdk.js';
    s.onload = () => ((window as unknown as { PortOne?: PortOneSdk }).PortOne ? ok((window as unknown as { PortOne: PortOneSdk }).PortOne) : fail(new Error('sdk')));
    s.onerror = () => {
      sdk = null;
      fail(new Error('sdk'));
    };
    document.head.appendChild(s);
  });
  return sdk;
}

/** 휴대폰 결제창에서 돌아올 주소 — 화면 주소(#/r?…)는 따로 적어 두었다가 되돌린다 */
const returnUrl = () => `${location.origin}${location.pathname}?pay_return=1`;

const wait = (ms: number) => new Promise((ok) => setTimeout(ok, ms));

/** 서버에 확인을 맡긴다. 결제창이 막 닫혀 포트원이 아직 '대기(READY)'라고 하면 몇 번 더 물어본다 */
async function confirmPayment(paymentId: string, sdkSaid = '', paymentToken?: string): Promise<PayResult> {
  let r: Json = {};
  for (let i = 0; i < 5; i++) {
    r = await call('confirm', { paymentId, ...(paymentToken ? { paymentToken } : {}) });
    if (r.ok && typeof r.code === 'string') return { ok: true, code: r.code };
    if (!(r.reason === 'not_paid' && (r.status === 'READY' || r.status === 'PAY_PENDING'))) break;
    await wait(2000);
  }
  const why = typeof r.why === 'string' && r.why ? ` (${r.why})` : '';
  return {
    ok: false,
    reason: r.reason === 'owned' || r.reason === 'price' ? r.reason : 'fail',
    detail: `결제 확인: ${String(r.reason)}${r.status ? ` ${String(r.status)}` : ''}${why} · 결제 번호 ${paymentId}${sdkSaid ? ` · 결제창 응답 ${sdkSaid}` : ''}`,
  };
}

export const payApi: AccountApi = {
  async current() {
    const code = await myCode();
    return { id: code, code };
  },
  async purchases() {
    const r = await call('purchases', { code: await myCode() });
    if (!r.ok) return [];
    // 다른 기기에서 코드를 합쳤으면 합쳐진 코드로 바꿔 둔다
    if (typeof r.code === 'string' && r.code !== readCode()) writeCode(r.code);
    return (r.purchases as Purchase[]) ?? [];
  },
  async pay(p, season, buyer) {
    let step = '구매 코드';
    try {
      return await payFlow(p, season, buyer, (s) => (step = s));
    } catch (e) {
      return { ok: false, reason: 'fail', detail: `${step}: ${e instanceof Error ? e.message : String(e)}` };
    }
  },
  async redeem(target): Promise<RedeemResult> {
    const r = await call('redeem', { code: readCode(), target });
    if (r.ok && typeof r.code === 'string') writeCode(r.code);
    return { ok: !!r.ok, merged: Number(r.merged ?? 0), ...(typeof r.code === 'string' ? { code: r.code } : {}), ...(r.refund ? { refund: Number(r.refund) } : {}) };
  },
};

async function payFlow(p: Purchase, season: { year: number; title: string }, buyer: Buyer | undefined, at: (s: string) => void): Promise<PayResult> {
  {
    const code = await myCode();
    at('주문 준비');
    const prep = await call('prepare', { code, purchase: p, season });
    if (!prep.ok) return { ok: false, reason: prep.reason === 'owned' ? 'owned' : prep.reason === 'price' ? 'price' : 'fail', detail: `주문 준비: ${String(prep.reason)}` };
    const paymentId = prep.paymentId as string;
    try {
      sessionStorage.setItem(STORAGE.payReturn, JSON.stringify({ paymentId, hash: location.hash }));
    } catch {
      /* 돌아온 주소에서 결제 번호로 확인한다 */
    }
    at('결제창 스크립트');
    const PortOne = await loadSdk();
    at('결제창 열기');
    const res = await PortOne.requestPayment({
      storeId: PORTONE_STORE_ID,
      channelKey: PORTONE_CHANNEL_KEY,
      paymentId,
      orderName: prep.orderName,
      totalAmount: prep.amount,
      currency: 'KRW',
      payMethod: 'CARD',
      redirectUrl: returnUrl(),
      noticeUrls: [`${PAY_API}/webhook`],
      productType: 'PRODUCT_TYPE_DIGITAL',
      ...(PAY_PC_REDIRECT ? { windowType: { pc: 'REDIRECTION', mobile: 'REDIRECTION' } } : {}),
      // 이니시스 V2는 구매자 이름·휴대폰 번호·이메일이 필수 — 결제창으로만 넘기고 우리 서버에는 보내지 않는다
      ...(buyer ? { customer: { fullName: buyer.name, phoneNumber: buyer.phone, email: buyer.email } } : {}),
    });
    // 컴퓨터에서는 여기로 돌아온다 (휴대폰은 주소가 넘어가서 resumePayment가 마저 한다)
    if (!res || res.code)
      return { ok: false, reason: res?.code === 'FAILURE_TYPE_PG' ? 'fail' : 'cancel', detail: `결제창: ${res?.code ?? '닫힘'} ${res?.pgCode ?? ''} ${res?.message ?? res?.pgMessage ?? ''}`.trim() };
    at('결제 확인');
    // 결제창이 돌려준 것을 그대로 적어 둔다 (txId가 없으면 결제창이 결과를 못 돌려준 것)
    const sdkSaid = `${res.txId ? 'tx O' : 'tx X'} · ${res.transactionType ?? '-'} · 받은 항목 ${Object.keys(res).join(',')}`;
    return confirmPayment(paymentId, sdkSaid, res.paymentToken);
  }
}

/**
 * 휴대폰 결제창에서 돌아왔을 때 — 주소의 결제 번호로 확인을 마저 하고, 결제하던 화면으로 되돌린다.
 * main.tsx가 화면을 그리기 전에 부른다. 결제 확인 서버가 없거나 돌아온 주소가 아니면 아무것도 하지 않는다.
 */
export function resumePayment(): void {
  if (!PAY_LIVE) return;
  const q = new URLSearchParams(location.search);
  if (!q.has('pay_return')) return;
  let saved: { paymentId?: string; hash?: string } = {};
  try {
    saved = JSON.parse(sessionStorage.getItem(STORAGE.payReturn) ?? '{}');
    sessionStorage.removeItem(STORAGE.payReturn);
  } catch {
    /* 저장된 화면이 없으면 첫 화면으로 */
  }
  const paymentId = q.get('paymentId') ?? saved.paymentId;
  history.replaceState(null, '', `${location.pathname}${saved.hash ?? ''}`);
  // 화면이 먼저 그려졌을 수 있어 주소가 바뀐 것을 알린다
  window.dispatchEvent(new HashChangeEvent('hashchange'));
  // code가 붙어 오면 결제를 하지 않았거나 실패한 것 — 확인할 것이 없다
  if (!paymentId) return;
  if (q.get('code')) {
    window.alert(`결제를 마치지 못했어요.\n(결제창: ${q.get('code')} ${q.get('pgCode') ?? ''} ${q.get('message') ?? q.get('pgMessage') ?? ''} · 결제 번호 ${paymentId})`);
    return;
  }
  void confirmPayment(paymentId, `돌아옴 tx ${q.get('txId') ? 'O' : 'X'}`, q.get('paymentToken') ?? undefined)
    .then((r) => {
      if (!r.ok) window.alert(`결제를 마치지 못했어요.\n(${r.detail ?? ''})`);
    })
    .catch(() => null)
    .then(() => window.dispatchEvent(new Event('mg-account')));
}
