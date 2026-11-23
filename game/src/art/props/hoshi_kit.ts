// Shared helpers for the chapter-2 props (星見台, 52_ch2_level_art 7章・8章):
// the village's roofs (corrugated tin in its many ages and colours, tiles,
// the tin-over-thatch of the old farmhouse), walls (lap boards, old boards,
// rain shutters, concrete block), dark windows, doors, small hand-lettered
// boards, and the light helpers of the night village.
//
// Everything is painted in daylight colours; the night is the grade's job.
// What the night needs from the art (52 7章): a 1px bright line on ridges and
// on the top edges of things (starlight), glass masks, and glows kept apart.

import type { Gfx } from '../../engine/gfx';
import { mix, PixelCanvas } from '../../engine/pixel';
import { HP } from '../tiles/hoshi_ground';
import { h01, ihash, valueNoise } from '../tiles/noise';
import { P } from '../tiles/palette';
import { glassPane, type Bld, type RoofPal } from './bkit';
import { castRight, dk, lt, outline, shadeRect } from './kit';
import { drawLight, drawLightAt, poolEllipse, poolTrapezoid } from './light';
import { registerProp } from './registry';
import type { PropArt, PropEnv } from './types';

export { HP };

/** Chapter-2 light colours for the light map (additive; 52 8.6). */
export const HLIGHT = {
  /** white LED (the security light, the vending machine, the platform lamp) */
  led: '214,222,236',
  /** incandescent / bulb-colour fluorescent (#F6D98A family) */
  bulb: '255,196,84',
  /** the old man's night-light and the altar candles (#F7C27A) */
  warm: '255,160,70',
  /** the fence LED */
  green: '96,255,140',
  /** headlights (#FFE7A3) */
  head: '255,222,140',
  /** the loudspeaker's red lamp */
  red: '255,70,52',
};

/** 星見台's stage for a prop (0 outside chapter 2's maps too). */
export function hs(env: PropEnv): number {
  return env.hstage !== undefined && env.hstage >= 0 ? env.hstage : 0;
}

/** Night strength 0..1 of the frame (lamps on). */
export function nightK(env: PropEnv): number {
  return Math.max(0, Math.min(1, env.grade.night));
}

// ---------------------------------------------------------------- roofs

export const TIN_GRAY: RoofPal = { hi: P.steel, base: P.asphalt, lo: P.charcoal, deep: P.ink };
export const TIN_GREEN: RoofPal = { hi: mix(P.leaf, P.steel, 0.35), base: mix(P.leafDeep, P.asphalt, 0.35), lo: mix(P.leafShade, P.charcoal, 0.3), deep: P.ink };
export const TIN_BLUE: RoofPal = { hi: mix(P.blue, P.steel, 0.45), base: mix(P.blue, P.navy, 0.55), lo: P.navy, deep: P.nightShade };
export const TIN_RED: RoofPal = { hi: mix(P.red, P.peach, 0.3), base: mix(P.verm, P.maroon, 0.45), lo: P.maroon, deep: P.nightShade };
export const TIN_BROWN: RoofPal = { hi: P.woodLt, base: P.wood, lo: P.woodDark, deep: P.ink };
export const TIN_RUST: RoofPal = { hi: mix(P.brassOld, P.steel, 0.35), base: mix(P.brassOld, P.wood, 0.5), lo: P.woodDark, deep: P.ink };
export const TIN_MAROON: RoofPal = { hi: P.sunShade, base: P.maroon, lo: mix(P.maroon, P.nightShade, 0.5), deep: P.night };
export const KAWARA_GRAY: RoofPal = { hi: P.concrete, base: P.steel, lo: P.asphalt, deep: P.charcoal };

/**
 * Corrugated tin gable seen from above: the short north slope, a 3px ridge
 * cap catching the starlight, the long south slope with its ribs every 4px,
 * sheets of different age, nail rows, rust drips, the eave lip.
 */
