// Chapter 3 ground materials (62_ch3_level_art 7.1・8.1・8.7): 海ぞいの町 at
// noon — the old harbour road with its sand blown in, the brushed concrete of
// the quay, the breakwater's big slabs, the beach and its wet edge, the stone
// steps up the hill and down into the harbour, the old flagstones of the
// plazas, the straw under the mikan trees, the salted alley of the dried-fish
// shop, the rocks, and the water: the harbour's deep teal and the sea's blue,
// both a still mirror of the noon sky (stage 1, 8.7). The truck's bed
// (map_c3_nidai) is here too.
//
// Like chapter 2's (hoshi_ground.ts) every material is computed per world
// pixel in daylight colours; the grade does the rest. The water here is not
// the navy mask of chapters 1–2: the stopped sea is painted (sky, a cloud or
// two, the quay's face where it meets the water), so the 2D and the HD-2D
// ground show the same still mirror. The moving sea of 12:01 is chapter 3's
// second part (a layer over these tiles).

import { mix, rgba32 } from '../../engine/pixel';
import { fbm, h01, ihash, valueNoise } from './noise';

/** The colours chapter 3 adds (62 8.1). */
export const CP = {
  umi: '#3A7EA8',
  umiLt: '#5AA0C8',
  umiDk: '#2A5A82',
  minato: '#2E6A72',
  minatoLt: '#4A8A90',
  sand: '#EAD8B0',
  sandLt: '#F6E8C8',
  sandDk: '#CDB88E',
  sandWet: '#C8B488',
  quay: '#B8B4AA',
  quayLt: '#D2CEC4',
  quayDk: '#8E8A80',
  road: '#8A8E96',
  roadLt: '#A8ACB2',
  roadDk: '#6B7186',
  siren: '#A8452E',
  noren: '#C8452E',
  mikanLeaf: '#2E6A3A',
  mikanLeafLt: '#4A8A4A',
  mikanGreen: '#6AA04A',
  aqTile: '#E8E4D8',
  aqBand: '#3A7EA8',
  glass: '#7FD1E8',
  noon: '#FFF6D8',
  skyTop: '#5AA8E8',
  skyBot: '#E8F4FA',
  stone: '#A8A49A',
  plaza: '#B8B0A0',
  moss: '#6A9A4A',
  rock: '#6B6A66',
  rockLt: '#8E8C86',
  olive: '#5A6B2A',
  oliveLt: '#7A8B3A',
  oliveDk: '#3A4A1A',
} as const;

/** Chapter 3 ground ids (cast to world Ground in the map legends). */
export const C3_GROUNDS = [
  'c3_road',
  'c3_quay',
  'c3_bouhatei',
  'c3_sand',
  'c3_nagisa',
  'c3_ishidan',
  'c3_hiroba',
  'c3_mikan',
  'c3_alley',
  'c3_kusa',
  'c3_minato',
  'c3_umi',
  'c3_iwa',
  'c3_nidai',
  // 海の 中 (map_c3_umi, 62 4.7・8.7): the floor of the harbour (mud) and of the beach (white sand), the rocks
  'c3_soko',
  'c3_soko_iwa',
] as const;
export type C3Ground = (typeof C3_GROUNDS)[number];

/** Neighbourhood lookups (same as chapter 2's). */
export interface C3TexCtx {
  ground(tx: number, ty: number): string;
}
export type C3Tex = (x: number, y: number, v: number, ctx: C3TexCtx) => number;

