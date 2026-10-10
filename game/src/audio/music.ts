// BGM manager: which song is playing, cross-fades, "resume from where we
// left", jingle rules (6.1), music params (7), ducking (11.3) and the
// transition helpers of 12 (encounter tape brake, return to field).

import { addTask, atTime, removeTask } from './clock';
import { cur, dbToGain, hasGraph, liveGraph, type Graph } from './engine';
import { songGainDb } from './mix';
import { legacyBgm, noteUnknown, songTable } from './registry';
import { MUSIC_LOOKAHEAD, PARAM_DEFAULTS, SongPlayer, type Params, type SongDef } from './sequencer';

export type MusicParam = 'stage' | 'kire' | 'boss_phase' | 'muffle' | 'detune' | 'h_stage' | 'h_light' | 'tenko' | 'h_rest' | 'clock' | 'h_deli';

export interface PlayOpts {
  /** Fade-in (and cross-fade) seconds. */
  fade?: number;
  /** Continue from the bar where this song was last stopped (12.2). */
  resume?: boolean;
  /**
   * Variant: 'stage0' | 'stage1' | 'stage2' (town / indoor), 'muffled';
   * bgm_hoshi_night: 'outdoor' | 'house' | 'barn' | 'school' | 'hill' (53 5.2).
   */
  variant?: string;
}

interface Active {
  id: string;
  player: SongPlayer | null;
  legacyStop?: (fade: number) => void;
}

const params: Params & { muffle: number; detune: number } = { ...PARAM_DEFAULTS, muffle: 0, detune: 0 };
/** The room each variant song was last heard from (a return from battle keeps it: 53 11). */
const songRoom = new Map<string, number>();
let current: Active | null = null;
/** Pausing jingle in progress (levelup / item / join) and its queue. */
let jingle: { id: string; player: SongPlayer } | null = null;
const jingleQueue: string[] = [];
const lastStops = new Map<string, { loopIndex: number; wall: number }>();
let pending: { id: string; opts: PlayOpts } | null = null;
/** Field BGM remembered at the encounter (12.1 / 12.3). */
let fieldBgm: string | null | undefined;
const RESUME_WINDOW = 90_000;
/** Music is scheduled in slices of this many seconds (see startPlayer). */
const BATCH = 0.15;

/** Songs that continue where they left off by default (12.2; 53 5.1 adds 星見台の夜). */
const RESUMABLE = /^bgm_(town_s[012]|home|shop|mall|hoshi_night)$/;

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