export function roofTinH(
  p: PixelCanvas,
  x: number,
  y: number,
  w: number,
  h: number,
  pal: RoofPal,
  seed = 0,
  o: { rust?: number; ridgeFrac?: number; patches?: number; mono?: boolean } = {},
): void {
  const ry = o.mono ? y : y + Math.max(3, Math.round(h * (o.ridgeFrac ?? 0.27)));
  const rust = o.rust ?? 0.15;
  const sheetW = 26 + (seed % 3) * 4;
  for (let j = y; j < y + h; j++)
    for (let i = x; i < x + w; i++) {
      const lx = (i - x) % 4;
      const sheet = Math.floor((i - x + (seed % 7)) / sheetW);
      const age = ihash(sheet, 0, 3301 + seed) % 5; // 0 = newest
      let c: string;
      if (j < ry) {
        c = lx === 0 ? pal.base : lx === 3 ? pal.deep : pal.lo;
        if (j === y) c = pal.base;
      } else if (!o.mono && j < ry + 3) {
        c = j === ry ? lt(pal.hi) : j === ry + 1 ? pal.hi : pal.deep;
        if ((i - x) % 12 === 11 && j !== ry + 2) c = pal.base;
      } else {
        c = lx === 0 ? pal.hi : lx === 3 ? pal.lo : pal.base;
        if (age === 4 && lx !== 0) c = mix(c, P.brassOld, 0.25);
        if (age === 3 && lx === 0) c = pal.base;
      }
      p.set(i, j, c);
    }
  // sheet overlaps (a darker rib every sheet)
  for (let i = x + sheetW - (seed % 7); i < x + w; i += sheetW) {
    if (i <= x) continue;
    for (let j = ry + (o.mono ? 0 : 3); j < y + h - 2; j++) p.set(i, j, pal.deep);
  }
  // nail rows (every 16px down the slope), rust drips below some nails
  const top = ry + (o.mono ? 1 : 4);
  for (let j = top + 3; j < y + h - 4; j += 14)
    for (let i = x + 2; i < x + w - 1; i += 8) {
      p.set(i, j, lt(pal.hi));
      if (h01(i, j, 3307 + seed) < rust) {
        const len = 2 + (ihash(i, j, 3311 + seed) % 6);
        for (let k = 1; k <= len && j + k < y + h - 2; k++) p.set(i + (k > 3 ? 1 : 0), j + k, k === len ? mix(P.brassOld, pal.lo, 0.5) : mix(P.brassOld, pal.base, 0.35));
      }
    }
  // a few odd patches (a newer sheet, a leaf-clogged low spot)
  const nP = o.patches ?? 2;
  for (let k = 0; k < nP; k++) {
    const hh = ihash(k, seed, 3313);
    const px = x + 4 + (hh % Math.max(1, w - 18));
    const py = top + 4 + ((hh >>> 8) % Math.max(1, y + h - top - 12));
    const pw = 8 + ((hh >>> 16) % 8);
    for (let j = py; j < py + 5 && j < y + h - 3; j++)
      for (let i = px; i < px + pw && i < x + w - 1; i++) {
        const lx = (i - x) % 4;
        p.set(i, j, k % 2 ? (lx === 0 ? lt(pal.hi) : lx === 3 ? pal.base : pal.hi) : lx === 0 ? mix(pal.hi, P.leafShade, 0.35) : mix(pal.base, P.leafShade, 0.4));
      }
  }
  // eave lip
  for (let i = x; i < x + w; i++) {
    const lx = (i - x) % 4;
    p.set(i, y + h - 2, lx === 0 ? lt(pal.hi) : lx === 3 ? pal.lo : pal.hi);
    p.set(i, y + h - 1, pal.deep);
  }
  // verges: starlight on the west edge, dark east edge
  for (let j = y; j < y + h - 1; j++) {
    p.set(x, j, j % 3 === 2 ? pal.hi : lt(pal.hi));
    p.set(x + w - 1, j, pal.deep);
  }
}

/** After bkit.roofKawara: the sunset verge (P.sun) repainted in starlight. */
export function starVerge(p: PixelCanvas, x: number, y: number, h: number, pal: RoofPal): void {
  for (let j = y; j < y + h - 1; j++) p.set(x, j, j % 3 === 2 ? pal.hi : lt(pal.hi));
}

/** A 1px starlit line along a top edge (ridges, wall tops, the top of a box). */
export function starTop(p: PixelCanvas, x0: number, x1: number, y: number, c: string = P.concreteLt, every = 0): void {
  for (let x = x0; x <= x1; x++) if (!every || x % every !== 0) if (p.alpha(x, y)) p.set(x, y, c);
}

