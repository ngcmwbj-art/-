// オートセーブ. The game writes itself down in the save slot (the same one
// お地蔵さん and the rest bench use) once Minato can walk again after:
//  - arriving on another map (in or out of a building, on to the next area)
//  - a battle that gave the party experience
// and, without the note, whenever the page is hidden (another app, the phone
// locked) while he can walk. It only saves while he stands free on the
// field, so a save never lands in the middle of an event.
// A little masking-tape note 「オートセーブ」 shows in the top-right corner.
// When the write fails (a private window, storage full or blocked — 改善会議
// 2026-10-27 の2) a soft note says so once per session, in words only (no
// sound: some play muted), and the game goes on as before.

import { registerDebug } from '../debug';
import { game, type Widget } from '../engine/game';
import type { Gfx } from '../engine/gfx';
import { W } from '../engine/screen';
import { markText } from '../engine/textzones';
import { ease } from '../engine/tween';
import { flag, saveGame, setFlag, state } from '../game/state';
import type { FieldScene } from '../world/field';
import { drawTape, textW } from './window';

/** How long Minato must stand free before a save (chained events settle first). */
const SETTLE_MS = 450;
const LABEL = 'オートセーブ';
/** The once-per-session note when the save could not be written. */
export const SAVE_FAIL_LABEL = 'この 画面では、セーブ できないみたい。';

/** The failure note was shown in this session (not again until the page reloads). */
let failShown = false;

let savedMap: string | null = null;
let savedExp = -1;
let freeMs = 0;
let lastFrame = -10;
let cur: FieldScene | null = null;
let clockBottom = () => 0;

function expNow(): number {
  let n = 0;
  for (const m of state.party) n += m.level * 100000 + m.exp;
  return n;
}

function freeNow(f: FieldScene): boolean {
  return f.controllable && game.top === f && game.fadeAlpha < 0.05 && !!flag('flag_opening_done');
}

function write(): boolean {
  setFlag('flag_saved', 1);
  const ok = saveGame();
  // also on a failure: this place counts as done, so it does not try again every frame
  savedMap = state.map;
  savedExp = expNow();
  return ok;
}

/** The soft note, once a session (改善会議 2026-10-27 の2). */
function failNote(): void {
  if (failShown) return;
  failShown = true;
  game.ui.push(new AutosaveNote(SAVE_FAIL_LABEL));
}

/** Called by the field HUD every frame the field runs. */
export function autosaveTick(dt: number, f: FieldScene): void {
  cur = f;
  lastFrame = game.frame;
  if (savedMap === null) {
    // the first frame of a session (new game or つづきから): that is the baseline
    savedMap = state.map;
    savedExp = expNow();
  }
  if (!freeNow(f)) {
    freeMs = 0;
    return;
  }
  freeMs += dt;
  if (freeMs < SETTLE_MS) return;
  if (state.map === savedMap && expNow() === savedExp) return;
  if (write()) game.ui.push(new AutosaveNote());
  else failNote();
}

/** Where the clock plate ends (the note sits under it while it is out). */
export function setAutosaveClock(fn: () => number): void {
  clockBottom = fn;
}

/**
 * Save at the next free moment even without a map change (the story's own
 * オートセーブ: 60_ch3_story 10.32, after S19 and S23 inside one room).
 */
export function autosaveSoon(): void {
  savedExp = -2;
}

/** Forget the baseline (a new game or a load starts a new one). */
export function resetAutosave(): void {
  savedMap = null;
  savedExp = -1;
  freeMs = 0;
}

if (typeof document !== 'undefined')
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden || !cur || game.frame - lastFrame > 2 || !freeNow(cur)) return;
    // (the page is hidden: a failure here is told when the player is back, on the next save)
    write();
  });

class AutosaveNote implements Widget {
  modal = false;
  done = false;
  private t = 0;
  private readonly y = Math.max(6, clockBottom() + 4);
  /** The failure note stays long enough to read (4.5 s), on a paler tape. */
  private readonly hold: number;
  constructor(private readonly label = LABEL) {
    this.hold = label === LABEL ? 1600 : 4500;
  }
  update(dt: number): void {
    this.t += dt;
    if (this.t > this.hold + 300) this.done = true;
  }
  draw(g: Gfx): void {
    const t = this.t;
    const k = t < 160 ? ease.cubicOut(t / 160) : t > this.hold ? 1 - (t - this.hold) / 300 : 1;
    const w = textW(this.label) + 16;
    const x = W - 6 - w + Math.round((1 - k) * 10);
    const fail = this.label !== LABEL;
    drawTape(g, x, this.y, w, 18, this.label, fail ? { color: '#EFE6D2', seed: 23, alpha: Math.max(0, k), ink: '#5A5070' } : { color: '#F6D98A', seed: 21, alpha: Math.max(0, k) });
    if (fail) markText(W - 6 - w, this.y, w, 18, true);
  }
}

// QA: __game.cmd.saveFailNote() shows the failure note now; saveFailReset() lets it show again
if (import.meta.env.DEV) {
  registerDebug('saveFailNote', () => game.ui.push(new AutosaveNote(SAVE_FAIL_LABEL)));
  registerDebug('saveFailReset', () => {
    failShown = false;
  });
}
