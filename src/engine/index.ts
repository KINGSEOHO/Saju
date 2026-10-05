/** 사주 분석 진입점 */
import { BRANCHES, STEMS, mainStemOf } from './constants.ts';
import { findInteractions, type Interaction, type Position } from './interactions.ts';
import { computeDaeun, computeSeun, computeWolun, type Daeun, type DaeunInfo, type Seun, type Wolun } from './luck.ts';
import { boundaryAnalysis, computePillars, ipchunMs, type BirthInput, type BoundaryWarning, type Pillar, type PillarResult } from './pillars.ts';
import { findSinsal, gongmang, twelveSinsal, type SinsalHit, type TwelveSinsal } from './sinsal.ts';
import {
  analyzeElements, analyzeGyeokguk, analyzeStrength, analyzeYongsin,
  type ElementAnalysis, type Gyeokguk, type NatalChars, type StrengthAnalysis, type YongsinAnalysis,
} from './strength.ts';
import { tenGodOfBranch, tenGodOfStem, twelveStage, type TenGod, type TwelveStage } from './tenGods.ts';

export * from './constants.ts';
export type { BirthInput, Pillar, PillarResult, BoundaryWarning } from './pillars.ts';
export { fmtKst } from './pillars.ts';
export type { Interaction, Position } from './interactions.ts';
export type { SinsalHit } from './sinsal.ts';
export type { ElementAnalysis, StrengthAnalysis, YongsinAnalysis, Gyeokguk, GodRole } from './strength.ts';
export type { Daeun, DaeunInfo, Seun, Wolun, LuckPillar } from './luck.ts';
export type { TenGod, TenGodGroup, TwelveStage } from './tenGods.ts';

export interface PositionInfo {
  pos: Position;
  label: string;
  pillar: Pillar;
  stemTenGod: TenGod | '일간';
  branchTenGod: TenGod;
  hidden: { stem: number; tenGod: TenGod; days: number }[];
  /** 일간 기준 12운성 (봉법) */
  stage: TwelveStage;
  /** 해당 기둥 천간 자신의 12운성 (좌법) */
  selfStage: TwelveStage;
  /** 년지 기준 12신살 */
  twelveSinsal: TwelveSinsal;
  gongmang: boolean;
}

export interface SajuAnalysis {
  input: BirthInput;
  pillars: PillarResult;
  warnings: BoundaryWarning[];
  positions: PositionInfo[];
  elements: ElementAnalysis;
  strength: StrengthAnalysis;
  gyeokguk: Gyeokguk;
  yongsin: YongsinAnalysis;
  interactions: Interaction[];
  sinsal: SinsalHit[];
  daeun: DaeunInfo;
  currentDaeun: Daeun | null;
  seun: Seun[];
  wolun: Wolun[];
  /** 현재 만 나이 */
  age: number;
  now: number;
  currentSajuYear: number;
}

const LABEL: Record<string, string> = { year: '년주', month: '월주', day: '일주', hour: '시주' };

export function analyze(input: BirthInput, now: number = Date.now()): SajuAnalysis {
  const p = computePillars(input);
  const warnings = boundaryAnalysis(input, p);
  const ds = p.day.stem;

  const list: [Position, Pillar][] = [
    ['year', p.year],
    ['month', p.month],
    ['day', p.day],
  ];
  if (p.hour) list.push(['hour', p.hour]);

  const stems = list.map(([pos, pl]) => ({ pos, idx: pl.stem }));
  const branches = list.map(([pos, pl]) => ({ pos, idx: pl.branch }));
  const [g1, g2] = gongmang(p.day.index);

  const positions: PositionInfo[] = list.map(([pos, pl]) => ({
    pos,
    label: LABEL[pos],
    pillar: pl,
    stemTenGod: pos === 'day' ? '일간' : tenGodOfStem(ds, pl.stem),
    branchTenGod: tenGodOfBranch(ds, pl.branch),
    hidden: BRANCHES[pl.branch].hidden.map(([s, d]) => ({ stem: s, tenGod: tenGodOfStem(ds, s), days: d })),
    stage: twelveStage(ds, pl.branch),
    selfStage: twelveStage(pl.stem, pl.branch),
    twelveSinsal: twelveSinsal(p.year.branch, pl.branch),
    gongmang: pos !== 'day' && (pl.branch === g1 || pl.branch === g2),
  }));

  const natal: NatalChars = {
    stems,
    branches,
    dayStem: ds,
    monthBranch: p.month.branch,
    daysSinceJie: p.daysSincePrevJie,
  };
  const elements = analyzeElements(natal);
  const strength = analyzeStrength(natal, elements);
  const gyeokguk = analyzeGyeokguk(natal);
  const yongsin = analyzeYongsin(natal, elements, strength);
  const interactions = findInteractions(stems, branches);
  const sinsal = findSinsal({
    stems,
    branches,
    dayStem: ds,
    dayBranch: p.day.branch,
    yearBranch: p.year.branch,
    monthBranch: p.month.branch,
    dayPillarIndex: p.day.index,
  });

  const ctx = { dayStem: ds, roles: yongsin.roles, elementScore: yongsin.elementScore, stems, branches };
  const daeun = computeDaeun(ctx, p.conversion.utcMs, p.year.stem, p.month, input.gender);

  const nowYear = new Date(now).getUTCFullYear();
  const currentSajuYear = now >= ipchunMs(nowYear) ? nowYear : nowYear - 1;
  const birthYear = p.solarDate.year;
  const seun = computeSeun(ctx, daeun, birthYear, Math.max(birthYear, nowYear - 3), nowYear + 10);
  const wolun = [...computeWolun(ctx, currentSajuYear), ...computeWolun(ctx, currentSajuYear + 1)];
  const currentDaeun = [...daeun.list].reverse().find((d) => d.startAge <= (now - p.conversion.utcMs) / (365.2422 * 86400000)) ?? null;

  const b = new Date(Date.UTC(p.solarDate.year, p.solarDate.month - 1, p.solarDate.day));
  const n = new Date(now);
  let age = n.getUTCFullYear() - b.getUTCFullYear();
  if (n.getUTCMonth() < b.getUTCMonth() || (n.getUTCMonth() === b.getUTCMonth() && n.getUTCDate() < b.getUTCDate())) age--;

  return {
    input, pillars: p, warnings, positions, elements, strength, gyeokguk, yongsin, interactions, sinsal,
    daeun, currentDaeun, seun, wolun, age, now, currentSajuYear,
  };
}

export function pillarKo(p: Pillar): string {
  return STEMS[p.stem].ko + BRANCHES[p.branch].ko;
}
export function pillarHanja(p: Pillar): string {
  return STEMS[p.stem].hanja + BRANCHES[p.branch].hanja;
}
export { mainStemOf };
