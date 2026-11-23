// 掃除は 上から（げむきか 10/20 の 案3、03_ch3_index）：旧水族館の 屋上 map_c3_aq_okujou（20×10）と、
// 入口と 券売所の 西の 壁の 鉄の 戸『屋上 ― 点検用』(0,4)。62 の 旧水族館の 屋根「平らな 屋上、ふちに 手すり、
// 給水塔」の まま。描く 物は 少なく（屋上は 外の 景色なので 重くしない）：
//
//  - prop_c3_aq_okujou_shell：コンクリートの 平らな 屋上（雨の しみ、目地）、北の 低い 胸壁、北西の 階段室の 鉄の 戸、
//    胸壁の 向こうの 空と 海（外は 12:01：雲と 波が 動く。glow）、南西の 排水口の まわりの 黒い 輪。
//  - prop_oj_tank 給水塔 (16–17,1–2)、prop_oj_tenmado 天窓 (7–11,3–5。くもりガラス、寝た 絵)、
//    prop_oj_shitsugaiki 室外機 (3,6)、prop_oj_haisui 排水口 (2,8)・(17,8)（南西は つまり → すむと 網の 目）、
//    prop_oj_saku 南の 手すり (1–18,9)、prop_oj_kamome 止まった カモメ（宙。真下に うすい 影）。
//  - prop_oj_to：入口の 西の 壁の 戸。さびて 開いた まま、すき間から 外の 白い 光が 床に 落ちる。上に 赤い ふちの 札
//    （見つけやすく：光と 札は S15〜S20 の 間だけ。events/ch3/okujou.ts）。

import { mix, PixelCanvas } from '../../engine/pixel';
import type { Gfx } from '../../engine/gfx';
import { h01, valueNoise } from '../tiles/noise';
import { CP } from '../tiles/c3_ground';
import { getMapDef } from '../../world/maps';
import { blend, paintShell, screenPool, warmPool } from './ishell';
import { standProp } from './hoshi_kit';
import { registerProp } from './registry';
import type { PropArt, PropEnv } from './types';

const SW_DONE = (env: PropEnv): boolean => env.flag('flag_oj_ami') > 0;

// ================================================================ 屋上の 殻

