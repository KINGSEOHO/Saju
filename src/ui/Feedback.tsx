import { useState, type FormEvent, type ReactNode } from 'react';
import { BUSINESS } from '../config/business.ts';
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
      <p className="mt-1 text-cap text-sub">
        평가는 풀이를 더 정확하게 고치는 데 쓰여요. 이름·생년월일은 보내지 않고, 이름 없는 사주 요약만 함께 저장돼요(
        <a href="#/privacy" className="underline">
          개인정보처리방침
        </a>
        ). 한 줄 의견에는 이름·연락처를 적지 말아 주세요.
      </p>
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

/** 후기·의견을 보낼 때 받는 동의 — 개인정보 보호법 제15조 (항목·목적·보관 기간·거부할 권리와 불이익) */
function Consents({ consent, setConsent, adult, setAdult, extra }: { consent: boolean; setConsent: (v: boolean) => void; adult: boolean; setAdult: (v: boolean) => void; extra?: ReactNode }) {
  return (
    <div className="panel space-y-3 text-cap text-ink-2">
      <label className="flex cursor-pointer items-start gap-3">
        <input type="checkbox" className="mt-0.5 size-5 shrink-0 accent-accent" checked={adult} onChange={(e) => setAdult(e.target.checked)} />
        <span>
          <b className="text-ink">(필수) 만 14세 이상이에요.</b>
        </span>
      </label>
      <label className="flex cursor-pointer items-start gap-3">
        <input type="checkbox" className="mt-0.5 size-5 shrink-0 accent-accent" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
        <span>
          <b className="text-ink">(필수) 개인정보 수집·이용에 동의해요.</b>
        </span>
      </label>
      <dl className="ml-8 space-y-1 border-l border-line pl-3 text-micro leading-relaxed text-sub">
        <div>
          <dt className="inline font-semibold">항목</dt>{' '}
          <dd className="inline">점수·적은 글, 무작위 기기 식별값, 이름 없는 사주 요약(일간·일주·성별·연령대·신강약·격국·용신·MBTI·직업 분야). 이름·생년월일·출생 시각은 받지 않아요.</dd>
        </div>
        <div>
          <dt className="inline font-semibold">목적</dt> <dd className="inline">풀이 정확도 개선과 문의 응대, (공개에 동의하면) 후기 게시</dd>
        </div>
        <div>
          <dt className="inline font-semibold">보관</dt> <dd className="inline">받은 날부터 3년 또는 삭제를 요청할 때까지</dd>
        </div>
        <div>
          <dt className="inline font-semibold">거부할 권리</dt> <dd className="inline">동의하지 않을 수 있어요. 그러면 후기·의견만 보낼 수 없고, 다른 기능은 그대로 쓸 수 있어요.</dd>
        </div>
        <div>
          저장은 Google 스프레드시트(미국 서버)에 해요.{' '}
          <a href="#/privacy" className="underline">
            개인정보처리방침
          </a>
        </div>
      </dl>
      {extra}
    </div>
  );
}

const TOPICS = [
  { id: 'wrong', label: '풀이가 안 맞아요' },
  { id: 'bug', label: '오류·불편' },
  { id: 'idea', label: '이런 게 있으면' },
  { id: 'other', label: '기타' },
] as const;

/** 결과 화면 맨 아래 — 후기(점수와 한마디)와 의견·제보(고칠 점) */
export function ReviewForm({ a }: { a: SajuAnalysis }) {
  const [tab, setTab] = useState<'review' | 'opinion'>('review');
  return (
    <section className="no-print mt-20 border-t border-line pt-10" aria-labelledby="review">
      <h2 id="review" className="scroll-mt-24 text-center text-title2 text-ink">
        후기와 의견
      </h2>
      <p className="mt-1 text-center text-label text-sub">써 보신 느낌을 남겨 주세요. 틀린 풀이나 불편한 점은 바로 고쳐요.</p>
      <div className="seg mt-6" role="tablist">
        {(
          [
            ['review', '후기 남기기'],
            ['opinion', '의견·제보'],
          ] as const
        ).map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={`seg-item ${tab === id ? 'seg-on' : ''}`}>
            {label}
          </button>
        ))}
      </div>
      <div className="mt-6">{tab === 'review' ? <ReviewTab a={a} /> : <OpinionTab a={a} />}</div>
    </section>
  );
}

function Done({ title, body, state, onSent }: { title: string; body: string; state: SendState; onSent: () => void }) {
  return (
    <div className="text-center">
      <p className="text-title3 text-ink">{title}</p>
      {state === 'queued' ? <QueuedNote onSent={onSent} /> : <p className="mt-2 text-label text-sub">{body}</p>}
    </div>
  );
}

