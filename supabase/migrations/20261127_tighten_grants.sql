-- 보안 점검(2026-11-25) 뒤 권한 정리 — 지금 뚫리는 곳은 없지만 필요 없는 공개 권한을 거둔다.
-- 결제 표는 결제 확인 함수(service_role)만 쓴다. 공개 키(anon·authenticated)에는 아무 권한도 주지 않는다.
revoke all on public.pay_accounts, public.pay_aliases, public.pay_purchases, public.pay_orders, public.pay_coupons from anon, authenticated, public;

-- 로그인 방식을 쓰던 때의 옛 표(비어 있음, 지금 코드는 쓰지 않는다) — 지우지는 않고 공개 권한만 거둔다.
revoke all on public.purchases from anon, authenticated, public;

-- 새 표에 RLS를 자동으로 켜 주는 내부 함수(이벤트 트리거용) — 주소로 직접 부를 일이 없다.
revoke execute on function public.rls_auto_enable() from anon, authenticated, public;
