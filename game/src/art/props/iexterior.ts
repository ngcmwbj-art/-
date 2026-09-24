// The building and the street round a shop interior (review round 1: the
// 9–12×7 shops floated small in the middle of a flat dark screen). The room
// shell is set into a larger canvas that shows, from above, what is really
// outside that door on map_town:
//
//   - the street in front: the town's own ground baked from the tiles in
//     front of the shop's door (arcade mosaic, river-road pavers, curb and
//     asphalt), with the neighbours' fronts and awnings along the facade line;
//   - the building itself: the outer skin of the walls round the 4px wall
//     sections, the eave of the roof over the back wall, the neighbours'
//     roofs on either side;
//   - the shop's own things outside (a bike, the gacha, the vending machine,
//     the red lamp...), painted by each shop;
//   - evening shade over all of it, stepping down into the dark in flat steps
//     joined by 1–2px checker bands (7.9), the street by the door brightest.
//
// At run time exteriorOver() tints the outside with the stage's outdoor grade
// and throws the shop's warm light out of the door onto the street.

import { Gfx } from '../../engine/gfx';
import { makeCanvas, PixelCanvas, rgba32 } from '../../engine/pixel';
import { bakeGround } from '../tiles/ground';
import { ihash, valueNoise } from '../tiles/noise';
import { P } from '../tiles/palette';
import { loadMap } from '../../world/maps';
import { GroundCache } from '../../world/ground_cache';
import { css, GRADES } from '../../world/lighting';
import { charSprite, idleFrame } from '../chars';
import { getProp } from './registry';
import { dk, lt } from './kit';
import { tintSpill } from './ishell';
import type { PropEnv } from './types';

/**
 * Margins (px) of the outside round the room canvas: the small rooms are
 * shown at 2× (FieldScene.viewScale), so this is what the room view shows
 * beside the room and what a dialog window's slide uncovers above / below.
 */
export const EXT = { l: 48, r: 48, t: 28, b: 40 };

/** A neighbour's shop front along the street: the wall's edge and an awning. */
export interface Facade {
  /** Front wall / roof edge colour. */
  skin: string;
  /** Awning stripes (seen from above), if it has one. */
  awning?: [string, string];
  /** Its roof seen from above. */
  roof: 'kawara' | 'tin' | 'slab';
}

export interface ExtPainter {
  /** The whole exterior canvas (room not yet set in). */
  p: PixelCanvas;
  /** Room origin inside p. */
  ox: number;
  oy: number;
  /** Room size (px). */
  W: number;
  H: number;
  /** p's y of the street's top edge (the foot of the facade). */
  street: number;
  /** p's x of the door's centre. */
  door: number;
}

export interface ExteriorSpec {
  rows: string[];
  /** The shop's door on map_town (tile of its D cell). */
  town: [number, number];
  /** Outer skin of the walls: lit, base, shade. */
  skin: [string, string, string];
  roof: 'kawara' | 'tin' | 'slab';
  left: Facade;
  right: Facade;
  seed: number;
  /**
   * The town's own props in front of this shop, at their map_town tiles
   * (baked as they stand there: pillars with lanterns, the gacha, the
   * vending machine...). `sprite` bakes a field character instead (the cow
   * statue); `dy` moves one down (px) off the facade row.
   */
  props?: { id: string; tx: number; ty: number; opts?: Record<string, unknown>; sprite?: boolean; dy?: number }[];
  /** Things outside this shop (painted before the shade and the fade). */
  paint?: (e: ExtPainter) => void;
}

export interface Exterior {
  p: PixelCanvas;
  glass: PixelCanvas;
  /** Offset of the canvas from the map origin (negative). */
  ox: number;
  oy: number;
  W: number;
  H: number;
  /** Door centre x and the street's top edge, in map px. */
  doorX: number;
  streetY: number;
}

let townCache: GroundCache | null = null;
function townGround(): GroundCache | null {
  if (townCache) return townCache;
  const m = loadMap('map_town');
  if (!m) return null;
  townCache = new GroundCache(m);
  return townCache;
}

