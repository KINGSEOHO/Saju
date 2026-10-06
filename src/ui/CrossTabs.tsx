/** 교차 검증 · MBTI × 사주 · 직업 × 운 탭 묶음 (따로 불러오는 코드) */
import { useMemo } from 'react';
import type { SajuAnalysis } from '../engine/index.ts';
import { crossReport } from '../report/cross.ts';
import type { Report } from '../report/generate.ts';
import { CrossPanel, JobPanel, MbtiPanel } from './Cross.tsx';

export function CrossTabs({ a, report, tab }: { a: SajuAnalysis; report: Report; tab: 'cross' | 'mbti' | 'job' }) {
  const x = useMemo(() => crossReport(a, report), [a, report]);
  if (tab === 'mbti') return <MbtiPanel a={a} x={x} />;
  if (tab === 'job') return <JobPanel a={a} x={x} />;
  return <CrossPanel a={a} x={x} />;
}
