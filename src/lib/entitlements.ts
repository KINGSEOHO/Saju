/**
 * 무엇을 열었는지(이용권) — 계정에 남긴 구매 기록에서 계산한다. 가격은 config/plans.ts의 PRICES.
 *  - 고민 4개(이직·진로, 연애·결혼, 돈, 시험·합격): 하나씩 3,900원. 한 번 사면 계속 열려 있다.
 *  - 그해 신년운세(입춘이 지나면 '올해 운세'): 6,900원. 해마다 따로 산다 (report/season.ts).
 *  - 전부 열기(고민 4개 + 그해 신년운세): 9,900원. 하나씩 산 금액은 빼 주고, 합계가 9,900원을 넘지 않게 한다.
 *    지난 시즌에 낸 신년운세 값은 빼 주지 않는다 (그건 그해 상품이라서).
 *  - 궁합·재회 상세: 상대 한 명마다 4,900원 (그 사람과의 궁합·재회가 함께 열린다).
 * 예전 시안의 무료 기록('free'·'partnerFree')은 그대로 열어 둔다.
 * 구매 기록에는 '무엇을(항목) · 어느 사주의 것인지(생년월일로 만든 짧은 암호값) · 얼마에 · 언제'만 남긴다.
 */
import type { BirthInput } from '../engine/index.ts';
import { PRICES } from '../config/plans.ts';
import { CONCERNS, type ConcernId } from '../report/concernList.ts';

export type PurchaseKind = 'one' | 'all' | 'partner' | 'free' | 'partnerFree';

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
  /** 신년운세(올해 운세)와 '전부 열기'에 든 그해 — 해마다 따로라서 */
  year?: number;
}

/** 이용권을 계산하는 시즌 — 그해와 그 상품의 이름 */
export interface SeasonKey {
  year: number;
  /** 예: '2027 신년운세', '올해 운세' */
  title: string;
}

export interface Ent {
  season: SeasonKey;
  /** 하나씩 연 고민 (신년운세 빼고) */
  paid: ConcernId[];
  /** 예전 시안에서 무료로 연 고민 */
  frees: ConcernId[];
  /** 신년운세(올해 운세)를 연 해들 */
  years: number[];
  /** 고민 4개가 모두 열렸는지 */
  all: boolean;
  /** 이번 '전부 열기'에 셈하는 금액 — 고민 4개에 낸 돈 + 그해 신년운세에 낸 돈 */
  spent: number;
  /** 연 상대 (돈 내고 연 상대 + 예전 시안의 무료 상대) */
  partners: string[];
}

/** 돈을 받는 고민 (궁합·재회는 상대마다 따로라 빠진다) */
export const PAID_CONCERNS: ConcernId[] = CONCERNS.filter((c) => c.id !== 'match').map((c) => c.id);
/** 한 번 사면 계속 열려 있는 고민 4개 */
export const CORE_CONCERNS: ConcernId[] = PAID_CONCERNS.filter((c) => c !== 'year');

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

const DEFAULT_SEASON: SeasonKey = { year: 0, title: '올해 운세' };

/**
 * 구매 기록 → 이 사주의 이용권.
 * 두 기기의 기록을 합친 경우(구매 코드 합치기)에도 이미 연 것은 하나도 닫히지 않게 모두 더하고,
 * 이번 묶음에 낸 돈이 '전부 열기' 가격에 이르면 전부 연다 — 어떤 순서로 사도 9,900원보다 더 내지 않게.
 */
export function entOf(list: Purchase[], saju: string, season: SeasonKey = DEFAULT_SEASON, prices = PRICES): Ent {
  const e: Ent = { season, paid: [], frees: [], years: [], all: false, spent: 0, partners: [] };
  for (const p of list) {
    if (p.item === 'match') {
      const [s, pk] = p.target.split('>');
      if (s === saju) e.partners.push(pk);
      continue;
    }
    if (p.target !== saju) continue;
    if (p.kind === 'free') {
      e.frees.push(p.item);
      continue;
    }
    const y = p.year ?? season.year;
    if (p.kind === 'all') {
      e.all = true;
      e.years.push(y);
      if (y === season.year) e.spent += p.amount;
      continue;
    }
    // 하나씩
    if (p.item === 'year') {
      e.years.push(y);
      if (y === season.year) e.spent += p.amount;
    } else {
      e.paid.push(p.item);
      e.spent += p.amount;
    }
  }
  if (e.spent >= prices.all) {
    e.all = true;
    if (!e.years.includes(season.year)) e.years.push(season.year);
  }
  return e;
}

