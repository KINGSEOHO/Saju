/**
 * 결제할 때 넣는 구매자 정보(이름·휴대폰 번호·이메일·결제수단)를 이 기기에만 기억한다 — 다음 결제 때 다시 넣지 않게.
 * 손님이 '이 기기에 기억하기'를 골랐을 때만 남기고, 서버로는 보내지 않는다. 처리방침의 '이 기기의 기록 모두 지우기'로 함께 지워진다.
 */
import type { Buyer } from './account.ts';
import { STORAGE } from './storageKeys.ts';

export function loadBuyer(): Buyer | null {
  try {
    const b = JSON.parse(localStorage.getItem(STORAGE.buyer) ?? 'null') as Partial<Buyer> | null;
    return b && typeof b.name === 'string' && typeof b.phone === 'string' && typeof b.email === 'string' ? (b as Buyer) : null;
  } catch {
    return null;
  }
}

/** keep가 거짓이면 기억해 둔 것을 지운다 */
export function rememberBuyer(b: Buyer, keep: boolean): void {
  try {
    if (keep) localStorage.setItem(STORAGE.buyer, JSON.stringify(b));
    else localStorage.removeItem(STORAGE.buyer);
  } catch {
    /* 저장이 막힌 브라우저에서는 기억하지 않는다 */
  }
}
