/**
 * 구매 기록 — 로그인 없이 '보이지 않는 계정 + 구매 코드'로 관리한다.
 *  - 사이트에 처음 들어오면 이 기기에 보이지 않는 계정이 하나 생긴다 (손님은 아무것도 누르지 않는다).
 *  - 산 기록은 그 계정에 붙고, 계정마다 구매 코드(MG-XXXX-XXXX)가 하나 있다.
 *  - 다른 휴대폰·카카오톡 안 브라우저에서는 구매 코드를 넣으면 같은 계정의 기록이 그대로 열린다.
 * 기록에는 '무엇을 · 어느 사주의 것인지(암호값) · 얼마에 · 언제'만 남는다. 이름·생년월일은 저장하지 않는다.
 *
 * 지금은 시안용 demoApi(이 기기 안에서 서버를 흉내)만 있다. 실제로는 Supabase 익명 계정 + 결제 확인
 * 서버(Edge Function)가 같은 모양(AccountApi)으로 들어온다. 나중에 카카오 로그인을 붙여도 같은 계정에 이어진다.
 */
import { useEffect, useState } from 'react';
import type { Purchase } from './entitlements.ts';

export interface Account {
  /** 보이지 않는 계정 번호 */
  id: string;
  /** 다른 기기에서 넣는 구매 코드 */
  code: string;
}

export interface AccountApi {
  current(): Promise<Account>;
  purchases(): Promise<Purchase[]>;
  record(p: Purchase): Promise<void>;
  /** 다른 기기의 구매 코드로 그 계정의 기록을 불러온다 */
  redeem(code: string): Promise<boolean>;
}

/** 헷갈리는 글자(0·O·1·I·L)는 뺀다 */
const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
export function newCode(rand: () => number = Math.random): string {
  const pick = (n: number) => Array.from({ length: n }, () => ALPHABET[Math.floor(rand() * ALPHABET.length)]).join('');
  return `MG-${pick(4)}-${pick(4)}`;
}
/** 손님이 넣은 코드를 MG-XXXX-XXXX 꼴로 맞춘다 (소문자·공백·하이픈 빠짐 허용) */
export function normalizeCode(input: string): string | null {
  const s = input.toUpperCase().replace(/[^0-9A-Z]/g, '').replace(/^MG/, '');
  if (s.length !== 8 || [...s].some((c) => !ALPHABET.includes(c))) return null;
  return `MG-${s.slice(0, 4)}-${s.slice(4)}`;
}

// ---------------------------------------------------------------------------
// 시안용 — 이 기기 안에서 서버를 흉내 낸다 (STORE가 서버의 구매 기록 표 역할)
// ---------------------------------------------------------------------------
const DEVICE = 'mg_demo_device';
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
    localStorage.setItem(k, JSON.stringify(v));
  } catch {
    /* 저장이 안 되는 환경에서는 이번 화면에서만 */
  }
};
function device(): Account {
  let a = read<Account | null>(DEVICE, null);
  if (!a) {
    a = { id: Math.random().toString(36).slice(2, 10), code: newCode() };
    write(DEVICE, a);
  }
  return a;
}

const demoApi: AccountApi = {
  current: async () => device(),
  async purchases() {
    return read<Record<string, Purchase[]>>(STORE, {})[device().code] ?? [];
  },
  async record(p) {
    const { code } = device();
    const all = read<Record<string, Purchase[]>>(STORE, {});
    write(STORE, { ...all, [code]: [...(all[code] ?? []), p] });
  },
  async redeem(input) {
    const code = normalizeCode(input);
    if (!code || !read<Record<string, Purchase[]>>(STORE, {})[code]) return false;
    write(DEVICE, { ...device(), code });
    return true;
  },
};

/** 시안 전용: 이 기기의 기록을 지우고 새 계정으로 시작 */
export function resetDemo() {
  try {
    localStorage.removeItem(DEVICE);
  } catch {
    /* noop */
  }
  window.dispatchEvent(new Event('mg-account'));
}

export const accountApi: AccountApi = demoApi;

/** 계정·구매 기록 — 여러 칸에서 써도 함께 바뀐다 */
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
    record: async (p: Purchase) => {
      await accountApi.record(p);
      changed();
    },
    redeem: async (code: string) => {
      const ok = await accountApi.redeem(code);
      if (ok) changed();
      return ok;
    },
  };
}
