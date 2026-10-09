/**
 * 고민 리포트 — '나는 어떤 사람인가'가 아니라 '내 고민은 언제, 어떻게'에 답한다.
 * 다섯 고민(이직·진로, 연애·결혼, 돈, 시험·합격, 올해 운세)이 모두 같은 모양(ConcernReport)이다.
 *  - 무료: 한 줄 답 · 지금 어디쯤인지(네 칸) · 이유 하나 · 올해와 내년 신호 · 나에 대한 풀이 몇 줄
 *  - 상세(유료 예정): 앞으로 12개월 좋은 달·조심할 달, 10년 신호, 지금 할 일, 그 고민에 맞춘 개운법, 더 깊은 풀이
 *  - 개운법은 무료 부분에 한 가지만 맛보기로 보여 준다
 * 재료는 풀이 리포트의 섹션(연도별 신호·블록·이야기)과 월운·세운에서 가져오고, 답을 정하는 부분만 새로 계산한다.
 * 시험·합격은 풀이 리포트에 섹션이 없어 연도별 신호부터 여기서 계산한다.
 */
import { pillarHanja, type SajuAnalysis, type Seun, type Wolun } from '../engine/index.ts';
import { josa } from '../engine/josa.ts';
import { isMunchangBranch, isNobleBranch, twelveSinsal } from '../engine/sinsal.ts';
import { groupOf, type TenGodGroup } from '../engine/tenGods.ts';
import { TIMING, type ConcernId } from './concernList.ts';
import { concernGaeun, type ConcernGaeun } from './gaeun.ts';
import type { Report, ReportSection, Statement, Tone, YearSignal } from './generate.ts';
import { analyzeJob } from './job.ts';
import { ELEMENT_JOBS } from './kb.ts';
import { readLuck } from './luckReading.ts';
import { seasonOf } from './season.ts';
import type { StoryPara } from './story.ts';
import { DECADE_THEME } from './storyKb.ts';
import { ttiOf, type TtiYear } from './tti.ts';

// ---------------------------------------------------------------------------
// 모양
// ---------------------------------------------------------------------------
export interface MonthSign {
  w: Wolun;
  kind: 'go' | 'avoid';
  why: string;
}

export interface MonthRow {
  w: Wolun;
  tag: string;
  tone: Tone;
  text: string;
  now: boolean;
  past: boolean;
}

export interface ConcernReport {
  id: ConcernId;
  ask: string;
  /** 한 줄 답 */
  answer: string;
  /** 지금 어디쯤인지 — 네 칸 중 stance번째 */
  stances: string[];
  stance: number;
  why: { text: string; basis: string };
  signals: { label: string; y: YearSignal }[];
  /** 무료 부분 끝 — 상세가 궁금해지는 한 줄 */
  teaser: string;
  /** labels가 있으면 각 줄 앞에 붙이는 꼬리표 (예: 좋아요 · 조심) */
  free: { title: string; note?: string; items: Statement[]; labels?: string[] };
  detail: {
    title: string;
    /** 잠겼을 때 보여 줄 목록 */
    items: string[];
    months?: { title: string; desc: string; goLabel: string; avoidLabel: string; list: MonthSign[]; noGo: string; noAvoid: string };
    calendar?: { title: string; desc: string; rows: MonthRow[] };
    fields?: { title: string; desc: string; rows: { label: string; y: YearSignal }[] };
    timeline?: { title: string; desc: string; items: YearSignal[] };
    lists: { title: string; items: string[]; numbered?: boolean }[];
    statements: { title: string; items: Statement[] }[];
    story?: { title: string; desc: string; paras: StoryPara[] };
  };
  /** 판단을 대신하지 않는다는 안내 (돈·시험) */
  notice?: string;
  /** 이 고민에 맞춘 개운법 — taste 하나는 무료, 나머지는 상세 */
  gaeun?: ConcernGaeun;
}

export type LoveStatus = 'single' | 'dating' | 'married';
export const LOVE_STATUS_LABEL: Record<LoveStatus, string> = { single: '혼자예요', dating: '만나는 사람이 있어요', married: '결혼했어요' };

export interface ConcernOptions {
  love?: LoveStatus;
  /** 시험이 있는 달 (예: { year: 2027, month: 3 }) */
  exam?: { year: number; month: number } | null;
}

// ---------------------------------------------------------------------------
// 공통 도구
// ---------------------------------------------------------------------------
const S = (text: string, tone: Tone, evidence?: string): Statement => ({ text, tone, evidence });
const sectionOf = (r: Report, id: string): ReportSection | undefined => r.sections.find((s) => s.id === id);
const blockOf = (sec: ReportSection | undefined, heading: string): Statement[] => sec?.blocks.find((b) => b.heading.startsWith(heading))?.items ?? [];
const powerWord = (score: number) => (score >= 60 ? '운의 힘도 좋은 편' : score >= 45 ? '운의 힘은 보통' : '운의 힘은 약한 편');

/**
 * 때를 읽는 풀이 — 무료 풀이 리포트의 이야기에서 빼 둔 '시기' 문단만 상세(유료)에 싣는다.
 * 나머지 이야기는 무료에 그대로 있으므로 상세에 다시 넣지 않는다 (산 사람이 '본 내용'이라고 느끼지 않게).
 */
function timingStory(sec: ReportSection, desc: string): ConcernReport['detail']['story'] {
  const t = TIMING[sec.id];
  const paras = (sec.story ?? []).filter((p) => p.title === t?.para);
  return paras.length ? { title: '때를 읽는 풀이', desc, paras } : undefined;
}

/** 연도별 신호의 메모 → 쉬운 말. 셋째 값은 그 신호가 반가운지(+) 조심할 것인지(-) (표의 순서가 우선순위) */
type Plain = [RegExp, string, '+' | '-'];
function plainOf(notes: string[], table: Plain[]): { text: string; note: string; sign: '+' | '-' } | null {
  for (const [re, text, sign] of table) {
    const note = notes.find((n) => re.test(n));
    if (note) return { text, note, sign };
  }
  return null;
}

/**
 * 이유 한 줄 — 신호와 운의 힘이 같은 쪽이면 이어 말하고, 엇갈리면 '다만'으로 뒤집는다.
 * (반가운 신호인데 운의 힘이 약하면 답은 '조심' 쪽이므로, 이유도 그쪽으로 끝나야 앞뒤가 맞는다)
 */
interface Tails {
  /** 반가운 신호 + 약한 운 */
  weak: string;
  /** 조심할 신호 + 좋은 운 */
  strong: string;
}
function whyOf(t: YearSignal, table: Plain[], quiet: string, tails: Tails): { text: string; basis: string } {
  const p = plainOf(t.notes, table);
  if (!p) return { text: `${quiet} ${powerWord(t.score)}이에요.`, basis: `${t.year}년 ${t.pillar} · 운의 힘 ${t.score}` };
  const tail =
    p.sign === '+' && t.score < 45
      ? `다만 운의 힘이 약해 ${tails.weak}`
      : p.sign === '-' && t.score >= 60
        ? `다만 운의 힘은 좋은 편이라 ${tails.strong}`
        : p.sign === '+'
          ? t.score >= 60
            ? '운의 힘도 좋은 편이에요.'
            : '운의 힘은 보통이에요.'
          : t.score < 45
            ? '운의 힘도 약한 편이에요.'
            : '운의 힘은 보통이에요.';
  return { text: `${p.text} ${tail}`, basis: `${t.year}년 ${t.pillar} · ${p.note.split(':')[0]} · 운의 힘 ${t.score}` };
}

const signalsOf = (tl: YearSignal[]) => [{ label: '올해', y: tl[0] }, ...(tl[1] ? [{ label: '내년', y: tl[1] }] : [])];

/** 한 달의 기운 */
interface MonthCtx {
  w: Wolun;
  groups: TenGodGroup[];
  sanggwan: boolean;
  monthChung: boolean;
  dayChung: boolean;
  dayHap: boolean;
  dohwa: boolean;
  yeokma: boolean;
  noble: boolean;
  munchang: boolean;
}
function monthCtx(a: SajuAnalysis, w: Wolun): MonthCtx {
  const yb = a.pillars.year.branch;
  const db = a.pillars.day.branch;
  const ss = [twelveSinsal(yb, w.pillar.branch), twelveSinsal(db, w.pillar.branch)];
  return {
    w,
    groups: [groupOf(w.stemTenGod), groupOf(w.branchTenGod)],
    sanggwan: w.stemTenGod === '상관' || w.branchTenGod === '상관',
    monthChung: w.flags.some((f) => f.startsWith('월지충')),
    dayChung: w.flags.some((f) => f.startsWith('일지충')),
    dayHap: w.flags.some((f) => f.startsWith('일지합') || f.startsWith('일간합')),
    dohwa: ss.includes('연살'),
    yeokma: ss.includes('역마살'),
    noble: isNobleBranch(a.pillars.day.stem, w.pillar.branch),
    munchang: isMunchangBranch(a.pillars.day.stem, w.pillar.branch),
  };
}

