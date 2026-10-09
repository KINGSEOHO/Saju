/**
 * 궁합 · 재회
 *
 * 궁합 점수 = 60점에서 시작해 아래 신호를 더하고 뺀다 (35~97점으로 자름).
 *  - 사주: 두 사람의 '나'(일간) 사이, 배우자 자리(일지) 사이의 합·충·원진·형, 전통적으로 배우자를 뜻하는 기운,
 *          서로에게 필요한 기운(용신)을 채워 주는지 / 부담되는 기운(기신)을 키우는지
 *    · 배우자 기운은 정(正: 정재·정관)과 편(偏: 편재·편관)을 나눠 본다. 남자의 일간이 여자의 일간을 극해 서로가 서로의
 *      배우자 기운이 되는 짝(정재↔정관, 편재↔편관)은 '이끄는 쪽·맞추는 쪽'으로 감점하지 않고 배우자 기운 한 장으로 본다.
 *    · 태어난 시간을 모르는 사람이 있으면 오행 비율로 보는 신호(용신·기신)는 절반만 반영하고, 화면에 정확도 안내를 붙인다.
 *  - 띠: 삼합·육합(잘 맞음), 충·원진(부딪힘) — 민간 해석이라 작게 반영
 *  - MBTI: 두 사람 모두 넣었을 때만 아주 작게 반영하고, 주로 대화 방식 안내에 쓴다
 * 점수는 단순한 지표다. 화면에 늘 그 사실을 함께 적는다.
 *
 * 재회는 점수를 매기지 않는다. 헤어진 시기에 운이 관계를 흔들었는지(그해가 배우자 자리를 충했는지, 여자에게 상관·남자에게
 * 겁재의 해였는지, 대운이 바뀐 해였는지), 다시 만나면 반복될 조건, 앞으로 12개월 중 연락하기 좋은 달(배우자 자리와 합하는 달,
 * 인연의 기운이 드는 달)과 피할 달, 지금 할 일만 알려 준다.
 */
import { BRANCHES, STEMS, controls, generates, type Element, type SajuAnalysis, type Wolun } from '../engine/index.ts';
import { isChung, isHae, isHyungPair, isJahyeong, isPa, isStemChung, isStemHap, isWonjin, isYukhap, samhapPair } from '../engine/interactions.ts';
import { josa } from '../engine/josa.ts';
import { monthPillarOf, yearPillarOf } from '../engine/pillars.ts';
import { groupOf, tenGodOfStem, type TenGod, type TenGodGroup } from '../engine/tenGods.ts';
import { coupleGaeun, type CoupleGaeun } from './gaeun.ts';
import { AXES, AXIS_INFO, parseMbti, type Axis } from './mbti.ts';
import { EL_WORD } from './plain.ts';
import { animalName } from './tti.ts';

export type Relation = 'some' | 'dating' | 'married' | 'ex';
export const RELATION_LABEL: Record<Relation, string> = { some: '썸·호감', dating: '연인', married: '부부', ex: '헤어진 사이' };

export type FactorSystem = '사주' | '띠' | 'MBTI';
export interface Factor {
  id: string;
  system: FactorSystem;
  tone: 'good' | 'bad' | 'neutral';
  /** 점수에 더하는 값 */
  points: number;
  title: string;
  text: string;
  basis: string;
}

export interface MbtiPair {
  me: string;
  you: string;
  axes: { axis: Axis; name: string; me: string; you: string; same: boolean; text: string }[];
  summary: string;
}

export interface YearSign {
  year: number;
  /** 같은 흐름이 이어지면 마지막 해 */
  to?: number;
  kind: 'both' | 'split' | 'bond' | 'shake';
  text: string;
}

export interface CompatReport {
  score: number;
  tier: string;
  tierText: string;
  headline: string;
  factors: Factor[];
  good: Factor[];
  bad: Factor[];
  tti: { me: string; you: string; tone: Factor['tone']; text: string };
  mbti: MbtiPair | null;
  /** 상세: 반복되는 다툼과 푸는 법 */
  conflict: { title: string; text: string }[];
  /** 상세: 서로에게 하면 좋은 말 / 피할 말 */
  talk: { who: string; good: string; avoid: string }[];
  /** 상세: 앞으로 10년 */
  years: YearSign[];
  /** 상세: 오래 가려면 */
  advice: string[];
  /** 상세: 두 사람의 개운법 — 둘 다에게 좋은 곳·색, 함께 피할 것 */
  gaeun: CoupleGaeun;
  /** 정확도 안내 — 태어난 시간을 모르거나, 계산 기준에 따라 일주가 달라지는 사람이 있을 때 */
  notes: string[];
}

export interface ReunionReport {
  /** 헤어진 시기 — signals는 그때 관계를 흔든 운의 신호 (센 것부터) */
  breakup: { when: string; shaken: boolean; text: string; basis: string; signals: string[] } | null;
  repeat: { title: string; text: string }[];
  good: { w: Wolun; why: string }[];
  avoid: { w: Wolun; why: string }[];
  actions: string[];
  note: string;
}

export const SCORE_NOTE = '점수는 두 사람의 사주 구조를 비교해 계산한 단순한 지표예요. 실제 관계는 두 사람이 어떻게 대화하고 맞춰 가느냐에 따라 얼마든지 달라져요.';

const bName = (b: number) => `${BRANCHES[b].hanja}(${BRANCHES[b].ko})`;
const sName = (s: number) => `${STEMS[s].hanja}(${STEMS[s].ko})`;
const pName = (p: { stem: number; branch: number }) => `${STEMS[p.stem].hanja}${BRANCHES[p.branch].hanja}(${STEMS[p.stem].ko}${BRANCHES[p.branch].ko})`;
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

/** 이 사람에게 전통적으로 배우자를 뜻하는 기운 */
function spouseGroup(a: SajuAnalysis): TenGodGroup {
  return a.input.gender === 'male' ? '재성' : '관성';
}

/** 정재·정관 — 배우자 기운 중 정(正) */
const isJeong = (g: TenGod) => g === '정재' || g === '정관';

/** 두 사람의 '나'(일간)가 서로에게 어떤 십성인지, 그게 서로의 배우자 기운인지 */
interface StemBond {
  /** 상대 일간이 나에게 */
  toMe: TenGod;
  /** 내 일간이 상대에게 */
  toYou: TenGod;
  /** 상대가 내 배우자 기운인지 */
  me: boolean;
  /** 내가 상대의 배우자 기운인지 */
  you: boolean;
  /** 서로가 서로의 배우자 기운 — 남자의 일간이 여자의 일간을 극하는 짝 */
  both: boolean;
}

