/**
 * 오행 분포 · 신강/신약 · 격국 · 용신(억부/조후/특수격)
 *
 * 판단 근거를 단계별로 기록(reasoning)하여 사용자에게 그대로 보여준다.
 * 용신론은 학파마다 결론이 다를 수 있으므로, 억부·조후 결과를 모두 제시하고
 * 최종 선택 사유를 명시한다.
 */
import {
  BRANCHES, ELEMENTS, ELEMENT_KO, STEMS, controllerOf, controls, generatorOf, mainStemOf, type Element,
} from './constants.ts';
import type { Position } from './interactions.ts';
import { josa } from './josa.ts';
import {
  STAGE_ENERGY, elementOfGroup, groupOfElement, tenGodOfStem, twelveStage, type TenGod, type TenGodGroup,
} from './tenGods.ts';

export interface NatalChars {
  stems: { pos: Position; idx: number }[];
  branches: { pos: Position; idx: number }[];
  dayStem: number;
  monthBranch: number;
  /** 절입 후 경과일 (사령 판단) */
  daysSinceJie: number;
}

export const STEM_WEIGHT: Partial<Record<Position, number>> = { year: 1.0, month: 1.2, day: 1.0, hour: 1.0 };
export const BRANCH_WEIGHT: Partial<Record<Position, number>> = { year: 1.0, month: 3.0, day: 1.5, hour: 1.2 };

export type ElementMap = Record<Element, number>;
const zero = (): ElementMap => ({ wood: 0, fire: 0, earth: 0, metal: 0, water: 0 });

export interface ElementAnalysis {
  /** 8글자(또는 6글자) 단순 개수: 천간 오행 + 지지 본오행 */
  count: ElementMap;
  /** 지장간·월령 가중 세력 */
  weighted: ElementMap;
  /** 가중 세력 백분율 */
  percent: ElementMap;
  /** 십성 그룹별 가중 세력 백분율 (일간 제외) */
  groupPercent: Record<TenGodGroup, number>;
  /** 일간 제외 가중 세력 합계 */
  groupTotal: number;
  /** 십성별 개수(천간 + 지지 정기) — 일간 제외 */
  tenGodCount: Record<TenGod, number>;
  /** 지장간까지 포함한 십성 존재 여부 */
  tenGodHidden: Record<TenGod, number>;
  missing: Element[];
  excessive: Element[];
}

const SAMHAP_GROUPS: [number[], Element][] = [
  [[8, 0, 4], 'water'], [[2, 6, 10], 'fire'], [[5, 9, 1], 'metal'], [[11, 3, 7], 'wood'],
];
const BANGHAP_GROUPS: [number[], Element][] = [
  [[2, 3, 4], 'wood'], [[5, 6, 7], 'fire'], [[8, 9, 10], 'metal'], [[11, 0, 1], 'water'],
];
const POS_ORDER: Position[] = ['year', 'month', 'day', 'hour'];

/**
 * 합(合)에 의한 오행 이전 비율.
 * - 삼합·방합(3자 완성): 각 글자 세력의 50%가 합화 오행으로
 * - 왕지를 포함한 반합(인접): 25%
 * 합화가 '완전히' 일어났다고 단정하지 않고 일부만 이전하는 보수적 처리다.
 */
export function combinationTransfers(branches: { pos: Position; idx: number }[]): Map<Position, { element: Element; ratio: number }> {
  const out = new Map<Position, { element: Element; ratio: number }>();
  const setMax = (pos: Position, element: Element, ratio: number) => {
    const cur = out.get(pos);
    if (!cur || cur.ratio < ratio) out.set(pos, { element, ratio });
  };
  for (const [group, el] of [...SAMHAP_GROUPS, ...BANGHAP_GROUPS]) {
    const members = group.map((g) => branches.filter((b) => b.idx === g));
    const present = members.filter((m) => m.length > 0).length;
    if (present === 3) {
      for (const m of members) for (const b of m) setMax(b.pos, el, 0.5);
    }
  }
  for (const [group, el] of SAMHAP_GROUPS) {
    const wang = group[1];
    for (const w of branches.filter((b) => b.idx === wang)) {
      for (const other of branches) {
        if (other === w || !(other.idx === group[0] || other.idx === group[2])) continue;
        if (Math.abs(POS_ORDER.indexOf(other.pos) - POS_ORDER.indexOf(w.pos)) !== 1) continue;
        setMax(w.pos, el, 0.25);
        setMax(other.pos, el, 0.25);
      }
    }
  }
  return out;
}

