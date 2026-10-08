/**
 * 세부 풀이 → 고민 리포트 다리.
 * 풀이를 다 읽은 자리에서 '그래서 언제, 어떻게?'를 묻고, 그 고민의 한 줄 답을 미리 보여 준 뒤 고민 리포트 칸을 열어 준다.
 * 고민 계산 코드는 따로 불러오는 묶음이라 카드는 먼저 그리고, 한 줄 답은 불러온 뒤에 채운다.
 */
import { useEffect, useState } from 'react';
import type { SajuAnalysis } from '../engine/index.ts';
import type { LoveStatus } from '../report/concern.ts';
import { CONCERNS, type ConcernId } from '../report/concernList.ts';
import type { Report } from '../report/generate.ts';
import { upcomingMonths } from './Luck.tsx';

const SUB: Record<ConcernId, string> = {
  career: '언제 움직이면 좋은지, 앞으로 12개월 중 좋은 달과 피할 달을 알려 드려요.',
  love: '인연이 강한 해와 달, 지금 상태에 맞는 할 일을 알려 드려요.',
  money: '돈이 들어오는 달과 새기 쉬운 달, 올해 돈 관리법을 알려 드려요.',
  exam: '나에게 맞는 공부법과 시험이 있는 달의 기운을 알려 드려요.',
  year: '올해 열두 달을 한 줄씩, 연애·일·돈·건강 분야별로 알려 드려요.',
  match: '상대 생년월일만 넣으면 사주·띠·MBTI로 함께 비교해요. 헤어진 사이라면 다시 연락하기 좋은 때도 알려 드려요.',
};

/** 연애는 지금 상태에 따라 묻는 말과 답이 달라진다 */
const LOVE_LEAD: Record<LoveStatus, string> = {
  single: '그래서 인연은 언제 올까요?',
  dating: '그래서 우리 관계는 올해 어떨까요?',
  married: '그래서 올해 우리 부부는 어떨까요?',
};

/** 고민 리포트에서 고른 연애 상태 — 아직 고르지 않았으면 null */
function loveStatus(): LoveStatus | null {
  try {
    const v = sessionStorage.getItem('mg_love_status');
    return v ? (JSON.parse(v) as LoveStatus) : null;
  } catch {
    return null;
  }
}

/**
 * onGo — 결과 화면에서 고민 리포트 칸의 그 고민을 펼친다.
 * peek — 그 고민의 한 줄 답을 미리 보여 줄지. 묻는 말과 한 줄 답이 어긋나는 자리(건강 → 올해 운세 등)에서는 끈다.
 */
export function ConcernBridge({ a, report, id, lead, peek = true, onGo }: { a: SajuAnalysis; report: Report; id: ConcernId; lead: string; peek?: boolean; onGo: (id: ConcernId) => void }) {
  const [love] = useState(loveStatus);
  const [answer, setAnswer] = useState<string | null>(null);
  useEffect(() => {
    // 궁합은 상대가 있어야 답이 나오고, 연애는 상태를 모르면 엉뚱한 답이 될 수 있어 미리 말하지 않는다
    if (!peek || id === 'match' || (id === 'love' && !love)) return;
    let alive = true;
    import('../report/concern.ts')
      .then((m) => {
        const r = m.concernReport(id, a, report, upcomingMonths(a, 12), { love: love ?? 'single' });
        if (alive && r) setAnswer(r.answer);
      })
      .catch(() => {
        /* 한 줄 답 없이 카드만 */
      });
    return () => {
      alive = false;
    };
  }, [id, a, report, love, peek]);
  const c = CONCERNS.find((x) => x.id === id)!;
  return (
    <aside className="no-print panel mt-12" aria-label={`${c.title} 고민 리포트로 가기`}>
      <p className="kicker">고민 리포트 · {c.title}</p>
      <p className="mt-2 font-serif text-title3 font-bold text-ink">{id === 'love' && love ? LOVE_LEAD[love] : lead}</p>
      {answer && (
        <p className="mt-3 flex gap-2.5 text-ui text-ink">
          <span className="tag-pos mt-0.5 h-fit shrink-0">한 줄 답</span>
          <span className="font-semibold">{answer}</span>
        </p>
      )}
      <p className="mt-3 text-label text-sub">{SUB[id]}</p>
      <button type="button" className="btn-primary mt-4 w-full" onClick={() => onGo(id)}>
        {id === 'match' ? '궁합·재회 보기' : `${c.title} 고민 보기`}
      </button>
    </aside>
  );
}
