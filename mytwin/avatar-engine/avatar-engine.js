/**
 * MyTwin 아바타 엔진 — 앱과 무관한 독립 모듈. 트립꾸나·씽크칩에서 그대로 가져다 쓴다.
 *
 *   const stage = createAvatarStage(canvas);
 *   const report = await stage.loadAvatar(src);   src: URL | File/Blob | File[] (.gltf + .bin + 텍스처 여러 개)
 *     report = {rigged, humanoid, bones, meshes, triangles, maxTexture, clips:[{name,matched,total,ok}], warnings:[]}
 *   await stage.equip('top', src)                 호환 검사 후 아바타 뼈대에 묶는다. 안 되면 AvatarError(code) throw
 *   stage.unequip('top'); stage.tint('top'|'avatar', '#ff6699');
 *   stage.play(name) / stop(); await stage.loadClips(src, name)   동작 (뼈 이름 표기 차이는 자동으로 맞춤)
 *   stage.view('front'|'side'|'back'); stage.zoom(0.8); stage.setAutoRotate(true)
 *   await stage.capture([0,45,90,135,180])        턴테이블 PNG dataURL 배열
 *   stage.dispose();
 *
 * 'three' 와 'three/addons/' 는 import map 으로 연결한다 (mytwin/index.html 참고). 번들러 환경도 그대로 동작.
 */
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';

const AVATAR_HEIGHT = 1.7;
const MOBILE_TEXTURE_LIMIT = 4096;   // 이보다 큰 텍스처는 구형 iPhone 에서 안 보이거나 탭이 종료될 수 있다
const HUMANOID = ['hips', 'spine', 'head', 'leftarm', 'rightarm', 'leftupleg', 'rightupleg'];

export class AvatarError extends Error {
  constructor(code, message, detail) { super(message); this.code = code; this.detail = detail; }
}

/** Mixamo('mixamorig:Hips'), GLTF 정리판('mixamorigHips'), 기타 표기를 같은 키로 맞춘다. */
export const boneKey = name => String(name).replace(/^mixamorig\d*[:_]?/i, '').replace(/[^a-z0-9]/gi, '').toLowerCase();

/** 의상 SkinnedMesh 의 뼈 중 아바타에 없는 것. */
export function missingBones(skinned, targetBones) {
  const keys = new Set(targetBones.map(b => boneKey(b.name)));
  return skinned.skeleton.bones.filter(b => !keys.has(boneKey(b.name))).map(b => b.name);
}

/** 의상 SkinnedMesh 를 아바타 뼈대로 다시 묶는다. 의상 원래 bind 행렬(boneInverses)은 유지한다. */
export function rebindToSkeleton(skinned, targetBones) {
  const miss = missingBones(skinned, targetBones);
  if (miss.length) throw new AvatarError('MISSING_BONES', '아바타에 없는 뼈: ' + miss.slice(0, 5).join(', ') + (miss.length > 5 ? ` 외 ${miss.length - 5}개` : ''), miss);
  const byKey = new Map(targetBones.map(b => [boneKey(b.name), b]));
  skinned.bind(new THREE.Skeleton(skinned.skeleton.bones.map(b => byKey.get(boneKey(b.name))), skinned.skeleton.boneInverses), skinned.bindMatrix);
  return skinned;
}

/**
 * 동작 클립의 트랙이 가리키는 노드 이름을 아바타의 실제 뼈 이름으로 바꾼다(표기 차이만 맞춤, 다른 뼈대 구조는 못 맞춤).
 * 반환: 아바타에서 찾은 트랙 수 / 전체 트랙 수.
 */
export function retargetClipNames(clip, root) {
  const names = new Map();
  root.traverse(o => { if (o.name) names.set(boneKey(o.name), o.name); });
  let matched = 0;
  for (const t of clip.tracks) {
    const {nodeName} = THREE.PropertyBinding.parseTrackName(t.name);
    const real = root.getObjectByName(nodeName) ? nodeName : names.get(boneKey(nodeName));
    if (real) { matched++; if (real !== nodeName) t.name = real + t.name.slice(nodeName.length); }
  }
  return {matched, total: clip.tracks.length};
}

