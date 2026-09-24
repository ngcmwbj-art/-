// Instrument patches (ins_*) and drums (drm_*) from 40_audio 3.2–3.5.
// Every instrument is a function that schedules one note at an absolute time.
// Music notes pass `det` (the song's pitch bus: stage detune, tape wobble,
// the mid-boss bow) so every oscillator — FM modulators included — follows it.

import { arand, cachedWave, captured, cur, hasGraph, midiHz, noteLog, onRelease, sharedLfo, startTimeFor, voice, type VoiceHandle, type VoiceOpts } from './engine';

export interface InsOpts {
  /** Override the patch's base v. */
  vol?: number;
  /** Override the low-pass cutoff (Hz). */
  lp?: number;
  /** Vibrato override. */
  vib?: { rate: number; depth: number; delay?: number };
  /** Multiplies the patch's vibrato depth (段階1/2 = ×2). */
  vibMul?: number;
  /** Reverb send override. */
  rev?: number;
  /** ins_recorder: the leaking overblown note. */
  leak?: boolean;
  /** ins_fm_slap: octave "pull" (R'). */
  pull?: boolean;
  /** FM index override (e.g. softer bass). */
  index?: number;
  indexEnd?: number;
  /** ins_choir: children's formants ×1.25. */
  child?: boolean;
  /** ins_lead_boss wave override (phase 2 → p25). */
  wave?: 'square' | 'pulse25';
  /** Static pan for the note. */
  pan?: number;
  /** Hold (seconds) for sustaining bell-like patches (ins_chime). */
  hold?: number;
  /** Extra detune (cents). */
  detune?: number;
  /** Envelope overrides (s) for pads. */
  attack?: number;
  release?: number;
}

export interface NoteCtx {
  t: number;
  midi: number;
  /** Gate length (s). */
  dur: number;
  vel: number;
  dest: AudioNode;
  /** Reverb destination (the song's wet send). */
  rev?: AudioNode;
  /** Music pitch bus (cents). */
  det?: AudioNode | null;
  det2?: AudioNode | null;
  o?: InsOpts;
  /** Previous note of the same part (portamento). */
  prev?: number | null;
  /** Previous note is still sounding into this one. */
  legato?: boolean;
}

export type Instrument = (n: NoteCtx) => void;

// Music voices share their static filters per part and read filter sweeps
// per render quantum (engine.ts voice(): shareFilter / krate, 15.3).
const base = (n: NoteCtx, extra: VoiceOpts = {}): VoiceOpts => ({
  at: n.t,
  dest: n.dest,
  revDest: n.rev,
  detuneSrc: n.det ?? null,
  detuneSrc2: n.det2 ?? null,
  pan: n.o?.pan,
  shareFilter: true,
  krate: true,
  ...extra,
});

const vib = (n: NoteCtx, rate: number, depth: number, delay: number) => {
  const v = n.o?.vib ?? { rate, depth, delay };
  return { rate: v.rate, depth: v.depth * (n.o?.vibMul ?? 1), delay: v.delay ?? delay };
};

function leadSq50(n: NoteCtx): void {
  voice(
    base(n, {
      wave: 'square',
      freq: midiHz(n.midi),
      dur: n.dur,
      vol: (n.o?.vol ?? 0.1) * n.vel * 0.62,
      attack: 0.005,
      decay: 0.09,
      sustain: 0.65,
      release: 0.07,
      vibrato: vib(n, 5.2, 10, 0.2),
      filter: { type: 'lowpass', freq: n.o?.lp ?? 5000, q: 0.5 },
      detune: n.o?.detune,
      reverb: n.o?.rev ?? 0.18,
    }),
  );
}

function leadP25(n: NoteCtx): void {
  voice(
    base(n, {
      wave: 'pulse25',
      freq: midiHz(n.midi),
      dur: n.dur,
      vol: (n.o?.vol ?? 0.09) * n.vel * 0.7,
      attack: 0.003,
      decay: 0.06,
      sustain: 0.6,
      release: 0.06,
      vibrato: vib(n, 5.8, 14, 0.15),
      filter: { type: 'lowpass', freq: n.o?.lp ?? 6000, q: 0.5 },
      detune: n.o?.detune,
      reverb: n.o?.rev ?? 0.15,
    }),
  );
}

function leadP12(n: NoteCtx): void {
  voice(
    base(n, {
      wave: 'pulse12',
      freq: midiHz(n.midi),
      dur: n.dur,
      vol: (n.o?.vol ?? 0.06) * n.vel * 0.8,
      attack: 0.002,
      decay: 0.04,
      sustain: 0.5,
      release: 0.04,
      vibrato: n.o?.vib ? vib(n, 0, 0, 0) : undefined,
      filter: { type: 'lowpass', freq: n.o?.lp ?? 7000, q: 0.5 },
      detune: n.o?.detune,
      reverb: n.o?.rev ?? 0.12,
    }),
  );
}

