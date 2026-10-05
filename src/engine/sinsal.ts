/** 신살(神殺) */
import { BRANCHES, STEMS, ganzhiIndex } from './constants.ts';
import type { Position } from './interactions.ts';

export interface SinsalHit {
  name: string;
  /** 길신 / 흉신 / 중립 (현대 해석상 양면성) */
  nature: 'good' | 'bad' | 'mixed';
  positions: Position[];
  basis: string;
  meaning: string;
}

export interface NatalForSinsal {
  stems: { pos: Position; idx: number }[];
  branches: { pos: Position; idx: number }[];
  dayStem: number;
  dayBranch: number;
  yearBranch: number;
  monthBranch: number;
  dayPillarIndex: number;
}

// 12신살 순서 (지살부터)
export const TWELVE_SINSAL = ['지살', '연살', '월살', '망신살', '장성살', '반안살', '역마살', '육해살', '화개살', '겁살', '재살', '천살'] as const;
export type TwelveSinsal = (typeof TWELVE_SINSAL)[number];

/** 삼합의 생지(지살 위치) */
function samhapStart(branch: number): number {
  // 申子辰 → 申, 寅午戌 → 寅, 巳酉丑 → 巳, 亥卯未 → 亥
  if ([8, 0, 4].includes(branch)) return 8;
  if ([2, 6, 10].includes(branch)) return 2;
  if ([5, 9, 1].includes(branch)) return 5;
  return 11;
}

/** 기준지(년지 또는 일지)로 본 대상 지지의 12신살 */
export function twelveSinsal(baseBranch: number, target: number): TwelveSinsal {
  const start = samhapStart(baseBranch);
  return TWELVE_SINSAL[(target - start + 12) % 12];
}

const TWELVE_MEANING: Record<TwelveSinsal, string> = {
  지살: '이동·변화의 시작. 고향을 떠나거나 활동 무대가 바뀌기 쉬움',
  연살: '도화(桃花). 매력·인기·이성 관심. 과하면 구설과 유혹',
  월살: '고초살. 일이 막히고 마르는 기운. 준비 기간으로 쓰면 유리',
  망신살: '체면 손상·실수 노출. 반대로 자기 PR·노출 직업엔 활용 가능',
  장성살: '권위·리더십·고집. 조직의 장(長) 기질',
  반안살: '안정·승진·명예. 말안장에 오른 형상',
  역마살: '이동·출장·해외·변동. 한곳에 오래 머물기 어려움',
  육해살: '지체·잔병·인간관계의 은근한 손해',
  화개살: '예술·종교·학문·고독. 정신적 깊이, 반대로 외로움',
  겁살: '빼앗김·강제적 변화. 결단력으로 전환 가능',
  재살: '수옥살. 갇힘·구속·사고 주의. 통제·관리 직업엔 활용',
  천살: '하늘의 재앙. 불가항력적 사건, 겸손·대비가 필요',
};

const NOBLE_STAR: Record<number, number[]> = {
  0: [1, 7], 4: [1, 7], 6: [1, 7], // 甲戊庚 → 丑未
  1: [0, 8], 5: [0, 8], // 乙己 → 子申
  2: [11, 9], 3: [11, 9], // 丙丁 → 亥酉
  7: [2, 6], // 辛 → 寅午
  8: [5, 3], 9: [5, 3], // 壬癸 → 巳卯
};
const MUNCHANG: Record<number, number> = { 0: 5, 1: 6, 2: 8, 3: 9, 4: 8, 5: 9, 6: 11, 7: 0, 8: 2, 9: 3 };
const YANGIN: Record<number, number> = { 0: 3, 2: 6, 4: 6, 6: 9, 8: 0 };
const ROK: Record<number, number> = { 0: 2, 1: 3, 2: 5, 3: 6, 4: 5, 5: 6, 6: 8, 7: 9, 8: 11, 9: 0 };
const HONGYEOM: Record<number, number> = { 0: 6, 1: 6, 2: 2, 3: 7, 4: 4, 5: 4, 6: 10, 7: 9, 8: 0, 9: 8 };
const GEUMYEO: Record<number, number> = { 0: 4, 1: 5, 2: 7, 3: 8, 4: 7, 5: 8, 6: 10, 7: 11, 8: 1, 9: 2 };
const AMROK: Record<number, number> = { 0: 11, 1: 10, 2: 8, 3: 7, 4: 8, 5: 7, 6: 5, 7: 4, 8: 2, 9: 1 };
// 월덕(월지 삼합 기준 천간)
const WOLDEOK: Record<number, number> = { 2: 2, 6: 2, 10: 2, 8: 8, 0: 8, 4: 8, 11: 0, 3: 0, 7: 0, 5: 6, 9: 6, 1: 6 };
// 천덕(월지 기준): 값이 천간이면 'S', 지지면 'B'
const CHEONDEOK: Record<number, ['S' | 'B', number]> = {
  2: ['S', 3], 3: ['B', 8], 4: ['S', 8], 5: ['S', 7], 6: ['B', 11], 7: ['S', 0],
  8: ['S', 9], 9: ['B', 2], 10: ['S', 2], 11: ['S', 1], 0: ['B', 5], 1: ['S', 6],
};
const GOSIN: Record<number, [number, number]> = {
  // 년지 그룹 → [고신, 과숙]
  11: [2, 10], 0: [2, 10], 1: [2, 10],
  2: [5, 1], 3: [5, 1], 4: [5, 1],
  5: [8, 4], 6: [8, 4], 7: [8, 4],
  8: [11, 7], 9: [11, 7], 10: [11, 7],
};

