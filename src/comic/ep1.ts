/**
 * 1화 · 나라는 사람 — 거울 요정 명경이가 내 사주를 '탈탈 터는' 개그 회차.
 * 일간(타고난 기질) → 겉(월간)과 속(일지) → 가장 강한 기운 → 솔직한 약점 → 용신 처방(을 오해하는 나).
 * 웃기게 그리되 장면의 뼈대는 모두 사주 구조에서 고르고, 컷마다 근거를 남긴다. 좋은 장면만 고르지 않는다.
 */
import { ELEMENT_HANJA, ELEMENT_KO, STEMS, pillarHanja, type Element, type SajuAnalysis, type TenGod, type TenGodGroup } from '../engine/index.ts';
import { groupOf } from '../engine/tenGods.ts';
import type { CrossReport } from '../report/cross.ts';
import { wealthCapacity } from '../report/metrics.ts';
import { EL_WORD, chapter, cut, hey, later, makeCtx, pct, say, shout, text, think, topGroups, whisper, workTitle, type Ctx, type Scene } from './ctx.ts';
import type { Beat, Comic, Half, Panel } from './types.ts';

/** 한 컷 대본 */
interface Gag {
  cap?: string;
  s: Scene;
  x?: Partial<Panel>;
}
type GagFn = (c: Ctx) => (Gag | Beat)[];

const isGag = (g: Gag | Beat): g is Gag => 's' in g;

/** 대본 묶음을 컷으로 — 첫 그림 컷에 근거·해설을 단다 */
function pushGags(beats: Beat[], c: Ctx, title: string, list: (Gag | Beat)[], first: Partial<Panel>) {
  let done = false;
  list.forEach((g, i) => {
    if (!isGag(g)) {
      beats.push(g);
      return;
    }
    const extra = !done ? first : {};
    done = true;
    beats.push(cut(c, i === 0 ? title : `${title} ${i + 1}`, g.cap ?? '', g.s, { ...extra, ...g.x }));
  });
}

// ---------------------------------------------------------------------------
// 일간 — 타고난 기질 (10)
// ---------------------------------------------------------------------------
interface DayMaster {
  image: string;
  tag: string;
  note: string;
  gags: GagFn;
}

