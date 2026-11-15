// 再生エンジン。
// <audio> を1つだけ使い回します（iPhone では、画面を消したあとも次の曲へ進めるように、
// 同じ <audio> の中身を差し替えるやり方がいちばん確実なため）。
//
// 出すお知らせ（イベント）:
//   'track'   いまの曲が変わった
//   'state'   再生 / 一時停止が変わった
//   'time'    再生位置が進んだ
//   'queue'   ならび・シャッフル・リピートが変わった
//   'error'   再生できなかった（detail: { track, message }）
//   'volumesupport'  アプリから音量を変えられる端末だと分かった
//   'durationfix'    曲の本当の長さが分かって、控えを直した（detail: { track }）

// 無音の短い WAV。最初のタップの中で一度これを鳴らしておくと、
// そのあとはタップなしでも（次の曲への切り替えなどで）play() が通るようになる
const SILENCE = 'data:audio/wav;base64,UklGRkQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YSAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';

const REPEAT_MODES = ['off', 'all', 'one'];
const POS_KEY = 'music.pos';   // 続きの位置（localStorage。すぐ書けて、裏に回る直前でも間に合う）

// 先に用意しておく「となりの曲」の大きさの上限（メモリを使いすぎないように）
const READY_NEXT_MAX = 160 * 1024 * 1024;
const READY_PREV_MAX = 48 * 1024 * 1024;

export class Player extends EventTarget {
  // earlySwitchWhenHidden: 画面を消している間は、曲が終わるほんの少し手前で次の曲へ切りかえる。
  //   iPhone のホーム画面アプリには「曲を最後まで流しきると、裏では次の曲を鳴らしはじめられない」
  //   という不具合の報告があるため（音が鳴っているうちに切りかえれば通る）。iPhone / iPad だけで使う
  constructor({ audio, db, library, earlySwitchWhenHidden = false }) {
    super();
    this.audio = audio;
    this.db = db;
    this.library = library;
    this.earlySwitch = !!earlySwitchWhenHidden;

    this.base = [];        // もとのならび（曲 id）
    this.queue = [];       // 実際に流す順（シャッフルのときは混ぜた順）
    this.index = -1;
    this.shuffle = false;
    this.repeat = 'off';
    this.current = null;   // いまの曲
    this.wantPlay = false; // 「鳴らしていたい」かどうか（読み込み中も true）

    this.artworkProvider = null;   // (track) => Promise<[{src,sizes,type}]>  ロック画面の絵
    this.volumeSupported = false;

    this._url = null;          // いまの曲の objectURL
    this._loadToken = 0;       // 読み込みの世代（古い読み込みの結果を捨てるための番号）
    this._ready = new Map();   // 先に用意した「となりの曲」  曲 id → objectURL
    this._prepToken = 0;
    this._pendingSeek = null;  // 読み込めたら移動する位置（秒）
    this._restoreTime = 0;     // 前回の続きの位置（まだ読み込んでいないとき）
    this._lastTime = 0;        // 最後に分かっている再生位置
    this._loaded = false;      // いまの曲を <audio> に入れてあるか
    this._unlocked = false;
    this._errorStreak = 0;
    this._lastPosSave = 0;
    this._lastDbPosSave = 0;
    this._queueSaveTimer = 0;
    this._silent = false;      // 無音の WAV を入れている間
    this._earlyFor = -1;       // 早めの切りかえを済ませた世代
    this._sourceSetAt = 0;     // <audio> に曲を入れた時刻
    this._resumeOnVisible = false;   // 裏で鳴らしそこねた。表に戻ったら鳴らしなおす
    this._meta = null;         // ロック画面に出している曲の情報

    this._bindAudio();
    this._bindMediaSession();

    detectVolumeSupport().then((ok) => {
      if (!ok) return;
      this.volumeSupported = true;
      this._emit('volumesupport');
    });
  }

