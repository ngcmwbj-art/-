// The buildings of 海ぞいの町 (62_ch3_level_art 3.3・7.1・7.3): every
// building faces south, to the sea. Along the harbour road the 漁協, the
// dried-fish shop (its open front and counter), 食堂かもめ (red noren, the
// sign that has lost its 「か」), ゴロウ's house, a house, ミナトとテル's
// house; south of the road the market under its big folded-plate roof with
// its two open mouths, the dried-goods shop, the harbour store; on the beach
// the 海の家 under its reed screens; on the cape the old aquarium in white
// tiles with its blue band.
//
// Noon (pal_c3_noon): the sun is high in the south, so the south walls are
// in full light (no evening wash from the left) and the eaves throw a short,
// sharp shadow straight down onto the wall. Buildings anchor on the top-left
// tile of their roof (bkit.registerBuilding). No building id carries a
// person's provisional name (62 前書き): the regular's house is
// `prop_c3_bld_jouren`, the lighthouse keeper's `prop_c3_bld_toudai`.

import { mix, PixelCanvas } from '../../engine/pixel';
import { h01, ihash } from '../tiles/noise';
import { P } from '../tiles/palette';
import { CP } from '../tiles/c3_ground';
import { KAWARA_IBUSHI, KAWARA_OLD, norenFrames, registerBuilding, roofFlat, roofKawara, roofSlate, type Bld } from './bkit';
import { dk, lt, outline, shadeRect } from './kit';
import { darkWin as hkDarkWin, footing, hikido, hyousatsu, roofTinH, starVerge, TIN_GRAY, TIN_RUST, wall, wallLap, wallPlain, type WallFn } from './hoshi_kit';
import type { RoofPal } from './bkit';
import { fontTextSmall } from './text';
import { getProp, registerProp } from './registry';
import type { PropArt, PropEnv } from './types';

// ---------------------------------------------------------------- shared bits

/**
 * A window (hoshi_kit darkWin) that is lit at night (bkit's night windows and their light on the
 * street, only while Grade.night > 0: 海ぞいの町 is never night in chapter 3; after the clear its
 * night is pal_c9, 05_postgame 4.1). About two in three windows have someone home.
 */
function darkWin(b: Bld, x: number, y: number, w: number, h: number, o: Parameters<typeof hkDarkWin>[5] = {}): void {
  hkDarkWin(b, x, y, w, h, o);
  if ((x * 7 + y * 3 + w) % 10 < 7) b.lights.push([x, y, w, h]);
}

/** 食堂かもめ's roof: red-brown tin, a touch sun-faded. */
export const TIN_KAMOME: RoofPal = { hi: '#C8785A', base: '#A85A3A', lo: '#7A3A2A', deep: '#4A2420' };
/** The market's folded-plate roof (折板): pale grey. */
const SEPPAN: RoofPal = { hi: '#C8CCD2', base: '#9AA0A8', lo: '#7A8088', deep: '#4A4E58' };
/** The harbour store's rusted folded plate. */
const SEPPAN_RUST: RoofPal = { hi: '#B89070', base: '#8A6A4A', lo: '#6A4A3A', deep: '#3A2A22' };

/** 焼き杉 (charred cedar boards, the sea town's walls): near-black vertical boards, a dull sheen. */
function wallYakisugi(seed = 0): WallFn {
  return (i, j) => {
    const lx = i % 6;
    if (lx === 5) return '#1E1A18';
    if (lx === 0) return '#4A4440';
    const n = h01(Math.floor(i / 6), Math.floor(j / 3), 3401 + seed);
    return n < 0.2 ? '#2A2624' : n > 0.85 ? '#4A4440' : '#3A3530';
  };
}

/** モルタル (rough mortar), a little salt-stained near the foot. */
function wallMortar(base: string, seed = 0): WallFn {
  const plain = wallPlain(base, seed);
  return (i, j) => {
    const c = plain(i, j);
    if (h01(i, j, 3405 + seed) < 0.06) return dk(base);
    return c;
  };
}

/** Corrugated sheet walls (波板), vertical ribs. */
function wallNamiita(base: string): WallFn {
  return (i) => {
    const lx = i % 4;
    return lx === 0 ? lt(base) : lx === 3 ? dk(base) : base;
  };
}

/** The noon eave: a short, sharp shadow straight down the wall under the roof's edge (8.4). */
function noonEave(p: PixelCanvas, x: number, y: number, w: number, rows = 4): void {
  shadeRect(p, x, y, w, rows, 1);
  shadeRect(p, x, y, w, 2, 1);
}

/** A potted plant at a door (the sea town's doorsteps): a pot and a round bush. */
function pot(p: PixelCanvas, x: number, y: number, leaf = '#4A8A4A'): void {
  p.rect(x, y - 4, 5, 4, '#B86A4A');
  p.hline(x, x + 4, y - 4, '#D88A6A');
  p.vline(x + 4, y - 3, y - 1, '#7A3A2A');
  p.ellipse(x + 2, y - 7, 3, 3, leaf);
  p.set(x + 1, y - 9, lt(leaf));
  p.set(x + 3, y - 6, dk(leaf));
}

/** A towel on a drying pole under the eave (動かない at 12:00 — they are painted still). */
function towels(p: PixelCanvas, x: number, y: number, n: number, cols: string[]): void {
  p.hline(x - 2, x + n * 7, y, P.steel);
  for (let k = 0; k < n; k++) {
    const c = cols[k % cols.length];
    p.rect(x + k * 7, y + 1, 5, 7, c);
    p.vline(x + k * 7 + 4, y + 1, y + 7, dk(c));
    p.hline(x + k * 7, x + k * 7 + 4, y + 7, dk(c));
  }
}

// ---------------------------------------------------------------- 漁協 (0,11) 10×(3+2)

