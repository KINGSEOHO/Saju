import { describe, expect, it } from 'vitest';
import { concernOffers, EMPTY_ENT, isOpen, PAID_CONCERNS, partnerOffers, take, type Ent } from '../src/lib/entitlements.ts';

const pick = (e: Ent, id: (typeof PAID_CONCERNS)[number], kind: string) => {
  const o = concernOffers(e, id).find((x) => x.kind === kind)!;
  expect(o).toBeTruthy();
  return { e: take(e, o, id), o };
};

describe('고민 리포트 가격', () => {
  it('하나는 무료, 그다음 990원 → 400원 더 → 1,100원 더, 합계 2,490원', () => {
    let e = EMPTY_ENT;
    let r = pick(e, 'career', 'free');
    expect(r.o.cost).toBe(0);
    e = r.e;
    r = pick(e, 'love', 'one');
    expect(r.o.cost).toBe(990);
    expect(r.o.label).toBe('990원에 이 고민 열기');
    e = r.e;
    r = pick(e, 'money', 'one');
    expect(r.o.cost).toBe(400);
    expect(r.o.label).toBe('400원 더 내고 이 고민 열기');
    expect(r.o.note).toBe('지금까지 990원 · 열면 합계 1,390원');
    e = r.e;
    const last = concernOffers(e, 'year');
    expect(last).toHaveLength(1);
    expect(last[0].cost).toBe(1100);
    expect(last[0].label).toBe('1,100원 더 내고 마지막 고민 열기');
    e = take(e, last[0], 'year');
    expect(PAID_CONCERNS.every((id) => isOpen(e, id))).toBe(true);
    expect(e.spent).toBe(2490);
  });

  it('언제 전부 열어도 합계는 2,490원을 넘지 않는다', () => {
    let e = take(EMPTY_ENT, concernOffers(EMPTY_ENT, 'career')[0], 'career');
    const all0 = concernOffers(e, 'love').find((o) => o.kind === 'all')!;
    expect(all0.cost).toBe(2490);
    e = take(e, concernOffers(e, 'love')[0], 'love');
    const all1 = concernOffers(e, 'money').find((o) => o.kind === 'all')!;
    expect(all1.cost).toBe(1500);
    expect(all1.label).toBe('1,500원 더 내고 나머지 전부 열기');
    expect(take(e, all1, 'money').spent).toBe(2490);
  });

  it('무료를 쓰기 전에 전부 열 수도 있다', () => {
    const o = concernOffers(EMPTY_ENT, 'career').find((x) => x.kind === 'all')!;
    expect(o.cost).toBe(2490);
    expect(PAID_CONCERNS.every((id) => isOpen(take(EMPTY_ENT, o, 'career'), id))).toBe(true);
  });

  it('궁합·재회는 상대 한 명마다 990원', () => {
    const e = take(EMPTY_ENT, partnerOffers(EMPTY_ENT, 'p1')[0], null, 'p1');
    expect(partnerOffers(e, 'p1')).toHaveLength(0);
    expect(partnerOffers(e, 'p2')[0].cost).toBe(990);
  });
});
