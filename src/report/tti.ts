/**
 * 띠(12지) — 사주 연지(입춘 기준)로 본 띠의 전통적 성향, 올해와의 관계(삼재·충·합), 잘 맞는 띠.
 * 띠 성향은 민간에서 전해 오는 해석이라, 교차 검증에서는 한 체계로만 쓰고 사주 원국보다 앞세우지 않는다.
 */
import { BRANCHES, type SajuAnalysis } from '../engine/index.ts';
import { josa } from '../engine/josa.ts';

export const ANIMAL = ['쥐', '소', '호랑이', '토끼', '용', '뱀', '말', '양', '원숭이', '닭', '개', '돼지'];

export type ThemeKey = 'mind' | 'order' | 'express' | 'real' | 'self' | 'care' | 'move' | 'steady' | 'feel' | 'worry' | 'spend';

interface AnimalTrait {
  nick: string;
  keywords: string[];
  good: string;
  shadow: string;
  /** 이 띠가 분명히 가리키는 특성 / 분명히 아닌 특성 (나머지 테마는 띠로 판단하지 않는다) */
  yes: ThemeKey[];
  no: ThemeKey[];
}

const TRAITS: AnimalTrait[] = [
  { nick: '눈치 빠른 전략가', keywords: ['영리함', '눈치', '부지런함'], good: '상황 판단이 빠르고 기회를 놓치지 않아요', shadow: '계산과 걱정이 많아 마음이 쉬지 못해요', yes: ['mind', 'real', 'worry'], no: ['spend'] },
  { nick: '묵묵한 완주자', keywords: ['성실', '끈기', '고집'], good: '한번 시작하면 끝까지 해내요', shadow: '고집이 세고 속마음을 잘 말하지 않아요', yes: ['steady', 'order', 'feel'], no: ['move', 'spend'] },
  { nick: '앞장서는 개척자', keywords: ['용맹', '리더십', '자존심'], good: '두려움 없이 먼저 나서서 길을 열어요', shadow: '자존심이 상하면 쉽게 굽히지 못해요', yes: ['self', 'move'], no: ['worry'] },
  { nick: '섬세한 평화주의자', keywords: ['온화함', '섬세함', '감각'], good: '분위기를 부드럽게 만들고 감각이 좋아요', shadow: '갈등을 피하다 속앓이를 해요', yes: ['care', 'express', 'worry'], no: ['self'] },
  { nick: '판을 키우는 야망가', keywords: ['야망', '카리스마', '자신감'], good: '큰 그림을 그리고 사람을 끌어당겨요', shadow: '기대가 높아 실망도 커요', yes: ['self', 'express', 'mind'], no: ['steady'] },
  { nick: '속 깊은 전략가', keywords: ['지혜', '직관', '신중함'], good: '겉으로 드러내지 않고 깊이 꿰뚫어 봐요', shadow: '속을 잘 보이지 않아 오해를 사요', yes: ['mind', 'feel'], no: ['move'] },
  { nick: '자유로운 질주자', keywords: ['활동력', '자유', '열정'], good: '에너지가 넘치고 어디서든 분위기를 띄워요', shadow: '싫증을 잘 내고 충동적으로 움직여요', yes: ['move', 'express', 'self', 'spend'], no: ['steady', 'worry'] },
  { nick: '다정한 예술가', keywords: ['온순함', '배려', '예술 감각'], good: '사람을 편하게 하고 아름다운 것을 알아봐요', shadow: '마음이 여려 걱정과 눈치가 많아요', yes: ['care', 'express', 'worry'], no: ['self'] },
  { nick: '재주 많은 해결사', keywords: ['재치', '다재다능', '호기심'], good: '머리 회전이 빠르고 못 하는 게 없어요', shadow: '관심이 금방 옮겨 가 마무리가 약해요', yes: ['express', 'move', 'real'], no: ['steady'] },
  { nick: '꼼꼼한 완벽주의자', keywords: ['꼼꼼함', '부지런함', '직설'], good: '디테일을 놓치지 않고 계획대로 해내요', shadow: '말이 직설적이고 스스로를 몰아붙여요', yes: ['order', 'steady', 'real'], no: ['spend'] },
  { nick: '의리 있는 수호자', keywords: ['충직함', '정의감', '책임감'], good: '한번 믿은 사람은 끝까지 지켜요', shadow: '걱정이 많고 편을 가르기 쉬워요', yes: ['order', 'care', 'steady', 'worry'], no: ['spend'] },
  { nick: '복을 부르는 낙천가', keywords: ['너그러움', '솔직함', '복'], good: '마음이 넉넉해 주변에 사람과 복이 모여요', shadow: '마음이 약해 돈과 부탁에 쉽게 흔들려요', yes: ['care', 'real', 'spend'], no: ['worry'] },
];

