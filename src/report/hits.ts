/**
 * 명경이가 맞혀 볼게요 — 사주만 보고 "평소의 나"를 구체적인 장면으로 맞혀 본다.
 *
 * 일반론 대신, 그 사람의 사주에서 가장 두드러진 구조만 골라 장면으로 말한다.
 *  - 성향: 일간(2) · 일지 십성 · 가장 큰 십성/없는 십성 · 신살 · 오행 과다·결핍 · 힘의 극단 · 월지-일지 충
 *  - 지난 일: 최근 8년 중 세운이 일지·월지와 충·합한 해, 최근에 바뀐 대운
 *  - 요즘: 올해 세운
 * 사용자는 맞아요·조금·아니에요로 답하고, 답하면 "왜 그렇게 봤는지"를 보여 준다.
 */
import { BRANCHES, STEMS, pillarKo, type Element, type SajuAnalysis, type TenGod, type TenGodGroup } from '../engine/index.ts';
import { josa } from '../engine/josa.ts';
import { groupOf } from '../engine/tenGods.ts';
import { ANIMAL } from './tti.ts';
import { GROUP_PLAIN, SINSAL_NICK, TEN_GOD_PLAIN, elWord } from './plain.ts';
import { DECADE_THEME } from './storyKb.ts';

export interface Hit {
  id: string;
  kind: 'trait' | 'past' | 'now';
  text: string;
  /** 왜 그렇게 봤는지 (쉬운 말) */
  why: string;
  /** 전문 근거 */
  basis: string;
  /** 같은 이야기를 두 번 하지 않도록 */
  topic: string;
  weight: number;
}

type Line = [topic: string, text: string, adult?: boolean];

