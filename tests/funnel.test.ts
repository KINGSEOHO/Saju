import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PRICE_OPTIONS, PRICE_ORDER } from '../src/config/plans.ts';
import { FUNNEL_EVENTS } from '../src/lib/funnel.ts';
import { computeFunnel, computeStats, type RawData } from '../src/lib/stats.ts';

const sent: { type: string; meta: unknown }[] = [];
vi.mock('../src/lib/api.ts', () => ({
  sessionId: () => 'test-device',
  send: async (_kind: string, body: { type: string; meta: unknown }) => {
    sent.push({ type: body.type, meta: body.meta });
    return 'sent';
  },
}));

type Ev = RawData['events'][number];
const ev = (t: string, sid: string, type: string, meta: Ev['meta'] = {}): Ev => ({ created_at: `2026-11-0${t}`, session_id: sid, type, meta });

describe('단계별 측정 — 남기기', () => {
  beforeEach(() => {
    sent.length = 0;
  });

  it('같은 단계·같은 고민은 한 번 방문에 한 번만, 결과 봄·결제 완료는 매번 보낸다', async () => {
    const { track } = await import('../src/lib/funnel.ts');
    track('visit');
    track('visit');
    track('concern_open', { item: 'career' });
    track('concern_open', { item: 'career' });
    track('concern_open', { item: 'love' });
    track('pay_click', { item: 'career', offer: 'first', amount: 1900 });
    track('pay_click', { item: 'career', offer: 'all', amount: 9900 });
    track('analyze', { dayStem: 3 }, false);
    track('analyze', { dayStem: 3 }, false);
    track('paid', { item: 'career', offer: 'first', amount: 1900 }, false);
    expect(sent.map((x) => x.type)).toEqual(['visit', 'concern_open', 'concern_open', 'pay_click', 'pay_click', 'analyze', 'analyze', 'paid']);
  });

  it('지인 리뷰 링크로 들어온 기기는 기록에 지인 표시가 붙는다', async () => {
    const { track } = await import('../src/lib/funnel.ts');
    const store = new Map([['mg_from', 'friend']]);
    vi.stubGlobal('localStorage', { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => store.set(k, v) });
    track('concern_open', { item: 'exam' });
    vi.unstubAllGlobals();
    expect(sent.at(-1)).toEqual({ type: 'concern_open', meta: { item: 'exam', from: 'friend' } });
  });

  it('보내는 것은 단계와 고민·선택지·금액뿐 — 생년월일이 들어갈 자리가 없다', async () => {
    const { track } = await import('../src/lib/funnel.ts');
    track('lock_view', { item: 'money', amount: 1900 });
    expect(sent).toEqual([{ type: 'lock_view', meta: { item: 'money', amount: 1900 } }]);
  });
});

describe('단계별 측정 — 계산', () => {
  const events: Ev[] = [
    ev('1', 'old', 'analyze'), // 측정 시작(첫 접속) 전 기록은 세지 않는다
    ev('2', 'a', 'visit'),
    ev('2', 'b', 'visit'),
    ev('2', 'c', 'visit'),
    ev('2', 'd', 'visit'),
    ev('3', 'a', 'analyze'),
    ev('3', 'a', 'analyze'),
    ev('3', 'b', 'analyze'),
    ev('3', 'c', 'analyze'),
    ev('4', 'a', 'concern_open', { item: 'career' }),
    ev('4', 'a', 'concern_open', { item: 'match' }),
    ev('4', 'b', 'concern_open', { item: 'career' }),
    ev('5', 'a', 'match_result', { item: 'compat' }),
    ev('5', 'a', 'lock_view', { item: 'career', amount: 1900 }),
    ev('5', 'b', 'lock_view', { item: 'career', amount: 1900 }),
    ev('5', 'a', 'lock_view', { item: 'compat', amount: 4900 }),
    ev('6', 'a', 'pay_click', { item: 'career', offer: 'first', amount: 1900 }),
    ev('6', 'a', 'paid', { item: 'career', offer: 'first', amount: 1900 }),
    ev('7', 'a', 'pay_click', { item: 'compat', offer: 'partner', amount: 4900 }),
    ev('7', 'a', 'paid', { item: 'compat', offer: 'partner', amount: '4900' as unknown as number }),
  ];
  const f = computeFunnel(events);

  it('단계마다 몇 명(기기)이 남았는지 센다', () => {
    expect(f.since).toBe('2026-11-02');
    expect(f.steps.map((s) => [s.key, s.n])).toEqual([
      ['visit', 4],
      ['analyze', 3],
      ['concern_open', 2],
      ['view', 2],
      ['pay_click', 1],
      ['paid', 1],
    ]);
  });

  it('고민마다 펼침·가격 화면·결제를 나누고, 궁합과 재회는 궁합·재회 한 줄로 모은다', () => {
    const career = f.items.find((x) => x.item === 'career')!;
    expect(career).toMatchObject({ open: 2, view: 2, click: 1, paid: 1, revenue: 1900 });
    const match = f.items.find((x) => x.item === 'match')!;
    expect(match).toMatchObject({ open: 1, view: 1, click: 1, paid: 1, revenue: 4900 });
    expect(f.match).toEqual({ open: 1, result: 1 });
    expect(f.offers.map((o) => o.key).sort()).toEqual(['first', 'partner']);
  });

  it('매출과 접속한 사람 1명당 매출', () => {
    expect(f.revenue).toBe(6800);
    expect(f.perVisitor).toBe(1700);
  });

  it('지인 리뷰 링크로 온 기기는 결제까지 가는 길에서 뺀다', () => {
    const withFriend = computeFunnel([
      ...events,
      ev('2', 'f1', 'visit', { from: 'friend' }),
      ev('3', 'f1', 'analyze', { from: 'friend' }),
      ev('6', 'f1', 'paid', { item: 'love', amount: 3900, from: 'friend' }),
    ]);
    expect(withFriend.friends).toBe(1);
    expect(withFriend.steps.map((s) => s.n)).toEqual(f.steps.map((s) => s.n));
    expect(withFriend.revenue).toBe(f.revenue);
  });

  it('측정 기록이 없으면 비워 둔다', () => {
    const empty = computeFunnel([ev('1', 'x', 'analyze')]);
    expect(empty.since).toBeNull();
    expect(empty.steps.every((s) => s.n === 0)).toBe(true);
    expect(empty.perVisitor).toBeNull();
  });
});

