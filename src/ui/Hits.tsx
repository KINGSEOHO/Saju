/** 명경이가 맞혀 볼게요 — 사주만 보고 평소의 나를 맞혀 보는 퀴즈 (답은 이 기기에만 저장) */
import { useMemo, useState } from 'react';
import type { SajuAnalysis } from '../engine/index.ts';
import { buildHits, type Hit } from '../report/hits.ts';
import { Gloss } from './common.tsx';

type Ans = 'yes' | 'some' | 'no';
const ANS: { id: Ans; label: string; on: string }[] = [
  { id: 'yes', label: '맞아요', on: 'bg-emerald-600 text-white border-emerald-600' },
  { id: 'some', label: '조금요', on: 'bg-amber-400 text-amber-950 border-amber-400' },
  { id: 'no', label: '아니에요', on: 'bg-stone-500 text-white border-stone-500' },
];
const KIND: Record<Hit['kind'], string> = { trait: '평소의 나', past: '지난 일', now: '요즘' };

function storeKey(a: SajuAnalysis) {
  const i = a.input;
  return `myeong-hits:${i.calendar}-${i.year}-${i.month}-${i.day}-${i.hour ?? 'x'}-${i.minute ?? 'x'}-${i.gender}`;
}
function load(key: string): Record<string, Ans> {
  try {
    return JSON.parse(localStorage.getItem(key) ?? '{}') as Record<string, Ans>;
  } catch {
    return {};
  }
}

