/**
 * 인생 웹툰 대본 공용 — 주인공·조연 만들기, 호칭, 직업별 일터, 장면에 맞는 옷차림, 컷 만들기 도구.
 */
import { STEMS, type Element, type SajuAnalysis, type TenGodGroup } from '../engine/index.ts';
import { josa } from '../engine/josa.ts';
import { groupOf } from '../engine/tenGods.ts';
import type { CrossReport } from '../report/cross.ts';
import { EL_COLOR } from './toon.tsx';
import type { Actor, Age, Beat, Bg, Face, Held, Line, Panel, PanelTone, Pose, PropSpec, Role, TextBeat, Wear } from './types.ts';

/** 주인공 옷 색 = 일간 오행 */
export const OUTFIT: Record<Element, string> = EL_COLOR;
/** 쉬운 말로 부르는 오행 */
export const EL_WORD: Record<Element, string> = { wood: '나무', fire: '불', earth: '흙', metal: '쇠', water: '물' };
export const GROUPS: TenGodGroup[] = ['비겁', '식상', '재성', '관성', '인성'];
export const pct = (n: number) => `${n.toFixed(0)}%`;

const CASUAL: Record<Element, [Wear, Wear]> = {
  wood: ['tee', 'cardigan'],
  fire: ['tee', 'tee'],
  earth: ['cardigan', 'cardigan'],
  metal: ['shirt', 'shirt'],
  water: ['hoodie', 'hoodie'],
};

/** 일터 — 직업 분야별 배경·옷·소품 */
export interface WorkSet {
  id: string;
  kind: 'work' | 'study' | 'life';
  bg: Bg;
  wear: Wear;
  held: Held;
  props: PropSpec[];
  /** 일하는 곳 (내레이션용) */
  place: string;
  /** 오늘의 할 일 */
  task: string;
}

const desk = (x: number, extra: PropSpec[] = []): PropSpec[] => [{ kind: 'desk', x }, ...extra];
const WORK: Record<string, Omit<WorkSet, 'id'>> = {
  it: { kind: 'work', bg: 'office', wear: 'hoodie', held: 'laptop', props: desk(470, [{ kind: 'monitor', x: 500 }]), place: '사무실', task: '코드 리뷰' },
  office: { kind: 'work', bg: 'office', wear: 'shirt', held: 'document', props: desk(470), place: '사무실', task: '보고서' },
  finance: { kind: 'work', bg: 'office', wear: 'suit', held: 'calculator', props: desk(470, [{ kind: 'monitor', x: 500 }]), place: '사무실', task: '결산 자료' },
  public: { kind: 'work', bg: 'office', wear: 'shirt', held: 'document', props: desk(470, [{ kind: 'papers', x: 500, y: 330 }]), place: '사무실', task: '서류 검토' },
  creative: { kind: 'work', bg: 'studio', wear: 'tee', held: 'tablet', props: [], place: '작업실', task: '시안 작업' },
  medical: { kind: 'work', bg: 'hospital', wear: 'coat', held: 'document', props: [], place: '병원', task: '회진' },
  edu: { kind: 'work', bg: 'school', wear: 'cardigan', held: 'book', props: [], place: '교실', task: '수업 준비' },
  sales: { kind: 'work', bg: 'street', wear: 'suit', held: 'phone', props: [], place: '거래처', task: '고객 미팅' },
  business: { kind: 'work', bg: 'cafe', wear: 'shirt', held: 'tablet', props: [], place: '가게', task: '매출 정리' },
  tech: { kind: 'work', bg: 'office', wear: 'shirt', held: 'document', props: desk(470), place: '현장 사무실', task: '도면 검토' },
  service: { kind: 'work', bg: 'cafe', wear: 'apron', held: 'coffee', props: [], place: '매장', task: '오픈 준비' },
  travel: { kind: 'work', bg: 'street', wear: 'suit', held: 'bag', props: [], place: '현장', task: '일정 점검' },
  property: { kind: 'work', bg: 'street', wear: 'shirt', held: 'document', props: [], place: '현장', task: '계약 준비' },
  care: { kind: 'work', bg: 'cafe', wear: 'cardigan', held: 'book', props: [], place: '상담실', task: '상담 기록' },
  sports: { kind: 'work', bg: 'gym', wear: 'tee', held: 'document', props: [], place: '센터', task: '수업' },
  student: { kind: 'study', bg: 'school', wear: 'uniform', held: 'book', props: [], place: '학교', task: '과제' },
  home: { kind: 'life', bg: 'kitchen', wear: 'apron', held: 'bowl', props: [], place: '집', task: '살림' },
  transition: { kind: 'life', bg: 'room', wear: 'tee', held: 'laptop', props: [], place: '집', task: '지원서 쓰기' },
  freelance: { kind: 'work', bg: 'cafe', wear: 'tee', held: 'laptop', props: [], place: '카페', task: '마감' },
  other: { kind: 'work', bg: 'office', wear: 'shirt', held: 'document', props: desk(470), place: '일터', task: '업무' },
  retired: { kind: 'life', bg: 'park', wear: 'cardigan', held: 'book', props: [], place: '동네', task: '하루 일과' },
};

