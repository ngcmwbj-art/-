// Building kit (30_level_art 6.2 / 7.4 / 7.5): roofs seen from above, south
// facades, windows, doors, awnings, noren and the per-building framework.
//
// A building is registered as a prop anchored at the top-left tile of its
// roof. The canvas covers W×(R+F) tiles plus `top` px of overhang above;
// its depth-sort foot is the bottom of the facade. Buildings do not cast
// long shadows: they paint a 12px band onto the ground east of them.

import type { Gfx } from '../../engine/gfx';
import { PixelCanvas } from '../../engine/pixel';
import { P } from '../tiles/palette';
import { fbm, h01, ihash, valueNoise } from '../tiles/noise';
import { castRight, dk, eaveShadow, glassPane, lt, shadeRect, sunWash } from './kit';
import { registerProp } from './registry';
import type { PropArt, PropEnv } from './types';
import { drawLight, drawLightAt, LIGHT, poolEllipse, poolTrapezoid } from './light';

export interface Bld {
  /** Width / roof rows / facade rows in tiles. */
  W: number;
  R: number;
  F: number;
  /** Extra px above the roof for antennas, rooftop signs. */
  top: number;
  p: PixelCanvas;
  mask: PixelCanvas;
  /** Canvas y of the roof top / facade top / bottom. */
  roofY: number;
  faceY: number;
  botY: number;
  w: number;
  /** Window rects lit at night (canvas px). */
  lights: [number, number, number, number][];
}

export function newBld(W: number, R: number, F: number, top = 0): Bld {
  const w = W * 16;
  const h = top + (R + F) * 16;
  return {
    W,
    R,
    F,
    top,
    p: new PixelCanvas(w, h),
    mask: new PixelCanvas(w, h),
    roofY: top,
    faceY: top + R * 16,
    botY: h,
    w,
    lights: [],
  };
}

// ---------------------------------------------------------------- roofs

export interface RoofPal {
  hi: string;
  base: string;
  lo: string;
  deep: string;
}

export const KAWARA_IBUSHI: RoofPal = { hi: P.steel, base: P.asphalt, lo: P.charcoal, deep: P.ink };
export const KAWARA_OLD: RoofPal = { hi: P.asphalt, base: P.charcoal, lo: P.ink, deep: P.night };

/**
 * Japanese tile roof: ridge band near the top third, convex tile rolls as
 * vertical ribs, courses every 5px, lit eave ends, onigawara at the ridge ends.
 */
