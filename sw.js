const CACHE='swingtrade-shell-v7';
const CORE=['./','./index.html','./app.js?v=20261120-7','./manifest.webmanifest','./icon.svg'];
self.addEventListener('install',event=>{event.waitUntil((async()=>{const c=await caches.open(CACHE);await c.addAll(CORE);await self.skipWaiting()})())});
self.addEventListener('activate',event=>{event.waitUntil((async()=>{for(const k of await caches.keys())if(k!==CACHE)await caches.delete(k);await self.clients.claim()})())});
self.addEventListener('message',event=>{if(event.data==='SKIP_WAITING')self.skipWaiting()});
self.addEventListener('fetch',event=>{const u=new URL(event.request.url);if(u.origin!==location.origin)return;event.respondWith((async()=>{try{const fresh=await fetch(event.request,{cache:'no-store'});if(fresh.ok){const c=await caches.open(CACHE);c.put(event.request,fresh.clone())}return fresh}catch(e){const cached=await caches.match(event.request);if(cached)return cached;throw e}})())});
