// Vehicles that drive through the town in stage 0 (QA round 1: the streets
// had no traffic at all). A white kei truck (軽トラ) with vegetable crates and
// a folded tarp on the bed: side view (right; left is the mirror), front and
// rear views for the turn, two wheel frames each. The world's traffic
// (world/npc.ts 'route' with a vehicle) draws them through an actor.

import { PixelCanvas } from '../../engine/pixel';
import { P } from '../tiles/palette';
import { finish, shadeRect } from './kit';

export type VehicleView = 'left' | 'right' | 'up' | 'down';

interface VehicleArt {
  frames: Record<VehicleView, HTMLCanvasElement[]>;
}

const cache = new Map<string, VehicleArt>();

function wheel(p: PixelCanvas, cx: number, cy: number, k: number): void {
  p.ellipse(cx, cy, 3.6, 3.6, P.ink);
  p.ellipse(cx, cy, 2.4, 2.4, P.charcoal);
  p.set(Math.round(cx), Math.round(cy), P.steel);
  // a spoke glint that turns
  const [dx, dy] = k ? [1, -1] : [-1, -1];
  p.set(Math.round(cx) + dx, Math.round(cy) + dy, P.concrete);
  p.set(Math.round(cx) - dx, Math.round(cy) - dy, P.asphalt);
}

/** Side view facing right, 46×24 (feet = the wheels' contact line at the bottom). */
function truckSide(k: number): HTMLCanvasElement {
  const p = new PixelCanvas(46, 24);
  const W = P.white;
  // chassis & bumper
  p.rect(2, 16, 42, 3, P.charcoal);
  p.rect(40, 14, 5, 4, P.steel); // front bumper
  p.hline(40, 44, 14, P.concreteLt);
  p.rect(1, 14, 3, 4, P.steel); // rear bumper
  p.set(1, 15, P.red); // tail light
  p.set(1, 14, P.vermLt);
  // flat bed with sideboards (the gate)
  p.rect(2, 10, 27, 6, W);
  p.hline(2, 28, 10, P.glint);
  p.hline(2, 28, 13, P.concreteLt);
  p.hline(2, 28, 15, P.concrete);
  for (const x of [11, 20]) p.vline(x, 11, 15, P.concreteLt); // hinges / stakes
  // the bed seen from above: crates and a folded tarp
  p.rect(3, 5, 9, 5, P.gold); // beer crate
  p.hline(3, 11, 5, P.goldPale);
  p.rect(4, 7, 7, 2, P.brassOld);
  p.rect(13, 4, 8, 6, P.woodLt); // vegetable box
  p.hline(13, 20, 4, P.paperGrid);
  p.set(15, 5, P.leaf);
  p.set(17, 5, P.leafYoung);
  p.set(18, 6, P.verm);
  p.rect(22, 6, 6, 4, P.blue); // folded tarp
  p.hline(22, 27, 6, P.aqua);
  p.set(24, 8, P.navy);
  // back panel of the cab + cab
  p.rect(29, 3, 2, 13, P.concrete);
  p.rect(30, 2, 11, 14, W);
  p.hline(30, 40, 2, P.glint);
  // side window and the slanted windscreen
  p.rect(31, 4, 6, 5, P.navy);
  p.hline(31, 36, 4, P.blue);
  p.set(32, 5, P.aqua);
  p.set(33, 6, P.aqua);
  p.line(38, 3, 41, 9, P.navy);
  p.line(39, 3, 42, 9, P.blue);
  p.rect(41, 9, 3, 5, W); // bonnet (short)
  p.hline(41, 43, 9, P.concreteLt);
  p.set(44, 11, P.goldPale); // headlight
  p.set(44, 12, P.gold);
  // driver's shoulder behind the glass
  p.set(34, 7, P.charcoal);
  p.set(35, 7, P.charcoal);
  p.set(34, 8, P.shadeDeep);
  // door line and mirror
  p.vline(37, 9, 15, P.concrete);
  p.set(38, 11, P.steel);
  p.set(40, 5, P.charcoal); // mirror
  // lower body shading
  shadeRect(p, 30, 14, 11, 2, 1);
  wheel(p, 9, 19.5, k);
  wheel(p, 36, 19.5, k);
  // mud on the sills
  for (const x of [5, 6, 14, 26, 31]) p.set(x, 15, P.brassOld);
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

/** Front view (coming towards the camera), 22×24. */
function truckFront(k: number): HTMLCanvasElement {
  const p = new PixelCanvas(22, 24);
  const W = P.white;
  p.rect(2, 3, 18, 15, W);
  p.hline(2, 19, 3, P.glint);
  p.rect(4, 5, 14, 5, P.navy); // windscreen
  p.hline(4, 17, 5, P.blue);
  p.line(6, 9, 10, 5, P.aqua);
  p.set(9, 8, P.charcoal); // driver
  p.set(9, 9, P.shadeDeep);
  p.rect(3, 11, 16, 3, W);
  p.rect(3, 12, 3, 2, P.goldPale); // headlights
  p.rect(16, 12, 3, 2, P.goldPale);
  p.rect(8, 12, 6, 2, P.steel); // grille
  p.rect(2, 15, 18, 3, P.steel); // bumper
  p.hline(2, 19, 15, P.concreteLt);
  p.rect(8, 16, 6, 2, P.white); // plate
  p.set(10, 16, P.leafShade);
  p.set(12, 16, P.leafShade);
  for (const x of [2, 16]) {
    p.rect(x, 18, 4, 4, P.ink);
    p.set(x + 1 + k, 19, P.asphalt);
  }
  p.set(0, 6, P.charcoal); // mirrors
  p.set(21, 6, P.charcoal);
  finish(p, { soft: true });
  return p.toCanvas();
}

/** Rear view (driving away), 22×24: the tailgate, the cargo, the plate. */
function truckBack(k: number): HTMLCanvasElement {
  const p = new PixelCanvas(22, 24);
  const W = P.white;
  p.rect(3, 2, 16, 6, W); // cab back
  p.rect(5, 3, 12, 3, P.navy);
  p.hline(5, 16, 3, P.blue);
  p.rect(2, 7, 18, 4, P.gold); // cargo top
  p.rect(4, 7, 6, 3, P.woodLt);
  p.rect(12, 8, 5, 2, P.blue);
  p.rect(2, 11, 18, 6, W); // tailgate
  p.hline(2, 19, 11, P.glint);
  p.hline(2, 19, 14, P.concreteLt);
  p.rect(8, 13, 6, 3, P.white);
  p.strokeRect(8, 13, 6, 3, P.steel);
  p.rect(2, 12, 2, 2, P.red); // tail lights
  p.rect(18, 12, 2, 2, P.red);
  p.rect(2, 17, 18, 2, P.charcoal);
  for (const x of [2, 16]) {
    p.rect(x, 18, 4, 4, P.ink);
    p.set(x + 2 - k, 19, P.asphalt);
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