const DM: Record<number, DayMaster> = {
  0: {
    image: '하늘로 곧게 뻗는 큰 나무',
    tag: '직진밖에 모르는 사람',
    note: '갑목은 스스로 방향을 정하고 앞장서는 기질입니다. 모임에서 자연스럽게 결정을 맡게 되는 일이 많지만, 한번 정한 방향은 잘 바꾸지 않습니다.',
    gags: (c) => [
      {
        cap: '갑목(甲木) — 하늘로 곧게 뻗는 큰 나무.',
        s: { bg: 'street', cast: [c.me(170, 'smug', 'point'), c.other('friend', 440, 'surprised', 'stand', { dir: -1 })], talk: [say(0, '목적지는 저쪽! 무조건 직진이다!'), say(1, '거기 벽 있는데…')] },
      },
      { s: { bg: 'speed', cast: [c.me(330, 'dead', 'stand', { fx: ['stars'], sym: 'jump' })], talk: [], props: [{ kind: 'wall', x: 452 }], sfx: [{ text: '쾅!!', x: 170, y: 150, size: 72 }] } },
      {
        s: { bg: 'street', shot: 'bust', cast: [c.me(170, 'plain', 'cross', { acc: ['bandage'] }), c.mirror(440, 'smug', 'stand', { dir: -1 })], talk: [say(0, '…나무는 돌아가지 않는다.'), say(1, '그래서 이마가 맨날 빨갛구나.')] },
      },
    ],
  },
  1: {
    image: '휘어도 꺾이지 않는 덩굴',
    tag: '분위기를 읽고 사람을 잇는 사람',
    note: '을목은 상대에게 맞추는 능력이 뛰어나 사람과 사람을 잘 잇지만, 그만큼 속으로 신경을 많이 쓰는 기질입니다.',
    gags: (c) => [
      {
        cap: '을목(乙木) — 휘어도 꺾이지 않는 덩굴. 사람과 사람을 잇는다.',
        s: {
          bg: 'cafe',
          cast: [c.other('friend', 110, 'happy', 'stand'), c.me(300, 'happy', 'wave'), c.other('coworker', 490, 'happy', 'stand', { dir: -1 })],
          talk: [say(1, '둘이 취미가 똑같네! 인사해~', 'say', { young: '둘이 좋아하는 아이돌 똑같네! 인사해~' })],
        },
      },
      { s: { bg: 'white', shot: 'face', cast: [c.me(240, 'smile', 'stand', { fx: ['drops'], front: true })], talk: [think(0, '(눈치 레이더 풀가동 중…)')], props: [{ kind: 'battery', x: 480, y: 330, values: [3] }] } },
      { cap: '집에 오자마자.', s: { bg: 'bedroom', cast: [c.me(260, 'dead', 'lie'), c.mirror(480, 'plain', 'stand', { dir: -1 })], talk: [say(1, '덩굴도 집에 오면 꺾이는구나.')], sfx: [{ text: '털썩', x: 150, y: 190, size: 52 }] } },
    ],
  },
  2: {
    image: '하늘 한가운데 뜬 태양',
    tag: '등장만으로 분위기를 밝히는 사람',
    note: '병화는 감정과 생각이 그대로 드러나고, 주목받는 자리에서 에너지가 오르는 기질입니다. 대신 뜨겁게 시작한 일이 금방 식기도 합니다.',
    gags: (c) => [
      {
        cap: '병화(丙火) — 하늘의 태양. 등장부터 밝다.',
        s: { bg: 'burst', cast: [c.me(300, 'happy', 'cheer', { fx: ['sparkle'], sym: 'flare' })], talk: [shout(0, '다들 좋은 아침~!!!', { young: '얘들아 안녕~!!!', senior: '다들 좋은 아침이에요~!!!' })], sfx: [{ text: '번쩍!', x: 110, y: 330, size: 50, color: '#ffb000' }] },
      },
      {
        s: { bg: 'office', cast: [c.other('coworker', 170, 'plain', 'stand', { acc: ['sunglasses'] }), c.other('boss', 430, 'plain', 'cross', { acc: ['sunglasses'], dir: -1 })], talk: [say(0, '…눈부셔.', 'say'), say(1, '선글라스 챙기길 잘했군.', 'say', { young: '선글라스 챙기길 잘했다.', senior: '선글라스 챙기길 잘했네.' })] },
      },
      { s: { bg: 'sparkle', shot: 'bust', cast: [c.mirror(160, 'smug'), c.me(440, 'proud', 'hips', { dir: -1 })], talk: [say(0, '걸어 다니는 태양광 발전소.'), say(1, '그거 칭찬 맞지?')] } },
    ],
  },
  3: {
    image: '어둠을 밝히는 촛불',
    tag: '한 사람을 끝까지 비추는 사람',
    note: '정화는 넓게 비추기보다 가까운 사람을 따뜻하게 지키는 기질입니다. 대신 한번 서운하면 오래 기억합니다.',
    gags: (c) => [
      {
        cap: '정화(丁火) — 어둠을 밝히는 촛불. 한 사람을 끝까지 비춘다.',
        s: { bg: 'night', cast: [c.other('friend', 170, 'cry', 'stand'), c.me(430, 'smile', 'hold', { held: 'candle', dir: -1 })], talk: [say(0, '나 오늘 진짜 힘들었어…'), say(1, '다 말해. 밤새 들어 줄게.')] },
      },
      later('새벽 4시'),
      {
        s: { bg: 'night', cast: [c.other('friend', 160, 'sleep', 'stand', { fx: ['zzz'] }), c.me(430, 'star', 'hold', { held: 'book', acc: ['darkcircles'], dir: -1 })], talk: [say(1, '…그래서 그 선배가 뭐라고 했다고? 자세히!')], marks: [{ text: '본인이 더 신남', x: 300, y: 376, to: [392, 330] }] },
      },
    ],
  },
  4: {
    image: '묵직한 큰 산',
    tag: '웬만해선 안 흔들리는 사람',
    note: '무토는 위기에도 표정이 크게 흔들리지 않아 주변의 기둥이 되는 기질입니다. 대신 변화에는 느린 편입니다.',
    gags: (c) => [
      {
        cap: '무토(戊土) — 묵직한 큰 산. 웬만해선 안 흔들린다.',
        s: { bg: 'flame', cast: [c.other('friend', 160, 'scream', 'stand', { fx: ['drops'] }), c.me(440, 'plain', 'hold', { held: 'tea', dir: -1 })], talk: [shout(0, '큰일 났어!! 다 망했어!!'), say(1, '그래서, 점심은 뭐 먹을까?')], sfx: [{ text: '후루룩', x: 500, y: 250, size: 32, color: '#8a5a3c' }] },
      },
      { s: { bg: 'cafe', shot: 'bust', cast: [c.mirror(160, 'smug'), c.me(440, 'plain', 'hold', { held: 'bowl', dir: -1 })], talk: [say(0, '근데 3년째 같은 메뉴야.'), say(1, '검증된 맛이니까.')] } },
    ],
  },
  5: {
    image: '곡식을 길러 내는 밭',
    tag: '일단 먹이고 보는 사람',
    note: '기토는 주변 사람을 세심하게 챙기고 길러 내는 기질입니다. 대신 걱정이 많고 속마음을 잘 드러내지 않습니다.',
    gags: (c) => [
      {
        cap: '기토(己土) — 곡식을 길러 내는 밭. 일단 먹이고 본다.',
        s: { bg: 'kitchen', cast: [c.me(170, 'smile', 'hold', { held: 'bowl' }), c.other('friend', 440, 'surprised', 'stand', { dir: -1 })], talk: [say(0, '밥은 먹었어? 일단 먹어.'), say(1, '나 방금 먹었는…')] },
      },
      { s: { bg: 'kitchen', cast: [c.me(170, 'happy', 'hold', { held: 'spoon' }), c.other('friend', 440, 'soul', 'hold', { held: 'cake', fx: ['soul'], dir: -1 })], talk: [say(0, '더 먹어, 더!'), say(1, '엄마…?')] } },
      { s: { bg: 'kitchen', shot: 'bust', cast: [c.me(170, 'smile', 'hold', { held: 'spoon' }), c.mirror(440, 'shock', 'stand', { dir: -1 })], talk: [say(0, '거울 너도 좀 먹어.'), say(1, '난 거울인데…')] } },
    ],
  },
  6: {
    image: '단련될수록 강해지는 쇠',
    tag: '결론부터 말하는 사람',
    note: '경금은 판단이 빠르고 원칙이 분명한 기질입니다. 돌려 말하지 않아 신뢰를 얻지만, 말이 날카롭게 들릴 때가 있습니다.',
    gags: (c) => [
      {
        cap: '경금(庚金) — 단련된 쇠. 돌려 말하기 기능 없음.',
        s: {
          bg: 'meeting',
          cast: [c.other('boss', 120, 'smile', 'stand'), c.other('coworker', 300, 'nervous', 'stand', { fx: ['sweat'] }), c.me(480, 'plain', 'stand', { dir: -1 })],
          talk: [say(0, '다들 의견 있나?', 'say', { young: '다들 의견 있니?' }), think(1, '(아무도 말 안 하겠지…)')],
        },
      },
      { s: { bg: 'drama', drama: true, shot: 'bust', cast: [c.me(300, 'serious', 'point', { front: true })], talk: [say(0, '결론부터 말하겠습니다.', 'say', { young: '결론부터 말할게요.' })] }, cap: '그때였다.' },
      {
        s: {
          bg: 'meeting',
          cast: [c.other('boss', 120, 'blank', 'stand', { acc: ['stone'] }), c.other('coworker', 300, 'blank', 'stand', { acc: ['stone'] }), c.me(480, 'plain', 'cross', { dir: -1 })],
          talk: [say(2, '이 기획, 망했습니다.', 'say', { young: '이 발표, 망했어요.' })],
          sfx: [{ text: '정적…', x: 160, y: 100, size: 40, color: '#8a8f99', rot: -4 }],
        },
      },
    ],
  },
  7: {
    image: '정교하게 다듬어진 보석',
    tag: '1픽셀도 놓치지 않는 사람',
    note: '신금은 섬세한 감각과 높은 기준을 가진 기질입니다. 완성도가 높지만 스스로와 남에게 엄격해지기 쉽습니다.',
    gags: (c) => [
      {
        cap: '신금(辛金) — 정교한 보석. 디테일 탐지기 내장.',
        s: { bg: 'office', cast: [c.other('coworker', 170, 'proud', 'hold', { held: 'tablet' }), c.me(440, 'think', 'think', { dir: -1 })], talk: [say(0, '이 디자인, 완벽하죠?', 'say', { young: '이 포스터, 완벽하지?' }), think(1, '(음…)')] },
      },
      { cap: '그 순간, 나는 보았다.', s: { bg: 'drama', drama: true, shot: 'face', cast: [c.me(300, 'serious', 'stand', { front: true })], talk: [say(0, '…1픽셀.')] } },
      {
        s: { bg: 'office', cast: [c.me(170, 'smug', 'hold', { held: 'magnifier' }), c.other('coworker', 440, 'soul', 'stand', { fx: ['soul'], dir: -1 })], talk: [say(0, '여기 1픽셀 틀렸어요.', 'say', { young: '여기 1픽셀 틀렸어.' }), say(1, '그게… 보여요?', 'say', { young: '그게… 보여?' })] },
      },
    ],
  },
  8: {
    image: '끝없이 흐르는 큰 바다',
    tag: '꿈의 스케일이 바다급인 사람',
    note: '임수는 아이디어와 활동 범위가 넓은 기질입니다. 시야가 크지만 한곳에 오래 머무르기 어려워합니다.',
    gags: (c) => [
      {
        cap: '임수(壬水) — 끝없는 바다. 꿈의 스케일도 바다급.',
        s: { bg: 'cafe', cast: [c.me(170, 'star', 'cheer'), c.other('friend', 440, 'plain', 'stand', { dir: -1 })], talk: [shout(0, '나 세계 일주 갈 거야!'), say(1, '지난주엔 창업한다며?', 'say', { young: '지난주엔 유튜버 한다며?', senior: '지난주엔 귀농한다며?' })] },
      },
      { s: { bg: 'cafe', shot: 'bust', cast: [c.me(170, 'proud', 'hips'), c.other('friend', 440, 'blank', 'stand', { dir: -1 })], talk: [say(0, '그건 지난주의 나고.'), say(1, '……')] } },
      {
        s: {
          bg: 'room',
          cast: [c.mirror(120, 'smug', 'point')],
          talk: [say(0, '바다는 원래 파도가 많지.')],
          props: [{ kind: 'board', x: 410, y: 40, w: 250, label: '이번 주 꿈 목록', rows: ['월: 창업', '화: 유튜버', '수: 귀농', '목: 세계 일주', '금: 일단 잠'] }],
        },
      },
    ],
  },
  9: {
    image: '조용히 스며드는 빗물',
    tag: '말 안 해도 다 아는 사람',
    note: '계수는 직관과 공감 능력이 뛰어난 기질입니다. 대신 생각이 많아 혼자 걱정을 키우기 쉽습니다.',
    gags: (c) => [
      {
        cap: '계수(癸水) — 조용히 스며드는 빗물. 마음에도 스며든다.',
        s: { bg: 'rain', cast: [c.other('friend', 170, 'surprised', 'stand'), c.me(430, 'plain', 'wave', { held: 'umbrella', dir: -1 })], talk: [say(0, '나 아무 말도 안 했는데 어떻게 알았어?'), say(1, '얼굴에 다 쓰여 있어.')] },
      },
      {
        cap: '(진짜로 쓰여 있었다)',
        s: {
          bg: 'white',
          shot: 'face',
          focus: 0,
          cast: [c.other('friend', 300, 'plain', 'stand', { front: true })],
          talk: [],
          marks: [
            { text: '배고픔', x: 212, y: 266 },
            { text: '서운함', x: 388, y: 266 },
            { text: '월요병', x: 300, y: 346 },
          ],
        },
      },
      { s: { bg: 'rain', cast: [c.me(200, 'nervous', 'stand', { fx: ['cloud'] }), c.mirror(470, 'smug', 'stand', { dir: -1 })], talk: [think(0, '(남 걱정하느라 내 걱정은 두 배…)'), say(1, '그 먹구름, 네 거야.')] } },
    ],
  },
};

