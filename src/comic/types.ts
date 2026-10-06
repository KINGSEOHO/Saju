/**
 * 인생 웹툰 — 대본(script)과 그림(art)이 함께 쓰는 타입.
 * 그림체는 굵은 손그림 선과 점 눈의 '개그 웹툰' 문법을 따르되, 캐릭터·연출은 모두 이 서비스의 오리지널이다.
 */
import type { Element } from '../engine/index.ts';

/** 표정 */
export type Face =
  | 'plain' // • •  —   무표정
  | 'smile'
  | 'happy' // ^ ^  활짝
  | 'grin' // 이 드러낸 웃음
  | 'smug' // 반쯤 감은 눈 + 비죽 웃음
  | 'proud' // 눈 감고 코 높이
  | 'surprised'
  | 'shock' // 흰자 눈 + 그늘 선
  | 'scream'
  | 'sad'
  | 'cry' // 폭포 눈물
  | 'angry'
  | 'rage' // 시뻘건 얼굴
  | 'dead' // X X
  | 'soul' // 넋 나감 (영혼 가출과 함께)
  | 'star' // ★ 눈
  | 'money' // ₩ 눈
  | 'love' // ♥ 눈
  | 'blush'
  | 'nervous'
  | 'tired'
  | 'sleep'
  | 'think'
  | 'serious' // 진지 (극화체 컷에서 빛난다)
  | 'drool'
  | 'blank'; // 아주 작은 점 눈 — 궁극의 무표정

/** 자세 */
export type Pose =
  | 'stand'
  | 'wave'
  | 'cheer' // 만세
  | 'point'
  | 'hold' // 두 손으로 앞에 든다
  | 'think'
  | 'cross' // 팔짱
  | 'shrug'
  | 'facepalm'
  | 'fist' // 주먹 불끈
  | 'hips' // 허리에 손
  | 'run'
  | 'jump'
  | 'otl' // 좌절 (무릎 꿇고 엎드림)
  | 'lie' // 엎어져 쓰러짐 (털썩)
  | 'flat' // 뒤로 누움 (뻗음)
  | 'sit'
  | 'bow' // 90도 인사
  | 'beg' // 무릎 꿇고 싹싹
  | 'lift' // 머리 위로 든다
  | 'phone'; // 휴대폰을 들여다봄

export type Age = 'kid' | 'teen' | 'adult' | 'senior';

/** mirror = 거울 요정 '명경이' (해설·팩폭 담당) · monster = 인생 RPG의 몬스터 */
export type Role = 'me' | 'partner' | 'friend' | 'boss' | 'coworker' | 'parent' | 'teacher' | 'child' | 'elder' | 'mirror' | 'monster';

export type MonsterKind = 'slime' | 'ghost' | 'golem' | 'dragon' | 'bat';

/** 옷차림 */
export type Wear = 'tee' | 'shirt' | 'suit' | 'hoodie' | 'coat' | 'apron' | 'uniform' | 'pajama' | 'cardigan' | 'armor';

/** 손에 든 물건 */
export type Held =
  | 'phone'
  | 'coffee'
  | 'tea'
  | 'document'
  | 'docs' // 산더미 서류 (lift와 함께)
  | 'book'
  | 'laptop'
  | 'tablet'
  | 'money'
  | 'moneybag'
  | 'wallet' // 텅 빈 지갑
  | 'card'
  | 'mic'
  | 'trophy'
  | 'candle'
  | 'magnifier'
  | 'water' // 2L 생수
  | 'noodle' // 불타는 매운 라면
  | 'barbell'
  | 'umbrella'
  | 'calculator'
  | 'paper'
  | 'flag'
  | 'cake'
  | 'plant'
  | 'globe' // 짊어진 큰 공 (책임)
  | 'crayon'
  | 'piggy'
  | 'test' // 시험지
  | 'bag'
  | 'box'
  | 'sword'
  | 'controller'
  | 'plush'
  | 'ticket'
  | 'chicken' // 반반 치킨
  | 'spoon'
  | 'bowl'
  | 'shovel'
  | 'heart';

/** 인물 주변 효과 */
export type Fx =
  | 'sweat'
  | 'drops'
  | 'vein'
  | 'steam'
  | 'gloom'
  | 'sparkle'
  | 'hearts'
  | 'question'
  | 'exclaim'
  | 'bulb'
  | 'bulbs'
  | 'zzz'
  | 'music'
  | 'soul' // 영혼 가출
  | 'aura' // 불꽃 오라
  | 'stars' // 어질어질
  | 'shake' // 덜덜
  | 'speed' // 달리는 선
  | 'moths' // 텅 빈 지갑의 나방
  | 'cloud' // 머리 위 먹구름
  | 'dots' // …
  | 'lightning'
  | 'fire'; // 입에서 불

/** 몸에 붙는 장식 */
export type Acc =
  | 'sunglasses'
  | 'glasses'
  | 'bandage'
  | 'beard'
  | 'cobweb'
  | 'roots'
  | 'nest'
  | 'stone' // 석화
  | 'zipper' // 입 지퍼
  | 'headband'
  | 'crown'
  | 'halo'
  | 'cape'
  | 'wings'
  | 'redface'
  | 'darkcircles'
  | 'cap'; // 모자 (졸업모 등은 쓰지 않는다)

