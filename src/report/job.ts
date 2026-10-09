/**
 * 직업 × 사주 × 운
 *
 * 입력한 직업을 분야로 묶고, 그 일이 요구하는 힘(십성 그룹)·환경(오행)을 사주와 비교한다.
 * 그리고 지금의 대운·세운이 어떤 단계인지 보고 "지금 가장 먼저 준비할 것"을 정리한다.
 * 적합도는 사주 구조와 직업이 요구하는 능력의 겹침일 뿐, 실제 성과는 경험·노력·환경이 더 크게 좌우한다.
 */
import { ELEMENT_HANJA, ELEMENT_KO, STEMS, type Element, type GodRole, type SajuAnalysis, type TenGodGroup } from '../engine/index.ts';
import { josa } from '../engine/josa.ts';
import { groupOf, groupOfElement } from '../engine/tenGods.ts';
import { ELEMENT_JOBS, GROUP_JOBS } from './kb.ts';
import type { Report } from './generate.ts';
import { readLuck } from './luckReading.ts';
import { isStrong, plainStatement } from './metrics.ts';
import { GROUP_PLAIN, ROLE_PLAIN, elWord } from './plain.ts';

export interface JobCategory {
  id: string;
  label: string;
  /** 직업명에 이 말이 들어 있으면 이 분야로 본다 */
  keywords: string[];
  /** 이 일이 주로 쓰는 힘 */
  groups: TenGodGroup[];
  /** 이 일의 환경이 가진 오행 */
  elements: Element[];
  /** 이 일에 필요한 것 */
  need: string;
  /** 사주에서 가장 강한 기운별로 잘 맞는 역할 */
  roles?: Record<TenGodGroup, string>;
  special?: 'student' | 'home' | 'transition';
  /** 이 말이 들어 있으면 이 분야로 보지 않는다 (예: '사무직' 안의 '무직') */
  exclude?: string[];
}