function ReviewTab({ a }: { a: SajuAnalysis }) {
  const [overall, setOverall] = useState(0);
  const [accuracy, setAccuracy] = useState(0);
  const [text, setText] = useState('');
  const [publicOk, setPublicOk] = useState(false);
  const [consent, setConsent] = useState(false);
  const [adult, setAdult] = useState(false);
  const [state, setState] = useState<SendState>('idle');
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!overall || !accuracy) return setErr('만족도와 정확도를 골라 주세요.');
    if (!adult || !consent) return setErr('필수 항목에 동의해 주세요.');
    setState('sending');
    const r = await send('reviews', {
      sessionId: sessionId(),
      overall,
      accuracy,
      detail: null,
      text: text.trim() || null,
      price: null,
      features: [],
      compare: null,
      public: publicOk && !!text.trim(),
      meta: chartMeta(a),
    });
    if (r === 'rejected') {
      setState('idle');
      return setErr('후기를 저장하지 못했어요. 잠시 후 다시 시도해 주세요.');
    }
    setState(r);
  }

  if (state === 'sent' || state === 'queued') return <Done title="후기 고마워요" body="남겨 주신 후기는 풀이를 더 정확하게 고치는 데 그대로 쓰여요." state={state} onSent={() => setState('sent')} />;

  return (
    <form onSubmit={submit} className="space-y-7">
      <Scale label="전체 만족도" value={overall} onChange={setOverall} low="아쉬워요" high="아주 좋아요" />
      <Scale label="나와 맞는 정도" value={accuracy} onChange={setAccuracy} low="안 맞아요" high="소름 돋아요" />
      <label className="block">
        <span className="mb-2 block text-label font-semibold text-ink">한마디 (선택)</span>
        <textarea
          className="field h-auto min-h-28 py-3"
          maxLength={1000}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="맞았던 점, 인상 깊었던 풀이를 적어 주세요. 이름·연락처는 적지 말아 주세요."
        />
      </label>
      <Consents
        consent={consent}
        setConsent={setConsent}
        adult={adult}
        setAdult={setAdult}
        extra={
          <label className="flex cursor-pointer items-start gap-3 border-t border-line pt-3">
            <input type="checkbox" className="mt-0.5 size-5 shrink-0 accent-accent" checked={publicOk} onChange={(e) => setPublicOk(e.target.checked)} />
            <span>(선택) 한마디를 이름 없이 사이트 후기로 실어도 괜찮아요. 동의하지 않아도 후기는 보낼 수 있어요.</span>
          </label>
        }
      />
      {err && (
        <p role="alert" className="text-label font-semibold text-ink">
          {err}
        </p>
      )}
      <button type="submit" className="btn-primary w-full" disabled={state === 'sending'}>
        {state === 'sending' ? '보내는 중…' : '후기 보내기'}
      </button>
    </form>
  );
}

function OpinionTab({ a }: { a: SajuAnalysis }) {
  const [topic, setTopic] = useState<string>('');
  const [text, setText] = useState('');
  const [consent, setConsent] = useState(false);
  const [adult, setAdult] = useState(false);
  const [state, setState] = useState<SendState>('idle');
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!topic) return setErr('어떤 내용인지 골라 주세요.');
    if (text.trim().length < 5) return setErr('내용을 조금 더 적어 주세요.');
    if (!adult || !consent) return setErr('필수 항목에 동의해 주세요.');
    setState('sending');
    const r = await send('opinions', { sessionId: sessionId(), topic, text: text.trim(), meta: chartMeta(a) });
    if (r === 'rejected') {
      setState('idle');
      return setErr('의견을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.');
    }
    setState(r);
  }

  if (state === 'sent' || state === 'queued') return <Done title="의견 고마워요" body="확인하고 고칠게요. 고친 내용은 사이트 업데이트로 반영돼요." state={state} onSent={() => setState('sent')} />;

  return (
    <form onSubmit={submit} className="space-y-7">
      <fieldset>
        <legend className="text-label font-semibold text-ink">어떤 내용인가요?</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {TOPICS.map((t) => (
            <button
              key={t.id}
              type="button"
              aria-pressed={topic === t.id}
              onClick={() => setTopic(t.id)}
              className={`h-10 rounded-full border px-4 text-label font-semibold transition-colors ${topic === t.id ? 'border-accent bg-accent text-on-accent' : 'border-line text-ink active:bg-fill'}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </fieldset>
      <label className="block">
        <span className="mb-2 block text-label font-semibold text-ink">내용</span>
        <textarea
          className="field h-auto min-h-32 py-3"
          maxLength={2000}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="어느 화면의 어떤 부분인지 적어 주시면 빨리 고칠 수 있어요. 이름·연락처는 적지 말아 주세요."
        />
      </label>
      <p className="text-cap text-sub">답장이 필요한 문의{BUSINESS.email ? `는 ${BUSINESS.email}로` : '(환불 등)는 사이트 아래 연락처로'} 보내 주세요. 이 칸으로는 답장을 드릴 수 없어요.</p>
      <Consents consent={consent} setConsent={setConsent} adult={adult} setAdult={setAdult} />
      {err && (
        <p role="alert" className="text-label font-semibold text-ink">
          {err}
        </p>
      )}
      <button type="submit" className="btn-primary w-full" disabled={state === 'sending'}>
        {state === 'sending' ? '보내는 중…' : '의견 보내기'}
      </button>
    </form>
  );
}
