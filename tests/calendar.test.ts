import KoreanLunarCalendar from 'korean-lunar-calendar';
import { describe, expect, it } from 'vitest';
import { leapMonthOf, lunarToSolar, solarToLunar } from '../src/engine/calendar.ts';

describe('한국 음력 변환 (KASI 기준 데이터 대조)', () => {
  it('1900-01-01 ~ 2050-12-31 모든 날짜의 양력→음력이 KASI 자료와 일치한다', () => {
    const cal = new KoreanLunarCalendar();
    const mismatches: string[] = [];
    for (let ms = Date.UTC(1900, 0, 1); ms <= Date.UTC(2050, 11, 31); ms += 86400000) {
      const d = new Date(ms);
      const y = d.getUTCFullYear();
      const m = d.getUTCMonth() + 1;
      const dd = d.getUTCDate();
      cal.setSolarDate(y, m, dd);
      const ref = cal.getLunarCalendar();
      const mine = solarToLunar(y, m, dd);
      if (ref.year !== mine.year || ref.month !== mine.month || ref.day !== mine.day || !!ref.intercalation !== mine.leap) {
        mismatches.push(`${y}-${m}-${dd}`);
      }
    }
    expect(mismatches).toEqual([]);
  });

  it('음력→양력 왕복 변환이 일치한다 (윤달 포함)', () => {
    for (let y = 1900; y <= 2099; y++) {
      const leap = leapMonthOf(y);
      for (let m = 1; m <= 12; m++) {
        for (const isLeap of leap === m ? [false, true] : [false]) {
          for (const day of [1, 15, 29]) {
            const s = lunarToSolar(y, m, day, isLeap);
            expect(s, `${y}-${isLeap ? '윤' : ''}${m}-${day}`).not.toBeNull();
            const back = solarToLunar(s!.year, s!.month, s!.day);
            expect(back).toEqual({ year: y, month: m, day, leap: isLeap });
          }
        }
      }
    }
  });

  it('알려진 윤달: 2020 윤4월, 2023 윤2월, 2025 윤6월, 2028 윤5월', () => {
    expect(leapMonthOf(2020)).toBe(4);
    expect(leapMonthOf(2023)).toBe(2);
    expect(leapMonthOf(2025)).toBe(6);
    expect(leapMonthOf(2028)).toBe(5);
    expect(leapMonthOf(2024)).toBe(0);
  });

  it('존재하지 않는 음력 날짜는 null', () => {
    expect(lunarToSolar(2024, 4, 1, true)).toBeNull();
    expect(lunarToSolar(2024, 1, 31)).toBeNull();
  });
});
