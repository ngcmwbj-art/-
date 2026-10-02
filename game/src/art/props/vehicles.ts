// Vehicles that drive through the town in stage 0 (QA round 1: the streets
// had no traffic at all). A white cab-over kei truck (軽トラ), a farmer's,
// with a crate, a box of daikon and a folded tarp on the bed: side view
// (right; left is the mirror), front and rear views for the U-turn, two
// wheel frames each. Sized against Minato (24px): the cab roof stands a head
// above him (QA round 3). The world's traffic
// (world/npc.ts 'route' with a vehicle) draws them through an actor.
// 2026-09-28: the town's truck became ツガオ便 (the olive truck of chapter 2,
// 10_narrative 6.21 / 30_level_art 3.4): TSUGAO_TRUCK below. The white truck
// stays for any other vehicle id.

import { PixelCanvas } from '../../engine/pixel';
import { P } from '../tiles/palette';
import { finish, shadeRect } from './kit';

export type VehicleView = 'left' | 'right' | 'up' | 'down';

interface VehicleArt {
  frames: Record<VehicleView, HTMLCanvasElement[]>;
  /** A sleeper's other breath (standing still: every other 2 s). */
  breath?: Record<VehicleView, HTMLCanvasElement[]>;
}

const cache = new Map<string, VehicleArt>();

/** A tyre seen from the side: black rubber, a steel hub, a glint that turns. */
function wheel(p: PixelCanvas, cx: number, cy: number, k: number): void {
  p.ellipse(cx, cy, 5.2, 5.2, P.ink);
  p.ellipse(cx, cy, 4.2, 4.2, P.charcoal);
  p.ellipse(cx, cy, 2.4, 2.4, P.steel);
  p.set(Math.round(cx), Math.round(cy), P.concrete);
  // the rubber catches the light on its upper left
  p.set(Math.round(cx) - 3, Math.round(cy) - 3, P.asphalt);
  p.set(Math.round(cx) - 2, Math.round(cy) - 4, P.asphalt);
  // hub nuts: the pair turns with the wheel
  const [dx, dy] = k ? [1, -1] : [-1, -1];
  p.set(Math.round(cx) + dx, Math.round(cy) + dy, P.glint);
  p.set(Math.round(cx) - dx, Math.round(cy) - dy, P.asphalt);
}

/**
 * Side view facing right, 62×32 (feet = the tyres' contact line at the
 * bottom). A cab-over kei truck (QA round 3: the old one was lower than
 * Minato's shoulder): the roof stands ~28px up, a head over a 24px boy,
 * 58px bumper to bumper.
 */
