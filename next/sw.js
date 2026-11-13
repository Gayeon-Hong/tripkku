// 트립꾸 서비스 워커: 다시 열 때 빠르게, 오프라인에서도 화면이 뜨게, (나중에) 푸시 알림을 받게.
// 데이터(Supabase·AI·환율·날씨)는 절대 캐시하지 않는다. 화면 파일만 캐시한다.
const VERSION='tk-20261113-8',STATIC=VERSION+'-static',TILES='tk-vtiles-1',TILE_MAX=150;
self.addEventListener('install',e=>e.waitUntil(self.skipWaiting()));
self.addEventListener('activate',e=>e.waitUntil((async()=>{
  for(const k of await caches.keys())if(k!==STATIC)await caches.delete(k);
  await self.clients.claim();})()));
const put=async(name,req,res)=>{if(res&&(res.ok||res.type==='opaque')){const c=await caches.open(name);await c.put(req,res.clone());}return res;};
const cacheFirst=async(name,req)=>(await caches.match(req))||put(name,req,await fetch(req));
const staleWhileRevalidate=async(name,req)=>{const hit=await caches.match(req),net=fetch(req).then(r=>put(name,req,r)).catch(()=>hit);return hit||net;};
// 화면(HTML)은 브라우저의 10분 캐시를 건너뛰고 서버에 '바뀌었나?'만 물어본다(안 바뀌었으면 거의 0바이트)
const networkFirst=async(name,req)=>{try{return await put(name,req,await fetch(req.url,{cache:'no-cache',credentials:'same-origin'}));}catch(err){const hit=await caches.match(req,{ignoreSearch:true});if(hit)return hit;throw err;}};
async function trimTiles(){const c=await caches.open(TILES),keys=await c.keys();for(const k of keys.slice(0,Math.max(0,keys.length-TILE_MAX)))await c.delete(k);}
self.addEventListener('fetch',e=>{const req=e.request;if(req.method!=='GET')return;const url=new URL(req.url);
  if(url.origin===location.origin){
    if(req.mode==='navigate')return e.respondWith(networkFirst(STATIC,req));               // 화면은 항상 최신 먼저
    if(url.searchParams.has('v'))return e.respondWith(cacheFirst(STATIC,req));              // 버전 붙은 파일은 바뀌지 않는다
    return e.respondWith(staleWhileRevalidate(STATIC,req));}                                // 그림·기타: 일단 보여 주고 뒤에서 갱신
  if(url.hostname==='cdn.jsdelivr.net')return e.respondWith(cacheFirst(STATIC,req));
  // 바닥 지도(OpenFreeMap 벡터 타일, 날짜가 붙은 주소라 내용이 안 바뀐다)는 기기에 모아 두어 같은 곳을 다시 볼 때 빠르게
  if(url.hostname==='tiles.openfreemap.org'&&url.pathname.endsWith('.pbf'))return e.respondWith(cacheFirst(TILES,req).then(r=>(trimTiles(),r)));
  // 예전 OSM 지도 타일은 건드리지 않았다: 서비스 워커를 거치면 지도 서버가 요청을 거절해 상세 지도가 안 나왔다(브라우저 자체 캐시로 충분)
  // 그 밖(Supabase, AI, 환율, 날씨, 위치 검색)은 건드리지 않는다
});
// 푸시 알림(MS 스토어·설치형에서 사용 예정): 서버가 {title, body, url} 을 보낸다
self.addEventListener('push',e=>{let d={};try{d=e.data?.json()||{};}catch{d={body:e.data?.text()};}
  e.waitUntil(self.registration.showNotification(d.title||'트립꾸',{body:d.body||'',icon:'../assets/icon-192.png',badge:'../assets/light-64.png',tag:d.tag||'tripkku',data:{url:d.url||'./'}}));});
self.addEventListener('notificationclick',e=>{e.notification.close();const url=new URL(e.notification.data?.url||'./',self.registration.scope).href;
  e.waitUntil((async()=>{for(const c of await self.clients.matchAll({type:'window',includeUncontrolled:true}))if('focus' in c){await c.focus();if('navigate' in c)await c.navigate(url).catch(()=>{});return;}
    await self.clients.openWindow(url);})());});