export function roofKawara(p: PixelCanvas, x: number, y: number, w: number, h: number, pal: RoofPal, seed = 0, ridgeFrac = 0.26): void {
  const ry = y + Math.max(3, Math.round(h * ridgeFrac));
  // back slope (faces north): darker, short courses
  for (let j = y; j < ry; j++)
    for (let i = x; i < x + w; i++) {
      const lx = (i - x) % 6;
      const ly = (j - y) % 3;
      let c = pal.lo;
      if (lx === 1 && ly < 2) c = pal.base;
      if (ly === 2) c = pal.deep;
      p.set(i, j, c);
    }
  // front slope
  for (let j = ry + 4; j < y + h - 2; j++)
    for (let i = x; i < x + w; i++) {
      const cy = j - (ry + 4);
      const course = Math.floor(cy / 5);
      const ly = cy % 5;
      const off = course % 2 ? 3 : 0;
      const lx = (((i - x + off) % 6) + 6) % 6;
      let c = pal.base;
      if (lx === 1 || lx === 2) c = ly === 0 ? pal.hi : lx === 1 ? pal.hi : pal.base;
      if (lx === 4) c = pal.lo;
      if (lx === 5) c = ly >= 3 ? pal.deep : pal.lo;
      if (ly === 4) c = lx === 1 || lx === 2 ? pal.base : pal.deep;
      // weathering: a few lighter / mossy tiles
      const hh = ihash(Math.floor((i - x + off) / 6), course, 401 + seed);
      if (hh % 17 === 0 && (lx === 1 || lx === 2) && ly < 4) c = lt(pal.hi);
      if (hh % 29 === 0 && ly >= 2 && lx >= 3) c = P.leafShade;
      p.set(i, j, c);
    }
  // ridge (棟): 4px band
  for (let i = x; i < x + w; i++) {
    p.set(i, ry, pal.hi);
    p.set(i, ry + 1, lt(pal.hi));
    p.set(i, ry + 2, pal.base);
    p.set(i, ry + 3, pal.deep);
    if ((i - x) % 4 === 0) p.set(i, ry + 2, pal.lo);
  }
  // onigawara at both ends of the ridge
  for (const ex of [x, x + w - 6]) {
    p.rect(ex, ry - 2, 6, 7, pal.base);
    p.hline(ex, ex + 5, ry - 2, lt(pal.hi));
    p.vline(ex, ry - 2, ry + 4, pal.hi);
    p.vline(ex + 5, ry - 1, ry + 4, pal.deep);
    p.hline(ex + 1, ex + 5, ry + 4, pal.deep);
    p.set(ex + 2, ry, pal.deep);
    p.set(ex + 3, ry + 1, pal.deep);
    p.set(ex + 2, ry + 2, pal.lo);
  }
  // eave ends: lit tile ends + dark lip
  for (let i = x; i < x + w; i++) {
    const lx = (i - x) % 6;
    p.set(i, y + h - 2, lx === 1 || lx === 2 ? lt(pal.hi) : lx === 5 ? pal.lo : pal.hi);
    p.set(i, y + h - 1, pal.deep);
  }
  // verge boards (gable ends)
  for (let j = y; j < y + h; j++) {
    p.set(x, j, j % 3 === 0 ? P.sun : pal.hi);
    p.set(x + w - 1, j, pal.deep);
  }
}

/** Corrugated tin roof (トタン): vertical waves, overlap seams, rust. */
export function roofTin(
  p: PixelCanvas,
  x: number,
  y: number,
  w: number,
  h: number,
  pal: RoofPal,
  seed = 0,
  rust = 0.25,
): void {
  const ridge = y + 3;
  for (let j = y; j < y + h; j++)
    for (let i = x; i < x + w; i++) {
      const lx = (i - x) % 4;
      let c = lx === 0 ? pal.hi : lx === 3 ? pal.lo : pal.base;
      const sy = (j - ridge) % 18;
      if (j >= ridge && sy === 17) c = pal.deep;
      if (j >= ridge && sy === 0) c = lx === 3 ? pal.base : lt(pal.hi);
      if (j < ridge) c = j === y ? lt(pal.hi) : j === ridge - 1 ? pal.deep : pal.hi;
      const n = fbm((i + seed * 13) / 4, j / 5, 501 + seed);
      if (n > 1 - rust && j >= ridge) c = n > 1 - rust * 0.5 ? P.wood : P.brassOld;
      if (j >= ridge && lx === 0 && sy === 8 && (i - x) % 16 === 0) c = P.white; // nail heads
      p.set(i, j, c);
    }
  for (let i = x; i < x + w; i++) {
    p.set(i, y + h - 1, pal.deep);
    p.set(i, y + h - 2, pal.lo);
  }
  for (let j = y; j < y + h; j += 1) if (j % 3 !== 2) p.set(x, j, P.sun);
}

/** Copper standing-seam roof with patina, snow guards and a lightning rod. */
export function roofCopper(p: PixelCanvas, x: number, y: number, w: number, h: number, seed = 0): void {
  const ry = y + 4;
  for (let j = y; j < y + h; j++)
    for (let i = x; i < x + w; i++) {
      const lx = (i - x) % 6;
      let c: string = P.leafDeep;
      if (lx === 0) c = P.leafYoung;
      if (lx === 5) c = P.leafShade;
      const n = fbm(i / 6, j / 5, 601 + seed);
      if (n > 0.72 && lx > 0 && lx < 5) c = n > 0.8 ? P.brass : P.brassOld; // fresh copper showing through
      if (n < 0.22 && lx > 0 && lx < 5) c = P.leafShade;
      if (j < ry) c = j === y ? P.leafLt : j === ry - 1 ? P.leafShade : P.leafYoung;
      p.set(i, j, c);
    }
  // snow guards: two rows of brackets
  for (const sy of [y + Math.round(h * 0.55), y + h - 6]) {
    for (let i = x + 2; i < x + w - 2; i += 3) {
      p.set(i, sy, P.leafLt);
      p.set(i, sy + 1, P.leafShade);
    }
  }
  for (let i = x; i < x + w; i++) {
    p.set(i, y + h - 1, P.ink);
    p.set(i, y + h - 2, P.leafShade);
  }
  for (let j = y; j < y + h; j++) if (j % 3 !== 2) p.set(x, j, P.sun);
}

