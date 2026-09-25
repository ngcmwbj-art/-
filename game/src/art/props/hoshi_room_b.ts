// Chapter-2 rooms, part 2 (52_ch2_level_art 4.3・4.4, 10.4, 10.5): the
// Ishiguro barn (the anteroom with its footbath, feed bags, feed cart and the
// round book; ten pens of sawdust, four F1 fattening cattle to a pen, the
// concrete troughs, the rails with their water cups, the big fans, the
// lights over the aisle) and the old branch school's meeting room, the dark
// classroom, the staff room and the broadcasting room.
//
// The cattle are the chars team's sprites (prop_h_cow_<pose>); this module
// places them (prop_h_cow: pose, facing, where the white is, the pixel spot
// in the pen) and draws a plain stand-in from 52 10.4's reference shapes
// until theirs are registered. The same for the three sleepers
// (prop_h_napper_<who>, char sprites).

import type { Gfx } from '../../engine/gfx';
import { mix, PixelCanvas } from '../../engine/pixel';
import { charSprite, hasChar } from '../chars/registry';
import { h01, ihash, valueNoise } from '../tiles/noise';
import { P } from '../tiles/palette';
import { dk, lt, outline } from './kit';
import { glowDot, HLIGHT, HP, hs, nightK, paintFrames, paperNote, standProp } from './hoshi_kit';
import { drawLight, poolEllipse } from './light';
import { getProp, hasProp, registerProp } from './registry';
import { fontTextSmall, tiny } from './text';
import type { PropArt, PropEnv } from './types';

// ================================================================ 4.3 map_hoshi_barn (22×12)

const BW = 22 * 16;
const BH = 12 * 16;

function barnShell(): PixelCanvas {
  const p = new PixelCanvas(BW, BH);
  // outer sections (x0, x21, row 11) — 4px of block wall against the dark outside
  for (let y = 0; y < BH; y++) {
    for (let x = 12; x < 16; x++) p.set(x, y, x === 12 ? P.asphalt : P.charcoal);
    for (let x = 336; x < 340; x++) p.set(x, y, x === 339 ? P.asphalt : P.charcoal);
  }
  for (let x = 12; x < 340; x++) for (let y = 176; y < 180; y++) p.set(x, y, y === 176 ? P.steel : P.charcoal);
  // the entrance gap (2,11)
  for (let x = 32; x < 48; x++) for (let y = 176; y < 180; y++) p.set(x, y, 'transparent');
  // the east sliding door (21,6), closed: drawn on the end wall
  p.rect(336, 92, 4, 24, P.steel);
  p.vline(336, 92, 115, P.concreteLt);
  // ---- the north wall (rows 0–1): the anteroom's solid wall; over the pens the open side
  for (let x = 16; x < 336; x++)
    for (let j = 0; j < 32; j++) {
      let c: string;
      if (x < 64) {
        // anteroom: block wall
        const row = Math.floor(j / 6);
        const lx = (x + (row % 2 ? 6 : 0)) % 12;
        c = j === 0 ? P.charcoal : j % 6 === 5 || lx === 11 ? P.steel : P.concrete;
        if (j > 27) c = j === 28 ? P.steel : P.asphalt;
      } else if (j < 5) {
        // the rolled-up curtain under the eave (white tube) on its dark beam
        c = j === 0 ? P.ink : j === 1 ? P.white : j === 2 ? P.concreteLt : j === 3 ? P.concrete : P.charcoal;
        if (j >= 1 && j <= 3 && x % 13 === 0) c = P.steel;
      } else if (j < 26) {
        // the open side under a green bird net: the night outside
        c = j < 12 ? P.void : P.night;
        if ((x + j) % 3 === 0 && (x - j + 300) % 3 === 0) c = P.leafShade;
      } else c = j === 26 ? P.concrete : j < 31 ? P.steel : P.asphalt; // the block wainscot top
      p.set(x, j, c);
    }
  // posts between the openings
  for (let x = 64; x < 336; x += 48) {
    p.vline(x, 0, 31, P.concrete);
    p.vline(x + 1, 0, 31, P.steel);
  }
  // the fans' housings on the north side (8–9,0–1) and (14–15,0–1), 28px
  for (const fx of [144, 240]) {
    p.ellipse(fx, 16, 14, 14, P.steel);
    p.ellipse(fx, 16, 12.5, 12.5, P.charcoal);
    p.ellipse(fx, 16, 11.5, 11.5, P.void);
    p.ring(fx, 16, 14, 14, P.concreteLt);
  }
  // the long-handled brush on the anteroom's wall (2,1), its bristles worn on one side
  p.vline(36, 6, 26, P.woodLt);
  p.vline(37, 6, 26, P.wood);
  p.rect(33, 26, 8, 3, P.brassOld);
  for (let x = 33; x < 39; x++) p.set(x, 29, P.brass);
  // a hook with a hose coil
  p.ring(52, 14, 4, 4, P.leafDeep);
  p.ring(52, 14, 3, 3, P.leaf);
  // ---- the partition (x4) between the anteroom and the pens: block wall top
  for (const [y0, y1] of [[32, 96], [112, 176]] as const)
    for (let y = y0; y < y1; y++)
      for (let x = 64; x < 80; x++) {
        const row = Math.floor(y / 6);
        const lx = (y + (row % 2 ? 6 : 0)) % 12;
        let c: string = lx === 11 || y % 6 === 5 ? P.asphalt : P.steel;
        if (x === 64) c = P.concrete;
        if (x === 79) c = P.charcoal;
        p.set(x, y, c);
      }
  // ---- the pens' dividers (steel pipe, seen from above) every 3 tiles
  for (const px of [128, 176, 224, 272])
    for (const [y0, y1] of [[32, 80], [128, 176]] as const)
      for (let y = y0; y < y1; y++) {
        p.set(px - 1, y, P.concreteLt);
        p.set(px, y, P.steel);
        if (y % 16 === 8) p.rect(px - 2, y, 4, 2, P.asphalt); // the posts
      }
  // ---- the troughs (rows 5 and 7, x5–19): concrete, straw and feed left in them
  for (const ty of [5, 7])
    for (let x = 80; x < 320; x++)
      for (let j = 0; j < 16; j++) {
        const y = ty * 16 + j;
        let c: string;
        if (ty === 5) c = j < 3 ? P.concrete : j < 12 ? P.charcoal : j === 12 ? P.concreteLt : j < 15 ? P.concrete : P.steel;
        else c = j < 1 ? P.steel : j < 3 ? P.concreteLt : j < 12 ? P.charcoal : j === 12 ? P.concrete : P.steel;
        const inner = j >= 3 && j < 12;
        if (inner) {
          // the trough's worn concrete floor (mid grey, wet-dark streaks), the
          // leftovers lying in clumps on the rail side (where the cows eat):
          // rice straw (short pale strokes) and the concentrate's crumbs
          const railSide = ty === 5 ? j < 7 : j > 7;
          const n = h01(x, y, 4101);
          c = (x * 3 + j * 7) % 11 === 0 ? P.asphalt : j === 3 || j === 11 ? mix(P.asphalt, P.charcoal, 0.5) : mix(P.steel, P.asphalt, 0.55);
          const clump = valueNoise(x / 5, ty * 3.7, 4103) > (railSide ? 0.42 : 0.72);
          if (clump) {
            const stroke = (x + (j >> 1)) % 3 === 0;
            c = stroke ? (n < 0.5 ? P.woodLt : P.goldPale) : n < 0.35 ? P.brassOld : n < 0.55 ? mix(P.woodLt, P.brassOld, 0.5) : c;
            if (n > 0.9) c = P.paperGrid; // the concentrate's crumbs
          } else if (n > 0.965) c = P.paperGrid;
        }
        p.set(x, y, c);
      }
  // ---- the pens' back walls (north pens: the wainscot; south pens: row 11's section)
  return p;
}

