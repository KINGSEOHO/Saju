/**
 * MBTI × 사주 교차 분석
 *
 * 원칙
 *  - MBTI는 스스로 답한 성격 선호, 사주는 태어난 시점의 기운 구조다. 둘이 같은 말을 하면 그 특성은 더 확실하고,
 *    다르면 '겉으로 익힌 모습'과 '타고난 바탕'이 다를 수 있다고 본다.
 *  - 사주 쪽 경향은 십성 그룹·오행 비율·일간 음양으로 계산하고, 무엇을 근거로 했는지 항상 함께 보여 준다.
 *  - 두 체계를 억지로 맞추지 않는다. 어긋나면 어긋난다고 말한다.
 */
import { ELEMENT_HANJA, ELEMENT_KO, STEMS, type Element, type SajuAnalysis, type TenGod, type TenGodGroup } from '../engine/index.ts';
import { josa } from '../engine/josa.ts';

export type Mbti = string;
export const MBTI_LIST = ['INTJ', 'INTP', 'ENTJ', 'ENTP', 'INFJ', 'INFP', 'ENFJ', 'ENFP', 'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ', 'ISTP', 'ISFP', 'ESTP', 'ESFP'] as const;

export function parseMbti(s: string | undefined | null): Mbti | null {
  const t = (s ?? '').trim().toUpperCase();
  return /^[EI][SN][TF][JP]$/.test(t) ? t : null;
}

export type Fn = 'Ni' | 'Ne' | 'Si' | 'Se' | 'Ti' | 'Te' | 'Fi' | 'Fe';

export const FN_INFO: Record<Fn, { name: string; desc: string; tenGods: TenGod[] }> = {
  Ni: { name: '통찰', desc: '앞을 내다보고 핵심을 꿰뚫는 힘', tenGods: ['편인', '정인'] },
  Ne: { name: '발상', desc: '가능성과 아이디어를 넓히는 힘', tenGods: ['상관', '식신', '편인'] },
  Si: { name: '경험', desc: '경험과 기억을 바탕으로 꼼꼼히 지키는 힘', tenGods: ['정인', '정재', '정관'] },
  Se: { name: '현장', desc: '지금 이 순간에 몸으로 반응하는 힘', tenGods: ['편재', '겁재', '식신'] },
  Ti: { name: '분석', desc: '원리를 따지고 논리를 세우는 힘', tenGods: ['상관', '편인', '비견'] },
  Te: { name: '실행', desc: '목표를 세우고 효율적으로 밀어붙이는 힘', tenGods: ['편관', '정관', '편재'] },
  Fi: { name: '가치', desc: '자기 신념과 감정에 충실한 힘', tenGods: ['비견', '식신', '편인'] },
  Fe: { name: '조화', desc: '사람들의 감정을 읽고 분위기를 맞추는 힘', tenGods: ['정인', '식신', '정관'] },
};

export const TG_POWER: Record<TenGod, string> = {
  비견: '내 방식대로 버티는 자존감',
  겁재: '승부욕과 행동력',
  식신: '꾸준히 만들어 내는 생산력',
  상관: '틀을 깨는 재치와 표현력',
  편재: '기회를 잡는 활동력',
  정재: '꼼꼼하게 모으는 관리력',
  편관: '압박을 이기는 추진력',
  정관: '원칙을 지키는 신뢰',
  편인: '남다른 직관과 전문성',
  정인: '배우고 품는 힘',
};

interface TypeProfile {
  nick: string;
  one: string;
  fn: [Fn, Fn, Fn, Fn];
  strengths: string[];
  weaknesses: string[];
  stress: string;
  growth: string;
}

