// WebAudio core: the mix graph (buses, reverbs, PA speaker chain, limiter)
// and a flexible one-shot synth voice. Everything musical / SFX / ambience is
// built from these primitives.
//
// The graph is built per BaseAudioContext so the exact same code can render
// into an OfflineAudioContext (see report.ts: loudness / clipping QA).
// `cur()` is the graph voice() writes into; it is the live graph except while
// an offline render is being scheduled (withGraph()).

export type SpaceId = 'outdoor' | 'room' | 'hall' | 'maigo' | 'battle' | 'night' | 'yama' | 'barn';

/**
 * The master sits this much above 11.1's 0.8. At the default volumes (BGM 7,
 * SE 8) the quiet songs were barely audible on a laptop (title −29 LUFS,
 * night −31) while the stamps already peaked high: the whole game is lifted,
 * and the heavy blows' target lowered (mix.ts), so the range between the
 * quietest music and the loudest hit narrows. Every calibration target in
 * mix.ts is 11.2's number plus this lift.
 */
export const MASTER_LIFT_DB = 3.5;

/** 40_audio 11.4 */
export const SPACES: Record<SpaceId, { len: number; decay: number; hp: number; send: number }> = {
  outdoor: { len: 0.8, decay: 4.0, hp: 300, send: 0.25 },
  room: { len: 0.45, decay: 5.0, hp: 350, send: 0.2 },
  hall: { len: 2.6, decay: 2.4, hp: 250, send: 0.45 },
  maigo: { len: 1.2, decay: 3.0, hp: 250, send: 0.35 },
  battle: { len: 1.1, decay: 3.2, hp: 300, send: 0.25 },
  night: { len: 1.8, decay: 3.0, hp: 250, send: 0.35 },
  // 53_ch2_audio 3.4: the mountain village at night (sound comes back thin
  // off the far slopes) and the cattle barn (a concrete floor under a steel roof)
  yama: { len: 2.2, decay: 3.0, hp: 250, send: 0.3 },
  barn: { len: 1.0, decay: 3.6, hp: 300, send: 0.22 },
};

// ---------------------------------------------------------------------------
// Impulse responses

const irCache = new Map<string, AudioBuffer>();

/**
 * Stereo, decorrelated noise IR with exponential decay, frequency-dependent
 * damping (highs die first) and a few early reflections for small rooms.
 */
export function makeIR(ctx: BaseAudioContext, len: number, decay: number, seed = 7, damp = 0.55): AudioBuffer {
  const key = `${ctx.sampleRate}:${len}:${decay}:${seed}:${damp}`;
  const hit = irCache.get(key);
  if (hit) return hit;
  const sr = ctx.sampleRate;
  const n = Math.max(1, Math.floor(sr * len));
  const ir = ctx.createBuffer(2, n, sr);
  let s = seed * 9301 + 49297;
  const rnd = () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch);
    let lp = 0;
    for (let i = 0; i < n; i++) {
      const p = i / n;
      // one-pole low-pass whose cutoff falls over the tail
      const a = 0.95 - damp * p;
      const x = rnd() * 2 - 1;
      lp += a * (x - lp);
      const env = Math.pow(1 - p, decay);
      // soft 4ms fade-in avoids a click at the head
      const fi = Math.min(1, i / (sr * 0.004));
      d[i] = lp * env * fi;
    }
    // early reflections (short rooms read as "rooms")
    const taps = len < 1 ? 5 : 3;
    for (let k = 0; k < taps; k++) {
      const at = Math.floor(sr * (0.007 + rnd() * 0.035));
      if (at < n) d[at] += (rnd() < 0.5 ? -1 : 1) * (0.5 - k * 0.07);
    }
    // normalise energy so different spaces have similar wet level
    let e = 0;
    for (let i = 0; i < n; i++) e += d[i] * d[i];
    const g = 1 / Math.sqrt(Math.max(1e-9, e)) * 0.9;
    for (let i = 0; i < n; i++) d[i] *= g;
  }
  irCache.set(key, ir);
  return ir;
}

/** The same IR as makeIR, one channel (a mono convolution is half the work). */
export function makeIRMono(ctx: BaseAudioContext, len: number, decay: number, seed = 7, damp = 0.55): AudioBuffer {
  const key = `m:${ctx.sampleRate}:${len}:${decay}:${seed}:${damp}`;
  const hit = irCache.get(key);
  if (hit) return hit;
  const st = makeIR(ctx, len, decay, seed, damp);
  const ir = ctx.createBuffer(1, st.length, st.sampleRate);
  ir.getChannelData(0).set(st.getChannelData(0));
  irCache.set(key, ir);
  return ir;
}

/** A GainNode that sums whatever comes in to one channel. */
export function monoSum(ctx: BaseAudioContext): GainNode {
  const g = ctx.createGain();
  g.channelCount = 1;
  g.channelCountMode = 'explicit';
  g.channelInterpretation = 'speakers';
  return g;
}

/**
 * Stereo from a mono reverb tail: left as is, right 17 ms later, panned
 * ∓0.6. A diffuse noise tail decorrelated by a Haas offset reads as wide as a
 * two-channel IR, for half the convolution work (15.3).
 */
export function spread(ctx: BaseAudioContext, from: AudioNode, to: AudioNode): void {
  const l = ctx.createStereoPanner();
  l.pan.value = -0.6;
  from.connect(l);
  l.connect(to);
  const d = ctx.createDelay(0.05);
  d.delayTime.value = 0.017;
  const r = ctx.createStereoPanner();
  r.pan.value = 0.6;
  from.connect(d);
  d.connect(r);
  r.connect(to);
}

/** Two convolvers with a crossfade so the space can change without clicks. */
export class Reverb {
  readonly input: GainNode;
  readonly output: GainNode;
  private hp: BiquadFilterNode;
  private convs: ConvolverNode[] = [];
  private gains: GainNode[] = [];
  private active = 0;
  constructor(private ctx: BaseAudioContext, ir: AudioBuffer, hpHz: number) {
    this.input = monoSum(ctx);
    this.output = ctx.createGain();
    this.hp = ctx.createBiquadFilter();
    this.hp.type = 'highpass';
    this.hp.frequency.value = hpHz;
    this.hp.Q.value = 0.7;
    this.input.connect(this.hp);
    const sum = ctx.createGain();
    spread(ctx, sum, this.output);
    for (let i = 0; i < 2; i++) {
      const c = ctx.createConvolver();
      c.normalize = false;
      const g = ctx.createGain();
      g.gain.value = i === 0 ? 1 : 0;
      c.connect(g);
      g.connect(sum);
      this.convs.push(c);
      this.gains.push(g);
    }
    this.convs[0].buffer = ir;
    this.hp.connect(this.convs[0]);
  }
  set(ir: AudioBuffer, hpHz: number, xfade = 0.3): void {
    const t = this.ctx.currentTime;
    const next = 1 - this.active;
    const prev = this.active;
    const c = this.convs[next];
    try {
      this.hp.disconnect(c);
    } catch {
      /* not connected */
    }
    c.buffer = ir;
    this.hp.connect(c);
    this.hp.frequency.setTargetAtTime(hpHz, t, 0.05);
    const gn = this.gains[next].gain;
    const gp = this.gains[prev].gain;
    gn.cancelScheduledValues(t);
    gp.cancelScheduledValues(t);
    gn.setValueAtTime(0, t);
    gn.linearRampToValueAtTime(1, t + xfade);
    gp.setValueAtTime(gp.value, t);
    gp.linearRampToValueAtTime(0, t + xfade);
    this.active = next;
    const old = this.convs[prev];
    if (!(this.ctx instanceof OfflineAudioContext))
      setTimeout(() => {
        if (this.active !== prev)
          try {
            this.hp.disconnect(old);
          } catch {
            /* already */
          }
      }, (xfade + 2.8) * 1000);
  }
}