registerProp('prop_c3_aq_okujou_shell', () => {
  const rows = getMapDef('map_c3_aq_okujou')?.rows ?? [];
  const sh = paintShell({
    rows,
    floor: (x, y, tx, ty) => {
      // the flat roof: grey concrete in the full noon sun, the rain's stains, the slab's joints
      const n = valueNoise(x / 11, y / 9, 8101);
      let c = n > 0.64 ? '#D4D0C4' : n < 0.3 ? '#B4B0A4' : '#C4C0B4';
      if (x % 64 === 0 || y % 48 === 0) c = '#A8A498';
      if (h01(x, y, 8103) > 0.988) c = '#9A968C';
      // the drain's fall: the slab a touch darker toward the south edge
      if (ty >= 7) c = mix(c, '#9A968C', 0.08 * (ty - 6));
      void tx;
      return c;
    },
    wall: (x, y, fh) => {
      // the low parapet (grey concrete, a weathered cap); the stair hut's face is painted over below
      if (y >= fh - 4) return y === fh - 4 ? '#8A867C' : '#6A665E';
      return valueNoise(x / 7, y / 5, 8105) > 0.76 ? '#C8C4B8' : '#B8B4A8';
    },
    trim: '#D8D4C8',
    base: '#7A766C',
    baseH: 3,
  });
  const p = sh.p;
  const W = sh.w * 16;
  // the sky over the parapet's cap (the far sea's line low in it): the top 6 px of the wall row
  for (let y = 0; y < 6; y++)
    for (let x = 32; x < W - 16; x++) p.set(x, y, y < 4 ? mix(CP.skyTop, CP.skyBot, y / 4) : y === 4 ? '#E8F4FA' : CP.umi);
  // the sea far below at the sides, past the roof's edge
  for (const x0 of [0, W - 16])
    for (let y = 0; y < 9 * 16; y++)
      for (let x = x0; x < x0 + 16; x++) {
        let c = mix('#5A9ACC', CP.umiDk, y / (9 * 16));
        if ((x * 7 + y * 13) % 31 === 0) c = mix(c, '#E8F4FA', 0.5);
        p.set(x, y, c);
      }
  // the stair hut (1,0–1): a concrete box with its iron door, 『点検用』 (strokes) on a plate
  const hx = 16;
  for (let y = 0; y < 32; y++) for (let x = hx; x < hx + 16; x++) p.set(x, y, y < 2 ? '#D8D4C8' : valueNoise(x / 5, y / 6, 8107) > 0.7 ? '#BCB8AC' : '#ACA89C');
  p.rect(hx + 2, 9, 12, 23, '#5A6070');
  p.rect(hx + 3, 10, 10, 21, '#6B7186');
  for (let y = 12; y < 30; y += 4) p.hline(hx + 4, hx + 11, y, '#5E6476');
  p.rect(hx + 10, 20, 2, 2, '#D9A441');
  p.rect(hx + 4, 3, 8, 4, '#F4F1E8');
  p.hline(hx + 5, hx + 10, 5, '#2A2440');
  // rust down from the hinges
  for (let k = 0; k < 6; k++) {
    p.set(hx + 3, 12 + k, mix('#8A5A3A', '#6B7186', k / 7));
    p.set(hx + 3, 24 + k, mix('#8A5A3A', '#6B7186', k / 7));
  }
  // the black rings round the south-west drain (2,8): the water stood there rain after rain
  const dcx = 2 * 16 + 8;
  const dcy = 8 * 16 + 8;
  for (let r = 0; r < 4; r++) {
    const rx = 10 + r * 6;
    const ry = 6 + r * 4;
    for (let a = 0; a < 360; a += 2) {
      const t = (a * Math.PI) / 180;
      const x = Math.round(dcx + Math.cos(t) * rx + Math.sin(t * 3 + r) * 1.2);
      const y = Math.round(dcy + Math.sin(t) * ry);
      if (y >= 9 * 16 || y < 16 || x < 16) continue;
      blend(p, x, y, '#3A3A38', 0.55 - r * 0.1);
      blend(p, x, y + 1, '#5A5A54', 0.25);
    }
  }
  // inside the rings the concrete is stained darker
  for (let y = dcy - 22; y < 9 * 16; y++)
    for (let x = 16; x < dcx + 30; x++) {
      const dx = (x - dcx) / 30;
      const dy = (y - dcy) / 22;
      if (dx * dx + dy * dy < 1) blend(p, x, y, '#6A6A64', 0.12 * (1 - dx * dx - dy * dy));
    }
  const img = p.toCanvas();
  return {
    ox: 0,
    oy: 0,
    w: W,
    h: sh.h * 16,
    foot: 0,
    flat: true,
    img: () => img,
    // outside it is 12:01: a cloud drifts over the far sea, the sea glints at the sides
    glow: (g: Gfx, x: number, y: number, env: PropEnv) => {
      const t = env.t / 1000;
      const cx = x + 40 + ((t * 6) % (W - 120));
      g.rect(Math.round(cx), y + 1, 14, 2, '#FFFFFF', 0.7);
      g.rect(Math.round(cx) + 3, y, 7, 1, '#FFFFFF', 0.6);
      for (let k = 0; k < 6; k++) {
        const side = k % 2 ? W - 16 : 0;
        const gy = (k * 37 + Math.floor(t * 2) * 11) % (8 * 16);
        const a = 0.4 + 0.4 * Math.sin(t * 3 + k);
        g.rect(x + side + 3 + ((k * 5) % 9), y + gy + 4, 3, 1, '#F4FAFC', a);
      }
    },
  } satisfies PropArt;
});

// ================================================================ 屋上の 物

