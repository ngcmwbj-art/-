// M5 迷子センター: what lies round the room (QA round 2: the boss room was a
// 1× box floating in the middle of a flat dark screen, more than half of it
// empty, while every shop has its street round it — iexterior.ts). The room
// stays 1× (the boss intro's 2× close-up on the heap is staged for a 1×
// room: in a 2× room the story close-up is dropped), and the screen round it
// now shows the 2F it is set into, cut away from above like the room:
//
//   - below the door: M4's gallery corridor — the border band of grey tiles
//     along the wall, the worn yellow guide lines, the cream P-tiles (a trail
//     of dusty prints and a faded peach arrow sticker leading to the door),
//     further down the glass railing over the atrium (it comes up when a
//     dialog window lifts the room); the evening square of M4's skylight in
//     front of the door, the dead floor guide (消えた案内板) and a dry planter;
//   - west: a vacant tenant — bare board walls with the ghost of the old
//     sign's screw holes, a 『テナント募集』 notice, a bare screed floor with
//     taped outlines where the fixtures stood, a dust sheet, a stepladder
//     laid down, stacked ceiling panels; its glass front to the corridor;
//   - east: a closed children's clothes shop — faded mint wallpaper, its
//     fascia bleached, a giraffe height chart, empty round racks, hangers on
//     the floor, a child mannequin standing in the dark; its glass front;
//   - above: the plenum behind the back walls, a duct and a cable tray;
//   - all of it graded like the room (pal_maigo) and stepping down into the
//     dark away from the room in flat steps joined by checker bands (7.9);
//   - at run time the lone tube's light spills out of the room through the
//     door's wired glass and the two low windows either side of it onto the
//     corridor, and goes out with it every 1.3 s.

import type { Gfx } from '../../engine/gfx';
import { mix, PixelCanvas, rgba32 } from '../../engine/pixel';
import { corridorTiles } from '../tiles/ifloor';
import { ihash, valueNoise } from '../tiles/noise';
import { P } from '../tiles/palette';
import { cardboard, kidDrawing, notice } from './ifurn';
import { mapMultiply, mapTopDark, mapVignette, screenPool, screenSpill, tintSpill } from './ishell';
import { castRight, dk, lt, outline } from './kit';
import { planter } from './mall_kit';
import { fontTextSmall, printLines, tiny } from './text';
import type { PropEnv } from './types';

/**
 * Margins (px) of the surround round the 224×176 room: the fixed 1× camera
 * shows 80 / 20 of it; for a dialog window the room may slide up to 44 px up
 * (events' lift) or ROOM_SLIDE (36) down, so it reaches that much further.
 */
export const OUT = { l: 88, r: 88, t: 64, b: 80 };
const RW = 224;
const RH = 176;
/** The room as it shows (its wall sections included), room px. */
const ROOM = { x0: 12, y0: 0, x1: 212, y1: 164 };
/** The two low windows in the south wall either side of the door (x0, x1), room px. */
export const M5_WINDOWS: [number, number][] = [
  [28, 80],
  [130, 196],
];
/** The door's centre and its wired-glass window (room px). */
const DOOR_X = 104;
/** The corridor: the wall's foot, the guide lines' walk band, the railing's lip. */
const COR_Y = 164;
const WALK: [number, number] = [182, 216];
const RAIL_Y = 226;
/** The green emergency exit light (誘導灯) on the vacant tenant's back wall: centre, room px. */
const EXIT = { x: -40, y: 12 };

export interface MaigoOut {
  /** Surround + room, (RW + l + r) × (RH + t + b). */
  img: HTMLCanvasElement;
  ox: number;
  oy: number;
}

/**
 * Paint the two low windows (and the door's wired glass) into the room
 * shell's south wall section (y160–163), seen from above like the wall.
 */
export function maigoWindows(p: PixelCanvas): void {
  for (const [x0, x1] of M5_WINDOWS) {
    for (let x = x0; x <= x1; x++) {
      const post = (x - x0) % 13 === 0 || x === x1;
      p.set(x, 160, post ? P.concreteLt : P.steel);
      p.set(x, 161, post ? P.steel : (x + 1) % 9 < 2 ? mix(P.aqua, P.white, 0.4) : mix(P.aqua, P.shade, 0.55));
      p.set(x, 162, post ? P.steel : mix(P.aqua, P.nightShade, 0.6));
      p.set(x, 163, P.asphalt);
    }
  }
}

