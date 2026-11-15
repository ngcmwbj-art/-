// 再生エンジン。
// <audio> を1つだけ使い回します（iPhone では、画面を消したあとも次の曲へ進めるように、
// 同じ <audio> の中身を差し替えるやり方がいちばん確実なため）。
//
// 出すお知らせ（イベント）:
//   'track'  いまの曲が変わった
//   'state'  再生 / 一時停止が変わった
//   'time'   再生位置が進んだ
//   'queue'  ならび・シャッフル・リピートが変わった
//   'error'  再生できなかった（detail: { track, message }）

// 無音の短い WAV。最初のタップの中で一度これを鳴らしておくと、
// そのあとはタップなしでも（次の曲への切り替えなどで）play() が通るようになる
const SILENCE = 'data:audio/wav;base64,UklGRkQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YSAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';

const REPEAT_MODES = ['off', 'all', 'one'];

export class Player extends EventTarget {
  constructor({ audio, db, library }) {
    super();
    this.audio = audio;
    this.db = db;
    this.library = library;

    this.base = [];        // もとのならび（曲 id）
    this.queue = [];       // 実際に流す順（シャッフルのときは混ぜた順）
    this.index = -1;
    this.shuffle = false;
    this.repeat = 'off';
    this.current = null;   // いまの曲
    this.wantPlay = false; // 「鳴らしていたい」かどうか（読み込み中も true）

    this.artworkProvider = null;   // (track) => Promise<[{src,sizes,type}]>  ロック画面の絵

    this._url = null;          // いまの曲の objectURL
    this._loadToken = 0;
    this._next = null;         // 先に用意しておく次の曲 { id, index, url }
    this._nextToken = 0;
    this._pendingSeek = null;  // 読み込めたら移動する位置（秒）
    this._restoreTime = 0;     // 前回の続きの位置（まだ読み込んでいないとき）
    this._loaded = false;      // いまの曲を <audio> に入れてあるか
    this._unlocked = false;
    this._errorStreak = 0;
    this._retriedCopy = false;
    this._lastPosSave = 0;
    this._queueSaveTimer = 0;
    this._silent = false;      // 無音の WAV を入れている間
    this._switching = false;   // 曲を入れ替えている最中（その間の pause は無視する）

    this.volumeSupported = detectVolumeSupport();

    this._bindAudio();
    this._bindMediaSession();
  }

  // ── 状態 ─────────────────────────────────────────────
  get playing() { return this.wantPlay; }
  get time() {
    if (!this._loaded) return this._restoreTime;
    return this.audio.currentTime || 0;
  }
  get duration() {
    const d = this._loaded ? this.audio.duration : NaN;
    if (isFinite(d) && d > 0) return d;
    return (this.current && this.current.duration) || 0;
  }
  get hasQueue() { return this.queue.length > 0 && this.index >= 0; }

  // ── 再生をはじめる ───────────────────────────────────
  // ids のならびを、startIndex の曲から流す。shuffle を省くと今の設定のまま。
  // startIndex が -1 なら「シャッフル」行から（全部混ぜて先頭から）。
  playList(ids, startIndex = 0, opts = {}) {
    this._unlock();
    if (!ids || !ids.length) return;
    if (typeof opts.shuffle === 'boolean') this.shuffle = opts.shuffle;
    this.base = ids.slice();
    if (this.shuffle) {
      if (startIndex >= 0) {
        const first = ids[startIndex];
        const rest = ids.filter((_, i) => i !== startIndex);
        this.queue = [first, ...shuffled(rest)];
      } else {
        this.queue = shuffled(ids);
      }
      this.index = 0;
    } else {
      this.queue = ids.slice();
      this.index = Math.max(0, startIndex);
    }
    this._dropNext();
    this._emit('queue');
    this._saveQueue();
    this.wantPlay = true;
    this._errorStreak = 0;
    this._load(this.index, { autoplay: true });
  }

  toggle() {
    if (!this.hasQueue) return;
    if (this.wantPlay) this.pause(); else this.play();
  }

  play() {
    if (!this.hasQueue) return;
    this._unlock();
    this.wantPlay = true;
    this._errorStreak = 0;
    if (!this._loaded) {
      // 起動したあと最初の再生：前回の続きの位置から
      this._load(this.index, { autoplay: true, position: this._restoreTime });
    } else {
      this._play();
    }
    this._emit('state');
  }

  pause() {
    this.wantPlay = false;
    if (this._loaded) this.audio.pause();
    this._emit('state');
    this._savePos(true);
  }

