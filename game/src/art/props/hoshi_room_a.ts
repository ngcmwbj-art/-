// Chapter-2 rooms, part 1 (52_ch2_level_art 4.1・4.2): the unlit one-man
// train and ミツばあ's greenhouse No.3.
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
    over(g, x, y, env) {
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
 * One plant (16px wide, rising 24px above its tile): the lower 6px bare
 * stem (the lower leaves pruned), the bamboo stake up to half its height, a
 * string from the overhead wire the vine winds up, the leaf mass, and the
 * green trusses at 10px and 18px above the tile's foot (the lower trusses
 * already harvested). `ripe` paints the fruit red (the morning, 4.2).
 */
function plant(p: PixelCanvas, x0: number, foot: number, seed: number, ripe: boolean): void {
  const cx = x0 + 7 + (seed % 3) - 1;
  const top = foot - 38 - (seed % 5);
  // the string from the wire (the whole height), the stake (lower half)
  p.vline(cx + 1, top - 6, foot - 1, P.paperGrid);
  p.vline(cx - 2, foot - 18, foot - 1, P.woodLt);
  p.set(cx - 2, foot - 18, P.goldPale);
  // the stem, winding round the string
  for (let y = foot - 1; y > top; y--) p.set(cx + ((y >> 2) % 2), y, y > foot - 7 ? P.leafDeep : P.leaf);
  // the leaf mass (above the bare lower 6px): compound leaves, lit from the top-left
  for (let k = 0; k < 16; k++) {
    const h = ihash(k, seed, 4031);
    const ly = foot - 8 - (h % (foot - 8 - top));
    const lx = cx + ((h >>> 8) % 13) - 6;
    const side = lx < cx ? -1 : 1;
    const r = 2 + ((h >>> 12) % 2);
    for (let j = -r; j <= r; j++)
      for (let i = -r - 1; i <= r + 1; i++) {
        if (i * i * 0.6 + j * j > r * r) continue;
        const X = lx + i;
        const Y = ly + j;
        if (X < x0 - 3 || X > x0 + 18) continue;
        const lit = i * 0.5 + j;
        let c: string = lit < -1.5 ? P.leafYoung : lit < 0.5 ? P.leaf : lit < 2 ? P.leafDeep : P.leafShade;
        if (((X * 3 + Y * 5 + seed) & 7) === 0) c = P.leafShade; // the leaflets' gaps
        p.set(X, Y, c);
      }
    p.set(lx + side, ly, P.leafDeep); // the midrib
  }
  // the trusses: 3–4 fruit (3×3) at 10px and 18px above the foot
  for (const [ty, n] of [[foot - 10, 3 + (seed % 2)], [foot - 18, 3]] as const)
    for (let f = 0; f < n; f++) {
      const fx = cx - 4 + f * 3 + (ihash(f, seed + ty, 4033) % 2);
      const fy = ty - (f % 2);
      const body = ripe ? P.red : P.leafYoung;
      const shade = ripe ? P.vermShade : P.leaf;
      p.rect(fx, fy, 3, 3, body);
      p.set(fx, fy, ripe ? P.vermLt : P.leafLt);
      p.set(fx + 2, fy + 2, shade);
      p.set(fx + 1, fy - 1, P.leafDeep); // the calyx
    }
}

registerProp('prop_h_tomato_row', (opts) => {
  const n = Number(opts.n ?? 13);
  const gap = opts.gap === undefined ? -1 : Number(opts.gap);
  const seed = Number(opts.seed ?? 0);
  const W = 24;
  const top = 40;
  const H = n * 16 + top;
  const make = (ripe: boolean) => {
    const p = new PixelCanvas(W, H);
    for (let i = 0; i < n; i++) {
      if (i === gap) continue;
      plant(p, 4, top + (i + 1) * 16 - 2, seed * 31 + i * 7, ripe);
    }
    // the gap (a plant missing): only its cut stake and a little mulch
    if (gap >= 0) {
      const fy = top + (gap + 1) * 16 - 2;
      p.vline(10, fy - 8, fy, P.woodLt);
      p.set(9, fy - 1, P.leafShade);
    }
    outline(p, { bottom: false, soft: true });
    return p.toCanvas();
  };
  const green = make(false);
  let ripe: HTMLCanvasElement | null = null;
  const a: PropArt = {
    ox: -4,
    oy: -top,
    w: W,
    h: H,
    foot: n * 16,
    img: (env: PropEnv) => {
      if (hs(env) >= 3) return (ripe ??= make(true));
      return green;
    },
  };
  return a;
});

/** The はなまるトマト on plant (5,2), 5th truss (12px up from the tile's foot): glowing until picked. */
registerProp('prop_h_hanamaru', () => {
  const fruit = new PixelCanvas(8, 8);
  fruit.ellipse(3.5, 4, 3, 3, P.red);
  fruit.set(2, 2, P.vermLt);
  fruit.set(2, 3, P.glint);
  fruit.set(5, 5, P.vermShade);
  fruit.hline(2, 5, 1, P.leafDeep);
  fruit.set(3, 0, P.leafYoung);
  const imgF = fruit.toCanvas();
  const bough = new PixelCanvas(8, 8);
  // after: the empty branch pointing up
  bough.line(1, 7, 5, 1, P.leafDeep);
  bough.set(5, 0, P.leafYoung);
  const imgB = bough.toCanvas();
  const a: PropArt = {
    ox: 2,
    oy: 16 - 12 - 7,
    w: 8,
    h: 8,
    foot: 17,
    img: (env: PropEnv) => (env.flag('flag_ch2_got_tomato') || env.flag('flag_ch2_tomato_picked') ? imgB : imgF),
    glow(g, x, y, env) {
      if (env.flag('flag_ch2_got_tomato') || env.flag('flag_ch2_tomato_picked')) return;
      const br = 0.85 + 0.15 * Math.sin(env.t * 0.0008 * Math.PI * 2);
      glowDot(g, x + 5, y + 1, '#FFE7A3', '242,137,75', 12, 0.9 * br);
      g.rect(x + 3, y - 1, 5, 5, '#F2894B', 0.55 * br);
      g.rect(x + 4, y, 2, 2, '#FFE7A3', 0.8 * br);
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
