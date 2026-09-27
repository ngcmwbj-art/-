// 手元のアップ: マサルさんの見回り帳 (50_ch2_story 10.16 カット2a, 52 4.3).
// After his 「……よし。朝だ。」 he writes, in the day's column of the rounds
// book, a small red hanamaru — copied from Shun's stamp (00 1.1: the
// village starts drawing the mark with its own hand). No line, no page: a
// small framed close-up over his head (96×64) shows the book — a ruled sheet
// on a navy clipboard, the pens' rows ticked in pencil for the nights before
// and for tonight — and the red pen drawing the hanamaru at the foot of
// today's column in one stroke (the spiral, then the petals), his hand
// following the pen's tip.
//
//   yield* playMimawariHanamaru(sx, sy)   // (sx, sy): the screen point it rises from (his head)

import type { Co } from '../engine/co';
import { game, type Widget } from '../engine/game';
import type { Gfx } from '../engine/gfx';
import { PixelCanvas } from '../engine/pixel';
import { ease } from '../engine/tween';
import { sfx } from '../audio';

const W = 96;
const H = 64;
const C = {
  ink: '#1B1733',
  frame: '#2A2440',
  board: '#2F4A8A',
  boardLt: '#4766A8',
  boardDk: '#223668',
  steel: '#9AA0A8',
  steelLt: '#C8CDD4',
  sheet: '#F4F1E8',
  sheetSh: '#E8E4D8',
  grid: '#E8D9B5',
  rule: '#C8C2B4',
  pencil: '#3A3F48',
  pencilLt: '#6B7186',
  red: '#E23B2E',
  redDk: '#A8201A',
  skin: '#C98A6A',
  skinDk: '#8A5A3A',
  skinLt: '#E0A884',
  suit: '#2F4A8A',
};

/** Today's column (the last): the hanamaru's centre at its foot. */
const HANA = { x: 76, y: 50 };

/**
 * The hanamaru's stroke, one pen movement: a spiral out from the middle (1¾
 * turns), then eight petals looping round it (52 4.3). Pixels in drawing
 * order, deduplicated, relative to the centre.
 */
function hanamaruStroke(): [number, number][] {
  const R = 8;
  const amp = 2.6;
  const turns = 1.75;
  const out: [number, number][] = [];
  const seen = new Set<string>();
  const add = (x: number, y: number) => {
    const px = Math.round(x - 0.5);
    const py = Math.round(y - 0.5);
    const k = `${px},${py}`;
    if (seen.has(k)) return;
    seen.add(k);
    out.push([px, py]);
  };
  for (let i = 0; i <= 160; i++) {
    const t = i / 160;
    const r = 0.3 + (R - 4 - 0.3) * t;
    const th = -Math.PI / 2 + t * Math.PI * 2 * turns;
    add(r * Math.cos(th), r * Math.sin(th));
  }
  const th0 = -Math.PI / 2 + Math.PI * 2 * turns;
  for (let i = 0; i <= 400; i++) {
    const t = i / 400;
    const th = th0 + t * Math.PI * 2;
    const r = R - amp + amp * Math.abs(Math.sin((8 * (th - th0)) / 2));
    add(r * Math.cos(th), r * Math.sin(th));
  }
  return out;
}

/** The book in close-up, without today's hanamaru. */
function bookImg(): HTMLCanvasElement {
  const p = new PixelCanvas(W, H);
  // the frame of the close-up and the clipboard behind the sheet
  p.rect(0, 0, W, H, C.frame);
  p.rect(1, 1, W - 2, H - 2, C.board);
  p.hline(1, W - 2, 1, C.boardLt);
  p.vline(1, 1, H - 2, C.boardLt);
  p.hline(1, W - 2, H - 2, C.boardDk);
  p.vline(W - 2, 1, H - 2, C.boardDk);
  // the sheet (its shadow on the board, right and below)
  const sx = 6;
  const sy = 6;
  const sw = W - 12;
  const sh = H - 9;
  p.rect(sx + 1, sy + 1, sw, sh, C.boardDk);
  p.rect(sx, sy, sw, sh, C.sheet);
  for (let y = sy + 3; y < sy + sh; y += 4) for (let x = sx + 1; x < sx + sw - 1; x++) if (x % 4 === 2) p.set(x, y, C.grid);
  p.vline(sx + sw - 1, sy, sy + sh - 1, C.sheetSh);
  p.hline(sx, sx + sw - 1, sy + sh - 1, C.sheetSh);
  // the steel clip over the top edge
  p.rect(36, 2, 24, 7, C.steel);
  p.hline(36, 59, 2, C.steelLt);
  p.hline(37, 58, 8, C.pencil);
  p.rect(44, 4, 8, 2, C.pencilLt);
  // the heading: a line of pencil strokes (the book's name and the month)
  for (const [x0, len] of [
    [10, 5],
    [16, 4],
    [21, 6],
  ] as const)
    p.hline(x0, x0 + len - 1, 12, C.pencil);
  p.set(12, 11, C.pencil);
  p.set(23, 11, C.pencil);
  p.hline(66, 72, 12, C.pencilLt);
  // the columns: the pens' names, three nights before, tonight (the last, ruled off)
  const cols = [30, 44, 58, 68];
  const rowY = [18, 24, 30, 36];
  p.hline(sx + 2, sx + sw - 3, 15, C.rule);
  for (const cx of cols) p.vline(cx, 15, 40, C.rule);
  p.vline(84, 15, 40, C.rule);
  for (const y of rowY) {
    p.hline(sx + 2, sx + sw - 3, y + 4, C.rule);
    // the pen's name: two short strokes and a numeral
    p.hline(10, 13, y + 1, C.pencil);
    p.hline(15, 17, y + 1, C.pencil);
    p.set(11, y, C.pencil);
    p.vline(22 + (y % 3), y, y + 2, C.pencil);
  }
  // the dates over the columns: small pencil marks
  for (const cx of cols.slice(0, 3)) {
    p.hline(cx + 4, cx + 6, 13, C.pencilLt);
    p.set(cx + 8, 13, C.pencilLt);
  }
  p.hline(72, 75, 13, C.pencil);
  p.set(77, 13, C.pencil);
  // the ticks: every pen, every night (a little different each time); tonight's firmer
  const tick = (x: number, y: number, c: string, v: number) => {
    p.set(x, y + 1 + (v & 1), c);
    p.set(x + 1, y + 2, c);
    p.set(x + 2, y + 1, c);
    p.set(x + 3, y, c);
    if (v % 3 === 0) p.set(x + 4, y - 1, c);
  };
  cols.slice(0, 3).forEach((cx, i) => rowY.forEach((y, j) => tick(cx + 4 + ((i + j) % 2), y + 1, C.pencilLt, i * 5 + j)));
  rowY.forEach((y, j) => tick(72 + (j % 2), y + 1, C.pencil, j * 3));
  // a note in the margin of the last night's column (the chores' line or the round's)
  p.hline(10, 26, 46, C.pencilLt);
  p.hline(10, 20, 50, C.pencilLt);
  return p.toCanvas();
}