/** 給水塔 (16–17,1–2)：鉄の 脚の 上の 丸い タンク、はしご。 */
registerProp('prop_oj_tank', () =>
  standProp(34, 58, (p) => {
    // the legs and their braces
    for (const x of [4, 29]) p.rect(x, 26, 2, 32, '#6B7186');
    p.line(5, 30, 29, 54, '#5A6070');
    p.line(29, 30, 5, 54, '#5A6070');
    // the tank: a squat drum, lit from above
    p.rect(1, 6, 32, 22, '#9AA8B0');
    p.ellipse(17, 6, 16, 4, '#C8D4DA');
    p.vline(2, 6, 27, '#B8C4CA');
    p.vline(31, 6, 27, '#6A7880');
    for (const y of [12, 20]) p.hline(1, 32, y, '#7A8890');
    p.rect(1, 27, 32, 2, '#5A6670');
    // rust streaks
    for (const x of [8, 22]) for (let k = 0; k < 7; k++) p.set(x, 13 + k, mix('#8A5A3A', '#9AA8B0', k / 8));
    // the ladder up its side
    p.vline(25, 8, 57, '#3A3F48');
    p.vline(28, 8, 57, '#3A3F48');
    for (let y = 10; y < 57; y += 4) p.hline(25, 28, y, '#3A3F48');
    // the plate 『点検 毎月』 (strokes)
    p.rect(9, 14, 10, 5, '#F4F1E8');
    p.hline(10, 16, 16, '#2A2440');
  }, { cx: 16, base: 32, shadow: 30 }),
);

/** 天窓 (7–11,3–5)：低い 枠の 上に くもりガラス（大水槽の ホールの 上）。寝た 絵。 */
registerProp('prop_oj_tenmado', () => {
  const p = new PixelCanvas(80, 48);
  p.rect(0, 0, 80, 48, '#8A867C');
  p.rect(1, 1, 78, 46, '#A8A498');
  p.rect(3, 3, 74, 40, '#C8DCE4');
  for (let y = 3; y < 43; y++)
    for (let x = 3; x < 77; x++) {
      if (h01(x, y, 8111) > 0.7) p.set(x, y, '#D8E8EE');
      if ((x + y) % 23 === 0) p.set(x, y, '#E8F4F8');
    }
  for (const x of [27, 52]) p.rect(x, 3, 2, 40, '#7A8890');
  p.rect(3, 22, 74, 2, '#7A8890');
  // dust in the corners, the frame's front edge (its low curb) darker
  for (let x = 3; x < 77; x++) p.set(x, 42, '#B8C4C4');
  p.rect(0, 44, 80, 4, '#6A665E');
  const img = p.toCanvas();
  return {
    ox: 0,
    oy: 0,
    w: 80,
    h: 48,
    foot: 0,
    flat: true,
    img: () => img,
    glow: (g: Gfx, x: number, y: number) => {
      // the noon on the frosted glass
      g.rect(x + 6, y + 6, 18, 1, '#FFFFFF', 0.5);
      g.rect(x + 31, y + 6, 16, 1, '#FFFFFF', 0.4);
    },
  } satisfies PropArt;
});

/** 古い 室外機 (3,6)：灰色の 箱、止まった 羽根。 */
registerProp('prop_oj_shitsugaiki', () =>
  standProp(22, 20, (p) => {
    p.rect(1, 2, 20, 16, '#C8C8BC');
    p.hline(1, 20, 2, '#E0E0D4');
    p.vline(20, 3, 17, '#8A8A80');
    p.ellipse(9, 10, 6, 6, '#5A5E66');
    p.ellipse(9, 10, 5, 5, '#3A3F48');
    p.line(9, 5, 9, 15, '#7A7E86');
    p.line(4, 10, 14, 10, '#7A7E86');
    for (let y = 5; y < 16; y += 2) p.hline(16, 19, y, '#9A9A90');
    p.rect(2, 18, 3, 2, '#6A665E');
    p.rect(17, 18, 3, 2, '#6A665E');
  }, { cx: 8, base: 16, shadow: 12 }),
);

