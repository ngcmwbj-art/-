/**
 * tags.js — 音声ファイルのタグ（題名・アーティスト・アルバム・ジャケット・長さ）を読む
 *
 * ねらい
 *   ・ファイルをまるごと読まない。blob.slice(a, b) で「いる所だけ」読む。
 *     （数十MB〜数百MBのファイルが何百個も来ても、iPhone のメモリを食いつぶさない）
 *   ・こわれたファイル・途中で切れたファイルでも止まらない。例外は外に出さず、読めた分だけ返す。
 *   ・ブラウザ（iOS 15 以降の Safari、PC の Chrome / Safari）と Node 22 の両方で動く。
 *   ・ほかのファイルやライブラリには頼らない。
 *
 * 外から使うもの
 *   parseTags(blob, fileName, options?)  … タグを読む（非同期・例外を投げない）
 *   guessMime(fileName, blobType)        … 拡張子から MIME を決める
 *   parseFileName(fileName, relativePath?) … ファイル名から題名・曲番号などを推しはかる
 *   AUDIO_EXTENSIONS / isAudioFile(fileName, blobType)
 *
 * 読める形式
 *   MP3（ID3v2.2 / 2.3 / 2.4、ID3v1）、MP4 / M4A / M4B（AAC・ALAC）、FLAC、
 *   OGG（Vorbis / Opus / FLAC）、WAV、AIFF / AIFC、AAC（ADTS）、CAF（おまけ）
 */

// ============================================================
// 大きさの決まり
// ============================================================

const KB = 1024;
const MB = 1024 * KB;

const HEAD_BYTES = 64 * KB;           // 最初にまとめて読む量
const READ_AHEAD = 64 * KB;           // 読みに行くとき、ついでに先まで読んでおく量
const BIG_READ_AHEAD = 512 * KB;      // 大きなかたまりを順に読むときの先読み
const CACHE_CHUNK_MAX = MB;           // これより大きい読みこみは手もとに残さない
const CACHE_CHUNKS = 4;               // 手もとに残しておくかたまりの数

const MAX_TOTAL_BYTES = 64 * MB;      // 1ファイルで読む合計の上限
const MAX_READS = 4000;               // 1ファイルで読みに行く回数の上限
const MAX_PICTURE_BYTES = 32 * MB;    // これより大きいジャケットはあきらめる
const MAX_TEXT_BYTES = 2 * MB;        // 文字の項目ひとつの上限（歌詞も含む）
const MAX_WHOLE_TAG_BYTES = 32 * MB;  // タグ全体をまとめて読むしかないときの上限
const MAX_OGG_PACKET_BYTES = 48 * MB; // OGG のコメントを組み立てる上限
const OGG_TAIL_BYTES = 64 * KB;       // OGG の長さを調べるために末尾から読む量
const MP3_SCAN_BYTES = 256 * KB;      // MP3 の最初のフレームを探す範囲

// くり返しの上限（こわれたファイルで止まらなくなるのを防ぐ）
const MAX_ID3_FRAMES = 3000;
const MAX_ATOMS = 3000;
const MAX_FLAC_BLOCKS = 1000;
const MAX_OGG_PAGES = 5000;
const MAX_CHUNKS = 3000;
const MAX_COMMENTS = 20000;

const EMPTY = new Uint8Array(0);

// ============================================================
// 拡張子・MIME
// ============================================================

/** このアプリが「音楽ファイル」としてあつかう拡張子（小文字・ドットなし） */
export const AUDIO_EXTENSIONS = [
  'mp3', 'm4a', 'm4b', 'mp4', 'aac', 'flac', 'ogg', 'oga', 'opus',
  'wav', 'wave', 'aif', 'aiff', 'aifc', 'caf',
  'm4r', 'mp2', 'mpga', 'adts', 'weba',
];

const AUDIO_EXTENSION_SET = new Set(AUDIO_EXTENSIONS);

const MIME_BY_EXTENSION = {
  mp3: 'audio/mpeg', mp2: 'audio/mpeg', mpga: 'audio/mpeg',
  m4a: 'audio/mp4', m4b: 'audio/mp4', m4r: 'audio/mp4', mp4: 'audio/mp4',
  aac: 'audio/aac', adts: 'audio/aac',
  flac: 'audio/flac',
  ogg: 'audio/ogg', oga: 'audio/ogg', opus: 'audio/ogg',
  wav: 'audio/wav', wave: 'audio/wav',
  aif: 'audio/aiff', aiff: 'audio/aiff', aifc: 'audio/aiff',
  caf: 'audio/x-caf',
  weba: 'audio/webm',
};

// 拡張子 → 中身の種類（中身から分からなかったときの手がかり）
const KIND_BY_EXTENSION = {
  mp3: 'mp3', mp2: 'mp3', mpga: 'mp3',
  m4a: 'mp4', m4b: 'mp4', m4r: 'mp4', mp4: 'mp4', m4p: 'mp4', m4v: 'mp4', mov: 'mp4', '3gp': 'mp4',
  aac: 'aac', adts: 'aac',
  flac: 'flac',
  ogg: 'ogg', oga: 'ogg', opus: 'ogg', spx: 'ogg',
  wav: 'wav', wave: 'wav',
  aif: 'aiff', aiff: 'aiff', aifc: 'aiff',
  caf: 'caf',
};

// 音楽ではないと分かっている拡張子（MIME が audio/ で始まっていても音楽としてあつかわない）
const NOT_AUDIO_EXTENSIONS = new Set(['m3u', 'm3u8', 'pls', 'cue', 'mid', 'midi', 'kar', 'rmi']);

// 題名を作るときに取りのぞく拡張子
const STRIP_EXTENSIONS = new Set([
  ...AUDIO_EXTENSIONS,
  'webm', 'mov', 'm4v', 'm4p', '3gp', 'wma', 'mka', 'ape', 'wv', 'dsf', 'dff', 'tta', 'mpc', 'amr', 'ac3', 'mp1', 'spx',
]);

/** パスの最後の部分（ファイル名）だけを取り出す */
function baseNameOf(path) {
  const parts = String(path == null ? '' : path).split(/[\\/]/);
  return parts[parts.length - 1] || '';
}

/** 拡張子（小文字・ドットなし）。無ければ空文字 */
function extensionOf(fileName) {
  const base = baseNameOf(fileName);
  const dot = base.lastIndexOf('.');
  return dot > 0 ? base.slice(dot + 1).toLowerCase() : '';
}

/**
 * 再生に使う MIME を決める。
 * 拡張子で分かればそれを返し、分からなければ blobType（それも無ければ空文字）を返す。
 * @param {string} fileName
 * @param {string} [blobType]
 * @returns {string} 例: 'audio/mpeg' 'audio/mp4' 'audio/flac' 'audio/ogg' 'audio/wav' 'audio/aiff' 'audio/aac' 'audio/x-caf'
 */
export function guessMime(fileName, blobType) {
  const known = MIME_BY_EXTENSION[extensionOf(fileName)];
  if (known) return known;
  return typeof blobType === 'string' ? blobType : '';
}

/**
 * 音楽ファイルかどうか。
 * 拡張子が AUDIO_EXTENSIONS にあるか、（拡張子で分からないときは）MIME が audio/ で始まれば true。
 * macOS が作る「._」で始まる付属ファイルや、プレイリスト・MIDI は false。
 * @param {string} fileName
 * @param {string} [blobType]
 * @returns {boolean}
 */
export function isAudioFile(fileName, blobType) {
  const base = baseNameOf(fileName);
  if (base.startsWith('._')) return false;
  const ext = extensionOf(base);
  if (AUDIO_EXTENSION_SET.has(ext)) return true;
  if (NOT_AUDIO_EXTENSIONS.has(ext)) return false;
  const type = typeof blobType === 'string' ? blobType.toLowerCase() : '';
  if (!type.startsWith('audio/')) return false;
  return !/^audio\/(x-)?(mpegurl|scpl|midi?|sp-midi)\b/.test(type);
}

// ============================================================
// ファイル名から題名・曲番号を推しはかる
// ============================================================

/** 曲番号だけの部分かどうか（"03" や、ディスク-トラックの "1-03"） */
function trackToken(text) {
  let m = /^(\d{1,3})$/.exec(text);
  if (m) return { track: parseInt(m[1], 10) };
  m = /^(\d{1,2})[-.](\d{1,3})$/.exec(text);
  if (m) return { disc: parseInt(m[1], 10), track: parseInt(m[2], 10) };
  return null;
}

/** 先頭についた曲番号を切り分ける。無ければ null */
function leadingTrack(text) {
  // "1-01 Title"（ディスク-トラック）
  let m = /^(\d{1,2})-(\d{2,3})(?:[\s.)_]+|\s*[-–—]\s*)(\S.*)$/.exec(text);
  if (m) return { disc: parseInt(m[1], 10), track: parseInt(m[2], 10), rest: m[3] };
  // "01. Title" "1) Title" "01_ Title" "01 - Title"
  m = /^(\d{1,3})\s*[.)\]:\-–—_]+\s+(\S.*)$/.exec(text);
  if (m) return { track: parseInt(m[1], 10), rest: m[2] };
  // "[01] Title" "(01)Title"
  m = /^[[(](\d{1,3})[\])]\s*(\S.*)$/.exec(text);
  if (m) return { track: parseInt(m[1], 10), rest: m[2] };
  // "01.Title" "01-Title" "01_Title"（うしろが数字のときは "3.14" のような題名かもしれないので見送る）
  m = /^(\d{1,3})[.\-_]([^\d\s].*)$/.exec(text);
  if (m) return { track: parseInt(m[1], 10), rest: m[2] };
  // "01 Title" "12 Title"（"7 Years" や "100 Years" は題名のままにする）
  m = /^(0\d{1,2}|[1-9]\d)\s+(\S.*)$/.exec(text);
  if (m) return { track: parseInt(m[1], 10), rest: m[2] };
  // "01夏のはじまり"（0 で始まる2けたのときだけ。"3月9日" や "15の夜" は題名のまま）
  m = /^(0[1-9])([^\d\s].*)$/.exec(text);
  if (m) return { track: parseInt(m[1], 10), rest: m[2] };
  return null;
}

/** 大文字小文字や前後の空白のちがいを無視して同じ名前か */
function sameName(a, b) {
  return typeof a === 'string' && typeof b === 'string' && a.trim().toLowerCase() === b.trim().toLowerCase();
}

/**
 * ファイル名（とフォルダつきのパス）から、題名・曲番号・アーティスト・アルバムを推しはかる。
 * タグが入っていないファイルのための手がかり。
 *
 * 読み取る形（例）
 *   "01 Title.mp3" "01. Title.mp3" "01 - Title.mp3" "01_Title.mp3" "[01] Title.mp3"
 *   "1-01 Title.mp3"（ディスク-トラック）
 *   "Artist - Title.mp3" "Artist - Album - Title.mp3" "Artist - Album - 03 - Title.flac"
 *   relativePath が "Artist/Album/01 Title.mp3" なら、足りない artist / album をフォルダ名で補う
 *   "1999.mp3" のような数字だけの名前は、そのまま題名にする
 *
 * @param {string} fileName
 * @param {string} [relativePath] フォルダつきのパス（input の webkitRelativePath など）
 * @returns {{ title: string, track?: number, disc?: number, artist?: string, album?: string }}
 */
export function parseFileName(fileName, relativePath) {
  const nfc = (s) => {
    try { return s.normalize('NFC'); } catch (e) { return s; }
  };
  const fromName = String(fileName == null ? '' : fileName).split(/[\\/]+/).filter(Boolean);
  const name = fromName.length ? fromName[fromName.length - 1] : '';

  // フォルダの並びを作る
  let dirs;
  if (relativePath) {
    dirs = String(relativePath).split(/[\\/]+/).filter(Boolean);
    const last = dirs[dirs.length - 1];
    if (dirs.length && (last === name || !name || STRIP_EXTENSIONS.has(extensionOf(last)))) dirs.pop();
  } else {
    dirs = fromName.slice(0, -1);
  }
  dirs = dirs.map((d) => nfc(d).trim()).filter((d) => d && d !== '.' && d !== '..');

  // 拡張子を取る
  let base = name || (relativePath ? baseNameOf(relativePath) : '');
  if (STRIP_EXTENSIONS.has(extensionOf(base))) base = base.slice(0, base.lastIndexOf('.'));
  base = nfc(base).trim();
  // "01_Artist_-_Title" のように空白のかわりに _ を使っている名前
  if (base.includes('_') && !/\s/.test(base)) base = base.replace(/_+/g, ' ').trim();

  const out = { title: base };
  let disc;
  let track;
  let artist;
  let album;

  // "Disc 1" "CD2" というフォルダはディスク番号として読んで、アルバム名からは外す
  if (dirs.length) {
    const m = /^(?:disc|disk|cd)\s*[-_]?\s*(\d{1,2})$/i.exec(dirs[dirs.length - 1]);
    if (m) {
      disc = parseInt(m[1], 10);
      dirs.pop();
    }
  }
  const folderArtist = dirs.length >= 2 ? dirs[dirs.length - 2] : undefined;
  const folderAlbum = dirs.length >= 1 ? dirs[dirs.length - 1] : undefined;

  // 「番号のうしろ」に残った部分を、アーティストと題名に分ける
  const splitRest = (rest) => {
    if (rest.length === 1) return { title: rest[0] };
    if (folderArtist !== undefined) {
      // アーティストはフォルダ名で分かっている。同じ名前が先頭にあれば取りのぞき、なければ全体を題名にする
      if (sameName(rest[0], folderArtist)) return { title: rest.slice(1).join(' - ') };
      return { title: rest.join(' - ') };
    }
    return { artist: rest[0], title: rest.slice(1).join(' - ') };
  };

  if (base && !/^\d+$/.test(base)) {
    const parts = base.split(/\s+[-–—]\s+/).map((s) => s.trim()).filter(Boolean);
    // まんなかに「番号だけ」の部分があるか（最後の部分は題名なので見ない）
    let at = -1;
    let token = null;
    for (let i = 0; i < parts.length - 1; i++) {
      token = trackToken(parts[i]);
      if (token) {
        at = i;
        break;
      }
    }
    let title;
    if (at >= 0) {
      track = token.track;
      if (token.disc) disc = token.disc;
      const before = parts.slice(0, at);
      const after = parts.slice(at + 1);
      if (before.length) {
        artist = before[0];
        if (before.length > 1) album = before.slice(1).join(' - ');
        title = after.join(' - ');
      } else {
        const r = splitRest(after);
        artist = r.artist;
        title = r.title;
      }
    } else if (parts.length) {
      const lead = leadingTrack(parts[0]);
      if (lead) {
        track = lead.track;
        if (lead.disc) disc = lead.disc;
        const r = splitRest([lead.rest.trim(), ...parts.slice(1)]);
        artist = r.artist;
        title = r.title;
      } else if (parts.length === 2) {
        artist = parts[0];
        title = parts[1];
      } else if (parts.length >= 3) {
        artist = parts[0];
        album = parts[1];
        title = parts.slice(2).join(' - ');
      } else {
        title = parts[0];
      }
    }
    if (title && title.trim()) out.title = title.trim();
  }

  if (track > 0) out.track = track;
  if (disc > 0) out.disc = disc;
  if (!artist && folderArtist) artist = folderArtist;
  if (!album && folderAlbum) album = folderAlbum;
  if (artist) out.artist = artist;
  if (album) out.album = album;
  return out;
}

