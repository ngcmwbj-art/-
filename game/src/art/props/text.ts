// Lettering for signs, posters and road markings (30_level_art 6.2 / 7.9).
//
// - fontText(): DotGothic16 glyphs (16px, 1-bit) blitted into a PixelCanvas,
//   for the big readable shop names (ひのや, 交番, ユウナリ...).
// - fontTextSmall(): the same glyphs box-sampled down to 8px (bold), for
//   small kana on boards.
// - handGlyph(): hand-made pixel glyphs (肉, 豆, 銀...).
// - tiny(): 3×5 latin/digit font (KOBAN, 17:00, COIN LAUNDRY).
// - scribble(): "text-like strokes" where reading is not needed.

import { glyphImage, charWidth } from '../../engine/font';
import type { PixelCanvas } from '../../engine/pixel';
import { ihash } from '../tiles/noise';

const maskCache = new Map<string, { w: number; h: number; bits: Uint8Array; adv: number }>();

/** 1-bit mask of a DotGothic16 glyph (18×18 cell). */
function glyphMask(ch: string): { w: number; h: number; bits: Uint8Array; adv: number } {
  let m = maskCache.get(ch);
  if (m) return m;
  const img = glyphImage(ch, '#ffffff');
  const ctx = img.getContext('2d')!;
  const d = ctx.getImageData(0, 0, img.width, img.height).data;
  const bits = new Uint8Array(img.width * img.height);
  for (let i = 0; i < bits.length; i++) bits[i] = d[i * 4 + 3] > 127 ? 1 : 0;
  m = { w: img.width, h: img.height, bits, adv: charWidth(ch) };
  maskCache.set(ch, m);
  return m;
}

export interface TextStyle {
  /** 1px shadow (down-right). */
  shadow?: string;
  /** 1px outline on 4 sides. */
  outline?: string;
  spacing?: number;
}

/** Width in px of a DotGothic16 string. */
export function fontWidth(s: string, spacing = 0): number {
  let w = 0;
  for (const ch of s) w += glyphMask(ch).adv + spacing;
  return s.length ? w - spacing : 0;
}

/** Tight vertical extent [top, bottom] of the glyph pixels of a string. */
function fontRows(s: string): [number, number] {
  let top = 99;
  let bot = -1;
  for (const ch of s) {
    const m = glyphMask(ch);
    for (let y = 0; y < m.h; y++)
      for (let x = 0; x < m.w; x++)
        if (m.bits[y * m.w + x]) {
          top = Math.min(top, y);
          bot = Math.max(bot, y);
        }
  }
  return top > bot ? [0, 0] : [top, bot];
}

/**
 * Draw DotGothic16 text with its visible top at (x, y). Returns the width.
 */
