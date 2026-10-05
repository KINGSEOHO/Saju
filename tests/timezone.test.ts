import { describe, expect, it } from 'vitest';
import { wallTimeToUtc } from '../src/engine/timezone.ts';

describe('한국 표준시·서머타임 표', () => {
  it('1905~1995년 시각 표본에서 IANA tz(Intl) 결과와 일치한다', () => {
    const bad: string[] = [];
    for (let ms = Date.UTC(1905, 0, 1); ms < Date.UTC(1995, 0, 1); ms += 3600000 * 11) {
      const d = new Date(ms);
      const args = [d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate(), d.getUTCHours(), 30] as const;
      const own = wallTimeToUtc(...args, 'Asia/Seoul');
      const intl = wallTimeToUtc(...args, 'ROK'); // 'ROK' 는 Intl 경로로 같은 tz 데이터를 사용
      if (!own.ambiguous && !intl.ambiguous && own.utcMs !== intl.utcMs) bad.push(args.join('-'));
    }
    expect(bad).toEqual([]);
  });
});
