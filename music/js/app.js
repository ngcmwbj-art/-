// ミュージック — 画面のまとめ役。
// 起動 → 保存してある曲の一覧を読む → タブとページを出す、という流れです。
// ページ（一覧の画面）は積み重ねて管理し、進むときは右から、戻るときは左から滑り込みます。

import { db, storageEstimate, requestPersist } from './db.js';
import { Library, formatBytes, formatMinutes } from './library.js';
import { Player } from './player.js';
import { VList } from './vlist.js';
import { ArtStore } from './art.js';
import { importFiles, summarize } from './importer.js';
import { alertBox, promptBox, actionSheet, progressBox, toast } from './ui.js';
import { svg, maskUrl } from './icons.js';
import { renderRow, ROW_HEIGHTS, h, songSub } from './rows.js';
import { createNowPlaying } from './nowplaying.js';
import { createCoverFlow } from './coverflow.js';

const APP_VERSION = '1.0.0';
const $ = (id) => document.getElementById(id);

const library = new Library();
const art = new ArtStore(db);
const audio = $('audio');
const player = new Player({ audio, db, library });
player.artworkProvider = (track) => art.artwork(track.artId);

let ui = { tab: 'songs', overlay: true, volume: 1 };   // こまかい設定（保存する）
let uiSaveTimer = 0;
function saveUi() {
  clearTimeout(uiSaveTimer);
  uiSaveTimer = setTimeout(() => { db.kvSet('ui', ui).catch(() => {}); }, 300);
}

let nowPlaying = null;
let coverFlow = null;
let importing = false;

const isIOS = /iP(hone|ad|od)/.test(navigator.userAgent)
  || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isStandalone = () => window.navigator.standalone === true
  || (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches);
const canPickFolder = 'webkitdirectory' in HTMLInputElement.prototype
  && window.matchMedia && window.matchMedia('(pointer: fine)').matches;

// ════════════════════════════════════════════════════════
//  ページの積み重ね（タブごと）
// ════════════════════════════════════════════════════════

const TABS = ['playlists', 'artists', 'songs', 'albums', 'more'];
const nav = {
  tab: 'songs',
  stacks: {},
  busy: false,
  get stack() { return this.stacks[this.tab]; },
  get top() { const s = this.stack; return s ? s[s.length - 1] : undefined; },
};

const pagesEl = $('pages');
const navbar = $('navbar');

// ページを1つ作る。def.build() が一覧の中身（items）を返す。null を返したら、そのページは閉じる
function listPage(def) {
  const page = {
    title: def.title,
    def,
    el: h('div', 'page'),
    vlist: null,
    emptyEl: null,
    dirty: true,
    items: [],
    left: def.left || null,       // 'add' なら「＋」
    right: def.right || null,     // { label, onTap } なら右に青いボタン
    searchNav: null,
  };
  const host = h('div');
  page.el.appendChild(host);
  page.vlist = new VList(host, {
    heights: ROW_HEIGHTS,
    showIndex: !!def.showIndex,
    render: (item, node) => renderRow(item, node, { art, player }),
    onTap: (item, node, i, act, ev) => { if (def.onTap) def.onTap(item, i, page, act, ev); },
    onLongPress: def.onLongPress ? (item, node, i) => def.onLongPress(item, i, page) : null,
    onDelete: def.onDelete ? (item, i) => def.onDelete(item, i, page) : null,
  });
  page.update = () => {
    page.dirty = false;
    const items = def.build(page);
    if (items === null) return false;
    const empty = def.empty && def.empty();
    if (empty) {
      if (page.emptyEl) page.emptyEl.remove();
      page.emptyEl = empty;
      page.el.appendChild(empty);
      host.hidden = true;
      page.items = [];
      page.vlist.setItems([]);
    } else {
      if (page.emptyEl) { page.emptyEl.remove(); page.emptyEl = null; }
      host.hidden = false;
      page.items = items;
      page.vlist.setItems(items, { keepScroll: true });
    }
    if (def.title instanceof Function) page.title = def.title();
    return true;
  };
  return page;
}

// 一覧ではない、自由な中身のページ（保存容量・使い方）
function customPage(def) {
  const page = {
    title: def.title, def, el: h('div', 'page'), vlist: null, dirty: true, left: null, right: null, searchNav: null,
  };
  page.update = () => {
    page.dirty = false;
    page.el.textContent = '';
    page.el.appendChild(def.render(page));
    return true;
  };
  return page;
}

// 上のバーの中身（左のボタン・題名・右のボタン）を作る
function buildNavItem(page, depth) {
  if (page.searchNav) return page.searchNav;
  const item = h('div', 'nav-item');
  const left = h('div', 'nav-left');
  const right = h('div', 'nav-right');
  const title = h('h1', 'nav-title', typeof page.title === 'function' ? page.title() : page.title);

  if (page.left === 'add') {
    const b = h('button', 'bb');
    b.type = 'button';
    b.innerHTML = svg('add');
    b.setAttribute('aria-label', '曲を追加');
    b.addEventListener('click', () => startImport());
    left.appendChild(b);
  } else if (depth > 0 && !page.def.noBack) {
    const prev = nav.stack[depth - 1];
    const b = h('button', 'bb back');
    b.type = 'button';
    const label = typeof prev.title === 'function' ? prev.title() : prev.title;
    b.appendChild(h('span', '', shorten(label, 7)));
    b.setAttribute('aria-label', `${label} にもどる`);
    b.addEventListener('click', () => popPage());
    left.appendChild(b);
  }

  if (page.right) {
    const b = h('button', 'bb done');
    b.type = 'button';
    b.appendChild(h('span', '', page.right.label));
    b.addEventListener('click', () => page.right.onTap(page));
    right.appendChild(b);
  } else if (player.current) {
    const b = h('button', 'bb nowp');
    b.type = 'button';
    b.appendChild(h('span', '', '再生中'));
    b.setAttribute('aria-label', '再生中の画面を開く');
    b.addEventListener('click', () => nowPlaying.open());
    right.appendChild(b);
  }

  item.append(left, title, right);
  return item;
}

function shorten(text, max) {
  const s = String(text || '');
  const chars = Array.from(s);
  return chars.length > max ? `${chars.slice(0, max - 1).join('')}…` : s;
}

// いま見えているページの上のバーを作りなおす（「再生中」ボタンが出る・消えるとき）
function refreshNav() {
  const page = nav.top;
  if (!page || page.searchNav) return;
  const item = buildNavItem(page, nav.stack.length - 1);
  navbar.textContent = '';
  navbar.appendChild(item);
  page.navEl = item;
}

