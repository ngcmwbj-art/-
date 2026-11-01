// 破れたら、つくろう（03_ch3_index、events/ch3/amigoya.ts）の 絵：網小屋 map_c3_amigoya。
//
//   prop_ag_shell      床と 北の 壁（1枚の 平らな 絵）。床は 古い 板。北の 壁は 板張りで、上の 梁から 網が
//                      何枚も 下がる（菱形の 目）。北東に 窓 (14,0–1)：外は 12:01 の 港。窓の 光が 床に 落ちて、
//                      その 中に 網目の 影（床の 絵に 描く：動かないので ちらつかず、HD-2D でも 重くない）。
//   prop_ag_ana        網の 破れ（壁の 網の 上の 平らな 絵。opts.k = 0 小さい 穴・1 長い 裂け目・2 骨の あと）：
//                      つくろう 前は 穴と ちぎれた 糸、すんだら 新しい 糸の 目（flag_ag_ana_<k>）。
//   prop_ag_yama       たたんだ 網の 山 (1–3,5–6)、はしに 浮きと おもり。
//   prop_ag_dougu      道具箱 (8–9,4)：網針・目板・網糸の 玉。
//   prop_ag_hako       浮きの 箱と おもりの 箱 (13–14,5–6)。
//   prop_ag_koshi      腰かけ (7,4)（木の 丸い 腰かけ）。
//   prop_ag_nagagutsu  長靴 (9,8)。

import { mix, PixelCanvas } from '../../engine/pixel';
import { h01, ihash, valueNoise } from '../tiles/noise';
import { getMapDef } from '../../world/maps';
import { blend, paintShell } from './ishell';
import { boards } from '../tiles/ifloor';
import { standProp } from './hoshi_kit';
import { registerProp } from './registry';
import type { PropArt, PropEnv } from './types';
import { AG_ANA, AG_MADO } from '../../data/maps/c3_amigoya';

/** 網の 糸（古い 網：くすんだ 緑）、新しい 糸（明るい 緑）、梁。 */
const ITO = '#7A9A7E';
const ITO_DK = '#4E6A56';
const ITO_NEW = '#B4E0A8';
const HARI = '#C8A86A';
const WALL_A = '#6A5040';
const WALL_B = '#5A4234';
/** 網の 目の 大きさ（菱形の 対角、px）。 */
const ME = 8;
/** 網の すその 高さ（壁の 上から、px）と 梁の 高さ。 */
const NET_TOP = 7;
const NET_BOT = 46;

/** (x, y) が 網の 糸の 上か（菱形の 目）。 */
function onMesh(x: number, y: number): boolean {
  return (((x + y) % ME) + ME) % ME === 0 || (((x - y) % ME) + ME) % ME === 0;
}

/** 破れの 形（壁の 網の 上、その 破れの 中心から の ずれ）：中なら true。 */
function inAna(k: number, dx: number, dy: number): boolean {
  if (k === 0) return Math.abs(dx) + Math.abs(dy) <= 6;
  if (k === 1) return Math.abs(dx) <= 3 + (dy > 0 ? 1 : 0) && Math.abs(dy) <= 13;
  return (dx + 1) * (dx + 1) / 49 + dy * dy / 36 <= 1;
}
/** 破れの 中心（壁の 絵の px）。 */
function anaAt(k: number): [number, number] {
  const [tx] = AG_ANA[k];
  return [tx * 16 + 8, k === 1 ? 28 : 30];
}

