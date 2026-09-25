// Chapter-2 rooms, part 1 (52_ch2_level_art 4.1・4.2): the unlit one-man
// train and ペロリ's greenhouse No.3.
//
// Each room is one flat shell prop anchored at (0,0) (walls, seats, the
// film, the fittings on the walls; the floors are the ground layer) plus
// y-sorted fittings. The dark and the lamps are the world's light map; the
// shells add their own fixed lights (the driver's instruments, the
// starlight sliding over the seats, the tomato's glow).

import type { Gfx } from '../../engine/gfx';
import { mix, PixelCanvas } from '../../engine/pixel';
import { h01, ihash, valueNoise } from '../tiles/noise';
import { P } from '../tiles/palette';
import { dk, lt, outline } from './kit';
import { glowDot, HLIGHT, hs, nightK, paintFrames, standProp } from './hoshi_kit';
import { drawLight, poolEllipse } from './light';
import { registerProp } from './registry';
import type { PropArt, PropEnv } from './types';

// ================================================================ 4.1 map_hoshi_train (20×7)

const TW = 20 * 16;
const TH = 7 * 16;

/** Seat moquette (#6B7186, lit #9AA0A8) with a 1px fluff edge. */
function seatRow(p: PixelCanvas, x0: number, x1: number, y: number, north: boolean): void {
  for (let x = x0; x <= x1; x++) {
    for (let j = 0; j < 16; j++) {
      let c: string;
      if (north) {
        // backrest (against the north wall) then the cushion seen from above
        if (j < 5) c = j === 0 ? P.steel : j === 4 ? P.charcoal : P.asphalt;
        else if (j < 14) c = j === 5 ? P.steel : (x + j) % 7 === 0 ? mix(P.asphalt, P.steel, 0.4) : P.asphalt;
        else c = j === 14 ? P.charcoal : P.ink;
      } else {
        // the cushion, then the backrest against the south wall (nearest to us)
        if (j < 2) c = j === 0 ? P.charcoal : P.steel;
        else if (j < 9) c = (x + j) % 7 === 0 ? mix(P.asphalt, P.steel, 0.4) : P.asphalt;
        else if (j === 9) c = P.steel;
        else c = j === 15 ? P.ink : (x % 5 === 0 ? P.charcoal : mix(P.asphalt, P.charcoal, 0.35));
      }
      p.set(x, y + j, c);
    }
    if (h01(x, y, 4001) < 0.25) p.set(x, y + (north ? 13 : 8), P.steel); // the fluff
  }
  // the seat ends: steel partitions (袖仕切り)
  for (const ex of [x0 - 2, x1 + 1]) {
    p.rect(ex, y + (north ? 2 : 0), 2, 14, P.concrete);
    p.vline(ex, y + (north ? 2 : 0), y + 15, P.concreteLt);
  }
}

function trainShell(): PixelCanvas {
  const p = new PixelCanvas(TW, TH);
  const S = P.charcoal;
  // the car body round the room (sections): north row 0, south row 6, ends x0 / x19
  for (let x = 0; x < TW; x++) {
    for (let y = 12; y < 16; y++) p.set(x, y, y === 12 ? P.asphalt : S);
    for (let y = 96; y < 100; y++) p.set(x, y, y === 99 ? P.asphalt : S);
  }
  for (let y = 12; y < 100; y++) {
    for (let x = 12; x < 16; x++) p.set(x, y, x === 12 ? P.asphalt : S);
    for (let x = 304; x < 308; x++) p.set(x, y, x === 307 ? P.asphalt : S);
  }
  // ---- the north wall (row 1, x1–15): beige panels, the windows, the rack
  const wy = 16;
  for (let x = 16; x < 256; x++)
    for (let j = 0; j < 16; j++) {
      let c: string = j === 0 ? P.asphalt : j === 1 ? P.steel : j < 14 ? P.concrete : j === 14 ? P.steel : P.asphalt;
      if (j > 1 && j < 14 && x % 32 === 16) c = P.steel; // panel seams
      p.set(x, wy + j, c);
    }
  // the doors on the north wall (x1–2 and x14–15)
  for (const dx of [16, 224]) {
    p.rect(dx + 2, wy + 1, 28, 15, P.steel);
    p.vline(dx + 16, wy + 1, wy + 15, P.asphalt);
    for (const px of [dx + 6, dx + 20]) {
      p.rect(px, wy + 3, 6, 8, P.night);
      p.hline(px, px + 5, wy + 3, P.shade);
    }
    p.hline(dx + 2, dx + 29, wy + 1, P.concreteLt);
  }
  // five windows (x3–12, 2 tiles each): the dark outside (the stars are glow)
  for (let k = 0; k < 5; k++) {
    const x = 50 + k * 32;
    p.rect(x - 1, wy + 3, 30, 10, P.steel);
    for (let j = 0; j < 8; j++) for (let i = 0; i < 28; i++) p.set(x + i, wy + 4 + j, j < 3 ? P.void : j < 6 ? P.night : mix(P.night, P.nightShade, 0.5));
    p.hline(x - 1, x + 28, wy + 3, P.concreteLt);
    p.vline(x + 13, wy + 4, wy + 11, P.steel);
  }
  // the silver luggage rack over the windows (2 lines), a straw hat on it (6,1)
  p.hline(48, 214, wy + 1, P.concreteLt);
  p.hline(48, 214, wy + 2, P.steel);
  p.ellipse(104, wy + 1.5, 6, 2, P.goldPale);
  p.rect(101, wy - 1, 7, 3, P.goldPale);
  p.hline(101, 107, wy + 1, P.red);
  p.set(99, wy + 2, P.brass);
  // the route map (14,1) over the front door: a line and eight circles, all but the ends 「通過」
  const rx = 226;
  p.rect(rx, wy - 3, 28, 5, P.white);
  p.hline(rx + 1, rx + 26, wy - 1, P.navy);
  for (let k = 0; k < 8; k++) {
    const cx = rx + 2 + k * 3 + (k > 3 ? 1 : 0);
    p.set(cx, wy - 2, P.navy);
    p.set(cx, wy, k === 0 || k === 7 ? P.navy : P.verm);
  }
  // ---- the seats
  seatRow(p, 48, 223, 32, true);
  seatRow(p, 64, 223, 80, false);
  // ---- the glass partition (x16, rows 2–5) and the driver's cab (x17–18)
  for (let y = 16; y < 96; y++) {
    p.set(256, y, P.steel);
    p.set(257, y, P.concreteLt);
    if (y > 30 && y < 92) {
      p.set(262, y, P.steel);
      if ((y + 3) % 17 < 2) p.set(259 + ((y + 3) % 17), y, P.aqua); // a diagonal glint on the glass
    }
  }
  for (let y = 16; y < 96; y++) for (let x = 263; x < 304; x++) p.set(x, y, (x + y) % 9 === 0 ? P.charcoal : mix(P.charcoal, P.asphalt, 0.3));
  // the console across the front (east) and the windscreen seen end-on
  p.rect(292, 20, 12, 72, P.charcoal);
  p.rect(293, 34, 10, 40, P.ink);
  for (let y = 36; y < 72; y += 6) p.hline(294, 301, y, P.asphalt);
  p.rect(296, 50, 5, 9, P.asphalt); // the brake handle
  p.set(298, 49, P.steel);
  p.rect(300, 16, 4, 80, P.night); // the windscreen
  p.vline(301, 18, 92, P.nightShade);
  // the driver's seat
  p.rect(276, 40, 12, 10, P.navy);
  p.hline(276, 287, 40, P.blue);
  // ---- the south wall's section with the two doors (2,6) (15,6)
  for (const dx of [32, 240]) {
    for (let x = dx; x < dx + 16; x++) for (let y = 96; y < 100; y++) p.set(x, y, y === 96 ? P.steel : P.night);
    p.vline(dx + 7, 96, 99, P.charcoal);
    p.set(dx + 3, 97, P.shade);
    p.set(dx + 11, 97, P.shade);
  }
  // hand straps' rails are in the straps prop; the floor is the ground
  return p;
}

