// Chapter 2 ambience: the beds of 星見台 (53_ch2_audio 7.1–7.2). The village
// at the end of August, a minute before the morning chime: the insects of a
// mountain village (the kantan lead, not the town's bell crickets), the
// irrigation channel, the terraces' water gates, the night wind and the leaves
// of each area, the barn's fans and the cattle chewing the cud, the plastic
// film of the greenhouse breathing, the pulse of the electric fence, the
// walking tractor ploughing all night, the train's rail joints.
//
// Everything written here is a fact of a village like this one (53 1.6): no
// neck chains or cowbells (the fattening cattle stand loose in their pens),
// no frog chorus at the end of August, no owls, crows or anything that makes
// the dark frightening (1.7).
//
// The recipes follow the same rules as ambience.ts: v is the level inside the
// ambience bus, randomness is seeded fresh at every start (the same spot never
// repeats itself), events are scheduled look-ahead from the audio clock.

import { dbToGain, onSample, PaChain, voice, type VoiceOpts } from './engine';
import { DRM } from './instruments';
import { currentId, setMusicParam } from './music';
import { layer, type SeCtx } from './recipe';
import { Rng } from '../engine/rng';
import { Every, higurashiCall, modBuffer, modulate, noiseBed, registerAmbience, sampleHold, smoothRandom, toneBed, type AmbCtx, type Bed } from './ambience';
import { ACHA, BOAR, clockRestart, COW_SNORT, CROSS_STRIKE, HANSUU, IBIKI, SOIL } from './sfx_ch2';
import { atTime } from './clock';
import { game } from '../engine/game';

// ---------------------------------------------------------------------------
// helpers

const v = (c: AmbCtx, o: VoiceOpts, dest: AudioNode = c.dest): void => {
  voice({ dest, ...o });
};

/** A recipe context that plays SE layers into the ambience (no SE fader: the ambience's own trim applies). */
function seCtx(c: AmbCtx, t: number, dest: AudioNode, vol: number, rev = 0, pitch = 1): SeCtx {
  return { t, pitch, vol, dest, rev, opts: {} };
}

/** A gain node on the way to the ambience's output (a layer's own fader). */
function sub(c: AmbCtx, level = 1, dest: AudioNode = c.dest): GainNode {
  const g = c.g.ctx.createGain();
  g.gain.value = level;
  g.connect(dest);
  return g;
}

/**
 * A panned destination inside the ambience. Seats are shared (pan rounded to
 * 0.05, one panner per seat and destination), so an ambience that places a
 * new cricket or snort every few seconds never piles up nodes over a long
 * night: at most ~41 panners per destination, for as long as it plays.
 */
const seats = new WeakMap<AudioNode, Map<number, StereoPannerNode>>();
function panned(c: AmbCtx, pan: number, dest: AudioNode = c.dest): AudioNode {
  const k = Math.round(Math.max(-1, Math.min(1, pan)) * 20);
  let m = seats.get(dest);
  if (!m) seats.set(dest, (m = new Map()));
  let p = m.get(k);
  if (!p) {
    p = c.g.ctx.createStereoPanner();
    p.pan.value = k / 20;
    p.connect(dest);
    m.set(k, p);
  }
  return p;
}

/** A low-pass inside the ambience (a far or muffled layer). */
function lowpass(c: AmbCtx, hz: number, dest: AudioNode = c.dest): BiquadFilterNode {
  const f = c.g.ctx.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = hz;
  f.Q.value = 0.7;
  f.connect(dest);
  return f;
}

/** Glide a gain (a stage change of a whole layer). */
function setLevel(p: AudioParam, to: number, at: number, secs = 0.8): void {
  p.cancelScheduledValues(at);
  p.setValueAtTime(p.value, at);
  p.linearRampToValueAtTime(to, at + Math.max(0.01, secs));
}

/** The ambience instance's own level (setAmbientVol / the positional ramps), as it stands now. */
function instLevel(c: AmbCtx): number {
  const d = c.dest as GainNode;
  return d.gain ? d.gain.value : 1;
}

/** Stage 2 of 星見台 (h_stage 2): the morning is near — a little sparser. */
const s2 = (h: number, k: number) => (h === 2 ? k : 1);

// ---------------------------------------------------------------------------
// 7.1 夜の生きものと水

/**
 * amb_h_insects — the insects of a mountain village at the end of August.
 * The kantan leads: "ルルルル…" for 3–8 s, a rest of 1–3 s, two of them left
 * and right a little apart in pitch; the Emma field cricket's "コロコロリー";
 * one bell cricket far off; and the floor of all the insects too far to tell
 * apart. 段階2: ×0.85 (the dawn is coming, the night thins out).
 */
registerAmbience('amb_h_insects', (c) => {
  const g = c.g;
  const all = sub(c, s2(c.hStage, 0.85));
  // ① kantan ×2: a long, soft trill (48 Hz AM) — they take turns now and then
  const kantan = [
    { pan: -0.5, k: 0.97 },
    { pan: 0.3, k: 1.02 },
  ].map(({ pan, k }, i) => {
    const dest = panned(c, pan, all);
    let next = c.t0 + c.rng.range(0.2, 2.5) + i * 1.3;
    return {
      pump(u: number) {
        let guard = 0;
        while (next < u && guard++ < 16) {
          const t = Math.max(next, g.ctx.currentTime);
          const len = c.rng.range(3, 8);
          // the song sags a hair as it runs out of breath
          const f = 2850 * k * c.rng.range(0.995, 1.005);
          v(c, { at: t, wave: 'sine', freq: f, freqEnd: f * 0.985, glide: len, dur: len, attack: 0.4, decay: 0, sustain: 1, release: 0.6, vol: 0.004, am: { rate: 48 * c.rng.range(0.97, 1.03), depth: 0.8 }, reverb: 0.3 }, dest);
          next = t + len + 0.6 + c.rng.range(1, 3);
        }
      },
    };
  });
  // ② Emma field cricket: four quick pulses, then the same note held with a 30 Hz trill
  const emma = new Every(c, 1.5, 3, (t) => {
    const dest = panned(c, c.rng.range(-0.6, 0.6), all);
    const f = 4400 * c.rng.range(0.98, 1.02);
    for (let i = 0; i < 4; i++) v(c, { at: t + i * 0.03, wave: 'sine', freq: f, dur: 0.018, attack: 0.002, decay: 0.012, sustain: 0.3, release: 0.006, vol: 0.004, reverb: 0.25 }, dest);
    // (a smooth 30 Hz trill: a hard square gate on a pure tone would splatter clicks down the spectrum)
    v(c, { at: t + 0.15, wave: 'sine', freq: f * 0.99, dur: 0.4, attack: 0.02, decay: 0.1, sustain: 0.8, release: 0.08, vol: 0.0045, am: { rate: 30, depth: 1 }, reverb: 0.25 }, dest);
  }, 0.4, 2.5);
  // ③ one bell cricket far off (the town's "リーン", distant)
  const suzuPan = c.rng.range(-0.3, 0.5);
  const suzu = new Every(c, 1.2, 1.2, (t) =>
    v(c, { at: t, wave: 'sine', freq: 4100 * c.rng.range(0.995, 1.005), dur: 0.5, attack: 0.02, decay: 0.1, sustain: 0.8, release: 0.08, vol: 0.003, am: { rate: 40, depth: 0.9 }, pan: suzuPan, reverb: 0.45 }, all),
  );
  // ④ the floor of insects too far to tell apart, breathing at 0.2 Hz
  const floor = noiseBed(c, 'bandpass', 4200, 3, 0.0014, all);
  const fm = modulate(g, c.t0, modBuffer(g, 20, (t) => Math.sin(t * Math.PI * 2 * 0.2 + 1)), floor.gain.gain, 0.0006);
  return {
    pump(u) {
      for (const k of kantan) k.pump(u);
      emma.pump(u);
      suzu.pump(u);
    },
    setHStage(h, at) {
      setLevel(all.gain, s2(h, 0.85), at, 2);
    },
    stop(t) {
      floor.stop(t);
      fm.stop(t);
    },
  };
});