registerProp('prop_ag_shell', () => {
  const rows = getMapDef('map_c3_amigoya')?.rows ?? [];
  const wood = boards({ bh: 7, lit: '#B08A5E', base: '#94704A', shade: '#6E5236', gap: '#4A3626', nail: '#5A4030', seed: 4201 });
  const sh = paintShell({
    rows,
    floor: (x, y) => {
      let c = wood(x, y);
      // sand and salt in the boards' grain, a little
      if (h01(x, y, 4203) > 0.985) c = '#D8CCB0';
      return c;
    },
    wall: (x, y, fh) => {
      // dark vertical boards; a beam across near the top
      if (y >= 4 && y <= 6) return y === 4 ? '#8A6A4A' : '#4A3426';
      const lx = x % 12;
      if (lx === 0) return '#3E2C22';
      const n = valueNoise(Math.floor(x / 12), y / 9, 4205);
      void fh;
      return n > 0.62 ? WALL_A : n < 0.3 ? '#4E3A2E' : WALL_B;
    },
    trim: '#8A6A4A',
    base: '#4A3426',
    baseH: 3,
  });
  const p = sh.p;
  const mx = AG_MADO[0] * 16;
  // the window (14, rows 0–1): the frame, the 12:01 harbour (sky, the sea, a boat's white hull and its mast)
  const wx = mx + 1;
  const wy = 9;
  const ww = 14;
  const wh = 18;
  p.rect(wx - 1, wy - 1, ww + 2, wh + 2, '#8A6A4A');
  for (let j = 0; j < wh; j++)
    for (let i = 0; i < ww; i++) p.set(wx + i, wy + j, j < 8 ? mix('#BFE6F4', '#E8F6FA', j / 8) : j < 10 ? '#7AB8D4' : '#3A7EA8');
  p.rect(wx + 3, wy + 9, 6, 3, '#F4F1E8');
  p.vline(wx + 6, wy + 3, wy + 8, '#6B7186');
  p.hline(wx, wx + ww - 1, wy + 11, '#2F6A90');
  p.vline(wx + 7, wy, wy + wh - 1, '#8A6A4A');
  p.hline(wx, wx + ww - 1, wy + 8, '#8A6A4A');
  sh.glass.rect(wx, wy, ww, wh, '#ffffff');
  // the nets hung from the beam (2–13): the mesh, a float line along the top with small floats, a weighted foot
  const x0 = 2 * 16;
  const x1 = 14 * 16 - 1;
  for (let y = NET_TOP; y <= NET_BOT; y++)
    for (let x = x0; x <= x1; x++) {
      // the nets hang in three widths, a gap between (the beam shows)
      const panel = Math.floor((x - x0) / 64);
      const px = (x - x0) % 64;
      if (px >= 62) continue;
      const sag = Math.round(Math.sin((px / 62) * Math.PI) * 2);
      if (y > NET_BOT - (panel === 1 ? 0 : 1) + sag) continue;
      if (onMesh(x, y + sag)) p.set(x, y, (x + y) % 3 === 0 ? ITO_DK : ITO);
    }
  for (let x = x0; x <= x1; x++) {
    if ((x - x0) % 64 >= 62) continue;
    p.set(x, NET_TOP, '#C8B48A');
    if ((x - x0) % 10 === 4) p.rect(x - 1, NET_TOP - 1, 3, 3, '#E8743A');
  }
  // the folds between the panels: a darker fall of net
  for (const fx of [x0 + 62, x0 + 126]) for (let y = NET_TOP; y <= NET_BOT; y++) if (y % 3 === 0) p.set(fx, y, ITO_DK);
  // the holes are their own props (prop_ag_ana) over this
  // the light from the window on the floor (rows 3–5, west of the window): a soft patch, and in it the
  // nets' mesh as a shadow, slanting with the light (painted: still, so it never flickers)
  const lx0 = 3 * 16;
  const lx1 = 14 * 16;
  const ly0 = 3 * 16 + 1;
  const ly1 = 6 * 16;
  for (let y = ly0; y < ly1; y++)
    for (let x = lx0; x < lx1; x++) {
      // the patch's edge: a soft parallelogram leaning west as it comes south
      const s = (y - ly0) * 0.6;
      const u = (x - (lx0 + 8 - s)) / (lx1 - lx0 - 24);
      const v = (y - ly0) / (ly1 - ly0);
      if (u < 0 || u > 1) continue;
      const edge = Math.min(u, 1 - u, v * 2, (1 - v) * 1.6);
      const a = Math.min(1, edge * 6);
      if (a <= 0) continue;
      blend(p, x, y, '#FFE6B0', 0.3 * a);
      // the mesh's shadow: the same diamonds, stretched a little along the light
      const sx = Math.round(x + s);
      const sy = Math.round(y * 0.8);
      if (onMesh(sx, sy)) blend(p, x, y, '#2A1C14', 0.55 * a);
    }
  // a few loose ends of thread on the floor under the nets
  for (let i = 0; i < 6; i++) {
    const x = 40 + ihash(i, 1, 4207) % 170;
    const y = 50 + (ihash(i, 2, 4207) % 6);
    p.set(x, y, ITO);
    p.set(x + 1, y + 1, ITO);
  }
  const img = p.toCanvas();
  return { ox: 0, oy: 0, w: sh.w * 16, h: sh.h * 16, foot: 0, flat: true, img: () => img, glass: sh.glass.toCanvas() } satisfies PropArt;
});

