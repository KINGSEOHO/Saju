import { describe, expect, it } from 'vitest';
import { analyze, type BirthInput } from '../src/engine/index.ts';
import { generateReport } from '../src/report/generate.ts';
import { buildHits } from '../src/report/hits.ts';
import { analyzeJob } from '../src/report/job.ts';
import { LEVEL_PLAIN, strengthChecks, yongsinWhy } from '../src/report/plain.ts';

const NOW = Date.UTC(2026, 9, 6);
const BAD = /undefined|NaN|\[object|\{|\}|을를|를을|이가|가이|은는|는은|과와|와과|\s{2,}/;

function charts(n: number, seed0 = 7) {
  let seed = seed0;
  const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  const out = [];
  for (let i = 0; i < n; i++) {
    const timeKnown = rnd() > 0.1;
    const input: BirthInput = {
      gender: rnd() < 0.5 ? 'male' : 'female',
      calendar: 'solar',
      year: 1940 + Math.floor(rnd() * 80),
      month: 1 + Math.floor(rnd() * 12),
      day: 1 + Math.floor(rnd() * 28),
      hour: timeKnown ? Math.floor(rnd() * 24) : null,
      minute: timeKnown ? Math.floor(rnd() * 60) : null,
      longitude: 127,
      timeZone: 'Asia/Seoul',
      timeCorrection: 'mean',
      ziHourRule: 'traditional',
    } as BirthInput;
    out.push(analyze(input, NOW));
  }
  return out;
}

describe('명경이가 맞혀 볼게요', () => {
  it('600명 모두 구체적인 문장을 5~9개, 겹치지 않게 만든다', () => {
    for (const a of charts(600)) {
      const hits = buildHits(a);
      expect(hits.length).toBeGreaterThanOrEqual(a.age >= 18 ? 6 : 4);
      expect(hits.length).toBeLessThanOrEqual(9);
      expect(new Set(hits.map((h) => h.id)).size).toBe(hits.length);
      expect(new Set(hits.map((h) => h.topic)).size).toBe(hits.length);
      expect(hits.filter((h) => h.kind === 'past').length).toBeLessThanOrEqual(2);
      expect(hits.filter((h) => h.kind === 'now').length).toBeLessThanOrEqual(1);
      for (const h of hits) {
        expect(h.text).toContain('?');
        for (const t of [h.text, h.why, h.basis]) expect(t, t).not.toMatch(BAD);
      }
      // 지난 일은 최근 8년 안, 10살 이후의 해만
      for (const h of hits.filter((x) => x.kind === 'past')) {
        const y = Number(h.text.match(/^(\d{4})년/)?.[1]);
        expect(y).toBeGreaterThanOrEqual(2018);
        expect(y).toBeLessThanOrEqual(2026);
        expect(y - a.pillars.solarDate.year).toBeGreaterThanOrEqual(10);
      }
    }
  });

  it('미성년자에게는 직장·연애·투자 이야기를 하지 않는다', () => {
    for (const a of charts(400, 99).filter((x) => x.age < 18)) {
      for (const h of buildHits(a)) expect(h.text).not.toMatch(/회사|출퇴근|연인|투자|부업|가계부|회의|이별/);
    }
  });

  it('일간이 같아도 일지가 다르면 다른 장면을 고른다', () => {
    const base = { gender: 'male', calendar: 'solar', hour: 12, minute: 0, longitude: 127, timeZone: 'Asia/Seoul', timeCorrection: 'mean', ziHourRule: 'traditional' } as const;
    const a = analyze({ ...base, year: 1990, month: 7, day: 7 } as BirthInput, NOW); // 癸酉
    const b = analyze({ ...base, year: 1990, month: 7, day: 17 } as BirthInput, NOW); // 癸未
    expect(a.pillars.day.stem).toBe(b.pillars.day.stem);
    expect(buildHits(a)[0].text).not.toBe(buildHits(b)[0].text);
  });
});

describe('쉬운 말 풀이', () => {
  it('신강·신약 판단 질문과 용신 이유가 모든 명식에서 빈칸 없이 나온다', () => {
    for (const a of charts(500, 3)) {
      const checks = strengthChecks(a);
      expect(checks.map((c) => c.term)).toEqual(['득령', '득지', '득세', '통근']);
      expect(checks[0].ok).toBe(a.strength.deukryeong);
      expect(checks[1].ok).toBe(a.strength.deukji);
      expect(checks[2].ok).toBe(a.strength.deukse);
      for (const c of checks) expect(c.text, c.text).not.toMatch(BAD);
      const w = yongsinWhy(a);
      for (const t of [w.why, w.final, w.sure]) expect(t, t).not.toMatch(BAD);
      expect(LEVEL_PLAIN[a.strength.level]).toBeTruthy();
    }
  });

  it('직업 탭은 일의 환경이 무엇을 뜻하고 나에게 어떤지 구체적으로 풀어 준다', () => {
    for (const a of charts(200, 11)) {
      const j = analyzeJob(a, generateReport(a), '교사');
      expect(j.fit).not.toBeNull();
      expect(j.fit!.text).not.toMatch(/기운이 강한 환경은 이 사주에 부담/);
      expect(j.fit!.env.map((e) => e.el)).toEqual(['wood', 'water']);
      for (const e of j.fit!.env) {
        expect(e.what.length).toBeGreaterThan(8);
        expect(e.me.length).toBeGreaterThan(8);
        if (e.tone === 'bad') expect(e.tip).toBeTruthy();
        for (const t of [e.what, e.me, e.tip ?? '', e.basis]) expect(t, t).not.toMatch(BAD);
      }
      expect(j.fit!.text, j.fit!.text).not.toMatch(BAD);
    }
  });
});
