// The game's own 5×7 dot numerals and capitals (30_level_art 10.10): HUD
// clock, money, prices, counts and the English title. DotGothic16's digits
// are never used for these.

import type { Gfx } from '../engine/gfx';
import { makeCanvas } from '../engine/pixel';

const GLYPHS: Record<string, string[]> = {
  '0': ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
  '1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  '2': ['01110', '10001', '00001', '00110', '01000', '10000', '11111'],
  '3': ['11110', '00001', '00001', '01110', '00001', '00001', '11110'],
  '4': ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
  '5': ['11111', '10000', '11110', '00001', '00001', '10001', '01110'],
  '6': ['00110', '01000', '10000', '11110', '10001', '10001', '01110'],
  '7': ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
  '8': ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
  '9': ['01110', '10001', '10001', '01111', '00001', '00010', '01100'],
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
  B: ['11110', '10001', '10001', '11110', '10001', '10001', '11110'],
  C: ['01110', '10001', '10000', '10000', '10000', '10001', '01110'],
  D: ['11110', '10001', '10001', '10001', '10001', '10001', '11110'],
  E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
  F: ['11111', '10000', '10000', '11110', '10000', '10000', '10000'],
  G: ['01110', '10001', '10000', '10111', '10001', '10001', '01111'],
  H: ['10001', '10001', '10001', '11111', '10001', '10001', '10001'],
  I: ['01110', '00100', '00100', '00100', '00100', '00100', '01110'],
  J: ['00111', '00010', '00010', '00010', '00010', '10010', '01100'],
  K: ['10001', '10010', '10100', '11000', '10100', '10010', '10001'],
  L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
  M: ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
  N: ['10001', '10001', '11001', '10101', '10011', '10001', '10001'],
  O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
  Q: ['01110', '10001', '10001', '10001', '10101', '10010', '01101'],
  R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
  S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
  T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
  U: ['10001', '10001', '10001', '10001', '10001', '10001', '01110'],
  V: ['10001', '10001', '10001', '10001', '10001', '01010', '00100'],
  W: ['10001', '10001', '10001', '10101', '10101', '10101', '01010'],
  X: ['10001', '10001', '01010', '00100', '01010', '10001', '10001'],
  Y: ['10001', '10001', '01010', '00100', '00100', '00100', '00100'],
  Z: ['11111', '00001', '00010', '00100', '01000', '10000', '11111'],
  '/': ['00001', '00010', '00010', '00100', '01000', '01000', '10000'],
  '-': ['00000', '00000', '00000', '01110', '00000', '00000', '00000'],
  '+': ['00000', '00100', '00100', '11111', '00100', '00100', '00000'],
  '×': ['00000', '10001', '01010', '00100', '01010', '10001', '00000'],
  '.': ['00000', '00000', '00000', '00000', '00000', '01100', '01100'],
  // 円 (yen, as a hand-drawn 5×7)
  '円': ['11111', '10101', '10101', '11111', '10001', '10001', '10011'],
  '→': ['00000', '00100', '00010', '11111', '00010', '00100', '00000'],
  "'": ['01000', '01000', '10000', '00000', '00000', '00000', '00000'],
  '?': ['01110', '10001', '00001', '00110', '00100', '00000', '00100'],
};

/** Narrow glyphs (advance 2–4 px instead of 6). */
const NARROW: Record<string, number> = { ':': 4, ' ': 4, "'": 4 };

export function digitAdvance(ch: string, spacing = 1): number {
  if (NARROW[ch] !== undefined) return NARROW[ch];
  return 5 + spacing;
}

export function digitsWidth(s: string, spacing = 1): number {
  let w = 0;
  for (const ch of s) w += digitAdvance(ch, spacing);
  return Math.max(0, w - (s.length ? spacing : 0));
}

const cache = new Map<string, HTMLCanvasElement>();

function glyphCanvas(ch: string, color: string): HTMLCanvasElement | null {
  const rows = GLYPHS[ch];
  if (!rows) return null;
  const key = ch + color;
  let c = cache.get(key);
  if (!c) {
    const [cv, ctx] = makeCanvas(5, 7);
    ctx.fillStyle = color;
    for (let y = 0; y < 7; y++) for (let x = 0; x < 5; x++) if (rows[y][x] === '1') ctx.fillRect(x, y, 1, 1);
    c = cv;
    cache.set(key, c);
  }
  return c;
}

export interface DigitOpts {
  color?: string;
  align?: 'left' | 'center' | 'right';
  spacing?: number;
  /** 1px drop shadow colour. */
  shadow?: string;
  /** 1px outline colour (all 8 sides). */
  outline?: string;
  scale?: number;
}