/** The view out of the five windows: mountains sliding by right to left, now and then a house light. */
function trainWindowsOver(g: Gfx, x: number, y: number, env: PropEnv): void {
  const t = env.t;
  for (let k = 0; k < 5; k++) {
    const wx = x + 50 + k * 32;
    const wy = y + 20;
    // a mountain's black shoulder crossing every 6–10 s (all windows see the same one, offset)
    const per = 8000;
    const ph = ((t + 1200 - k * 360) % per) / per; // 0..1 as it crosses
    const cx = Math.round(28 + 60 - ph * 150);
    for (let i = 0; i < 28; i++) {
      const d = Math.abs(i - cx) / 14;
      if (d >= 1.6) continue;
      const hgt = Math.round(8 - d * 5 + Math.sin(i * 0.9) * 0.5);
      for (let j = 8 - Math.max(0, hgt); j < 8; j++) g.rect(wx + i, wy + j, 1, 1, P.void);
    }
  }
}

/** Stars in the windows and the house lights passing (emissive: the outside is not lit by the dark car). */
function trainWindowsGlow(g: Gfx, x: number, y: number, env: PropEnv): void {
  const t = env.t;
  for (let k = 0; k < 5; k++) {
    const wx = x + 50 + k * 32;
    const wy = y + 20;
    for (let s = 0; s < 4; s++) {
      const sx = (ihash(k, s, 4011) % 28) | 0;
      const sy = (ihash(k, s, 4013) % 4) | 0;
      const tw = (t + s * 377 + k * 911) % 1700 < 1400;
      g.rect(wx + sx, wy + sy, 1, 1, tw ? '#FFF6D8' : '#9AA0A8', 0.9);
    }
    // a house light drifting west, far below (every ~11 s in some window)
    const per = 11000;
    const ph = ((t + k * 2300) % per) / per;
    if (ihash(k, Math.floor((t + k * 2300) / per), 4015) % 3 === 0 && ph < 0.4) {
      const lx = Math.round(27 - (ph / 0.4) * 30);
      if (lx >= 0 && lx < 28) g.rect(wx + lx, wy + 6, 1, 1, '#F6D98A', 0.9);
    }
  }
  // the driver's instruments: 4 small lights (the brightest thing in the car)
  const inst: [number, number, string][] = [
    [294, 38, '#5CE1FF'], [297, 44, '#7CFF9A'], [294, 62, '#5CE1FF'], [299, 66, '#7CFF9A'],
  ];
  for (const [ix, iy, c] of inst) glowDot(g, x + ix, y + iy, c, c === '#5CE1FF' ? '92,225,255' : '124,255,154', 3, 0.9);
}

/** Starlight parallelograms (#7FD1E8 α10%, 24px wide) sliding right to left over seats and floor every 1.4 s. */
function trainLight(g: Gfx, x: number, y: number, env: PropEnv): void {
  const ph = (env.t % 1400) / 1400;
  const cx = Math.round(x + 300 - ph * 300 * 1.2);
  const ctx = g.ctx;
  ctx.save();
  ctx.globalAlpha = 0.16;
  ctx.fillStyle = 'rgb(127,209,232)';
  for (let j = 0; j < 80; j += 2) {
    const off = Math.round(j * 0.35);
    ctx.fillRect(cx + off, y + 24 + j, 24, 2);
  }
  ctx.restore();
  // the instruments' faint light round the cab
  drawLight(g, poolEllipse(16, 22, '92,225,255'), x + 292, y + 52, 0.25);
}

