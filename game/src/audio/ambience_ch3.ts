// Chapter 3 ambience, first period (63_ch3_audio 7): 海ぞいの町 at noon, the
// truck bed on the way there and 夕鳴町 before noon on 9月1日.
//
// 12:00 (c3_noon 0) the town is stopped, and that is heard as fewer sounds,
// never as a dark one (10.2): the sea is a mirror (a far swell under
// everything, a 「ちゃぷ」 now and then, no breaking waves), the gulls and the
// kite hang silent in the air, the cicadas start and stop short, the moored
// boats do not creak, and far off the siren hangs just short of its top
// (amb_c3_siren_hold — the sound ツガオ's room let us hear at the end of
// chapter 2, now the real one through the tower's speaker). From 12:01
// (c3_noon 1) everything goes on: waves → birds → cicadas → the market, 4 s
// apart (the S12 cue lifts them in that order; a bed that starts at 12:01 is
// simply whole).
//
// What is written here is what a harbour like this one sounds like (1.6):
// gulls (「ミャーオ」) and a black kite (「ピーヒョロロ」), ツクツクボウシ at the
// end of summer with アブラゼミ and ミンミンゼミ (no ヒグラシ at noon: that is
// the evening's and the dawn's insect), a small diesel boat's 「トトトト」 (no
// hot-bulb 「ポンポン」), the fenders' 「ギュッ」, a market whose auction was in
// the morning (12:00: only ゲン's frozen voice and the melting ice).
//
// The town's voices inside the beds (ゲン, the children, the dried-fish
// couple) are small blips of their own voices (9.1) played into the bed,
// never words (1.7).

import { cur, hasGraph, PaChain, voice, type VoiceOpts, type Wave } from './engine';
import { DRM, sirenNote } from './instruments';
import { c3ParamListeners, currentId, musicParams } from './music';
import { sfxTable } from './registry';
import { layer, seDefs, type SeCtx } from './recipe';
import { activeAmbients, Every, modBuffer, modulate, noiseBed, registerAmbience, smoothRandom, toneBed, type AmbCtx } from './ambience';

// ---------------------------------------------------------------------------
// helpers

const v = (c: AmbCtx, o: VoiceOpts, dest: AudioNode = c.dest): void => {
  voice({ dest, ...o });
};

function sub(c: AmbCtx, level = 1, dest: AudioNode = c.dest): GainNode {
  const g = c.g.ctx.createGain();
  g.gain.value = level;
  g.connect(dest);
  return g;
}

function lowpass(c: AmbCtx, hz: number, dest: AudioNode = c.dest): BiquadFilterNode {
  const f = c.g.ctx.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = hz;
  f.Q.value = 0.7;
  f.connect(dest);
  return f;
}

function setLevel(p: AudioParam, to: number, at: number, secs = 0.8): void {
  p.cancelScheduledValues(at);
  p.setValueAtTime(p.value, at);
  p.linearRampToValueAtTime(to, at + Math.max(0.01, secs));
}

/**
 * An SE recipe played inside a bed: the recipe as designed (no SE fader — the
 * bed's own trim applies), panned, into the bed.
 */
function seIn(c: AmbCtx, id: string, t: number, vol: number, dest: AudioNode = c.dest, pan?: number, level?: number): void {
  const d = seDefs.get(id);
  if (!d) return;
  let out = dest;
  if (pan) {
    const p = c.g.ctx.createStereoPanner();
    p.pan.value = Math.max(-1, Math.min(1, pan));
    p.connect(dest);
    out = p;
    setTimeout(() => p.disconnect(), Math.max(0, t - c.g.ctx.currentTime + 4) * 1000);
  }
  const sc: SeCtx = { t, pitch: 1, vol, dest: out, rev: d.rev ?? 0, opts: { level } };
  if (d.layers) for (const l of d.layers) layer(sc, l);
  d.fn?.(sc);
}

/**
 * The beds that hear the chapter-3 params (c3_noon, the three 「まだ」): each
 * live instance registers here and drops out when it stops. A parked bed
 * comes back as a new take and reads the params afresh.
 */
type C3Hook = (name: string, value: number, at: number) => void;
const c3Hooks = new Set<C3Hook>();
c3ParamListeners.push((name, value) => {
  // (before the first touch there is no AudioContext and no bed to tell)
  if (!c3Hooks.size || !hasGraph()) return;
  const at = cur().ctx.currentTime + 0.02;
  // S12 (10.2, 12.10): 12:01 comes while the music is silent (the battle's
  // final phase) — the town comes back in order, 4 s apart: the waves, the
  // birds (the first gull's call), the cicadas, the market. Anywhere else (a
  // load) it is simply whole.
  if (name === 'c3_noon' && value === 1 && (staggerNext || currentId() === null || currentId() === 'bgm_boss_nariosame')) {
    staggerNext = false;
    noonFrom = at;
    if (activeAmbients().some((id) => id.startsWith('amb_c3_'))) sfxTable.get('se_c3_kamome')?.({ at: at + NOON_LAG.tori, vol: 0.6, pan: -0.3 });
  }
  for (const h of [...c3Hooks]) h(name, value, at);
});
function onC3(h: C3Hook): () => void {
  c3Hooks.add(h);
  return () => c3Hooks.delete(h);
}
/** 12:01 returns in this order (10.2): seconds after the clock moves. */
const NOON_LAG = { umi: 0, tori: 4, semi: 8, ichiba: 12 };
let noonFrom = -Infinity;
let staggerNext = false;
/** The next c3_noon 0 → 1 brings the town back in order (index.ts c3Noon1201). */
export function c3NoonStagger(): void {
  staggerNext = true;
}
/** Is it 12:01 for this part of the town yet? */
const noonNow = (grp: keyof typeof NOON_LAG = 'umi'): boolean => musicParams().c3_noon === 1 && (!hasGraph() || cur().ctx.currentTime >= noonFrom + NOON_LAG[grp]);