// ---------------------------------------------------------------------------
// PA speaker chain (40_audio 3.6 bus_pa; 53_ch2_audio 3.3 the mountain type)

/** The shape of the valley the speaker sings into (53_ch2_audio 3.3). */
export type PaMode = 'town' | 'yama';

interface PaModeDef {
  /** Echo taps: delay (s), level (dB), pan. */
  taps: [number, number, number][];
  /** The chain's own reverb (s). */
  rev: number;
  lp: number;
  drive: number;
}

export const PA_MODES: Record<PaMode, PaModeDef> = {
  // 夕鳴町: the houses across the street answer at once
  town: { taps: [[0.14, -9, -0.3], [0.31, -14, 0.4], [0.62, -20, -0.1]], rev: 1.8, lp: 3800, drive: 1.6 },
  // 星見台: the far slope of the valley answers late; an old, rounder speaker
  yama: { taps: [[0.45, -8, -0.3], [0.95, -13, 0.4], [1.5, -19, -0.1]], rev: 2.6, lp: 3200, drive: 1.3 },
};

/** One voicing of the speaker: drive → band → echo taps → its own reverb. */
interface PaBranch {
  mode: PaMode;
  /** Crossfade gate at the head (mode changes fade the input, never the tails). */
  gate: GainNode;
  hp: BiquadFilterNode;
  echoFb: GainNode[];
  wet: GainNode;
  out: GainNode;
  linked: boolean;
}

const WET_BASE = 0.35;

export class PaChain {
  private readonly in: GainNode;
  /** Pitch bus for everything played through the PA (cents). */
  readonly detune: ConstantSourceNode;
  /** Final gate: 0 cuts the chime *and* its echoes / reverb. */
  readonly cut: GainNode;
  /** The active voicing's echo feedback gains (swelled for "the echo answers"). */
  get echoFb(): GainNode[] {
    return this.branch.echoFb;
  }
  private readonly branches = new Map<PaMode, PaBranch>();
  private branch: PaBranch;
  private readonly sum: GainNode;
  /** Where the chain ends (the cut, or the distance stage once it is used). */
  private tail: AudioNode;
  private dist: { gain: GainNode; lp: BiquadFilterNode } | null = null;
  private distD = 0;
  private distIndoor = false;
  private distOverride: number | null = null;
  /**
   * A wave shaper never reports silence, so a connected PA chain keeps its
   * filters, echo lines and reverb running forever (~1 % of a core, 15.3).
   * The chain is attached to its destination only while it is in use: any
   * access to `input` (or a swell / cut / open) wakes it, and it detaches
   * after 8 s without use (the mountain's echoes are long: 53 14.4), when its
   * echoes and reverb have long died away.
   */
  private awake = false;
  private lastUse = 0;
  private sleepTimer: ReturnType<typeof setInterval> | null = null;
  private dest: AudioNode;
  get input(): GainNode {
    this.wake();
    return this.in;
  }
  get mode(): PaMode {
    return this.branch.mode;
  }
  private get offline(): boolean {
    return typeof OfflineAudioContext !== 'undefined' && this.ctx instanceof OfflineAudioContext;
  }
  wake(until = this.ctx.currentTime): void {
    this.lastUse = Math.max(this.lastUse, until, this.ctx.currentTime);
    if (this.awake) return;
    this.awake = true;
    this.tail.connect(this.dest);
    if (this.offline) return;
    if (!this.sleepTimer)
      this.sleepTimer = setInterval(() => {
        if (this.ctx.currentTime - this.lastUse < 8) return;
        this.awake = false;
        try {
          this.tail.disconnect(this.dest);
        } catch {
          /* gone */
        }
        if (this.sleepTimer) clearInterval(this.sleepTimer);
        this.sleepTimer = null;
      }, 1000);
  }
  /** Detach for good (the owner is gone). */
  dispose(): void {
    if (this.sleepTimer) clearInterval(this.sleepTimer);
    this.sleepTimer = null;
    this.awake = false;
    try {
      this.tail.disconnect();
      this.detune.stop();
    } catch {
      /* gone */
    }
  }
  constructor(
    private ctx: BaseAudioContext,
    dest: AudioNode,
    private reverbLen = 1.8,
    private lp = 3800,
  ) {
    this.dest = dest;
    this.in = ctx.createGain();
    this.sum = ctx.createGain();
    this.cut = ctx.createGain();
    this.sum.connect(this.cut);
    this.tail = this.cut;
    this.branch = this.makeBranch('town');
    this.detune = ctx.createConstantSource();
    this.detune.offset.value = 0;
    this.detune.start();
  }

  private makeBranch(mode: PaMode, gateLevel = 1): PaBranch {
    const ctx = this.ctx;
    const def = PA_MODES[mode];
    // a custom chain (the title's far speaker, 段階2's distant PA) keeps its own reverb and band
    const revLen = mode === 'town' ? this.reverbLen : def.rev;
    const lpHz = mode === 'town' ? this.lp : def.lp;
    const gate = ctx.createGain();
    gate.gain.value = gateLevel;
    this.in.connect(gate);
    const sh = ctx.createWaveShaper();
    sh.curve = driveCurve(def.drive);
    sh.oversample = '2x';
    const pre = ctx.createGain();
    pre.gain.value = 1.4;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 380;
    hp.Q.value = 0.7;
    const lpf = ctx.createBiquadFilter();
    lpf.type = 'lowpass';
    lpf.frequency.value = lpHz;
    lpf.Q.value = 0.9;
    const post = ctx.createGain();
    post.gain.value = 0.6;
    gate.connect(pre);
    pre.connect(sh);
    sh.connect(hp);
    hp.connect(lpf);
    lpf.connect(post);
    const mix = ctx.createGain();
    post.connect(mix);
    const echoFb: GainNode[] = [];
    for (const [dt, db, pan] of def.taps) {
      const d = ctx.createDelay(2);
      d.delayTime.value = dt;
      const g = ctx.createGain();
      g.gain.value = dbToGain(db);
      const p = ctx.createStereoPanner();
      p.pan.value = pan;
      // feedback path (normally ~0; swelled for the "echo three times")
      const fb = ctx.createGain();
      fb.gain.value = 0.0;
      post.connect(d);
      d.connect(g);
      g.connect(p);
      p.connect(mix);
      d.connect(fb);
      fb.connect(d);
      echoFb.push(fb);
    }
    const rev = ctx.createConvolver();
    rev.normalize = false;
    rev.buffer = makeIRMono(ctx, revLen, 3.0, 23, 0.6);
    const wet = ctx.createGain();
    wet.gain.value = WET_BASE;
    const revIn = monoSum(ctx);
    mix.connect(revIn);
    revIn.connect(rev);
    spread(ctx, rev, wet);
    const out = ctx.createGain();
    mix.connect(out);
    wet.connect(out);
    out.connect(this.sum);
    const b: PaBranch = { mode, gate, hp, echoFb, wet, out, linked: true };
    this.branches.set(mode, b);
    return b;
  }

