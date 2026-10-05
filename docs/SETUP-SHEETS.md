# GitHub Pages + Google 스프레드시트로 배포하기

서버 없이 무료로 운영하는 방법입니다. 사주 계산은 방문자 브라우저에서 하고, 리뷰·평가만 스프레드시트에 쌓입니다.

## 1. 스프레드시트 만들기 (5분)

1. https://sheets.new 로 새 스프레드시트를 만들고 이름을 `명경사주 리뷰` 정도로 바꿉니다.
2. 메뉴 **확장 프로그램 → Apps Script** 를 엽니다.
3. 기본 코드를 모두 지우고, 이 저장소의 `docs/google-apps-script.gs` 내용을 **전부** 붙여 넣은 뒤 저장(💾)합니다.
4. 왼쪽 **⚙ 프로젝트 설정 → 스크립트 속성 → 스크립트 속성 추가**
   - 속성: `ADMIN_TOKEN`
   - 값: 관리자 통계 화면 비밀번호 (아무 긴 문자열)
5. 오른쪽 위 **배포 → 새 배포**
   - 유형 선택(⚙) → **웹 앱**
   - 실행 사용자: **나**
   - 액세스 권한이 있는 사용자: **모든 사용자**
   - **배포** → 권한 승인 창에서 본인 계정으로 허용 (“확인되지 않은 앱” 경고가 나오면 *고급 → (프로젝트 이름)(으)로 이동*. 본인이 만든 스크립트라 괜찮습니다)
6. 나오는 **웹 앱 URL** (`https://script.google.com/macros/s/…/exec`)을 복사합니다.

> 스크립트 코드를 나중에 고치면 **배포 → 배포 관리 → ✏ → 버전: 새 버전 → 배포** 를 해야 반영됩니다 (URL은 그대로).

## 2. GitHub에 URL 넣기

저장소 **Settings → Secrets and variables → Actions → Variables 탭 → New repository variable**

- Name: `SHEET_URL`
- Value: 위에서 복사한 웹 앱 URL

(또는 `src/config/backend.ts` 의 `FALLBACK_SHEET_URL` 에 직접 붙여 넣어도 됩니다. 웹 앱 URL은 사이트 코드에 공개되는 값이라 비밀이 아닙니다. 비밀은 ADMIN_TOKEN 하나뿐입니다.)

## 3. GitHub Pages 켜기

1. 저장소 **Settings → Pages → Build and deployment → Source: GitHub Actions**
2. **Actions 탭 → Deploy to GitHub Pages → Run workflow** (이후에는 코드를 푸시할 때마다 자동 배포)
3. 완료되면 `https://<아이디>.github.io/Saju/` 에서 사이트가 열립니다.

> SHEET_URL 변수를 나중에 추가·변경했다면 **Run workflow** 로 한 번 다시 배포해야 반영됩니다.

## 4. 확인

- 사이트에서 분석 후 리포트 아래 “이 섹션, 실제 당신과 얼마나 맞나요?”를 누르면 스프레드시트에 `섹션평가` 시트가 생기고 한 줄이 추가됩니다.
- 시트 구성: `이벤트`(분석 실행 기록), `섹션평가`, `리뷰` — 스프레드시트에서 바로 볼 수 있습니다.
- 통계 화면: `https://<아이디>.github.io/Saju/#/admin` → ADMIN_TOKEN 입력. 섹션별 정확도, 지불 의향 분포, 유료 전환 판단 문구가 나옵니다.

## 참고

- 저장 항목: 별점·의견·가격 의향·원하는 기능, 익명 명식 요약(일간·성별·연령대·신강약·격국·용신). 이름·생년월일·출생 시각은 전송되지 않습니다.
- `=`로 시작하는 입력은 수식으로 실행되지 않도록 자동으로 텍스트 처리됩니다.
- Apps Script 무료 한도(하루 실행 시간 약 90분)는 테스트·초기 운영에 충분합니다. 이용자가 크게 늘면 Supabase나 자체 서버(`server/index.mjs`, 그대로 남아 있음)로 옮기면 됩니다.
