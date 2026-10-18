// 공유 미리보기 사진(public/og.png) 만들기: node scripts/make-og.mjs  (Playwright 필요)
import { createRequire } from 'node:module';
const { chromium } = createRequire(process.env.PLAYWRIGHT_DIR || '/opt/node22/lib/node_modules/')('playwright');
import { readFileSync } from 'node:fs';
const f = (n) => readFileSync(new URL('../public/fonts/', import.meta.url).pathname + n).toString('base64');
const html = `<style>@font-face{font-family:H;src:url(data:font/woff2;base64,${f('HCRBatang.woff2')})}@font-face{font-family:H;font-weight:700;src:url(data:font/woff2;base64,${f('HCRBatang-Bold.woff2')})}
body{margin:0;width:1200px;height:630px;background:#fff;font-family:H,serif;color:#1e1d1b;display:flex}
.l{padding:80px 0 0 88px;flex:1}.k{font:600 28px sans-serif;color:#33574d}h1{white-space:nowrap;font-size:58px;line-height:1.3;margin:28px 0 0;font-weight:700}
p{font:30px sans-serif;color:#6a6966;margin:28px 0 0}
.t{margin:70px 88px 0 0;border-top:4px solid #343331;border-bottom:4px solid #343331;display:grid;grid-template-columns:repeat(4,96px);align-self:flex-start}
.t div{text-align:center;font-weight:700;font-size:72px;padding:18px 0;border-left:2px solid #e4e3e0}.t div:first-child{border-left:0}.d{background:#f3f6f5}
.u{position:absolute;left:88px;bottom:56px;font:600 26px sans-serif;color:#33574d}</style>
<div class="l"><div class="k">명경사주 · 정밀 만세력</div><h1>정확하게 계산하고,<br>있는 그대로 말해요.</h1><p>강점과 약점을 근거와 함께</p></div>
<div class="t"><div>乙<br>卯</div><div class="d">癸<br>酉</div><div>壬<br>午</div><div>庚<br>午</div></div>
<div class="u">mgsaju.io.kr</div>`;
const b = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport: { width: 1200, height: 630 } });
await p.setContent(html); await p.waitForTimeout(500);
await p.screenshot({ path: new URL('../public/og.png', import.meta.url).pathname }); await b.close();
