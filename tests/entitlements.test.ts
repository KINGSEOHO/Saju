import { describe, expect, it } from 'vitest';
import { PRICES } from '../src/config/plans.ts';
import { concernOffers, CORE_CONCERNS, entOf, isOpen, PAID_CONCERNS, partnerOffers, partnerOpen, purchaseOf, type Purchase, type SeasonKey } from '../src/lib/entitlements.ts';
import type { ConcernId } from '../src/report/concernList.ts';

const S = 'saju1';
const Y27: SeasonKey = { year: 2027, title: '2027 신년운세' };
const Y28: SeasonKey = { year: 2028, title: '2028 신년운세' };

function buy(list: Purchase[], id: ConcernId, kind: string, season = Y27) {
  const o = concernOffers(entOf(list, S, season), id).find((x) => x.kind === kind);
  expect(o, `${id} ${kind}`).toBeTruthy();
  return { list: [...list, purchaseOf(o!, S, id, undefined, season.year)], o: o! };
}

describe('가격', () => {
  it('고민 하나 3,900원 · 신년운세 6,900원 · 전부 9,900원 · 궁합 상대 1명 4,900원 · 첫 결제 1,900원', () => {
    expect(PRICES).toEqual({ concern: 3900, year: 6900, all: 9900, partner: 4900, first: 1900 });
    expect(PAID_CONCERNS).toEqual(['career', 'love', 'money', 'exam', 'year']);
    expect(CORE_CONCERNS).toEqual(['career', 'love', 'money', 'exam']);
  });

  it('무료로 통째로 열어 주는 고민은 없다 — 처음 선택지는 첫 결제 혜택(1,900원)과 전부 열기', () => {
    const career = concernOffers(entOf([], S, Y27), 'career');
    expect(career.map((o) => o.label)).toEqual(['첫 결제 1,900원에 이 고민 열기', '9,900원에 전부 열기']);
    expect(career[0]).toMatchObject({ kind: 'one', cost: 1900, note: '처음 한 번만이에요 · 다음부터는 3,900원', promo: { name: '첫 결제 혜택', was: 3900 } });
    expect(career[1].note).toBe('2027 신년운세와 고민 4개가 모두 열려요 · 하나씩 사면 22,500원.');
    expect(career.every((o) => o.cost > 0)).toBe(true);
    // 신년운세에서는 전부 열기를 주 버튼으로 (3,000원만 더 내면 고민 4개까지)
    const year = concernOffers(entOf([], S, Y27), 'year');
    expect(year.map((o) => o.label)).toEqual(['9,900원에 전부 열기', '6,900원에 2027 신년운세 열기']);
  });
});

describe('첫 결제 혜택', () => {
  it('첫 결제 1,900원 → 연애 3,900원 더 → 나머지는 차액 4,100원 (몇백 원짜리 결제는 만들지 않는다)', () => {
    let r = buy([], 'career', 'one');
    expect(r.o.cost).toBe(1900);
    expect(r.list[0]).toMatchObject({ kind: 'one', item: 'career', amount: 1900 });
    const love = concernOffers(entOf(r.list, S, Y27), 'love');
    expect(love.map((o) => o.label)).toEqual(['3,900원 더 내고 이 고민 열기', '8,000원 더 내고 나머지 전부 열기']);
    expect(love[0].note).toBe('지금까지 1,900원 · 열면 합계 5,800원');
    r = buy(r.list, 'love', 'one');
    // 하나 더 사면 9,700원이 되어 나머지가 200원만 남으므로, 하나 대신 나머지 전부만 남는다
    const money = concernOffers(entOf(r.list, S, Y27), 'money');
    expect(money.map((o) => o.label)).toEqual(['4,100원 더 내고 나머지 전부 열기']);
    expect(money[0].note).toBe('2027 신년운세와 고민 2개가 모두 열려요 · 합계 9,900원.');
    r = buy(r.list, 'money', 'all');
    const e = entOf(r.list, S, Y27);
    expect(PAID_CONCERNS.every((id) => isOpen(e, id))).toBe(true);
    expect(e.spent).toBe(9900);
  });

  it('신년운세와 궁합은 정가, 혜택은 계정에서 한 번뿐이고 다른 사주로 바꿔도 다시 나오지 않는다', () => {
    expect(concernOffers(entOf([], S, Y27), 'year').some((o) => o.promo)).toBe(false);
    expect(partnerOffers(entOf([], S, Y27), 'p1')[0].cost).toBe(4900);
    const r = buy([], 'career', 'one');
    expect(entOf(r.list, S, Y27).first).toBe(false);
    expect(concernOffers(entOf(r.list, 'saju2', Y27), 'career').map((o) => o.label)).toEqual(['3,900원에 이 고민 열기', '9,900원에 전부 열기']);
    // 궁합을 먼저 산 계정도 이미 결제한 계정이다
    const p = [purchaseOf(partnerOffers(entOf([], S, Y27), 'p1')[0], S, null, 'p1')];
    expect(concernOffers(entOf(p, S, Y27), 'career')[0].label).toBe('3,900원에 이 고민 열기');
    // 예전 시안의 무료 기록만 있으면 아직 결제한 적이 없다
    expect(entOf([{ kind: 'free', item: 'love', target: S, amount: 0, at: 1 }], S, Y27).first).toBe(true);
  });
});