export function analyzeElements(n: NatalChars): ElementAnalysis {
  const count = zero();
  const weighted = zero();
  const dayEl = STEMS[n.dayStem].element;
  const tgCount = Object.fromEntries(
    ['비견', '겁재', '식신', '상관', '편재', '정재', '편관', '정관', '편인', '정인'].map((k) => [k, 0]),
  ) as Record<TenGod, number>;
  const tgHidden = { ...tgCount };

  for (const s of n.stems) {
    const el = STEMS[s.idx].element;
    count[el] += 1;
    weighted[el] += STEM_WEIGHT[s.pos] ?? 1;
    if (s.pos !== 'day') tgCount[tenGodOfStem(n.dayStem, s.idx)] += 1;
  }
  const conv = combinationTransfers(n.branches);
  for (const b of n.branches) {
    const br = BRANCHES[b.idx];
    count[br.element] += 1;
    const w = BRANCH_WEIGHT[b.pos] ?? 1;
    const total = br.hidden.reduce((a, [, d]) => a + d, 0);
    // 삼합·방합·반합으로 합화 오행에 이전되는 비율
    const t = conv.get(b.pos);
    const keep = 1 - (t?.ratio ?? 0);
    for (const [stem, days] of br.hidden) {
      weighted[STEMS[stem].element] += (w * keep * days) / total;
      tgHidden[tenGodOfStem(n.dayStem, stem)] += 1;
    }
    if (t) weighted[t.element] += w * t.ratio;
    tgCount[tenGodOfStem(n.dayStem, mainStemOf(b.idx))] += 1;
  }
  const sum = ELEMENTS.reduce((a, e) => a + weighted[e], 0);
  const percent = zero();
  for (const e of ELEMENTS) percent[e] = (weighted[e] / sum) * 100;

  // 일간 제외 그룹 세력
  const groupW: Record<TenGodGroup, number> = { 비겁: 0, 식상: 0, 재성: 0, 관성: 0, 인성: 0 };
  let gsum = 0;
  for (const e of ELEMENTS) {
    let w = weighted[e];
    if (e === dayEl) w -= STEM_WEIGHT.day ?? 1;
    groupW[groupOfElement(dayEl, e)] += w;
    gsum += w;
  }
  const groupPercent = { ...groupW };
  for (const g of Object.keys(groupW) as TenGodGroup[]) groupPercent[g] = (groupW[g] / gsum) * 100;

  return {
    count,
    weighted,
    percent,
    groupPercent,
    groupTotal: gsum,
    tenGodCount: tgCount,
    tenGodHidden: tgHidden,
    missing: ELEMENTS.filter((e) => count[e] === 0),
    excessive: ELEMENTS.filter((e) => percent[e] >= 35 || count[e] >= 4),
  };
}

// ---------------------------------------------------------------------------
// 신강·신약
// ---------------------------------------------------------------------------
export type StrengthLevel = '극약' | '태약' | '신약' | '중화신약' | '중화신강' | '신강' | '태강' | '극왕';

export interface StrengthAnalysis {
  /** 0~100. 일간 자신을 포함한 아군(일간+비겁+인성) 세력 비율 */
  score: number;
  /** 일간 제외 비겁+인성 비율 (특수격 판정용) */
  supportExcl: number;
  level: StrengthLevel;
  deukryeong: boolean;
  deukji: boolean;
  deukse: boolean;
  /** 일간의 뿌리(통근) */
  roots: { pos: Position; branch: number; stage: string; strength: '강' | '중' | '약' }[];
  /** 사령(司令): 절입 후 경과일로 본 월지의 당령 천간 */
  saryeong: number;
  reasoning: string[];
}