/** 앞으로 12개월 중 좋은 달 3개 · 조심할 달 3개 (각각 운의 힘 순으로 고른 뒤 날짜순) */
function monthSigns(a: SajuAnalysis, months: Wolun[], rule: (c: MonthCtx) => Omit<MonthSign, 'w'> | null): MonthSign[] {
  const out = months.map((w) => {
    const r = rule(monthCtx(a, w));
    return r ? { ...r, w } : null;
  }).filter((x): x is MonthSign => x !== null);
  const pick = (k: MonthSign['kind']) =>
    out
      .filter((m) => m.kind === k)
      .sort((x, y) => (k === 'go' ? y.w.score - x.w.score : x.w.score - y.w.score))
      .slice(0, 3)
      .sort((x, y) => x.w.startMs - y.w.startMs);
  return [...pick('go'), ...pick('avoid')];
}

const lowMonth = (c: MonthCtx) => (c.w.score < 38 ? { kind: 'avoid' as const, why: '운의 힘이 가장 약한 달이에요. 큰 결정은 미루고 쉬면서 준비하는 데 쓰세요.' } : null);

/** 가장 좋은 해 — 앞으로 10년 중 (올해 제외) */
function bestYear(tl: YearSignal[], verdicts: string[]): number | null {
  const c = tl.slice(1).filter((x) => verdicts.includes(x.verdict));
  return c.length ? c.reduce((b, x) => (x.score > b.score ? x : b)).year : null;
}

// ---------------------------------------------------------------------------
// 이직·진로
// ---------------------------------------------------------------------------
const CAREER_PLAIN: Plain[] = [
  [/^월지충/, '들어오는 기운이 사주의 ‘직장 자리’(월지)를 정면으로 흔들어요. 내가 원하지 않아도 부서·역할·회사가 바뀌기 쉬운 때예요.', '+'],
  [/^상관견관/, '틀을 깨고 싶은 기운이 원래 있던 ‘규칙과 윗사람’ 기운과 부딪혀요. 감정이 앞서 사표를 던지기 쉬운 구조예요.', '-'],
  [/^상관운/, '틀을 깨고 싶은 기운(상관)이 들어와 지금 일이 답답하게 느껴지고, 윗사람과 부딪히기 쉬워요.', '-'],
  [/^식신운/, '새 일과 전문성을 넓히는 기운(식신)이 들어와 하고 싶은 일이 또렷해져요.', '+'],
  [/^관성운/, '자리와 책임을 뜻하는 기운(관성)이 들어와 승진·입사 기회가 오지만, 부담도 함께 커져요.', '+'],
  [/^인성운/, '자격·공부·계약을 돕는 기운(인성)이 들어와 준비해 둔 것이 인정받기 쉬워요.', '+'],
  [/^역마/, '이동의 별(역마)이 들어와 출장·전근·이사처럼 자리를 옮기는 일이 생기기 쉬워요.', '+'],
];
const CAREER_TAILS: Tails = { weak: '지금 판을 바꾸면 손해 보기 쉬워요.', strong: '감정만 다스리면 오히려 기회가 돼요.' };
export const CAREER_STANCES = ['움직일 때', '준비할 때', '지킬 때', '버틸 때'];

function careerReport(a: SajuAnalysis, report: Report, months: Wolun[]): ConcernReport | null {
  const sec = sectionOf(report, 'career');
  const tl = sec?.timeline?.items ?? [];
  if (!sec || !tl.length) return null;
  const t = tl[0];
  const next = tl[1] ?? null;
  // 0 움직일 · 1 준비할 · 2 지킬 · 3 버틸
  let stance: number;
  let answer: string;
  switch (t.verdict) {
    case '이직 적기':
      [stance, answer] = [0, '지금은 움직여도 좋은 때예요'];
      break;
    case '충동 이직 주의':
      [stance, answer] = [3, '옮기고 싶어도 지금은 버틸 때예요'];
      break;
    case '승진·인정':
    case '성과 유리':
      [stance, answer] = [2, '옮기기보다 지금 자리에서 성과를 낼 때예요'];
      break;
    case '버티며 준비':
      [stance, answer] = [3, '지금은 힘을 아끼며 버틸 때예요'];
      break;
    default:
      [stance, answer] = [1, next?.verdict === '이직 적기' ? '지금은 내년을 위해 준비할 때예요' : '지금은 옮기기보다 준비할 때예요'];
  }
  const why = whyOf(t, CAREER_PLAIN, `올해는 일에 큰 변화를 부르는 기운이 약하고, ${t.score >= 55 ? '지금 자리에서 쌓은 것이 인정받기 쉬운 흐름이에요. 그리고' : '무리하게 판을 바꾸기보다 다음 기회를 준비하는 흐름이에요. 그리고'}`, CAREER_TAILS);
  const best = bestYear(tl, ['이직 적기']);
  const teaser =
    stance === 0
      ? '올해 안에서도 특히 좋은 달과 피해야 할 달이 있어요.'
      : best
        ? `옮기기 가장 좋은 해는 ${best}년이에요. ${best === next?.year ? '그중 어느 달이 좋은지' : '그때까지 무엇을 준비할지'}는 상세 리포트에서 볼 수 있어요.`
        : '앞으로 10년 중 변화와 좋은 운이 겹치는 해는 뚜렷하지 않아요. 그래서 이직은 운보다 조건으로 정하는 게 맞아요.';

  const aptitude = blockOf(sec, '적성과 맞는 분야');
  const style = blockOf(sec, '일하는 방식과 직장 리스크');
  let note: string | undefined;
  if (a.input.job) {
    const j = analyzeJob(a, report, a.input.job);
    if (j.fit) note = `지금 하는 일 ${j.category.id === 'other' ? a.input.job : j.category.label} · 사주와 ${j.fit.label} (${j.fit.score}점)`;
  }

  const gp = a.elements.groupPercent;
  const org = gp['관성'] + gp['인성'] >= gp['식상'] + gp['비겁'];
  const stay: string[] = [];
  if (t.notes.some((n) => n.startsWith('관성운'))) stay.push('자리와 책임이 들어오는 해예요. 맡은 일을 숫자와 결과로 정리해 평가 때 보여 주세요.');
  if (t.notes.some((n) => n.startsWith('인성운'))) stay.push('자격증·교육·사내 과정처럼 ‘증명’이 되는 것을 하나 마무리하세요.');
  if (t.notes.some((n) => /^(상관운|식신운)/.test(n))) stay.push('회사 안에서 새 프로젝트나 역할을 먼저 제안해 보세요. 옮기지 않고도 답답함이 풀릴 수 있어요.');
  if (stance === 0) stay.push('옮기기 좋은 해지만, 남는다면 받은 제안을 ‘조건을 바꿔 달라’는 협상 카드로 써 보세요. 다른 곳에서 찾는다는 사실만으로 협상력이 생겨요.');
  if (stance === 3) stay.push('운이 약한 해에는 큰 성과보다 ‘실수 없는 해’를 목표로 잡으세요. 버틴 기록이 다음 기회에서 신뢰가 돼요.');
  if (stance === 1) stay.push(best ? `${best}년을 옮길 해로 정해 두고, 그때 내밀 경력과 자격을 거꾸로 계산해 준비하세요.` : '옮길지 말지보다 ‘어떤 조건이면 옮길지’를 먼저 적어 두세요. 조건이 맞는 제안이 올 때 바로 움직일 수 있어요.');
  if (stance === 2) stay.push('지금 자리에서 인정받기 좋은 해예요. 평가 시기 전에 성과를 먼저 말하는 쪽이 이겨요.');
  stay.push('지금 하는 일에서 ‘내가 만든 결과’ 세 가지를 문장으로 적어 두세요. 남든 옮기든 다음 평가와 이력서의 뼈대가 돼요.');
  const move = [
    tl.some((x) => x.verdict === '충동 이직 주의') || stance === 3 ? '다음 자리가 확정되기 전에는 사표를 내지 마세요. 이 사주는 운이 약할 때의 퇴사가 후회로 남기 쉬워요.' : '다음 자리가 확정된 뒤에 알리세요. 좋은 해에도 순서가 바뀌면 손해가 커요.',
    org ? '직급과 체계가 분명한 곳에서 더 빨리 인정받는 사주예요. 회사 규모보다 평가 기준이 분명한지를 먼저 보세요.' : '재량이 크고 성과로 평가받는 자리에서 힘을 쓰는 사주예요. 면접에서 내가 정할 수 있는 범위를 꼭 물어보세요.',
    `${ELEMENT_JOBS[a.yongsin.yongsin].slice(0, 3).join('·')} 쪽 업종이면 같은 직무라도 덜 지치고 오래 버텨요.`,
    `${ELEMENT_JOBS[a.yongsin.gisin].slice(0, 3).join('·')} 쪽은 성과에 비해 소모가 큰 편이에요. 이 업종이라면 연봉보다 업무량을 먼저 확인하세요.`,
    '면접·연봉 협상은 위의 좋은 달에, 계약서 서명은 피할 달을 지나서 하세요.',
  ];

  return {
    id: 'career',
    gaeun: concernGaeun('career', a),
    ask: '지금 옮겨도 될까?',
    answer,
    stances: CAREER_STANCES,
    stance,
    why,
    signals: signalsOf(tl),
    teaser,
    free: { title: '나에게 맞는 일', note, items: [aptitude[1], style[0], aptitude[2]].filter(Boolean) },
    detail: {
      title: '이직·진로 상세 리포트',
      items: ['앞으로 12개월 — 좋은 달과 피할 달', '일이 풀리는 개운법 — 면접 날의 색, 잘 맞는 분야, 도와줄 사람', '앞으로 10년 이직 신호와 때를 읽는 풀이', '지금 회사에 남는다면 할 일', '옮긴다면 이것부터 (체크리스트)'],
      months: {
        title: '앞으로 12개월',
        desc: '면접·제안·협상을 언제 하면 좋은지, 언제 미뤄야 하는지예요.',
        goLabel: stance === 0 ? '움직이기 좋은 달' : '그래도 기회를 살펴볼 만한 달',
        avoidLabel: '피할 달',
        noGo: '앞으로 12개월 안에는 뚜렷하게 좋은 달이 없어요. 지금은 준비에 쓰는 게 나아요.',
        noAvoid: '앞으로 12개월 안에 특별히 피할 달은 없어요.',
        list: monthSigns(a, months, (c) => {
          if ((c.sanggwan || c.monthChung) && c.w.score < 45)
            return { kind: 'avoid', why: c.sanggwan ? '답답함이 커져 충동적으로 사표를 내기 쉬운 달이에요. 결정은 다음 달로 미루세요.' : '직장 자리가 흔들리지만 운의 뒷받침이 약한 달이에요. 큰 결정은 피하세요.' };
          if (c.w.score >= 55 && (c.groups.includes('관성') || c.groups.includes('인성') || c.groups.includes('식상') || c.monthChung || c.yeokma))
            return {
              kind: 'go',
              why: c.groups.includes('관성')
                ? '자리와 책임의 기운이 들어오는 달이에요. 면접·제안·승진 이야기를 꺼내기 좋아요.'
                : c.groups.includes('인성')
                  ? '계약·서류·자격 일이 잘 풀리는 달이에요. 합격 발표나 계약서 정리에 좋아요.'
                  : c.groups.includes('식상')
                    ? '내 실력을 보여 주기 좋은 달이에요. 포트폴리오를 내거나 새 일을 시작해 보세요.'
                    : '자리를 옮기는 일이 자연스럽게 생기는 달이에요. 들어온 제안을 가볍게 넘기지 마세요.',
            };
          return lowMonth(c);
        }),
      },
      timeline: { title: '앞으로 10년 이직 신호', desc: '해마다 들어오는 기운과 운의 힘을 함께 봤어요.', items: tl },
      lists: [
        { title: '지금 회사에 남는다면', items: stay.slice(0, 3) },
        { title: '옮긴다면 이것부터', items: move, numbered: true },
      ],
      statements: [],
      story: timingStory(sec, '옮기기 좋은 해와 버틸 해를 이야기로 풀었어요.'),
    },
  };
}