export const MBTI_PROFILE: Record<string, TypeProfile> = {
  INTJ: {
    nick: '전략가',
    one: '큰 그림을 그리고 혼자서 끝까지 설계하는 사람',
    fn: ['Ni', 'Te', 'Fi', 'Se'],
    strengths: ['멀리 내다보고 계획을 세우는 힘', '목표를 정하면 효율적으로 밀어붙이는 실행력', '남의 평가에 흔들리지 않는 독립성'],
    weaknesses: ['완벽한 계획이 나올 때까지 시작을 미루기 쉽다', '남의 감정을 비효율로 여겨 차갑게 보일 수 있다', '도움을 청하지 않고 혼자 짊어진다'],
    stress: '스트레스가 극에 달하면 평소와 달리 먹고 사고 노는 감각적인 쾌락으로 도망치기 쉬워요.',
    growth: '계획이 70% 됐을 때 시작하고, 결론을 말하기 전에 상대의 마음을 한 번 묻는 연습',
  },
  INTP: {
    nick: '분석가',
    one: '원리를 파고들며 머릿속 세계를 정리하는 사람',
    fn: ['Ti', 'Ne', 'Si', 'Fe'],
    strengths: ['복잡한 문제의 원리를 꿰뚫는 분석력', '틀에 얽매이지 않는 아이디어', '객관적이고 공정한 판단'],
    weaknesses: ['생각에 비해 실행과 마무리가 약하다', '관심 없는 일에는 집중하지 못한다', '감정 표현이 서툴러 무심해 보인다'],
    stress: '스트레스가 쌓이면 갑자기 감정이 폭발하거나, 평소 신경 쓰지 않던 남의 평가에 과민해져요.',
    growth: '아이디어를 작게라도 완성해 보는 습관, 고마움과 서운함을 말로 꺼내는 연습',
  },
  ENTJ: {
    nick: '지휘관',
    one: '목표를 세우고 사람과 자원을 움직여 결과를 내는 사람',
    fn: ['Te', 'Ni', 'Se', 'Fi'],
    strengths: ['결단력과 추진력', '조직을 체계적으로 이끄는 리더십', '어려운 목표에도 물러서지 않는 의지'],
    weaknesses: ['속도를 못 따라오는 사람에게 조급해진다', '감정보다 결과를 앞세워 관계를 놓친다', '쉬는 법을 잘 모른다'],
    stress: '지치면 평소 미뤄 둔 감정이 한꺼번에 밀려와 “아무도 나를 이해하지 못한다”는 서운함에 빠져요.',
    growth: '결과만큼 과정의 사람을 챙기고, 일정에 쉼을 먼저 넣는 연습',
  },
  ENTP: {
    nick: '발명가',
    one: '가능성을 보면 일단 부딪혀 보는 아이디어형 사람',
    fn: ['Ne', 'Ti', 'Fe', 'Si'],
    strengths: ['새로운 아이디어와 순발력', '논리적인 토론과 설득', '변화에 빠르게 적응하는 힘'],
    weaknesses: ['시작은 많고 마무리는 적다', '반박을 즐기다 상대를 지치게 한다', '반복되는 일상 업무를 견디기 어렵다'],
    stress: '지치면 사소한 몸의 이상이나 과거의 실수에 집착하는 모습이 나와요.',
    growth: '하나를 끝낸 뒤 다음을 시작하는 규칙, 이기는 대화보다 남는 대화를 고르는 연습',
  },
  INFJ: {
    nick: '통찰가',
    one: '사람의 속마음을 읽고 의미 있는 방향을 찾는 사람',
    fn: ['Ni', 'Fe', 'Ti', 'Se'],
    strengths: ['사람과 상황을 꿰뚫는 통찰', '깊은 공감과 배려', '신념을 지키는 꾸준함'],
    weaknesses: ['마음속에 쌓아 두다 어느 날 갑자기 관계를 끊는다', '이상이 높아 현실에 쉽게 실망한다', '남을 챙기다 정작 자신은 지친다'],
    stress: '한계에 이르면 폭식·충동구매처럼 감각에 빠지거나 사소한 것에 집착해요.',
    growth: '서운함을 작을 때 말하고, 완벽하지 않은 사람과 현실을 받아들이는 연습',
  },
  INFP: {
    nick: '이상주의자',
    one: '자기만의 가치와 감수성으로 세상을 보는 사람',
    fn: ['Fi', 'Ne', 'Si', 'Te'],
    strengths: ['풍부한 감수성과 창의력', '진정성 있는 공감', '자기 가치를 지키는 힘'],
    weaknesses: ['현실적인 일 처리와 마감에 약하다', '상처를 오래 품는다', '결정을 미루다 기회를 놓친다'],
    stress: '궁지에 몰리면 평소와 달리 날카롭게 남을 비판하고 통제하려 들어요.',
    growth: '마감을 작은 목표로 쪼개고, 마음을 글이나 결과물로 꺼내는 연습',
  },
  ENFJ: {
    nick: '이끄는 사람',
    one: '사람을 모으고 성장시키며 분위기를 이끄는 사람',
    fn: ['Fe', 'Ni', 'Se', 'Ti'],
    strengths: ['사람의 마음을 움직이는 소통력', '공동체를 이끄는 책임감', '남의 가능성을 알아보는 눈'],
    weaknesses: ['남의 기대에 맞추느라 자신을 잃는다', '거절을 잘 못 한다', '갈등을 피하려다 문제를 키운다'],
    stress: '지치면 갑자기 냉정해져 남의 논리적 허점을 날카롭게 공격하는 모습이 나와요.',
    growth: '“아니요”를 말하는 연습, 내 일정과 감정을 남의 것보다 먼저 확인하기',
  },
  ENFP: {
    nick: '아이디어 뱅크',
    one: '호기심과 열정으로 사람과 가능성을 연결하는 사람',
    fn: ['Ne', 'Fi', 'Te', 'Si'],
    strengths: ['넘치는 에너지와 아이디어', '사람을 끌어당기는 친화력', '새로운 시작을 두려워하지 않는 용기'],
    weaknesses: ['흥미가 식으면 마무리가 약해진다', '감정 기복이 크다', '현실적인 계획과 돈 관리에 약하다'],
    stress: '번아웃이 오면 몸 상태나 사소한 실수에 집착하며 우울해져요.',
    growth: '일을 시작할 때 끝낼 날짜를 함께 정하고, 고정 지출과 저축을 자동화하기',
  },
  ISTJ: {
    nick: '원칙주의자',
    one: '약속과 원칙을 지키며 꼼꼼하게 쌓아 가는 사람',
    fn: ['Si', 'Te', 'Fi', 'Ne'],
    strengths: ['책임감과 신뢰', '꼼꼼한 일 처리', '경험에서 나온 현실적 판단'],
    weaknesses: ['변화와 예외를 불편해한다', '감정 표현이 적어 딱딱해 보인다', '새로운 방식을 시도하는 데 느리다'],
    stress: '지치면 최악의 상황만 상상하며 불안에 빠져요.',
    growth: '작은 변화를 실험처럼 시도해 보고, 칭찬과 고마움을 말로 표현하는 연습',
  },
  ISFJ: {
    nick: '수호자',
    one: '곁에 있는 사람을 묵묵히 챙기고 지키는 사람',
    fn: ['Si', 'Fe', 'Ti', 'Ne'],
    strengths: ['세심한 배려', '성실함과 인내', '구체적인 기억력과 실무 능력'],
    weaknesses: ['거절을 못 해 일을 떠안는다', '변화를 걱정부터 한다', '자기 필요를 늘 뒤로 미룬다'],
    stress: '한계에 이르면 미래에 대한 막연한 불안과 최악의 시나리오에 사로잡혀요.',
    growth: '내 몫과 남의 몫을 구분하고, 나를 위한 시간을 일정에 고정하기',
  },
  ESTJ: {
    nick: '관리자',
    one: '질서와 규칙으로 조직을 굴러가게 만드는 사람',
    fn: ['Te', 'Si', 'Ne', 'Fi'],
    strengths: ['조직력과 실행력', '분명한 기준과 책임감', '현실적인 문제 해결'],
    weaknesses: ['자기 방식만 옳다고 여기기 쉽다', '감정을 비효율로 본다', '융통성이 부족해 보인다'],
    stress: '지치면 평소와 달리 “아무도 나를 인정하지 않는다”는 서운함과 감정에 휩쓸려요.',
    growth: '결정 전에 다른 방식을 한 번 들어 보고, 사람의 기분을 일의 일부로 챙기기',
  },
  ESFJ: {
    nick: '돌보미',
    one: '사람 사이를 따뜻하게 잇고 모두를 챙기는 사람',
    fn: ['Fe', 'Si', 'Ne', 'Ti'],
    strengths: ['친화력과 배려', '모임을 꾸리는 조직력', '성실한 책임감'],
    weaknesses: ['남의 평가에 예민하다', '갈등을 견디기 힘들어한다', '남을 챙기다 자신을 잃는다'],
    stress: '지치면 남의 말에서 논리적 허점을 찾아 날카롭게 따지는 모습이 나와요.',
    growth: '모두를 만족시키려 하지 않고, 내 기준으로 결정하는 연습',
  },
  ISTP: {
    nick: '해결사',
    one: '문제가 생기면 조용히 손으로 해결하는 사람',
    fn: ['Ti', 'Se', 'Ni', 'Fe'],
    strengths: ['위기 대처 능력', '손재주와 실용적인 기술', '침착하고 객관적인 태도'],
    weaknesses: ['감정 표현이 적어 무심해 보인다', '장기 계획과 약속에 약하다', '규칙에 얽매이는 것을 싫어한다'],
    stress: '지치면 갑자기 감정이 북받치거나 남의 평가를 크게 신경 써요.',
    growth: '가까운 사람에게 근황과 감정을 먼저 나누고, 6개월 이상 걸리는 목표를 하나 세우기',
  },
  ISFP: {
    nick: '감성 예술가',
    one: '지금 이 순간의 아름다움과 자기 감성을 소중히 하는 사람',
    fn: ['Fi', 'Se', 'Ni', 'Te'],
    strengths: ['감각적인 미적 감각', '따뜻하고 온화한 태도', '자기 가치에 충실함'],
    weaknesses: ['갈등을 피하다 속으로 삭인다', '장기 계획과 경쟁에 약하다', '자신을 낮게 평가한다'],
    stress: '궁지에 몰리면 평소와 달리 남을 비판하고 효율만 따지는 모습이 나와요.',
    growth: '작품과 결과물을 밖에 보여 주는 연습, 하고 싶은 것을 계획표로 옮기기',
  },
  ESTP: {
    nick: '행동파',
    one: '생각보다 몸이 먼저 움직이는 현장형 사람',
    fn: ['Se', 'Ti', 'Fe', 'Ni'],
    strengths: ['빠른 판단과 실행력', '위기에 강한 순발력', '사람을 사로잡는 화술'],
    weaknesses: ['충동적인 결정과 지출', '장기 계획에 약하다', '규칙과 반복을 지루해한다'],
    stress: '지치면 근거 없는 불길한 예감에 사로잡혀요.',
    growth: '큰 결정은 하루 미루고, 1년 단위 목표를 적어 두기',
  },
  ESFP: {
    nick: '분위기 메이커',
    one: '어디서든 사람들을 즐겁게 만드는 사람',
    fn: ['Se', 'Fi', 'Te', 'Ni'],
    strengths: ['밝은 에너지와 친화력', '현장 감각과 순발력', '사람을 기분 좋게 하는 표현력'],
    weaknesses: ['계획과 돈 관리에 약하다', '갈등과 비판을 피하려 한다', '지루한 일을 미룬다'],
    stress: '지치면 앞날에 대한 막연한 불안과 비관에 빠져요.',
    growth: '재미있는 일에도 마감을 붙이고, 저축을 자동화하기',
  },
};

