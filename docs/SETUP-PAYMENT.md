# 결제 연동 설정 (포트원 + Supabase)

코드는 다 되어 있어요. 아래는 **사람이 화면에서 눌러야 하는 것**만 순서대로 적었어요.

- **시크릿 값**(포트원 API Secret, Supabase Access Token)은 **채팅·코드·문서에 붙이지 않아요.** GitHub의 Secrets에만 넣어요.
- **공개돼도 되는 값**(상점 아이디, 채널 키, 함수 주소)은 GitHub의 Variables에 넣어요.

## 어떻게 돌아가나요

1. 손님이 결제 버튼을 누르면, 결제 확인 함수가 그 계정의 구매 기록으로 **값을 다시 계산**해서 주문을 만들어요. 화면이 보낸 금액은 믿지 않아요.
2. 포트원 결제창이 열려요. 카드와 간편결제는 PG사가 처리하고, 우리는 카드 정보를 받지 않아요.
3. 결제 확인 함수가 **포트원에 직접 물어** 결제됨·금액·원화가 주문과 같을 때만 구매 기록을 남겨요.
   - 그사이 다른 기기에서 먼저 산 것이면 자동으로 전액 취소해요.
4. 휴대폰에서 결제창이 다른 주소로 넘어갔다가 돌아와도 확인을 마저 해요. 창을 닫아 버려도 포트원 웹훅이 기록을 남겨요.

저장하는 것: 구매 코드 · 산 항목 · 사주 구분값(생일로 만든 짧은 암호값) · 금액 · 결제 번호 · 시각
저장하지 않는 것: 이름 · 생년월일 · 출생 시각 · 상대 정보 · 카드 정보

## 1. Supabase (한 번만)

1. [supabase.com](https://supabase.com)에서 프로젝트를 열어요. 없으면 새로 만들고, 지역은 **Northeast Asia (Seoul)** 을 골라요.
2. **SQL Editor**에 `supabase/migrations/20261105_pay.sql` 내용을 붙여 넣고 **Run**을 눌러요.
3. **Project Settings → General**에서 **Reference ID**(프로젝트 주소의 앞부분)를 확인해요.
4. 오른쪽 위 계정 메뉴 → **Access Tokens** → **Generate new token**으로 토큰을 만들어요. 이 값은 **채팅에 붙이지 마세요.**

## 2. 포트원 (PG 승인 뒤)

1. 포트원 관리자 화면 → **결제 연동 → 연동 정보**
   - **상점 아이디(Store ID)**
   - **채널 키(Channel Key)** — 먼저 **테스트** 채널, 승인 뒤 **실연동** 채널
   - **API Secret(V2)** — 시크릿이에요
2. **결제 연동 → 웹훅**: 주소에 `https://<Reference ID>.supabase.co/functions/v1/pay/webhook`을 넣어요.

## 3. GitHub 저장소 (Settings → Secrets and variables → Actions)

| 탭 | 이름 | 값 |
| --- | --- | --- |
| Secrets | `SUPABASE_ACCESS_TOKEN` | 1-4에서 만든 토큰 |
| Secrets | `PORTONE_API_SECRET` | 2-1의 API Secret |
| Variables | `SUPABASE_PROJECT_REF` | 1-3의 Reference ID |
| Variables | `PAY_API` | `https://<Reference ID>.supabase.co/functions/v1/pay` |
| Variables | `PORTONE_STORE_ID` | 2-1의 상점 아이디 |
| Variables | `PORTONE_CHANNEL_KEY` | 2-1의 채널 키 (테스트 → 나중에 실연동으로 바꿈) |

## 4. 결제 확인 함수 올리기

**Actions → Deploy payment function → Run workflow**를 눌러요.

- 이 작업은 결제 규칙 시험을 먼저 돌리고, 통과하면 함수를 올려요.
- 가격이나 결제 규칙(`config/plans.ts`, `lib/entitlements.ts`)을 바꾸면 **이 작업도 다시 실행**해요. 화면과 서버가 같은 계산을 쓰기 때문이에요.

## 5. 시험 결제 → 결제 열기

1. 테스트 채널 키로 시험 결제를 해요. 카드·간편결제, 휴대폰·컴퓨터, 결제창 닫기, 같은 고민 두 번 사기를 확인해요. 테스트 결제는 실제로 돈이 나가지 않거나 그날 자동 취소돼요(PG사마다 달라요).
2. 통신판매업 신고번호를 `BIZ_MAIL_ORDER_NO`에 넣어요.
3. 개인정보처리방침의 맡기는 업체 표에 결제대행사·Supabase를 더하고(더함 — 11월 19일 시행), 결제 시작 **7일 전**에 알려요. PG사가 바뀌면 표를 고쳐요.
4. `PORTONE_CHANNEL_KEY`를 실연동 채널 키로 바꿔요.
5. `config/plans.ts`의 `BETA_FREE`를 `false`로 바꾸고 배포해요. 그러면 결제 버튼, 잠금, 무료 줄이기가 한꺼번에 켜져요.

## 시험하며 알게 된 것

- **KG이니시스 V2는 구매자 이름·휴대폰 번호·이메일이 필수**예요. 결제 직전에 입력칸과 안내를 두고, 우리 서버로는 보내지 않아요.
- **이 채널은 '수동 승인'으로 돌아요.** 결제창은 카드 인증만 하고 `paymentToken`을 돌려줘요. 서버가 그 표로 `POST /payments/{id}/confirm`을 불러야 돈이 나가요(`server/pay/supabase.ts`의 `approve`). 이걸 안 하면 결제가 `READY`로 남고 돈도 안 나가요.
- 이니시스는 손님이 결제창을 닫아도 `FAILURE_TYPE_PG`로 알려 주고, 메시지에 '취소'를 적어요. 그래서 메시지로 '결제를 하지 않았어요'를 구분해요.
- 고장 찾기용 글자(포트원 상태·결제창 응답)는 시안(`VITE_PAYWALL_DEMO=1`)에서만 보여요. 실제 사이트 손님에게는 결제 번호만 보여요.
- 휴대폰 시험: 컴퓨터와 같은 와이파이(핫스팟도 됨)에서 `npx vite --host` → 휴대폰으로 Network 주소. 결제 서버가 사설 IP의 `:5173` 주소를 받아 줘요.

## 심사용 접속 (결제대행사·카드사 심사 때)

결제를 열기 전에 심사 담당자가 구매 버튼을 눌러 볼 수 있게 하는 비밀 주소예요.

- GitHub **Variables**에 `PORTONE_TEST_CHANNEL_KEY`(포트원 **테스트** 채널 키)와 `REVIEW_TOKEN`(아무 긴 글자)을 넣고 사이트를 다시 배포해요.
- 심사 담당자에게 `https://mgsaju.io.kr/?review=<REVIEW_TOKEN>` 을 알려 줘요. 이 주소로 들어오면 구매 버튼·결제창이 보이고 테스트 채널로 결제돼요(돈이 나가지 않아요).
- 일반 주소에서는 결제가 계속 숨겨져 있어요. 끝나면 `REVIEW_TOKEN` 변수를 지우고 다시 배포하면 꺼져요.

## 확인 못 한 것

- Supabase CLI가 `supabase/config.toml`의 `entrypoint = "./functions/pay/index.js"`를 그대로 받는지는 첫 배포 때 확인해요. 안 되면 파일 이름을 `index.ts`로 바꿔요.
- 요청 수 제한(같은 곳에서 너무 많이 부르는 것 막기)은 아직 없어요. 매출이 늘면 Supabase의 제한 기능을 켜요.