  next(userAction = true) {
    if (!this.hasQueue) return;
    if (userAction) this._unlock();
    let ni = this.index + 1;
    if (ni >= this.queue.length) {
      if (!userAction && this.repeat !== 'all') {
        // 最後まで流しおえた：先頭に戻して止める
        this.wantPlay = false;
        this._load(0, { autoplay: false });
        this._emit('state');
        return;
      }
      ni = 0;
    }
    this._load(ni, { autoplay: this.wantPlay });
  }

  prev() {
    if (!this.hasQueue) return;
    this._unlock();
    // 3秒より先まで聴いていたら、曲の頭に戻るだけ
    if (this.time > 3 || (this.index === 0 && this.repeat !== 'all')) {
      this.seek(0);
      return;
    }
    const pi = this.index > 0 ? this.index - 1 : this.queue.length - 1;
    this._load(pi, { autoplay: this.wantPlay });
  }

  // ならびの中の i 番目へ
  jumpTo(i) {
    if (i < 0 || i >= this.queue.length) return;
    this._unlock();
    this.wantPlay = true;
    this._load(i, { autoplay: true });
  }

  seek(sec) {
    const d = this.duration;
    let t = Math.max(0, sec);
    if (d > 0) t = Math.min(t, Math.max(0, d - 0.25));
    if (!this._loaded) {
      this._restoreTime = t;
    } else if (this.audio.readyState < 1) {
      this._pendingSeek = t;   // まだ読み込み中。読み込めたら移動する
    } else {
      try { this.audio.currentTime = t; } catch (_) { this._pendingSeek = t; }
    }
    this._emit('time');
    this._savePos(true);
  }

  setShuffle(on) {
    on = !!on;
    if (on === this.shuffle) return;
    this.shuffle = on;
    if (this.hasQueue) {
      const cur = this.queue[this.index];
      if (on) {
        const rest = this.base.filter((id) => id !== cur);
        // 同じ曲が何回も入っているならびでも数が合うように、今の曲は1つだけ抜く
        const extra = this.base.length - rest.length - 1;
        for (let i = 0; i < extra; i++) rest.push(cur);
        this.queue = [cur, ...shuffled(rest)];
        this.index = 0;
      } else {
        this.queue = this.base.slice();
        const i = this.queue.indexOf(cur);
        this.index = i >= 0 ? i : 0;
      }
    }
    this._dropNext();
    this._prepareNext();
    this._emit('queue');
    this._saveQueue();
    this._savePos(true);
  }

  cycleRepeat() {
    const i = REPEAT_MODES.indexOf(this.repeat);
    this.repeat = REPEAT_MODES[(i + 1) % REPEAT_MODES.length];
    this._dropNext();
    this._prepareNext();
    this._emit('queue');
    this._saveQueue();
  }

  // いまの曲のすぐ後ろに差し込む（「次に再生」）
  playNext(ids) {
    if (!ids.length) return;
    if (!this.hasQueue) { this.playList(ids, 0); return; }
    this.queue.splice(this.index + 1, 0, ...ids);
    const cur = this.queue[this.index];
    const bi = this.base.indexOf(cur);
    this.base.splice(bi >= 0 ? bi + 1 : this.base.length, 0, ...ids);
    this._dropNext();
    this._prepareNext();
    this._emit('queue');
    this._saveQueue();
  }

  setVolume(v) {
    if (!this.volumeSupported) return;
    this.audio.volume = Math.min(1, Math.max(0, v));
  }

  // 曲が消されたとき
  tracksRemoved(ids) {
    const gone = new Set(ids);
    if (!this.queue.some((id) => gone.has(id))) return;
    const curId = this.hasQueue ? this.queue[this.index] : null;
    const before = this.queue.slice(0, Math.max(0, this.index)).filter((id) => gone.has(id)).length;
    this.base = this.base.filter((id) => !gone.has(id));
    this.queue = this.queue.filter((id) => !gone.has(id));
    this._dropNext();
    if (!this.queue.length) {
      this._stopAndClear();
    } else if (curId != null && gone.has(curId)) {
      this.index = Math.min(this.index - before, this.queue.length - 1);
      this._load(this.index, { autoplay: this.wantPlay });
    } else {
      this.index -= before;
      this._prepareNext();
    }
    this._emit('queue');
    this._saveQueue();
    this._savePos(true);
  }

