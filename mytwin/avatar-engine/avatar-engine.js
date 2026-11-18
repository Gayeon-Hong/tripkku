/**
 * MyTwin 아바타 엔진 — 앱과 무관한 독립 모듈. 트립꾸나·씽크칩에서 그대로 가져다 쓴다.
 *
 *   const stage = createAvatarStage(canvas);
 *   await stage.loadAvatar(url | File);          리깅된 GLB 아바타 (발이 바닥, 키 ~1.7m 로 맞춤)
 *   await stage.equip('top', url | File);        같은 뼈대 이름을 쓰는 의상 GLB 를 아바타 뼈대에 붙인다
 *   stage.unequip('top'); stage.tint('top', '#ff6699');
 *   stage.play('walking'); stage.clips            애니메이션/포즈 (아바타·의상 GLB 안의 클립 + addClips)
 *   stage.setAutoRotate(true); stage.setYaw(90);
 *   await stage.capture([0,45,90,135,180])       턴테이블 PNG dataURL 배열
 *   stage.dispose();
 *
 * 'three' 와 'three/addons/' 는 import map 으로 연결한다 (index.html 참고). 번들러 환경(toss-miniapp)도 그대로 동작.
 */
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';

const AVATAR_HEIGHT = 1.7;

/** Mixamo('mixamorig:Hips'), GLTF 정리판('mixamorigHips'), Meshy 등 서로 다른 뼈 이름을 같은 키로 맞춘다. */
export const boneKey = name => String(name).replace(/^mixamorig[:_]?/i, '').replace(/[^a-z0-9]/gi, '').toLowerCase();

/**
 * 의상 SkinnedMesh 를 아바타 뼈대로 다시 묶는다. 의상 원래 bind 행렬(boneInverses)은 유지해서
 * 의상이 아바타와 같은 바인드 포즈로 만들어졌다면 그대로 맞는다. 없는 뼈가 있으면 이름을 담아 throw.
 */
export function rebindToSkeleton(skinned, targetBones) {
  const byKey = new Map(targetBones.map(b => [boneKey(b.name), b]));
  const missing = [];
  const bones = skinned.skeleton.bones.map(b => byKey.get(boneKey(b.name)) || (missing.push(b.name), null));
  if (missing.length) throw new Error('아바타에 없는 뼈: ' + missing.slice(0, 5).join(', ') + (missing.length > 5 ? ` 외 ${missing.length - 5}개` : ''));
  skinned.bind(new THREE.Skeleton(bones, skinned.skeleton.boneInverses), skinned.bindMatrix);
  return skinned;
}

const toUrl = src => src instanceof Blob ? {url: URL.createObjectURL(src), revoke: true} : {url: src, revoke: false};

async function loadGltf(loader, src) {
  const {url, revoke} = toUrl(src);
  try { return await loader.loadAsync(url); } finally { if (revoke) URL.revokeObjectURL(url); }
}

function disposeTree(obj) {
  obj.traverse(o => {
    o.geometry?.dispose();
    for (const m of [].concat(o.material || [])) {
      for (const v of Object.values(m)) if (v?.isTexture) v.dispose();
      m.dispose();
    }
  });
}

