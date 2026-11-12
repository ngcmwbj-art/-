// Pixel-art helpers for props and buildings: shaded boxes, selective
// outlines (#2A2440 on the bottom/right, a darker own-colour on top/left),
// broken left rim light, palette ramps.

import { PixelCanvas, rgba32, type Color } from '../../engine/pixel';
import { P } from '../tiles/palette';

export { PixelCanvas };

/** One step darker along a hue-shifted (towards purple) ramp. */
const DOWN: Record<string, string> = {
  [P.glint]: P.horizon, [P.horizon]: P.goldPale, [P.sky]: P.sun, [P.sun]: P.sunDeep, [P.sunDeep]: P.sunShade,
  [P.peach]: P.sunShade, [P.crimson]: P.sunShade, [P.sunShade]: P.shadeDeep, [P.lilac]: P.shade,
  [P.shade]: P.shadeDeep, [P.shadeDeep]: P.nightShade, [P.nightShade]: P.ink, [P.ink]: P.night, [P.night]: P.void,
  [P.white]: P.concreteLt, [P.concreteLt]: P.concrete, [P.concrete]: P.steel, [P.steel]: P.asphalt,
  [P.asphalt]: P.charcoal, [P.charcoal]: P.ink, [P.leafLt]: P.leafYoung, [P.leafYoung]: P.leaf, [P.leaf]: P.leafDeep,
  [P.leafDeep]: P.leafShade, [P.leafShade]: P.ink, [P.vermLt]: P.verm, [P.red]: P.verm, [P.verm]: P.vermShade,
  [P.vermShade]: P.maroon, [P.maroon]: P.nightShade, [P.gold]: P.brass, [P.goldPale]: P.brass, [P.brass]: P.brassOld,
  [P.brassOld]: P.wood, [P.woodLt]: P.brassOld, [P.wood]: P.woodDark, [P.woodDark]: P.ink, [P.glow]: P.blue,
  [P.aqua]: P.blue, [P.blue]: P.navy, [P.navy]: P.nightShade, [P.skin1]: P.skin2, [P.skin2]: P.skin3,
  [P.skin3]: P.skin4, [P.skin4]: P.wood, [P.paper]: P.paperGrid, [P.paperGrid]: P.woodLt,
};
const UP: Record<string, string> = {};
for (const [k, v] of Object.entries(DOWN)) if (!UP[v]) UP[v] = k;
UP[P.concrete] = P.concreteLt;
UP[P.concreteLt] = P.white;
UP[P.white] = P.glint;
UP[P.steel] = P.concrete;
UP[P.asphalt] = P.steel;
UP[P.leaf] = P.leafYoung;
UP[P.leafYoung] = P.leafLt;
UP[P.verm] = P.vermLt;
UP[P.brass] = P.goldPale;
UP[P.wood] = P.woodLt;
UP[P.navy] = P.blue;
UP[P.blue] = P.aqua;

export function dk(c: string, n = 1): string {
  let r = c.toUpperCase();
  for (let i = 0; i < n; i++) r = DOWN[r] ?? r;
  return r;
}
export function lt(c: string, n = 1): string {
  let r = c.toUpperCase();
  for (let i = 0; i < n; i++) r = UP[r] ?? r;
  return r;
}

// reverse lookup rgba32 → hex for palette colours (for outline decisions)
const HEX_OF = new Map<number, string>();
for (const v of Object.values(P)) HEX_OF.set(rgba32(v), v.toUpperCase());
export function hexAt(p: PixelCanvas, x: number, y: number): string | null {
  const v = p.get(x, y);
  if (v >>> 24 === 0) return null;
  return HEX_OF.get(v) ?? null;
}

export function pc(w: number, h: number): PixelCanvas {
  return new PixelCanvas(w, h);
}

/** Shaded box: lit top row + left column, dark bottom row + right column. */
export function box(
  p: PixelCanvas,
  x: number,
  y: number,
  w: number,
  h: number,
  base: Color,
  light: Color = lt(base),
  dark: Color = dk(base),
): void {
  p.rect(x, y, w, h, base);
  p.hline(x, x + w - 1, y, light);
  p.vline(x, y, y + h - 1, light);
  p.hline(x, x + w - 1, y + h - 1, dark);
  p.vline(x + w - 1, y + 1, y + h - 1, dark);
}

/**
 * Selective outline (7.5): outline pixels below/right of the shape use the
 * ink colour, outline pixels above/left use one step darker than the fill
 * they touch. `ground` controls whether the bottom edge is drawn.
 */
