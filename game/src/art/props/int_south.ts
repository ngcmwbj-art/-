// 南の列の部屋の絵（1）：ちずの家（map_chizu）、なんばるわんの家（map_madam）、
// 夕鳴写真館（map_photo）。30_level_art 4.13〜4.15。
//
// 床は各マップの地面（畳・板・土間）をそのまま焼き、壁の飾りは殻に描く。
// 北の壁ぎわの家具も、部屋の中ほどの家具も、深さ順に並ぶ小物（prop）。

import type { Gfx } from '../../engine/gfx';
import type { PixelCanvas } from '../../engine/pixel';
import { P } from '../tiles/palette';
import { ihash, valueNoise } from '../tiles/noise';
import { prop } from './ifurn';
import { screenPool, warmPool } from './ishell';
import { castRight, dk, finish, lt } from './kit';
import { mkFrames, stand } from './pkit';
import { registerProp } from './registry';
import { fontTextSmall, printLines, tiny } from './text';
import type { PropArt, PropEnv } from './types';
import { box, boardsV, frameOn, pcv, southShell, wallClock } from './int_south_kit';
import './int_south2';

const noFoot = { base: 16, contact: 0, shadow: 0 };

// =====================================================================================
// ちずの家（map_chizu, 10×7）: 砂壁と柱、畳の間、板の間、土間。植物と、ピンクの水まき道具。
// =====================================================================================

southShell({
  id: 'in_cz_shell',
  map: 'map_chizu',
  wall: (x, y) => {
    // sand-plaster wall (砂壁) between pillars, a 長押 beam near the top
    if (x % 80 < 3) return x % 80 === 0 ? P.woodLt : P.wood;
    if (y === 7) return P.woodLt;
    if (y === 8 || y === 9) return P.wood;
    const n = valueNoise(x / 3, y / 3, 5101);
    return n > 0.8 ? P.paper : n < 0.14 ? P.woodLt : P.paperGrid;
  },
  trim: P.wood,
  base: P.woodDark,
  baseH: 3,
  decor: (p, glass) => {
    // (3,0–1) the calendar: a month of boxes, three pencil rings in each day
    const cx = 50;
    const cy = 11;
    p.rect(cx, cy, 12, 16, P.white);
    p.rect(cx, cy, 12, 4, P.crimson);
    fontTextSmall(p, '8', cx + 4, cy - 1, P.white, 2);
    for (let j = 0; j < 4; j++)
      for (let i = 0; i < 5; i++) {
        const X = cx + 1 + i * 2;
        const Y = cy + 5 + j * 3;
        p.set(X, Y, (i + j * 5) % 3 === 0 ? P.verm : P.steel);
        if ((i + j) % 2 === 0) p.set(X, Y + 1, P.concrete);
      }
    p.set(cx + 5, cy - 1, P.charcoal);
    castRight(p, cx, cy, 12, 16, 2);
    // (4–5,0–1) the window over the sideboard: sliding glass, a bamboo blind half down
    const wx = 66;
    const wy = 10;
    p.rect(wx - 2, wy - 2, 32, 21, P.woodDark);
    p.rect(wx, wy, 28, 17, P.shadeDeep);
    glass.rect(wx, wy + 7, 28, 10, '#ffffff');
    p.vline(wx + 14, wy, wy + 16, P.woodLt);
    for (let j = wy; j < wy + 7; j++) p.hline(wx, wx + 27, j, j % 2 ? P.brassOld : P.goldPale);
    p.hline(wx, wx + 27, wy + 7, P.woodDark);
    p.vline(wx + 6, wy + 7, wy + 9, P.verm);
    p.vline(wx + 21, wy + 7, wy + 9, P.verm);
    p.hline(wx - 2, wx + 29, wy + 19, P.woodLt);
    castRight(p, wx - 2, wy - 2, 32, 22, 2);
    // (7,0–1) the certificate 『花いっぱい運動』 in a thin gold frame, the name blurred by water
    frameOn(p, 113, 10, 14, 11, P.brass, (q, ix, iy, iw) => {
      q.rect(ix + 3, iy, 4, 1, P.verm);
      printLines(q, ix, iy + 2, iw, 2, P.steel, 51);
      q.set(ix + 5, iy + 5, P.aqua);
      q.set(ix + 6, iy + 5, P.blue);
    });
    // the step up from the genkan (上がりかまち) along the genkan's north edge
    p.hline(112, 143, 80, P.woodLt);
    p.hline(112, 143, 81, P.wood);
    p.hline(112, 143, 82, P.woodDark);
    // a pair of guest slippers set out on the step, and ちず's sandals on the tiles
    for (const [sx, c] of [[118, P.peach], [124, P.peach]] as [number, string][]) {
      p.rect(sx, 76, 4, 3, c);
      p.hline(sx, sx + 3, 76, P.crimson);
    }
    p.rect(130, 88, 3, 5, P.crimson);
    p.rect(134, 87, 3, 5, P.crimson);
  },
  town: [11, 30],
  bld: [9, 14, 25],
  skin: [P.concreteLt, P.concrete, P.steel],
  roof: 'tin',
  seed: 5401,
  lamps: [{ x: 72, y: 64, rx: 46, ry: 22, col: P.goldPale, a: 0.12 }],
  spill: P.sky,
});