function startPlayer(def: SongDef, opts: { fadeIn?: number; fromLoopBar?: number; at?: number; room?: number; haltIn?: number }): SongPlayer {
  const gr = g();
  const { muffle: _m, detune: _d, ...song } = params;
  void _m;
  void _d;
  const { haltIn, ...po } = opts;
  const p = new SongPlayer(gr, def, gr.musicBus, { ...po, params: { ...song, h_room: opts.room ?? 0 } });
  if (haltIn !== undefined) p.haltAt = p.startTime + haltIn;
  if (params.detune) p.setUserDetune(params.detune, 0, p.startTime);
  // Batching: the clock ticks every 25 ms, but every batch of new nodes makes
  // the audio thread re-plan its graph. The song is topped up in 0.15 s
  // slices instead: whenever less than MUSIC_LOOKAHEAD is scheduled, it is
  // filled to MUSIC_LOOKAHEAD + 0.15 s (0.3–0.45 s ahead, ~7 batches a second).
  let horizon = 0;
  const task = {
    lookahead: MUSIC_LOOKAHEAD,
    pump: (until: number) => {
      // the AudioContext was replaced under this song (detachForRebuild)
      if (p.g !== liveGraph() && !p.g.offline) {
        removeTask(task);
        p.dispose();
        return;
      }
      if (until > horizon || p.stopped) {
        horizon = until + BATCH;
        p.pump(horizon);
      } else p.pump(-1);
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
    noteUnknown('bgm', id);
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
  // every boss fight (a retry after a loss too) opens in phase 1; the battle
  // raises it to 2 and 3 as the fight goes on (7.3)
  if (id === 'bgm_boss' || id === 'bgm_boss_yobimodoshi') params.boss_phase = 1;
  // the light, the name tags and Tetsuya's rest belong to one fight (53 6.2–6.4);
  // h_deli is not among them: the delivery goes on after a fight on the way (6.6)
  params.h_light = 0;
  params.tenko = 0;
  params.h_rest = 0;
  // ツガオ's room opens with the clocks still stopped (53 5.7)
  if (id === 'bgm_tsugao') params.clock = 0;
  // the speaker is right there while a battle plays (53 3.3, 17 #16)
  if (def.battle) liveGraph()?.pa.overrideDistance(0);
  else if (!def.jingle) liveGraph()?.pa.overrideDistance(null);
  // a variant song starts in the room it is asked for; a resume keeps the last one
  let room = 0;
  if (def.variants) {
    const named = opts.variant !== undefined ? def.variants[opts.variant] : undefined;
    room = named ?? (wantResume ? songRoom.get(id) ?? 0 : 0);
    songRoom.set(id, room);
  }
  const p = startPlayer(def, { fadeIn, fromLoopBar, room });
  current = { id, player: p };
  if (!def.variants) applyVariant(p, opts.variant);
}

function applyVariant(p: SongPlayer | null, v: string | undefined): void {
  if (!p) return;
  if (p.def.variants) {
    // 53 5.2: the same song keeps playing; the room changes over 0.6 s
    const room = v !== undefined ? p.def.variants[v] : undefined;
    if (room === undefined) return;
    songRoom.set(p.def.id, room);
    p.setParam('h_room', room);
    return;
  }
  const t = p.g.ctx.currentTime;
  const f = p.filter.frequency;
  if (v === 'muffled') {
    f.setTargetAtTime(1800, t, 0.05);
    p.out.gain.setTargetAtTime(dbToGain(songGainDb(p.def.id, p.def.gainDb) - 6), t, 0.05);
  } else if (p.state.muffledVariant) {
    f.setTargetAtTime(20000, t, 0.05);
    p.out.gain.setTargetAtTime(dbToGain(songGainDb(p.def.id, p.def.gainDb)), t, 0.05);
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
}

// ---- params ------------------------------------------------------------------

function setStage(n: number): void {
  if (params.stage === n) return;
  params.stage = n;
  current?.player?.setParam('stage', n);
  stageListeners.forEach((f) => f(n));
}

export const stageListeners: ((stage: number) => void)[] = [];
/** 53 6.1: the ambience hears 星見台's stage the same way (hStageListeners). */
export const hStageListeners: ((stage: number) => void)[] = [];

export function setMusicParam(name: MusicParam, value: number): void {
  if (name === 'h_stage') {
    const v = Math.max(-1, Math.min(3, Math.round(value)));
    if (params.h_stage === v) return;
    params.h_stage = v;
    current?.player?.setParam('h_stage', v);
    jingle?.player.setParam('h_stage', v);
    hStageListeners.forEach((f) => f(v));
    return;
  }
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
  if (name === 'detune') {
    // a free pitch bend of the whole song in cents (0.3 s), kept across songs
    params.detune = value;
    current?.player?.setUserDetune(value, 0.3);
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
  holdAmbience(dbToGain(-12), 0.2);
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
  params.h_light = 0;
  params.tenko = 0;
  params.h_rest = 0;
  liveGraph()?.pa.overrideDistance(null);
  const id = fieldBgm;
  fieldBgm = undefined;
  const gr = liveGraph();
  if (!gr) return;
  const t = gr.ctx.currentTime;
  holdAmbience(1, 0.6);
  if (id) atTime(t + 0.3, () => playBgm(id, { resume: true, fade: fadeIn }));
}

// ---- a new AudioContext (keepalive.ts, 2026-10-05) ------------------------------

/** What the music was doing when the AudioContext was replaced. */
export interface MusicSnapshot {
  song: { id: string; fromLoopBar?: number; muffled: boolean; haltIn: number | null; battle: boolean } | null;
  legacy: string | null;
  /** The ambience duck (a battle holds it at −12 dB). */
  ambDuck: number;
}

/**
 * Let go of everything that plays in the old context (keepalive.ts replaces
 * it): the song is remembered by the bar heard now. A jingle is dropped (the
 * song under a pausing jingle comes back unpaused). Params, the field song
 * remembered for after a battle and the resume table are kept as they are.
 */
export function detachForRebuild(): MusicSnapshot {
  const gr = liveGraph();
  const now = gr?.ctx.currentTime ?? 0;
  const snap: MusicSnapshot = { song: null, legacy: null, ambDuck: ambHold };
  if (jingle) {
    jingle.player.dispose();
    jingle = null;
    jingleQueue.length = 0;
  }
  const a = current;
  if (a?.player) {
    const p = a.player;
    if (!p.def.jingle && !p.stopped && !p.ended) {
      const au = p.audibleAt(now);
      snap.song = {
        id: a.id,
        // in the intro (or before the first bar): from the top again
        fromLoopBar: au && !au.intro ? au.loopIndex : undefined,
        muffled: !!p.state.muffledVariant,
        // a song that has stopped scheduling (the boss falling asleep) stays silent
        haltIn: Number.isFinite(p.haltAt) ? Math.max(0, p.haltAt - now) : null,
        battle: !!p.def.battle,
      };
    }
    p.dispose();
  } else if (a?.legacyStop) {
    try {
      a.legacyStop(0);
    } catch {
      /* old context */
    }
    snap.legacy = a.id;
  }
  current = null;
  // the duck times belong to the old clock
  duckLevel = 1;
  duckUntil = 0;
  return snap;
}

/** Bring the music back in the new context: the same song from the bar it was in, with today's params, room and pitch. */
export function restoreAfterRebuild(s: MusicSnapshot): void {
  const gr = liveGraph();
  if (!gr) return;
  const t = gr.ctx.currentTime;
  // the menu's muffle lives on the graph
  if (params.muffle > 0) {
    gr.musicFilter.frequency.setValueAtTime(20000 * Math.pow(1800 / 20000, params.muffle), t);
    gr.musicMuffle.gain.setValueAtTime(dbToGain(-3 * params.muffle), t);
  }
  gr.ambDuck.gain.setValueAtTime(Math.max(0, Math.min(1, s.ambDuck)), t);
  if (s.legacy) {
    const legacy = legacyBgm.get(s.legacy);
    if (legacy) current = { id: s.legacy, player: null, legacyStop: legacy.start() };
    return;
  }
  const so = s.song;
  if (!so) return;
  const def = songTable.get(so.id);
  if (!def) return;
  if (so.battle) gr.pa.overrideDistance(0);
  const room = def.variants ? songRoom.get(so.id) ?? 0 : 0;
  const p = startPlayer(def, { fadeIn: 0.6, fromLoopBar: so.fromLoopBar, room, haltIn: so.haltIn ?? undefined });
  if (so.muffled) applyVariant(p, 'muffled');
  current = { id: so.id, player: p };
}

/**
 * The level a battle holds the ambience beds at (12.1: −12 dB from the
 * encounter until the field comes back; the boss of 星見台 lets it go as he
 * falls asleep). Kept here so a new AudioContext starts the beds at it.
 */
let ambHold = 1;
export function holdAmbience(level: number, ramp: number): void {
  ambHold = level;
  if (!hasGraph()) return;
  const gr = g();
  const t = gr.ctx.currentTime;
  const p = gr.ambDuck.gain;
  p.cancelScheduledValues(t);
  p.setValueAtTime(p.value, t);
  p.linearRampToValueAtTime(level, t + ramp);
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
