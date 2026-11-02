// 効果音（ファイルを使わず WebAudio で合成）
export class Sfx {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.amb = null;
  }
  unlock() {
    try {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = this.muted ? 0 : 0.6;
        this.master.connect(this.ctx.destination);
        const len = this.ctx.sampleRate;
        this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
        const d = this.noiseBuf.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      }
      if (this.ctx.state === 'suspended') this.ctx.resume();
    } catch (e) { this.ctx = null; }
  }
  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : 0.6;
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

  crunch(v = 0.3) { this.noise(0.07 + Math.random() * 0.05, 'bandpass', 1800 + Math.random() * 1600, v, 1.4); }
  crunchLoud() {
    for (let i = 0; i < 4; i++) this.noise(0.12, 'bandpass', 1200 + i * 500, 0.6, 1.2, 0.003, i * 0.05);
  }
  step(v) { if (v > 0.01) { this.tone(70, 0.18, 'sine', Math.min(0.55, v), -30); this.noise(0.08, 'lowpass', 300, v * 0.4); } }
  hissStart() { this.noise(0.5, 'highpass', 5000, 0.08, 0.7, 0.3); }
  hiss() { this.noise(1.2, 'highpass', 3500, 0.35, 0.7, 0.02); }
  thump() { this.tone(55, 0.35, 'sine', 0.8, -25); this.noise(0.2, 'lowpass', 500, 0.6); }
  alert() { this.tone(660, 0.12, 'square', 0.12); this.tone(990, 0.2, 'square', 0.12, 0, 0.12); }
  huh() { this.tone(400, 0.25, 'triangle', 0.15, 160); }
  hatch() { for (let i = 0; i < 3; i++) this.tone(900 + i * 300, 0.08, 'triangle', 0.15, 300, i * 0.09); }
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

  // 温室の換気扇のうなり（ずっと鳴る）
  startAmbience() {
    if (!this.ok || this.amb) return;
    const c = this.ctx;
    const src = c.createBufferSource();
    src.buffer = this.noiseBuf; src.loop = true;
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 260;
    const g = c.createGain(); g.gain.value = 0.05;
    src.connect(f); f.connect(g); g.connect(this.master);
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
