/** 고민 리포트 목록 — 결과 화면의 고민 리포트 칸과 세부 풀이 속 '그래서 언제?' 카드가 함께 쓴다 */
export type ConcernId = 'career' | 'match' | 'love' | 'money' | 'exam' | 'year';

export const CONCERNS: { id: ConcernId; title: string; ask: string }[] = [
  { id: 'career', title: '이직·진로', ask: '지금 옮겨도 될까?' },
  { id: 'match', title: '궁합·재회', ask: '그 사람과 잘 맞을까?' },
  { id: 'love', title: '연애·결혼', ask: '인연은 언제 올까?' },
  { id: 'money', title: '돈', ask: '돈은 언제 모일까?' },
  { id: 'exam', title: '시험·합격', ask: '이번 시험, 붙을 수 있을까?' },
  { id: 'year', title: '올해 운세', ask: '올해 무엇을 조심할까?' },
];