// ============================================================
// バイト列を読む小道具
// ============================================================
// （範囲の外を読むと undefined になり、ビット演算では 0 としてあつかわれる。例外にはならない）

const u16be = (b, o) => ((b[o] << 8) | b[o + 1]) & 0xffff;
const u24be = (b, o) => ((b[o] << 16) | (b[o + 1] << 8) | b[o + 2]) & 0xffffff;
const u32be = (b, o) => ((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0;
const u16le = (b, o) => ((b[o + 1] << 8) | b[o]) & 0xffff;
const u32le = (b, o) => ((b[o + 3] << 24) | (b[o + 2] << 16) | (b[o + 1] << 8) | b[o]) >>> 0;
const u64be = (b, o) => u32be(b, o) * 4294967296 + u32be(b, o + 4);
const u64le = (b, o) => u32le(b, o + 4) * 4294967296 + u32le(b, o);
/** ID3 の synchsafe 整数（各バイトの下位7ビットだけを使う） */
const synchsafe = (b, o) => ((b[o] & 0x7f) << 21) | ((b[o + 1] & 0x7f) << 14) | ((b[o + 2] & 0x7f) << 7) | (b[o + 3] & 0x7f);

/** 4文字の目じるし（'moov' や 'fmt ' など）を文字列にする */
function fourcc(b, o) {
  return String.fromCharCode(b[o] || 0, b[o + 1] || 0, b[o + 2] || 0, b[o + 3] || 0);
}

/** バイト列の o 番目からが text（ASCII）と同じか */
function matches(b, o, text) {
  if (o < 0 || o + text.length > b.length) return false;
  for (let i = 0; i < text.length; i++) {
    if (b[o + i] !== text.charCodeAt(i)) return false;
  }
  return true;
}

/** ASCII の文字列にする（短い目じるし用） */
function asciiText(b, start, end) {
  let s = '';
  const stop = Math.min(end, b.length);
  for (let i = start; i < stop; i++) s += String.fromCharCode(b[i]);
  return s;
}

/** いくつかのバイト列をひとつにつなぐ */
function concatBytes(parts, total) {
  if (parts.length === 1) return parts[0];
  const out = new Uint8Array(total);
  let at = 0;
  for (const p of parts) {
    out.set(p.subarray(0, Math.min(p.length, total - at)), at);
    at += p.length;
    if (at >= total) break;
  }
  return out;
}

/** 大きなバッファの一部を指しているだけの配列を、ぴったりの大きさの配列に作りなおす */
function tight(bytes) {
  if (bytes.byteOffset === 0 && bytes.byteLength === bytes.buffer.byteLength) return bytes;
  return bytes.slice();
}

/** Blob の一部を ArrayBuffer にする（arrayBuffer() が無い古い環境では FileReader を使う） */
function readBlob(part) {
  if (typeof part.arrayBuffer === 'function') return part.arrayBuffer();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error('ファイルを読めませんでした'));
    reader.readAsArrayBuffer(part);
  });
}

// ============================================================
// 読みこみ係（ファイルの「いる所だけ」を読む）
// ============================================================

/**
 * Blob から必要な範囲だけを読む。
 * いちど読んだ所は少しのあいだ手もとに残して、同じ所を何度も読みに行かないようにする。
 * 読んだ合計と回数に上限があり、こえると例外を投げる（parseTags がつかまえて、読めた分だけ返す）。
 */
class Reader {
  constructor(blob) {
    this.blob = blob;
    this.size = Math.max(0, Number(blob && blob.size) || 0);
    this.chunks = []; // { start, bytes }
    this.total = 0;
    this.reads = 0;
  }

  /** 手もとに残っている分から探す。無ければ null */
  cached(offset, length) {
    for (let i = this.chunks.length - 1; i >= 0; i--) {
      const c = this.chunks[i];
      const at = offset - c.start;
      if (at >= 0 && at + length <= c.bytes.length) return c.bytes.subarray(at, at + length);
    }
    return null;
  }

  /** 実際にファイルから読む */
  async load(offset, length) {
    if (this.reads >= MAX_READS || this.total + length > MAX_TOTAL_BYTES) {
      throw new Error('このファイルから読む量の上限をこえました');
    }
    this.reads++;
    this.total += length;
    const buffer = await readBlob(this.blob.slice(offset, offset + length));
    return new Uint8Array(buffer);
  }

  /**
   * offset から length バイトを返す（ファイルの終わりをこえる分は切りつめる）。
   * 返すのは手もとのバッファの一部なので、書きかえてはいけない。
   * ahead は「どうせ読むなら、ここまでまとめて読む」量。
   */
  async get(offset, length, ahead = READ_AHEAD) {
    if (!(offset >= 0) || !(length > 0) || offset >= this.size) return EMPTY;
    length = Math.min(length, this.size - offset);
    const hit = this.cached(offset, length);
    if (hit) return hit;
    const want = Math.min(Math.max(length, ahead), this.size - offset);
    const bytes = await this.load(offset, want);
    if (bytes.length <= CACHE_CHUNK_MAX) {
      this.chunks.push({ start: offset, bytes });
      // 先頭のかたまりはよく使うので残し、その次に古いものから捨てる
      if (this.chunks.length > CACHE_CHUNKS) this.chunks.splice(1, 1);
    }
    return bytes.length > length ? bytes.subarray(0, length) : bytes;
  }

  /**
   * offset から、手もとにある分をできるだけ長く（max まで）返す。
   * 手もとに min バイトも無ければ読みに行く。
   */
  async window(offset, min, max) {
    if (!(offset >= 0) || offset >= this.size) return EMPTY;
    max = Math.min(max, this.size - offset);
    min = Math.min(min, max);
    for (let i = this.chunks.length - 1; i >= 0; i--) {
      const c = this.chunks[i];
      const at = offset - c.start;
      if (at >= 0 && at + min <= c.bytes.length) return c.bytes.subarray(at, Math.min(c.bytes.length, at + max));
    }
    return this.get(offset, max);
  }

  /** offset から length バイトを、ぴったりの大きさの新しい配列で返す（ジャケット画像用） */
  async exact(offset, length) {
    if (!(offset >= 0) || !(length > 0) || offset >= this.size) return EMPTY;
    length = Math.min(length, this.size - offset);
    const hit = this.cached(offset, length);
    if (hit) return hit.slice();
    return this.load(offset, length);
  }
}

/** すでにメモリにあるバイト列を、Reader と同じ使い方で読むためのもの */
class MemReader {
  constructor(bytes) {
    this.bytes = bytes;
    this.size = bytes.length;
  }

  get(offset, length) {
    if (!(offset >= 0) || !(length > 0) || offset >= this.size) return EMPTY;
    return this.bytes.subarray(offset, Math.min(this.size, offset + length));
  }

  exact(offset, length) {
    return this.get(offset, length).slice();
  }
}

/** 失敗しても先へ進む（その部分だけあきらめる） */
async function quietly(fn) {
  try {
    await fn();
  } catch (e) {
    // 読めた分だけ使う
  }
}

// ============================================================
// 文字コード
// ============================================================

const decoders = new Map();

/** TextDecoder を使い回す。その文字コードが使えない環境では null */
function getDecoder(label, fatal) {
  const key = label + (fatal ? '!' : '');
  if (!decoders.has(key)) {
    let d = null;
    try {
      d = new TextDecoder(label, { fatal });
    } catch (e) {
      d = null;
    }
    decoders.set(key, d);
  }
  return decoders.get(key);
}

/** 厳密に読む。おかしなバイトがあれば null */
function strictDecode(label, bytes) {
  const d = getDecoder(label, true);
  if (!d) return null;
  try {
    return d.decode(bytes);
  } catch (e) {
    return null;
  }
}

function isAscii(bytes) {
  for (let i = 0; i < bytes.length; i++) {
    if (bytes[i] >= 0x80) return false;
  }
  return true;
}

/** 欧文（Latin-1。実際には Windows-1252）として読む。かならず読める */
function latin1(bytes) {
  const d = getDecoder('windows-1252', false);
  if (d) return d.decode(bytes);
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return s;
}

/** UTF-16 として読む */
function utf16(bytes, littleEndian) {
  const n = bytes.length - (bytes.length % 2);
  if (n <= 0) return '';
  let src = bytes.subarray(0, n);
  if (!littleEndian) {
    // ビッグエンディアンは、バイトを入れかえてからリトルエンディアンとして読む
    const swapped = new Uint8Array(n);
    for (let i = 0; i < n; i += 2) {
      swapped[i] = src[i + 1];
      swapped[i + 1] = src[i];
    }
    src = swapped;
  }
  const d = getDecoder('utf-16le', false);
  if (d) return d.decode(src);
  let s = '';
  for (let i = 0; i < n; i += 2) s += String.fromCharCode(src[i] | (src[i + 1] << 8));
  return s;
}

/** BOM の無い UTF-16 の並び順を当てる（0 のバイトが奇数番目に多ければリトルエンディアン） */
function guessLittleEndian(bytes) {
  let even = 0;
  let odd = 0;
  for (let i = 0; i + 1 < bytes.length; i += 2) {
    if (bytes[i] === 0) even++;
    if (bytes[i + 1] === 0) odd++;
  }
  return odd >= even;
}

/**
 * 「欧文らしい」バイト列かどうか。
 * アクセントつきの文字（0xC0〜0xFF）がアルファベットの中にぽつぽつ混ざっているだけなら欧文とみなす。
 * （"Björk" や "Édith Piaf" が、たまたま Shift_JIS としても読めてしまって化けるのを防ぐ。
 *   日本語の Shift_JIS にはほぼ必ず 0x80〜0xBF のバイトが入るので、ここには当てはまらない）
 */
function looksWestern(bytes) {
  let letters = 0;
  let high = 0;
  let run = 0;
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i];
    if (b >= 0x80) {
      if (b < 0xc0 || b === 0xd7 || b === 0xf7) return false;
      high++;
      if (++run > 2) return false;
    } else {
      run = 0;
      const c = b | 0x20;
      if (c >= 0x61 && c <= 0x7a) letters++;
    }
  }
  return high > 0 && letters >= high;
}

/** 外字や「読めなかった印」が混ざっていたら、その読み方はまちがい */
const BAD_CHARS = /[\uE000-\uF8FF\uFFFD]/;

/**
 * 文字コードが書かれていない（または当てにならない）8ビットの文字列を読む。
 *   UTF-8 として厳密に読める → UTF-8
 *   だめなら Shift_JIS として厳密に読める → Shift_JIS（日本の古い MP3 に多い）
 *   どちらもだめ → Latin-1
 * mayBeCut は「決まった長さで切られているかもしれない」とき（ID3v1）。最後の文字が半分で切れていてもよい。
 */
function decodeGuess(bytes, mayBeCut) {
  if (isAscii(bytes)) return asciiText(bytes, 0, bytes.length);

  let s = strictDecode('utf-8', bytes);
  if (s === null && mayBeCut) {
    for (let cut = 1; cut <= 3 && cut < bytes.length && s === null; cut++) {
      const head = bytes.subarray(0, bytes.length - cut);
      if (!isAscii(head)) s = strictDecode('utf-8', head);
    }
  }
  if (s !== null) return s;

  if (!looksWestern(bytes)) {
    s = strictDecode('shift_jis', bytes);
    if (s === null && mayBeCut && bytes.length > 1) {
      const last = bytes[bytes.length - 1];
      const head = bytes.subarray(0, bytes.length - 1);
      if (((last >= 0x81 && last <= 0x9f) || (last >= 0xe0 && last <= 0xfc)) && !isAscii(head) && !looksWestern(head)) {
        s = strictDecode('shift_jis', head);
      }
    }
    if (s !== null && !BAD_CHARS.test(s)) return s;
  }
  return latin1(bytes);
}

