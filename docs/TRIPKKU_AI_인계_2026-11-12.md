# 트립꾸(TRIPKKU) — AI 인계 문서

2026-11-12 저녁 기준. 이 문서 하나만 읽고 작업을 이어갈 수 있게 쓴 것이다. 세부는 맨 아래 "함께 볼 문서"에 있다.

## 1. 한눈에

- **무엇**: 친구·가족과 같이 쓰는 여행 플래너. 일행의 3D 캐릭터가 실제 지도 위를 일정대로 걷는 "동선 영상"이 핵심 기능이다.
- **운영**: 데일리앱스(대표 홍가연, 사업자등록번호 889-07-03530). 문의 000000000078@naver.com
- **저장소**: `Gayeon-Hong/tripkku` (공개). 기본 브랜치 `main` 에 바로 커밋·푸시한다. 푸시하면 GitHub Pages 로 1~3분 안에 배포된다.
- **주소**
  - 웹앱: https://gayeon-hong.github.io/tripkku/next/
  - 데일리앱스 홈페이지: https://gayeon-hong.github.io/tripkku/dailyapps/
  - 개인정보 처리방침: https://gayeon-hong.github.io/tripkku/next/privacy.html
- **배포 채널 3곳**

| 채널 | 방식 | 갱신 방법 | 상태 |
| --- | --- | --- | --- |
| 웹(PWA) | GitHub Pages 정적 파일 | `main` 푸시 | 운영 중 |
| Microsoft Store | PWABuilder 로 만든 껍데기가 웹 주소를 연다 | `main` 푸시만 하면 됨(재제출 불필요) | 2026-11-12 심사 제출, "In certification" |
| 토스 미니앱(앱인토스) | `next/` 를 복사해 번들에 넣는다 | **다시 빌드해 올려야 함** | 올라가 있음. 광고 코드는 아직 미반영(§6) |

## 2. 절대 지킬 것

- 공개 저장소다. **커밋 금지**: Supabase service_role 키, Gemini 키, OAuth client secret, 토스페이먼츠 시크릿 키(`…_sk_…`), VAPID 비밀 키, 사업자등록증 내용.
- 시크릿 키와 VAPID 비밀 키는 **Supabase Secrets 에만** 둔다. 대화로 받지도 않는다.
- 사업장 **주소는 공개 페이지에 넣지 않는다**. 사업자등록번호는 표시해도 된다.
- 사용자의 개인 구글 이메일은 비공개다. 문서·코드·외부 서비스에 쓰지 않는다.
- MS 스토어 "Submit for certification", 결제, 약관 동의처럼 되돌리기 어려운 버튼은 사용자 확인 없이 누르지 않는다.
- 사용자는 비개발자다. 한국어로, 쉬운 말로, 결과부터 말한다.

## 3. 사용된 핵심 기술 (무엇이고, 왜 썼나)

### 3-1. 빌드 없는 정적 PWA
- `next/` 폴더의 HTML·JS(ES 모듈)·CSS 를 그대로 올린다. 번들러·프레임워크가 없다. 외부 라이브러리는 jsDelivr CDN 에서 가져온다.
- 장점: 푸시가 곧 배포다. MS 스토어 앱도 같은 주소를 열기 때문에 함께 바뀐다.
- 캐시 깨기: 파일을 고치면 `next/index.html` 의 `app.js?v=…`, `journey.js?v=…`, `style.css?v=…` 값을 올리고, `journey.js` 안에서 `journey3d.js` 를 불러오는 주소의 `?v=` 도 올린다.
- 서비스 워커 `next/sw.js` (`VERSION` 상수): 화면 이동은 네트워크 우선(`cache:'no-cache'`), `?v=` 붙은 파일과 jsDelivr 는 캐시 우선. **지도 타일과 국기 이미지는 가로채지 않는다**(가로챘을 때 상세 지도가 안 보이는 문제가 있었다). 새 버전이 오면 자동 새로고침하되 동선 영상 창이 열려 있으면 기다린다. 푸시 수신도 여기서 처리한다.

