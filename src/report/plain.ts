/**
 * 쉬운 말 사전 — 사주를 전혀 몰라도 읽히도록 전문 용어를 생활의 말로 옮긴다.
 * 화면과 리포트가 같은 말을 쓰도록 여기 한곳에 모은다.
 */
import {
  BRANCHES, ELEMENT_HANJA, STEMS, controls, generates, mainStemOf,
  type Element, type GodRole, type Position, type SajuAnalysis, type StrengthLevel, type TenGod, type TenGodGroup,
} from '../engine/index.ts';
import { josa } from '../engine/josa.ts';

export const EL_WORD: Record<Element, string> = { wood: '나무', fire: '불', earth: '흙', metal: '쇠', water: '물' };
/** 나무(木) */
export const elWord = (e: Element) => `${EL_WORD[e]}(${ELEMENT_HANJA[e]})`;

/** 다섯 기운이 뜻하는 것 */
export const EL_FORCE: Record<Element, { force: string; keys: string }> = {
  wood: { force: '자라고 뻗어 가는 힘', keys: '시작·성장·배움' },
  fire: { force: '밝게 드러나는 힘', keys: '열정·표현·속도' },
  earth: { force: '붙잡고 버티는 힘', keys: '안정·신용·중재' },
  metal: { force: '자르고 다듬는 힘', keys: '결단·규칙·정확함' },
  water: { force: '흐르고 스며드는 힘', keys: '생각·지혜·휴식' },
};

/** 십성 다섯 갈래(나와의 관계)를 쉬운 말로 */
export const GROUP_PLAIN: Record<TenGodGroup, { name: string; rel: string; who: string }> = {
  비겁: { name: '나를 지키는 힘', rel: '나와 같은 기운', who: '나 자신·친구·동료·경쟁자' },
  식상: { name: '표현하고 만드는 힘', rel: '내가 낳는 기운', who: '말·재능·작품·아랫사람' },
  재성: { name: '돈과 현실을 다루는 힘', rel: '내가 다스리는 기운', who: '돈·일의 결과·현실 감각' },
  관성: { name: '규칙과 책임의 힘', rel: '나를 다스리는 기운', who: '직장·규칙·평가·윗사람' },
  인성: { name: '배우고 쉬는 힘', rel: '나를 낳아 주는 기운', who: '공부·자격·쉼·도와주는 사람' },
};
/** 표현하고 만드는 힘(식상) */
export const groupWord = (g: TenGodGroup) => `${GROUP_PLAIN[g].name}(${g})`;

/** 십성 열 가지를 두세 글자로 */
export const TEN_GOD_PLAIN: Record<TenGod, string> = {
  비견: '동료·자립',
  겁재: '경쟁·승부',
  식신: '재능·여유',
  상관: '말·끼',
  편재: '큰돈·사업',
  정재: '월급·저축',
  편관: '압박·도전',
  정관: '직장·규칙',
  편인: '직관·특기',
  정인: '공부·자격',
};

/** 용신·희신·한신·구신·기신을 쉬운 말로 */
export const ROLE_PLAIN: Record<GodRole, { short: string; long: string; tone: 'good' | 'mid' | 'bad' }> = {
  용신: { short: '가장 필요한 기운', long: '기울어진 균형을 맞춰 주는, 나에게 가장 필요한 기운', tone: 'good' },
  희신: { short: '도와주는 기운', long: '가장 필요한 기운을 거들어 주는 기운', tone: 'good' },
  한신: { short: '무난한 기운', long: '좋지도 나쁘지도 않은, 영향이 적은 기운', tone: 'mid' },
  구신: { short: '부담을 키우는 기운', long: '가장 부담되는 기운에 힘을 보태는 기운', tone: 'bad' },
  기신: { short: '가장 부담되는 기운', long: '이미 넘치는 쪽을 더 키워 균형을 무너뜨리는 기운', tone: 'bad' },
};