const DM_LINES: Record<number, Line[]> = {
  0: [
    ['lead', '단톡방에서 약속이 안 정해지면 결국 “그럼 토요일 7시, 거기서 보자” 하고 정해 버리는 사람, 당신이죠?'],
    ['self', '남에게 부탁하느니 차라리 내가 하고 말죠? 그래서 일이 늘 내 쪽으로 몰리고요.'],
    ['pride', '“그건 안 될걸?” 소리를 들으면 오히려 오기가 생겨서 끝까지 해 보죠?'],
    ['speech', '틀린 걸 보면 돌려 말하지 못해서, 맞는 말을 하고도 분위기가 싸해진 적 있죠?'],
    ['speed', '느린 사람과 일할 때 속으로 “그냥 내가 할게”를 몇 번은 외치죠?'],
  ],
  1: [
    ['read', '처음 간 모임에서도 10분이면 누가 누구랑 친한지, 누가 실세인지 파악되죠?'],
    ['regret', '싫은 소리를 바로 못 하고 웃으며 넘긴 뒤, 집에 와서 “아까 이렇게 말할걸” 곱씹죠?'],
    ['detour', '정면으로 부딪히기보다 돌아가는 길을 찾아서, 결국 원하는 건 얻어 내는 편이죠?'],
    ['compare', 'SNS에서 남의 근황을 보고 괜히 마음이 싱숭생숭해진 적, 한두 번이 아니죠?'],
    ['cut', '서운한 게 쌓이면 싸우는 대신 조용히 연락을 줄이는 걸로 정리하죠?'],
  ],
  2: [
    ['face', '기분이 얼굴에 다 쓰여 있어서 “무슨 일 있어?” 소리를 자주 듣죠?'],
    ['finish', '새 계획을 세울 땐 누구보다 신나는데, 마무리 단계에선 흥미가 뚝 떨어지죠?'],
    ['anger', '화가 나면 크게 터뜨리고 10분 뒤엔 잊는데, 상대는 그걸 일주일 기억하죠?'],
    ['praise', '사람들 앞에서 칭찬 한 번 들으면 그날 하루 종일 에너지가 넘치죠?'],
    ['mood', '조용한 자리에 가면 결국 내가 먼저 말을 꺼내서 분위기를 띄우게 되죠?'],
  ],
  3: [
    ['memory', '겉으로는 괜찮다고 하지만, 서운했던 말 한마디를 몇 년이 지나도 기억하죠?'],
    ['few', '친한 사람은 손에 꼽을 만큼 적지만, 그 몇 명에겐 진심을 다 주죠?'],
    ['care', '누가 말하기 전에 필요한 걸 먼저 알아채고 챙겨 주는 편이죠?'],
    ['focus', '한 가지에 꽂히면 시간 가는 줄 모르고 파고들 만큼 집중력이 무섭게 좋아지죠?'],
    ['burst', '참고 참다가 어느 날 한 번에 터져서, 주변이 “갑자기 왜?” 하고 놀란 적 있죠?'],
  ],
  4: [
    ['counsel', '사람들이 고민 상담을 하러 자꾸 나를 찾아오죠? 정작 내 고민은 잘 말하지 않으면서요.'],
    ['stubborn', '한번 “이건 아니다” 싶으면 누가 뭐래도 잘 안 움직이죠?'],
    ['silent', '화가 나도 목소리를 높이기보다 말수가 줄고 조용해지죠?'],
    ['slow', '새로운 걸 시작하기까지 오래 걸리지만, 일단 시작하면 누구보다 오래가죠?'],
    ['blank', '“무슨 생각해?” 소리를 자주 듣는데, 사실 별생각 없을 때도 많죠?'],
  ],
  5: [
    ['plan', '약속 장소·맛집·동선을 미리 다 찾아보고 가는 사람, 당신이죠?'],
    ['refuse', '부탁을 거절하지 못해서 남의 일까지 떠안고 끙끙댄 적 있죠?'],
    ['rewind', '잠들기 전에 “그때 그 말 괜찮았나” 하고 하루를 되감기하는 버릇이 있죠?'],
    ['value', '가성비 감각이 좋아서, 같은 돈으로 더 좋은 걸 귀신같이 찾아내죠?'],
    ['stomach', '스트레스를 받으면 소화가 먼저 안 되거나 입맛이 확 변하죠?'],
  ],
  6: [
    ['decide', '고민은 짧게, 실행은 바로. 결정이 빠른 편이죠?'],
    ['justice', '“좋게 좋게 넘어가자”는 말이 제일 답답하죠? 옳고 그른 건 짚고 넘어가야 하고요.'],
    ['loyal', '내 사람이라고 생각하면 손해를 봐도 끝까지 챙기죠?'],
    ['speech', '툭 던진 말에 상대가 상처받았다는 걸 한참 뒤에야 안 적 있죠?'],
    ['workout', '스트레스를 받으면 운동·청소·쇼핑처럼 몸을 움직여서 바로 풀어 버리죠?'],
  ],
  7: [
    ['detail', '물건 하나를 사도 디자인·마감·소재까지 꼼꼼히 보고 고르죠?'],
    ['redo', '남이 대충 해 놓은 걸 보면 결국 내가 다시 손보게 되죠?'],
    ['line', '무례한 사람은 한 번 선을 넘으면 마음속에서 바로 “끝”이죠?'],
    ['critic', '칭찬 열 마디보다 지적 한 마디가 더 오래 마음에 남죠?'],
    ['kick', '자기 전에 오늘 한 실수를 다시 떠올리며 이불을 걷어찬 적 있죠?'],
  ],
  8: [
    ['bigplan', '머릿속 계획은 거창한데, 실행하다 보면 또 다른 재밌는 게 눈에 들어오죠?'],
    ['free', '묶이는 게 싫어서, 정해진 루틴이나 출퇴근 시간이 제일 답답하죠?', true],
    ['leave', '어디론가 훌쩍 떠나고 싶다는 생각을 일주일에 몇 번은 하죠?'],
    ['hidden', '속마음을 다 보여 주지 않아서 “너는 무슨 생각인지 모르겠다”는 말을 듣죠?'],
    ['escape', '곤란한 상황에서 임기응변으로 쓱 빠져나가는 재주가 있죠?'],
  ],
  9: [
    ['tone', '상대의 말투가 조금만 달라져도 “나한테 화났나?” 신경 쓰이죠?'],
    ['reply', '카톡 답장을 썼다 지웠다 몇 번 하다가 결국 이모티콘만 보낸 적 있죠?'],
    ['night', '밤이 되면 생각이 많아져서 쉽게 잠들지 못하는 날이 많죠?'],
    ['hunch', '직감이 묘하게 잘 맞아서 “왠지 그럴 것 같았어”가 맞을 때가 많죠?'],
    ['deadline', '결정을 미루다 마감 직전에 몰아서 해치우는 편이죠?'],
  ],
};

