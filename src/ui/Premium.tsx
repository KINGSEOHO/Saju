/**
 * 상세 리포트(유료 예정) 틀.
 * 지금은 베타 기간이라 모두 열어 둔다. 결제를 붙일 때 config/plans.ts의 BETA_FREE를 false로 바꾸고,
 * 이용권(lib/entitlements.ts)을 로그인 계정의 결제 기록에서 읽어 오면 같은 자리가 잠금 화면으로 바뀐다.
 * 잠긴 모습과 결제 흐름은 미리보기를 --paywall 로 만들면 볼 수 있다 (개발 서버에서는 주소에 ?lock=1 도 된다).
 * 실제 사이트(베타)에서는 잠금 화면도, 가격 버튼도, 결제 확인 창도 나오지 않는다.
 *
 * 중복 결제 막기
 *  - 이 화면에 결제 기록이 없으면(처음이거나 다른 기기·카카오톡에서 산 사람) 결제 전에 '전에 결제한 적 있나요?'를 묻고 구매 코드로 먼저 불러오게 한다.
 *  - 결제 버튼은 한 번 누르면 끝날 때까지 잠긴다. 결제는 서버가 최신 기록으로 다시 확인한 뒤에만 된다 (lib/account.ts pay).
 *  - 결제가 끝나면 그 자리에서 구매 코드를 보여 준다.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { BETA_FREE, PAYWALL_DEMO } from '../config/plans.ts';
import { useAccount, type PayResult, type RedeemResult } from '../lib/account.ts';
import { entOf, purchaseOf, type Offer, type SeasonKey } from '../lib/entitlements.ts';
import { track } from '../lib/funnel.ts';
import type { ConcernId } from '../report/concernList.ts';

/** 결제 버튼·확인 창을 보여 줘도 되는지 — 시안이거나, 베타가 끝나 실제로 팔 때만 */
export const CAN_PAY = PAYWALL_DEMO || !BETA_FREE;

/** 잠금 화면에서 먼저 보여 주는 결과 하나 — 내 사주로 이미 계산돼 있다는 걸 보여 준다 */
export interface Peek {
  /** 예: 먼저 보여 드려요 · 좋은 달 3개 중 1개 */
  label: string;
  title: string;
  text: string;
  /** 예: 나머지 2개와 피할 달 3개, 그 밖의 내용은 열면 볼 수 있어요. */
  rest: string;
}

/** 이 사주의 이용권 + 구매 기록 — 고민 리포트와 궁합·재회가 함께 쓴다. season: 신년운세(올해 운세)를 보는 해 */
export function useUnlock(saju: string, season: SeasonKey) {
  const acct = useAccount();
  return {
    ...acct,
    ent: entOf(acct.purchases, saju, season),
    /** 결제 — 이미 열렸거나 값이 바뀌었으면 결제하지 않고 까닭을 돌려준다 */
    buy: (o: Offer, id: ConcernId | null, pk?: string) => acct.pay(purchaseOf(o, saju, id, pk, season.year), season),
  };
}

/** 개발 서버에서만 — 주소에 ?lock=1 을 붙이면 잠긴 모습을 본다 (실제 사이트에서는 무시) */
function previewLocked(): boolean {
  if (!import.meta.env.DEV) return false;
  try {
    return new URLSearchParams(window.location.search).has('lock');
  } catch {
    return false;
  }
}

/** 버튼을 누른 뒤 한 번 더 확인 — 무료는 하나뿐이라 실수로 쓰지 않게, 유료는 금액을 다시 보여 준다 */
function Confirm({ o, what, busy, onYes, onNo, onRestore }: { o: Offer; what: string; busy: boolean; onYes: () => void; onNo: () => void; onRestore?: () => void }) {
  const free = o.kind === 'free' || o.kind === 'partnerFree';
  return (
    <div className="panel mt-4" role="alertdialog" aria-label="잠금 해제 확인">
      <p className="text-ui font-bold text-ink">
        {o.kind === 'free' ? `‘${what}’ 고민을 무료로 열까요?` : o.kind === 'partnerFree' ? `${what} 상세 리포트를 무료로 열까요?` : `${o.cost.toLocaleString('ko-KR')}원을 결제할까요?`}
      </p>
      <p className="mt-1 text-label text-sub">
        {o.kind === 'free'
          ? '무료로는 고민 하나만 열 수 있어요. 다른 고민이 더 궁금하다면 그쪽에 쓰는 게 좋아요.'
          : o.kind === 'partnerFree'
            ? '무료로는 상대 한 명만 열 수 있어요. 더 궁금한 사람이 있다면 그 사람에게 쓰는 게 좋아요.'
            : PAYWALL_DEMO
            ? '결제 화면으로 넘어가는 자리예요. 시안이라 실제로 결제되지 않고 바로 열려요.'
            : '결제 화면으로 넘어가요.'}
      </p>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button type="button" className="btn-secondary" onClick={onNo} disabled={busy}>
          {free ? '다시 생각할게요' : '취소'}
        </button>
        {/* 한 번 누르면 끝날 때까지 잠근다 — 두 번 눌러 두 번 결제되지 않게 */}
        <button type="button" className="btn-primary" onClick={onYes} disabled={busy} aria-busy={busy}>
          {busy ? '결제하는 중…' : free ? '무료로 열기' : PAYWALL_DEMO ? '결제하고 열기' : '결제하기'}
        </button>
      </div>
      {onRestore && !busy && (
        <button type="button" className="link mx-auto mt-3 block text-label" onClick={onRestore}>
          다른 휴대폰이나 카카오톡에서도 산 적 있다면 먼저 불러오기
        </button>
      )}
    </div>
  );
}

