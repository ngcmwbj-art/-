// おぴぃの まわりの 小物（02_ch2_index #66、30_level_art 3.5・3.13・4.18、10_narrative 7.21）
//
//   prop_tamotsu_mizuguchi  田んぼの 水口 (20,41)：畦の のり面から 出た 土管の口、
//     そこから 落ちる 用水路の水と 波紋、まわりの 石、ペットボトルの しかけ（糸は
//     畦の 竹の くいへ）。稲は この まわりだけ 植わっていない（water.ts の INLETS 'p'）。
//     段階1：落ちる水が とちゅうで 止まる（ちずの ホースと 同じ 見せかた）。
//     段階2：落ちる水が 北東（右）へ 曲がる。平らな物（デカールの層）。
//   prop_zari_taku  つりえさ屋 map_sk_bait の北の壁、魚拓の となり (7,0)：おぴぃが
//     えんぴつで なぞった ザリ拓（flag_zari_best があるときだけ）。段階2は 北東を向く。

import type { Gfx } from '../../engine/gfx';
import { PixelCanvas } from '../../engine/pixel';
import { P } from '../tiles/palette';
import { zariTakuWall } from './tsuri_art';
import { registerProp } from './registry';
import type { PropArt, PropEnv } from './types';

// ---------------------------------------------------------------- 水口

/** Local frame: 2px left of the tile, 4px up into the path's edge. */
const MX = -2;
const MY = -4;
const INLET_IMG = (() => {
  const p = new PixelCanvas(22, 18);
  // pebbles round the pool (put there so the fall does not dig out the ridge)
  const pebble = (x: number, y: number, w: number) => {
    p.rect(x, y, w, 2, P.steel);
    p.hline(x, x + w - 1, y, P.concreteLt);
    p.set(x + w - 1, y + 1, P.asphalt);
    p.set(x, y + 2, P.charcoal);
  };
  pebble(0, 10, 3);
  pebble(11, 9, 2);
  pebble(2, 14, 2);
  // the concrete pipe mouth set in the ridge's face, looking at us: a ring, dark inside
  const cx = 7;
  const cy = 4;
  for (let y = cy - 4; y <= cy + 4; y++)
    for (let x = cx - 5; x <= cx + 5; x++) {
      const d = ((x - cx) / 5.2) ** 2 + ((y - cy) / 4.2) ** 2;
      if (d > 1) continue;
      const inner = ((x - cx) / 3) ** 2 + ((y - cy - 0.5) / 2.4) ** 2 < 1;
      if (inner) p.set(x, y, y > cy + 1 ? P.night : P.ink);
      else p.set(x, y, x - cx + (y - cy) < -3 ? P.concreteLt : x - cx + (y - cy) > 3 ? P.steel : P.concrete);
    }
  // the ridge's grass hanging over its top, moss on the lip
  for (const [x, y, c] of [[3, 0, P.leaf], [4, 0, P.leafDeep], [9, 0, P.leaf], [10, 1, P.leafDeep], [11, 2, P.leafShade], [2, 3, P.leafShade]] as [number, number, string][]) p.set(x, y, c);
  p.set(6, 7, P.leafShade);
  p.set(9, 7, P.leafShade);
  // the bamboo stake on the ridge's edge and the string down to the trap
  p.vline(18, 0, 5, P.woodLt);
  p.set(18, 0, P.goldPale);
  p.vline(19, 1, 5, P.brassOld);
  for (let i = 0; i <= 5; i++) p.set(18 - Math.round(i * 0.4), 6 + i, P.concreteLt);
  // the PET bottle trap lying in the pool: clear, a white glint, the cut top pushed in (left),
  // a scrap of bait inside; a dark line under it where it sits in the water
  p.rect(11, 12, 9, 3, '#A8D8E0');
  p.hline(12, 19, 12, P.glint);
  p.hline(11, 19, 15, '#4A7A86');
  p.vline(20, 12, 14, '#6FA8B8');
  p.vline(11, 12, 14, P.aqua);
  p.set(12, 13, P.white);
  p.set(16, 13, '#E8D9B5');
  p.set(17, 13, '#C8A06A');
  p.set(14, 11, P.concreteLt);
  return p.toCanvas();
})();

/** The fall from the pipe mouth and its rings on the paddy's water (drawn every frame, small). */
function inletOver(g: Gfx, x: number, y: number, env: PropEnv): void {
  const ox = x + MX;
  const oy = y + MY;
  const t = env.stage === 1 ? 820 : env.t;
  const ne = env.stage === 2;
  // the stream: 3px, a glint running down it; stage 1 holds still in the air
  for (let i = 0; i < 5; i++) {
    const k = i / 4;
    const bend = ne ? Math.round(k * k * 3) : 0;
    const yy = oy + 7 + i;
    g.rect(ox + 6 + bend, yy, 3, 1, '#A8D8E0', 0.85);
    if ((i + Math.floor(t / 70)) % 3 === 0) g.rect(ox + 7 + bend, yy, 1, 1, P.glint);
  }
  // where it lands: white water and two rings spreading (stopped in stage 1)
  const lx = ox + 7 + (ne ? 3 : 0);
  const ly = oy + 12;
  g.rect(lx - 1, ly, 3, 1, P.glint, 0.8);
  for (let r = 0; r < 2; r++) {
    const ph = ((t / 900 + r * 0.5) % 1 + 1) % 1;
    const rr = Math.round(2 + ph * 5);
    const a = 0.55 * (1 - ph);
    g.rect(lx - rr, ly + 1, 2, 1, P.glint, a);
    g.rect(lx + rr - 1, ly + 1, 2, 1, P.glint, a);
    g.rect(lx - 1, ly + 1 + Math.round(rr / 3), 3, 1, P.glint, a * 0.7);
  }
}

registerProp('prop_tamotsu_mizuguchi', (): PropArt => ({
  ox: MX,
  oy: MY,
  w: INLET_IMG.width,
  h: INLET_IMG.height,
  foot: 0,
  flat: true,
  img: () => INLET_IMG,
  over: inletOver,
}));

// ---------------------------------------------------------------- ザリ拓（つりえさ屋の壁）

registerProp('prop_zari_taku', (): PropArt => {
  const a = zariTakuWall(false);
  const b = zariTakuWall(true);
  return { ox: 3, oy: 4, w: a.width, h: a.height, foot: 0, flat: true, img: (env: PropEnv) => (env.stage === 2 ? b : a) };
});