/** Big fan blades (28px), 4 frames. */
const BIG_FAN = paintFrames(4, 28, 28, (p, k) => {
  const c = 13.5;
  for (let b = 0; b < 3; b++) {
    const a0 = (b / 3) * Math.PI * 2 + (k / 4) * ((Math.PI * 2) / 3);
    for (let r = 3; r <= 11; r++)
      for (const da of [-0.25, -0.1, 0.05, 0.2]) {
        const a = a0 + da * (1 - r / 16);
        p.set(Math.round(c + Math.cos(a) * r), Math.round(c + Math.sin(a) * r), da < -0.15 ? P.concreteLt : da > 0.1 ? P.asphalt : P.steel);
      }
  }
  p.ellipse(c, c, 2.4, 2.4, P.charcoal);
  p.set(13, 13, P.steel);
  // the guard wires
  for (let k2 = -10; k2 <= 10; k2 += 5) p.hline(Math.round(c - 10), Math.round(c + 10), Math.round(c + k2), mix(P.steel, P.charcoal, 0.5));
});

registerProp('prop_h_barn_shell', () => {
  const img = barnShell().toCanvas();
  const a: PropArt = {
    ox: 0,
    oy: 0,
    w: BW,
    h: BH,
    foot: 0,
    flat: true,
    img: () => img,
    over(g, x, y, env) {
      const k = Math.floor(env.t / 180) % 4;
      g.img(BIG_FAN[k], x + 130, y + 2);
      g.img(BIG_FAN[(k + 2) % 4], x + 226, y + 2);
    },
  };
  return a;
});

/** The rails at the troughs (横バー柵: two pipes) with the water cups; north in front of the cows, south behind them. */
registerProp('prop_h_barn_rail', (opts) => {
  const north = opts.side !== 's';
  const W = 15 * 16;
  const p = new PixelCanvas(W, 12);
  const y0 = north ? 0 : 2;
  for (let x = 0; x < W; x++) {
    p.set(x, y0 + 1, P.concreteLt);
    p.set(x, y0 + 2, P.steel);
    p.set(x, y0 + 6, P.concreteLt);
    p.set(x, y0 + 7, P.steel);
    if (x % 16 === 0) p.vline(x, y0, y0 + 10, P.asphalt); // the uprights
  }
  const img = p.toCanvas();
  return { ox: 0, oy: north ? -3 : 9, w: W, h: 12, foot: north ? 1 : 0, img: () => img, contact: 0 };
});

/** The aisle's fluorescent lights (foreground): off at night, on in the morning (52 4.3 エンディング). */
registerProp('prop_h_barn_lights', () => {
  const make = (on: boolean) => {
    const p = new PixelCanvas(15 * 16, 6);
    for (let k = 0; k < 6; k++) {
      const x = 8 + k * 40;
      p.hline(x, x + 23, 2, on ? P.glint : P.steel);
      p.hline(x, x + 23, 3, on ? P.white : P.asphalt);
      p.set(x - 1, 2, P.charcoal);
      p.set(x + 24, 2, P.charcoal);
      p.vline(x + 11, 0, 1, P.charcoal);
    }
    return p.toCanvas();
  };
  const off = make(false);
  const on = make(true);
  const lit = (env: PropEnv, k: number) => {
    if (hs(env) >= 3) return true;
    const t0 = env.flag('flag_ch2_barn_lights');
    return t0 > 0 && env.t - t0 > k * 80;
  };
  const a: PropArt = {
    ox: 80,
    oy: 0,
    w: 0,
    h: 0,
    foot: 0,
    flat: true,
    img: () => null,
    fg: [{ ox: 80, oy: 6 * 16 - 26, img: (env: PropEnv) => (lit(env, 5) ? on : off) }],
    glow(g: Gfx, x: number, y: number, env: PropEnv) {
      for (let k = 0; k < 6; k++) if (lit(env, k)) g.rect(x + 8 + k * 40, y + 6 * 16 - 24, 24, 2, '#E8ECF0', 0.7);
    },
    light(g: Gfx, x: number, y: number, env: PropEnv) {
      for (let k = 0; k < 6; k++) if (lit(env, k)) drawLight(g, poolEllipse(30, 40, HLIGHT.led), x + 20 + k * 40, y + 6 * 16, 0.6);
    },
  };
  return a;
});

/** The big blower hung over the anteroom's opening (4,3): foreground, 28px, turning. */
registerProp('prop_h_barn_blower', () => ({
  ox: 0,
  oy: 0,
  w: 0,
  h: 0,
  foot: 0,
  flat: true,
  img: () => null,
  fg: [
    {
      ox: -6,
      oy: -30,
      img: (env: PropEnv) => BIG_FAN[Math.floor(env.t / 180) % 4],
    },
  ],
}));

registerProp('prop_h_barn_haigou', () =>
  standProp(
    18,
    26,
    (p) => {
      // four paper sacks of concentrate (#E8D9B5, green band), the top one open with a scoop
      for (let k = 0; k < 4; k++) {
        const y = 20 - k * 5;
        const x = 1 + (k % 2);
        p.rect(x, y, 15, 6, P.paperGrid);
        p.hline(x, x + 14, y, P.paper);
        p.hline(x, x + 14, y + 3, P.leafDeep);
        p.vline(x + 14, y + 1, y + 5, P.woodLt);
      }
      p.rect(4, 3, 9, 3, P.brassOld); // the open mouth, feed inside
      p.set(6, 4, P.woodLt);
      p.line(10, 4, 15, 0, P.steel); // the scoop
      p.rect(8, 3, 3, 2, P.concrete);
    },
    { cx: 8, base: 16, shadow: 0 },
  ),
);

registerProp('prop_h_barn_pillar', () =>
  standProp(
    14,
    30,
    (p) => {
      // a timber post with the round book on a string (見回り帳)
      p.rect(4, 0, 6, 30, P.wood);
      p.vline(4, 0, 29, P.woodLt);
      p.vline(9, 0, 29, P.woodDark);
      p.rect(1, 8, 9, 12, P.navy); // the binder
      p.hline(1, 9, 8, P.blue);
      p.rect(2, 10, 7, 9, P.white);
      for (let r = 0; r < 4; r++) p.hline(3, 7, 11 + r * 2, r % 2 ? P.steel : P.ink);
      p.line(10, 12, 11, 22, P.paperGrid); // the pencil on its string
      p.rect(11, 22, 1, 4, P.brass);
    },
    { cx: 8, base: 16, shadow: 0 },
  ),
);

registerProp('prop_h_barn_cart', () =>
  standProp(
    20,
    20,
    (p) => {
      // a steel feed cart: the box, the handle with a towel, the wheels
      p.rect(3, 6, 14, 9, P.steel);
      p.hline(3, 16, 6, P.concreteLt);
      p.vline(16, 7, 14, P.asphalt);
      p.rect(4, 7, 12, 3, P.brassOld); // feed in it
      p.set(6, 7, P.woodLt);
      p.line(16, 7, 19, 1, P.steel);
      p.hline(17, 19, 1, P.concrete);
      p.rect(17, 2, 3, 4, P.white); // the towel
      p.set(18, 5, P.concreteLt);
      p.ellipse(6, 16, 2.5, 2.5, P.ink);
      p.ellipse(14, 16, 2.5, 2.5, P.ink);
      p.set(6, 16, P.steel);
      p.set(14, 16, P.steel);
    },
    { cx: 8, base: 16, shadow: 0 },
  ),
);

/** The footbath (2,9): a shallow tub of disinfectant (green, a 1px shine), flat on the floor. */
registerProp('prop_h_barn_shodoku', () => {
  const p = new PixelCanvas(16, 12);
  p.rect(0, 1, 16, 10, P.steel);
  p.rect(1, 2, 14, 8, P.leafDeep);
  p.hline(1, 14, 2, P.leaf);
  p.set(4, 4, P.leafLt);
  p.set(10, 6, P.leafYoung);
  p.hline(0, 15, 1, P.concreteLt);
  p.hline(0, 15, 10, P.asphalt);
  const img = p.toCanvas();
  return { ox: 0, oy: 2, w: 16, h: 12, foot: 0, flat: true, img: () => img };
});

