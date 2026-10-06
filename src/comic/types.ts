/** 인생 웹툰 — 대본(script)과 그림(art)이 함께 쓰는 타입 */

export type Face =
  | 'neutral' | 'smile' | 'grin' | 'laugh' | 'sad' | 'cry' | 'angry' | 'surprised'
  | 'worried' | 'determined' | 'nervous' | 'love' | 'tired' | 'proud' | 'thinking' | 'shock'
  | 'shy' | 'calm' | 'annoyed' | 'sparkle';

export type Pose =
  | 'idle' | 'cheer' | 'point' | 'think' | 'hold' | 'wave' | 'facepalm' | 'fist' | 'fighting' | 'shrug' | 'cross' | 'cheeks'
  | 'hips' | 'scratch' | 'mouth';

export type Age = 'kid' | 'teen' | 'adult' | 'senior';

/** mirror = 거울 요정 '명경이' (해설 역할) */
export type Role = 'me' | 'partner' | 'friend' | 'boss' | 'coworker' | 'parent' | 'teacher' | 'child' | 'elder' | 'mirror';

/** 옷차림 — 주인공은 장면(일터/일상)과 직업에 따라 바뀐다 */
export type Wear =
  | 'tee' | 'shirt' | 'suit' | 'hoodie' | 'knit' | 'blouse' | 'coat' | 'apron' | 'uniform' | 'track' | 'cardigan' | 'dress' | 'kidtee' | 'pajama';

/** 손에 든 소품 */
export type Held =
  | 'document' | 'phone' | 'book' | 'money' | 'trophy' | 'coffee' | 'gift' | 'mic' | 'heart'
  | 'wallet' | 'umbrella' | 'brush' | 'cake' | 'certificate' | 'notebook' | 'drawing' | 'coin' | 'bag'
  | 'laptop' | 'tablet' | 'flower';

/** 인물 주변 효과 */
export type Fx =
  | 'sweat' | 'anger' | 'sparkle' | 'hearts' | 'gloom' | 'exclaim' | 'question' | 'bulb'
  | 'zzz' | 'music' | 'steam' | 'flame' | 'cloud' | 'shine' | 'tears' | 'dots';

export type Bg =
  | 'office' | 'officeNight' | 'home' | 'cafe' | 'park' | 'city' | 'school' | 'night' | 'mountain' | 'stage'
  | 'library' | 'dinner' | 'crossroad' | 'rain' | 'sea' | 'money' | 'gym' | 'bedroom' | 'burst' | 'gloom' | 'sparkle'
  | 'hospital' | 'studio' | 'street';

/** 가까이 잡은 컷의 감정 배경 (배경 장소 대신 쓴다) */
export type Mood = 'soft' | 'sparkle' | 'gloom' | 'tone' | 'lines' | 'warm' | 'cool' | 'dark' | 'flowers';

/** 카메라 — full: 전신, bust: 허리 위, close: 얼굴, eyes: 눈만 */
export type Shot = 'full' | 'bust' | 'close' | 'eyes';

/** 배경 위에 놓는 소품 (desk·table·coins 등은 인물 앞에 그린다) */
export type PropKind =
  | 'desk' | 'papers' | 'laptop' | 'coins' | 'moneyBag' | 'chartUp' | 'chartDown' | 'books' | 'signpost'
  | 'bench' | 'table' | 'plant' | 'boxes' | 'calendar' | 'clock' | 'whiteboard' | 'bed' | 'dumbbell' | 'easel' | 'monitor';

export interface Actor {
  role: Role;
  /** 컷 안 가로 위치(몸 중심, 컷 좌표) */
  x: number;
  face: Face;
  pose: Pose;
  age?: Age;
  gender?: 'male' | 'female';
  /** 1 = 오른쪽을 봄, -1 = 왼쪽을 봄 */
  dir?: 1 | -1;
  held?: Held;
  fx?: Fx[];
  /** 옷의 주된 색 — 주인공은 일간 오행 색 */
  outfit?: string;
  wear?: Wear;
  /** 정면을 본다 (표지·독백 컷) */
  front?: boolean;
}

export interface Line {
  /** 말하는 인물(actors 인덱스). -1이면 화면 밖 목소리 */
  by: number;
  text: string;
  kind?: 'say' | 'think' | 'shout' | 'whisper';
  /** 10대 이하·노년 사용자에게 바꿔 쓰는 대사 */
  alt?: { young?: string; senior?: string };
}

export interface PropSpec {
  kind: PropKind;
  x: number;
  /** 바닥 기준이 아닌 소품의 세로 위치(선택, 무대 좌표) */
  y?: number;
  s?: number;
  label?: string;
  label2?: string;
}

/** 효과음 글자 (예: 두근, 쿵!) — 컷 좌표 */
export interface Sfx {
  text: string;
  x: number;
  y: number;
  size?: number;
  rot?: number;
  color?: string;
}

export type PanelTone = 'good' | 'neutral' | 'bad';

export interface Panel {
  type?: 'panel';
  /** 해설 목록에 쓰는 짧은 제목 */
  title: string;
  bg: Bg;
  mood?: Mood;
  shot?: Shot;
  /** 컷 높이(기본은 카메라에 따라) */
  height?: number;
  /** 전신 컷 확대 비율 (기본 1) */
  zoom?: number;
  /** 카메라가 맞추는 인물 (기본: 주인공) */
  focus?: number;
  /** 컷 위쪽 내레이션 */
  caption: string;
  actors: Actor[];
  lines: Line[];
  props?: PropSpec[];
  sfx?: Sfx[];
  /** 오른쪽 위 스티커 (예: '지금 여기!') */
  badge?: string;
  /** 컷 안 왼쪽 아래에 찍는 사주 근거 */
  basis?: string;
  /** 만화 아래 해설 */
  note?: string;
  tone?: PanelTone;
  /** 회차 표지 */
  cover?: { kicker: string; title: string; tagline: string };
}

/** 그림 없이 글만 있는 칸 (장면 전환·독백) */
export interface TextBeat {
  type: 'text';
  text: string;
  style?: 'plain' | 'dark' | 'soft';
  title?: string;
  note?: string;
  basis?: string;
}

export type Beat = Panel | TextBeat;

export type EpisodeId = 'persona' | 'work' | 'life' | 'mbti';

export interface Comic {
  id: EpisodeId;
  no: number;
  title: string;
  subtitle: string;
  beats: Beat[];
}

export const isText = (b: Beat): b is TextBeat => b.type === 'text';
