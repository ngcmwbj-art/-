// Message box + choice window as modal UI widgets, driven from coroutines:
//
//   yield* say('こんにちは！{w=300}\nいい天気ですね。', { name: 'おばあさん', voice: 'old' });
//   yield* say(['1ページ目', '2ページ目']);
//   const i = yield* choose(['はい', 'いいえ']);
//
// Inline markup inside text:
//   {w=300}  pause 300ms          {spd=2}  typing speed multiplier (0.5 = slower)
//   {c=#ff5a5a}…{/c}  color       {shake}…{/shake}  trembling letters
//   {wave}…{/wave}  wavy letters   \n  line break
// A page holds 3 lines; longer text is split into pages automatically.

import type { Co } from '../engine/co';
import { charWidth, drawGlyph, LINE_H, wrap } from '../engine/font';
import { game, type Widget } from '../engine/game';
import type { Gfx } from '../engine/gfx';
import type { Input } from '../engine/input';
import { H, W } from '../engine/screen';
import { sfx, textBlip } from '../audio';
import { drawWindow, UI } from './window';

export interface SayOpts {
  name?: string;
  voice?: string;
  /** Box position. */
  pos?: 'bottom' | 'top';
  /** Chars per second (default 40). */
  cps?: number;
  /** Auto-advance after the page is complete (ms), no key needed. */
  auto?: number;
}

interface Glyph {
  ch: string;
  x: number;
  y: number;
  color: string;
  fx: '' | 'shake' | 'wave';
  /** Pause (ms) to apply after this glyph appears. */
  pause: number;
  speed: number;
}

export const BOX = { x: 8, w: W - 16, h: 3 * LINE_H + 22, padX: 14, padY: 11 };
const LINES_PER_PAGE = 3;

/** Strip markup to measure / wrap. Returns plain text and a list of tokens. */
function parse(text: string): { plain: string; marks: { at: number; tag: string }[] } {
  const marks: { at: number; tag: string }[] = [];
  let plain = '';
  const re = /\{([^}]*)\}/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    plain += text.slice(last, m.index);
    marks.push({ at: [...plain].length, tag: m[1] });
    last = m.index + m[0].length;
  }
  plain += text.slice(last);
  return { plain, marks };
}

/** Lay out one message into pages of positioned glyphs. */
export function layoutPages(text: string, maxW: number): Glyph[][] {
  const { plain, marks } = parse(text);
  const lines = wrap(plain, maxW);
  const chars = [...plain];
  const pages: Glyph[][] = [];
  let color = UI.text;
  let fx: Glyph['fx'] = '';
  let speed = 1;
  let ci = 0; // index into chars (plain, includes \n)
  let mi = 0;
  const applyMarks = (glyphs: Glyph[]) => {
    while (mi < marks.length && marks[mi].at <= ci) {
      const t = marks[mi].tag;
      if (t.startsWith('w=')) {
        const last = glyphs[glyphs.length - 1];
        if (last) last.pause += parseInt(t.slice(2), 10) || 0;
      } else if (t.startsWith('c=')) color = t.slice(2);
      else if (t === '/c') color = UI.text;
      else if (t === 'shake' || t === 'wave') fx = t;
      else if (t === '/shake' || t === '/wave') fx = '';
      else if (t.startsWith('spd=')) speed = parseFloat(t.slice(4)) || 1;
      mi++;
    }
  };
  let page: Glyph[] = [];
  let lineInPage = 0;
  for (const line of lines) {
    if (lineInPage === LINES_PER_PAGE) {
      pages.push(page);
      page = [];
      lineInPage = 0;
    }
    let x = 0;
    for (const ch of line) {
      // skip characters that wrap() dropped (spaces at wrap points)
      while (ci < chars.length && chars[ci] !== ch) {
        applyMarks(page);
        ci++;
      }
      applyMarks(page);
      page.push({ ch, x, y: lineInPage * LINE_H, color, fx, pause: 0, speed });
      x += charWidth(ch);
      ci++;
    }
    applyMarks(page);
    // consume the newline that ended this paragraph line, if any
    if (chars[ci] === '\n') ci++;
    lineInPage++;
  }
  applyMarks(page);
  pages.push(page);
  return pages.filter((p, i) => p.length > 0 || i === 0);
}