export function saryeongStem(monthBranch: number, daysSinceJie: number): number {
  const hidden = BRANCHES[monthBranch].hidden;
  let acc = 0;
  for (const [stem, days] of hidden) {
    acc += days;
    if (daysSinceJie < acc) return stem;
  }
  return hidden[hidden.length - 1][0];
}

export function analyzeStrength(n: NatalChars, el: ElementAnalysis): StrengthAnalysis {
  const dayEl = STEMS[n.dayStem].element;
  const supports = (e: Element) => e === dayEl || e === generatorOf(dayEl);
  const reasoning: string[] = [];

  // 일간 자신도 세력에 포함(전통적 '8글자 중 아군 수' 방식). 50% = 아군과 적군의 균형
  const supportExcl = el.groupPercent['비겁'] + el.groupPercent['인성'];
  const dw = STEM_WEIGHT.day ?? 1;
  const others = el.groupTotal;
  const score = ((supportExcl / 100) * others + dw) / (others + dw) * 100;
  const monthMain = STEMS[mainStemOf(n.monthBranch)].element;
  const deukryeong = supports(monthMain);
  const dayBranch = n.branches.find((b) => b.pos === 'day')!;
  const deukji = supports(STEMS[mainStemOf(dayBranch.idx)].element);
  const rest = [
    ...n.stems.filter((s) => s.pos !== 'day').map((s) => STEMS[s.idx].element),
    ...n.branches.filter((b) => b.pos !== 'month' && b.pos !== 'day').map((b) => STEMS[mainStemOf(b.idx)].element),
  ];
  const supCount = rest.filter(supports).length;
  const deukse = supCount * 2 > rest.length;

  const roots: StrengthAnalysis['roots'] = [];
  for (const b of n.branches) {
    if (BRANCHES[b.idx].hidden.some(([s]) => STEMS[s].element === dayEl)) {
      const stage = twelveStage(n.dayStem, b.idx);
      const energy = STAGE_ENERGY[stage];
      const isMain = STEMS[mainStemOf(b.idx)].element === dayEl;
      roots.push({ pos: b.pos, branch: b.idx, stage, strength: isMain ? '강' : energy >= 6 ? '중' : '약' });
    }
  }

  const saryeong = saryeongStem(n.monthBranch, n.daysSinceJie);

  let level: StrengthLevel;
  if (score >= 80) level = '극왕';
  else if (score >= 68) level = '태강';
  else if (score >= 56) level = '신강';
  else if (score >= 48) level = '중화신강';
  else if (score >= 40) level = '중화신약';
  else if (score >= 29) level = '신약';
  else if (score >= 18) level = '태약';
  else level = '극약';

  // 뿌리가 전혀 없으면 한 단계 낮춤 (천간만 도와도 기반이 약함)
  if (roots.length === 0 && score < 56 && level !== '극약') {
    const order: StrengthLevel[] = ['극약', '태약', '신약', '중화신약', '중화신강', '신강', '태강', '극왕'];
    level = order[Math.max(0, order.indexOf(level) - 1)];
    reasoning.push('지지에 일간의 뿌리(통근)가 없어 실제 힘은 수치보다 약하게 봅니다.');
  }

  reasoning.unshift(
    `득령(월지가 일간을 도움): ${deukryeong ? 'O' : 'X'} — 월지 ${BRANCHES[n.monthBranch].hanja}의 본기 ${ELEMENT_KO[monthMain]}`,
    `득지(일지가 일간을 도움): ${deukji ? 'O' : 'X'} — 일지 ${BRANCHES[dayBranch.idx].hanja}`,
    `득세(나머지 글자 과반이 도움): ${deukse ? 'O' : 'X'} — ${rest.length}자 중 ${supCount}자`,
    `일간 포함 아군 세력(일간+비겁+인성, 지장간·월령·합 가중) ${score.toFixed(1)}% → ${level}`,
    roots.length
      ? `통근: ${roots.map((r) => `${BRANCHES[r.branch].hanja}(${r.stage}, ${r.strength})`).join(', ')}`
      : '통근: 없음',
    `사령(司令): 절입 후 ${n.daysSinceJie.toFixed(1)}일 → ${STEMS[saryeong].hanja}${STEMS[saryeong].ko} 당령`,
  );

  return { score, supportExcl, level, deukryeong, deukji, deukse, roots, saryeong, reasoning };
}

