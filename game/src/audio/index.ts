// Public audio API used by the rest of the game (40_audio 14). Other modules
// only call the functions exported here; the sound team owns everything
// behind them (src/audio/*). Content (songs, SFX recipes, voices, ambience)
// registers itself from audio/content.ts.

import { startClock } from './clock';
import { installKeepAlive, soundLive } from './keepalive';
import { audioCtx, hasGraph, initAudio, liveGraph, setSpaceOn, volCurve, type PaMode, type SpaceId } from './engine';
import * as amb from './ambience';
import * as music from './music';
import { hooks, legacyBgm, loopTable, sfxTable, type LoopHandle, type SfxFn, type SfxOpts, type Song } from './registry';
import type { SongDef } from './sequencer';
import { songTable } from './registry';

export type { SfxFn, SfxOpts, Song, LoopHandle };
export type { SpaceId, PaMode };
export type { MusicParam, PlayOpts } from './music';

// ---- registration -------------------------------------------------------------

export function registerSfx(id: string, fn: SfxFn): void {
  sfxTable.set(id, fn);
}

export function registerSfxLoop(id: string, fn: (opts?: SfxOpts) => LoopHandle): void {
  loopTable.set(id, fn);
}

/** Register a song: either a sequencer SongDef or a legacy `{ start() }` object. */
export function registerBgm(id: string, song: Song | SongDef): void {
  if ('parts' in song) songTable.set(id, song);
  else legacyBgm.set(id, song);
}

// ---- lifecycle -------------------------------------------------------------------

let unlocked = false;
export function unlockAudio(): void {
  initAudio();
  startClock();
  installKeepAlive();
  if (!unlocked) {
    unlocked = true;
    setVolume('bgm', volumes.bgm);
    setVolume('se', volumes.se);
  }
  applyPa(0);
  music.flushPending();
  amb.flushPendingAmbient();
}

// ---- SFX ---------------------------------------------------------------------------

export function sfx(id: string, opts?: SfxOpts): void {
  if (!soundLive()) return;
  const f = sfxTable.get(id);
  if (f) {
    f(opts);
    hooks.onSfx?.(id);
    music.notifySongSfx(id);
  } else if (import.meta.env.DEV) console.warn(`[audio] unknown sfx ${id}`);
}

const NULL_LOOP: LoopHandle = { set() {}, stop() {} };

/** Looping SFX with live parameters (se_hanko_charge, se_roulette). */
export function sfxLoop(id: string, opts?: SfxOpts): LoopHandle {
  if (!soundLive()) return NULL_LOOP;
  const f = loopTable.get(id);
  if (f) return f(opts);
  if (import.meta.env.DEV) console.warn(`[audio] unknown sfx loop ${id}`);
  return NULL_LOOP;
}

// ---- BGM ---------------------------------------------------------------------------

/**
 * Play a song. Same id → nothing. `fade` fades in (and cross-fades the old
 * song out), `resume` continues from the bar where it last stopped (12.2;
 * town / home / shop / mall / hoshi_night resume automatically within 90 s).
 * `variant`: 'stage0'|'stage1'|'stage2' (also for 'bgm_town'), 'muffled';
 * bgm_hoshi_night: 'outdoor'|'house'|'barn'|'school'|'hill' — when it is
 * already playing only its form changes, over 0.6 s (53_ch2_audio 5.2).
 * Jingles (`bgm_jingle_*`) follow 40_audio 6.1 automatically.
 */
export function playBgm(id: string, opts: { fade?: number; resume?: boolean; variant?: string } = {}): void {
  music.playBgm(id, opts);
}

export function stopBgm(fade = 0.5): void {
  music.stopBgm(fade);
}

export function currentBgmId(): string | null {
  return music.currentId();
}

/**
 * Where the music is right now (for syncing visuals, e.g. the title's sun
 * pulsing on the chime notes of bar I3): bar label, beat within the bar
 * (0-based, fractional), tempo. null when nothing plays.
 */
export function musicPosition(): { id: string; label: string; beat: number; bpm: number; intro: boolean; loop: number } | null {
  const p = music.currentPlayer();
  const g = liveGraph();
  if (!p || !g) return null;
  const a = p.audibleAt(g.ctx.currentTime);
  return a ? { id: p.def.id, label: a.label, beat: a.beat, bpm: a.bpm, intro: a.intro, loop: a.loop } : null;
}