/** A voice of the town said into a bed: one blip per entry (semitones from the base), `gap` s apart. */
interface BlipVoice {
  wave: Wave;
  base: number;
  len: number;
  lp?: number;
  wave2?: [Wave, number];
}
const SERI: BlipVoice = { wave: 'pulse25', base: 59, len: 0.026, lp: 2400 };
const KID: BlipVoice = { wave: 'square', base: 81, len: 0.02 };
const KID_YUNARI: BlipVoice = { wave: 'square', base: 79, len: 0.02 };
const HIMONO_OTTO: BlipVoice = { wave: 'sawtooth', base: 57, len: 0.03, lp: 1600 };
const HIMONO_TSUMA: BlipVoice = { wave: 'sawtooth', base: 69, len: 0.03, lp: 2000 };
function blips(c: AmbCtx, t: number, bv: BlipVoice, semis: (number | null)[], gap: number, vol: number, dest: AudioNode = c.dest, cutLast = false): number {
  let x = t;
  semis.forEach((s, i) => {
    if (s !== null) {
      const last = cutLast && i === semis.length - 1;
      const f = 440 * Math.pow(2, (bv.base + s - 69) / 12);
      const o: VoiceOpts = {
        at: x,
        wave: bv.wave,
        freq: f,
        dur: last ? bv.len * 0.6 : bv.len,
        attack: 0.002,
        decay: 0.018,
        sustain: 0.45,
        release: last ? 0.001 : 0.01,
        vol,
        filter: bv.lp ? { type: 'lowpass', freq: bv.lp } : undefined,
      };
      v(c, o, dest);
    }
    x += gap;
  });
  return x;
}

/** The far swell of a sea with no waves: a low noise floor, slowly breathing (0.05 Hz). */
function swellFloor(c: AmbCtx, vol: number, dest: AudioNode = c.dest): { stop(t: number): void } {
  const bed = noiseBed(c, 'lowpass', 180, 0.5, vol * 0.6, dest);
  const m = modulate(c.g, c.t0, modBuffer(c.g, 20, (t) => Math.sin(t * Math.PI * 2 * 0.05)), bed.gain.gain, vol * 0.4);
  return {
    stop(t) {
      bed.stop(t);
      m.stop(t);
    },
  };
}

/** The water moving a little under the quay「ちゃぷ」. */
function chapu(c: AmbCtx, t: number, vol: number, dest: AudioNode = c.dest, pan = 0): void {
  v(c, { at: t, wave: 'sine', freq: 380, freqEnd: 260, glide: 0.04, dur: 0.04, attack: 0.002, decay: 0.03, sustain: 0, release: 0.02, vol, pan }, dest);
  v(c, { at: t, wave: 'noise', dur: 0.03, attack: 0.002, decay: 0.03, sustain: 0, release: 0.02, vol: vol * 0.8, filter: { type: 'bandpass', freq: 900, q: 1 }, pan }, dest);
}

/** One wave on the beach: the push「ざっ」(LP 300 → 1600 Hz in 0.4 s) and the sand drawn back「さー」(2.5 s). */
function beachWave(c: AmbCtx, t: number, vol: number, dest: AudioNode = c.dest, cut = false): void {
  v(c, { at: t, wave: 'noise', dur: 0.4, attack: 0.4, decay: 0.3, sustain: 0.4, release: 0.3, vol, filter: { type: 'lowpass', freq: 300, freqEnd: 1600, time: 0.4, q: 0.6 } }, dest);
  if (cut) return;
  v(c, { at: t + 0.45, wave: 'noise', dur: 2.2, attack: 0.15, decay: 2.2, sustain: 0, release: 0.3, vol: vol * 0.7, filter: { type: 'lowpass', freq: 1600, freqEnd: 400, time: 2.5, q: 0.5 } }, dest);
  v(c, { at: t + 0.5, wave: 'noise', dur: 1.8, attack: 0.2, decay: 1.6, sustain: 0, release: 0.3, vol: vol * 0.25, filter: { type: 'highpass', freq: 3500 }, am: { rate: 40, depth: 0.3 } }, dest);
}

// ---- the cicadas (7.1 amb_c3_semi; amb_c3_hirumae borrows ツクツクボウシ)

/**
 * ツクツクボウシ「オーシツクツク」: 「ジー」(5.2 kHz, 13 Hz AM, 0.8 s) → 「オーシ」
 * (4.3 → 5.0 kHz, 0.25 s) → 「ツクツク」(5.4 kHz pulses, 90 ms every 140 ms,
 * 6–10 times) → 「ジーッ」(0.6 s, fading). `stopShort`: 12:00 — it starts and
 * stops at 「オーシ」.
 */
function tsukutsuku(c: AmbCtx, t: number, vol: number, pan: number, dest: AudioNode, stopShort: boolean): number {
  v(c, { at: t, wave: 'sine', freq: 5200, dur: 0.8, attack: 0.15, decay: 0.1, sustain: 0.8, release: 0.08, vol, am: { rate: 13, depth: 0.9 }, pan }, dest);
  let x = t + 0.85;
  v(c, { at: x, wave: 'sine', freq: 4300, freqEnd: 5000, glide: 0.25, dur: 0.25, attack: 0.02, decay: 0.05, sustain: 0.9, release: 0.05, vol, pan }, dest);
  x += 0.3;
  if (stopShort) return x;
  const n = 6 + Math.floor(c.rng.range(0, 5));
  for (let i = 0; i < n; i++) v(c, { at: x + i * 0.14, wave: 'sine', freq: 5400, freqEnd: 5000, glide: 0.09, dur: 0.07, attack: 0.008, decay: 0.03, sustain: 0.7, release: 0.02, vol, pan }, dest);
  x += n * 0.14 + 0.05;
  v(c, { at: x, wave: 'sine', freq: 5200, dur: 0.6, attack: 0.02, decay: 0.6, sustain: 0.2, release: 0.1, vol: vol * 0.8, am: { rate: 13, depth: 0.9 }, pan }, dest);
  return x + 0.7;
}

// ---------------------------------------------------------------------------
// 7.1 海と生きもの

/**
 * amb_c3_umi — the sea. 12:00: ① the far swell's floor ② a 「ちゃぷ」 under the
 * quay every 12–25 s, no breaking waves; ambientEvent('amb_c3_umi',
 * 'wave_on', n) (S09's lens, n = 1–3) starts the beach's waves at n/3.
 * 12:01: ④ the beach's waves every 7–9 s (rising over 4 s), ⑥ the
 * 「ちゃぷちゃぷ」 every 3–6 s. ambientEvent(…, 'yose'): one wave pushes in and
 * does not draw back — its 「さー」 cut after 80 ms (S00, the chapter's door).
 */
