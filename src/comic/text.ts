/**
 * SVG 글자 줄바꿈 — SVG <text>는 자동 줄바꿈이 없어서 글자 폭을 어림해 직접 나눈다.
 * PNG로 저장할 때는 웹폰트 대신 기기 글꼴로 그려지므로, 한글 폭을 넉넉하게(1em) 잡는다.
 */

const NARROW = new Set(Array.from(' .,!?:;\'"’”‘“·()[]|/'));

export function charWidth(ch: string): number {
  const c = ch.codePointAt(0) ?? 0;
  if (ch === ' ') return 0.3;
  if (NARROW.has(ch)) return 0.36;
  if (ch === '…' || ch === '~' || ch === '—') return 0.9;
  if (c >= 0xac00 && c <= 0xd7a3) return 1.0; // 한글 음절
  if (c >= 0x3130 && c <= 0x318f) return 0.95; // 한글 자모
  if (c >= 0x2e80 && c <= 0x9fff) return 1.05; // 한자
  if (c >= 0x30 && c <= 0x39) return 0.62; // 숫자
  if ((c >= 0x41 && c <= 0x5a) || (c >= 0x61 && c <= 0x7a)) return 0.62;
  return 0.8;
}

export function textWidth(text: string, size: number): number {
  let w = 0;
  for (const ch of text) w += charWidth(ch);
  return w * size;
}

/**
 * 단어(띄어쓰기) 단위로 줄을 나눈다. 한 단어가 한 줄보다 길면 글자 단위로 자른다.
 * '\n'은 강제 줄바꿈. 최대 줄 수를 넘으면 마지막 줄을 '…'로 줄인다.
 */
export function wrap(text: string, size: number, maxWidth: number, maxLines = 3): string[] {
  const lines: string[] = [];
  for (const para of text.split('\n')) {
    let cur = '';
    for (const word of para.split(' ').filter(Boolean)) {
      const next = cur ? `${cur} ${word}` : word;
      if (textWidth(next, size) <= maxWidth) {
        cur = next;
        continue;
      }
      if (cur) lines.push(cur);
      if (textWidth(word, size) <= maxWidth) {
        cur = word;
        continue;
      }
      // 아주 긴 단어: 글자 단위로 자르기
      cur = '';
      for (const ch of word) {
        if (textWidth(cur + ch, size) > maxWidth) {
          lines.push(cur);
          cur = ch;
        } else cur += ch;
      }
    }
    if (cur) lines.push(cur);
  }
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    let last = kept[maxLines - 1];
    while (last.length > 1 && textWidth(`${last}…`, size) > maxWidth) last = last.slice(0, -1);
    kept[maxLines - 1] = `${last}…`;
    return kept;
  }
  return lines;
}

export function widest(lines: string[], size: number): number {
  return lines.reduce((m, l) => Math.max(m, textWidth(l, size)), 0);
}

/** 줄 수는 그대로 두고 줄 길이를 고르게 — 말풍선이 한쪽만 길어지지 않게 */
export function wrapBalanced(text: string, size: number, maxWidth: number, maxLines = 3): string[] {
  const full = wrap(text, size, maxWidth, 99);
  if (full.length <= 1 || full.length > maxLines) return wrap(text, size, maxWidth, maxLines);
  let best = full;
  for (let w = maxWidth - 6; w >= maxWidth * 0.45; w -= 6) {
    const l = wrap(text, size, w, 99);
    if (l.length > full.length) break;
    best = l;
  }
  return best;
}
