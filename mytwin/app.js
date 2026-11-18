import {createAvatarStage} from './avatar-engine/avatar-engine.js';
import {pack, unpack, listCharacters, getCharacter, putCharacter, deleteCharacter, askPersist} from './store.js';

// 트립꾸(next/)와 같은 공개 값 → 같은 도메인에서 로그인 세션을 그대로 쓴다. 비밀 키는 절대 여기 두지 않는다.
const CONFIG = {url: 'https://aachvbbblwycutggzdpp.supabase.co', publishable: 'sb_publishable_VeMIoHqNqCTnxZSMCqLHVg_FLQTW6Pq'};
const SAMPLE = 'https://raw.githubusercontent.com/mrdoob/three.js/r170/examples/models/gltf/Xbot.glb';
const FN = 'mytwin-avatar';
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
for (const b of document.querySelectorAll('[data-view]')) if (b.tagName === 'BUTTON') b.onclick = () => stage.view(b.dataset.view);
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
  $('#report').replaceChildren(
    el('ul', {}, badge(true, '360° 보기'),
      badge(r.rigged, r.rigged ? `리깅 (뼈 ${r.bones}개)` : '리깅 없음'),
      badge(r.rigged, '포즈·애니메이션' + (r.rigged ? ` (동작 ${okClips}개)` : '')),
      badge(r.rigged, '의상 교체' + (r.rigged && !r.humanoid ? ' (비표준 뼈대)' : ''))),
    el('p', {textContent: `메시 ${r.meshes}개 · 삼각형 ${r.triangles.toLocaleString()}개 · 최대 텍스처 ${r.maxTexture || '-'}px`}),
    ...(!r.rigged ? [el('p', {textContent: '이 모델은 뼈대(리깅)가 없어 보기·회전·촬영만 돼요. 포즈·의상을 쓰려면 Mixamo 등에서 리깅한 GLB를 불러오세요.'})] : []),
    ...(r.rigged && !r.humanoid ? [el('p', {textContent: '사람형 표준 뼈대(Mixamo 호환)가 아니라서, 같은 뼈대로 만든 의상·동작만 맞아요.'})] : []),
    ...r.warnings.map(w => el('p', {textContent: '⚠ ' + w})));
  const off = !r.rigged;
  $('#dressNote').hidden = $('#poseNote').hidden = !off;
  $('#dressNote').textContent = '지원 안 됨: 이 캐릭터는 리깅이 없어 의상을 몸에 맞출 수 없어요.';
  $('#poseNote').textContent = '지원 안 됨: 이 캐릭터는 리깅이 없어 포즈·애니메이션을 쓸 수 없어요.';
  $('#dressTools').hidden = $('#poseTools').hidden = off;
}

$('#sample').onclick = () => showAvatar(SAMPLE, '기본 아바타').catch(fail);
$('#openModel').onchange = e => {
  const files = pickFiles(e.target); if (!files.length) return;
  try { checkSize(files); } catch (err) { return fail(err); }
  const main = files.find(f => /\.(glb|gltf)$/i.test(f.name)) || files[0];
  showAvatar(files, main.name.replace(/\.(glb|gltf)$/i, '')).catch(fail);
};

/* ---------- 의상 ---------- */
const SLOT_LABEL = {top: '상의', bottom: '하의', shoes: '신발', acc: '액세서리'};
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
  const slot = $('#slot').value;
  try {
    checkSize(files); say('의상 호환성 검사 중…');
    const r = await wear(slot, files);
    say(`${SLOT_LABEL[slot]} 착용 ✓` + (r.warnings.length ? ' · ⚠ ' + r.warnings.join(' ') : ''));
  } catch (err) { fail(err); }
};
$('#unequip').onclick = () => { const s = $('#slot').value; stage.unequip(s); delete current.outfits[s]; renderWorn(); };
$('#tint').oninput = e => {
  if ($('#tintTarget').value === 'avatar') { stage.tint('avatar', e.target.value); current.avatarTint = e.target.value; }
  else { const s = $('#slot').value; stage.tint(s, e.target.value); if (current.outfits[s]) current.outfits[s].tint = e.target.value; }
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
    del.onclick = async () => { if (confirm(`'${c.name}' 을(를) 이 기기에서 지울까요? 되돌릴 수 없어요.`)) { await deleteCharacter(c.id); renderSaved(); } };
    return el('li', {}, el('img', {src: c.thumb, alt: ''}),
      el('div', {className: 'meta'}, el('b', {textContent: c.name}), el('span', {textContent: new Date(c.savedAt).toLocaleString()})), load, del);
  }));
  if (!list.length) $('#saved').replaceChildren(el('li', {className: 'small', textContent: '아직 저장한 캐릭터가 없어요.'}));
}