function leadBoss(n: NoteCtx): void {
  const f = midiHz(n.midi);
  const porta = n.prev != null && n.legato ? 0.03 : 0;
  const pf = porta ? midiHz(n.prev!) : undefined;
  const v = (n.o?.vol ?? 0.09) * n.vel;
  const common = base(n, {
    freq: f,
    portaFrom: pf,
    porta: porta || undefined,
    dur: n.dur,
    attack: 0.008,
    decay: 0.25,
    sustain: 0.7,
    release: 0.12,
    vibrato: vib(n, 5, 12, 0.18),
    filter: { type: 'lowpass', freq: n.o?.lp ?? 3200, freqEnd: (n.o?.lp ?? 3200) * 0.5625, time: 0.3, q: 0.9 },
    reverb: n.o?.rev ?? 0.22,
    detune: n.o?.detune,
  });
  // the square and the saw (+7 cents) share one envelope and one filter EG
  voice({ ...common, wave: n.o?.wave ?? 'square', vol: v, layerMain: 0.55, layers: [{ wave: 'sawtooth', vol: 0.42, detune: 7 }] });
}

function recorder(n: NoteCtx): void {
  const f = midiHz(n.midi);
  const v = (n.o?.vol ?? 0.09) * n.vel;
  const common = base(n, {
    freq: f,
    dur: n.dur,
    attack: 0.025,
    decay: 0,
    sustain: 1,
    release: 0.05,
    scoop: -40,
    scoopTime: 0.04,
    vibrato: vib(n, 4.5, 8, 0.3),
    reverb: n.o?.rev ?? 0.25,
  });
  voice({ ...common, wave: 'triangle', vol: v, layerMain: 0.7, layers: [{ wave: 'sine', vol: 0.3 }] });
  // breath
  voice(
    base(n, {
      wave: 'noise',
      dur: n.dur,
      attack: 0.025,
      decay: 0.08,
      sustain: 0.6,
      release: 0.05,
      vol: 0.012 * n.vel * (n.o?.leak ? 3 : 1) * ((n.o?.vol ?? 0.09) / 0.09),
      filter: { type: 'bandpass', freq: 1500, q: 1 },
      reverb: 0.2,
    }),
  );
  if (n.o?.leak) {
    // the overblown squeak: octave-up square falling from +80 cents
    voice(
      base(n, {
        wave: 'square',
        freq: f * 2,
        dur: n.dur,
        attack: 0.004,
        decay: 0.05,
        sustain: 0.8,
        release: 0.04,
        vol: v * 0.4 * 0.5,
        scoop: 80,
        scoopTime: Math.max(0.04, n.dur * 0.8),
        filter: { type: 'lowpass', freq: 5000 },
        reverb: 0.3,
      }),
    );
  }
}

function musicbox(n: NoteCtx): void {
  const f = midiHz(n.midi);
  const v = (n.o?.vol ?? 0.08) * n.vel;
  const det = (n.o?.detune ?? 0) + (arand() * 2 - 1) * 4;
  const common = base(n, {
    dur: 0.005,
    attack: 0.001,
    sustain: 0,
    release: 0.2,
    detune: det,
    reverb: n.o?.rev ?? 0.45,
  });
  voice({ ...common, wave: 'triangle', freq: f, vol: v, decay: 0.9, vibrato: n.o?.vib ? vib(n, 0, 0, 0) : undefined });
  // the comb's bright partials (×4 at 0.18, ×3 at 0.06) ring out together
  voice({ ...common, wave: 'sine', periodic: combWave, freq: f, vol: v * 0.18, decay: 0.42 });
}

/** Partials 3 (1/3) and 4 (1) of the music box comb, one oscillator. */
function combWave(c: BaseAudioContext): PeriodicWave {
  return cachedWave(c, 'comb', () => {
    const real = new Float32Array(5);
    const imag = new Float32Array(5);
    imag[3] = 1 / 3;
    imag[4] = 1;
    return { real, imag };
  });
}

function epiano(n: NoteCtx): void {
  const f = midiHz(n.midi);
  const v = (n.o?.vol ?? 0.05) * n.vel;
  const common = base(n, {
    freq: f,
    dur: n.dur,
    attack: 0.003,
    decay: 1.6,
    sustain: 0.25,
    release: 0.3,
    reverb: n.o?.rev ?? 0.22,
    detune: n.o?.detune,
  });
  // FM② (the tine: ratio 14, gone in 60 ms) rides on the same carrier as a
  // second modulator; its sidebands sit at the level the separate 0.25 tine
  // operator gave them (J1(0.35) ≈ 0.25 × J1(1.4)), for half the oscillators
  voice({
    ...common,
    wave: 'sine',
    vol: v,
    fm: { ratio: 1, index: n.o?.index ?? 1.8, indexEnd: n.o?.indexEnd ?? 0.3, indexTime: 1200 },
    fm2: { ratio: 14, index: 0.35, indexEnd: 0, indexTime: 60 },
  });
}

function marimba(n: NoteCtx): void {
  voice(
    base(n, {
      wave: 'sine',
      freq: midiHz(n.midi),
      dur: 0.01,
      // 2.5 ms: still a mallet, but the FM burst (±4 kHz of deviation at the
      // strike) is rounded instead of starting on a corner — three of them
      // struck together read as a click otherwise ("やわらかいアタック")
      attack: 0.0025,
      decay: 0.35,
      sustain: 0,
      release: 0.08,
      vol: (n.o?.vol ?? 0.09) * n.vel,
      fm: { ratio: 4, index: 3.2, indexEnd: 0, indexTime: 40 },
      reverb: n.o?.rev ?? 0.18,
      detune: n.o?.detune,
    }),
  );
}