/** UTF-8 のはずの文字列を読む。UTF-8 として読めなければ、ほかの文字コードを試す */
function decodeUtf8(bytes) {
  const s = strictDecode('utf-8', bytes);
  return s !== null ? s : decodeGuess(bytes, false);
}

/** 前後の空白と NUL（と BOM）を落とす */
function clean(value) {
  if (typeof value !== 'string') return '';
  return value.replace(/^[\s\0\uFEFF]+|[\s\0\uFEFF]+$/g, '');
}

/** 歌詞用：改行をそろえてから前後を整える */
function cleanLyrics(value) {
  return clean(String(value).replace(/\r\n?/g, '\n'));
}

// ============================================================
// 結果に値を入れる小道具（先に入った値を優先し、空の値は入れない）
// ============================================================

function setText(tags, key, value) {
  if (tags[key] !== undefined) return;
  const s = key === 'lyrics' ? cleanLyrics(value) : clean(value);
  if (s) tags[key] = s;
}

function setNumber(tags, key, value) {
  if (tags[key] !== undefined) return;
  if (Number.isInteger(value) && value > 0 && value < 100000) tags[key] = value;
}

function setDuration(tags, seconds) {
  if (tags.duration !== undefined) return;
  if (Number.isFinite(seconds) && seconds > 0 && seconds < 1e7) tags.duration = seconds;
}

/** "3/12" "03" "3 of 12" → [3, 12]（分からない所は NaN） */
function numberPair(text) {
  const m = /^\s*(\d{1,5})(?:\s*(?:\/|of)\s*(\d{1,5}))?/i.exec(String(text));
  if (!m) return [NaN, NaN];
  return [parseInt(m[1], 10), m[2] ? parseInt(m[2], 10) : NaN];
}

function setTrack(tags, text) {
  const [n, total] = numberPair(text);
  setNumber(tags, 'track', n);
  setNumber(tags, 'trackTotal', total);
}

function setDisc(tags, text) {
  const [n, total] = numberPair(text);
  setNumber(tags, 'disc', n);
  setNumber(tags, 'discTotal', total);
}

/** "2019" "2019-07-01" "01/07/2019" "20190701" → 2019（分からなければ NaN） */
function yearOf(text) {
  const s = String(text == null ? '' : text);
  let m = /(?:^|\D)(\d{4})(?!\d)/.exec(s);
  if (!m) m = /^\s*(\d{4})\d{4}(?!\d)/.exec(s);
  const y = m ? parseInt(m[1], 10) : NaN;
  return y > 0 ? y : NaN;
}

/** "1" "true" "yes" なら true */
function isTruthy(text) {
  return /^(1|true|yes)$/i.test(clean(String(text)));
}

// ============================================================
// ジャケット画像
// ============================================================

/** 画像の先頭バイトから種類を当てる。分からなければ空文字 */
function sniffImage(d, o) {
  if (o < 0 || o + 4 > d.length) return '';
  if (d[o] === 0xff && d[o + 1] === 0xd8 && d[o + 2] === 0xff) return 'image/jpeg';
  if (d[o] === 0x89 && d[o + 1] === 0x50 && d[o + 2] === 0x4e && d[o + 3] === 0x47) return 'image/png';
  if (matches(d, o, 'GIF8')) return 'image/gif';
  if (matches(d, o, 'RIFF') && matches(d, o + 8, 'WEBP')) return 'image/webp';
  if (matches(d, o, 'BM') && o + 14 <= d.length && u32le(d, o + 6) === 0) return 'image/bmp';
  if (matches(d, o + 4, 'ftyp')) {
    const brand = fourcc(d, o + 8);
    if (brand === 'avif' || brand === 'avis') return 'image/avif';
    if (/^(heic|heix|heim|heis|hevc|hevx|mif1|msf1)$/.test(brand)) return 'image/heic';
  }
  if (matches(d, o, 'II*\0') || matches(d, o, 'MM\0*')) return 'image/tiff';
  return '';
}

/** 画像の MIME を決める。先頭バイトで分かればそれを使い、だめならタグに書いてあった値を整えて使う */
function pictureMime(declared, data) {
  const sniffed = sniffImage(data, 0);
  if (sniffed) return sniffed;
  let m = clean(String(declared || '')).toLowerCase();
  if (m === 'jpg' || m === 'jpeg' || m === 'image/jpg') return 'image/jpeg';
  if (/^image\/[a-z0-9.+-]+$/.test(m)) return m;
  if (/^[a-z0-9]{3,4}$/.test(m)) return 'image/' + m;
  return 'image/jpeg';
}

/** 画像（JPEG / PNG）の始まりらしい場所を探す。無ければ -1 */
function findImageStart(d, from) {
  for (let i = Math.max(0, from); i + 4 <= d.length; i++) {
    if (d[i] === 0xff && d[i + 1] === 0xd8 && d[i + 2] === 0xff) return i;
    if (d[i] === 0x89 && d[i + 1] === 0x50 && d[i + 2] === 0x4e && d[i + 3] === 0x47) return i;
  }
  return -1;
}

/**
 * ジャケットの候補をためておき、最後に1枚だけ読む。
 * 表ジャケット（種類 3）があればそれを、なければ最初に見つけたものを使う。
 * 候補の段階では画像そのものは読まない（むだに大きなデータを読まないため）。
 */
class PictureChoice {
  constructor(enabled, max) {
    this.enabled = enabled;
    this.max = max;
    this.list = [];
  }

  /** load は { mime, data } か null を返す非同期関数 */
  offer(type, load) {
    if (this.enabled && this.list.length < 32) this.list.push({ type, load });
  }

  async resolve(tags) {
    if (tags.picture || !this.list.length) return;
    const front = this.list.findIndex((c) => c.type === 3);
    const order = front > 0 ? [this.list[front], ...this.list.filter((c, i) => i !== front)] : this.list;
    this.list = [];
    for (const candidate of order) {
      let found = null;
      try {
        found = await candidate.load();
      } catch (e) {
        found = null;
      }
      if (found && found.data && found.data.length > 0) {
        const data = tight(found.data);
        tags.picture = { mime: pictureMime(found.mime, data), data };
        return;
      }
    }
  }
}

// ============================================================
// ID3（MP3 のタグ。WAV / AIFF / AAC / FLAC にも付いていることがある）
// ============================================================

/** ID3v1 のジャンル番号 → 名前 */
const GENRES = [
  'Blues', 'Classic Rock', 'Country', 'Dance', 'Disco', 'Funk', 'Grunge', 'Hip-Hop', 'Jazz', 'Metal',
  'New Age', 'Oldies', 'Other', 'Pop', 'R&B', 'Rap', 'Reggae', 'Rock', 'Techno', 'Industrial',
  'Alternative', 'Ska', 'Death Metal', 'Pranks', 'Soundtrack', 'Euro-Techno', 'Ambient', 'Trip-Hop', 'Vocal', 'Jazz+Funk',
  'Fusion', 'Trance', 'Classical', 'Instrumental', 'Acid', 'House', 'Game', 'Sound Clip', 'Gospel', 'Noise',
  'Alternative Rock', 'Bass', 'Soul', 'Punk', 'Space', 'Meditative', 'Instrumental Pop', 'Instrumental Rock', 'Ethnic', 'Gothic',
  'Darkwave', 'Techno-Industrial', 'Electronic', 'Pop-Folk', 'Eurodance', 'Dream', 'Southern Rock', 'Comedy', 'Cult', 'Gangsta',
  'Top 40', 'Christian Rap', 'Pop/Funk', 'Jungle', 'Native American', 'Cabaret', 'New Wave', 'Psychedelic', 'Rave', 'Showtunes',
  'Trailer', 'Lo-Fi', 'Tribal', 'Acid Punk', 'Acid Jazz', 'Polka', 'Retro', 'Musical', 'Rock & Roll', 'Hard Rock',
  'Folk', 'Folk-Rock', 'National Folk', 'Swing', 'Fast Fusion', 'Bebop', 'Latin', 'Revival', 'Celtic', 'Bluegrass',
  'Avantgarde', 'Gothic Rock', 'Progressive Rock', 'Psychedelic Rock', 'Symphonic Rock', 'Slow Rock', 'Big Band', 'Chorus', 'Easy Listening', 'Acoustic',
  'Humour', 'Speech', 'Chanson', 'Opera', 'Chamber Music', 'Sonata', 'Symphony', 'Booty Bass', 'Primus', 'Porn Groove',
  'Satire', 'Slow Jam', 'Club', 'Tango', 'Samba', 'Folklore', 'Ballad', 'Power Ballad', 'Rhythmic Soul', 'Freestyle',
  'Duet', 'Punk Rock', 'Drum Solo', 'A Cappella', 'Euro-House', 'Dance Hall', 'Goa', 'Drum & Bass', 'Club-House', 'Hardcore',
  'Terror', 'Indie', 'BritPop', 'Afro-Punk', 'Polsk Punk', 'Beat', 'Christian Gangsta Rap', 'Heavy Metal', 'Black Metal', 'Crossover',
  'Contemporary Christian', 'Christian Rock', 'Merengue', 'Salsa', 'Thrash Metal', 'Anime', 'J-Pop', 'Synthpop', 'Abstract', 'Art Rock',
  'Baroque', 'Bhangra', 'Big Beat', 'Breakbeat', 'Chillout', 'Downtempo', 'Dub', 'EBM', 'Eclectic', 'Electro',
  'Electroclash', 'Emo', 'Experimental', 'Garage', 'Global', 'IDM', 'Illbient', 'Industro-Goth', 'Jam Band', 'Krautrock',
  'Leftfield', 'Lounge', 'Math Rock', 'New Romantic', 'Nu-Breakz', 'Post-Punk', 'Post-Rock', 'Psytrance', 'Shoegaze', 'Space Rock',
  'Trop Rock', 'World Music', 'Neoclassical', 'Audiobook', 'Audio Theatre', 'Neue Deutsche Welle', 'Podcast', 'Indie Rock', 'G-Funk', 'Dubstep',
  'Garage Rock', 'Psybient',
];

function genreName(n) {
  return Number.isInteger(n) && n >= 0 && n < GENRES.length ? GENRES[n] : '';
}

/**
 * ID3 のジャンルの書き方を名前になおす。
 *   "(13)" → "Pop"　　"13" → "Pop"　　"(13)Pop" → "Pop"　　"(4)Eurodisco" → "Eurodisco"
 *   "(RX)" → "Remix"　"(CR)" → "Cover"　　ふつうの名前はそのまま
 */
function id3Genre(text) {
  let s = clean(text);
  const names = [];
  const add = (name) => {
    if (name && !names.some((x) => x.toLowerCase() === name.toLowerCase())) names.push(name);
  };
  const special = (code) => (code === 'RX' ? 'Remix' : code === 'CR' ? 'Cover' : genreName(parseInt(code, 10)));
  for (let i = 0; i < 16; i++) {
    const m = /^\((\d{1,3}|RX|CR)\)/.exec(s);
    if (!m) break;
    add(special(m[1]));
    s = s.slice(m[0].length);
  }
  if (s.startsWith('((')) s = s.slice(1);
  s = clean(s);
  if (s) {
    if (/^\d{1,3}$/.test(s) || s === 'RX' || s === 'CR') add(special(s));
    else return s; // 名前が書いてあれば、それがいちばん正確
  }
  return names.join(' / ');
}

// フレームの名前 → 何として読むか
const ID3_FRAMES = {
  TIT2: 'title', TT2: 'title',
  TPE1: 'artist', TP1: 'artist',
  TALB: 'album', TAL: 'album',
  TPE2: 'albumArtist', TP2: 'albumArtist',
  TCOM: 'composer', TCM: 'composer',
  TSOT: 'sortTitle', XSOT: 'sortTitle', TST: 'sortTitle',
  TSOP: 'sortArtist', XSOP: 'sortArtist', TSP: 'sortArtist',
  TSOA: 'sortAlbum', XSOA: 'sortAlbum', TSA: 'sortAlbum',
  TSO2: 'sortAlbumArtist', TS2: 'sortAlbumArtist',
  TCON: 'genre', TCO: 'genre',
  TRCK: 'track', TRK: 'track',
  TPOS: 'disc', TPA: 'disc',
  TCMP: 'compilation', TCP: 'compilation',
  USLT: 'lyrics', ULT: 'lyrics',
  APIC: 'picture', PIC: 'picture',
  TXXX: 'user', TXX: 'user',
  // 年は書き方がいくつもある。数字が小さいほど優先
  TDRC: 'year0', TYER: 'year1', TYE: 'year1', TDRL: 'year2', TDOR: 'year3', TORY: 'year3', TOR: 'year3', TDAT: 'year4', TDA: 'year4',
};

/** ID3v2 のヘッダらしいか（"ID3" + 版 + 旗 + synchsafe の大きさ） */
function isId3v2Header(h) {
  return h.length >= 10 && h[0] === 0x49 && h[1] === 0x44 && h[2] === 0x33
    && h[3] !== 0xff && h[4] !== 0xff && ((h[6] | h[7] | h[8] | h[9]) & 0x80) === 0;
}

/** ID3v2 タグ全体の長さ（ヘッダ 10 バイト + 中身 + あればフッタ 10 バイト） */
function id3v2Length(h) {
  return 10 + synchsafe(h, 6) + (h[3] >= 4 && (h[5] & 0x10) ? 10 : 0);
}