### 3-2. Supabase (서버 전부)
- 로그인(카카오·구글 OAuth, 심사용 이메일 로그인), Postgres + RLS, RPC 함수, Edge Function(Deno).
- 여행 한 건은 `tripkku_trips.data` JSON 문서 하나다. 캐릭터(`data.avatars`), 좌표 캐시(`data.geo`) 등도 그 안에 있어서 대부분의 기능은 DB 변경이 없다.
- 권한: 주인 또는 관리자(`tripkku_beta_admins`)는 모든 권한. 앱에서는 `canManageTrip()`.
- SQL 은 `sql/` 에 날짜별 파일로 두고 사용자가 Supabase SQL Editor 에서 직접 실행한다. 지금까지 실행됨: `admin_powers`, `coupons`, `payments`, `push`.
- Edge Function: `tripkku-ai`(Gemini 동선 추천·챗봇·번역), `trip-booking-ocr`(예약서 읽기), `tripkku-pay-confirm`(결제 승인, 보류), `tripkku-push`(푸시 발송), `tripkku-geo`(장소 좌표 대리 조회, 2026-11-13 추가).

### 3-3. Three.js 절차적 3D (`next/journey3d.js`)
- Three.js 0.170. 모델 파일 없이 **코드로 도형을 조립**해 캐릭터와 랜드마크 약 150종을 만든다(브란덴부르크 문, 프라하성, 관람차 등). 용량이 작고 색·형태를 바로 바꿀 수 있다.
- 캐릭터: 얼굴 슬라이더, 머리·앞머리·눈썹, 크기(어른·어린이·아기), 나라별 전통의상, 행동(먹기·사진·가리키기·국기 흔들기), 표정.
- `createStage` 가 지도 바닥·동선·일행·탈것(비행기·기차·버스 창문에 얼굴)·산타 썰매를 그린다. `createPortraits` 는 3D 를 한 번 그려 이미지로 만들어 홈·일정 화면에 쓴다(디스크 캐시).

### 3-4. 동선 영상 엔진 (`next/journey.js`)
- **타임라인**: 일정 글자를 분석해(`parseRoute`, 공항 코드, "인천출발 바르샤바도착" 같은 표현) 장소·이동 수단을 정한다. 600km 이상은 비행기, 150km 미만 비행은 걷기로 바꾼다.
- **지도(2026-11-13 교체)**: 바닥은 `next/vtile.js` 가 OpenFreeMap 벡터 타일(무료·키 없음·상업 이용 가능, 최대 z14)을 받아 우리 색으로 캔버스에 직접 그린다(한국어 이름 우선, 이름표 겹침 정리, 프레임당 2칸). OSM 타일 서버는 앱 배포 시 이용 정책 위반이고 토스(Referer 없음)에서 막혀 뺐다. 서비스 워커가 지도 데이터를 150개까지 보관.
- **장소 좌표**: Nominatim 으로 찾아 `data.geo` 에 저장. 직접 요청이 막히면(토스는 처음부터) Edge Function `tripkku-geo`(JWT 검사 끔, 비밀 값 없음)가 대신 묻는다. 실패하면 영상 창 안내 문구에 이유가 붙는다.
- **연출**: 구글 지도 같은 카메라 이동(`camMoveAt`), 장소·날짜별 일몰 계산(`sunTimes`)으로 밤낮, Open-Meteo 날씨, 도착 시 대표자가 국기를 흔든다.
- **랜드마크(2026-11-13 추가 36종)**: 일본(도쿄타워·스카이트리·센소지 가미나리몬·오사카성·도톤보리 글리코·츠텐카쿠·후시미 이나리·금각사·기요미즈데라·나고야성·나고야 TV탑·벳푸 지옥온천·유후인), 한국(남산타워·경복궁·롯데타워·광안대교), 중국(동방명주·천단·자금성), 미국(엠파이어·할리우드·스페이스니들·백악관), 캐나다(CN타워·샤토 프롱트낙·폭포), 브라질(슈가로프), 유럽(타워브리지·런던아이·루브르·노트르담·노이슈반슈타인·트레비·아토미움·부다페스트 국회). 이 이름 규칙은 RULES 맨 앞(크리스마스 규칙보다 먼저)에 있다. "○○ 구경/관광"처럼 일반 구경이면 CITY_SIGHTS 의 도시 대표 건물을 차례로 쓴다.
- **장면 규칙**: `RULES` 표가 일정 문구에 맞는 소품·행동·말풍선을 고른다. 모르는 장소는 `unknownPlaces` 로 모아 관리자에게 "새 장소 요청"으로 보여 준다.
- **영상 저장**: WebCodecs + `mp4-muxer` 로 빠르게 MP4 를 만들고(`exportFast`), 안 되면 `MediaRecorder` 로 녹화한다.
- 앱 본체와의 연결은 `window.__tripkku` 객체 하나다(`app.js` 가 채우고 `journey.js` 가 읽는다).