const c = (hex: string) => rgba32(hex);
const K = {
  white: c('#F4F1E8'),
  pure: c('#FFFFFF'),
  ink: c('#2A2440'),
  charcoal: c('#3A3F48'),
  asphalt: c('#6B7186'),
  steel: c('#9AA0A8'),
  concrete: c('#C8C2B4'),
  concreteLt: c('#E8E4D8'),
  road: c(CP.road),
  roadLt: c(CP.roadLt),
  roadDk: c(CP.roadDk),
  roadSand: c(mix(CP.road, CP.sand, 0.55)),
  line: c('#E8E4D8'),
  quay: c(CP.quay),
  quayLt: c(CP.quayLt),
  quayDk: c(CP.quayDk),
  quayWet: c(mix(CP.quay, CP.quayDk, 0.6)),
  bou: c('#C8C4B8'),
  bouLt: c('#DAD6CA'),
  bouDk: c('#A8A498'),
  salt: c('#9AA0A8'),
  sand: c(CP.sand),
  sandLt: c(CP.sandLt),
  sandDk: c(CP.sandDk),
  sandWet: c(CP.sandWet),
  sandWetSky: c(mix(CP.sandWet, '#A8D0E8', 0.42)),
  sandWetSkyLt: c(mix(CP.sandWet, '#D8ECF8', 0.5)),
  shellPink: c('#E8A0A0'),
  stone: c(CP.stone),
  stoneLt: c(mix(CP.stone, '#E8E4D8', 0.5)),
  stoneDk: c(mix(CP.stone, '#5A564E', 0.5)),
  joint: c('#5A564E'),
  plaza: c(CP.plaza),
  plazaLt: c(mix(CP.plaza, '#E8E4D8', 0.45)),
  plazaDk: c(mix(CP.plaza, '#6B6A66', 0.45)),
  plazaJoint: c(mix(CP.plaza, '#6B6A66', 0.32)),
  plazaWarm: c(mix(CP.plaza, '#C8B898', 0.5)),
  plazaCool: c(mix(CP.plaza, '#9A9A9A', 0.35)),
  plazaLip: c(mix(CP.plaza, '#E8E4D8', 0.25)),
  moss: c(CP.moss),
  mossDk: c('#4A7A4A'),
  soil: c('#9A7A5A'),
  soilDk: c('#7A5A3A'),
  straw: c('#D9C08A'),
  strawDk: c('#B89A5A'),
  alley: c(mix('#B89A72', CP.sand, 0.35)),
  alleyLt: c(mix('#C8A882', CP.sandLt, 0.5)),
  alleyDk: c('#9A7A5A'),
  grass: c('#7AA85A'),
  grassLt: c('#9BCB6B'),
  grassDk: c('#4A7A3A'),
  hirugao: c('#F2B8C8'),
  hirugaoLt: c('#FBE0E8'),
  rock: c(CP.rock),
  rockLt: c(CP.rockLt),
  rockDk: c('#4A4946'),
  barnacle: c('#E8E4D8'),
  umi: c(CP.umi),
  umiLt: c(CP.umiLt),
  umiDk: c(CP.umiDk),
  umiSky: c(mix(CP.umi, CP.skyTop, 0.45)),
  umiSkyLt: c(mix(CP.umiLt, '#A8D4F0', 0.55)),
  umiCloud: c(mix('#A8D4F0', CP.skyBot, 0.55)),
  umiCloudLt: c(mix(CP.skyBot, '#FFFFFF', 0.4)),
  minato: c(CP.minato),
  minatoLt: c(CP.minatoLt),
  minatoDk: c(mix(CP.minato, '#1B3A42', 0.5)),
  minatoSky: c(mix(CP.minato, CP.skyTop, 0.35)),
  minatoCloud: c(mix(CP.minatoLt, CP.skyBot, 0.45)),
  seaweed: c('#3A5A3A'),
  olive: c(CP.olive),
  oliveLt: c(CP.oliveLt),
  oliveDk: c(CP.oliveDk),
};

const lxOf = (x: number) => ((x % 16) + 16) % 16;
const lyOf = (y: number) => ((y % 16) + 16) % 16;
const txOf = (x: number) => Math.floor(x / 16);
const tyOf = (y: number) => Math.floor(y / 16);

const WATER = new Set(['c3_umi', 'c3_minato']);
const isWater = (g: string) => WATER.has(g);

// ---------------------------------------------------------------- roads and concrete