/** 신강·신약 단계를 쉬운 말로 */
export const LEVEL_PLAIN: Record<StrengthLevel, { title: string; short: string; desc: string }> = {
  극왕: {
    title: '힘이 넘쳐흐르는 사주',
    short: '힘이 넘침',
    desc: '내 편 기운이 압도적이에요. 누가 말려도 내 길을 가는 타입이라, 힘을 쏟을 큰 목표가 없으면 그 힘이 고집과 충돌로 새어 나가요.',
  },
  태강: {
    title: '힘이 아주 센 사주',
    short: '힘이 아주 셈',
    desc: '혼자서도 밀어붙이는 엔진이 아주 강해요. 대신 브레이크가 약해 “내 말이 맞다”로 흐르기 쉬워, 힘을 밖으로 쓸 통로(일·표현·운동)가 꼭 필요해요.',
  },
  신강: {
    title: '힘이 센 편인 사주',
    short: '힘이 센 편',
    desc: '스스로 판을 벌이고 끌고 가는 힘이 있어요. 남이 정해 준 길보다 내가 정한 길에서 살아나고, 혼자 다 하려다 지치는 것이 약점이에요.',
  },
  중화신강: {
    title: '균형형 · 살짝 힘이 센 쪽',
    short: '균형형(살짝 셈)',
    desc: '힘이 어느 한쪽으로 크게 기울지 않은 균형형이에요. 상황에 따라 앞장서기도, 맞춰 주기도 해요. 다만 살짝 내 편 쪽으로 기울어, 바쁠수록 고집이 드러날 수 있어요.',
  },
  중화신약: {
    title: '균형형 · 살짝 힘이 약한 쪽',
    short: '균형형(살짝 약함)',
    desc: '힘이 어느 한쪽으로 크게 기울지 않은 균형형이에요. 다만 살짝 바깥 기운 쪽으로 기울어, 일이 몰리면 쉽게 지치니 쉬는 시간을 먼저 챙겨야 해요.',
  },
  신약: {
    title: '힘이 약한 편인 사주',
    short: '힘이 약한 편',
    desc: '혼자 버티는 힘보다 함께할 때 커지는 힘이 강한 사주예요. 좋은 사람·환경·배움을 만나면 크게 피어나고, 혼자 다 짊어지면 금방 방전돼요.',
  },
  태약: {
    title: '힘이 많이 약한 사주',
    short: '힘이 많이 약함',
    desc: '바깥 기운이 훨씬 강해 환경의 영향을 크게 받아요. 그래서 어디에서 누구와 있느냐가 인생을 좌우해요. 기댈 곳(사람·자격·건강)을 먼저 만드는 것이 핵심이에요.',
  },
  극약: {
    title: '힘이 아주 약한 사주',
    short: '힘이 아주 약함',
    desc: '내 편 기운이 거의 없어요. 이런 사주는 억지로 버티기보다 강한 흐름에 올라타는 쪽이 맞는 특수한 구조일 수 있어요. 혼자 싸우기보다 큰 조직·흐름 안에서 역할을 찾는 것이 유리해요.',
  },
};

/** 태어난 달(월지) → 계절 */
export const MONTH_PLAIN: Record<number, string> = {
  2: '이른 봄(2월 무렵)',
  3: '한봄(3월 무렵)',
  4: '늦봄(4월 무렵)',
  5: '초여름(5월 무렵)',
  6: '한여름(6월 무렵)',
  7: '늦여름(7월 무렵)',
  8: '초가을(8월 무렵)',
  9: '한가을(9월 무렵)',
  10: '늦가을(10월 무렵)',
  11: '초겨울(11월 무렵)',
  0: '한겨울(12월 무렵)',
  1: '늦겨울(1월 무렵)',
};

/** 기둥 자리가 뜻하는 삶의 영역 */
export const POS_LIFE: Partial<Record<Position, string>> = {
  year: '어린 시절·집안',
  month: '부모·사회생활',
  day: '나·배우자',
  hour: '자녀·노후',
  daeun: '10년 운',
  seun: '그해 운',
  wolun: '그달 운',
};
export const POS_SHORT: Partial<Record<Position, string>> = { year: '태어난 해', month: '태어난 달', day: '태어난 날', hour: '태어난 시' };

