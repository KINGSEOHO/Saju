/** 명경이가 맞혀 볼게요 — 사주만 보고 평소의 나를 맞혀 보는 퀴즈 (답은 이 기기에만 저장) */
import { useMemo, useState } from 'react';
import type { SajuAnalysis } from '../engine/index.ts';
import { buildHits, type Hit } from '../report/hits.ts';
import { Gloss } from './common.tsx';

type Ans = 'yes' | 'some' | 'no';
/** 맞아요 = 포인트 색, 조금요 = 옅은 포인트 색, 아니에요 = 먹색 */
const ANS: { id: Ans; label: string; on: string; bar: string; tag: string }[] = [
  { id: 'yes', label: '맞아요', on: 'bg-accent text-on-accent', bar: 'bg-accent', tag: 'tag bg-accent text-on-accent' },
  { id: 'some', label: '조금요', on: 'bg-accent-tint text-accent-strong', bar: 'bg-shade-4', tag: 'tag-pos' },
  { id: 'no', label: '아니에요', on: 'bg-ink text-bg', bar: 'bg-faint', tag: 'tag-neg' },
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
    <section className="no-print mt-14" aria-labelledby="hits-title">
      <p className="kicker">명경이가 맞혀 볼게요</p>
      <h2 id="hits-title" className="mt-1 text-title2 text-ink">
        사주만 보고, 평소의 당신을 맞혀 볼게요
      </h2>
      <p className="mt-1 text-label text-sub">답하면 왜 그렇게 봤는지 알려 드려요.</p>

      <div className="mt-5 flex gap-1" aria-hidden>
        {hits.map((x, i) => (
          <span key={x.id} className={`h-1 flex-1 rounded-full ${ans[x.id] ? ANS.find((o) => o.id === ans[x.id])!.bar : i === idx ? 'bg-ink' : 'bg-fill'}`} />
        ))}
      </div>

      {!finished ? (
        <div className="panel mt-4">
          <p className="text-cap text-sub">
            {idx + 1} / {hits.length} · {KIND[h.kind]}
          </p>
          <p className="mt-2 font-serif text-title3 font-bold text-ink">{h.text}</p>
          <div className="mt-5 grid grid-cols-3 gap-2" role="group" aria-label="맞는지 골라 주세요">
            {ANS.map((o) => (
              <button
                key={o.id}
                type="button"
                aria-pressed={ans[h.id] === o.id}
                onClick={() => answer(h, o.id)}
                className={`h-12 rounded-xl text-ui font-semibold transition-colors ${ans[h.id] === o.id ? o.on : 'bg-bg text-ink ring-1 ring-line active:bg-fill'}`}
              >
                {o.label}
              </button>
            ))}
          </div>
          {ans[h.id] && (
            <div className="mt-5 border-t border-line pt-4">
              <p className="text-label font-semibold text-ink">{ans[h.id] === 'no' ? '이번엔 빗나갔네요. 명경이는 이렇게 봤어요' : '명경이는 이렇게 봤어요'}</p>
              <p className="mt-1.5 font-serif text-[16px] leading-[1.75] text-ink-2">
                <Gloss text={h.why} />
              </p>
              <p className="mt-1.5 text-cap text-sub">
                <Gloss text={`근거 · ${h.basis}`} />
              </p>
            </div>
          )}
          <div className="mt-5 flex items-center justify-between">
            <button type="button" disabled={idx === 0} onClick={() => setIdx(idx - 1)} className="h-10 text-label font-semibold text-sub disabled:opacity-0">
              이전
            </button>
            <button
              type="button"
              disabled={!ans[h.id]}
              onClick={() => setIdx(idx + 1)}
              className="btn h-10 rounded-xl bg-accent px-5 text-label text-on-accent disabled:bg-fill disabled:text-faint"
            >
              {idx === hits.length - 1 ? '결과 보기' : '다음'}
            </button>
          </div>
        </div>
      ) : (
        <div className="panel mt-4">
          <p className="text-label font-semibold text-accent">명경이의 적중 결과</p>
          <p className="mt-1 font-serif text-display font-bold text-ink">
            {done.length}개 중 {yes + some}개
          </p>
          <p className="mt-1 text-label text-sub">
            딱 맞음 {yes} · 조금 맞음 {some} · 빗나감 {done.length - yes - some}
          </p>
          <p className="read mt-4">
            {rate >= 0.75
              ? '거울 앞에 선 기분이죠? 태어난 순간의 기운이 지금의 습관과 선택에 이렇게 남아 있어요.'
              : rate >= 0.5
                ? '절반 넘게 맞았어요. 빗나간 부분은 환경과 노력으로 당신이 바꿔 온 몫이에요.'
                : a.pillars.timeKnown
                  ? '명경이가 많이 빗나갔네요. 태어난 시간이 정확한지 한 번 확인해 보세요. 시간이 2시간만 달라도 풀이가 달라져요.'
                  : '명경이가 많이 빗나갔네요. 태어난 시간을 넣으면 훨씬 정확해져요.'}
          </p>
          <button type="button" onClick={share} className="btn-primary mt-6 w-full">
            친구에게 자랑하기
          </button>
          {shared && <p className="mt-2 text-center text-cap text-sub">{shared}</p>}
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setList((v) => !v)} className="btn h-10 rounded-xl bg-bg px-4 text-label text-ink ring-1 ring-line active:bg-fill">
              {list ? '목록 닫기' : '답한 내용 보기'}
            </button>
            <button type="button" onClick={() => setIdx(0)} className="btn h-10 rounded-xl bg-bg px-4 text-label text-ink ring-1 ring-line active:bg-fill">
              처음부터 다시
            </button>
          </div>
          {list && (
            <ol className="mt-5 border-t border-line">
              {hits.map((x) => {
                const o = ANS.find((y) => y.id === ans[x.id]);
                return (
                  <li key={x.id} className="border-b border-line py-4">
                    <span className={o ? o.tag : 'tag-mute'}>{o?.label ?? '답 안 함'}</span>
                    <p className="mt-1.5 text-ui font-semibold text-ink">{x.text}</p>
                    <p className="mt-1 text-label text-ink-2">
                      <Gloss text={x.why} />
                    </p>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      )}
      <p className="mt-3 text-micro text-sub">답은 이 기기에만 저장돼요. 사주는 경향일 뿐, 모든 사람에게 똑같이 나타나지는 않아요.</p>
    </section>
  );
}