  /**
   * setPaMode (53 3.3): the same bus, the other valley. The input crossfades in
   * 0.3 s; what the old voicing already sent keeps echoing until it dies away.
   */
  setMode(mode: PaMode, xfade = 0.3, at = this.ctx.currentTime): void {
    if (mode === this.branch.mode) return;
    const prev = this.branch;
    const next = this.branches.get(mode) ?? this.makeBranch(mode, 0);
    if (!next.linked) {
      next.out.connect(this.sum);
      next.linked = true;
    }
    const f = Math.max(0.005, xfade);
    for (const [b, to] of [
      [prev, 0],
      [next, 1],
    ] as [PaBranch, number][]) {
      const g = b.gate.gain;
      g.cancelScheduledValues(at);
      g.setValueAtTime(g.value, at);
      g.linearRampToValueAtTime(to, at + f);
    }
    this.branch = next;
    this.applyDistance(0.05, at);
    // the old voicing is unhooked once its tails are gone (it would run forever)
    if (!this.offline)
      setTimeout(() => {
        if (this.branch === prev || !prev.linked) return;
        try {
          prev.out.disconnect(this.sum);
        } catch {
          /* gone */
        }
        prev.linked = false;
      }, (f + 7) * 1000);
  }

  /**
   * setPaDistance (53 3.3): d = 0 under the speaker … 1 at the far end of the
   * village; indoors a further −12 dB behind a 1.2 kHz wall.
   */
  setDistance(d: number, indoor = false, ramp = 0.3, at = this.ctx.currentTime): void {
    this.distD = Math.max(0, Math.min(1, d));
    this.distIndoor = indoor;
    this.applyDistance(ramp, at);
  }
  /** While a battle plays the speaker is always right there (53 3.3: d = 0); null = the field's value again. */
  overrideDistance(d: number | null, ramp = 0.1, at = this.ctx.currentTime): void {
    this.distOverride = d;
    this.applyDistance(ramp, at);
  }
  get distance(): { d: number; indoor: boolean; override: number | null } {
    return { d: this.distD, indoor: this.distIndoor, override: this.distOverride };
  }
  private applyDistance(ramp: number, at: number): void {
    const d = this.distOverride ?? this.distD;
    const indoor = this.distOverride === null && this.distIndoor;
    const yama = this.branch.mode === 'yama';
    // the town (40_audio) never moves its speaker: no stage there until it is asked for
    if (!this.dist && !yama && d === 0 && !indoor) return;
    const st = this.ensureDist();
    const gain = dbToGain(-10 * d + (indoor ? -12 : 0));
    let lp = yama || d > 0 ? 3800 * (1 - 0.6 * d) : 20000;
    if (indoor) lp = Math.min(lp, 1200);
    const tc = Math.max(0.005, ramp) / 3;
    st.gain.gain.setTargetAtTime(gain, at, tc);
    st.lp.frequency.setTargetAtTime(lp, at, tc);
    // far away, more of what arrives is the valley's reverb
    for (const b of this.branches.values()) b.wet.gain.setTargetAtTime(WET_BASE * (1 + d), at, tc);
  }
  private ensureDist(): { gain: GainNode; lp: BiquadFilterNode } {
    if (this.dist) return this.dist;
    const gain = this.ctx.createGain();
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 20000;
    lp.Q.value = 0.707;
    this.cut.connect(gain);
    gain.connect(lp);
    if (this.awake) {
      try {
        this.cut.disconnect(this.dest);
      } catch {
        /* not connected */
      }
      lp.connect(this.dest);
    }
    this.tail = lp;
    this.dist = { gain, lp };
    return this.dist;
  }

  /** The speaker's low end for one moment (53 8.4: the last chime an octave down). */
  lowEnd(hz: number, ramp = 0.1, holdS = 4, at = this.ctx.currentTime): void {
    this.wake(at + holdS + 2);
    for (const b of this.branches.values()) {
      const f = b.hp.frequency;
      f.cancelScheduledValues(at);
      f.setValueAtTime(f.value, at);
      f.linearRampToValueAtTime(hz, at + ramp);
      f.setValueAtTime(hz, at + holdS);
      f.linearRampToValueAtTime(380, at + holdS + 0.5);
    }
  }

  /** Feedback swell for "the echo answers three times" (13.2). */
  swell(amount = 0.6, hold = 2.0, at = this.ctx.currentTime): void {
    this.wake(at + hold + 1 + (this.branch.mode === 'yama' ? 3 : 0));
    for (const fb of this.echoFb) {
      fb.gain.cancelScheduledValues(at);
      fb.gain.setValueAtTime(fb.gain.value, at);
      fb.gain.linearRampToValueAtTime(amount, at + 0.05);
      fb.gain.setValueAtTime(amount, at + hold);
      fb.gain.linearRampToValueAtTime(0, at + hold + 0.6);
    }
  }
  /** 5 o'clock cut: pitch sags a semitone while everything (tails too) is gated off. */
  cutNow(at = this.ctx.currentTime, restoreAfter = 0.2): void {
    this.wake(at + 2.5);
    const d = this.detune.offset;
    const c = this.cut.gain;
    d.cancelScheduledValues(at);
    c.cancelScheduledValues(at);
    d.setValueAtTime(0, at);
    d.linearRampToValueAtTime(-100, at + 0.08);
    c.setValueAtTime(1, at);
    c.linearRampToValueAtTime(0, at + 0.08);
    d.setValueAtTime(0, at + 0.08 + restoreAfter);
    // The pitch is restored after `restoreAfter` (ready for the next chime),
    // but the gate stays shut until the echo / reverb energy has died away —
    // reopening at once would let the tail "come back". A new note reopens it
    // early (open()), where the tail is masked by the new attack.
    c.setValueAtTime(0, at + 0.08 + restoreAfter);
    for (const fb of this.echoFb) {
      fb.gain.cancelScheduledValues(at);
      fb.gain.setValueAtTime(0, at);
    }
    this.closedUntil = at + 2.4;
    c.setValueAtTime(0, at + 2.4);
    c.linearRampToValueAtTime(1, at + 2.45);
  }
  closedUntil = 0;
  /** Reopen the gate for a new note (after a cut). */
  open(at: number): void {
    this.wake(at);
    if (at >= this.closedUntil) return;
    const c = this.cut.gain;
    c.cancelScheduledValues(at);
    c.setValueAtTime(0, at);
    c.linearRampToValueAtTime(1, at + 0.006);
    this.closedUntil = 0;
  }
}

// ---------------------------------------------------------------------------
// The graph

export interface Graph {
  ctx: BaseAudioContext;
  offline: boolean;
  master: GainNode;
  comp: DynamicsCompressorNode;
  limiter: DynamicsCompressorNode;
  /** Final user volumes (settings). */
  musicUser: GainNode;
  seUser: GainNode;
  musicBus: GainNode;
  musicDuck: GainNode;
  musicMute: GainNode;
  musicFilter: BiquadFilterNode;
  /** muffle (menu) level. */
  musicMuffle: GainNode;
  sfxBus: GainNode;
  sfxDuck: GainNode;
  bellBus: GainNode;
  voiceBus: GainNode;
  ambBus: GainNode;
  ambDuck: GainNode;
  fxRev: Reverb;
  fxSend: GainNode;
  pa: PaChain;
  noise: AudioBuffer;
  space: SpaceId;
  /** Tap in front of the compressor (for the offline report). */
  preTap: GainNode;
  bypassDynamics: boolean;
}