// ---------------------------------------------------------------------------
// 겉(월간) vs 속(일지) — 기대 vs 현실 분할 컷
// ---------------------------------------------------------------------------
const OUTER: Record<TenGod, { tag: string; half: (c: Ctx) => Omit<Half, 'label'> }> = {
  비견: { tag: '자기 길을 가는 사람', half: (c) => ({ bg: 'street', cast: [c.me(150, 'smug', 'stand', { acc: ['sunglasses'] })], talk: [say(0, '난 내 방식대로 간다.')] }) },
  겁재: { tag: '승부욕 강한 사람', half: (c) => ({ bg: 'gym', cast: [c.me(150, 'grin', 'fist', { fx: ['aura'] })], talk: [say(0, '가위바위보도 진심이야.')] }) },
  식신: { tag: '여유 있고 손재주 좋은 사람', half: (c) => ({ bg: 'kitchen', cast: [c.me(150, 'happy', 'hold', { held: 'cake' })], talk: [say(0, '인생 뭐 있어~ 맛있는 거 먹자!')] }) },
  상관: { tag: '말 잘하고 재치 있는 사람', half: (c) => ({ bg: 'stage', cast: [c.me(150, 'grin', 'phone', { held: 'mic' })], talk: [say(0, '제 얘기 좀 들어 보실래요?')] }) },
  편재: { tag: '통 크고 발 넓은 사람', half: (c) => ({ bg: 'street', cast: [c.me(150, 'happy', 'phone', { held: 'phone', fx: ['hearts'] })], talk: [say(0, '오늘 약속만 세 개!')] }) },
  정재: { tag: '꼼꼼하고 알뜰한 사람', half: (c) => ({ bg: 'room', cast: [c.me(150, 'proud', 'hold', { held: 'calculator' })], talk: [say(0, '가계부는 1원 단위까지.', 'say', { young: '용돈 기입장은 1원 단위까지.' })] }) },
  편관: { tag: '카리스마 있는 사람', half: (c) => ({ bg: 'office', cast: [c.me(150, 'serious', 'cross')], talk: [say(0, '…왜 다들 조용해?')] }) },
  정관: { tag: '반듯하고 믿음직한 사람', half: (c) => ({ bg: 'office', cast: [c.me(150, 'proud', 'hold', { held: 'document', acc: ['halo'] })], talk: [say(0, '맡겨만 주세요.')] }) },
  편인: { tag: '생각이 독특한 사람', half: (c) => ({ bg: 'space', cast: [c.me(150, 'think', 'think', { fx: ['bulb'] })], talk: [say(0, '외계인은 있다고 봐.')] }) },
  정인: { tag: '따뜻하고 아는 게 많은 사람', half: (c) => ({ bg: 'library', cast: [c.me(150, 'smile', 'hold', { held: 'book' })], talk: [say(0, '모르는 거 있으면 물어봐~')] }) },
};

const INNER: Record<TenGod, { tag: string; half: (c: Ctx) => Omit<Half, 'label'> }> = {
  비견: { tag: '혼자서도 괜찮고 싶은 마음', half: (c) => ({ bg: 'room', cast: [c.me(150, 'plain', 'cross')], talk: [think(0, '(도움 같은 건 필요 없… 쬐끔 필요해)')] }) },
  겁재: { tag: '누구에게도 지기 싫은 마음', half: (c) => ({ bg: 'bedroom', cast: [c.me(150, 'rage', 'hold', { held: 'controller' })], talk: [think(0, '(이길 때까지 한 판만 더)')] }) },
  식신: { tag: '편안하고 싶은 마음', half: (c) => ({ bg: 'bedroom', cast: [c.me(150, 'happy', 'hold', { held: 'chicken' })], talk: [think(0, '(아무것도 안 하고 눕고 싶다)')] }) },
  상관: { tag: '하고 싶은 말이 많은 마음', half: (c) => ({ bg: 'room', cast: [c.me(150, 'plain', 'stand', { acc: ['zipper'] })], talk: [think(0, '(할 말 100개 참는 중)')] }) },
  편재: { tag: '더 넓은 세상을 원하는 마음', half: (c) => ({ bg: 'room', cast: [c.me(150, 'star', 'hold', { held: 'ticket' })], talk: [think(0, '(다 때려치우고 떠날까?)')] }) },
  정재: { tag: '안정을 지키고 싶은 마음', half: (c) => ({ bg: 'room', cast: [c.me(150, 'nervous', 'phone', { held: 'phone', fx: ['drops'] })], talk: [think(0, '(통장 잔고… 괜찮겠지?)', { young: '(용돈… 남았겠지?)' })] }) },
  편관: { tag: '긴장을 놓지 못하는 마음', half: (c) => ({ bg: 'room', cast: [c.me(150, 'nervous', 'stand', { fx: ['sweat'] })], talk: [think(0, '(가스 잠갔나? 문 잠갔나?)')] }) },
  정관: { tag: '인정받고 싶은 마음', half: (c) => ({ bg: 'room', cast: [c.me(150, 'blush', 'phone', { held: 'phone' })], talk: [think(0, '(보고서… 칭찬해 주려나?)', { young: '(선생님이 칭찬해 주려나?)' })] }) },
  편인: { tag: '아무도 모르는 혼자만의 세계', half: (c) => ({ bg: 'space', cast: [c.me(150, 'blank', 'stand')], talk: [think(0, '(지금 내 세계에 접속 중)')] }) },
  정인: { tag: '기대고 싶은 마음', half: (c) => ({ bg: 'bedroom', cast: [c.me(150, 'cry', 'hold', { held: 'plush' })], talk: [think(0, '(누가 나 좀 챙겨 줘…)')] }) },
};