export function createAvatarStage(canvas, {background = null, shadows = true, pixelRatio = Math.min(devicePixelRatio, 2)} = {}) {
  const renderer = new THREE.WebGLRenderer({canvas, antialias: true, alpha: background == null, preserveDrawingBuffer: true});
  renderer.setPixelRatio(pixelRatio);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = shadows;

  const scene = new THREE.Scene();
  if (background != null) scene.background = new THREE.Color(background);
  const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 50);
  camera.position.set(0, 1.1, 4.2);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x8a8f99, 1.6));
  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.position.set(2, 4, 3); key.castShadow = shadows; key.shadow.mapSize.set(1024, 1024);
  Object.assign(key.shadow.camera, {left: -1.5, right: 1.5, top: 2.5, bottom: -0.5});
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xffffff, 1.0); rim.position.set(-3, 2, -3); scene.add(rim);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(1.2, 48), new THREE.ShadowMaterial({opacity: 0.25}));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);

  const controls = new OrbitControls(camera, canvas);
  controls.target.set(0, 0.9, 0); controls.enableDamping = true; controls.enablePan = false;
  controls.minDistance = 1.2; controls.maxDistance = 8; controls.autoRotateSpeed = 2;

  const loader = new GLTFLoader();
  const turntable = new THREE.Group(); scene.add(turntable);   // 아바타+의상을 함께 돌리는 축 (setYaw/capture)
  const clock = new THREE.Clock();
  let avatar = null, bones = [], mixer = null, action = null, disposed = false;
  const outfits = new Map(), clips = new Map();

  function resize() {
    const w = canvas.clientWidth || 1, h = canvas.clientHeight || 1;
    if (canvas.width !== Math.round(w * pixelRatio) || canvas.height !== Math.round(h * pixelRatio)) {
      renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
    }
  }
  renderer.setAnimationLoop(() => {
    resize(); mixer?.update(clock.getDelta()); controls.update(); renderer.render(scene, camera);
  });

  const addClips = list => { for (const c of list) if (!clips.has(c.name)) clips.set(c.name || `clip${clips.size + 1}`, c); };

  function clearAvatar() {
    for (const slot of [...outfits.keys()]) stage.unequip(slot);
    if (avatar) { turntable.remove(avatar); disposeTree(avatar); }
    mixer?.stopAllAction(); avatar = null; bones = []; mixer = null; action = null; clips.clear();
  }

  const stage = {
    THREE, scene, camera, renderer, controls,
    get avatar() { return avatar; },
    get clips() { return [...clips.keys()]; },
    get slots() { return [...outfits.keys()]; },

    async loadAvatar(src) {
      const gltf = await loadGltf(loader, src);
      if (disposed) return;
      clearAvatar();
      avatar = gltf.scene;
      avatar.traverse(o => { if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; } if (o.isBone) bones.push(o); });
      // 키를 AVATAR_HEIGHT 로, 발을 y=0, 몸 중심을 원점으로
      const box = new THREE.Box3().setFromObject(avatar), size = box.getSize(new THREE.Vector3());
      const s = size.y > 0 ? AVATAR_HEIGHT / size.y : 1;
      avatar.scale.setScalar(s);
      box.setFromObject(avatar);
      const c = box.getCenter(new THREE.Vector3());
      avatar.position.set(-c.x, -box.min.y, -c.z);
      turntable.add(avatar);
      mixer = new THREE.AnimationMixer(avatar);
      addClips(gltf.animations);
      return {bones: bones.length, clips: stage.clips};
    },

    async equip(slot, src) {
      if (!avatar) throw new Error('아바타를 먼저 불러오세요.');
      const gltf = await loadGltf(loader, src);
      const skinned = [];
      gltf.scene.traverse(o => { if (o.isSkinnedMesh) skinned.push(o); });
      if (!skinned.length) throw new Error('의상 GLB 에 리깅된(SkinnedMesh) 옷이 없습니다.');
      const group = new THREE.Group(); group.name = 'outfit:' + slot;
      for (const m of skinned) {
        rebindToSkeleton(m, bones);
        m.castShadow = true; m.frustumCulled = false;
        group.add(m);                      // 뼈가 월드 위치를 정하므로 부모 위치는 무관
      }
      stage.unequip(slot);
      avatar.add(group);
      outfits.set(slot, group);
      disposeTree(gltf.scene);             // 옷을 빼낸 나머지(원래 뼈대·빈 노드)는 정리
      addClips(gltf.animations);
      return skinned.length;
    },

    unequip(slot) {
      const g = outfits.get(slot); if (!g) return;
      g.parent?.remove(g); disposeTree(g); outfits.delete(slot);
    },

    /** slot 이름(의상) 또는 'avatar'(본체) 의 모든 재질 색을 바꾼다. 텍스처는 유지되고 곱해진다. */
    tint(slot, color) {
      const target = slot === 'avatar' ? avatar : outfits.get(slot);
      target?.traverse(o => { for (const m of [].concat(o.material || [])) m.color?.set(color); });
    },

    addClips(list) { addClips(list); return stage.clips; },
    /** 동작만 담긴 GLB 에서 클립을 가져온다. name 을 주면 클립 이름을 그걸로 바꾼다(여러 개면 name2, name3…). */
    async loadClips(src, name) {
      const g = await loadGltf(loader, src);
      if (name) g.animations.forEach((c, i) => { c.name = i ? name + (i + 1) : name; });
      addClips(g.animations); disposeTree(g.scene); return stage.clips;
    },

    play(name, {fade = 0.3, loop = true} = {}) {
      const clip = clips.get(name); if (!clip || !mixer) return false;
      const next = mixer.clipAction(clip);
      next.reset().setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, Infinity);
      next.clampWhenFinished = !loop;
      if (action && action !== next) action.crossFadeTo(next, fade, false);
      next.play(); action = next; return true;
    },
    stop() { mixer?.stopAllAction(); action = null; },

    setAutoRotate(on) { controls.autoRotate = !!on; },
    setYaw(deg) { turntable.rotation.y = THREE.MathUtils.degToRad(deg); },

    /** 정면 카메라에서 아바타를 각도별로 돌려 PNG dataURL 로 찍는다. 카메라·회전 상태는 원래대로 돌려놓는다. */
    async capture(angles = [0, 45, 90, 135, 180], {width = 512, height = 768} = {}) {
      const saved = {pos: camera.position.clone(), tgt: controls.target.clone(), yaw: turntable.rotation.y, auto: controls.autoRotate, aspect: camera.aspect};
      const size = renderer.getSize(new THREE.Vector2());
      controls.autoRotate = false;
      renderer.setAnimationLoop(null);
      renderer.setSize(width, height, false);
      camera.aspect = width / height; camera.position.set(0, 0.95, 4.6); controls.target.set(0, 0.88, 0);
      camera.lookAt(controls.target); camera.updateProjectionMatrix();
      const out = [];
      for (const a of angles) {
        stage.setYaw(-a);                  // 0°=정면, 90°=오른쪽 옆모습, 180°=뒷모습
        renderer.render(scene, camera);
        out.push(canvas.toDataURL('image/png'));
      }
      renderer.setSize(size.x, size.y, false);
      camera.position.copy(saved.pos); controls.target.copy(saved.tgt); camera.aspect = saved.aspect; camera.updateProjectionMatrix();
      turntable.rotation.y = saved.yaw; controls.autoRotate = saved.auto;
      renderer.setAnimationLoop(() => { resize(); mixer?.update(clock.getDelta()); controls.update(); renderer.render(scene, camera); });
      return out;
    },

    dispose() {
      disposed = true; renderer.setAnimationLoop(null); clearAvatar(); controls.dispose();
      disposeTree(scene); renderer.dispose();
    },
  };
  return stage;
}
