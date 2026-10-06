/**
 * 웹툰 그림 갤러리 — 모든 표정·자세·옷·소품·배경·카메라를 렌더링해 예외 없이 그려지는지 확인한다.
 * COMIC_GALLERY=경로.html 을 주면 눈으로 확인할 수 있는 HTML 파일도 만든다.
 */
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { PanelArt, TextBeatArt } from '../src/comic/art.tsx';
import type { Actor, Bg, Face, Fx, Held, Mood, Panel, Pose, PropSpec, Wear } from '../src/comic/types.ts';

const FACES: Face[] = ['neutral', 'smile', 'grin', 'laugh', 'sad', 'cry', 'angry', 'surprised', 'worried', 'determined', 'nervous', 'love', 'tired', 'proud', 'thinking', 'shock', 'shy', 'calm', 'annoyed', 'sparkle'];
const POSES: Pose[] = ['idle', 'cheer', 'point', 'think', 'hold', 'wave', 'facepalm', 'fist', 'fighting', 'shrug', 'cross', 'cheeks', 'hips', 'scratch', 'mouth'];
const WEARS: Wear[] = ['tee', 'shirt', 'suit', 'hoodie', 'knit', 'blouse', 'coat', 'apron', 'uniform', 'track', 'cardigan', 'dress', 'kidtee', 'pajama'];
const HELD: Held[] = ['document', 'phone', 'book', 'money', 'trophy', 'coffee', 'gift', 'mic', 'heart', 'wallet', 'umbrella', 'brush', 'cake', 'certificate', 'notebook', 'drawing', 'coin', 'bag', 'laptop', 'tablet', 'flower'];
const FX: Fx[] = ['sweat', 'anger', 'sparkle', 'hearts', 'gloom', 'exclaim', 'question', 'bulb', 'zzz', 'music', 'steam', 'flame', 'cloud', 'shine', 'tears', 'dots'];
const BGS: Bg[] = ['office', 'officeNight', 'home', 'cafe', 'park', 'city', 'school', 'night', 'mountain', 'stage', 'library', 'dinner', 'crossroad', 'rain', 'sea', 'money', 'gym', 'bedroom', 'burst', 'gloom', 'sparkle', 'hospital', 'studio', 'street'];
const MOODS: Mood[] = ['soft', 'sparkle', 'gloom', 'tone', 'lines', 'warm', 'cool', 'dark', 'flowers'];
const PROPS: PropSpec['kind'][] = ['desk', 'papers', 'laptop', 'coins', 'moneyBag', 'chartUp', 'chartDown', 'books', 'signpost', 'bench', 'table', 'plant', 'boxes', 'calendar', 'clock', 'whiteboard', 'bed', 'dumbbell', 'easel', 'monitor'];

const chunk = <T>(xs: T[], n: number) => Array.from({ length: Math.ceil(xs.length / n) }, (_, i) => xs.slice(i * n, i * n + n));
const me = (x: number, extra: Partial<Actor> = {}): Actor => ({ role: 'me', x, face: 'smile', pose: 'idle', gender: 'male', outfit: '#ec7966', ...extra });
const panel = (title: string, actors: Actor[], extra: Partial<Panel> = {}): Panel => ({ title, bg: 'home', caption: title, actors, lines: [], basis: '갤러리', ...extra });