export function HitsCard({ a }: { a: SajuAnalysis }) {
  const hits = useMemo(() => buildHits(a), [a]);
  const key = storeKey(a);
  const [ans, setAns] = useState<Record<string, Ans>>(() => load(key));
  const firstOpen = hits.findIndex((h) => !ans[h.id]);
  const [idx, setIdx] = useState(firstOpen < 0 ? hits.length : firstOpen);
  const [list, setList] = useState(false);
  const [shared, setShared] = useState('');
  if (!hits.length) return null;

  const answer = (h: Hit, v: Ans) => {
    const next = { ...ans, [h.id]: v };
    setAns(next);
    try {
      localStorage.setItem(key, JSON.stringify(next));
    } catch {
      /* 저장이 안 돼도 화면은 그대로 */
    }
  };
  const done = hits.filter((h) => ans[h.id]);
  const yes = done.filter((h) => ans[h.id] === 'yes').length;
  const some = done.filter((h) => ans[h.id] === 'some').length;
  const rate = done.length ? (yes + some / 2) / done.length : 0;
  const finished = idx >= hits.length;
  const h = hits[Math.min(idx, hits.length - 1)];
  const site = `${window.location.origin}${window.location.pathname}`;
  const share = async () => {
    const text = `명경사주가 내 사주만 보고 평소 모습을 ${done.length}개 중 ${yes + some}개 맞혔어! 너도 맞혀 봐`;
    try {
      if (navigator.share) {
        await navigator.share({ title: '명경사주', text, url: site });
        return;
      }
      await navigator.clipboard.writeText(`${text} ${site}`);
      setShared('자랑할 문구를 복사했어요. 메신저에 붙여 넣어 보세요.');
    } catch {
      /* 공유 취소 */
    }
  };

  return (
    <section className="no-print mt-6 rounded-2xl border-2 border-amber-300 bg-gradient-to-b from-amber-50 to-white p-4 sm:p-5 dark:border-amber-800 dark:from-amber-950/40 dark:to-stone-900">
      <div className="flex items-start gap-3">
        <span aria-hidden className="hanja flex size-10 shrink-0 items-center justify-center rounded-full bg-amber-400 text-xl font-bold text-amber-950">
          鏡
        </span>
        <div className="min-w-0">
          <div className="text-xs font-bold text-amber-700 dark:text-amber-300">명경이가 맞혀 볼게요</div>
          <h2 className="text-lg leading-snug font-extrabold sm:text-xl">사주만 보고, 평소의 당신을 맞혀 볼게요</h2>
          <p className="mt-0.5 text-sm text-stone-600 dark:text-stone-400">답하면 명경이가 왜 그렇게 봤는지 알려 드려요.</p>
        </div>
      </div>

      <div className="mt-4 flex gap-1" aria-hidden>
        {hits.map((x, i) => (
          <span
            key={x.id}
            className={`h-1.5 flex-1 rounded-full ${
              ans[x.id] === 'yes' ? 'bg-emerald-500' : ans[x.id] === 'some' ? 'bg-amber-400' : ans[x.id] === 'no' ? 'bg-stone-400' : i === idx ? 'bg-amber-300' : 'bg-stone-200 dark:bg-stone-700'
            }`}
          />
        ))}
      </div>

      {!finished ? (
        <div className="mt-3 rounded-2xl bg-white p-4 shadow-sm dark:bg-stone-900">
          <div className="text-xs font-bold text-stone-500">
            {idx + 1} / {hits.length} · {KIND[h.kind]}
          </div>
          <p className="mt-1.5 text-[17px] leading-snug font-bold sm:text-lg">{h.text}</p>
          <div className="mt-4 grid grid-cols-3 gap-2" role="group" aria-label="맞는지 골라 주세요">
            {ANS.map((o) => (
              <button
                key={o.id}
                type="button"
                aria-pressed={ans[h.id] === o.id}
                onClick={() => answer(h, o.id)}
                className={`rounded-xl border px-2 py-2.5 text-sm font-bold transition ${ans[h.id] === o.id ? o.on : 'border-stone-300 bg-white text-stone-800 hover:border-amber-400 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100'}`}
              >
                {o.label}
              </button>
            ))}
          </div>
          {ans[h.id] && (
            <div className="mt-3 rounded-xl bg-amber-50 p-3 text-sm leading-relaxed dark:bg-amber-950/40">
              <b>{ans[h.id] === 'no' ? '이번엔 빗나갔네요. 명경이는 이렇게 봤어요' : '명경이가 이렇게 봤어요'}</b>
              <p className="mt-1 text-stone-700 dark:text-stone-300">
                <Gloss text={h.why} />
              </p>
              <p className="mt-1 text-xs text-stone-500">
                <Gloss text={`근거 · ${h.basis}`} />
              </p>
            </div>
          )}
          <div className="mt-3 flex items-center justify-between">
            <button type="button" disabled={idx === 0} onClick={() => setIdx(idx - 1)} className="text-sm font-semibold text-stone-500 disabled:opacity-30">
              ← 이전
            </button>
            <button
              type="button"
              disabled={!ans[h.id]}
              onClick={() => setIdx(idx + 1)}
              className="rounded-full bg-amber-400 px-4 py-1.5 text-sm font-bold text-amber-950 disabled:bg-stone-200 disabled:text-stone-400 dark:disabled:bg-stone-700 dark:disabled:text-stone-500"
            >
              {idx === hits.length - 1 ? '결과 보기' : '다음 →'}
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-3 rounded-2xl bg-white p-4 text-center shadow-sm dark:bg-stone-900">
          <div className="text-sm font-bold text-amber-700 dark:text-amber-300">명경이의 적중 결과</div>
          <div className="mt-1 text-2xl font-extrabold sm:text-3xl">
            {done.length}개 중 {yes + some}개 적중
          </div>
          <div className="mt-1 text-sm text-stone-500">
            딱 맞음 {yes} · 조금 맞음 {some} · 빗나감 {done.length - yes - some}
          </div>
          <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-stone-700 dark:text-stone-300">
            {rate >= 0.75
              ? '거울 앞에 선 기분이죠? 태어난 순간의 기운이 지금의 습관과 선택에 이렇게 남아 있어요.'
              : rate >= 0.5
                ? '절반 넘게 맞았어요. 빗나간 부분은 환경과 노력으로 당신이 바꿔 온 몫이에요.'
                : a.pillars.timeKnown
                  ? '명경이가 많이 빗나갔네요. 태어난 시간이 정확한지 한 번 확인해 보세요. 시간이 2시간만 달라도 풀이가 달라져요.'
                  : '명경이가 많이 빗나갔네요. 태어난 시간을 넣으면 훨씬 정확해져요.'}
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <button type="button" onClick={share} className="btn-primary">
              친구에게 자랑하기
            </button>
            <button type="button" onClick={() => setList((v) => !v)} className="btn-ghost">
              {list ? '목록 닫기' : '답한 내용 보기'}
            </button>
            <button type="button" onClick={() => setIdx(0)} className="btn-ghost">
              처음부터 다시
            </button>
          </div>
          {shared && <p className="mt-2 text-sm text-stone-600 dark:text-stone-400">{shared}</p>}
          {list && (
            <ol className="mt-4 space-y-2 text-left">
              {hits.map((x) => (
                <li key={x.id} className="rounded-xl bg-stone-50 p-3 text-sm dark:bg-stone-800/60">
                  <div className="flex items-start gap-2">
                    <span
                      className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${ans[x.id] === 'yes' ? 'bg-emerald-600 text-white' : ans[x.id] === 'some' ? 'bg-amber-400 text-amber-950' : 'bg-stone-400 text-white'}`}
                    >
                      {ANS.find((o) => o.id === ans[x.id])?.label ?? '—'}
                    </span>
                    <div>
                      <p className="font-semibold">{x.text}</p>
                      <p className="mt-0.5 text-stone-600 dark:text-stone-400">
                        <Gloss text={x.why} />
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
      <p className="mt-2 text-[11px] leading-relaxed text-stone-500">답은 이 기기에만 저장돼요. 사주는 경향일 뿐, 모든 사람에게 똑같이 나타나지는 않아요.</p>
    </section>
  );
}
