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

// Tiny pseudo-kana (3×4) so marker lines read as handwriting, not dashes.
const KANA = [
  ['#.#', '###', '..#', '.#.'],
  ['.#.', '###', '.#.', '#..'],
  ['##.', '..#', '.#.', '..#'],
  ['#..', '#.#', '#.#', '.#.'],
  ['.##', '#..', '.#.', '..#'],
  ['###', '.#.', '.#.', '#.#'],
  ['#.#', '.#.', '#.#', '...'],
];

function writeLine(p: PixelCanvas, x: number, y: number, n: number, seed: number, c = INK) {
  for (let k = 0; k < n; k++) {
    const g = KANA[(k * 3 + seed * 5) % KANA.length];
    const dy = (k + seed) % 3 === 0 ? 1 : 0;
    g.forEach((row, j) => [...row].forEach((ch, i) => ch === '#' && p.set(x + k * 4 + i, y + j + dy, c)));
  }
}

let board: HTMLCanvasElement | null = null;

/** 24×16 flip with marker handwriting (use as-is on the field and in battle). */
export function flipBoard(): HTMLCanvasElement {
  if (board) return board;
  const p = boardBase(24, 16);
  writeLine(p, 3, 3, 4, 1);
  writeLine(p, 3, 8, 3, 2);
  // a hand-drawn "!" and a red underline flourish
  p.set(16, 8, INK); p.set(16, 9, INK); p.set(16, 10, INK); p.set(16, 12, INK);
  p.set(3, 13, RED); p.set(4, 12, RED); p.set(5, 13, RED); p.set(6, 12, RED); p.set(7, 13, RED); p.set(8, 12, RED);
  board = p.toCanvas();
  return board;
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
    writeLine(p, w - 20, 3, 3, 4, BOARD_SH);
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