// ---------------------------------------------------------------------------
// 가장 강한 기운 — 타고난 무기 (5)
// ---------------------------------------------------------------------------
const STRONG: Record<TenGodGroup, { title: string; gags: GagFn; note: string }> = {
  비겁: {
    title: '혼자 해내는 힘',
    note: '비겁이 강하면 스스로 해내려는 힘과 경쟁심이 큽니다. 독립·창업에 유리하지만 고집과 지출도 함께 커집니다.',
    gags: (c) => [
      { s: { bg: 'gym', cast: [c.me(220, 'rage', 'lift', { held: 'barbell', fx: ['aura', 'shake'], sym: 'flare' }), c.other('friend', 480, 'surprised', 'stand', { dir: -1 })], talk: [say(1, '도와줄까?'), shout(0, '필요 없어! 내 힘으로 한다!')] } },
      { s: { bg: 'gym', cast: [c.me(300, 'dead', 'lie', { held: 'barbell', fx: ['stars'] })], talk: [whisper(0, '…쬐끔만 도와줘.')], sfx: [{ text: '쿵!', x: 480, y: 170, size: 64 }] } },
    ],
  },
  식상: {
    title: '아이디어와 표현력',
    note: '식상이 강하면 아이디어와 표현력이 넘칩니다. 만들고 말하는 일에서 빛나지만 마무리가 약해지기 쉽습니다.',
    gags: (c) => [
      { s: { bg: 'cafe', cast: [c.me(200, 'star', 'cheer', { fx: ['bulbs'], sym: 'jump' }), c.other('friend', 470, 'tired', 'stand', { dir: -1 })], talk: [shout(0, '아이디어 떠올랐어!'), say(1, '오늘만 열한 번째야.')], sfx: [{ text: '팡! 팡!', x: 360, y: 120, size: 36, color: '#ffb000' }] } },
      { s: { bg: 'room', cast: [c.me(160, 'grin', 'shrug'), c.mirror(470, 'smug', 'point', { dir: -1 })], talk: [say(1, '그래서, 실행한 건 몇 개?'), say(0, '…그건 다음 아이디어로 해결할게.')], props: [{ kind: 'bulbpile', x: 300 }] } },
    ],
  },
  재성: {
    title: '돈과 기회를 보는 눈',
    note: '재성이 강하면 돈의 흐름과 현실 감각이 빠릅니다. 기회를 잘 잡지만, 욕심이 앞서면 무리한 투자를 하기 쉽습니다.',
    gags: (c) => [
      { s: { bg: 'street', cast: [c.me(170, 'money', 'hold', { held: 'calculator' }), c.other('friend', 440, 'plain', 'stand', { dir: -1 })], talk: [think(0, '(저거 사서 되팔면 30% 남겠는데?)'), say(1, '우리 그냥 산책 나온 거잖아.')] } },
      { s: { bg: 'street', shot: 'bust', cast: [c.mirror(160, 'smug'), c.me(440, 'money', 'stand', { fx: ['sparkle'], dir: -1 })], talk: [say(0, '인간 계산기 켜졌네.'), say(1, '세상이 다 견적으로 보여.')], props: [{ kind: 'cloudcoin', x: 300, y: 330 }] } },
    ],
  },
  관성: {
    title: '책임감과 원칙',
    note: '관성이 강하면 책임감과 규범 의식이 뚜렷해 조직에서 인정받기 쉽습니다. 대신 압박과 스트레스도 크게 받습니다.',
    gags: (c) => [
      {
        s: { bg: 'office', cast: [c.other('boss', 170, 'smile', 'hold', { held: 'document' }), c.me(440, 'proud', 'stand', { dir: -1 })], talk: [say(0, '이것도 좀 부탁해도 되겠나?', 'say', { young: '이것도 부탁해도 될까?', senior: '이것도 부탁해도 될까요?' }), say(1, '맡겨 주십시오!', 'say', { young: '맡겨 주세요!' })] },
      },
      { s: { bg: 'office', cast: [c.me(240, 'nervous', 'lift', { held: 'docs', fx: ['shake', 'sweat'] }), c.mirror(490, 'smug', 'stand', { dir: -1 })], talk: [whisper(0, '맡은 건… 끝까지…'), say(1, '책임감은 국가대표, 허리는 동네 대표.')], sfx: [{ text: '휘청', x: 110, y: 380, size: 40 }] } },
    ],
  },
  인성: {
    title: '배우고 이해하는 힘',
    note: '인성이 강하면 배우고 이해하는 힘이 큽니다. 자격·전문성으로 인정받지만 생각이 많아 실행이 늦어지기 쉽습니다.',
    gags: (c) => [
      { s: { bg: 'library', cast: [c.me(300, 'think', 'hold', { held: 'book' })], talk: [say(0, '제대로 알고 시작해야지.')] } },
      later('3년 후…'),
      { s: { bg: 'library', cast: [c.me(270, 'proud', 'hold', { held: 'book', acc: ['beard', 'cobweb'] }), c.mirror(490, 'plain', 'stand', { dir: -1 })], talk: [say(1, '그래서… 시작은 언제 해?'), say(0, '이제 거의 다 알았어. 거의.')], props: [{ kind: 'bookfort', x: 270 }] } },
    ],
  },
};

const DOMINANT_NOTE: Record<TenGod, string> = {
  비견: '그중에서도 비견이 두드러져, 대등한 관계와 자기 방식을 중시합니다.',
  겁재: '그중에서도 겁재가 두드러져, 승부욕이 강하고 돈이 나가는 일도 잦습니다.',
  식신: '그중에서도 식신이 두드러져, 한 분야를 꾸준히 파고드는 장인 기질이 있습니다.',
  상관: '그중에서도 상관이 두드러져, 틀을 깨는 말과 재치가 강점이자 구설의 원인이 됩니다.',
  편재: '그중에서도 편재가 두드러져, 크게 벌고 크게 쓰는 활동형 재물 감각이 있습니다.',
  정재: '그중에서도 정재가 두드러져, 꼼꼼하게 모으고 관리하는 안정형 재물 감각이 있습니다.',
  편관: '그중에서도 편관이 두드러져, 압박 속에서 강해지지만 스트레스도 큽니다.',
  정관: '그중에서도 정관이 두드러져, 원칙과 신뢰로 인정받는 모범생 기질이 있습니다.',
  편인: '그중에서도 편인이 두드러져, 남다른 직관과 특수한 분야에 대한 관심이 큽니다.',
  정인: '그중에서도 정인이 두드러져, 배움과 보살핌, 자격과 문서 운이 강합니다.',
};

// ---------------------------------------------------------------------------
// 솔직한 약점 — 위에서부터 먼저 해당하는 것 하나 (없으면 일간의 그림자)
// ---------------------------------------------------------------------------
interface Weak {
  title: string;
  gags: GagFn;
  basis: (a: SajuAnalysis) => string;
  note: string;
}

const gpOf = (a: SajuAnalysis, g: TenGodGroup) => pct(a.elements.groupPercent[g]);

