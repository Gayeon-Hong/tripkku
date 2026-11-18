// 저장한 캐릭터: 이 브라우저의 IndexedDB 에만 둔다(서버로 보내지 않음). 원본 3D 파일(Blob)째로 저장.
const DB = 'mytwin', STORE = 'characters';

function open() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, {keyPath: 'id'});
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('저장소를 열 수 없어요 (개인정보 보호 모드인지 확인).'));
  });
}
async function tx(mode, fn) {
  const db = await open();
  try {
    return await new Promise((resolve, reject) => {
      const t = db.transaction(STORE, mode), req = fn(t.objectStore(STORE));
      t.oncomplete = () => resolve(req?.result);
      t.onerror = t.onabort = () => reject(t.error || new Error('저장 실패 (저장 공간이 부족할 수 있어요)'));
    });
  } finally { db.close(); }
}

/** URL 문자열 또는 File/Blob 묶음을 저장 가능한 형태로. */
export const pack = src => typeof src === 'string' ? {url: src}
  : {files: [...(src instanceof Blob ? [src] : src)].map(f => ({name: f.name || 'model.glb', type: f.type, blob: f.slice(0, f.size, f.type)}))};
export const unpack = p => p.url ?? p.files.map(f => new File([f.blob], f.name, {type: f.type}));

export const listCharacters = async () => (await tx('readonly', s => s.getAll())).sort((a, b) => b.savedAt - a.savedAt);
export const getCharacter = id => tx('readonly', s => s.get(id));
export const putCharacter = c => tx('readwrite', s => s.put(c));
export const deleteCharacter = id => tx('readwrite', s => s.delete(id));

/** 저장소가 자동으로 지워지지 않게 요청. Safari 는 홈 화면에 추가하지 않으면 7일 미사용 시 지울 수 있다. */
export const askPersist = () => navigator.storage?.persist?.().catch(() => false) ?? Promise.resolve(false);
