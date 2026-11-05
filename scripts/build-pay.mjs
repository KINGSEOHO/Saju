/**
 * 결제 확인 함수 묶기 — server/pay/supabase.ts(+ core.ts, 이용권 계산)를 Supabase에 올릴 파일 하나로.
 *   node scripts/build-pay.mjs   → supabase/functions/pay/index.js
 * 화면과 같은 이용권 계산(src/lib/entitlements.ts)을 그대로 쓰므로, 가격·규칙을 바꾸면 함수도 다시 올린다.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
await build({
  root,
  configFile: false,
  publicDir: false,
  logLevel: 'warn',
  // 결제 함수에서는 시안 스위치가 언제나 꺼져 있다
  define: { 'import.meta.env.VITE_PAYWALL_DEMO': '""', 'import.meta.env': '{}' },
  build: {
    outDir: path.join(root, 'supabase/functions/pay'),
    emptyOutDir: false,
    minify: false,
    target: 'esnext',
    lib: { entry: path.join(root, 'server/pay/supabase.ts'), formats: ['es'], fileName: () => 'index.js' },
  },
});
console.log('supabase/functions/pay/index.js');