const WEAKNESS: (Weak & { test: (a: SajuAnalysis) => boolean })[] = [
  {
    test: (a) => a.elements.tenGodCount['상관'] > 0 && a.elements.tenGodCount['정관'] > 0,
    title: '옳은 말을 윗사람 앞에서 참지 못한다',
    gags: (c) => [
      { s: { bg: 'drama', drama: true, cast: [c.me(190, 'angry', 'point'), c.other('boss', 440, 'shock', 'stand', { dir: -1 })], talk: [shout(0, '부장님, 그 방식은 틀렸습니다!', { young: '선생님, 그건 틀린 것 같아요!', senior: '회장님, 그건 아니라고 봅니다!' })] } },
      {
        s: { bg: 'office', cast: [c.other('boss', 170, 'rage', 'cross', { fx: ['steam', 'vein'] }), c.me(440, 'soul', 'stand', { fx: ['soul'], dir: -1 })], talk: [say(0, '…자네, 방금 뭐라고 했나?', 'say', { young: '…너, 방금 뭐라고 했니?', senior: '…방금 뭐라고 하셨소?' })], marks: [{ text: '정의 구현 완료\n평판은 로그아웃', x: 300, y: 70 }] },
      },
    ],
    basis: (a) => `상관 ${a.elements.tenGodCount['상관']}개 · 정관 ${a.elements.tenGodCount['정관']}개 (상관견관)`,
    note: '상관과 정관이 함께 있으면 재능과 비판 정신이 규칙·윗사람과 부딪히기 쉽습니다. 말의 내용보다 “때와 방식”을 고르는 것이 손해를 줄이는 방법입니다.',
  },
  {
    test: (a) => wealthCapacity(a) === '작음',
    title: '돈을 붙잡아 두는 힘이 약하다',
    gags: (c) => [
      {
        s: {
          bg: 'sparkle',
          cast: [c.me(170, 'star', 'cheer', { held: 'money' })],
          talk: [shout(0, '월급 들어왔다!!', { young: '용돈 들어왔다!!', senior: '연금 들어왔다!!' })],
          props: [{ kind: 'phonebig', x: 450, y: 50, label: '알림', rows: [c.young ? '용돈 입금 +5만' : c.senior ? '연금 입금 +120만' : '월급 입금 +300만'] }],
        },
      },
      {
        cap: '사흘 뒤.',
        s: {
          bg: 'room',
          cast: [c.me(170, 'soul', 'stand', { fx: ['soul'] })],
          talk: [],
          props: [{ kind: 'phonebig', x: 450, y: 30, label: '알림', rows: c.young ? ['편의점 -4,500', '떡볶이 -8,000', '잔액 1,200원'] : c.senior ? ['병원비 -12만', '손주 용돈 -30만', '잔액 3만 원'] : ['카드 결제 -120만', '카드 결제 -95만', '잔액 3,200원'] }],
          marks: [{ text: c.young ? '용돈 로그아웃' : c.senior ? '연금 로그아웃' : '월급 로그아웃', x: 170, y: 410 }],
        },
      },
    ],
    basis: (a) => `재성 ${gpOf(a, '재성')}`,
    note: '재성이 약하면 돈에 대한 감각이 무디고 새는 돈을 알아차리기 어렵습니다. 의지보다 자동이체·통장 쪼개기 같은 구조가 효과적입니다.',
  },
  {
    test: (a) => wealthCapacity(a) === '부담',
    title: '돈과 일이 내 힘보다 크다',
    gags: (c) => [
      { s: { bg: 'street', cast: [c.me(300, 'nervous', 'hold', { held: 'moneybag', fx: ['shake', 'drops'] })], talk: [say(0, '벌긴 버는데… 왜 이렇게 무겁지…', 'say', { young: '하고 싶은 건 많은데… 왜 벅차지…' })] } },
      { s: { bg: 'street', cast: [c.me(260, 'dead', 'lie', { held: 'moneybag', fx: ['stars'] }), c.mirror(490, 'smug', 'stand', { dir: -1 })], talk: [say(1, '돈이 너보다 큰 사주야. 같이 들 사람을 구해.')], sfx: [{ text: '쿵!', x: 110, y: 170, size: 60 }] } },
    ],
    basis: (a) => `신약 ${pct(a.strength.score)} · 재성 ${gpOf(a, '재성')} (재다신약)`,
    note: '재물의 기운은 많은데 나를 돕는 힘이 약한 구조(재다신약)입니다. 기회는 많아도 감당할 체력과 사람이 부족하면 손에 쥐는 것이 적습니다. 욕심을 줄이고 함께할 사람을 구하세요.',
  },
  {
    test: (a) => a.elements.groupPercent['비겁'] >= 30,
    title: '사람 때문에 돈이 새기 쉽다',
    gags: (c) => [
      {
        s: {
          bg: 'cafe',
          cast: [c.other('friend', 110, 'cry', 'beg'), c.other('coworker', 300, 'cry', 'beg'), c.me(490, 'nervous', 'stand', { fx: ['sweat'], dir: -1 })],
          talk: [say(0, '이번 달만…', 'say', { young: '떡볶이 한 번만…' }), say(1, '나도 이번 달만…', 'say', { young: '나도 한 번만…' })],
        },
      },
      { s: { bg: 'cafe', shot: 'bust', cast: [c.me(200, 'soul', 'hold', { held: 'wallet', fx: ['moths'] }), c.mirror(470, 'smug', 'stand', { dir: -1 })], talk: [think(0, '(이번이 몇 번째더라…)'), say(1, '의리는 만렙, 통장은 1렙.')] } },
    ],
    basis: (a) => `비겁 ${gpOf(a, '비겁')}`,
    note: '비겁이 많으면 의리가 강하고 사람을 잘 챙기지만, 나눠 가질 사람도 많아 돈이 모이기 어렵습니다. 빌려줄 돈은 “돌려받지 못해도 괜찮은 만큼”만 정하세요.',
  },
  {
    test: (a) => a.elements.groupPercent['관성'] >= 35,
    title: '책임과 압박을 혼자 짊어진다',
    gags: (c) => [
      { s: { bg: 'officeNight', cast: [c.me(300, 'tired', 'lift', { held: 'globe', heldLabel: '책임', fx: ['sweat', 'shake'] })], talk: [think(0, '(이것도 내 책임… 저것도 내 책임…)')] } },
      { s: { bg: 'officeNight', shot: 'bust', cast: [c.mirror(160, 'plain'), c.me(440, 'shock', 'stand', { dir: -1 })], talk: [say(0, '그거 원래 팀 거야.', 'say', { young: '그거 원래 모둠 거야.' }), shout(1, '…진짜?')] } },
    ],
    basis: (a) => `관성 ${gpOf(a, '관성')}`,
    note: '관성이 많으면 책임감이 강한 만큼 스트레스를 몸으로 받기 쉽습니다. 일을 나누는 연습과 퇴근 후의 확실한 휴식이 필요합니다.',
  },
  {
    test: (a) => a.elements.groupPercent['인성'] >= 35,
    title: '생각이 많아 실행이 늦다',
    gags: (c) => [
      { s: { bg: 'bedroom', cast: [c.me(220, 'think', 'think')], talk: [think(0, '(아직 준비가 덜 됐어. 다음 달에 하자.)')], props: [{ kind: 'calendar', x: 470, y: 170, label: '다음 달', label2: 'D-?' }] } },
      later('1년 후…'),
      { s: { bg: 'bedroom', cast: [c.me(220, 'think', 'think', { acc: ['cobweb'] }), c.mirror(470, 'smug', 'stand', { dir: -1 })], talk: [say(1, '70%만 준비되면 출발. 그게 처방이야.'), say(0, '…다음 달부터.')] } },
    ],
    basis: (a) => `인성 ${gpOf(a, '인성')}`,
    note: '인성이 많으면 신중하고 배우는 힘이 크지만, 준비만 하다 기회를 놓치기 쉽습니다. “70% 준비되면 시작”을 원칙으로 삼으세요.',
  },
  {
    test: (a) => a.elements.groupPercent['식상'] >= 35,
    title: '벌여 놓은 일은 많은데 마무리가 약하다',
    gags: (c) => [
      { s: { bg: 'room', cast: [c.me(300, 'star', 'cheer', { fx: ['bulbs'] })], talk: [shout(0, '기타도 배우고, 요가도 하고, 유튜브도 할 거야!')] } },
      { s: { bg: 'room', cast: [c.me(170, 'blank', 'stand'), c.mirror(470, 'smug', 'stand', { dir: -1 })], talk: [say(1, '그래서 끝낸 건 몇 개?'), say(0, '…0개.')], props: [{ kind: 'boxes', x: 330, label: '기타', label2: '요가' }], sfx: [{ text: '와르르', x: 330, y: 230, size: 40 }] } },
    ],
    basis: (a) => `식상 ${gpOf(a, '식상')}`,
    note: '식상이 많으면 재능과 아이디어가 넘치지만 에너지가 흩어지기 쉽고, 말이 앞서 구설도 생깁니다. 동시에 진행하는 일을 두세 개로 제한하세요.',
  },
  {
    test: (a) => a.elements.groupPercent['관성'] < 4,
    title: '규칙과 통제를 유독 못 견딘다',
    gags: (c) => [
      {
        s: { bg: 'office', cast: [c.other('boss', 170, 'angry', 'point'), c.me(440, 'plain', 'stand', { fx: ['sweat'], dir: -1 })], talk: [say(0, '출근은 9시까지라고 했지?', 'say', { young: '등교는 8시 반까지라고 했지?', senior: '모임은 10시까지라고 했잖소?' }), think(1, '(규칙… 숨 막혀…)')] },
      },
      { s: { bg: 'park', cast: [c.other('boss', 130, 'shock', 'point'), c.me(390, 'happy', 'cheer', { acc: ['wings'], lift: 70 })], talk: [shout(0, '어딜 가!'), shout(1, '자유다~!')], sfx: [{ text: '푸드덕', x: 520, y: 330, size: 36 }] } },
    ],
    basis: (a) => `관성 ${gpOf(a, '관성')}`,
    note: '관성이 거의 없으면 자유롭고 독립적이지만, 정해진 규칙과 상하 관계를 견디기 어렵습니다. 스스로 정한 마감과 루틴이 그 빈자리를 채워 줍니다.',
  },
  {
    test: (a) => a.elements.groupPercent['인성'] < 4,
    title: '쉬어 갈 줄 모르고 달린다',
    gags: (c) => [
      { s: { bg: 'officeNight', cast: [c.me(300, 'tired', 'run', { fx: ['speed', 'sweat'] })], talk: [shout(0, '쉬면 뒤처져! 계속 달려!')], props: [{ kind: 'wheel', x: 300 }] } },
      { cap: '그리고 전원이 꺼졌다.', s: { bg: 'officeNight', cast: [c.me(230, 'dead', 'flat'), c.mirror(500, 'smug', 'stand', { dir: -1 })], talk: [say(1, '충전 안 한 폰은 결국 꺼져.')], props: [{ kind: 'battery', x: 330, y: 130, values: [0] }], sfx: [{ text: '픽', x: 120, y: 260, size: 44, color: '#8a8f99' }] } },
    ],
    basis: (a) => `인성 ${gpOf(a, '인성')}`,
    note: '인성이 거의 없으면 배우고 쉬는 데 서툴러, 에너지를 채우지 못한 채 쓰기만 하기 쉽습니다. 일정에 “쉬는 시간”을 먼저 넣으세요.',
  },
  {
    test: (a) => a.elements.groupPercent['식상'] < 4,
    title: '속마음을 말하지 못해 오해가 쌓인다',
    gags: (c) => [
      { s: { bg: 'cafe', cast: [c.other('friend', 170, 'sad', 'stand'), c.me(440, 'plain', 'stand', { dir: -1 })], talk: [say(0, '서운했으면 그때 말을 하지!'), say(1, '……')] } },
      { s: { bg: 'cafe', shot: 'bust', cast: [c.me(160, 'plain', 'stand'), c.mirror(480, 'smug', 'stand', { dir: -1 })], talk: [think(0, '(사실 그때 네가 약속을 세 번 미뤘고, 그 전에도…)'), say(1, '속으로만 장편소설 쓰는 중.')] } },
    ],
    basis: (a) => `식상 ${gpOf(a, '식상')}`,
    note: '식상이 거의 없으면 실력이 있어도 드러내지 못하고, 감정을 표현하지 못해 관계가 오해로 꼬이기 쉽습니다. 작게라도 말로 꺼내는 연습이 필요합니다.',
  },
  {
    test: (a) => a.elements.groupPercent['비겁'] < 4,
    title: '내 의견을 지키는 힘이 약하다',
    gags: (c) => [
      {
        s: {
          bg: 'cafe',
          cast: [c.other('friend', 110, 'happy', 'point'), c.other('coworker', 300, 'happy', 'stand'), c.me(490, 'smile', 'stand', { dir: -1 })],
          talk: [say(0, '다들 매운 거 괜찮지?'), say(2, '응, 좋아!')],
        },
      },
      { s: { bg: 'cafe', shot: 'bust', cast: [c.me(200, 'cry', 'hold', { held: 'noodle', fx: ['fire'] }), c.mirror(480, 'plain', 'stand', { dir: -1 })], talk: [think(0, '(나 매운 거 못 먹는데…)'), say(1, '의견은 말해야 생겨.')] } },
    ],
    basis: (a) => `비겁 ${gpOf(a, '비겁')}`,
    note: '비겁이 거의 없으면 협조적이지만 내 몫과 내 의견을 지키는 힘이 약합니다. 중요한 결정은 하루 미루고 혼자 생각해 보는 습관이 도움이 됩니다.',
  },
];

