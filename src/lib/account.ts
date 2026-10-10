/**
 * 구매 기록 — 로그인 없이 '보이지 않는 계정 + 구매 코드'로 관리한다.
 *  - 사이트에 처음 들어오면 이 기기에 보이지 않는 계정이 하나 생긴다 (손님은 아무것도 누르지 않는다).
 *  - 산 기록은 그 계정에 붙고, 계정마다 구매 코드(MG-XXXX-XXXX)가 하나 있다.
 *  - 다른 휴대폰·카카오톡 안 브라우저에서는 구매 코드를 넣으면 같은 계정의 기록이 그대로 열린다.
 *  - 코드를 넣은 기기에서 따로 산 것이 있으면 버리지 않고 넣은 코드 쪽으로 합친다. 예전 코드도 계속
 *    합쳐진 코드로 이어진다(별칭). 그래서 어떤 순서로 코드를 넣어도 산 것이 사라지지 않는다.
 * 기록에는 '무엇을 · 어느 사람의 것인지(암호값) · 얼마에 · 언제'만 남는다. 이름·생년월일은 저장하지 않는다.
 *
 * 중복 결제 막기: 결제는 pay로만 한다. 서버가 계정의 최신 기록으로 다시 계산해(checkPurchase) 이미 열린 것이면
 * 결제하지 않고, 값이 바뀌었으면 다시 고르게 한다. 코드를 합칠 때 겹쳐 낸 돈(overpaid)은 환불한다.
 *
 * 지금은 시안용 demoApi(이 기기 안에서 서버를 흉내)만 있다. 실제로는 Supabase 익명 계정 + 결제 확인
 * 서버(Edge Function)가 같은 모양(AccountApi)으로 들어온다. 나중에 카카오 로그인을 붙여도 같은 계정에 이어진다.
 */
import { useEffect, useState } from 'react';
import { checkPurchase, overpaid, type Purchase, type SeasonKey } from './entitlements.ts';

export interface Account {
  /** 보이지 않는 계정 번호 */
  id: string;
  /** 다른 기기에서 넣는 구매 코드 */
  code: string;
}

export interface RedeemResult {
  ok: boolean;
  /** 이 기기에서 따로 산 것을 합친 건수 */
  merged: number;
  /** 앞으로 쓸 구매 코드 */
  code?: string;
  /** 합쳐 보니 겹쳐 낸 돈 — 환불한다 (원) */
  refund?: number;
}

/** 결제 결과 — 성공이면 구매 코드, 아니면 결제하지 않은 까닭 */
export type PayResult = { ok: true; code: string } | { ok: false; reason: 'owned' | 'price' };