// ---------------------------------------------------------------------------
// 격국
// ---------------------------------------------------------------------------
export interface Gyeokguk {
  name: string;
  /** 격을 이룬 천간 */
  stem: number;
  tenGod: TenGod;
  transparent: boolean;
  description: string;
}

const ROK: Record<number, number> = { 0: 2, 1: 3, 2: 5, 3: 6, 4: 5, 5: 6, 6: 8, 7: 9, 8: 11, 9: 0 };
const YANGIN: Record<number, number> = { 0: 3, 2: 6, 4: 6, 6: 9, 8: 0 };

export function analyzeGyeokguk(n: NatalChars): Gyeokguk {
  const dayEl = STEMS[n.dayStem].element;
  if (ROK[n.dayStem] === n.monthBranch) {
    return {
      name: '건록격', stem: mainStemOf(n.monthBranch), tenGod: '비견', transparent: true,
      description: '월지에 일간의 록(祿)이 있어 자립심이 강하고 자기 힘으로 일어서는 구조. 재·관을 갖춰야 크게 쓰임',
    };
  }
  if (YANGIN[n.dayStem] === n.monthBranch) {
    return {
      name: '양인격', stem: mainStemOf(n.monthBranch), tenGod: '겁재', transparent: true,
      description: '월지가 양인. 강한 힘을 관살로 제어해야 빛나는 구조. 제어가 없으면 과격·고집으로 손해',
    };
  }
  const hidden = BRANCHES[n.monthBranch].hidden;
  const visible = n.stems.filter((s) => s.pos !== 'day');
  // 비겁은 격을 이루지 않으므로 제외. 정기 → 중기 → 여기 순, 월간 투출 우선
  const candidates = [...hidden].reverse().map(([stem]) => stem).filter((stem) => STEMS[stem].element !== dayEl);
  let chosen: { stem: number; transparent: boolean } | null = null;
  for (const stem of candidates) {
    if (visible.some((v) => v.idx === stem && v.pos === 'month')) {
      chosen = { stem, transparent: true };
      break;
    }
  }
  if (!chosen) {
    for (const stem of candidates) {
      if (visible.some((v) => v.idx === stem)) {
        chosen = { stem, transparent: true };
        break;
      }
    }
  }
  if (!chosen) {
    const main = mainStemOf(n.monthBranch);
    if (STEMS[main].element === dayEl) {
      return {
        name: '월겁격', stem: main, tenGod: tenGodOfStem(n.dayStem, main), transparent: false,
        description: '월지 본기가 비겁. 경쟁심과 독립성이 강함. 재물은 경쟁 속에서 얻고 지키는 데 힘이 듦',
      };
    }
    chosen = { stem: main, transparent: false };
  }

  const tg = tenGodOfStem(n.dayStem, chosen.stem);
  const map: Record<string, string> = {
    식신: '식신격', 상관: '상관격', 편재: '편재격', 정재: '정재격', 편관: '편관격(칠살격)',
    정관: '정관격', 편인: '편인격', 정인: '정인격',
  };
  const name = map[tg];
  const desc: Record<string, string> = {
    식신격: '전문성·생산·표현으로 먹고사는 구조. 꾸준함이 성공 조건',
    상관격: '재능·언변·혁신. 기존 질서에 도전. 관(官)과 충돌 시 구설',
    편재격: '활동형 재물·사업·유통. 크게 벌고 크게 쓰는 흐름',
    정재격: '안정적 수입·관리·절약. 성실함이 곧 재산',
    '편관격(칠살격)': '압박 속에서 성장하는 구조. 제어되면 권위·리더십, 안 되면 스트레스·사고',
    정관격: '조직·규범·명예. 안정된 직장·공직과 잘 맞음',
    편인격: '특수 기술·연구·직관. 비주류 분야에서 강함',
    정인격: '학문·자격·문서·보호. 교육·연구·공공 분야',
  };
  let description = desc[name];
  if (!chosen.transparent) description += ' (월지 지장간이 천간에 투출하지 않아 격의 힘은 다소 약함)';
  return { name, stem: chosen.stem, tenGod: tg, transparent: chosen.transparent, description };
}