export const JOB_CATEGORIES: JobCategory[] = [
  {
    id: 'student',
    label: '학생·수험생',
    keywords: ['학생', '대학생', '고등학생', '중학생', '초등학생', '수험생', '재수', '대학원', '고시', '공시', '취준', '취업준비', '취업 준비', '휴학'],
    groups: ['인성', '식상'],
    elements: ['wood', 'water'],
    need: '꾸준히 배우는 힘과, 나에게 맞는 길을 찾는 탐색',
    special: 'student',
  },
  {
    id: 'transition',
    label: '쉬는 중·전환기',
    keywords: ['무직', '백수', '휴직', '퇴사', '이직준비', '이직 준비', '쉬는', '구직', '실업', '전업준비'],
    groups: ['인성', '식상'],
    elements: [],
    need: '다음 방향을 정하고 준비하는 시간',
    special: 'transition',
    exclude: ['사무직'],
  },
  {
    id: 'home',
    label: '주부·육아',
    keywords: ['주부', '전업', '육아', '살림', '엄마', '아빠'],
    groups: ['인성', '재성'],
    elements: ['earth'],
    need: '집안의 살림과 사람을 돌보는 힘',
    special: 'home',
  },
  {
    id: 'medical',
    label: '의료·보건',
    keywords: ['의사', '간호', '약사', '치과', '한의', '물리치료', '작업치료', '치료사', '의료', '병원', '임상', '보건', '수의', '방사선', '응급구조', '위생사'],
    groups: ['인성', '관성'],
    elements: ['wood', 'metal'],
    need: '정확한 지식과 자격, 생명을 다루는 책임감, 사람을 돌보는 마음',
    roles: { 비겁: '개원·독립 진료', 식상: '환자와 직접 소통하는 진료·상담 실무', 재성: '병원 경영·의료 사업', 관성: '수간호사·과장 같은 관리 직급', 인성: '연구·교육·전문 과정' },
  },
  {
    id: 'public',
    label: '공무원·공공·법률',
    keywords: ['공무원', '경찰', '소방', '군인', '장교', '부사관', '공기업', '공공기관', '공사', '변호사', '판사', '검사', '법무', '법률', '세관', '교도', '노무사', '법조'],
    groups: ['관성', '인성'],
    elements: ['metal', 'earth'],
    need: '규칙과 절차를 지키는 성실함, 조직 안에서 책임을 다하는 힘',
    roles: { 비겁: '개업(변호사·노무사 등) 독립', 식상: '민원·현장 대응 실무', 재성: '예산·재무 분야', 관성: '관리직·승진 트랙', 인성: '정책 연구·교육 담당' },
  },
  {
    id: 'finance',
    label: '금융·회계',
    keywords: ['은행', '금융', '증권', '보험', '회계', '세무', '재무', '투자', '펀드', '애널리스트', '자산', '트레이더', '감정평가', '경리'],
    groups: ['재성', '관성'],
    elements: ['metal', 'water'],
    need: '숫자를 정확히 다루는 꼼꼼함, 돈의 흐름을 읽는 감각, 규정을 지키는 신뢰',
    roles: { 비겁: '독립 자문·세무 사무소', 식상: '분석 리포트·금융 상품 기획', 재성: '투자·영업·자산 운용', 관성: '리스크 관리·감사·관리자', 인성: '리서치·자격 기반 전문가' },
  },
  {
    id: 'creative',
    label: '디자인·콘텐츠·예술',
    keywords: ['디자이너', '디자인', '작가', '웹툰', '일러스트', '유튜버', '크리에이터', '영상', '방송', '배우', '가수', '음악', '예술', '사진', '기자', '에디터', '카피', '애니메이', '모델', '인플루언서', '편집', 'pd', 'ux', 'ui'],
    groups: ['식상', '인성'],
    elements: ['fire', 'wood'],
    need: '자기만의 감각과 표현력, 꾸준히 작품을 내놓는 끈기',
    roles: { 비겁: '1인 크리에이터·스튜디오 운영', 식상: '직접 만드는 창작·디자인 실무', 재성: '콘텐츠 사업·브랜딩 대행', 관성: '아트 디렉터·편집장 같은 리더', 인성: '전문 분야 연구·교육' },
  },
  {
    id: 'it',
    label: '개발·IT',
    keywords: ['개발', '프로그래', '코딩', '엔지니어', '데이터', '인공지능', '백엔드', '프론트', '풀스택', '보안', '인프라', '클라우드', '게임', '소프트웨어', '퍼블리셔', '서버', 'it', 'ai', 'qa', 'sw', 'devops', '앱', '웹'],
    groups: ['식상', '인성'],
    elements: ['fire', 'water'],
    need: '문제를 논리적으로 쪼개는 힘, 새 기술을 계속 배우는 힘, 결과물을 만들어 내는 힘',
    roles: { 비겁: '인디 개발·1인 창업', 식상: '직접 만드는 개발 실무·프로덕트 메이커', 재성: '기술 영업·사업 개발·PM', 관성: '팀장·테크 리드·관리자', 인성: '아키텍트·연구 개발·기술 강의' },
  },
  {
    id: 'edu',
    label: '교육·연구',
    keywords: ['교사', '선생', '강사', '교수', '연구원', '연구', '학원', '교육', '튜터', '과외', '과학자', '박사', '조교', '보육', '유치원'],
    groups: ['인성', '식상'],
    elements: ['wood', 'water'],
    need: '깊이 공부하는 힘과, 그것을 쉽게 풀어 전달하는 힘',
    roles: { 비겁: '1인 강의·교육 브랜드', 식상: '강의·교육 콘텐츠 제작', 재성: '교육 사업·학원 운영', 관성: '보직·학과장 같은 관리자', 인성: '연구·저술' },
  },
  {
    id: 'sales',
    label: '영업·마케팅',
    keywords: ['영업', '마케팅', '마케터', '광고', '홍보', '판매', '세일즈', '브랜드', '그로스', '퍼포먼스', '머천다이저', '바이어', 'md', 'pr'],
    groups: ['식상', '재성'],
    elements: ['fire', 'wood'],
    need: '사람을 설득하는 말솜씨, 시장의 흐름을 읽는 감각, 숫자로 증명하는 성과',
    roles: { 비겁: '1인 마케팅 대행·창업', 식상: '콘텐츠·캠페인 기획', 재성: '영업·매출 책임자', 관성: '팀장·브랜드 매니저', 인성: '데이터 분석·리서치' },
  },
  {
    id: 'business',
    label: '사업·자영업',
    keywords: ['대표', '사장', '창업', '사업', '스타트업', '자영업', '운영', '경영', '가게', '쇼핑몰', '오너', '임원', 'ceo'],
    groups: ['재성', '비겁', '관성'],
    elements: ['earth', 'fire'],
    need: '기회를 보는 눈, 위험을 감당하는 배짱, 사람과 돈을 관리하는 힘',
    roles: { 비겁: '내 이름을 건 독립 경영', 식상: '상품을 직접 만드는 메이커형 창업', 재성: '유통·투자형 사업', 관성: '조직을 키우는 경영자', 인성: '전문 지식 기반 컨설팅 사업' },
  },
  {
    id: 'tech',
    label: '제조·건설·기술직',
    keywords: ['생산', '제조', '공장', '건설', '건축', '토목', '기계', '전기', '설비', '정비', '기술자', '기능', '용접', '배관', '인테리어', '목수', '반도체', '자동차', '현장'],
    groups: ['식상', '관성'],
    elements: ['metal', 'earth'],
    need: '정확한 손기술과 안전 의식, 현장을 책임지는 끈기',
    roles: { 비겁: '기술 기반 개인 사업', 식상: '현장 실무 장인', 재성: '견적·영업·발주 관리', 관성: '현장 소장·관리자', 인성: '설계·기술 교육' },
  },
  {
    id: 'office',
    label: '사무·기획·경영지원',
    keywords: ['사무', '회사원', '직장인', '인사', '총무', '비서', '기획', '경영지원', '전략', '구매', '컨설턴트', '컨설팅', '관리직', '행정', 'hr'],
    groups: ['관성', '인성', '재성'],
    elements: ['earth', 'metal'],
    need: '체계적으로 정리하고 조율하는 힘, 조직의 규칙 안에서 성과를 내는 힘',
    roles: { 비겁: '전문성을 살린 독립 컨설팅', 식상: '기획·보고서·발표 담당', 재성: '예산·성과 관리', 관성: '팀장·관리자 트랙', 인성: '교육·리서치·전문 자격' },
  },
  {
    id: 'service',
    label: '요식·뷰티·서비스',
    keywords: ['요리', '셰프', '조리', '카페', '바리스타', '제빵', '파티시에', '미용', '헤어', '네일', '메이크업', '뷰티', '피부', '서비스', '호텔', '매장', '플로리스트'],
    groups: ['식상', '재성'],
    elements: ['fire', 'wood'],
    need: '손끝의 감각과 성실함, 손님의 마음을 읽는 서비스 감각',
    roles: { 비겁: '내 가게·1인 숍', 식상: '메뉴·스타일을 만드는 장인', 재성: '매장 운영·프랜차이즈', 관성: '점장·실장 같은 관리자', 인성: '교육·자격 강사' },
  },
  {
    id: 'travel',
    label: '물류·운송·무역·여행',
    keywords: ['물류', '유통', '운송', '운전', '기사', '배송', '택배', '무역', '여행', '항공', '승무원', '해운', '관광', '가이드', '파일럿', '선원', '포워딩'],
    groups: ['재성', '식상'],
    elements: ['water'],
    need: '움직이며 일하는 체력, 상황 변화에 빠른 대처, 사람과 물자를 연결하는 감각',
    roles: { 비겁: '개인 운송·여행 사업', 식상: '현장 서비스 실무', 재성: '무역·유통 영업', 관성: '운영 관리자', 인성: '물류 기획·교육' },
  },
  {
    id: 'property',
    label: '부동산·농림·환경',
    keywords: ['부동산', '중개', '농업', '농사', '임업', '조경', '원예', '축산', '환경', '시행'],
    groups: ['재성', '인성'],
    elements: ['earth', 'wood'],
    need: '땅과 자원을 보는 안목, 오래 기다리는 인내, 계약과 문서를 다루는 꼼꼼함',
    roles: { 비겁: '개인 중개·농장 운영', 식상: '현장 관리·재배', 재성: '투자·개발 사업', 관성: '법인·공공 분야 관리', 인성: '감정·컨설팅·연구' },
  },
  {
    id: 'care',
    label: '상담·복지·종교',
    keywords: ['상담', '사회복지', '복지', '심리', '종교', '목사', '신부', '스님', '수녀', '요양', '간병', '활동지원'],
    groups: ['인성', '식상'],
    elements: ['wood', 'water'],
    need: '사람의 이야기를 끝까지 듣는 힘, 공감하면서도 선을 지키는 힘',
    roles: { 비겁: '개인 상담소·코칭', 식상: '프로그램 진행·강연', 재성: '기관 운영', 관성: '기관 관리자', 인성: '전문 상담·연구' },
  },
  {
    id: 'sports',
    label: '스포츠·피트니스',
    keywords: ['운동선수', '트레이너', '체육', '스포츠', '필라테스', '요가', '헬스', '코치', '감독', '선수'],
    groups: ['비겁', '식상'],
    elements: ['fire', 'wood'],
    need: '몸을 쓰는 체력과 승부욕, 꾸준히 단련하는 자기 관리',
    roles: { 비겁: '개인 레슨·센터 창업', 식상: '현장 지도', 재성: '센터 운영', 관성: '팀 코치·감독', 인성: '스포츠 과학·교육' },
  },
];