// (1,2) the rubber tree in a glazed pot: every leaf wiped shiny
registerProp('in_cz_rubber', () =>
  prop(20, 42, (p) => {
    p.rect(5, 30, 10, 11, P.maroon);
    p.hline(4, 15, 30, P.sunShade);
    p.vline(5, 31, 40, P.sunShade);
    p.vline(14, 31, 40, dk(P.maroon));
    p.hline(6, 13, 40, dk(P.maroon));
    p.rect(6, 31, 8, 1, P.woodDark);
    p.vline(10, 8, 30, P.wood);
    const leaves: [number, number, number][] = [[4, 6, -1], [15, 9, 1], [3, 15, -1], [16, 17, 1], [5, 23, -1], [14, 25, 1], [10, 2, 0]];
    for (const [lx, ly, s] of leaves) {
      p.ellipse(lx + 0.5, ly + 0.5, 3.5, 2.2, P.leafShade);
      p.ellipse(lx, ly, 2.8, 1.6, P.leafDeep);
      p.set(lx - 1, ly - 1, P.leafLt);
      p.set(lx, ly - 1, P.glint);
      if (s) p.line(10, ly + 2, lx - s * 2, ly + 1, P.wood);
    }
  }, noFoot),
);

// (2,2) the tea cabinet (茶だんす): glass doors, three cups, a teapot on top
registerProp('in_cz_tansu', () =>
  prop(16, 34, (p) => {
    box(p, 1, 8, 14, 26, P.wood);
    p.rect(2, 10, 12, 10, P.shadeDeep);
    p.vline(8, 10, 19, P.woodLt);
    // cups on the shelf (one chipped)
    for (const [cx, c] of [[3, P.white], [6, P.leafYoung], [10, P.white]] as [number, string][]) {
      p.rect(cx, 16, 2, 3, c);
      p.set(cx, 16, lt(c));
    }
    p.set(11, 16, P.shadeDeep);
    p.set(3, 11, P.glint);
    p.set(4, 12, P.glint);
    // two drawers with brass pulls
    p.hline(2, 13, 22, P.woodDark);
    p.hline(2, 13, 28, P.woodDark);
    p.set(7, 25, P.brass);
    p.set(8, 25, P.brass);
    p.set(7, 31, P.brass);
    p.set(8, 31, P.brass);
    // a teapot and a tin of tea leaves on top
    p.ellipse(5, 5, 3, 2.5, P.leafShade);
    p.set(4, 4, P.leaf);
    p.hline(3, 7, 2, P.woodDark);
    p.set(9, 5, P.leafShade);
    p.rect(11, 3, 3, 5, P.crimson);
    p.hline(11, 13, 3, P.peach);
  }, noFoot),
);

// (4–5,2) the low sideboard: the radio (antenna up) and a vase of sunflowers (they face north-east in stage 2)
registerProp('in_cz_radio', () => {
  const frames = mkFrames(2, 32, 36, (p, k) => {
    box(p, 1, 22, 30, 14, P.woodDark);
    p.hline(2, 29, 23, P.wood);
    p.hline(2, 29, 29, P.ink);
    p.set(15, 26, P.brass);
    p.set(15, 32, P.brass);
    // the radio: cream body, a dial, a speaker grille, the telescopic antenna
    box(p, 3, 13, 13, 9, P.concreteLt);
    for (let j = 15; j < 20; j += 2) p.hline(4, 9, j, P.steel);
    p.ellipse(12.5, 17, 2, 2, P.woodLt);
    p.set(12, 16, P.verm);
    p.line(14, 13, 18, 2, P.steel);
    p.set(18, 1, P.concreteLt);
    // the vase and three sunflowers
    p.rect(21, 14, 6, 8, P.aqua);
    p.vline(21, 14, 21, P.glint);
    p.vline(26, 15, 21, P.blue);
    const heads: [number, number][] = k === 0 ? [[20, 4], [25, 2], [28, 7]] : [[22, 3], [27, 1], [29, 5]];
    for (const [hx, hy] of heads) {
      p.line(24, 14, hx, hy + 2, P.leafDeep);
      p.ellipse(hx, hy, 2.4, 2.4, P.gold);
      p.set(hx, hy, P.wood);
      p.set(hx + (k ? 1 : 0), hy - (k ? 1 : 0), P.woodDark);
      p.set(hx - 2, hy - 1, P.goldPale);
    }
    p.set(22, 11, P.leaf);
    p.set(26, 10, P.leaf);
  }, (p) => finish(p, { soft: true }));
  const a = stand(frames[0], { cx: 16, base: 16, contact: 0, shadow: 0 });
  a.img = (env: PropEnv) => frames[env.stage >= 2 && env.stage < 3 ? 1 : 0];
  return a;
});

