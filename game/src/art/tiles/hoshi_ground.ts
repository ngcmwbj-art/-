// Chapter 2 ground materials (52_ch2_level_art 7.1): the mountain village of
// 星見台 — old patched road, 畦 paths and 石段 between the terraced paddies,
// the station platform, the school yard, the barn's brushed concrete, the
// abandoned fields (枯れ草 and creeping クズ), the tilled strip Tetsuya
// ploughed all night, the wallow, the U-shaped irrigation canal, the stony
// stream, the east–west siding, and the indoor floors (train rubber, the
// greenhouse's weed sheet and mulch, the barn's aisle and sawdust bedding).
//
// Every material is painted in daylight colours (the night is the grade's
// job, 52 7章) and computed per world pixel, so no two tiles repeat. Water
// shows through as navy pixels: the world's renderer mirrors the night sky,
// the stars and the fushigi (52 8.7) into exactly those pixels.

import { mix, rgba32 } from '../../engine/pixel';
import { fbm, h01, ihash, valueNoise } from './noise';
import { P } from './palette';

/** The five colours chapter 2 adds to the master palette (52 8.1). */
export const HP = {
  cow: '#2B2A30',
  cowLt: '#45434C',
  cowSheen: '#6E6A78',
  oldWood: '#8E867A',
  oldWoodDk: '#5E574E',
  /** light-map / emissive only */
  ledGreen: '#7CFF9A',
  ledCyan: '#5CE1FF',
} as const;

/** Chapter 2 ground ids (cast to world Ground in the map legends). */
export const H_GROUNDS = [
  'h_road',
  'h_aze',
  'h_ishidan',
  'h_platform',
  'h_kotei',
  'h_concrete',
  'h_houki',
  'h_tilled',
  'h_nuta',
  'h_tanada',
  'h_canal',
  'h_stream',
  'h_rail',
  'h_trainfloor',
  'h_sheet',
  'h_mulch',
  'h_barnfloor',
  'h_sawdust',
  'h_yamamichi',
  'h_hilltop',
  'h_schoolwood',
  'h_genkan',
] as const;
export type HGround = (typeof H_GROUNDS)[number];

/** Neighbourhood for the chapter-2 textures (tile lookups in the same map). */
export interface HTexCtx {
  ground(tx: number, ty: number): string;
}
export type HTex = (x: number, y: number, v: number, ctx: HTexCtx) => number;

const c = (hex: string) => rgba32(hex);
const K = {
  white: c(P.white),
  concreteLt: c(P.concreteLt),
  concrete: c(P.concrete),
  concreteMd: c(mix(P.concrete, P.steel, 0.4)),
  steel: c(P.steel),
  asphalt: c(P.asphalt),
  asphaltLt: c(mix(P.asphalt, P.steel, 0.3)),
  asphaltDk: c(mix(P.asphalt, P.charcoal, 0.28)),
  asphaltPatch: c(mix(P.asphalt, P.charcoal, 0.45)),
  charcoal: c(P.charcoal),
  ink: c(P.ink),
  night: c(P.night),
  navy: c(P.navy),
  leafLt: c(P.leafLt),
  leafYoung: c(P.leafYoung),
  leaf: c(P.leaf),
  leafDeep: c(P.leafDeep),
  leafShade: c(P.leafShade),
  woodLt: c(P.woodLt),
  wood: c(P.wood),
  woodDark: c(P.woodDark),
  woodMd: c(mix(P.wood, P.woodDark, 0.5)),
  brass: c(P.brass),
  brassOld: c(P.brassOld),
  goldPale: c(P.goldPale),
  gold: c(P.gold),
  paper: c(P.paper),
  paperGrid: c(P.paperGrid),
  soil: c(mix(P.brassOld, P.wood, 0.35)),
  soilLt: c(mix(P.brassOld, P.woodLt, 0.45)),
  soilDk: c(mix(P.wood, P.woodDark, 0.4)),
  kotei: c(P.woodLt),
  koteiLt: c(mix(P.woodLt, P.paperGrid, 0.45)),
  koteiDk: c(mix(P.woodLt, P.brassOld, 0.55)),
  mud: c(P.woodDark),
  mudSheen: c(P.wood),
  mudDk: c(mix(P.woodDark, P.charcoal, 0.45)),
  rubber: c(P.asphalt),
  rubberLt: c(mix(P.asphalt, P.steel, 0.35)),
  sheet: c(P.charcoal),
  sheetWeave: c(P.ink),
  sheetLt: c(mix(P.charcoal, P.asphalt, 0.45)),
  saw: c(P.paperGrid),
  sawLt: c(P.paper),
  sawDk: c(mix(P.paperGrid, P.woodLt, 0.55)),
  sawDeep: c(mix(P.woodLt, P.brassOld, 0.5)),
  lilac: c(P.lilac),
  crimsonDk: c(P.sunShade),
  kuzuFlower: c(P.sunShade),
  oldWood: c(HP.oldWood),
  gravel: c(mix(P.steel, P.brassOld, 0.35)),
  gravelLt: c(mix(P.concrete, P.woodLt, 0.35)),
  boardA: c(mix(P.woodLt, P.brassOld, 0.35)),
  boardB: c(mix(P.brassOld, P.woodLt, 0.3)),
  boardC: c(mix(P.brassOld, P.wood, 0.35)),
  boardLit: c(mix(P.woodLt, P.goldPale, 0.35)),
  boardGap: c(mix(P.wood, P.woodDark, 0.5)),
  oldWoodDk: c(HP.oldWoodDk),
  /** the canal's wave troughs (not mirrors): the water's own colour in shade */
  canalDk: c(mix(P.navy, P.asphalt, 0.35)),
  canalMd: c(mix(P.navy, P.steel, 0.4)),
};

// ---------------------------------------------------------------- helpers

/** Pebble / aggregate cluster: 0 = none, 1..4 = which pixel of the cluster. */
function cluster(x: number, y: number, cell: number, seed: number, p: number): number {
  const cx = Math.floor(x / cell);
  const cy = Math.floor(y / cell);
  const h = ihash(cx, cy, seed);
  if ((h & 1023) / 1024 >= p) return 0;
  const lx = x - cx * cell - ((h >>> 12) % Math.max(1, cell - 1));
  const ly = y - cy * cell - ((h >>> 16) % Math.max(1, cell - 1));
  const shape = (h >>> 10) & 3;
  let inside = false;
  if (shape === 0) inside = ly === 0 && (lx === 0 || lx === 1);
  else if (shape === 1) inside = lx >= 0 && lx <= 1 && ly >= 0 && ly <= 1;
  else if (shape === 2) inside = (ly === 0 && (lx === 0 || lx === 1)) || (ly === 1 && lx === 0);
  else inside = (ly === 0 && lx === 1) || (ly === 1 && (lx === 0 || lx === 1));
  if (!inside) return 0;
  return 1 + ((h >>> 20) & 3);
}

