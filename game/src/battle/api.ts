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
