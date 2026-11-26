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
| 6 | 여행 제휴 마케팅 (아고다·클룩·스카이스캐너·트립닷컴) | **완료(2026-11-14)**. PG사 심사 및 비용 없이 즉시 가동. 아고다 CID(`8126459`) 및 클룩 AID(`143307`) 정산 계정 연동 완료. 도시별 최저가 호텔·투어/패스/eSIM·항공권 실시간 연결. 토스판 정책에 맞춰 토스 미니앱에서는 자동 숨김(`isTossPlatform()`). |
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
  2. `toss-ads.js` 의 `AD_GROUP_ID` 는 2026-11-13 QR 테스트 뒤 실제 ID 로 교체했다. 다시 개발·QR 테스트를 할 때는 `ait-ad-test-rewarded-id` 로 되돌려 빌드한다. 개발·QR 테스트 중에는 테스트 ID 를 써야 한다(실제 ID 로 테스트하면 정책 위반).
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

## 2026-11-13 추가 — 로그인 없는 화면의 AI 동선 (Claude Code)
- 웹 체험 모드(`?demo=1`)와 토스 미니앱은 로그인이 없어 `tripkku-ai` 를 못 쓴다. 그래서 예시 일정만 나왔다.
- 새 Edge Function `supabase/functions/tripkku-plan-guest`: 여행 정보를 요청 본문으로 받아 같은 프롬프트로 동선을 만든다. **Verify JWT 끄기**, 비밀 값은 기존 `GEMINI_API_KEY` 그대로. 횟수 제한은 메모리 기준(한 IP 10분 4회·하루 12회, 전체 하루 600회).
- 앱: `next/app.js` 의 `guestPlan()`. 실패하면(미배포·횟수 초과·오프라인) 예시 일정("○○ 구경/맛집")으로 넘어간다. 그래서 함수 배포 전에 앱을 먼저 올려도 깨지지 않는다.
- **남은 일(사용자)**: Supabase 대시보드에서 `tripkku-plan-guest` 함수를 만들고 JWT 검사를 끈다. 토스 QR 테스트 때 새 여행을 만들어 실제 동선이 나오는지 확인한다(토스 앱 안에서의 호출은 확인 못 함).
- 첫 화면에 "로그인 없이 체험하기" 버튼 추가(`next/index.html`).

## 2026-11-26 추가 — Meshy 3D 모델(.glb) 쓰기 시작
- 첫 모델: 프라하 구시가지 광장 크리스마스(틴 성당 + 큰 트리) `next/assets/models/prague_tyn_xmas.glb`. 원본 Meshy 파일 58MB(삼각형 240만 개) → 성당·트리를 나눠 줄이고 색을 입힌 뒤 meshopt 압축해 약 380KB.
- 소품 키 `pragxmas`. "프라하 크리스마스 마켓", "틴 성당 크리스마스" 처럼 프라하·틴 성당 + 크리스마스/마켓/트리 글자가 있으면 나오고, 프라하 크리스마스 마켓 차례(CITY_XMAS)의 첫 번째 소품이다. 크리스마스 글자가 없는 "프라하 구시가지 광장"은 손으로 만든 `tyn`.
- 코드: `journey3d.js` 의 `MODELS` 표에 키·파일·크기를 적으면 된다. 처음 쓸 때 한 번만 받고(캐시), 받는 동안·실패하면 `fallback` 소품을 보여준다. 디코더는 three 의 `meshopt_decoder.module.js` (토스판은 sync 스크립트가 npm three 경로로 바꿈).
- 새 Meshy 모델 넣는 순서: `gltf-transform simplify`(삼각형 3~8만 개 목표) → 색이 없으면 꼭짓점 색(COLOR_0, 선형 색값) 입히기 → `quantize` → `meshopt` → `next/assets/models/` 에 넣고 `MODELS` 에 한 줄.

