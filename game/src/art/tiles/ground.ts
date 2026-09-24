// Procedural ground art. Every pixel is computed in world space, so no two
// tiles are ever identical: each material has per-tile variants (hash2 with
// a "don't repeat the left/up neighbour" rule) that shift its pattern, plus
// random and clumped decals. Soft materials (grass, dirt, sand...) meet with
// warped, organic borders; paved ones meet with straight curbs.
//
// bakeGround(src, x0, y0, w, h) returns a canvas of that world-pixel rect.

import { PixelCanvas, mix, rgba32 } from '../../engine/pixel';
import type { Ground } from '../../world/types';
import { fbm, h01, ihash, valueNoise } from './noise';
import { P } from './palette';
import { paintDecals, type DecalContext } from './decals';

export interface GroundSource {
  /** Map size in tiles. */
  w: number;
  h: number;
  ground(tx: number, ty: number): Ground;
  /** Art theme of a tile ('park', 'mallfront', 'home', ...). */
  theme(tx: number, ty: number): string;
  seed: number;
  /** Decal layers painted over the baked materials. */
  decals?: DecalContext;
}

const c = (hex: string) => rgba32(hex);
const C = {
  asphalt: c(P.asphalt),
  asphaltLt: c(mix(P.asphalt, P.steel, 0.3)),
  asphaltDk: c(mix(P.asphalt, P.charcoal, 0.28)),
  steel: c(P.steel),
  charcoal: c(P.charcoal),
  concrete: c(P.concrete),
  concreteLt: c(P.concreteLt),
  concreteMd: c(mix(P.concrete, P.steel, 0.4)),
  white: c(P.white),
  leafLt: c(P.leafLt),
  leafYoung: c(P.leafYoung),
  leaf: c(P.leaf),
  leafDeep: c(P.leafDeep),
  leafShade: c(P.leafShade),
  woodLt: c(P.woodLt),
  wood: c(P.wood),
  woodDark: c(P.woodDark),
  brassOld: c(P.brassOld),
  brass: c(P.brass),
  paperGrid: c(P.paperGrid),
  goldPale: c(P.goldPale),
  skin4: c(P.skin4),
  skin3: c(P.skin3),
  maroon: c(P.maroon),
  ink: c(P.ink),
  night: c(P.night),
  nightShade: c(P.nightShade),
  shade: c(P.shade),
  dirt: c(mix(P.woodLt, P.brassOld, 0.25)),
  dirtLt: c(P.woodLt),
  dirtDk: c(mix(P.brassOld, P.wood, 0.35)),
  sand: c(P.paperGrid),
  sandDk: c(mix(P.paperGrid, P.woodLt, 0.55)),
  lot: c(mix(P.asphalt, P.steel, 0.12)),
  crimson: c(P.crimson),
  verm: c(P.verm),
  gold: c(P.gold),
  navy: c(P.navy),
  aqua: c(P.aqua),
  paper: c(P.paper),
  tatami: c(mix(P.leafYoung, P.goldPale, 0.55)),
  tatamiDk: c(mix(P.leafYoung, P.brass, 0.45)),
  tatamiLt: c(mix(P.goldPale, P.paper, 0.35)),
  floorWood: c(mix(P.wood, P.woodLt, 0.45)),
  floorWoodLt: c(mix(P.woodLt, P.goldPale, 0.25)),
  floorWoodDk: c(P.wood),
  kitchen: c(mix(P.concreteLt, P.paperGrid, 0.5)),
  arcGrout: c(mix(P.skin4, P.wood, 0.55)),
  terra: c(P.skin4),
  terraLt: c(P.skin3),
  terraDk: c(mix(P.skin4, P.wood, 0.3)),
  cream: c(P.paperGrid),
  creamLt: c(P.paper),
  brick: c(P.wood),
  brickLt: c(mix(P.wood, P.skin4, 0.45)),
  gutterMd: c(mix(P.concrete, P.asphalt, 0.35)),
  gutterDk: c(mix(P.concrete, P.asphalt, 0.6)),
  kitchenDk: c(mix(P.concrete, P.paperGrid, 0.4)),
};

// Material priority: higher spreads over lower at soft borders.
const PRIO: Partial<Record<Ground, number>> = {
  water: 0, paddy: 1, asphalt: 2, lot: 2, crosswalk: 2, crossing: 2, gutter: 3, bridge: 4, sidewalk: 4, plaza: 4,
  arcade: 4, ballast: 3, rail: 3, gravel: 5, dirt: 6, sand: 7, grass: 8, weeds: 9, reeds: 9, hedge: 10,
};
const SOFT = new Set<Ground>(['grass', 'weeds', 'dirt', 'sand', 'gravel', 'reeds', 'hedge', 'paddy']);
// Paved materials that sit one step above the road and get a curb.
const RAISED = new Set<Ground>(['sidewalk', 'plaza', 'arcade', 'bridge']);
const ROADISH = new Set<Ground>(['asphalt', 'lot', 'crosswalk', 'gutter']);
const GREEN = new Set<Ground>(['grass', 'weeds', 'hedge', 'reeds']);

function amp(a: Ground, b: Ground): number {
  const sa = SOFT.has(a);
  const sb = SOFT.has(b);
  if (sa && sb) return 3.2;
  if (sa || sb) return 2.2;
  return 0;
}

const GIDS: Ground[] = [
  'none', 'asphalt', 'gutter', 'sidewalk', 'arcade', 'crosswalk', 'grass', 'weeds', 'dirt', 'sand', 'gravel', 'lot',
  'bridge', 'plaza', 'water', 'paddy', 'ballast', 'rail', 'crossing', 'hedge', 'reeds', 'wood', 'wood_bare', 'engawa',
  'tatami', 'kitchen', 'genkan', 'shopwood', 'tile_floor', 'mall', 'void',
];
const GINDEX = new Map(GIDS.map((g, i) => [g, i]));