### 3-5. UI ("UI2" 테마)
- 배경 `#f5f6fa`, 남색 `#1b1e2e`, 코랄 `#ff7a59`, 하늘 `#cfe3ff`, 제목 글꼴 Jua. CSS 변수로 관리한다(`--bg --card --ink --navy --accent …`).
- 초록·베이지는 사용자가 싫어한다. 다시 넣지 않는다.
- 홈은 내 캐릭터 중심(`#heroMe`, 다음 여행 `#nextTrip`, 환율 타일, 하단 `#dock`).

### 3-6. 결제 — 토스페이먼츠 v2
- 브라우저: `https://js.tosspayments.com/v2/standard` → `TossPayments(clientKey).payment({customerKey}).requestPayment({method:'CARD', …})`.
- 서버: `tripkku_order_create` RPC 로 주문 생성 → 결제 후 돌아오면 Edge Function `tripkku-pay-confirm` 이 `POST /v1/payments/confirm`(Basic 인증)으로 승인하고 `tripkku_order_fulfill` 로 쿠폰을 넣는다. 금액은 서버 주문과 대조한다.
- 클라이언트 키는 `next/app.js` 의 `PAY.clientKey`(공개 값). 비어 있으면 구매 버튼이 숨는다.

### 3-7. 웹 푸시 (VAPID)
- 공개 키는 `next/app.js` 의 `PUSH.publicKey`, 비밀 키는 Supabase Secrets. Edge Function `tripkku-push` 가 `web-push` 로 보낸다.
- 알림 종류: `new_trip`, `detail_request`, `member_joined`, `trip_update`. 앱에서는 `notify(kind, tripId)`.

### 3-8. 토스 미니앱 (앱인토스 WebView)
- `toss-miniapp/sync-from-web.mjs` 가 `next/` 를 복사하고 CDN 주소를 npm 패키지로 바꾼다(빌드 전에 자동 실행). **이 폴더의 복사본은 직접 고치지 않는다.**
- 토스 안에서는 `window.TRIPKKU_LOCAL_ONLY=true`(로그인 없이 기기 저장), `window.TRIPKKU_PLATFORM="toss"`. 결제·쿠폰·상세 요청 버튼은 숨는다.
- 토스 전용 파일은 `toss-miniapp/toss-ads.js` 하나다(§6).

### 3-9. MS 스토어 (PWABuilder)
- 제품 ID `9PDJZMQ8PC30`, 패키지 `Lisaaaaa.TRIPKKUTRIPKKU`, 게시자 표시 이름 `데일리앱스`.
- 예약 이름: `트립꾸 TRIPKKU`, `트립꾸`(패키지 안 이름이 `트립꾸` 라서 추가 예약했다).
- 올린 패키지는 `트립꾸.msixbundle` 하나. `.classic.appxbundle` 은 검사 오류 표시가 지워지지 않아 뺐다(오래된 윈도우 10 용).
- `runFullTrust` 사유를 제출 옵션에 적었다(PWABuilder 가 자동으로 넣는 권한).

## 4. 파일 지도

| 경로 | 내용 |
| --- | --- |
| `next/index.html` | 화면 뼈대, 스크립트 버전(`?v=`) |
| `next/app.js` | 로그인, 여행 CRUD, 일정·예산·메모, AI 챗봇, 관리자 소식, 쿠폰·결제·푸시, `window.__tripkku` |
| `next/journey.js` | 동선 타임라인, 지도, 2D 덧그리기, 영상 창, 저장, 캐릭터 꾸미기 창, 홈 카드 |
| `next/journey3d.js` | Three.js 캐릭터·소품·무대·초상화 |
| `next/style.css` | 스타일(끝부분이 UI2) |
| `next/sw.js`, `next/manifest.webmanifest`, `next/store/` | 서비스 워커, PWA 정보, 스토어 스크린샷 |
| `next/privacy.html`, `next/vapid.html` | 개인정보 처리방침, VAPID 키 생성 도구 |
| `dailyapps/index.html` | 데일리앱스 홈페이지(앱 소개, 환불 안내, 사업자 정보) |
| `sql/` | DB 변경 SQL (사용자가 직접 실행) |
| `supabase/functions/` | Edge Function |
| `toss-miniapp/` | 토스 미니앱(복사본 + `toss-ads.js` + 빌드 설정) |
| `docs/` | 문서 |