/** 港通り: tired pale asphalt, hairline cracks, flakes of an old white line, sand blown to the edges. */
const texRoad: C3Tex = (x, y, v, ctx) => {
  const n = fbm(x / 22 + v * 1.7, y / 22, 3011);
  let col = K.road;
  // a quiet drift of the old surface (dithered, never in blotches)
  const g = h01(x, y, 3013 + v);
  if (n > 0.66 && g < (n - 0.6) * 1.6) col = K.roadLt;
  else if (n < 0.3 && g < (0.36 - n) * 1.6) col = K.roadDk;
  if (g > 0.975) col = K.roadLt;
  else if (g < 0.03) col = K.roadDk;
  // hairline cracks: a wandering line now and then
  const cr = valueNoise(x / 9, y / 9, 3017 + v);
  if (Math.abs(cr - 0.5) < 0.012 && valueNoise(x / 40, y / 40, 3019) > 0.55) col = K.charcoal;
  // the faded centre line (one row along y 17), in flakes
  const ty = tyOf(y);
  const ly = lyOf(y);
  if (ty === 17 && (ly === 7 || ly === 8) && ((x >> 3) & 1) === 0 && h01(x >> 1, ly, 3021) < 0.55) col = K.line;
  // sand blown in from the beach against whatever is not road
  const tx = txOf(x);
  let d = 9;
  for (let k = 1; k <= 3 && d > 3; k++) {
    if (ctx.ground(txOf(x - k * 2), ty) !== 'c3_road' || ctx.ground(txOf(x + k * 2), ty) !== 'c3_road') d = k;
    else if (ctx.ground(tx, tyOf(y - k * 2)) !== 'c3_road' || ctx.ground(tx, tyOf(y + k * 2)) !== 'c3_road') d = k;
  }
  if (d <= 3 && h01(x, y, 3023) < 0.5 - d * 0.12) col = h01(x, y, 3025) < 0.5 ? K.roadSand : K.sand;
  return col;
};

/** 岸壁: brushed concrete (horizontal strokes), wet stains, fish-scale glints, rope scuffs; the coping over the water. */
const texQuay: C3Tex = (x, y, v, ctx) => {
  const tx = txOf(x);
  const ty = tyOf(y);
  const ly = lyOf(y);
  const lx = lxOf(x);
  // the coping where the quay meets the water to the south
  if (isWater(ctx.ground(tx, ty + 1))) {
    if (ly === 15) return K.quayDk;
    if (ly === 14) return h01(x, 0, 3031) < 0.15 ? K.quay : K.quayLt;
    if (ly === 13) return K.white;
  }
  if (isWater(ctx.ground(tx - 1, ty)) && lx === 0) return K.quayDk;
  if (isWater(ctx.ground(tx + 1, ty)) && lx === 15) return K.quayDk;
  // brush strokes: rows of 1px, slightly lighter / darker in runs
  const stroke = valueNoise(x / 7, y * 1.3, 3033 + v);
  let col = stroke > 0.62 ? K.quayLt : stroke < 0.3 ? K.quayDk : K.quay;
  if (stroke >= 0.3 && stroke <= 0.62 && (y & 1) === 0 && h01(x >> 2, y, 3035) < 0.25) col = K.quayLt;
  // panel joints every 64px
  if ((((x + 21) % 64) + 64) % 64 === 0) col = K.quayDk;
  // wet stains (irregular, the colour of wet concrete)
  const wet = fbm(x / 26, y / 20, 3037 + v);
  if (wet > 0.66 && h01(x, y, 3039) < (wet - 0.6) * 4) col = K.quayWet;
  // fish scales catching the light (two of the four variants)
  if (v < 2 && ihash(x, y, 3041) % 211 === 0) col = K.pure;
  // a rope's scuff: a short pale diagonal
  const r = ihash(Math.floor(x / 24), Math.floor(y / 24), 3043 + v);
  if (r % 9 === 0) {
    const ox = Math.floor(x / 24) * 24 + ((r >>> 8) % 12);
    const oy = Math.floor(y / 24) * 24 + ((r >>> 12) % 12);
    const k = x - ox;
    if (k >= 0 && k < 7 && y - oy === (k >> 1)) col = K.quayLt;
  }
  return col;
};