const GOEGANG = ['경진', '경술', '임진', '임술', '무진', '무술'];
const BAEKHO = ['갑진', '을미', '병술', '정축', '무진', '임술', '계축'];
const GORAN = ['갑인', '을사', '정사', '무신', '신해'];
const EUMYANG_CHACHAK = ['병자', '병오', '정축', '정미', '무인', '무신', '신묘', '신유', '임진', '임술', '계사', '계해'];
const HYOSIN = ['갑자', '을해', '병인', '정묘', '무오', '기사', '경진', '경술', '신축', '신미', '임신', '계유'];

/** 공망: 일주가 속한 순(旬)에서 빠진 두 지지 */
export function gongmang(pillarIndex: number): [number, number] {
  const xunStart = pillarIndex - (pillarIndex % 10); // 甲으로 시작하는 순의 첫 index
  const startBranch = xunStart % 12;
  return [(startBranch + 10) % 12, (startBranch + 11) % 12];
}

function pname(stem: number, branch: number) {
  return STEMS[stem].ko + BRANCHES[branch].ko;
}

export function findSinsal(n: NatalForSinsal): SinsalHit[] {
  const hits: SinsalHit[] = [];
  const branchPositions = (b: number) => n.branches.filter((x) => x.idx === b).map((x) => x.pos);
  const stemPositions = (s: number) => n.stems.filter((x) => x.idx === s).map((x) => x.pos);
  const ds = n.dayStem;

  const add = (name: string, nature: SinsalHit['nature'], positions: Position[], basis: string, meaning: string) => {
    if (positions.length) hits.push({ name, nature, positions: [...new Set(positions)], basis, meaning });
  };

  // 천을귀인 (일간·년간 기준)
  const yearStem = n.stems.find((s) => s.pos === 'year')!.idx;
  const noble = new Set<Position>();
  for (const b of NOBLE_STAR[ds]) branchPositions(b).forEach((p) => noble.add(p));
  for (const b of NOBLE_STAR[yearStem]) branchPositions(b).forEach((p) => p !== 'year' && noble.add(p));
  add('천을귀인', 'good', [...noble], `일간 ${STEMS[ds].hanja}·년간 ${STEMS[yearStem].hanja} 기준`, '위기 때 돕는 사람이 나타나는 최고의 길신. 다만 “노력 없이 해결”이 아니라 “도움을 받을 수 있는 구조”일 뿐');
  add('문창귀인', 'good', branchPositions(MUNCHANG[ds]), `일간 ${STEMS[ds].hanja} 기준`, '학습·문서·시험·글재주. 공부한 만큼 성과가 나오는 편');
  if (YANGIN[ds] !== undefined)
    add('양인살', 'mixed', branchPositions(YANGIN[ds]), `양간 ${STEMS[ds].hanja}의 제왕지`, '강한 추진력과 승부욕. 통제되지 않으면 다툼·사고·수술, 의료·군경·스포츠에서는 강점');
  add('건록(록신)', 'good', branchPositions(ROK[ds]), `일간 ${STEMS[ds].hanja}의 록지`, '자립심·자기 힘으로 먹고사는 기반. 월지에 있으면 건록격');
  add('홍염살', 'mixed', branchPositions(HONGYEOM[ds]), `일간 ${STEMS[ds].hanja} 기준`, '이성을 끄는 분위기·색기. 연애 기회가 많으나 감정 소모·구설도 따름');
  add('금여록', 'good', branchPositions(GEUMYEO[ds]), `일간 ${STEMS[ds].hanja} 기준`, '배우자 덕·품위 있는 생활. 일지·시지에 있으면 의미가 큼');
  add('암록', 'good', branchPositions(AMROK[ds]), `일간 ${STEMS[ds].hanja} 기준`, '드러나지 않는 재물·숨은 조력');

  // 월덕·천덕 (월지 기준)
  const wd = WOLDEOK[n.monthBranch];
  add('월덕귀인', 'good', stemPositions(wd), `월지 ${BRANCHES[n.monthBranch].hanja} 기준`, '흉을 누그러뜨리는 덕. 큰 사고를 피하는 힘');
  const cd = CHEONDEOK[n.monthBranch];
  add('천덕귀인', 'good', cd[0] === 'S' ? stemPositions(cd[1]) : branchPositions(cd[1]), `월지 ${BRANCHES[n.monthBranch].hanja} 기준`, '하늘의 덕. 재난을 덜 겪고 회복력이 좋음');

  // 12신살 주요 (년지·일지 기준, 원국 내)
  const bases: [string, number][] = [['년지', n.yearBranch], ['일지', n.dayBranch]];
  // 지살·월살·육해살은 원국표(12신살 행)에만 표시하고 목록에서는 제외(해석 비중이 낮음)
  const major: TwelveSinsal[] = ['역마살', '연살', '화개살', '장성살', '반안살', '망신살', '겁살', '재살', '천살'];
  for (const s of major) {
    const pos = new Set<Position>();
    const basisList: string[] = [];
    for (const [label, base] of bases) {
      for (const br of n.branches) {
        if ((label === '년지' && br.pos === 'year') || (label === '일지' && br.pos === 'day')) continue;
        if (twelveSinsal(base, br.idx) === s) {
          pos.add(br.pos);
          basisList.push(label);
        }
      }
    }
    const name = s === '연살' ? '도화살(연살)' : s;
    const nature: SinsalHit['nature'] = ['반안살', '장성살'].includes(s) ? 'good' : ['역마살', '연살', '화개살', '망신살'].includes(s) ? 'mixed' : 'bad';
    add(name, nature, [...pos], `${[...new Set(basisList)].join('·')} 삼합 기준 12신살`, TWELVE_MEANING[s]);
  }

  // 고신·과숙 (년지 기준)
  const [gosin, gwasuk] = GOSIN[n.yearBranch];
  add('고신살', 'bad', branchPositions(gosin).filter((p) => p !== 'year'), `년지 ${BRANCHES[n.yearBranch].hanja} 기준`, '정서적 고립감. 배우자와 떨어져 지내거나 혼자 있는 시간이 길어지기 쉬움');
  add('과숙살', 'bad', branchPositions(gwasuk).filter((p) => p !== 'year'), `년지 ${BRANCHES[n.yearBranch].hanja} 기준`, '관계에서의 외로움·독립성. 늦은 결혼 경향');

  // 일주 신살
  const dp = pname(ds, n.dayBranch);
  if (GOEGANG.includes(dp)) add('괴강살', 'mixed', ['day'], `일주 ${dp}`, '극단적 강함·카리스마·결단. 기복이 크고 배우자 관계에서 주도권 다툼');
  if (GORAN.includes(dp)) add('고란살', 'bad', ['day'], `일주 ${dp}`, '배우자와의 정서적 거리감. 독립적인 결혼 생활 경향');
  if (EUMYANG_CHACHAK.includes(dp)) add('음양차착살', 'bad', ['day'], `일주 ${dp}`, '결혼·처가/시가 관계의 엇갈림. 혼사의 번거로움');
  if (HYOSIN.includes(dp)) add('효신살', 'bad', ['day'], `일주 ${dp}`, '모친 또는 윗사람과의 애증, 자기 생각에 갇히기 쉬움');
  // 백호대살: 모든 기둥
  const pillarsByPos = new Map<Position, number>();
  for (const s of n.stems) {
    const b = n.branches.find((x) => x.pos === s.pos);
    if (b) pillarsByPos.set(s.pos, ganzhiIndex(s.idx, b.idx));
  }
  const baekho: Position[] = [];
  for (const [pos, idx] of pillarsByPos) {
    if (BAEKHO.includes(pname(idx % 10, idx % 12))) baekho.push(pos);
  }
  add('백호대살', 'bad', baekho, '해당 기둥 간지', '강한 기운·혈광(血光). 사고·수술·급변에 주의, 전문직에서 강한 집중력으로 발현');

  // 현침살: 甲·辛·卯·午·申 (일주·시주 중심으로 의미)
  const hyeonchim: Position[] = [];
  for (const s of n.stems) if ((s.idx === 0 || s.idx === 7) && s.pos !== 'day') hyeonchim.push(s.pos);
  for (const b of n.branches) if ([3, 6, 8].includes(b.idx)) hyeonchim.push(b.pos);
  if (hyeonchim.length >= 2)
    add('현침살', 'mixed', hyeonchim, '甲·辛·卯·午·申 글자', '날카로운 관찰력·언변. 의료·디자인·분석·IT 등 정밀 직업에 유리, 말로 상처 주기 쉬움');

  // 공망
  const [g1, g2] = gongmang(n.dayPillarIndex);
  const gm = n.branches.filter((b) => b.pos !== 'day' && (b.idx === g1 || b.idx === g2)).map((b) => b.pos);
  add('공망', 'mixed', gm, `일주 순중공망 ${BRANCHES[g1].hanja}${BRANCHES[g2].hanja}`, '해당 자리의 기운이 비어 있음. 기대만큼 실속이 덜하거나, 정신적·종교적 관심으로 전환');

  return hits;
}
