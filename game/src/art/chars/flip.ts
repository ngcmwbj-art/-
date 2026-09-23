// Kanenari's flip board (フリップ): a hand-held white board written on with
// a black marker. Three sizes for other teams:
//   flipBoard()            24×16 board with marker "handwriting" (field /
//                          battle: held up over his head; 00_concept 4.2, 20 12.4)
//   flipBoardPanel(w, h)   blank board for the UI to write real text on
//                          (safe writing area: x 4..w-7, y 3..h-6)
//   flipIcon()             10×8 icon for the name tag ("カネナリくん" + board)
// All cached per size. Lit from the left like everything else; the 1px
// outline is inside the returned size.

import { PixelCanvas } from '../../engine/pixel';
import { LINE_H, drawText, measure, wrap } from '../../engine/font';

const OL = '#2A2440';
const BOARD = '#F4F1E8';
const BOARD_HI = '#FFF6D8';
const BOARD_SH = '#E2DCCC';
const EDGE = '#C8C2B4';
const EDGE_D = '#9A948A';
const RIM = '#FFD6A8';
const INK = '#2A2440';
const INK_SOFT = '#8A8EA0';
const RED = '#E23B2E';

/** Board of exactly w×h including its outline; thickness shows bottom/right. */
function boardBase(w: number, h: number, thick = 2): PixelCanvas {
  const p = new PixelCanvas(w, h);
  const x0 = 1;
  const y0 = 1;
  const x1 = w - 2; // last column inside the outline
  const y1 = h - 2;
  // face (1px rounded corners)
  p.rect(x0 + 1, y0, x1 - thick - x0, y1 - thick - y0 + 1, BOARD);
  p.rect(x0, y0 + 1, x1 - thick - x0 + 1, y1 - thick - y0 - 1, BOARD);
  // thickness (bottom + right edge)
  p.rect(x0 + 1, y1 - thick + 1, x1 - x0, thick, EDGE);
  p.rect(x1 - thick + 1, y0 + 1, thick, y1 - y0, EDGE);
  p.set(x1, y1, EDGE_D);
  p.set(x1, y0, 0 as unknown as string);
  // shading toward the lower right, highlight upper left
  for (let y = y0 + 1; y <= y1 - thick; y++) p.set(x1 - thick, y, BOARD_SH);
  for (let x = x0 + 1; x <= x1 - thick; x++) p.set(x, y1 - thick, BOARD_SH);
  for (let x = x0 + 2; x < Math.min(x1 - 4, x0 + 10); x++) p.set(x, y0, BOARD_HI);
  // sunset rim on the left edge, broken every third row
  for (let y = y0 + 1; y < y1 - thick; y++) if (y % 3 !== 2) p.set(x0, y, RIM);
  p.outline(OL);
  return p;
}

/** Deterministic 0..1 hash for the hand-drawn wobble. */
function hh(a: number, b: number): number {
  let h = (a * 374761393 + b * 668265263) >>> 0;
  h = ((h ^ (h >>> 13)) * 1274126177) >>> 0;
  return (h & 0xffff) / 0xffff;
}

/**
 * One line of marker "handwriting": a single continuous pen line of
 * forward-slanted humps in word-sized runs (strokes, not glyphs, so it never
 * reads as garbled text). Each hump rises fast and falls slower; a few are
 * tall (ascenders), a few shallow. Rows y … y+3 (baseline y+3).
 */
function scribble(p: PixelCanvas, x: number, y: number, len: number, seed: number, c = INK) {
  const base = y + 3;
  let cx = x;
  let n = 0;
  while (cx < x + len - 3) {
    const humps = 2 + Math.floor(hh(seed, n) * 2);
    let px = cx;
    let py = base;
    for (let k = 0; k < humps && cx + 3 <= x + len; k++, n++) {
      const r = hh(seed * 7 + n, 3);
      const a = r < 0.2 ? 3 : r < 0.75 ? 2 : 1;
      // up-stroke to the top of the hump, slant down to the baseline
      p.line(px, py, cx + 1, base - a, c);
      p.line(cx + 1, base - a, cx + 2, base - Math.max(0, a - 1), c);
      p.line(cx + 2, base - Math.max(0, a - 1), cx + 3, base, c);
      px = cx + 3;
      py = base;
      cx += 3;
    }
    // tail flick, then a gap before the next word
    p.set(cx + 1, base - 1, c);
    cx += 4;
    n += 5;
  }
}

const boards = new Map<number, HTMLCanvasElement>();

/**
 * 24×16 flip with marker handwriting (use as-is on the field and in battle).
 * variant 0 = the usual board, 1 = the other side (after turning it over),
 * 2 = a short exclamation (a word and a big "!").
 */
