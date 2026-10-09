import { describe, expect, it } from 'vitest';
import { STEMS, analyze, type BirthInput } from '../src/engine/index.ts';
import { groupOfElement } from '../src/engine/tenGods.ts';
import { buildGaeun, concernGaeun, coupleGaeun, type GaeunConcern } from '../src/report/gaeun.ts';
import { generateReport } from '../src/report/generate.ts';

const NOW = Date.UTC(2026, 9, 6);

function randomInputs(n: number, seed0: number): BirthInput[] {
  let seed = seed0;
  const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  return Array.from({ length: n }, (_, i) => ({
    name: i % 3 ? '서호' : undefined,
    gender: rnd() < 0.5 ? 'male' : 'female',
    calendar: 'solar',
    year: 1935 + Math.floor(rnd() * 90),
    month: 1 + Math.floor(rnd() * 12),
    day: 1 + Math.floor(rnd() * 28),
    hour: rnd() > 0.15 ? Math.floor(rnd() * 24) : null,
    minute: 0,
    longitude: 126 + rnd() * 3,
    timeZone: 'Asia/Seoul',
    timeCorrection: 'mean',
    ziHourRule: 'traditional',
  }) as BirthInput);
}

const BAD = /undefined|NaN|\$\{|\{who\}|을을|를를|은는|는은|이가|가이|과와|와과|나무\(木\)을|쇠\(金\)을|불\(火\)를|물\(水\)를|흙\(土\)를|나무\(木\)은|쇠\(金\)은|불\(火\)는|물\(水\)는|흙\(土\)는|\s{2,}/;

const people = randomInputs(400, 7).map((input) => analyze(input, NOW));

describe('개운법 (올해 운세에 들어가는 전체판)', () => {
  it('풀이 리포트에는 개운법 탭이 없고, 종합에 필요한 기운 한 줄과 고민 리포트 안내만 남는다', () => {
    const r = generateReport(people[0]);
    expect(r.sections.map((s) => s.id)).not.toContain('gaeun');
    const line = r.sections[0].blocks.find((b) => b.heading.includes('용신'))!.items[0].text;
    expect(line).toMatch(/가까이, .*멀리/);
    expect(line).toContain('고민 리포트');
  });

  it('무작위 400명에서 가까이할 것·멀리할 것·루틴이 빠짐없이 만들어진다', () => {
    for (const a of people) {
      const g = buildGaeun(a);
      const d = g.data;
      expect(d.need).toBe(a.yongsin.yongsin);
      expect(d.avoid).toBe(a.yongsin.gisin);
      expect(d.close.length).toBeGreaterThanOrEqual(9);
      expect(d.away.length).toBeGreaterThanOrEqual(5);
      expect(d.routine).toHaveLength(4);
      expect(g.story.length).toBeGreaterThanOrEqual(5);
      expect(g.headline).toMatch(/가까이, .*멀리/);
      const text = JSON.stringify(g);
      expect(text).not.toMatch(BAD);
      // 같은 오행을 가까이하면서 동시에 멀리하라고 하지 않는다
      expect(d.need).not.toBe(d.avoid);
      // 루틴 네 가지는 서로 겹치지 않는다 (예: '밤 11시…'가 두 번 나오지 않게)
      expect(new Set(d.routine.map((r) => r.text.slice(0, 5))).size).toBe(4);
      // 채울 습관은 용신이 맡은 십성 그룹에서 나온다 (신약에게 식상을 늘리라고 하지 않는다)
      expect(d.routine[1].basis).toBe(`용신 = ${groupOfElement(STEMS[a.pillars.day.stem].element, d.need)}`);
      // 연간 포인트에 같은 오행을 두 번 쓰지 않는다 (丙午년 → 불(火)·불(火) 금지)
      expect(d.year?.text ?? '').not.toMatch(/([가-힣]+\(.\))·\1/);
    }
  });
});

const CONCERNS: GaeunConcern[] = ['career', 'love', 'money', 'exam', 'year'];
/** 무료로 먼저 보여 주는 한 가지 — 돈은 새는 길, 시험은 필기구 색. 돈 버는 길·지갑 색·공부 방법은 상세에 남긴다 */
const TASTE: Record<GaeunConcern, string> = { career: 'desk', love: 'color', money: 'leak', exam: 'color', year: 'routine' };

describe('고민별 개운법', () => {
  it('무작위 400명 × 다섯 고민에서 가까이할 것·멀리할 것·루틴이 채워지고 말이 매끄럽다', () => {
    for (const a of people) {
      for (const id of CONCERNS) {
        const g = concernGaeun(id, a);
        expect(g.title).toContain('개운법');
        expect(g.why.length).toBeGreaterThan(20);
        expect(g.close.length, id).toBeGreaterThanOrEqual(3);
        expect(g.away.length, id).toBeGreaterThanOrEqual(2);
        expect(g.routine.length, id).toBeGreaterThanOrEqual(3);
        // 같은 줄이 두 번 나오지 않는다
        expect(new Set(g.close.map((x) => x.key)).size).toBe(g.close.length);
        expect(new Set(g.away.map((x) => x.key)).size).toBe(g.away.length);
        expect(new Set(g.routine.map((r) => r.text.slice(0, 5))).size).toBe(g.routine.length);
        // 맛보기는 정해 둔 한 가지
        expect(g.taste.key).toBe(TASTE[id]);
        if (id !== 'year') expect([...g.close, ...g.away]).toContain(g.taste);
        else expect(g.taste.value).toBe(g.routine[0].text);
        // 올해 운세만 올해의 개운 포인트를 가진다
        expect(!!g.year).toBe(id === 'year');
        const text = JSON.stringify(g);
        expect(text, id).not.toMatch(BAD);
        // 고민 리포트는 해요체 — 합니다체 문장이 섞이지 않는다
        expect(text, id).not.toMatch(/습니다|입니다|합니다/);
      }
    }
  });

  it('돈은 새는 길이 무료, 돈 버는 길·지갑 색은 상세에 있다', () => {
    const g = concernGaeun('money', people[0]);
    expect(g.away).toContain(g.taste);
    expect(g.close.map((x) => x.key)).toEqual(expect.arrayContaining(['earn', 'wallet']));
  });

  it('시험은 필기구 색이 무료, 공부 방법·장소·시간은 상세에 앞서 나온다', () => {
    const g = concernGaeun('exam', people[0]);
    expect(g.taste.label).toBe('필기구 색');
    expect(g.close.slice(0, 3).map((x) => x.label)).toEqual(['공부 방법', '공부 장소', '공부 시간']);
  });

  it('연애는 지금 상태에 따라 제목·장소·띠·루틴이 달라진다', () => {
    for (const a of people.slice(0, 50)) {
      const single = concernGaeun('love', a, { love: 'single' });
      const married = concernGaeun('love', a, { love: 'married' });
      expect(single.title).not.toBe(married.title);
      expect(single.close.some((x) => x.key === 'tti')).toBe(true);
      // 결혼한 사람에게 잘 맞는 띠나 만남의 자리를 권하지 않는다
      expect(married.close.some((x) => x.key === 'tti' || x.key === 'charm')).toBe(false);
      expect(single.routine[0].text).not.toBe(married.routine[0].text);
    }
  });
});

describe('두 사람의 개운법 (궁합)', () => {
  it('무작위 200쌍에서 함께 갈 곳·색·습관과 함께 피할 것이 나오고, 서로 부딪히는 기운을 알려 준다', () => {
    for (let i = 0; i < 200; i++) {
      const a = people[i];
      const b = people[399 - i];
      const g = coupleGaeun(a, b, i % 2 ? '지원' : '그 사람');
      expect(g.close).toHaveLength(3);
      expect(g.away.length).toBeGreaterThanOrEqual(1);
      expect(g.why.length).toBeGreaterThan(20);
      const text = JSON.stringify(g);
      expect(text).not.toMatch(BAD);
      if (a.yongsin.yongsin === b.yongsin.yongsin) expect(g.close[0].value).toContain('둘 다에게');
      expect(g.away.some((x) => x.key === 'push')).toBe(a.yongsin.yongsin === b.yongsin.gisin);
      expect(g.away.some((x) => x.key === 'pull')).toBe(b.yongsin.yongsin === a.yongsin.gisin);
    }
  });
});
