// sw.js
// Two-cache strategy:
//   agig-app-v1.0.05   → app shell, network-first
//   agig-bert-models   → ONNX model files, cache-first (permanent)
//
// On Capacitor/Android the models are stored natively via Filesystem,
// so the sw only needs to cache them for browser/dev mode.

const APP_CACHE   = 'agig-app-v1.0.05'
const MODEL_CACHE = 'agig-bert-models'

const APP_URLS = [
  '/',
  '/index.html',
  '/src/main.jsx',
  '/src/App.jsx',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js',
  'https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200',
]

// Requests from these hosts go into the permanent model cache
const MODEL_HOSTS = ['cdn.jsdelivr.net', 'huggingface.co']

// ─── Install ───────────────────────────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(APP_CACHE).then(cache => cache.addAll(APP_URLS))
  )
  self.skipWaiting()
})

// ─── Activate ──────────────────────────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== APP_CACHE && k !== MODEL_CACHE)
          .map(k => { console.log('[SW] Deleting old cache:', k); return caches.delete(k) })
      )
    )
  )
  self.clients.claim()
})

// ─── Fetch ─────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url)

  if (MODEL_HOSTS.some(h => url.hostname.includes(h))) {
    // Model files: cache-first, write-through — never re-download once cached
    event.respondWith(cacheFirst(event.request, MODEL_CACHE))
  } else {
    // App shell: network-first, fall back to cache when offline
    event.respondWith(networkFirst(event.request, APP_CACHE))
  }
})

async function cacheFirst(request, cacheName) {
  const cache  = await caches.open(cacheName)
  const cached = await cache.match(request)
  if (cached) return cached
  try {
    const fresh = await fetch(request)
    if (fresh.ok) cache.put(request, fresh.clone())
    return fresh
  } catch {
    return new Response('Offline — model file not cached', { status: 503 })
  }
}

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName)
  try {
    const fresh = await fetch(request)
    if (fresh.ok) cache.put(request, fresh.clone())
    return fresh
  } catch {
    return await cache.match(request) || new Response('Offline', { status: 503 })
  }
}

// ─── Compromise NLP helper (original, preserved) ──────────────────────────────
self.addEventListener('message', function (e) {
  importScripts('https://unpkg.com/compromise@14.12.1/builds/compromise.min.js')
  const doc = self.nlp(e.data)
  const m   = doc.places()
  self.postMessage(m.json({ count: true, unique: true }))
}, false)