// ---- per-tile variant with the no-repeat rule (6.1) --------------------------

function variantOf(src: GroundSource, tx: number, ty: number, n: number, depth = 0): number {
  const g = src.ground(tx, ty);
  let v = ihash(tx, ty, src.seed + 7) % n;
  if (depth > 1) return v;
  const l1 = src.ground(tx - 1, ty) === g ? variantOf(src, tx - 1, ty, n, depth + 1) : -1;
  const u1 = src.ground(tx, ty - 1) === g ? variantOf(src, tx, ty - 1, n, depth + 1) : -1;
  for (let k = 0; k < n && (v === l1 || v === u1); k++) v = (v + 1) % n;
  return v;
}

// ---- textures -----------------------------------------------------------------

type Tex = (x: number, y: number, v: number, th: string) => number;

/** Pebble / aggregate cluster test: is (x,y) inside the cluster of its cell? */
function cluster(x: number, y: number, cell: number, seed: number, p: number): number {
  const cx = Math.floor(x / cell);
  const cy = Math.floor(y / cell);
  const h = ihash(cx, cy, seed);
  if ((h & 1023) / 1024 >= p) return 0;
  const lx = x - cx * cell;
  const ly = y - cy * cell;
  const shape = (h >>> 10) & 3;
  const ox = (h >>> 12) % Math.max(1, cell - 1);
  const oy = (h >>> 16) % Math.max(1, cell - 1);
  const dx = lx - ox;
  const dy = ly - oy;
  let inside = false;
  if (shape === 0) inside = dy === 0 && (dx === 0 || dx === 1);
  else if (shape === 1) inside = dx >= 0 && dx <= 1 && dy >= 0 && dy <= 1;
  else if (shape === 2) inside = (dy === 0 && (dx === 0 || dx === 1)) || (dy === 1 && dx === 0);
  else inside = (dy === 0 && dx === 1) || (dy === 1 && (dx === 0 || dx === 1));
  if (!inside) return 0;
  return 1 + ((h >>> 20) & 3);
}

const texAsphalt: Tex = (x, y, v) => {
  const n = fbm(x / 30 + v * 3.1, y / 30, 31);
  let col = n > 0.74 ? C.asphaltLt : n < 0.22 ? C.asphaltDk : C.asphalt;
  const a = cluster(x, y, 4, 101 + v, 0.12);
  if (a === 1 || a === 2) col = C.steel;
  else if (a === 3) col = C.asphaltDk;
  else if (a === 4) col = n > 0.5 ? C.asphaltLt : C.charcoal;
  return col;
};

const texLot: Tex = (x, y, v) => {
  const n = fbm(x / 26 + v, y / 26, 47);
  let col = n > 0.6 ? C.asphaltLt : n < 0.28 ? C.asphalt : C.lot;
  const a = cluster(x, y, 4, 131 + v, 0.1);
  if (a === 1 || a === 2) col = C.steel;
  else if (a === 3) col = C.asphalt;
  else if (a === 4) col = C.concreteMd;
  return col;
};

const texGutter: Tex = (x, y, v, th) => {
  // Concrete U-channel lids flush with the road, one per tile: thin seams,
  // two small lifting notches; some are steel gratings or mossy / chipped.
  const lx = ((x % 16) + 16) % 16;
  const ly = ((y % 16) + 16) % 16;
  const kind = v; // 0 lid, 1 lid+moss, 2 grating, 3 chipped lid
  if (ly === 0 || ly === 15) return th === 'kawabe' ? C.gutterMd : C.gutterMd;
  if (lx === 15) return C.gutterDk; // seam
  if (lx === 0) return C.concreteLt;
  if (kind === 2) {
    if (ly >= 4 && ly <= 11 && lx >= 3 && lx <= 12) {
      if (ly === 4 || lx === 3) return C.asphalt;
      if (ly === 11 || lx === 12) return C.steel;
      return lx % 2 === 0 ? C.steel : C.charcoal;
    }
  } else {
    if (ly === 8 && (lx === 4 || lx === 5 || lx === 10 || lx === 11)) return C.gutterDk;
    if (kind === 3 && lx >= 11 && ly >= 11 && lx + ly > 24) return C.asphaltDk;
  }
  const n = fbm(x / 7, y / 7, 207 + v);
  let col = n > 0.7 ? C.concreteLt : n < 0.3 ? C.gutterMd : C.concrete;
  const s = cluster(x, y, 5, 211 + v, 0.14);
  if (s) col = s > 2 ? C.gutterMd : C.concreteLt;
  if (kind === 1 && ly > 9 && h01(x, y, 5) < 0.55 - (15 - ly) * 0.04) return (x + y) & 1 ? C.leafDeep : C.leaf;
  return col;
};

