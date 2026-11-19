import {createAvatarStage} from './avatar-engine/avatar-engine.js';
import {applyTwin, pickColors} from './avatar-engine/twin-maker.js';
import {pack, unpack, listCharacters, getCharacter, putCharacter, deleteCharacter, askPersist} from './store.js';

// 닮은꼴 캐릭터의 바탕 마네킹 (Mixamo 뼈대, 동작 7개 포함)
const SAMPLE = 'https://raw.githubusercontent.com/mrdoob/three.js/r170/examples/models/gltf/Xbot.glb';
const MAX_MB = 150;   // 모바일 Safari 는 메모리가 작아 큰 파일에서 탭이 종료된다

const $ = s => document.querySelector(s);
const el = (tag, props = {}, ...kids) => { const e = Object.assign(document.createElement(tag), props); e.append(...kids); return e; };
const stage = createAvatarStage($('#stage'));
const say = msg => { $('#status').textContent = msg; };
const fail = e => { console.error(e); say('⚠ ' + (e?.message || e)); };

/** 지금 화면 상태(저장용). src 는 URL 또는 File 묶음. */
let current = {avatar: null, label: '', outfits: {}, avatarTint: null, clipFiles: [], clip: null};

/* ---------- 탭 · 카메라 ---------- */
for (const b of document.querySelectorAll('[data-tab]')) b.onclick = () => {
  for (const x of document.querySelectorAll('[data-tab]')) x.setAttribute('aria-selected', x === b);
  for (const p of document.querySelectorAll('[data-panel]')) p.hidden = p.dataset.panel !== b.dataset.tab;
};
const viewButtons = [...document.querySelectorAll('button[data-view]')];
for (const b of viewButtons) b.onclick = () => { stage.view(b.dataset.view); for (const x of viewButtons) x.setAttribute('aria-pressed', x === b); };
for (const b of document.querySelectorAll('[data-zoom]')) b.onclick = () => stage.zoom(+b.dataset.zoom);

const pickFiles = input => { const f = [...input.files]; input.value = ''; return f; };
function checkSize(files) {
  const mb = files.reduce((s, f) => s + f.size, 0) / 1048576;
  if (mb > MAX_MB) throw new Error(`파일이 ${mb.toFixed(0)}MB 예요. 모바일에서는 ${MAX_MB}MB 이하로 줄여주세요.`);
}

/* ---------- 캐릭터 불러오기 + 호환성 표시 ---------- */
async function showAvatar(src, label) {
  say(label + ' 불러오는 중…');
  const r = await stage.loadAvatar(src);
  current = {avatar: src, label, outfits: {}, avatarTint: null, clipFiles: [], clip: null};
  renderReport(); renderClips(); renderWorn();
  const idle = r.clips.find(c => c.ok && /idle/i.test(c.name)); if (idle) playClip(idle.name);
  say(label + ' · 드래그로 회전, 두 손가락으로 확대');
  return r;
}

