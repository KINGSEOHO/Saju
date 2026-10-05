/** 대운 · 세운 · 월운 */
import { solarTermInYear } from './astro.ts';
import { BRANCHES, JIE_LONGITUDES, JIE_NAMES, STEMS, ganzhi, ganzhiIndex, mainStemOf, type Element } from './constants.ts';
import { luckInteractions, type Interaction, type Position } from './interactions.ts';
import { jieAround, monthPillarOf, yearPillarOf, type Gender, type Pillar } from './pillars.ts';
import type { GodRole } from './strength.ts';
import { tenGodOfBranch, tenGodOfStem, twelveStage, type TenGod, type TwelveStage } from './tenGods.ts';

export interface LuckPillar {
  pillar: Pillar;
  stemTenGod: TenGod;
  branchTenGod: TenGod;
  stage: TwelveStage;
  stemRole: GodRole;
  branchRole: GodRole;
  /** 0~100, 50 = 중립 */
  score: number;
  interactions: Interaction[];
  /** 일지 충/합, 월지 충 등 핵심 신호 */
  flags: string[];
}

export interface Daeun extends LuckPillar {
  /** 시작 나이(만, 소수) */
  startAge: number;
  startYear: number;
  endYear: number;
}

export interface DaeunInfo {
  forward: boolean;
  /** 절입까지(또는 절입부터) 일수 */
  diffDays: number;
  /** 전통 대운수 (반올림) */
  daeunsu: number;
  /** 정밀 대운 시작 시점 */
  startMs: number;
  startAgeYears: number;
  startAgeMonths: number;
  list: Daeun[];
  basisJie: string;
}

interface NatalCtx {
  dayStem: number;
  roles: Record<Element, GodRole>;
  elementScore: Record<Element, number>;
  stems: { pos: Position; idx: number }[];
  branches: { pos: Position; idx: number }[];
}

function branchElementScore(branch: number, score: Record<Element, number>): number {
  const h = BRANCHES[branch].hidden;
  const total = h.reduce((a, [, d]) => a + d, 0);
  return h.reduce((a, [s, d]) => a + (score[STEMS[s].element] * d) / total, 0);
}

export function evaluateLuck(
  ctx: NatalCtx,
  stem: number,
  branch: number,
  pos: Position,
  stemWeight: number,
): LuckPillar {
  const stemRole = ctx.roles[STEMS[stem].element];
  const branchRole = ctx.roles[STEMS[mainStemOf(branch)].element];
  let raw = ctx.elementScore[STEMS[stem].element] * stemWeight + branchElementScore(branch, ctx.elementScore) * (1 - stemWeight);
  const inter = luckInteractions(ctx.stems, ctx.branches, stem, branch, pos);
  const flags: string[] = [];
  for (const it of inter) {
    if (it.kind === '육충' && it.positions.includes('day')) {
      flags.push('일지충: 배우자·주거·건강의 변동');
      raw -= 0.25;
    }
    if (it.kind === '육충' && it.positions.includes('month')) {
      flags.push('월지충: 직장·사회적 환경의 변동');
      raw -= 0.15;
    }
    if (it.kind === '육합' && it.positions.includes('day')) flags.push('일지합: 인연·결속(연애·결혼 신호)');
    if ((it.kind === '삼형' || it.kind === '형') && it.positions.length >= 2) flags.push(`${it.chars} 형: 마찰·법적 문제·수술 주의`);
    if (it.kind === '천간합' && it.positions.includes('day')) flags.push('일간합: 묶임·새로운 관계 또는 계약');
  }
  // raw ∈ [-2, 2] → 15~85 (원국과의 충·형으로 추가 하락 가능). 극단적 단정(0점·100점)을 피한다.
  const score = Math.max(5, Math.min(95, Math.round(50 + raw * 17.5)));
  return {
    pillar: { stem, branch, index: ganzhiIndex(stem, branch) },
    stemTenGod: tenGodOfStem(ctx.dayStem, stem),
    branchTenGod: tenGodOfBranch(ctx.dayStem, branch),
    stage: twelveStage(ctx.dayStem, branch),
    stemRole,
    branchRole,
    score,
    interactions: inter,
    flags: [...new Set(flags)],
  };
}

