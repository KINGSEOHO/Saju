/**
 * 상세 리포트(유료 예정) 틀.
 * 지금은 베타 기간이라 모두 열어 둔다. 결제를 붙일 때 config/plans.ts의 BETA_FREE를 false로 바꾸고,
 * unlocked()를 결제 확인으로 바꾸면 같은 자리가 잠금 화면으로 바뀐다.
 * 잠긴 모습은 주소에 ?lock=1 을 붙이면 미리 볼 수 있다. (예: …/Saju/?lock=1#/r?…)
 */
import { useState, type ReactNode } from 'react';
import { BETA_FREE } from '../config/plans.ts';

function previewLocked(): boolean {
  try {
    return new URLSearchParams(window.location.search).has('lock');
  } catch {
    return false;
  }
}

/** 결제 확인 자리 — 지금은 늘 false */
function unlocked(_id: string): boolean {
  return false;
}

export function Premium({
  id,
  title,
  items,
  price,
  forceLocked,
  children,
}: {
  id: string;
  title: string;
  items: string[];
  /** 정식 가격 (예: '1,990원') — 잠금 버튼과 베타 안내에 쓴다 */
  price?: string;
  /** 시안에서 '무료 사용자 화면'을 보여 줄 때 */
  forceLocked?: boolean;
  children: ReactNode;
}) {
  const [note, setNote] = useState(false);
  const locked = forceLocked ?? (previewLocked() || (!BETA_FREE && !unlocked(id)));
  return (
    <section className="mt-14 border-t-2 border-ink pt-5" aria-label={title}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="tag">상세 리포트</span>
        <span className="text-cap text-sub">{locked ? '잠금 해제하면 볼 수 있어요' : `베타 기간이라 무료로 열려 있어요${price ? ` · 정식 ${price} 예정` : ''}`}</span>
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
          <button type="button" className="btn-primary mt-4 w-full" onClick={() => setNote(true)}>
            {price ? `${price}에 잠금 해제하기` : '잠금 해제하기'}
          </button>
          {note && <p className="mt-2 text-label font-semibold text-accent">결제는 준비 중이에요. 조금만 기다려 주세요.</p>}
        </div>
      ) : (
        <div className="mt-6 space-y-12">{children}</div>
      )}
    </section>
  );
}
