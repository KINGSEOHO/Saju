/** 요약 카드의 인생 웹툰 미리보기 (웹툰 코드는 따로 불러온다) */
import { useMemo } from 'react';
import { PanelArt } from '../comic/art.tsx';
import { personaComic } from '../comic/script.ts';
import type { SajuAnalysis } from '../engine/index.ts';

export default function WebtoonTeaser({ a, onOpen }: { a: SajuAnalysis; onOpen: () => void }) {
  const panel = useMemo(() => personaComic(a).panels[0], [a]);
  return (
    <button
      type="button"
      onClick={onOpen}
      className="no-print mt-4 flex w-full items-center gap-4 rounded-2xl border border-amber-200 bg-amber-50/70 p-3 text-left transition hover:border-amber-400 dark:border-amber-900 dark:bg-amber-950/30 dark:hover:border-amber-700"
    >
      <div className="w-32 shrink-0 overflow-hidden rounded-md border border-stone-300 sm:w-40 dark:border-stone-700" aria-hidden>
        <PanelArt p={panel} label="" />
      </div>
      <div className="min-w-0">
        <div className="text-xs font-bold text-amber-700 dark:text-amber-300">NEW · 명경사주에만 있는 기능</div>
        <div className="mt-0.5 text-base font-extrabold sm:text-lg">내 사주로 그린 인생 웹툰</div>
        <div className="mt-0.5 text-sm text-stone-600 dark:text-stone-400">성격 4컷 · 인생 6컷 만화로 보기 →</div>
      </div>
    </button>
  );
}