const lxOf = (x: number) => ((x % 16) + 16) % 16;
const txOf = (x: number) => Math.floor(x / 16);

// ---------------------------------------------------------------- outdoor

/**
 * 村の舗装道: tired asphalt, a little bluer and more open-grained than the
 * town's, no white lines. Cracks, patches and holes are the decal layer.
 */
const texRoad: HTex = (x, y, v) => {
  const n = fbm(x / 24 + v * 2.3, y / 24, 911);
  let col = n > 0.7 ? K.asphaltLt : n < 0.26 ? K.asphaltDk : K.asphalt;
  const a = cluster(x, y, 4, 913 + v, 0.15);
  if (a === 1 || a === 2) col = K.steel;
  else if (a === 3) col = K.asphaltDk;
  else if (a === 4) col = n > 0.5 ? K.asphaltLt : K.charcoal;
  // the binder is gone in places: a pale, sandy wash
  const wash = valueNoise(x / 40, y / 30, 917);
  if (wash > 0.72 && h01(x, y, 919) < (wash - 0.72) * 3.2) col = K.asphaltLt;
  return col;
};

/**
 * 締まった土 of the farm lanes and yards (the village variant of dirt): one
 * packed-earth colour. Its variation is small and has a direction or a
 * cause — the grain of the soil (1px), small stones, strands of spilt rice
 * straw, shallow dents with a lit lip — plus a slow, low-contrast drift that
 * only thins or thickens a dither, so the ground never turns into blotches.
 * The ruts, puddles, straw heaps and stains are hand-placed decals.
 */
export const texHoshiDirt = (x: number, y: number, v: number): number => {
  const drift = valueNoise(x / 56, y / 44, 931);
  const g = h01(x, y, 935 + v);
  let col = K.soil;
  if (drift > 0.6 && g < (drift - 0.6) * 0.9) col = K.soilLt;
  else if (drift < 0.36 && g < (0.36 - drift) * 0.8) col = K.soilDk;
  // the grain: single darker and paler specks, a few along a faint east–west drag
  if (g > 0.972) col = K.soilLt;
  else if (g < 0.035) col = K.soilDk;
  // shallow dents (a boot heel, a hoof, a dropped tool): 3×2 dark with a lit south lip
  const dh = ihash(Math.floor(x / 11), Math.floor(y / 9), 939 + v);
  if (dh % 23 === 0) {
    const dx = x - (Math.floor(x / 11) * 11 + 2 + ((dh >>> 8) % 6));
    const dy = y - (Math.floor(y / 9) * 9 + 2 + ((dh >>> 12) % 5));
    if (dy === 0 && dx >= 0 && dx < 3) return K.soilDk;
    if (dy === 1 && dx >= 0 && dx < 3) return dx === 1 ? K.soilDk : K.woodMd;
    if (dy === 2 && dx >= 0 && dx < 3) return K.soilLt;
  }
  const a = cluster(x, y, 5, 933 + v, 0.1);
  if (a) return a === 1 ? K.paperGrid : a === 4 ? K.brassOld : a === 2 ? K.gravel : K.soilDk;
  // spilt rice straw (こぼれた稲わら): 1–2px strands
  const s = ihash(Math.floor(x / 6), Math.floor(y / 6), 937 + v);
  if (s % 19 === 0) {
    const sx = Math.floor(x / 6) * 6 + ((s >>> 8) % 4);
    const sy = Math.floor(y / 6) * 6 + ((s >>> 12) % 5);
    if (y === sy && (x === sx || x === sx + ((s >>> 16) & 1))) return (s >>> 20) & 1 ? K.woodLt : K.goldPale;
  }
  return col;
};

/** 畦道: packed earth with short grass on both edges, a wet gleam where it meets its paddy. */
const texAze: HTex = (x, y, v, ctx) => {
  const lx = lxOf(x);
  const ly = ((y % 16) + 16) % 16;
  const tx = txOf(x);
  const ty = Math.floor(y / 16);
  const n = fbm(x / 11, y / 7, 951);
  let col = n > 0.66 ? K.woodLt : n < 0.3 ? K.woodMd : K.wood;
  // the worn middle where feet go: paler, with a dithered edge
  const mid = Math.abs(ly - 7.5 - Math.round((valueNoise(x / 9, ty, 953) - 0.5) * 3));
  if (mid < 2.5) col = n > 0.5 ? K.soilLt : K.woodLt;
  else if (mid < 3.5 && ((x + y) & 1) === 0) col = K.woodLt;
  // grass on both edges: tufts 1–3px deep in 2px lanes
  const lane = x >> 1;
  const top = ihash(lane, ty * 2, 955 + v) % 4;
  const bot = ihash(lane, ty * 2 + 1, 957 + v) % 4;
  if (ly < top) col = ly === top - 1 ? K.leaf : (lane & 1) ? K.leafDeep : K.leaf;
  if (ly === 0 && top === 0 && (x & 3) === 1) col = K.leafDeep;
  const wet = ctx.ground(tx, ty + 1) === 'h_tanada';
  if (ly >= 15 - bot && ly < 15) col = ly === 15 - bot ? K.leafYoung : K.leaf;
  if (ly === 15) col = wet ? (h01(x, y, 959) < 0.3 ? K.concrete : K.steel) : K.leafDeep;
  if (ly === 14 && wet && bot === 0) col = K.woodDark;
  // clover (5%) and grass ears (8%)
  const f = ihash(Math.floor(x / 8), ty, 961 + v);
  if (f % 20 === 0) {
    const fx = Math.floor(x / 8) * 8 + 2 + ((f >>> 8) % 4);
    const fy = ty * 16 + 4 + ((f >>> 12) % 6);
    if ((x === fx && (y === fy || y === fy + 2)) || (y === fy + 1 && (x === fx - 1 || x === fx + 1))) return K.leafYoung;
    if (x === fx && y === fy + 1) return K.leafDeep;
  }
  if (f % 12 === 1 && ly === Math.max(0, top - 2) && (x & 7) === 3) return K.goldPale;
  return col;
};

/**
 * 石段: flat field stones of different sizes laid in steps. Each step (8px,
 * its height nudged ±1) has a tread of round-edged stones, lit on the front
 * edge, and a riser: the 2px dark line under the tread's lip, broken where a
 * big stone overhangs it. Moss in the joints, on the flanks the terraces' walls.
 */
