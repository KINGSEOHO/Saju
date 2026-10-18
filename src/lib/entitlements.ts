/**
 * 무엇을 열었는지(이용권) — 계정에 남긴 구매 기록에서 계산한다. 가격은 config/plans.ts의 PRICES.
 *  - 고민 4개(이직·진로, 연애·결혼, 돈, 시험·합격): 하나씩 3,900원. 한 번 사면 계속 열려 있다.
 *  - 그해 신년운세(입춘이 지나면 '올해 운세'): 6,900원. 해마다 따로 산다 (report/season.ts).
 *  - 전부 열기(고민 4개 + 그해 신년운세): 9,900원. 하나씩 산 금액은 빼 주고, 합계가 9,900원을 넘지 않게 한다.
 *    지난 시즌에 낸 신년운세 값은 빼 주지 않는다 (그건 그해 상품이라서).
 *  - 궁합·재회 상세: 상대 한 명마다 4,900원 (그 사람과의 궁합·재회가 함께 열린다).
 *  - 첫 결제 혜택: 한 번도 결제하지 않은 계정은 고민 4개 중 하나를 처음 한 번만 1,900원에 연다.
 *    낸 돈은 그대로 '전부 열기' 차액에 셈한다 (1,900원을 냈으면 나머지 전부는 8,000원).
 * 예전 시안의 무료 기록('free'·'partnerFree')은 그대로 열어 둔다.
 * 구매 기록에는 '무엇을(항목) · 어느 사람의 것인지(양력 생일로 만든 짧은 암호값) · 얼마에 · 언제'만 남긴다.
 *
 * 중복 결제 막기 (자세한 흐름은 docs/MONETIZATION.md)
 *  - 이용권은 사람(양력 생일) 단위다. 태어난 시간·곳을 고쳐 넣거나 음력으로 다시 넣어도 이미 연 것은 그대로 열려 있다.
 *  - 결제 직전에 서버가 checkPurchase로 다시 본다. 이미 열린 것이면 승인하지 않고(돈이 빠지지 않는다), 다른 화면에서
 *    산 것이 있어 값이 바뀌었으면 새 값으로 다시 고르게 한다.
 *  - 두 기기의 기록을 합쳤을 때 겹쳐 낸 돈은 overpaid로 계산해 환불한다 (이미 연 것을 또 샀거나 묶음 가격을 넘겨 낸 만큼).
 */
import { OFFER_RULES, PRICES, type OfferRules } from '../config/plans.ts';
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
  /** 산 시즌(그해) — 신년운세와 '전부 열기'는 해마다 따로라서, 겹친 결제를 따질 때도 쓴다 */
  year?: number;
  /** 겹쳐 내서 돌려준 돈 (원) — 이용권 계산에는 낸 돈에서 이만큼 빼고 센다 */
  refunded?: number;
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
  /** 이 계정에서 아직 한 번도 결제하지 않았는지 (어느 사주든) — 첫 결제 혜택 */
  first: boolean;
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
/** 사주 풀이 결과에서 쓰는 것은 양력 생일뿐 (음력으로 넣었으면 바꾼 날짜) */
interface Born {
  pillars: { solarDate: { year: number; month: number; day: number } };
}
const dayOf = ({ pillars: { solarDate: d } }: Born) => `${d.year}-${d.month}-${d.day}`;
/**
 * 어느 사람의 것인지 — 양력 생일로만 정한다. 시간을 알게 돼 다시 넣거나, 태어난 곳·음력 입력·성별을 고쳐 넣어도
 * 같은 사람이면 같은 값이라서 이미 산 것을 또 결제하는 일이 없다. 생일이 같은 다른 사람과 겹칠 일은 드물어 받아들인다.
 */
export const sajuKey = (a: Born) => hash(dayOf(a));
export const partnerKey = (a: Born) => hash(`p|${dayOf(a)}`);
const pairOf = (saju: string, pk: string) => `${saju}>${pk}`;
/** 셈에 넣는 돈 — 낸 돈에서 돌려준 돈을 뺀다 */
const netOf = (p: Purchase) => p.amount - (p.refunded ?? 0);

