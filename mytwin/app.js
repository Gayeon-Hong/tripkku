import {createAvatarStage} from './avatar-engine/avatar-engine.js';
import {createClient} from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.8/+esm';

// 트립꾸(next/)와 같은 공개 값 → 같은 도메인에서 로그인 세션을 그대로 쓴다. 비밀 키는 절대 여기 두지 않는다.
const CONFIG = {url: 'https://aachvbbblwycutggzdpp.supabase.co', publishable: 'sb_publishable_VeMIoHqNqCTnxZSMCqLHVg_FLQTW6Pq'};
const SAMPLE = 'https://raw.githubusercontent.com/mrdoob/three.js/r170/examples/models/gltf/Xbot.glb';
const FN = 'mytwin-avatar';

const $ = s => document.querySelector(s);
const stage = createAvatarStage($('#stage'));
const say = msg => { $('#status').textContent = msg; };
const fail = e => { console.error(e); say('⚠ ' + (e?.message || e)); };
let client;
const supa = () => client ||= createClient(CONFIG.url, CONFIG.publishable, {auth: {persistSession: true, autoRefreshToken: true}});

/* ---------- 탭 ---------- */
for (const b of document.querySelectorAll('[data-tab]')) b.onclick = () => {
  for (const x of document.querySelectorAll('[data-tab]')) x.setAttribute('aria-selected', x === b);
  for (const p of document.querySelectorAll('[data-panel]')) p.hidden = p.dataset.panel !== b.dataset.tab;
};

/* ---------- 아바타 불러오기 ---------- */
async function showAvatar(src, label) {
  say(label + ' 불러오는 중…');
  const info = await stage.loadAvatar(src);
  renderClips(); renderWorn();
  const idle = info.clips.find(n => /idle/i.test(n)); if (idle) stage.play(idle);
  say(`${label} · 뼈 ${info.bones}개 · 동작 ${info.clips.length}개`);
}
$('#sample').onclick = () => showAvatar(SAMPLE, '기본 아바타').catch(fail);
$('#openGlb').onchange = e => { const f = e.target.files[0]; if (f) showAvatar(f, f.name).catch(fail); e.target.value = ''; };

/* ---------- 의상 ---------- */
const SLOT_LABEL = {top: '상의', bottom: '하의', shoes: '신발', acc: '액세서리'};
function renderWorn() {
  $('#worn').replaceChildren(...stage.slots.map(s => Object.assign(document.createElement('li'), {textContent: SLOT_LABEL[s] || s})));
}
$('#outfitGlb').onchange = async e => {
  const f = e.target.files[0]; e.target.value = ''; if (!f) return;
  const slot = $('#slot').value;
  try { say('의상 입히는 중…'); const n = await stage.equip(slot, f); renderWorn(); renderClips(); say(`${SLOT_LABEL[slot]} 착용 (${n}개 메시)`); }
  catch (err) { fail(err); }
};
$('#unequip').onclick = () => { stage.unequip($('#slot').value); renderWorn(); };
$('#tint').oninput = e => stage.tint($('#tintTarget').value === 'avatar' ? 'avatar' : $('#slot').value, e.target.value);

/* ---------- 포즈 ---------- */
function renderClips() {
  $('#clips').replaceChildren(...stage.clips.map(name => {
    const b = Object.assign(document.createElement('button'), {textContent: name});
    b.setAttribute('aria-pressed', 'false');
    b.onclick = () => {
      stage.play(name, {loop: !/pose/i.test(name)});
      for (const x of $('#clips').children) x.setAttribute('aria-pressed', x === b);
    };
    return b;
  }));
  if (!stage.clips.length) $('#clips').textContent = '이 아바타에는 동작이 없어요. 동작 GLB를 추가해 보세요.';
}
$('#stopClip').onclick = () => { stage.stop(); for (const x of $('#clips').children) x.setAttribute?.('aria-pressed', 'false'); };
$('#clipGlb').onchange = async e => {
  const f = e.target.files[0]; e.target.value = ''; if (!f) return;
  try { await stage.loadClips(f); renderClips(); say('동작을 추가했어요.'); } catch (err) { fail(err); }
};

