// Look-ahead music sequencer (40_audio 15.2).
//
// A clock (clock.ts) calls pump(until) every 25 ms with until = now + 0.3 s
// (MUSIC_LOOKAHEAD); the player walks the song one 16th-note step at a time
// and schedules every note that starts before `until` at an exact
// ctx.currentTime. Offline renders pump in 0.5 s chunks the same way.
//
// A long look-ahead survives main-thread stalls, but notes are then committed
// early. Param changes that must land on a beat or bar therefore reach back
// into what is already scheduled: every scheduled step keeps its voice
// handles (StepRec), a kire rise re-schedules the kire-aware parts from the
// next beat, and a change that waits for the next bar (stage, boss phase,
// kire drop) rewinds that bar if it has not started sounding yet.
//
// A song is a list of bars (label → steps, chords, meter) played as
// intro-once then loop, and a list of parts. Each part is called for every
// step and decides what to play from the bar context (section, chord, params:
// stage / kire / boss_phase). Stage / kire / boss changes land on the next
// beat or bar exactly as 40_audio 7 describes.

import { captureVoices, dbToGain, makeIRMono, monoSum, releaseShared, sharedLfo, spread, voice, withLatePolicy, type Graph, type VoiceHandle } from './engine';
import { DRM, INS, type InsOpts } from './instruments';
import { partTrim, songGainDb } from './mix';
import {
  bassMidi,
  drumVel,
  parseBassPattern,
  voiceLead,
  voicePcs,
  type Chord,
  type Ev,
  type MmlBar,
} from './theory';

export interface Params {
  stage: number;
  kire: number;
  boss_phase: number;
}

export interface BarDef {
  label: string;
  steps: number;
  chords: { step: number; chord: Chord }[];
  /** Tempo override for this bar (jingles). */
  bpm?: number;
}

export interface BarCtx {
  song: SongPlayer;
  def: BarDef;
  label: string;
  /** Section letters of the label ("A3" → "A", "BI1" → "BI"). */
  section: string;
  num: number;
  /** Actual length in steps (a 5/4 "second hand" bar is 20). */
  steps: number;
  t0: number;
  stepDur: number;
  bpm: number;
  loop: number;
  barNo: number;
  inIntro: boolean;
  /** Params as applied at this moment (kire up on beats, others on bars). */
  p: Params;
  nextLabel: string | null;
  /** Actual step → source step (for bars that repeat their last beat). */
  src(s: number): number;
  /** Actual step (may be fractional / past the end) → ctx time, swing aware. */
  time(s: number): number;
  chordAt(srcStep: number): Chord;
  chordIndex(srcStep: number): number;
  /** Start / end (source steps) of the chord sounding at srcStep. */
  chordSpan(srcStep: number): [number, number];
  /** Free per-bar scratch space for parts. */
  data: Record<string, unknown>;
}

export interface PartFx {
  lp?: number;
  q?: number;
  /** LFO on the part filter cutoff (Hz). */
  lfo?: { rate: number; depth: number };
  tremolo?: { rate: number; depth: number };
  autopan?: { rate: number; depth: number };
  pan?: number;
  /** Tempo-synced echo (steps), e.g. dotted 8th = 3. */
  delay?: { steps: number; fb: number; send: number; bp?: [number, number] };
  hp?: number;
}

export interface PartRt {
  id: string;
  input: GainNode;
  /** The part's resting level (its vol × the mix trim); fades are relative to it. */
  base: number;
  rev: AudioNode;
  song: SongPlayer;
  state: Record<string, unknown>;
  prevMidi: number | null;
  prevEnd: number;
  delay?: DelayNode;
  delaySend?: GainNode;
}

export interface PartDef {
  id: string;
  vol?: number;
  fx?: PartFx;
  when?(b: BarCtx, src: number): boolean;
  init?(rt: PartRt): void;
  step(b: BarCtx, src: number, actual: number, rt: PartRt): void;
  /** Top-line pitches in score order (QA: sealed chime answer check). */
  melodySeq?(): number[];
  /**
   * The part's notes depend on `kire` and it keeps no state between steps:
   * a kire change re-schedules it from the change point (7.2).
   */
  kireAware?: boolean;
}

export interface SongDef {
  id: string;
  /** Human title for the sound test. */
  title: string;
  bpm: number;
  swing?: { kind: '16' | '8'; amount: number };
  bars: Map<string, BarDef>;
  intro: string[];
  loop: string[];
  parts: PartDef[];
  /** Song master gain (dB) — the mix level vs other songs (11.2). */
  gainDb: number;
  /** Reverb for this song's mix. */
  reverb?: { len: number; decay: number; level: number; hp?: number };
  /** Honour the global `stage` (home, shop). Town songs pass a fixed stage. */
  stageAware?: boolean;
  fixedStage?: number;
  /** Tempo for the current params (stage 2 slows down). */
  tempo?(p: Params, s: SongPlayer): number;
  setup?(s: SongPlayer): void;
  onBar?(s: SongPlayer, b: BarCtx): void;
  onParam?(s: SongPlayer, name: string, value: number, old: number): void;
  onSfx?(s: SongPlayer, id: string): void;
  /** Free-running scheduling outside the bar grid (the title's clock). */
  pumpFree?(s: SongPlayer, until: number): void;
  onStop?(s: SongPlayer, at: number, fade: number): void;
  /** Kind of BGM for the jingle rules (6.1). */
  jingle?: 'replace' | 'pause' | 'gameover';
  /** Label order resolution hook: return a label to play next instead. */
  route?(s: SongPlayer, next: { intro: boolean; i: number }): { intro: boolean; i: number } | void;
  /** Mark: battle-type song (kire, no dialog ducking). */
  battle?: boolean;
  /** Set false if the song's bar hooks cannot be replayed (no bar rewind). */
  rewind?: boolean;
}

/** BGM voice cap (11.5): above this many sounding voices the quietest is cut. */
export const BGM_VOICE_CAP = 40;
/** Music look-ahead (s): survives a main-thread stall of ~0.27 s. */
export const MUSIC_LOOKAHEAD = 0.3;
/** Late notes (live only): short ones later than this are dropped, not bunched. */
const LATE_TOL = 0.03;
const LATE_LONG = 0.25;