/**
 * 非同期化（unsynchronisation）を元に戻す：FF 00 → FF。
 * 「FF のあとに E0 以上」が見つかったら、じつは非同期化されていないデータなので、そのまま返す
 * （旗だけ立っているこわれたタグで、JPEG の中身をこわさないため）。
 */
function removeUnsync(src) {
  const n = src.length;
  let changes = 0;
  for (let i = 0; i + 1 < n; i++) {
    if (src[i] !== 0xff) continue;
    const next = src[i + 1];
    if (next >= 0xe0) return src;
    if (next === 0) changes++;
  }
  if (!changes) return src;
  const out = new Uint8Array(n - changes);
  let j = 0;
  for (let i = 0; i < n; i++) {
    const b = src[i];
    out[j++] = b;
    if (b === 0xff && i + 1 < n && src[i + 1] === 0) i++;
  }
  return out.subarray(0, j);
}

/** フレームの名前として正しいか（大文字と数字。4文字目だけは空白や NUL も大目に見る） */
function isFrameId(h, idLen) {
  if (h.length < idLen) return false;
  for (let i = 0; i < idLen; i++) {
    const c = h[i];
    const upper = c >= 0x41 && c <= 0x5a;
    const digit = c >= 0x30 && c <= 0x39;
    if (upper || (digit && i > 0)) continue;
    if (i === 3 && (c === 0x20 || c === 0)) continue;
    return false;
  }
  return true;
}

/** その場所が「次のフレームの始まり」か「詰め物（0 の並び）」か「タグの終わり」らしいか */
async function frameLikeAt(body, pos, end, idLen) {
  if (pos === end) return true;
  if (pos > end) return false;
  const h = await body.get(pos, Math.min(10, end - pos));
  if (!h.length) return false;
  let zeros = true;
  for (let i = 0; i < h.length; i++) {
    if (h[i] !== 0) {
      zeros = false;
      break;
    }
  }
  if (zeros) return true;
  return h.length >= idLen && h[0] !== 0 && isFrameId(h, idLen);
}

/**
 * ID3v2.4 のフレームの大きさを決める。
 * 決まりでは synchsafe だが、昔の iTunes などはふつうの 32 ビット整数で書いていた。
 * 両方の読み方で「次のフレームにきちんと着地するほう」を選ぶ。
 */
async function id3v24FrameSize(body, pos, fh, end) {
  const plain = u32be(fh, 4);
  if ((fh[4] | fh[5] | fh[6] | fh[7]) & 0x80) return plain; // synchsafe ではありえない
  const safe = synchsafe(fh, 4);
  if (safe === plain) return safe;
  if (await frameLikeAt(body, pos + 10 + safe, end, 4)) return safe;
  if (await frameLikeAt(body, pos + 10 + plain, end, 4)) return plain;
  return safe;
}

/**
 * ID3 の文字列（NUL で区切られていることがある）を、ひとつずつ読んで並べる。
 * enc: 0 = ISO-8859-1（と書いてあるが Shift_JIS や UTF-8 のことも多い）、1 = UTF-16（BOM つき）、
 *      2 = UTF-16BE、3 = UTF-8
 */
function id3Strings(d, enc) {
  const out = [];
  if (enc === 1 || enc === 2) {
    let little = enc === 1;
    let known = enc === 2;
    const piece = (a, b) => {
      let s = a;
      if (b - s >= 2) {
        if (d[s] === 0xff && d[s + 1] === 0xfe) {
          little = true;
          known = true;
          s += 2;
        } else if (d[s] === 0xfe && d[s + 1] === 0xff) {
          little = false;
          known = true;
          s += 2;
        } else if (!known) {
          little = guessLittleEndian(d.subarray(s, b));
          known = true;
        }
      }
      return utf16(d.subarray(s, b), little);
    };
    let start = 0;
    for (let i = 0; i + 1 < d.length; i += 2) {
      if (d[i] === 0 && d[i + 1] === 0) {
        out.push(piece(start, i));
        start = i + 2;
      }
    }
    out.push(piece(start, d.length));
  } else {
    const dec = enc === 3 ? decodeUtf8 : (bytes) => decodeGuess(bytes, false);
    let start = 0;
    for (let i = 0; i < d.length; i++) {
      if (d[i] === 0) {
        out.push(dec(d.subarray(start, i)));
        start = i + 1;
      }
    }
    out.push(dec(d.subarray(start)));
  }
  return out;
}

/** 文字列の終わり（NUL）の次の位置。見つからなければ -1 */
function afterTerminator(d, from, enc) {
  if (enc === 1 || enc === 2) {
    for (let i = from; i + 1 < d.length; i += 2) {
      if (d[i] === 0 && d[i + 1] === 0) return i + 2;
    }
    return -1;
  }
  const z = d.indexOf(0, from);
  return z < 0 ? -1 : z + 1;
}

/**
 * 画像フレーム（APIC / PIC）の先頭を読んで、種類と「画像がどこから始まるか」を調べる。
 * d はフレームの中身の先頭部分（画像の全部は要らない）。
 */
function pictureFrameInfo(d, v22) {
  if (d.length < 6) return null;
  const enc = d[0];
  let p;
  let mime;
  if (v22) {
    mime = asciiText(d, 1, 4); // 'JPG' 'PNG' など3文字
    p = 4;
  } else {
    const z = d.indexOf(0, 1);
    if (z < 0 || z > 128) return null;
    mime = latin1(d.subarray(1, z));
    p = z + 1;
  }
  if (clean(mime) === '-->') return null; // 画像そのものではなく、置き場所（URL）が書いてあるだけ
  if (p >= d.length) return null;
  const type = d[p++];
  let offset = afterTerminator(d, p, enc);
  if (offset < 0 || !sniffImage(d, offset)) {
    // 説明文の終わり方がおかしいファイルにそなえて、画像の始まりらしい所を探しなおす
    const found = findImageStart(d, p);
    if (found >= 0) offset = found;
    else if (offset < 0) return null;
  }
  return { mime, type, offset };
}

/** フレームをひとつ読む */
async function readId3Frame(body, id, dataPos, len, whole, major, fflags, tagUnsync, tags, choice, state) {
  const kind = ID3_FRAMES[id];
  if (!kind) return;

  // フレームごとの旗
  let unsync = false;
  let extra = 0; // 中身の前につく、おまけのバイト数
  if (major === 3) {
    if (fflags & 0x00c0) return; // 圧縮・暗号化は読めない
    if (fflags & 0x0020) extra += 1;
  } else if (major === 4) {
    if (fflags & 0x000c) return;
    unsync = tagUnsync || (fflags & 0x0002) !== 0;
    if (fflags & 0x0040) extra += 1;
    if (fflags & 0x0001) extra += 4; // データ長指示子
  }

  if (kind === 'picture') {
    if (!choice.enabled || !whole || len > choice.max + KB) return;
    let head = await body.get(dataPos, Math.min(len, KB));
    if (unsync) head = removeUnsync(head);
    const info = pictureFrameInfo(head.subarray(extra), major === 2);
    if (!info) return;
    choice.offer(info.type, async () => {
      if (!unsync) {
        const at = dataPos + extra + info.offset;
        const n = len - extra - info.offset;
        if (n <= 0) return null;
        return { mime: info.mime, data: await body.exact(at, n) };
      }
      // 非同期化されているときは、フレーム全体を読んで元に戻してから切り出す
      const all = removeUnsync(await body.get(dataPos, len, 0)).subarray(extra);
      const again = pictureFrameInfo(all, major === 2) || info;
      return { mime: again.mime, data: all.subarray(again.offset) };
    });
    return;
  }

  // 途中で切れたフレームからは文字を取らない（半端な題名などを出さないため）
  if (!whole || len > MAX_TEXT_BYTES) return;
  let d = await body.get(dataPos, len);
  if (unsync) d = removeUnsync(d);
  d = d.subarray(extra);
  if (d.length < 2) return;
  const enc = d[0];

  if (kind === 'lyrics') {
    // 文字コード(1) 言語(3) 説明(NUL まで) 歌詞
    if (tags.lyrics !== undefined || d.length < 5) return;
    const parts = id3Strings(d.subarray(4), enc);
    const text = parts.length > 1 ? parts.slice(1).join('\n') : parts[0];
    setText(tags, 'lyrics', text);
    return;
  }

  if (kind === 'user') {
    // 文字コード(1) 名前(NUL まで) 値
    const parts = id3Strings(d.subarray(1), enc).map(clean);
    const name = (parts[0] || '').toUpperCase();
    const value = parts.slice(1).find(Boolean);
    if (!value) return;
    // 正式なフレーム（TSO2 / TPE2）があればそちらを優先したいので、あとでまとめて入れる
    if (name === 'ALBUMARTISTSORT') state.later.push(['sortAlbumArtist', value]);
    else if (name === 'ALBUM ARTIST' || name === 'ALBUMARTIST') state.later.push(['albumArtist', value]);
    return;
  }

  const values = id3Strings(d.subarray(1), enc).map(clean).filter(Boolean);
  if (!values.length) return;
  // v2.4 は NUL 区切りで値をいくつも書ける。v2.2 / v2.3 は最初の値だけが本物
  const text = major === 4 ? values.join(' / ') : values[0];

  if (kind === 'genre') {
    const names = [];
    for (const v of major === 4 ? values : [values[0]]) {
      const g = id3Genre(v);
      if (g && !names.includes(g)) names.push(g);
    }
    setText(tags, 'genre', names.join(' / '));
  } else if (kind === 'track') {
    setTrack(tags, values[0]);
  } else if (kind === 'disc') {
    setDisc(tags, values[0]);
  } else if (kind === 'compilation') {
    if (tags.compilation === undefined && isTruthy(values[0])) tags.compilation = true;
  } else if (kind.startsWith('year')) {
    const rank = kind.charCodeAt(4) - 48;
    // TDAT は「日と月」（4けた）なので、年まで書いてある長い値のときだけ使う
    if (rank === 4 && values[0].length <= 4) return;
    const y = yearOf(values[0]);
    if (y > 0 && rank < state.yearRank) {
      state.yearRank = rank;
      state.year = y;
    }
  } else {
    setText(tags, kind, text);
  }
}

/** ID3v2 の中身（フレームの並び）を読む */
async function readId3v2Body(src, pos, end, major, flags, tags, choice) {
  let body = src;
  const tagUnsync = (flags & 0x80) !== 0;

  if (tagUnsync && major < 4) {
    // v2.2 / v2.3 はタグ全体が非同期化されている。まとめて読んで元に戻す
    const raw = await src.get(pos, Math.min(end - pos, MAX_WHOLE_TAG_BYTES), 0);
    const fixed = removeUnsync(raw);
    body = new MemReader(fixed);
    pos = 0;
    end = fixed.length;
  }

  const idLen = major === 2 ? 3 : 4;
  const headLen = major === 2 ? 6 : 10;

  // 拡張ヘッダがあれば飛ばす
  if (major >= 3 && (flags & 0x40)) {
    const x = await body.get(pos, 10);
    if (x.length >= 4) {
      // v2.4 は「自分をふくむ長さ（synchsafe）」、v2.3 は「自分の4バイトをのぞく長さ」
      const skip = major === 4 ? synchsafe(x, 0) : u32be(x, 0) + 4;
      const there = skip >= 6 && pos + skip <= end && (await frameLikeAt(body, pos + skip, end, idLen));
      if (there) pos += skip;
      else if (!(x[0] !== 0 && isFrameId(x, idLen)) && skip >= 6 && pos + skip <= end) pos += skip;
      // どちらでもなければ「拡張ヘッダあり」の旗がまちがっているとみなして、そのまま読む
    }
  }

  // 年（いちばん優先度の高い書き方のもの）と、あとで入れる値をためておく
  const state = { yearRank: 99, year: NaN, later: [] };
  for (let n = 0; n < MAX_ID3_FRAMES && pos + headLen <= end; n++) {
    const fh = await body.get(pos, headLen);
    if (fh.length < headLen || fh[0] === 0 || !isFrameId(fh, idLen)) break; // 詰め物か、こわれている

    let id = asciiText(fh, 0, idLen);
    if (idLen === 4 && (fh[3] === 0x20 || fh[3] === 0)) id = id.slice(0, 3); // 3文字の名前を4文字の枠に入れたもの

    let size;
    let fflags = 0;
    if (major === 2) {
      size = u24be(fh, 3);
    } else {
      fflags = u16be(fh, 8);
      size = major === 4 ? await id3v24FrameSize(body, pos, fh, end) : u32be(fh, 4);
    }
    const dataPos = pos + headLen;
    const avail = Math.min(size, end - dataPos);
    if (avail > 0) {
      await quietly(() => readId3Frame(body, id, dataPos, avail, avail === size, major, fflags, tagUnsync, tags, choice, state));
    }
    const next = dataPos + size;
    if (!(next > pos)) break;
    pos = next;
  }

  setNumber(tags, 'year', state.year);
  for (const [key, value] of state.later) setText(tags, key, value);
}

/**
 * start にある ID3v2 タグを読む。タグの終わりの位置を返す（タグでなければ start のまま）。
 * limit は「ここより先は読まない」位置（ファイルの終わりや、チャンクの終わり）。
 */