const baseName = s => String(s || '').split(/[\\/]/).pop().split(/[?#]/)[0];

/** URL 하나, Blob 하나, 또는 .gltf + .bin + 텍스처 파일 묶음을 불러온다. */
async function loadGltf(src) {
  if (typeof src === 'string') return new GLTFLoader().loadAsync(src);
  const files = src instanceof Blob ? [src] : [...src];
  const main = files.find(f => /\.(glb|gltf)$/i.test(f.name || '')) || (files.length === 1 ? files[0] : null);
  if (!main) throw new AvatarError('NO_MODEL', '.glb 또는 .gltf 파일을 골라주세요.');
  const urls = new Map(files.map((f, i) => [baseName(f.name) || `file${i}`, URL.createObjectURL(f)]));
  const mainUrl = urls.get(baseName(main.name) || `file${files.indexOf(main)}`);
  const missing = new Set();
  const manager = new THREE.LoadingManager();
  manager.setURLModifier(u => {
    if (u === mainUrl || /^data:/.test(u)) return u;
    const hit = urls.get(baseName(decodeURIComponent(u)));
    const name = baseName(decodeURIComponent(u));
    if (!hit && /^blob:/.test(u) && /\.[a-z0-9]{2,5}$/i.test(name)) missing.add(name);   // GLB 내장 텍스처(blob:uuid)는 제외
    return hit || u;
  });
  try { return await new GLTFLoader(manager).loadAsync(mainUrl); }
  catch (e) {
    if (missing.size) throw new AvatarError('MISSING_FILES', '.gltf 와 함께 이 파일도 골라주세요: ' + [...missing].join(', '));
    throw new AvatarError('BAD_FILE', '3D 파일을 읽지 못했어요 (' + (e?.message || e) + ')');
  } finally { for (const u of urls.values()) URL.revokeObjectURL(u); }
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

/** 모델이 무엇을 지원하는지 검사한다. */
export function inspectModel(root) {
  let meshes = 0, skinned = 0, triangles = 0, maxTexture = 0;
  const bones = new Set(), textures = new Set();
  root.traverse(o => {
    if (o.isBone) bones.add(o);
    if (!o.isMesh) return;
    meshes++;
    if (o.isSkinnedMesh) skinned++;
    const g = o.geometry; triangles += Math.round((g.index ? g.index.count : g.attributes.position.count) / 3);
    for (const m of [].concat(o.material || [])) for (const v of Object.values(m)) if (v?.isTexture) textures.add(v);
  });
  for (const t of textures) maxTexture = Math.max(maxTexture, t.image?.width || 0, t.image?.height || 0);
  const keys = new Set([...bones].map(b => boneKey(b.name)));
  const humanoid = HUMANOID.every(k => keys.has(k));
  const warnings = [];
  if (maxTexture > MOBILE_TEXTURE_LIMIT) warnings.push(`텍스처가 ${maxTexture}px 이라 모바일(특히 iPhone)에서 안 보이거나 느릴 수 있어요. 2048~4096px 권장.`);
  if (triangles > 300_000) warnings.push(`삼각형 ${triangles.toLocaleString()}개로 무거워요. 모바일에서 느릴 수 있어요.`);
  return {meshes, skinnedMeshes: skinned, rigged: skinned > 0 && bones.size > 0, humanoid, bones: bones.size, triangles, maxTexture, warnings};
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
  camera.position.set(0, 1.0, 4.4);

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
  controls.minDistance = 0.6; controls.maxDistance = 8; controls.autoRotateSpeed = 2;

  const turntable = new THREE.Group(); scene.add(turntable);   // 아바타+의상을 함께 돌리는 축 (capture)
  const clock = new THREE.Clock();
  let avatar = null, bones = [], mixer = null, action = null, disposed = false, report = null;
  const avatarInverse = new Map();                              // 아바타 뼈 → 바인드 역행렬 (의상 바인드 포즈 비교용)
  const outfits = new Map(), clips = new Map(), clipInfo = new Map();

  const tick = () => { resize(); mixer?.update(clock.getDelta()); controls.update(); renderer.render(scene, camera); };
  function resize() {
    const w = canvas.clientWidth || 1, h = canvas.clientHeight || 1;
    if (canvas.width !== Math.round(w * pixelRatio) || canvas.height !== Math.round(h * pixelRatio)) {
      renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
    }
  }
  renderer.setAnimationLoop(tick);

  function addClips(list) {
    for (const c of list) {
      const name = c.name || `동작${clips.size + 1}`;
      if (clips.has(name)) continue;
      c.name = name;
      const r = avatar ? retargetClipNames(c, avatar) : {matched: 0, total: c.tracks.length};
      clips.set(name, c);
      clipInfo.set(name, {name, ...r, ok: report?.rigged && r.matched > 0});
    }
  }

  function clearAvatar() {
    for (const slot of [...outfits.keys()]) stage.unequip(slot);
    if (avatar) { turntable.remove(avatar); disposeTree(avatar); }
    mixer?.stopAllAction(); avatar = null; bones = []; mixer = null; action = null; report = null;
    clips.clear(); clipInfo.clear(); avatarInverse.clear();
  }

  const stage = {
    THREE, scene, camera, renderer, controls,
    get avatar() { return avatar; },
    get report() { return report && {...report, clips: [...clipInfo.values()]}; },
    get clips() { return [...clipInfo.values()]; },
    get slots() { return [...outfits.keys()]; },

    async loadAvatar(src) {
      const gltf = await loadGltf(src);
      if (disposed) return;
      clearAvatar();
      avatar = gltf.scene;
      avatar.traverse(o => {
        if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; }
        if (o.isBone) bones.push(o);
        if (o.isSkinnedMesh) o.skeleton.bones.forEach((b, i) => { if (!avatarInverse.has(b)) avatarInverse.set(b, o.skeleton.boneInverses[i]); });
      });
      report = inspectModel(avatar);
      // 키를 AVATAR_HEIGHT 로, 발을 y=0, 몸 중심을 원점으로
      const box = new THREE.Box3().setFromObject(avatar), size = box.getSize(new THREE.Vector3());
      avatar.scale.setScalar(size.y > 0 ? AVATAR_HEIGHT / size.y : 1);
      box.setFromObject(avatar);
      const c = box.getCenter(new THREE.Vector3());
      avatar.position.set(-c.x, -box.min.y, -c.z);
      turntable.add(avatar);
      mixer = new THREE.AnimationMixer(avatar);
      addClips(gltf.animations);
      stage.view('front');
      return stage.report;
    },

    async equip(slot, src) {
      if (!avatar) throw new AvatarError('NO_AVATAR', '아바타를 먼저 불러오세요.');
      if (!report.rigged) throw new AvatarError('AVATAR_NOT_RIGGED', '이 아바타는 리깅(뼈대)이 없어 의상을 입힐 수 없어요.');
      const gltf = await loadGltf(src);
      const skinned = [];
      gltf.scene.traverse(o => { if (o.isSkinnedMesh) skinned.push(o); });
      try {
        if (!skinned.length) throw new AvatarError('OUTFIT_NOT_RIGGED', '이 의상 파일은 리깅되지 않아 몸에 맞출 수 없어요.');
        const miss = [...new Set(skinned.flatMap(m => missingBones(m, bones)))];
        if (miss.length) throw new AvatarError('MISSING_BONES', `뼈대가 달라 호환되지 않아요. 아바타에 없는 뼈 ${miss.length}개: ${miss.slice(0, 4).join(', ')}${miss.length > 4 ? ' …' : ''}`, miss);
      } catch (e) { disposeTree(gltf.scene); throw e; }

      const warnings = [];
      const byKey = new Map(bones.map(b => [boneKey(b.name), b]));
      let worst = 0;                       // 바인드 포즈(팔 벌린 자세·단위)가 다르면 옷이 어긋난다 → 경고만
      for (const m of skinned) m.skeleton.bones.forEach((b, i) => {
        const ref = avatarInverse.get(byKey.get(boneKey(b.name))); if (!ref) return;
        const a = ref.elements, o = m.skeleton.boneInverses[i].elements;
        for (let k = 0; k < 16; k++) worst = Math.max(worst, Math.abs(a[k] - o[k]));
      });
      if (worst > 0.05) warnings.push('의상의 기본 자세(바인드 포즈)나 단위가 아바타와 달라 옷이 어긋나 보일 수 있어요.');

      const group = new THREE.Group(); group.name = 'outfit:' + slot;
      for (const m of skinned) { rebindToSkeleton(m, bones); m.castShadow = true; m.frustumCulled = false; group.add(m); }
      stage.unequip(slot);
      avatar.add(group);
      outfits.set(slot, group);
      disposeTree(gltf.scene);             // 옷을 빼낸 나머지(원래 뼈대·빈 노드) 정리
      addClips(gltf.animations);
      return {meshes: skinned.length, warnings};
    },

    unequip(slot) {
      const g = outfits.get(slot); if (!g) return;
      g.parent?.remove(g); disposeTree(g); outfits.delete(slot);
    },

    /** slot(의상) 또는 'avatar'(본체) 재질 색을 바꾼다. 텍스처에 곱해진다. */
    tint(slot, color) {
      const target = slot === 'avatar' ? avatar : outfits.get(slot), skip = new Set(outfits.values());
      const walk = o => { if (o !== target && skip.has(o)) return; for (const m of [].concat(o.material || [])) m.color?.set(color); o.children.forEach(walk); };
      if (target) walk(target);
    },

    /** 동작만 담긴 GLB 에서 클립을 가져온다. name 을 주면 클립 이름을 바꾼다(여러 개면 name2, name3…). */
    async loadClips(src, name) {
      if (!report?.rigged) throw new AvatarError('AVATAR_NOT_RIGGED', '리깅된 아바타에서만 동작을 쓸 수 있어요.');
      const g = await loadGltf(src);
      disposeTree(g.scene);
      if (!g.animations.length) throw new AvatarError('NO_CLIPS', '이 파일에는 동작(애니메이션)이 없어요.');
      if (name) g.animations.forEach((c, i) => { c.name = i ? name + (i + 1) : name; });
      const before = clipInfo.size; addClips(g.animations);
      const added = [...clipInfo.values()].slice(before);
      if (added.length && added.every(c => !c.ok)) throw new AvatarError('CLIP_MISMATCH', '동작의 뼈 이름이 아바타와 달라 적용할 수 없어요.');
      return added;
    },

    play(name, {fade = 0.3, loop = true} = {}) {
      const info = clipInfo.get(name); if (!info?.ok || !mixer) return false;
      const next = mixer.clipAction(clips.get(name));
      next.reset().setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, Infinity);
      next.clampWhenFinished = !loop;
      if (action && action !== next) action.crossFadeTo(next, fade, false);
      next.play(); action = next; return true;
    },
    stop() { mixer?.stopAllAction(); action = null; },

    /** 카메라를 정면·측면·후면으로. 지금 거리(확대 정도)는 유지한다. */
    view(name = 'front') {
      const d = camera.position.distanceTo(controls.target) || 4.4;
      const dir = {front: [0, 0.03, 1], side: [1, 0.03, 0], back: [0, 0.03, -1]}[name] || [0, 0.03, 1];
      camera.position.copy(controls.target).addScaledVector(new THREE.Vector3(...dir).normalize(), d);
      controls.update();
    },
    /** factor < 1 이면 가까이, > 1 이면 멀리. */
    zoom(factor) {
      const off = camera.position.clone().sub(controls.target);
      off.setLength(THREE.MathUtils.clamp(off.length() * factor, controls.minDistance, controls.maxDistance));
      camera.position.copy(controls.target).add(off); controls.update();
    },
    setAutoRotate(on) { controls.autoRotate = !!on; },

    /** 정면 카메라에서 아바타를 각도별로 돌려 PNG dataURL 로 찍는다. 카메라·회전 상태는 원래대로 돌려놓는다. */
    async capture(angles = [0, 45, 90, 135, 180], {width = 512, height = 768} = {}) {
      const saved = {pos: camera.position.clone(), tgt: controls.target.clone(), auto: controls.autoRotate, aspect: camera.aspect};
      const size = renderer.getSize(new THREE.Vector2());
      controls.autoRotate = false;
      renderer.setAnimationLoop(null);
      renderer.setSize(width, height, false);
      camera.aspect = width / height; camera.position.set(0, 0.95, 4.6); controls.target.set(0, 0.88, 0);
      camera.lookAt(controls.target); camera.updateProjectionMatrix();
      const out = [];
      try {
        for (const a of angles) {
          turntable.rotation.y = THREE.MathUtils.degToRad(-a);   // 0°=정면, 90°=옆모습, 180°=뒷모습
          renderer.render(scene, camera);
          out.push(canvas.toDataURL('image/png'));
        }
      } finally {
        turntable.rotation.y = 0;
        renderer.setSize(size.x, size.y, false);
        camera.position.copy(saved.pos); controls.target.copy(saved.tgt); camera.aspect = saved.aspect; camera.updateProjectionMatrix();
        controls.autoRotate = saved.auto;
        renderer.setAnimationLoop(tick);
      }
      return out;
    },

    dispose() {
      disposed = true; renderer.setAnimationLoop(null); clearAvatar(); controls.dispose();
      disposeTree(scene); renderer.dispose();
    },
  };
  return stage;
}
