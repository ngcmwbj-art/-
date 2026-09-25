// Environment loops (amb_*, 40_audio 8). Each ambience is a small generator
// of continuous beds (filtered noise / hums, shaped by control-rate buffers)
// plus randomly timed events scheduled look-ahead from the audio clock.
// Random events use a fresh seed every time an ambience starts, so the same
// spot never repeats the same way (8章).

import { addTask } from './clock';
import { cur, dbToGain, hasGraph, midiHz, noiseSource, onSample, PaChain, makeIRMono, monoSum, spread, voice, type Graph, type VoiceOpts } from './engine';
import { chimeNote, DRM } from './instruments';
import { ambTrim, trimOr1 } from './mix';
import { hStageListeners, musicParams, stageListeners } from './music';
import { sfxTable } from './registry';
import { Rng } from '../engine/rng';

export interface AmbOpts {
  vol?: number;
  fade?: number;
  lp?: number;
}

export interface AmbCtx {
  g: Graph;
  t0: number;
  /** Where every layer goes (the instance's volume / window filter). */
  dest: AudioNode;
  rng: Rng;
  stage: number;
  /** 星見台's stage (53_ch2_audio 6.1; −1 away from 星見台). */
  hStage: number;
  seed: number;
}

export interface AmbImpl {
  pump?(until: number): void;
  setStage?(stage: number, at: number): void;
  /** 53_ch2_audio 6.1: the amb_h_* hear 星見台's stage (hStageListeners). */
  setHStage?(stage: number, at: number): void;
  event?(name: string, pan: number | undefined, at: number): void;
  /** Stop the sources (after the fade has run). */
  stop(at: number): void;
  /** Custom stop animation (dryer winding down). */
  windDown?(at: number, fade: number): void;
}

export type AmbFactory = (c: AmbCtx) => AmbImpl;

// ---------------------------------------------------------------------------
// building blocks

/** A mono control-rate buffer (8 kHz) for slow modulations. */
export function modBuffer(g: Graph, seconds: number, fn: (t: number) => number): AudioBuffer {
  const sr = 8000;
  const n = Math.floor(sr * seconds);
  const b = g.ctx.createBuffer(1, n, sr);
  const d = b.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = fn(i / sr);
  return b;
}

/** Looping modulation into an AudioParam (added to its base value). */
export function modulate(g: Graph, at: number, buf: AudioBuffer, param: AudioParam, depth: number): { stop(t: number): void; k: GainNode } {
  const s = g.ctx.createBufferSource();
  s.buffer = buf;
  s.loop = true;
  const k = g.ctx.createGain();
  k.gain.value = depth;
  s.connect(k);
  k.connect(param);
  s.start(onSample(g.ctx, at));
  return { stop: (t) => s.stop(t), k };
}

/** Smooth random curve in [-1, 1] with the given rough frequency (Hz). */
export function smoothRandom(rng: Rng, hzLo: number, hzHi: number): (t: number) => number {
  const pts: [number, number][] = [[0, rng.range(-1, 1)]];
  let t = 0;
  while (t < 600) {
    t += 1 / rng.range(hzLo, hzHi);
    pts.push([t, rng.range(-1, 1)]);
  }
  let k = 0;
  return (x: number) => {
    while (k + 1 < pts.length && pts[k + 1][0] < x) k++;
    while (k > 0 && pts[k][0] > x) k--;
    const [x0, y0] = pts[k];
    const [x1, y1] = pts[k + 1] ?? pts[k];
    const u = x1 > x0 ? (x - x0) / (x1 - x0) : 0;
    const s = u * u * (3 - 2 * u);
    return y0 + (y1 - y0) * s;
  };
}

/** Sample & hold random in [0, 1] at a random rate between hzLo..hzHi. */
export function sampleHold(rng: Rng, hzLo: number, hzHi: number): (t: number) => number {
  let next = 0;
  let v = 0;
  let last = -1;
  return (t: number) => {
    if (t < last) {
      next = 0;
    }
    last = t;
    if (t >= next) {
      v = rng.next();
      next = t + 1 / rng.range(hzLo, hzHi);
    }
    return v;
  };
}

export interface Bed {
  gain: GainNode;
  filter: BiquadFilterNode;
  src: AudioScheduledSourceNode;
  stop(t: number): void;
}

/** Continuous filtered noise. */
export function noiseBed(c: AmbCtx, type: BiquadFilterType, freq: number, q: number, vol: number, dest: AudioNode = c.dest, pan = 0): Bed {
  const g = c.g;
  const src = noiseSource(g, c.t0);
  const f = g.ctx.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  const gain = g.ctx.createGain();
  gain.gain.value = vol;
  src.connect(f);
  f.connect(gain);
  let out: AudioNode = gain;
  if (pan) {
    const p = g.ctx.createStereoPanner();
    p.pan.value = pan;
    gain.connect(p);
    out = p;
  }
  out.connect(dest);
  return { gain, filter: f, src, stop: (t) => src.stop(t) };
}

/** Continuous oscillator. */
export function toneBed(c: AmbCtx, type: OscillatorType | 'p25', freq: number, vol: number, dest: AudioNode = c.dest, lp?: number, q = 0.7): Bed {
  const g = c.g;
  const o = g.ctx.createOscillator();
  o.type = type === 'p25' ? 'square' : type;
  o.frequency.value = freq;
  const f = g.ctx.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = lp ?? 20000;
  f.Q.value = q;
  const gain = g.ctx.createGain();
  gain.gain.value = vol;
  o.connect(f);
  f.connect(gain);
  gain.connect(dest);
  o.start(c.t0);
  return { gain, filter: f, src: o, stop: (t) => o.stop(t) };
}