function truckSide(k: number): HTMLCanvasElement {
  const p = new PixelCanvas(62, 32);
  const W = P.white;
  const G = P.concreteLt;
  // ---- underbody, bumpers
  p.rect(4, 22, 52, 4, P.charcoal);
  p.hline(4, 55, 25, P.ink);
  p.rect(1, 20, 4, 4, P.steel); // rear bumper
  p.hline(1, 4, 20, G);
  p.rect(54, 21, 6, 3, P.steel); // front bumper
  p.hline(54, 59, 21, G);
  p.set(59, 23, P.charcoal);
  // ---- the bed and its gate (三方開: hinged sides)
  p.rect(3, 13, 34, 9, W);
  p.hline(3, 36, 13, P.glint);
  p.hline(3, 36, 14, G);
  p.hline(3, 36, 17, G); // the pressed rib
  p.hline(3, 36, 18, P.concrete);
  p.hline(3, 36, 21, P.concrete);
  for (const x of [14, 26]) {
    p.vline(x, 14, 21, P.concrete); // gate hinges / stakes
    p.set(x, 15, P.steel);
  }
  // rope hooks under the gate
  for (const x of [6, 20, 33]) p.set(x, 21, P.steel);
  p.rect(2, 17, 2, 3, P.red); // tail light
  p.set(2, 17, P.vermLt);
  // ---- the load, above the gate: beer crates, a vegetable box with daikon leaves, a folded tarp
  p.rect(4, 7, 10, 6, P.gold); // yellow crate
  p.hline(4, 13, 7, P.goldPale);
  p.rect(5, 9, 8, 2, P.brassOld); // hand hole
  p.vline(13, 8, 12, P.brass);
  p.rect(15, 6, 11, 7, P.woodLt); // cardboard box of vegetables
  p.hline(15, 25, 6, P.paperGrid);
  p.vline(25, 7, 12, P.wood);
  p.rect(17, 9, 5, 2, P.leafShade); // printed label
  p.set(18, 9, P.leafYoung);
  // daikon leaves spilling out of the top
  for (const [x, y, c] of [
    [16, 5, P.leaf], [17, 4, P.leafYoung], [18, 3, P.leafLt], [19, 4, P.leaf], [20, 5, P.leafDeep],
    [21, 3, P.leafYoung], [22, 4, P.leaf], [23, 5, P.leafShade], [18, 5, P.leafDeep], [22, 2, P.leafLt],
  ] as [number, number, string][])
    p.set(x, y, c);
  p.rect(27, 9, 8, 4, P.blue); // folded blue tarp
  p.hline(27, 34, 9, P.aqua);
  p.hline(27, 34, 11, P.navy);
  p.set(29, 10, P.glint);
  // ---- the headboard guard (鳥居): a steel pipe frame behind the cab
  p.vline(37, 4, 21, P.steel);
  p.vline(38, 4, 21, P.concrete);
  p.hline(37, 39, 4, G);
  for (const y of [8, 12]) p.hline(37, 38, y, P.asphalt);
  // ---- the cab (cab-over: flat face, the front wheel under the seat)
  p.rect(39, 3, 16, 20, W);
  p.hline(40, 54, 2, W); // rounded roof
  p.hline(40, 53, 2, P.glint);
  p.hline(39, 54, 3, P.glint);
  // the face: a gentle slope at the top, then straight down
  p.line(55, 3, 57, 9, W);
  p.rect(55, 9, 3, 13, W);
  p.line(56, 3, 58, 9, P.concrete);
  p.vline(58, 9, 20, P.concrete);
  // side window and the windscreen seen edge-on
  p.rect(41, 5, 9, 7, P.navy);
  p.hline(41, 49, 5, P.blue);
  p.vline(41, 6, 11, P.blue);
  p.line(43, 10, 47, 6, P.aqua); // the sky in the glass
  p.line(44, 10, 48, 6, P.blue);
  p.line(51, 4, 55, 11, P.navy); // windscreen
  p.line(52, 4, 56, 11, P.blue);
  p.set(53, 5, P.aqua);
  // the driver: a cap and a shoulder behind the glass
  p.rect(45, 7, 3, 2, P.charcoal);
  p.hline(44, 48, 7, P.leafShade); // cap brim, a farmer's
  p.rect(44, 10, 4, 2, P.shadeDeep);
  // door, handle, mirror, step
  p.vline(50, 5, 20, P.concrete);
  p.vline(40, 12, 20, P.concrete);
  p.hline(46, 48, 14, P.steel);
  p.set(58, 7, P.charcoal); // mirror arm
  p.rect(59, 6, 2, 3, P.charcoal);
  p.set(59, 6, P.asphalt);
  // a farm's name on the door: 「字らしい線」 in green
  p.hline(42, 48, 17, P.leafShade);
  p.set(43, 16, P.leafShade);
  p.set(46, 16, P.leafShade);
  p.set(48, 18, P.leafShade);
  // headlight, indicator, grille slot on the face
  p.rect(56, 15, 2, 2, P.goldPale);
  p.set(56, 15, P.glint);
  p.set(57, 18, P.sun);
  p.hline(55, 57, 13, P.concrete);
  // lower body shading and the wheel arches
  shadeRect(p, 39, 20, 19, 3, 1);
  shadeRect(p, 3, 20, 34, 2, 1);
  // the wheel arches: dark hollows cut into the body above each tyre
  for (const cx of [11, 47])
    for (let y = 19; y <= 25; y++)
      for (let x = cx - 7; x <= cx + 7; x++) if (Math.hypot(x - cx, (y - 26) * 1.05) <= 6.6) p.set(x, y, P.ink);
  wheel(p, 11, 26, k);
  wheel(p, 47, 26, k);
  // dried mud on the sills and the tyres' shoulders
  for (const x of [5, 6, 17, 18, 30, 41, 42, 53]) p.set(x, 21, P.brassOld);
  p.set(4, 20, P.brassOld);
  finish(p, { soft: true });
  return p.toCanvas();
}