// ---------------------------------------------------------------------------
// 연애·결혼
// ---------------------------------------------------------------------------
export const LOVE_STANCES = ['가까워지는 때', '다지는 때', '쉬어 가는 때', '조심할 때'];

function lovePlain(male: boolean, spouseGroup: TenGodGroup): Plain[] {
  return [
    [/배우자궁 합/, '사주의 배우자 자리와 손잡는 기운이 들어와 관계가 맺어지고 깊어지기 쉬워요.', '+'],
    [new RegExp(`^${spouseGroup} 운`), `배우자를 뜻하는 기운(${spouseGroup})이 들어와 ${male ? '여성' : '남성'} 인연이 눈에 띄게 늘어요.`, '+'],
    [/배우자궁 충/, '배우자 자리를 흔드는 기운이 들어와 관계에 변동이 생기기 쉬워요. 새로 시작될 수도, 정리될 수도 있어요.', '-'],
    [/^도화운/, '끌림의 별(도화)이 들어와 이성의 관심을 받기 쉬워요.', '+'],
    [/^상관운/, '말이 날카로워지는 기운(상관)이 들어와 연인과 말다툼이 잦아지기 쉬워요.', '-'],
    [/^비겁운/, '경쟁과 지출의 기운(비겁)이 들어와 경쟁자가 생기거나 데이트 비용 문제로 다투기 쉬워요.', '-'],
  ];
}
const LOVE_TAILS: Tails = { weak: '서두른 만남은 오래가기 어려워요. 끌림보다 사람을 천천히 보세요.', strong: '말과 표현만 조심하면 잘 넘길 수 있어요.' };

const LOVE_ANSWER: Record<string, [number, Record<LoveStatus, string>]> = {
  '인연 강함': [0, { single: '올해는 인연이 들어오는 해예요', dating: '올해는 관계를 한 단계 정하기 좋은 해예요', married: '올해는 둘 사이가 더 깊어지는 해예요' }],
  '무난·호감': [1, { single: '올해는 만남을 넓히면 좋은 사람을 알아보기 쉬운 해예요', dating: '올해는 지금 관계를 차분히 다지기 좋은 해예요', married: '올해는 함께하는 시간을 늘리면 좋은 해예요' }],
  평이: [2, { single: '올해는 인연을 서두르기보다 나를 가꿀 때예요', dating: '올해는 큰 변화 없이 흘러가는 해예요', married: '올해는 무난하게 흘러가는 해예요' }],
  '변동 주의': [3, { single: '올해는 만남과 헤어짐이 빠르게 오가는 해예요', dating: '올해는 관계가 흔들리기 쉬워 조심할 때예요', married: '올해는 생활 변화가 둘 사이를 흔들기 쉬운 해예요' }],
  '갈등 주의': [3, { single: '올해는 서두른 만남이 상처로 남기 쉬운 해예요', dating: '올해는 작은 말다툼이 커지기 쉬운 해예요', married: '올해는 작은 말다툼이 커지기 쉬운 해예요' }],
};

