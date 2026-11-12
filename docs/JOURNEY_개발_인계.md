# 3D 동선 재생 · 내 캐릭터 — 개발 인계 메모

2026-11-11 기준. 요구사항과 작업 이력은 [`TRIPKKU_캐릭터_동선_작업정리.md`](./TRIPKKU_캐릭터_동선_작업정리.md) 참고. 3D로 틀(뼈대)을 만들어 둔 상태입니다. 아래 "남은 일"부터 이어서 개발하면 됩니다.

## 파일

| 파일 | 내용 |
| --- | --- |
| `next/journey.js` | 캐릭터 설정, 타임라인, 장소 좌표 찾기, 지도 타일·카메라 계산, 2D 덧그리기(이름표·말풍선·제목), 창·버튼, 영상 저장 |
| `next/journey3d.js` | Three.js 장면. 캐릭터(`buildAvatar`, `poseAvatar`), 장소 소품(`PROPS`), 지도 바닥·동선·일행을 그리는 `createStage`, 꾸미기 미리보기 `createPreview` |
| `next/index.html` | 일정 탭의 `#journeyPlay`(🎬 동선 재생), `#avatarEdit`(🧑‍🎨 내 캐릭터) 버튼과 `journey.js` 스크립트 태그 |
| `next/app.js` | `window.__tripkku` 에 `getMembers, getMyId, getActiveDate, activeDayEvents, toast, fmtDate, eventEmoji` 추가(한 줄) |

`journey3d.js` 와 Three.js(jsDelivr CDN, 0.170.0)는 창을 처음 열 때만 불러옵니다. 빌드 도구는 필요 없습니다.

## 저장 형식 (DB 변경 없음, 여행 문서 안)

- `data.avatars[userId] = {faceW, faceH, jaw, skin, hair, bangs, size, hairColor, eyes, brows, outfit, acc, costume, gender, costumeColor, role}`
  - `faceW`(볼 너비), `faceH`(얼굴 길이), `jaw`(턱선)는 -1 ~ 1. 동그라미에서 조금씩 조절하는 값입니다.
  - `bangs`: `full`(앞머리 있음) `none`(앞머리 없음) `part`(가르마). `size`: `adult`(보통) `kid`(어린이) `baby`(아기, 키가 작고 머리 비율이 큼)
  - `brows`: `soft` `flat` `up` `thick` `none`
  - 전통의상: `costume` `on|off`, `gender` `f|m`(의상 형태만 결정), `costumeColor`(색만 선택). 의상 종류는 그날 일정의 나라로 자동 결정(`journey.js` 의 `COSTUME` 표 → `journey3d.js` 의 `costumeSpec`). 지금 9종: 한복, 기모노, 치파오·탕좡, 아오자이, 던들·레더호젠, 민속의상(체코·폴란드 등), 킬트, 쑤타이, 사리·쿠르타. 표에 없는 나라와 집 근처에서는 평소 옷.
  - `hair`: `bob`(단발) `long`(긴머리) `perm`(파마) `short`(짧은머리) `permShort`(짧은 파마) `buzz`(까까머리)
- `data.meta.groupType = 'friends' | 'family' | 'couple'`
- `data.geo[장소이름 소문자] = [위도, 경도]` (못 찾은 이름은 `0`). 한 번 찾으면 친구 화면에서도 다시 찾지 않습니다.
- 마지막으로 저장한 내 캐릭터는 `localStorage['tripkku-next-avatar']` 에도 남습니다.

## 동작 흐름

1. `buildTimeline(mode)` — `day`(선택한 하루) 또는 `trip`(출발 → 모든 일정 → 집 도착 → 마지막 장면). 일정마다 `reactionFor(e, 나라, seen)` 이 `RULES`(위에서부터 먼저 맞는 규칙)로 소품·행동·말풍선을 고릅니다. 소품이 여러 개인 규칙은 나올 때마다 차례로 바뀌고, 무엇을 먹는지 모르는 식사는 `FOOD_BY_COUNTRY` 에서 고릅니다. 소품은 `journey3d.js` 의 `PROPS`(63종).
   - 비행 구간(`seg.plane`)은 `cameraAt` 이 제자리 축소 → 항로 이동 → 제자리 확대 순서로 지도를 움직이고, 지나온 항로만 선으로 그립니다. 나라가 바뀐 첫 장소(`stop.flag`)에서는 `drawFlag` 가 국기를 띄웁니다.
2. `locate(tl)` — 장소 이름을 좌표로 바꾸고, 장소마다 머무는 확대 정도(`s.z`)와 구간별 이동 방식을 정합니다.
   - 가까운 구간: 클로즈업을 유지한 채 걸어서 이동.
   - 먼 구간(`seg.jump`: 비행, 또는 화면 밖으로 한참 벗어나는 거리): 화면이 하얗게 바뀐 뒤 멀리서 본 지도 위를 비행기·기차가 지나가고, 다시 도착지 클로즈업.
