/**
 * 고민 리포트 — '나는 어떤 사람인가'가 아니라 '내 고민은 언제, 어떻게'에 답한다.
 *  - 무료: 한 줄 답 · 이유 하나 · 올해와 내년 신호 · 나에게 맞는 일
 *  - 상세(유료 예정): 앞으로 12개월 움직일 달 · 피할 달, 10년 신호표, 남는다면 / 옮긴다면, 직장 리스크, 긴 풀이
 * 재료는 풀이 리포트의 직업 섹션(연도별 신호·적성·리스크)과 월운에서 가져오고, 답을 정하는 부분만 새로 계산한다.
 */
import type { SajuAnalysis, Wolun } from '../engine/index.ts';
import { twelveSinsal } from '../engine/sinsal.ts';
import { groupOf, type TenGodGroup } from '../engine/tenGods.ts';
import type { Report, Statement, YearSignal } from './generate.ts';
import { analyzeJob } from './job.ts';
import { ELEMENT_JOBS } from './kb.ts';
import type { StoryPara } from './story.ts';

/** 움직일 때 · 준비할 때 · 지킬 때 · 버틸 때 */
export type Stance = 'move' | 'prepare' | 'stay' | 'hold';
export const STANCE_LABEL: Record<Stance, string> = { move: '움직일 때', prepare: '준비할 때', stay: '지킬 때', hold: '버틸 때' };

export interface MonthSign {
  w: Wolun;
  kind: 'go' | 'avoid';
  why: string;
}

export interface CareerConcern {
  stance: Stance;
  answer: string;
  why: { text: string; basis: string };
  thisYear: YearSignal;
  nextYear: YearSignal | null;
  /** 앞으로 10년 중 옮기기 가장 좋은 해 */
  best: number | null;
  teaser: string;
  fit: Statement[];
  job: { label: string; score: number; field: string } | null;
  // --- 상세
  months: MonthSign[];
  timeline: YearSignal[];
  stay: string[];
  move: string[];
  risks: Statement[];
  story: StoryPara[];
}

/** 연도별 신호의 메모를 쉬운 말로 */
const NOTE_PLAIN: [RegExp, string][] = [
  [/^월지충/, '들어오는 기운이 사주의 ‘직장 자리’(월지)를 정면으로 흔들어요. 내가 원하지 않아도 부서·역할·회사가 바뀌기 쉬운 때예요.'],
  [/^상관견관/, '틀을 깨고 싶은 기운이 원래 있던 ‘규칙과 윗사람’ 기운과 부딪혀요. 감정이 앞서 사표를 던지기 쉬운 구조예요.'],
  [/^상관운/, '틀을 깨고 싶은 기운(상관)이 들어와 지금 일이 답답하게 느껴지고, 윗사람과 부딪히기 쉬워요.'],
  [/^식신운/, '새 일과 전문성을 넓히는 기운(식신)이 들어와 하고 싶은 일이 또렷해져요.'],
  [/^관성운/, '자리와 책임을 뜻하는 기운(관성)이 들어와 승진·입사 기회가 오지만, 부담도 함께 커져요.'],
  [/^인성운/, '자격·공부·계약을 돕는 기운(인성)이 들어와 준비해 둔 것이 인정받기 쉬워요.'],
  [/^역마/, '이동의 별(역마)이 들어와 출장·전근·이사처럼 자리를 옮기는 일이 생기기 쉬워요.'],
];

function plainOf(notes: string[]): { text: string; note: string } | null {
  for (const [re, text] of NOTE_PLAIN) {
    const note = notes.find((n) => re.test(n));
    if (note) return { text, note };
  }
  return null;
}

const powerWord = (score: number) => (score >= 60 ? '운의 힘도 좋은 편' : score >= 45 ? '운의 힘은 보통' : '운의 힘은 약한 편');

function decide(t: YearSignal, next: YearSignal | null): { stance: Stance; answer: string } {
  const nextGood = next?.verdict === '이직 적기';
  switch (t.verdict) {
    case '이직 적기':
      return { stance: 'move', answer: '지금은 움직여도 좋은 때예요' };
    case '충동 이직 주의':
      return { stance: 'hold', answer: '옮기고 싶어도 지금은 버틸 때예요' };
    case '승진·인정':
    case '성과 유리':
      return { stance: 'stay', answer: '옮기기보다 지금 자리에서 성과를 낼 때예요' };
    case '버티며 준비':
      return { stance: 'hold', answer: '지금은 힘을 아끼며 버틸 때예요' };
    default:
      return nextGood ? { stance: 'prepare', answer: '지금은 내년을 위해 준비할 때예요' } : { stance: 'prepare', answer: '지금은 옮기기보다 준비할 때예요' };
  }
}

