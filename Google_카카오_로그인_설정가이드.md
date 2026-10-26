# Tripkku Google / Kakao 로그인 연결 확인 (웹/PWA)

기본 웹사이트: https://gayeon-hong.github.io/tripkku/

## 공통 (Supabase > Authentication > URL Configuration)
- Site URL: https://gayeon-hong.github.io/tripkku/
- Redirect URLs: https://gayeon-hong.github.io/tripkku/ (필요시 https://gayeon-hong.github.io/tripkku/**)
- `config.js`에는 Supabase Project URL + 공개 Publishable key만 넣습니다. Google Client ID, Kakao REST API 키, OAuth Client Secret을 넣지 않습니다.

## Google
1. Google Cloud > Google Auth Platform > Clients에서 Web application OAuth 클라이언트를 만듭니다.
2. Authorized JavaScript origin: https://gayeon-hong.github.io
3. Authorized redirect URI: Supabase > Authentication > Sign In / Providers > Google의 Callback URL. 형태는 https://<project-ref>.supabase.co/auth/v1/callback
4. Google Client ID (`...apps.googleusercontent.com`)와 Client Secret은 Supabase Google Provider 설정에 넣습니다.
5. Google Auth Platform > Audience가 Testing이면 로그인할 구글 계정을 Test users에 등록합니다.
6. 오류 페이지에 `redirect_uri_mismatch`, `access_denied`, `invalid_client`, `Error 403` 중 어떤 코드인지 확인하면 원인 분류가 가능합니다.

## Kakao (Supabase 공식 가이드 기준)
1. https://developers.kakao.com/ > 앱 > 앱 만들기 또는 기존 앱 선택.
2. 앱 설정 > 앱 > 플랫폼 키(Platform Key) > REST API 키를 확인합니다.
3. REST API 키 설정 화면의 카카오 로그인 Redirect URI에 Supabase의 Callback URL을 등록합니다. GitHub Pages URL이 아닌 **Supabase 콜백**입니다.
4. 해당 REST API 키에서 **Kakao Login Client Secret**을 만들고 ON으로 활성화합니다.
5. 제품 설정 > 카카오 로그인 > 일반에서 사용 상태를 ON으로 설정합니다.
6. 동의항목에서 필요한 프로필 정보를 설정합니다. 계정 이메일이 없거나 Biz App 미인증이면 이메일은 선택적으로 하고, Supabase Kakao 제공자에서 `Allow users without an email`을 사용합니다.
7. Supabase > Authentication > Sign In / Providers > Kakao: ON, Client ID = **REST API Key**, Client Secret = 위에서 만든 시크릿. Save.
8. 웹사이트의 카카오 로그인 버튼으로 테스트하고 Supabase Authentication > Users에서 로그인 사용자가 생성됐는지 확인합니다.

**중요:** 위는 `supabase.auth.signInWithOAuth({provider:'kakao'})`로 로그인하는 구조입니다. 브라우저에 카카오 JavaScript 키를 붙여 넣을 필요가 없습니다. 앱인토스판은 토스 로그인을 사용해야 하므로 별도입니다.

참고:
- https://supabase.com/docs/guides/auth/social-sign-in/auth-kakao
- https://supabase.com/docs/guides/auth/social-sign-in/auth-google
- https://developers.kakao.com/docs/en/kakaologin/prerequisite

## 보안
Google/Kakao Client Secret, Supabase `sb_secret_` 및 `service_role` 키는 브라우저/GitHub/채팅에 올리지 마세요.
