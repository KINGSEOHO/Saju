import { describe, expect, it } from 'vitest';
import { analyze, type BirthInput } from '../src/engine/index.ts';
import { generateReport } from '../src/report/generate.ts';

function randomInputs(n: number, seed0: number): BirthInput[] {
  let seed = seed0;
  const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  return Array.from({ length: n }, (_, i) => {
    const timeKnown = rnd() > 0.15;
    return {
      name: i % 3 === 0 ? '서호' : undefined,
      gender: rnd() < 0.5 ? 'male' : 'female',
      calendar: rnd() < 0.3 ? 'lunar' : 'solar',
      year: 1930 + Math.floor(rnd() * 95),
      month: 1 + Math.floor(rnd() * 12),
      day: 1 + Math.floor(rnd() * 28),
      hour: timeKnown ? Math.floor(rnd() * 24) : null,
      minute: timeKnown ? Math.floor(rnd() * 60) : null,
      longitude: 126 + rnd() * 3,
      timeZone: 'Asia/Seoul',
      timeCorrection: 'mean',
      ziHourRule: 'traditional',
    } as BirthInput;
  });
}

describe('이야기형 풀이', () => {
  it('무작위 400명에서 섹션마다 충분히 긴 이야기가 빈칸 없이 만들어진다', () => {
    const now = Date.UTC(2026, 9, 6);
    for (const input of randomInputs(400, 7)) {
      const r = generateReport(analyze(input, now));
      for (const s of r.sections) {
        const story = s.story ?? [];
        expect(story.length, s.id).toBeGreaterThanOrEqual(3);
        const chars = story.reduce((n, p) => n + p.text.length, 0);
        expect(chars, s.id).toBeGreaterThan(600);
        for (const p of story) {
          expect(p.title.length).toBeGreaterThan(1);
          expect(p.text).not.toMatch(/undefined|NaN|\{who\}|\{p\}|\[object|\s{2,}|\.\./);
          // 조사 결합 오류 흔적
          expect(p.text).not.toMatch(/님는|님가|님를|님와|당신는|당신가|당신를|당신와/);
        }
        expect(s.readMinutes).toBeGreaterThanOrEqual(1);
      }
      const summary = r.sections.find((s) => s.id === 'summary')!.story!;
      expect(summary.filter((p) => p.when === 'now').length).toBeGreaterThanOrEqual(1);
    }
  });
});
