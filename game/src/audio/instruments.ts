// Instrument patches (ins_*) and drums (drm_*) from 40_audio 3.2–3.5.
// Every instrument is a function that schedules one note at an absolute time.
// Music notes pass `det` (the song's pitch bus: stage detune, tape wobble,
// the mid-boss bow) so every oscillator — FM modulators included — follows it.

import { cur, hasGraph, midiHz, noteLog, sharedLfo, voice, type VoiceOpts } from './engine';

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

const base = (n: NoteCtx, extra: VoiceOpts = {}): VoiceOpts => ({
  at: n.t,
  dest: n.dest,
  revDest: n.rev,
  detuneSrc: n.det ?? null,
  detuneSrc2: n.det2 ?? null,
  pan: n.o?.pan,
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
  voice({ ...common, wave: n.o?.wave ?? 'square', vol: v * 0.55 });
  voice({ ...common, wave: 'sawtooth', vol: v * 0.42, detune: (n.o?.detune ?? 0) + 7 });
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
  voice({ ...common, wave: 'triangle', vol: v * 0.7 });
  voice({ ...common, wave: 'sine', vol: v * 0.3 });
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
  const det = (n.o?.detune ?? 0) + (Math.random() * 2 - 1) * 4;
  const common = base(n, {
    dur: 0.005,
    attack: 0.001,
    sustain: 0,
    release: 0.2,
    detune: det,
    reverb: n.o?.rev ?? 0.45,
  });
  voice({ ...common, wave: 'triangle', freq: f, vol: v, decay: 0.9, vibrato: n.o?.vib ? vib(n, 0, 0, 0) : undefined });
  voice({ ...common, wave: 'sine', freq: f * 4, vol: v * 0.18, decay: 0.38 });
  voice({ ...common, wave: 'sine', freq: f * 3, vol: v * 0.06, decay: 0.55 });
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
  voice({ ...common, wave: 'sine', vol: v, fm: { ratio: 1, index: n.o?.index ?? 1.8, indexEnd: n.o?.indexEnd ?? 0.3, indexTime: 1200 } });
  voice({ ...common, wave: 'sine', vol: v * 0.25, decay: 0.5, sustain: 0, fm: { ratio: 14, index: 1.4, indexEnd: 0, indexTime: 60 } });
}

function marimba(n: NoteCtx): void {
  voice(
    base(n, {
      wave: 'sine',
      freq: midiHz(n.midi),
      dur: 0.01,
      attack: 0.001,
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
  voice({ ...common, wave: 'sine', vol: v, fm: { ratio: 4, index: 1.2, indexEnd: 0, indexTime: 150 } });
  voice({ ...common, wave: 'sine', vol: v * 0.5 });
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

/** Pad oscillator stack (3 detuned saws + square an octave down). */
function padStack(n: NoteCtx, env: VoiceOpts, perVoice: number, filter?: VoiceOpts['filter']): void {
  const f = midiHz(n.midi);
  const v = perVoice * n.vel;
  const rev = n.o?.rev ?? 0.5;
  const stack: [number, number, number][] = [
    [-12, -0.4, 0.42],
    [0, 0, 0.42],
    [12, 0.4, 0.42],
  ];
  for (const [det, pan, lvl] of stack)
    voice(base(n, { ...env, wave: 'sawtooth', freq: f, detune: det + (n.o?.detune ?? 0), pan, vol: v * lvl, reverb: rev, filter }));
  voice(base(n, { ...env, wave: 'square', freq: f / 2, vol: v * 0.3 * 0.42, reverb: rev, filter, detune: n.o?.detune }));
}

function pad(n: NoteCtx): void {
  padStack(n, { dur: n.dur, attack: n.o?.attack ?? 0.6, decay: 0, sustain: 1, release: n.o?.release ?? 1.2, linear: true }, n.o?.vol ?? 0.035);
}

function padReverse(n: NoteCtx): void {
  padStack(
    n,
    { dur: Math.max(0.05, n.dur - 0.04), swell: true, release: 0.04 },
    n.o?.vol ?? 0.04,
    { type: 'lowpass', freq: 400, freqEnd: 2400, time: n.dur, q: 0.8 },
  );
}

/**
 * ins_choir (3.3): two saws (±7 cents) through the 'u' formant bank. Built
 * from raw nodes so each note costs 2 oscillators + 1 shared vibrato LFO
 * (a voice() per band would be 16) — the boss chords hold 4 of these.
 */
function choir(n: NoteCtx): void {
  if (!hasGraph()) return;
  const g = cur();
  const c = g.ctx;
  const f = midiHz(n.midi);
  const v = (n.o?.vol ?? 0.05) * n.vel;
  const k = n.o?.child ? 1.25 : 1;
  const t0 = Math.max(n.t, c.currentTime);
  const atk = 0.3;
  const rel = 0.8;
  const gateEnd = t0 + Math.max(n.dur, atk);
  const end = gateEnd + rel + 0.05;
  const nodes: AudioNode[] = [];
  const env = c.createGain();
  env.gain.value = 0;
  env.gain.setValueAtTime(0, t0);
  env.gain.linearRampToValueAtTime(1, t0 + atk);
  env.gain.setValueAtTime(1, gateEnd);
  env.gain.linearRampToValueAtTime(0, gateEnd + rel);
  env.connect(n.dest);
  const send = c.createGain();
  send.gain.value = n.o?.rev ?? 0.45;
  env.connect(send);
  send.connect(n.rev ?? g.fxSend);
  nodes.push(env, send);
  // vibrato 5 Hz ±9 cents, fading in after 250 ms, shared by both saws
  const vb = vib(n, 5, 9, 0.25);
  const lfo = sharedLfo(c, vb.rate);
  const lg = c.createGain();
  lg.gain.value = 0;
  lg.gain.setValueAtTime(0, t0 + vb.delay);
  lg.gain.linearRampToValueAtTime(vb.depth, t0 + vb.delay + 0.12);
  lfo.connect(lg);
  nodes.push(lg);
  const oscs: OscillatorNode[] = [];
  const links: [AudioNode, AudioParam][] = [];
  const bank: [BiquadFilterType, number, number, number][] = [
    ['bandpass', 325 * k, 6, 1.0 * 2.2],
    ['bandpass', 700 * k, 8, 0.5 * 2.2],
    ['bandpass', 2530 * k, 10, 0.15 * 2.2],
    // a little low body so high notes still carry
    ['lowpass', Math.max(700, f * 1.6), 0.5, 0.25],
  ];
  for (const det of [-7, 7]) {
    const o = c.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = f;
    o.detune.value = det + (n.o?.detune ?? 0);
    lg.connect(o.detune);
    if (n.det) {
      n.det.connect(o.detune);
      links.push([n.det, o.detune]);
    }
    const pan = c.createStereoPanner();
    pan.pan.value = det < 0 ? -0.2 : 0.2;
    pan.connect(env);
    nodes.push(o, pan);
    for (const [type, ff, q, lvl] of bank) {
      const fl = c.createBiquadFilter();
      fl.type = type;
      fl.frequency.value = ff;
      fl.Q.value = q;
      const gg = c.createGain();
      gg.gain.value = v * lvl;
      o.connect(fl);
      fl.connect(gg);
      gg.connect(pan);
      nodes.push(fl, gg);
    }
    oscs.push(o);
  }
  for (const o of oscs) {
    o.start(t0);
    o.stop(end);
  }
  oscs[0].onended = () => {
    try {
      lfo.disconnect(lg);
    } catch {
      /* gone */
    }
    for (const [a, p] of links)
      try {
        a.disconnect(p);
      } catch {
        /* gone */
      }
    for (const nd of nodes)
      try {
        nd.disconnect();
      } catch {
        /* gone */
      }
  };
  if (noteLog) noteLog.push({ t: t0, dur: gateEnd - t0, freq: f, vol: v, wave: 'sawtooth' });
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
const dbase = (d: DrumCtx, extra: VoiceOpts): VoiceOpts => ({ at: d.t, dest: d.dest, revDest: d.rev, pan: d.pan, ...extra });

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
    voice(dbase(d, { wave: 'noise', dur: 0.005, attack: 0.0005, decay: 0.22, sustain: 0, release: 0.04, vol: dv(d, 0.045), filter: { type: 'highpass', freq: 7000 } }));
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
    for (const [off, dec] of [
      [0, 0.012],
      [0.012, 0.012],
      [0.024, 0.08],
    ])
      voice(dbase(d, { at: d.t + off, wave: 'noise', dur: 0.004, attack: 0.0008, decay: dec, sustain: 0, release: 0.01, vol: v, filter: { type: 'bandpass', freq: 1400, q: 1.2 }, reverb: 0.2 }));
  },
  drm_tom_low: (d) => {
    const v = dv(d, 0.16);
    voice(dbase(d, { wave: 'sine', freq: 140, freqEnd: 90, glide: 0.12, dur: 0.01, attack: 0.001, decay: 0.2, sustain: 0, release: 0.05, vol: v, reverb: 0.15 }));
    voice(dbase(d, { wave: 'triangle', freq: 280, freqEnd: 180, glide: 0.08, dur: 0.01, attack: 0.001, decay: 0.06, sustain: 0, release: 0.02, vol: v * 0.15 }));
    voice(dbase(d, { wave: 'noise', dur: 0.02, attack: 0.001, decay: 0.02, sustain: 0, release: 0.01, vol: v * 0.3, filter: { type: 'lowpass', freq: 1000 } }));
  },
  drm_crash: (d) => {
    const v = dv(d, 0.06);
    voice(dbase(d, { wave: 'noise', dur: 0.01, attack: 0.001, decay: 1.2, sustain: 0, release: 0.2, vol: v, filter: { type: 'highpass', freq: 4000 }, reverb: 0.25 }));
    voice(dbase(d, { wave: 'noise', dur: 0.01, attack: 0.001, decay: 0.9, sustain: 0, release: 0.2, vol: v * 0.3, filter: { type: 'bandpass', freq: 6000, q: 2 } }));
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