registerBuilding({
  id: 'prop_c3_bld_gyokyo',
  W: 10,
  R: 3,
  F: 2,
  top: 8,
  band: 0,
  paint(b: Bld) {
    const p = b.p;
    const rY = b.roofY;
    const fY = b.faceY;
    // the slate roof of a two-storey block: the upper floor's wall shows above the eave of the lower
    roofSlate(p, 0, rY, 160, 30, 31);
    wall(p, 0, rY + 30, 160, 18, wallMortar('#D8D2C4', 3));
    for (const x of [10, 34, 58, 104, 128]) darkWin(b, x, rY + 33, 14, 9, { frame: P.steel });
    p.hline(0, 159, rY + 30, '#E8E4D8');
    shadeRect(p, 0, rY + 30, 160, 2, 1);
    // a small antenna and the radio mast of the co-op
    p.vline(148, rY - 8, rY + 6, P.steel);
    p.hline(144, 152, rY - 6, P.concreteLt);
    p.hline(145, 151, rY - 3, P.concreteLt);
    // ground floor
    wall(p, 0, fY, 160, 32, wallMortar('#D8D2C4', 7));
    noonEave(p, 0, fY, 160, 3);
    // the faded 大漁旗 painting on the wall (no letters, no crest: waves, a fish, the rising sun)
    // (2026-10-25: up on the upper storey's wall, between its windows — the ground floor's (5,15) is
    // the 網小屋's wooden door now, 破れたら、つくろう events/ch3/amigoya.ts)
    const fx = 77;
    const fy = rY + 31;
    p.rect(fx, fy, 24, 16, mix('#3A7EA8', '#E8E4D8', 0.35));
    p.ellipse(fx + 6, fy + 5, 4, 4, mix('#E84E3C', '#E8E4D8', 0.4));
    for (let i = 0; i < 24; i++) {
      const wy = fy + 11 + Math.round(Math.sin(i / 2.5) * 1.5);
      p.set(fx + i, wy, mix('#F4F1E8', '#E8E4D8', 0.3));
      p.set(fx + i, wy + 1, mix('#2A5A82', '#E8E4D8', 0.35));
    }
    p.poly([[fx + 12, fy + 7], [fx + 20, fy + 5], [fx + 22, fy + 7], [fx + 20, fy + 9]], mix('#8E95A6', '#E8E4D8', 0.3));
    p.strokeRect(fx - 1, fy - 1, 26, 18, mix(P.wood, '#E8E4D8', 0.3));
    // windows, the office door (aluminium), the outside stair up the east end
    darkWin(b, 12, fY + 8, 22, 10, { frame: P.steel, curtain: '#E8E4D8', side: 'l' });
    darkWin(b, 40, fY + 8, 20, 10, { frame: P.steel });
    hikido(b, 102, fY + 10, 18, 20, P.steel);
    hyousatsu(p, 122, fY + 12, 1, false);
    for (let k = 0; k < 9; k++) {
      const sx = 128 + k * 3;
      const sy = fY + 30 - k * 3 - 2;
      p.rect(sx, sy, 4, 2, P.steel);
      p.hline(sx, sx + 3, sy, P.concreteLt);
    }
    p.line(127, fY + 30, 155, fY + 2, P.charcoal);
    p.line(130, fY + 30, 158, fY + 2, P.asphalt);
    // fish boxes stacked by the wall, a hose reel
    for (const [x, y] of [[66, 24], [66, 19], [74, 24]] as const) {
      p.rect(x, fY + y, 7, 5, '#F4F1E8');
      p.hline(x, x + 6, fY + y, '#FFFFFF');
      p.vline(x + 6, fY + y + 1, fY + y + 4, P.concrete);
    }
    p.ellipse(150, fY + 25, 4, 4, '#3FA66B');
    p.ellipse(150, fY + 25, 2, 2, P.charcoal);
    // the 網小屋's wooden door (5,15)：網の 小屋（破れたら、つくろう、events/ch3/amigoya.ts）。板戸、札、取っ手
    p.rect(82, fY + 9, 13, 23, '#8A6A48');
    p.hline(82, 94, fY + 9, '#B08A5E');
    for (const x of [85, 88, 91]) p.vline(x, fY + 10, fY + 31, '#6E5236');
    p.vline(82, fY + 10, fY + 31, '#A8845A');
    p.vline(94, fY + 10, fY + 31, '#4A3626');
    p.rect(84, fY + 12, 9, 5, '#F4F1E8');
    p.hline(85, 91, fY + 14, '#3A3F48');
    p.rect(91, fY + 21, 2, 3, P.steel);
    footing(p, 0, b.botY, 160, P.concrete, 1);
  },
});

// ---------------------------------------------------------------- 干物屋 (15,11) 6×(2+2) — the open front
// (fix1015: the open front is two tiles tall, so the two keepers standing in it at y14 stand under
// the eave — with one tile their heads went up through the eave and the roof, in 2D and in HD-2D)

registerBuilding({
  id: 'prop_c3_bld_himono',
  W: 6,
  R: 2,
  F: 2,
  top: 4,
  band: 0,
  paint(b: Bld) {
    const p = b.p;
    const rY = b.roofY;
    const fY = b.faceY;
    roofTinH(p, 0, rY, 96, 32, TIN_GRAY, 41, { rust: 0.25, ridgeFrac: 0.3 });
    // the open front: a dark shop behind the counter, the dried fish hung on lines
    p.rect(0, fY, 96, 32, '#4A3A30');
    p.rect(0, fY, 96, 3, '#2A2420');
    // the back wall's shelves (low: the keepers stand in front of them)
    p.rect(2, fY + 19, 92, 1, '#3A2E26');
    p.rect(2, fY + 26, 92, 1, '#3A2E26');
    for (let x = 5; x < 90; x += 11) {
      p.rect(x, fY + 21, 7, 5, '#6A5444');
      p.hline(x, x + 6, fY + 21, '#8A6E58');
    }
    for (let x = 4; x < 92; x += 3) {
      const y = fY + 3 + (x % 2);
      p.vline(x, y, y + 5, '#C89A6A');
      p.set(x, y + 5, '#E8C8A0');
      p.set(x + 1, y + 1, '#C8CDD4');
    }
    p.hline(2, 93, fY + 3, P.steel);
    // the posts of the open front
    for (const x of [0, 46, 94]) {
      p.rect(x, fY, 2, 32, P.wood);
      p.vline(x, fY, fY + 31, P.woodLt);
    }
    noonEave(p, 0, fY, 96, 3);
    // a wooden sign board along the eave (letters as unreadable strokes)
    p.rect(30, fY - 7, 36, 7, '#E8D9B5');
    p.strokeRect(30, fY - 7, 36, 7, P.wood);
    for (let x = 34; x < 62; x += 5) p.rect(x, fY - 5, 3, 3, P.ink);
  },
});