const DEFAULT_SEASON: SeasonKey = { year: 0, title: '올해 운세' };

/**
 * 구매 기록 → 이 사주의 이용권.
 * 두 기기의 기록을 합친 경우(구매 코드 합치기)에도 이미 연 것은 하나도 닫히지 않게 모두 더하고,
 * 이번 묶음에 낸 돈이 '전부 열기' 가격에 이르면 전부 연다 — 어떤 순서로 사도 9,900원보다 더 내지 않게.
 */
export function entOf(list: Purchase[], saju: string, season: SeasonKey = DEFAULT_SEASON, prices = PRICES): Ent {
  const e: Ent = { season, paid: [], frees: [], years: [], all: false, spent: 0, partners: [], first: !list.some((p) => p.amount > 0) };
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
      if (y === season.year) e.spent += netOf(p);
      continue;
    }
    // 하나씩
    if (p.item === 'year') {
      e.years.push(y);
      if (y === season.year) e.spent += netOf(p);
    } else {
      e.paid.push(p.item);
      e.spent += netOf(p);
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
  /** 혜택이면 그 이름과 원래 가격 (첫 결제 혜택) */
  promo?: { name: string; was: number };
}

const won = (n: number) => `${n.toLocaleString('ko-KR')}원`;

/** 하나를 사고 나면 '전부 열기'까지 이만큼도 안 남을 때는 하나 대신 전부 열기만 보여 준다 — 몇백 원짜리 결제를 만들지 않으려고 */
const MIN_REST = 1000;

