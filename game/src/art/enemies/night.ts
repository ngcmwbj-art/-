// 第2章の敵のドット絵の光 (51 8.0): the only light in the night village is
// the tomato lantern, low in front on the left (a highlight on the lower
// left faces, a 1px #F2894B rim on the left and bottom edges), with a faint
// starlight from above (a 1px #8E95C8 rim on the top edges). Shadows fall to
// the upper right and lean blue-violet; the outline is #2A2440 and the
// darkest shade #0B0B14 (never pure black).

import type { PixelCanvas } from '../../engine/pixel';
import { mixU32, NIGHT_LIGHT, shade, type Mask, type Ramp, type ShadeOpts } from './lib';

export const LANTERN = '#F2894B';
export const STARLIGHT = '#8E95C8';
export const INK = '#2A2440';

/** shade() lit by the lantern (low front left), brighter toward the lower left. */
export function nshade(p: PixelCanvas, m: Mask, ramp: Ramp, o: ShadeOpts = {}): void {
  shade(p, m, ramp, { light: NIGHT_LIGHT, gradDir: [-1, 1], ...o });
}

/**
 * The night's rims on a finished sprite, before its outline: the left and
 * bottom edges catch the lantern (#F2894B, `rim`), the top edges the stars
 * (#8E95C8, `star`). `skip(x, y)` leaves a pixel alone (eyes, emissive bits).
 */
export function nightRim(p: PixelCanvas, rim = 0.55, star = 0.4, skip?: (x: number, y: number) => boolean): void {
  const W = p.w;
  const H = p.h;
  const src = p.data.slice();
  const on = (x: number, y: number) => x >= 0 && y >= 0 && x < W && y < H && src[y * W + x] >>> 24 !== 0;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (!on(x, y) || skip?.(x, y)) continue;
      const v = src[y * W + x];
      const l = !on(x - 1, y);
      const b = !on(x, y + 1);
      const t = !on(x, y - 1);
      if (l || b) p.set(x, y, mixU32(v, LANTERN, Math.min(0.85, rim * (l && b ? 1.25 : 1))));
      else if (t) p.set(x, y, mixU32(v, STARLIGHT, star));
    }
}

/** Rims, then the ink outline (the usual finish of a chapter-2 sprite). */
export function nightFinish(p: PixelCanvas, rim = 0.55, star = 0.4, skip?: (x: number, y: number) => boolean): void {
  nightRim(p, rim, star, skip);
  p.outline(INK);
}

/** Tint the top `frac` of the opaque pixels toward `c` (the blush of a tomato that was seen). */
export function tintTop(p: PixelCanvas, frac: number, c: string, amt: number): void {
  let y0 = p.h;
  let y1 = 0;
  for (let y = 0; y < p.h; y++)
    for (let x = 0; x < p.w; x++)
      if (p.data[y * p.w + x] >>> 24) {
        y0 = Math.min(y0, y);
        y1 = Math.max(y1, y);
      }
  const lim = y0 + (y1 - y0) * frac;
  for (let y = y0; y <= lim; y++)
    for (let x = 0; x < p.w; x++) {
      const v = p.data[y * p.w + x];
      if (!(v >>> 24)) continue;
      const k = amt * (1 - (y - y0) / Math.max(1, lim - y0 + 1)) * 1.3;
      p.set(x, y, mixU32(v, c, Math.min(amt, k)));
    }
}