describe('하나씩 사도 9,900원보다 더 내지 않는다', () => {
  // 이미 결제한 적이 있는 계정 (첫 결제 혜택 없음)
  const paidBefore = [purchaseOf({ kind: 'partner', cost: 4900, label: '' }, S, null, 'p0')];

  it('이직 3,900 → 연애 3,900 더 → 나머지는 차액 2,100원', () => {
    let r = buy(paidBefore, 'career', 'one');
    expect(r.o.cost).toBe(3900);
    const love = concernOffers(entOf(r.list, S, Y27), 'love');
    expect(love.map((o) => o.label)).toEqual(['3,900원 더 내고 이 고민 열기', '6,000원 더 내고 나머지 전부 열기']);
    expect(love[0].note).toBe('지금까지 3,900원 · 열면 합계 7,800원');
    r = buy(r.list, 'love', 'one');
    // 하나 더 사면 11,700원이 되어 '전부 열기'보다 비싸지므로, 나머지 전부만 남는다
    const money = concernOffers(entOf(r.list, S, Y27), 'money');
    expect(money.map((o) => o.label)).toEqual(['2,100원 더 내고 나머지 전부 열기']);
    expect(money[0].note).toBe('2027 신년운세와 고민 2개가 모두 열려요 · 합계 9,900원.');
    r = buy(r.list, 'money', 'all');
    const e = entOf(r.list, S, Y27);
    expect(PAID_CONCERNS.every((id) => isOpen(e, id))).toBe(true);
    expect(e.spent).toBe(9900);
  });

  it('신년운세 6,900원을 산 뒤에는 3,000원만 더 내면 전부 열린다', () => {
    const r = buy([], 'year', 'one');
    expect(r.o.cost).toBe(6900);
    const career = concernOffers(entOf(r.list, S, Y27), 'career');
    expect(career.map((o) => [o.kind, o.cost])).toEqual([['all', 3000]]);
    expect(career[0].note).toBe('고민 4개가 모두 열려요 · 합계 9,900원.');
  });

  it('다른 사주에는 이용권이 넘어가지 않는다', () => {
    const r = buy([], 'career', 'all');
    expect(isOpen(entOf(r.list, 'saju2', Y27), 'career')).toBe(false);
  });
});

describe('신년운세는 해마다 따로', () => {
  it('2027 신년운세를 사도 2028 신년운세는 닫혀 있다. 고민 4개는 계속 열려 있다', () => {
    const r = buy([], 'career', 'all'); // 2027 시즌에 전부 열기
    const e27 = entOf(r.list, S, Y27);
    expect(isOpen(e27, 'year') && isOpen(e27, 'career')).toBe(true);
    const e28 = entOf(r.list, S, Y28);
    expect(isOpen(e28, 'career')).toBe(true);
    expect(isOpen(e28, 'year')).toBe(false);
    // 다음 해에는 그해 신년운세만 사면 된다 (지난해에 낸 돈으로 깎아 주지 않는다)
    expect(concernOffers(e28, 'year').map((o) => [o.kind, o.cost])).toEqual([['one', 6900]]);
  });

  it('지난해 신년운세 값은 올해 묶음 차액에 넣지 않는다', () => {
    const r = buy([], 'year', 'one', Y27);
    const e28 = entOf(r.list, S, Y28);
    expect(e28.spent).toBe(0);
    expect(concernOffers(e28, 'career').find((o) => o.kind === 'all')?.cost).toBe(9900);
  });
});

describe('궁합·재회', () => {
  it('상대 한 명마다 4,900원 — 첫 상대도 유료', () => {
    const first = partnerOffers(entOf([], S, Y27), 'p1');
    expect(first).toEqual([{ kind: 'partner', cost: 4900, label: '4,900원에 이 사람과의 상세 리포트 열기', note: '이 사람과의 궁합·재회 상세가 함께 열려요.' }]);
    const list = [purchaseOf(first[0], S, null, 'p1')];
    expect(partnerOpen(entOf(list, S, Y27), 'p1')).toBe(true);
    expect(partnerOpen(entOf(list, S, Y27), 'p2')).toBe(false);
  });

  it('예전 시안의 무료 기록도 그대로 열려 있다', () => {
    const legacy: Purchase[] = [
      { kind: 'free', item: 'love', target: S, amount: 0, at: 1 },
      { kind: 'partnerFree', item: 'match', target: `${S}>p9`, amount: 0, at: 2 },
    ];
    const e = entOf(legacy, S, Y27);
    expect(isOpen(e, 'love') && partnerOpen(e, 'p9')).toBe(true);
  });
});