/**
 * amb_h_kusa — the kudzu and pampas thickets (the abandoned field, the foot
 * of the mountain path, the hill's path): the bell-bug's clattering "ガチャガ
 * チャ" (a little comical, never loud) and the katydid's "スイーッチョン".
 */
registerAmbience('amb_h_kusa', (c) => {
  const kutsuwaPan = c.rng.range(-0.6, 0.6);
  const kutsuwa = new Every(c, 4, 10, (t) => {
    const dest = panned(c, kutsuwaPan + c.rng.range(-0.1, 0.1));
    const n = c.rng.int(8, 16);
    for (let i = 0; i < n; i++) {
      // each "ガチャ" is a burst of noise chopped at 50 Hz; the phrase swells then fades
      const env = Math.sin((Math.PI * (i + 0.5)) / n) * 0.6 + 0.4;
      v(c, { at: t + i * 0.18, wave: 'noise', dur: 0.1, attack: 0.008, decay: 0.03, sustain: 0.7, release: 0.02, vol: 0.006 * env, filter: { type: 'bandpass', freq: 5000 * c.rng.range(0.97, 1.03), q: 1 }, am: { rate: 50, depth: 1, shape: 'triangle' }, reverb: 0.2 }, dest);
    }
  }, 1, 6);
  const umaoi = new Every(c, 6, 12, (t) => {
    const dest = panned(c, c.rng.range(-0.7, 0.7));
    // "スイーッ" (rising, 80 Hz grain) … "チョン"
    v(c, { at: t, wave: 'sine', freq: 3800, freqEnd: 4200, glide: 0.4, dur: 0.4, attack: 0.05, decay: 0.05, sustain: 0.9, release: 0.03, vol: 0.004, am: { rate: 80, depth: 0.8 }, reverb: 0.25 }, dest);
    v(c, { at: t + 0.52, wave: 'sine', freq: 3200, dur: 0.06, attack: 0.003, decay: 0.03, sustain: 0.6, release: 0.02, vol: 0.004, reverb: 0.25 }, dest);
  }, 2, 8);
  return {
    pump(u) {
      kutsuwa.pump(u);
      umaoi.pump(u);
    },
    stop() {},
  };
});

/**
 * amb_h_tanada — the terraces: water falling through the gates from one
 * paddy to the next (two of them), now and then a tree frog (the end of
 * August: a few frogs taking turns, never a chorus). The rice leaves are
 * amb_h_wind's 'ine'.
 */
registerAmbience('amb_h_tanada', (c) => {
  const g = c.g;
  const gates = [-0.3, 0.3].map((pan, i) => {
    const b = noiseBed(c, 'bandpass', 1800 * (i ? 1.08 : 0.95), 1, 0.004 * 0.4, c.dest, pan);
    const m = modulate(g, c.t0, modBuffer(g, 13 + i, sampleHold(new Rng(c.seed + 3 + i), 25, 50)), b.gain.gain, 0.004 * 0.6);
    return { b, m };
  });
  // a low trickle under the gates (the water hitting the next paddy)
  const splash = noiseBed(c, 'lowpass', 500, 0.6, 0.0015);
  const frogs = [0, 1, 2].slice(0, c.rng.int(2, 3)).map(() => ({ pan: c.rng.range(-0.7, 0.7), f: 1300 * c.rng.range(0.92, 1.1) }));
  let who = 0;
  const frog = new Every(c, 4, 15, (t) => {
    const fr = frogs[who++ % frogs.length];
    const dest = panned(c, fr.pan);
    const n = c.rng.int(3, 6);
    for (let i = 0; i < n; i++)
      v(c, { at: t + i / 7, wave: 'sawtooth', freq: fr.f, dur: 0.05, attack: 0.004, decay: 0.03, sustain: 0.5, release: 0.015, vol: 0.004, filter: { type: 'bandpass', freq: fr.f, q: 3 }, am: { rate: 90, depth: 0.5 }, reverb: 0.3 }, dest);
  }, 1.5, 7);
  return {
    pump: (u) => frog.pump(u),
    stop(t) {
      for (const x of gates) {
        x.b.stop(t);
        x.m.stop(t);
      }
      splash.stop(t);
    },
  };
});

/**
 * amb_h_mizu — the irrigation channel and the western stream: water off the
 * mountain, fast, finer-grained than the town's canal (amb_kawabe).
 */