/** 防波堤の上: big poured slabs (a joint every 32px), salt stains; a 1px step and its shadow on the sea side. */
const texBouhatei: C3Tex = (x, y, v, ctx) => {
  const tx = txOf(x);
  const ty = tyOf(y);
  const ly = lyOf(y);
  const lx = lxOf(x);
  const n = fbm(x / 18, y / 18, 3051 + v);
  let col = n > 0.66 ? K.bouLt : n < 0.3 ? K.bouDk : K.bou;
  if ((((x + 5) % 32) + 32) % 32 === 0) col = K.bouDk;
  if ((((x + 5) % 32) + 32) % 32 === 1) col = K.bouLt;
  const salt = fbm(x / 30, y / 22, 3053);
  if (salt > 0.68 && h01(x, y, 3055) < (salt - 0.62) * 3) col = K.salt;
  // the sea-side edges: a lit 1px lip, then the drop's shadow
  const s = ctx.ground(tx, ty + 1);
  const nn = ctx.ground(tx, ty - 1);
  if (s !== 'c3_bouhatei' && s !== 'c3_quay') {
    if (ly === 15) return K.bouDk;
    if (ly === 14) return K.white;
  }
  if (nn !== 'c3_bouhatei' && nn !== 'c3_quay' && ly === 0) return K.bouLt;
  if (ctx.ground(tx - 1, ty) !== 'c3_bouhatei' && ctx.ground(tx - 1, ty) !== 'c3_quay' && lx === 0) return K.white;
  if (ctx.ground(tx + 1, ty) !== 'c3_bouhatei' && ctx.ground(tx + 1, ty) !== 'c3_quay' && lx === 15) return K.bouDk;
  return col;
};

// ---------------------------------------------------------------- the beach

/** 砂浜: bright sand, tiny shells (white and pink), pebbles; one variant has footprints. */
const texSand: C3Tex = (x, y, v) => {
  const n = fbm(x / 14, y / 10, 3061);
  let col = n > 0.66 ? K.sandLt : n < 0.3 ? K.sandDk : K.sand;
  const g = h01(x, y, 3063 + v);
  if (g < 0.04) col = K.sandDk;
  else if (g > 0.975) col = K.sandLt;
  // wind ripples: faint diagonal rows
  if (((x + y * 2 + Math.round(valueNoise(x / 20, y / 20, 3065) * 6)) % 9 + 9) % 9 === 0 && n > 0.4) col = K.sandDk;
  const sh = ihash(Math.floor(x / 9), Math.floor(y / 9), 3067 + v);
  if (sh % 13 === 0) {
    const sx = Math.floor(x / 9) * 9 + 2 + ((sh >>> 8) % 5);
    const sy = Math.floor(y / 9) * 9 + 2 + ((sh >>> 12) % 5);
    if ((x === sx || x === sx + 1) && y === sy) return (sh >>> 16) % 3 === 0 ? K.shellPink : K.white;
    if (x === sx && y === sy + 1) return K.sandDk;
  }
  // footprints (variant 3): a little child's trail going north-east
  if (v === 3) {
    const lx = lxOf(x);
    const ly = lyOf(y);
    for (const [fx, fy] of [[3, 11], [8, 6], [12, 1]] as const)
      if (lx >= fx && lx <= fx + 1 && ly >= fy && ly <= fy + 2) return ly === fy ? K.sandDk : K.sandWet;
  }
  return col;
};

/**
 * 波打ちぎわ: wet sand mirroring the noon sky (a pale blue wash, lighter
 * towards the sea), and the line of foam stopped where the wave left it.
 */
const texNagisa: C3Tex = (x, y, v, ctx) => {
  const ly = lyOf(y);
  const tx = txOf(x);
  const ty = tyOf(y);
  const sea = isWater(ctx.ground(tx, ty + 1));
  const k = ly / 15;
  const n = fbm(x / 12, y / 8, 3071 + v);
  let col = K.sandWet;
  if (h01(x, y, 3073) < k * 0.9 + (n - 0.5) * 0.4) col = k > 0.6 ? K.sandWetSkyLt : K.sandWetSky;
  // the stopped foam: a wavy dotted white line near the sea edge, and a second fainter one
  const wave = Math.round(Math.sin(x / 7 + v) * 1.5 + (valueNoise(x / 11, ty, 3075) - 0.5) * 3);
  if (sea && ly === 12 + wave && ((x * 7 + ly) % 5 !== 0)) return K.white;
  if (sea && ly === 13 + wave && h01(x, y, 3077) < 0.4) return K.pure;
  if (ly === 5 + (wave >> 1) && h01(x, y, 3079) < 0.35) return K.white;
  // the dry edge on the land side
  if (ly <= 1 && h01(x, y, 3081) < 0.6 - ly * 0.3) return K.sandDk;
  return col;
};

