// Enemy battle graphics registry (20_systems_battle.md 11–13). Each enemy
// module registers an EnemyArt: a frame function driven by a small "view"
// (pose, pose time, global time, status flags) plus optional overlays.

import type { Gfx } from '../../engine/gfx';

export interface EnemyView {
  /** 'idle' | 'windup' | 'attack' | 'hurt' | 'defeat' | enemy-specific poses. */
  pose: string;
  /** ms since the pose started. */
  t: number;
  /** Global battle time (ms), for idle loops. */
  gt: number;
  /** Skill being performed (windup/attack). */
  skill?: string;
  hpRate: number;
  /** Status flags: hiraki, shindafuri, tame, bokemake, ... */
  flags: Record<string, number>;
  /** Free-form numeric parameters (e.g. pupil target x for the boss). */
  params?: Record<string, number>;
}

export interface EnemyArt {
  id: string;
  /** Canvas size of every frame. */
  w: number;
  h: number;
  /** Logical sprite rect offset inside the canvas (core/face are relative to it). */
  ox: number;
  oy: number;
  frame(v: EnemyView): HTMLCanvasElement;
  /** Extra drawing behind the sprite (screen coords of canvas top-left). */
  under?(g: Gfx, x: number, y: number, v: EnemyView): void;
  /** Extra drawing in front of the sprite. */
  over?(g: Gfx, x: number, y: number, v: EnemyView): void;
  /** Small "restored everyday object" used by the defeat animation. */
  restored(): HTMLCanvasElement;
  /** Poses to show in the gallery. */
  gallery: { pose: string; skill?: string; flags?: Record<string, number>; t?: number }[];
  /** True if frame() returns a reused canvas whose pixels change every call. */
  dynamic?: boolean;
}

type Factory = () => EnemyArt;
const factories = new Map<string, Factory>();
const cache = new Map<string, EnemyArt>();

export function registerEnemyArt(id: string, f: Factory): void {
  factories.set(id, f);
  cache.delete(id);
}

export function enemyArt(id: string): EnemyArt | null {
  let a = cache.get(id);
  if (!a) {
    const f = factories.get(id);
    if (!f) return null;
    a = f();
    cache.set(id, a);
  }
  return a;
}

export function enemyArtIds(): string[] {
  return [...factories.keys()];
}

/** Frame index for a looping animation. */
export function loop(t: number, ms: number, n: number): number {
  return Math.floor(t / ms) % n;
}