function flipX(c: HTMLCanvasElement): HTMLCanvasElement {
  const o = document.createElement('canvas');
  o.width = c.width;
  o.height = c.height;
  const x = o.getContext('2d')!;
  x.translate(c.width, 0);
  x.scale(-1, 1);
  x.drawImage(c, 0, 0);
  return o;
}

/** Front view (coming towards the camera), 30×32: the flat face, a yellow kei plate. */
function truckFront(k: number): HTMLCanvasElement {
  const p = new PixelCanvas(30, 32);
  const W = P.white;
  p.rect(3, 3, 24, 21, W);
  p.hline(4, 25, 2, W);
  p.hline(4, 25, 2, P.glint);
  p.hline(3, 26, 3, P.glint);
  // windscreen: the sky in the upper left, the driver behind the wheel
  p.rect(5, 5, 20, 8, P.navy);
  p.hline(5, 24, 5, P.blue);
  p.line(6, 11, 11, 6, P.aqua);
  p.line(7, 11, 12, 6, P.blue);
  p.line(16, 12, 20, 8, P.blue);
  p.rect(18, 8, 3, 2, P.charcoal); // driver, on the right
  p.hline(17, 21, 8, P.leafShade);
  p.rect(17, 11, 5, 2, P.shadeDeep);
  p.hline(8, 14, 12, P.asphalt); // wheel
  // wiper arms
  p.line(7, 13, 11, 12, P.charcoal);
  p.line(16, 13, 20, 12, P.charcoal);
  // the face: headlights, indicators, a grille slot, the maker's badge
  p.rect(4, 15, 4, 3, P.goldPale);
  p.set(4, 15, P.glint);
  p.rect(22, 15, 4, 3, P.goldPale);
  p.set(22, 15, P.glint);
  p.set(4, 18, P.sun);
  p.set(25, 18, P.sun);
  p.rect(10, 16, 10, 2, P.steel);
  p.hline(10, 19, 16, P.concrete);
  p.set(14, 15, P.steel);
  p.set(15, 15, P.steel);
  shadeRect(p, 3, 19, 24, 5, 1);
  // bumper and the yellow kei plate
  p.rect(2, 21, 26, 3, P.steel);
  p.hline(2, 27, 21, P.concreteLt);
  p.rect(10, 20, 10, 4, P.gold);
  p.strokeRect(10, 20, 10, 4, P.brassOld);
  p.hline(12, 17, 22, P.charcoal);
  p.set(12, 21, P.charcoal);
  // mirrors on stalks
  p.rect(0, 7, 2, 3, P.charcoal);
  p.set(2, 8, P.charcoal);
  p.rect(28, 7, 2, 3, P.charcoal);
  p.set(27, 8, P.charcoal);
  // tyres under the body
  for (const x of [4, 21]) {
    p.rect(x, 24, 5, 7, P.ink);
    p.vline(x + 1, 25, 30, P.charcoal);
    p.set(x + 2 + k, 26 + (k ? 2 : 0), P.asphalt);
  }
  p.rect(9, 24, 12, 2, P.charcoal);
  finish(p, { soft: true });
  return p.toCanvas();
}