registerProp('prop_h_train_shell', () => {
  const img = trainShell().toCanvas();
  const a: PropArt = {
    ox: 0,
    oy: 0,
    w: TW,
    h: TH,
    foot: 0,
    flat: true,
    img: () => img,
    over: trainWindowsOver,
    glow: trainWindowsGlow,
    light: trainLight,
  };
  return a;
});

/** The straps (つり革) on two rails, swinging west 2px together every 5 s (3 frames); the ads hang between. */
const STRAPS = paintFrames(3, TW, 44, (p, k) => {
  const dx = k === 0 ? 0 : k === 1 ? -1 : -2;
  for (const ry of [6, 24]) {
    p.hline(46, 222, ry, P.concreteLt);
    p.hline(46, 222, ry + 1, P.steel);
    for (let x = 52; x < 220; x += 12) {
      const sx = x + dx;
      p.vline(sx, ry + 2, ry + 5, P.navy);
      p.set(sx, ry + 2, P.blue);
      // the white triangle ring
      p.set(sx - 1, ry + 6, P.white);
      p.set(sx + 1, ry + 6, P.white);
      p.set(sx - 1, ry + 7, P.concreteLt);
      p.set(sx + 1, ry + 7, P.concreteLt);
      p.hline(sx - 1, sx + 1, ry + 8, P.white);
    }
  }
  // the hanging ad (10–11,3): navy ground, a white dome and a small bell
  const ax = 164 + dx;
  p.vline(ax + 2, 26, 29, P.steel);
  p.vline(ax + 21, 26, 29, P.steel);
  p.rect(ax, 30, 24, 12, P.navy);
  p.strokeRect(ax, 30, 24, 12, P.steel);
  p.ellipse(ax + 8, 37, 4, 3, P.white);
  p.rect(ax + 4, 37, 9, 2, P.white);
  p.rect(ax + 16, 34, 3, 4, P.brass);
  p.set(ax + 17, 38, P.brass);
  p.hline(ax + 3, ax + 12, 40, P.aqua);
});
registerProp('prop_h_train_straps', () => ({
  ox: 0,
  oy: 0,
  w: 0,
  h: 0,
  foot: 0,
  flat: true,
  img: () => null,
  fg: [
    {
      ox: 0,
      oy: 16,
      img: (env: PropEnv) => {
        const ph = env.t % 5000;
        return STRAPS[ph < 90 ? 1 : ph < 400 ? 2 : ph < 490 ? 1 : 0];
      },
    },
  ],
}));

/** 整理券の機械 (2,5): a grey box by the rear door, a red button, the ticket's mouth. */
registerProp('prop_h_train_seiriken', () =>
  standProp(
    12,
    22,
    (p) => {
      p.vline(5, 10, 21, P.steel);
      p.vline(6, 10, 21, P.asphalt);
      p.rect(1, 0, 10, 11, P.concrete);
      p.hline(1, 10, 0, P.concreteLt);
      p.vline(10, 1, 10, P.steel);
      p.rect(3, 2, 3, 3, P.red);
      p.set(3, 2, P.vermLt);
      p.rect(7, 7, 3, 1, P.ink);
      p.set(8, 8, P.white);
    },
    { cx: 8, base: 16, shadow: 0 },
  ),
);

/** 運賃箱 (15,5): the fare box by the front door, its little screen dark. */
registerProp('prop_h_train_untin', () =>
  standProp(
    14,
    24,
    (p) => {
      p.rect(2, 4, 10, 20, P.charcoal);
      p.vline(2, 4, 23, P.asphalt);
      p.rect(1, 0, 12, 5, P.steel);
      p.hline(1, 12, 0, P.concreteLt);
      p.rect(3, 6, 8, 4, P.night); // the dark fare screen
      p.set(4, 7, P.nightShade);
      p.rect(4, 12, 6, 2, P.concrete); // the coin tray
      p.hline(4, 9, 12, P.concreteLt);
      p.rect(5, 16, 4, 2, P.ink);
    },
    { cx: 8, base: 16, shadow: 0 },
  ),
);

// ================================================================ 4.2 map_hoshi_house (9×18)

const HW = 9 * 16;
const HH = 18 * 16;
const SIDE = 120; // the film view outside the side walls (the camera centres the 144px room)

/**
 * The house in the morning (ending cut 2b, 52 4.2): the clock starts the
 * first frame the house is drawn in h3 (the cut's fade-in). At ROLL_AT
 * ペロリ's crank rolls the east side's lower film up (4 frames, 0.4 s) and
 * the morning comes in from the east; at RIPEN_AT the green trusses redden
 * plant by plant from the door to the back (0.1 s each). A house not drawn
 * for half a second starts again (another visit, a load).
 */
const ROLL_AT = 500;
const RIPEN_AT = 1400;
let dawnSeen = { t0: -1, last: -1 };
function houseDawnMs(env: PropEnv): number {
  if (hs(env) < 3) {
    dawnSeen = { t0: -1, last: -1 };
    return -1;
  }
  if (dawnSeen.t0 < 0 || env.t - dawnSeen.last > 500 || env.t < dawnSeen.last) dawnSeen.t0 = env.t;
  dawnSeen.last = env.t;
  return env.t - dawnSeen.t0;
}