export function outline(p: PixelCanvas, opts: { ink?: string; bottom?: boolean; soft?: boolean } = {}): void {
  const ink = rgba32(opts.ink ?? P.ink);
  const src = p.data.slice();
  const W = p.w;
  const H = p.h;
  const op = (x: number, y: number) => x >= 0 && y >= 0 && x < W && y < H && src[y * W + x] >>> 24 !== 0;
  const col = (x: number, y: number) => src[y * W + x];
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (op(x, y)) continue;
      // neighbour that is part of the shape
      if (op(x, y - 1) || op(x - 1, y)) {
        // we are below or right of the shape → ink
        if (!opts.bottom && op(x, y - 1) && !op(x - 1, y) && !op(x + 1, y) && y === H - 1) continue;
        p.data[y * W + x] = ink;
      } else if (op(x, y + 1) || op(x + 1, y)) {
        const n = op(x, y + 1) ? col(x, y + 1) : col(x + 1, y);
        const hx = HEX_OF.get(n);
        p.data[y * W + x] = opts.soft ? rgba32(dk(hx ?? P.charcoal, 1)) : rgba32(dk(hx ?? P.charcoal, 2));
      }
    }
  p.toCanvas();
}

/** Broken rim light on the left (sun-facing) edge. */
export function rim(p: PixelCanvas, color: string = P.sun, every = 3, len = 2): void {
  const c = rgba32(color);
  const src = p.data.slice();
  const W = p.w;
  const op = (x: number, y: number) => x >= 0 && y >= 0 && x < W && y < p.h && src[y * W + x] >>> 24 !== 0;
  for (let y = 0; y < p.h; y++) {
    if (y % every >= len) continue;
    for (let x = 0; x < W; x++) {
      if (!op(x, y)) continue;
      if (!op(x - 1, y)) {
        // skip ink outline pixels
        if (src[y * W + x] === rgba32(P.ink)) {
          if (op(x + 1, y)) p.data[y * W + x + 1] = c;
        } else p.data[y * W + x] = c;
        break;
      }
    }
  }
}

/** Ordered 2×2 checker dither between two colours inside a rect (large gradients only). */
export function checker(p: PixelCanvas, x: number, y: number, w: number, h: number, c: Color, phase = 0): void {
  for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (((i + j + phase) & 1) === 0) p.set(i, j, c);
}

/** Vertical gradient in bands (no dithering) through the given colours. */
export function bands(p: PixelCanvas, x: number, y: number, w: number, h: number, cols: Color[]): void {
  for (let j = 0; j < h; j++) {
    const k = Math.min(cols.length - 1, Math.floor((j / h) * cols.length));
    p.hline(x, x + w - 1, y + j, cols[k]);
  }
}

/** Copy a PixelCanvas and return its canvas (convenience). */
export function cv(p: PixelCanvas): HTMLCanvasElement {
  return p.toCanvas();
}

/** Stamp pixel rows (' ' / '.' transparent). */
export function stamp(p: PixelCanvas, rows: string[], pal: Record<string, Color>, x: number, y: number, flip = false): void {
  p.art(rows, pal, x, y, flip);
}

/** Draw a 1px line of dots every `step` px. */
export function dotted(p: PixelCanvas, x0: number, y: number, x1: number, c: Color, step = 2): void {
  for (let x = x0; x <= x1; x += step) p.set(x, y, c);
}