/** Rear view (driving away), 30×32: the guard frame, the load, the tailgate, the plate. */
function truckBack(k: number): HTMLCanvasElement {
  const p = new PixelCanvas(30, 32);
  const W = P.white;
  // cab back and its small rear window, behind the pipe guard
  p.rect(5, 2, 20, 10, W);
  p.hline(5, 24, 2, P.glint);
  p.rect(8, 4, 14, 4, P.navy);
  p.hline(8, 21, 4, P.blue);
  p.rect(13, 5, 3, 2, P.charcoal); // the driver's head
  p.rect(3, 1, 24, 2, P.steel); // guard frame
  p.hline(3, 26, 1, P.concreteLt);
  p.vline(3, 1, 13, P.steel);
  p.vline(26, 1, 13, P.steel);
  // the load over the gate
  p.rect(3, 10, 24, 5, P.gold);
  p.hline(3, 26, 10, P.goldPale);
  p.rect(5, 9, 8, 5, P.woodLt);
  p.hline(5, 12, 9, P.paperGrid);
  p.set(7, 8, P.leaf);
  p.set(8, 7, P.leafYoung);
  p.set(10, 8, P.leafDeep);
  p.rect(16, 11, 8, 3, P.blue);
  p.hline(16, 23, 11, P.aqua);
  // tailgate with its ribs, the plate in the middle
  p.rect(2, 14, 26, 8, W);
  p.hline(2, 27, 14, P.glint);
  p.hline(2, 27, 17, P.concreteLt);
  p.hline(2, 27, 18, P.concrete);
  p.rect(10, 17, 10, 4, P.gold);
  p.strokeRect(10, 17, 10, 4, P.brassOld);
  p.hline(12, 17, 19, P.charcoal);
  // combination lamps
  p.rect(2, 15, 3, 5, P.red);
  p.set(2, 15, P.vermLt);
  p.rect(25, 15, 3, 5, P.red);
  p.set(25, 15, P.vermLt);
  shadeRect(p, 2, 20, 26, 2, 1);
  p.rect(2, 22, 26, 2, P.charcoal);
  p.hline(2, 27, 23, P.ink);
  for (const x of [4, 21]) {
    p.rect(x, 24, 5, 7, P.ink);
    p.vline(x + 1, 25, 30, P.charcoal);
    p.set(x + 2 - k, 26 + (k ? 2 : 0), P.asphalt);
  }
  finish(p, { soft: true });
  return p.toCanvas();
}

// ---------------------------------------------------------------- ツガオ便 (2026-09-28)
// The same kei truck as ツガオ便 on 星見台 (52_ch2 10.6, art/props/hoshi_tsugaobin):
// olive, the yellow crates of vegetables on the bed, 「青果 ツガオ便」 in white
// strokes on the door (not to be read), the clipboard of slips on the gate.
// Drawn at the town's scale (62×32, the white truck's lines). ツガオ drives in
// his olive work cap ('cap'); after 17:00 he sleeps in the driver's seat in
// his white nightcap with navy spots ('nap', the pompom nodding every 2 s).

const OLIVE = '#5A6B2A';
const OLIVE_LT = '#7A8B3A';
const OLIVE_DK = '#3A4A1A';
/** His khaki work jumper (chars' npc_tsugao). */
const KHAKI = '#8A7A4A';
/** His sideburns under the cap. */
const HAIR = '#1B1733';

type Driver = 'cap' | 'nap';

/** A yellow crate (収穫コンテナ): the pale top edge, the brass side, a hand hole. */
function crate(p: PixelCanvas, x: number, y: number, w: number, h: number): void {
  p.rect(x, y, w, h, P.gold);
  p.hline(x, x + w - 1, y, P.goldPale);
  p.vline(x + w - 1, y + 1, y + h - 1, P.brass);
  p.hline(x + 2, x + 4, y + 2, P.brassOld);
}

/** Tomatoes and greens over the top of a crate (a row of bumps at `y`). */
function produce(p: PixelCanvas, x: number, y: number, kind: 'tomato' | 'green'): void {
  if (kind === 'tomato')
    for (const dx of [0, 2, 4]) {
      p.rect(x + dx, y, 2, 2, P.red);
      p.set(x + dx, y, P.vermLt);
      p.set(x + dx + 1, y - 1, P.leafShade);
    }
  else
    for (const [dx, dy, c] of [
      [0, 1, P.leaf], [1, 0, P.leafYoung], [2, 1, P.leafDeep], [3, 0, P.leafLt], [4, 1, P.leaf], [5, 0, P.leafYoung],
    ] as [number, number, string][])
      p.set(x + dx, y + dy, c);
}

/** ツガオ at the side window (the window is x41–49, y5–11). `b`: the sleeper's head 1px down. */
function sideDriver(p: PixelCanvas, d: Driver, b: number): void {
  p.rect(44, 10, 5, 2, KHAKI); // shoulders
  if (d === 'cap') {
    // the olive work cap, its brim forward; a sideburn, a thin eye, a still face
    p.rect(46, 8, 3, 2, P.skin4);
    p.set(46, 8, HAIR);
    p.set(48, 8, P.ink);
    p.rect(45, 6, 4, 2, OLIVE);
    p.hline(45, 47, 6, OLIVE_LT);
    p.set(49, 7, OLIVE_DK);
  } else {
    // asleep: the head tipped back, the white nightcap with navy spots, its pompom
    p.rect(46, 8 + b, 3, 2, P.skin4);
    p.hline(47, 48, 9 + b, P.skin3);
    p.hline(45, 48, 7 + b, P.white);
    p.hline(46, 48, 6 + b, P.white);
    p.set(44, 6 + b, P.white);
    p.set(45, 6 + b, P.white);
    p.set(47, 7 + b, P.navy);
    p.set(46, 6 + b, P.navy);
    p.set(43, 5 + b, P.concreteLt); // the pompom
    p.set(44, 5 + b, P.white);
  }
}