registerAmbience('amb_c3_umi', (c) => {
  const floor = swellFloor(c, 0.004);
  const waveDest = sub(c, noonNow() ? 1 : 0);
  let waves = noonNow() ? 1 : 0;
  const lap = new Every(c, 12, 25, (t) => {
    if (noonNow()) return;
    chapu(c, t, 0.003, c.dest, c.rng.range(-0.4, 0.4));
  }, 2, 12);
  const lap2 = new Every(c, 3, 6, (t) => {
    if (!noonNow()) return;
    chapu(c, t, 0.003, c.dest, c.rng.range(-0.5, 0.5));
  }, 0.5, 4);
  const beach = new Every(c, 7, 9, (t) => {
    if (waves > 0) beachWave(c, t, 0.012, waveDest);
  }, 0.3, 3);
  const off = onC3((name, value, at) => {
    if (name !== 'c3_noon') return;
    waves = value === 1 ? 1 : 0;
    setLevel(waveDest.gain, waves, at, value === 1 ? 4 : 0.5);
  });
  return {
    pump(u) {
      lap.pump(u);
      lap2.pump(u);
      beach.pump(u);
    },
    event(name, arg, at) {
      if (name === 'wave_on') {
        const n = Math.max(0, Math.min(3, Number(arg) || 0));
        waves = Math.max(waves, n / 3);
        setLevel(waveDest.gain, waves, at, 2);
      } else if (name === 'yose') {
        // a wave comes in once and does not go out (the stopped town, ahead)
        beachWave(c, at, 0.014, c.dest, true);
      }
    },
    stop(t) {
      floor.stop(t);
      off();
    },
  };
});

/**
 * amb_c3_semi — 9月1日's cicadas at noon: ① ツクツクボウシ, one at a time,
 * every 20–40 s; ② アブラゼミ ×2 「ジリジリ」 15–30 s on, 5–15 off; ③
 * ミンミンゼミ now and then. 12:00: ① stops at 「オーシ」, ②③ are cut after 2 s
 * and try again 10–20 s later (the cicadas are 「まだ」 too). 12:01: all whole.
 */
registerAmbience('amb_c3_semi', (c) => {
  const grp = 'semi';
  const tsuku = new Every(c, 20, 40, (t) => tsukutsuku(c, t, 0.006, c.rng.range(-0.6, 0.6), c.dest, !noonNow(grp)), 1, 12);
  const abura = [-0.5, 0.45].map((pan) => {
    let next = c.t0 + c.rng.range(1, 10);
    return {
      pump(u: number) {
        let guard = 0;
        while (next < u && guard++ < 8) {
          const t = Math.max(next, c.g.ctx.currentTime);
          const whole = noonNow(grp);
          const len = whole ? c.rng.range(15, 30) : 2;
          v(c, { at: t, wave: 'noise', dur: len, attack: whole ? 1.2 : 0.4, decay: 0, sustain: 1, release: whole ? 1.5 : 0.05, vol: 0.004, filter: { type: 'bandpass', freq: 4800, q: 1.2 }, am: { rate: c.rng.range(60, 90), depth: 0.7 }, pan });
          next = t + len + (whole ? c.rng.range(5, 15) : c.rng.range(10, 20));
        }
      },
    };
  });
  const minmin = new Every(c, 25, 50, (t) => {
    const whole = noonNow(grp);
    const len = whole ? 3.2 : 2;
    v(c, { at: t, wave: 'sine', freq: 3400, dur: len, attack: 0.3, decay: 0, sustain: 1, release: whole ? 0.4 : 0.05, vol: 0.003, vibrato: { rate: 4, depth: 100 }, pan: c.rng.range(-0.5, 0.5) });
  }, 4, 20);
  return {
    pump(u) {
      tsuku.pump(u);
      for (const a of abura) a.pump(u);
      minmin.pump(u);
    },
    stop() {},
  };
});

/**
 * amb_c3_tori — the harbour's birds: ① gulls 「ミャーオ」, 2–4 of them every
 * 8–20 s (sometimes two in a row); ② a black kite far up, every 30–60 s.
 * 12:00: silent — the birds hang still in the air (and no wingbeats either).
 * 12:01: they call again.
 */
registerAmbience('amb_c3_tori', (c) => {
  const grp = 'tori';
  const gull = new Every(c, 8, 20, (t) => {
    if (noonNow(grp) !== true) return;
    const pan = c.rng.range(-0.7, 0.7);
    seIn(c, 'se_c3_kamome', t, 0.6 * c.rng.range(0.7, 1), c.dest, pan);
    if (c.rng.chance(0.35)) seIn(c, 'se_c3_kamome', t + c.rng.range(0.6, 1.1), 0.45, c.dest, pan + c.rng.range(-0.3, 0.3));
  }, 1, 8);
  const tonbi = new Every(c, 30, 60, (t) => {
    if (noonNow(grp) !== true) return;
    seIn(c, 'se_c3_tonbi', t, 0.5, c.dest, c.rng.range(-0.5, 0.5));
  }, 6, 30);
  return {
    pump(u) {
      gull.pump(u);
      tonbi.pump(u);
    },
    stop() {},
  };
});

/** amb_c3_mikan — the terraced mandarin orchard: the leaves, a lizard in the stone wall now and then. */
registerAmbience('amb_c3_mikan', (c) => {
  const leaves = noiseBed(c, 'bandpass', 3000, 0.8, 0.003);
  const lizard = new Every(c, 15, 30, (t) => v(c, { at: t, wave: 'noise', dur: 0.006, attack: 0.001, decay: 0.006, sustain: 0, release: 0.004, vol: 0.002, filter: { type: 'highpass', freq: 5000 }, pan: c.rng.range(-0.6, 0.6) }), 3, 15);
  return {
    pump: (u) => lizard.pump(u),
    stop(t) {
      leaves.stop(t);
    },
  };
});

// ---------------------------------------------------------------------------
// 7.2 町の場所

