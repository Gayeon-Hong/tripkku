/**
 * 닮은꼴 캐릭터 만들기 — 기본 마네킹(Mixamo 뼈대 Xbot)에 체형·피부·헤어·얼굴 사진·기본 옷을 입힌다.
 * 사진은 이 기기 안에서 텍스처로만 쓰고 어디에도 보내지 않는다.
 *
 *   await stage.loadAvatar(XBOT);           // 마네킹을 먼저 불러온다
 *   applyTwin(stage, params);                // 바꿀 때마다 다시 부르면 된다
 *   params = {skin:'#e8b9a0', body:'slim'|'normal'|'chubby', height:165,
 *             hair:{style:'short'|'bob'|'long'|'bun'|'none', color}, face: Blob|null, faceScan: scanFace(face) 결과(face-scan.js),
 *             top:{style:'tee'|'long'|'none', color}, bottom:{style:'pants'|'shorts'|'none', color}, shoes:{style:'shoes'|'none', color}}
 *
 * 옷은 몸 메시에서 해당 부위 삼각형만 떼어 살짝 부풀린 SkinnedMesh 라 같은 뼈대로 포즈·동작을 그대로 따라간다.
 */
import * as THREE from 'three';
import {boneKey} from './avatar-engine.js';

export const DEFAULT_TWIN = {
  skin: '#e9bfa5', body: 'normal', height: 165, face: null, faceScan: null,
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
/** 얼굴 사진 전체를 텍스처로 (UV 는 얼굴 점의 사진 좌표). */
async function faceTexture(blob) {
  if (faceCache.has(blob)) return faceCache.get(blob);
  const bmp = await createImageBitmap(blob);
  const c = Object.assign(document.createElement('canvas'), {width: bmp.width, height: bmp.height});
  c.getContext('2d').drawImage(bmp, 0, 0); bmp.close?.();
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  faceCache.set(blob, tex); return tex;
}

/** 2D 들로네 삼각분할 (Bowyer–Watson, 점 수백 개용). 반환: 꼭짓점 인덱스 평면 배열. */
export function delaunay(P) {
  const n = P.length, xs = P.map(p => p[0]), ys = P.map(p => p[1]);
  const minX = Math.min(...xs), minY = Math.min(...ys), d = Math.max(Math.max(...xs) - minX, Math.max(...ys) - minY) * 20;
  const V = [...P, [minX - d, minY - d], [minX + 2 * d, minY - d], [minX - d, minY + 2 * d]];
  const circ = (a, b, c) => {
    const [ax, ay] = V[a], [bx, by] = V[b], [cx, cy] = V[c], D = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));
    const ux = ((ax * ax + ay * ay) * (by - cy) + (bx * bx + by * by) * (cy - ay) + (cx * cx + cy * cy) * (ay - by)) / D;
    const uy = ((ax * ax + ay * ay) * (cx - bx) + (bx * bx + by * by) * (ax - cx) + (cx * cx + cy * cy) * (bx - ax)) / D;
    return {v: [a, b, c], x: ux, y: uy, r: (ax - ux) ** 2 + (ay - uy) ** 2};
  };
  let tris = [circ(n, n + 1, n + 2)];
  for (let i = 0; i < n; i++) {
    const [px, py] = V[i], edges = new Map(), keep = [];
    for (const t of tris) {
      if ((px - t.x) ** 2 + (py - t.y) ** 2 < t.r) {
        for (const [a, b] of [[t.v[0], t.v[1]], [t.v[1], t.v[2]], [t.v[2], t.v[0]]]) {
          const k = a < b ? a + ',' + b : b + ',' + a;
          edges.has(k) ? edges.delete(k) : edges.set(k, [a, b]);   // 두 번 나오면 안쪽 변
        }
      } else keep.push(t);
    }
    for (const [a, b] of edges.values()) keep.push(circ(a, b, i));
    tris = keep;
  }
  return tris.filter(t => t.v.every(v => v < n)).flatMap(t => t.v);
}

/** 3x3 연립방정식 (크래머). */
const solve3 = (A, b) => {
  const det = m => m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
  const D = det(A) || 1;
  return [0, 1, 2].map(c => det(A.map((r, i) => r.map((v, j) => j === c ? b[i] : v))) / D);
};

/**
 * 스캔한 얼굴 점들로 머리 앞면에 감기는 3D 얼굴 메시를 만든다(메시 원래 좌표).
 * 얼굴 전체의 큰 곡률은 머리 타원체 곡률로 바꾸고, 코·눈두덩·입술 같은 세부 굴곡만 남겨 얹는다 → 옆에서 봐도 머리와 이어진다.
 */
