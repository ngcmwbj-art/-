// M4's 見せ場 (30_level_art 5.4 / 5.0): the view down over the 2F glass
// railing into the atrium — M1's hall one storey below, drawn in perspective
// at roughly 1/2–1/3 scale. The 1F floor recedes towards the slab (its tile
// seams closing up with distance, a lilac haze thickening towards the far
// wall and the sides), the terracotta square with the dry fountain and the
// bronze child holding up the bell (the bell catching the evening), the
// gacha corner's domes, the tanabata, the info counter and the floor guide,
// the mirror pillars rising from the floor and fading into the gloom, the
// shop fronts under the gallery, the corridor mouths to the food court and
// the health corner. A skylight shaft falls all the way down to the basin
// with dust in it; the glass of the railing reflects the skylights; a
// bell-faced balloon that escaped a year ago floats at railing height.
//
// Parallax: M4's camera never moves (the corridor fits the screen), so the
// depth is sold by the viewer instead — as Minato walks along the gallery
// the floor below slides with him, the far rows more than the near ones, and
// the pillars lean (their feet move, their tops stay under the slab).

import type { Gfx } from '../../engine/gfx';
import { PixelCanvas, mix } from '../../engine/pixel';
import { ihash, valueNoise } from '../tiles/noise';
import { P } from '../tiles/palette';
import { blend, dust, lightQuad, screenPool, tube } from './ishell';
import { shaftQuad } from './mall_kit';
import { mkFrames } from './pkit';
import type { PropEnv } from './types';

/** Vanishing axis: the middle of the gallery (map px). */
const CX = 176;
/** First and last rows of the atrium picture (map px; the railing's glass starts at 114). */
const TOP = 112;
const BOT = 188;
/** Side margin of the baked canvases (room for the parallax slide). */
const M = 16;
const SLAB = 128;
const WALL0 = 133;
const FLOOR0 = 142;
/** Perspective: screen y = Y_H + ZC·s, where s is the scale at that depth. */
const Y_H = 78;
const ZC = 177;
const S_B = (BOT - Y_H) / ZC;
const S_F = (FLOOR0 - Y_H) / ZC;
/** M1 floor rows seen at the near (bottom) and far (top) edges. */
const V_NEAR = 232;
const V_FAR = 48;
const C = (V_NEAR - V_FAR) / (1 / S_F - 1 / S_B);
const WELL_L = 16;
const WELL_R = 336;

const sAt = (y: number) => (y + 0.5 - Y_H) / ZC;
const vAt = (s: number) => V_NEAR - (1 / s - 1 / S_B) * C;
const sOfV = (v: number) => 1 / (1 / S_B + (V_NEAR - v) / C);
/** M1 ground point (u, v) → map px (x, y) and its scale. */
function proj(u: number, v: number): [number, number, number] {
  const s = sOfV(v);
  return [CX + (u - CX) * s, Y_H + ZC * s, s];
}

/** Parallax slide (px) of a row at scale s for the player at world x px. */
function slide(px: number, s: number): number {
  return Math.round((px - CX) * 0.075 * (1 - s));
}
/** Scale of the row y for the slide (above the floor: the far wall's). */
function rowS(y: number): number {
  return y < FLOOR0 ? S_F : sAt(y);
}

