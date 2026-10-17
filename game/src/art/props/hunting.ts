// ハンチングの 値札（02_ch2_index #83、50_ch2_story 3.8〔boushi〕・9.9、52_ch2_level_art 4.5）の 小物。
//
//   prop_hunting_wall   ペロの家 map_hoshi_kominka の 北の 壁、帽子かけの いちばん 右の くぎ
//     (10,1)：くりこが くれた ハンチング（グレーがかった 茶の ツイード）と、後ろから 糸で
//     さがる 値札（白い 紙に 赤い しるし）。flag_hunting_got の 前だけ。壁の 絵は
//     hoshi_room_c.ts の 'hats2'（麦わらと 黒い 中折れ、ハンチングの くぎ）。
//   prop_hunting_straw  3号ハウスの 前、ペロの すわる コンテナ (3,32) の 西の わきの 地面に
//     置いた 麦わらの 中折れ帽（黒い 帯）。ハンチングを かぶったあと（flag_hunting_on）。

import { mix, PixelCanvas } from '../../engine/pixel';
import { P } from '../tiles/palette';
import { outline } from './kit';
import { registerProp } from './registry';
import type { PropArt } from './types';

/** The tweed of the cap (the same browns as his sprite's flat cap, npc_hoshi_mitsu_hunting). */
const TWEED = { base: '#8C8068', shade: '#6E6450', light: '#AAA088', dark: '#4E4638' };

// ---------------------------------------------------------------- 壁の ハンチング

/**
 * Anchor (10,1) of the room: the hooks' rail is at world y 10 (hoshi_room_c paintDeco
 * 'hooks', fy 0), the cap's middle at x 187 / y 14 — the local frame starts 20px right of
 * the tile and 8px above it, so the cap's middle is (7,6) here.
 */
const WALL_IMG = (() => {
  const p = new PixelCanvas(14, 14);
  // the nail it hangs on
  p.set(7, 2, P.steel);
  // the round crown, flatter than the felt hat beside it, flecked
  p.ellipse(7, 6, 4, 2, TWEED.base);
  p.hline(5, 9, 4, TWEED.light);
  p.set(4, 5, TWEED.light);
  for (const [x, y] of [[5, 6], [8, 5], [10, 6], [7, 7]] as const) p.set(x, y, TWEED.shade);
  // the short visor turned down toward the room, its shadow under it on the wall
  p.hline(4, 10, 7, TWEED.dark);
  p.hline(5, 9, 8, mix(P.woodDark, P.ink, 0.3));
  // the price tag on its thread from the back: white paper, a red mark
  p.set(10, 8, P.paper);
  p.set(11, 9, P.paper);
  p.rect(10, 10, 3, 3, P.paper);
  p.set(12, 10, mix(P.paper, P.steel, 0.4));
  p.set(11, 11, P.verm);
  p.hline(10, 12, 12, mix(P.paper, P.steel, 0.35));
  return p.toCanvas();
})();

registerProp(
  'prop_hunting_wall',
  (): PropArt => ({ ox: 20, oy: -8, w: WALL_IMG.width, h: WALL_IMG.height, foot: 0, flat: true, img: () => WALL_IMG }),
);

// ---------------------------------------------------------------- コンテナの わきの 麦わら

/** The straw fedora (his sprite's straw: #E8D9B5, shade #C8A06A, light #FBF3DC, the black band) on the ground. */
const STRAW_IMG = (() => {
  // (1px of room all round for the outline)
  const p = new PixelCanvas(15, 10);
  const hat = { base: '#E8D9B5', shade: '#C8A06A', light: '#FBF3DC', dark: '#A8742A' };
  // the brim, seen from above and in front: a flat oval
  p.ellipse(7, 6, 6, 2, hat.base);
  p.hline(3, 11, 8, hat.shade);
  p.hline(4, 10, 4, hat.light);
  // the pinched crown and its band
  p.rect(5, 2, 5, 3, hat.base);
  p.hline(6, 8, 1, hat.light);
  p.vline(9, 2, 4, hat.shade);
  p.hline(5, 9, 4, '#2A2440');
  // weave stitches
  p.set(3, 6, hat.dark);
  p.set(11, 6, hat.dark);
  p.set(7, 3, hat.shade);
  outline(p, { bottom: true, soft: true });
  return p.toCanvas();
})();

registerProp(
  'prop_hunting_straw',
  (): PropArt => ({ ox: -12, oy: 7, w: STRAW_IMG.width, h: STRAW_IMG.height, foot: 15, img: () => STRAW_IMG, contact: 10, contactX: -5 }),
);
