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

1. `buildTimeline(mode)` — `day`(선택한 하루) 또는 `trip`(출발 → 모든 일정 → 집 도착 → 마지막 장면). 일정마다 `reactionFor` 가 키워드로 소품·행동·말풍선을 고릅니다(크리스마스 마켓 → 트리 + 환호, 성 → 성 + 사진 포즈).
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
