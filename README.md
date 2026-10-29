# TRIPKKU NEXT · 여러 나라 AI 여행 플래너 (베타)

현재 오이타 전용 TRIPKKU의 디자인을 확장해 여러 나라의 여행을 새로 만들 수 있도록 구성한 **베타 버전**입니다. 기존 오이타 데이터는 삭제하거나 변환하지 않습니다. 기존 원본은 `oita.html`에 그대로 보존했습니다.

## 기능 범위

- **홈 화면:** 도시·나라·출발일·귀국일·인원·스타일·여행 속도·예산·필수 방문지·예약 조건 입력
- **AI 일정 생성:** Gemini Edge Function이 날짜별 일정을 JSON으로 제안 → 미리보기/사용자 확인 → 여행에 적용
- **일정 수정:** 일정 직접 추가·수정·삭제, 충돌 시 대체/시간조정/취소, AI 채팅의 일정 변경 제안 승인
- **지도:** 구글 지도 장소 검색 링크와 하루 동선 열기. 정확한 이동 소요시간/시간표 실시간 검증은 아직 지원되지 않음
- **여행 관리:** 여행 여러 개, 로그인, 친구 초대, 공동 일정·할 일·메모·예산
- **비공개:** 나의 지출과 예약서류 PDF/QR은 별도 RLS 정책으로 사용자 본인만 접근
- **현지화:** 여행 국가 자동 추정(주요 지명은 무료 규칙, 모르는 지역은 AI로 제안), 수동 국가 확인, 국가별 언어/현지 통화, 언어 직접 변경, 양방향 번역, 마이크·음성 듣기, 외부 번역기 링크
- **개인화:** 낮/밤과 지구 표정 변경. *이미 설치된 아이폰 홈 화면 아이콘은 실시간 변경되지 않음*

## 파일 설명

| 파일 | 용도 |
|---|---|
| `index.html` | 새로운 여행 홈/화면 |
| `app.js` | 앱 로직 · Supabase · 일정 편집 · 번역 |
| `style.css` | PC·모바일 반응형 스타일 |
| `countries.js` | 나라별 언어·통화 정보 |
| `manifest.webmanifest` / `assets/` | 아이폰 홈 화면용 PWA 및 지구 아이콘 |
| `oita.html` | 현재 오이타 전용 v29의 기존 코드 보존 |
| `supabase/setup.sql` | **SQL Editor에서 실행**할 새 테이블 및 RLS |
| `supabase/functions/tripkku-ai/index.ts` | **Edge Functions에 배포**할 추천/챗봇/번역 AI 서버 |

## 안전한 베타 배포 권장 경로

기존 운영 중인 `/tripkku/`의 `index.html`은 당장 교체하지 마세요. **GitHub 저장소에 `/next/` 폴더를 만들고 그 안에 새 웹 파일을 업로드**하면 기존 여행 앱을 그대로 유지하며 테스트할 수 있습니다.

1. Supabase 프로젝트 `tripkku` → **SQL Editor → New query**에서 `supabase/setup.sql`을 붙여 넣고 **Run**합니다. 이전 `oita_rooms`나 다른 데이터는 수정하지 않습니다.
2. Supabase → **Edge Functions → Create new function → Via Editor**에서 함수명을 `tripkku-ai`로 지정하고 `supabase/functions/tripkku-ai/index.ts` 전체를 `index.ts`에 붙여넣어 배포합니다. **Verify JWT ON** 유지.
3. Supabase → **Edge Functions → Secrets**에 기존에 작동하던 `GEMINI_API_KEY` 및 `GEMINI_MODEL`이 등록되어 있는지 확인합니다. API 키를 GitHub에 넣지 마세요.
4. Supabase → **Authentication → URL Configuration → Redirect URLs**에 `https://gayeon-hong.github.io/tripkku/next/`를 추가합니다. Google 로그인이 리디렉션되는 경로입니다.
5. GitHub 저장소의 **`next/` 폴더**에 `index.html`, `app.js`, `style.css`, `countries.js`, `manifest.webmanifest`, `oita.html`과 `assets/` 폴더 전체를 업로드합니다. **Commit** 후 `https://gayeon-hong.github.io/tripkku/next/`를 확인합니다.
6. 두 사람의 서로 다른 Google 계정으로 로그인 → 새 여행 생성 → 일정 추천 → 초대 링크 참여 → 일정 저장/동기화 → 개인 파일 본인만 보이는지 확인하세요.

