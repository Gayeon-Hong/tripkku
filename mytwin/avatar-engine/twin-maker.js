/**
 * 닮은꼴 캐릭터 만들기 — 기본 마네킹(Mixamo 뼈대 Xbot)에 체형·피부·헤어·얼굴 사진·기본 옷을 입힌다.
 * 사진은 이 기기 안에서 텍스처로만 쓰고 어디에도 보내지 않는다.
 *
 *   await stage.loadAvatar(XBOT);           // 마네킹을 먼저 불러온다
 *   applyTwin(stage, params);                // 바꿀 때마다 다시 부르면 된다
 *   params = {skin:'#e8b9a0', body:'slim'|'normal'|'chubby', height:165,
 *             hair:{style:'short'|'bob'|'long'|'bun'|'none', color}, face: Blob|null,
 *             top:{style:'tee'|'long'|'none', color}, bottom:{style:'pants'|'shorts'|'none', color}, shoes:{style:'shoes'|'none', color}}
 *
 * 옷은 몸 메시에서 해당 부위 삼각형만 떼어 살짝 부풀린 SkinnedMesh 라 같은 뼈대로 포즈·동작을 그대로 따라간다.
 */
import * as THREE from 'three';
import {boneKey} from './avatar-engine.js';

export const DEFAULT_TWIN = {
  skin: '#e9bfa5', body: 'normal', height: 165, face: null,
  hair: {style: 'short', color: '#2b211c'},
  top: {style: 'tee', color: '#f4f1ea'}, bottom: {style: 'pants', color: '#3b4a63'}, shoes: {style: 'shoes', color: '#ffffff'},
};

const ARM = /^(left|right)arm$/, FORE = /^(left|right)forearm$/, UPLEG = /^(left|right)upleg$/, LEG = /^(left|right)leg$/;
const FOOT = /^(left|right)(foot|toebase|toeend)$/, TORSO = /^(spine\d*|(left|right)shoulder)$/;
const PART = {
  tee: k => TORSO.test(k) || ARM.test(k),
  long: k => TORSO.test(k) || ARM.test(k) || FORE.test(k),
  pants: k => k === 'hips' || UPLEG.test(k) || LEG.test(k),
  shorts: k => k === 'hips' || UPLEG.test(k),
  shoes: k => FOOT.test(k),
};
const OFFSET = {top: 0.012, bottom: 0.016, shoes: 0.02};   // 옷 두께(m). 하의가 상의 밑단 위로 오게 더 두껍게
const SHAPE = {slim: {torso: -0.01, leg: -0.006, arm: -0.004}, normal: {torso: 0, leg: 0, arm: 0}, chubby: {torso: 0.03, leg: 0.018, arm: 0.01}};

const bodies = stage => {
  const out = [], skip = new Set(stage.slots.map(s => stage.avatar.getObjectByName('outfit:' + s)));
  const walk = o => { if (skip.has(o)) return; if (o.isSkinnedMesh) out.push(o); o.children.forEach(walk); };
  walk(stage.avatar); return out;
};

/** 정점마다 가장 크게 영향을 주는 뼈의 키. */
function dominant(mesh) {
  const si = mesh.geometry.attributes.skinIndex, sw = mesh.geometry.attributes.skinWeight;
  const keys = mesh.skeleton.bones.map(b => boneKey(b.name));
  return Array.from({length: si.count}, (_, i) => {
    let best = 0; for (let j = 1; j < 4; j++) if (sw.getComponent(i, j) > sw.getComponent(i, best)) best = j;
    return keys[si.getComponent(i, best)];
  });
}

/** 체형: 원래 정점 위치를 법선 방향으로 밀거나 당긴다(바인드 공간이라 리깅은 그대로). */
function shapeBody(mesh, dom, shape) {
  const pos = mesh.geometry.attributes.position, nrm = mesh.geometry.attributes.normal;
  const orig = mesh.geometry.userData.orig ||= pos.array.slice();
  const s = SHAPE[shape] || SHAPE.normal;
  for (let i = 0; i < pos.count; i++) {
    const k = dom[i];
    const d = TORSO.test(k) || k === 'hips' ? s.torso : UPLEG.test(k) || LEG.test(k) ? s.leg : ARM.test(k) || FORE.test(k) ? s.arm : 0;
    for (let a = 0; a < 3; a++) pos.array[i * 3 + a] = orig[i * 3 + a] + nrm.array[i * 3 + a] * d;
  }
  pos.needsUpdate = true;
}