let live: Graph | null = null;
let current: Graph | null = null;

export function audioCtx(): AudioContext | null {
  return (live?.ctx as AudioContext) ?? null;
}

export function liveGraph(): Graph | null {
  return live;
}

/** The graph currently being scheduled into. */
export function cur(): Graph {
  return (current ?? live)!;
}

export function hasGraph(): boolean {
  return !!(current ?? live);
}

export function now(): number {
  return cur().ctx.currentTime;
}

/** Run fn with `g` as the target graph (synchronous scheduling only). */
export function withGraph<T>(g: Graph, fn: () => T): T {
  const prev = current;
  current = g;
  try {
    return fn();
  } finally {
    current = prev;
  }
}

/** Legacy accessor kept for older callers. */
export function buses() {
  const g = cur();
  return { master: g.master, music: g.musicBus, sfx: g.sfxBus, reverb: g.fxSend, musicDuck: g.musicDuck };
}

export function buildGraph(ctx: BaseAudioContext, opts: { bypassDynamics?: boolean } = {}): Graph {
  const offline = typeof OfflineAudioContext !== 'undefined' && ctx instanceof OfflineAudioContext;
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -12;
  comp.knee.value = 10;
  comp.ratio.value = 3;
  comp.attack.value = 0.004;
  comp.release.value = 0.18;
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -2;
  limiter.knee.value = 0;
  limiter.ratio.value = 20;
  limiter.attack.value = 0.001;
  limiter.release.value = 0.06;
  const preTap = ctx.createGain();
  const master = ctx.createGain();
  master.gain.value = 0.8 * dbToGain(MASTER_LIFT_DB);
  master.connect(preTap);
  // −1 dB ceiling after the limiter: the compressors add their own make-up
  // gain, and the loudest moment of the game at volume 10 / 10 must stay
  // clear of full scale (report.ts stress test).
  const ceiling = ctx.createGain();
  ceiling.gain.value = dbToGain(-1);
  ceiling.connect(ctx.destination);
  if (opts.bypassDynamics) {
    preTap.connect(ctx.destination);
  } else {
    preTap.connect(comp);
    comp.connect(limiter);
    limiter.connect(ceiling);
  }

  // ---- music: musicBus(0.55) → musicDuck → musicMute → musicFilter → musicUser → master
  const musicUser = ctx.createGain();
  musicUser.gain.value = volCurve(7);
  musicUser.connect(master);
  const musicMuffle = ctx.createGain();
  musicMuffle.connect(musicUser);
  const musicFilter = ctx.createBiquadFilter();
  musicFilter.type = 'lowpass';
  musicFilter.frequency.value = 20000;
  musicFilter.Q.value = 0.707;
  musicFilter.connect(musicMuffle);
  const musicMute = ctx.createGain();
  musicMute.connect(musicFilter);
  const musicDuck = ctx.createGain();
  musicDuck.connect(musicMute);
  const musicBus = ctx.createGain();
  musicBus.gain.value = 0.55;
  musicBus.connect(musicDuck);

  // ---- SE side: sfxBus(0.8) → sfxDuck → seUser → master
  const seUser = ctx.createGain();
  seUser.gain.value = volCurve(8);
  seUser.connect(master);
  const sfxDuck = ctx.createGain();
  sfxDuck.connect(seUser);
  const sfxBus = ctx.createGain();
  sfxBus.gain.value = 0.8;
  sfxBus.connect(sfxDuck);
  const bellBus = ctx.createGain();
  bellBus.gain.value = 0.8;
  bellBus.connect(seUser);
  const voiceBus = ctx.createGain();
  voiceBus.gain.value = 0.7;
  voiceBus.connect(sfxBus);
  const ambDuck = ctx.createGain();
  ambDuck.connect(seUser);
  const ambBus = ctx.createGain();
  ambBus.gain.value = 0.6;
  ambBus.connect(ambDuck);

  const sp = SPACES.outdoor;
  const fxRev = new Reverb(ctx, makeIRMono(ctx, sp.len, sp.decay, 5), sp.hp);
  const fxSend = ctx.createGain();
  fxSend.gain.value = sp.send / 0.35;
  fxSend.connect(fxRev.input);
  fxRev.output.gain.value = 0.35;
  fxRev.output.connect(sfxBus);

  const pa = new PaChain(ctx, sfxBus);

  const noise = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 4), ctx.sampleRate);
  const nd = noise.getChannelData(0);
  let s = 12345;
  for (let i = 0; i < nd.length; i++) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    nd[i] = (s / 0x7fffffff) * 2 - 1;
  }
  return {
    ctx, offline, master, comp, limiter, musicUser, seUser, musicBus, musicDuck, musicMute, musicFilter, musicMuffle,
    sfxBus, sfxDuck, bellBus, voiceBus, ambBus, ambDuck, fxRev, fxSend, pa, noise, space: 'outdoor', preTap,
    bypassDynamics: !!opts.bypassDynamics,
  };
}

/** Create the live AudioContext (must be called from a user gesture). */
export function initAudio(): AudioContext {
  if (live) {
    const c = live.ctx as AudioContext;
    if (c.state === 'suspended') void c.resume();
    return c;
  }
  const ctx = new AudioContext({ latencyHint: 'interactive' });
  live = buildGraph(ctx);
  return ctx;
}

export function noiseBuffer(): AudioBuffer {
  return cur().noise;
}

export function setSpaceOn(g: Graph, id: SpaceId, xfade = 0.3): void {
  const sp = SPACES[id];
  if (!sp) return;
  g.space = id;
  g.fxRev.set(makeIRMono(g.ctx, sp.len, sp.decay, 5 + id.length), sp.hp, xfade);
  const t = g.ctx.currentTime;
  g.fxSend.gain.setTargetAtTime(sp.send / 0.35, t, xfade / 3);
}

// ---------------------------------------------------------------------------
// helpers

export function dbToGain(db: number): number {
  return Math.pow(10, db / 20);
}
export function gainToDb(g: number): number {
  return 20 * Math.log10(Math.max(1e-9, g));
}
/** Settings slider (0..10) → gain: (v/10)^2. */
export function volCurve(v: number): number {
  const x = Math.max(0, Math.min(10, v)) / 10;
  return x * x;
}

const curveCache = new Map<number, Float32Array<ArrayBuffer>>();
export function driveCurve(drive: number): Float32Array<ArrayBuffer> {
  const k = Math.round((1 + drive) * 100) / 100;
  let c = curveCache.get(k);
  if (!c) {
    const n = 1024;
    c = new Float32Array(new ArrayBuffer(n * 4));
    const norm = Math.tanh(k);
    for (let i = 0; i < n; i++) {
      const x = (i / (n - 1)) * 2 - 1;
      c[i] = Math.tanh(k * x) / norm;
    }
    curveCache.set(k, c);
  }
  return c;
}

const waveCache = new WeakMap<BaseAudioContext, Map<string, PeriodicWave>>();
/** Band-limited pulse wave with the given duty (0.5 = square). */
export function pulseWave(c: BaseAudioContext, duty: number): PeriodicWave {
  let m = waveCache.get(c);
  if (!m) {
    m = new Map();
    waveCache.set(c, m);
  }
  const key = `p${duty}`;
  let w = m.get(key);
  if (!w) {
    const n = 96;
    const real = new Float32Array(n);
    const imag = new Float32Array(n);
    for (let k = 1; k < n; k++) {
      // Lanczos sigma softens the Gibbs ringing a little (less "fizzy" chip tone)
      const sigma = Math.sin((Math.PI * k) / n) / ((Math.PI * k) / n);
      real[k] = ((2 / (k * Math.PI)) * Math.sin(k * Math.PI * duty)) * sigma;
    }
    w = c.createPeriodicWave(real, imag);
    m.set(key, w);
  }
  return w;
}