export interface Ctx {
  a: SajuAnalysis;
  x: CrossReport | null;
  /** 입력한 이름 (없으면 '') */
  name: string;
  /** 부를 때 쓰는 이름 (성 뺀 이름) */
  given: string;
  /** 서호야 · 지원아 (없으면 '') */
  call: string;
  /** 서호 씨 (없으면 '') */
  ssi: string;
  /** 서호님 · 당신 */
  who: string;
  male: boolean;
  age: Age;
  young: boolean;
  senior: boolean;
  color: string;
  el: Element;
  work: WorkSet;
  /** 지금 회차 (옷차림 결정에 쓴다) */
  episode: 'persona' | 'work' | 'life' | 'mbti';
  me: (x: number, face: Face, pose: Pose, extra?: Partial<Actor>) => Actor;
  other: (role: Role, x: number, face: Face, pose: Pose, extra?: Partial<Actor>) => Actor;
  mirror: (x: number, face: Face, pose?: Pose, extra?: Partial<Actor>) => Actor;
}

function givenName(name: string): string {
  const n = name.trim();
  if (/^[가-힣]{3}$/.test(n)) return n.slice(1);
  if (/^[가-힣]{4}$/.test(n)) return n.slice(2);
  return n;
}

export function ageGroup(age: number): Age {
  return age < 13 ? 'kid' : age < 20 ? 'teen' : age >= 65 ? 'senior' : 'adult';
}

export function makeCtx(a: SajuAnalysis, x: CrossReport | null, episode: Ctx['episode']): Ctx {
  const male = a.input.gender === 'male';
  const age = ageGroup(a.age);
  const el = STEMS[a.pillars.day.stem].element;
  const color = OUTFIT[el];
  const name = a.input.name?.trim().slice(0, 12) ?? '';
  const given = givenName(name);
  const hangul = /^[가-힣]+$/.test(given);
  const call = given ? (hangul ? josa(given, '아/야') : given) : '';
  const job = x?.job ?? null;
  const young = age === 'kid' || age === 'teen';
  let id = job?.category.id ?? (young ? 'student' : age === 'senior' ? 'retired' : 'other');
  if (!WORK[id]) id = 'other';
  const work: WorkSet = { id, ...WORK[id] };
  if (id === 'student') {
    // 대학생·수험생은 교복 대신 후드티, 장소는 도서관
    if (age === 'adult' || age === 'senior') Object.assign(work, { bg: 'library', wear: 'hoodie', place: '도서관' });
    else if (age === 'kid') Object.assign(work, { wear: 'tee' });
  }
  const genderOf = (role: Role): 'male' | 'female' => {
    switch (role) {
      case 'partner':
        return male ? 'female' : 'male';
      case 'friend':
      case 'elder':
      case 'child':
        return male ? 'male' : 'female';
      case 'parent':
        return 'female';
      case 'coworker':
        return male ? 'female' : 'male';
      default:
        return a.pillars.day.stem % 2 === 0 ? 'male' : 'female';
    }
  };
  return {
    a,
    x,
    name,
    given,
    call,
    ssi: given ? `${given} 씨` : '',
    who: name ? `${name}님` : '당신',
    male,
    age,
    young,
    senior: age === 'senior',
    color,
    el,
    work,
    episode,
    me: (xx, face, pose, extra = {}) => ({ role: 'me', x: xx, face, pose, gender: male ? 'male' : 'female', outfit: color, el, age, ...extra }),
    other: (role, xx, face, pose, extra = {}) => ({
      role,
      x: xx,
      face,
      pose,
      gender: genderOf(role),
      age: role === 'child' ? 'kid' : role === 'elder' ? 'senior' : 'adult',
      ...(episode === 'work' && id === 'medical' && (role === 'boss' || role === 'coworker') ? { wear: 'coat' as const } : {}),
      ...extra,
    }),
    mirror: (xx, face, pose = 'stand', extra = {}) => ({ role: 'mirror', x: xx, face, pose, ...extra }),
  };
}

