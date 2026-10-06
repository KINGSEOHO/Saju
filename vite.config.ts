import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // 상대 경로: GitHub Pages(https://아이디.github.io/저장소/) 하위 경로에서도 동작 (라우팅은 # 해시 방식)
  base: './',
  plugins: [react(), tailwindcss()],
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