const DM_WHY: Record<number, string> = {
  0: '나를 뜻하는 글자 甲은 하늘로 곧게 뻗는 큰 나무예요. 굽히기보다 앞장서는 성질이에요.',
  1: '나를 뜻하는 글자 乙은 바람에 휘어도 꺾이지 않는 덩굴이에요. 부딪히기보다 읽고 돌아가는 성질이에요.',
  2: '나를 뜻하는 글자 丙은 숨김없이 비추는 태양이에요. 감정과 에너지가 바깥으로 드러나는 성질이에요.',
  3: '나를 뜻하는 글자 丁은 어둠을 밝히는 촛불이에요. 겉은 조용해도 속은 뜨겁고 깊은 성질이에요.',
  4: '나를 뜻하는 글자 戊는 묵직한 큰 산이에요. 쉽게 흔들리지 않고 사람을 품는 성질이에요.',
  5: '나를 뜻하는 글자 己는 곡식을 기르는 논밭의 흙이에요. 꼼꼼하게 챙기고 계산하는 성질이에요.',
  6: '나를 뜻하는 글자 庚은 단단한 원석·강철이에요. 빠르고 분명하게 자르는 성질이에요.',
  7: '나를 뜻하는 글자 辛은 다듬어진 보석이에요. 섬세하고 기준이 높은 성질이에요.',
  8: '나를 뜻하는 글자 壬은 큰 강과 바다예요. 넓게 흐르고 한곳에 묶이기 싫어하는 성질이에요.',
  9: '나를 뜻하는 글자 癸는 스며드는 비와 이슬이에요. 섬세하게 느끼고 깊이 생각하는 성질이에요.',
};

/** 일지(가까운 사이의 나) 십성 */
const DAY_BRANCH_LINE: Record<TenGod, Line> = {
  비견: ['space', '가까운 사이일수록 “내 영역”은 지키고 싶죠? 연인이라도 혼자만의 시간은 꼭 필요하고요.', true],
  겁재: ['compare', '친한 친구한테 지는 건 유독 싫죠? 겉으론 웃어도 속으로는 은근히 비교하고 있고요.'],
  식신: ['home', '집에서는 맛있는 거 먹고 늘어져 있는 시간이 제일 행복하죠?'],
  상관: ['nag', '친해지면 말이 확 많아지고, 가까운 사람한테 유독 잔소리·지적을 하게 되죠?'],
  편재: ['host', '가까운 사람들 생일·취향을 잘 챙기고, 모임은 어쩌다 보니 내가 꾸리게 되죠?'],
  정재: ['budget', '집에서는 은근히 살림·정리·가계부를 챙기는 쪽이죠? 계획에 없는 지출은 마음이 불편하고요.', true],
  편관: ['push', '남들 앞에선 괜찮은 척하지만, 혼자 있을 땐 스스로를 꽤 몰아붙이는 편이죠?'],
  정관: ['promise', '가까운 사이에도 예의와 약속이 중요하죠? 말없이 약속을 어기면 크게 실망하고요.'],
  편인: ['hidden', '가까운 사람에게도 속마음을 다 보여 주진 않죠? 혼자 생각을 정리하는 시간이 꼭 필요하고요.'],
  정인: ['cared', '아플 때 누가 죽 사다 주는 것 같은, 챙김을 받을 때 가장 사랑받는다고 느끼죠?'],
};

/** 월지(사회에서의 나) 십성 — 다른 신호가 적을 때 쓰는 예비 문장 */
const MONTH_LINE: Record<TenGod, Line> = {
  비견: ['peer', '일할 때 위아래보다 “동료”로 대할 때 가장 편하죠? 지시받기보다 같이 정하는 게 좋고요.'],
  겁재: ['compare', '같이 시작한 친구나 동기가 앞서가면, 겉으론 축하해도 속으로는 불이 붙죠?'],
  식신: ['craft', '“빨리 했다”는 말보다 “잘 만들었다”는 말이 훨씬 기분 좋죠?'],
  상관: ['idea', '회의에서 “이건 이렇게 바꾸면 더 낫지 않아요?”를 참기 어렵죠?', true],
  편재: ['wide', '아는 사람이 많아서 “그거 아는 사람 있어” 하고 연결해 주는 일이 잦죠?'],
  정재: ['steady', '정해진 날 정해진 만큼 들어오는 돈이 마음 편하죠? 큰 모험보다 차곡차곡이고요.', true],
  편관: ['pressure', '압박이 큰 상황에서 오히려 집중력이 올라가는 편이죠? 대신 끝나고 나면 크게 앓고요.'],
  정관: ['rules', '규칙이 분명한 곳에서 일이 더 잘되죠? 애매하게 시키는 걸 제일 싫어하고요.'],
  편인: ['niche', '남들이 다 하는 것보다 나만 아는 분야·기술에 끌리죠?'],
  정인: ['learn', '새 일을 맡으면 일단 자료부터 모으고 공부부터 하죠?'],
};