/** 網の 破れ（壁の 網の 上）：つくろう 前は 穴と ちぎれた 糸、すんだら 新しい 糸の 目。 */
registerProp('prop_ag_ana', (opts) => {
  const k = Number(opts.k ?? 0);
  const [cx, cy] = anaAt(k);
  const [tx, ty] = [AG_ANA[k][0], 0];
  // the picture covers 32×48 round the hole (the wall's rows), anchored at the hole's tile's row 0
  const W = 32;
  const H = 48;
  const ox = cx - 16 - tx * 16;
  const make = (fixed: boolean) => {
    const p = new PixelCanvas(W, H);
    for (let j = 0; j < H; j++)
      for (let i = 0; i < W; i++) {
        const x = cx - 16 + i;
        const y = ty * 16 + j;
        const dx = x - cx;
        const dy = y - cy;
        if (!inAna(k, dx, dy)) continue;
        if (fixed) {
          if (onMesh(x, y)) p.set(i, j, ITO_NEW);
          continue;
        }
        // the hole: the wall behind (the mesh gone), a few broken ends at its rim
        p.set(i, j, x % 12 === 0 ? '#1E140E' : '#2E2018');
        if (!inAna(k, dx * 1.25, dy * 1.25) && onMesh(x, y) && ihash(x, y, 4211 + k) % 3 === 0) p.set(i, j, ITO);
      }
    if (fixed) {
      // the knots: brighter dots at the crossings inside the mended part
      for (let j = 0; j < H; j++)
        for (let i = 0; i < W; i++) {
          const x = cx - 16 + i;
          const y = ty * 16 + j;
          if (!inAna(k, x - cx, y - cy)) continue;
          if (((x + y) % ME + ME) % ME === 0 && ((x - y) % ME + ME) % ME === 0) p.set(i, j, '#E8F6D8');
        }
    } else if (k === 2) {
      // the fish bones caught at its rim: a spine and ribs, white
      const bx = 16 + 7;
      const by = cy + 2;
      p.hline(bx - 4, bx + 3, by, '#F4F1E8');
      for (let r = -3; r <= 2; r += 2) {
        p.set(bx + r, by - 1, '#E8E4D8');
        p.set(bx + r, by + 1, '#E8E4D8');
      }
      p.set(bx + 4, by - 1, '#F4F1E8');
      p.set(bx + 4, by + 1, '#F4F1E8');
    }
    return p.toCanvas();
  };
  const imgs = [make(false), make(true)];
  return { ox, oy: 0, w: W, h: H, foot: 0, flat: true, img: (env: PropEnv) => imgs[env.flag(`flag_ag_ana_${k}`) ? 1 : 0] } satisfies PropArt;
});

