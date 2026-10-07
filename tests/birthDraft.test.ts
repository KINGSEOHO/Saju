import { describe, expect, it } from 'vitest';
import { checkDate, checkTime, draftToInput, EMPTY_DRAFT, formatTime, formatYmd, inputToDraft, stepValid, type Draft } from '../src/lib/birthDraft.ts';

const draft = (patch: Partial<Draft>): Draft => ({ ...EMPTY_DRAFT, ...patch });

describe('단계별 입력 — 생년월일·시각 검사', () => {
  it('입력하는 동안 숫자를 보기 좋게 바꾼다', () => {
    expect(formatYmd('1990')).toBe('1990');
    expect(formatYmd('19900')).toBe('1990.0');
    expect(formatYmd('19900707')).toBe('1990.07.07');
    expect(formatYmd('1990.07.07')).toBe('1990.07.07');
    expect(formatTime('07')).toBe('07');
    expect(formatTime('0730')).toBe('07:30');
  });

  it('양력 날짜는 요일과 음력을 함께 알려 준다', () => {
    const r = checkDate('19900707', 'solar', false);
    expect(r.ok).toBe(true);
    expect(r.note).toContain('1990년 7월 7일 토요일');
    expect(r.note).toContain('음력');
  });

  it('없는 날짜와 범위 밖은 이유를 말한다', () => {
    expect(checkDate('19900231', 'solar', false)).toMatchObject({ ok: false, error: '1990년 2월은 28일까지 있어요.' });
    expect(checkDate('19001301', 'solar', false).error).toContain('월은');
    expect(checkDate('18991231', 'solar', false).error).toContain('1900년부터');
    expect(checkDate('1990070', 'solar', false)).toMatchObject({ ok: false, error: '' });
  });

  it('음력은 양력 날짜로 바꿔 보여 주고, 윤달이 있는 달을 알려 준다', () => {
    const r = checkDate('20200415', 'lunar', false);
    expect(r.ok).toBe(true);
    expect(r.leapMonth).toBe(4);
    expect(r.note).toMatch(/^양력으로 2020년 5월 7일/);
    const leap = checkDate('20200415', 'lunar', true);
    expect(leap.note).toMatch(/^양력으로 2020년 6월 6일/);
  });

  it('시각은 24시간으로 받고, 자시는 따로 알려 준다', () => {
    expect(checkTime('0730')).toMatchObject({ ok: true, h: 7, m: 30, note: '오전 7시 30분' });
    expect(checkTime('1500').note).toBe('오후 3시');
    expect(checkTime('2330').note).toContain('자시');
    expect(checkTime('2460').ok).toBe(false);
    expect(checkTime('1275').error).toContain('분은');
  });
});

describe('단계별 입력 — 단계 통과와 결과 변환', () => {
  it('각 단계는 채워져야 다음으로 넘어간다', () => {
    expect(stepValid(draft({}))).toEqual([false, false, false, true, true]);
    expect(stepValid(draft({ ymd: '19900707', timeUnknown: true, gender: 'female' }))).toEqual([true, true, true, true, true]);
    expect(stepValid(draft({ city: '__custom', lon: '200' }))[3]).toBe(false);
    expect(stepValid(draft({ city: '__custom', lon: '-74.006', tz: 'America/New_York' }))[3]).toBe(true);
  });

  it('입력값으로 바꾸고, 다시 초안으로 되돌려도 같다', () => {
    const d = draft({ ymd: '19900707', time: '0730', gender: 'male', city: '부산', name: '홍길동', mbti: 'INTJ', job: '개발자' });
    const input = draftToInput(d);
    expect(input).toMatchObject({ year: 1990, month: 7, day: 7, hour: 7, minute: 30, gender: 'male', placeName: '부산', mbti: 'INTJ', job: '개발자' });
    const back = inputToDraft(input!);
    expect(back).toMatchObject({ ymd: '19900707', time: '0730', gender: 'male', city: '부산', name: '홍길동', mbti: 'INTJ', job: '개발자', timeUnknown: false });
  });

  it('시간 모름과 직접 입력한 곳도 그대로 옮긴다', () => {
    const input = draftToInput(draft({ ymd: '19851224', timeUnknown: true, gender: 'female', city: '__custom', lon: '-74.006', tz: 'America/New_York' }));
    expect(input).toMatchObject({ hour: null, minute: null, longitude: -74.006, timeZone: 'America/New_York', placeName: '경도 -74.006' });
    expect(inputToDraft(input!)).toMatchObject({ timeUnknown: true, time: '', city: '__custom', lon: '-74.006', tz: 'America/New_York' });
  });

  it('덜 채운 초안은 결과로 넘기지 않는다', () => {
    expect(draftToInput(draft({ ymd: '19900707' }))).toBeNull();
    expect(draftToInput(draft({ ymd: '19900707', time: '07', gender: 'male' }))).toBeNull();
  });
});
