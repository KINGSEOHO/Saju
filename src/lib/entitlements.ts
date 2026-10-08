/**
 * 무엇을 열었는지(이용권) — 계정에 남긴 구매 기록에서 계산한다.
 *  - 고민 리포트(5개): 내 사주마다 하나는 무료로 고르고, 하나 더 열 때마다 990원, 나머지 전부는 합계 2,490원.
 *    하나씩 사도 지금까지 낸 금액과의 차액만 받고, 합계가 '전부 열기'를 넘지 않게 한다.
 *  - 궁합·재회 상세: 첫 상대는 무료, 그다음부터 한 명마다 990원.
 * 구매 기록에는 '무엇을(항목) · 어느 사주의 것인지(생년월일로 만든 짧은 암호값) · 얼마에'만 남긴다.
 */
import type { BirthInput } from '../engine/index.ts';
import { CONCERN_PRICING, PARTNER_PRICE } from '../config/plans.ts';
import { CONCERNS, type ConcernId } from '../report/concernList.ts';

export type PurchaseKind = 'free' | 'one' | 'all' | 'partnerFree' | 'partner';

/** 계정에 남기는 구매 기록 한 줄 */
export interface Purchase {
  kind: PurchaseKind;
  /** 무엇을 — 고민(career…) 또는 궁합·재회(match) */
  item: ConcernId;
  /** 어느 사주의 것인지 (궁합은 '내 사주>상대') */
  target: string;
  /** 낸 돈 (원) */
  amount: number;
  at: number;
}

export interface Ent {
  /** 무료로 고른 고민 (첫째) */
  free: ConcernId | null;
  /** 무료로 연 고민 전부 — 두 기기의 기록을 합치면 둘 이상일 수 있다 */
  frees: ConcernId[];
  /** 돈 내고 하나씩 연 고민 */
  paid: ConcernId[];
  /** 나머지 전부 열기 */
  all: boolean;
  /** 지금까지 낸 금액 (고민 리포트) */
  spent: number;
  /** 무료로 연 상대 (첫째) */
  freePartner: string | null;
  /** 무료로 연 상대 전부 */
  freePartners: string[];
  /** 돈 내고 연 상대 */
  partners: string[];
}

export const EMPTY_ENT: Ent = { free: null, frees: [], paid: [], all: false, spent: 0, freePartner: null, freePartners: [], partners: [] };

/** 돈을 받는 고민 (궁합·재회는 상대마다 따로라 빠진다) */
export const PAID_CONCERNS: ConcernId[] = CONCERNS.filter((c) => c.id !== 'match').map((c) => c.id);

/** FNV-1a — 생년월일을 그대로 남기지 않으려는 짧은 구분값 */
function hash(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}
const birthOf = (i: BirthInput) => [i.calendar, i.year, i.month, i.day, i.leapMonth ? 1 : 0, i.hour ?? '-', i.minute ?? '-', i.gender, i.longitude.toFixed(2)].join('|');
export const sajuKey = (i: BirthInput) => hash(birthOf(i));
export const partnerKey = (i: BirthInput) => hash(`p|${birthOf(i)}`);
const pairOf = (saju: string, pk: string) => `${saju}>${pk}`;

/**
 * 구매 기록 → 이 사주의 이용권.
 * 두 기기의 기록을 합친 경우(구매 코드 합치기)에도 이미 연 것은 하나도 닫히지 않게 모두 더하고,
 * 고민에 낸 돈이 '전부 열기' 가격에 이르면 전부 연다 — 어떤 순서로 사도 2,490원보다 더 내지 않게.
 */
export function entOf(list: Purchase[], saju: string, pricing = CONCERN_PRICING): Ent {
  const e: Ent = { ...EMPTY_ENT, frees: [], paid: [], freePartners: [], partners: [] };
  for (const p of list) {
    if (p.item === 'match') {
      const [s, pk] = p.target.split('>');
      if (s !== saju) continue;
      if (p.kind === 'partnerFree') {
        e.freePartner ??= pk;
        e.freePartners.push(pk);
      } else e.partners.push(pk);
      continue;
    }
    if (p.target !== saju) continue;
    if (p.kind === 'free') {
      e.free ??= p.item;
      e.frees.push(p.item);
    }
    if (p.kind === 'one') e.paid.push(p.item);
    if (p.kind === 'all') e.all = true;
    e.spent += p.amount;
  }
  if (e.spent >= pricing.all) e.all = true;
  return e;
}