/** Tile slips and grass tufts on a neglected roof (空き家A). */
export function roofNeglect(p: PixelCanvas, x: number, y: number, w: number, h: number, seed: number, n = 5): void {
  for (let k = 0; k < n; k++) {
    const hh = ihash(k, seed, 3321);
    const px = x + 4 + (hh % Math.max(1, w - 10));
    const py = y + Math.round(h * 0.4) + ((hh >>> 8) % Math.max(1, Math.round(h * 0.5)));
    if (k % 2 === 0) {
      // a slipped tile: a dark gap above, the tile skewed lower
      p.hline(px, px + 4, py, P.ink);
      p.hline(px + 1, px + 5, py + 1, P.steel);
      p.hline(px + 1, px + 5, py + 2, P.asphalt);
      p.set(px + 5, py + 2, P.charcoal);
    } else {
      // a grass tuft (2px) growing out of the tiles
      p.set(px, py, P.leafDeep);
      p.set(px + 1, py - 1, P.leaf);
      p.set(px + 2, py, P.leafDeep);
      p.set(px + 1, py, P.leafShade);
      p.set(px + 3, py - 1, P.leafYoung);
    }
  }
}

// ---------------------------------------------------------------- walls

export type WallFn = (i: number, j: number) => string;

/** Fill a wall without the chapter-1 sunset wash (the village is lit by the night and later the east). */
export function wall(p: PixelCanvas, x: number, y: number, w: number, h: number, fn: WallFn): void {
  for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) p.set(i, j, fn(i - x, j - y));
}

/** Lap boards (下見板張り): dark horizontal boards with a lit lip and knots. */
export function wallLap(base: string, seed = 0, bh = 4): WallFn {
  return (i, j) => {
    const ly = j % bh;
    if (ly === bh - 1) return dk(base);
    if (ly === 0) return lt(base);
    const board = Math.floor(j / bh);
    const seam = (ihash(board, 0, 3331 + seed) % 40) + 20;
    if (i % seam === 0) return dk(base);
    return ihash(Math.floor(i / 9), board, 3333 + seed) % 11 === 0 ? dk(base) : base;
  };
}

/** Weathered vertical boards (古材): silver-grey, dark seams, a split now and then. */
export function wallOld(seed = 0, bw = 6): WallFn {
  return (i, j) => {
    const lx = i % bw;
    const b = Math.floor(i / bw);
    if (lx === bw - 1) return HP.oldWoodDk;
    if (lx === 0) return mix(HP.oldWood, P.concrete, 0.35);
    const g = valueNoise(b * 3.1, j / 4, 3341 + seed);
    if (ihash(b, Math.floor(j / 7), 3343 + seed) % 23 === 0 && lx === 2) return HP.oldWoodDk;
    return g > 0.7 ? mix(HP.oldWood, HP.oldWoodDk, 0.4) : HP.oldWood;
  };
}

/** Plaster (漆喰・モルタル) with a trowel mottle. */
export function wallPlain(base: string, seed = 0): WallFn {
  return (i, j) => {
    const n = valueNoise(i / 5, j / 4, 3351 + seed);
    if (n > 0.82) return lt(base);
    if (n < 0.14) return dk(base);
    return base;
  };
}

/** Concrete block (コンクリートブロック): 12×6 blocks in stretcher bond. */
export function wallBlock(seed = 0): WallFn {
  return (i, j) => {
    const row = Math.floor(j / 6);
    const ly = j % 6;
    const off = row % 2 ? 6 : 0;
    const lx = (i + off) % 12;
    if (ly === 5 || lx === 11) return P.steel;
    if (ly === 0 || lx === 0) return P.concreteLt;
    return ihash(Math.floor((i + off) / 12), row, 3361 + seed) % 7 === 0 ? mix(P.concrete, P.steel, 0.4) : P.concrete;
  };
}

/** Wainscot of grey boards (分校の腰板). */
export function wallWainscot(seed = 0): WallFn {
  return (i, j) => {
    const lx = i % 5;
    if (j === 0) return P.concreteLt;
    if (lx === 4) return P.asphalt;
    if (lx === 0) return P.concrete;
    return ihash(Math.floor(i / 5), Math.floor(j / 6), 3371 + seed) % 5 === 0 ? mix(P.steel, P.asphalt, 0.3) : P.steel;
  };
}

// ---------------------------------------------------------------- openings

/**
 * A dark window (the village's windows are dark: 52 7.1). Frame, glass that
 * mirrors the sky (mask), a curtain or a paper screen inside, a sill. Never
 * lit by the building framework (no `b.lights` entry).
 */
