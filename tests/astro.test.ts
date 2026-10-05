import lunar from 'lunar-javascript';
import { describe, expect, it } from 'vitest';
import { solarTermsOfYear } from '../src/engine/astro.ts';

const ZH: Record<string, string> = {
  춘분: '春分', 청명: '清明', 곡우: '谷雨', 입하: '立夏', 소만: '小满', 망종: '芒种', 하지: '夏至', 소서: '小暑',
  대서: '大暑', 입추: '立秋', 처서: '处暑', 백로: '白露', 추분: '秋分', 한로: '寒露', 상강: '霜降', 입동: '立冬',
  소설: '小雪', 대설: '大雪', 동지: '冬至', 소한: '小寒', 대한: '大寒', 입춘: '立春', 우수: '雨水', 경칩: '惊蛰',
};

const kst = (ms: number) => new Date(ms + 9 * 3600000).toISOString().slice(0, 16);

describe('24절기 시각', () => {
  it('KASI 발표 시각과 분 단위로 일치 (2024·2025 입춘)', () => {
    expect(kst(solarTermsOfYear(2024).find((t) => t.name === '입춘')!.ms)).toBe('2024-02-04T17:27');
    expect(kst(solarTermsOfYear(2025).find((t) => t.name === '입춘')!.ms)).toBe('2025-02-03T23:10');
  });

  it('1900~2100년 전 절기가 독립 구현(寿星万年历 알고리즘)과 60초 이내로 일치', () => {
    let maxAbs = 0;
    let n = 0;
    for (let y = 1900; y <= 2100; y++) {
      const table = lunar.Solar.fromYmd(y, 6, 1).getLunar().getJieQiTable();
      for (const t of solarTermsOfYear(y)) {
        const s = table[ZH[t.name]];
        if (!s || s.getYear() !== y) continue;
        const refMs = Date.UTC(s.getYear(), s.getMonth() - 1, s.getDay(), s.getHour(), s.getMinute(), s.getSecond()) - 8 * 3600000;
        maxAbs = Math.max(maxAbs, Math.abs(t.ms - refMs) / 1000);
        n++;
      }
    }
    expect(n).toBeGreaterThan(4500);
    expect(maxAbs).toBeLessThan(60);
  });
});
