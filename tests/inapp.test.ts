import { describe, expect, it } from 'vitest';
import { inApp } from '../src/lib/inapp.ts';

describe('앱 안 브라우저 알아보기', () => {
  it('카카오톡·인스타그램·페이스북·네이버 앱 안 브라우저를 알아본다', () => {
    expect(inApp('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 KAKAOTALK 10.9.0')).toBe('kakao');
    expect(inApp('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 350.0.0.0')).toBe('instagram');
    expect(inApp('Mozilla/5.0 (Linux; Android 14; wv) AppleWebKit/537.36 Chrome/129.0 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/480.0]')).toBe('facebook');
    expect(inApp('Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/129.0 Mobile Safari/537.36 NAVER(inapp; search; 2000; 12.0.0)')).toBe('naver');
    expect(inApp('Mozilla/5.0 (Linux; Android 14; SM-S921N; wv) AppleWebKit/537.36 Version/4.0 Chrome/129.0 Mobile Safari/537.36')).toBe('other');
  });
  it('보통 브라우저는 그대로 둔다', () => {
    expect(inApp('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1')).toBeNull();
    expect(inApp('Mozilla/5.0 (Linux; Android 14; SM-S921N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36')).toBeNull();
    expect(inApp('Mozilla/5.0 (Linux; Android 14; SM-S921N) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/26.0 Chrome/122.0 Mobile Safari/537.36')).toBeNull();
  });
});