  // ── 前回の続き ───────────────────────────────────────
  async restore() {
    let q;
    let pos;
    try {
      [q, pos] = await Promise.all([this.db.kvGet('queue'), this.db.kvGet('pos')]);
    } catch (_) { return; }
    if (!q || !Array.isArray(q.queue)) return;
    const alive = (id) => this.library.get(id);
    this.base = (q.base || q.queue).filter(alive);
    this.queue = q.queue.filter(alive);
    this.shuffle = !!q.shuffle;
    this.repeat = REPEAT_MODES.includes(q.repeat) ? q.repeat : 'off';
    if (!this.queue.length) { this.base = []; return; }
    let index = 0;
    let time = 0;
    if (pos && typeof pos.id === 'number') {
      const i = this.queue[pos.index] === pos.id ? pos.index : this.queue.indexOf(pos.id);
      if (i >= 0) { index = i; time = pos.time || 0; }
    }
    this.index = index;
    this.current = this.library.get(this.queue[index]) || null;
    this._restoreTime = time;
    this._loaded = false;
    this.wantPlay = false;
    this._emit('queue');
    this._emit('track');
    this._updateMediaMetadata();
  }

  // ── 中の仕事 ─────────────────────────────────────────

  // 最初のタップの中で <audio> を「使ってよい」状態にする（iPhone の決まりごと）
  _unlock() {
    if (this._unlocked) return;
    this._unlocked = true;
    const a = this.audio;
    try {
      if (!this._loaded) {
        this._silent = true;
        a.src = SILENCE;
      }
      const p = a.play();
      if (p && p.catch) p.catch(() => {});
      // 曲は入っているが止めてある場合は、鳴りださないようにすぐ止めなおす
      if (this._loaded && !this.wantPlay) a.pause();
    } catch (_) { /* 何もしない */ }
  }

  async _load(index, { autoplay, position = 0 }) {
    const token = ++this._loadToken;
    const id = this.queue[index];
    const track = this.library.get(id);
    this.index = index;
    this.current = track || null;
    this._restoreTime = position || 0;
    this._loaded = false;
    this._retriedCopy = false;
    this._emit('track');
    this._emit('time');
    this._updateMediaMetadata();
    this._savePos(true);
    if (!track) { this._failCurrent('曲が見つかりません', token); return; }

    // 先に用意してあればそれを使う（待ち時間なし）
    let url = null;
    if (this._next && this._next.id === id) {
      url = this._next.url;
      this._next = null;
    } else {
      this._dropNext();
      let blob;
      try {
        blob = await this.db.getFile(id);
      } catch (err) {
        if (token !== this._loadToken) return;
        this._failCurrent('ファイルを読み出せませんでした', token);
        return;
      }
      if (token !== this._loadToken) return;
      if (!blob) { this._failCurrent('ファイルが見つかりません', token); return; }
      url = URL.createObjectURL(typed(blob, track.mime));
    }
    this._setSource(url, { autoplay, position });
  }

  _setSource(url, { autoplay, position = 0 }) {
    const a = this.audio;
    const old = this._url;
    this._switching = true;
    this._silent = false;
    this._url = url;
    this._pendingSeek = position > 0 ? position : null;
    this._loaded = true;
    a.src = url;
    if (autoplay) {
      this._play();
    } else {
      try { a.load(); } catch (_) { /* 何もしない */ }
    }
    this._switching = false;
    if (old) URL.revokeObjectURL(old);
    this._prepareNext();
  }

  _play() {
    const a = this.audio;
    let p;
    try { p = a.play(); } catch (_) { p = null; }
    if (p && p.catch) {
      p.catch((err) => {
        if (!err || err.name === 'AbortError') return;   // 曲の差し替えで取り消されただけ
        if (err.name === 'NotAllowedError') {
          // タップなしでは鳴らせない状況。止まった表示にして、次のタップを待つ
          this.wantPlay = false;
          this._unlocked = false;
          this._emit('state');
        }
      });
    }
  }

  // 次の曲のファイルを先に読み出して URL を作っておく。
  // こうしておくと、曲が終わった瞬間に待ちなしで次へ切り替えられる（画面を消していても止まりにくい）
  async _prepareNext() {
    if (!this.hasQueue || this.repeat === 'one') return;
    let ni = this.index + 1;
    if (ni >= this.queue.length) {
      if (this.repeat !== 'all') return;
      ni = 0;
    }
    if (ni === this.index) return;
    const id = this.queue[ni];
    if (this._next && this._next.id === id) return;
    this._dropNext();
    const token = ++this._nextToken;
    const track = this.library.get(id);
    if (!track) return;
    let blob;
    try { blob = await this.db.getFile(id); } catch (_) { return; }
    if (token !== this._nextToken || !blob) return;
    this._next = { id, url: URL.createObjectURL(typed(blob, track.mime)) };
  }

  _dropNext() {
    this._nextToken++;
    if (this._next) {
      URL.revokeObjectURL(this._next.url);
      this._next = null;
    }
  }

