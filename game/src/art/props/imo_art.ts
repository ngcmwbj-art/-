// 急かすと、甘うならん（03_ch3_index、events/ch3/imo.ts）の 絵：
//
//   prop_im_imoki     水槽の うらの 搬入口の わき (18–19,2) の 小さな 焼き芋の 機械。銀色の 箱、前に 小窓と
//                     小石の 引き出し、横に つまみ、コードは 北の 壁の コンセントへ（電気で 温める。館の 中で 火は 使わない）。
//                     焼いている 間（flag_im_cook 1）は 小窓が 橙に 光って 湯気。すんだ あと（flag_im_done）は 小窓が ほんのり。
//   prop_im_tsutsumi  搬入口の 台車 (22,2) の 上の 新聞紙の 包み（置いとく 1本。flag_im_done の あと S19 まで）。

import { PixelCanvas } from '../../engine/pixel';
import type { Gfx } from '../../engine/gfx';
import { outline } from './kit';
import { warmPool } from './ishell';
import { registerProp } from './registry';
import type { PropArt, PropEnv } from './types';

const W = 30;
const H = 26;

type Heat = 'cold' | 'hot' | 'warm';

function heatOf(env: PropEnv): Heat {
  if (env.flag('flag_im_cook') > 0) return 'hot';
  if (env.flag('flag_im_done') > 0) return 'warm';
  return 'cold';
}

function imoki(heat: Heat): HTMLCanvasElement {
  const p = new PixelCanvas(W, H);
  // the cord up the wall to the socket (north: the top of the picture)
  p.vline(27, 0, 12, '#2A2A30');
  p.rect(25, 0, 5, 3, '#E8E4D8');
  p.set(26, 1, '#5A5A60');
  p.set(28, 1, '#5A5A60');
  // the little stand (a steel table) and its legs
  p.rect(1, 14, 26, 2, '#7A7E86');
  for (const x of [2, 24]) p.rect(x, 16, 2, 10, '#5A5E66');
  p.hline(3, 24, 22, '#5A5E66');
  // the machine: a silver box on the stand
  p.rect(3, 3, 22, 12, '#B8BCC4');
  p.hline(3, 24, 3, '#D8DCE4');
  p.vline(24, 3, 14, '#8A8E96');
  p.hline(3, 24, 14, '#8A8E96');
  // the little window (the pebbles and the potatoes behind the glass)
  const lit = heat === 'hot' ? '#F29A3A' : heat === 'warm' ? '#B8784A' : '#5A5048';
  p.rect(5, 5, 13, 6, '#2A2430');
  p.rect(6, 6, 11, 4, lit);
  for (let x = 6; x < 17; x += 2) p.set(x, 9, heat === 'cold' ? '#7A7068' : '#FFD08A');
  for (const x of [7, 11]) {
    p.rect(x, 7, 3, 1, heat === 'cold' ? '#6A3A4A' : '#8A2A3A');
    p.set(x + 1, 6, heat === 'cold' ? '#6A3A4A' : '#A83A4A');
  }
  p.hline(6, 16, 6, '#F4F6F8');
  // the drawer's handle under the window, the knob on the right (turned to 弱)
  p.rect(8, 12, 7, 1, '#4A4E56');
  p.circle(21, 8, 2, '#3A3A42');
  p.set(20, 7, '#E8ECF0');
  // the potatoes waiting in a paper bag on the stand's shelf (before)
  if (heat === 'cold') {
    p.rect(6, 18, 9, 4, '#C8A878');
    p.hline(6, 14, 18, '#E0C898');
    p.set(9, 17, '#8A3A5A');
    p.set(11, 17, '#8A3A5A');
  }
  outline(p, { bottom: true, soft: true });
  return p.toCanvas();
}

registerProp('prop_im_imoki', () => {
  const cache = new Map<Heat, HTMLCanvasElement>();
  const img = (env: PropEnv) => {
    const k = heatOf(env);
    let c = cache.get(k);
    if (!c) {
      c = imoki(k);
      cache.set(k, c);
    }
    return c;
  };
  return {
    ox: 16 - Math.round(W / 2),
    oy: 16 - H,
    w: W,
    h: H,
    foot: 15,
    img,
    shadow: 8,
    contact: 24,
    contactX: 16,
    // the window's orange light (the room's only warm colour in the grey back passage), the steam
    glow: (g: Gfx, x: number, y: number, env: PropEnv) => {
      const k = heatOf(env);
      if (k === 'cold') return;
      const ox = x + 16 - Math.round(W / 2);
      const oy = y + 16 - H;
      const tw = k === 'hot' ? 0.75 + 0.15 * Math.sin(env.t / 260) : 0.3;
      g.rect(ox + 6, oy + 6, 11, 4, '#FFB050', 0.5 * tw);
      if (k !== 'hot') return;
      for (let i = 0; i < 3; i++) {
        const u = ((env.t / 1400 + i / 3) % 1 + 1) % 1;
        const sx = ox + 9 + i * 4 + Math.round(Math.sin(env.t / 400 + i * 2) * 2);
        const sy = oy + 3 - Math.round(u * 12);
        g.rect(sx, sy, 2, 3, '#F4F4F0', 0.35 * (1 - u));
      }
    },
    light: (g: Gfx, x: number, y: number, env: PropEnv) => {
      const k = heatOf(env);
      if (k === 'cold') return;
      warmPool(g, x + 12, y + 18, 22, 12, '#F2A050', k === 'hot' ? 0.5 : 0.18);
    },
  } satisfies PropArt;
});

registerProp('prop_im_tsutsumi', () => {
  const p = new PixelCanvas(12, 8);
  // a sweet potato wrapped in newspaper (grey print), its end poking out
  p.rect(1, 2, 9, 5, '#E4E0D4');
  p.hline(1, 9, 2, '#F4F2EA');
  for (const y of [3, 5]) for (let x = 2; x < 9; x += 2) p.set(x, y, '#8A8A90');
  p.rect(10, 3, 2, 3, '#8A2A3A');
  p.set(10, 3, '#A83A4A');
  outline(p, { bottom: true, soft: true });
  const img = p.toCanvas();
  // on the cart (its top at y 4 of its 14 px): drawn just above it, sorted in front of it
  return { ox: 3, oy: -1, w: 12, h: 8, foot: 16, img: () => img, contact: 0 } satisfies PropArt;
});
