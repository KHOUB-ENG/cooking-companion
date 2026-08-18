// Offline support. The whole point is using this INSIDE a supermarket, where
// the signal is usually dreadful, so the app has to work with no network at
// all. There's no API and no server, so caching the shell is enough.

const CACHE = 'cooking-v1'

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(c => c.addAll(['/', '/manifest.webmanifest'])),
  )
  self.skipWaiting()
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', event => {
  const { request } = event
  if (request.method !== 'GET') return
  if (new URL(request.url).origin !== self.location.origin) return

  // Navigations: try the network so you get updates, fall back to the cached
  // shell when there's no signal.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(res => {
          const copy = res.clone()
          caches.open(CACHE).then(c => c.put('/', copy))
          return res
        })
        .catch(() => caches.match('/').then(r => r ?? Response.error())),
    )
    return
  }

  // Assets are content-hashed by the build, so cache-first is safe.
  event.respondWith(
    caches.match(request).then(hit => {
      if (hit) return hit
      return fetch(request).then(res => {
        if (res.ok) {
          const copy = res.clone()
          caches.open(CACHE).then(c => c.put(request, copy))
        }
        return res
      })
    }),
  )
})
