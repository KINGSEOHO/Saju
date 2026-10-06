/** 인생 웹툰 회차 묶음 — 1화 나라는 사람 · 2화 일과 나 · 3화 인생 연대기 · 4화 MBTI와 사주(입력 시) */
import type { SajuAnalysis } from '../engine/index.ts';
import type { CrossReport } from '../report/cross.ts';
import { personaEpisode } from './ep1.ts';
import { workEpisode } from './ep2.ts';
import { lifeEpisode } from './ep3.ts';
import { mbtiEpisode } from './ep4.ts';
import type { Comic } from './types.ts';

export { personaEpisode, workEpisode, lifeEpisode, mbtiEpisode };

export function episodes(a: SajuAnalysis, x: CrossReport | null): Comic[] {
  const list = [personaEpisode(a, x), workEpisode(a, x), lifeEpisode(a)];
  const m = x ? mbtiEpisode(a, x) : null;
  if (m) list.push(m);
  return list;
}
