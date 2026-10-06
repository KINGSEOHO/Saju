/**
 * 인생 웹툰 대본·배치 검증 — 무작위 명식에서 회차 구성, 글자 넘침·잘림, 말풍선 겹침을 확인한다.
 * COMIC_SAMPLES=경로.html 을 주면 샘플 명식의 웹툰을 눈으로 확인할 HTML로 만든다.
 */
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { BEAT, CAP, HALF_TAG, HALF_W, PW, PanelArt, TextBeatArt, anchorsOf, cameraOf, halfCamera, layoutHalf, layoutPanel, markRect, panelHeight, sfxRect, type Rect } from '../src/comic/art.tsx';
import { episodes } from '../src/comic/episodes.ts';
import { textWidth, wrap } from '../src/comic/text.ts';
import { isText, type Comic, type Panel, type PropSpec } from '../src/comic/types.ts';
import { analyze, type BirthInput } from '../src/engine/index.ts';
import { crossReport } from '../src/report/cross.ts';
import { generateReport } from '../src/report/generate.ts';
import { JOB_SUGGEST } from '../src/report/job.ts';
import { MBTI_LIST } from '../src/report/mbti.ts';

const NOW = Date.UTC(2026, 9, 6);

function randomInputs(n: number, seed0: number): BirthInput[] {
  let seed = seed0;
  const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  const names = ['서호', '김지원', '이하늘', '박민준', undefined, 'Alex', '남궁민수'];
  return Array.from({ length: n }, (_, i) => {
    const timeKnown = rnd() > 0.15;
    return {
      name: names[i % names.length],
      gender: rnd() < 0.5 ? 'male' : 'female',
      calendar: 'solar',
      year: 1935 + Math.floor(rnd() * 90),
      month: 1 + Math.floor(rnd() * 12),
      day: 1 + Math.floor(rnd() * 28),
      hour: timeKnown ? Math.floor(rnd() * 24) : null,
      minute: timeKnown ? Math.floor(rnd() * 60) : null,
      longitude: 126 + rnd() * 3,
      timeZone: 'Asia/Seoul',
      timeCorrection: 'mean',
      ziHourRule: 'traditional',
      mbti: rnd() < 0.6 ? MBTI_LIST[Math.floor(rnd() * 16)] : undefined,
      job: rnd() < 0.6 ? JOB_SUGGEST[Math.floor(rnd() * JOB_SUGGEST.length)] : undefined,
    } as BirthInput;
  });
}

const overlap = (a: Rect, b: Rect) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