/** Build the room set into its surroundings. `room` is the shell canvas (224×176). */
export function withMaigoOut(room: PixelCanvas): MaigoOut {
  const { l: L, r: R, t: T, b: B } = OUT;
  const EW = RW + L + R;
  const EH = RH + T + B;
  const p = new PixelCanvas(EW, EH);
  // room px → canvas px
  const S = (x: number, y: number, c: string) => p.set(x + L, y + T, c);
  const rect = (x: number, y: number, w: number, h: number, c: string) => p.rect(x + L, y + T, w, h, c);
  const X0 = -L;
  const X1 = RW + R;
  const Y0 = -T;
  const Y1 = RH + B;

  // ---- 1. the corridor (M4's gallery) along the whole foot of the picture
  const cor = corridorTiles({
    seed: 561,
    w: 26,
    h: 17,
    blocked: (tx, ty) => ty < 12 || ty > 13,
    walk: [WALK[0] + 4, WALK[1] + 4],
    decals: [
      // dusty prints walking up to the door, and the faded sticker pointing at it
      { x: DOOR_X - 4 + 96, y: 176 + 4, kind: 'steps', dir: 3, n: 6 },
      { x: DOOR_X + 18 + 96, y: 188 + 4, kind: 'arrow', dir: 3, c: P.peach },
      { x: 28 + 96, y: 196 + 4, kind: 'tape', w: 22, h: 8 },
    ],
  });
  for (let y = COR_Y; y < Y1; y++) for (let x = X0; x < X1; x++) S(x, y, cor(x + 96, y + 4));
  // the storefronts' and the room's foot throw a soft contact shadow on it
  for (let x = X0; x < X1; x++) {
    blendAt(p, x + L, COR_Y + T, P.nightShade, 0.5);
    blendAt(p, x + L, COR_Y + 1 + T, P.nightShade, 0.3);
    blendAt(p, x + L, COR_Y + 2 + T, P.nightShade, 0.12);
  }
  // ---- 2. the railing over the atrium and the dark of the well beyond
  for (let x = X0; x < X1; x++) {
    S(x, RAIL_Y, P.concrete);
    S(x, RAIL_Y + 1, P.steel);
    S(x, RAIL_Y + 2, P.concreteLt);
    S(x, RAIL_Y + 3, P.steel);
    for (let y = RAIL_Y + 4; y < RAIL_Y + 16; y++) {
      // glass over the air of the well: the far side's gloom, a faint far light or two
      const far = valueNoise((x + 400) / 11, y / 3, 571) > 0.8 && y > RAIL_Y + 8;
      let c = far ? mix(P.shade, P.night, 0.45) : mix(P.nightShade, P.night, 0.55);
      if ((x - y + 600) % 23 < 2) c = mix(c, P.concreteLt, 0.22);
      S(x, y, c);
    }
    S(x, RAIL_Y + 16, P.asphalt);
    S(x, RAIL_Y + 17, P.concrete);
    for (let y = RAIL_Y + 18; y < Y1; y++) S(x, y, y === RAIL_Y + 18 ? mix(P.paperGrid, P.shade, 0.35) : P.night);
    if ((x + 400) % 32 === 8) for (let y = RAIL_Y + 2; y < RAIL_Y + 16; y++) S(x, y, y === RAIL_Y + 2 ? P.white : y === RAIL_Y + 3 ? P.concreteLt : P.steel);
    if ((x + 400) % 32 === 9) for (let y = RAIL_Y + 4; y < RAIL_Y + 16; y++) S(x, y, P.asphalt);
  }

  // ---- 3. the plenum behind the back walls (y < 0): a duct and a cable tray
  for (let y = Y0; y < 0; y++)
    for (let x = X0; x < X1; x++) S(x, y, (x * 3 + y * 7 + 1000) % 13 === 0 ? P.nightShade : P.ink);
  const DY = -19;
  for (let x = X0; x < X1; x++) {
    const seam = (x + 400) % 30;
    S(x, DY, P.steel);
    for (let y = DY + 1; y < DY + 8; y++) S(x, y, seam === 0 ? P.charcoal : seam === 1 ? P.steel : y === DY + 1 ? P.concrete : P.asphalt);
    S(x, DY + 8, P.charcoal);
    // the cable tray: two rails, rungs, a bundle of cables along it
    S(x, -7, P.charcoal);
    S(x, -3, P.charcoal);
    if ((x + 400) % 5 === 0) for (let y = -6; y < -3; y++) S(x, y, P.asphalt);
    else {
      S(x, -5, ((x >> 3) & 1) ? P.shade : P.shadeDeep);
      if (valueNoise((x + 400) / 9, 1, 573) > 0.55) S(x, -4, P.maroon);
    }
    // hangers from the slab every other seam
    if ((x + 400) % 60 === 14) for (let y = DY - 16; y < DY; y++) S(x, y, P.asphalt);
    // higher up, the sprinkler main along the underside of the slab, a flange now and then
    S(x, DY - 17, (x + 400) % 48 === 0 ? P.steel : P.maroon);
    S(x, DY - 16, (x + 400) % 48 === 0 ? P.asphalt : P.vermShade);
    S(x, DY - 15, P.ink);
  }

  // ---- 4. the neighbours' back walls (y 0–47), floors (48–159), glass fronts (160–163)
  const WEST = (x: number) => x < ROOM.x0 - 3;
  const EAST = (x: number) => x >= ROOM.x1 + 3;
  for (let y = 0; y < 48; y++)
    for (let x = X0; x < X1; x++) {
      if (!WEST(x) && !EAST(x)) continue;
      S(x, y, WEST(x) ? westWall(x, y) : eastWall(x, y));
    }
  for (let y = 48; y < 160; y++)
    for (let x = X0; x < X1; x++) {
      if (!WEST(x) && !EAST(x)) continue;
      let c = WEST(x) ? westFloor(x, y) : eastFloor(x, y);
      // contact shadow under the back wall, and along the party walls
      if (y < 50) c = mix(c, P.nightShade, y === 48 ? 0.45 : 0.3);
      else if (y === 50) c = mix(c, P.nightShade, 0.12);
      if (x === ROOM.x0 - 4 || x === ROOM.x1 + 3) c = mix(c, P.nightShade, 0.35);
      S(x, y, c);
    }
  // the party walls between the room and each neighbour: the outer skin of the
  // room's 4px wall section (lit / base / shade) from the back wall down
  for (let y = 0; y < 164; y++) {
    S(ROOM.x0 - 3, y, P.ink);
    S(ROOM.x0 - 2, y, P.shadeDeep);
    S(ROOM.x0 - 1, y, P.shade);
    S(ROOM.x1, y, P.shade);
    S(ROOM.x1 + 1, y, P.shadeDeep);
    S(ROOM.x1 + 2, y, P.ink);
  }
  // the room's two bottom corners (the wall section turning the corner)
  for (let y = 160; y < 164; y++)
    for (const x of [ROOM.x0, ROOM.x0 + 1, ROOM.x0 + 2, ROOM.x0 + 3, ROOM.x1 - 4, ROOM.x1 - 3, ROOM.x1 - 2, ROOM.x1 - 1]) S(x, y, y === 163 ? lt(P.nightShade) : P.nightShade);
  // the glass fronts to the corridor (seen from above: frame, glass, frame; mullions)
  for (let x = X0; x < X1; x++) {
    if (!WEST(x) && !EAST(x)) continue;
    const m = (x + 400) % 24 === 0;
    S(x, 160, m ? P.concreteLt : P.steel);
    S(x, 161, m ? P.steel : (x + 400) % 11 < 2 ? mix(P.aqua, P.white, 0.35) : mix(P.aqua, P.shade, 0.5));
    S(x, 162, m ? P.steel : mix(P.aqua, P.nightShade, 0.55));
    S(x, 163, P.asphalt);
    // the children's shop has its shutter down in front of the glass
    if (EAST(x)) {
      S(x, 164, (x & 3) === 0 ? P.steel : P.concrete);
      S(x, 165, P.asphalt);
    }
  }
  // the shutter box's lock plate
  rect(262, 164, 5, 2, P.charcoal);

  paintWest(p, L, T);
  paintEast(p, L, T);
  paintCorridor(p, L, T);

  // ---- 5. grade: evening shade, then flat steps down into the dark away from the room
  shadeAndFade(p, L, T);

  // ---- 6. the room on top
  p.blit(room, L, T);
  return { img: p.toCanvas(), ox: -L, oy: -T };
}

