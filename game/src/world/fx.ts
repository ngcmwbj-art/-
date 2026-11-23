// World effects layer: the 『みました』 stamp decal, and hooks for the special
// places (mirror, sparrows, cat shadow, carts...) which register here.
import type { Co } from '../engine/co';
import type { Gfx } from '../engine/gfx';
import type { FieldScene } from './field';

export type FxLayer = 'ground' | 'sorted' | 'fg' | 'glow' | 'top';

export interface WorldFx {
  /** Map id this effect belongs to ('' = every map). */
  map: string;
  /**
   * It places what it draws with fxAt() (or draws in screen space only):
   * another field drawer (the HD-2D view) lets it draw straight onto its
   * frame. Without it, that drawer lays the 2D drawing over its picture as
   * a whole (02 #85).
   */
  anchored?: boolean;
  update?(f: FieldScene, dt: number): void;
  draw?(f: FieldScene, g: Gfx, cx: number, cy: number, layer: FxLayer): void;
}

const effects: WorldFx[] = [];
export function registerWorldFx(fx: WorldFx): void {
  effects.push(fx);
}

export function fxUpdate(f: FieldScene, dt: number): void {
  for (const e of effects) if (!e.map || e.map === f.map.id) e.update?.(f, dt);
}

/** `which`: only the anchored effects, or only the others (the 2D renderer draws them all). */
export function fxDraw(f: FieldScene, g: Gfx, cx: number, cy: number, layer: FxLayer, which?: 'anchored' | 'plain'): void {
  for (const e of effects) {
    if (e.map && e.map !== f.map.id) continue;
    if (which && !!e.anchored !== (which === 'anchored')) continue;
    e.draw?.(f, g, cx, cy, layer);
  }
}

/**
 * Where an anchored effect draws world point (x, y): (x − cx, y − cy) in the
 * 2D view; in another field drawer's frame (the HD-2D view) the 3D point it
 * stands for, through that camera. `foot`: the ground line the point stands
 * over (a person's or a prop's feet), so its height above the ground goes
 * along — a bubble over a head, the sound from a loudspeaker's horns. By
 * default the point lies on the ground.
 */
export function fxAt(f: FieldScene, x: number, y: number, cx: number, cy: number, foot = y): [number, number] {
  return f.projected(x, y, foot) ?? [x - cx, y - cy];
}

/** Another field drawer draws this frame (the HD-2D view): its own picture of the world, what lies past the map's edges included. */
export function fxElsewhere(f: FieldScene): boolean {
  return f.projected(f.player.x, f.player.y) !== null;
}

export type { Co };
