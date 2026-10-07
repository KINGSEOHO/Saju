import { describe, expect, it } from 'vitest';
import { mbtiLine, mbtiShort, type StoryData } from '../src/ui/StoryShare.tsx';

const base: StoryData = { headline: '', subline: '', tags: [] };
const L = (user: string, saju: string | null, verdict: 'agree' | 'neutral' | 'differ') => ({ user, saju, verdict });

describe('공유 사진의 MBTI × 사주 한 줄', () => {
  it('반전 글자가 있으면 겉과 속을 모두 적는다', () => {
    const d = { ...base, mbti: { type: 'ISTJ', nick: '', letters: [L('I', null, 'neutral'), L('S', null, 'neutral'), L('T', 'F', 'differ'), L('J', 'P', 'differ')] } };
    expect(mbtiLine(d)).toBe('겉은 TJ, 속은 FP — 반전 있는 ISTJ');
    expect(mbtiShort(d)).toBe('ISTJ × 사주 · 속은 FP인 반전형');
  });
  it('많이 맞으면 일치 개수를, 일부만 맞으면 그 글자를 말한다', () => {
    const many = { ...base, mbti: { type: 'ENFP', nick: '', letters: [L('E', 'E', 'agree'), L('N', 'N', 'agree'), L('F', 'F', 'agree'), L('P', null, 'neutral')] } };
    expect(mbtiLine(many)).toBe('MBTI랑 사주가 짰나 봐요 — 4글자 중 3개 일치');
    const some = { ...base, mbti: { type: 'ENFP', nick: '', letters: [L('E', null, 'neutral'), L('N', null, 'neutral'), L('F', 'F', 'agree'), L('P', 'P', 'agree')] } };
    expect(mbtiLine(some)).toBe('사주도 인정한 글자: F·P');
    expect(mbtiShort(some)).toBe('ENFP × 사주 · F·P 일치');
  });
  it('MBTI가 없으면 친구에게 맞혀 보라고 한다', () => {
    expect(mbtiLine({ ...base, mbti: null })).toBe('사주로 본 내 MBTI — 너는 몇 글자 맞을까?');
    expect(mbtiShort({ ...base, mbti: null })).toBeNull();
  });
});
