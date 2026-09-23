// Crisp pixel text: DotGothic16 rendered once per glyph at 16px, alpha
// thresholded to 1-bit, then cached per color. Full-width glyphs advance
// 16px, half-width 8px. Everything lands on the integer pixel grid.

import { makeCanvas } from './pixel';

export const FONT_FAMILY = 'GameFont';
export const FONT_PX = 16;
/** Recommended distance between text lines. */
export const LINE_H = 18;
// Integer baseline: glyphs occupy rows 0..14 of the cell (descenders to 15).
const BASELINE = 14;
const ALPHA_CUT = 190;
const CELL = 18;

interface Glyph {
  mask: HTMLCanvasElement;
  adv: number;
  colored: Map<string, HTMLCanvasElement>;
}

const cache = new Map<string, Glyph>();
let loaded = false;

export async function loadFont(url: string): Promise<void> {
  const ff = new FontFace(FONT_FAMILY, `url(${url})`);
  await ff.load();
  document.fonts.add(ff);
  loaded = true;
  cache.clear();
  calibrate();
}

export function fontReady(): boolean {
  return loaded;
}

// DotGothic16 is a "dot style" outline font whose pixel grid does not sit on
// the canvas grid at 16px (strokes straddle two rows/columns). We rasterize
// at 4x, then average each 4x4 block using a global grid phase that is
// calibrated once so that sample glyphs come out as close to pure 0/1
// coverage as possible, and threshold at half coverage.
const OS = 4;
const BIG = (CELL + 2) * OS;
const bigC = document.createElement('canvas');
bigC.width = BIG;
bigC.height = BIG;
const bigCtx = bigC.getContext('2d', { willReadFrequently: true })!;
let phaseX = 0;
let phaseY = 0;

function raster4x(ch: string): Uint8ClampedArray {
  const b = bigCtx;
  b.clearRect(0, 0, BIG, BIG);
  b.font = `${FONT_PX * OS}px ${FONT_FAMILY}`;
  b.textBaseline = 'alphabetic';
  b.fillStyle = '#fff';
  b.fillText(ch, OS, (BASELINE + 1) * OS);
  return b.getImageData(0, 0, BIG, BIG).data;
}

function coverage(src: Uint8ClampedArray, px: number, py: number, col: number, row: number): number {
  let sum = 0;
  const x0 = OS + col * OS + px;
  const y0 = OS + row * OS + py;
  for (let y = y0; y < y0 + OS; y++) for (let x = x0; x < x0 + OS; x++) sum += src[(y * BIG + x) * 4 + 3];
  return sum / (OS * OS * 255);
}

/** Find the grid phase that makes sample glyphs most "binary". */
function calibrate(): void {
  const samples = 'あはこ漢字町動機ゆぐれ「」！？ABgy';
  const rasters = [...samples].map(raster4x);
  let best = Infinity;
  for (let py = -2; py <= 2; py++)
    for (let px = -2; px <= 2; px++) {
      let amb = 0;
      for (const r of rasters)
        for (let row = 0; row < CELL; row++)
          for (let col = 0; col < CELL; col++) {
            const c = coverage(r, px, py, col, row);
            amb += Math.min(c, 1 - c);
          }
      if (amb < best) {
        best = amb;
        phaseX = px;
        phaseY = py;
      }
    }
}

function build(ch: string): Glyph {
  const [c, ctx] = makeCanvas(CELL, CELL);
  const src = raster4x(ch);
  const img = ctx.createImageData(CELL, CELL);
  const d = img.data;
  for (let row = 0; row < CELL; row++)
    for (let col = 0; col < CELL; col++) {
      const i = (row * CELL + col) * 4;
      d[i] = d[i + 1] = d[i + 2] = 255;
      d[i + 3] = coverage(src, phaseX, phaseY, col, row) >= 0.56 ? 255 : 0;
    }
  ctx.putImageData(img, 0, 0);
  const b = bigCtx;
  b.font = `${FONT_PX}px ${FONT_FAMILY}`;
  const w = b.measureText(ch).width;
  const adv = ch === ' ' ? 4 : ch === '　' ? 16 : Math.round(w) || (ch.charCodeAt(0) < 0x2000 ? 8 : 16);
  return { mask: c, adv, colored: new Map() };
}

function get(ch: string): Glyph {
  let g = cache.get(ch);
  if (!g) {
    g = build(ch);
    cache.set(ch, g);
  }
  return g;
}

