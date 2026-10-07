import { useState, type FormEvent } from 'react';
import { FEATURE_OPTIONS, PRICE_OPTIONS } from '../config/plans.ts';
import type { SajuAnalysis } from '../engine/index.ts';
import { chartMeta, flushQueue, send, sessionId } from '../lib/api.ts';
import type { SectionId } from '../report/generate.ts';

const ACC_LABELS = ['전혀 안 맞음', '별로', '반반', '대체로 맞음', '소름 돋게 맞음'];

type SendState = 'idle' | 'sending' | 'sent' | 'queued' | 'rejected';

/** 보내지 못했을 때 — 솔직하게 알리고 다시 보낼 수 있게 */
function QueuedNote({ onSent }: { onSent: () => void }) {
  const [busy, setBusy] = useState(false);
  const [left, setLeft] = useState(false);
  const retry = async () => {
    setBusy(true);
    const n = await flushQueue();
    setBusy(false);
    if (n === 0) onSent();
    else setLeft(true);
  };
  return (
    <div className="mt-4 border-l-2 border-ink pl-4">
      <p className="text-label font-semibold text-ink">아직 보내지 못했어요</p>
      <p className="mt-1 text-label text-ink-2">
        인터넷 연결이나 저장소 문제로 전송되지 않았어요. 이 기기에 보관해 두었다가, 아래 버튼을 누르거나 다음에 사이트를 열 때 다시 보낼게요.
      </p>
      <button type="button" className="btn-small mt-3" onClick={retry} disabled={busy}>
        {busy ? '보내는 중…' : '다시 보내기'}
      </button>
      {left && !busy && <p className="mt-2 text-cap text-sub">아직 연결되지 않아요. 잠시 후 다시 눌러 주세요.</p>}
    </div>
  );
}

/** 섹션별 정확도 평가 — 어떤 해석이 맞는지가 유료화 설계의 핵심 데이터 */
export function SectionRating({ a, section, question = '이 풀이, 실제 당신과 얼마나 맞나요?' }: { a: SajuAnalysis; section: SectionId | 'webtoon'; question?: string }) {
  const [rating, setRating] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [state, setState] = useState<SendState>('idle');

  async function submit(r: number, c?: string) {
    setRating(r);
    setState('sending');
    const res = await send('feedback', { sessionId: sessionId(), section, rating: r, comment: c ?? null, meta: chartMeta(a) });
    setState(res);
  }

  return (
    <div className="no-print mt-14 border-t border-line pt-8">
      <p className="text-ui font-semibold text-ink">{question}</p>
      <p className="mt-1 text-cap text-sub">평가는 풀이를 더 정확하게 고치는 데 쓰여요. 생년월일은 보내지 않아요.</p>
      <div className="mt-4 grid grid-cols-5 gap-1.5" role="radiogroup" aria-label={question}>
        {ACC_LABELS.map((l, i) => {
          const on = rating === i + 1;
          return (
            <button
              key={l}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => submit(i + 1, comment || undefined)}
              className={`rounded-xl px-0.5 py-2.5 text-center transition-colors ${on ? 'bg-accent text-on-accent' : 'bg-fill text-ink active:bg-line'}`}
            >
              <span className="block text-ui font-bold tabular-nums">{i + 1}</span>
              <span className={`mt-0.5 block text-[11px] leading-tight ${on ? '' : 'text-sub'}`}>{l}</span>
            </button>
          );
        })}
      </div>
      {rating !== null && (
        <div className="mt-3 flex gap-2">
          <input
            className="field h-12"
            placeholder="틀린 부분이나 맞은 부분을 한 줄로 (선택)"
            value={comment}
            maxLength={300}
            onChange={(e) => setComment(e.target.value)}
          />
          <button type="button" className="btn-small h-12 shrink-0" onClick={() => submit(rating, comment)} disabled={!comment.trim() || state === 'sending'}>
            보내기
          </button>
        </div>
      )}
      {state === 'sent' && <p className="mt-3 text-label font-semibold text-accent">고마워요. 평가가 반영됐어요.</p>}
      {state === 'rejected' && <p className="mt-3 text-label text-ink">이 평가는 저장할 수 없었어요. 잠시 후 다시 시도해 주세요.</p>}
      {state === 'queued' && <QueuedNote onSent={() => setState('sent')} />}
    </div>
  );
}

