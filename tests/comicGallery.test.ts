/**
 * 웹툰 그림 갤러리 — 모든 표정·자세·소품·배경을 렌더링해 예외 없이 그려지는지 확인한다.
 * COMIC_GALLERY=경로.html 을 주면 눈으로 확인할 수 있는 HTML 파일도 만든다.
 */
import { writeFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { PanelArt } from '../src/comic/art.tsx';
import type { Actor, Bg, Face, Fx, Held, Panel, Pose, PropSpec } from '../src/comic/types.ts';

const FACES: Face[] = ['neutral', 'smile', 'grin', 'laugh', 'sad', 'cry', 'angry', 'surprised', 'worried', 'determined', 'nervous', 'love', 'tired', 'proud', 'thinking', 'shock'];
const POSES: Pose[] = ['idle', 'cheer', 'point', 'think', 'hold', 'wave', 'facepalm', 'fist', 'fighting', 'shrug', 'cross', 'cheeks'];
const HELD: Held[] = ['document', 'phone', 'book', 'money', 'trophy', 'coffee', 'gift', 'mic', 'heart', 'wallet', 'umbrella', 'brush', 'cake', 'certificate', 'notebook', 'drawing', 'coin', 'bag'];
const FX: Fx[] = ['sweat', 'anger', 'sparkle', 'hearts', 'gloom', 'exclaim', 'question', 'bulb', 'zzz', 'music', 'steam', 'flame', 'cloud', 'shine', 'tears'];
const BGS: Bg[] = ['office', 'officeNight', 'home', 'cafe', 'park', 'city', 'school', 'night', 'mountain', 'stage', 'library', 'dinner', 'crossroad', 'rain', 'sea', 'money', 'gym', 'bedroom', 'burst', 'gloom', 'sparkle'];
const PROPS: PropSpec['kind'][] = ['desk', 'papers', 'laptop', 'coins', 'moneyBag', 'chartUp', 'chartDown', 'books', 'signpost', 'bench', 'table', 'plant', 'boxes', 'calendar', 'clock', 'whiteboard', 'bed', 'dumbbell', 'easel'];

const chunk = <T>(xs: T[], n: number) => Array.from({ length: Math.ceil(xs.length / n) }, (_, i) => xs.slice(i * n, i * n + n));
const me = (x: number, extra: Partial<Actor> = {}): Actor => ({ role: 'me', x, face: 'smile', pose: 'idle', gender: 'male', outfit: '#e8615a', ...extra });
const panel = (title: string, actors: Actor[], extra: Partial<Panel> = {}): Panel => ({ title, bg: 'burst', caption: title, actors, lines: [], basis: '갤러리', note: '', ...extra });

function galleryPanels(): Panel[] {
  const out: Panel[] = [];
  chunk(FACES, 4).forEach((fs, i) =>
    out.push(panel(`표정 ${i + 1}: ${fs.join(', ')}`, fs.map((f, k) => me(90 + k * 140, { face: f, gender: k % 2 ? 'female' : 'male', outfit: ['#5aa469', '#e8615a', '#e7b04a', '#8e9ab3'][k] })))),
  );
  chunk(POSES, 4).forEach((ps, i) => out.push(panel(`자세 ${i + 1}: ${ps.join(', ')}`, ps.map((p, k) => me(90 + k * 140, { pose: p, face: 'grin' })))));
  out.push(panel('나이: kid · teen · adult · senior (남)', (['kid', 'teen', 'adult', 'senior'] as const).map((age, k) => me(90 + k * 140, { age }))));
  out.push(panel('나이: kid · teen · adult · senior (여)', (['kid', 'teen', 'adult', 'senior'] as const).map((age, k) => me(90 + k * 140, { age, gender: 'female', outfit: '#4a86d0' }))));
  out.push(
    panel(
      '역할: partner · friend · boss · coworker',
      (['partner', 'friend', 'boss', 'coworker'] as const).map((role, k) => ({ role, x: 90 + k * 140, face: 'smile', pose: 'idle', gender: k % 2 ? 'male' : 'female' }) as Actor),
    ),
  );
  out.push(
    panel(
      '역할: parent · teacher · child · elder',
      (['parent', 'teacher', 'child', 'elder'] as const).map((role, k) => ({ role, x: 90 + k * 140, face: 'smile', pose: 'idle', gender: 'female', age: role === 'child' ? 'kid' : role === 'elder' ? 'senior' : 'adult' }) as Actor),
    ),
  );
  chunk(HELD, 4).forEach((hs, i) =>
    out.push(panel(`소품 ${i + 1}: ${hs.join(', ')}`, hs.map((h, k) => me(90 + k * 140, { pose: h === 'umbrella' || h === 'mic' ? 'wave' : 'hold', held: h, face: 'smile' })))),
  );
  chunk(FX, 4).forEach((fs, i) => out.push(panel(`효과 ${i + 1}: ${fs.join(', ')}`, fs.map((f, k) => me(90 + k * 140, { fx: [f], face: 'surprised' })), { caption: '' })));
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
      note: '',
    });
  }
  chunk(PROPS, 3).forEach((ps, i) =>
    out.push({
      title: `무대 소품 ${i + 1}`,
      bg: 'home',
      caption: `무대 소품: ${ps.join(', ')}`,
      actors: [],
      lines: [],
      props: ps.map((k, j) => ({ kind: k, x: 110 + j * 190, label: '안정', label2: '도전' })),
      basis: '갤러리',
      note: '',
    }),
  );
  out.push({
    title: '책상 장면',
    bg: 'officeNight',
    caption: '책상 뒤에 선 인물 + 생각 풍선',
    actors: [me(300, { face: 'tired', pose: 'facepalm', fx: ['cloud'] })],
    lines: [{ by: 0, text: '숨 좀 쉬고 싶다… 오늘도 야근이네', kind: 'think' }],
    props: [{ kind: 'desk', x: 300 }, { kind: 'papers', x: 210 }],
    badge: '버티는 시기',
    basis: '관성 38%',
    note: '',
  });
  out.push({
    title: '저녁 데이트',
    bg: 'dinner',
    caption: '두 사람이 테이블 양쪽에',
    actors: [me(150, { face: 'love', pose: 'cheeks' }), { role: 'partner', x: 450, face: 'smile', pose: 'idle', gender: 'female', dir: -1, fx: ['hearts'] }],
    lines: [
      { by: 1, text: '우리 앞으로도 함께하자.' },
      { by: 0, text: '응, 좋아!' },
    ],
    props: [{ kind: 'table', x: 300 }],
    badge: '지금 여기!',
    basis: '일지합',
    note: '',
  });
  return out;
}

describe('웹툰 그림', () => {
  it('모든 표정·자세·소품·배경이 예외 없이 그려진다', () => {
    const panels = galleryPanels();
    const svgs = panels.map((p) => renderToStaticMarkup(createElement(PanelArt, { p })));
    for (const s of svgs) {
      expect(s.startsWith('<svg')).toBe(true);
      expect(s).not.toMatch(/NaN|undefined/);
    }
    const out = process.env.COMIC_GALLERY;
    if (out) {
      const html = `<!doctype html><meta charset="utf-8"><style>body{margin:0;background:#ddd;font-family:sans-serif}.g{display:grid;grid-template-columns:repeat(2,600px);gap:16px;padding:16px}figure{margin:0;background:#fff}figcaption{font-size:12px;padding:4px}</style><div class="g">${svgs
        .map((s, i) => `<figure id="p${i}">${s}<figcaption>${i}. ${panels[i].title}</figcaption></figure>`)
        .join('')}</div>`;
      writeFileSync(out, html);
    }
  });
});