export function fontText(p: PixelCanvas, s: string, x: number, y: number, color: string, st: TextStyle = {}): number {
  const [top] = fontRows(s);
  const put = (ox: number, oy: number, c: string) => {
    let cx = x + ox;
    for (const ch of s) {
      const m = glyphMask(ch);
      for (let j = 0; j < m.h; j++)
        for (let i = 0; i < m.w; i++) if (m.bits[j * m.w + i]) p.set(cx + i, y + oy + j - top, c);
      cx += m.adv + (st.spacing ?? 0);
    }
  };
  if (st.outline) for (const [ox, oy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) put(ox, oy, st.outline);
  if (st.shadow) put(1, 1, st.shadow);
  put(0, 0, color);
  return fontWidth(s, st.spacing ?? 0);
}

/** Visible height of a DotGothic16 string. */
export function fontHeight(s: string): number {
  const [t, b] = fontRows(s);
  return b - t + 1;
}

/**
 * Half-size text: each 2×2 block of the 16px glyph becomes one pixel if at
 * least `thr` of its 4 pixels are set (thr 1 = bold, 2 = regular).
 */
export function fontTextSmall(p: PixelCanvas, s: string, x: number, y: number, color: string, thr = 1, st: TextStyle = {}): number {
  const [top] = fontRows(s);
  const cells: [number, number][] = [];
  let cx = 0;
  for (const ch of s) {
    const m = glyphMask(ch);
    for (let j = top; j < m.h; j += 2)
      for (let i = 0; i < m.w; i += 2) {
        let n = 0;
        for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) n += m.bits[(j + dy) * m.w + i + dx] ?? 0;
        if (n >= thr) cells.push([cx + i / 2, (j - top) / 2]);
      }
    cx += Math.ceil(m.adv / 2) + (st.spacing ?? 0);
  }
  const put = (ox: number, oy: number, c: string) => {
    for (const [i, j] of cells) p.set(x + ox + i, y + oy + j, c);
  };
  if (st.outline) for (const [ox, oy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) put(ox, oy, st.outline);
  if (st.shadow) put(1, 1, st.shadow);
  put(0, 0, color);
  return cx;
}

export function fontSmallWidth(s: string, spacing = 0): number {
  let w = 0;
  for (const ch of s) w += Math.ceil(glyphMask(ch).adv / 2) + spacing;
  return w;
}

// ---- hand glyphs ------------------------------------------------------------------

const HAND: Record<string, string[]> = {
  // 12×12 big 肉 for the butcher (6.2)
  肉: [
    '.....##.....',
    '############',
    '##...##...##',
    '##..####..##',
    '##.##..##.##',
    '####....####',
    '##...##...##',
    '##..####..##',
    '##.##..##.##',
    '####....####',
    '##........##',
    '##......####',
  ],
  // 8×8 豆 for the tofu noren
  豆: [
    '########',
    '........',
    '.######.',
    '.#....#.',
    '.######.',
    '..#..#..',
    '.#....#.',
    '########',
  ],
  // 7×7 銀 for the lantern
  銀: [
    '.#..###',
    '###.#.#',
    '.#..###',
    '###.#.#',
    '.#..##.',
    '.#.#.#.',
    '###.#.#',
  ],
  // 7×7 夕
  夕: [
    '..#....',
    '.#####.',
    '#....#.',
    '.#..#..',
    '..##...',
    '..#....',
    '##.....',
  ],
  // 6×6 ×
  batsu: ['#....#', '.#..#.', '..##..', '..##..', '.#..#.', '#....#'],
  // 7×5 arrow →
  arrowR: ['...#...', '....#..', '#######', '....#..', '...#...'],
  // bell emblem 9×9
  bell: [
    '...###...',
    '..#####..',
    '.#######.',
    '.#######.',
    '.#######.',
    '#########',
    '#########',
    '....#....',
    '...###...',
  ],
  // ---- readable sign lettering (review round 1: DotGothic16 drops strokes of
  // 交 and turns ユ/ナ into コ/十 at this size, so the signs people must read
  // are hand-set). 14px cap height, 1px strokes for 交番, 2px for the mall.
  交: [
    '......##......',
    '##############',
    '....#....#....',
    '...#......#...',
    '..#........#..',
    '.#..##..##..#.',
    '.....#..#.....',
    '......##......',
    '......##......',
    '.....#..#.....',
    '....#....#....',
    '..##......##..',
    '##..........##',
  ],
  番: [
    '..........###.',
    '...#######....',
    '...#...#...#..',
    '##############',
    '......###.....',
    '....##.#.##...',
    '..##...#...##.',
    '..###########.',
    '..#....#....#.',
    '..###########.',
    '..#....#....#.',
    '..#....#....#.',
    '..###########.',
  ],
  ユ: [
    '..............',
    '.##########...',
    '.##########...',
    '.........##...',
    '.........##...',
    '.........##...',
    '.........##...',
    '.........##...',
    '.........##...',
    '##############',
    '##############',
    '..............',
    '..............',
  ],
  ウ: [
    '......##......',
    '......##......',
    '.############.',
    '.############.',
    '.##........##.',
    '.##........##.',
    '...........##.',
    '..........##..',
    '.........##...',
    '........##....',
    '......###.....',
    '....###.......',
    '..###.........',
  ],
  ナ: [
    '.......##.....',
    '.......##.....',
    '##############',
    '##############',
    '.......##.....',
    '.......##.....',
    '.......##.....',
    '......##......',
    '......##......',
    '.....##.......',
    '....##........',
    '..###.........',
    '.##...........',
  ],
  リ: [
    '.##.......##..',
    '.##.......##..',
    '.##.......##..',
    '.##.......##..',
    '.##.......##..',
    '.##.......##..',
    '.##.......##..',
    '..........##..',
    '.........##...',
    '........###...',
    '......###.....',
    '....###.......',
    '..###.........',
  ],
  // 7×8 destination-sign glyphs for the night train (星見台)
  星: [
    '.#####.',
    '.#...#.',
    '.#####.',
    '.#.#...',
    '.#####.',
    '...#...',
    '..###..',
    '#######',
  ],
  見: [
    '.#####.',
    '.#...#.',
    '.#####.',
    '.#...#.',
    '.#####.',
    '..#.#..',
    '.#..#.#',
    '#...##.',
  ],
  台: [
    '...#...',
    '..#....',
    '.#..#..',
    '#######',
    '.......',
    '.#####.',
    '.#...#.',
    '.#####.',
  ],
  // 9×10 shop-sign glyphs (写真館 on the photo studio)
  写: [
    '#########',
    '#.......#',
    '.........',
    '.#######.',
    '.#.......',
    '.#######.',
    '........#',
    '#########',
    '.......#.',
    '.....##..',
  ],
  真: [
    '....#....',
    '.#######.',
    '....#....',
    '..#####..',
    '..#...#..',
    '..#####..',
    '..#...#..',
    '#########',
    '..#...#..',
    '.#.....#.',
  ],
  館: [
    '.#....#..',
    '#.#.#####',
    '.#..#...#',
    '###..###.',
    '#.#..#...',
    '###..####',
    '#.#..#..#',
    '###..####',
    '#.#..#...',
    '#..#.#...',
  ],
  // 2×8 exclamation for small balloons (matches the bold half-size kana)
  excl: ['##', '##', '##', '##', '#.', '..', '##', '##'],
  // hanamaru (flower circle) 9×9
  hanamaru: [
    '.##.#.##.',
    '#..###..#',
    '#.#...#.#',
    '.#.....#.',
    '##.....##',
    '.#.....#.',
    '#.#...#.#',
    '#..###..#',
    '.##.#.##.',
  ],
};

export function handGlyph(p: PixelCanvas, name: string, x: number, y: number, color: string, shadow?: string): void {
  const rows = HAND[name];
  if (!rows) return;
  if (shadow)
    for (let j = 0; j < rows.length; j++)
      for (let i = 0; i < rows[j].length; i++) if (rows[j][i] === '#') p.set(x + i + 1, y + j + 1, shadow);
  for (let j = 0; j < rows.length; j++)
    for (let i = 0; i < rows[j].length; i++) if (rows[j][i] === '#') p.set(x + i, y + j, color);
}

/** A row of hand glyphs; returns the width. */
export function handText(p: PixelCanvas, s: string, x: number, y: number, color: string, st: TextStyle = {}): number {
  const gap = st.spacing ?? 2;
  const put = (ox: number, oy: number, c: string) => {
    let cx = x + ox;
    for (const ch of s) {
      handGlyph(p, ch, cx, y + oy, c);
      cx += handSize(ch)[0] + gap;
    }
  };
  if (st.outline) for (const [ox, oy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, 1], [1, -1], [-1, 1]]) put(ox, oy, st.outline);
  if (st.shadow) put(1, 1, st.shadow);
  put(0, 0, color);
  let w = 0;
  for (const ch of s) w += handSize(ch)[0] + gap;
  return s.length ? w - gap : 0;
}

