import { describe, expect, it } from 'vitest';
import { analyze, type BirthInput, type SajuAnalysis } from '../src/engine/index.ts';
import { compatReport, reunionReport } from '../src/report/compat.ts';
import { concernReport } from '../src/report/concern.ts';
import type { ConcernId } from '../src/report/concernList.ts';
import { crossReport } from '../src/report/cross.ts';
import { buildGaeun } from '../src/report/gaeun.ts';
import { generateReport } from '../src/report/generate.ts';
import { buildHits } from '../src/report/hits.ts';
import { analyzeJob } from '../src/report/job.ts';
import { readLuck } from '../src/report/luckReading.ts';
import { MBTI_LIST } from '../src/report/mbti.ts';
import { upcomingMonths } from '../src/ui/Luck.tsx';

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
      year: 1965 + Math.floor(rnd() * 45),
      month: 1 + Math.floor(rnd() * 12),
      day: 1 + Math.floor(rnd() * 28),
      hour: rnd() > 0.2 ? Math.floor(rnd() * 24) : null,
      minute: 0,
      longitude: 126.978,
      timeZone: 'Asia/Seoul',
      mbti: rnd() < 0.7 ? MBTI_LIST[Math.floor(rnd() * 16)] : undefined,
      job: i % 3 ? '마케터' : undefined,
    };
    return analyze(input, NOW);
  });
}

const allText = (o: unknown, seen = new Set<unknown>()): string[] => {
  if (typeof o === 'string') return [o];
  if (!o || typeof o !== 'object' || seen.has(o)) return [];
  seen.add(o);
  return (Array.isArray(o) ? o : Object.values(o)).flatMap((x) => allText(x, seen));
};

// 합니다체 문장 끝 (‘아니다’ 같은 평서형 인용은 빼고)
const FORMAL = /[가-힣](?<!아)니다(?![가-힣])|십시오|습니까/;

describe('말투 — 사용자에게 보이는 풀이 글은 해요체로 통일', () => {
  it('합니다체 문장 끝을 알아본다 (평서형 ‘아니다’는 빼고)', () => {
    expect(['있습니다.', '때입니다', '좋아집니다”', '하십시오', '맞습니까?'].every((t) => FORMAL.test(t))).toBe(true);
    expect(['있어요.', '이건 아니다', '결론이니까'].some((t) => FORMAL.test(t))).toBe(false);
  });

  it('풀이 리포트 · 이야기 · 교차 검증 · 맞혀 볼게요 · 개운법 · 운세 · 직업 · 고민 리포트 · 궁합 · 재회에 ‘~니다’가 없다', () => {
    const ps = people(24, 3);
    const bad: string[] = [];
    for (const [i, a] of ps.entries()) {
      const report = generateReport(a);
      const months = upcomingMonths(a, 12);
      const outs: unknown[] = [report, crossReport(a, report), buildHits(a), buildGaeun(a), analyzeJob(a, report, '마케터')];
      for (const w of months.slice(0, 4)) outs.push(readLuck(a, w, '달'));
      for (const s of a.seun.slice(0, 3)) outs.push(readLuck(a, s, '해'));
      for (const id of IDS) outs.push(concernReport(id, a, report, months));
      const b = ps[(i + 1) % ps.length];
      outs.push(compatReport(a, b), reunionReport(a, b, { year: 2025, month: 3 }, months));
      for (const t of outs.flatMap((o) => allText(o))) if (FORMAL.test(t)) bad.push(t.slice(0, 120));
    }
    expect([...new Set(bad)]).toEqual([]);
  });
});