export class MessageBox implements Widget {
  modal = true;
  done = false;
  private pages: Glyph[][] = [];
  private page = 0;
  private shown = 0;
  private acc = 0;
  private pauseLeft = 0;
  private t = 0;
  private openT = 0;
  private closing = false;
  private autoLeft = -1;
  private blipCount = 0;

  constructor(private queue: string[], private o: SayOpts = {}) {
    this.loadNext();
  }

  private loadNext(): void {
    const text = this.queue.shift() ?? '';
    this.pages = layoutPages(text, BOX.w - BOX.padX * 2);
    this.page = 0;
    this.shown = 0;
    this.acc = 0;
    this.autoLeft = -1;
  }

  private get glyphs(): Glyph[] {
    return this.pages[this.page] ?? [];
  }

  private get pageDone(): boolean {
    return this.shown >= this.glyphs.length;
  }

  update(dt: number, input: Input): void {
    this.t += dt;
    if (this.closing) {
      this.openT -= dt;
      if (this.openT <= 0) this.done = true;
      return;
    }
    this.openT = Math.min(120, this.openT + dt);
    if (this.openT < 120) return;

    const cps = (this.o.cps ?? 40) * (input.rawDown('confirm') || input.rawDown('cancel') ? 3 : 1);
    if (!this.pageDone) {
      if (this.pauseLeft > 0) this.pauseLeft -= dt;
      else {
        this.acc += (dt / 1000) * cps * (this.glyphs[this.shown]?.speed ?? 1);
        while (this.acc >= 1 && !this.pageDone) {
          this.acc -= 1;
          const gl = this.glyphs[this.shown++];
          if (gl.ch.trim() && this.blipCount++ % 2 === 0) textBlip(this.o.voice ?? 'default', gl.ch);
          if (gl.pause) {
            this.pauseLeft = gl.pause;
            this.acc = 0;
            break;
          }
          if ('。！？…'.includes(gl.ch)) {
            this.pauseLeft = 90;
            this.acc = 0;
            break;
          }
        }
      }
      if (input.rawPressed('confirm') && this.shown > 1) {
        this.shown = this.glyphs.length;
        this.pauseLeft = 0;
      }
      if (this.pageDone && this.o.auto !== undefined) this.autoLeft = this.o.auto;
      return;
    }
    if (this.autoLeft >= 0) {
      this.autoLeft -= dt;
      if (this.autoLeft <= 0) this.advance();
      return;
    }
    if (input.rawPressed('confirm') || input.rawPressed('cancel')) {
      sfx('se_cursor', { pitch: 0.8 });
      this.advance();
    }
  }

  private advance(): void {
    if (this.page < this.pages.length - 1) {
      this.page++;
      this.shown = 0;
      this.acc = 0;
      this.autoLeft = -1;
    } else if (this.queue.length) this.loadNext();
    else {
      this.closing = true;
      this.openT = 80;
    }
  }

