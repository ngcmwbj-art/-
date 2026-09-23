// SFX recipe engine: the notation of 40_audio 9.0 is pasted as strings and
// parsed once, e.g.
//   'sine f=740→520/40 env=1/60/0/20 dur=40 v=.16 flt=BP2400q1.5'
// Every SE call gets its own gain node (polyphony limits, pan override,
// stopSfx), per-call randomisation (11.5) and optional ducking (11.3).

import { captureVoices, cur, dbToGain, hasGraph, midiHz, noteMidi, voice, type VoiceHandle, type VoiceOpts, type Wave } from './engine';
import { seTrim, trimOr1 } from './mix';
import { duck } from './music';
import { registerSfx } from './index';
import { hooks, sfxInfo, type SfxOpts } from './registry';

export interface Layer {
  wave: Wave | 'fm';
  f?: number;
  f2?: number;
  glide?: number;
  A: number;
  D: number;
  S: number;
  R: number;
  dur: number;
  v: number;
  flt?: { type: BiquadFilterType; f: number; f2?: number; q?: number };
  fm?: { r: number; i0: number; i1?: number; ms?: number };
  am?: { rate: number; rate2?: number; ms?: number; depth: number };
  vib?: { rate: number; depth: number };
  pan?: number;
  pan2?: number;
  at: number;
  rev?: number;
  drive?: number;
  rep?: [number, number];
  rnd?: number;
  det?: number;
}

const cache = new Map<string, Layer>();

function freqOf(s: string): number {
  const n = Number(s);
  if (!Number.isNaN(n)) return n;
  const m = noteMidi(s);
  return Number.isNaN(m) ? 440 : midiHz(m);
}

export function parseLayer(spec: string): Layer {
  const hit = cache.get(spec);
  if (hit) return hit;
  const toks = spec.trim().split(/\s+/);
  const w = toks[0];
  const WAVES: Record<string, Wave | 'fm'> = { sine: 'sine', tri: 'triangle', saw: 'sawtooth', sq: 'square', p25: 'pulse25', p12: 'pulse12', noise: 'noise', fm: 'fm' };
  const L: Layer = { wave: WAVES[w] ?? 'sine', A: 1, D: 50, S: 0, R: 20, dur: 20, v: 0.05, at: 0 };
  for (const t of toks.slice(1)) {
    const eq = t.indexOf('=');
    if (eq < 0) continue;
    const k = t.slice(0, eq);
    const val = t.slice(eq + 1);
    switch (k) {
      case 'f': {
        const m = /^([^→/]+)(?:→([^/]+))?(?:\/(\d+))?$/.exec(val);
        if (m) {
          L.f = freqOf(m[1]);
          if (m[2]) L.f2 = freqOf(m[2]);
          if (m[3]) L.glide = Number(m[3]);
        }
        break;
      }
      case 'env': {
        const [a, d, s, r] = val.split('/').map(Number);
        Object.assign(L, { A: a, D: d, S: s, R: r });
        break;
      }
      case 'dur':
        L.dur = Number(val);
        break;
      case 'v':
        L.v = Number(val);
        break;
      case 'flt': {
        const m = /^(LP|HP|BP)(\d+)(?:→(\d+))?(?:q([\d.]+))?$/.exec(val);
        if (m) L.flt = { type: m[1] === 'LP' ? 'lowpass' : m[1] === 'HP' ? 'highpass' : 'bandpass', f: Number(m[2]), f2: m[3] ? Number(m[3]) : undefined, q: m[4] ? Number(m[4]) : undefined };
        break;
      }
      case 'fm': {
        const m = /^r([\d.]+):i([\d.]+)(?:→([\d.]+))?(?:\/(\d+))?$/.exec(val);
        if (m) L.fm = { r: Number(m[1]), i0: Number(m[2]), i1: m[3] !== undefined ? Number(m[3]) : undefined, ms: m[4] ? Number(m[4]) : undefined };
        break;
      }
      case 'am': {
        const m1 = /^([\d.]+)→([\d.]+)\/(\d+)(?:\/([\d.]+))?$/.exec(val);
        const m2 = /^([\d.]+)\/([\d.]+)$/.exec(val);
        if (m1) L.am = { rate: Number(m1[1]), rate2: Number(m1[2]), ms: Number(m1[3]), depth: m1[4] ? Number(m1[4]) : 0.8 };
        else if (m2) L.am = { rate: Number(m2[1]), depth: Number(m2[2]) };
        break;
      }
      case 'vib': {
        const [r, d] = val.split('/').map(Number);
        L.vib = { rate: r, depth: d };
        break;
      }
      case 'pan': {
        const [a, b] = val.split('→').map(Number);
        L.pan = a;
        if (b !== undefined && !Number.isNaN(b)) L.pan2 = b;
        break;
      }
      case 'at':
        L.at = Number(val);
        break;
      case 'rev':
        L.rev = Number(val);
        break;
      case 'drive':
        L.drive = Number(val);
        break;
      case 'rep': {
        const [n, ms] = val.split('x').map(Number);
        L.rep = [n, ms];
        break;
      }
      case 'rnd':
        L.rnd = parseFloat(val) / 100;
        break;
      case 'det':
        L.det = Number(val);
        break;
    }
  }
  cache.set(spec, L);
  return L;
}

