// BGM manager: which song is playing, cross-fades, "resume from where we
// left", jingle rules (6.1), music params (7), ducking (11.3) and the
// transition helpers of 12 (encounter tape brake, return to field).

import { addTask, atTime, removeTask } from './clock';
import { cur, dbToGain, hasGraph, liveGraph, type Graph } from './engine';
import { legacyBgm, songTable } from './registry';
import { SongPlayer, type Params, type SongDef } from './sequencer';

export type MusicParam = 'stage' | 'kire' | 'boss_phase' | 'muffle';

export interface PlayOpts {
  /** Fade-in (and cross-fade) seconds. */
  fade?: number;
  /** Continue from the bar where this song was last stopped (12.2). */
  resume?: boolean;
  /** Variant: 'stage0' | 'stage1' | 'stage2' (town / indoor), 'muffled'. */
  variant?: string;
}

interface Active {
  id: string;
  player: SongPlayer | null;
  legacyStop?: (fade: number) => void;
}

const params: Params & { muffle: number } = { stage: 0, kire: 0, boss_phase: 1, muffle: 0 };
let current: Active | null = null;
/** Pausing jingle in progress (levelup / item / join) and its queue. */
let jingle: { id: string; player: SongPlayer } | null = null;
const jingleQueue: string[] = [];
const lastStops = new Map<string, { loopIndex: number; wall: number }>();
let pending: { id: string; opts: PlayOpts } | null = null;
/** Field BGM remembered at the encounter (12.1 / 12.3). */
let fieldBgm: string | null | undefined;
const RESUME_WINDOW = 90_000;

/** Songs that continue where they left off by default (12.2). */
const RESUMABLE = /^bgm_(town_s[012]|home|shop|mall)$/;

function g(): Graph {
  return cur();
}

export function musicParams(): Readonly<typeof params> {
  return params;
}

export function currentPlayer(): SongPlayer | null {
  return current?.player ?? null;
}

export function currentJingle(): SongPlayer | null {
  return jingle?.player ?? null;
}

export function currentId(): string | null {
  return current?.id ?? pending?.id ?? null;
}

function resolveId(id: string, opts: PlayOpts): string {
  if (id === 'bgm_town') {
    const v = opts.variant ?? `stage${params.stage >= 3 ? 0 : params.stage}`;
    const n = /stage(\d)/.exec(v)?.[1] ?? '0';
    return `bgm_town_s${n}`;
  }
  return id;
}

function startPlayer(def: SongDef, opts: { fadeIn?: number; fromLoopBar?: number; at?: number }): SongPlayer {
  const gr = g();
  const p = new SongPlayer(gr, def, gr.musicBus, { ...opts, params: { stage: params.stage, kire: params.kire, boss_phase: params.boss_phase } });
  const task = {
    pump: (until: number) => {
      p.pump(until);
      if (p.isDisposed) removeTask(task);
    },
  };
  addTask(task);
  return p;
}

function rememberStop(a: Active | null): void {
  if (!a?.player) return;
  const pos = a.player.position;
  lastStops.set(a.id, { loopIndex: pos.intro ? 0 : pos.loopIndex, wall: performance.now() });
}

function stopActive(a: Active | null, fade: number): void {
  if (!a) return;
  rememberStop(a);
  if (a.player) a.player.stop(fade);
  else a.legacyStop?.(fade);
}

export function playBgm(idIn: string, opts: PlayOpts = {}): void {
  const id = resolveId(idIn, opts);
  if (!hasGraph()) {
    pending = { id, opts };
    return;
  }
  const def = songTable.get(id);
  if (def?.jingle) {
    playJingle(id, def, opts);
    return;
  }
  if (/^bgm_town_s(\d)$/.test(id)) setStage(parseInt(id.slice(-1), 10));
  if (opts.variant && /^stage\d$/.test(opts.variant)) setStage(parseInt(opts.variant.slice(5), 10));
  if (current?.id === id && (!current.player || !current.player.stopped)) {
    applyVariant(current.player, opts.variant);
    return;
  }
  // a pausing jingle is cut short by a real song change
  if (jingle) {
    jingle.player.stop(0.2);
    jingle = null;
    jingleQueue.length = 0;
  }
  const hadSong = !!current;
  stopActive(current, opts.fade ?? 0.4);
  current = null;
  if (!def) {
    const legacy = legacyBgm.get(id);
    if (legacy) {
      current = { id, player: null, legacyStop: legacy.start() };
      return;
    }
    if (import.meta.env.DEV) console.warn(`[audio] unknown bgm ${id}`);
    return;
  }
  let fromLoopBar: number | undefined;
  let fadeIn = opts.fade ?? 0;
  const wantResume = opts.resume ?? RESUMABLE.test(id);
  if (wantResume) {
    const ls = lastStops.get(id);
    if (ls && performance.now() - ls.wall < RESUME_WINDOW) {
      fromLoopBar = ls.loopIndex;
      fadeIn = opts.fade ?? 0.6;
    } else if (ls || opts.resume) fromLoopBar = 0; // expired: from the top, skipping the intro
  }
  if (hadSong && !fadeIn) fadeIn = 0.05;
  const p = startPlayer(def, { fadeIn, fromLoopBar });
  current = { id, player: p };
  applyVariant(p, opts.variant);
}

