// Small help note (10_narrative 5.2: 「移動：十字キー／調べる・話す：Z」 in a
// small window at the bottom left, gone after 4 s).

import { game, type Widget } from '../engine/game';
import type { Gfx } from '../engine/gfx';
import { ease } from '../engine/tween';
import { drawWindow, textW, UI } from './window';

class Guide implements Widget {
  modal = false;
  done = false;
  private t = 0;
  constructor(private lines: string[], private ms: number) {}
  update(dt: number): void {
    this.t += dt;
    if (this.t > this.ms + 250) this.done = true;
  }
  draw(g: Gfx): void {
    const inK = Math.min(1, this.t / 180);
    const outK = this.t > this.ms ? Math.min(1, (this.t - this.ms) / 250) : 0;
    const a = inK * (1 - outK);
    const w = Math.max(...this.lines.map((l) => textW(l))) + 20;
    const h = this.lines.length * 17 + 10;
    const x = 8;
    const y = 216 - h - 8 + Math.round((1 - ease.cubicOut(inK)) * 6);
    drawWindow(g, x, y, w, h, UI, a, { curl: false });
    this.lines.forEach((l, i) => g.text(l, x + 10, y + 5 + i * 17, { color: UI.pencil, alpha: a }));
  }
}

/** Show a short help note at the bottom left (default 4 s). */
export function showGuide(text: string | string[], ms = 4000): void {
  game.ui.push(new Guide(Array.isArray(text) ? text : text.split('\n'), ms));
}