function vibes(n: NoteCtx, extra: VoiceOpts = {}): void {
  const f = midiHz(n.midi);
  const v = (n.o?.vol ?? 0.07) * n.vel;
  const hold = n.o?.hold;
  const env = hold
    ? { dur: hold, attack: 0.003, decay: 1.4, sustain: 0.35, release: 0.6 }
    : { dur: 0.01, attack: 0.002, decay: 1.4, sustain: 0, release: 0.3 };
  const common = base(n, { freq: f, ...env, reverb: n.o?.rev ?? 0.3, detune: n.o?.detune, ...extra });
  // the FM bar and the plain fundamental (0.5) under one envelope
  voice({ ...common, wave: 'sine', vol: v, fm: { ratio: 4, index: 1.2, indexEnd: 0, indexTime: 150 }, layers: [{ wave: 'sine', vol: 0.5 }] });
}

function brass(n: NoteCtx): void {
  voice(
    base(n, {
      wave: 'sine',
      freq: midiHz(n.midi),
      dur: n.dur,
      attack: 0.02,
      decay: 0.2,
      sustain: 0.7,
      release: 0.08,
      vol: (n.o?.vol ?? 0.07) * n.vel,
      fm: { ratio: 1, index: 3.5, indexAttack: 40, indexEnd: 2.2, indexTime: 200 },
      filter: { type: 'lowpass', freq: n.o?.lp ?? 2800, q: 0.7 },
      reverb: n.o?.rev ?? 0.15,
      detune: n.o?.detune,
    }),
  );
}

function cowbell(n: NoteCtx): void {
  const v = (n.o?.vol ?? 0.07) * n.vel;
  for (const f of [540, 800])
    voice(
      base(n, {
        wave: 'sine',
        freq: f,
        dur: 0.01,
        attack: 0.001,
        decay: 0.22,
        sustain: 0,
        release: 0.05,
        vol: v,
        fm: { ratio: 1.41, index: 2, indexEnd: 0.5, indexTime: 80 },
        filter: { type: 'bandpass', freq: 2400, q: 1.5 },
        reverb: 0.15,
      }),
    );
}

function fmBass(n: NoteCtx): void {
  voice(
    base(n, {
      wave: 'sine',
      freq: midiHz(n.midi),
      dur: n.dur,
      attack: 0.003,
      decay: 0.28,
      sustain: 0.55,
      release: 0.06,
      vol: (n.o?.vol ?? 0.16) * n.vel,
      fm: { ratio: 1, index: n.o?.index ?? 2.4, indexEnd: n.o?.indexEnd ?? 0.7, indexTime: 150 },
      filter: { type: 'lowpass', freq: n.o?.lp ?? 1400, q: 0.8 },
      detune: n.o?.detune,
    }),
  );
}

function slap(n: NoteCtx): void {
  const pull = n.o?.pull;
  voice(
    base(n, {
      wave: 'sine',
      freq: midiHz(n.midi),
      dur: n.dur,
      attack: 0.001,
      decay: 0.2,
      sustain: 0.35,
      release: 0.04,
      vol: (n.o?.vol ?? 0.17) * n.vel * (pull ? 1.15 : 1),
      fm: { ratio: 1, index: 6 + (pull ? 1.5 : 0), indexEnd: 1.2, indexTime: 45 },
      fm2: { ratio: 3, index: 2, indexEnd: 0, indexTime: 20 },
      filter: { type: 'lowpass', freq: n.o?.lp ?? 2200, q: 0.9 },
      detune: n.o?.detune,
    }),
  );
}

function fretless(n: NoteCtx): void {
  const porta = n.prev != null && n.legato ? 0.06 : 0;
  voice(
    base(n, {
      wave: 'sine',
      freq: midiHz(n.midi),
      portaFrom: porta ? midiHz(n.prev!) : undefined,
      porta: porta || undefined,
      dur: n.dur,
      attack: 0.02,
      decay: 0.3,
      sustain: 0.7,
      release: 0.12,
      vol: (n.o?.vol ?? 0.15) * n.vel,
      fm: { ratio: 1, index: 1.2 },
      filter: { type: 'lowpass', freq: 1600, q: 0.7 },
      detune: n.o?.detune,
    }),
  );
}

function triBass(n: NoteCtx): void {
  voice(
    base(n, {
      wave: 'triangle',
      freq: midiHz(n.midi),
      dur: n.dur,
      attack: 0.002,
      decay: 0.08,
      sustain: 0.8,
      release: 0.04,
      vol: (n.o?.vol ?? 0.2) * n.vel,
      detune: n.o?.detune,
    }),
  );
}

function sub(n: NoteCtx): void {
  voice(
    base(n, {
      wave: 'sine',
      freq: midiHz(n.midi),
      dur: n.dur,
      attack: 0.04,
      decay: 0,
      sustain: 1,
      release: 0.4,
      vol: (n.o?.vol ?? 0.14) * n.vel,
      linear: true,
      detune: n.o?.detune,
    }),
  );
}

// ---------------------------------------------------------------------------
// Pads and choir (3.3)

function kRate(p: AudioParam): void {
  try {
    p.automationRate = 'k-rate';
  } catch {
    /* fixed-rate param */
  }
}