## 2026-11-26 추가 — 겨울 여행 월드 `world/index.html` (Claude Code, 로컬 세션)
- 인스타 릴스(three.js + Meshy GLB 메타버스)처럼 걸어다니는 3D 월드. 단일 HTML, three@0.160.0 CDN, 블룸·눈·별. 주소: https://gayeon-hong.github.io/tripkku/world/ (`?close` = 캐릭터 가까이 보기)
- 사용자 이번 여행지 3곳 광장: 드레스덴(프라우엔 교회·슈트리첼마르크트) / 프라하(틴 성당·천문시계) / 브뤼셀(아토미움·그랑플라스). 중앙 허브 트리, 위쪽 버튼으로 순간이동.
- `world/models/<dresden|prague|brussels|character>.glb` 가 있으면 손으로 만든 랜드마크 대신 자동 사용(높이 22로 맞춤). 현재: `prague.glb`(= next 의 prague_tyn_xmas.glb, 트리에 전구·별 코드로 추가), `dresden-market.glb`(사용자가 Meshy 앱으로 만든 색 없는 마켓 → 높이별 나무색 칠함, 35MB→0.6MB, 있으면 손으로 만든 마켓·전구 숨김, 충돌판정 없음).
- 캐릭터: 가족 3명 코드 미니 캐릭터(`FAMILY` 배열, `chibi()`). 나=긴 갈색머리·커튼 앞머리·검정 숏패딩·숏치마·부츠 / 엄마·아빠=카키 롱패딩 커플+후드 퍼(에코백/백팩). 엄마·아빠는 따라 걷기.
- **다음 할 일**: 사용자가 Meshy로 만든 가족 3D 캐릭터 GLB를 보낼 예정.
  - 가족 캐릭터는 **관리자(사용자) 계정이 만든 여행에서만** 사용: `trip.owner_id` 가 `tripkku_beta_admins` 에 있을 때만(`next/app.js` `isBetaAdmin`, `window.__tripkku.ownerId()`). 다른 여행은 기본 캐릭터.
  - 파일 공개 범위 결정(2026-11-26): **화면에서만 숨기기**로 충분. 정적 파일(예: `next/assets/models/`)에 두고 관리자 여행일 때만 불러오면 됨. 이유: 여행에 참여하면 사용자에게 알림이 가서 몰래 쓰기 어려움. Supabase 비공개 Storage 불필요.
  - 옷 갈아입히기: Meshy 모델은 옷·몸 한 덩어리 → 옷마다 별도 모델로 바꿔 끼우기(권장) / Meshy retexture(모양 그대로 색·무늬만) / 코드 색 변경. 걷는 동작은 Meshy 리깅·애니메이션 받아야 함.
  - 엄마·아빠 캐릭터는 사용자가 직접 바꿔둔다고 함 → 덮어쓰지 말 것.
- 작업 방식 주의: 사용자는 요청 범위만 정확히 고치길 원함(예: "앞머리만" → 앞머리만). 결과가 맘에 안 들면 전체 롤백 말고 해당 부분만 되돌리기.
- 깃 푸시(로컬 PC): GCM 에 깃허브 계정 2개(Gayeon-Hong, GayoenHong) → 저장소에 `credential.https://github.com.username=Gayeon-Hong` 설정함. 여러 세션이 동시에 올리니 `git pull --rebase` 후 push.
- Meshy CLI 로그인은 PC 에서 기기 코드가 계속 만료돼 실패. 사용자가 폰 Meshy 앱(무료 70크레딧)에서 만들어 GLB/zip 으로 보내주는 방식이 현실적.

### 2026-11-26 — 가족 3D 캐릭터 장치 (구현됨, 모델 파일 대기)
- `next/journey.js`: 캐릭터 값에 `family: ''|'me'|'mom'|'dad'` 추가. 꾸미기 창 '옷' 탭에 '가족 3D 캐릭터' 칩 — **관리자이면서 이 여행 주인일 때만** 보임. 저장도 그때만 바뀌고, 기기(localStorage)에는 안 남겨 다른 여행으로 새지 않음.
- `next/journey3d.js`: `FAMILY` 표 → `next/assets/models/family_me.glb / family_mom.glb / family_dad.glb`. `buildAvatar` 가 기본 캐릭터를 숨기고 모델을 캐릭터 키에 맞춰 세움. 파일이 없으면 기본 캐릭터 그대로. `loadGlb` 가 이제 색 그림(baseColorTexture, 파일 안에 든 것)도 붙임.
- 모델 넣는 법: 노드 하나짜리로 정리(`gltf-transform flatten`→`join`), 그림 1024 webp, `meshopt` 압축. 정면이 +z. 받은 텍스처 모델로는 아직 확인 못 함(색 있는 정점 모델로만 확인).

