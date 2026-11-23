import { describe, expect, it } from 'vitest';
import { readSource, SOURCE_FROM, tagged } from '../src/lib/source.ts';

describe('들어온 경로', () => {
  it('주소 꼬리표·앱·넘어온 사이트의 도메인만 읽는다', () => {
    expect(readSource('?utm_source=Threads&utm_medium=bio', 'Mozilla/5.0', 'https://www.threads.net/@someone/post/123?x=1', 'mgsaju.io.kr')).toEqual({
      src: 'threads',
      medium: 'bio',
      ref: 'threads.net',
    });
    expect(readSource('', 'Mozilla/5.0 KAKAOTALK 10.0', '', 'mgsaju.io.kr')).toEqual({ app: 'kakao' });
    // 넘어온 곳의 주소 전체·검색어는 남기지 않는다
    expect(JSON.stringify(readSource('', 'Mozilla/5.0', 'https://search.naver.com/search.naver?query=%EB%82%B4+%EC%9D%B4%EB%A6%84', 'mgsaju.io.kr'))).toBe('{"ref":"search.naver.com"}');
  });

  it('이상한 꼬리표와 우리 사이트 안에서의 이동은 남기지 않는다', () => {
    expect(readSource('?utm_source=<script>&utm_medium=' + 'a'.repeat(40), 'Mozilla/5.0', 'https://mgsaju.io.kr/time/', 'mgsaju.io.kr')).toEqual({});
    expect(readSource('?n=김명경&y=1995', 'Mozilla/5.0', 'not a url', 'mgsaju.io.kr')).toEqual({});
  });

  it('공유 주소에 꼬리표를 붙인다', () => {
    expect(tagged('https://mgsaju.io.kr/', 'kakao')).toBe('https://mgsaju.io.kr/?utm_source=kakao&utm_medium=share&utm_campaign=story');
    expect(tagged('https://mgsaju.io.kr/', 'instagram', 'story', 'story')).toBe('https://mgsaju.io.kr/?utm_source=instagram&utm_medium=story&utm_campaign=story');
  });

  it('처리방침 시행일(2026-12-01 한국 시각)부터 남긴다', () => {
    expect(new Date(SOURCE_FROM).toISOString()).toBe('2026-11-30T15:00:00.000Z');
  });
});