/** 앞으로 12개월 중 움직이기 좋은 달 · 피할 달 */
function monthSigns(a: SajuAnalysis, months: Wolun[]): MonthSign[] {
  const yb = a.pillars.year.branch;
  const db = a.pillars.day.branch;
  const out: MonthSign[] = [];
  for (const w of months) {
    const groups: TenGodGroup[] = [groupOf(w.stemTenGod), groupOf(w.branchTenGod)];
    const sanggwan = w.stemTenGod === '상관' || w.branchTenGod === '상관';
    const monthChung = w.flags.some((f) => f.startsWith('월지충'));
    const yeokma = [twelveSinsal(yb, w.pillar.branch), twelveSinsal(db, w.pillar.branch)].includes('역마살');
    if ((sanggwan || monthChung) && w.score < 45) {
      out.push({ w, kind: 'avoid', why: sanggwan ? '답답함이 커져 충동적으로 사표를 내기 쉬운 달이에요. 결정은 다음 달로 미루세요.' : '직장 자리가 흔들리지만 운의 뒷받침이 약한 달이에요. 큰 결정은 피하세요.' });
    } else if (w.score < 38) {
      out.push({ w, kind: 'avoid', why: '운의 힘이 가장 약한 달이에요. 면접·협상보다 쉬면서 준비하는 데 쓰세요.' });
    } else if (w.score >= 55 && (groups.includes('관성') || groups.includes('인성') || groups.includes('식상') || monthChung || yeokma)) {
      const why = groups.includes('관성')
        ? '자리와 책임의 기운이 들어오는 달이에요. 면접·제안·승진 이야기를 꺼내기 좋아요.'
        : groups.includes('인성')
          ? '계약·서류·자격 일이 잘 풀리는 달이에요. 합격 발표나 계약서 정리에 좋아요.'
          : groups.includes('식상')
            ? '내 실력을 보여 주기 좋은 달이에요. 포트폴리오를 내거나 새 일을 시작해 보세요.'
            : '자리를 옮기는 일이 자연스럽게 생기는 달이에요. 들어온 제안을 가볍게 넘기지 마세요.';
      out.push({ w, kind: 'go', why });
    }
  }
  const pick = (k: MonthSign['kind']) =>
    out
      .filter((m) => m.kind === k)
      .sort((x, y) => (k === 'go' ? y.w.score - x.w.score : x.w.score - y.w.score))
      .slice(0, 3)
      .sort((x, y) => x.w.startMs - y.w.startMs);
  return [...pick('go'), ...pick('avoid')];
}