export function handSize(name: string): [number, number] {
  const r = HAND[name];
  return r ? [r[0].length, r.length] : [0, 0];
}

// ---- 3×5 tiny font ------------------------------------------------------------------

const TINY: Record<string, string> = {
  A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110', E: '111100110100111',
  F: '111100110100100', G: '011100101101011', H: '101101111101101', I: '111010010010111', J: '001001001101010',
  K: '101101110101101', L: '100100100100111', M: '101111111101101', N: '110101101101101', O: '010101101101010',
  P: '110101110100100', Q: '010101101110011', R: '110101110101101', S: '011100010001110', T: '111010010010010',
  U: '101101101101111', V: '101101101101010', W: '101101111111101', X: '101101010101101', Y: '101101010010010',
  Z: '111001010100111',
  '0': '111101101101111', '1': '010110010010111', '2': '110001010100111', '3': '110001010001110',
  '4': '101101111001001', '5': '111100110001110', '6': '011100111101111', '7': '111001010010010',
  '8': '111101111101111', '9': '111101111001110',
  ':': '000010000010000', '-': '000000111000000', '.': '000000000000010', '/': '001001010100100',
  '!': '010010010000010', '¥': '101010111010010', ' ': '000000000000000', '+': '000010111010000',
};

export function tiny(p: PixelCanvas, s: string, x: number, y: number, color: string, shadow?: string, spacing = 1): number {
  const draw = (ox: number, oy: number, c: string) => {
    let cx = x + ox;
    for (const ch of s.toUpperCase()) {
      const m = TINY[ch] ?? TINY[' '];
      for (let j = 0; j < 5; j++) for (let i = 0; i < 3; i++) if (m[j * 3 + i] === '1') p.set(cx + i, y + oy + j, c);
      cx += 3 + spacing;
    }
  };
  if (shadow) draw(1, 1, shadow);
  draw(0, 0, color);
  return tinyWidth(s, spacing);
}

