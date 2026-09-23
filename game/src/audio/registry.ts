// Shared tables every sound module registers into. Kept separate from
// index.ts so content files can register without import cycles.

import type { SongDef } from './sequencer';

export interface SfxOpts {
  /** Multiplies every frequency (default 1). */
  pitch?: number;
  /** −1..1; overrides the recipe's pan. */
  pan?: number;
  /** Multiplies every v (default 1). */
  vol?: number;
  /** ctx.currentTime based start time (default: now). */
  at?: number;
  /** Pitched SFX such as se_chime_note ('G4'). */
  note?: string;
  /** Seconds: se_chime_note sustain. */
  hold?: number;
  /** se_hanamaru, se_mimashita, se_rewind. */
  grade?: 'kukkiri' | 'futsu' | 'kasure';
  /** ms: se_ring length. */
  dur?: number;
  /** se_kire_up 1..3. */
  level?: number;
}

export type SfxFn = (opts?: SfxOpts) => void;

export interface LoopHandle {
  set(param: string, value: number): void;
  stop(fade?: number): void;
}
export type LoopFn = (opts?: SfxOpts) => LoopHandle;

/** Legacy / external song interface (start returns a stop function). */
export interface Song {
  start(): (fade: number) => void;
}

export const sfxTable = new Map<string, SfxFn>();
export const loopTable = new Map<string, LoopFn>();
export const songTable = new Map<string, SongDef>();
export const legacyBgm = new Map<string, Song>();
/** Human descriptions for the sound test (id → Japanese label). */
export const sfxInfo = new Map<string, { label: string; group: string }>();

export const hooks: {
  blip: ((voiceId: string, ch: string) => void) | null;
  /** Called for every sfx() so songs can react (boss bell). */
  onSfx: ((id: string) => void) | null;
} = { blip: null, onSfx: null };