/** The spare straw bundles and feed sacks along the east end (x20). */
registerProp('prop_h_barn_spare', (opts) => {
  const n = Number(opts.n ?? 4);
  const v = Number(opts.v ?? 0);
  return standProp(
    16,
    n * 16,
    (p) => {
      for (let k = 0; k < n; k++) {
        const y = k * 16;
        if ((k + v) % 2 === 0) {
          // a straw bundle (稲わらの小さな束) tied in the middle
          for (let i = 1; i < 15; i++) for (let j = 3; j < 14; j++) p.set(i, y + j, (i + j) % 3 === 0 ? P.brassOld : j < 5 ? P.goldPale : P.woodLt);
          p.vline(8, y + 3, y + 13, P.wood);
        } else {
          p.rect(2, y + 4, 12, 10, P.paperGrid);
          p.hline(2, 13, y + 4, P.paper);
          p.hline(2, 13, y + 9, P.leafDeep);
          p.vline(13, y + 5, y + 13, P.woodLt);
        }
      }
    },
    { cx: 8, base: n * 16, shadow: 0 },
  );
});

// ---------------------------------------------------------------- 牛舎のおてつだい (evt_ch2_barn_work, 50 10.19 / 52 4.3)

/**
 * The chores' state as the props read it (the events set these flags; none of
 * them is meant to be kept in a save): the chores are open while マサルさん
 * waits in the barn (gate open, before テツヤ) and haven't been done; while
 * they run `flag_ch2_barn_work_on` = 1; each spot done: `flag_<spot id>` = 1.
 */
export function choreOpen(env: PropEnv): boolean {
  return env.flag('flag_ch2_gate_open') > 0 && !env.flag('flag_ch2_tetsuya_beaten') && !env.flag('flag_ch2_barn_work');
}
export function spotPending(env: PropEnv, spot: string): boolean {
  return choreOpen(env) && !env.flag('flag_' + spot);
}

/**
 * fx_h_cup_clear (52 9.3): the moment a muddied cup is cleaned (its spot
 * stops pending while it is being drawn) the clear water flashes twice in
 * 0.4 s. The props see the change themselves, so the chores' script only has
 * to set the spot's flag; a cup that wasn't on screen when it changed (a
 * load, another map) just shows clear.
 */
const cupSeen = new Map<string, { pending: boolean; t: number; seen: number }>();
function cupFlash(env: PropEnv, spot: string): boolean {
  const pend = spotPending(env, spot);
  let s = cupSeen.get(spot);
  if (!s || env.t - s.seen > 500 || env.t < s.seen) {
    s = { pending: pend, t: -1e9, seen: env.t };
    cupSeen.set(spot, s);
  }
  if (s.pending && !pend) s.t = env.t;
  s.pending = pend;
  s.seen = env.t;
  const dt = env.t - s.t;
  return dt >= 0 && dt < 400 && Math.floor(dt / 100) % 2 === 0;
}

/** 給水器 (8×6): a grey bowl on the rail and its push plate; a target is muddied with feed until cleaned. */
const CUP = paintFrames(3, 8, 6, (p, k) => {
  // a round grey bowl on its bracket: the lit rim, the inside, the push plate
  p.rect(1, 1, 6, 4, P.steel);
  p.hline(1, 6, 0, P.concreteLt);
  p.set(0, 1, P.concreteLt);
  p.set(7, 1, P.asphalt);
  p.hline(1, 6, 5, P.charcoal);
  p.vline(0, 2, 3, P.steel);
  p.vline(7, 2, 4, P.asphalt);
  // the water: muddied with fallen feed (1) or clear (0, 2 = just cleaned, flashing)
  if (k === 1) {
    p.rect(2, 1, 4, 2, P.wood);
    p.set(3, 1, P.brassOld);
    p.set(4, 2, P.woodDark);
  } else {
    p.rect(2, 1, 4, 2, P.navy);
    p.set(2, 1, k === 2 ? P.glint : P.aqua);
    if (k === 2) p.set(3, 1, P.aqua);
  }
  p.rect(5, 3, 2, 2, P.asphalt); // the push plate
  p.set(5, 3, P.concrete);
});
registerProp('prop_h_watercup', (opts) => {
  const spot = String(opts.spot ?? '');
  const north = opts.side !== 's';
  return {
    ox: 4,
    oy: north ? 11 : -2,
    w: 8,
    h: 6,
    foot: north ? 17 : 1,
    img: (env: PropEnv) => {
      if (!spot) return CUP[0];
      const flash = cupFlash(env, spot);
      if (spotPending(env, spot)) return CUP[1];
      // just cleaned: the clear water flashes twice in 0.4 s (fx_h_cup_clear)
      return flash ? CUP[2] : CUP[0];
    },
    glow(g: Gfx, x: number, y: number, env: PropEnv) {
      if (spot && cupFlash(env, spot)) g.rect(x + 5, y + (north ? 13 : 0), 5, 2, '#7FD1E8', 0.9);
    },
    contact: 0,
  } as PropArt;
});

/** The scoop leaning on the straw at the east end (20,5); gone while Minato has it. */
registerProp('prop_h_scoop', () =>
  standProp(
    8,
    18,
    (p) => {
      p.line(2, 0, 5, 13, P.wood);
      p.line(3, 0, 6, 13, P.woodLt);
      p.rect(3, 13, 5, 5, P.steel);
      p.hline(3, 7, 13, P.concreteLt);
      p.set(7, 17, P.asphalt);
    },
    { cx: 6, base: 16, shadow: 0, contact: 0 },
  ),
);

/**
 * Feed pushed out of reach (decal_h_feed_pushed, 16×5 on the trough's aisle
 * side) and, once swept back, near the rail (decal_h_feed_near). Only in the
 * lantern's light (the dark hides small things by itself).
 */
function feedPile(): PixelCanvas {
  // a low mound of straw ends and concentrate crumbs, a dark foot under it so it
  // reads against the trough's own leftovers
  const p = new PixelCanvas(16, 5);
  p.ellipse(7.5, 3, 7.5, 2.2, P.brassOld);
  p.ellipse(7, 2.5, 5.5, 1.6, mix(P.woodLt, P.brassOld, 0.4));
  for (let k = 0; k < 5; k++) p.line(1 + k * 3, 4, 3 + k * 3, 1, k % 2 ? P.goldPale : P.woodLt);
  for (const [x, y] of [[2, 2], [5, 3], [8, 1], [10, 3], [13, 2], [11, 2]]) p.set(x, y, P.paperGrid);
  for (let x = 1; x < 15; x++) if (p.alpha(x, 4)) p.set(x, 4, mix(P.wood, P.woodDark, 0.5));
  return p;
}
const PILE = feedPile().toCanvas();
registerProp('decal_h_feed', (opts) => {
  const spot = String(opts.spot ?? '');
  const north = opts.side !== 's';
  // the aisle side of the north trough is its south edge; of the south trough, its north edge
  const aisleY = north ? 10 : 1;
  const railY = north ? 1 : 10;
  return {
    ox: 0,
    oy: 0,
    w: 16,
    h: 16,
    foot: 0,
    flat: true,
    litOnly: true,
    img: () => null,
    over(g: Gfx, x: number, y: number, env: PropEnv) {
      if (!env.flag('flag_ch2_gate_open') || env.flag('flag_ch2_tetsuya_beaten')) return;
      if ((env.lit ?? 1) < 0.1) return;
      g.img(PILE, x, y + (spotPending(env, spot) ? aisleY : railY), (env.lit ?? 1) < 1 ? { alpha: env.lit } : {});
    },
  } as PropArt;
});

// ---------------------------------------------------------------- the F1 fattening cattle (stand-ins; 52 10.4)