  _stopAndClear() {
    this._loadToken++;
    this.wantPlay = false;
    this.index = -1;
    this.current = null;
    this._loaded = false;
    this._restoreTime = 0;
    try { this.audio.pause(); } catch (_) { /* 何もしない */ }
    this.audio.removeAttribute('src');
    try { this.audio.load(); } catch (_) { /* 何もしない */ }
    if (this._url) { URL.revokeObjectURL(this._url); this._url = null; }
    this._emit('track');
    this._emit('state');
    if ('mediaSession' in navigator) {
      try { navigator.mediaSession.metadata = null; navigator.mediaSession.playbackState = 'none'; } catch (_) { /* 何もしない */ }
    }
  }

  // いまの曲が鳴らせなかったとき：知らせて、次の曲へ（続けて失敗したら止める）
  _failCurrent(message, token) {
    if (token !== this._loadToken) return;
    const track = this.current;
    this._errorStreak++;
    this._emit('error', { track, message });
    const limit = Math.min(this.queue.length, 5);
    if (this.wantPlay && this._errorStreak < limit && this.queue.length > 1) {
      let ni = this.index + 1;
      if (ni >= this.queue.length) {
        if (this.repeat !== 'all') { this.wantPlay = false; this._emit('state'); return; }
        ni = 0;
      }
      this._load(ni, { autoplay: true });
    } else {
      this.wantPlay = false;
      this._emit('state');
    }
  }

  _bindAudio() {
    const a = this.audio;

    a.addEventListener('loadedmetadata', () => {
      if (this._silent) return;
      if (this._pendingSeek != null) {
        const t = this._pendingSeek;
        this._pendingSeek = null;
        try { a.currentTime = Math.min(t, Math.max(0, (a.duration || t) - 0.25)); } catch (_) { /* 何もしない */ }
      }
      // 実際の長さが分かったら、控えてある長さを直す
      const t = this.current;
      if (t && isFinite(a.duration) && a.duration > 0 && Math.abs((t.duration || 0) - a.duration) > 1) {
        t.duration = a.duration;
        this.db.updateTrack(t).catch(() => {});
        this.dispatchEvent(new CustomEvent('durationfix', { detail: { track: t } }));
      }
      this._emit('time');
      this._updatePositionState();
    });

    a.addEventListener('timeupdate', () => {
      if (this._silent) return;
      this._emit('time');
      this._savePos(false);
    });

    a.addEventListener('playing', () => {
      if (this._silent) {
        // 無音の「使ってよい」合図が鳴っただけ。本物の曲がまだなら止めておく
        if (!this._loaded) a.pause();
        return;
      }
      this._errorStreak = 0;
      if (!this.wantPlay) { this.wantPlay = true; this._emit('state'); }
      this._setPlaybackState();
      this._updatePositionState();
    });

    a.addEventListener('pause', () => {
      if (this._silent || this._switching) return;
      // 曲の終わりで出る pause は無視（ended のほうで次へ進める）。
      // 曲を差し替えた直後に遅れて届いた古い pause も無視
      if (a.ended || !a.paused) return;
      // 読み込みに失敗したときの pause も無視（error のほうで次の曲へ進める）
      if (a.error) return;
      // 電話の着信やイヤホンを抜いたときなど、外から止められた場合もここに来る
      if (this.wantPlay && this._loaded) {
        this.wantPlay = false;
        this._emit('state');
      }
      this._setPlaybackState();
      this._savePos(true);
    });

    a.addEventListener('ended', () => {
      if (this._silent) return;
      this._countPlay();
      if (this.repeat === 'one') {
        try { a.currentTime = 0; } catch (_) { /* 何もしない */ }
        this._play();
        return;
      }
      this.next(false);
    });

    a.addEventListener('seeked', () => {
      if (this._silent) return;
      this._emit('time');
      this._updatePositionState();
    });

    a.addEventListener('error', () => {
      if (this._silent || !this._loaded) return;
      const token = this._loadToken;
      const track = this.current;
      // IndexedDB から出した Blob をそのままでは鳴らせない端末がある。
      // 一度だけ、中身をメモリに写した Blob で試しなおす
      if (track && !this._retriedCopy) {
        this._retriedCopy = true;
        const autoplay = this.wantPlay;
        const position = a.currentTime || this._pendingSeek || 0;
        this.db.getFile(track.id).then((blob) => (blob ? blob.arrayBuffer() : null)).then((buf) => {
          if (token !== this._loadToken) return;
          if (!buf) { this._failCurrent('ファイルが見つかりません', token); return; }
          const copy = new Blob([buf], { type: track.mime || '' });
          this.wantPlay = autoplay;
          this._setSource(URL.createObjectURL(copy), { autoplay, position });
          this._retriedCopy = true;
        }).catch(() => this._failCurrent('この曲は再生できませんでした', token));
        return;
      }
      this._failCurrent('この曲は再生できませんでした', token);
    });

    // 画面を離れるとき・裏に回るときに、続きの位置を控える
    const saveNow = () => this._savePos(true);
    document.addEventListener('visibilitychange', () => { if (document.hidden) saveNow(); });
    window.addEventListener('pagehide', saveNow);
  }

