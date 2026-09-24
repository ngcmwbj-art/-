// Shared pieces of ショッピングプラザ・ユウナリ (30_level_art 5.0): the cream
// panelled walls with ghosts of old posters and scraps of the red 『閉店セール』
// banner, roll-down shutters, shop fascias, the yellowed fluorescent light
// (floor brightness, one flickering tube per area), the slanted orange
// skylight shafts with dust, and the pal_mall / pal_maigo grade correction.

import type { Gfx } from '../../engine/gfx';
import { PixelCanvas } from '../../engine/pixel';
import { P } from '../tiles/palette';
import { ihash, valueNoise } from '../tiles/noise';
import { dust, lightPool, lightQuad, mapMultiply, mapTopDark, mapVignette, screenPool, tube } from './ishell';
import { castRight, dk, lt } from './kit';
import { fontText, fontWidth, handGlyph, scribble } from './text';
import type { PropEnv } from './types';

// ---------------------------------------------------------------- walls

/**
 * Cream decorative panels (#E8D9B5) 32px wide with slim seams, water marks,
 * a darker fascia band near the top of tall walls.
 */
export function mallWall(seed: number, fascia = true): (x: number, y: number, fh: number) => string {
  return (x, y, fh) => {
    if (fascia && fh >= 40 && y >= 3 && y <= 15) {
      // shop fascia band (sign board strip) in faded blue-grey
      if (y === 3 || y === 15) return P.steel;
      return valueNoise(x / 7, y / 3, seed + 3) > 0.8 ? P.concreteLt : P.concrete;
    }
    if (x % 32 === 0) return P.woodLt;
    if (x % 32 === 1) return P.goldPale;
    const n = valueNoise(x / 9, y / 7, seed);
    // long water stains running down from the top
    const stain = valueNoise(x / 3, 0.5, seed + 9) > 0.86 && y < fh * 0.7;
    if (stain) return P.woodLt;
    return n > 0.78 ? P.paper : n < 0.16 ? P.woodLt : P.paperGrid;
  };
}

/** The ghost of a removed poster: a sun-protected rectangle with tape marks. */
export function posterGhost(p: PixelCanvas, x: number, y: number, w: number, h: number): void {
  for (let j = y; j < y + h; j++)
    for (let i = x; i < x + w; i++) {
      const edge = i === x || j === y || i === x + w - 1 || j === y + h - 1;
      p.set(i, j, edge ? P.paperGrid : P.paper);
    }
  for (const [tx, ty] of [[x - 1, y - 1], [x + w - 2, y - 1], [x - 1, y + h - 2], [x + w - 2, y + h - 2]] as const) {
    p.rect(tx, ty, 3, 2, P.goldPale);
  }
  // a torn corner still stuck under one tape
  p.set(x + w - 2, y, P.concrete);
  p.set(x + w - 3, y, P.concrete);
}

/** A scrap of the red 『閉店セール』 banner left hanging from its cord. */
export function bannerScrap(p: PixelCanvas, x: number, y: number, w: number, seed: number): void {
  p.hline(x - 2, x + w + 1, y, P.charcoal);
  for (let i = 0; i < w; i++) {
    const hh = ihash(i, seed, 911);
    const len = 6 + (hh % 3) - (i > w * 0.6 ? Math.floor((i - w * 0.6) * 0.8) : 0);
    for (let j = 1; j <= Math.max(2, len); j++) p.set(x + i, y + j, j === 1 ? P.vermShade : (i + j) % 7 === 0 ? P.red : P.verm);
    if (len > 3 && hh % 4 === 0) p.set(x + i, y + len + 1, P.verm);
  }
  // remains of white letters (セール)
  for (let k = 0; k < Math.floor(w / 6); k++) {
    const lx = x + 1 + k * 6;
    p.hline(lx, lx + 3, y + 3, P.white);
    p.vline(lx + 2, y + 2, y + 5, P.white);
  }
}