async function parseId3v2(src, start, limit, tags, choice) {
  const head = await src.get(start, 10);
  if (!isId3v2Header(head)) return start;
  const major = head[3];
  const flags = head[5];
  const tagEnd = Math.min(limit, start + id3v2Length(head));
  const bodyEnd = Math.min(limit, start + 10 + synchsafe(head, 6));
  if (major < 2 || major > 4) return tagEnd; // 知らない版は飛ばすだけ
  if (major === 2 && (flags & 0x40)) return tagEnd; // 「圧縮」つきの v2.2 は読み方が決まっていない
  await quietly(() => readId3v2Body(src, start + 10, bodyEnd, major, flags, tags, choice));
  return tagEnd;
}

/** 末尾 128 バイトの ID3v1 / v1.1 を読む。あれば true */
function parseId3v1(t, tags) {
  if (t.length < 128 || t[0] !== 0x54 || t[1] !== 0x41 || t[2] !== 0x47) return false; // "TAG"
  const field = (o, n) => {
    let e = o;
    while (e < o + n && t[e] !== 0) e++;
    return decodeGuess(t.subarray(o, e), e === o + n);
  };
  setText(tags, 'title', field(3, 30));
  setText(tags, 'artist', field(33, 30));
  setText(tags, 'album', field(63, 30));
  setNumber(tags, 'year', yearOf(field(93, 4)));
  if (t[125] === 0 && t[126] !== 0) setNumber(tags, 'track', t[126]); // v1.1 は曲番号つき
  setText(tags, 'genre', genreName(t[127]));
  return true;
}

// ============================================================
// MP3（MPEG オーディオ）の長さ
// ============================================================

// ビットレートの表（kbps）。[MPEG1 か MPEG2/2.5 か][レイヤ I, II, III][番号]
const MPEG_KBPS = [
  [
    [0, 32, 64, 96, 128, 160, 192, 224, 256, 288, 320, 352, 384, 416, 448],
    [0, 32, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 384],
    [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320],
  ],
  [
    [0, 32, 48, 56, 64, 80, 96, 112, 128, 144, 160, 176, 192, 224, 256],
    [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160],
    [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160],
  ],
];
const MPEG_RATES = [44100, 48000, 32000];

/** MPEG オーディオのフレームヘッダ（4バイト）を読む。正しくなければ null */
function mpegHeader(b, i) {
  if (i < 0 || i + 4 > b.length) return null;
  const b1 = b[i + 1];
  const b2 = b[i + 2];
  if (b[i] !== 0xff || (b1 & 0xe0) !== 0xe0) return null;
  const versionBits = (b1 >> 3) & 3; // 0 = MPEG2.5, 2 = MPEG2, 3 = MPEG1
  const layerBits = (b1 >> 1) & 3; // 1 = III, 2 = II, 3 = I
  const rateIndex = (b2 >> 2) & 3;
  const kbpsIndex = b2 >> 4;
  if (versionBits === 1 || layerBits === 0 || rateIndex === 3 || kbpsIndex === 0 || kbpsIndex === 15) return null;
  if ((b[i + 3] & 3) === 2) return null; // 使われていないエンファシスの値
  const version = versionBits === 3 ? 1 : versionBits === 2 ? 2 : 2.5;
  const layer = 4 - layerBits;
  const kbps = MPEG_KBPS[version === 1 ? 0 : 1][layer - 1][kbpsIndex];
  const sampleRate = MPEG_RATES[rateIndex] / (version === 1 ? 1 : version === 2 ? 2 : 4);
  const padding = (b2 >> 1) & 1;
  let samples;
  let length;
  if (layer === 1) {
    samples = 384;
    length = (Math.floor((12000 * kbps) / sampleRate) + padding) * 4;
  } else if (layer === 2 || version === 1) {
    samples = 1152;
    length = Math.floor((144000 * kbps) / sampleRate) + padding;
  } else {
    samples = 576;
    length = Math.floor((72000 * kbps) / sampleRate) + padding;
  }
  if (length < 24) return null;
  return { version, layer, kbps, sampleRate, samples, length, mono: (b[i + 3] >> 6) === 3 };
}

/** 2つのフレームが同じ流れのものか */
function sameStream(a, b) {
  return !!a && !!b && a.version === b.version && a.layer === b.layer && a.sampleRate === b.sampleRate;
}

/**
 * 最初の正しいフレームを探す。
 * たまたま同じ並びのバイトがあるだけ、という見まちがいを避けるため、次のフレームも正しいことを確かめる。
 */
async function findMp3Frame(r, start) {
  const limit = Math.min(r.size, start + MP3_SCAN_BYTES);
  let base = start;
  for (let round = 0; round < 16 && base + 4 <= limit; round++) {
    const buf = await r.window(base, 2 * KB, Math.min(READ_AHEAD, limit - base));
    if (buf.length < 4) break;
    for (let i = 0; i + 4 <= buf.length; i++) {
      if (buf[i] !== 0xff || (buf[i + 1] & 0xe0) !== 0xe0) continue;
      const h = mpegHeader(buf, i);
      if (!h) continue;
      const p = i + h.length;
      let ok;
      if (p + 4 <= buf.length) {
        const next = mpegHeader(buf, p);
        ok = sameStream(h, next);
        // 手もとにあれば、その次のフレームも確かめる
        if (ok && p + next.length + 4 <= buf.length) ok = sameStream(h, mpegHeader(buf, p + next.length));
      } else if (base + p + 4 <= r.size) {
        ok = sameStream(h, mpegHeader(await r.get(base + p, 4), 0));
      } else {
        // ファイルの最後のフレームで、次を確かめられない。思ったとおりの場所にあるときだけ信じる
        ok = base + i === start;
      }
      if (ok) return { pos: base + i, header: h, buf, at: i };
    }
    if (base + buf.length >= limit) break;
    base += buf.length - 3;
  }
  return null;
}

/** Xing / Info / VBRI ヘッダからフレーム数を読む。無ければ 0 */
function vbrFrameCount(f, h) {
  const side = h.version === 1 ? (h.mono ? 17 : 32) : (h.mono ? 9 : 17);
  for (const o of [4 + side, 6 + side]) {
    if (matches(f, o, 'Xing') || matches(f, o, 'Info')) {
      return u32be(f, o + 4) & 1 ? u32be(f, o + 8) : 0;
    }
  }
  if (matches(f, 36, 'VBRI')) return u32be(f, 36 + 14);
  return 0;
}

/** tags には、先頭の ID3v2 から読んだ項目がもう入っている */
async function parseMp3(r, audioStart, tags, choice) {
  tags.container = 'mp3';
  await quietly(() => choice.resolve(tags));

  let first = null;
  await quietly(async () => {
    first = await findMp3Frame(r, audioStart);
  });

  let frames = 0;
  if (first) {
    const h = first.header;
    tags.codec = h.layer === 3 ? 'mp3' : h.layer === 2 ? 'mp2' : 'mp1';
    await quietly(async () => {
      frames = vbrFrameCount(await r.get(first.pos, 64), h);
      if (frames > 0) setDuration(tags, (frames * h.samples) / h.sampleRate);
    });
  }

  // ID3v1 は、足りない項目があるときと、長さの計算に要るときだけ読む
  const complete = tags.title && tags.artist && tags.album && tags.year && tags.genre && tags.track;
  const needEstimate = first && tags.duration === undefined;
  let hasV1 = false;
  if ((!complete || needEstimate) && r.size >= 128) {
    await quietly(async () => {
      hasV1 = parseId3v1(await r.get(r.size - 128, 128, 0), tags);
    });
  }

  if (needEstimate) {
    // Xing などが無い → ビットレートが一定（CBR）とみなして、音声部分の大きさから計算する。
    // 手もとにある数フレームの平均をとっておく（可変ビットレートなのにヘッダが無いファイルのため）
    const h = first.header;
    let sum = 0;
    let count = 0;
    for (let p = first.at; count < 200; ) {
      const f = mpegHeader(first.buf, p);
      if (!sameStream(h, f)) break;
      sum += f.kbps;
      count++;
      p += f.length;
    }
    const kbps = count ? sum / count : h.kbps;
    const audioBytes = r.size - first.pos - (hasV1 ? 128 : 0);
    if (audioBytes > 0) setDuration(tags, (audioBytes * 8) / (kbps * 1000));
  }
}

// ============================================================
// MP4 / M4A / M4B（AAC・ALAC）
// ============================================================

// いちばん外側に現れる箱（アトム）の名前。中身が MP4 かどうかの見分けに使う
const MP4_TOP_ATOMS = new Set(['ftyp', 'moov', 'mdat', 'free', 'skip', 'wide', 'pnot', 'styp', 'moof']);

// ilst の中の名前 → 項目（\xA9 は ©）
const MP4_TEXT = {
  '\xA9nam': 'title',
  '\xA9ART': 'artist',
  aART: 'albumArtist',
  '\xA9alb': 'album',
  '\xA9gen': 'genre',
  '\xA9wrt': 'composer',
  '\xA9lyr': 'lyrics',
  sonm: 'sortTitle',
  soar: 'sortArtist',
  soal: 'sortAlbum',
  soaa: 'sortAlbumArtist',
};

const MP4_CODECS = {
  mp4a: 'aac', alac: 'alac', fLaC: 'flac', Opus: 'opus', '.mp3': 'mp3', 'ac-3': 'ac3', 'ec-3': 'eac3',
  samr: 'amr', sawb: 'amr', ulaw: 'ulaw', alaw: 'alaw',
  twos: 'pcm', sowt: 'pcm', lpcm: 'pcm', in24: 'pcm', in32: 'pcm', fl32: 'pcm', fl64: 'pcm', 'raw ': 'pcm', NONE: 'pcm',
};

/**
 * 箱（アトム）のヘッダを読む。
 * 大きさが 1 のときは、つづく 8 バイトが本当の大きさ（64 ビット）。0 のときは「最後まで」。
 */
async function readAtom(src, pos, limit) {
  const h = await src.get(pos, 16);
  if (h.length < 8) return null;
  let size = u32be(h, 0);
  let head = 8;
  if (size === 1) {
    if (h.length < 16 || u32be(h, 8) > 0x1fffff) return null; // あつかえないほど大きい
    size = u64be(h, 8);
    head = 16;
  } else if (size === 0) {
    size = limit - pos;
  }
  if (size < head) return null;
  return { type: fourcc(h, 4), start: pos + head, end: Math.min(limit, pos + size), next: pos + size };
}

/** start〜end にならんだ箱を順に見ていく。fn が false を返したらやめる */
async function eachAtom(src, start, end, fn, max = 500) {
  let pos = start;
  for (let n = 0; n < max && pos + 8 <= end; n++) {
    const atom = await readAtom(src, pos, end);
    if (!atom) return;
    if ((await fn(atom)) === false) return;
    if (!(atom.next > pos)) return;
    pos = atom.next;
  }
}

/** mvhd / mdhd から { 時間の単位, 長さ } を読む */
function mp4Times(d) {
  if (d.length < 20) return null;
  if (d[0] === 1) {
    if (d.length < 32) return null;
    const hi = u32be(d, 24);
    const lo = u32be(d, 28);
    const unknown = (hi === 0xffffffff && lo === 0xffffffff) || hi > 0x1fffff;
    return { scale: u32be(d, 20), duration: unknown ? 0 : hi * 4294967296 + lo };
  }
  const duration = u32be(d, 16);
  return { scale: u32be(d, 12), duration: duration === 0xffffffff ? 0 : duration };
}

/** stsd（音の形式の説明）からコーデックを読む */
function mp4Codec(d) {
  if (d.length < 16) return '';
  const format = fourcc(d, 12);
  if (format === 'mp4a') {
    // esds の中の「種類の番号」を見る（0x69 / 0x6B は MP3）
    for (let i = 16; i + 12 < d.length; i++) {
      if (!matches(d, i, 'esds')) continue;
      let p = i + 8; // 'esds' + 版と旗
      const skipLength = () => {
        for (let k = 0; k < 4 && p < d.length; k++) {
          if (!(d[p++] & 0x80)) break;
        }
      };
      if (d[p] === 0x03) {
        p++;
        skipLength();
        const esFlags = d[p + 2];
        p += 3;
        if (esFlags & 0x80) p += 2;
        if (esFlags & 0x40) p += 1 + (d[p] || 0);
        if (esFlags & 0x20) p += 2;
      }
      if (d[p] === 0x04) {
        p++;
        skipLength();
        const kind = d[p];
        if (kind === 0x69 || kind === 0x6b) return 'mp3';
      }
      break;
    }
    return 'aac';
  }
  if (MP4_CODECS[format]) return MP4_CODECS[format];
  return /^[\x21-\x7e]{1,4}\s*$/.test(format) ? format.trim().toLowerCase() : '';
}

/** trak（トラック）を見て、音声トラックならコーデックと長さを返す */
async function readMp4Track(r, trak) {
  let handler = '';
  let codec = '';
  let times = null;
  await eachAtom(r, trak.start, trak.end, async (a) => {
    if (a.type !== 'mdia') return;
    await eachAtom(r, a.start, a.end, async (m) => {
      if (m.type === 'mdhd') {
        times = mp4Times(await r.get(m.start, Math.min(36, m.end - m.start)));
      } else if (m.type === 'hdlr') {
        handler = fourcc(await r.get(m.start, 12), 8);
      } else if (m.type === 'minf') {
        await eachAtom(r, m.start, m.end, async (i) => {
          if (i.type !== 'stbl') return;
          await eachAtom(r, i.start, i.end, async (s) => {
            if (s.type !== 'stsd') return;
            codec = mp4Codec(await r.get(s.start, Math.min(KB, s.end - s.start)));
            return false;
          });
          return false;
        });
      }
    });
    return false;
  });
  if (handler && handler !== 'soun') return null; // 音声ではない（映像・字幕・チャプターなど）
  return { codec, times };
}