// ---------------------------------------------------------------- steps, plazas, the hill

/** 石段: flat stone steps (8px), lit lip, 2px shadow; at the harbour the last steps are concrete going into the water, green with weed. */
const texIshidan: C3Tex = (x, y, v, ctx) => {
  const tx = txOf(x);
  const ty = tyOf(y);
  const lx = lxOf(x);
  const ly = lyOf(y);
  const harbour = isWater(ctx.ground(tx, ty + 1)) || isWater(ctx.ground(tx, ty)) || ctx.ground(tx, ty - 1) === 'c3_quay';
  const step = ly & 7;
  const left = ctx.ground(tx - 1, ty) !== 'c3_ishidan';
  const right = ctx.ground(tx + 1, ty) !== 'c3_ishidan';
  if (left && lx === 0) return K.stoneDk;
  if (right && lx === 15) return K.joint;
  if (harbour) {
    const deep = isWater(ctx.ground(tx, ty + 1)) && ly >= 8;
    if (step === 7 || step === 6) return deep ? K.seaweed : K.quayDk;
    if (step === 0) return deep ? K.mossDk : K.quayLt;
    let col = deep ? (h01(x, y, 3091) < 0.55 ? K.mossDk : K.moss) : K.quay;
    if (!deep && h01(x, y, 3093) < 0.12) col = K.quayDk;
    return col;
  }
  if (step === 7) return K.joint;
  if (step === 6) return K.stoneDk;
  if (step === 0) return K.stoneLt;
  // field stones on the tread: a joint every 5–7 px
  const sw = 5 + (ihash(ly >> 3, ty, 3095) % 3);
  const off = ihash(ly >> 3, ty, 3097) % sw;
  if ((((x + off) % sw) + sw) % sw === 0) return h01(x, y, 3099) < 0.3 ? K.moss : K.stoneDk;
  const n = fbm(x / 6, y / 6, 3101 + v);
  return n > 0.62 ? K.stoneLt : n < 0.32 ? K.stoneDk : K.stone;
};

/** サイレン塔の広場・旧水族館の前: old square flagstones (8px, rows offset), worn smooth; grass in some of the joints. */
const texHiroba: C3Tex = (x, y, v) => {
  const row = Math.floor(y / 8);
  const off = row & 1 ? 4 : 0;
  const cx = Math.floor((x + off) / 8);
  const lx = (((x + off) % 8) + 8) % 8;
  const ly = ((y % 8) + 8) % 8;
  const s = ihash(cx, row, 3117 + v);
  if (lx === 0 || ly === 0) {
    const gr = valueNoise(x / 14, y / 14, 3113) > 0.62 && h01(x, y, 3111) < 0.55;
    return gr ? (h01(x, y, 3115) < 0.5 ? K.moss : K.grassDk) : K.plazaJoint;
  }
  let col = s % 4 === 0 ? K.plazaWarm : s % 5 === 0 ? K.plazaCool : K.plaza;
  if (ly === 1 && s % 3 !== 0) col = K.plazaLip;
  if (h01(x, y, 3119) < 0.03) col = K.plazaCool;
  return col;
};

/** みかん畑の下草と作業道: dark soil, straw mulch in short strokes, a few weeds. */
const texMikan: C3Tex = (x, y, v) => {
  const n = fbm(x / 10, y / 10, 3121 + v);
  let col = n > 0.6 ? K.soil : K.soilDk;
  const s = ihash(Math.floor(x / 4), Math.floor(y / 3), 3123 + v);
  if (s % 3 !== 0) {
    const sx = Math.floor(x / 4) * 4 + ((s >>> 8) % 2);
    const sy = Math.floor(y / 3) * 3 + ((s >>> 12) % 3);
    if (y === sy && x >= sx && x < sx + 3) col = (s >>> 16) & 1 ? K.straw : K.strawDk;
  }
  if (h01(x, y, 3125) < 0.03) col = K.grass;
  return col;
};

