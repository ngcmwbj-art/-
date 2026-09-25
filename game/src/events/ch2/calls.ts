// evt_ch2_calls (50 3.13, 52 13.1, 53 7.4): the 防災無線 on the hill calls the
// names of the ones who left, one at a time, all night. The world owns the
// timer (45 / 30 / 15 s by stage, stopped while a battle, an event or a
// menu has the screen) and plays each call beside the game without
// stopping Minato (world/hoshi.ts: the bubble, the mic's clicks, the echo);
// the names come from data/text/hoshi_npcs (CALL_NAMES). The scenes here
// only make a call of their own (the first one at the station), note it,
// and hold the calls while the loudspeaker has something else to say.

import type { Co } from '../../engine/co';
import { flag, setFlag } from '../../game/state';
import { field } from '../../world/field';
import { callsNow, noteCall, playCall, resetCalls } from '../../world/api';
import { registerDebug } from '../../debug';
import { CALL_NAMES, callLine } from '../../data/text/hoshi_npcs';
import { hStage } from './common';

/**
 * A call made by a scene (evt_ch2_arrive's first 「……おぴぴちゃん。」):
 * name `index` of CALL_NAMES in the stage's way; the world's count starts
 * over and goes on with the next name.
 */
export function* sceneCall(index = 0): Co {
  const f = field();
  if (!f) return;
  noteCall();
  resetCalls(index + 1);
  yield* playCall(callLine(CALL_NAMES[index % CALL_NAMES.length]), { stage: hStage(), indoor: f.map.def.kind === 'indoor' });
  resetCalls();
}

/** Hold the calls (evt_ch2_boss_intro: the speaker has one thing left to say) — or let them go on. */
export function holdCalls(on: boolean): void {
  setFlag('flag_ch2_calls_off', on ? 1 : 0);
  if (!on) resetCalls();
}

export function callsHeld(): boolean {
  return flag('flag_ch2_calls_off') > 0;
}

registerDebug('call2', () => {
  if (!field()) return 'no field';
  callsNow();
  return `call (stage ${hStage()})`;
});