export function galleryPanels(): Panel[] {
  const out: Panel[] = [];
  // 표정 — 얼굴 클로즈업 (남·여 번갈아)
  FACES.forEach((f, i) =>
    out.push(panel(`표정 ${f}`, [me(300, { face: f, gender: i % 2 ? 'female' : 'male', outfit: ['#6cb27f', '#ec7966', '#e6b553', '#9eaccc', '#5a8fd8'][i % 5], front: true })], { shot: 'close', mood: 'soft', caption: f })),
  );
  // 자세 — 전신 3명씩
  chunk(POSES, 3).forEach((ps, i) => out.push(panel(`자세 ${i + 1}: ${ps.join(', ')}`, ps.map((p, k) => me(110 + k * 190, { pose: p, face: 'grin', gender: k % 2 ? 'female' : 'male' })), { bg: 'park' })));
  // 옷 — 3명씩
  chunk(WEARS, 3).forEach((ws, i) =>
    out.push(panel(`옷 ${i + 1}: ${ws.join(', ')}`, ws.map((w, k) => me(110 + k * 190, { wear: w, face: 'smile', gender: k === 1 ? 'female' : 'male', age: w === 'kidtee' ? 'kid' : w === 'uniform' ? 'teen' : 'adult', outfit: ['#5a8fd8', '#ec7966', '#6cb27f'][k] })), { bg: 'office' })),
  );
  // 나이·성별
  out.push(panel('나이 (남): kid · teen · adult · senior', (['kid', 'teen', 'adult', 'senior'] as const).map((age, k) => me(80 + k * 147, { age, face: 'smile' })), { bg: 'park' }));
  out.push(panel('나이 (여): kid · teen · adult · senior', (['kid', 'teen', 'adult', 'senior'] as const).map((age, k) => me(80 + k * 147, { age, gender: 'female', face: 'grin', outfit: '#5a8fd8' })), { bg: 'park' }));
  // 역할
  out.push(
    panel(
      '역할: partner · friend · boss · coworker (여)',
      (['partner', 'friend', 'boss', 'coworker'] as const).map((role, k) => ({ role, x: 80 + k * 147, face: 'smile', pose: 'idle', gender: 'female' }) as Actor),
      { bg: 'city' },
    ),
  );
  out.push(
    panel(
      '역할: partner · friend · boss · coworker (남)',
      (['partner', 'friend', 'boss', 'coworker'] as const).map((role, k) => ({ role, x: 80 + k * 147, face: 'smile', pose: 'idle', gender: 'male' }) as Actor),
      { bg: 'city' },
    ),
  );
  out.push(
    panel(
      '역할: parent · teacher · child · elder',
      (['parent', 'teacher', 'child', 'elder'] as const).map((role, k) => ({ role, x: 80 + k * 147, face: 'smile', pose: 'idle', gender: k === 1 ? 'male' : 'female', age: role === 'child' ? 'kid' : role === 'elder' ? 'senior' : 'adult' }) as Actor),
      { bg: 'home' },
    ),
  );
  out.push(
    panel('역할 (남): parent · teacher · elder + 명경이', [
      { role: 'parent', x: 80, face: 'smile', pose: 'idle', gender: 'male' },
      { role: 'teacher', x: 230, face: 'smile', pose: 'idle', gender: 'female' },
      { role: 'elder', x: 380, face: 'laugh', pose: 'idle', gender: 'male', age: 'senior' },
      { role: 'mirror', x: 520, face: 'smile', pose: 'idle' },
    ]),
  );
  // 소품
  chunk(HELD, 3).forEach((hs, i) =>
    out.push(panel(`소품 ${i + 1}: ${hs.join(', ')}`, hs.map((h, k) => me(110 + k * 190, { pose: h === 'umbrella' || h === 'mic' ? 'wave' : 'hold', held: h, face: 'smile' })), { bg: 'cafe' })),
  );
  // 효과
  chunk(FX, 3).forEach((fs, i) => out.push(panel(`효과 ${i + 1}: ${fs.join(', ')}`, fs.map((f, k) => me(110 + k * 190, { fx: [f], face: 'surprised' })), { bg: 'burst', caption: '' })));
  // 카메라
  out.push({
    title: '상반신 대화',
    bg: 'cafe',
    shot: 'bust',
    caption: '상반신 컷 — 두 사람이 마주 본다',
    actors: [me(150, { face: 'grin', pose: 'hold', held: 'coffee' }), { role: 'friend', x: 450, face: 'surprised', pose: 'idle', gender: 'female', dir: -1 }],
    lines: [
      { by: 1, text: '진짜? 벌써 다 정했어?' },
      { by: 0, text: '응, 코스는 내가 다 짜 왔지!' },
    ],
    basis: '일간 갑목',
  });
  out.push({
    title: '클로즈업 독백',
    bg: 'bedroom',
    shot: 'close',
    caption: '하지만 속마음은…',
    actors: [me(220, { face: 'worried', dir: 1, gender: 'female', outfit: '#5a8fd8' })],
    lines: [{ by: 0, text: '(혹시 내가 너무 앞서간 걸까…)', kind: 'think' }],
  });
  out.push({ title: '눈 클로즈업', bg: 'night', shot: 'eyes', caption: '', actors: [me(300, { face: 'determined', front: true })], lines: [], sfx: [{ text: '번쩍!', x: 500, y: 70, color: '#ffd84d' }] });
  out.push({
    title: '명경이 등장',
    bg: 'home',
    shot: 'bust',
    mood: 'sparkle',
    caption: '그때, 거울 속 명경이가 말을 걸었다',
    actors: [me(190, { face: 'surprised', gender: 'female', outfit: '#6cb27f' }), { role: 'mirror', x: 450, face: 'smile', pose: 'idle', dir: -1 }],
    lines: [{ by: 1, text: '안녕! 나는 네 사주를 비추는 거울, 명경이야.' }],
  });
  out.push({
    title: '표지',
    bg: 'home',
    caption: '',
    actors: [me(410, { face: 'grin', dir: -1, wear: 'hoodie', front: false })],
    lines: [],
    cover: { kicker: '1화', title: '나라는 사람', tagline: '갑목 — 방향이 정해지면 일단 직진하는 사람' },
  });
  for (const m of MOODS) out.push({ title: `감정 배경 ${m}`, bg: 'home', mood: m, shot: 'bust', caption: `감정 배경 ${m}`, actors: [me(300, { face: m === 'gloom' || m === 'tone' ? 'sad' : 'smile', front: true })], lines: [] });
  for (const bg of BGS) {
    out.push({
      title: bg,
      bg,
      tone: bg === 'gloom' ? 'bad' : 'good',
      caption: `배경 ${bg} — 내레이션은 이렇게 두 줄까지 들어갑니다. 길게 써도 줄바꿈이 됩니다.`,
      actors: [me(200, { face: 'grin', pose: 'wave' }), { role: 'friend', x: 420, face: 'surprised', pose: 'idle', gender: 'male', dir: -1 }],
      lines: [
        { by: 0, text: '안녕! 오늘 날씨 정말 좋다.' },
        { by: 1, text: '벌써 왔어?!', kind: 'shout' },
      ],
      basis: `배경 ${bg}`,
    });
  }
  chunk(PROPS, 3).forEach((ps, i) =>
    out.push({ title: `무대 소품 ${i + 1}`, bg: 'home', caption: `무대 소품: ${ps.join(', ')}`, actors: [], lines: [], props: ps.map((k, j) => ({ kind: k, x: 110 + j * 190, label: '안정', label2: '도전' })) }),
  );
  out.push({
    title: '책상 장면',
    bg: 'officeNight',
    caption: '책상 뒤에 선 인물 + 생각 풍선',
    actors: [me(300, { face: 'tired', pose: 'facepalm', fx: ['cloud'], wear: 'shirt' })],
    lines: [{ by: 0, text: '숨 좀 쉬고 싶다… 오늘도 야근이네', kind: 'think' }],
    props: [{ kind: 'desk', x: 300 }, { kind: 'papers', x: 210 }, { kind: 'monitor', x: 380 }],
    badge: '버티는 시기',
    basis: '관성 38%',
  });
  out.push({
    title: '저녁 데이트',
    bg: 'dinner',
    caption: '두 사람이 테이블 양쪽에',
    actors: [me(150, { face: 'love', pose: 'cheeks' }), { role: 'partner', x: 450, face: 'shy', pose: 'idle', gender: 'female', dir: -1, fx: ['hearts'] }],
    lines: [
      { by: 1, text: '우리 앞으로도 함께하자.' },
      { by: 0, text: '응, 좋아!' },
    ],
    props: [{ kind: 'table', x: 300 }],
    badge: '지금 여기!',
    basis: '일지합',
  });
  return out;
}