/** 몸 메시에서 고른 부위의 삼각형만 복사해 옷 SkinnedMesh 를 만든다. */
function garment(mesh, dom, pick, offset, color) {
  const g = mesh.geometry, idx = g.index ? g.index.array : [...Array(g.attributes.position.count).keys()];
  const keep = [];
  for (let t = 0; t < idx.length; t += 3) {
    const a = idx[t], b = idx[t + 1], c = idx[t + 2];
    if ((pick(dom[a]) + pick(dom[b]) + pick(dom[c])) >= 2) keep.push(a, b, c);   // 3개 중 2개 이상이면 그 부위
  }
  if (!keep.length) return null;
  const geo = new THREE.BufferGeometry();
  for (const name of ['position', 'normal', 'uv', 'skinIndex', 'skinWeight']) if (g.attributes[name]) geo.setAttribute(name, g.attributes[name].clone());
  const pos = geo.attributes.position, nrm = geo.attributes.normal;
  for (let i = 0; i < pos.count; i++) for (let a = 0; a < 3; a++) pos.array[i * 3 + a] += nrm.array[i * 3 + a] * offset;
  geo.setIndex(keep);
  const m = new THREE.SkinnedMesh(geo, new THREE.MeshStandardMaterial({color, roughness: 0.85}));
  m.bind(mesh.skeleton, mesh.bindMatrix);
  m.castShadow = true; m.frustumCulled = false;
  return m;
}

/** 머리 정점들의 범위 (메시 원래 좌표 = 바인드 자세). */
function headBox(mesh, dom) {
  const box = new THREE.Box3(), v = new THREE.Vector3(), pos = mesh.geometry.attributes.position;
  for (let i = 0; i < dom.length; i++) if (dom[i] === 'head' || dom[i] === 'headtopend') box.expandByPoint(v.fromBufferAttribute(pos, i));
  return box;
}

const part = (geo, color, opts = {}) => new THREE.Mesh(geo, new THREE.MeshStandardMaterial({color, roughness: 0.75, side: THREE.DoubleSide, ...opts}));

/** 헤어: 단위 구 조각들을 머리 크기에 맞춘다. 앞쪽은 +z(정면). */
function hairMesh(style, color) {
  const g = new THREE.Group(), S = THREE.SphereGeometry, P = Math.PI;
  g.add(part(new S(1, 32, 16, 0, 2 * P, 0, 0.36 * P), color));                       // 정수리~이마선
  const back = {short: 0.6, bob: 0.78, long: 0.7, bun: 0.6}[style];
  g.add(part(new S(1, 32, 16, P * 0.92, P * 1.16, 0, back * P), color));             // 옆·뒤 (얼굴 쪽은 비움)
  if (style === 'long') {
    const c = part(new THREE.CylinderGeometry(0.95, 1.15, 1.6, 32, 1, true, P * 0.55, P * 0.9), color);
    c.position.y = -0.95; g.add(c);
  }
  if (style === 'bun') { const b = part(new S(0.42, 20, 12), color); b.position.set(0, 0.85, -0.55); g.add(b); }
  return g;
}

const faceCache = new WeakMap();
/** 얼굴 사진 → 가운데 정사각형, 가장자리를 투명하게 흐린 텍스처. */
async function faceTexture(blob) {
  if (faceCache.has(blob)) return faceCache.get(blob);
  const bmp = await createImageBitmap(blob);
  const n = 512, side = Math.min(bmp.width, bmp.height);
  const c = Object.assign(document.createElement('canvas'), {width: n, height: n}), x = c.getContext('2d');
  x.drawImage(bmp, (bmp.width - side) / 2, (bmp.height - side) / 2, side, side, 0, 0, n, n); bmp.close?.();
  x.globalCompositeOperation = 'destination-in';
  const r = x.createRadialGradient(n / 2, n / 2, n * 0.3, n / 2, n / 2, n * 0.5);
  r.addColorStop(0, '#000'); r.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = r; x.fillRect(0, 0, n, n);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  faceCache.set(blob, tex); return tex;
}

