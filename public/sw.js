// Robsol VIP — Service Worker v2
// Strategy: network-first for navigation; cache-then-network for static assets.
// API routes and Next.js chunk requests bypass the SW entirely.
// The catch block always resolves to a valid Response (never undefined).

const CACHE = 'robsol-vip-v2'

// Navigation shell pre-cached on install so /dashboard works offline
const PRECACHE = ['/', '/login', '/dashboard']

// ── Offline fallback ────────────────────────────────────────────────────────
// Inline HTML — no external fetch needed when the network is gone.

const OFFLINE_HTML = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Sem conexão — Robsol VIP</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:system-ui,sans-serif;display:flex;align-items:center;
         justify-content:center;min-height:100vh;background:#0f0c29;
         color:#fff;text-align:center;padding:1.5rem}
    h1{font-size:1.5rem;margin-bottom:.5rem}
    p{color:rgba(255,255,255,.6);margin-bottom:1.5rem;font-size:.95rem}
    button{background:#d4af37;color:#0f0c29;border:none;
           padding:.75rem 2rem;border-radius:.75rem;
           font-weight:700;font-size:1rem;cursor:pointer}
    button:active{opacity:.85}
  </style>
</head>
<body>
  <div>
    <h1>Sem conexão</h1>
    <p>Verifique sua internet e tente novamente.</p>
    <button onclick="location.reload()">Tentar novamente</button>
  </div>
</body>
</html>`

// Factory — returns a fresh Response every call so the body is never spent.
function makeOfflineResponse() {
  return new Response(OFFLINE_HTML, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}

// ── Lifecycle ────────────────────────────────────────────────────────────────

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== CACHE)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  )
})

// ── Fetch ────────────────────────────────────────────────────────────────────

self.addEventListener('fetch', (event) => {
  const { request } = event

  // Only handle GET — let POST/PUT/PATCH/DELETE pass through untouched
  if (request.method !== 'GET') return

  const url = new URL(request.url)

  // Pass through without SW involvement:
  //   • /api/ routes  (always need fresh data)
  //   • /_next/       (Next.js HMR + chunk URLs managed by the framework)
  //   • cross-origin  (CDN, analytics, Supabase API, etc.)
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/_next/') ||
    url.origin !== self.location.origin
  ) {
    return
  }

  // Network-first strategy:
  //   1. Try the live network → cache the response on success
  //   2. On network failure  → serve from cache
  //   3. If not in cache     → serve branded offline page
  //
  // event.respondWith() MUST always receive a non-undefined Response.
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Only cache opaque-free, successful same-origin responses
        if (response.ok && response.type === 'basic') {
          const clone = response.clone()
          // Fire-and-forget cache write (don't block the response)
          caches.open(CACHE).then((cache) => cache.put(request, clone))
        }
        return response
      })
      .catch(() =>
        // caches.match resolves undefined when the URL isn't cached —
        // the ?? fallback ensures we ALWAYS return a valid Response object.
        caches
          .match(request)
          .then((cached) => cached ?? makeOfflineResponse())
      )
  )
})