/** ツガオ便 side view facing right, 62×32 (the white truck's shape). */
function tsugaoSide(k: number, d: Driver, b: number): HTMLCanvasElement {
  const p = new PixelCanvas(62, 32);
  // ---- underbody, bumpers
  p.rect(4, 22, 52, 4, P.charcoal);
  p.hline(4, 55, 25, P.ink);
  p.rect(1, 20, 4, 4, P.steel); // rear bumper
  p.hline(1, 4, 20, P.concreteLt);
  p.rect(54, 21, 6, 3, P.steel); // front bumper
  p.hline(54, 59, 21, P.concreteLt);
  p.set(59, 23, P.charcoal);
  // ---- the bed and its gate, olive
  p.rect(3, 13, 34, 9, OLIVE);
  p.hline(3, 36, 13, OLIVE_LT);
  p.hline(3, 36, 17, OLIVE_LT); // the pressed rib
  p.hline(3, 36, 18, OLIVE_DK);
  p.rect(3, 20, 34, 2, OLIVE_DK);
  for (const x of [14, 26]) {
    p.vline(x, 14, 21, OLIVE_DK); // gate hinges / stakes
    p.set(x, 15, P.steel);
  }
  for (const x of [8, 20, 33]) p.set(x, 21, P.steel); // rope hooks
  p.rect(2, 17, 2, 3, P.red); // tail light
  p.set(2, 17, P.vermLt);
  // the clipboard of slips hung on the gate
  p.rect(5, 15, 3, 4, P.woodLt);
  p.hline(5, 7, 16, P.white);
  p.hline(5, 7, 17, P.paperGrid);
  p.set(6, 15, P.steel);
  // ---- the load: yellow crates, two tiers, tomatoes and greens on top
  for (const x of [4, 12, 20, 28]) crate(p, x, 7, 8, 6);
  crate(p, 10, 3, 8, 4);
  crate(p, 18, 3, 8, 4);
  produce(p, 11, 1, 'tomato');
  produce(p, 19, 1, 'green');
  produce(p, 29, 5, 'tomato');
  // ---- the headboard guard (鳥居): a steel pipe frame behind the cab
  p.vline(37, 4, 21, P.steel);
  p.vline(38, 4, 21, P.concrete);
  p.hline(37, 39, 4, P.concreteLt);
  for (const y of [8, 12]) p.hline(37, 38, y, P.asphalt);
  // ---- the cab (cab-over), olive
  p.rect(39, 3, 16, 20, OLIVE);
  p.hline(40, 53, 2, OLIVE_LT); // rounded roof
  p.hline(39, 54, 3, OLIVE_LT);
  p.line(55, 3, 57, 9, OLIVE);
  p.rect(55, 9, 3, 13, OLIVE);
  p.line(56, 3, 58, 9, OLIVE_DK);
  p.vline(58, 9, 20, OLIVE_DK);
  p.rect(39, 20, 19, 2, OLIVE_DK);
  // side window, the sky in the glass behind him, the windscreen edge-on
  p.rect(41, 5, 9, 7, P.navy);
  p.hline(41, 49, 5, P.blue);
  p.vline(41, 6, 11, P.blue);
  p.line(42, 9, 44, 7, P.aqua);
  p.line(51, 4, 55, 11, P.navy);
  p.line(52, 4, 56, 11, P.blue);
  p.set(53, 5, P.aqua);
  sideDriver(p, d, b);
  // door, handle, mirror
  p.vline(50, 5, 20, OLIVE_DK);
  p.vline(40, 12, 20, OLIVE_DK);
  p.hline(46, 48, 13, P.steel);
  p.set(58, 7, P.charcoal);
  p.rect(59, 6, 2, 3, P.charcoal);
  p.set(59, 6, P.asphalt);
  // 「青果 ツガオ便」 on the door: a white panel, its letters dots too small
  // to read (no stroke may look like a word)
  p.rect(42, 15, 7, 3, P.white);
  for (const x of [43, 45, 47]) p.set(x, 16, OLIVE_DK);
  // headlight, indicator, grille slot on the face
  p.rect(56, 15, 2, 2, P.goldPale);
  p.set(56, 15, P.glint);
  p.set(57, 18, P.sun);
  p.hline(55, 57, 13, OLIVE_DK);
  // the wheel arches: dark hollows cut into the body above each tyre
  for (const cx of [11, 47])
    for (let y = 19; y <= 25; y++)
      for (let x = cx - 7; x <= cx + 7; x++) if (Math.hypot(x - cx, (y - 26) * 1.05) <= 6.6) p.set(x, y, P.ink);
  wheel(p, 11, 26, k);
  wheel(p, 47, 26, k);
  // dried mud from the farm roads on the sills
  for (const x of [5, 6, 17, 18, 30, 41, 42, 53]) p.set(x, 21, P.brassOld);
  p.set(4, 20, P.brassOld);
  finish(p, { soft: true });
  return p.toCanvas();
}