// ---------------------------------------------------------------------------
// 조후 (궁통보감 요약표: 일간 × 월지 → 필요한 천간 우선순위)
// ---------------------------------------------------------------------------
// 키: 일간 index, 값: 월지 index(子=0 ...) → 천간 index 배열
const JOHU: Record<number, Record<number, number[]>> = {
  0: { 2: [2, 9], 3: [6, 2, 3, 4, 5], 4: [6, 3, 8], 5: [9, 3, 6], 6: [9, 3, 6], 7: [9, 3, 6], 8: [6, 3, 8], 9: [6, 3, 2], 10: [6, 0, 3, 8, 9], 11: [6, 3, 2, 4], 0: [3, 6, 2], 1: [3, 6, 2] },
  1: { 2: [2, 9], 3: [2, 9], 4: [9, 2, 4], 5: [9], 6: [9, 2], 7: [9, 2], 8: [2, 9, 5], 9: [9, 2, 3], 10: [9, 7], 11: [2, 4], 0: [2], 1: [2] },
  2: { 2: [8, 6], 3: [8, 5], 4: [8, 0], 5: [8, 9, 6], 6: [8, 6], 7: [8, 6], 8: [8, 4], 9: [8, 9], 10: [0, 8], 11: [0, 4, 6, 8], 0: [8, 4, 5], 1: [8, 0] },
  3: { 2: [0, 6], 3: [6, 0], 4: [0, 6], 5: [0, 6], 6: [8, 6, 9], 7: [0, 8, 6], 8: [0, 6, 2, 4], 9: [0, 6, 2, 4], 10: [0, 6, 4], 11: [0, 6], 0: [0, 6], 1: [0, 6] },
  4: { 2: [2, 0, 9], 3: [2, 0, 9], 4: [0, 2, 9], 5: [0, 2, 9], 6: [8, 0, 2], 7: [9, 2, 0], 8: [2, 9, 0], 9: [2, 9], 10: [0, 2, 9], 11: [0, 2], 0: [2, 0], 1: [2, 0] },
  5: { 2: [2, 6, 0], 3: [0, 9, 2], 4: [2, 9, 0], 5: [9, 2], 6: [9, 2], 7: [9, 2], 8: [2, 9], 9: [2, 9], 10: [0, 2, 9], 11: [2, 0, 4], 0: [2, 0, 4], 1: [2, 0, 4] },
  6: { 2: [4, 0, 8, 2, 3], 3: [3, 0, 6, 2], 4: [0, 3, 8, 9], 5: [8, 4, 2, 3], 6: [8, 9], 7: [3, 0], 8: [3, 0], 9: [3, 0, 2], 10: [0, 8], 11: [3, 2], 0: [3, 0, 2], 1: [2, 3, 0] },
  7: { 2: [5, 8, 6], 3: [8, 0], 4: [8, 0], 5: [8, 0, 9], 6: [8, 5, 9], 7: [8, 6, 0], 8: [8, 0, 4], 9: [8, 0], 10: [8, 0], 11: [8, 2], 0: [2, 4, 8, 0], 1: [2, 8, 4, 5] },
  8: { 2: [6, 2, 4], 3: [4, 7, 6], 4: [0, 6], 5: [8, 7, 6, 9], 6: [9, 6, 7], 7: [7, 0], 8: [4, 3], 9: [0, 6], 10: [0, 2], 11: [4, 2, 6], 0: [4, 2], 1: [2, 3, 0] },
  9: { 2: [7, 2], 3: [6, 7], 4: [2, 7, 0], 5: [7], 6: [6, 7, 8, 9], 7: [6, 7, 8, 9], 8: [3], 9: [7, 2], 10: [7, 0, 8, 9], 11: [6, 7, 4, 3], 0: [2, 7], 1: [2, 3] },
};

