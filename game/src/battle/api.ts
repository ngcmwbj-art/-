// Contract between the field/event scripts and the battle system.
// The battle team owns the implementation behind startBattle().

import type { Co } from '../engine/co';

export interface BattleOpts {
  /** Enemy ids from src/data (1–4 enemies). */
  enemies: string[];
  /** Who got the jump on whom (symbol encounter contact direction). */
  initiative?: 'party' | 'enemy' | 'normal';
  /** Boss battles cannot be fled and use boss music/presentation. */
  boss?: boolean;
  /** Override battle music id. */
  music?: string;
  /** Override background id. */
  background?: string;
  /** If true, losing does not trigger game over (scripted fights). */
  canLose?: boolean;
}

export type BattleResult = 'win' | 'lose' | 'flee';

type BattleImpl = (o: BattleOpts) => Co<BattleResult>;
let impl: BattleImpl | null = null;

export function setBattleImpl(fn: BattleImpl): void {
  impl = fn;
}

/** Run a battle from a coroutine: `const r = yield* startBattle({ enemies: ['enemy_x'] });` */
export function* startBattle(o: BattleOpts): Co<BattleResult> {
  if (!impl) throw new Error('battle system not installed');
  return yield* impl(o);
}

// ---- 1枚絵 used inside battles (51 10.8: cut_h_village_lit) --------------------------------

/**
 * Draws a full-screen picture (384×216) at time `t` (ms since it appeared).
 * `cue` counts the lines read so far, for pictures that light things up in
 * step with the dialogue (「……牛舎に、明かり。」 → the barn, …).
 */
export type BattleCut = (g: import('../engine/gfx').Gfx, t: number, cue: number) => void;
const cuts = new Map<string, BattleCut>();

/**
 * The picture owners (UI: `cut_h_*`) register their drawing here; the battle
 * cross-fades to it. Until one is registered the battle uses its own.
 */
export function registerBattleCut(id: string, draw: BattleCut): void {
  cuts.set(id, draw);
}

export function battleCut(id: string): BattleCut | null {
  return cuts.get(id) ?? null;
}