function renderReport() {
  const r = stage.report; if (!r) return $('#report').replaceChildren();
  const okClips = r.clips.filter(c => c.ok).length;
  const badge = (yes, text) => el('li', {className: yes ? 'yes' : 'no', textContent: (yes ? '✓ ' : '✕ ') + text});
  const row = (k, v) => [el('dt', {textContent: k}), el('dd', {textContent: v})];
  $('#report').replaceChildren(
    el('h3', {textContent: current.label}, el('small', {textContent: 'Avatar Result'})),
    el('ul', {className: 'pills'}, badge(true, '360° 보기'),
      badge(r.rigged, r.rigged ? '리깅' : '리깅 없음'),
      badge(r.rigged && okClips > 0, '포즈·동작'),
      badge(r.rigged, '의상 교체' + (r.rigged && !r.humanoid ? ' (전용 뼈대)' : ''))),
    el('dl', {className: 'spec'},
      ...row('포맷', 'GLB / glTF' + (r.rigged ? ' (리깅 포함)' : '')),
      ...row('뼈대', r.rigged ? `뼈 ${r.bones}개 · ${r.humanoid ? '사람형 표준(Mixamo 호환)' : '전용 뼈대'}` : '없음'),
      ...row('동작', r.rigged ? `${okClips}개 사용 가능` + (r.clips.length > okClips ? ` · ${r.clips.length - okClips}개 호환 안 됨` : '') : '지원 안 됨'),
      ...row('모델', `메시 ${r.meshes}개 · 삼각형 ${r.triangles.toLocaleString()}개`),
      ...row('텍스처', r.maxTexture ? `최대 ${r.maxTexture}px` : '없음 / 단색')),
    ...(!r.rigged ? [el('p', {textContent: '이 모델은 뼈대(리깅)가 없어 보기·회전·촬영만 돼요. 포즈·의상을 쓰려면 Mixamo 등에서 리깅한 GLB를 불러오세요.'})] : []),
    ...(r.rigged && !r.humanoid ? [el('p', {textContent: '사람형 표준 뼈대(Mixamo 호환)가 아니라서, 같은 뼈대로 만든 의상·동작만 맞아요.'})] : []),
    ...r.warnings.map(w => el('p', {textContent: '⚠ ' + w})));
  const off = !r.rigged;
  $('#dressNote').hidden = $('#poseNote').hidden = !off;
  $('#dressNote').textContent = '지원 안 됨: 이 캐릭터는 리깅이 없어 의상을 몸에 맞출 수 없어요.';
  $('#poseNote').textContent = '지원 안 됨: 이 캐릭터는 리깅이 없어 포즈·애니메이션을 쓸 수 없어요.';
  $('#dressTools').hidden = $('#poseTools').hidden = off;
}

/* ---------- 닮은꼴 만들기 (사진은 이 기기 안에서만) ---------- */
let faceBlob = null;
const form = $('#maker');
function readTwin() {
  const f = new FormData(form), v = k => f.get(k);
  return {skin: v('skin'), body: v('body'), height: +v('height'), face: faceBlob,
    hair: {style: v('hair'), color: v('hairColor')}, top: {style: v('top'), color: v('topColor')},
    bottom: {style: v('bottom'), color: v('bottomColor')}, shoes: {style: v('shoes'), color: v('shoesColor')}};
}
function writeTwin(t) {
  const set = (k, val) => { const x = form.elements[k]; if (x && val != null) x.value = val; };
  set('skin', t.skin); set('body', t.body); set('height', t.height);
  for (const s of ['hair', 'top', 'bottom', 'shoes']) { set(s, t[s]?.style); set(s + 'Color', t[s]?.color); }
  faceBlob = t.face || null; showFace();
  $('#heightOut').textContent = t.height + 'cm';
}
function showFace() {
  const box = $('.face');
  if (box.dataset.url) URL.revokeObjectURL(box.dataset.url);
  box.dataset.url = faceBlob ? URL.createObjectURL(faceBlob) : '';
  box.style.backgroundImage = faceBlob ? `url(${box.dataset.url})` : '';
  box.classList.toggle('filled', !!faceBlob);
}
let building = null, pending = false;
async function rebuild() {
  if (building) { pending = true; return; }     // 슬라이더를 빠르게 움직여도 한 번에 하나씩
  building = (async () => {
    if (!current.twin) await showAvatar(SAMPLE, '내 캐릭터');   // 다른 GLB 를 보고 있었다면 마네킹으로
    const t = readTwin();
    await applyTwin(stage, t);
    current.twin = t; renderWorn();
  })();
  try { await building; say('내 캐릭터 · 드래그로 회전, 두 손가락으로 확대'); } catch (e) { fail(e); }
  finally { building = null; if (pending) { pending = false; rebuild(); } }
}
form.oninput = e => {
  if (e.target.name === 'height') $('#heightOut').textContent = e.target.value + 'cm';
  if (e.target.id !== 'facePhoto') rebuild();
};
form.onsubmit = e => e.preventDefault();
$('#facePhoto').onchange = async e => {
  const f = e.target.files[0]; e.target.value = ''; if (!f) return;
  try {
    faceBlob = await (await fetch(await shrink(f, 768))).blob();   // 줄이면서 EXIF(위치 등)도 지운다
    showFace();
    const c = await pickColors(faceBlob);
    form.elements.skin.value = c.skin; form.elements.hairColor.value = c.hair;
    say('사진에서 피부·머리색을 골랐어요. 마음에 안 들면 직접 바꿔주세요.');
    rebuild();
  } catch (err) { fail(err); }
};