export const isOpen = (e: Ent, id: ConcernId) =>
  id === 'year' ? e.years.includes(e.season.year) || e.frees.includes('year') : e.all || e.paid.includes(id) || e.frees.includes(id);
export const partnerOpen = (e: Ent, pk: string) => e.partners.includes(pk);

export interface Offer {
  kind: PurchaseKind;
  /** 이번에 낼 돈 */
  cost: number;
  label: string;
  note?: string;
}

const won = (n: number) => `${n.toLocaleString('ko-KR')}원`;

/** 잠긴 고민 하나에서 보여 줄 선택지 — 첫째가 주 버튼 */
export function concernOffers(e: Ent, id: ConcernId, prices = PRICES): Offer[] {
  if (id === 'match' || isOpen(e, id)) return [];
  const yearName = e.season.title;
  const yearOpen = isOpen(e, 'year');
  const lockedCore = CORE_CONCERNS.filter((c) => !isOpen(e, c)).length;
  // 고민 4개가 이미 다 열린 사람에게 남은 것은 그해 신년운세뿐
  if (id === 'year' && e.all) return [{ kind: 'one', cost: prices.year, label: `${won(prices.year)}에 ${yearName} 열기`, note: '고민 4개는 이미 열려 있어요.' }];
  const single = id === 'year' ? prices.year : prices.concern;
  const allCost = Math.max(prices.all - e.spent, 0);
  // '전부 열기'로 함께 열리는 것
  const rest = [...(yearOpen ? [] : [yearName]), ...(lockedCore ? [`고민 ${lockedCore}개`] : [])].join('와 ');
  const out: Offer[] = [];
  // 하나만 — 합계가 '전부 열기'보다 쌀 때만
  if (e.spent + single < prices.all) {
    out.push({
      kind: 'one',
      cost: single,
      label: e.spent ? `${won(single)} 더 내고 ${id === 'year' ? yearName : '이 고민'} 열기` : `${won(single)}에 ${id === 'year' ? yearName : '이 고민'} 열기`,
      note: e.spent ? `지금까지 ${won(e.spent)} · 열면 합계 ${won(e.spent + single)}` : undefined,
    });
  }
  out.push({
    kind: 'all',
    cost: allCost,
    label: e.spent ? `${won(allCost)} 더 내고 나머지 전부 열기` : `${won(allCost)}에 전부 열기`,
    note: `${rest}가 모두 열려요${e.spent ? ` · 합계 ${won(prices.all)}` : ` · 하나씩 사면 ${won(prices.year + prices.concern * CORE_CONCERNS.length)}`}.`,
  });
  // 전부 열기가 더 이득이면 주 버튼으로
  return out.length > 1 && (out[1].cost <= out[0].cost || id === 'year') ? [out[1], out[0]] : out;
}

export function partnerOffers(e: Ent, pk: string, prices = PRICES): Offer[] {
  if (partnerOpen(e, pk)) return [];
  return [{ kind: 'partner', cost: prices.partner, label: `${won(prices.partner)}에 이 사람과의 상세 리포트 열기`, note: '이 사람과의 궁합·재회 상세가 함께 열려요.' }];
}

/** 고른 선택지 → 계정에 남길 구매 기록 */
export function purchaseOf(o: Offer, saju: string, id: ConcernId | null, pk?: string, year?: number): Purchase {
  const at = Date.now();
  if (o.kind === 'partner' || o.kind === 'partnerFree') return { kind: o.kind, item: 'match', target: pairOf(saju, pk!), amount: o.cost, at };
  const withYear = o.kind === 'all' || id === 'year';
  return { kind: o.kind, item: id!, target: saju, amount: o.cost, at, ...(withYear && year ? { year } : {}) };
}

/** 구매 내역에 보여 줄 이름 */
export function purchaseLabel(p: Purchase): string {
  const title = CONCERNS.find((c) => c.id === p.item)?.title ?? p.item;
  switch (p.kind) {
    case 'free':
      return `${title} 상세 (무료로 고름)`;
    case 'one':
      return p.item === 'year' ? `${p.year ? `${p.year}년 ` : ''}신년운세 상세` : `${title} 상세`;
    case 'all':
      return `전부 열기${p.year ? ` (${p.year}년 신년운세 포함)` : ''}`;
    case 'partnerFree':
      return '궁합·재회 상세 · 상대 1명 (무료)';
    case 'partner':
      return '궁합·재회 상세 · 상대 1명';
  }
}
