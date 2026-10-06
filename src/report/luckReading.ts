/**
 * 운(월운·세운) 풀이 — “이 시기에는 무엇을 하면 좋고, 무엇을 조심해야 하나”
 *
 * 재료
 *  - 들어오는 천간·지지의 십성(무슨 일이 생기기 쉬운가)
 *  - 그 오행이 이 명식에 용신·희신(도움)인지 기신·구신(부담)인지 (같은 십성이라도 사람마다 길흉이 다름)
 *  - 원국과의 충·합·형·원진·귀문, 도화·역마·천을귀인
 * 월운은 지지를 주된 흐름으로, 세운은 천간=상반기·지지=하반기의 전통적 구분을 함께 쓴다.
 */
import { BRANCHES, ELEMENT_KO, STEMS, mainStemOf, type GodRole, type LuckPillar, type Position, type SajuAnalysis, type TenGod } from '../engine/index.ts';
import { isNobleBranch, twelveSinsal } from '../engine/sinsal.ts';
import { ELEMENT_ORGAN } from './kb.ts';

export interface LuckReading {
  headline: string;
  tone: 'positive' | 'neutral' | 'negative';
  /** 이렇게 하면 좋아요 */
  good: string[];
  /** 이건 조심하세요 */
  caution: string[];
  /** 관계·건강·흐름 참고 */
  notes: string[];
  evidence: string;
}

interface GodText {
  theme: string;
  favHead: string;
  unfavHead: string;
  neutralHead: string;
  good: string[];
  bad: string[];
  /** 길흉과 무관하게 이 기운에 따라붙는 위험 */
  always?: string;
  /** 이 기운이 부담으로 올 때의 대응 */
  defend: string;
  loveMale?: string;
  loveFemale?: string;
}

