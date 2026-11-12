// 終わりの 音は、下がる（03_ch3_index、events/ch3/housou.ts）の 絵：旧水族館の 放送室 map_c3_aq_hoso と、
// 入口と券売所の 北の 壁の 小さな 戸。字は 書かない（札・背の 字は 線だけ：62 の 決まり）。
//
//   prop_hs_shell   床と 北の 壁（1枚の 平らな 絵）。床は 古い リノリウム。壁は 音を 吸う 穴あきの 板。
//                   西の すみに 貼り紙 (1,1)（線の 字と、上がる 4つの 点・下がる 4つの 点）。机の 上の 壁に
//                   放送の 機械の 棚 (2–5,1)：緑の 目もり 2つと 赤い ランプ。電源が 入っている 間（flag_hs_off で ない）は
//                   ランプと 目もりが 光る（glow：10年 ついたままの 小さな 光）。
//   prop_hs_desk    放送の 机 (2–5,2)：マイク・つまみの 並んだ 箱・テープの 機械・手書きの 台本。
//   prop_hs_chime   チャイムの 箱 (6,2)：4つの 押しボタン（下に 高さの 段：1〜4 段）。
//   prop_hs_tana    テープの 棚 (7–8,2–3)：背の 白い テープが 4段。
//   prop_hs_isu     たたんだ パイプいす (8,5)。
//   prop_hs_to      入口の 北の 壁の 戸 (5,1)（map_c3_aq_iriguchi の 上に 平らな 絵。壁と 同じ 色の 目立たない 戸、
//                   上に 小さな 札）。

import { mix, PixelCanvas } from '../../engine/pixel';
import type { Gfx } from '../../engine/gfx';
import { h01, ihash, valueNoise } from '../tiles/noise';
import { getMapDef } from '../../world/maps';
import { paintShell, screenPool, warmPool } from './ishell';
import { standProp } from './hoshi_kit';
import { registerProp } from './registry';
import type { PropArt, PropEnv } from './types';

const OFF = 'flag_hs_off';
const INK = '#2A2440';
const PAPER = '#E8E0C8';
const STEEL = '#8E95A6';
const STEEL_DK = '#5E6478';
const LAMP = '#FF4A3A';
const METER = '#7AF0A0';

/** 机の 上の 壁の 機械の 棚（壁の 絵の px）。 */
const RACK = { x: 2 * 16 + 2, y: 3, w: 4 * 16 - 4, h: 12 };
/** 赤い ランプ・緑の 目もり 2つ（壁の 絵の px）。 */
const LAMP_AT: [number, number] = [RACK.x + RACK.w - 7, RACK.y + 5];
const METERS: [number, number][] = [
  [RACK.x + 8, RACK.y + 6],
  [RACK.x + 24, RACK.y + 6],
];

