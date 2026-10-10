import { describe, expect, it } from 'vitest';
import { CITIES, OVERSEAS, REGIONS, regionOf } from '../src/engine/timezone.ts';
import { draftToInput, EMPTY_DRAFT, inputToDraft, stepValid, type Draft } from '../src/lib/birthDraft.ts';

const draft = (patch: Partial<Draft>): Draft => ({ ...EMPTY_DRAFT, ymd: '19900707', time: '0730', gender: 'female', ...patch });

describe('출생지 — 시·도를 고르고 그 안의 시·군을 고른다', () => {
  it('17개 시·도와 북한, 시·군 수가 지금 행정구역과 같다', () => {
    expect(REGIONS.map((r) => r.name)).toEqual(['서울', '부산', '대구', '인천', '광주', '대전', '울산', '세종', '경기', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주', '북한']);
    const count = (name: string) => REGIONS.find((r) => r.name === name)!.cities.length;
    expect([count('경기'), count('강원'), count('충북'), count('충남'), count('전북'), count('전남'), count('경북'), count('경남'), count('제주')]).toEqual([31, 18, 11, 15, 14, 22, 22, 18, 2]);
  });

  it('이름이 겹치지 않는다 — 광주광역시와 경기 광주, 강원 고성과 경남 고성', () => {
    const names = CITIES.map((c) => c.name);
    expect(new Set(names).size).toBe(names.length);
    expect(regionOf('광주')?.name).toBe('광주');
    expect(regionOf('경기 광주')?.name).toBe('경기');
    expect(regionOf('강원 고성')?.name).toBe('강원');
    expect(regionOf('경남 고성')?.name).toBe('경남');
    expect(regionOf('군위')?.name).toBe('대구');
    expect(regionOf('도쿄')).toBeUndefined();
    expect(OVERSEAS.every((c) => !regionOf(c.name))).toBe(true);
  });

  it('좌표가 한반도 안이고, 시간대가 맞다 (북한은 평양 시간)', () => {
    for (const r of REGIONS)
      for (const c of r.cities) {
        expect(c.longitude, c.name).toBeGreaterThan(124.3);
        expect(c.longitude, c.name).toBeLessThan(131);
        expect(c.latitude, c.name).toBeGreaterThan(33.1);
        expect(c.latitude, c.name).toBeLessThan(r.name === '북한' ? 43 : 38.7);
        expect(c.timeZone, c.name).toBe(r.name === '북한' ? 'Asia/Pyongyang' : 'Asia/Seoul');
      }
  });

  it('예전 목록의 이름과 좌표는 그대로라 저장된 입력과 공유 주소가 그대로 열린다', () => {
    const old: [string, number][] = [
      ['서울', 126.978],
      ['부산', 129.075],
      ['대구', 128.601],
      ['인천', 126.705],
      ['광주', 126.851],
      ['대전', 127.385],
      ['울산', 129.311],
      ['세종', 127.289],
      ['수원', 127.028],
      ['성남', 127.126],
      ['고양', 126.832],
      ['용인', 127.177],
      ['의정부', 127.033],
      ['춘천', 127.73],
      ['원주', 127.92],
      ['강릉', 128.876],
      ['속초', 128.592],
      ['청주', 127.489],
      ['충주', 127.926],
      ['천안', 127.114],
      ['공주', 127.119],
      ['전주', 127.148],
      ['군산', 126.737],
      ['익산', 126.957],
      ['목포', 126.392],
      ['여수', 127.662],
      ['순천', 127.487],
      ['포항', 129.343],
      ['경주', 129.225],
      ['안동', 128.729],
      ['구미', 128.344],
      ['창원', 128.681],
      ['진주', 128.108],
      ['김해', 128.889],
      ['통영', 128.433],
      ['제주', 126.531],
      ['서귀포', 126.56],
      ['울릉', 130.906],
      ['평양', 125.754],
      ['도쿄', 139.692],
    ];
    for (const [name, lon] of old) expect(CITIES.find((c) => c.name === name)?.longitude, name).toBe(lon);
  });

  it('새로 들어온 시·군으로 입력하고 다시 불러올 수 있다', () => {
    const input = draftToInput(draft({ city: '경기 광주' }))!;
    expect(input).toMatchObject({ placeName: '경기 광주', longitude: 127.255, timeZone: 'Asia/Seoul' });
    expect(inputToDraft(input).city).toBe('경기 광주');
    expect(draftToInput(draft({ city: '백령도' }))!.longitude).toBe(124.7);
    expect(draftToInput(draft({ city: '함흥' }))!.timeZone).toBe('Asia/Pyongyang');
  });

  it('시·도만 고르고 시·군을 아직 안 골랐으면 다음으로 넘어가지 않는다', () => {
    expect(stepValid(draft({ city: '' }))[3]).toBe(false);
    expect(stepValid(draft({ city: '평택' }))[3]).toBe(true);
  });
});
