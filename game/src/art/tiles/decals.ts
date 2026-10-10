// Ground decals baked into the ground chunks (30_level_art 6.1 / 6.3):
//  - random layer: cracks, patches, oil stains, gum, joint weeds, bottle caps
//  - clump layer: fallen leaves under trees, moss at wall feet, road-edge dust
//  - hand-placed: manholes, white lines, road text, green school-route belt,
//    parking stalls, tyre marks, arrows.
// Everything is deterministic per world position and drawn only with the
// master palette.

import { PixelCanvas, mix, rgba32 } from '../../engine/pixel';
import type { Ground } from '../../world/types';
import { h01, ihash, valueNoise } from './noise';
import { P } from './palette';
import { fontText, fontTextSmall, tiny } from '../props/text';
import { dirtWear, paintHDecal, roadWear, type HDecalKind } from './hoshi_decals';

export type DecalKind =
  | 'manhole'
  | 'whiteline'
  | 'tomare'
  | 'greenbelt'
  | 'parking'
  | 'tire'
  | 'arrow'
  | 'stopline'
  | 'tactile'
  | 'drain'
  | 'leafdrift'
  | 'seamweeds'
  | 'flyer'
  | 'oilpool'
  | 'footprints'
  | HDecalKind;

export interface GroundDecal {
  k: DecalKind;
  /** Tile coords (top-left). */
  x: number;
  y: number;
  /** Size in tiles where relevant. */
  w?: number;
  h?: number;
  /** Variant / options. */
  v?: number;
  dir?: 'h' | 'v';
}

const c = rgba32;
const OIL = mix(P.asphalt, P.nightShade, 0.22);
const OIL2 = mix(P.asphalt, P.lilac, 0.28);
const LINE = P.concreteLt;
const LINE_W = mix(P.concreteLt, P.asphalt, 0.35);
const BELT = mix(P.leafDeep, P.asphalt, 0.45);
const BELT_LT = mix(P.leafDeep, P.asphalt, 0.3);

/** Writer that clips to the chunk and converts world px → chunk px. */
export class DecalPen {
  constructor(
    readonly pc: PixelCanvas,
    readonly x0: number,
    readonly y0: number,
  ) {}
  set(wx: number, wy: number, col: string | number): void {
    const x = wx - this.x0;
    const y = wy - this.y0;
    if (x < 0 || y < 0 || x >= this.pc.w || y >= this.pc.h) return;
    this.pc.data[y * this.pc.w + x] = typeof col === 'number' ? col : c(col);
  }
  get(wx: number, wy: number): number {
    return this.pc.get(wx - this.x0, wy - this.y0);
  }
  rect(wx: number, wy: number, w: number, h: number, col: string): void {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(wx + i, wy + j, col);
  }
  /** Darken by swapping known colours to their shade. */
  shade(wx: number, wy: number, map: Map<number, number>): void {
    const v = this.get(wx, wy);
    const d = map.get(v);
    if (d !== undefined) this.set(wx, wy, d);
  }
}

// ---- random layer ---------------------------------------------------------------

function crack(pen: DecalPen, tx: number, ty: number, seed: number): void {
  const h = ihash(tx, ty, seed);
  let x = tx * 16 + 2 + (h % 12);
  let y = ty * 16 + 2 + ((h >>> 4) % 12);
  const len = 7 + ((h >>> 8) % 10);
  let dx = (h >>> 12) & 1 ? 1 : -1;
  for (let k = 0; k < len; k++) {
    pen.set(x, y, P.charcoal);
    pen.set(x - 1, y - 1, mix(P.asphalt, P.steel, 0.3));
    const r = ihash(k, h, 7) % 5;
    if (r < 2) x += dx;
    else if (r < 4) y += 1;
    else {
      x += dx;
      y += 1;
    }
    if (k === Math.floor(len / 2)) {
      // branch
      let bx = x;
      let by = y;
      for (let j = 0; j < 4; j++) {
        bx -= dx;
        by += j % 2;
        pen.set(bx, by, P.charcoal);
      }
      dx = -dx;
    }
  }
}