const BAD_TEXT = /undefined|NaN|\{who\}|\[object|을을|를를|은는|는은|님는|님가|님를|당신는|당신가|당신를|\s{2,}|아야,|야야,/;
const squash = (t: string) => t.replace(/\s+/g, '');

interface Stats {
  panels: number;
  bubbles: number;
  onFace: number;
}

/** 글자가 들어가는 소품: 줄이 상자 폭을 넘지 않는다 */
function checkOverlay(p: PropSpec, where: string) {
  const rows = p.rows ?? [];
  const fit = (t: string, size: number, w: number) => expect(textWidth(t, size), `${where}: ${t}`).toBeLessThanOrEqual(w);
  switch (p.kind) {
    case 'status':
      rows.forEach((r) => fit(r, 17, (p.w ?? 300) - 30));
      break;
    case 'board':
      rows.forEach((r) => fit(r, 18, (p.w ?? 240) - 30));
      if (p.label) fit(p.label, 22, (p.w ?? 240) - 20);
      break;
    case 'rx':
      rows.forEach((r) => fit(r, 18, (p.w ?? 250) - 28));
      break;
    case 'phonebig':
      rows.forEach((r) => fit(r, 15, (p.w ?? 200) - 50));
      break;
    case 'shelf': {
      const cols = Math.min(4, Math.max(1, rows.length));
      rows.forEach((r) => fit(r, 15, (p.w ?? 520) / cols - 20));
      break;
    }
    case 'score':
      if (p.label) fit(p.label, 18, (p.w ?? 230) - 20);
      if (p.label2) fit(p.label2, 44, (p.w ?? 230) - 24);
      break;
    case 'signpost':
      if (p.label) fit(p.label, 20, 120);
      if (p.label2) fit(p.label2, 20, 120);
      break;
    case 'calendar':
      if (p.label) fit(p.label, p.label.length > 3 ? 24 : 40, 100);
      break;
    case 'cage':
      if (p.label) fit(p.label, 17, 100);
      break;
    case 'boxes':
      if (p.label) fit(p.label, 13, 64);
      if (p.label2) fit(p.label2, 13, 56);
      break;
    default:
      break;
  }
}

function checkBubbles(where: string, W: number, H: number, L: ReturnType<typeof layoutPanel>, talk: Panel['talk'], faces: Rect[], stats: Stats) {
  expect(L.bubbles).toHaveLength(talk.length);
  L.bubbles.forEach((bb, i) => {
    stats.bubbles++;
    const w = `${where}: ${talk[i].text}`;
    // 잘리지 않고 모두 들어간다
    expect(squash(bb.lines.join('')), w).toBe(squash(talk[i].text));
    expect(bb.x, w).toBeGreaterThanOrEqual(0);
    expect(bb.x + bb.w, w).toBeLessThanOrEqual(W);
    expect(bb.y, w).toBeGreaterThanOrEqual(0);
    expect(bb.y + bb.h, w).toBeLessThanOrEqual(H);
    if (L.cap) expect(overlap(bb, L.cap), w).toBe(false);
    if (faces.some((f) => overlap(bb, f))) stats.onFace++;
  });
  for (let i = 0; i < L.bubbles.length; i++) for (let j = i + 1; j < L.bubbles.length; j++) expect(overlap(L.bubbles[i], L.bubbles[j]), where).toBe(false);
}

function check(comic: Comic, stats: Stats) {
  expect(comic.beats.length, comic.id).toBeGreaterThanOrEqual(10);
  expect(JSON.stringify(comic), comic.id).not.toMatch(BAD_TEXT);
  for (const b of comic.beats) {
    if (isText(b)) {
      if (b.style === 'chapter') expect(wrap(b.text, 34, BEAT.maxW, 99).length, b.text).toBeLessThanOrEqual(2);
      else if (b.style === 'time') expect(textWidth(b.text, 26), b.text).toBeLessThanOrEqual(PW - 160);
      else expect(wrap(b.text, BEAT.size, BEAT.maxW, 99).length, b.text).toBeLessThanOrEqual(8);
      continue;
    }
    stats.panels++;
    const where = `${comic.id}/${b.title}`;
    if (b.basis) expect(textWidth(`근거 · ${b.basis}`, 13), b.basis).toBeLessThanOrEqual(PW - 60);
    if (b.split) {
      const H = panelHeight(b);
      b.split.forEach((h) => {
        expect(textWidth(h.label, 18) + 30, h.label).toBeLessThanOrEqual(HALF_W - 20);
        const cam = halfCamera(H);
        const L = layoutHalf(h, H, b.basis);
        const faces = anchorsOf(h.cast, cam).map((a) => ({ x: a.x - a.r * 0.8, y: a.cy - a.r * 0.5, w: a.r * 1.6, h: a.chin - a.cy + a.r * 0.5 }));
        checkBubbles(`${where}/${h.label}`, HALF_W, H, L, h.talk, faces, stats);
        L.bubbles.forEach((bb) => expect(bb.y, `${where} 이름표`).toBeGreaterThanOrEqual(HALF_TAG));
        (h.props ?? []).forEach((p) => checkOverlay(p, where));
      });
      continue;
    }
    const cam = cameraOf(b);
    const L = layoutPanel(b, cam);
    // 내레이션은 세 줄 안에, 말줄임 없이
    if (b.cap) {
      const capW = PW - 24 - (b.badge ? 150 : 0) - CAP.px * 2;
      expect(wrap(b.cap, CAP.size, capW, 99).length, b.cap).toBeLessThanOrEqual(3);
    }
    if (b.cover) {
      expect(wrap(b.cover.title, 46, 280, 99).length, b.cover.title).toBeLessThanOrEqual(3);
      expect(wrap(b.cover.tagline, 19, 260, 99).length, b.cover.tagline).toBeLessThanOrEqual(4);
    }
    for (const s of b.sfx ?? []) {
      const r = sfxRect(s);
      expect(r.x, `${where} 효과음 ${s.text}`).toBeGreaterThanOrEqual(0);
      expect(r.x + r.w, `${where} 효과음 ${s.text}`).toBeLessThanOrEqual(PW);
      expect(r.y + r.h, `${where} 효과음 ${s.text}`).toBeLessThanOrEqual(cam.H + 6);
    }
    for (const m of b.marks ?? []) {
      const r = markRect(m);
      expect(r.x, `${where} 주석 ${m.text}`).toBeGreaterThanOrEqual(0);
      expect(r.x + r.w, `${where} 주석 ${m.text}`).toBeLessThanOrEqual(PW);
      expect(r.y + r.h, `${where} 주석 ${m.text}`).toBeLessThanOrEqual(cam.H);
    }
    (b.props ?? []).forEach((p) => checkOverlay(p, where));
    const faces = anchorsOf(b.cast, cam).map((a) => ({ x: a.x - a.r * 0.8, y: a.cy - a.r * 0.5, w: a.r * 1.6, h: a.chin - a.cy + a.r * 0.5 }));
    checkBubbles(where, PW, cam.H, L, b.talk, faces, stats);
  }
}

describe('인생 웹툰', () => {
  it('무작위 400명에서 회차들이 넘침·잘림·겹침 없이 만들어진다', () => {
    const stats: Stats = { panels: 0, bubbles: 0, onFace: 0 };
    for (const input of randomInputs(400, 11)) {
      const a = analyze(input, NOW);
      const x = crossReport(a, generateReport(a));
      const list = episodes(a, x);
      expect(list.map((c) => c.id)).toEqual(input.mbti ? ['persona', 'work', 'life', 'mbti'] : ['persona', 'work', 'life']);
      for (const comic of list) check(comic, stats);
      // 인생 연대기에는 '지금 여기' 표시가 정확히 한 번
      const life = list.find((c) => c.id === 'life')!;
      expect(life.beats.filter((b) => !isText(b) && b.badge === '지금 여기!').length, `${input.year}`).toBe(1);
      // 표지는 언제나 첫 칸
      for (const comic of list) expect(!isText(comic.beats[0]) && !!comic.beats[0].cover).toBe(true);
    }
    // 말풍선이 얼굴을 가리는 일은 드물어야 한다
    expect(stats.onFace / stats.bubbles, JSON.stringify(stats)).toBeLessThan(0.03);
  });

  it('이름·직업이 대사와 표지에 들어간다', () => {
    const a = analyze(
      { name: '김서호', gender: 'male', calendar: 'solar', year: 1990, month: 5, day: 15, hour: 14, minute: 30, longitude: 126.978, timeZone: 'Asia/Seoul', timeCorrection: 'mean', ziHourRule: 'traditional', job: '개발자', mbti: 'INTJ' },
      NOW,
    );
    const list = episodes(a, crossReport(a, generateReport(a)));
    const text = JSON.stringify(list);
    expect(text).toContain('서호야');
    expect(text).toContain('서호 씨');
    expect(text).toContain('개발자');
    expect(list[3].title).toBe('INTJ와 사주');
    const work = list[1];
    expect(work.beats.some((b) => !isText(b) && b.cast.some((x) => x.role === 'me' && x.wear === 'hoodie'))).toBe(true);
    // 주인공 머리 위에는 일간 오행 마크
    expect(list[0].beats.some((b) => !isText(b) && b.cast.some((x) => x.role === 'me' && x.el === 'metal'))).toBe(true);
  });

  it('10대·65세 이상은 장면과 인물이 나이에 맞게 바뀐다', () => {
    const base = { gender: 'female', calendar: 'solar', hour: 9, minute: 0, longitude: 126.978, timeZone: 'Asia/Seoul', timeCorrection: 'mean', ziHourRule: 'traditional' } as const;
    const teen = analyze({ ...base, year: 2010, month: 3, day: 1 } as BirthInput, NOW);
    const elder = analyze({ ...base, year: 1950, month: 3, day: 1 } as BirthInput, NOW);
    for (const [a, banned] of [
      [teen, /부장님|월급|출근|퇴근이다|회장님/],
      [elder, /등교|용돈 들어왔다|학교… 가기 싫다/],
    ] as const) {
      const list = episodes(a, crossReport(a, generateReport(a)));
      const persona = list[0];
      const work = list[1];
      // 1·2화 대사에 나이에 맞지 않는 말이 없다 (3화는 시기별로 나이가 바뀐다)
      const said = [persona, work].flatMap((c) => c.beats.flatMap((b) => (isText(b) ? [] : [...b.talk.map((l) => l.text), ...(b.split?.flatMap((h) => h.talk.map((l) => l.text)) ?? [])])));
      expect(said.join(' / ')).not.toMatch(banned);
    }
    // 10대의 회사 장면은 학교로, 상사는 선생님으로
    const tl = episodes(teen, crossReport(teen, generateReport(teen)));
    for (const comic of tl.slice(0, 2)) for (const b of comic.beats) if (!isText(b)) expect(b.cast.some((x) => x.role === 'boss'), `${comic.id}/${b.title}`).toBe(false);
  });

  it('샘플 웹툰 HTML (COMIC_SAMPLES 지정 시)', () => {
    const out = process.env.COMIC_SAMPLES;
    const samples: BirthInput[] = [
      { name: '김서호', gender: 'male', calendar: 'solar', year: 1990, month: 5, day: 15, hour: 14, minute: 30, longitude: 126.978, timeZone: 'Asia/Seoul', timeCorrection: 'mean', ziHourRule: 'traditional', job: '개발자', mbti: 'ENFP' },
      { name: '이지원', gender: 'female', calendar: 'solar', year: 1995, month: 11, day: 3, hour: 7, minute: 20, longitude: 126.978, timeZone: 'Asia/Seoul', timeCorrection: 'mean', ziHourRule: 'traditional', job: '간호사', mbti: 'ISFJ' },
      { gender: 'female', calendar: 'solar', year: 1958, month: 2, day: 21, hour: 22, minute: 0, longitude: 129.07, timeZone: 'Asia/Seoul', timeCorrection: 'mean', ziHourRule: 'traditional' },
      { name: '하늘', gender: 'male', calendar: 'solar', year: 2010, month: 8, day: 9, hour: 9, minute: 10, longitude: 126.978, timeZone: 'Asia/Seoul', timeCorrection: 'mean', ziHourRule: 'traditional', mbti: 'ESTP' },
    ];
    const blocks: string[] = [];
    let id = 0;
    for (const s of samples) {
      const a = analyze(s, NOW);
      for (const comic of episodes(a, crossReport(a, generateReport(a)))) {
        const svgs = comic.beats.map((b) => renderToStaticMarkup(isText(b) ? createElement(TextBeatArt, { b }) : createElement(PanelArt, { p: b })));
        for (const svg of svgs) expect(svg).not.toMatch(/NaN|undefined/);
        blocks.push(
          `<section><h2>${s.name ?? '(이름 없음)'} · ${comic.no}화 ${comic.title} <small>${comic.subtitle}</small></h2><div class="g">${svgs
            .map((svg, i) => {
              const b = comic.beats[i];
              return `<figure id="p${id++}">${svg}<figcaption><b>${b.title ?? ''}</b> — ${b.note ?? ''}</figcaption></figure>`;
            })
            .join('')}</div></section>`,
        );
      }
    }
    if (out) {
      const font = resolve('node_modules/pretendard/dist/web/variable/woff2/PretendardVariable.woff2');
      writeFileSync(
        out,
        `<!doctype html><meta charset="utf-8"><style>@font-face{font-family:'Pretendard Variable';font-weight:45 920;src:url('file://${font}') format('woff2-variations')}body{margin:0;background:#ddd;font-family:sans-serif}section{padding:12px}h2{font-size:18px}.g{display:grid;grid-template-columns:repeat(2,600px);gap:14px;align-items:start}figure{margin:0;background:#fff}figcaption{font-size:12px;padding:6px}</style>${blocks.join('')}`,
      );
    }
  });
});
