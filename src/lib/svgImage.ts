/** SVG → PNG 저장·공유 (웹툰·정체성 카드 공용) */
import { inApp, isIOS } from './inapp.ts';

export const SVG_FONT =
  "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', 'Malgun Gothic', 'Noto Sans KR', 'Noto Sans CJK KR', sans-serif";

/** 명조 — 기기에 설치된 바탕체를 쓴다 (함초롱바탕 → 본명조 → 애플명조 → 바탕) */
export const SVG_SERIF = "'HCR Batang', 'Noto Serif KR', 'Noto Serif CJK KR', 'Source Han Serif K', AppleMyungjo, Batang, serif";

export const escXml = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** SVG 문자열을 캔버스에 그려 PNG로 만든다 (웹폰트 대신 기기 글꼴로 그려진다) */
export async function svgStringToPng(svg: string, width: number, height: number, scale = 2): Promise<Blob> {
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('이미지를 만들지 못했어요.'));
      img.src = url;
    });
    const canvas = document.createElement('canvas');
    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('이 브라우저에서는 이미지를 만들 수 없어요.');
    ctx.scale(scale, scale);
    ctx.drawImage(img, 0, 0, width, height);
    return await new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('이미지를 만들지 못했어요.'))), 'image/png'));
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** 화면에 그려진 SVG 요소 하나를 그대로 PNG로 */
export function svgElementToPng(el: SVGSVGElement, width: number, height: number, scale = 2): Promise<Blob> {
  let s = new XMLSerializer().serializeToString(el);
  s = s.replace(/^<svg\b[^>]*>/, `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" font-family="${escXml(SVG_FONT)}">`);
  return svgStringToPng(s, width, height, scale);
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export type SaveResult = 'shared' | 'downloaded' | 'shown' | 'cancelled';

/** 사진을 화면에 크게 띄운다(길게 눌러 저장). 앱 안 브라우저처럼 내려받기가 막히는 곳에서 쓴다 — ImageSheet가 받아서 보여 준다 */
export function showImage(blob: Blob, title: string, hint?: string) {
  window.dispatchEvent(new CustomEvent('mg-show-image', { detail: { blob, title, hint } }));
}

/**
 * 사진으로 저장
 * - 앱 안 브라우저: 화면에 띄워 길게 눌러 저장
 * - 아이폰: 공유 창의 '이미지 저장'으로 사진첩에 (내려받기는 '파일' 앱으로 가서 찾기 어렵다)
 * - 그 밖: 내려받기
 */
export async function saveImage(blob: Blob, filename: string, title: string): Promise<SaveResult> {
  if (inApp()) {
    showImage(blob, title);
    return 'shown';
  }
  const file = new File([blob], filename, { type: 'image/png' });
  if (isIOS() && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
      return 'shared';
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return 'cancelled';
    }
  }
  downloadBlob(blob, filename);
  return 'downloaded';
}

/** 공유 창으로 보내기. 공유 창이 없으면 내려받고, 앱 안 브라우저면 화면에 띄운다 */
export async function shareOrDownload(blob: Blob, filename: string, title: string, text: string): Promise<SaveResult> {
  if (inApp()) {
    showImage(blob, title);
    return 'shown';
  }
  const file = new File([blob], filename, { type: 'image/png' });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title, text });
      return 'shared';
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return 'cancelled';
      throw e;
    }
  }
  downloadBlob(blob, filename);
  return 'downloaded';
}