function houseShell(dawn: boolean): PixelCanvas {
  const W = HW + SIDE * 2;
  const p = new PixelCanvas(W, HH);
  const X = (x: number) => x + SIDE;
  // outside the side films: 星あかりの薄い青 (#2A2440 with 2px #3A2B5C stripes),
  // the neighbours' shapes; at dawn (h3) the films glow the sky's pale lilac
  const outA = dawn ? mix(P.concreteLt, P.lilac, 0.4) : P.ink;
  const outB = dawn ? mix(P.concrete, P.lilac, 0.45) : P.nightShade;
  const shape = dawn ? mix(P.steel, P.lilac, 0.35) : P.nightShade;
  const bamboo = dawn ? mix(P.leafDeep, P.lilac, 0.45) : P.night;
  for (let y = 0; y < HH; y++)
    for (let x = 0; x < W; x++) {
      if (x >= SIDE && x < SIDE + HW) continue;
      const stripe = Math.floor(x / 2) % 4 === 0 && h01(Math.floor(x / 2), Math.floor(y / 32), 4021) < 0.7;
      // at dawn the east film (the sunrise side) warms, the far end is brightest
      const east = dawn && x >= SIDE + HW ? 0.22 * Math.min(1, (x - SIDE - HW) / 60) : 0;
      const far = dawn ? 0.12 * (1 - y / HH) : 0;
      const c0 = stripe ? outB : outA;
      p.set(x, y, dawn ? mix(mix(c0, P.peach, east), P.white, far) : c0);
    }
  // the next house (2号) to the east: its arches faint through two films
  for (let y = 0; y < HH; y++)
    for (let x = SIDE + HW + 24; x < SIDE + HW + 72; x++) {
      const u = Math.abs(x - (SIDE + HW + 48)) / 24;
      if ((y % 16 === 0 && u < 1) || (u > 0.92 && u < 1)) p.set(x, y, shape);
    }
  // bamboo shapes on the slope to the west
  for (let k = 0; k < 7; k++) {
    const bx = 20 + k * 14 + (ihash(k, 1, 4023) % 6);
    for (let y = 0; y < HH; y++) if ((y + k * 5) % 23 !== 0) p.set(bx, y, bamboo);
  }
  // ---- the side films (x0 and x8): the film seen edge-on from inside, the arch pipes every 16px
  for (const sx of [0, 8]) {
    const x0 = X(sx * 16);
    for (let y = 0; y < HH; y++)
      for (let i = 0; i < 16; i++) {
        const inner = sx === 0 ? i >= 10 : i < 6;
        let c: string = inner
          ? mix(P.concreteLt, dawn ? P.paper : P.nightShade, dawn ? 0.3 : 0.55)
          : mix(P.concrete, dawn ? P.lilac : P.ink, dawn ? 0.35 : 0.72);
        if (inner && (sx === 0 ? i === 10 : i === 5)) c = mix(P.white, P.nightShade, dawn ? 0.1 : 0.35);
        if (y % 16 === 0) c = inner ? P.steel : dawn ? P.steel : P.charcoal;
        p.set(x0 + i, y, c);
      }
    // the rolled side film at the foot of the wall (巻き上げの筒)
    for (let y = 0; y < HH; y++) {
      const bx = sx === 0 ? x0 + 9 : x0 + 6;
      p.set(bx, y, y % 16 === 8 ? P.steel : P.concrete);
    }
  }
  // the crank on the east wall (8,15)
  const cx = X(8 * 16 + 4);
  const cy = 15 * 16 + 7;
  p.ellipse(cx, cy, 3, 3, P.steel);
  p.ellipse(cx, cy, 1.5, 1.5, P.charcoal);
  p.line(cx, cy, cx + 3, cy + 4, P.concrete);
  p.rect(cx + 2, cy + 4, 2, 3, P.charcoal);
  // ---- the north end (rows 0–1): film over the arch, the frame pipes, the far door's frame
  for (let y = 0; y < 32; y++)
    for (let x = 16; x < 128; x++) {
      const u = Math.abs(x - 72) / 56;
      let c: string = dawn ? mix(P.concreteLt, P.lilac, 0.25 + u * 0.2) : mix(P.concreteLt, P.ink, 0.62 + u * 0.2);
      if (y === 31) c = P.steel;
      if (x % 16 === 0) c = P.steel;
      if (y === 10) c = P.concrete; // the tie bar
      if (x > 64 && x < 80 && y > 12) c = mix(P.wood, P.ink, 0.4); // the far door's frame
      p.set(X(x), y, c);
    }
  // the max-min thermometer on the pipe (6,1): white with a red thread
  const tx = X(6 * 16 + 7);
  p.rect(tx - 1, 14, 4, 12, P.white);
  p.vline(tx, 16, 24, P.red);
  p.vline(tx + 1, 16, 20, P.navy);
  p.set(tx, 15, P.steel);
  // ---- the south wall (row 17): the film's foot and the door frame at (4,17)
  for (let x = 0; x < HW; x++) for (let y = 272; y < 276; y++) p.set(X(x), y, y === 272 ? mix(P.concrete, P.ink, 0.4) : P.ink);
  const dx = X(64);
  p.rect(dx, 272, 16, 4, P.wood);
  p.hline(dx, dx + 15, 272, P.woodLt);
  // ---- the irrigation tube along every aisle's edges: black, a drop mark every 8px
  for (const ax of [2, 4, 6])
    for (const side of [0, 15]) {
      const x = X(ax * 16 + side);
      for (let y = 32; y < 15 * 16; y++) {
        p.set(x, y, P.ink);
        if ((y + ax * 3) % 8 === 0) p.set(x + (side ? -1 : 1), y, P.aqua);
      }
    }
  // fallen side shoots here and there on the aisles (decal_h_wakime)
  for (let k = 0; k < 14; k++) {
    const ax = [2, 4, 6][k % 3];
    const x = X(ax * 16 + 4 + (ihash(k, 2, 4025) % 8));
    const y = 40 + (ihash(k, 3, 4027) % 190);
    p.set(x, y, P.leafDeep);
    p.set(x + 1, y + 1, P.leaf);
    p.set(x + 2, y, P.leafShade);
  }
  return p;
}

