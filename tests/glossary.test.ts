import { describe, expect, it } from 'vitest';
import { GLOSSARY, glossOf, glossSplit } from '../src/report/glossary.ts';

const terms = (s: string) => glossSplit(s).filter((p): p is { key: string; text: string } => typeof p !== 'string').map((p) => p.key);

describe('용어 사전 자동 밑줄', () => {
  it('사주 용어를 찾고, 같은 용어는 처음 한 번만 표시한다', () => {
    expect(terms('용신은 목, 희신 수, 기신 금. 용신이 들어오는 해')).toEqual(['용신', '희신', '기신']);
    expect(terms('억부용신과 조후용신')).toEqual(['억부용신', '조후용신']);
    expect(terms('2026년 세운 편관(기신)')).toEqual(['세운', '편관', '기신']);
    expect(terms('목(木)·수(水) 기운')).toEqual(['목(木)', '수(水)']);
    expect(terms('역마가 있어 이동이 많고 도화도 있다')).toEqual(['역마살', '도화살']);
  });

  it('일상어로 쓰인 말은 건드리지 않는다', () => {
    expect(terms('그건 상관없이 해도 돼요')).toEqual([]);
    expect(terms('식상한 표현')).toEqual([]);
    expect(terms('계획을 세운 뒤 움직이세요')).toEqual([]);
    expect(terms('목표를 세운다')).toEqual([]);
    expect(terms('일주일에 한 번')).toEqual([]);
    expect(terms('결정인 것 같아요')).toEqual([]);
    expect(terms('도화지에 그림을 그려요')).toEqual([]);
    expect(terms('월간 계획을 세워요')).toEqual([]);
    expect(terms('통근 시간이 길어요')).toEqual([]);
    expect(terms('주변의 지지를 받아')).toEqual(['지지']); // 명사로 쓰일 때는 구분이 어려워 허용
    expect(terms('지지해 주는 사람')).toEqual([]);
  });

  it('나눈 조각을 이으면 원문과 같다', () => {
    const s = '乙丑 일주, 편재격, 신약. 용신은 목(억부), 희신 수, 기신 금. 재다신약 구조라 일지충이 오면 조심';
    const joined = glossSplit(s)
      .map((p) => (typeof p === 'string' ? p : p.text))
      .join('');
    expect(joined).toBe(s);
  });

  it('모든 표제어와 별칭에 풀이가 있다', () => {
    for (const [k, v] of Object.entries(GLOSSARY)) {
      expect(v.length, k).toBeGreaterThan(8);
      expect(v).not.toMatch(/undefined/);
    }
    expect(glossOf('역마')?.key).toBe('역마살');
    expect(glossOf('정관격')?.desc).toContain('모범생');
  });
});