export function johuStems(dayStem: number, monthBranch: number): number[] {
  return JOHU[dayStem]?.[monthBranch] ?? [];
}

// ---------------------------------------------------------------------------
// 용신
// ---------------------------------------------------------------------------
export type GodRole = '용신' | '희신' | '기신' | '구신' | '한신';

export interface YongsinAnalysis {
  /** 최종 용신 오행 */
  yongsin: Element;
  heesin: Element;
  gisin: Element;
  gusin: Element;
  hansin: Element;
  roles: Record<Element, GodRole>;
  /**
   * 운 평가용 오행 점수(-2~+2). 억부·조후가 충돌하면 두 관점을 6:4로 혼합해
   * 한 학설에만 의존한 극단적 판정을 피한다.
   */
  elementScore: Record<Element, number>;
  method: '억부' | '조후' | '종격' | '종왕';
  eokbu: Element;
  eokbuReason: string;
  johu: { stems: number[]; element: Element | null; urgent: boolean; reason: string };
  special: string | null;
  reasoning: string[];
  /** 결론의 확실성 */
  confidence: '높음' | '보통' | '낮음';
}

/** 용신 오행으로부터 5신(용·희·기·구·한) 배정 */
export function rolesFor(yongsin: Element): Record<Element, GodRole> {
  const heesin = generatorOf(yongsin);
  const gisin = controllerOf(yongsin);
  const gusin = generatorOf(gisin);
  const hansin = ELEMENTS.find((e) => ![yongsin, heesin, gisin, gusin].includes(e))!;
  return { [yongsin]: '용신', [heesin]: '희신', [gisin]: '기신', [gusin]: '구신', [hansin]: '한신' } as Record<Element, GodRole>;
}

