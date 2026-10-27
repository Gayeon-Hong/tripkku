// Network-first assets with a versioned fallback cache. Partial missing assets
// cannot block service-worker upgrades (older versions used cache.addAll).
const CACHE='tripkku-static-sidebar-click-fix-20261027-v3';
const CORE=['./','./index.html','./style.css','./app.js'];
self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE);
    await Promise.allSettled(CORE.map(url=>cache.add(url)));
    await self.skipWaiting();
  })());
});
self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const names=await caches.keys();
    await Promise.all(names.filter(k=>k.startsWith('tripkku-static-')&&k!==CACHE).map(k=>caches.delete(k)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET'||new URL(request.url).origin!==self.location.origin)return;
  event.respondWith(fetch(request).then(response=>{
    if(response.ok){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put(request,copy)).catch(()=>{}));}
    return response;
  }).catch(async()=> (await caches.match(request)) || Response.error()));
});