/** 나(일간)의 기운과 다른 기운의 관계를 한 문장으로 */
export function relationPlain(me: Element, e: Element): { helps: boolean; text: string } {
  const w = EL_WORD[e];
  const m = EL_WORD[me];
  if (e === me) return { helps: true, text: `나와 같은 ${w} 기운이라 힘을 보태 줘요.` };
  if (generates(e, me)) return { helps: true, text: `${josa(w, '은/는')} ${m}인 나를 키워 주는 기운이라 도움이 돼요.` };
  if (generates(me, e)) return { helps: false, text: `${josa(w, '은/는')} 나(${m})의 힘을 빼서 쓰게 하는 기운이라 도움은 못 받아요.` };
  if (controls(me, e)) return { helps: false, text: `${josa(w, '은/는')} 내가 힘을 들여 다뤄야 하는 기운이라 오히려 힘이 들어요.` };
  return { helps: false, text: `${josa(w, '은/는')} 나(${m})를 누르는 기운이라 힘이 눌려요.` };
}

export interface StrengthCheck {
  term: string;
  q: string;
  ok: boolean;
  text: string;
}

/** 신강·신약을 판단한 네 가지 질문 (득령·득지·득세·통근) */
export function strengthChecks(a: SajuAnalysis): StrengthCheck[] {
  const st = a.strength;
  const me = STEMS[a.pillars.day.stem].element;
  const helps = (e: Element) => e === me || generates(e, me);
  const mb = a.pillars.month.branch;
  const mEl = STEMS[mainStemOf(mb)].element;
  const db = a.pillars.day.branch;
  const dEl = STEMS[mainStemOf(db)].element;
  const rest = [
    ...a.positions.filter((p) => p.pos !== 'day').map((p) => STEMS[p.pillar.stem].element),
    ...a.positions.filter((p) => p.pos !== 'month' && p.pos !== 'day').map((p) => STEMS[mainStemOf(p.pillar.branch)].element),
  ];
  const sup = rest.filter(helps).length;
  const roots = st.roots.map((r) => `${BRANCHES[r.branch].hanja}(${POS_SHORT[r.pos] ?? ''})`);
  return [
    {
      term: '득령',
      q: '태어난 계절이 나를 도와주나요?',
      ok: st.deukryeong,
      text: `${MONTH_PLAIN[mb]}에 태어나 계절의 기운이 ${josa(elWord(mEl), '이에요/예요')}. ${relationPlain(me, mEl).text}`,
    },
    {
      term: '득지',
      q: '내가 앉은 자리가 나를 도와주나요?',
      ok: st.deukji,
      text: `태어난 날의 아래 글자는 ${BRANCHES[db].hanja}(${BRANCHES[db].animal}), ${elWord(dEl)} 기운이에요. ${relationPlain(me, dEl).text}`,
    },
    {
      term: '득세',
      q: '나머지 글자 중 내 편이 절반을 넘나요?',
      ok: st.deukse,
      text: `나머지 ${rest.length}글자 중 ${sup}글자가 내 편(나와 같은 기운·나를 키워 주는 기운)이에요.`,
    },
    {
      term: '통근',
      q: '땅에 뿌리를 내렸나요?',
      ok: st.roots.length > 0,
      text: st.roots.length
        ? `나와 같은 기운이 아래 글자 ${roots.join('·')} 속에 숨어 있어요. 뿌리가 있으면 바람이 불어도 쉽게 흔들리지 않아요.`
        : '아래 글자들 속에 나와 같은 기운이 없어요. 뿌리 없는 나무처럼 환경의 영향을 크게 받아, 수치보다 실제 힘이 약하게 느껴질 수 있어요.',
    },
  ];
}