/** 干物屋の店先の台 (15–20,15): the counter of fish in front of the two keepers (drawn after them). */
registerProp('prop_c3_himono_counter', () => {
  const p = new PixelCanvas(96, 18);
  // the table: a plank top on trestles
  p.rect(0, 2, 96, 6, '#C8A06A');
  p.hline(0, 95, 2, '#E8C890');
  p.hline(0, 95, 7, P.wood);
  // the fish laid out: アジの開き (copper and pale), カマス (long, silver), in shallow trays
  for (let k = 0; k < 6; k++) {
    const x = 3 + k * 15;
    p.rect(x, 3, 13, 4, k % 2 ? '#D8D2C4' : '#E8E4D8');
    for (let f = 0; f < 3; f++) {
      if (k % 3 === 2) {
        p.hline(x + 1, x + 11, 4 + f, f === 1 ? '#C8CDD4' : '#9AA0A8');
      } else {
        p.rect(x + 1 + f * 4, 4, 3, 2, '#C89A6A');
        p.set(x + 2 + f * 4, 4, '#E8C8A0');
        p.set(x + 1 + f * 4, 5, '#8A5A3A');
      }
    }
    // the price tags (strokes)
    p.rect(x + 4, 0, 5, 3, '#FBF3DC');
    p.hline(x + 5, x + 7, 1, P.ink);
  }
  // the front of the counter: boards, the legs
  p.rect(0, 8, 96, 8, '#8A5A3A');
  for (let x = 0; x < 96; x += 6) p.vline(x, 8, 15, '#5A3A2A');
  p.hline(0, 95, 8, '#A87A4A');
  p.hline(0, 95, 16, P.ink);
  p.hline(0, 95, 17, '#3A2A22');
  const img = p.toCanvas();
  return { ox: 0, oy: -2, w: 96, h: 18, foot: 15, img: () => img, contact: 0 } satisfies PropArt;
});

// ---------------------------------------------------------------- 食堂かもめ (26,11) 8×(3+2)

/** The sign along the eave: 「かもめ」 that lost its 「か」 (S08 / 60 9.3) — 「もめ」 and the mark where 「か」 was. */
function kamomeSign(p: PixelCanvas, x: number, y: number, whole: boolean): void {
  // (the board not pure white, its lower edge a step darker: it went white in HD-2D's sun under the
  // bloom — 2026-10-25 改善会議「白く飛ぶ物を立体に」)
  p.rect(x, y, 64, 12, '#E6E2D8');
  p.strokeRect(x, y, 64, 12, '#9AA0A8');
  p.hline(x + 1, x + 62, y + 1, '#EEEAE0');
  p.hline(x + 1, x + 62, y + 10, '#B4AEA0');
  const blue = '#2F4A8A';
  if (whole) fontTextSmall(p, 'かもめ', x + 20, y + 2, blue);
  else {
    // the 「か」 is gone: a paler square where it hung, two screw holes
    p.rect(x + 20, y + 2, 9, 8, '#E0DCD0');
    p.set(x + 21, y + 3, '#9AA0A8');
    p.set(x + 27, y + 8, '#9AA0A8');
    fontTextSmall(p, 'もめ', x + 29, y + 2, blue);
  }
  // a small gull drawn at the left end
  p.line(x + 5, y + 6, x + 8, y + 4, blue);
  p.line(x + 8, y + 4, x + 10, y + 6, blue);
  p.line(x + 10, y + 6, x + 12, y + 4, blue);
  p.line(x + 12, y + 4, x + 15, y + 6, blue);
}

registerBuilding((opts) => ({
  id: 'prop_c3_bld_kamome',
  W: 8,
  R: 3,
  F: 2,
  top: 6,
  band: 0,
  paint(b: Bld) {
    const p = b.p;
    const rY = b.roofY;
    const fY = b.faceY;
    roofTinH(p, 0, rY, 128, 48, TIN_KAMOME, 47, { rust: 0.2, ridgeFrac: 0.28 });
    // the kitchen's stovepipe
    p.rect(104, rY + 2, 5, 18, P.steel);
    p.vline(104, rY + 2, rY + 19, P.concreteLt);
    p.rect(103, rY, 7, 3, P.charcoal);
    // white board walls
    wall(p, 0, fY, 128, 32, wallLap('#E8E4D8', 9, 4));
    noonEave(p, 0, fY, 128, 3);
    kamomeSign(p, 48, fY - 13 + 16 - 16, !!opts.whole);
    // the window onto the counter, lit warm inside (the bulb)
    darkWin(b, 6, fY + 8, 22, 12, { frame: '#2F4A8A', curtain: '#F6D98A', side: 'both' });
    // the menu blackboard by the door (28,15): 「本日の 日替わり」 as strokes and a blank under it
    const kx = 32;
    const ky = fY + 16;
    p.rect(kx, ky, 12, 15, '#5A3A2A');
    p.rect(kx + 1, ky + 1, 10, 11, '#2A3A2A');
    p.hline(kx + 2, kx + 9, ky + 3, '#E8E4D8');
    p.hline(kx + 2, kx + 7, ky + 5, '#C8C2B4');
    p.vline(kx + 1, ky + 12, ky + 14, '#5A3A2A');
    p.vline(kx + 10, ky + 12, ky + 14, '#5A3A2A');
    // the glass sliding door (30,15), blue-tinted glass
    hikido(b, 64, fY + 10, 16, 22, '#8A9AB0');
    for (let j = fY + 11; j < fY + 29; j++) for (let i = 65; i < 79; i++) if (b.mask.alpha(i, j)) p.set(i, j, mix('#3A4A6A', '#7FD1E8', ((i + j) % 9) / 20));
    // the extractor fan (32,14) high on the wall
    p.rect(98, fY + 4, 12, 10, P.steel);
    p.rect(99, fY + 5, 10, 8, P.charcoal);
    for (let k = 0; k < 4; k++) p.line(104, fY + 9, 104 + [4, 0, -4, 0][k], fY + 9 + [0, 3, 0, -3][k], P.concrete);
    p.hline(98, 109, fY + 4, P.concreteLt);
    // the steam stopped in a white column above the fan (12:00) — a painted puff
    // beer crates and a bucket by the kitchen end
    p.rect(114, fY + 22, 10, 8, '#E8C83A');
    p.hline(114, 123, fY + 22, '#FFE07A');
    for (let i = 115; i < 123; i += 2) p.vline(i, fY + 24, fY + 28, '#B8981A');
    pot(p, 86, b.botY - 1, '#5FA85A');
    footing(p, 0, b.botY, 128, P.concrete, 5);
  },
}));