/** 이 화면에 결제 기록이 없을 때 결제 전에 한 번 묻는다 — 다른 기기에서 산 사람이 모르고 또 결제하지 않게 */
function History({ onNew, onRestore, onNo }: { onNew: () => void; onRestore: () => void; onNo: () => void }) {
  return (
    <div className="panel mt-4" role="alertdialog" aria-label="결제한 적 있는지 확인" data-pay-history>
      <p className="text-ui font-bold text-ink">전에 결제한 적 있나요?</p>
      <p className="mt-1 text-label text-sub">
        이 화면에는 아직 결제 기록이 없어요. 다른 휴대폰에서 결제했거나, 같은 휴대폰이라도 카카오톡 안에서 결제했다면 기록이 따로 있어요. 구매 코드로 먼저 불러오면 이미 산 리포트는 다시 결제하지
        않아도 돼요.
      </p>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button type="button" className="btn-secondary" onClick={onRestore}>
          결제한 적 있어요
        </button>
        <button type="button" className="btn-primary" onClick={onNew}>
          처음 결제해요
        </button>
      </div>
      <button type="button" className="link mx-auto mt-3 block text-label" onClick={onNo}>
        취소
      </button>
    </div>
  );
}

const won = (n: number) => `${n.toLocaleString('ko-KR')}원`;

/** 코드를 넣은 뒤의 안내 — 합친 건수와 겹쳐 낸 돈, 앞으로 쓸 코드 */
function redeemNote(r: RedeemResult): PayNote {
  const text = [r.merged ? `이 휴대폰에서 산 ${r.merged}건도 같은 코드로 옮겼어요.` : '', r.refund ? `두 곳에서 겹쳐 낸 ${won(r.refund)}은 환불해 드려요.` : ''].filter(Boolean).join(' ');
  return { title: r.merged ? '두 곳의 구매 기록을 합쳤어요.' : '구매 기록을 불러왔어요.', ...(text ? { text } : {}), code: r.code };
}

/** 다른 기기에서 산 기록 불러오기 — 이 기기에서 따로 산 것이 있으면 합친다. open: 처음부터 펼쳐 둘 때 (결제 전 확인에서 왔을 때) */
function Redeem({ onRedeem, onDone, open: start = false, onBack }: { onRedeem: (code: string) => Promise<RedeemResult>; onDone: (r: RedeemResult) => void; open?: boolean; onBack?: () => void }) {
  const [open, setOpen] = useState(start);
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  if (!open)
    return (
      <button type="button" className="link mx-auto mt-4 block text-label" onClick={() => setOpen(true)}>
        다른 휴대폰에서 이미 샀나요? 구매 코드 넣기
      </button>
    );
  return (
    <form
      className="panel mt-4"
      data-redeem
      onSubmit={async (e) => {
        e.preventDefault();
        if (busy) return;
        setBusy(true);
        const r = await onRedeem(code);
        setBusy(false);
        if (!r.ok) return setMsg('코드를 찾지 못했어요. MG-로 시작하는 8자리를 다시 확인해 주세요.');
        setOpen(false);
        setCode('');
        setMsg('');
        onDone(r);
      }}
    >
      <label className="block">
        <span className="text-label font-semibold text-ink">구매 코드</span>
        <input className="field mt-2 uppercase tracking-wider" value={code} onChange={(e) => setCode(e.target.value)} placeholder="MG-XXXX-XXXX" autoComplete="off" />
      </label>
      <p className="mt-2 text-cap text-sub">이 휴대폰에서 따로 산 것이 있어도 사라지지 않아요. 넣은 코드 쪽으로 합치고, 겹쳐 낸 돈이 있으면 환불해 드려요.</p>
      <p className="mt-1 text-cap text-sub">코드를 잃어버렸다면 결제한 날짜와 금액을 고객센터로 알려 주세요. 찾아 드려요.</p>
      {msg && <p className="mt-2 text-label font-semibold text-ink">{msg}</p>}
      <button type="submit" className="btn-primary mt-3 w-full" disabled={busy}>
        불러오기
      </button>
      {onBack && (
        <button type="button" className="link mx-auto mt-3 block text-label" onClick={onBack}>
          돌아가기
        </button>
      )}
    </form>
  );
}

