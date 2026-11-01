// はく 前に、ふる（02_ch2_index #111、events/ch2/kutsu.ts）の 絵：
//
//   prop_h_nagagutsu   分校の 昇降口の 外、像の 東 (29,28) の 長靴 6足（うしろの 列 3足・前の 列 3足。左から 区長・
//                      ぴょん夫人・まつ先生／タケじい・シゲじい・スギばあ）。ふる 前は ばらばら（1本 たおれて いる 足も
//                      ある）、ふった 足から まっすぐ そろう（flag_ku_furu の ビット）。
//   prop_h_kutsu_kui   農具小屋 (34,13) の 西の 端の 杭 2本と、逆さに さした トマじいの 予備の 長靴。
//
// 大写しと 帳面も 同じ 色（KU_BOOT_COLOR）。

import { mix, PixelCanvas } from '../../engine/pixel';
import { P } from '../tiles/palette';
import { registerProp } from './registry';
import type { PropArt, PropEnv } from './types';

/** 長靴の 色（KU_BOOTS の 順：区長・ぴょん夫人・まつ先生・タケじい・シゲじい・スギばあ）。 */
export const KU_BOOT_COLOR = ['#2A2A30', '#C25A72', '#2E3C64', '#3E6A3A', '#4E4E56', '#8A6A4A'];

/** ふった 足の ビット（flag_ku_furu、KU_BOOTS の 順）。 */
export const KU_FURU_FLAG = 'flag_ku_furu';

/** 1本（立てた 長靴。x,y：左上、h：高さ。lean：上を 1px ずらす）。 */
function boot(p: PixelCanvas, x: number, foot: number, c0: string, lean: number, toe: boolean): void {
  // (a little lighter than the close-up: they stand in the dark under the eave)
  const c = mix(c0, '#FFFFFF', 0.12);
  const lt = mix(c0, '#FFFFFF', 0.4);
  const dk = mix(c0, '#000000', 0.3);
  const h = 9;
  for (let j = 0; j < h; j++) {
    const y = foot - h + j;
    const dx = lean && j < 3 ? lean : 0;
    p.set(x + dx, y, j === 0 ? lt : c);
    p.set(x + 1 + dx, y, j === 0 ? lt : dk);
  }
  // the mouth (a dark line at the top) and the sole
  p.set(x + lean, foot - h, mix(c, '#000000', 0.65));
  p.hline(x, x + 1, foot - 1, '#141418');
  if (toe) {
    p.set(x + 2, foot - 2, c);
    p.set(x + 2, foot - 1, '#141418');
  }
}

/** たおれた 1本（横に 寝た 長靴）。 */
function bootDown(p: PixelCanvas, x: number, foot: number, c: string): void {
  const dk = mix(c, '#000000', 0.4);
  p.hline(x, x + 6, foot - 2, c);
  p.hline(x, x + 6, foot - 1, dk);
  p.set(x + 6, foot - 2, mix(c, '#000000', 0.65));
  p.vline(x, foot - 3, foot - 1, '#141418');
}

/** ふる 前の ばらけ方（1足ごと）：[左の lean, 右の lean, 右が たおれている]。 */
const MESSY: [number, number, boolean][] = [
  [0, 1, false],
  [-1, 0, true],
  [0, 1, false],
  [1, 0, true],
  [0, -1, false],
  [1, 0, false],
];

const W = 19;
const H = 16;

function draw(bits: number): HTMLCanvasElement {
  const p = new PixelCanvas(W, H);
  // the board they stand on (an old duckboard by the door), so they read apart from the bicycles beside them
  p.rect(0, 11, W, 4, P.wood);
  p.hline(0, W - 1, 11, P.woodLt);
  p.hline(0, W - 1, 14, P.woodDark);
  for (const x of [5, 11, 17]) p.vline(x, 12, 14, P.woodDark);
  const place = (i: number, x: number, foot: number) => {
    const c = KU_BOOT_COLOR[i];
    const done = (bits >> i) & 1;
    const [l0, l1, down] = done ? [0, 0, false] : MESSY[i];
    boot(p, x, foot, c, l0, false);
    if (down) bootDown(p, x + 2, foot, c);
    else boot(p, x + 2, foot, c, l1, true);
  };
  // the back row (against the wall), then the front row a little lower
  for (let i = 0; i < 3; i++) place(i, i * 6, 13);
  for (let i = 3; i < 6; i++) place(i, 2 + (i - 3) * 6, 15);
  return p.toCanvas();
}

registerProp('prop_h_nagagutsu', () => {
  const cache = new Map<number, HTMLCanvasElement>();
  const img = (env: PropEnv) => {
    const bits = env.flag('flag_ku_done') ? 63 : env.flag(KU_FURU_FLAG) & 63;
    let c = cache.get(bits);
    if (!c) {
      c = draw(bits);
      cache.set(bits, c);
    }
    return c;
  };
  return {
    ox: -2,
    oy: 0,
    w: W,
    h: H,
    foot: 15,
    img,
    contact: 16,
  } satisfies PropArt;
});

registerProp('prop_h_kutsu_kui', () => {
  // two stakes driven in by the hut's west corner, a green boot upside down on each (sole up, the mouth down)
  const p = new PixelCanvas(10, 17);
  for (const x of [1, 6]) {
    p.vline(x, 8, 16, P.wood);
    p.vline(x + 1, 8, 16, P.woodLt);
    // the boot over the stake (a green one, lit by the moon on its left): the shaft, the heel and the sole on top
    p.rect(x - 1, 2, 4, 7, '#4E7E44');
    p.vline(x - 1, 2, 8, '#7AA866');
    p.vline(x + 2, 2, 8, '#345A30');
    p.hline(x - 1, x + 2, 9, '#22381E');
    p.rect(x - 1, 0, 4, 2, '#1A1A1E');
    p.set(x + 3, 1, '#1A1A1E');
    p.set(x + 3, 2, '#4E7E44');
  }
  const img = p.toCanvas();
  return { ox: 0, oy: -1, w: 10, h: 17, foot: 16, img: () => img, contact: 6 } satisfies PropArt;
});