/**
 * 食堂かもめののれん: red with 「かもめ」 in white and a small gull (32×20); it
 * hangs still at 12:00 (motion 0). At 12:01 it is taken in (ナミエ holds it
 * at the door, S13: 62 6.2).
 */
registerProp('prop_c3_noren', () => {
  const fr = norenFrames(30, 19, '#C8452E', 3, (p) => {
    fontTextSmall(p, 'かもめ', 3, 6, '#F4F1E8');
  });
  return {
    ox: -7,
    oy: -12,
    w: 30,
    h: 20,
    // (in front of the building, whose foot is this row's bottom)
    foot: 17,
    img: (env: PropEnv) => (env.flag('flag_ch3_stage') >= 2 ? null : fr.f[Math.floor(env.mt / fr.ms) % fr.f.length]),
    contact: 0,
  };
});

/**
 * The steam from the fan: stopped in a white column at 12:00; at 12:01 it
 * rises again, puffs drifting up and thinning (6 frames, 62 8.8).
 */
registerProp('prop_c3_yuge', () => {
  const still = new PixelCanvas(10, 22);
  for (const [cx, cy, r] of [[5, 18, 2.5], [4, 13, 2.5], [5, 8, 2], [6, 4, 1.5]] as const) {
    still.ellipse(cx, cy, r + 0.5, r, '#FFFFFF');
    still.set(cx - 1, cy - 1, '#F4F1E8');
  }
  const img = still.toCanvas();
  const rising: HTMLCanvasElement[] = [];
  for (let k = 0; k < 6; k++) {
    const p = new PixelCanvas(10, 22);
    for (let i = 0; i < 4; i++) {
      // each puff climbs a quarter of the column per frame, smaller as it goes, drifting with the breeze
      const ph = ((k / 6 + i / 4) % 1);
      const cy = Math.round(20 - ph * 18);
      const cx = Math.round(5 + Math.sin(ph * 5 + i) * 1.5 + ph * 2);
      const r = 2.6 - ph * 1.6;
      if (r < 0.8) continue;
      p.ellipse(cx, cy, r + 0.5, r, ph > 0.6 ? '#F4F1E8' : '#FFFFFF');
    }
    rising.push(p.toCanvas());
  }
  return {
    ox: 3,
    oy: -18,
    w: 10,
    h: 22,
    foot: 33,
    img: (env: PropEnv) => (env.flag('flag_ch3_stage') >= 2 && env.motion > 0.3 ? rising[Math.floor(env.t / 160) % 6] : img),
    contact: 0,
  };
});

// ---------------------------------------------------------------- houses on the harbour road

function house(id: string, roof: 'kawara' | 'kawara_old' | 'tin', walls: WallFn, seed: number, extras: (b: Bld) => void): void {
  registerBuilding({
    id,
    W: 8,
    R: 3,
    F: 2,
    top: 4,
    band: 0,
    paint(b: Bld) {
      const p = b.p;
      const rY = b.roofY;
      const fY = b.faceY;
      if (roof === 'tin') roofTinH(p, 0, rY, 128, 48, TIN_RUST, seed, { rust: 0.35 });
      else {
        roofKawara(p, 0, rY, 128, 48, roof === 'kawara' ? KAWARA_IBUSHI : KAWARA_OLD, seed, 0.3);
        starVerge(p, 0, rY, 48, roof === 'kawara' ? KAWARA_IBUSHI : KAWARA_OLD);
      }
      wall(p, 0, fY, 128, 32, walls);
      noonEave(p, 0, fY, 128, 3);
      extras(b);
      footing(p, 0, b.botY, 128, P.concrete, seed);
    },
  });
}

// the regular's house (38,11): charred cedar, a big net float hung by the door, rubber boots
house('prop_c3_bld_jouren', 'kawara', wallYakisugi(1), 51, (b) => {
  const p = b.p;
  const fY = b.faceY;
  darkWin(b, 10, fY + 8, 24, 10, { frame: P.woodDark, shoji: true });
  darkWin(b, 92, fY + 8, 22, 10, { frame: P.woodDark });
  hikido(b, 52, fY + 10, 18, 22, P.woodDark);
  hyousatsu(p, 72, fY + 12, 4);
  // a glass float in its net (浮き玉)
  p.ellipse(42, fY + 14, 4, 4, '#7FD1E8');
  p.set(41, fY + 12, '#FFFFFF');
  for (let k = -4; k <= 4; k += 2) p.set(42 + k, fY + 14, '#3FA66B');
  p.vline(42, fY + 8, fY + 10, '#C8A06A');
  // yellow boots by the door
  p.rect(76, fY + 25, 3, 6, '#E8C83A');
  p.rect(80, fY + 25, 3, 6, '#E8C83A');
  p.hline(76, 82, fY + 25, '#FFE07A');
});

// a house (48,11): mortar, a towel line under the eave (50,16)
house('prop_c3_bld_minka', 'kawara_old', wallMortar('#D8D2C4', 2), 57, (b) => {
  const p = b.p;
  const fY = b.faceY;
  darkWin(b, 8, fY + 8, 22, 10, { frame: P.steel, curtain: '#9BCB6B', side: 'l' });
  hikido(b, 44, fY + 10, 16, 22, P.steel);
  darkWin(b, 80, fY + 8, 30, 10, { frame: P.steel });
  towels(p, 20, fY + 21, 3, ['#4AA8E0', '#F4F1E8', '#E84E3C']);
  pot(p, 64, b.botY - 1);
  pot(p, 70, b.botY - 1, '#3FA66B');
});