// ---------------------------------------------------------------------------
// 사주로 본 네 가지 경향
// ---------------------------------------------------------------------------
export type Axis = 'EI' | 'SN' | 'TF' | 'JP';
export const AXES: Axis[] = ['EI', 'SN', 'TF', 'JP'];

export const AXIS_INFO: Record<Axis, { name: string; a: string; b: string; aKo: string; bKo: string }> = {
  EI: { name: '에너지 방향', a: 'E', b: 'I', aKo: '외향', bKo: '내향' },
  SN: { name: '인식 방식', a: 'S', b: 'N', aKo: '감각', bKo: '직관' },
  TF: { name: '판단 기준', a: 'T', b: 'F', aKo: '사고', bKo: '감정' },
  JP: { name: '생활 방식', a: 'J', b: 'P', aKo: '계획', bKo: '즉흥' },
};

const LETTER_KO: Record<string, string> = { E: '외향', I: '내향', S: '감각', N: '직관', T: '사고', F: '감정', J: '계획', P: '즉흥' };

export interface AxisLean {
  axis: Axis;
  /** 0~100. 50보다 크면 두 번째 글자(I·N·F·P) 쪽 */
  score: number;
  /** 뚜렷하면 해당 글자, 비슷하면 null */
  lean: string | null;
  /** 근거 (계산에 크게 작용한 요소) */
  basis: string[];
}

