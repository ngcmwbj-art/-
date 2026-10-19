// 2枚の うず（02_ch2_index #108、events/ch2/uzu.ts）の 絵：転回場の 軽トラの 運転席の 窓の 下の 平らな 石 (41,43)。
//
//   prop_uz_ishi  平らな 石。線香を 置いた あと（flag_uz_oku）は、石の 上に 線香立てと 緑の うず巻き、その 先の
//                 赤い 火（glow）と、まっすぐ 上がる 白い 煙（glow。風は ないので 曲がらない）。すんだ あとは
//                 うずの 形の 灰が 少しずつ のびて 見える（先は 赤いまま）。

import { PixelCanvas } from '../../engine/pixel';
import { registerProp } from './registry';
import type { PropArt, PropEnv } from './types';

const STONE = '#8A8A86';
const STONE_LT = '#A8A8A2';
const STONE_DK = '#5E5E5A';
const COIL = '#3E7A3A';
const COIL_DK = '#24442A';
const ASH = '#C8C4BC';

function stone(p: PixelCanvas): void {
  // a flat field stone, wider than tall, its top lit from the station (west)
  p.ellipse(8, 12, 7, 3, STONE_DK);
  p.ellipse(8, 11, 7, 3, STONE);
  p.ellipse(7, 10, 5, 2, STONE_LT);
  p.set(3, 11, STONE_LT);
  p.hline(3, 13, 14, '#3A3A38');
}

function coil(p: PixelCanvas, ash: boolean): void {
  // the stand (a tin plate) and the green coil on it, seen from above and a little in front
  p.ellipse(8, 9, 5, 2, '#9AA0A8');
  for (let i = 0; i <= 60; i++) {
    const k = i / 60;
    const th = k * 2.6 * Math.PI * 2;
    const r = 1 + k * 4;
    const x = Math.round(8 + Math.cos(th) * r);
    const y = Math.round(9 + Math.sin(th) * r * 0.45);
    // the burnt end (the outside) is ash once it has burnt a while
    p.set(x, y, ash && k > 0.78 ? ASH : k > 0.5 ? COIL : COIL_DK);
  }
}

registerProp('prop_uz_ishi', () => {
  const W = 16;
  const H = 16;
  const bare = new PixelCanvas(W, H);
  stone(bare);
  const lit = new PixelCanvas(W, H);
  stone(lit);
  coil(lit, false);
  const done = new PixelCanvas(W, H);
  stone(done);
  coil(done, true);
  const imgs = [bare.toCanvas(), lit.toCanvas(), done.toCanvas()];
  const which = (env: PropEnv) => (env.flag('flag_uz_done') ? 2 : env.flag('flag_uz_oku') ? 1 : 0);
  return {
    ox: 0,
    oy: 0,
    w: W,
    h: H,
    foot: 14,
    img: (env) => imgs[which(env)],
    contact: 12,
    glow: (g, x, y, env) => {
      if (!which(env)) return;
      // the burning tip (the coil's outer end) and the smoke straight up
      const tx = x + 12;
      const ty = y + 9;
      const pulse = 0.7 + 0.3 * Math.sin(env.t / 380);
      g.rect(tx, ty, 1, 1, '#FF6A3A', pulse);
      g.rect(tx, ty - 1, 1, 1, '#FFB070', 0.4 * pulse);
      for (let k = 0; k < 34; k++) {
        const sy = ty - 2 - k;
        const sway = Math.round(Math.sin(env.t / 900 + k * 0.3) * (k / 34) * 1.5);
        const a = 0.75 * (1 - k / 34);
        g.rect(tx + sway, sy, 1, 1, '#F2F4F8', a);
        if (k > 8) g.rect(tx + sway + 1, sy, 1, 1, '#E8ECF0', a * 0.6);
        if (k > 20) g.rect(tx + sway - 1, sy, 1, 1, '#E8ECF0', a * 0.35);
      }
    },
  } satisfies PropArt;
});