/** 干物屋の路地: packed earth with sand in it, spilt salt (white specks). */
const texAlley: C3Tex = (x, y, v) => {
  const n = fbm(x / 16, y / 12, 3131 + v);
  let col = n > 0.65 ? K.alleyLt : n < 0.3 ? K.alleyDk : K.alley;
  const g = h01(x, y, 3133);
  if (g < 0.04) col = K.alleyDk;
  if (g > 0.96) col = K.white;
  return col;
};

/** 空き地の草: short sea-wind grass, ハマヒルガオ pink here and there. */
const texKusa: C3Tex = (x, y, v) => {
  const n = fbm(x / 14, y / 14, 3141 + v);
  let col = K.grass;
  const g = h01(x, y, 3145);
  if (n > 0.64 && g < (n - 0.58) * 2) col = K.grassLt;
  else if (n < 0.32 && g < (0.38 - n) * 2) col = K.grassDk;
  // short blades: 1px darker strokes, upright pairs
  if (((x * 3 + y * 5) % 11 === 0) && h01(x, y, 3143) < 0.6) col = K.grassDk;
  if (((x * 3 + y * 5) % 11 === 1) && h01(x, y, 3143) < 0.3) col = K.grassLt;
  // a little bare sand showing through in worn paths
  const bare = valueNoise(x / 26, y / 18, 3147);
  if (bare > 0.76 && h01(x, y, 3149) < (bare - 0.7) * 3) col = K.sandDk;
  const f = ihash(Math.floor(x / 10), Math.floor(y / 10), 3151 + v);
  if (f % 11 === 0) {
    const fx = Math.floor(x / 10) * 10 + 3 + ((f >>> 8) % 4);
    const fy = Math.floor(y / 10) * 10 + 3 + ((f >>> 12) % 4);
    if (Math.abs(x - fx) + Math.abs(y - fy) === 1) return K.hirugao;
    if (x === fx && y === fy) return K.hirugaoLt;
  }
  return col;
};

/** 岩場: dark wet rock with barnacles (the structures stand the boulders on it). */
const texIwa: C3Tex = (x, y, v) => {
  const n = fbm(x / 8, y / 8, 3161 + v);
  let col = n > 0.62 ? K.rockLt : n < 0.34 ? K.rockDk : K.rock;
  if (h01(x, y, 3163) < 0.05) col = K.barnacle;
  return col;
};

// ---------------------------------------------------------------- the water (the noon's mirror, 62 8.7)

/**
 * The face of a quay, a breakwater or a rock where the water meets it from
 * the south (k: px down from the water tile's top): the concrete face in
 * shade, the dark wet waterline, then the face's own reflection.
 */
function waterFace(x: number, k: number, ctx: C3TexCtx, tx: number, ty: number): number | null {
  const up = ctx.ground(tx, ty - 1);
  if (isWater(up) || up === '') return null;
  const rocky = up === 'c3_iwa';
  if (k <= 3) {
    if (rocky) return h01(x, k, 3171) < 0.3 ? K.barnacle : k === 3 ? K.rockDk : K.rock;
    return k === 0 ? K.quayDk : h01(x, k, 3173) < 0.15 ? K.asphalt : K.steel;
  }
  if (k === 4) return K.charcoal;
  if (k === 5) return h01(x, k, 3175) < 0.5 ? K.seaweed : K.minatoDk;
  return null;
}

/**
 * 海: the sea at 12:00, a still mirror of the noon sky — the sky's blue laid
 * over the sea's (lighter further out), the stopped clouds as long soft
 * bands, a few frozen glints; no waves (62 8.7).
 */
