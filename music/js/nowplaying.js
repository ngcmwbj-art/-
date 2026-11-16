// 再生中の画面。
// ジャケットの色がにじむ背景の上に、大きなジャケット・題名・再生位置のつまみ・操作ボタンが並びます。
// 右上のボタンでジャケットが裏返り、これから流れる順番が出ます。下からせり上がり、左上のボタンで下へ閉じます。

import { svg } from './icons.js';
import { VList } from './vlist.js';
import { renderRow, ROW_HEIGHTS } from './rows.js';
import { createSlider } from './slider.js';
import { formatTime, UNKNOWN_ARTIST, UNKNOWN_ALBUM } from './library.js';

const $ = (id) => document.getElementById(id);

export function createNowPlaying({ player, library, art, db, ui, saveUi }) {
  const np = $('np');
  const main = $('main');
  const bg = $('np-bg');
  const stage = $('np-stage');
  const card = $('np-card');
  const front = $('np-front');
  const backface = $('np-backface');
  const artImg = $('np-art');
  const lyricsBox = $('np-lyrics');
  const lyricsBtn = $('np-lyrics-btn');
  const elapsed = $('np-elapsed');
  const remain = $('np-remain');
  const flipBtn = $('np-flip');
  const playBtn = $('np-play');
  const playIc = $('np-play-ic');
  const repeatBtn = $('np-repeat');
  const shuffleBtn = $('np-shuffle');
  const countEl = $('np-count');
  const volBox = $('np-volume');

  let isOpen = false;
  let flipped = false;
  let scrubbing = false;
  let scrubTrack = null;   // つまみを持ちはじめたときの曲
  let shownArtId;          // いま出しているジャケットの id（同じなら入れ替えない）
  let shownTrackId = null;
  let hasLyrics = false;
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
    void np.offsetWidth;            // ここで一度配置させてから動かす（下からせり上がる）
    np.classList.remove('off');
    openTimer = setTimeout(() => { if (isOpen) main.classList.add('away'); }, 470);
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
    }, 470);
    for (const fn of listeners.close) fn();
  }

  // ジャケットを、あいている場所に入るいちばん大きな正方形にする。
  // 大きさを数字で入れるのは、CSS まかせ（aspect-ratio）だと古い iPhone の Safari でつぶれることがあるため
  function layout() {
    if (np.hidden) return;
    const cs = getComputedStyle(stage);
    const w = stage.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const h = stage.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    const size = Math.max(80, Math.floor(Math.min(w, h, 460)));
    card.style.width = `${size}px`;
    card.style.height = `${size}px`;
  }

  // ── 表示を合わせる ──
  function syncTrack() {
    const t = player.current;
    if (!t) {
      if (isOpen) close();
      shownTrackId = null;
      return;
    }
    $('np-title').textContent = t.title || '';
    $('np-artist').textContent = t.artist || UNKNOWN_ARTIST;
    $('np-album').textContent = t.album || UNKNOWN_ALBUM;
    countEl.textContent = `${player.index + 1} / ${player.queue.length}`;

    if (shownArtId !== t.artId) {
      shownArtId = t.artId;
      const want = t.artId;
      if (!want) {
        artImg.hidden = true;
        artImg.removeAttribute('src');
        bg.style.backgroundImage = '';
      } else {
        art.fullUrl(want).then((url) => {
          if (shownArtId !== want) return;
          if (url) { artImg.src = url; artImg.hidden = false; } else { artImg.hidden = true; }
        });
        // 背景には、小さい絵を大きくぼかして使う（色だけがにじむ）
        art.midUrl(want).then((url) => {
          if (shownArtId !== want) return;
          bg.style.backgroundImage = url ? `url("${url}")` : '';
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
    // 止めている間は、ジャケットが少し小さくなる
    np.classList.toggle('paused', !playing);
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
    syncLyricsShown();
  }

  // ── 歌詞（タグに入っているとき。ジャケットを押すか、歌詞のボタンで出し入れ）──
  function syncLyricsShown() {
    const show = hasLyrics && ui.lyrics !== false;
    lyricsBox.hidden = !show;
    lyricsBtn.hidden = !hasLyrics;
    lyricsBtn.setAttribute('aria-pressed', String(show));
  }

  function syncLyrics() {
    const t = player.current;
    lyricsBox.textContent = '';
    hasLyrics = false;
    syncLyricsShown();
    if (!t || !t.hasLyrics) return;
    const id = t.id;
    db.getLyrics(id).then((text) => {
      if (!text || !player.current || player.current.id !== id) return;
      lyricsBox.textContent = text;
      lyricsBox.scrollTop = 0;
      hasLyrics = true;
      syncLyricsShown();
    }).catch(() => {});
  }

  const toggleLyrics = () => {
    if (!hasLyrics) return;
    ui.lyrics = ui.lyrics === false;
    saveUi();
    syncLyricsShown();
  };
  front.addEventListener('click', toggleLyrics);
  lyricsBtn.addEventListener('click', toggleLyrics);

  // ── 再生位置のつまみ ──
  const scrub = createSlider($('np-scrub'), {
    text: (v) => { const d = player.duration; return d > 0 ? `${formatTime(d * v)} / ${formatTime(d)}` : '0:00'; },
    onInput: (v) => {
      if (!scrubbing) scrubTrack = player.current;
      scrubbing = true;
      const d = player.duration;
      showTimes(d * v, d);
    },
    onChange: (v) => {
      scrubbing = false;
      const d = player.duration;
      // つまみを持っている間に曲が変わっていたら、新しい曲の位置は動かさない
      if (d > 0 && player.current === scrubTrack) player.seek(v * d);
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