const texIshidan: HTex = (x, y, v, ctx) => {
  const lx = lxOf(x);
  const tx = txOf(x);
  const row = Math.floor(y / 8);
  const off = (ihash(row, 0, 971) % 3) - 1;
  const sy = y - row * 8 - off;
  const stepRow = sy < 0 ? row - 1 : sy >= 8 ? row + 1 : row;
  const ly = ((y - stepRow * 8 - ((ihash(stepRow, 0, 971) % 3) - 1)) % 8 + 8) % 8;
  // the flanks: the stair is set between the terraces' walls
  const leftEdge = ctx.ground(tx - 1, Math.floor(y / 16)) !== 'h_ishidan';
  const rightEdge = ctx.ground(tx + 1, Math.floor(y / 16)) !== 'h_ishidan';
  if (leftEdge && lx === 0) return K.asphalt;
  if (rightEdge && lx === 15) return K.charcoal;
  // the riser under each tread's lip (a big stone's lip hangs over it here and there)
  const lip = ihash(Math.floor((x + stepRow * 5) / 5), stepRow, 979) % 4 === 0;
  if (ly === 7 || (ly === 6 && !lip)) return ly === 7 ? K.charcoal : (x + stepRow) % 5 === 0 ? K.leafShade : K.asphalt;
  // the tread: field stones within the step (the stone grid is per step)
  const s = fieldStone(x + stepRow * 7, ly, 7 + (ihash(stepRow, 1, 973) % 3), 4, 977 + v + stepRow * 13);
  if (s.joint) return (s.id >>> 3) % 100 < 16 ? (h01(x, y, 981) < 0.5 ? K.leaf : K.leafDeep) : K.asphalt;
  let col = stoneCol(s, x, y, 0);
  if (ly === (lip ? 6 : 5) && col !== K.leafDeep) col = K.concreteLt; // the tread's lit front lip
  if (ly === 0 && col !== K.leafDeep) col = col === K.concreteLt ? K.steel : K.asphaltLt; // tucked under the step above
  if (rightEdge && lx === 14) col = K.asphalt;
  return col;
};

/** ホーム: old concrete, the south edge's white line and yellow tactile band, weeds along the north edge. */
const texPlatform: HTex = (x, y, v, ctx) => {
  const lx = lxOf(x);
  const ly = ((y % 16) + 16) % 16;
  const tx = txOf(x);
  const ty = Math.floor(y / 16);
  const south = ctx.ground(tx, ty + 1) !== 'h_platform';
  const north = ctx.ground(tx, ty - 1) !== 'h_platform';
  if (south) {
    if (ly === 15) return K.charcoal; // the drop to the track
    if (ly === 14) return K.concreteLt; // coping
    if (ly === 13 || ly === 12) return h01(x, 0, 983) < 0.1 ? K.concrete : K.white; // white line, worn in places
    if (ly >= 7 && ly <= 9) {
      // tactile band: yellow with raised dots (1px) on a 3px grid
      if (ly === 8 && x % 3 === 1) return K.brass;
      return h01(x >> 2, ly, 985) < 0.08 ? K.brass : K.gold;
    }
    if (ly === 10) return K.concreteMd;
  }
  const n = fbm(x / 13 + v, y / 13, 987);
  let col = n > 0.66 ? K.concreteLt : n < 0.28 ? K.concreteMd : K.concrete;
  // slab joints every 32px
  if ((((x + 11) % 32) + 32) % 32 === 0) col = K.steel;
  if (!south && ly === 15) col = K.concreteMd;
  const s = cluster(x, y, 4, 989 + v, 0.08);
  if (s) col = s > 2 ? K.concreteMd : K.concreteLt;
  if (north) {
    // weeds pushing out from under the edge
    const d = ihash(x >> 1, ty, 991) % 5;
    if (ly < d - 1) return (x & 1) ? K.leafDeep : K.leaf;
    if (ly === d - 1 && d > 1) return K.leafYoung;
  }
  void lx;
  return col;
};

/** 校庭: pale packed earth, a few pebbles, the faint wash of rain. */
const texKotei: HTex = (x, y, v) => {
  const n = fbm(x / 18, y / 14, 1001);
  let col = n > 0.68 ? K.koteiLt : n < 0.28 ? K.koteiDk : K.kotei;
  const a = cluster(x, y, 5, 1003 + v, 0.09);
  if (a === 1) return K.paperGrid;
  if (a > 1) return K.koteiDk;
  // rain-wash runnels (gentle, north→south)
  if (valueNoise(x / 3, y / 30, 1005) > 0.82 && ((y & 1) === 0)) col = K.koteiDk;
  return col;
};

/** 牛舎前の土間: brushed concrete (刷毛目), expansion joints every 48px. */
const texConcrete: HTex = (x, y, v) => {
  const ly = ((y % 16) + 16) % 16;
  if ((((x + 5) % 48) + 48) % 48 === 0 || (((y + 3) % 48) + 48) % 48 === 0) return K.steel;
  const brush = (y & 1) === 0;
  const n = fbm(x / 22, y / 16, 1011);
  let col = n > 0.7 ? K.concreteLt : n < 0.25 ? K.concreteMd : K.concrete;
  if (brush && ihash(x >> 3, y, 1013) % 3 === 0) col = col === K.concreteLt ? K.concrete : K.concreteMd;
  const a = cluster(x, y, 5, 1015 + v, 0.06);
  if (a) col = a === 1 ? K.white : K.concreteMd;
  void ly;
  return col;
};

/** Dry grass strands near (x, y): 0 = none, 1 = a strand's lit body, 2 = its tip, 3 = the shade under it. */
const HOUKI_DIRS: [number, number][] = [
  [1, -1],
  [2, -1],
  [1, -2],
  [-1, -1],
  [-2, -1],
  [1, 0],
];
function dryStrand(x: number, y: number, v: number): number {
  const gx = Math.floor(x / 4);
  const gy = Math.floor(y / 4);
  let hit = 0;
  for (let j = -2; j <= 1; j++)
    for (let i = -2; i <= 2; i++) {
      const h = ihash(gx + i, gy + j, 1031 + v);
      if (h % 4 === 0) continue;
      // the whole field leans a little east (the wind off the mountain), a clump here and there the other way
      const lean = valueNoise((gx + i) * 0.3, (gy + j) * 0.3, 1033) > 0.62 ? 3 : 0;
      const [dx, dy] = HOUKI_DIRS[(((h >>> 4) % 3) + lean) % 6];
      const len = 3 + ((h >>> 8) % 3);
      const ox = (gx + i) * 4 + ((h >>> 12) % 4);
      const oy = (gy + j) * 4 + ((h >>> 14) % 4);
      for (let k = 0; k < len; k++) {
        const px = ox + Math.round((dx * k) / Math.max(Math.abs(dx), Math.abs(dy)));
        const py = oy + Math.round((dy * k) / Math.max(Math.abs(dx), Math.abs(dy)));
        if (px === x && py === y) return k === len - 1 ? 2 : 1;
        if (px === x && py + 1 === y && !hit) hit = 3;
      }
    }
  return hit;
}

