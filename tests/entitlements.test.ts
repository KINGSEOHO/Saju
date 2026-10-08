import { describe, expect, it } from 'vitest';
import { concernOffers, entOf, isOpen, PAID_CONCERNS, partnerOffers, partnerOpen, purchaseOf, type Purchase } from '../src/lib/entitlements.ts';

const S = 'saju1';
function buy(list: Purchase[], id: (typeof PAID_CONCERNS)[number], kind: string) {
  const o = concernOffers(entOf(list, S), id).find((x) => x.kind === kind);
  expect(o, `${id} ${kind}`).toBeTruthy();
  return { list: [...list, purchaseOf(o!, S, id)], o: o! };
}

describe('고민 리포트 가격 (5개)', () => {
  it('하나 무료 → 990원 → 990원 더 → 나머지 전부는 차액, 합계 2,490원', () => {
    expect(PAID_CONCERNS).toEqual(['career', 'love', 'money', 'exam', 'year']);
    let r = buy([], 'career', 'free');
    expect(r.o.cost).toBe(0);
    const love = concernOffers(entOf(r.list, S), 'love');
    expect(love.map((o) => o.label)).toEqual(['990원에 이 고민 열기', '2,490원에 나머지 전부 열기']);
    r = buy(r.list, 'love', 'one');
    const money = concernOffers(entOf(r.list, S), 'money');
    expect(money.map((o) => o.label)).toEqual(['990원 더 내고 이 고민 열기', '1,500원 더 내고 나머지 전부 열기']);
    expect(money[0].note).toBe('지금까지 990원 · 열면 합계 1,980원');
    r = buy(r.list, 'money', 'one');
    // 하나 더 사면 2,970원이 되어 '전부 열기'보다 비싸지므로, 나머지 전부만 남는다
    const exam = concernOffers(entOf(r.list, S), 'exam');
    expect(exam.map((o) => o.label)).toEqual(['510원 더 내고 나머지 전부 열기']);
    r = buy(r.list, 'exam', 'all');
    const e = entOf(r.list, S);
    expect(PAID_CONCERNS.every((id) => isOpen(e, id))).toBe(true);
    expect(e.spent).toBe(2490);
  });

  it('무료를 쓰기 전에 전부 열 수도 있다', () => {
    const r = buy([], 'career', 'all');
    expect(r.o.cost).toBe(2490);
    expect(PAID_CONCERNS.every((id) => isOpen(entOf(r.list, S), id))).toBe(true);
  });

  it('다른 사주에는 이용권이 넘어가지 않는다', () => {
    const r = buy([], 'career', 'all');
    expect(isOpen(entOf(r.list, 'saju2'), 'career')).toBe(false);
  });
});

describe('궁합·재회', () => {
  it('첫 상대는 무료, 그다음부터 한 명마다 990원', () => {
    const first = partnerOffers(entOf([], S), 'p1');
    expect(first[0]).toMatchObject({ kind: 'partnerFree', cost: 0 });
    const list = [purchaseOf(first[0], S, null, 'p1')];
    expect(partnerOpen(entOf(list, S), 'p1')).toBe(true);
    const second = partnerOffers(entOf(list, S), 'p2');
    expect(second[0]).toMatchObject({ kind: 'partner', cost: 990 });
    expect(entOf([...list, purchaseOf(second[0], S, null, 'p2')], S).partners).toEqual(['p2']);
  });
});
