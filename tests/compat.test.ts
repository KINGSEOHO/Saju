import { describe, expect, it } from 'vitest';
import { analyze, type BirthInput, type SajuAnalysis } from '../src/engine/index.ts';
import { isChung, isHyungPair, isWonjin } from '../src/engine/interactions.ts';
import { compatReport, reunionReport, SCORE_NOTE } from '../src/report/compat.ts';
import { MBTI_LIST } from '../src/report/mbti.ts';

const NOW = Date.UTC(2026, 9, 6);

function people(n: number, seed0: number): SajuAnalysis[] {
  let seed = seed0;
  const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  return Array.from({ length: n }, (_, i) => {
    const timeKnown = rnd() > 0.2;
    const input: BirthInput = {
      name: i % 3 === 0 ? undefined : i % 3 === 1 ? '민수' : '지원',
      gender: rnd() < 0.5 ? 'male' : 'female',
      calendar: 'solar',
      year: 1960 + Math.floor(rnd() * 45),
      month: 1 + Math.floor(rnd() * 12),
      day: 1 + Math.floor(rnd() * 28),
      hour: timeKnown ? Math.floor(rnd() * 24) : null,
      minute: timeKnown ? Math.floor(rnd() * 60) : null,
      longitude: 126.978,
      timeZone: 'Asia/Seoul',
      mbti: rnd() < 0.7 ? MBTI_LIST[Math.floor(rnd() * 16)] : undefined,
    };
    return analyze(input, NOW);
  });
}

const ps = people(60, 7);
const pairs: [SajuAnalysis, SajuAnalysis][] = [];
for (let i = 0; i < ps.length; i++) for (let j = 0; j < ps.length; j++) if (i !== j) pairs.push([ps[i], ps[j]]);

const allText = (o: unknown): string[] =>
  typeof o === 'string' ? [o] : Array.isArray(o) ? o.flatMap(allText) : o && typeof o === 'object' ? Object.values(o).flatMap(allText) : [];

describe('궁합', () => {
  it('점수는 35~97점이고, 등급·제목·근거가 늘 채워진다', () => {
    for (const [a, b] of pairs) {
      const r = compatReport(a, b);
      expect(r.score).toBeGreaterThanOrEqual(35);
      expect(r.score).toBeLessThanOrEqual(97);
      expect(r.tier).toBeTruthy();
      expect(r.headline).toBeTruthy();
      expect(r.conflict.length).toBeGreaterThanOrEqual(2);
      expect(r.talk).toHaveLength(2);
      expect(r.advice.length).toBeGreaterThan(0);
      for (const f of r.factors) expect(f.basis).toBeTruthy();
    }
  });

  it('조사 자리에 (가)·(를) 같은 임시 표기가 남지 않는다', () => {
    for (const [a, b] of pairs.slice(0, 600)) {
      for (const t of allText(compatReport(a, b))) expect(t).not.toMatch(/\((가|를|는|이|은|을)\)|나이 |나무이|undefined|NaN/);
    }
  });

  it('일간 합 + 배우자 자리 합이면 높고, 둘 다 충이면 낮다', () => {
    const rs = pairs.map(([a, b]) => compatReport(a, b));
    const ids = (r: ReturnType<typeof compatReport>) => r.factors.map((f) => f.id);
    const hap = rs.filter((r) => ids(r).includes('branch-hap'));
    const chung = rs.filter((r) => ids(r).includes('branch-chung'));
    expect(hap.length).toBeGreaterThan(0);
    expect(chung.length).toBeGreaterThan(0);
    const avg = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;
    expect(avg(hap.map((r) => r.score))).toBeGreaterThan(avg(chung.map((r) => r.score)) + 15);
    for (const r of rs.filter((r) => ids(r).includes('stem-hap') && ids(r).includes('branch-hap'))) expect(r.score).toBeGreaterThanOrEqual(70);
    for (const r of rs.filter((r) => ids(r).includes('stem-chung') && ids(r).includes('branch-chung'))) expect(r.score).toBeLessThanOrEqual(62);
  });

  it('배우자 자리의 합 속에 형·파가 섞이면(巳申·寅亥) 덜 더하고, 같은 글자의 자형은 따로 본다', () => {
    const seen = new Set<string>();
    for (const [a, b] of pairs) {
      const r = compatReport(a, b);
      const d = [a.pillars.day.branch, b.pillars.day.branch].sort((x, y) => x - y).join(',');
      const hap = r.factors.find((f) => f.id === 'branch-hap');
      if (hap) {
        const want = d === '5,8' ? [8, '육합 · 형'] : d === '2,11' ? [10, '육합 · 파'] : [12, '육합'];
        expect([hap.points, hap.basis.endsWith(want[1] as string)]).toEqual([want[0], true]);
        seen.add(String(want[0]));
      }
      const same = a.pillars.day.branch === b.pillars.day.branch;
      const jahyeong = same && [4, 6, 9, 11].includes(a.pillars.day.branch);
      expect(r.factors.some((f) => f.id === 'branch-jahyeong')).toBe(jahyeong);
      expect(r.factors.some((f) => f.id === 'branch-same')).toBe(same && !jahyeong);
    }
    expect(seen.has('12')).toBe(true);
  });

  it('점수가 한쪽에 몰리지 않는다', () => {
    const scores = pairs.map(([a, b]) => compatReport(a, b).score);
    const share = (lo: number, hi: number) => scores.filter((s) => s >= lo && s < hi).length / scores.length;
    expect(share(35, 58)).toBeGreaterThan(0.05);
    expect(share(58, 72)).toBeGreaterThan(0.2);
    expect(share(72, 98)).toBeGreaterThan(0.1);
  });

  it('주의 문구는 점수가 단순한 지표라고 말한다', () => {
    expect(SCORE_NOTE).toContain('단순한 지표');
  });
});