/** 가장 큰 십성 그룹 */
const GROUP_EXCESS: Record<TenGodGroup, Line[]> = {
  비겁: [
    ['loan', '친구·동료 일에 내 돈이나 시간을 쓰고, 나중에 내가 더 손해 본 것 같은 기분이 든 적 있죠?', true],
    ['win', '지는 걸 정말 싫어해서, 게임 하나도 대충 못 하죠?'],
  ],
  식상: [
    ['speak', '할 말은 해야 직성이 풀리죠? 회의 시간에 결국 손 들고 말하는 사람이고요.', true],
    ['hobby', '하고 싶은 게 너무 많아서, 시작만 하고 멈춘 취미·강의가 꽤 있죠?'],
  ],
  재성: [
    ['value', '머릿속에 늘 계산기가 돌아가죠? 할인·적립·가성비는 귀신같이 챙기고요.'],
    ['busy', '일 욕심이 많아서, 쉬는 날에도 머리로는 일하고 있죠?', true],
  ],
  관성: [
    ['todo', '“해야 할 일” 목록이 머릿속에서 꺼지지 않죠? 쉬는 날에도 괜히 죄책감이 들고요.'],
    ['eyes', '남들 눈에 어떻게 보일지를 먼저 생각하고 행동하죠?'],
  ],
  인성: [
    ['review', '뭘 사기 전에 리뷰부터 끝까지 찾아보죠? 리뷰만 수십 개 읽고 결국 안 산 적도 있고요.'],
    ['think', '생각이 많아서 시작은 늦지만, 일단 이해하면 누구보다 깊이 알죠?'],
  ],
};

/** 글자에 하나도 없는 십성 그룹 */
const GROUP_MISSING: Record<TenGodGroup, Line> = {
  비겁: ['yield', '내 몫을 챙기는 게 어색하죠? “괜찮아, 너 가져” 하고 나서 집에 와서 후회한 적 있고요.'],
  식상: ['express', '속으로는 할 말이 많은데 막상 입 밖으로는 잘 안 나오죠? 표현을 아끼다 오해를 산 적도 있고요.'],
  재성: ['money', '돈 계산이나 가격 흥정이 어쩐지 불편하죠? 이번 달 정확히 얼마 썼는지 잘 모를 때도 많고요.', true],
  관성: ['free', '누가 시키거나 통제하는 걸 유독 못 견디죠? 마감이 없으면 끝까지 미루기도 하고요.'],
  인성: ['manual', '설명서는 안 읽고 일단 해 보는 타입이죠? 배우기보다 부딪히며 익히고요.'],
};

const ELEMENT_EXCESS: Record<Element, Line> = {
  wood: ['body', '목·어깨가 자주 뭉치고, 화가 나면 머리부터 지끈거리죠? 한번 정한 건 끝까지 밀어붙이고요.'],
  fire: ['body', '얼굴이 쉽게 달아오르고 성격이 급한 편이죠? 결정은 빠른데 나중에 수습할 일이 생기기도 하고요.'],
  earth: ['stomach', '걱정이 생기면 소화부터 막히죠? 한번 자리 잡으면 잘 안 움직이려 하고요.'],
  metal: ['body', '피부나 코·목이 예민한 편이죠? 환절기마다 몸이 먼저 신호를 보내고요.'],
  water: ['night', '생각이 꼬리에 꼬리를 물어 잠들기 어려운 밤이 많죠? 한번 가라앉으면 오래가고요.'],
};
const ELEMENT_MISSING: Record<Element, Line> = {
  wood: ['start', '새로운 걸 시작할 때 첫발 떼기가 유독 어렵죠? 일단 시작하면 잘하면서도요.'],
  fire: ['body', '몸이 찬 편이라 추위를 많이 타고, 겨울이면 기운이 축 처지죠?'],
  earth: ['hobby', '관심사가 자주 바뀌죠? 이것저것 시작하지만 한 우물을 오래 파기는 어렵고요.'],
  metal: ['refuse', '거절을 잘 못 하고, 정리·정돈은 자꾸 미루게 되죠?'],
  water: ['rest', '쉬어야 할 때를 놓쳐서, 꼭 몰아서 아픈 편이죠?'],
};

