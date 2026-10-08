/**
 * 계정과 구매 기록.
 * 계정에는 '로그인 종류(카카오·네이버) + 회원번호'와 구매 기록(무엇을·어느 사주의 것인지·얼마에)만 남긴다.
 * 이름·생년월일·출생 시각은 저장하지 않는다.
 *
 * 지금은 시안용 '이 기기에서 흉내 내는 계정'(demoApi)만 있다. Firebase를 연결하면 같은 모양(AccountApi)으로
 * 카카오·네이버 로그인 → Firebase 로그인, 구매 기록 → Firestore(쓰기는 서버만)로 바꾼다.
 */
import { useEffect, useState } from 'react';
import type { Purchase } from './entitlements.ts';

export type Provider = 'kakao' | 'naver';
export const PROVIDER_NAME: Record<Provider, string> = { kakao: '카카오', naver: '네이버' };

export interface Account {
  provider: Provider;
  /** 회원번호 */
  id: string;
}

export interface AccountApi {
  current(): Account | null;
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

const demoApi: AccountApi = {
  current: () => read<Account | null>(SESSION, null),
  async signIn(p) {
    const a: Account = { provider: p, id: p === 'kakao' ? '3141592653' : 'nv_2718281828' };
    write(SESSION, a);
    return a;
  },
  async signOut() {
    write(SESSION, null);
  },
  async purchases() {
    const a = demoApi.current();
    return a ? (read<Record<string, Purchase[]>>(STORE, {})[keyOf(a)] ?? []) : [];
  },
  async record(p) {
    const a = demoApi.current();
    if (!a) throw new Error('로그인이 필요해요');
    const all = read<Record<string, Purchase[]>>(STORE, {});
    write(STORE, { ...all, [keyOf(a)]: [...(all[keyOf(a)] ?? []), p] });
  },
};

/** 시안 전용: 이 계정의 구매 기록을 지운다 */
export function resetDemoPurchases() {
  const a = demoApi.current();
  if (!a) return;
  const all = read<Record<string, Purchase[]>>(STORE, {});
  delete all[keyOf(a)];
  write(STORE, all);
  window.dispatchEvent(new Event('mg-account'));
}

export const accountApi: AccountApi = demoApi;

/** 로그인 상태와 구매 기록 — 여러 칸에서 써도 함께 바뀐다 */
export function useAccount() {
  const [account, setAccount] = useState<Account | null>(() => accountApi.current());
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  useEffect(() => {
    let alive = true;
    const sync = async () => {
      const a = accountApi.current();
      const list = a ? await accountApi.purchases() : [];
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