// {p} = 달 / 해
const GOD: Record<TenGod, GodText> = {
  비견: {
    defend: '혼자 결정하기보다 믿을 만한 사람과 상의하고, 지출 계획부터 세우세요.',
    theme: '자기 주도',
    favHead: '내 힘으로 밀고 나가기 좋은 {p}',
    unfavHead: '고집과 경쟁이 부딪히는 {p}',
    neutralHead: '내 페이스를 지켜야 하는 {p}',
    good: [
      '미뤄 둔 일을 남에게 기대지 말고 직접 결정해 추진하세요.',
      '뜻이 맞는 동료·친구와 힘을 합치면 혼자보다 결과가 좋습니다.',
      '운동을 시작하거나 생활 루틴을 다잡기에 좋습니다.',
    ],
    bad: [
      '동업·공동 투자·돈 빌려주기는 이 시기에 피하세요.',
      '내 방식만 고집하면 주변과 마찰이 커집니다. 결정 전에 한 사람의 의견은 꼭 들어 보세요.',
      '모임·경조사 등으로 지출이 늘기 쉬우니 예산을 먼저 정해 두세요.',
    ],
  },
  겁재: {
    defend: '돈이 오가는 약속은 미루고, 지금 가진 것을 지키는 데 집중하세요.',
    theme: '경쟁·승부',
    favHead: '경쟁에서 치고 나가기 좋은 {p}',
    unfavHead: '돈과 사람 문제로 새기 쉬운 {p}',
    neutralHead: '경쟁 속에서 실속을 따져야 하는 {p}',
    good: ['입찰·면접·시합처럼 승부를 걸어야 하는 일에 도전해 볼 만합니다.', '혼자 버거운 일은 팀을 꾸려 돌파하세요.'],
    bad: [
      '보증·돈거래·충동구매는 하지 마세요. 이 시기 손실의 가장 흔한 경로입니다.',
      '가까운 사람과 돈 문제로 서운해지기 쉽습니다. 금액과 기한은 글로 남기세요.',
      '단기 매매·고위험 투자는 손실 위험이 큽니다.',
    ],
    always: '꼭 필요하지 않은 큰 결제는 다음으로 미루는 편이 안전합니다.',
  },
  식신: {
    defend: '일을 늘리기보다 잠·식사 같은 생활 리듬부터 바로잡으세요.',
    theme: '표현·생산',
    favHead: '실력을 결과물로 보여 주기 좋은 {p}',
    unfavHead: '늘어지고 흐트러지기 쉬운 {p}',
    neutralHead: '여유 속에 작은 성과를 만드는 {p}',
    good: [
      '배우고 싶던 기술을 시작하거나 포트폴리오·작품을 만들어 보세요.',
      '아이디어를 작게라도 실행해 반응을 확인하기 좋습니다.',
      '좋은 음식·여행으로 컨디션을 회복하기 좋은 때입니다.',
    ],
    bad: ['과식·과음·늦잠으로 생활 리듬이 무너지기 쉽습니다.', '시작만 하고 마무리하지 못한 일이 쌓이기 쉬우니 하나씩 끝내세요.'],
  },
  상관: {
    defend: '불만은 바로 말하지 말고 적어 두었다가, 정리된 말로 나중에 꺼내세요.',
    theme: '변화·표현·도전',
    favHead: '틀을 깨고 아이디어를 밀어붙이기 좋은 {p}',
    unfavHead: '말 한마디로 손해 보기 쉬운 {p}',
    neutralHead: '하고 싶은 말이 많아지는 {p}',
    good: [
      '기획·발표·영업·콘텐츠처럼 말과 표현이 무기인 일에서 성과가 납니다.',
      '불합리한 점은 개선을 제안해 보세요. 감정 대신 데이터로 말하면 통합니다.',
    ],
    bad: [
      '상사·윗사람과 정면으로 부딪히기 쉽습니다. 반박은 하루 묵힌 뒤 글로 하세요.',
      '감정적인 퇴사·이별 결정은 이 시기에 미루세요.',
      'SNS·단체방에서의 날 선 말은 구설로 돌아옵니다.',
    ],
    always: '하고 싶은 말은 바로 꺼내지 말고 한 번 정리한 뒤에 하세요.',
  },
  편재: {
    defend: '수입을 늘리기보다 새는 돈을 막는 데 집중하고, 투자 판단은 다음으로 미루세요.',
    theme: '활동·돈의 흐름',
    favHead: '돈과 기회가 움직이는 {p}',
    unfavHead: '들어오는 만큼 새기 쉬운 {p}',
    neutralHead: '돈의 흐름이 바빠지는 {p}',
    good: ['영업·거래·부업처럼 수입을 늘리는 활동에 적극적으로 나서 보세요.', '사람을 많이 만날수록 기회가 넓어집니다.'],
    bad: ['큰 투자·대출·과소비는 피하세요. 확인되지 않은 정보로 하는 투자는 특히 위험합니다.', '바쁘게 움직이는 만큼 지출과 피로도 같이 늘어납니다.'],
    always: '들어온 돈의 일부는 바로 떼어 따로 모아 두세요.',
    loveMale: '이성과의 만남이 늘기 쉬운 시기입니다. 가벼운 관계로 흐르지 않도록 주의하세요.',
  },
  정재: {
    defend: '당장의 손익보다 장기 계획을 점검하는 시간으로 쓰세요.',
    theme: '실속·관리',
    favHead: '차곡차곡 실속을 챙기는 {p}',
    unfavHead: '돈 걱정에 시야가 좁아지는 {p}',
    neutralHead: '살림과 실속을 점검하는 {p}',
    good: ['저축·가계부·자산 점검처럼 돈을 정리하는 일에 좋습니다.', '맡은 일을 꼼꼼히 마무리하면 신뢰가 쌓입니다.', '정산·미수금처럼 받을 돈을 챙기세요.'],
    bad: ['작은 손익에 매달리다 더 큰 기회를 놓치기 쉽습니다.', '돈 문제로 가족·연인과 신경전이 생기기 쉽습니다.'],
    loveMale: '안정적인 이성 인연이나 결혼 이야기가 오가기 쉬운 시기입니다.',
  },
  편관: {
    defend: '일을 줄이고 쉬는 일정을 먼저 잡으세요. 이 시기에는 버티는 것만으로도 충분합니다.',
    theme: '압박·책임·결단',
    favHead: '압박을 성과로 바꾸는 {p}',
    unfavHead: '스트레스와 사고를 조심할 {p}',
    neutralHead: '책임과 긴장이 커지는 {p}',
    good: ['어려운 과제나 책임 있는 역할을 맡으면 존재감을 보여 줄 수 있습니다.', '미뤄 둔 결단을 내리기에 좋습니다.'],
    bad: [
      '과로와 무리한 일정은 건강 문제로 이어지기 쉽습니다.',
      '운전·운동 중 부상, 법적 분쟁·관공서 문제에 주의하세요.',
      '윗사람의 압박에 감정적으로 맞서면 손해가 큽니다.',
    ],
    always: '일정에 여유 시간을 꼭 남겨 두세요.',
    loveFemale: '강한 성격의 이성과 엮이기 쉬운 시기입니다. 끌림과 압박을 구분하세요.',
  },
  정관: {
    defend: '맡을 일과 거절할 일을 분명히 나누고, 기본 규칙부터 지키세요.',
    theme: '인정·책임·규칙',
    favHead: '인정받고 자리가 잡히는 {p}',
    unfavHead: '책임과 체면에 눌리는 {p}',
    neutralHead: '규칙과 책임을 지켜야 하는 {p}',
    good: ['승진·평가·면접·자격 심사에 적극적으로 지원해 보세요.', '약속과 규정을 지키는 모습이 그대로 평판이 됩니다.'],
    bad: ['남의 시선 때문에 감당하기 힘든 일을 떠안기 쉽습니다.', '지각·규정 위반 같은 작은 실수가 크게 번지기 쉽습니다.'],
    loveFemale: '진지한 이성 인연이나 결혼 이야기가 오가기 쉬운 시기입니다.',
  },
  편인: {
    defend: '할 일을 작게 쪼개 하나씩 끝내고, 사람을 만나는 일정을 일부러 넣으세요.',
    theme: '직관·몰입·전환',
    favHead: '깊이 파고들어 감을 잡는 {p}',
    unfavHead: '생각만 많고 실행이 막히는 {p}',
    neutralHead: '혼자 생각이 깊어지는 {p}',
    good: ['연구·공부·전문 기술처럼 깊이가 필요한 일에 몰입하기 좋습니다.', '혼자 생각을 정리할 시간을 따로 확보하세요.'],
    bad: [
      '계획을 자꾸 바꾸거나 시작한 일을 접기 쉽습니다.',
      '고립감·불면·우울감이 오기 쉬우니 사람을 만나는 일정을 일부러 넣으세요.',
      '서류는 서명하기 전에 한 번 더 확인하세요.',
    ],
    always: '할 일을 작게 쪼개 하루에 하나씩 끝내세요.',
  },
  정인: {
    defend: '도움을 기다리기보다 작은 일 하나라도 직접 끝내세요.',
    theme: '학습·도움·문서',
    favHead: '도움과 좋은 문서가 들어오는 {p}',
    unfavHead: '기대고 미루기 쉬운 {p}',
    neutralHead: '배우고 준비하는 {p}',
    good: ['계약·서류·자격시험 같은 문서 일을 진행하기 좋습니다.', '윗사람·선배에게 조언을 구하면 도움이 됩니다.', '새로운 공부를 시작하기 좋은 때입니다.'],
    bad: ['남의 도움만 기다리다 타이밍을 놓치기 쉽습니다.', '편한 것만 찾다 보면 할 일이 밀립니다.', '계약 조건은 꼼꼼히 확인하세요.'],
  },
};