// the lighthouse keeper's and the siren keeper's house (58,11): charred cedar, a towel line (60,16), pots
house('prop_c3_bld_toudai', 'kawara', wallYakisugi(4), 61, (b) => {
  const p = b.p;
  const fY = b.faceY;
  darkWin(b, 8, fY + 8, 20, 10, { frame: P.woodDark, shoji: true });
  hikido(b, 40, fY + 10, 16, 22, P.woodDark);
  hyousatsu(p, 58, fY + 12, 2);
  darkWin(b, 90, fY + 8, 26, 10, { frame: P.woodDark });
  towels(p, 30, fY + 20, 2, ['#F4F1E8', '#2F4A8A']);
  for (const x of [66, 72, 78]) pot(p, x, b.botY - 1, x === 72 ? '#E84E3C' : '#4A8A4A');
});

// ---------------------------------------------------------------- 市場 (4,19) 29×(3+2)

/** あぜ道市's six shop spaces and who opens each (60 3.4・62 4.2): the flag of the one who came. */
export const AZE_SHOPS: Record<string, string> = {
  hinoya: 'flag_ch3_kita_npc_obaa',
  tofu: 'flag_ch3_kita_npc_mamekichi',
  cafe: 'flag_ch3_kita_npc_master',
  tomato: 'flag_ch3_kita_npc_hoshi_mitsu',
  yasumi: 'flag_ch3_kita_npc_hoshi_yoshie',
  tokei: 'flag_ch3_kita_npc_tokio',
};

/**
 * あぜ道市's banners (62 3.11・7.3 prop_c3_nobori, 8×28): one more for each
 * shop that opens, standing along the market's back edge under its sign —
 * seen from the harbour road. Each in its shop's colour (ひのや 朱, 豆腐 紺,
 * 喫茶 こげ茶, トマト 赤, 休み所 うすい緑, 時計 金), the letters unreadable
 * strokes. Still at 12:00, flapping at 12:01 (3 frames).
 */
const NOBORI_COL = ['#E84E3C', '#2F4A8A', '#5A3A2A', '#C8302A', '#9ACB9A', '#D9A441'];
const noboriFrames: HTMLCanvasElement[][] = NOBORI_COL.map((col) =>
  [0, 1, 2].map((f) => {
    const p = new PixelCanvas(12, 32);
    p.vline(2, 0, 31, '#9AA0A8');
    p.hline(2, 10, 1, '#9AA0A8');
    for (let y = 2; y < 28; y++) {
      const sway = f === 0 ? 0 : Math.round(Math.sin(y / 5 + f * 2) * (y / 28) * 1.5);
      for (let x = 3; x < 10; x++) p.set(x + sway, y, x === 3 ? mix(col, '#FFFFFF', 0.4) : col);
      if (y % 4 === 1 && y < 25) p.set(6 + sway, y, mix(col, '#FFFFFF', 0.75));
    }
    outline(p, { bottom: false, soft: true });
    return p.toCanvas();
  }),
);
/** Where they stand along the back edge (image px of the market), in the order they come. */
const NOBORI_X = [96, 128, 286, 318, 64, 350];

registerBuilding({
  id: 'prop_c3_bld_ichiba',
  W: 29,
  R: 3,
  F: 2,
  // (the strip over the roof holds the sign and あぜ道市's banners: over() below)
  top: 34,
  band: 0,
  over(g, x, y, env, b) {
    let n = 0;
    for (const f of Object.values(AZE_SHOPS)) if (env.flag(f)) n++;
    const flap = env.flag('flag_ch3_stage') >= 2 && env.motion > 0.5;
    for (let k = 0; k < n; k++) {
      const fr = noboriFrames[k];
      g.img(fr[flap ? 1 + (Math.floor(env.t / 200 + k) % 2) : 0], x + NOBORI_X[k], y + b.roofY - 31);
    }
  },
  paint(b: Bld) {
    const p = b.p;
    const rY = b.roofY;
    const fY = b.faceY;
    const w = 29 * 16;
    // the big sign standing on the back edge (seen from the harbour road): a long board, strokes
    p.rect(150, rY - 10, 120, 12, '#E8E4D8');
    p.strokeRect(150, rY - 10, 120, 12, '#3A3F48');
    for (let x = 160; x < 262; x += 14) p.rect(x, rY - 7, 9, 6, '#2F4A8A');
    for (const x of [160, 258]) p.vline(x, rY + 2, rY + 6, P.steel);
    // folded plate roof: ribs running north–south, the skylight strips white
    roofTinH(p, 0, rY, w, 48, SEPPAN, 61, { rust: 0.05, ridgeFrac: 0.22, patches: 0 });
    // (the skylights: translucent corrugated sheets, milky — not white: they glared in HD-2D)
    for (const sx of [60, 180, 300, 420]) {
      for (let j = rY + 14; j < rY + 44; j++)
        for (let i = sx; i < sx + 12; i++) p.set(i, j, (i % 4 === 0) ? '#D8E0E4' : (i % 4 === 3) ? '#A8B4BC' : '#C4CED4');
      p.hline(sx, sx + 11, rY + 14, '#7A8088');
    }
    // the gutter along the front edge, so the roof reads as a roof from the road
    p.hline(0, w - 1, rY + 46, '#6B7186');
    p.hline(0, w - 1, rY + 47, '#4A4E58');
    // the walls: corrugated sheets
    wall(p, 0, fY, w, 32, wallNamiita('#C8CCD2'));
    noonEave(p, 0, fY, w, 4);
    // the two mouths, shutters rolled up into their boxes
    for (const [mx, name] of [[96, 'seri'], [336, 'aze']] as const) {
      p.rect(mx - 2, fY + 3, 36, 29, '#3A3F48');
      p.rect(mx, fY + 6, 32, 26, '#5A5E66');
      // inside: the wet concrete floor catching the skylight, fish boxes
      p.rect(mx, fY + 22, 32, 10, '#8A9098');
      for (let i = mx; i < mx + 32; i += 5) p.set(i, fY + 25, '#C8D8E0');
      p.rect(mx + 3, fY + 16, 8, 6, '#F4F1E8');
      p.rect(mx + 20, fY + 18, 9, 4, '#3A7EA8');
      p.hline(mx - 2, mx + 33, fY + 3, '#E8E4D8');
      p.rect(mx - 2, fY + 1, 36, 4, '#9AA0A8');
      p.hline(mx - 2, mx + 33, fY + 1, '#C8CCD2');
      // the board over the mouth: wood for the auction floor, paper for あぜ道市
      if (name === 'seri') {
        p.rect(mx + 6, fY - 8 + 2, 20, 7, '#C8A06A');
        p.strokeRect(mx + 6, fY - 6, 20, 7, P.woodDark);
        for (let x = mx + 9; x < mx + 24; x += 5) p.rect(x, fY - 4, 3, 3, P.ink);
      } else {
        p.rect(mx + 6, fY - 6, 20, 8, '#FBF3DC');
        for (let x = mx + 8; x < mx + 25; x += 4) p.rect(x, fY - 4, 2, 3, '#E84E3C');
      }
    }
    // a red flag at the auction floor's mouth (the next place to go: 62 3.10)
    p.vline(92, fY + 2, fY + 30, P.steel);
    p.rect(84, fY + 3, 8, 6, '#E23B2E');
    p.hline(84, 91, fY + 3, '#FF6A4D');
    // windows high on the wall, a drain pipe, hoses
    for (let x = 16; x < w - 20; x += 48) if (Math.abs(x - 112) > 30 && Math.abs(x - 352) > 30) darkWin(b, x, fY + 6, 18, 7, { frame: P.steel, sill: false });
    p.vline(2, fY + 2, b.botY - 2, P.steel);
    footing(p, 0, b.botY, w, '#B8B4AA', 7);
  },
});

