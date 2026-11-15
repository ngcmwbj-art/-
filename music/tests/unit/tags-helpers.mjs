// tags.test.mjs のための小道具：テスト用の音声ファイル（のバイト列）を手で組み立てる。
// 名前が *.test.mjs ではないので、テストとしては実行されない。

// ------------------------------------------------------------
// バイト列づくり
// ------------------------------------------------------------

/** 数（1バイト）・文字列（1文字 = 1バイト）・配列・Uint8Array をつないで Uint8Array にする */
export function bytes(...parts) {
  const chunks = [];
  let total = 0;
  for (const p of parts.flat(Infinity)) {
    let c;
    if (typeof p === 'number') c = Uint8Array.of(p & 0xff);
    else if (typeof p === 'string') c = Uint8Array.from(p, (ch) => ch.charCodeAt(0) & 0xff);
    else if (p instanceof Uint8Array) c = p;
    else if (p instanceof ArrayBuffer) c = new Uint8Array(p);
    else throw new TypeError('bytes(): あつかえない値 ' + typeof p);
    chunks.push(c);
    total += c.length;
  }
  const out = new Uint8Array(total);
  let at = 0;
  for (const c of chunks) {
    out.set(c, at);
    at += c.length;
  }
  return out;
}

export const u16be = (n) => [(n >>> 8) & 0xff, n & 0xff];
export const u24be = (n) => [(n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff];
export const u32be = (n) => [(n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff];
export const u64be = (n) => [...u32be(Math.floor(n / 4294967296)), ...u32be(n >>> 0)];
export const u16le = (n) => [n & 0xff, (n >>> 8) & 0xff];
export const u32le = (n) => [n & 0xff, (n >>> 8) & 0xff, (n >>> 16) & 0xff, (n >>> 24) & 0xff];
export const u64le = (n) => [...u32le(n >>> 0), ...u32le(Math.floor(n / 4294967296))];
export const synchsafe = (n) => [(n >>> 21) & 0x7f, (n >>> 14) & 0x7f, (n >>> 7) & 0x7f, n & 0x7f];

export const utf8 = (s) => new TextEncoder().encode(s);

export function utf16le(s, bom = true) {
  const out = [];
  if (bom) out.push(0xff, 0xfe);
  for (let i = 0; i < s.length; i++) out.push(...u16le(s.charCodeAt(i)));
  return Uint8Array.from(out);
}

export function utf16be(s, bom = true) {
  const out = [];
  if (bom) out.push(0xfe, 0xff);
  for (let i = 0; i < s.length; i++) out.push(...u16be(s.charCodeAt(i)));
  return Uint8Array.from(out);
}

export const latin1 = (s) => Uint8Array.from(s, (ch) => ch.charCodeAt(0) & 0xff);

let sjisTable = null;
/** 文字列を Shift_JIS のバイト列にする（TextDecoder で逆引きの表を作る） */
export function sjis(s) {
  if (!sjisTable) {
    sjisTable = new Map();
    const dec = new TextDecoder('shift_jis', { fatal: true });
    const tryAdd = (arr) => {
      try {
        const ch = dec.decode(Uint8Array.from(arr));
        if (ch.length === 1 && !sjisTable.has(ch)) sjisTable.set(ch, arr);
      } catch (e) {
        // その並びは Shift_JIS に無い
      }
    };
    for (let b = 0x20; b < 0x7f; b++) tryAdd([b]);
    for (let b = 0xa1; b <= 0xdf; b++) tryAdd([b]); // 半角カナ
    for (let lead = 0x81; lead <= 0xef; lead++) {
      if (lead >= 0xa0 && lead <= 0xdf) continue;
      for (let trail = 0x40; trail <= 0xfc; trail++) {
        if (trail === 0x7f) continue;
        tryAdd([lead, trail]);
      }
    }
  }
  const out = [];
  for (const ch of s) {
    const b = sjisTable.get(ch);
    if (!b) throw new Error('Shift_JIS にできない文字: ' + ch);
    out.push(...b);
  }
  return Uint8Array.from(out);
}

/** 決まった種から作る、でたらめなバイト列（毎回同じ結果になる） */
export function randomBytes(n, seed = 1) {
  const out = new Uint8Array(n);
  let s = seed >>> 0 || 1;
  for (let i = 0; i < n; i++) {
    s ^= s << 13; s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5; s >>>= 0;
    out[i] = s & 0xff;
  }
  return out;
}

/** 決まった種の乱数（0 以上 1 未満） */
export function rng(seed = 1) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}

/** JPEG らしく見えるバイト列（先頭が FF D8 FF E0。中身に FF 00 や FF E1 もまぜる） */
export function fakeJpeg(n, seed = 7) {
  const body = randomBytes(Math.max(0, n - 12), seed);
  for (let i = 0; i + 1 < body.length; i += 97) {
    body[i] = 0xff;
    body[i + 1] = i % 2 ? 0x00 : 0xe1;
  }
  return bytes(0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 'JFIF', 0x00, 0x01, body).subarray(0, n);
}

/** PNG らしく見えるバイト列 */
export function fakePng(n, seed = 9) {
  return bytes(0x89, 'PNG', 0x0d, 0x0a, 0x1a, 0x0a, randomBytes(Math.max(0, n - 8), seed)).subarray(0, n);
}

// ------------------------------------------------------------
// ID3
// ------------------------------------------------------------

/** 非同期化：FF のあとが 00 か E0 以上なら、あいだに 00 をはさむ */
export function unsync(data) {
  const out = [];
  for (let i = 0; i < data.length; i++) {
    out.push(data[i]);
    if (data[i] === 0xff && (i + 1 === data.length || data[i + 1] === 0x00 || data[i + 1] >= 0xe0)) out.push(0x00);
  }
  return Uint8Array.from(out);
}

/** ID3v2.3 / 2.4 のフレーム。opts.plainSize: v2.4 でも synchsafe にしない（昔の iTunes の書き方） */
export function id3Frame(id, data, version = 3, opts = {}) {
  const body = bytes(data);
  const size = version === 4 && !opts.plainSize ? synchsafe(body.length) : u32be(body.length);
  return bytes(id, size, u16be(opts.flags || 0), body);
}

/** ID3v2.2 のフレーム（名前3文字 + 大きさ3バイト） */
export const id3Frame22 = (id, data) => {
  const body = bytes(data);
  return bytes(id, u24be(body.length), body);
};

/** 文字フレームの中身：文字コードの番号 + 文字列のバイト */
export const textData = (enc, textBytes) => bytes(enc, textBytes);

/** ID3v2 タグ全体。flags はヘッダの旗、body はフレームの並び（拡張ヘッダをふくめてよい） */
export function id3v2(version, body, flags = 0, padding = 0) {
  const all = bytes(body, new Uint8Array(padding));
  return bytes('ID3', version, 0, flags, synchsafe(all.length), all);
}

/** APIC の中身 */
export function apicData(mime, type, image, enc = 0, description = '') {
  const desc = enc === 1 ? bytes(utf16le(description), 0, 0) : bytes(description, 0);
  return bytes(enc, mime, 0, type, desc, image);
}

/** 30バイトなど決まった長さに、0 で詰める（長すぎたら切る） */
export function fixed(data, n) {
  const out = new Uint8Array(n);
  out.set(bytes(data).subarray(0, n));
  return out;
}

/** ID3v1 / v1.1 */
export function id3v1({ title = '', artist = '', album = '', year = '', comment = '', track, genre = 255 }) {
  const c = fixed(comment, 30);
  if (track !== undefined) {
    c[28] = 0;
    c[29] = track;
  }
  return bytes('TAG', fixed(title, 30), fixed(artist, 30), fixed(album, 30), fixed(year, 4), c, genre);
}

// ------------------------------------------------------------
// MP3 のフレーム
// ------------------------------------------------------------

/** MPEG1 Layer III・128kbps・44100Hz・ステレオのフレームを n 個（1個 417 バイト） */
export function mp3Frames(n, seed = 3) {
  const frame = 417;
  const out = randomBytes(n * frame, seed);
  for (let i = 0; i < out.length; i++) if (out[i] === 0xff) out[i] = 0x7f; // にせの同期を作らない
  for (let i = 0; i < n; i++) out.set([0xff, 0xfb, 0x90, 0x44], i * frame);
  return out;
}

/** MPEG2 Layer III・64kbps・22050Hz・モノラルのフレームを n 個（1個 208 バイト） */
export function mp3FramesMpeg2(n) {
  const frame = 208;
  const out = new Uint8Array(n * frame).fill(0x55);
  for (let i = 0; i < n; i++) out.set([0xff, 0xf3, 0x80, 0xc4], i * frame);
  return out;
}

// ------------------------------------------------------------
// MP4
// ------------------------------------------------------------

/** 箱（アトム）。type は4文字（© は '\xA9'） */
export function atom(type, ...content) {
  const body = bytes(content);
  return bytes(u32be(8 + body.length), type, body);
}

/** 64 ビットの大きさを使った箱 */
export function atom64(type, ...content) {
  const body = bytes(content);
  return bytes(u32be(1), type, u64be(16 + body.length), body);
}

/** ilst の中の項目（data の型: 1 = UTF-8, 0 = バイナリ, 13 = JPEG, 14 = PNG） */
export const mp4Item = (key, type, data) => atom(key, atom('data', u32be(type), u32be(0), data));
export const mp4Text = (key, text) => mp4Item(key, 1, utf8(text));

// ------------------------------------------------------------
// FLAC / Vorbis コメント
// ------------------------------------------------------------

export function flacBlock(type, data, last = false) {
  const body = bytes(data);
  return bytes((last ? 0x80 : 0) | type, u24be(body.length), body);
}

/** STREAMINFO（34 バイト） */
export function flacStreamInfo(sampleRate, totalSamples, channels = 2, bits = 16) {
  const hi = Math.floor(totalSamples / 4294967296) & 0x0f;
  return bytes(
    u16be(4096), u16be(4096), u24be(0), u24be(0),
    (sampleRate >> 12) & 0xff, (sampleRate >> 4) & 0xff,
    ((sampleRate & 0x0f) << 4) | ((channels - 1) << 1) | (((bits - 1) >> 4) & 1),
    (((bits - 1) & 0x0f) << 4) | hi,
    u32be(totalSamples >>> 0),
    new Uint8Array(16),
  );
}

/** Vorbis コメントの中身。comments は "KEY=値" の文字列か、Uint8Array */
export function vorbisComments(comments, vendor = 'test') {
  const v = utf8(vendor);
  const parts = [u32le(v.length), v, u32le(comments.length)];
  for (const c of comments) {
    const b = typeof c === 'string' ? utf8(c) : c;
    parts.push(u32le(b.length), b);
  }
  return bytes(parts);
}

/** FLAC の PICTURE ブロックの中身 */
export function flacPicture(type, mime, image, description = '') {
  const d = utf8(description);
  return bytes(u32be(type), u32be(mime.length), mime, u32be(d.length), d, u32be(600), u32be(600), u32be(24), u32be(0), u32be(image.length), image);
}

export const base64 = (u8) => Buffer.from(u8.buffer, u8.byteOffset, u8.byteLength).toString('base64');

// ------------------------------------------------------------
// OGG
// ------------------------------------------------------------

let crcTable = null;
function oggCrc(page) {
  if (!crcTable) {
    crcTable = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let r = i << 24;
      for (let k = 0; k < 8; k++) r = (r & 0x80000000) ? ((r << 1) ^ 0x04c11db7) : (r << 1);
      crcTable[i] = r >>> 0;
    }
  }
  let crc = 0;
  for (let i = 0; i < page.length; i++) crc = ((crc << 8) ^ crcTable[((crc >>> 24) ^ page[i]) & 0xff]) >>> 0;
  return crc;
}