function blendAt(p: PixelCanvas, x: number, y: number, col: string, a: number): void {
  const v = p.get(x, y);
  if (v >>> 24 === 0) return;
  const r = v & 255;
  const g = (v >>> 8) & 255;
  const b = (v >>> 16) & 255;
  const c = parseInt(col.slice(1), 16);
  const cr = (c >> 16) & 255;
  const cg = (c >> 8) & 255;
  const cb = c & 255;
  const rr = Math.round(r + (cr - r) * a);
  const gg = Math.round(g + (cg - g) * a);
  const bb = Math.round(b + (cb - b) * a);
  p.set(x, y, ((255 << 24) | (bb << 16) | (gg << 8) | rr) >>> 0);
}

// ---------------------------------------------------------------- west: the vacant tenant

/** Bare gypsum board: 30px sheets, taped and puttied seams with screw dots, a trim and a steel skirting. */
function westWall(x: number, y: number): string {
  if (y === 0) return P.nightShade;
  if (y === 1) return P.concrete;
  if (y === 2) return P.steel;
  if (y >= 45) return y === 45 ? P.concreteLt : y === 47 ? P.asphalt : P.steel;
  const sx = (x + 400) % 30;
  if (sx === 0 || sx === 1) return y % 8 === 4 ? P.steel : P.paperGrid;
  if ((sx === 4 || sx === 26) && y % 9 === 5) return P.steel;
  // putty patches and a long water stain from the slab
  if (valueNoise((x + 400) / 5, y / 4, 581) > 0.84) return P.paperGrid;
  if (valueNoise((x + 400) / 2.5, 0.5, 583) > 0.9 && y < 30) return P.concrete;
  return P.concreteLt;
}

