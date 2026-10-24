// 絵の きゅうりは、とり遅れない（02_ch2_index、events/ch2/kyuri.ts）の 絵：
//
//   prop_ky_tana  ソワカの 家の 西の 壁ぞいの きゅうりの 棚（(20,34)・(20,35) の 2つ。opts.i 0 奥・1 手前）。
//                 竹の 支柱と ネット、つるに 大きな 葉、黄色い 花。とる 前は 葉の かげに 実が 少し 見える
//                 （3本 とった あとは 花だけ：flag_ky_got が 7）。

import { PixelCanvas } from '../../engine/pixel';
import { P } from '../tiles/palette';
import { registerProp } from './registry';
import type { PropArt, PropEnv } from './types';

const CUKE = '#3E7A34';
const CUKE_LT = '#6AA04A';

function tana(i: number, picked: boolean): HTMLCanvasElement {
  const W = 16;
  const H = 34;
  const p = new PixelCanvas(W, H);
  // the two bamboo stakes and the net between them
  for (const x of [1, 14]) {
    p.vline(x, 2, H - 1, P.woodLt);
    p.set(x, 2, P.wood);
  }
  p.hline(1, 14, 3, P.woodLt);
  for (let y = 6; y < H - 2; y += 4) for (let x = 2; x < 14; x++) if ((x + y) % 2 === 0) p.set(x, y, '#C8C4B4');
  for (let x = 3; x < 14; x += 4) for (let y = 4; y < H - 2; y++) if (y % 2 === 0) p.set(x, y, '#C8C4B4');
  // the vines climbing it, the big leaves overlapping
  const leaves: [number, number, number][] = i === 0 ? [[5, 7, 4], [10, 10, 4], [4, 16, 4], [11, 19, 4], [6, 24, 4], [10, 28, 3]] : [[10, 6, 4], [5, 11, 4], [11, 15, 4], [4, 21, 4], [10, 25, 4], [5, 29, 3]];
  for (const [cx, cy, r] of leaves)
    for (let y = -r; y <= r; y++)
      for (let x = -r; x <= r; x++) {
        if (x * x + y * y > r * r + 1) continue;
        const c = y === -r || x === -r ? P.leafYoung : (x * 3 + y + cx) % 5 === 0 ? P.leafShade : y > 1 ? P.leafDeep : P.leaf;
        p.set(cx + x, cy + y, c);
      }
  // a few yellow flowers
  for (const [x, y] of (i === 0 ? [[8, 4], [13, 22]] : [[3, 7], [12, 27]]) as [number, number][]) {
    p.set(x, y, '#F4D23A');
    p.set(x + 1, y, '#F4D23A');
    p.set(x, y + 1, '#D8A82A');
  }
  // the fruit hanging in the leaves' shade (before it is picked)
  if (!picked)
    for (const [x, y, n] of (i === 0 ? [[8, 12, 6]] : [[7, 16, 6], [2, 24, 8]]) as [number, number, number][])
      for (let j = 0; j < n; j++) {
        p.set(x, y + j, CUKE);
        if (j > 0 && j < n - 1) p.set(x + 1, y + j, j % 2 ? CUKE_LT : CUKE);
      }
  // the soil at its foot
  p.hline(0, 15, H - 1, P.woodDark);
  return p.toCanvas();
}

registerProp('prop_ky_tana', (opts) => {
  const i = Number(opts.i ?? 0);
  const cache = new Map<string, HTMLCanvasElement>();
  const img = (env: PropEnv) => {
    const key = env.flag('flag_ky_got') >= 7 ? 'picked' : 'full';
    let c = cache.get(key);
    if (!c) {
      c = tana(i, key === 'picked');
      cache.set(key, c);
    }
    return c;
  };
  return { ox: 0, oy: -18, w: 16, h: 34, foot: 15, img, contact: 12 } satisfies PropArt;
});