/** 排水口 (2,8)・(17,8)：四角い ふたの 網。南西は 砂・羽・松葉・ボールで ふさがる（すむと 網の 目）。 */
registerProp('prop_oj_haisui', (opts) => {
  const sw = opts.v === 'sw';
  const paint = (clog: boolean) => {
    const p = new PixelCanvas(16, 16);
    p.rect(2, 3, 12, 11, '#5A5A54');
    p.rect(3, 4, 10, 9, '#2A2A28');
    for (let x = 4; x < 13; x += 2) p.vline(x, 4, 12, '#8A8A84');
    for (let y = 5; y < 13; y += 3) p.hline(3, 12, y, '#7A7A74');
    if (clog) {
      // the sand heaped over it, the feather, the pine needles, the little ball
      for (let y = 4; y < 14; y++) for (let x = 2; x < 14; x++) if (h01(x, y, 8121) > 0.25) p.set(x, y, h01(x, y, 8123) > 0.5 ? '#B8A880' : '#A8986E');
      p.line(3, 6, 8, 5, '#3A6A3A');
      p.line(4, 8, 9, 6, '#4A7A44');
      p.ellipse(10, 9, 3, 3, '#D8503A');
      p.set(9, 8, '#F08A6A');
      p.line(5, 11, 11, 12, '#F4F1E8');
      p.set(11, 12, '#C8CDD4');
    }
    return p.toCanvas();
  };
  const open = paint(false);
  const clogged = sw ? paint(true) : open;
  return { ox: 0, oy: 0, w: 16, h: 16, foot: 0, flat: true, img: (env) => (sw && !SW_DONE(env) ? clogged : open) } satisfies PropArt;
});

/** 南の 手すり (1–18,9)：灰色の 鉄の 手すり、胸の 高さの 横棒、低い コンクリートの 立ち上がり。 */
registerProp('prop_oj_saku', () =>
  standProp(288, 18, (p) => {
    p.rect(0, 12, 288, 6, '#9A968C');
    p.hline(0, 287, 12, '#D8D4C8');
    for (let x = 2; x < 288; x += 8) p.vline(x, 2, 11, '#7A8088');
    p.hline(0, 287, 1, '#B8BEC6');
    p.hline(0, 287, 2, '#7A8088');
    p.hline(0, 287, 7, '#7A8088');
    // where the hands rest the paint is worn
    for (const x of [140, 152, 164]) p.hline(x, x + 4, 1, '#E0E4E8');
  }, { cx: 144, base: 16, shadow: 8, outline: true }),
);

/** 止まった カモメ：手すりの 線より 内側、屋上の 上で 羽を 広げた まま 宙に（真下に うすい 影）。 */
registerProp('prop_oj_kamome', (opts) => {
  const h = Number(opts.h ?? 30);
  // one tall picture: the gull at its top, h px over the roof, nothing below (it stands as a picture at the
  // tile's foot in HD-2D, room_tune.ts ROOM_SOLID 'flat'; in 2D it is simply drawn up there)
  const H = h + 14;
  const p = new PixelCanvas(29, H);
  // wings spread wide and held (a black-tailed gull: grey back, black tips, white below), the body, the bill
  const top = [[0, 2], [5, 1], [10, 4], [13, 6], [15, 6], [18, 4], [23, 1], [28, 2]];
  for (let k = 0; k + 1 < top.length; k++) {
    p.line(top[k][0], top[k][1], top[k + 1][0], top[k + 1][1], '#3A3F48');
    p.line(top[k][0], top[k][1] + 1, top[k + 1][0], top[k + 1][1] + 1, '#9AA0A8');
    p.line(top[k][0], top[k][1] + 2, top[k + 1][0], top[k + 1][1] + 2, '#F4F1E8');
  }
  for (const x of [0, 1, 2, 26, 27, 28]) {
    p.set(x, 2, '#1B1733');
    p.set(x, 3, '#2A2440');
  }
  p.rect(12, 5, 5, 6, '#FFFFFF');
  p.rect(12, 10, 5, 1, '#C8CDD4');
  p.set(14, 11, '#FFD23F');
  p.set(14, 12, '#E8A030');
  const img = p.toCanvas();
  const sh = new PixelCanvas(20, 4);
  sh.ellipse(10, 2, 9, 1, '#000000');
  const shImg = sh.toCanvas();
  return {
    ox: -6,
    oy: 16 - H,
    w: 29,
    h: H,
    foot: 15,
    img: () => img,
    // its soft shadow straight below on the roof
    over: (g: Gfx, x: number, y: number) => {
      g.ctx.save();
      g.ctx.globalAlpha = 0.14;
      g.ctx.drawImage(shImg, Math.round(x - 2), Math.round(y + 12));
      g.ctx.restore();
    },
    // the stopped time's glint on its wing now and then
    glow: (g: Gfx, x: number, y: number, env: PropEnv) => {
      if (Math.floor(env.t / 1800) % 3 === 0) g.rect(x - 6 + 6, y + 16 - H + 3, 1, 1, '#FFFFFF', 0.9);
    },
    contact: 0,
  } satisfies PropArt;
});