/**
 * 耕作放棄地: last year's grass lying over in fine strands (leaning with the
 * wind, a clump the other way here and there) over a dark tangle, bare earth
 * where it has worn through; low クズ creeping across it in patches with
 * lobed edges, sending runners out over the dry grass.
 */
const texHouki: HTex = (x, y, v) => {
  // the tangle under the strands, bare earth here and there
  const soil = fbm(x / 30, y / 26, 1023);
  const n = h01(x, y, 1021 + v);
  let col = soil > 0.7 ? (n < 0.5 ? K.soil : K.soilDk) : n < 0.35 ? K.woodMd : n < 0.7 ? K.brassOld : K.soilDk;
  const st = dryStrand(x, y, v);
  if (st === 1) col = soil > 0.7 ? K.brassOld : (x + y) % 3 ? K.woodLt : K.koteiLt;
  else if (st === 2) col = K.goldPale;
  else if (st === 3) col = K.woodDark;
  // creeping kuzu: patches of small three-lobed leaves, lobed at their edge, runners going out
  const k = valueNoise(x / 15, y / 13, 1025) + (valueNoise(x / 4, y / 4, 1035) - 0.5) * 0.18;
  if (k > 0.6) {
    const cx = Math.floor(x / 5);
    const cy = Math.floor(y / 4);
    const h = ihash(cx, cy, 1027);
    const lx = x - cx * 5 - (h % 2);
    const ly = y - cy * 4 - ((h >>> 1) % 2);
    const r2 = (lx - 2) * (lx - 2) + (ly - 2) * (ly - 2) * 1.3;
    if (r2 <= 4.5) {
      if (lx + ly <= 2) return (h >>> 5) % 3 === 0 ? K.leafYoung : K.leaf;
      if (lx + ly >= 5) return K.leafShade;
      return K.leafDeep;
    }
    if (k > 0.66) return mix2(K.leafShade, col, x, y); // the dark under the leaves
  } else if (k > 0.5) {
    // runners: 1px vines out from the patch, a small leaf pair every few px
    const r = ihash(Math.floor(x / 9), Math.floor(y / 7), 1037);
    if (r % 3 === 0) {
      const ry = Math.floor(y / 7) * 7 + ((r >>> 4) % 6);
      const along = x - Math.floor(x / 9) * 9;
      const yy = ry + Math.round(Math.sin((x + (r % 7)) * 0.6));
      if (y === yy) return along % 4 === 0 ? K.leaf : K.leafShade;
      if (y === yy - 1 && along % 4 === 0) return K.leafDeep;
    }
  }
  // fallen stems (10%)
  const f = ihash(Math.floor(x / 16), Math.floor(y / 16), 1029 + v);
  if (f % 10 === 0) {
    const ox = (f >>> 8) % 12;
    const oy = (f >>> 12) % 10;
    const lx = lxOf(x);
    const ly = ((y % 16) + 16) % 16;
    if (ly - oy === Math.round((lx - ox) * 0.4) && lx >= ox && lx < ox + 9) return K.woodDark;
  }
  return col;
};
/** The shade under creeping leaves: dark, letting a strand show through now and then. */
function mix2(a: number, b: number, x: number, y: number): number {
  return (x * 3 + y) % 5 === 0 ? b : a;
}


/** 耕した畝: east–west ridges, the crests lit, the furrows dark; the lane is ploughed too. */
const texTilled: HTex = (x, y, v) => {
  const wob = Math.round((valueNoise(x / 14, 0.5, 1041) - 0.5) * 3);
  const p = (((y + wob) % 6) + 6) % 6;
  let col = p === 0 ? K.woodLt : p <= 2 ? K.brassOld : p === 3 ? K.wood : K.woodDark;
  if (p === 5 && valueNoise(x / 4, y / 6, 1043) > 0.6) col = K.mudDk;
  // clods (6%): little lumps with a lit top
  const a = cluster(x, y, 5, 1045 + v, 0.12);
  if (a) col = a === 1 ? K.woodLt : a === 2 ? K.brassOld : K.woodDark;
  // the rotary's comb marks along the crests
  if (p === 1 && ((x + ((y / 6) | 0) * 3) % 5 === 0)) col = K.wood;
  return col;
};

/** ヌタ場: wallow mud with a wet sheen, shallow puddles (they mirror the sky) and hoof prints. */
const texNuta: HTex = (x, y, v) => {
  const n = fbm(x / 9, y / 9, 1051);
  let col = n > 0.64 ? K.mudSheen : n < 0.28 ? K.mudDk : K.mud;
  if (ihash(x, y, 1053) % 23 === 0) col = K.mudSheen; // 1px gleam
  const pud = fbm(x / 13, y / 9, 1055);
  if (pud > 0.66) return pud > 0.69 ? K.navy : K.mudDk;
  // hoof prints (a split pair) 20%
  const cx = Math.floor(x / 7);
  const cy = Math.floor(y / 6);
  const h = ihash(cx, cy, 1057 + v);
  if (h % 5 === 0) {
    const lx = x - cx * 7 - (h >>> 8) % 3;
    const ly = y - cy * 6 - (h >>> 12) % 2;
    if ((lx === 0 || lx === 2) && (ly === 0 || ly === 1)) return K.mudDk;
    if ((lx === 0 || lx === 2) && ly === 2) return K.mudSheen;
  }
  return col;
};

/** Which terrace (0 = top) a paddy row belongs to (52 3.3: tiers at y3–4, 6–7 … 18–19). */
function tierOf(ty: number): number {
  return Math.max(0, Math.min(5, Math.floor((ty - 3) / 3)));
}

/**
 * Field stones (野石・野面積み): a jittered grid of stone centres, each pixel
 * belongs to the nearest one; where two stones meet is the joint. Returns the
 * stone's id, how deep in the joint the pixel is, and where it sits in its
 * stone (-1..1, for the rounded shading: lit upper left, dark lower right).
 */