registerAmbience('amb_h_mizu', (c) => {
  const g = c.g;
  const water = noiseBed(c, 'bandpass', 1100, 1.5, 0.007 * 0.4);
  const sh = modulate(g, c.t0, modBuffer(g, 11, sampleHold(new Rng(c.seed), 15, 35)), water.gain.gain, 0.007 * 0.6);
  const floor = noiseBed(c, 'lowpass', 300, 0.6, 0.003);
  // the surface glitter above the rush (what small speakers hear of a stream)
  const glint = noiseBed(c, 'bandpass', 3400, 1.2, 0.0008, c.dest, 0.15);
  const gm = modulate(g, c.t0, modBuffer(g, 9, sampleHold(new Rng(c.seed + 9), 20, 45)), glint.gain.gain, 0.0014);
  // "とぽん" under the bridge
  const topon = new Every(c, 6, 12, (t) => {
    v(c, { at: t, wave: 'sine', freq: 500, freqEnd: 300, glide: 0.03, dur: 0.03, attack: 0.002, decay: 0.05, sustain: 0, release: 0.03, vol: 0.004, pan: c.rng.range(-0.3, 0.3), reverb: 0.3 });
    v(c, { at: t + 0.06, wave: 'sine', freq: 900, freqEnd: 1300, glide: 0.02, dur: 0.02, attack: 0.002, decay: 0.02, sustain: 0, release: 0.02, vol: 0.0015, reverb: 0.3 });
  }, 2, 9);
  let next = c.t0;
  return {
    pump(u) {
      topon.pump(u);
      // "ちょろ": little rising droplets, 8–16 a second
      let guard = 0;
      while (next < u && guard++ < 64) {
        const t = Math.max(next, g.ctx.currentTime);
        const f0 = 700 * c.rng.range(0.85, 1.2);
        v(c, { at: t, wave: 'sine', freq: f0, freqEnd: f0 * 2.3, glide: 0.018, dur: 0.018, attack: 0.002, decay: 0.016, sustain: 0, release: 0.012, vol: 0.003 * c.rng.range(0.5, 1.1), pan: c.rng.range(-0.4, 0.4) });
        next += 1 / c.rng.range(8, 16);
      }
    },
    stop(t) {
      water.stop(t);
      sh.stop(t);
      floor.stop(t);
      glint.stop(t);
      gm.stop(t);
    },
  };
});

/** amb_h_wind's leaf zones (53 7.2): ambientEvent('amb_h_wind', zone). */
const WIND_ZONES = ['ine', 'susuki', 'sugi', 'hill', 'none'] as const;
type WindZone = (typeof WIND_ZONES)[number];

/**
 * amb_h_wind — the night wind coming down the mountain in slow gusts, and the
 * leaves of the area it blows through (rice ears, pampas grass, cedars, the
 * hill's top), crossfaded in 1 s when the world names the area. 段階2 ×0.8.
 */
registerAmbience('amb_h_wind', (c) => {
  const g = c.g;
  const all = sub(c, s2(c.hStage, 0.8));
  const gustFn = smoothRandom(new Rng(c.seed), 0.08, 0.25);
  const gustBuf = modBuffer(g, 60, (t) => 0.5 + 0.5 * gustFn(t));
  // ① the air
  const airLvl = sub(c, 1, all);
  const air = noiseBed(c, 'lowpass', 400, 0.5, 0.002, airLvl);
  const ma = modulate(g, c.t0, gustBuf, air.gain.gain, 0.006);
  // ② the leaves, each riding the same gusts; a zone fader crossfades them
  const leaf = (type: BiquadFilterType, f: number, q: number, lvl: number): { fader: GainNode; bed: Bed; m: { stop(t: number): void } } => {
    const fader = sub(c, 0, all);
    const bed = noiseBed(c, type, f, q, lvl * 0.2, fader);
    const m = modulate(g, c.t0, gustBuf, bed.gain.gain, lvl * 0.8);
    return { fader, bed, m };
  };
  const ine = leaf('highpass', 2800, 0.5, 0.004);
  const susuki = leaf('bandpass', 3500, 0.7, 0.004);
  // the pampas "しゃらしゃら": the plumes brushing each other (a slow grain on top of the gusts)
  const shara = modulate(g, c.t0, modBuffer(g, 17, sampleHold(new Rng(c.seed + 4), 9, 16)), susuki.bed.gain.gain, 0.0015);
  const sugi = leaf('bandpass', 900, 0.6, 0.005);
  const zones: Record<WindZone, { air: number; ine: number; susuki: number; sugi: number }> = {
    ine: { air: 1, ine: 1, susuki: 0, sugi: 0 },
    susuki: { air: 1, ine: 0, susuki: 1, sugi: 0 },
    sugi: { air: 1, ine: 0, susuki: 0, sugi: 1 },
    hill: { air: 1.3, ine: 0, susuki: 0, sugi: 0.6 },
    none: { air: 1, ine: 0, susuki: 0, sugi: 0 },
  };
  const setZone = (z: WindZone, at: number, secs: number) => {
    const k = zones[z];
    setLevel(airLvl.gain, k.air, at, secs);
    setLevel(ine.fader.gain, k.ine, at, secs);
    setLevel(susuki.fader.gain, k.susuki, at, secs);
    setLevel(sugi.fader.gain, k.sugi, at, secs);
  };
  setZone('none', c.t0, 0.01);
  return {
    event(name, _pan, at) {
      if ((WIND_ZONES as readonly string[]).includes(name)) setZone(name as WindZone, at, 1.0);
    },
    setHStage(h, at) {
      setLevel(all.gain, s2(h, 0.8), at, 2);
    },
    stop(t) {
      for (const x of [air, ine.bed, susuki.bed, sugi.bed]) x.stop(t);
      for (const m of [ma, ine.m, susuki.m, sugi.m, shara]) m.stop(t);
    },
  };
});

/**
 * amb_h_yama — the mountain awake (段階1–2; 段階0 the village's things and the
 * boars are asleep): a far wind in the trees, and every 25–50 s a wild boar
 * somewhere up the slope, snorting, sometimes rooting in the fallen leaves.
 */
registerAmbience('amb_h_yama', (c) => {
  const g = c.g;
  const all = sub(c, c.hStage === 0 ? 0 : 1);
  const wind = noiseBed(c, 'bandpass', 250, 0.5, 0.002, all);
  const wm = modulate(g, c.t0, modBuffer(g, 40, smoothRandom(new Rng(c.seed + 2), 0.05, 0.15)), wind.gain.gain, 0.001);
  // the far slope's reverb carries most of it
  const farLp = lowpass(c, 1200, all);
  const boar = new Every(c, 25, 50, (t) => {
    const dest = panned(c, c.rng.range(-0.6, 0.6), farLp);
    for (const l of BOAR[0]) layer(seCtx(c, t, dest, 0.25, 0.7), l);
    if (c.rng.chance(0.5)) {
      const n = c.rng.int(3, 5);
      for (let i = 0; i < n; i++)
        v(c, { at: t + 0.7 + i * 0.12, wave: 'noise', dur: 0.02, attack: 0.002, decay: 0.03, sustain: 0, release: 0.02, vol: 0.003, filter: { type: 'lowpass', freq: 900 }, reverb: 0.5 }, dest);
    }
  }, 4, 16);
  return {
    pump: (u) => boar.pump(u),
    setHStage(h, at) {
      setLevel(all.gain, h === 0 ? 0 : 1, at, 2);
    },
    stop(t) {
      wind.stop(t);
      wm.stop(t);
    },
  };
});

/**
 * amb_h_hachi — the bumblebees home in their box in greenhouse 3: a very small
 * buzz, uneven (3–5 Hz), close to the box only.
 */