describe('배우자 기운 — 정(正)과 편(偏)', () => {
  const rs = pairs.map(([a, b]) => ({ a, b, r: compatReport(a, b) }));
  const has = (r: ReturnType<typeof compatReport>, id: string) => r.factors.some((f) => f.id === id);

  it('서로가 서로의 배우자 기운이면 한 장으로 묶고, 이끄는 쪽·맞추는 쪽으로 감점하지 않는다', () => {
    const both = rs.filter(({ r }) => has(r, 'spouse-both') || has(r, 'spouse-both-pyeon'));
    expect(both.length).toBeGreaterThan(0);
    for (const { a, b, r } of both) {
      // 남자의 일간이 여자의 일간을 극하는 짝에서만 나온다
      expect(a.input.gender).not.toBe(b.input.gender);
      expect(has(r, 'stem-lead') || has(r, 'stem-led')).toBe(false);
      expect(has(r, 'spouse-me') || has(r, 'spouse-you')).toBe(false);
    }
  });

  it('정재↔정관은 편재↔편관보다 무겁게 본다', () => {
    const jeong = rs.flatMap(({ r }) => r.factors.filter((f) => f.id === 'spouse-both'));
    const pyeon = rs.flatMap(({ r }) => r.factors.filter((f) => f.id === 'spouse-both-pyeon'));
    expect(jeong.length).toBeGreaterThan(0);
    expect(pyeon.length).toBeGreaterThan(0);
    for (const f of jeong) expect(f.basis).toMatch(/정재.*정관|정관.*정재/);
    for (const f of pyeon) expect(f.basis).toMatch(/편재.*편관|편관.*편재/);
    expect(Math.min(...jeong.map((f) => f.points))).toBeGreaterThan(Math.max(...pyeon.map((f) => f.points)));
  });

  it('일간이 천간합이면서 서로의 배우자 기운이면, 끌림은 합에서 이미 셌으니 조금 덜 더한다', () => {
    const hapBoth = rs.filter(({ r }) => has(r, 'stem-hap') && has(r, 'spouse-both'));
    expect(hapBoth.length).toBeGreaterThan(0);
    for (const { r } of hapBoth) expect(r.factors.find((f) => f.id === 'spouse-both')!.points).toBe(8);
  });

  it('같은 성별의 짝은 한쪽 방향만 보고, 편이면 더 작게 더한다', () => {
    for (const { r } of rs.filter(({ a, b }) => a.input.gender === b.input.gender)) {
      expect(has(r, 'spouse-both') || has(r, 'spouse-both-pyeon')).toBe(false);
      for (const f of r.factors.filter((x) => x.id === 'spouse-me' || x.id === 'spouse-you')) expect(f.points).toBe(/정재|정관/.test(f.basis) ? 5 : 3);
    }
  });
});