// ページを見せる。dir: 'push'（右から入る）/ 'pop'（左から入る）/ 'none'
function showPage(page, oldPage, dir) {
  if (page.dirty) page.update();
  if (!page.el.isConnected) pagesEl.appendChild(page.el);
  page.el.hidden = false;
  const navItem = buildNavItem(page, nav.stack.indexOf(page));
  page.navEl = navItem;
  const oldNav = oldPage ? oldPage.navEl : null;

  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (dir === 'none' || !oldPage || reduce) {
    if (oldPage && oldPage !== page) oldPage.el.hidden = true;
    navbar.textContent = '';
    navbar.appendChild(navItem);
    page.el.classList.remove('anim', 'off-left', 'off-right');
    afterShown(page, dir);
    return;
  }

  nav.busy = true;
  const from = dir === 'push' ? 'off-right' : 'off-left';
  const to = dir === 'push' ? 'off-left' : 'off-right';
  page.el.classList.remove('anim');
  page.el.classList.add(from);
  navItem.classList.add(from);
  navbar.appendChild(navItem);
  void page.el.offsetWidth;   // ここで一度配置させる（動きの始まりの位置を決める）
  page.el.classList.add('anim');
  navItem.classList.add('anim');
  oldPage.el.classList.add('anim');
  if (oldNav) oldNav.classList.add('anim');
  page.el.classList.remove(from);
  navItem.classList.remove(from);
  oldPage.el.classList.add(to);
  if (oldNav) oldNav.classList.add(to);

  setTimeout(() => {
    oldPage.el.hidden = true;
    oldPage.el.classList.remove('anim', 'off-left', 'off-right');
    page.el.classList.remove('anim');
    navItem.classList.remove('anim');
    if (oldNav) { oldNav.remove(); oldNav.classList.remove('anim', 'off-left', 'off-right'); }
    nav.busy = false;
    afterShown(page, dir);
  }, 370);
}

function afterShown(page, dir) {
  if (dir === 'pop' && page.vlist) page.vlist.deselect(true);
  if (page.def.onShown) page.def.onShown(page);
}

function pushPage(page) {
  if (nav.busy) return;
  const old = nav.top;
  nav.stack.push(page);
  showPage(page, old, 'push');
}

function popPage() {
  if (nav.busy || nav.stack.length < 2) return;
  const old = nav.stack.pop();
  showPage(nav.top, old, 'pop');
  disposeLater(old);
}

function popToRoot() {
  if (nav.busy || nav.stack.length < 2) return;
  const old = nav.top;
  const removed = nav.stack.splice(1);
  showPage(nav.top, old, 'pop');
  for (const p of removed) disposeLater(p);
}

function disposeLater(page) {
  setTimeout(() => {
    if (page.def.onClosed) page.def.onClosed(page);
    if (page.vlist) page.vlist.destroy();
    page.el.remove();
  }, 420);
}

function switchTab(name, { instant = true } = {}) {
  if (nav.busy) return;
  if (name === nav.tab) {
    // 同じタブをもう一度押したら、いちばん上の一覧へ。すでにそこなら先頭へ
    if (nav.stack.length > 1) popToRoot();
    else if (nav.top.vlist) nav.top.vlist.scroller.scrollTop = 0;
    return;
  }
  const old = nav.top;
  nav.tab = name;
  ui.tab = name;
  saveUi();
  for (const b of document.querySelectorAll('.tab')) {
    const on = b.dataset.tab === name;
    b.classList.toggle('on', on);
    b.setAttribute('aria-current', on ? 'page' : 'false');
  }
  if (old) old.el.hidden = true;
  showPage(nav.top, old, instant ? 'none' : 'push');
}

// 曲が増えた・減ったとき：全部のページに「作りなおしが必要」の印を付け、見えているページだけすぐ直す
function markAllDirty() {
  for (const name of TABS) for (const p of nav.stacks[name]) p.dirty = true;
  refreshVisible();
}

function refreshVisible() {
  // いちばん上のページの対象（アルバムなど）が無くなっていたら、1つずつ戻る
  let guard = 0;
  while (nav.stack.length > 1 && guard++ < 10) {
    const page = nav.top;
    if (page.update() !== false) break;
    nav.stack.pop();
    page.el.hidden = true;
    disposeLater(page);
    const below = nav.top;
    below.el.hidden = false;
    if (!below.el.isConnected) pagesEl.appendChild(below.el);
  }
  if (nav.stack.length === 1) nav.top.update();
  if (!nav.busy) refreshNav();
}

// ════════════════════════════════════════════════════════
//  一覧の組み立ての小道具
// ════════════════════════════════════════════════════════

// 見出しつきのならびにする。数が少ないときは見出しを付けない
function withSections(rows, toItem, minForSections = 15) {
  const items = [];
  const useSections = rows.length >= minForSections;
  let sec = null;
  for (const r of rows) {
    if (useSections && r.sec !== sec) {
      sec = r.sec;
      items.push({ kind: 'header', label: sec });
    }
    items.push(toItem(r.item));
  }
  return items;
}

const songItem = (track, extra) => ({ kind: 'song', track, swipe: true, longPress: true, ...extra });

// 一覧の中の曲（上からの順）
function songIdsOf(items) {
  const ids = [];
  for (const it of items) if (it.track && (it.kind === 'song' || it.kind === 'track' || it.kind === 'pltrack')) ids.push(it.track.id);
  return ids;
}

// 曲の行を押した：その一覧をならびにして、押した曲から流す
function playFromList(page, item, index) {
  const ids = [];
  let start = 0;
  page.items.forEach((it, i) => {
    if (!it.track || (it.kind !== 'song' && it.kind !== 'track' && it.kind !== 'pltrack')) return;
    if (i === index) start = ids.length;
    ids.push(it.track.id);
  });
  if (!ids.length) return;
  page.vlist.select(index);
  // いま流れている曲そのものを押したときは、頭出しせずに再生中の画面を開くだけ
  const cur = player.current;
  const same = cur && cur.id === item.track.id && sameList(player.base, ids);
  if (!same) player.playList(ids, start);
  else if (!player.playing) player.play();
  nowPlaying.open();
}

function sameList(a, b) {
  if (a.length !== b.length) return false;
  const sa = new Set(a);
  for (const x of b) if (!sa.has(x)) return false;
  return true;
}

function shuffleList(page) {
  const ids = songIdsOf(page.items);
  if (!ids.length) return;
  player.playList(ids, -1, { shuffle: true });
  nowPlaying.open();
}

// 曲の行によく使う、押したとき・長押し・削除のひとまとめ
const songHandlers = {
  onTap(item, i, page) {
    if (item.kind === 'search') { openSearch(); return; }
    if (item.kind === 'action' && item.act === 'shuffle') { shuffleList(page); return; }
    if (item.track) playFromList(page, item, i);
  },
  onLongPress(item) { if (item.track) songMenu(item.track); },
  onDelete(item) { if (item.track) confirmDelete([item.track], `「${item.track.title}」`); },
};

function countNote(n, unit = '曲') {
  return { kind: 'note', label: `${n}${unit}`, tap: false };
}