/** Bare screed: grey concrete, the trowel's arcs, mottled; the old floor's glue marks. */
function westFloor(x: number, y: number): string {
  const n = valueNoise((x + 400) / 13, y / 9, 585);
  const gx = (x + 400) % 26;
  const gy = y % 22;
  const arc = Math.floor(Math.hypot(gx - 13, gy + 6)) % 7 === 0 && ihash((x + 400) >> 1, y >> 1, 587) % 3 !== 0;
  if (arc) return P.steel;
  if (n > 0.74) return P.concreteLt;
  if (n < 0.2) return P.steel;
  if (ihash((x + 400) >> 1, y >> 1, 589) % 41 === 0) return P.asphalt;
  return P.concrete;
}

function paintWest(p: PixelCanvas, L: number, T: number): void {
  const at = (x: number) => x + L;
  const aty = (y: number) => y + T;
  // the ghost of the old shop's sign: a cleaner oblong with its four screw holes
  const sx = -74;
  const sw = 50;
  for (let y = 6; y < 19; y++) for (let x = sx; x < sx + sw; x++) p.set(at(x), aty(y), y === 6 || y === 18 || x === sx || x === sx + sw - 1 ? P.paperGrid : P.white);
  for (const [x, y] of [[sx + 2, 8], [sx + sw - 3, 8], [sx + 2, 16], [sx + sw - 3, 16]] as const) p.set(at(x), aty(y), P.charcoal);
  // the anchor bolts of its light box, and the cut cable hanging from a hole
  p.set(at(sx + 24), aty(4), P.charcoal);
  p.vline(at(sx + 25), aty(19), aty(25), P.charcoal);
  p.set(at(sx + 26), aty(25), P.verm);
  // 『テナント募集』 on a notice taped to the board: a red head, the letting agent's lines
  notice(p, at(-60), aty(22), 18, 20, { paper: P.white, ink: P.steel, head: P.verm, seed: 591, rows: 6 });
  fontTextSmall(p, '募集', at(-58), aty(26), P.vermShade, 1);
  // the emergency exit light (誘導灯): still lit in the empty shop — a green
  // box, the white running figure and the door, its steel housing
  const ex = EXIT.x - 9;
  const ey = EXIT.y - 4;
  p.rect(at(ex - 1), aty(ey - 1), 20, 10, P.steel);
  p.hline(at(ex - 1), at(ex + 18), aty(ey - 1), P.concreteLt);
  p.rect(at(ex), aty(ey), 18, 8, P.leafDeep);
  p.hline(at(ex), at(ex + 17), aty(ey), P.leafYoung);
  // the door (white frame, green inside) on the left, the figure running into it
  p.strokeRect(at(ex + 2), aty(ey + 1), 5, 6, P.white);
  p.set(at(ex + 10), aty(ey + 2), P.white);
  p.hline(at(ex + 9), at(ex + 12), aty(ey + 3), P.white);
  p.set(at(ex + 9), aty(ey + 4), P.white);
  p.set(at(ex + 11), aty(ey + 4), P.white);
  p.set(at(ex + 8), aty(ey + 5), P.white);
  p.set(at(ex + 12), aty(ey + 5), P.white);
  p.hline(at(ex + 13), at(ex + 15), aty(ey + 3), P.white);
  p.set(at(ex + 16), aty(ey + 2), P.white);
  p.set(at(ex + 16), aty(ey + 4), P.white);
  castRight(p, at(ex - 1), aty(ey - 1), 20, 10, 2);
  // a power outlet with its cover plate gone, a strip of tape
  p.rect(at(-24), aty(34), 5, 6, P.white);
  p.set(at(-22), aty(36), P.charcoal);
  p.set(at(-22), aty(38), P.charcoal);
  p.rect(at(-34), aty(26), 6, 2, P.goldPale);
  // ---- the floor: taped outlines of the fixtures that stood here
  const tape = (x0: number, y0: number, w: number, h: number) => {
    for (let x = x0; x < x0 + w; x++)
      for (const y of [y0, y0 + h - 1]) if (ihash(x >> 2, y, 593) % 5 !== 0) p.set(at(x), aty(y), ihash(x, y, 595) % 3 ? P.paperGrid : P.goldPale);
    for (let y = y0; y < y0 + h; y++)
      for (const x of [x0, x0 + w - 1]) if (ihash(y >> 2, x, 597) % 5 !== 0) p.set(at(x), aty(y), ihash(x, y, 599) % 3 ? P.paperGrid : P.goldPale);
  };
  tape(-80, 58, 44, 12);
  tape(-28, 92, 14, 40);
  tape(-78, 124, 30, 18);
  // a dust sheet thrown over a stack of display cases: a lumpy pale shape, its folds
  sheet(p, at(-76), aty(78), 34, 22);
  // the aluminium stepladder laid on the floor
  for (let k = 0; k < 30; k++) {
    const x = -40 + k;
    const y = 112 + Math.round(k * 0.18);
    p.set(at(x), aty(y), P.concreteLt);
    p.set(at(x), aty(y + 1), P.steel);
    p.set(at(x), aty(y + 7), P.concreteLt);
    p.set(at(x), aty(y + 8), P.steel);
    p.set(at(x), aty(y + 9), P.asphalt);
    if (k % 6 === 2) for (let j = 2; j < 7; j++) p.set(at(x), aty(y + j), j === 2 ? P.concreteLt : P.steel);
  }
  // stacked ceiling panels (white squares, offset), a box on them
  for (let k = 3; k >= 0; k--) {
    const x = -84 + k;
    const y = 138 - k;
    p.rect(at(x), aty(y), 22, 14, k === 0 ? P.white : P.concreteLt);
    p.hline(at(x), at(x + 21), aty(y + 13), P.concrete);
    p.vline(at(x + 21), aty(y), aty(y + 13), P.concrete);
  }
  for (let j = 0; j < 12; j++) for (let i = 0; i < 20; i++) if (((i + j) & 3) === 0) p.set(at(-83 + i), aty(136 + j), P.paperGrid);
  cardboard(p, at(-52), aty(140), 16, 12, 5, 3);
  // a coil of cable
  p.ring(at(-18) + 0.5, aty(146) + 0.5, 5, 3, P.charcoal);
  p.ring(at(-18) + 0.5, aty(146) + 0.5, 3, 2, P.asphalt);
  p.line(at(-13), aty(146), at(-6), aty(150), P.charcoal);
}