$('#save').onclick = async () => {
  if (!current.avatar) return say('캐릭터를 먼저 불러오세요.');
  const name = $('#saveName').value.trim() || current.label || '내 캐릭터';
  try {
    const [thumb] = await stage.capture([0], {width: 160, height: 240});
    await putCharacter({
      id: crypto.randomUUID?.() || String(Date.now()), name, savedAt: Date.now(), thumb,
      avatar: pack(current.avatar), avatarTint: current.avatarTint, clip: current.clip,
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

/* ---------- 사진 3장 → 3D (서버: supabase/functions/mytwin-avatar) ---------- */
let client;
const supa = async () => client ||= (await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.8/+esm'))
  .createClient(CONFIG.url, CONFIG.publishable, {auth: {persistSession: true, autoRefreshToken: true}});
const picked = new Map();
const updateGenerate = () => { $('#generate').disabled = picked.size < 3 || !$('#consent').checked; };
for (const input of document.querySelectorAll('.photo input')) input.onchange = async () => {
  const f = input.files[0]; if (!f) return;
  try {
    const data = await shrink(f);
    picked.set(input.dataset.view, data);
    input.parentElement.style.backgroundImage = `url(${data})`;
    input.parentElement.classList.add('filled');
  } catch (e) { fail(e); }
  updateGenerate();
};
$('#consent').onchange = updateGenerate;

/** 긴 변 1024px JPEG 로 줄인다: 전송량(서버 한도 ~2MB)을 줄이고 EXIF(위치 등)도 지운다. */
async function shrink(file, max = 1024) {
  if (!file.type.startsWith('image/')) throw new Error('사진 파일만 올릴 수 있어요.');
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = el('canvas', {width: Math.round(bmp.width * k), height: Math.round(bmp.height * k)});
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height); bmp.close?.();
  return c.toDataURL('image/jpeg', 0.88);
}
async function call(body) {
  const {data, error} = await (await supa()).functions.invoke(FN, {body});
  if (error) { let msg = error.message; try { msg = (await error.context.json()).error || msg; } catch {} throw new Error(msg); }
  return data;
}
const wait = ms => new Promise(r => setTimeout(r, ms));
async function poll(kind, id, label) {
  for (let i = 0; i < 240; i++) {               // 최대 약 20분
    const s = await call({action: 'status', kind, id});
    if (s.status === 'SUCCEEDED') return s;
    if (s.status === 'FAILED' || s.status === 'CANCELED') throw new Error(`${label} 실패: ${s.error || s.status}`);
    say(`${label} ${s.progress || 0}%…`); await wait(5000);
  }
  throw new Error(label + ' 시간이 너무 오래 걸려요. 잠시 뒤 다시 시도해 주세요.');
}
$('#generate').onclick = async () => {
  $('#generate').disabled = true;
  try {
    const {data: {session}} = await (await supa()).auth.getSession();
    if (!session) throw new Error('트립꾸에 먼저 로그인해 주세요. (같은 브라우저에서 /next/ 로그인)');
    say('사진 보내는 중…');
    const created = await call({action: 'create', images: ['정면', '측면', '후면'].map(v => picked.get(v))});
    await poll('multi', created.result, '3D 모델 만드는 중');
    const rig = await call({action: 'rig', id: created.result, heightMeters: 1.7});
    const done = await poll('rig', rig.result, '뼈대 심는 중');
    const glb = new File([await call({action: 'download', url: done.glb})], 'mytwin.glb', {type: 'model/gltf-binary'});
    await showAvatar([glb], '내 아바타');
    for (const [name, url] of [['walking', done.walking], ['running', done.running]]) {
      if (!url) continue;
      try {
        const f = [new File([await call({action: 'download', url})], name + '.glb', {type: 'model/gltf-binary'})];
        await stage.loadClips(f, name); current.clipFiles.push({files: f, name});
      } catch (e) { console.warn(name, e); }
    }
    renderClips();
    say('내 아바타 완성! 저장 버튼으로 이 기기에 보관하세요.');
  } catch (e) { fail(e); }
  finally { updateGenerate(); }
};

/* ---------- 시작 ---------- */
renderSaved();
showAvatar(SAMPLE, '기본 아바타').catch(fail);