describe('받는 쪽(시트 스크립트·자체 서버)과 이름이 같다', () => {
  const gas = readFileSync(new URL('../docs/google-apps-script.gs', import.meta.url), 'utf8');
  const server = readFileSync(new URL('../server/index.mjs', import.meta.url), 'utf8');
  const listIn = (src: string, name: string) => {
    const m = src.match(new RegExp(`${name} = \\[([^\\]]*)\\]`));
    expect(m, name).toBeTruthy();
    return [...m![1].matchAll(/'([\w]+)'/g)].map((x) => x[1]);
  };

  it('측정 단계 이름을 시트 스크립트와 서버가 모두 받는다', () => {
    const gasEvents = listIn(gas, 'var EVENTS');
    const serverEvents = listIn(server, 'const FUNNEL_TYPES');
    for (const e of FUNNEL_EVENTS) {
      expect(gasEvents).toContain(e);
      expect(serverEvents).toContain(e);
    }
  });

  it('측정에 쓰는 항목·선택·금액·유입 열은 맨 뒤에 붙인다 (예전 행의 열 위치가 그대로)', () => {
    const keys = [...gas.slice(gas.indexOf('var META'), gas.indexOf('];', gas.indexOf('var META'))).matchAll(/\['(\w+)',/g)].map((x) => x[1]);
    expect(keys.slice(0, 13)).toEqual(['dayStem', 'dayPillar', 'gender', 'ageGroup', 'strength', 'gyeokguk', 'yongsin', 'yongsinMethod', 'confidence', 'timeKnown', 'calendar', 'mbti', 'jobCat']);
    expect(keys.slice(13)).toEqual(['item', 'offer', 'amount', 'from']);
    expect(listIn(server, 'const META_KEYS')).toEqual(expect.arrayContaining(['item', 'offer', 'amount', 'from']));
  });

  it('리뷰에서 묻는 가격을 시트 스크립트와 서버가 모두 받는다', () => {
    const gasPrices = listIn(gas, 'var PRICES');
    const serverPrices = listIn(server, 'const PRICE_ORDER');
    for (const p of PRICE_OPTIONS) {
      expect(gasPrices).toContain(p.id);
      expect(serverPrices).toContain(p.id);
      expect(PRICE_ORDER).toContain(p.id);
    }
    expect(serverPrices).toEqual(PRICE_ORDER);
  });
});

describe('지인 리뷰는 따로 본다', () => {
  const review = (accuracy: number, price: string, friend: boolean): RawData['reviews'][number] => ({
    created_at: '2026-11-03T00:00:00.000Z',
    overall: 5,
    accuracy,
    detail: '',
    text: '',
    price,
    features: '',
    compare: '',
    is_public: 0,
    meta: friend ? { from: 'friend' } : {},
  });
  const raw: RawData = {
    feedback: [],
    events: [],
    reviews: [review(5, 'p9900', true), review(5, 'p3900', true), review(3, 'free_only', false), review(4, 'p1900', false)],
  };
  const s = computeStats(raw);

  it('지인 리뷰와 그 밖의 리뷰를 나눠 센다', () => {
    expect(s.split.friend).toEqual({ n: 2, avgAccuracy: 5, wtpPaidShare: 1 });
    expect(s.split.other).toEqual({ n: 2, avgAccuracy: 3.5, wtpPaidShare: 0.5 });
  });

  it('유료 전환 판단은 지인 리뷰를 빼고 한다', () => {
    expect(s.decision.wtpPaidShare).toBe(0.5);
    expect(s.decision.notes[0]).toContain('지인 리뷰 2건은 따로 봤어요');
    expect(s.decision.notes[1]).toContain('리뷰 2/100건');
    expect(s.decision.notes.some((n) => n.includes('평균 정확도 3.50'))).toBe(true);
  });
});
