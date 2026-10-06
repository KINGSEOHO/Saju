/** 인생 웹툰 — 대본(script)과 그림(art)이 함께 쓰는 타입 */

export type Face =
  | 'neutral' | 'smile' | 'grin' | 'laugh' | 'sad' | 'cry' | 'angry' | 'surprised'
  | 'worried' | 'determined' | 'nervous' | 'love' | 'tired' | 'proud' | 'thinking' | 'shock';

export type Pose = 'idle' | 'cheer' | 'point' | 'think' | 'hold' | 'wave' | 'facepalm' | 'fist' | 'fighting' | 'shrug' | 'cross' | 'cheeks';

export type Age = 'kid' | 'teen' | 'adult' | 'senior';

export type Role = 'me' | 'partner' | 'friend' | 'boss' | 'coworker' | 'parent' | 'teacher' | 'child' | 'elder';

/** 손에 든 소품 */
export type Held =
  | 'document' | 'phone' | 'book' | 'money' | 'trophy' | 'coffee' | 'gift' | 'mic' | 'heart'
  | 'wallet' | 'umbrella' | 'brush' | 'cake' | 'certificate' | 'notebook' | 'drawing' | 'coin' | 'bag';

/** 인물 주변 효과 */
export type Fx =
  | 'sweat' | 'anger' | 'sparkle' | 'hearts' | 'gloom' | 'exclaim' | 'question' | 'bulb'
  | 'zzz' | 'music' | 'steam' | 'flame' | 'cloud' | 'shine' | 'tears';

export type Bg =
  | 'office' | 'officeNight' | 'home' | 'cafe' | 'park' | 'city' | 'school' | 'night' | 'mountain' | 'stage'
  | 'library' | 'dinner' | 'crossroad' | 'rain' | 'sea' | 'money' | 'gym' | 'bedroom' | 'burst' | 'gloom' | 'sparkle';

/** 배경 위에 놓는 소품 (desk·table·coins 등은 인물 앞에 그린다) */
export type PropKind =
  | 'desk' | 'papers' | 'laptop' | 'coins' | 'moneyBag' | 'chartUp' | 'chartDown' | 'books' | 'signpost'
  | 'bench' | 'table' | 'plant' | 'boxes' | 'calendar' | 'clock' | 'whiteboard' | 'bed' | 'dumbbell' | 'easel';

export interface Actor {
  role: Role;
  /** 패널 안 가로 위치(발 중심) */
  x: number;
  face: Face;
  pose: Pose;
  age?: Age;
  gender?: 'male' | 'female';
  /** 1 = 오른쪽을 봄, -1 = 왼쪽을 봄 */
  dir?: 1 | -1;
  held?: Held;
  fx?: Fx[];
  /** 상의 색 — 주인공은 일간 오행 색 */
  outfit?: string;
}

export interface Line {
  /** 말하는 인물(actors 인덱스) */
  by: number;
  text: string;
  kind?: 'say' | 'think' | 'shout';
  /** 10대 이하·노년 사용자에게 바꿔 쓰는 대사 */
  alt?: { young?: string; senior?: string };
}

export interface PropSpec {
  kind: PropKind;
  x: number;
  /** 바닥 기준이 아닌 소품의 세로 위치(선택) */
  y?: number;
  s?: number;
  label?: string;
  label2?: string;
}

export type PanelTone = 'good' | 'neutral' | 'bad';

export interface Panel {
  /** 해설 목록에 쓰는 짧은 제목 */
  title: string;
  bg: Bg;
  /** 컷 위쪽 내레이션 */
  caption: string;
  actors: Actor[];
  lines: Line[];
  props?: PropSpec[];
  /** 오른쪽 위 스티커 (예: '지금 여기!') */
  badge?: string;
  /** 컷 안 왼쪽 아래에 찍는 사주 근거 */
  basis: string;
  /** 만화 아래 해설 */
  note: string;
  tone?: PanelTone;
}

export interface Comic {
  id: 'persona' | 'life';
  title: string;
  subtitle: string;
  panels: Panel[];
}
