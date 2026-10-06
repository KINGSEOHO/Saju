/**
 * 웹툰 그림 갤러리 — 모든 표정·자세·소품·효과·장식·배경·소품·카메라를 렌더링해 예외 없이 그려지는지 확인한다.
 * COMIC_GALLERY=경로.html 을 주면 눈으로 확인할 수 있는 HTML 파일도 만든다.
 */
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { PanelArt, TextBeatArt } from '../src/comic/art.tsx';
import type { Acc, Actor, Bg, Face, Fx, Held, MonsterKind, Panel, Pose, PropSpec, TextBeat } from '../src/comic/types.ts';

const FACES: Face[] = ['plain', 'smile', 'happy', 'grin', 'smug', 'proud', 'surprised', 'shock', 'scream', 'sad', 'cry', 'angry', 'rage', 'dead', 'soul', 'star', 'money', 'love', 'blush', 'nervous', 'tired', 'sleep', 'think', 'serious', 'drool', 'blank'];
const POSES: Pose[] = ['stand', 'wave', 'cheer', 'point', 'hold', 'think', 'cross', 'shrug', 'facepalm', 'fist', 'hips', 'run', 'jump', 'otl', 'lie', 'flat', 'sit', 'bow', 'beg', 'lift', 'phone'];
const HELD: Held[] = ['phone', 'coffee', 'tea', 'document', 'docs', 'book', 'laptop', 'tablet', 'money', 'moneybag', 'wallet', 'card', 'mic', 'trophy', 'candle', 'magnifier', 'water', 'noodle', 'barbell', 'umbrella', 'calculator', 'paper', 'flag', 'cake', 'plant', 'globe', 'crayon', 'piggy', 'test', 'bag', 'box', 'sword', 'controller', 'plush', 'ticket', 'chicken', 'spoon', 'bowl', 'shovel', 'heart'];
const FX: Fx[] = ['sweat', 'drops', 'vein', 'steam', 'gloom', 'sparkle', 'hearts', 'question', 'exclaim', 'bulb', 'bulbs', 'zzz', 'music', 'soul', 'aura', 'stars', 'shake', 'speed', 'moths', 'cloud', 'dots', 'lightning', 'fire'];
const ACC: Acc[] = ['sunglasses', 'glasses', 'bandage', 'beard', 'cobweb', 'roots', 'nest', 'stone', 'zipper', 'headband', 'crown', 'halo', 'cape', 'wings', 'redface', 'darkcircles', 'cap'];
const BGS: Bg[] = ['room', 'bedroom', 'office', 'officeNight', 'meeting', 'cafe', 'street', 'subway', 'park', 'school', 'library', 'gym', 'beach', 'mountain', 'night', 'rain', 'stage', 'shop', 'hospital', 'studio', 'map', 'dungeon', 'kitchen', 'white', 'speed', 'burst', 'gloom', 'sparkle', 'flame', 'dark', 'drama', 'space', 'flowers', 'lightning', 'blue'];
const PROPS: PropSpec['kind'][] = ['desk', 'monitor', 'chair', 'sofa', 'bed', 'table', 'whiteboard', 'window', 'door', 'wall', 'tree', 'bench', 'signpost', 'calendar', 'clock', 'books', 'bookfort', 'papers', 'crumpled', 'boxes', 'bulbpile', 'coins', 'trash', 'plant', 'tv', 'podium', 'cage', 'wheel', 'chest', 'lockdoor', 'flag', 'gift'];
const MONSTERS: MonsterKind[] = ['slime', 'ghost', 'golem', 'dragon', 'bat'];
const ELS = ['wood', 'fire', 'earth', 'metal', 'water'] as const;
const COLORS = ['#7cc68d', '#f2836b', '#f0c25e', '#b9c4da', '#6aa1e6'];

const chunk = <T>(xs: T[], n: number) => Array.from({ length: Math.ceil(xs.length / n) }, (_, i) => xs.slice(i * n, i * n + n));
const me = (x: number, extra: Partial<Actor> = {}): Actor => ({ role: 'me', x, face: 'smile', pose: 'stand', gender: 'male', outfit: '#f2836b', el: 'fire', ...extra });
const panel = (title: string, cast: Actor[], extra: Partial<Panel> = {}): Panel => ({ title, bg: 'room', cap: title, cast, talk: [], basis: '갤러리', ...extra });