/** 삼합 무리 (같은 무리끼리 잘 맞는다) */
const SAMHAP: number[][] = [
  [8, 0, 4], // 신자진 (원숭이·쥐·용)
  [11, 3, 7], // 해묘미 (돼지·토끼·양)
  [2, 6, 10], // 인오술 (호랑이·말·개)
  [5, 9, 1], // 사유축 (뱀·닭·소)
];
/** 삼재가 드는 해: 무리별로 [들삼재, 눌삼재, 날삼재] 연지 */
const SAMJAE_YEARS: Record<number, [number, number, number]> = {
  0: [2, 3, 4], // 신자진 → 인묘진년
  1: [5, 6, 7], // 해묘미 → 사오미년
  2: [8, 9, 10], // 인오술 → 신유술년
  3: [11, 0, 1], // 사유축 → 해자축년
};
const YUKHAP: Record<number, number> = { 0: 1, 1: 0, 2: 11, 11: 2, 3: 10, 10: 3, 4: 9, 9: 4, 5: 8, 8: 5, 6: 7, 7: 6 };
const WONJIN: Record<number, number> = { 0: 7, 7: 0, 1: 6, 6: 1, 2: 9, 9: 2, 3: 8, 8: 3, 4: 11, 11: 4, 5: 10, 10: 5 };

const groupOfBranch = (b: number) => SAMHAP.findIndex((g) => g.includes(b));
export const animalName = (b: number) => `${ANIMAL[b]}띠`;

export interface TtiYear {
  year: number;
  animal: string;
  hanja: string;
  samjae: '들삼재' | '눌삼재' | '날삼재' | null;
  relation: '충' | '원진' | '육합' | '삼합' | '같은 띠' | null;
  /** 한 줄 요약 */
  line: string;
  text: string;
  tone: 'good' | 'neutral' | 'bad';
}

export interface TtiInfo {
  branch: number;
  animal: string;
  name: string;
  hanja: string;
  nick: string;
  keywords: string[];
  good: string;
  shadow: string;
  yes: ThemeKey[];
  no: ThemeKey[];
  thisYear: TtiYear;
  nextYear: TtiYear;
  best: string[];
  caution: string[];
  /** 설날 기준 띠와 다를 때의 안내 */
  lunarNote: string | null;
}

