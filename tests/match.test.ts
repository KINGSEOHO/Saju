import { describe, expect, it } from 'vitest';
import { analyze } from '../src/engine/index.ts';
import { checkBreakup, emptyPartner, formatYm, partnerInput } from '../src/lib/partnerDraft.ts';
import { compatReport } from '../src/report/compat.ts';
import { coupleData, coupleMood, coupleSquareSvg, coupleStorySvg } from '../src/ui/CoupleShare.tsx';

const NOW = Date.UTC(2026, 9, 6);
const texts = (svg: string) => [...svg.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map((m) => m[1]);

describe('상대 정보', () => {
  it('내 성별의 반대를 기본으로 두고, 직업은 받지 않는다', () => {
    expect(emptyPartner('male').gender).toBe('female');
    expect(emptyPartner('female').gender).toBe('male');
    const input = partnerInput({ ...emptyPartner('male'), ymd: '19920304', time: '1505', name: ' 지원 ', mbti: 'ISFJ' });
    expect(input).toMatchObject({ year: 1992, month: 3, day: 4, hour: 15, minute: 5, gender: 'female', name: '지원', mbti: 'ISFJ', timeZone: 'Asia/Seoul' });
    expect(input?.job).toBeUndefined();
    expect(partnerInput({ ...emptyPartner('male'), ymd: '1992030' })).toBeNull();
    expect(partnerInput({ ...emptyPartner('male'), ymd: '19920304', time: '15' })).toBeNull();
    expect(partnerInput({ ...emptyPartner('male'), ymd: '19920304', timeUnknown: true })?.hour).toBeNull();
  });

  it('헤어진 때는 비워 둘 수 있고, 미래는 받지 않는다', () => {
    expect(checkBreakup('', NOW)).toMatchObject({ ok: true, value: null });
    expect(checkBreakup('2025', NOW).ok).toBe(false);
    expect(checkBreakup('202503', NOW).value).toEqual({ year: 2025, month: 3 });
    expect(checkBreakup('202513', NOW).error).toBeTruthy();
    expect(checkBreakup('202712', NOW).error).toBeTruthy();
    expect(formatYm('202503')).toBe('2025.03');
  });
});

describe('궁합 한 장', () => {
  const a = analyze(
    { name: '명경', gender: 'male', calendar: 'solar', year: 1990, month: 7, day: 7, hour: 7, minute: 30, longitude: 126.978, timeZone: 'Asia/Seoul', mbti: 'ENFP' },
    NOW,
  );
  const b = analyze(
    { name: '지원', gender: 'female', calendar: 'solar', year: 1992, month: 3, day: 4, hour: 15, minute: 5, longitude: 126.978, timeZone: 'Asia/Seoul', mbti: 'ISFJ' },
    NOW,
  );
  const r = compatReport(a, b);
  const d = coupleData(a, b, r, '연인');
  const cast = { me: '', you: '', mirror: '' };

  it('점수와 함께 점수 안내를 늘 싣는다', () => {
    for (const svg of [coupleStorySvg(d, cast, 'example.com'), coupleSquareSvg(d, cast, 'example.com')]) {
      const t = texts(svg);
      expect(t).toContain(String(r.score));
      expect(t.some((x) => x.includes('단순한 지표'))).toBe(true);
      expect(svg).not.toMatch(/NaN|undefined/);
    }
  });

  it('큰 제목으로 쓴 말은 목록에서 반복하지 않는다', () => {
    expect([...d.good, ...d.bad]).not.toContain(r.headline);
    expect(texts(coupleStorySvg(d, cast, 'x')).filter((x) => x === r.headline)).toHaveLength(1);
  });

  it('이름이 없으면 이름 대신 두 사람이라고 쓴다', () => {
    const anon = { ...d, me: undefined, you: undefined };
    expect(texts(coupleStorySvg(anon, cast, 'x'))).toContain('명경이가 본 두 사람');
  });

  it('점수대마다 명경이의 말이 다르다', () => {
    const lines = [90, 75, 60, 40].map((s) => coupleMood(s).bubble.join(' '));
    expect(new Set(lines).size).toBe(4);
  });
});