export function galleryPanels(): Panel[] {
  const out: Panel[] = [];
  // 표정 — 얼굴 클로즈업 (남·여, 오행 번갈아)
  FACES.forEach((f, i) =>
    out.push(panel(`표정 ${f}`, [me(300, { face: f, gender: i % 2 ? 'female' : 'male', el: ELS[i % 5], outfit: COLORS[i % 5], front: true })], { shot: 'face', bg: 'white', cap: f, h: 300 })),
  );
  // 자세 — 전신 3명씩
  chunk(POSES, 3).forEach((ps, i) => out.push(panel(`자세 ${i + 1}: ${ps.join(', ')}`, ps.map((p, k) => me(110 + k * 190, { pose: p, face: 'grin', gender: k % 2 ? 'female' : 'male', el: ELS[k] })), { bg: 'park' })));
  // 오행 마크 상태
  (['normal', 'wilt', 'flare', 'jump', 'off'] as const).forEach((sym) =>
    out.push(panel(`오행 마크 ${sym}`, ELS.map((el, k) => me(64 + k * 118, { el, sym, outfit: COLORS[k], scale: 0.78, face: sym === 'wilt' ? 'sad' : 'smile' })), { bg: 'white' })),
  );
  // 소품
  chunk(HELD, 4).forEach((hs, i) =>
    out.push(panel(`소품 ${i + 1}: ${hs.join(', ')}`, hs.map((h, k) => me(80 + k * 147, { pose: h === 'docs' || h === 'globe' || h === 'barbell' ? 'lift' : h === 'umbrella' || h === 'mic' ? 'wave' : 'hold', held: h, face: 'smile', scale: 0.85, heldLabel: h === 'test' ? '100' : undefined })), { bg: 'cafe' })),
  );
  // 효과
  chunk(FX, 3).forEach((fs, i) => out.push(panel(`효과 ${i + 1}: ${fs.join(', ')}`, fs.map((f, k) => me(110 + k * 190, { fx: [f], face: f === 'soul' ? 'soul' : 'surprised', held: f === 'moths' ? 'wallet' : undefined, pose: f === 'moths' ? 'hold' : f === 'speed' ? 'run' : 'stand' })), { bg: 'white', cap: '' })));
  // 장식
  chunk(ACC, 3).forEach((as, i) => out.push(panel(`장식 ${i + 1}: ${as.join(', ')}`, as.map((x, k) => me(110 + k * 190, { acc: [x], face: 'plain', gender: k === 1 ? 'female' : 'male' })), { bg: 'room' })));
  // 나이·성별
  out.push(panel('나이 (남): kid · teen · adult · senior', (['kid', 'teen', 'adult', 'senior'] as const).map((age, k) => me(80 + k * 147, { age, face: 'smile', wear: age === 'teen' ? 'uniform' : age === 'senior' ? 'cardigan' : 'tee' })), { bg: 'park' }));
  out.push(panel('나이 (여): kid · teen · adult · senior', (['kid', 'teen', 'adult', 'senior'] as const).map((age, k) => me(80 + k * 147, { age, gender: 'female', face: 'grin', outfit: '#6aa1e6', el: 'water', wear: age === 'teen' ? 'uniform' : age === 'senior' ? 'cardigan' : 'tee' })), { bg: 'park' }));
  // 역할
  for (const g of ['female', 'male'] as const) {
    out.push(panel(`역할 (${g}): partner · friend · boss · coworker`, (['partner', 'friend', 'boss', 'coworker'] as const).map((role, k) => ({ role, x: 80 + k * 147, face: 'smile', pose: 'stand', gender: g }) as Actor), { bg: 'street' }));
    out.push(panel(`역할 (${g}): parent · teacher · child · elder`, (['parent', 'teacher', 'child', 'elder'] as const).map((role, k) => ({ role, x: 80 + k * 147, face: 'smile', pose: 'stand', gender: g, age: role === 'child' ? 'kid' : role === 'elder' ? 'senior' : 'adult' }) as Actor), { bg: 'room' }));
  }
  // 옷
  chunk(['tee', 'shirt', 'suit', 'hoodie', 'coat', 'apron', 'uniform', 'pajama', 'cardigan', 'armor'] as const, 4).forEach((ws, i) =>
    out.push(panel(`옷 ${i + 1}: ${ws.join(', ')}`, ws.map((w, k) => me(80 + k * 147, { wear: w, face: 'smile', gender: k % 2 ? 'female' : 'male', outfit: COLORS[k], el: ELS[k] })), { bg: 'office' })),
  );
  // 명경이
  out.push(
    panel('명경이 표정·자세', (['smile', 'smug', 'shock', 'angry', 'happy'] as const).map((f, k) => ({ role: 'mirror', x: 64 + k * 118, face: f, pose: (['stand', 'point', 'cheer', 'cross', 'hold'] as const)[k], held: k === 4 ? 'mic' : undefined, scale: 0.9 }) as Actor), { bg: 'sparkle' }),
  );
  // 몬스터
  out.push(panel('몬스터', MONSTERS.map((m, k) => ({ role: 'monster', monster: m, x: 64 + k * 118, face: k % 2 ? 'angry' : 'plain', pose: 'stand', scale: 0.62, tag: m }) as Actor), { bg: 'dungeon' }));
  // 배경
  BGS.forEach((bg) => out.push(panel(`배경 ${bg}`, [me(420, { face: 'plain', dir: -1 })], { bg, cap: bg, h: 360 })));
  // 소품
  chunk(PROPS, 2).forEach((ps, i) =>
    out.push(panel(`소품 ${i + 1}: ${ps.join(', ')}`, [], { bg: 'white', props: ps.map((kind, k) => ({ kind, x: 160 + k * 280, y: kind === 'calendar' ? 200 : kind === 'whiteboard' ? 180 : kind === 'clock' ? 120 : undefined, label: '라벨', label2: '둘째' })), h: 380, cap: '' })),
  );
  // 글자 소품
  out.push(panel('상태창·처방전', [me(130, { face: 'smug' })], { bg: 'map', props: [{ kind: 'status', x: 420, y: 60, rows: ['이름: 서호', '직업: 개발자', '현재 대운: 丙午 (재성)', '버프: 수입 운 ↑'] }] }));
  out.push(panel('처방전', [{ role: 'mirror', x: 120, face: 'smug', pose: 'point' }], { bg: 'room', props: [{ kind: 'rx', x: 400, y: 70, rows: ['용신: 물(水)', '복용법: 하루 7시간 숙면', '주의: 밤샘 금지'] }] }));
  out.push(panel('그래프·점수판', [], { bg: 'white', props: [{ kind: 'graph', x: 170, y: 60, values: [44, 61, 52] }, { kind: 'score', x: 450, y: 80, label: '사주 궁합', label2: '84점' }], cap: '' }));
  out.push(panel('휴대폰·배터리·구름동전', [], { bg: 'white', props: [{ kind: 'phonebig', x: 150, y: 40, label: '알림', rows: ['월급 입금 +300만', '카드 결제 -120만', '카드 결제 -180만'] }, { kind: 'battery', x: 420, y: 120, values: [3] }, { kind: 'cloudcoin', x: 420, y: 300 }], cap: '' }));
  out.push(panel('아이템 상점', [{ role: 'mirror', x: 520, face: 'happy', pose: 'hold' }], { bg: 'shop', props: [{ kind: 'shelf', x: 240, y: 90, w: 440, rows: ['검정·남색', '북쪽 산책', '검은콩', '물병', '숙면'] }] }));
  // 카메라
  out.push({
    title: '상반신 대화',
    bg: 'cafe',
    shot: 'bust',
    cast: [me(160, { face: 'grin', pose: 'point' }), { role: 'friend', x: 450, face: 'shock', pose: 'stand', gender: 'female', dir: -1 }],
    talk: [
      { by: 0, text: '이번엔 진짜 세계 일주 간다!' },
      { by: 1, text: '지난주엔 창업한다며?!', kind: 'shout' },
    ],
    basis: '갤러리',
  });
  out.push({
    title: '얼굴 컷 + 극화체',
    bg: 'drama',
    shot: 'face',
    drama: true,
    cast: [me(300, { face: 'serious', front: true })],
    talk: [{ by: 0, text: '…1픽셀.' }],
    cap: '그 순간, 나는 보았다.',
    basis: '갤러리',
  });
  out.push({
    title: '극화체 전신',
    bg: 'office',
    drama: true,
    cast: [me(200, { face: 'angry', pose: 'point' }), { role: 'boss', x: 440, face: 'shock', pose: 'stand', gender: 'male', dir: -1 }],
    talk: [{ by: 0, text: '부장님, 그 방식은 틀렸습니다!', kind: 'shout' }],
    basis: '갤러리',
  });
  out.push({
    title: '효과음·주석',
    bg: 'street',
    cast: [me(300, { face: 'dead', pose: 'lie', fx: ['stars'] })],
    talk: [],
    sfx: [{ text: '털썩', x: 470, y: 160, size: 56 }],
    marks: [{ text: '본인 맞음', x: 160, y: 140, to: [260, 300] }],
    basis: '갤러리',
  });
  out.push({
    title: '기대 vs 현실',
    bg: 'white',
    cast: [],
    talk: [],
    split: [
      { label: '남들이 보는 나', bg: 'office', cast: [me(150, { face: 'proud', pose: 'hold', held: 'document', wear: 'suit', acc: ['halo'] })], talk: [{ by: 0, text: '맡겨만 주세요.' }] },
      { label: '실제 나', bg: 'bedroom', cast: [me(150, { face: 'soul', pose: 'stand', wear: 'pajama', fx: ['soul'] })], talk: [{ by: 0, text: '(아무것도 하기 싫다…)', kind: 'think' }] },
    ],
    basis: '월간 정관 · 일지 식신',
  });
  out.push({ title: '표지', bg: 'burst', cast: [me(430, { face: 'grin', pose: 'hips', dir: -1, el: 'wood', outfit: '#7cc68d' })], talk: [], cover: { kicker: '1화', title: '나라는 사람', tagline: '갑목(甲木) — 직진밖에 모르는 사람' } });
  return out;
}