/** Scheduler for randomly spaced events. */
export class Every {
  next: number;
  constructor(
    public c: AmbCtx,
    private lo: number,
    private hi: number,
    private fn: (t: number) => void,
    firstLo = 0.3,
    firstHi = 0,
  ) {
    this.next = c.t0 + c.rng.range(firstLo, firstHi || hi);
  }
  pump(until: number): void {
    let guard = 0;
    while (this.next < until && guard++ < 64) {
      const t = Math.max(this.next, this.c.g.ctx.currentTime);
      this.fn(t);
      this.next += this.c.rng.range(this.lo, this.hi);
    }
  }
}

const v = (c: AmbCtx, o: VoiceOpts): void => {
  voice({ dest: c.dest, ...o });
};

// ---------------------------------------------------------------------------
// the calls and cries that SFX reuse

/** ヒグラシ「カナカナ」— one ~4 s call (8章; also se_higurashi_call). */
export function higurashiCall(t: number, dest: AudioNode, pan: number, fmul: number, lp: number, vol: number, rng: Rng): void {
  const g = cur();
  const c = g.ctx;
  const len = rng.range(3.4, 4.4);
  const osc = c.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(4600 * fmul, t);
  osc.frequency.exponentialRampToValueAtTime(3900 * fmul, t + len);
  // syllables "カ・ナ": each one sinks ~5 % (a 6.5 Hz saw on detune)
  const syl = c.createOscillator();
  syl.type = 'sawtooth';
  syl.frequency.setValueAtTime(6.5 * rng.range(0.95, 1.05), t);
  syl.frequency.linearRampToValueAtTime(5.6, t + len);
  const sg = c.createGain();
  sg.gain.value = -45;
  syl.connect(sg);
  sg.connect(osc.detune);
  // 36 Hz pulse grain (square AM, full depth)
  const am = c.createGain();
  am.gain.value = 0.5;
  const pulse = c.createOscillator();
  pulse.type = 'square';
  pulse.frequency.value = 36 * rng.range(0.96, 1.04);
  const pg = c.createGain();
  pg.gain.value = 0.5;
  pulse.connect(pg);
  pg.connect(am.gain);
  // syllable articulation (softer gaps between "カ" and "ナ")
  const art = c.createGain();
  art.gain.value = 0.7;
  const artL = c.createOscillator();
  artL.frequency.value = 6.5;
  const ag = c.createGain();
  ag.gain.value = 0.3;
  artL.connect(ag);
  ag.connect(art.gain);
  const env = c.createGain();
  env.gain.value = 0;
  env.gain.setValueAtTime(0, t);
  env.gain.linearRampToValueAtTime(vol, t + 0.3);
  env.gain.setTargetAtTime(0, t + 0.3, (len - 0.3) / 3.2);
  env.gain.setValueAtTime(0, t + len + 0.1);
  const f = c.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = lp;
  const p = c.createStereoPanner();
  p.pan.value = pan;
  osc.connect(am);
  am.connect(art);
  art.connect(f);
  f.connect(env);
  env.connect(p);
  p.connect(dest);
  const end = t + len + 0.15;
  for (const o of [osc, syl, pulse, artL]) {
    o.start(t);
    o.stop(end);
  }
  osc.onended = () => {
    for (const n of [osc, syl, sg, am, pulse, pg, art, artL, ag, env, f, p])
      try {
        n.disconnect();
      } catch {
        /* gone */
      }
  };
}

/** A radio / TV murmur: syllable-shaped noise and little pitch blips. */
function murmur(c: AmbCtx, t: number, len: number, rng: Rng, o: { bp: number; q: number; vol: number; blipLo: number; blipHi: number; dest: AudioNode }): void {
  const g = c.g;
  let x = t;
  while (x < t + len) {
    const syl = 1 / rng.range(4, 6);
    if (rng.chance(0.82)) {
      const lvl = rng.range(0.35, 1);
      voice({
        at: x,
        dest: o.dest,
        wave: 'noise',
        dur: syl * 0.55,
        attack: 0.012,
        decay: syl * 0.3,
        sustain: 0.55,
        release: syl * 0.25,
        vol: o.vol * lvl,
        filter: { type: 'bandpass', freq: o.bp * rng.range(0.85, 1.2), q: o.q },
      });
      if (rng.chance(0.55))
        voice({
          at: x + rng.range(0, syl * 0.3),
          dest: o.dest,
          wave: 'sine',
          freq: rng.range(o.blipLo, o.blipHi),
          freqEnd: rng.range(o.blipLo, o.blipHi),
          dur: syl * 0.4,
          attack: 0.008,
          decay: 0.04,
          sustain: 0.6,
          release: 0.03,
          vol: o.vol * 0.45 * lvl,
        });
    }
    x += syl * (rng.chance(0.12) ? 2.2 : 1);
  }
  void g;
}

// ---------------------------------------------------------------------------
// recipes