const OTHER: JobCategory = {
  id: 'other',
  label: '기타',
  keywords: [],
  groups: [],
  elements: [],
  need: '그 일만의 고유한 능력',
};

/** 입력 예시 (입력창 자동완성) */
export const JOB_SUGGEST = [
  '개발자', '디자이너', '마케터', '기획자', '영업', '회사원(사무직)', '공무원', '교사', '간호사', '의사', '약사', '연구원', '회계사', '은행원',
  '자영업', '대표·창업', '프리랜서', '유튜버·크리에이터', '작가', '요리사', '미용사', '승무원', '경찰', '군인', '트레이너', '상담사', '대학생', '취업 준비생', '주부',
];

function tokens(s: string): string[] {
  return s.toLowerCase().split(/[^a-z]+/).filter(Boolean);
}

/** 직업명 → 분야 (짧은 영문 약어는 단어 단위로만 맞춘다: 'pr'이 'programmer'에 걸리지 않게) */
export function matchJob(text: string): JobCategory & { freelance: boolean } {
  const raw = text.trim();
  const low = raw.toLowerCase().replace(/\s+/g, '');
  const tks = tokens(raw);
  const freelance = /프리|1인|n잡/i.test(raw);
  for (const c of JOB_CATEGORIES) {
    if (c.exclude?.some((x) => low.includes(x))) continue;
    for (const k of c.keywords) {
      const ascii = /^[a-z]+$/.test(k);
      if (ascii && k.length <= 3 ? tks.includes(k) : low.includes(k.replace(/\s+/g, ''))) return { ...c, freelance };
    }
  }
  if (freelance) return { ...OTHER, id: 'freelance', label: '프리랜서', groups: ['비겁', '식상'], elements: ['fire', 'water'], need: '혼자 일감을 만들고 관리하는 자기 경영 능력', freelance };
  return { ...OTHER, label: raw.slice(0, 20) || '기타', freelance };
}

// ---------------------------------------------------------------------------
// 문장 재료
// ---------------------------------------------------------------------------
const STRENGTH_IN_JOB: Record<TenGodGroup, { title: string; text: (field: string) => string }> = {
  비겁: { title: '혼자서도 버티는 자립심', text: (f) => `${f} 안에서도 남에게 기대지 않고 스스로 길을 만드는 힘이 있어요. 경쟁이 치열할수록 오히려 힘이 나는 편이라, 성과가 나에게 돌아오는 구조에서 빛나요.` },
  식상: { title: '만들고 표현하는 힘', text: (f) => `생각을 결과물과 말로 꺼내는 힘이 강해요. ${f}에서는 기획·제작·발표처럼 “눈에 보이는 결과”를 내는 일에서 실력이 가장 잘 드러나요.` },
  재성: { title: '성과로 바꾸는 현실 감각', text: (f) => `무엇이 돈이 되고 무엇이 손해인지 빠르게 계산하는 감각이 있어요. ${f}에서 숫자와 성과로 평가받는 자리에 설수록 유리해요.` },
  관성: { title: '책임지고 신뢰받는 힘', text: (f) => `맡은 일을 끝까지 책임지는 태도로 조직의 신뢰를 얻어요. ${f}에서 직급과 역할이 올라갈수록 진가가 드러나는 구조예요.` },
  인성: { title: '깊이 배우고 이해하는 힘', text: (f) => `한 분야를 깊이 파고들어 이해하는 힘이 강해요. ${f}에서 자격·전문성·노하우가 쌓일수록 대체하기 어려운 사람이 돼요.` },
};

const STRAIN: Record<TenGodGroup, { title: string; text: string }> = {
  비겁: { title: '내 몫을 지키는 힘이 약하다', text: '이 일은 혼자 버티고 경쟁하는 힘이 필요한데, 사주상 자기 주장을 밀어붙이는 기운이 약해요. 성과의 공을 분명히 남기고, 내 몫을 요구하는 연습이 필요해요.' },
  식상: { title: '실력만큼 드러내지 못한다', text: '이 일은 생각을 밖으로 표현하는 힘이 많이 필요한데, 사주상 그 기운이 약해 실력만큼 인정받지 못할 수 있어요. 보고서와 발표를 정해 둔 틀에 맞춰 미리 준비해 두면 보완돼요.' },
  재성: { title: '숫자·돈 감각이 약하다', text: '성과와 돈을 다뤄야 하는 일인데, 사주상 현실 계산과 재물 감각이 약한 편이에요. 내 성과를 수치로 기록하고, 돈이 걸린 판단은 체크리스트로 하세요.' },
  관성: { title: '규칙과 위계가 버겁다', text: '규칙과 위계가 분명한 일인데, 사주상 통제를 견디는 기운이 약해요. 스스로 정한 마감과 루틴으로 조직의 규칙을 ‘내 것’으로 만드는 것이 열쇠예요.' },
  인성: { title: '공부와 쉼이 밀리기 쉽다', text: '꾸준히 공부하고 자격을 갖춰야 하는 일인데, 사주상 배우고 쉬어 가는 기운이 약해요. 공부 시간을 일정에 고정해 두지 않으면 금방 밀려요.' },
};

