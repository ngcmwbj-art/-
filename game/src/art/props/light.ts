// Light shapes for the renderer's light map (PropArt.light) and small glow
// helpers. Pools are pixel art: three flat steps of brightness joined by
// 2px checker-dithered bands (7.9: flat areas, checker dither only), never
// smooth radial gradients with a hard clip.

import type { Gfx } from '../../engine/gfx';
import { makeCanvas } from '../../engine/pixel';

const cache = new Map<string, HTMLCanvasElement>();

/** Quantise a 0..1 falloff into 3 steps with checker bands between them. */
function step(a: number, x: number, y: number): number {
  if (a <= 0) return 0;
  const v = Math.min(3, a * 3);
  const base = Math.floor(v);
  const frac = v - base;
  const up = frac >= 0.72 ? 1 : frac >= 0.28 ? (x + y) & 1 : 0;
  return Math.min(3, base + up) / 3;
}

function build(key: string, w: number, h: number, rgb: string, fall: (x: number, y: number) => number): HTMLCanvasElement {
  let c = cache.get(key);
  if (c) return c;
  const [cv, ctx] = makeCanvas(w, h);
  const id = ctx.createImageData(w, h);
  const [r, g, b] = rgb.split(',').map(Number);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const a = step(fall(x, y), x, y);
      if (a <= 0) continue;
      const i = (y * w + x) * 4;
      id.data[i] = r;
      id.data[i + 1] = g;
      id.data[i + 2] = b;
      id.data[i + 3] = Math.round(a * 255);
    }
  ctx.putImageData(id, 0, 0);
  c = cv;
  cache.set(key, c);
  return c;
}

/** Elliptical pool of light (rx × ry radii), brightest in the middle. */
export function poolEllipse(rx: number, ry: number, rgb: string): HTMLCanvasElement {
  rx = Math.round(rx);
  ry = Math.round(ry);
  return build(`e${rx},${ry},${rgb}`, rx * 2, ry * 2, rgb, (x, y) => {
    const dx = (x + 0.5 - rx) / rx;
    const dy = (y + 0.5 - ry) / ry;
    const d = Math.sqrt(dx * dx + dy * dy);
    return d >= 1 ? 0 : Math.min(1, (1 - d) * 1.35);
  });
}

/**
 * Light thrown out of a window or a doorway onto the ground: a trapezoid
 * `w0` wide at the wall, `w1` wide at the far end, `h` long, fading away
 * from the wall and at its sides.
 */
export function poolTrapezoid(w0: number, w1: number, h: number, rgb: string): HTMLCanvasElement {
  const W = Math.max(w0, w1);
  return build(`t${w0},${w1},${h},${rgb}`, W, h, rgb, (x, y) => {
    const k = (y + 0.5) / h;
    const half = (w0 + (w1 - w0) * k) / 2;
    const u = Math.abs(x + 0.5 - W / 2) / half;
    if (u >= 1) return 0;
    const side = Math.min(1, (1 - u) * 3);
    return (1 - k) * side * 1.15;
  });
}

/** Draw a light shape centred on (cx, cy) with strength a (the light map is additive). */
export function drawLight(g: Gfx, img: HTMLCanvasElement, cx: number, cy: number, a: number): void {
  if (a <= 0.004) return;
  const ctx = g.ctx;
  const prev = ctx.globalAlpha;
  ctx.globalAlpha = Math.min(1, a);
  ctx.drawImage(img, Math.round(cx - img.width / 2), Math.round(cy - img.height / 2));
  ctx.globalAlpha = prev;
}

/** Draw a light shape by its top-left corner. */
export function drawLightAt(g: Gfx, img: HTMLCanvasElement, x: number, y: number, a: number): void {
  if (a <= 0.004) return;
  const ctx = g.ctx;
  const prev = ctx.globalAlpha;
  ctx.globalAlpha = Math.min(1, a);
  ctx.drawImage(img, Math.round(x), Math.round(y));
  ctx.globalAlpha = prev;
}

/** Warm lamp colour (#F7C27A), street-lamp colour (#FFE7A3), window light (#F6D98A), TV (#7FD1E8). */
export const LIGHT = {
  lamp: '247,194,122',
  street: '255,231,163',
  window: '246,217,138',
  tv: '127,209,232',
  tube: '255,246,216',
};
