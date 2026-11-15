// Service Worker：アプリ本体（画面・スタイル・プログラム・アイコン）を端末に控えておき、
// 通信がなくても開けるようにします。曲そのものはここではなく IndexedDB に入っています。
//
// 下の VERSION と FILES は tools/build-sw.mjs が書きかえます（手で直さない）。
// アプリのファイルを変えたら `node tools/build-sw.mjs` を流してください。
// VERSION が変わると、次に開いたときに新しい版へ入れかわります。

/* build-sw:begin */
const VERSION = 'd8537f7110be';
const FILES = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/app.css',
  './css/coverflow.css',
  './js/app.js',
  './js/art.js',
  './js/coverflow.js',
  './js/db.js',
  './js/icons.js',
  './js/importer.js',
  './js/library.js',
  './js/nowplaying.js',
  './js/player.js',
  './js/rows.js',
  './js/tags.js',
  './js/ui.js',
  './js/vlist.js',
  './icons/apple-touch-icon.png',
  './icons/favicon-32.png',
  './icons/favicon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/icon.svg',
];
/* build-sw:end */

const PREFIX = 'music-shell-';
const CACHE = `${PREFIX}${VERSION}`;

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // HTTP キャッシュを通さずに取りなおす（古いファイルを控えてしまわないように）
    await cache.addAll(FILES.map((url) => new Request(url, { cache: 'reload' })));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys
      .filter((key) => key.startsWith(PREFIX) && key !== CACHE)
      .map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  const scope = new URL('./', self.location.href).pathname;
  if (!url.pathname.startsWith(scope)) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    if (req.mode === 'navigate') {
      // ページそのものは、いつも控えてある index.html を返す（通信なしで開ける）
      const page = await cache.match('./index.html');
      if (page) return page;
    }
    const hit = await cache.match(req, { ignoreSearch: true });
    if (hit) return hit;
    try {
      return await fetch(req);
    } catch (err) {
      if (req.mode === 'navigate') {
        const page = await cache.match('./index.html');
        if (page) return page;
      }
      throw err;
    }
  })());
});