// (8,2) ちず's pink standing fan: the head sways in stage 0, stops mid-sway
// in stage 1, stays turned to the north-east (right) in stage 2
registerProp('in_cz_fan', () => {
  const frames: HTMLCanvasElement[] = [];
  for (const yaw of [-1, 0, 1])
    for (let b = 0; b < 3; b++) {
      const p = pcv(18, 34);
      p.ellipse(9, 31.5, 6.5, 2.5, P.sunShade);
      p.ellipse(9, 31, 6, 2, P.peach);
      p.hline(5, 11, 30, P.crimson);
      p.rect(8, 16, 2, 14, P.white);
      p.vline(10, 17, 29, P.concrete);
      p.rect(7, 21, 4, 2, P.peach);
      const cx = 9 + yaw;
      if (yaw) p.ellipse(cx - yaw * 3, 9, 3, 3.5, P.peach);
      const rx = yaw ? 5.2 : 6.5;
      const ry = 6.5;
      for (let y = 0; y < 18; y++)
        for (let x = 0; x < 18; x++) {
          const dx = (x + 0.5 - (cx + 0.5)) / rx;
          const dy = (y + 0.5 - 9.5) / ry;
          const d = Math.hypot(dx, dy);
          if (d > 1) continue;
          if (d > 0.84) {
            p.set(x, y, dx < -0.2 || dy < -0.5 ? P.white : P.concrete);
            continue;
          }
          const ang = ((Math.atan2(dy, dx) * 180) / Math.PI + 360 + b * 40) % 120;
          const blade = ang < 52 && d > 0.18;
          p.set(x, y, blade ? (dx + dy < 0 ? P.white : P.peach) : d < 0.2 ? P.crimson : P.shadeDeep);
          if (d > 0.56 && d < 0.66 && ((x + y) & 1) === 0) p.set(x, y, P.concreteLt);
        }
      finish(p, { soft: true, rim: false });
      frames.push(p.toCanvas());
    }
  const a = stand(frames[3], { cx: 8, base: 16, contact: 10, shadow: 0 });
  a.img = (env: PropEnv) => {
    const sway = env.stage === 1 ? -0.2 : env.stage === 2 ? 1 : Math.sin(env.mt / 1600);
    const yi = sway < -0.45 ? 0 : sway > 0.45 ? 2 : 1;
    const bi = Math.floor(env.t / 55) % 3;
    return frames[yi * 3 + bi];
  };
  return a;
});

// (6,1) the pendulum clock on the pillar side of the wall
wallClock('in_cz_clock', { r: 5, rim: P.woodDark, face: P.paper, ox: 2, oy: -8, pendulum: true });

// (2,3) the flat cushion (座布団) ちずの母 sits on
registerProp('in_cz_zabuton', () => {
  const p = pcv(16, 10);
  p.rect(1, 1, 14, 8, P.navy);
  p.strokeRect(1, 1, 14, 8, P.nightShade);
  p.hline(2, 13, 2, P.blue);
  p.set(7, 4, P.gold);
  p.set(8, 4, P.gold);
  p.set(1, 1, 'transparent');
  p.set(14, 1, 'transparent');
  return { ox: 0, oy: 6, w: 16, h: 10, foot: 0, flat: true, img: () => p.toCanvas() } as PropArt;
});

// (2–3,4) the low round table (ちゃぶ台): a pile of green beans, the
// stringed ones in a colander, the strings on a sheet of newspaper
registerProp('in_cz_table', () => {
  const frames = mkFrames(3, 34, 18, (p, k) => {
    p.ellipse(17, 7, 15.5, 6, P.woodDark);
    p.ellipse(17, 6.5, 15, 5.5, P.wood);
    p.ellipse(15, 5, 12, 3.5, P.woodLt);
    p.ellipse(17, 6.5, 13, 4.5, P.wood);
    p.hline(6, 28, 12, P.woodDark);
    // legs
    p.rect(6, 12, 2, 5, P.woodDark);
    p.rect(26, 12, 2, 5, P.woodDark);
    p.rect(16, 12, 2, 4, P.ink);
    // newspaper
    p.rect(19, 3, 9, 6, P.paper);
    printLines(p, 20, 4, 7, 2, P.steel, 53);
    // the pile of beans (k: stage 0 / 1 / 2 — in 2 the beans lie in a row pointing north-east)
    if (k < 2) {
      for (let i = 0; i < 9; i++) {
        const bx = 6 + (ihash(i, 0, 55) % 9);
        const by = 3 + (ihash(i, 1, 55) % 4);
        p.line(bx, by, bx + 3, by + ((i & 1) ? -1 : 1), i % 3 ? P.leafDeep : P.leaf);
      }
    } else for (let i = 0; i < 6; i++) p.line(6 + i * 2, 8 - Math.floor(i / 2), 8 + i * 2, 6 - Math.floor(i / 2), i % 2 ? P.leafDeep : P.leaf);
    // colander with the stringed ones
    p.ellipse(23, 12, 4, 2, P.concreteLt);
    p.hline(20, 26, 12, P.leafYoung);
    p.set(21, 11, P.leaf);
    // one bean half-stringed (stage 1: stuck half-way)
    p.line(12, 9, 16, 9, P.leaf);
    p.line(16, 9, 17, k === 1 ? 7 : 10, P.leafLt);
  }, (p) => finish(p, { soft: true }));
  const a = stand(frames[0], { cx: 16, base: 15, contact: 0, shadow: 0 });
  a.img = (env: PropEnv) => frames[env.stage === 1 ? 1 : env.stage === 2 ? 2 : 0];
  return a;
});

// (7,4) ピンクの 長靴が 3足、じょうろ 大・中・小
registerProp('in_cz_boots', () =>
  prop(18, 22, (p) => {
    // watering cans, big to small, all pink
    for (const [x, y, s] of [[1, 8, 6], [7, 11, 5], [12, 13, 4]] as [number, number, number][]) {
      box(p, x, y, s, s + 2, P.peach);
      p.line(x + s, y + 2, x + s + 2, y - 1, P.crimson);
      p.set(x + s + 2, y - 2, P.sunShade);
      p.hline(x + 1, x + s - 2, y - 1, P.crimson);
    }
    // three pairs of pink rubber boots, toes worn pale
    for (let i = 0; i < 3; i++) {
      const bx = 1 + i * 6;
      p.rect(bx, 16, 2, 5, P.peach);
      p.rect(bx + 2, 16, 2, 5, P.crimson);
      p.hline(bx, bx + 4, 20, P.sunShade);
      p.set(bx + 4, 20, P.skin1);
    }
  }, noFoot),
);