/** A roof seen from above, as a colour per pixel (x, y in canvas px). */
function roofPx(kind: Facade['roof'], x: number, y: number, seed: number, base?: string): string {
  switch (kind) {
    case 'kawara': {
      // rows of grey-blue tiles, each row's round lower edge lit, staggered
      const row = Math.floor(y / 5);
      const lx = (x + (row % 2) * 4) % 8;
      const ly = y % 5;
      if (ly === 4) return lx === 0 || lx === 7 ? P.ink : P.nightShade;
      if (ly === 3 && (lx === 0 || lx === 7)) return P.nightShade;
      if (ly === 0) return lx >= 2 && lx <= 5 ? P.asphalt : P.charcoal;
      return ihash(Math.floor((x + (row % 2) * 4) / 8), row, seed) % 5 === 0 ? P.shade : P.charcoal;
    }
    case 'tin': {
      // corrugated sheet running north–south, rust creeping from the seams
      const lx = x % 4;
      const rust = valueNoise(x / 5, y / 9, seed) > 0.7;
      const c = base ?? P.asphalt;
      if (lx === 0) return lt(c);
      if (lx === 3) return dk(c);
      return rust ? P.brassOld : c;
    }
    default: {
      // flat concrete roof: sheet waterproofing seams, a puddle stain
      if (y % 12 === 0) return P.steel;
      const st = valueNoise(x / 14, y / 10, seed) > 0.72;
      return st ? P.asphalt : base ?? P.concrete;
    }
  }
}

/**
 * Build the room shell set into its surroundings. `room` / `glass` are the
 * shell canvases (map size); the result is larger by EXT on every side.
 */