function patch(pen: DecalPen, tx: number, ty: number, seed: number): void {
  const h = ihash(tx, ty, seed);
  const w = 9 + (h % 5);
  const hh = 7 + ((h >>> 4) % 4);
  const x = tx * 16 + ((h >>> 8) % Math.max(1, 16 - w));
  const y = ty * 16 + ((h >>> 12) % Math.max(1, 16 - hh));
  const dk = mix(P.asphalt, P.charcoal, 0.22);
  for (let j = 0; j < hh; j++)
    for (let i = 0; i < w; i++) {
      let col = dk;
      if (j === 0 || i === 0) col = mix(P.asphalt, P.steel, 0.3);
      else if (j === hh - 1 || i === w - 1) col = mix(P.asphalt, P.charcoal, 0.45);
      else if (ihash(x + i, y + j, 5) % 9 === 0) col = P.asphalt;
      pen.set(x + i, y + j, col);
    }
}

function oil(pen: DecalPen, tx: number, ty: number, seed: number): void {
  const h = ihash(tx, ty, seed);
  const cx = tx * 16 + 5 + (h % 6);
  const cy = ty * 16 + 5 + ((h >>> 4) % 6);
  for (let j = -2; j <= 2; j++)
    for (let i = -4; i <= 4; i++) {
      const d = (i * i) / 16 + (j * j) / 5;
      if (d > 1) continue;
      if (d > 0.6 && ihash(i, j, h) % 2) continue;
      pen.set(cx + i, cy + j, d > 0.5 && i === -j ? OIL2 : OIL);
    }
}

function gum(pen: DecalPen, tx: number, ty: number, seed: number): void {
  const h = ihash(tx, ty, seed);
  const x = tx * 16 + 2 + (h % 12);
  const y = ty * 16 + 2 + ((h >>> 4) % 12);
  pen.set(x, y, P.charcoal);
  pen.set(x + 1, y, P.ink);
  pen.set(x, y + 1, P.ink);
  pen.set(x + 1, y + 1, P.charcoal);
}

function jointWeed(pen: DecalPen, tx: number, ty: number, seed: number): void {
  const h = ihash(tx, ty, seed);
  const x = tx * 16 + 3 + (h % 10);
  const y = ty * 16 + 14;
  pen.set(x, y, P.leafDeep);
  pen.set(x + 1, y, P.leaf);
  pen.set(x, y - 1, P.leaf);
  pen.set(x + 1, y - 2, P.leafYoung);
  pen.set(x - 1, y - 1, P.leafYoung);
}

function bottleCap(pen: DecalPen, tx: number, ty: number, seed: number): void {
  const h = ihash(tx, ty, seed);
  const x = tx * 16 + 3 + (h % 10);
  const y = ty * 16 + 3 + ((h >>> 4) % 10);
  pen.set(x, y, P.goldPale);
  pen.set(x + 1, y, P.brass);
  pen.set(x, y + 1, P.brass);
  pen.set(x + 1, y + 1, P.brassOld);
}

const LEAF_COLS = [P.leaf, P.leafYoung, P.goldPale, P.leafDeep, P.brass];

function leaf(pen: DecalPen, x: number, y: number, h: number): void {
  const col = h % 53 === 0 ? P.red : LEAF_COLS[h % LEAF_COLS.length];
  pen.set(x, y, col);
  pen.set(x + 1, y, col);
  pen.set(x + 1, y + 1, mix(col, P.nightShade, 0.35));
  if (h & 16) pen.set(x, y - 1, col);
}

export interface DecalContext {
  ground(tx: number, ty: number): Ground;
  /** Tree canopy centres (world px) and radii for the leaf litter. */
  trees: [number, number, number][];
  /** Is this tile a wall / hedge / building foot (moss / dust grow next to it)? */
  wallAt(tx: number, ty: number): boolean;
  decals: GroundDecal[];
  seed: number;
  map: string;
}