/** Western slate roof: small staggered slates with blue glints. */
export function roofSlate(p: PixelCanvas, x: number, y: number, w: number, h: number, seed = 0): void {
  for (let j = y; j < y + h; j++)
    for (let i = x; i < x + w; i++) {
      const row = Math.floor((j - y) / 3);
      const ly = (j - y) % 3;
      const off = row % 2 ? 3 : 0;
      const lx = (((i - x + off) % 6) + 6) % 6;
      const hh = ihash(Math.floor((i - x + off) / 6), row, 701 + seed);
      let c: string = hh % 5 === 0 ? P.asphalt : P.charcoal;
      if (ly === 0) c = hh % 7 === 0 ? P.blue : P.asphalt;
      if (lx === 5 || ly === 2) c = P.ink;
      p.set(i, j, c);
    }
  for (let i = x; i < x + w; i++) {
    p.set(i, y, P.steel);
    p.set(i, y + h - 1, P.night);
  }
  for (let j = y; j < y + h; j++) if (j % 3 !== 2) p.set(x, j, P.sun);
}

/** Brown cement flat tiles (セメント瓦). */
export function roofCement(p: PixelCanvas, x: number, y: number, w: number, h: number, seed = 0): void {
  const ry = y + Math.round(h * 0.25);
  for (let j = y; j < y + h; j++)
    for (let i = x; i < x + w; i++) {
      let c: string;
      if (j < ry) {
        c = (j - y) % 3 === 2 ? P.woodDark : P.wood;
      } else if (j < ry + 3) {
        c = j === ry ? P.woodLt : j === ry + 1 ? P.wood : P.woodDark;
      } else {
        const row = Math.floor((j - ry - 3) / 5);
        const ly = (j - ry - 3) % 5;
        const off = row % 2 ? 5 : 0;
        const lx = (((i - x + off) % 10) + 10) % 10;
        const hh = ihash(Math.floor((i - x + off) / 10), row, 801 + seed);
        c = hh % 6 === 0 ? P.brassOld : P.wood;
        if (ly === 0) c = P.woodLt;
        if (ly === 4 || lx === 9) c = P.woodDark;
        if (hh % 23 === 0 && ly > 1) c = P.leafShade;
      }
      p.set(i, j, c);
    }
  for (let i = x; i < x + w; i++) {
    p.set(i, y + h - 1, P.ink);
    p.set(i, y + h - 2, P.woodLt);
  }
  for (let j = y; j < y + h; j++) if (j % 3 !== 2) p.set(x, j, P.sun);
}

/**
 * Flat concrete roof with a parapet (陸屋根). Returns the inner rect so
 * rooftop objects can be placed.
 */