function stemBond(a: SajuAnalysis, b: SajuAnalysis): StemBond {
  const toMe = tenGodOfStem(a.pillars.day.stem, b.pillars.day.stem);
  const toYou = tenGodOfStem(b.pillars.day.stem, a.pillars.day.stem);
  const me = groupOf(toMe) === spouseGroup(a);
  const you = groupOf(toYou) === spouseGroup(b);
  return { toMe, toYou, me, you, both: me && you };
}

/** 그 천간이 이 사람에게 인연(배우자)의 기운이면 그 십성 — 남자는 재성, 여자는 관성 */
function spouseStar(x: SajuAnalysis, stem: number): TenGod | null {
  const g = tenGodOfStem(x.pillars.day.stem, stem);
  return groupOf(g) === spouseGroup(x) ? g : null;
}

/** 그 천간이 관계를 지키는 기운을 치면 그 십성 — 여자에게 상관(상관견관), 남자에게 겁재(비겁탈재) */
function hurtStar(x: SajuAnalysis, stem: number): '상관' | '겁재' | null {
  const g = tenGodOfStem(x.pillars.day.stem, stem);
  if (x.input.gender === 'female') return g === '상관' ? g : null;
  return g === '겁재' ? g : null;
}

const timeKnown = (x: SajuAnalysis) => x.input.hour !== null;
/** 밤 11시 무렵에 태어나 계산 기준(자시를 어디서 나누는지)에 따라 일주가 달라지는 사람 */
const dayUnsure = (x: SajuAnalysis) => x.warnings.some((w) => w.kind === 'zi' || (w.kind === 'hour' && !!w.alternative?.includes('대안 일주')));

/** 정확도 안내 */
function accuracyNotes(a: SajuAnalysis, b: SajuAnalysis, you: string): string[] {
  const who = (f: (x: SajuAnalysis) => boolean) => (f(a) && f(b) ? '두 사람 모두' : f(a) ? '내가' : f(b) ? josa(you, '이/가') : null);
  const out: string[] = [];
  const noTime = who((x) => !timeKnown(x));
  if (noTime)
    out.push(
      `${noTime} 태어난 시간을 몰라 시주를 빼고 봤어요. ‘나’ 글자와 배우자 자리(일주)로 본 판단은 그대로지만, 오행 비율로 본 ‘서로 채워 주는 기운’은 절반만 반영했어요. 밤 11시가 넘어 태어났다면 일주가 달라질 수 있어요.`,
    );
  const zi = who(dayUnsure);
  if (zi) out.push(`${zi} 밤 11시 무렵에 태어나, 계산 기준(자시를 어디서 나누는지)에 따라 일주가 달라질 수 있어요. 일주가 바뀌면 궁합의 중심 판단도 달라지니 참고하세요.`);
  return out;
}

const GROUP_STYLE: Record<TenGodGroup, { who: string; good: string; avoid: string }> = {
  비겁: { who: '자존심이 세고 스스로 정하고 싶은 사람', good: '“네 생각대로 해 봐, 믿어.”처럼 결정권을 존중하는 말', avoid: '다른 사람과 비교하거나, 대신 결정해 버리는 말' },
  식상: { who: '느낀 것을 말로 풀어야 정리되는 사람', good: '“그래서 어땠어?”처럼 끝까지 들어 주는 말', avoid: '말을 끊거나 “그래서 결론이 뭔데?”로 서두르는 말' },
  재성: { who: '현실적인 계획과 결과로 마음을 확인하는 사람', good: '구체적인 계획·약속·날짜가 담긴 말', avoid: '막연한 약속, 돈·시간을 가볍게 여기는 말' },
  관성: { who: '책임과 약속, 체면을 중요하게 여기는 사람', good: '“약속 지켜 줘서 고마워.”처럼 노력을 알아봐 주는 말', avoid: '남들 앞에서 깎아내리거나, 약속을 쉽게 뒤집는 말' },
  인성: { who: '생각할 시간과 안정감이 필요한 사람', good: '“천천히 생각하고 말해 줘.”처럼 여유를 주는 말', avoid: '바로 답을 재촉하거나, 감정적으로 몰아붙이는 말' },
};

function topGroup(a: SajuAnalysis): TenGodGroup {
  const gp = a.elements.groupPercent;
  return (Object.keys(gp) as TenGodGroup[]).sort((x, y) => gp[y] - gp[x])[0];
}

// ---------------------------------------------------------------------------
// 사주 신호
// ---------------------------------------------------------------------------
function dayStemFactor(a: SajuAnalysis, b: SajuAnalysis, you: string, bond: StemBond): Factor | null {
  const s1 = a.pillars.day.stem;
  const s2 = b.pillars.day.stem;
  const e1 = STEMS[s1].element;
  const e2 = STEMS[s2].element;
  const basis = `일간 ${sName(s1)} · ${sName(s2)}`;
  if (isStemHap(s1, s2))
    return {
      id: 'stem-hap',
      system: '사주',
      tone: 'good',
      points: 12,
      title: '처음부터 끌리는 짝',
      text: `두 사람의 ‘나’를 뜻하는 글자가 서로 합(合)을 이뤄요. 설명하기 어려운 끌림이 있고, 함께 있으면 서로의 색이 부드러워져요.`,
      basis: `${basis} 천간합`,
    };
  if (isStemChung(s1, s2))
    return {
      id: 'stem-chung',
      system: '사주',
      tone: 'bad',
      points: -8,
      title: '생각의 방향이 정반대인 사이',
      text: `두 사람의 ‘나’를 뜻하는 글자가 정면으로 부딪혀요. 같은 일을 보고도 판단이 자주 갈리니, 결론보다 이유를 먼저 나누는 연습이 필요해요.`,
      basis: `${basis} 천간충`,
    };
  if (e1 === e2)
    return STEMS[s1].polarity === STEMS[s2].polarity
      ? {
          id: 'stem-same',
          system: '사주',
          tone: 'good',
          points: 3,
          title: '친구 같은 편안함',
          text: `두 사람 모두 ${EL_WORD[e1]} 기운의 사람이에요. 말하지 않아도 통하는 게 많지만, 둘 다 같은 곳에서 약해서 같은 문제에 함께 빠지기도 해요.`,
          basis: `${basis} 같은 오행(비견)`,
        }
      : {
          id: 'stem-rival',
          system: '사주',
          tone: 'neutral',
          points: 0,
          title: '닮았지만 경쟁하는 사이',
          text: `두 사람 모두 ${EL_WORD[e1]} 기운이라 잘 통하지만, 결이 조금 달라 은근히 지기 싫은 마음이 생기기 쉬워요.`,
          basis: `${basis} 같은 오행(겁재)`,
        };
  if (generates(e1, e2))
    return {
      id: 'stem-feed',
      system: '사주',
      tone: 'good',
      points: 6,
      title: '내가 상대를 키워 주는 관계',
      text: `${josa(EL_WORD[e1], '이/가')} ${josa(EL_WORD[e2], '을/를')} 살리듯, 내가 ${josa(you, '을/를')} 챙기고 북돋는 쪽이에요. 주는 기쁨이 크지만, 지칠 땐 지친다고 말해야 오래가요.`,
      basis: `${basis} 내가 상대를 생(生)함`,
    };
  if (generates(e2, e1))
    return {
      id: 'stem-fed',
      system: '사주',
      tone: 'good',
      points: 6,
      title: '상대가 나를 키워 주는 관계',
      text: `${josa(EL_WORD[e2], '이/가')} ${josa(EL_WORD[e1], '을/를')} 살리듯, ${josa(you, '이/가')} 나를 챙기고 북돋는 쪽이에요. 기대기 좋은 사이지만, 받기만 한다고 느끼지 않게 고마움을 자주 표현해 주세요.`,
      basis: `${basis} 상대가 나를 생(生)함`,
    };
  // 남자의 일간이 여자의 일간을 극해 서로가 서로의 배우자 기운이 되는 짝은 전통적으로 정석의 구조라,
  // '이끄는 쪽·맞추는 쪽'으로 감점하지 않고 배우자 기운(spouseFactors)에서 정·편을 나눠 한 번에 본다
  if (bond.both) return null;
  if (controls(e1, e2))
    return {
      id: 'stem-lead',
      system: '사주',
      tone: 'bad',
      points: -5,
      title: '내가 이끌고 상대가 맞추는 관계',
      text: `내 기운이 ${you}의 기운을 누르는 구조예요. 내가 주도할 때 일은 빨리 풀리지만, 상대는 숨이 막힐 수 있어요. 결정권을 나눠 가지세요.`,
      basis: `${basis} 내가 상대를 극(剋)함`,
    };
  return {
    id: 'stem-led',
    system: '사주',
    tone: 'bad',
    points: -5,
    title: '상대가 이끌고 내가 맞추는 관계',
    text: `${you}의 기운이 내 기운을 누르는 구조예요. 든든할 때도 있지만, 참다 보면 한꺼번에 터지기 쉬워요. 작은 불편부터 그때그때 말하세요.`,
    basis: `${basis} 상대가 나를 극(剋)함`,
  };
}

