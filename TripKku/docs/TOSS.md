> **2026-10-26 최신 SDK 중요 안내**: 현재 공식 WebView 가이드는 `apps-in-toss.config.ts`, `webBundleDir: 'dist'`, `npx ait init`을 사용합니다. 이 문서 아래의 구 버전 `granite.config.ts`/`webBundleDir` 안내보다 **새 `toss-miniapp/README_앱인토스_처음빌드.md`를 우선** 따라 주세요. `toss/`의 `*.example`은 이전 예시로 유지한 것이며 실제 빌드에 쓰지 마세요.

# 앱인토스 출시 가이드 (2026-10-26 공식 정책 기준)

**상태:** 이 소스는 GitHub Pages PWA 실행을 우선으로 하는 시제품입니다. 토스용 SDK 빌드/검수/토스 로그인을 완료한 릴리스가 아닙니다. 현재 앱인토스 콘솔에 올릴 준비가 되었다는 의미가 아닙니다.

## 1. 중요한 정책 차이

- 앱인토스 미니앱 내부 로그인은 **토스 로그인만 허용**합니다. Google/Kakao SNS 로그인 버튼은 토스판에서 숨겨야 합니다. 현 소스 `config.platform='toss'` 옵션은 이를 비활성화합니다.
- 외부 앱 설치 유도·외부 가입·외부 결제 링크는 제한됩니다. 아고다·클룩·Google Maps 연결은 사용 목적에 따른 정책 검토가 필요합니다. 심사 전 토스판에는 외부 예약 링크를 숨깁니다.
- 생성형 AI 결과는 이용자에게 AI 사용 고지/결과물 표시가 필요합니다. 현재 명령형 편집 데모는 LLM 아님.
- 앱인토스 SDK v3.x 기반으로 빌드·검수·테스트하며, 토스 UI/UX 기준(TDS)을 충족해야 합니다.

정책: https://developers-apps-in-toss.toss.im/intro/guide

## 2. 가입과 앱 등록

1. https://apps-in-toss.toss.im/ 콘솔 접속 → 토스 계정으로 파트너 회원 가입.
2. 워크스페이스 생성 → 앱 등록(비게임, 여행/일정 관리에 맞는 분류).
3. 앱 이름(예: `트립꾸`), 설명, 아이콘, 문의처/개인정보 처리방침을 준비하세요.
4. 콘솔 **appName 식별자**를 확정합니다. 한번 설정한 appName은 변경이 어려우므로 신중히 정합니다.

## 3. 웹 프로젝트에 SDK 도입 (별도 브랜치 권장)

- 기존 `index.html`, `style.css`, `app.js`, `presets.js`, `collab.js`를 Vite 기반 앱으로 이전하고 npm으로 의존성을 설치하세요. 지금 정적 버전의 `https://esm.sh` 동적 import는 앱인토스용 빌드 시 `@supabase/supabase-js` npm import로 변경하세요.
- 최소 의존성: `npm install @apps-in-toss/web-framework @supabase/supabase-js` 와 `npm install -D vite`.
- `npx ait init`으로 SDK 설정을 생성한 뒤 `apps-in-toss.config.ts`의 **appName**을 콘솔 값으로 바꾸세요.
- `webBundleDir`는 `dist`로 설정하고, 필요 권한만 선언하세요.
- 토스 전용 소스에서는 **SNS OAuth 로그인 코드를 사용하지 말고**, `TossAuth.login()`을 사용해야 합니다.
- `npm run build`로 `.ait` 빌드하고, 콘솔에서 번들 업로드 → 샌드박스 앱 테스트 → 실제 토스 앱 테스트 → 검수 요청 → 승인 후 출시 순서입니다.

공식: https://developers-apps-in-toss.toss.im/ai-vibe-coding/tutorials/webview
공식: https://developers-apps-in-toss.toss.im/guide/operation/toss

## 4. 토스 로그인과 공동 데이터 연동 (필수 백엔드 작업)

토스 로그인은 `TossAuth.login()` 호출 이후 아래 데이터를 반환합니다.

```typescript
const { authorizationCode, referrer } = await TossAuth.login();
// authorizationCode와 referrer를 운영자 서버로 HTTPS 전송
```

