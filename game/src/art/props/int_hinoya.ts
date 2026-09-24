// 駄菓子 ひのや interior (30_level_art 4.4, 10×8). An old wooden dagashi
// shop: dark plank walls, おばあ on a raised tatami behind a low glass-front
// counter (abacus, coin tray, 当てくじ), a pendulum pillar clock (stops tilted
// in stage 1), the class photo, kids' drawings with red hanamaru, a stepped
// display of snacks in four bag colours, a stationery shelf seen from the
// side, glass candy jars, a pig mosquito-coil holder and a glowing ramune case.

import type { Gfx } from '../../engine/gfx';
import { PixelCanvas } from '../../engine/pixel';
import { getMapDef } from '../../world/maps';
import { boards } from '../tiles/ifloor';
import { ihash, valueNoise } from '../tiles/noise';
import { P } from '../tiles/palette';
import { clockFace, framed, goodsRow, kidDrawing, notice, pc, prop } from './ifurn';
import { blend, depthShade, dust, lightPool, paintShell, screenPool, screenSpill, shellProp, tube } from './ishell';
import { castRight, dk, finish, lt, outline } from './kit';
import { mkFrames, stand } from './pkit';
import { registerProp } from './registry';
import { fontTextSmall, printLines, tiny } from './text';
import type { PropArt, PropEnv } from './types';

const BAGS = [P.red, P.gold, P.aqua, P.leaf];

