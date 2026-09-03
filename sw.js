const CACHE_NAME = 'hifz-offline-v8-audio-fix';
const APP_SHELL = [
  './', './index.html', './manifest.json', './icon-180.png', './icon-192.png', './icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k.startsWith('hifz-cache-') || k.startsWith('hifz-offline-')).filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
    ))
  );
  self.clients.claim();
});

async function cacheAndReturn(request, response){
  try { if (response && (response.ok || response.type === 'opaque')) { const c=await caches.open(CACHE_NAME); await c.put(request, response.clone()); } } catch(e){}
  return response;
}

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(event.request);

    // App files: cache first for reliable offline startup.
    if (url.origin === location.origin) {
      if (cached) return cached;
      try { return await cacheAndReturn(event.request, await fetch(event.request)); }
      catch(e) { return cached || Response.error(); }
    }

    // Quran APIs, tafsir, azkar, prayer API, fonts and audio: cache first,
    // then network and save the response for future offline use.
    if (url.hostname === 'api.alquran.cloud' ||
        url.hostname === 'api.aladhan.com' ||
        url.hostname === 'cdn.islamic.network' ||
        url.hostname === 'raw.githubusercontent.com' ||
        url.hostname === 'cdn.jsdelivr.net' ||
        url.hostname === 'fonts.googleapis.com' ||
        url.hostname === 'fonts.gstatic.com') {
      if (cached) return cached;
      try { return await cacheAndReturn(event.request, await fetch(event.request)); }
      catch(e) { return cached || Response.error(); }
    }

    if (cached) return cached;
    try { return await cacheAndReturn(event.request, await fetch(event.request)); }
    catch(e) { return cached || Response.error(); }
  })());
});