const texSidewalk: Tex = (x, y, v, th) => {
  if (th === 'mallfront') {
    // interlocking pavers 8×4, running bond, faded two-tone
    const row = Math.floor(y / 4);
    const off = row % 2 ? 4 : 0;
    const bx = Math.floor((x + off) / 8);
    const lx = (x + off) % 8;
    const ly = y % 4;
    const hh = ihash(bx, row, 91);
    if (ly === 3 || lx === 7) return hh % 3 ? C.concrete : C.concreteMd;
    return hh % 7 === 0 ? C.paperGrid : hh % 5 === 0 ? C.concreteMd : hh % 4 === 0 ? C.concreteLt : C.concrete;
  }
  if (th === 'kawabe' || th === 'station') {
    // 32×16 concrete slabs, joints shift per row
    const off = (Math.floor(y / 16) % 2) * 16 + v * 4;
    const lx = (((x + off) % 32) + 32) % 32;
    const ly = ((y % 16) + 16) % 16;
    if (lx === 31 || ly === 15) return C.steel;
    if (lx === 0 || ly === 0) return C.concreteLt;
    const s = cluster(x, y, 4, 311, 0.08);
    return s ? (s > 2 ? C.concreteMd : C.concreteLt) : C.concrete;
  }
  // 16×16 flagstones, joints shifted by variant
  const off = [0, 8, 4][v % 3];
  const lx = (((x + off) % 16) + 16) % 16;
  const ly = ((y % 16) + 16) % 16;
  if (lx === 15 || ly === 15) return C.steel;
  if (lx === 0 || ly === 0) return C.concreteLt;
  const s = cluster(x, y, 4, 331 + v, 0.1);
  return s ? (s > 2 ? C.concreteMd : C.concreteLt) : C.concrete;
};

const texPlaza: Tex = (x, y) => {
  // Park 石畳: irregular flagstones (jittered Voronoi cells ~12px), thin
  // dark joints, each stone with its own tone and a lit upper-left edge.
  const S = 12;
  const gx = Math.floor(x / S);
  const gy = Math.floor(y / S);
  let d1 = 1e9;
  let d2 = 1e9;
  let id = 0;
  let px = 0;
  let py = 0;
  for (let j = -1; j <= 1; j++)
    for (let i = -1; i <= 1; i++) {
      const cx = gx + i;
      const cy = gy + j;
      const h = ihash(cx, cy, 71);
      const fx = cx * S + 2 + (h % (S - 4));
      const fy = cy * S + 2 + ((h >>> 8) % (S - 4));
      const d = (x - fx) * (x - fx) + (y - fy) * (y - fy) * 1.2;
      if (d < d1) {
        d2 = d1;
        d1 = d;
        id = h;
        px = fx;
        py = fy;
      } else if (d < d2) d2 = d;
    }
  const edge = Math.sqrt(d2) - Math.sqrt(d1);
  if (edge < 1.1) return (id >>> 3) % 5 === 0 ? C.leafDeep : C.steel;
  const tone = (id >>> 12) % 6;
  const base = tone === 0 ? C.concreteMd : tone === 1 ? C.concreteLt : tone === 2 ? C.paperGrid : C.concrete;
  // lit upper-left inside the stone, shaded lower-right
  if (edge < 2.2) return x < px || y < py ? (base === C.concreteLt ? C.white : C.concreteLt) : C.concreteMd;
  if (ihash(x, y, 73) % 29 === 0) return C.concreteMd;
  return base;
};

const texArcade: Tex = (x, y) => {
  // 8px mosaic tiles: terracotta ground, a cream diamond every 32px (rows
  // shifted 8px), brick corners; worn path along the middle of the arcade.
  const cx = Math.floor(x / 8);
  const cy = Math.floor(y / 8);
  const lx = x & 7;
  const ly = y & 7;
  if (lx === 7 || ly === 7) return C.arcGrout;
  const shift = Math.floor(cy / 4) % 2 ? 2 : 0;
  const bx = (((cx + shift) % 4) + 4) % 4;
  const by = ((cy % 4) + 4) % 4;
  const d = Math.abs(bx - 1.5) + Math.abs(by - 1.5);
  let base = d === 1 ? C.cream : bx === 3 && by === 3 ? C.brick : C.terra;
  const hh = ihash(cx, cy, 55);
  if (base === C.terra && hh % 7 === 0) base = C.terraDk;
  // worn path (y23–24): lighter, dithered edge
  const ty = Math.floor(y / 16);
  const worn = (ty === 23 || ty === 24) && valueNoise(x / 12, y / 6, 57) > 0.35;
  if (worn) base = base === C.terra ? C.terraLt : base === C.brick ? C.brickLt : base === C.terraDk ? C.terra : C.creamLt;
  // chipped tile
  if (hh % 41 === 0 && lx >= 3 && ly >= 3) return C.arcGrout;
  if (ly === 0 && lx < 6 && hh % 3 === 0) return base === C.cream ? C.creamLt : base === C.brick ? C.brickLt : C.terraLt;
  return base;
};

const texCrosswalk: Tex = (x, y, v) => {
  const base = texAsphalt(x, y, v, '');
  // stripes run north–south, 5px white / 3px road
  const lx = ((x % 8) + 8) % 8;
  if (lx >= 1 && lx <= 5) {
    // worn by tyres near the middle of each tile row
    const wear = valueNoise(x / 3, y / 5, 88);
    if (wear < 0.23) return base;
    if (wear < 0.3) return C.concrete;
    return lx === 1 ? C.concrete : C.concreteLt;
  }
  return base;
};

const texGrass: Tex = (x, y, v, th) => {
  const big = fbm(x / 28, y / 28, 211 + (th === 'park' ? 9 : 0));
  let col = big > 0.62 ? C.leafYoung : big < 0.3 ? C.leafDeep : C.leaf;
  if (big > 0.62 && big < 0.66) col = (x + y) & 1 ? C.leafYoung : C.leaf;
  // blades: 4×4 cells, a lit 1×2 stroke with a dark foot
  const cx = Math.floor(x / 4);
  const cy = Math.floor(y / 4);
  const h = ihash(cx, cy, 223 + v);
  const bx = cx * 4 + (h & 3);
  const by = cy * 4 + ((h >>> 2) & 1);
  const dens = big > 0.5 ? 0.55 : 0.35;
  if ((h >>> 8 & 255) / 256 < dens) {
    if (x === bx && (y === by || y === by + 1)) return y === by ? (big > 0.45 ? C.leafLt : C.leafYoung) : C.leafYoung;
    if (x === bx + 1 && y === by + 2) return C.leafDeep;
  }
  // clover / flowers
  const f = ihash(Math.floor(x / 8), Math.floor(y / 8), 239 + v);
  if (f % 97 === 0) {
    const fx = Math.floor(x / 8) * 8 + ((f >>> 8) % 6);
    const fy = Math.floor(y / 8) * 8 + ((f >>> 12) % 6);
    if (x === fx && y === fy) return (f >>> 16) & 1 ? C.white : C.gold;
    if (x === fx + 1 && y === fy) return C.leafShade;
  }
  return col;
};

