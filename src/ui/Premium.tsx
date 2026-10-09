/**
 * 상세 리포트(유료 예정) 틀.
 * 지금은 베타 기간이라 모두 열어 둔다. 결제를 붙일 때 config/plans.ts의 BETA_FREE를 false로 바꾸고,
 * 이용권(lib/entitlements.ts)을 로그인 계정의 결제 기록에서 읽어 오면 같은 자리가 잠금 화면으로 바뀐다.
 * 잠긴 모습과 결제 흐름은 미리보기를 --paywall 로 만들면 볼 수 있다 (개발 서버에서는 주소에 ?lock=1 도 된다).
 * 실제 사이트(베타)에서는 잠금 화면도, 가격 버튼도, 결제 확인 창도 나오지 않는다.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { BETA_FREE, PAYWALL_DEMO } from '../config/plans.ts';
import { useAccount, type RedeemResult } from '../lib/account.ts';
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
    buy: (o: Offer, id: ConcernId | null, pk?: string) => acct.record(purchaseOf(o, saju, id, pk, season.year)),
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
function Confirm({ o, what, onYes, onNo }: { o: Offer; what: string; onYes: () => void; onNo: () => void }) {
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
        <button type="button" className="btn-secondary" onClick={onNo}>
          {free ? '다시 생각할게요' : '취소'}
        </button>
        <button type="button" className="btn-primary" onClick={onYes}>
          {free ? '무료로 열기' : PAYWALL_DEMO ? '결제하고 열기' : '결제하기'}
        </button>
      </div>
    </div>
  );
}

/** 다른 기기에서 산 기록 불러오기 — 이 기기에서 따로 산 것이 있으면 합친다 */
function Redeem({ onRedeem }: { onRedeem: (code: string) => Promise<RedeemResult> }) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState('');
  if (!open)
    return (
      <button type="button" className="link mx-auto mt-4 block text-label" onClick={() => setOpen(true)}>
        다른 휴대폰에서 이미 샀나요? 구매 코드 넣기
      </button>
    );
  return (
    <form
      className="panel mt-4"
      onSubmit={async (e) => {
        e.preventDefault();
        const r = await onRedeem(code);
        if (!r.ok) return setMsg('코드를 찾지 못했어요. MG-로 시작하는 8자리를 다시 확인해 주세요.');
        setOpen(false);
        setCode('');
        setMsg('');
        if (r.merged) setRedeemNote(`이 휴대폰에서 산 ${r.merged}건도 합쳤어요. 앞으로는 ${r.code} 코드 하나만 쓰면 돼요.`);
        else setRedeemNote(`불러왔어요. 앞으로도 ${r.code} 코드를 쓰면 돼요.`);
      }}
    >
      <label className="block">
        <span className="text-label font-semibold text-ink">구매 코드</span>
        <input className="field mt-2 uppercase tracking-wider" value={code} onChange={(e) => setCode(e.target.value)} placeholder="MG-XXXX-XXXX" autoComplete="off" />
      </label>
      <p className="mt-2 text-cap text-sub">이 휴대폰에서 따로 산 것이 있어도 사라지지 않아요. 넣은 코드 쪽으로 합쳐요.</p>
      {msg && <p className="mt-2 text-label font-semibold text-ink">{msg}</p>}
      <button type="submit" className="btn-primary mt-3 w-full">
        불러오기
      </button>
    </form>
  );
}

/** 코드를 넣은 뒤 리포트가 열리면 이 칸은 사라지므로, 결과 안내는 페이지 위쪽 구매 코드 칸에서 보여 준다 */
function setRedeemNote(text: string) {
  try {
    sessionStorage.setItem('mg_redeem_note', text);
  } catch {
    /* noop */
  }
  window.dispatchEvent(new Event('mg-redeem-note'));
}

const won = (n: number) => `${n.toLocaleString('ko-KR')}원`;
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
  onTake?: (o: Offer) => void;
  /** 다른 기기의 구매 코드로 불러오기 */
  onRedeem?: (code: string) => Promise<RedeemResult>;
  /** 잠겼을 때 먼저 보여 줄 결과 하나 */
  peek?: Peek;
  children: ReactNode;
}) {
  const [note, setNote] = useState(false);
  const [asking, setAsking] = useState<Offer | null>(null);
  const locked = lockedProp ?? (previewLocked() || !BETA_FREE);
  const pay = CAN_PAY && !!offers?.length && !!onTake;
  const choose = (o: Offer) => {
    track('pay_click', { item: id, offer: offerName(o), amount: o.cost });
    setAsking(o);
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
          {pay ? (
            asking ? (
              <Confirm
                o={asking}
                what={what ?? title}
                onNo={() => setAsking(null)}
                onYes={() => {
                  // 시안에서는 바로 열린다. 실제 결제를 붙이면 결제 확인 서버가 기록을 쓴 뒤에 센다
                  onTake!(asking);
                  track('paid', { item: id, offer: offerName(asking), amount: asking.cost }, false);
                  setAsking(null);
                }}
              />
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
                {onRedeem && <Redeem onRedeem={onRedeem} />}
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
        <div className="mt-6 space-y-12">{children}</div>
      )}
    </section>
  );
}
