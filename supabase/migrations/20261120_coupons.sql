-- 무료 코드 (지인 홍보용) — 코드 하나로 고민 리포트(3,900원짜리) 하나를 연다. 한 번 쓰면 끝.
-- 코드 원문은 저장하지 않고 SHA-256 값만 둔다 (코드 목록은 저장소에 올리지 않는다).
-- 무료로 연 기록은 pay_purchases에 kind 'free', 금액 0으로 남긴다.

alter table public.pay_purchases drop constraint if exists pay_purchases_kind_check;
alter table public.pay_purchases add constraint pay_purchases_kind_check check (kind in ('one', 'all', 'partner', 'free'));
alter table public.pay_purchases drop constraint if exists pay_purchases_amount_check;
alter table public.pay_purchases add constraint pay_purchases_amount_check check (amount > 0 or (kind = 'free' and amount = 0));

create table if not exists public.pay_coupons (
  code_hash text primary key check (code_hash ~ '^[0-9a-f]{64}$'),
  expires_at timestamptz not null,
  used_at timestamptz,
  used_by text references public.pay_accounts(code),
  used_item text,
  created_at timestamptz not null default now()
);
alter table public.pay_coupons enable row level security;
grant select, insert, update on public.pay_coupons to service_role;