/**
 * 원시 점수 → 0~100 정규화 기준값.
 * 무작위 명식 6,000건(1930~2025년생)에서 각 축 비율의 평균·표준편차를 구해 맞췄다.
 * 그 결과 축마다 약 60%는 한쪽으로 기울고 40%는 ‘반반’으로 나온다 (tests/mbti.test.ts 에서 분포 확인).
 */
const NORM: Record<Axis, [number, number]> = { EI: [0.4778, 0.1218], SN: [0.501, 0.1479], TF: [0.5479, 0.1413], JP: [0.5198, 0.1452] };

function factors(a: SajuAnalysis) {
  const gp = a.elements.groupPercent;
  const el = a.elements.percent;
  const t = a.elements.tenGodCount;
  const yang = STEMS[a.pillars.day.stem].polarity === 'yang';
  const yeokma = a.sinsal.some((s) => s.name.includes('역마'));
  return { gp, el, t, yang, yeokma, strength: a.strength.score };
}

/** 각 축의 [앞 글자 원시 점수, 뒤 글자 원시 점수, 근거] */
export function rawAxes(a: SajuAnalysis): Record<Axis, [number, number, [string, number][]]> {
  const { gp, el, t, yang, yeokma, strength } = factors(a);
  const p = (n: number) => `${n.toFixed(0)}%`;
  const E: [string, number][] = [
    [`식상 ${p(gp['식상'])}(표현)`, 0.9 * gp['식상']],
    [`재성 ${p(gp['재성'])}(활동)`, 0.5 * gp['재성']],
    [`화 기운 ${p(el.fire)}`, 0.6 * el.fire],
    [`목 기운 ${p(el.wood)}`, 0.3 * el.wood],
    [`비겁 ${p(gp['비겁'])}`, 0.3 * gp['비겁']],
    ['양(陽)의 일간', yang ? 8 : 0],
    ['신강', Math.max(0, strength - 50) * 0.2],
  ];
  const I: [string, number][] = [
    [`인성 ${p(gp['인성'])}(사색)`, 1.0 * gp['인성']],
    [`수 기운 ${p(el.water)}`, 0.7 * el.water],
    [`토 기운 ${p(el.earth)}`, 0.3 * el.earth],
    [`금 기운 ${p(el.metal)}`, 0.3 * el.metal],
    ['음(陰)의 일간', yang ? 0 : 8],
    ['신약', Math.max(0, 50 - strength) * 0.2],
  ];
  const S: [string, number][] = [
    [`재성 ${p(gp['재성'])}(현실)`, 0.8 * gp['재성']],
    [`관성 ${p(gp['관성'])}(규칙)`, 0.4 * gp['관성']],
    [`토 기운 ${p(el.earth)}`, 0.5 * el.earth],
    [`금 기운 ${p(el.metal)}`, 0.4 * el.metal],
    ['정재', 4 * t['정재']],
  ];
  const N: [string, number][] = [
    [`인성 ${p(gp['인성'])}(사색)`, 0.7 * gp['인성']],
    [`식상 ${p(gp['식상'])}(발상)`, 0.6 * gp['식상']],
    [`수 기운 ${p(el.water)}`, 0.5 * el.water],
    [`화 기운 ${p(el.fire)}`, 0.3 * el.fire],
    ['편인', 5 * t['편인']],
    ['상관', 5 * t['상관']],
  ];
  const T: [string, number][] = [
    [`관성 ${p(gp['관성'])}(판단)`, 0.6 * gp['관성']],
    [`금 기운 ${p(el.metal)}`, 0.6 * el.metal],
    [`수 기운 ${p(el.water)}`, 0.3 * el.water],
    [`재성 ${p(gp['재성'])}(계산)`, 0.3 * gp['재성']],
    ['편관', 4 * t['편관']],
    ['상관', 3 * t['상관']],
  ];
  const F: [string, number][] = [
    [`인성 ${p(gp['인성'])}(돌봄)`, 0.6 * gp['인성']],
    [`식상 ${p(gp['식상'])}(감성)`, 0.5 * gp['식상']],
    [`목 기운 ${p(el.wood)}`, 0.6 * el.wood],
    [`화 기운 ${p(el.fire)}`, 0.5 * el.fire],
    ['식신', 4 * t['식신']],
    ['정인', 4 * t['정인']],
  ];
  const J: [string, number][] = [
    [`관성 ${p(gp['관성'])}(질서)`, 0.7 * gp['관성']],
    [`토 기운 ${p(el.earth)}`, 0.4 * el.earth],
    [`금 기운 ${p(el.metal)}`, 0.3 * el.metal],
    ['정관', 4 * t['정관']],
    ['정재', 3 * t['정재']],
    ['정인', 3 * t['정인']],
  ];
  const P: [string, number][] = [
    [`식상 ${p(gp['식상'])}(자유)`, 0.7 * gp['식상']],
    [`수 기운 ${p(el.water)}`, 0.4 * el.water],
    [`목 기운 ${p(el.wood)}`, 0.3 * el.wood],
    ['상관', 4 * t['상관']],
    ['편재', 4 * t['편재']],
    ['편인', 3 * t['편인']],
    ['겁재', 3 * t['겁재']],
    ['역마살', yeokma ? 6 : 0],
  ];
  const sum = (xs: [string, number][]) => xs.reduce((s, [, v]) => s + v, 0);
  return {
    EI: [sum(E), sum(I), [...E.map(([k, v]): [string, number] => [k, v]), ...I.map(([k, v]): [string, number] => [k, -v])]],
    SN: [sum(S), sum(N), [...S.map(([k, v]): [string, number] => [k, v]), ...N.map(([k, v]): [string, number] => [k, -v])]],
    TF: [sum(T), sum(F), [...T.map(([k, v]): [string, number] => [k, v]), ...F.map(([k, v]): [string, number] => [k, -v])]],
    JP: [sum(J), sum(P), [...J.map(([k, v]): [string, number] => [k, v]), ...P.map(([k, v]): [string, number] => [k, -v])]],
  };
}