registerProp('prop_hs_shell', () => {
  const rows = getMapDef('map_c3_aq_hoso')?.rows ?? [];
  const sh = paintShell({
    rows,
    floor: (x, y) => {
      // old linoleum, grey-green, worn paler in front of the desk and the door
      let c = (((x >> 3) + (y >> 3)) & 1) === 0 ? '#8A9488' : '#828C80';
      if ((x & 7) === 7 || (y & 7) === 7) c = '#6E786C';
      const n = valueNoise(x / 11, y / 9, 7601);
      if (n > 0.72) c = mix(c, '#A8A890', 0.25);
      if (h01(x, y, 7603) > 0.992) c = '#5E6458';
      return c;
    },
    wall: (x, y, fh) => {
      // the sound-proof board: pale panels, a grid of small holes; a dark skirting
      void fh;
      const lx = x % 24;
      if (lx === 0) return '#9A9688';
      let c = valueNoise(x / 10, y / 7, 7605) > 0.7 ? '#C4C0B0' : '#D0CCBC';
      if ((x % 4 === 2) && (y % 4 === 2)) c = '#8A867A';
      return c;
    },
    trim: '#B8B4A8',
    base: '#4A5A6A',
    baseH: 3,
  });
  const p = sh.p;
  // the notice 『館内 放送の しかた』 (1,1): lines for the letters, four dots going up, four going down
  const nx = 16 + 2;
  const ny = 5;
  p.rect(nx - 1, ny - 1, 14, 20, '#9A9688');
  p.rect(nx, ny, 12, 18, PAPER);
  p.hline(nx + 2, nx + 9, ny + 2, INK);
  p.hline(nx + 2, nx + 7, ny + 4, INK);
  for (let k = 0; k < 4; k++) p.rect(nx + 2 + k * 2, ny + 11 - k, 1, 1, '#E23B2E');
  for (let k = 0; k < 4; k++) p.rect(nx + 2 + k * 2, ny + 13 + k, 1, 1, '#2A5A82');
  p.set(nx + 6, ny - 1, '#C8C4B8');
  // the rack over the desk: a steel panel, two meters, the red lamp, a row of small switches
  const r = RACK;
  p.rect(r.x - 1, r.y - 1, r.w + 2, r.h + 2, STEEL_DK);
  p.rect(r.x, r.y, r.w, r.h, STEEL);
  p.hline(r.x, r.x + r.w - 1, r.y, '#B8BEC8');
  for (const [mx, my] of METERS) {
    p.rect(mx - 6, my - 3, 13, 7, '#2A3A30');
    p.rect(mx - 5, my - 2, 11, 5, '#3A5A44');
    p.line(mx, my + 2, mx + 3, my - 2, '#1A2A20');
  }
  for (let k = 0; k < 5; k++) p.rect(RACK.x + 36 + k * 3, r.y + 8, 1, 2, '#2A2F3A');
  p.rect(LAMP_AT[0] - 2, LAMP_AT[1] - 2, 5, 5, '#3A2A2A');
  p.rect(LAMP_AT[0] - 1, LAMP_AT[1] - 1, 3, 3, '#6A2A2A');
  // a cable down from the rack to the desk
  p.vline(r.x + r.w - 2, r.y + r.h, 31, '#3A3F48');
  const img = p.toCanvas();
  return {
    ox: 0,
    oy: 0,
    w: sh.w * 16,
    h: sh.h * 16,
    foot: 0,
    flat: true,
    img: () => img,
    // the set left on for ten years: the red lamp, the meters' green, a faint flicker on the needle
    glow: (g: Gfx, x: number, y: number, env: PropEnv) => {
      if (env.flag(OFF)) return;
      const [lx, ly] = LAMP_AT;
      g.rect(x + lx - 1, y + ly - 1, 3, 3, LAMP);
      g.rect(x + lx, y + ly, 1, 1, '#FFD0C0');
      g.rect(x + lx - 2, y + ly - 2, 5, 5, LAMP, 0.25);
      const t = env.t / 1000;
      for (const [i, [mx, my]] of METERS.entries()) {
        g.rect(x + mx - 5, y + my - 2, 11, 5, METER, 0.35);
        const wob = Math.sin(t * 7 + i * 2) * 0.6;
        const tx = Math.round(mx - 3 + wob);
        g.rect(x + tx, y + my - 1, 1, 3, METER, 0.9);
      }
    },
    light: (g, x, y, env) => {
      // the room's own dim ceiling light, and (while on) the lamp's red and the meters' green on the wall and the desk
      warmPool(g, x + 5 * 16, y + 4 * 16, 70, 34, '#E8ECF0', 0.22);
      if (env.flag(OFF)) return;
      screenPool(g, x + LAMP_AT[0], y + LAMP_AT[1] + 6, 12, 9, LAMP, 0.35);
      screenPool(g, x + METERS[0][0] + 8, y + METERS[0][1] + 8, 18, 10, METER, 0.25);
    },
  } satisfies PropArt;
});

/** 放送の 机 (2–5,2)：鉄の 机、マイク、つまみの 並んだ 箱、テープの 機械、台本。 */
registerProp('prop_hs_desk', () =>
  standProp(64, 30, (p) => {
    // the desk: a grey steel top, a front panel with a drawer, two legs
    p.rect(0, 14, 64, 4, '#A8AEB8');
    p.hline(0, 63, 14, '#C8CED8');
    p.rect(2, 18, 60, 9, '#7A8090');
    p.hline(2, 61, 18, '#6A7080');
    p.rect(40, 20, 18, 4, '#8A90A0');
    p.hline(46, 52, 22, '#4A5060');
    p.rect(2, 27, 3, 3, '#5A6070');
    p.rect(59, 27, 3, 3, '#5A6070');
    // the microphone on its short stand (2)
    p.rect(5, 12, 8, 2, '#4A4F5A');
    p.vline(9, 4, 11, '#6B7186');
    p.rect(7, 0, 5, 5, '#3A3F48');
    p.set(8, 1, '#8E95A6');
    p.set(10, 2, '#8E95A6');
    // the mixer with its knobs (3): a sloped box, two rows of knobs, small green marks
    p.rect(17, 7, 14, 7, '#5E6478');
    p.hline(17, 30, 7, '#8E95A6');
    for (let k = 0; k < 4; k++) {
      p.rect(19 + k * 3, 9, 2, 2, '#1A1E28');
      p.set(19 + k * 3, 9, '#C8CED8');
      p.rect(19 + k * 3, 12, 2, 1, '#3A8A5A');
    }
    // the tape machine (4–5): the deck, the cassette in its window, the reels
    p.rect(34, 5, 26, 9, '#3A3F48');
    p.hline(34, 59, 5, '#6B7186');
    p.rect(38, 7, 14, 5, '#C8C4B8');
    p.rect(39, 8, 12, 3, '#2A2F3A');
    p.set(42, 9, '#E8E4D8');
    p.set(48, 9, '#E8E4D8');
    p.rect(40, 7, 10, 1, '#F4F1E8');
    for (let k = 0; k < 3; k++) p.rect(54 + k * 2, 8, 1, 3, '#8E95A6');
    // the handwritten script on the desk, by the mic
    p.rect(13, 12, 6, 2, '#F4F1E8');
    p.hline(14, 17, 12, '#8A84A0');
  }, { cx: 32, base: 16, shadow: 0 }),
);