  _countPlay() {
    const t = this.current;
    if (!t) return;
    t.playCount = (t.playCount || 0) + 1;
    t.lastPlayed = Date.now();
    this.db.updateTrack(t).catch(() => {});
  }

  // ── ロック画面・イヤホンのボタン（Media Session）──────
  _bindMediaSession() {
    if (!('mediaSession' in navigator)) return;
    const ms = navigator.mediaSession;
    const set = (name, fn) => { try { ms.setActionHandler(name, fn); } catch (_) { /* 対応していない操作 */ } };
    set('play', () => this.play());
    set('pause', () => this.pause());
    set('stop', () => this.pause());
    set('previoustrack', () => this.prev());
    set('nexttrack', () => this.next(true));
    set('seekto', (d) => { if (d && typeof d.seekTime === 'number') this.seek(d.seekTime); });
  }

  _updateMediaMetadata() {
    if (!('mediaSession' in navigator) || typeof MediaMetadata === 'undefined') return;
    const t = this.current;
    if (!t) return;
    const base = {
      title: t.title || '',
      artist: t.artist || '',
      album: t.album || '',
    };
    try { navigator.mediaSession.metadata = new MediaMetadata(base); } catch (_) { /* 何もしない */ }
    if (this.artworkProvider) {
      Promise.resolve(this.artworkProvider(t)).then((artwork) => {
        if (this.current !== t || !artwork || !artwork.length) return;
        try { navigator.mediaSession.metadata = new MediaMetadata({ ...base, artwork }); } catch (_) { /* 何もしない */ }
      }).catch(() => {});
    }
  }

  _setPlaybackState() {
    if (!('mediaSession' in navigator)) return;
    try { navigator.mediaSession.playbackState = this.wantPlay ? 'playing' : 'paused'; } catch (_) { /* 何もしない */ }
  }

  _updatePositionState() {
    if (!('mediaSession' in navigator) || !navigator.mediaSession.setPositionState) return;
    const a = this.audio;
    const d = a.duration;
    if (!isFinite(d) || d <= 0) return;
    try {
      navigator.mediaSession.setPositionState({
        duration: d,
        playbackRate: a.playbackRate || 1,
        position: Math.min(Math.max(0, a.currentTime || 0), d),
      });
    } catch (_) { /* 何もしない */ }
  }

  // ── 続きの位置を控える ───────────────────────────────
  _saveQueue() {
    clearTimeout(this._queueSaveTimer);
    this._queueSaveTimer = setTimeout(() => {
      this.db.kvSet('queue', {
        base: this.base, queue: this.queue, shuffle: this.shuffle, repeat: this.repeat,
      }).catch(() => {});
    }, 250);
  }

  _savePos(force) {
    const now = Date.now();
    if (!force && now - this._lastPosSave < 5000) return;
    this._lastPosSave = now;
    if (!this.hasQueue) { this.db.kvSet('pos', null).catch(() => {}); return; }
    this.db.kvSet('pos', {
      index: this.index, id: this.queue[this.index], time: this.time,
    }).catch(() => {});
  }

  _emit(name, detail) {
    this.dispatchEvent(detail ? new CustomEvent(name, { detail }) : new Event(name));
  }
}

// 保存してある Blob に種類（MIME）が付いていなければ付けなおす
function typed(blob, mime) {
  if (mime && blob.type !== mime) {
    try { return blob.slice(0, blob.size, mime); } catch (_) { /* そのまま使う */ }
  }
  return blob;
}

// ならびを混ぜる（フィッシャー–イェーツ）
function shuffled(list) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = a[i]; a[i] = a[j]; a[j] = tmp;
  }
  return a;
}

// 音量をアプリから変えられる端末か（iPhone / iPad は本体のボタンでしか変えられない）
function detectVolumeSupport() {
  try {
    const a = document.createElement('audio');
    a.volume = 0.5;
    return a.volume === 0.5;
  } catch (_) {
    return false;
  }
}