### 2026-11-26 — 가족 3D 모델 완성 + 겨울 월드 동시 접속 (claude.ai 세션)
- `next/assets/models/family_{me,mom,dad}.glb` 넣음(각 1.1~1.3MB). 엄마·아빠는 색 없는 Meshy 모델이라 정면 레퍼런스 사진을 실루엣에 맞춰 비춰 1024 그림으로 구움(`xatlas` 펼치기 → 사진 투영, 뒤쪽은 머리·털·겉옷 색). 나는 Meshy 색 그림 그대로.
- 겨울 월드(`world/index.html`):
  - 입장 때 나/엄마/아빠 고르기(`?who=me|mom|dad` 면 바로 입장). 각자 자기 캐릭터만 조종, 따라오기 없앰.
  - 동시 접속: Supabase Realtime 방송 채널 `tripkku-world:<room>` (저장 없음, publishable 키). `?room=<여행 id>`, 없으면 `family`. 위치는 움직일 때 약 10번/초, 가만히 있으면 2초마다. 12초 소식 없으면 지움. 이름표 스프라이트, 오른쪽 위 접속자 목록.
  - 확대·축소: 휠, 두 손가락, ＋/－ 버튼, 🗺 전체 보기(한 번 더 누르면 원래대로). 멀리 볼수록 안개도 멀리.
  - 충돌: 원형 대신 0.5 격자. 캐릭터 몸 높이(0.4~2.2)에 걸치는 상자·Meshy 삼각형 칸을 막음. GLB 가 들어올 때마다 다시 계산. 움직이는 트램은 제외(`userData.noCol`).
  - 모바일: 제목 줄임, 도움말 짧은 문장, 버튼 줄바꿈.
- 앱 입장 버튼: 일정 화면 `🎬 동선 재생` 옆 `❄️ 겨울 월드`. 관리자 본인 여행이거나 여행 캐릭터 중 `family` 가 정해진 경우에만 보임(엄마·아빠는 참여자라 이 조건으로 보임). 토스판엔 안 보임.
- 확인 못 한 것: 실제 Supabase Realtime 연결(개발 환경에서 외부 접속이 막혀 가짜 채널로만 확인). Realtime 설정에서 공개 채널이 막혀 있으면 혼자만 보임.
- **프라하 구역 개편**(2026-11-26): 중앙 → 돌계단 → 까를교(`world/models/charles.glb`, Meshy, 받침대 잘라냄, 19배) → 탑 문 → 언덕(높이 7) → 틴 성당 광장(u=72). `OUT/SIDE`·`toUV/fromUV` 좌표, `KB` 표에 다리·강·언덕 치수. `groundAt(x,z)` 가 땅 높이(캐릭터·충돌·물건 올리기 공용), `noWalk` 가 강·계단 옆·탑 벽.
  - 강(블타바)은 코드: 흐르는 물결 그림 + 돌 강둑. 카누 4척이 다리 밑으로 오감. 강·언덕 쪽 숲은 비움.
  - 성 요한 네포무크 상 청동 부조(다리 가운데 u=26.2): 가까이 가면 `🙏 네포무크 상 만지기` 버튼 → 손 뻗기 + 반짝이, 같은 방 사람들에게도 반짝이 방송(`touch`).
  - 천문시계 탑(코드): 틴 성당 앞 광장 옆, 해·달 바늘이 돈다.