/**
 * amb_c3_minato — the moored boats and the quay. 12:00: only the water at a
 * boat's side, every 20–30 s (the boats are stopped too). 12:01: ① the
 * fenders' 「ギュッ」 every 6–14 s ② a mooring line creaking every 10–20 s ③
 * the water at the boats' sides, and far off a small diesel boat's 「トトトト」
 * passing by (10 s) every 30–60 s.
 */
registerAmbience('amb_c3_minato', (c) => {
  const side = new Every(c, 6, 14, (t) => {
    if (noonNow()) chapu(c, t, 0.003, c.dest, c.rng.range(-0.5, 0.5));
  }, 1, 6);
  const sideNoon = new Every(c, 20, 30, (t) => {
    if (!noonNow()) chapu(c, t, 0.0025, c.dest, c.rng.range(-0.5, 0.5));
  }, 3, 20);
  const fender = new Every(c, 6, 14, (t) => {
    if (noonNow()) seIn(c, 'se_c3_fender', t, 0.5, c.dest, c.rng.range(-0.5, 0.5));
  }, 2, 8);
  const rope = new Every(c, 10, 20, (t) => {
    if (noonNow()) v(c, { at: t, wave: 'sine', freq: 300, freqEnd: 280, glide: 0.3, dur: 0.3, attack: 0.05, decay: 0.2, sustain: 0.5, release: 0.08, vol: 0.002, pan: c.rng.range(-0.4, 0.4) });
  }, 4, 12);
  const diesel = new Every(c, 30, 60, (t) => {
    if (!noonNow()) return;
    const from = c.rng.chance(0.5) ? -0.8 : 0.8;
    v(c, { at: t, wave: 'sawtooth', freq: 65, dur: 10, attack: 3.5, decay: 0, sustain: 1, release: 3.5, vol: 0.003, filter: { type: 'lowpass', freq: 400 }, am: { rate: 9, depth: 0.6 }, pan: from, panEnd: -from });
  }, 8, 30);
  return {
    pump(u) {
      side.pump(u);
      sideNoon.pump(u);
      fender.pump(u);
      rope.pump(u);
      diesel.pump(u);
    },
    stop() {},
  };
});

/**
 * amb_c3_ichiba — the auction hall, the morning's last crate still on the
 * floor at noon. Not undone yet (c3_ichiba 0): ① the air under the big roof
 * ② ice melting under the fish crates (se_drip) ③ ゲン's frozen voice every
 * 15 s — 「……はい、ひゃくえん、ひゃく……」, the last 「く」 cut short (9.2); no
 * crowd (everyone is stopped). ambientEvent(…, 'gen_loop') says it now.
 * Undone (c3_ichiba 1): ④ the crowd's murmur with far voices ⑤ crates
 * stacked ⑥ a hose washing the floor; from 12:01 あぜ道市 thickens ④
 * (c3_ichi ×1.0 / 1.3 / 1.6).
 */
function ichibaBed(c: AmbCtx, out: AudioNode): { pump(u: number): void; event(name: string, at: number): void; stop(t: number): void } {
  const air = noiseBed(c, 'lowpass', 600, 0.5, 0.004, out);
  const crowdDest = sub(c, musicParams().c3_ichiba === 1 ? 1 : 0, out);
  const crowd = noiseBed(c, 'bandpass', 900, 0.6, 0.004, crowdDest);
  const crowdAm = modulate(c.g, c.t0, modBuffer(c.g, 30, smoothRandom(c.rng, 3, 6)), crowd.gain.gain, 0.002);
  let done = musicParams().c3_ichiba === 1;
  const ichiK = () => [1, 1.3, 1.6, 1.6][Math.max(0, Math.min(3, musicParams().c3_ichi))];
  const gen = (t: number) => {
    // は い … ひゃ く え ん … ひゃ く(cut): 「ひゃく」 is always 0 +2 (the auctioneer's fixed turn)
    blips(c, t, SERI, [0, 4, null, 0, 2, 5, 4, null, 0, 2], 0.065, 0.006, out, true);
  };
  const drip = new Every(c, 5, 12, (t) => seIn(c, 'se_drip', t, 0.3, out, c.rng.range(-0.5, 0.5)), 1, 6);
  const genEvery = new Every(c, 15, 15, (t) => {
    if (!done) gen(t);
  }, 1.5, 3);
  const voices = new Every(c, 3, 7, (t) => {
    if (!done) return;
    const k = ichiK();
    const n = 2 + Math.floor(c.rng.range(0, 4));
    blips(c, t, c.rng.chance(0.5) ? SERI : { ...SERI, base: 73, wave: 'sine' }, Array.from({ length: n }, () => [0, 2, 4, 5, 7][Math.floor(c.rng.range(0, 5))]), 0.06, 0.0012 * k, out);
  }, 1, 4);
  const crates = new Every(c, 10, 25, (t) => {
    if (done) seIn(c, 'se_c3_torobako', t, 0.4, out, c.rng.range(-0.6, 0.6));
  }, 3, 10);
  const hose = new Every(c, 30, 60, (t) => {
    if (done) v(c, { at: t, wave: 'noise', dur: 4, attack: 0.3, decay: 0, sustain: 1, release: 0.6, vol: 0.003, filter: { type: 'bandpass', freq: 2500, q: 0.5 }, pan: c.rng.range(-0.5, 0.5) }, out);
  }, 8, 30);
  const off = onC3((name, value, at) => {
    if (name === 'c3_ichiba') {
      done = value === 1;
      setLevel(crowdDest.gain, done ? ichiK() : 0, at, 2);
    } else if (name === 'c3_ichi' && done) setLevel(crowdDest.gain, ichiK(), at, 2);
  });
  return {
    pump(u) {
      drip.pump(u);
      genEvery.pump(u);
      voices.pump(u);
      crates.pump(u);
      hose.pump(u);
    },
    event(name, at) {
      if (name === 'gen_loop' && !done) gen(at);
    },
    stop(t) {
      air.stop(t);
      crowd.stop(t);
      crowdAm.stop(t);
      off();
    },
  };
}
registerAmbience('amb_c3_ichiba', (c) => {
  const b = ichibaBed(c, c.dest);
  return { pump: (u) => b.pump(u), event: (n, _p, at) => b.event(n, at), stop: (t) => b.stop(t) };
});
/** amb_c3_ichiba_out — the market's sounds leaking onto the street (LP 1.5 kHz, ×.4). */
registerAmbience('amb_c3_ichiba_out', (c) => {
  const b = ichibaBed(c, lowpass(c, 1500, sub(c, 0.4)));
  return { pump: (u) => b.pump(u), event: (n, _p, at) => b.event(n, at), stop: (t) => b.stop(t) };
});