function loveReport(a: SajuAnalysis, report: Report, months: Wolun[], status: LoveStatus): ConcernReport | null {
  const sec = sectionOf(report, 'love');
  const tl = sec?.timeline?.items ?? [];
  if (!sec || !tl.length) return null;
  const male = a.input.gender === 'male';
  const spouseGroup: TenGodGroup = male ? '재성' : '관성';
  const t = tl[0];
  const [stance, answers] = LOVE_ANSWER[t.verdict] ?? LOVE_ANSWER['평이'];
  const why = whyOf(t, lovePlain(male, spouseGroup), '올해는 연애에 큰 변화를 부르는 기운이 약하고,', LOVE_TAILS);
  const best = bestYear(tl, ['인연 강함']);
  const teaser =
    stance === 0
      ? '올해 안에서도 특히 좋은 달과 조심할 달이 있어요.'
      : best
        ? `인연 신호가 가장 강한 해는 ${best}년이에요. 어느 달이 좋은지, 그때까지 무엇을 하면 좋을지는 상세 리포트에서 볼 수 있어요.`
        : '앞으로 10년 중 인연 신호가 크게 몰리는 해는 뚜렷하지 않아요. 운을 기다리기보다 만남의 자리를 내가 만드는 쪽이 맞아요.';

  const style = blockOf(sec, '연애 스타일');
  const palace = blockOf(sec, '배우자 자리');
  const gp = a.elements.groupPercent;
  const noDohwa = !a.sinsal.some((x) => x.name === '도화살' || x.name === '홍염살');
  const spouseNone = gp[spouseGroup] < 5;

  const todo: string[] = [];
  if (status === 'single') {
    if (stance === 0) todo.push('올해 들어온 만남은 가볍게 넘기지 말고 세 번은 만나 보세요. 인연이 들어오는 해의 첫인상은 믿을 만해요.');
    if (stance === 3) todo.push('올해는 빨리 시작한 관계일수록 빨리 흔들려요. 사귀기로 정하기 전에 석 달은 지켜보세요.');
    todo.push(noDohwa ? '첫인상보다 오래 볼수록 좋아지는 타입이에요. 같은 사람을 여러 번 마주치는 모임(동호회·스터디·소개)을 고르세요.' : '매력이 잘 드러나는 사주라 만남은 쉽게 와요. 대신 끌림보다 생활이 맞는지를 먼저 보세요.');
    if (spouseNone) todo.push(`사주에 배우자를 뜻하는 기운(${spouseGroup})이 적어 인연이 늦게 오는 편이에요. 조급해하기보다 운이 들어오는 해(아래 10년 표)에 맞춰 움직이세요.`);
    if (male && gp['비겁'] >= 28) todo.push('연애에서 경쟁자가 생기기 쉬운 사주예요. 마음이 있으면 미루지 말고 먼저 표현하세요.');
  } else if (status === 'dating') {
    todo.push(stance === 0 ? '결혼이나 동거처럼 관계를 정하는 이야기는 아래의 좋은 달에 꺼내세요.' : '관계를 정하는 큰 이야기는 서두르지 말고, 좋은 달이 올 때까지 일상의 표현을 늘리세요.');
    todo.push('서운한 일은 그날 안에, 짧게라도 말하세요. 쌓아 둔 서운함이 이 관계의 가장 큰 적이에요.');
    if (gp['비겁'] >= 28 || gp['재성'] >= 30) todo.push('데이트 비용과 돈 쓰는 기준을 한 번 이야기해 두세요. 돈 문제가 다툼으로 번지기 쉬운 구조예요.');
  } else {
    todo.push(stance === 3 ? '이사·이직 같은 큰 결정은 둘이 함께, 천천히 내리세요. 생활의 변화가 관계를 흔들기 쉬운 해예요.' : '일 년에 한 번은 둘만의 시간을 따로 만드세요. 함께 있어도 대화는 줄기 쉬워요.');
    todo.push('서운한 건 쌓아 두지 말고 그날 짧게 말하세요. 작은 말이 큰 다툼이 되는 걸 막아 줘요.');
    if (!male && gp['식상'] >= 22 && gp['관성'] > 5) todo.push('바른말이 상대에게는 지적으로 들리기 쉬운 사주예요. 고칠 점보다 고마운 점을 먼저 말하세요.');
  }

  return {
    id: 'love',
    gaeun: concernGaeun('love', a, { love: status }),
    ask: '인연은 언제 올까?',
    answer: answers[status],
    stances: LOVE_STANCES,
    stance,
    why,
    signals: signalsOf(tl),
    teaser,
    free: { title: '나의 연애 스타일', items: [...style.slice(0, 2), palace[0]].filter(Boolean) },
    detail: {
      title: '연애·결혼 상세 리포트',
      items: [
        '앞으로 12개월 — 좋은 달과 조심할 달',
        status === 'single' ? '인연을 위한 개운법 — 만남의 장소, 잘 맞는 띠, 데이트 색' : `${status === 'dating' ? '관계를 다지는' : '부부를 위한'} 개운법 — 데이트 장소와 색, 함께 할 습관`,
        '앞으로 10년 연애·결혼 신호와 때를 읽는 풀이',
        '지금 할 일',
      ],
      months: {
        title: '앞으로 12개월',
        desc: status === 'single' ? '만남을 넓히기 좋은 달과 서두르면 안 되는 달이에요.' : '마음을 표현하고 약속을 정하기 좋은 달과 다툼을 조심할 달이에요.',
        goLabel: status === 'single' ? '인연을 만나기 좋은 달' : '관계를 다지기 좋은 달',
        avoidLabel: '조심할 달',
        noGo: '앞으로 12개월 안에는 뚜렷하게 좋은 달이 없어요. 지금은 나를 가꾸는 데 쓰세요.',
        noAvoid: '앞으로 12개월 안에 특별히 조심할 달은 없어요.',
        list: monthSigns(a, months, (c) => {
          if (c.dayChung) return { kind: 'avoid', why: '배우자 자리가 흔들리는 달이에요. 고백·이별 통보·큰 약속 같은 결정은 미루세요.' };
          if (((!male && c.sanggwan) || (male && c.groups.includes('비겁'))) && c.w.score < 46)
            return { kind: 'avoid', why: male ? '경쟁과 지출이 늘어 다투기 쉬운 달이에요. 돈 이야기는 다음 달로 미루세요.' : '말이 날카로워지기 쉬운 달이에요. 서운한 건 글보다 만나서 말하세요.' };
          if (c.w.score >= 52 && (c.dayHap || c.groups.includes(spouseGroup) || c.dohwa))
            return {
              kind: 'go',
              why: c.dayHap
                ? '배우자 자리와 손잡는 달이에요. 고백하거나 약속을 정하기 좋아요.'
                : c.groups.includes(spouseGroup)
                  ? status === 'single'
                    ? '이성 인연의 기운이 들어오는 달이에요. 소개나 모임에 나가 보세요.'
                    : '서로에게 마음이 쓰이는 달이에요. 표현을 아끼지 마세요.'
                  : '매력이 잘 드러나는 달이에요. 새로운 사람을 만나거나 분위기를 바꿔 보기 좋아요.',
            };
          return lowMonth(c);
        }),
      },
      timeline: { title: '앞으로 10년 연애·결혼 신호', desc: '배우자를 뜻하는 기운, 배우자 자리의 합과 충, 끌림의 별을 함께 봤어요.', items: tl },
      lists: [{ title: '지금 할 일', items: todo.slice(0, 3) }],
      statements: [],
      story: timingStory(sec, '인연이 강한 해와 흔들리는 해를 이야기로 풀었어요.'),
    },
  };
}

// ---------------------------------------------------------------------------
// 돈
// ---------------------------------------------------------------------------
export const MONEY_STANCES = ['늘릴 때', '모을 때', '지킬 때', '조일 때'];
const MONEY_ANSWER: Record<string, [number, string]> = {
  '재물 기회': [0, '올해는 돈의 흐름이 커지는 해예요'],
  무난: [1, '올해는 꾸준히 모으기 좋은 해예요'],
  '지출 관리': [2, '올해는 버는 것보다 새는 걸 막을 때예요'],
  '손재 주의': [3, '올해는 돈이 나가기 쉬워 지갑을 조일 때예요'],
};

