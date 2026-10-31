// 切ったら、また なる（02_ch2_index、events/ch2/akinasu.ts）の 絵：
//
//   prop_an_nasu  区長の 家の 西の 路地の ナスの 株（(33,33)・(33,34)・(33,35) の 3つ。opts.i 0〜2）。
//                 ひざの 高さで 切った 古い 茎（切り口）から、新しい 枝が のびて 大きな 葉（紫の 筋）。
//                 下を 向いて 咲く 紫の 花。3株目は 花の あとに 親指くらいの 実が 1つ。
//                 2株目の 根もとは 水を やる 前は 白っぽく、あとは 黒く しめる（flag_an_water）。

import { PixelCanvas } from '../../engine/pixel';
import { P } from '../tiles/palette';
import { outline } from './kit';
import { registerProp } from './registry';
import type { PropArt, PropEnv } from './types';

const W = 16;
const H = 26;
const LEAF = '#3E6A34';
const LEAF_LT = '#5E8A44';
const VEIN = '#6A3A6A';
const STEM = '#4A3050';
const FLOWER = '#9A6AC8';
const FLOWER_DK = '#6A4A9A';

function kabu(i: number, wet: boolean): HTMLCanvasElement {
  const p = new PixelCanvas(W, H);
  // the soil round its foot (the second one: dry and pale until it is watered)
  const soil = i === 1 && !wet ? '#B8A88A' : P.woodDark;
  p.rect(2, H - 3, 12, 3, soil);
  p.hline(3, 12, H - 3, i === 1 && !wet ? '#D0C4A8' : '#5A4030');
  // the old stem cut at knee height (a pale cut end), the new branches out of it
  p.rect(7, 13, 2, H - 15, STEM);
  p.rect(6, 12, 4, 1, '#C8B898');
  p.line(8, 15, 3, 8, STEM);
  p.line(8, 15, 13, 7, STEM);
  p.line(7, 18, 2, 14, STEM);
  // the big leaves (dark green, purple veins)
  const leaves: [number, number, number][] = i === 0 ? [[3, 7, 3], [12, 6, 3], [2, 13, 3], [13, 12, 3]] : i === 1 ? [[4, 8, 3], [12, 8, 3], [3, 14, 2], [13, 14, 2]] : [[3, 6, 3], [12, 7, 3], [2, 12, 3], [12, 13, 3]];
  for (const [cx, cy, r] of leaves) {
    for (let y = -r; y <= r; y++)
      for (let x = -r - 1; x <= r + 1; x++) {
        if ((x * x) / ((r + 1) * (r + 1)) + (y * y) / (r * r) > 1) continue;
        p.set(cx + x, cy + y, y < 0 ? LEAF_LT : LEAF);
      }
    p.hline(cx - r, cx + r, cy, VEIN);
  }
  // the flowers hanging face down (purple, a yellow point at the mouth)
  const flowers: [number, number][] = i === 0 ? [[6, 9], [10, 11]] : i === 1 ? [[9, 10]] : [[5, 10]];
  for (const [x, y] of flowers) {
    p.rect(x, y, 3, 2, FLOWER);
    p.set(x + 1, y + 2, FLOWER_DK);
    p.set(x + 1, y + 1, '#F4D23A');
    p.set(x + 1, y - 1, '#5A7A3A');
  }
  // the third: a thumb-sized fruit after the flower
  if (i === 2) {
    p.rect(10, 14, 2, 4, '#3A1E4A');
    p.set(10, 14, '#6A4A8A');
    p.rect(9, 13, 4, 1, '#4E7A34');
  }
  outline(p, { bottom: true, soft: true });
  return p.toCanvas();
}

registerProp('prop_an_nasu', (opts) => {
  const i = Number(opts.i ?? 0);
  const cache = new Map<string, HTMLCanvasElement>();
  const img = (env: PropEnv) => {
    const wet = env.flag('flag_an_water') > 0;
    const key = wet ? 'wet' : 'dry';
    let c = cache.get(key);
    if (!c) {
      c = kabu(i, wet);
      cache.set(key, c);
    }
    return c;
  };
  return { ox: 0, oy: 16 - H, w: W, h: H, foot: 15, img, contact: 12, shadow: 6 } satisfies PropArt;
});
