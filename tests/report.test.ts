import { describe, expect, it } from 'vitest';
import { analyze } from '../src/engine/index.ts';
import { generateReport } from '../src/report/generate.ts';

describe('분석·리포트 생성 안정성', () => {
  it('무작위 1,500명 명식에서 예외·NaN·undefined 문구 없이 생성된다', () => {
    let seed = 42;
    const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
    const now = Date.UTC(2026, 9, 5);
    for (let i = 0; i < 1500; i++) {
      const timeKnown = rnd() > 0.15;
      const a = analyze(
        {
          gender: rnd() < 0.5 ? 'male' : 'female',
          calendar: rnd() < 0.3 ? 'lunar' : 'solar',
          year: 1920 + Math.floor(rnd() * 100),
          month: 1 + Math.floor(rnd() * 12),
          day: 1 + Math.floor(rnd() * 28),
          hour: timeKnown ? Math.floor(rnd() * 24) : null,
          minute: timeKnown ? Math.floor(rnd() * 60) : null,
          longitude: 126 + rnd() * 3,
          timeZone: 'Asia/Seoul',
          timeCorrection: (['mean', 'true', 'none'] as const)[Math.floor(rnd() * 3)],
          ziHourRule: rnd() < 0.5 ? 'traditional' : 'split',
        },
        now,
      );
      expect(a.strength.score).toBeGreaterThanOrEqual(0);
      expect(a.strength.score).toBeLessThanOrEqual(100);
      expect(a.daeun.list).toHaveLength(10);
      const r = generateReport(a);
      expect(r.sections.map((s) => s.id)).toEqual(['summary', 'personality', 'love', 'career', 'wealth', 'health']);
      const text = JSON.stringify(r);
      expect(text).not.toMatch(/undefined|NaN|\[object Object\]/);
      for (const s of r.sections) {
        expect(s.headline.length).toBeGreaterThan(5);
        for (const b of s.blocks) expect(b.items.length).toBeGreaterThan(0);
      }
    }
  });

  it('대운 방향: 양년 남자·음년 여자 순행, 음년 남자·양년 여자 역행', () => {
    const base = { calendar: 'solar' as const, month: 6, day: 15, hour: 12, minute: 0, longitude: 127, timeZone: 'Asia/Seoul' };
    expect(analyze({ ...base, gender: 'male', year: 1990 }).daeun.forward).toBe(true); // 庚午 양년
    expect(analyze({ ...base, gender: 'female', year: 1990 }).daeun.forward).toBe(false);
    expect(analyze({ ...base, gender: 'male', year: 1991 }).daeun.forward).toBe(false); // 辛未 음년
    expect(analyze({ ...base, gender: 'female', year: 1991 }).daeun.forward).toBe(true);
  });
});

describe('월운·세운 풀이', () => {
  it('무작위 명식의 모든 월운·세운 풀이가 빈 칸·치환 누락 없이 생성된다', async () => {
    const { readLuck } = await import('../src/report/luckReading.ts');
    let seed = 7;
    const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
    for (let i = 0; i < 400; i++) {
      const timeKnown = rnd() > 0.2;
      const a = analyze(
        {
          gender: rnd() < 0.5 ? 'male' : 'female',
          calendar: 'solar',
          year: 1940 + Math.floor(rnd() * 80),
          month: 1 + Math.floor(rnd() * 12),
          day: 1 + Math.floor(rnd() * 28),
          hour: timeKnown ? Math.floor(rnd() * 24) : null,
          minute: timeKnown ? Math.floor(rnd() * 60) : null,
          longitude: 127,
          timeZone: 'Asia/Seoul',
        },
        Date.UTC(2026, 9, 6),
      );
      const readings = [...a.wolun.map((w) => readLuck(a, w, '달')), ...a.seun.map((s) => readLuck(a, s, '해', s.combined))];
      for (const r of readings) {
        expect(r.headline.length).toBeGreaterThan(4);
        expect(r.good.length).toBeGreaterThan(0);
        expect(r.caution.length).toBeGreaterThan(0);
        expect(JSON.stringify(r)).not.toMatch(/undefined|NaN|\{p\}/);
      }
    }
  });
});
