/**
 * 인생 웹툰 대본·배치 검증 — 무작위 명식에서 회차 구성, 글자 넘침·잘림, 말풍선 겹침을 확인한다.
 * COMIC_SAMPLES=경로.html 을 주면 샘플 명식의 웹툰을 눈으로 확인할 HTML로 만든다.
 */
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { BEAT, CAP, PW, PanelArt, TextBeatArt, cameraOf, headOf, layoutPanel } from '../src/comic/art.tsx';
import { episodes } from '../src/comic/episodes.ts';
import { textWidth, wrap } from '../src/comic/text.ts';
import { isText, type Comic } from '../src/comic/types.ts';
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

const overlap = (a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) =>
  a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

const BAD_TEXT = /undefined|NaN|\{who\}|\[object|을을|를를|은는|는은|님는|님가|님를|당신는|당신가|당신를|\s{2,}|아야,|야야,/;
const squash = (t: string) => t.replace(/\s+/g, '');

interface Stats {
  panels: number;
  bubbles: number;
  onFace: number;
}

function check(comic: Comic, stats: Stats) {
  expect(comic.beats.length, comic.id).toBeGreaterThanOrEqual(8);
  expect(JSON.stringify(comic), comic.id).not.toMatch(BAD_TEXT);
  for (const b of comic.beats) {
    if (isText(b)) {
      expect(wrap(b.text, BEAT.size, BEAT.maxW, 99).length, b.text).toBeLessThanOrEqual(8);
      continue;
    }
    stats.panels++;
    const cam = cameraOf(b);
    const L = layoutPanel(b, cam);
    // 내레이션은 세 줄 안에, 말줄임 없이
    if (b.caption) {
      const capW = PW - 24 - (b.badge ? 150 : 0) - CAP.px * 2;
      expect(wrap(b.caption, CAP.size, capW, 99).length, b.caption).toBeLessThanOrEqual(3);
    }
    if (b.cover) {
      expect(wrap(b.cover.title, 44, 270, 99).length, b.cover.title).toBeLessThanOrEqual(3);
      expect(wrap(b.cover.tagline, 19, 250, 99).length, b.cover.tagline).toBeLessThanOrEqual(4);
    }
    if (b.basis) expect(textWidth(`근거 · ${b.basis}`, 13), b.basis).toBeLessThanOrEqual(PW - 60);
    expect(L.bubbles).toHaveLength(b.lines.length);
    const heads = b.actors.map((a) => headOf(a, cam));
    L.bubbles.forEach((bb, i) => {
      stats.bubbles++;
      const where = `${comic.id}/${b.title}: ${b.lines[i].text}`;
      // 잘리지 않고 모두 들어간다
      expect(squash(bb.lines.join('')), where).toBe(squash(b.lines[i].text));
      expect(bb.x, where).toBeGreaterThanOrEqual(0);
      expect(bb.x + bb.w, where).toBeLessThanOrEqual(PW);
      expect(bb.y, where).toBeGreaterThanOrEqual(0);
      expect(bb.y + bb.h, where).toBeLessThanOrEqual(cam.H);
      if (L.cap) expect(overlap(bb, L.cap), where).toBe(false);
      const faces = heads.map((h) => ({ x: h.x - h.r * 0.8, y: h.cy - h.r * 0.5, w: h.r * 1.6, h: h.chin - h.cy + h.r * 0.5 }));
      if (faces.some((f) => overlap(bb, f))) stats.onFace++;
    });
    for (let i = 0; i < L.bubbles.length; i++)
      for (let j = i + 1; j < L.bubbles.length; j++) expect(overlap(L.bubbles[i], L.bubbles[j]), `${comic.id}/${b.title}`).toBe(false);
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
    expect(stats.onFace / stats.bubbles, JSON.stringify(stats)).toBeLessThan(0.02);
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
    expect(work.beats.some((b) => !isText(b) && b.actors.some((x) => x.role === 'me' && x.wear === 'hoodie'))).toBe(true);
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