registerAmbience('amb_h_hachi', (c) => {
  const g = c.g;
  const out = sub(c, 1);
  const bees = [0.98, 1.03].map((k, i) => {
    const b = toneBed(c, 'sawtooth', 180 * k, 0.0012, out);
    // a band-pass body (the box and the wings)
    b.filter.type = 'bandpass';
    b.filter.frequency.value = 400;
    b.filter.Q.value = 2;
    const m = modulate(g, c.t0, modBuffer(g, 7 + i, sampleHold(new Rng(c.seed + 7 * i), 3, 5)), b.gain.gain, 0.0012);
    return { b, m };
  });
  return {
    stop(t) {
      for (const x of bees) {
        x.b.stop(t);
        x.m.stop(t);
      }
    },
  };
});

// ---------------------------------------------------------------------------
// 7.2 村の機械と建物

/**
 * amb_h_fence — the electric fence's energiser: a small "カチッ" about once a
 * second, on the world's village clock (ambientEvent('amb_h_fence', 'pulse',
 * pan): the same tick as the unit's green LED and ビリビリ番's steps); every
 * 3–6 pulses a tiny leak "チッ" where grass touches the wire. If no pulse has
 * come for 2.5 s (the sound test), it keeps its own 1.0 s clock.
 */
registerAmbience('amb_h_fence', (c) => {
  const g = c.g;
  let lastEvent = -1e9;
  let own = c.t0 + 0.4;
  let untilLeak = c.rng.int(3, 6);
  const pulse = (t: number, pan: number) => {
    const dest = panned(c, pan);
    v(c, { at: t, wave: 'triangle', freq: 90, dur: 0.008, attack: 0.0008, decay: 0.012, sustain: 0, release: 0.008, vol: 0.006, reverb: 0.15 }, dest);
    // the relay's upper click (what a laptop hears of it)
    v(c, { at: t, wave: 'triangle', freq: 2300, dur: 0.003, attack: 0.0005, decay: 0.006, sustain: 0, release: 0.004, vol: 0.0015 }, dest);
    v(c, { at: t, wave: 'noise', dur: 0.004, attack: 0.0005, decay: 0.006, sustain: 0, release: 0.003, vol: 0.004, filter: { type: 'highpass', freq: 3000 } }, dest);
    if (--untilLeak <= 0) {
      untilLeak = c.rng.int(3, 6);
      v(c, { at: t + 0.002, wave: 'noise', dur: 0.003, attack: 0.0005, decay: 0.004, sustain: 0, release: 0.003, vol: c.rng.range(0.002, 0.004), filter: { type: 'highpass', freq: 4000 }, pan: c.rng.range(-0.5, 0.5) });
    }
  };
  return {
    pump(u) {
      const now = g.ctx.currentTime;
      if (now - lastEvent < 2.5) {
        own = Math.max(own, lastEvent + 1.0);
        return;
      }
      while (own < u) {
        pulse(Math.max(own, now), 0);
        own += 1.0;
      }
    },
    event(name, pan, at) {
      if (name !== 'pulse') return;
      lastEvent = at;
      pulse(at, pan ?? 0);
    },
    stop() {},
  };
});

/**
 * The barn's big ventilation fans (the whole summer long): air through the
 * blades and the blade-pass hum of three fans a little apart in speed (the
 * beat between them), with harmonics a laptop can play (16.2).
 */
function barnFans(c: AmbCtx, dest: AudioNode, o: { air: [BiquadFilterType, number, number, number]; hums: number[]; humV: number; pans: number[]; hiss: number }): Bed[] {
  const beds: Bed[] = [];
  beds.push(noiseBed(c, o.air[0], o.air[1], o.air[2], o.air[3], dest));
  o.hums.forEach((f, i) => {
    const p = panned(c, o.pans[i] ?? 0, dest);
    beds.push(toneBed(c, 'sine', f, o.humV, p));
    // the blade pass is not a pure tone: its 2nd–4th harmonics carry it on small speakers
    beds.push(toneBed(c, 'sawtooth', f, o.humV * 0.35, p, 260, 0.6));
  });
  if (o.hiss) beds.push(noiseBed(c, 'highpass', 2000, 0.5, o.hiss, dest));
  return beds;
}

/**
 * amb_h_barn_out — outside 石黒牛舎: the fans through the wall, and now and then
 * a steer's snort.
 */
registerAmbience('amb_h_barn_out', (c) => {
  const beds = barnFans(c, c.dest, { air: ['lowpass', 250, 0.6, 0.006], hums: [43, 45, 47], humV: 0.002, pans: [-0.3, 0, 0.3], hiss: 0 });
  const wall = lowpass(c, 900);
  const snort = new Every(c, 8, 20, (t) => {
    const dest = panned(c, c.rng.range(-0.4, 0.4), wall);
    for (const l of COW_SNORT) layer(seCtx(c, t, dest, 0.4, 0.2, c.rng.range(0.9, 1.08)), l);
  }, 3, 12);
  return {
    pump: (u) => snort.pump(u),
    stop(t) {
      beds.forEach((b) => b.stop(t));
    },
  };
});

/**
 * amb_h_barn — inside the barn on a summer night: three fans, six steers
 * chewing the cud around the pens (a jaw stroke about once a second, 40–60
 * strokes to a cud, then 3–5 s to swallow and bring up the next), snorts, a
 * water cup (the steer pushes the paddle with its nose), one lying down or
 * getting up in the sawdust, a flank against the pipe rails. ふしぎ08:
 * 'sync_on' makes the four of 北3 chew at the same instant, 1.00 s apart;
 * 'sync_off' lets them go back to their own time.
 */
