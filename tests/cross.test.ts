import { describe, expect, it } from 'vitest';
import { analyze, type BirthInput } from '../src/engine/index.ts';
import { crossReport } from '../src/report/cross.ts';
import { generateReport } from '../src/report/generate.ts';
import { JOB_SUGGEST, matchJob } from '../src/report/job.ts';
import { AXES, MBTI_LIST, sajuAxes } from '../src/report/mbti.ts';

const NOW = Date.UTC(2026, 9, 6);

function randomInputs(n: number, seed0: number): BirthInput[] {
  let seed = seed0;
  const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  return Array.from({ length: n }, (_, i) => {
    const timeKnown = rnd() > 0.15;
    return {
      name: i % 2 ? '지원' : undefined,
      gender: rnd() < 0.5 ? 'male' : 'female',
      calendar: 'solar',
      year: 1935 + Math.floor(rnd() * 90),
      month: 1 + Math.floor(rnd() * 12),
      day: 1 + Math.floor(rnd() * 28),
      hour: timeKnown ? Math.floor(rnd() * 24) : null,
      minute: timeKnown ? Math.floor(rnd() * 60) : null,
      longitude: 126 + rnd() * 3,
      timeZone: 'Asia/Seoul',
      timeCorrection: 'mean',
      ziHourRule: 'traditional',
      mbti: rnd() < 0.8 ? MBTI_LIST[Math.floor(rnd() * 16)] : undefined,
      job: rnd() < 0.8 ? JOB_SUGGEST[Math.floor(rnd() * JOB_SUGGEST.length)] : undefined,
    } as BirthInput;
  });
}

const BAD_TEXT = /undefined|NaN|\{who\}|\[object|을을|를를|은는|는은|님는|님가|님를|당신는|당신가|당신를|\s{2,}/;

describe('직업 분류', () => {
  it.each([
    ['웹 개발자', 'it'],
    ['백엔드 엔지니어', 'it'],
    ['웹디자이너', 'creative'],
    ['UX 디자이너', 'creative'],
    ['PR 담당', 'sales'],
    ['회사원(사무직)', 'office'],
    ['헬스 트레이너', 'sports'],
    ['대학생', 'student'],
    ['간호사', 'medical'],
    ['공무원', 'public'],
    ['요리사', 'service'],
    ['초등학교 교사', 'edu'],
    ['프로그래머', 'it'],
    ['programmer', 'other'],
  ])('%s → %s', (text, id) => {
    expect(matchJob(text).id).toBe(id);
  });
  it('프리랜서 표시', () => {
    const j = matchJob('프리랜서 디자이너');
    expect(j.id).toBe('creative');
    expect(j.freelance).toBe(true);
    expect(matchJob('프리랜서').id).toBe('freelance');
  });
});

describe('MBTI × 사주 · 직업 · 교차 검증', () => {
  it('무작위 500명에서 빈칸·조사 오류 없이 만들어진다', () => {
    for (const input of randomInputs(500, 21)) {
      const a = analyze(input, NOW);
      const r = generateReport(a);
      const x = crossReport(a, r);
      expect(x.themes.length).toBeGreaterThanOrEqual(2);
      expect(x.card.headline.length).toBeGreaterThan(8);
      expect(x.card.tags).toHaveLength(3);
      expect(x.card.cards.length).toBe(4 + (input.mbti ? 1 : 0) + (input.job ? 1 : 0));
      const text = JSON.stringify(x);
      expect(text, input.job).not.toMatch(BAD_TEXT);
      if (input.mbti) {
        expect(x.mbti?.axes).toHaveLength(4);
        expect(x.mbti!.strengths.length).toBeGreaterThanOrEqual(2);
        expect(x.mbti!.weaknesses.length).toBeGreaterThanOrEqual(2);
      }
      if (input.job) {
        expect(x.job!.prepare.length).toBeGreaterThanOrEqual(3);
        expect(x.job!.prepare.length).toBeLessThanOrEqual(4);
        expect(x.job!.strengths.length).toBe(2);
      }
    }
  });

  it('사주로 본 네 축은 한쪽으로만 쏠리지 않는다 (축마다 기울어진 비율 45~75%)', () => {
    const inputs = randomInputs(1500, 5);
    const lean: Record<string, number> = { EI: 0, SN: 0, TF: 0, JP: 0 };
    const side: Record<string, number> = { E: 0, I: 0, S: 0, N: 0, T: 0, F: 0, J: 0, P: 0 };
    for (const input of inputs) {
      const ax = sajuAxes(analyze(input, NOW));
      for (const k of AXES) {
        expect(ax[k].score).toBeGreaterThanOrEqual(5);
        expect(ax[k].score).toBeLessThanOrEqual(95);
        if (ax[k].lean) {
          lean[k]++;
          side[ax[k].lean!]++;
        }
      }
    }
    for (const k of AXES) {
      const r = lean[k] / inputs.length;
      expect(r, k).toBeGreaterThan(0.45);
      expect(r, k).toBeLessThan(0.75);
      // 양쪽 글자가 모두 충분히 나온다
      const [x, y] = [k[0], k[1]];
      expect(Math.min(side[x], side[y]) / Math.max(side[x], side[y]), k).toBeGreaterThan(0.6);
    }
  });
});