function favOf(role: GodRole): -1 | 0 | 1 {
  if (role === '용신' || role === '희신') return 1;
  if (role === '기신' || role === '구신') return -1;
  return 0;
}

const GROUP: Record<TenGod, string> = {
  비견: '비겁', 겁재: '비겁', 식신: '식상', 상관: '식상', 편재: '재성', 정재: '재성', 편관: '관성', 정관: '관성', 편인: '인성', 정인: '인성',
};

type Item = { text: string; pri: number };

function take(items: Item[], n: number): string[] {
  const seen = new Set<string>();
  return items
    .map((x, i) => ({ ...x, i }))
    .sort((a, b) => b.pri - a.pri || a.i - b.i)
    .filter((x) => (seen.has(x.text) ? false : (seen.add(x.text), true)))
    .slice(0, n)
    .map((x) => x.text);
}

/**
 * @param period '달'(월운) | '해'(세운)
 * @param score 길흉 판단에 쓸 점수 (세운은 대운과 합산한 점수를 넘긴다). 생략하면 lp.score
 */
export function readLuck(a: SajuAnalysis, lp: LuckPillar, period: '달' | '해', score: number = lp.score): LuckReading {
  const male = a.input.gender === 'male';
  const luckPos: Position = period === '달' ? 'wolun' : 'seun';
  const P = GOD[lp.branchTenGod];
  const S = GOD[lp.stemTenGod];
  const pf = favOf(lp.branchRole);
  const sf = favOf(lp.stemRole);
  const fill = (s: string) => s.replaceAll('{p}', period);

  const tone: LuckReading['tone'] = score >= 58 ? 'positive' : score <= 42 ? 'negative' : 'neutral';
  let headline: string;
  if (tone === 'positive') headline = pf >= 0 ? P.favHead : S.favHead;
  else if (tone === 'negative') headline = pf <= 0 ? P.unfavHead : S.unfavHead;
  else headline = P.neutralHead;

  const good: Item[] = [];
  const caution: Item[] = [];
  const notes: Item[] = [];

  // 주된 흐름(지지)
  if (pf >= 0) P.good.slice(0, pf === 1 ? 2 : 1).forEach((t, i) => good.push({ text: t, pri: 50 - i }));
  if (pf <= 0) P.bad.slice(0, pf === -1 ? 2 : 1).forEach((t, i) => caution.push({ text: t, pri: 50 - i }));
  // 보조 흐름(천간)
  const sameGroup = GROUP[lp.stemTenGod] === GROUP[lp.branchTenGod];
  if (sameGroup) {
    if (sf === 1 && P.good[2]) good.push({ text: P.good[2], pri: 30 });
    if (sf === -1 && P.bad[2]) caution.push({ text: P.bad[2], pri: 30 });
  } else {
    if (sf === 1) good.push({ text: S.good[0], pri: 35 });
    if (sf === -1) caution.push({ text: S.bad[0], pri: 35 });
    if (sf === 0) good.push({ text: S.good[0], pri: 20 });
  }
  if (P.always) caution.push({ text: P.always, pri: pf <= 0 ? 25 : 15 });
  if (!sameGroup && S.always && sf <= 0) caution.push({ text: S.always, pri: 12 });

  // 세운: 천간 = 상반기, 지지 = 하반기
  if (period === '해' && !sameGroup) {
    notes.push({ text: `상반기에는 ${S.theme}, 하반기에는 ${P.theme}의 흐름이 더 강하게 나타나기 쉽습니다.`, pri: 40 });
  }

  // 원국과의 관계
  for (const it of lp.interactions) {
    const natal = it.positions.filter((p) => p !== luckPos);
    const has = (p: Position) => natal.includes(p);
    switch (it.kind) {
      case '육충':
        if (has('day')) caution.push({ text: `가까운 사람(연인·배우자·가족)과 부딪히거나 이사·환경 변화가 생기기 쉽습니다. 중요한 대화는 감정이 가라앉은 뒤에 하세요.`, pri: 60 });
        if (has('month')) caution.push({ text: '직장·업무 환경이 흔들리거나 계획이 바뀌기 쉽습니다. 일정마다 대안을 하나씩 마련해 두세요.', pri: 58 });
        if (has('year')) caution.push({ text: '집안 어른이나 오래 이어 온 일과 관련된 변동이 생기기 쉽습니다.', pri: 40 });
        if (has('hour')) caution.push({ text: '자녀·후배, 또는 진행 중인 결과물에 변수가 생기기 쉽습니다.', pri: 40 });
        break;
      case '육합':
        if (has('day')) good.push({ text: '새로운 인연이 생기거나 관계가 단단해지기 쉽습니다. 만나고 싶던 사람에게 먼저 연락해 보세요.', pri: 55 });
        else good.push({ text: '협력과 계약이 순조롭게 맺어지기 쉽습니다. 미뤄 둔 제안이 있다면 이때 꺼내 보세요.', pri: 33 });
        break;
      case '천간합':
        if (has('day')) notes.push({ text: '나를 붙잡는 제안이나 계약이 들어오기 쉽습니다. 좋아 보여도 조건을 따져 보고 결정하세요.', pri: 45 });
        break;
      case '천간충':
        if (has('day') || has('month')) caution.push({ text: '생각이 다른 사람과 의견 충돌이 생기기 쉽습니다. 이기려 하기보다 기록을 남기세요.', pri: 36 });
        break;
      case '삼형':
        caution.push({ text: '세 글자가 모여 형(刑)을 이루는 강한 마찰의 기운입니다. 서류·계약·법적 문제와 수술·부상에 주의하고, 운전과 운동은 평소보다 조심하세요.', pri: 56 });
        break;
      case '형':
        caution.push({ text: '일이 꼬이거나 사람 사이에 마찰이 생기기 쉽습니다. 서류와 약속은 한 번 더 확인하세요.', pri: 32 });
        break;
      case '자형':
        caution.push({ text: '스스로를 몰아붙이거나 자책하기 쉬운 시기입니다. 완벽보다 마무리를 목표로 하세요.', pri: 24 });
        break;
      case '원진':
        if (has('day')) caution.push({ text: '가까운 사람에게 이유 없이 서운해지기 쉽습니다. 사소한 말투에 예민해지지 않도록 하세요.', pri: 42 });
        break;
      case '귀문':
        caution.push({ text: '신경이 예민해지고 잠을 설치기 쉽습니다. 잠드는 시간을 일정하게 지키세요.', pri: 38 });
        break;
      case '파':
        caution.push({ text: '약속과 계획이 틀어지기 쉬우니 일정을 한 번 더 확인하세요.', pri: 30 });
        break;
      case '해':
        caution.push({ text: '은근한 오해나 방해가 생기기 쉬우니 중요한 내용은 기록으로 남기세요.', pri: 22 });
        break;
      case '반합':
      case '삼합':
      case '방합':
        if (it.element) {
          const r = favOf(a.yongsin.roles[it.element]);
          const name = `${ELEMENT_KO[it.element]}(${it.chars})`;
          if (r === 1) good.push({ text: `${name} 기운이 크게 모여 하는 일에 힘이 실립니다. 중요한 일은 이 시기에 몰아서 진행하세요.`, pri: 44 });
          if (r === -1) caution.push({ text: `${name} 기운이 한꺼번에 몰려 균형이 무너지기 쉽습니다. 무리한 확장은 피하세요.`, pri: 44 });
        }
        break;
      default:
        break;
    }
  }

  // 신살: 도화·역마·천을귀인
  const b = lp.pillar.branch;
  const yb = a.pillars.year.branch;
  const db = a.pillars.day.branch;
  const ss = [twelveSinsal(yb, b), twelveSinsal(db, b)];
  if (ss.includes('연살')) notes.push({ text: '이성의 관심을 받거나 만남이 늘기 쉽습니다. 그만큼 구설도 따르니 처신을 단정히 하세요.', pri: 38 });
  if (ss.includes('역마살')) notes.push({ text: '이동·출장·여행·이사처럼 움직일 일이 생기기 쉽습니다.', pri: 34 });
  if (isNobleBranch(a.pillars.day.stem, b)) good.push({ text: '어려울 때 도와주는 사람이 나타나기 쉽습니다. 도움을 청하는 데 주저하지 마세요.', pri: 46 });

  // 연애 신호 (남: 재성, 여: 관성)
  const loveTexts = [male ? P.loveMale : P.loveFemale, male ? S.loveMale : S.loveFemale].filter(Boolean) as string[];
  if (loveTexts.length) notes.push({ text: loveTexts[0], pri: 39 });

  // 건강
  const el = STEMS[mainStemOf(b)].element;
  if (a.elements.percent[el] >= 30) {
    notes.push({ text: `원래 강한 ${ELEMENT_KO[el]} 기운이 더해져 ${ELEMENT_ORGAN[el].organs.split(',')[0]} 쪽에 무리가 오기 쉽습니다.`, pri: 30 });
  }
  if (pf === -1 && sf === -1) caution.push({ text: '체력과 컨디션이 떨어지기 쉬우니 무리한 일정은 줄이세요.', pri: 26 });

  // 흐름이 나쁠 때의 대응 (방어) — 부담이 되는 기운의 성격에 맞춰
  if (tone === 'negative') {
    good.push({ text: (pf <= 0 ? P : S).defend, pri: 48 });
    if (!sameGroup && pf <= 0 && sf === -1) good.push({ text: S.defend, pri: 31 });
    if (score < 35) good.push({ text: '계약·투자·이직 같은 큰 결정은 서두르지 말고 한 번 더 확인하세요.', pri: 29 });
    good.push({ text: '새로 벌이기보다 하던 일을 정리하고 마무리하는 데 힘을 쓰세요.', pri: 10 });
  }

  // 최소 1개씩 보장
  if (!good.length) good.push({ text: (pf === -1 ? S : P).good[0], pri: 1 });
  if (!caution.length) caution.push({ text: (pf === 1 ? P : S).bad[0], pri: 1 });

  const evidence = `천간 ${STEMS[lp.pillar.stem].hanja} ${lp.stemTenGod}(${lp.stemRole}) · 지지 ${BRANCHES[b].hanja} ${lp.branchTenGod}(${lp.branchRole})${
    lp.flags.length ? ` · ${lp.flags.map((f) => f.split(':')[0]).join(', ')}` : ''
  }`;

  return {
    headline: fill(headline),
    tone,
    good: take(good, 4).map(fill),
    caution: take(caution, 4).map(fill),
    notes: take(notes, 3).map(fill),
    evidence,
  };
}
