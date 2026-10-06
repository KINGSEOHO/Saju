/**
 * 인생 웹툰 대본·배치 검증 — 무작위 명식에서 컷 수, 글자 넘침, 말풍선 겹침을 확인한다.
 * COMIC_SAMPLES=경로.html 을 주면 샘플 명식의 웹툰을 눈으로 확인할 HTML로 만든다.
 */
import { writeFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { PanelArt, PH, PW, layoutPanel } from '../src/comic/art.tsx';
import { lifeComic, personaComic } from '../src/comic/script.ts';
import { textWidth, wrap } from '../src/comic/text.ts';
import type { Comic } from '../src/comic/types.ts';
import { analyze, type BirthInput } from '../src/engine/index.ts';

const NOW = Date.UTC(2026, 9, 6);

function randomInputs(n: number, seed0: number): BirthInput[] {
  let seed = seed0;
  const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  return Array.from({ length: n }, (_, i) => {
    const timeKnown = rnd() > 0.15;
    return {
      name: i % 2 === 0 ? '서호' : undefined,
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
    } as BirthInput;
  });
}

const overlap = (a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) =>
  a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

function check(comic: Comic, n: number) {
  expect(comic.panels).toHaveLength(n);
  expect(JSON.stringify(comic)).not.toMatch(/undefined|NaN|\{who\}/);
  for (const p of comic.panels) {
    // 내레이션은 두 줄 안에, 말줄임 없이
    const capW = PW - 24 - (p.badge ? 130 : 0) - 28;
    expect(wrap(p.caption, 21, capW, 99).length, p.caption).toBeLessThanOrEqual(2);
    // 말풍선은 세 줄 안에
    for (const l of p.lines) expect(wrap(l.text, 23, 230, 99).length, l.text).toBeLessThanOrEqual(3);
    // 근거 표시는 한 줄
    expect(textWidth(`근거 · ${p.basis}`, 13), p.basis).toBeLessThanOrEqual(PW - 60);
    expect(p.note.length).toBeGreaterThan(20);
    const L = layoutPanel(p);
    expect(L.bubbles).toHaveLength(p.lines.length);
    for (const b of L.bubbles) {
      expect(b.x).toBeGreaterThanOrEqual(0);
      expect(b.x + b.w).toBeLessThanOrEqual(PW);
      expect(b.y).toBeGreaterThanOrEqual(0);
      expect(b.y + b.h).toBeLessThanOrEqual(PH);
      expect(b.lines.join('')).not.toContain('…'.repeat(2));
      if (L.cap) expect(overlap(b, L.cap), `${p.title}: ${b.lines.join(' ')}`).toBe(false);
    }
    for (let i = 0; i < L.bubbles.length; i++)
      for (let j = i + 1; j < L.bubbles.length; j++) expect(overlap(L.bubbles[i], L.bubbles[j]), p.title).toBe(false);
  }
}

describe('인생 웹툰', () => {
  it('무작위 600명에서 4컷·6컷이 넘침·겹침 없이 만들어진다', () => {
    for (const input of randomInputs(600, 11)) {
      const a = analyze(input, NOW);
      check(personaComic(a), 4);
      const life = lifeComic(a);
      check(life, 6);
      // 인생 6컷에는 '지금' 표시가 정확히 한 번 (첫 대운 전이면 어린 시절 컷)
      expect(life.panels.filter((p) => p.badge === '지금 여기!').length, `${input.year}`).toBe(1);
    }
  });

  it('인생 6컷에는 지금 시기가 표시된다 (성인)', () => {
    const a = analyze(
      { name: '서호', gender: 'male', calendar: 'solar', year: 1990, month: 5, day: 15, hour: 14, minute: 30, longitude: 126.978, timeZone: 'Asia/Seoul', timeCorrection: 'mean', ziHourRule: 'traditional' },
      NOW,
    );
    const life = lifeComic(a);
    expect(life.panels.filter((p) => p.badge === '지금 여기!')).toHaveLength(1);
    const persona = personaComic(a);
    expect(persona.panels[2].caption).toMatch(/^솔직히 말하면/);
    expect(persona.title).toBe('서호님은 이런 사람');
  });

  it('샘플 웹툰 HTML (COMIC_SAMPLES 지정 시)', () => {
    const out = process.env.COMIC_SAMPLES;
    const samples: BirthInput[] = [
      { name: '서호', gender: 'male', calendar: 'solar', year: 1990, month: 5, day: 15, hour: 14, minute: 30, longitude: 126.978, timeZone: 'Asia/Seoul', timeCorrection: 'mean', ziHourRule: 'traditional' },
      { gender: 'female', calendar: 'solar', year: 1995, month: 11, day: 3, hour: 7, minute: 20, longitude: 126.978, timeZone: 'Asia/Seoul', timeCorrection: 'mean', ziHourRule: 'traditional' },
      { gender: 'female', calendar: 'solar', year: 1958, month: 2, day: 21, hour: 22, minute: 0, longitude: 129.07, timeZone: 'Asia/Seoul', timeCorrection: 'mean', ziHourRule: 'traditional' },
      { name: '하늘', gender: 'male', calendar: 'solar', year: 2010, month: 8, day: 9, hour: 9, minute: 10, longitude: 126.978, timeZone: 'Asia/Seoul', timeCorrection: 'mean', ziHourRule: 'traditional' },
    ];
    const blocks: string[] = [];
    for (const s of samples) {
      const a = analyze(s, NOW);
      for (const comic of [personaComic(a), lifeComic(a)]) {
        const svgs = comic.panels.map((p) => renderToStaticMarkup(createElement(PanelArt, { p })));
        for (const svg of svgs) expect(svg).not.toMatch(/NaN|undefined/);
        blocks.push(
          `<section><h2>${comic.title} <small>${comic.subtitle}</small></h2><div class="g">${svgs
            .map((svg, i) => `<figure>${svg}<figcaption><b>${comic.panels[i].title}</b> — ${comic.panels[i].note}</figcaption></figure>`)
            .join('')}</div></section>`,
        );
      }
    }
    if (out) {
      writeFileSync(
        out,
        `<!doctype html><meta charset="utf-8"><style>body{margin:0;background:#ddd;font-family:sans-serif}section{padding:12px}h2{font-size:18px}.g{display:grid;grid-template-columns:repeat(2,600px);gap:14px}figure{margin:0;background:#fff}figcaption{font-size:12px;padding:6px}</style>${blocks.join('')}`,
      );
    }
  });
});