export interface SeCtx {
  t: number;
  pitch: number;
  vol: number;
  /** Pan override (opts.pan). */
  pan?: number;
  dest: AudioNode;
  rev: number;
  opts: SfxOpts;
  /** Extra pitch source (e.g. follow the music's stage detune). */
  det?: AudioNode | null;
}

/** Play one recipe layer. `o` tweaks it (at/vol/pitch multipliers, overrides). */
export function layer(c: SeCtx, spec: string | Layer, o: { at?: number; vol?: number; pitch?: number; dur?: number; set?: Partial<Layer> } = {}): VoiceHandle[] {
  const L0 = typeof spec === 'string' ? parseLayer(spec) : spec;
  const L = o.set ? { ...L0, ...o.set } : L0;
  const out: VoiceHandle[] = [];
  const reps = L.rep?.[0] ?? 1;
  for (let r = 0; r < reps; r++) {
    const atMs = (o.at ?? 0) + L.at + r * (L.rep?.[1] ?? 0);
    const rf = L.rnd ? 1 + (Math.random() * 2 - 1) * L.rnd : 1;
    const rv = L.rnd ? 1 + (Math.random() * 2 - 1) * L.rnd : 1;
    const p = c.pitch * (o.pitch ?? 1) * rf;
    const durMs = o.dur ?? L.dur;
    const vo: VoiceOpts = {
      at: c.t + atMs / 1000,
      wave: L.wave === 'fm' ? 'sine' : L.wave,
      freq: L.wave === 'noise' ? 1000 * p : (L.f ?? 440) * p,
      freqEnd: L.f2 ? L.f2 * p : undefined,
      glide: L.glide !== undefined ? L.glide / 1000 : undefined,
      dur: Math.max(durMs, 1) / 1000,
      attack: Math.max(L.A, 0.4) / 1000,
      decay: L.D / 1000,
      sustain: L.S,
      release: Math.max(L.R, 3) / 1000,
      vol: L.v * c.vol * (o.vol ?? 1) * rv,
      dest: c.dest,
      detune: L.det,
      detuneSrc: c.det ?? null,
      drive: L.drive,
      reverb: L.rev ?? c.rev,
    };
    if (L.wave === 'noise' && L.f2 === undefined) vo.freqEnd = undefined;
    if (L.flt) vo.filter = { type: L.flt.type, freq: L.flt.f * p, freqEnd: L.flt.f2 ? L.flt.f2 * p : undefined, q: L.flt.q };
    if (L.wave === 'fm' && L.fm) vo.fm = { ratio: L.fm.r, index: L.fm.i0, indexEnd: L.fm.i1, indexTime: L.fm.ms };
    if (L.am) vo.am = { rate: L.am.rate, depth: L.am.depth, rateEnd: L.am.rate2, time: L.am.ms ? L.am.ms / 1000 : undefined };
    if (L.vib) vo.vibrato = { rate: L.vib.rate, depth: L.vib.depth };
    if (c.pan === undefined) {
      if (L.pan !== undefined) vo.pan = L.pan;
      if (L.pan2 !== undefined) vo.panEnd = L.pan2;
    }
    out.push(voice(vo));
  }
  return out;
}

// ---------------------------------------------------------------------------
// registration

export interface SeDef {
  label: string;
  group: string;
  layers?: string[];
  fn?: (c: SeCtx) => void;
  /** Whole-SE reverb send default ("全体 rev="). */
  rev?: number;
  /** Per-call random pitch / volume (fractions) — 11.5. */
  rand?: [number, number];
  /** Max simultaneous instances of this SE (11.5). */
  max?: number;
  /** Merge calls closer than this many ms (se_count). */
  merge?: number;
  duck?: 'heavy' | 'hit';
  /** Instance-level low-pass (e.g. far-away sounds). */
  lp?: number;
  /** Output bus. */
  bus?: 'sfx' | 'bell';
  /** Static pan default. */
  pan?: number;
}

interface Inst {
  id: string;
  gain: GainNode;
  start: number;
  end: number;
  voices: VoiceHandle[];
}