/** 부르는 말을 붙인다: '서호야, 벌써?' (이름이 없으면 그대로) */
export const hey = (c: Ctx, text: string) => (c.call ? `${c.call}, ${text}` : text);
/** 직장에서 부르는 말: '서호 씨, …' */
export const heySsi = (c: Ctx, text: string) => (c.ssi ? `${c.ssi}, ${text}` : text);

export const say = (by: number, text: string, kind: Line['kind'] = 'say', alt?: Line['alt']): Line => ({ by, text, kind, alt });
export const think = (by: number, text: string, alt?: Line['alt']): Line => ({ by, text, kind: 'think', alt });
export const shout = (by: number, text: string, alt?: Line['alt']): Line => ({ by, text, kind: 'shout', alt });
export const whisper = (by: number, text: string, alt?: Line['alt']): Line => ({ by, text, kind: 'whisper', alt });

export type Scene = Pick<Panel, 'bg' | 'cast' | 'talk'> & Partial<Pick<Panel, 'props' | 'sfx' | 'marks' | 'shot' | 'h' | 'focus' | 'drama' | 'split'>>;

const WORK_BG = new Set<Bg>(['office', 'officeNight', 'meeting']);

/** 장면 배경(과 그 장면 속 나이)에 맞는 주인공 옷 */
function wearFor(c: Ctx, bg: Bg, age: Age): Wear {
  const casual = CASUAL[c.el][c.male ? 0 : 1];
  if (bg === 'bedroom') return 'pajama';
  if (age === 'kid') return 'tee';
  if (age === 'teen') return bg === 'school' || bg === 'library' ? 'uniform' : 'hoodie';
  if (age === 'senior') return 'cardigan';
  const work = c.work;
  const now = age === c.age;
  if (now && c.episode === 'work' && work.kind !== 'life' && (bg === work.bg || WORK_BG.has(bg))) return work.wear;
  if (WORK_BG.has(bg)) return now && work.kind === 'work' && (work.bg === 'office' || work.bg === 'street') ? work.wear : 'shirt';
  if (bg === 'hospital') return now && work.id === 'medical' ? 'coat' : casual;
  if (bg === 'studio' && now && work.id === 'creative') return work.wear;
  return casual;
}

const dressCast = (cast: Actor[], bg: Bg, c: Ctx): Actor[] => cast.map((x) => (x.role === 'me' && !x.wear ? { ...x, wear: wearFor(c, bg, x.age ?? c.age) } : x));

/** 주인공 옷만 장면에 맞춘다 (인생 연대기처럼 장면마다 나이가 다른 경우) */
export function dress(s: Scene, c: Ctx): Scene {
  const split = s.split?.map((h) => ({ ...h, cast: dressCast(h.cast, h.bg, c) })) as Panel['split'];
  return { ...s, cast: dressCast(s.cast, s.bg, c), ...(split ? { split } : {}) };
}