/** ツガオ便 front view, 30×32 (the U-turn): olive, the driver behind the glass. */
function tsugaoFront(k: number, d: Driver, b: number): HTMLCanvasElement {
  const p = new PixelCanvas(30, 32);
  p.rect(3, 3, 24, 21, OLIVE);
  p.hline(4, 25, 2, OLIVE_LT);
  p.hline(3, 26, 3, OLIVE_LT);
  // windscreen: the sky in the upper left, ツガオ behind the wheel
  p.rect(5, 5, 20, 8, P.navy);
  p.hline(5, 24, 5, P.blue);
  p.line(6, 11, 10, 7, P.aqua);
  p.rect(16, 11, 6, 2, KHAKI);
  if (d === 'cap') {
    p.rect(17, 9, 4, 2, P.skin4);
    p.set(17, 9, HAIR);
    p.set(20, 9, HAIR);
    p.rect(17, 7, 4, 2, OLIVE);
    p.hline(16, 21, 8, OLIVE_DK); // the brim
    p.hline(17, 19, 7, OLIVE_LT);
  } else {
    p.rect(17, 9 + b, 4, 2, P.skin4);
    p.rect(17, 7 + b, 4, 2, P.white);
    p.set(18, 7 + b, P.navy);
    p.set(20, 8 + b, P.navy);
    p.set(21, 6 + b, P.white);
    p.set(22, 6 + b, P.concreteLt); // the pompom
  }
  p.hline(8, 14, 12, P.asphalt); // wheel
  p.line(7, 13, 11, 12, P.charcoal); // wiper arms
  p.line(16, 13, 20, 12, P.charcoal);
  // the face: headlights, indicators, a grille slot
  p.rect(4, 15, 4, 3, P.goldPale);
  p.set(4, 15, P.glint);
  p.rect(22, 15, 4, 3, P.goldPale);
  p.set(22, 15, P.glint);
  p.set(4, 18, P.sun);
  p.set(25, 18, P.sun);
  p.rect(10, 16, 10, 2, OLIVE_DK);
  p.hline(10, 19, 16, P.steel);
  p.rect(3, 19, 24, 5, OLIVE_DK);
  // bumper and the yellow kei plate
  p.rect(2, 21, 26, 3, P.steel);
  p.hline(2, 27, 21, P.concreteLt);
  p.rect(10, 20, 10, 4, P.gold);
  p.strokeRect(10, 20, 10, 4, P.brassOld);
  p.hline(12, 17, 22, P.charcoal);
  p.set(12, 21, P.charcoal);
  // mirrors on stalks
  p.rect(0, 7, 2, 3, P.charcoal);
  p.set(2, 8, P.charcoal);
  p.rect(28, 7, 2, 3, P.charcoal);
  p.set(27, 8, P.charcoal);
  for (const x of [4, 21]) {
    p.rect(x, 24, 5, 7, P.ink);
    p.vline(x + 1, 25, 30, P.charcoal);
    p.set(x + 2 + k, 26 + (k ? 2 : 0), P.asphalt);
  }
  p.rect(9, 24, 12, 2, P.charcoal);
  finish(p, { soft: true });
  return p.toCanvas();
}