function dayBranchFactor(a: SajuAnalysis, b: SajuAnalysis): Factor | null {
  const b1 = a.pillars.day.branch;
  const b2 = b.pillars.day.branch;
  const basis = `배우자 자리(일지) ${bName(b1)} · ${bName(b2)}`;
  if (isYukhap(b1, b2)) {
    // 巳申은 합 속에 형·파가, 寅亥는 합 속에 파가 함께 있다 — 끌림은 같아도 마찰이 섞인다
    const mixed = isHyungPair(b1, b2) ? '형' : isPa(b1, b2) ? '파' : null;
    const tail =
      mixed === '형'
        ? ' 다만 합 속에 형(刑)이 함께 있어, 가까워질수록 말이 날카로워지는 때가 있어요. 편할수록 예의를 지켜 주세요.'
        : mixed === '파'
          ? ' 다만 합 속에 파(破)가 함께 있어, 함께 세운 계획이 가끔 어긋나요. 중요한 약속은 한 번 더 확인하세요.'
          : '';
    return {
      id: 'branch-hap',
      system: '사주',
      tone: 'good',
      points: mixed === '형' ? 8 : mixed === '파' ? 10 : 12,
      title: '생활이 잘 맞물리는 사이',
      text: `두 사람의 배우자 자리가 합(合)을 이뤄요. 함께 사는 모습, 쉬는 방식, 생활 리듬이 자연스럽게 맞물려요. 같이 지낼수록 편해지는 짝이에요.${tail}`,
      basis: `${basis} 육합${mixed ? ` · ${mixed}` : ''}`,
    };
  }
  const sh = samhapPair(b1, b2);
  if (sh)
    return {
      id: 'branch-samhap',
      system: '사주',
      tone: 'good',
      points: 7,
      title: '같은 목표를 향해 뭉치는 사이',
      text: `두 사람의 배우자 자리가 같은 무리(삼합)에 속해요. 함께 목표가 생기면 힘이 커지는 팀 같은 관계예요.`,
      basis: `${basis} 삼합(${EL_WORD[sh]})`,
    };
  if (isChung(b1, b2))
    return {
      id: 'branch-chung',
      system: '사주',
      tone: 'bad',
      points: -12,
      title: '생활 리듬이 정면으로 부딪히는 사이',
      text: '두 사람의 배우자 자리가 정면으로 부딪혀요(충). 끌림은 강할 수 있지만, 함께 지내면 생활 방식·속도·공간 문제로 자주 부딪혀요. 각자의 시간과 공간을 일부러 지켜 주는 게 오래가는 비결이에요.',
      basis: `${basis} 충`,
    };
  if (isWonjin(b1, b2))
    return {
      id: 'branch-wonjin',
      system: '사주',
      tone: 'bad',
      points: -9,
      title: '좋다가도 이유 없이 서운한 사이',
      text: '두 사람의 배우자 자리가 원진(怨嗔)이에요. 끌리면서도 사소한 일로 서운함이 쌓이는 애증의 구조예요. 서운한 건 쌓아 두지 말고 그날 풀어야 해요.',
      basis: `${basis} 원진`,
    };
  if (isHyungPair(b1, b2))
    return {
      id: 'branch-hyung',
      system: '사주',
      tone: 'bad',
      points: -6,
      title: '가까워질수록 날이 서는 사이',
      text: '두 사람의 배우자 자리가 형(刑)의 관계예요. 편해질수록 말이 거칠어지기 쉬워요. 가까운 사이일수록 예의를 지키는 게 이 관계의 숙제예요.',
      basis: `${basis} 형`,
    };
  if (isHae(b1, b2))
    return {
      id: 'branch-hae',
      system: '사주',
      tone: 'bad',
      points: -4,
      title: '은근히 서운함이 쌓이는 사이',
      text: '두 사람의 배우자 자리가 해(害)의 관계예요. 큰 다툼보다 작은 서운함이 쌓이기 쉬워요. 고마운 건 말로 자주 표현하세요.',
      basis: `${basis} 해`,
    };
  if (isPa(b1, b2))
    return {
      id: 'branch-pa',
      system: '사주',
      tone: 'bad',
      points: -3,
      title: '계획이 자주 어긋나는 사이',
      text: '두 사람의 배우자 자리가 파(破)의 관계예요. 함께 세운 계획이 자주 틀어질 수 있으니, 중요한 약속은 미리 확인하는 습관이 도움이 돼요.',
      basis: `${basis} 파`,
    };
  if (isJahyeong(b1, b2))
    return {
      id: 'branch-jahyeong',
      system: '사주',
      tone: 'bad',
      points: -2,
      title: '닮아서 함께 예민해지는 사이',
      text: '두 사람의 배우자 자리가 같은 글자이면서 자형(自刑)이에요. 생활 습관은 닮아 편하지만, 둘 다 스스로를 몰아붙이는 면이 있어 지칠 때 함께 예민해지기 쉬워요. 한 사람이 지치면 다른 사람이 먼저 쉬어 가자고 말해 주세요.',
      basis: `${basis} 자형`,
    };
  if (b1 === b2)
    return {
      id: 'branch-same',
      system: '사주',
      tone: 'neutral',
      points: 2,
      title: '생활 방식이 닮은 사이',
      text: '두 사람의 배우자 자리가 같은 글자예요. 생활 습관이 닮아 편하지만, 둘 다 같은 부분에서 고집을 부리기도 해요.',
      basis: `${basis} 같은 글자`,
    };
  return null;
}

