/** 합(合)·충(沖)·형(刑)·파(破)·해(害)·원진·귀문 */
import { BRANCHES, STEMS, type Element } from './constants.ts';

export type Position = 'year' | 'month' | 'day' | 'hour' | 'daeun' | 'seun' | 'wolun';
export const POSITION_KO: Record<Position, string> = {
  year: '년', month: '월', day: '일', hour: '시', daeun: '대운', seun: '세운', wolun: '월운',
};

export type InteractionKind =
  | '천간합' | '천간충' | '육합' | '삼합' | '반합' | '방합' | '육충' | '삼형' | '형' | '자형' | '파' | '해' | '원진' | '귀문';

export interface Interaction {
  kind: InteractionKind;
  positions: Position[];
  chars: string;
  /** 합화 오행 등 */
  element?: Element;
  /** 인접 여부 (원국에서 붙어 있으면 작용력 큼) */
  adjacent: boolean;
  description: string;
}

interface Item {
  pos: Position;
  idx: number;
}

const STEM_HAP: [number, number, Element][] = [
  [0, 5, 'earth'], [1, 6, 'metal'], [2, 7, 'water'], [3, 8, 'wood'], [4, 9, 'fire'],
];
const STEM_CHUNG: [number, number][] = [[0, 6], [1, 7], [2, 8], [3, 9]];

const YUKHAP: [number, number, Element][] = [
  [0, 1, 'earth'], [2, 11, 'wood'], [3, 10, 'fire'], [4, 9, 'metal'], [5, 8, 'water'], [6, 7, 'fire'],
];
const SAMHAP: [number[], Element][] = [
  [[8, 0, 4], 'water'], [[2, 6, 10], 'fire'], [[5, 9, 1], 'metal'], [[11, 3, 7], 'wood'],
];
const BANGHAP: [number[], Element][] = [
  [[2, 3, 4], 'wood'], [[5, 6, 7], 'fire'], [[8, 9, 10], 'metal'], [[11, 0, 1], 'water'],
];
const CHUNG: [number, number][] = [[0, 6], [1, 7], [2, 8], [3, 9], [4, 10], [5, 11]];
const PA: [number, number][] = [[0, 9], [6, 3], [8, 5], [2, 11], [4, 1], [10, 7]];
const HAE: [number, number][] = [[0, 7], [1, 6], [2, 5], [3, 4], [8, 11], [9, 10]];
const WONJIN: [number, number][] = [[0, 7], [1, 6], [2, 9], [3, 8], [4, 11], [5, 10]];
const GWIMUN: [number, number][] = [[0, 9], [1, 6], [2, 7], [3, 8], [4, 11], [5, 10]];
const SAMHYEONG: number[][] = [[2, 5, 8], [1, 10, 7]];
const JAHYEONG = [4, 6, 9, 11];

const ORDER: Position[] = ['year', 'month', 'day', 'hour'];
function isAdjacent(a: Position, b: Position): boolean {
  const ia = ORDER.indexOf(a);
  const ib = ORDER.indexOf(b);
  if (ia < 0 || ib < 0) return false;
  return Math.abs(ia - ib) === 1;
}

function pairMatch<T extends [number, number, ...unknown[]]>(table: T[], a: number, b: number): T | undefined {
  return table.find((t) => (t[0] === a && t[1] === b) || (t[0] === b && t[1] === a));
}

const ELEMENT_KO: Record<Element, string> = { wood: '목', fire: '화', earth: '토', metal: '금', water: '수' };