/** A handle for voices built from raw nodes (the BGM voice cap can cut them). */
function rawHandle(c: BaseAudioContext, t0: number, end: number, vol: number, osc: OscillatorNode, env: GainNode): VoiceHandle {
  const eg = env.gain;
  return captured({
    start: t0,
    end,
    vol,
    src: osc,
    env,
    freq: osc.frequency,
    detune: osc.detune,
    stop(fade = 0.02, at?: number) {
      const t = Math.max(at ?? c.currentTime, c.currentTime);
      if (t >= end) return;
      try {
        eg.cancelAndHoldAtTime(t);
        if (t <= t0) eg.setValueAtTime(0, t);
        else eg.linearRampToValueAtTime(0, t + Math.max(0.003, fade));
        osc.stop(t + Math.max(0.003, fade) + 0.01);
      } catch {
        /* already stopped */
      }
    },
  });
}

/**
 * The pad's oscillator stack of 3.3 (three saws at −12 / 0 / +12 cents panned
 * −0.4 / 0 / +0.4, plus a square an octave down at 0.3) as one oscillator per
 * note and one shared effect per part:
 *  · a PeriodicWave an octave below the note: the square's odd harmonics and
 *    the saw on the even ones (= the note itself);
 *  · the ensemble below turns that one saw into three: a dry voice in the
 *    middle and two delay lines panned ∓0.7 whose slow drift detunes them by
 *    about ±12 cents — the same shimmer, as a Juno-style chorus.
 * A 4-note pad chord costs 4 oscillators and 4 envelopes instead of 16
 * oscillators, 8 panners and 24 more nodes (15.3).
 */
function padWave(c: BaseAudioContext): PeriodicWave {
  return cachedWave(c, 'pad', () => {
    const N = 96;
    const real = new Float32Array(N);
    const imag = new Float32Array(N);
    // the old stack summed three saws and one 0.3 square: after the ensemble
    // triples the saw, the square keeps its share at 0.3 / √3
    const sq = 0.3 / Math.sqrt(3);
    for (let k = 1; k < N; k++) {
      if (k % 2) imag[k] = (sq * 4) / (Math.PI * k);
      else {
        const m = k / 2;
        imag[k] = ((m % 2 ? 1 : -1) * 2) / (Math.PI * m);
      }
    }
    return { real, imag };
  });
}

/**
 * A stereo ensemble shared by every pad (or choir) note of one destination:
 * dry in the middle, two modulated delay lines at the sides. Power-normalised
 * (three equal voices at 1/√3), so a note should come in at √3 × its old
 * single-saw level. The reverb send is taken from its output.
 */
const ENS: [number, number, number, number][] = [
  // base delay (s), sweep (s), LFO rate (Hz), pan: 2π·rate·sweep ≈ 0.7 % ≈ ±12 cents
  [0.014, 0.0034, 0.33, -0.7],
  [0.021, 0.0028, 0.41, 0.7],
];
const ensembles = new WeakMap<AudioNode, WeakMap<AudioNode, Map<string, GainNode>>>();
function ensemble(c: BaseAudioContext, dest: AudioNode, rev: AudioNode, revLevel: number): GainNode {
  let byRev = ensembles.get(dest);
  if (!byRev) ensembles.set(dest, (byRev = new WeakMap()));
  let m = byRev.get(rev);
  if (!m) byRev.set(rev, (m = new Map()));
  const key = `${Math.round(revLevel * 1000)}`;
  const hit = m.get(key);
  if (hit) return hit;
  const input = c.createGain();
  const out = c.createGain();
  out.connect(dest);
  if (revLevel) {
    const send = c.createGain();
    send.gain.value = revLevel;
    out.connect(send);
    send.connect(rev);
  }
  const w = 1 / Math.sqrt(3);
  const dry = c.createGain();
  dry.gain.value = w;
  input.connect(dry);
  dry.connect(out);
  const links: [AudioNode, AudioNode][] = [];
  for (const [d0, sweep, rate, pan] of ENS) {
    const d = c.createDelay(0.05);
    d.delayTime.value = d0;
    const l = sharedLfo(c, rate);
    const lg = c.createGain();
    lg.gain.value = sweep;
    l.connect(lg);
    lg.connect(d.delayTime);
    links.push([l, lg]);
    const wg = c.createGain();
    wg.gain.value = w;
    const p = c.createStereoPanner();
    p.pan.value = pan;
    input.connect(d);
    d.connect(wg);
    wg.connect(p);
    p.connect(out);
  }
  onRelease(dest, () => {
    for (const [l, g] of links) l.disconnect(g);
    out.disconnect();
  });
  m.set(key, input);
  return input;
}