/** Paint all decals over the chunk rect (world px x0,y0,w,h). */
export function paintDecals(pc: PixelCanvas, x0: number, y0: number, w: number, h: number, ctx: DecalContext): void {
  const pen = new DecalPen(pc, x0, y0);
  const tx0 = Math.floor(x0 / 16) - 1;
  const ty0 = Math.floor(y0 / 16) - 1;
  const tx1 = Math.floor((x0 + w) / 16) + 1;
  const ty1 = Math.floor((y0 + h) / 16) + 1;
  const s = ctx.seed;
  for (let ty = ty0; ty <= ty1; ty++)
    for (let tx = tx0; tx <= tx1; tx++) {
      const g = ctx.ground(tx, ty);
      const r = h01(tx + 97, ty + 13, s);
      const r2 = h01(tx + 31, ty + 57, s + 1);
      if (g === 'asphalt' || g === 'lot') {
        if (r < 0.07) crack(pen, tx, ty, s + 3);
        else if (r < 0.1) patch(pen, tx, ty, s + 5);
        else if (r < (g === 'lot' ? 0.17 : 0.14)) oil(pen, tx, ty, s + 7);
        if (r2 < 0.012 * (g === 'lot' ? 1 : 1)) gum(pen, tx, ty, s + 9);
        if (r2 > 0.97) bottleCap(pen, tx, ty, s + 11);
      } else if (g === 'sidewalk' || g === 'plaza' || g === 'bridge') {
        if (r < 0.06) crack(pen, tx, ty, s + 13);
        if (r2 < 0.08) jointWeed(pen, tx, ty, s + 15);
        if (r2 > 0.985) gum(pen, tx, ty, s + 17);
      } else if (g === 'arcade') {
        if (r2 < 0.03) gum(pen, tx, ty, s + 19);
      } else if (g === 'dirt') {
        if (ctx.map.startsWith('map_hoshi')) dirtWear(pen, tx, ty, s + 27);
        else if (r2 < 0.01) bottleCap(pen, tx, ty, s + 21);
      } else if (g === 'gutter') {
        if (r2 < 0.1) jointWeed(pen, tx, ty, s + 23);
      } else if ((g as string) === 'h_road') roadWear(pen, tx, ty, s + 25);
    }
  // clump layer: leaves under trees
  for (const [cx, cy, rad] of ctx.trees) {
    if (cx + rad < x0 || cx - rad > x0 + w || cy + rad < y0 || cy - rad > y0 + h) continue;
    for (let y = Math.max(y0, cy - rad); y < Math.min(y0 + h, cy + rad); y += 3)
      for (let x = Math.max(x0, cx - rad); x < Math.min(x0 + w, cx + rad); x += 3) {
        const d = Math.hypot((x - cx) / rad, (y - cy) / (rad * 0.8));
        if (d > 1) continue;
        const n = valueNoise(x / 9, y / 9, 1501);
        const hh = ihash(x, y, 1503);
        if (n > 0.45 + d * 0.3 && hh % 4 === 0) {
          const g = ctx.ground(Math.floor(x / 16), Math.floor(y / 16));
          if (g === 'water' || g === 'paddy' || g === 'hedge' || g === 'none') continue;
          leaf(pen, x + (hh & 1), y + ((hh >>> 1) & 1), hh);
        }
      }
  }
  // moss / dust at the foot of walls (the tile below a wall)
  for (let ty = ty0; ty <= ty1; ty++)
    for (let tx = tx0; tx <= tx1; tx++) {
      if (!ctx.wallAt(tx, ty - 1) || ctx.wallAt(tx, ty)) continue;
      const g = ctx.ground(tx, ty);
      for (let i = 0; i < 16; i++) {
        const x = tx * 16 + i;
        const n = valueNoise(x / 5, ty, 1511);
        if (g === 'asphalt' || g === 'gravel' || g === 'sidewalk' || g === 'gutter') {
          if (n > 0.55) pen.set(x, ty * 16, (x & 1) ? P.leafDeep : P.leafShade);
          if (n > 0.7) pen.set(x, ty * 16 + 1, P.leafDeep);
        }
      }
    }
  // hand-placed
  for (const d of ctx.decals) {
    const dw = (d.w ?? 1) * 16;
    const dh = (d.h ?? 1) * 16;
    if (d.x * 16 > x0 + w + 32 || d.y * 16 > y0 + h + 32 || d.x * 16 + dw < x0 - 32 || d.y * 16 + dh < y0 - 32) continue;
    if (!paintHDecal(pen, d)) PAINT[d.k]?.(pen, d);
  }
}