const PHASE: Record<TenGodGroup, { title: string; good: string; neutral: string; bad: string }> = {
  비겁: {
    title: '독립과 경쟁의 시기',
    good: '내 이름을 걸고 움직이기 좋은 때예요. 독립·창업·이직처럼 주도권을 쥐는 선택이 힘을 받아요.',
    neutral: '주도권을 쥐고 싶은 마음이 커지는 때예요. 독립은 준비를 충분히 한 뒤에 움직이세요.',
    bad: '경쟁자와 지출이 늘어 지치기 쉬운 때예요. 동업·보증·무리한 독립은 피하고 내 기반부터 다지세요.',
  },
  식상: {
    title: '실력을 결과물로 보여 줄 시기',
    good: '만든 것이 인정받는 때예요. 포트폴리오·작품·성과를 밖으로 적극적으로 알리세요.',
    neutral: '새로운 일과 변화를 꿈꾸는 때예요. 작게 실험해 보며 방향을 찾으세요.',
    bad: '하고 싶은 것은 많은데 방향이 흩어지는 때예요. 일을 줄이고 하나에 집중하세요. 말실수와 감정적인 퇴사를 조심하세요.',
  },
  재성: {
    title: '성과를 돈으로 바꿀 시기',
    good: '활동 반경과 수입이 커지는 때예요. 연봉 협상·부업·사업 확장에 유리해요.',
    neutral: '돈과 현실 문제가 관심사가 되는 때예요. 수입 구조를 점검하세요.',
    bad: '돈 때문에 애쓰는 때예요. 수입이 늘어도 지출과 투자 손실이 따르기 쉬우니 보수적으로 운영하세요.',
  },
  관성: {
    title: '책임과 자리를 얻는 시기',
    good: '인정받고 승진·발탁이 따르는 때예요. 책임 있는 역할을 피하지 마세요.',
    neutral: '맡는 역할과 책임이 늘어나는 때예요. 평가에 대비해 기록을 남겨 두세요.',
    bad: '압박과 책임이 무거워지는 때예요. 건강을 먼저 챙기고, 무리한 직책 욕심은 내려놓으세요.',
  },
  인성: {
    title: '배우고 자격을 갖출 시기',
    good: '배움과 귀인의 도움이 길을 여는 때예요. 자격·학위·교육에 투자하세요.',
    neutral: '드러나지 않게 실력을 쌓는 때예요. 지금의 공부가 다음 단계의 무기가 돼요.',
    bad: '생각만 많고 실행이 막히는 때예요. 공부를 핑계로 결정을 미루지 마세요.',
  },
};

const PREP: Record<TenGodGroup, { title: string; text: (field: string) => string }> = {
  비겁: { title: '내 이름으로 할 수 있는 일 만들기', text: (f) => `${f} 안에서 사이드 프로젝트나 개인 브랜드처럼 ‘내 이름’으로 할 수 있는 일을 하나 만들어 두세요. 독립은 그것이 자리 잡은 뒤에 결정해도 늦지 않아요.` },
  식상: { title: '결과물을 쌓아 밖으로 보여 주기', text: () => '포트폴리오·사례·작품을 정리해 공개하세요. 이 시기에는 보여 준 만큼 기회가 와요.' },
  재성: { title: '성과를 숫자로 정리해 몸값 키우기', text: () => '지난 1~2년의 성과를 숫자로 정리해 연봉·단가·수익 구조를 다시 협상하세요. 부업이나 추가 수입원도 이때 만들기 좋아요.' },
  관성: { title: '책임 있는 역할로 리더 경험 쌓기', text: () => '팀을 이끌거나 책임지는 역할을 맡아 경험을 쌓고, 다음 직급이나 자격의 요건을 미리 확인해 두세요.' },
  인성: { title: '다음 10년의 몸값이 될 공부', text: (f) => `${f}에서 다음 단계로 가는 데 필요한 자격증·학위·새 기술 하나를 정해 끝까지 마치세요. 이 시기의 배움이 다음 10년의 몸값이 돼요.` },
};

const YEAR_PREP: Record<TenGodGroup, string> = {
  비겁: '올해는 사람 문제와 지출 관리가 먼저예요. 동업이나 돈거래는 반드시 문서로 남기세요.',
  식상: '올해는 아이디어 하나라도 완성해 공개하는 해로 삼으세요.',
  재성: '올해는 성과를 수입으로 연결하는 협상과 정리가 핵심이에요.',
  관성: '올해는 평가와 책임이 늘어나요. 기본 업무의 완성도를 지키세요.',
  인성: '올해는 배우고 준비하기 좋은 해예요. 하나의 과정을 끝까지 마치세요.',
};

const WORK_YONGSIN: Record<Element, string> = {
  wood: '새로운 것을 배우는 시간을 업무 일정에 고정하세요(주 2시간 학습). 성장하고 있다는 감각이 이 사주의 기운을 살려요.',
  fire: '성과를 사람들 앞에서 발표하고 알리는 기회를 만드세요. 드러날수록 운이 붙는 사주예요.',
  earth: '업무 루틴과 마감을 일정하게 지키는 것이 가장 큰 무기가 돼요. 약속을 지키는 사람이라는 평판이 기회를 불러요.',
  metal: '하는 일을 줄이고 기준을 세워 정리하세요. 불필요한 회의와 업무를 덜어 내는 것이 곧 성과로 이어져요.',
  water: '깊이 생각하고 기록하는 시간을 확보하세요. 충분한 수면이 판단력을 지켜 줘요.',
};