## 5. 수익화 현황

| 단계 | 내용 | 상태 |
| --- | --- | --- |
| 1 | 영상 저장 쿠폰(초대 보상, 같은 영상 재저장 무료, 관리자 무제한) | 완료, 사용자 확인됨 |
| 2 | 미리보기 워터마크(`drawWatermark`, 저장 파일에는 없음) | 완료, 저장 파일 확인은 아직 |
| 3 | 토스페이먼츠 쿠폰 결제(1장 1,000원, 3장 3,000원) | **보류(2026-11-13)**. 가맹 심사 비용 때문에 사용자가 진행하지 않기로 함. 코드·SQL·Edge Function 은 그대로 두고 `PAY.clientKey` 를 비워 구매 버튼을 숨김. 테스트 키를 공개 앱에 넣으면 가짜 카드로 쿠폰이 무료 지급되므로 넣지 말 것 |
| 4 | 푸시 알림 | 연결됨. 실제 기기 수신 확인 전 |
| 5 | 토스 미니앱 보상형 광고 | **코드 완료, 테스트 광고 ID**. 실제 ID 교체·재빌드 필요(§6) |
| — | 웹 광고(애드센스) | 미착수. `github.io` 주소로는 승인이 어려워 자체 도메인이 먼저 필요 |
| — | "더 디테일하게 만들기 3,000원" | 요청→제작→잠금 해제 흐름만 있고 결제 연결 안 됨(MS·웹 전용, 토스에서는 숨김) |

## 6. 토스 보상형 광고 (2026-11-12 추가)

- 동작: 토스 미니앱에서 영상을 **저장할 때** 보상형 광고를 한 번 보여 준다. 끝까지 보면(`userEarnedReward`) 저장하고, 중간에 닫으면 저장하지 않는다. 광고를 쓸 수 없는 환경이면 막지 않고 저장한다.
- 코드
  - `toss-miniapp/toss-ads.js`: `@apps-in-toss/web-framework` 의 `loadFullScreenAd` / `showFullScreenAd` 를 감싸 `window.TRIPKKU_ADS = { ready(), reward() }` 를 만든다. `reward()` 결과는 `rewarded | skipped | unavailable | error`.
  - `next/journey.js` 저장 버튼: `window.TRIPKKU_ADS` 가 있으면 먼저 `reward()` 를 부른다. 웹·MS 에는 이 객체가 없어서 영향이 없다.
  - `sync-from-web.mjs` 가 `index.html` 에 `toss-ads.js` 스크립트를 넣는다.
- **남은 일**
  1. 앱인토스 콘솔 > 인앱 광고에서 **보상형 광고 그룹 ID** 발급.
  2. `toss-ads.js` 의 `AD_GROUP_ID`(지금 `ait-ad-test-rewarded-id`, 테스트용이라 수익 없음)를 실제 ID 로 교체. 개발·QR 테스트 중에는 테스트 ID 를 써야 한다(실제 ID 로 테스트하면 정책 위반).
  3. `toss-miniapp` 에서 다시 빌드해 콘솔에 올린다.
- 확인된 것: SDK 3.10.0 이 두 함수와 이벤트 이름(`userEarnedReward`, `dismissed`, `failedToShow`)을 내보낸다. **확인 못 한 것**: 실제 토스 앱에서의 광고 재생(샌드박스는 광고 미지원, 콘솔 QR 로만 테스트 가능).
- 앱인토스 정책: "광고" 표시 유지, 뒤로 가기 막지 않기, 보상을 광고 클릭에 묶지 않기, 보상은 `userEarnedReward` 에서만 지급.

## 7. 지금 기다리는 것 / 다음 할 일