interface Stone {
  id: number;
  joint: boolean;
  u: number;
  v: number;
}
function fieldStone(x: number, y: number, cw: number, ch: number, seed: number): Stone {
  const gx = Math.floor(x / cw);
  const gy = Math.floor(y / ch);
  let d1 = 1e9;
  let d2 = 1e9;
  let best = 0;
  let bx = 0;
  let by = 0;
  let bw = cw;
  for (let j = -1; j <= 1; j++)
    for (let i = -1; i <= 1; i++) {
      const cx = gx + i;
      const cy = gy + j;
      const h = ihash(cx, cy, seed);
      // stones of different sizes: some cells hold a big stone (its point centred), some a small one
      const px = cx * cw + 1 + (h % Math.max(1, cw - 2));
      const py = cy * ch + ((h >>> 8) % Math.max(1, ch));
      const sw = 0.75 + ((h >>> 16) % 5) * 0.15;
      const dx = (x - px) / sw;
      const dy = ((y - py) * cw) / ch / sw;
      const d = dx * dx + dy * dy;
      if (d < d1) {
        d2 = d1;
        d1 = d;
        best = h;
        bx = px;
        by = py;
        bw = sw * cw;
      } else if (d < d2) d2 = d;
    }
  const joint = Math.sqrt(d2) - Math.sqrt(d1) < 1.1;
  return { id: best, joint, u: (x - bx) / (bw * 0.6), v: ((y - by) * cw) / ch / (bw * 0.6) };
}

/** The colour of a field stone's pixel: grey stones of three kinds, rounded, moss in some joints. */
function stoneCol(s: Stone, x: number, y: number, mossRate: number): number {
  if (s.joint) return (s.id >>> 3) % 100 < mossRate ? (h01(x, y, 1121) < 0.5 ? K.leaf : K.leafShade) : K.charcoal;
  const kind = s.id % 3;
  const lit = -s.u * 0.6 - s.v;
  const base = kind === 0 ? K.steel : kind === 1 ? K.concreteMd : K.asphaltLt;
  const hi = kind === 0 ? K.concrete : kind === 1 ? K.concrete : K.steel;
  const lo = kind === 2 ? K.asphalt : K.asphaltLt;
  let c = lit > 0.55 ? hi : lit < -0.6 ? lo : base;
  if (lit > 1.1) c = K.concreteLt;
  // lichen and a moss cushion on some stones
  if ((s.id >>> 11) % 9 === 0 && lit > -0.2 && h01(x, y, 1123) < 0.55) c = K.leafDeep;
  return c;
}

/**
 * 棚田 (8月末): the rice is heading. Planted hills in rows every 6px, a hill
 * every 4px along the row (the rows shifted 2px one to the next): each hill
 * a tuft of upright leaves lit on the upper left, and on most of them an
 * ear (穂) bending over in a 3px arc, pale green at the neck, turning gold at
 * the tip — more ears and more gold on the lower terraces. The water shows
 * only in the row gaps (a 1px line, broken where leaves lean over it) and in
 * a 2px strip under the 畦; the second row's last 6px is the terrace's
 * dry-stone wall. The north–south dividing 畦 are painted only.
 */
const texTanada: HTex = (x, y, v, ctx) => {
  const lx = lxOf(x);
  const ly = ((y % 16) + 16) % 16;
  const tx = txOf(x);
  const ty = Math.floor(y / 16);
  const upper = ctx.ground(tx, ty - 1) !== 'h_tanada';
  const lower = ctx.ground(tx, ty + 1) !== 'h_tanada';
  const tier = tierOf(ty);
  // the terrace wall (野面積み) under the second row: round field stones of
  // mixed sizes, the grass of the paddy's lip hanging over the top
  if (lower && ly >= 10) {
    const wy = ly - 10;
    const hang = ihash(x >> 1, ty, 1107) % 4;
    if (wy === 0) return h01(x, ty, 1101) < 0.4 ? K.leaf : K.leafDeep; // the lip
    if (wy <= hang && (x & 1) === 0) return wy === hang ? K.leafDeep : K.leaf;
    if (wy === 5) return h01(x, ty, 1109) < 0.3 ? K.leafShade : K.charcoal; // the wall's foot in shade
    return stoneCol(fieldStone(x, y, 6, 4, 1103 + tier), x, y, 30);
  }
  // water strip right under the 畦 (north edge of the upper row): broken by
  // the 畦's grass hanging down and the first hills' leaf tips leaning up
  if (upper && ly < 2) {
    const g = ihash(x, ty, 1113) % 100;
    if (ly === 0) return g < 22 ? K.leafDeep : g < 30 ? K.leaf : K.navy;
    return g % 7 === 0 || ((x & 3) === 1 && g < 45) ? K.leafShade : K.navy;
  }
  // painted dividing 畦 (north–south), a different column in each terrace:
  // a narrow grassy ridge — shade on the west, a worn line of soil, lit grass
  const div = [28, 25, 31, 27, 24, 30][tier];
  if (tx === div && lx >= 5 && lx <= 9) {
    const g = ihash(x, y >> 1, 1109) % 6;
    if (lx === 5) return (y & 7) === 3 ? K.navy : K.leafShade;
    if (lx === 6) return g === 0 ? K.leafShade : K.leafDeep;
    if (lx === 7) return g < 2 ? K.soilDk : g < 4 ? K.leaf : K.leafDeep;
    if (lx === 8) return g < 3 ? K.leafYoung : K.leaf;
    return g === 0 ? K.leafLt : K.leafYoung;
  }
  // the hills: rows every 6px (the phase moves with the variant), a hill every 4px
  const yy = y + (v % 3) * 2;
  const row = Math.floor(yy / 6);
  const r6 = ((yy % 6) + 6) % 6;
  const xx = x + (row & 1) * 2;
  const col4 = Math.floor(xx / 4);
  const gx = ((xx % 4) + 4) % 4;
  const hh = ihash(col4, row, 1111 + v);
  // the row gap: the water (sky) as a 1px line, leaf tips of the hill behind leaning over it
  if (r6 === 5) {
    if (gx === 3 && (hh & 3) === 0) return K.leafShade;
    if (gx === 1 && ((hh >>> 2) & 3) === 0) return K.leafDeep;
    return K.navy;
  }
  // the ear on top: a drooping arc to the east or the west from the tuft's crown
  const earRate = 50 + tier * 8; // % of hills heading (fewer on the top terraces)
  const ripe = ((hh >>> 20) % 100) < 20 + tier * 12; // % of those already gold
  if ((hh >>> 8) % 100 < earRate) {
    const east = ((hh >>> 16) & 1) === 0;
    const ex = east ? gx : 3 - gx;
    // neck (1,0) → (2,0) → tip (3,1): pale green, then gold
    if (r6 === 0 && ex === 1) return K.leafLt;
    if (r6 === 0 && ex === 2) return ripe ? K.goldPale : K.leafLt;
    if (r6 === 1 && ex === 3) return ripe ? K.brass : K.goldPale;
  }
  // the tuft: upright leaves, lit on the upper left, the base in shade
  if (r6 === 0) return gx === 1 ? K.leafYoung : gx === 0 && (hh & 1) ? K.leaf : (hh >>> 4) % 3 === 0 && gx === 2 ? K.leaf : K.leafDeep;
  if (r6 === 1) return gx === 0 ? K.leaf : gx === 1 ? K.leafYoung : gx === 2 ? K.leaf : K.leafDeep;
  if (r6 === 2) return gx === 0 ? K.leaf : gx === 3 ? K.leafShade : K.leafDeep;
  if (r6 === 3) return gx === 3 ? K.leafShade : gx === 0 ? K.leafDeep : (hh >>> 5) & 1 ? K.leafDeep : K.leaf;
  return gx === 1 ? K.leafDeep : K.leafShade; // r6 4: the hill's foot
};