export function roofFlat(
  p: PixelCanvas,
  x: number,
  y: number,
  w: number,
  h: number,
  opts: { base?: string; lip?: string; seed?: number; stains?: boolean } = {},
): [number, number, number, number] {
  const base = opts.base ?? P.concrete;
  const seed = opts.seed ?? 0;
  for (let j = y; j < y + h; j++)
    for (let i = x; i < x + w; i++) {
      const n = fbm(i / 9, j / 9, 901 + seed);
      let c = n > 0.66 ? lt(base) : n < 0.3 ? dk(base) : base;
      // slab joints
      if ((i - x) % 24 === 23 || (j - y) % 16 === 15) c = dk(base);
      if (opts.stains !== false && valueNoise(i / 5, j / 3, 911 + seed) > 0.78) c = dk(base, 2);
      p.set(i, j, c);
    }
  // parapet: 3px rim, lit top/left, shadow inside bottom/right
  const lip = opts.lip ?? lt(base);
  for (let i = x; i < x + w; i++) {
    p.set(i, y, lt(lip));
    p.set(i, y + 1, lip);
    p.set(i, y + 2, dk(base));
    p.set(i, y + h - 3, lt(lip));
    p.set(i, y + h - 2, lip);
    p.set(i, y + h - 1, dk(lip, 2));
  }
  for (let j = y; j < y + h - 1; j++) {
    p.set(x, j, j % 3 === 2 ? lip : P.sun);
    p.set(x + 1, j, lip);
    p.set(x + 2, j, lt(base));
    p.set(x + w - 2, j, lip);
    p.set(x + w - 1, j, dk(lip, 2));
    p.set(x + w - 3, j, dk(base));
  }
  return [x + 3, y + 3, w - 6, h - 6];
}

// ---------------------------------------------------------------- walls

export type WallFn = (i: number, j: number) => string;

/**
 * Fill a wall area. With `wash` (default) the left third is one step lighter
 * (7.4: the low sun hits the south walls from the left), the border softened
 * with a 2px checker — applied to the wall material only, never to signs.
 */
export function fillWall(p: PixelCanvas, x: number, y: number, w: number, h: number, fn: WallFn, wash = true): void {
  const edge = Math.round(w / 3);
  for (let j = y; j < y + h; j++)
    for (let i = x; i < x + w; i++) {
      let c = fn(i - x, j - y);
      const li = i - x;
      if (wash && w >= 24 && (li < edge || (li < edge + 2 && ((i + j) & 1) === 0))) c = lt(c);
      p.set(i, j, c);
    }
}

export function wallPlaster(base: string, seed = 0): WallFn {
  return (i, j) => {
    const n = valueNoise(i / 4, j / 5, 1001 + seed);
    if (n > 0.8) return lt(base);
    if (n < 0.14) return dk(base);
    return base;
  };
}

/** Horizontal lap siding (下見板). */
export function wallSiding(base: string, seed = 0): WallFn {
  return (i, j) => {
    const ly = j % 4;
    if (ly === 3) return dk(base);
    if (ly === 0) return lt(base);
    const n = ihash(Math.floor(i / 23), Math.floor(j / 4), 1011 + seed);
    return n % 9 === 0 ? dk(base) : base;
  };
}

/** Vertical boards with grain. */
export function wallBoards(base: string, seed = 0, bw = 5): WallFn {
  return (i, j) => {
    const lx = i % bw;
    if (lx === bw - 1) return dk(base, 2);
    if (lx === 0) return lt(base);
    const g = valueNoise(Math.floor(i / bw) * 3.7, j / 3, 1021 + seed);
    return g > 0.7 ? dk(base) : base;
  };
}

/** Small square tiles (公衆トイレ, 交番の腰壁). */
export function wallTiles(base: string, grout: string, size = 4): WallFn {
  return (i, j) => {
    if (i % size === size - 1 || j % size === size - 1) return grout;
    if (i % size === 0 && j % size === 0) return lt(base);
    return base;
  };
}

/** Mortar (モルタル) with trowel texture. */
export function wallMortar(base: string, seed = 0): WallFn {
  return (i, j) => {
    const n = fbm(i / 6, j / 4, 1031 + seed);
    if (n > 0.7) return lt(base);
    if (n < 0.26) return dk(base);
    return base;
  };
}

/** Vertical rain streaks below a line (雨だれ). */
export function rainStreaks(p: PixelCanvas, x: number, y: number, w: number, h: number, seed = 0, every = 7): void {
  for (let i = x; i < x + w; i++) {
    if (ihash(i, 0, 1041 + seed) % every !== 0) continue;
    const len = 3 + (ihash(i, 1, 1043 + seed) % Math.max(2, h - 3));
    shadeRect(p, i, y, 1, Math.min(h, len));
  }
}