// ════════════════════════════════════════════════════════
//  曲がないときの案内
// ════════════════════════════════════════════════════════

function emptyLibraryView() {
  if (library.size > 0) return null;
  const box = h('div', 'empty');
  const ic = h('div', 'empty-ic');
  ic.innerHTML = svg('note-large');
  box.appendChild(ic);
  box.appendChild(h('div', 'empty-title', '曲がありません'));
  box.appendChild(h('div', 'empty-text',
    '「曲を追加」を押して、端末の中の音楽ファイルを選んでください。入れた曲は、通信がなくても聴けます。'));
  const b = h('button', 'bigbtn', '曲を追加');
  b.type = 'button';
  b.addEventListener('click', () => startImport());
  box.appendChild(b);
  if (isIOS && !isStandalone()) {
    box.appendChild(h('div', 'empty-hint',
      'はじめに、Safari の共有ボタン（□に↑）から「ホーム画面に追加」をして、ホーム画面のアイコンから開いてください。'
      + 'アプリのように全画面で使え、入れた曲が消えにくくなります。曲はそのあとで入れてください'
      + '（Safari で入れた曲は、ホーム画面のアプリには引き継がれません）。'));
  }
  return box;
}

// ════════════════════════════════════════════════════════
//  各ページ
// ════════════════════════════════════════════════════════

// ── 曲 ──
function songsRoot() {
  return listPage({
    title: '曲',
    left: 'add',
    showIndex: true,
    empty: emptyLibraryView,
    build() {
      const rows = library.songRows();
      const items = [{ kind: 'search' }, { kind: 'action', label: 'シャッフル', icon: 'shuffle', act: 'shuffle' }];
      items.push(...withSections(rows, (t) => songItem(t)));
      items.push(countNote(rows.length));
      return items;
    },
    ...songHandlers,
  });
}

// ── 検索 ──
function openSearch() {
  if (nav.busy) return;
  let query = '';
  const bar = h('div', 'nav-search');
  const field = h('label', 'searchfield');
  field.innerHTML = svg('search');
  const input = h('input');
  input.type = 'search';
  input.placeholder = '曲名・アーティスト・アルバム';
  input.setAttribute('aria-label', '曲をさがす');
  input.autocomplete = 'off';
  input.autocapitalize = 'off';
  input.spellcheck = false;
  input.enterKeyHint = 'search';
  field.appendChild(input);
  const cancel = h('button', 'bb');
  cancel.type = 'button';
  cancel.appendChild(h('span', '', 'キャンセル'));
  bar.append(field, cancel);

  const page = listPage({
    title: '検索',
    noBack: true,
    build() {
      if (!query.trim()) return [{ kind: 'note', label: 'さがしたいことばを入れてください', tap: false }];
      const found = library.search(query);
      if (!found.length) return [{ kind: 'note', label: '見つかりませんでした', tap: false }];
      const items = found.map((t) => songItem(t));
      items.push(countNote(found.length));
      return items;
    },
    ...songHandlers,
  });
  page.searchNav = bar;
  let timer = 0;
  input.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      query = input.value;
      page.update();
      page.vlist.scroller.scrollTop = 0;
    }, 120);
  });
  input.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') input.blur(); });
  cancel.addEventListener('click', () => { input.blur(); popPage(); });
  // 一覧をさわったらキーボードをしまう
  page.vlist.scroller.addEventListener('pointerdown', () => input.blur());
  pushPage(page);
  // iPhone では、タップの流れの中で focus しないとキーボードが出ない
  input.focus({ preventScroll: true });
}

// ── アルバム ──
function albumsRoot() {
  return listPage({
    title: 'アルバム',
    left: 'add',
    showIndex: true,
    empty: emptyLibraryView,
    build() {
      const rows = library.albumRows();
      const items = withSections(rows, (a) => ({ kind: 'album', album: a, swipe: true }));
      items.push(countNote(rows.length, '枚のアルバム'));
      return items;
    },
    onTap(item, i, page) {
      if (item.kind !== 'album') return;
      page.vlist.select(i);
      pushPage(albumPage(item.album.key));
    },
    onDelete(item) {
      if (item.album) confirmDelete(item.album.tracks, `アルバム「${item.album.title}」の ${item.album.tracks.length}曲`);
    },
  });
}

function albumPage(key) {
  return listPage({
    title: () => { const a = library.album(key); return a ? a.title : 'アルバム'; },
    build() {
      const a = library.album(key);
      if (!a) return null;
      const items = [{ kind: 'albumhead', album: a, tap: false }];
      if (a.tracks.length > 1) items.push({ kind: 'action', label: 'シャッフル', icon: 'shuffle', act: 'shuffle' });
      const multiDisc = a.tracks.some((t) => (t.disc || 1) > 1);
      let disc = 0;
      a.tracks.forEach((t, i) => {
        if (multiDisc && (t.disc || 1) !== disc) {
          disc = t.disc || 1;
          items.push({ kind: 'header', label: `ディスク ${disc}` });
        }
        const sub = t.artist && t.artist !== a.artist ? t.artist : '';
        items.push({ kind: 'track', track: t, no: t.track || i + 1, sub, swipe: true, longPress: true });
      });
      return items;
    },
    ...songHandlers,
  });
}

// ── アーティスト ──
function artistsRoot() {
  return listPage({
    title: 'アーティスト',
    left: 'add',
    showIndex: true,
    empty: emptyLibraryView,
    build() {
      const rows = library.artistRows();
      const items = withSections(rows, (ar) => ({ kind: 'row', label: ar.name, artist: ar, swipe: true }));
      items.push(countNote(rows.length, '組のアーティスト'));
      return items;
    },
    onTap(item, i, page) {
      if (!item.artist) return;
      page.vlist.select(i);
      const ar = item.artist;
      // アルバムが1枚だけなら、そのアルバムへ直接
      pushPage(ar.albums.length === 1 ? albumPage(ar.albums[0].key) : artistPage(ar.name));
    },
    onDelete(item) {
      if (item.artist) confirmDelete(item.artist.tracks, `「${item.artist.name}」の ${item.artist.tracks.length}曲`);
    },
  });
}

function artistPage(name) {
  return listPage({
    title: name,
    build() {
      const ar = library.artist(name);
      if (!ar) return null;
      const items = [{ kind: 'row', label: 'すべての曲', sub: `${ar.tracks.length}曲`, all: true }];
      for (const a of ar.albums) {
        items.push({ kind: 'album', album: a, sub: `${a.tracks.length}曲${a.year ? `・${a.year}年` : ''}`, swipe: true });
      }
      return items;
    },
    onTap(item, i, page) {
      page.vlist.select(i);
      if (item.all) pushPage(artistSongsPage(name));
      else if (item.album) pushPage(albumPage(item.album.key));
    },
    onDelete(item) {
      if (item.album) confirmDelete(item.album.tracks, `アルバム「${item.album.title}」の ${item.album.tracks.length}曲`);
    },
  });
}