function moneyReport(a: SajuAnalysis, report: Report, months: Wolun[]): ConcernReport | null {
  const sec = sectionOf(report, 'wealth');
  const tl = sec?.timeline?.items ?? [];
  if (!sec || !tl.length) return null;
  const t = tl[0];
  const [stance, answer] = MONEY_ANSWER[t.verdict] ?? MONEY_ANSWER['무난'];
  const gp = a.elements.groupPercent;
  const plain: Plain[] = [
    [/^비겁운: 손재/, '나와 비슷한 기운(비겁)이 들어와 사람을 통해 돈이 새기 쉬워요. 빌려주기와 보증은 피하세요.', '-'],
    [/^재성운/, '돈을 뜻하는 기운(재성)이 들어와 돈이 오가는 일이 많아져요.', '+'],
    [/^식상운/, '재능을 쓰는 기운(식상)이 들어와 내가 만든 결과가 돈으로 이어지기 쉬워요.', '+'],
    [/^비겁운/, '경쟁의 기운(비겁)이 들어와 기회도 있지만 쓰는 돈이 함께 늘어요.', '-'],
  ];
  const why = whyOf(t, plain, '올해는 돈의 흐름을 크게 바꾸는 기운이 약하고,', { weak: '들어오는 만큼 나가기 쉬워요. 버는 것보다 지키는 게 먼저예요.', strong: '지출만 관리하면 괜찮아요.' });
  const best = bestYear(tl, ['재물 기회']);
  const teaser =
    stance === 0
      ? '돈이 들어오는 달과 새기 쉬운 달은 올해 안에서도 갈려요.'
      : best
        ? `돈의 흐름이 가장 커지는 해는 ${best}년이에요. 그때를 위해 지금 무엇을 해 둘지는 상세 리포트에서 볼 수 있어요.`
        : '앞으로 10년 중 돈의 흐름이 크게 몰리는 해는 뚜렷하지 않아요. 한 번에 버는 것보다 새지 않게 하는 구조가 답이에요.';

  const vessel = blockOf(sec, '재물 그릇');
  const route = blockOf(sec, '돈이 들어오는 방식');
  const todo = [
    [
      '좋은 해에 들어온 돈은 30%를 바로 떼어 두세요. 다음에 올 조이는 해의 방패가 돼요.',
      '월급날 저축이 먼저 빠져나가게 자동이체를 걸어 두세요. 모으기 좋은 해에는 구조가 곧 결과예요.',
      '구독·보험·통신비 같은 고정비를 한 번 정리하세요. 새는 걸 막는 것만으로 한 해가 달라져요.',
      '큰 지출과 새 투자는 내년으로 미루고, 생활비 석 달 치 비상금부터 채우세요.',
    ][stance],
  ];
  if (gp['비겁'] >= 28) todo.push('지인과의 돈거래·보증·동업은 하지 마세요. 이 사주에서 가장 확실한 손재 경로예요.');
  if (gp['식상'] >= 15 && gp['재성'] >= 12) todo.push('내 재능을 상품으로 만들 때 돈이 붙는 사주예요. 부업이나 작업물의 가격을 정해 보세요.');
  todo.push('투자는 잃어도 생활이 흔들리지 않는 돈으로만 하세요.');

  return {
    id: 'money',
    gaeun: concernGaeun('money', a),
    ask: '돈은 언제 모일까?',
    answer,
    stances: MONEY_STANCES,
    stance,
    why,
    signals: signalsOf(tl),
    teaser,
    free: { title: '돈이 들어오는 방식', items: [vessel[0], ...route.slice(0, 2)].filter(Boolean) },
    detail: {
      title: '돈 상세 리포트',
      items: ['앞으로 12개월 — 돈이 들어오는 달과 새기 쉬운 달', '돈이 머무는 개운법 — 나에게 맞는 돈 버는 길, 지갑 색, 자동이체 날짜', '앞으로 10년 재물 흐름과 때를 읽는 풀이', '올해 돈 관리 할 일'],
      months: {
        title: '앞으로 12개월',
        desc: '정산·협상·판매를 하기 좋은 달과 큰 지출을 미뤄야 할 달이에요.',
        goLabel: '돈이 들어오기 좋은 달',
        avoidLabel: '새기 쉬운 달',
        noGo: '앞으로 12개월 안에는 뚜렷하게 좋은 달이 없어요. 늘리기보다 지키는 데 집중하세요.',
        noAvoid: '앞으로 12개월 안에 특별히 조심할 달은 없어요.',
        list: monthSigns(a, months, (c) => {
          if (c.groups.includes('비겁') && c.w.score < 48) return { kind: 'avoid', why: '사람을 통해 돈이 새기 쉬운 달이에요. 빌려주기·보증·동업 제안은 거절하세요.' };
          if (c.groups.includes('재성') && c.w.score < 45) return { kind: 'avoid', why: '돈 욕심이 화를 부르기 쉬운 달이에요. 단기 투자와 충동구매를 쉬세요.' };
          if (c.w.score >= 55 && (c.groups.includes('재성') || (c.groups.includes('식상') && gp['재성'] > 5)))
            return {
              kind: 'go',
              why: c.groups.includes('재성') ? '돈이 움직이는 달이에요. 미뤄 둔 정산·협상·판매를 이때 하세요.' : '내 재능이 돈이 되는 달이에요. 부업이나 작업물을 내놓기 좋아요.',
            };
          return lowMonth(c);
        }),
      },
      timeline: { title: '앞으로 10년 재물 흐름', desc: '돈의 기운(재성)과 경쟁·지출의 기운(비겁), 재능의 기운(식상)을 함께 봤어요.', items: tl },
      lists: [{ title: '올해 돈 관리 할 일', items: todo.slice(0, 4) }],
      statements: [],
      story: timingStory(sec, '돈이 들어오는 해와 새는 해를 이야기로 풀었어요.'),
    },
    notice: '사주는 돈의 흐름을 보는 참고일 뿐, 투자 판단을 대신하지 않아요. 큰돈이 드는 결정은 꼭 전문가와 상의하세요.',
  };
}

// ---------------------------------------------------------------------------
// 시험·합격 — 풀이 리포트에 섹션이 없어 연도별 신호를 여기서 계산한다
//  인성 = 공부·문서·합격증, 관성 = 합격·자리, 둘이 함께 들어오면(관인상생) 합격의 대표 신호
//  식상 = 실력 발휘(면접·실기), 재성 = 현실 일로 공부가 흐트러짐(재극인), 문창귀인 = 시험·글재주의 별
// ---------------------------------------------------------------------------
export const EXAM_STANCES = ['도전할 때', '실력을 보일 때', '쌓을 때', '버틸 때'];

export function examTimeline(a: SajuAnalysis): YearSignal[] {
  const from = new Date(a.now).getUTCFullYear();
  const natalInsung = a.elements.groupPercent['인성'] > 5;
  const hasJeonggwan = a.positions.some((p) => p.stemTenGod === '정관' || p.branchTenGod === '정관');
  return a.seun
    .filter((s) => s.year >= from)
    .slice(0, 10)
    .map((s: Seun) => {
      const g = [groupOf(s.stemTenGod), groupOf(s.branchTenGod)];
      const notes: string[] = [];
      let sc = s.combined;
      const insung = g.includes('인성');
      const gwan = g.includes('관성');
      if (insung && gwan) {
        notes.push('관인상생: 합격의 대표 신호');
        sc += 12;
      } else if (insung) {
        notes.push('인성운: 공부·자격·문서가 잘 풀림');
        sc += 8;
      } else if (gwan) {
        notes.push('관성운: 합격·자리·인정');
        sc += 5;
      }
      if (isMunchangBranch(a.pillars.day.stem, s.pillar.branch)) {
        notes.push('문창귀인: 시험·글재주의 별');
        sc += 4;
      }
      if (g.includes('식상')) {
        notes.push('식상운: 실력 발휘(면접·실기·논술)');
        sc += 2;
      }
      if (g.includes('재성') && natalInsung) {
        notes.push('재성운: 돈·연애·일 때문에 공부가 흐트러지기 쉬움');
        sc -= 6;
      }
      if (s.flags.some((f) => f.startsWith('월지충'))) {
        notes.push('월지충: 환경 변화로 공부 리듬이 흔들림');
        sc -= 3;
      }
      if ((s.stemTenGod === '상관' || s.branchTenGod === '상관') && hasJeonggwan) {
        notes.push('상관견관: 면접에서 말실수 주의');
        sc -= 2;
      }
      if (isNobleBranch(a.pillars.day.stem, s.pillar.branch)) {
        notes.push('천을귀인: 도와주는 사람');
        sc += 3;
      }
      sc = Math.max(5, Math.min(95, Math.round(sc)));
      const strong = insung || gwan || notes.some((n) => n.startsWith('문창'));
      const verdict = sc >= 65 && strong ? '합격운 강함' : sc >= 58 ? '실력 발휘' : sc >= 45 ? '꾸준히' : '흔들림 주의';
      const tone: Tone = verdict === '흔들림 주의' ? 'negative' : verdict === '꾸준히' ? 'neutral' : 'positive';
      return { year: s.year, pillar: pillarHanja(s.pillar), score: sc, verdict, tone, notes };
    });
}

