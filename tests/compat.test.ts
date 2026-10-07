import { describe, expect, it } from 'vitest';
import { analyze, type BirthInput, type SajuAnalysis } from '../src/engine/index.ts';
import { compatReport, reunionReport, SCORE_NOTE } from '../src/report/compat.ts';
import { MBTI_LIST } from '../src/report/mbti.ts';

const NOW = Date.UTC(2026, 9, 6);

function people(n: number, seed0: number): SajuAnalysis[] {
  let seed = seed0;
  const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  return Array.from({ length: n }, (_, i) => {
    const timeKnown = rnd() > 0.2;
    const input: BirthInput = {
      name: i % 3 === 0 ? undefined : i % 3 === 1 ? '민수' : '지원',
      gender: rnd() < 0.5 ? 'male' : 'female',
      calendar: 'solar',
      year: 1960 + Math.floor(rnd() * 45),
      month: 1 + Math.floor(rnd() * 12),
      day: 1 + Math.floor(rnd() * 28),
      hour: timeKnown ? Math.floor(rnd() * 24) : null,
      minute: timeKnown ? Math.floor(rnd() * 60) : null,
      longitude: 126.978,
      timeZone: 'Asia/Seoul',
      mbti: rnd() < 0.7 ? MBTI_LIST[Math.floor(rnd() * 16)] : undefined,
    };
    return analyze(input, NOW);
  });
}

const ps = people(60, 7);
const pairs: [SajuAnalysis, SajuAnalysis][] = [];
for (let i = 0; i < ps.length; i++) for (let j = 0; j < ps.length; j++) if (i !== j) pairs.push([ps[i], ps[j]]);

const allText = (o: unknown): string[] =>
  typeof o === 'string' ? [o] : Array.isArray(o) ? o.flatMap(allText) : o && typeof o === 'object' ? Object.values(o).flatMap(allText) : [];

describe('궁합', () => {
  it('점수는 35~97점이고, 등급·제목·근거가 늘 채워진다', () => {
    for (const [a, b] of pairs) {
      const r = compatReport(a, b);
      expect(r.score).toBeGreaterThanOrEqual(35);
      expect(r.score).toBeLessThanOrEqual(97);
      expect(r.tier).toBeTruthy();
      expect(r.headline).toBeTruthy();
      expect(r.conflict.length).toBeGreaterThanOrEqual(2);
      expect(r.talk).toHaveLength(2);
      expect(r.advice.length).toBeGreaterThan(0);
      for (const f of r.factors) expect(f.basis).toBeTruthy();
    }
  });

  it('조사 자리에 (가)·(를) 같은 임시 표기가 남지 않는다', () => {
    for (const [a, b] of pairs.slice(0, 600)) {
      for (const t of allText(compatReport(a, b))) expect(t).not.toMatch(/\((가|를|는|이|은|을)\)|나이 |나무이|undefined|NaN/);
    }
  });

  it('일간 합 + 배우자 자리 합이면 높고, 둘 다 충이면 낮다', () => {
    const rs = pairs.map(([a, b]) => compatReport(a, b));
    const ids = (r: ReturnType<typeof compatReport>) => r.factors.map((f) => f.id);
    const hap = rs.filter((r) => ids(r).includes('branch-hap'));
    const chung = rs.filter((r) => ids(r).includes('branch-chung'));
    expect(hap.length).toBeGreaterThan(0);
    expect(chung.length).toBeGreaterThan(0);
    const avg = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;
    expect(avg(hap.map((r) => r.score))).toBeGreaterThan(avg(chung.map((r) => r.score)) + 15);
    for (const r of rs.filter((r) => ids(r).includes('stem-hap') && ids(r).includes('branch-hap'))) expect(r.score).toBeGreaterThanOrEqual(70);
    for (const r of rs.filter((r) => ids(r).includes('stem-chung') && ids(r).includes('branch-chung'))) expect(r.score).toBeLessThanOrEqual(62);
  });

  it('점수가 한쪽에 몰리지 않는다', () => {
    const scores = pairs.map(([a, b]) => compatReport(a, b).score);
    const share = (lo: number, hi: number) => scores.filter((s) => s >= lo && s < hi).length / scores.length;
    expect(share(35, 58)).toBeGreaterThan(0.05);
    expect(share(58, 72)).toBeGreaterThan(0.2);
    expect(share(72, 98)).toBeGreaterThan(0.1);
  });

  it('주의 문구는 점수가 단순한 지표라고 말한다', () => {
    expect(SCORE_NOTE).toContain('단순한 지표');
  });
});

describe('재회', () => {
  it('점수 없이 시기·반복 조건·할 일을 준다', () => {
    for (const [a, b] of pairs.slice(0, 300)) {
      const r = reunionReport(a, b, { year: 2025, month: 3 }, a.wolun.slice(0, 12));
      expect(r).not.toHaveProperty('score');
      expect(r.breakup?.when).toBe('2025년 3월');
      expect(r.repeat.length).toBeGreaterThan(0);
      expect(r.actions.length).toBeGreaterThanOrEqual(3);
      expect(r.good.length + r.avoid.length).toBeGreaterThan(0);
      for (const g of r.good) expect(r.avoid.some((x) => x.w === g.w)).toBe(false);
      for (const t of allText({ ...r, good: r.good.map((g) => g.why), avoid: r.avoid.map((g) => g.why) })) expect(t).not.toMatch(/\((가|를|는)\)|undefined|NaN/);
    }
  });

  it('헤어진 때를 모르면 그 부분만 비운다', () => {
    const r = reunionReport(ps[0], ps[1], null, ps[0].wolun.slice(0, 12));
    expect(r.breakup).toBeNull();
    expect(r.note).toContain('점수로 말하지 않아요');
  });
});