function rgbHex(c: [number, number, number]): string {
  const h = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${h(c[0])}${h(c[1])}${h(c[2])}`;
}

// ---------------------------------------------------------------- shell

registerProp('in_hi_shell', () => {
  const rows = getMapDef('map_hinoya')?.rows ?? [];
  // worn dark boards, a paler path from the door to the counter
  const wear = (x: number, y: number) => {
    const dx = Math.abs(x - 72) / 30;
    const dy = y < 64 ? 1 : 0;
    return Math.max(0, 1 - dx - dy) * 0.9;
  };
  const wood = boards({ bh: 4, lit: P.wood, base: P.woodDark, shade: P.ink, gap: P.ink, nail: P.brassOld, seed: 81, wear });
  const sh = paintShell({
    rows,
    floor: (x, y) => wood(x, y),
    wall: (x, y) => {
      // plaster band on top, vertical dark planks below, a post every 48px
      if (x % 48 < 2) return x % 48 === 0 ? P.wood : P.woodDark;
      if (y <= 9) return valueNoise(x / 5, y / 3, 83) > 0.8 ? P.paper : P.paperGrid;
      if (y === 10) return P.woodDark;
      const plank = Math.floor(x / 6);
      if (x % 6 === 5) return P.ink;
      const g = valueNoise(plank * 3.1, y / 7, 84);
      return g > 0.72 ? P.wood : ihash(plank, 0, 85) % 3 === 0 ? P.wood : P.woodDark;
    },
    trim: P.woodDark,
    base: P.ink,
    baseH: 2,
  });
  const p = sh.p;
  // ---- north wall
  // (2) hanging snack strips (drawn in over(): they sway in the fan's
  // breeze) and a bunch of paper balloons on a nail
  p.set(34, 3, P.steel);
  p.hline(33, 43, 4, P.charcoal);
  for (const [bx, by, c] of [[44, 6, P.crimson], [44, 11, P.gold], [46, 9, P.aqua]] as const) {
    p.ellipse(bx + 0.5, by + 0.5, 1.8, 1.8, c);
    p.set(bx, by, lt(c));
  }
  // (3) the old class photo above the register: a sepia print with a white
  // border, two rows of kids and the young teacher standing in the middle
  {
    const [ix, iy, iw, ih] = framed(p, 49, 3, 16, 12, P.woodDark);
    p.rect(ix, iy, iw, ih, P.paper);
    p.rect(ix + 1, iy + 1, iw - 2, 5, P.paperGrid);
    p.rect(ix + 1, iy + 6, iw - 2, ih - 8, P.woodLt);
    // the school wall behind: a darker band, a window
    p.hline(ix + 1, ix + iw - 2, iy + 5, P.skin3);
    p.rect(ix + 10, iy + 1, 3, 2, P.goldPale);
    // back row (standing): six kids and the teacher, taller, in the middle
    for (let c = 0; c < 6; c++) {
      const kx = ix + 1 + c * 2 + (c >= 3 ? 1 : 0);
      p.set(kx, iy + 3, P.woodDark);
      p.set(kx, iy + 4, P.skin3);
      p.set(kx, iy + 5, c % 2 ? P.white : P.brassOld);
    }
    p.set(ix + 7, iy + 1, P.woodDark);
    p.set(ix + 7, iy + 2, P.skin3);
    p.rect(ix + 7, iy + 3, 1, 3, P.wood);
    // front row (sitting): five kids in white gym shirts
    for (let c = 0; c < 5; c++) {
      const kx = ix + 2 + c * 2 + (c >= 3 ? 1 : 0);
      p.set(kx, iy + 6, P.woodDark);
      p.set(kx, iy + 7, P.skin3);
      p.set(kx, iy + 8, P.white);
    }
    // the caption strip, handwritten
    p.hline(ix + 2, ix + 5, iy + ih - 1, P.woodLt);
    p.hline(ix + 7, ix + 11, iy + ih - 1, P.woodLt);
  }
  // (4–5) shelves behind おばあ: jars, a red daruma, the radio, a pencil cup, the ledger box
  for (const sy of [11, 21]) {
    p.rect(66, sy, 30, 2, P.woodLt);
    p.hline(66, 95, sy, P.goldPale);
    p.hline(66, 95, sy + 2, P.ink);
  }
  // upper shelf
  for (const [jx, c] of [[67, P.red], [72, P.gold], [77, P.leafYoung]] as const) {
    p.rect(jx, 5, 4, 6, P.aqua);
    p.rect(jx, 4, 4, 1, P.verm);
    p.rect(jx + 1, 7, 2, 3, c);
    p.set(jx, 6, P.white);
  }
  // daruma
  p.ellipse(86, 7.5, 3.5, 3.5, P.verm);
  p.rect(84, 6, 4, 3, P.white);
  p.set(85, 7, P.ink);
  p.set(87, 7, P.ink);
  p.set(83, 6, P.vermLt);
  p.hline(84, 88, 10, P.vermShade);
  // tiny wall calendar from the credit union (right end)
  p.rect(90, 3, 5, 8, P.white);
  p.rect(90, 3, 5, 2, P.navy);
  for (let d = 0; d < 6; d++) p.set(90 + (d % 3) * 2, 6 + Math.floor(d / 3) * 2, d === 5 ? P.verm : P.steel);
  // lower shelf: the transistor radio, pencil cup, a stack of 帳面
  p.rect(67, 15, 9, 6, P.maroon);
  p.rect(68, 16, 4, 4, P.steel);
  for (let j = 16; j < 20; j += 2) p.hline(68, 71, j, P.asphalt);
  p.set(74, 17, P.gold);
  p.vline(75, 12, 15, P.steel);
  p.rect(79, 16, 3, 5, P.navy);
  p.set(79, 15, P.red);
  p.set(81, 14, P.gold);
  p.set(80, 15, P.leaf);
  p.rect(84, 17, 10, 4, P.paper);
  p.rect(84, 16, 10, 1, P.white);
  p.hline(84, 93, 18, P.paperGrid);
  p.hline(85, 92, 20, P.brassOld);
  castRight(p, 66, 11, 30, 3, 2);
  castRight(p, 66, 21, 30, 3, 2);
  // (6–7) the kids' drawings: five sheets, each with a red hanamaru
  kidDrawing(p, 98, 4, 11, 9, 0);
  kidDrawing(p, 111, 3, 12, 10, 1);
  kidDrawing(p, 124, 5, 11, 9, 2);
  kidDrawing(p, 100, 16, 12, 9, 3);
  kidDrawing(p, 115, 16, 11, 9, 5);
  for (const [x, y, w, h] of [[98, 4, 11, 9], [111, 3, 12, 10], [124, 5, 11, 9], [100, 16, 12, 9], [115, 16, 11, 9]] as const) castRight(p, x, y, w, h, 1);
  // ---- floor: a door mat, a dropped wrapper, a 10-yen coin under the jars' stand
  p.rect(134, 90, 3, 2, P.gold);
  p.set(134, 90, P.goldPale);
  p.set(98, 93, P.red);
  p.set(99, 93, P.gold);
  // ---- the entrance (4,7): old sliding glass door (格子戸) with the bags hanging outside
  const dx = 64;
  const dy = 112;
  p.rect(dx - 3, dy, 22, 2, P.wood);
  p.hline(dx - 3, dx + 18, dy, P.woodLt);
  p.rect(dx, dy + 2, 16, 9, P.shadeDeep);
  sh.glass.rect(dx + 1, dy + 3, 14, 7, '#ffffff');
  for (let i = dx; i <= dx + 16; i += 4) p.vline(i, dy + 2, dy + 10, P.woodDark);
  p.hline(dx, dx + 16, dy + 6, P.woodDark);
  for (let k = 0; k < 4; k++) p.rect(dx + 1 + k * 4, dy + 3, 2, 3, BAGS[k]);
  p.hline(dx - 1, dx + 17, dy + 11, P.ink);
  const img = p.toCanvas();
  const W = img.width;
  return shellProp({
    img,
    glass: sh.glass.toCanvas(),
    over(g: Gfx, x: number, y: number, env: PropEnv) {
      // the snack strips: each packet swings a little further than the one above
      for (let k = 0; k < 3; k++) {
        const sx = x + 33 + k * 4;
        const ph = env.mt / 520 + k * 1.9;
        for (let j = 0; j < 4; j++) {
          const c = BAGS[k];
          const d = Math.round(Math.sin(ph) * j * 0.45);
          const py = y + 5 + j * 5;
          g.rect(sx + 1 + Math.round(Math.sin(ph) * Math.max(0, j - 0.5) * 0.45), py - 1, 1, 1, P.charcoal);
          g.rect(sx + d, py, 3, 4, c);
          g.rect(sx + d, py, 3, 1, lt(c));
          g.rect(sx + d + 2, py + 1, 1, 3, dk(c));
          g.rect(sx + d + 1, py + 2, 1, 1, P.white);
        }
      }
      depthShade(g, x + 16, y + 32, W - 32, 80, 0.2);
      const n = env.grade.night;
      // dust turning slowly in the low sun from the door and under the lamp
      // (it drifts on even while time stands still)
      dust(g, x + 44, y + 60, 60, 50, 0.1, 14, env.t, 6203, 0.6 - n * 0.3);
      // the enamel-shade lamp over the customers
      screenPool(g, x + 72, y + 86, 40, 20, P.sky, 0.22 + n * 0.14);
      // the doorway: the late sun comes in low (stage colours)
      screenSpill(g, x + 72, y + 112, 18, 44, 34, rgbHex(env.grade.skyBot), 0.24 - n * 0.15, true);
    },
    light(g: Gfx, x: number, y: number, env: PropEnv) {
      // the lamp over the shop (out of view above the counter): a warm pool
      const n = env.grade.night;
      lightPool(g, x + 76, y + 70, 70, 44, P.sky, 0.1 + n * 0.6);
    },
  });
});

// ---------------------------------------------------------------- pendulum pillar clock (1, 0–1) — flat on the wall

function hinoyaTime(env: PropEnv): [number, number] {
  if (env.stage >= 3) return [5, 1];
  if (env.stage >= 1) return [5, 0];
  const c = env.flag('flag_clock');
  return [4, c >= 2 ? 58 : c >= 1 ? 55 : 52];
}

registerProp('in_hi_clock', () => {
  const cache = new Map<string, HTMLCanvasElement>();
  const build = (hh: number, mm: number, swing: number) => {
    const key = `${hh}:${mm}:${swing}`;
    let c = cache.get(key);
    if (c) return c;
    const p = pc(14, 31);
    // crown and case
    p.rect(1, 0, 12, 2, P.woodDark);
    p.hline(0, 13, 1, P.wood);
    p.rect(1, 2, 12, 28, P.wood);
    p.vline(1, 2, 29, P.woodLt);
    p.vline(12, 2, 29, P.woodDark);
    // face
    clockFace(p, 6, 7, 4, hh, mm, { rim: P.brass, face: P.paper });
    // pendulum window
    p.rect(3, 13, 8, 14, P.ink);
    const px = 7 + swing;
    p.line(7, 13, px, 22, P.brassOld);
    p.ellipse(px + 0.5, 23.5, 2, 2, P.brass);
    p.set(px, 22, P.goldPale);
    p.line(3, 26, 7, 13, P.nightShade); // glass glint
    p.hline(1, 12, 29, P.woodDark);
    p.rect(3, 29, 8, 2, P.woodDark);
    finish(p, { soft: true, rim: false });
    c = p.toCanvas();
    cache.set(key, c);
    return c;
  };
  return {
    ox: 1,
    oy: 0,
    w: 14,
    h: 31,
    foot: 0,
    flat: true,
    img: (env: PropEnv) => {
      const [hh, mm] = hinoyaTime(env);
      let swing: number;
      if (env.stage === 1 || env.stage === 2) swing = 3; // stopped, tilted
      else swing = [-2, -1, 0, 1, 2, 1, 0, -1][Math.floor(env.t / 125) % 8];
      return build(hh, mm, swing);
    },
  };
});

// ---------------------------------------------------------------- behind the counter: tatami, zabuton, tea things

registerProp('in_hi_back', () => {
  // (2..7, 2) the raised tatami where おばあ sits (flat, under her)
  const p = pc(96, 16);
  // aged tatami: straw-green rush woven in rows, dark cloth borders between mats
  for (let x = 0; x < 96; x++)
    for (let y = 0; y < 16; y++) {
      const mx = x % 32;
      if (mx === 31 || mx === 30) p.set(x, y, mx === 31 ? P.leafShade : P.leafDeep);
      else if (y % 2 === 1) p.set(x, y, x % 6 === 0 ? P.leafYoung : P.leafLt);
      else p.set(x, y, (x + (y >> 1)) % 9 === 0 ? P.goldPale : P.leafYoung);
    }
  for (let x = 0; x < 96; x++) {
    p.set(x, 0, P.nightShade);
    p.set(x, 15, P.woodDark);
  }
  // zabuton under おばあ (4,2)
  p.rect(33, 5, 14, 10, P.maroon);
  p.hline(33, 46, 5, P.crimson);
  p.set(40, 10, P.goldPale);
  // tea tray: pot and a cup, a small tin of senbei
  p.rect(6, 6, 12, 7, P.woodDark);
  p.ellipse(10.5, 8.5, 2.5, 2.2, P.charcoal);
  p.set(9, 7, P.steel);
  p.rect(14, 8, 2, 3, P.white);
  p.set(14, 8, P.leafYoung);
  p.rect(20, 7, 6, 5, P.brass);
  p.hline(20, 25, 7, P.goldPale);
  printLines(p, 21, 9, 4, 2, P.verm, 3);
  // stacked 帳面 and a cardboard box of stock at the back right
  p.rect(66, 4, 12, 9, P.woodLt);
  p.rect(66, 3, 12, 1, P.goldPale);
  p.vline(77, 4, 12, P.brassOld);
  p.rect(70, 3, 2, 4, P.paperGrid);
  for (let k = 0; k < 3; k++) p.rect(56, 10 - k * 2, 7, 2, [P.navy, P.paper, P.leafDeep][k]);
  return { ox: 0, oy: 0, w: 96, h: 16, foot: 0, flat: true, img: () => p.toCanvas() } as PropArt;
});

// ---------------------------------------------------------------- stationery shelf on the west wall (1, 2–4), side view

registerProp('in_hi_bungu', () =>
  prop(16, 48, (p) => {
    // side panel of a narrow shelf standing against the west wall, goods
    // poking out to the east; its top stays under the pendulum clock
    p.rect(1, 1, 6, 47, P.wood);
    p.vline(1, 1, 47, P.woodLt);
    p.vline(6, 1, 47, P.woodDark);
    p.hline(1, 6, 1, P.goldPale);
    const shelves = [9, 20, 31];
    for (const sy of shelves) {
      p.rect(6, sy, 8, 2, P.woodLt);
      p.hline(6, 13, sy, P.goldPale);
      p.hline(6, 13, sy + 2, P.ink);
    }
    // top: notebooks (spines) standing, one leaning
    for (let k = 0; k < 4; k++) {
      const c = [P.leafDeep, P.blue, P.red, P.gold][k];
      p.rect(7 + k * 2, 3, 2, 6, c);
      p.set(7 + k * 2, 3, lt(c));
    }
    p.set(13, 2, P.gold);
    // pencils in a cup, erasers, a red pen
    p.rect(8, 15, 4, 5, P.concreteLt);
    for (const [xx, c] of [[8, P.gold], [9, P.red], [10, P.leaf], [11, P.blue]] as const) p.vline(xx, 11, 14, c);
    p.rect(12, 18, 2, 2, P.peach);
    // stamp pads (red and black), a jar of glue, a red pen
    p.rect(7, 28, 5, 3, P.navy);
    p.rect(8, 28, 3, 2, P.verm);
    p.rect(10, 24, 3, 4, P.white);
    p.set(10, 24, P.gold);
    p.rect(7, 23, 3, 1, P.verm);
    // bottom: boxes of chalk and a stack of drawing paper
    p.rect(7, 35, 7, 5, P.paper);
    p.hline(7, 13, 35, P.white);
    p.rect(7, 41, 6, 5, P.woodLt);
    p.hline(7, 12, 41, P.goldPale);
    p.hline(1, 13, 47, P.ink);
    // price tags on the shelf edges
    for (const sy of shelves) p.set(12, sy + 1, P.verm);
  }, { base: 48, foot: 47, contact: 0, shadow: 0 }),
);

// ---------------------------------------------------------------- the counter (2–6,3) with abacus, coin tray, 当てくじ

registerProp('in_hi_counter', () => {
  const p = pc(80, 24);
  // top board
  p.rect(0, 6, 80, 4, P.woodLt);
  p.hline(0, 79, 6, P.goldPale);
  p.hline(0, 79, 9, P.wood);
  // glass-front display: small goods inside
  p.rect(0, 10, 80, 12, P.woodDark);
  for (let k = 0; k < 4; k++) {
    const gx = 2 + k * 19;
    p.rect(gx, 11, 17, 9, P.shadeDeep);
    goodsRow(p, gx + 1, 15, 15, 4, 900 + k, [P.red, P.gold, P.aqua, P.leaf, P.crimson, P.white]);
    p.line(gx + 2, 18, gx + 6, 12, P.steel);
    p.hline(gx, gx + 16, 11, P.nightShade);
  }
  p.rect(0, 21, 80, 3, P.ink);
  p.hline(0, 79, 21, P.woodDark);
  // abacus (x 2–3)
  p.rect(4, 2, 16, 5, P.woodDark);
  p.rect(5, 3, 14, 3, P.wood);
  p.hline(5, 18, 3, P.ink);
  for (let k = 0; k < 7; k++) {
    p.set(6 + k * 2, 4, P.brassOld);
    p.set(6 + k * 2, 5, k % 3 === 0 ? P.woodLt : P.brassOld);
  }
  // coin tray (the register at x4): a little wooden box with 10-yen coins
  p.rect(33, 3, 13, 4, P.wood);
  p.rect(34, 4, 11, 2, P.woodDark);
  for (const cx of [35, 37, 40, 42]) p.set(cx, 4, P.brass);
  p.set(38, 5, P.concrete);
  // 当てくじ board standing at x5 (a card of tabs, the faded prize on top)
  p.rect(50, 0, 13, 7, P.paper);
  p.rect(50, 0, 13, 2, P.crimson);
  p.rect(54, -1, 5, 2, P.sky);
  for (let r = 0; r < 2; r++) for (let c = 0; c < 6; c++) p.set(51 + c * 2, 3 + r * 2, (r + c) % 4 === 0 ? P.gold : P.steel);
  p.set(62, 6, P.woodDark);
  // a jar of 10-yen gum (x6)
  p.rect(68, 1, 6, 6, P.aqua);
  p.rect(68, 0, 6, 1, P.verm);
  p.set(69, 3, P.red);
  p.set(71, 4, P.gold);
  p.set(72, 2, P.leafYoung);
  p.set(68, 2, P.white);
  finish(p, { soft: true });
  const a = stand(p.toCanvas(), { cx: 40, base: 16, contact: 0, shadow: 0 });
  // one tab of the 当てくじ card (already torn half off) lifts in the fan's
  // breeze whenever the fan's head swings round towards it
  a.over = (g: Gfx, x: number, y: number, env: PropEnv) => {
    const face = hiFanFace(env);
    const up = env.stage !== 1 && face < 0 ? 1 + (Math.floor(env.mt / 120) % 2) : 0;
    const bx = x + a.ox + 60;
    const by = y + a.oy + 5;
    g.rect(bx, by - up, 2, 2, P.paper);
    g.rect(bx, by - up + 1, 2, 1, up ? P.paperGrid : P.paper);
    if (up) g.rect(bx, by + 1, 2, 1, P.woodDark);
    if (up === 2) g.rect(bx + 1, by - 3, 1, 1, P.white);
  };
  return a;
});

// ---------------------------------------------------------------- dagashi displays (8,2) (7–8,3–4) (8,5)

function snackBox(p: PixelCanvas, x: number, y: number, w: number, h: number, seed: number): void {
  // an open cardboard tray full of small snacks
  p.rect(x, y, w, h, P.woodLt);
  p.hline(x, x + w - 1, y, P.goldPale);
  p.rect(x + 1, y + 1, w - 2, h - 2, P.brassOld);
  const c = BAGS[seed % 4];
  for (let j = y + 1; j < y + h - 1; j++)
    for (let i = x + 1; i < x + w - 1; i++) {
      const hh = ihash(i >> 1, j, seed + 7);
      if (hh % 5 === 0) continue;
      p.set(i, j, hh % 3 === 0 ? lt(c) : c);
    }
  // price card
  p.rect(x + w - 5, y + h - 3, 4, 3, P.white);
  p.set(x + w - 4, y + h - 2, P.verm);
}

registerProp('in_hi_shelf_n', () =>
  prop(16, 44, (p) => {
    // tall corner shelf with snack strips hanging from its top
    p.rect(1, 2, 14, 42, P.woodDark);
    p.vline(1, 2, 43, P.wood);
    p.hline(1, 14, 2, P.woodLt);
    for (const sy of [12, 22, 32]) {
      p.rect(2, sy, 12, 1, P.woodLt);
    }
    goodsRow(p, 2, 6, 12, 6, 71, BAGS);
    goodsRow(p, 2, 16, 12, 6, 72, BAGS);
    goodsRow(p, 2, 26, 12, 6, 73, BAGS);
    snackBox(p, 2, 34, 12, 8, 2);
    // strips hanging in front
    for (let k = 0; k < 3; k++) {
      const x = 3 + k * 4;
      p.vline(x + 1, 3, 5, P.charcoal);
      for (let j = 0; j < 3; j++) {
        const c = BAGS[(k + j + 1) % 4];
        p.rect(x, 4 + j * 4, 3, 3, c);
        p.set(x + 1, 5 + j * 4, P.white);
      }
    }
  }, { base: 16, contact: 0, shadow: 0 }),
);

registerProp('in_hi_dagashi', () =>
  prop(32, 44, (p) => {
    // stepped display (ひな壇), three steps rising to the east wall
    const steps = [
      [0, 30, 32, 14],
      [4, 18, 28, 13],
      [9, 6, 23, 13],
    ] as const;
    for (const [sx, sy, sw, shh] of steps) {
      p.rect(sx, sy + 4, sw, shh - 4, P.wood);
      p.hline(sx, sx + sw - 1, sy + shh - 1, P.woodDark);
      p.vline(sx, sy + 4, sy + shh - 1, P.woodLt);
    }
    // boxes on each step (a colour each, left to right)
    let k = 0;
    for (const [sx, sy, sw] of steps) {
      let x = sx + 1;
      while (x + 7 <= sx + sw) {
        snackBox(p, x, sy, 7, 6, k++);
        x += 8;
      }
    }
    // a hand-written sign 『10円』 on the top step
    p.rect(20, 0, 9, 6, P.paper);
    p.hline(20, 28, 5, P.paperGrid);
    tiny(p, '10', 21, 0, P.verm);
    p.set(28, 1, P.verm);
    // long 棒 snacks standing in a can at the front
    p.rect(2, 22, 5, 8, P.steel);
    p.hline(2, 6, 22, P.concreteLt);
    for (const [xx, c] of [[2, P.gold], [4, P.red], [6, P.leafYoung]] as const) p.vline(xx, 14, 21, c);
  }, { cx: 16, base: 32, foot: 31, contact: 0, shadow: 0 }),
);

registerProp('in_hi_shelf_e', () =>
  prop(16, 30, (p) => {
    // narrow shelf on the east wall (side view): side panel + goods poking west
    p.rect(9, 0, 6, 30, P.woodDark);
    p.vline(9, 0, 29, P.wood);
    for (const sy of [8, 18]) {
      p.rect(2, sy, 8, 2, P.woodLt);
      p.hline(2, 9, sy, P.goldPale);
    }
    goodsRow(p, 2, 2, 7, 6, 91, BAGS);
    goodsRow(p, 2, 12, 7, 6, 92, BAGS);
    // menko cards bundle and a spinning top at the bottom
    p.rect(2, 22, 6, 4, P.paper);
    p.rect(3, 23, 2, 2, P.red);
    p.rect(5, 23, 2, 2, P.blue);
    p.ellipse(5, 28, 2.5, 1.5, P.brass);
    p.vline(5, 26, 27, P.woodDark);
  }, { base: 16, contact: 0, shadow: 0 }),
);

// ---------------------------------------------------------------- candy jars on a low stand (4–5,5)

registerProp('in_hi_jars', () =>
  prop(32, 26, (p) => {
    // low wooden stand
    p.rect(0, 14, 32, 12, P.wood);
    p.hline(0, 31, 14, P.woodLt);
    p.hline(0, 31, 25, P.ink);
    p.vline(31, 14, 25, P.woodDark);
    p.rect(3, 18, 26, 5, P.woodDark);
    // six glass jars with red lids (#E23B2E): back row then front row
    const jar = (x: number, y: number, c1: string, c2: string) => {
      // glass jar: a narrow neck under the red lid, round shoulders and bottom
      p.rect(x + 2, y, 5, 2, P.concreteLt);
      p.rect(x, y + 2, 9, 7, P.aqua);
      p.set(x, y + 2, 'transparent');
      p.set(x + 8, y + 2, 'transparent');
      p.set(x, y + 8, 'transparent');
      p.set(x + 8, y + 8, 'transparent');
      p.hline(x + 1, x + 7, y + 9, P.blue);
      // sweets inside (the lower two thirds)
      p.rect(x + 1, y + 4, 7, 5, c1);
      for (let i = 0; i < 6; i++) p.set(x + 1 + ((i * 3) % 7), y + 4 + ((i * 2) % 5), c2);
      // glass highlights
      p.vline(x + 1, y + 3, y + 7, P.white);
      p.set(x + 2, y + 3, P.glint);
      p.vline(x + 7, y + 4, y + 7, P.blue);
      // lid
      p.rect(x + 1, y - 2, 7, 2, P.verm);
      p.hline(x + 1, x + 7, y - 2, P.vermLt);
    };
    jar(1, 2, P.gold, P.red, );
    jar(11, 1, P.peach, P.white);
    jar(21, 2, P.leafYoung, P.gold);
    jar(5, 8, P.red, P.gold);
    jar(16, 8, P.aqua, P.white);
    // price cards
    p.rect(3, 17, 4, 3, P.white);
    p.rect(24, 17, 4, 3, P.white);
    p.set(4, 18, P.verm);
    p.set(25, 18, P.verm);
  }, { cx: 16, base: 16, contact: 28, shadow: 0 }),
);

// ---------------------------------------------------------------- the pig mosquito-coil holder (3,6)

// the unglazed terracotta pig (蚊やりブタ, 14×10) lying on the boards, seen
// from the side and a little above, facing west: a fat barrel of a body lit
// on its back, the snout end open as a round mouth — a bright pink rim with
// the coil's ember glowing deep inside — droopy round ears, a dot of an eye,
// four stub legs and a curled tail; the smoke curls up out of the snout
// (frame 3 = stage 1: the smoke hangs frozen in the air)
const TERRA = '#B8643A';
const TERRA_LT = '#D8895A';
const TERRA_HI = '#EDB08A';
const TERRA_SH = '#8A4428';
const TERRA_DK = '#5A2A1A';
function kayariPig(p: PixelCanvas, x0: number, y0: number): void {
  const P_ = (x: number, y: number, c: string) => p.set(x0 + x, y0 + y, c);
  // four stub legs: the near pair in front, the far pair darker between them
  for (const [lx, c] of [[5, TERRA_SH], [10, TERRA_SH], [4, TERRA], [11, TERRA]] as const) {
    P_(lx, 9, c);
    P_(lx, 10, lx === 4 || lx === 11 ? TERRA_SH : TERRA_DK);
  }
  // the barrel body (x 3–13, y 2–9): the back lit, the belly in shade, rounded ends
  const rowCol = [TERRA_HI, TERRA_LT, TERRA_LT, TERRA, TERRA, TERRA, TERRA_SH, TERRA_SH];
  for (let y = 2; y <= 9; y++)
    for (let x = 3; x <= 13; x++) {
      if ((y === 2 || y === 9) && (x === 3 || x === 13 || x === 12)) continue;
      if ((y === 3 || y === 8) && x === 13) continue;
      P_(x, y, x === 13 || (x === 12 && y > 3) ? (y < 5 ? TERRA : TERRA_SH) : rowCol[y - 2]);
    }
  // the rough unglazed clay: a few darker grains, a pale scuff on the back
  for (const [gx, gy] of [[9, 4], [11, 6], [7, 7], [10, 3]] as const) P_(gx, gy, TERRA_SH);
  P_(8, 2, P.glint);
  // droopy round ears flopping forward over the head (the near one bigger)
  P_(5, 0, TERRA_LT);
  P_(6, 0, TERRA_LT);
  P_(4, 1, TERRA_LT);
  P_(5, 1, TERRA_HI);
  P_(6, 1, TERRA);
  P_(4, 2, TERRA_SH);
  P_(5, 2, TERRA_SH);
  P_(8, 0, TERRA_SH);
  P_(8, 1, TERRA);
  P_(9, 1, TERRA_SH);
  // the snout end: a round open mouth — bright pink rim, dark inside, the ember
  for (let y = 2; y <= 8; y++)
    for (let x = 0; x <= 5; x++) {
      const dx = (x + 0.5 - 2.6) / 2.7;
      const dy = (y + 0.5 - 5.5) / 3.1;
      const d = dx * dx + dy * dy;
      if (d > 1) continue;
      const inner = ((x + 0.5 - 2.7) / 1.6) ** 2 + ((y + 0.5 - 5.6) / 2) ** 2 <= 1;
      P_(x, y, inner ? '#3A1A14' : dx < -0.2 && dy < 0 ? '#FFD0C4' : '#F09A8C');
    }
  P_(2, 6, P.sunDeep);
  P_(3, 5, '#6A2A1A');
  // the eye behind the snout, a scratched-in smile
  P_(6, 4, P.ink);
  P_(6, 7, TERRA_SH);
  P_(7, 7, TERRA_SH);
  // the curled tail on the east end
  P_(14, 5, TERRA);
  P_(15, 4, TERRA_SH);
  P_(15, 3, TERRA);
  P_(14, 3, TERRA_LT);
}

const KAYARI = mkFrames(4, 18, 25, (p, k) => {
  kayariPig(p, 1, 13);
  // smoke: soft puffs rising out of the snout, drifting east with the draught
  const puffs =
    k === 3
      ? [[3, 10, 0], [4, 6, 1], [6, 2, 2]]
      : [[3, 11 - k * 1.5, 0], [4 + (k % 2), 7 - k * 1.5, 1], [6 + (k === 2 ? 1 : 0), 3 - k * 1.2, 2]];
  for (const [x, y, i] of puffs) {
    const yy = Math.round(y);
    if (yy < 0) continue;
    p.set(Math.round(x), yy, i === 2 ? P.concrete : P.concreteLt);
    p.set(Math.round(x) + 1, yy, P.concrete);
    if (i < 2) p.set(Math.round(x), yy - 1, P.concrete);
  }
}, (p) => {
  // a dark reddish-brown outline round the pig only (not round the smoke)
  const w = p.w;
  const h = p.h;
  const src = p.clone();
  for (let y = 12; y < h; y++)
    for (let x = 0; x < w; x++) {
      if (src.alpha(x, y)) continue;
      const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => y + dy >= 13 && (src.get(x + dx, y + dy) >>> 24) === 255);
      if (nb) p.set(x, y, TERRA_DK);
    }
});
registerProp('in_hi_kayari', () => {
  const a = stand(KAYARI[0], { base: 16, shadow: 0, contact: 13 });
  a.img = (env) => KAYARI[env.stage === 1 ? 3 : Math.floor(env.mt / 300) % 3];
  a.glow = (g: Gfx, x: number, y: number, env: PropEnv) => {
    // the tip of the coil glows deep in the snout, breathing even when time stands still
    const on = 0.55 + Math.sin(env.t / 420) * 0.4;
    g.rect(x + a.ox + 3, y + a.oy + 19, 1, 1, P.gold, on);
    g.rect(x + a.ox + 4, y + a.oy + 18, 1, 1, P.sunDeep, on * 0.7);
    screenPool(g, x + a.ox + 3, y + a.oy + 20, 8, 5, P.sunDeep, 0.3 * on);
  };
  return a;
});

// ---------------------------------------------------------------- ramune fridge (8,6)

registerProp('in_hi_ramune', () => {
  const p = pc(16, 30);
  p.rect(1, 2, 14, 28, P.white);
  p.vline(1, 2, 29, P.glint);
  p.vline(14, 3, 29, P.concrete);
  p.rect(1, 2, 14, 4, P.verm);
  fontTextSmall(p, 'ラ', 2, 2, P.white, 1);
  p.rect(9, 3, 4, 2, P.white);
  // glass door: two shelves of ramune bottles (aqua glass, marble)
  p.rect(2, 7, 12, 18, P.navy);
  for (const sy of [8, 16]) {
    for (let k = 0; k < 4; k++) {
      const bx = 3 + k * 3;
      p.rect(bx, sy + 2, 2, 5, P.aqua);
      p.set(bx, sy + 1, P.blue);
      p.set(bx + 1, sy + 3, P.white);
      p.set(bx, sy + 5, P.glow);
    }
    p.hline(2, 13, sy + 7, P.steel);
  }
  p.vline(13, 8, 23, P.steel);
  p.rect(1, 26, 14, 4, P.concrete);
  p.hline(1, 14, 26, P.concreteLt);
  for (let x = 3; x < 13; x += 2) p.set(x, 28, P.steel);
  finish(p, { soft: true });
  const a = stand(p.toCanvas(), { base: 16, contact: 12, shadow: 0 });
  a.glow = (g: Gfx, x: number, y: number, env: PropEnv) => {
    // the inside glows blue-white (#7FD1E8) and lights the floor a little;
    // the old tube in the case stutters now and then
    const on = tube(env.t, 6201, [1500, 3800], [60, 180]);
    const fl = on ? 0.95 + Math.sin(env.t / 700) * 0.05 : 0.3;
    g.rect(x + a.ox + 3, y + a.oy + 8, 10, 16, P.aqua, 0.22 * fl);
    g.rect(x + a.ox + 3, y + a.oy + 8, 10, 1, P.glint, 0.5 * fl);
    screenPool(g, x + a.ox - 2, y + a.oy + 24, 12, 7, P.aqua, 0.18 * fl);
  };
  // a moth batting round the glass (it hangs still in mid-air while time stands still)
  a.over = (g: Gfx, x: number, y: number, env: PropEnv) => {
    const t = env.mt / 1000;
    const mx = Math.round(x + a.ox + 8 + Math.sin(t * 2.3) * 7 + Math.sin(t * 5.1) * 1.5);
    const my = Math.round(y + a.oy + 9 + Math.cos(t * 1.7) * 6 + Math.sin(t * 7.3));
    const open = env.stage === 1 || Math.floor(env.mt / 70) % 2 === 0;
    g.rect(mx, my, 1, 2, P.woodDark);
    if (open) {
      g.rect(mx - 1, my, 1, 1, P.paperGrid);
      g.rect(mx + 1, my, 1, 1, P.paperGrid);
      g.rect(mx - 1, my + 1, 1, 1, P.woodLt);
      g.rect(mx + 1, my + 1, 1, 1, P.woodLt);
    } else g.rect(mx, my - 1, 1, 1, P.paperGrid);
  };
  return a;
});

// ---------------------------------------------------------------- door mat (4,6) and the enamel-shade lamp (4,4)

registerProp('in_hi_mat', () => {
  const p = pc(16, 10);
  p.rect(0, 2, 16, 8, P.maroon);
  p.strokeRect(0, 2, 16, 8, P.nightShade);
  for (let x = 2; x < 14; x += 2) p.vline(x, 4, 7, P.sunShade);
  return { ox: 0, oy: 4, w: 16, h: 10, foot: 0, flat: true, img: () => p.toCanvas() } as PropArt;
});

registerProp('in_hi_bulb', () => {
  const p = pc(13, 26);
  p.vline(6, 0, 16, P.charcoal);
  // enamel shade (white with a green rim)
  p.poly([[2, 21], [6, 16], [7, 16], [11, 21]], P.white);
  p.hline(1, 11, 21, P.leafDeep);
  p.hline(3, 9, 18, P.concreteLt);
  p.rect(5, 22, 3, 2, P.goldPale);
  p.set(6, 22, P.glint);
  const img = p.toCanvas();
  const oy = -40;
  return {
    ox: 2,
    oy,
    w: 13,
    h: 26,
    foot: 0,
    img: () => null,
    fg: [{ ox: 2, oy, img: () => img }],
    glow(g: Gfx, x: number, y: number, env: PropEnv) {
      const n = env.grade.night;
      screenPool(g, x + 8, y + oy + 23, 11, 8, P.sky, 0.35 + n * 0.25);
      g.rect(x + 8, y + oy + 22, 1, 2, P.glint, 0.9);
    },
  } as PropArt;
});

// ---------------------------------------------------------------- a little standing fan behind the counter (6,2)

const HFAN = mkFrames(5, 12, 20, (p, k) => {
  p.rect(4, 17, 5, 2, P.white);
  p.vline(6, 10, 17, P.concreteLt);
  const face = k === 4 ? 2 : [-1, 0, 1, 0][k];
  p.ellipse(6 + face, 6, 4.5, 4.5, P.white);
  p.ring(6 + face, 6, 4.5, 4.5, P.concrete);
  p.ellipse(6 + face, 6, 3, 3, P.aqua);
  const bl = [[[4, 4], [8, 8]], [[8, 4], [4, 8]], [[6, 3], [6, 9]], [[3, 6], [9, 6]]][k % 4];
  for (const [bx, by] of bl) p.set(bx + face, by, P.blue);
  p.set(6 + face, 6, P.steel);
}, (p) => finish(p, { soft: true }));
/** Where the little fan's head points: -1 west (towards the 当てくじ), 0, +1 east. */
function hiFanFace(env: PropEnv): number {
  return [-1, 0, 1, 0][Math.floor(env.mt / 380) % 4];
}

registerProp('in_hi_fan', () => {
  const a = stand(HFAN[0], { base: 12, shadow: 0, contact: 8 });
  a.img = (env) => HFAN[env.stage === 1 ? 4 : Math.floor(env.mt / 380) % 4];
  return a;
});

void notice;
void printLines;
void blend;