const COW_PAL: Record<string, string> = {
  O: '#1B1733', k: HP.cow, K: '#1B1733', l: HP.cowLt, s: HP.cowSheen, n: P.charcoal, N: P.steel, e: P.void, Y: P.gold, y: P.brass, h: P.charcoal,
};
/** A little white (5 cattle in 25 carry some): on the belly, a leg, the face. */
function whiteMarks(p: PixelCanvas, pose: string, white: string): void {
  if (!white) return;
  const W = P.concreteLt;
  const Ws = P.concrete;
  if (pose === 'side' || pose === 'lie' || pose === 'sleep') {
    const by = pose === 'side' ? 13 : 10;
    if (white.includes('belly')) {
      p.hline(14, 19, by, W);
      p.hline(15, 18, by + 1, Ws);
    }
    if (white.includes('leg') && pose === 'side') {
      p.vline(25, 16, 18, W);
      p.vline(26, 17, 18, Ws);
    }
    if (white === 'face') p.set(2, pose === 'side' ? 5 : 4, W);
  } else if (pose === 'front') {
    if (white === 'face') {
      p.set(10, 9, W);
      p.set(9, 10, W);
    }
  } else if (white.includes('leg')) p.vline(14, 16, 18, W);
}

interface CowFrames {
  f: HTMLCanvasElement[];
  foot: number; // image row of the feet
  cx: number; // image x of the feet centre
}

const cowCache = new Map<string, CowFrames>();

/**
 * The stand-in F1 fattening cattle (52 10.4), drawn from shapes rather than
 * the reference grid alone so they read at a glance even as dark animals: a
 * long, deep body with a straight, wide topline and a round rump, a short
 * thick neck with the dewlap hanging under it, a longish face with a broad
 * wet muzzle, short legs under the deep body, both ears out sideways with
 * the yellow tags. The back carries a 1px sheen and the topline a lighter
 * line (they catch the lantern). No expression: the eye is one dark pixel,
 * no mouth line, no horns, no ring.
 */
const C = COW_PAL;

// 52 10.4's shapes, finished: side 32×21 (facing left), lying 32×15, head-on
// at the rail 20×21, from behind 20×21. O outline, k coat, K shade, l light,
// s the sheen on the back, n the wet muzzle, N its shine, e the eye, Y/y the tag.
const COW_SIDE = [
  '................................',
  '................................',
  '........OOO.....................',
  '...OOOOOkllOOOOOOOOOOOOOOOOO....',
  '..OllllkkYkllllllllllllllllkOO..',
  '.OlkkkkkkykkksssssssssssskkkkkO.',
  '.OlkekkkkkkkkksssssssssskkkkkkOK',
  '.OkkkkkkkkkkkkkkkkkkkkkkkkkkkkOK',
  '.OkkkkkKkkkkkkkkkkkkkkkkkKkkkkOK',
  'OnkkkkKOkkkkkkkkkkkkkkkkKKkkkkOK',
  'ONkkkKOOkkkkkkkkkkkkkkkkKKkkkkOK',
  'OnnkKO.OkkkkkkkkkkkkkkkkKKKkkOOK',
  '.OnnO..OKkkkkkkkkkkkkkkkKKKkkO.K',
  '..OO...OKKkkkkkkkkkkkkkkkKKkkO.K',
  '.......OKKkkKKKKKKKKKKKKkkkkKO.K',
  '.......OOKkkKKOOOOOOOOKKOkkkKOKK',
  '.........OkkOKKO.....OKKOkkkO.KK',
  '.........OkkOKKO.....OKKOkkKO...',
  '.........OkkOKKO.....OKKOkkkO...',
  '.........OhhOhhO.....OhhOhhhO...',
  '..........OO.OO.......OO.OOO....',
];
const COW_LIE = [
  '...OOOOOOO......................',
  '..OllllkkYO.....................',
  '.OlkkkkkkyOOOOOOOOOOOOOOOOOOO...',
  '.OlkekkkkkkllllllllllllllllllOO.',
  '.OkkkkkkkkkkksssssssssssskkkkkkO',
  'OnkkkkKkkkkkkkssssssssskkkkkkkkO',
  'ONkkkKOkkkkkkkkkkkkkkkkkkkkkkkkO',
  'OnnkKOOkkkkkkkkkkkkkkkkkkkKkkkkO',
  '.OnnO.OkkkkkkkkkkkkkkkkkkKKkkkkO',
  '..OO..OKkkkkkkkkkkkkkkkkKKKkkkOK',
  '......OKKkkkkkkkkkkkkkkkKKKkkkOK',
  '.....OKKKKKKKKKKKKKKKKKKKKKKKKOK',
  '....OhKKOOOOOOOOOOOOOOOOOKKKKOKK',
  '....OOOO................OOOOO...',
  '................................',
];
const COW_FRONT = [
  '....OOOOOOOOOOOO....',
  '..OOllllllllllllOO..',
  '.OkkkssssssssskkkkO.',
  '.OkkkkkkkkkkkkkkkkO.',
  'OkkkkkkkkkkkkkkkkkkO',
  'OkkkkKKkkkkkkKKkkkkO',
  'OOkkKOOllllllOOKkkOO',
  'OkOOOkkllllllkkOOOkO',
  'OkkkkkkkkkkkkkkkkkkO',
  '.OyOOkkkkkkkkkkOOyO.',
  '.OYO.OkekkkkekO.OYO.',
  '..O..OkkkkkkkkO..O..',
  '.....OkkkkkkkkO.....',
  '.....OkkkkkkkkO.....',
  '......OkkkkkkO......',
  '......OKkkkkKO......',
  '......OnnnnnnO......',
  '......ONnnnnNO......',
  '......OnnnnnnO......',
  '.......OOOOOO.......',
  '....................',
];
const COW_BACK = [
  'OOO..............OOO',
  'OkkO.OOOOOOOOOO.OkkO',
  'OYOOOllkkkkkkllOOOYO',
  '.OkkkkkkkksskkkkkkO.',
  'OkkkkkkkkksskkkkkkkO',
  'OkkkkkkkkksskkkkkkkO',
  'OkkkkkkkkksskkkkkkkO',
  'OkkkkkkkkkOkkkkkkkkO',
  'OkkkkkkkkkOkkkkkkkkO',
  'OkkkkkkkkkOkkkkkkkkO',
  'OkkkkkkkkkOkkkkkkkkO',
  'OKkkkkkkkkOkkkkkkkKO',
  '.OKkkkkkkkOkkkkkkKO.',
  '.OKKkkkkkKKKkkkkKKO.',
  '..OKKKKKKKKKKKKKKO..',
  '...OkkKO.KK..OkkKO..',
  '...OkkKO.KK..OkkKO..',
  '...OkkKO.....OkkKO..',
  '...OkkKO.....OkkKO..',
  '...OhhhO.....OhhhO..',
  '....OOO.......OOO...',
];

function fromGrid(rows: string[]): PixelCanvas {
  const q = new PixelCanvas(rows[0].length, rows.length);
  rows.forEach((r, j) => [...r].forEach((ch, i) => ch !== '.' && q.set(i, j, C[ch])));
  return q;
}

/** Side view, standing, facing left: [0] rest [1] ear flick [2] chew [3] tail swish. */
function cowSide(k: number): PixelCanvas {
  const p = fromGrid(COW_SIDE);
  if (k === 1) {
    // the ear flicks up, the tag glints 1px higher
    p.hline(8, 10, 1, C.O);
    p.set(8, 2, C.k);
    p.set(9, 2, C.k);
    p.set(10, 2, C.O);
    p.set(9, 4, C.Y);
    p.set(9, 5, C.k);
  }
  if (k === 2) {
    // chewing: the lower jaw drops 1px
    p.set(1, 12, C.n);
    p.set(2, 12, C.n);
    p.set(3, 12, C.n);
    p.set(4, 12, C.O);
    p.hline(1, 3, 13, C.O);
    p.set(2, 13, C.O);
  }
  if (k === 3) {
    // the tail swings out from the rump
    for (let y = 9; y <= 16; y++) p.set(31, y, 'transparent');
    p.vline(30, 14, 16, 'transparent');
    p.line(31, 6, 31, 9, C.K);
    p.line(31, 10, 29, 16, C.K);
    p.set(28, 16, C.K);
  }
  return p;
}