// ---------------------------------------------------------------- windows & doors

export type WinStyle = 'alu' | 'wood' | 'lattice' | 'shoji' | 'arch' | 'plain';

/** A window with frame, glass (reflection mask), sill and the right-thrown shadow. */
export function windowAt(
  b: Bld,
  x: number,
  y: number,
  w: number,
  h: number,
  style: WinStyle = 'alu',
  opts: { curtain?: string; side?: 'l' | 'r' | 'both'; sill?: boolean; light?: boolean; bars?: boolean; frame?: string } = {},
): void {
  const p = b.p;
  const frame = opts.frame ?? (style === 'wood' || style === 'lattice' || style === 'shoji' ? P.woodDark : P.steel);
  // frame
  p.rect(x - 1, y - 1, w + 2, h + 2, frame);
  p.hline(x - 1, x + w, y - 1, lt(frame));
  p.vline(x - 1, y - 1, y + h, lt(frame));
  if (style === 'shoji') {
    p.rect(x, y, w, h, P.paper);
    for (let i = x; i < x + w; i++) for (let j = y; j < y + h; j++) if ((i - x) % 4 === 3 || (j - y) % 5 === 4) p.set(i, j, P.woodLt);
  } else {
    glassPane(p, b.mask, x, y, w, h, { curtain: opts.curtain, curtainSide: opts.side, base: P.shadeDeep });
    if (style === 'arch') {
      // round the top corners
      for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [w - 1, 0], [w - 2, 0], [w - 1, 1]]) {
        p.set(x + dx, y + dy, frame);
        b.mask.set(x + dx, y + dy, 'transparent');
      }
    }
    // mullions
    if (style === 'alu' && w >= 8) p.vline(x + Math.floor(w / 2), y, y + h - 1, frame);
    if (style === 'wood' || style === 'lattice') {
      p.vline(x + Math.floor(w / 2), y, y + h - 1, frame);
      if (h >= 8) p.hline(x, x + w - 1, y + Math.floor(h / 2), frame);
    }
    if (style === 'lattice' || opts.bars) {
      for (let i = x + 1; i < x + w; i += 2) {
        p.vline(i, y, y + h - 1, style === 'lattice' ? P.wood : P.steel);
      }
    }
  }
  if (opts.sill !== false) {
    p.hline(x - 1, x + w, y + h + 1, P.concreteLt);
    p.hline(x - 1, x + w, y + h + 2, P.steel);
    castRight(p, x - 1, y + h + 1, w + 2, 2, 2);
  }
  castRight(p, x - 1, y - 1, w + 2, h + 2, 2);
  if (opts.light !== false) b.lights.push([x, y, w, h]);
}

/** Japanese sliding entrance door (引き戸) with lattice glass. */
export function slidingDoor(b: Bld, x: number, y: number, w: number, h: number, frame: string = P.woodDark): void {
  const p = b.p;
  p.rect(x, y, w, h, frame);
  const half = Math.floor(w / 2);
  for (const dx of [0, half]) {
    glassPane(p, b.mask, x + dx + 1, y + 1, half - 2, h - 4, { base: P.shadeDeep, glint: dx === 0 });
    for (let j = y + 3; j < y + h - 3; j += 3) p.hline(x + dx + 1, x + dx + half - 2, j, frame);
  }
  p.hline(x, x + w - 1, y, lt(frame));
  p.vline(x, y, y + h - 1, lt(frame));
  p.hline(x, x + w - 1, y + h - 2, P.steel);
  p.hline(x, x + w - 1, y + h - 1, P.charcoal);
  b.lights.push([x + 1, y + 1, w - 2, h - 4]);
}

