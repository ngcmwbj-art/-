// Overhead electric wires strung between utility poles (30_level_art 3.7):
// sagging parabolas, 1px #2A2440 wires and 2px #3A2B5C cables, drawn in the
// foreground layer. `staff` lines have five low wires (fushigi_03).

import type { Gfx } from '../../engine/gfx';
import { H, W } from '../../engine/screen';
import { P } from '../tiles/palette';

export interface WireLine {
  /** Pole positions (tile coords of the pole's footprint). */
  pts: [number, number][];
  /** Five parallel low wires (the "music staff"). */
  staff?: boolean;
  /** Service drop: a single cable from the first pole to a roof point (world px in `to`). */
  to?: [number, number];
}

export interface WireSet {
  lines: WireLine[];
  map: string;
}

/** Pole geometry: attachment points relative to the pole foot (world px). */
export const POLE = {
  height: 64,
  arm: 56, // crossarm height above the foot
  armSpan: [-7, 0, 7] as const,
  low: 44, // low cable height
};

export function poleFoot(tx: number, ty: number): [number, number] {
  return [tx * 16 + 8, ty * 16 + 13];
}

/** Sample point on a sagging span from a to b at t∈[0,1]. */
export function spanPoint(a: [number, number], b: [number, number], t: number, sag: number): [number, number] {
  const x = a[0] + (b[0] - a[0]) * t;
  const y = a[1] + (b[1] - a[1]) * t + sag * 4 * t * (1 - t);
  return [x, y];
}

let CULL = true;
function drawSpan(g: Gfx, a: [number, number], b: [number, number], sag: number, color: string, cx: number, cy: number, thick = 1, sway = 0): void {
  const minx = Math.min(a[0], b[0]) - cx;
  const maxx = Math.max(a[0], b[0]) - cx;
  const miny = Math.min(a[1], b[1]) - cy;
  const maxy = Math.max(a[1], b[1]) + sag - cy;
  if (CULL && (maxx < -4 || minx > W + 4 || maxy < -4 || miny > H + 4)) return;
  const len = Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]));
  const n = Math.max(2, Math.ceil(len));
  let px = Math.round(a[0] - cx);
  let py = Math.round(a[1] - cy);
  for (let i = 1; i <= n; i++) {
    const t = i / n;
    const [x, y] = spanPoint(a, b, t, sag + sway * Math.sin(t * Math.PI));
    const nx = Math.round(x - cx);
    const ny = Math.round(y - cy);
    if (nx !== px || ny !== py) {
      g.line(px, py, nx, ny, color);
      if (thick > 1) g.line(px, py + 1, nx, ny + 1, P.nightShade);
    }
    px = nx;
    py = ny;
  }
}

const baked = new Map<string, { c: HTMLCanvasElement; x0: number; y0: number }>();

/**
 * Draw the wires. They are baked once per map and sway phase (3 phases)
 * into a world-space layer, then blitted.
 */
export function drawWires(g: Gfx, set: WireSet, cx: number, cy: number, mt: number, stage: number, _t: number): void {
  const q = stage === 1 ? 0 : Math.round(Math.sin(mt / 1400) * 1.4);
  const key = set.map + ':' + q;
  let b = baked.get(key);
  if (!b) {
    // bounds of all spans
    let x0 = 1e9;
    let y0 = 1e9;
    let x1 = -1e9;
    let y1 = -1e9;
    for (const line of set.lines) {
      for (const pt of line.pts) {
        const [fx, fy] = poleFoot(...pt);
        x0 = Math.min(x0, fx - 16);
        x1 = Math.max(x1, fx + 16);
        y0 = Math.min(y0, fy - POLE.height - 4);
        y1 = Math.max(y1, fy + 16);
      }
      if (line.to) {
        x0 = Math.min(x0, line.to[0] - 4);
        x1 = Math.max(x1, line.to[0] + 4);
        y1 = Math.max(y1, line.to[1] + 16);
      }
    }
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.ceil(x1 - x0));
    c.height = Math.max(1, Math.ceil(y1 - y0));
    const ctx = c.getContext('2d')!;
    const bg = new (g.constructor as new (ctx: CanvasRenderingContext2D, w: number, h: number) => Gfx)(ctx, c.width, c.height);
    CULL = false;
    drawWiresRaw(bg, set, x0, y0, q * 0.45);
    CULL = true;
    b = { c, x0, y0 };
    baked.set(key, b);
  }
  g.ctx.drawImage(b.c, Math.round(b.x0 - cx), Math.round(b.y0 - cy));
}

function drawWiresRaw(g: Gfx, set: WireSet, cx: number, cy: number, sway: number): void {
  for (const line of set.lines) {
    if (line.to) {
      const [fx, fy] = poleFoot(...line.pts[0]);
      const a: [number, number] = [fx + 2, fy - POLE.low - 2];
      drawSpan(g, a, line.to, 5, P.ink, cx, cy, 1, sway * 0.5);
      continue;
    }
    for (let i = 0; i + 1 < line.pts.length; i++) {
      const [ax, ay] = poleFoot(...line.pts[i]);
      const [bx, by] = poleFoot(...line.pts[i + 1]);
      const dist = Math.hypot(bx - ax, by - ay);
      const sag = Math.min(10, 4 + dist / 36);
      // high wires on the crossarms (outer two dark, middle lighter)
      for (const o of POLE.armSpan) {
        if (o === 0) continue;
        drawSpan(g, [ax + o, ay - POLE.arm], [bx + o, by - POLE.arm], sag, P.nightShade, cx, cy, 1, sway);
      }
      if (line.staff) {
        for (let k = 0; k < 5; k++) drawSpan(g, [ax, ay - POLE.low + k * 3 - 6], [bx, by - POLE.low + k * 3 - 6], sag * 0.7, P.ink, cx, cy, 1, sway * 0.5);
      } else {
        drawSpan(g, [ax - 1, ay - POLE.low], [bx - 1, by - POLE.low], sag + 2, P.ink, cx, cy, 2, sway * 0.8);
        drawSpan(g, [ax + 3, ay - POLE.low + 5], [bx + 3, by - POLE.low + 5], sag + 3, P.nightShade, cx, cy, 1, sway);
      }
    }
  }
}

/** World position on the k-th staff wire between two poles at t. */
export function staffPoint(a: [number, number], b: [number, number], k: number, t: number): [number, number] {
  const [ax, ay] = poleFoot(...a);
  const [bx, by] = poleFoot(...b);
  const dist = Math.hypot(bx - ax, by - ay);
  const sag = Math.min(10, 4 + dist / 36) * 0.7;
  return spanPoint([ax, ay - POLE.low + k * 3 - 6], [bx, by - POLE.low + k * 3 - 6], t, sag);
}

/** World position on the low cable between two poles at t (sparrows perch here). */
export function lowPoint(a: [number, number], b: [number, number], t: number): [number, number] {
  const [ax, ay] = poleFoot(...a);
  const [bx, by] = poleFoot(...b);
  const dist = Math.hypot(bx - ax, by - ay);
  const sag = Math.min(10, 4 + dist / 36) + 3;
  return spanPoint([ax + 3, ay - POLE.low + 5], [bx + 3, by - POLE.low + 5], t, sag);
}
