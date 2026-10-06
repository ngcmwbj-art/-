// HD-2D (2026-10-06, 依頼主「第1章全部HD-2Dにして」): a chapter-1 battle in
// HD-2D shows the place it started in — the 3D town (or room) seen low from
// the south, a diorama — instead of the patterned backdrop. The 3D side
// (src/hd2d/battle.ts) registers a maker here; the battle never imports
// three.js. The backdrop keeps its own state (kire, the boss's phases, the
// vending machine's charge…) and lays what carries its meaning over the
// place: its particles and motifs, its colours thinly for the two bosses
// (common.ts drawOnPlace). 2D, chapter 2 and a battle with no 3D place
// below keep the patterned backdrop.

import type { Gfx } from '../../engine/gfx';
import type { Background } from './common';

export interface PlaceView {
  /**
   * Lay the place's picture under the 2D buffer for this frame and clear
   * the buffer over it (the stage's shake, kire's waver and colour go with
   * it). false: no place any more (2D was chosen, WebGL failed) — the
   * backdrop draws its 2D picture from then on.
   */
  lay(g: Gfx, bg: Background): boolean;
  /** The 0.3 s standstill (scene.ts drawFreeze): the place and the buffer's pictures drained grey. */
  grey(g: Gfx): void;
  dispose(): void;
}

type PlaceMaker = (bgId: string, enemyId: string) => PlaceView | null;
let maker: PlaceMaker | null = null;

/** The HD-2D layer's maker (null: none — every battle draws its 2D backdrop). */
export function setPlaceMaker(fn: PlaceMaker | null): void {
  maker = fn;
}

/** The place for a battle with backdrop `bgId` starting now, or null. */
export function placeFor(bgId: string, enemyId: string): PlaceView | null {
  try {
    return maker?.(bgId, enemyId) ?? null;
  } catch (e) {
    console.warn('[battle] no 3D place, 2D backdrop', e);
    return null;
  }
}
