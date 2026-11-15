// 保存まわり（IndexedDB）。
// 曲の情報（tracks）と音声ファイル本体（files）を別の入れ物に分けてあるので、
// 起動のときは軽い「曲の情報」だけを読めばよく、すぐに一覧を出せます。
//
//   tracks    曲の情報（題名・アーティスト・アルバムなど）   キー: id（自動の連番）
//   files     音声ファイルの中身（ArrayBuffer を数MBずつに分けたもの）  キー: [曲の id, 何番目か]
//   art       ジャケット画像（thumb: 小 / mid: 中 / full: 大。どれも ArrayBuffer）  キー: 画像の中身から作った id
//   lyrics    歌詞（文字）                                    キー: 曲の id
//   playlists プレイリスト（名前と曲 id のならび）            キー: id（自動の連番）
//   kv        こまかい設定や「前回どこまで聴いたか」          キー: 名前
//
// 音声や画像を Blob / File のまま入れず ArrayBuffer で入れているのは、iPhone の Safari に
// 「IndexedDB に入れた Blob を保存できない・読み出せない・再生できない」という不具合が
// 版をまたいで何度も報告されているためです（ArrayBuffer なら、どの版でも同じように動きます）。

const DB_NAME = 'music-box';
const DB_VERSION = 1;

// 音声を分けて入れるときの、ひとかたまりの大きさ
export const CHUNK_BYTES = 8 * 1024 * 1024;

let dbPromise = null;

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    let request;
    try {
      request = indexedDB.open(DB_NAME, DB_VERSION);
    } catch (err) {
      dbPromise = null;
      reject(err);
      return;
    }
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('tracks')) {
        db.createObjectStore('tracks', { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains('files')) db.createObjectStore('files');
      if (!db.objectStoreNames.contains('art')) db.createObjectStore('art', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('lyrics')) db.createObjectStore('lyrics');
      if (!db.objectStoreNames.contains('playlists')) {
        db.createObjectStore('playlists', { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv');
    };
    request.onsuccess = () => {
      const db = request.result;
      // ほかのタブが新しい版を開こうとしたら、こちらは閉じて道をゆずる
      db.onversionchange = () => { db.close(); dbPromise = null; };
      // iPhone では、長く裏にいたあと接続が切れていることがある。切れたら次の操作で開きなおす
      db.onclose = () => { dbPromise = null; };
      resolve(db);
    };
    request.onerror = () => { dbPromise = null; reject(request.error || new Error('IndexedDB を開けませんでした')); };
    request.onblocked = () => { /* 古いタブが閉じるのを待つ */ };
  });
  return dbPromise;
}

// 接続が切れていたときの失敗かどうか（このときは開きなおして、もう1回だけやり直す）
function isConnectionError(err) {
  const name = err && err.name;
  const msg = String((err && err.message) || '');
  return name === 'InvalidStateError' || name === 'UnknownError'
    || /connection.*(lost|clos)/i.test(msg) || /database.*clos/i.test(msg);
}

function dropConnection(db) {
  try { if (db) db.close(); } catch (_) { /* 何もしない */ }
  dbPromise = null;
}

// stores: 入れ物の名前（配列）、mode: 'readonly' | 'readwrite'
// work(tx, done) の中では IndexedDB の操作だけを、その場で（await をはさまずに）発行すること。
// 返したい値があるときは done(値) を呼ぶ。トランザクションが無事に終わってから、その値を返します。
// 失敗したトランザクションは丸ごと取り消されるので、やり直しても二重にはなりません。
async function withTx(stores, mode, work, retried = false) {
  let db;
  try {
    db = await openDB();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(stores, mode);
      let result;
      let failed = null;
      tx.oncomplete = () => resolve(result);
      tx.onerror = () => reject(failed || tx.error || new Error('保存に失敗しました'));
      tx.onabort = () => reject(failed || tx.error || new Error('保存が取り消されました'));
      try {
        work(tx, (value) => { result = value; });
      } catch (err) {
        failed = err;
        try { tx.abort(); } catch (_) { reject(err); }
      }
    });
  } catch (err) {
    if (!retried && isConnectionError(err)) {
      dropConnection(db);
      return withTx(stores, mode, work, true);
    }
    throw err;
  }
}

// 1つ読むだけの操作
function getOne(store, key) {
  return withTx([store], 'readonly', (tx, done) => {
    const r = tx.objectStore(store).get(key);
    r.onsuccess = () => done(r.result);
  });
}

