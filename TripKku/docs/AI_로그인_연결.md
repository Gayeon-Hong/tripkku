# 친구와 공동 AI 편집 연결 — 코딩 없이 설정 시작하기

**중요:** 이 ZIP에는 서버와 프런트엔드 소스가 있지만, 아직 실서비스 계정에 연결하지 않았습니다. GitHub에 업로드하는 것만으로 실제 AI/SNS 로그인/공동 편집이 켜지지 않습니다.

## A. Supabase 프로젝트와 DB

1. [Supabase 대시보드](https://supabase.com/dashboard)에서 계정을 만듭니다.
2. `New project`로 새 프로젝트를 생성합니다. 가까운 리전 사용.
3. `SQL Editor → New query`에서 프로젝트의 `sql/schema.sql` 전체를 붙여넣고 `Run`. **새 프로젝트에만 실행**합니다.
4. `sql/ai_quota.sql` 전체를 두 번째 쿼리로 실행합니다. 이를 실행하지 않으면 AI의 1인 1일 20회 제한 RPC가 없어 API 호출이 거절됩니다.
5. `Project Settings → API Keys`에서 **Project URL**과 **Publishable key**(또는 기존 `anon` 키)를 확인합니다.
6. GitHub 저장소 `config.js` 파일의 `supabaseUrl`과 `supabasePublishableKey` 문자열에만 5번의 두 값을 입력하고 Commit합니다. 이 두 값은 공개 가능한 클라이언트용 키이지만, DB RLS가 활성화되어 있어야 합니다. **Secret / service_role 키는 절대 입력하지 않습니다.**

## B. SNS 로그인 (Google부터 권장)

1. Supabase `Authentication → Sign In / Providers → Google`에서 제공하는 설정을 확인합니다.
2. [Google Cloud Console](https://console.cloud.google.com/)에서 OAuth 동의 화면과 **Web application OAuth Client**를 설정합니다. Supabase 화면에서 제공하는 `https://<project-id>.supabase.co/auth/v1/callback`을 **Authorized redirect URI**로 등록합니다.
3. Google Client ID / Client Secret을 Supabase `Google` 로그인 설정에 입력합니다. GitHub에는 올리지 않습니다.
4. Supabase `Authentication → URL Configuration`에서 Site URL을 `https://gayeon-hong.github.io/tripkku/`, Redirect URLs에도 같은 주소를 등록합니다.
5. 배포된 트립꾸에서 Google 로그인 → 새 여행 만들기 → 친구 초대 링크 만들기 → 다른 Google 계정으로 가입/초대 수락을 테스트합니다.
6. 카카오 로그인은 [Supabase 카카오 로그인 공식 문서](https://supabase.com/docs/guides/auth/social-login/auth-kakao)를 따라 별도로 추가합니다.

## C. Gemini API 키와 Edge Function 배포

1. [Google AI Studio](https://aistudio.google.com/apikey)에서 **Gemini API Key**를 발급합니다. 이 화면의 키를 채팅창이나 GitHub에 붙이지 마세요.
2. Supabase 대시보드의 `Edge Functions → Secrets`에서 `GEMINI_API_KEY` 이름으로 키를 등록합니다.
3. 필요시 Secrets에 `GEMINI_MODEL` = `gemini-3.5-flash-lite`를 지정합니다. 신규 프로젝트에서는 2.5 모델이 제한될 수 있어 3.5 Flash-Lite를 기본 후보로 사용합니다. 무료 사용 가능 모델 및 호출량은 AI Studio에서 확인하세요.
4. `ALLOWED_ORIGINS`는 기본적으로 `https://gayeon-hong.github.io,http://localhost:8765`가 코드에 설정돼 있습니다. 다른 도메인을 사용한다면 Secrets에 콤마로 구분하여 정확한 **Origin(프로토콜+도메인+포트, 경로 제외)**을 입력합니다.
5. Supabase `Edge Functions → Deploy a new function → Via Editor`. 이름을 **정확히 `trip-ai`**로 입력하고 `supabase/functions/trip-ai/index.ts`의 내용을 붙여넣습니다.
6. **JWT 검증을 활성화(verify_jwt = true)** 상태로 유지하고 `Deploy function`을 누릅니다. SNS 로그인한 사용자만 이 기능을 호출할 수 있습니다.
7. 배포된 GitHub Pages 주소에서 로그인 → 공동 여행 선택 → 대화창에서 `2일차 이치란을 14시로 옮겨줘` → **AI가 보여주는 변경 제안 확인** → 승인. 수정된 내용은 공동 DB에 저장되어 친구에게도 동기화됩니다.

### AI의 안전한 변경 순서

`친구가 채팅 → 인증된 Supabase Edge Function → Gemini API → 일정 변경 제안 → 사용자 확인 → Supabase RLS 검증 후 DB 기록 → 다른 여행 멤버 화면 동기화`

- 직접 삭제/예산 변경은 **사용자가 확인창에서 승인해야** 반영됩니다.
- 다른 여행방의 일정은 AI 프런트엔드·DB RLS·서버 멤버십 조회로 접근을 제한합니다.
- 개인 예산·항공권은 다른 사람에게 공개하지 않습니다. AI 호출에서도 전체 멤버 개인 경비를 읽지 않습니다.
- 현재 일일 호출 제한은 1인 20회이며, 실제 출시 전에 악용 방지, 감사 로그, 운영 알림과 비용 상한을 추가하세요.
- AI 무료 구간에서는 일부 요청이 서비스 제공자의 모델 개선에 사용될 수 있으므로 여권번호, 전화번호 등 개인정보를 프롬프트에 넣지 마세요.
- 무료 API라도 사용량/모델/계정 조건에 따라 제한이나 청구가 발생할 수 있습니다.

### 흔한 오류

| 증상 | 원인/해결 |
|---|---|
| `로컬 데모` | config.js 값이 없거나 로그인하지 않은 상태: A·B 버튼은 되지만 서버 공동편집/진짜 AI는 꺼져 있음 |
| `AI 서버 연결 실패` | Edge Function 이름 `trip-ai` 및 배포, 로그인 세션, Secrets를 확인 |
| `AI 호출 한도 설정` | `sql/ai_quota.sql` 실행 및 권한 확인 |
| `401 Unauthorized` | Supabase 로그인 세션이 만료됐거나 JWT 검증 실패. 로그아웃/로그인 재시도 |
| `Origin not allowed` | `ALLOWED_ORIGINS`에 **Pages의 도메인**을 추가하고 저장 |
| `502 Gemini 연결 오류` | 모델명, 무료 사용 가능 여부, API 키, 무료 사용량 확인 |
| 친구에게 초대가 안 됨 | 로그인 OAuth와 `Redirect URLs`, 서로 다른 계정 2개 사용, 7일 유효기간 확인 |

### 운영 전 해야 할 일

실제 AI API 호출 및 Gemini 모델 응답은 **이 문서를 만든 환경에서 실키로 연결/테스트하지 않았습니다**. 출시 전에 성능, 사용자 데이터 접근 권한, 모델 응답 유효성, 경비 계산, AI 프롬프트 안전성, 모바일 OAuth 콜백, 신규 가입/계정 삭제, 장애 처리 등을 반드시 별도 테스트하세요.

참고: https://supabase.com/docs/guides/functions/quickstart-dashboard
https://supabase.com/docs/guides/functions/secrets
https://ai.google.dev/gemini-api/docs/pricing