export function withExterior(room: PixelCanvas, glass: PixelCanvas, s: ExteriorSpec): Exterior {
  const { l: L, r: R, t: T, b: B } = EXT;
  const W = room.w;
  const H = room.h;
  const EW = W + L + R;
  const EH = H + T + B;
  const p = new PixelCanvas(EW, EH);
  const last = [...s.rows[s.rows.length - 1]];
  const doorTx = Math.max(0, last.indexOf('D'));
  const doorCx = L + doorTx * 16 + 8;
  // building (room px): the side walls' outer faces
  const bx0 = 12;
  const bx1 = W - 12;
  // the front wall's outer face is at H - 12; the street starts 3px below it
  const street = T + H - 9;
  // ---- 1. the street: the town's own ground in front of the door
  const tg = townGround();
  const [tdx, tdy] = s.town;
  if (tg) {
    const src = tg.src;
    const wrap = {
      ...src,
      // under the facades the street's first row carries on (it is covered anyway)
      ground: (tx: number, ty: number) => src.ground(tx, Math.max(ty, tdy + 1)),
    };
    const x0 = (tdx - doorTx) * 16 - L;
    const y0 = (tdy + 1) * 16 - 12;
    const gp = bakeGround(wrap, x0, y0, EW, EH - (street - 3));
    p.blit(gp, 0, street - 3);
  } else p.rect(0, street - 3, EW, EH - street + 3, P.shade);
  // ---- 2. roofs of the neighbours either side, and the dark gap behind the back wall
  for (let y = 0; y < street - 3; y++)
    for (let x = 0; x < EW; x++) {
      const rx = x - L;
      if (rx >= bx0 - 4 && rx < bx1 + 4) continue;
      const nb = rx < bx0 ? s.left : s.right;
      // a narrow gap between the buildings (a drain, the dark)
      const gap = rx < bx0 ? rx >= bx0 - 6 : rx < bx1 + 6;
      if (gap) {
        p.set(x, y, (y + x) % 7 === 0 ? P.nightShade : P.ink);
        continue;
      }
      p.set(x, y, roofPx(nb.roof, x, y, s.seed + (rx < bx0 ? 1 : 2), nb.roof === 'tin' ? nb.skin : undefined));
    }
  // behind our back wall: the gap to the next street's houses
  for (let y = 0; y < T - 8; y++) for (let x = L + bx0 - 4; x < L + bx1 + 4; x++) p.set(x, y, (x * 3 + y) % 11 === 0 ? P.nightShade : P.ink);
  // ---- 3. the fronts along the street: neighbours' walls and awnings, ours
  for (let x = 0; x < EW; x++) {
    const rx = x - L;
    const ours = rx >= bx0 - 3 && rx < bx1 + 3;
    const nb = rx < bx0 ? s.left : s.right;
    const col = ours ? s.skin[1] : nb.skin;
    p.set(x, street - 3, ours ? s.skin[0] : lt(col));
    p.set(x, street - 2, col);
    p.set(x, street - 1, ours ? s.skin[2] : dk(col));
    if (!ours && nb.awning) {
      // an awning over the neighbour's front: stripes, a scalloped hem, its shadow
      const inGap = rx < bx0 ? rx >= bx0 - 8 : rx < bx1 + 8;
      if (inGap) continue;
      const [a, b] = nb.awning;
      for (let j = 0; j < 7; j++) {
        const stripe = Math.floor((x + 2) / 5) % 2 ? a : b;
        p.set(x, street - 3 + j, j === 0 ? lt(stripe) : j === 6 ? dk(stripe) : stripe);
      }
      if ((x % 5) < 3) p.set(x, street + 4, dk(Math.floor((x + 2) / 5) % 2 ? a : b));
      p.set(x, street + 5, P.nightShade);
      if ((x % 5) < 3) p.set(x, street + 6, P.nightShade);
    }
  }
  // ---- 4. our walls' outer skin (3px round the sections) and the back eave
  const [sLt, sBase, sDk] = s.skin;
  for (let y = T - 3; y < street - 3; y++) {
    for (let i = 0; i < 3; i++) {
      p.set(L + bx0 - 3 + i, y, i === 0 ? sLt : sBase);
      p.set(L + bx1 + i, y, i === 2 ? sDk : sBase);
    }
    p.set(L + bx0 - 4, y, P.ink);
    p.set(L + bx1 + 3, y, P.ink);
  }
  for (let x = L + bx0 - 4; x < L + bx1 + 4; x++) {
    p.set(x, T - 3, sLt);
    p.set(x, T - 2, sBase);
    p.set(x, T - 1, sBase);
  }
  // the eave of our roof, just over the back wall's top (overhanging 3px)
  for (let y = T - 9; y < T - 3; y++)
    for (let x = L + bx0 - 7; x < L + bx1 + 7; x++) {
      const j = y - (T - 9);
      let c = roofPx(s.roof, x, y, s.seed + 5, s.roof === 'tin' ? P.steel : undefined);
      if (j === 5) c = P.ink;
      else if (s.roof === 'kawara' && j === 4) c = (x % 4) < 2 ? P.asphalt : P.charcoal;
      else if (s.roof !== 'kawara' && j === 4) c = P.charcoal;
      if (x === L + bx0 - 7 || x === L + bx1 + 6) c = P.ink;
      p.set(x, y, c);
    }
  // the gutter along the eave, and a downpipe at the back corner
  p.hline(L + bx0 - 7, L + bx1 + 6, T - 10, P.steel);
  const pipeX = L + bx1 + 4;
  for (let y = T - 10; y < street - 3; y++) {
    p.set(pipeX, y, P.steel);
    p.set(pipeX + 1, y, P.asphalt);
    if (y % 14 === 3) p.set(pipeX + 1, y, P.charcoal);
  }
  // ---- 5. the town's props in front of the shop, then the shop's own things
  if (s.props?.length) bakeTownProps(p, s.props, (tx) => L + (tx - (tdx - doorTx)) * 16, (ty) => T + H + (ty - tdy - 1) * 16);
  s.paint?.({ p, ox: L, oy: T, W, H, street, door: doorCx });
  // ---- 6. evening shade and the fall into the dark
  shadeAndFade(p, { x0: L + bx0 - 4, x1: L + bx1 + 4, y1: street, doorCx, street, W });
  // ---- 7. the room on top, then the doorstep outside the door (street, a step)
  const outside = p.clone();
  p.blit(room, L, T);
  for (let y = T + H - 5; y < T + H; y++) for (let x = doorCx - 8; x < doorCx + 8; x++) p.set(x, y, outside.get(x, y));
  // a worn concrete step in front of the door
  for (let x = doorCx - 9; x <= doorCx + 8; x++) {
    p.set(x, T + H - 5, x === doorCx - 9 ? P.steel : P.concreteLt);
    p.set(x, T + H - 4, x === doorCx - 9 || x === doorCx + 8 ? P.steel : P.concrete);
    p.set(x, T + H - 3, P.asphalt);
  }
  for (let x = doorCx - 7; x < doorCx + 7; x += 5) p.set(x, T + H - 4, P.steel);
  const g2 = new PixelCanvas(EW, EH);
  g2.blit(glass, L, T);
  return { p, glass: g2, ox: -L, oy: -T, W, H, doorX: doorCx - L, streetY: street - T };
}

/** A still, stage-0 environment for baking the town's props once. */
function bakeEnv(seed: number): PropEnv {
  return { t: 0, stage: 0, grade: GRADES[0], motion: 1, mt: 0, flag: () => 0, seed, near: 999, px: -999, py: -999 };
}

/**
 * Draw the town's props (their image and over() parts: lanterns, flags) into
 * a scratch canvas at their tiles and lay the result into the exterior.
 */