export function sajuAxes(a: SajuAnalysis): Record<Axis, AxisLean> {
  const raw = rawAxes(a);
  const out = {} as Record<Axis, AxisLean>;
  for (const ax of AXES) {
    const [x, y, parts] = raw[ax];
    const ratio = y / Math.max(1e-6, x + y);
    const [mean, sd] = NORM[ax];
    const score = Math.round(Math.max(5, Math.min(95, 50 + ((ratio - mean) / sd) * 15)));
    const info = AXIS_INFO[ax];
    const lean = score >= 58 ? info.b : score <= 42 ? info.a : null;
    // 결론 쪽으로 가장 크게 작용한 근거 3개
    const dir = lean === info.b ? -1 : 1;
    const basis = parts
      .filter(([, v]) => v * dir > 0.5)
      .sort((p, q) => Math.abs(q[1]) - Math.abs(p[1]))
      .slice(0, 3)
      .map(([k]) => k);
    out[ax] = { axis: ax, score, lean, basis };
  }
  return out;
}

/** 사주로만 본 4글자 경향 (뚜렷하지 않은 축은 소문자 x) */
export function sajuType(a: SajuAnalysis): string {
  const ax = sajuAxes(a);
  return AXES.map((k) => ax[k].lean ?? 'x').join('');
}

// ---------------------------------------------------------------------------
// 교차 판정 문장
// ---------------------------------------------------------------------------
const WHY: Record<string, string> = {
  E: '표현(식상)·활동(재성)·불(화) 기운이 많아 에너지가 밖으로 향하는 구조',
  I: '배움·사색(인성)과 물(수) 기운이 많아 에너지가 안으로 모이는 구조',
  S: '현실(재성)·규칙(관성)과 흙·쇠 기운이 많아 구체적인 것을 믿는 구조',
  N: '직관(인성)·아이디어(식상)·물 기운이 많아 가능성을 먼저 보는 구조',
  T: '판단(관성)과 쇠(금) 기운이 많아 옳고 그름으로 결정하는 구조',
  F: '돌봄(인성·식상)과 나무·불 기운이 많아 사람과 마음을 먼저 보는 구조',
  J: '규칙(관성)·안정(정재·정인)과 흙 기운이 많아 계획대로 움직이려는 구조',
  P: '자유(식상·편재)와 물 기운이 많아 상황에 따라 움직이려는 구조',
};

const AGREE: Record<string, string> = {
  E: '사람 속에서 에너지를 얻는 것이 타고난 바탕이라, 혼자 오래 있으면 오히려 기운이 가라앉아요. 사람을 만나고 말하는 일이 곧 충전이에요.',
  I: '혼자 생각하고 회복하는 시간이 타고난 바탕이에요. 사람을 만나는 일도 잘 해내지만, 끝나고 나면 반드시 혼자만의 회복 시간이 필요해요.',
  S: '눈에 보이는 사실과 경험을 믿는 것이 타고난 바탕이에요. 막연한 이야기보다 숫자·사례·실물로 설명할 때 가장 설득력이 있어요.',
  N: '보이지 않는 가능성과 의미를 먼저 읽는 것이 타고난 바탕이에요. 반복 업무보다 새로운 기획·연구에서 진가가 드러나요.',
  T: '원칙과 논리로 판단하는 것이 타고난 바탕이에요. 공정하다는 신뢰를 얻는 대신, 말이 차갑게 들릴 수 있다는 점은 기억해 두세요.',
  F: '사람과 마음을 먼저 헤아리는 것이 타고난 바탕이에요. 팀의 분위기를 지키는 힘이 크지만, 남의 감정을 떠안아 쉽게 지칠 수 있어요.',
  J: '계획하고 정리된 상태에서 가장 편안한 것이 타고난 바탕이에요. 일정과 규칙이 있는 환경에서 실력이 안정적으로 나와요.',
  P: '상황에 맞춰 유연하게 움직이는 것이 타고난 바탕이에요. 변화가 많은 환경에서 빛나지만, 마감과 마무리는 장치로 보완하는 것이 좋아요.',
};

