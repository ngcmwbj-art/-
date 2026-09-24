// Adapter to the sound module. The functions below exist in 40_audio.md 14
// but may not be exported yet while the sound team works; everything is
// called only if present, so the world never breaks on a missing function.

import * as audio from '../audio';
import * as ambience from '../audio/ambience';

type AnyFn = (...args: unknown[]) => unknown;
const A = audio as unknown as Record<string, AnyFn | undefined>;

function call(name: string, ...args: unknown[]): unknown {
  const f = A[name];
  if (typeof f === 'function') {
    try {
      return f(...args);
    } catch (e) {
      if (import.meta.env.DEV) console.warn(`[world/audio] ${name} failed`, e);
    }
  }
  return undefined;
}

export function se(id: string, opts?: { pitch?: number; pan?: number; vol?: number }): void {
  audio.sfx(id, opts);
}

/** Where the field hears from: the view (world px) and the listener (Minato's feet). */
export interface Listener {
  camX: number;
  camY: number;
  viewW: number;
  viewH: number;
  x: number;
  y: number;
}
let listener: (() => Listener | null) | null = null;
/** The field installs where the ear is (world/field.ts). */
export function setListener(fn: () => Listener | null): void {
  listener = fn;
}

/**
 * Gain and pan of a sound made at (x, y) in the world (40_audio 11.5): pan by
 * the horizontal place on screen, up to ±0.5; the level falls 12 dB per 8
 * tiles from Minato; out of sight (a tile past the screen's edge) or over 12
 * tiles away it isn't heard at all. null = silent.
 */
export function placeOf(x: number, y: number): { pan: number; gain: number } | null {
  const l = listener?.();
  if (!l) return { pan: 0, gain: 1 };
  const m = 16;
  if (x < l.camX - m || x > l.camX + l.viewW + m || y < l.camY - m || y > l.camY + l.viewH + m + 16) return null;
  const tiles = Math.hypot(x - l.x, y - l.y) / 16;
  if (tiles > 12) return null;
  const pan = Math.max(-0.5, Math.min(0.5, ((x - (l.camX + l.viewW / 2)) / (l.viewW / 2)) * 0.5));
  const gain = Math.pow(10, (-12 * (tiles / 8)) / 20);
  return { pan, gain };
}

/** A sound effect made by something at (x, y) in the field: placed and faded with distance. */
export function seAt(id: string, x: number, y: number, opts: { pitch?: number; vol?: number } = {}): void {
  const pl = placeOf(x, y);
  if (!pl) return;
  audio.sfx(id, { ...opts, pan: pl.pan, vol: (opts.vol ?? 1) * pl.gain });
}

export function bgm(id: string | null, fade = 0.6, resume = false): void {
  if (!id) {
    audio.stopBgm(fade);
    return;
  }
  audio.playBgm(id, { fade, resume } as { fade?: number });
}

export function stopBgm(fade = 0.5): void {
  audio.stopBgm(fade);
}

export function currentBgm(): string | null {
  return audio.currentBgmId();
}

export function playAmbient(id: string, opts?: { vol?: number; fade?: number; lp?: number }): void {
  call('playAmbient', id, opts);
}
export function stopAmbient(id: string, fade?: number): void {
  call('stopAmbient', id, fade);
}
export function stopAllAmbient(fade?: number): void {
  call('stopAllAmbient', fade);
}
/** Ids of the ambience beds playing (not fading out); null when the sound module can't tell. */
export function activeAmbients(): string[] | null {
  const f = (ambience as unknown as Record<string, AnyFn | undefined>).activeAmbients;
  if (typeof f !== 'function') return null;
  try {
    return f() as string[];
  } catch {
    return null;
  }
}
export function setAmbientVol(id: string, v: number, ramp?: number): void {
  call('setAmbientVol', id, v, ramp);
}
export function ambientEvent(id: string, name: string, pan?: number): void {
  call('ambientEvent', id, name, pan);
}
export function setSpace(id: string): void {
  call('setSpace', id);
}
export function setMusicParam(name: string, v: number): void {
  call('setMusicParam', name, v);
}
export function bgmTapeStop(seconds: number, semitones: number): void {
  if (!call('bgmTapeStop', seconds, semitones)) audio.stopBgm(seconds);
}
export function duckMusic(amount: number, seconds: number): void {
  audio.duckMusic(amount, seconds);
}
export function hasAudioFn(name: string): boolean {
  return typeof A[name] === 'function';
}
