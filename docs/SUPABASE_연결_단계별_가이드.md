# Tripkku Supabase 실제 연결 안내 (GitHub Pages)

> 현재 파일에 실제 Supabase 프로젝트 주소와 Publishable/anon 키가 입력되어 있지 않으면 **로그인·초대·실시간 공동 편집·Gemini AI는 실제로 동작하지 않습니다.** 프런트엔드 소스가 있다는 것과 이미 연결됐다는 것은 다릅니다.

## 먼저 이 순서로

1. https://supabase.com/dashboard 에서 본인 프로젝트를 생성하거나 기존 Tripkku 프로젝트를 엽니다.
2. 새 프로젝트라면 **SQL Editor**에 `sql/schema.sql` 전체를 실행하고, 이어서 `sql/ai_quota.sql`을 실행합니다. 이미 테이블이 생성된 프로젝트에서는 덮어쓰기·재실행 전 현재 스키마를 백업하고 비교합니다. 기존 SQL은 모든 정책이 멱등 방식은 아니므로 반복 실행을 피합니다.
3. **Project Settings → API Keys / Connect**에서 Project URL (`https://xxxx.supabase.co`)과 **Publishable key** 혹은 구형 anon key를 복사합니다.
4. GitHub Desktop으로 클론한 프로젝트의 `config.js`를 열고 아래 두 값만 입력하세요. 이 파일은 사용자 환경 설정이므로 업데이트 ZIP에서 의도적으로 제외했습니다.

```js
export const CONFIG = {
  supabaseUrl: 'https://프로젝트-ID.supabase.co',
  supabasePublishableKey: 'sb_publishable_... 혹은 공개 anon key',
  platform: 'web',
  tossAppName: ''
};
```

**금지:** `service_role`, secret API key, Gemini key, Google OAuth client secret, 토스 서버 키를 여기에 붙이면 안 됩니다. 공개 가능한 anon/publishable 키만 넣고 모든 DB 테이블의 RLS를 확인하세요.

5. **Authentication → Providers → Google**을 사용 설정합니다. Google Cloud Console에서 OAuth 클라이언트를 만들고, Google Authorized redirect URI에 Supabase가 표시하는 `https://프로젝트-ID.supabase.co/auth/v1/callback`를 등록합니다. **Google 클라이언트 시크릿은 Supabase Provider 설정 안에만 입력**합니다.
6. **Authentication → URL Configuration**의 Site URL 및 Redirect URLs에 다음을 정확히 추가합니다.
   - `https://gayeon-hong.github.io/tripkku/`
7. GitHub Desktop에서 `config.js` 변경을 Commit/Push합니다. `config.js` 안에 공개용 키만 들어 있는지 마지막으로 확인하세요.
8. 사이트를 새로 고침하고 **계정 → 연결 상태 확인 → Google 로그인 → 새 여행 만들기** 순서로 테스트합니다.
9. 친구는 다른 계정으로 로그인해서 초대 링크를 수락합니다. 두 브라우저에서 일정 수정과 개인경비 비공개 여부를 확인하세요.

## Gemini 연동(선택)

- Google AI Studio에서 Gemini API Key 발급 → Supabase **Edge Functions Secrets**에 `GEMINI_API_KEY` 등록. 키를 웹 코드에 넣지 마세요.
- `supabase/functions/trip-ai/index.ts`를 이름 **`trip-ai`** Edge Function으로 배포합니다. 로그인 JWT 검증을 끄면 안 됩니다.
- 사용할 수 있는 모델명을 확인해서 Secret `GEMINI_MODEL`에 입력하세요. 운영 환경에서 공급자 무료 한도 및 가격이 달라질 수 있습니다.
- 함수 호출 제한을 위해 `sql/ai_quota.sql`을 실행하고, 실제 서비스 전 권한·비용·삭제/계정 탈퇴 기능을 검수하세요.

## 문제가 생기면

| 상태 | 먼저 확인 |
|---|---|
| 로그인 버튼 비활성화 | `config.js`의 URL과 공개 키가 비어 있거나 잘못됨 |
| 로그인은 되는데 다시 홈페이지로 안 돌아옴 | Supabase Site URL, Redirect URL, Google OAuth callback |
| 친구 초대 버튼 비활성화 | 로그인 후 실제 공동 여행을 생성했는지 |
| 일정 저장은 되지만 친구 화면이 그대로 | Realtime publication과 두 계정의 멤버십, RLS |
| AI만 작동하지 않음 | `trip-ai` 함수, `GEMINI_API_KEY`, 허용 모델, `ai_quota.sql` |

**앱인토스 주의:** 토스판은 Google 로그인을 그대로 사용하면 안 됩니다. 토스 계정 인증과 서버 검증/계정 매핑을 별도로 만들어야 합니다. 여기서는 일반 웹/PWA의 Google·카카오 연동만 다룹니다.

공식 문서: https://supabase.com/docs/guides/auth/social-login/auth-google
https://supabase.com/docs/guides/auth/redirect-urls
https://supabase.com/docs/guides/functions/quickstart-dashboard
