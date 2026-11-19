/**
 * 얼굴 사진 → 3D 얼굴 점 468개. Google MediaPipe Face Landmarker 를 브라우저(WASM) 안에서 돌린다.
 * 사진은 기기 밖으로 나가지 않는다. 처음 한 번 모델·WASM 파일(약 10MB)만 내려받는다.
 *
 *   const scan = await scanFace(blob);   // {points:[[x,y,z]...468], aspect} 또는 얼굴이 없으면 null
 *   x,y 는 사진 기준 0~1, z 는 x 와 같은 배율의 깊이(카메라 쪽이 음수).
 */
const VER = '0.10.14';
const CDN = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${VER}`;
const MODEL = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

let landmarker;
async function load() {
  const {FaceLandmarker, FilesetResolver} = await import(`${CDN}/vision_bundle.mjs`);
  const files = await FilesetResolver.forVisionTasks(`${CDN}/wasm`);
  return FaceLandmarker.createFromOptions(files, {baseOptions: {modelAssetPath: MODEL, delegate: 'CPU'}, runningMode: 'IMAGE', numFaces: 1});
}

export async function scanFace(blob) {
  landmarker ||= await load().catch(e => { throw new Error('얼굴 인식 모델을 불러오지 못했어요. 인터넷 연결을 확인해 주세요. (' + (e?.message || e) + ')'); });
  const bmp = await createImageBitmap(blob);
  try {
    const face = landmarker.detect(bmp).faceLandmarks?.[0];
    if (!face) return null;
    return {points: face.slice(0, 468).map(p => [+p.x.toFixed(5), +p.y.toFixed(5), +p.z.toFixed(5)]), aspect: bmp.width / bmp.height};
  } finally { bmp.close?.(); }
}