export function findInteractions(stems: Item[], branches: Item[]): Interaction[] {
  const out: Interaction[] = [];
  const sName = (i: number) => STEMS[i].hanja;
  const bName = (i: number) => BRANCHES[i].hanja;

  // 천간
  for (let i = 0; i < stems.length; i++) {
    for (let j = i + 1; j < stems.length; j++) {
      const a = stems[i];
      const b = stems[j];
      const hap = pairMatch(STEM_HAP, a.idx, b.idx);
      if (hap) {
        out.push({
          kind: '천간합',
          positions: [a.pos, b.pos],
          chars: sName(a.idx) + sName(b.idx),
          element: hap[2],
          adjacent: isAdjacent(a.pos, b.pos),
          description: `${sName(a.idx)}${sName(b.idx)} 합(${ELEMENT_KO[hap[2]]}). 두 기운이 묶여 본래 작용이 약해지거나 성질이 바뀜`,
        });
      }
      if (pairMatch(STEM_CHUNG as [number, number][], a.idx, b.idx)) {
        out.push({
          kind: '천간충',
          positions: [a.pos, b.pos],
          chars: sName(a.idx) + sName(b.idx),
          adjacent: isAdjacent(a.pos, b.pos),
          description: `${sName(a.idx)}${sName(b.idx)} 충. 생각·의사결정에서의 충돌, 외부 갈등`,
        });
      }
    }
  }

  // 지지 2자 관계
  for (let i = 0; i < branches.length; i++) {
    for (let j = i + 1; j < branches.length; j++) {
      const a = branches[i];
      const b = branches[j];
      const adj = isAdjacent(a.pos, b.pos);
      const chars = bName(a.idx) + bName(b.idx);
      const yh = pairMatch(YUKHAP, a.idx, b.idx);
      if (yh) out.push({ kind: '육합', positions: [a.pos, b.pos], chars, element: yh[2], adjacent: adj, description: `${chars} 육합. 결속·인연·묶임` });
      if (pairMatch(CHUNG as [number, number][], a.idx, b.idx))
        out.push({ kind: '육충', positions: [a.pos, b.pos], chars, adjacent: adj, description: `${chars} 충. 변동·이동·분리·충돌` });
      if (pairMatch(PA as [number, number][], a.idx, b.idx))
        out.push({ kind: '파', positions: [a.pos, b.pos], chars, adjacent: adj, description: `${chars} 파. 깨짐·계획 어긋남` });
      if (pairMatch(HAE as [number, number][], a.idx, b.idx))
        out.push({ kind: '해', positions: [a.pos, b.pos], chars, adjacent: adj, description: `${chars} 해. 은근한 방해·서운함` });
      if (pairMatch(WONJIN as [number, number][], a.idx, b.idx))
        out.push({ kind: '원진', positions: [a.pos, b.pos], chars, adjacent: adj, description: `${chars} 원진. 이유 없는 미움·애증` });
      if (pairMatch(GWIMUN as [number, number][], a.idx, b.idx))
        out.push({ kind: '귀문', positions: [a.pos, b.pos], chars, adjacent: adj, description: `${chars} 귀문. 예민함·직관·신경과민` });
      if ((a.idx === 0 && b.idx === 3) || (a.idx === 3 && b.idx === 0))
        out.push({ kind: '형', positions: [a.pos, b.pos], chars, adjacent: adj, description: `${chars} 무례지형. 가까운 관계의 예의 문제·갈등` });
      if (a.idx === b.idx && JAHYEONG.includes(a.idx))
        out.push({ kind: '자형', positions: [a.pos, b.pos], chars, adjacent: adj, description: `${chars} 자형. 스스로를 괴롭히는 경향·자책` });
    }
  }

  // 삼합 / 반합 / 방합 / 삼형
  const present = (idx: number) => branches.filter((b) => b.idx === idx);
  for (const [group, el] of SAMHAP) {
    const found = group.map(present);
    const cnt = found.filter((f) => f.length > 0).length;
    if (cnt === 3) {
      out.push({
        kind: '삼합',
        positions: found.map((f) => f[0].pos),
        chars: group.map(bName).join(''),
        element: el,
        adjacent: true,
        description: `${group.map(bName).join('')} 삼합 ${ELEMENT_KO[el]}국. ${ELEMENT_KO[el]} 기운이 크게 강화됨`,
      });
    } else if (cnt === 2 && found[1].length > 0) {
      // 왕지(가운데 글자)를 포함한 반합만 인정
      const items = found.filter((f) => f.length > 0).map((f) => f[0]);
      out.push({
        kind: '반합',
        positions: items.map((x) => x.pos),
        chars: items.map((x) => bName(x.idx)).join(''),
        element: el,
        adjacent: isAdjacent(items[0].pos, items[1].pos),
        description: `${items.map((x) => bName(x.idx)).join('')} 반합 ${ELEMENT_KO[el]}. ${ELEMENT_KO[el]} 기운 강화`,
      });
    }
  }
  for (const [group, el] of BANGHAP) {
    const found = group.map(present);
    if (found.every((f) => f.length > 0)) {
      out.push({
        kind: '방합',
        positions: found.map((f) => f[0].pos),
        chars: group.map(bName).join(''),
        element: el,
        adjacent: true,
        description: `${group.map(bName).join('')} 방합 ${ELEMENT_KO[el]}. 계절 세력이 결집해 ${ELEMENT_KO[el]} 기운이 매우 강함`,
      });
    }
  }
  for (const group of SAMHYEONG) {
    const found = group.map(present);
    const cnt = found.filter((f) => f.length > 0).length;
    if (cnt >= 2) {
      const items = found.filter((f) => f.length > 0).map((f) => f[0]);
      const name = group[0] === 2 ? '무은지형(인사신)' : '지세지형(축술미)';
      out.push({
        kind: cnt === 3 ? '삼형' : '형',
        positions: items.map((x) => x.pos),
        chars: items.map((x) => bName(x.idx)).join(''),
        adjacent: cnt === 3 || isAdjacent(items[0].pos, items[1].pos),
        description: `${items.map((x) => bName(x.idx)).join('')} ${cnt === 3 ? '삼형' : '형'} — ${name}. 마찰·수술·법적 문제·조정과 개혁`,
      });
    }
  }
  return out;
}