/** Glyph image tinted to `color` (cached). */
export function glyphImage(ch: string, color: string): HTMLCanvasElement {
  const g = get(ch);
  let img = g.colored.get(color);
  if (!img) {
    const [c, ctx] = makeCanvas(CELL, CELL);
    ctx.drawImage(g.mask, 0, 0);
    ctx.globalCompositeOperation = 'source-in';
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, CELL, CELL);
    img = c;
    g.colored.set(color, img);
  }
  return img;
}

export function charWidth(ch: string): number {
  return get(ch).adv;
}

export function measure(str: string, spacing = 0): number {
  let w = 0;
  for (const ch of str) w += charWidth(ch) + spacing;
  return str.length ? w - spacing : 0;
}

export interface TextOpts {
  color?: string;
  /** Drop shadow color (1px down-right). */
  shadow?: string;
  /** 1px outline color on all 8 sides. */
  outline?: string;
  align?: 'left' | 'center' | 'right';
  spacing?: number;
  alpha?: number;
}

/** Draw a glyph at integer position. */
export function drawGlyph(ctx: CanvasRenderingContext2D, ch: string, x: number, y: number, color: string): void {
  if (ch === ' ' || ch === '　') return;
  ctx.drawImage(glyphImage(ch, color), Math.round(x), Math.round(y));
}

/** Draw a single line of text (no wrapping). Returns the drawn width. */
export function drawText(ctx: CanvasRenderingContext2D, str: string, x: number, y: number, o: TextOpts = {}): number {
  const color = o.color ?? '#ffffff';
  const spacing = o.spacing ?? 0;
  const w = measure(str, spacing);
  let cx = Math.round(o.align === 'center' ? x - w / 2 : o.align === 'right' ? x - w : x);
  const cy = Math.round(y);
  const prevA = ctx.globalAlpha;
  if (o.alpha !== undefined) ctx.globalAlpha = prevA * o.alpha;
  for (const ch of str) {
    if (o.outline) {
      for (let oy = -1; oy <= 1; oy++)
        for (let ox = -1; ox <= 1; ox++) if (ox || oy) drawGlyph(ctx, ch, cx + ox, cy + oy, o.outline);
    }
    if (o.shadow) drawGlyph(ctx, ch, cx + 1, cy + 1, o.shadow);
    drawGlyph(ctx, ch, cx, cy, color);
    cx += charWidth(ch) + spacing;
  }
  ctx.globalAlpha = prevA;
  return w;
}

// Characters that must not start a line (Japanese kinsoku shori).
const NO_START = new Set(
  '、。，．,.・：；？！?!ー―‐）)」』】〕〉》’”…〜ぁぃぅぇぉっゃゅょゎァィゥェォッャュョヮヵヶ♪'.split(''),
);
// Characters that must not end a line.
const NO_END = new Set('（(「『【〔〈《‘“'.split(''));

/**
 * Word-wrap to maxW pixels. Honors '\n'. ASCII words are kept whole,
 * Japanese breaks between any characters with kinsoku (closing punctuation
 * may hang one character past the margin).
 */
export function wrap(str: string, maxW: number): string[] {
  const out: string[] = [];
  for (const para of str.split('\n')) {
    const tokens = para.match(/[A-Za-z0-9'’\-]+ ?|./gu) ?? [];
    let line = '';
    let lw = 0;
    for (let i = 0; i < tokens.length; i++) {
      const t = tokens[i];
      const tw = measure(t);
      if (lw + tw > maxW && line.length > 0) {
        if (NO_START.has(t[0]) && lw + tw <= maxW + 16) {
          line += t;
          lw += tw;
          continue;
        }
        // Don't leave an opening bracket at the end of a line.
        let carry = '';
        while (line.length > 1 && NO_END.has(line[line.length - 1])) {
          carry = line[line.length - 1] + carry;
          line = line.slice(0, -1);
        }
        out.push(line.replace(/ +$/, ''));
        line = carry + t.replace(/^ +/, '');
        lw = measure(line);
      } else {
        line += t;
        lw += tw;
      }
    }
    out.push(line);
  }
  return out;
}

/** Warm the glyph cache (avoids first-draw hitches in dialog). */
export function warmGlyphs(text: string): void {
  for (const ch of new Set(text)) get(ch);
}