/** One filter per chord for the reverse pad's sweep (all its notes start and end together). */
const chordFilters = new WeakMap<AudioNode, { key: string; f: BiquadFilterNode; users: number }>();
function chordFilter(c: BaseAudioContext, dest: AudioNode, t0: number, spec: { freq: number; freqEnd: number; time: number; q: number }): { f: BiquadFilterNode; done: () => void } {
  const key = `${t0.toFixed(5)}|${spec.time.toFixed(5)}|${spec.freq}|${spec.freqEnd}|${spec.q}`;
  let e = chordFilters.get(dest);
  if (!e || e.key !== key) {
    const fl = c.createBiquadFilter();
    fl.type = 'lowpass';
    kRate(fl.frequency);
    kRate(fl.Q);
    fl.Q.value = spec.q;
    fl.frequency.setValueAtTime(spec.freq, t0);
    fl.frequency.exponentialRampToValueAtTime(spec.freqEnd, t0 + Math.max(0.01, spec.time));
    fl.connect(dest);
    e = { key, f: fl, users: 0 };
    chordFilters.set(dest, e);
  }
  const entry = e;
  entry.users++;
  return {
    f: entry.f,
    done: () => {
      if (--entry.users <= 0)
        try {
          entry.f.disconnect();
        } catch {
          /* gone */
        }
    },
  };
}

function padStack(
  n: NoteCtx,
  env: { dur: number; attack?: number; release: number; swell?: boolean },
  perVoice: number,
  filter?: { freq: number; freqEnd: number; time: number; q: number },
): void {
  if (!hasGraph()) return;
  const g = cur();
  const c = g.ctx;
  const t0 = startTimeFor(c, n.t, env.dur);
  if (t0 === null) return;
  const f = midiHz(n.midi);
  // the old stack's per-oscillator level, ×√3 into the power-normalised ensemble
  const v = perVoice * n.vel * 0.42 * Math.sqrt(3);
  const atk = Math.max(0.002, env.attack ?? 0.002);
  const rel = Math.max(0.004, env.release);
  const gateEnd = t0 + Math.max(env.dur - (t0 - n.t), env.swell ? 0.001 : atk);
  const end = gateEnd + rel + 0.05;
  const osc = c.createOscillator();
  osc.setPeriodicWave(padWave(c));
  osc.frequency.value = f / 2;
  kRate(osc.detune);
  osc.detune.value = n.o?.detune ?? 0;
  const links: AudioNode[] = [];
  for (const src of [n.det, n.det2])
    if (src) {
      src.connect(osc.detune);
      links.push(src);
    }
  const e = c.createGain();
  const eg = e.gain;
  eg.value = 0;
  eg.setValueAtTime(0, t0);
  if (env.swell) eg.linearRampToValueAtTime(v, gateEnd);
  else {
    eg.linearRampToValueAtTime(v, t0 + atk);
    eg.setValueAtTime(v, gateEnd);
  }
  eg.linearRampToValueAtTime(0, gateEnd + rel);
  osc.connect(e);
  const ens = (globalThis as any).__PF?.noEns ? n.dest : ensemble(c, n.dest, n.rev ?? g.fxSend, n.o?.rev ?? 0.5);
  const cf = filter ? chordFilter(c, ens, t0, filter) : null;
  e.connect(cf ? cf.f : ens);
  osc.start(t0);
  osc.stop(end);
  osc.onended = () => {
    for (const a of links)
      try {
        a.disconnect(osc.detune);
      } catch {
        /* gone */
      }
    try {
      osc.disconnect();
      e.disconnect();
    } catch {
      /* gone */
    }
    cf?.done();
  };
  if (noteLog) noteLog.push({ t: t0, dur: gateEnd - t0, freq: f, vol: v, wave: 'sawtooth' });
  rawHandle(c, t0, end, v, osc, e);
}

function pad(n: NoteCtx): void {
  padStack(n, { dur: n.dur, attack: n.o?.attack ?? 0.6, release: n.o?.release ?? 1.2 }, n.o?.vol ?? 0.035);
}

function padReverse(n: NoteCtx): void {
  padStack(
    n,
    { dur: Math.max(0.05, n.dur - 0.04), swell: true, release: 0.04 },
    n.o?.vol ?? 0.04,
    { freq: 400, freqEnd: 2400, time: n.dur, q: 0.8 },
  );
}

/**
 * ins_choir (3.3): a saw through the 'u' formant bank (325 Hz Q6 ×1.0,
 * 700 Hz Q8 ×0.5, 2530 Hz Q10 ×0.15; children ×1.25) plus a little low body so
 * high notes still carry. The bank is linear and the same for every note, so
 * each destination owns one, feeding the same ensemble as the pads: the two
 * ±7-cent saws of 3.3 become one saw per note and the ensemble's two drifting
 * voices (15.3).
 */
const choirBanks = new WeakMap<AudioNode, Map<string, GainNode>>();
function choirBank(c: BaseAudioContext, ens: AudioNode, k: number): GainNode {
  let m = choirBanks.get(ens);
  if (!m) choirBanks.set(ens, (m = new Map()));
  const key = `${k}`;
  const hit = m.get(key);
  if (hit) return hit;
  const input = c.createGain();
  const bank: [BiquadFilterType, number, number, number][] = [
    ['bandpass', 325 * k, 6, 1.0 * 2.2],
    ['bandpass', 700 * k, 8, 0.5 * 2.2],
    ['bandpass', 2530 * k, 10, 0.15 * 2.2],
    ['lowpass', 800, 0.5, 0.25],
  ];
  for (const [type, ff, q, lvl] of bank) {
    const fl = c.createBiquadFilter();
    fl.type = type;
    fl.frequency.value = ff;
    fl.Q.value = q;
    const gg = c.createGain();
    gg.gain.value = lvl;
    input.connect(fl);
    fl.connect(gg);
    gg.connect(ens);
  }
  m.set(key, input);
  return input;
}