// (8,4) the shoe cabinet and ちず's candy basket 『ご近所の 子へ どうぞ』
registerProp('in_cz_shoebox', () => {
  const frames = mkFrames(2, 16, 28, (p, k) => {
    box(p, 1, 8, 14, 20, P.woodLt);
    p.vline(8, 9, 26, P.wood);
    p.set(6, 16, P.woodDark);
    p.set(10, 16, P.woodDark);
    p.hline(2, 13, 27, P.woodDark);
    // the basket and its card
    p.rect(3, 4, 10, 4, P.brass);
    p.hline(3, 12, 4, P.goldPale);
    for (let i = 4; i < 12; i += 2) p.set(i, 6, P.brassOld);
    p.line(3, 4, 8, 0, P.brassOld);
    p.line(8, 0, 12, 4, P.brassOld);
    if (!k) {
      p.ellipse(6, 3, 1.5, 1.2, P.white);
      p.set(8, 3, P.aqua);
      p.ellipse(10, 3, 1.5, 1.2, P.white);
    }
    p.rect(9, 9, 5, 4, P.white);
    p.set(10, 10, P.verm);
    p.hline(10, 12, 11, P.steel);
  }, (p) => finish(p, { soft: true }));
  const a = stand(frames[0], { cx: 8, base: 16, contact: 0, shadow: 0 });
  a.img = (env: PropEnv) => frames[env.flag('flag_hidden_chizu') ? 1 : 0];
  return a;
});

// =====================================================================================
// なんばるわんの家（map_madam, 9×7）: 白い漆喰に薄紫の小花の壁紙。1位のトロフィー、
// ルームランナー、テレビ、ひじかけいす、コタロウのベッド、レースの日傘。
// =====================================================================================

southShell({
  id: 'in_md_shell',
  map: 'map_madam',
  wall: (x, y, fh) => {
    // wallpaper with tiny lilac flowers above a white wainscot with a chair rail
    if (y >= fh - 13) {
      if (y === fh - 13) return P.woodLt;
      return x % 12 === 0 ? P.concrete : P.white;
    }
    if ((x + (Math.floor(y / 6) % 2) * 4) % 8 === 0 && y % 6 === 2) return P.lilac;
    if ((x + (Math.floor(y / 6) % 2) * 4) % 8 === 1 && y % 6 === 2) return P.peach;
    return valueNoise(x / 6, y / 6, 5201) > 0.8 ? P.white : P.concreteLt;
  },
  trim: P.white,
  base: P.woodDark,
  baseH: 3,
  decor: (p, glass) => {
    // (3,1) the old photo: the relay race, she wins, he falls
    frameOn(p, 50, 9, 12, 12, P.brass, (q, ix, iy, iw, ih) => {
      q.rect(ix, iy, iw, ih, P.concrete);
      q.hline(ix, ix + iw - 1, iy + 5, P.white);
      q.rect(ix + 5, iy + 1, 2, 4, P.steel);
      q.set(ix + 6, iy, P.charcoal);
      q.rect(ix + 1, iy + 5, 3, 2, P.asphalt);
    });
    // (4–5,0–1) the window over the TV: lace curtains drawn to the sides
    const wx = 67;
    const wy = 7;
    p.rect(wx - 2, wy - 2, 30, 20, P.white);
    p.rect(wx, wy, 26, 16, P.shadeDeep);
    glass.rect(wx, wy, 26, 16, '#ffffff');
    p.vline(wx + 13, wy, wy + 15, P.white);
    for (let j = wy - 1; j < wy + 17; j++) {
      for (let i = 0; i < 6; i++) {
        const lace = (i + j) % 3 === 0 ? P.concreteLt : P.white;
        p.set(wx - 1 + i, j, lace);
        p.set(wx + 26 - i, j, lace);
      }
    }
    p.hline(wx - 3, wx + 28, wy - 3, P.brass);
    castRight(p, wx - 2, wy - 2, 30, 20, 2);
    // a round rug under the tea table (2–3,4)
    for (let y = 60; y < 80; y++)
      for (let x = 22; x < 74; x++) {
        const d = Math.hypot((x - 48) / 26, (y - 70) / 10);
        if (d > 1) continue;
        const c = d > 0.86 ? P.sunShade : d > 0.76 ? P.peach : (x + y) % 5 === 0 ? P.peach : P.skin2;
        p.set(x, y, c);
      }
    // Kotaro's water bowl by his bed
    p.ellipse(100, 92, 3.5, 2, P.red);
    p.ellipse(100, 91.5, 2.5, 1.2, P.aqua);
  },
  town: [22, 30],
  bld: [19, 23, 26],
  skin: [P.white, P.concreteLt, P.concrete],
  roof: 'slab',
  seed: 5501,
  lamps: [{ x: 64, y: 62, rx: 40, ry: 20, col: P.goldPale, a: 0.12 }],
  spill: P.sky,
});

