// ライブラリ（メモリの中の曲の一覧）。
// 曲の情報を全部メモリに持ち、アルバム・アーティスト・ジャンルごとのまとまりと、
// 五十音・アルファベット順のならびを作ります。画面はここから読むだけです。

export const UNKNOWN_ARTIST = '不明なアーティスト';
export const UNKNOWN_ALBUM = '不明なアルバム';
export const UNKNOWN_GENRE = '不明なジャンル';
export const VARIOUS_ARTISTS = 'さまざまなアーティスト';

// ── 文字のならび順 ───────────────────────────────────────

const collator = (() => {
  try {
    return new Intl.Collator('ja', { numeric: true, sensitivity: 'base' });
  } catch (_) {
    return { compare: (a, b) => (a < b ? -1 : a > b ? 1 : 0) };
  }
})();

// カタカナ → ひらがな
function toHiragana(s) {
  return s.replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));
}

// さがす・ならべるための形にそろえる（全角半角・大文字小文字・カタカナひらがなの違いをなくす）
export function normalize(s) {
  let out = String(s == null ? '' : s);
  try { out = out.normalize('NFKC'); } catch (_) { /* 古い端末ではそのまま */ }
  return toHiragana(out.toLowerCase()).trim();
}

// ならべるときのキー。よみがな（sort）があればそれを使い、英語の The / A / An は読みとばす
export function sortKey(text, sortText) {
  let k = normalize(sortText || text || '');
  k = k.replace(/^(the|an|a)\s+(?=\S)/, '');
  k = k.replace(/^["'“”‘’「『（(\[【〈《\s]+/, '');
  return k;
}

const KANA_ROWS = [
  ['あ', 'ぁあぃいぅうぇえぉおゔ'],
  ['か', 'かがきぎくぐけげこごゕゖ'],
  ['さ', 'さざしじすずせぜそぞ'],
  ['た', 'ただちぢっつづてでとど'],
  ['な', 'なにぬねの'],
  ['は', 'はばぱひびぴふぶぷへべぺほぼぽ'],
  ['ま', 'まみむめも'],
  ['や', 'ゃやゅゆょよ'],
  ['ら', 'らりるれろ'],
  ['わ', 'ゎわゐゑをん'],
];
const KANA_TO_ROW = new Map();
for (const [row, chars] of KANA_ROWS) for (const c of chars) KANA_TO_ROW.set(c, row);

// 見出し（セクション）のならび順：あ〜わ、A〜Z、#
export const SECTION_ORDER = [
  ...KANA_ROWS.map((r) => r[0]),
  ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  '#',
];
const SECTION_RANK = new Map(SECTION_ORDER.map((s, i) => [s, i]));

// キーの最初の1文字から、どの見出しに入るかを決める
export function sectionOf(key) {
  const c = key.charAt(0);
  if (!c) return '#';
  if (c >= 'a' && c <= 'z') return c.toUpperCase();
  const row = KANA_TO_ROW.get(c);
  if (row) return row;
  // アクセントつきの文字（é など）は、もとのアルファベットの見出しへ
  try {
    const base = c.normalize('NFD').charAt(0);
    if (base >= 'a' && base <= 'z') return base.toUpperCase();
  } catch (_) { /* 何もしない */ }
  return '#';
}

// items を { sec, key } つきにして、見出し順 → 文字順にならべる
function sortWithSections(items, getText, getSort) {
  const rows = items.map((item) => {
    const key = sortKey(getText(item), getSort ? getSort(item) : '');
    return { item, key, sec: sectionOf(key) };
  });
  rows.sort((a, b) => {
    const d = SECTION_RANK.get(a.sec) - SECTION_RANK.get(b.sec);
    if (d) return d;
    const c = collator.compare(a.key, b.key);
    if (c) return c;
    return (a.item.id || 0) - (b.item.id || 0);
  });
  return rows;
}

// ── ライブラリ本体 ───────────────────────────────────────

export class Library extends EventTarget {
  constructor() {
    super();
    this.tracks = new Map();      // id → 曲
    this.playlists = [];          // { id, name, trackIds, createdAt }
    this._cache = null;           // ならべた結果（曲が変わったら作りなおす）
    this._sigs = new Set();       // 同じファイルを二度入れないための印
  }

  // ── 読み込み・変更 ──
  load(tracks, playlists) {
    this.tracks.clear();
    this._sigs.clear();
    for (const t of tracks) {
      this.tracks.set(t.id, t);
      if (t.sig) this._sigs.add(t.sig);
    }
    this.playlists = (playlists || []).slice().sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
    this._changed();
  }

  add(track) {
    this.tracks.set(track.id, track);
    if (track.sig) this._sigs.add(track.sig);
    this._cache = null;
  }

  remove(ids) {
    for (const id of ids) {
      const t = this.tracks.get(id);
      if (t && t.sig) this._sigs.delete(t.sig);
      this.tracks.delete(id);
    }
    this._changed();
  }

  // 画面に「変わったよ」と知らせる（まとめて足したあとに1回呼ぶ）
  notify() { this._changed(); }

  _changed() {
    this._cache = null;
    this.dispatchEvent(new Event('change'));
  }

  hasSig(sig) { return this._sigs.has(sig); }
  get(id) { return this.tracks.get(id); }
  get size() { return this.tracks.size; }

  // ── まとまりを作る ──
  _build() {
    if (this._cache) return this._cache;
    const tracks = Array.from(this.tracks.values());

    // アルバム
    const albums = new Map();
    for (const t of tracks) {
      const key = albumKeyOf(t);
      let a = albums.get(key);
      if (!a) {
        a = {
          key,
          title: t.album || UNKNOWN_ALBUM,
          sortTitle: t.sortAlbum || '',
          groupArtist: groupArtistOf(t),
          tracks: [],
          artId: null,
          year: 0,
        };
        albums.set(key, a);
      }
      a.tracks.push(t);
      if (!a.sortTitle && t.sortAlbum) a.sortTitle = t.sortAlbum;
    }
    for (const a of albums.values()) {
      a.tracks.sort(compareAlbumOrder);
      const withArt = a.tracks.find((t) => t.artId);
      a.artId = withArt ? withArt.artId : null;
      a.year = a.tracks.reduce((y, t) => Math.max(y, t.year || 0), 0);
      a.duration = a.tracks.reduce((d, t) => d + (t.duration || 0), 0);
      // 表に出すアーティスト名
      const first = a.tracks[0];
      if (first.compilation && !first.albumArtist) {
        a.artist = VARIOUS_ARTISTS;
      } else if (first.albumArtist) {
        a.artist = first.albumArtist;
      } else {
        a.artist = first.artist || UNKNOWN_ARTIST;
      }
    }

    // アーティスト
    const artists = new Map();
    for (const a of albums.values()) {
      const name = a.groupArtist;
      let ar = artists.get(name);
      if (!ar) {
        ar = { name, sortName: '', albums: [], tracks: [] };
        artists.set(name, ar);
      }
      ar.albums.push(a);
      for (const t of a.tracks) {
        ar.tracks.push(t);
        if (!ar.sortName) ar.sortName = t.sortAlbumArtist || (t.albumArtist ? '' : t.sortArtist) || '';
      }
    }
    for (const ar of artists.values()) {
      ar.albums.sort((x, y) => collator.compare(sortKey(x.title, x.sortTitle), sortKey(y.title, y.sortTitle)));
    }

    // ジャンル
    const genres = new Map();
    for (const t of tracks) {
      const name = t.genre || UNKNOWN_GENRE;
      let g = genres.get(name);
      if (!g) { g = { name, tracks: [] }; genres.set(name, g); }
      g.tracks.push(t);
    }

    this._cache = {
      albums,
      artists,
      genres,
      songRows: sortWithSections(tracks, (t) => t.title, (t) => t.sortTitle),
      albumRows: sortWithSections(Array.from(albums.values()), (a) => a.title, (a) => a.sortTitle),
      artistRows: sortWithSections(Array.from(artists.values()), (a) => a.name, (a) => a.sortName),
      genreRows: sortWithSections(Array.from(genres.values()), (g) => g.name),
    };
    return this._cache;
  }

  // 一覧（見出しつき）。それぞれ [{ item, key, sec }] のならび
  songRows() { return this._build().songRows; }
  albumRows() { return this._build().albumRows; }
  artistRows() { return this._build().artistRows; }
  genreRows() { return this._build().genreRows; }

  album(key) { return this._build().albums.get(key); }
  artist(name) { return this._build().artists.get(name); }
  genre(name) { return this._build().genres.get(name); }
  albumOfTrack(track) { return this.album(albumKeyOf(track)); }

  // 題名順の全曲
  allSongs() { return this.songRows().map((r) => r.item); }

  // 題名順にならべた rows（見出しつき）を、渡した曲だけで作る
  rowsForTracks(tracks) { return sortWithSections(tracks, (t) => t.title, (t) => t.sortTitle); }

  // 最近追加した曲（新しい順）
  recentlyAdded(limit = 100) {
    return Array.from(this.tracks.values())
      .sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0) || b.id - a.id)
      .slice(0, limit);
  }

  // よく聴く曲
  mostPlayed(limit = 25) {
    return Array.from(this.tracks.values())
      .filter((t) => (t.playCount || 0) > 0)
      .sort((a, b) => (b.playCount || 0) - (a.playCount || 0) || (b.lastPlayed || 0) - (a.lastPlayed || 0))
      .slice(0, limit);
  }

  // 最近聴いた曲
  recentlyPlayed(limit = 50) {
    return Array.from(this.tracks.values())
      .filter((t) => t.lastPlayed)
      .sort((a, b) => (b.lastPlayed || 0) - (a.lastPlayed || 0))
      .slice(0, limit);
  }

  // さがす（題名・アーティスト・アルバム）。ことばを空白で区切ると、全部を含む曲だけ
  search(query) {
    const words = normalize(query).split(/\s+/).filter(Boolean);
    if (!words.length) return [];
    const out = [];
    for (const r of this.songRows()) {
      const t = r.item;
      if (!t._search) {
        // 最初にさがしたときに1回だけ作る（保存はしない）
        Object.defineProperty(t, '_search', {
          value: normalize(`${t.title || ''} ${t.artist || ''} ${t.album || ''} ${t.albumArtist || ''} ${t.sortTitle || ''} ${t.sortArtist || ''}`),
          enumerable: false, writable: true, configurable: true,
        });
      }
      if (words.every((w) => t._search.includes(w))) out.push(t);
    }
    return out;
  }

  // プレイリストの中の、いまも残っている曲
  playlistTracks(pl) {
    const out = [];
    for (const id of pl.trackIds) {
      const t = this.tracks.get(id);
      if (t) out.push(t);
    }
    return out;
  }

  // 全体の大きさ（バイト）と長さ（秒）
  totals() {
    let bytes = 0;
    let seconds = 0;
    for (const t of this.tracks.values()) {
      bytes += t.size || 0;
      seconds += t.duration || 0;
    }
    return { count: this.tracks.size, bytes, seconds };
  }
}