export function tinyWidth(s: string, spacing = 1): number {
  return s.length ? s.length * (3 + spacing) - spacing : 0;
}

/** 7-segment style LED digits (3×5) for vending machines, pay machines, clocks. */
export function led(p: PixelCanvas, s: string, x: number, y: number, color: string): void {
  tiny(p, s, x, y, color, undefined, 1);
}

// ---- scribbles ------------------------------------------------------------------------

/**
 * Kanji-like strokes: `n` characters of size `cs`×`cs` starting at (x,y),
 * advancing right (or down when vertical). Deterministic per seed.
 */
export function scribble(p: PixelCanvas, x: number, y: number, n: number, color: string, seed: number, cs = 5, vertical = false): void {
  for (let k = 0; k < n; k++) {
    const ox = vertical ? x : x + k * (cs + 1);
    const oy = vertical ? y + k * (cs + 1) : y;
    const h = ihash(k, seed, 911);
    // a horizontal, a vertical and one or two diagonals / boxes
    const hy = (h % (cs - 1));
    p.hline(ox, ox + cs - 1, oy + hy, color);
    const vx = (h >>> 4) % cs;
    p.vline(ox + vx, oy, oy + cs - 1, color);
    const kind = (h >>> 8) % 4;
    if (kind === 0) p.strokeRect(ox + 1, oy + 1, cs - 2, cs - 2, color);
    else if (kind === 1) p.line(ox, oy + cs - 1, ox + Math.floor(cs / 2), oy + Math.floor(cs / 2), color);
    else if (kind === 2) p.hline(ox, ox + cs - 1, oy + cs - 1, color);
    else p.line(ox + cs - 1, oy + cs - 1, ox + Math.floor(cs / 2), oy + 1, color);
  }
}

/** Short horizontal text-lines (small print on posters / notices). */
export function printLines(p: PixelCanvas, x: number, y: number, w: number, rows: number, color: string, seed: number, gap = 2): void {
  for (let r = 0; r < rows; r++) {
    const h = ihash(r, seed, 913);
    const len = Math.max(2, w - (h % Math.max(1, Math.floor(w / 3))));
    let cx = x;
    while (cx < x + len) {
      const seg = 1 + ((ihash(cx, r + seed, 917) >>> 3) % 3);
      p.hline(cx, Math.min(x + len - 1, cx + seg - 1), y + r * gap, color);
      cx += seg + 1;
    }
  }
}
