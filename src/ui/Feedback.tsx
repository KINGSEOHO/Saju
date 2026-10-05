import { useState, type FormEvent } from 'react';
import { FEATURE_OPTIONS, PRICE_OPTIONS } from '../config/plans.ts';
import type { SajuAnalysis } from '../engine/index.ts';
import { chartMeta, send, sessionId } from '../lib/api.ts';
import type { SectionId } from '../report/generate.ts';

const ACC_LABELS = ['전혀 안 맞음', '별로', '반반', '대체로 맞음', '소름 돋게 맞음'];

/** 섹션별 정확도 평가 — 어떤 해석이 맞는지가 유료화 설계의 핵심 데이터 */
export function SectionRating({ a, section }: { a: SajuAnalysis; section: SectionId }) {
  const [rating, setRating] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [state, setState] = useState<'idle' | 'sent' | 'queued'>('idle');

  async function submit(r: number, c?: string) {
    setRating(r);
    const res = await send('feedback', { sessionId: sessionId(), section, rating: r, comment: c ?? null, meta: chartMeta(a) });
    setState(res);
  }

  return (
    <div className="no-print mt-6 rounded-xl border border-dashed border-stone-300 p-4 dark:border-stone-700">
      <div className="text-sm font-semibold">이 섹션, 실제 당신과 얼마나 맞나요?</div>
      <p className="mt-0.5 text-xs text-stone-500">평가는 해석 엔진을 개선하는 데 쓰입니다. 생년월일은 전송되지 않습니다.</p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {ACC_LABELS.map((l, i) => (
          <button
            key={l}
            type="button"
            onClick={() => submit(i + 1, comment || undefined)}
            aria-pressed={rating === i + 1}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
              rating === i + 1
                ? 'border-stone-900 bg-stone-900 text-white dark:border-stone-100 dark:bg-stone-100 dark:text-stone-900'
                : 'border-stone-300 hover:border-stone-500 dark:border-stone-700'
            }`}
          >
            {i + 1} · {l}
          </button>
        ))}
      </div>
      {rating !== null && (
        <div className="mt-3 flex gap-2">
          <input
            className="field text-sm"
            placeholder="틀린 부분이나 맞은 부분을 한 줄로 알려 주세요 (선택)"
            value={comment}
            maxLength={300}
            onChange={(e) => setComment(e.target.value)}
          />
          <button type="button" className="btn-ghost shrink-0" onClick={() => submit(rating, comment)} disabled={!comment.trim()}>
            보내기
          </button>
        </div>
      )}
      {state !== 'idle' && (
        <p className="mt-2 text-xs text-stone-500">{state === 'sent' ? '고맙습니다. 평가가 반영되었습니다.' : '서버에 연결되지 않아 이 브라우저에 임시 저장했습니다. 다음 방문 때 자동 전송됩니다.'}</p>
      )}
    </div>
  );
}

function Stars({ value, onChange, label }: { value: number; onChange: (n: number) => void; label: string }) {
  return (
    <div>
      <div className="mb-1 text-sm font-semibold">{label}</div>
      <div className="flex gap-1" role="radiogroup" aria-label={label}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            onClick={() => onChange(n)}
            className={`size-10 rounded-lg text-xl transition ${n <= value ? 'text-amber-500' : 'text-stone-300 dark:text-stone-600'} hover:scale-110`}
            aria-label={`${n}점`}
          >
            ★
          </button>
        ))}
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
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'queued'>('idle');
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!overall || !accuracy) return setErr('전체 만족도와 정확도 별점을 선택해 주세요.');
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
    setState(r);
  }

  if (state === 'sent' || state === 'queued') {
    return (
      <div className="card text-center">
        <div className="text-2xl">🙏</div>
        <h3 className="mt-2 text-lg font-bold">리뷰 고맙습니다</h3>
        <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">
          {state === 'sent' ? '보내 주신 의견은 해석 엔진 개선과 서비스 방향을 정하는 데 직접 쓰입니다.' : '서버 연결이 없어 이 브라우저에 저장했고, 다음 방문 때 자동으로 전송됩니다.'}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="card space-y-5">
      <div>
        <h2 id="review" className="scroll-mt-24 text-xl font-bold">
          베타 리뷰 남기기
        </h2>
        <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">지금은 모든 분석이 무료입니다. 솔직한 평가가 앞으로 어떤 기능을 어떻게 제공할지 결정합니다.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Stars label="전체 만족도" value={overall} onChange={setOverall} />
        <Stars label="정확도 (나와 맞는 정도)" value={accuracy} onChange={setAccuracy} />
        <Stars label="상세함" value={detail} onChange={setDetail} />
      </div>
      <label className="block">
        <span className="mb-1 block text-sm font-semibold">다른 사주 사이트·앱과 비교하면?</span>
        <select className="field sm:max-w-sm" value={compare} onChange={(e) => setCompare(e.target.value)}>
          <option value="">선택 안 함</option>
          <option value="much_better">훨씬 낫다</option>
          <option value="better">조금 낫다</option>
          <option value="same">비슷하다</option>
          <option value="worse">못하다</option>
          <option value="never">다른 곳을 써 본 적 없다</option>
        </select>
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-semibold">자유 의견</span>
        <textarea
          className="field min-h-24"
          maxLength={2000}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="맞았던 점, 틀렸던 점, 더 알고 싶은 점을 적어 주세요."
        />
      </label>
      <fieldset>
        <legend className="mb-1.5 text-sm font-semibold">이 수준의 상세 리포트라면 1회에 얼마까지 낼 의향이 있나요?</legend>
        <div className="flex flex-wrap gap-1.5">
          {PRICE_OPTIONS.map((p) => (
            <button
              type="button"
              key={p.id}
              onClick={() => setPrice(p.id)}
              aria-pressed={price === p.id}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                price === p.id ? 'border-stone-900 bg-stone-900 text-white dark:border-stone-100 dark:bg-stone-100 dark:text-stone-900' : 'border-stone-300 dark:border-stone-700'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="mb-1.5 text-sm font-semibold">추가로 돈을 내고라도 보고 싶은 기능 (복수 선택)</legend>
        <div className="grid gap-1.5 sm:grid-cols-2">
          {FEATURE_OPTIONS.map((f) => (
            <label key={f.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={features.includes(f.id)}
                onChange={(e) => setFeatures((cur) => (e.target.checked ? [...cur, f.id] : cur.filter((x) => x !== f.id)))}
              />
              {f.label}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="space-y-2 rounded-xl bg-stone-50 p-3 text-xs text-stone-600 dark:bg-stone-800/50 dark:text-stone-400">
        <label className="flex items-start gap-2">
          <input type="checkbox" className="mt-0.5" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
          <span>
            <b className="text-stone-800 dark:text-stone-200">(필수) 개인정보 수집·이용 동의</b> — 수집 항목: 별점·의견·가격 의향, 익명 명식 요약(일주·성별·연령대·신강약·격국·용신). 이름·생년월일·출생 시각은
            수집하지 않습니다. 목적: 서비스 개선 및 유료 기능 설계. 보관: 서비스 종료 또는 삭제 요청 시까지.
          </span>
        </label>
        <label className="flex items-start gap-2">
          <input type="checkbox" className="mt-0.5" checked={publicOk} onChange={(e) => setPublicOk(e.target.checked)} />
          <span>(선택) 자유 의견을 익명 후기로 사이트에 공개해도 됩니다.</span>
        </label>
      </div>
      {err && (
        <p role="alert" className="text-sm text-rose-700 dark:text-rose-300">
          {err}
        </p>
      )}
      <button type="submit" className="btn-primary w-full" disabled={state === 'sending'}>
        {state === 'sending' ? '보내는 중…' : '리뷰 보내기'}
      </button>
    </form>
  );
}