/** Roll-down shutter: corrugated slats, a bottom rail with the lock, light at the top. */
export function shutter(p: PixelCanvas, x: number, y: number, w: number, h: number, o: { gap?: number; base?: string } = {}): void {
  const base = o.base ?? P.concrete;
  for (let j = 0; j < h; j++) {
    const k = j % 4;
    const c = k === 0 ? lt(base) : k === 3 ? dk(base) : base;
    p.hline(x, x + w - 1, y + j, c);
  }
  // guide rails
  p.vline(x, y, y + h - 1, P.asphalt);
  p.vline(x + w - 1, y, y + h - 1, P.charcoal);
  // box at the top
  p.rect(x - 1, y - 3, w + 2, 3, P.steel);
  p.hline(x - 1, x + w, y - 3, P.concreteLt);
  // bottom rail, handle and the key hole
  const gap = o.gap ?? 0;
  const by = y + h - 1 - gap;
  p.hline(x, x + w - 1, by, P.asphalt);
  p.rect(x + Math.floor(w / 2) - 2, by - 2, 4, 2, P.charcoal);
  p.set(x + Math.floor(w / 2), by - 3, P.ink);
  if (gap > 0) p.rect(x + 1, by + 1, w - 2, gap, P.ink);
}

/** A shop fascia board with a name in DotGothic (big) or a hand glyph. */
export function fasciaText(p: PixelCanvas, x: number, y: number, w: number, h: number, bg: string, text: string, col: string, shadow?: string): void {
  p.rect(x, y, w, h, bg);
  p.hline(x, x + w - 1, y, lt(bg));
  p.hline(x, x + w - 1, y + h - 1, dk(bg));
  const tw = fontWidth(text);
  fontText(p, text, x + Math.floor((w - tw) / 2), y + Math.max(1, Math.floor((h - 13) / 2)), col, shadow ? { shadow } : {});
  castRight(p, x, y, w, h, 2);
}

/** The Yunari bell logo (hand glyph) in a colour. */
export function bellLogo(p: PixelCanvas, x: number, y: number, c: string, shadow?: string): void {
  handGlyph(p, 'bell', x, y, c, shadow);
}

/** Small arrow sign (white board, blue arrow), direction +1 → / -1 ←. */
export function arrowSign(p: PixelCanvas, x: number, y: number, w: number, dir: 1 | -1, strokes = 3, seed = 1): void {
  p.rect(x, y, w, 9, P.white);
  p.hline(x, x + w - 1, y, P.glint);
  p.hline(x, x + w - 1, y + 8, P.concrete);
  p.rect(x, y, 2, 9, P.blue);
  const ax = dir > 0 ? x + w - 7 : x + 3;
  // arrow
  for (let i = 0; i < 5; i++) p.set(ax + i, y + 4, P.navy);
  const tip = dir > 0 ? ax + 4 : ax;
  p.set(tip - dir, y + 3, P.navy);
  p.set(tip - dir, y + 5, P.navy);
  p.set(tip - dir * 2, y + 2, P.navy);
  p.set(tip - dir * 2, y + 6, P.navy);
  scribble(p, dir > 0 ? x + 3 : x + 9, y + 2, strokes, P.navy, seed, 4);
}

// ---------------------------------------------------------------- light

export interface Lamp {
  x: number;
  y: number;
  /** This one flickers (5.0: one per area). */
  flicker?: boolean;
}

/**
 * Yellowed fluorescent light (#F4E6A8): the tubes themselves are not drawn,
 * the floor under them is brighter. The flickering one follows tube(seed).
 */
export function mallLamps(g: Gfx, ox: number, oy: number, lamps: Lamp[], env: PropEnv, seed: number, a = 0.16): void {
  const on = tube(env.t, seed);
  for (const l of lamps) {
    const k = l.flicker ? on : 1;
    if (!k) continue;
    screenPool(g, ox + l.x, oy + l.y, 40, 22, '#F4E6A8', a);
  }
}

/**
 * Grade correction for the mall (pal_mall: yellowed multiply #EDE6CF and a
 * slightly heavier top darkness) and the lost-child centre (pal_maigo: a
 * darker lilac multiply #C9BFE0, top darkness #1B1733 α30%). The renderer's
 * indoor grade is #E6DCEF; these multiply the light map the rest of the way
 * (call from the shell's light()).
 */
