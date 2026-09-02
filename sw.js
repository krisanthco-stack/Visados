const VERSION='3.7.1';
const CACHE='c-visados-'+VERSION;
const CORE=[
  './',
  './index.html',
  './css/app.css',
  './js/pwa.js',
  './js/data.js',
  './js/intake.js',
  './js/config.js',
  './js/daily.js',
  './js/attachments.js',
  './js/reader.js',
  './js/workflow.js',
  './js/app.js',
  './js/report-layout.js',
  './js/exporters.js',
  './manifest.webmanifest',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './assets/icon-maskable-192.png',
  './assets/icon-maskable-512.png'
];
const OPTIONAL=[
  './assets/c-visados-app.png',
  './assets/escudo.png',
  './assets/sarapiqui.png',
  './assets/templates/APROBACION_BASE_2029.png',
  './assets/templates/HEADER_2029.png',
  './assets/templates/BUSINESS_CARD_2029.png',
  './assets/templates/OFICIAL_APROBACION_FONDO.png',
  './assets/templates/OFICIAL_RECHAZO_FONDO.png',
  './assets/templates/OFICIAL_RECHAZO_CONTINUACION.png',
  './assets/templates/OFICIAL_RECHAZO_RECIBO.png',
  './assets/templates/MACHOTE_APROBACION_DEFINITIVO.docx',
  './assets/templates/MACHOTE_RECHAZO_DEFINITIVO.docx',
  './data/requisitos.json',
  './data/catalogo_rechazos.json'
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(CORE);
    for(const url of OPTIONAL){
      try{ await cache.add(url); }
      catch(err){ console.warn('[C-VISADOS] Recurso opcional no precargado:', url, err); }
    }
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys
      .filter(k => k.startsWith('c-visados-') && k !== CACHE)
      .map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', event => {
  if(event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if(req.method !== 'GET') return;

  const url = new URL(req.url);
  if(url.origin !== self.location.origin) return;

  if(req.mode === 'navigate'){
    event.respondWith((async () => {
      try{
        const fresh = await fetch(req, {cache:'no-store'});
        const cache = await caches.open(CACHE);
        cache.put('./index.html', fresh.clone()).catch(()=>{});
        return fresh;
      }catch(err){
        return (await caches.match('./index.html')) || (await caches.match('./')) || Response.error();
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cached = await caches.match(req);
    const network = fetch(req).then(async fresh => {
      if(fresh && fresh.ok){
        const cache = await caches.open(CACHE);
        cache.put(req, fresh.clone()).catch(()=>{});
      }
      return fresh;
    }).catch(()=>null);

    if(cached){
      event.waitUntil(network);
      return cached;
    }
    return (await network) || Response.error();
  })());
});