const HAZE = mix(P.shade, P.nightShade, 0.35);
const lighten = (c: string) => mix(c, P.white, 0.3);
const darken = (c: string) => mix(c, P.ink, 0.35);
const smooth = (a: number, b: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
/** Lilac haze: thicker with distance and towards the sides of the well. */
function hazeAt(x: number, s: number): number {
  const far = (S_B - s) / (S_B - S_F);
  const side = smooth(70, 168, Math.abs(x - CX));
  return Math.min(0.88, 0.3 + far * 0.26 + side * 0.42);
}

// ---------------------------------------------------------------- baked layers

interface Atrium {
  /** Floor, far wall, fountain and everything standing far (slid per row). */
  base: PixelCanvas;
  /** Things nearer than the near pillars (the info counter). */
  near: PixelCanvas;
  /** Slab edge + railing, never slid (rows 110..WALL0). */
  rail: PixelCanvas;
  /** One strip per pillar (baked cladding, top = WALL0 - 2). */
  pillars: { img: HTMLCanvasElement; x: number; foot: number; s: number; far: boolean }[];
  balloon: HTMLCanvasElement[];
}

let cache: Atrium | null = null;

/** The mirror pillars (M1 (3,5) (18,5) (3,11) (18,11)): foot in M1 px, width. */
const PILLARS: [number, number][] = [
  [56, 96],
  [296, 96],
  [56, 192],
  [296, 192],
];

/** M1 gacha machines (u of the left edge, v of the foot, colour). */
const GACHA: [number, number, string][] = [
  [257, 54, P.red], [273, 54, P.blue], [305, 54, P.leafDeep], [321, 54, P.sun],
  [257, 78, P.crimson], [273, 78, P.navy], [305, 78, P.gold], [321, 78, P.aqua],
];

function build(): Atrium {
  const W = 352 + M * 2;
  const H = BOT - TOP;
  const base = new PixelCanvas(W, H);
  const near = new PixelCanvas(W, H);
  const set = (p: PixelCanvas, x: number, y: number, c: string) => p.set(Math.round(x) + M, Math.round(y) - TOP, c);
  const get = (p: PixelCanvas, x: number, y: number) => p.get(Math.round(x) + M, Math.round(y) - TOP);
  /** Paint a colour hazed for its position (x, y map px, s depth). */
  const hz = (c: string, x: number, s: number, k = 1) => mix(c, HAZE, hazeAt(x, s) * k);
  const put = (p: PixelCanvas, x: number, y: number, c: string, s: number, k = 1) => set(p, x, y, hz(c, x, s, k));

  // ---- behind the glass: the dark air of the well, lighter towards the slab
  for (let y = TOP; y < SLAB; y++)
    for (let x = -M; x < 352 + M; x++) {
      const k = (y - TOP) / (SLAB - TOP);
      set(base, x, y, k < 0.35 ? P.night : k < 0.75 ? mix(P.night, P.ink, 0.5) : P.ink);
    }

  // ---- the far wall: the 1F shop fronts under the gallery (rows 133–141)
  const s0 = S_F;
  type Unit = { u0: number; u1: number; kind: string; c?: string };
  const units: Unit[] = [
    { u0: -340, u1: -190, kind: 'corridorW' },
    { u0: -190, u1: -80, kind: 'shutter', c: P.woodLt },
    { u0: -80, u1: 14, kind: 'vacant' },
    { u0: 18, u1: 78, kind: 'shutter', c: P.navy },
    { u0: 82, u1: 142, kind: 'cafe', c: P.woodDark },
    { u0: 146, u1: 206, kind: 'lift' },
    { u0: 210, u1: 254, kind: 'shutter', c: P.white },
    { u0: 258, u1: 334, kind: 'gacha', c: P.gold },
    { u0: 338, u1: 440, kind: 'shutter', c: P.maroon },
    { u0: 440, u1: 540, kind: 'vend' },
    { u0: 540, u1: 720, kind: 'corridorE' },
  ];
  for (let x = -M; x < 352 + M; x++) {
    const u = CX + (x + 0.5 - CX) / s0;
    const un = units.find((q) => u >= q.u0 && u < q.u1);
    for (let y = WALL0; y < FLOOR0; y++) {
      const r = y - WALL0;
      let c: string = mix(P.paperGrid, P.woodLt, 0.3);
      if (r === 0) c = P.ink; // the slab's underside
      else if (r === 8) c = P.charcoal; // skirting
      else if (!un) c = r <= 3 ? P.paperGrid : P.woodLt;
      else {
        const edge = u - un.u0 < 3 / s0 || un.u1 - u < 3 / s0;
        switch (un.kind) {
          case 'corridorW':
          case 'corridorE': {
            // an opening: the corridor floor running on into the shadow
            if (r <= 1) c = P.paperGrid;
            else c = r >= 6 ? mix(P.shade, P.woodLt, 0.35) : P.nightShade;
            break;
          }
          case 'vacant':
            // an empty unit: dark glass, a 『テナント募集』 sheet taped inside
            c = r <= 2 ? P.concrete : P.charcoal;
            if (r >= 4 && r <= 6 && Math.abs(u - (-34)) < 12) c = P.white;
            if (r === 3) c = P.asphalt;
            break;
          case 'cafe':
            c = r <= 2 ? un.c! : r <= 4 ? P.concrete : P.ink;
            if (r === 1 && Math.abs(u - 100) < 14) c = P.goldPale;
            break;
          case 'lift':
            c = r <= 1 ? P.concreteLt : Math.abs(u - 176) < 16 ? (Math.abs(u - 176) < 2 ? P.asphalt : P.steel) : P.concreteLt;
            break;
          case 'gacha':
            c = r <= 2 ? P.gold : (r & 1) ? P.concrete : P.steel;
            if (r === 1) {
              const k = Math.floor((u - 262) / 11);
              if (k >= 0 && k < 6 && Math.abs(u - (266 + k * 11)) < 3) c = [P.red, P.blue, P.leaf, P.crimson, P.sun, P.aqua][k];
            }
            break;
          case 'vend':
            c = r <= 1 ? P.paperGrid : P.charcoal;
            if (r >= 2 && r <= 6 && (Math.abs(u - 470) < 10 || Math.abs(u - 505) < 10)) c = r === 2 ? P.white : r <= 4 ? P.aqua : P.steel;
            break;
          default: // shutter under a fascia
            c = r <= 2 ? un.c! : (r & 1) ? P.concrete : P.steel;
            if (r === 3) c = P.concreteLt;
        }
        if (edge && r > 0 && r < 8) c = P.steel;
      }
      put(base, x, y, c, s0, un?.kind.startsWith('corridor') && r > 1 ? 0.6 : 1);
    }
  }

  // ---- the floor (rows 142–187): perspective tiles
  const fountainU = 176;
  const fountainV = 128;
  for (let y = FLOOR0; y < BOT; y++) {
    const s = sAt(y);
    const v = vAt(s);
    const vN = vAt(sAt(y + 1));
    const seamRow = Math.floor(v / 16) !== Math.floor(vN / 16);
    // seams fade out with distance (no screen door at the far rows)
    const seamK = 0.22 + smooth(S_F, S_B, s) * 0.55;
    for (let x = -M; x < 352 + M; x++) {
      const u = CX + (x + 0.5 - CX) / s;
      const uN = CX + (x + 1.5 - CX) / s;
      const tu = Math.floor(u / 16);
      const tv = Math.floor(v / 16);
      const seamCol = Math.floor(u / 16) !== Math.floor(uN / 16);
      const hh = ihash(tu, tv, 881);
      const terra = tu >= 7 && tu <= 14 && tv >= 5 && tv <= 10;
      let c: string;
      if (terra) c = (tu + tv) % 2 ? P.skin4 : P.woodLt;
      else {
        // two tones laid in irregular runs, yellowed wax in soft patches
        const tone = (ihash(tu >> 1, tv, 883) + (hh % 5 === 0 ? 1 : 0)) % 2;
        c = tone ? P.concrete : P.concreteLt;
        if (!tone && valueNoise(u / 60, v / 50, 885) > 0.66) c = P.paperGrid;
        // the worn lanes: entrance → fountain, and across to the corridors
        const lane = Math.max(1 - Math.abs(u - 176) / 40, 1 - Math.abs(v - 128) / 22) * (v > 60 ? 1 : 0);
        if (lane > 0.3 && ihash(x, y, 887) % 5 === 0) c = mix(c, P.white, 0.5);
      }
      if (seamRow || seamCol) c = mix(c, terra ? P.wood : P.steel, seamK);
      // dirt specks, more along the far wall
      if (ihash(x, y, 889) % (s < 0.42 ? 37 : 71) === 0) c = mix(c, P.asphalt, 0.5);
      // the evening from the skylight spreading warm round the fountain
      const du = (u - fountainU) / 150;
      const dv = (v - fountainV - 6) / 70;
      const warm = Math.max(0, 1 - Math.sqrt(du * du + dv * dv));
      if (warm > 0) c = mix(c, P.sky, warm * 0.35);
      // contact shadow along the far wall
      if (y <= FLOOR0 + 1) c = mix(c, P.nightShade, y === FLOOR0 ? 0.55 : 0.3);
      put(base, x, y, c, s, 1 - warm * 0.45);
    }
  }

  // ---- things on the far floor, far to near
  // corridor mouths: a hanging sign each (fork & bowl west, the heart-rate line east), faint
  for (const [u, col] of [[-245, P.sky], [590, P.aqua]] as const) {
    const [x] = proj(u, V_FAR);
    for (let i = -3; i <= 3; i++) put(base, x + i, WALL0 + 2, P.navy, s0, 0.5);
    for (let i = -2; i <= 2; i++) put(base, x + i, WALL0 + 3, i === 0 ? col : P.white, s0, 0.5);
  }
  // planters (dusty fake plants) and benches beyond the hall
  const planter = (u: number, v: number) => {
    // a square planter (cream, lit left) with a dusty fake palm
    const [x0, y0, s] = proj(u, v);
    const x = Math.round(x0);
    const y = Math.round(y0);
    for (let j = 1; j <= 3; j++)
      for (let i = -3; i <= 3; i++) put(base, x + i, y - j, i === 3 ? P.steel : i === -3 ? P.white : j === 3 ? P.concrete : P.concreteLt, s);
    put(base, x - 3, y, P.nightShade, s);
    for (let i = -2; i <= 3; i++) put(base, x + i, y, P.nightShade, s, 0.6);
    const leaves: [number, number, string][] = [
      [0, 4, P.leafShade], [0, 5, P.leaf], [-1, 6, P.leaf], [1, 6, P.leaf], [0, 7, P.leafYoung],
      [-2, 5, P.leaf], [-3, 6, P.leafYoung], [2, 5, P.leafShade], [3, 6, P.leaf], [-1, 8, P.leafYoung], [1, 8, P.leaf], [-2, 7, P.leafShade], [2, 7, P.leafYoung],
    ];
    for (const [dx, dy, c] of leaves) put(base, x + dx, y - dy, c, s, 0.7);
  };
  const bench = (u: number, v: number, c: string) => {
    // a padded bench seen from the front: backrest, seat, two steel legs, its shadow
    const [x0, y0, s] = proj(u, v);
    const w = Math.round(34 * s);
    const x = Math.round(x0 - w / 2);
    const y = Math.round(y0);
    for (let i = 0; i < w; i++) {
      put(base, x + i, y - 6, i === 0 ? lighten(c) : c, s);
      put(base, x + i, y - 5, darken(c), s);
      put(base, x + i, y - 4, lighten(c), s);
      put(base, x + i, y - 3, c, s);
      put(base, x + i, y, P.nightShade, s, 0.5);
    }
    for (const lx of [1, w - 2]) {
      put(base, x + lx, y - 2, P.steel, s);
      put(base, x + lx, y - 1, P.asphalt, s);
    }
  };
  const ride = (u: number, v: number) => {
    // the 100-yen kiddie ride: a little yellow car under a striped canopy
    const [x0, y0, s] = proj(u, v);
    const x = Math.round(x0);
    const y = Math.round(y0);
    for (let i = -4; i <= 4; i++) {
      put(base, x + i, y - 3, i < -2 ? P.goldPale : P.gold, s, 0.5);
      put(base, x + i, y - 2, P.brass, s, 0.5);
    }
    put(base, x - 3, y - 4, P.gold, s, 0.5);
    put(base, x - 2, y - 4, P.aqua, s, 0.5);
    put(base, x - 3, y - 1, P.ink, s, 0.5);
    put(base, x + 3, y - 1, P.ink, s, 0.5);
    for (let j = 5; j <= 9; j++) put(base, x + 2, y - j, P.steel, s, 0.5);
    for (let i = -3; i <= 5; i++) put(base, x + i, y - 10, i % 2 ? P.white : P.red, s, 0.45);
    for (let i = -2; i <= 4; i++) put(base, x + i, y - 11, i % 2 ? P.red : P.white, s, 0.45);
    put(base, x + 5, y - 3, P.verm, s, 0.5);
    for (let i = -4; i <= 5; i++) put(base, x + i, y, P.nightShade, s, 0.6);
  };
  const stroller = (u: number, v: number) => {
    // a stroller someone left: navy hood, the frame, a handle, small wheels
    const [x0, y0, s] = proj(u, v);
    const x = Math.round(x0);
    const y = Math.round(y0);
    for (const [dx, dy, c] of [
      [-2, 6, P.navy], [-1, 7, P.navy], [0, 7, P.blue], [1, 6, P.navy], [-2, 5, P.navy], [-1, 5, P.blue], [0, 5, P.aqua],
      [-2, 4, P.navy], [-1, 4, P.navy], [0, 4, P.navy], [1, 4, P.navy], [2, 4, P.navy], [1, 5, P.shadeDeep],
      [2, 5, P.steel], [3, 6, P.steel], [4, 7, P.charcoal], [-2, 2, P.steel], [2, 2, P.steel], [-2, 1, P.ink], [2, 1, P.ink],
    ] as const)
      put(base, x + dx, y - dy, c, s, 0.5);
    for (let i = -2; i <= 3; i++) put(base, x + i, y, P.nightShade, s, 0.6);
  };
  planter(-40, 70);
  planter(400, 86);
  bench(-120, 150, P.crimson);
  bench(470, 168, P.blue);
  planter(-70, 196);
  ride(-10, 214);
  stroller(372, 206);

  // the gacha corner: eight little machines, domes over coloured bodies
  for (const [u, v, col] of GACHA) {
    const [x0, y, s] = proj(u + 2, v);
    const x = Math.round(x0);
    const fy = Math.round(y);
    for (let i = 0; i < 5; i++) {
      put(base, x + i, fy - 1, mix(col, P.ink, 0.35), s, 0.4);
      put(base, x + i, fy - 2, col, s, 0.35);
      put(base, x + i, fy - 3, mix(col, P.white, 0.3), s, 0.35);
    }
    set(base, x + 1, fy - 2, hz(P.white, x, s, 0.5));
    // the dome: clear glass, two capsules showing, the 1px glint
    for (let i = 0; i < 5; i++) put(base, x + i, fy - 4, '#C9D6E0', s, 0.35);
    for (let i = 1; i < 4; i++) put(base, x + i, fy - 5, '#C9D6E0', s, 0.35);
    put(base, x + 1, fy - 4, [P.red, P.gold, P.leafYoung, P.crimson][(u >> 4) % 4], s, 0.3);
    put(base, x + 3, fy - 4, [P.blue, P.sun, P.crimson, P.gold][(v >> 3) % 4], s, 0.3);
    set(base, x + 1, fy - 5, P.white);
    put(base, x + 2, fy - 6, col, s, 0.4);
  }

  // the tanabata bamboo by the west pillar
  {
    const [x0, y0, s] = proj(40, 96);
    const x = Math.round(x0);
    const y = Math.round(y0);
    for (let j = 1; j <= 17; j++) put(base, x, y - j, j < 3 ? P.woodDark : P.leaf, s, 0.6);
    for (const [dx, dy] of [[-2, 15], [-1, 16], [1, 14], [2, 13], [-2, 10], [2, 9], [-1, 7], [3, 11]] as const) put(base, x + dx, y - dy, P.leafDeep, s, 0.6);
    for (const [dx, dy, c] of [[-2, 12, P.peach], [2, 11, P.paper], [-1, 8, P.aqua], [2, 6, P.goldPale], [-2, 5, P.leafYoung]] as const) {
      put(base, x + dx, y - dy, c, s, 0.45);
      put(base, x + dx, y - dy + 1, c, s, 0.55);
    }
    put(base, x - 1, y - 1, P.woodDark, s);
    put(base, x + 1, y - 1, P.woodDark, s);
  }

  // the fountain on its terracotta square: stone basin, dry bottom, the statue
  {
    const [bx, by, s] = proj(fountainU, fountainV);
    const rx = 46 * s;
    const ry = (proj(fountainU, 160)[1] - proj(fountainU, 96)[1]) / 2;
    const cy = by;
    const inE = (x: number, y: number, a: number, b: number) => ((x - bx) / a) ** 2 + ((y - cy) / b) ** 2 <= 1;
    for (let y = Math.floor(cy - ry - 1); y <= Math.ceil(cy + ry + 3); y++)
      for (let x = Math.floor(bx - rx - 1); x <= Math.ceil(bx + rx + 1); x++) {
        const xx = x + 0.5;
        const yy = y + 0.5;
        let c: string | null = null;
        if (inE(xx, yy - 2, rx, ry) && !inE(xx, yy, rx, ry) && yy > cy) c = xx > bx + rx * 0.35 ? P.asphalt : P.steel; // the basin's outer side
        if (inE(xx, yy, rx, ry)) {
          c = P.concrete;
          if (inE(xx, yy, rx - 1.5, ry - 1)) c = yy < cy - ry + 2.5 ? P.concreteLt : P.steel;
          if (inE(xx, yy - 0.8, rx - 3, ry - 2)) c = P.concrete;
          // top rim lit
          if (!inE(xx, yy - 1, rx, ry)) c = P.white;
        }
        if (c) put(base, x, y, c, s, 0.55);
      }
    // dead leaves (brown, never at the centre) and a crack across the dry bottom
    for (let k = 0; k < 9; k++) {
      const hh = ihash(k, 5, 893);
      const a = ((hh % 360) / 360) * Math.PI * 2;
      const r = 0.55 + ((hh >>> 9) % 40) / 100;
      put(base, bx + Math.cos(a) * (rx - 4) * r, cy + 1 + Math.sin(a) * (ry - 2) * r, '#7A5A3A', s, 0.4);
    }
    put(base, bx - 9, cy + 2, P.asphalt, s, 0.5);
    put(base, bx - 8, cy + 3, P.asphalt, s, 0.5);
    put(base, bx - 7, cy + 3, P.asphalt, s, 0.5);
    // pedestal
    const px = Math.round(bx);
    const py = Math.round(cy);
    for (let j = 0; j < 3; j++)
      for (let i = -2; i <= 2; i++) put(base, px + i, py - j, i === -2 ? P.white : i === 2 ? P.steel : P.concreteLt, s, 0.4);
    // the child (dark weathered bronze, lit warm on the left by the shaft), arms up in a V, the bell
    const BR = '#5A3A28';
    const BD = '#3E2619';
    const BL = '#8A5A3A';
    const fig: [number, number, string][] = [
      // legs
      [-1, 3, BD], [1, 3, BD], [-1, 4, BR], [1, 4, BD],
      // smock
      [-2, 5, BL], [-1, 5, BR], [0, 5, BR], [1, 5, BR], [2, 5, BD],
      [-1, 6, BL], [0, 6, BR], [1, 6, BD],
      [-1, 7, BL], [0, 7, BR], [1, 7, BD],
      // head
      [-1, 8, BL], [0, 8, BR], [1, 8, BD], [0, 9, BR], [-1, 9, BL],
      // arms
      [-2, 8, BL], [-3, 9, BL], [-3, 10, BL], [2, 8, BD], [3, 9, BD], [3, 10, BD],
      // verdigris in the folds
      [0, 4, '#4F8A7A'], [1, 6, '#4F8A7A'],
    ];
    for (const [dx, dy, c] of fig) set(base, px + dx, py - dy, c);
    // the bell, rubbed bright
    for (const [dx, dy, c] of [
      [-2, 11, P.brass], [-1, 11, P.gold], [0, 11, P.gold], [1, 11, P.brass], [2, 11, P.brassOld],
      [-1, 12, P.goldPale], [0, 12, P.gold], [1, 12, P.brass], [0, 13, P.brassOld],
    ] as const)
      set(base, px + dx, py - dy, c);
    // the 10-yen coin at the bottom (a copper dot)
    set(base, px - 6, py + 2, '#B06A3A');
  }

  // the floor guide board on its posts
  {
    const [x0, y0, s] = proj(216, 190);
    const x = Math.round(x0) - 4;
    const y = Math.round(y0);
    for (let j = 1; j <= 4; j++) {
      put(base, x + 1, y - j, P.asphalt, s, 0.5);
      put(base, x + 7, y - j, P.charcoal, s, 0.5);
    }
    for (let j = 5; j <= 11; j++)
      for (let i = 0; i < 9; i++) {
        let c: string = j === 11 ? P.navy : P.white;
        if (j >= 6 && j <= 9 && i >= 4 && i <= 7) c = [P.peach, P.leafYoung, P.gold, P.aqua][(j - 6)];
        if (i === 0 || i === 8) c = P.steel;
        put(base, x + i, y - j, c, s, 0.45);
      }
    put(base, x + 2, y - 7, P.gold, s, 0.3);
    put(base, x + 2, y - 8, P.gold, s, 0.3);
  }

  // litter on the 1F floor: a capsule, the white bag in the door's draft, a paper cup
  for (const [u, v, c1, c2] of [
    [238, 118, P.crimson, P.white],
    [212, 214, P.white, P.concreteLt],
    [84, 150, P.aqua, P.white],
    [150, 204, P.white, P.steel],
    [322, 176, P.gold, P.white],
  ] as const) {
    const [x, y, s] = proj(u, v);
    put(base, x, y, c1, s, 0.4);
    put(base, x + 1, y, c2, s, 0.4);
  }
  // the entrance mat (navy, the bell logo worn off)
  {
    const [xl, y0, s] = proj(156, 210);
    const [xr] = proj(196, 210);
    for (let y = Math.round(y0); y < BOT; y++)
      for (let x = Math.round(xl); x <= Math.round(xr); x++) {
        const edge = x === Math.round(xl) || x === Math.round(xr) || y === Math.round(y0);
        put(base, x, y, edge ? P.nightShade : P.navy, s, 0.45);
      }
  }

  // ---- near layer: the info counter (in front of the near pillars)
  {
    const [xl, yb, s] = proj(64, 212);
    const [xr] = proj(128, 212);
    const [, yt] = proj(64, 196);
    const x0 = Math.round(xl);
    const x1 = Math.round(xr);
    const top = Math.round(yt);
    const bot = Math.round(yb);
    for (let x = x0; x <= x1; x++) {
      const e = x === x0 ? 1 : x === x1 ? 2 : 0;
      // the counter top (2 rows: lit edge, surface), a dark lip, the face with the blue band
      put(near, x, top - 6, e ? P.concrete : P.concreteLt, s, 0.55);
      put(near, x, top - 5, e ? P.steel : P.concrete, s, 0.55);
      put(near, x, top - 4, P.asphalt, s, 0.5);
      for (let y = top - 3; y <= bot; y++) {
        const r = y - (top - 3);
        let c: string = r === 1 ? P.blue : r === 2 ? P.navy : P.concrete;
        if (e === 2) c = P.steel;
        put(near, x, y, c, s, 0.55);
      }
    }
    // flyers, the call bell, the pen on its chain; the old poster on the front
    put(near, x0 + 23, top - 6, P.white, s, 0.4);
    put(near, x0 + 24, top - 6, P.white, s, 0.4);
    put(near, x0 + 24, top - 7, P.paper, s, 0.4);
    put(near, x0 + 6, top - 6, P.brass, s, 0.35);
    put(near, x0 + 7, top - 6, P.brassOld, s, 0.35);
    put(near, x0 + 6, top - 7, P.goldPale, s, 0.35);
    for (let i = 0; i < 6; i++) put(near, x0 + 15 + i, top, i < 2 ? P.sun : P.paper, s, 0.5);
    // the INFO board on its pole
    const ix = Math.round((x0 + x1) / 2);
    put(near, ix, top - 7, P.steel, s, 0.5);
    put(near, ix, top - 8, P.steel, s, 0.5);
    for (let i = -4; i <= 4; i++) {
      put(near, ix + i, top - 12, P.aqua, s, 0.45);
      put(near, ix + i, top - 11, P.blue, s, 0.45);
      put(near, ix + i, top - 10, Math.abs(i) <= 3 && i !== 0 ? P.white : P.blue, s, 0.45);
      put(near, ix + i, top - 9, P.navy, s, 0.45);
    }
  }

  // ---- the railing overlay: gallery lip, top rail, glass, posts, the slab's front
  const rail = new PixelCanvas(352, FLOOR0 - 110);
  const R = (x: number, y: number, c: string) => rail.set(x, y - 110, c);
  for (let x = 16; x < 336; x++) {
    R(x, 110, P.concrete);
    R(x, 111, P.steel);
    R(x, 112, P.concreteLt);
    R(x, 113, P.steel);
    // glass: a pale tint over what is behind it (the air of the well shows through)
    for (let y = 114; y < 127; y++) R(x, y, y === 114 ? '#E8E4D855' : '#9AA0A83A');
    R(x, 127, P.asphalt);
    // the slab's front: lit edge, cream facing, a brass trim line, the shadow under it
    const face = mix(P.paperGrid, P.shade, 0.3);
    R(x, 128, P.concrete);
    R(x, 129, face);
    R(x, 130, (x & 31) === 0 ? mix(P.woodLt, P.shade, 0.3) : face);
    R(x, 131, mix(P.brassOld, P.shade, 0.25));
    R(x, 132, P.nightShade);
    if (x % 32 === 16) for (let y = 112; y < 127; y++) R(x, y, y === 112 ? P.white : y === 113 ? P.concreteLt : P.steel);
    if (x % 32 === 17) for (let y = 114; y < 127; y++) R(x, y, P.asphalt);
  }
  // a scrap of the sale banner still tied to the railing, hanging into the
  // well: we see its back (bare red cloth, the letters only a pale ghost of
  // dye soaked through), a fold, a torn bottom edge and a loose thread
  for (let i = 0; i < 19; i++) {
    const x = 58 + i;
    const hh = ihash(i, 3, 895);
    let len = 9 - (hh % 3 === 0 ? 1 : 0) - (hh % 7 === 0 ? 2 : 0);
    if (i > 13) len -= Math.round((i - 13) * 1.4);
    for (let j = 0; j < len; j++) {
      const fold = i === 6 || i === 13;
      R(x, 128 + j, j === 0 ? P.vermShade : fold || j === len - 1 ? P.vermShade : P.verm);
    }
    if (hh % 5 === 0 && len > 4) R(x, 128 + len + 1, P.vermShade);
  }
  // the cord round the rail posts' feet, knotted
  R(57, 127, P.charcoal);
  R(56, 126, P.charcoal);
  R(77, 127, P.charcoal);
  R(78, 126, P.charcoal);

  const balloon = mkFrames(3, 14, 40, (p, k) => {
    // the mascot's bell face on a sun-orange balloon; a long string down into the well
    p.ellipse(7, 6, 6, 5.5, P.sunDeep);
    p.ellipse(7, 6, 5.5, 5, P.sun);
    p.ellipse(6, 5, 4, 3.5, P.sky);
    p.rect(3, 2, 2, 2, P.horizon);
    p.set(5, 6, P.ink);
    p.set(9, 6, P.ink);
    p.hline(6, 8, 8, P.sunShade);
    p.hline(1, 13, 10, P.brassOld);
    p.set(7, 12, P.sunShade);
    const sw = [0, 1, -1][k];
    p.line(7, 13, 7 + sw, 24, P.concreteLt);
    p.line(7 + sw, 24, 7 - sw, 39, P.concrete);
  });
  // the mirror pillars: one strip each (cladding lit on the left, darker as it
  // rises into the gloom under the slab: three bands, no dither)
  const pillars = PILLARS.map(([u, v]) => {
    const [fx, fy, s] = proj(u, v);
    const w = Math.max(5, Math.round(16 * s));
    const foot = Math.round(fy);
    const top = WALL0 - 2;
    const p = new PixelCanvas(w, foot - top + 1);
    const side = smooth(70, 168, Math.abs(fx - CX));
    const cols = [P.concreteLt, P.concrete, P.white, P.concrete, P.concrete, P.steel, P.asphalt];
    for (let r = top; r <= foot; r++) {
      const up = r < top + 3 ? 0.75 : r < top + 6 ? 0.5 : r < top + 10 ? 0.25 : 0;
      const k = Math.min(0.9, 0.34 + side * 0.4 + up * 0.6);
      for (let i = 0; i < w; i++) {
        const ci = i === 0 ? 0 : i === w - 1 ? 6 : i === w - 2 ? 5 : i === 2 ? 2 : 1;
        let c: string = cols[ci];
        if (r >= foot - 1) c = r === foot ? P.charcoal : P.asphalt;
        // a sign plate on the near ones (the toilets / the fire extinguisher)
        if (v > 150 && r >= foot - 16 && r <= foot - 12 && i >= 1 && i <= w - 3) c = u < 176 ? P.red : P.white;
        p.set(i, r - top, mix(c, HAZE, k));
      }
    }
    return { img: p.toCanvas(), x: fx - w / 2, foot, s, far: v < 150 };
  });
  cache = { base, near, rail, pillars, balloon };
  return cache;
}

/**
 * Bake the atrium into the shell image (the view with no slide): the well
 * between the side walls, darkness beyond them, the railing on top.
 */
export function atriumStatic(p: PixelCanvas): void {
  const a = cache ?? build();
  for (let y = TOP; y < BOT; y++)
    for (let x = 0; x < 352; x++) {
      if (x < WELL_L || x >= WELL_R) {
        // the well's side walls: the section continuing down into the dark
        const edge = x === WELL_L - 4 || x === WELL_R + 3;
        const inWall = x >= WELL_L - 4 && x < WELL_R + 4;
        if (y >= SLAB) p.set(x, y, inWall ? (edge ? P.ink : P.nightShade) : P.night);
        continue;
      }
      const n = a.near.get(x + M, y - TOP);
      p.set(x, y, n >>> 24 ? n : a.base.get(x + M, y - TOP));
    }
  for (let y = 0; y < a.rail.h; y++)
    for (let x = 0; x < a.rail.w; x++) {
      const v = a.rail.get(x, y);
      const al = v >>> 24;
      if (!al) continue;
      if (al === 255) p.set(x, 110 + y, v);
      else blend(p, x, 110 + y, `#${[v & 255, (v >>> 8) & 255, (v >>> 16) & 255].map((c) => c.toString(16).padStart(2, '0')).join('')}`, al / 255);
    }
}

/** Draw a baked layer row by row with the parallax slide (x, y = screen px of the map origin). */
function drawSlid(g: Gfx, img: HTMLCanvasElement, x: number, y: number, px: number, y0: number, y1: number): void {
  const ctx = g.ctx;
  let r = y0;
  while (r < y1) {
    const d = slide(px, rowS(r));
    let r1 = r + 1;
    while (r1 < y1 && slide(px, rowS(r1)) === d) r1++;
    // clip to the well
    ctx.drawImage(img, WELL_L + M - d, r - TOP, WELL_R - WELL_L, r1 - r, Math.round(x + WELL_L), Math.round(y + r), WELL_R - WELL_L, r1 - r);
    r = r1;
  }
}

/** The mirror pillars: feet on the 1F floor (slid), tops fading into the gloom under the slab (still). */
function drawPillars(g: Gfx, a: Atrium, x: number, y: number, px: number, far: boolean): void {
  const ctx = g.ctx;
  const top = WALL0 - 2;
  for (const q of a.pillars) {
    if (q.far !== far) continue;
    const dFoot = slide(px, q.s);
    const n = q.foot - top + 1;
    let r = 0;
    while (r < n) {
      const off = Math.round((dFoot * r) / Math.max(1, n - 1));
      let r1 = r + 1;
      while (r1 < n && Math.round((dFoot * r1) / Math.max(1, n - 1)) === off) r1++;
      ctx.drawImage(q.img, 0, r, q.img.width, r1 - r, Math.round(x + q.x) + off, Math.round(y + top + r), q.img.width, r1 - r);
      r = r1;
    }
  }
}

/** over(): the atrium with the parallax slide, then the railing on top. */
export function atriumOver(g: Gfx, x: number, y: number, env: PropEnv): void {
  const a = cache ?? build();
  const px = env.px;
  drawSlid(g, a.base.toCanvas(), x, y, px, TOP, BOT);
  drawPillars(g, a, x, y, px, true);
  drawPillars(g, a, x, y, px, false);
  // the info counter stands in front of the near pillars
  drawSlid(g, a.near.toCanvas(), x, y, px, FLOOR0 + 16, BOT);
  g.ctx.drawImage(a.rail.toCanvas(), Math.round(x), Math.round(y + 110));
  // the escaped balloon at railing height (sways, bobs, drifts a little with the view)
  const k = [0, 1, 0, 2][Math.floor(env.mt / 650) % 4];
  const bob = Math.round(Math.sin(env.mt / 1300) * 1);
  const bx = 246 + Math.round((px - CX) * 0.01);
  g.ctx.drawImage(a.balloon[k], Math.round(x + bx), Math.round(y + 114 + bob));
}

/** glow(): the skylight falling to the bottom, the lit bell and domes, glass reflections. */
export function atriumGlow(g: Gfx, x: number, y: number, env: PropEnv): void {
  const ctx0 = g.ctx;
  ctx0.save();
  ctx0.beginPath();
  ctx0.rect(Math.round(x + WELL_L), Math.round(y + TOP), WELL_R - WELL_L, BOT - TOP);
  ctx0.clip();
  atriumGlowIn(g, x, y, env);
  ctx0.restore();
}

function atriumGlowIn(g: Gfx, x: number, y: number, env: PropEnv): void {
  const n = env.grade.night;
  const day = 1 - n;
  const px = env.px;
  const [bx, by, bs] = proj(176, 128);
  const d = slide(px, bs);
  const X = (mx: number, s: number) => Math.round(x + mx + slide(px, s));
  // the shaft: from high above the railing down onto the basin, hard-edged with a bright rim
  if (day > 0.01) {
    const shear = 0.55;
    const fx = x + bx + d - 11;
    const fy = y + by - 4;
    const rise = by - 4 - 112;
    shaftQuad(g, fx - rise * shear, fy - rise, 22, rise, shear, P.sun, 0.16 * day, P.horizon, 0.3 * day);
    lightQuad(g, fx - rise * shear + 5, fy - rise, 12, rise, shear, P.sky, 0.1 * day);
    dust(g, fx - rise * shear, fy - rise, 22, rise + 6, shear, 8, env.stage === 1 ? 0 : env.t, 6601, 0.8);
    // where it lands: the basin and the bell, the brightest spot of the well
    screenPool(g, x + bx + d, y + by, 24, 9, P.sky, 0.42 * day);
    screenPool(g, x + bx + d, y + by, 13, 5, P.horizon, 0.3 * day);
    const tw = (Math.sin(env.t / 600) + 1) / 2;
    g.rect(Math.round(x + bx + d - 1), Math.round(y + by - 12), 1, 1, P.glint, (0.55 + tw * 0.45) * day);
    g.rect(Math.round(x + bx + d - 2), Math.round(y + by - 11), 1, 1, P.horizon, 0.5 * day);
    // the child's left edge warmed by it
    g.rect(Math.round(x + bx + d - 2), Math.round(y + by - 7), 1, 3, '#F7C27A', 0.35 * day);
    // the 10-yen coin winks now and then
    const ck = Math.floor(env.t / 140) % 16;
    if (ck < 2) {
      const cx0 = Math.round(x + bx + d - 6);
      const cy0 = Math.round(y + by + 2);
      g.rect(cx0, cy0, 1, 1, P.glint, 0.9);
      if (ck === 1) {
        g.rect(cx0 - 1, cy0, 3, 1, P.horizon, 0.6);
        g.rect(cx0, cy0 - 1, 1, 3, P.horizon, 0.6);
      }
    }
  }
  // the gacha domes: one after another catches a glint, the lamps still on
  const gk = Math.floor(env.t / 380) % 11;
  GACHA.forEach(([u, v], i) => {
    const [gx, gy, s] = proj(u + 2, v);
    const xx = X(gx, s);
    const yy = Math.round(y + gy);
    g.rect(xx + 1, yy - 5, 1, 1, P.glint, i === gk ? 0.95 : 0.35);
    g.rect(xx, yy - 3, 5, 1, GACHA[i][2], 0.18);
  });
  // vending machines on the far wall and the corridors' light
  const [vx] = proj(488, V_FAR);
  screenPool(g, X(vx, S_F), y + WALL0 + 6, 16, 5, P.aqua, 0.28);
  for (const u of [470, 505]) {
    const [ux] = proj(u, V_FAR);
    g.rect(X(ux, S_F) - 3, y + WALL0 + 3, 7, 2, P.aqua, 0.35);
  }
  const [wx] = proj(-245, V_FAR);
  screenPool(g, X(wx, S_F), y + WALL0 + 7, 14, 5, P.sky, 0.3 * (0.6 + day * 0.4));
  const [ex] = proj(590, V_FAR);
  screenPool(g, X(ex, S_F), y + WALL0 + 7, 14, 5, P.aqua, 0.22);
  // the 1F ceiling's tubes under the gallery (one of them flickers)
  const on = tube(env.t, 6603);
  for (let k = 0; k < 7; k++) {
    const u = -200 + k * 130;
    const [tx] = proj(u, V_FAR);
    if (k === 4 && !on) continue;
    g.rect(X(tx, S_F) - 2, y + WALL0, 5, 1, '#F4E6A8', 0.32);
  }
  // the glass of the railing: the skylights reflected as slanted streaks
  if (day > 0.01) {
    const ctx = g.ctx;
    ctx.save();
    ctx.beginPath();
    ctx.rect(Math.round(x + 16), Math.round(y + 114), 320, 13);
    ctx.clip();
    for (const [x0, w] of [[104, 30], [138, 8], [286, 26], [316, 6]] as const) {
      lightQuad(g, x + x0, y + 114, w, 13, -0.9, P.sky, 0.16 * day);
      g.ctx.globalAlpha = 1;
    }
    for (const x0 of [112, 130, 294, 310]) {
      for (let j = 0; j < 13; j++) g.rect(Math.round(x + x0 - j * 0.9), Math.round(y + 114 + j), 1, 1, P.horizon, 0.4 * day);
    }
    ctx.restore();
  }
}