/** A dust sheet over a stack: pale, lumpy, with folds and a darker hem. */
function sheet(p: PixelCanvas, x: number, y: number, w: number, h: number): void {
  for (let j = 0; j < h; j++)
    for (let i = 0; i < w; i++) {
      const u = (i + 0.5) / w - 0.5;
      const v = (j + 0.5) / h - 0.5;
      const lump = valueNoise(i / 6, j / 5, 601) * 0.18;
      if (u * u * 1.6 + v * v * 1.9 > 0.26 + lump) continue;
      let c: string = P.white;
      if (valueNoise(i / 3, j / 7, 603) > 0.7) c = P.concreteLt;
      if ((i + Math.round(j * 0.4)) % 9 === 0) c = P.concrete;
      if (j > h * 0.62 && ihash(i, j, 605) % 2 === 0) c = P.concreteLt;
      p.set(x + i, y + j, c);
    }
  // its shadow on the floor, the hem
  for (let i = 3; i < w - 2; i++) {
    const v = p.get(x + i, y + h - 3);
    if (v >>> 24) p.set(x + i, y + h - 2, P.steel);
  }
}

// ---------------------------------------------------------------- east: the closed children's clothes shop

/** Faded mint wallpaper with small stars, a white chair rail and a pale wood skirting. */
function eastWall(x: number, y: number): string {
  if (y === 0) return P.nightShade;
  if (y === 1) return P.white;
  if (y === 2) return P.concreteLt;
  if (y >= 44) return y === 44 ? P.white : y === 47 ? P.wood : P.woodLt;
  if (y === 30) return P.white;
  if (y === 31) return P.concrete;
  const mint = mix(P.leafLt, P.aqua, 0.45);
  const pale = mix(mint, P.white, 0.45);
  if (y > 31) return (x + 400) % 6 === 0 ? pale : mix(mint, P.white, 0.25);
  const mx = (x + 400) % 14;
  const my = y % 14;
  if ((mx === 4 && my === 5) || (mx === 11 && my === 12)) return P.goldPale;
  if ((mx === 3 && my === 5) || (mx === 5 && my === 5) || (mx === 4 && (my === 4 || my === 6))) return mix(P.goldPale, pale, 0.5);
  return valueNoise((x + 400) / 9, y / 9, 607) > 0.78 ? pale : mix(mint, P.white, 0.3);
}

/** Carpet tiles in two faded pastels (the children's corner of the shop), low seams, pile flecks. */
function eastFloor(x: number, y: number): string {
  const tx = (x + 400) >> 4;
  const ty = y >> 4;
  const lx = (x + 400) & 15;
  const ly = y & 15;
  const pink = mix(P.skin1, P.concreteLt, 0.35);
  const mint = mix(P.leafLt, P.concreteLt, 0.45);
  // laid quarter-turned: each tile's pile runs the other way (a sheen band)
  const c = ((tx + ty) & 1) === 0 ? pink : mint;
  if (lx === 15 || ly === 15) return mix(c, P.shade, 0.25);
  const turned = ((tx * 3 + ty) & 1) === 0;
  const k = turned ? lx : ly;
  if ((k & 3) === 0) return mix(c, P.white, 0.18);
  // worn flat in front of the racks, flecks of pile elsewhere
  const f = ihash((x + 400) >> 1, y >> 1, 609) % 19;
  if (f === 0) return mix(c, P.shade, 0.18);
  return c;
}