/** A custom PeriodicWave built once per context and key. */
export function cachedWave(c: BaseAudioContext, key: string, build: () => { real: Float32Array; imag: Float32Array; normalize?: boolean }): PeriodicWave {
  let m = waveCache.get(c);
  if (!m) {
    m = new Map();
    waveCache.set(c, m);
  }
  let w = m.get(key);
  if (!w) {
    const b = build();
    w = c.createPeriodicWave(b.real, b.imag, { disableNormalization: !b.normalize });
    m.set(key, w);
  }
  return w;
}

// Shared per-destination effects (ensembles, formant banks) own oscillators
// or connections that must be released with the song that owns the
// destination: SongPlayer.dispose() calls releaseShared(part input).
const disposers = new WeakMap<AudioNode, (() => void)[]>();
export function onRelease(dest: AudioNode, fn: () => void): void {
  let l = disposers.get(dest);
  if (!l) disposers.set(dest, (l = []));
  l.push(fn);
}
export function releaseShared(dest: AudioNode): void {
  const l = disposers.get(dest);
  if (!l) return;
  disposers.delete(dest);
  for (const f of l)
    try {
      f();
    } catch {
      /* gone */
    }
}

// ---------------------------------------------------------------------------
// Voice

export type Wave =
  | 'sine' | 'triangle' | 'sawtooth' | 'square' | 'noise' | 'pulse25' | 'pulse12'
  | 'tri' | 'saw' | 'sq' | 'p25' | 'p12';

export interface FmOpts {
  ratio: number;
  index: number;
  indexEnd?: number;
  /** ms to reach indexEnd (exponential approach). */
  indexTime?: number;
  /** ms linear rise from 0 to index before the decay (brass). */
  indexAttack?: number;
  /** Fixed modulator frequency instead of ratio (Hz). */
  fixed?: number;
}

export interface VoiceOpts {
  wave?: Wave;
  freq?: number;
  /** Frequency at the end of the glide (exponential). */
  freqEnd?: number;
  /** Glide time in seconds (defaults to dur). */
  glide?: number;
  /** Delay before the glide starts (s). */
  glideDelay?: number;
  /** Portamento: start from this frequency and glide to freq over `porta` s. */
  portaFrom?: number;
  porta?: number;
  /** Scoop: start `scoop` cents off and slide to 0 over scoopTime s. */
  scoop?: number;
  scoopTime?: number;
  dur?: number; // seconds (gate length)
  vol?: number;
  attack?: number;
  decay?: number;
  sustain?: number; // 0..1
  release?: number;
  /** Envelope shape: exponential decays (default) or linear (legacy). */
  linear?: boolean;
  /** Reverse swell: linear 0→1 across the gate, then a short release. */
  swell?: boolean;
  detune?: number; // cents
  /** AudioNode whose output (cents) is added to detune (music pitch bus). */
  detuneSrc?: AudioNode | null;
  /** Second pitch source (e.g. PA pitch bus). */
  detuneSrc2?: AudioNode | null;
  vibrato?: { rate: number; depth: number; delay?: number; shape?: OscillatorType };
  fm?: FmOpts;
  fm2?: FmOpts;
  am?: { rate: number; depth: number; rateEnd?: number; time?: number; shape?: OscillatorType };
  filter?: { type: BiquadFilterType; freq: number; q?: number; freqEnd?: number; time?: number; gain?: number };
  /** Formant pair (two parallel band-passes) mixed with the dry signal. */
  formant?: { f1: number; f2: number; q1?: number; q2?: number; mix?: number; lp?: number };
  drive?: number;
  pan?: number;
  panEnd?: number;
  reverb?: number;
  revDest?: AudioNode;
  bus?: 'sfx' | 'music' | 'voice' | 'amb' | 'pa' | 'bell';
  dest?: AudioNode;
  /** Absolute start time (ctx.currentTime based). */
  at?: number;
  /** Start offset into the noise buffer (decorrelates layered noises). */
  noiseOffset?: number;
  /** Extra oscillators on the same pitch / envelope / filter (level, wave, cents). */
  layers?: { wave: Wave; vol: number; detune?: number }[];
  /** Level of the main oscillator when `layers` are mixed in (default 1). */
  layerMain?: number;
  /** A static filter and the reverb send may be shared with every voice of the same dest (15.3). */
  shareFilter?: boolean;
  /** Filter frequency / Q per render quantum (music: EG sweeps, LFOs). */
  krate?: boolean;
  /** A drum hit: dropped rather than delayed when it comes too late. */
  drum?: boolean;
  /** A custom waveform for the main oscillator (overrides `wave`). */
  periodic?: (c: BaseAudioContext) => PeriodicWave;
}

export interface VoiceHandle {
  start: number;
  end: number;
  /** Peak level (v) — the BGM voice cap cuts the quietest first (11.5). */
  vol: number;
  src: AudioScheduledSourceNode;
  env: GainNode;
  freq: AudioParam | null;
  detune: AudioParam | null;
  stop(fade?: number, at?: number): void;
}

const DUMMY: VoiceHandle = {
  start: 0,
  end: 0,
  vol: 0,
  src: null as unknown as AudioScheduledSourceNode,
  env: null as unknown as GainNode,
  freq: null,
  detune: null,
  stop() {},
};

/**
 * Voices created while capture lists are open are appended to every open
 * list (an SE fired from inside a song's step lands in both the SE instance
 * and the song's step record).
 */
const captures: VoiceHandle[][] = [];
export function captureVoices<T>(list: VoiceHandle[], fn: () => T): T {
  captures.push(list);
  try {
    return fn();
  } finally {
    captures.pop();
  }
}
/** Report a handle made outside voice() (pads, choir) to the open capture lists. */
export function captured(h: VoiceHandle): VoiceHandle {
  for (const l of captures) l.push(h);
  return h;
}

// ---------------------------------------------------------------------------
// Late notes (40_audio 15.2): the scheduler runs ahead of the clock, but a
// long main-thread stall can still make it schedule a note whose time has
// already passed. Pulling such a note to "now" piles every late note onto the
// same instant (a flam of a dozen hits). While a live song is being scheduled
// the policy below is set: short late notes are dropped, long ones start now.

export interface LateStats {
  /** Notes scheduled after their start time (live contexts only). */
  late: number;
  /** Of those, dropped (short notes / drums late by more than the tolerance). */
  dropped: number;
  /** Worst lateness seen (s). */
  worst: number;
}
export const lateStats: { music: LateStats; other: LateStats } = {
  music: { late: 0, dropped: 0, worst: 0 },
  other: { late: 0, dropped: 0, worst: 0 },
};
let latePolicy: { tol: number; longMin: number } | null = null;
/** Run fn with the music late-note policy (songs' live scheduling). */
export function withLatePolicy<T>(tol: number, longMin: number, fn: () => T): T {
  const prev = latePolicy;
  latePolicy = { tol, longMin };
  try {
    return fn();
  } finally {
    latePolicy = prev;
  }
}
/**
 * The start time for a note asked for at `at` (null = drop it). Offline
 * renders are never late; the live context counts lateness per category.
 */