registerAmbience('amb_h_barn', (c) => {
  const g = c.g;
  const beds = barnFans(c, c.dest, { air: ['bandpass', 300, 0.6, 0.007], hums: [44, 46, 49], humV: 0.004, pans: [-0.4, 0, 0.4], hiss: 0.002 });
  // ② six steers chewing, each on its own clock
  const chewers = Array.from({ length: 6 }, (_, i) => {
    const pan = -0.6 + (1.2 * i) / 5 + c.rng.range(-0.08, 0.08);
    const dest = panned(c, pan);
    const pitch = c.rng.range(0.9, 1.1);
    // (53 7.2 says ×.3 of the SE; over the fans it takes about twice that to be heard when you listen for it)
    const lvl = c.rng.range(0.5, 0.65);
    let left = c.rng.int(10, 60);
    let next = c.t0 + c.rng.range(0.1, 4);
    return {
      pump(u: number) {
        let guard = 0;
        while (next < u && guard++ < 16) {
          const t = Math.max(next, g.ctx.currentTime);
          for (const l of HANSUU) layer(seCtx(c, t, dest, lvl * c.rng.range(0.85, 1.1), 0.1, pitch * c.rng.range(0.97, 1.03)), l);
          if (--left <= 0) {
            left = c.rng.int(40, 60);
            // swallow… and bring the next cud up
            next = t + c.rng.range(3, 5);
          } else next = t + c.rng.range(0.85, 1.15);
        }
      },
    };
  });
  // ふしぎ08: the four of 北3 in step
  let sync: { pan: number; next: number } | null = null;
  const pumpSync = (u: number) => {
    if (!sync) return;
    let guard = 0;
    while (sync.next < u && guard++ < 8) {
      const t = Math.max(sync.next, g.ctx.currentTime);
      for (let k = 0; k < 4; k++) {
        const dest = panned(c, sync.pan + (k - 1.5) * 0.06);
        for (const l of HANSUU) layer(seCtx(c, t, dest, 0.5, 0.1, 0.94 + k * 0.035), l);
      }
      sync.next = t + 1.0;
    }
  };
  // ③ snorts
  const snort = new Every(c, 6, 15, (t) => {
    const dest = panned(c, c.rng.range(-0.6, 0.6));
    for (const l of COW_SNORT) layer(seCtx(c, t, dest, 0.5, 0.15, c.rng.range(0.9, 1.08)), l);
  }, 2, 9);
  // ④ a water cup: the paddle pushed, water running in, "ごぽっ"
  const cup = new Every(c, 20, 40, (t) => {
    const dest = panned(c, c.rng.range(-0.6, 0.6));
    v(c, { at: t, wave: 'noise', dur: 0.3, attack: 0.02, decay: 0.1, sustain: 0.6, release: 0.08, vol: 0.004, filter: { type: 'bandpass', freq: 700, q: 1.2 }, reverb: 0.2 }, dest);
    v(c, { at: t + 0.12, wave: 'sine', freq: 300, freqEnd: 500, glide: 0.5, dur: 0.5, attack: 0.02, decay: 0.2, sustain: 0.4, release: 0.1, vol: 0.006, am: { rate: 12, depth: 0.7 }, reverb: 0.2 }, dest);
  }, 5, 25);
  // ⑤ lying down / getting up in the sawdust
  const straw = new Every(c, 30, 60, (t) => {
    const dest = panned(c, c.rng.range(-0.6, 0.6));
    v(c, { at: t, wave: 'noise', dur: 0.4, attack: 0.06, decay: 0.2, sustain: 0.4, release: 0.15, vol: 0.005, filter: { type: 'lowpass', freq: 600 }, reverb: 0.15 }, dest);
    // the weight settling
    v(c, { at: t + 0.25, wave: 'sine', freq: 70, freqEnd: 50, glide: 0.1, dur: 0.05, attack: 0.005, decay: 0.12, sustain: 0, release: 0.05, vol: 0.006 }, dest);
  }, 8, 30);
  // ⑥ a flank against the pipe rails
  const rail = new Every(c, 25, 60, (t) => {
    const dest = panned(c, c.rng.range(-0.6, 0.6));
    for (const [f, k] of [[620, 1], [1540, 0.5]])
      v(c, { at: t, wave: 'sine', freq: f * c.rng.range(0.98, 1.02), dur: 0.01, attack: 0.002, decay: 0.3, sustain: 0, release: 0.1, vol: 0.004 * k, reverb: 0.3 }, dest);
  }, 10, 40);
  return {
    pump(u) {
      for (const ch of chewers) ch.pump(u);
      pumpSync(u);
      snort.pump(u);
      cup.pump(u);
      straw.pump(u);
      rail.pump(u);
    },
    event(name, pan, at) {
      if (name === 'sync_on') {
        if (!sync) sync = { pan: pan ?? 0.2, next: at + 0.05 };
        else sync.pan = pan ?? sync.pan;
      } else if (name === 'sync_off') sync = null;
    },
    stop(t) {
      beds.forEach((b) => b.stop(t));
    },
  };
});

/**
 * amb_h_house — greenhouse 3 breathing: the film swells and sinks on a 4 s
 * cycle (the same clock as the look of ふしぎ07), a small "ぱり" of the film at
 * the top of each breath; the frame creaks now and then. 'deep_breath': one
 * big breath over 2.5 s; 'calm': the breathing stops, the creaks stay.
 */
registerAmbience('amb_h_house', (c) => {
  const g = c.g;
  const breathOut = sub(c, 1);
  const film = noiseBed(c, 'bandpass', 250, 0.7, 0, breathOut);
  // the upper film rustle, for small speakers
  const filmHi = noiseBed(c, 'bandpass', 1100, 0.8, 0, breathOut);
  let next = c.t0 + 0.2;
  let calm = false;
  let hold = 0;
  const breath = (t: number, peak: number, up: number, down: number) => {
    for (const [b, k] of [[film, 1], [filmHi, 0.22]] as [Bed, number][]) {
      const p = b.gain.gain;
      p.setValueAtTime(0.0003 * k, t);
      p.linearRampToValueAtTime(peak * k, t + up);
      p.linearRampToValueAtTime(0.0003 * k, t + up + down);
    }
    v(c, { at: t + up - 0.05, wave: 'noise', dur: 0.02, attack: 0.002, decay: 0.03, sustain: 0, release: 0.02, vol: 0.002 * (peak / 0.006), filter: { type: 'highpass', freq: 3500 }, pan: c.rng.range(-0.4, 0.4), reverb: 0.15 }, breathOut);
  };
  const creak = new Every(c, 20, 40, (t) => {
    v(c, { at: t, wave: 'sine', freq: 1100, freqEnd: 1000, glide: 0.12, dur: 0.12, attack: 0.01, decay: 0.05, sustain: 0.6, release: 0.04, vol: 0.002, am: { rate: 30, depth: 0.5 }, pan: c.rng.range(-0.6, 0.6), reverb: 0.25 });
  }, 3, 20);
  return {
    pump(u) {
      creak.pump(u);
      if (calm) return;
      let guard = 0;
      while (next < u && guard++ < 4) {
        const t = Math.max(next, g.ctx.currentTime, hold);
        breath(t, 0.006, 1.8, 2.2);
        next = t + 4.0;
      }
    },
    event(name, _pan, at) {
      if (name === 'deep_breath') {
        const t = Math.max(at, hold);
        for (const b of [film, filmHi]) b.gain.gain.cancelScheduledValues(t);
        breath(t, 0.006 * 1.6, 1.2, 1.3);
        hold = t + 2.5;
        next = hold + 0.6;
      } else if (name === 'calm') {
        calm = true;
        const t = Math.max(at, hold);
        for (const b of [film, filmHi]) setLevel(b.gain.gain, 0, t, 0.6);
      }
    },
    stop(t) {
      film.stop(t);
      filmHi.stop(t);
    },
  };
});