registerProp('prop_h_house_shell', () => {
  const night = houseShell(false).toCanvas();
  let day: HTMLCanvasElement | null = null;
  const a: PropArt = {
    ox: -SIDE,
    oy: 0,
    w: night.width,
    h: HH,
    foot: 0,
    flat: true,
    img: (env) => (hs(env) >= 3 ? (day ??= houseShell(true).toCanvas()) : night),
    light(g, x, y, env) {
      // the morning coming in through the rolled-up side (ending cut 2b)
      const e = houseDawnMs(env);
      if (e < 0) return;
      const k = Math.max(0, Math.min(4, Math.floor((e - ROLL_AT) / 100) + 1));
      if (k <= 0) return;
      const ex = x + 8 * 16;
      const yTop = y + 17 * 16 - Math.round((17 * 16 - 8 * 16) * (k / 4));
      const yBot = y + 17 * 16;
      for (let j = yTop; j < yBot; j += 2) {
        const x0 = Math.max(x + 17, ex - 72 + Math.round((yBot - j) * 0.3));
        g.rect(x0, j, ex - x0 + 16, 2, 'rgb(255,214,140)', 0.42 * (k / 4));
      }
    },
    over(g, x, y, env) {
      const e = houseDawnMs(env);
      if (e >= 0) {
        // the east side's lower film rolled up (4 frames over 0.4 s): the outside and the morning come in
        const k = Math.max(0, Math.min(4, Math.floor((e - ROLL_AT) / 100) + 1));
        if (k > 0) {
          const ex = x + 8 * 16;
          const yTop = y + 17 * 16 - Math.round((17 * 16 - 8 * 16) * (k / 4));
          const yBot = y + 17 * 16;
          // the opening: the morning outside (pale gold over the next house's film)
          g.rect(ex + 6, yTop, 10, yBot - yTop, mix(P.goldPale, P.white, 0.35));
          for (let j = yTop; j < yBot; j += 16) g.rect(ex + 6, j, 10, 1, P.concrete);
          // the rolled film tube, now at the top of the opening
          g.rect(ex + 5, yTop - 3, 11, 3, P.concreteLt);
          g.rect(ex + 5, yTop - 1, 11, 1, P.steel);
          // the light across the floor (#FFE7A3 α30%): a parallelogram from
          // the opening, its west edge slanting and dithered (the light map
          // adds the same shape, so the plants standing in it are lit too)
          const a = 0.18 * (k / 4);
          for (let j = yTop; j < yBot; j += 2) {
            const x0 = Math.max(x + 17, ex - 72 + Math.round((yBot - j) * 0.3));
            g.rect(x0, j, ex - x0, 2, '#FFE7A3', a);
            if ((j >> 1) & 1) g.rect(x0 - 2, j, 2, 1, '#FFE7A3', a * 0.6);
            else g.rect(x0 - 2, j + 1, 2, 1, '#FFE7A3', a * 0.6);
          }
        }
        return;
      }
      // ふしぎ07: the film at (0,8) swells 1px and falls back every 4 s; a light band runs down it
      if (env.flag('flag_fushigi_ch2_07') > 0 || hs(env) < 1) return;
      const ph = (env.t % 4000) / 4000;
      const sw = Math.sin(ph * Math.PI * 2) > 0.3 ? 1 : 0;
      const fx = x + 10;
      const fy = y + 8 * 16;
      if (sw) for (let j = 1; j < 15; j++) g.rect(fx + 1, fy + j, 1, 1, mix(P.white, P.nightShade, 0.3));
      const band = Math.floor(ph * 20);
      if (band < 16) g.rect(fx, fy + band, 6, 2, '#FFE7A3', 0.35);
    },
  };
  return a;
});

/** The overhead wires over each plant row (foreground): 1px #9AA0A8, north–south. */
registerProp('prop_h_house_wire', () => {
  const p = new PixelCanvas(HW, HH);
  for (const x of [1, 3, 5, 7]) for (let y = 0; y < 15 * 16 - 20; y++) p.set(x * 16 + 8, y, y % 2 ? P.steel : P.concrete);
  const img = p.toCanvas();
  return { ox: 0, oy: 0, w: 0, h: 0, foot: 0, flat: true, img: () => null, fg: [{ ox: 0, oy: -18, img: () => img }] };
});

// ---------------------------------------------------------------- the tomato plants (夏秋トマト、8月末)

/**
 * One plant per tile (52 4.2), each its own depth-sorted prop: the plant
 * south of another hides that one's lower part and a character in the aisle
 * goes behind the plants south of him and in front of the ones north, like
 * any other thing on the floor. Each plant rises 40px from its foot to the
 * overhead wire (1.5 tiles over its tile, taller than Minato):
 *
 *  - the foot (the lowest 9px): the lower leaves are pruned (下葉かき), so
 *    only the bare stem with its leaf scars, the bamboo stake, the string
 *    and the black mulch show in a dark hollow;
 *  - the leaf mass: compound leaves on drooping petioles, each a few oval
 *    leaflets lit on their upper edge, over the shaded undersides; gaps
 *    where the string and the dark show through;
 *  - the top, at the wire: flat (the plants are trained to one height), the
 *    growing tip bending over, the yellow flowers of the top truss;
 *  - the trusses: 3–4 green fruit (3×3, #9BCB6B with a #C9E08A rim and a
 *    dark underside) at 10px and 18px over the foot, hanging out to the
 *    aisle. Those of the plant north of this one fall on this one's leaves,
 *    so each plant paints its northern neighbour's trusses again over its
 *    own leaves: the fruit along the aisle read the whole length of a row.
 */
interface PlantAt {
  cx: number;
  foot: number;
  top: number;
  seed: number;
  /** the aisle side of the lower truss (-1 west, 1 east) */
  side: number;
}

/**
 * The plant's canvas: 20×58, the foot line at y56 (the tile's y14), the wire
 * at y≈16. The two empty rows over the wire keep the plants out of the
 * lantern's rim for small props (a row of rims read as a fence).
 */
const PW = 20;
const PTOP = 42;
const PFOOT = PTOP + 14;

function plantAt(seed: number, i: number, dy = 0): PlantAt {
  return {
    cx: 10 + (seed % 3) - 1,
    foot: PFOOT + dy,
    top: PFOOT + dy - 39 - (ihash(seed, 1, 4029) % 3),
    seed,
    side: i % 2 ? 1 : -1,
  };
}