function paintEast(p: PixelCanvas, L: number, T: number): void {
  const at = (x: number) => x + L;
  const aty = (y: number) => y + T;
  // the fascia inside the shop, bleached: 『こども服』 on a pastel board
  const fx = 226;
  p.rect(at(fx), aty(5), 46, 13, P.skin1);
  p.hline(at(fx), at(fx + 45), aty(5), P.white);
  p.hline(at(fx), at(fx + 45), aty(17), P.skin3);
  fontTextSmall(p, 'こども服', at(fx + 5), aty(7), P.peach, 1);
  p.ellipse(at(fx + 41) + 0.5, aty(11) + 0.5, 2, 2, P.aqua);
  castRight(p, at(fx), aty(5), 46, 13, 2);
  // the giraffe height chart: a yellow giraffe, a scale of ticks, a pencil mark or two
  const gx = 280;
  p.rect(at(gx), aty(8), 5, 36, P.goldPale);
  p.rect(at(gx - 1), aty(4), 7, 5, P.goldPale);
  p.set(at(gx), aty(3), P.brass);
  p.set(at(gx + 4), aty(3), P.brass);
  p.set(at(gx + 1), aty(6), P.ink);
  for (let y = 10; y < 44; y += 5) {
    p.set(at(gx + 1 + ((y / 5) & 1)), aty(y), P.brass);
    p.hline(at(gx + 5), at(gx + 6), aty(y), P.woodDark);
  }
  p.hline(at(gx - 3), at(gx - 1), aty(28), P.navy);
  p.hline(at(gx - 3), at(gx - 1), aty(33), P.verm);
  // a sale poster curling off the wall, a child's drawing pinned beside it
  notice(p, at(252), aty(20), 12, 15, { paper: P.paper, ink: P.peach, head: P.crimson, seed: 611, rows: 4, tilt: true });
  kidDrawing(p, at(236), aty(22), 11, 9, 4);
  // ---- the floor: empty round racks (a ring on a post, a few hangers left on them)
  for (const [cx, cy, n] of [[238, 70, 3], [278, 70, 0], [236, 118, 2]] as const) rack(p, at(cx), aty(cy), n);
  // hangers dropped on the floor
  for (const [x, y, k] of [[282, 102, 0], [252, 136, 1], [290, 122, 0]] as const) {
    p.line(at(x), aty(y + 2), at(x + 3), aty(y), k ? P.white : P.skin2);
    p.line(at(x + 3), aty(y), at(x + 6), aty(y + 2), k ? P.white : P.skin2);
    p.hline(at(x), at(x + 6), aty(y + 3), k ? P.concreteLt : P.skin3);
    p.set(at(x + 3), aty(y - 1), P.steel);
  }
  // a low display table with a few folded shirts left on it
  p.rect(at(282), aty(136), 22, 12, P.white);
  p.hline(at(282), at(303), aty(136), P.glint);
  p.rect(at(282), aty(148), 22, 3, P.concrete);
  for (const [x, c] of [[284, P.peach], [291, P.aqua], [297, P.goldPale]] as const) {
    p.rect(at(x), aty(139), 6, 5, c);
    p.hline(at(x), at(x + 5), aty(139), lt(c));
    p.hline(at(x), at(x + 5), aty(143), dk(c));
  }
  // the child mannequin standing in the dark shop, facing the glass
  mannequin(p, at(262), aty(92));
}

/**
 * A round clothes rack seen from the front-top: base, post, the chrome ring,
 * and the empty plastic hangers still hooked along its front half (what
 * tells it from a table); `n` of them keep a child's shirt.
 */
function rack(p: PixelCanvas, cx: number, cy: number, n: number): void {
  p.ellipse(cx + 0.5, cy + 13.5, 6, 2, P.asphalt);
  p.vline(cx, cy + 2, cy + 13, P.steel);
  p.vline(cx + 1, cy + 2, cy + 13, P.charcoal);
  p.ring(cx + 0.5, cy + 0.5, 9, 3.5, P.concreteLt);
  p.ring(cx + 0.5, cy + 1.5, 9, 3.5, P.charcoal);
  const shirts = [P.peach, P.aqua, P.goldPale];
  for (let k = 0; k < 6; k++) {
    // along the front half of the ring (the back half hides behind it)
    const a = 0.25 + k * 0.52;
    const hx = Math.round(cx + Math.cos(a) * 9);
    const hy = Math.round(cy + 2 + Math.sin(a) * 3.5);
    const c = k % 3 === 1 ? P.skin2 : P.white;
    if (k < n) {
      const sc = shirts[k % 3];
      p.rect(hx - 1, hy + 1, 3, 5, sc);
      p.set(hx - 1, hy + 1, lt(sc));
      p.vline(hx + 1, hy + 2, hy + 5, dk(sc));
      p.set(hx, hy, P.steel);
    } else {
      p.set(hx, hy, P.steel);
      p.hline(hx - 1, hx + 1, hy + 1, c);
      p.set(hx - 2, hy + 2, c);
      p.set(hx + 2, hy + 2, c);
    }
  }
}