const texWeeds: Tex = (x, y, v) => {
  const big = fbm(x / 18, y / 18, 251);
  let col = big > 0.55 ? C.leaf : C.leafDeep;
  const cx = Math.floor(x / 3);
  const cy = Math.floor(y / 5);
  const h = ihash(cx, cy, 263 + v);
  const bx = cx * 3 + (h % 2);
  const by = cy * 5 + ((h >>> 3) % 2);
  if (x === bx && y >= by && y <= by + 2) return y === by ? C.leafYoung : C.leaf;
  if (x === bx + 1 && y === by + 3) return C.leafShade;
  if ((h >>> 9) % 13 === 0 && x === bx && y === by - 1) return C.goldPale;
  return col;
};

const texDirt: Tex = (x, y, v, th) => {
  const big = fbm(x / 20, y / 20, 277 + (th === 'park' ? 5 : 0));
  let col = big > 0.64 ? C.dirtLt : big < 0.3 ? C.dirtDk : C.dirt;
  const a = cluster(x, y, 5, 281 + v, 0.16);
  if (a) {
    // pebble with a lit top-left
    return a === 1 ? C.paperGrid : a === 4 ? C.brassOld : C.dirtDk;
  }
  // faint footprints / ruts in the park ground
  if (th === 'park') {
    const r = valueNoise(x / 40, y / 7, 293);
    if (r > 0.72 && ((x + y * 3) & 7) === 0) return C.dirtDk;
  }
  return col;
};

const texSand: Tex = (x, y, v) => {
  const big = fbm(x / 12, y / 12, 307);
  const col = big > 0.6 ? C.paper : big < 0.3 ? C.sandDk : C.sand;
  // raked / scuffed ripples: wavy 1px lines (lit above, shaded below) in patches
  const wob = Math.round(valueNoise(x / 9, y / 9, 313) * 5);
  const r = (((y + wob) % 6) + 6) % 6;
  if (fbm(x / 20, y / 20, 317) > 0.45) {
    if (r === 0) return C.sandDk;
    if (r === 5) return C.paper;
  }
  const a = cluster(x, y, 4, 311 + v, 0.14);
  if (a === 1) return C.white;
  if (a === 2 || a === 3) return C.sandDk;
  return col;
};

const texGravel: Tex = (x, y, v) => {
  // irregular pebbles: jittered 4px cells, each pebble 2–3px with a lit
  // top-left pixel; dark gaps between.
  const cell = 4;
  const cx = Math.floor(x / cell);
  const cy = Math.floor(y / cell);
  const h = ihash(cx, cy, 331 + v);
  const ox = h & 1;
  const oy = (h >>> 1) & 1;
  const lx = x - cx * cell - ox;
  const ly = y - cy * cell - oy;
  const sz = 2 + ((h >>> 2) & 1);
  const tone = (h >>> 4) % 6;
  const base = tone === 0 ? C.concrete : tone === 1 ? C.asphaltLt : tone === 2 ? C.concreteMd : tone === 3 ? C.dirt : C.steel;
  if (lx >= 0 && ly >= 0 && lx < sz && ly < sz) {
    if (lx === 0 && ly === 0) return tone === 0 ? C.white : tone === 3 ? C.dirtLt : C.concreteLt;
    if (lx === sz - 1 && ly === sz - 1) return tone === 3 ? C.dirtDk : C.asphalt;
    return base;
  }
  const g = fbm(x / 9, y / 9, 333);
  return g > 0.6 ? C.asphaltLt : g < 0.35 ? C.asphaltDk : C.asphalt;
};

const texBridge: Tex = (x, y) => {
  const ly = ((y % 16) + 16) % 16;
  const lx = ((x % 16) + 16) % 16;
  if (ly === 0) return C.steel; // expansion joint
  if (lx === 0) return C.concreteLt;
  const a = cluster(x, y, 4, 351, 0.1);
  if (a) return a > 2 ? C.concreteMd : C.concreteLt;
  return C.concrete;
};

const texBallast: Tex = (x, y, v) => {
  // crushed-stone ballast (review round 2): 3px stones in jittered 4px cells,
  // each with a lit top-left, a body and a shaded bottom-right; dark gaps.
  // Mostly grey granite, a few rust-stained stones — no 1px noise.
  const cx = Math.floor(x / 4);
  const cy = Math.floor(y / 4);
  const h = ihash(cx, cy, 361 + v);
  const lx = x - cx * 4 - (h & 1);
  const ly = y - cy * 4 - ((h >>> 1) & 1);
  const big = ((h >>> 2) & 3) !== 0;
  const sz = big ? 3 : 2;
  const tone = (h >>> 5) % 9;
  if (lx >= 0 && ly >= 0 && lx < sz && ly < sz && !(big && lx === sz - 1 && ly === 0 && (h >>> 9) & 1)) {
    const rust = tone === 0 && ((h >>> 11) & 1) === 0;
    const light = rust ? C.dirtLt : tone < 4 ? C.concreteLt : C.concrete;
    const body = rust ? C.brassOld : tone < 4 ? C.concreteMd : tone < 7 ? C.steel : C.asphaltLt;
    const dark = rust ? C.woodDark : C.asphalt;
    if (lx + ly === 0) return light;
    if (lx + ly >= sz * 2 - 2) return dark;
    return body;
  }
  const g = fbm(x / 9, y / 9, 363);
  return g > 0.62 ? C.asphalt : g < 0.3 ? C.charcoal : C.asphaltDk;
};