/** One scheduled step and the voices each part started on it. */
interface StepRec {
  t: number;
  b: BarCtx;
  src: number;
  actual: number;
  /** Voices started by part k: hs[k]. */
  hs: (VoiceHandle[] | undefined)[];
}

interface BarSnap {
  t0: number;
  cursor: { intro: boolean; i: number };
  barNo: number;
  loopCount: number;
  curLoopIndex: number;
  bar: BarCtx | null;
  prevBar: BarCtx | null;
  parts: { prevMidi: number | null; prevEnd: number; state: Record<string, unknown> }[];
  songState: Record<string, unknown>;
}

// ---------------------------------------------------------------------------

export function sectionOf(label: string): string {
  return /^[A-Za-z']+/.exec(label)?.[0] ?? label;
}
function numOf(label: string): number {
  return parseInt(/\d+$/.exec(label)?.[0] ?? '0', 10);
}

/** Build bar definitions from parsed mml bars and a chord table. */
export function barsFrom(
  mbars: MmlBar[],
  table: Map<string, Chord>,
  meterDefault: string,
  out = new Map<string, BarDef>(),
  errors: string[] = [],
): Map<string, BarDef> {
  for (const b of mbars) {
    if (out.has(b.label)) continue;
    const chords: { step: number; chord: Chord }[] = [];
    const names = b.chordNames;
    const half = b.meter === '7/8' ? 8 : Math.round(b.steps / 2);
    names.forEach((nm, i) => {
      const c = table.get(nm);
      if (!c) errors.push(`chord ${nm} (${b.label}) missing from table`);
      else chords.push({ step: names.length === 2 ? i * half : Math.round((i * b.steps) / names.length), chord: c });
    });
    void meterDefault;
    out.set(b.label, { label: b.label, steps: b.steps, chords });
  }
  return out;
}

// ---------------------------------------------------------------------------

export class SongPlayer {
  readonly g: Graph;
  readonly def: SongDef;
  /** Parts sum here (dry). */
  readonly mix: GainNode;
  /** Reverb send for instruments (song's own reverb). */
  readonly wet: GainNode;
  readonly filter: BiquadFilterNode;
  /** Jingle pause gate. */
  readonly pause: GainNode;
  /** Fades / cross-fades. */
  readonly fade: GainNode;
  readonly out: GainNode;
  /** The song's pitch bus in cents (stage detune, tape, bows, tape-stops). */
  readonly det: ConstantSourceNode;
  /** Tape wow & flutter LFOs (created on first use). */
  private tape: { slow: OscillatorNode; slowG: GainNode; fast: OscillatorNode; fastG: GainNode } | null = null;
  readonly parts: PartRt[] = [];
  readonly params: Params;
  private pending: Partial<Params> = {};
  /** Scratch space for song-specific logic. */
  readonly state: Record<string, unknown> = {};
  startTime: number;
  private nextT: number;
  private step = 0;
  private bar: BarCtx | null = null;
  private cursor: { intro: boolean; i: number };
  loopCount = 0;
  barNo = 0;
  halted = false;
  /** No new steps are scheduled from this ctx time on (boss final phase). */
  haltAt = Infinity;
  ended = false;
  stopped = false;
  stopAt = Infinity;
  /** Called once when a one-shot song (jingle) has played its last bar. */
  onEnd: ((at: number) => void) | null = null;
  endTime = Infinity;
  private conv: ConvolverNode | null = null;
  private disposed = false;

  /** QA: only these parts sound. */
  solo: Set<string> | null = null;

  constructor(g: Graph, def: SongDef, dest: AudioNode, opts: { at?: number; fadeIn?: number; fromLoopBar?: number; params: Params; solo?: string[] }) {
    this.g = g;
    this.def = def;
    const c = g.ctx;
    this.params = { ...opts.params };
    if (opts.solo) this.solo = new Set(opts.solo);
    if (def.fixedStage !== undefined) this.params.stage = def.fixedStage;
    const t0 = opts.at ?? c.currentTime + 0.06;
    this.startTime = t0;
    this.nextT = t0;
    this.mix = c.createGain();
    this.wet = c.createGain();
    this.filter = c.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.frequency.value = 20000;
    this.filter.Q.value = 0.707;
    this.pause = c.createGain();
    this.fade = c.createGain();
    this.out = c.createGain();
    this.out.gain.value = dbToGain(songGainDb(def.id, def.gainDb));
    const post = c.createGain();
    this.mix.connect(post);
    const rv = def.reverb ?? { len: 1.6, decay: 3.2, level: 0.3 };
    // the song's own reverb: a mono convolution spread to stereo (15.3)
    this.conv = c.createConvolver();
    this.conv.normalize = false;
    this.conv.buffer = makeIRMono(c, rv.len, rv.decay, 31 + Math.round(rv.len * 10));
    const down = monoSum(c);
    const hp = c.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = rv.hp ?? 220;
    const wetOut = c.createGain();
    wetOut.gain.value = rv.level;
    this.wet.connect(down);
    down.connect(hp);
    hp.connect(this.conv);
    if (!(globalThis as any).__PF?.noRev) spread(c, this.conv, wetOut);
    wetOut.connect(post);
    post.connect(this.filter);
    this.filter.connect(this.pause);
    this.pause.connect(this.fade);
    this.fade.connect(this.out);
    this.out.connect(dest);
    if (opts.fadeIn && opts.fadeIn > 0) {
      this.fade.gain.value = 0;
      this.fade.gain.setValueAtTime(0, t0);
      this.fade.gain.linearRampToValueAtTime(1, t0 + opts.fadeIn);
    }
    this.det = c.createConstantSource();
    this.det.offset.value = 0;
    this.det.start(t0 - 0.05 > c.currentTime ? t0 - 0.05 : c.currentTime);

    for (const p of def.parts) this.parts.push(this.makePart(p));
    if (opts.fromLoopBar !== undefined && def.loop.length) {
      this.cursor = { intro: false, i: ((opts.fromLoopBar % def.loop.length) + def.loop.length) % def.loop.length };
    } else this.cursor = { intro: def.intro.length > 0, i: 0 };
    if (!def.intro.length && !def.loop.length) this.ended = true;
    this.applyStage(t0, true);
    def.setup?.(this);
  }

  // ---- part runtime ------------------------------------------------------

  private makePart(p: PartDef): PartRt {
    const c = this.g.ctx;
    const input = c.createGain();
    input.gain.value = (p.vol ?? 1) * partTrim(this.def.id, p.id);
    let node: AudioNode = input;
    const fx = p.fx;
    const rt: PartRt = { id: p.id, input, base: input.gain.value, rev: this.wet, song: this, state: {}, prevMidi: null, prevEnd: 0 };
    if (fx?.hp) {
      const f = c.createBiquadFilter();
      f.type = 'highpass';
      f.frequency.value = fx.hp;
      node.connect(f);
      node = f;
    }
    if (fx?.lp) {
      const f = c.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = fx.lp;
      f.Q.value = fx.q ?? 0.7;
      // a 0.15 Hz sweep needs no per-sample coefficients (15.3)
      kRate(f.frequency);
      kRate(f.Q);
      if (fx.lfo) {
        const l = sharedLfo(c, fx.lfo.rate);
        const lg = c.createGain();
        lg.gain.value = fx.lfo.depth;
        l.connect(lg);
        lg.connect(f.frequency);
        this.lfoLinks.push([l, lg]);
      }
      node.connect(f);
      node = f;
      rt.state.filter = f;
    }
    if (fx?.tremolo) {
      const a = c.createGain();
      a.gain.value = 1 - fx.tremolo.depth;
      const l = sharedLfo(c, fx.tremolo.rate);
      const lg = c.createGain();
      lg.gain.value = fx.tremolo.depth;
      l.connect(lg);
      lg.connect(a.gain);
      this.lfoLinks.push([l, lg]);
      node.connect(a);
      node = a;
    }
    if (fx?.autopan || fx?.pan) {
      const pn = c.createStereoPanner();
      pn.pan.value = fx.pan ?? 0;
      kRate(pn.pan);
      if (fx.autopan) {
        const l = sharedLfo(c, fx.autopan.rate);
        const lg = c.createGain();
        lg.gain.value = fx.autopan.depth;
        l.connect(lg);
        lg.connect(pn.pan);
        this.lfoLinks.push([l, lg]);
      }
      node.connect(pn);
      node = pn;
    }
    node.connect(this.mix);
    if (fx?.delay) {
      const d = c.createDelay(2);
      d.delayTime.value = (60 / this.def.bpm / 4) * fx.delay.steps;
      const send = c.createGain();
      send.gain.value = fx.delay.send;
      const fb = c.createGain();
      fb.gain.value = fx.delay.fb;
      let tail: AudioNode = d;
      if (fx.delay.bp) {
        const hp = c.createBiquadFilter();
        hp.type = 'highpass';
        hp.frequency.value = fx.delay.bp[0];
        const lp = c.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = fx.delay.bp[1];
        d.connect(hp);
        hp.connect(lp);
        tail = lp;
      }
      node.connect(send);
      send.connect(d);
      tail.connect(fb);
      fb.connect(d);
      const pn = c.createStereoPanner();
      pn.pan.value = 0.35;
      tail.connect(pn);
      pn.connect(this.mix);
      tail.connect(this.wet);
      rt.delay = d;
      rt.delaySend = send;
      rt.state.delayFb = fb;
    }
    p.init?.(rt);
    return rt;
  }
  /** Part LFOs are the context's shared ones (15.3); these links are ours. */
  private lfoLinks: [AudioNode, AudioNode][] = [];

  // ---- params --------------------------------------------------------------

  /**
   * A param change (40_audio 7): kire rises land on the next beat, everything
   * else on the next bar. When that beat / bar is already scheduled (the
   * look-ahead is 0.3 s), the scheduled notes are corrected in place: a kire
   * rise re-schedules the kire-aware parts from that beat; a bar change
   * rewinds the bar if it has not started to sound.
   */
  setParam(name: keyof Params, value: number): void {
    const old = this.pending[name] ?? this.params[name];
    if (old === value) return;
    this.pending[name] = value;
    if (name === 'stage' && this.def.stageAware) {
      // pitch moves right away (0.6 s bend); tempo / parts wait for the bar
      this.applyStage(this.g.ctx.currentTime, false, value);
    }
    this.def.onParam?.(this, name, value, old);
    this.landScheduled(name, value);
  }

  /** Apply a pending change to steps that are already scheduled (see setParam). */
  private landScheduled(name: keyof Params, value: number): void {
    if (this.pending[name] !== value || this.halted || this.stopped) return;
    const now = this.g.ctx.currentTime + 0.008;
    if (name === 'kire' && value > this.params.kire) {
      const i = this.hist.findIndex((r) => r.t >= now && r.actual % 4 === 0);
      if (i < 0) return;
      this.params.kire = value;
      delete this.pending.kire;
      this.reschedule(i, (pd) => !!pd.kireAware);
      return;
    }
    // bar-level: rewind the newest bar if its downbeat is still ahead
    if (this.def.rewind === false || !this.snap || this.snap.t0 < now) return;
    this.rewindBar();
  }

  /** Cancel and re-run the chosen parts for every scheduled step from hist[i]. */
  private reschedule(from: number, pick: (pd: PartDef) => boolean): void {
    for (let r = from; r < this.hist.length; r++) {
      const rec = this.hist[r];
      for (let k = 0; k < this.parts.length; k++) {
        const pd = this.def.parts[k];
        if (!pick(pd)) continue;
        const hs = rec.hs[k];
        if (hs) for (const h of hs) this.cancel(h);
        rec.hs[k] = undefined;
        if (this.solo && !this.solo.has(pd.id)) continue;
        if (pd.when && !pd.when(rec.b, rec.src)) continue;
        rec.hs[k] = this.runPart(k, rec.b, rec.src, rec.actual);
      }
    }
  }

  /** Throw away the newest bar (not yet sounding) and schedule it again. */
  private rewindBar(): void {
    const sn = this.snap!;
    for (let r = this.hist.length - 1; r >= 0 && this.hist[r].t >= sn.t0 - 1e-6; r--) {
      for (const hs of this.hist[r].hs) if (hs) for (const h of hs) this.cancel(h);
      this.hist.pop();
    }
    this.det.offset.cancelScheduledValues(sn.t0);
    this.cursor = { ...sn.cursor };
    this.barNo = sn.barNo;
    this.loopCount = sn.loopCount;
    this.curLoopIndex = sn.curLoopIndex;
    this.bar = sn.bar;
    this.prevBar = sn.prevBar;
    this.parts.forEach((rt, k) => {
      rt.prevMidi = sn.parts[k].prevMidi;
      rt.prevEnd = sn.parts[k].prevEnd;
      for (const key of Object.keys(rt.state)) if (!(key in sn.parts[k].state)) delete rt.state[key];
      Object.assign(rt.state, sn.parts[k].state);
    });
    for (const key of Object.keys(this.state)) if (!(key in sn.songState)) delete this.state[key];
    Object.assign(this.state, sn.songState);
    this.step = 0;
    this.nextT = sn.t0;
    this.ended = false;
    this.snap = null;
    this.rewinds++;
  }
  /** QA: how many bars were rewound for param changes. */
  rewinds = 0;

  private cancel(h: VoiceHandle): void {
    h.stop(0.004, h.start);
    const i = this.sounding.indexOf(h);
    if (i >= 0) this.sounding.splice(i, 1);
  }

  /** Base pitch + tape wobble for the stage transforms (5.4). */
  applyStage(at: number, immediate: boolean, stage = this.params.stage): void {
    if (!this.def.stageAware && this.def.fixedStage === undefined) return;
    const s = stage >= 3 ? 0 : stage;
    const base = s >= 1 ? -100 : 0;
    const [sr, sd, fr, fd] = s === 1 ? [0.33, 15, 6, 3] : s === 2 ? [0.2, 25, 6, 4] : [0.33, 0, 6, 0];
    this.setBaseDetune(base, immediate ? 0 : 0.6, at);
    this.setTape(sr, sd, fr, fd, immediate ? 0 : 0.6, at);
  }

  /** Stage transform pitch (5.4) and the free `detune` music param, in cents. */
  private stageDet = 0;
  private userDet = 0;
  /** The song's resting pitch: every bend (bow, tape stop, brake) returns here. */
  get baseDetune(): number {
    return this.stageDet + this.userDet;
  }
  setBaseDetune(cents: number, ramp: number, at = this.g.ctx.currentTime): void {
    this.stageDet = cents;
    this.rampDetune(ramp, at);
  }
  /** setMusicParam('detune', cents): bend the whole song on top of the stage pitch. */
  setUserDetune(cents: number, ramp: number, at = this.g.ctx.currentTime): void {
    this.userDet = cents;
    this.rampDetune(ramp, at);
  }
  private rampDetune(ramp: number, at: number): void {
    const p = this.det.offset;
    const to = this.baseDetune;
    p.cancelScheduledValues(at);
    if (ramp <= 0) p.setValueAtTime(to, at);
    else {
      p.setValueAtTime(p.value, at);
      p.linearRampToValueAtTime(to, at + ramp);
    }
  }

  setTape(slowRate: number, slowDepth: number, fastRate: number, fastDepth: number, ramp = 0.3, at = this.g.ctx.currentTime): void {
    if (!this.tape) {
      if (!slowDepth && !fastDepth) return;
      const c = this.g.ctx;
      const mk = (): [OscillatorNode, GainNode] => {
        const o = c.createOscillator();
        const gn = c.createGain();
        gn.gain.value = 0;
        o.connect(gn);
        gn.connect(this.det.offset);
        o.start();
        return [o, gn];
      };
      const [slow, slowG] = mk();
      const [fast, fastG] = mk();
      this.tape = { slow, slowG, fast, fastG };
    }
    const tp = this.tape;
    tp.slow.frequency.setValueAtTime(slowRate, at);
    tp.fast.frequency.setValueAtTime(fastRate, at);
    tp.slowG.gain.setTargetAtTime(slowDepth, at, Math.max(0.01, ramp / 3));
    tp.fastG.gain.setTargetAtTime(fastDepth, at, Math.max(0.01, ramp / 3));
  }

  private applyPending(onBar: boolean): void {
    for (const k of Object.keys(this.pending) as (keyof Params)[]) {
      const v = this.pending[k]!;
      if (!onBar) {
        // only kire increases land on the beat
        if (k !== 'kire' || v < this.params.kire) continue;
      }
      this.params[k] = v;
      delete this.pending[k];
    }
  }

  // ---- transport ------------------------------------------------------------

  get position(): { label: string; loopIndex: number; step: number; intro: boolean } {
    return {
      label: this.bar?.label ?? '',
      loopIndex: this.cursor.intro ? 0 : this.cursorBarIndex(),
      step: this.step,
      intro: this.bar?.inIntro ?? this.cursor.intro,
    };
  }
  private curLoopIndex = 0;
  private cursorBarIndex(): number {
    return this.curLoopIndex;
  }

  /** Jump to a loop label at the next bar (boss phase change). */
  jumpNext(label: string): void {
    const i = this.def.loop.indexOf(label);
    if (i >= 0) this.forced = { intro: false, i };
  }
  private forced: { intro: boolean; i: number } | null = null;

  private labelAt(c: { intro: boolean; i: number }): string {
    return c.intro ? this.def.intro[c.i] : this.def.loop[c.i];
  }

  private advanceCursor(c: { intro: boolean; i: number }): { intro: boolean; i: number } | null {
    if (c.intro) {
      if (c.i + 1 < this.def.intro.length) return { intro: true, i: c.i + 1 };
      if (!this.def.loop.length) return null;
      return { intro: false, i: 0 };
    }
    if (!this.def.loop.length) return null;
    return { intro: false, i: (c.i + 1) % this.def.loop.length };
  }

  private beginBar(): boolean {
    this.snap = {
      t0: this.nextT,
      cursor: { ...this.cursor },
      barNo: this.barNo,
      loopCount: this.loopCount,
      curLoopIndex: this.curLoopIndex,
      bar: this.bar,
      prevBar: this.prevBar,
      parts: this.parts.map((rt) => ({ prevMidi: rt.prevMidi, prevEnd: rt.prevEnd, state: { ...rt.state } })),
      songState: { ...this.state },
    };
    // bar-level params first: the route (boss phases) must see the new phase
    this.applyPending(true);
    if (this.forced) {
      this.cursor = this.forced;
      this.forced = null;
    }
    const routed = this.def.route?.(this, this.cursor);
    if (routed) this.cursor = routed;
    const label = this.labelAt(this.cursor);
    const def = this.def.bars.get(label);
    if (!def) {
      this.ended = true;
      return false;
    }
    const bpm = def.bpm ?? this.def.tempo?.(this.params, this) ?? this.def.bpm;
    const stepDur = 60 / bpm / 4;
    const nxt = this.advanceCursor(this.cursor);
    const repeatTail = (this.state.repeatTail as Set<string> | undefined)?.has(label) ?? false;
    const steps = def.steps + (repeatTail ? 4 : 0);
    const t0 = this.nextT;
    const sw = this.def.swing;
    const swingOff = (s: number): number => {
      if (!sw) return 0;
      if (sw.kind === '16') return s % 2 === 1 ? (sw.amount - 0.5) * 2 : 0;
      const pos = s % 4;
      const a = sw.amount * 4;
      const warped = pos <= 2 ? (pos / 2) * a : a + ((pos - 2) / 2) * (4 - a);
      return warped - pos;
    };
    const chordIndex = (s: number) => {
      let k = 0;
      for (let i = 0; i < def.chords.length; i++) if (def.chords[i].step <= s) k = i;
      return k;
    };
    const b: BarCtx = {
      song: this,
      def,
      label,
      section: sectionOf(label),
      num: numOf(label),
      steps,
      t0,
      stepDur,
      bpm,
      loop: this.loopCount,
      barNo: this.barNo,
      inIntro: this.cursor.intro,
      p: this.params,
      nextLabel: nxt ? this.labelAt(nxt) : null,
      src: (s: number) => (repeatTail && s >= 16 ? s - 4 : s),
      time: (s: number) => {
        const si = Math.floor(s);
        const frac = s - si;
        return t0 + (s + (frac === 0 ? swingOff(((si % 16) + 16) % 16) : 0)) * stepDur;
      },
      chordAt: (s: number) => def.chords[chordIndex(s)]?.chord ?? EMPTY_CHORD,
      chordIndex,
      chordSpan: (s: number) => {
        const i = chordIndex(s);
        return [def.chords[i]?.step ?? 0, def.chords[i + 1]?.step ?? steps];
      },
      data: {},
    };
    this.prevBar = this.bar;
    this.bar = b;
    if (!this.cursor.intro) this.curLoopIndex = this.cursor.i;
    // keep tempo-synced delays in time
    for (const rt of this.parts)
      if (rt.delay) {
        const want = stepDur * (this.def.parts.find((p) => p.id === rt.id)?.fx?.delay?.steps ?? 3);
        if (Math.abs(rt.delay.delayTime.value - want) > 0.001) rt.delay.delayTime.setValueAtTime(want, t0);
      }
    this.def.onBar?.(this, b);
    return true;
  }

  /** Schedule everything that starts before `until`. */
  pump(until: number): void {
    if (this.disposed) return;
    if (this.g.offline) this.pumpSteps(until);
    else withLatePolicy(LATE_TOL, LATE_LONG, () => this.pumpSteps(until));
    this.def.pumpFree?.(this, until);
    if (this.ended && this.onEnd && this.g.ctx.currentTime + 0.12 >= this.endTime) {
      const f = this.onEnd;
      this.onEnd = null;
      f(this.endTime);
    }
  }

  private pumpSteps(until: number): void {
    // forget steps that have finished sounding
    const old = this.g.ctx.currentTime - 0.3;
    let drop = 0;
    while (drop < this.hist.length && this.hist[drop].t < old) drop++;
    if (drop) this.hist.splice(0, drop);
    if (this.halted || this.ended) return;
    let guard = 0;
    while (this.nextT < until && guard++ < 512) {
      if (this.nextT >= this.stopAt || this.nextT >= this.haltAt) break;
      if (this.step === 0 && !this.beginBar()) break;
      const b = this.bar!;
      const s = this.step;
      if (s % 4 === 0 && s > 0) this.applyPending(false);
      const src = b.src(s);
      const rec: StepRec = { t: b.time(s), b, src, actual: s, hs: [] };
      for (let i = 0; i < this.parts.length; i++) {
        const pd = this.def.parts[i];
        if (this.solo && !this.solo.has(pd.id)) continue;
        if (pd.when && !pd.when(b, src)) continue;
        rec.hs[i] = this.runPart(i, b, src, s);
      }
      this.hist.push(rec);
      this.step++;
      if (this.step >= b.steps) {
        this.step = 0;
        this.nextT = b.t0 + b.steps * b.stepDur;
        this.barNo++;
        const n = this.advanceCursor(this.cursor);
        if (!n) {
          this.ended = true;
          this.endTime = this.nextT;
          break;
        }
        if (!this.cursor.intro && !n.intro && n.i === 0) this.loopCount++;
        this.cursor = n;
      } else this.nextT = b.t0 + this.step * b.stepDur;
    }
  }

  /** Run one part for one step, keeping the voices it starts (cap + corrections). */
  private runPart(i: number, b: BarCtx, src: number, actual: number): VoiceHandle[] | undefined {
    const list: VoiceHandle[] = [];
    captureVoices(list, () => this.def.parts[i].step(b, src, actual, this.parts[i]));
    if (!list.length) return undefined;
    for (const h of list) this.admit(h);
    return list;
  }

  /**
   * The BGM voice cap (11.5: 40 voices, FM modulators not counted): when a
   * new voice would be the 41st sounding at its start, the quietest voice
   * sounding then (the new one included) is cut with a 10 ms fade.
   */
  private admit(h: VoiceHandle): void {
    if (!h.end) return;
    const t = h.start;
    const snd = this.sounding;
    for (let k = snd.length - 1; k >= 0; k--) if (snd[k].end <= t) snd.splice(k, 1);
    snd.push(h);
    let over = 0;
    for (const x of snd) if (x.start <= t) over++;
    over -= BGM_VOICE_CAP;
    while (over-- > 0) {
      let q = -1;
      for (let k = 0; k < snd.length; k++) if (snd[k].start <= t && (q < 0 || snd[k].vol < snd[q].vol)) q = k;
      if (q < 0) break;
      snd[q].stop(0.01, t);
      snd.splice(q, 1);
      this.capped++;
    }
  }
  /** QA: voices cut by the cap. */
  capped = 0;
  private readonly sounding: VoiceHandle[] = [];
  private readonly hist: StepRec[] = [];
  private snap: BarSnap | null = null;

  /** QA: most voices sounding at once so far (after the cap). */
  get soundingNow(): number {
    const t = this.g.ctx.currentTime;
    return this.sounding.filter((h) => h.start <= t && h.end > t).length;
  }

  /** Fade out and release all nodes. */
  stop(fade = 0.5, at = this.g.ctx.currentTime): void {
    if (this.stopped) return;
    this.stopped = true;
    const g = this.fade.gain;
    const t = Math.max(at, this.g.ctx.currentTime);
    g.cancelScheduledValues(t);
    g.setValueAtTime(g.value, t);
    if (fade <= 0.001) g.linearRampToValueAtTime(0, t + 0.012);
    else g.linearRampToValueAtTime(0, t + fade);
    this.stopAt = t + Math.max(0.012, fade);
    this.def.onStop?.(this, t, fade);
    const tail = this.stopAt + 0.3;
    this.disposeAt(tail);
  }

  private disposeAt(t: number): void {
    const ms = Math.max(0, (t - this.g.ctx.currentTime) * 1000) + 3500;
    if (this.g.offline) return;
    setTimeout(() => this.dispose(), ms);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    try {
      this.out.disconnect();
      this.det.stop();
      this.tape?.slow.stop();
      this.tape?.fast.stop();
      for (const [l, g] of this.lfoLinks) l.disconnect(g);
    } catch {
      /* already */
    }
    for (const rt of this.parts) releaseShared(rt.input);
    this.hist.length = 0;
    this.sounding.length = 0;
  }

  get isDisposed(): boolean {
    return this.disposed;
  }

  get currentBar(): BarCtx | null {
    return this.bar;
  }

  private prevBar: BarCtx | null = null;
  /** The bar sounding at ctx time t (the scheduler runs up to 0.3 s ahead). */
  barAt(t: number): BarCtx | null {
    for (let r = this.hist.length - 1; r >= 0; r--) if (this.hist[r].t <= t) return this.hist[r].b;
    return this.bar && t >= this.bar.t0 ? this.bar : this.prevBar ?? this.bar;
  }
  /** What is audible at ctx time t. */
  audibleAt(t: number): { label: string; beat: number; bpm: number; intro: boolean; loop: number; loopIndex: number } | null {
    const b = this.barAt(t);
    if (!b) return null;
    const li = b.inIntro ? 0 : Math.max(0, this.def.loop.indexOf(b.label));
    return { label: b.label, beat: Math.max(0, (t - b.t0) / (b.stepDur * 4)), bpm: b.bpm, intro: b.inIntro, loop: b.loop, loopIndex: li };
  }

  /** Pause gate for pausing jingles (sequencer keeps running). */
  setPaused(on: boolean, ramp: number, at = this.g.ctx.currentTime): void {
    const g = this.pause.gain;
    g.cancelScheduledValues(at);
    g.setValueAtTime(g.value, at);
    g.linearRampToValueAtTime(on ? 0 : 1, at + ramp);
  }

  partRt(id: string): PartRt | undefined {
    return this.parts.find((p) => p.id === id);
  }

  /** Fade a part's level (boss final phase); v is relative to the part's resting level. */
  partGain(id: string, v: number, ramp: number, at = this.g.ctx.currentTime): void {
    const rt = this.partRt(id);
    if (!rt) return;
    const g = rt.input.gain;
    g.cancelScheduledValues(at);
    g.setValueAtTime(g.value, at);
    g.linearRampToValueAtTime(v * rt.base, at + Math.max(0.001, ramp));
  }
}

const EMPTY_CHORD: Chord = { name: '', root: 0, bass: 0, tones: [0, 4, 7] };

// ---------------------------------------------------------------------------
// Part factories

type Pred = (b: BarCtx, src: number) => boolean;
type Val<T> = T | ((b: BarCtx) => T);
const val = <T>(v: Val<T>, b: BarCtx): T => (typeof v === 'function' ? (v as (b: BarCtx) => T)(b) : v);

export interface BarIndex {
  bars: Map<string, { events: Ev[]; byStep: Map<number, Ev[]>; steps: number }>;
}

export function indexBars(mbars: MmlBar[]): BarIndex {
  const bars = new Map<string, { events: Ev[]; byStep: Map<number, Ev[]>; steps: number }>();
  for (const b of mbars) {
    const byStep = new Map<number, Ev[]>();
    for (const e of b.events) {
      if (!byStep.has(e.step)) byStep.set(e.step, []);
      byStep.get(e.step)!.push(e);
    }
    bars.set(b.label, { events: b.events, byStep, steps: b.steps });
  }
  return { bars };
}

export interface MelodyOpts {
  id: string;
  ins: Val<string>;
  bars: MmlBar[];
  vol?: number;
  vel?: number;
  fx?: PartFx;
  o?: Val<InsOpts>;
  transpose?: Val<number>;
  /** Fraction of the written length the gate stays open. */
  gate?: number;
  when?: Pred;
  /** Drop individual notes (return false). `n` counts notes in this part. */
  keep?(b: BarCtx, e: Ev, rt: PartRt, srcStep: number): boolean;
  /** Play another bar's material (needle skip): label + step mapping. */
  remap?(b: BarCtx): { label: string; map: (s: number) => number } | null;
  /** Map a label of the song to the label in these mml bars (variants). */
  alias?(label: string): string;
  /** Per-note opts (e.g. the recorder leak on one note). */
  noteOpts?(b: BarCtx, e: Ev): InsOpts | undefined;
}

export function melody(o: MelodyOpts): PartDef {
  const idx = indexBars(o.bars);
  return {
    id: o.id,
    vol: o.vol,
    fx: o.fx,
    when: o.when,
    melodySeq: () => o.bars.flatMap((b) => b.events.filter((e) => e.midis.length).map((e) => e.midis[e.midis.length - 1])),
    step(b, src, actual, rt) {
      const rm = o.remap?.(b) ?? null;
      const label = rm ? rm.label : o.alias ? o.alias(b.label) : b.label;
      const bar = idx.bars.get(label);
      if (!bar) return;
      const s2 = rm ? rm.map(src) : src;
      if (rm && s2 < 0) return;
      const evs = bar.byStep.get(s2);
      if (!evs) return;
      for (const e of evs) {
        if (!e.midis.length) continue;
        if (src === 0 && rt.state.tieSkip === label) {
          rt.state.tieSkip = null;
          continue;
        }
        if (o.keep && !o.keep(b, e, rt, s2)) continue;
        let len = e.len;
        let tied = false;
        if (e.tie) {
          // tie into the next note (same bar or the first note of the next bar)
          const i = bar.events.indexOf(e);
          const nx = bar.events[i + 1];
          if (nx && nx.midis[0] === e.midis[0]) len += nx.len;
          else if (!nx && b.nextLabel) {
            const nb = idx.bars.get(o.alias ? o.alias(b.nextLabel) : b.nextLabel);
            const f = nb?.events[0];
            if (f && f.midis[0] === e.midis[0]) {
              len += f.len;
              rt.state.tieSkip = o.alias ? o.alias(b.nextLabel) : b.nextLabel;
            }
          }
          tied = true;
        }
        const t = b.time(actual);
        const tEnd = b.time(actual + len);
        const gate = tied ? 1 : o.gate ?? 0.9;
        const dur = Math.max(0.02, (tEnd - t) * gate);
        const ins = INS[val(o.ins, b)];
        const tr = o.transpose !== undefined ? val(o.transpose, b) : 0;
        const baseO = o.o ? val(o.o, b) : undefined;
        const nO = o.noteOpts?.(b, e);
        const insO = nO ? { ...baseO, ...nO } : baseO;
        for (const m of e.midis) {
          ins({
            t,
            midi: m + tr,
            dur,
            vel: o.vel ?? 1,
            dest: rt.input,
            rev: rt.rev,
            det: rt.song.det,
            o: insO,
            prev: rt.prevMidi,
            legato: rt.prevEnd >= t - 0.02,
          });
        }
        rt.prevMidi = e.midis[e.midis.length - 1] + tr;
        rt.prevEnd = tEnd;
      }
    },
  };
}

export interface BassOpts {
  id: string;
  ins: Val<string>;
  pattern: Val<string>;
  vol?: number;
  fx?: PartFx;
  o?: Val<InsOpts>;
  transpose?: Val<number>;
  gate?: number;
  when?: Pred;
}

/** Bass from a pattern of chord tokens (2.2). */
export function bass(o: BassOpts): PartDef {
  const cache = new Map<string, { tok: string; step: number; len: number; chord: number }[]>();
  const eventsFor = (b: BarCtx) => {
    const pat = val(o.pattern, b);
    const key = `${b.label}|${pat}|${b.def.steps}`;
    let ev = cache.get(key);
    if (!ev) {
      ev = [];
      const toks = parseBassPattern(pat);
      const cs = b.def.chords;
      if (cs.length <= 1) {
        for (const t of toks) if (t.step < b.def.steps) ev.push({ ...t, len: Math.min(t.len, b.def.steps - t.step), chord: 0 });
      } else {
        // `・` bars: the first half of the pattern on each chord
        cs.forEach((c, ci) => {
          const end = cs[ci + 1]?.step ?? b.def.steps;
          const span = end - c.step;
          for (const t of toks) if (t.step < Math.min(8, span)) ev!.push({ ...t, step: c.step + t.step, len: Math.min(t.len, span - t.step), chord: ci });
        });
      }
      cache.set(key, ev);
    }
    return ev;
  };
  return {
    id: o.id,
    vol: o.vol,
    fx: o.fx,
    when: o.when,
    step(b, src, actual, rt) {
      const ev = eventsFor(b);
      for (const e of ev) {
        if (e.step !== src || e.tok === '-') continue;
        const chord = b.def.chords[e.chord]?.chord;
        if (!chord) continue;
        const m = bassMidi(chord, e.tok) + (o.transpose !== undefined ? val(o.transpose, b) : 0);
        const t = b.time(actual);
        const dur = (b.time(actual + e.len) - t) * (o.gate ?? 0.85);
        const baseO = o.o ? val(o.o, b) : undefined;
        INS[val(o.ins, b)]({
          t,
          midi: m,
          dur,
          vel: 1,
          dest: rt.input,
          rev: rt.rev,
          det: rt.song.det,
          o: e.tok === "R'" ? { ...baseO, pull: true } : baseO,
          prev: rt.prevMidi,
          legato: rt.prevEnd >= t - 0.02,
        });
        rt.prevMidi = m;
        rt.prevEnd = t + dur;
      }
    },
  };
}

export interface DrumOpts {
  id: string;
  vol?: number;
  fx?: PartFx;
  /** drum id → pattern (per bar), null = silent. */
  kit: Record<string, Val<string | null>>;
  vel?: Record<string, number>;
  /** Some drums have another id per step (open hat on step 14). */
  when?: Pred;
}

export function drums(o: DrumOpts): PartDef {
  const ids = Object.keys(o.kit);
  return {
    id: o.id,
    vol: o.vol,
    fx: o.fx,
    when: o.when,
    step(b, src, actual, rt) {
      for (const id of ids) {
        const pat = val(o.kit[id], b);
        if (!pat) continue;
        const v = drumVel(pat[src]);
        if (!v) continue;
        const drum = DRM[id.replace(/#.*$/, '')];
        drum?.({ t: b.time(actual), vel: v * (o.vel?.[id] ?? 1), dest: rt.input, rev: rt.rev });
      }
    },
  };
}

export interface CompOpts {
  id: string;
  ins: Val<string>;
  rhythm: Val<string | null>;
  vol?: number;
  fx?: PartFx;
  o?: Val<InsOpts>;
  /** 'top3' = the top 3 notes of the 4-note voicing; 'full' = all 4. */
  notes?: 'top3' | 'full';
  /** Fixed length in steps, or 'next' = sustain until the next hit. */
  len?: number | 'next' | ((hitIndex: number) => number);
  transpose?: Val<number>;
  lo?: number;
  hi?: number;
  when?: Pred;
  gate?: number;
}

/** Rhythmic chords (comping) voiced with smooth voice leading. */
export function comp(o: CompOpts): PartDef {
  return {
    id: o.id,
    vol: o.vol,
    fx: o.fx,
    when: o.when,
    step(b, src, actual, rt) {
      const pat = val(o.rhythm, b);
      if (!pat) return;
      const v = drumVel(pat[src]);
      if (!v) return;
      const chord = b.chordAt(src);
      const key = `${chord.name}`;
      let voicing = rt.state.voicing as number[] | undefined;
      if (rt.state.voiceKey !== key || !voicing) {
        voicing = voiceLead(voicePcs(chord, 4, true), (rt.state.voicing as number[]) ?? null, o.lo ?? 55, o.hi ?? 76);
        rt.state.voicing = voicing;
        rt.state.voiceKey = key;
      }
      const notes = o.notes === 'full' ? voicing : voicing.slice(-3);
      let hitIndex = 0;
      for (let i = 0; i < src; i++) if (drumVel(pat[i])) hitIndex++;
      let len: number;
      if (o.len === 'next' || o.len === undefined) {
        let nxt = src + 1;
        while (nxt < b.steps && !drumVel(pat[nxt])) nxt++;
        len = nxt - src;
      } else if (typeof o.len === 'function') len = o.len(hitIndex);
      else len = o.len;
      const t = b.time(actual);
      const dur = (b.time(actual + len) - t) * (o.gate ?? 0.92);
      const tr = o.transpose !== undefined ? val(o.transpose, b) : 0;
      const ins = INS[val(o.ins, b)];
      for (const m of notes) ins({ t, midi: m + tr, dur, vel: v / 0.7 > 1 ? 1 : v / 0.7, dest: rt.input, rev: rt.rev, det: rt.song.det, o: o.o ? val(o.o, b) : undefined });
    },
  };
}

export interface PadOpts {
  id: string;
  ins?: Val<string>;
  vol?: number;
  fx?: PartFx;
  o?: Val<InsOpts>;
  transpose?: Val<number>;
  when?: Pred;
  /** Chords shorter than a bar still get one pad each; 'bar' = one per bar. */
  per?: 'chord' | 'bar';
  count?: number;
  lo?: number;
  hi?: number;
  omitRoot?: boolean;
}

/** Whole-note pads (3.4 voicing rules). */
export function pads(o: PadOpts): PartDef {
  return {
    id: o.id,
    vol: o.vol,
    fx: o.fx,
    when: o.when,
    step(b, src, actual, rt) {
      const [cs, ce] = b.chordSpan(src);
      if (src !== cs) return;
      if (o.per === 'bar' && src !== 0) return;
      const chord = b.chordAt(src);
      const voicing = voiceLead(voicePcs(chord, o.count ?? 4, o.omitRoot ?? true), (rt.state.voicing as number[]) ?? null, o.lo ?? 55, o.hi ?? 76);
      rt.state.voicing = voicing;
      const endStep = o.per === 'bar' ? b.steps : ce + (actual - src);
      const t = b.time(actual);
      const dur = b.time(endStep) - t;
      const tr = o.transpose !== undefined ? val(o.transpose, b) : 0;
      const ins = INS[o.ins ? val(o.ins, b) : 'ins_pad'];
      for (const m of voicing) ins({ t, midi: m + tr, dur, vel: 1, dest: rt.input, rev: rt.rev, det: rt.song.det, o: o.o ? val(o.o, b) : undefined });
    },
  };
}

export interface ArpOpts {
  id: string;
  ins: Val<string>;
  /** Steps per note. */
  rate: number;
  /** Chord-tone degrees in order, cycled: 'R','3','5','7','8'. */
  shape: string[];
  /** MIDI range for the root. */
  rootLo: number;
  vol?: number;
  fx?: PartFx;
  o?: Val<InsOpts>;
  transpose?: Val<number>;
  gate?: number;
  when?: Pred;
}

export function arp(o: ArpOpts): PartDef {
  return {
    id: o.id,
    vol: o.vol,
    fx: o.fx,
    when: o.when,
    step(b, src, actual, rt) {
      if (src % o.rate !== 0) return;
      const chord = b.chordAt(src);
      const [cs] = b.chordSpan(src);
      const k = Math.floor((src - cs) / o.rate) % o.shape.length;
      const root = o.rootLo + ((chord.root - o.rootLo) % 12 + 12) % 12;
      const iv = (d: string): number => {
        const tones = chord.tones.map((pc) => (pc - chord.root + 12) % 12).sort((a, c) => a - c);
        const find = (cands: number[]) => cands.find((c) => tones.includes(c));
        switch (d) {
          case 'R': return 0;
          case '3': return find([4, 3, 5, 2]) ?? 4;
          case '5': return find([7, 6, 8]) ?? 7;
          case '7': return find([10, 11, 9]) ?? 12;
          case '9': return (find([2, 1, 3]) ?? 2) + 12;
          case '8': return 12;
          default: return 0;
        }
      };
      const m = root + iv(o.shape[k]) + (o.transpose !== undefined ? val(o.transpose, b) : 0);
      const t = b.time(actual);
      const dur = (b.time(actual + o.rate) - t) * (o.gate ?? 0.8);
      INS[val(o.ins, b)]({ t, midi: m, dur, vel: 1, dest: rt.input, rev: rt.rev, det: rt.song.det, o: o.o ? val(o.o, b) : undefined });
    },
  };
}

/** One-off hits: fn runs on matching bars/steps. */
export function hits(id: string, list: { when: (b: BarCtx, src: number) => boolean; fn: (b: BarCtx, t: number, rt: PartRt, actual: number) => void }[], vol = 1): PartDef {
  return {
    id,
    vol,
    step(b, src, actual, rt) {
      for (const h of list) if (h.when(b, src)) h.fn(b, b.time(actual), rt, actual);
    },
  };
}

/** Continuous drm_brush_swirl-like beds need a voice that lasts the song. */
export function bed(id: string, start: (t: number, dest: AudioNode) => (at: number, fade: number) => void, vol = 1): PartDef {
  return {
    id,
    vol,
    init(rt) {
      rt.state.stop = start(rt.song.startTime, rt.input);
    },
    step() {},
  };
}

export { voice };

function kRate(p: AudioParam): void {
  try {
    p.automationRate = 'k-rate';
  } catch {
    /* fixed-rate param */
  }
}