/** MBTI 글자(키)와 사주가 반대일 때 */
const DIFF: Record<string, string> = {
  E: '밖에서는 활발하고 사람을 잘 대하지만, 타고난 바탕은 혼자 충전하는 쪽일 가능성이 커요. 사회생활로 익힌 외향성이라 사람을 많이 만난 날은 생각보다 더 지쳐요. 일정 사이에 혼자 있는 시간을 꼭 끼워 넣으세요.',
  I: '스스로는 내향적이라고 느끼지만, 사주에는 밖으로 표현하고 움직이려는 기운이 커요. 마음이 맞는 자리에서는 누구보다 말이 많고 주도적인 편이고, 표현을 너무 참으면 오히려 답답함이 쌓여요.',
  S: '현실적이고 꼼꼼하게 일하지만, 바탕에는 큰 그림과 새로운 가능성을 그리는 힘이 숨어 있어요. 반복 업무만 계속하면 이유 모를 답답함이 생기니, 기획이나 새로운 시도의 기회를 일부러 만드세요.',
  N: '생각과 아이디어가 많은 편이지만, 사주는 현실 감각과 실행 쪽을 가리켜요. 아이디어를 구체적인 숫자와 일정으로 바꾸는 순간 진짜 힘이 나와요.',
  T: '논리적으로 판단하려 하지만, 바탕에는 사람의 마음을 크게 신경 쓰는 성향이 있어요. 냉정하게 결정한 뒤 오래 마음에 걸린 적이 있다면 이 때문이에요.',
  F: '사람의 마음을 먼저 헤아리지만, 사주에는 원칙과 판단의 기운이 강해요. 참다가 결정적인 순간에는 누구보다 단호해지는 편이라, 그 단호함이 주변에는 갑작스럽게 느껴질 수 있어요.',
  J: '계획대로 움직이려 노력하지만, 바탕에는 자유롭고 즉흥적인 기운이 있어요. 계획을 너무 빡빡하게 세우면 스스로 지치니, 여백이 있는 계획이 더 잘 맞아요.',
  P: '즉흥적이고 유연하다고 느끼지만, 사주는 안정과 질서를 원하는 쪽이에요. 예측할 수 없는 상황이 길어지면 생각보다 크게 불안해지니, 생활의 기본 리듬은 지켜 두세요.',
};

const AXIS_STRENGTH: Record<string, string> = {
  E: '사람을 만나며 기회를 넓히는 힘',
  I: '혼자 깊이 몰입하는 집중력',
  S: '사실과 경험에 근거한 실무 능력',
  N: '남보다 먼저 가능성을 보는 기획력',
  T: '흔들리지 않는 판단력',
  F: '사람의 마음을 얻는 공감력',
  J: '계획대로 끝까지 해내는 완수력',
  P: '변화에 빠르게 적응하는 유연성',
};

export type Verdict = 'agree' | 'neutral' | 'differ';

export interface AxisCross {
  axis: Axis;
  info: (typeof AXIS_INFO)[Axis];
  user: string;
  saju: AxisLean;
  verdict: Verdict;
  /** 같은 방향일 때의 일치 정도(%) */
  match: number;
  title: string;
  text: string;
}

export function crossAxis(ax: Axis, userLetter: string, saju: AxisLean): AxisCross {
  const info = AXIS_INFO[ax];
  const other = userLetter === info.a ? info.b : info.a;
  // 사용자 글자 쪽으로 얼마나 기울었는지 (0~100)
  const toward = userLetter === info.b ? saju.score : 100 - saju.score;
  let verdict: Verdict;
  let title: string;
  let text: string;
  if (saju.lean === userLetter) {
    verdict = 'agree';
    title = `${userLetter}(${LETTER_KO[userLetter]}) — 사주와 같은 방향`;
    text = `MBTI의 ${userLetter}(${LETTER_KO[userLetter]})와 사주가 같은 쪽을 가리켜요. 사주는 ${josa(WHY[userLetter], '이에요/예요')}. ${AGREE[userLetter]}`;
  } else if (saju.lean === other) {
    verdict = 'differ';
    title = `${userLetter}(${LETTER_KO[userLetter]}) — 사주는 ${other}(${LETTER_KO[other]}) 쪽`;
    text = `MBTI는 ${userLetter}(${LETTER_KO[userLetter]})인데, 사주는 ${josa(WHY[other], '이에요/예요')}. ${DIFF[userLetter]}`;
  } else {
    verdict = 'neutral';
    title = `${userLetter}(${LETTER_KO[userLetter]}) — 사주로는 반반`;
    text = `사주로는 ${info.aKo}과 ${info.bKo}의 기운이 비슷하게 섞여 있어요. MBTI의 ${userLetter}(${LETTER_KO[userLetter]}) 성향은 타고난 쪽이라기보다 경험과 환경으로 굳어진 선호일 수 있어, 상황에 따라 반대 모습도 자연스럽게 나와요.`;
  }
  return { axis: ax, info, user: userLetter, saju, verdict, match: Math.round(toward), title, text };
}

// ---------------------------------------------------------------------------
// 개운법
// ---------------------------------------------------------------------------
export const GAEUN: Record<Element, { color: string; direction: string; number: string; time: string; taste: string; place: string; solo: string; social: string }> = {
  wood: { color: '초록·청록', direction: '동쪽', number: '3·8', time: '아침', taste: '신맛(과일·채소)', place: '숲·공원처럼 나무가 많은 곳', solo: '아침 산책, 식물 키우기, 새로운 분야 독학', social: '등산·러닝 모임, 스터디나 강의 수강' },
  fire: { color: '빨강·주황·분홍', direction: '남쪽', number: '2·7', time: '한낮', taste: '쓴맛(차 한 잔)과 따뜻한 음식', place: '햇빛이 잘 드는 밝은 곳', solo: '햇빛 아래 걷기, 땀이 날 만큼 운동하기, 사진·영상으로 기록하기', social: '사람 만나 이야기하기, 발표·공연·모임을 직접 이끌기' },
  earth: { color: '노랑·베이지·갈색', direction: '중앙(생활 터전 가까이)', number: '5·10', time: '규칙적인 식사 시간', taste: '단맛(곡물·뿌리채소)', place: '흙을 밟을 수 있는 평지·집 근처', solo: '같은 시간에 먹고 자기, 요리·정리·저축 습관', social: '오래된 모임 지키기, 약속 시간 엄수, 가족과의 식사' },
  metal: { color: '흰색·은색·금색', direction: '서쪽', number: '4·9', time: '저녁', taste: '매운맛은 적당히, 견과류', place: '정돈된 공간·탁 트인 높은 곳', solo: '방과 책상 정리, 근력 운동, 악기·서예처럼 규칙 있는 연습', social: '팀 운동, 규칙이 분명한 동호회 활동' },
  water: { color: '검정·남색', direction: '북쪽', number: '1·6', time: '밤(충분한 수면)', taste: '짠 음식은 줄이고 물은 충분히', place: '물가·바다·조용한 곳', solo: '충분한 수면, 명상·독서·기록, 수영이나 반신욕', social: '깊은 대화가 되는 소수 모임, 북클럽' },
};

