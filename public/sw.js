// Service Worker minimal pour activer l'installation PWA
// (mise en cache optionnelle pour mode offline basique)

const CACHE = 'kosher-map-v1'
const OFFLINE_URLS = ['/', '/manifest.json']

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(OFFLINE_URLS))
  )
  self.skipWaiting()
})

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', e => {
  // On laisse passer toutes les requêtes réseau normalement
  // L'app fonctionne en mode connecté (Supabase requis pour les données)
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).catch(() => caches.match('/'))
    )
  }
})