function artistSongsPage(name) {
  return listPage({
    title: 'すべての曲',
    showIndex: true,
    build() {
      const ar = library.artist(name);
      if (!ar) return null;
      const rows = library.rowsForTracks(ar.tracks);
      const items = [{ kind: 'action', label: 'シャッフル', icon: 'shuffle', act: 'shuffle' }];
      items.push(...withSections(rows, (t) => songItem(t, { sub: t.album || '' })));
      items.push(countNote(rows.length));
      return items;
    },
    ...songHandlers,
  });
}

// ── ジャンル ──
function genresPage() {
  return listPage({
    title: 'ジャンル',
    showIndex: true,
    build() {
      const rows = library.genreRows();
      return withSections(rows, (g) => ({ kind: 'row', label: g.name, value: `${g.tracks.length}`, genre: g }));
    },
    onTap(item, i, page) {
      if (!item.genre) return;
      page.vlist.select(i);
      pushPage(genrePage(item.genre.name));
    },
  });
}

function genrePage(name) {
  return listPage({
    title: name,
    showIndex: true,
    build() {
      const g = library.genre(name);
      if (!g) return null;
      const rows = library.rowsForTracks(g.tracks);
      const items = [{ kind: 'action', label: 'シャッフル', icon: 'shuffle', act: 'shuffle' }];
      items.push(...withSections(rows, (t) => songItem(t)));
      items.push(countNote(rows.length));
      return items;
    },
    ...songHandlers,
  });
}

// ── プレイリスト ──
const SMART_LISTS = {
  recent: { title: '最近追加した曲', get: () => library.recentlyAdded(100), empty: 'まだ曲がありません' },
  top: { title: 'よく聴く曲 トップ25', get: () => library.mostPlayed(25), empty: '最後まで聴いた曲が、ここに並びます' },
  played: { title: '最近聴いた曲', get: () => library.recentlyPlayed(50), empty: '最後まで聴いた曲が、ここに並びます' },
};

function playlistsRoot() {
  return listPage({
    title: 'プレイリスト',
    left: 'add',
    build() {
      const items = [{ kind: 'action', label: '新規プレイリスト…', icon: 'add', act: 'new' }];
      for (const key of Object.keys(SMART_LISTS)) {
        items.push({ kind: 'row', label: SMART_LISTS[key].title, smart: key });
      }
      if (library.playlists.length) items.push({ kind: 'header', label: '自分で作ったプレイリスト' });
      for (const pl of library.playlists) {
        const n = library.playlistTracks(pl).length;
        items.push({ kind: 'row', label: pl.name, sub: `${n}曲`, playlist: pl, swipe: true });
      }
      return items;
    },
    onTap(item, i, page) {
      if (item.act === 'new') { newPlaylist(); return; }
      page.vlist.select(i);
      if (item.smart) pushPage(smartPage(item.smart));
      else if (item.playlist) pushPage(playlistPage(item.playlist.id));
    },
    onDelete(item) { if (item.playlist) confirmDeletePlaylist(item.playlist); },
  });
}

function smartPage(key) {
  const def = SMART_LISTS[key];
  return listPage({
    title: def.title,
    build() {
      const tracks = def.get();
      if (!tracks.length) return [{ kind: 'note', label: def.empty, tap: false }];
      const items = [{ kind: 'action', label: 'シャッフル', icon: 'shuffle', act: 'shuffle' }];
      for (const t of tracks) items.push(songItem(t));
      items.push(countNote(tracks.length));
      return items;
    },
    ...songHandlers,
  });
}

const findPlaylist = (id) => library.playlists.find((p) => p.id === id);

async function savePlaylist(pl) {
  const id = await db.putPlaylist(pl);
  if (pl.id == null) pl.id = id;
  if (!library.playlists.includes(pl)) library.playlists.push(pl);
  library.notify();
}

async function newPlaylist(firstTrackIds = null) {
  const name = await promptBox({
    title: '新規プレイリスト',
    message: '名前を入れてください。',
    placeholder: '名前',
    okLabel: '保存',
  });
  if (!name) return null;
  const pl = { name, trackIds: firstTrackIds ? firstTrackIds.slice() : [], createdAt: Date.now() };
  try {
    await savePlaylist(pl);
  } catch (_) {
    await alertBox({ title: '保存できませんでした', message: 'プレイリストを作れませんでした。' });
    return null;
  }
  if (!firstTrackIds) {
    // 作ったらその中へ進み、続けて曲を選ぶ画面を出す
    if (nav.tab !== 'playlists') switchTab('playlists');
    if (nav.stack.length > 1) popToRoot();
    const openPicker = () => {
      if (nav.busy) { setTimeout(openPicker, 60); return; }
      pushPage(playlistPage(pl.id));
      const next = () => {
        if (nav.busy) { setTimeout(next, 60); return; }
        pushPage(pickerPage(pl.id));
      };
      next();
    };
    openPicker();
  }
  return pl;
}

function playlistPage(id) {
  let editing = false;
  const page = listPage({
    title: () => { const pl = findPlaylist(id); return pl ? pl.name : 'プレイリスト'; },
    build() {
      const pl = findPlaylist(id);
      if (!pl) return null;
      const tracks = library.playlistTracks(pl);
      const items = [{
        kind: 'plhead',
        buttons: [
          { label: editing ? '完了' : '編集', act: 'edit', on: editing },
          { label: '曲を追加', act: 'add' },
          { label: '削除', act: 'delete' },
        ],
      }];
      if (tracks.length > 1 && !editing) items.push({ kind: 'action', label: 'シャッフル', icon: 'shuffle', act: 'shuffle' });
      tracks.forEach((t, n) => items.push({
        kind: 'pltrack', track: t, pos: n, edit: editing, swipe: !editing, longPress: !editing,
      }));
      if (!tracks.length) items.push({ kind: 'note', label: '「曲を追加」で曲を入れられます', tap: false });
      else items.push(countNote(tracks.length));
      return items;
    },
    onTap(item, i, pg, act) {
      const pl = findPlaylist(id);
      if (!pl) return;
      if (item.kind === 'plhead') {
        if (act === 'edit') { editing = !editing; pg.update(); }
        else if (act === 'add') pushPage(pickerPage(id));
        else if (act === 'delete') confirmDeletePlaylist(pl);
        return;
      }
      if (item.act === 'shuffle') { shuffleList(pg); return; }
      if (item.kind !== 'pltrack') return;
      if (editing) {
        if (act === 'minus') pg.vlist.showConfirm(i);
        return;
      }
      playFromList(pg, item, i);
    },
    onLongPress(item) { if (item.track) songMenu(item.track, { playlist: findPlaylist(id), pos: item.pos }); },
    // ここでの「削除」は、プレイリストからはずすだけ（曲そのものは残る）
    onDelete(item) {
      const pl = findPlaylist(id);
      if (pl && item.track) removeFromPlaylist(pl, item.pos);
    },
  });
  bindReorder(page, id);
  return page;
}