export function careerConcern(a: SajuAnalysis, report: Report, months: Wolun[]): CareerConcern | null {
  const sec = report.sections.find((s) => s.id === 'career');
  const tl = sec?.timeline?.items ?? [];
  if (!sec || !tl.length) return null;
  const [t, next] = [tl[0], tl[1] ?? null];
  const { stance, answer } = decide(t, next);

  // 이유 하나 — 올해 들어온 기운 중 가장 뚜렷한 것
  const p = plainOf(t.notes);
  const why = p
    ? { text: `${p.text} 그리고 ${powerWord(t.score)}이에요.`, basis: `${t.year}년 ${t.pillar} · ${p.note.split(':')[0]} · 운의 힘 ${t.score}` }
    : {
        text: `올해는 일에 큰 변화를 부르는 기운이 약하고, ${powerWord(t.score)}이에요. ${t.score >= 55 ? '지금 자리에서 쌓은 것이 인정받기 쉬운 흐름이에요.' : '무리하게 판을 바꾸기보다 다음 기회를 준비하는 흐름이에요.'}`,
        basis: `${t.year}년 ${t.pillar} · 운의 힘 ${t.score}`,
      };

  const future = tl.slice(1);
  const bestSig = future.find((x) => x.verdict === '이직 적기') ?? null;
  const best = bestSig?.year ?? null;
  const inYear = best !== null && best === tl[1]?.year;
  const teaser =
    stance === 'move'
      ? '올해 안에서도 특히 좋은 달과 피해야 할 달이 있어요.'
      : best
        ? `옮기기 가장 좋은 해는 ${best}년이에요. ${inYear ? '그중 어느 달이 좋은지' : '그때까지 무엇을 준비할지'}는 상세 리포트에서 볼 수 있어요.`
        : '앞으로 10년 중 변화와 좋은 운이 겹치는 해는 뚜렷하지 않아요. 그래서 이직은 운보다 조건으로 정하는 게 맞아요.';

  const aptitude = sec.blocks.find((b) => b.heading === '적성과 맞는 분야')?.items ?? [];
  const style = sec.blocks.find((b) => b.heading === '일하는 방식과 직장 리스크')?.items ?? [];
  const fit = [aptitude[1], style[0], aptitude[2]].filter(Boolean) as Statement[];
  const risks = style.slice(1);

  let job: CareerConcern['job'] = null;
  if (a.input.job) {
    const j = analyzeJob(a, report, a.input.job);
    if (j.fit) job = { label: j.fit.label, score: j.fit.score, field: j.category.id === 'other' ? a.input.job : j.category.label };
  }

  // 남는다면 / 옮긴다면
  const gp = a.elements.groupPercent;
  const org = gp['관성'] + gp['인성'] >= gp['식상'] + gp['비겁'];
  const stay: string[] = [];
  if (t.notes.some((n) => n.startsWith('관성운'))) stay.push('자리와 책임이 들어오는 해예요. 맡은 일을 숫자와 결과로 정리해 평가 때 보여 주세요.');
  if (t.notes.some((n) => n.startsWith('인성운'))) stay.push('자격증·교육·사내 과정처럼 ‘증명’이 되는 것을 하나 마무리하세요.');
  if (t.notes.some((n) => /^(상관운|식신운)/.test(n))) stay.push('회사 안에서 새 프로젝트나 역할을 먼저 제안해 보세요. 옮기지 않고도 답답함이 풀릴 수 있어요.');
  if (stance === 'hold') stay.push('운이 약한 해에는 큰 성과보다 ‘실수 없는 해’를 목표로 잡으세요. 버틴 기록이 다음 기회에서 신뢰가 돼요.');
  if (stance === 'prepare') stay.push(best ? `${best}년을 옮길 해로 정해 두고, 그때 내밀 경력과 자격을 거꾸로 계산해 준비하세요.` : '옮길지 말지보다 ‘어떤 조건이면 옮길지’를 먼저 적어 두세요. 조건이 맞는 제안이 올 때 바로 움직일 수 있어요.');
  if (stance === 'move') stay.push('옮기기 좋은 해지만, 남는다면 받은 제안을 ‘조건을 바꿔 달라’는 협상 카드로 써 보세요. 다른 곳에서 찾는다는 사실만으로 협상력이 생겨요.');
  if (stance === 'stay') stay.push('지금 자리에서 인정받기 좋은 해예요. 평가 시기 전에 성과를 먼저 말하는 쪽이 이겨요.');
  stay.push('지금 하는 일에서 ‘내가 만든 결과’ 세 가지를 문장으로 적어 두세요. 남든 옮기든 다음 평가와 이력서의 뼈대가 돼요.');
  const ys = a.yongsin.yongsin;
  const gs = a.yongsin.gisin;
  const move = [
    tl.some((x) => x.verdict === '충동 이직 주의') || stance === 'hold' ? '다음 자리가 확정되기 전에는 사표를 내지 마세요. 이 사주는 운이 약할 때의 퇴사가 후회로 남기 쉬워요.' : '다음 자리가 확정된 뒤에 알리세요. 좋은 해에도 순서가 바뀌면 손해가 커요.',
    org ? '직급과 체계가 분명한 곳에서 더 빨리 인정받는 사주예요. 회사 규모보다 평가 기준이 분명한지를 먼저 보세요.' : '재량이 크고 성과로 평가받는 자리에서 힘을 쓰는 사주예요. 면접에서 내가 정할 수 있는 범위를 꼭 물어보세요.',
    `${ELEMENT_JOBS[ys].slice(0, 3).join('·')} 쪽 업종이면 같은 직무라도 덜 지치고 오래 버텨요.`,
    `${ELEMENT_JOBS[gs].slice(0, 3).join('·')} 쪽은 성과에 비해 소모가 큰 편이에요. 이 업종이라면 연봉보다 업무량을 먼저 확인하세요.`,
    '면접·연봉 협상은 위의 좋은 달에, 계약서 서명은 피할 달을 지나서 하세요.',
  ];

  return {
    stance,
    answer,
    why,
    thisYear: t,
    nextYear: next,
    best,
    teaser,
    fit,
    job,
    months: monthSigns(a, months),
    timeline: tl,
    stay: stay.slice(0, 3),
    move,
    risks,
    story: sec.story ?? [],
  };
}