/**
 * amb_h_tomato — the はなまるトマト humming in the dark at the back of the
 * greenhouse (the way to it in the dark): F3 with F4 and C5, breathing at
 * 0.8 Hz like its light. The world raises it as Minato comes near.
 */
registerAmbience('amb_h_tomato', (c) => {
  const g = c.g;
  const lp = lowpass(c, 1200);
  const am = sub(c, 0.7, lp);
  const tones = [
    [174.61, 1],
    [349.23, 0.4],
    [523.25, 0.15],
  ].map(([f, k]) => toneBed(c, 'sine', f, 0.003 * k, am));
  const lfo = g.ctx.createOscillator();
  lfo.frequency.value = 0.8;
  const depth = g.ctx.createGain();
  depth.gain.value = 0.3;
  lfo.connect(depth);
  depth.connect(am.gain);
  lfo.start(onSample(g.ctx, c.t0));
  return {
    stop(t) {
      tones.forEach((b) => b.stop(t));
      lfo.stop(t);
    },
  };
});

/**
 * amb_h_school — the meeting room of the old branch school at night (53 7.2):
 * a kettle breathing steam on the stove, its lid "カタ" now and then; シゲじい
 * and スギばあ snoring on their floor cushions, 3.4 s and 3.1 s apart, so they
 * drift in and out of step (a small laugh, never loud, never frightening);
 * タケじい only breathing; and every 20–26 s one of them says 「……あちゃ〜……」
 * in their sleep (a hum in the colour of a, no words) — on the world's clock
 * when it sends ambientEvent('amb_h_school', 'acha', who: 0 シゲじい / 1 スギばあ),
 * on its own otherwise. While a dialog window is up the snoring steps back
 * −6 dB so it never covers the meeting's lines.
 */
registerAmbience('amb_h_school', (c) => {
  const g = c.g;
  const steam = noiseBed(c, 'bandpass', 3000, 1, 0.003, c.dest, -0.35);
  const sm = modulate(g, c.t0, modBuffer(g, 15, smoothRandom(new Rng(c.seed + 1), 0.2, 0.6)), steam.gain.gain, 0.0008);
  const lid = new Every(c, 6, 14, (t) => {
    const n = c.rng.chance(0.4) ? 2 : 1;
    for (let i = 0; i < n; i++) v(c, { at: t + i * 0.09, wave: 'triangle', freq: 900 * c.rng.range(0.97, 1.03), dur: 0.01, attack: 0.001, decay: 0.03, sustain: 0, release: 0.02, vol: 0.004 * (i ? 0.6 : 1), pan: -0.35, reverb: 0.2 });
  }, 2, 8);
  // the sleepers' layer (steps back under a dialog window)
  const sleepers = sub(c, 1);
  let talking = false;
  const snorers = [
    { pan: -0.1, pitch: 1.0, period: 3.4 },
    { pan: 0.35, pitch: 1.35, period: 3.1 },
  ].map((o, i) => {
    const dest = panned(c, o.pan, sleepers);
    let next = c.t0 + 0.4 + i * 1.3 + c.rng.range(0, 0.5);
    return {
      pump(u: number) {
        let guard = 0;
        while (next < u && guard++ < 4) {
          const t = Math.max(next, g.ctx.currentTime);
          for (const l of IBIKI) layer(seCtx(c, t, dest, c.rng.range(0.85, 1.05), 0.12, o.pitch * c.rng.range(0.98, 1.02)), l);
          next = t + o.period;
        }
      },
    };
  });
  // タケじい: breathing only (in, a little higher and shorter … out, longer and lower)
  const takeDest = panned(c, 0.6, sleepers);
  const takePeriod = c.rng.range(4, 5);
  let takeNext = c.t0 + c.rng.range(0, takePeriod);
  // the sleep-talk: シゲじい (pitch 0.8) and スギばあ (1.15) in turn
  let who = 0;
  let lastWorld = -1e9;
  let achaNext = c.t0 + c.rng.range(8, 16);
  const acha = (t: number, w: number) => {
    const dest = panned(c, w === 1 ? 0.35 : -0.1, sleepers);
    for (const l of ACHA) layer(seCtx(c, t, dest, 1, 0.15, w === 1 ? 1.15 : 0.8), l);
  };
  return {
    pump(u) {
      lid.pump(u);
      for (const s of snorers) s.pump(u);
      let guard = 0;
      while (takeNext < u && guard++ < 4) {
        const t = Math.max(takeNext, g.ctx.currentTime);
        const f = 700 * c.rng.range(0.9, 1.1);
        v(c, { at: t, wave: 'noise', dur: 1.2, attack: 0.6, decay: 0.3, sustain: 0.6, release: 0.4, vol: 0.0016, filter: { type: 'bandpass', freq: f * 1.15, q: 0.8 } }, takeDest);
        v(c, { at: t + 1.6, wave: 'noise', dur: 1.6, attack: 0.3, decay: 0.6, sustain: 0.5, release: 0.7, vol: 0.002, filter: { type: 'bandpass', freq: f, q: 0.8 } }, takeDest);
        takeNext = t + takePeriod * c.rng.range(0.95, 1.05);
      }
      // the sleep-talk keeps its own clock only while the world sends none
      const now = g.ctx.currentTime;
      if (now - lastWorld > 30) {
        while (achaNext < u) {
          acha(Math.max(achaNext, now), who);
          who = 1 - who;
          achaNext += c.rng.range(20, 26);
        }
      } else achaNext = Math.max(achaNext, now + 20);
      // a dialog window is up: the snoring steps back −6 dB
      const open = !g.offline && game.ui.modal;
      if (open !== talking) {
        talking = open;
        setLevel(sleepers.gain, open ? dbToGain(-6) : 1, now, 0.25);
      }
    },
    event(name, pan, at) {
      if (name !== 'acha') return;
      lastWorld = at;
      const w = pan === 1 ? 1 : 0;
      who = 1 - w;
      acha(at, w);
    },
    stop(t) {
      steam.stop(t);
      sm.stop(t);
    },
  };
});

/**
 * amb_h_boukatou — the one security light, lit and trying hard: a faint
 * steady hum (smaller than the town's fluorescent tubes, no flicker).
 */
registerAmbience('amb_h_boukatou', (c) => {
  const hum = toneBed(c, 'square', 100, 0.002, c.dest, 600);
  const hiss = noiseBed(c, 'highpass', 6000, 0.5, 0.0005);
  return {
    stop(t) {
      hum.stop(t);
      hiss.stop(t);
    },
  };
});

