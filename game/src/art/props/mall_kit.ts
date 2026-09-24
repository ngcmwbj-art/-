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
import { fontSmallWidth, fontText, fontTextSmall, fontWidth, handGlyph, tiny, tinyWidth } from './text';
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

/**
 * A scrap of the red 『閉店セール』 banner left hanging from the 2F railing: a
 * cord, a strip of cloth with a torn bottom edge and a ragged torn-off end,
 * a fold or two, and the real white letters of the sale (fontTextSmall) cut
 * off wherever the cloth is gone. `from` shifts the text left so only a
 * fragment of 閉店セール shows (e.g. 16 → 『セール』, 24 → 『ール』).
 */
export function bannerScrap(p: PixelCanvas, x: number, y: number, w: number, seed: number, from = 0, text = '閉店セール'): void {
  const H = 10;
  // the cord it hung from, with a knot at each end
  p.hline(x - 3, x + w + 2, y, P.charcoal);
  p.set(x - 1, y + 1, P.charcoal);
  // cloth height per column: a torn bottom edge, the right end ripped away
  const len: number[] = [];
  for (let i = 0; i < w; i++) {
    const hh = ihash(i, seed, 911);
    let l = H - (hh % 3 === 0 ? 1 : 0) - (hh % 7 === 0 ? 2 : 0);
    const tail = w - i;
    if (tail <= 6) l -= Math.round((7 - tail) * 1.3) + (hh % 2);
    len.push(Math.max(2, l));
  }
  // the text mask (white letters), shifted so a fragment shows
  const tm = new PixelCanvas(w + 80, 12);
  fontTextSmall(tm, text, 1 - from, 1, '#ffffff', 1);
  for (let i = 0; i < w; i++) {
    for (let j = 1; j <= len[i]; j++) {
      const fold = (i + seed) % 11 === 0 || (i + seed) % 11 === 1;
      let c: string = j === 1 ? P.vermShade : fold ? P.vermShade : j === len[i] ? P.vermShade : P.verm;
      if (!fold && j === 2 && (i + seed) % 11 === 2) c = P.vermLt;
      if (j >= 2 && j <= len[i] - 1 && tm.alpha(i, j - 1) > 0) c = fold ? P.paperGrid : P.white;
      p.set(x + i, y + j, c);
    }
    // a loose thread under some columns
    const hh = ihash(i, seed, 913);
    if (hh % 5 === 0 && len[i] > 4) p.set(x + i, y + len[i] + 1, P.vermShade);
  }
}

/** Width of a small (8px, bold) string (fontTextSmall). */
export function smallW(s: string): number {
  return fontSmallWidth(s);
}

/** Small readable words on signs (DotGothic16 at half size, bold). Returns the width. */
export function small(p: PixelCanvas, s: string, x: number, y: number, c: string, shadow?: string): number {
  return fontTextSmall(p, s, x, y, c, 1, shadow ? { shadow } : {});
}

/**
 * A little wall/pillar sign: white board with a coloured edge strip, a real
 * label (small kana or tiny latin), and an arrow (+1 → / -1 ← / 0 none).
 */