const AMB: Record<string, AmbFactory> = {
  amb_higurashi(c) {
    const bed = noiseBed(c, 'bandpass', 4200, 3, 0.003);
    const m = modulate(c.g, c.t0, modBuffer(c.g, 20, (t) => Math.sin(t * Math.PI * 2 * 0.2)), bed.gain.gain, 0.0015);
    const cicadas = [
      [-0.6, 0.94, 6000],
      [0.4, 1.0, 4000],
      [0.8, 1.06, 5000],
    ].map(([pan, fm, lp]) => new Every(c, 5, 12, (t) => higurashiCall(t, c.dest, pan, fm, lp, 0.02, c.rng), 0.2, 7));
    return {
      pump(u) {
        for (const e of cicadas) e.pump(u);
      },
      stop(t) {
        bed.stop(t);
        m.stop(t);
      },
    };
  },

  amb_still(c) {
    const a = noiseBed(c, 'lowpass', 300, 0.5, 0.004);
    const b = toneBed(c, 'sine', 7800, 0.0008);
    return {
      stop(t) {
        a.stop(t);
        b.stop(t);
      },
    };
  },

  amb_s2_town(c) {
    const g = c.g;
    // distant PA with a long, dark reverb
    const lp = g.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 1200;
    const conv = g.ctx.createConvolver();
    conv.normalize = false;
    conv.buffer = makeIRMono(g.ctx, 4.0, 2.2, 41, 0.7);
    const wet = g.ctx.createGain();
    wet.gain.value = 0.9;
    const dry = g.ctx.createGain();
    dry.gain.value = 0.25;
    const down = monoSum(g.ctx);
    lp.connect(down);
    down.connect(conv);
    spread(g.ctx, conv, wet);
    wet.connect(c.dest);
    lp.connect(dry);
    dry.connect(c.dest);
    const pa = new PaChain(g.ctx, lp, 1.2, 2400);
    const wind = new Every(c, 15, 25, (t) =>
      v(c, { at: t, wave: 'noise', dur: 3, swell: true, release: 0.05, vol: 0.04, filter: { type: 'bandpass', freq: 300, freqEnd: 900, time: 3, q: 1.2 }, pan: c.rng.range(-0.5, 0.5) }),
      2, 8,
    );
    const chime = new Every(c, 25, 40, (t) => {
      const notes = [74, 78, 81, 86];
      notes.forEach((m, i) => chimeNote(t + i * 0.28, m, pa.input, pa.detune, i === 3 ? 0.5 : 0.25, 0.012, i === 3 ? -35 : 0));
    }, 6, 14);
    return {
      pump(u) {
        wind.pump(u);
        chime.pump(u);
      },
      event(name, pan, at) {
        if (name !== 'flicker') return;
        const d = c.rng.range(0.08, 0.2);
        v(c, { at, wave: 'square', freq: 120, dur: d, attack: 0.004, decay: 0.02, sustain: 0.8, release: 0.02, vol: 0.006, filter: { type: 'lowpass', freq: 600 }, pan: pan ?? 0 });
        v(c, { at, wave: 'sine', freq: 2600, dur: 0.004, attack: 0.001, decay: 0.012, sustain: 0, release: 0.005, vol: 0.004, pan: pan ?? 0 });
      },
      stop() {
        /* all events are one-shots */
      },
    };
  },

  amb_train_far(c) {
    const e = new Every(c, 20, 30, (t) => sfxTable.get('se_train_far')?.({ at: t, dest: c.dest } as never), 3, 10);
    return { pump: (u) => e.pump(u), stop() {} };
  },

  amb_night_insects(c) {
    const pans = [c.rng.range(-0.7, -0.2), c.rng.range(0.2, 0.7), c.rng.range(-0.3, 0.4)];
    const suzu = new Every(c, 1.2, 1.2, (t) =>
      v(c, { at: t, wave: 'sine', freq: 4100 * c.rng.range(0.995, 1.005), dur: 0.5, attack: 0.02, decay: 0.1, sustain: 0.8, release: 0.08, vol: 0.006, am: { rate: 40, depth: 0.9 }, pan: pans[0], reverb: 0.3 }),
    );
    const koro = new Every(c, 2, 4, (t) =>
      v(c, { at: t, wave: 'sine', freq: 3600, dur: 0.8, attack: 0.02, decay: 0.2, sustain: 0.7, release: 0.1, vol: 0.005, am: { rate: 12, depth: 1, shape: 'square' }, pan: pans[1], reverb: 0.3 }),
      0.5, 3,
    );
    const matsu = new Every(c, 5, 9, (t) => {
      for (const [dt, ff] of [
        [0, 4500],
        [0.09, 4500],
        [0.3, 4300],
      ])
        v(c, { at: t + dt, wave: 'sine', freq: ff, dur: 0.03, attack: 0.003, decay: 0.05, sustain: 0.2, release: 0.04, vol: 0.004, pan: pans[2], reverb: 0.35 });
    }, 1, 6);
    return {
      pump(u) {
        suzu.pump(u);
        koro.pump(u);
        matsu.pump(u);
      },
      stop() {},
    };
  },

  amb_fan(c) {
    const g = c.g;
    const pan = g.ctx.createStereoPanner();
    pan.connect(c.dest);
    const swing = g.ctx.createGain();
    swing.connect(pan);
    const air = noiseBed(c, 'lowpass', 600, 0.6, 0.013, swing);
    const motor = toneBed(c, 'sine', 95, 0.006, swing);
    const motor2 = toneBed(c, 'triangle', 190, 0.0015, swing);
    // the blades' breath: a soft high hiss that brightens as the head turns
    // towards the room (the swing below moves it with the rest)
    const blades = noiseBed(c, 'bandpass', 3800, 0.6, 0.006, swing);
    const l = g.ctx.createOscillator();
    l.frequency.value = 0.1;
    const lA = g.ctx.createGain();
    const lF = g.ctx.createGain();
    const lP = g.ctx.createGain();
    l.connect(lA);
    l.connect(lF);
    l.connect(lP);
    lA.connect(swing.gain);
    lF.connect(air.filter.frequency);
    lP.connect(pan.pan);
    l.start(c.t0);
    const apply = (stage: number, at: number) => {
      const on = stage < 1;
      lA.gain.setTargetAtTime(on ? 0.3 : 0, at, 0.1);
      lF.gain.setTargetAtTime(on ? 180 : 0, at, 0.1);
      lP.gain.setTargetAtTime(on ? 0.3 : 0, at, 0.1);
      pan.pan.setTargetAtTime(on ? 0 : 0.3, at, 0.1);
    };
    apply(c.stage, c.t0);
    return {
      setStage: apply,
      stop(t) {
        air.stop(t);
        motor.stop(t);
        motor2.stop(t);
        blades.stop(t);
        l.stop(t);
      },
    };
  },

  amb_fridge(c) {
    const out = c.g.ctx.createGain();
    out.connect(c.dest);
    const beds = [
      toneBed(c, 'sine', 50, 0.0025, out),
      toneBed(c, 'sine', 100, 0.002, out),
      toneBed(c, 'sine', 150, 0.0014, out),
      toneBed(c, 'sine', 300, 0.0006, out),
      // the compressor's buzz (its harmonics reach where small speakers
      // play) and the thin whine of its inverter, wavering a little
      toneBed(c, 'square', 100, 0.0018, out, 1100, 1.4),
    ];
    const whine = toneBed(c, 'sine', 3350, 0.0016, out);
    beds.push(whine);
    const wv = modulate(c.g, c.t0, modBuffer(c.g, 12, smoothRandom(new Rng(c.seed + 5), 0.3, 0.9)), whine.gain.gain, 0.0005);
    // every so often the refrigerant runs through the pipes: "ポコ…ポコポコ"
    let on = c.stage < 1 || c.stage >= 3;
    const gurgle = new Every(c, 16, 32, (t) => {
      if (!on) return;
      const n = c.rng.int(3, 6);
      let x = t;
      for (let i = 0; i < n; i++) {
        const f = c.rng.range(420, 760);
        v(c, { at: x, wave: 'sine', freq: f, freqEnd: f * 1.35, glide: 0.03, dur: 0.03, attack: 0.004, decay: 0.03, sustain: 0, release: 0.02, vol: 0.004, filter: { type: 'lowpass', freq: 2400 }, pan: -0.25 });
        v(c, { at: x, wave: 'noise', dur: 0.02, attack: 0.003, decay: 0.03, sustain: 0, release: 0.02, vol: 0.003, filter: { type: 'bandpass', freq: f * 2.2, q: 3 }, pan: -0.25 });
        x += c.rng.range(0.09, 0.26);
      }
    }, 3, 12);
    const apply = (stage: number, at: number) => {
      on = stage < 1 || stage >= 3;
      out.gain.setTargetAtTime(on ? 1 : 0, at, 0.05);
    };
    apply(c.stage, c.t0);
    return {
      setStage: apply,
      pump: (u) => gurgle.pump(u),
      stop(t) {
        beds.forEach((b) => b.stop(t));
        wv.stop(t);
      },
    };
  },

  amb_tv(c) {
    const g = c.g;
    const tone = toneBed(c, 'sine', 1000, 0);
    const box = g.ctx.createBiquadFilter();
    box.type = 'bandpass';
    box.frequency.value = 1400;
    box.Q.value = 0.8;
    box.connect(c.dest);
    let stage = c.stage;
    let next = c.t0 + 0.2;
    const seed = c.seed;
    let cycle = 0;
    const apply = (s: number, at: number) => {
      stage = s;
      tone.gain.gain.setTargetAtTime(s === 2 ? 0.003 : 0, at, 0.05);
    };
    apply(stage, c.t0);
    return {
      setStage: apply,
      pump(u) {
        if (stage === 2) return;
        while (next < u) {
          if (stage === 1) {
            // the same script, read again and again (3.2 s)
            murmur(c, next, 2.9, new Rng(seed), { bp: 1000, q: 1, vol: 0.006, blipLo: 200, blipHi: 600, dest: box });
            next += 3.2;
          } else {
            const len = c.rng.range(1.5, 3.5);
            murmur(c, next, len, new Rng(seed + ++cycle), { bp: 1000, q: 1, vol: 0.006, blipLo: 200, blipHi: 600, dest: box });
            next += len + c.rng.range(0.1, 0.6);
          }
        }
      },
      stop(t) {
        tone.stop(t);
      },
    };
  },

  amb_clock_tick(c) {
    let stage = c.stage;
    let n = 0;
    // カチ・コチ: the escapement (drm_tick / drm_tock) and the knock of the
    // wooden case it sits in (a short 0.9–1.1 kHz body), the tick a little
    // brighter than the tock; the room reverb places it on the wall
    const e = new Every(c, 1, 1, (t) => {
      if (stage >= 1 && stage < 3) return;
      const tick = n++ % 2 === 0;
      (tick ? DRM.drm_tick : DRM.drm_tock)({ t, vel: 1, vol: 0.02, dest: c.dest, rev: c.g.fxSend, pan: 0.18 });
      v(c, { at: t, wave: 'noise', dur: 0.004, attack: 0.0006, decay: 0.012, sustain: 0, release: 0.006, vol: 0.016, filter: { type: 'bandpass', freq: tick ? 1250 : 1000, q: 2.2 }, pan: 0.18, reverb: 0.25 });
      v(c, { at: t, wave: 'sine', freq: tick ? 960 : 820, dur: 0.004, attack: 0.0006, decay: 0.03, sustain: 0, release: 0.01, vol: 0.006, pan: 0.18 });
    }, 0.1, 0.9);
    return {
      pump: (u) => e.pump(u),
      setStage(s) {
        stage = s;
      },
      stop() {},
    };
  },

  amb_oil(c) {
    // the heater stays under the oil (its hum is felt, the oil is heard)
    const heat = toneBed(c, 'sine', 100, 0.0022);
    const heat2 = toneBed(c, 'sine', 200, 0.0008);
    // the hot oil waiting: a faint high sizzle that flickers, and every
    // 4–9 s a "ぷつ" — sometimes answered by one or two more (ぷつ…ぷつぷつ)
    const sizzle = noiseBed(c, 'bandpass', 5200, 0.9, 0.0022);
    const fl = modulate(c.g, c.t0, modBuffer(c.g, 16, sampleHold(new Rng(c.seed + 3), 9, 22)), sizzle.gain.gain, 0.0022);
    const pop = (t: number, k: number) =>
      v(c, { at: t, wave: 'noise', dur: 0.004, attack: 0.001, decay: 0.008, sustain: 0, release: 0.004, vol: 0.016 * k, filter: { type: 'bandpass', freq: 2000 * c.rng.range(0.8, 1.5), q: 1.5 }, pan: c.rng.range(-0.3, 0.3) });
    const e = new Every(c, 4, 9, (t) => {
      pop(t, 1);
      const more = c.rng.int(0, 2);
      for (let i = 1; i <= more; i++) pop(t + i * c.rng.range(0.07, 0.19), c.rng.range(0.5, 0.9));
    }, 1, 5);
    return {
      pump: (u) => e.pump(u),
      stop(t) {
        heat.stop(t);
        heat2.stop(t);
        sizzle.stop(t);
        fl.stop(t);
      },
    };
  },

  amb_dryer(c) {
    const rumble = noiseBed(c, 'lowpass', 180, 0.8, 0.03);
    let winding = false;
    let period = 1.7;
    let next = c.t0 + 0.4;
    const zip = new Every(c, 2.5, 7, (t) => {
      if (winding) return;
      // a zipper or a button against the drum: "チャリ", once or twice
      const n = c.rng.chance(0.4) ? 2 : 1;
      for (let i = 0; i < n; i++) {
        const at = t + i * c.rng.range(0.05, 0.11);
        v(c, { at, wave: 'sine', freq: 3100 * c.rng.range(0.96, 1.04), dur: 0.02, attack: 0.001, decay: 0.03, sustain: 0, release: 0.01, vol: 0.008, pan: 0.2 });
        v(c, { at: at + 0.004, wave: 'sine', freq: 4700 * c.rng.range(0.96, 1.04), dur: 0.02, attack: 0.001, decay: 0.025, sustain: 0, release: 0.01, vol: 0.006, pan: 0.2 });
        v(c, { at, wave: 'noise', dur: 0.003, attack: 0.0006, decay: 0.006, sustain: 0, release: 0.004, vol: 0.004, filter: { type: 'highpass', freq: 5000 }, pan: 0.2 });
      }
    }, 1, 4);
    // the warm exhaust air, breathing with the drum's turn
    const air = noiseBed(c, 'bandpass', 2300, 0.7, 0.0012);
    const airM = modulate(c.g, c.t0, modBuffer(c.g, 1.7 * 8, (t) => Math.sin((t / 1.7) * Math.PI * 2)), air.gain.gain, 0.0005);
    const goton = (t: number, k = 1) => {
      v(c, { at: t, wave: 'sine', freq: 70, dur: 0.08, attack: 0.003, decay: 0.08, sustain: 0.3, release: 0.05, vol: 0.028 * k });
      v(c, { at: t, wave: 'triangle', freq: 140, dur: 0.03, attack: 0.002, decay: 0.05, sustain: 0, release: 0.03, vol: 0.012 * k });
      v(c, { at: t, wave: 'noise', dur: 0.05, attack: 0.002, decay: 0.06, sustain: 0, release: 0.03, vol: 0.024 * k, filter: { type: 'lowpass', freq: 400 } });
      // the clothes flopping over ("ボフ") and the drum's steel answering
      v(c, { at: t + 0.012, wave: 'noise', dur: 0.03, attack: 0.004, decay: 0.07, sustain: 0, release: 0.03, vol: 0.018 * k, filter: { type: 'bandpass', freq: 650, freqEnd: 380, time: 0.08, q: 1.2 } });
      v(c, { at: t + 0.006, wave: 'noise', dur: 0.004, attack: 0.001, decay: 0.018, sustain: 0, release: 0.008, vol: 0.013 * k, filter: { type: 'bandpass', freq: 1500, q: 1.6 } });
    };
    return {
      pump(u) {
        while (next < u) {
          goton(Math.max(next, c.g.ctx.currentTime), winding ? 0.7 : 1);
          next += period;
          if (winding) period *= 1.45;
        }
        zip.pump(u);
      },
      windDown(at, fade) {
        winding = true;
        rumble.filter.frequency.cancelScheduledValues(at);
        rumble.filter.frequency.setValueAtTime(180, at);
        rumble.filter.frequency.exponentialRampToValueAtTime(60, at + fade);
        air.gain.gain.setTargetAtTime(0, at, fade / 3);
      },
      stop(t) {
        rumble.stop(t);
        air.stop(t);
        airM.stop(t);
      },
    };
  },

  amb_koban(c) {
    const e = new Every(c, 12, 25, (t) => {
      v(c, { at: t, wave: 'noise', dur: 0.25, attack: 0.01, decay: 0.05, sustain: 0.8, release: 0.04, vol: 0.01, filter: { type: 'bandpass', freq: 1800, q: 2 }, am: { rate: 23, depth: 0.5 } });
      v(c, { at: t + 0.28, wave: 'sine', freq: 1200, dur: 0.06, attack: 0.003, decay: 0.02, sustain: 0.9, release: 0.02, vol: 0.006 });
    }, 3, 9);
    return { pump: (u) => e.pump(u), stop() {} };
  },

  amb_fluorescent: (c) => fluorescent(c, false),
  amb_fluorescent_flicker: (c) => fluorescent(c, true),

  amb_kaitenyaki(c) {
    const motor = toneBed(c, 'sine', 140, 0.006);
    const motor2 = toneBed(c, 'triangle', 280, 0.002);
    const plate = noiseBed(c, 'highpass', 3000, 0.5, 0.0035);
    let next = c.t0 + 0.3;
    const turn = (t: number) => {
      v(c, { at: t, wave: 'sine', freq: 90, dur: 0.08, attack: 0.003, decay: 0.08, sustain: 0.2, release: 0.04, vol: 0.03 });
      v(c, { at: t, wave: 'noise', dur: 0.05, attack: 0.002, decay: 0.06, sustain: 0, release: 0.03, vol: 0.02, filter: { type: 'lowpass', freq: 500 } });
      // "ゴトン" is iron: the plate drops into its latch with a short clank
      for (const [f, dv] of [
        [1630, 0.009],
        [2710, 0.008],
        [4090, 0.005],
      ])
        v(c, { at: t + 0.004, wave: 'sine', freq: f, dur: 0.004, attack: 0.0008, decay: 0.06, sustain: 0, release: 0.02, vol: dv, pan: -0.1 });
      v(c, { at: t + 0.003, wave: 'noise', dur: 0.004, attack: 0.0006, decay: 0.012, sustain: 0, release: 0.006, vol: 0.008, filter: { type: 'bandpass', freq: 2500, q: 1.4 }, pan: -0.1 });
      // the squeak, half a turn later
      v(c, { at: t + 1.0, wave: 'sine', freq: 1900, freqEnd: 2100, dur: 0.12, attack: 0.02, decay: 0.05, sustain: 0.7, release: 0.04, vol: 0.011, vibrato: { rate: 18, depth: 20 }, pan: 0.15 });
    };
    let synced = false;
    return {
      pump(u) {
        if (synced) return;
        while (next < u) {
          turn(Math.max(next, c.g.ctx.currentTime));
          next += 2.0;
        }
      },
      event(name, _pan, at) {
        if (name !== 'turn') return;
        synced = true;
        turn(at);
      },
      stop(t) {
        motor.stop(t);
        motor2.stop(t);
        plate.stop(t);
      },
    };
  },

  amb_mall_wind(c) {
    const b = noiseBed(c, 'bandpass', 400, 1, 0.006 * 0.6);
    const m = modulate(c.g, c.t0, modBuffer(c.g, 60, (t) => Math.sin(t * Math.PI * 2 * 0.07) * 0.9 + Math.sin(t * 0.83) * 0.1), b.gain.gain, 0.0036);
    return {
      stop(t) {
        b.stop(t);
        m.stop(t);
      },
    };
  },

  amb_kawabe(c) {
    const g = c.g;
    const all = g.ctx.createGain();
    all.connect(c.dest);
    const wob = g.ctx.createGain();
    wob.gain.value = 1;
    wob.connect(all);
    const water = noiseBed(c, 'bandpass', 900, 2, 0.008 * 0.4, wob);
    const sh = modulate(g, c.t0, modBuffer(g, 12, sampleHold(new Rng(c.seed), 12, 30)), water.gain.gain, 0.008 * 0.6);
    const floor = noiseBed(c, 'lowpass', 250, 0.6, 0.004, wob);
    // the surface catching the light: a fast, bubbling glitter at 2.5–4 kHz
    const glint = noiseBed(c, 'bandpass', 3100, 1.3, 0.0016, wob, -0.2);
    const gm = modulate(g, c.t0, modBuffer(g, 9, sampleHold(new Rng(c.seed + 11), 18, 40)), glint.gain.gain, 0.003);
    // 段階2: the whole stream sways slowly (0.3 Hz)
    const slow = modulate(g, c.t0, modBuffer(g, 20, (t) => Math.sin(t * Math.PI * 2 * 0.3)), wob.gain, 0);
    let stage = c.stage;
    const apply = (s: number, at: number) => {
      stage = s;
      all.gain.setTargetAtTime(s === 3 ? 0.7 : 1, at, 0.2);
      slow.k.gain.setTargetAtTime(s === 2 ? 0.45 : 0, at, 0.3);
      wob.gain.setTargetAtTime(s === 2 ? 0.7 : 1, at, 0.3);
    };
    apply(stage, c.t0);
    let next = c.t0;
    return {
      setStage: apply,
      pump(u) {
        while (next < u) {
          const t = Math.max(next, g.ctx.currentTime);
          const rev = stage === 2;
          voice({
            at: t,
            dest: wob,
            wave: 'sine',
            freq: 600 * c.rng.range(0.9, 1.15),
            freqEnd: 1400 * c.rng.range(0.9, 1.15),
            glide: rev ? 0.3 : 0.02,
            dur: rev ? 0.3 : 0.02,
            attack: rev ? 0.3 : 0.002,
            decay: rev ? 0 : 0.02,
            sustain: rev ? 1 : 0,
            release: rev ? 0.02 : 0.015,
            swell: rev,
            vol: 0.004 * c.rng.range(0.5, 1.2),
            pan: c.rng.range(-0.4, 0.4),
          });
          next += 1 / c.rng.range(6, 12);
        }
      },
      stop(t) {
        water.stop(t);
        floor.stop(t);
        glint.stop(t);
        gm.stop(t);
        sh.stop(t);
        slow.stop(t);
      },
    };
  },

  amb_arcade(c) {
    const g = c.g;
    const radio = g.ctx.createBiquadFilter();
    radio.type = 'bandpass';
    radio.frequency.value = 1550;
    radio.Q.value = 0.6;
    const rg = g.ctx.createGain();
    radio.connect(rg);
    rg.connect(c.dest);
    let stage = c.stage;
    let next = c.t0 + 0.1;
    let cycle = 0;
    const seed = c.seed;
    const flag = new Every(c, 3, 6, (t) => {
      if (stage !== 0) return;
      const len = c.rng.range(0.5, 1.2);
      const buf = modBuffer(g, len + 0.1, sampleHold(new Rng(seed + ++cycle), 5, 9));
      const src = noiseSource(g, t);
      const f = g.ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = 700;
      f.Q.value = 0.8;
      const a = g.ctx.createGain();
      a.gain.value = 0;
      const env = g.ctx.createGain();
      env.gain.value = 0;
      env.gain.setValueAtTime(0, t);
      env.gain.linearRampToValueAtTime(0.006, t + 0.08);
      env.gain.setValueAtTime(0.006, t + len - 0.15);
      env.gain.linearRampToValueAtTime(0, t + len);
      const p = g.ctx.createStereoPanner();
      p.pan.value = c.rng.range(-0.6, 0.6);
      src.connect(f);
      f.connect(a);
      a.connect(env);
      env.connect(p);
      p.connect(c.dest);
      const ms = g.ctx.createBufferSource();
      ms.buffer = buf;
      ms.connect(a.gain);
      ms.start(onSample(g.ctx, t));
      src.stop(t + len + 0.05);
      ms.stop(t + len + 0.05);
    }, 1, 4);
    const apply = (s: number, at: number) => {
      stage = s;
      rg.gain.setTargetAtTime(s === 2 ? 0 : 1, at, 0.2);
    };
    apply(stage, c.t0);
    return {
      setStage: apply,
      pump(u) {
        flag.pump(u);
        if (stage === 2) {
          next = Math.max(next, u);
          return;
        }
        while (next < u) {
          if (stage === 1) {
            murmur(c, next, 2.2, new Rng(seed), { bp: 1200, q: 1.5, vol: 0.004, blipLo: 300, blipHi: 900, dest: radio });
            next += 2.4;
          } else {
            const len = c.rng.range(1.2, 3);
            murmur(c, next, len, new Rng(seed + 7 * ++cycle), { bp: 1200, q: 1.5, vol: 0.004, blipLo: 300, blipHi: 900, dest: radio });
            next += len + c.rng.range(0.05, 0.4);
          }
        }
      },
      stop() {},
    };
  },

  amb_wind(c) {
    const g = c.g;
    const out = g.ctx.createGain();
    const pan = g.ctx.createStereoPanner();
    out.connect(pan);
    pan.connect(c.dest);
    const gustFn = smoothRandom(new Rng(c.seed), 0.1, 0.3);
    const gustBuf = modBuffer(g, 60, (t) => 0.5 + 0.5 * gustFn(t));
    const air = noiseBed(c, 'lowpass', 500, 0.5, 0, out);
    const grass = noiseBed(c, 'highpass', 3000, 0.5, 0, out);
    const m1 = modulate(g, c.t0, gustBuf, air.gain.gain, 0.01);
    const m2 = modulate(g, c.t0, gustBuf, grass.gain.gain, 0.004);
    const whistle = noiseBed(c, 'bandpass', 350, 4, 0, out);
    let stage = c.stage;
    const swell = new Every(c, 10, 20, (t) => {
      if (stage !== 2) return;
      voice({ at: t, dest: out, wave: 'noise', dur: 2.5, swell: true, release: 0.06, vol: 0.006, filter: { type: 'bandpass', freq: 280, freqEnd: 800, time: 2.5, q: 1 } });
    }, 3, 9);
    const apply = (s: number, at: number) => {
      stage = s;
      out.gain.setTargetAtTime(s === 1 ? 0 : 1, at, s === 1 ? 0.5 / 3 : 0.2);
      pan.pan.setTargetAtTime(s === 2 ? 0.5 : 0, at, 0.3);
      whistle.gain.gain.setTargetAtTime(s === 2 ? 0.003 : 0, at, 0.3);
    };
    apply(stage, c.t0);
    return {
      setStage: apply,
      pump: (u) => swell.pump(u),
      stop(t) {
        air.stop(t);
        grass.stop(t);
        whistle.stop(t);
        m1.stop(t);
        m2.stop(t);
      },
    };
  },
};

