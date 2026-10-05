/** 입력값 ↔ URL 해시 쿼리 (서버 전송 없이 결과 공유·재현) */
import type { BirthInput } from '../engine/index.ts';

export function encodeInput(i: BirthInput): string {
  const q = new URLSearchParams();
  if (i.name) q.set('n', i.name);
  q.set('g', i.gender === 'male' ? 'm' : 'f');
  q.set('c', i.calendar === 'solar' ? 's' : 'l');
  q.set('y', String(i.year));
  q.set('m', String(i.month));
  q.set('d', String(i.day));
  if (i.leapMonth) q.set('lp', '1');
  if (i.hour !== null) {
    q.set('h', String(i.hour));
    q.set('mi', String(i.minute ?? 0));
  }
  q.set('lon', String(i.longitude));
  q.set('tz', i.timeZone);
  if (i.placeName) q.set('p', i.placeName);
  if (i.timeCorrection && i.timeCorrection !== 'mean') q.set('tc', i.timeCorrection);
  if (i.ziHourRule && i.ziHourRule !== 'traditional') q.set('zr', i.ziHourRule);
  return q.toString();
}

export function decodeInput(qs: string): BirthInput | null {
  const q = new URLSearchParams(qs);
  const y = Number(q.get('y'));
  const m = Number(q.get('m'));
  const d = Number(q.get('d'));
  if (!y || !m || !d) return null;
  const h = q.get('h');
  const tc = q.get('tc');
  return {
    name: q.get('n') ?? undefined,
    gender: q.get('g') === 'f' ? 'female' : 'male',
    calendar: q.get('c') === 'l' ? 'lunar' : 'solar',
    year: y,
    month: m,
    day: d,
    leapMonth: q.get('lp') === '1',
    hour: h === null ? null : Number(h),
    minute: h === null ? null : Number(q.get('mi') ?? 0),
    longitude: Number(q.get('lon') ?? 126.978),
    timeZone: q.get('tz') ?? 'Asia/Seoul',
    placeName: q.get('p') ?? undefined,
    timeCorrection: tc === 'true' || tc === 'none' ? tc : 'mean',
    ziHourRule: q.get('zr') === 'split' ? 'split' : 'traditional',
  };
}
