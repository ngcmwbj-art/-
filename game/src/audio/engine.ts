// WebAudio core: context, mix buses, reverb send, and a flexible one-shot
// synth voice. Everything musical/SFX is built from these primitives.

export interface Bus {
  input: GainNode;
}

let ctx: AudioContext | null = null;
let master: GainNode;
let musicBus: GainNode;
let sfxBus: GainNode;
let reverbSend: GainNode;
let noiseBuf: AudioBuffer;
let compressor: DynamicsCompressorNode;
let musicDuck: GainNode;

export function audioCtx(): AudioContext | null {
  return ctx;
}

export function buses() {
  return { master, music: musicBus, sfx: sfxBus, reverb: reverbSend, musicDuck };
}

/** Create the AudioContext (must be called from a user gesture). */
export function initAudio(): AudioContext {
  if (ctx) {
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  }
  ctx = new AudioContext({ latencyHint: 'interactive' });
  compressor = ctx.createDynamicsCompressor();
  compressor.threshold.value = -14;
  compressor.knee.value = 12;
  compressor.ratio.value = 4;
  compressor.attack.value = 0.004;
  compressor.release.value = 0.18;
  master = ctx.createGain();
  master.gain.value = 0.8;
  master.connect(compressor);
  compressor.connect(ctx.destination);

  musicDuck = ctx.createGain();
  musicDuck.gain.value = 1;
  musicDuck.connect(master);
  musicBus = ctx.createGain();
  musicBus.gain.value = 0.55;
  musicBus.connect(musicDuck);
  sfxBus = ctx.createGain();
  sfxBus.gain.value = 0.8;
  sfxBus.connect(master);

  // Simple algorithmic reverb: exponentially decaying stereo noise IR.
  const conv = ctx.createConvolver();
  const len = Math.floor(ctx.sampleRate * 1.6);
  const ir = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2);
  }
  conv.buffer = ir;
  reverbSend = ctx.createGain();
  reverbSend.gain.value = 0.35;
  const revLow = ctx.createBiquadFilter();
  revLow.type = 'highpass';
  revLow.frequency.value = 250;
  reverbSend.connect(revLow);
  revLow.connect(conv);
  conv.connect(master);

  noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const nd = noiseBuf.getChannelData(0);
  for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
  return ctx;
}

export function noiseBuffer(): AudioBuffer {
  return noiseBuf;
}

export type Wave = OscillatorType | 'noise' | 'pulse25' | 'pulse12';

const periodicCache = new Map<string, PeriodicWave>();
function pulseWave(c: AudioContext, duty: number): PeriodicWave {
  const key = `p${duty}`;
  let w = periodicCache.get(key);
  if (!w) {
    const n = 64;
    const real = new Float32Array(n);
    const imag = new Float32Array(n);
    for (let k = 1; k < n; k++) real[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * duty);
    w = c.createPeriodicWave(real, imag);
    periodicCache.set(key, w);
  }
  return w;
}

export interface VoiceOpts {
  wave?: Wave;
  freq?: number;
  /** Frequency at end of `dur` (exponential glide). */
  freqEnd?: number;
  /** Glide time for freqEnd (defaults to dur). */
  glide?: number;
  dur?: number; // seconds (gate length)
  vol?: number;
  attack?: number;
  decay?: number;
  sustain?: number; // level 0..1
  release?: number;
  detune?: number; // cents
  vibrato?: { rate: number; depth: number; delay?: number }; // depth in cents
  filter?: { type: BiquadFilterType; freq: number; q?: number; freqEnd?: number };
  pan?: number;
  reverb?: number; // send amount 0..1
  bus?: 'sfx' | 'music';
  /** Absolute start time (ctx.currentTime based). */
  at?: number;
}

