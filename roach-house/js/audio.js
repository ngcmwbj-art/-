// 効果音（ファイルを使わず WebAudio で合成）
export class Sfx {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.volume = 1;
    this.crunchT = [];
    this.amb = null;
  }
  unlock() {
    try {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = this.muted ? 0 : 0.6 * this.volume;
        this.master.connect(this.ctx.destination);
        const len = this.ctx.sampleRate;
        this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
        const d = this.noiseBuf.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      }
      if (this.ctx.state === 'suspended') this.ctx.resume();
    } catch (e) { this.ctx = null; }
  }
  // 一時停止・アプリを裏にしたとき：音をまるごと止める（電池にやさしく）。unlock() で再開
  pause() { try { if (this.ctx && this.ctx.state === 'running') this.ctx.suspend(); } catch (_) { /* 無視 */ } }
  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : 0.6 * this.volume;
  }
  // 全体の音量（0〜1）
  setVolume(v) {
    this.volume = Math.max(0, Math.min(1, v));
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.6 * this.volume;
  }
  get ok() { return !!this.ctx && this.ctx.state === 'running'; }

  noise(dur, type, freq, vol, q = 1, attack = 0.005, when = 0) {
    if (!this.ok) return;
    const c = this.ctx, t = c.currentTime + when;
    const src = c.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    const f = c.createBiquadFilter();
    f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(vol, 0.0002), t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.05);
    return f;
  }
  tone(freq, dur, type = 'sine', vol = 0.2, slide = 0, when = 0) {
    if (!this.ok) return;
    const c = this.ctx, t = c.currentTime + when;
    const o = c.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + dur + 0.05);
  }

  crunch(v = 0.3) {
    if (!this.ok) return;
    const now = this.ctx.currentTime;
    this.crunchT = this.crunchT.filter((t) => t > now);
    if (this.crunchT.length >= 4) return;
    this.crunchT.push(now + 0.12);
    this.noise(0.07 + Math.random() * 0.05, 'bandpass', 1800 + Math.random() * 1600, v, 1.4); }
  crunchLoud() {
    for (let i = 0; i < 4; i++) this.noise(0.12, 'bandpass', 1200 + i * 500, 0.6, 1.2, 0.003, i * 0.05);
  }
  step(v) { if (v > 0.01) { this.tone(70, 0.18, 'sine', Math.min(0.55, v), -30); this.noise(0.08, 'lowpass', 300, v * 0.4); } }
  hissStart() { this.noise(0.5, 'highpass', 5000, 0.08, 0.7, 0.3); }
  hiss() { this.noise(1.2, 'highpass', 3500, 0.35, 0.7, 0.02); }
  thump() { this.tone(55, 0.35, 'sine', 0.8, -25); this.noise(0.2, 'lowpass', 500, 0.6); }
  alert() { this.tone(660, 0.12, 'square', 0.12); this.tone(990, 0.2, 'square', 0.12, 0, 0.12); }
  huh() { this.tone(400, 0.25, 'triangle', 0.15, 160); }
  // 後ずさりの「ん…？」（下がり調子）
  huhDown() { this.tone(420, 0.35, 'triangle', 0.15, -180); }
  // 第18回：生まれた仲間のひと声「チッ」（前の「ピピピ」の置きかえ。音は増やさない）
  hatch() { this.tone(2300, 0.05, 'square', 0.07, -600); this.noise(0.03, 'highpass', 4000, 0.12, 1); }
  // 第18回：自分が着地したときの「ポテッ」（低く短く）
  plop() { this.tone(170, 0.09, 'sine', 0.35, -90); this.noise(0.06, 'lowpass', 900, 0.2, 1); }
  stuck() { this.noise(0.4, 'lowpass', 700, 0.4, 3); this.tone(180, 0.3, 'sawtooth', 0.08, -80); }
  hurt() { this.tone(300, 0.15, 'sawtooth', 0.15, -180); }
  die() { this.tone(500, 0.6, 'triangle', 0.2, -420); }
  whoosh() { this.noise(0.35, 'bandpass', 1200, 0.3, 0.8, 0.08); }
  scream() { this.tone(700, 0.5, 'sawtooth', 0.12, 500); this.tone(1100, 0.6, 'square', 0.06, -500, 0.25); }
  ruin() { this.tone(330, 0.12, 'triangle', 0.2); this.tone(440, 0.12, 'triangle', 0.2, 0, 0.1); this.tone(660, 0.25, 'triangle', 0.22, 0, 0.2); }
  ship() { this.tone(520, 0.1, 'sine', 0.12); this.tone(390, 0.25, 'sine', 0.12, 0, 0.1); }
  lay() { this.tone(240, 0.15, 'sine', 0.2, 120); }
  click() { this.tone(800, 0.04, 'square', 0.06); }
  win() { [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.3, 'triangle', 0.2, 0, i * 0.13)); }
  lose() { [392, 330, 262, 196].forEach((f, i) => this.tone(f, 0.35, 'triangle', 0.18, 0, i * 0.18)); }

  // 左右に振れる出口（方向が分かる音）
  panOut(pan, vol) {
    const c = this.ctx;
    const g = c.createGain(); g.gain.value = vol;
    let node = g;
    if (c.createStereoPanner) {
      const p = c.createStereoPanner();
      p.pan.value = Math.max(-1, Math.min(1, pan));
      g.connect(p); p.connect(this.master);
    } else g.connect(this.master);
    return node;
  }
  // 長靴の足音：ドスッ＋ゴムのキュッ。pan で左右
  // 長靴の足音。hard=true はコンクリの「コツ」、false は土の「ザッ」
  boot(v, pan = 0, hard = true) {
    if (!this.ok || v < 0.01) return;
    const c = this.ctx, t = c.currentTime;
    const out = this.panOut(pan, Math.min(0.9, v));
    if (!hard) {
      // 土：低いドスッ＋こすれる「ザッ」
      const o = c.createOscillator(); o.type = 'sine';
      o.frequency.setValueAtTime(62, t); o.frequency.exponentialRampToValueAtTime(38, t + 0.16);
      const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.6, t + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
      o.connect(g); g.connect(out); o.start(t); o.stop(t + 0.22);
      const n = c.createBufferSource(); n.buffer = this.noiseBuf;
      const nf = c.createBiquadFilter(); nf.type = 'bandpass'; nf.frequency.value = 700 + Math.random() * 200; nf.Q.value = 0.9;
      const ng = c.createGain(); ng.gain.setValueAtTime(0.0001, t); ng.gain.exponentialRampToValueAtTime(0.5, t + 0.03); ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
      n.connect(nf); nf.connect(ng); ng.connect(out); n.start(t, Math.random() * 0.5); n.stop(t + 0.18);
      return;
    }
    const o = c.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(75, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.18);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.7, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
    o.connect(g); g.connect(out); o.start(t); o.stop(t + 0.25);
    const q = c.createOscillator(); q.type = 'triangle';
    const f0 = 900 + Math.random() * 500;
    q.frequency.setValueAtTime(f0, t + 0.05); q.frequency.exponentialRampToValueAtTime(f0 * 1.5, t + 0.12);
    const qg = c.createGain(); qg.gain.setValueAtTime(0.0001, t + 0.05); qg.gain.exponentialRampToValueAtTime(0.12, t + 0.07); qg.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
    q.connect(qg); qg.connect(out); q.start(t + 0.05); q.stop(t + 0.16);
    // 小さなスピーカーでも聞こえる高めの「コツッ」
    const n = c.createBufferSource(); n.buffer = this.noiseBuf;
    const nf = c.createBiquadFilter(); nf.type = 'bandpass'; nf.frequency.value = 1500 + Math.random() * 300; nf.Q.value = 2.5;
    const ng = c.createGain(); ng.gain.setValueAtTime(0.0001, t); ng.gain.exponentialRampToValueAtTime(0.45, t + 0.004); ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
    n.connect(nf); nf.connect(ng); ng.connect(out); n.start(t, Math.random() * 0.5); n.stop(t + 0.09);
  }
  // ネコの首の鈴（高い音なのでスマホでも聞こえる）
  bell(v, pan = 0) {
    if (!this.ok || v < 0.02) return;
    const c = this.ctx, t = c.currentTime;
    const out = this.panOut(pan, Math.min(0.6, v));
    for (const f of [2637, 3520, 4186]) {
      const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = f * (0.98 + Math.random() * 0.04);
      const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.18, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
      o.connect(g); g.connect(out); o.start(t); o.stop(t + 0.4);
    }
  }
  meow() { this.tone(700, 0.35, 'sawtooth', 0.05, 300); this.tone(1000, 0.3, 'triangle', 0.06, -400, 0.15); }
  hiss2() { this.noise(0.4, 'highpass', 3000, 0.25, 0.8, 0.02); }
  chime() { [784, 988, 1175].forEach((f, i) => this.tone(f, 0.4, 'sine', 0.12, 0, i * 0.18)); }
  // 農場主のスマホの着信音
  phone() { for (let i = 0; i < 3; i++) { this.tone(1320, 0.08, 'square', 0.05, 0, i * 0.5); this.tone(1100, 0.08, 'square', 0.05, 0, i * 0.5 + 0.1); } }
  // ラジオのお知らせ：ポーン↑と、短いしゃべり風の音
  radioNews() { this.tone(660, 0.25, 'sine', 0.1); this.tone(990, 0.35, 'sine', 0.1, 0, 0.16); for (let i = 0; i < 5; i++) this.tone(260 + (i % 3) * 40, 0.07, 'square', 0.025, 0, 0.45 + i * 0.09); }
  // 第14回：ナイスが続くと、音がだんだん高くなる（step＝何回目か）
  nice(step = 1) {
    const k = Math.pow(2, (Math.min(8, Math.max(1, step)) - 1) * 2 / 12);
    this.tone(880 * k, 0.08, 'triangle', 0.18); this.tone(1320 * k, 0.14, 'triangle', 0.18, 0, 0.07);
  }
  // 第14回：大事な音（サイレン・近くの鈴）のときは、環境音・ラジオを少し小さく
  bgBus() {
    if (!this.bg && this.ctx) { this.bg = this.ctx.createGain(); this.bg.gain.value = 1; this.bg.connect(this.master); }
    return this.bg || this.master;
  }
  duck(sec = 1.2) {
    if (!this.ok) return;
    const g = this.bgBus().gain, t = this.ctx.currentTime;
    g.cancelScheduledValues(t); g.setTargetAtTime(0.3, t, 0.05); g.setTargetAtTime(1, t + sec, 0.3);
  }
  thud() { this.tone(90, 0.3, 'sine', 0.7, -40); this.noise(0.15, 'lowpass', 400, 0.5); }
  poison() { this.tone(300, 0.5, 'sawtooth', 0.08, -150); this.tone(310, 0.5, 'sawtooth', 0.06, -160, 0.05); }
  wind() { this.noise(1.6, 'bandpass', 700, 0.3, 0.6, 0.2); }
  fogger() { this.noise(3, 'highpass', 2500, 0.25, 0.5, 0.4); }
  siren() { this.duck(2.2); for (let i = 0; i < 4; i++) { this.tone(660, 0.25, 'square', 0.07, 0, i * 0.5); this.tone(520, 0.25, 'square', 0.07, 0, i * 0.5 + 0.25); } }

  // 農場主の腰のラジオ：民謡風のメロディと、ときどきのしゃべり。音の大きさと左右で居場所が分かる
  // 軽トラのエンジン音（にげろ！田んぼ道）：近いほど大きく低くうなる
  startEngine() {
    if (!this.ok || this.engine) return;
    const c = this.ctx;
    const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 52;
    const o2 = c.createOscillator(); o2.type = 'square'; o2.frequency.value = 26;
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420;
    const g = c.createGain(); g.gain.value = 0;
    o.connect(lp); o2.connect(lp); lp.connect(g); g.connect(this.master);
    o.start(); o2.start();
    this.engine = { o, o2, g };
  }
  updateEngine(k) {
    const E = this.engine;
    if (!E) return;
    const t = this.ctx.currentTime;
    E.g.gain.setTargetAtTime(0.05 + k * 0.22, t, 0.1);
    E.o.frequency.setTargetAtTime(48 + k * 30, t, 0.2);
  }
  stopEngine() {
    const E = this.engine;
    if (!E) return;
    try { E.g.gain.setTargetAtTime(0, this.ctx.currentTime, 0.1); E.o.stop(this.ctx.currentTime + 0.5); E.o2.stop(this.ctx.currentTime + 0.5); } catch (_) { /* 無視 */ }
    this.engine = null;
  }

  startRadio() {
    if (this.radio) this.radio.off = false;
    if (!this.ok || this.radio) return;
    const c = this.ctx;
    const bus = c.createGain(); bus.gain.value = 0;
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1400; bp.Q.value = 0.9;
    let pan = null;
    if (c.createStereoPanner) { pan = c.createStereoPanner(); bp.connect(pan); pan.connect(bus); } else bp.connect(bus);
    bus.connect(this.bgBus());
    // 小さなスピーカーのザーッという音
    const hiss = c.createBufferSource(); hiss.buffer = this.noiseBuf; hiss.loop = true;
    const hg = c.createGain(); hg.gain.value = 0.015;
    hiss.connect(hg); hg.connect(bp); hiss.start();
    this.radio = { bus, bp, pan, next: c.currentTime + 0.2, step: 0, talk: 0 };
  }
  stopRadio() {
    if (!this.radio) return;
    try { this.radio.bus.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05); } catch (_) { /* 無視 */ }
  }
  // ラジオがかじられて止まった：「ブツッ」
  radioOff() {
    if (this.radio) this.radio.off = true;
    this.noise(0.12, 'bandpass', 1800, 0.25, 2);
    this.tone(120, 0.08, 'square', 0.08);
  }
  // 直した：番組が変わる（次の曲＋アナウンス）
  radioNext() {
    const R = this.radio;
    this.tone(1200, 0.06, 'sine', 0.05);
    if (!R) return;
    R.off = false;
    R.step = (Math.floor(R.step / 32) + 1) * 32;
    R.talk = 6;
  }
  // 暖房機：前ぶれの「カチッ」→ 10秒ほど低い「ゴーッ」
  heaterClick() { this.tone(2400, 0.03, 'square', 0.08); this.noise(0.05, 'highpass', 3000, 0.2, 1); }
  heaterStart() {
    if (!this.ok || this.heater) return;
    const c = this.ctx, t = c.currentTime;
    const n = c.createBufferSource(); n.buffer = this.noiseBuf; n.loop = true;
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 260; f.Q.value = 0.7;
    const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 50;
    const of = c.createBiquadFilter(); of.type = 'lowpass'; of.frequency.value = 140;
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.32, t + 0.6);
    const og = c.createGain(); og.gain.value = 0.25;
    n.connect(f); f.connect(g); o.connect(of); of.connect(og); og.connect(g); g.connect(this.master);
    n.start(t); o.start(t);
    this.heater = { n, o, g };
  }
  heaterStop() {
    const H = this.heater;
    if (!H) return;
    const t = this.ctx.currentTime;
    try { H.g.gain.setTargetAtTime(0.0001, t, 0.3); H.n.stop(t + 1.5); H.o.stop(t + 1.5); } catch (_) { /* 無視 */ }
    this.heater = null;
  }
  // 農場主の鼻歌（口笛のような高い音。ラジオの曲より高く、聞き分けやすく）
  hum(vol, pan) {
    if (!this.ok || vol < 0.02) return;
    const c = this.ctx, t = c.currentTime;
    const out = this.panOut(pan, Math.min(0.5, vol));
    const SC = [0, 2, 4, 7, 9, 12];
    this.humStep = (this.humStep || 0) + 1;
    const MEL = [2, 3, 4, 4, 3, 2, 1, 2, 0, -1, 2, 4, 5, 4, 2, -1];
    const deg = MEL[this.humStep % MEL.length];
    if (deg < 0) return;
    const o = c.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(1046 * Math.pow(2, SC[deg] / 12), t);
    const vib = c.createOscillator(); vib.frequency.value = 6; const vg = c.createGain(); vg.gain.value = 9;
    vib.connect(vg); vg.connect(o.frequency);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.16, t + 0.05); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.34);
    o.connect(g); g.connect(out); o.start(t); vib.start(t); o.stop(t + 0.36); vib.stop(t + 0.36);
  }
  // 怒っているときの「ぶつぶつ」（低くこもった声）
  grumble(vol, pan) {
    if (!this.ok || vol < 0.02) return;
    const c = this.ctx, t = c.currentTime;
    const out = this.panOut(pan, Math.min(0.5, vol));
    const n = c.createBufferSource(); n.buffer = this.noiseBuf;
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 260 + Math.random() * 160; f.Q.value = 4;
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.7, t + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
    n.connect(f); f.connect(g); g.connect(out); n.start(t, Math.random()); n.stop(t + 0.25);
  }
  // 毎フレーム：vol 0..1、pan -1..1
  updateRadio(vol, pan) {
    if (!this.radio || !this.ok) return;
    const c = this.ctx, R = this.radio, t = c.currentTime;
    if (R.off) vol = 0;
    R.bus.gain.setTargetAtTime(vol * vol * 0.55, t, 0.08);
    // 画面を裏に回して戻ったとき、たまった分をまとめて鳴らさない
    if (R.next < t - 0.5) R.next = t + 0.05;
    if (R.pan) R.pan.pan.setTargetAtTime(Math.max(-1, Math.min(1, pan)), t, 0.08);
    // 先の0.3秒ぶんの音を予約する
    const SCALE = [0, 2, 4, 7, 9, 12, 14]; // 民謡っぽい五音
    const TUNES = [
      [4, 4, 3, 2, 3, 4, 5, 4, 3, 2, 1, 2, 3, 3, -1, -1, 2, 3, 4, 3, 2, 1, 0, 1, 2, 2, 1, 0, 0, 0, -1, -1],
      [2, 3, 4, 4, 5, 4, 3, -1, 4, 3, 2, 1, 2, -1, 2, 2, 3, 2, 1, 0, 1, 2, 3, -1, 2, 1, 0, 0, -1, 0, -1, -1],
      [5, 5, 6, 5, 4, 3, 4, -1, 3, 4, 5, 4, 3, 2, 3, -1, 3, 3, 2, 1, 2, 3, 2, 1, 0, 1, 2, -1, 1, 0, -1, -1],
      [0, 1, 2, 4, 3, 2, 1, -1, 2, 3, 4, 5, 4, 3, 2, -1, 4, 4, 3, 2, 1, 2, 3, 2, 1, 0, 1, 0, 0, -1, -1, -1],
    ];
    const TUNE = TUNES[Math.floor(R.step / 32) % TUNES.length];
    while (R.next < t + 0.3) {
      const beat = 0.26;
      if (R.talk > 0) {
        // しゃべり：こもった声のような音のかたまり
        const n = c.createBufferSource(); n.buffer = this.noiseBuf;
        const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 500 + Math.random() * 700; f.Q.value = 3;
        const g = c.createGain();
        g.gain.setValueAtTime(0.0001, R.next); g.gain.exponentialRampToValueAtTime(0.5, R.next + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, R.next + beat * 0.8);
        n.connect(f); f.connect(g); g.connect(R.bp);
        n.start(R.next, Math.random()); n.stop(R.next + beat);
        R.talk--;
      } else {
        const deg = TUNE[R.step % TUNE.length];
        if (deg >= 0) {
          const o = c.createOscillator(); o.type = 'triangle';
          o.frequency.value = 392 * Math.pow(2, SCALE[deg] / 12);
          const g = c.createGain();
          g.gain.setValueAtTime(0.0001, R.next); g.gain.exponentialRampToValueAtTime(0.35, R.next + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, R.next + beat * 0.95);
          o.connect(g); g.connect(R.bp); o.start(R.next); o.stop(R.next + beat);
          if (R.step % 4 === 0) { // 太鼓
            const k = c.createOscillator(); k.type = 'sine'; k.frequency.setValueAtTime(120, R.next); k.frequency.exponentialRampToValueAtTime(60, R.next + 0.12);
            const kg = c.createGain(); kg.gain.setValueAtTime(0.4, R.next); kg.gain.exponentialRampToValueAtTime(0.0001, R.next + 0.15);
            k.connect(kg); kg.connect(R.bp); k.start(R.next); k.stop(R.next + 0.16);
          }
        }
        R.step++;
        if (R.step % 128 === 0) R.talk = 14 + Math.floor(Math.random() * 10);
      }
      R.next += beat;
    }
  }

  // 温室の換気扇のうなり（ずっと鳴る）
  startAmbience() {
    if (!this.ok || this.amb) return;
    const c = this.ctx;
    const src = c.createBufferSource();
    src.buffer = this.noiseBuf; src.loop = true;
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 260;
    const g = c.createGain(); g.gain.value = 0.05;
    src.connect(f); f.connect(g); g.connect(this.bgBus());
    src.start();
    // 緊張の鼓動
    const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = 52;
    const og = c.createGain(); og.gain.value = 0;
    o.connect(og); og.connect(this.master); o.start();
    this.amb = { src, g, o, og };
  }
  setTension(k) {
    if (!this.amb || !this.ok) return;
    const t = this.ctx.currentTime;
    const beat = (t * (1.2 + k * 1.6)) % 1;
    const v = k > 0.05 ? Math.max(0, 1 - beat * 5) * 0.22 * k : 0;
    this.amb.og.gain.setTargetAtTime(v, t, 0.02);
  }
}