/**
 * amb_h_tetsuya — the walking tractor ploughing the abandoned field all night:
 * an air-cooled single ("ドッドッドッ", 20 Hz firing) whose brightness follows
 * how near it is (the world sets the level: LP 600 → 3000 Hz with it), the
 * tines throwing soil four times a second; at each end of a furrow
 * (ambientEvent 'turn') it drops to idle for 1.0 s and picks up again.
 */
registerAmbience('amb_h_tetsuya', (c) => {
  const g = c.g;
  const lp = lowpass(c, 1200);
  const eng = g.ctx.createOscillator();
  eng.type = 'sawtooth';
  eng.frequency.value = 80;
  const chop = g.ctx.createGain();
  chop.gain.value = 0.2;
  const fire = g.ctx.createOscillator();
  fire.type = 'sine';
  fire.frequency.value = 20;
  const fd = g.ctx.createGain();
  fd.gain.value = 0.8;
  fire.connect(fd);
  fd.connect(chop.gain);
  const lvl = g.ctx.createGain();
  lvl.gain.value = 0.012;
  eng.connect(chop);
  chop.connect(lvl);
  lvl.connect(lp);
  // the exhaust's rattle above the fundamental (what is left of it far away)
  const rattle = noiseBed(c, 'bandpass', 700, 1, 0.003, chop);
  eng.start(onSample(g.ctx, c.t0));
  fire.start(onSample(g.ctx, c.t0));
  const soilDest = lowpass(c, 2400);
  const soil = new Every(c, 0.25, 0.25, (t) => {
    for (const l of SOIL) layer(seCtx(c, t, soilDest, 0.2 * c.rng.range(0.7, 1.1), 0, c.rng.range(0.9, 1.1)), l);
  }, 0.1, 0.25);
  let idleUntil = -1;
  return {
    pump(u) {
      // brightness from the distance (the instance level the world sets)
      const k = Math.max(0, Math.min(1, instLevel(c)));
      lp.frequency.setTargetAtTime(600 + 2400 * k, g.ctx.currentTime, 0.1);
      if (g.ctx.currentTime < idleUntil) {
        soil.next = Math.max(soil.next, idleUntil);
        return;
      }
      soil.pump(u);
    },
    event(name, _pan, at) {
      if (name !== 'turn') return;
      // the end of a furrow: throttle down to idle (13 Hz) for a second, then back up
      for (const [p, lo, hi] of [
        [fire.frequency, 13, 20],
        [eng.frequency, 65, 80],
      ] as [AudioParam, number, number][]) {
        p.cancelScheduledValues(at);
        p.setValueAtTime(p.value, at);
        p.linearRampToValueAtTime(lo, at + 0.25);
        p.setValueAtTime(lo, at + 1.0);
        p.linearRampToValueAtTime(hi, at + 1.4);
      }
      idleUntil = at + 1.2;
    },
    stop(t) {
      eng.stop(t);
      fire.stop(t);
      rattle.stop(t);
    },
  };
});

/**
 * amb_h_train — inside the night train: the rail joints on a 1.2 s cycle
 * ("タタン…タタン": the front bogie's two axles at 0 / 90 ms, the rear's at
 * 600 / 690 ms), the running noise and the wind at the window, the motor's
 * faint hum; 8–12 s in, a far level crossing slides past outside.
 */
registerAmbience('amb_h_train', (c) => {
  const g = c.g;
  const run = noiseBed(c, 'lowpass', 500, 0.6, 0.012);
  const rm = modulate(g, c.t0, modBuffer(g, 23, smoothRandom(new Rng(c.seed + 3), 0.3, 1.2)), run.gain.gain, 0.003);
  const window = noiseBed(c, 'bandpass', 1200, 0.8, 0.004, c.dest, 0.3);
  const motor = toneBed(c, 'sine', 110, 0.003);
  const motor2 = toneBed(c, 'triangle', 330, 0.0006);
  const clack = (t: number, k: number) => {
    v(c, { at: t, wave: 'sine', freq: 70, freqEnd: 58, glide: 0.06, dur: 0.02, attack: 0.001, decay: 0.06, sustain: 0, release: 0.03, vol: 0.03 * k });
    // the wheel on the joint, with a body a laptop can play
    v(c, { at: t, wave: 'triangle', freq: 150, freqEnd: 120, glide: 0.04, dur: 0.01, attack: 0.001, decay: 0.04, sustain: 0, release: 0.02, vol: 0.008 * k });
    v(c, { at: t, wave: 'noise', dur: 0.02, attack: 0.001, decay: 0.02, sustain: 0, release: 0.01, vol: 0.03 * k * 0.6, filter: { type: 'bandpass', freq: 1000, q: 1 } });
  };
  let next = c.t0 + 0.3;
  const crossAt = c.t0 + c.rng.range(8, 12);
  let crossed = false;
  return {
    pump(u) {
      let guard = 0;
      while (next < u && guard++ < 8) {
        const t = Math.max(next, g.ctx.currentTime);
        const k = c.rng.range(0.85, 1.05);
        clack(t, k);
        clack(t + 0.09, k * 0.9);
        clack(t + 0.6, k * 0.95);
        clack(t + 0.69, k * 0.85);
        next = t + 1.2;
      }
      if (!crossed && crossAt < u) {
        crossed = true;
        // a far crossing going by outside: three strikes, falling in pitch, right to left
        const far = lowpass(c, 1500);
        for (let i = 0; i < 3; i++) {
          const t = Math.max(crossAt, g.ctx.currentTime) + i * 0.46;
          const dest = panned(c, 0.6 - 0.6 * i, far);
          for (const l of CROSS_STRIKE) layer(seCtx(c, t, dest, 0.3, 0.25, 1.03 - 0.03 * i), l);
        }
      }
    },
    stop(t) {
      for (const b of [run, window, motor, motor2]) b.stop(t);
      rm.stop(t);
    },
  };
});

/**
 * amb_h_pa_hum — 段階2: the loudspeaker's line left open, humming over the
 * whole village. It hears the PA's distance (53 3.3): darker and quieter far
 * off, indoors behind the wall, about ×4 on the hill under the horns.
 */
registerAmbience('amb_h_pa_hum', (c) => {
  const g = c.g;
  const dist = g.ctx.createGain();
  const lp = lowpass(c, 3800, c.dest);
  dist.connect(lp);
  const hum = toneBed(c, 'sawtooth', 120, 0.002, dist, 900);
  const line = noiseBed(c, 'bandpass', 1200, 1, 0.001, dist);
  const apply = (at: number, tc: number) => {
    const s = g.pa.distance;
    const d = s.override ?? s.d;
    const indoor = s.override === null && s.indoor;
    // close to the horns it grows up to ×4 (the hill); d ≥ 0.35 is the village
    const near = 1 + 3 * Math.max(0, Math.min(1, (0.35 - d) / 0.35));
    const k = near * (d > 0.35 ? dbToGain(-10 * (d - 0.35)) : 1) * (indoor ? dbToGain(-12) : 1);
    dist.gain.setTargetAtTime(k, at, tc);
    lp.frequency.setTargetAtTime(Math.min(3800 * (1 - 0.6 * d), indoor ? 1200 : 20000), at, tc);
  };
  apply(c.t0, 0.01);
  return {
    pump() {
      apply(g.ctx.currentTime, 0.15);
    },
    stop(t) {
      hum.stop(t);
      line.stop(t);
    },
  };
});