/** 공부법 — 가장 센 기운과 힘의 세기로 */
function studyStyle(a: SajuAnalysis): Statement[] {
  const gp = a.elements.groupPercent;
  const top = (Object.keys(gp) as TenGodGroup[]).sort((x, y) => gp[y] - gp[x])[0];
  const TOP: Record<TenGodGroup, string> = {
    비겁: '혼자보다 경쟁 상대가 있을 때 힘이 나는 타입이에요. 스터디나 모의고사 순위처럼 비교할 대상을 두세요.',
    식상: '말로 설명하고 써 보며 익힐 때 오래 남는 타입이에요. 배운 걸 남에게 설명하듯 정리해 보세요.',
    재성: '효율을 따지는 타입이라 기출 위주의 실전 공부가 잘 맞아요. 범위를 좁혀 점수가 나는 곳부터 잡으세요.',
    관성: '계획과 마감이 있을 때 강한 타입이에요. 날짜별 계획표를 만들고 지키는 것만으로 성적이 올라요.',
    인성: '이해해야 외워지는 타입이에요. 개념을 먼저 잡고 문제로 넘어가세요. 다만 준비만 길어지지 않게 시험 날짜부터 정하세요.',
  };
  const out: Statement[] = [S(TOP[top], 'neutral', `가장 센 기운 ${top} ${gp[top].toFixed(0)}%`)];
  const strong = a.strength.score >= 50;
  out.push(
    S(
      strong ? '체력이 버텨 주는 편이라 몰아서 하는 공부도 견뎌요. 대신 쉬는 날을 미리 정해 두세요.' : '몰아서 하면 쉽게 지쳐요. 매일 같은 시간에 짧게라도 꾸준히 하는 쪽이 이겨요.',
      'neutral',
      `${a.strength.level} ${a.strength.score.toFixed(0)}%`,
    ),
  );
  if (gp['인성'] < 8) out.push(S('사주에 공부의 기운(인성)이 적어 혼자 하면 흐름이 끊기기 쉬워요. 학원·인강·스터디처럼 틀이 있는 환경을 빌리세요.', 'caution', `인성 ${gp['인성'].toFixed(0)}%`));
  else if (gp['인성'] >= 35) out.push(S('공부의 기운이 강해 배우는 건 빠르지만, 준비만 하다 시험을 미루기 쉬워요. 시험 날짜를 먼저 정하세요.', 'caution', `인성 ${gp['인성'].toFixed(0)}%`));
  if (a.sinsal.some((x) => x.name === '문창귀인')) out.push(S('사주에 문창귀인이 있어 시험과 글쓰기에 강한 편이에요. 공부한 만큼 점수가 나오는 사주예요.', 'positive', '문창귀인'));
  return out;
}

/** 공부를 방해하는 것 */
function studyRisks(a: SajuAnalysis): Statement[] {
  const gp = a.elements.groupPercent;
  const out: Statement[] = [];
  if (gp['재성'] >= 28 && gp['인성'] < 15) out.push(S('돈·연애·일 같은 현실적인 일이 공부를 자주 끊는 구조예요(재극인). 공부하는 기간에는 약속과 아르바이트를 줄이세요.', 'negative', `재성 ${gp['재성'].toFixed(0)}% · 인성 ${gp['인성'].toFixed(0)}%`));
  if (gp['식상'] >= 30) out.push(S('관심사가 많아 시험 범위 밖으로 새기 쉬워요. 공부 시간에는 휴대폰을 다른 방에 두세요.', 'caution', `식상 ${gp['식상'].toFixed(0)}%`));
  if (gp['비겁'] >= 30) out.push(S('내 방식을 고집하다 정체되기 쉬워요. 점수가 멈추면 공부법부터 바꿔 보세요.', 'caution', `비겁 ${gp['비겁'].toFixed(0)}%`));
  if (gp['관성'] >= 30 && a.strength.score < 50) out.push(S('시험 압박을 크게 느끼는 사주라 당일 긴장이 커요. 모의고사를 실제 시험처럼 여러 번 치러 보세요.', 'caution', `관성 ${gp['관성'].toFixed(0)}% · ${a.strength.level}`));
  return out;
}

/** 시험이 있는 달 하나 */
export function examMonthOf(a: SajuAnalysis, ym: { year: number; month: number }): { ok: true; w: Wolun; tag: string; tone: Tone; text: string; basis: string } | { ok: false; text: string } {
  const at = Date.UTC(ym.year, ym.month - 1, 15);
  const i = a.wolun.findIndex((w, k) => w.startMs <= at && (a.wolun[k + 1]?.startMs ?? Infinity) > at);
  const last = a.wolun[a.wolun.length - 1];
  if (i < 0 || !a.wolun[i + 1]) {
    const end = new Date(last.startMs);
    return { ok: false, text: `지금은 ${end.getUTCFullYear()}년 ${end.getUTCMonth() + 1}월까지의 달만 볼 수 있어요. 그 뒤라면 아래 10년 신호에서 그해 흐름을 참고하세요.` };
  }
  const w = a.wolun[i];
  const c = monthCtx(a, w);
  const plus: string[] = [];
  const minus: string[] = [];
  if (c.groups.includes('인성') && c.groups.includes('관성')) plus.push('합격의 대표 신호(관인상생)가 들어와요');
  else if (c.groups.includes('인성')) plus.push('공부·문서의 기운(인성)이 도와줘요');
  else if (c.groups.includes('관성')) plus.push('합격·인정의 기운(관성)이 들어와요');
  if (c.munchang) plus.push('시험의 별(문창귀인)이 뜨는 달이에요');
  if (c.noble) plus.push('도와주는 사람(천을귀인)의 기운이 있어요');
  if (c.groups.includes('식상')) plus.push('면접·실기에서 실력이 잘 드러나요');
  if (c.groups.includes('재성') && a.elements.groupPercent['인성'] > 5) minus.push('현실 일로 집중이 흐트러지기 쉬워요');
  if (c.monthChung) minus.push('환경이 바뀌어 리듬이 깨지기 쉬워요');
  if (c.sanggwan) minus.push('면접에서 말이 앞서기 쉬워요');
  const score = w.score + plus.length * 4 - minus.length * 4;
  const [tag, tone]: [string, Tone] = score >= 58 ? ['든든한 달', 'positive'] : score >= 44 ? ['무난한 달', 'neutral'] : ['긴장할 달', 'negative'];
  const parts = [...plus, ...minus];
  const text = `${parts.length ? `${parts.join(', ')}. ` : ''}${
    tone === 'positive'
      ? '준비한 만큼 결과가 나오기 좋은 달이에요. 마지막 한 달은 새로운 것보다 실전 연습에 쓰세요.'
      : tone === 'neutral'
        ? '운이 크게 돕지도 막지도 않는 달이에요. 결국 준비한 만큼이에요.'
        : '운의 뒷받침이 약한 달이라 실수가 나오기 쉬워요. 한 달 전부터 실전처럼 연습하고, 시험 주에는 새로운 걸 보지 마세요.'
  }`;
  return { ok: true, w, tag, tone, text, basis: `${w.jieName}부터 · ${pillarHanja(w.pillar)} · 운의 힘 ${w.score}` };
}

