/** 검색용 페이지에 미리 넣어 두는 표 — 사이트를 만들 때(빌드) 계산 엔진의 값으로 채운다 (손으로 옮겨 적지 않게) */
import { koreaDstPeriods, REGIONS } from '../engine/timezone.ts';

const pad = (n: number) => String(n).padStart(2, '0');

/** 한국 서머타임 기간 — 엔진이 계산에 쓰는 그 기간 */
export function dstRows(): string {
  return koreaDstPeriods()
    .map(({ start: [y, m, d, h], end: [ey, em, ed, eh] }) => {
      const end = new Date(Date.UTC(ey, em - 1, ed, eh));
      const label = eh === 0 ? new Date(end.getTime() - 86400000) : end;
      const endText = eh === 0 ? `${label.getUTCMonth() + 1}월 ${label.getUTCDate()}일 24시` : `${em}월 ${ed}일 ${pad(eh)}시`;
      return `<tr><td>${y}년</td><td>${m}월 ${d}일 ${pad(h)}시</td><td>${endText}</td></tr>`;
    })
    .join('\n');
}

/** 시·도별 경도 보정 — 표준시(동경 135°)보다 해가 몇 분 늦게 뜨는지. 시·도마다 첫째 도시(시청 자리) 기준 */
export function regionRows(): string {
  return REGIONS.filter((r) => r.cities[0].timeZone === 'Asia/Seoul')
    .map((r) => {
      const c = r.cities[0];
      const min = Math.round((135 - c.longitude) * 4);
      return `<tr><td>${r.full}</td><td>${c.longitude.toFixed(2)}°</td><td>약 ${min}분 늦음</td></tr>`;
    })
    .join('\n');
}
