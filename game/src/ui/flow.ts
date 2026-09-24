// Game flow owned by the UI: new game, continue, back to the title, and the
// clear record shown on the title after the ending.
//
//   registerNewGameHook(() => { setFlag('flag_x', 1); })          // setup
//   registerNewGameHook(function* () { yield* evtSomething(); })   // runs as a field script
//
// The field at map_home_2f runs its own onEnter scripts (evt_opening). A new
// game starts on a black screen (game.fadeAlpha = 1); a hook / evt_opening
// fades in when it is ready — if nobody does, the flow fades in itself once
// the field's scripts are done.

import type { Co } from '../engine/co';
import { game } from '../engine/game';
import { flag, loadGame, resetState, setFlag, state } from '../game/state';
import { newGameParty, syncProgressSkills } from '../data/battle';
import { stopAllAmbient, stopBgm } from '../audio';
import { FieldScene } from '../world/field';
import { hasScript } from '../world/scripts';
import { syncSettingFlags } from './settings';
import { bookCounts, tsukkomiTotal } from './menu/book';
import { caption } from './dialog';
import { uiHud } from './hud';
import { ditherIn, ditherOut } from './transition';

export type NewGameHook = () => Co | void;
const hooks: NewGameHook[] = [];

/** Called on 「はじめる」 after the state is reset and before the field fades in. */
export function registerNewGameHook(fn: NewGameHook): void {
  hooks.push(fn);
}

/** Fresh state: Minato Lv1 alone, 16:52, stage 0, nothing in the bag. */
export function resetForNewGame(): void {
  uiHud.reset();
  resetState();
  newGameParty();
  setFlag('flag_stage', 0);
  setFlag('flag_clock', 0);
  syncSettingFlags();
}

/** 「はじめる」: reset, run the hooks, start the field in Minato's room. */
export function* startNewGame(): Co {
  resetForNewGame();
  game.fadeColor = '#0B0B14';
  game.fadeAlpha = 1;
  const cos: Co[] = [];
  for (const h of hooks) {
    const r = h();
    if (r) cos.push(r);
  }
  const f = new FieldScene('map_home_2f', 5, 3, 'up');
  game.replaceAll(f); // enter() runs the map's onEnter scripts (evt_opening)
  for (const co of cos) f.startScript(co);
  if (!hasScript('evt_opening') && !cos.length) {
    // nobody wrote an opening yet: the two lines on black, then the room
    yield 600;
    yield* caption(['8月31日。', '夏休み、最後の日。']);
    setFlag('flag_opening_done', 1);
    yield* game.fadeIn(1200);
    return;
  }
  // safety net: if the opening scripts end while the screen is still black, fade in
  yield () => game.fadeAlpha < 1 || game.scripts.tasks.length <= 1;
  if (game.fadeAlpha >= 1) yield* game.fadeIn(600);
}

/** 「つづきから」: load the save and rebuild the field where it was made. */
export function* continueGame(): Co {
  if (!loadGame()) return false;
  uiHud.reset();
  syncProgressSkills();
  syncSettingFlags();
  // whatever covered the screen, the field comes out of a dither
  yield* ditherOut(1, '#0B0B14');
  game.fadeAlpha = 0;
  game.replaceAll(new FieldScene(state.map || 'map_home_2f', state.x, state.y, state.dir));
  yield 150;
  yield* ditherIn(700);
  return true;
}

// ---- clear record (title after the ending) ------------------------------------------------

const CLEAR_KEY = 'hanamaru-clear-v1';

export interface ClearRecord {
  fushigi: number;
  aite: number;
  tsukkomi: number;
  tsukkomiTotal: number;
}

/** Remember the finished run (called when the ending's 「つづく」 has been stamped). */
export function markClear(): ClearRecord {
  setFlag('flag_clear', 1);
  const c = bookCounts();
  const rec: ClearRecord = { fushigi: c.fushigi, aite: c.aite, tsukkomi: c.tsukkomi, tsukkomiTotal: tsukkomiTotal() };
  try {
    localStorage.setItem(CLEAR_KEY, JSON.stringify(rec));
  } catch {
    /* ignore */
  }
  return rec;
}

export function clearRecord(): ClearRecord | null {
  if (flag('flag_clear')) {
    const c = bookCounts();
    return { fushigi: c.fushigi, aite: c.aite, tsukkomi: c.tsukkomi, tsukkomiTotal: tsukkomiTotal() };
  }
  try {
    const raw = localStorage.getItem(CLEAR_KEY);
    if (raw) return JSON.parse(raw) as ClearRecord;
  } catch {
    /* ignore */
  }
  return null;
}

/** Leave whatever is running and go back to the title. */
export function* toTitle(fadeMs = 800): Co {
  stopBgm(fadeMs / 1000);
  stopAllAmbient(fadeMs / 1000);
  yield* ditherOut(fadeMs, '#0B0B14');
  game.fadeAlpha = 0;
  const { TitleScene } = (yield import('./title')) as typeof import('./title');
  game.replaceAll(new TitleScene(true));
  yield* ditherIn(500);
}