let ROAD: PixelCanvas | null = null;
function roadText(): PixelCanvas {
  if (!ROAD) {
    ROAD = new PixelCanvas(52, 16);
    fontText(ROAD, '止まれ', 1, 1, '#ffffff');
  }
  return ROAD;
}

let SCHOOL: PixelCanvas | null = null;
function schoolRoute(): PixelCanvas {
  if (!SCHOOL) {
    SCHOOL = new PixelCanvas(28, 9);
    fontTextSmall(SCHOOL, '通学路', 0, 0, '#ffffff', 2);
  }
  return SCHOOL;
}

const NUMS = new Map<number, PixelCanvas>();
/** A stall number in the 3×5 font, doubled to 2px strokes like road paint. */
function stallNumber(n: number): PixelCanvas {
  let c = NUMS.get(n);
  if (!c) {
    const s = String(n);
    const src = new PixelCanvas(s.length * 4, 5);
    tiny(src, s, 0, 0, '#ffffff');
    c = new PixelCanvas(src.w * 2, 10);
    for (let j = 0; j < 5; j++) for (let i = 0; i < src.w; i++) if (src.alpha(i, j)) c.rect(i * 2, j * 2, 2, 2, '#ffffff');
    NUMS.set(n, c);
  }
  return c;
}

/** A dark oil stain soaked into the asphalt, with an oily sheen (lilac / aqua) on one side. */
function oilStain(pen: DecalPen, cx: number, cy: number, seed: number): void {
  const rx = 5 + (ihash(seed, 1, 1581) % 4);
  const ry = 3 + (ihash(seed, 2, 1581) % 2);
  for (let j = -ry; j <= ry; j++)
    for (let i = -rx; i <= rx; i++) {
      const wob = 1 + 0.25 * Math.sin(Math.atan2(j, i) * 3 + seed);
      const d = Math.hypot(i / rx, j / ry) / wob;
      if (d > 1) continue;
      if (d > 0.75 && (i + j + seed) % 2) continue;
      pen.set(cx + i, cy + j, d < 0.45 ? mix(P.asphalt, P.night, 0.42) : OIL);
    }
  pen.set(cx - 2, cy - 1, OIL2);
  pen.set(cx - 1, cy - 1, mix(P.asphalt, P.aqua, 0.25));
  pen.set(cx + 1, cy - 2, OIL2);
}

// ---- hand-placed painters ------------------------------------------------------------