/** 나이에 맞게 대사·인물을 고른다 */
function adaptCast(cast: Actor[], c: Ctx): Actor[] {
  if (c.senior) return cast.map((x): Actor => (x.role === 'friend' || x.role === 'coworker' ? { ...x, role: 'elder', age: 'senior', gender: c.male ? 'male' : 'female' } : x));
  if (c.young)
    return cast.map((x): Actor => {
      if (x.role === 'boss') return { ...x, role: 'teacher' };
      if (x.role === 'coworker' || x.role === 'partner') return { ...x, role: 'friend', age: c.age, gender: c.male ? 'male' : 'female' };
      if (x.role === 'friend') return { ...x, age: c.age };
      return x;
    });
  return cast;
}

const pickLine = (c: Ctx) => (l: Line): Line => ({ ...l, text: (c.young ? l.alt?.young : c.senior ? l.alt?.senior : undefined) ?? l.text, alt: undefined });

/** 나이에 맞게 장면을 다듬는다: 10대 이하는 학교 장면으로, 65세 이상은 또래 인물로. 주인공 옷도 장면에 맞춘다 */
export function adapt(s0: Scene, c: Ctx): Scene {
  const bgOf = (bg: Bg): Bg => (c.young && WORK_BG.has(bg) ? 'school' : bg);
  const split = s0.split?.map((h) => ({ ...h, bg: bgOf(h.bg), cast: adaptCast(h.cast, c), talk: h.talk.map(pickLine(c)) })) as Panel['split'];
  const s: Scene = { ...s0, bg: bgOf(s0.bg), cast: adaptCast(s0.cast, c), talk: s0.talk.map(pickLine(c)), ...(split ? { split } : {}) };
  return dress(s, c);
}

/** 그림 컷 (나이에 맞게 다듬는다) */
export function cut(c: Ctx, title: string, cap: string, scene: Scene, extra: Partial<Panel> = {}): Panel {
  return { title, ...(cap ? { cap } : {}), ...adapt(scene, c), ...extra };
}

/** 그림 컷 (장면 그대로, 옷만 맞춘다) */
export function cutRaw(c: Ctx, title: string, cap: string, scene: Scene, extra: Partial<Panel> = {}): Panel {
  const s = dress(scene, c);
  return { title, ...(cap ? { cap } : {}), ...s, talk: s.talk.map(pickLine(c)), ...extra };
}

/** 글 칸 */
export const text = (t: string, style: TextBeat['style'] = 'plain', extra: Partial<TextBeat> = {}): TextBeat => ({ type: 'text', text: t, style, ...extra });
/** 장 제목 */
export const chapter = (no: string, t: string, extra: Partial<TextBeat> = {}): TextBeat => ({ type: 'text', text: t, style: 'chapter', no, title: t, ...extra });
/** 시간 경과 */
export const later = (t: string): TextBeat => ({ type: 'text', text: t, style: 'time', title: t });

export function toneOf(score: number): PanelTone {
  return score >= 58 ? 'good' : score < 42 ? 'bad' : 'neutral';
}

export function topGroups(a: SajuAnalysis): TenGodGroup[] {
  const gp = a.elements.groupPercent;
  return [...GROUPS].sort((x, y) => gp[y] - gp[x]);
}

/** 지금의 대운 흐름 (1년 안에 바뀌면 다음 대운도 함께) */
export function phaseOf(a: SajuAnalysis) {
  const d = a.currentDaeun;
  const list = a.daeun.list;
  const idx = d ? list.indexOf(d) : -1;
  const next = idx >= 0 ? list[idx + 1] : list[0];
  const g: TenGodGroup = d ? groupOf(d.stemTenGod) : topGroups(a)[0];
  const tone = d ? toneOf(d.score) : 'neutral';
  const switching = !!(d && next && d.endYear - a.currentSajuYear <= 1);
  const ng: TenGodGroup = next ? groupOf(next.stemTenGod) : g;
  const ntone = next ? toneOf(next.score) : tone;
  const year = a.seun.find((s) => s.year === a.currentSajuYear) ?? null;
  return { d, g, tone, next, ng, ntone, switching, year };
}

/** 다음 화 제목 (2화는 나이·직업에 따라 이름이 다르다) */
export function workTitle(c: Ctx): string {
  if (c.x?.job) return '일과 나';
  if (c.work.kind === 'study') return '공부와 나';
  if (c.senior) return '나의 하루';
  return '일과 나';
}

export type { Beat };
