/**
 * 상세 리포트(유료 예정) 틀.
 * 지금은 베타 기간이라 모두 열어 둔다. 결제를 붙일 때 config/plans.ts의 BETA_FREE를 false로 바꾸고,
 * 이용권(lib/entitlements.ts)을 로그인 계정의 결제 기록에서 읽어 오면 같은 자리가 잠금 화면으로 바뀐다.
 * 잠긴 모습은 주소에 ?lock=1 을 붙이거나, 미리보기를 --paywall 로 만들면 볼 수 있다.
 */
import { useEffect, useState, type ReactNode } from 'react';
import { BETA_FREE, PAYWALL_DEMO } from '../config/plans.ts';
import { loadEnt, saveEnt, type Ent, type Offer } from '../lib/entitlements.ts';

/** 내 사주 하나의 이용권 — 다른 칸에서 열어도 함께 바뀐다 */
export function useEnt(key: string): [Ent, (e: Ent) => void] {
  const [ent, setEnt] = useState<Ent>(() => loadEnt(key));
  useEffect(() => {
    setEnt(loadEnt(key));
    const on = (e: Event) => (e as CustomEvent<string>).detail === key && setEnt(loadEnt(key));
    window.addEventListener('mg-ent', on);
    return () => window.removeEventListener('mg-ent', on);
  }, [key]);
  return [ent, (e: Ent) => saveEnt(key, e)];
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
  const free = o.kind === 'free';
  return (
    <div className="panel mt-4" role="alertdialog" aria-label="잠금 해제 확인">
      <p className="text-ui font-bold text-ink">{free ? `‘${what}’ 고민을 무료로 열까요?` : `${o.cost.toLocaleString('ko-KR')}원을 결제할까요?`}</p>
      <p className="mt-1 text-label text-sub">
        {free
          ? '무료로는 고민 하나만 열 수 있어요. 다른 고민이 더 궁금하다면 그쪽에 쓰는 게 좋아요.'
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

export function Premium({
  id,
  title,
  what,
  items,
  price,
  locked: lockedProp,
  offers,
  onTake,
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
  children: ReactNode;
}) {
  const [note, setNote] = useState(false);
  const [asking, setAsking] = useState<Offer | null>(null);
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
            asking ? (
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
                    <button type="button" className={`${i === 0 ? 'btn-primary' : 'btn-secondary'} w-full`} onClick={() => setAsking(o)}>
                      {o.label}
                    </button>
                    {o.note && <p className="mt-1.5 text-center text-cap text-sub">{o.note}</p>}
                  </div>
                ))}
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