// ================================================================ 入口の 西の 壁の 戸（見つけやすく）

/**
 * 鉄の 戸『屋上 ― 点検用』(0,4)：入口の ホールの 西の 壁。さびた 戸が 少し 開いて、すき間から 外の 白い 光が
 * (1,4) の 床に 細く 落ちる。戸の 上に 赤い ふちの 札。寝た 絵（床の 光）と、立つ 戸の 絵は 別。
 */
registerProp('prop_oj_to_hikari', () => {
  const p = new PixelCanvas(16, 16);
  for (let y = 2; y < 15; y++) p.set(0, y, '#F4F6EE');
  for (let y = 4; y < 13; y++) p.set(1, y, '#D8DCD0');
  const img = p.toCanvas();
  return {
    ox: 0,
    oy: 0,
    w: 16,
    h: 16,
    foot: 0,
    flat: true,
    img: () => img,
    glow: (g: Gfx, x: number, y: number, env: PropEnv) => {
      const a = 0.75 + 0.2 * Math.sin(env.t / 500);
      g.rect(x, y + 2, 2, 13, '#FFFFFF', a);
      screenPool(g, x + 6, y + 8, 12, 8, '#FFF6D8', 0.45 * a);
    },
    light: (g: Gfx, x: number, y: number) => warmPool(g, x + 6, y + 8, 26, 16, '#FFF6D8', 0.6),
  } satisfies PropArt;
});

registerProp('prop_oj_to', (opts) => {
  const open = Number(opts.open ?? 0) > 0;
  return standProp(14, 40, (p) => {
    // the iron door ajar in the west wall, seen edge-on a little: its frame, the white gap
    p.rect(0, 10, 14, 30, '#4A5060');
    p.rect(2, 12, 9, 28, '#6B7186');
    for (let y = 15; y < 38; y += 5) p.hline(3, 9, y, '#5E6476');
    p.rect(11, 12, 2, 28, open ? '#F4F6EE' : '#3A3F48');
    p.rect(8, 26, 2, 2, '#D9A441');
    for (let k = 0; k < 8; k++) p.set(3, 14 + k, mix('#8A5A3A', '#6B7186', k / 9));
    // the plate over it: red border, 『屋上 ― 点検用』 in strokes
    p.rect(0, 0, 14, 9, '#C8452E');
    p.rect(1, 1, 12, 7, '#F4F1E8');
    p.hline(2, 7, 3, '#2A2440');
    p.hline(2, 11, 5, '#2A2440');
  }, { cx: 13, base: 16, shadow: 0, outline: true, extra: open ? { glow: (g: Gfx, x: number, y: number, env: PropEnv) => {
    // (art left at x + 6: the gap's column at x + 17)
    const a = 0.55 + 0.25 * Math.sin(env.t / 500);
    g.rect(x + 17, y + 16 - 40 + 12, 2, 28, '#FFFFFF', a);
  } } : {} });
});