export interface AccountApi {
  current(): Promise<Account>;
  purchases(): Promise<Purchase[]>;
  /**
   * 결제 — 서버가 계정의 최신 기록으로 다시 확인한 뒤에만 남긴다. 이미 열린 것('owned')이면 승인하지 않아 돈이 빠지지 않고,
   * 그사이 다른 화면에서 산 것이 있어 값이 바뀌었으면('price') 다시 고르게 한다. season: 지금 시즌 (실제 서버는 서버 시각으로 정한다)
   */
  pay(p: Purchase, season: SeasonKey): Promise<PayResult>;
  /**
   * 다른 기기의 구매 코드로 그 계정의 기록을 불러온다. 이 기기에서 따로 산 것은 그 계정으로 합친다.
   * merged = 합쳐 넣은 기록 수 (실제 서버에서는 결제 확인 서버가 한 번에 옮긴다)
   * refund = 합쳐 보니 겹쳐 낸 돈 (실제 서버는 이만큼 결제를 부분 취소한다)
   */
  redeem(code: string): Promise<RedeemResult>;
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
/** 합쳐진 예전 코드 → 새 코드 */
const ALIAS = 'mg_demo_alias';
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

/** 합쳐진 코드를 따라가 지금 쓰는 코드를 찾는다 */
function resolve(code: string): string {
  const alias = read<Record<string, string>>(ALIAS, {});
  const seen = new Set<string>();
  while (alias[code] && !seen.has(code)) {
    seen.add(code);
    code = alias[code];
  }
  return code;
}
const mine = () => resolve(device().code);

export const demoApi: AccountApi & { record(p: Purchase): Promise<void> } = {
  current: async () => ({ ...device(), code: mine() }),
  async purchases() {
    return read<Record<string, Purchase[]>>(STORE, {})[mine()] ?? [];
  },
  /** 확인 없이 바로 남긴다 — 시안 시험용 (실제 결제는 pay) */
  async record(p) {
    const code = mine();
    const all = read<Record<string, Purchase[]>>(STORE, {});
    write(STORE, { ...all, [code]: [...(all[code] ?? []), p] });
  },
  async pay(p, season) {
    const code = mine();
    // 화면이 아니라 저장된 최신 기록으로 다시 본다 (다른 탭에서 먼저 산 것까지)
    const all = read<Record<string, Purchase[]>>(STORE, {});
    const check = checkPurchase(all[code] ?? [], p, season);
    if (check !== 'ok') return { ok: false, reason: check };
    write(STORE, { ...all, [code]: [...(all[code] ?? []), p] });
    return { ok: true, code };
  },
  async redeem(input) {
    const norm = normalizeCode(input);
    if (!norm) return { ok: false, merged: 0 };
    const target = resolve(norm);
    const all = read<Record<string, Purchase[]>>(STORE, {});
    if (!all[target]) return { ok: false, merged: 0 };
    const own = mine();
    if (own === target) return { ok: true, merged: 0, code: target };
    // 이 기기에서 따로 산 것은 버리지 않고 넣은 코드 쪽으로 합친다
    const mineList = all[own] ?? [];
    let refund = 0;
    if (mineList.length) {
      // 합쳐 보니 겹쳐 낸 돈은 돌려준다 (이미 연 것을 또 샀거나 묶음 가격을 넘겨 낸 만큼)
      const joined = [...all[target], ...mineList];
      const back = overpaid(joined);
      refund = back.reduce((a, b) => a + b, 0);
      const next = { ...all, [target]: joined.map((p, i) => (back[i] ? { ...p, refunded: (p.refunded ?? 0) + back[i] } : p)) };
      delete next[own];
      write(STORE, next);
      write(ALIAS, { ...read<Record<string, string>>(ALIAS, {}), [own]: target });
    }
    write(DEVICE, { ...device(), code: target });
    return { ok: true, merged: mineList.length, code: target, ...(refund ? { refund } : {}) };
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
    // 다른 탭에서 사거나(시안) 다른 화면에 갔다 돌아오면 최신 기록으로 다시 맞춘다 — 옛 화면에서 또 결제하지 않게
    const onShow = () => {
      if (document.visibilityState === 'visible') void sync();
    };
    void sync();
    window.addEventListener('mg-account', sync);
    window.addEventListener('storage', sync);
    document.addEventListener('visibilitychange', onShow);
    return () => {
      alive = false;
      window.removeEventListener('mg-account', sync);
      window.removeEventListener('storage', sync);
      document.removeEventListener('visibilitychange', onShow);
    };
  }, []);
  const changed = () => window.dispatchEvent(new Event('mg-account'));
  return {
    account,
    purchases,
    /** 결제 — 이미 열렸거나 값이 바뀌었으면 결제하지 않고 까닭을 돌려준다. 어느 쪽이든 기록을 다시 읽는다 */
    pay: async (p: Purchase, season: SeasonKey) => {
      const r = await accountApi.pay(p, season);
      changed();
      return r;
    },
    redeem: async (code: string) => {
      const r = await accountApi.redeem(code);
      if (r.ok) changed();
      return r;
    },
  };
}