/**
 * amb_c3_shokudo — 食堂かもめ at lunchtime: ① the extractor fan ② the pot
 * simmering ③ ゴロウ putting his bowl down every 30–40 s (12:00: the 40th
 * bowl that never ends) ⑤ chopsticks and rice bowls. After オカワリナベ
 * (c3_shokudo 1) ②③ stop: one last bowl, then quiet (the noren is down).
 */
function shokudoBed(c: AmbCtx, out: AudioNode, withBowls: boolean): { pump(u: number): void; stop(t: number): void } {
  const fan = noiseBed(c, 'lowpass', 400, 0.5, 0.004, out);
  const fanHum = toneBed(c, 'sine', 90, 0.002, out);
  const potDest = sub(c, musicParams().c3_shokudo === 1 ? 0 : 1, out);
  const pot = noiseBed(c, 'lowpass', 700, 0.5, 0.002, potDest);
  const potAm = modulate(c.g, c.t0, modBuffer(c.g, 12, (t) => (Math.floor(t * 8) % 2 ? 1 : -1) * (0.6 + 0.4 * Math.sin(t * 3.1))), pot.gain.gain, 0.002);
  let closed = musicParams().c3_shokudo === 1;
  const bowl = new Every(c, 30, 40, (t) => {
    if (!closed && withBowls) seIn(c, 'se_c3_donburi', t, 0.5, out, 0.2);
  }, 6, 20);
  const hashi = new Every(c, 2, 6, (t) => {
    if (!closed && withBowls) v(c, { at: t, wave: 'sine', freq: 2600 * c.rng.range(0.95, 1.08), dur: 0.008, attack: 0.001, decay: 0.012, sustain: 0, release: 0.006, vol: 0.002, pan: c.rng.range(-0.5, 0.5) }, out);
  }, 0.5, 3);
  const off = onC3((name, value, at) => {
    if (name !== 'c3_shokudo') return;
    closed = value === 1;
    setLevel(potDest.gain, closed ? 0 : 1, at, 1.5);
    if (closed && withBowls) seIn(c, 'se_c3_donburi', at + 0.3, 0.4, out, 0.2);
  });
  return {
    pump(u) {
      bowl.pump(u);
      hashi.pump(u);
    },
    stop(t) {
      fan.stop(t);
      fanHum.stop(t);
      pot.stop(t);
      potAm.stop(t);
      off();
    },
  };
}
registerAmbience('amb_c3_shokudo', (c) => shokudoBed(c, c.dest, true));
/** amb_c3_shokudo_out — the fan's exhaust and the broth on the street (①② at LP 1.2 kHz, ×.5); stops at 12:01. */
registerAmbience('amb_c3_shokudo_out', (c) => {
  const lvl = sub(c, noonNow() ? 0 : 0.5);
  const b = shokudoBed(c, lowpass(c, 1200, lvl), false);
  const off = onC3((name, value, at) => {
    if (name === 'c3_noon') setLevel(lvl.gain, value === 1 ? 0 : 0.5, at, 2);
  });
  return {
    pump: (u) => b.pump(u),
    stop(t) {
      b.stop(t);
      off();
    },
  };
});

/**
 * amb_c3_himono — the dried-fish alley: ① the drying nets swaying (0.3 Hz)
 * ② ホシオ and ホシミ arguing every 20–30 s: their blips by turns, three each,
 * on the same shape 0 +3 +5 +3 +5 — he an octave under her (「干しすぎ！」
 * 「干したりない！」, 9.2); ambientEvent(…, 'iiai') says it now (with the
 * bubble). 12:00: the fish rattle dry (se_c3_himono level 1) every 40 s.
 */
registerAmbience('amb_c3_himono', (c) => {
  const net = noiseBed(c, 'bandpass', 2200, 1.0, 0.0012);
  const netM = modulate(c.g, c.t0, modBuffer(c.g, 10, (t) => Math.sin(t * Math.PI * 2 * 0.3)), net.gain.gain, 0.0008);
  const shape = [0, 3, 5, 3, 5];
  const iiai = (t: number) => {
    let x = t;
    for (let i = 0; i < 6; i++) {
      x = blips(c, x, i % 2 ? HIMONO_TSUMA : HIMONO_OTTO, shape, 0.07, 0.004, c.dest);
      // 食いぎみ: no gap between them
      x += 0.05;
    }
  };
  const talk = new Every(c, 20, 30, iiai, 3, 12);
  const rattle = new Every(c, 40, 40, (t) => {
    if (!noonNow()) seIn(c, 'se_c3_himono', t, 0.3, c.dest, 0.3, 1);
  }, 5, 20);
  return {
    pump(u) {
      talk.pump(u);
      rattle.pump(u);
    },
    event(name, _p, at) {
      if (name === 'iiai') iiai(at);
    },
    stop(t) {
      net.stop(t);
      netM.stop(t);
    },
  };
});

/**
 * amb_c3_bouhatei — on the breakwater: ① the sea wind in gusts (0.1–0.3 Hz)
 * ② ツリノ's rod bells every 40–90 s (12:00: silent, the fish are stopped
 * too) ③ from 12:01 the waves hitting the breakwater 「どぷん」 every 6–11 s
 * (amb_c3_umi's ⑤, heard here where it happens).
 */
registerAmbience('amb_c3_bouhatei', (c) => {
  const wind = noiseBed(c, 'lowpass', 500, 0.5, 0.004);
  const gust = modulate(c.g, c.t0, modBuffer(c.g, 40, smoothRandom(c.rng, 0.1, 0.3)), wind.gain.gain, 0.003);
  const bell = new Every(c, 40, 90, (t) => {
    if (!noonNow()) return;
    for (const [f, k] of [
      [4200, 1],
      [6300, 0.6],
    ])
      v(c, { at: t, wave: 'sine', freq: f, dur: 0.01, attack: 0.001, decay: 0.4, sustain: 0, release: 0.1, vol: 0.002 * k, pan: 0.4, reverb: 0.2 });
  }, 10, 40);
  const dopun = new Every(c, 6, 11, (t) => {
    if (noonNow()) v(c, { at: t, wave: 'noise', dur: 0.05, attack: 0.03, decay: 0.6, sustain: 0, release: 0.2, vol: 0.01, filter: { type: 'bandpass', freq: 500, q: 0.6 }, pan: c.rng.range(-0.5, 0.5) });
  }, 1, 6);
  return {
    pump(u) {
      bell.pump(u);
      dopun.pump(u);
    },
    stop(t) {
      wind.stop(t);
      gust.stop(t);
    },
  };
});

