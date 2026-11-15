// 保存まわり（IndexedDB）。
// 曲の情報（tracks）と音声ファイル本体（files）を別の入れ物に分けてあるので、
// 起動のときは軽い「曲の情報」だけを読めばよく、すぐに一覧を出せます。
//
//   tracks    曲の情報（題名・アーティスト・アルバムなど）   キー: id（自動の連番）
//   files     音声ファイルそのもの（Blob）                   キー: 曲の id
//   art       ジャケット画像（full: 大 / thumb: 小）          キー: 画像の中身から作った id
//   lyrics    歌詞（文字）                                    キー: 曲の id
//   playlists プレイリスト（名前と曲 id のならび）            キー: id（自動の連番）
//   kv        こまかい設定や「前回どこまで聴いたか」          キー: 名前

const DB_NAME = 'music-box';
const DB_VERSION = 1;

let dbPromise = null;

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    let req;
    try {
      req = indexedDB.open(DB_NAME, DB_VERSION);
    } catch (err) {
      reject(err);
      return;
    }
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('tracks')) {
        const s = db.createObjectStore('tracks', { keyPath: 'id', autoIncrement: true });
        s.createIndex('sig', 'sig', { unique: false });
      }
      if (!db.objectStoreNames.contains('files')) db.createObjectStore('files');
      if (!db.objectStoreNames.contains('art')) db.createObjectStore('art', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('lyrics')) db.createObjectStore('lyrics');
      if (!db.objectStoreNames.contains('playlists')) {
        db.createObjectStore('playlists', { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv');
    };
    req.onsuccess = () => {
      const db = req.result;
      // ほかのタブが新しい版を開こうとしたら、こちらは閉じて道をゆずる
      db.onversionchange = () => { db.close(); dbPromise = null; };
      // iOS では、長く裏にいたあと接続が切れていることがある。切れたら次の操作で開きなおす
      db.onclose = () => { dbPromise = null; };
      resolve(db);
    };
    req.onerror = () => { dbPromise = null; reject(req.error || new Error('IndexedDB を開けませんでした')); };
    req.onblocked = () => { /* 古いタブが閉じるのを待つ */ };
  });
  return dbPromise;
}

// 接続が切れていたとき用の「開きなおして1回だけやり直す」
function isConnectionError(err) {
  const name = err && err.name;
  const msg = String((err && err.message) || '');
  return name === 'InvalidStateError' || name === 'UnknownError'
    || /connection.*(lost|clos)/i.test(msg) || /database.*clos/i.test(msg);
}

// stores: 入れ物の名前（配列）、mode: 'readonly' | 'readwrite'
// work(tx) の中では、IndexedDB 以外の await をしないこと（トランザクションが閉じてしまう）。
// work が返した値（または Promise の結果）を、トランザクションが無事に終わってから返します。
async function withTx(stores, mode, work, retried = false) {
  let db;
  let tx;
  try {
    db = await openDB();
    tx = db.transaction(stores, mode);
  } catch (err) {
    if (!retried && isConnectionError(err)) {
      try { if (db) db.close(); } catch (_) { /* 何もしない */ }
      dbPromise = null;
      return withTx(stores, mode, work, true);
    }
    throw err;
  }
  return new Promise((resolve, reject) => {
    let result;
    let failed = null;
    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(failed || tx.error || new Error('保存に失敗しました'));
    tx.onabort = () => reject(failed || tx.error || new Error('保存が取り消されました'));
    try {
      const out = work(tx);
      if (out && typeof out.then === 'function') {
        out.then((v) => { result = v; }, (err) => {
          failed = err;
          try { tx.abort(); } catch (_) { reject(err); }
        });
      } else {
        result = out;
      }
    } catch (err) {
      failed = err;
      try { tx.abort(); } catch (_) { reject(err); }
    }
  });
}