const texRail: Tex = (x, y, v) => texBallast(x, y, v, '');

const texCrossing: Tex = (x, y, v) => {
  // level crossing, off the track: the road's asphalt with a worn concrete
  // edge strip every tile (the rails and panels are painted by trackPixel())
  const ly = ((y % 16) + 16) % 16;
  if (ly === 0) return C.concreteMd;
  return texAsphalt(x, y, v, '');
};

/** Rail gauge geometry relative to the track's centre line (review round 2: 15px between rail centres). */
const RAIL_L = -8;
const RAIL_R = 7;
/** Sleepers: 30px long, 3px deep, every 6px. */
const SLEEPER_HALF = 15;
const SLEEPER_PITCH = 6;

/**
 * Track pixel at dx from the centre line (x = rail tile centre): sleepers
 * under the rails across the ballast bed, rails with a lit head, a rust
 * side and a shadow on the sleeper; on a crossing, rubber panels between
 * the rails with flange grooves and concrete edge strips outside them.
 */
function trackPixel(dx: number, x: number, y: number, base: number, crossing: boolean): number {
  if (crossing) {
    if (dx === RAIL_L || dx === RAIL_R) return (y & 7) === 0 ? C.concreteLt : C.white;
    if (dx === RAIL_L + 1 || dx === RAIL_R - 1) return C.charcoal; // flange grooves
    if (dx === RAIL_R + 1) return C.steel;
    if (dx > RAIL_L + 1 && dx < RAIL_R - 1) return (y & 7) === 0 ? C.charcoal : dx === RAIL_L + 2 ? C.asphalt : C.asphaltDk;
    if (dx === RAIL_L - 1 || dx === RAIL_R + 2) return C.concreteMd;
    if (dx === RAIL_L - 2 || dx === RAIL_R + 3) return C.concrete;
    return base;
  }
  // rails first (they lie on top of everything)
  const joint = ((y % 64) + 64) % 64 === 0;
  if (dx === RAIL_L || dx === RAIL_R) return joint ? C.asphalt : ihash(x, y >> 3, 371) % 7 === 0 ? C.white : C.concreteLt;
  if (dx === RAIL_L + 1 || dx === RAIL_R + 1) return joint ? C.charcoal : C.brassOld; // rusty web
  const sy = ((y % SLEEPER_PITCH) + SLEEPER_PITCH) % SLEEPER_PITCH;
  const row = Math.floor(y / SLEEPER_PITCH);
  const hh = ihash(row, 7, 373);
  const half = SLEEPER_HALF - (hh & 1) - ((hh >>> 3) % 3 === 0 ? 1 : 0);
  const off = (hh >>> 5) % 3 === 0 ? 1 : 0;
  const onSleeper = sy < 3 && dx >= -half + off && dx < half + off;
  if (dx === RAIL_L + 2 || dx === RAIL_R + 2) return onSleeper ? C.woodDark : C.charcoal; // rail shadow
  if (onSleeper) {
    // tie plates under the rails: a darker spot beside each rail
    if ((dx === RAIL_L - 1 || dx === RAIL_R - 1) && sy === 1) return C.woodDark;
    const worn = (hh >>> 7) % 5 === 0;
    if (sy === 0) return worn ? C.brass : C.woodLt;
    if (sy === 2) return C.woodDark;
    return worn && ((dx + row) & 3) === 0 ? C.woodDark : C.wood;
  }
  // shadow of the sleeper on the ballast just south of it
  if (sy === 3 && dx >= -half + off && dx < half + off) return base === C.charcoal ? C.ink : C.charcoal;
  return base;
}

// ---- indoor floors --------------------------------------------------------------

const texWood: Tex = (x, y, v, th) => {
  // boards run east–west, 4px tall, butt joints staggered per board
  const bh = th === 'engawa' ? 5 : 4;
  const row = Math.floor(y / bh);
  const ly = y - row * bh;
  const len = 40 + (ihash(0, row, 401) % 24);
  const off = ihash(1, row, 402) % len;
  const bx = Math.floor((x + off) / len);
  const lx = (x + off) % len;
  const hh = ihash(bx, row, 403 + v);
  if (ly === bh - 1) return C.floorWoodDk;
  if (lx === 0) return C.woodDark;
  if (ly === 0) return th === 'engawa' ? C.goldPale : C.floorWoodLt;
  // grain streaks
  const g = valueNoise(x / 9, row * 3.3, 404 + (hh & 7));
  if (g > 0.78) return C.floorWoodDk;
  if (hh % 5 === 0) return th === 'engawa' ? C.floorWoodLt : C.floorWood;
  return th === 'engawa' ? C.floorWoodLt : C.floorWood;
};

const texTatami: Tex = (x, y) => {
  // 32×16 mats (rotated per cell), woven lines, cloth borders
  const mx = Math.floor(x / 32);
  const my = Math.floor(y / 16);
  const lx = x - mx * 32;
  const ly = y - my * 16;
  if (ly === 15 || ly === 0) return C.leafShade; // cloth border
  if (lx === 31) return C.tatamiDk;
  if (lx === 0) return C.tatamiLt;
  return x % 2 === 0 ? ((ly & 1) === 0 ? C.tatami : C.tatamiLt) : ly % 3 === 0 ? C.tatamiDk : C.tatami;
};