export const GISIN_AVOID: Record<Element, string> = {
  wood: '무리한 확장과 새 일 벌이기',
  fire: '과열된 경쟁, 밤샘, 자극적인 음식',
  earth: '걱정만 하며 미루기, 과식',
  metal: '지나친 완벽주의와 날 선 말',
  water: '생각만 하고 움직이지 않기, 밤낮이 바뀐 생활',
};

// ---------------------------------------------------------------------------
// 종합
// ---------------------------------------------------------------------------
export interface MbtiInsight {
  title: string;
  text: string;
  basis: string;
}

export interface MbtiCross {
  type: string;
  profile: TypeProfile;
  axes: AxisCross[];
  agree: number;
  differ: number;
  /** 사주로만 본 4글자 경향 */
  sajuType: string;
  engine: { fn: Fn; tenGods: TenGod[]; same: 'same' | 'partial' | 'diff'; text: string };
  strengths: MbtiInsight[];
  weaknesses: MbtiInsight[];
  gaeun: { element: Element; items: { label: string; value: string }[]; habits: string[]; avoid: string; growth: string };
  summary: string;
}

function topTenGods(a: SajuAnalysis): TenGod[] {
  const c = a.elements.tenGodCount;
  const h = a.elements.tenGodHidden;
  return (Object.keys(c) as TenGod[])
    .filter((t) => c[t] + h[t] > 0)
    .sort((x, y) => c[y] + h[y] * 0.35 - (c[x] + h[x] * 0.35))
    .slice(0, 2);
}

const GROUP_STRENGTH: Record<TenGodGroup, string> = {
  비겁: '스스로 버티고 밀고 나가는 자립심',
  식상: '생각을 결과물과 말로 꺼내는 표현력',
  재성: '현실을 읽고 성과로 바꾸는 감각',
  관성: '책임을 지고 신뢰를 얻는 힘',
  인성: '배우고 깊이 이해하는 힘',
};