/**
 * Lower the ambience beds for a moment (linear level, e.g. −4 dB = 0.63):
 * ramp down over `attack`, hold, come back over `release` (seconds). The
 * calls from the hill take this room under the insects (53 7.4, 10.3).
 */
export function duckAmbience(level: number, attack = 0.2, hold = 1.0, release = 0.6): void {
  music.duckAmbience(level, attack, hold, release);
}

/** Temporarily lower music (linear amount, e.g. −12 dB = 0.25). */
export function duckMusic(amount: number, seconds: number): void {
  music.duckMusic(amount, seconds);
}

/** Bend the song down by `semitones` while it stops (17:00 → bgmTapeStop(0.4, -1)). */
export function bgmTapeStop(seconds: number, semitones: number): void {
  music.bgmTapeStop(seconds, semitones);
}

/** A silent gap in the music (the song keeps its place). */
export function muteMusic(seconds: number): void {
  music.muteMusic(seconds);
}

/**
 * 'stage' 0..3, 'kire' 0..3, 'boss_phase' 1..3, 'muffle' 0..1 (40_audio 7),
 * 'detune' = a free pitch bend of the music in cents (added to the stage pitch).
 * Chapter 2 (53_ch2_audio 6): 'h_stage' −1..3 (星見台の段階; −1 away from
 * 星見台), 'h_light' 0/1 (the tomato held up, Yobimodoshi), 'tenko' 0..4 (name
 * tags lit), 'h_rest' 0/1 (Tetsuya resting); 'clock' 0..2 (ツガオ's wall clocks
 * running: 1 夕鳴町, 2 and 星見台 — amb_tsugao_room's 'tick' sets it); 'h_deli' 0/1
 * (the vegetables carried round 星見台, 53 6.6: bgm_hoshi_night's marimba answers
 * from the next bar; set it back to 0 yourself — a battle or a new song does not).
 * Only changes are acted on.
 */
export function setMusicParam(
  name: 'stage' | 'kire' | 'boss_phase' | 'muffle' | 'detune' | 'h_stage' | 'h_light' | 'tenko' | 'h_rest' | 'clock' | 'h_deli',
  value: number,
): void {
  music.setMusicParam(name, value);
}

/** Same as setMusicParam('detune', cents) with a custom ramp (seconds). */
export function setMusicDetune(cents: number, ramp = 0.3): void {
  music.setMusicParam('detune', cents);
  if (ramp !== 0.3) music.currentPlayer()?.setUserDetune(cents, ramp);
}

/** Current music params (stage / kire / boss_phase / muffle / detune, and chapter 2's h_stage / h_light / tenko / h_rest). */
export function getMusicParams(): Readonly<{
  stage: number;
  kire: number;
  boss_phase: number;
  muffle: number;
  detune: number;
  h_stage: number;
  h_light: number;
  tenko: number;
  h_rest: number;
  clock: number;
  h_deli: number;
}> {
  return music.musicParams();
}

/** Contact with a field symbol: tape brake + remember the field song (12.1). */
export function musicEncounter(): void {
  music.musicEncounter();
}

/** Back to the field after a battle: field song continues from its bar (12.3). */
export function musicReturnToField(fadeIn = 0.8): void {
  music.musicReturnToField(fadeIn);
}

/** Fled from battle: the battle song trips (−300 cents, 200 ms). */
export function musicFlee(): void {
  music.musicFlee();
}

// ---- chime --------------------------------------------------------------------------

export { playChimeMotif, playMorningChime } from './chime';

// ---- the PA speaker (40_audio 3.6 bus_pa; 53_ch2_audio 3.3) --------------------------

const pa = { mode: 'town' as PaMode, d: 0, indoor: false };

function applyPa(ramp: number): void {
  const g = liveGraph();
  if (!g) return;
  g.pa.setMode(pa.mode, ramp ? 0.3 : 0);
  g.pa.setDistance(pa.d, pa.indoor, ramp);
}

/**
 * The valley the PA sings into: 'town' (夕鳴町, echoes off the houses) or
 * 'yama' (星見台, the far slope answers late). Call on entering a map:
 * map_hoshi* → 'yama', map_town / map_home_* → 'town'. 0.3 s crossfade; the
 * echoes already on their way ring out.
 */
