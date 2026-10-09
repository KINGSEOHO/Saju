import { describe, expect, it } from 'vitest';
import { analyze, type BirthInput, type SajuAnalysis } from '../src/engine/index.ts';
import { compatReport, reunionReport } from '../src/report/compat.ts';
import { concernReport } from '../src/report/concern.ts';
import type { ConcernId } from '../src/report/concernList.ts';
import { generateReport } from '../src/report/generate.ts';
import { concernPeek } from '../src/ui/Concern.tsx';
import { upcomingMonths } from '../src/ui/Luck.tsx';
import { compatPeek, reunionPeek } from '../src/ui/Match.tsx';

const NOW = Date.UTC(2026, 9, 9);
const IDS: ConcernId[] = ['career', 'love', 'money', 'exam', 'year'];

function people(n: number, seed0: number): SajuAnalysis[] {
  let seed = seed0;
  const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  return Array.from({ length: n }, (_, i) => {
    const input: BirthInput = {
      name: i % 2 ? '지원' : undefined,
      gender: rnd() < 0.5 ? 'male' : 'female',
      calendar: 'solar',
      year: 1965 + Math.floor(rnd() * 40),
      month: 1 + Math.floor(rnd() * 12),
      day: 1 + Math.floor(rnd() * 28),
      hour: rnd() > 0.2 ? Math.floor(rnd() * 24) : null,
      minute: 0,
      longitude: 126.978,
      timeZone: 'Asia/Seoul',
    };
    return analyze(input, NOW);
  });
}

const ps = people(40, 5);
const BAD = /undefined|NaN|\$\{/;

describe('잠금 화면에서 먼저 보여 주는 결과 하나', () => {
  it('고민마다 좋은 달 중 첫 달을 보여 주고, 나머지는 열어야 보인다 (신년운세는 조심할 달)', () => {
    let shown = 0;
    for (const a of ps) {
      const report = generateReport(a);
      const months = upcomingMonths(a, 12);
      for (const id of IDS) {
        const c = concernReport(id, a, report, months)!;
        const p = concernPeek(a, c);
        const list = c.detail.months?.list ?? [];
        if (!list.length && !c.detail.lists.some((l) => l.items.length)) {
          expect(p).toBeUndefined();
          continue;
        }
        expect(p).toBeTruthy();
        shown++;
        expect(p!.label.startsWith('먼저 보여 드려요 · ')).toBe(true);
        for (const t of Object.values(p!)) expect(t).not.toMatch(BAD);
        if (!list.length) continue;
        const want = id === 'year' && list.some((m) => m.kind === 'avoid') ? 'avoid' : list.some((m) => m.kind === 'go') ? 'go' : 'avoid';
        const pickList = list.filter((m) => m.kind === want);
        // 보여 준 것은 그 목록의 첫 달 하나뿐이다
        expect(p!.text).toBe(pickList[0].why);
        expect(p!.label).toContain(`${pickList.length}개 중 1개`);
        if (pickList.length > 1) expect(p!.rest).toContain(`나머지`);
        expect(p!.rest.endsWith('열면 볼 수 있어요.')).toBe(true);
      }
    }
    expect(shown).toBeGreaterThan(150);
  });

  it('궁합은 앞으로 10년 중 한 해, 재회는 연락하기 좋은 달 하나 (없으면 피할 달)', () => {
    let years = 0;
    let goodMonth = 0;
    for (let i = 0; i + 1 < ps.length; i += 2) {
      const [a, b] = [ps[i], ps[i + 1]];
      const r = compatReport(a, b);
      const cp = compatPeek(r);
      if (r.years.length) {
        years++;
        expect(cp!.text).toBe(r.years[0].text);
        expect(cp!.title).toMatch(new RegExp(`^${r.years[0].year}`));
        for (const t of Object.values(cp!)) expect(t).not.toMatch(BAD);
      } else expect(cp).toBeUndefined();
      const ru = reunionReport(a, b, { year: 2025, month: 3 }, upcomingMonths(a, 12));
      const rp = reunionPeek(a, ru);
      if (ru.good.length) {
        goodMonth++;
        expect(rp!.label).toContain('연락하기 좋은 달');
        expect(rp!.text).toBe(ru.good[0].why);
      } else if (ru.avoid.length) expect(rp!.label).toContain('연락을 피할 달');
      else expect(rp).toBeUndefined();
      if (rp) for (const t of Object.values(rp)) expect(t).not.toMatch(BAD);
    }
    expect(years).toBeGreaterThan(5);
    expect(goodMonth).toBeGreaterThan(5);
  });
});
