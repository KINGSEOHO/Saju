import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vitest/config';
import { dstRows, regionRows } from './src/pages/seoTables.ts';
import { pages } from './src/pages/year2027.ts';

// 일간별 운세 페이지(/2027/…)는 엔진·풀이 지식에서 뽑아 만든다 — 만든 파일은 저장소에 넣지 않는다(.gitignore)
const generated: Record<string, string> = {};
if (!process.env.VITEST)
  for (const p of pages()) {
    mkdirSync(resolve(__dirname, p.dir), { recursive: true });
    writeFileSync(resolve(__dirname, p.dir, 'index.html'), p.html);
    generated[p.dir.replace('/', '-')] = resolve(__dirname, p.dir, 'index.html');
  }

// 구글 서치 콘솔·네이버 서치어드바이저 소유 확인 태그 — 저장소 변수 GOOGLE_SITE_VERIFICATION·NAVER_SITE_VERIFICATION에 값만 넣으면 붙는다
function siteVerification(): Plugin {
  const tag = (name: string, v?: string) => (v && /^[\w-]+$/.test(v) ? `<meta name="${name}" content="${v}" />` : '');
  return {
    name: 'site-verification',
    transformIndexHtml: (html) =>
      html
        .replace('<!--dst-rows-->', dstRows())
        .replace('<!--region-rows-->', regionRows())
        .replace('<!--site-verification-->', tag('google-site-verification', process.env.VITE_GOOGLE_SITE_VERIFICATION) + tag('naver-site-verification', process.env.VITE_NAVER_SITE_VERIFICATION)),
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
    // 검색으로 들어오는 진짜 주소 페이지 (#/ 해시 주소가 아니라 따로 색인돼요)
    rollupOptions: { input: { main: resolve(__dirname, 'index.html'), time: resolve(__dirname, 'time/index.html'), ...generated } },
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