export function darkWin(
  b: Bld,
  x: number,
  y: number,
  w: number,
  h: number,
  o: { frame?: string; curtain?: string; side?: 'l' | 'r' | 'both'; shoji?: boolean; bars?: boolean; sill?: boolean; mull?: boolean } = {},
): void {
  const p = b.p;
  const frame = o.frame ?? P.steel;
  p.rect(x - 1, y - 1, w + 2, h + 2, frame);
  p.hline(x - 1, x + w, y - 1, lt(frame));
  p.vline(x - 1, y - 1, y + h, lt(frame));
  glassPane(p, b.mask, x, y, w, h, { base: P.shadeDeep, curtain: o.curtain, curtainSide: o.side, glint: true });
  if (o.shoji) {
    // a paper screen behind the glass (the room is dark: the paper is grey)
    for (let j = y; j < y + h; j++)
      for (let i = x; i < x + w; i++) {
        if ((i - x) % 4 === 3 || (j - y) % 4 === 3) p.set(i, j, P.wood);
        else if (!((i + j) % 5 === 0)) p.set(i, j, mix(P.paperGrid, P.steel, 0.35));
      }
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) b.mask.set(i, j, 'transparent');
  }
  if (o.mull !== false && w >= 8) p.vline(x + Math.floor(w / 2), y, y + h - 1, frame);
  if (o.bars) for (let i = x + 1; i < x + w; i += 2) p.vline(i, y, y + h - 1, P.steel);
  if (o.sill !== false) {
    p.hline(x - 1, x + w, y + h + 1, P.concreteLt);
    p.hline(x - 1, x + w, y + h + 2, P.steel);
  }
  castRight(p, x - 1, y - 1, w + 2, h + 2, 1);
}

/** Closed rain shutters (雨戸): old boards in a frame, the 戸袋 at one end. */
export function amado(p: PixelCanvas, x: number, y: number, w: number, h: number, seed = 0, tobukuro: 'l' | 'r' | null = 'r'): void {
  const f = wallOld(seed, 5);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) p.set(x + i, y + j, f(i, j));
  // panel seams (each shutter ~16px)
  for (let i = x + 15; i < x + w - 1; i += 16) p.vline(i, y, y + h - 1, P.ink);
  // rails
  p.hline(x - 1, x + w, y - 1, P.woodDark);
  p.hline(x - 1, x + w, y + h, P.woodDark);
  p.hline(x - 1, x + w, y + h + 1, P.ink);
  if (tobukuro) {
    const tx = tobukuro === 'r' ? x + w : x - 7;
    for (let j = y - 2; j < y + h + 1; j++)
      for (let i = tx; i < tx + 7; i++) p.set(i, j, (j - y) % 3 === 0 ? HP.oldWoodDk : i === tx || i === tx + 6 ? P.woodDark : HP.oldWood);
    p.hline(tx, tx + 6, y - 2, lt(HP.oldWood));
  }
}

/** A sliding entrance door (引き戸, glass in a wooden lattice), dark behind. */
export function hikido(b: Bld, x: number, y: number, w: number, h: number, frame: string = P.woodDark, o: { lit?: boolean; open?: number } = {}): void {
  const p = b.p;
  p.rect(x, y, w, h, frame);
  const half = Math.floor(w / 2);
  for (const dx of [0, half]) {
    glassPane(p, b.mask, x + dx + 1, y + 1, half - 2, h - 4, { base: P.shadeDeep, glint: dx === 0 });
    for (let j = y + 3; j < y + h - 3; j += 3) p.hline(x + dx + 1, x + dx + half - 2, j, frame);
    p.vline(x + dx + Math.floor(half / 2), y + 1, y + h - 4, frame);
  }
  p.hline(x, x + w - 1, y, lt(frame));
  p.vline(x, y, y + h - 1, lt(frame));
  p.hline(x, x + w - 1, y + h - 2, P.steel);
  p.hline(x, x + w - 1, y + h - 1, P.charcoal);
  if (o.lit) b.lights.push([x + 1, y + 1, w - 2, h - 4]);
}

/** Small nameplate (表札): a light wood plate with ink strokes (the name in a few lines). */
export function hyousatsu(p: PixelCanvas, x: number, y: number, seed = 0, vertical = true): void {
  if (vertical) {
    p.rect(x, y, 4, 7, P.goldPale);
    p.vline(x, y, y + 6, P.woodLt);
    p.vline(x + 3, y, y + 6, P.brassOld);
    p.hline(x, x + 3, y + 6, P.wood);
    p.set(x + 1, y + 1, P.ink);
    p.set(x + 2, y + 2, P.ink);
    p.set(x + 1, y + 3 + (seed % 2), P.ink);
    p.set(x + 2, y + 4, P.ink);
  } else {
    p.rect(x, y, 7, 4, P.goldPale);
    p.hline(x, x + 6, y, P.woodLt);
    p.hline(x, x + 6, y + 3, P.brassOld);
    p.set(x + 1 + (seed % 2), y + 1, P.ink);
    p.set(x + 3, y + 2, P.ink);
    p.set(x + 5, y + 1, P.ink);
  }
}