/** 1~5 숫자로 고르기 (별 대신) */
function Scale({ value, onChange, label, low, high }: { value: number; onChange: (n: number) => void; label: string; low: string; high: string }) {
  return (
    <div>
      <p className="text-label font-semibold text-ink">{label}</p>
      <div className="mt-2 grid grid-cols-5 gap-1.5" role="radiogroup" aria-label={label}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n}점`}
            onClick={() => onChange(n)}
            className={`h-12 rounded-xl text-ui font-bold tabular-nums transition-colors ${value === n ? 'bg-accent text-on-accent' : 'bg-fill text-ink active:bg-line'}`}
          >
            {n}
          </button>
        ))}
      </div>
      <div className="mt-1.5 flex justify-between text-micro text-sub">
        <span>{low}</span>
        <span>{high}</span>
      </div>
    </div>
  );
}

export function ReviewForm({ a }: { a: SajuAnalysis }) {
  const [overall, setOverall] = useState(0);
  const [accuracy, setAccuracy] = useState(0);
  const [detail, setDetail] = useState(0);
  const [text, setText] = useState('');
  const [price, setPrice] = useState<string>('');
  const [features, setFeatures] = useState<string[]>([]);
  const [compare, setCompare] = useState<string>('');
  const [publicOk, setPublicOk] = useState(false);
  const [consent, setConsent] = useState(false);
  const [state, setState] = useState<SendState>('idle');
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!overall || !accuracy) return setErr('전체 만족도와 정확도를 골라 주세요.');
    if (!consent) return setErr('리뷰 저장을 위한 개인정보 수집·이용에 동의해 주세요.');
    setState('sending');
    const r = await send('reviews', {
      sessionId: sessionId(),
      overall,
      accuracy,
      detail: detail || null,
      text: text.trim() || null,
      price: price || null,
      features,
      compare: compare || null,
      public: publicOk,
      meta: chartMeta(a),
    });
    if (r === 'rejected') {
      setState('idle');
      return setErr('리뷰를 저장하지 못했어요. 잠시 후 다시 시도해 주세요.');
    }
    setState(r);
  }

  if (state === 'sent') {
    return (
      <section className="mt-20 border-t border-line pt-10">
        <h2 className="text-title2 text-ink">리뷰 고마워요</h2>
        <p className="read mt-2">보내 주신 의견은 풀이를 고치고 앞으로 만들 기능을 정하는 데 그대로 쓰여요.</p>
      </section>
    );
  }
  if (state === 'queued') {
    return (
      <section className="mt-20 border-t border-line pt-10">
        <h2 className="text-title2 text-ink">리뷰를 받았어요</h2>
        <QueuedNote onSent={() => setState('sent')} />
      </section>
    );
  }

  return (
    <form onSubmit={submit} className="mt-20 space-y-8 border-t border-line pt-10">
      <div>
        <h2 id="review" className="scroll-mt-24 text-title2 text-ink">
          베타 리뷰 남기기
        </h2>
        <p className="mt-1 text-label text-sub">지금은 모든 분석이 무료예요. 솔직한 평가가 앞으로 어떤 기능을 어떻게 만들지 정해요.</p>
      </div>
      <Scale label="전체 만족도" value={overall} onChange={setOverall} low="아쉬워요" high="아주 좋아요" />
      <Scale label="정확도 · 나와 맞는 정도" value={accuracy} onChange={setAccuracy} low="안 맞아요" high="소름 돋아요" />
      <Scale label="상세함 (선택)" value={detail} onChange={setDetail} low="부족해요" high="충분해요" />
      <label className="block">
        <span className="mb-2 block text-label font-semibold text-ink">다른 사주 사이트·앱과 비교하면?</span>
        <select className="field" value={compare} onChange={(e) => setCompare(e.target.value)}>
          <option value="">선택 안 함</option>
          <option value="much_better">훨씬 낫다</option>
          <option value="better">조금 낫다</option>
          <option value="same">비슷하다</option>
          <option value="worse">못하다</option>
          <option value="never">다른 곳을 써 본 적 없다</option>
        </select>
      </label>
      <label className="block">
        <span className="mb-2 block text-label font-semibold text-ink">자유 의견</span>
        <textarea
          className="field h-auto min-h-32 py-3"
          maxLength={2000}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="맞았던 점, 틀렸던 점, 더 알고 싶은 점을 적어 주세요."
        />
      </label>
      <fieldset>
        <legend className="text-label font-semibold text-ink">이 정도 상세 리포트라면 한 번에 얼마까지 낼 수 있나요?</legend>
        <div className="seg mt-2" role="radiogroup">
          {PRICE_OPTIONS.map((p) => (
            <button type="button" key={p.id} role="radio" aria-checked={price === p.id} onClick={() => setPrice(p.id)} className={`seg-item text-ui ${price === p.id ? 'seg-on' : ''}`}>
              {p.label}
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="text-label font-semibold text-ink">돈을 내고라도 보고 싶은 기능 (여러 개 고를 수 있어요)</legend>
        <div className="mt-2 border-t border-line">
          {FEATURE_OPTIONS.map((f) => (
            <label key={f.id} className="flex cursor-pointer items-center gap-3 border-b border-line py-3.5 text-ui text-ink">
              <input
                type="checkbox"
                className="size-5 shrink-0 accent-accent"
                checked={features.includes(f.id)}
                onChange={(e) => setFeatures((cur) => (e.target.checked ? [...cur, f.id] : cur.filter((x) => x !== f.id)))}
              />
              {f.label}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="panel space-y-3 text-cap text-ink-2">
        <label className="flex cursor-pointer items-start gap-3">
          <input type="checkbox" className="mt-0.5 size-5 shrink-0 accent-accent" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
          <span>
            <b className="text-ink">(필수) 개인정보 수집·이용 동의</b> — 수집 항목: 점수·의견·가격 의향, 익명 명식 요약(일주·성별·연령대·신강약·격국·용신). 이름·생년월일·출생 시각은 수집하지
            않아요. 목적: 서비스 개선과 유료 기능 설계. 보관: 서비스 종료 또는 삭제 요청 때까지.
          </span>
        </label>
        <label className="flex cursor-pointer items-start gap-3">
          <input type="checkbox" className="mt-0.5 size-5 shrink-0 accent-accent" checked={publicOk} onChange={(e) => setPublicOk(e.target.checked)} />
          <span>(선택) 자유 의견을 익명 후기로 사이트에 공개해도 괜찮아요.</span>
        </label>
      </div>
      {err && (
        <p role="alert" className="text-label font-semibold text-ink">
          {err}
        </p>
      )}
      <button type="submit" className="btn-primary w-full" disabled={state === 'sending'}>
        {state === 'sending' ? '보내는 중…' : '리뷰 보내기'}
      </button>
    </form>
  );
}