export function setPaMode(mode: PaMode): void {
  if (mode !== 'town' && mode !== 'yama') return;
  pa.mode = mode;
  liveGraph()?.pa.setMode(mode, 0.3);
}

/**
 * How far the player is from the speaker on the hill: d 0 (right under it) …
 * 1 (the south end of the village): −10 dB × d, darker and wetter. Indoors
 * (house, barn, school) a further −12 dB behind a 1.2 kHz wall (53 3.3, 7.3).
 * Battles hear it at d = 0 on their own.
 */
export function setPaDistance(d: number, indoor = false): void {
  const v = Math.max(0, Math.min(1, Number.isFinite(d) ? d : 0));
  if (Math.abs(v - pa.d) < 0.005 && indoor === pa.indoor) return;
  pa.d = v;
  pa.indoor = indoor;
  liveGraph()?.pa.setDistance(v, indoor, 0.3);
}

/** Where the PA is set (mode, distance, indoor). */
export function getPaState(): Readonly<{ mode: PaMode; d: number; indoor: boolean }> {
  return pa;
}

/**
 * The valley answers three times: the PA echoes swell (feedback `amount`)
 * for `hold` seconds (53 7.4 stage 2, 12.11). Broadcast lines in stage 2 and
 * near the speaker do this on their own; this is for events that want it.
 */
export function paEcho(amount = 0.6, hold = 2.0): void {
  liveGraph()?.pa.swell(amount, hold);
}

// ---- ambience & space ---------------------------------------------------------------

export function playAmbient(id: string, opts?: { vol?: number; fade?: number; lp?: number }): void {
  amb.playAmbient(id, opts);
}
export function stopAmbient(id: string, fade?: number): void {
  amb.stopAmbient(id, fade);
}
export function stopAllAmbient(fade?: number): void {
  amb.stopAllAmbient(fade);
}
export function setAmbientVol(id: string, v: number, ramp?: number): void {
  amb.setAmbientVol(id, v, ramp);
}
/**
 * An event inside a playing ambience (its own vocabulary: 'flicker', 'turn',
 * 'pulse', a leaf zone…). The third argument is usually a pan; a few events
 * name something instead (amb_tsugao_room 'tick' → 'yunari' | 'hoshimi').
 */
export function ambientEvent(id: string, name: string, pan?: number | string): void {
  amb.ambientEvent(id, name, pan);
}
/** Brief-compatible aliases. */
export function playAmbience(id: string, opts?: { vol?: number; fade?: number; lp?: number }): void {
  amb.playAmbient(id, opts);
}
export function stopAmbience(id?: string, fade?: number): void {
  if (id) amb.stopAmbient(id, fade);
  else amb.stopAllAmbient(fade);
}

let space: SpaceId = 'outdoor';
export function setSpace(id: SpaceId): void {
  space = id;
  const g = liveGraph();
  if (g) setSpaceOn(g, id);
}
export function currentSpace(): SpaceId {
  return space;
}

// ---- dialog blips ----------------------------------------------------------------

/** Per-character dialog blip implementation (installed by audio/voices.ts). */
export function setTextBlip(fn: (voiceId: string, ch: string) => void): void {
  hooks.blip = fn;
}
export function textBlip(voiceId = 'default', ch = 'a'): void {
  if (!soundLive()) return;
  hooks.blip?.(voiceId, ch);
}

/**
 * The player skipped to the end of the page (10.1 早送り): one soft page turn
 * (se_page at v×0.4) instead of the rest of the blips. Call it once per skip.
 */
export function textFastForward(): void {
  sfx('se_page', { vol: 0.4 });
}

// ---- settings --------------------------------------------------------------------

const volumes = { bgm: 7, se: 8 };
/** Settings sliders 0..10 (gain = (v/10)²; 11.6). */
export function setVolume(kind: 'bgm' | 'se', value0to10: number): void {
  volumes[kind] = Math.max(0, Math.min(10, value0to10));
  const g = liveGraph();
  if (!g) return;
  const p = kind === 'bgm' ? g.musicUser.gain : g.seUser.gain;
  const t = g.ctx.currentTime;
  p.cancelScheduledValues(t);
  p.setValueAtTime(p.value, t);
  p.linearRampToValueAtTime(volCurve(volumes[kind]), t + 0.06);
}
export function getVolume(kind: 'bgm' | 'se'): number {
  return volumes[kind];
}

export function audioReady(): boolean {
  return hasGraph();
}