/**
 * amb_h_dawn — the mountain village at daybreak: the evening cicadas sing at
 * dawn too — one or two ヒグラシ every 8–15 s — over still morning air. (No
 * cockerel: nobody here keeps chickens.)
 */
registerAmbience('amb_h_dawn', (c) => {
  const air = noiseBed(c, 'lowpass', 500, 0.5, 0.004);
  const e = new Every(c, 8, 15, (t) => {
    higurashiCall(t, c.dest, c.rng.range(-0.7, 0.7), c.rng.range(0.95, 1.05), 4000, 0.015, c.rng);
    if (c.rng.chance(0.35)) higurashiCall(t + c.rng.range(1.2, 2.5), c.dest, c.rng.range(-0.7, 0.7), c.rng.range(0.93, 1.07), 4000, 0.011, c.rng);
  }, 0.6, 5);
  return {
    pump: (u) => e.pump(u),
    stop(t) {
      air.stop(t);
    },
  };
});

// ---------------------------------------------------------------------------
// 7.2 ツガオの部屋 (after 「つづく」; chapter 3 hears it again: no chapter letter)

/**
 * amb_tsugao_room — the back of an old office at night: the desk lamp's faint
 * hum. ambientEvent('amb_tsugao_room', 'tick', 'yunari' | 'hoshimi'): a wall
 * clock runs again — 夕鳴町's "チッ・タッ" (drm_tick / drm_tock, pan −.4), then
 * 星見台's "コツ" (drm_mic_tap, centre), once a second; while bgm_tsugao plays
 * the song carries those beats itself (its `clock` param is set here), so the
 * two never tick against each other. Never a chime (53 1.4). 'umi' (「海ぞいの
 * 町」): the clocks stop; far waves swell on an 8 s cycle, and a siren rises
 * and stops just short of the top, holding there — through a far town's
 * speaker (the town voicing, d .8). It only rises: it is no tune (chapter 3
 * decides the noon chime). The lamp's click (se_lamp_click) is followed by
 * stopAmbient(…, 0.5): complete silence.
 */
registerAmbience('amb_tsugao_room', (c) => {
  const g = c.g;
  const hum = toneBed(c, 'square', 100, 0.002, c.dest, 500);
  const clocks = { yunari: false, hoshimi: false };
  let next = 0;
  let n = 0;
  let umi: { beds: Bed[]; stop(t: number): void } | null = null;
  const tickDest = sub(c, 1);
  const songHasClock = () => currentId() === 'bgm_tsugao';
  return {
    pump(u) {
      if (!clocks.yunari && !clocks.hoshimi) return;
      let guard = 0;
      while (next < u && guard++ < 4) {
        const t = Math.max(next, g.ctx.currentTime);
        if (!songHasClock()) {
          if (clocks.yunari) (n % 2 ? DRM.drm_tock : DRM.drm_tick)({ t, vel: 1, vol: 0.5 * 0.03, pan: -0.4, dest: tickDest });
          if (clocks.hoshimi) DRM.drm_mic_tap({ t: t + 0.5, vel: 1, vol: 0.4 * 0.05, dest: tickDest });
        }
        n++;
        next = t + 1.0;
      }
    },
    event(name, arg, at) {
      const town = arg as unknown as string | number | undefined;
      if (name === 'tick') {
        const hoshimi = town === 'hoshimi' || town === 1;
        // a restart still finding its pace (se_clock_restart: ticks at 0 / 1.3 /
        // 2.25 / 3.25 s) keeps the floor until its fourth tick; the steady second
        // follows a second later — here, or in the song's beat
        const r = clockRestart.t;
        const from = at - r < 3.25 && at >= r - 0.05 ? r + 3.25 : at;
        const start = () => {
          if (umi) return;
          if (hoshimi) clocks.hoshimi = true;
          else clocks.yunari = true;
          setMusicParam('clock', clocks.hoshimi ? 2 : 1);
        };
        if (next < from + 1.0) next = from + 1.0;
        if (from > at + 0.02 && !g.offline) atTime(from, start);
        else start();
      } else if (name === 'umi' && !umi) {
        // the clocks stop with the song
        clocks.yunari = clocks.hoshimi = false;
        // far waves on an 8 s swell, to the right
        const wp = panned(c, 0.4);
        const waves = noiseBed(c, 'lowpass', 600, 0.5, 0.0015, wp);
        const wm = modulate(g, at, modBuffer(g, 8, (t) => 0.5 - 0.5 * Math.cos((t / 8) * Math.PI * 2)), waves.gain.gain, 0.0045);
        // the siren that stopped just short of the top, heard through a far town's speaker
        const lp = lowpass(c, 1500);
        const pa = new PaChain(g.ctx, lp, 1.8, 3800);
        pa.setDistance(0.8, false, 0.01, at);
        const o = g.ctx.createOscillator();
        o.type = 'sine';
        o.frequency.setValueAtTime(520, at);
        o.frequency.linearRampToValueAtTime(690, at + 2.5);
        const og = g.ctx.createGain();
        og.gain.setValueAtTime(0, at);
        og.gain.linearRampToValueAtTime(0.004, at + 0.6);
        o.connect(og);
        og.connect(pa.input);
        o.start(onSample(g.ctx, at));
        umi = {
          beds: [waves],
          stop(t: number) {
            waves.stop(t);
            wm.stop(t);
            o.stop(t);
            setTimeout(() => pa.dispose(), Math.max(0, t - g.ctx.currentTime) * 1000 + 8000);
          },
        };
      }
    },
    stop(t) {
      hum.stop(t);
      umi?.stop(t);
    },
  };
});

export const CH2_AMBIENCE_IDS = [
  'amb_h_insects', 'amb_h_kusa', 'amb_h_tanada', 'amb_h_mizu', 'amb_h_wind', 'amb_h_yama', 'amb_h_hachi',
  'amb_h_fence', 'amb_h_barn_out', 'amb_h_barn', 'amb_h_house', 'amb_h_tomato', 'amb_h_school', 'amb_h_boukatou',
  'amb_h_tetsuya', 'amb_h_train', 'amb_h_pa_hum', 'amb_h_dawn', 'amb_tsugao_room',
];

