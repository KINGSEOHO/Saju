/**
 * 무엇을 열었는지(이용권) — 내 사주 하나마다 따로 센다.
 *  - 고민 리포트: 하나는 무료로 고르고, 나머지는 CONCERN_PRICING 사다리. 하나씩 사도 차액만 받는다.
 *  - 궁합·재회 상세: 상대 한 명마다 PARTNER_PRICE.
 * 지금은 이 기기(localStorage)에만 남는다. 결제를 붙이면 로그인 계정의 결제 기록에서 읽어 오도록 바꾼다.
 * 생년월일은 그대로 저장하지 않고 짧은 해시로만 구분한다.
 */
import type { BirthInput } from '../engine/index.ts';
import { CONCERN_PRICING, PARTNER_PRICE } from '../config/plans.ts';
import { CONCERNS, type ConcernId } from '../report/concernList.ts';

export interface Ent {
  /** 무료로 고른 고민 */
  free: ConcernId | null;
  /** 돈 내고 하나씩 연 고민 */
  paid: ConcernId[];
  /** 나머지 전부 열기 */
  all: boolean;
  /** 지금까지 낸 금액 (고민 리포트) */
  spent: number;
  /** 상세를 연 상대 (해시) */
  partners: string[];
}

export const EMPTY_ENT: Ent = { free: null, paid: [], all: false, spent: 0, partners: [] };

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

const KEY = 'mg_ent_v1';
function readAll(): Record<string, Ent> {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}') as Record<string, Ent>;
  } catch {
    return {};
  }
}
export function loadEnt(key: string): Ent {
  return { ...EMPTY_ENT, ...readAll()[key] };
}
export function saveEnt(key: string, ent: Ent) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...readAll(), [key]: ent }));
  } catch {
    /* 저장이 안 되는 환경에서는 이번 화면에서만 열린다 */
  }
  window.dispatchEvent(new CustomEvent('mg-ent', { detail: key }));
}

export const isOpen = (e: Ent, id: ConcernId) => e.all || e.free === id || e.paid.includes(id);
export const partnerOpen = (e: Ent, pk: string) => e.partners.includes(pk);

export interface Offer {
  kind: 'free' | 'one' | 'all' | 'partner';
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
  const allCost = pricing.all - e.spent;
  if (!e.free) {
    return [
      { kind: 'free', cost: 0, label: '이 고민 무료로 열기', note: '무료로는 고민 하나만 열 수 있어요.' },
      { kind: 'all', cost: pricing.all, label: `${won(pricing.all)}에 고민 전부 열기`, note: `고민 ${PAID_CONCERNS.length}개를 모두 열어요.` },
    ];
  }
  const out: Offer[] = [];
  const k = e.paid.length;
  const next = pricing.tiers[k];
  if (locked === 1) {
    out.push({ kind: 'all', cost: allCost, label: e.spent ? `${won(allCost)} 더 내고 마지막 고민 열기` : `${won(allCost)}에 이 고민 열기`, note: e.spent ? `지금까지 ${won(e.spent)} · 열면 합계 ${won(pricing.all)}, 고민 전부 열려요.` : undefined });
    return out;
  }
  if (next !== undefined && next - e.spent < allCost) {
    out.push({
      kind: 'one',
      cost: next - e.spent,
      label: e.spent ? `${won(next - e.spent)} 더 내고 이 고민 열기` : `${won(next)}에 이 고민 열기`,
      note: e.spent ? `지금까지 ${won(e.spent)} · 열면 합계 ${won(next)}` : undefined,
    });
  }
  out.push({
    kind: 'all',
    cost: allCost,
    label: e.spent ? `${won(allCost)} 더 내고 나머지 전부 열기` : `${won(allCost)}에 나머지 전부 열기`,
    note: `남은 고민 ${locked}개를 모두 열어요${e.spent ? ` · 합계 ${won(pricing.all)}` : ''}.`,
  });
  return out;
}

export function partnerOffers(e: Ent, pk: string): Offer[] {
  if (partnerOpen(e, pk)) return [];
  return [{ kind: 'partner', cost: PARTNER_PRICE, label: `${won(PARTNER_PRICE)}에 이 사람과의 상세 리포트 열기`, note: '궁합·재회 상세는 상대 한 명마다 따로 열어요.' }];
}

/** 선택지를 고른 뒤의 이용권 */
export function take(e: Ent, o: Offer, id: ConcernId | null, pk?: string, pricing = CONCERN_PRICING): Ent {
  switch (o.kind) {
    case 'free':
      return { ...e, free: id };
    case 'one':
      return { ...e, paid: [...e.paid, id!], spent: e.spent + o.cost };
    case 'all':
      return { ...e, all: true, spent: pricing.all };
    case 'partner':
      return { ...e, partners: [...e.partners, pk!] };
  }
}