function fluorescent(c: AmbCtx, flickerMode: boolean): AmbImpl {
  const g = c.g;
  const hum = g.ctx.createGain();
  hum.connect(c.dest);
  // the hum is felt more than heard; the ballast's buzz and the tube's hiss carry the room
  const beds = [toneBed(c, 'sine', 60, 0.0065, hum), toneBed(c, 'sine', 120, 0.0085, hum), noiseBed(c, 'highpass', 5000, 0.5, 0.003, hum)];
  const buzz = toneBed(c, 'square', 120, 0.006, hum, 700, 2);
  beds.push(buzz);
  // the tube's "ジー": hiss chopped at 120 Hz by the ballast, a thin band at
  // 2.5–3.5 kHz (where the mall song leaves room) — the sound that says
  // "fluorescent" on any speaker, long after the 60 Hz hum is gone
  const SZ = 0.0055;
  const sizz = noiseBed(c, 'bandpass', 3000, 1.2, SZ, hum);
  const chop = g.ctx.createGain();
  chop.gain.value = 0.55;
  sizz.filter.disconnect();
  sizz.filter.connect(chop);
  chop.connect(sizz.gain);
  const chopLfo = g.ctx.createOscillator();
  chopLfo.type = 'square';
  chopLfo.frequency.value = 120;
  const chopDepth = g.ctx.createGain();
  chopDepth.gain.value = 0.45;
  chopLfo.connect(chopDepth);
  chopDepth.connect(chop.gain);
  chopLfo.start(c.t0);
  beds.push(sizz, { stop: (t: number) => chopLfo.stop(t) } as Bed);
  const jiji = (t: number) => {
    const d = c.rng.range(0.08, 0.2);
    const p = buzz.gain.gain;
    const q = sizz.gain.gain;
    p.setValueAtTime(0.006, t);
    p.linearRampToValueAtTime(0.018, t + 0.01);
    q.setValueAtTime(SZ, t);
    q.linearRampToValueAtTime(SZ * 3.2, t + 0.01);
    // crackle inside the "ジジッ"
    for (let k = 0; k < 3; k++) {
      p.setValueAtTime(k % 2 ? 0.006 : 0.02, t + (d * (k + 1)) / 4);
      q.setValueAtTime(k % 2 ? SZ : SZ * 3.6, t + (d * (k + 1)) / 4);
    }
    p.setValueAtTime(0.018, t + d - 0.01);
    p.linearRampToValueAtTime(0.006, t + d);
    q.setValueAtTime(SZ * 3.2, t + d - 0.01);
    q.linearRampToValueAtTime(SZ, t + d);
  };
  const e = new Every(c, 2, 7, (t) => !flickerMode && jiji(t), 1, 5);
  let nextToggle = c.t0 + 1.3;
  let on = true;
  return {
    pump(u) {
      e.pump(u);
      if (!flickerMode) return;
      while (nextToggle < u) {
        on = !on;
        const t = Math.max(nextToggle, g.ctx.currentTime);
        hum.gain.setValueAtTime(on ? 0 : 1, t);
        hum.gain.linearRampToValueAtTime(on ? 1 : 0, t + 0.015);
        if (on) jiji(t);
        nextToggle += 1.3;
      }
    },
    event(name, _pan, at) {
      if (name === 'flicker') jiji(at);
    },
    stop(t) {
      beds.forEach((b) => b.stop(t));
    },
  };
}