const texUmi: C3Tex = (x, y, v, ctx) => {
  const tx = txOf(x);
  const ty = tyOf(y);
  const f = waterFace(x, lyOf(y), ctx, tx, ty);
  if (f !== null) return f;
  // the sky's gradient in the water: a slow swell of tone, dithered at its edges
  const sw = valueNoise(x / 120, y / 26, 3181) * 0.7 + valueNoise(x / 40, y / 12, 3182) * 0.3;
  let col = sw < 0.34 ? K.umi : K.umiSky;
  if (sw >= 0.34 && sw < 0.38 && ((x + y) & 1) === 0) col = K.umi;
  if (sw > 0.66) col = ((x + y) & 1) === 0 && sw < 0.7 ? K.umiSky : K.umiSkyLt;
  // the stopped clouds: long horizontal bands (a reflection is drawn out across the still water)
  const cl = valueNoise(x / 90, y / 9, 3185) * 0.75 + valueNoise(x / 30, y / 5, 3186) * 0.25;
  if (cl > 0.72) col = cl > 0.76 ? K.umiCloudLt : K.umiCloud;
  // short frozen glints (they don't move: the sea has stopped)
  if (ihash(x >> 2, y, 3187) % 173 === 0 && (x & 3) < 3) col = K.umiCloudLt;
  void v;
  return col;
};

/** 港の水: the harbour's deep teal, the same still mirror (softer: the quay and the hill shade it), darker under the quay. */
const texMinato: C3Tex = (x, y, v, ctx) => {
  const tx = txOf(x);
  const ty = tyOf(y);
  const ly = lyOf(y);
  const f = waterFace(x, ly, ctx, tx, ty);
  if (f !== null) return f;
  const sw = valueNoise(x / 100, y / 22, 3191) * 0.7 + valueNoise(x / 36, y / 10, 3192) * 0.3;
  let col = sw > 0.6 ? K.minatoSky : K.minato;
  if (sw > 0.56 && sw <= 0.6 && ((x + y) & 1) === 0) col = K.minatoSky;
  const cl = valueNoise(x / 80, y / 8, 3193) * 0.75 + valueNoise(x / 26, y / 4, 3194) * 0.25;
  if (cl > 0.74) col = K.minatoCloud;
  if (ihash(x >> 2, y, 3195) % 211 === 0 && (x & 3) < 3) col = K.minatoCloud;
  // the quay's shadow on the water right under the face
  if (!isWater(ctx.ground(tx, ty - 1)) && ly <= 9) col = ly <= 7 ? K.minatoDk : (x & 1) ? K.minatoDk : col;
  void v;
  return col;
};

// ---------------------------------------------------------------- the truck's bed (map_c3_nidai)

/** 荷台: the olive steel bed, its ribs running front to back, scuffed bare where crates slide. */
const texNidai: C3Tex = (x, y, v) => {
  const lx = lxOf(x);
  if (lx % 5 === 0) return K.oliveLt;
  if (lx % 5 === 1) return K.oliveDk;
  let col = K.olive;
  if (fbm(x / 10, y / 10, 3201 + v) > 0.72 && h01(x, y, 3203) < 0.4) col = K.steel;
  if (h01(x, y, 3205) < 0.02) col = K.oliveDk;
  return col;
};

// ---------------------------------------------------------------- 海の 中 (map_c3_umi)

const U = {
  mud: c('#4E6E70'),
  mudLt: c('#628486'),
  mudDk: c('#3A585C'),
  sand: c('#8EB8BE'),
  sandLt: c('#A8CED0'),
  sandDk: c('#76A0AA'),
  pebble: c('#5A7A84'),
  shell: c('#C8E0E0'),
  rock: c('#3E5A66'),
  rockLt: c('#56747E'),
  rockDk: c('#2A4250'),
  weed: c('#3E6A4E'),
};

/**
 * 海の 中: the floor seen through the water (pal_c3_suichu: everything a
 * step bluer). West of the rock wall (x < 22) the harbour's soft mud with
 * stones, east of it the beach's white sand in ripples; the light's net is
 * a layer over it (art/props/c3_rooms2.ts prop_c3_umi_shell).
 */