3. `frameAt(tl, t)` — 시간 `t` 의 장면 상태(지도 타일, 동선, 장소, 일행, 탈것)를 "화면 1px ≈ 1" 단위로 계산해 `stage.render(frame)` 에 넘깁니다. 일행은 항상 원점에 있고 지도가 아래에서 움직입니다.
4. `drawOverlay` — 3D 캔버스를 2D 캔버스에 복사한 뒤 이름표·장소 이름·말풍선·제목을 덧그립니다. 녹화는 이 2D 캔버스를 `MediaRecorder` 로 찍습니다.

표정은 `frameAt` 이 장면마다 `mood` 를 정해 넘깁니다: `normal`(가끔 깜빡임) `smile` `happy` `wow` `wink` `yum` `relaxed` `sleepy`. 좋아하는 곳에서는 `wow` → `happy`, 사진 포즈는 `smile` → `wink` 순서로 바뀝니다. 표정을 늘리려면 `journey3d.js` 의 `poseAvatar` 와 얼굴 조각(눈 3종, 입 3종)을 추가하면 됩니다.

여행 계획 화면에는 `renderPartyStrip` 이 여행 소개 카드(`.trip-intro`)의 칩 아래에 일행 캐릭터를 넣습니다. 그림은 `createPortraits` 가 3D를 한 번 그려 만든 이미지이고, 화면이 다시 그려질 때(`#activeTripTitle` 변경 감지)마다 설정이 바뀐 사람만 새로 그립니다. 같은 그림을 홈 인사 카드(`renderHomeHero`, 내 캐릭터), 홈의 여행 카드(`decorateTripCards`, 그 여행에 저장된 일행 얼굴), 초대 창(`decorateInvite`)에도 넣습니다. 이를 위해 `app.js` 의 여행 카드에 `data-trip-id` 를 달고 `window.__tripkku.getTrips` 를 추가했습니다. 홈에서 꾸민 캐릭터는 `localStorage` 에만 저장되고, 내 캐릭터가 없는 여행을 열면 `autoApply` 가 한 번 자동으로 저장합니다(역할은 비움). 예산의 결제자 등에는 아직 넣지 않았습니다.

## 확인한 것 / 못 한 것

- 헤드리스 크롬(소프트웨어 WebGL)에서 캐릭터 6종 머리·얼굴 조절, 소품 17종, 여행 전체 재생의 각 장면, 꾸미기 저장 흐름이 오류 없이 동작.
- 실제 사이트에서 사용자가 동작을 확인함(2026-11-11). 개발 환경에서는 OSM 타일·Nominatim 접속이 막혀 가짜 응답으로 시험함.
- 실제 로그인 상태(Supabase 저장), 휴대폰 성능, 영상 파일 녹화 결과는 확인하지 않았습니다.

## 알아 둘 점

- `index.html` 이 `referrer: no-referrer` 라서 타일·좌표 요청에만 `referrerPolicy: 'origin'` 을 지정했습니다(OSM 정책상 출처 필요).
- OSM 공개 타일·Nominatim 은 소규모 사용만 허용합니다. 사용자가 늘면 `TILE_URL`, `GEO_URL` 상수를 유료 서비스로 교체해야 합니다.
- 구글 지도를 쓰려면 API 키·결제 등록이 필요하고, 그 화면을 영상으로 저장·배포해도 되는지 약관 확인이 먼저입니다. 지금 구조에서는 타일 주소만 바꾸는 방식이라 구글 지도는 그대로 끼울 수 없습니다(구글은 자체 지도 화면 위에 3D를 올리는 방식).

## 남은 일 (우선순위 순)

1. **캐릭터 다듬기**: 지금은 구·캡슐 조합. 후드티 모자·주머니, 머리카락 결, 눈 반짝임, 표정 종류를 늘리고 사용자 참고 이미지와 비교해 비율 조정. 긴머리·단발이 헬멧처럼 보이는 부분 개선.
2. **실제 지도에서 확인**: 타일이 흐리거나 비는 구간, 장소 이름이 모호할 때의 위치 오류. 좌표를 사용자가 직접 고치는 화면.
3. **전통의상 늘리기·다듬기**: `COSTUME` 표에 나라 추가, `costumeSpec` 에 의상 추가. 지금 의상은 색 덩어리 수준이라 무늬·장식 보강 필요. 각 나라 의상 고증도 확인할 것.
3-1. **소품 늘리기**: `PROPS` 에 추가하고 `REACTIONS` 에 키워드 연결. 도시별 랜드마크(에펠탑, 브란덴부르크 문 등)는 장소 이름으로 직접 연결.
4. **걷는 경로**: 지금은 직선. 도로를 따라가려면 경로 API가 필요.
5. **따로 행동**: 일정에 `participants: [userId]` 를 추가하고, 빠진 사람은 이전 장소에 남겼다가 합류.
6. **영상**: iOS 사파리 mp4 확인, 배경 음악, 사진 끼워 넣기, 공유 시트.
7. **성능**: 저사양 휴대폰에서 그림자 끄기, 캔버스 해상도 낮추기 옵션.
8. 토스 미니앱(`toss-miniapp/`)에는 아직 연결하지 않았습니다.