/** Foundation band at the foot of a wall (布基礎, a splash of dirt). */
export function footing(p: PixelCanvas, x: number, y: number, w: number, base: string = P.concrete, seed = 0): void {
  for (let i = x; i < x + w; i++) {
    p.set(i, y - 4, lt(base));
    p.set(i, y - 3, base);
    p.set(i, y - 2, h01(i, y, 3381 + seed) < 0.3 ? mix(base, P.woodDark, 0.4) : base);
    p.set(i, y - 1, dk(base, 2));
  }
  // air vent (床下換気口) now and then
  for (let i = x + 10; i < x + w - 8; i += 37 + (seed % 5)) {
    p.rect(i, y - 4, 5, 2, P.charcoal);
    p.hline(i, i + 4, y - 3, P.ink);
  }
}

/** Eave-shadow band under a roof (the night keeps it faint: no sun). */
export function eaveDark(p: PixelCanvas, x: number, y: number, w: number, rows = 3): void {
  shadeRect(p, x, y, w, rows, 1);
  shadeRect(p, x, y, w, 1, 1);
}

// ---------------------------------------------------------------- small props

/** Build a standing prop from a painter (outline + optional starlit top). */
export function standProp(
  w: number,
  h: number,
  paint: (p: PixelCanvas) => void,
  o: { cx?: number; base?: number; foot?: number; outline?: boolean; soft?: boolean; shadow?: number; extra?: Partial<PropArt>; contact?: number } = {},
): PropArt {
  const p = new PixelCanvas(w, h);
  paint(p);
  if (o.outline !== false) outline(p, { bottom: true, soft: o.soft ?? true });
  const img = p.toCanvas();
  const cx = o.cx ?? 8;
  const base = o.base ?? 16;
  return {
    ox: Math.round(cx - w / 2),
    oy: base - h,
    w,
    h,
    foot: o.foot ?? base - 1,
    img: () => img,
    shadow: o.shadow,
    contact: o.contact ?? Math.max(6, Math.round(w * 0.7)),
    contactX: cx,
    ...o.extra,
  };
}

/** Frames of a painter (for animated props). */
export function paintFrames(n: number, w: number, h: number, paint: (p: PixelCanvas, k: number) => void, post?: (p: PixelCanvas) => void): HTMLCanvasElement[] {
  const out: HTMLCanvasElement[] = [];
  for (let k = 0; k < n; k++) {
    const p = new PixelCanvas(w, h);
    paint(p, k);
    post?.(p);
    out.push(p.toCanvas());
  }
  return out;
}

/** Register a standing, framed prop quickly. */
export function regStand(id: string, w: number, h: number, paint: (p: PixelCanvas, o: Record<string, unknown>) => void, o: Parameters<typeof standProp>[3] = {}): void {
  registerProp(id, (opts) => standProp(w, h, (p) => paint(p, opts), o));
}

/** Soft warm glow (emissive): a stepped halo plus a bright core. */
export function glowDot(g: Gfx, x: number, y: number, core: string, rgb: string, r: number, a: number): void {
  if (a <= 0.01) return;
  drawLight(g, poolEllipse(r, r, rgb), x, y, a * 0.5);
  g.rect(Math.round(x), Math.round(y), 1, 1, core, Math.min(1, a));
}

/** A window's warm light on the ground below it (light map). */
export function windowPool(g: Gfx, x: number, y: number, w: number, len: number, a: number, rgb = HLIGHT.bulb): void {
  const img = poolTrapezoid(w, w + Math.round(len * 0.6), len, rgb);
  drawLightAt(g, img, x + w / 2 - img.width / 2, y, a);
}

/** A tiny readable board of hand-lettered lines (the village's paper signs). */
export function paperNote(p: PixelCanvas, x: number, y: number, w: number, h: number, ink: string = P.ink, seed = 0): void {
  p.rect(x, y, w, h, P.white);
  p.hline(x, x + w - 1, y, P.concreteLt);
  p.set(x + w - 1, y + h - 1, P.concrete);
  for (let j = y + 2; j < y + h - 1; j += 2) {
    const len = Math.max(2, w - 3 - (ihash(j, seed, 3391) % 3));
    for (let i = x + 1; i < x + 1 + len; i++) if (ihash(i, j, 3393 + seed) % 4) p.set(i, j, ink);
  }
}