describe('정확도 안내', () => {
  it('태어난 시간을 모르는 사람이 있으면 알려 주고, 오행 비율로 본 신호는 절반만 반영한다', () => {
    let seen = 0;
    for (const [a, b] of pairs) {
      const r = compatReport(a, b);
      const unknown = a.input.hour === null || b.input.hour === null;
      expect(r.notes.some((t) => t.includes('태어난 시간을 몰라'))).toBe(unknown);
      for (const f of r.factors.filter((x) => x.id.startsWith('fill') || x.id.startsWith('burden'))) {
        if (unknown) {
          seen++;
          expect(Math.abs(f.points)).toBeLessThanOrEqual(4);
          expect(f.basis).toContain('참고용');
        } else expect(f.basis).not.toContain('참고용');
      }
    }
    expect(seen).toBeGreaterThan(0);
  });

  it('밤 11시 무렵에 태어나 일주가 달라질 수 있으면 알려 준다', () => {
    const zi = ps.find((x) => x.warnings.some((w) => w.kind === 'zi'));
    const known = ps.find((x) => x.input.hour !== null && !x.warnings.some((w) => w.kind === 'zi' || w.kind === 'hour'));
    expect(zi && known).toBeTruthy();
    expect(compatReport(known!, zi!).notes.some((t) => t.includes('밤 11시 무렵'))).toBe(true);
    expect(compatReport(known!, known!).notes).toEqual([]);
  });
});