export function arrowSign(p: PixelCanvas, x: number, y: number, label: string, dir: 1 | -1 | 0, o: { edge?: string; ink?: string; latin?: boolean } = {}): number {
  const ink = o.ink ?? P.navy;
  const tw = o.latin ? tinyWidth(label) : fontSmallWidth(label);
  const aw = dir === 0 ? 0 : 8;
  const w = tw + aw + 6;
  const h = o.latin ? 9 : 11;
  p.rect(x, y, w, h, P.white);
  p.hline(x, x + w - 1, y, P.glint);
  p.hline(x, x + w - 1, y + h - 1, P.concrete);
  p.rect(dir < 0 ? x + w - 2 : x, y, 2, h, o.edge ?? P.blue);
  const tx = dir < 0 ? x + 2 + aw + 1 : x + 3;
  if (o.latin) tiny(p, label, tx, y + 2, ink);
  else fontTextSmall(p, label, tx, y + 2, ink, 1);
  if (dir !== 0) {
    const ay = y + Math.floor(h / 2);
    const ax = dir > 0 ? x + 3 + tw + 1 : x + 3;
    for (let i = 0; i < 6; i++) p.set(ax + i, ay, P.verm);
    const tip = dir > 0 ? ax + 5 : ax;
    for (let k = 1; k <= 2; k++) {
      p.set(tip - dir * k, ay - k, P.verm);
      p.set(tip - dir * k, ay + k, P.verm);
    }
  }
  castRight(p, x, y, w, h, 1);
  return w;
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

// ---------------------------------------------------------------- light

export interface Lamp {
  x: number;
  y: number;
  /** This one flickers (5.0: one per area). */
  flicker?: boolean;
}

const floorPaths = new WeakMap<string[], Path2D>();
/**
 * The walkable floor of a map (every cell that is not outside, wall face,
 * wall door or railing) as a clip path in map px — floor light never spills
 * past the walls into the dark outside.
 */
export function floorClip(rows: string[]): Path2D {
  let path = floorPaths.get(rows);
  if (path) return path;
  path = new Path2D();
  rows.forEach((r, ty) =>
    [...r].forEach((c, tx) => {
      if (c === '#' || c === 'W' || c === 'F' || c === ' ') return;
      if (c === 'D' || c === 'U') {
        // a door in the wall face is wall; a door in the south wall is outside
        const up = rows[ty - 1]?.[tx];
        if (up === 'W' || ty === rows.length - 1 || rows[ty + 1]?.[tx] === '#') return;
      }
      path!.rect(tx * 16, ty * 16, 16, 16);
    }),
  );
  floorPaths.set(rows, path);
  return path;
}

/** Run `draw` clipped to the map's floor (x, y = screen px of the map origin). */
export function onFloor(g: Gfx, x: number, y: number, rows: string[], draw: () => void): void {
  const ctx = g.ctx;
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  ctx.clip(floorClip(rows));
  ctx.translate(-Math.round(x), -Math.round(y));
  draw();
  ctx.restore();
}

/**
 * Yellowed fluorescent light (#F4E6A8): the tubes themselves are not drawn,
 * the floor under them is brighter. The flickering one follows tube(seed).
 * Clipped to the floor when the map rows are given.
 */
export function mallLamps(g: Gfx, ox: number, oy: number, lamps: Lamp[], env: PropEnv, seed: number, a = 0.16, rows?: string[]): void {
  const on = tube(env.t, seed);
  const draw = () => {
    for (const l of lamps) {
      const k = l.flicker ? on : 1;
      if (!k) continue;
      screenPool(g, ox + l.x, oy + l.y, 40, 22, '#F4E6A8', a);
    }
  };
  if (rows) onFloor(g, ox, oy, rows, draw);
  else draw();
}

/**
 * Grade correction for the mall (pal_mall) and the lost-child centre
 * (pal_maigo), multiplied into the light map (call from the shell's
 * light()). The mall: a yellowed, slightly dimmer multiply, the top of the
 * screen and the room's own edges pushed towards #3A2B5C (so the lamp pools,
 * the skylight patches and the brightest spot of each area read as light),
 * and a soft vignette. The lost-child centre: a darker lilac.
 * `room` = the floor's rect in screen px (x, y, w, h) for the edge darkening.
 */
export function mallGrade(g: Gfx, kind: 'mall' | 'maigo', env: PropEnv, room?: [number, number, number, number]): void {
  if (env.grade.night > 0.5) return;
  if (kind === 'mall') {
    mapMultiply(g, '#EFE6D2');
    mapTopDark(g, '#CFC6D6', 0.4);
    if (room) roomEdges(g, room, '#C8BFD2', 44);
    mapVignette(g, g.w / 2, g.h / 2 + 10, 110, 250, '#B3A8BE');
  } else {
    mapMultiply(g, '#A49CC6');
    mapTopDark(g, '#8A82A8');
    mapVignette(g, g.w / 2, g.h / 2 + 8, 40, 150, '#6C6290');
  }
}

/** Multiply the light map darker towards the walls of a room (x, y, w, h in screen px), `band` px deep. */
export function roomEdges(g: Gfx, room: [number, number, number, number], col: string, band: number): void {
  const [x, y, w, h] = room.map(Math.round) as [number, number, number, number];
  const ctx = g.ctx;
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  const edge = (x0: number, y0: number, x1: number, y1: number, rx: number, ry: number, rw: number, rh: number) => {
    const gr = ctx.createLinearGradient(x0, y0, x1, y1);
    gr.addColorStop(0, col);
    gr.addColorStop(1, '#ffffff');
    ctx.fillStyle = gr;
    ctx.fillRect(rx, ry, rw, rh);
  };
  edge(x, 0, x + band, 0, x - 8, y - 64, band + 8, h + 72);
  edge(x + w, 0, x + w - band, 0, x + w - band, y - 64, band + 8, h + 72);
  edge(0, y + h, 0, y + h - band, x - 8, y + h - band, w + 16, band + 8);
  ctx.restore();
}

/** The fluorescent light as light (brightens whoever stands under it too). */
export function mallLampLight(g: Gfx, ox: number, oy: number, lamps: Lamp[], env: PropEnv, seed: number, a = 0.15): void {
  const on = tube(env.t, seed);
  for (const l of lamps) {
    if (l.flicker && !on) continue;
    lightPool(g, ox + l.x, oy + l.y, 46, 28, '#F4E6A8', a + env.grade.night * 0.3);
  }
}

/**
 * A sheared band of light with hard edges and a 1px brighter rim on both
 * long sides (the skylight's evening, 5.0: #F2894B screen).
 */
export function shaftQuad(g: Gfx, x0: number, y0: number, w: number, h: number, shear: number, col: string, a: number, rim: string, rimA: number, op: GlobalCompositeOperation = 'screen'): void {
  if (a <= 0.004) return;
  const ctx = g.ctx;
  ctx.save();
  ctx.globalCompositeOperation = op;
  const W = Math.round(w);
  for (let j = 0; j < h; j++) {
    const sx = Math.round(x0 + j * shear);
    const yy = Math.round(y0) + j;
    ctx.globalAlpha = Math.min(1, a);
    ctx.fillStyle = col;
    ctx.fillRect(sx + 1, yy, W - 2, 1);
    ctx.globalAlpha = Math.min(1, rimA);
    ctx.fillStyle = rim;
    ctx.fillRect(sx, yy, 1, 1);
    ctx.fillRect(sx + W - 1, yy, 1, 1);
  }
  ctx.restore();
}

/**
 * The floor patch of a skylight, painted on the floor (call from over(), so
 * whatever stands on it covers it): the evening's orange soft-lit into the
 * floor so it stays warm instead of washing out to white, a paler core.
 */
export function skyPatch(g: Gfx, fx: number, fy: number, fw: number, fh: number, env: PropEnv, a0 = 0.5): void {
  const a = a0 * (1 - env.grade.night);
  if (a <= 0.005) return;
  lightQuad(g, fx, fy, fw, fh, 0.25, P.sun, a, 'soft-light');
  lightQuad(g, fx + 5, fy + 3, fw - 10, fh - 6, 0.25, P.sky, a * 0.35, 'soft-light');
  lightQuad(g, fx + 2, fy + 1, fw - 4, fh - 2, 0.25, P.sky, a * 0.08);
}

/** The patch's hard edge: a 1px bright rim along its two slanted sides (emissive, call from glow()). */
export function skyPatchRim(g: Gfx, fx: number, fy: number, fw: number, fh: number, env: PropEnv, a0 = 0.3): void {
  const a = a0 * (1 - env.grade.night);
  if (a <= 0.005) return;
  shaftQuad(g, fx, fy, fw, fh, 0.25, P.sun, a * 0.25, P.horizon, a);
}

/** The same patch as light (additive, in the light map: it lifts the grade where the sun lands). */
export function skyPatchLight(g: Gfx, fx: number, fy: number, fw: number, fh: number, env: PropEnv, a0 = 0.3): void {
  const a = a0 * (1 - env.grade.night);
  if (a <= 0.005) return;
  lightQuad(g, fx, fy, fw, fh, 0.25, P.sky, a * 0.55, 'lighter');
  lightPool(g, fx + fw / 2 + fh * 0.12, fy + fh / 2, fw * 0.75, fh * 0.95, P.sun, a * 0.35);
}

/**
 * A 'mall_shaft' prop: the shaft in the air over everything (glowFg), with
 * dust, and its floor patch as light (light map). opts: fx, fy (floor patch
 * top-left, world px relative to the anchor tile), fw, fh, rise, shear,
 * motes, a.
 */
export function shaftProp(o: { fx: number; fy: number; fw: number; fh: number; rise?: number; shear?: number; motes?: number; a?: number; seed?: number }) {
  // the bounds cover the whole beam (the renderer culls glow and light by them)
  const rise0 = o.rise ?? 96;
  const shear0 = o.shear ?? 0.55;
  return {
    ox: Math.floor(o.fx - rise0 * shear0) - 2,
    oy: Math.floor(o.fy - rise0) - 2,
    w: Math.ceil(o.fw + (rise0 + o.fh) * shear0) + 4,
    h: Math.ceil(rise0 + o.fh) + 4,
    foot: 0,
    flat: true,
    glowFg: true,
    img: () => null,
    glow(g: Gfx, x: number, y: number, env: PropEnv) {
      const rise = o.rise ?? 96;
      const shear = o.shear ?? 0.55;
      const a = (o.a ?? 0.24) * (1 - env.grade.night);
      if (a <= 0.005) return;
      const fx = x + o.fx;
      const fy = y + o.fy;
      // the beam in the air: orange, hard-edged with a bright rim, fading a
      // little towards the ceiling; a paler core
      const top = fy - rise;
      const len = rise + o.fh * 0.5;
      const steps = 3;
      for (let k = 0; k < steps; k++) {
        const y0 = top + (len * k) / steps;
        const x0 = fx - rise * shear + (len * k * shear) / steps;
        shaftQuad(g, x0, y0, o.fw, len / steps, shear, P.sun, a * (0.72 + k * 0.16), P.horizon, a * (0.55 + k * 0.25));
      }
      lightQuad(g, fx - rise * shear + 8, top, o.fw - 16, len, shear, P.sky, a * 0.35);
      dust(g, fx - rise * shear, top, o.fw, rise + o.fh, shear, o.motes ?? 10, env.stage === 1 ? 0 : env.t, o.seed ?? 77, 0.9);
    },
    light(g: Gfx, x: number, y: number, env: PropEnv) {
      skyPatchLight(g, x + o.fx, y + o.fy, o.fw, o.fh, env, (o.a ?? 0.24) * 1.2);
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