/** ilst（iTunes 形式のタグの並び）を読む */
async function readMp4Items(r, start, end, tags, choice) {
  await eachAtom(r, start, end, async (item) => {
    const key = item.type;
    const textKey = MP4_TEXT[key];
    const wanted = textKey || key === 'gnre' || key === '\xA9day' || key === 'trkn' || key === 'disk' || key === 'cpil' || key === 'covr';
    if (!wanted) return;
    await eachAtom(r, item.start, item.end, async (data) => {
      if (data.type !== 'data') return;
      const pos = data.start + 8; // 型(4) + 地域(4) のうしろが中身
      const len = data.end - pos;
      if (len <= 0) return false;
      const type = u32be(await r.get(data.start, 8), 0) & 0xffffff;

      if (key === 'covr') {
        if (len <= choice.max) {
          const mime = type === 13 ? 'image/jpeg' : type === 14 ? 'image/png' : type === 12 ? 'image/gif' : type === 27 ? 'image/bmp' : '';
          choice.offer(3, async () => ({ mime, data: await r.exact(pos, len) }));
        }
        return false;
      }
      if (len > MAX_TEXT_BYTES) return false;
      const d = await r.get(pos, len);

      if (textKey || key === '\xA9day') {
        // 型 1 = UTF-8、2 = UTF-16、3 = Shift_JIS
        const text = type === 2 || type === 5 ? utf16(d, false)
          : type === 3 ? (strictDecode('shift_jis', d) || decodeGuess(d, false))
            : decodeUtf8(d);
        if (key === '\xA9day') setNumber(tags, 'year', yearOf(text));
        else setText(tags, textKey, text);
      } else if (key === 'gnre') {
        if (d.length >= 2) setText(tags, 'genre', genreName(u16be(d, 0) - 1)); // ID3v1 の番号 + 1 が入っている
      } else if (key === 'trkn') {
        if (d.length >= 4) setNumber(tags, 'track', u16be(d, 2));
        if (d.length >= 6) setNumber(tags, 'trackTotal', u16be(d, 4));
      } else if (key === 'disk') {
        if (d.length >= 4) setNumber(tags, 'disc', u16be(d, 2));
        if (d.length >= 6) setNumber(tags, 'discTotal', u16be(d, 4));
      } else if (key === 'cpil') {
        if (tags.compilation === undefined && d[d.length - 1]) tags.compilation = true;
      }
      return false; // 最初の data だけ使う
    }, 16);
  }, MAX_ATOMS);
}

/** meta の箱を読む（中の ilst にタグが入っている） */
async function readMp4Meta(r, meta, tags, choice) {
  let start = meta.start;
  // ふつうは先頭に「版と旗」の 4 バイトがある。無い書き方（QuickTime）もあるので見分ける
  const peek = await r.get(start, 12);
  if (!(peek.length >= 8 && /^(hdlr|ilst|free|keys|mhdr)$/.test(fourcc(peek, 4)))) start += 4;
  await eachAtom(r, start, meta.end, async (a) => {
    if (a.type !== 'ilst') return;
    await readMp4Items(r, a.start, a.end, tags, choice);
    return false;
  });
}

async function parseMp4(r, tags, choice) {
  tags.container = 'mp4';
  let movie = null; // moov/mvhd
  let fragment = 0; // moov/mvex/mehd（細切れ形式のときの全体の長さ）
  let audio = null; // 最初の音声トラック

  // いちばん外側の箱をたどって moov を探す（mdat＝音声データ本体は読まずに飛ばす）
  await eachAtom(r, 0, r.size, async (top) => {
    if (top.type !== 'moov') return;
    await eachAtom(r, top.start, top.end, async (a) => {
      if (a.type === 'mvhd') {
        movie = mp4Times(await r.get(a.start, Math.min(36, a.end - a.start)));
      } else if (a.type === 'trak') {
        if (!audio || !audio.codec) {
          const t = await readMp4Track(r, a);
          if (t && (!audio || t.codec)) audio = t;
        }
      } else if (a.type === 'udta') {
        await eachAtom(r, a.start, a.end, async (u) => {
          if (u.type === 'meta') await quietly(() => readMp4Meta(r, u, tags, choice));
        });
      } else if (a.type === 'meta') {
        await quietly(() => readMp4Meta(r, a, tags, choice));
      } else if (a.type === 'mvex') {
        await eachAtom(r, a.start, a.end, async (x) => {
          if (x.type !== 'mehd') return;
          const d = await r.get(x.start, 12);
          fragment = d[0] === 1 ? u64be(d, 4) : u32be(d, 4);
          return false;
        });
      }
    });
    return false;
  }, MAX_ATOMS).catch(() => {});

  if (audio && audio.codec) tags.codec = audio.codec;
  if (movie && movie.scale > 0) {
    if (movie.duration > 0) setDuration(tags, movie.duration / movie.scale);
    else if (fragment > 0) setDuration(tags, fragment / movie.scale);
  }
  if (audio && audio.times && audio.times.scale > 0) setDuration(tags, audio.times.duration / audio.times.scale);

  await quietly(() => choice.resolve(tags));
}

// ============================================================
// Vorbis コメント（FLAC と OGG で共通）
// ============================================================

const VORBIS_KEYS = new Set([
  'TITLE', 'ARTIST', 'ALBUM', 'ALBUMARTIST', 'ALBUM ARTIST', 'ALBUM_ARTIST', 'GENRE', 'DATE', 'YEAR', 'ORIGINALDATE',
  'TRACKNUMBER', 'TRACK', 'TRACKTOTAL', 'TOTALTRACKS', 'DISCNUMBER', 'DISC', 'DISCTOTAL', 'TOTALDISCS',
  'COMPOSER', 'COMPILATION', 'LYRICS', 'UNSYNCEDLYRICS', 'UNSYNCED LYRICS',
  'TITLESORT', 'ARTISTSORT', 'ALBUMSORT', 'ALBUMARTISTSORT', 'COVERARTMIME',
]);

// base64 の文字 → 6ビットの値（-1 は base64 の文字ではない）
const BASE64 = (() => {
  const table = new Int8Array(256).fill(-1);
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  for (let i = 0; i < chars.length; i++) table[chars.charCodeAt(i)] = i;
  table[45] = 62; // '-'（URL 用の書き方）
  table[95] = 63; // '_'
  return table;
})();

/**
 * base64（ASCII のバイト列）を元のバイト列に戻す。
 * skip は「最初の何バイトを捨てるか」、max は「何バイトまで取り出すか」。
 * 文字列を経由しないので、大きな画像でもメモリをむだにしない。
 */
function base64Decode(src, start, end, skip = 0, max = Infinity) {
  const total = Math.floor(((end - start) * 3) / 4);
  const size = Math.max(0, Math.min(max, total - skip));
  const out = new Uint8Array(size);
  let acc = 0;
  let bits = 0;
  let produced = 0;
  let j = 0;
  for (let i = start; i < end; i++) {
    const v = BASE64[src[i]];
    if (v < 0) {
      if (src[i] === 0x3d) break; // '=' は終わりのしるし
      continue; // 改行や空白は飛ばす
    }
    acc = ((acc << 6) | v) & 0xffff;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      if (produced >= skip) {
        if (j >= size) break;
        out[j++] = (acc >> bits) & 0xff;
      }
      produced++;
    }
  }
  return j === size ? out : out.slice(0, j);
}

/**
 * FLAC の PICTURE ブロックの先頭を読んで、種類・MIME・画像の位置と大きさを返す。
 * （OGG の METADATA_BLOCK_PICTURE も、base64 を戻すと同じ形）
 */
function flacPictureHeader(d) {
  if (d.length < 32) return null;
  const type = u32be(d, 0);
  const mimeLen = u32be(d, 4);
  if (mimeLen > 255 || 8 + mimeLen + 4 > d.length) return null;
  const mime = asciiText(d, 8, 8 + mimeLen);
  let p = 8 + mimeLen;
  const descLen = u32be(d, p);
  p += 4 + descLen;
  if (descLen > d.length || p + 20 > d.length) return null;
  return { type, mime, offset: p + 20, length: u32be(d, p + 16) };
}

/** FLAC の PICTURE ブロックをジャケットの候補に入れる（画像そのものは、あとで選ばれたときに読む） */
async function offerFlacPicture(src, pos, end, choice) {
  if (!choice.enabled) return;
  const p = flacPictureHeader(await src.get(pos, Math.min(end - pos, 2 * KB)));
  if (!p) return;
  const at = pos + p.offset;
  const len = Math.min(p.length, end - at);
  if (len <= 0 || len > choice.max) return;
  choice.offer(p.type, async () => ({ mime: p.mime, data: await src.exact(at, len) }));
}

/**
 * Vorbis コメント（"KEY=値" の並び）を読む。
 * src は Reader（FLAC はファイルから直接）か MemReader（OGG は組み立てたパケット）。
 */
async function parseVorbisComments(src, pos, end, tags, choice) {
  end = Math.min(end, src.size);
  let h = await src.get(pos, 4);
  if (h.length < 4) return;
  pos += 4 + u32le(h, 0); // 作ったソフトの名前は飛ばす
  h = await src.get(pos, 4);
  if (h.length < 4 || pos + 4 > end) return;
  const count = Math.min(u32le(h, 0), MAX_COMMENTS);
  pos += 4;

  const found = {}; // キー → 値の並び
  for (let n = 0; n < count && pos + 4 <= end; n++) {
    h = await src.get(pos, 4 + 40);
    if (h.length < 4) break;
    const len = u32le(h, 0);
    const start = pos + 4;
    pos = start + len;
    const available = Math.min(len, end - start); // 途中で切れているファイルでは短くなる
    if (available <= 0) break;
    if (available < len) break; // このコメントの途中で切れている。半端な文字や絵は取らない

    // "=" の前がキー
    let eq = -1;
    const scan = Math.min(h.length, 4 + Math.min(available, 40));
    for (let i = 4; i < scan; i++) {
      if (h[i] === 0x3d) {
        eq = i - 4;
        break;
      }
    }
    if (eq <= 0) continue;
    const key = asciiText(h, 4, 4 + eq).toUpperCase();
    const valuePos = start + eq + 1;
    const valueLen = available - eq - 1;
    if (valueLen <= 0) continue;

    if (key === 'METADATA_BLOCK_PICTURE') {
      // base64 で包んだ FLAC の PICTURE ブロック
      if (!choice.enabled || available < len || valueLen > (choice.max * 4) / 3 + 4 * KB) continue;
      const peek = await src.get(valuePos, Math.min(valueLen, 2800));
      const p = flacPictureHeader(base64Decode(peek, 0, peek.length));
      if (!p) continue;
      choice.offer(p.type, async () => {
        const all = await src.get(valuePos, valueLen, 0);
        return { mime: p.mime, data: base64Decode(all, 0, all.length, p.offset, p.length > 0 ? p.length : Infinity) };
      });
    } else if (key === 'COVERART') {
      // 古い書き方：画像をそのまま base64 にしたもの
      if (!choice.enabled || available < len || valueLen > (choice.max * 4) / 3 + 4 * KB) continue;
      choice.offer(0, async () => {
        const all = await src.get(valuePos, valueLen, 0);
        return { mime: (found.COVERARTMIME || [])[0] || '', data: base64Decode(all, 0, all.length) };
      });
    } else if (VORBIS_KEYS.has(key)) {
      if (valueLen > MAX_TEXT_BYTES) continue;
      const text = key.includes('LYRICS')
        ? cleanLyrics(decodeUtf8(await src.get(valuePos, valueLen)))
        : clean(decodeUtf8(await src.get(valuePos, valueLen)));
      if (text) (found[key] || (found[key] = [])).push(text);
    }
  }

  const one = (...keys) => {
    for (const k of keys) {
      if (found[k]) return found[k][0];
    }
    return '';
  };
  // 同じキーが何度も出てきたら " / " でつなぐ（アーティストが2人、など）
  const many = (...keys) => {
    for (const k of keys) {
      if (found[k]) return [...new Set(found[k])].join(' / ');
    }
    return '';
  };

  setText(tags, 'title', one('TITLE'));
  setText(tags, 'artist', many('ARTIST'));
  setText(tags, 'album', one('ALBUM'));
  setText(tags, 'albumArtist', many('ALBUMARTIST', 'ALBUM ARTIST', 'ALBUM_ARTIST'));
  setText(tags, 'genre', many('GENRE'));
  setNumber(tags, 'year', yearOf(one('DATE', 'YEAR', 'ORIGINALDATE')));
  setText(tags, 'composer', many('COMPOSER'));
  setTrack(tags, one('TRACKNUMBER', 'TRACK'));
  setNumber(tags, 'trackTotal', numberPair(one('TRACKTOTAL', 'TOTALTRACKS'))[0]);
  setDisc(tags, one('DISCNUMBER', 'DISC'));
  setNumber(tags, 'discTotal', numberPair(one('DISCTOTAL', 'TOTALDISCS'))[0]);
  if (tags.compilation === undefined && isTruthy(one('COMPILATION'))) tags.compilation = true;
  setText(tags, 'sortTitle', one('TITLESORT'));
  setText(tags, 'sortArtist', one('ARTISTSORT'));
  setText(tags, 'sortAlbum', one('ALBUMSORT'));
  setText(tags, 'sortAlbumArtist', one('ALBUMARTISTSORT'));
  setText(tags, 'lyrics', one('LYRICS', 'UNSYNCEDLYRICS', 'UNSYNCED LYRICS'));
}