function examReport(a: SajuAnalysis, months: Wolun[]): ConcernReport {
  const tl = examTimeline(a);
  const t = tl[0];
  const map: Record<string, [number, string]> = {
    '합격운 강함': [0, '올해는 시험운이 강하게 들어오는 해예요'],
    '실력 발휘': [1, '올해는 준비한 만큼 실력이 나오는 해예요'],
    꾸준히: [2, '올해는 결과보다 실력을 쌓을 때예요'],
    '흔들림 주의': [3, '올해는 공부 리듬이 흔들리기 쉬워 버틸 때예요'],
  };
  const [stance, answer] = map[t.verdict];
  const plain: Plain[] = [
    [/^관인상생/, '합격과 공부의 기운(관성·인성)이 함께 들어와요. 전통적으로 합격의 대표 신호로 보는 흐름이에요.', '+'],
    [/^인성운/, '공부·자격·문서를 돕는 기운(인성)이 들어와 공부한 것이 잘 남고 서류 일이 잘 풀려요.', '+'],
    [/^관성운/, '합격·자리를 뜻하는 기운(관성)이 들어와 시험과 평가에서 인정받기 쉬워요.', '+'],
    [/^문창귀인/, '시험과 글재주의 별(문창귀인)이 들어오는 해예요.', '+'],
    [/^재성운/, '돈·연애·일 같은 현실의 기운(재성)이 공부의 기운을 누르는 해예요. 집중이 자주 끊기기 쉬워요.', '-'],
    [/^월지충/, '생활 환경을 흔드는 기운이 들어와 공부 장소나 일정이 바뀌기 쉬워요.', '-'],
    [/^식상운/, '실력을 밖으로 드러내는 기운(식상)이 들어와 면접·실기·논술에서 힘을 써요.', '+'],
  ];
  const why = whyOf(t, plain, '올해는 시험에 크게 작용하는 기운이 약하고,', { weak: '컨디션과 공부 리듬을 지키는 게 먼저예요.', strong: '리듬만 지키면 충분히 이겨 낼 수 있어요.' });
  const best = bestYear(tl, ['합격운 강함']);
  const teaser =
    stance === 0
      ? '올해 안에서도 집중이 잘 되는 달과 흐트러지는 달이 갈려요. 시험이 있는 달을 넣으면 그달의 기운도 볼 수 있어요.'
      : best
        ? `시험운이 가장 강한 해는 ${best}년이에요. 시험 달을 넣으면 그달의 기운과 공부 리듬은 상세 리포트에서 볼 수 있어요.`
        : '앞으로 10년 중 시험운이 크게 몰리는 해는 뚜렷하지 않아요. 운보다 준비한 시간이 결과를 정하는 사주예요.';

  const day = [
    '전날에는 새로운 걸 보지 말고 틀렸던 문제만 다시 보세요.',
    '시험 날 아침은 평소 먹던 대로 — 낯선 음식과 과한 카페인은 피하세요.',
    '공부할 때 쓰던 필기구를 그대로 챙기세요. 손에 익은 것이 마음을 붙잡아 줘요.',
  ];

  return {
    id: 'exam',
    gaeun: concernGaeun('exam', a),
    ask: '이번 시험, 붙을 수 있을까?',
    answer,
    stances: EXAM_STANCES,
    stance,
    why,
    signals: signalsOf(tl),
    teaser,
    free: { title: '나에게 맞는 공부법', items: studyStyle(a) },
    detail: {
      title: '시험·합격 상세 리포트',
      items: ['시험이 있는 달의 기운', '앞으로 12개월 — 집중이 잘 되는 달과 흐트러지기 쉬운 달', '공부가 잘 되는 개운법 — 나에게 맞는 공부 방법, 공부 장소와 시간', '앞으로 10년 시험·자격 신호', '공부를 방해하는 것', '시험 날 챙길 것'],
      months: {
        title: '앞으로 12개월 공부 리듬',
        desc: '어려운 단원과 모의고사를 몰아서 하기 좋은 달, 복습 위주로 가야 할 달이에요.',
        goLabel: '집중이 잘 되는 달',
        avoidLabel: '흐트러지기 쉬운 달',
        noGo: '앞으로 12개월 안에 특별히 몰리는 달은 없어요. 매달 같은 리듬을 지키는 게 답이에요.',
        noAvoid: '앞으로 12개월 안에 특별히 흐트러질 달은 없어요.',
        list: monthSigns(a, months, (c) => {
          if (c.groups.includes('재성') && a.elements.groupPercent['인성'] > 5 && c.w.score < 50) return { kind: 'avoid', why: '돈·연애·일 같은 현실 문제로 공부가 흐트러지기 쉬운 달이에요. 휴대폰과 약속을 줄이세요.' };
          if (c.monthChung) return { kind: 'avoid', why: '환경이 바뀌어 리듬이 깨지기 쉬운 달이에요. 공부 장소와 시간을 고정하세요.' };
          if (c.w.score >= 50 && (c.groups.includes('인성') || c.munchang || (c.groups.includes('관성') && c.w.score >= 55)))
            return {
              kind: 'go',
              why: c.munchang
                ? '시험·글재주의 별(문창)이 뜨는 달이에요. 시험이 있다면 반가운 달이에요.'
                : c.groups.includes('인성')
                  ? '집중이 잘 되고 공부한 것이 잘 남는 달이에요. 어려운 단원을 이때 몰아서 하세요.'
                  : '평가와 인정의 기운이 들어오는 달이에요. 모의고사나 면접 연습을 하기 좋아요.',
            };
          return c.w.score < 38 ? { kind: 'avoid', why: '운의 힘이 약한 달이에요. 무리하기보다 복습 위주로 가세요.' } : null;
        }),
      },
      timeline: { title: '앞으로 10년 시험·자격 신호', desc: '공부의 기운(인성), 합격의 기운(관성), 시험의 별(문창귀인)을 함께 봤어요.', items: tl },
      lists: [{ title: '시험 날 챙길 것', items: day }],
      statements: [{ title: '공부를 방해하는 것', items: studyRisks(a) }].filter((x) => x.items.length),
    },
    notice: '사주는 공부의 때와 방법을 알려 줄 뿐, 합격은 준비한 만큼 와요.',
  };
}

// ---------------------------------------------------------------------------
// 올해 운세 · 신년운세 — 사주의 한 해는 입춘(2월 4일 무렵)에 바뀐다.
// 10월부터 다음 해 입춘 전까지는 다음 해 신년운세로 바뀐다 (report/season.ts) — 1년 중 가장 큰 대목.
//  - 무료: 그해 한 줄, 이유, 신호, 좋아요·조심 한 줄씩, 띠·삼재, 힘이 가장 실리는 달 하나
//  - 상세: 열두 달, 기회의 달·조심할 달 셋씩, 분야별, 그해 개운법, 대운 속 위치
// ---------------------------------------------------------------------------
export const YEAR_STANCES = ['기회의 해', '무난한 해', '다지는 해', '조심하는 해'];

function seunSignal(a: SajuAnalysis, s: Seun): YearSignal {
  const r = readLuck(a, s, '해', s.combined);
  const [verdict, tone]: [string, Tone] = s.combined >= 62 ? ['좋은 해', 'positive'] : s.combined >= 52 ? ['무난한 해', 'neutral'] : s.combined >= 42 ? ['다지는 해', 'neutral'] : ['조심할 해', 'negative'];
  return { year: s.year, pillar: pillarHanja(s.pillar), score: s.combined, verdict, tone, notes: [r.headline] };
}

/** 사주의 달 하나를 날짜로 (예: 2027년 5월 5일 ~ 6월 4일) — 절기에 바뀌므로 양력 1일이 아니다 */
function monthSpan(a: SajuAnalysis, w: Wolun): string {
  const ymd = (ms: number) => {
    const d = new Date(ms + 9 * 3600_000);
    return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate() };
  };
  const s = ymd(w.startMs);
  const next = a.wolun[a.wolun.indexOf(w) + 1];
  if (!next) return `${s.y}년 ${s.m}월 ${s.d}일부터`;
  const e = ymd(next.startMs - 86400_000);
  return `${s.y}년 ${s.m}월 ${s.d}일 ~ ${e.y !== s.y ? `${e.y}년 ` : ''}${e.m}월 ${e.d}일`;
}

/** 그해 띠·삼재 한 줄 (고민 리포트는 해요체) */
function ttiSentence(t: TtiYear, me: string): { text: string; tone: Tone } {
  const parts: string[] = [];
  if (t.samjae)
    parts.push(
      `${t.year}년은 ${me}의 ${t.samjae}예요. 삼재는 민간 풍습이라 겁낼 일은 아니지만, ${t.samjae === '들삼재' ? '새로 벌이는 큰일은 한 번 더 점검하세요' : t.samjae === '눌삼재' ? '무리하게 넓히기보다 지키는 쪽이 나아요' : '마무리를 깔끔하게 하면 돼요'}.`,
    );
  if (t.relation === '충') parts.push(`${t.year}년의 ${t.animal}와 ${me}가 정면으로 부딪히는(충) 해라, 이사·이직 같은 큰 변화는 서두르지 마세요.`);
  if (t.relation === '원진') parts.push(`내 ${me}는 ${t.year}년의 ${t.animal}와 원진(괜히 서운하고 어긋나기 쉬운 사이)이라, 가까운 사람과의 말을 조심하면 좋아요.`);
  if (t.relation === '육합') parts.push(`내 ${me}가 ${t.year}년의 ${t.animal}와 육합(짝이 맞는 사이)이라, 귀인과 협력의 기회가 생기기 쉬워요.`);
  if (t.relation === '삼합') parts.push(`내 ${me}가 ${t.year}년의 ${t.animal}와 삼합(같은 무리)이라, 하는 일에 힘이 실리기 쉬워요.`);
  if (t.relation === '같은 띠') parts.push(`${t.year}년은 내 띠의 해라, 스스로를 돌아보고 새 판을 짜기 좋은 해로 봐요.`);
  if (!parts.length) parts.push(`내 ${me}는 ${t.year}년의 ${t.animal}와 특별히 부딪히거나 합하는 관계가 없어 무난해요.`);
  return { text: parts.join(' '), tone: t.tone === 'good' ? 'positive' : t.tone === 'bad' ? 'caution' : 'neutral' };
}

