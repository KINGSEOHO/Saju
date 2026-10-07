/**
 * 미리보기 한 장 만들기 — 사이트 전체를 HTML 파일 하나로 묶는다.
 * 실제 사이트(GitHub Pages)에 올리기 전에, 바꾼 화면을 Claude 앱의 미리보기(Artifact)로 띄워 함께 보려고 쓴다.
 *
 *   node scripts/preview-artifact.mjs [출력 파일]   (기본: dist-preview/index.html)
 *
 * - JS·CSS·글꼴(함초롬바탕·Pretendard)을 모두 파일 안에 넣는다. Noto Serif KR(예비 글꼴)은 크기 때문에 뺀다.
 * - 미리보기 창이 정하는 밝은/어두운 테마를 따르도록 어두운 색 규칙에 data-theme 조건을 더한다.
 * - 리뷰·이벤트 주소(VITE_SHEET_URL)와 카카오 키는 넣지 않는다 — 미리보기에서 누른 것이 시트에 쌓이지 않게.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outFile = path.resolve(process.argv[2] ?? path.join(root, 'dist-preview/index.html'));
const tmp = path.join(root, 'dist-preview/.build');

process.env.VITE_SHEET_URL = '';
process.env.VITE_KAKAO_KEY = '';

await build({
  root,
  configFile: path.join(root, 'vite.config.ts'),
  logLevel: 'warn',
  build: {
    outDir: tmp,
    emptyOutDir: true,
    // Noto Serif KR 조각 파일만 빼고 모두 파일 안에 넣는다
    assetsInlineLimit: (file) => !/noto-serif-kr/.test(file),
    cssCodeSplit: false,
    modulePreload: false,
    chunkSizeWarningLimit: 100000,
    rollupOptions: { output: { codeSplitting: false } },
  },
});

const dir = path.join(tmp, 'assets');
const files = fs.readdirSync(dir);
const js = files.filter((f) => f.endsWith('.js'));
const css = files.filter((f) => f.endsWith('.css'));
if (js.length !== 1 || css.length !== 1) throw new Error(`묶음이 하나가 아니에요: ${files.join(', ')}`);

const dataUri = (file, type) => `data:${type};base64,${fs.readFileSync(file).toString('base64')}`;

let style = fs.readFileSync(path.join(dir, css[0]), 'utf8');
// 예비 명조(Noto Serif KR)는 뺀다
style = style.replace(/@font-face\{[^}]*Noto Serif KR[^}]*\}/g, '');
// 함초롬바탕 (public/fonts — 빌드가 손대지 않는 경로라 직접 넣는다)
style = style.replace(/url\(["']?[^"')]*fonts\/(HCRBatang(?:-Bold)?\.woff2)["']?\)/g, (_, f) => `url(${dataUri(path.join(root, 'public/fonts', f), 'font/woff2')})`);
// 미리보기 창의 테마 선택(data-theme)도 따른다
style = style.replace(/@media \(prefers-color-scheme:\s*dark\)\s*\{\s*:root\s*\{([^}]*)\}\s*\}/, (_, body) => `@media (prefers-color-scheme:dark){:root:not([data-theme=light]){${body}}}:root[data-theme=dark]{${body}}`);
if (/url\((?!data:)/.test(style)) console.warn('[주의] 파일 밖을 가리키는 url()이 남아 있어요');

const script = fs.readFileSync(path.join(dir, js[0]), 'utf8').replace(/<\/script/gi, '<\\/script');

const html = [
  '<title>명경사주 미리보기</title>',
  '<meta name="description" content="명경사주 수정본 미리보기 (실제 사이트에는 반영되지 않음)">',
  `<style>${style}</style>`,
  // 미리보기 창이 body에 기본 글꼴·바탕을 깔아 두므로(층 없는 규칙이라 사이트의 기본값보다 앞선다) 사이트 값으로 되돌린다
  '<style>body{margin:0;background:var(--c-bg);color:var(--c-ink);font-family:var(--font-sans);font-size:16px;line-height:1.5}</style>',
  '<div id="root"></div>',
  `<script type="module">${script}</script>`,
  '',
].join('\n');

fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, html);
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`${path.relative(root, outFile)} ${(html.length / 1024 / 1024).toFixed(1)}MB`);