/** Shop glass door (aluminium frame, push bar). */
export function glassDoor(b: Bld, x: number, y: number, w: number, h: number, frame: string = P.steel, open = false): void {
  const p = b.p;
  p.rect(x, y, w, h, frame);
  if (open) {
    p.rect(x + 1, y + 1, w - 2, h - 1, P.nightShade);
    p.rect(x + 1, y + Math.floor(h / 2), w - 2, Math.ceil(h / 2) - 1, P.shadeDeep);
  } else glassPane(p, b.mask, x + 1, y + 1, w - 2, h - 3, { base: P.shadeDeep });
  p.hline(x, x + w - 1, y, lt(frame));
  p.vline(x, y, y + h - 1, lt(frame));
  p.hline(x + 2, x + w - 3, y + Math.floor(h * 0.55), P.concreteLt);
  p.hline(x, x + w - 1, y + h - 1, P.charcoal);
  b.lights.push([x + 1, y + 1, w - 2, h - 3]);
}

/** Awning (テント) projecting from the wall; stripes, scalloped hem, shadow below. */
export function awning(p: PixelCanvas, x: number, y: number, w: number, h: number, c1: string, c2: string | null, scallop = true): void {
  for (let j = 0; j < h; j++)
    for (let i = 0; i < w; i++) {
      const stripe = c2 && Math.floor(i / 4) % 2 === 1;
      let c = stripe ? c2! : c1;
      if (j === 0) c = lt(c);
      else if (j >= h - 2) c = dk(c);
      p.set(x + i, y + j, c);
    }
  if (scallop)
    for (let i = 0; i < w; i++) {
      const lx = i % 6;
      if (lx >= 1 && lx <= 4) p.set(x + i, y + h, dk(c2 && Math.floor(i / 4) % 2 ? c2 : c1));
      if (lx >= 2 && lx <= 3) p.set(x + i, y + h + 1, dk(c1, 2));
    }
  // shadow on the wall below the hem
  shadeRect(p, x, y + h + (scallop ? 2 : 0), w + 2, 3);
  shadeRect(p, x + w, y + 1, 2, h);
}

/** Wall-mounted sign board with a frame, shadow thrown right. */
export function signBoard(p: PixelCanvas, x: number, y: number, w: number, h: number, base: string, frame: string, shadow = 3): void {
  castRight(p, x, y, w, h, shadow);
  p.rect(x, y, w, h, base);
  p.strokeRect(x, y, w, h, frame);
  p.hline(x + 1, x + w - 2, y + 1, lt(base));
  p.vline(x + 1, y + 1, y + h - 2, lt(base));
  p.hline(x + 1, x + w - 2, y + h - 2, dk(base));
}

/** Drain pipe (雨どい) down a wall edge. */
export function drainPipe(p: PixelCanvas, x: number, y0: number, y1: number): void {
  p.vline(x, y0, y1, P.concreteLt);
  p.vline(x + 1, y0, y1, P.steel);
  for (let j = y0 + 6; j < y1; j += 12) {
    p.hline(x - 1, x + 2, j, P.asphalt);
  }
  shadeRect(p, x + 2, y0 + 1, 1, y1 - y0);
}

/** Electric meter box. */
export function meter(p: PixelCanvas, x: number, y: number): void {
  castRight(p, x, y, 5, 7, 2);
  p.rect(x, y, 5, 7, P.concreteLt);
  p.rect(x + 1, y + 1, 3, 3, P.shadeDeep);
  p.set(x + 1, y + 1, P.glint);
  p.hline(x, x + 4, y + 6, P.steel);
}

/** Ground-hugging foot of a facade (base course, dirt splash). */
export function facadeFoot(p: PixelCanvas, x: number, y: number, w: number, base: string = P.concrete): void {
  for (let i = x; i < x + w; i++) {
    p.set(i, y - 3, lt(base));
    p.set(i, y - 2, base);
    p.set(i, y - 1, dk(base, 2));
    if (h01(i, y, 1051) < 0.2) p.set(i, y - 3, dk(base));
  }
}

// ---------------------------------------------------------------- per-building framework