/**
 * パケットの並びを OGG のページに詰める。
 * packets: [{ data, granule?, flush? }]  flush: true ならそのパケットでページを閉じる。
 * 大きなパケットは自動でページをまたぐ（1ページ最大 maxSegments 区切り）。
 */
export function oggPages(serial, packets, opts = {}) {
  const maxSegments = opts.maxSegments || 255;
  const pages = [];
  let seq = opts.startSeq || 0;
  let lacing = [];
  let body = [];
  let pageGranule = -1;
  let continued = false;
  let first = !opts.startSeq;

  const emit = (last) => {
    if (!lacing.length) return;
    let flags = 0;
    if (continued) flags |= 1;
    if (first) flags |= 2;
    if (last && opts.eos) flags |= 4;
    const granule = pageGranule < 0 ? [0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff] : u64le(pageGranule);
    const page = bytes('OggS', 0, flags, granule, u32le(serial), u32le(seq++), u32le(0), lacing.length, lacing, body);
    page.set(u32le(oggCrc(page)), 22);
    pages.push(page);
    lacing = [];
    body = [];
    pageGranule = -1;
    first = false;
  };

  packets.forEach((packet, index) => {
    const data = bytes(packet.data);
    let at = 0;
    let started = false;
    for (;;) {
      if (lacing.length === maxSegments) {
        emit(false);
        continued = started; // パケットの途中でページが変わった
      }
      const n = Math.min(255, data.length - at);
      lacing.push(n);
      body.push(data.subarray(at, at + n));
      at += n;
      started = true;
      if (n < 255) break;
    }
    pageGranule = packet.granule === undefined ? 0 : packet.granule;
    if (packet.flush || index === packets.length - 1) {
      emit(index === packets.length - 1);
      continued = false;
    }
  });
  return bytes(pages);
}

