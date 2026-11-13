// 트립꾸 · 장소 이름 → 좌표 (Supabase Edge Function)
// 앱이 OpenStreetMap Nominatim 에 직접 물어보지 못할 때(토스 미니앱처럼 Referer 가 붙지 않는 화면) 대신 물어본다.
// Nominatim 이용 정책: 앱을 알아볼 수 있는 User-Agent, 초당 1회 이하, 결과 캐시. 앱은 결과를 여행 문서(data.geo)에 저장해 다시 묻지 않는다.
// 배포: supabase functions deploy tripkku-geo --no-verify-jwt   (로그인 없는 토스 미니앱도 써야 해서 JWT 검사를 끈다)
// 비밀 값 없음.
const UA = 'TRIPKKU/1.0 (+https://gayeon-hong.github.io/tripkku/dailyapps/; 000000000078@naver.com)';
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Access-Control-Allow-Headers': 'content-type' };
const json = (b: unknown, s = 200, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json', ...extra } });
const cache = new Map<string, unknown>();
let last = 0, chain: Promise<void> = Promise.resolve();
// 이 함수 인스턴스 안에서 Nominatim 요청 간격을 1.1초 이상으로 줄 세운다.
const gate = () => (chain = chain.then(async () => { const d = 1100 - (Date.now() - last); if (d > 0) await new Promise((r) => setTimeout(r, d)); last = Date.now(); }));

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'GET') return json({ error: 'method' }, 405);
  const u = new URL(req.url), q = (u.searchParams.get('q') || '').trim().slice(0, 120);
  if (!q) return json({ error: 'q' }, 400);
  const box = (u.searchParams.get('viewbox') || '').split(',').map(Number);
  const key = q.toLowerCase() + '|' + (box.length === 4 && box.every(Number.isFinite) ? box.map((v) => v.toFixed(2)).join(',') : '');
  if (cache.has(key)) return json(cache.get(key), 200, { 'Cache-Control': 'public, max-age=86400' });
  const p = new URLSearchParams({ format: 'jsonv2', limit: '1', 'accept-language': 'ko', q });
  if (box.length === 4 && box.every(Number.isFinite)) { p.set('viewbox', box.join(',')); p.set('bounded', '0'); }
  await gate();
  const r = await fetch('https://nominatim.openstreetmap.org/search?' + p, { headers: { 'User-Agent': UA, 'Accept': 'application/json', 'Referer': 'https://gayeon-hong.github.io/tripkku/next/' } });
  if (!r.ok) return json({ error: 'upstream ' + r.status }, 502);
  const hit = (await r.json())[0];
  const out = hit ? [{ lat: hit.lat, lon: hit.lon, boundingbox: hit.boundingbox }] : [];
  cache.set(key, out); if (cache.size > 2000) cache.delete(cache.keys().next().value!);
  return json(out, 200, { 'Cache-Control': 'public, max-age=86400' });
});
