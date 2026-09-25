// Boss dispatch (51 18.3): every boss rule lives in its own module and the
// battle calls through here, choosing by the boss's enemy id —
// オムカエマチ (第1章, ./boss_omukaemachi) and ヨビモドシ (第2章,
// ./boss_yobimodoshi). `startBattle`'s contract does not change.

import type { Co } from '../engine/co';
import type { BattleScene } from './scene';
import type { BossPart, EnemyUnit, Judge, PartyUnit } from './model';
import type { BossMoveCtx } from './enemy';
import * as omu from './boss_omukaemachi';
import * as yobi from './boss_yobimodoshi';

function isYobi(s: BattleScene): boolean {
  return s.bossKind === 'yobimodoshi';
}

/**
 * Boss wipes this session, per boss (a retry after a wipe is short: the
 * rise and the opening are cut, and the lesson of the last wipe is taught
 * again — the chime / the name tags, the tomato).
 */
export function bossTriesOf(s: BattleScene): { lost: number } {
  return isYobi(s) ? yobi.bossTries : omu.bossTries;
}

/** The chapter-1 boss's counter (kept for callers that only know that boss). */
export const bossTries = omu.bossTries;

export function initBoss(s: BattleScene): void {
  if (isYobi(s)) yobi.initBoss(s);
  else omu.initBoss(s);
}

export function syncBossFlags(s: BattleScene, e: EnemyUnit): void {
  if (isYobi(s)) yobi.syncBossFlags(s, e);
  else omu.syncBossFlags(s, e);
}

export function bossDecide(s: BattleScene, e: EnemyUnit): string {
  return isYobi(s) ? yobi.bossDecide(s, e) : omu.bossDecide(s, e);
}

export function* bossMoveImpl(c: BossMoveCtx): Co {
  if (isYobi(c.s)) yield* yobi.bossMoveImpl(c);
  else yield* omu.bossMoveImpl(c);
}

export function* bossRoundStart(s: BattleScene): Co {
  if (isYobi(s)) yield* yobi.bossRoundStart(s);
  else yield* omu.bossRoundStart(s);
}

export function* bossRoundEnd(s: BattleScene): Co {
  if (isYobi(s)) yield* yobi.bossRoundEnd(s);
  else yield* omu.bossRoundEnd(s);
}

export function* onBossPartBreak(s: BattleScene, e: EnemyUnit, part: BossPart, j: Judge): Co {
  if (isYobi(s)) yield* yobi.onBossPartBreak(s, e, part, j);
  else yield* omu.onBossPartBreak(s, e, part, j);
}

export function* onBossBodyMimashita(s: BattleScene, e: EnemyUnit): Co {
  if (isYobi(s)) yield* yobi.onBossBodyMimashita(s, e);
  else yield* omu.onBossBodyMimashita(s, e);
}

export function* bossUndo(s: BattleScene, e: EnemyUnit, j: Judge, partId?: string): Co {
  if (isYobi(s)) yield* yobi.bossUndo(s, e, j);
  else yield* omu.bossUndo(s, e, j, partId);
}

export function* checkBossPhase(s: BattleScene, e: EnemyUnit): Co<boolean> {
  if (isYobi(s)) return yield* yobi.checkBossPhase(s, e);
  return yield* omu.checkBossPhase(s, e);
}

/** The chapter-1 finale's stamp (おかえりなさい). */
export function* doOkaerinasai(s: BattleScene, u: PartyUnit): Co {
  yield* omu.doOkaerinasai(s, u);
}

/** The chapter-2 finale's stamp (おやすみなさい). */
export function* doOyasuminasai(s: BattleScene, u: PartyUnit): Co {
  yield* yobi.doOyasuminasai(s, u);
}

/** The boss's own entrance (after the 900ms switch). */
export function* bossEntrance(s: BattleScene, fast: boolean): Co<boolean> {
  if (!isYobi(s)) return false;
  yield* yobi.yobiAppear(s, fast);
  return true;
}

export { isYobi };