// ---------------------------------------------------------------- 乾物屋 (33,19) 5×(3+2): the keeper painted behind the counter

registerBuilding({
  id: 'prop_c3_bld_kanbutsu',
  W: 5,
  R: 3,
  F: 2,
  top: 2,
  band: 0,
  paint(b: Bld) {
    const p = b.p;
    const rY = b.roofY;
    const fY = b.faceY;
    roofTinH(p, 0, rY, 80, 48, TIN_GRAY, 67, { rust: 0.3 });
    // the open shop: shelves of bags in the dark
    p.rect(0, fY, 80, 18, '#3A3430');
    for (let x = 4; x < 76; x += 6) {
      p.rect(x, fY + 4, 4, 5, ['#5FA85A', '#E8E4D8', '#C8A06A'][(x / 6) % 3 | 0]);
      p.rect(x + 1, fY + 11, 4, 4, ['#E8D9B5', '#3FA66B', '#D8C8A0'][(x / 6) % 3 | 0]);
    }
    // the keeper in his white apron (not a speaker: 62 3.4)
    const kx = 38;
    p.rect(kx, fY + 4, 6, 6, '#C98A6A');
    p.rect(kx - 1, fY + 2, 8, 3, '#3A3530');
    p.set(kx + 1, fY + 7, P.ink);
    p.set(kx + 4, fY + 7, P.ink);
    p.rect(kx - 1, fY + 10, 8, 8, '#F4F1E8');
    p.vline(kx - 1, fY + 10, fY + 17, '#C8C2B4');
    noonEave(p, 0, fY, 80, 3);
    // the counter: 青のり in green bags, するめ, ちりめん boxes
    p.rect(0, fY + 18, 80, 14, '#8A5A3A');
    p.rect(0, fY + 16, 80, 4, '#C8A06A');
    p.hline(0, 79, fY + 16, '#E8C890');
    for (let x = 4; x < 76; x += 9) {
      p.rect(x, fY + 13, 6, 4, ['#5FA85A', '#E8D9B5', '#F4F1E8'][(x / 9) % 3 | 0]);
      p.hline(x, x + 5, fY + 13, '#FFFFFF');
    }
    for (let x = 0; x < 80; x += 6) p.vline(x, fY + 20, fY + 31, '#5A3A2A');
    // 『本日 青のり 入荷』 hanging from the eave (strokes)
    p.rect(54, fY + 1, 18, 8, '#FBF3DC');
    p.strokeRect(54, fY + 1, 18, 8, P.wood);
    for (let x = 57; x < 70; x += 4) p.rect(x, fY + 3, 2, 4, x === 61 ? '#3FA66B' : P.ink);
  },
});

// ---------------------------------------------------------------- 港の倉庫 (44,19) 6×(3+2)

registerBuilding({
  id: 'prop_c3_bld_souko',
  W: 6,
  R: 3,
  F: 2,
  top: 2,
  band: 0,
  paint(b: Bld) {
    const p = b.p;
    const rY = b.roofY;
    const fY = b.faceY;
    roofTinH(p, 0, rY, 96, 48, SEPPAN_RUST, 71, { rust: 0.7, ridgeFrac: 0.22 });
    wall(p, 0, fY, 96, 32, wallNamiita('#A8A8A0'));
    noonEave(p, 0, fY, 96, 3);
    // the shutter (46–47,23): closed
    p.rect(32, fY + 4, 32, 28, '#8E95A6');
    for (let j = fY + 5; j < fY + 31; j += 2) p.hline(32, 63, j, '#6B7186');
    p.rect(30, fY + 2, 36, 4, '#6B7186');
    p.hline(30, 65, fY + 2, '#9AA0A8');
    p.rect(46, fY + 27, 4, 2, P.charcoal);
    // the small iron door at the west end (45,23)：氷の 蔵（明日の 朝の 氷、events/ch3/kori.ts）。札と 取っ手、霜の すじ
    p.rect(18, fY + 9, 12, 23, '#6B7186');
    p.hline(18, 29, fY + 9, '#9AA0A8');
    p.vline(18, fY + 10, fY + 31, '#8E95A6');
    p.vline(29, fY + 10, fY + 31, '#4A5068');
    p.rect(20, fY + 13, 8, 4, '#F4F1E8');
    p.hline(21, 26, fY + 15, '#3A3F48');
    p.rect(26, fY + 21, 2, 3, '#C8CCD4');
    for (let x = 19; x < 29; x += 3) p.set(x, fY + 30, '#E8F0F4');
    // rust streaks from the roof
    for (let x = 6; x < 92; x += 11) for (let k = 0; k < 6 + (x % 5); k++) p.set(x, fY + 3 + k, mix('#8A6A4A', '#A8A8A0', k / 10));
    footing(p, 0, b.botY, 96, '#B8B4AA', 9);
  },
});