/* ---------- 촬영 ---------- */
$('#autoRotate').onchange = e => stage.setAutoRotate(e.target.checked);
$('#capture').onclick = async () => {
  if (!stage.avatar) return say('아바타를 먼저 불러오세요.');
  const angles = [0, 45, 90, 135, 180];
  const shots = await stage.capture(angles);
  $('#shots').replaceChildren(...shots.map((src, i) => {
    const fig = document.createElement('figure');
    const a = Object.assign(document.createElement('a'), {href: src, download: `mytwin_${angles[i]}.png`});
    a.append(Object.assign(document.createElement('img'), {src, alt: `${angles[i]}도`}));
    fig.append(a, Object.assign(document.createElement('figcaption'), {textContent: angles[i] + '°'}));
    return fig;
  }));
  say('사진을 누르면 저장돼요.');
};

/* ---------- 사진 3장 → 3D (서버: supabase/functions/mytwin-avatar) ---------- */
const photos = [...document.querySelectorAll('.photo input')];
const picked = new Map();
const updateGenerate = () => { $('#generate').disabled = picked.size < 3 || !$('#consent').checked; };
for (const input of photos) input.onchange = async () => {
  const f = input.files[0]; if (!f) return;
  try {
    const data = await shrink(f);
    picked.set(input.dataset.view, data);
    Object.assign(input.parentElement.style, {backgroundImage: `url(${data})`});
    input.parentElement.classList.add('filled');
  } catch (e) { fail(e); }
  updateGenerate();
};
$('#consent').onchange = updateGenerate;

/** 긴 변 1024px JPEG 로 줄인다: 전송량(서버 한도 ~2MB)과 개인정보 노출을 줄이고 EXIF(위치 등)도 지운다. */
async function shrink(file, max = 1024) {
  if (!file.type.startsWith('image/')) throw new Error('사진 파일만 올릴 수 있어요.');
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = Object.assign(document.createElement('canvas'), {width: Math.round(bmp.width * k), height: Math.round(bmp.height * k)});
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height); bmp.close();
  return c.toDataURL('image/jpeg', 0.88);
}

async function call(body) {
  const {data, error} = await supa().functions.invoke(FN, {body});
  if (error) {
    let msg = error.message;
    try { msg = (await error.context.json()).error || msg; } catch {}
    throw new Error(msg);
  }
  return data;
}
const wait = ms => new Promise(r => setTimeout(r, ms));
async function poll(kind, id, label) {
  for (let i = 0; i < 240; i++) {               // 최대 약 20분
    const s = await call({action: 'status', kind, id});
    if (s.status === 'SUCCEEDED') return s;
    if (s.status === 'FAILED' || s.status === 'CANCELED') throw new Error(`${label} 실패: ${s.error || s.status}`);
    say(`${label} ${s.progress || 0}%…`);
    await wait(5000);
  }
  throw new Error(label + ' 시간이 너무 오래 걸려요. 잠시 뒤 다시 시도해 주세요.');
}

$('#generate').onclick = async () => {
  const btn = $('#generate'); btn.disabled = true;
  try {
    const {data: {session}} = await supa().auth.getSession();
    if (!session) throw new Error('트립꾸에 먼저 로그인해 주세요. (같은 브라우저에서 /next/ 로그인)');
    say('사진 보내는 중…');
    const created = await call({action: 'create', images: ['정면', '측면', '후면'].map(v => picked.get(v))});
    const modelId = created.result;
    await poll('multi', modelId, '3D 모델 만드는 중');
    const rig = await call({action: 'rig', id: modelId, heightMeters: 1.7});
    const done = await poll('rig', rig.result, '뼈대 심는 중');
    const glb = await call({action: 'download', url: done.glb});
    await showAvatar(glb, '내 아바타');
    for (const [name, url] of [['walking', done.walking], ['running', done.running]]) {
      if (!url) continue;
      try { await stage.loadClips(await call({action: 'download', url}), name); renderClips(); } catch (e) { console.warn(name, e); }
    }
    say('내 아바타 완성! 의상·포즈 탭에서 꾸며보세요.');
  } catch (e) { fail(e); }
  finally { updateGenerate(); }
};

/* ---------- 시작 ---------- */
showAvatar(SAMPLE, '기본 아바타').catch(fail);
