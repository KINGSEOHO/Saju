/** 요약 카드의 'MY 명경 카드' 배너 (교차 검증 코드는 따로 불러온다) */
import { useMemo } from 'react';
import type { SajuAnalysis } from '../engine/index.ts';
import { crossReport } from '../report/cross.ts';
import type { Report } from '../report/generate.ts';

export default function CrossBanner({ a, report, onOpen }: { a: SajuAnalysis; report: Report; onOpen: () => void }) {
  const x = useMemo(() => crossReport(a, report), [a, report]);
  return (
    <button
      type="button"
      onClick={onOpen}
      className="no-print mt-6 block w-full rounded-2xl bg-gradient-to-br from-[#10172e] to-[#1c2546] p-4 text-left text-white transition hover:brightness-110 sm:p-5"
    >
      <div className="text-[11px] font-semibold tracking-[0.3em] text-amber-200/70">MY 명경 CARD</div>
      <div className="mt-1.5 text-lg leading-snug font-extrabold text-amber-300 sm:text-xl">“{x.card.headline}”</div>
      <div className="mt-1 text-sm text-stone-300">{x.card.subline}</div>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-stone-400">
        {x.card.tags.map((t) => (
          <span key={t}>{t}</span>
        ))}
      </div>
      <div className="mt-3 text-xs font-semibold text-amber-200">
        교차 검증 리포트 보기 →{!x.mbti || !x.job ? <span className="ml-2 font-normal text-stone-400">MBTI·직업을 넣으면 더 정확해져요</span> : null}
      </div>
    </button>
  );
}