export function startTimeFor(c: BaseAudioContext, at: number | undefined, dur: number, drum = false): number | null {
  const now = c.currentTime;
  if (at === undefined || at >= now) return at ?? now;
  const late = now - at;
  if (late < 0.004) return now;
  const st = latePolicy ? lateStats.music : lateStats.other;
  st.late++;
  st.worst = Math.max(st.worst, late);
  if (latePolicy && late > latePolicy.tol && (drum || dur <= latePolicy.longMin)) {
    st.dropped++;
    return null;
  }
  return now;
}

let noiseRot = 0;

let offSeed = 1;
/**
 * Randomness for sound (musicbox comb wear, coin scatter, crowd timings):
 * Math.random while the live game plays; a fixed sequence while an offline
 * QA render is scheduled, restarted by resetOfflineState() at the start of
 * every render, so the same render measures the same take every run.
 */
export function arand(): number {
  const g = current ?? live;
  if (g?.offline) {
    offSeed = (Math.imul(offSeed, 1103515245) + 12345) & 0x7fffffff;
    return offSeed / 0x7fffffff;
  }
  return Math.random();
}
/** QA: restart the offline randomness and the noise read-head (report.ts render()). */
export function resetOfflineState(): void {
  offSeed = 1;
  noiseRot = 0;
}

/** QA: when set, every voice() appends a record (offline piano-roll renders). */
export let noteLog: { t: number; dur: number; freq: number; vol: number; wave: string }[] | null = null;
export function setNoteLog(l: typeof noteLog): void {
  noteLog = l;
}

function waveOf(w: Wave): Wave {
  switch (w) {
    case 'tri': return 'triangle';
    case 'saw': return 'sawtooth';
    case 'sq': return 'square';
    case 'p25': return 'pulse25';
    case 'p12': return 'pulse12';
    default: return w;
  }
}

function busNode(g: Graph, b: VoiceOpts['bus']): AudioNode {
  switch (b) {
    case 'music': return g.musicBus;
    case 'voice': return g.voiceBus;
    case 'amb': return g.ambBus;
    case 'pa': return g.pa.input;
    case 'bell': return g.bellBus;
    default: return g.sfxBus;
  }
}

function setWave(c: BaseAudioContext, osc: OscillatorNode, wave: Wave): void {
  if (wave === 'pulse25') osc.setPeriodicWave(pulseWave(c, 0.25));
  else if (wave === 'pulse12') osc.setPeriodicWave(pulseWave(c, 0.125));
  else osc.type = wave as OscillatorType;
}

/**
 * Pitch modulation (the song's pitch bus, vibrato, tape wobble, bends) is
 * read once per 128-sample render quantum: sub-audio pitch moves are
 * indistinguishable at 375 Hz, and an a-rate detune makes the browser run an
 * exp2() per sample per oscillator (2.6× the cost of the oscillator itself).
 * FM stays audio-rate: it modulates `frequency`, not `detune`.
 */
function kRate(p: AudioParam): void {
  try {
    p.automationRate = 'k-rate';
  } catch {
    /* fixed-rate param */
  }
}

/**
 * Static filters shared by every voice of one destination (15.3): a part's
 * notes all sing into the same low-pass / band-pass, placed after their
 * envelopes (a linear filter after a slow envelope sounds the same as before
 * it), with the reverb send taken after the filter.
 */
const sharedChains = new WeakMap<AudioNode, WeakMap<AudioNode, Map<string, AudioNode>>>();
function sharedOut(c: BaseAudioContext, dest: AudioNode, rev: AudioNode | null, revLevel: number, f: VoiceOpts['filter'] | undefined): AudioNode {
  let byRev = sharedChains.get(dest);
  if (!byRev) sharedChains.set(dest, (byRev = new WeakMap()));
  const rk = rev ?? dest;
  let m = byRev.get(rk);
  if (!m) byRev.set(rk, (m = new Map()));
  const key = `${f ? `${f.type}|${Math.round(f.freq)}|${f.q ?? 0.707}|${f.gain ?? ''}` : '-'}|${rev ? Math.round(revLevel * 1000) : 0}`;
  let head = m.get(key);
  if (!head) {
    let node: AudioNode;
    if (f) {
      const fl = c.createBiquadFilter();
      fl.type = f.type;
      fl.frequency.value = f.freq;
      fl.Q.value = f.q ?? 0.707;
      if (f.gain !== undefined) fl.gain.value = f.gain;
      node = fl;
    } else node = c.createGain();
    node.connect(dest);
    if (rev && revLevel) {
      const s = c.createGain();
      s.gain.value = revLevel;
      node.connect(s);
      s.connect(rev);
    }
    head = node;
    m.set(key, head);
  }
  return head;
}