/** Draw 5×7 text. Returns the drawn width. ':' is a two-dot colon. */
export function drawDigits(g: Gfx, s: string, x: number, y: number, o: DigitOpts = {}): number {
  const color = o.color ?? '#2A2440';
  const sp = o.spacing ?? 1;
  const sc = o.scale ?? 1;
  const w = digitsWidth(s, sp) * sc;
  let cx = Math.round(o.align === 'center' ? x - w / 2 : o.align === 'right' ? x - w : x);
  const cy = Math.round(y);
  for (const ch of s) {
    if (ch === ':') {
      const dot = (col: string, ox: number, oy: number) => {
        g.rect(cx + ox + sc, cy + oy + 2 * sc, sc, sc, col);
        g.rect(cx + ox + sc, cy + oy + 5 * sc, sc, sc, col);
      };
      if (o.outline) for (const [ox, oy] of OUT8) dot(o.outline, ox, oy);
      if (o.shadow) dot(o.shadow, 1, 1);
      dot(color, 0, 0);
      cx += digitAdvance(ch, sp) * sc;
      continue;
    }
    const img = glyphCanvas(ch, color);
    if (img) {
      const draw = (im: HTMLCanvasElement, ox: number, oy: number) => g.ctx.drawImage(im, cx + ox, cy + oy, 5 * sc, 7 * sc);
      if (o.outline) {
        const ol = glyphCanvas(ch, o.outline)!;
        for (const [ox, oy] of OUT8) draw(ol, ox, oy);
      }
      if (o.shadow) draw(glyphCanvas(ch, o.shadow)!, 1, 1);
      draw(img, 0, 0);
    }
    cx += digitAdvance(ch, sp) * sc;
  }
  return w;
}

const OUT8: [number, number][] = [
  [-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1],
];

/** Is every character of `s` drawable with the 5×7 set? */
export function hasDigitGlyphs(s: string): boolean {
  for (const ch of s) if (!GLYPHS[ch] && NARROW[ch] === undefined) return false;
  return true;
}

// ---- 7×11 pencil numerals ---------------------------------------------------------------
// The 通知表 and the shop's price / quantity: numbers written by hand next to
// 16px labels, where the 5×7 set is too small. 1px strokes like the font's,
// the glyph box sits on the font's baseline (rows 3–13 of a 16px line).

const MID: Record<string, string[]> = {
  '0': ['..###..', '.#...#.', '#.....#', '#.....#', '#.....#', '#.....#', '#.....#', '#.....#', '#.....#', '.#...#.', '..###..'],
  '1': ['...#...', '..##...', '.#.#...', '...#...', '...#...', '...#...', '...#...', '...#...', '...#...', '...#...', '.#####.'],
  '2': ['..###..', '.#...#.', '#.....#', '......#', '.....#.', '....#..', '...#...', '..#....', '.#.....', '#......', '#######'],
  '3': ['.####..', '#....#.', '......#', '......#', '.....#.', '..###..', '.....#.', '......#', '......#', '#....#.', '.####..'],
  '4': ['.....#.', '....##.', '...#.#.', '..#..#.', '.#...#.', '#....#.', '#######', '.....#.', '.....#.', '.....#.', '.....#.'],
  '5': ['######.', '#......', '#......', '#......', '#####..', '.....#.', '......#', '......#', '......#', '#....#.', '.####..'],
  '6': ['..###..', '.#...#.', '#......', '#......', '#.###..', '##...#.', '#.....#', '#.....#', '#.....#', '.#...#.', '..###..'],
  '7': ['#######', '#.....#', '......#', '.....#.', '.....#.', '....#..', '....#..', '...#...', '...#...', '...#...', '...#...'],
  '8': ['..###..', '.#...#.', '#.....#', '#.....#', '.#...#.', '..###..', '.#...#.', '#.....#', '#.....#', '.#...#.', '..###..'],
  '9': ['..###..', '.#...#.', '#.....#', '#.....#', '#.....#', '.#...##', '..###.#', '......#', '......#', '.#...#.', '..###..'],
  '/': ['......#', '......#', '.....#.', '.....#.', '....#..', '...#...', '..#....', '.#.....', '.#.....', '#......', '#......'],
  '-': ['.......', '.......', '.......', '.......', '.......', '.#####.', '.......', '.......', '.......', '.......', '.......'],
  '×': ['.......', '.......', '.......', '#.....#', '.#...#.', '..#.#..', '...#...', '..#.#..', '.#...#.', '#.....#', '.......'],
};

const midCache = new Map<string, HTMLCanvasElement>();

function midGlyph(ch: string, color: string): HTMLCanvasElement | null {
  const rows = MID[ch];
  if (!rows) return null;
  const key = ch + color;
  let c = midCache.get(key);
  if (!c) {
    const [cv, ctx] = makeCanvas(7, 11);
    ctx.fillStyle = color;
    for (let y = 0; y < 11; y++) for (let x = 0; x < 7; x++) if (rows[y][x] === '#') ctx.fillRect(x, y, 1, 1);
    c = cv;
    midCache.set(key, c);
  }
  return c;
}

/** Width of `s` in the 7×11 numerals (8px a glyph, 1px apart). */
export function numeralsWidth(s: string): number {
  let w = 0;
  for (const ch of s) w += ch === ' ' ? 4 : 8;
  return Math.max(0, w - 1);
}

/**
 * Draw 7×11 numerals. `y` is the top of a 16px text line (same as g.text),
 * so they stand on the same baseline as the labels beside them.
 */
export function drawNumerals(g: Gfx, s: string, x: number, y: number, o: { color?: string; align?: 'left' | 'center' | 'right' } = {}): number {
  const color = o.color ?? '#2A2440';
  const w = numeralsWidth(s);
  let cx = Math.round(o.align === 'center' ? x - w / 2 : o.align === 'right' ? x - w : x);
  const cy = Math.round(y) + 3;
  for (const ch of s) {
    const img = midGlyph(ch, color);
    if (img) g.ctx.drawImage(img, cx, cy);
    cx += ch === ' ' ? 4 : 8;
  }
  return w;
}
