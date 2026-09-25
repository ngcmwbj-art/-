// オートセーブ. The game writes itself down in the save slot (the same one
// お地蔵さん and the rest bench use) once Minato can walk again after:
//  - arriving on another map (in or out of a building, on to the next area)
//  - a battle that gave the party experience
// and, without the note, whenever the page is hidden (another app, the phone
// locked) while he can walk. It only saves while he stands free on the
// field, so a save never lands in the middle of an event.
// A little masking-tape note 「オートセーブ」 shows in the top-right corner.

import { game, type Widget } from '../engine/game';
import type { Gfx } from '../engine/gfx';
import { W } from '../engine/screen';
import { ease } from '../engine/tween';
import { flag, saveGame, setFlag, state } from '../game/state';
import type { FieldScene } from '../world/field';
import { drawTape, textW } from './window';

/** How long Minato must stand free before a save (chained events settle first). */
const SETTLE_MS = 450;
const LABEL = 'オートセーブ';

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
  if (ok) {
    savedMap = state.map;
    savedExp = expNow();
  }
  return ok;
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
}

/** Where the clock plate ends (the note sits under it while it is out). */
export function setAutosaveClock(fn: () => number): void {
  clockBottom = fn;
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
    write();
  });

class AutosaveNote implements Widget {
  modal = false;
  done = false;
  private t = 0;
  private readonly y = Math.max(6, clockBottom() + 4);
  update(dt: number): void {
    this.t += dt;
    if (this.t > 1900) this.done = true;
  }
  draw(g: Gfx): void {
    const t = this.t;
    const k = t < 160 ? ease.cubicOut(t / 160) : t > 1600 ? 1 - (t - 1600) / 300 : 1;
    const w = textW(LABEL) + 16;
    const x = W - 6 - w + Math.round((1 - k) * 10);
    drawTape(g, x, this.y, w, 18, LABEL, { color: '#F6D98A', seed: 21, alpha: Math.max(0, k) });
  }
}