/** Play one enveloped oscillator / noise voice. */
export function voice(o: VoiceOpts): VoiceHandle {
  if (!hasGraph()) return DUMMY;
  const g = cur();
  const c = g.ctx;
  const dur = Math.max(0.001, o.dur ?? 0.1);
  const wave = waveOf(o.wave ?? 'square');
  const tStart = startTimeFor(c, o.at, dur, !!o.drum || wave === 'noise');
  if (tStart === null) return DUMMY;
  const t0 = tStart;
  const atk = Math.max(0.0008, o.attack ?? 0.002);
  const dec = o.decay ?? 0.05;
  const sus = o.sustain ?? 0.7;
  const rel = Math.max(0.004, o.release ?? 0.05);
  const vol = o.vol ?? 0.3;
  const nodes: AudioNode[] = [];
  const oscs: AudioScheduledSourceNode[] = [];
  const paramLinks: [AudioNode, AudioParam][] = [];
  const nodeLinks: [AudioNode, AudioNode][] = [];
  const gateEnd = t0 + Math.max(dur, atk + (o.swell ? 0 : dec));
  const end = gateEnd + rel * 1.1 + 0.01;

  let src: AudioScheduledSourceNode;
  let freqParam: AudioParam | null = null;
  let detParam: AudioParam | null = null;
  const f0 = o.freq ?? 440;

  const glideTo = (p: AudioParam, from: number, to: number, tStart: number, tEnd: number) => {
    p.setValueAtTime(from, tStart);
    p.exponentialRampToValueAtTime(Math.max(0.01, to), Math.max(tStart + 0.001, tEnd));
  };
  const linkDetune = (p: AudioParam) => {
    for (const s of [o.detuneSrc, o.detuneSrc2])
      if (s) {
        s.connect(p);
        paramLinks.push([s, p]);
      }
  };

  // the summing point of the oscillator(s), before filter and envelope
  let head: AudioNode;
  if (wave === 'noise') {
    const n = c.createBufferSource();
    n.buffer = g.noise;
    n.loop = true;
    if (o.freq) n.playbackRate.value = Math.max(0.05, o.freq / 1000);
    if (o.freq && o.freqEnd)
      glideTo(n.playbackRate, Math.max(0.05, o.freq / 1000), Math.max(0.05, o.freqEnd / 1000), t0, t0 + (o.glide ?? dur));
    src = n;
    oscs.push(n);
    head = n;
    nodes.push(n);
  } else {
    const fStart = o.portaFrom ?? f0;
    // vibrato: one free-running LFO per rate is shared by every note (15.3);
    // each note only owns the gain that fades its depth in after the delay
    let vibGain: GainNode | null = null;
    if (o.vibrato && o.vibrato.depth) {
      const lfo = sharedLfo(c, o.vibrato.rate, o.vibrato.shape ?? 'sine');
      const lg = c.createGain();
      const vd = t0 + (o.vibrato.delay ?? 0);
      lg.gain.value = 0;
      lg.gain.setValueAtTime(0, t0);
      lg.gain.setValueAtTime(0, vd);
      lg.gain.linearRampToValueAtTime(o.vibrato.depth, vd + 0.12);
      lfo.connect(lg);
      nodeLinks.push([lfo, lg]);
      nodes.push(lg);
      vibGain = lg;
    }
    const makeOsc = (w: Wave, extraDetune: number): OscillatorNode => {
      const osc = c.createOscillator();
      setWave(c, osc, w);
      kRate(osc.detune);
      if (o.portaFrom && o.porta) glideTo(osc.frequency, fStart, f0, t0, t0 + o.porta);
      else osc.frequency.setValueAtTime(f0, t0);
      if (o.freqEnd) {
        const gs = t0 + (o.glideDelay ?? 0);
        osc.frequency.setValueAtTime(f0, gs);
        osc.frequency.exponentialRampToValueAtTime(Math.max(1, o.freqEnd), gs + (o.glide ?? dur));
      }
      const d0 = (o.detune ?? 0) + extraDetune;
      if (d0) osc.detune.setValueAtTime(d0, t0);
      if (o.scoop) {
        osc.detune.setValueAtTime(d0 + o.scoop, t0);
        osc.detune.linearRampToValueAtTime(d0, t0 + (o.scoopTime ?? 0.04));
      }
      linkDetune(osc.detune);
      if (vibGain) vibGain.connect(osc.detune);
      return osc;
    };
    const osc = makeOsc(wave, 0);
    if (o.periodic) osc.setPeriodicWave(o.periodic(c));
    freqParam = osc.frequency;
    detParam = osc.detune;
    const addFm = (fm: FmOpts) => {
      const mod = c.createOscillator();
      mod.type = 'sine';
      kRate(mod.detune);
      const mf = fm.fixed ?? f0 * fm.ratio;
      if (fm.fixed) mod.frequency.setValueAtTime(mf, t0);
      else if (o.portaFrom && o.porta) glideTo(mod.frequency, fStart * fm.ratio, mf, t0, t0 + o.porta);
      else mod.frequency.setValueAtTime(mf, t0);
      if (o.freqEnd && !fm.fixed) {
        const gs = t0 + (o.glideDelay ?? 0);
        mod.frequency.setValueAtTime(mf, gs);
        mod.frequency.exponentialRampToValueAtTime(Math.max(1, o.freqEnd * fm.ratio), gs + (o.glide ?? dur));
      }
      if (!fm.fixed) linkDetune(mod.detune);
      if (o.detune && !fm.fixed) mod.detune.setValueAtTime(o.detune, t0);
      const mg = c.createGain();
      const i0 = fm.index * mf;
      if (fm.indexAttack) {
        mg.gain.value = 0;
        mg.gain.setValueAtTime(0, t0);
        mg.gain.linearRampToValueAtTime(i0, t0 + fm.indexAttack / 1000);
      } else mg.gain.setValueAtTime(i0, t0);
      if (fm.indexEnd !== undefined && fm.indexTime) {
        const ts = t0 + (fm.indexAttack ?? 0) / 1000;
        mg.gain.setTargetAtTime(fm.indexEnd * mf, ts, fm.indexTime / 1000 / 3);
      }
      mod.connect(mg);
      mg.connect(osc.frequency);
      mod.start(t0);
      // a modulator whose index decays to 0 (a mallet's or a tine's strike)
      // is silent after six time constants: stop it there and unhook it, and
      // the carrier falls back to the browser's plain-oscillator path
      const off = fm.indexEnd === 0 && fm.indexTime ? t0 + ((fm.indexAttack ?? 0) + fm.indexTime * 2) / 1000 : end;
      if (off < end) {
        mod.stop(off);
        mod.onended = () => {
          try {
            mg.disconnect();
            mod.disconnect();
          } catch {
            /* gone */
          }
        };
      } else mod.stop(end);
      nodes.push(mod, mg);
      oscs.push(mod);
    };
    if (o.fm) addFm(o.fm);
    if (o.fm2) addFm(o.fm2);
    src = osc;
    oscs.push(osc);
    nodes.push(osc);
    head = osc;
    // extra oscillators on the same pitch, envelope and filter (ins_lead_boss)
    if (o.layers?.length) {
      const sum = c.createGain();
      nodes.push(sum);
      const g0 = c.createGain();
      g0.gain.value = o.layerMain ?? 1;
      osc.connect(g0);
      g0.connect(sum);
      nodes.push(g0);
      for (const l of o.layers) {
        const lo = makeOsc(waveOf(l.wave), l.detune ?? 0);
        const lg = c.createGain();
        lg.gain.value = l.vol;
        lo.connect(lg);
        lg.connect(sum);
        lo.start(t0);
        lo.stop(end);
        nodes.push(lo, lg);
        oscs.push(lo);
      }
      head = sum;
    }
  }

  let node: AudioNode = head;
  const dest0 = o.dest ?? busNode(g, o.bus);
  // a static filter (and the reverb send) can be shared by every voice of the destination
  const share = !!(o.shareFilter && (!o.filter || !o.filter.freqEnd) && !o.drive && !o.formant);
  if (o.filter && !share) {
    const f = c.createBiquadFilter();
    f.type = o.filter.type;
    if (o.krate) {
      kRate(f.frequency);
      kRate(f.Q);
    }
    f.frequency.setValueAtTime(o.filter.freq, t0);
    if (o.filter.freqEnd)
      f.frequency.exponentialRampToValueAtTime(Math.max(20, o.filter.freqEnd), t0 + (o.filter.time ?? dur));
    f.Q.value = o.filter.q ?? 0.707;
    if (o.filter.gain !== undefined) f.gain.value = o.filter.gain;
    node.connect(f);
    node = f;
    nodes.push(f);
  }
  if (o.drive) {
    const sh = c.createWaveShaper();
    sh.curve = driveCurve(o.drive);
    node.connect(sh);
    node = sh;
    nodes.push(sh);
  }
  if (o.formant) {
    const fm = o.formant;
    const mix = fm.mix ?? 0.4;
    const sum = c.createGain();
    const dry = c.createGain();
    dry.gain.value = 1 - mix;
    node.connect(dry);
    dry.connect(sum);
    nodes.push(sum, dry);
    if (fm.lp) {
      const l = c.createBiquadFilter();
      l.type = 'lowpass';
      l.frequency.value = fm.lp;
      const lg = c.createGain();
      lg.gain.value = mix;
      node.connect(l);
      l.connect(lg);
      lg.connect(sum);
      nodes.push(l, lg);
    } else {
      for (const [ff, q] of [
        [fm.f1, fm.q1 ?? 5],
        [fm.f2, fm.q2 ?? 7],
      ] as [number, number][]) {
        const b = c.createBiquadFilter();
        b.type = 'bandpass';
        b.frequency.value = ff;
        b.Q.value = q;
        const bg = c.createGain();
        bg.gain.value = mix * 1.6;
        node.connect(b);
        b.connect(bg);
        bg.connect(sum);
        nodes.push(b, bg);
      }
    }
    node = sum;
  }

  const env = c.createGain();
  nodes.push(env);
  const eg = env.gain;
  // Start closed. An AudioParam holds its default (1) until its first event,
  // and an event at t0 can land one sample after a source started at t0
  // (float rounding), which let the very first sample through at full gain.
  eg.value = 0;
  eg.setValueAtTime(0, t0);
  if (o.swell) {
    eg.linearRampToValueAtTime(vol, gateEnd);
    eg.linearRampToValueAtTime(0, gateEnd + rel);
  } else if (o.linear) {
    eg.linearRampToValueAtTime(vol, t0 + atk);
    eg.linearRampToValueAtTime(vol * sus, t0 + atk + dec);
    eg.setValueAtTime(vol * sus, gateEnd);
    eg.linearRampToValueAtTime(0, gateEnd + rel);
  } else {
    eg.linearRampToValueAtTime(vol, t0 + atk);
    if (dec > 0) eg.setTargetAtTime(vol * sus, t0 + atk, dec / 3.5);
    else eg.setValueAtTime(vol * sus, t0 + atk);
    eg.setTargetAtTime(0, gateEnd, rel / 5);
    eg.setValueAtTime(0, gateEnd + rel * 1.1);
  }
  node.connect(env);
  let out: AudioNode = env;

  if (o.am && o.am.depth) {
    const a = c.createGain();
    const depth = Math.min(1, o.am.depth);
    a.gain.value = 1 - depth / 2;
    const lfo = c.createOscillator();
    lfo.type = o.am.shape ?? 'sine';
    lfo.frequency.setValueAtTime(o.am.rate, t0);
    if (o.am.rateEnd) lfo.frequency.exponentialRampToValueAtTime(Math.max(0.1, o.am.rateEnd), t0 + (o.am.time ?? dur));
    const lg = c.createGain();
    lg.gain.value = depth / 2;
    lfo.connect(lg);
    lg.connect(a.gain);
    lfo.start(t0);
    lfo.stop(end);
    out.connect(a);
    out = a;
    nodes.push(a, lfo, lg);
    oscs.push(lfo);
  }

  if (o.pan !== undefined && (o.pan !== 0 || o.panEnd !== undefined)) {
    const p = c.createStereoPanner();
    p.pan.setValueAtTime(clampPan(o.pan), t0);
    if (o.panEnd !== undefined) p.pan.linearRampToValueAtTime(clampPan(o.panEnd), t0 + dur);
    out.connect(p);
    out = p;
    nodes.push(p);
  }
  if (share) {
    // shared (filter →) dest (+ its reverb send)
    out.connect(sharedOut(c, dest0, o.reverb ? o.revDest ?? g.fxSend : null, o.reverb ?? 0, o.filter));
  } else {
    out.connect(dest0);
    if (o.reverb) {
      const s = c.createGain();
      s.gain.value = o.reverb;
      out.connect(s);
      s.connect(o.revDest ?? g.fxSend);
      nodes.push(s);
    }
  }
  if (wave === 'noise') {
    const off = o.noiseOffset ?? (noiseRot = (noiseRot + 0.731) % 3.5);
    // buffer sources start on a sample boundary, the same frame the envelope
    // opens on (see the env note below)
    (src as AudioBufferSourceNode).start(onSample(c, t0), off);
  } else src.start(t0);
  src.stop(end);
  src.onended = () => {
    for (const [a, p] of paramLinks)
      try {
        a.disconnect(p);
      } catch {
        /* gone */
      }
    for (const [a, b] of nodeLinks)
      try {
        a.disconnect(b);
      } catch {
        /* gone */
      }
    for (const n of nodes)
      try {
        n.disconnect();
      } catch {
        /* gone */
      }
  };

  if (noteLog) noteLog.push({ t: t0, dur: gateEnd - t0, freq: wave === 'noise' ? 0 : f0, vol, wave });
  const h: VoiceHandle = {
    start: t0,
    end,
    vol,
    src,
    env,
    freq: freqParam,
    detune: detParam,
    stop(fade = 0.02, at?: number) {
      const t = Math.max(at ?? c.currentTime, c.currentTime);
      if (t >= end) return;
      try {
        if ('cancelAndHoldAtTime' in eg) eg.cancelAndHoldAtTime(t);
        else {
          (eg as AudioParam).cancelScheduledValues(t);
        }
        if (t <= t0) {
          eg.setValueAtTime(0, t);
        } else {
          eg.linearRampToValueAtTime(0, t + Math.max(0.003, fade));
        }
        for (const s of oscs) s.stop(t + Math.max(0.003, fade) + 0.01);
      } catch {
        /* already stopped */
      }
    },
  };
  return captured(h);
}