function choir(n: NoteCtx): void {
  if (!hasGraph()) return;
  const g = cur();
  const c = g.ctx;
  const t0 = startTimeFor(c, n.t, n.dur);
  if (t0 === null) return;
  const f = midiHz(n.midi);
  const v = (n.o?.vol ?? 0.05) * n.vel;
  // two incoherent saws at v → one at √2·v, ×√3 into the ensemble
  const vv = v * Math.SQRT2 * Math.sqrt(3);
  const k = n.o?.child ? 1.25 : 1;
  const ens = (globalThis as any).__PF?.noEns ? n.dest : ensemble(c, n.dest, n.rev ?? g.fxSend, n.o?.rev ?? 0.45);
  const bank = choirBank(c, ens, k);
  const atk = 0.3;
  const rel = 0.8;
  const gateEnd = t0 + Math.max(n.dur - (t0 - n.t), atk);
  const end = gateEnd + rel + 0.05;
  // vibrato 5 Hz ±9 cents, fading in after 250 ms
  const vb = vib(n, 5, 9, 0.25);
  const lfo = sharedLfo(c, vb.rate);
  const lg = c.createGain();
  lg.gain.value = 0;
  lg.gain.setValueAtTime(0, t0 + vb.delay);
  lg.gain.linearRampToValueAtTime(vb.depth, t0 + vb.delay + 0.12);
  lfo.connect(lg);
  const o = c.createOscillator();
  o.type = 'sawtooth';
  o.frequency.value = f;
  kRate(o.detune);
  o.detune.value = n.o?.detune ?? 0;
  lg.connect(o.detune);
  if (n.det) n.det.connect(o.detune);
  const env = c.createGain();
  env.gain.value = 0;
  env.gain.setValueAtTime(0, t0);
  env.gain.linearRampToValueAtTime(vv, t0 + atk);
  env.gain.setValueAtTime(vv, gateEnd);
  env.gain.linearRampToValueAtTime(0, gateEnd + rel);
  o.connect(env);
  env.connect(bank);
  o.start(t0);
  o.stop(end);
  o.onended = () => {
    try {
      lfo.disconnect(lg);
    } catch {
      /* gone */
    }
    if (n.det)
      try {
        n.det.disconnect(o.detune);
      } catch {
        /* gone */
      }
    for (const nd of [lg, o, env])
      try {
        nd.disconnect();
      } catch {
        /* gone */
      }
  };
  if (noteLog) noteLog.push({ t: t0, dur: gateEnd - t0, freq: f, vol: v, wave: 'sawtooth' });
  rawHandle(c, t0, end, vv, o, env);
}

export const INS: Record<string, Instrument> = {
  ins_lead_sq50: leadSq50,
  ins_lead_p25: leadP25,
  ins_lead_p12: leadP12,
  ins_lead_boss: leadBoss,
  ins_recorder: recorder,
  ins_musicbox: musicbox,
  ins_fm_epiano: epiano,
  ins_fm_marimba: marimba,
  ins_fm_vibes: (n) => vibes(n),
  // The caller routes `dest` into a PA chain (the SFX bus_pa or a song's own).
  ins_chime: (n) => vibes({ ...n, o: { vol: 0.12, rev: 0, ...n.o } }),
  ins_fm_brass: brass,
  ins_fm_cowbell: cowbell,
  ins_fm_bass: fmBass,
  ins_fm_slap: slap,
  ins_fm_fretless: fretless,
  ins_tri_bass: triBass,
  ins_sub: sub,
  ins_pad: pad,
  ins_pad_reverse: padReverse,
  ins_choir: choir,
};

/** Vibes-through-a-PA chime (used by the title song's own PA chain and SFX). */
export function chimeNote(t: number, midi: number, dest: AudioNode, det: AudioNode, hold = 0.45, vol = 0.12, detune = 0): void {
  vibes({ t, midi, dur: hold, vel: 1, dest, det, o: { vol, hold, detune, rev: 0 } });
}

// ---------------------------------------------------------------------------
// Drums

export interface DrumCtx {
  t: number;
  vel: number;
  dest: AudioNode;
  rev?: AudioNode;
  /** Length for swells (drm_revcym) in seconds. */
  len?: number;
  vol?: number;
  pan?: number;
}
export type Drum = (d: DrumCtx) => void;

const dv = (d: DrumCtx, v: number) => (d.vol ?? v) * d.vel;
const dbase = (d: DrumCtx, extra: VoiceOpts): VoiceOpts => ({ at: d.t, dest: d.dest, revDest: d.rev, pan: d.pan, shareFilter: true, krate: true, drum: true, ...extra });