/** 긴 변 max px JPEG dataURL 로 줄인다. */
async function shrink(file, max = 1024) {
  if (!file.type.startsWith('image/')) throw new Error('사진 파일만 넣을 수 있어요.');
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = el('canvas', {width: Math.round(bmp.width * k), height: Math.round(bmp.height * k)});
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height); bmp.close?.();
  return c.toDataURL('image/jpeg', 0.88);
}

$('#openModel').onchange = e => {
  const files = pickFiles(e.target); if (!files.length) return;
  try { checkSize(files); } catch (err) { return fail(err); }
  const main = files.find(f => /\.(glb|gltf)$/i.test(f.name)) || files[0];
  showAvatar(files, main.name.replace(/\.(glb|gltf)$/i, '')).catch(fail);
};

/* ---------- 의상 ---------- */
const SLOT_LABEL = {top: '상의', bottom: '하의', shoes: '신발', acc: '소품', hair: '헤어', face: '얼굴'};
const slotValue = () => $('input[name=slot]:checked').value;
const renderWorn = () => $('#worn').replaceChildren(...stage.slots.map(s => el('li', {textContent: SLOT_LABEL[s] || s})));
async function wear(slot, src, tint) {
  const r = await stage.equip(slot, src);
  current.outfits[slot] = {src, tint: tint || null};
  if (tint) stage.tint(slot, tint);
  renderWorn(); renderClips();
  return r;
}
$('#outfitFile').onchange = async e => {
  const files = pickFiles(e.target); if (!files.length) return;
  const slot = slotValue();
  try {
    checkSize(files); say('의상 호환성 검사 중…');
    const r = await wear(slot, files);
    say(`${SLOT_LABEL[slot]} 착용 ✓` + (r.warnings.length ? ' · ⚠ ' + r.warnings.join(' ') : ''));
  } catch (err) { fail(err); }
};
$('#unequip').onclick = () => { const s = slotValue(); stage.unequip(s); delete current.outfits[s]; renderWorn(); };
$('#tint').oninput = e => {
  if ($('#tintTarget').value === 'avatar') { stage.tint('avatar', e.target.value); current.avatarTint = e.target.value; }
  else { const s = slotValue(); stage.tint(s, e.target.value); if (current.outfits[s]) current.outfits[s].tint = e.target.value; }
};

/* ---------- 포즈 ---------- */
function playClip(name) {
  if (!stage.play(name, {loop: !/pose/i.test(name)})) return;
  current.clip = name;
  for (const x of $('#clips').children) x.setAttribute('aria-pressed', x.dataset.name === name);
}
function renderClips() {
  const list = stage.clips;
  $('#clips').replaceChildren(...list.map(c => {
    const b = el('button', {textContent: c.name, disabled: !c.ok, title: c.ok ? '' : '이 동작의 뼈 이름이 캐릭터와 맞지 않아요'});
    b.dataset.name = c.name; b.setAttribute('aria-pressed', c.name === current.clip);
    b.onclick = () => playClip(c.name);
    return b;
  }));
  if (stage.report?.rigged && !list.length) $('#clips').textContent = '이 캐릭터에는 동작이 없어요. Mixamo 등에서 받은 동작 GLB를 추가해 보세요.';
}
$('#stopClip').onclick = () => { stage.stop(); current.clip = null; renderClips(); };
$('#clipFile').onchange = async e => {
  const files = pickFiles(e.target); if (!files.length) return;
  try {
    checkSize(files);
    const added = await stage.loadClips(files);
    current.clipFiles.push({files}); renderClips();
    const bad = added.filter(c => !c.ok).length;
    say(`동작 ${added.length - bad}개 추가` + (bad ? ` · ${bad}개는 뼈대가 달라 사용 불가` : ''));
  } catch (err) { fail(err); }
};