function applyVariant(p: SongPlayer | null, v: string | undefined): void {
  if (!p) return;
  const t = p.g.ctx.currentTime;
  const f = p.filter.frequency;
  if (v === 'muffled') {
    f.setTargetAtTime(1800, t, 0.05);
    p.out.gain.setTargetAtTime(dbToGain(p.def.gainDb - 6), t, 0.05);
  } else if (p.state.muffledVariant) {
    f.setTargetAtTime(20000, t, 0.05);
    p.out.gain.setTargetAtTime(dbToGain(p.def.gainDb), t, 0.05);
  }
  p.state.muffledVariant = v === 'muffled';
}

function playJingle(id: string, def: SongDef, opts: PlayOpts): void {
  if (def.jingle === 'pause') {
    if (jingle) {
      if (jingleQueue.length < 2) jingleQueue.push(id);
      return;
    }
    const under = current?.player ?? null;
    under?.setPaused(true, 0.04);
    const p = startPlayer(def, { fadeIn: opts.fade });
    jingle = { id, player: p };
    p.onEnd = (endT) => {
      // keep the last chord short (≤0.8 s) so it never fights the song
      p.stop(0.25, endT + 0.55);
      atTime(endT + 0.35, () => {
        if (jingle?.player !== p) return;
        jingle = null;
        const nextId = jingleQueue.shift();
        if (nextId) {
          const nd = songTable.get(nextId);
          if (nd) {
            playJingle(nextId, nd, {});
            return;
          }
        }
        current?.player?.setPaused(false, 0.4);
      });
    };
    return;
  }
  if (jingle) {
    jingle.player.stop(0.05);
    jingle = null;
    jingleQueue.length = 0;
  }
  // replace (victory: cut in 30 ms) or gameover (fade 0.8 s)
  const fade = def.jingle === 'replace' ? 0.03 : 0.8;
  stopActive(current, fade);
  const p = startPlayer(def, { fadeIn: opts.fade });
  current = { id, player: p };
  if (def.jingle === 'gameover')
    p.onEnd = (endT) => {
      atTime(endT + 3.5, () => {
        if (current?.player === p) {
          p.stop(0.5);
          current = null;
        }
      });
    };
}

export function stopBgm(fade = 0.5): void {
  pending = null;
  if (!hasGraph()) return;
  if (jingle) {
    jingle.player.stop(fade);
    jingle = null;
    jingleQueue.length = 0;
  }
  stopActive(current, fade);
  current = null;
}

export function flushPending(): void {
  if (pending) {
    const p = pending;
    pending = null;
    playBgm(p.id, p.opts);
  }
}

/** Lower the pitch while fading out, then stop (17:00; 40_audio 13.1). */
export function bgmTapeStop(seconds: number, semitones: number): void {
  const a = current;
  if (!a?.player) {
    stopBgm(seconds);
    return;
  }
  const p = a.player;
  const t = p.g.ctx.currentTime;
  const d = p.det.offset;
  d.cancelScheduledValues(t);
  d.setValueAtTime(d.value, t);
  d.linearRampToValueAtTime(p.baseDetune + semitones * 100, t + seconds);
  const fg = p.fade.gain;
  fg.cancelScheduledValues(t);
  fg.setValueAtTime(fg.value, t);
  fg.setTargetAtTime(0, t + seconds * 0.35, seconds * 0.2);
  rememberStop(a);
  p.stop(seconds, t + seconds * 0.85);
  current = null;
}

/** A hole of silence in the music (sequencer keeps running). */
export function muteMusic(seconds: number): void {
  if (!hasGraph()) return;
  const gr = g();
  const m = gr.musicMute.gain;
  const t = gr.ctx.currentTime;
  m.cancelScheduledValues(t);
  m.setValueAtTime(m.value, t);
  m.linearRampToValueAtTime(0, t + 0.012);
  m.setValueAtTime(0, t + seconds);
  m.linearRampToValueAtTime(1, t + seconds + 0.015);
}

// ---- ducking (11.3): deepest wins, never multiplied -----------------------

let duckLevel = 1;
let duckUntil = 0;

export function duck(level: number, attack: number, hold: number, release: number, at?: number): void {
  if (!hasGraph()) return;
  const gr = g();
  const t = Math.max(at ?? gr.ctx.currentTime, gr.ctx.currentTime);
  if (duckUntil > t && duckLevel <= level) {
    if (t + attack + hold <= duckUntil) return;
    level = duckLevel;
  }
  const p = gr.musicDuck.gain;
  p.cancelScheduledValues(t);
  p.setValueAtTime(Math.min(p.value, 1), t);
  p.linearRampToValueAtTime(level, t + attack);
  p.setValueAtTime(level, t + attack + hold);
  p.linearRampToValueAtTime(1, t + attack + hold + release);
  duckLevel = level;
  duckUntil = t + attack + hold;
}

