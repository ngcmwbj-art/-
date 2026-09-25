// Little speech bubbles over a character's head (30_level_art 10.4: まめ吉's
// 「まいど！」, the escalator's thanks): #FBF3DC with a 1px #2A2440 frame, a
// 3px tail, 16px text, popping in over 0.12 s (1.2 → 1.0).
//
//   showBubble('npc_mamekichi', 'まいど！', 1400);
//   yield* bubble('npc_mamekichi', 'まいど！');   // waits until it's gone

import type { Co } from '../engine/co';
import { game, type Widget } from '../engine/game';
import type { Gfx } from '../engine/gfx';
import { drawText } from '../engine/font';
import { makeCanvas } from '../engine/pixel';
import { ease } from '../engine/tween';
import { field } from '../world/field';
import { textW, UI } from './window';

const cache = new Map<string, HTMLCanvasElement>();

/** The bubble as a canvas: w = text + 10, h = 18 + 3px tail (tail centred). */
export function bubbleCanvas(text: string): HTMLCanvasElement {
  let c = cache.get(text);
  if (c) return c;
  const w = textW(text) + 10;
  const h = 18;
  const [cv, ctx] = makeCanvas(w + 1, h + 4);
  const r = (x: number, y: number, ww: number, hh: number, col: string) => {
    ctx.fillStyle = col;
    ctx.fillRect(x, y, ww, hh);
  };
  r(1, 1, w, h, UI.shadow); // soft offset shadow
  ctx.clearRect(0, 0, w, h);
  r(1, 0, w - 2, h, UI.border);
  r(0, 1, w, h - 2, UI.border);
  r(1, 1, w - 2, h - 2, UI.bg);
  r(1, 1, w - 2, 1, '#FFFBEE');
  // tail (3px) under the middle
  const tx = Math.floor(w / 2) - 2;
  r(tx, h - 1, 5, 1, UI.bg);
  r(tx - 1, h - 1, 1, 1, UI.border);
  r(tx + 5, h - 1, 1, 1, UI.border);
  r(tx, h, 4, 1, UI.bg);
  r(tx - 1 + 1, h, 1, 1, UI.border);
  r(tx + 4, h, 1, 1, UI.border);
  r(tx + 1, h + 1, 2, 1, UI.bg);
  r(tx + 1, h + 1, 1, 1, UI.border);
  r(tx + 3, h + 1, 1, 1, UI.border);
  r(tx + 2, h + 2, 1, 1, UI.border);
  drawText(ctx, text, 5, 1, { color: UI.text });
  c = cv;
  cache.set(text, c);
  return c;
}

/** Draw a bubble whose tail tip is at (x, y); `age` ms since it appeared. */
export function drawBubble(g: Gfx, text: string, x: number, y: number, age: number, alpha = 1): void {
  const img = bubbleCanvas(text);
  const k = Math.min(1, age / 120);
  const s = 1.2 - 0.2 * ease.cubicOut(k);
  const w = Math.round(img.width * s);
  const h = Math.round(img.height * s);
  g.alpha(alpha * Math.min(1, k * 2), () => g.ctx.drawImage(img, Math.round(x - w / 2), Math.round(y - h), w, h));
}

class Bubble implements Widget {
  modal = false;
  done = false;
  private t = 0;
  constructor(private actorId: string, private text: string, private ms: number) {}
  update(dt: number): void {
    this.t += dt;
    if (this.t > this.ms + 150) this.done = true;
  }
  draw(g: Gfx): void {
    const f = field();
    if (!f || game.top !== f) return;
    const a = f.actorById(this.actorId);
    if (!a || !a.visible) return;
    const x = Math.round(a.x + a.ox - f.camX);
    const y = Math.round(a.y + Math.min(0, a.oy) - f.camY - 26);
    const out = this.t > this.ms ? 1 - (this.t - this.ms) / 150 : 1;
    drawBubble(g, this.text, x, y, this.t, out);
  }
}

/** Pop a bubble over an actor of the field for `ms` (returns at once). */
export function showBubble(actorId: string, text: string, ms = 1400): void {
  game.ui.push(new Bubble(actorId, text, ms));
}

/** Same, and wait until it has gone. */
export function* bubble(actorId: string, text: string, ms = 1400): Co {
  const b = new Bubble(actorId, text, ms);
  game.ui.push(b);
  yield () => b.done;
}