/** Lying, the legs folded under; `sleep`: the head turned back along the flank. */
function cowLie(k: number, sleep: boolean): PixelCanvas {
  const p = fromGrid(COW_LIE);
  if (sleep) {
    // no head up: the neck's line runs on into the body, the head lies back along the flank
    for (let y = 0; y < 10; y++) for (let x = 0; x < 7; x++) p.set(x, y, 'transparent');
    p.vline(6, 2, 9, C.O);
    p.hline(7, 9, 1, 'transparent');
    p.hline(6, 10, 2, C.O);
    for (let y = 3; y < 10; y++) p.set(7, y, C.k);
    p.rect(12, 2, 11, 3, C.k); // the head along the flank
    p.hline(12, 22, 1, C.O);
    p.hline(13, 20, 2, C.l);
    p.rect(21, 3, 2, 2, C.n); // the muzzle at the hip
    p.set(11, 3, C.Y); // the ear's tag
    p.set(11, 4, C.y);
  } else {
    if (k === 1) {
      p.set(9, 0, C.O);
      p.set(9, 1, C.Y);
      p.set(9, 2, C.k);
    }
    if (k === 2) {
      p.set(1, 9, C.n);
      p.set(2, 9, C.n);
      p.set(3, 9, C.O);
      p.hline(1, 2, 10, C.O);
    }
  }
  if (k === 3) {
    p.set(31, 9, 'transparent');
    p.set(30, 12, C.K);
  }
  return p;
}

/** Head-on at the rail, the head down in the trough: [1] tags flick [2] the head bobs (eating). */
function cowFront(k: number): PixelCanvas {
  const base = fromGrid(COW_FRONT);
  if (k === 0 || k === 3) return base;
  const p = new PixelCanvas(base.w, base.h);
  for (let y = 0; y < base.h; y++)
    for (let x = 0; x < base.w; x++) {
      const v = base.get(x, y);
      if (!(v >>> 24)) continue;
      // eating: everything from the eyes down drops 1px
      const dy = k === 2 && y >= 9 && x >= 5 && x <= 14 ? 1 : 0;
      p.set(x, y + dy, v);
    }
  if (k === 1) {
    p.set(2, 9, C.Y);
    p.set(17, 9, C.Y);
  }
  return p;
}

/** From behind: the round rump, the hooks, the tail down the middle ([3] swishes), the hind legs. */
function cowBack(k: number): PixelCanvas {
  const p = fromGrid(COW_BACK);
  if (k === 1) {
    p.set(1, 1, C.Y);
    p.set(18, 1, C.Y);
  }
  if (k === 3) {
    for (let y = 7; y <= 13; y++) {
      p.set(10, y, C.k);
      p.set(11, y, C.O);
    }
  }
  return p;
}

/** Stand-in frames: [0] rest, [1] ears flick (tags glint), [2] chew / eat, [3] tail swish. */
function cowFrames(pose: string, white: string, right: boolean): CowFrames {
  const key = `${pose}|${white}|${right}`;
  const hit = cowCache.get(key);
  if (hit) return hit;
  const frames: PixelCanvas[] = [];
  let foot = 20;
  let cx = 16;
  for (let k = 0; k < 4; k++) {
    let p: PixelCanvas;
    if (pose === 'side') {
      p = cowSide(k);
      whiteMarks(p, pose, white);
      foot = 20;
      cx = 16;
    } else if (pose === 'lie' || pose === 'sleep') {
      p = cowLie(k, pose === 'sleep');
      whiteMarks(p, pose, white);
      foot = 14;
      cx = 16;
    } else if (pose === 'front') {
      p = cowFront(k);
      whiteMarks(p, pose, white);
      foot = 20;
      cx = 10;
    } else {
      p = cowBack(k);
      whiteMarks(p, pose, white);
      foot = 20;
      cx = 10;
    }
    if (right) {
      const q = new PixelCanvas(p.w, p.h);
      for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) {
        const v = p.get(x, y);
        if (v >>> 24) q.set(p.w - 1 - x, y, v);
      }
      p = q;
    }
    frames.push(p);
  }
  // [4] [5] reach: the neck stretched 2px further through the rail (front: towards the trough;
  // back: the ear tips 2px north), bobbing 1px every 2 s
  for (let b = 0; b < 2; b++) {
    const src = frames[0];
    const front = pose === 'front';
    const q = new PixelCanvas(src.w, src.h + (front ? 3 : 0));
    for (let y = 0; y < src.h; y++)
      for (let x = 0; x < src.w; x++) {
        const v = src.get(x, y);
        if (v >>> 24) q.set(x, y, v);
      }
    for (let y = 0; y < src.h; y++)
      for (let x = 0; x < src.w; x++) {
        const v = src.get(x, y);
        if (!(v >>> 24)) continue;
        if (front && x >= 5 && x <= 14 && y >= 8) q.set(x, y + 2 + b, v);
        if (!front && y <= 4) q.set(x, y - 2 + b, v);
      }
    frames.push(q);
  }
  const out = { f: frames.map((q) => q.toCanvas()), foot, cx };
  cowCache.set(key, out);
  return out;
}

/**
 * prop_h_cow: opts { pose: 'side'|'lie'|'sleep'|'front'|'back', right, white,
 * dx, dy (the feet's px in the anchor tile), phase (0..1), sync (北3: the
 * four chew together until ふしぎ08 is stamped), n }. Uses the chars team's
 * prop_h_cow_<pose> (anchored feet-centre at the tile's bottom centre, like
 * any standing prop) when registered; else the stand-in.
 */
registerProp('prop_h_cow', (opts) => {
  const pose = String(opts.pose ?? 'side');
  const right = !!opts.right;
  const white = String(opts.white ?? '');
  const dx = Number(opts.dx ?? 8);
  const dy = Number(opts.dy ?? 16);
  const phase = Number(opts.phase ?? 0);
  const sync = !!opts.sync;
  const reach = String(opts.reach ?? '');
  const ext = hasProp('prop_h_cow_' + pose) ? getProp('prop_h_cow_' + pose, { right, white, phase, sync, n: opts.n, reach }) : null;
  if (ext) return { ...ext, ox: ext.ox + dx - 8, oy: ext.oy + dy - 16, foot: ext.foot + dy - 16, contactX: (ext.contactX ?? 8) + dx - 8 };
  const F = cowFrames(pose, white, right);
  const img0 = F.f[0];
  const lying = pose === 'lie' || pose === 'sleep';
  return {
    ox: dx - F.cx,
    oy: dy - F.foot - 1,
    w: img0.width,
    h: img0.height,
    foot: dy - 1,
    img: (env: PropEnv) => {
      const t = env.t;
      // the chores (50 10.19): the one at the rail stretches for the feed it can't reach (2 s bob)
      if (reach && spotPending(env, reach)) return F.f[Math.floor(t / 2000) % 2 ? 4 : 5];
      // 北3: the four jaws in step until the ふしぎ is stamped
      const ph = sync && !env.flag('flag_fushigi_ch2_08') ? 0 : phase;
      if (lying && pose === 'lie' && Math.floor((t + ph * 1200) / 600) % 2 === 1) return F.f[2];
      if (pose === 'front' && Math.floor((t + ph * 1500) / 700) % 2 === 1) return F.f[2];
      const ear = 4000 + phase * 4000;
      if ((t + ph * 9000) % ear < 90) return F.f[1];
      const tail = 8000 + phase * 4000;
      if ((pose === 'side' || pose === 'back') && (t + ph * 7000) % tail < 260) return F.f[3];
      return img0;
    },
    contact: lying ? 26 : pose === 'side' ? 24 : 16,
    contactX: dx,
    // the tags catch the lantern (52 4.3: the ear tags glint 1px as the light reaches the cow)
    glow(g: Gfx, x: number, y: number, env: PropEnv) {
      const near = env.near;
      if (hs(env) >= 3 || near > 76) return;
      const a = Math.min(1, (76 - near) / 30) * 0.9 * (env.lit ?? 1);
      if (a <= 0.05) return;
      const w = img0.width;
      for (const [tx, ty] of COW_TAGS[pose] ?? []) g.rect(x + dx - F.cx + (right ? w - 1 - tx : tx), y + dy - F.foot - 1 + ty, 1, 1, '#FFD23F', a);
    },
  } as PropArt;
});