/**
 * 배우자 기운 — 정(정재·정관)이면 정석의 짝, 편(편재·편관)이면 끌림과 긴장이 함께 오는 짝.
 * 서로가 서로의 배우자 기운이면 한 장으로 묶는다 (일간이 천간합이면 끌림은 합 쪽에서 이미 셌으니 조금 덜 더한다).
 */
function spouseFactors(a: SajuAnalysis, you: string, bond: StemBond, hap: boolean): Factor[] {
  if (bond.both) {
    const basis = `상대 일간이 나에게 ${bond.toMe} · 내 일간이 상대에게 ${bond.toYou}`;
    if (isJeong(bond.toMe))
      return [
        {
          id: 'spouse-both',
          system: '사주',
          tone: 'good',
          points: hap ? 8 : 10,
          title: '서로가 서로의 배우자 기운인 짝',
          text: `내 사주에서 ${josa(you, '은/는')} 배우자를 뜻하는 기운(${bond.toMe})이고, ${you}의 사주에서 나도 배우자를 뜻하는 기운(${bond.toYou})이에요. 전통적으로 가장 정석적인 부부의 짝이라, 처음부터 ‘함께할 사람’으로 느끼기 쉽고 함께할수록 자리가 잡혀요.`,
          basis,
        },
      ];
    const feel =
      a.input.gender === 'male' ? `끌림과 설렘은 크지만, 내가 이끌려 할수록 ${you}에게는 압박이 될 수 있어요.` : `든든하고 강하게 끌리지만, ${you}의 방식이 나에게 압박으로 느껴질 때가 있어요.`;
    return [
      {
        id: 'spouse-both-pyeon',
        system: '사주',
        tone: 'good',
        points: 4,
        title: '강하게 끌리지만 긴장도 있는 짝',
        text: `내 사주에서 ${josa(you, '은/는')} 배우자를 뜻하는 기운 중 ${bond.toMe}, ${you}의 사주에서 나는 ${josa(bond.toYou, '이에요/예요')}. ${feel} 정(正)이 아닌 편(偏)의 짝이라, 서로를 바꾸려 하지 않을 때 오래가요.`,
        basis,
      },
    ];
  }
  const out: Factor[] = [];
  if (bond.me)
    out.push({
      id: 'spouse-me',
      system: '사주',
      tone: 'good',
      points: isJeong(bond.toMe) ? 5 : 3,
      title: `${josa(you, '은/는')} 내 사주의 배우자 기운`,
      text: `${you}의 ‘나’ 글자가, 내 사주에서 전통적으로 배우자를 뜻하는 기운(${bond.toMe})이에요. ${isJeong(bond.toMe) ? '처음 만났을 때 ‘이 사람이다’ 싶은 느낌을 받기 쉬운 구조예요.' : '강하게 끌리지만, 정(正)이 아닌 편(偏)이라 설렘과 긴장이 함께 와요.'}`,
      basis: `상대 일간이 나에게 ${bond.toMe}`,
    });
  if (bond.you)
    out.push({
      id: 'spouse-you',
      system: '사주',
      tone: 'good',
      points: isJeong(bond.toYou) ? 5 : 3,
      title: `나는 ${you}의 배우자 기운`,
      text: `내 ‘나’ 글자가 ${you}의 사주에서 전통적으로 배우자를 뜻하는 기운(${bond.toYou})이에요. ${isJeong(bond.toYou) ? '상대에게 나는 ‘함께할 사람’으로 느껴지기 쉬워요.' : '상대에게 나는 강하게 끌리는 사람이지만, 정(正)이 아닌 편(偏)이라 설렘과 긴장이 함께 와요.'}`,
      basis: `내 일간이 상대에게 ${bond.toYou}`,
    });
  return out;
}

function elementFactors(a: SajuAnalysis, b: SajuAnalysis, you: string): Factor[] {
  const out: Factor[] = [];
  // 태어난 시간을 모르는 사람이 있으면 오행 비율·용신이 6글자로만 나와 덜 정확하다 — 절반만 반영
  const unsure = !timeKnown(a) || !timeKnown(b);
  const weigh = (p: number) => (unsure ? Math.round(p / 2) : p);
  const tail = unsure ? ' (태어난 시간을 몰라 참고용)' : '';
  const give = (from: SajuAnalysis, to: SajuAnalysis, dir: 'toMe' | 'toYou') => {
    const need = to.yongsin.yongsin;
    const burden = to.yongsin.gisin;
    const has = from.elements.percent[need];
    const heavy = from.elements.percent[burden];
    const whom = dir === 'toMe' ? '나' : you;
    const giver = dir === 'toMe' ? you : '나';
    if (has >= 24)
      out.push({
        id: `fill-${dir}`,
        system: '사주',
        tone: 'good',
        points: weigh(has >= 30 ? 8 : 6),
        title: `${giver === '나' ? '내가' : josa(giver, '이/가')} ${whom}에게 필요한 기운을 채워 주는 사이`,
        text: `${josa(whom, '은/는')} ${EL_WORD[need]} 기운이 필요한 사주인데, ${giver === '나' ? '내' : `${giver}의`} 사주에 그 기운이 ${has.toFixed(0)}%나 있어요. 함께 있으면 마음이 안정되고 일이 잘 풀리는 느낌을 받기 쉬워요.`,
        basis: `${whom}의 용신 ${EL_WORD[need]} · ${giver === '나' ? '내' : `${giver}의`} 사주 ${EL_WORD[need]} ${has.toFixed(0)}%${tail}`,
      });
    else if (heavy >= 32)
      out.push({
        id: `burden-${dir}`,
        system: '사주',
        tone: 'bad',
        points: weigh(-5),
        title: `${giver === '나' ? '내' : `${giver}의`} 기운이 ${whom}에게는 부담인 사이`,
        text: `${josa(whom, '은/는')} ${EL_WORD[burden]} 기운이 부담되는 사주인데, ${giver === '나' ? '내' : `${giver}의`} 사주에 그 기운이 ${heavy.toFixed(0)}%로 많아요. 오래 붙어 있으면 이유 없이 지칠 수 있으니, 각자 쉬는 시간을 꼭 챙기세요.`,
        basis: `${whom}의 기신 ${EL_WORD[burden]} · ${giver === '나' ? '내' : `${giver}의`} 사주 ${EL_WORD[burden]} ${heavy.toFixed(0)}%${tail}`,
      });
  };
  give(b, a, 'toMe');
  give(a, b, 'toYou');
  return out;
}

