// 当たりは、かじって みんと（02_ch2_index、events/ch2/shishito.ts）の 絵：
//
//   prop_ss_kabu       ペロの 家の 前の 畑の 東の はしの シシトウの 株（opts.i 0・1）。細長い 緑の 実が 下がる。
//                      とった あとは 実が 2〜3本 だけ（葉の かげ）、2回目からの 新しい 小さい 実は 株 0 に 3本。
//   prop_ss_shichirin  縁側の 外の 七輪（土の 胴、上に 網）。ペロが 縁側に いる 間は 炭が 赤い（glow・light）。
//   prop_ss_sara       集会所の お茶の 台の 上の 焼きシシトウの 皿（区長に わたした あと）。

import { PixelCanvas } from '../../engine/pixel';
import { P } from '../tiles/palette';
import { drawLight, poolEllipse } from './light';
import { registerProp } from './registry';
import type { PropArt, PropEnv } from './types';

const POD = '#4E9A3A';
const POD_LT = '#86C860';

/** 細長い 実 1本（上が へた、下へ 下がる）。 */
function pod(p: PixelCanvas, x: number, y: number, len: number): void {
  p.set(x, y, P.leafShade);
  for (let j = 1; j <= len; j++) {
    p.set(x + (j > len - 2 ? 1 : 0), y + j, j === len ? P.leafDeep : POD);
    if (j < len - 1) p.set(x + 1, y + j, j % 2 ? POD_LT : POD);
  }
}

function kabu(fruits: number, small: boolean): HTMLCanvasElement {
  const p = new PixelCanvas(16, 22);
  // the stem and its stake, the leaves in clumps
  p.vline(8, 4, 21, P.leafShade);
  p.vline(12, 2, 21, P.woodLt);
  p.hline(9, 12, 9, P.paperGrid);
  for (const [cx, cy, r] of [[7, 5, 4], [4, 10, 4], [11, 9, 4], [7, 14, 4], [3, 16, 3], [12, 15, 3]] as const) {
    for (let y = -r; y <= r; y++)
      for (let x = -r; x <= r; x++) {
        if (x * x + y * y > r * r) continue;
        const c = (x + y + cx) % 3 === 0 ? P.leaf : y < 0 ? P.leafYoung : P.leafDeep;
        p.set(cx + x, cy + y, c);
      }
  }
  // the little white flowers
  for (const [x, y] of [[5, 3], [13, 12]] as const) p.set(x, y, P.white);
  // the pods hanging under the leaves
  const at: [number, number][] = [[3, 9], [9, 7], [6, 12], [12, 11], [2, 14], [10, 14]];
  for (let i = 0; i < fruits && i < at.length; i++) pod(p, at[i][0], at[i][1], small ? 3 : 6);
  // the soil at its foot
  p.hline(2, 14, 21, P.woodDark);
  return p.toCanvas();
}

registerProp('prop_ss_kabu', (opts) => {
  const i = Number(opts.i ?? 0);
  const cache = new Map<string, HTMLCanvasElement>();
  const img = (env: PropEnv) => {
    const picked = env.flag(`flag_ss_kabu_${i}`) > 0;
    const again = env.flag('flag_ss_done') > 0 && env.flag('flag_ss_new') !== 2 && i === 0;
    const key = again ? 'new' : picked ? 'picked' : 'full';
    let c = cache.get(key);
    if (!c) {
      c = key === 'full' ? kabu(6, false) : key === 'new' ? kabu(3, true) : kabu(2, false);
      cache.set(key, c);
    }
    return c;
  };
  return { ox: 0, oy: -8, w: 16, h: 22, foot: 15, img, contact: 10 } satisfies PropArt;
});

/** 炭が 赤い：ペロが 縁側に いる 間（events/ch2/shishito.ts flag_ss_away）。 */
const lit = (env: PropEnv) => env.flag('flag_ss_away') > 0;

registerProp('prop_ss_shichirin', () => {
  // a round clay stove (its body pale ochre, a vent at the front), a wire net on top
  const make = (on: boolean) => {
    const p = new PixelCanvas(16, 16);
    for (let y = 6; y < 15; y++) {
      const half = Math.round(6 - (y - 6) * 0.2);
      p.hline(8 - half, 7 + half, y, y === 6 ? '#D8A672' : (y - 6) % 4 === 0 ? '#9A6A42' : '#B8834E');
    }
    p.hline(2, 13, 6, '#E0B482');
    p.rect(6, 11, 4, 3, '#4A2E1C');
    if (on) p.hline(7, 8, 13, '#E8482A');
    // the coals under the net, the net itself
    for (let x = 3; x < 13; x++) p.set(x, 5, on ? (x % 3 ? '#E8482A' : '#FFB04A') : P.charcoal);
    for (let x = 2; x <= 13; x += 2) p.set(x, 4, P.steel);
    p.hline(2, 13, 4, '#8A8A84');
    p.hline(3, 5, 15, P.woodDark);
    p.hline(10, 12, 15, P.woodDark);
    return p.toCanvas();
  };
  const on = make(true);
  const off = make(false);
  return {
    ox: 0,
    oy: 0,
    w: 16,
    h: 16,
    foot: 15,
    img: (env) => (lit(env) ? on : off),
    contact: 12,
    glow(g, x, y, env) {
      if (!lit(env)) return;
      const f = 0.75 + Math.sin(env.t / 260) * 0.1;
      for (let i = 3; i < 13; i += 3) g.rect(x + i, y + 5, 2, 1, '#FF8A3A', f);
    },
    light(g, x, y, env) {
      if (!lit(env)) return;
      drawLight(g, poolEllipse(26, 14, '255,120,60'), x + 8, y + 10, 0.5);
    },
  } satisfies PropArt;
});

registerProp('prop_ss_sara', () => {
  // a white plate with the grilled ones, at the east end of the tea table (the pot's place stays clear)
  const p = new PixelCanvas(12, 6);
  p.ellipse(6, 3, 5.5, 2.2, '#F4F1E8');
  p.hline(2, 10, 5, '#B8B2A0');
  for (const [x, y] of [[3, 2], [5, 3], [7, 2]] as const) {
    p.hline(x, x + 3, y, '#5A8A34');
    p.set(x + 1, y, '#3A3A1C');
  }
  const img = p.toCanvas();
  return { ox: 14, oy: -2, w: 12, h: 6, foot: 14, img: () => img, contact: 0 } satisfies PropArt;
});