// プレイリストの pos 番目（残っている曲の中での順番）をはずす
function removeFromPlaylist(pl, pos) {
  let n = -1;
  const idx = pl.trackIds.findIndex((tid) => {
    if (!library.get(tid)) return false;
    n++;
    return n === pos;
  });
  if (idx < 0) return;
  pl.trackIds.splice(idx, 1);
  savePlaylist(pl).catch(() => {});
}

// 編集中、取っ手をつかんで行を上下に動かす
function bindReorder(page, id) {
  const sc = page.vlist.scroller;
  sc.addEventListener('pointerdown', (ev) => {
    const handle = ev.target.closest('[data-handle]');
    if (!handle) return;
    const node = handle.closest('.vl-item');
    const start = Number(node.dataset.i);
    const items = page.items.slice();
    const item = items[start];
    if (!item || item.kind !== 'pltrack') return;
    ev.preventDefault();

    const first = items.findIndex((it) => it.kind === 'pltrack');
    let last = first;
    items.forEach((it, i) => { if (it.kind === 'pltrack') last = i; });
    const hostRect = page.vlist.host.getBoundingClientRect();
    const rowH = node.offsetHeight;
    const grab = ev.clientY - node.getBoundingClientRect().top;

    const ghost = node.cloneNode(true);
    ghost.className = 'drag-ghost';
    ghost.style.height = `${rowH}px`;
    page.el.appendChild(ghost);
    const place = (y) => { ghost.style.top = `${Math.max(0, Math.min(hostRect.height - rowH, y - grab))}px`; };
    place(ev.clientY - hostRect.top);

    let cur = start;
    let lastY = ev.clientY - hostRect.top;
    item.gap = true;
    page.vlist.setItems(items, { keepScroll: true });

    const settle = () => {
      const target = Math.max(first, Math.min(last, page.vlist._indexAt(sc.scrollTop + lastY - grab + rowH / 2)));
      if (target !== cur) {
        items.splice(cur, 1);
        items.splice(target, 0, item);
        cur = target;
        page.vlist.setItems(items, { keepScroll: true });
      }
    };
    // 上下のはしに近づいたら、一覧を少しずつ送る
    const scrollTimer = setInterval(() => {
      if (lastY < 50) sc.scrollTop -= 10;
      else if (lastY > hostRect.height - 50) sc.scrollTop += 10;
      else return;
      settle();
    }, 30);

    const move = (e) => {
      lastY = e.clientY - hostRect.top;
      place(lastY);
      settle();
      e.preventDefault();
    };
    const end = () => {
      clearInterval(scrollTimer);
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', end);
      document.removeEventListener('pointercancel', end);
      ghost.remove();
      item.gap = false;
      const pl = findPlaylist(id);
      if (pl && cur !== start) {
        const alive = items.filter((it) => it.kind === 'pltrack').map((it) => it.track.id);
        pl.trackIds = alive;
        savePlaylist(pl).catch(() => {});
      } else {
        page.update();
      }
    };
    document.addEventListener('pointermove', move, { passive: false });
    document.addEventListener('pointerup', end);
    document.addEventListener('pointercancel', end);
  });
}

// プレイリストに入れる曲を選ぶ画面
function pickerPage(id) {
  return listPage({
    title: '曲を追加',
    noBack: true,
    showIndex: true,
    right: { label: '完了', onTap: () => popPage() },
    build() {
      const pl = findPlaylist(id);
      if (!pl) return null;
      const inList = new Set(pl.trackIds);
      const rows = library.songRows();
      if (!rows.length) return [{ kind: 'note', label: 'まだ曲がありません', tap: false }];
      return withSections(rows, (t) => ({ kind: 'pick', track: t, added: inList.has(t.id) }));
    },
    onTap(item, i, page) {
      const pl = findPlaylist(id);
      if (!pl || item.kind !== 'pick' || item.added) return;
      pl.trackIds.push(item.track.id);
      item.added = true;
      page.vlist.refresh();
      // 保存はするが、この画面は作りなおさない（スクロール位置を保つ）
      db.putPlaylist(pl).then(() => {
        for (const name of TABS) for (const p of nav.stacks[name]) if (p !== page) p.dirty = true;
      }).catch(() => {});
    },
  });
}

async function confirmDeletePlaylist(pl) {
  const ok = await actionSheet({
    title: `プレイリスト「${pl.name}」を削除しますか？\n中の曲は消えません。`,
    buttons: [
      { label: 'プレイリストを削除', value: true, style: 'destructive' },
      { label: 'キャンセル', value: false, style: 'cancel' },
    ],
  });
  if (!ok) return;
  try { await db.deletePlaylist(pl.id); } catch (_) { return; }
  const i = library.playlists.indexOf(pl);
  if (i >= 0) library.playlists.splice(i, 1);
  library.notify();
}

// ── その他 ──
function moreRoot() {
  return listPage({
    title: 'その他',
    build() {
      const items = [{ kind: 'row', label: '曲を追加', icon: 'add', act: 'import', chevron: false }];
      if (canPickFolder) items.push({ kind: 'row', label: 'フォルダごと追加', icon: 'folder', act: 'folder', chevron: false });
      items.push({ kind: 'row', label: 'ジャンル', icon: 'genres', act: 'genres' });
      items.push({ kind: 'row', label: '保存容量', icon: 'storage', act: 'storage' });
      items.push({ kind: 'row', label: '使い方', icon: 'info', act: 'help' });
      return items;
    },
    onTap(item, i, page) {
      if (item.act === 'import') { pickFiles(); return; }
      if (item.act === 'folder') { pickFolder(); return; }
      page.vlist.select(i);
      if (item.act === 'genres') pushPage(genresPage());
      else if (item.act === 'storage') pushPage(storagePage());
      else if (item.act === 'help') pushPage(helpPage());
    },
  });
}

function group(title, rows, foot) {
  const frag = document.createDocumentFragment();
  if (title) frag.appendChild(h('div', 'g-title', title));
  const box = h('div', 'g-box');
  for (const r of rows) box.appendChild(r);
  frag.appendChild(box);
  if (foot) frag.appendChild(h('div', 'g-foot', foot));
  return frag;
}

function gRow(label, value) {
  const r = h('div', 'g-row');
  r.appendChild(h('span', '', label));
  if (value != null) r.appendChild(h('span', 'g-val', value));
  return r;
}

function gText(html) {
  const d = h('div', 'g-text');
  d.innerHTML = html;   // ここに入れるのは、このファイルに書いた決まった文だけ
  return d;
}