/** Vorbis の最初のヘッダ（識別） */
export const vorbisIdent = (sampleRate, channels = 2) =>
  bytes(0x01, 'vorbis', u32le(0), channels, u32le(sampleRate), u32le(0), u32le(128000), u32le(0), 0xb8, 0x01);

/** Opus の最初のヘッダ */
export const opusHead = (preSkip, inputRate = 44100, channels = 2) =>
  bytes('OpusHead', 1, channels, u16le(preSkip), u32le(inputRate), u16le(0), 0);

// ------------------------------------------------------------
// どこを読んだかを記録する Blob
// ------------------------------------------------------------

/**
 * slice して読んだ範囲を記録する Blob もどき。
 * parseTags が「ファイル全体を読んでいない」ことを確かめるのに使う。
 */
export class TrackingBlob {
  constructor(blob, log = [], offset = 0) {
    this.blob = blob;
    this.size = blob.size;
    this.type = blob.type;
    this.log = log; // [始まり, 長さ] の並び
    this.offset = offset;
  }

  slice(start = 0, end = this.size) {
    const a = Math.max(0, Math.min(this.size, start < 0 ? this.size + start : start));
    const b = Math.max(a, Math.min(this.size, end < 0 ? this.size + end : end));
    return new TrackingBlob(this.blob.slice(a, b), this.log, this.offset + a);
  }

  async arrayBuffer() {
    this.log.push([this.offset, this.size]);
    return this.blob.arrayBuffer();
  }

  /** 読んだ合計バイト数 */
  get totalBytes() {
    return this.log.reduce((sum, [, n]) => sum + n, 0);
  }

  /** 読みに行った回数 */
  get readCount() {
    return this.log.length;
  }

  /** [from, to) の範囲にかかる読みこみの合計バイト数 */
  bytesInside(from, to) {
    let sum = 0;
    for (const [start, n] of this.log) sum += Math.max(0, Math.min(to, start + n) - Math.max(from, start));
    return sum;
  }
}
