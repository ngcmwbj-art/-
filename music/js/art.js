// ジャケット画像の保管と取り出し。
// 取り込みのときに、一覧用の小さい絵（thumb）・ロック画面用の中くらいの絵（mid）・
// 再生画面用の大きい絵（full）を作って保存します。同じ絵は1回しか保存しません。

const THUMB_SIZE = 200;     // 一覧用（長いほうの辺）
const MID_SIZE = 512;       // ロック画面・横向きの流れ用
const FULL_SIZE = 1200;     // 再生画面用の上限
const KEEP_ORIGINAL_BYTES = 700 * 1024;   // これ以下の JPEG / PNG はそのまま大きい絵として使う
const MAX_THUMB_URLS = 400;
const MAX_FULL_URLS = 8;

export class ArtStore {
  constructor(db) {
    this.db = db;
    this.known = null;            // 保存ずみの絵の id（最初に使うときに読む）
    this.thumbs = new Map();      // id → Promise<url|null>
    this.fulls = new Map();
    this.mids = new Map();
    this.dataUrls = new Map();    // id → Promise<{src,type}|null>（ロック画面用）
  }

  async _known() {
    if (!this.known) {
      try { this.known = new Set(await this.db.getArtKeys()); } catch (_) { this.known = new Set(); }
    }
    return this.known;
  }

  // タグから取り出した絵 { mime, data: Uint8Array } を保存して id を返す（だめなら null）
  async save(picture) {
    if (!picture || !picture.data || picture.data.length < 32) return null;
    const id = hashBytes(picture.data);
    const known = await this._known();
    if (known.has(id)) return id;
    try {
      const mime = picture.mime || 'image/jpeg';
      const original = new Blob([picture.data], { type: mime });
      const img = await decodeImage(original);
      if (!img) return null;
      const w = img.naturalWidth || img.width;
      const h = img.naturalHeight || img.height;
      if (!w || !h) return null;
      const thumb = await scaled(img, w, h, THUMB_SIZE, 0.82);
      const mid = await scaled(img, w, h, MID_SIZE, 0.85);
      let full = original;
      const plain = /^image\/(jpe?g|png)$/i.test(mime);
      if (!plain || original.size > KEEP_ORIGINAL_BYTES || Math.max(w, h) > FULL_SIZE * 1.5) {
        full = await scaled(img, w, h, FULL_SIZE, 0.9);
      }
      if (img.close) img.close();
      if (!thumb || !full) return null;
      // Blob のままではなく ArrayBuffer にして保存する（理由は db.js の先頭に）
      await this.db.putArt({
        id,
        thumb: await thumb.arrayBuffer(),
        mid: await (mid || thumb).arrayBuffer(),
        full: await full.arrayBuffer(),
        fullType: full.type || 'image/jpeg',
      });
      known.add(id);
      return id;
    } catch (_) {
      return null;
    }
  }

  // 一覧用の小さい絵の URL
  thumbUrl(id) { return this._url(this.thumbs, id, 'thumb', MAX_THUMB_URLS); }

  // 再生画面用の大きい絵の URL
  fullUrl(id) { return this._url(this.fulls, id, 'full', MAX_FULL_URLS); }

  // 横向きのジャケットの流れ用の、中くらいの絵の URL（大きい絵を何枚も広げるとメモリが足りなくなるため）
  midUrl(id) { return this._url(this.mids, id, 'mid', 48); }

  _url(cache, id, field, max) {
    if (!id) return Promise.resolve(null);
    let p = cache.get(id);
    if (p) {
      // よく使うものを後ろへ（古いものから捨てるため）
      cache.delete(id);
      cache.set(id, p);
      return p;
    }
    p = this.db.getArt(id).then((rec) => {
      const blob = artBlob(rec, field);
      return blob ? URL.createObjectURL(blob) : null;
    }).catch(() => null);
    cache.set(id, p);
    if (cache.size > max) {
      const oldest = cache.keys().next().value;
      const op = cache.get(oldest);
      cache.delete(oldest);
      // 画面でまだ使っているかもしれないので、少し待ってから手放す
      op.then((url) => { if (url) setTimeout(() => URL.revokeObjectURL(url), 30000); });
    }
    return p;
  }

