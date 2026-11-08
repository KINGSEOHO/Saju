-- 명경사주 결제 기록 — Supabase SQL Editor에 붙여 넣고 Run (한 번만)
-- 저장하는 것: 구매 코드 · 산 항목 · 사주 구분값(양력 생일로 만든 짧은 암호값) · 금액 · 결제 번호 · 시각
-- 저장하지 않는 것: 이름 · 생년월일 · 출생 시각 · 상대 정보 · 카드 정보
-- RLS를 켜고 정책을 두지 않는다 → 사이트의 공개 키로는 읽기·쓰기가 막히고, 결제 확인 함수(서비스 키)만 쓴다.

create table if not exists public.pay_accounts (
  code text primary key check (code ~ '^MG-[2-9A-HJKMNP-Z]{4}-[2-9A-HJKMNP-Z]{4}$'),
  created_at timestamptz not null default now()
);

-- 구매 코드를 합치면 예전 코드 → 새 코드
create table if not exists public.pay_aliases (
  old_code text primary key references public.pay_accounts(code),
  new_code text not null references public.pay_accounts(code)
);

create table if not exists public.pay_purchases (
  id bigint generated always as identity primary key,
  code text not null references public.pay_accounts(code),
  kind text not null check (kind in ('one', 'all', 'partner')),
  item text not null check (item in ('career', 'love', 'money', 'exam', 'year', 'match')),
  target text not null check (char_length(target) <= 40),
  amount integer not null check (amount > 0),
  refunded integer not null default 0 check (refunded >= 0),
  year integer,
  payment_id text,
  at bigint not null,
  created_at timestamptz not null default now()
);
create index if not exists pay_purchases_code on public.pay_purchases (code);
-- 같은 결제가 두 번 기록되지 않게
create unique index if not exists pay_purchases_payment on public.pay_purchases (payment_id) where payment_id is not null;

-- 결제창을 열기 전에 서버가 정한 주문 (금액은 서버가 계산한 값)
create table if not exists public.pay_orders (
  payment_id text primary key,
  code text not null references public.pay_accounts(code),
  purchase jsonb not null,
  season jsonb not null,
  status text not null check (status in ('ready', 'confirming', 'paid', 'cancelled')),
  created_at timestamptz not null default now()
);

alter table public.pay_accounts enable row level security;
alter table public.pay_aliases enable row level security;
alter table public.pay_purchases enable row level security;
alter table public.pay_orders enable row level security;
revoke all on public.pay_accounts, public.pay_aliases, public.pay_purchases, public.pay_orders from anon, authenticated;

-- 이 프로젝트처럼 '새 표 자동 공개'를 꺼 둔 경우 결제 확인 함수(service_role)도 권한을 직접 받아야 한다
grant usage on schema public to service_role;
grant all on public.pay_accounts, public.pay_aliases, public.pay_purchases, public.pay_orders to service_role;
grant usage, select on all sequences in schema public to service_role;