/** 해당하는 약점이 없을 때: 일간의 그림자 */
const DM_SHADOW: Record<number, Omit<Weak, 'basis'>> = {
  0: {
    title: '자존심 때문에 먼저 굽히지 못한다',
    gags: (c) => [
      { s: { bg: 'room', cast: [c.other('friend', 170, 'sad', 'stand'), c.me(440, 'plain', 'cross', { dir: -1 })], talk: [say(0, '그냥 미안하다고 하면 되잖아.'), think(1, '(내가 왜 먼저…?)')] } },
      { cap: '새벽 2시.', s: { bg: 'bedroom', cast: [c.me(170, 'nervous', 'phone', { held: 'phone' })], talk: [think(0, '(보낼까… 말까…)')], props: [{ kind: 'phonebig', x: 450, y: 40, label: '메시지', rows: ['미안…', '(삭제)', '미안해', '(삭제)'] }] } },
    ],
    note: '갑목의 곧은 기질은 자존심이 걸린 순간 고집이 됩니다. 관계를 지키는 쪽은 결국 먼저 손을 내미는 사람입니다.',
  },
  1: {
    title: '거절을 못 해 남의 일까지 떠안는다',
    gags: (c) => [
      { s: { bg: 'office', cast: [c.other('coworker', 170, 'smile', 'hold', { held: 'document' }), c.me(440, 'smile', 'stand', { dir: -1 })], talk: [say(0, '이것도 부탁해도 될까?'), say(1, '아… 네! 할게요!', 'say', { young: '아… 응! 할게!' })] } },
      { s: { bg: 'officeNight', cast: [c.me(300, 'soul', 'lift', { held: 'docs', fx: ['soul'] })], talk: [think(0, '(또 ‘네’라고 했다…)')] } },
    ],
    note: '을목은 맞춰 주는 능력이 큰 만큼 거절이 어렵습니다. 속으로 쌓인 서운함이 한 번에 터지기 전에, 작은 거절부터 연습하세요.',
  },
  2: {
    title: '시작은 뜨겁지만 뒷심이 약하다',
    gags: (c) => [
      { s: { bg: 'flame', cast: [c.me(300, 'star', 'fist', { fx: ['aura'], sym: 'flare' })], talk: [shout(0, '이 프로젝트, 내가 불태운다!', { young: '이 발표, 내가 불태운다!' })] } },
      later('3일 후…'),
      { s: { bg: 'gloom', cast: [c.me(220, 'tired', 'stand', { sym: 'off' }), c.mirror(470, 'smug', 'stand', { dir: -1 })], talk: [think(0, '(…불이 꺼졌다.)'), say(1, '3일 천하.')] } },
    ],
    note: '병화는 시작하는 힘이 누구보다 크지만, 반복되는 일에서 금방 흥미를 잃습니다. 마무리를 맡아 줄 꼼꼼한 파트너가 필요합니다.',
  },
  3: {
    title: '서운한 일을 오래 기억한다',
    gags: (c) => [
      { s: { bg: 'cafe', cast: [c.other('friend', 170, 'surprised', 'stand'), c.me(440, 'serious', 'cross', { dir: -1 })], talk: [say(0, '내가 그런 말을 했다고?'), say(1, '2019년 3월 14일 오후 2시 17분.')] } },
      { s: { bg: 'cafe', shot: 'bust', cast: [c.mirror(160, 'shock'), c.me(440, 'plain', 'cross', { dir: -1 })], talk: [say(0, '기억력이 서운함 한정으로 무한대야.'), say(1, '잊으면 지는 거야.')] } },
    ],
    note: '정화는 마음이 깊은 만큼 서운함도 오래갑니다. 혼자 삭이다 한 번에 터지기 전에, 그때그때 짧게 말하는 편이 관계를 지킵니다.',
  },
  4: {
    title: '변화를 미루다 타이밍을 놓친다',
    gags: (c) => [
      { s: { bg: 'park', cast: [c.me(200, 'plain', 'cross', { acc: ['roots'] })], talk: [think(0, '(바꾸는 건… 다음에 생각하자.)')], props: [{ kind: 'signpost', x: 450, label: '변화', label2: '그대로' }] } },
      later('10년 후…'),
      { s: { bg: 'park', cast: [c.me(200, 'plain', 'cross', { acc: ['roots', 'nest'] }), c.mirror(470, 'shock', 'stand', { dir: -1 })], talk: [think(0, '(…다음에 생각하자.)'), shout(1, '머리에 새가 둥지를 틀었어!')] } },
    ],
    note: '무토의 묵직함은 안정감을 주지만, 바꿔야 할 때도 버티게 만듭니다. 결정을 미루는 것도 하나의 선택이라는 점을 기억하세요.',
  },
  5: {
    title: '걱정과 생각이 많아 혼자 마음고생',
    gags: (c) => [
      { s: { bg: 'bedroom', cast: [c.me(300, 'nervous', 'think', { fx: ['drops'] })], talk: [think(0, '(아까 그 말, 괜히 했나…?)')] } },
      { s: { bg: 'gloom', cast: [c.me(200, 'soul', 'stand', { fx: ['cloud'] }), c.mirror(470, 'smug', 'stand', { dir: -1 })], talk: [say(1, '걱정 공장 24시간 가동 중이네.'), think(0, '(야근 수당도 없어…)')] } },
    ],
    note: '기토는 세심한 만큼 걱정이 많습니다. 머릿속에서 돌리는 대신 종이에 적어 보면 생각보다 별일 아닌 경우가 많습니다.',
  },
  6: {
    title: '맞는 말을 너무 날카롭게 한다',
    gags: (c) => [
      { s: { bg: 'office', cast: [c.me(170, 'plain', 'cross'), c.other('coworker', 440, 'cry', 'stand', { dir: -1 })], talk: [say(0, '틀린 걸 틀렸다고 한 것뿐인데?'), say(1, '말을 꼭 그렇게 해야 돼요?', 'say', { young: '말을 꼭 그렇게 해야 돼?' })] } },
      { s: { bg: 'office', shot: 'bust', cast: [c.mirror(160, 'smug', 'point'), c.me(440, 'nervous', 'stand', { dir: -1 })], talk: [say(0, '말에 칼날이 달렸어. 앞에 쿠션 한 장 깔자.'), say(1, '쿠션… 어디서 팔아?')] } },
    ],
    note: '경금의 직설은 신뢰를 주지만, 같은 말도 날이 서면 사람을 잃습니다. 결론 앞에 한 문장의 배려를 붙여 보세요.',
  },
  7: {
    title: '기준이 높아 스스로를 지치게 만든다',
    gags: (c) => [
      { s: { bg: 'studio', cast: [c.me(300, 'angry', 'hold', { held: 'paper' })], talk: [say(0, '이것도 별로, 저것도 별로…')], props: [{ kind: 'crumpled', x: 300 }] } },
      { s: { bg: 'studio', cast: [c.me(230, 'dead', 'lie'), c.mirror(490, 'plain', 'stand', { dir: -1 })], talk: [say(1, '완벽은 퇴근이 없어.')], props: [{ kind: 'crumpled', x: 260 }, { kind: 'trash', x: 520 }] } },
    ],
    note: '신금의 높은 기준은 완성도를 만들지만, 끝없이 고치다 지치기 쉽습니다. “여기까지면 충분하다”는 선을 미리 정해 두세요.',
  },
  8: {
    title: '관심사가 자주 바뀌어 뿌리내리기 어렵다',
    gags: (c) => [
      { s: { bg: 'room', cast: [c.me(200, 'star', 'hold', { held: 'box' })], talk: [shout(0, '이번 건 진짜야! 베이킹!')], props: [{ kind: 'boxes', x: 450, label: '기타', label2: '요가' }] } },
      { s: { bg: 'room', shot: 'bust', cast: [c.mirror(160, 'smug'), c.me(440, 'blush', 'stand', { dir: -1 })], talk: [say(0, '그 말, 이번 달에만 네 번째야.'), say(1, '바다는 원래 출렁이는 거야.')] } },
    ],
    note: '임수는 흐르는 물처럼 새로운 곳을 향하지만, 한곳에 머물러야 쌓이는 것들을 놓치기 쉽습니다. 하나만은 끝까지 해 보는 경험이 필요합니다.',
  },
  9: {
    title: '생각이 꼬리를 물어 불안을 키운다',
    gags: (c) => [
      { s: { bg: 'space', cast: [c.me(240, 'shock', 'phone', { held: 'phone', fx: ['lightning'] })], talk: [think(0, '(답장이 없네… 나한테 화났나? 절교? 이민?)')] } },
      { s: { bg: 'room', cast: [c.me(170, 'blank', 'phone', { held: 'phone' })], talk: [], props: [{ kind: 'phonebig', x: 440, y: 50, label: '친구', rows: ['ㅋㅋ 미안 자다 깼어'] }], marks: [{ text: '걱정한 시간: 3시간', x: 170, y: 70 }] } },
    ],
    note: '계수는 예민한 직관 덕분에 남의 마음을 잘 읽지만, 그만큼 걱정도 잘 만듭니다. 확인되지 않은 걱정은 일단 내려놓는 연습이 필요합니다.',
  },
};