export function mbtiCross(a: SajuAnalysis, type: string, mainWeakness?: string): MbtiCross {
  const profile = MBTI_PROFILE[type];
  const sx = sajuAxes(a);
  const axes = AXES.map((ax, i) => crossAxis(ax, type[i], sx[ax]));
  const agree = axes.filter((x) => x.verdict === 'agree').length;
  const differ = axes.filter((x) => x.verdict === 'differ').length;
  const who = a.input.name ? `${a.input.name}님` : '당신';

  // 핵심 엔진: MBTI 주기능 vs 사주에서 가장 두드러진 십성
  const tops = topTenGods(a);
  const [dom, aux] = profile.fn;
  const sameDom = FN_INFO[dom].tenGods.some((t) => tops.includes(t));
  const sameAux = FN_INFO[aux].tenGods.some((t) => tops.includes(t));
  const same: 'same' | 'partial' | 'diff' = sameDom ? 'same' : sameAux ? 'partial' : 'diff';
  const tgText = tops.map((t) => `${t}(${TG_POWER[t]})`).join('과 ');
  const engineText =
    same === 'same'
      ? `MBTI로 본 ${type}의 주기능은 ‘${FN_INFO[dom].name}’, 곧 ${josa(FN_INFO[dom].desc, '이에요/예요')}. 사주에서 가장 두드러진 십성도 ${tgText}이어서, 두 체계가 같은 엔진을 가리켜요. 이 힘은 ${who}이 가장 믿고 써도 되는 무기예요.`
      : same === 'partial'
        ? `MBTI로 본 주기능은 ‘${FN_INFO[dom].name}’(${FN_INFO[dom].desc})이고, 보조 기능은 ${josa(`‘${FN_INFO[aux].name}’(${FN_INFO[aux].desc})`, '이에요/예요')}. 사주에서 두드러진 ${tgText}은 보조 기능 쪽과 맞닿아 있어요. 즉 겉으로 가장 많이 쓰는 힘과 타고난 힘이 조금 다르며, 보조 기능을 의식적으로 키울수록 균형이 잡혀요.`
        : `MBTI로 본 주기능은 ‘${FN_INFO[dom].name}’(${FN_INFO[dom].desc})인데, 사주에서 두드러진 것은 ${josa(tgText, '이에요/예요')}. 겉으로 쓰는 힘과 타고난 힘의 결이 달라, 지금의 모습이 환경에 맞춰 익힌 것일 수 있어요. 사주 쪽 힘을 쓸 기회를 만들면 의외의 재능이 나올 수 있어요.`;

  // 강점: 일치하는 축 → 핵심 엔진 → 사주 가장 강한 기운
  const strengths: MbtiInsight[] = [];
  for (const x of [...axes].filter((x) => x.verdict === 'agree').sort((p, q) => q.match - p.match)) {
    strengths.push({ title: AXIS_STRENGTH[x.user], text: `MBTI(${x.user})와 사주가 함께 가리키는 힘이에요. ${AGREE[x.user].split('. ')[0]}.`, basis: `사주 ${x.saju.basis.join(' · ') || '기운 분포'}` });
    if (strengths.length >= 2) break;
  }
  if (same !== 'diff') {
    strengths.push({ title: `${FN_INFO[same === 'same' ? dom : aux].name}의 힘`, text: `${FN_INFO[same === 'same' ? dom : aux].desc}. ${type}의 ${same === 'same' ? '주기능' : '보조 기능'}과 사주의 ${tops.join('·')}이 같은 힘을 가리켜요.`, basis: `${type} 기능 · 사주 ${tops.join('·')}` });
  }
  const gp = a.elements.groupPercent;
  const topGroup = (Object.keys(gp) as TenGodGroup[]).sort((x, y) => gp[y] - gp[x])[0];
  strengths.push({ title: GROUP_STRENGTH[topGroup], text: `${type}의 강점인 ‘${profile.strengths[0]}’ 위에, 사주에서 가장 강한 ${topGroup}(${gp[topGroup].toFixed(0)}%)의 힘이 더해져요.`, basis: `${topGroup} ${gp[topGroup].toFixed(0)}%` });
  // 일치하는 축이 적은 사람도 강점이 세 가지는 나오도록, 유형 강점에 사주의 두 번째 기운을 붙여 채운다
  const second = (Object.keys(gp) as TenGodGroup[]).sort((x, y) => gp[y] - gp[x])[1];
  for (const st of profile.strengths.slice(1)) {
    strengths.push({ title: st, text: `${type}의 대표 강점이에요. 사주에서는 ${second}(${gp[second].toFixed(0)}%)의 ${GROUP_STRENGTH[second]}이 이 강점을 받쳐 줘요.`, basis: `${type} · ${second} ${gp[second].toFixed(0)}%` });
  }
  const uniqStrengths = strengths.filter((s, i) => strengths.findIndex((x) => x.title === s.title) === i).slice(0, 3);

  // 약점: MBTI 약점 + 사주 약점 + 겉과 속의 차이
  const weaknesses: MbtiInsight[] = [];
  weaknesses.push({ title: profile.weaknesses[0], text: `${type}에게 흔한 약점이에요. 보완법: ${profile.growth}.`, basis: `${type} 유형 특성` });
  if (mainWeakness) weaknesses.push({ title: '사주가 경고하는 약점', text: mainWeakness, basis: '사주 원국 분석' });
  const diffAxis = axes.find((x) => x.verdict === 'differ');
  if (diffAxis) {
    weaknesses.push({
      title: `겉(${diffAxis.user})과 속(${diffAxis.saju.lean})의 차이`,
      text: `보이는 모습과 실제 에너지가 달라 남들보다 쉽게 지칠 수 있어요. ${DIFF[diffAxis.user].split('. ').slice(-1)[0]}`,
      basis: `${diffAxis.info.name} 교차 결과`,
    });
  } else {
    weaknesses.push({ title: '스트레스가 극에 달했을 때', text: profile.stress, basis: `${type} 열등 기능` });
  }

  // 개운법
  const ys = a.yongsin.yongsin;
  const g = GAEUN[ys];
  const intro = type[0] === 'I';
  const habits = [
    `${intro ? '혼자서' : '사람들과'}: ${intro ? g.solo : g.social}`,
    `${intro ? '가끔은 사람들과' : '가끔은 혼자서'}: ${intro ? g.social : g.solo}`,
    `${type}에게 필요한 연습: ${profile.growth}`,
  ];
  const gisin = a.yongsin.gisin;
  const gaeun = {
    element: ys,
    items: [
      { label: '색', value: g.color },
      { label: '방향', value: g.direction },
      { label: '숫자', value: g.number },
      { label: '시간대', value: g.time },
      { label: '음식', value: g.taste },
      { label: '장소', value: g.place },
    ],
    habits,
    avoid: `피할 것: ${GISIN_AVOID[gisin]} — 사주에 부담이 되는 ${ELEMENT_KO[gisin]}(${ELEMENT_HANJA[gisin]}) 기운을 키우는 생활이에요.`,
    growth: profile.growth,
  };

  const summary =
    agree >= 3
      ? `${who}의 MBTI(${type})와 사주는 네 가지 축 중 ${agree}개에서 같은 방향을 가리켜요. 스스로 알고 있는 모습이 타고난 바탕과 거의 같다는 뜻이라, 지금의 강점을 믿고 밀고 나가도 돼요.`
      : agree === 2
        ? `${who}의 MBTI(${type})와 사주는 네 가지 축 중 ${agree}개가 같고 ${differ}개가 달라요. 같은 부분은 확실한 강점으로, 다른 부분은 ‘겉으로 익힌 모습’과 ‘타고난 바탕’의 차이로 읽으면 돼요.`
        : `${who}의 MBTI(${type})와 사주는 같은 방향이 ${agree}개뿐이에요. 지금의 성격은 환경과 경험으로 단단히 다져진 것일 수 있고, 사주가 가리키는 반대쪽 성향은 아직 덜 쓴 잠재력일 수 있어요.`;

  return {
    type,
    profile,
    axes,
    agree,
    differ,
    sajuType: AXES.map((k) => sx[k].lean ?? 'x').join(''),
    engine: { fn: dom, tenGods: tops, same, text: engineText },
    strengths: uniqStrengths,
    weaknesses: weaknesses.slice(0, 3),
    gaeun,
    summary,
  };
}