/** たたんだ 網の 山 (1–3,5–6)：緑の 網を 折り重ねた 山、上に 浮きの 列（橙）、すそに おもりの 列（灰）。 */
registerProp('prop_ag_yama', () =>
  standProp(48, 30, (p) => {
    for (let layer = 0; layer < 4; layer++) {
      const y = 24 - layer * 5;
      const inset = layer * 3;
      p.rect(1 + inset, y, 46 - inset * 2, 6, layer % 2 ? '#5E8466' : '#6A9070');
      for (let x = 1 + inset; x < 47 - inset; x++) if (onMesh(x, y + layer)) p.set(x, y + 1 + (x % 3), '#4E6A56');
      p.hline(1 + inset, 46 - inset, y, '#8AB090');
    }
    // the float line on top (orange floats), the lead line at the foot (grey)
    for (let x = 12; x < 38; x += 5) {
      p.ellipse(x, 7, 2, 2, '#E8743A');
      p.set(x - 1, 6, '#FFA06A');
    }
    for (let x = 3; x < 46; x += 4) p.rect(x, 28, 2, 2, '#8E95A6');
  }, { cx: 24, base: 32, shadow: 0 }),
);

/** 道具箱 (8–9,4)：木の 箱、上に 網針（竹）・目板・網糸の 玉。 */
registerProp('prop_ag_dougu', () =>
  standProp(30, 20, (p) => {
    p.rect(1, 8, 28, 11, '#8A6A48');
    p.hline(1, 28, 8, '#B08A5E');
    p.hline(1, 28, 13, '#6E5236');
    p.vline(28, 9, 18, '#5A4030');
    // the gauge (a flat board) and two needles laid on the lid
    p.rect(4, 5, 12, 3, '#D8B880');
    p.hline(4, 15, 5, '#F0D8A8');
    p.line(17, 6, 25, 3, HARI);
    p.line(17, 7, 25, 4, '#A8884A');
    p.set(25, 3, '#E8D8A8');
    // a ball of net twine
    p.ellipse(9, 3, 3, 2, ITO_NEW);
    p.set(8, 2, '#E8F6D8');
  }, { cx: 16, base: 16, shadow: 0 }),
);

/** 浮きの 箱と おもりの 箱 (13–14,5–6)。 */
registerProp('prop_ag_hako', () =>
  standProp(30, 28, (p) => {
    // the floats' box (north): orange and white floats heaped
    p.rect(1, 8, 28, 8, '#7A5A3A');
    p.hline(1, 28, 8, '#9A7448');
    for (let i = 0; i < 8; i++) p.ellipse(4 + i * 3.2, 7 - (i % 2), 2, 2, i % 3 === 0 ? '#F4F1E8' : '#E8743A');
    // the weights' box (south): grey lead rings
    p.rect(2, 18, 26, 9, '#6A5040');
    p.hline(2, 27, 18, '#8A6A4A');
    for (let i = 0; i < 6; i++) {
      p.rect(5 + i * 4, 15, 3, 3, '#8E95A6');
      p.set(6 + i * 4, 16, '#5E6478');
    }
  }, { cx: 16, base: 32, shadow: 0 }),
);

/** 腰かけ (7,4)：木の 丸い 腰かけ。 */
registerProp('prop_ag_koshi', () =>
  standProp(12, 12, (p) => {
    p.ellipse(6, 3, 5, 2, '#B08A5E');
    p.hline(2, 9, 2, '#D0AA7A');
    p.vline(2, 4, 11, '#6E5236');
    p.vline(9, 4, 11, '#6E5236');
    p.hline(2, 9, 8, '#6E5236');
  }, { cx: 8, base: 16, shadow: 6, contact: 0 }),
);

/** 長靴 (9,8)：黒い ゴムの 長靴 1足、白く かわいた 塩の あと。 */
registerProp('prop_ag_nagagutsu', () =>
  standProp(14, 16, (p) => {
    for (const x of [1, 7]) {
      p.rect(x, 1, 5, 13, '#2A2A30');
      p.rect(x, 12, 6, 3, '#2A2A30');
      p.vline(x, 1, 13, '#4A4A54');
      p.hline(x, x + 4, 1, '#5A5A64');
      for (let y = 7; y < 14; y += 3) p.set(x + 2, y, '#E8E4D8');
      p.set(x + 1, 10, '#D8D4C8');
    }
  }, { cx: 8, base: 16, shadow: 0 }),
);
