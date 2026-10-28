// Build v16.1 - compact globe controls and reviewed luggage guidance.
// Neutral migration service worker. New friend app does not register a service worker.
// Previously installed Tripkku SW may update to this file, stop caching and unregister.
self.addEventListener('install',event=>event.waitUntil(self.skipWaiting()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
  const keys=await caches.keys();
  await Promise.all(keys.filter(key=>/tripkku|oita/i.test(key)).map(key=>caches.delete(key)));
  await self.registration.unregister();
  await self.clients.claim();
})()));