function bakeTownProps(p: PixelCanvas, list: NonNullable<ExteriorSpec['props']>, xOf: (tx: number) => number, yOf: (ty: number) => number): void {
  const [c, ctx] = makeCanvas(p.w, p.h, { willReadFrequently: true });
  const g = new Gfx(ctx, p.w, p.h);
  list.forEach((o, i) => {
    const x = xOf(o.tx);
    const y = yOf(o.ty) + (o.dy ?? 0);
    if (o.sprite) {
      // a field character standing on the tile (feet at the tile's bottom centre)
      const img = idleFrame(charSprite(o.id), 'down', 0);
      ctx.drawImage(img, Math.round(x + 8 - img.width / 2), Math.round(y + 16 - img.height));
      return;
    }
    const a = getProp(o.id, o.opts ?? {});
    if (!a) return;
    const env = bakeEnv(i * 7 + 3);
    const img = a.img(env);
    if (img) ctx.drawImage(img, x + a.ox, y + a.oy);
    a.over?.(g, x, y, env);
  });
  const d = new Uint32Array(ctx.getImageData(0, 0, p.w, p.h).data.buffer);
  for (let i = 0; i < d.length; i++) if (d[i] >>> 24 > 127) p.data[i] = (d[i] | 0xff000000) >>> 0;
  void c;
}

/**
 * Evening shade over everything outside, then flat steps down into the
 * night: brightest round the door and along the building, joined by 1–2px
 * checker bands (never smooth gradients or scattered noise).
 */
function shadeAndFade(p: PixelCanvas, o: { x0: number; x1: number; y1: number; doorCx: number; street: number; W: number }): void {
  const night = rgba32(P.night);
  const [nr, ng, nb] = [0x1b, 0x17, 0x33];
  const STEPS = [0.28, 0.48, 0.68, 0.86, 1];
  const level = (x: number, y: number): number => {
    // distance from the building's outline (0 on it)
    const dx = x < o.x0 ? o.x0 - x : x >= o.x1 ? x - o.x1 + 1 : 0;
    const dy = y > o.y1 ? y - o.y1 : 0;
    const dB = Math.hypot(dx, dy);
    // the street round the door: an ellipse wider than it is deep
    const ex = (x - o.doorCx) / (o.W * 0.5 + 34);
    const ey = (y - o.street - 4) / 40;
    const dD = Math.hypot(ex, ey);
    const t = Math.min(dB / 30, Math.max(0, dD - 0.35) * 1.6);
    return Math.max(0, Math.min(STEPS.length - 1, t * 2.4));
  };
  for (let y = 0; y < p.h; y++)
    for (let x = 0; x < p.w; x++) {
      const v = p.get(x, y);
      if (v >>> 24 === 0) {
        p.set(x, y, night);
        continue;
      }
      const s = level(x, y);
      let k = Math.floor(s);
      // a checker band at the top of each step
      if (s - k > 0.82 && ((x + y) & 1) === 0) k++;
      const a = STEPS[Math.min(STEPS.length - 1, k)];
      const r = v & 255;
      const g = (v >>> 8) & 255;
      const b = (v >>> 16) & 255;
      // evening shade: towards #3A2B5C first, then into the night
      const sr = r + (0x3a - r) * 0.22;
      const sg = g + (0x2b - g) * 0.22;
      const sb = b + (0x5c - b) * 0.22;
      const rr = Math.round(sr + (nr - sr) * a);
      const gg = Math.round(sg + (ng - sg) * a);
      const bb = Math.round(sb + (nb - sb) * a);
      p.set(x, y, ((255 << 24) | (bb << 16) | (gg << 8) | rr) >>> 0);
    }
}

/**
 * Run-time light outside (call first thing in the shell's over()): the stage's
 * outdoor grade over the street and the roofs (the room keeps the indoor one),
 * then the shop's warm light thrown out of the door onto the street.
 */
export function exteriorOver(g: Gfx, x: number, y: number, e: Exterior, env: PropEnv, o: { spill?: string; spillA?: number } = {}): void {
  const ctx = g.ctx;
  const X = Math.round(x);
  const Y = Math.round(y);
  const n = env.grade.night;
  ctx.save();
  // everything but the building's inside (the sections and the room stay as they are)
  const path = new Path2D();
  path.rect(X + e.ox, Y + e.oy, e.p.w, e.p.h);
  path.rect(X + 12, Y, e.W - 24, e.H - 12);
  ctx.clip(path, 'evenodd');
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = css(env.grade.mul);
  ctx.fillRect(X + e.ox, Y + e.oy, e.p.w, e.p.h);
  ctx.restore();
  // the shop's light out of the door onto the street (stronger as night falls)
  const a = (o.spillA ?? 0.3) + n * 0.45;
  tintSpill(g, X + e.doorX, Y + e.streetY - 1, 16, 46, 36, o.spill ?? P.sky, a);
}