export function flipBoard(variant = 0): HTMLCanvasElement {
  let c = boards.get(variant);
  if (c) return c;
  const p = boardBase(24, 16);
  if (variant === 1) {
    scribble(p, 3, 3, 10, 4);
    scribble(p, 5, 8, 11, 6);
    // a little doodle of the bell at the end of the line
    p.set(17, 3, INK); p.set(16, 4, INK); p.set(17, 4, INK); p.set(18, 4, INK); p.set(15, 5, INK); p.set(19, 5, INK); p.set(15, 6, INK);
    p.set(16, 6, INK); p.set(17, 6, INK); p.set(18, 6, INK); p.set(19, 6, INK);
    p.set(14, 13, RED); p.set(15, 12, RED); p.set(16, 13, RED); p.set(17, 12, RED); p.set(18, 13, RED);
  } else if (variant === 2) {
    scribble(p, 3, 5, 10, 3);
    for (let y = 3; y <= 9; y++) { p.set(16, y, INK); p.set(17, y, INK); }
    p.set(16, 11, INK); p.set(17, 11, INK);
    p.set(3, 11, RED); p.set(4, 12, RED); p.set(5, 11, RED); p.set(6, 12, RED); p.set(7, 11, RED); p.set(8, 12, RED); p.set(9, 11, RED);
  } else {
    scribble(p, 3, 3, 15, 1);
    scribble(p, 3, 8, 11, 2);
    // a hand-drawn "!" and a red underline flourish
    p.set(16, 8, INK); p.set(16, 9, INK); p.set(16, 10, INK); p.set(16, 12, INK);
    p.set(3, 13, RED); p.set(4, 12, RED); p.set(5, 13, RED); p.set(6, 12, RED); p.set(7, 13, RED); p.set(8, 12, RED);
  }
  c = p.toCanvas();
  boards.set(variant, c);
  return c;
}

let edge: HTMLCanvasElement | null = null;

/** The 24-wide board seen edge-on (mid-turn), 24×4. */
export function flipBoardEdge(): HTMLCanvasElement {
  if (edge) return edge;
  const p = new PixelCanvas(24, 4);
  p.rect(1, 1, 22, 1, BOARD_HI);
  p.rect(1, 2, 22, 1, EDGE);
  p.set(1, 1, RIM);
  p.outline(OL);
  edge = p.toCanvas();
  return edge;
}

const panels = new Map<string, HTMLCanvasElement>();

/**
 * Blank flip board of any size (min 24×16) for the dialog UI to write on.
 * A faint ghost of an erased word and a tiny bell doodle make it feel used.
 */
export function flipBoardPanel(w: number, h: number): HTMLCanvasElement {
  w = Math.max(24, Math.round(w));
  h = Math.max(16, Math.round(h));
  const key = `${w}x${h}`;
  let c = panels.get(key);
  if (c) return c;
  const p = boardBase(w, h);
  // erased ghost strokes (top-right)
  if (w >= 48) {
    scribble(p, w - 20, 3, 11, 4, BOARD_SH);
  }
  // tiny bell doodle (bottom-right) in soft marker
  if (w >= 40 && h >= 24) {
    const bx = w - 12;
    const by = h - 12;
    const bell = ['..#..', '.###.', '.#.#.', '#...#', '#####', '..#..'];
    bell.forEach((row, j) => [...row].forEach((ch, i) => ch === '#' && p.set(bx + i, by + j, INK_SOFT)));
  }
  c = p.toCanvas();
  panels.set(key, c);
  return c;
}

let icon: HTMLCanvasElement | null = null;

/** 10×8 flip icon for the speaker tag. */
export function flipIcon(): HTMLCanvasElement {
  if (icon) return icon;
  const p = boardBase(10, 8, 1);
  p.set(2, 2, INK); p.set(3, 3, INK); p.set(4, 2, INK); p.set(5, 3, INK); p.set(6, 2, INK);
  p.set(2, 4, INK); p.set(3, 4, INK); p.set(4, 4, INK);
  icon = p.toCanvas();
  return icon;
}

let mini: HTMLCanvasElement | null = null;

/**
 * 16×12 mini board for the corner of the flip dialog window
 * (30_level_art 10.4 "枠の左上にボードの小さな絵（16×12）").
 */
export function flipBoardMini(): HTMLCanvasElement {
  if (mini) return mini;
  const p = boardBase(16, 12);
  // two lines of marker scribble + the red flourish
  scribble(p, 2, 1, 10, 5);
  p.set(3, 7, RED); p.set(4, 8, RED); p.set(5, 7, RED); p.set(6, 8, RED); p.set(7, 7, RED);
  mini = p.toCanvas();
  return mini;
}

const texts = new Map<string, HTMLCanvasElement>();

/**
 * A flip board with real text written on it in "marker bold" (each line
 * drawn twice, 1px apart; 30_level_art 10.4), sized to fit. Lines wrap at
 * maxW; '\n' forces a break. Cached by text (small LRU).
 */
export function flipBoardText(text: string, o: { maxW?: number; minW?: number; color?: string } = {}): HTMLCanvasElement {
  const key = `${text}|${o.maxW ?? 0}|${o.minW ?? 0}|${o.color ?? ''}`;
  const hit = texts.get(key);
  if (hit) return hit;
  const maxW = o.maxW ?? 160;
  const lines = wrap(text, maxW);
  const tw = Math.max(0, ...lines.map((l) => measure(l))) + 1;
  const w = Math.max(o.minW ?? 24, tw + 12);
  const h = Math.max(16, lines.length * LINE_H + 8);
  const base = flipBoardPanel(w, h);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d')!;
  g.drawImage(base, 0, 0);
  const color = o.color ?? INK;
  // written by hand in marker: every character drawn twice 1px apart
  // (felt-tip weight) and bobbing up/down a pixel off the line
  lines.forEach((l, i) => {
    const x = Math.round((w - 3 - tw) / 2);
    const y = 3 + i * LINE_H;
    let cx = x;
    [...l].forEach((ch, k) => {
      const r = hh(k + i * 31, text.length);
      const dy = r < 0.22 ? -1 : r > 0.8 ? 1 : 0;
      drawText(g, ch, cx, y + dy, { color });
      drawText(g, ch, cx + 1, y + dy, { color });
      cx += measure(ch);
    });
  });
  if (texts.size > 48) texts.delete(texts.keys().next().value as string);
  texts.set(key, c);
  return c;
}