// ---------------------------------------------------------------------------
// 명경이의 처방 — 용신 (그리고 그걸 오해하는 나)
// ---------------------------------------------------------------------------
const YONGSIN: Record<Element, { rx: [string, string]; oops: (c: Ctx) => Scene; real: string; note: string }> = {
  wood: {
    rx: ['복용법: 아침 산책 30분', '추가: 배우기·식물 키우기'],
    oops: (c) => ({ bg: 'park', cast: [c.me(250, 'love', 'hold', { fx: ['hearts'] })], talk: [say(0, '나무랑 친해지라는 거지?')], props: [{ kind: 'tree', x: 360 }] }),
    real: '아침에 걷고, 새로 배우라고!',
    note: '목(木) 기운은 성장과 시작의 힘입니다. 아침 시간에 새로 배우고, 식물을 키우고, 숲길을 걷는 습관이 부족한 기운을 채워 줍니다.',
  },
  fire: {
    rx: ['복용법: 햇빛 하루 20분', '추가: 사람 만나기·땀 흘리기'],
    oops: (c) => ({ bg: 'kitchen', cast: [c.me(260, 'cry', 'hold', { held: 'noodle', fx: ['fire', 'drops'] })], talk: [shout(0, '불맛을 보라는 거지?! 으아 매워!')] }),
    real: '햇빛 보고, 사람 만나고, 땀 흘리라고!',
    note: '화(火) 기운은 열정과 표현의 힘입니다. 햇빛을 충분히 쬐고, 사람을 만나 이야기하고, 땀이 날 만큼 움직이는 습관이 도움이 됩니다.',
  },
  earth: {
    rx: ['복용법: 같은 시간에 밥·잠', '추가: 약속 지키기'],
    oops: (c) => ({ bg: 'beach', cast: [c.me(260, 'happy', 'hold', { held: 'shovel' })], talk: [say(0, '흙이랑 가까워지라는 거지? 모래찜질!')] }),
    real: '같은 시간에 먹고 자고, 약속 지키라고!',
    note: '토(土) 기운은 중심과 안정의 힘입니다. 먹고 자는 시간을 일정하게 지키고, 약속과 신용을 지키는 습관이 흔들리는 기운을 잡아 줍니다.',
  },
  metal: {
    rx: ['복용법: 하루 한 번 정리', '추가: 안 쓰는 것 덜어 내기'],
    oops: (c) => ({ bg: 'room', cast: [c.me(270, 'proud', 'hips', { wear: 'armor', fx: ['sparkle'] })], talk: [say(0, '쇠를 가까이하라는 거지? 갑옷 장착!')], sfx: [{ text: '철컹', x: 470, y: 200, size: 44, color: '#8a9bb8' }] }),
    real: '안 쓰는 거 정리하고 덜어 내라고!',
    note: '금(金) 기운은 결단과 정리의 힘입니다. 주변의 물건과 관계를 덜어 내고, 스스로 규칙을 세우는 습관이 흐트러진 기운을 모아 줍니다.',
  },
  water: {
    rx: ['복용법: 하루 7시간 숙면', '추가: 혼자 생각하는 시간'],
    oops: (c) => ({ bg: 'room', cast: [c.me(270, 'happy', 'hold', { held: 'water', fx: ['drops'] })], talk: [say(0, '물 마시라는 거지? 2리터 원샷!')], sfx: [{ text: '벌컥벌컥', x: 470, y: 220, size: 40, color: '#3b82f6' }] }),
    real: '그 물 말고! 푹 자고 혼자 생각하라고!',
    note: '수(水) 기운은 휴식과 지혜의 힘입니다. 충분히 자고 쉬며, 혼자 생각하고 기록하는 시간을 따로 두는 습관이 과열된 기운을 식혀 줍니다.',
  },
};

function dominantOf(a: SajuAnalysis, g: TenGodGroup): TenGod | null {
  const tgc = a.elements.tenGodCount;
  const tgh = a.elements.tenGodHidden;
  const list = (Object.keys(tgc) as TenGod[]).filter((t) => groupOf(t) === g && tgc[t] + tgh[t] > 0);
  if (!list.length) return null;
  return list.sort((x, y) => tgc[y] + tgh[y] * 0.3 - (tgc[x] + tgh[x] * 0.3))[0];
}

export function dmLabel(a: SajuAnalysis): string {
  const s = STEMS[a.pillars.day.stem];
  return `${s.ko}${ELEMENT_KO[s.element]}(${s.hanja}${ELEMENT_HANJA[s.element]})`;
}

