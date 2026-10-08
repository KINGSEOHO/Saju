/**
 * 로그인 시험 화면 (#/account) — 메뉴에는 없다. 카카오 로그인과 구매 기록 표 연결을 실제 사이트에서 확인하는 용도.
 */
import { useState } from 'react';
import { PROVIDER_NAME, useAccount } from '../lib/account.ts';
import { purchaseLabel } from '../lib/entitlements.ts';

export function AccountTest() {
  const u = useAccount();
  const [msg, setMsg] = useState('');
  const run = async (f: () => Promise<void>, ok: string) => {
    setMsg('');
    try {
      await f();
      setMsg(ok);
    } catch (e) {
      setMsg(`안 됐어요: ${e instanceof Error ? e.message : String(e)}`);
    }
  };
  return (
    <div className="wrap py-10">
      <p className="kicker">로그인 시험</p>
      <h1 className="mt-2 text-title1 text-ink">카카오 로그인 · 구매 기록 확인</h1>
      <p className="mt-2 text-label text-sub">메뉴에 없는 시험용 화면이에요. 여기서 남긴 시험 기록은 Supabase 표에서 지우면 돼요.</p>
      <div className="panel mt-8">
        {u.account ? (
          <p className="text-ui text-ink">
            {PROVIDER_NAME[u.account.provider]} 계정으로 로그인됨 · 회원번호 {u.account.id}
          </p>
        ) : (
          <p className="text-ui text-ink">로그인 안 됨</p>
        )}
      </div>
      <div className="mt-4 space-y-2">
        {!u.account ? (
          <button type="button" className="btn h-12 w-full bg-[#FEE500] text-[#191919]" onClick={() => run(() => u.signIn('kakao'), '')}>
            카카오로 로그인
          </button>
        ) : (
          <>
            <button
              type="button"
              className="btn-secondary w-full"
              onClick={() => run(() => u.record({ kind: 'free', item: 'career', target: `test-${Date.now().toString(36)}`, amount: 0, at: Date.now() }), '무료 기록 하나를 남겼어요.')}
            >
              시험 기록 남기기 (무료 고르기)
            </button>
            <button
              type="button"
              className="btn-secondary w-full"
              onClick={() => run(() => u.record({ kind: 'one', item: 'love', target: 'test', amount: 990, at: Date.now() }), '이게 보이면 안 돼요 — 돈이 드는 기록이 사이트에서 써졌어요.')}
            >
              막혀야 하는 기록 시험 (990원)
            </button>
            <button type="button" className="btn w-full text-sub" onClick={() => run(u.signOut, '로그아웃했어요.')}>
              로그아웃
            </button>
          </>
        )}
      </div>
      {msg && <p className="mt-3 text-label font-semibold text-accent">{msg}</p>}
      <h2 className="mt-10 text-title3 text-ink">이 계정의 기록 {u.purchases.length}건</h2>
      <ul className="mt-2 border-t border-line text-label">
        {u.purchases.map((p) => (
          <li key={`${p.at}-${p.target}`} className="flex justify-between gap-3 border-b border-line py-2">
            <span className="text-ink-2">
              {purchaseLabel(p)} · {p.target}
            </span>
            <span className="text-sub">{p.amount ? `${p.amount}원` : '무료'}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
