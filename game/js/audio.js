// WebAudio によるリアルタイム合成：ドラム・ベース・歪みギター・環境音
export const BPM = 120;
export const BEAT = 60 / BPM;
// E5 - C5 - D5 - A5 のロック進行（MIDI ルート音）
const PROG = [40, 36, 38, 45];
const PENTA = [0, 3, 5, 7, 10, 12, 15, 17, 19, 22, 24];
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

export class GameAudio {
  constructor() {
    this.ctx = null;
    this.ready = false;
    this.intensity = 0;
    this.nextBeat = 0;
    this.beatIndex = 0;
    this.start = 0;
    this.musicOn = true;
  }

  init() {
    if (this.ctx) { this.ctx.resume(); return; }
    const ctx = this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.master = ctx.createGain(); this.master.gain.value = 0.8;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 4;
    this.master.connect(comp).connect(ctx.destination);
    this.music = ctx.createGain(); this.music.gain.value = 0.45; this.music.connect(this.master);
    this.sfx = ctx.createGain(); this.sfx.gain.value = 0.9; this.sfx.connect(this.master);

    // ノイズバッファ
    const len = ctx.sampleRate * 2;
    this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;

    // 風
    const wind = ctx.createBufferSource(); wind.buffer = this.noise; wind.loop = true;
    this.windF = ctx.createBiquadFilter(); this.windF.type = 'bandpass'; this.windF.frequency.value = 400; this.windF.Q.value = 0.8;
    this.windG = ctx.createGain(); this.windG.gain.value = 0.02;
    wind.connect(this.windF).connect(this.windG).connect(this.master); wind.start();
    // 雨
    const rain = ctx.createBufferSource(); rain.buffer = this.noise; rain.loop = true; rain.playbackRate.value = 0.7;
    const rf = ctx.createBiquadFilter(); rf.type = 'highpass'; rf.frequency.value = 1800;
    this.rainG = ctx.createGain(); this.rainG.gain.value = 0;
    rain.connect(rf).connect(this.rainG).connect(this.master); rain.start();

    // ギター用ディストーション
    this.dist = ctx.createWaveShaper();
    const curve = new Float32Array(2048);
    for (let i = 0; i < 2048; i++) { const x = i / 1024 - 1; curve[i] = Math.tanh(x * 9) * 0.9; }
    this.dist.curve = curve; this.dist.oversample = '4x';
    const cab = ctx.createBiquadFilter(); cab.type = 'lowpass'; cab.frequency.value = 3600; cab.Q.value = 0.9;
    const mid = ctx.createBiquadFilter(); mid.type = 'peaking'; mid.frequency.value = 900; mid.gain.value = 4;
    this.gtrOut = ctx.createGain(); this.gtrOut.gain.value = 0.32;
    // ディレイ
    const delay = ctx.createDelay(1); delay.delayTime.value = BEAT * 0.75;
    const fb = ctx.createGain(); fb.gain.value = 0.25;
    this.dist.connect(mid).connect(cab).connect(this.gtrOut).connect(this.sfx);
    this.gtrOut.connect(delay); delay.connect(fb).connect(delay); delay.connect(this.sfx);

    this.start = ctx.currentTime + 0.1;
    this.nextBeat = this.start;
    this.beatIndex = 0;
    this.ready = true;
  }

  now() { return this.ctx ? this.ctx.currentTime : performance.now() / 1000; }

  // 現在の拍位置。offset は最寄りの拍からのずれ（秒）
  beatInfo() {
    const t = this.now() - this.start;
    const pos = t / BEAT;
    const idx = Math.floor(pos);
    const frac = pos - idx;
    const offset = Math.min(frac, 1 - frac) * BEAT;
    return { idx, frac, offset, bar: Math.floor(idx / 4) };
  }

  setWeather(storm, wind) {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    this.windG.gain.setTargetAtTime(0.02 + storm * 0.22, t, 0.5);
    this.windF.frequency.setTargetAtTime(300 + wind * 12 + Math.sin(t * 0.7) * 120 * storm, t, 0.3);
    this.rainG.gain.setTargetAtTime(Math.max(0, storm - 0.15) * 0.16, t, 0.6);
    this.intensity = storm;
  }

  // 先読みスケジューラ（毎フレーム呼ぶ）
  schedule() {
    if (!this.ready || !this.musicOn) return;
    const ctx = this.ctx;
    while (this.nextBeat < ctx.currentTime + 0.15) {
      const t = this.nextBeat, b = this.beatIndex, inBar = b % 4;
      const root = PROG[Math.floor(b / 4) % 4];
      const busy = this.intensity > 0.25;
      if (inBar === 0 || inBar === 2 || (busy && inBar === 3)) this.kick(t);
      if (inBar === 1 || inBar === 3) this.snare(t, busy ? 0.5 : 0.18);
      this.hat(t, 0.06); this.hat(t + BEAT / 2, busy ? 0.08 : 0.04);
      this.bass(t, mtof(root - 12 + 12), BEAT * 0.9, busy ? 0.32 : 0.2);
      if (busy) this.bass(t + BEAT / 2, mtof(root - 12 + 12), BEAT * 0.4, 0.22);
      this.nextBeat += BEAT;
      this.beatIndex++;
    }
  }