// ---------------------------------------------------------------- 海の家 (56,19) 7×(2+2)

registerBuilding({
  id: 'prop_c3_bld_uminoie',
  W: 7,
  R: 2,
  F: 2,
  top: 6,
  band: 0,
  paint(b: Bld) {
    const p = b.p;
    const rY = b.roofY;
    const fY = b.faceY;
    const w = 112;
    // the reed-screen roof (よしず): fine vertical lines, frayed ends
    for (let j = rY; j < rY + 32; j++)
      for (let i = 0; i < w; i++) {
        const lx = i % 3;
        let c = lx === 0 ? '#E0C890' : lx === 2 ? '#A8884A' : '#C8A86A';
        if ((j - rY) % 10 === 9) c = '#7A5A3A';
        if (j === rY) c = '#E8D8A8';
        p.set(i, j, c);
      }
    for (let i = 0; i < w; i += 2) if (h01(i, 0, 3451) < 0.5) p.set(i, rY + 32, '#A8884A');
    // the posts, the open front with benches and the counter in the shade
    p.rect(0, fY, w, 32, '#6A5A48');
    for (let j = fY; j < fY + 32; j++) for (let i = 0; i < w; i++) if ((i + j) % 6 === 0 && j < fY + 14) p.set(i, j, '#8A7A5A'); // the screen's striped shade
    for (const x of [0, 36, 74, 110]) {
      p.rect(x, fY, 2, 32, '#C8A06A');
      p.vline(x, fY, fY + 31, '#E8C890');
    }
    p.rect(4, fY + 20, 28, 4, '#C8A06A');
    p.hline(4, 31, fY + 20, '#E8C890');
    p.rect(78, fY + 14, 30, 6, '#E8E4D8');
    p.hline(78, 107, fY + 14, '#FFFFFF');
    // the door (59,22): a hanging curtain 「海の家」 (strokes)
    p.rect(48, fY + 6, 18, 16, '#2F4A8A');
    for (let x = 51; x < 64; x += 4) p.vline(x, fY + 9, fY + 15, '#F4F1E8');
    for (let x = 49; x < 66; x += 6) p.vline(x, fY + 6, fY + 21, '#243A72');
    // 『氷』 the shaved-ice flag on the front (a readable 氷: 62 7.3)
    p.rect(40, fY + 2, 2, 22, P.steel);
    p.rect(28, fY + 3, 12, 14, '#F4F1E8');
    p.strokeRect(28, fY + 3, 12, 14, '#C8C2B4');
    p.hline(28, 39, fY + 16, '#4AA8E0');
    fontTextSmall(p, '氷', 30, fY + 6, '#E23B2E');
    // floats hung on the post
    p.ring(76, fY + 6, 4, 3, '#E84E3C');
    p.ring(80, fY + 9, 4, 3, '#FFD23F');
    noonEave(p, 0, fY, w, 4);
    p.hline(0, w - 1, b.botY - 1, '#7A5A3A');
  },
});

// ---------------------------------------------------------------- 旧水族館 (70,19) 10×(7+3)

/** A round window (舷窓) on the white tiles: a steel rim, dark blue glass. */
function porthole(b: Bld, cx: number, cy: number, r: number): void {
  const p = b.p;
  for (let j = -r - 1; j <= r + 1; j++)
    for (let i = -r - 1; i <= r + 1; i++) {
      const d = Math.hypot(i, j);
      if (d <= r - 0.5) {
        p.set(cx + i, cy + j, i + j < -r * 0.6 ? '#4A7A9A' : '#1A2A3A');
        b.mask.set(cx + i, cy + j, '#ffffff');
      } else if (d <= r + 1) p.set(cx + i, cy + j, i + j < 0 ? '#E8E4D8' : '#8E95A6');
    }
}

registerBuilding({
  id: 'prop_c3_bld_aq',
  W: 10,
  R: 7,
  F: 3,
  top: 14,
  band: 0,
  paint(b: Bld) {
    const p = b.p;
    const rY = b.roofY;
    const fY = b.faceY;
    const w = 160;
    // the flat roof (屋上): a deck with a rail round it, the water tank on its legs
    roofFlat(p, 0, rY, w, 112, { base: '#C8C4B8', lip: '#E8E4D8', seed: 13, stains: true });
    for (let i = 4; i < w - 4; i += 4) p.set(i, rY + 4, '#8E95A6');
    const tx = 110;
    const ty = rY + 10;
    for (const lx of [tx + 2, tx + 18]) p.rect(lx, ty + 10, 2, 14, '#6B7186');
    p.rect(tx, ty - 10, 22, 22, '#C8CCD2');
    p.ellipse(tx + 11, ty - 10, 11, 4, '#E8E4D8');
    p.vline(tx, ty - 10, ty + 11, '#E8E4D8');
    p.vline(tx + 21, ty - 10, ty + 11, '#8E95A6');
    for (let j = ty - 6; j < ty + 10; j += 5) p.hline(tx, tx + 21, j, '#9AA0A8');
    // the white tiles with the blue band, fish in relief
    wall(p, 0, fY, w, 48, (i, j) => {
      if (j >= 10 && j <= 15) return j === 10 ? '#5AA0C8' : j === 15 ? '#2A5A82' : '#3A7EA8';
      const lx = i % 6;
      const ly = j % 6;
      if (lx === 5 || ly === 5) return '#C8C4B8';
      return h01(Math.floor(i / 6), Math.floor(j / 6), 3461) < 0.08 ? '#D8D4C8' : '#E8E4D8';
    });
    for (const [fx, fy] of [[14, 30], [120, 28]] as const) {
      p.poly([[fx, fy + fY], [fx + 10, fy + fY - 4], [fx + 16, fy + fY], [fx + 10, fy + fY + 4]], '#D0CCC0');
      p.poly([[fx + 16, fy + fY], [fx + 21, fy + fY - 4], [fx + 21, fy + fY + 4]], '#D0CCC0');
      p.set(fx + 4, fy + fY - 1, '#9AA0A8');
    }
    noonEave(p, 0, fY, w, 3);
    for (const x of [24, 52, 108, 136]) porthole(b, x, fY + 5, 4);
    // where the old sign was taken down: the letters' shapes in a paler white (unreadable)
    for (let x = 48; x < 112; x += 9) p.rect(x, fY + 18, 6, 6, '#F4F1EC');
    // the ticket window (72,28) and the glass doors (74–75,28)
    p.rect(32, fY + 30, 12, 12, '#8E95A6');
    p.rect(33, fY + 31, 10, 9, '#1A2A3A');
    b.mask.rect(33, fY + 31, 10, 9, '#ffffff');
    p.hline(30, 45, fY + 42, '#C8C4B8');
    p.rect(64, fY + 22, 32, 26, '#8E95A6');
    for (const dx of [65, 81]) {
      p.rect(dx, fY + 23, 14, 24, '#2A3A4A');
      b.mask.rect(dx, fY + 23, 14, 24, '#ffffff');
      p.set(dx + 2, fY + 40, '#FFF6D8');
      p.set(dx + 3, fY + 39, '#FFF6D8');
    }
    p.vline(80, fY + 22, fY + 47, '#6B7186');
    // the notice 『本日 休館』 in ツガオ's square strokes, and the black stamp 「まだ」 in its corner
    p.rect(68, fY + 26, 9, 11, '#FBF3DC');
    for (let y = fY + 28; y < fY + 35; y += 3) p.rect(70, y, 5, 2, P.ink);
    p.ellipse(75, fY + 35, 3, 2, '#0B0B14');
    // the plant boxes either side, the old guide arrow (whited out)
    footing(p, 0, b.botY, w, '#C8C4B8', 11);
  },
});

