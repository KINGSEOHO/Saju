import { describe, expect, it } from 'vitest';
import { STEMS, analyze, type BirthInput } from '../src/engine/index.ts';
import { groupOfElement } from '../src/engine/tenGods.ts';
import { generateReport } from '../src/report/generate.ts';

const NOW = Date.UTC(2026, 9, 6);

function randomInputs(n: number, seed0: number): BirthInput[] {
  let seed = seed0;
  const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  return Array.from({ length: n }, (_, i) => ({
    name: i % 3 ? '서호' : undefined,
    gender: rnd() < 0.5 ? 'male' : 'female',
    calendar: 'solar',
    year: 1935 + Math.floor(rnd() * 90),
    month: 1 + Math.floor(rnd() * 12),
    day: 1 + Math.floor(rnd() * 28),
    hour: rnd() > 0.15 ? Math.floor(rnd() * 24) : null,
    minute: 0,
    longitude: 126 + rnd() * 3,
    timeZone: 'Asia/Seoul',
    timeCorrection: 'mean',
    ziHourRule: 'traditional',
  }) as BirthInput);
}

const BAD = /undefined|NaN|\{who\}|을을|를를|은는|는은|이가|가이|과와|와과|나무\(木\)을|쇠\(金\)을|불\(火\)를|물\(水\)를|흙\(土\)를|나무\(木\)은|쇠\(金\)은|불\(火\)는|물\(水\)는|흙\(土\)는|\s{2,}/;

describe('개운법', () => {
  it('무작위 400명에서 가까이할 것·멀리할 것·루틴이 빠짐없이 만들어진다', () => {
    for (const input of randomInputs(400, 7)) {
      const a = analyze(input, NOW);
      const r = generateReport(a);
      const g = r.sections.find((s) => s.id === 'gaeun');
      expect(g).toBeTruthy();
      expect(r.sections.map((s) => s.id)[1]).toBe('gaeun');
      const d = g!.gaeun!;
      expect(d.need).toBe(a.yongsin.yongsin);
      expect(d.avoid).toBe(a.yongsin.gisin);
      expect(d.close.length).toBeGreaterThanOrEqual(9);
      expect(d.away.length).toBeGreaterThanOrEqual(5);
      expect(d.routine).toHaveLength(4);
      expect(g!.story!.length).toBeGreaterThanOrEqual(5);
      expect(g!.headline).toMatch(/가까이, .*멀리/);
      const text = JSON.stringify(g);
      expect(text).not.toMatch(BAD);
      // 같은 오행을 가까이하면서 동시에 멀리하라고 하지 않는다
      expect(d.need).not.toBe(d.avoid);
      // 루틴 네 가지는 서로 겹치지 않는다 (예: '밤 11시…'가 두 번 나오지 않게)
      expect(new Set(d.routine.map((r) => r.text.slice(0, 5))).size).toBe(4);
      // 채울 습관은 용신이 맡은 십성 그룹에서 나온다 (신약에게 식상을 늘리라고 하지 않는다)
      expect(d.routine[1].basis).toBe(`용신 = ${groupOfElement(STEMS[a.pillars.day.stem].element, d.need)}`);
      // 연간 포인트에 같은 오행을 두 번 쓰지 않는다 (丙午년 → 불(火)·불(火) 금지)
      expect(d.year?.text ?? '').not.toMatch(/([가-힣]+\(.\))·\1/);
    }
  });
});