describe('웹툰 그림', () => {
  it('모든 표정·자세·옷·소품·배경·카메라가 예외 없이 그려진다', () => {
    const panels = galleryPanels();
    const svgs = panels.map((p) => renderToStaticMarkup(createElement(PanelArt, { p })));
    svgs.push(renderToStaticMarkup(createElement(TextBeatArt, { b: { type: 'text', text: '하지만… 솔직히 말하면, 나에게도 약점은 있었다.', style: 'dark' } })));
    svgs.push(renderToStaticMarkup(createElement(TextBeatArt, { b: { type: 'text', text: '그날 밤.', style: 'plain' } })));
    for (const s of svgs) {
      expect(s.startsWith('<svg')).toBe(true);
      expect(s).not.toMatch(/NaN|undefined|Infinity/);
    }
    const out = process.env.COMIC_GALLERY;
    if (out) {
      const titles = [...panels.map((p) => p.title), '글 칸 dark', '글 칸 plain'];
      const font = resolve('node_modules/pretendard/dist/web/variable/woff2/PretendardVariable.woff2');
      const html = `<!doctype html><meta charset="utf-8"><style>@font-face{font-family:'Pretendard Variable';font-weight:45 920;src:url('file://${font}') format('woff2-variations')}body{margin:0;background:#ddd;font-family:sans-serif}.g{display:grid;grid-template-columns:repeat(2,600px);gap:16px;padding:16px;align-items:start}figure{margin:0;background:#fff}figcaption{font-size:12px;padding:4px}</style><div class="g">${svgs
        .map((s, i) => `<figure id="p${i}">${s}<figcaption>${i}. ${titles[i]}</figcaption></figure>`)
        .join('')}</div>`;
      writeFileSync(out, html);
    }
  });
});