function storagePage() {
  return customPage({
    title: '保存容量',
    render(page) {
      const root = h('div', 'grouped');
      const totals = library.totals();
      root.appendChild(group('入っている曲', [
        gRow('曲の数', `${totals.count}曲`),
        gRow('合計の長さ', totals.seconds ? formatMinutes(totals.seconds) : '—'),
        gRow('曲の大きさ', formatBytes(totals.bytes)),
      ]));

      const usedRow = gRow('このアプリの使用量', '…');
      const freeRow = gRow('まだ使える量のめやす', '…');
      const meterRow = h('div', 'g-row');
      const meter = h('div', 'meter');
      const fill = h('i');
      fill.style.width = '0%';
      meter.appendChild(fill);
      meterRow.appendChild(meter);
      const keepRow = gRow('消えにくくする設定', '…');
      root.appendChild(group('端末の保存場所', [usedRow, freeRow, meterRow, keepRow],
        '曲はこの端末のブラウザの中に保存されます。ブラウザの「サイトのデータを消去」をしたり、ホーム画面のアイコンを消したりすると、入れた曲も消えます（元のファイルは消えません）。'));

      storageEstimate().then((e) => {
        if (!page.el.isConnected) return;
        if (!e || !e.quota) {
          usedRow.lastChild.textContent = 'わかりません';
          freeRow.lastChild.textContent = 'わかりません';
          return;
        }
        usedRow.lastChild.textContent = formatBytes(e.usage);
        freeRow.lastChild.textContent = formatBytes(Math.max(0, e.quota - e.usage));
        fill.style.width = `${Math.min(100, Math.max(1, Math.round((e.usage / e.quota) * 100)))}%`;
      });
      const showPersist = async () => {
        let on = false;
        try { on = !!(navigator.storage && navigator.storage.persisted && await navigator.storage.persisted()); } catch (_) { /* 何もしない */ }
        keepRow.lastChild.textContent = on ? 'オン' : 'オフ';
        return on;
      };
      showPersist();

      const actions = h('div', 'g-actions');
      const keepBtn = h('button', 'bigbtn gray', '消えにくくする');
      keepBtn.type = 'button';
      keepBtn.addEventListener('click', async () => {
        await requestPersist();
        const on = await showPersist();
        toast(on ? '消えにくい設定になりました' : 'この端末では設定できませんでした');
      });
      actions.appendChild(keepBtn);
      const delBtn = h('button', 'bigbtn red', 'すべての曲を削除');
      delBtn.type = 'button';
      delBtn.disabled = !library.size;
      delBtn.addEventListener('click', () => confirmDeleteAll());
      actions.appendChild(delBtn);
      root.appendChild(actions);
      root.appendChild(h('div', 'g-foot', `ミュージック ${APP_VERSION}`));
      return root;
    },
  });
}

function helpPage() {
  return customPage({
    title: '使い方',
    render() {
      const root = h('div', 'grouped');
      root.appendChild(group('曲の入れ方', [gText(
        '<ol><li>左上の <b>＋</b>（または「その他」→「曲を追加」）を押します。</li>'
        + '<li>端末の中の音楽ファイルを選びます。<b>まとめていくつでも</b>選べます。</li>'
        + '<li>読み込みが終わると一覧に並びます。あとは通信がなくても聴けます。</li></ol>'
        + 'パソコンでは、ファイルやフォルダを画面に<b>ドラッグして落とす</b>だけでも入ります。',
      )]));
      root.appendChild(group('iPhone・iPad で使うとき', [gText(
        '<ol><li>Safari でこのページを開きます。</li>'
        + '<li>共有ボタン（□に↑）→ <b>ホーム画面に追加</b>。</li>'
        + '<li>ホーム画面にできたアイコンから開き、そこで曲を入れます。</li></ol>'
        + 'Safari で開いたときと、ホーム画面のアイコンから開いたときでは、保存場所が別々です。'
        + '<b>曲はホーム画面のアイコンから開いて入れてください。</b>'
        + '音楽ファイルは、先に「ファイル」アプリ（この iPhone 内 や iCloud Drive）に入れておきます。',
      )]));
      root.appendChild(group('操作のこつ', [gText(
        '<ul><li>曲を押すと再生がはじまり、再生中の画面になります。</li>'
        + '<li>再生中の画面でジャケットを押すと、再生位置のつまみ・シャッフル・リピートを出し入れできます。</li>'
        + '<li>右上のボタンでジャケットが裏返り、これから流れる順番が見られます。</li>'
        + '<li>行を<b>横になぞる</b>と「削除」が出ます。<b>長押し</b>すると「次に再生」「プレイリストに追加」が選べます。</li>'
        + '<li>スマホを<b>横向き</b>にすると、ジャケットを流して選べます。</li>'
        + '<li>画面を消しても再生は続き、ロック画面やイヤホンのボタンで操作できます。</li>'
        + '<li>下のタブをもう一度押すと、その一覧の最初にもどります。</li></ul>',
      )]));

      const fmts = [
        ['MP3', ['audio/mpeg']],
        ['AAC / Apple ロスレス（.m4a）', ['audio/mp4', 'audio/x-m4a']],
        ['FLAC', ['audio/flac', 'audio/x-flac']],
        ['WAV', ['audio/wav', 'audio/x-wav']],
        ['AIFF', ['audio/aiff', 'audio/x-aiff']],
        ['Ogg Vorbis', ['audio/ogg; codecs="vorbis"']],
        ['Opus', ['audio/ogg; codecs="opus"']],
      ];
      const rows = fmts.map(([label, types]) => {
        const ok = types.some((t) => { try { return !!audio.canPlayType(t); } catch (_) { return false; } });
        return gRow(label, ok ? '○ 聴けます' : '× 聴けません');
      });
      root.appendChild(group('この端末で聴ける形式', rows,
        '聴けない形式のファイルは、取り込みのときに自動でとばします。'));
      root.appendChild(h('div', 'g-foot', `ミュージック ${APP_VERSION}`));
      return root;
    },
  });
}

// ════════════════════════════════════════════════════════
//  曲のメニュー・削除
// ════════════════════════════════════════════════════════

async function songMenu(track, ctx = {}) {
  const buttons = [
    { label: '次に再生', value: 'next' },
    { label: 'プレイリストに追加…', value: 'addto' },
  ];
  if (ctx.playlist) buttons.push({ label: 'このプレイリストからはずす', value: 'unlist' });
  buttons.push({ label: 'この曲を削除', value: 'delete', style: 'destructive' });
  buttons.push({ label: 'キャンセル', value: null, style: 'cancel' });
  const pick = await actionSheet({ title: `${track.title}\n${songSub(track)}`, buttons });
  if (pick === 'next') {
    player.playNext([track.id]);
    toast('次に再生します');
  } else if (pick === 'addto') {
    addToPlaylistMenu(track);
  } else if (pick === 'unlist') {
    removeFromPlaylist(ctx.playlist, ctx.pos);
  } else if (pick === 'delete') {
    confirmDelete([track], `「${track.title}」`);
  }
}

