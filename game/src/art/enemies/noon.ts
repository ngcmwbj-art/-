// 第3章の敵のドット絵の光（61 9.0）：海ぞいの町は 真上からの 正午の 日ざし。上を 向いた 面に
// ハイライト（少し 黄に 寄せる）、上の 縁に 1px の #FFF6D8、下の 縁に 海の 照り返しの
// #8FD3E8 α50%。左右の 差は つけない（正午なので）。影は 真下、青みの 影色。輪郭は #2A2440、
// いちばん 暗い 所は #0B0B14。どの 敵にも ツガオの 黒い 判「まだ」（62 11.6）。

import type { PixelCanvas } from '../../engine/pixel';
import { hash2 } from '../../engine/rng';
import { mixU32, shade, type Mask, type Ramp, type ShadeOpts } from './lib';

export const INK = '#2A2440';
export const NOON_RIM = '#FFF6D8';
export const SEA_RIM = '#8FD3E8';
/** Straight above, a little toward the camera. */
export const NOON_LIGHT: [number, number, number] = [0, -0.86, 0.5];

/** shade() lit from straight above (brighter toward the top). */
export function sshade(p: PixelCanvas, m: Mask, ramp: Ramp, o: ShadeOpts = {}): void {
  shade(p, m, ramp, { light: NOON_LIGHT, gradDir: [0, -1], ...o });
}

/** The noon rims (top: the sun, bottom: the sea's glare), then the ink outline. */
export function noonFinish(p: PixelCanvas, top = 0.55, sea = 0.5, skip?: (x: number, y: number) => boolean): void {
  const W = p.w;
  const H = p.h;
  const src = p.data.slice();
  const on = (x: number, y: number) => x >= 0 && y >= 0 && x < W && y < H && src[y * W + x] >>> 24 !== 0;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (!on(x, y) || skip?.(x, y)) continue;
      const v = src[y * W + x];
      if (!on(x, y - 1)) p.set(x, y, mixU32(v, NOON_RIM, top));
      else if (!on(x, y + 1)) p.set(x, y, mixU32(v, SEA_RIM, sea));
    }
  p.outline(INK);
}

/**
 * ツガオの 黒い 判「まだ」 (62 11.6) stamped at (cx, cy): a black oval, worn at
 * the rim, the left half of 「ま」 gone. `crack` 1–3: split across (it is
 * about to fall).
 */
export function madaStamp(p: PixelCanvas, cx: number, cy: number, w = 10, h = 8, seed = 3, crack = 0): void {
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const dx = (x - (w - 1) / 2) / (w / 2);
      const dy = (y - (h - 1) / 2) / (h / 2);
      const d = dx * dx + dy * dy;
      if (d > 1) continue;
      const rim = d > 0.55;
      if (rim && hash2(x, y, seed) < 0.18) continue;
      p.set(Math.round(cx - w / 2 + x), Math.round(cy - h / 2 + y), rim ? '#1B1733' : '#0B0B14');
    }
  const mx = Math.round(cx);
  const my = Math.round(cy);
  p.hline(mx, mx + 2, my - 2, '#C8C2B4');
  p.hline(mx, mx + 2, my, '#C8C2B4');
  p.vline(mx + 1, my - 3, my + 2, '#C8C2B4');
  p.set(mx + 2, my + 2, '#C8C2B4');
  if (crack > 0) {
    // a crack from the top right down to the bottom left, wider each step
    for (let i = 0; i < h; i++) {
      const xx = Math.round(cx + w / 4 - (i / h) * (w / 2));
      p.set(xx, Math.round(cy - h / 2 + i), '#8FD3E8');
      if (crack >= 2) p.set(xx + 1, Math.round(cy - h / 2 + i), '#F4F6F8');
    }
  }
}
