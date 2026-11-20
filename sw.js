// Service worker de Kaizen: guarda la app en caché para que funcione
// sin conexión. Al publicar cambios, sube CACHE_VERSION para que los
// iPhones descarguen la nueva versión.
const CACHE_VERSION = 'kaizen-v2.10.0';
// Lo esencial para funcionar offline. El arte nuevo que agregues se
// guarda en caché automáticamente la primera vez que se muestra.
const ASSETS = [
  './',
  './index.html',
  './css/styles.css',
  './js/app.js',
  './js/logic.js',
  './js/fx.js',
  './js/share.js',
  './js/profiles.js',
  './js/catalog.js',
  './js/gear.js',
  './js/install.js',
  './js/guide.js',
  './js/phrases.js',
  './js/i18n.js',
  './js/names-en.js',
  './manifest.webmanifest',
  './fonts/bangers.woff2',
  './fonts/nunito-700.woff2',
  './fonts/nunito-900.woff2',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  './art/chars/titan-m.webp',
  './art/chars/titan-f.webp',
  './art/chars/relampago-m.webp',
  './art/chars/relampago-f.webp',
  './art/chars/estratega-m.webp',
  './art/chars/estratega-f.webp',
  './art/chars/sabio-m.webp',
  './art/chars/sabio-f.webp',
  './art/chars/guardian-m.webp',
  './art/chars/guardian-f.webp',
  './art/chars/implacable-m.webp',
  './art/chars/implacable-f.webp',
  './art/worlds/atardecer.webp',
  './art/stats/fuerza.webp',
  './art/stats/resistencia.webp',
  './art/stats/intelecto.webp',
  './art/stats/sabiduria.webp',
  './art/stats/vinculo.webp',
  './art/stats/hogar.webp',
  './art/bosses/pereza.webp',
  './art/bosses/procrastinacion.webp',
  './art/bosses/desorden.webp',
  './art/bosses/estres.webp',
  './art/bosses/distraccion.webp',
  './art/bosses/soledad.webp',
  './art/pets/chispa-0.webp',
  './art/pets/chispa-1.webp',
  './art/pets/chispa-2.webp',
  './art/pets/chispa-3.webp',
  './art/pets/chispa-4.webp',
  './art/pets/chispa-5.webp',
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_VERSION).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Estrategia: primero la caché (rápido y offline); en segundo plano se
// actualiza la copia desde la red ("stale-while-revalidate").
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  event.respondWith(
    caches.open(CACHE_VERSION).then(async cache => {
      const cached = await cache.match(req, { ignoreSearch: true });
      const network = fetch(req)
        .then(res => { if (res.ok) cache.put(req, res.clone()); return res; })
        .catch(() => null);
      if (cached) { event.waitUntil(network); return cached; }
      const res = await network;
      if (res) return res;
      if (req.mode === 'navigate') return cache.match('./index.html');
      return Response.error();
    })
  );
});
