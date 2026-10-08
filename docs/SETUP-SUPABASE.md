# 로그인 · 구매 기록 (Supabase) 설정

사이트 쪽 코드: `src/lib/account.ts` · 주소와 공개 키: `src/config/backend.ts`
저장하는 것: **계정(로그인 종류·회원번호) · 산 항목 · 어느 사주의 것인지(생년월일로 만든 짧은 암호값) · 금액 · 시각**
저장하지 않는 것: 이름 · 생년월일 · 출생 시각 · 상대 정보

## 1. 구매 기록 표 만들기 (SQL Editor에 붙여 넣고 Run)

```sql
-- 구매 기록: 계정 · 항목 · 어느 사주의 것인지(암호값) · 금액 · 시각만
create table public.purchases (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kind text not null check (kind in ('free', 'one', 'all', 'partnerFree', 'partner')),
  item text not null check (item in ('career', 'love', 'money', 'exam', 'year', 'match')),
  target text not null check (char_length(target) <= 40),
  amount integer not null default 0 check (amount >= 0),
  created_at timestamptz not null default now()
);

alter table public.purchases enable row level security;

-- 본인 기록만 볼 수 있다
create policy "본인 기록만 보기" on public.purchases
  for select to authenticated
  using (user_id = (select auth.uid()));

-- 사이트에서는 '무료 고르기'만 직접 기록할 수 있다.
-- 돈이 드는 기록은 결제 확인 뒤 서버(Edge Function)만 쓴다.
create policy "무료 고르기만 기록" on public.purchases
  for insert to authenticated
  with check (user_id = (select auth.uid()) and amount = 0 and kind in ('free', 'partnerFree'));

-- 무료는 사주마다 고민 하나, 상대 한 명
create unique index purchases_one_free on public.purchases (user_id, target) where kind = 'free';
create unique index purchases_one_free_partner on public.purchases (user_id, split_part(target, '>', 1)) where kind = 'partnerFree';

-- 새 표 자동 공개를 꺼 두었으므로 필요한 권한만 직접 연다
grant select, insert on public.purchases to authenticated;
```

## 2. 카카오 개발자 콘솔 (developers.kakao.com → 내 애플리케이션 → 명경사주 앱)

1. **제품 설정 → 카카오 로그인** → 활성화 설정 **ON**
2. 같은 화면 **Redirect URI** 에 추가: `https://xtubxywlsehlsphnnzsr.supabase.co/auth/v1/callback`
3. **제품 설정 → 카카오 로그인 → 동의항목**: 닉네임만 '선택 동의'로, 프로필 사진·이메일은 사용 안 함
4. **앱 설정 → 보안 → Client Secret** → 코드 생성 → 활성화 상태 **사용함**
5. **앱 설정 → 앱 키**에서 **REST API 키** 확인

## 3. Supabase 화면

1. **Authentication → Sign In / Providers → Kakao** 켜기
   - Client ID: 카카오 **REST API 키**
   - Client Secret: 카카오 **Client Secret 코드**
   - **Allow users without an email**(이메일 없는 사용자 허용)이 보이면 켜기
2. **Authentication → URL Configuration**
   - Site URL: `https://kingseoho.github.io/Saju/`
   - Redirect URLs에 추가: `https://kingseoho.github.io/Saju/`
   - 도메인을 바꾸면 이 두 칸만 새 주소로 바꾸면 된다 (카카오 쪽은 그대로)

## 4. 확인

실제 사이트의 `#/account` (메뉴에 없는 시험 화면)에서
1. 카카오로 로그인 → 회원번호가 보이면 성공
2. '시험 기록 남기기' → 목록에 1건 생기면 성공 (Supabase Table Editor → purchases 에도 보인다)
3. '막혀야 하는 기록 시험 (990원)' → "안 됐어요"가 나오면 성공 (돈이 드는 기록은 사이트에서 못 쓴다)

시험 기록은 Table Editor에서 줄을 골라 지우면 된다.
