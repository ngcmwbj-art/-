// 画面の中で使う小さなアイコン（すべて自作の SVG）。
// どれも単色の形で、色は CSS の color で決まります（fill / stroke = currentColor）。
//   svg(name)      … <svg> の文字列を返す（innerHTML に入れて使う）
//   maskUrl(name)  … CSS の mask-image に入れる url(...) を返す。
//                    グラデーションの背景をアイコンの形で切り抜いて、つやのある絵にするときに使う

// 線で描くアイコン用の決まり文句
const LINE = 'fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"';

export const ICONS = {
  // ── 下のタブ用（30×30）──────────────────────────────
  // 行のならんだ紙と音符
  playlists: {
    vb: '0 0 30 30',
    body: '<rect x="3" y="5" width="17" height="3.2" rx="1.6"/><rect x="3" y="11.2" width="17" height="3.2" rx="1.6"/>'
      + '<rect x="3" y="17.4" width="9.5" height="3.2" rx="1.6"/>'
      + '<ellipse cx="19.2" cy="23.4" rx="3.9" ry="3" transform="rotate(-18 19.2 23.4)"/>'
      + '<path d="M20.9 10.2h2.4c.3 2.6 4 3.3 4 6.9 0 1.1-.3 2-.9 2.8.3-2.7-1.7-4.1-3.1-4.5v8h-2.4z"/>',
  },
  // 歌う人とマイク
  artists: {
    vb: '0 0 30 30',
    body: '<circle cx="11" cy="8.6" r="5.3"/><path d="M1.8 27.5c0-7 3.6-11.3 9.2-11.3s9.2 4.3 9.2 11.3z"/>'
      + '<circle cx="23.2" cy="9.4" r="3.2"/><path d="M21.6 12.9l2.9-.4 1.5 9.9-2.5.4z"/>',
  },
  // 八分音符
  songs: {
    vb: '0 0 30 30',
    body: '<ellipse cx="10.8" cy="22.6" rx="5.8" ry="4.4" transform="rotate(-20 10.8 22.6)"/>'
      + '<path d="M13.6 3.5h3c.5 4.2 7 5.2 7 11.2 0 1.9-.6 3.5-1.6 4.8.5-4.6-2.7-6.9-5.4-7.6v10.6h-3z"/>',
  },
  // ジャケットからレコードがのぞいている
  albums: {
    vb: '0 0 30 30',
    body: '<path fill-rule="evenodd" d="M4.5 5.5h14.6a1.5 1.5 0 0 1 1.5 1.5v16a1.5 1.5 0 0 1-1.5 1.5H4.5A1.5 1.5 0 0 1 3 23V7a1.5 1.5 0 0 1 1.5-1.5zm7.3 6.3a3.2 3.2 0 1 0 0 6.4 3.2 3.2 0 0 0 0-6.4z"/>'
      + '<path d="M22.4 6.5a9 9 0 0 1 0 17z"/>',
  },
  // 横にならんだ3つの丸
  more: {
    vb: '0 0 30 30',
    body: '<circle cx="6" cy="15" r="3.1"/><circle cx="15" cy="15" r="3.1"/><circle cx="24" cy="15" r="3.1"/>',
  },
  // ギター
  genres: {
    vb: '0 0 30 30',
    body: '<circle cx="9.8" cy="20.2" r="7.3"/><circle cx="15.6" cy="14.4" r="5"/>'
      + '<path d="M17 11.2l7-7 1.8 1.8-7 7z"/><path d="M23.3 2.4l4.3 4.3 1.6-1.6L24.9.8z"/>',
  },
  // 時計
  recent: {
    vb: '0 0 30 30',
    body: '<path fill-rule="evenodd" d="M15 3.5a11.5 11.5 0 1 1 0 23 11.5 11.5 0 0 1 0-23zm0 3a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17z"/>'
      + '<path d="M13.8 8.8h2.4v5h5.2v2.4h-7.6z"/>',
  },
  // 円筒（保存場所）
  storage: {
    vb: '0 0 30 30',
    body: '<ellipse cx="15" cy="7.6" rx="10" ry="4"/>'
      + '<path d="M5 11.2c0 2.2 4.5 4 10 4s10-1.8 10-4v3.4c0 2.2-4.5 4-10 4s-10-1.8-10-4z"/>'
      + '<path d="M5 17.6c0 2.2 4.5 4 10 4s10-1.8 10-4V21c0 2.2-4.5 4-10 4S5 23.2 5 21z"/>',
  },

  // ── 再生の操作（40×40）──────────────────────────────
  play: { vb: '0 0 40 40', body: '<path d="M11 5.5L34 20 11 34.5z"/>' },
  pause: { vb: '0 0 40 40', body: '<rect x="9.5" y="6.5" width="7.5" height="27"/><rect x="23" y="6.5" width="7.5" height="27"/>' },
  prev: { vb: '0 0 40 40', body: '<rect x="4" y="9" width="3.8" height="22"/><path d="M21.5 9v22L8.4 20z"/><path d="M35 9v22L21.9 20z"/>' },
  next: { vb: '0 0 40 40', body: '<rect x="32.2" y="9" width="3.8" height="22"/><path d="M18.5 9v22l13.1-11z"/><path d="M5 9v22l13.1-11z"/>' },

  // ── 小物（24×24）────────────────────────────────────
  // 交差する2本の矢印
  shuffle: {
    vb: '0 0 24 24',
    body: `<g ${LINE} stroke-width="2.2"><path d="M2 7h3.5c3 0 4.6 2 6.3 5s3.3 5 6.3 5h2.4"/><path d="M2 17h3.5c3 0 4.6-2 6.3-5s3.3-5 6.3-5h2.4"/>`
      + '<path d="M18.6 3.8L21.9 7l-3.3 3.2"/><path d="M18.6 13.8l3.3 3.2-3.3 3.2"/></g>',
  },
  // 輪になった2本の矢印
  repeat: {
    vb: '0 0 24 24',
    body: `<g ${LINE} stroke-width="2.2"><path d="M4 11.2V9.6A3.6 3.6 0 0 1 7.6 6h11"/><path d="M15.6 2.8L19 6l-3.4 3.2"/>`
      + '<path d="M20 12.8v1.6a3.6 3.6 0 0 1-3.6 3.6h-11"/><path d="M8.4 14.8L5 18l3.4 3.2"/></g>',
  },
  // 輪の矢印と「1」
  'repeat-one': {
    vb: '0 0 24 24',
    body: `<g ${LINE} stroke-width="2.2"><path d="M4 11.2V9.6A3.6 3.6 0 0 1 7.6 6h11"/><path d="M15.6 2.8L19 6l-3.4 3.2"/>`
      + '<path d="M20 12.8v1.6a3.6 3.6 0 0 1-3.6 3.6h-11"/><path d="M8.4 14.8L5 18l3.4 3.2"/></g>'
      + '<path d="M10.6 10.3l1.9-1.1h1v6.4h-1.7v-4.3l-1.2.6z"/>',
  },
  // 点つきの3行（裏返しボタン）
  list: {
    vb: '0 0 24 24',
    body: '<circle cx="4.2" cy="6" r="1.8"/><circle cx="4.2" cy="12" r="1.8"/><circle cx="4.2" cy="18" r="1.8"/>'
      + '<rect x="8.4" y="4.7" width="13" height="2.6" rx="1.3"/><rect x="8.4" y="10.7" width="13" height="2.6" rx="1.3"/>'
      + '<rect x="8.4" y="16.7" width="13" height="2.6" rx="1.3"/>',
  },
  // 左向きの太い矢印
  back: { vb: '0 0 24 24', body: '<path d="M11 3.6L2.8 12l8.2 8.4v-5.2h10.2V8.8H11z"/>' },
  // 行の右はしの「›」
  chevron: { vb: '0 0 10 14', body: `<path ${LINE} stroke-width="2.6" d="M2.2 1.8L7.8 7l-5.6 5.2"/>` },
  add: { vb: '0 0 24 24', body: '<path d="M10.3 3h3.4v7.3H21v3.4h-7.3V21h-3.4v-7.3H3v-3.4h7.3z"/>' },
  // 虫めがね
  search: {
    vb: '0 0 24 24',
    body: `<circle ${LINE} stroke-width="2.6" cx="10" cy="10" r="6.4"/><path ${LINE} stroke-width="3" d="M15 15l5.8 5.8"/>`,
  },
  // スピーカーと音の波（再生中の印）
  speaker: {
    vb: '0 0 24 24',
    body: '<path d="M2.5 9h3.9L12 4.2v15.6L6.4 15H2.5z"/>'
      + `<path ${LINE} stroke-width="2" d="M15 8.6a4.8 4.8 0 0 1 0 6.8"/><path ${LINE} stroke-width="2" d="M17.9 5.6a9 9 0 0 1 0 12.8"/>`,
  },
  'speaker-low': { vb: '0 0 24 24', body: '<path d="M6.5 9h3.9L16 4.2v15.6L10.4 15H6.5z"/>' },
  'speaker-high': {
    vb: '0 0 24 24',
    body: '<path d="M1.5 9h3.9L11 4.2v15.6L5.4 15H1.5z"/>'
      + `<path ${LINE} stroke-width="1.9" d="M13.8 9a4.2 4.2 0 0 1 0 6"/><path ${LINE} stroke-width="1.9" d="M16.4 6.4a7.9 7.9 0 0 1 0 11.2"/>`
      + `<path ${LINE} stroke-width="1.9" d="M19 3.8a11.6 11.6 0 0 1 0 16.4"/>`,
  },
  trash: { vb: '0 0 24 24', body: '<path d="M9 2.8h6v2.4h5v2.4H4V5.2h5z"/><path d="M5.6 9.2h12.8l-1 12H6.6z"/>' },
  check: { vb: '0 0 24 24', body: `<path ${LINE} stroke-width="3.2" d="M4.5 12.6l5 5 10-11.2"/>` },
  // 並べかえの取っ手（横3本線）
  handle: {
    vb: '0 0 24 24',
    body: '<rect x="3" y="5.6" width="18" height="2.4" rx="1.2"/><rect x="3" y="10.8" width="18" height="2.4" rx="1.2"/>'
      + '<rect x="3" y="16" width="18" height="2.4" rx="1.2"/>',
  },
  // 丸に i
  info: {
    vb: '0 0 24 24',
    body: '<path fill-rule="evenodd" d="M12 1.8a10.2 10.2 0 1 1 0 20.4 10.2 10.2 0 0 1 0-20.4zm0 2.2a8 8 0 1 0 0 16 8 8 0 0 0 0-16z"/>'
      + '<circle cx="12" cy="7.6" r="1.5"/><rect x="10.8" y="10.4" width="2.4" height="7.2" rx=".6"/>',
  },
  folder: {
    vb: '0 0 24 24',
    body: '<path d="M2.5 6.6c0-.9.7-1.6 1.6-1.6h4.6c.5 0 .9.2 1.2.6L11.3 7.3h8.6c.9 0 1.6.7 1.6 1.6v9.5c0 .9-.7 1.6-1.6 1.6H4.1c-.9 0-1.6-.7-1.6-1.6z"/>',
  },
  close: { vb: '0 0 24 24', body: `<path ${LINE} stroke-width="3" d="M5 5l14 14M19 5L5 19"/>` },
  // 吹き出し（歌詞）
  lyrics: {
    vb: '0 0 24 24',
    body: '<path d="M4 3.5h16c1.1 0 2 .9 2 2v9.5c0 1.1-.9 2-2 2h-8.2L7 21v-4H4c-1.1 0-2-.9-2-2V5.5c0-1.1.9-2 2-2z"/>',
  },
  // 「次に再生」：リストと小さな ▶
  queue: {
    vb: '0 0 24 24',
    body: '<rect x="2.5" y="4.8" width="13" height="2.6" rx="1.3"/><rect x="2.5" y="10.7" width="13" height="2.6" rx="1.3"/>'
      + '<rect x="2.5" y="16.6" width="7.5" height="2.6" rx="1.3"/><path d="M13.5 13.8l8 4.3-8 4.3z"/>',
  },

  // ── ジャケットがないときの大きな音符（200×200）──────
  'note-large': {
    vb: '0 0 200 200',
    body: '<ellipse cx="62" cy="150" rx="27" ry="20.5" transform="rotate(-20 62 150)"/>'
      + '<ellipse cx="143" cy="134" rx="27" ry="20.5" transform="rotate(-20 143 134)"/>'
      + '<path d="M78 46l92-17v104h-11V61L89 74v78H78z"/>',
  },
};
ICONS['shuffle-row'] = ICONS.shuffle;

export function svg(name, cls = '') {
  const icon = ICONS[name] || ICONS.more;
  const extra = cls ? ` ${cls}` : '';
  return `<svg class="ic ic-${name}${extra}" viewBox="${icon.vb}" aria-hidden="true" focusable="false" fill="currentColor">${icon.body}</svg>`;
}

const maskCache = new Map();
export function maskUrl(name) {
  let url = maskCache.get(name);
  if (!url) {
    const icon = ICONS[name] || ICONS.more;
    const src = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${icon.vb}" fill="black" color="black">${icon.body}</svg>`;
    url = `url("data:image/svg+xml,${encodeURIComponent(src)}")`;
    maskCache.set(name, url);
  }
  return url;
}