/**
 * 用水路: a concrete U-channel, two tiles deep. The north rim, the inner
 * face of the north wall (in its own shade, formwork joints, moss at the
 * waterline), the water (navy → the water layer), the south rim.
 */
const texCanal: HTex = (x, y, v, ctx) => {
  const tx = txOf(x);
  const ty = Math.floor(y / 16);
  const ly = ((y % 16) + 16) % 16;
  const top = ctx.ground(tx, ty - 1) !== 'h_canal';
  const bot = ctx.ground(tx, ty + 1) !== 'h_canal';
  const joint = (((x + 7) % 24) + 24) % 24 === 0;
  if (top) {
    if (ly === 0) return joint ? K.concrete : K.concreteLt;
    if (ly === 1) return K.concrete;
    if (ly === 2) return K.steel;
    if (ly <= 5) {
      if (joint) return K.charcoal;
      if (ly === 5 && h01(x, y, 1121) < 0.35) return K.leafShade;
      return ly === 3 ? K.steel : h01(x, y, 1123) < 0.15 ? K.charcoal : K.asphalt;
    }
    if (ly === 6) return K.charcoal; // the waterline
    return canalWater(x, y);
  }
  if (bot) {
    if (ly <= 11) return canalWater(x, y);
    if (ly === 12) return K.night; // the rim's shadow on the water
    if (ly === 13) return K.steel;
    if (ly === 14) return joint ? K.concrete : K.concreteLt;
    return K.concrete;
  }
  void v;
  return canalWater(x, y);
};
/**
 * The canal's open water: the navy pixels mirror the night sky (the world's
 * renderer), broken by the dark troughs of the little waves running east —
 * short horizontal dashes, so the mirrored milky way reads as rippling
 * water, not as a flat dithered band.
 */
function canalWater(x: number, y: number): number {
  // wave crests (even rows) catch the sky in dashes; the troughs between them are dark
  const seg = Math.floor((x + (ihash(y, 0, 1143) % 9)) / (4 + (ihash(y, 1, 1147) % 4)));
  const h = ihash(seg, y, 1145);
  if ((y & 1) === 0) return h % 6 === 0 ? K.canalDk : K.navy;
  return h % 2 === 0 ? K.navy : h % 3 === 0 ? K.canalMd : K.canalDk;
}

/**
 * 沢: one tile wide, running south. Rounded stones stacked on both banks,
 * a few boulders in the water (the water layer puts the splashes round
 * them), the rest navy.
 */
const texStream: HTex = (x, y, v, ctx) => {
  const lx = lxOf(x);
  const tx = txOf(x);
  const ty = Math.floor(y / 16);
  const wob = Math.round((valueNoise(y / 7, tx, 1131) - 0.5) * 2);
  const bankL = 3 + wob;
  const bankR = 12 + Math.round((valueNoise(y / 6, tx + 3, 1133) - 0.5) * 2);
  const stone = (sx: number, sy: number): number => {
    // round stones in a jittered 4px grid, lit top-left, dark bottom-right
    const cx = Math.floor(sx / 4);
    const cy = Math.floor(sy / 4);
    const h = ihash(cx, cy, 1135 + v);
    const ox = sx - cx * 4 - (h & 1);
    const oy = sy - cy * 4 - ((h >>> 1) & 1);
    if (ox < 0 || oy < 0 || ox > 2 || oy > 2) return K.charcoal;
    if (ox + oy === 0) return (h >>> 7) % 5 < 2 ? K.white : K.concreteLt; // the starlight on the round tops
    if (ox + oy >= 4) return K.asphalt;
    return (h >>> 4) % 5 === 0 ? K.leafDeep : (h >>> 4) % 3 === 0 ? K.concrete : K.steel;
  };
  if (lx <= bankL || lx >= bankR) return stone(x, y);
  // the water breaking white against the banks' stones (1px, here and there)
  if ((lx === bankL + 1 || lx === bankR - 1) && ihash(x, y >> 1, 1139) % 3 === 0) return y & 1 ? K.concreteLt : K.white;
  // a boulder in the stream now and then, the spray in a V below it
  const bh = ihash(tx, Math.floor(y / 12), 1137);
  if (bh % 4 === 0) {
    const bx = 5 + (bh >>> 4) % 5;
    const by = Math.floor(y / 12) * 12 + 3 + ((bh >>> 8) % 5);
    const dx = lx - bx;
    const dy = y - by;
    if (dx * dx + dy * dy * 1.4 <= 4) return dx + dy < 0 ? K.white : dx + dy > 1 ? K.asphalt : K.steel;
    if (dy >= 2 && dy <= 5 && Math.abs(Math.abs(dx) - (dy - 1)) < 0.6) return dy < 4 ? K.white : K.concreteLt;
  }
  // the current's ripples: short pale dashes across the flow
  const rh = ihash(Math.floor(lx / 3), y, 1141);
  if (rh % 13 === 0 && lx > bankL + 1 && lx < bankR - 1) return K.steel;
  void ty;
  void ctx;
  return K.navy;
};

/** 線路 (east–west siding): ballast, sleepers every 6px, two rusty rails, grass between the sleepers. */
const texRail: HTex = (x, y, v) => {
  const ly = ((y % 16) + 16) % 16;
  // ballast
  const cx = Math.floor(x / 4);
  const cy = Math.floor(y / 4);
  const h = ihash(cx, cy, 1141 + v);
  const bx = x - cx * 4 - (h & 1);
  const by = y - cy * 4 - ((h >>> 1) & 1);
  let col = K.asphaltDk;
  if (bx >= 0 && by >= 0 && bx < 3 && by < 3) col = bx + by === 0 ? K.concreteLt : bx + by >= 3 ? K.asphalt : (h >>> 5) % 5 === 0 ? K.brassOld : K.steel;
  // sleepers: 3px wide, from y1 to y14
  const sx = (((x + 2) % 6) + 6) % 6;
  const row = Math.floor((x + 2) / 6);
  const sh = ihash(row, 7, 1143);
  const sOn = sx < 3 && ly >= 1 + (sh & 1) && ly <= 14 - ((sh >>> 1) & 1);
  if (sOn) {
    const worn = (sh >>> 3) % 5 === 0;
    col = sx === 0 ? (worn ? K.brass : K.woodLt) : sx === 2 ? K.woodDark : worn && (ly & 3) === 0 ? K.woodDark : K.wood;
  } else if (sx === 3 && ly >= 2 && ly <= 13) col = K.charcoal; // shadow of the sleeper
  // grass between the sleepers
  if (!sOn && ihash(x >> 1, ly >> 2, 1145) % 7 === 0 && (ly <= 2 || ly >= 13)) col = (x & 1) ? K.leaf : K.leafDeep;
  // rails
  if (ly === 3 || ly === 11) return ihash(x >> 3, ly, 1147) % 9 === 0 ? K.white : K.concreteLt;
  if (ly === 4 || ly === 12) return K.brassOld;
  if (ly === 5 || ly === 13) return sOn ? K.woodDark : K.charcoal;
  return col;
};