// ---------------------------------------------------------------------------
// manager

interface Inst {
  id: string;
  out: GainNode;
  lp: BiquadFilterNode;
  impl: AmbImpl;
  stopping: boolean;
}

const active = new Map<string, Inst>();
const pendingAmb = new Map<string, AmbOpts>();
let task = false;

export const AMBIENCE_IDS = Object.keys(AMB);

/**
 * Add an ambience recipe from another file (the chapter-2 beds live in
 * ambience_ch2.ts). The id joins AMBIENCE_IDS, so the QA report and the sound
 * test see it like any other.
 */
export function registerAmbience(id: string, f: AmbFactory): void {
  if (!(id in AMB)) AMBIENCE_IDS.push(id);
  AMB[id] = f;
}

/** Ambience schedules 0.3 s ahead like the music (a stall must not bunch the insects). */
const AMB_LOOKAHEAD = 0.3;

function ensureTask(): void {
  if (task) return;
  task = true;
  addTask({
    lookahead: AMB_LOOKAHEAD,
    pump(until) {
      for (const i of active.values()) i.impl.pump?.(until);
    },
  });
  stageListeners.push((s) => {
    const g = cur();
    for (const i of active.values()) i.impl.setStage?.(s, g.ctx.currentTime);
  });
  hStageListeners.push((s) => {
    const g = cur();
    for (const i of active.values()) i.impl.setHStage?.(s, g.ctx.currentTime);
  });
}