async function addToPlaylistMenu(track) {
  const lists = library.playlists.slice(-5);
  const buttons = lists.map((pl) => ({ label: pl.name, value: pl }));
  buttons.push({ label: '新規プレイリスト…', value: 'new' });
  buttons.push({ label: 'キャンセル', value: null, style: 'cancel' });
  const pick = await actionSheet({ title: `「${track.title}」を入れるプレイリスト`, buttons });
  if (!pick) return;
  if (pick === 'new') {
    const pl = await newPlaylist([track.id]);
    if (pl) toast(`「${pl.name}」に入れました`);
    return;
  }
  if (pick.trackIds.includes(track.id)) { toast('もう入っています'); return; }
  pick.trackIds.push(track.id);
  try { await savePlaylist(pick); toast(`「${pick.name}」に入れました`); } catch (_) { /* 何もしない */ }
}

async function confirmDelete(tracks, what) {
  const ok = await actionSheet({
    title: `${what}を削除しますか？\nこのアプリの中から消えます（元のファイルは消えません）。`,
    buttons: [
      { label: tracks.length > 1 ? `${tracks.length}曲を削除` : '曲を削除', value: true, style: 'destructive' },
      { label: 'キャンセル', value: false, style: 'cancel' },
    ],
  });
  if (!ok) return;
  await deleteTracks(tracks.map((t) => t.id));
  toast('削除しました');
}

async function deleteTracks(ids) {
  try {
    await db.deleteTracks(ids);
  } catch (_) {
    await alertBox({ title: '削除できませんでした', message: 'もう一度ためしてください。' });
    return;
  }
  player.tracksRemoved(ids);
  // プレイリストからも取りのぞく
  const gone = new Set(ids);
  for (const pl of library.playlists) {
    const kept = pl.trackIds.filter((id) => !gone.has(id));
    if (kept.length !== pl.trackIds.length) {
      pl.trackIds = kept;
      db.putPlaylist(pl).catch(() => {});
    }
  }
  library.remove(ids);
  // 使われなくなったジャケットを片づける
  const used = new Set();
  for (const t of library.tracks.values()) if (t.artId) used.add(t.artId);
  art.prune(used);
}

async function confirmDeleteAll() {
  const ok = await actionSheet({
    title: `入っている ${library.size}曲とプレイリストを、すべて削除しますか？\nもとには戻せません（元のファイルは消えません）。`,
    buttons: [
      { label: 'すべて削除', value: true, style: 'destructive' },
      { label: 'キャンセル', value: false, style: 'cancel' },
    ],
  });
  if (!ok) return;
  const ids = Array.from(library.tracks.keys());
  try {
    await db.clearMusic();
  } catch (_) {
    await alertBox({ title: '削除できませんでした', message: 'もう一度ためしてください。' });
    return;
  }
  player.tracksRemoved(ids);
  art.reset();
  library.load([], []);
  toast('すべて削除しました');
}

// ════════════════════════════════════════════════════════
//  取り込み
// ════════════════════════════════════════════════════════

const fileInput = $('file-input');
const dirInput = $('dir-input');

function pickFiles() {
  if (importing) return;
  fileInput.value = '';
  fileInput.click();
}

function pickFolder() {
  if (importing) return;
  dirInput.value = '';
  dirInput.click();
}

// 「＋」を押したとき。パソコンではファイルかフォルダかを選べる
async function startImport() {
  if (importing) return;
  if (!canPickFolder) { pickFiles(); return; }
  const pick = await actionSheet({
    title: '曲を追加',
    buttons: [
      { label: 'ファイルを選ぶ', value: 'files' },
      { label: 'フォルダごと選ぶ', value: 'folder' },
      { label: 'キャンセル', value: null, style: 'cancel' },
    ],
  });
  if (pick === 'files') pickFiles();
  else if (pick === 'folder') pickFolder();
}

fileInput.addEventListener('change', () => {
  const files = Array.from(fileInput.files || []);
  fileInput.value = '';
  if (files.length) runImport(files);
});
dirInput.addEventListener('change', () => {
  const files = Array.from(dirInput.files || []);
  dirInput.value = '';
  if (files.length) runImport(files);
});

async function runImport(files) {
  if (importing) return;
  importing = true;
  const box = progressBox({ title: '曲を読み込んでいます' });
  let result;
  try {
    result = await importFiles(files, {
      db,
      library,
      art,
      audio,
      onProgress: (done, total, name) => box.update(done, total, total > 1 ? `${Math.min(done + 1, total)} / ${total}　${name}` : name),
      isCancelled: () => box.cancelled,
    });
  } catch (err) {
    result = null;
  }
  box.close();
  importing = false;
  if (!result) {
    await alertBox({ title: '読み込めませんでした', message: '保存場所を使えない状態です。プライベートブラウズでは使えないことがあります。' });
    return;
  }
  const clean = result.added && !result.duplicates && !result.unsupported.length
    && !result.failed.length && !result.notAudio && !result.quota && !result.cancelled;
  if (clean) toast(`${result.added}曲を追加しました`);
  else await alertBox({ title: result.added ? '読み込みが終わりました' : '曲を追加できませんでした', message: summarize(result) });
}

// パソコン：ファイルやフォルダを画面に落として入れる
function bindDrop() {
  const app = $('app');
  let zone = null;
  let depth = 0;
  const hasFiles = (ev) => ev.dataTransfer && Array.from(ev.dataTransfer.types || []).includes('Files');
  const show = () => {
    if (zone) return;
    zone = h('div', 'dropzone', 'ここに落として\n曲を追加');
    zone.style.whiteSpace = 'pre-line';
    app.appendChild(zone);
  };
  const hide = () => { depth = 0; if (zone) { zone.remove(); zone = null; } };
  window.addEventListener('dragenter', (ev) => { if (!hasFiles(ev)) return; depth++; show(); ev.preventDefault(); });
  window.addEventListener('dragover', (ev) => { if (!hasFiles(ev)) return; ev.preventDefault(); ev.dataTransfer.dropEffect = 'copy'; });
  window.addEventListener('dragleave', (ev) => { if (!hasFiles(ev)) return; depth--; if (depth <= 0) hide(); });
  window.addEventListener('drop', async (ev) => {
    if (!hasFiles(ev)) return;
    ev.preventDefault();
    hide();
    const files = await filesFromDrop(ev.dataTransfer);
    if (files.length) runImport(files);
  });
}

