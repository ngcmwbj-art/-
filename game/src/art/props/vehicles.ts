// Vehicles that drive through the town in stage 0 (QA round 1: the streets
// had no traffic at all). A white cab-over kei truck (軽トラ), a farmer's,
// with a crate, a box of daikon and a folded tarp on the bed: side view
// (right; left is the mirror), front and rear views for the U-turn, two
// wheel frames each. Sized against Minato (24px): the cab roof stands a head
// above him (QA round 3). The world's traffic
// (world/npc.ts 'route' with a vehicle) draws them through an actor.

import { PixelCanvas } from '../../engine/pixel';
import { P } from '../tiles/palette';
import { finish, shadeRect } from './kit';

export type VehicleView = 'left' | 'right' | 'up' | 'down';

interface VehicleArt {
  frames: Record<VehicleView, HTMLCanvasElement[]>;
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

function build(id: string): VehicleArt {
  void id;
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

/** Frame of a vehicle facing `view`; the wheels turn while `moving`. */
export function vehicleFrame(id: string, view: VehicleView, t: number, moving: boolean): HTMLCanvasElement {
  let a = cache.get(id);
  if (!a) {
    a = build(id);
    cache.set(id, a);
  }
  const fr = a.frames[view];
  return fr[moving ? Math.floor(t / 90) % fr.length : 0];
}