/** Build an ambience into any graph (live or offline). Returns the instance. */
export function createAmbient(g: Graph, id: string, opts: AmbOpts, dest: AudioNode, at?: number, stage?: number, hStage?: number): Inst | null {
  const f = AMB[id];
  if (!f) {
    if (import.meta.env.DEV) console.warn(`[audio] unknown ambience ${id}`);
    return null;
  }
  const t0 = at ?? g.ctx.currentTime + 0.03;
  const out = g.ctx.createGain();
  const fade = opts.fade ?? 0.3;
  const vol = opts.vol ?? 1;
  out.gain.value = 0;
  out.gain.setValueAtTime(0, t0);
  out.gain.linearRampToValueAtTime(vol, t0 + Math.max(0.02, fade));
  const lp = g.ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = opts.lp ?? 20000;
  // the mix trim (mix.ts) sits behind the instance volume that setAmbientVol drives
  const trim = g.ctx.createGain();
  trim.gain.value = trimOr1(ambTrim(id));
  out.connect(trim);
  trim.connect(lp);
  lp.connect(dest);
  // live: a new take every time; offline QA renders: the same take for the same id
  const seed = g.offline ? [...id].reduce((h, ch) => (Math.imul(h, 31) + ch.charCodeAt(0)) | 0, 7) >>> 0 : (Math.random() * 1e9) | 0;
  const impl = f({ g, t0, dest: out, rng: new Rng(seed), stage: stage ?? musicParams().stage, hStage: hStage ?? musicParams().h_stage, seed });
  return { id, out, lp, impl, stopping: false };
}