const YEAR_MS = 365.2422 * 86400000;

export function computeDaeun(
  ctx: NatalCtx,
  birthUtcMs: number,
  yearStem: number,
  monthPillar: Pillar,
  gender: Gender,
): DaeunInfo {
  const yang = STEMS[yearStem].polarity === 'yang';
  const forward = (yang && gender === 'male') || (!yang && gender === 'female');
  const { prev, next } = jieAround(birthUtcMs);
  const target = forward ? next : prev;
  const diffDays = Math.abs(target.ms - birthUtcMs) / 86400000;
  const daeunsu = Math.max(1, Math.round(diffDays / 3));
  const startYearsPrecise = diffDays / 3;
  const startMs = birthUtcMs + startYearsPrecise * YEAR_MS;
  const startAgeYears = Math.floor(startYearsPrecise);
  const startAgeMonths = Math.floor((startYearsPrecise - startAgeYears) * 12);

  const list: Daeun[] = [];
  for (let i = 1; i <= 10; i++) {
    const idx = (monthPillar.index + (forward ? i : -i) + 600) % 60;
    const g = ganzhi(idx);
    const lp = evaluateLuck(ctx, g.stem, g.branch, 'daeun', 0.4);
    const startAge = startYearsPrecise + (i - 1) * 10;
    const sYear = new Date(startMs + (i - 1) * 10 * YEAR_MS).getUTCFullYear();
    list.push({ ...lp, startAge, startYear: sYear, endYear: sYear + 9 });
  }
  return {
    forward, diffDays, daeunsu, startMs, startAgeYears, startAgeMonths, list,
    basisJie: `${target.name}(${forward ? '다음' : '이전'} 절입)`,
  };
}

export interface Seun extends LuckPillar {
  year: number;
  /** 만 나이(그 해 생일 이후 기준) */
  age: number;
  daeun: Daeun | null;
  /** 대운과 합산한 종합 점수 */
  combined: number;
}

export function computeSeun(ctx: NatalCtx, daeun: DaeunInfo, birthYear: number, fromYear: number, toYear: number): Seun[] {
  const out: Seun[] = [];
  for (let y = fromYear; y <= toYear; y++) {
    const p = yearPillarOf(y);
    const lp = evaluateLuck(ctx, p.stem, p.branch, 'seun', 0.5);
    // 해당 연도 중반 기준 대운
    const mid = Date.UTC(y, 6, 1);
    const d = [...daeun.list].reverse().find((x) => Date.UTC(x.startYear, 0, 1) <= mid) ?? null;
    const combined = d ? Math.round(lp.score * 0.55 + d.score * 0.45) : lp.score;
    out.push({ ...lp, year: y, age: y - birthYear, daeun: d, combined });
  }
  return out;
}

export interface Wolun extends LuckPillar {
  sajuYear: number;
  jieName: string;
  startMs: number;
}

/** 사주 연도(입춘~다음 입춘)의 12개월 월운 */
export function computeWolun(ctx: NatalCtx, sajuYear: number): Wolun[] {
  const yp = yearPillarOf(sajuYear);
  const out: Wolun[] = [];
  for (let order = 0; order < 12; order++) {
    const p = monthPillarOf(yp.stem, order);
    const lon = JIE_LONGITUDES[order];
    const gy = order >= 11 ? sajuYear + 1 : sajuYear; // 소한(축월)은 다음 해 1월
    const t = solarTermInYear(gy, lon);
    const lp = evaluateLuck(ctx, p.stem, p.branch, 'wolun', 0.4);
    out.push({ ...lp, sajuYear, jieName: JIE_NAMES[order], startMs: t.ms });
  }
  return out;
}