/** Where the stand-ins' ear tags are (art px, facing left / unmirrored). */
const COW_TAGS: Record<string, [number, number][]> = {
  side: [[9, 4]],
  lie: [[9, 1]],
  sleep: [[11, 3]],
  front: [[2, 10], [17, 10]],
  back: [[1, 2], [18, 2]],
};

// ================================================================ 4.4 map_hoshi_school (26×12)

const SW = 26 * 16;
const SH = 12 * 16;

/** Plaster wall (#E8E4D8) with a wooden rail and skirting. */
function schoolWall(p: PixelCanvas, x0: number, x1: number, y: number, h: number, seed: number): void {
  for (let x = x0; x < x1; x++)
    for (let j = 0; j < h; j++) {
      let c: string = h01(x, j, 4201 + seed) < 0.06 ? P.concrete : P.concreteLt;
      if (j === 0) c = P.nightShade;
      else if (j === 1) c = P.woodLt;
      else if (j === 2) c = P.wood;
      else if (j === h - 10) c = P.woodLt; // the chair rail
      else if (j > h - 10) c = j === h - 1 ? P.woodDark : j > h - 4 ? P.wood : (x % 7 === 0 ? P.woodDark : mix(P.woodLt, P.wood, 0.5));
      p.set(x, y + j, c);
    }
}

function schoolShell(): PixelCanvas {
  const p = new PixelCanvas(SW, SH);
  const sec = (x: number, y: number, w: number, h: number) => {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) p.set(x + i, y + j, (i + j) % 7 === 0 ? P.ink : P.nightShade);
  };
  // outer sections
  sec(12, 12, 4, 180);
  sec(400, 12, 4, 180);
  sec(12, 12, 392, 4);
  sec(12, 176, 392, 4);
  for (let x = 80; x < 96; x++) for (let y = 176; y < 180; y++) p.set(x, y, 'transparent'); // the entrance (5,11)
  // ---- the north walls (rows 1–2) of the four rooms
  schoolWall(p, 16, 176, 16, 32, 1); // 集会所 x1–10
  schoolWall(p, 192, 272, 16, 32, 2); // 教室2 x12–16
  schoolWall(p, 288, 336, 16, 32, 3); // 職員室 x18–20
  schoolWall(p, 352, 400, 16, 32, 4); // 放送室 x22–24
  // the partitions x11, x17, x21 (rows 1–7): wall tops
  for (const px of [176, 272, 336]) sec(px + 6, 16, 4, 112);
  // the hallway's north wall faces (row 8): x0–3, x9–11, x13–17, x19–21, x23–25
  for (const [a, b] of [[16, 64], [144, 192], [208, 288], [304, 352], [368, 400]] as const)
    for (let x = a; x < b; x++)
      for (let j = 0; j < 16; j++) {
        // the wall's top (4px section), then its face to the hallway: plaster over a wood wainscot
        let c: string;
        if (j < 4) c = j === 0 ? P.ink : (x + j) % 7 === 0 ? P.ink : P.nightShade;
        else if (j === 4) c = P.woodLt;
        else if (j < 9) c = h01(x, j, 4205) < 0.06 ? P.concrete : P.concreteLt;
        else if (j === 9) c = P.woodLt;
        else if (j < 15) c = x % 6 === 0 ? P.wood : mix(P.woodLt, P.wood, 0.45);
        else c = P.woodDark;
        p.set(x, 128 + j, c);
      }
  // door frames at the openings (x4–8 the meeting room, x12, x18, x22)
  for (const dx of [64, 144, 192, 208, 288, 304, 352, 368]) {
    p.vline(dx, 128, 143, P.woodDark);
    p.vline(dx - 1, 128, 143, P.wood);
  }
  // ---- 集会所: blackboard (3–6,1–2), photo (2), 校歌 (8), the window (9–10)
  const bx = 48;
  p.rect(bx, 20, 64, 20, P.woodDark);
  p.rect(bx + 2, 22, 60, 16, P.leafShade);
  p.hline(bx + 2, bx + 61, 22, mix(P.leafShade, P.leafDeep, 0.5));
  for (let i = bx + 6; i < bx + 40; i++) if (ihash(i, 1, 4211) % 4) p.set(i, 27, P.white);
  for (let i = bx + 6; i < bx + 30; i++) if (ihash(i, 2, 4213) % 3) p.set(i, 31, P.white);
  for (let i = bx + 6; i < bx + 44; i++) if (ihash(i, 3, 4215) % 4) p.set(i, 35, P.gold); // 「お茶 おかわり 自由」
  p.rect(bx + 2, 38, 60, 2, P.wood); // the chalk ledge
  p.set(bx + 10, 38, P.white);
  p.set(bx + 14, 38, P.gold);
  // the spring photo (2,1–2): a frame, cherry pink dots, six little figures
  p.rect(36, 22, 12, 10, P.woodDark);
  p.rect(37, 23, 10, 8, P.aqua);
  for (let k = 0; k < 6; k++) p.rect(38 + k * 1.5, 28, 1, 2, P.navy);
  p.set(39, 24, P.crimson);
  p.set(43, 25, P.crimson);
  p.set(45, 24, P.peach);
  // 校歌 (8,1–2): a long frame, vertical lines of text
  p.rect(128, 20, 16, 12, P.woodDark);
  p.rect(129, 21, 14, 10, P.paper);
  for (let x = 131; x < 142; x += 2) p.vline(x, 22, 29, x % 4 === 1 ? P.ink : P.steel);
  // the window (9–10,1–2): the night mountain and the white dome on its top
  p.rect(146, 19, 28, 20, P.woodDark);
  p.rect(148, 21, 24, 16, P.nightShade);
  for (let x = 148; x < 172; x++) {
    const top = 31 - Math.round(4 * Math.sin(((x - 148) / 24) * Math.PI));
    for (let y = top; y < 37; y++) p.set(x, y, P.night);
  }
  p.set(160, 26, P.white);
  p.hline(159, 161, 27, P.white);
  p.vline(160, 21, 36, P.woodDark);
  // ---- 教室2: blackboard (12–14,1–2) with the 日直 box, the 寄せ書き (15–16,1–2)
  p.rect(194, 20, 46, 20, P.woodDark);
  p.rect(196, 22, 42, 16, P.leafShade);
  p.rect(228, 23, 8, 12, mix(P.leafShade, P.leafDeep, 0.3)); // the 日直 box
  p.hline(228, 235, 26, P.white);
  p.rect(196, 38, 42, 2, P.wood);
  p.rect(242, 19, 28, 20, P.paper);
  p.strokeRect(242, 19, 28, 20, P.concrete);
  const inks = [P.red, P.blue, P.leaf, P.gold];
  for (let r = 0; r < 7; r++)
    for (let c = 0; c < 5; c++) {
      const x = 244 + c * 5;
      const y = 21 + r * 2 + (c % 2);
      if (ihash(r, c, 4221) % 3) p.hline(x, x + 2, y, inks[(r + c) % 4]);
    }
  p.ring(256, 29, 4, 3, P.verm); // the teacher's はなまる in the middle
  p.set(256, 28, P.verm);
  // ---- 職員室: the key board (19,1–2): five keys, one empty nail
  p.rect(308, 22, 14, 10, P.woodLt);
  p.strokeRect(308, 22, 14, 10, P.wood);
  for (let k = 0; k < 6; k++) {
    const kx = 310 + k * 2;
    p.set(kx, 24, P.charcoal);
    if (k !== 3) {
      p.vline(kx, 25, 28, P.brass);
      p.set(kx, 29, P.brassOld);
    }
  }
  // the windows of the dark rooms (starlight #3A2B5C squares)
  for (const wx of [252, 320, 380]) {
    if (wx === 252) continue;
    p.rect(wx - 2, 20, 16, 12, P.woodDark);
    p.rect(wx, 22, 12, 8, P.nightShade);
    p.vline(wx + 6, 22, 29, P.woodDark);
  }
  // 放送室: the 「放送中」 lamp (22,2), off (glows in the fushigi)
  p.rect(354, 34, 8, 4, P.maroon);
  p.hline(354, 361, 34, P.sunShade);
  // ---- the hallway's south wall (row 11): the entrance's step and the notice board by it
  return p;
}

