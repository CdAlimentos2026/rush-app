// Service worker: deja la app abierta sin señal. Subí VERSION cuando cambies archivos.
const VERSION = 'rush-v4';
const SHELL = [
  './', 'index.html', 'manifest.webmanifest', 'css/app.css?v=4', 'js/app.js?v=4',
  'js/app.js', 'js/db.js', 'js/ui.js', 'js/form.js', 'js/schema.js', 'js/sync.js', 'js/dashboard.js',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-180.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Apps Script y Drive: siempre a la red
  if (/script\.google|googleusercontent|drive\.google/.test(url.host)) return;
  // Fuentes: primero caché
  if (/fonts\.(googleapis|gstatic)\.com/.test(url.host)) {
    e.respondWith(caches.open(VERSION).then(async (c) => (await c.match(req)) || fetch(req).then((r) => { c.put(req, r.clone()); return r; })));
    return;
  }
  if (url.origin !== location.origin) return;
  // App: red primero (para tomar cambios), caché si no hay señal
  e.respondWith(fetch(req).then((r) => {
    const copy = r.clone();
    caches.open(VERSION).then((c) => c.put(req, copy));
    return r;
  }).catch(() => caches.match(req, { ignoreSearch: false }).then((m) => m || caches.match(req, { ignoreSearch: true })).then((m) => m || caches.match('index.html'))));
});