/**
 * amb_c3_kaisui — the beach and the beach hut: ① the swimming flag flapping
 * (12:00: the flag is stopped too — none) ② the wind in the reed screens ③
 * ウミ's friends playing far off, every 10–20 s (12:00 too: their lunch break
 * never ends, so they are always playing — 60 S06).
 */
registerAmbience('amb_c3_kaisui', (c) => {
  const flagDest = sub(c, noonNow() ? 1 : 0);
  const flag = noiseBed(c, 'bandpass', 1400, 0.8, 0.002, flagDest);
  const flagAm = modulate(c.g, c.t0, modBuffer(c.g, 10, smoothRandom(c.rng, 8, 14)), flag.gain.gain, 0.0015);
  const yoshizu = noiseBed(c, 'highpass', 3000, 0.7, 0.002);
  const kids = new Every(c, 10, 20, (t) => {
    const n = 3 + Math.floor(c.rng.range(0, 4));
    const pick = () => [0, 2, 4, 7][Math.floor(c.rng.range(0, 4))];
    const shift = [0, 2, -2][Math.floor(c.rng.range(0, 3))];
    blips(c, t, { ...KID, base: KID.base + shift }, Array.from({ length: n }, pick), 0.07, 0.0016, c.dest);
  }, 2, 10);
  const off = onC3((name, value, at) => {
    if (name === 'c3_noon') setLevel(flagDest.gain, value === 1 ? 1 : 0, at, 2);
  });
  return {
    pump: (u) => kids.pump(u),
    stop(t) {
      flag.stop(t);
      flagAm.stop(t);
      yoshizu.stop(t);
      off();
    },
  };
});

/**
 * amb_c3_siren_hum — the foot of the siren tower (12:00 only): the
 * transformer's hum and the impeller about to turn and not turning
 * (「ジー」). At 12:01 it runs down over 2 s (retired).
 */
function sirenHum(c: AmbCtx, out: AudioNode, k = 1): { stop(t: number): void } {
  const lvl = sub(c, noonNow() ? 0 : 1, out);
  const hum = toneBed(c, 'square', 100, 0.003 * k, lvl, 400);
  const zz = noiseBed(c, 'bandpass', 800, 3, 0.001 * k, lvl);
  const off = onC3((name, value, at) => {
    if (name === 'c3_noon') setLevel(lvl.gain, value === 1 ? 0 : 1, at, 2);
  });
  return {
    stop(t) {
      hum.stop(t);
      zz.stop(t);
      off();
    },
  };
}
registerAmbience('amb_c3_siren_hum', (c) => sirenHum(c, c.dest));

/**
 * amb_c3_siren_hold — the noon siren hanging just short of its top (12:00, the
 * whole town, 7.4): ins_siren at +14 semitones, held, with only its ±8 cent
 * wobble, through the tower's speaker voicing ('umi') at the player's
 * distance (the field's setPaDistance is followed here). The same sound
 * ツガオ's room let us hear at the end of chapter 2 (amb_tsugao_room 'umi'),
 * this time the real one. ambientEvent(…, 'yure'): it swells +4 dB for
 * 0.2 s (a townsperson's hands stopping, eat_loop — once in 20 s at most).
 * At 12:01 it fades (0.5 s) and is never heard again: the tail is sealed
 * (playSirenFull, S12).
 */
registerAmbience('amb_c3_siren_hold', (c) => {
  const g = c.g;
  const lvl = sub(c, noonNow() ? 0 : 1);
  const swell = sub(c, 1, lvl);
  const pa = new PaChain(g.ctx, swell, 1.4, 4200);
  pa.setMode('umi', 0, c.t0);
  let dKey = '';
  const followDistance = () => {
    const d = g.pa.distance;
    const key = `${d.override ?? d.d}|${d.indoor}`;
    if (key === dKey) return;
    dKey = key;
    pa.setDistance(d.override ?? d.d, d.indoor, dKey ? 0.3 : 0.01);
  };
  followDistance();
  const note = sirenNote({ t: c.t0, dest: pa.input, f0: 185, semis: 14, rise: 2.4, hold: Infinity, vol: 0.0025 });
  let lastYure = -99;
  const off = onC3((name, value, at) => {
    if (name === 'c3_noon') setLevel(lvl.gain, value === 1 ? 0 : 1, at, 0.5);
  });
  return {
    pump() {
      followDistance();
      pa.wake(g.ctx.currentTime + 2);
    },
    event(name, _p, at) {
      if (name !== 'yure' || at - lastYure < 20) return;
      lastYure = at;
      const p = swell.gain;
      p.cancelScheduledValues(at);
      p.setValueAtTime(1, at);
      p.linearRampToValueAtTime(1.58, at + 0.05);
      p.setValueAtTime(1.58, at + 0.2);
      p.linearRampToValueAtTime(1, at + 0.35);
    },
    stop(t) {
      note.stop(t, 0.05);
      off();
      if (!g.offline) setTimeout(() => pa.dispose(), Math.max(0, t - g.ctx.currentTime) * 1000 + 6000);
    },
  };
});

/**
 * amb_c3_keitora — ツガオ便's truck running (map_c3_nidai): ① the
 * three-cylinder 「ドゥルルル」 (a 95 Hz saw, 19 Hz AM; LP by speed) ② the
 * wind over the bed ③ the bed bouncing on the road's joints every 4–9 s
 * (se_c3_nidai_gata) ④ the vegetables in the crates shaking after it ⑤ once
 * the sea is in sight (c3_shio): far waves and the gulls (on the way there
 * it is not yet noon: they call). ambientEvent(…, 'idle'): idling at the
 * corner of 銀座 (① ×.5, LP 400 Hz, no wind, no bumps); 'run': off we go;
 * 'noon': the clock stops at 12:00 — the gulls and the waves go in 0.5 s;
 * 'hako' (S14): the tailgate shut — no wind, no sea, the engine through the box (LP 300 Hz)
 * (the engine runs on).
 */