- **브뤼셀 → 베를린 교체**(2026-11-26, 사용자 여행 동선에 브뤼셀 없음): 구역 키 `berlin`. 코드로 만든 브란덴부르크 문(기둥 사이 통로로 지나감, 위에 크바드리가) + 뒤쪽 TV 타워(꼭대기 빨간 불 깜빡). `world/models/berlin.glb` 가 있으면 자동으로 바뀜. 예전 브뤼셀 코드(`brussels()` 아토미움·길드하우스)는 커밋 `ec82710` 이전 기록에 남아 있음 — 사용자가 브뤼셀 모델을 보내면 나중에 다른 자리로 되살릴 수 있음.
- 드레스덴 프라우엔 교회: `world/models/dresden.glb`(Meshy, 색 없는 모델에 사암·슬레이트 규칙 색칠, 받침대 잘라냄).
- 보관용 모델: `world/models/extra/brussels-townhall.glb` (브뤼셀 시청, Meshy 색 그림 있음, 받침대 포함, 2.3MB). 지금 월드에서는 안 불러옴 — 나중에 브뤼셀 구역을 다시 만들 때 사용.
- **시간·날씨**(2026-11-26): 오른쪽 아래 🌙/🕒 버튼(기기에 기억, 처음엔 🌙). 🌙 겨울밤 = 항상 밤 + 눈. 🕒 실제 시간 = 가장 가까운 도시 좌표로 태양 고도를 계산해 낮·노을·밤 하늘/조명/블룸/별, 날씨는 Open-Meteo(키 없음, 15분마다) `weather_code` → 맑음·흐림·안개·비·눈(비는 눈 입자를 파랗고 빠르게). 왼쪽 아래와 도시 카드에 "지금 프라하 17:20 · -2℃ 눈".
- **오늘 일정 표시**: 앱 입장 버튼이 고른 날짜의 일정 글자에서 도시를 찾아 `&today=prague,dresden` 으로 넘김 → 광장 위 '📍 오늘 일정' 표지 + 순간이동 버튼 노란색.
- **주의(고친 버그)**: 법선 길이가 0 인 꼭짓점이 있으면 블룸 효과에서 NaN 이 퍼져 화면 전체가 까매진다(엄마 모델로 들어가면 검은 화면). 모델 마무리 스크립트에서 0 법선을 면 법선으로 채움. 새 모델도 꼭 확인할 것.
- **프라하 성**(Meshy, `world/models/prague-castle.glb`, 165MB → 1.6MB): 틴 성당 광장 왼쪽 뒤 언덕 너머(u=112, v=-34)에 26배 크기 배경으로. 걸어서는 못 감. 따뜻한 조명 3개로 밤에도 보이게.
- **천문시계**(Meshy, `world/models/orloj.glb`, 85MB → 0.9MB): 코드로 만든 천문시계 탑을 숨기고 이 모델로(높이 23, 시계판이 광장 쪽). 파일이 없으면 코드 탑 그대로.
- **트램**(Meshy, `world/models/tram.glb`, 84MB → 0.76MB, 돌바닥 받침 잘라냄): `tramModel(group, 길이)` 로 드레스덴 마켓 뒤 트램과 새 프라하 트램(언덕 위 광장 뒤 선로 u=95, v ±22 왕복)에 씀. 받기 전엔 코드로 만든 상자 트램.
- **글뤼바인 노점**(Meshy, `world/models/stall.glb`, 46MB → 0.5MB, 받침 잘라냄): `stall()` 이 `stallModel(g)` 로 상자 노점 대신 씀(프라하·베를린 광장 각 4개, 폭 4.2, 카운터가 광장 쪽). 조명 대신 자기 색으로 살짝 빛나게(emissiveMap). 드레스덴은 마켓 모델 그대로.
- **커리부어스트 노점**(Meshy, `world/models/currywurst.glb`, 115MB → 1.1MB): `stall(..., kind)` / `stallModel(g, kind)` 로 모델 선택. 베를린 광장 앞줄(문 쪽 2개)은 커리부어스트, 뒷줄은 글뤼바인. 가족 3D 셋 다 Meshy 색 모델로(아빠 `Cozy Winter Smile`).
- **드레스덴 관람차**(Meshy, `world/models/ferris.glb`, 247MB → 2MB): 한 덩어리 모델이라 지금은 멈춘 채로 코드 관람차 대신 놓음(높이 18, 은은하게 빛남). 사용자가 ①다리+받침 ②바퀴(곤돌라 없이) ③곤돌라 1개를 따로 만들어 보내면 바퀴 회전 + 곤돌라는 항상 똑바로(코드 관람차의 `cars` 방식)로 바꿀 예정.
- **드레스덴 크리스마스 피라미드**(Meshy, `world/models/pyramid.glb`, 144MB → 1.9MB, 받침 없음): 코드 피라미드 대신 높이 14로, 진짜 피라미드처럼 가운데 축으로 통째로 천천히 회전(0.3 rad/s). 은은하게 빛나게(emissiveMap 0.3).
- **빨간 지붕 노점**(Meshy, `world/models/redstall.glb`, 273MB → 1.7MB): 드레스덴 노점 골목 16개 중 12개(나머지 커리부어스트 2·글뤼바인 2, `striezelmarkt` 의 `KIND` 표). 프라하·베를린 광장에도 뒷줄 1개씩. Meshy 색 그림이 잘게 쪼개져 있어 7만 삼각형 아래로는 안 줄어듦 → `stallModel` 이 `THREE.LOD` 로 40 넘게 멀면 원래 상자 노점을 보여 줌(노점이 많아도 폰이 버티게). 커리부어스트도 3만 꼭짓점으로 줄임.
- **회전목마**(Meshy, `world/models/carousel.glb`, 282MB → 1.9MB): 가운데 광장(HUB)에서 드레스덴·베를린 사이(210°, 24) 빈터, 높이 9, 통째로 0.35 rad/s 회전.
- **산타 모자 토끼**(Meshy, `world/models/bunny.glb`, 0.37MB, 높이 1.7): HUB 둘레 반지름 4~32 안에서 빈 칸(`isBlocked` 아님)을 골라 깡충깡충 돌아다니고 1~4초 쉼. 내 캐릭터가 5 안에 오면 쳐다보며 제자리 폴짝. (생김새가 유명 캐릭터와 닮아 공개 배포 땐 저작권 주의 — 사용자에게 알림)
- **눈싸움 마당**(2026-11-26): 흰 다람쥐(Meshy, 부위별 저장 6개 → `world/models/squirrel.glb` 0.32MB, `model_part0` 몸·`1` 눈덩이·`2` 꼬리·`3/4` 귀·`5` 모자). 부위마다 색 그림 조각이 너무 잘아 꼭짓점 색으로 옮겨 담고 부위별로 줄임(`glbwork/fin2.mjs`, 부위를 합치지 않음). 원점 기준 210°·52 빈터(반지름 10, 눈 언덕 4개). 다람쥐 3마리가 돌아다니다 2.5~6초마다 다른 다람쥐나(가까우면) 나에게 눈덩이를 포물선으로 던짐. 맞으면 흔들리고 던진 쪽에 되갚음. 가까이 가면 '❄️ 눈 던지기' 버튼(가장 가까운 다람쥐에게). 꼬리는 뿌리를 축으로 살랑, 귀 까딱. 눈싸움은 내 화면에서만(동시 접속 방송 안 함).
- **눈싸움 함께 보기**: 방송 이벤트 `sf` (`net.emit`). 방에서 id 가 가장 작은 사람이 호스트 — 다람쥐를 움직이고 0.16초마다 위치(`st`) 방송, 다른 사람은 그 위치로 부드럽게. 던지기(`th`: 던진 쪽·맞을 쪽·출발·도착 좌표)는 던진 사람이 방송하고 모두 같은 눈덩이를 그림. 다람쥐 맞음(`hit`)은 호스트가, 사람 맞음(`phit`)은 맞은 본인이 정해 방송. 눈 던지기 버튼은 가까운 다람쥐뿐 아니라 근처 가족에게도 던짐. 테스트: `wtest/world/two.html`(iframe 두 개 + BroadcastChannel 가짜 채널).
- **뜨르들로(굴뚝빵) 노점**(Meshy, `world/models/trdelnik.glb`, 282MB → 1.9MB, 받침 잘라냄, kind `trdelnik`): 프라하 광장 3개(앞줄 왼쪽은 글뤼바인, 뒷줄 하나는 빨간 지붕), 베를린 뒷줄 오른쪽 1개, 드레스덴 골목 2개(`KIND` 표). 멀면 상자 노점(LOD).
- **도르래 산타 썰매**(Meshy, `world/models/sleigh.glb`, 61MB → 0.78MB, 루돌프가 +x): 드레스덴 마켓 위 줄 타고 오가는 코드 썰매 대신(길이 6, 썰매 앞 +z 로 돌림, 은은하게 빛남). 줄·도르래·움직임은 그대로.