/** Existing API: temporarily lower music (e.g. under a jingle). */
export function duckMusic(amount: number, seconds: number): void {
  duck(amount, 0.05, seconds, 0.4);
}

let ambDuckUntil = 0;
export function duckAmbience(level: number, attack: number, hold: number, release: number): void {
  if (!hasGraph()) return;
  const gr = g();
  const t = gr.ctx.currentTime;
  const p = gr.ambDuck.gain;
  p.cancelScheduledValues(t);
  p.setValueAtTime(p.value, t);
  p.linearRampToValueAtTime(level, t + attack);
  p.setValueAtTime(level, t + attack + hold);
  p.linearRampToValueAtTime(1, t + attack + hold + release);
  ambDuckUntil = t + attack + hold;
  void ambDuckUntil;
}

// ---- params ------------------------------------------------------------------

function setStage(n: number): void {
  if (params.stage === n) return;
  params.stage = n;
  current?.player?.setParam('stage', n);
  stageListeners.forEach((f) => f(n));
}

export const stageListeners: ((stage: number) => void)[] = [];

export function setMusicParam(name: MusicParam, value: number): void {
  if (name === 'muffle') {
    const v = Math.max(0, Math.min(1, value));
    params.muffle = v;
    if (!hasGraph()) return;
    const gr = g();
    const t = gr.ctx.currentTime;
    const tc = v > 0 ? 0.15 / 3 : 0.2 / 3;
    gr.musicFilter.frequency.setTargetAtTime(v > 0 ? 20000 * Math.pow(1800 / 20000, v) : 20000, t, tc);
    gr.musicMuffle.gain.setTargetAtTime(dbToGain(-3 * v), t, tc);
    return;
  }
  if (name === 'stage') {
    setStage(value);
    return;
  }
  params[name] = value;
  current?.player?.setParam(name, value);
}

// ---- transitions (12) ---------------------------------------------------------

/**
 * Field → battle, the moment of contact (12.1): a tape brake on the field
 * song (−500 cents in 120 ms, filter 8k→300 Hz, silent in 150 ms), its bar is
 * remembered for the return; ambience −12 dB.
 */
export function musicEncounter(): void {
  fieldBgm = current && !songTable.get(current.id)?.battle ? current.id : null;
  const a = current;
  if (a?.player) {
    const p = a.player;
    const t = p.g.ctx.currentTime;
    const d = p.det.offset;
    d.cancelScheduledValues(t);
    d.setValueAtTime(d.value, t);
    d.linearRampToValueAtTime(p.baseDetune - 500, t + 0.12);
    p.filter.frequency.cancelScheduledValues(t);
    p.filter.frequency.setValueAtTime(8000, t);
    p.filter.frequency.exponentialRampToValueAtTime(300, t + 0.15);
    rememberStop(a);
    p.stop(0.15);
    current = null;
  } else stopActive(a, 0.15);
  if (hasGraph()) {
    const gr = g();
    const t = gr.ctx.currentTime;
    gr.ambDuck.gain.cancelScheduledValues(t);
    gr.ambDuck.gain.setValueAtTime(gr.ambDuck.gain.value, t);
    gr.ambDuck.gain.linearRampToValueAtTime(dbToGain(-12), t + 0.2);
  }
  params.kire = 0;
}

/** Fled: the battle song trips over itself (−300 cents, 200 ms). */
export function musicFlee(): void {
  const a = current;
  if (!a?.player) return;
  const p = a.player;
  const t = p.g.ctx.currentTime;
  const d = p.det.offset;
  d.cancelScheduledValues(t);
  d.setValueAtTime(d.value, t);
  d.linearRampToValueAtTime(-300, t + 0.2);
  p.stop(0.22);
  current = null;
}

/**
 * Battle → field (12.3): stop what plays (0.3 s), then 300 ms later bring
 * back the field song from its bar with a 0.8 s fade-in; ambience returns.
 */
export function musicReturnToField(fadeIn = 0.8): void {
  stopBgm(0.3);
  params.kire = 0;
  const id = fieldBgm;
  fieldBgm = undefined;
  const gr = liveGraph();
  if (!gr) return;
  const t = gr.ctx.currentTime;
  gr.ambDuck.gain.cancelScheduledValues(t);
  gr.ambDuck.gain.setValueAtTime(gr.ambDuck.gain.value, t);
  gr.ambDuck.gain.linearRampToValueAtTime(1, t + 0.6);
  if (id) atTime(t + 0.3, () => playBgm(id, { resume: true, fade: fadeIn }));
}

/** Notify the playing song of an SFX (the boss pad listens for the bell). */
export function notifySongSfx(id: string): void {
  const p = current?.player;
  p?.def.onSfx?.(p, id);
}

export function musicDebugState() {
  const p = current?.player;
  return {
    id: current?.id ?? null,
    jingle: jingle?.id ?? null,
    queue: [...jingleQueue],
    bar: p?.currentBar?.label ?? null,
    loop: p?.loopCount ?? 0,
    params: { ...params, songParams: p ? { ...p.params } : null },
    fieldBgm: fieldBgm ?? null,
  };
}
