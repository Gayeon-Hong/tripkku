# 트립꾸 앱인토스 .ait 빌드 준비 프로젝트

> **상태: 테스트용 SDK 스캐폴드. 출시 심사용 최종 완성본이 아닙니다.**
> 이 환경에서는 npm 레지스트리에 연결할 수 없어 `npm install`, `npx ait init`, `npx ait build`를 실행·검증하지 못했습니다. 실제 `.ait` 바이너리는 포함되어 있지 않습니다.

## 1. .ait의 의미

- `index.html`은 웹앱 화면 파일, `.zip`은 전달용 압축 파일입니다.
- **`.ait`는 토스 SDK가 웹앱을 포장해서 만든 앱인토스 미니앱 번들**입니다. HTML 또는 ZIP 확장자를 .ait로 바꾸는 건 불가능합니다.

## 2. 필요한 준비

1. 앱인토스 콘솔 https://apps-in-toss.toss.im/ 로그인 → 워크스페이스 → 앱(비게임) 등록.
2. 콘솔에서 앱 영문 식별자(appName)를 확인. 이 템플릿에서는 임시로 `tripkku`입니다.
3. Node.js **22 LTS** 설치: https://nodejs.org/ (설치 후 Windows `cmd` 재실행).
4. 본 폴더를 영어 경로(`C:\tripkku-toss`)에 압축 해제하면 편리합니다.

## 3. 처음 한 번 설정하기 (Windows)

### 가장 쉬운 방법

1. `apps-in-toss.config.ts` 파일을 메모장으로 열고 `appName: 'tripkku'`를 **콘솔의 실제 appName**으로 바꿔서 저장합니다.
2. `01_setup_windows.cmd`를 더블클릭합니다. `npm install` → `npx ait init`이 실행됩니다. 인터넷 연결이 필요합니다.
3. `ait init` 화면에서 WebView/Vite 프레임워크를 선택하고 *등록된 appName*, 개발 명령(`vite --host`), 빌드 명령(`vite build`), 포트(`5173`)를 확인합니다. 버전에 따라 질문 항목이 다를 수 있습니다.
4. 초기화가 설정 파일을 다시 작성했다면 `apps-in-toss.config.ts`의 `appName`, `webBundleDir: 'dist'` 값을 재확인합니다. SDK가 Vite 플러그인 설정을 삽입한 경우 그 설정을 보존해야 합니다.

### 명령어로 직접 실행

```bat
cd /d C:\tripkku-toss
npm install
npx ait init
```

## 4. 앱 번들 만들기

1. `02_build_windows.cmd`를 더블클릭하거나 아래 명령 실행:

```bat
npm run build
```

2. 성공하면 SDK가 **`.ait` 파일을 생성**합니다. 터미널에 출력된 정확한 경로를 확인하세요. SDK 버전에 따라 출력 위치가 달라질 수 있습니다.
3. .ait가 안 보이면 `dir /s /b *.ait`로 탐색해 보세요.
4. 일반 `npm run build:web`은 Vite 웹 빌드만 하므로 `.ait`가 생기지 않습니다. **`ait build`를 실행해야 합니다.**

## 5. 앱인토스 콘솔에 업로드

1. https://apps-in-toss.toss.im/ → 해당 앱 → 출시/테스트 메뉴 → 새 버전 등록 또는 앱 번들 업로드.
2. 생성된 `.ait` 파일을 선택.
3. 업로드 성공 후 제공되는 **테스트 QR/스킴**으로 자신의 토스 앱에서 실행.
4. 정책·접근성·로그인·동작 검증 후에만 정식 출시 심사를 요청합니다.

공식: https://developers-apps-in-toss.toss.im/ai-vibe-coding/tutorials/webview
공식: https://developers-apps-in-toss.toss.im/guide/operation/toss

## 6. 이 템플릿에서 실제 작동/미작동

- **작동 목표:** 화면 표시, 오이타·오사카·런던·뉴욕 샘플, A/B 일정, 공동/개인 예산의 로컬 데모 편집.
- **기본 비활성:** Google/Kakao 로그인, 친구 초대·클라우드 공동 편집, 실제 Gemini 호출, 외부 예약 링크.
- 앱인토스에서는 토스 로그인만 허용됩니다. `TossAuth`/서버 토큰 검증 연동이 완료되기 전 공동편집은 활성화하면 안 됩니다.
- TDS WebView를 일부 버튼에 접목한 **빌드/디자인 테스트 샘플**입니다. 검수 전 나머지 주요 UI도 토스 UX 규격으로 변경해야 합니다.
- 생성형 AI 사전 고지 및 결과물 표시, 개인정보 삭제, 운영자 정보, 고객문의, 버그 모니터링 필요.

## 7. Gemini 크레딧 설계

- Google 로그인을 했다고 개인 Gemini API 크레딧/무료 쿼터가 자동으로 사용되는 것은 아닙니다.
- 추천: 운영자 보유 Gemini API 키를 **Supabase Edge Function Secrets**에 보관. 사용자(Toss/웹)별 무료 한도·사용 횟수 추적 및 예산 상한 적용.
- 웹에서 사용자 소유 API를 지원하려면 별도 OAuth/Cloud 프로젝트 및 토큰 인증 설계가 필요합니다. 브라우저·GitHub에 API 키를 입력시키거나 저장하지 마세요.
- 토스판은 Google/Kakao 로그인 버튼을 사용할 수 없습니다. 필요 시 자체 서버의 검증된 Toss 사용자 ID에 비용/쿼터를 매핑하세요.
- AI 이용권 등 유료 디지털 상품을 판매하는 경우 토스 인앱 결제 정책을 준수해야 합니다.

## 8. 개발자가 살펴볼 파일

- `apps-in-toss.config.ts`: 미니앱 SDK 설정; **appName 필수**.
- `package.json`: `npm run build` → `ait build`.
- `vite.config.mjs`: Vite 웹 번들 `dist`.
- `config.js`: 플랫폼 `toss` 설정. 이 파일에 비밀키를 넣지 마세요.
- `toss-tds.jsx`: TDS React 예시 버튼.
- `app.js`: 앱 화면 이벤트·로컬 데모.
- `public/`: 웹 매니페스트·아이콘·서비스워커.

정식 앱인토스 출시에는 별도 Toss 인증 서버/연동과 실제 단말·앱 심사 검증이 필요합니다.