const PAINT: Partial<Record<DecalKind, (pen: DecalPen, d: GroundDecal) => void>> = {
  manhole(pen, d) {
    const cx = d.x * 16 + 8;
    const cy = d.y * 16 + 8;
    for (let j = -8; j <= 8; j++)
      for (let i = -8; i <= 8; i++) {
        const r = Math.hypot(i + 0.5, j + 0.5);
        if (r > 7.6) continue;
        let col: string = P.asphalt;
        if (r > 6.6) col = i + j < 0 ? P.steel : P.charcoal;
        else if (r > 5.8) col = P.charcoal;
        else {
          // emblem: bell ring (or the one hanamaru cover)
          const flower = d.v === 1;
          const a = Math.atan2(j, i);
          const petal = flower ? Math.abs(Math.sin(a * 4)) : Math.abs(Math.sin(a * 6));
          const ring = r > 3 && r < 4.4;
          const grid = ((i + 8) % 3 === 0 || (j + 8) % 3 === 0) && r > 4.4;
          if (ring || (flower && r < 3 && petal > 0.5)) col = P.steel;
          else if (grid) col = P.charcoal;
          else col = r < 2 && !flower ? P.steel : P.asphalt;
        }
        pen.set(cx + i, cy + j, col);
      }
    // lit top-left edge
    for (let a = 2.4; a < 4.0; a += 0.12) pen.set(Math.round(cx + Math.cos(a) * 7), Math.round(cy + Math.sin(a) * 7), P.concrete);
  },
  whiteline(pen, d) {
    // along x (h) or y (v); 2px line with worn gaps every ~8 tiles
    const len = (d.dir === 'v' ? d.h ?? 1 : d.w ?? 1) * 16;
    for (let k = 0; k < len; k++) {
      const wx = d.dir === 'v' ? d.x * 16 + 7 : d.x * 16 + k;
      const wy = d.dir === 'v' ? d.y * 16 + k : d.y * 16 + (d.v ?? 13);
      const gap = (Math.floor(k / 16) % 8 === 5 && k % 16 > 6 && k % 16 < 6 + 2 + (k % 3)) || valueNoise(k / 3, d.y, 1521) < 0.12;
      if (gap) continue;
      const worn = valueNoise(k / 2, d.x, 1523) < 0.25;
      for (let t = 0; t < 2; t++) {
        const px = d.dir === 'v' ? wx + t : wx;
        const py = d.dir === 'v' ? wy : wy + t;
        pen.set(px, py, worn ? LINE_W : t === 0 ? LINE : P.concrete);
      }
    }
  },
  stopline(pen, d) {
    for (let k = 0; k < (d.w ?? 1) * 16; k++)
      for (let t = 0; t < 3; t++) if (valueNoise(k / 3, t, 1531) > 0.18) pen.set(d.x * 16 + k, d.y * 16 + (d.v ?? 1) + t, t === 2 ? P.concrete : LINE);
  },
  tomare(pen, d) {
    // 止まれ, road lettering (white, worn by tyres), read from the south
    const txt = roadText();
    const x0 = d.x * 16 + Math.floor(((d.w ?? 2) * 16 - txt.w) / 2);
    const y0 = d.y * 16;
    for (let j = 0; j < txt.h; j++)
      for (let i = 0; i < txt.w; i++) {
        if (!txt.alpha(i, j)) continue;
        if (valueNoise((x0 + i) / 2.5, (y0 + j) / 2.5, 1541) < 0.2) continue;
        pen.set(x0 + i, y0 + j, j % 3 === 2 ? P.concrete : LINE);
      }
  },
  greenbelt(pen, d) {
    const len = (d.w ?? 1) * 16;
    for (let k = 0; k < len; k++)
      for (let t = 0; t < 7; t++) {
        const x = d.x * 16 + k;
        const y = d.y * 16 + t;
        if (t === 6) {
          pen.set(x, y, valueNoise(k / 3, 0, 1551) < 0.15 ? LINE_W : LINE);
          continue;
        }
        const fade = valueNoise(k / 7, t / 3, 1553);
        pen.set(x, y, fade > 0.72 ? mix(P.asphalt, P.steel, 0.3) : fade > 0.45 ? BELT_LT : BELT);
      }
    // 通学路 lettering every 13 tiles
    const txt = schoolRoute();
    for (let k = 3; k < (d.w ?? 1); k += 13) {
      const x = (d.x + k) * 16;
      const y = d.y * 16 - 1;
      for (let j = 0; j < txt.h; j++)
        for (let i = 0; i < txt.w; i++) if (txt.alpha(i, j) && valueNoise(i / 2, j + k, 1557) > 0.18) pen.set(x + i, y + j, LINE);
    }
  },
  parking(pen, d) {
    // stall lines: vertical 1px lines every 40px, h tiles tall, fading per stall
    const w = (d.w ?? 1) * 16;
    const h = (d.h ?? 1) * 16;
    const top = d.v === 1; // stall row opens to the north (line on the south end)
    for (let k = 0; k <= w; k += 40) {
      const stall = Math.floor(k / 40);
      const fade = (ihash(stall, d.y, 1561) % 5) / 5;
      for (let j = 0; j < h; j++) {
        if (valueNoise((d.x * 16 + k) / 2, (d.y * 16 + j) / 3, 1563 + stall) < 0.15 + fade * 0.5) continue;
        pen.set(d.x * 16 + k, d.y * 16 + j, j % 7 === 0 ? LINE_W : LINE);
        pen.set(d.x * 16 + k + 1, d.y * 16 + j, LINE_W);
      }
    }
    // end line
    const ey = top ? d.y * 16 + h - 1 : d.y * 16;
    for (let k = 0; k < w; k++) if (valueNoise(k / 3, d.y, 1565) > 0.3) pen.set(d.x * 16 + k, ey, LINE_W);
    // (QA round 1) the stall numbers painted at the open end, sun-faded and
    // worn by tyres; and each stall's own oil stain where a car stood for years
    for (let k = 0; k + 40 <= w; k += 40) {
      const stall = Math.floor(k / 40);
      const n = (d.v === 1 ? 20 : 1) + stall;
      const img = stallNumber(n);
      const nx = d.x * 16 + k + 20 - Math.floor(img.w / 2);
      const ny = top ? d.y * 16 + 3 : d.y * 16 + h - 9;
      const fade = ihash(stall, d.y, 1567) % 3;
      for (let j = 0; j < img.h; j++)
        for (let i = 0; i < img.w; i++) {
          if (!img.alpha(i, j)) continue;
          if (valueNoise((nx + i) / 1.8, (ny + j) / 1.8, 1569) < 0.18 + fade * 0.12) continue;
          pen.set(nx + i, ny + j, fade === 2 ? LINE_W : LINE);
        }
      if (ihash(stall, d.y, 1571) % 3 !== 0) oilStain(pen, d.x * 16 + k + 14 + (ihash(stall, 1, 1573) % 10), d.y * 16 + Math.floor(h / 2) + (top ? -3 : 2), 1575 + stall);
    }
  },
  footprints(pen, d) {
    // boot prints pressed into the ridge path (畦道), in pairs, walking along it
    const horiz = d.dir !== 'v';
    const len = (horiz ? d.w ?? 1 : d.h ?? 1) * 16;
    const dark = mix(P.brassOld, P.wood, 0.45);
    for (let k = 3; k < len - 3; k += 7) {
      const hh = ihash(k, d.x * 31 + d.y, 1631);
      if (hh % 5 === 0) continue;
      const side = (Math.floor(k / 7) & 1) ? 2 : -2;
      const x = horiz ? d.x * 16 + k : d.x * 16 + 8 + side;
      const y = horiz ? d.y * 16 + 8 + side : d.y * 16 + k;
      // a 2×3 sole and a heel, the rim pushed up lighter
      pen.set(x, y, dark);
      pen.set(horiz ? x + 1 : x, horiz ? y : y + 1, dark);
      pen.set(horiz ? x + 3 : x, horiz ? y : y + 3, dark);
      pen.set(horiz ? x : x - 1, horiz ? y - 1 : y, mix(P.woodLt, P.goldPale, 0.3));
    }
  },
  oilpool(pen, d) {
    oilStain(pen, d.x * 16 + 8, d.y * 16 + 8, 1601 + d.x);
  },
  leafdrift(pen, d) {
    // fallen leaves blown into a drift against an edge (v: 0 south edge, 1 north, 2 west, 3 east)
    const w = (d.w ?? 1) * 16;
    const h = (d.h ?? 1) * 16;
    const edge = d.v ?? 0;
    for (let j = 0; j < h; j += 1)
      for (let i = 0; i < w; i += 1) {
        const t = edge === 0 ? j / h : edge === 1 ? 1 - j / h : edge === 2 ? 1 - i / w : i / w;
        const n = valueNoise((d.x * 16 + i) / 6, (d.y * 16 + j) / 4, 1611);
        const hh = ihash(d.x * 16 + i, d.y * 16 + j, 1613);
        if (hh % 5 !== 0 || n + t * 0.7 < 0.95) continue;
        leaf(pen, d.x * 16 + i, d.y * 16 + j, hh);
      }
  },
  seamweeds(pen, d) {
    // a sealed seam in the paving with weeds growing all along it
    const horiz = d.dir !== 'v';
    const len = (horiz ? d.w ?? 1 : d.h ?? 1) * 16;
    for (let k = 0; k < len; k++) {
      const x = horiz ? d.x * 16 + k : d.x * 16 + 8;
      const y = horiz ? d.y * 16 + 8 : d.y * 16 + k;
      pen.set(x, y, mix(P.asphalt, P.charcoal, 0.45));
      if (valueNoise(k / 4, d.x + d.y, 1621) > 0.4) pen.set(horiz ? x : x + 1, horiz ? y + 1 : y, mix(P.asphalt, P.steel, 0.35));
      const hh = ihash(k, d.y, 1623);
      if (hh % 5 === 0) {
        // a tuft: 2–3 blades with a lit tip
        const hgt = 2 + (hh >>> 4) % 3;
        for (let b = 0; b < hgt; b++) {
          pen.set(x - ((hh >>> 7) & 1), y - b, b === hgt - 1 ? P.leafYoung : P.leafDeep);
          if (b < hgt - 1) pen.set(x + 1, y - b, P.leaf);
        }
        if ((hh >>> 9) % 7 === 0) pen.set(x, y - hgt, P.gold);
      }
    }
  },
  flyer(pen, d) {
    // a supermarket flyer blown into the lot: a skewed sheet with a red
    // header band, price blocks and small print, one corner folded under
    const x0 = d.x * 16 + 3;
    const y0 = d.y * 16 + 4;
    const sk = d.v === 1 ? -1 : 1;
    for (let j = 0; j < 8; j++)
      for (let i = 0; i < 10; i++) {
        if (i === 9 && j === 7) continue;
        const x = x0 + i + (j > 3 ? sk : 0);
        const y = y0 + j;
        let col: string = P.paper;
        if (j <= 1) col = P.red;
        else if (j === 3 && i >= 1 && i <= 4) col = P.gold;
        else if (j === 3 && i >= 6 && i <= 8) col = P.verm;
        else if ((j === 5 || j === 6) && i >= 1 && i <= 8 && (i + j) % 3) col = P.steel;
        if (i === 0 || j === 7) col = j === 7 ? P.paperGrid : col === P.paper ? P.white : col;
        pen.set(x, y, col);
      }
    pen.set(x0 + 9 + sk, y0 + 7, P.paperGrid);
    for (let i = 0; i < 10; i++) pen.set(x0 + i + 1 + sk, y0 + 8, mix(P.asphalt, P.charcoal, 0.4));
  },
  arrow(pen, d) {
    // faded aisle arrow pointing east (or west with v=1)
    const G = ['.....#....', '.....##...', '#########.', '##########', '#########.', '.....##...', '.....#....'];
    for (let j = 0; j < 7; j++)
      for (let i = 0; i < 10; i++) {
        const gi = d.v === 1 ? 9 - i : i;
        if (G[j][gi] !== '#') continue;
        if (valueNoise(i / 2, j / 2 + d.x, 1571) < 0.3) continue;
        pen.set(d.x * 16 + 3 + i * 2, d.y * 16 + 4 + j, LINE_W);
        pen.set(d.x * 16 + 4 + i * 2, d.y * 16 + 4 + j, LINE_W);
      }
  },
  tire(pen, d) {
    // two darker curving tracks across the rect
    const w = (d.w ?? 1) * 16;
    const h = (d.h ?? 1) * 16;
    for (let k = 0; k < w; k++) {
      const y = d.y * 16 + Math.round(h * 0.35 + Math.sin(k / 23 + (d.v ?? 0)) * h * 0.25);
      for (const off of [0, 7]) {
        if (valueNoise(k / 4, off, 1581) < 0.3) continue;
        const x = d.x * 16 + k;
        const cur = pen.get(x, y + off);
        pen.set(x, y + off, cur === c(P.woodLt) || cur === c(P.paperGrid) ? mix(P.woodLt, P.brassOld, 0.5) : mix(P.asphalt, P.charcoal, 0.35));
      }
    }
  },
  tactile(pen, d) {
    // yellow tactile paving (点字ブロック)
    const w = (d.w ?? 1) * 16;
    const h = d.dir === 'v' ? (d.h ?? 1) * 16 : 8;
    const ww = d.dir === 'v' ? 8 : w;
    for (let j = 0; j < h; j++)
      for (let i = 0; i < ww; i++) {
        const lx = i % 8;
        const ly = j % 8;
        let col: string = P.brass;
        if (lx === 7 || ly === 7) col = P.brassOld;
        else if ((lx === 2 || lx === 5) && (ly === 2 || ly === 5)) col = P.goldPale;
        pen.set(d.x * 16 + i, d.y * 16 + j, col);
      }
  },
  drain(pen, d) {
    const x = d.x * 16 + 3;
    const y = d.y * 16 + 4;
    pen.rect(x, y, 10, 8, P.charcoal);
    for (let i = 0; i < 10; i += 2) for (let j = 0; j < 8; j++) pen.set(x + i, y + j, P.steel);
    for (let i = 0; i < 10; i++) pen.set(x + i, y, P.concreteLt);
  },
};