/** 왜 이 기운이 필요한지 — 억부·조후·특수격을 쉬운 말로 */
export function yongsinWhy(a: SajuAnalysis): { why: string; final: string; sure: string } {
  const y = a.yongsin;
  const gp = a.elements.groupPercent;
  const pc = (g: TenGodGroup) => `${gp[g].toFixed(0)}%`;
  const W = elWord(y.eokbu);
  const fix = `${josa(W, '이/가')} 균형을 맞춰 줘요.`;
  const why = {
    insung: `나를 채워 주는 기운(인성 ${pc('인성')})이 너무 많아 힘이 넘치는 사주예요. 넘치는 쪽을 덜어 주는 돈과 현실의 기운, ${fix}`,
    clash: `내 힘도 세고 나를 누르는 기운(관성 ${pc('관성')})도 강해, 둘이 정면으로 부딪히기 쉬운 사주예요. 힘을 밖으로 풀어 주면서 누르는 힘도 막아 주는 표현의 기운, ${fix}`,
    control: `내 편 기운(비겁 ${pc('비겁')})이 많아 힘이 넘치는 사주예요. 그 힘에 방향을 잡아 주는 규칙과 책임의 기운, ${fix}`,
    release: `내 편 기운(비겁 ${pc('비겁')})이 많아 힘이 넘치는데, 다잡아 줄 기운(관성 ${pc('관성')})은 약한 사주예요. 넘치는 힘을 표현과 재능으로 흘려보내는 ${fix}`,
    wealth: `돈과 현실의 기운(재성 ${pc('재성')})이 내 힘보다 커서, 일과 돈에 끌려다니기 쉬운 사주예요. 내 편이 되어 함께 버텨 주는 ${fix}`,
    pressure: `나를 누르는 기운(관성 ${pc('관성')})이 가장 센 사주예요. 그 압박을 나를 돕는 힘으로 바꿔 주는 배움과 도움의 기운, ${fix}`,
    drain: `표현하고 쏟아 내는 기운(식상 ${pc('식상')})이 커서 힘이 쉽게 빠져나가는 사주예요. 다시 채워 주는 배움과 쉼의 기운, ${fix}`,
  }[y.eokbuCase];
  const F = elWord(y.yongsin);
  const season = MONTH_PLAIN[a.pillars.month.branch];
  const winter = [11, 0, 1].includes(a.pillars.month.branch);
  let final = `그래서 가장 필요한 기운은 ${josa(F, '이에요/예요')}.`;
  if (y.method === '조후') {
    final = `다만 ${season}에 태어나 사주가 ${winter ? '차갑고 축축해요' : '뜨겁고 메말라요'}. 이럴 땐 온도부터 맞추는 게 더 급해서, 최종적으로 ${josa(F, '을/를')} 가장 필요한 기운으로 봤어요.`;
  } else if (y.method === '종격') {
    final = `다만 내 편 기운이 거의 없어, 억지로 힘을 보태기보다 가장 센 흐름을 따르는 게 맞는 특수한 사주(${y.special})일 수 있어요. 그래서 ${josa(F, '을/를')} 필요한 기운으로 봤어요.`;
  } else if (y.method === '종왕') {
    final = `다만 내 편 기운이 압도적이라, 거스르기보다 그 기운을 그대로 살리는 게 맞는 특수한 사주(${y.special})일 수 있어요. 그래서 ${josa(F, '을/를')} 필요한 기운으로 봤어요.`;
  } else if (y.johu.urgent && y.johu.element && y.johu.element !== y.yongsin) {
    final += ` ${season}에 태어나 ${elWord(y.johu.element)} 기운도 반가운 사주라, 운을 볼 때 함께 반영했어요.`;
  }
  const sure = {
    높음: '이 판단은 꽤 분명한 편이에요.',
    보통: '보는 관점(학파)에 따라 조금 달라질 수 있어요.',
    낮음: '힘이 균형점 가까이 있거나 관점끼리 결론이 달라, 참고로만 보세요.',
  }[y.confidence];
  return { why, final, sure };
}