// 落とされたものの中から、フォルダの奥までファイルを集める
async function filesFromDrop(dt) {
  const entries = [];
  if (dt.items && dt.items.length && dt.items[0].webkitGetAsEntry) {
    for (const it of Array.from(dt.items)) {
      const e = it.webkitGetAsEntry && it.webkitGetAsEntry();
      if (e) entries.push(e);
    }
  }
  if (!entries.length) return Array.from(dt.files || []);
  const out = [];
  const readAll = (reader) => new Promise((resolve) => {
    const all = [];
    const step = () => reader.readEntries((batch) => {
      if (!batch.length) { resolve(all); return; }
      all.push(...batch);
      step();
    }, () => resolve(all));
    step();
  });
  const walk = async (entry, path) => {
    if (out.length > 20000) return;
    if (entry.isFile) {
      const file = await new Promise((resolve) => entry.file(resolve, () => resolve(null)));
      if (file) {
        // フォルダ名からアーティスト・アルバムを補えるように、道すじを付けておく
        if (path && !file.webkitRelativePath) {
          try { Object.defineProperty(file, 'webkitRelativePath', { value: `${path}/${file.name}` }); } catch (_) { /* 何もしない */ }
        }
        out.push(file);
      }
    } else if (entry.isDirectory) {
      const children = await readAll(entry.createReader());
      for (const c of children) await walk(c, path ? `${path}/${entry.name}` : entry.name);
    }
  };
  for (const e of entries) await walk(e, '');
  return out;
}

// ════════════════════════════════════════════════════════
//  横向きのジャケットの流れ（Cover Flow 風）
// ════════════════════════════════════════════════════════

const landscapeQuery = window.matchMedia('(orientation: landscape) and (max-height: 500px)');

function coverFlowAlbums() {
  const out = [];
  for (const r of library.artistRows()) {
    for (const a of r.item.albums) out.push({ key: a.key, title: a.title, artist: a.artist, artId: a.artId });
  }
  return out;
}

function syncCoverFlow() {
  const root = $('coverflow');
  const want = landscapeQuery.matches && library.size > 0 && !document.body.classList.contains('modal-open');
  if (!want) {
    if (coverFlow && coverFlow.isVisible()) coverFlow.hide();
    root.hidden = true;
    return;
  }
  if (!coverFlow) {
    coverFlow = createCoverFlow(root, {
      getArtUrl: (album) => art.midUrl(album.artId),
      getAlbumTracks: (album) => {
        const a = library.album(album.key);
        return a ? a.tracks.map((t) => ({ id: t.id, title: t.title, duration: t.duration, track: t.track })) : [];
      },
      onPlayTrack: (album, index) => {
        const a = library.album(album.key);
        if (a) player.playList(a.tracks.map((t) => t.id), index);
      },
      getNowPlayingId: () => (player.current ? player.current.id : null),
    });
    coverFlow.setAlbums(coverFlowAlbums());
  }
  if (!coverFlow.isVisible()) {
    root.hidden = false;
    const cur = player.current ? library.albumOfTrack(player.current) : null;
    coverFlow.show(cur ? { focusKey: cur.key } : {});
  }
}

// ════════════════════════════════════════════════════════
//  起動
// ════════════════════════════════════════════════════════

function setupIcons() {
  for (const node of document.querySelectorAll('[data-ic]')) {
    const name = node.dataset.ic;
    if (node.classList.contains('tab-ic')) node.style.setProperty('--m', maskUrl(name));
    else node.innerHTML = svg(name);
  }
}

function bindTabs() {
  for (const b of document.querySelectorAll('.tab')) {
    b.addEventListener('click', () => switchTab(b.dataset.tab));
  }
}

function bindKeys() {
  document.addEventListener('keydown', (ev) => {
    if (ev.target.closest && ev.target.closest('input, textarea, button, [role="button"]')) return;
    if (document.body.classList.contains('modal-open')) return;
    if (ev.key === ' ') { ev.preventDefault(); player.toggle(); }
  });
}

async function boot() {
  setupIcons();
  bindTabs();
  bindKeys();
  bindDrop();

  let tracks = [];
  let playlists = [];
  let dbOk = true;
  try {
    const [t, p, savedUi] = await Promise.all([db.getAllTracks(), db.getPlaylists(), db.kvGet('ui')]);
    tracks = t || [];
    playlists = p || [];
    if (savedUi && typeof savedUi === 'object') ui = { ...ui, ...savedUi };
  } catch (_) {
    dbOk = false;
  }
  library.load(tracks, playlists);

  nav.stacks = {
    playlists: [playlistsRoot()],
    artists: [artistsRoot()],
    songs: [songsRoot()],
    albums: [albumsRoot()],
    more: [moreRoot()],
  };

  nowPlaying = createNowPlaying({ player, library, art, db, ui, saveUi });
  nowPlaying.onClose(() => { const p = nav.top; if (p && p.vlist) p.vlist.deselect(true); });

  // 最初のタブ
  nav.tab = '';
  switchTab(TABS.includes(ui.tab) ? ui.tab : 'songs');

  library.addEventListener('change', () => {
    markAllDirty();
    if (coverFlow) coverFlow.setAlbums(coverFlowAlbums());
    syncCoverFlow();
  });

  let hadTrack = false;
  player.addEventListener('track', () => {
    const has = !!player.current;
    if (has !== hadTrack) { hadTrack = has; if (!nav.busy) refreshNav(); }
    const p = nav.top;
    if (p && p.vlist && !nowPlaying.isOpen) p.vlist.refresh();
    if (coverFlow && coverFlow.isVisible()) coverFlow.refresh();
  });
  nowPlaying.onClose(() => { const p = nav.top; if (p && p.vlist) p.vlist.refresh(); });
  player.addEventListener('error', (ev) => {
    const t = ev.detail && ev.detail.track;
    toast(t ? `「${t.title}」を再生できませんでした` : '再生できませんでした', 2600);
  });
  player.addEventListener('durationfix', () => { for (const name of TABS) for (const p of nav.stacks[name]) p.dirty = true; });

  await player.restore();

  // 横向き・窓を開いたとき閉じたときに、ジャケットの流れを出し入れする
  const onLayout = () => syncCoverFlow();
  if (landscapeQuery.addEventListener) landscapeQuery.addEventListener('change', onLayout);
  else if (landscapeQuery.addListener) landscapeQuery.addListener(onLayout);
  window.addEventListener('resize', onLayout);
  new MutationObserver(onLayout).observe(document.body, { attributes: true, attributeFilter: ['class'] });
  syncCoverFlow();

  $('boot').classList.add('gone');
  setTimeout(() => { const b = $('boot'); if (b) b.remove(); }, 400);

  if (!dbOk) {
    alertBox({
      title: '保存場所を開けませんでした',
      message: 'この状態では曲を入れられません。プライベートブラウズをやめるか、ページを開きなおしてください。',
    });
  }

  // オフラインでも開けるように、アプリ本体を端末に控えておく
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => {}); });
    if (document.readyState === 'complete') navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}

// テストから中を見られるように（ふだんは使いません）
window.__music = { library, player, db, art, nav, runImport };

boot();