### 2026-11-26 관람차 회전 (조각 모델)
- `world/models/ferris-parts.glb` (Meshy 21조각, 텍스처→정점색, 745KB). 테(part18)·바퀴살(part19)이 중심 (−0.0023, 0.2022)을 축으로 돌고, 곤돌라 11개(part0,2,3,6,8–14, part1=고리)는 회전 없이 위치만 따라가서 늘 똑바로 매달림. 다리·받침(15,16,17,20)은 고정. 속도 0.12 rad/s.
- 이전 단일 `ferris.glb`는 삭제.
- 9da8ef_2/9da8ef_3 업로드는 같은 파일(관람차)이었음 — 캐릭터 조각 파일은 아직 안 옴.

### 2026-11-26 순록 캐릭터 + 스케이트장
- `world/models/reindeer.glb` (Meshy 5조각, 텍스처 유지 400KB): 0·2 뿔, 1 몸, 3 머리, 4 망토. 법선이 없어서 런타임에 computeVertexNormals.
- snowFight 안에 2마리 추가(다람쥐 3마리 로드 뒤 순서 고정 → crit 번호 3,4, 모두에게 같은 번호). 눈싸움 마당에서 같이 눈싸움.
- 스케이트장: 눈싸움 마당 옆(각도 7π/6−0.36, 반지름 52), 얼음판 반지름 5.5. 순록은 14~26초 눈싸움 → 12~22초 스케이트(원 그리며 미끄러짐, 안쪽으로 기울기, 가끔 한 바퀴 스핀) 반복. 호스트가 위치+기울기(st 4번째 값) 방송.

