# MyTwin 3D

DailyApps — 실사형 AI 3D 아바타 & 드레스업 웹앱. 빌드 없이 정적 파일로 동작합니다 (트립꾸와 같은 GitHub Pages).

## 지금 들어 있는 것

| 기능 | 위치 |
| --- | --- |
| GLB / glTF(.gltf + .bin + 텍스처 여러 파일) 불러오기 | `avatar-engine/avatar-engine.js` `loadAvatar` |
| 360° 회전 · 핀치/휠 확대 · ＋/－ 버튼 · 자동 회전 | 〃 `zoom / setAutoRotate` |
| 정면 · 측면 · 후면 카메라 전환 | 〃 `view` |
| 호환성 검사: 리깅 여부, 표준 사람형 뼈대, 동작별 뼈 매칭, 텍스처·폴리곤 크기 경고 | 〃 `inspectModel / report` |
| 리깅된 모델만 포즈·애니메이션 (뼈 이름 표기 차이 자동 맞춤, 안 맞는 동작은 비활성) | 〃 `play / loadClips` |
| 의상 교체: 입히기 전 뼈 호환 검사, 안 되면 이유 표시, 바인드 포즈 다르면 경고 | 〃 `equip / unequip / tint` |
| 0°·45°·90°·135°·180° 턴테이블 촬영 → PNG | 〃 `capture` |
| 캐릭터 저장·다시 불러오기 (원본 파일+의상+색+동작, 이 기기 IndexedDB) | `store.js` |
| 닮은꼴 캐릭터: 얼굴 사진(기기 안에서만 사용)·피부·헤어·체형·키·기본 옷 → 뼈대가 있어 포즈·의상 그대로 | `avatar-engine/twin-maker.js` `applyTwin` |

리깅 없는 GLB 는 보기·회전·촬영만 되고, 의상·포즈 탭에 "지원 안 됨"과 이유가 표시됩니다.

### 모바일 Safari

- iOS 16.4+ (import map). 파일 선택창에 `accept` 를 걸지 않음 — iOS 는 .glb 를 몰라서 걸면 파일이 회색으로 막힘. 대신 앱에서 검사.
- 4096px 넘는 텍스처·30만 삼각형 이상·150MB 이상 파일은 경고/거절 (iPhone 메모리 한계로 탭 종료 방지).
- 저장은 기기 브라우저에만. Safari 는 홈 화면에 추가하지 않으면 7일 미사용 시 지울 수 있음 → 원본 파일 보관 안내 표시.

## 실행

```
# tripkku 루트에서 아무 정적 서버로 (예: npx serve -l 8765 .)
http://localhost:8765/mytwin/                 앱
http://localhost:8765/mytwin/avatar-engine/test.html   엔진 자체 검사 (ALL PASSED 가 떠야 함)
```

얼굴 사진은 브라우저 안에서 768px JPEG 로 줄여(EXIF 제거) 머리 앞면 텍스처로만 쓰고, 저장할 때도 이 기기 IndexedDB 에만 들어갑니다. 서버는 없습니다.

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
  stage.play('walk');
  // 닮은꼴: 마네킹(Xbot)을 불러온 뒤
  // import {applyTwin} from '../mytwin/avatar-engine/twin-maker.js';
  // await applyTwin(stage, {skin: '#e9bfa5', hair: {style: 'bob', color: '#222'}, face: photoBlob});
</script>
```

번들러(toss-miniapp) 에서는 `three` 를 npm 으로 설치하면 import map 없이 그대로 동작합니다.

의상 GLB 규칙: 아바타와 같은 뼈 이름(Mixamo 표기 `mixamorig:` 유무는 상관없음)과 같은 바인드 포즈로 리깅된 SkinnedMesh.