  // ロック画面・コントロールセンターに出す絵（Media Session 用）。
  // iPhone は blob: や data: の絵を出さないことがあるという報告があるので、
  // Service Worker が動いているときは、ふつうの URL（sw.js が保存場所から絵を返す）で渡す。
  // 動いていないとき（最初の1回・パソコンでファイルを直接開いたとき）は data: の URL で渡す
  artwork(id) {
    if (!id) return Promise.resolve(null);
    if (navigator.serviceWorker && navigator.serviceWorker.controller) {
      const src = new URL(`__art/${encodeURIComponent(id)}`, document.baseURI).href;
      return Promise.resolve([{ src, sizes: '512x512', type: 'image/jpeg' }]);
    }
    let p = this.dataUrls.get(id);
    if (!p) {
      p = this.db.getArt(id).then(async (rec) => {
        const blob = artBlob(rec, 'mid');
        if (!blob) return null;
        const src = await blobToDataUrl(blob);
        return [{ src, sizes: '512x512', type: 'image/jpeg' }];
      }).catch(() => null);
      this.dataUrls.set(id, p);
      if (this.dataUrls.size > 3) this.dataUrls.delete(this.dataUrls.keys().next().value);
    }
    return p;
  }

  // 使われなくなった絵を消す（曲を消したあとに呼ぶ）
  async prune(usedIds) {
    const known = await this._known();
    const gone = [];
    for (const id of known) if (!usedIds.has(id)) gone.push(id);
    if (!gone.length) return;
    try { await this.db.deleteArt(gone); } catch (_) { return; }
    for (const id of gone) {
      known.delete(id);
      for (const cache of [this.thumbs, this.fulls, this.mids]) {
        const p = cache.get(id);
        if (p) { cache.delete(id); p.then((url) => { if (url) URL.revokeObjectURL(url); }); }
      }
      this.dataUrls.delete(id);
    }
  }

  // ぜんぶ忘れる（「すべて削除」のあと）
  reset() {
    for (const cache of [this.thumbs, this.fulls, this.mids]) {
      for (const p of cache.values()) p.then((url) => { if (url) URL.revokeObjectURL(url); });
      cache.clear();
    }
    this.dataUrls.clear();
    this.known = new Set();
  }
}

// 保存してある絵（ArrayBuffer）を、表示に使える Blob にする。field: 'thumb' | 'mid' | 'full'
function artBlob(rec, field) {
  if (!rec) return null;
  if (rec[field]) {
    return new Blob([rec[field]], { type: field === 'full' ? (rec.fullType || 'image/jpeg') : 'image/jpeg' });
  }
  if (rec.full) return new Blob([rec.full], { type: rec.fullType || 'image/jpeg' });
  if (rec.thumb) return new Blob([rec.thumb], { type: 'image/jpeg' });
  return null;
}

// 絵の中身から短い id を作る（同じ絵なら同じ id）
function hashBytes(bytes) {
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  const n = bytes.length;
  // 大きな絵は間をとばして読む（速さのため）。長さも id に入れるので、ぶつかることはまずない
  const step = n > 262144 ? Math.floor(n / 131072) : 1;
  for (let i = 0; i < n; i += step) {
    const b = bytes[i];
    h1 = Math.imul(h1 ^ b, 0x01000193) >>> 0;
    h2 = Math.imul(h2 + b, 0x85ebca6b) >>> 0;
    h2 ^= h2 >>> 13;
  }
  return `${n.toString(36)}-${h1.toString(36)}${(h2 >>> 0).toString(36)}`;
}

async function decodeImage(blob) {
  if (typeof createImageBitmap === 'function') {
    try { return await createImageBitmap(blob); } catch (_) { /* <img> で試す */ }
  }
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
    img.src = url;
  });
}

// 長いほうの辺が max になるように縮めた JPEG を作る（もとが小さければ大きくはしない）
function scaled(img, w, h, max, quality) {
  const k = Math.min(1, max / Math.max(w, h));
  const cw = Math.max(1, Math.round(w * k));
  const ch = Math.max(1, Math.round(h * k));
  const canvas = document.createElement('canvas');
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext('2d');
  if (!ctx) return Promise.resolve(null);
  // 透明な PNG は白地にする
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, cw, ch);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, cw, ch);
  return new Promise((resolve) => {
    try {
      canvas.toBlob((blob) => {
        // 使い終わったキャンバスのメモリをすぐ返す（iPhone はキャンバスの総量に上限がある）
        canvas.width = 0;
        canvas.height = 0;
        resolve(blob);
      }, 'image/jpeg', quality);
    } catch (_) {
      resolve(null);
    }
  });
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}
