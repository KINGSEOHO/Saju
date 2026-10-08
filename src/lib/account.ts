/**
 * 계정과 구매 기록.
 * 계정에는 '로그인 종류(카카오·네이버) + 회원번호'와 구매 기록(무엇을·어느 사주의 것인지·얼마에)만 남긴다.
 * 이름·생년월일·출생 시각은 저장하지 않는다.
 *
 * 지금은 시안용 '이 기기에서 흉내 내는 계정'(demoApi)만 있다. Firebase를 연결하면 같은 모양(AccountApi)으로
 * 카카오·네이버 로그인 → Firebase 로그인, 구매 기록 → Firestore(쓰기는 서버만)로 바꾼다.
 */
import { useEffect, useState } from 'react';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { PAYWALL_DEMO } from '../config/plans.ts';
import { SUPABASE_KEY, SUPABASE_URL } from '../config/backend.ts';
import type { Purchase, PurchaseKind } from './entitlements.ts';
import type { ConcernId } from '../report/concernList.ts';

export type Provider = 'kakao' | 'naver';
export const PROVIDER_NAME: Record<Provider, string> = { kakao: '카카오', naver: '네이버' };

export interface Account {
  provider: Provider;
  /** 회원번호 */
  id: string;
}

export interface AccountApi {
  current(): Promise<Account | null>;
  signIn(p: Provider): Promise<Account>;
  signOut(): Promise<void>;
  purchases(): Promise<Purchase[]>;
  record(p: Purchase): Promise<void>;
}

// ---------------------------------------------------------------------------
// 시안용 — 이 기기 안에서만 계정과 기록을 흉내 낸다
// ---------------------------------------------------------------------------
const SESSION = 'mg_demo_account';
const STORE = 'mg_demo_purchases';
const read = <T>(k: string, d: T): T => {
  try {
    const v = localStorage.getItem(k);
    return v ? (JSON.parse(v) as T) : d;
  } catch {
    return d;
  }
};
const write = (k: string, v: unknown) => {
  try {
    if (v === null) localStorage.removeItem(k);
    else localStorage.setItem(k, JSON.stringify(v));
  } catch {
    /* 저장이 안 되는 환경에서는 이번 화면에서만 */
  }
};
const keyOf = (a: Account) => `${a.provider}:${a.id}`;

const demoCurrent = () => read<Account | null>(SESSION, null);
const demoApi: AccountApi = {
  current: async () => demoCurrent(),
  async signIn(p) {
    const a: Account = { provider: p, id: p === 'kakao' ? '3141592653' : 'nv_2718281828' };
    write(SESSION, a);
    return a;
  },
  async signOut() {
    write(SESSION, null);
  },
  async purchases() {
    const a = demoCurrent();
    return a ? (read<Record<string, Purchase[]>>(STORE, {})[keyOf(a)] ?? []) : [];
  },
  async record(p) {
    const a = demoCurrent();
    if (!a) throw new Error('로그인이 필요해요');
    const all = read<Record<string, Purchase[]>>(STORE, {});
    write(STORE, { ...all, [keyOf(a)]: [...(all[keyOf(a)] ?? []), p] });
  },
};

/** 시안 전용: 이 계정의 구매 기록을 지운다 */
export function resetDemoPurchases() {
  const a = demoCurrent();
  if (!a) return;
  const all = read<Record<string, Purchase[]>>(STORE, {});
  delete all[keyOf(a)];
  write(STORE, all);
  window.dispatchEvent(new Event('mg-account'));
}

// ---------------------------------------------------------------------------
// Supabase — 카카오 로그인 + purchases 표 (docs/SETUP-SUPABASE.md)
// 표에는 계정(user_id) · 항목 · 어느 사주의 것인지(암호값) · 금액 · 시각만 있다.
// 무료 고르기만 사이트에서 직접 기록하고, 돈이 드는 기록은 결제 확인 뒤 서버만 쓴다.
// ---------------------------------------------------------------------------
let client: SupabaseClient | null = null;
function sb(): SupabaseClient {
  // 사이트는 # 주소를 쓰므로, 로그인에서 돌아올 때 ?code= 로 받는 PKCE 방식을 쓴다
  client ??= createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { flowType: 'pkce', detectSessionInUrl: true, persistSession: true } });
  return client;
}
const BACK = 'mg_login_back';

const supabaseApi: AccountApi = {
  async current() {
    const { data } = await sb().auth.getSession();
    const u = data.session?.user;
    if (!u) return null;
    const provider = (u.app_metadata.provider as Provider | undefined) ?? 'kakao';
    return { provider, id: u.identities?.find((i) => i.provider === provider)?.id ?? u.id };
  },
  async signIn(p) {
    if (p !== 'kakao') throw new Error('네이버 로그인은 준비 중이에요');
    try {
      sessionStorage.setItem(BACK, window.location.hash);
    } catch {
      /* 돌아온 뒤 첫 화면으로 */
    }
    const { error } = await sb().auth.signInWithOAuth({ provider: 'kakao', options: { redirectTo: window.location.origin + window.location.pathname } });
    if (error) throw error;
    // 카카오 화면으로 넘어가므로 여기서 끝나지 않는다
    return new Promise<Account>(() => {});
  },
  async signOut() {
    await sb().auth.signOut();
  },
  async purchases() {
    const { data, error } = await sb().from('purchases').select('kind,item,target,amount,created_at').order('created_at');
    if (error) throw error;
    return (data ?? []).map((r) => ({ kind: r.kind as PurchaseKind, item: r.item as ConcernId, target: r.target as string, amount: r.amount as number, at: Date.parse(r.created_at as string) }));
  },
  async record(p) {
    if (p.amount > 0) throw new Error('결제는 준비 중이에요');
    const { error } = await sb().from('purchases').insert({ kind: p.kind, item: p.item, target: p.target, amount: 0 });
    if (error) throw error;
  },
};

/** 카카오에서 돌아오면 로그인 전에 보던 화면으로 되돌린다 */
export async function finishLogin() {
  if (PAYWALL_DEMO || !new URLSearchParams(window.location.search).has('code')) return;
  await sb().auth.getSession();
  let back = '';
  try {
    back = sessionStorage.getItem(BACK) ?? '';
    sessionStorage.removeItem(BACK);
  } catch {
    /* noop */
  }
  window.history.replaceState(null, '', window.location.pathname + back);
  window.dispatchEvent(new Event('mg-account'));
  window.dispatchEvent(new HashChangeEvent('hashchange'));
}

/** 미리보기(시안)는 흉내 계정, 실제 사이트는 Supabase */
export const accountApi: AccountApi = PAYWALL_DEMO ? demoApi : supabaseApi;

/** 로그인 상태와 구매 기록 — 여러 칸에서 써도 함께 바뀐다 */
export function useAccount() {
  const [account, setAccount] = useState<Account | null>(null);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  useEffect(() => {
    let alive = true;
    const sync = async () => {
      const a = await accountApi.current().catch(() => null);
      const list = a ? await accountApi.purchases().catch(() => []) : [];
      if (alive) {
        setAccount(a);
        setPurchases(list);
      }
    };
    void sync();
    window.addEventListener('mg-account', sync);
    return () => {
      alive = false;
      window.removeEventListener('mg-account', sync);
    };
  }, []);
  const changed = () => window.dispatchEvent(new Event('mg-account'));
  return {
    account,
    purchases,
    signIn: async (p: Provider) => {
      await accountApi.signIn(p);
      changed();
    },
    signOut: async () => {
      await accountApi.signOut();
      changed();
    },
    record: async (p: Purchase) => {
      await accountApi.record(p);
      changed();
    },
  };
}