registerAmbience('amb_c3_keitora', (c) => {
  const g = c.g;
  const engF = g.ctx.createBiquadFilter();
  engF.type = 'lowpass';
  engF.frequency.value = 700;
  const engLvl = sub(c, 1);
  engF.connect(engLvl);
  const eng = toneBed(c, 'sawtooth', 95, 0.01, engF);
  const engAm = modulate(g, c.t0, modBuffer(g, 1, (t) => Math.sin(t * Math.PI * 2 * 19)), eng.gain.gain, 0.005);
  const speed = modulate(g, c.t0, modBuffer(g, 30, smoothRandom(c.rng, 0.05, 0.12)), engF.frequency, 200);
  const windLvl = sub(c, 1);
  const wind = noiseBed(c, 'highpass', 1500, 0.6, 0.004, windLvl);
  const seaLvl = sub(c, musicParams().c3_shio === 1 ? 1 : 0);
  let running = true;
  const gata = new Every(c, 4, 9, (t) => {
    if (!running) return;
    seIn(c, 'se_c3_nidai_gata', t, 1, c.dest);
    v(c, { at: t + 0.06, wave: 'noise', dur: 0.03, attack: 0.002, decay: 0.03, sustain: 0, release: 0.02, vol: 0.002, filter: { type: 'bandpass', freq: 1800, q: 1 }, pan: c.rng.range(-0.3, 0.3) });
  }, 2, 6);
  const waves = new Every(c, 7, 9, (t) => beachWave(c, t, 0.012 * 0.3, seaLvl), 1, 4);
  const gulls = new Every(c, 8, 18, (t) => seIn(c, 'se_c3_kamome', t, 0.4, seaLvl, c.rng.range(-0.7, 0.7)), 2, 8);
  let noon = false;
  const off = onC3((name, value, at) => {
    if (name === 'c3_shio' && !noon) setLevel(seaLvl.gain, value === 1 ? 1 : 0, at, 3);
  });
  const setRun = (on: boolean, at: number) => {
    running = on;
    setLevel(engLvl.gain, on ? 1 : 0.5, at, 0.8);
    setLevel(windLvl.gain, on ? 1 : 0, at, 0.8);
    engF.frequency.cancelScheduledValues(at);
    engF.frequency.setTargetAtTime(on ? 700 : 400, at, 0.3);
  };
  return {
    pump(u) {
      gata.pump(u);
      if (!noon && (seaLvl.gain.value > 0.001 || musicParams().c3_shio === 1)) {
        waves.pump(u);
        gulls.pump(u);
      } else {
        waves.next = Math.max(waves.next, u);
        gulls.next = Math.max(gulls.next, u);
      }
    },
    event(name, _p, at) {
      if (name === 'idle') setRun(false, at);
      else if (name === 'run') setRun(true, at);
      else if (name === 'hako') {
        // S14 (7.2): the tailgate shut — inside the box: no wind, no sea, the engine through the walls
        noon = true;
        setLevel(seaLvl.gain, 0, at, 0.3);
        setLevel(windLvl.gain, 0, at, 0.3);
        engF.frequency.cancelScheduledValues(at);
        engF.frequency.setTargetAtTime(300, at, 0.1);
        speed.stop(at);
      } else if (name === 'noon') {
        // 12:00 on the way in (S04, 12.3): the gulls and the waves go, in 0.5 s
        noon = true;
        setLevel(seaLvl.gain, 0, at, 0.5);
      }
    },
    stop(t) {
      eng.stop(t);
      engAm.stop(t);
      speed.stop(t);
      wind.stop(t);
      off();
    },
  };
});

/**
 * amb_c3_hirumae — 夕鳴町 before noon on 9月1日 (S01–S04): ① ツクツクボウシ
 * (whole: 夕鳴町 is not stopped) ② cars far off ③ children's voices after
 * the opening ceremony, far (ともき's voice, ×.15). No ヒグラシ: that is the
 * evening's (1.2).
 */
registerAmbience('amb_c3_hirumae', (c) => {
  const tsuku = new Every(c, 18, 36, (t) => tsukutsuku(c, t, 0.006, c.rng.range(-0.6, 0.6), c.dest, false), 1, 10);
  const car = new Every(c, 12, 30, (t) => {
    const from = c.rng.chance(0.5) ? -0.7 : 0.7;
    v(c, { at: t, wave: 'noise', dur: 3, attack: 1.4, decay: 0, sustain: 1, release: 1.6, vol: 0.003, filter: { type: 'lowpass', freq: 700 }, pan: from, panEnd: -from });
  }, 3, 15);
  const kids = new Every(c, 15, 30, (t) => {
    const n = 3 + Math.floor(c.rng.range(0, 4));
    blips(c, t, KID_YUNARI, Array.from({ length: n }, () => [0, 2, 4, 7][Math.floor(c.rng.range(0, 4))]), 0.07, 0.0012, c.dest);
  }, 4, 15);
  return {
    pump(u) {
      tsuku.pump(u);
      car.pump(u);
      kids.pump(u);
    },
    stop() {},
  };
});

// ---------------------------------------------------------------------------
// 第2期：部屋の環境音（塔の上・灯台・海の家・海の中）

/**
 * amb_c3_siren_room — the top of the siren tower (map_c3_siren): ① the wind
 * up high, in gusts ② the impeller about to turn and not turning (the hum
 * of the tower's foot ×3, 12:00) ③ ミナト's stopwatch, one tick a second —
 * in the stopped time only the stopwatch runs (「正午は、1秒も ずらさん」).
 * The far town (amb_c3_umi through the window) is the map's second bed.
 * ambientEvent(…, 'unari'): the siren groans low (S12, ナリオサメ wakes: ② ×2).
 * At 12:01 ② runs down (retired) and the stopwatch stops (it has done its job).
 */