/** 결제·불러오기 결과 — 결제가 끝나면 그 자리에서 구매 코드를 보여 준다 (잠금이 풀려도 남는다) */
interface PayNote {
  title: string;
  text?: string;
  code?: string;
}
function PayNotice({ n }: { n: PayNote }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="panel mt-5" role="status" data-pay-notice>
      <p className="text-ui font-bold text-ink">{n.title}</p>
      {n.text && <p className="mt-1 text-label text-ink-2">{n.text}</p>}
      {n.code && (
        <>
          <div className="mt-2 flex items-center justify-between gap-3">
            <span className="font-mono text-title3 font-bold tracking-wider text-ink select-all">{n.code}</span>
            <button
              type="button"
              className="btn-small shrink-0"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(n.code!);
                  setCopied(true);
                } catch {
                  /* 길게 눌러 복사 */
                }
              }}
            >
              {copied ? '복사됨' : '복사'}
            </button>
          </div>
          <p className="mt-2 text-cap text-sub">내 구매 코드예요. 다른 휴대폰이나 카카오톡 안에서 열 때 이 코드를 넣으면 다시 결제하지 않아도 돼요. 캡처해 두세요.</p>
        </>
      )}
    </div>
  );
}

/** 측정에 남길 선택지 이름 — 첫 결제 혜택은 따로 */
const offerName = (o: Offer) => (o.promo ? 'first' : o.kind);