const texKitchen: Tex = (x, y) => {
  const a = cluster(x, y, 3, 421, 0.2);
  if (a === 1) return C.white;
  if (a) return C.kitchenDk;
  const n = valueNoise(x / 6, y / 6, 422);
  return n > 0.7 ? C.concreteLt : C.kitchen;
};

const texGenkan: Tex = (x, y) => {
  // washed-aggregate concrete (洗い出し, review round 2): a pale concrete
  // ground with sparse 2–3px pebbles (lit top-left, body, shaded bottom-right)
  // placed by hash on a jittered 5px grid — no 1px noise
  const cx = Math.floor(x / 5);
  const cy = Math.floor(y / 5);
  const h = ihash(cx, cy, 431);
  const lx = x - cx * 5 - (h % 3);
  const ly = y - cy * 5 - ((h >>> 2) % 3);
  if ((h >>> 5) % 3 !== 0) {
    const sz = (h >>> 8) & 1 ? 3 : 2;
    if (lx >= 0 && ly >= 0 && lx < sz && ly < sz && !(sz === 3 && lx === 2 && ly === 0)) {
      const tone = (h >>> 10) % 4;
      const light = tone === 0 ? C.white : tone === 1 ? C.paper : C.concreteLt;
      const body = tone === 0 ? C.concreteLt : tone === 1 ? C.dirtLt : tone === 2 ? C.concreteMd : C.paperGrid;
      if (lx + ly === 0) return light;
      if (lx + ly >= sz * 2 - 2) return C.steel;
      return body;
    }
  }
  const n = valueNoise(x / 7, y / 7, 433);
  return n > 0.7 ? C.concreteLt : n < 0.25 ? C.concreteMd : C.concrete;
};

const texTile: Tex = (x, y) => {
  const lx = x & 15;
  const ly = y & 15;
  if (lx === 15 || ly === 15) return C.concreteMd;
  if (lx === 0 || ly === 0) return C.white;
  return (Math.floor(x / 16) + Math.floor(y / 16)) % 2 ? C.concreteLt : C.concrete;
};

const texMall: Tex = (x, y) => {
  const cx = Math.floor(x / 16);
  const cy = Math.floor(y / 16);
  const lx = x & 15;
  const ly = y & 15;
  const hh = ihash(cx, cy, 441);
  if (lx === 15 || ly === 15) return C.steel;
  if (hh % 9 === 0) return C.steel;
  const base = hh % 3 === 0 ? C.concrete : C.concreteLt;
  if (lx === 0 || ly === 0) return C.white;
  return base;
};

const texVoid: Tex = () => C.night;

const TEX: Partial<Record<Ground, Tex>> = {
  asphalt: texAsphalt, lot: texLot, gutter: texGutter, sidewalk: texSidewalk, plaza: texPlaza, arcade: texArcade,
  crosswalk: texCrosswalk, grass: texGrass, weeds: texWeeds, reeds: texWeeds, hedge: texGrass, dirt: texDirt,
  sand: texSand, gravel: texGravel, bridge: texBridge, ballast: texBallast, rail: texRail, crossing: texCrossing,
  water: () => C.navy, paddy: () => C.navy, wood: texWood, wood_bare: texWood, engawa: texWood, shopwood: texWood,
  tatami: texTatami, kitchen: texKitchen, genkan: texGenkan, tile_floor: texTile, mall: texMall, void: texVoid,
  none: texVoid,
};

const NVAR: Partial<Record<Ground, number>> = {
  asphalt: 4, lot: 3, gutter: 4, sidewalk: 3, grass: 4, weeds: 3, dirt: 3, sand: 2, gravel: 3, ballast: 2, rail: 2,
};

// ---- baking -----------------------------------------------------------------------

/**
 * Bake the ground of the world-pixel rect (x0,y0,w,h). Materials are blended
 * with organic borders; curbs and grass lips are added.
 */