/** 머리 위 오행 마크의 상태 */
export type Sym = 'normal' | 'wilt' | 'flare' | 'jump' | 'off';

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
  /** 정면을 본다 (표지·독백) */
  front?: boolean;
  held?: Held;
  /** 든 물건 위에 쓰는 글자 (뒤집히지 않게 따로 쓴다) */
  heldLabel?: string;
  fx?: Fx[];
  acc?: Acc[];
  /** 옷의 주된 색 — 주인공은 일간 오행 색 */
  outfit?: string;
  wear?: Wear;
  /** 머리 위 오행 마크 (주인공) */
  el?: Element;
  sym?: Sym;
  /** 크기 배율 (멀리 있는 사람, 거대한 부장님…) */
  scale?: number;
  /** 바닥에서 띄우는 높이 (인물 단위) */
  lift?: number;
  /** 몬스터 종류 */
  monster?: MonsterKind;
  /** 머리 위 이름표 (몬스터·조연) */
  tag?: string;
}

export interface Line {
  /** 말하는 인물(cast 인덱스). -1이면 화면 밖 목소리 */
  by: number;
  text: string;
  kind?: 'say' | 'think' | 'shout' | 'whisper';
  /** 10대 이하·노년 사용자에게 바꿔 쓰는 대사 */
  alt?: { young?: string; senior?: string };
}

/** 효과음 글자 (예: 쾅!, 털썩) — 컷 좌표 */
export interface Sfx {
  text: string;
  x: number;
  y: number;
  size?: number;
  rot?: number;
  color?: string;
}

/** 주석 — 글씨와 화살표 (예: ← 본인 맞음) */
export interface Mark {
  text: string;
  x: number;
  y: number;
  /** 화살표 끝 (없으면 글씨만) */
  to?: [number, number];
}

export type PropKind =
  | 'desk'
  | 'monitor'
  | 'chair'
  | 'sofa'
  | 'bed'
  | 'table'
  | 'whiteboard'
  | 'window'
  | 'door'
  | 'wall'
  | 'tree'
  | 'bench'
  | 'signpost'
  | 'calendar'
  | 'clock'
  | 'books'
  | 'bookfort'
  | 'papers'
  | 'crumpled'
  | 'boxes'
  | 'bulbpile'
  | 'coins'
  | 'trash'
  | 'plant'
  | 'tv'
  | 'podium'
  | 'cage'
  | 'wheel' // 쳇바퀴
  | 'battery'
  | 'chest'
  | 'lockdoor'
  | 'flag'
  | 'gift'
  | 'cloudcoin' // 동전 모양 구름
  | 'board' // 글자 판 (label/rows)
  | 'graph' // 인생 그래프 (values)
  | 'score' // 점수판
  | 'rx' // 처방전
  | 'shelf' // 아이템 상점 진열대 (rows)
  | 'phonebig' // 크게 보이는 휴대폰 화면 (rows)
  | 'status'; // RPG 상태창 (rows)

export interface PropSpec {
  kind: PropKind;
  /** 컷 좌표 (가운데) */
  x: number;
  /** 컷 좌표 (바닥 기준 소품은 생략하면 바닥) */
  y?: number;
  s?: number;
  label?: string;
  label2?: string;
  rows?: string[];
  values?: number[];
  w?: number;
  h?: number;
  /** 강조색 */
  color?: string;
}

export type Bg =
  // 장소
  | 'room'
  | 'bedroom'
  | 'office'
  | 'officeNight'
  | 'meeting'
  | 'cafe'
  | 'street'
  | 'subway'
  | 'park'
  | 'school'
  | 'library'
  | 'gym'
  | 'beach'
  | 'mountain'
  | 'night'
  | 'rain'
  | 'stage'
  | 'shop'
  | 'hospital'
  | 'studio'
  | 'map'
  | 'dungeon'
  | 'kitchen'
  // 감정
  | 'white'
  | 'speed'
  | 'burst'
  | 'gloom'
  | 'sparkle'
  | 'flame'
  | 'dark'
  | 'drama'
  | 'space'
  | 'flowers'
  | 'lightning'
  | 'blue';

/** 카메라 — full: 전신, bust: 허리 위, face: 얼굴 */
export type Shot = 'full' | 'bust' | 'face';

export type PanelTone = 'good' | 'neutral' | 'bad';

/** 분할 컷의 한쪽 (기대 vs 현실) */
export interface Half {
  label: string;
  bg: Bg;
  cast: Actor[];
  talk: Line[];
  props?: PropSpec[];
  sfx?: Sfx[];
}

export interface Panel {
  type?: 'panel';
  /** 해설 목록에 쓰는 짧은 제목 */
  title: string;
  bg: Bg;
  shot?: Shot;
  /** 컷 높이 (기본은 카메라에 따라) */
  h?: number;
  /** 카메라가 맞추는 인물 (기본: 주인공) */
  focus?: number;
  /** 컷 위쪽 내레이션 */
  cap?: string;
  cast: Actor[];
  talk: Line[];
  props?: PropSpec[];
  sfx?: Sfx[];
  marks?: Mark[];
  /** 갑자기 진지해지는 극화체 컷 */
  drama?: boolean;
  /** 오른쪽 위 스티커 (예: '지금 여기!') */
  badge?: string;
  /** 컷 안 왼쪽 아래에 찍는 사주 근거 */
  basis?: string;
  /** 만화 아래 해설 */
  note?: string;
  tone?: PanelTone;
  /** 회차 표지 */
  cover?: { kicker: string; title: string; tagline: string };
  /** 기대 vs 현실 — 있으면 cast·talk 대신 두 칸으로 그린다 */
  split?: [Half, Half];
}

/** 그림 없이 글만 있는 칸 */
export interface TextBeat {
  type: 'text';
  text: string;
  /** plain: 흰 칸 · black: 검은 칸 · chapter: 장 제목 · time: 시간 경과 · soft: 파스텔 */
  style?: 'plain' | 'black' | 'chapter' | 'time' | 'soft';
  /** 장 번호 (chapter) */
  no?: string;
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