// (1–2,2) the glass trophy cabinet: all 1st places, one 2nd turned to the wall, the ramune 参加賞
registerProp('in_md_trophy', () => {
  const frames = mkFrames(2, 32, 44, (p, k) => {
    box(p, 1, 4, 30, 40, P.woodDark);
    p.rect(3, 6, 26, 35, P.shadeDeep);
    for (const y of [16, 27, 38]) p.hline(3, 28, y, P.woodLt);
    const cups: [number, number, number][] = [[5, 15, 0], [11, 15, 1], [17, 15, 0], [23, 15, 0], [7, 26, 1], [14, 26, 0], [21, 26, 2]];
    for (const [cx, by, kind] of cups) {
      const col = kind === 2 ? P.steel : P.gold;
      const sh = kind === 2 ? P.asphalt : P.brassOld;
      p.rect(cx, by - 1, 4, 1, P.woodDark);
      p.vline(cx + 1, by - 4, by - 2, sh);
      p.rect(cx, by - 8, 4, 4, col);
      p.set(cx, by - 8, P.goldPale);
      p.set(cx - 1, by - 7, sh);
      p.set(cx + 4, by - 7, sh);
      if (kind === 1) p.set(cx + 1, by - 10, col);
    }
    // the bottom shelf: ribbons, a medal, and (until taken) the ramune with its paper
    p.rect(5, 32, 5, 5, P.navy);
    p.set(7, 37, P.gold);
    p.rect(12, 34, 6, 3, P.crimson);
    if (!k) {
      p.rect(22, 30, 3, 7, P.aqua);
      p.vline(22, 30, 36, P.glint);
      p.rect(22, 29, 3, 1, P.blue);
      p.rect(21, 33, 5, 2, P.white);
    }
    // the glass: two glints
    p.line(5, 8, 8, 5 + 3, P.glint);
    p.line(18, 7, 20, 9, P.glint);
    p.vline(16, 6, 40, P.woodDark);
  }, (p) => finish(p, { soft: true }));
  const a = stand(frames[0], { cx: 16, base: 16, contact: 0, shadow: 0 });
  a.img = (env: PropEnv) => frames[env.flag('flag_hidden_madam') ? 1 : 0];
  return a;
});

// (4–5,2) the TV on its stand: a period drama (stage 0), the same pose over
// and over (stage 1: two frames), colour bars (stage 2)
registerProp('in_md_tv', () => {
  const body = pcv(32, 30);
  box(body, 1, 20, 30, 10, P.woodDark);
  body.hline(2, 29, 21, P.wood);
  body.rect(8, 23, 16, 5, P.shadeDeep);
  body.rect(9, 24, 5, 3, P.navy);
  body.rect(17, 24, 5, 3, P.ink);
  box(body, 4, 1, 24, 18, P.charcoal);
  body.rect(6, 3, 20, 13, P.ink);
  body.hline(4, 27, 18, P.asphalt);
  body.set(26, 17, P.leafYoung);
  finish(body, { soft: true });
  const screens: HTMLCanvasElement[] = [];
  // 0,1: the drama (two shots), 2,3: the frozen pose (kiri-mie), 4: colour bars
  for (let k = 0; k < 5; k++) {
    const s = pcv(20, 13);
    if (k === 4) {
      const bars = [P.white, P.gold, P.aqua, P.leafYoung, P.peach, P.red, P.blue];
      for (let i = 0; i < 20; i++) s.vline(i, 0, 9, bars[Math.floor(i / 3) % bars.length]);
      s.rect(0, 10, 20, 3, P.navy);
    } else {
      s.rect(0, 0, 20, 13, k < 2 ? P.woodDark : P.wood);
      s.rect(0, 9, 20, 4, P.woodLt);
      const x0 = k === 0 ? 5 : k === 1 ? 11 : 8;
      s.rect(x0, 3, 3, 6, P.navy);
      s.rect(x0, 1, 3, 2, P.skin2);
      s.set(x0 + 1, 0, P.ink);
      if (k >= 2) s.line(x0 + 3, 4, x0 + 7, 1 + (k - 2), P.white);
      s.rect(14 - x0 + 3, 4, 3, 5, P.maroon);
    }
    screens.push(s.toCanvas());
  }
  return {
    ox: 0,
    oy: -14,
    w: 32,
    h: 30,
    foot: 15,
    img: () => body.toCanvas(),
    over(g: Gfx, x: number, y: number, env: PropEnv) {
      const k = env.stage === 2 ? 4 : env.stage === 1 ? 2 + (Math.floor(env.t / 700) % 2) : Math.floor(env.t / 2300) % 2;
      g.img(screens[k], x + 6, y - 14 + 3);
    },
    glow(g: Gfx, x: number, y: number, env: PropEnv) {
      screenPool(g, x + 16, y - 2, 12, 8, P.aqua, 0.1 + env.grade.night * 0.2);
    },
  } as PropArt;
});

// (7,2) the treadmill (side view), the speed at the top, 『コタロウには 負けない！』 on the rail
registerProp('in_md_runner', () =>
  prop(18, 32, (p) => {
    // belt deck
    p.rect(1, 24, 16, 5, P.charcoal);
    p.hline(1, 16, 24, P.asphalt);
    p.hline(2, 15, 28, P.ink);
    p.ellipse(2, 26.5, 2, 2, P.steel);
    p.ellipse(15, 26.5, 2, 2, P.steel);
    // the upright and the console
    p.line(13, 24, 11, 6, P.steel);
    p.line(14, 24, 12, 6, P.asphalt);
    box(p, 6, 2, 10, 6, P.concreteLt);
    p.rect(7, 3, 6, 3, P.ink);
    p.hline(8, 12, 4, P.red);
    p.set(12, 3, P.red);
    // hand rails and the note
    p.hline(3, 12, 11, P.steel);
    p.rect(3, 12, 6, 4, P.white);
    p.hline(4, 7, 13, P.verm);
    p.hline(4, 6, 14, P.verm);
  }, noFoot),
);