registerAmbience('amb_c3_siren_room', (c) => {
  const wind = noiseBed(c, 'lowpass', 700, 0.5, 0.005);
  const gust = modulate(c.g, c.t0, modBuffer(c.g, 40, smoothRandom(c.rng, 0.1, 0.35)), wind.gain.gain, 0.004);
  const humLvl = sub(c, 1);
  const hum = sirenHum(c, humLvl, 3);
  let noon = noonNow();
  const tick = new Every(c, 1, 1, (t) => {
    if (!noon) DRM.drm_tick({ t, vel: 1, vol: 0.3 * 0.03, dest: c.dest, pan: -0.25 });
  }, 0.5, 0.5);
  const off = onC3((name, value) => {
    if (name === 'c3_noon') noon = value === 1;
  });
  return {
    pump: (u) => tick.pump(u),
    event(name, _p, at) {
      if (name === 'unari') setLevel(humLvl.gain, 2, at, 1.5);
    },
    stop(t) {
      wind.stop(t);
      gust.stop(t);
      hum.stop(t);
      off();
    },
  };
});

/**
 * amb_c3_toudai — inside the lighthouse (thick stone): ① the tower's low
 * resonance ② the sea wind whistling in a window's gap, only in gusts ③ テル
 * polishing the lens (se_c3_lens_polish ×.3 every 6–10 s; 'polish_off' stops
 * it when she leaves the lens room, 'polish_on' starts it again).
 */
registerAmbience('amb_c3_toudai', (c) => {
  const low = noiseBed(c, 'lowpass', 200, 0.5, 0.004);
  const whistleLvl = sub(c, 0);
  const whistle = toneBed(c, 'sine', 620, 0.0015, whistleLvl);
  const gust = modulate(c.g, c.t0, modBuffer(c.g, 30, (t) => Math.max(0, Math.sin(t * Math.PI * 2 * 0.07) * 1.6 - 0.6)), whistleLvl.gain, 1);
  let polish = true;
  const cloth = new Every(c, 6, 10, (t) => {
    if (polish) seIn(c, 'se_c3_lens_polish', t, 0.3, c.dest, 0.3);
  }, 2, 6);
  return {
    pump: (u) => cloth.pump(u),
    event(name) {
      if (name === 'polish_off') polish = false;
      else if (name === 'polish_on') polish = true;
    },
    stop(t) {
      low.stop(t);
      whistle.stop(t);
      gust.stop(t);
    },
  };
});

/**
 * amb_c3_uminoie — the beach hut in the reed screens' shade: ① an electric
 * fan (no shaved-ice machine: 9月1日, the hut is closing for the year). The
 * beach outside is the map's second bed (amb_c3_umi through the screens).
 */
registerAmbience('amb_c3_uminoie', (c) => {
  const fan = noiseBed(c, 'lowpass', 800, 0.5, 0.002);
  const motor = toneBed(c, 'sine', 48, 0.0015);
  const sway = modulate(c.g, c.t0, modBuffer(c.g, 16, (t) => Math.sin(t * Math.PI * 2 * 0.125)), fan.gain.gain, 0.0008);
  return {
    stop(t) {
      fan.stop(t);
      motor.stop(t);
      sway.stop(t);
    },
  };
});

/**
 * amb_c3_suichu — under the sea (map_c3_umi, グソっ君's dive): ① a low
 * underwater rumble, slowly breathing ② a boat's engine far off (12:01
 * only: at 12:00 it is stopped) ③ sand shifting now and then ④ a high
 * 「しゃらん」 with the light on the surface. No bubbles (グソっ君 breathes
 * with gills, 1.6); not dark, not frightening.
 */
registerAmbience('amb_c3_suichu', (c) => {
  const rumble = noiseBed(c, 'lowpass', 250, 0.6, 0.006);
  const breath = modulate(c.g, c.t0, modBuffer(c.g, 25, (t) => Math.sin(t * Math.PI * 2 * 0.08)), rumble.gain.gain, 0.004);
  const boatLvl = sub(c, noonNow() ? 1 : 0);
  const boat = toneBed(c, 'sine', 55, 0.002, boatLvl);
  const boatAm = modulate(c.g, c.t0, modBuffer(c.g, 1, (t) => Math.sin(t * Math.PI * 2 * 12)), boat.gain.gain, 0.0008);
  const sand = new Every(c, 4, 9, (t) => v(c, { at: t, wave: 'noise', dur: 0.015, attack: 0.002, decay: 0.015, sustain: 0, release: 0.01, vol: 0.002, filter: { type: 'bandpass', freq: 2000, q: 1 }, pan: c.rng.range(-0.6, 0.6) }), 1, 5);
  const shine = new Every(c, 10, 20, (t) => {
    const pan = c.rng.range(-0.5, 0.5);
    v(c, { at: t, wave: 'sine', freq: 3100, dur: 0.01, attack: 0.004, decay: 0.9, sustain: 0, release: 0.2, vol: 0.002, pan, reverb: 0.4 });
    v(c, { at: t, wave: 'sine', freq: 4700, dur: 0.01, attack: 0.004, decay: 0.7, sustain: 0, release: 0.2, vol: 0.0008, pan, reverb: 0.4 });
  }, 3, 10);
  const off = onC3((name, value, at) => {
    if (name === 'c3_noon') setLevel(boatLvl.gain, value === 1 ? 1 : 0, at, 4);
  });
  return {
    pump(u) {
      sand.pump(u);
      shine.pump(u);
    },
    stop(t) {
      rumble.stop(t);
      breath.stop(t);
      boat.stop(t);
      boatAm.stop(t);
      off();
    },
  };
});

export const CH3_AMBIENCE_IDS = [
  'amb_c3_umi', 'amb_c3_semi', 'amb_c3_tori', 'amb_c3_mikan', 'amb_c3_minato', 'amb_c3_ichiba', 'amb_c3_ichiba_out',
  'amb_c3_shokudo', 'amb_c3_shokudo_out', 'amb_c3_himono', 'amb_c3_bouhatei', 'amb_c3_kaisui', 'amb_c3_siren_hum',
  'amb_c3_siren_hold', 'amb_c3_keitora', 'amb_c3_hirumae', 'amb_c3_siren_room', 'amb_c3_toudai', 'amb_c3_uminoie', 'amb_c3_suichu',
];

