/** 고민 리포트 목록 — 결과 화면의 고민 리포트 칸·지름길과 세부 풀이 속 '그래서 언제?' 카드가 함께 쓴다 */
import type { SajuAnalysis } from '../engine/index.ts';
import type { SectionId } from './generate.ts';
import { seasonOf } from './season.ts';

export type ConcernId = 'career' | 'match' | 'love' | 'money' | 'exam' | 'year';

export const CONCERNS: { id: ConcernId; title: string; ask: string }[] = [
  { id: 'career', title: '이직·진로', ask: '지금 옮겨도 될까?' },
  { id: 'match', title: '궁합·재회', ask: '그 사람과 잘 맞을까?' },
  { id: 'love', title: '연애·결혼', ask: '인연은 언제 올까?' },
  { id: 'money', title: '돈', ask: '돈은 언제 모일까?' },
  { id: 'exam', title: '시험·합격', ask: '이번 시험, 붙을 수 있을까?' },
  { id: 'year', title: '올해 운세', ask: '올해 무엇을 조심할까?' },
];

/**
 * 무료 풀이 리포트에서 빼는 '때' — 연애·일·돈의 10년 신호와 그 해석(카드 한 묶음·이야기 한 문단)은
 * 고민 리포트 상세(유료)에만 둔다. 건강은 겁을 주고 파는 인상을 주지 않도록 무료로 둔다.
 */
export const TIMING: Partial<Record<SectionId, { block?: string; para: string }>> = {
  love: { block: '시기', para: '인연의 시기' },
  career: { block: '이직 타이밍', para: '이직과 커리어의 타이밍' },
  wealth: { para: '재물의 흐름' },
};

/** 이 사람에게 보일 이름 — '올해 운세'는 신년운세 시즌이면 '2027 신년운세'가 된다 */
export function concernMeta(id: ConcernId, a: SajuAnalysis): { id: ConcernId; title: string; ask: string } {
  const base = CONCERNS.find((c) => c.id === id)!;
  if (id !== 'year') return base;
  const s = seasonOf(a);
  return { id, title: s.title, ask: s.ask };
}

/** 보일 순서 — 신년운세 시즌에는 신년운세를 맨 앞에 */
export function concernsFor(a: SajuAnalysis) {
  const list = CONCERNS.map((c) => concernMeta(c.id, a));
  return seasonOf(a).newYear ? [list.find((c) => c.id === 'year')!, ...list.filter((c) => c.id !== 'year')] : list;
}