// Per-context bookkeeping: offline QA renders (report.ts) start their own
// clock at 0 and must not see the live game's instances, or each other's.
const activeBy = new WeakMap<BaseAudioContext, Inst[]>();
const lastCallBy = new WeakMap<BaseAudioContext, Map<string, number>>();
function activeOf(c: BaseAudioContext): Inst[] {
  let a = activeBy.get(c);
  if (!a) activeBy.set(c, (a = []));
  return a;
}
function lastCallOf(c: BaseAudioContext): Map<string, number> {
  let m = lastCallBy.get(c);
  if (!m) lastCallBy.set(c, (m = new Map()));
  return m;
}
const DEFAULT_MAX = 4;
const GLOBAL_MAX = 24;

function killInst(i: Inst, t: number, fade = 0.01): void {
  const g = i.gain.gain;
  g.cancelScheduledValues(t);
  g.setValueAtTime(g.value, t);
  g.linearRampToValueAtTime(0, t + fade);
  for (const v of i.voices) v.stop(fade + 0.005, t);
  i.end = t + fade;
}

export function playSe(id: string, def: SeDef, opts: SfxOpts = {}): Inst | null {
  if (!hasGraph()) return null;
  const g = cur();
  const now = g.ctx.currentTime;
  const t = Math.max(opts.at ?? now, now);
  const active = activeOf(g.ctx);
  const lastCall = lastCallOf(g.ctx);
  if (def.merge) {
    const last = lastCall.get(id) ?? -1;
    if (t - last < def.merge / 1000) return null;
    lastCall.set(id, t);
  }
  // housekeeping + polyphony
  for (let k = active.length - 1; k >= 0; k--) if (active[k].end < now) active.splice(k, 1);
  const mine = active.filter((a) => a.id === id && a.end > t);
  const max = def.max ?? DEFAULT_MAX;
  if (mine.length >= max) killInst(mine[0], t);
  if (active.length >= GLOBAL_MAX) killInst(active[0], t);

  const [rp, rv] = def.rand ?? [0, 0];
  const pitch = (opts.pitch ?? 1) * (rp ? 1 + (Math.random() * 2 - 1) * rp : 1);
  const vol = (opts.vol ?? 1) * (rv ? 1 + (Math.random() * 2 - 1) * rv : 1);
  const gain = g.ctx.createGain();
  gain.gain.value = trimOr1(seTrim(id));
  const head: AudioNode = gain;
  const dest = (opts as SfxOpts & { dest?: AudioNode }).dest ?? (def.bus === 'bell' ? g.bellBus : g.sfxBus);
  let tail: AudioNode = gain;
  if (def.lp) {
    const f = g.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = def.lp;
    tail.connect(f);
    tail = f;
  }
  const pan = opts.pan ?? def.pan;
  if (pan !== undefined && pan !== 0) {
    const p = g.ctx.createStereoPanner();
    p.pan.value = Math.max(-1, Math.min(1, pan));
    tail.connect(p);
    tail = p;
  }
  tail.connect(dest);
  const c: SeCtx = { t, pitch, vol, pan: opts.pan, dest: head, rev: def.rev ?? 0, opts };
  const voices: VoiceHandle[] = [];
  captureVoices(voices, () => {
    if (def.layers) for (const l of def.layers) layer(c, l);
    def.fn?.(c);
  });
  const end = voices.reduce((m, v) => Math.max(m, v.end), t + 0.05);
  const inst: Inst = { id, gain, start: t, end, voices };
  active.push(inst);
  if (def.duck === 'heavy') duck(dbToGain(-4), 0.005, 0.08, 0.25, t);
  else if (def.duck === 'hit') duck(dbToGain(-3), 0.005, 0.06, 0.2, t);
  if (!g.offline)
    setTimeout(() => {
      try {
        gain.disconnect();
      } catch {
        /* gone */
      }
    }, Math.max(0, end - now) * 1000 + 3000);
  return inst;
}

/** Stop every playing instance of an SE (e.g. the kazoo when the tsukkomi lands). */
export function stopSe(id: string, fade = 0.02): void {
  if (!hasGraph()) return;
  const c = cur().ctx;
  const t = c.currentTime;
  for (const i of activeOf(c)) if (i.id === id && i.end > t) killInst(i, t, fade);
}

export const seDefs = new Map<string, SeDef>();

export function se(id: string, def: SeDef): void {
  seDefs.set(id, def);
  sfxInfo.set(id, { label: def.label, group: def.group });
  registerSfx(id, (o) => {
    playSe(id, def, o);
  });
}

/** Call another SE's recipe inside this one (「〜と同じ」). */
export function sub(c: SeCtx, id: string, o: { at?: number; vol?: number; pitch?: number } = {}): void {
  const d = seDefs.get(id);
  if (!d) return;
  const c2: SeCtx = { ...c, t: c.t + (o.at ?? 0) / 1000, pitch: c.pitch * (o.pitch ?? 1), vol: c.vol * (o.vol ?? 1), rev: d.rev ?? c.rev };
  if (d.layers) for (const l of d.layers) layer(c2, l);
  d.fn?.(c2);
}

export { hooks };