/** Play one enveloped oscillator/noise voice. Returns end time. */
export function voice(o: VoiceOpts): number {
  if (!ctx) return 0;
  const c = ctx;
  const t0 = o.at ?? c.currentTime;
  const dur = o.dur ?? 0.1;
  const atk = o.attack ?? 0.002;
  const dec = o.decay ?? 0.05;
  const sus = o.sustain ?? 0.7;
  const rel = o.release ?? 0.05;
  const vol = o.vol ?? 0.3;
  const wave = o.wave ?? 'square';

  let src: AudioScheduledSourceNode;
  let freqParam: AudioParam | null = null;
  if (wave === 'noise') {
    const n = c.createBufferSource();
    n.buffer = noiseBuf;
    n.loop = true;
    if (o.freq) n.playbackRate.value = Math.max(0.05, o.freq / 1000);
    if (o.freq && o.freqEnd) n.playbackRate.exponentialRampToValueAtTime(Math.max(0.05, o.freqEnd / 1000), t0 + (o.glide ?? dur));
    src = n;
  } else {
    const osc = c.createOscillator();
    if (wave === 'pulse25') osc.setPeriodicWave(pulseWave(c, 0.25));
    else if (wave === 'pulse12') osc.setPeriodicWave(pulseWave(c, 0.125));
    else osc.type = wave;
    osc.frequency.setValueAtTime(o.freq ?? 440, t0);
    if (o.freqEnd) osc.frequency.exponentialRampToValueAtTime(Math.max(1, o.freqEnd), t0 + (o.glide ?? dur));
    if (o.detune) osc.detune.value = o.detune;
    freqParam = osc.frequency;
    if (o.vibrato) {
      const lfo = c.createOscillator();
      const lg = c.createGain();
      lfo.frequency.value = o.vibrato.rate;
      lg.gain.setValueAtTime(0, t0);
      lg.gain.linearRampToValueAtTime(o.vibrato.depth, t0 + (o.vibrato.delay ?? 0) + 0.05);
      lfo.connect(lg);
      lg.connect(osc.detune);
      lfo.start(t0);
      lfo.stop(t0 + dur + rel + 0.1);
    }
    src = osc;
  }
  void freqParam;

  const env = c.createGain();
  env.gain.setValueAtTime(0, t0);
  env.gain.linearRampToValueAtTime(vol, t0 + atk);
  env.gain.linearRampToValueAtTime(vol * sus, t0 + atk + dec);
  env.gain.setValueAtTime(vol * sus, t0 + Math.max(atk + dec, dur));
  env.gain.linearRampToValueAtTime(0.0001, t0 + Math.max(atk + dec, dur) + rel);

  let node: AudioNode = src;
  if (o.filter) {
    const f = c.createBiquadFilter();
    f.type = o.filter.type;
    f.frequency.setValueAtTime(o.filter.freq, t0);
    if (o.filter.freqEnd) f.frequency.exponentialRampToValueAtTime(Math.max(20, o.filter.freqEnd), t0 + dur);
    f.Q.value = o.filter.q ?? 0.7;
    node.connect(f);
    node = f;
  }
  node.connect(env);
  let out: AudioNode = env;
  if (o.pan) {
    const p = c.createStereoPanner();
    p.pan.value = o.pan;
    env.connect(p);
    out = p;
  }
  const bus = o.bus === 'music' ? musicBus : sfxBus;
  out.connect(bus);
  if (o.reverb) {
    const s = c.createGain();
    s.gain.value = o.reverb;
    out.connect(s);
    s.connect(reverbSend);
  }
  const end = t0 + Math.max(atk + dec, dur) + rel + 0.02;
  src.start(t0);
  src.stop(end);
  return end;
}

/** Note name ("C4", "F#3", "Bb5") or MIDI number → Hz. */
export function noteHz(n: string | number): number {
  if (typeof n === 'number') return 440 * Math.pow(2, (n - 69) / 12);
  const m = /^([A-Ga-g])([#b]?)(-?\d)$/.exec(n);
  if (!m) return 440;
  const base: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  let semi = base[m[1].toUpperCase()];
  if (m[2] === '#') semi++;
  if (m[2] === 'b') semi--;
  const midi = (parseInt(m[3], 10) + 1) * 12 + semi;
  return 440 * Math.pow(2, (midi - 69) / 12);
}