// ============================================================
// FLAC
// ============================================================

/** STREAMINFO（34 バイト）から長さを読む */
function flacDuration(d) {
  if (d.length < 18) return NaN;
  const sampleRate = (d[10] << 12) | (d[11] << 4) | (d[12] >> 4);
  const samples = (d[13] & 0x0f) * 4294967296 + u32be(d, 14);
  return sampleRate > 0 && samples > 0 ? samples / sampleRate : NaN;
}

/** start は 'fLaC' の位置（前に ID3v2 が付いているファイルでは 0 ではない） */
async function parseFlac(r, start, tags, choice) {
  tags.container = 'flac';
  tags.codec = 'flac';
  let pos = start + 4;
  for (let n = 0; n < MAX_FLAC_BLOCKS && pos + 4 <= r.size; n++) {
    const h = await r.get(pos, 4);
    if (h.length < 4) break;
    const type = h[0] & 0x7f;
    const body = pos + 4;
    const end = Math.min(r.size, body + u24be(h, 1));
    if (type === 127) break; // ありえない種類。音声のフレームに入ってしまった
    if (type === 0) {
      setDuration(tags, flacDuration(await r.get(body, 34)));
    } else if (type === 4) {
      await quietly(() => parseVorbisComments(r, body, end, tags, choice));
    } else if (type === 6) {
      await quietly(() => offerFlacPicture(r, body, end, choice));
    }
    // PADDING（詰め物）や SEEKTABLE（頭出しの表）などは、中身を読まずに飛ばす
    if (h[0] & 0x80) break; // これが最後のブロック
    pos = body + u24be(h, 1);
  }
}

// ============================================================
// OGG（Vorbis / Opus / FLAC / Speex）
// ============================================================

/** 最初のパケットを見て、中身のコーデックを見分ける */
function oggIdentify(p) {
  if (p.length >= 30 && p[0] === 0x01 && matches(p, 1, 'vorbis')) {
    return { codec: 'vorbis', rate: u32le(p, 12), preSkip: 0, headers: 3 };
  }
  if (p.length >= 19 && matches(p, 0, 'OpusHead')) {
    return { codec: 'opus', rate: 48000, preSkip: u16le(p, 10), headers: 2 }; // Opus の位置はいつも 48000 分の 1 秒きざみ
  }
  if (p.length >= 51 && p[0] === 0x7f && matches(p, 1, 'FLAC') && matches(p, 9, 'fLaC')) {
    const rate = (p[27] << 12) | (p[28] << 4) | (p[29] >> 4);
    return { codec: 'flac', rate, preSkip: 0, headers: Math.min(64, u16be(p, 7) || 16) + 1 };
  }
  if (p.length >= 40 && matches(p, 0, 'Speex   ')) {
    return { codec: 'speex', rate: u32le(p, 36), preSkip: 0, headers: 2 };
  }
  return null;
}

async function parseOgg(r, tags, choice) {
  tags.container = 'ogg';
  let stream = null; // 目当ての流れ（最初に見つけた音声）
  let serial = -1;
  let packetIndex = 0; // 目当ての流れで、いま何番目のパケットか
  let parts = []; // 組み立て中のパケット（ページをまたぐことがある）
  let partsLen = 0;
  let ahead = READ_AHEAD;
  let done = false;
  let cut = false; // 途中で切れたファイルだと分かった

  // パケットがひとつ出来上がるたびに呼ぶ。もう読まなくてよければ false
  const onPacket = async (packet, index) => {
    if (stream.codec === 'flac') {
      // Ogg FLAC は、FLAC のメタデータブロックが1パケットずつ入っている
      if (packet.length < 4 || packet[0] === 0xff) return false;
      const type = packet[0] & 0x7f;
      const mem = new MemReader(packet);
      if (type === 4) await quietly(() => parseVorbisComments(mem, 4, packet.length, tags, choice));
      else if (type === 6) await quietly(() => offerFlacPicture(mem, 4, packet.length, choice));
      return !(packet[0] & 0x80) && index + 1 < stream.headers;
    }
    // Vorbis / Opus / Speex は、2番目のパケットがコメント
    let from = -1;
    if (stream.codec === 'vorbis' && packet[0] === 0x03 && matches(packet, 1, 'vorbis')) from = 7;
    else if (stream.codec === 'opus' && matches(packet, 0, 'OpusTags')) from = 8;
    else if (stream.codec === 'speex') from = 0;
    if (from >= 0) await quietly(() => parseVorbisComments(new MemReader(packet), from, packet.length, tags, choice));
    return false;
  };

  await quietly(async () => {
    let pos = 0;
    for (let page = 0; page < MAX_OGG_PAGES && !done; page++) {
      const h = await r.get(pos, 27 + 255, ahead);
      if (h.length < 27 || !matches(h, 0, 'OggS') || h[4] !== 0) break;
      const segments = h[26];
      if (h.length < 27 + segments) break;
      let bodyLen = 0;
      for (let i = 0; i < segments; i++) bodyLen += h[27 + i];
      const bodyPos = pos + 27 + segments;
      const pageSerial = u32le(h, 14);
      pos = bodyPos + bodyLen;

      if (!stream) {
        // 流れの最初のページ（BOS）を見て、音声の流れを決める
        if (h[5] & 0x02) {
          const id = oggIdentify(await r.get(bodyPos, Math.min(bodyLen, 128)));
          if (id) {
            stream = id;
            serial = pageSerial;
            tags.codec = id.codec;
            packetIndex = 1;
          }
        } else if (page > 64) {
          break;
        }
        continue;
      }
      if (pageSerial !== serial) continue; // ほかの流れ（映像など）のページ

      let off = 0;
      let run = 0;
      for (let i = 0; i < segments && !done; i++) {
        const lace = h[27 + i];
        run += lace;
        if (lace === 255 && i < segments - 1) continue; // まだ同じパケットの続き
        if (run > 0) {
          if (partsLen + run > MAX_OGG_PACKET_BYTES) {
            done = true;
            break;
          }
          const part = await r.get(bodyPos + off, run, ahead);
          parts.push(part);
          partsLen += part.length;
          if (part.length < run) {
            // ファイルがここで切れている。足りない分を 0 で埋めて「全部ある」ことにしない
            cut = true;
            break;
          }
        }
        off += run;
        run = 0;
        if (lace < 255) {
          // パケットの終わり
          const packet = concatBytes(parts, partsLen);
          parts = [];
          partsLen = 0;
          done = !(await onPacket(packet, packetIndex++));
        }
      }
      if (cut) break;
      // ページをまたぐ大きなパケットは、まとめて先読みする
      if (parts.length) ahead = BIG_READ_AHEAD;
    }
    // 途中で切れたファイル：組み立てかけのコメントから、読める分だけ読む
    if (!done && stream && parts.length && packetIndex === 1) {
      await onPacket(concatBytes(parts, partsLen), packetIndex);
    }
  });
  parts = [];

  // 長さ：ファイルの末尾から最後のページを探し、「ここまでで何サンプルか」を読む
  if (stream && stream.rate > 0) {
    await quietly(async () => {
      const n = Math.min(r.size, OGG_TAIL_BYTES);
      const t = await r.get(r.size - n, n, 0);
      for (let i = t.length - 27; i >= 0; i--) {
        if (t[i] !== 0x4f || t[i + 1] !== 0x67 || t[i + 2] !== 0x67 || t[i + 3] !== 0x53 || t[i + 4] !== 0) continue;
        if (u32le(t, i + 14) !== serial) continue;
        const lo = u32le(t, i + 6);
        const hi = u32le(t, i + 10);
        if (hi === 0xffffffff && lo === 0xffffffff) continue; // このページで終わるパケットが無い
        if (hi > 0x1fffff) break;
        setDuration(tags, (hi * 4294967296 + lo - stream.preSkip) / stream.rate);
        break;
      }
    });
  }

  await quietly(() => choice.resolve(tags));
}

// ============================================================
// WAV
// ============================================================

const RIFF_INFO = { INAM: 'title', IART: 'artist', IPRD: 'album', IGNR: 'genre' };

/** チャンクの名前らしいか（印字できる ASCII 4文字） */
function isChunkId(h) {
  for (let i = 0; i < 4; i++) {
    if (!(h[i] >= 0x20 && h[i] <= 0x7e)) return false;
  }
  return true;
}

/** LIST/INFO の中身を読む */
async function readRiffInfo(r, pos, end, tags) {
  for (let n = 0; n < 500 && pos + 8 <= end; n++) {
    const h = await r.get(pos, 8);
    if (h.length < 8) break;
    const id = fourcc(h, 0).toUpperCase();
    const size = u32le(h, 4);
    const body = pos + 8;
    const len = Math.min(size, end - body);
    const wanted = RIFF_INFO[id] || id === 'ICRD' || id === 'ITRK' || id === 'IPRT' || id === 'TRCK';
    if (wanted && len > 0 && len <= MAX_TEXT_BYTES) {
      let d = await r.get(body, len);
      if (len < size || d.length < len) break; // 途中で切れている。半端な文字は取らない
      const z = d.indexOf(0);
      if (z >= 0) d = d.subarray(0, z);
      const text = decodeGuess(d, false);
      if (RIFF_INFO[id]) setText(tags, RIFF_INFO[id], text);
      else if (id === 'ICRD') setNumber(tags, 'year', yearOf(text));
      else setTrack(tags, text);
    }
    pos = body + size + (size & 1);
  }
}

const WAV_CODECS = { 1: 'pcm', 3: 'pcm', 2: 'adpcm', 0x11: 'adpcm', 6: 'alaw', 7: 'ulaw', 0x55: 'mp3', 0xff: 'aac' };

async function parseWav(r, tags, choice) {
  tags.container = 'wav';
  const head = await r.get(0, 12);
  const big = matches(head, 0, 'RF64') || matches(head, 0, 'BW64'); // 4GB をこえる WAV
  let fmt = null;
  let dataSize = -1;
  let factSamples = 0;
  let bigDataSize = 0;
  const fromId3 = {};
  const fromInfo = {};

  await quietly(async () => {
    let pos = 12;
    for (let n = 0; n < MAX_CHUNKS && pos + 8 <= r.size; n++) {
      const h = await r.get(pos, 8);
      if (h.length < 8 || !isChunkId(h)) break;
      const id = fourcc(h, 0);
      let size = u32le(h, 4);
      const body = pos + 8;

      if (id === 'data') {
        if (big && size === 0xffffffff && bigDataSize > 0) size = bigDataSize;
        if (body + size > r.size) {
          size = r.size - body; // 大きさが書かれていない・切れている → 最後まで音声とみなす
        } else if (size === 0 && r.size - body >= 8) {
          // 大きさ 0：本当に空か、録音しながら書いたので未記入か。次がチャンクらしくなければ未記入
          if (!isChunkId(await r.get(body, 8))) size = r.size - body;
        }
        dataSize = size;
      } else if (id === 'fmt ') {
        const d = await r.get(body, Math.min(size, 40));
        if (d.length >= 16) {
          fmt = { tag: u16le(d, 0), sampleRate: u32le(d, 4), byteRate: u32le(d, 8), blockAlign: u16le(d, 12) };
          if (fmt.tag === 0xfffe && d.length >= 26) fmt.tag = u16le(d, 24); // 拡張形式：本当の種類はうしろに書いてある
        }
      } else if (id === 'ds64') {
        const d = await r.get(body, 16);
        if (d.length >= 16 && u32le(d, 12) <= 0x1fffff) bigDataSize = u64le(d, 8);
      } else if (id === 'fact') {
        factSamples = u32le(await r.get(body, 4), 0);
      } else if (id === 'LIST') {
        if (matches(await r.get(body, 4), 0, 'INFO')) {
          await quietly(() => readRiffInfo(r, body + 4, Math.min(r.size, body + size), fromInfo));
        }
      } else if (id === 'id3 ' || id === 'ID3 ') {
        await parseId3v2(r, body, Math.min(r.size, body + size), fromId3, choice);
      }

      const next = body + size + (size & 1);
      if (!(next > pos)) break;
      pos = next;
    }
  });

  if (fmt) {
    if (WAV_CODECS[fmt.tag]) tags.codec = WAV_CODECS[fmt.tag];
    if (dataSize > 0 && fmt.sampleRate > 0) {
      if ((fmt.tag === 1 || fmt.tag === 3) && fmt.blockAlign > 0) setDuration(tags, dataSize / fmt.blockAlign / fmt.sampleRate);
      else if (factSamples > 0) setDuration(tags, factSamples / fmt.sampleRate);
      else if (fmt.byteRate > 0) setDuration(tags, dataSize / fmt.byteRate);
    }
  }
  // ID3 のほうがくわしいので優先し、足りない所を LIST/INFO で補う
  mergeTags(tags, fromId3);
  mergeTags(tags, fromInfo);
  await quietly(() => choice.resolve(tags));
}

/** from にあって to に無い項目だけを写す */
function mergeTags(to, from) {
  for (const key of Object.keys(from)) {
    if (to[key] === undefined) to[key] = from[key];
  }
}

// ============================================================
// AIFF / AIFC
// ============================================================

/** 80 ビットの拡張浮動小数（AIFF のサンプルレートの書き方）を数にする */
function extended80(b, o) {
  const exponent = ((b[o] & 0x7f) << 8) | b[o + 1];
  const hi = u32be(b, o + 2);
  const lo = u32be(b, o + 6);
  if (exponent === 0x7fff || (exponent === 0 && hi === 0 && lo === 0)) return 0;
  return (hi * 4294967296 + lo) * Math.pow(2, exponent - 16383 - 63);
}