export function mallGrade(g: Gfx, kind: 'mall' | 'maigo', env: PropEnv): void {
  if (env.grade.night > 0.5) return;
  if (kind === 'mall') {
    mapMultiply(g, '#FFFCE2');
    mapTopDark(g, '#E4DEE6');
    mapVignette(g, g.w / 2, g.h / 2 + 10, 120, 260, '#B8AEC0');
  } else {
    mapMultiply(g, '#A49CC6');
    mapTopDark(g, '#8A82A8');
    mapVignette(g, g.w / 2, g.h / 2 + 8, 40, 150, '#6C6290');
  }
}

/** The fluorescent light as light (brightens whoever stands under it too). */
export function mallLampLight(g: Gfx, ox: number, oy: number, lamps: Lamp[], env: PropEnv, seed: number, a = 0.1): void {
  const on = tube(env.t, seed);
  for (const l of lamps) {
    if (l.flicker && !on) continue;
    lightPool(g, ox + l.x, oy + l.y, 44, 26, '#F4E6A8', a + env.grade.night * 0.3);
  }
}

/** The floor patch of a skylight (emissive, cut by whatever stands on it). */
export function skyPatch(g: Gfx, fx: number, fy: number, fw: number, fh: number, env: PropEnv, a0 = 0.22): void {
  const a = a0 * (1 - env.grade.night);
  if (a <= 0.005) return;
  lightQuad(g, fx, fy, fw, fh, 0.25, P.sun, a);
  lightQuad(g, fx + 2, fy + 1, fw - 4, fh - 2, 0.25, P.sky, a * 0.45);
}

/**
 * A 'mall_shaft' prop: the shaft in the air over everything (glowFg), with
 * dust. opts: fx, fy (floor patch top-left, world px relative to the anchor
 * tile), fw, fh, rise, shear, motes, a.
 */
export function shaftProp(o: { fx: number; fy: number; fw: number; fh: number; rise?: number; shear?: number; motes?: number; a?: number; seed?: number }) {
  return {
    ox: 0,
    oy: 0,
    w: 16,
    h: 16,
    foot: 0,
    flat: true,
    glowFg: true,
    img: () => null,
    glow(g: Gfx, x: number, y: number, env: PropEnv) {
      const rise = o.rise ?? 96;
      const shear = o.shear ?? 0.55;
      const a = (o.a ?? 0.22) * (1 - env.grade.night);
      if (a <= 0.005) return;
      const fx = x + o.fx;
      const fy = y + o.fy;
      lightQuad(g, fx - rise * shear, fy - rise, o.fw, rise + o.fh * 0.5, shear, P.sun, a * 0.6);
      lightQuad(g, fx - rise * shear + 6, fy - rise, o.fw - 12, rise + o.fh * 0.4, shear, P.sky, a * 0.25);
      dust(g, fx - rise * shear, fy - rise, o.fw, rise + o.fh, shear, o.motes ?? 10, env.stage === 1 ? 0 : env.t, o.seed ?? 77, 0.8);
    },
  };
}

// ---------------------------------------------------------------- a few loose things

/** A plastic planter with a dusty fake plant (seen from the front-top). */
export function planter(p: PixelCanvas, x: number, y: number, seed: number): void {
  p.rect(x, y + 12, 14, 10, P.concreteLt);
  p.hline(x, x + 13, y + 12, P.white);
  p.vline(x + 13, y + 12, y + 21, P.steel);
  p.hline(x, x + 13, y + 21, P.steel);
  // fake leaves: faded greens with dust on top
  for (let k = 0; k < 14; k++) {
    const hh = ihash(k, seed, 331);
    const lx = x + 1 + (hh % 12);
    const ly = y + 1 + ((hh >>> 4) % 11);
    p.rect(lx, ly, 2, 2, k % 3 === 0 ? P.leafYoung : P.leaf);
    p.set(lx, ly, P.concreteLt);
  }
  p.vline(x + 7, y + 6, y + 11, P.woodDark);
}

export { castRight };