registerProp('prop_h_school_shell', () => {
  const img = schoolShell().toCanvas();
  const a: PropArt = {
    ox: 0,
    oy: 0,
    w: SW,
    h: SH,
    foot: 0,
    flat: true,
    img: () => img,
    over(g, x, y, env) {
      // the morning (h3): the windows turn from the night to the dawn sky
      if (hs(env) >= 3) {
        const sky = [mix(P.lilac, P.concreteLt, 0.45), mix(P.lilac, P.peach, 0.55), mix(P.peach, P.goldPale, 0.5), P.goldPale];
        for (let j = 0; j < 16; j++) g.rect(x + 148, y + 21 + j, 24, 1, sky[Math.min(3, j >> 2)]);
        for (let i = 0; i < 24; i++) {
          const top = 31 - Math.round(4 * Math.sin((i / 24) * Math.PI));
          g.rect(x + 148 + i, y + top, 1, 37 - top, mix(P.leafShade, P.lilac, 0.35));
        }
        g.rect(x + 160, y + 26, 1, 1, P.white);
        g.rect(x + 159, y + 27, 3, 1, P.white);
        g.rect(x + 160, y + 21, 1, 16, P.woodDark);
        for (const wx of [320, 380]) {
          g.rect(x + wx, y + 22, 12, 4, sky[1]);
          g.rect(x + wx, y + 26, 12, 4, sky[2]);
          g.rect(x + wx + 6, y + 22, 1, 8, P.woodDark);
        }
      }
      // ふしぎ09: the 日直 name written and wiped every 3 s
      if (hs(env) >= 1 && !env.flag('flag_fushigi_ch2_09')) {
        const ph = env.t % 3000;
        const n = ph < 1500 ? Math.min(4, Math.floor(ph / 180)) : ph < 1700 ? 4 : 0;
        for (let k = 0; k < n; k++) g.rect(x + 229 + (k % 2) * 3, y + 28 + Math.floor(k / 2) * 3, 2, 1, P.white);
      } else if (env.flag('flag_fushigi_ch2_09')) {
        g.rect(x + 229, y + 28, 5, 1, P.white);
        g.rect(x + 229, y + 31, 3, 1, P.white);
      }
    },
    glow(g, x, y, env) {
      // ふしぎ10: 「放送中」 lights now and then (10–16 s)
      if (hs(env) < 1 || env.flag('flag_fushigi_ch2_10')) return;
      const per = 13000;
      if ((env.t % per) < 1100) g.rect(x + 354, y + 34, 8, 4, '#E84E3C', 0.9);
    },
  };
  return a;
});

/** The meeting room's lamps (bulb-colour fluorescents, two lines, foreground) and their light. */
registerProp('prop_h_school_lamps', () => {
  const p = new PixelCanvas(160, 4);
  for (const x0 of [16, 90]) {
    p.hline(x0, x0 + 40, 1, P.white);
    p.hline(x0, x0 + 40, 2, P.goldPale);
    p.set(x0 - 1, 1, P.charcoal);
    p.set(x0 + 41, 1, P.charcoal);
  }
  const img = p.toCanvas();
  return {
    ox: 0,
    oy: 0,
    w: 0,
    h: 0,
    foot: 0,
    flat: true,
    img: () => null,
    fg: [{ ox: 16, oy: 48, img: () => img }],
    glow(g: Gfx, x: number, y: number) {
      g.rect(x + 32, y + 49, 41, 1, '#FFF6D8', 0.8);
      g.rect(x + 106, y + 49, 41, 1, '#FFF6D8', 0.8);
    },
    light(g: Gfx, x: number, y: number) {
      drawLight(g, poolEllipse(70, 40, HLIGHT.bulb), x + 88, y + 88, 0.35);
    },
  } as PropArt;
});

registerProp('prop_h_zabuton', (opts) => {
  const c = [P.navy, P.maroon, P.brass][Number(opts.c ?? 0) % 3];
  const p = new PixelCanvas(14, 12);
  p.rect(0, 1, 14, 10, c);
  p.hline(1, 12, 1, lt(c));
  p.vline(0, 2, 9, lt(c));
  p.hline(1, 12, 10, dk(c));
  p.set(7, 5, dk(c)); // the tuft
  p.set(7, 6, dk(c));
  const img = p.toCanvas();
  return { ox: 1, oy: 2, w: 14, h: 12, foot: 0, flat: true, img: () => img };
});

/** The three sleepers (52 10.5): the chars team's sprites when registered, else a stand-in. */
function napperStandIn(who: string, k: number): HTMLCanvasElement {
  const p = new PixelCanvas(26, 16);
  const dy = k ? 1 : 0;
  if (who === 'masa') {
    // on his back, his hunting cap over his face, a brown knit vest
    p.rect(3, 5 + dy, 16, 6, '#8A5A3A');
    p.hline(3, 18, 5 + dy, P.woodLt);
    p.rect(19, 6, 5, 4, P.steel); // trousers to the feet
    p.ellipse(1.5, 8, 2.5, 3, P.skin3);
    p.rect(0, 5, 4, 3, P.charcoal); // the cap on the face
    p.hline(0, 4, 5, P.asphalt);
  } else if (who === 'kiyo') {
    // on her side, a light blue towel blanket, a fan by her
    p.rect(4, 4 + dy, 17, 8, P.aqua);
    p.hline(4, 20, 4 + dy, P.white);
    p.hline(4, 20, 11 + dy, P.blue);
    p.ellipse(2.5, 7, 2.5, 3, P.skin3);
    p.rect(1, 3, 4, 3, P.concrete); // grey hair
    p.ellipse(23, 12, 2, 2, P.navy); // the uchiwa
    p.vline(23, 13, 15, P.woodLt);
  } else {
    // on his back, arms folded, a towel on his belly, his straw hat beside
    p.rect(3, 5 + dy, 15, 6, P.concrete);
    p.rect(8, 6 + dy, 5, 4, P.white);
    p.hline(5, 14, 7 + dy, P.skin3);
    p.ellipse(1.5, 8, 2.5, 3, P.skin3);
    p.rect(18, 6, 5, 4, P.navy);
    p.ellipse(22, 2, 3.5, 1.5, P.goldPale);
    p.rect(21, 0, 3, 2, P.goldPale);
  }
  outline(p, { bottom: true, soft: true });
  return p.toCanvas();
}
/** タケじい's sleep-talk bubble: a tiny tiller (6×4) bobbing, not a 「Z」. */
const TILLER = paintFrames(2, 12, 10, (p, k) => {
  p.rect(0, 0, 12, 8, P.paper);
  p.strokeRect(0, 0, 12, 8, P.ink);
  p.set(3, 8, P.paper);
  p.set(2, 9, P.ink);
  p.rect(3, 2 + k, 5, 3, '#3A7A8A');
  p.set(8, 4 + k, P.steel);
  p.set(4, 5 + k, P.ink);
  p.set(7, 5 + k, P.ink);
  p.set(9, 1 + k, P.steel);
});
registerProp('prop_h_napper', (opts) => {
  const who = String(opts.who ?? 'masa');
  const id = 'prop_h_napper_' + who;
  const F = [napperStandIn(who, 0), napperStandIn(who, 1)];
  const a: PropArt = {
    ox: -5,
    oy: 0,
    w: 26,
    h: 16,
    foot: 16,
    img: (env: PropEnv) => {
      if (hasChar(id)) {
        const s = charSprite(id);
        const an = s.anims?.sleep ?? s.anims?.idle;
        if (an) return an.frames[Math.floor(env.t / (typeof an.ms === 'number' ? an.ms : 1000)) % an.frames.length];
        return s.walk.down[0];
      }
      // シゲじい snores every 3.4 s (chest up 2px, the cap lifts), スギばあ every 3.1 s, タケじい breathes every 2 s
      const per = who === 'masa' ? 3400 : who === 'kiyo' ? 3100 : 2000;
      return F[(env.t % per) < per * 0.45 ? 1 : 0];
    },
    over:
      who === 'take'
        ? (g, x, y, env) => {
            if (hasChar(id)) return;
            g.img(TILLER[Math.floor(env.t / 500) % 2], x + 2, y - 10);
          }
        : undefined,
  };
  return a;
});

