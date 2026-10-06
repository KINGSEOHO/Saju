/** 한국어 조사 자동 선택 (받침 유무) */
function hasBatchim(word: string): { has: boolean; rieul: boolean } {
  // 끝의 괄호 설명은 빼고 본다: 회사원(사무직) → 회사원
  const ch = word.trim().replace(/\s*\([^)]*\)$/, '').slice(-1);
  const code = ch.charCodeAt(0);
  if (code < 0xac00 || code > 0xd7a3) {
    // 영문 약어는 글자 이름으로 읽는다: L(엘)·M(엠)·N(엔)·R(알)만 받침이 있다
    if (/[a-z]/i.test(ch)) {
      const up = ch.toUpperCase();
      return { has: 'LMNR'.includes(up), rieul: up === 'L' || up === 'R' };
    }
    // 한자·숫자 등: 숫자만 간단 처리
    const digitBatchim: Record<string, boolean> = { '0': true, '1': true, '3': true, '6': true, '7': true, '8': true };
    return { has: !!digitBatchim[ch], rieul: ch === '1' || ch === '7' || ch === '8' };
  }
  const jong = (code - 0xac00) % 28;
  return { has: jong !== 0, rieul: jong === 8 };
}

/** josa('목', '을/를') → '목을' */
export function josa(word: string, pair: '을/를' | '이/가' | '은/는' | '과/와' | '으로/로' | '이에요/예요' | '이라/라'): string {
  const { has, rieul } = hasBatchim(word);
  const [a, b] = pair.split('/');
  if (pair === '으로/로') return word + (has && !rieul ? a : b);
  return word + (has ? a : b);
}