/** 신살·글자 관계 (우선순위 순) */
const SINSAL_LINE: [name: string, Line, why: string][] = [
  ['역마살', ['leave', '한곳에 오래 있으면 좀이 쑤시죠? 이사·여행·출장이 남들보다 잦은 편이고, 떠나면 오히려 기운이 나고요.'], '움직일수록 풀리는 사주라는 뜻이에요.'],
  ['도화살(연살)', ['eyes2', '처음 보는 사람이 유독 말을 걸어오거나, 길에서 길을 묻는 사람이 자주 오죠?'], '가만히 있어도 사람의 눈길을 끄는 기운이에요.'],
  ['천을귀인', ['helper', '정말 곤란할 때 신기하게 도와주는 사람이 나타났던 경험, 몇 번 있죠?'], '위기 때 귀인이 나타나는, 가장 좋은 별이에요.'],
  ['화개살', ['alone', '사람들과 잘 어울리다가도 갑자기 혼자 있고 싶은 순간이 확 오죠? 혼자 있어야 다시 충전되고요.'], '혼자만의 시간과 깊이를 찾는 별이에요.'],
  ['현침살', ['speech', '말이 정확하고 날카로워서 “한마디로 핵심을 찌른다”는 말을 듣죠? 가끔 그 한마디가 상대를 아프게 하기도 하고요.'], '바늘처럼 예리한 관찰력과 말솜씨의 별이에요.'],
  ['백호대살', ['focus', '한번 꽂히면 밤을 새워서라도 끝을 보는 몰입력이 있죠?'], '무섭게 몰입하는 강한 기운의 별이에요.'],
  ['괴강살', ['extreme', '평소엔 괜찮다가도 한번 마음먹으면 누구도 못 말리는 순간이 있죠?'], '극과 극을 오가는 강한 카리스마의 별이에요.'],
  ['양인살', ['win', '평소엔 무던한데, 한번 승부가 붙으면 주변이 놀랄 만큼 독해지죠?'], '칼날처럼 강한 승부욕의 별이에요.'],
  ['홍염살', ['charm', '“분위기 있다”, “묘하게 끌린다”는 말을 들어 본 적 있죠?'], '이성을 끄는 분위기의 별이에요.'],
  ['문창귀인', ['write', '글이나 말로 정리하는 걸 잘해서, 보고서·발표·시험에서 칭찬을 들은 적 있죠?'], '글솜씨와 시험 운의 별이에요.'],
  ['고신살', ['lonely', '사람들 속에 있어도 문득 혼자인 것 같은 순간이 있죠? 혼자 지내는 게 생각보다 편하기도 하고요.'], '혼자 있는 시간이 길어지기 쉬운 별이에요.'],
  ['과숙살', ['lonely', '사람들 속에 있어도 문득 혼자인 것 같은 순간이 있죠? 혼자 지내는 게 생각보다 편하기도 하고요.'], '홀로서기를 뜻하는 별이에요.'],
];

const INTER_LINE: Partial<Record<string, [Line, string]>> = {
  귀문: [['hunch', '꿈이 유난히 생생하고, 촉이 묘하게 잘 맞죠? 대신 신경이 예민해서 잠귀가 밝은 편이고요.'], '예민함과 직관을 뜻하는 글자 짝(귀문)이 있어요.'],
  자형: [['blame', '실수하면 남이 뭐라 하기 전에 나 자신을 더 오래 탓하죠?'], '같은 글자끼리 부딪혀 스스로를 긁는 짝(자형)이 있어요.'],
  원진: [['lovehate', '가까운 사람인데도 이유 없이 미운 감정이 올라오는 순간이 있죠? 그러다 또 금방 짠해지고요.'], '끌리면서도 미운 애증의 짝(원진)이 있어요.'],
};

/** 올해 세운의 천간 십성 → 요즘의 마음 */
const NOW_LINE: Record<TenGodGroup, Line> = {
  비겁: ['now', '요즘 들어 ‘내 것’을 챙기고 싶고, 누가 나보다 잘나가는 게 유난히 신경 쓰이죠? 돈 나갈 일도 늘었고요.'],
  식상: ['now', '요즘 들어 새로 뭔가 배우거나 만들고 싶고, 지금 하던 걸 확 바꾸고 싶은 충동도 들죠?'],
  재성: ['now', '요즘 들어 돈 계산이 부쩍 많아지고, 부업·투자 이야기에 귀가 솔깃하죠?'],
  관성: ['now', '요즘 들어 책임질 일이 늘고, 평가받는 느낌에 어깨가 무겁죠?'],
  인성: ['now', '요즘 들어 공부를 다시 하고 싶거나 자격증을 알아보게 되죠? 대신 생각만 많고 실행은 느려졌고요.'],
};

const NOW_TEEN: Record<TenGodGroup, string> = {
  비겁: '요즘 들어 친구들 사이에서 지기 싫은 마음이 부쩍 커졌죠? 내 물건·내 자리를 챙기고 싶고요.',
  식상: '요즘 들어 하고 싶은 게 부쩍 많아지고, 하던 걸 확 바꾸고 싶은 마음이 들죠?',
  재성: '요즘 들어 갖고 싶은 게 부쩍 늘고, 용돈 계산을 자주 하게 되죠?',
  관성: '요즘 들어 해야 할 일과 시험·평가 때문에 어깨가 무겁죠?',
  인성: '요즘 들어 생각이 많아지고, 혼자 공부하거나 뭔가를 깊이 알아보고 싶어지죠?',
};

const isClash = (a: number, b: number) => (a - b + 12) % 12 === 6;
const isHarmony = (a: number, b: number) => (a + b) % 12 === 1;
/** 양력 연도의 띠 지지 (입춘 경계는 "무렵"으로 흡수) */
const yearBranch = (y: number) => (((y - 4) % 12) + 12) % 12;