/** Half-width of the foliage d px over the foot (0: the pruned foot). */
function leafSpan(d: number, h: number, seed: number): number {
  if (d < 9) return 0;
  if (d < 12) return 3 + (seed & 1);
  if (d > h - 2) return 5;
  if (d > h - 4) return 6;
  return 7 - (ihash(d >> 2, seed, 4033) % 3 === 0 ? 1 : 0);
}

/** Leaflet shapes (right-hand; flipped for the left): a = lit upper edge, b = body, c = shaded underside. */
const LEAFLETS = [
  ['.aa.', 'abbb', '.cc.'],
  ['aa.', 'bbc'],
  ['.aaa', 'abbc', '..c.'],
  ['aa', 'bc'],
];

function stampLeaflet(p: PixelCanvas, x: number, y: number, side: number, shape: number, lit: number): void {
  const rows = LEAFLETS[shape % LEAFLETS.length];
  const w = rows[0].length;
  // the leaves keep to the bluish middle greens: the pale yellow-greens are the fruit's
  const A = lit > 0.62 ? P.leaf : lit > 0.35 ? mix(P.leaf, P.leafDeep, 0.5) : P.leafDeep;
  const B = lit > 0.45 ? P.leafDeep : mix(P.leafDeep, P.leafShade, 0.5);
  const C = P.leafShade;
  rows.forEach((r, j) =>
    [...r].forEach((ch, i) => {
      if (ch === '.') return;
      const X = side > 0 ? x + i : x + w - 1 - i;
      p.set(X, y + j, ch === 'a' ? A : ch === 'b' ? B : C);
    }),
  );
}

function plantLeaves(p: PixelCanvas, a: PlantAt): void {
  const { cx, foot, top, seed } = a;
  const h = foot - top;
  // the inside of the leaf mass: the shaded undersides, dense (late August),
  // with dark gaps where the string and the stem show
  for (let y = top + 1; y < foot - 9; y++) {
    const s = leafSpan(foot - y, h, seed);
    for (let x = cx - s + 1; x <= cx + s - 1; x++) {
      const n = valueNoise(x * 0.5, y * 0.42, 4035 + seed);
      if (n < 0.3) continue;
      p.under(x, y, n > 0.64 ? P.leafShade : mix(P.leafShade, P.ink, Math.abs(x - cx) < 2 ? 0.5 : 0.3));
    }
  }
  // the stem winding round the string
  for (let y = foot - 9; y > top + 2; y--) p.set(cx + ((y >> 2) % 2), y, mix(P.leafShade, P.leafDeep, 0.5));
  // the compound leaves: a petiole from the stem out and down, leaflets along it
  const leaves = 11 + (seed % 3);
  for (let k = 0; k < leaves; k++) {
    const hh = ihash(k, seed, 4031);
    const d = Math.min(h - 3, (11 + (k * (h - 13)) / (leaves - 1) + (hh % 3)) | 0);
    const side = (k + seed) % 2 ? 1 : -1;
    const span = leafSpan(d, h, seed);
    if (span <= 0) continue;
    const len = Math.max(2, span - 1 - ((hh >>> 4) % 2));
    const y0 = foot - d;
    const sx = cx + (side > 0 ? 1 : 0);
    // lit from above (the lantern is carried high): the upper leaves and the west side a little more
    const litBase = (side < 0 ? 0.5 : 0.38) + (d > h - 12 ? 0.22 : 0);
    let lastX = sx;
    let lastY = y0;
    for (let i = 1; i <= len; i++) {
      const X = sx + side * i;
      const Y = y0 + ((i * i) >> 3); // the droop
      p.set(X, Y, P.leafShade);
      lastX = X;
      lastY = Y;
      if (i % 2 === 0 && i < len) {
        // a pair of side leaflets: one over, one under the petiole
        const up = (i + k) % 2 === 0;
        const lit = litBase + h01(k, i, 4039 + seed) * 0.2;
        stampLeaflet(p, side > 0 ? X - 1 : X - 2, up ? Y - 2 : Y, side, (k + i) % 4, up ? lit : lit - 0.2);
      }
    }
    // the terminal leaflet, the largest
    stampLeaflet(p, side > 0 ? lastX - 1 : lastX - 3, lastY - 1, side, (hh >>> 7) % 3 === 0 ? 2 : 0, litBase + 0.12);
  }
  // the top at the wire: two leaves spread flat, the growing tip bent over, the flowers
  const ty = top + 1;
  for (const s of [-1, 1]) {
    for (let i = 1; i <= 5; i++) p.set(cx + s * i, ty + (i > 3 ? 1 : 0), P.leafShade);
    stampLeaflet(p, s > 0 ? cx + 2 : cx - 5, ty - 1, s, 2, 0.85);
    stampLeaflet(p, s > 0 ? cx + 4 : cx - 7, ty + 1, s, 1, 0.7);
  }
  const bend = seed % 2 ? 1 : -1;
  p.set(cx, ty - 1, P.leafYoung);
  p.set(cx + bend, ty - 2, P.leafYoung);
  p.set(cx + bend * 2, ty - 2, mix(P.leafYoung, P.leafLt, 0.4));
  p.set(cx + bend * 3, ty - 1, P.leafYoung);
  // the top truss in flower (small yellow stars), another bud lower down
  const fx = cx - bend * 3;
  p.set(fx, ty + 3, P.gold);
  p.set(fx - bend, ty + 4, P.goldPale);
  p.set(fx, ty + 5, P.gold);
  if (seed % 3 !== 1) {
    p.set(cx + bend * 4, ty + 7, P.gold);
    p.set(cx + bend * 5, ty + 8, P.goldPale);
  }
}