// アルバムをまとめる単位。アルバムアーティスト（無ければアーティスト）とアルバム名で分ける。
// コンピレーションの印がある曲は、アーティストが違ってもアルバム名でひとまとめにする。
export function groupArtistOf(t) {
  if (t.albumArtist) return t.albumArtist;
  if (t.compilation) return VARIOUS_ARTISTS;
  return t.artist || UNKNOWN_ARTIST;
}

export function albumKeyOf(t) {
  return `${normalize(groupArtistOf(t))}\u0001${normalize(t.album || UNKNOWN_ALBUM)}`;
}

// アルバムの中のならび：ディスク番号 → 曲番号 → 題名
function compareAlbumOrder(a, b) {
  const d = (a.disc || 1) - (b.disc || 1);
  if (d) return d;
  const ta = a.track || 0;
  const tb = b.track || 0;
  if (ta && tb && ta !== tb) return ta - tb;
  if (ta && !tb) return -1;
  if (!ta && tb) return 1;
  const c = collator.compare(sortKey(a.title, a.sortTitle), sortKey(b.title, b.sortTitle));
  return c || a.id - b.id;
}

// ── 表示用の小道具 ───────────────────────────────────────

// 秒 → "3:05" / "1:02:03"
export function formatTime(sec) {
  if (!isFinite(sec) || sec < 0) sec = 0;
  const s = Math.floor(sec);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}

// 秒 → "45分" / "1時間5分"
export function formatMinutes(sec) {
  const m = Math.max(1, Math.round((sec || 0) / 60));
  if (m < 60) return `${m}分`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return rest ? `${h}時間${rest}分` : `${h}時間`;
}

// バイト → "12.3 MB"
export function formatBytes(n) {
  if (!n) return '0 MB';
  if (n < 1024 * 1024) return `${Math.max(1, Math.round(n / 1024))} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}