const AIFC_CODECS = {
  NONE: 'pcm', sowt: 'pcm', twos: 'pcm', fl32: 'pcm', FL32: 'pcm', fl64: 'pcm', FL64: 'pcm', in24: 'pcm', in32: 'pcm', 'raw ': 'pcm',
  alac: 'alac', ulaw: 'ulaw', ULAW: 'ulaw', alaw: 'alaw', ALAW: 'alaw', ima4: 'adpcm',
};

async function parseAiff(r, tags, choice) {
  tags.container = 'aiff';
  const head = await r.get(0, 12);
  const compressed = matches(head, 8, 'AIFC');
  tags.codec = 'pcm';
  const fromId3 = {};
  const fromChunks = {};

  await quietly(async () => {
    let pos = 12;
    for (let n = 0; n < MAX_CHUNKS && pos + 8 <= r.size; n++) {
      const h = await r.get(pos, 8);
      if (h.length < 8 || !isChunkId(h)) break;
      const id = fourcc(h, 0);
      const size = u32be(h, 4);
      const body = pos + 8;
      const len = Math.min(size, r.size - body);

      if (id === 'COMM') {
        // チャンネル数(2) フレーム数(4) ビット数(2) サンプルレート(10) [AIFC: 圧縮の種類(4)]
        const d = await r.get(body, Math.min(len, 22));
        if (d.length >= 18) {
          const rate = extended80(d, 8);
          if (rate > 0) setDuration(tags, u32be(d, 2) / rate);
          if (compressed && d.length >= 22) {
            const kind = fourcc(d, 18);
            tags.codec = AIFC_CODECS[kind] || kind.trim().toLowerCase();
          }
        }
      } else if (id === 'ID3 ' || id === 'id3 ') {
        await parseId3v2(r, body, body + len, fromId3, choice);
      } else if ((id === 'NAME' || id === 'AUTH') && len === size && len > 0 && len <= MAX_TEXT_BYTES) {
        // len < size なら途中で切れている。半端な文字は取らない
        let d = await r.get(body, len);
        const z = d.indexOf(0);
        if (z >= 0) d = d.subarray(0, z);
        setText(fromChunks, id === 'NAME' ? 'title' : 'artist', decodeGuess(d, false));
      }

      const next = body + size + (size & 1);
      if (!(next > pos)) break;
      pos = next;
    }
  });

  mergeTags(tags, fromId3);
  mergeTags(tags, fromChunks);
  await quietly(() => choice.resolve(tags));
}

// ============================================================
// CAF（Apple の入れもの。おまけ）
// ============================================================

const CAF_CODECS = { lpcm: 'pcm', alac: 'alac', 'aac ': 'aac', '.mp3': 'mp3', opus: 'opus', ima4: 'adpcm', ulaw: 'ulaw', alaw: 'alaw' };
const CAF_INFO = { title: 'title', artist: 'artist', album: 'album', genre: 'genre', composer: 'composer' };

async function parseCaf(r, tags) {
  // container は決まりの一覧に CAF が無いので 'unknown' のまま。コーデック・長さ・題名などは読む
  let rate = 0;
  let bytesPerPacket = 0;
  let framesPerPacket = 0;
  let packets = 0;
  let validFrames = 0;
  let dataSize = -1;

  await quietly(async () => {
    let pos = 8;
    for (let n = 0; n < MAX_CHUNKS && pos + 12 <= r.size; n++) {
      const h = await r.get(pos, 12);
      if (h.length < 12) break;
      const id = fourcc(h, 0);
      const body = pos + 12;
      // 大きさは 64 ビット。-1 は「最後まで」
      let size = u32be(h, 4) > 0x1fffff ? r.size - body : u64be(h, 4);
      if (body + size > r.size) size = r.size - body;

      if (id === 'desc') {
        const d = await r.get(body, 32);
        if (d.length >= 32) {
          rate = new DataView(d.buffer, d.byteOffset, 8).getFloat64(0);
          const format = fourcc(d, 8);
          if (CAF_CODECS[format]) tags.codec = CAF_CODECS[format];
          bytesPerPacket = u32be(d, 16);
          framesPerPacket = u32be(d, 20);
        }
      } else if (id === 'pakt') {
        const d = await r.get(body, 24);
        if (d.length >= 16 && u32be(d, 0) <= 0x1fffff && u32be(d, 8) <= 0x1fffff) {
          packets = u64be(d, 0);
          validFrames = u64be(d, 8);
        }
      } else if (id === 'data') {
        dataSize = Math.max(0, size - 4);
      } else if (id === 'info' && size <= MAX_TEXT_BYTES) {
        // 個数(4) のあとに "キー\0値\0" がならぶ
        const d = await r.get(body, size);
        const words = decodeUtf8(d.subarray(4)).split('\0');
        for (let i = 0; i + 1 < words.length && i < 400; i += 2) {
          const key = words[i].toLowerCase();
          if (CAF_INFO[key]) setText(tags, CAF_INFO[key], words[i + 1]);
          else if (key === 'year') setNumber(tags, 'year', yearOf(words[i + 1]));
          else if (key === 'track number') setTrack(tags, words[i + 1]);
        }
      }

      const next = body + size;
      if (!(next > pos)) break;
      pos = next;
    }
  });

  if (rate > 0) {
    if (validFrames > 0) setDuration(tags, validFrames / rate);
    else if (bytesPerPacket > 0 && framesPerPacket > 0 && dataSize > 0) setDuration(tags, ((dataSize / bytesPerPacket) * framesPerPacket) / rate);
    else if (packets > 0 && framesPerPacket > 0) setDuration(tags, (packets * framesPerPacket) / rate);
  }
}

// ============================================================
// 入口
// ============================================================

/** 先頭のバイトから中身の種類を見分ける。分からなければ空文字 */
function sniffKind(b) {
  if (b.length < 4) return '';
  if (matches(b, 0, 'fLaC')) return 'flac';
  if (matches(b, 0, 'OggS')) return 'ogg';
  if (matches(b, 0, 'caff')) return 'caf';
  if ((matches(b, 0, 'RIFF') || matches(b, 0, 'RF64') || matches(b, 0, 'BW64')) && matches(b, 8, 'WAVE')) return 'wav';
  if (matches(b, 0, 'FORM') && (matches(b, 8, 'AIFF') || matches(b, 8, 'AIFC'))) return 'aiff';
  if (b.length >= 8 && MP4_TOP_ATOMS.has(fourcc(b, 4))) return 'mp4';
  if (b[0] === 0xff && (b[1] & 0xf6) === 0xf0) return 'aac'; // ADTS（レイヤの2ビットが 00）
  if (mpegHeader(b, 0)) return 'mp3';
  return '';
}

const CONTAINER_OF = { mp3: 'mp3', mp4: 'mp4', flac: 'flac', ogg: 'ogg', wav: 'wav', aiff: 'aiff', aac: 'aac' };

async function readAll(blob, fileName, tags, options) {
  const extKind = KIND_BY_EXTENSION[extensionOf(fileName)] || '';
  tags.container = CONTAINER_OF[extKind] || 'unknown'; // まず拡張子で仮に決めておく（何も読めなかったとき用）

  const r = new Reader(blob);
  if (r.size === 0) return;
  await r.get(0, HEAD_BYTES); // 先頭をまとめて読んでおく（たいていのタグはここに入っている）

  // 先頭に ID3v2 があれば先に読む（まれに2つ以上続く）。
  // MP3 以外にも付いていることがあるので、いったん別の入れものに読んでおく
  const fromId3 = {};
  const id3Choice = new PictureChoice(options.picture, options.maxPictureBytes);
  let audioStart = 0;
  for (let i = 0; i < 4; i++) {
    const end = await parseId3v2(r, audioStart, r.size, fromId3, id3Choice);
    if (!(end > audioStart)) break;
    audioStart = end;
  }

  // 中身（マジックバイト）で形式を決める。分からなければ拡張子、それも無ければ「ID3 があるなら MP3」
  const kind = sniffKind(await r.get(audioStart, 16)) || extKind || (audioStart > 0 ? 'mp3' : '');
  tags.container = CONTAINER_OF[kind] || 'unknown';

  if (kind === 'mp3' || kind === 'aac' || !kind) {
    // MP3 と AAC（ADTS）は ID3 が本来のタグ
    mergeTags(tags, fromId3);
    if (kind === 'mp3') {
      await parseMp3(r, audioStart, tags, id3Choice);
    } else {
      if (kind === 'aac') tags.codec = 'aac';
      await quietly(() => id3Choice.resolve(tags));
    }
    return;
  }

  // そのほかの形式は、その形式のタグを優先し、無い項目だけ ID3 で補う
  const choice = new PictureChoice(options.picture, options.maxPictureBytes);
  // 前に ID3v2 が付いている変わったファイルは、その分をずらして読む（FLAC は位置を渡せる）
  const inner = audioStart > 0 && kind !== 'flac' ? new Reader(blob.slice(audioStart)) : r;
  if (kind === 'flac') await quietly(() => parseFlac(r, audioStart, tags, choice));
  else if (kind === 'mp4') await quietly(() => parseMp4(inner, tags, choice));
  else if (kind === 'ogg') await quietly(() => parseOgg(inner, tags, choice));
  else if (kind === 'wav') await quietly(() => parseWav(inner, tags, choice));
  else if (kind === 'aiff') await quietly(() => parseAiff(inner, tags, choice));
  else if (kind === 'caf') await quietly(() => parseCaf(inner, tags));
  mergeTags(tags, fromId3);
  choice.list.push(...id3Choice.list);
  await quietly(() => choice.resolve(tags));
}

const TEXT_KEYS = ['title', 'artist', 'album', 'albumArtist', 'genre'];
const NUMBER_KEYS = ['track', 'trackTotal', 'disc', 'discTotal'];
const SORT_KEYS = ['sortTitle', 'sortArtist', 'sortAlbum', 'sortAlbumArtist', 'lyrics'];

/** 返す形に整える（決まった順にならべ、空の項目は入れない） */
function tidy(tags) {
  const out = { container: CONTAINER_OF[tags.container] || 'unknown' };
  const text = (key) => {
    if (typeof tags[key] === 'string' && tags[key]) out[key] = tags[key];
  };
  const number = (key) => {
    if (Number.isInteger(tags[key]) && tags[key] > 0) out[key] = tags[key];
  };
  text('codec');
  TEXT_KEYS.forEach(text);
  number('year');
  text('composer');
  NUMBER_KEYS.forEach(number);
  if (tags.compilation === true) out.compilation = true;
  SORT_KEYS.forEach(text);
  if (Number.isFinite(tags.duration) && tags.duration > 0) out.duration = tags.duration;
  const p = tags.picture;
  if (p && p.data instanceof Uint8Array && p.data.length > 0) out.picture = { mime: String(p.mime || 'image/jpeg'), data: p.data };
  return out;
}

/**
 * @typedef {Object} TagPicture
 * @property {string} mime      'image/jpeg' 'image/png' など（空や不完全なら中身から判定したもの）
 * @property {Uint8Array} data  画像のバイト列（専用のバッファ。byteOffset は 0）
 *
 * @typedef {Object} Tags
 * @property {'mp3'|'mp4'|'flac'|'ogg'|'wav'|'aiff'|'aac'|'unknown'} container
 * @property {string} [codec]   'mp3' 'aac' 'alac' 'flac' 'vorbis' 'opus' 'pcm' など
 * @property {string} [title]
 * @property {string} [artist]
 * @property {string} [album]
 * @property {string} [albumArtist]
 * @property {string} [genre]
 * @property {number} [year]
 * @property {string} [composer]
 * @property {number} [track]
 * @property {number} [trackTotal]
 * @property {number} [disc]
 * @property {number} [discTotal]
 * @property {boolean} [compilation]  コンピレーションのときだけ true
 * @property {string} [sortTitle]       ならべかえ用のよみがな
 * @property {string} [sortArtist]
 * @property {string} [sortAlbum]
 * @property {string} [sortAlbumArtist]
 * @property {string} [lyrics]          改行は \n にそろえてある
 * @property {number} [duration]        秒（小数）
 * @property {TagPicture} [picture]     表ジャケット優先。なければ最初の1枚
 */

/**
 * 音声ファイルのタグを読む。
 * 失敗しても例外は投げず、読めた分だけ返す（最低でも { container } は返る）。
 * ファイル全体は読まない（先頭 64KB ほど + 必要な所だけ）。
 *
 * @param {Blob|File} blob
 * @param {string} [fileName]  拡張子の判定に使う（中身で形式が分からなかったとき）
 * @param {{ picture?: boolean, maxPictureBytes?: number }} [options]
 *   picture: false にするとジャケットを読まない（そのぶん速い）。
 *   maxPictureBytes: これより大きいジャケットはあきらめる（既定 32MB、それより大きくはできない）。
 * @returns {Promise<Tags>}
 */
export async function parseTags(blob, fileName, options) {
  const tags = { container: 'unknown' };
  try {
    const max = options && Number.isFinite(options.maxPictureBytes) ? options.maxPictureBytes : MAX_PICTURE_BYTES;
    await readAll(blob, typeof fileName === 'string' ? fileName : '', tags, {
      picture: !(options && options.picture === false),
      maxPictureBytes: Math.max(0, Math.min(MAX_PICTURE_BYTES, max)),
    });
  } catch (e) {
    // こわれたファイルでも、ここまでに読めた分を返す
  }
  try {
    return tidy(tags);
  } catch (e) {
    return { container: 'unknown' };
  }
}