`supabase/setup.sql` 파일 자체를 Edge Functions의 TypeScript 편집기에 붙여넣으면 안 됩니다. SQL은 SQL Editor 전용입니다.

## 로그인 없이 미리보기

`https://gayeon-hong.github.io/tripkku/next/?demo=1`

데모에서 새 여행, 일정 편집, 일정 겹침 처리, 장소 저장, 예산 UI를 확인할 수 있습니다. **데모에는 실제 AI 추천·파일 업로드·로그인/공동 동기화가 없고**, 그 여행은 해당 브라우저 저장소에만 남습니다. 로컬 샘플 일정을 실제 AI가 만든 일정으로 오인하지 마세요.

## 국가 및 번역 설정

여행지를 입력하면 잘 알려진 도시/지역을 바탕으로 국가를 먼저 추천합니다. 추론이 어려우면 AI가 국가 코드(ISO 3166-1 alpha-2)를 제안하며, **국가 선택을 사용자가 최종 확인**합니다. `countries.js`에서 국가별 기본 언어와 현지 통화를 선택합니다. 다국어 국가에서는 번역 탭에서 언어를 변경할 수 있습니다.

번역은 `tripkku-ai`의 `translate` 동작을 사용하며, **번역한 텍스트를 DB에 저장하지는 않습니다.** 브라우저 마이크 입력은 iOS 버전에 따라 지원되지 않을 수 있어 아이폰 키보드 받아쓰기를 이용하도록 안내합니다. 음성 읽기는 운영체제에 해당 언어 음성이 있어야 자연스럽습니다.

## 중요 제약과 배포 전 점검

- **Google Places/Routes API 미연동:** 추천 명소, 이동시간, 영업 여부, 교통 시간표는 AI의 추정입니다. 장소 링크는 무료 Google Maps URL입니다. 정식 서비스에서 실시간 경로 최적화가 필요하면 Places/Routes API와 과금 제한 설정을 별도로 도입하세요.
- **실제 백엔드 통합 검증 필요:** PC 1200px·iPhone 390px에서 화면/CRUD/충돌 처리/나라별 번역 선택을 데모 테스트했고 JS 및 Edge TS의 문법 검사도 통과했습니다. 실제 Gemini 호출, 두 계정 동기화, OAuth, 스토리지 정책과 아이폰 음성은 배포 후 검증해야 합니다.
- **AI 비용:** `setup.sql`에 사용자별 일일 요청 제한을 넣었지만 Google API의 사용량·청구 제한을 대체하지 않습니다. 공개하기 전 Google AI API 과금과 서버 로그를 반드시 점검하세요.
- **개인정보:** 예약 PDF·QR 파일을 비공개 버킷에 저장하며 RLS는 본인 계정만 접근하도록 설정합니다. 친구와 공유하는 일정, 여행 조건은 AI 호출 시 Gemini로 전송될 수 있으므로 여권번호·숙소 비밀번호·개인 인증 QR은 AI 질문과 공용 메모에 입력하지 마세요.
- **기존 여행:** `oita.html`은 기존 `oita_rooms`를 계속 사용합니다. 새 `tripkku_trips` 여행으로 자동 이관하지 않습니다. 오이타 1~4안 선택 등 특화 기능은 기존 화면에서 유지됩니다.
- **앱스토어/PWA:** 아이폰 Safari에서 '홈 화면에 추가'로 사용 가능합니다. `manifest.webmanifest`의 앱 ID는 베타 경로(`/tripkku/next/`)로 되어 있습니다. 이후 운영 루트로 전환할 때는 앱 ID와 start_url을 재검토하세요.
- **새 도메인 배포:** Edge Function Secret `TRIPKKU_ALLOWED_ORIGINS`에 새 사이트의 **Origin**을 등록해야 CORS 차단되지 않습니다. 기본 설정은 `https://gayeon-hong.github.io`, `http://localhost:8765`, `http://127.0.0.1:8765`입니다.

이 패키지는 운영 준비 전 **확장형 MVP/베타**입니다. 앱스토어 제출, 전체 국가별 법규 검토, 법적 이용약관 및 개인정보 처리방침, 정확한 실시간 경로·예약 연동은 별도 완성 단계가 필요합니다.