/** 사진에서 피부색(가운데)·머리색(위쪽 띠)을 대충 뽑는다. */
export async function pickColors(blob) {
  const bmp = await createImageBitmap(blob), n = 64, side = Math.min(bmp.width, bmp.height);
  const c = Object.assign(document.createElement('canvas'), {width: n, height: n}), x = c.getContext('2d', {willReadFrequently: true});
  x.drawImage(bmp, (bmp.width - side) / 2, (bmp.height - side) / 2, side, side, 0, 0, n, n); bmp.close?.();
  const avg = (x0, y0, w, h) => {
    const d = x.getImageData(x0, y0, w, h).data, s = [0, 0, 0];
    for (let i = 0; i < d.length; i += 4) for (let k = 0; k < 3; k++) s[k] += d[i + k];
    return '#' + s.map(v => Math.round(v / (d.length / 4)).toString(16).padStart(2, '0')).join('');
  };
  return {skin: avg(n * 0.35, n * 0.45, n * 0.3, n * 0.2), hair: avg(n * 0.3, n * 0.02, n * 0.4, n * 0.08)};
}

export async function applyTwin(stage, params) {
  const p = {...DEFAULT_TWIN, ...params};
  const avatar = stage.avatar; if (!avatar) throw new Error('마네킹을 먼저 불러오세요.');
  const meshes = bodies(stage); if (!meshes.length) throw new Error('뼈대가 있는 마네킹이 필요해요.');
  const doms = meshes.map(dominant);

  // 키: 엔진이 맞춘 1.7m 기준 배율에 곱하고 발을 다시 바닥에
  avatar.userData.baseScale ??= avatar.scale.x;
  avatar.scale.setScalar(avatar.userData.baseScale * p.height / 170);
  avatar.position.y = 0; avatar.updateMatrixWorld(true);

  meshes.forEach((m, i) => { shapeBody(m, doms[i], p.body); for (const mat of [].concat(m.material)) mat.color.set(p.skin), mat.metalness = 0; });

  for (const slot of ['top', 'bottom', 'shoes']) {
    const {style, color} = p[slot] || {}; stage.unequip(slot);
    if (!PART[style]) continue;
    const g = new THREE.Group();
    meshes.forEach((m, i) => { const o = garment(m, doms[i], PART[style], OFFSET[slot], color); if (o) g.add(o); });
    stage.attach(slot, g);
  }

  // 헤어·얼굴: 메시 원래 좌표로 머리 크기를 재고, 머리 뼈의 바인드 역행렬로 뼈 기준 위치로 바꿔 붙인다.
  // (skeleton.pose() 는 Armature 배율을 무시해 쓰지 않는다. 재생 중인 동작도 멈출 필요 없음)
  stage.unequip('hair'); stage.unequip('face');
  const surface = meshes.reduce((a, m, i) => m.geometry.attributes.position.count > meshes[a].geometry.attributes.position.count ? i : a, 0);
  const body = meshes[surface], sk = body.skeleton, hi = sk.bones.findIndex(b => boneKey(b.name) === 'head');
  if (hi < 0) return;
  const toBone = sk.boneInverses[hi].clone().multiply(body.bindMatrix);
  const box = headBox(body, doms[surface]);
  const center = box.getCenter(new THREE.Vector3()), size = box.getSize(new THREE.Vector3()).multiplyScalar(0.5);
  const place = (slot, obj, k) => {
    obj.matrix.compose(center, new THREE.Quaternion(), size.clone().multiplyScalar(k)).premultiply(toBone);
    obj.matrix.decompose(obj.position, obj.quaternion, obj.scale);
    stage.attach(slot, obj, sk.bones[hi], false);
  };
  if (p.hair?.style && p.hair.style !== 'none') place('hair', hairMesh(p.hair.style, p.hair.color), 1.1);
  if (p.face) {
    const f = part(new THREE.SphereGeometry(1, 32, 16, Math.PI * 0.18, Math.PI * 0.64, Math.PI * 0.2, Math.PI * 0.55), '#ffffff',
      {map: await faceTexture(p.face), transparent: true, roughness: 0.9, side: THREE.FrontSide});
    place('face', f, 1.04);
  }
}