### 2026-11-26 화면 검정 깜빡임 수정
- 원인: 길이 0 인 법선(ferris-parts 3개)·법선 없는 모델(reindeer) → 셰이더 NaN → UnrealBloom 이 화면 전체를 검게. 해당 모델이 시야에 들어올 때마다 깜빡임.
- 모델 파일 수정: `/home/claude/glbwork/fixn.mjs` (없는 법선 생성, 0/NaN 법선을 이웃 면 법선으로).
- 런타임 안전망: `GLTFLoader.prototype.parse` 를 감싸서 모든 GLB 의 법선을 검사, 0/NaN 이면 (0,1,0). 앞으로 새 모델이 와도 같은 문제 안 생김.

### 2026-11-26 프라하 성 동쪽 성문 + 더 멀리 축소
- buildCastleStair 끝에 stair 2갈래 추가: ① 언덕 (u116,v40) → 성문 앞 돌다리 (u152,v52.5) 돌 계단(보임) ② 성문 건물 밑 (u154,v47)→안마당 (u172,v45) 보이지 않는 경사로(`hide:true`, 그리기 건너뜀). 높이는 castleGround 로 런타임에 잼.
- 확인: 언덕(110,30)에서 0.5 간격 BFS(castleStepOk+isBlocked)로 계단·돌다리·성문·안마당 모두 도달.
- 줌 최대 160 → 280, 카메라 far 700 → 1000.