registerProp('prop_h_ochadai', () =>
  standProp(
    18,
    32,
    (p) => {
      // a folding table seen side-on: the kettle, cups, a plate of light pickles (cucumber and aubergine)
      p.rect(1, 14, 16, 3, P.woodLt);
      p.hline(1, 16, 14, P.goldPale);
      p.vline(3, 17, 31, P.steel);
      p.vline(14, 17, 31, P.steel);
      p.line(3, 24, 14, 20, P.concrete);
      p.rect(3, 6, 7, 8, P.steel); // the kettle
      p.hline(3, 9, 6, P.concreteLt);
      p.ring(6, 5, 2.5, 1.5, P.ink);
      p.line(10, 9, 12, 7, P.steel);
      for (const cx of [11, 14]) {
        p.rect(cx, 10, 3, 4, P.white);
        p.hline(cx, cx + 2, 10, P.leafYoung);
      }
      p.ellipse(8, 22, 5, 2, P.white);
      p.set(6, 21, P.leaf);
      p.set(8, 22, '#7A5AA0');
      p.set(10, 21, P.leaf);
    },
    { cx: 8, base: 32, shadow: 0 },
  ),
);

registerProp('prop_h_kyotaku', () =>
  standProp(
    18,
    22,
    (p) => {
      // the wooden lectern and the blue circular board on it
      p.rect(1, 6, 16, 16, P.wood);
      p.hline(1, 16, 6, P.woodLt);
      p.vline(16, 7, 21, P.woodDark);
      p.rect(3, 9, 12, 10, mix(P.wood, P.woodDark, 0.3));
      p.rect(4, 1, 10, 6, P.blue);
      p.hline(4, 13, 1, P.aqua);
      p.rect(5, 2, 8, 4, P.white);
      p.hline(6, 11, 3, P.steel);
      p.set(8, 1, P.steel);
    },
    { cx: 8, base: 16, shadow: 0 },
  ),
);

registerProp('prop_h_getabako', () =>
  standProp(
    48,
    22,
    (p) => {
      // the shoe rack: six pairs = the six people here (2 rubber boots, 2 sandals, sneakers, black leather)
      p.rect(0, 2, 48, 20, P.woodLt);
      p.hline(0, 47, 2, P.goldPale);
      for (let k = 0; k < 4; k++) p.vline(k * 16, 2, 21, P.wood);
      p.hline(0, 47, 11, P.wood);
      const shoes: [number, number, string][] = [
        [3, 5, P.leafShade], [11, 5, P.leafShade], [19, 5, P.brass], [27, 5, P.maroon], [35, 5, P.white], [42, 14, P.ink],
      ];
      for (const [x, y, c] of shoes) {
        p.rect(x, y, 5, 4, c);
        p.hline(x, x + 4, y, lt(c));
      }
      p.hline(0, 47, 21, P.woodDark);
    },
    { cx: 24, base: 16, shadow: 0 },
  ),
);

registerProp('prop_h_kasatate', () =>
  standProp(
    12,
    20,
    (p) => {
      p.rect(2, 10, 8, 10, P.steel);
      p.hline(2, 9, 10, P.concreteLt);
      p.line(4, 10, 3, 0, P.navy);
      p.line(7, 10, 8, 2, P.leafDeep);
      p.set(3, 0, P.charcoal);
    },
    { cx: 8, base: 16, shadow: 0 },
  ),
);

registerProp('prop_h_desks', () =>
  standProp(
    64,
    28,
    (p) => {
      // small desks and chairs pushed back, the front one with a name-tag's mark
      for (let r = 0; r < 2; r++)
        for (let c = 0; c < 4; c++) {
          const x = 2 + c * 16;
          const y = 2 + r * 13;
          p.rect(x, y, 12, 6, P.woodLt);
          p.hline(x, x + 11, y, P.goldPale);
          p.vline(x + 1, y + 6, y + 11, P.steel);
          p.vline(x + 10, y + 6, y + 11, P.steel);
          p.rect(x + 3, y + 7, 6, 3, P.wood); // the chair under it
        }
      p.rect(5, 3, 4, 2, P.white); // the name tag's mark
    },
    { cx: 32, base: 32, shadow: 0 },
  ),
);

registerProp('prop_h_kyotaku2', () =>
  standProp(
    18,
    20,
    (p) => {
      p.rect(1, 6, 16, 14, P.wood);
      p.hline(1, 16, 6, P.woodLt);
      p.rect(4, 2, 9, 5, P.leafShade); // the class diary
      p.hline(4, 12, 2, P.leaf);
      p.set(11, 5, P.white);
    },
    { cx: 8, base: 16, shadow: 0 },
  ),
);

registerProp('prop_h_shokuin_desk', () =>
  standProp(
    16,
    36,
    (p) => {
      // two grey office desks (18,3–4)
      for (const y of [4, 20]) {
        p.rect(1, y, 14, 12, P.steel);
        p.hline(1, 14, y, P.concreteLt);
        p.rect(2, y + 5, 5, 3, P.concrete);
        p.set(4, y + 6, P.charcoal);
      }
      paperNote(p, 8, 5, 6, 5, P.steel, 4231);
    },
    { cx: 8, base: 32, shadow: 0 },
  ),
);

registerProp('prop_h_housou', () =>
  standProp(
    48,
    26,
    (p) => {
      // (22,3) the stand mic, (23,3) the old broadcast desk (knobs and a meter), (24,3) the bookshelf
      p.vline(8, 4, 20, P.steel);
      p.ellipse(8, 3, 2, 2.5, P.charcoal);
      p.set(8, 2, P.steel);
      p.rect(5, 20, 7, 2, P.charcoal);
      p.rect(17, 8, 14, 14, P.concrete);
      p.hline(17, 30, 8, P.concreteLt);
      for (let k = 0; k < 5; k++) p.set(19 + k * 2, 14, P.charcoal);
      p.rect(20, 10, 8, 3, P.paper); // the meter
      p.line(24, 12, 26, 10, P.red);
      p.rect(34, 0, 12, 22, P.wood);
      for (let s = 0; s < 3; s++) {
        p.hline(34, 45, 7 + s * 7, P.woodDark);
        for (let b = 0; b < 5; b++) p.rect(35 + b * 2, 2 + s * 7, 2, 5, [P.navy, P.maroon, P.leafShade, P.brass, P.steel][(b + s) % 5]);
      }
      p.rect(39, 9, 3, 5, P.gold); // the star atlas
    },
    { cx: 24, base: 16, shadow: 0 },
  ),
);

void glowDot;
void nightK;
void fontTextSmall;
void tiny;