function getAll(store) {
  return withTx([store], 'readonly', (tx, done) => {
    const r = tx.objectStore(store).getAll();
    r.onsuccess = () => done(r.result);
  });
}

// ある曲の、音声のかたまり全部を指す範囲
function chunkRange(id) {
  return IDBKeyRange.bound([id, 0], [id, Number.MAX_SAFE_INTEGER]);
}

export const db = {
  open: openDB,

  // ── 曲 ─────────────────────────────────────────────
  getAllTracks() { return getAll('tracks'); },

  // 曲を1つ足す。track に id は付けないで渡す。chunks は音声の中身（ArrayBuffer のならび）。
  // 曲の情報・音声・歌詞を1つのトランザクションで入れるので、途中で失敗しても半端には残らない。
  // 足した曲の id を返す。
  addTrack(track, chunks, lyrics) {
    return withTx(['tracks', 'files', 'lyrics'], 'readwrite', (tx, done) => {
      const r = tx.objectStore('tracks').add(track);
      r.onsuccess = () => {
        const id = r.result;
        const files = tx.objectStore('files');
        chunks.forEach((buf, n) => files.put(buf, [id, n]));
        if (lyrics) tx.objectStore('lyrics').put(lyrics, id);
        done(id);
      };
    });
  },

  updateTrack(track) {
    return withTx(['tracks'], 'readwrite', (tx) => { tx.objectStore('tracks').put(track); });
  },

  deleteTracks(ids) {
    return withTx(['tracks', 'files', 'lyrics'], 'readwrite', (tx) => {
      const t = tx.objectStore('tracks');
      const f = tx.objectStore('files');
      const l = tx.objectStore('lyrics');
      for (const id of ids) { t.delete(id); f.delete(chunkRange(id)); l.delete(id); }
    });
  },

  // 曲の音声を、再生できる形（Blob）にして返す。無ければ undefined
  async getFile(id, mime) {
    const chunks = await withTx(['files'], 'readonly', (tx, done) => {
      const r = tx.objectStore('files').getAll(chunkRange(id));
      r.onsuccess = () => done(r.result);
    });
    if (!chunks || !chunks.length) return undefined;
    return new Blob(chunks, { type: mime || '' });
  },

  // 音声が入っている曲の id の一覧（点検用）
  async fileIds() {
    const keys = await withTx(['files'], 'readonly', (tx, done) => {
      const r = tx.objectStore('files').getAllKeys();
      r.onsuccess = () => done(r.result);
    });
    return Array.from(new Set((keys || []).map((k) => k[0])));
  },

  getLyrics(id) { return getOne('lyrics', id); },

  // ── ジャケット ─────────────────────────────────────
  getArt(id) { return getOne('art', id); },

  getArtKeys() {
    return withTx(['art'], 'readonly', (tx, done) => {
      const r = tx.objectStore('art').getAllKeys();
      r.onsuccess = () => done(r.result);
    });
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
  getPlaylists() { return getAll('playlists'); },

  // id が無ければ新しく作る。保存したプレイリストの id を返す
  putPlaylist(pl) {
    return withTx(['playlists'], 'readwrite', (tx, done) => {
      const r = tx.objectStore('playlists').put(pl);
      r.onsuccess = () => done(r.result);
    });
  },

  deletePlaylist(id) {
    return withTx(['playlists'], 'readwrite', (tx) => { tx.objectStore('playlists').delete(id); });
  },

  // ── 設定・続きの位置 ───────────────────────────────
  kvGet(key) { return getOne('kv', key); },

  kvSet(key, value) {
    return withTx(['kv'], 'readwrite', (tx) => { tx.objectStore('kv').put(value, key); });
  },

  // ── ぜんぶ消す ─────────────────────────────────────
  clearMusic() {
    return withTx(['tracks', 'files', 'lyrics', 'art', 'playlists', 'kv'], 'readwrite', (tx) => {
      for (const name of ['tracks', 'files', 'lyrics', 'art', 'playlists']) tx.objectStore(name).clear();
      // 「前回の続き」も忘れる（設定は残す）
      tx.objectStore('kv').delete('queue');
      tx.objectStore('kv').delete('pos');
    });
  },
};

export function isQuotaError(err) {
  if (!err) return false;
  return err.name === 'QuotaExceededError' || /quota/i.test(String(err.message || ''));
}

// このアプリが使っている保存容量（わからない端末では null）
export async function storageUsage() {
  try {
    if (navigator.storage && navigator.storage.estimate) {
      const e = await navigator.storage.estimate();
      if (e && typeof e.usage === 'number') return e.usage;
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