/** 운(대운·세운)의 천간·지지와 원국 사이의 관계만 추출 */
export function luckInteractions(
  natalStems: Item[],
  natalBranches: Item[],
  luckStem: number,
  luckBranch: number,
  luckPos: Position,
): Interaction[] {
  const all = findInteractions([...natalStems, { pos: luckPos, idx: luckStem }], [...natalBranches, { pos: luckPos, idx: luckBranch }]);
  return all.filter((x) => x.positions.includes(luckPos));
}

export function isChung(a: number, b: number): boolean {
  return !!pairMatch(CHUNG as [number, number][], a, b);
}
export function isYukhap(a: number, b: number): boolean {
  return !!pairMatch(YUKHAP, a, b);
}
export function isWonjin(a: number, b: number): boolean {
  return !!pairMatch(WONJIN as [number, number][], a, b);
}

// ---------------------------------------------------------------------------
// 두 사람(궁합)이나 바깥 글자와 한 쌍씩 비교할 때 쓰는 판별
// ---------------------------------------------------------------------------
export function isStemHap(a: number, b: number): boolean {
  return !!pairMatch(STEM_HAP, a, b);
}
export function isStemChung(a: number, b: number): boolean {
  return !!pairMatch(STEM_CHUNG as [number, number][], a, b);
}
export function isPa(a: number, b: number): boolean {
  return !!pairMatch(PA as [number, number][], a, b);
}
export function isHae(a: number, b: number): boolean {
  return !!pairMatch(HAE as [number, number][], a, b);
}
/** 형(刑) 짝 — 寅巳申·丑戌未 중 둘, 子卯 */
export function isHyungPair(a: number, b: number): boolean {
  if (a === b) return false;
  if ((a === 0 && b === 3) || (a === 3 && b === 0)) return true;
  return SAMHYEONG.some((g) => g.includes(a) && g.includes(b));
}
/** 같은 삼합 무리의 두 글자면 그 오행 */
export function samhapPair(a: number, b: number): Element | null {
  if (a === b) return null;
  const g = SAMHAP.find(([grp]) => grp.includes(a) && grp.includes(b));
  return g ? g[1] : null;
}