export const isOpen = (e: Ent, id: ConcernId) => e.all || e.frees.includes(id) || e.paid.includes(id);
export const partnerOpen = (e: Ent, pk: string) => e.freePartners.includes(pk) || e.partners.includes(pk);

export interface Offer {
  kind: PurchaseKind;
  /** 이번에 낼 돈 */
  cost: number;
  label: string;
  note?: string;
}

const won = (n: number) => `${n.toLocaleString('ko-KR')}원`;

/** 잠긴 고민 하나에서 보여 줄 선택지 — 첫째가 주 버튼 */
export function concernOffers(e: Ent, id: ConcernId, pricing = CONCERN_PRICING): Offer[] {
  if (isOpen(e, id)) return [];
  const locked = PAID_CONCERNS.filter((c) => !isOpen(e, c)).length;
  if (!e.free) {
    return [
      { kind: 'free', cost: 0, label: '이 고민 무료로 열기', note: '무료로는 고민 하나만 열 수 있어요.' },
      { kind: 'all', cost: pricing.all, label: `${won(pricing.all)}에 고민 전부 열기`, note: `고민 ${PAID_CONCERNS.length}개를 모두 열어요.` },
    ];
  }
  const allCost = pricing.all - e.spent;
  const out: Offer[] = [];
  // 하나 더 — 합계가 '전부 열기'보다 싸고, 남은 고민이 둘 이상일 때만
  if (locked > 1 && e.spent + pricing.single < pricing.all) {
    out.push({
      kind: 'one',
      cost: pricing.single,
      label: e.spent ? `${won(pricing.single)} 더 내고 이 고민 열기` : `${won(pricing.single)}에 이 고민 열기`,
      note: e.spent ? `지금까지 ${won(e.spent)} · 열면 합계 ${won(e.spent + pricing.single)}` : undefined,
    });
  }
  out.push({
    kind: 'all',
    cost: allCost,
    label: locked === 1 ? (e.spent ? `${won(allCost)} 더 내고 마지막 고민 열기` : `${won(allCost)}에 이 고민 열기`) : e.spent ? `${won(allCost)} 더 내고 나머지 전부 열기` : `${won(allCost)}에 나머지 전부 열기`,
    note: locked === 1 ? `열면 합계 ${won(pricing.all)}, 고민 전부 열려요.` : `남은 고민 ${locked}개를 모두 열어요${e.spent ? ` · 합계 ${won(pricing.all)}` : ''}.`,
  });
  return out;
}

export function partnerOffers(e: Ent, pk: string): Offer[] {
  if (partnerOpen(e, pk)) return [];
  if (!e.freePartner) return [{ kind: 'partnerFree', cost: 0, label: '이 사람과의 상세 리포트 무료로 열기', note: '무료로는 상대 한 명만 열 수 있어요.' }];
  return [{ kind: 'partner', cost: PARTNER_PRICE, label: `${won(PARTNER_PRICE)}에 이 사람과의 상세 리포트 열기`, note: '첫 상대는 무료였고, 그다음부터 한 명마다 990원이에요.' }];
}

/** 고른 선택지 → 계정에 남길 구매 기록 */
export function purchaseOf(o: Offer, saju: string, id: ConcernId | null, pk?: string): Purchase {
  const at = Date.now();
  if (o.kind === 'partner' || o.kind === 'partnerFree') return { kind: o.kind, item: 'match', target: pairOf(saju, pk!), amount: o.cost, at };
  return { kind: o.kind, item: id!, target: saju, amount: o.cost, at };
}

/** 구매 내역에 보여 줄 이름 */
export function purchaseLabel(p: Purchase): string {
  const title = CONCERNS.find((c) => c.id === p.item)?.title ?? p.item;
  switch (p.kind) {
    case 'free':
      return `${title} 상세 (무료로 고름)`;
    case 'one':
      return `${title} 상세`;
    case 'all':
      return p.amount >= CONCERN_PRICING.all ? '고민 리포트 전부' : '나머지 고민 전부';
    case 'partnerFree':
      return '궁합·재회 상세 · 상대 1명 (무료)';
    case 'partner':
      return '궁합·재회 상세 · 상대 1명';
  }
}