function ttiFactor(a: SajuAnalysis, b: SajuAnalysis): { f: Factor | null; info: CompatReport['tti'] } {
  const y1 = a.pillars.year.branch;
  const y2 = b.pillars.year.branch;
  const me = animalName(y1);
  const youT = animalName(y2);
  const basis = `${me} · ${youT}`;
  let f: Factor | null = null;
  if (isYukhap(y1, y2))
    f = {
      id: 'tti-hap',
      system: '띠',
      tone: 'good',
      points: 5,
      title: '띠로도 잘 맞는 짝',
      text: `${me}와 ${youT}는 육합 — 띠로 보면 서로 끌어당기는 짝이에요.`,
      basis: `${basis} 육합`,
    };
  else if (samhapPair(y1, y2))
    f = {
      id: 'tti-samhap',
      system: '띠',
      tone: 'good',
      points: 4,
      title: '띠로도 뜻이 통하는 짝',
      text: `${me}와 ${youT}는 삼합 — 띠로 보면 같은 방향을 보는 사이예요.`,
      basis: `${basis} 삼합`,
    };
  else if (isChung(y1, y2))
    f = {
      id: 'tti-chung',
      system: '띠',
      tone: 'bad',
      points: -4,
      title: '띠로는 부딪히는 짝',
      text: `${me}와 ${youT}는 충 — 띠로 보면 성향이 정반대라 부딪히기 쉬워요. 대신 서로 없는 것을 채워 주기도 해요.`,
      basis: `${basis} 충`,
    };
  else if (isWonjin(y1, y2))
    f = {
      id: 'tti-wonjin',
      system: '띠',
      tone: 'bad',
      points: -3,
      title: '띠로는 애증의 짝',
      text: `${me}와 ${youT}는 원진 — 띠로 보면 끌리면서도 서운함이 쌓이기 쉬운 사이예요.`,
      basis: `${basis} 원진`,
    };
  const info = f
    ? { me, you: youT, tone: f.tone, text: f.text }
    : { me, you: youT, tone: 'neutral' as const, text: `${me}와 ${youT}는 띠로는 특별히 끌리거나 부딪히지 않는 무난한 사이예요.` };
  return { f, info };
}

// ---------------------------------------------------------------------------
// MBTI
// ---------------------------------------------------------------------------
const AXIS_DIFF: Record<Axis, string> = {
  EI: '한 사람은 사람을 만나며 충전하고, 한 사람은 혼자 있어야 충전돼요. 주말 계획을 ‘같이 반, 따로 반’으로 나누면 서운함이 줄어요.',
  SN: '한 사람은 구체적인 사실을, 한 사람은 큰 그림과 가능성을 먼저 봐요. 이야기할 때 ‘예시’와 ‘의미’를 함께 말해 주세요.',
  TF: '한 사람은 해결책을, 한 사람은 공감을 먼저 원해요. 힘든 이야기를 들으면 먼저 “많이 힘들었겠다”, 그다음에 해결책을 말하세요.',
  JP: '한 사람은 미리 정해야 편하고, 한 사람은 그때그때 정해야 편해요. 큰 일정만 함께 정하고 나머지는 비워 두는 게 좋아요.',
};
const AXIS_SAME: Record<Axis, string> = {
  EI: '충전하는 방식이 같아서 함께 쉬기 편해요.',
  SN: '세상을 보는 눈이 같아 대화가 잘 통해요.',
  TF: '결정하는 방식이 같아 다툼이 길어지지 않아요.',
  JP: '생활 리듬이 같아 함께 지내기 편해요.',
};

function mbtiPair(a: SajuAnalysis, b: SajuAnalysis): { pair: MbtiPair; f: Factor } | null {
  const m1 = parseMbti(a.input.mbti);
  const m2 = parseMbti(b.input.mbti);
  if (!m1 || !m2) return null;
  const axes = AXES.map((ax, i) => {
    const same = m1[i] === m2[i];
    return { axis: ax, name: AXIS_INFO[ax].name, me: m1[i], you: m2[i], same, text: same ? AXIS_SAME[ax] : AXIS_DIFF[ax] };
  });
  const sameN = axes.filter((x) => x.same).length;
  const diffTF = !axes[2].same;
  const diffJP = !axes[3].same;
  const points = sameN === 4 ? 1 : sameN >= 2 ? 2 : 0 - (diffTF && diffJP ? 2 : 0);
  const summary =
    sameN === 4
      ? `${m1}와 ${m2} — 같은 유형이라 잘 통하지만, 약점도 같아서 함께 놓치는 부분이 생겨요.`
      : sameN >= 2
        ? `${m1}와 ${m2} — 4글자 중 ${sameN}개가 같아요. 비슷한 점은 편안함을, 다른 점은 서로 채워 주는 힘이 돼요.`
        : `${m1}와 ${m2} — 4글자 중 ${sameN}개만 같아요. 서로 다른 만큼 배울 게 많지만, 대화 방식을 맞추는 노력이 필요해요.`;
  return {
    pair: { me: m1, you: m2, axes, summary },
    f: {
      id: 'mbti',
      system: 'MBTI',
      tone: points > 0 ? 'good' : points < 0 ? 'bad' : 'neutral',
      points,
      title: points > 0 ? 'MBTI로도 잘 통하는 사이' : points < 0 ? 'MBTI로는 대화 방식이 다른 사이' : 'MBTI로는 반반',
      text: summary,
      basis: `${m1} · ${m2} (같은 글자 ${sameN}개)`,
    },
  };
}

