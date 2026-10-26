'use strict';
/* =========================================================
   効果音とBGM（音の素材ファイルは使わず、Web Audio でその場で作る）
   - FR.Sound.sfx('hit') のように名前で鳴らす。名前と音の作り方は SFX にまとめる
   - BGM は画面ごとに曲（MOODS）を選び、短いフレーズをくり返す。和の五音音階
   - ブラウザは、最初に画面に触れるまで音を出せないので、最初のタップで音を起こす
   - 音のオン・オフは localStorage に保存（ゲームのセーブとは別）
   ========================================================= */
FR.Sound = {
  KEY: 'farm-roguelike-sound',
  settings: { bgm: true, sfx: true },
  VOL: { bgm: 0.32, sfx: 0.7 },
  ctx: null,
  mood: null,       // 今流している曲
  wanted: null,     // 鳴らしたい曲（音が起きる前に決まったもの）

  init() {
    try { Object.assign(FR.Sound.settings, JSON.parse(localStorage.getItem(FR.Sound.KEY) || '{}')); } catch (e) { /* 読めなければ初期値 */ }
    const unlock = () => FR.Sound.unlock();
    window.addEventListener('pointerdown', unlock, true);
    window.addEventListener('keydown', unlock, true);
    // ボタンを押したときの小さな音
    document.addEventListener('click', ev => {
      if (ev.target.closest('.btn, .map-choice, .farmer, .tab, .hud-btn, .harvest-btn, .end-turn, .modal-close, .pv-close')) FR.Sound.sfx('click');
    }, true);
    // 別のアプリに切り替えたら止め、戻ったら再開
    document.addEventListener('visibilitychange', () => {
      if (!FR.Sound.ctx) return;
      if (document.hidden) FR.Sound.ctx.suspend(); else FR.Sound.ctx.resume();
    });
  },

  unlock() {
    if (!FR.Sound.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      FR.Sound.build(new AC());
      FR.Sound.applyVolume();
    }
    if (FR.Sound.ctx.state === 'suspended') FR.Sound.ctx.resume();
    if (FR.Sound.wanted && FR.Sound.mood !== FR.Sound.wanted) FR.Sound.play(FR.Sound.wanted);
  },

  // 音の通り道をつくる（ctx：AudioContext。書き出しの確認では OfflineAudioContext を渡す）
  build(ctx) {
    FR.Sound.ctx = ctx;
    // 音が重なっても割れないように、最後に軽く抑える
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -12; comp.ratio.value = 6; comp.connect(ctx.destination);
    FR.Sound.master = ctx.createGain(); FR.Sound.master.gain.value = 2.6; FR.Sound.master.connect(comp);
    FR.Sound.bgmGain = ctx.createGain(); FR.Sound.bgmGain.connect(FR.Sound.master);
    FR.Sound.sfxGain = ctx.createGain(); FR.Sound.sfxGain.connect(FR.Sound.master);
    // すこし響かせる（短いこだま）。BGM と効果音で別にして、片方だけ消せるように
    FR.Sound.echoSfx = FR.Sound.makeEcho(ctx, FR.Sound.sfxGain);
    FR.Sound.echoBgm = FR.Sound.makeEcho(ctx, FR.Sound.bgmGain);
    FR.Sound.noiseBuf = FR.Sound.makeNoise(ctx);
  },

  save() { try { localStorage.setItem(FR.Sound.KEY, JSON.stringify(FR.Sound.settings)); } catch (e) { /* 保存できなくても遊べる */ } },
  applyVolume() {
    if (!FR.Sound.ctx) return;
    const t = FR.Sound.ctx.currentTime;
    FR.Sound.bgmGain.gain.setTargetAtTime(FR.Sound.settings.bgm ? FR.Sound.VOL.bgm : 0, t, 0.1);
    FR.Sound.sfxGain.gain.setTargetAtTime(FR.Sound.settings.sfx ? FR.Sound.VOL.sfx : 0, t, 0.02);
  },
  toggle(kind) {
    FR.Sound.settings[kind] = !FR.Sound.settings[kind];
    FR.Sound.save();
    FR.Sound.unlock();
    FR.Sound.applyVolume();
    return FR.Sound.settings[kind];
  },

  // ── 音のもと ─────────────────────────────────
  makeEcho(ctx, dest) {
    const input = ctx.createGain();
    const delay = ctx.createDelay(); delay.delayTime.value = 0.23;
    const fb = ctx.createGain(); fb.gain.value = 0.28;
    const wet = ctx.createGain(); wet.gain.value = 0.22;
    input.connect(delay); delay.connect(fb); fb.connect(delay); delay.connect(wet); wet.connect(dest);
    return input;
  },
  makeNoise(ctx) {
    const buf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  },
  // 1音：freq（Hz）・長さ（秒）・波形・大きさ・終わりの高さ・出力先・何秒後
  tone(o) {
    const ctx = FR.Sound.ctx, t = ctx.currentTime + (o.at || 0);
    const osc = ctx.createOscillator(), g = ctx.createGain();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(o.freq, t);
    if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t + o.dur);
    const v = o.vol || 0.3, atk = o.attack || 0.005;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + atk);
    g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
    osc.connect(g); g.connect(o.out || FR.Sound.sfxGain);
    if (o.echo) g.connect(o.out === FR.Sound.bgmGain ? FR.Sound.echoBgm : FR.Sound.echoSfx);
    osc.start(t); osc.stop(t + o.dur + 0.05);
  },
  // ざっという音：filter（lowpass/highpass/bandpass）と周波数
  noise(o) {
    const ctx = FR.Sound.ctx, t = ctx.currentTime + (o.at || 0);
    const src = ctx.createBufferSource(); src.buffer = FR.Sound.noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = o.filter || 'lowpass'; f.frequency.value = o.freq || 1000;
    if (o.to) f.frequency.exponentialRampToValueAtTime(o.to, t + o.dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(o.vol || 0.3, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
    src.connect(f); f.connect(g); g.connect(o.out || FR.Sound.sfxGain);
    src.start(t, Math.random() * 0.5); src.stop(t + o.dur + 0.05);
  },

  // ── 効果音 ─────────────────────────────────
  SFX: {
    click: S => S.tone({ freq: 880, to: 660, dur: 0.06, type: 'triangle', vol: 0.12 }),
    card: S => { S.noise({ filter: 'highpass', freq: 1800, to: 5000, dur: 0.16, vol: 0.18 }); S.tone({ freq: 520, to: 780, dur: 0.12, type: 'triangle', vol: 0.1 }); },
    // 敵に当たった（土を打つような低い音）
    hit: S => { S.noise({ filter: 'lowpass', freq: 1400, to: 200, dur: 0.18, vol: 0.5 }); S.tone({ freq: 150, to: 60, dur: 0.18, vol: 0.5 }); },
    // こちらが受けた
    hurt: S => { S.noise({ filter: 'lowpass', freq: 900, to: 120, dur: 0.28, vol: 0.55 }); S.tone({ freq: 110, to: 45, dur: 0.3, type: 'square', vol: 0.18 }); S.tone({ freq: 117, to: 48, dur: 0.3, type: 'sawtooth', vol: 0.08 }); },
    // 守った（木の板を打つ音）
    block: S => { S.tone({ freq: 340, to: 240, dur: 0.07, type: 'triangle', vol: 0.35 }); S.tone({ freq: 300, to: 210, dur: 0.08, type: 'triangle', vol: 0.3, at: 0.07 }); },
    blocked: S => S.tone({ freq: 260, to: 200, dur: 0.1, type: 'triangle', vol: 0.35 }),
    // 銭（小さな鈴）
    gold: S => { S.tone({ freq: 1568, dur: 0.25, vol: 0.13, echo: true }); S.tone({ freq: 2093, dur: 0.35, vol: 0.11, at: 0.07, echo: true }); },
    heal: S => [523, 659, 784, 1047].forEach((f, i) => S.tone({ freq: f, dur: 0.4, vol: 0.12, at: i * 0.07, attack: 0.02, echo: true })),
    energy: S => [784, 1175].forEach((f, i) => S.tone({ freq: f, dur: 0.3, type: 'triangle', vol: 0.12, at: i * 0.06, echo: true })),
    // 収穫（琴をはじくような音）
    harvest: S => [587, 698, 880].forEach((f, i) => S.tone({ freq: f, dur: 0.5, type: 'triangle', vol: 0.16, at: i * 0.06, echo: true })),
    ship: S => { [880, 1047, 1319, 1568].forEach((f, i) => S.tone({ freq: f, dur: 0.6, vol: 0.12, at: i * 0.08, echo: true })); S.tone({ freq: 2093, dur: 0.6, vol: 0.08, at: 0.36, echo: true }); },
    plant: S => { S.noise({ filter: 'lowpass', freq: 500, dur: 0.12, vol: 0.3 }); S.tone({ freq: 330, to: 440, dur: 0.12, type: 'triangle', vol: 0.12 }); },
    grow: S => S.tone({ freq: 660, to: 990, dur: 0.18, vol: 0.08 }),
    stolen: S => { S.tone({ freq: 700, to: 350, dur: 0.25, type: 'square', vol: 0.08 }); },
    buff: S => { S.tone({ freq: 90, to: 140, dur: 0.35, type: 'sawtooth', vol: 0.12 }); },
    // 敵のターン（太鼓）・あなたのターン（鈴）
    enemyTurn: S => { S.tone({ freq: 95, to: 50, dur: 0.45, vol: 0.6 }); S.noise({ filter: 'lowpass', freq: 300, dur: 0.2, vol: 0.3 }); S.tone({ freq: 95, to: 50, dur: 0.45, vol: 0.45, at: 0.22 }); },
    myTurn: S => { S.tone({ freq: 1319, dur: 0.5, vol: 0.1, echo: true }); S.tone({ freq: 1760, dur: 0.6, vol: 0.08, at: 0.1, echo: true }); },
    win: S => [587, 659, 784, 880, 1175].forEach((f, i) => S.tone({ freq: f, dur: i === 4 ? 0.9 : 0.25, type: 'triangle', vol: 0.18, at: i * 0.12, echo: true })),
    lose: S => [440, 415, 349, 294].forEach((f, i) => S.tone({ freq: f, dur: 0.6, type: 'triangle', vol: 0.16, at: i * 0.22, echo: true })),
    warn: S => S.tone({ freq: 220, dur: 0.15, type: 'square', vol: 0.06 })
  },

  sfx(name, delayMs) {
    if (!FR.Sound.ctx || !FR.Sound.settings.sfx) return;
    const f = FR.Sound.SFX[name];
    if (!f) return;
    if (delayMs) setTimeout(() => f(FR.Sound), delayMs); else f(FR.Sound);
  },

  // ── BGM ───────────────────────────────────
  // scale：使う音（MIDI番号）。tempo：1分の拍。melody/bass はくり返すフレーズ（null は休み）
  // 旋律は seed 付きの乱数で一度だけ作るので、毎回同じ曲になる
  MOODS: {
    village: { tempo: 76, scale: [62, 64, 67, 69, 71, 74, 76, 79], root: 50, seed: 11, drum: false, lead: 'triangle', density: 0.55 },
    battle:  { tempo: 108, scale: [62, 63, 67, 69, 70, 74, 75, 79], root: 50, seed: 23, drum: true, lead: 'triangle', density: 0.7 },
    boss:    { tempo: 118, scale: [57, 58, 62, 64, 65, 69, 70, 74], root: 45, seed: 37, drum: true, heavy: true, lead: 'sawtooth', density: 0.75 },
    result:  { tempo: 66, scale: [62, 64, 67, 69, 71, 74, 76], root: 50, seed: 5, drum: false, lead: 'sine', density: 0.4 }
  },

  midi(n) { return 440 * Math.pow(2, (n - 69) / 12); },

  // 4小節×2 の旋律をつくる（音階の上を少しずつ動く）
  compose(m) {
    const rnd = FR.Util.rng(m.seed);
    const steps = 32, mel = [];
    let idx = 3;
    for (let i = 0; i < steps; i++) {
      const strong = i % 4 === 0;
      if (!strong && rnd() > m.density) { mel.push(null); continue; }
      idx += Math.round((rnd() - 0.5) * 3);
      idx = Math.max(0, Math.min(m.scale.length - 1, idx));
      if (i % 16 === 15) idx = 0;   // 区切りは主音へ
      mel.push(m.scale[idx]);
    }
    // 後半の4小節は、前半を少し変えたもの
    const half = mel.slice(0, 16);
    const second = half.map((n, i) => (n && i % 8 === 6 ? m.scale[Math.min(m.scale.length - 1, m.scale.indexOf(n) + 1)] : n));
    second[15] = m.scale[0];
    return half.concat(second);
  },

  play(name) {
    FR.Sound.wanted = name;
    if (!FR.Sound.ctx || FR.Sound.mood === name) return;
    FR.Sound.mood = name;
    clearInterval(FR.Sound._timer);
    if (!name) return;
    const m = FR.Sound.MOODS[name];
    const mel = FR.Sound.compose(m);
    const spb = 60 / m.tempo / 2;   // 8分音符の長さ（秒）
    const ctx = FR.Sound.ctx;
    // 曲の切り替えは、少し間をあけてそっと入る
    let next = ctx.currentTime + 0.3, i = 0;
    const out = FR.Sound.bgmGain;
    const S = FR.Sound;
    FR.Sound._timer = setInterval(() => {
      if (FR.Sound.mood !== name) return;
      while (next < ctx.currentTime + 0.4) {
        const at = next - ctx.currentTime;
        if (!S.settings.bgm) { next += spb; i++; continue; }
        S.beat(m, mel, i, at, spb, out);
        next += spb; i++;
      }
    }, 100);
  },

  // 曲の i 番目の8分音符を鳴らす（at 秒後）
  beat(m, mel, i, at, spb, out) {
    const S = FR.Sound;
    const n = mel[i % mel.length];
    if (n) S.tone({ freq: S.midi(n), dur: spb * 1.8, type: m.lead, vol: m.lead === 'sawtooth' ? 0.05 : 0.12, attack: 0.03, at, out, echo: true });
    // 低音：1小節（8分×8）の頭と5拍目
    if (i % 8 === 0) S.tone({ freq: S.midi(m.root), dur: spb * 6, type: 'triangle', vol: 0.16, attack: 0.05, at, out });
    if (i % 8 === 4) S.tone({ freq: S.midi(m.root + (i % 32 >= 16 ? 5 : 7)), dur: spb * 3.5, type: 'triangle', vol: 0.12, attack: 0.05, at, out });
    // 太鼓
    if (m.drum) {
      if (i % 4 === 0) S.tone({ freq: m.heavy ? 70 : 90, to: 45, dur: 0.35, vol: m.heavy ? 0.42 : 0.32, at, out });
      if (i % 8 === 6 || (m.heavy && i % 8 === 3)) S.tone({ freq: 80, to: 50, dur: 0.25, vol: 0.2, at, out });
      if (i % 2 === 1) S.noise({ filter: 'highpass', freq: 6000, dur: 0.05, vol: 0.05, at, out });
    } else if (i % 16 === 8) {
      // 静かな曲は、ときどき鈴の音
      S.tone({ freq: S.midi(m.scale[m.scale.length - 1] + 12), dur: 1.2, vol: 0.035, at, out, echo: true });
    }
  },

  // 画面に合わせて曲を選ぶ
  screen(name) {
    const run = typeof App !== 'undefined' && App.data && App.data.run;
    const mood = name === 'battle' ? (run && run.node && run.node.type === 'boss' ? 'boss' : 'battle')
      : name === 'result' ? 'result' : 'village';
    FR.Sound.play(mood);
  }
};