export function buildHits(a: SajuAnalysis, max = 9): Hit[] {
  const ds = a.pillars.day.stem;
  const db = a.pillars.day.branch;
  const mb = a.pillars.month.branch;
  const adult = a.age >= 18;
  const gp = a.elements.groupPercent;
  const tgc = a.elements.tenGodCount;
  const traits: Hit[] = [];
  const add = (id: string, [topic, text, adultOnly]: Line, why: string, basis: string, weight: number, kind: Hit['kind'] = 'trait') => {
    if (adultOnly && !adult) return;
    traits.push({ id, kind, text, why, basis, topic, weight });
  };

  // 1) 일간 — 같은 일간이라도 일지에 따라 다른 두 장면
  const dmLines = DM_LINES[ds];
  const i1 = db % 5;
  const i2 = (db + 2) % 5;
  add(`dm-${ds}-${i1}`, dmLines[i1], DM_WHY[ds], `일간 ${STEMS[ds].hanja}`, 3.2);
  add(`dm-${ds}-${i2}`, dmLines[i2], DM_WHY[ds], `일간 ${STEMS[ds].hanja}`, 3.0);

  // 2) 일지 십성
  const dayTg = a.positions.find((p) => p.pos === 'day')!.branchTenGod;
  add(
    `day-${dayTg}`,
    DAY_BRANCH_LINE[dayTg],
    `가까운 사이에서의 나를 보여 주는 자리(일지)에 ‘${TEN_GOD_PLAIN[dayTg]}’의 기운(${dayTg})이 앉아 있어요.`,
    `일지 ${BRANCHES[db].hanja}(${dayTg})`,
    2.6,
  );

  // 3) 가장 큰 십성 그룹 / 하나도 없는 그룹
  const groups = (Object.keys(gp) as TenGodGroup[]).sort((x, y) => gp[y] - gp[x]);
  const top = groups[0];
  // 30%를 넘으면 강한 신호, 아니어도 가장 큰 힘은 예비 문장으로
  add(`top-${top}`, GROUP_EXCESS[top][mb % 2], `사주에서 ${GROUP_PLAIN[top].name}(${top})이 ${gp[top].toFixed(0)}%로 가장 커요.`, `${top} ${gp[top].toFixed(0)}%`, gp[top] >= 30 ? 2 + (gp[top] - 30) / 15 : 1.1);
  const monthTg = a.positions.find((p) => p.pos === 'month')!.branchTenGod;
  add(
    `month-${monthTg}`,
    MONTH_LINE[monthTg],
    `사회에서의 나를 보여 주는 자리(월지)에 ‘${TEN_GOD_PLAIN[monthTg]}’의 기운(${monthTg})이 있어요.`,
    `월지 ${BRANCHES[mb].hanja}(${monthTg})`,
    1.2,
  );
  const count = (g: TenGodGroup) => (Object.keys(tgc) as TenGod[]).filter((t) => groupOf(t) === g).reduce((s, t) => s + tgc[t], 0);
  for (const g of groups.slice().reverse()) {
    if (count(g) === 0 && gp[g] < 8) {
      add(`miss-${g}`, GROUP_MISSING[g], `사주 글자 중에 ${GROUP_PLAIN[g].name}(${g})이 하나도 없어요.`, `${g} 0개 · ${gp[g].toFixed(0)}%`, 2.1);
      break;
    }
  }

  // 4) 신살·글자 관계
  let sinsal = 0;
  for (const [name, line, why] of SINSAL_LINE) {
    if (sinsal >= 2) break;
    const s = a.sinsal.find((x) => x.name === name);
    if (!s) continue;
    add(`sinsal-${name}`, line, `사주에 ‘${SINSAL_NICK[name] ?? name}’(${name.replace(/\(.*\)$/, '')})이 있어요. ${why}`, `${name} · ${s.basis}`, 2.3 - sinsal * 0.3);
    sinsal++;
  }
  for (const it of a.interactions) {
    const hit = INTER_LINE[it.kind];
    if (hit) {
      add(`inter-${it.kind}`, hit[0], hit[1], `${it.chars} ${it.kind}`, 1.9);
      break;
    }
  }
  if (a.interactions.some((it) => it.kind === '육충' && it.positions.includes('day') && it.positions.includes('month'))) {
    add(
      'clash-md',
      ['home2', '집(가정)과 일(사회) 사이에서 늘 줄다리기하는 느낌이 있죠? 이사나 이직도 남들보다 잦은 편이고요.', true],
      '사회 자리(월지)와 내 자리(일지)가 정면으로 부딪히는 사주예요.',
      `월지 ${BRANCHES[mb].hanja} · 일지 ${BRANCHES[db].hanja} 충`,
      2.2,
    );
  }

  // 5) 오행 과다·결핍
  const pc = a.elements.percent;
  const elOrder = (Object.keys(pc) as Element[]).sort((x, y) => pc[y] - pc[x]);
  const exc = elOrder[0];
  if (pc[exc] >= 35) add(`ex-${exc}`, ELEMENT_EXCESS[exc], `사주에 ${elWord(exc)} 기운이 ${pc[exc].toFixed(0)}%로 아주 많아요.`, `${exc} ${pc[exc].toFixed(0)}%`, 1.6);
  const miss = a.elements.missing[0];
  if (miss) add(`no-${miss}`, ELEMENT_MISSING[miss], `사주 여덟 글자에 ${elWord(miss)} 기운이 하나도 없어요.`, `${miss} 0글자`, 1.5);

  // 6) 힘의 극단
  if (a.strength.score >= 62)
    add('strong', ['myway', '남의 조언을 들어도 결국은 내 방식대로 하게 되죠? 그래서 결과가 어떻든 후회는 적은 편이고요.'], `내 편 기운이 ${a.strength.score.toFixed(0)}%로 많아, 스스로 정하고 밀고 가는 힘이 센 사주예요.`, `${a.strength.level} ${a.strength.score.toFixed(0)}%`, 1.5);
  if (a.strength.score <= 36)
    add('weak', ['cheer', '혼자 결정할 때 누가 “괜찮아, 해 봐” 한마디만 해 줘도 힘이 확 나죠? 반대로 주변 분위기가 나쁘면 같이 가라앉고요.'], `바깥 기운이 ${(100 - a.strength.score).toFixed(0)}%로 많아, 함께하는 사람과 환경의 영향을 크게 받는 사주예요.`, `${a.strength.level} ${a.strength.score.toFixed(0)}%`, 1.5);

  // 같은 이야기 거르기 → 무게 순으로 성향 6개
  const seen = new Set<string>();
  const pickedTraits = traits
    .sort((x, y) => y.weight - x.weight)
    .filter((h) => (seen.has(h.topic) ? false : (seen.add(h.topic), true)))
    .slice(0, 6);

  // 7) 지난 일 — 최근 8년
  const nowYear = new Date(a.now).getUTCFullYear();
  const birthYear = a.pillars.solarDate.year;
  const past: Hit[] = [];
  const recent = (test: (yb: number) => boolean) => {
    for (let y = nowYear - 1; y >= nowYear - 8; y--) if (y - birthYear >= 10 && test(yearBranch(y))) return y;
    return null;
  };
  const yName = (y: number) => `${y}년(${ANIMAL[yearBranch(y)]}해)`;
  const grown = (y: number) => y - birthYear >= 20;
  const yc = recent((b) => isClash(b, db));
  if (yc)
    past.push({
      id: `past-day-${yc}`,
      kind: 'past',
      topic: 'past-day',
      text: grown(yc) ? `${yc}년 무렵, 이사·이별·관계 정리처럼 생활의 ‘자리’가 크게 흔들린 일이 있었죠?` : `${yc}년 무렵, 이사나 전학처럼 생활 환경이 확 바뀐 일이 있었죠?`,
      why: `${yName(yc)}의 기운이 내 자리(일지 ${BRANCHES[db].hanja})와 정면으로 부딪혔어요. 이런 해엔 사는 곳이나 가까운 관계가 바뀌기 쉬워요.`,
      basis: `${yc}년 세운 지지 ${BRANCHES[yearBranch(yc)].hanja} ↔ 일지 ${BRANCHES[db].hanja} 충`,
      weight: 3,
    });
  const ym = recent((b) => isClash(b, mb));
  if (ym && ym !== yc)
    past.push({
      id: `past-month-${ym}`,
      kind: 'past',
      topic: 'past-month',
      text: grown(ym) ? `${ym}년 무렵, 회사·팀·하는 일이 바뀌었거나 그만두고 싶은 마음이 크게 들었던 적 있죠?` : `${ym}년 무렵, 반·학교·학원처럼 소속된 곳이 바뀌거나 적응이 힘들었던 적 있죠?`,
      why: `${yName(ym)}의 기운이 사회 자리(월지 ${BRANCHES[mb].hanja})와 부딪혔어요. 이런 해엔 직장·소속이 흔들리기 쉬워요.`,
      basis: `${ym}년 세운 지지 ${BRANCHES[yearBranch(ym)].hanja} ↔ 월지 ${BRANCHES[mb].hanja} 충`,
      weight: 2.8,
    });
  // 최근에 바뀐 대운
  const list = a.daeun.list;
  const di = list.findIndex((d) => d.startYear <= nowYear && d.startYear >= nowYear - 6 && d.startAge >= 12);
  if (di > 0) {
    const d = list[di];
    const pg = groupOf(list[di - 1].stemTenGod);
    const ng = groupOf(d.stemTenGod);
    if (pg !== ng)
      past.push({
        id: `past-daeun-${d.startYear}`,
        kind: 'past',
        topic: 'past-daeun',
        text: `${d.startYear}년쯤부터 관심사와 고민이 확 바뀐 느낌, 있죠? 예전엔 ${josa(`‘${DECADE_THEME[pg].label}’`, '이/가')} 고민의 중심이었다면, 요즘은 ${josa(`‘${DECADE_THEME[ng].label}’`, '이/가')} 삶의 중심이 됐을 거예요.`,
        why: `${d.startYear}년에 10년 단위의 큰 운(대운)이 ${pillarKo(list[di - 1].pillar)}에서 ${pillarKo(d.pillar)}로 바뀌었어요.`,
        basis: `대운 ${pillarKo(list[di - 1].pillar)}(${list[di - 1].stemTenGod}) → ${pillarKo(d.pillar)}(${d.stemTenGod})`,
        weight: 2.6,
      });
  }
  const yh = recent((b) => isHarmony(b, db));
  if (yh && grown(yh) && yh !== yc && yh !== ym)
    past.push({
      id: `past-hap-${yh}`,
      kind: 'past',
      topic: 'past-hap',
      text: `${yh}년 무렵, 누군가와 부쩍 가까워진 인연(연애·동업·중요한 약속)이 있었죠?`,
      why: `${yName(yh)}의 기운이 내 자리(일지 ${BRANCHES[db].hanja})와 손을 잡았어요. 이런 해엔 사람과 묶이는 일이 생기기 쉬워요.`,
      basis: `${yh}년 세운 지지 ${BRANCHES[yearBranch(yh)].hanja} + 일지 ${BRANCHES[db].hanja} 육합`,
      weight: 2.2,
    });
  const pickedPast = past.slice(0, 2);

  // 8) 요즘 — 올해 세운
  let now: Hit | null = null;
  const s0 = a.seun.find((s) => s.year === a.currentSajuYear);
  if (s0 && a.age >= 14) {
    const yLabel = `${s0.year}년(${pillarKo(s0.pillar)})`;
    if (s0.flags.some((f) => f.startsWith('일지충')))
      now = { id: `now-day-${s0.year}`, kind: 'now', topic: 'now', text: '올해 들어 이사·관계·건강처럼 생활의 기반을 바꾸고 싶은(또는 바뀌는) 일이 생겼죠?', why: `${yLabel}의 기운이 내 자리(일지)와 정면으로 부딪히는 해예요.`, basis: `${s0.year}년 일지충`, weight: 3 };
    else if (s0.flags.some((f) => f.startsWith('월지충')))
      now = { id: `now-month-${s0.year}`, kind: 'now', topic: 'now', text: '올해 들어 일이나 소속을 바꾸고 싶은 마음이 부쩍 커졌죠?', why: `${yLabel}의 기운이 사회 자리(월지)와 부딪히는 해예요.`, basis: `${s0.year}년 월지충`, weight: 3 };
    else if (adult && s0.flags.some((f) => f.startsWith('일지합') || f.startsWith('일간합')))
      now = { id: `now-hap-${s0.year}`, kind: 'now', topic: 'now', text: '올해 들어 새로운 사람과 가까워지거나, 함께하자는 제안이 늘었죠?', why: `${yLabel}의 기운이 나와 손을 잡는 해예요.`, basis: `${s0.year}년 ${s0.flags.filter((f) => f.includes('합')).map((f) => f.split(':')[0]).join('·')}`, weight: 3 };
    else {
      const g = groupOf(s0.stemTenGod);
      const text = adult ? NOW_LINE[g][1] : NOW_TEEN[g];
      now = { id: `now-${g}-${s0.year}`, kind: 'now', topic: 'now', text, why: `${yLabel}의 기운이 나에게는 ${GROUP_PLAIN[g].name}(${g})으로 들어오는 해예요.`, basis: `${s0.year}년 세운 천간 ${s0.stemTenGod}`, weight: 3 };
    }
  }

  // 순서: 강한 성향 둘 → 지난 일 → 성향 → 지난 일 → 성향 → 요즘
  const t = pickedTraits;
  const p = pickedPast;
  const out = [t[0], t[1], p[0], t[2], t[3], p[1], t[4], t[5], now].filter((h): h is Hit => !!h);
  return out.slice(0, max);
}
