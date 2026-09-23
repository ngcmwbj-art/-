// Public audio API used by the rest of the game. Other modules only ever call
// sfx(), playBgm(), stopBgm(), duckMusic() and textBlip(); the sound team
// owns everything behind these functions (src/audio/*).

import { audioCtx, buses, initAudio, voice } from './engine';

export type SfxFn = (opts?: { pitch?: number; pan?: number; vol?: number }) => void;

const sfxTable = new Map<string, SfxFn>();

export interface Song {
  /** Start playing; returns a stop function (fade seconds). */
  start(): (fade: number) => void;
}

const bgmTable = new Map<string, Song>();
let currentBgm: { id: string; stop: (fade: number) => void } | null = null;
let pendingBgm: string | null = null;

export function registerSfx(id: string, fn: SfxFn): void {
  sfxTable.set(id, fn);
}

export function registerBgm(id: string, song: Song): void {
  bgmTable.set(id, song);
}

export function unlockAudio(): void {
  initAudio();
  if (pendingBgm) {
    const id = pendingBgm;
    pendingBgm = null;
    playBgm(id);
  }
}

export function sfx(id: string, opts?: { pitch?: number; pan?: number; vol?: number }): void {
  if (!audioCtx()) return;
  const f = sfxTable.get(id);
  if (f) f(opts);
  else if (import.meta.env.DEV) console.warn(`[audio] unknown sfx ${id}`);
}

export function playBgm(id: string, opts: { fade?: number } = {}): void {
  if (currentBgm?.id === id) return;
  if (!audioCtx()) {
    pendingBgm = id;
    return;
  }
  stopBgm(opts.fade ?? 0.4);
  const song = bgmTable.get(id);
  if (!song) {
    if (import.meta.env.DEV) console.warn(`[audio] unknown bgm ${id}`);
    return;
  }
  currentBgm = { id, stop: song.start() };
}

export function stopBgm(fade = 0.5): void {
  if (!audioCtx()) {
    pendingBgm = null;
    return;
  }
  currentBgm?.stop(fade);
  currentBgm = null;
}

export function currentBgmId(): string | null {
  return currentBgm?.id ?? pendingBgm;
}

/** Temporarily lower music (e.g. under a jingle). */
export function duckMusic(amount: number, seconds: number): void {
  const c = audioCtx();
  if (!c) return;
  const g = buses().musicDuck.gain;
  const t = c.currentTime;
  g.cancelScheduledValues(t);
  g.setValueAtTime(g.value, t);
  g.linearRampToValueAtTime(amount, t + 0.05);
  g.setValueAtTime(amount, t + seconds);
  g.linearRampToValueAtTime(1, t + seconds + 0.4);
}

/** Per-character dialog blip. `voiceId` selects a character's voice. */
let blipHook: ((voiceId: string, ch: string) => void) | null = null;
export function setTextBlip(fn: (voiceId: string, ch: string) => void): void {
  blipHook = fn;
}
export function textBlip(voiceId = 'default', ch = 'a'): void {
  if (!audioCtx()) return;
  if (blipHook) blipHook(voiceId, ch);
  else voice({ wave: 'square', freq: 660, dur: 0.02, vol: 0.06, release: 0.02 });
}

// Minimal defaults so the game is never silent before the sound pass lands.
registerSfx('se_cursor', () => voice({ wave: 'pulse25', freq: 1320, dur: 0.02, vol: 0.12, release: 0.03 }));
registerSfx('se_confirm', () => {
  voice({ wave: 'pulse25', freq: 880, dur: 0.03, vol: 0.14 });
  voice({ wave: 'pulse25', freq: 1760, dur: 0.05, vol: 0.12, at: (audioCtx()?.currentTime ?? 0) + 0.04 });
});
registerSfx('se_cancel', () => voice({ wave: 'pulse25', freq: 660, freqEnd: 330, dur: 0.06, vol: 0.12 }));