/** ツガオ便 rear view, 30×32 (driving away): the guard, the yellow crates, the olive tailgate. */
function tsugaoBack(k: number): HTMLCanvasElement {
  const p = new PixelCanvas(30, 32);
  p.rect(5, 2, 20, 10, OLIVE);
  p.hline(5, 24, 2, OLIVE_LT);
  p.rect(8, 4, 14, 4, P.navy);
  p.hline(8, 21, 4, P.blue);
  p.rect(13, 5, 3, 2, OLIVE); // the back of his cap
  p.rect(3, 1, 24, 2, P.steel); // guard frame
  p.hline(3, 26, 1, P.concreteLt);
  p.vline(3, 1, 13, P.steel);
  p.vline(26, 1, 13, P.steel);
  // the load over the gate: three yellow crates, tomatoes and greens
  for (const x of [3, 11, 19]) crate(p, x, 9, 8, 5);
  produce(p, 4, 7, 'tomato');
  produce(p, 20, 7, 'green');
  // tailgate with its ribs, the plate in the middle
  p.rect(2, 14, 26, 8, OLIVE);
  p.hline(2, 27, 14, OLIVE_LT);
  p.hline(2, 27, 17, OLIVE_LT);
  p.hline(2, 27, 18, OLIVE_DK);
  p.rect(10, 17, 10, 4, P.gold);
  p.strokeRect(10, 17, 10, 4, P.brassOld);
  p.hline(12, 17, 19, P.charcoal);
  p.rect(2, 15, 3, 5, P.red); // combination lamps
  p.set(2, 15, P.vermLt);
  p.rect(25, 15, 3, 5, P.red);
  p.set(25, 15, P.vermLt);
  p.rect(2, 20, 26, 2, OLIVE_DK);
  p.rect(2, 22, 26, 2, P.charcoal);
  p.hline(2, 27, 23, P.ink);
  for (const x of [4, 21]) {
    p.rect(x, 24, 5, 7, P.ink);
    p.vline(x + 1, 25, 30, P.charcoal);
    p.set(x + 2 - k, 26 + (k ? 2 : 0), P.asphalt);
  }
  finish(p, { soft: true });
  return p.toCanvas();
}

/** Vehicle ids: the white truck of the first build, and ツガオ便 awake / asleep. */
export const TSUGAO_TRUCK = 'tsugao_truck';
export const TSUGAO_TRUCK_NAP = 'tsugao_truck_nap';

function build(id: string): VehicleArt {
  if (id === TSUGAO_TRUCK || id === TSUGAO_TRUCK_NAP) {
    const d: Driver = id === TSUGAO_TRUCK_NAP ? 'nap' : 'cap';
    const right = [tsugaoSide(0, d, 0), tsugaoSide(1, d, 0)];
    const art: VehicleArt = {
      frames: {
        right,
        left: right.map(flipX),
        down: [tsugaoFront(0, d, 0), tsugaoFront(1, d, 0)],
        up: [tsugaoBack(0), tsugaoBack(1)],
      },
    };
    if (d === 'nap') {
      const r1 = tsugaoSide(0, d, 1);
      art.breath = { right: [r1], left: [flipX(r1)], down: [tsugaoFront(0, d, 1)], up: [art.frames.up[0]] };
    }
    return art;
  }
  const right = [truckSide(0), truckSide(1)];
  return {
    frames: {
      right,
      left: right.map(flipX),
      down: [truckFront(0), truckFront(1)],
      up: [truckBack(0), truckBack(1)],
    },
  };
}

/** Frame of a vehicle facing `view`; the wheels turn while `moving` (a sleeper at the wheel breathes while it stands). */
export function vehicleFrame(id: string, view: VehicleView, t: number, moving: boolean): HTMLCanvasElement {
  let a = cache.get(id);
  if (!a) {
    a = build(id);
    cache.set(id, a);
  }
  if (!moving && a.breath && Math.floor(t / 2000) % 2 === 1) return a.breath[view][0];
  const fr = a.frames[view];
  return fr[moving ? Math.floor(t / 90) % fr.length : 0];
}