const STUDENT_PREP: Record<TenGodGroup, string> = {
  비겁: '혼자 하는 공부보다 함께 겨루는 환경(스터디·대회·팀 프로젝트)에서 실력이 빨리 늘어요.',
  식상: '배운 것을 결과물(발표·작품·포트폴리오)로 남기는 습관이 진로의 무기가 돼요.',
  재성: '아르바이트·인턴처럼 현장을 직접 겪어 보는 경험이 진로를 정하는 데 가장 큰 도움이 돼요.',
  관성: '시험·자격처럼 기준이 분명한 목표를 세우면 꾸준히 해내요. 학교나 모임에서 책임 있는 역할도 도움이 돼요.',
  인성: '깊이 공부하는 힘이 큰 시기예요. 관심 분야 하나를 정해 남보다 깊이 파고드세요.',
};

/** 분야별로 각 오행 환경이 실제로 뜻하는 것 [짧게, 자세히] */
const ENV_IN_JOB: Record<string, Partial<Record<Element, [string, string]>>> = {
  medical: { wood: ['돌보고 회복시키는 일', '환자를 돌보고 회복시키는, 생명을 키우는 일'], metal: ['정밀한 처치와 수치', '검사 수치·처치처럼 작은 오차도 허용되지 않는 정밀함'] },
  public: { metal: ['규정과 원칙', '법과 규정대로 판단하고 원칙을 지키는 일'], earth: ['민원과 중재', '민원과 이해관계를 중재하며 조직을 안정적으로 지키는 일'] },
  finance: { metal: ['숫자와 규정', '숫자와 규정을 한 치 오차 없이 맞추는 일'], water: ['돈과 정보의 흐름', '돈과 정보의 흐름을 쉼 없이 읽어야 하는 일'] },
  creative: { fire: ['드러내고 평가받기', '작품을 세상에 드러내고 조회수·평가로 반응을 받는 일'], wood: ['새로 기획하기', '없던 것을 새로 기획하고 키워 내는 일'] },
  it: { fire: ['마감과 속도', '화면 앞에서 마감에 맞춰 빠르게 결과물을 내는 일'], water: ['깊은 논리와 데이터', '보이지 않는 데이터와 논리를 깊이 파고드는 일, 밤늦게까지 이어지는 집중'] },
  edu: { wood: ['사람을 키우는 일', '새 학생·새 학기처럼 사람을 키우고 늘 새로 시작하는 일'], water: ['혼자 연구하는 시간', '자료를 찾고 연구하며 혼자 깊이 생각하는 시간이 긴 일'] },
  sales: { fire: ['앞에 나서는 일', '사람 앞에 나서서 말하고, 반응과 실적이 바로 드러나는 일'], wood: ['끝없는 새 기획', '새 고객·새 캠페인을 끝없이 기획하고 넓혀 가는 일'] },
  business: { earth: ['붙잡고 버티기', '사람·돈·공간을 붙잡고 관리하며 버티는 일'], fire: ['알리고 모으기', '가게와 브랜드를 알리고 사람을 모으는 일'] },
  tech: { metal: ['기계와 정밀함', '기계·공구·금속을 다루는 정밀한 일'], earth: ['현장 책임', '현장(땅·건물)을 책임지고 묵묵히 버티는 일'] },
  office: { earth: ['조율과 운영', '부서 사이를 조율하고 정해진 업무를 안정적으로 굴리는 일'], metal: ['규정과 서류', '규정·결재·서류를 정확히 맞추는 일'] },
  service: { fire: ['손님 응대', '불·열·조명 앞에서 손님을 직접 응대하는 일'], wood: ['새 메뉴·스타일', '메뉴·스타일을 새로 개발하고 손님을 단골로 키우는 일'] },
  travel: { water: ['쉼 없는 이동', '쉼 없이 움직이고 흘러 다니는 일, 정해진 자리 없이 이동하는 생활'] },
  property: { earth: ['땅과 계약', '땅과 건물, 계약을 다루며 오래 기다리는 일'], wood: ['키우고 가꾸기', '식물과 자연을 키우고 가꾸는 일'] },
  care: { wood: ['회복을 돕는 일', '사람의 회복과 성장을 돕는 일'], water: ['감정을 품는 일', '남의 깊은 이야기와 감정을 받아 주고 오래 품는 일'] },
  sports: { fire: ['뜨거운 승부', '몸을 뜨겁게 쓰고 승부를 겨루는 일'], wood: ['꾸준한 단련', '몸과 실력을 꾸준히 키워 가는 일'] },
  freelance: { fire: ['나를 알리는 일', '나를 드러내고 알려야 일감이 들어오는 생활'], water: ['혼자 일하는 시간', '출퇴근 없이 흘러가는 생활, 혼자 일하는 긴 시간'] },
};
const ENV_GENERIC: Record<Element, [string, string]> = {
  wood: ['새로 시작하는 일', '새로 시작하고 키워 가는 일, 끝없이 새 일이 생기는 환경'],
  fire: ['드러나는 일', '사람 앞에 드러나고 빠르게 결과를 내야 하는 환경'],
  earth: ['붙잡고 지키는 일', '사람과 일을 중재하고 안정적으로 지켜야 하는 환경'],
  metal: ['정확해야 하는 일', '규칙과 정확성이 중요한, 실수 하나에 책임이 따르는 환경'],
  water: ['생각이 많은 일', '생각·정보·이동이 많고 혼자 깊이 파고드는 환경'],
};