/** 잠긴 고민 하나에서 보여 줄 선택지 — 첫째가 주 버튼 */
export function concernOffers(e: Ent, id: ConcernId, prices = PRICES, rules: OfferRules = OFFER_RULES): Offer[] {
  if (id === 'match' || isOpen(e, id)) return [];
  const yearName = e.season.title;
  const yearOpen = isOpen(e, 'year');
  const lockedCore = CORE_CONCERNS.filter((c) => !isOpen(e, c)).length;
  // 고민 4개가 이미 다 열린 사람에게 남은 것은 그해 신년운세뿐
  if (id === 'year' && e.all) return [{ kind: 'one', cost: prices.year, label: `${won(prices.year)}에 ${yearName} 열기`, note: '고민 4개는 이미 열려 있어요.' }];
  // 첫 결제 혜택은 고민 4개에만 (신년운세는 시즌 상품이라 정가)
  const welcome = rules.welcome && e.first && id !== 'year';
  const single = id === 'year' ? prices.year : welcome ? prices.first : prices.concern;
  const allCost = Math.max(prices.all - e.spent, 0);
  // '전부 열기'로 함께 열리는 것
  const rest = [...(yearOpen ? [] : [yearName]), ...(lockedCore ? [`고민 ${lockedCore}개`] : [])].join('와 ');
  const out: Offer[] = [];
  // 차액 결제를 끈 동안: 정해진 값으로만 판다 — 아무것도 안 샀으면 하나(3,900·6,900) 또는 전부(9,900), 하나라도 샀으면 하나씩만
  if (!rules.topup) {
    out.push({ kind: 'one', cost: single, label: `${won(single)}에 ${id === 'year' ? yearName : '이 고민'} 열기` });
    if (e.spent === 0 && !e.all)
      out.push({ kind: 'all', cost: prices.all, label: `${won(prices.all)}에 전부 열기`, note: `${rest}가 모두 열려요 · 하나씩 사면 ${won(prices.year + prices.concern * CORE_CONCERNS.length)}.` });
    return out.length > 1 && id === 'year' ? [out[1], out[0]] : out;
  }
  // 하나만 — 사고 나서도 '전부 열기'까지 1,000원 이상 남을 때만 (첫 결제 혜택은 늘)
  if (welcome) {
    out.push({
      kind: 'one',
      cost: single,
      label: `첫 결제 ${won(single)}에 이 고민 열기`,
      note: `처음 한 번만이에요 · 다음부터는 ${won(prices.concern)}`,
      promo: { name: '첫 결제 혜택', was: prices.concern },
    });
  } else if (e.spent + single <= prices.all - MIN_REST) {
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

/** 고른 선택지 → 계정에 남길 구매 기록 (year: 산 시즌) */
export function purchaseOf(o: Offer, saju: string, id: ConcernId | null, pk?: string, year?: number): Purchase {
  const at = Date.now();
  if (o.kind === 'partner' || o.kind === 'partnerFree') return { kind: o.kind, item: 'match', target: pairOf(saju, pk!), amount: o.cost, at };
  return { kind: o.kind, item: id!, target: saju, amount: o.cost, at, ...(year ? { year } : {}) };
}

/** 결제 직전 다시 보기 — 'owned': 이미 열려 있다(결제하지 않는다) · 'price': 그사이 산 것이 있어 값이 바뀌었다(다시 고르게) */
export type PayCheck = 'ok' | 'owned' | 'price';

/**
 * 결제 승인 직전에 서버가 계정의 최신 기록으로 다시 계산한다. 다른 탭·다른 기기에서 먼저 산 것이 있어도
 * 이미 열린 것에는 돈을 받지 않고, 화면에 남아 있던 옛 값으로 결제되지 않게 한다.
 */
export function checkPurchase(list: Purchase[], p: Purchase, season: SeasonKey, prices = PRICES, rules: OfferRules = OFFER_RULES): PayCheck {
  if (p.item === 'match') {
    const [saju, pk] = p.target.split('>');
    const e = entOf(list, saju, season, prices);
    if (partnerOpen(e, pk)) return 'owned';
    return partnerOffers(e, pk, prices).some((o) => o.kind === p.kind && o.cost === p.amount) ? 'ok' : 'price';
  }
  const e = entOf(list, p.target, season, prices);
  if (p.kind === 'all') {
    if (e.all && isOpen(e, 'year')) return 'owned';
    // 차액 결제를 끈 동안에는 아무것도 안 산 사람만 정가 9,900원으로 산다
    if (!rules.topup) return !e.all && e.spent === 0 && p.amount === prices.all ? 'ok' : 'price';
    return !e.all && Math.max(prices.all - e.spent, 0) === p.amount ? 'ok' : 'price';
  }
  if (isOpen(e, p.item)) return 'owned';
  return concernOffers(e, p.item, prices, rules).some((o) => o.kind === p.kind && o.cost === p.amount) ? 'ok' : 'price';
}

const NO_SEASON: SeasonKey = { year: 0, title: '' };

/**
 * 겹쳐 낸 돈 — 기록마다 돌려줄 금액(원). 산 순서대로 다시 셈하면서, 그때 이미 열려 있던 것을 또 샀으면 전부,
 * 묶음 가격(전부 열기)을 넘겨 냈으면 넘친 만큼을 돌려준다. 이미 돌려준 몫은 다시 세지 않는다.
 * 한 기기 안에서는 화면이 막아 생기지 않고, 코드를 모른 채 다른 기기에서 산 뒤 기록을 합칠 때 생긴다.
 */
export function overpaid(list: Purchase[], prices = PRICES): number[] {
  const out = list.map(() => 0);
  const kept: Purchase[] = [];
  const order = list.map((_, i) => i).sort((i, j) => list[i].at - list[j].at);
  for (const i of order) {
    const p = list[i];
    const net = netOf(p);
    let fair = net;
    if (net > 0 && p.item === 'match') {
      const [saju, pk] = p.target.split('>');
      if (partnerOpen(entOf(kept, saju, NO_SEASON, prices), pk)) fair = 0;
    } else if (net > 0) {
      const e = entOf(kept, p.target, { year: p.year ?? 0, title: '' }, prices);
      // 그때 정직하게 고를 수 있었던 값 — 고민 4개가 이미 열렸으면 신년운세 값, 아니면 묶음 차액
      const rest = e.all ? (isOpen(e, 'year') ? 0 : prices.year) : Math.max(prices.all - e.spent, 0);
      const owned = p.kind === 'all' ? e.all && isOpen(e, 'year') : isOpen(e, p.item);
      fair = owned ? 0 : Math.min(net, rest);
    }
    out[i] = net - fair;
    kept.push(out[i] ? { ...p, refunded: (p.refunded ?? 0) + out[i] } : p);
  }
  return out;
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