export const DRM: Record<string, Drum> = {
  drm_kick: (d) => {
    const v = dv(d, 0.3);
    voice(dbase(d, { wave: 'sine', freq: 150, freqEnd: 45, glide: 0.08, dur: 0.01, attack: 0.0008, decay: 0.18, sustain: 0, release: 0.05, vol: v }));
    // a touch of 2nd harmonic so small speakers hear the thump
    voice(dbase(d, { wave: 'triangle', freq: 300, freqEnd: 90, glide: 0.05, dur: 0.01, attack: 0.0008, decay: 0.05, sustain: 0, release: 0.02, vol: v * 0.18 }));
    voice(dbase(d, { wave: 'noise', dur: 0.003, attack: 0.0005, decay: 0.003, sustain: 0, release: 0.003, vol: v * 0.3, filter: { type: 'highpass', freq: 3000 } }));
  },
  drm_kick_soft: (d) => {
    voice(dbase(d, { wave: 'sine', freq: 110, freqEnd: 50, glide: 0.09, dur: 0.01, attack: 0.0008, decay: 0.14, sustain: 0, release: 0.04, vol: dv(d, 0.18) }));
    voice(dbase(d, { wave: 'triangle', freq: 220, freqEnd: 100, glide: 0.05, dur: 0.01, attack: 0.001, decay: 0.04, sustain: 0, release: 0.02, vol: dv(d, 0.18) * 0.12 }));
  },
  drm_snare_brush: (d) => {
    const v = dv(d, 0.1);
    voice(dbase(d, { wave: 'noise', dur: 0.012, attack: 0.012, decay: 0.14, sustain: 0, release: 0.04, vol: v, filter: { type: 'bandpass', freq: 2500, q: 0.7 }, reverb: 0.15 }));
    voice(dbase(d, { wave: 'sine', freq: 190, dur: 0.01, attack: 0.001, decay: 0.06, sustain: 0, release: 0.02, vol: v * 0.3 }));
  },
  drm_snare_tight: (d) => {
    const v = dv(d, 0.14);
    voice(dbase(d, { wave: 'noise', dur: 0.01, attack: 0.0008, decay: 0.09, sustain: 0, release: 0.03, vol: v, filter: { type: 'highpass', freq: 1200 }, reverb: 0.12 }));
    voice(dbase(d, { wave: 'triangle', freq: 220, freqEnd: 160, glide: 0.03, dur: 0.01, attack: 0.0008, decay: 0.05, sustain: 0, release: 0.02, vol: v * 0.4 }));
  },
  drm_snare_march: (d) => {
    const v = dv(d, 0.12);
    voice(dbase(d, { wave: 'noise', dur: 0.01, attack: 0.0008, decay: 0.14, sustain: 0, release: 0.04, vol: v, filter: { type: 'highpass', freq: 1200 }, reverb: 0.15 }));
    voice(dbase(d, { wave: 'noise', dur: 0.01, attack: 0.0008, decay: 0.14, sustain: 0, release: 0.04, vol: v * 0.6, filter: { type: 'bandpass', freq: 3000, q: 0.9 } }));
    voice(dbase(d, { wave: 'triangle', freq: 220, freqEnd: 160, glide: 0.03, dur: 0.01, attack: 0.0008, decay: 0.05, sustain: 0, release: 0.02, vol: v * 0.4 }));
  },
  drm_rim: (d) => {
    const v = dv(d, 0.07);
    voice(dbase(d, { wave: 'sine', freq: 1700, dur: 0.005, attack: 0.0005, decay: 0.012, sustain: 0, release: 0.01, vol: v, reverb: 0.1 }));
    voice(dbase(d, { wave: 'noise', dur: 0.006, attack: 0.0005, decay: 0.006, sustain: 0, release: 0.004, vol: v * 0.6, filter: { type: 'bandpass', freq: 2000, q: 1 } }));
  },
  drm_hat_c: (d) => {
    voice(dbase(d, { wave: 'noise', dur: 0.005, attack: 0.0005, decay: 0.035, sustain: 0, release: 0.01, vol: dv(d, 0.05), filter: { type: 'highpass', freq: 7000 } }));
  },
  drm_hat_o: (d) => {
    // d.len: a longer open hat (the kire-2 layer lets it ring into the downbeat)
    voice(dbase(d, { wave: 'noise', dur: 0.005, attack: 0.0005, decay: d.len ?? 0.22, sustain: 0, release: 0.04, vol: dv(d, 0.045), filter: { type: 'highpass', freq: 7000 } }));
  },
  drm_ride: (d) => {
    const v = dv(d, 0.04);
    voice(dbase(d, { wave: 'noise', dur: 0.005, attack: 0.0005, decay: 0.09, sustain: 0, release: 0.03, vol: v, filter: { type: 'highpass', freq: 8000 }, reverb: 0.1 }));
    voice(dbase(d, { wave: 'sine', freq: 5200, dur: 0.005, attack: 0.0005, decay: 0.12, sustain: 0, release: 0.03, vol: v * 0.1 * 2.5 }));
  },
  drm_shaker: (d) => {
    voice(dbase(d, { wave: 'noise', dur: 0.015, attack: 0.015, decay: 0.06, sustain: 0, release: 0.02, vol: dv(d, 0.035), filter: { type: 'bandpass', freq: 6000, q: 1 } }));
  },
  drm_clap: (d) => {
    const v = dv(d, 0.09);
    const p = d.pan ?? 0;
    // three hands, a little apart in the room
    for (const [off, dec, dp] of [
      [0, 0.012, -0.25],
      [0.012, 0.012, 0.25],
      [0.024, 0.08, 0],
    ])
      voice(dbase(d, { at: d.t + off, pan: p + dp, wave: 'noise', dur: 0.004, attack: 0.0008, decay: dec, sustain: 0, release: 0.01, vol: v, filter: { type: 'bandpass', freq: 1400, q: 1.2 }, reverb: 0.2 }));
  },
  /**
   * The kire-3 clap: a crowd of hands spread wide, lower (1.05 kHz) and
   * longer than the tight snare it lands with, so the backbeat grows instead
   * of the clap vanishing inside the snare.
   */
  drm_clap_big: (d) => {
    const v = dv(d, 0.1);
    const p = d.pan ?? 0;
    for (const [off, dec, dp, f] of [
      [0, 0.01, -0.5, 1150],
      [0.009, 0.01, 0.5, 980],
      [0.019, 0.012, -0.22, 1100],
      [0.031, 0.17, 0.22, 1050],
    ])
      voice(dbase(d, { at: d.t + off, pan: p + dp, wave: 'noise', dur: 0.004, attack: 0.0008, decay: dec, sustain: 0, release: 0.02, vol: v, filter: { type: 'bandpass', freq: f, q: 0.9 }, reverb: 0.45 }));
  },
  drm_tom_low: (d) => {
    const v = dv(d, 0.16);
    voice(dbase(d, { wave: 'sine', freq: 140, freqEnd: 90, glide: 0.12, dur: 0.01, attack: 0.001, decay: 0.2, sustain: 0, release: 0.05, vol: v, reverb: 0.15 }));
    voice(dbase(d, { wave: 'triangle', freq: 280, freqEnd: 180, glide: 0.08, dur: 0.01, attack: 0.001, decay: 0.06, sustain: 0, release: 0.02, vol: v * 0.15 }));
    voice(dbase(d, { wave: 'noise', dur: 0.02, attack: 0.001, decay: 0.02, sustain: 0, release: 0.01, vol: v * 0.3, filter: { type: 'lowpass', freq: 1000 } }));
  },
  drm_crash: (d) => {
    const v = dv(d, 0.06);
    const p = d.pan ?? 0;
    // the wash on both sides (two independent noises), the ring off-centre
    voice(dbase(d, { pan: p - 0.45, wave: 'noise', dur: 0.01, attack: 0.001, decay: 1.2, sustain: 0, release: 0.2, vol: v * 0.72, filter: { type: 'highpass', freq: 4000 }, reverb: 0.25 }));
    voice(dbase(d, { pan: p + 0.45, wave: 'noise', dur: 0.01, attack: 0.001, decay: 1.1, sustain: 0, release: 0.2, vol: v * 0.72, filter: { type: 'highpass', freq: 4300 }, reverb: 0.25 }));
    voice(dbase(d, { pan: p + 0.2, wave: 'noise', dur: 0.01, attack: 0.001, decay: 0.9, sustain: 0, release: 0.2, vol: v * 0.3, filter: { type: 'bandpass', freq: 6000, q: 2 } }));
  },
  drm_revcym: (d) => {
    const len = d.len ?? 0.4;
    voice(dbase(d, { wave: 'noise', dur: len, swell: true, release: 0.02, vol: dv(d, 0.05), filter: { type: 'highpass', freq: 3500 } }));
  },
  drm_tick: (d) => {
    const v = dv(d, 0.03);
    voice(dbase(d, { wave: 'sine', freq: 3200, dur: 0.003, attack: 0.0005, decay: 0.015, sustain: 0, release: 0.008, vol: v, reverb: 0.2 }));
    voice(dbase(d, { wave: 'noise', dur: 0.003, attack: 0.0005, decay: 0.005, sustain: 0, release: 0.003, vol: v * 0.8, filter: { type: 'highpass', freq: 6000 } }));
  },
  drm_tock: (d) => {
    voice(dbase(d, { wave: 'sine', freq: 2400, dur: 0.003, attack: 0.0005, decay: 0.018, sustain: 0, release: 0.008, vol: dv(d, 0.03), reverb: 0.2 }));
  },
  drm_woodblock: (d) => {
    const v = dv(d, 0.07);
    voice(dbase(d, { wave: 'sine', freq: 1200, dur: 0.005, attack: 0.0008, decay: 0.04, sustain: 0, release: 0.01, vol: v, reverb: 0.15 }));
    voice(dbase(d, { wave: 'noise', dur: 0.004, attack: 0.0005, decay: 0.008, sustain: 0, release: 0.004, vol: v * 0.5, filter: { type: 'bandpass', freq: 1600, q: 3 } }));
  },
  drm_triangle: (d) => {
    const v = dv(d, 0.03);
    for (const f of [4200, 6100])
      voice(dbase(d, { wave: 'sine', freq: f, dur: 0.005, attack: 0.001, decay: 0.8, sustain: 0, release: 0.2, vol: v, reverb: 0.3 }));
  },
};

/** drm_brush_swirl: a continuous brushed-snare swirl (loop). Returns stop(). */
export function brushSwirl(t: number, dest: AudioNode, vol = 0.008): (at: number, fade: number) => void {
  const h = voice({
    at: t,
    dest,
    wave: 'noise',
    dur: 3600,
    attack: 0.4,
    decay: 0,
    sustain: 1,
    release: 0.3,
    vol,
    filter: { type: 'lowpass', freq: 3000, q: 0.5 },
    am: { rate: 2, depth: 0.5 },
  });
  return (at, fade) => h.stop(fade, at);
}
