// 再生中の画面。
// 上に 題名など、まんなかにジャケット（タップで再生位置のつまみを出し入れ、右上のボタンで裏返して
// 再生する順番を表示）、下に 前へ・再生／一時停止・次へ。

import { svg } from './icons.js';
import { VList } from './vlist.js';
import { renderRow, ROW_HEIGHTS } from './rows.js';
import { createSlider } from './slider.js';
import { formatTime, UNKNOWN_ARTIST, UNKNOWN_ALBUM } from './library.js';

const $ = (id) => document.getElementById(id);

export function createNowPlaying({ player, library, art, db, ui, saveUi }) {
  const np = $('np');
  const main = $('main');
  const card = $('np-card');
  const front = $('np-front');
  const backface = $('np-backface');
  const artImg = $('np-art');
  const overlay = $('np-overlay');
  const lyricsBox = $('np-lyrics');
  const elapsed = $('np-elapsed');
  const remain = $('np-remain');
  const flipBtn = $('np-flip');
  const flipArt = $('np-flip-art');
  const playBtn = $('np-play');
  const playIc = $('np-play-ic');
  const repeatBtn = $('np-repeat');
  const shuffleBtn = $('np-shuffle');
  const countEl = $('np-count');
  const volBox = $('np-volume');
  const bottom = np.querySelector('.np-bottom');

  let isOpen = false;
  let docked = false;
  let flipped = false;
  let scrubbing = false;
  let shownArtId;          // いま出しているジャケットの id（同じなら入れ替えない）
  let shownTrackId = null;
  let queueList = null;
  let closeTimer = 0;
  let openTimer = 0;
  const listeners = { close: [] };

  np.classList.add('off');

  // ── 開く・閉じる ──
  function open() {
    if (isOpen || !player.current) return;
    isOpen = true;
    clearTimeout(closeTimer);
    np.hidden = false;
    layout();
    void np.offsetWidth;            // ここで一度配置させてから動かす（横からすべり込む）
    np.classList.remove('off');
    openTimer = setTimeout(() => { if (isOpen) main.classList.add('away'); }, 380);
    syncAll();
  }

  function close() {
    if (!isOpen) return;
    isOpen = false;
    clearTimeout(openTimer);
    main.classList.remove('away');
    np.classList.add('off');
    closeTimer = setTimeout(() => {
      if (isOpen) return;
      np.hidden = true;
      if (flipped) setFlipped(false, false);
    }, 380);
    for (const fn of listeners.close) fn();
  }

  // ── 表示を合わせる ──
  function syncTrack() {
    const t = player.current;
    if (!t) {
      if (isOpen) close();
      shownTrackId = null;
      return;
    }
    $('np-artist').textContent = t.artist || UNKNOWN_ARTIST;
    $('np-title').textContent = t.title || '';
    $('np-album').textContent = t.album || UNKNOWN_ALBUM;
    countEl.textContent = `${player.index + 1} / ${player.queue.length}`;

    if (shownArtId !== t.artId) {
      shownArtId = t.artId;
      const want = t.artId;
      if (!want) {
        artImg.hidden = true;
        artImg.removeAttribute('src');
        flipArt.hidden = true;
        flipArt.removeAttribute('src');
      } else {
        art.fullUrl(want).then((url) => {
          if (shownArtId !== want) return;
          if (url) { artImg.src = url; artImg.hidden = false; } else { artImg.hidden = true; }
        });
        art.thumbUrl(want).then((url) => {
          if (shownArtId !== want) return;
          if (url) { flipArt.src = url; flipArt.hidden = false; } else { flipArt.hidden = true; }
        });
      }
    }

    if (shownTrackId !== t.id) {
      shownTrackId = t.id;
      syncLyrics();
    }
    syncTime();
    if (flipped) { buildQueue(); scrollQueueToCurrent(); }
  }

  function syncState() {
    const playing = player.playing;
    playIc.innerHTML = svg(playing ? 'pause' : 'play');
    playBtn.setAttribute('aria-label', playing ? '一時停止' : '再生');
  }

  function showTimes(t, d) {
    elapsed.textContent = formatTime(t);
    remain.textContent = d > 0 ? `-${formatTime(Math.max(0, d - t))}` : '--:--';
  }

  function syncTime() {
    if (scrubbing) return;
    const d = player.duration;
    const t = d > 0 ? Math.min(player.time, d) : player.time;
    scrub.value = d > 0 ? t / d : 0;
    showTimes(t, d);
  }

  function syncQueue() {
    shuffleBtn.classList.toggle('on', player.shuffle);
    shuffleBtn.setAttribute('aria-pressed', String(player.shuffle));
    const rep = player.repeat;
    repeatBtn.classList.toggle('on', rep !== 'off');
    repeatBtn.firstElementChild.innerHTML = svg(rep === 'one' ? 'repeat-one' : 'repeat');
    repeatBtn.setAttribute('aria-label',
      rep === 'one' ? 'リピート：1曲をくり返す' : rep === 'all' ? 'リピート：全体をくり返す' : 'リピート：オフ');
    if (player.current) countEl.textContent = `${player.index + 1} / ${player.queue.length}`;
    if (flipped) buildQueue();
  }

  function syncAll() {
    syncTrack();
    syncState();
    syncQueue();
    syncOverlay();
  }

  // ── ジャケットの上の表示（つまみ・歌詞）──
  function syncOverlay() {
    const show = ui.overlay !== false;
    overlay.classList.toggle('hide', !show && !docked);
    lyricsBox.hidden = !(show && lyricsBox.dataset.has === '1');
  }

  // 画面がたてに長い端末では、つまみをジャケットの下（操作ボタンの上）に常に出す。
  // 昔の小さな画面と同じくらいの縦横比のときだけ、ジャケットの上に重ねる
  function layout() {
    if (np.hidden) return;
    const space = np.clientHeight - $('np-top').offsetHeight - np.clientWidth;
    const want = space >= 215;
    if (want === docked) return;
    docked = want;
    np.classList.toggle('docked', docked);
    if (docked) bottom.insertBefore(overlay, bottom.firstChild);
    else front.appendChild(overlay);
    syncOverlay();
  }

  function syncLyrics() {
    const t = player.current;
    lyricsBox.textContent = '';
    lyricsBox.dataset.has = '';
    lyricsBox.hidden = true;
    if (!t || !t.hasLyrics) return;
    const id = t.id;
    db.getLyrics(id).then((text) => {
      if (!text || !player.current || player.current.id !== id) return;
      lyricsBox.textContent = text;
      lyricsBox.dataset.has = '1';
      lyricsBox.scrollTop = 0;
      syncOverlay();
    }).catch(() => {});
  }

  front.addEventListener('click', (ev) => {
    if (ev.target.closest('.np-overlay')) return;
    ui.overlay = ui.overlay === false;
    saveUi();
    syncOverlay();
  });

  // ── 再生位置のつまみ ──
  const scrub = createSlider($('np-scrub'), {
    text: (v) => { const d = player.duration; return d > 0 ? `${formatTime(d * v)} / ${formatTime(d)}` : '0:00'; },
    onInput: (v) => {
      scrubbing = true;
      const d = player.duration;
      showTimes(d * v, d);
    },
    onChange: (v) => {
      scrubbing = false;
      const d = player.duration;
      if (d > 0) player.seek(v * d);
      else syncTime();
    },
    onCancel: () => { scrubbing = false; syncTime(); },
  });

  // ── 音量（アプリから変えられる端末だけ。iPhone は本体のボタンで変える）──
  let volumeReady = false;
  function setupVolume() {
    if (volumeReady || !player.volumeSupported) return;
    volumeReady = true;
    const start = typeof ui.volume === 'number' ? ui.volume : 1;
    const vol = createSlider($('np-vol'), {
      thumb: 26,
      text: (v) => `${Math.round(v * 100)}%`,
      onInput: (v) => player.setVolume(v),
      onChange: (v) => { player.setVolume(v); ui.volume = v; saveUi(); },
    });
    vol.value = start;
    player.setVolume(start);
    volBox.hidden = false;
    if (isOpen) layout();
  }
  player.addEventListener('volumesupport', setupVolume);
  setupVolume();

  // ── ボタン ──
  $('np-back').addEventListener('click', close);
  $('np-prev').addEventListener('click', () => player.prev());
  $('np-next').addEventListener('click', () => player.next(true));
  playBtn.addEventListener('click', () => player.toggle());
  shuffleBtn.addEventListener('click', () => player.setShuffle(!player.shuffle));
  repeatBtn.addEventListener('click', () => player.cycleRepeat());
  flipBtn.addEventListener('click', () => setFlipped(!flipped, true));

  // ── 裏面（再生する順番）──
  function setFlipped(on, animated) {
    flipped = on;
    if (!animated) card.style.transition = 'none';
    card.classList.toggle('flipped', on);
    if (!animated) { void card.offsetWidth; card.style.transition = ''; }
    flipBtn.setAttribute('aria-pressed', String(on));
    flipBtn.setAttribute('aria-label', on ? 'ジャケットにもどる' : '再生する順番を見る');
    front.setAttribute('aria-hidden', String(on));
    backface.setAttribute('aria-hidden', String(!on));
    front.style.pointerEvents = on ? 'none' : '';
    backface.style.pointerEvents = on ? '' : 'none';
    if (on) { buildQueue(); scrollQueueToCurrent(); }
  }
  backface.style.pointerEvents = 'none';

  function buildQueue() {
    if (!queueList) {
      queueList = new VList($('np-queue'), {
        heights: ROW_HEIGHTS,
        render: (item, node) => renderRow(item, node, { art, player }),
        onTap: (item) => {
          if (item.qi === player.index) { player.toggle(); return; }
          player.jumpTo(item.qi);
        },
      });
    }
    const items = [];
    player.queue.forEach((id, qi) => {
      const track = library.get(id);
      if (!track) return;
      items.push({
        kind: 'track', track, no: qi + 1, qi, sub: track.artist || UNKNOWN_ARTIST,
        markPlaying: qi === player.index,
      });
    });
    queueList.setItems(items, { keepScroll: true });
  }

  function scrollQueueToCurrent() {
    if (!queueList) return;
    const i = queueList.items.findIndex((it) => it.qi === player.index);
    if (i >= 0) queueList.scrollToIndex(i, 'center');
  }

  // ── 再生エンジンからのお知らせ ──
  player.addEventListener('track', syncTrack);
  player.addEventListener('state', syncState);
  player.addEventListener('time', syncTime);
  player.addEventListener('queue', syncQueue);

  // 回した直後は画面の大きさがまだ古いことがあるので、少し待ってもう一度合わせる
  window.addEventListener('resize', () => {
    if (!isOpen) return;
    layout();
    setTimeout(() => { if (isOpen) layout(); }, 300);
  });

  syncAll();

  return {
    open,
    close,
    get isOpen() { return isOpen; },
    onClose(fn) { listeners.close.push(fn); },
  };
}