export function analyzeYongsin(n: NatalChars, el: ElementAnalysis, st: StrengthAnalysis): YongsinAnalysis {
  const dayEl = STEMS[n.dayStem].element;
  const gp = el.groupPercent;
  const E = (g: TenGodGroup) => elementOfGroup(dayEl, g);
  const reasoning: string[] = [];
  let confidence: YongsinAnalysis['confidence'] = '보통';

  // 1) 억부
  let eokbu: Element;
  let eokbuReason: string;
  if (st.score >= 48) {
    if (gp['인성'] > gp['비겁'] * 1.2) {
      eokbu = E('재성');
      eokbuReason = `인성(${gp['인성'].toFixed(0)}%)이 과해 신강하므로 재성으로 인성을 제어(재극인)`;
    } else if (gp['관성'] >= 30) {
      eokbu = E('식상');
      eokbuReason = `비겁(${gp['비겁'].toFixed(0)}%)으로 신강하지만 관살(${gp['관성'].toFixed(0)}%)도 이미 강해 더 보태지 않고, 식상으로 비겁을 설기하면서 관살을 제어(식상제살)`;
    } else if (gp['관성'] >= 8) {
      eokbu = E('관성');
      eokbuReason = `비겁(${gp['비겁'].toFixed(0)}%)으로 신강하고 관성(${gp['관성'].toFixed(0)}%)이 쓸 만큼 있어 관성으로 비겁을 제어`;
    } else {
      eokbu = E('식상');
      eokbuReason = `비겁(${gp['비겁'].toFixed(0)}%)으로 신강하나 관성이 약해(${gp['관성'].toFixed(0)}%) 식상으로 힘을 설기(식상생재 구조 지향)`;
    }
  } else {
    const opp: [TenGodGroup, number][] = [['관성', gp['관성']], ['식상', gp['식상']], ['재성', gp['재성']]];
    opp.sort((a, b) => b[1] - a[1]);
    const top = opp[0][0];
    if (top === '재성') {
      eokbu = E('비겁');
      eokbuReason = `재성(${gp['재성'].toFixed(0)}%)이 가장 강해 신약(재다신약)하므로 비겁으로 재성을 감당`;
    } else if (top === '관성') {
      eokbu = E('인성');
      eokbuReason = `관성(${gp['관성'].toFixed(0)}%)이 가장 강해 신약하므로 인성으로 관을 흡수해 일간을 생함(살인상생)`;
    } else {
      eokbu = E('인성');
      eokbuReason = `식상(${gp['식상'].toFixed(0)}%)이 가장 강해 신약하므로 인성으로 식상을 제어하고 일간을 생함`;
    }
  }
  if (st.score >= 43 && st.score < 54) {
    confidence = '낮음';
    reasoning.push('신강·신약 경계(중화)에 가까워 억부용신의 효과 차이가 크지 않습니다. 운의 흐름에서 체감이 약할 수 있습니다.');
  }
  reasoning.push(`억부용신: ${ELEMENT_KO[eokbu]} — ${eokbuReason}`);

  // 2) 조후
  const jStems = johuStems(n.dayStem, n.monthBranch);
  const mb = n.monthBranch;
  const winter = [11, 0, 1].includes(mb);
  const summer = [5, 6, 7].includes(mb);
  let johuEl: Element | null = jStems.length ? STEMS[jStems[0]].element : null;
  let urgent = false;
  let johuReason = '';
  if (winter && el.percent.fire < 12) {
    urgent = true;
    johuEl = 'fire';
    johuReason = `겨울(${BRANCHES[mb].hanja}월) 출생에 화(火)가 ${el.percent.fire.toFixed(0)}%로 부족해 한습(寒濕)함 → 따뜻하게 하는 화가 급함`;
  } else if (summer && el.percent.water < 12) {
    urgent = true;
    johuEl = 'water';
    johuReason = `여름(${BRANCHES[mb].hanja}월) 출생에 수(水)가 ${el.percent.water.toFixed(0)}%로 부족해 조열(燥熱)함 → 식혀 주는 수가 급함`;
  } else if (jStems.length) {
    johuReason = `궁통보감 기준 ${STEMS[n.dayStem].hanja}일간 ${BRANCHES[mb].hanja}월의 조후 천간: ${jStems.map((s) => STEMS[s].hanja).join('·')}. 계절 편중이 심하지 않아 참고 사항`;
  }
  reasoning.push(`조후: ${johuReason}`);

  // 3) 특수격(종격) 검토
  let special: string | null = null;
  let method: YongsinAnalysis['method'] = '억부';
  let yongsin = eokbu;
  let secondary: Element | null = null;
  const visibleSupport = n.stems.some((x) => x.pos !== 'day' && (STEMS[x.idx].element === dayEl || STEMS[x.idx].element === generatorOf(dayEl)));
  if (st.supportExcl < 12 && st.roots.length === 0 && !visibleSupport && gp['인성'] < 5) {
    const opp: [TenGodGroup, number][] = [['관성', gp['관성']], ['식상', gp['식상']], ['재성', gp['재성']]];
    opp.sort((a, b) => b[1] - a[1]);
    const g = opp[0][0];
    special = { 관성: '종살격', 식상: '종아격', 재성: '종재격' }[g as '관성' | '식상' | '재성'];
    method = '종격';
    yongsin = E(g);
    confidence = '낮음';
    reasoning.push(
      `일간이 극히 약하고(${st.score.toFixed(0)}%) 뿌리·인성이 없어 ${special} 가능성이 있습니다. 이 경우 약한 일간을 돕지 않고 가장 강한 ${g}의 흐름을 따르는 것이 용신입니다. 특수격은 판정이 까다로워 전문가 대면 확인을 권합니다.`,
    );
  } else if (st.supportExcl >= 85 && gp['관성'] < 5 && gp['재성'] < 6) {
    special = gp['인성'] > gp['비겁'] ? '종강격' : '종왕격';
    method = '종왕';
    yongsin = gp['인성'] > gp['비겁'] ? E('인성') : E('비겁');
    confidence = '낮음';
    reasoning.push(
      `일간을 돕는 세력이 압도적이고(${st.score.toFixed(0)}%) 극하는 기운이 거의 없어 ${special} 가능성이 있습니다. 이 경우 강한 기운을 거스르지 않는 ${josa(ELEMENT_KO[yongsin], '이/가')} 용신입니다.`,
    );
  } else if (urgent && johuEl && johuEl !== eokbu) {
    const conflict = controls(johuEl, eokbu) || controls(eokbu, johuEl);
    const extreme = winter ? el.percent.fire < 5 || el.percent.water >= 35 : el.percent.water < 5 || el.percent.fire >= 35;
    if (!conflict || extreme) {
      method = '조후';
      yongsin = johuEl;
      secondary = conflict ? eokbu : null;
      reasoning.push(
        conflict
          ? `계절 편중이 극심해(${winter ? '한랭' : '조열'}) 조후 ${josa(ELEMENT_KO[johuEl], '을/를')} 최종 용신으로 봅니다. 다만 억부용신 ${josa(ELEMENT_KO[eokbu], '과/와')} 서로 극하는 관계라, 운 평가는 조후 60%·억부 40%로 혼합했습니다.`
          : `계절 편중이 심해 조후를 우선합니다. 최종 용신 ${ELEMENT_KO[johuEl]}, 억부용신 ${josa(ELEMENT_KO[eokbu], '은/는')} 보조로 봅니다.`,
      );
    } else {
      secondary = johuEl;
      reasoning.push(
        `조후(${ELEMENT_KO[johuEl]})와 억부(${ELEMENT_KO[eokbu]})가 서로 극하는 관계입니다. 편중이 극단적이지 않아 억부를 우선하고, 운 평가는 억부 60%·조후 40%로 혼합했습니다.`,
      );
    }
    if (conflict) confidence = '낮음';
  } else {
    reasoning.push(`최종 용신은 억부용신 ${josa(ELEMENT_KO[eokbu], '을/를')} 씁니다.`);
    if (confidence !== '낮음' && (st.score < 36 || st.score > 62)) confidence = '높음';
  }

  const roles = rolesFor(yongsin);
  const heesin = generatorOf(yongsin);
  const gisin = controllerOf(yongsin);
  const gusin = generatorOf(gisin);
  const hansin = ELEMENTS.find((e) => ![yongsin, heesin, gisin, gusin].includes(e))!;

  const ROLE_SCORE: Record<GodRole, number> = { 용신: 2, 희신: 1, 한신: 0, 구신: -1, 기신: -2 };
  const elementScore = {} as Record<Element, number>;
  const secRoles = secondary ? rolesFor(secondary) : null;
  for (const e of ELEMENTS) {
    elementScore[e] = secRoles ? ROLE_SCORE[roles[e]] * 0.6 + ROLE_SCORE[secRoles[e]] * 0.4 : ROLE_SCORE[roles[e]];
  }

  return {
    yongsin, heesin, gisin, gusin, hansin, roles, elementScore, method, eokbu, eokbuReason,
    johu: { stems: jStems, element: johuEl, urgent, reason: johuReason },
    special, reasoning, confidence,
  };
}