**반드시 신뢰할 수 있는 서버에서** 코드를 토스 서버 API로 교환/검증하고, 반환받은 사용자 식별자를 서버 DB의 회원과 연동해야 합니다. 토스 서버 API 통신에는 인증/mTLS 구성이 필요합니다. **클라이언트에서 임의 user_id를 지정해 DB에 쓰거나, 코드를 무검증 상태로 신뢰하면 안 됩니다.**

권장 흐름: 미니앱 → TossAuth.login → 서버 `/toss/session` → 토스 인증 교환 → 서버 측 사용자 매핑 → 서명된 서버 세션/DB 인가 → 공동 편집 API 또는 Supabase의 검증된 JWT 인증. 일반 웹의 Google/Kakao 로그인과 동일한 여행방을 공유하려면, **같은 사람인지 확인하고 계정을 연결하는 별도 명시적 연결 절차**가 필요합니다. 임의 이메일 문자열만으로 계정을 병합하면 안 됩니다.

`/toss/session` 서버, 계정 연결 UI, 서버 인증서, 서비스 약관, 사용자 데이터 삭제·연결 해제 기능은 **아직 구현되지 않았습니다.** `toss/toss-adapter.example.ts`는 공식 SDK 사용 위치를 보여주는 예시일 뿐이며 서버 없이 실제 로그인할 수 없습니다.

공식: https://developers-apps-in-toss.toss.im/guide/authentication/intro
공식: https://developers-apps-in-toss.toss.im/documentation/sdk/domains-api/tossauth/tossauth.login

## 5. 친구 초대 링크 처리

현재 웹판의 초대는 `https://.../?invite=<token>` 링크입니다. 토스판에서는 공식 `Share.createLink({path:'intoss://<appName>?...'})`를 사용하되, 민감한 초대 토큰은 백엔드에 저장된 1회용 짧은 초대 ID로 교환하거나 충분한 난수 토큰과 만료/사용량 제한을 적용하세요. 앱스킴 query 인코딩·초대 성공 후 URL 제거 등을 실제 샌드박스에서 테스트하세요.

공식: https://developers-apps-in-toss.toss.im/documentation/sdk/domains-api/share/share.createlink

## 6. 클룩·아고다·길찾기

토스는 미니앱의 핵심 기능이 외부 웹 결제/가입에 의존하면 심사에서 반려될 수 있습니다. 일반 웹판에서는 링크를 제공하되, 토스판은 일정·예산·메모·기본 장소 정보만으로 기능을 완결하고, 길찾기와 예약 링크의 허용 범위를 앱인토스에 확인한 뒤 `Device.openURL()`로 연결하세요. 이를 검토하지 않은 상태에서 자동으로 외부 브라우저를 열지 마세요.

## 7. 필수 점검

- [ ] 콘솔 appName / 제작자 및 앱 정보 등록, 고객 문의처 및 개인정보 정책 준비
- [ ] SNS 로그인 제거, 실제 TossAuth.login → 서버 인증 교환 완성
- [ ] 초대·공동 편집이 토스 계정에서 작동하는지 검증
- [ ] 개인 항공권·목표 예산의 접근제어 / 로그아웃 / 계정 탈퇴 테스트
- [ ] 예약/지도 외부 링크의 정책 적합성 확인 및 필요시 제거
- [ ] TDS/UI/접근성/네이티브 뒤로가기 / 오류/무선 네트워크 테스트
- [ ] AI 사용을 도입하면 AI 고지 및 개인정보·비용 한도 점검
- [ ] 개인정보 처리방침·이용약관·삭제 요청·문의처 준비
- [ ] SDK v3 계열 설치, `.ait` 번들, 샌드박스→실기기→콘솔 심사
- [ ] 수익화와 별개로 이용 약관·저작권·외부 링크 가이드 재확인

**비용:** 앱인토스 초기 개발과 등록은 일반적으로 시작 가능하지만 Supabase·AI API·호스팅 이용량에 따라 비용이 발생할 수 있습니다. SDK/검수 정책과 개인/사업자 조건은 콘솔의 최신 안내를 다시 확인하세요.
