/** /2027/ 모음 페이지의 '내 일간 찾기' — 양력 생일을 고르면 그날의 일간과 그 일간 페이지로 가는 길을 보여 준다. 브라우저 안에서만 계산해요 */
import './static.ts';
import { ELEMENT_KO, STEMS } from '../engine/constants.ts';
import { josa } from '../engine/josa.ts';
import { dayPillarOfDate } from '../engine/pillars.ts';

const SLUGS = ['gap', 'eul', 'byeong', 'jeong', 'mu', 'gi', 'gyeong', 'sin', 'im', 'gye'];
const box = document.getElementById('stem-finder');
if (box) {
  const sel = (label: string, from: number, to: number, unit: string, init: number) => {
    const el = document.createElement('select');
    el.className = 'field min-w-0 px-3 tabular-nums';
    el.setAttribute('aria-label', label);
    const step = from <= to ? 1 : -1;
    for (let n = from; n !== to + step; n += step) el.add(new Option(`${n}${unit}`, String(n), n === init, n === init));
    return el;
  };
  const y = sel('년', new Date().getFullYear(), 1900, '년', 1990);
  const m = sel('월', 1, 12, '월', 1);
  const d = sel('일', 1, 31, '일', 1);
  const row = document.createElement('div');
  row.className = 'grid grid-cols-[1.4fr_1fr_1fr] gap-2';
  row.append(y, m, d);
  const out = document.createElement('div');
  out.className = 'mt-4';
  out.setAttribute('aria-live', 'polite');
  box.replaceChildren(row, out);
  const show = () => {
    const [yy, mm, dd] = [Number(y.value), Number(m.value), Number(d.value)];
    if (new Date(Date.UTC(yy, mm, 0)).getUTCDate() < dd) {
      out.innerHTML = '<p class="text-label text-sub">없는 날짜예요. 일을 다시 골라 주세요.</p>';
      return;
    }
    const i = dayPillarOfDate(yy, mm, dd).stem;
    const name = STEMS[i].ko + ELEMENT_KO[STEMS[i].element];
    out.innerHTML = `<p class="text-ui text-ink">이날 태어났다면 일간은 <b><span class="hanja">${STEMS[i].hanja}</span> ${josa(name, '이에요/예요')}</b>.</p><a href="${SLUGS[i]}/" class="btn-primary mt-3 w-full">${name}의 2027년 보기</a>`;
  };
  for (const el of [y, m, d]) el.addEventListener('change', show);
  show();
}
