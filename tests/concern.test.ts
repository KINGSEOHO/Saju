import { describe, expect, it } from 'vitest';
import { analyze, type BirthInput } from '../src/engine/index.ts';
import { careerConcern } from '../src/report/concern.ts';
import { generateReport } from '../src/report/generate.ts';

const NOW = Date.UTC(2026, 9, 8);

function people(n: number, seed0: number) {
  let seed = seed0;
  const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  return Array.from({ length: n }, (_, i) => {
    const input: BirthInput = {
      name: i % 2 ? '명경' : undefined,
      gender: rnd() < 0.5 ? 'male' : 'female',
      calendar: 'solar',
      year: 1965 + Math.floor(rnd() * 40),
      month: 1 + Math.floor(rnd() * 12),
      day: 1 + Math.floor(rnd() * 28),
      hour: rnd() > 0.2 ? Math.floor(rnd() * 24) : null,
      minute: 0,
      longitude: 126.978,
      timeZone: 'Asia/Seoul',
      job: i % 3 ? '마케터' : undefined,
    };
    return analyze(input, NOW);
  });
}

describe('이직·진로 고민 리포트', () => {
  const all = people(80, 11).map((a) => {
    const now = a.wolun.reduce((acc, w, i) => (w.startMs <= a.now ? i : acc), 0);
    return careerConcern(a, generateReport(a), a.wolun.slice(now, now + 12))!;
  });

  it('누구에게나 한 줄 답·이유·올해 신호·상세가 채워진다', () => {
    for (const c of all) {
      expect(c).not.toBeNull();
      expect(c.answer).toMatch(/때예요$/);
      expect(c.why.text.length).toBeGreaterThan(20);
      expect(c.timeline.length).toBe(10);
      expect(c.stay.length).toBeGreaterThanOrEqual(2);
      expect(c.move.length).toBe(5);
      expect(JSON.stringify(c)).not.toMatch(/undefined|NaN/);
    }
  });

  it('한 줄 답은 올해 신호와 어긋나지 않는다', () => {
    for (const c of all) {
      if (c.thisYear.verdict === '이직 적기') expect(c.stance).toBe('move');
      if (c.thisYear.verdict === '충동 이직 주의') expect(c.stance).toBe('hold');
      if (c.stance === 'move') expect(c.thisYear.tone).toBe('positive');
    }
  });

  it('좋은 달과 피할 달은 겹치지 않고 각각 3개 이하다', () => {
    for (const c of all) {
      const go = c.months.filter((m) => m.kind === 'go');
      const avoid = c.months.filter((m) => m.kind === 'avoid');
      expect(go.length).toBeLessThanOrEqual(3);
      expect(avoid.length).toBeLessThanOrEqual(3);
      for (const g of go) expect(avoid.some((x) => x.w === g.w)).toBe(false);
    }
  });

  it('답이 한쪽으로만 몰리지 않는다', () => {
    const kinds = new Set(all.map((c) => c.stance));
    expect(kinds.size).toBeGreaterThanOrEqual(3);
  });
});