/** チャイムの 箱 (6,2)：鉄の 小さな 箱、4つの 押しボタン（下に 高さの 段）。 */
registerProp('prop_hs_chime', () =>
  standProp(16, 26, (p) => {
    p.rect(1, 6, 14, 12, '#B8B4A8');
    p.hline(1, 14, 6, '#D8D4C8');
    p.rect(1, 18, 14, 2, '#7A766A');
    // the stand
    p.rect(3, 20, 2, 6, '#6B7186');
    p.rect(11, 20, 2, 6, '#6B7186');
    // four round buttons, each with its little steps under it (1 to 4: how high the note)
    const H = [2, 0, 3, 1];
    for (let k = 0; k < 4; k++) {
      const bx = 2 + k * 3;
      p.rect(bx, 8, 2, 2, ['#E8743A', '#D9A441', '#3FA66B', '#4A7AB8'][k]);
      for (let s = 0; s <= H[k]; s++) p.set(bx + (s % 2), 15 - s, INK);
    }
    p.rect(4, 2, 8, 4, PAPER);
    p.hline(5, 10, 3, INK);
  }, { cx: 8, base: 16, shadow: 0 }),
);

/** テープの 棚 (7–8,2–3)：鉄の 棚、白い 背の テープが 段ごとに（背の 字は 線）。 */
registerProp('prop_hs_tana', () =>
  standProp(32, 40, (p) => {
    p.rect(1, 2, 30, 37, '#6B7186');
    p.rect(2, 3, 28, 35, '#3A3F48');
    for (let s = 0; s < 4; s++) {
      const y = 4 + s * 9;
      p.hline(2, 29, y + 7, '#8E95A6');
      const n = 6 + (s % 2);
      for (let k = 0; k < n; k++) {
        const x = 3 + k * 4;
        if (s === 3 && k === 3) continue; // the gap of the one in the machine
        p.rect(x, y, 3, 7, ihash(k, s, 7611) % 4 === 0 ? '#D8D0B8' : '#F4F1E8');
        p.vline(x + 1, y + 1, y + 2 + (ihash(k, s, 7613) % 4), INK);
      }
    }
    p.hline(1, 30, 2, '#8E95A6');
  }, { cx: 16, base: 32, shadow: 0 }),
);

/** たたんだ パイプいす (8,5)：壁に 立てかけた 鉄の いす。 */
registerProp('prop_hs_isu', () =>
  standProp(12, 22, (p) => {
    p.line(2, 21, 7, 1, '#8E95A6');
    p.line(9, 21, 5, 2, '#8E95A6');
    p.rect(4, 3, 5, 8, '#4A7AB8');
    p.rect(4, 3, 5, 1, '#6A9AD8');
    p.rect(4, 12, 5, 5, '#4A7AB8');
  }, { cx: 8, base: 16, shadow: 0 }),
);

/** 入口の 北の 壁の 戸 (5,1)：壁と 同じ 白い 鉄の 戸、上に 小さな 札（線）、取っ手。 */
registerProp('prop_hs_to', () => {
  const W = 16;
  const H = 32;
  const p = new PixelCanvas(W, H);
  p.rect(1, 11, 14, 21, '#9A968C');
  p.rect(2, 12, 12, 20, '#C8C4B8');
  p.hline(2, 13, 12, '#D8D4C8');
  for (let y = 16; y < 30; y += 6) p.hline(3, 12, y, '#B8B4A8');
  p.rect(11, 21, 2, 2, '#6B7186');
  // the plate over it: 『放送室』 as strokes
  p.rect(3, 6, 10, 4, '#F4F1E8');
  p.hline(4, 11, 7, INK);
  p.hline(4, 8, 8, INK);
  const img = p.toCanvas();
  return { ox: 0, oy: 0, w: W, h: H, foot: 0, flat: true, img: () => img } satisfies PropArt;
});
