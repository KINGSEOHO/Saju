/** 고민 리포트 목록 — 결과 첫 화면의 고민 고르기 카드와 고민 리포트 칸이 함께 쓴다 */
export type ConcernId = 'career' | 'match' | 'love' | 'money' | 'exam' | 'year';

export const CONCERNS: { id: ConcernId; title: string; ask: string; ready: boolean }[] = [
  { id: 'career', title: '이직·진로', ask: '지금 옮겨도 될까?', ready: true },
  { id: 'match', title: '궁합·재회', ask: '그 사람과 잘 맞을까?', ready: true },
  { id: 'love', title: '연애·결혼', ask: '인연은 언제 올까?', ready: false },
  { id: 'money', title: '돈', ask: '돈은 언제 모일까?', ready: false },
  { id: 'exam', title: '시험·합격', ask: '이번 시험, 붙을 수 있을까?', ready: false },
  { id: 'year', title: '올해 운세', ask: '올해 무엇을 조심할까?', ready: false },
];
