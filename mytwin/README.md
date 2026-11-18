# MyTwin 3D

DailyApps — 실사형 AI 3D 아바타 & 드레스업 웹앱. 빌드 없이 정적 파일로 동작합니다 (트립꾸와 같은 GitHub Pages).

## P0 (지금 들어 있는 것)

| 기능 | 위치 |
| --- | --- |
| GLB 아바타 보기 · 360° 회전/확대 · 자동 회전 | `avatar-engine/avatar-engine.js` |
| 의상 GLB 입히기/벗기기 · 색 바꾸기 (뼈 이름으로 아바타 뼈대에 다시 묶음) | 〃 `equip / unequip / tint` |
| 포즈·동작 재생, 동작 GLB 추가 | 〃 `play / loadClips` |
| 0°·45°·90°·135°·180° 턴테이블 촬영 → PNG 저장 | 〃 `capture` |
| 사진 3장 → Meshy 3D 생성 → 리깅 → 바로 불러오기 | `app.js` + `supabase/functions/mytwin-avatar` |

## 실행

```
# tripkku 루트에서 아무 정적 서버로 (예: npx serve -l 8765 .)
http://localhost:8765/mytwin/                 앱
http://localhost:8765/mytwin/avatar-engine/test.html   엔진 자체 검사 (ALL PASSED 가 떠야 함)
```

사진→3D 를 쓰려면 한 번만:
1. Supabase Edge Function Secrets 에 `MESHY_API_KEY` 등록
2. `supabase functions deploy mytwin-avatar`
3. 같은 브라우저에서 트립꾸(`/next/`)에 로그인 (세션을 같이 씀)

사진은 서버에 저장하지 않고, 브라우저에서 1024px JPEG 로 줄여(EXIF 제거) Meshy 로만 보냅니다.

## 다른 앱(트립꾸·씽크칩)에서 쓰기

`avatar-engine/` 폴더만 복사하거나 상대 경로로 import 합니다. 앱 코드에 의존하지 않습니다.

```html
<script type="importmap">{"imports":{
  "three":"https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.min.js",
  "three/addons/":"https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/"}}</script>
<script type="module">
  import {createAvatarStage} from '../mytwin/avatar-engine/avatar-engine.js';
  const stage = createAvatarStage(document.querySelector('canvas'));
  await stage.loadAvatar('my-avatar.glb');
  stage.play('walking');
</script>
```

번들러(toss-miniapp) 에서는 `three` 를 npm 으로 설치하면 import map 없이 그대로 동작합니다.

의상 GLB 규칙: 아바타와 같은 뼈 이름(Mixamo 표기 `mixamorig:` 유무는 상관없음)과 같은 바인드 포즈로 리깅된 SkinnedMesh.
