/**
 * 함초롬바탕은 사이트에 쓰는 글자만 남긴 파일이다 (scripts/subset-font.py).
 * 코드에 새 한자를 쓰고 글꼴을 다시 만들지 않으면 그 글자만 다른 명조로 보이므로, 여기서 잡는다.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('함초롬바탕에 코드의 한자가 모두 들어 있다', () => {
  it('빠진 한자가 없다 (있으면 python3 scripts/subset-font.py <원본 TTF 폴더> public/fonts src)', () => {
    const inFont = new Set(readFileSync('public/fonts/hanja.txt', 'utf8').trim());
    const used = new Set<string>();
    const walk = (d: string) => {
      for (const f of readdirSync(d)) {
        const p = join(d, f);
        if (statSync(p).isDirectory()) walk(p);
        else if (/\.tsx?$/.test(f)) for (const ch of readFileSync(p, 'utf8').match(/[㐀-鿿豈-﫿]/g) ?? []) used.add(ch);
      }
    };
    walk('src');
    expect([...used].filter((c) => !inFont.has(c))).toEqual([]);
  });
});
