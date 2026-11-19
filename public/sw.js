const CACHE = 'soundsalat-v4'
const BASE = '/soundsalat/'

function withBase(path) {
  return BASE + String(path).replace(/^\/+/, '')
}

const PRECACHE = [
  BASE,
  withBase('index.html'),
  withBase('manifest.webmanifest'),
  withBase('favicon.svg'),
  withBase('sounds/manifest.json'),
  withBase('icons/icon-192.png'),
  withBase('icons/icon-512.png'),
  withBase('icons/icon-maskable.png'),
  withBase('icons/apple-touch-icon.png'),
]

function inApp(url) {
  return url.pathname === '/soundsalat' || url.pathname.startsWith(BASE)
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE)
      let urls = [...PRECACHE]
      try {
        const manifest = await fetch(withBase('sounds/manifest.json'))
        if (manifest.ok) {
          const data = await manifest.json()
          urls.push(withBase('emoji/mic.svg'))
          for (const clip of data.clips || []) {
            if (clip && typeof clip.file === 'string') urls.push(withBase('sounds/' + clip.file.replace(/^\/+/, '')))
            if (clip && typeof clip.id === 'string') urls.push(withBase('emoji/' + clip.id + '.svg'))
          }
        }
      } catch {
        /* sounds are cached again on the next visit */
      }
      urls = [...new Set(urls)]
      await Promise.all(
        urls.map(async (url) => {
          try {
            const response = await fetch(url)
            if (response.ok) await cache.put(url, response)
          } catch {
            /* a missing optional file should not block install */
          }
        }),
      )
      await self.skipWaiting()
    })(),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))
      await self.clients.claim()
    })(),
  )
})

self.addEventListener('message', (event) => {
  const data = event.data
  if (!data || data.type !== 'cache-urls' || !Array.isArray(data.urls)) return
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE)
      await Promise.all(
        data.urls.map(async (url) => {
          try {
            const response = await fetch(url)
            if (response.ok) await cache.put(url, response)
          } catch {
            /* ignore individual failures */
          }
        }),
      )
    })(),
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin || !inApp(url)) return

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone()
          caches.open(CACHE).then((cache) => {
            cache.put(request, copy).catch(() => {})
            cache.put(BASE, response.clone()).catch(() => {})
          })
          return response
        })
        .catch(async () => (await caches.match(request)) || (await caches.match(BASE)) || (await caches.match(withBase('index.html'))) || Response.error()),
    )
    return
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone()
            caches.open(CACHE).then((cache) => cache.put(request, copy)).catch(() => {})
          }
          return response
        })
        .catch(() => cached)
      return cached || network
    }),
  )
})
