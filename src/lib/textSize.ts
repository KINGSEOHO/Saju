/** 글자 크기 — 보통 · 크게 · 더 크게. 이 기기에만 기억한다 (글자·여백이 rem이라 바탕 크기만 키우면 함께 커진다) */
import { STORAGE } from './storageKeys.ts';

export const TEXT_SIZES = [
  { label: '보통', scale: 100 },
  { label: '크게', scale: 112.5 },
  { label: '더 크게', scale: 125 },
] as const;

export function loadTextSize(): number {
  try {
    const n = Number(localStorage.getItem(STORAGE.textSize));
    return Number.isInteger(n) && n >= 0 && n < TEXT_SIZES.length ? n : 0;
  } catch {
    return 0;
  }
}

export function applyTextSize(i: number) {
  document.documentElement.style.fontSize = i ? `${TEXT_SIZES[i].scale}%` : '';
}

export function saveTextSize(i: number) {
  applyTextSize(i);
  try {
    if (i) localStorage.setItem(STORAGE.textSize, String(i));
    else localStorage.removeItem(STORAGE.textSize);
  } catch {
    /* 저장이 막힌 브라우저에서는 이번 화면에서만 */
  }
}