/** 丘の山道: dark earth, cedar roots across it, fallen needles, a stone or two. */
const texYamamichi: HTex = (x, y, v) => {
  const n = fbm(x / 12, y / 12, 1151);
  let col = n > 0.66 ? K.soil : n < 0.3 ? K.woodDark : K.wood;
  // roots: meandering dark bands
  const r = valueNoise(x / 7 + Math.sin(y / 9) * 0.8, y / 22, 1153);
  if (r > 0.47 && r < 0.53) return r > 0.5 ? K.woodDark : K.woodMd;
  // needles
  if (ihash(x, y, 1155) % 13 === 0) col = (x & 1) ? K.leafShade : K.brassOld;
  const a = cluster(x, y, 6, 1157 + v, 0.1);
  if (a) col = a === 1 ? K.concrete : a === 4 ? K.asphalt : K.steel;
  return col;
};

/** The worn gravel footpaths across the hill's plaza (tile coords): from the path's head to the pole, the dome's door and the bench. */
const HILL_PATHS: [number, number, number, number][] = [
  [17.9, 8.6, 17.4, 6.6],
  [17.4, 6.6, 15.9, 4.7],
  [17.4, 6.6, 10.5, 6.5],
  [10.5, 6.5, 4.5, 6.2],
  [17.4, 6.6, 19.8, 7.2],
];
function hillPathD(x: number, y: number): number {
  const px = x / 16;
  const py = y / 16;
  let best = 99;
  for (const [ax, ay, bx, by] of HILL_PATHS) {
    const dx = bx - ax;
    const dy = by - ay;
    const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
    best = Math.min(best, Math.hypot(px - ax - dx * t, py - ay - dy * t));
  }
  return best;
}

/**
 * 星見の丘の広場: grass cut short with a brush cutter — fine upright blades,
 * lit tips, the cut stems lying in faint swaths the cutter swung, a clover
 * here and there — and the worn footpaths of gravel and bare earth from the
 * path's head to the pole, the dome and the bench (their edges broken by
 * tufts). No big blotches: the variation is fine and has a cause.
 */
const texHilltop: HTex = (x, y, v) => {
  const d = hillPathD(x, y) + (valueNoise(x / 5, y / 5, 1169) - 0.5) * 0.35;
  if (d < 0.42) {
    // the footpath: packed earth and fine gravel (brownish grey: never purple patches at night)
    const cx = Math.floor(x / 3);
    const cy = Math.floor(y / 3);
    const h = ihash(cx, cy, 1163 + v);
    const ox = x - cx * 3;
    const oy = y - cy * 3;
    if (h % 3 === 0 && ox + oy === 0) return K.gravelLt;
    if (h % 3 === 1 && ox === 1 && oy === 1) return K.gravel;
    if (h % 5 === 2 && ox === 2 && oy === 0) return K.concrete;
    // the edge: grass creeping in
    if (d > 0.32 && h01(x, y, 1171) < (d - 0.32) * 7) return (x + y) & 1 ? K.leaf : K.leafDeep;
    return h01(x, y, 1167) < 0.3 ? K.soilDk : K.soil;
  }
  // the cut grass: blades in 2px lanes, each lane's height and tip varying
  const lane = x >> 1;
  const hh = ihash(lane, y >> 2, 1165 + v);
  const ly = y & 3;
  let col = (x & 1) === 0 ? K.leaf : K.leafDeep;
  if (ly === (hh & 3)) col = (x & 1) === 0 ? K.leafYoung : K.leaf; // the lit tips
  if (ly === ((hh >>> 2) & 3) && (hh >>> 6) % 3 === 0) col = K.leafShade;
  // the swaths: the cutter's arcs leave the lying stems paler every ~14px
  const sw = (x * 0.6 + y + Math.sin(x / 9) * 3) % 14;
  if (sw < 1.2 && h01(x, y, 1173) < 0.55) col = h01(x, y, 1175) < 0.4 ? K.leafLt : K.leafYoung;
  // dried clippings, clover
  const f = ihash(Math.floor(x / 7), Math.floor(y / 7), 1177 + v);
  if (f % 13 === 0) {
    const fx = Math.floor(x / 7) * 7 + 1 + ((f >>> 8) % 4);
    const fy = Math.floor(y / 7) * 7 + 1 + ((f >>> 12) % 4);
    if (y === fy && (x === fx || x === fx + 1)) return K.goldPale;
  } else if (f % 13 === 5) {
    const fx = Math.floor(x / 7) * 7 + 2 + ((f >>> 8) % 3);
    const fy = Math.floor(y / 7) * 7 + 2 + ((f >>> 12) % 3);
    if ((x === fx && (y === fy || y === fy + 2)) || (y === fy + 1 && (x === fx - 1 || x === fx + 1))) return K.leafYoung;
    if (x === fx && y === fy + 1) return K.leafShade;
  }
  return col;
};

// ---------------------------------------------------------------- indoor

/** 電車の床: grey rubber with 1px non-slip dots every 4px, a paler worn path down the aisle. */
const texTrainFloor: HTex = (x, y) => {
  const worn = valueNoise(x / 30, y / 8, 1201) > 0.55;
  if (((x + ((y >> 2) & 1) * 2) & 3) === 0 && (y & 3) === 1) return K.charcoal;
  return worn ? K.rubberLt : K.rubber;
};

/** 防草シート (the greenhouse aisles): black woven sheet, a darker weave grid, soil showing where it's torn. */
const texSheet: HTex = (x, y, v) => {
  if ((x & 3) === 0 || (y & 3) === 0) return ihash(x, y, 1211) % 7 === 0 ? K.sheetLt : K.sheetWeave;
  const tear = fbm(x / 7, y / 7, 1213) > 0.78;
  if (tear) return ((x + y) & 1) ? K.brassOld : K.soil;
  // fallen side-shoot leaves (脇芽)
  const h = ihash(x >> 3, y >> 3, 1215 + v);
  if (h % 19 === 0) {
    const lx = (x & 7) - ((h >>> 8) & 3);
    const ly = (y & 7) - ((h >>> 12) & 3);
    if (lx >= 0 && ly >= 0 && lx < 3 && ly < 2) return lx === 0 ? K.leaf : K.leafDeep;
  }
  return (x + y) % 5 === 0 ? K.sheetLt : K.sheet;
};