const beats: TextBeat[] = [
  { type: 'text', text: '제1장 · 타고난 기질', style: 'chapter', no: '1' },
  { type: 'text', text: '3시간 후…', style: 'time' },
  { type: 'text', text: '그날, 나는 깨달았다.\n나무는 돌아가지 않는다는 것을.', style: 'black' },
  { type: 'text', text: '사주는 정해진 운명이 아니라 흐름의 지도다.', style: 'soft' },
];

describe('웹툰 그림 갤러리', () => {
  it('모든 표정·자세·소품·효과·배경을 예외 없이 그린다', () => {
    const svgs = galleryPanels().map((p) => renderToStaticMarkup(createElement(PanelArt, { p })));
    const texts = beats.map((b) => renderToStaticMarkup(createElement(TextBeatArt, { b })));
    for (const s of [...svgs, ...texts]) {
      expect(s).toMatch(/^<svg/);
      expect(s).not.toMatch(/NaN|undefined|Infinity/);
    }
    const out = process.env.COMIC_GALLERY;
    if (out) {
      const font = resolve('node_modules/pretendard/dist/web/variable/woff2/PretendardVariable.woff2');
      const panels = galleryPanels();
      writeFileSync(
        out,
        `<!doctype html><meta charset="utf-8"><style>@font-face{font-family:'Pretendard Variable';font-weight:45 920;src:url('file://${font}') format('woff2-variations')}body{margin:0;background:#ccc;font-family:sans-serif}.g{display:grid;grid-template-columns:repeat(2,600px);gap:10px;padding:10px;align-items:start}figure{margin:0;background:#fff}figcaption{font-size:12px;padding:4px}</style><div class="g">${[...svgs, ...texts]
          .map((s, i) => `<figure id="p${i}">${s}<figcaption>${i < panels.length ? panels[i].title : beats[i - panels.length].text}</figcaption></figure>`)
          .join('')}</div>`,
      );
    }
  });
});