const lfoCache = new WeakMap<BaseAudioContext, Map<string, OscillatorNode>>();
/** A free-running LFO (±1) shared by all voices of this context at this rate. */
export function sharedLfo(c: BaseAudioContext, rate: number, shape: OscillatorType = 'sine'): OscillatorNode {
  let m = lfoCache.get(c);
  if (!m) lfoCache.set(c, (m = new Map()));
  const key = `${shape}${Math.round(rate * 100)}`;
  let o = m.get(key);
  if (!o) {
    o = c.createOscillator();
    o.type = shape;
    o.frequency.value = rate;
    o.start();
    m.set(key, o);
  }
  return o;
}

function clampPan(p: number): number {
  return Math.max(-1, Math.min(1, p));
}

/** A looping noise source (ambience beds). Caller owns stop(). */
export function noiseSource(g: Graph, at: number, rate = 1): AudioBufferSourceNode {
  const n = g.ctx.createBufferSource();
  n.buffer = g.noise;
  n.loop = true;
  n.playbackRate.value = rate;
  n.start(onSample(g.ctx, at), (noiseRot = (noiseRot + 1.37) % 3.9));
  return n;
}

/** Round a start time up to the next sample boundary (see voice()). */
export function onSample(c: BaseAudioContext, t: number): number {
  const sr = c.sampleRate;
  return Math.max(c.currentTime, Math.ceil(t * sr - 1e-6) / sr);
}

// ---------------------------------------------------------------------------
// Pitch helpers

const NOTE_BASE: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** "C4", "F#3", "Bb5", "Cb5" → MIDI number (C4 = 60). NaN if unparsable. */
export function noteMidi(n: string): number {
  const m = /^([A-Ga-g])(#{1,2}|b{1,2})?(-?\d)$/.exec(n.trim());
  if (!m) return NaN;
  let semi = NOTE_BASE[m[1].toUpperCase()];
  if (m[2]) semi += m[2][0] === '#' ? m[2].length : -m[2].length;
  return (parseInt(m[3], 10) + 1) * 12 + semi;
}

/** Pitch class of a note name without octave ("F#", "Bb"). */
export function pitchClass(n: string): number {
  const m = /^([A-Ga-g])(#{1,2}|b{1,2})?$/.exec(n.trim());
  if (!m) return NaN;
  let semi = NOTE_BASE[m[1].toUpperCase()];
  if (m[2]) semi += m[2][0] === '#' ? m[2].length : -m[2].length;
  return ((semi % 12) + 12) % 12;
}

export function midiHz(m: number): number {
  return 440 * Math.pow(2, (m - 69) / 12);
}

/** Note name ("C4", "F#3", "Bb5") or MIDI number → Hz. */
export function noteHz(n: string | number): number {
  if (typeof n === 'number') return midiHz(n);
  const m = noteMidi(n);
  return Number.isNaN(m) ? 440 : midiHz(m);
}