export function personaEpisode(a: SajuAnalysis, x: CrossReport | null): Comic {
  const c = makeCtx(a, x, 'persona');
  const ds = a.pillars.day.stem;
  const D = DM[ds];
  const dm = dmLabel(a);
  const gp = a.elements.groupPercent;
  const ys = a.yongsin.yongsin;
  const month = a.positions.find((p) => p.pos === 'month')!;
  const day = a.positions.find((p) => p.pos === 'day')!;
  const outerTg = month.stemTenGod === '일간' ? '비견' : month.stemTenGod;
  const O = OUTER[outerTg];
  const I = INNER[day.branchTenGod];
  const beats: Beat[] = [];

  // 표지
  beats.push(cut(c, '표지', '', { bg: 'burst', cast: [c.me(430, 'grin', 'hips', { dir: -1, sym: 'jump' })], talk: [] }, { cover: { kicker: '1화', title: '나라는 사람', tagline: `${dm} — ${D.tag}` } }));

  // 도입 — 명경이 등장
  beats.push(
    cut(c, '평범한 저녁', '평범한 어느 저녁.', { bg: 'room', cast: [c.me(240, 'plain', 'phone', { held: 'phone' })], talk: [think(0, '(오늘도 무난했다…)')], props: [{ kind: 'tv', x: 480 }] }),
  );
  beats.push(
    cut(c, '명경이 등장', '', {
      bg: 'sparkle',
      cast: [c.me(170, 'shock', 'stand', { fx: ['exclaim'], sym: 'jump' }), c.mirror(440, 'happy', 'cheer', { dir: -1 })],
      talk: [say(1, '안녕? 나는 네 사주를 비추는 거울, 명경이야!'), shout(0, '거울이… 말을 해?!')],
      sfx: [{ text: '번쩍!', x: 520, y: 400, size: 46, color: '#ffb000' }],
    }),
  );
  beats.push(
    cut(c, '해부 예고', '', { bg: 'room', shot: 'bust', cast: [c.mirror(160, 'smug', 'point'), c.me(440, 'nervous', 'stand', { fx: ['sweat'], dir: -1 })], talk: [say(0, hey(c, '오늘 네 사주, 탈탈 털어 줄게.')), say(1, '그런 건 동의한 적 없는데요…')] }, {
      note: '이 웹툰은 사주의 구조를 개그로 옮긴 것입니다. 웃긴 장면의 뼈대는 모두 내 사주의 글자에서 나왔고, 컷 왼쪽 아래에 근거를 적어 두었습니다.',
    }),
  );

  // 1. 타고난 기질 (일간)
  beats.push(chapter('제1장', '타고난 기질', { basis: `${pillarHanja(a.pillars.day)}일주 · 일간 ${STEMS[ds].hanja}` }));
  pushGags(beats, c, '타고난 기질', D.gags(c), { basis: `일간 ${STEMS[ds].hanja} · ${pillarHanja(a.pillars.day)}일주`, note: `일간(태어난 날의 천간)은 사주에서 “나 자신”을 뜻하는 글자입니다. ${dm}은 ${D.image}에 비유합니다. ${D.note}`, tone: 'neutral' });

  // 2. 겉과 속
  beats.push(chapter('제2장', '겉과 속'));
  beats.push(
    cut(c, '겉과 속', '', {
      bg: 'white',
      cast: [],
      talk: [],
      split: [
        { label: '남들이 보는 나', ...O.half(c) },
        { label: '실제 나', ...I.half(c) },
      ],
    }, {
      basis: `월간 ${STEMS[month.pillar.stem].hanja}(${outerTg}) · 일지 ${pillarHanja(a.pillars.day).slice(1)}(${day.branchTenGod})`,
      note: `태어난 달의 천간(월간)은 사회에서 드러나는 얼굴, 태어난 날의 지지(일지)는 가까운 사람에게만 보이는 속마음의 자리입니다. 밖에서는 ‘${O.tag}’(${outerTg})으로 보이지만, 속에는 ‘${I.tag}’(${day.branchTenGod})이 있습니다. 겉과 속이 다를수록 남들이 모르는 피로가 쌓입니다.`,
    }),
  );
  const same = groupOf(outerTg) === groupOf(day.branchTenGod);
  beats.push(
    cut(c, '겉과 속 반응', `겉: ${O.tag}\n속: ${I.tag}`, same
      ? { bg: 'sparkle', shot: 'bust', cast: [c.mirror(160, 'surprised'), c.me(440, 'proud', 'hips', { dir: -1 })], talk: [say(0, '겉이랑 속이 같은 편이네? 투명한 사람!'), say(1, '숨길 게 없는 타입이지.')] }
      : { bg: 'flowers', shot: 'bust', h: 460, cast: [c.mirror(160, 'smug'), c.me(440, 'blush', 'stand', { dir: -1 })], talk: [say(0, '이 반전, 아는 사람만 알지.'), say(1, '…들켰다.')] }),
  );

  // 3. 타고난 무기
  const top = topGroups(a)[0];
  const S = STRONG[top];
  const dom = dominantOf(a, top);
  beats.push(chapter('제3장', '타고난 무기', { basis: `${top} ${pct(gp[top])}` }));
  pushGags(
    beats,
    c,
    '타고난 무기',
    S.gags(c).map((g, i) => (i === 0 && isGag(g) ? { ...g, cap: `가장 강한 기운: ${top}(${pct(gp[top])}) — ${S.title}` } : g)),
    { basis: `${top} ${pct(gp[top])}${dom ? ` · 중심 십성 ${dom}` : ''}`, note: `${S.note}${dom ? ` ${DOMINANT_NOTE[dom]}` : ''}`, tone: 'good' },
  );

  // 4. 솔직한 약점
  const weak = WEAKNESS.find((w) => w.test(a));
  const W: Weak = weak ?? { ...DM_SHADOW[ds], basis: () => `일간 ${STEMS[ds].hanja}의 그림자` };
  beats.push(text('하지만…\n명경이는 좋은 말만 하는 거울이 아니었다.', 'black'));
  beats.push(chapter('제4장', '솔직한 약점'));
  pushGags(
    beats,
    c,
    '솔직한 약점',
    W.gags(c).map((g, i) => (i === 0 && isGag(g) && !g.cap ? { ...g, cap: `솔직한 약점: ${W.title}` } : g)),
    { basis: W.basis(a), note: W.note, tone: 'bad' },
  );

  // 5. 명경이의 처방
  const Y = YONGSIN[ys];
  const el = `${EL_WORD[ys]}(${ELEMENT_HANJA[ys]})`;
  beats.push(chapter('제5장', '명경이의 처방'));
  beats.push(
    cut(c, '처방전', '용신 — 사주의 균형을 잡아 주는 기운.', {
      bg: 'room',
      cast: [c.mirror(130, 'proud', 'point')],
      talk: [say(0, hey(c, '너한테 필요한 건 이 기운이야!'))],
      props: [{ kind: 'rx', x: 405, y: 60, w: 300, rows: [`용신: ${el}`, Y.rx[0], Y.rx[1]] }],
    }, {
      basis: `용신 ${ELEMENT_KO[ys]}(${ELEMENT_HANJA[ys]}) · ${a.yongsin.method}`,
      note: `용신은 사주의 치우친 기운을 바로잡아 주는 오행입니다. ${c.who}의 사주는 ${a.strength.level}이고, ${a.yongsin.method}의 방법으로 ${ELEMENT_KO[ys]}(${ELEMENT_HANJA[ys]})을 용신으로 봅니다.`,
      tone: 'good',
    }),
  );
  beats.push(cut(c, '처방 오해', '다음 날.', Y.oops(c)));
  beats.push(
    cut(c, '진짜 처방', '', {
      bg: 'burst',
      shot: 'bust',
      cast: [c.mirror(160, 'angry', 'point'), c.me(440, 'shock', 'stand', { dir: -1 })],
      talk: [shout(0, '그거 말고!!'), say(0, Y.real)],
    }, { note: `${Y.note} 내 사주에 맞는 색·음식·장소·습관은 풀이 리포트의 ‘개운법’ 탭에 모아 두었습니다.` }),
  );

  // 마무리
  const headline = x?.card.headline ?? D.tag;
  beats.push(
    cut(c, '마무리', `결론: 나는 ‘${headline}’.`, { bg: 'sparkle', shot: 'bust', cast: [c.me(170, 'proud', 'hips'), c.mirror(440, 'smug', 'stand', { dir: -1 })], talk: [say(1, '요약하니까 꽤 멀쩡한 사람 같네?'), shout(0, '원래 멀쩡하거든?!')] }, {
      note: x ? '마지막 한 줄은 사주·운·띠·MBTI·직업을 교차 검증한 ‘정체성 한 줄’에서 가져왔습니다.' : '마지막 한 줄은 일간의 기질을 요약한 것입니다.',
    }),
  );
  beats.push(text(`다음 화 예고 — 2화 「${workTitle(c)}」\n${c.young ? '학교는 왜 매일 가야 하는가' : c.senior ? '은퇴했는데 왜 더 바쁜가' : '월급은 왜 스쳐 지나가는가'}`, 'soft'));

  return {
    id: 'persona',
    no: 1,
    title: '나라는 사람',
    subtitle: `${pillarHanja(a.pillars.day)}일주 · ${a.strength.level} · 용신 ${ELEMENT_KO[ys]}(${ELEMENT_HANJA[ys]})`,
    beats,
  };
}