export function faceGeometry(scan, center, half) {
  const pts = scan.points.map(([x, y, z]) => [(x - 0.5) * scan.aspect, -(y - 0.5), -z * scan.aspect]);
  const L = i => pts[i], cheekL = L(234), cheekR = L(454), top = L(10), chin = L(152);
  const cx = (cheekL[0] + cheekR[0]) / 2, cy = (top[1] + chin[1]) / 2, w = Math.abs(cheekR[0] - cheekL[0]);
  // 얼굴 전체 굴곡 z ≈ a + b·x² + c·y² 를 맞춘 뒤, 그 나머지(세부)만 쓴다
  const A = [[0, 0, 0], [0, 0, 0], [0, 0, 0]], B = [0, 0, 0];
  for (const [x, y, z] of pts) {
    const r = [1, (x - cx) ** 2, (y - cy) ** 2];
    for (let i = 0; i < 3; i++) { B[i] += r[i] * z; for (let j = 0; j < 3; j++) A[i][j] += r[i] * r[j]; }
  }
  const [a, b, c] = solve3(A, B);
  const k = (half.x * 2 * 0.86) / w;                       // 볼 너비 = 머리 너비의 86%
  const pos = [], uv = [];
  for (let i = 0; i < pts.length; i++) {
    const [x, y, z] = pts[i];
    const dx = (x - cx) * k, dy = (y - cy) * k - half.y * 0.12;   // 얼굴은 머리 중심보다 살짝 아래
    const s = 1 - (dx / half.x) ** 2 - (dy / half.y) ** 2;
    const surf = half.z * 1.02 * Math.sqrt(Math.max(0, s));
    const detail = (z - (a + b * (x - cx) ** 2 + c * (y - cy) ** 2)) * k;
    pos.push(center.x + dx, center.y + dy, center.z + surf + Math.max(detail, -half.z * 0.08) + half.z * 0.015);
    uv.push(scan.points[i][0], 1 - scan.points[i][1]);
  }
  // 삼각분할 후, 얼굴 밖으로 길게 걸친 가장자리 삼각형은 뺀다
  let idx = delaunay(pts.map(p => [p[0], p[1]]));
  const far = (p, q) => Math.hypot(pts[p][0] - pts[q][0], pts[p][1] - pts[q][1]) > w * 0.22;
  const kept = [];
  for (let t = 0; t < idx.length; t += 3) if (!far(idx[t], idx[t + 1]) && !far(idx[t + 1], idx[t + 2]) && !far(idx[t + 2], idx[t])) kept.push(idx[t], idx[t + 1], idx[t + 2]);
  idx = kept;
  // 가장자리(삼각형 하나에만 쓰인 변) 정점은 투명, 그 이웃은 반투명 → 피부와 자연스럽게 이어짐
  const count = new Map(), add = (p, q) => { const key = p < q ? p + ',' + q : q + ',' + p; count.set(key, (count.get(key) || 0) + 1); };
  for (let t = 0; t < idx.length; t += 3) { add(idx[t], idx[t + 1]); add(idx[t + 1], idx[t + 2]); add(idx[t + 2], idx[t]); }
  const alpha = new Float32Array(pts.length).fill(1), edge = new Set();
  for (const [key, n] of count) if (n === 1) for (const v of key.split(',')) edge.add(+v);
  for (let t = 0; t < idx.length; t += 3) {
    const tri = [idx[t], idx[t + 1], idx[t + 2]];
    if (tri.some(v => edge.has(v))) for (const v of tri) alpha[v] = Math.min(alpha[v], 0.55);
  }
  for (const v of edge) alpha[v] = 0;
  const color = new Float32Array(pts.length * 4);
  for (let i = 0; i < pts.length; i++) color.set([1, 1, 1, alpha[i]], i * 4);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setAttribute('color', new THREE.BufferAttribute(color, 4));
  // 모든 삼각형이 정면(+z)을 보도록 감기 방향(반시계) 통일
  for (let t = 0; t < idx.length; t += 3) {
    const [p, q, r] = [idx[t], idx[t + 1], idx[t + 2]].map(v => pts[v]);
    if ((q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]) < 0) [idx[t + 1], idx[t + 2]] = [idx[t + 2], idx[t + 1]];
  }
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

/** 사진에서 피부색(양 볼)·머리색(이마 위)을 뽑는다. scan 이 있으면 얼굴 점 기준, 없으면 사진 가운데·위쪽. */
export async function pickColors(blob, scan) {
  const bmp = await createImageBitmap(blob), W = 160, H = Math.max(1, Math.round(W * bmp.height / bmp.width));
  const c = Object.assign(document.createElement('canvas'), {width: W, height: H}), x = c.getContext('2d', {willReadFrequently: true});
  x.drawImage(bmp, 0, 0, W, H); bmp.close?.();
  const avg = (...boxes) => {   // 0~1 좌표 상자들 [x, y, w, h] 평균
    const s = [0, 0, 0]; let n = 0;
    for (const [bx, by, bw, bh] of boxes) {
      const d = x.getImageData(Math.max(0, Math.round(bx * W)), Math.max(0, Math.round(by * H)), Math.max(1, Math.round(bw * W)), Math.max(1, Math.round(bh * H))).data;
      for (let i = 0; i < d.length; i += 4) { for (let k = 0; k < 3; k++) s[k] += d[i + k]; n++; }
    }
    return '#' + s.map(v => Math.round(v / n).toString(16).padStart(2, '0')).join('');
  };
  if (!scan) return {skin: avg([0.4, 0.45, 0.2, 0.1]), hair: avg([0.35, 0.02, 0.3, 0.06])};
  const P = i => scan.points[i], fw = Math.abs(P(454)[0] - P(234)[0]), fh = Math.abs(P(152)[1] - P(10)[1]);
  const at = (i, dy = 0) => [P(i)[0] - fw * 0.05, P(i)[1] + dy - fh * 0.03, fw * 0.1, fh * 0.06];
  return {skin: avg(at(205), at(425)), hair: avg(at(10, -fh * 0.12))};   // 205·425: 양 볼 가운데
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
  if (p.face && p.faceScan) {
    const f = new THREE.Mesh(faceGeometry(p.faceScan, center, size), new THREE.MeshStandardMaterial({
      map: await faceTexture(p.face), vertexColors: true, transparent: true, roughness: 0.9}));
    f.matrix.copy(toBone); f.matrix.decompose(f.position, f.quaternion, f.scale);   // 얼굴 좌표는 이미 메시 좌표
    stage.attach('face', f, sk.bones[hi], false);
  }
}