  kick(t) {
    const c = this.ctx, o = c.createOscillator(), g = c.createGain();
    o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
    g.gain.setValueAtTime(0.9, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    o.connect(g).connect(this.music); o.start(t); o.stop(t + 0.32);
  }
  snare(t, v) {
    const c = this.ctx, n = c.createBufferSource(); n.buffer = this.noise;
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1900; f.Q.value = 0.7;
    const g = c.createGain(); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    n.connect(f).connect(g).connect(this.music); n.start(t, Math.random()); n.stop(t + 0.2);
  }
  hat(t, v) {
    const c = this.ctx, n = c.createBufferSource(); n.buffer = this.noise;
    const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 7500;
    const g = c.createGain(); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    n.connect(f).connect(g).connect(this.music); n.start(t, Math.random()); n.stop(t + 0.06);
  }
  bass(t, freq, dur, v) {
    const c = this.ctx, o = c.createOscillator(), f = c.createBiquadFilter(), g = c.createGain();
    o.type = 'sawtooth'; o.frequency.value = freq;
    f.type = 'lowpass'; f.frequency.setValueAtTime(900, t); f.frequency.exponentialRampToValueAtTime(220, t + dur);
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(f).connect(g).connect(this.music); o.start(t); o.stop(t + dur + 0.02);
  }

  // パワーコード（ルート・5度・オクターブ）
  chord(just) {
    if (!this.ready) return;
    const c = this.ctx, t = c.currentTime;
    const root = PROG[this.beatInfo().bar % 4] + 12;
    const g = c.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(just ? 1 : 0.7, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.25, t + 0.25);
    g.gain.exponentialRampToValueAtTime(0.001, t + 1.1);
    g.connect(this.dist);
    for (const iv of [0, 7, 12]) for (const det of [-6, 5]) {
      const o = c.createOscillator(); o.type = 'sawtooth';
      o.frequency.value = mtof(root + iv); o.detune.value = det;
      o.connect(g); o.start(t); o.stop(t + 1.15);
    }
    if (just) this.chime(t, mtof(root + 36), 0.08);
  }

  soloNote(i) {
    if (!this.ready) return;
    const c = this.ctx, t = c.currentTime;
    const root = PROG[this.beatInfo().bar % 4] + 24;
    const m = root + PENTA[i % PENTA.length];
    const o = c.createOscillator(), g = c.createGain();
    o.type = 'sawtooth'; o.frequency.setValueAtTime(mtof(m) * 0.98, t); o.frequency.linearRampToValueAtTime(mtof(m), t + 0.04);
    const vib = c.createOscillator(), vg = c.createGain(); vib.frequency.value = 6; vg.gain.value = 6;
    vib.connect(vg).connect(o.detune); vib.start(t); vib.stop(t + 0.3);
    g.gain.setValueAtTime(0.5, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
    o.connect(g).connect(this.dist); o.start(t); o.stop(t + 0.3);
  }

  chime(t, f, v) {
    const c = this.ctx, o = c.createOscillator(), g = c.createGain();
    o.type = 'sine'; o.frequency.value = f;
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
    o.connect(g).connect(this.sfx); o.start(t); o.stop(t + 0.62);
  }

  sweep(f0, f1, dur, type = 'sine', v = 0.25) {
    if (!this.ready) return;
    const c = this.ctx, t = c.currentTime, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(this.sfx); o.start(t); o.stop(t + dur + 0.02);
  }

  noiseHit(freq, dur, v, type = 'bandpass', q = 1, delay = 0) {
    if (!this.ready) return;
    const c = this.ctx, t = c.currentTime + delay, n = c.createBufferSource(); n.buffer = this.noise;
    const f = c.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
    const g = c.createGain(); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    n.connect(f).connect(g).connect(this.sfx); n.start(t, Math.random()); n.stop(t + dur + 0.05);
    return f;
  }

  observe() {
    this.sweep(300, 2400, 0.6, 'sine', 0.2);
    this.sweep(450, 3600, 0.6, 'triangle', 0.08);
  }
  collapse() {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    [72, 79, 84, 88].forEach((m, i) => this.chime(t + i * 0.05, mtof(m), 0.12));
  }
  teleport() { this.sweep(1800, 200, 0.35, 'sawtooth', 0.08); this.sweep(200, 1600, 0.35, 'sine', 0.15); }
  build() {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    [60, 67, 72].forEach((m, i) => this.chime(t + i * 0.07, mtof(m), 0.18));
  }
  warn() { this.sweep(880, 660, 0.25, 'square', 0.05); }
  clank(v = 0.6) { this.noiseHit(3200, 0.25, v * 0.5, 'bandpass', 8); }
  whoosh() { this.noiseHit(500, 0.6, 0.35, 'lowpass', 1); }
  dissipate() { this.noiseHit(900, 1.2, 0.4, 'lowpass', 0.7); this.sweep(600, 80, 1.0, 'sine', 0.2); }
  ampHit() { this.noiseHit(160, 0.25, 0.25, 'lowpass', 1); }
  lost() { this.sweep(500, 150, 0.2, 'triangle', 0.05); }
  thunder(delay, v = 1) {
    if (!this.ready) return;
    const f = this.noiseHit(1400, 2.8, v, 'lowpass', 0.5, delay);
    if (f) f.frequency.exponentialRampToValueAtTime(90, this.ctx.currentTime + delay + 2.5);
    this.sweep(90, 30, 1.5, 'sine', 0.5 * v);
  }
  qGain() { if (this.ready) this.chime(this.ctx.currentTime, mtof(96), 0.04); }
  fanfare() {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    [64, 67, 71, 76, 79, 83, 88].forEach((m, i) => this.chime(t + i * 0.09, mtof(m), 0.15));
  }
}