function plantFoot(p: PixelCanvas, a: PlantAt): void {
  const { cx, foot, seed } = a;
  // the hollow under the leaves (pruned): dark, the mulch at its foot
  for (let y = foot - 8; y <= foot + 1; y++)
    for (let x = cx - 5; x <= cx + 5; x++) {
      const e = Math.abs(x - cx) + (foot - 1 - y) * 0.5;
      if (e > 5) continue;
      p.set(x, y, y >= foot - 1 ? P.charcoal : mix(P.leafShade, P.ink, 0.62));
    }
  // the bamboo stake (to half the plant's height; hidden in the leaves above)
  p.vline(cx - 2, foot - 11, foot, P.woodLt);
  p.set(cx - 2, foot - 11, lt(P.woodLt));
  p.set(cx - 2, foot, P.brassOld);
  // the string from the overhead wire, down the stem to the peg
  p.vline(cx + 1, foot - 10, foot - 1, P.paperGrid);
  p.set(cx + 1, foot, P.concrete);
  // the bare stem and its leaf scars (the leaves cut off)
  for (let y = foot - 10; y <= foot; y++) p.set(cx, y, y & 1 ? P.leafDeep : P.leaf);
  p.set(cx - 1, foot - 7, P.leafLt);
  p.set(cx + 1, foot - 4, P.leafLt);
  // a dry lower leaf not yet pruned, some plants
  if (seed % 4 === 1) {
    p.set(cx + 2, foot - 9, P.brassOld);
    p.set(cx + 3, foot - 8, P.woodLt);
    p.set(cx + 4, foot - 8, P.brassOld);
  }
}

function plantFruit(p: PixelCanvas, a: PlantAt, i: number, ripe: boolean): void {
  const { cx, foot, seed, side: s0 } = a;
  const h0 = ihash(i, seed, 4043);
  const trusses: [number, number][] = [
    [foot - 10 - (h0 % 2), s0],
    [foot - 18 - ((h0 >>> 2) % 3), (h0 >>> 5) % 4 === 0 ? s0 : -s0],
  ];
  // the bunches: round fruit packed under the stalk's end, out toward the aisle
  const BUNCH: [number, number][][] = [
    [[0, 0], [3, 1], [1, 3]],
    [[0, 0], [3, 0], [1, 3], [4, 3]],
    [[1, 0], [0, 3], [3, 3]],
    [[0, 0], [2, 3]],
  ];
  trusses.forEach(([ty, side], t) => {
    const hh = ihash(i, t, 4041 + seed);
    const bunch = BUNCH[t === 0 ? hh % 3 : 2 + ((hh >>> 3) % 2)];
    // the truss stalk out from the stem, bending down
    const bx = cx + side * 3;
    for (let k = 1; k <= 3; k++) p.set(cx + side * k, ty - 3 + (k >> 1), P.leafShade);
    const at = bunch.map(([dx, dy]) => [side > 0 ? bx + dx - 1 : bx - dx - 1, ty + dy - 2] as [number, number]);
    // a dark ring round each fruit first, so the packed fruit read one by one
    for (const [fx, fy] of at) {
      p.hline(fx, fx + 2, fy - 1, P.leafShade);
      p.hline(fx, fx + 2, fy + 3, P.ink);
      p.vline(fx - 1, fy, fy + 2, P.ink);
      p.vline(fx + 3, fy, fy + 2, P.ink);
    }
    const body = ripe ? P.red : P.leafYoung;
    const rimC = ripe ? P.vermLt : P.leafLt;
    const shade = ripe ? P.vermShade : P.leaf;
    at.forEach(([fx, fy], f) => {
      // a round 3×3 fruit: the lit rim upper left, the shaded underside, the calyx on top
      p.rect(fx, fy, 3, 3, body);
      p.set(fx, fy, rimC);
      p.set(fx + 1, fy, rimC);
      p.set(fx, fy + 1, rimC);
      p.set(fx + 2, fy + 2, shade);
      p.set(fx + 1, fy + 2, shade);
      p.set(fx + 1, fy - 1, P.leafDeep); // the calyx
      if (((seed + f) & 3) === 0) p.set(fx, fy, ripe ? P.glint : P.white);
    });
  });
}

/**
 * One plant (52 4.2): `i` counted from the north end of its row of `n`,
 * `north: 0` when the plant north of it is missing (the gap of ふしぎ07),
 * `gap: 1` for the missing plant itself (the cut stake and the mulch).
 * In the ending (cut 2b) the plants redden from the door to the back, a
 * plant every 0.1 s after the film is rolled up.
 */
registerProp('prop_h_tomato', (opts) => {
  const i = Number(opts.i ?? 0);
  const n = Number(opts.n ?? 13);
  const seed = Number(opts.seed ?? 0) * 31 + i * 7;
  const hasNorth = i > 0 && opts.north !== 0;
  const gap = opts.gap === 1;
  const make = (ripe: boolean, northRipe: boolean) => {
    const p = new PixelCanvas(PW, PTOP + 16);
    const a = plantAt(seed, i);
    if (gap) {
      // the missing plant: only its cut stake and a little mulch
      p.vline(a.cx, a.foot - 8, a.foot, P.woodLt);
      p.set(a.cx, a.foot - 8, P.brassOld);
      p.set(a.cx - 1, a.foot - 1, P.leafShade);
      p.set(a.cx + 1, a.foot - 2, P.leafShade);
      p.set(a.cx + 2, a.foot, P.charcoal);
      return p.toCanvas();
    }
    plantLeaves(p, a);
    // the northern neighbour's trusses, over this plant's leaves
    if (hasNorth) {
      const north = plantAt(seed - 7, i - 1, -16);
      plantFruit(p, north, i - 1, northRipe);
    }
    plantFoot(p, a);
    plantFruit(p, a, i, ripe);
    outline(p, { bottom: false, soft: true });
    return p.toCanvas();
  };
  const imgs: (HTMLCanvasElement | null)[] = [null, null, null];
  const pick = (k: number) => (imgs[k] ??= make(k >= 1, k >= 2));
  const ripenAt = (j: number) => RIPEN_AT + (n - 1 - j) * 100;
  const a: PropArt = {
    ox: -2,
    oy: -PTOP,
    w: PW,
    h: PTOP + 16,
    foot: 15,
    img: (env: PropEnv) => {
      const e = houseDawnMs(env);
      if (e < 0) return pick(0);
      // fx_h_tomato_ripen: this plant, then (0.1 s later) the one north of it
      return pick(e >= ripenAt(i - 1) ? 2 : e >= ripenAt(i) ? 1 : 0);
    },
  };
  return a;
});