export function Premium({
  id,
  title,
  what,
  items,
  price,
  locked: lockedProp,
  offers,
  fresh = false,
  onTake,
  onRedeem,
  peek,
  children,
}: {
  /** 측정에도 쓰는 이름 — 고민(career…), 궁합(compat), 재회(reunion) */
  id: string;
  title: string;
  /** 확인 문구에 쓰는 이름 (예: 이직·진로) */
  what?: string;
  items: string[];
  /** 정식 가격 안내 (베타 안내 문구에만 쓴다) */
  price?: string;
  /** 잠금 여부를 밖에서 정할 때 (이용권 계산) */
  locked?: boolean;
  /** 잠겼을 때 보여 줄 선택지 — 첫째가 주 버튼 */
  offers?: Offer[];
  /** 이 화면(계정)에 결제 기록이 없는지 — 그러면 결제 전에 '전에 결제한 적 있나요?'를 묻는다 */
  fresh?: boolean;
  /** 결제 — 이미 열렸거나 값이 바뀌었으면 결제하지 않고 까닭을 돌려준다 */
  onTake?: (o: Offer) => Promise<PayResult>;
  /** 다른 기기의 구매 코드로 불러오기 */
  onRedeem?: (code: string) => Promise<RedeemResult>;
  /** 잠겼을 때 먼저 보여 줄 결과 하나 */
  peek?: Peek;
  children: ReactNode;
}) {
  const [note, setNote] = useState(false);
  const [asking, setAsking] = useState<Offer | null>(null);
  /** 고른 뒤의 단계 — 결제한 적 있는지 묻기 → 금액 확인 (또는 코드로 불러오기) */
  const [step, setStep] = useState<'history' | 'confirm' | 'redeem'>('confirm');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<PayNote | null>(null);
  const locked = lockedProp ?? (previewLocked() || !BETA_FREE);
  const pay = CAN_PAY && !!offers?.length && !!onTake;
  const choose = (o: Offer) => {
    track('pay_click', { item: id, offer: offerName(o), amount: o.cost });
    setDone(null);
    setAsking(o);
    setStep(fresh ? 'history' : 'confirm');
  };
  const close = () => {
    setAsking(null);
    setStep('confirm');
  };
  const payNow = async () => {
    if (!asking || busy) return;
    const o = asking;
    setBusy(true);
    // 시안에서는 흉내 서버가 바로 확인한다. 실제로는 결제 확인 서버가 최신 기록으로 다시 본 뒤에만 승인한다
    const r = await onTake!(o).catch(() => null);
    setBusy(false);
    close();
    if (!r) return setDone({ title: '결제를 마치지 못했어요.', text: '잠시 뒤 다시 해 주세요.' });
    if (r.ok) {
      track('paid', { item: id, offer: offerName(o), amount: o.cost }, false);
      return setDone({ title: '결제됐어요.', code: r.code });
    }
    setDone(
      r.reason === 'owned'
        ? { title: '이미 결제한 리포트예요.', text: '그래서 다시 결제하지 않았어요.' }
        : { title: '금액이 바뀌었어요.', text: '다른 화면에서 결제한 것이 반영됐어요. 아래에서 다시 골라 주세요.' },
    );
  };
  const restored = (r: RedeemResult) => {
    close();
    setDone(redeemNote(r));
  };
  // 상세(또는 잠금 화면)의 제목이 화면에 들어오면 한 번 센다 — 베타에서는 '상세까지 봄', 잠겼으면 '가격 화면 봄'
  const head = useRef<HTMLHeadingElement>(null);
  const firstCost = pay ? offers![0].cost : undefined;
  useEffect(() => {
    const el = head.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      (es) => {
        if (!es.some((x) => x.isIntersecting)) return;
        track(locked ? 'lock_view' : 'detail_view', locked && firstCost !== undefined ? { item: id, amount: firstCost } : { item: id });
        io.disconnect();
      },
      { threshold: 0.6 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [id, locked, firstCost]);
  const status = locked ? '잠금 해제하면 볼 수 있어요' : lockedProp === false ? '열려 있어요' : `베타 기간이라 무료로 열려 있어요${price ? ` · 정식 ${price} 예정` : ''}`;
  return (
    <section className="mt-14 border-t-2 border-ink pt-5" aria-label={title} data-premium={id}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="tag">상세 리포트</span>
        <span className="text-cap text-sub">{status}</span>
      </div>
      <h3 ref={head} className="mt-3 text-title2 text-ink">
        {title}
      </h3>
      {locked ? (
        <div className="mt-5">
          <ul className="space-y-2">
            {items.map((t) => (
              <li key={t} className="flex gap-2.5 text-ui text-ink-2">
                <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" />
                {t}
              </li>
            ))}
          </ul>
          {peek && (
            <div className="panel mt-6" data-peek>
              <p className="text-cap font-semibold text-accent">{peek.label}</p>
              <p className="mt-2 font-serif text-[17px] font-bold text-ink">{peek.title}</p>
              <p className="mt-1 text-ui text-ink-2">{peek.text}</p>
              <p className="mt-3 text-cap text-sub">{peek.rest}</p>
            </div>
          )}
          <div aria-hidden className="relative mt-6 max-h-44 overflow-hidden select-none">
            <div className="pointer-events-none blur-[5px]">{children}</div>
            <div className="absolute inset-x-0 bottom-0 h-24 bg-linear-to-t from-bg to-transparent" />
          </div>
          {done && <PayNotice n={done} />}
          {pay ? (
            asking ? (
              step === 'history' ? (
                <History onNew={() => setStep('confirm')} onRestore={() => setStep(onRedeem ? 'redeem' : 'confirm')} onNo={close} />
              ) : step === 'redeem' && onRedeem ? (
                <Redeem open onRedeem={onRedeem} onDone={restored} onBack={() => setStep(fresh ? 'history' : 'confirm')} />
              ) : (
                <Confirm o={asking} what={what ?? title} busy={busy} onNo={close} onYes={payNow} onRestore={!fresh && onRedeem ? () => setStep('redeem') : undefined} />
              )
            ) : (
              <div className="mt-4 space-y-3">
                {offers!.map((o, i) => (
                  <div key={o.label}>
                    {o.promo && (
                      <p className="mb-2 flex items-center justify-center gap-2 text-label">
                        <span className="tag-pos">{o.promo.name}</span>
                        <s className="text-sub tabular-nums">{won(o.promo.was)}</s>
                        <span aria-hidden className="text-sub">
                          →
                        </span>
                        <b className="text-ink tabular-nums">{won(o.cost)}</b>
                      </p>
                    )}
                    <button type="button" className={`${i === 0 ? 'btn-primary' : 'btn-secondary'} w-full`} onClick={() => choose(o)}>
                      {o.label}
                    </button>
                    {o.note && <p className="mt-1.5 text-center text-cap text-sub">{o.note}</p>}
                  </div>
                ))}
                {onRedeem && <Redeem onRedeem={onRedeem} onDone={restored} />}
              </div>
            )
          ) : (
            <>
              <button type="button" className="btn-primary mt-4 w-full" onClick={() => setNote(true)}>
                잠금 해제하기
              </button>
              {note && <p className="mt-2 text-label font-semibold text-accent">결제는 준비 중이에요. 조금만 기다려 주세요.</p>}
            </>
          )}
        </div>
      ) : (
        <>
          {done && <PayNotice n={done} />}
          <div className="mt-6 space-y-12">{children}</div>
        </>
      )}
    </section>
  );
}
