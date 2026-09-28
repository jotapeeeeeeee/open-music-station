const CACHE_PREFIX = 'open-music-station-'
const CACHE_NAME = `${CACHE_PREFIX}v1`
const APP_ROOT = new URL('./', self.registration.scope)

self.addEventListener('install', event => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME)
      const shell = await fetch(APP_ROOT.href)
      if (!shell.ok) throw new Error(`Could not cache app shell: HTTP ${shell.status}`)
      const html = await shell.clone().text()
      await cache.put(APP_ROOT.href, shell)
      const assets = [...html.matchAll(/(?:src|href)="([^"]+)"/g)]
        .map(match => new URL(match[1], APP_ROOT))
        .filter(url => url.origin === self.location.origin && url.pathname.includes('/assets/'))
        .map(url => url.href)
      await cache.addAll([
        ...new Set([
          ...assets,
          new URL('manifest.webmanifest', APP_ROOT).href,
          new URL('icon.svg', APP_ROOT).href,
        ]),
      ])
      await self.skipWaiting()
    })(),
  )
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', event => {
  const request = event.request
  const url = new URL(request.url)
  if (request.method !== 'GET' || url.origin !== self.location.origin) return

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response.ok) {
            const copy = response.clone()
            void caches.open(CACHE_NAME).then(cache => cache.put(request, copy))
          }
          return response
        })
        .catch(async () => (await caches.match(request)) ?? (await caches.match(APP_ROOT.href))),
    )
    return
  }

  if (url.pathname.includes('/assets/') || url.pathname.endsWith('/manifest.webmanifest') || url.pathname.endsWith('/icon.svg')) {
    event.respondWith(
      caches.match(request).then(cached => cached ?? fetch(request).then(response => {
        if (response.ok) {
          const copy = response.clone()
          void caches.open(CACHE_NAME).then(cache => cache.put(request, copy))
        }
        return response
      })),
    )
  }
})