// ---------------------------------------------------------------- the frozen gulls (62 8.8)

/** A gull stopped in mid-air (12:00): wings spread, a soft shadow straight below on the ground. */
registerProp('prop_c3_kamome_sora', (opts) => {
  const v = Number(opts.v ?? 0);
  const h = Number(opts.h ?? 28);
  const p = new PixelCanvas(15, 8);
  const wing = v % 2 ? [[0, 3], [3, 1], [6, 3], [7, 3], [8, 3], [11, 1], [14, 3]] : [[0, 1], [3, 2], [6, 3], [7, 3], [8, 3], [11, 2], [14, 1]];
  for (let k = 0; k + 1 < wing.length; k++) p.line(wing[k][0], wing[k][1], wing[k + 1][0], wing[k + 1][1], '#F4F1E8');
  for (let k = 0; k + 1 < wing.length; k++) p.line(wing[k][0], wing[k][1] + 1, wing[k + 1][0], wing[k + 1][1] + 1, '#C8CDD4');
  p.set(0, wing[0][1], '#3A3F48');
  p.set(14, wing[6][1], '#3A3F48');
  p.rect(6, 3, 3, 3, '#FFFFFF');
  p.set(7, 6, '#FFD23F');
  const img = p.toCanvas();
  const sh = new PixelCanvas(12, 3);
  sh.ellipse(6, 1, 5, 1, '#000000');
  const shImg = sh.toCanvas();
  return {
    ox: 1,
    oy: 16 - h - 8,
    w: 15,
    h: h + 8,
    foot: 16 + 40,
    // (at 12:01 it flies: world/c3sea.ts draws it circling round here)
    img: (env) => (env.flag('flag_ch3_stage') >= 2 && env.motion > 0.5 ? null : img),
    over: (g, x, y, env) => {
      if (env.flag('flag_ch3_stage') >= 2 && env.motion > 0.5) return;
      g.ctx.save();
      g.ctx.globalAlpha = 0.12;
      g.ctx.drawImage(shImg, Math.round(x + 2), Math.round(y + 12));
      g.ctx.restore();
    },
    contact: 0,
  } satisfies PropArt;
});

/** Use another prop's picture flipped upside down as its still reflection on the mirror sea (62 8.7). */
registerProp('prop_c3_refl', (opts) => {
  const src = String(opts.of ?? '');
  const srcOpts = (opts.o as Record<string, unknown> | undefined) ?? {};
  const a = getProp(src, srcOpts);
  const dy = Number(opts.dy ?? 0);
  const alpha = Number(opts.a ?? 0.32);
  let cached: { from: HTMLCanvasElement; img: HTMLCanvasElement } | null = null;
  const flipOf = (from: HTMLCanvasElement): HTMLCanvasElement => {
    if (cached && cached.from === from) return cached.img;
    const c = document.createElement('canvas');
    c.width = from.width;
    c.height = from.height;
    const x = c.getContext('2d')!;
    x.globalAlpha = alpha;
    x.translate(0, from.height);
    x.scale(1, -1);
    x.drawImage(from, 0, 0);
    // tint toward the sea: the reflection is darker and bluer
    x.setTransform(1, 0, 0, 1, 0, 0);
    x.globalAlpha = 1;
    x.globalCompositeOperation = 'source-atop';
    x.fillStyle = 'rgba(42,90,130,0.45)';
    x.fillRect(0, 0, c.width, c.height);
    // the top 2px fade into the water (62 14.3)
    x.globalCompositeOperation = 'destination-out';
    x.fillStyle = 'rgba(0,0,0,0.5)';
    x.fillRect(0, 0, c.width, 2);
    cached = { from, img: c };
    return c;
  };
  if (!a) return { ox: 0, oy: 0, w: 1, h: 1, foot: 0, flat: true, img: () => null };
  const foot = a.foot;
  return {
    ox: a.ox,
    oy: a.oy + 2 * (foot - a.oy) - a.h + dy,
    w: a.w,
    h: a.h,
    foot: 0,
    flat: true,
    img: (env) => {
      if (env.flag('flag_ch3_stage') >= 2 && !opts.always) return null;
      const from = a.img(env);
      return from ? flipOf(from) : null;
    },
  } satisfies PropArt;
});

void ihash;
void CP;
