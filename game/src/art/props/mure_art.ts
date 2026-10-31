// 背中は 海の 色（03_ch3_index、events/ch3/mure.ts）の 地図の 絵：海の 中（map_c3_umi）の 港がわの 底に、
// 止まった 小アジの 群れ（段階1、正午。泳ぐ かっこうの まま 止まって いる）。
//
//   prop_mr_mure  opts.size：oki（ずらっと）・naka・chii（ちょっと）。同じ 向き（頭が 左）に ならんだ 小さな 魚と、
//                 砂の 上の うすい 影。平ら（通り抜けられる。さわれない：調べるだけ）。
// 地図は 真上からの 絵だが、グソっ君は 群れと 同じ 深さに いるので、横向きの 魚で 描く。

import { PixelCanvas } from '../../engine/pixel';
import { registerProp } from './registry';
import type { PropArt } from './types';

const BACK = '#2E4A5A';
const SIDE = '#DCE6EC';
const BELLY = '#F2F6F8';
const SHADOW = '#1E3446';

/** 小アジ 1ぴき（7×3、頭が 左。背は 青黒く、腹は 白っぽい 銀、尾は 二つに 分かれる）。 */
function fish(p: PixelCanvas, x: number, y: number): void {
  p.hline(x + 1, x + 5, y, BACK);
  p.hline(x, x + 5, y + 1, SIDE);
  p.hline(x + 1, x + 4, y + 2, BELLY);
  p.set(x + 6, y, BACK);
  p.set(x + 6, y + 2, SIDE);
  p.set(x + 1, y + 1, '#1A2228');
}

const SPOTS: Record<string, [number, number][]> = {
  oki: [[1, 2], [9, 1], [17, 2], [4, 5], [12, 5], [19, 6], [7, 8], [15, 9]],
  naka: [[3, 3], [11, 2], [6, 6], [14, 6]],
  chii: [[7, 4], [13, 6]],
};

registerProp('prop_mr_mure', (opts) => {
  const size = String(opts?.size ?? 'oki');
  const W = 26;
  const H = 14;
  const p = new PixelCanvas(W, H);
  // the faint shadow on the sand under them (the light comes from above)
  p.dither(4, 11, 18, 3, SHADOW, 0.35);
  for (const [x, y] of SPOTS[size] ?? SPOTS.oki) fish(p, x, y);
  const img = p.toCanvas();
  return { ox: -5, oy: 1, w: W, h: H, foot: 14, flat: true, img: () => img } satisfies PropArt;
});
