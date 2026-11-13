// 트립꾸 · 장소 이름 → 좌표 (Supabase Edge Function)
// 앱이 OpenStreetMap Nominatim 에 직접 물어보지 못할 때(토스 미니앱처럼 Referer 가 붙지 않는 화면) 대신 물어본다.
// 순서: Nominatim → Photon(komoot) → Gemini(마지막 수단, 대략 위치).
//   Nominatim 은 클라우드 서버(Supabase)에서 오는 요청을 403 으로 막는 경우가 있어 뒤의 두 곳으로 넘어간다.
// 앱은 결과를 여행 문서(data.geo)에 저장해 같은 장소를 다시 묻지 않는다.
// 배포: Verify JWT 끄기(로그인 없는 토스 미니앱도 써야 함). 비밀 값: GEMINI_API_KEY(다른 함수와 같은 것), GEMINI_MODEL(선택).
const UA = 'TRIPKKU/1.0 (+https://gayeon-hong.github.io/tripkku/dailyapps/; 000000000078@naver.com)';
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Access-Control-Allow-Headers': 'content-type' };
const json = (b: unknown, s = 200, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json', ...extra } });
type Hit = { lat: string; lon: string; boundingbox?: string[]; src: string };
const cache = new Map<string, Hit[]>();
// 같은 사람이 너무 많이 묻지 않게(인스턴스 기준 10분에 80회)
const hits = new Map<string, number[]>();
const limited = (ip: string) => { const now = Date.now(), a = (hits.get(ip) || []).filter((t) => now - t < 600000); a.push(now); hits.set(ip, a); if (hits.size > 5000) hits.clear(); return a.length > 80; };
let last = 0, nomiOffUntil = 0, chain: Promise<void> = Promise.resolve();
// Nominatim 요청 간격을 1.1초 이상으로 줄 세운다(이용 정책).
const gate = () => (chain = chain.then(async () => { const d = 1100 - (Date.now() - last); if (d > 0) await new Promise((r) => setTimeout(r, d)); last = Date.now(); }));

async function nominatim(q: string, box: number[] | null): Promise<Hit | null> {
  const p = new URLSearchParams({ format: 'jsonv2', limit: '1', 'accept-language': 'ko', q });
  if (box) { p.set('viewbox', box.join(',')); p.set('bounded', '0'); }
  await gate();
  const r = await fetch('https://nominatim.openstreetmap.org/search?' + p, { headers: { 'User-Agent': UA, 'Accept': 'application/json', 'Referer': 'https://gayeon-hong.github.io/tripkku/next/' } });
  if (!r.ok) throw new Error('nominatim ' + r.status);
  const h = (await r.json())[0];
  return h ? { lat: h.lat, lon: h.lon, boundingbox: h.boundingbox, src: 'nominatim' } : null;
}
async function photon(q: string, box: number[] | null): Promise<Hit | null> {
  const p = new URLSearchParams({ q, limit: '1' });
  if (box) { p.set('lon', String((box[0] + box[2]) / 2)); p.set('lat', String((box[1] + box[3]) / 2)); }
  const r = await fetch('https://photon.komoot.io/api/?' + p, { headers: { 'User-Agent': UA } });
  if (!r.ok) throw new Error('photon ' + r.status);
  const f = (await r.json()).features?.[0];
  if (!f) return null;
  const [lon, lat] = f.geometry.coordinates;
  // 한국어 이름은 엉뚱한 곳(국내 같은 이름)을 주기도 해서, 여행지 범위가 있으면 그 근처인지 확인한다
  if (box) { const [w, n, e, s] = box, pad = 3; if (lon < Math.min(w, e) - pad || lon > Math.max(w, e) + pad || lat < Math.min(s, n) - pad || lat > Math.max(s, n) + pad) return null; }
  const x = f.properties?.extent;
  return { lat: String(lat), lon: String(lon), boundingbox: x ? [String(x[3]), String(x[1]), String(x[0]), String(x[2])] : undefined, src: 'photon' };
}
async function gemini(q: string, box: number[] | null): Promise<Hit | null> {
  const key = Deno.env.get('GEMINI_API_KEY'); if (!key) return null;
  const model = Deno.env.get('GEMINI_MODEL') || 'gemini-3.5-flash-lite';
  const near = box ? ` 여행지 대략 범위(서,북,동,남 경위도): ${box.map((v) => v.toFixed(2)).join(',')}.` : '';
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 12000);
  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST', signal: ctl.signal, headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: '너는 지명 좌표 사전이다. 실제로 존재하는 장소의 위도·경도만 답한다. 모르면 found=false. JSON 만: {"found":bool,"lat":number,"lon":number}' }] },
        contents: [{ role: 'user', parts: [{ text: `장소: ${q}.${near}` }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0, maxOutputTokens: 80 },
      }),
    });
    if (!r.ok) throw new Error('gemini ' + r.status);
    const txt = (await r.json())?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    const o = JSON.parse(txt);
    if (!o.found || !Number.isFinite(o.lat) || !Number.isFinite(o.lon) || Math.abs(o.lat) > 90 || Math.abs(o.lon) > 180) return null;
    return { lat: String(o.lat), lon: String(o.lon), src: 'gemini' };
  } finally { clearTimeout(t); }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'GET') return json({ error: 'method' }, 405);
  const u = new URL(req.url), q = (u.searchParams.get('q') || '').trim().slice(0, 120);
  if (!q) return json({ error: 'q' }, 400);
  const raw = (u.searchParams.get('viewbox') || '').split(',').map(Number);
  const box = raw.length === 4 && raw.every(Number.isFinite) ? raw : null;
  const key = q.toLowerCase() + '|' + (box ? box.map((v) => v.toFixed(1)).join(',') : '');
  const hit = cache.get(key);
  if (hit) return json(hit, 200, { 'Cache-Control': 'public, max-age=86400' });
  if (limited(req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'x')) return json({ error: 'busy' }, 429);
  const why: string[] = [];
  // Nominatim 이 이 서버를 막고 있으면(403) 10분 동안은 건너뛴다. 한글 이름은 Photon 이 엉뚱한 곳(국내 같은 이름)을 주므로 Gemini 를 먼저 쓴다.
  const hangul = /[가-힣]/.test(q);
  const order = [...(Date.now() < nomiOffUntil ? [] : [nominatim]), ...(hangul ? [gemini, photon] : [photon, gemini])];
  for (const f of order) {
    try { const h = await f(q, box); if (h) { const out = [h]; cache.set(key, out); if (cache.size > 3000) cache.delete(cache.keys().next().value!); return json(out, 200, { 'Cache-Control': 'public, max-age=86400' }); } }
    catch (e) { const m = String((e as Error).message || e); why.push(m); if (m === 'nominatim 403') nomiOffUntil = Date.now() + 600000; }
  }
  // 아무 데서도 못 찾음(오류만 있었으면 502, 단순히 없는 장소면 빈 배열)
  return why.length === order.length ? json({ error: why.join(' / ') }, 502) : json([], 200);
});