export interface BuildingDef {
  id: string;
  W: number;
  R: number;
  F: number;
  top?: number;
  /** Paint the building (stage-independent parts). */
  paint(b: Bld): void;
  /** Stage variants: return a painter adding to a copy of the base image. */
  stage?(b: Bld, stage: number): ((p: PixelCanvas) => void) | null;
  over?(g: Gfx, x: number, y: number, env: PropEnv, b: Bld): void;
  glow?(g: Gfx, x: number, y: number, env: PropEnv, b: Bld): void;
  /** Light cast on the surroundings (light map, see PropArt.light). */
  light?(g: Gfx, x: number, y: number, env: PropEnv, b: Bld): void;
  /** Width in px of the ground shadow band east of the building (0 = none). */
  band?: number;
}

/** Register a building builder. opts may carry variant info (v). */
export function registerBuilding(def: BuildingDef | ((opts: Record<string, unknown>) => BuildingDef)): void {
  const probe = typeof def === 'function' ? def({}) : def;
  registerProp(probe.id, (opts) => buildingArt(typeof def === 'function' ? def(opts) : def));
}

function buildingArt(def: BuildingDef): PropArt {
  const b = newBld(def.W, def.R, def.F, def.top ?? 0);
  def.paint(b);
  const base = b.p.toCanvas();
  const glass = b.mask.toCanvas();
  const variants = new Map<number, HTMLCanvasElement>();
  const imgFor = (stage: number): HTMLCanvasElement => {
    if (!def.stage) return base;
    let v = variants.get(stage);
    if (v) return v;
    const fn = def.stage(b, stage);
    if (!fn) v = base;
    else {
      const c = b.p.clone();
      fn(c);
      v = c.toCanvas();
    }
    variants.set(stage, v);
    return v;
  };
  const band = def.band ?? 12;
  const H = b.botY;
  return {
    ox: 0,
    oy: -b.top,
    w: b.w,
    h: H,
    foot: (def.R + def.F) * 16,
    img: (env) => imgFor(Math.floor(env.stage)),
    glass,
    over: def.over ? (g, x, y, env) => def.over!(g, x, y - b.top, env, b) : undefined,
    glow: (g, x, y, env) => {
      if (env.grade.night > 0.05) nightWindows(g, x, y - b.top, b, env.grade.night);
      def.glow?.(g, x, y - b.top, env, b);
    },
    light: (g, x, y, env) => {
      if (env.grade.night > 0.05) windowLight(g, x, y - b.top, b, env.grade.night);
      def.light?.(g, x, y - b.top, env, b);
    },
    shadowFn: band
      ? (ctx, x, y, dir, len) => {
          if (len <= 0.01) return;
          // 12px band on the ground east of the building, thinner towards the back (7.4)
          const fy = y + (def.R + def.F) * 16;
          const ex = x + b.w;
          const hgt = def.F * 16 + 6;
          const bw = Math.round(band * Math.min(1.4, len / 1.3) * Math.max(0.4, dir[0]));
          ctx.beginPath();
          ctx.moveTo(ex, fy);
          ctx.lineTo(ex + bw, fy - 2 + Math.round(dir[1] * 4));
          ctx.lineTo(ex + Math.round(bw * 0.4), fy - hgt);
          ctx.lineTo(ex, fy - hgt);
          ctx.closePath();
          ctx.fill();
        }
      : undefined,
  };
}

/**
 * Warm window light at night (7.4: #F6D98A, emissive): the lit glass itself,
 * painted in the building's depth slot so whatever stands in front of the
 * window (a gacha machine, a sign) cuts it out (review round 2).
 */
function nightWindows(g: Gfx, x: number, y: number, b: Bld, night: number): void {
  const ctx = g.ctx;
  ctx.save();
  for (const [wx, wy, ww, wh] of b.lights) {
    const X = Math.round(x + wx);
    const Y = Math.round(y + wy);
    ctx.globalAlpha = 0.5 * night;
    ctx.fillStyle = P.goldPale;
    ctx.fillRect(X, Y, ww, wh);
    // brighter lower half (the lamp inside hangs low), a 1px warm rim
    ctx.globalAlpha = 0.25 * night;
    ctx.fillStyle = P.horizon;
    ctx.fillRect(X + 1, Y + Math.floor(wh / 2), ww - 2, Math.ceil(wh / 2) - 1);
    ctx.globalAlpha = 0.14 * night;
    ctx.fillStyle = P.sky;
    ctx.fillRect(X - 1, Y - 1, ww + 2, 1);
    ctx.fillRect(X - 1, Y + wh, ww + 2, 1);
    ctx.fillRect(X - 1, Y, 1, wh);
    ctx.fillRect(X + ww, Y, 1, wh);
  }
  ctx.restore();
}