class MimawariCloseup implements Widget {
  modal = false;
  done = false;
  t = 0;
  /** 0..1: how much of the stroke is on the page. */
  drawn = 0;
  /** 1: shown; eases in and out. */
  shown = 0;
  private readonly book = bookImg();
  private readonly stroke = hanamaruStroke();
  constructor(
    private readonly x: number,
    private readonly y: number,
  ) {}
  update(dt: number): void {
    this.t += dt;
  }
  draw(g: Gfx): void {
    if (this.shown <= 0) return;
    const k = ease.cubicOut(Math.min(1, this.shown));
    const x = Math.round(this.x - W / 2);
    const y = Math.round(this.y - H + (1 - k) * 6);
    g.alpha(k, () => {
      // a soft shadow under the close-up, and the little tail pointing down at him
      g.rect(x + 2, y + 2, W, H, '#0B0B14', 0.35);
      g.img(this.book, x, y);
      g.rect(x + W / 2 - 3, y + H, 7, 1, C.frame);
      g.rect(x + W / 2 - 2, y + H + 1, 5, 1, C.frame);
      g.rect(x + W / 2 - 1, y + H + 2, 3, 1, C.frame);
      g.px(x + W / 2, y + H + 3, C.frame);
      // today's hanamaru, as far as the pen has come (1px red, the stroke's
      // turning points a shade darker where the ink pools)
      const n = Math.floor(this.stroke.length * this.drawn);
      for (let i = 0; i < n; i++) {
        const [dx, dy] = this.stroke[i];
        g.px(x + HANA.x + dx, y + HANA.y + dy, i % 23 === 0 ? C.redDk : C.red);
      }
      // the red pen at the tip of the line, his hand on it
      if (this.drawn > 0 && this.drawn < 1) {
        const [dx, dy] = this.stroke[Math.max(0, n - 1)];
        const px = x + HANA.x + dx;
        const py = y + HANA.y + dy;
        this.pen(g, px, py);
      } else if (this.drawn <= 0) this.pen(g, x + HANA.x + 1, y + HANA.y - 3);
    });
  }
  /** The pen from its tip (px, py) up to the right; his fingers round it. */
  private pen(g: Gfx, px: number, py: number): void {
    g.px(px, py, C.ink);
    for (let i = 1; i <= 8; i++) g.px(px + i, py - i, i < 6 ? C.red : C.redDk);
    for (let i = 2; i <= 6; i++) g.px(px + i + 1, py - i, C.redDk);
    g.px(px + 3, py - 4, '#F4F1E8'); // the clip's glint
    // the hand: thick fingers round the barrel, the back of the hand, the cuff
    g.rect(px + 3, py - 5, 4, 3, C.skin);
    g.rect(px + 5, py - 8, 6, 5, C.skin);
    g.rect(px + 6, py - 8, 5, 1, C.skinLt);
    g.rect(px + 5, py - 4, 6, 1, C.skinDk);
    g.px(px + 3, py - 3, C.skinDk);
    g.rect(px + 10, py - 10, 5, 5, C.suit);
    g.rect(px + 10, py - 10, 5, 1, '#4766A8');
  }
}

/**
 * The close-up rises over his head at (sx, sy) (screen px), the pen draws the
 * hanamaru in one stroke (0.7 s, the pen's scratch twice, quietly), holds,
 * and goes. About 1.4 s. Picture only: no line.
 */
export function* playMimawariHanamaru(sx: number, sy: number): Co {
  const cx = Math.max(W / 2 + 4, Math.min(384 - W / 2 - 4, sx));
  const cy = Math.max(H + 6, sy);
  const w = new MimawariCloseup(cx, cy);
  game.ui.push(w);
  for (let t = 0; t < 160; t += 16.7) {
    w.shown = t / 160;
    yield null;
  }
  w.shown = 1;
  yield 220;
  sfx('se_pen_write', { vol: 0.3 });
  const ms = 700;
  let second = false;
  for (let t = 0; t < ms; t += 16.7) {
    w.drawn = ease.sineInOut(t / ms);
    if (!second && t > ms * 0.55) {
      second = true;
      sfx('se_pen_write', { vol: 0.25, pitch: 1.1 });
    }
    yield null;
  }
  w.drawn = 1;
  yield 480;
  for (let t = 0; t < 180; t += 16.7) {
    w.shown = 1 - t / 180;
    yield null;
  }
  w.done = true;
}
