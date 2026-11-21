-- 결제 이벤트: 돈을 내고 결제한 사람에게 무료 코드(3,900원 고민 리포트 하나)를 한 개 준다. 준비한 코드가 떨어지면 저절로 끝난다.
-- 나눠 줄 코드만 원문(code_plain)을 둔다 — 결제한 사람에게 보여 줘야 해서. 이 표는 결제 확인 함수(서비스 키)만 읽는다.
alter table public.pay_coupons add column if not exists code_plain text;
alter table public.pay_coupons add column if not exists gift_issued_at timestamptz;
alter table public.pay_coupons add column if not exists gift_payment_id text unique;
alter table public.pay_coupons add column if not exists gift_to text references public.pay_accounts(code);

-- 결제 하나에 코드 하나 — 같은 결제로 다시 부르면 같은 코드를 돌려준다. 동시에 불러도 겹치지 않게 잠근다.
create or replace function public.pay_take_gift(p_payment text, p_code text) returns text
language plpgsql security definer set search_path = public as $$
declare v text;
begin
  select code_plain into v from pay_coupons where gift_payment_id = p_payment;
  if v is not null then return v; end if;
  update pay_coupons set gift_issued_at = now(), gift_payment_id = p_payment, gift_to = p_code
  where code_hash = (
    select code_hash from pay_coupons
    where code_plain is not null and gift_issued_at is null and used_at is null and expires_at > now()
    order by code_plain limit 1 for update skip locked
  )
  returning code_plain into v;
  return v;
end $$;

create or replace function public.pay_gifts_left() returns integer
language sql stable security definer set search_path = public as $$
  select count(*)::int from pay_coupons where code_plain is not null and gift_issued_at is null and used_at is null and expires_at > now();
$$;

revoke all on function public.pay_take_gift(text, text) from public, anon, authenticated;
revoke all on function public.pay_gifts_left() from public, anon, authenticated;
grant execute on function public.pay_take_gift(text, text) to service_role;
grant execute on function public.pay_gifts_left() to service_role;