// (6,3) the armchair (ピー・コック sits in it, drawn over)
registerProp('in_md_chair', () =>
  prop(20, 24, (p) => {
    // back rest, arms, seat: lilac velvet with buttons
    box(p, 3, 1, 14, 13, P.lilac);
    for (const [bx, by] of [[6, 5], [10, 5], [13, 5], [8, 9], [12, 9]]) p.set(bx, by, P.shadeDeep);
    box(p, 0, 9, 4, 11, P.lilac);
    box(p, 16, 9, 4, 11, P.lilac);
    p.hline(0, 3, 9, P.peach);
    p.hline(16, 19, 9, P.shade);
    box(p, 3, 14, 14, 6, P.shade);
    p.rect(1, 20, 2, 3, P.woodDark);
    p.rect(17, 20, 2, 3, P.woodDark);
  }, { base: 15, contact: 0, shadow: 0, foot: 13 }),
);

// (2–3,4) the round tea table: the blue cookie tin (a sewing box), two cups
registerProp('in_md_table', () =>
  prop(30, 16, (p) => {
    p.ellipse(15, 5, 13.5, 4.5, P.white);
    p.ellipse(15, 4.5, 12, 3.5, P.concreteLt);
    p.hline(4, 26, 8, P.concrete);
    p.vline(15, 9, 14, P.woodDark);
    p.hline(11, 19, 15, P.woodDark);
    p.ellipse(10, 3, 4, 2.2, P.navy);
    p.ellipse(10, 2.5, 3.2, 1.4, P.blue);
    p.set(9, 2, P.gold);
    p.set(11, 2, P.white);
    for (const cx of [18, 23]) {
      p.rect(cx, 2, 3, 2, P.white);
      p.set(cx + 3, 2, P.concrete);
      p.set(cx + 1, 2, P.woodLt);
    }
  }, { cx: 16, base: 12, contact: 0, shadow: 0 }),
);

// (1,5) the parasol stand: three white lace parasols (they lean north-east in stage 2)
registerProp('in_md_parasol', () => {
  const frames = mkFrames(2, 16, 30, (p, k) => {
    const lean = k ? 2 : 0;
    for (const [x, c] of [[4, P.white], [8, P.concreteLt], [11, P.white]] as [number, string][]) {
      p.line(x + lean, 2, x, 18, P.brass);
      p.poly([[x - 2 + lean, 4], [x + 2 + lean, 4], [x + 1, 17], [x - 1, 17]], c);
      p.set(x - 1 + lean, 6, P.concrete);
      p.set(x + lean, 9, P.concrete);
      p.set(x + lean, 1, P.woodDark);
    }
    p.rect(2, 16, 12, 13, P.woodLt);
    p.vline(2, 16, 28, P.goldPale);
    p.vline(13, 16, 28, P.wood);
    p.hline(2, 13, 16, P.wood);
    p.hline(2, 13, 28, P.woodDark);
    p.hline(3, 12, 22, P.brass);
  }, (p) => finish(p, { soft: true }));
  const a = stand(frames[0], { cx: 8, base: 16, contact: 0, shadow: 0 });
  a.img = (env: PropEnv) => frames[env.stage === 2 ? 1 : 0];
  return a;
});

// (7,5) Kotaro's bed: a red oval cushion, the chewed tennis ball (it rolls to the north-east edge in stage 2)
registerProp('in_md_dogbed', () => {
  const frames = mkFrames(2, 20, 12, (p, k) => {
    p.ellipse(10, 6, 9.5, 5.5, P.vermShade);
    p.ellipse(10, 5.5, 8.5, 4.5, P.red);
    p.ellipse(10, 6.5, 6, 3, P.skin1);
    p.ellipse(9, 6, 5, 2.2, P.paper);
    const [bx, by] = k ? [15, 3] : [9, 6];
    p.ellipse(bx, by, 1.8, 1.6, P.leafLt);
    p.set(bx - 1, by - 1, P.glint);
    p.set(bx + 1, by, P.leafYoung);
  }, (p) => finish(p, { soft: true }));
  const a = stand(frames[0], { cx: 8, base: 14, contact: 0, shadow: 0 });
  a.img = (env: PropEnv) => frames[env.stage === 2 ? 1 : 0];
  return a;
});

// =====================================================================================
// 夕鳴写真館（map_photo, 10×7）: 生成りの壁と、額の写真。撮影の青い布、赤いいす、
// 三脚の大きなカメラ、傘のライト、暗室の戸と赤いランプ、ウィンドウの裏、七五三の着物。
// =====================================================================================

/** The darkroom's red lamp: lit (stage 0), stuck half-lit (stage 1), out (stage 2). */
function darkroomLamp(env: PropEnv): number {
  if (env.stage === 1) return 0.45;
  if (env.stage >= 2) return 0;
  return 0.75 + 0.25 * Math.sin(env.t / 900);
}