/** 黒マルチ under the tomato rows: black plastic with long diagonal glints. */
const texMulch: HTex = (x, y) => {
  const g = (((x - y * 2) % 23) + 23) % 23;
  if (g === 0) return K.asphalt;
  if (g === 1 && (y & 1)) return K.sheetLt;
  return valueNoise(x / 6, y / 6, 1221) > 0.7 ? K.sheetLt : K.sheet;
};

/** 牛舎の給餌通路・前室: brushed concrete with spilt feed and straw, darker where it's been hosed. */
const texBarnFloor: HTex = (x, y, v) => {
  let col = texConcrete(x, y, v, { ground: () => '' });
  const wet = fbm(x / 16, y / 10, 1231);
  if (wet > 0.7) col = col === K.concreteLt ? K.concrete : K.concreteMd;
  const h = ihash(x >> 2, y >> 2, 1233 + v);
  if (h % 9 === 0 && ((x + y) & 1) === 0 && ((x & 3) === 1)) return (h >>> 8) & 1 ? K.woodLt : K.goldPale; // straw
  if (h % 13 === 1 && (x & 3) === 2 && (y & 3) === 2) return K.brass; // a pellet of feed
  return col;
};

/** おがくず (the pens' bedding): pale shavings, little curls, trodden a shade darker in patches. */
const texSawdust: HTex = (x, y, v) => {
  const n = fbm(x / 10, y / 10, 1241);
  let col = n > 0.62 ? K.sawLt : n < 0.3 ? K.sawDk : K.saw;
  if (fbm(x / 22, y / 18, 1243) > 0.74) col = col === K.sawLt ? K.saw : K.sawDk; // trodden
  // curls: 2px strokes, lit and shaded
  const h = ihash(x >> 1, y >> 1, 1245 + v);
  if (h % 7 === 0) col = (h >>> 5) & 1 ? K.woodLt : K.paper;
  if (h % 31 === 1) col = K.sawDeep;
  return col;
};

/** 分校の床: long old boards, warm brown with age, nail heads, a paler worn lane. */
const texSchoolWood: HTex = (x, y, v) => {
  const bh = 6;
  const row = Math.floor(y / bh);
  const ly = y - row * bh;
  const len = 64 + (ihash(0, row, 1251) % 48);
  const off = ihash(1, row, 1253) % len;
  const bx = Math.floor((x + off) / len);
  const lx = (((x + off) % len) + len) % len;
  const hh = ihash(bx, row, 1255 + v);
  if (ly === bh - 1) return K.boardGap;
  if (lx === 0) return K.boardGap;
  if ((lx === 3 || lx === len - 4) && ly === 2) return K.woodDark; // nail heads
  const tone = hh % 3;
  let col = tone === 0 ? K.boardA : tone === 1 ? K.boardB : K.boardC;
  if (ly === 0) col = K.boardLit;
  const g = valueNoise(x / 12, row * 2.7, 1257 + (hh & 7));
  if (g > 0.8) col = K.boardB === col ? K.boardC : K.boardB; // grain
  if (((x * 7 + row * 13) & 31) === 0) col = K.boardC;
  return col;
};

/** 昇降口の土間: speckled concrete, a little sand carried in on shoes. */
const texGenkan: HTex = (x, y, v) => {
  const n = fbm(x / 8, y / 8, 1261);
  let col = n > 0.66 ? K.concreteLt : n < 0.3 ? K.concreteMd : K.concrete;
  const a = cluster(x, y, 3, 1263 + v, 0.18);
  if (a) col = a === 1 ? K.steel : a === 2 ? K.soilLt : K.concreteMd;
  return col;
};

// ---------------------------------------------------------------- tables

export const H_TEX: Record<HGround, HTex> = {
  h_road: texRoad,
  h_aze: texAze,
  h_ishidan: texIshidan,
  h_platform: texPlatform,
  h_kotei: texKotei,
  h_concrete: texConcrete,
  h_houki: texHouki,
  h_tilled: texTilled,
  h_nuta: texNuta,
  h_tanada: texTanada,
  h_canal: texCanal,
  h_stream: texStream,
  h_rail: texRail,
  h_trainfloor: texTrainFloor,
  h_sheet: texSheet,
  h_mulch: texMulch,
  h_barnfloor: texBarnFloor,
  h_sawdust: texSawdust,
  h_yamamichi: texYamamichi,
  h_hilltop: texHilltop,
  h_schoolwood: texSchoolWood,
  h_genkan: texGenkan,
};

/** Per-tile variants (the no-repeat rule picks one per tile). */
export const H_NVAR: Partial<Record<HGround, number>> = {
  h_road: 4,
  h_aze: 3,
  h_ishidan: 2,
  h_platform: 3,
  h_kotei: 2,
  h_concrete: 2,
  h_houki: 4,
  h_tilled: 2,
  h_nuta: 2,
  h_tanada: 3,
  h_rail: 2,
  h_sheet: 2,
  h_barnfloor: 2,
  h_sawdust: 3,
  h_yamamichi: 3,
  h_hilltop: 2,
  h_schoolwood: 3,
};

/** Border priority (higher spreads over lower at soft borders). */
export const H_PRIO: Partial<Record<HGround, number>> = {
  h_canal: 0,
  h_stream: 0,
  h_tanada: 1,
  h_road: 2,
  h_rail: 3,
  h_platform: 4,
  h_ishidan: 4,
  h_concrete: 4,
  h_kotei: 5,
  h_tilled: 6,
  h_nuta: 5,
  h_aze: 6,
  h_houki: 8,
  h_yamamichi: 6,
  h_hilltop: 7,
};
/** Soft materials: their borders wander both ways. */
export const H_SOFT: HGround[] = ['h_aze', 'h_kotei', 'h_houki', 'h_tilled', 'h_nuta', 'h_yamamichi', 'h_hilltop'];
/** Green materials (get the grass lip). */
export const H_GREEN: HGround[] = ['h_houki', 'h_hilltop'];
/** Materials that keep a straight edge (never wander, never get wandered into). */
export const H_HARD: HGround[] = ['h_canal', 'h_stream', 'h_tanada', 'h_rail', 'h_platform', 'h_ishidan', 'h_trainfloor', 'h_sheet', 'h_mulch', 'h_barnfloor', 'h_sawdust', 'h_schoolwood', 'h_genkan'];

export function isHGround(g: string): g is HGround {
  return (H_TEX as Record<string, HTex>)[g] !== undefined;
}