const texSoko: C3Tex = (x, y, v) => {
  const n = fbm(x / 14, y / 14, 3211 + v);
  const g = h01(x, y, 3213);
  if (x < 22 * 16 + 8) {
    let col = n > 0.6 && g < (n - 0.5) * 1.4 ? U.mudLt : n < 0.34 && g < (0.4 - n) * 1.5 ? U.mudDk : U.mud;
    if (ihash(x >> 2, y >> 2, 3215) % 61 === 0 && (x & 3) < 3 && (y & 3) < 2) col = U.pebble;
    return col;
  }
  // ripples of the sand: soft bands that bend
  const r = (y + valueNoise(x / 30, y / 30, 3217) * 10) % 9;
  let col = r < 1 ? U.sandLt : r > 7 ? U.sandDk : U.sand;
  if (n < 0.3 && g < 0.5) col = U.sandDk;
  if (ihash(x, y, 3219) % 211 === 0) col = U.shell;
  return col;
};

/** 海の 中の 岩: dark rounded rock, its tops catching the light from above, a fringe of weed. */
const texSokoIwa: C3Tex = (x, y, v, ctx) => {
  const n = fbm(x / 7, y / 7, 3221 + v);
  const ly = lyOf(y);
  let col = n > 0.62 ? U.rockLt : n < 0.36 ? U.rockDk : U.rock;
  const tx = txOf(x);
  const ty = tyOf(y);
  // the top lit where the rock's edge faces the light above; the face in shade where it meets the floor
  if (ctx.ground(tx, ty - 1) !== 'c3_soko_iwa' && ly < 3 && h01(x, y, 3223) < 0.7) col = U.rockLt;
  if (ctx.ground(tx, ty + 1) !== 'c3_soko_iwa' && ctx.ground(tx, ty + 1) !== '') {
    if (ly >= 9) col = ly === 9 ? U.rockLt : h01(x, y, 3227) < 0.3 ? U.weed : U.rockDk;
  }
  if (ly > 13 && h01(x, y, 3225) < 0.35) col = U.weed;
  return col;
};

export const C3_TEX: Record<C3Ground, C3Tex> = {
  c3_road: texRoad,
  c3_quay: texQuay,
  c3_bouhatei: texBouhatei,
  c3_sand: texSand,
  c3_nagisa: texNagisa,
  c3_ishidan: texIshidan,
  c3_hiroba: texHiroba,
  c3_mikan: texMikan,
  c3_alley: texAlley,
  c3_kusa: texKusa,
  c3_minato: texMinato,
  c3_umi: texUmi,
  c3_iwa: texIwa,
  c3_nidai: texNidai,
  c3_soko: texSoko,
  c3_soko_iwa: texSokoIwa,
};

/** Variants per material (the no-repeat rule of ground.ts). */
export const C3_NVAR: Partial<Record<C3Ground, number>> = {
  c3_road: 3,
  c3_quay: 4,
  c3_bouhatei: 2,
  c3_sand: 4,
  c3_nagisa: 3,
  c3_ishidan: 2,
  c3_hiroba: 2,
  c3_kusa: 3,
  c3_iwa: 3,
  c3_soko: 2,
  c3_soko_iwa: 2,
};

/** Priority at soft borders (higher spreads over lower). */
export const C3_PRIO: Partial<Record<C3Ground, number>> = {
  c3_sand: 7,
  c3_kusa: 8,
  c3_mikan: 6,
  c3_alley: 6,
};

/** Soft materials (their borders wander); everything else here has built edges. */
export const C3_SOFT: C3Ground[] = ['c3_sand', 'c3_kusa', 'c3_mikan', 'c3_alley'];
export const C3_GREEN: C3Ground[] = ['c3_kusa'];
export const C3_HARD: C3Ground[] = ['c3_road', 'c3_quay', 'c3_bouhatei', 'c3_nagisa', 'c3_ishidan', 'c3_hiroba', 'c3_minato', 'c3_umi', 'c3_iwa', 'c3_nidai', 'c3_soko', 'c3_soko_iwa'];

export function isC3Ground(g: string): g is C3Ground {
  return (C3_GROUNDS as readonly string[]).includes(g);
}