/** Ground-floor windows throw a warm trapezoid onto the street (light map, 7.4). */
function windowLight(g: Gfx, x: number, y: number, b: Bld, night: number): void {
  for (const [wx, wy, ww, wh] of b.lights) {
    if (b.botY - (wy + wh) >= 20) continue;
    const img = poolTrapezoid(ww + 2, ww + 14, 18, LIGHT.window);
    drawLightAt(g, img, x + wx + ww / 2 - img.width / 2, y + b.botY - 1, 0.55 * night);
    // the window's own glow on the wall round it
    drawLight(g, poolEllipse(ww / 2 + 6, wh / 2 + 5, LIGHT.window), x + wx + ww / 2, y + wy + wh / 2, 0.3 * night);
  }
}

// ---------------------------------------------------------------- small animated parts

export interface Frames {
  f: HTMLCanvasElement[];
  ms: number;
}

/** Frames from a painter called with the frame index. */
export function frames(n: number, w: number, h: number, ms: number, paint: (p: PixelCanvas, k: number) => void): Frames {
  const f: HTMLCanvasElement[] = [];
  for (let k = 0; k < n; k++) {
    const p = new PixelCanvas(w, h);
    paint(p, k);
    f.push(p.toCanvas());
  }
  return { f, ms };
}

export function frameAt(fr: Frames, t: number, phase = 0): HTMLCanvasElement {
  return fr.f[Math.floor(t / fr.ms + phase) % fr.f.length];
}

/** Rising steam puffs (3 frames); stops in stage 1 (uses the motion clock). */
let STEAM: Frames | null = null;
export function steamFrames(): Frames {
  if (!STEAM)
    STEAM = frames(3, 10, 18, 220, (p, k) => {
      const puffs: [number, number, number][] = [
        [4, 14 - k * 4, 2],
        [6, 8 - k * 3, 2],
        [3, 3 - k * 1, 1],
      ];
      for (const [cx, cy, r] of puffs) {
        if (cy < 0) continue;
        p.ellipse(cx + (k % 2), cy, r + 0.5, r, P.white);
        p.set(cx + (k % 2) - 1, cy - 1, P.glint);
      }
    });
  return STEAM;
}

/** Noren (暖簾) frames: n panels, 2 frames 600ms. */
export function norenFrames(w: number, h: number, cloth: string, panels: number, mark?: (p: PixelCanvas, k: number) => void): Frames {
  return frames(3, w, h + 1, 600, (p, k) => {
    // rod
    p.hline(0, w - 1, 0, P.woodDark);
    p.hline(0, w - 1, 1, P.wood);
    const pw = Math.floor(w / panels);
    for (let n = 0; n < panels; n++) {
      const x0 = n * pw + 1;
      const x1 = (n + 1) * pw - 1;
      for (let j = 2; j < h; j++) {
        const sway = k === 0 ? 0 : k === 1 ? (j > h * 0.6 ? 1 : 0) : j > h * 0.5 ? 1 : 0;
        const ne = k === 2 && j > h * 0.4 ? -1 + (j > h * 0.75 ? -1 : 0) : 0;
        for (let i = x0; i <= x1; i++) {
          const c = i === x0 ? lt(cloth) : i === x1 ? dk(cloth) : cloth;
          p.set(i + (k === 2 ? ne * -1 : sway), j + (k === 2 && j > h * 0.4 ? -Math.floor((j - h * 0.4) / 5) : 0), c);
        }
      }
    }
    mark?.(p, k);
  });
}

export { castRight, eaveShadow, sunWash, shadeRect, glassPane };