export function bakeGround(src: GroundSource, x0: number, y0: number, w: number, h: number): PixelCanvas {
  const pc = new PixelCanvas(w, h);
  const M = 2; // margin for neighbour tests
  const bw = w + M * 2;
  const bh = h + M * 2;
  const ids = new Uint8Array(bw * bh);
  const mapW = src.w * 16;
  const mapH = src.h * 16;
  const tileG = (tx: number, ty: number): Ground => {
    if (tx < 0) tx = 0;
    if (ty < 0) ty = 0;
    if (tx >= src.w) tx = src.w - 1;
    if (ty >= src.h) ty = src.h - 1;
    return src.ground(tx, ty);
  };
  // pass 1: material per pixel
  for (let j = 0; j < bh; j++) {
    const wy = y0 + j - M;
    for (let i = 0; i < bw; i++) {
      const wx = x0 + i - M;
      const tx = Math.floor(wx / 16);
      const ty = Math.floor(wy / 16);
      const g0 = tileG(tx, ty);
      let g = g0;
      const lx = wx - tx * 16;
      const ly = wy - ty * 16;
      if (lx < 4 || lx > 11 || ly < 4 || ly > 11) {
        // low-frequency wander + 2px bumps (6.1-4: borders are never straight lines)
        // three octaves: a slow wander, 2–3px lobes and 1–2px bumps (every side of a border, review round 2)
        const nx = (valueNoise(wx / 5.3, wy / 5.3, src.seed + 11) - 0.5) * 2 + (valueNoise(wx / 2.2, wy / 2.2, src.seed + 31) - 0.5) * 1.3 + (valueNoise(wx / 1.3, wy / 1.3, src.seed + 41) - 0.5) * 1.1;
        const ny = (valueNoise(wx / 5.3, wy / 5.3, src.seed + 23) - 0.5) * 2 + (valueNoise(wx / 2.2, wy / 2.2, src.seed + 37) - 0.5) * 1.3 + (valueNoise(wx / 1.3, wy / 1.3, src.seed + 43) - 0.5) * 1.1;
        const sx = Math.floor((wx + nx * 3.2) / 16);
        const sy = Math.floor((wy + ny * 3.2) / 16);
        if (sx !== tx || sy !== ty) {
          const g1 = tileG(sx, sy);
          // higher-priority materials spread over lower ones; between two soft
          // materials (grass / dirt / sand...) the border wanders both ways
          if (g1 !== g0 && ((PRIO[g1] ?? 0) > (PRIO[g0] ?? 0) || (SOFT.has(g1) && SOFT.has(g0) && g1 !== 'paddy' && g0 !== 'paddy'))) {
            const a = amp(g1, g0);
            if (a > 0) {
              const k = a / 3.2;
              const sx2 = Math.floor((wx + nx * 3.2 * k) / 16);
              const sy2 = Math.floor((wy + ny * 3.2 * k) / 16);
              if (tileG(sx2, sy2) === g1) g = g1;
            }
          }
        }
      }
      if (wx < 0 || wy < 0 || wx >= mapW || wy >= mapH) g = g0;
      ids[j * bw + i] = GINDEX.get(g) ?? 0;
    }
  }
  const idAt = (i: number, j: number): Ground => GIDS[ids[(j + M) * bw + (i + M)]];
  const vcache = new Map<number, number>();
  const variant = (tx: number, ty: number, g: Ground) => {
    const n = NVAR[g] ?? 1;
    if (n <= 1) return 0;
    const key = ty * 4096 + tx;
    let v = vcache.get(key);
    if (v === undefined) {
      v = src.ground(tx, ty) === g ? variantOf(src, tx, ty, n) : ihash(tx, ty, 3) % n;
      vcache.set(key, v);
    }
    return v;
  };
  // crossing tiles whose column is track (a 'rail' tile above or below the crossing)
  const railCols = new Map<number, boolean>();
  const railColumn = (tx: number, ty: number): boolean => {
    const key = ty * 4096 + tx;
    let r = railCols.get(key);
    if (r === undefined) {
      let a = ty;
      while (a > 0 && tileG(tx, a) === 'crossing') a--;
      let b = ty;
      while (b < src.h - 1 && tileG(tx, b) === 'crossing') b++;
      r = tileG(tx, a) === 'rail' || tileG(tx, b) === 'rail';
      railCols.set(key, r);
    }
    return r;
  };
  // the rail tile column (track centre) nearest to tile (tx, ty), if any
  const isRailTile = (tx: number, ty: number) => tileG(tx, ty) === 'rail' || (tileG(tx, ty) === 'crossing' && railColumn(tx, ty));
  const trackCol = (tx: number, ty: number): number | null => {
    if (isRailTile(tx, ty)) return tx;
    if (isRailTile(tx - 1, ty)) return tx - 1;
    if (isRailTile(tx + 1, ty)) return tx + 1;
    return null;
  };
  // pass 2: colour
  for (let j = 0; j < h; j++) {
    const wy = y0 + j;
    for (let i = 0; i < w; i++) {
      const wx = x0 + i;
      const g = idAt(i, j);
      const tx = Math.floor(wx / 16);
      const ty = Math.floor(wy / 16);
      const th = src.theme(Math.max(0, Math.min(src.w - 1, tx)), Math.max(0, Math.min(src.h - 1, ty)));
      const tex = TEX[g] ?? texVoid;
      let col = tex(wx, wy, variant(tx, ty, g), g === 'engawa' ? 'engawa' : th);
      // the track: sleepers and rails across the ballast bed / the crossing
      if (g === 'ballast' || g === 'rail' || g === 'crossing') {
        const rc = trackCol(tx, ty);
        if (rc !== null) {
          const dx = wx - (rc * 16 + 8);
          if (dx >= -SLEEPER_HALF - 1 && dx <= SLEEPER_HALF + 1) col = trackPixel(dx, wx, wy, col, g === 'crossing');
        }
      }
      const up = idAt(i, j - 1);
      const dn = idAt(i, j + 1);
      const lf = idAt(i - 1, j);
      const rt = idAt(i + 1, j);
      // grass lip: darker bottom edge, lit top edge, lit west / shaded east sides
      if (GREEN.has(g)) {
        if (!GREEN.has(dn)) col = C.leafDeep;
        else if (!GREEN.has(idAt(i, j + 2)) && ((wx * 7 + wy) % 5 === 0)) col = C.leafDeep;
        else if (!GREEN.has(up) && up !== 'none') col = C.leafYoung;
        else if (!GREEN.has(rt) && rt !== 'none' && rt !== 'water') col = C.leafDeep;
        else if (!GREEN.has(lf) && lf !== 'none' && lf !== 'water') col = C.leafYoung;
      } else if (GREEN.has(up) && !GREEN.has(g) && g !== 'water') {
        // soft shade cast by the grass mass onto what is below it
        col = shadeOf(col);
      }
      // bare ground next to grass, on every side: blades poking out of the
      // edge 1–3px (one lane every 2px along the border), a pebble now and then
      if (g === 'dirt' || g === 'sand' || g === 'gravel') {
        let best = 9;
        let axis = 0; // 0 = vertical border (grass left/right), 1 = horizontal
        for (let d = 1; d <= 3 && best > 3; d++) {
          if (GREEN.has(idAt(i - d, j)) || GREEN.has(idAt(i + d, j))) {
            best = d;
            axis = 0;
          } else if (GREEN.has(idAt(i, j - d)) || GREEN.has(idAt(i, j + d))) {
            best = d;
            axis = 1;
          }
        }
        if (best <= 3) {
          const a = axis === 0 ? wy : wx;
          const lane = a >> 1;
          const hb = ihash(lane, axis === 0 ? wx >> 3 : wy >> 3, 1213 + axis);
          const L = hb % 5 === 0 ? 3 : hb % 3 === 0 ? 2 : hb % 2 === 0 ? 1 : 0;
          if ((a & 1) === 0 && best <= L) col = best === L ? ((hb >>> 5) % 4 === 0 ? C.leafYoung : C.leaf) : C.leafDeep;
          else if (best === 1 && (hb >>> 8) % 4 === 0) col = C.leafDeep;
          else if (best >= 2 && (hb >>> 10) % 11 === 0) col = C.concreteLt;
          else if (best >= 2 && (hb >>> 10) % 11 === 1) col = C.steel;
        }
      }
      // paddy ridges (畦): grass tufts along the water's edge, a clover or a
      // small flower here and there (review round 2)
      if (g === 'dirt' && src.theme(Math.max(0, tx), Math.max(0, ty)) === 'taigan') {
        let dp = 9;
        for (let d = 1; d <= 3 && dp > 3; d++)
          if (idAt(i - d, j) === 'paddy' || idAt(i + d, j) === 'paddy' || idAt(i, j - d) === 'paddy' || idAt(i, j + d) === 'paddy') dp = d;
        if (dp <= 3) {
          const hb = ihash(wx >> 1, wy >> 1, 1223);
          const clump = valueNoise(wx / 6, wy / 6, 1229);
          if (clump > 0.45 && hb % 3 !== 0) col = dp === 1 ? C.leafDeep : (hb >>> 4) % 3 === 0 ? C.leafYoung : C.leaf;
          else if (dp >= 2 && hb % 97 === 0) col = (hb >>> 8) & 1 ? C.white : C.gold;
        } else if (valueNoise(wx / 9, wy / 9, 1231) > 0.7 && ihash(wx, wy, 1233) % 4 === 0) col = C.leaf;
      }
      // curbs: raised paving next to roads
      if (RAISED.has(g)) {
        if (ROADISH.has(dn)) col = C.steel;
        else if (ROADISH.has(up)) col = C.white;
        else if (ROADISH.has(lf)) col = C.concreteLt;
        else if (ROADISH.has(rt)) col = C.concreteMd;
      } else if (ROADISH.has(g)) {
        if (RAISED.has(up)) col = C.charcoal;
        else if (RAISED.has(lf)) col = C.asphaltDk;
      }
      // the raised wooden floor's edge (上がり框) over the genkan: its front face
      // on the floor side, a 2px shadow on the concrete below it
      if (g === 'genkan') {
        const woodish = (q: Ground) => q === 'wood' || q === 'wood_bare' || q === 'engawa';
        if (woodish(up) || woodish(idAt(i, j - 2))) col = woodish(up) ? C.charcoal : C.concreteMd === col ? C.steel : C.concreteMd;
        else if (woodish(rt) || woodish(idAt(i + 2, j))) col = woodish(rt) ? C.steel : C.concreteMd;
      } else if ((g === 'wood' || g === 'wood_bare') && (dn === 'genkan' || idAt(i, j + 2) === 'genkan')) {
        col = dn === 'genkan' ? C.woodDark : C.floorWoodDk; // 框 face
      } else if ((g === 'wood' || g === 'wood_bare') && lf === 'genkan') col = C.woodDark;
      // canal retaining wall (護岸) at the north bank, moss lip at the south bank
      if (g === 'water') {
        let k = 1;
        while (k <= 5 && idAt(i, j - k) === 'water') k++;
        if (k <= 5 && idAt(i, j - k) !== 'none') {
          const joint = ((wx % 23) + 23) % 23 === 0;
          col = k === 1 ? C.concreteLt : k === 5 ? C.asphalt : joint ? C.steel : k === 4 ? C.concreteMd : C.concrete;
          if (k >= 3 && h01(wx, wy, 71) < 0.12) col = C.leafDeep;
        } else if (idAt(i, j + 1) !== 'water' && idAt(i, j + 1) !== 'none') col = h01(wx, wy, 73) < 0.5 ? C.leafShade : C.charcoal;
        else if (idAt(i, j + 2) !== 'water' && idAt(i, j + 2) !== 'none') col = h01(wx, wy, 77) < 0.4 ? C.leafDeep : C.navy;
      }
      pc.data[j * w + i] = col;
    }
  }
  if (src.decals) paintDecals(pc, x0, y0, w, h, src.decals);
  return pc;
}

const shadeMap = new Map<number, number>([
  [C.asphalt, C.asphaltDk], [C.asphaltLt, C.asphalt], [C.asphaltDk, C.charcoal], [C.steel, C.asphalt],
  [C.dirt, C.dirtDk], [C.dirtLt, C.dirt], [C.dirtDk, C.brassOld], [C.paperGrid, C.dirt],
  [C.sand, C.sandDk], [C.paper, C.sand], [C.sandDk, C.dirt],
  [C.concrete, C.concreteMd], [C.concreteLt, C.concrete], [C.concreteMd, C.steel], [C.white, C.concreteLt],
  [C.lot, C.asphalt],
]);
function shadeOf(col: number): number {
  return shadeMap.get(col) ?? col;
}

export const GROUND_COLORS = C;