function yearRelation(me: number, y: number, year: number, now: boolean): TtiYear {
  const when = now ? '올해' : `${year}년`;
  const gi = groupOfBranch(me);
  const sj = SAMJAE_YEARS[gi];
  const k = sj.indexOf(y);
  const samjae = k >= 0 ? (['들삼재', '눌삼재', '날삼재'] as const)[k] : null;
  let relation: TtiYear['relation'] = null;
  if (me === y) relation = '같은 띠';
  else if ((me + 6) % 12 === y) relation = '충';
  else if (WONJIN[me] === y) relation = '원진';
  else if (YUKHAP[me] === y) relation = '육합';
  else if (groupOfBranch(y) === gi) relation = '삼합';
  const yearAnimal = animalName(y);
  const parts: string[] = [];
  if (samjae) parts.push(`${year}년은 ${josa(samjae, '이에요/예요')}. 삼재는 세 해에 걸쳐 조심할 일이 많아진다는 민간 풍습이라, ${samjae === '들삼재' ? '새로 벌이는 큰일은 한 번 더 점검하세요' : samjae === '눌삼재' ? '무리한 확장보다 지키는 쪽이 나아요' : '마무리를 깔끔하게 하면 돼요'}.`);
  if (relation === '충') parts.push(`${when}의 ${yearAnimal}와 정면으로 부딪히는(충) 관계라 이동·변화가 많아지기 쉬워요. 큰 결정은 서두르지 마세요.`);
  if (relation === '원진') parts.push(`${when}의 ${yearAnimal}와는 원진(괜히 서운하고 어긋나기 쉬운 사이)이라 사람 사이의 말을 조심하면 좋아요.`);
  if (relation === '육합') parts.push(`${when}의 ${yearAnimal}와 육합(짝이 맞는 사이)이라 귀인과 협력의 기회가 생기기 쉬워요.`);
  if (relation === '삼합') parts.push(`${when}의 ${yearAnimal}와 삼합(같은 무리)이라 하는 일에 힘이 실리기 쉬워요.`);
  if (relation === '같은 띠') parts.push(`${josa(when, '은/는')} 내 띠의 해라 스스로를 돌아보고 새 판을 짜기 좋은 해로 봐요.`);
  if (!parts.length) parts.push(`${when}의 ${yearAnimal}와는 특별히 부딪히거나 합하는 관계가 없어 무난한 흐름이에요.`);
  const bad = !!samjae || relation === '충' || relation === '원진';
  const good = relation === '육합' || relation === '삼합';
  const tone: TtiYear['tone'] = good && !bad ? 'good' : bad && !good ? 'bad' : 'neutral';
  const line = samjae && good ? `${samjae}지만 ${relation}이 받쳐 줌` : samjae ? samjae : relation === '충' ? `${when} 띠와 충` : relation === '원진' ? `${when} 띠와 원진` : relation === '육합' ? `${when} 띠와 육합` : relation === '삼합' ? `${when} 띠와 삼합` : relation === '같은 띠' ? '내 띠의 해' : '무난한 해';
  return { year, animal: yearAnimal, hanja: BRANCHES[y].hanja, samjae, relation, line, text: parts.join(' '), tone };
}

export function ttiOf(a: SajuAnalysis): TtiInfo {
  const b = a.pillars.year.branch;
  const t = TRAITS[b];
  const gi = groupOfBranch(b);
  const best = [...SAMHAP[gi].filter((x) => x !== b), YUKHAP[b]].map(animalName);
  const caution = [(b + 6) % 12, WONJIN[b]].map(animalName);
  const yb = ((a.currentSajuYear - 4) % 12 + 12) % 12;
  // 설날 기준 띠: 음력 해의 지지
  const lunarBranch = (((a.pillars.lunarDate?.year ?? a.pillars.solarDate.year) - 4) % 12 + 12) % 12;
  const lunarNote =
    lunarBranch !== b
      ? `설날 기준으로는 ${animalName(lunarBranch)}예요. 사주는 입춘(2월 4일 무렵)에 해가 바뀌어 ${animalName(b)}로 봐요.`
      : null;
  return {
    branch: b,
    animal: ANIMAL[b],
    name: animalName(b),
    hanja: BRANCHES[b].hanja,
    nick: t.nick,
    keywords: t.keywords,
    good: t.good,
    shadow: t.shadow,
    yes: t.yes,
    no: t.no,
    thisYear: yearRelation(b, yb, a.currentSajuYear, true),
    nextYear: yearRelation(b, (yb + 1) % 12, a.currentSajuYear + 1, false),
    best,
    caution,
    lunarNote,
  };
}