1. **MS 스토어 심사 결과**(메일). 반려 가능 사유: 심사자용 테스트 계정 미기재(Additional Testing Information 이 비어 있음), 개인정보 처리방침 초안 표시.
2. ~~토스페이먼츠 가맹 심사~~ — 보류(비용). 다른 결제 수단(MS 스토어 인앱 결제, 앱인토스 인앱 결제)은 비용·조건 확인 전.
3. 사용자가 확인해 줄 것: 테스트 결제로 쿠폰이 느는지, 푸시가 실제 기기에 오는지, 상세 지도 타일이 다시 보이는지, 저장 파일에 워터마크가 없는지.
4. 문서 마무리: `dailyapps` 환불 정책과 `privacy.html` 의 "초안"·시행일, 통신판매업 신고번호.
5. 토스 광고 실제 ID 교체와 재빌드(§6).
6. 자체 도메인 → 애드센스(원하면).
7. 관리자 "새 장소 요청" 목록을 보고 3D 랜드마크 계속 추가. 사진은 쓰지 않는다(사용자가 거절).

## 8. 작업 방법

- 커밋 전에 `(cd toss-miniapp && node sync-from-web.mjs)` 로 토스 복사본을 맞춘다.
- 커밋은 `Gayeon-Hong` 이름, 이메일 `93218452+Gayeon-Hong@users.noreply.github.com`(GitHub 비공개 주소)으로 `main` 에 바로 올린다. 개인 이메일을 커밋에 쓰지 않는다(`git log -1 --format=%ae` 를 복사하지 말 것). 푸시 전에 `git fetch origin main && git rebase origin/main`. 다른 세션이 같은 파일을 고쳐 충돌할 수 있다(2026-11-12 에 실제로 있었다). 충돌하면 최신 `main` 위에 변경을 다시 적용한다.
- 문법 확인: `node --check next/app.js` 등. 화면 확인은 저장소에서 `python3 -m http.server` 를 띄우고 헤드리스 크롬으로 본다. 실제 Supabase·토스·OSM·푸시는 샌드박스에서 확인할 수 없으므로 **확인 못 한 것은 못 했다고 말한다.**
- Partner Center 조작 요령: 사용자 지정 드롭다운은 목록이 화면에 안 그려질 수 있다. 입력 칸을 누르고 키보드(글자 입력·아래 화살표)로 고른다. 파일 업로드는 내장 브라우저로 할 수 없어 사용자가 한다.

## 9. 사용자 취향 (지킬 것)

- 보기 쉬운 것이 최우선. 화면이 복잡해지면 뺀다(일정 옆 장소 아이콘은 뺐고, 현재 시간 일정의 체스말 캐릭터는 유지).
- 산타는 가끔만(30%), 기본 재생 속도는 느리게.
- 국기는 큰 카드·배너가 아니라 도착 시 대표자가 손에 들고 흔든다.
- 큰 UI 변경은 먼저 시안을 보여 주고 승인받는다.
- 관리자는 모든 권한이 있고 결제 대상에서 제외된다.

## 10. 함께 볼 문서

- `docs/JOURNEY_개발_인계.md` — 동선·캐릭터 구조와 저장 형식
- `docs/TRIPKKU_캐릭터_동선_작업정리.md` — 요구사항과 작업 이력
- `docs/MS_스토어_출시.md`, `docs/결제_연동.md`, `docs/푸시_알림.md`, `docs/TOSS.md`
- 디자인 캔버스: https://claude.ai/artifact/TrQReT98P81SaNjbWZfvHM

## 2026-11-13 추가 — 토스 최종 제출 체크리스트 (Claude Code 와 함께 진행 예정)
- 랜드마크 3D 총 60종(2차 24종: 싱가포르·동남아·동아시아·유럽·이집트·중앙아시아·중동). 규칙은 `next/journey.js` RULES 맨 앞 블록, 모델은 `next/journey3d.js` PROPS.
- 전용 3D 가 없는 장소는 지도 건물 모양 자동 심볼(`buildShape`). 색·지붕 장식은 지역(유럽/동아시아/동남아/중동/아메리카) + 장소 종류(성당/사원/성/모스크/박물관/탑)로 달라지고, 지도에 건물 색(colour)이 있으면 그 색을 씀.
- 제출 순서: `git pull` → `toss-miniapp\02_build_windows.cmd` → 콘솔 업로드 → QR 테스트(지도·장소 검색·광고·3D) → `toss-miniapp/toss-ads.js` 의 `AD_GROUP_ID` 를 실제 ID `ait.v2.live.7b6b89cdb8104280` 로 교체 → 다시 빌드·업로드 → 심사 제출.
- 미니앱 번들에 외부 결제 SDK(`tosspayments.com`)가 들어가면 반려됨. `sync-from-web.mjs` 가 자동으로 빼고, 남아 있으면 오류를 냄.
