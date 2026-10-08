import { describe, expect, it } from 'vitest';
import { analyze, type BirthInput, type SajuAnalysis } from '../src/engine/index.ts';
import { concernReport, examMonthOf, examTimeline, type ConcernReport, type LoveStatus } from '../src/report/concern.ts';
import type { ConcernId } from '../src/report/concernList.ts';
import { generateReport } from '../src/report/generate.ts';

const NOW = Date.UTC(2026, 9, 8);
const IDS: ConcernId[] = ['career', 'love', 'money', 'exam', 'year'];

function people(n: number, seed0: number): SajuAnalysis[] {
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

const upcoming = (a: SajuAnalysis) => {
  const i = a.wolun.reduce((acc, w, k) => (w.startMs <= a.now ? k : acc), 0);
  return a.wolun.slice(i, i + 12);
};

const ps = people(60, 11);
const all = ps.map((a) => {
  const report = generateReport(a);
  const months = upcoming(a);
  return { a, report, months, by: Object.fromEntries(IDS.map((id) => [id, concernReport(id, a, report, months)!])) as Record<ConcernId, ConcernReport> };
});

describe('고민 리포트 다섯 개', () => {
  it('누구에게나 한 줄 답 · 네 칸 · 이유 · 신호 · 무료 풀이 · 상세가 채워진다', () => {
    for (const { by } of all) {
      for (const id of IDS) {
        const c = by[id];
        expect(c, id).toBeTruthy();
        expect(c.answer.length).toBeGreaterThan(8);
        expect(c.stances).toHaveLength(4);
        expect(c.stance).toBeGreaterThanOrEqual(0);
        expect(c.stance).toBeLessThan(4);
        expect(c.why.text.length).toBeGreaterThan(20);
        expect(c.signals.length).toBeGreaterThanOrEqual(1);
        expect(c.teaser.length).toBeGreaterThan(10);
        expect(c.free.items.length).toBeGreaterThan(0);
        expect(c.detail.items.length).toBeGreaterThan(2);
        if (c.detail.timeline) expect(c.detail.timeline.items).toHaveLength(10);
        if (c.detail.months) {
          const go = c.detail.months.list.filter((m) => m.kind === 'go');
          const avoid = c.detail.months.list.filter((m) => m.kind === 'avoid');
          expect(go.length).toBeLessThanOrEqual(3);
          expect(avoid.length).toBeLessThanOrEqual(3);
          for (const g of go) expect(avoid.some((x) => x.w === g.w)).toBe(false);
        }
        expect(JSON.stringify(c)).not.toMatch(/undefined|NaN|\((가|를|는|이|은|을)\)/);
      }
    }
  });

  it('이유 한 줄이 답과 반대 방향으로 끝나지 않는다', () => {
    for (const { by } of all) {
      for (const id of ['career', 'love', 'money', 'exam'] as ConcernId[]) {
        const c = by[id];
        // 가장 조심하는 답(넷째 칸)인데 이유가 '운의 힘도 좋은 편'으로 끝나면 앞뒤가 안 맞는다
        if (c.stance === 3) expect(c.why.text, `${id}: ${c.answer} / ${c.why.text}`).not.toMatch(/운의 힘도 좋은 편이에요\.$/);
        // 반가운 신호를 말하면서 운의 힘이 약하면 '다만'으로 뒤집어야 한다
        if (c.signals[0].y.score < 45 && /늘어요\.|쉬워요\.|또렷해져요\./.test(c.why.text.split('.')[0] + '.')) expect(c.why.text).not.toMatch(/그리고 운의 힘/);
      }
    }
  });

  it('답이 한쪽으로만 몰리지 않는다', () => {
    for (const id of IDS) {
      const kinds = new Set(all.map(({ by }) => by[id].stance));
      expect(kinds.size, id).toBeGreaterThanOrEqual(3);
    }
  });

  it('이직·진로의 답은 올해 신호와 어긋나지 않는다', () => {
    for (const { by } of all) {
      const c = by.career;
      const v = c.signals[0].y.verdict;
      if (v === '이직 적기') expect(c.stance).toBe(0);
      if (v === '충동 이직 주의') expect(c.stance).toBe(3);
    }
  });

  it('연애는 지금 상태(혼자 · 연애 중 · 결혼)에 따라 답과 할 일이 달라진다', () => {
    const { a, report, months } = all[0];
    const r = (s: LoveStatus) => concernReport('love', a, report, months, { love: s })!;
    const [x, y, z] = [r('single'), r('dating'), r('married')];
    expect(x.stance).toBe(y.stance);
    expect(new Set([x.answer, y.answer, z.answer]).size).toBeGreaterThan(1);
    expect(x.detail.lists[0].items).not.toEqual(y.detail.lists[0].items);
  });

  it('돈과 시험은 판단을 대신하지 않는다는 안내를 붙인다', () => {
    for (const { by } of all.slice(0, 5)) {
      expect(by.money.notice).toContain('투자 판단');
      expect(by.exam.notice).toContain('준비한 만큼');
    }
  });

  it('올해 운세는 사주의 한 해(입춘~입춘) 열두 달을 모두 보여 준다', () => {
    for (const { by } of all.slice(0, 10)) {
      expect(by.year.detail.calendar!.rows).toHaveLength(12);
      expect(by.year.detail.calendar!.rows.filter((r) => r.now)).toHaveLength(1);
      expect(by.year.free.note).toContain('입춘');
    }
  });
});

describe('시험·합격', () => {
  it('10년 신호가 있고, 해마다 판단이 갈린다', () => {
    const verdicts = new Set(ps.flatMap((a) => examTimeline(a).map((y) => y.verdict)));
    expect(verdicts.size).toBeGreaterThanOrEqual(3);
    for (const a of ps.slice(0, 10)) expect(examTimeline(a)).toHaveLength(10);
  });

  it('시험 달은 볼 수 있는 범위 안이면 그달의 기운을, 밖이면 안내를 준다', () => {
    const a = ps[0];
    const inRange = examMonthOf(a, { year: 2027, month: 3 });
    expect(inRange.ok).toBe(true);
    if (inRange.ok) expect(['든든한 달', '무난한 달', '긴장할 달']).toContain(inRange.tag);
    const out = examMonthOf(a, { year: 2031, month: 3 });
    expect(out.ok).toBe(false);
    expect(out.text).toContain('까지의 달만');
  });
});