/** 그 환경의 기운이 나(일간)에게 무엇인지에 따라 실제로 생기는 일 */
const ENV_EFFECT: Record<TenGodGroup, { good: string; bad: string; tip: string }> = {
  비겁: {
    good: '나와 같은 기운이라, 이런 환경에서 일할수록 자신감과 버티는 힘이 붙어요.',
    bad: '나와 같은 기운인데 이미 내 힘이 센 사주라, 더해지면 넘쳐요. 고집 대결·주도권 다툼·경쟁 피로로 나타나기 쉬워요.',
    tip: '역할과 공을 처음부터 분명히 나누고, 같은 걸 두고 겨루기보다 나만의 영역을 만드세요.',
  },
  식상: {
    good: '내 힘을 밖으로 꺼내 쓰게 하는 기운이라, 넘치는 힘이 표현과 결과물로 풀려 일할수록 오히려 개운해져요.',
    bad: '내 힘을 밖으로 꺼내 쓰게 하는 기운인데, 힘이 넉넉하지 않은 사주라 꺼내 쓰기만 하면 금방 방전돼요. 하루 종일 말하고 만든 날 유난히 녹초가 되는 이유예요.',
    tip: '말·발표·창작이 몰린 날 다음엔 회복 시간을 미리 잡고, 동시에 벌이는 일을 두 개 이하로 줄이세요.',
  },
  재성: {
    good: '내가 다루는 돈·성과의 기운이라, 힘이 넉넉한 이 사주에선 일한 만큼 실적과 보상으로 바뀌어요.',
    bad: '내가 감당해야 하는 돈·성과의 기운인데, 사주의 힘에 비해 짐이 커지기 쉬워요. 실적·매출 압박이 남보다 더 무겁게 느껴질 수 있어요.',
    tip: '목표를 작게 쪼개 기록하고, 혼자 다 떠안지 말고 도움을 요청하세요. 돈이 걸린 결정은 하루 미뤄서 하세요.',
  },
  관성: {
    good: '나를 다잡는 규칙·책임의 기운이라, 힘이 넘치는 이 사주에선 기준이 분명할수록 힘이 한 방향으로 모여요.',
    bad: '나를 누르는 규칙·평가·책임의 기운인데, 사주의 힘에 비해 누르는 힘이 커지기 쉬워요. 눈치·평가 스트레스, “내가 다 책임져야 한다”는 압박으로 나타나요.',
    tip: '평가 기준을 미리 물어 두고, 퇴근 뒤엔 업무 알림을 끄세요. 책임은 나눠 지는 거라는 걸 기억하세요.',
  },
  인성: {
    good: '나를 채워 주는 배움·도움의 기운이라, 힘이 부족한 이 사주에선 배우고 도움받을수록 힘이 붙어요.',
    bad: '나를 채워 주는 배움·생각의 기운인데, 이미 충분히 채워진 사주라 더해지면 생각만 많아지고 실행이 느려져요.',
    tip: '공부와 준비는 70%에서 멈추고 실행하세요. 자료 조사가 길어지면 마감부터 정하세요.',
  },
};

export interface JobEnv {
  el: Element;
  role: GodRole;
  tone: 'good' | 'mid' | 'bad';
  /** 이 일에서 그 기운이 뜻하는 것 */
  short: string;
  what: string;
  /** 나에게 생기는 일 */
  me: string;
  tip: string | null;
  basis: string;
}

/** 일의 환경(오행)이 이 사주에 어떻게 작용하는지 — 무엇을 뜻하고, 나에게 무슨 일이 생기고, 어떻게 할지 */
export function jobEnv(a: SajuAnalysis, catId: string, els: Element[]): JobEnv[] {
  const me = STEMS[a.pillars.day.stem].element;
  const strong = isStrong(a);
  return els.map((e) => {
    const role = a.yongsin.roles[e];
    const tone = ROLE_PLAIN[role].tone;
    const g = groupOfElement(me, e);
    const [short, what] = ENV_IN_JOB[catId]?.[e] ?? ENV_GENERIC[e];
    const supportive = g === '비겁' || g === '인성';
    // 신강·신약으로 설명되는 경우만 십성별 문장을 쓰고, 조후·특수격으로 정해진 경우는 일반 문장
    const usual = tone === 'good' ? supportive !== strong : supportive === strong;
    let meText: string;
    let tip: string | null = null;
    if (tone === 'mid') meText = '좋지도 나쁘지도 않은 기운이라, 이 환경 자체가 큰 변수는 아니에요.';
    else if (tone === 'good') meText = usual ? ENV_EFFECT[g].good : '이 사주의 기울어진 균형을 맞춰 주는 기운이라, 이런 환경에서 일할수록 기운이 채워져요.';
    else {
      meText = usual ? ENV_EFFECT[g].bad : '이 사주에서 이미 넘치는 쪽을 더 키우는 기운이라, 이런 환경이 길어질수록 남보다 빨리 지치기 쉬워요.';
      tip = usual ? ENV_EFFECT[g].tip : `이런 일이 몰리는 시기엔 쉬는 시간을 일정에 먼저 넣고, 필요한 기운인 ${elWord(a.yongsin.yongsin)}의 습관(고민 리포트 ‘이직·진로’의 개운법)으로 균형을 맞추세요.`;
    }
    return { el: e, role, tone, short, what, me: meText, tip, basis: `${ELEMENT_KO[e]}(${ELEMENT_HANJA[e]}) = ${role} · 나에게는 ${g}` };
  });
}

export interface JobPoint {
  title: string;
  text: string;
  basis: string;
}

export interface JobAnalysis {
  input: string;
  category: JobCategory;
  freelance: boolean;
  fit: { score: number; label: string; text: string; basis: string; env: JobEnv[] } | null;
  strengths: JobPoint[];
  cautions: JobPoint[];
  now: JobPoint;
  prepare: JobPoint[];
  timing: { good: number[]; promote: number[]; caution: number[]; text: string };
  role: string | null;
  alternatives: string[];
  headline: string;
}

const ROLE_SCORE: Record<string, number> = { 용신: 1, 희신: 0.5, 한신: 0, 구신: -0.5, 기신: -1 };