// IDBRequest を Promise にする
function req(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export const db = {
  open: openDB,

  // ── 曲 ─────────────────────────────────────────────
  getAllTracks() {
    return withTx(['tracks'], 'readonly', (tx) => req(tx.objectStore('tracks').getAll()));
  },

  // 曲を1つ足す。track に id は付けないで渡す。足した曲の id を返す。
  // blob を IndexedDB に入れられない端末（古い iOS の一部）では、いったん全部を
  // メモリに読んでから入れなおす（呼び出し側が toBuffer を渡す）。
  async addTrack(track, blob, lyrics) {
    const put = (body) => withTx(['tracks', 'files', 'lyrics'], 'readwrite', async (tx) => {
      const id = await req(tx.objectStore('tracks').add(track));
      tx.objectStore('files').put(body, id);
      if (lyrics) tx.objectStore('lyrics').put(lyrics, id);
      return id;
    });
    try {
      return await put(blob);
    } catch (err) {
      if (isQuotaError(err)) throw err;
      // 「Blob/File を保存できません」系の失敗は、ArrayBuffer から作りなおした Blob で試す
      const buf = await blob.arrayBuffer();
      return put(new Blob([buf], { type: blob.type }));
    }
  },

  updateTrack(track) {
    return withTx(['tracks'], 'readwrite', (tx) => { tx.objectStore('tracks').put(track); });
  },

  updateTracks(tracks) {
    return withTx(['tracks'], 'readwrite', (tx) => {
      const s = tx.objectStore('tracks');
      for (const t of tracks) s.put(t);
    });
  },

  deleteTracks(ids) {
    return withTx(['tracks', 'files', 'lyrics'], 'readwrite', (tx) => {
      const t = tx.objectStore('tracks');
      const f = tx.objectStore('files');
      const l = tx.objectStore('lyrics');
      for (const id of ids) { t.delete(id); f.delete(id); l.delete(id); }
    });
  },

  getFile(id) {
    return withTx(['files'], 'readonly', (tx) => req(tx.objectStore('files').get(id)));
  },

  getLyrics(id) {
    return withTx(['lyrics'], 'readonly', (tx) => req(tx.objectStore('lyrics').get(id)));
  },

  // ── ジャケット ─────────────────────────────────────
  getArt(id) {
    return withTx(['art'], 'readonly', (tx) => req(tx.objectStore('art').get(id)));
  },

  getArtKeys() {
    return withTx(['art'], 'readonly', (tx) => req(tx.objectStore('art').getAllKeys()));
  },

  putArt(rec) {
    return withTx(['art'], 'readwrite', (tx) => { tx.objectStore('art').put(rec); });
  },

  deleteArt(ids) {
    return withTx(['art'], 'readwrite', (tx) => {
      const s = tx.objectStore('art');
      for (const id of ids) s.delete(id);
    });
  },

  // ── プレイリスト ───────────────────────────────────
  getPlaylists() {
    return withTx(['playlists'], 'readonly', (tx) => req(tx.objectStore('playlists').getAll()));
  },

  // id が無ければ新しく作る。保存したプレイリストの id を返す
  putPlaylist(pl) {
    return withTx(['playlists'], 'readwrite', (tx) => req(tx.objectStore('playlists').put(pl)));
  },

  deletePlaylist(id) {
    return withTx(['playlists'], 'readwrite', (tx) => { tx.objectStore('playlists').delete(id); });
  },

  // ── 設定・続きの位置 ───────────────────────────────
  kvGet(key) {
    return withTx(['kv'], 'readonly', (tx) => req(tx.objectStore('kv').get(key)));
  },

  kvSet(key, value) {
    return withTx(['kv'], 'readwrite', (tx) => { tx.objectStore('kv').put(value, key); });
  },

  // ── ぜんぶ消す ─────────────────────────────────────
  clearMusic() {
    return withTx(['tracks', 'files', 'lyrics', 'art', 'playlists'], 'readwrite', (tx) => {
      for (const name of ['tracks', 'files', 'lyrics', 'art', 'playlists']) tx.objectStore(name).clear();
    });
  },
};

export function isQuotaError(err) {
  if (!err) return false;
  return err.name === 'QuotaExceededError' || /quota/i.test(String(err.message || ''));
}

// 保存容量のめやす（わからない端末では null）
export async function storageEstimate() {
  try {
    if (navigator.storage && navigator.storage.estimate) {
      const e = await navigator.storage.estimate();
      return { usage: e.usage || 0, quota: e.quota || 0 };
    }
  } catch (_) { /* 何もしない */ }
  return null;
}

// 「勝手に消さないで」とブラウザにお願いする（効くかどうかは端末しだい）
export async function requestPersist() {
  try {
    if (navigator.storage && navigator.storage.persist) {
      if (navigator.storage.persisted && await navigator.storage.persisted()) return true;
      return await navigator.storage.persist();
    }
  } catch (_) { /* 何もしない */ }
  return false;
}