### 2026-11-26 밤: 두 손가락 지도 옮기기 · 먼 노점 · 성 계단 시작점 · 위 메뉴 접기
- 두 손가락: 벌리기=확대, 비틀기=돌리기, 같이 끌기=지도 옮기기(`camPan`, 두 손가락 기울이기는 없앰 — 기울이기는 오른쪽 한 손가락 끌기·🎥). 걷거나 톡 이동하면 camPan 이 0 으로 돌아옴, 🗺·도시 이동 때 초기화. 눈·달 그림자도 camTarget 기준.
- 먼 노점(LOD 40+): 실행 중 꼭짓점 묶기(텍스처 좌표가 뭉개져 깨져 보임) 대신 `models/<kind>-lo.glb`(꼭짓점 색, 약 3천 면, 25KB). 만드는 법: gltf-transform dequantize→png → python 텍스처→꼭짓점 색 → `/home/claude/glbwork/lo.mjs 3000` → fixn.mjs.
- 성 동쪽 계단 시작점 (u116,v40)→(u110,v30): |v|≥38 이면 프레임의 반지름 제한(lim 64)이 밀어내서 못 갔음. 반지름 제한까지 넣은 BFS 로 언덕(70,0)→계단→성문→안마당 도달 확인.
- 위 메뉴 접기: 화면 위 150px 안에서 위로 쓸면 `body.fold`(제목·도움말·도시 버튼 숨김), 아래로 쓸거나 ⌄ 손잡이 톡이면 펼침. localStorage.worldFold 로 기억.

### 2026-11-26 멀어지면 지저분해지는 것 정리
- Meshy 텍스처는 UV 조각 사이가 검은 빈칸이라, 멀어져 밉맵이 작아지면 검정이 조각 테두리로 번져 얼룩져 보임 → `/home/claude/glbwork/pad.mjs`: UV 삼각형을 그려 덮인 칸을 찾고, 바깥 빈칸을 가까운 조각 색으로 64겹까지 넓혀 채운 뒤 webp q88 로 다시 저장. 텍스처 있는 월드 모델 전부 + family_{me,mom,dad} 에 적용. 새 Meshy 모델도 넣을 때 pad.mjs 한 번 돌릴 것.
- 로더 안전망에서 모든 텍스처 anisotropy = 최대(비스듬히·멀리 볼 때 덜 뭉개짐).
- 먼 노점은 앞 항목의 *-lo.glb.

### 2026-11-26 홈 인사말 뒤 ❄️ (겨울 월드 입장)
- next/journey.js `homeWorld()`: 홈 인사말 h1(#homeGreeting, "○일 뒤 출발!") 바로 뒤에 배경 없는 ❄️ 링크(#homeWorld). 다가오는 여행이 있으면 항상 보임(가족·관리자 조건 없앰), 없으면 숨김, 토스판은 제거. 링크 = ../world/?room=<tripId>&who=<내 family>.
- 여행 카드 안 '❄️ 겨울 월드' 버튼은 없앰(중복). 여행 화면 안 #worldBtn(worldLink)은 그대로.
- journey.js?v=20261126_wx2

### 2026-11-26 관람차 밝게 · 트램 너머 언덕 · 눈 범위
- 관람차: emissive 0xffe2b8 ×0.55 를 onBeforeCompile 로 `emissive * vColor.rgb`(자기 색으로 빛남; vColor 는 알파 있는 vec4 라 .rgb 필수 — 안 붙이면 셰이더 깨져 모델이 안 보임) + 앞뒤 PointLight 2개.
- 프레임 반지름 제한: 언덕(pu 40~102+back, |pv|<38)도 400 → 예전엔 반지름 99 에서 막혀 트램(u95) 너머로 못 갔음. 성 길 빼고 BFS 로 (105,0)·(115,−10)·계단 밑 도달 확인.
- 눈: 내 주변 120×40×120 상자만 내려서 축소하면 한 도시에만 오는 것처럼 보였음 → snow.scale = max(1, camDist/40), 눈송이 크기 ×√배율. 🕒 실제 날씨 모드는 도시별 실제 날씨라 안 오는 도시도 있음(정상).
