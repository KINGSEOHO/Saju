import lunar from 'lunar-javascript';
import { describe, expect, it } from 'vitest';
import { BRANCHES, STEMS } from '../src/engine/constants.ts';
import { computePillars, dayPillarOfDate, type Pillar } from '../src/engine/pillars.ts';
import { wallTimeToUtc } from '../src/engine/timezone.ts';

const H = (p: Pillar | null) => (p ? STEMS[p.stem].hanja + BRANCHES[p.branch].hanja : '');

describe('사주 기둥', () => {
  it('2000-01-01 일진은 戊午', () => {
    expect(H(dayPillarOfDate(2000, 1, 1))).toBe('戊午');
  });

  it('무작위 시각 15,000건의 4기둥이 독립 구현과 일치 (중국 서머타임 연도 제외)', () => {
    let seed = 20261005;
    const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
    const bad: string[] = [];
    let n = 0;
    while (n < 15000) {
      const y = 1901 + Math.floor(rnd() * 199);
      const m = 1 + Math.floor(rnd() * 12);
      const d = 1 + Math.floor(rnd() * 28);
      const h = Math.floor(rnd() * 24);
      const mi = Math.floor(rnd() * 60);
      // 참조 구현은 서머타임을 처리하지 않으므로 중국 서머타임 시행 연도는 제외
      if ((y >= 1986 && y <= 1991) || (y >= 1940 && y <= 1949) || y === 1919) continue;
      n++;
      const r = computePillars({
        gender: 'male', calendar: 'solar', year: y, month: m, day: d, hour: h, minute: mi,
        longitude: 120, timeZone: 'Asia/Shanghai', timeCorrection: 'none', ziHourRule: 'traditional',
      });
      const ec = lunar.Solar.fromYmdHms(y, m, d, h, mi, 0).getLunar().getEightChar();
      ec.setSect(1);
      const ref = [ec.getYear(), ec.getMonth(), ec.getDay(), ec.getTime()].join(' ');
      const mine = [H(r.year), H(r.month), H(r.day), H(r.hour)].join(' ');
      if (ref !== mine) bad.push(`${y}-${m}-${d} ${h}:${mi} ref=${ref} mine=${mine}`);
    }
    expect(bad).toEqual([]);
  });

  it('입춘 직전·직후로 년주가 바뀐다 (2024 입춘 17:27 KST)', () => {
    const base = { gender: 'male' as const, calendar: 'solar' as const, year: 2024, month: 2, day: 4, longitude: 135, timeZone: 'Asia/Seoul', timeCorrection: 'none' as const };
    expect(H(computePillars({ ...base, hour: 17, minute: 26 }).year)).toBe('癸卯');
    expect(H(computePillars({ ...base, hour: 17, minute: 28 }).year)).toBe('甲辰');
    expect(H(computePillars({ ...base, hour: 17, minute: 28 }).month)).toBe('丙寅');
  });

  it('서울 평태양시 보정: 표준시 00:20 출생은 전날 자시(23시대)', () => {
    const r = computePillars({ gender: 'female', calendar: 'solar', year: 2000, month: 1, day: 2, hour: 0, minute: 20, longitude: 126.978, timeZone: 'Asia/Seoul' });
    // 00:20 − 32분 = 전날 23:48 → 23시 일진 변경 규칙에 따라 일주는 1월 2일(己未), 시주는 자시
    expect(H(r.day)).toBe('己未');
    expect(BRANCHES[r.hour!.branch].hanja).toBe('子');
  });

  it('야자시 규칙: 23:30(현지 태양시) 출생은 일주 당일, 시주는 다음 날 자시', () => {
    const base = { gender: 'male' as const, calendar: 'solar' as const, year: 2000, month: 1, day: 1, hour: 23, minute: 30, longitude: 135, timeZone: 'Asia/Seoul', timeCorrection: 'none' as const };
    const trad = computePillars({ ...base, ziHourRule: 'traditional' });
    const split = computePillars({ ...base, ziHourRule: 'split' });
    expect(H(trad.day)).toBe('己未');
    expect(H(split.day)).toBe('戊午');
    expect(H(trad.hour)).toBe(H(split.hour)); // 甲子 (己日 자시)
    expect(H(trad.hour)).toBe('甲子');
  });

  it('한국 서머타임(1987)과 1954~1961 표준시(UTC+8:30)를 반영한다', () => {
    const dst = wallTimeToUtc(1987, 7, 1, 12, 0, 'Asia/Seoul');
    expect(dst.dst).toBe(true);
    expect(new Date(dst.utcMs).toISOString()).toBe('1987-07-01T02:00:00.000Z');
    const kst830 = wallTimeToUtc(1958, 1, 1, 12, 0, 'Asia/Seoul');
    expect(kst830.standardOffsetMinutes).toBe(510);
    expect(new Date(kst830.utcMs).toISOString()).toBe('1958-01-01T03:30:00.000Z');
  });

  it('음력 입력을 양력으로 변환해 계산한다 (음력 1990-04-21 = 양력 1990-05-15)', () => {
    const r = computePillars({ gender: 'male', calendar: 'lunar', year: 1990, month: 4, day: 21, hour: 12, minute: 0, longitude: 127, timeZone: 'Asia/Seoul' });
    expect(r.solarDate).toEqual({ year: 1990, month: 5, day: 15 });
  });
});
