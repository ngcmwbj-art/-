// World effects layer: the 『みました』 stamp decal, and hooks for the special
// places (mirror, sparrows, cat shadow, carts...) which register here.
import type { Co } from '../engine/co';
import type { Gfx } from '../engine/gfx';
import type { FieldScene } from './field';

export type FxLayer = 'ground' | 'sorted' | 'fg' | 'glow' | 'top';

export interface WorldFx {
  /** Map id this effect belongs to ('' = every map). */
  map: string;
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

export function fxDraw(f: FieldScene, g: Gfx, cx: number, cy: number, layer: FxLayer): void {
  for (const e of effects) if (!e.map || e.map === f.map.id) e.draw?.(f, g, cx, cy, layer);
}

export type { Co };