  // ── 状態 ─────────────────────────────────────────────
  get playing() { return this.wantPlay; }
  get time() {
    if (!this._loaded) return this._restoreTime;
    if (this._pendingSeek != null) return this._pendingSeek;
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
    if (!ids || !ids.length) return;
    this._unlock();
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
      this.index = Math.min(ids.length - 1, Math.max(0, startIndex));
    }
    this._emit('queue');
    this._saveQueue();
    this.wantPlay = true;
    this._errorStreak = 0;
    this._load(this.index, { autoplay: true });
    this._emit('state');
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
    this._resumeOnVisible = false;
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
    this._resumeOnVisible = false;
    if (this._loaded) this.audio.pause();
    this._emit('state');
    this._setPlaybackState();
    this._savePos(true);
  }

  // userAction: 人が「次へ」を押したとき true。曲が終わって自動で進むとき false
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
        this._setPlaybackState();
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
    this._errorStreak = 0;
    this._load(i, { autoplay: true });
    this._emit('state');
  }

  seek(sec) {
    if (!this.hasQueue) return;
    const d = this.duration;
    let t = Math.max(0, Number(sec) || 0);
    if (d > 0) t = Math.min(t, Math.max(0, d - 0.25));
    if (!this._loaded) {
      this._restoreTime = t;
    } else if (this.audio.readyState < 1) {
      this._pendingSeek = t;   // まだ読み込み中。読み込めたら移動する
    } else {
      try { this.audio.currentTime = t; } catch (_) { this._pendingSeek = t; }
    }
    this._lastTime = t;
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
        // いまの曲を先頭に、残りを混ぜる（同じ曲が何回か入ったならびでも数が合うように、抜くのは1つだけ）
        const rest = this.queue.slice();
        rest.splice(this.index, 1);
        this.queue = [cur, ...shuffled(rest)];
        this.index = 0;
      } else {
        this.queue = this.base.slice();
        const i = this.queue.indexOf(cur);
        this.index = i >= 0 ? i : 0;
      }
    }
    this._prepareNeighbors();
    this._emit('queue');
    this._saveQueue();
    this._savePos(true);
  }

  cycleRepeat() {
    const i = REPEAT_MODES.indexOf(this.repeat);
    this.repeat = REPEAT_MODES[(i + 1) % REPEAT_MODES.length];
    this._prepareNeighbors();
    this._emit('queue');
    this._saveQueue();
  }

  // いまの曲のすぐ後ろに差し込む（「次に再生」）
  playNext(ids) {
    if (!ids || !ids.length) return;
    if (!this.hasQueue) { this.playList(ids, 0); return; }
    const cur = this.queue[this.index];
    this.queue.splice(this.index + 1, 0, ...ids);
    const bi = this.base.indexOf(cur);
    this.base.splice(bi >= 0 ? bi + 1 : this.base.length, 0, ...ids);
    this._prepareNeighbors();
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
    for (const id of ids) this._dropReady(id);
    if (!this.queue.some((id) => gone.has(id))) return;
    const curId = this.hasQueue ? this.queue[this.index] : null;
    const before = this.queue.slice(0, Math.max(0, this.index)).filter((id) => gone.has(id)).length;
    this.base = this.base.filter((id) => !gone.has(id));
    this.queue = this.queue.filter((id) => !gone.has(id));
    if (!this.queue.length) {
      this._stopAndClear();
    } else if (curId != null && gone.has(curId)) {
      // いまの曲が消えた：同じ場所にずれてきた曲へ。最後だったら先頭に戻して止める
      let ni = this.index - before;
      let autoplay = this.wantPlay;
      if (ni >= this.queue.length) { ni = 0; if (this.repeat !== 'all') autoplay = false; }
      this.wantPlay = autoplay;
      this._load(ni, { autoplay });
      this._emit('state');
    } else {
      this.index -= before;
      this._prepareNeighbors();
    }
    this._emit('queue');
    this._saveQueue();
    this._savePos(true);
  }

  // ── 前回の続き ───────────────────────────────────────
  async restore() {
    let q = null;
    let pos = null;
    try {
      [q, pos] = await Promise.all([this.db.kvGet('queue'), this.db.kvGet('pos')]);
    } catch (_) { /* 読めなければ、続きなしで始める */ }
    // すぐ書ける localStorage のほうが新しければ、そちらを使う
    try {
      const raw = localStorage.getItem(POS_KEY);
      const quick = raw ? JSON.parse(raw) : null;
      if (quick && typeof quick.id === 'number' && (!pos || (quick.at || 0) >= (pos.at || 0))) pos = quick;
    } catch (_) { /* 何もしない */ }
    if (!q || !Array.isArray(q.queue)) return;
    const alive = (id) => this.library.get(id);
    this.queue = q.queue.filter(alive);
    this.base = (Array.isArray(q.base) ? q.base : q.queue).filter(alive);
    this.shuffle = !!q.shuffle;
    this.repeat = REPEAT_MODES.includes(q.repeat) ? q.repeat : 'off';
    if (!this.queue.length) { this.base = []; return; }
    let index = 0;
    let time = 0;
    if (pos && typeof pos.id === 'number') {
      const i = this.queue[pos.index] === pos.id ? pos.index : this.queue.indexOf(pos.id);
      if (i >= 0) { index = i; time = Number(pos.time) || 0; }
    }
    this.index = index;
    this.current = this.library.get(this.queue[index]) || null;
    this._restoreTime = time;
    this._lastTime = time;
    this._loaded = false;
    this.wantPlay = false;
    this._emit('queue');
    this._emit('track');
    this._updateMediaMetadata();
  }

  // ── 中の仕事 ─────────────────────────────────────────

  // 最初のタップの中で <audio> を「使ってよい」状態にする（iPhone の決まりごと）。
  // タップの流れの中で一度 play() を呼んでおけば、そのあとは読み込みを待ってから play() しても通る
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
    this._lastTime = position || 0;
    this._loaded = false;
    this._pendingSeek = null;
    this._earlyFor = -1;
    this._emit('track');
    this._emit('time');
    this._updateMediaMetadata();
    this._savePos(true);
    if (!track) { this._failCurrent('曲が見つかりません', token); return; }

    // 先に用意してあればそれを使う（待ち時間なし。曲が終わったその場で切りかえられる）
    let url = this._ready.get(id);
    if (url) {
      this._ready.delete(id);
    } else {
      let blob;
      try {
        blob = await this.db.getFile(id, track.mime);
      } catch (err) {
        this._failCurrent('ファイルを読み出せませんでした', token);
        return;
      }
      if (token !== this._loadToken) return;   // 待っている間に、別の曲が選ばれた
      if (!blob) { this._failCurrent('ファイルが見つかりません', token); return; }
      url = URL.createObjectURL(blob);
    }
    this._setSource(url, { autoplay, position });
  }

  _setSource(url, { autoplay, position = 0 }) {
    const a = this.audio;
    const old = this._url;
    this._silent = false;
    this._url = url;
    this._pendingSeek = position > 0 ? position : null;
    this._loaded = true;
    this._sourceSetAt = Date.now();
    a.src = url;
    if (autoplay) {
      this._play();
    } else {
      try { a.load(); } catch (_) { /* 何もしない */ }
    }
    // 前の曲の URL は、もう <audio> から外れたので手放してよい
    if (old && old !== url) URL.revokeObjectURL(old);
    this._prepareNeighbors();
  }

  _play() {
    const a = this.audio;
    const token = this._loadToken;
    let p;
    try { p = a.play(); } catch (_) { p = null; }
    if (p && p.catch) {
      p.catch((err) => {
        if (token !== this._loadToken) return;            // もう別の曲の話
        if (!err || err.name === 'AbortError') return;    // 曲の差し替えで取り消されただけ
        if (err.name === 'NotAllowedError') {
          // タップなしでは鳴らせない状況。止まった表示にして、次のタップ（または表に戻るの）を待つ
          if (document.hidden) this._resumeOnVisible = true;
          this.wantPlay = false;
          this._unlocked = false;
          this._emit('state');
          this._setPlaybackState();
        }
        // NotSupportedError は <audio> の error イベントのほうで扱う
      });
    }
  }

  // となりの曲（次と、ひとつ前）のファイルを先に読み出して URL を作っておく。
  // こうしておくと、曲が終わった瞬間や、ロック画面で「次へ」「前へ」を押した瞬間に、
  // 待ちなしで切りかえられる（画面を消していても止まりにくい）
  async _prepareNeighbors() {
    const token = ++this._prepToken;
    const want = new Map();   // 曲 id → 大きさの上限
    if (this.hasQueue) {
      const n = this.queue.length;
      if (this.repeat !== 'one' && n > 1) {
        let ni = this.index + 1;
        if (ni >= n) ni = 0;   // 最後の曲のあと「次へ」を押すと先頭に行くので、先頭も用意しておく
        want.set(this.queue[ni], READY_NEXT_MAX);
      }
      if (n > 1) {
        let pi = this.index - 1;
        if (pi < 0) pi = this.repeat === 'all' ? n - 1 : -1;
        if (pi >= 0 && !want.has(this.queue[pi])) want.set(this.queue[pi], READY_PREV_MAX);
      }
    }
    for (const id of Array.from(this._ready.keys())) {
      if (!want.has(id)) this._dropReady(id);
    }
    for (const [id, limit] of want) {
      if (this._ready.has(id)) continue;
      const track = this.library.get(id);
      if (!track || (track.size || 0) > limit) continue;
      let blob;
      try { blob = await this.db.getFile(id, track.mime); } catch (_) { continue; }
      if (token !== this._prepToken) return;   // ならびが変わった。新しいほうの呼び出しにまかせる
      if (!blob || this._ready.has(id)) continue;
      this._ready.set(id, URL.createObjectURL(blob));
    }
  }

  _dropReady(id) {
    const url = this._ready.get(id);
    if (!url) return;
    this._ready.delete(id);
    URL.revokeObjectURL(url);
  }

  _stopAndClear() {
    this._loadToken++;
    this._prepToken++;
    this.wantPlay = false;
    this._resumeOnVisible = false;
    this.index = -1;
    this.current = null;
    this._loaded = false;
    this._restoreTime = 0;
    this._lastTime = 0;
    this._pendingSeek = null;
    try { this.audio.pause(); } catch (_) { /* 何もしない */ }
    this.audio.removeAttribute('src');
    try { this.audio.load(); } catch (_) { /* 何もしない */ }
    if (this._url) { URL.revokeObjectURL(this._url); this._url = null; }
    for (const id of Array.from(this._ready.keys())) this._dropReady(id);
    this._meta = null;
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
        if (this.repeat !== 'all') { this.wantPlay = false; this._emit('state'); this._setPlaybackState(); return; }
        ni = 0;
      }
      this._load(ni, { autoplay: true });
    } else {
      this.wantPlay = false;
      this._emit('state');
      this._setPlaybackState();
    }
  }

  // 曲が終わった（または、終わる直前に早めに切りかえる）ときの進め方
  _afterEnd(early) {
    const a = this.audio;
    if (this.repeat === 'one') {
      this._countPlay();
      try { a.currentTime = 0; } catch (_) { /* 何もしない */ }
      if (!early) this._play();
      return;
    }
    if (early) {
      // 早めに切りかえるのは、次の曲がもう用意できているときだけ（待ちなしで切りかえられるとき）
      let ni = this.index + 1;
      if (ni >= this.queue.length) {
        if (this.repeat !== 'all') return;   // 最後の曲は、そのまま最後まで流す
        ni = 0;
      }
      if (!this._ready.has(this.queue[ni])) return;
    }
    this._countPlay();
    this.next(false);
  }

  _bindAudio() {
    const a = this.audio;

    a.addEventListener('loadedmetadata', () => {
      if (this._silent || !this._loaded) return;
      if (this._pendingSeek != null) {
        const t = this._pendingSeek;
        this._pendingSeek = null;
        const d = a.duration;
        try { a.currentTime = isFinite(d) && d > 0 ? Math.min(t, Math.max(0, d - 0.25)) : t; } catch (_) { /* 何もしない */ }
      }
      // 実際の長さが分かったら、控えてある長さを直す
      const t = this.current;
      if (t && isFinite(a.duration) && a.duration > 0 && Math.abs((t.duration || 0) - a.duration) > 1) {
        t.duration = a.duration;
        this.db.updateTrack(t).catch(() => {});
        this._emit('durationfix', { track: t });
      }
      this._emit('time');
      this._updatePositionState();
    });

    a.addEventListener('timeupdate', () => {
      if (this._silent || !this._loaded) return;
      this._lastTime = a.currentTime || 0;
      this._emit('time');
      this._savePos(false);
      // 画面を消している間は、終わるほんの少し手前で次の曲へ（理由は constructor の説明に）
      if (this.earlySwitch && document.hidden && this.wantPlay && !a.paused && !a.seeking) {
        const d = a.duration;
        if (isFinite(d) && d > 2) {
          const left = d - a.currentTime;
          if (left < 0.7 && this._earlyFor !== this._loadToken) {
            this._earlyFor = this._loadToken;
            this._afterEnd(true);
          } else if (left > 1.2) {
            this._earlyFor = -1;   // 1曲リピートで頭に戻ったあと、もう一度使えるように
          }
        }
      }
    });

    a.addEventListener('playing', () => {
      if (this._silent) {
        // 無音の「使ってよい」合図が鳴っただけ。本物の曲がまだなら止めておく
        if (!this._loaded) a.pause();
        return;
      }
      this._errorStreak = 0;
      this._resumeOnVisible = false;
      if (!this.wantPlay) { this.wantPlay = true; this._emit('state'); }
      // iPhone では、鳴りはじめる前に入れた設定が効かないことがあるので、鳴りだすたびに入れなおす
      this._bindMediaSession();
      this._applyMediaMetadata();
      this._setPlaybackState();
      this._updatePositionState();
    });

    a.addEventListener('pause', () => {
      if (this._silent || !this._loaded) return;
      // 曲の終わりで出る pause は無視（ended のほうで次へ進める）。
      // 曲を差し替えた直後に遅れて届いた古い pause も無視
      if (a.ended || !a.paused) return;
      // 読み込みに失敗したときの pause も無視（error のほうで次の曲へ進める）
      if (a.error) return;
      // 電話の着信やイヤホンを抜いたときなど、外から止められた場合もここに来る。
      // 勝手に鳴らしなおさず、止まった表示にする
      if (this.wantPlay) {
        this.wantPlay = false;
        this._emit('state');
      }
      this._setPlaybackState();
      this._savePos(true);
    });

    a.addEventListener('ended', () => {
      if (this._silent || !this._loaded) return;
      this._afterEnd(false);
    });

    a.addEventListener('seeked', () => {
      if (this._silent || !this._loaded) return;
      this._lastTime = a.currentTime || 0;
      this._emit('time');
      this._updatePositionState();
      this._savePos(true);
    });

    a.addEventListener('error', () => {
      if (this._silent || !this._loaded) return;
      this._failCurrent('この曲は再生できませんでした', this._loadToken);
    });

    // 画面を離れるとき・裏に回るときに、続きの位置を控える。表に戻ったら、止まっていないか確かめる
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this._savePos(true);
      else this._recover();
    });
    window.addEventListener('pagehide', () => this._savePos(true));
  }

  // 表に戻ったとき：裏にいる間に鳴らしそこねていたら鳴らしなおす。<audio> の中身が失われていたら入れなおす
  _recover() {
    if (!this.hasQueue || !this._loaded) { this._resumeOnVisible = false; return; }
    const a = this.audio;
    const resume = this._resumeOnVisible || this.wantPlay;
    this._resumeOnVisible = false;
    // 入れたばかり（読み込みがこれから始まるところ）は「失われた」と見なさない
    const lost = a.readyState === 0 && a.networkState === 3 && Date.now() - this._sourceSetAt > 3000;
    if (a.error || lost) {
      this.wantPlay = resume;
      this._load(this.index, { autoplay: resume, position: this._lastTime });
      this._emit('state');
    } else if (resume && a.paused && !a.ended) {
      this.wantPlay = true;
      this._play();
      this._emit('state');
    }
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
    // 「10秒もどる・すすむ」を登録すると、iPhone では「前の曲・次の曲」のボタンが出なくなるので、登録しない
    set('seekbackward', null);
    set('seekforward', null);
  }

  _updateMediaMetadata() {
    if (!('mediaSession' in navigator) || typeof MediaMetadata === 'undefined') return;
    const t = this.current;
    if (!t) { this._meta = null; return; }
    const base = {
      title: t.title || '',
      artist: t.artist || '',
      album: t.album || '',
    };
    try { this._meta = new MediaMetadata(base); } catch (_) { this._meta = null; return; }
    this._applyMediaMetadata();
    if (this.artworkProvider && t.artId) {
      Promise.resolve(this.artworkProvider(t)).then((artwork) => {
        if (this.current !== t || !artwork || !artwork.length) return;
        try { this._meta = new MediaMetadata({ ...base, artwork }); } catch (_) { return; }
        this._applyMediaMetadata();
      }).catch(() => {});
    }
  }

  _applyMediaMetadata() {
    if (!this._meta || !('mediaSession' in navigator)) return;
    try { navigator.mediaSession.metadata = this._meta; } catch (_) { /* 何もしない */ }
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

  // force でなければ、1秒に1回まで（localStorage）・5秒に1回まで（IndexedDB）
  _savePos(force) {
    const now = Date.now();
    if (!force && now - this._lastPosSave < 1000) return;
    this._lastPosSave = now;
    const pos = this.hasQueue
      ? { index: this.index, id: this.queue[this.index], time: this.time, at: now }
      : null;
    try {
      if (pos) localStorage.setItem(POS_KEY, JSON.stringify(pos));
      else localStorage.removeItem(POS_KEY);
    } catch (_) { /* 使えない端末では IndexedDB だけに控える */ }
    if (!force && now - this._lastDbPosSave < 5000) return;
    this._lastDbPosSave = now;
    this.db.kvSet('pos', pos).catch(() => {});
  }

  _emit(name, detail) {
    this.dispatchEvent(detail ? new CustomEvent(name, { detail }) : new Event(name));
  }
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

// 音量をアプリから変えられる端末か（iPhone は本体のボタンでしか変えられない）。
// iPhone では、値を入れた直後は変わったように見えて、少しあとで元に戻るので、間をおいて確かめる
function detectVolumeSupport() {
  return new Promise((resolve) => {
    let a;
    try {
      a = document.createElement('audio');
      a.volume = 0.5;
    } catch (_) {
      resolve(false);
      return;
    }
    setTimeout(() => {
      let ok = false;
      try { ok = a.volume === 0.5; } catch (_) { ok = false; }
      resolve(ok);
    }, 80);
  });
}