export function analyzeJob(a: SajuAnalysis, report: Report, jobText: string): JobAnalysis {
  const cat = matchJob(jobText);
  const who = a.input.name ? `${a.input.name}님` : '당신';
  const gp = a.elements.groupPercent;
  const ranked = (Object.keys(gp) as TenGodGroup[]).sort((x, y) => gp[y] - gp[x]);
  const [top, second] = ranked;
  const field = cat.id === 'other' || cat.id === 'freelance' ? jobText.trim() || '지금 하는 일' : cat.label;
  const fieldJ = (pair: '은/는' | '이/가' | '을/를' | '에서') => (pair === '에서' ? `${field}에서` : josa(field, pair));
  const needs = cat.groups.length ? cat.groups : [top];

  // 적합도: 이 일이 쓰는 힘이 사주에 얼마나 있는가 + 일의 환경(오행)이 사주에 도움이 되는가
  let fit: JobAnalysis['fit'] = null;
  if (!cat.special) {
    const groupFit = needs.reduce((s, g) => s + Math.min(gp[g], 40) / 40, 0) / needs.length;
    const els = cat.elements;
    const elementFit = els.length ? els.reduce((s, e) => s + ROLE_SCORE[a.yongsin.roles[e]], 0) / els.length : 0;
    const score = Math.round(Math.max(10, Math.min(95, 38 + 48 * groupFit + 14 * elementFit)));
    const label = score >= 72 ? '잘 맞음' : score >= 58 ? '맞는 편' : score >= 45 ? '보통' : '노력이 더 필요';
    const strong = needs.filter((g) => gp[g] >= 20);
    const weak = needs.filter((g) => gp[g] < 10);
    const envGood = els.filter((e) => ['용신', '희신'].includes(a.yongsin.roles[e]));
    const envBad = els.filter((e) => ['기신', '구신'].includes(a.yongsin.roles[e]));
    const parts = [`${fieldJ('은/는')} ${cat.need}이 필요한 일이에요.`];
    const gName = (g: TenGodGroup) => `${GROUP_PLAIN[g].name}(${g} ${gp[g].toFixed(0)}%)`;
    if (strong.length) parts.push(`${who}의 사주에는 이 일이 쓰는 ${josa(strong.map(gName).join('·'), '이/가')} 충분해요.`);
    if (weak.length) parts.push(`반면 ${josa(weak.map(gName).join('·'), '은/는')} 약해, 그 부분은 노력과 요령으로 채워야 해요.`);
    if (!strong.length && !weak.length) parts.push(`이 일이 쓰는 힘(${needs.map((g) => GROUP_PLAIN[g].name).join('·')})이 사주에 보통 수준으로 있어요.`);
    const env = jobEnv(a, cat.id, els);
    const q = (e: Element) => `‘${env.find((x) => x.el === e)!.short}’`;
    if (envGood.length) parts.push(`이 일의 ${envGood.map(q).join('·')} 쪽은 이 사주에 필요한 기운이라, 일할수록 기운이 채워지는 쪽이에요.`);
    if (envBad.length) parts.push(`다만 ${envBad.map(q).join('·')} 쪽은 이 사주에 부담이 되는 기운이라, 그런 일이 몰릴수록 남보다 빨리 지치기 쉬워요. 아래에 무엇이 왜 부담인지, 어떻게 하면 되는지 풀어 두었어요.`);
    fit = {
      score,
      label,
      text: parts.join(' '),
      basis: `필요한 힘 ${needs.map((g) => `${g} ${gp[g].toFixed(0)}%`).join(' · ')}${els.length ? ` · 일의 오행 ${els.map((e) => `${ELEMENT_KO[e]}(${a.yongsin.roles[e]})`).join('·')}` : ''}`,
      env,
    };
  }

  // 살릴 강점: 가장 강한 기운 두 개
  const strengths: JobPoint[] = [top, second].map((g) => ({ title: STRENGTH_IN_JOB[g].title, text: STRENGTH_IN_JOB[g].text(field), basis: `${g} ${gp[g].toFixed(0)}%` }));

  // 조심할 점: 이 일이 쓰는데 약한 기운 + 사주의 대표 약점
  const cautions: JobPoint[] = [];
  for (const g of needs.filter((g) => gp[g] < 10)) cautions.push({ title: STRAIN[g].title, text: STRAIN[g].text, basis: `${g} ${gp[g].toFixed(0)}%` });
  const summary = report.sections.find((s) => s.id === 'summary');
  const weak = summary?.blocks.find((b) => b.heading.includes('약점'))?.items[0];
  if (weak && cautions.length < 2) cautions.push({ title: '사주가 경고하는 약점', text: plainStatement(weak.text), basis: weak.evidence ?? '사주 원국' });

  // 지금의 운: 대운 + 올해 세운
  const d = a.currentDaeun;
  const year = a.seun.find((s) => s.year === a.currentSajuYear);
  const dg = d ? groupOf(d.stemTenGod) : top;
  const dTone = d ? (d.score >= 58 ? 'good' : d.score < 42 ? 'bad' : 'neutral') : 'neutral';
  const yg = year ? groupOf(year.stemTenGod) : dg;
  const yTone = year ? (year.combined >= 58 ? 'good' : year.combined < 42 ? 'bad' : 'neutral') : 'neutral';
  const yRead = year ? readLuck(a, year, '해', year.combined) : null;
  const ageNow = Math.floor((a.now - a.pillars.conversion.utcMs) / (365.2422 * 86400000));
  // 대운이 1년 안에 바뀌면 다음 10년을 함께 본다
  const next = d ? a.daeun.list[a.daeun.list.indexOf(d) + 1] : undefined;
  const switching = !!(d && next && d.endYear - a.currentSajuYear <= 1);
  const ng = next ? groupOf(next.stemTenGod) : dg;
  const nTone = next ? (next.score >= 58 ? 'good' : next.score < 42 ? 'bad' : 'neutral') : 'neutral';
  const now: JobPoint = {
    title: `지금은 ‘${PHASE[dg].title}’`,
    text: `${d ? `${d.startYear}~${d.endYear}년의 대운은 ${josa(PHASE[dg].title, '이에요/예요')}. ` : ''}${PHASE[dg][dTone]}${yRead ? ` 그리고 ${a.currentSajuYear}년은 ${josa(`“${yRead.headline}”`, '이에요/예요')}.` : ''}${switching && next ? (ng === dg ? ` ${next.startYear}년부터 시작되는 다음 10년(${next.stemTenGod})도 같은 흐름이 이어져요.` : ` 곧 ${next.startYear}년부터는 ‘${PHASE[ng].title}’로 넘어가요. ${PHASE[ng][nTone]}`) : ''}`,
    basis: `${d ? `대운 ${d.stemTenGod}(${d.stemRole}) ${d.score}점` : '대운 정보 없음'}${year ? ` · ${year.year}년 세운 ${year.stemTenGod} ${year.combined}점` : ''}${switching && next ? ` · 다음 대운 ${next.stemTenGod} ${next.score}점` : ''}`,
  };

  // 지금 준비할 것
  const prepare: JobPoint[] = [];
  if (cat.special === 'student') {
    prepare.push({ title: '지금 시기의 공부법', text: STUDENT_PREP[dg], basis: `대운 ${dg}` });
    prepare.push({ title: '진로를 고를 때', text: `사주에서 가장 강한 ${top}의 힘을 쓰는 길이 유리해요: ${GROUP_JOBS[top]}. 필요한 기운인 ${ELEMENT_KO[a.yongsin.yongsin]}(${ELEMENT_HANJA[a.yongsin.yongsin]})과 관련된 ${ELEMENT_JOBS[a.yongsin.yongsin].slice(0, 3).join('·')} 분야도 잘 맞아요.`, basis: `${top} ${gp[top].toFixed(0)}% · 용신 ${ELEMENT_KO[a.yongsin.yongsin]}` });
  } else if (switching && next && ng !== dg) {
    prepare.push({ title: `다음 10년 준비: ${PREP[ng].title}`, text: `${next.startYear}년부터 대운이 바뀌어요. ${PREP[ng].text(field)}`, basis: `다음 대운 ${next.stemTenGod}(${next.stemRole})` });
  } else {
    prepare.push({ title: PREP[dg].title, text: PREP[dg].text(field), basis: `대운 ${d ? d.stemTenGod : dg}` });
  }
  prepare.push({
    title: `${a.currentSajuYear}년에 할 일`,
    text: `${YEAR_PREP[yg]} ${yTone === 'good' ? '운의 뒷받침이 있으니 적극적으로 움직여도 좋아요.' : yTone === 'bad' ? '운의 뒷받침이 약하니 큰 결정은 서두르지 마세요.' : '무리하지 않는 선에서 꾸준히 밀고 가면 돼요.'}`,
    basis: year ? `${year.year}년 세운 ${year.stemTenGod}(${year.stemRole})` : '올해 세운',
  });
  const strain = needs.find((g) => gp[g] < 10);
  if (strain) prepare.push({ title: `보완: ${STRAIN[strain].title}`, text: STRAIN[strain].text, basis: `${strain} ${gp[strain].toFixed(0)}%` });
  else prepare.push({ title: `일에 ${ELEMENT_KO[a.yongsin.yongsin]}(${ELEMENT_HANJA[a.yongsin.yongsin]}) 기운 더하기`, text: WORK_YONGSIN[a.yongsin.yongsin], basis: `용신 ${ELEMENT_KO[a.yongsin.yongsin]}` });

  // 시기: 커리어 연도 신호
  const tl = report.sections.find((s) => s.id === 'career')?.timeline?.items ?? [];
  const good = tl.filter((t) => t.verdict === '이직 적기').map((t) => t.year);
  const promote = tl.filter((t) => t.verdict === '승진·인정' || t.verdict === '성과 유리').map((t) => t.year);
  const caution = tl.filter((t) => t.verdict === '충동 이직 주의' || t.verdict === '버티며 준비').map((t) => t.year);
  const tParts: string[] = [];
  if (good.length) tParts.push(`이직·전환에 유리한 해는 ${good.join(', ')}년이에요.`);
  if (promote.length) tParts.push(`지금 자리에서 성과와 인정이 따르기 쉬운 해는 ${promote.slice(0, 4).join(', ')}년이에요.`);
  if (caution.length) tParts.push(`${caution.slice(0, 4).join(', ')}년은 무리한 변화보다 버티며 준비하는 편이 나아요.`);
  if (!tParts.length) tParts.push('향후 10년 중 커리어 신호가 크게 튀는 해는 뚜렷하지 않아요. 운보다 조건(연봉·직무·사람)을 기준으로 판단하세요.');

  // 이 분야 안에서 잘 맞는 역할
  const role = cat.roles ? `${fieldJ('에서')}는 ${cat.roles[top]} 쪽이 사주와 가장 잘 맞고, 그다음은 ${josa(cat.roles[second], '이에요/예요')}.` : null;

  // 다른 길
  const alternatives = [GROUP_JOBS[top], `필요한 기운 ${ELEMENT_KO[a.yongsin.yongsin]}(${ELEMENT_HANJA[a.yongsin.yongsin]})의 분야: ${ELEMENT_JOBS[a.yongsin.yongsin].join(', ')}`];

  const headline =
    cat.special === 'student'
      ? `지금은 ‘${PHASE[dg].title}’ — ${STUDENT_PREP[dg].split('.')[0]}.`
      : switching && next && ng !== dg
        ? `${next.startYear}년부터 ‘${PHASE[ng].title}’ — 지금은 ${josa(PREP[ng].title, '을/를')} 준비할 때`
        : switching && next
          ? `${next.endYear}년까지 이어지는 ‘${PHASE[dg].title}’ — ${PREP[dg].title}에 집중할 때`
        : `만 ${ageNow}세, 지금은 ‘${PHASE[dg].title}’ — ${PREP[dg].title}에 집중할 때`;

  return {
    input: jobText.trim(),
    category: cat,
    freelance: cat.freelance,
    fit,
    strengths,
    cautions,
    now,
    prepare,
    timing: { good, promote, caution, text: tParts.join(' ') },
    role,
    alternatives,
    headline,
  };
}
