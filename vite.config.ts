import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // 상대 경로: GitHub Pages(https://아이디.github.io/저장소/) 하위 경로에서도 동작 (라우팅은 # 해시 방식)
  base: './',
  plugins: [react(), tailwindcss()],
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