export function playAmbient(id: string, opts: AmbOpts = {}): void {
  if (!hasGraph()) {
    pendingAmb.set(id, opts);
    return;
  }
  const ex = active.get(id);
  const g = cur();
  if (ex && !ex.stopping) {
    const t = g.ctx.currentTime;
    if (opts.vol !== undefined) ex.out.gain.setTargetAtTime(opts.vol, t, (opts.fade ?? 0.3) / 3);
    if (opts.lp !== undefined) ex.lp.frequency.setTargetAtTime(opts.lp, t, 0.1);
    return;
  }
  if (ex) active.delete(id);
  ensureTask();
  const inst = createAmbient(g, id, opts, g.ambBus);
  if (inst) {
    active.set(id, inst);
    inst.impl.pump?.(g.ctx.currentTime + AMB_LOOKAHEAD);
  }
}

export function stopAmbient(id: string, fade = 0.3): void {
  pendingAmb.delete(id);
  const i = active.get(id);
  if (!i || i.stopping) return;
  i.stopping = true;
  const g = cur();
  const t = g.ctx.currentTime;
  const p = i.out.gain;
  p.cancelScheduledValues(t);
  p.setValueAtTime(p.value, t);
  if (i.impl.windDown) i.impl.windDown(t, fade);
  p.linearRampToValueAtTime(0, t + Math.max(0.01, fade));
  const end = t + Math.max(0.01, fade) + 0.05;
  i.impl.stop(end);
  setTimeout(() => {
    if (active.get(id) === i) active.delete(id);
    try {
      i.out.disconnect();
      i.lp.disconnect();
    } catch {
      /* gone */
    }
  }, (end - t) * 1000 + 400);
}

export function stopAllAmbient(fade = 0.3): void {
  pendingAmb.clear();
  for (const id of [...active.keys()]) stopAmbient(id, fade);
}

export function setAmbientVol(id: string, vol: number, ramp = 0.3): void {
  const i = active.get(id);
  if (!i) {
    const p = pendingAmb.get(id);
    if (p) p.vol = vol;
    return;
  }
  if (i.stopping) return;
  const t = cur().ctx.currentTime;
  i.out.gain.cancelScheduledValues(t);
  i.out.gain.setValueAtTime(i.out.gain.value, t);
  i.out.gain.linearRampToValueAtTime(Math.max(0, vol), t + Math.max(0.01, ramp));
}

export function ambientEvent(id: string, name: string, pan?: number): void {
  const i = active.get(id);
  if (!i || i.stopping) return;
  i.impl.event?.(name, pan, cur().ctx.currentTime + 0.01);
}

export function flushPendingAmbient(): void {
  for (const [id, o] of pendingAmb) playAmbient(id, o);
  pendingAmb.clear();
}

export function activeAmbients(): string[] {
  return [...active.values()].filter((i) => !i.stopping).map((i) => i.id);
}

export { dbToGain, midiHz };
