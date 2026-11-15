// 一覧の「行」の描き方。
// 行の種類（kind）ごとに、中身の要素を作ります。文字は必ず textContent で入れます
// （曲名に記号が入っていても、画面が壊れないように）。

import { svg } from './icons.js';
import { formatTime, formatMinutes, UNKNOWN_ARTIST, UNKNOWN_ALBUM } from './library.js';

// 行の高さ（px）
export const ROW_HEIGHTS = {
  header: 23,
  search: 44,
  action: 44,
  song: 44,
  track: 44,
  album: 56,
  row: 44,
  albumhead: 110,
  plhead: 50,
  note: 44,
  pick: 44,
  pltrack: 44,
};

export function h(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

function icon(name, cls) {
  const s = h('span', cls);
  s.innerHTML = svg(name);
  return s;
}

function chevron() {
  return icon('chevron', 'r-chev');
}

// ジャケットの小さい絵を、読めたら入れる（行が画面から外れていたら何もしない）
function loadArt(box, artId, ctx) {
  if (!artId) return;
  ctx.art.thumbUrl(artId).then((url) => {
    if (!url || !box.isConnected) return;
    const img = new Image();
    img.alt = '';
    img.decoding = 'async';
    img.onload = () => img.classList.add('ready');
    img.src = url;
    box.appendChild(img);
  });
}

export function songSub(track) {
  const artist = track.artist || UNKNOWN_ARTIST;
  const album = track.album || UNKNOWN_ALBUM;
  return `${artist} — ${album}`;
}

// ctx: { art, player }
export function renderRow(item, node, ctx) {
  const playingId = ctx.player.current ? ctx.player.current.id : null;

  switch (item.kind) {
    case 'search': {
      const f = h('div', 'searchfield');
      f.innerHTML = svg('search');
      f.appendChild(h('span', '', '検索'));
      node.appendChild(f);
      node.setAttribute('aria-label', '曲をさがす');
      break;
    }

    case 'action': {
      const main = h('div', 'r-main');
      main.appendChild(h('div', 'r-title', item.label));
      node.appendChild(main);
      if (item.icon) {
        const r = h('div', 'r-right');
        r.innerHTML = svg(item.icon);
        node.appendChild(r);
      }
      break;
    }

    case 'song':
    case 'pick': {
      const t = item.track;
      const main = h('div', 'r-main');
      main.appendChild(h('div', 'r-title', t.title));
      main.appendChild(h('div', 'r-sub', item.sub || songSub(t)));
      node.appendChild(main);
      if (item.kind === 'pick') {
        if (item.added) node.classList.add('added');
        const b = h('span', 'r-badge');
        b.innerHTML = svg(item.added ? 'check' : 'add');
        node.appendChild(b);
        node.setAttribute('aria-label', `${t.title}${item.added ? '（追加ずみ）' : ' を追加'}`);
      } else if (t.id === playingId) {
        node.appendChild(icon('speaker', 'r-right r-playing'));
      }
      break;
    }

    case 'pltrack': {
      const t = item.track;
      if (item.gap) node.classList.add('gap');
      if (item.edit) {
        const m = h('button', 'r-minus');
        m.type = 'button';
        m.dataset.act = 'minus';
        m.setAttribute('aria-label', `${t.title} をプレイリストからはずす`);
        node.appendChild(m);
      }
      const main = h('div', 'r-main');
      main.appendChild(h('div', 'r-title', t.title));
      main.appendChild(h('div', 'r-sub', songSub(t)));
      node.appendChild(main);
      if (item.edit) {
        const hd = icon('handle', 'r-handle');
        hd.dataset.nopress = '1';
        hd.dataset.handle = '1';
        hd.setAttribute('aria-hidden', 'true');
        node.appendChild(hd);
      } else if (t.id === playingId) {
        node.appendChild(icon('speaker', 'r-right r-playing'));
      }
      break;
    }

    case 'track': {
      const t = item.track;
      const no = h('div', 't-no');
      if (t.id === playingId && item.markPlaying !== false) {
        no.innerHTML = svg('speaker');
        node.classList.add('cur');
      } else {
        no.textContent = item.no ? String(item.no) : '';
      }
      node.appendChild(no);
      const main = h('div', 'r-main');
      main.appendChild(h('div', 'r-title', t.title));
      if (item.sub) main.appendChild(h('div', 'r-sub', item.sub));
      node.appendChild(main);
      node.appendChild(h('div', 't-time', t.duration ? formatTime(t.duration) : ''));
      break;
    }

    case 'album': {
      const a = item.album;
      const box = h('div', 'r-art');
      box.innerHTML = svg('note-large');
      loadArt(box, a.artId, ctx);
      node.appendChild(box);
      const main = h('div', 'r-main');
      main.appendChild(h('div', 'r-title', a.title));
      main.appendChild(h('div', 'r-sub', item.sub || a.artist));
      node.appendChild(main);
      node.appendChild(chevron());
      break;
    }

    case 'albumhead': {
      const a = item.album;
      const box = h('div', 'ah-art');
      box.innerHTML = svg('note-large');
      loadArt(box, a.artId, ctx);
      node.appendChild(box);
      const info = h('div', 'ah-info');
      info.appendChild(h('div', 'ah-artist', a.artist));
      info.appendChild(h('div', 'ah-album', a.title));
      const bits = [];
      if (a.year) bits.push(`${a.year}年`);
      bits.push(`${a.tracks.length}曲`);
      if (a.duration) bits.push(formatMinutes(a.duration));
      info.appendChild(h('div', 'ah-meta', bits.join('、')));
      node.appendChild(info);
      break;
    }

    case 'plhead': {
      for (const b of item.buttons) {
        const btn = h('button', `pl-btn${b.on ? ' on' : ''}`, b.label);
        btn.type = 'button';
        btn.dataset.act = b.act;
        node.appendChild(btn);
      }
      break;
    }

    case 'note': {
      node.textContent = item.label;
      break;
    }

    case 'row':
    default: {
      if (item.icon) node.appendChild(icon(item.icon, 'r-icon'));
      const main = h('div', `r-main${item.sub ? '' : ' r-big'}`);
      main.appendChild(h('div', 'r-title', item.label));
      if (item.sub) main.appendChild(h('div', 'r-sub', item.sub));
      node.appendChild(main);
      if (item.value) node.appendChild(h('div', 'r-right', item.value));
      if (item.chevron !== false) node.appendChild(chevron());
      break;
    }
  }
}