/** A child mannequin (11×22): faceless, pale, a little cardigan left on it; outlined. */
function mannequin(p: PixelCanvas, x: number, y: number): void {
  const q = new PixelCanvas(13, 24);
  const o = 1;
  // stand and pole
  q.ellipse(o + 5.5, o + 20.5, 4, 1.5, P.charcoal);
  q.vline(o + 5, o + 15, o + 19, P.steel);
  // legs, body in the cardigan, arms down, the round head
  q.rect(o + 3, o + 11, 2, 5, P.concreteLt);
  q.rect(o + 6, o + 11, 2, 5, P.concrete);
  q.rect(o + 2, o + 5, 7, 7, P.peach);
  q.vline(o + 5, o + 6, o + 11, P.sunShade);
  q.hline(o + 2, o + 8, o + 5, P.skin1);
  q.vline(o + 1, o + 6, o + 10, P.concreteLt);
  q.vline(o + 9, o + 6, o + 10, P.concrete);
  q.ellipse(o + 5.5, o + 2.5, 3, 3, P.white);
  q.set(o + 4, o + 1, P.glint);
  q.vline(o + 7, o + 2, o + 4, P.concrete);
  outline(q, { soft: true, bottom: true });
  p.blit(q, x - o, y - o);
}

// ---------------------------------------------------------------- the corridor's things

function paintCorridor(p: PixelCanvas, L: number, T: number): void {
  const at = (x: number) => x + L;
  const aty = (y: number) => y + T;
  // the dead floor guide (east, in front of the children's shop): a freestanding
  // board, its lit panel dark — the floor plan a ghost on the glass
  const gx = 240;
  const gy = 168;
  p.ellipse(at(gx + 13), aty(gy + 31) + 0.5, 15, 2.5, mix(P.nightShade, P.concrete, 0.3));
  p.rect(at(gx), aty(gy), 26, 28, P.steel);
  p.hline(at(gx), at(gx + 25), aty(gy), P.concreteLt);
  p.vline(at(gx + 25), aty(gy), aty(gy + 27), P.asphalt);
  p.rect(at(gx + 2), aty(gy + 2), 22, 4, P.navy);
  tiny(p, 'GUIDE', at(gx + 4), aty(gy + 3), mix(P.navy, P.concrete, 0.45));
  p.rect(at(gx + 2), aty(gy + 7), 22, 18, mix(P.ink, P.navy, 0.25));
  // the floor plan, unlit: the gallery, the atrium's oval, the shop boxes
  const plan = mix(P.navy, P.steel, 0.35);
  p.strokeRect(at(gx + 4), aty(gy + 9), 18, 14, plan);
  p.ring(at(gx + 12) + 0.5, aty(gy + 16) + 0.5, 4, 2.5, plan);
  for (const [x, y] of [[gx + 5, gy + 10], [gx + 9, gy + 10], [gx + 16, gy + 10], [gx + 5, gy + 20], [gx + 17, gy + 20]] as const) p.rect(at(x), aty(y), 3, 2, plan);
  // 『現在地』: its red dot gone dark
  p.rect(at(gx + 19), aty(gy + 11), 2, 2, P.maroon);
  // a reflection streak on the dead glass
  p.line(at(gx + 3), aty(gy + 22), at(gx + 9), aty(gy + 8), mix(P.ink, P.concreteLt, 0.2));
  p.rect(at(gx + 11), aty(gy + 28), 4, 3, P.charcoal);
  p.hline(at(gx + 9), at(gx + 16), aty(gy + 30), P.asphalt);
  castRight(p, at(gx), aty(gy), 26, 28, 2);
  // a dry planter by the vacant tenant's glass
  planter(p, at(-44), aty(166), 617);
  p.ellipse(at(-37), aty(188) + 0.5, 9, 2, mix(P.nightShade, P.concrete, 0.35));
  // a leaflet or two blown along the wall
  p.rect(at(152), aty(172), 6, 4, P.white);
  printLines(p, at(153), aty(173), 4, 1, P.concrete, 619);
  p.rect(at(-8), aty(182), 5, 3, P.paper);
}

// ---------------------------------------------------------------- the grade of the outside

/**
 * Evening shade over everything outside the room (towards #3A2B5C), then
 * flat steps down into the night away from the room — the corridor under
 * the room's windows brightest, the neighbours darkening towards the screen
 * edges, the plenum dark — joined by 1px checker bands.
 */
