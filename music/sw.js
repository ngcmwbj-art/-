// Service Worker：アプリ本体（画面・スタイル・プログラム・アイコン）を端末に控えておき、
// 通信がなくても開けるようにします。曲そのものはここではなく IndexedDB に入っています。
//
// 下の VERSION と FILES は tools/build-sw.mjs が書きかえます（手で直さない）。
// アプリのファイルを変えたら `node tools/build-sw.mjs` を流してください。
// VERSION が変わると、次に開いたときに新しい版へ入れかわります。

/* build-sw:begin */
const VERSION = 'fae0b4e9f0a1';
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
  './js/demo.js',
  './js/icons.js',
  './js/importer.js',
  './js/library.js',
  './js/nowplaying.js',
  './js/player.js',
  './js/rows.js',
  './js/slider.js',
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
    await Promise.all(FILES.map(async (url) => {
      // HTTP キャッシュを通さずに取りなおす（古いファイルを控えてしまわないように）
      const res = await fetch(new Request(url, { cache: 'reload' }));
      if (!res.ok) throw new Error(`控えられませんでした: ${url}`);
      // 転送（リダイレクト）を経た応答をそのままページに返すと Safari が断るので、中身だけの応答に作りなおす
      const clean = res.redirected
        ? new Response(await res.blob(), { status: res.status, statusText: res.statusText, headers: res.headers })
        : res;
      await cache.put(url, clean);
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // 消すのは自分の古い控えだけ（同じ置き場所に、ほかのページの控えがあるかもしれない）
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
  if (req.headers.has('range')) return;   // 音声などの「一部だけください」には手を出さない
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  const scope = new URL('./', self.location.href).pathname;
  if (!url.pathname.startsWith(scope)) return;

  // ロック画面に出すジャケットの絵（js/art.js の artwork が、この URL を端末に渡す）
  const rest = url.pathname.slice(scope.length);
  if (rest.startsWith('__art/')) {
    event.respondWith(artResponse(rest.slice('__art/'.length)));
    return;
  }

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

// ── 保存場所（IndexedDB）からジャケットの絵を取り出して返す ──

function openMusicDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('music-box');
    // まだ保存場所が無いときに、ここで空のものを作ってしまわない（作るのはページの側の仕事）
    request.onupgradeneeded = () => { try { request.transaction.abort(); } catch (_) { /* 何もしない */ } };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function artResponse(encodedId) {
  try {
    const id = decodeURIComponent(encodedId);
    const db = await openMusicDb();
    db.onversionchange = () => db.close();
    const rec = await new Promise((resolve, reject) => {
      const tx = db.transaction('art', 'readonly');
      const r = tx.objectStore('art').get(id);
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
      tx.onabort = () => reject(tx.error);
    });
    db.close();
    const buf = rec && (rec.mid || rec.thumb);
    if (buf) {
      return new Response(buf, { headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'no-store' } });
    }
  } catch (_) { /* 下の「ありません」を返す */ }
  return new Response('', { status: 404 });
}