/** 격국을 쉬운 말로 */
export const GYEOK_PLAIN: Record<string, { title: string; text: string }> = {
  건록격: { title: '자수성가형', text: '부모나 남의 덕보다 내 힘으로 일어서는 구조예요. 자립심이 강하고, 기반(돈·조직)을 갖추면 크게 쓰여요.' },
  양인격: { title: '승부사형', text: '강한 힘과 승부욕을 타고난 구조예요. 규칙과 책임으로 그 힘을 다잡으면 리더로 빛나고, 못 다잡으면 다툼으로 새어 나가요.' },
  월겁격: { title: '독립·경쟁형', text: '경쟁 속에서 크는 구조예요. 남과 겨루며 실력이 늘지만, 돈은 버는 것보다 지키는 데 힘이 들어요.' },
  식신격: { title: '전문가·장인형', text: '좋아하는 일을 꾸준히 파고들어 먹고사는 구조예요. 실력과 꾸준함이 곧 성공 조건이에요.' },
  상관격: { title: '아이디어·혁신형', text: '재능과 말솜씨로 기존 틀을 깨는 구조예요. 윗사람이나 규칙과 부딪힐 때는 말조심이 필요해요.' },
  편재격: { title: '사업가·활동가형', text: '넓게 움직이며 크게 벌고 크게 쓰는 구조예요. 사람과 돈의 흐름을 읽는 감각이 무기예요.' },
  정재격: { title: '성실한 살림꾼형', text: '안정된 수입과 꼼꼼한 관리로 재산을 쌓는 구조예요. 성실함이 곧 재산이에요.' },
  '편관격(칠살격)': { title: '위기 돌파형', text: '압박과 시련 속에서 단단해지는 구조예요. 그 압박을 다룰 줄 알면 권위와 리더십이 되고, 못 다루면 스트레스가 돼요.' },
  정관격: { title: '모범생·조직형', text: '규칙과 명예를 중시하는 구조예요. 안정된 조직에서 인정받으며 올라가는 길과 잘 맞아요.' },
  편인격: { title: '특기·직관형', text: '남다른 직관과 특수한 기술로 승부하는 구조예요. 주류보다 나만의 분야에서 강해요.' },
  정인격: { title: '학자·자격형', text: '배움과 자격, 문서로 길을 여는 구조예요. 교육·연구·공공 분야와 잘 맞아요.' },
};

/** 신살 별명 */
export const SINSAL_NICK: Record<string, string> = {
  천을귀인: '귀인의 별',
  문창귀인: '글·시험의 별',
  양인살: '칼날의 별',
  '건록(록신)': '자립의 별',
  홍염살: '매력의 별',
  금여록: '품위의 별',
  암록: '숨은 복',
  월덕귀인: '덕의 별',
  천덕귀인: '하늘 덕의 별',
  역마살: '움직이는 별',
  '도화살(연살)': '인기의 별',
  화개살: '예술·고독의 별',
  장성살: '장군의 별',
  반안살: '승진의 별',
  망신살: '노출의 별',
  겁살: '빼앗김의 별',
  재살: '갇힘의 별',
  천살: '하늘의 시험',
  고신살: '외로움의 별',
  과숙살: '홀로서기의 별',
  괴강살: '우두머리의 별',
  고란살: '거리감의 별',
  음양차착살: '엇갈림의 별',
  효신살: '애증의 별',
  백호대살: '호랑이의 별',
  현침살: '바늘의 별',
  공망: '빈자리',
};

/** 합·충·형 등 글자 관계를 쉬운 말로 */
export const INTER_PLAIN: Record<string, string> = {
  천간합: '손잡음',
  육합: '손잡음',
  삼합: '셋이 뭉침',
  반합: '반쯤 뭉침',
  방합: '계절이 뭉침',
  천간충: '부딪힘',
  육충: '부딪힘',
  삼형: '셋이 긁힘',
  형: '긁힘',
  자형: '스스로 긁힘',
  파: '깨짐',
  해: '어긋남',
  원진: '애증',
  귀문: '예민함',
};