function yearReport(a: SajuAnalysis, report: Report): ConcernReport | null {
  const season = seasonOf(a);
  const { year, newYear, word } = season;
  const cur = a.seun.find((s) => s.year === year);
  const nxt = a.seun.find((s) => s.year === year + 1);
  const yearWolun = a.wolun.filter((w) => w.sajuYear === year);
  if (!cur || !yearWolun.length) return null;
  const r = readLuck(a, cur, '해', cur.combined);
  const stance = cur.combined >= 62 ? 0 : cur.combined >= 52 ? 1 : cur.combined >= 42 ? 2 : 3;
  const nowIdx = yearWolun.reduce((acc, w, i) => (w.startMs <= a.now ? i : acc), -1);
  const g1 = groupOf(cur.stemTenGod);
  const g2 = groupOf(cur.branchTenGod);
  const THEME: Record<TenGodGroup, string> = {
    비겁: '내 힘으로 밀고 나가는 기운(비겁)',
    식상: '표현하고 만들어 내는 기운(식상)',
    재성: '돈과 활동의 기운(재성)',
    관성: '책임과 자리의 기운(관성)',
    인성: '배움과 문서의 기운(인성)',
  };
  const why = {
    text: `${josa(word, '은/는')} ${THEME[g1]}${g2 !== g1 ? `과 ${THEME[g2]}` : ''}이 들어오는 해예요. ${cur.combined >= 52 ? '이 사주에는 반가운 쪽으로 작용해요.' : '이 사주에는 부담이 되는 쪽으로 작용하기 쉬워요.'} ${powerWord(cur.combined)}이에요.`,
    basis: `${cur.year}년 ${pillarHanja(cur.pillar)} · ${cur.stemTenGod}·${cur.branchTenGod} · 운의 힘 ${cur.combined}`,
  };
  const field = (id: string, label: string) => {
    const y = sectionOf(report, id)?.timeline?.items.find((t) => t.year === year);
    return y ? { label, y } : null;
  };
  const rows = yearWolun.map((w, i): MonthRow => {
    const m = readLuck(a, w, '달');
    const [tag, tone]: [string, Tone] = w.score >= 58 ? ['좋은 달', 'positive'] : w.score <= 42 ? ['조심할 달', 'negative'] : ['보통', 'neutral'];
    return { w, tag, tone, text: m.headline, now: i === nowIdx, past: i < nowIdx };
  });
  // 기회의 달 · 조심할 달 — 남은 달 가운데 셋씩 (겹치지 않게 기준을 둔다)
  const ahead = rows.filter((x) => !x.past);
  const go = [...ahead]
    .sort((x, y) => y.w.score - x.w.score)
    .filter((x) => x.w.score >= 55)
    .slice(0, 3);
  const avoid = [...ahead]
    .sort((x, y) => x.w.score - y.w.score)
    .filter((x) => x.w.score <= 47)
    .slice(0, 3);
  const best = [...ahead].sort((x, y) => y.w.score - x.w.score)[0];
  const late = !newYear && nowIdx >= 7;
  const nr = nxt ? readLuck(a, nxt, '해', nxt.combined) : null;
  const tti = ttiOf(a);
  const tt = ttiSentence(newYear ? tti.nextYear : tti.thisYear, tti.name);
  // 대운 속 위치
  const d = a.daeun.list.find((x) => x.startYear <= year && year <= x.endYear);
  const k = d ? year - d.startYear + 1 : 0;
  const daeunLine = d
    ? S(
        `${year}년은 ${DECADE_THEME[groupOf(d.stemTenGod)].label}의 10년(${d.startYear}~${d.endYear}년) 가운데 ${k}번째 해예요. ${k <= 3 ? '새 10년의 흐름이 자리를 잡는 초입이라, 방향을 정하고 씨를 뿌리기 좋아요.' : k >= 8 ? '10년의 흐름이 마무리로 가는 때라, 정리하고 다음 10년을 준비하기 좋아요.' : '10년 흐름의 한가운데라, 하던 일을 키우고 다지기 좋아요.'}`,
        'neutral',
        `${pillarHanja(d.pillar)} 대운 · ${d.stemTenGod}`,
      )
    : null;
  const title = newYear ? `${year}년` : '올해';

  return {
    id: 'year',
    gaeun: concernGaeun('year', a, { year }),
    ask: season.ask,
    answer: `${josa(word, '은/는')} ${r.headline}예요`,
    stances: YEAR_STANCES,
    stance,
    why,
    signals: [{ label: newYear ? `${year}년` : '올해', y: seunSignal(a, cur) }, ...(nxt ? [{ label: newYear ? `${year + 1}년` : '내년', y: seunSignal(a, nxt) }] : [])],
    teaser: best
      ? `${newYear ? `${year}년에` : '남은 달 가운데'} 힘이 가장 실리는 달은 ${monthSpan(a, best.w)}이에요. 조심할 달과 열두 달 흐름, 분야별 ${title}은 상세 리포트에서 볼 수 있어요.`
      : `조심할 달과 열두 달 흐름, 분야별 ${title}은 상세 리포트에서 볼 수 있어요.`,
    free: {
      title: `${title} 한눈에`,
      note: `사주의 한 해는 입춘에 바뀌어요 — ${cur.year}년 2월 4일 무렵부터 ${cur.year + 1}년 2월 3일 무렵까지`,
      items: [
        S(r.good[0] ?? '큰 흐름을 바꾸기보다 하던 일을 꾸준히 이어 가세요.', 'positive'),
        S(r.caution[0] ?? '무리한 확장과 큰 결정은 한 번 더 확인하세요.', 'negative'),
        S(tt.text, tt.tone, `${tti.name} · ${(newYear ? tti.nextYear : tti.thisYear).line}`),
      ],
      labels: ['좋아요', '조심', '띠·삼재'],
    },
    detail: {
      title: newYear ? `${year} 신년운세 상세 리포트` : '올해 운세 상세 리포트',
      items: [
        `${title} 열두 달 — 달마다 흐름과 좋은 일·조심할 일`,
        '기회의 달과 조심할 달 — 셋씩 골라서',
        `분야별 ${title} — 연애·일·돈·건강`,
        `${year}년 개운법 — 그해에 맞춘 가까이할 것·멀리할 것과 3주 루틴`,
        `대운 속 ${title} — 10년 흐름에서 어디쯤인지`,
        ...(late && nxt ? [`${nxt.year}년 미리보기`] : []),
      ],
      calendar: {
        title: `${title} 열두 달`,
        desc: newYear ? '사주의 달은 절기(입춘·경칩 등)에 바뀌어요. 날짜는 그 기준이에요.' : '사주의 달은 절기에 바뀌어요. 지난 달은 흐리게 보여요.',
        rows,
      },
      months: {
        title: '기회의 달과 조심할 달',
        desc: `${newYear ? '열두 달' : '남은 달'} 가운데 힘이 실리는 달과 몸을 사릴 달을 셋씩 골랐어요.`,
        goLabel: '기회의 달',
        avoidLabel: '조심할 달',
        list: [...go.map((x): MonthSign => ({ w: x.w, kind: 'go', why: x.text })), ...avoid.map((x): MonthSign => ({ w: x.w, kind: 'avoid', why: x.text }))],
        noGo: '두드러지게 힘이 실리는 달은 없어요. 고른 흐름이라 꾸준함이 이기는 해예요.',
        noAvoid: '크게 몸을 사릴 달은 없어요.',
      },
      fields: {
        title: `분야별 ${title}`,
        desc: '연애·일·돈·건강의 그해 신호를 모았어요.',
        rows: [field('love', '연애'), field('career', '일'), field('wealth', '돈'), field('health', '건강')].filter((x): x is { label: string; y: YearSignal } => !!x),
      },
      lists: [
        // 첫 줄은 무료 부분에 이미 나와서 둘째 줄부터
        { title: `${title} 더 해 두면 좋은 것`, items: r.good.slice(1, 4) },
        { title: `${title} 더 피할 것`, items: r.caution.slice(1, 4) },
        ...(late && nr && nxt ? [{ title: `${nxt.year}년 미리보기 — ${nr.headline}`, items: [nr.good[0], nr.caution[0]].filter(Boolean) }] : []),
      ],
      statements: daeunLine ? [{ title: `대운 속 ${title}`, items: [daeunLine] }] : [],
    },
  };
}

// ---------------------------------------------------------------------------
// 진입점
// ---------------------------------------------------------------------------
export function concernReport(id: ConcernId, a: SajuAnalysis, report: Report, months: Wolun[], opt: ConcernOptions = {}): ConcernReport | null {
  switch (id) {
    case 'career':
      return careerReport(a, report, months);
    case 'love':
      return loveReport(a, report, months, opt.love ?? 'single');
    case 'money':
      return moneyReport(a, report, months);
    case 'exam':
      return examReport(a, months);
    case 'year':
      return yearReport(a, report);
    case 'match':
      return null;
  }
}