function shadeAndFade(p: PixelCanvas, L: number, T: number): void {
  const [nr, ng, nb] = [0x1b, 0x17, 0x33];
  // small steps: a band between two of them is a quiet 1px checker, not a stripe
  const STEPS = [0.1, 0.2, 0.31, 0.42, 0.53, 0.64, 0.75, 0.86];
  const level = (x: number, y: number): number => {
    // x, y in room px
    const dx = x < ROOM.x0 ? ROOM.x0 - x : x >= ROOM.x1 ? x - ROOM.x1 + 1 : 0;
    if (y < 0) return Math.min(7, 3 + -y / 8 + dx / 30);
    // the neighbours: the green exit light keeps the west tenant's back wall from going black
    if (y < COR_Y) {
      const ex = x < ROOM.x0 ? Math.hypot((x - EXIT.x) / 1.6, (y - EXIT.y) / 1.2) : 999;
      return Math.min(7, 1.4 + dx / 19, 1.9 + ex / 20);
    }
    // the corridor: brightest right under the room, falling off along it and away from the wall
    const dy = y - COR_Y;
    const ex = x < ROOM.x0 + 20 ? ROOM.x0 + 20 - x : x > ROOM.x1 - 20 ? x - (ROOM.x1 - 20) : 0;
    return Math.min(7, dy / 18 + ex / 24);
  };
  for (let yy = 0; yy < p.h; yy++)
    for (let xx = 0; xx < p.w; xx++) {
      const v = p.get(xx, yy);
      if (v >>> 24 === 0) {
        p.set(xx, yy, rgba32(P.night));
        continue;
      }
      const s = level(xx - L, yy - T);
      let k = Math.floor(s);
      if (s - k > 0.8 && ((xx + yy) & 1) === 0) k++;
      const a = STEPS[Math.min(STEPS.length - 1, k)];
      const r = v & 255;
      const g = (v >>> 8) & 255;
      const b = (v >>> 16) & 255;
      const sr = r + (0x3a - r) * 0.2;
      const sg = g + (0x2b - g) * 0.2;
      const sb = b + (0x5c - b) * 0.2;
      const rr = Math.round(sr + (nr - sr) * a);
      const gg = Math.round(sg + (ng - sg) * a);
      const bb = Math.round(sb + (nb - sb) * a);
      p.set(xx, yy, ((255 << 24) | (bb << 16) | (gg << 8) | rr) >>> 0);
    }
}

// ---------------------------------------------------------------- run time

/**
 * Call first in the shell's over(): the room's own grade (pal_maigo: a lilac
 * multiply, the top darker, the vignette) laid over the outside too — the
 * renderer's light map keeps map lights and grade inside the room's cells —
 * then the evening square of M4's skylight before the door and the tube's
 * light spilling out through the windows and the door while it is on.
 */
export function maigoOutOver(g: Gfx, x: number, y: number, env: PropEnv, tubeOn: boolean): void {
  const ctx = g.ctx;
  const X = Math.round(x);
  const Y = Math.round(y);
  ctx.save();
  const path = new Path2D();
  path.rect(X - OUT.l, Y - OUT.t, RW + OUT.l + OUT.r, RH + OUT.t + OUT.b);
  path.rect(X + ROOM.x0, Y + ROOM.y0, ROOM.x1 - ROOM.x0, 160);
  ctx.clip(path, 'evenodd');
  if (env.grade.night <= 0.5) {
    mapMultiply(g, '#A49CC6');
    mapTopDark(g, '#8A82A8');
    mapVignette(g, g.w / 2, g.h / 2 + 8, 40, 150, '#6C6290');
  }
  ctx.restore();
  if (!tubeOn) return;
  // the lone tube's yellowed light out through the windows and the door's wired glass
  for (const [x0, x1] of M5_WINDOWS) {
    const w = x1 - x0;
    tintSpill(g, X + x0 + w / 2, Y + COR_Y, w - 4, w + 16, 26, '#F4E6A8', 0.62);
    screenSpill(g, X + x0 + w / 2, Y + COR_Y, w - 6, w + 10, 18, '#F4E6A8', 0.16);
  }
  tintSpill(g, X + DOOR_X, Y + COR_Y + 8, 6, 16, 18, '#F4E6A8', 0.5);
}

/** The exit light's green: the sign itself, a halo on the board, a faint pool on the floor. */
function exitSignGlow(g: Gfx, X: number, Y: number, env: PropEnv): void {
  const k = 0.92 + Math.sin(env.t / 1700) * 0.04;
  g.rect(X + EXIT.x - 9, Y + EXIT.y - 4, 18, 8, '#3FA66B', 0.35 * k);
  screenPool(g, X + EXIT.x, Y + EXIT.y, 26, 14, '#3FA66B', 0.28 * k);
  screenPool(g, X + EXIT.x + 4, Y + 58, 30, 9, '#3FA66B', 0.12 * k);
}

/** Call from the shell's glow(): the lit window glass, the exit light. */
export function maigoOutGlow(g: Gfx, x: number, y: number, env: PropEnv, tubeOn: boolean): void {
  const X = Math.round(x);
  const Y = Math.round(y);
  exitSignGlow(g, X, Y, env);
  if (!tubeOn) return;
  for (const [x0, x1] of M5_WINDOWS) {
    g.rect(X + x0 + 1, Y + 161, x1 - x0 - 1, 2, '#F4E6A8', 0.35);
    screenSpill(g, X + (x0 + x1) / 2, Y + COR_Y, x1 - x0 - 6, x1 - x0 + 8, 12, '#F4E6A8', 0.12);
  }
  g.rect(X + DOOR_X - 2, Y + 171, 5, 1, '#F4E6A8', 0.5);
}