southShell({
  id: 'in_ph_shell',
  map: 'map_photo',
  wall: (x, y, fh) => {
    // cream plaster with a dark picture rail
    if (y === 6) return P.woodDark;
    if (y === 7) return P.wood;
    if (y >= fh - 10) return x % 16 === 15 ? P.woodDark : y === fh - 10 ? P.woodLt : P.wood;
    return valueNoise(x / 5, y / 5, 5301) > 0.8 ? P.paper : P.goldPale;
  },
  trim: P.woodDark,
  base: P.woodDark,
  baseH: 2,
  decor: (p) => {
    // (1–3,0–1) the backdrop's roller bar across the top of the wall
    p.rect(17, 3, 46, 3, P.charcoal);
    p.hline(17, 62, 3, P.steel);
    p.ellipse(17, 4.5, 2, 2, P.asphalt);
    p.ellipse(62, 4.5, 2, 2, P.asphalt);
    // (5,0–1) the darkroom door and its lamp box 『暗室』
    const dx = 82;
    box(p, dx, 9, 12, 23, P.charcoal);
    p.rect(dx + 2, 11, 8, 18, P.asphalt);
    p.set(dx + 9, 21, P.brass);
    p.rect(dx + 2, 3, 8, 5, P.ink);
    p.rect(dx + 3, 4, 6, 3, P.vermShade);
    // the 『暗室』 plate on the door
    p.rect(dx + 3, 13, 6, 4, P.white);
    p.hline(dx + 4, dx + 7, 14, P.ink);
    p.hline(dx + 4, dx + 6, 15, P.ink);
    // (6,0–1) a cluster of framed photos: school entrance, a wedding, the town's old festival
    const fr: [number, number, number, number, string][] = [[99, 9, 9, 7, P.woodDark], [109, 8, 7, 9, P.brass], [100, 18, 7, 8, P.brass], [108, 19, 9, 6, P.woodDark]];
    fr.forEach(([x, y, w, h, c], i) =>
      frameOn(p, x, y, w, h, c, (q, ix, iy, iw, ih) => {
        q.rect(ix, iy, iw, ih, i % 2 ? P.concrete : P.skin2);
        q.set(ix + 1, iy + 1, P.navy);
        q.set(ix + iw - 2, iy + ih - 2, P.steel);
      }),
    );
    // (8,0–1) a price card 『七五三・入学・ご家族の 記念に』
    p.rect(130, 8, 12, 14, P.white);
    p.rect(130, 8, 12, 3, P.leafShade);
    printLines(p, 131, 12, 10, 4, P.steel, 57);
    castRight(p, 130, 8, 12, 14, 2);
    // the tape cross where the subject stands, in front of the backdrop
    p.line(36, 58, 40, 62, P.gold);
    p.line(40, 58, 36, 62, P.gold);
  },
  town: [33, 31],
  bld: [30, 35, 26],
  skin: [P.concreteLt, P.concrete, P.steel],
  roof: 'kawara',
  seed: 5601,
  lamps: [{ x: 40, y: 58, rx: 34, ry: 18, col: P.white, a: 0.1 }],
  spill: P.sky,
  glow(g, x, y, env) {
    const k = darkroomLamp(env);
    if (k <= 0) return;
    g.rect(x + 85, y + 4, 6, 3, P.red, 0.4 + k * 0.5);
    screenPool(g, x + 88, y + 6, 8, 5, P.red, 0.2 * k);
  },
  over(g, x, y, env) {
    // the umbrella light washes the backdrop
    screenPool(g, x + 40, y + 40, 26, 14, P.white, 0.12);
    const k = darkroomLamp(env);
    if (k > 0) warmPool(g, x + 88, y + 34, 10, 4, P.red, 0.12 * k);
  },
});

// (4,1) the round wall clock (ticking in stage 0)
wallClock('in_ph_clock', { r: 5, rim: P.woodDark, face: P.white, ox: 2, oy: -2 });

// (1–3,2) the backdrop: a mottled blue cloth from the roller down the wall and onto the floor
registerProp('in_ph_backdrop', () =>
  prop(48, 44, (p) => {
    for (let y = 0; y < 44; y++)
      for (let x = 1; x < 47; x++) {
        const d = valueNoise(x / 5, y / 6, 5303);
        let c = d > 0.62 ? P.aqua : d > 0.35 ? P.blue : P.navy;
        if (y > 30) c = d > 0.55 ? P.blue : P.navy;
        if (((x * 3 + y * 5) % 11 === 0) && d > 0.4 && d < 0.6) c = P.aqua;
        p.set(x, y, c);
      }
    // the sweep onto the floor: a soft fold line, a lit edge at the top
    p.hline(1, 46, 30, P.aqua);
    for (let x = 1; x < 47; x += 7) p.vline(x, 2, 29, P.navy);
    p.hline(1, 46, 43, P.nightShade);
    p.set(0, 43, P.nightShade);
  }, { cx: 24, base: 16, contact: 0, shadow: 0, foot: 4 }),
);

// (2,3) the red velvet posing chair and a little step for small children
registerProp('in_ph_chair', () =>
  prop(18, 24, (p) => {
    box(p, 4, 1, 10, 11, P.crimson);
    p.rect(5, 2, 8, 8, P.sunShade);
    p.hline(5, 12, 2, P.peach);
    box(p, 3, 12, 12, 4, P.crimson);
    p.hline(3, 14, 12, P.peach);
    p.vline(4, 16, 22, P.woodDark);
    p.vline(13, 16, 22, P.woodDark);
    p.set(4, 1, P.gold);
    p.set(13, 1, P.gold);
    // the step for small children, beside it
    box(p, 14, 18, 4, 5, P.woodLt);
  }, { base: 15, contact: 0, shadow: 0 }),
);

