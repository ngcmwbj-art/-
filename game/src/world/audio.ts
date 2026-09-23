// Adapter to the sound module. The functions below exist in 40_audio.md 14
// but may not be exported yet while the sound team works; everything is
// called only if present, so the world never breaks on a missing function.

import * as audio from '../audio';

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