  draw(g: Gfx): void {
    const k = Math.min(1, this.openT / 120);
    const e = 1 - Math.pow(1 - k, 3);
    const bh = BOX.h;
    const by = this.o.pos === 'top' ? 8 : H - bh - 8;
    const h = Math.max(6, Math.round(bh * e));
    const y = by + Math.round((bh - h) / 2);
    drawWindow(g, BOX.x, y, BOX.w, h, UI, Math.min(1, k * 1.5));
    if (k < 1) return;
    if (this.o.name) {
      const nw = g.measure(this.o.name) + 16;
      drawWindow(g, BOX.x + 8, by - 13, nw, 20);
      g.text(this.o.name, BOX.x + 16, by - 10, { color: UI.accent });
    }
    const ox = BOX.x + BOX.padX;
    const oy = by + BOX.padY;
    const ctx = g.ctx;
    for (let i = 0; i < this.shown && i < this.glyphs.length; i++) {
      const gl = this.glyphs[i];
      let dx = 0;
      let dy = 0;
      if (gl.fx === 'shake') {
        dx = Math.round(Math.sin(this.t * 0.09 + i * 3.1) * 0.8);
        dy = Math.round(Math.cos(this.t * 0.11 + i * 1.7) * 0.8);
      } else if (gl.fx === 'wave') dy = Math.round(Math.sin(this.t / 120 + i * 0.6) * 1.5);
      drawGlyph(ctx, gl.ch, ox + gl.x + dx + 1, oy + gl.y + dy + 1, UI.shadow);
      drawGlyph(ctx, gl.ch, ox + gl.x + dx, oy + gl.y + dy, gl.color);
    }
    if (this.pageDone && this.autoLeft < 0) {
      // bouncing "next" marker
      const bx = BOX.x + BOX.w - 18;
      const byy = by + bh - 12 + (Math.floor(this.t / 250) % 2);
      g.rect(bx, byy, 7, 1, UI.accent);
      g.rect(bx + 1, byy + 1, 5, 1, UI.accent);
      g.rect(bx + 2, byy + 2, 3, 1, UI.accent);
      g.rect(bx + 3, byy + 3, 1, 1, UI.accent);
    }
  }
}

/** Show one or more messages; resumes when the player closes the box. */
export function* say(text: string | string[], o: SayOpts = {}): Co {
  const box = game.ui.push(new MessageBox(Array.isArray(text) ? text.slice() : [text], o));
  yield () => box.done;
}

export class ChoiceBox implements Widget {
  modal = true;
  done = false;
  index = 0;
  result = -1;
  private t = 0;

  constructor(private options: string[], private o: { cancel?: number; x?: number; y?: number } = {}) {}

  update(dt: number, input: Input): void {
    this.t += dt;
    if (input.rawRepeat('down')) {
      this.index = (this.index + 1) % this.options.length;
      sfx('se_cursor');
    }
    if (input.rawRepeat('up')) {
      this.index = (this.index + this.options.length - 1) % this.options.length;
      sfx('se_cursor');
    }
    if (input.rawPressed('confirm')) {
      sfx('se_confirm');
      this.result = this.index;
      this.done = true;
    } else if (input.rawPressed('cancel') && this.o.cancel !== undefined) {
      sfx('se_cancel');
      this.result = this.o.cancel;
      this.done = true;
    }
  }

  draw(g: Gfx): void {
    const w = Math.max(...this.options.map((s) => g.measure(s))) + 34;
    const h = this.options.length * LINE_H + 14;
    const x = this.o.x ?? W - w - 12;
    const y = this.o.y ?? H - BOX.h - h - 12;
    drawWindow(g, x, y, w, h);
    this.options.forEach((s, i) => {
      const sel = i === this.index;
      g.text(s, x + 22, y + 7 + i * LINE_H, { color: sel ? UI.accent : UI.text, shadow: UI.shadow });
      if (sel) {
        const cx = x + 10 + (Math.floor(this.t / 200) % 2);
        const cy = y + 11 + i * LINE_H;
        g.rect(cx, cy, 1, 7, UI.accent);
        g.rect(cx + 1, cy + 1, 1, 5, UI.accent);
        g.rect(cx + 2, cy + 2, 1, 3, UI.accent);
        g.rect(cx + 3, cy + 3, 1, 1, UI.accent);
      }
    });
  }
}

/** Ask the player to pick an option; returns its index. */
export function* choose(options: string[], o: { cancel?: number; x?: number; y?: number } = {}): Co<number> {
  const box = game.ui.push(new ChoiceBox(options, o));
  yield () => box.done;
  return box.result;
}

/** Message whose last page stays open while a choice is made. */
export function* ask(text: string, options: string[], o: SayOpts & { cancel?: number } = {}): Co<number> {
  const box = game.ui.push(new MessageBox([text], { ...o }));
  // Wait until the text is fully typed, then show choices over it.
  yield () => box.done || (box as unknown as { pageDone: boolean }).pageDone;
  const i = yield* choose(options, { cancel: o.cancel });
  box.done = true;
  return i;
}
