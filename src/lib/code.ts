/** 구매 코드(MG-XXXX-XXXX) — 화면과 결제 확인 서버가 함께 쓴다 (React 없이 가볍게) */
/** 헷갈리는 글자(0·O·1·I·L)는 뺀다 */
const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
export function newCode(rand: () => number = Math.random): string {
  const pick = (n: number) => Array.from({ length: n }, () => ALPHABET[Math.floor(rand() * ALPHABET.length)]).join('');
  return `MG-${pick(4)}-${pick(4)}`;
}
/** 손님이 넣은 코드를 MG-XXXX-XXXX 꼴로 맞춘다 (소문자·공백·하이픈 빠짐 허용) */
export function normalizeCode(input: string): string | null {
  const s = input
    .toUpperCase()
    .replace(/[^0-9A-Z]/g, '')
    .replace(/^MG/, '');
  if (s.length !== 8 || [...s].some((c) => !ALPHABET.includes(c))) return null;
  return `MG-${s.slice(0, 4)}-${s.slice(4)}`;
}
