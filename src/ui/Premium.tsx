/**
 * 상세 리포트(유료 예정) 틀.
 * 지금은 베타 기간이라 모두 열어 둔다. 결제를 붙일 때 config/plans.ts의 BETA_FREE를 false로 바꾸고,
 * 이용권(lib/entitlements.ts)을 로그인 계정의 결제 기록에서 읽어 오면 같은 자리가 잠금 화면으로 바뀐다.
 * 잠긴 모습은 주소에 ?lock=1 을 붙이거나, 미리보기를 --paywall 로 만들면 볼 수 있다.
 */
import { useEffect, useState, type ReactNode } from 'react';
import { BETA_FREE, PAYWALL_DEMO } from '../config/plans.ts';
import { PROVIDER_NAME, useAccount, type Account, type Provider } from '../lib/account.ts';
import { entOf, purchaseOf, type Offer } from '../lib/entitlements.ts';
import type { ConcernId } from '../report/concernList.ts';

/** 이 사주의 이용권 + 로그인 + 구매 — 고민 리포트와 궁합·재회가 함께 쓴다 */
export function useUnlock(saju: string) {
  const acct = useAccount();
  return {
    ...acct,
    ent: entOf(acct.purchases, saju),
    buy: (o: Offer, id: ConcernId | null, pk?: string) => acct.record(purchaseOf(o, saju, id, pk)),
  };
}

function previewLocked(): boolean {
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

/** 연 기록을 계정에 남기려고 로그인부터 — 카카오·네이버 */
function LoginPrompt({ onLogin, onNo }: { onLogin: (p: Provider) => void; onNo: () => void }) {
  return (
    <div className="panel mt-4" role="alertdialog" aria-label="로그인">
      <p className="text-ui font-bold text-ink">로그인하고 열어요</p>
      <p className="mt-1 text-label text-sub">
        연 기록을 계정에 남겨 두면 다른 휴대폰이나 카카오톡 안에서 열어도 그대로 보여요. 계정 정보와 산 항목·금액만 저장하고, 생년월일은 저장하지 않아요.
      </p>
      <div className="mt-4 space-y-2">
        <button type="button" className="btn h-12 w-full bg-[#FEE500] text-[#191919]" onClick={() => onLogin('kakao')}>
          카카오로 계속하기
        </button>
        <button type="button" className="btn h-12 w-full bg-[#03C75A] text-white" onClick={() => onLogin('naver')}>
          네이버로 계속하기
        </button>
        <button type="button" className="btn h-11 w-full text-sub" onClick={onNo}>
          다음에 할게요
        </button>
      </div>
      {PAYWALL_DEMO && <p className="mt-2 text-center text-cap text-faint">시안이라 실제 로그인 없이 바로 넘어가요.</p>}
    </div>
  );
}

export function Premium({
  id,
  title,
  what,
  items,
  price,
  locked: lockedProp,
  offers,
  onTake,
  account,
  onLogin,
  children,
}: {
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
  /** 로그인한 계정 — 없으면 열기 전에 로그인부터 */
  account?: Account | null;
  onLogin?: (p: Provider) => Promise<void>;
  children: ReactNode;
}) {
  const [note, setNote] = useState(false);
  const [asking, setAsking] = useState<Offer | null>(null);
  const [login, setLogin] = useState<Offer | null>(null);
  // 로그인 뒤에는 그 계정의 기록으로 선택지가 바뀔 수 있어, 같은 종류의 선택지로 이어 간다
  const [resume, setResume] = useState<Offer['kind'] | null>(null);
  useEffect(() => {
    if (!resume || !account) return;
    setAsking(offers?.find((o) => o.kind === resume) ?? null);
    setResume(null);
  }, [resume, account, offers]);
  const choose = (o: Offer) => (onLogin && !account ? setLogin(o) : setAsking(o));
  const locked = lockedProp ?? (previewLocked() || !BETA_FREE);
  const status = locked ? '잠금 해제하면 볼 수 있어요' : lockedProp === false ? '열려 있어요' : `베타 기간이라 무료로 열려 있어요${price ? ` · 정식 ${price} 예정` : ''}`;
  return (
    <section className="mt-14 border-t-2 border-ink pt-5" aria-label={title} data-premium={id}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="tag">상세 리포트</span>
        <span className="text-cap text-sub">{status}</span>
      </div>
      <h3 className="mt-3 text-title2 text-ink">{title}</h3>
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
          <div aria-hidden className="relative mt-6 max-h-44 overflow-hidden select-none">
            <div className="pointer-events-none blur-[5px]">{children}</div>
            <div className="absolute inset-x-0 bottom-0 h-24 bg-linear-to-t from-bg to-transparent" />
          </div>
          {offers?.length && onTake ? (
            login && onLogin ? (
              <LoginPrompt
                onNo={() => setLogin(null)}
                onLogin={async (p) => {
                  await onLogin(p);
                  setResume(login.kind);
                  setLogin(null);
                }}
              />
            ) : asking ? (
              <Confirm
                o={asking}
                what={what ?? title}
                onNo={() => setAsking(null)}
                onYes={() => {
                  onTake(asking);
                  setAsking(null);
                }}
              />
            ) : (
              <div className="mt-4 space-y-3">
                {offers.map((o, i) => (
                  <div key={o.label}>
                    <button type="button" className={`${i === 0 ? 'btn-primary' : 'btn-secondary'} w-full`} onClick={() => choose(o)}>
                      {o.label}
                    </button>
                    {o.note && <p className="mt-1.5 text-center text-cap text-sub">{o.note}</p>}
                  </div>
                ))}
                {account && <p className="text-center text-cap text-faint">{PROVIDER_NAME[account.provider]} 계정에 기록돼요</p>}
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