/**
 * The はなまるトマト on plant (5,2), the 5th truss (12px over the tile's
 * foot), on the plant's aisle side: drawn after the two plants south of it
 * (their leaves would hide it: 1.5 tiles tall each) so it shows from the
 * middle aisle all the way; glowing until picked.
 */
registerProp('prop_h_hanamaru', () => {
  const fruit = new PixelCanvas(12, 12);
  // its stalk from the plant's stem, curving down to the calyx
  fruit.line(11, 1, 8, 2, P.leafShade);
  fruit.line(8, 2, 6, 3, P.leafShade);
  fruit.ellipse(4.5, 7, 3.5, 3.5, P.red);
  fruit.ellipse(4, 6.5, 2, 2, P.vermLt);
  fruit.set(3, 5, P.glint);
  fruit.set(4, 5, P.glint);
  fruit.set(6, 9, P.vermShade);
  fruit.set(7, 8, P.vermShade);
  fruit.set(5, 10, P.vermShade);
  // the star of the calyx
  fruit.hline(3, 6, 4, P.leafDeep);
  fruit.set(4, 3, P.leafYoung);
  fruit.set(2, 4, P.leafShade);
  fruit.set(7, 4, P.leafShade);
  outline(fruit, { bottom: true, soft: true });
  const imgF = fruit.toCanvas();
  const bough = new PixelCanvas(12, 12);
  // after: the empty branch pointing up
  bough.line(11, 3, 7, 1, P.leafShade);
  bough.line(7, 1, 5, 0, P.leafDeep);
  bough.set(4, 0, P.leafYoung);
  const imgB = bough.toCanvas();
  const picked = (env: PropEnv) => env.flag('flag_ch2_got_tomato') || env.flag('flag_ch2_tomato_picked');
  const a: PropArt = {
    // the fruit's centre at (85,36) in the room (the events' TOMATO_PX, the light's centre)
    ox: 1,
    oy: -3,
    w: 12,
    h: 12,
    // after the plants (5,3) and (5,4) (their feet at 47 from here): 48
    foot: 48,
    img: (env: PropEnv) => (picked(env) ? imgB : imgF),
    glow(g, x, y, env) {
      if (picked(env)) return;
      // 0.8 Hz: the fruit's own light, a soft halo and the hot core
      const br = 0.85 + 0.15 * Math.sin(env.t * 0.0008 * Math.PI * 2);
      glowDot(g, x + 4, y + 7, '#FFE7A3', '242,137,75', 14, 0.95 * br);
      g.rect(x + 2, y + 5, 5, 5, '#F2894B', 0.5 * br);
      g.rect(x + 3, y + 5, 2, 2, '#FFE7A3', 0.85 * br);
    },
  };
  return a;
});

/** The bumblebee hive (2,2): a cardboard box on a stand at the end of the west aisle. */
registerProp('prop_h_subako', () =>
  standProp(
    16,
    16,
    (p) => {
      p.vline(3, 10, 15, P.woodDark);
      p.vline(12, 10, 15, P.woodDark);
      p.rect(1, 8, 14, 3, P.woodLt);
      p.hline(1, 14, 8, P.goldPale);
      p.rect(2, 1, 12, 8, P.woodLt);
      p.hline(2, 13, 1, P.paperGrid);
      p.vline(13, 2, 8, P.brassOld);
      p.rect(6, 5, 3, 2, P.ink); // the little door
      p.hline(3, 11, 3, P.gold); // the maker's band (no name)
      p.set(4, 3, P.ink);
    },
    { cx: 8, base: 16, shadow: 0 },
  ),
);

/** The blue bucket heaped with pruned side shoots (1,15). */
registerProp('prop_h_wakime_bucket', () =>
  standProp(
    16,
    16,
    (p) => {
      p.rect(3, 6, 10, 9, P.blue);
      p.vline(3, 6, 14, P.aqua);
      p.vline(12, 7, 14, P.navy);
      p.hline(2, 13, 6, P.aqua);
      for (let k = 0; k < 14; k++) {
        const x = 3 + (ihash(k, 1, 4041) % 10);
        const y = 1 + (ihash(k, 2, 4043) % 6);
        p.set(x, y, k % 3 ? P.leaf : P.leafYoung);
        p.set(x + 1, y + 1, P.leafDeep);
      }
    },
    { cx: 8, base: 16, shadow: 0 },
  ),
);

/** The little shelf by the door (7,16): the work diary, a pencil, a pair of work gloves. */
registerProp('prop_h_house_shelf', () =>
  standProp(
    16,
    22,
    (p) => {
      for (const sx of [2, 13]) p.vline(sx, 4, 21, P.wood);
      for (const sy of [4, 12, 20]) {
        p.hline(1, 14, sy, P.woodLt);
        p.hline(1, 14, sy + 1, P.woodDark);
      }
      p.rect(4, 8, 7, 4, P.navy); // the diary
      p.hline(4, 10, 8, P.blue);
      p.set(10, 11, P.white);
      p.line(5, 7, 9, 7, P.brass); // the pencil
      p.rect(4, 16, 3, 4, P.white); // gloves
      p.rect(8, 16, 3, 4, P.concreteLt);
    },
    { cx: 8, base: 16, shadow: 0 },
  ),
);

void dk;
void lt;
void valueNoise;
void nightK;
void HLIGHT;