describe('재회', () => {
  it('점수 없이 시기·반복 조건·할 일을 준다', () => {
    for (const [a, b] of pairs.slice(0, 300)) {
      const r = reunionReport(a, b, { year: 2025, month: 3 }, a.wolun.slice(0, 12));
      expect(r).not.toHaveProperty('score');
      expect(r.breakup?.when).toBe('2025년 3월');
      expect(r.repeat.length).toBeGreaterThan(0);
      expect(r.actions.length).toBeGreaterThanOrEqual(3);
      expect(r.good.length + r.avoid.length).toBeGreaterThan(0);
      for (const g of r.good) expect(r.avoid.some((x) => x.w === g.w)).toBe(false);
      for (const t of allText({ ...r, good: r.good.map((g) => g.why), avoid: r.avoid.map((g) => g.why) })) expect(t).not.toMatch(/\((가|를|는)\)|undefined|NaN/);
    }
  });

  it('헤어진 때를 모르면 그 부분만 비운다', () => {
    const r = reunionReport(ps[0], ps[1], null, ps[0].wolun.slice(0, 12));
    expect(r.breakup).toBeNull();
    expect(r.note).toContain('점수로 말하지 않아요');
  });

  // 2025년은 乙巳년 — 巳는 亥와 충, 乙은 壬 일간에게 상관, 甲 일간에게 겁재
  const BREAK = { year: 2025, month: 3 };
  const other = (a: SajuAnalysis) => ps.find((x) => x !== a && x.input.gender !== a.input.gender && x.pillars.day.branch !== 11 && x.pillars.day.stem !== 8 && x.pillars.day.stem !== 0)!;

  it('그해가 배우자 자리를 충하면 흔들린 시기로 본다', () => {
    const a = ps.find((x) => x.pillars.day.branch === 11)!; // 亥
    expect(a).toBeTruthy();
    const r = reunionReport(a, other(a), BREAK, a.wolun.slice(0, 12));
    expect(r.breakup?.shaken).toBe(true);
    expect(r.breakup?.signals[0]).toContain('내 배우자 자리와 정면으로 부딪혔어요 (巳亥 충)');
    expect(r.breakup?.basis).toBe('2025년 乙巳(을사) · 3월 己卯(기묘)');
  });

  it('여자에게 상관의 해, 남자에게 겁재의 해는 관계를 흔든 신호로 본다', () => {
    const woman = ps.map((x) => analyze({ ...x.input, gender: 'female' }, NOW)).find((x) => x.pillars.day.stem === 8)!; // 壬
    const man = ps.map((x) => analyze({ ...x.input, gender: 'male' }, NOW)).find((x) => x.pillars.day.stem === 0)!; // 甲
    expect(woman && man).toBeTruthy();
    const w = reunionReport(woman, other(woman), BREAK, woman.wolun.slice(0, 12));
    expect(w.breakup?.shaken).toBe(true);
    expect(w.breakup?.signals.some((s) => s.includes('나에게 상관(傷官)의 해'))).toBe(true);
    const m = reunionReport(man, other(man), BREAK, man.wolun.slice(0, 12));
    expect(m.breakup?.signals.some((s) => s.includes('나에게 겁재(劫財)의 해'))).toBe(true);
    // 성별이 반대면 같은 일간이라도 그 신호는 아니다
    const swapped = analyze({ ...woman.input, gender: 'male' }, NOW);
    expect(reunionReport(swapped, other(swapped), BREAK, swapped.wolun.slice(0, 12)).breakup?.signals.some((s) => s.includes('상관(傷官)의 해'))).toBe(false);
  });

  it('신호가 없으면 흔들리지 않았다고, 약한 신호 하나뿐이면 작은 흔들림이었다고 말한다', () => {
    let quiet = 0;
    let small = 0;
    for (const [a, b] of pairs.slice(0, 600)) {
      const br = reunionReport(a, b, BREAK, a.wolun.slice(0, 12)).breakup!;
      if (!br.signals.length) {
        quiet++;
        expect(br.shaken).toBe(false);
        expect(br.text).toContain('크게 흔들지 않았어요');
      } else if (!br.shaken) {
        small++;
        expect(br.signals).toHaveLength(1);
        expect(br.text).toContain('작은 흔들림');
      }
    }
    expect(quiet).toBeGreaterThan(0);
    expect(small).toBeGreaterThan(0);
  });

  it('좋은 달은 배우자 자리를 치거나 관계를 지키는 기운을 치는 달이 아니고, 피할 달은 센 것부터 고른다', () => {
    for (const [a, b] of pairs.slice(0, 300)) {
      const months = a.wolun.slice(0, 12);
      const r = reunionReport(a, b, BREAK, months);
      const d = [a.pillars.day.branch, b.pillars.day.branch];
      for (const g of r.good) {
        const br = g.w.pillar.branch;
        expect(d.some((x) => isChung(br, x) || isWonjin(br, x) || isHyungPair(br, x))).toBe(false);
        expect(g.why).not.toMatch(/상관|겁재/);
      }
      // 화면에는 달 순서대로
      for (const list of [r.good, r.avoid]) expect(list.map((x) => x.w.startMs)).toEqual([...list.map((x) => x.w.startMs)].sort((x, y) => x - y));
      // 배우자 자리를 충하는 달이 빠졌다면, 그보다 센 달(충이거나 상관·겁재가 겹친 달)로 세 칸이 찬 것이다
      const chung = months.filter((w) => d.some((x) => isChung(w.pillar.branch, x)));
      if (!chung.every((w) => r.avoid.some((x) => x.w === w))) {
        expect(r.avoid).toHaveLength(3);
        for (const x of r.avoid) expect(x.why).toMatch(/충|상관|겁재/);
      }
    }
  });
});