## 권한 (2026-11-12)
- 여행 만든 사람(`isOwner`) + 트립꾸 관리자(`tripkku_beta_admins`, `isAdmin`) = `canManageTrip()` / `__tripkku.canManage()`.
  - 참여자 내보내기(만든 사람 본인은 내보낼 수 없음), 초대 버튼, 여행 정보 전체 수정, 모든 사람 캐릭터 변경.
  - 관리자 쪽 서버 권한은 `sql/2026-11-12_admin_powers.sql`(Supabase SQL Editor에서 한 번 실행)로 열림: `tripkku_admin_remove_member`, 관리자도 가능한 `tripkku_delete_trip`.
- 수익화가 들어오면 관리자는 결제·쿠폰 검사에서 제외한다.

## 최적화 (2026-11-12)
- `next/sw.js`: 진짜 서비스 워커. 화면(HTML)은 네트워크 먼저, `?v=` 붙은 파일·CDN(three, supabase, mp4-muxer)·국기는 캐시 먼저, 그 밖의 같은 출처 파일은 캐시 보여 주고 뒤에서 갱신, 지도 타일은 최대 500장. **Supabase·AI·환율·날씨는 캐시하지 않음.** 파일을 고치면 지금처럼 `?v=`만 올리면 됨. `push`/`notificationclick` 처리도 미리 들어 있음(서버 쪽은 아직 없음).
- 캐릭터 얼굴 그림은 `localStorage('tripkku-portraits-v1')`에 최대 16개 저장 → 다시 열 때 three.js(약 700KB)를 받지 않음. 처음에도 화면이 한가할 때(requestIdleCallback) 받음.
- manifest: maskable 아이콘, 바로가기(`?new=1`), 카테고리 등 스토어용 항목 추가.

## 화면 개편 "UI 2" (2026-11-12)
- 사용자가 디자인 시안(캐릭터 중심, 연한 회색빛 흰 배경 + 남색 + 코랄, 초록 제거, 제목 글꼴 Jua)을 승인해 실제 앱에 적용.
- `style.css`: 기존 초록·크림 색을 남색·차가운 흰색으로 일괄 변환했고, 파일 끝의 `UI 2` 구역이 새 화면 규칙. 색은 `--bg --card --ink --accent --sky --warm --navy` 변수(밤 모드 포함).
- 홈: 인사 + 내 캐릭터 버튼(`#heroMe`), 다가오는 여행 카드(`#nextTrip`, `renderNextTrip` — 일행 전신 그림 + 도시 대표 건물), 환율·지금 여기 타일, 아래 메뉴(`#dock`, `mountDock`). `#openNewTrip` 은 숨겨 두고 메뉴의 + 가 누른다.
- 여행 화면: 동그란 뒤로·수정 버튼, 동선 영상 카드(`#journeyCard`, `renderJourneyCard`), 날짜 칩, 지난 일정 흐리게(`.tk-past`)·지금 일정 남색 카드(`.tk-has-pieces`), 모바일에서는 탭(`#mainNav`)이 아래 메뉴, `#addEvent` 는 떠 있는 버튼. `#journeyPlay`·`#avatarEdit` 은 숨김(카드·캐릭터 얼굴이 대신 누름).
- 꾸미기 창: 위쪽 무대 + 탭(얼굴·머리·옷·전통의상·관계). 동선 창: 어두운 화면, 속도 버튼(×0.5~×2.5), 큰 저장 버튼.
- 전신·장소 그림은 `createPortraits().body()/.prop()` 으로 그리고 `localStorage`(`tripkku-bodies-v1`, `tripkku-props-v1`)에 저장.
- 시안 캔버스: https://claude.ai/artifact/TrQReT98P81SaNjbWZfvHM (소유자만 열람)

## 더 디테일하게 만들기 (2026-11-12, 결제 없이 흐름만)
- 동선 영상 창의 `data-jr="detail"` 버튼. 상태는 `detailStatus(doc)` 가 계산: `can`(전용 3D 없는 장소 있음) → 요청하면 여행 문서에 `detailRequest={by,at,places[]}` 저장 → `pending`(버튼 잠김) → 요청한 장소에 전용 3D가 모두 생기면 자동으로 `done`("디테일 영상 받기").
- 관리자 화면 맨 위 "디테일 제작 요청"에 요청자·여행·남은 장소가 뜨고 복사할 수 있다. 배지 숫자에도 포함. 만들 수 없는 장소는 `journey.js` 의 `DETAIL_SKIP` 에 이름을 넣으면 완료로 친다.
- 체험 모드와 토스판(`TRIPKKU_PLATFORM==='toss'`)에서는 버튼을 숨긴다. 가격(여행당 3,000원 예정)·결제는 아직 없음.