// ---------------------------------------------------------------------------
// 앞으로 10년
// ---------------------------------------------------------------------------
function yearSigns(a: SajuAnalysis, b: SajuAnalysis, you: string): YearSign[] {
  const from = new Date(a.now).getUTCFullYear();
  const out: YearSign[] = [];
  for (let y = from; y < from + 10; y++) {
    const s1 = a.seun.find((s) => s.year === y);
    const s2 = b.seun.find((s) => s.year === y);
    if (!s1 || !s2) continue;
    const br = s1.pillar.branch;
    const myDay = a.pillars.day.branch;
    const yourDay = b.pillars.day.branch;
    const shakeMe = isChung(br, myDay);
    const shakeYou = isChung(br, yourDay);
    if (shakeMe || shakeYou) {
      const whose = shakeMe && shakeYou ? '두 사람의' : shakeMe ? '내' : `${you}의`;
      out.push({ year: y, kind: 'shake', text: `${whose} 배우자 자리를 흔드는 해예요. 이사·이직 같은 변화가 관계에도 영향을 주기 쉬워요. 큰 결정은 둘이 함께 천천히 하세요.` });
    } else if (isYukhap(br, myDay) || isYukhap(br, yourDay)) {
      out.push({ year: y, kind: 'bond', text: `관계에 힘이 실리는 해예요. 약속·동거·결혼처럼 관계를 한 단계 정하기 좋은 흐름이에요.` });
    } else if (s1.combined >= 58 && s2.combined >= 58) {
      out.push({ year: y, kind: 'both', text: `두 사람 모두 운이 좋은 해예요. 함께 새로운 일을 시작하기 좋아요.` });
    } else if ((s1.combined >= 58 && s2.combined <= 44) || (s2.combined >= 58 && s1.combined <= 44)) {
      const up = s1.combined > s2.combined ? '나' : you;
      const down = up === '나' ? you : '나';
      out.push({ year: y, kind: 'split', text: `${josa(up, '은/는')} 잘 풀리고 ${josa(down, '은/는')} 힘든 엇갈리는 해예요. 잘 풀리는 쪽이 속도를 늦추고 상대를 챙겨야 해요.` });
    }
  }
  // 같은 흐름이 이어지는 해는 하나로 묶는다 (2026–2027)
  const merged: YearSign[] = [];
  for (const y of out) {
    const last = merged[merged.length - 1];
    if (last && last.kind === y.kind && last.text === y.text && (last.to ?? last.year) === y.year - 1) last.to = y.year;
    else merged.push({ ...y });
  }
  return merged;
}

// ---------------------------------------------------------------------------
// 궁합 리포트
// ---------------------------------------------------------------------------
function tierOf(score: number): { tier: string; text: string } {
  if (score >= 85) return { tier: '아주 잘 맞는 편', text: '타고난 구조가 서로를 많이 받쳐 주는 사이예요.' };
  if (score >= 72) return { tier: '잘 맞는 편', text: '잘 맞는 점이 부딪히는 점보다 많은 사이예요.' };
  if (score >= 58) return { tier: '노력하면 잘 맞는 편', text: '잘 맞는 점과 부딪히는 점이 함께 있어, 맞춰 가는 노력에 따라 크게 달라지는 사이예요.' };
  return { tier: '노력이 많이 필요한 편', text: '부딪히는 지점이 분명한 사이예요. 그 지점을 알고 대비하면 오히려 단단해질 수 있어요.' };
}

export function compatReport(a: SajuAnalysis, b: SajuAnalysis): CompatReport {
  const you = b.input.name?.trim() || '그 사람';
  const factors: Factor[] = [];
  const bond = stemBond(a, b);
  const ds = dayStemFactor(a, b, you, bond);
  if (ds) factors.push(ds);
  const db = dayBranchFactor(a, b);
  if (db) factors.push(db);
  // 일주끼리 천간·지지가 함께 합하거나(천합지합) 함께 부딪히면(천극지충) 전통적으로 특히 크게 본다
  const dayPillars = `일주 ${sName(a.pillars.day.stem)}${bName(a.pillars.day.branch)} · ${sName(b.pillars.day.stem)}${bName(b.pillars.day.branch)}`;
  if (ds?.id === 'stem-hap' && db?.id === 'branch-hap')
    factors.push({
      id: 'pillar-hap',
      system: '사주',
      tone: 'good',
      points: 4,
      title: '하늘과 땅이 모두 맞물린 짝',
      text: '‘나’ 글자와 배우자 자리가 함께 합을 이뤄요(천합지합). 전통적으로 아주 드문 인연으로 보는 조합이에요.',
      basis: `${dayPillars} 천합지합`,
    });
  if (ds?.id === 'stem-chung' && db?.id === 'branch-chung')
    factors.push({
      id: 'pillar-chung',
      system: '사주',
      tone: 'bad',
      points: -6,
      title: '머리도 생활도 정반대인 사이',
      text: '‘나’ 글자와 배우자 자리가 함께 부딪혀요(천극지충). 끌림이 강해도 생각과 생활이 모두 엇갈리기 쉬워, 서로 다름을 인정하는 약속이 꼭 필요해요.',
      basis: `${dayPillars} 천극지충`,
    });
  factors.push(...spouseFactors(a, you, bond, ds?.id === 'stem-hap'), ...elementFactors(a, b, you));
  const t = ttiFactor(a, b);
  if (t.f) factors.push(t.f);
  const mb = mbtiPair(a, b);
  if (mb) factors.push(mb.f);

  const score = clamp(Math.round(60 + factors.reduce((s, f) => s + f.points, 0)), 35, 97);
  const { tier, text: tierText } = tierOf(score);
  const byWeight = (x: Factor, y: Factor) => Math.abs(y.points) - Math.abs(x.points);
  const good = factors.filter((f) => f.tone === 'good').sort(byWeight);
  const bad = factors.filter((f) => f.tone === 'bad').sort(byWeight);
  // 점수가 낮으면 부딪히는 점을, 아니면 잘 맞는 점을 먼저 내세운다
  const headline = (score >= 58 ? (good[0] ?? bad[0]) : (bad[0] ?? good[0]))?.title ?? '무난하게 맞춰 가는 사이';

  // 반복되는 다툼과 푸는 법
  const conflict: CompatReport['conflict'] = bad.slice(0, 2).map((f) => ({ title: f.title, text: f.text }));
  const st1 = a.strength.score >= 48;
  const st2 = b.strength.score >= 48;
  if (st1 && st2)
    conflict.push({
      title: '고집 대 고집',
      text: '두 사람 모두 자기 힘이 센 사주예요. 다툼이 생기면 둘 다 먼저 굽히지 않아 길어지기 쉬워요. ‘먼저 사과하는 사람이 이기는 것’이라는 약속을 정해 두세요.',
    });
  else if (!st1 && !st2)
    conflict.push({
      title: '서로 기대다 함께 지치기',
      text: '두 사람 모두 바깥 기운에 영향을 많이 받는 사주예요. 힘든 시기가 겹치면 서로 기대다 함께 지치기 쉬워요. 각자 기댈 친구·취미를 따로 두는 게 관계를 지켜 줘요.',
    });
  else
    conflict.push({
      title: '한쪽으로 기우는 주도권',
      text: `${st1 ? '내가' : josa(you, '이/가')} 자기 힘이 센 쪽이라 결정이 한쪽으로 몰리기 쉬워요. 작은 일은 상대에게 맡기고, 큰 일은 꼭 함께 정하세요.`,
    });
  if (conflict.length === 1)
    conflict.unshift({
      title: '큰 충돌보다 작은 엇갈림',
      text: '타고난 구조에서 크게 부딪히는 지점은 적어요. 대신 바쁠 때 연락이나 표현이 줄면서 오해가 생기기 쉬우니, 짧은 안부라도 꾸준히 나누세요.',
    });

  // 서로에게 하면 좋은 말 / 피할 말
  const g1 = topGroup(a);
  const g2 = topGroup(b);
  const talk = [
    { who: `나는 ${GROUP_STYLE[g1].who}`, good: `${josa(you, '이/가')} 해 주면 좋은 말: ${GROUP_STYLE[g1].good}`, avoid: `피했으면 하는 말: ${GROUP_STYLE[g1].avoid}` },
    { who: `${josa(you, '은/는')} ${GROUP_STYLE[g2].who}`, good: `내가 해 주면 좋은 말: ${GROUP_STYLE[g2].good}`, avoid: `피해야 할 말: ${GROUP_STYLE[g2].avoid}` },
  ];

  const years = yearSigns(a, b, you);
  const advice: string[] = [];
  if (bad.some((f) => f.id === 'branch-chung')) advice.push('함께 살거나 오래 붙어 있을 땐 각자만의 공간과 시간을 정해 두세요.');
  if (bad.some((f) => f.id === 'branch-wonjin' || f.id === 'branch-hae')) advice.push('서운한 일은 그날 안에, 짧게라도 말하세요. 쌓아 두면 애증으로 바뀌어요.');
  if (bad.some((f) => f.id.startsWith('burden'))) advice.push('함께 있어도 피곤하다면 관계 문제가 아니라 기운 문제일 수 있어요. 각자 쉬는 날을 정해 두세요.');
  if (mb && !mb.pair.axes[2].same) advice.push('다툴 때는 ‘공감 먼저, 해결은 나중’ 순서를 지키세요.');
  if (good.some((f) => f.id === 'spouse-both-pyeon')) advice.push('끌림이 강한 만큼 서로를 바꾸려 들면 부딪혀요. 상대의 방식을 한 가지씩 인정해 주세요.');
  if (good.some((f) => f.id === 'branch-hap' || f.id === 'stem-hap')) advice.push('끌림이 강한 사이라 익숙해지면 소홀해지기 쉬워요. 처음의 표현을 일부러 이어 가세요.');
  advice.push('중요한 결정은 두 사람의 운이 모두 좋은 해에, 둘이 함께 내리세요.');

  return {
    score,
    tier,
    tierText,
    headline,
    factors,
    good,
    bad,
    tti: t.info,
    mbti: mb?.pair ?? null,
    conflict: conflict.slice(0, 3),
    talk,
    years,
    advice: advice.slice(0, 4),
    gaeun: coupleGaeun(a, b, you),
    notes: accuracyNotes(a, b, you),
  };
}

