// 低う、平たく（03_ch3_index、events/ch3/mizukiri.ts）の 絵：小石の 浜 map_c3_koishi と 港の 西の はしの 石段。
//
//   prop_mz_dan      岩を 2段 けずった 石段。opts.side 'umizoi'：岸壁の 西の はしの 岩 (1,25)（見つけやすい 目印：
//                    段の 上に 平たい 石を 3つ 積んだ 小さな 石積みと、白い 照り返し）。'koishi'：浜の 東の はし (22,4)。
//   prop_mz_reiru    舟揚げの 古い 木の レール 2本（16–17,2–5。地面に 平ら。舟は ない）。
//   prop_mz_iwa      テルの 岩（4–5,4。平たい 大きな 岩）。
//   prop_mz_ooki     大きな 丸い 石 (1,3)。
//   prop_mz_maru     丸い 小石の かたまり（地面に 平ら）。
//   prop_mz_hikari   平たい 石の 光る 点（灯りではなく、日の 照り返しの 白い 点。地面に 平ら、きらっと 光る）。

import { PixelCanvas } from '../../engine/pixel';
import { registerProp } from './registry';
import type { PropArt, PropEnv } from './types';

const ROCK = '#6B6A66';
const ROCK_LT = '#8E8C86';
const ROCK_DK = '#4A4946';
const STONE = '#BDB6A6';
const STONE_LT = '#E8E4D8';
const STONE_DK = '#8E8C86';

/** 平たい 石 1つ（横長の だ円、上が 明るい）。 */
function flatStone(p: PixelCanvas, cx: number, cy: number, rx: number, ry: number): void {
  p.ellipse(cx, cy, rx, ry, STONE);
  p.hline(Math.round(cx - rx + 1), Math.round(cx + rx - 1), Math.round(cy - ry + 1), STONE_LT);
  p.hline(Math.round(cx - rx + 1), Math.round(cx + rx - 1), Math.round(cy + ry), STONE_DK);
}

registerProp('prop_mz_dan', (opts) => {
  const umizoi = opts.side !== 'koishi';
  const p = new PixelCanvas(16, 28);
  // (the steps are drawn from row 6: the stack of flat stones above stands out over the rock)
  // the rock face with two steps cut in it, the cut faces paler (fresh) than the weathered rock
  p.rect(0, 6, 16, 22, ROCK);
  for (let y = 6; y < 28; y += 3) for (let x = (y * 5) % 7; x < 16; x += 7) p.set(x, y, ROCK_DK);
  p.hline(0, 15, 6, ROCK_LT);
  for (let k = 0; k < 2; k++) {
    const y = 12 + k * 7;
    p.rect(2, y, 12, 5, '#9A968C');
    p.hline(2, 13, y, '#C8C2B4');
    p.hline(2, 13, y + 4, ROCK_DK);
  }
  if (umizoi) {
    // the marker: three flat stones stacked on the rock's top, a fourth leaning beside
    flatStone(p, 9, 5, 6, 1.8);
    flatStone(p, 9, 2.6, 4.5, 1.4);
    flatStone(p, 9, 0.6, 3, 1);
    flatStone(p, 2, 5, 2, 1);
  }
  const img = p.toCanvas();
  return {
    ox: 0,
    oy: umizoi ? -12 : -10,
    w: 16,
    h: 28,
    foot: 15,
    img: () => img,
    contact: 0,
    // a white glint on the top stone now and then (it reads from the quay)
    glow(g, x, y, env: PropEnv) {
      if (!umizoi) return;
      const ph = (env.t / 1400 + env.seed) % 1;
      if (ph > 0.18) return;
      const a = Math.sin((ph / 0.18) * Math.PI);
      g.rect(x + 7, y - 13, 3, 1, '#FFFFFF', a);
      g.rect(x + 8, y - 14, 1, 3, '#FFFFFF', a);
    },
  } satisfies PropArt;
});

registerProp('prop_mz_reiru', () => {
  // two old timber rails running down to the water, cross-sleepers between (grey, split)
  const p = new PixelCanvas(32, 64);
  for (let y = 0; y < 64; y += 8) {
    p.rect(1, y + 3, 30, 3, '#8A7A62');
    p.hline(1, 30, y + 3, '#A8987E');
  }
  for (const x of [5, 23]) {
    p.rect(x, 0, 4, 64, '#7A6A52');
    p.vline(x, 0, 63, '#9A8A70');
    p.vline(x + 3, 0, 63, '#5A4A3A');
    for (let y = 4; y < 64; y += 11) p.set(x + 1, y, '#4A3A2A');
  }
  const img = p.toCanvas();
  return { ox: 0, oy: 0, w: 32, h: 64, foot: 0, flat: true, img: () => img };
});

registerProp('prop_mz_iwa', () => {
  // a big flat rock, two can sit on it
  const p = new PixelCanvas(32, 18);
  p.ellipse(16, 10, 15, 7, ROCK);
  p.ellipse(16, 8, 14, 5, ROCK_LT);
  p.ellipse(15, 7, 11, 3, '#A8A49A');
  for (let x = 4; x < 28; x += 5) p.set(x, 13, ROCK_DK);
  p.hline(4, 28, 16, ROCK_DK);
  const img = p.toCanvas();
  return { ox: 0, oy: -2, w: 32, h: 18, foot: 14, img: () => img, contact: 28 } satisfies PropArt;
});

registerProp('prop_mz_ooki', () => {
  const p = new PixelCanvas(16, 16);
  p.ellipse(8, 9, 7, 6, ROCK);
  p.ellipse(7, 7, 5, 4, ROCK_LT);
  p.ellipse(6, 6, 2, 1.5, '#A8A49A');
  p.hline(3, 13, 15, ROCK_DK);
  const img = p.toCanvas();
  return { ox: 0, oy: -1, w: 16, h: 16, foot: 15, img: () => img, contact: 14 } satisfies PropArt;
});

registerProp('prop_mz_maru', () => {
  const p = new PixelCanvas(16, 12);
  for (const [x, y, r] of [[4, 5, 3], [10, 4, 3.5], [7, 9, 2.5], [13, 9, 2]] as const) {
    p.circle(x, y, r, '#A8A49A');
    p.set(Math.round(x - r / 2), Math.round(y - r / 2), STONE_LT);
    p.hline(Math.round(x - r + 1), Math.round(x + r - 1), Math.round(y + r - 1), STONE_DK);
  }
  const img = p.toCanvas();
  return { ox: 0, oy: 2, w: 16, h: 12, foot: 0, flat: true, img: () => img };
});

registerProp('prop_mz_hikari', () => {
  // a flat stone lying among the round ones, its face catching the noon sun: a white point that glints
  const p = new PixelCanvas(12, 8);
  flatStone(p, 6, 4, 5, 2.2);
  const img = p.toCanvas();
  return {
    ox: 2,
    oy: 4,
    w: 12,
    h: 8,
    foot: 0,
    flat: true,
    img: () => img,
    glow(g, x, y, env) {
      const ph = (env.t / 900 + env.seed) % 1;
      const a = 0.55 + 0.45 * Math.sin(ph * Math.PI * 2);
      g.rect(x + 6, y + 5, 3, 1, '#FFFFFF', a);
      g.rect(x + 7, y + 4, 1, 3, '#FFFFFF', a);
      if (ph < 0.12) {
        g.rect(x + 3, y + 5, 9, 1, '#FFFFFF', 0.6);
        g.rect(x + 7, y + 1, 1, 9, '#FFFFFF', 0.6);
      }
    },
  } satisfies PropArt;
});
