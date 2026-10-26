# ✳ 트립꾸 (TripKku) — 여행을 같이 꾸미는 웹앱 시제품

![상태](https://img.shields.io/badge/status-MVP%20prototype-708f7f) ![PWA](https://img.shields.io/badge/PWA-static-efd1b7)

공동 일정·친구 초대·공동/개인 예산·항공권 입력·여행 코스·지도 길찾기를 한 화면에서 관리하는 모바일 우선 여행 플래너.

**현재 상태를 정확히 구분하세요.**

| 기능 | 소스 상태 | 추가 설정 |
|---|---|---|
| 4개 샘플(오이타·오사카·런던·뉴욕), 테마 4종 | 로컬 데모 가능 | 없음 |
| A/B 숙소 계획, 여행 일정 추가/수정 | 로컬 데모 가능 | 없음 |
| 공동 목표·개인 목표, 초과액 빨간색, 개인 항공권 | 로컬 데모 가능 | 없음 |
| SNS 로그인(Google/Kakao) | Supabase 연동 코드 포함 | **Supabase 프로젝트/OAuth 등록 필수** |
| 인증된 사용자끼리 초대 링크·실시간 편집 | 백엔드 SQL/RLS와 프런트 코드 포함 | **Supabase SQL 실행 및 실계정 검증 필요** |
| 개인 예산/항공권 본인만 열람 | 개인별 RLS 정책 포함 | **실계정 2개로 권한 검증 필수** |
| AI 대화로 공동 일정·예산 추가/수정/삭제 | **Supabase Edge Function + Gemini 연동 코드 포함** | 로그인, SQL, API Secret, Edge Function 배포 및 실제 호출 테스트 필요 |
| 토스 미니앱 | 공식 단계별 연동 가이드/어댑터 샘플 | **토스 로그인 서버 연동·SDK 빌드·정책 심사 미완료** |

**GitHub 초보자용 클릭 안내: `docs/GITHUB_처음_올리기.md` / AI 설정 안내: `docs/AI_로그인_연결.md`.**

## 1. Github에 올리기 (계정: Gayeon-Hong)

이 대화에서는 저장소에 직접 업로드하거나 커밋하지 않았습니다. 여러분이 직접 올릴 수 있습니다.

1. [https://github.com/new](https://github.com/new) 에 로그인해서 `tripkku` 저장소를 만듭니다. GitHub Free에서 웹사이트까지 무료 배포하려면 **Public**으로 만듭니다. 개발 중 비공개로 관리할 수도 있으나, GitHub Free의 Private 저장소에는 Pages가 제공되지 않습니다.
2. 이 ZIP에서 `index.html`, `app.js`, `collab.js`, `presets.js`, `style.css`, `config.js`, `sw.js`, `manifest.webmanifest`, `assets/`, `sql/`, `docs/`, `supabase/`, `ai.js` 등을 **폴더째가 아니라 저장소 루트**에 업로드합니다. `.gitignore`와 `README.md`도 포함합니다.
3. 공개 웹사이트로 쓰려면 저장소를 Public으로 전환한 뒤 **Settings → Pages → Build and deployment → Deploy from a branch → main / (root) → Save**.
4. 예상 주소는 `https://gayeon-hong.github.io/tripkku/` 입니다. **직접 배포 후에만 실제 링크가 생깁니다.**
5. 현재 `config.js`는 값이 비어 있습니다. 기본 상태에서는 데모 모드라 SNS 로그인/초대는 비활성화됩니다.

**중요:** Public 저장소에는 이전 개인 오이타 플래너의 실제 친구 링크·예약 내역 등을 업로드하지 마세요. 이 소스에는 공개 가능한 일반 장소 링크와 샘플만 들어 있습니다.

## 2. SNS 로그인 & 공동편집 켜기

1. [Supabase](https://supabase.com/dashboard) 에서 새 프로젝트 생성. 지역은 가까운 지역 선택.
2. SQL Editor에서 `sql/schema.sql` 전체를 **한 번 실행**합니다. 신규 DB 또는 별도 테스트 프로젝트에 실행하는 걸 권장합니다.
3. Supabase → Authentication → Providers 에서 **Google**, 필요하면 **Kakao** 활성화. 공급자별 Client ID/Secret은 Supabase 관리자 화면에만 넣고, GitHub에는 절대 올리지 마세요.
4. 각 공급자의 OAuth **Callback URL**에는 Supabase가 표시한 `https://<project-ref>.supabase.co/auth/v1/callback` 주소를 등록합니다.
5. Supabase → Authentication → URL Configuration 의 **Site URL**과 **Redirect URLs**에 `https://gayeon-hong.github.io/tripkku/`를 등록합니다. 로컬 테스트 주소는 필요할 때만 허용하세요.
6. `config.js`에 **Project URL**과 **publishable/anon key** 두 값만 채우세요. 절대 `service_role`, AI 키, 토스 비밀키 등을 넣지 않습니다.
7. GitHub에 커밋해서 Pages를 갱신하고, **서로 다른 두 로그인 계정으로** 새 여행 생성 → 초대 링크 → 둘째 계정 수락 → 공동 일정 변경 → 개인 예산 비노출을 확인합니다.

실시간 변경은 `supabase_realtime` publication 설정이 SQL에 포함돼 있습니다. 연결 오류나 OAuth redirect 불일치가 발생하면 Supabase 로그에서 원인을 확인하세요. **아직 실제 Supabase 프로젝트에 연결하여 2계정 end-to-end 테스트를 하지는 않았습니다.**

### DB 권한 설계

- `trips`: 초대된 멤버만 조회/수정.
- `trip_members`: 멤버 명단 공개, 본인 닉네임만 수정. 역할 변경 차단.
- `member_finances`: `user_id=auth.uid()` 본인만 조회/수정. **친구 항공권 금액과 목표 금액은 안 보임.**
- `shared_expenses` / `plan_items`: 여행 멤버가 함께 CRUD.
- `trip_invites`: 192비트 토큰 **해시만 DB에 저장**, 7일 만료·최대 15회 사용. 여행 소유자만 발급하고 로그인한 사람만 참가.
- 초대 토큰은 URL에서 읽어 세션에 보관한 뒤 주소 표시줄에서 제거. 외부로 노출되면 새 초대 링크를 재발급하고 기존 링크 폐기 기능을 추후 추가하세요.

## 3. 예산 계산 정의

**객실비:** 첫날 + 둘째 날 모두 **2인 1실 객실 전체 금액**. 사용자가 직접 예약가로 변경합니다.

- A안 = 벳푸 일반 호텔 2박(예시 9만원 + 9만원).
- B안 = 벳푸 일반 호텔 1박 + 벳푸 료칸 1박(예시 8.5만원 + 32만원).
- B안 료칸 하루 총 객실요금 `400,000원 이상`이면 별도 빨간 경고.
- 공동 지출 예측 = 2박 객실비 + 공동 항목(식비/교통 등) **합계**.
- 개인 지출 예측 = 공동 지출 ÷ **가입 멤버 수** + 내가 입력한 항공권 + 내가 입력한 개인경비.
- 공동 목표와 개인 목표는 서로 따로 저장. 예측금액 > 목표금액이면 `초과 +금액`이 빨간색으로 표시됩니다.
- 친구가 아직 참여하지 않았을 때 실제 등록 멤버가 1명이므로 **전체 공동비를 1명 몫으로 계산**합니다. 모두 참가한 뒤 예산을 확정하세요.
- 현재는 예상 지출 관리 기능이며, 실제 결제·정산·차등 분담은 구현하지 않았습니다.

## 4. 기존 오이타 플래너와 관계

원래 만든 사진/여행 링크가 풍부한 개인용 오이타 HTML은 별도 파일로 유지합니다. 이 프로젝트는 개인 링크를 제외한 **재사용 가능한 공개 배포용 앱**으로 개발했습니다. 기존 개인 HTML의 로컬 저장 데이터는 이 앱의 DB로 자동 이전되지 않습니다.

## 5. AI / 앱인토스

- **로컬 데모**의 대화 도우미는 무료 규칙 기반 편집입니다. **로그인한 공동 여행**에서는 `supabase/functions/trip-ai/index.ts`가 Gemini API를 호출하도록 연결 코드를 추가했습니다. `GEMINI_API_KEY`, `sql/ai_quota.sql`, Edge Function 배포 전에는 실제 호출이 불가능합니다.
- AI는 **변경 미리보기 → 사용자 승인 → RLS로 DB 기록**합니다. 키를 브라우저로 전달하지 마세요. 새 서버 코드가 준비되었지만 실제 계정으로 외부 연동 시험은 미완료입니다. 설정 방법은 `docs/AI_로그인_연결.md`를 참고하세요.
- 앱인토스는 일반 웹보다 로그인·외부 링크·UI 정책이 엄격합니다. **`docs/TOSS.md`를 반드시 읽고 별도 출시 경로로 준비하세요.**

## 6. 개발/시운전

- GitHub Pages는 정적 웹사이트여서 Node.js 빌드 없이 업로드 가능합니다.
- 로컬에서 테스트하려면 Python 3 설치 후 프로젝트 폴더에서 `python -m http.server 8765` 실행, `http://localhost:8765` 접속.
- **`index.html` 파일을 직접 더블클릭하면** 브라우저의 ES 모듈 보안 정책 때문에 정상 동작하지 않을 수 있습니다. 로컬 서버 또는 HTTPS 호스팅에서 사용하세요.
- 앱 설치(PWA)는 HTTPS 환경에서 기기별로 홈화면에 추가할 수 있으며, 오프라인에서는 로컬 데모 편집은 가능하나 SNS·공동 데이터 동기화는 불가능합니다.

### 공식 문서

- [GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site)
- [Supabase Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls)
- [Supabase Google OAuth](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [앱인토스 개발자센터](https://developers-apps-in-toss.toss.im/)


## 앱인토스 번들 직접 빌드하기 (신규)

전체 프로젝트의 `toss-miniapp/` 폴더에 **별도 SDK 빌드 준비 프로젝트**가 있습니다. 해당 폴더에서 `01_setup_windows.cmd` → `02_build_windows.cmd` 순서로 진행하세요. 공식 설정 파일은 `apps-in-toss.config.ts`입니다. 이 컨테이너에는 외부 npm 연결이 없어 실제 `.ait` 생성은 미검증이며, Toss 로그인·서버 공동편집 미구현 상태입니다. **앱인토스 심사 제출 전 추가 작업이 필요합니다.**