// ---------------------------------------------------------------------------
// 재회 — 점수 없음
// ---------------------------------------------------------------------------
function branchHit(br: number, a: SajuAnalysis, b: SajuAnalysis): { bad: string | null; good: string | null } {
  const d1 = a.pillars.day.branch;
  const d2 = b.pillars.day.branch;
  const bad = isChung(br, d1) || isChung(br, d2) ? '충' : isWonjin(br, d1) || isWonjin(br, d2) ? '원진' : isHyungPair(br, d1) || isHyungPair(br, d2) ? '형' : null;
  const good = isYukhap(br, d1) || isYukhap(br, d2) ? '육합' : samhapPair(br, d1) || samhapPair(br, d2) ? '삼합' : null;
  return { bad, good };
}

/** 양력 연·월 → 그 달의 년주·월주 (절기 경계는 달의 가운데로 어림) */
function pillarsOfMonth(year: number, month: number) {
  const sajuYear = month === 1 ? year - 1 : year;
  const yp = yearPillarOf(sajuYear);
  const order = (month - 2 + 12) % 12;
  return { year: yp, month: monthPillarOf(yp.stem, order) };
}

export function reunionReport(a: SajuAnalysis, b: SajuAnalysis, breakup: { year: number; month: number } | null, months: Wolun[]): ReunionReport {
  const you = b.input.name?.trim() || '그 사람';
  const c = compatReport(a, b);
  const people = [
    { x: a, whom: '나', whose: '내' },
    { x: b, whom: you, whose: `${you}의` },
  ];
  let br: ReunionReport['breakup'] = null;
  if (breakup) {
    const p = pillarsOfMonth(breakup.year, breakup.month);
    // 센 신호: 그해가 배우자 자리를 충, 여자에게 상관·남자에게 겁재의 해. 약한 신호: 그해의 원진·형, 그달의 충, 대운이 바뀐 해
    const strong: string[] = [];
    const weak: string[] = [];
    const pair = (x: number, d: number) => `${BRANCHES[x].hanja}${BRANCHES[d].hanja}`;
    for (const { x, whom, whose } of people) {
      const d = x.pillars.day.branch;
      const y = p.year.branch;
      if (isChung(y, d)) strong.push(`그해의 기운이 ${whose} 배우자 자리와 정면으로 부딪혔어요 (${pair(y, d)} 충).`);
      else if (isWonjin(y, d)) weak.push(`그해의 기운이 ${whose} 배우자 자리와 어긋나, 이유 없는 서운함이 쌓이기 쉬웠어요 (${pair(y, d)} 원진).`);
      else if (isHyungPair(y, d)) weak.push(`그해의 기운이 ${whose} 배우자 자리와 부딪혀, 가까울수록 말이 날카로워지기 쉬웠어요 (${pair(y, d)} 형).`);
      if (isChung(p.month.branch, d)) weak.push(`그달의 기운이 ${whose} 배우자 자리와 부딪혔어요 (${pair(p.month.branch, d)} 충).`);
      const hurt = hurtStar(x, p.year.stem);
      if (hurt === '상관') strong.push(`그해는 ${whom}에게 상관(傷官)의 해였어요. 관계를 지키는 기운(관성)을 꺾는 해라, 상대의 부족함이 크게 보이고 말이 날카로워지기 쉬워요.`);
      if (hurt === '겁재') strong.push(`그해는 ${whom}에게 겁재(劫財)의 해였어요. 곁의 사람(재성)을 두고 경쟁하거나 빼앗기기 쉬운 해라, 자존심 싸움이 이별로 번지기 쉬워요.`);
    }
    // 큰 운(대운)이 바뀐 해 — 두 사람이 같은 해에 바뀌었으면 한 줄로
    const turned = people.filter(({ x }) => x.daeun.list.slice(1).some((dd) => dd.startYear === breakup.year));
    if (turned.length) weak.push(`${turned.length === 2 ? '두 사람 모두' : turned[0].whose} 큰 운(대운)이 바뀌던 해였어요. 삶의 방향이 바뀔 때는 관계도 함께 흔들리기 쉬워요.`);
    const signals = [...strong, ...weak];
    // 두 사람의 대운이 같은 해에 바뀌었으면 약한 신호 둘로 센다
    const shaken = strong.length > 0 || weak.length + (turned.length === 2 ? 1 : 0) >= 2;
    br = {
      when: `${breakup.year}년 ${breakup.month}월`,
      shaken,
      signals,
      text: shaken
        ? '헤어질 무렵의 운에 관계를 흔드는 신호가 있었어요. 그때의 이별에는 두 사람의 잘못만이 아니라 ‘흔들리기 쉬운 시기’라는 몫도 있었어요.'
        : signals.length
          ? '헤어질 무렵 작은 흔들림은 있었지만, 이별을 설명할 만큼 크지는 않았어요. 이별의 이유는 시기보다 두 사람 사이의 문제에 더 가까워요. 그 문제를 풀지 않으면 다시 만나도 같은 지점에서 멈추기 쉬워요.'
          : '헤어질 무렵의 운은 관계 자리를 크게 흔들지 않았어요. 그렇다면 이별의 이유는 시기보다 두 사람 사이의 문제에 더 가까워요. 그 문제를 풀지 않으면 다시 만나도 같은 지점에서 멈추기 쉬워요.',
      basis: `${breakup.year}년 ${pName(p.year)} · ${breakup.month}월 ${pName(p.month)}`,
    };
  }
  const repeat = c.bad.slice(0, 2).map((f) => ({ title: f.title, text: f.text }));
  if (!repeat.length)
    repeat.push({ title: '구조보다 상황의 문제', text: '타고난 구조에서 크게 부딪히는 지점은 적어요. 그때의 상황(거리·시간·주변 사람)이 무엇이었는지 먼저 돌아보세요.' });

  // 앞으로 12개월 — 배우자 자리와 합하는 달, 인연의 기운이 드는 달은 좋고, 배우자 자리를 치는 달, 관계를 지키는 기운을 치는 달은 피한다
  const scored = months.map((w) => {
    const s = w.pillar.stem;
    return {
      w,
      h: branchHit(w.pillar.branch, a, b),
      starMe: spouseStar(a, s),
      starYou: spouseStar(b, s),
      hurt: people.flatMap(({ x, whom }) => {
        const g = hurtStar(x, s);
        return g ? [{ whom, g }] : [];
      }),
    };
  });
  type M = (typeof scored)[number];
  const byTime = (x: { w: Wolun }, y: { w: Wolun }) => x.w.startMs - y.w.startMs;
  const pull = (x: M) => (x.h.good === '육합' ? 3 : x.h.good === '삼합' ? 2 : 0) + (x.starMe ? 1 : 0) + (x.starYou ? 1 : 0);
  const harm = (x: M) => (x.h.bad === '충' ? 3 : x.h.bad === '원진' ? 2 : x.h.bad === '형' ? 1 : 0) + (x.hurt.length ? 2 : 0);
  const goodWhy = (x: M) => {
    const star =
      x.starMe && x.starYou ? '두 사람 모두에게 인연의 기운이 드는 달' : x.starMe ? `나에게 인연의 기운(${x.starMe})이 드는 달` : x.starYou ? `${you}에게 인연의 기운(${x.starYou})이 드는 달` : '';
    const parts = [x.h.good ? `관계 자리와 손잡는 달(${x.h.good})` : '', star].filter(Boolean);
    return `${parts.join('이자 ')} — ${x.h.good ? '연락이 부드럽게 닿기 쉬워요.' : '마음을 전하기 좋아요.'}`;
  };
  const HURT_WORD = { 상관: '상관(傷官)', 겁재: '겁재(劫財)' } as const;
  const avoidWhy = (x: M) => {
    const parts = [x.h.bad ? `관계 자리를 흔드는 달(${x.h.bad})` : '', x.hurt.length ? `${x.hurt.map((h) => `${h.whom}에게 ${HURT_WORD[h.g]}`).join(', ')}의 달` : ''].filter(Boolean);
    const first = x.hurt[0]?.g;
    const end =
      first === '상관' ? '말이 날카로워져, 마음과 다른 말로 상처를 주기 쉬워요.' : first === '겁재' ? '자존심이 앞서 대화가 기싸움이 되기 쉬워요.' : '연락하면 지난 갈등이 되살아나기 쉬워요.';
    return `${parts.join('이자 ')} — ${end}`;
  };
  const good = scored
    .filter((x) => pull(x) > 0 && !harm(x) && x.w.score >= 46)
    .sort((x, y) => pull(y) - pull(x) || byTime(x, y))
    .slice(0, 3)
    .map((x) => ({ w: x.w, why: goodWhy(x) }));
  if (good.length < 2)
    for (const x of scored.filter((y) => !harm(y) && y.w.score >= 56 && !good.some((g) => g.w === y.w)).slice(0, 2 - good.length))
      good.push({ w: x.w, why: '내 운이 좋은 달 — 마음의 여유가 있어 대화가 차분해지기 쉬워요.' });
  good.sort(byTime);
  const avoid = scored
    .filter((x) => harm(x) > 0)
    .sort((x, y) => harm(y) - harm(x) || byTime(x, y))
    .slice(0, 3)
    .sort(byTime)
    .map((x) => ({ w: x.w, why: avoidWhy(x) }));

  const actions = [
    br && !br.shaken
      ? '먼저 헤어진 이유를 한 문장으로 적어 보세요. 그 이유가 지금 달라졌는지가 재회의 핵심이에요.'
      : '헤어진 이유 중 ‘시기 탓’과 ‘우리 탓’을 나눠 보세요. 시기 탓은 지나가고, 우리 탓은 남아요.',
    good.length ? '연락한다면 위의 좋은 달에, 짧고 부담 없는 안부로 시작하세요.' : '앞으로 몇 달은 연락보다 나를 돌보는 데 쓰는 게 좋아요.',
    `${josa(you, '이/가')} 다시 만나자고 하지 않아도 괜찮을 만큼 내 생활을 먼저 단단히 하세요. 그 모습이 가장 큰 설득이 돼요.`,
    '다시 만난다면, 위의 반복될 수 있는 문제가 다시 생겼을 때 어떻게 할지부터 함께 정하세요.',
  ];
  return {
    breakup: br,
    repeat,
    good,
    avoid,
    actions,
    note: '재회 가능성은 점수로 말하지 않아요. 사주는 시기와 조건을 보여 줄 뿐, 다시 만날지는 두 사람이 정하는 일이에요.',
  };
}

/** 오행 이름 (화면용) */
export const elementWord = (e: Element) => EL_WORD[e];