/* ---------- 촬영 ---------- */
$('#autoRotate').onchange = e => stage.setAutoRotate(e.target.checked);
$('#capture').onclick = async () => {
  if (!stage.avatar) return say('캐릭터를 먼저 불러오세요.');
  const angles = [0, 45, 90, 135, 180];
  const shots = await stage.capture(angles);
  $('#shots').replaceChildren(...shots.map((src, i) => el('figure', {},
    el('a', {href: src, download: `mytwin_${angles[i]}.png`}, el('img', {src, alt: `${angles[i]}도`})),
    el('figcaption', {textContent: angles[i] + '°'}))));
  say('사진을 누르면 저장돼요. (iPhone: 길게 눌러 "사진에 저장")');
};

/* ---------- 저장 · 다시 불러오기 ---------- */
async function renderSaved() {
  let list;
  try { list = await listCharacters(); } catch (e) { $('#saved').replaceChildren(el('li', {textContent: e.message})); return; }
  $('#saved').replaceChildren(...list.map(c => {
    const load = el('button', {textContent: '불러오기'}), del = el('button', {textContent: '삭제'});
    load.onclick = () => restore(c.id).catch(fail);
    // 확인창 대신 두 번 눌러 삭제 (임베드/아티팩트에서는 confirm() 이 막힘)
    del.onclick = async () => {
      if (del.dataset.armed) { await deleteCharacter(c.id); say(`'${c.name}' 삭제했어요.`); return renderSaved(); }
      del.dataset.armed = '1'; del.textContent = '한 번 더 누르면 삭제';
      setTimeout(() => { delete del.dataset.armed; del.textContent = '삭제'; }, 4000);
    };
    return el('li', {}, el('img', {src: c.thumb, alt: ''}),
      el('div', {className: 'meta'}, el('b', {textContent: c.name}), el('span', {textContent: new Date(c.savedAt).toLocaleString()})), load, del);
  }));
  if (!list.length) $('#saved').replaceChildren(el('li', {className: 'empty', textContent: '아직 저장한 캐릭터가 없어요. 캐릭터를 꾸민 뒤 "지금 모습 저장"을 눌러보세요.'}));
}

$('#save').onclick = async () => {
  if (!current.avatar) return say('캐릭터를 먼저 불러오세요.');
  const name = $('#saveName').value.trim() || current.label || '내 캐릭터';
  try {
    const [thumb] = await stage.capture([0], {width: 160, height: 240});
    await putCharacter({
      id: crypto.randomUUID?.() || String(Date.now()), name, savedAt: Date.now(), thumb,
      avatar: pack(current.avatar), avatarTint: current.avatarTint, clip: current.clip, twin: current.twin || null,
      outfits: Object.fromEntries(Object.entries(current.outfits).map(([s, o]) => [s, {src: pack(o.src), tint: o.tint}])),
      clipFiles: current.clipFiles.map(c => ({src: pack(c.files), name: c.name || null})),
    });
    askPersist();
    $('#saveName').value = ''; say(`'${name}' 저장했어요.`); renderSaved();
  } catch (e) { fail(e); }
};

async function restore(id) {
  const c = await getCharacter(id); if (!c) throw new Error('저장한 캐릭터를 찾을 수 없어요.');
  await showAvatar(unpack(c.avatar), c.name);
  if (c.twin) { writeTwin(c.twin); await applyTwin(stage, c.twin); current.twin = c.twin; renderWorn(); }
  if (c.avatarTint) { stage.tint('avatar', c.avatarTint); current.avatarTint = c.avatarTint; }
  const problems = [];
  for (const cf of c.clipFiles || []) {
    try { const files = unpack(cf.src); await stage.loadClips(files, cf.name || undefined); current.clipFiles.push({files, name: cf.name}); } catch (e) { problems.push('동작: ' + e.message); }
  }
  for (const [slot, o] of Object.entries(c.outfits || {})) {
    try { await wear(slot, unpack(o.src), o.tint); } catch (e) { problems.push(`${SLOT_LABEL[slot] || slot}: ${e.message}`); }
  }
  renderClips();
  if (c.clip) playClip(c.clip);
  say(`'${c.name}' 불러왔어요.` + (problems.length ? ' ⚠ ' + problems.join(' / ') : ''));
}

/* ---------- 시작: 기본 닮은꼴 캐릭터 ---------- */
renderSaved();
rebuild();