// (5,3) the large-format camera on its tripod, the dark cloth over the back
registerProp('in_ph_camera', () =>
  prop(18, 32, (p) => {
    // tripod legs
    p.line(9, 14, 3, 31, P.woodDark);
    p.line(9, 14, 15, 31, P.woodDark);
    p.line(9, 14, 9, 31, P.wood);
    p.hline(6, 12, 22, P.brassOld);
    // the camera: wooden body, the brass lens (facing the backdrop, north), bellows
    box(p, 4, 4, 11, 9, P.wood);
    p.rect(6, 1, 7, 3, P.woodDark);
    for (let i = 5; i < 14; i += 2) p.vline(i, 6, 11, P.woodDark);
    p.ellipse(9.5, 2, 2, 1.5, P.brass);
    p.set(9, 1, P.glint);
    // the focusing cloth hanging down the back
    p.rect(3, 9, 13, 7, P.ink);
    p.hline(3, 15, 9, P.charcoal);
    p.set(5, 15, P.charcoal);
    p.set(12, 15, P.charcoal);
  }, { base: 15, contact: 0, shadow: 0 }),
);

// (7,2) the umbrella light: a white umbrella on a stand (the glint seen through the shutter outside)
registerProp('in_ph_umbrella', () =>
  prop(20, 44, (p) => {
    p.vline(10, 18, 42, P.steel);
    p.line(10, 38, 5, 43, P.asphalt);
    p.line(10, 38, 15, 43, P.asphalt);
    p.line(10, 38, 10, 43, P.steel);
    for (let y = 0; y < 16; y++)
      for (let x = 0; x < 20; x++) {
        const d = Math.hypot((x - 9.5) / 9.5, (y - 12) / 11);
        if (d > 1 || y > 12) continue;
        p.set(x, y, d > 0.9 ? P.concrete : (x + y) % 5 === 0 ? P.concreteLt : P.white);
      }
    for (const x of [3, 9, 15]) p.line(x, 11, 10, 15, P.steel);
    p.rect(8, 14, 5, 4, P.charcoal);
    p.set(9, 17, P.gold);
  }, noFoot),
);

// (8,2) the cabinet of frames and albums (every child of the town)
registerProp('in_ph_frames', () =>
  prop(16, 36, (p) => {
    box(p, 1, 4, 14, 32, P.woodDark);
    p.rect(2, 6, 12, 28, P.nightShade);
    for (const y of [14, 23]) p.hline(2, 13, y, P.woodLt);
    // albums (spines), frames stacked, a roll of film
    const cols = [P.maroon, P.navy, P.leafShade, P.brassOld, P.crimson];
    for (let i = 0; i < 6; i++) p.rect(3 + i * 2, 7, 2, 7, cols[i % cols.length]);
    for (let i = 0; i < 3; i++) box(p, 3 + i, 16 + i * 2, 9, 2, i % 2 ? P.brass : P.wood);
    p.rect(4, 26, 8, 7, P.paper);
    p.rect(5, 27, 6, 5, P.concrete);
    p.rect(10, 1, 3, 3, P.charcoal);
    p.set(11, 1, P.gold);
  }, noFoot),
);

// (1–2,5) the back of the show window: a low platform, the family photo's
// easel seen from behind (the photo faces the street), the spot light
registerProp('in_ph_window', () =>
  prop(32, 22, (p) => {
    box(p, 0, 12, 32, 10, P.woodDark);
    p.hline(1, 30, 13, P.wood);
    // the frame's back board on its easel
    box(p, 8, 1, 16, 12, P.wood);
    p.rect(10, 3, 12, 8, P.woodLt);
    p.line(16, 11, 12, 16, P.woodDark);
    p.line(16, 11, 20, 16, P.woodDark);
    // the pencil note on the back (its last line goes in stage 2 — the text says so)
    printLines(p, 11, 4, 10, 3, P.wood, 59);
    // a small spot on a clamp
    p.rect(26, 4, 4, 3, P.charcoal);
    p.line(27, 7, 29, 12, P.steel);
    p.set(26, 6, P.gold);
    // the price card leaning on the platform
    p.rect(2, 9, 5, 4, P.white);
    p.set(3, 10, P.verm);
  }, { cx: 16, base: 16, contact: 0, shadow: 0 }),
);

// (7,5) 七五三: a little red kimono on a stand, the bag of 千歳あめ (empty once taken)
registerProp('in_ph_753', () => {
  const frames = mkFrames(2, 18, 30, (p, k) => {
    // the kimono on a T stand
    p.hline(2, 13, 3, P.woodDark);
    p.vline(8, 3, 27, P.woodDark);
    p.poly([[3, 4], [13, 4], [11, 20], [5, 20]], P.red);
    p.poly([[3, 4], [6, 4], [5, 20], [4, 20]], P.vermLt);
    p.rect(5, 11, 7, 2, P.gold);
    p.set(6, 7, P.white);
    p.set(10, 15, P.white);
    p.set(7, 17, P.goldPale);
    p.hline(5, 11, 27, P.woodDark);
    // the bag of 千歳あめ and the sticks
    box(p, 11, 18, 6, 10, P.paper);
    p.set(13, 22, P.gold);
    p.set(14, 23, P.verm);
    if (!k) {
      p.line(13, 18, 14, 10, P.red);
      p.line(15, 18, 16, 11, P.white);
      p.set(14, 10, P.white);
    }
  }, (p) => finish(p, { soft: true }));
  const a = stand(frames[0], { cx: 8, base: 16, contact: 0, shadow: 0 });
  a.img = (env: PropEnv) => frames[env.flag('flag_hidden_photo') ? 1 : 0];
  return a;
});

void tiny;
void boardsV;
void lt;