/** Make a mask canvas (opaque white where fn is true) for glass reflections. */
export function maskOf(w: number, h: number, fn: (x: number, y: number) => boolean): HTMLCanvasElement {
  const m = new PixelCanvas(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (fn(x, y)) m.set(x, y, '#ffffff');
  return m.toCanvas();
}

/** Build a glass mask from all pixels of the given colour in p. */
export function maskColor(p: PixelCanvas, colors: string[]): HTMLCanvasElement {
  const set = new Set(colors.map((c) => rgba32(c)));
  return maskOf(p.w, p.h, (x, y) => set.has(p.get(x, y)));
}

// ---- shading helpers (buildings & props) ------------------------------------------

/** Darken every opaque pixel of a rect by `steps` along the palette ramp. */
export function shadeRect(p: PixelCanvas, x: number, y: number, w: number, h: number, steps = 1, pred?: (x: number, y: number) => boolean): void {
  for (let j = y; j < y + h; j++)
    for (let i = x; i < x + w; i++) {
      if (!p.inside(i, j) || p.alpha(i, j) === 0) continue;
      if (pred && !pred(i, j)) continue;
      const hx = hexAt(p, i, j);
      if (hx) p.set(i, j, dk(hx, steps));
    }
}

/** Lighten every opaque pixel of a rect by `steps`. */
export function lightRect(p: PixelCanvas, x: number, y: number, w: number, h: number, steps = 1, pred?: (x: number, y: number) => boolean): void {
  for (let j = y; j < y + h; j++)
    for (let i = x; i < x + w; i++) {
      if (!p.inside(i, j) || p.alpha(i, j) === 0) continue;
      if (pred && !pred(i, j)) continue;
      const hx = hexAt(p, i, j);
      if (hx) p.set(i, j, lt(hx, steps));
    }
}

/**
 * Sun-lit wall (7.4): the left third of a south wall one step lighter, the
 * border softened with a 2px checker.
 */
export function sunWash(p: PixelCanvas, x: number, y: number, w: number, h: number, frac = 1 / 3): void {
  const edge = x + Math.round(w * frac);
  lightRect(p, x, y, edge - x, h);
  lightRect(p, edge, y, 2, h, 1, (i, j) => ((i + j) & 1) === 0);
}

/** Short shadow thrown right (and 1px down) onto a wall by a protrusion (7.4). */
export function castRight(p: PixelCanvas, x: number, y: number, w: number, h: number, len = 3, clip?: [number, number, number, number]): void {
  const inClip = (i: number, j: number) => !clip || (i >= clip[0] && j >= clip[1] && i < clip[0] + clip[2] && j < clip[1] + clip[3]);
  for (let j = y + 1; j <= y + h; j++)
    for (let i = x + w; i < x + w + len; i++) if (inClip(i, j)) shadeRect(p, i, j, 1, 1);
  for (let i = x + 1; i < x + w; i++) if (inClip(i, y + h)) shadeRect(p, i, y + h, 1, 1);
}

/** Eave / awning shadow band on the wall below (2px, 7.4). */
export function eaveShadow(p: PixelCanvas, x: number, y: number, w: number, rows = 2): void {
  shadeRect(p, x, y, w, rows, 1);
  if (rows > 0) shadeRect(p, x, y, w, 1, 1);
}

/** Glass pane: dark interior with a lit frame edge; marks the reflection mask. */
export function glassPane(
  p: PixelCanvas,
  mask: PixelCanvas | null,
  x: number,
  y: number,
  w: number,
  h: number,
  opts: { base?: string; frame?: string; curtain?: string; curtainSide?: 'l' | 'r' | 'both'; glint?: boolean; interior?: string } = {},
): void {
  const base = opts.base ?? P.shadeDeep;
  p.rect(x, y, w, h, base);
  if (opts.interior) p.rect(x, y + Math.floor(h / 2), w, Math.ceil(h / 2), opts.interior);
  if (opts.curtain) {
    const cw = Math.max(2, Math.floor(w / 3));
    if (opts.curtainSide !== 'r') {
      p.rect(x, y, cw, h, opts.curtain);
      p.vline(x + cw - 1, y, y + h - 1, dk(opts.curtain));
    }
    if (opts.curtainSide === 'r' || opts.curtainSide === 'both') {
      p.rect(x + w - cw, y, cw, h, opts.curtain);
      p.vline(x + w - cw, y, y + h - 1, dk(opts.curtain));
    }
  }
  if (mask) for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) mask.set(i, j, '#ffffff');
  if (opts.glint !== false) {
    // two diagonal glints
    for (let k = 0; k < Math.min(w, h); k++) {
      const gx = x + 1 + k;
      const gy = y + h - 2 - k;
      if (gx < x + w && gy >= y && k < 4) p.set(gx, gy, P.glint);
    }
  }
  if (opts.frame) {
    p.strokeRect(x - 1, y - 1, w + 2, h + 2, opts.frame);
    p.hline(x - 1, x + w, y - 1, lt(opts.frame));
    p.vline(x - 1, y - 1, y + h, lt(opts.frame));
  }
}

/** Finishing pass for free-standing props: selective outline + broken rim light. */
export function finish(p: PixelCanvas, opts: { rim?: boolean; outline?: boolean; soft?: boolean; rimEvery?: number } = {}): PixelCanvas {
  if (opts.outline !== false) outline(p, { bottom: true, soft: opts.soft });
  if (opts.rim !== false) rim(p, P.sun, opts.rimEvery ?? 3, 2);
  return p;
}

/** Canvas with `pad` transparent pixels around (so outlines fit). */
export function padded(w: number, h: number): PixelCanvas {
  return new PixelCanvas(w, h);
}

/** Vertical cylinder shading across [x, x+w): light at left, dark at right. */
export function cylinder(p: PixelCanvas, x: number, y: number, w: number, h: number, base: string): void {
  for (let i = 0; i < w; i++) {
    const t = w <= 1 ? 0.5 : i / (w - 1);
    const c = t < 0.2 ? lt(base) : t > 0.75 ? dk(base) : base;
    p.vline(x + i, y, y + h - 1, c);
  }
}
