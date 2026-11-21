import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vitest/config';

// 구글 서치 콘솔·네이버 서치어드바이저 소유 확인 태그 — 저장소 변수 GOOGLE_SITE_VERIFICATION·NAVER_SITE_VERIFICATION에 값만 넣으면 붙는다 (네이버 값은 index.html에 이미 적어 둠 — 공개돼도 되는 값)
function siteVerification(): Plugin {
  const tag = (name: string, v?: string) => (v && /^[\w-]+$/.test(v) ? `<meta name="${name}" content="${v}" />` : '');
  return {
    name: 'site-verification',
    transformIndexHtml: (html) =>
      html.replace('<!--site-verification-->', tag('google-site-verification', process.env.VITE_GOOGLE_SITE_VERIFICATION) + tag('naver-site-verification', process.env.VITE_NAVER_SITE_VERIFICATION)),
  };
}

export default defineConfig({
  // 상대 경로: GitHub Pages(https://아이디.github.io/저장소/) 하위 경로에서도 동작 (라우팅은 # 해시 방식)
  base: './',
  plugins: [react(), tailwindcss(), siteVerification()],
  build: {
    // 첫 화면 묶음에는 입력 직후 바로 보여 줄 풀이 지식베이스(한국어 문장)가 통째로 들어 있다(압축 후 약 160kB).
    // 웹툰·교차 검증은 따로 불러오므로, 경고 기준만 조금 올린다.
    chunkSizeWarningLimit: 600,
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:8787',
    },
  },
  test: {
    include: ['tests/**/*.test.ts'],
    testTimeout: 120000,
  },
});
