// 肉のマルヤマ interior (30_level_art 4.3, 10×8: a second row of floor for the
// customers, review round 1). A narrow butcher's: white
// tiled walls under cream plaster, the meat-cut poster, a stainless fryer
// whose oil quietly glows and pulses, a refrigerated showcase with an empty
// croquette tray (「5時から」), the old register with a beckoning cat, a
// spring scale, a kamidana shelf, wooden menu plaques, two bare bulbs; by
// the door the delivery crates and the waiting stool for the five o'clock
// queue. Outside: the arcade (iexterior.ts).

import type { Gfx } from '../../engine/gfx';
import { PixelCanvas } from '../../engine/pixel';
import { getMapDef } from '../../world/maps';
import { boards, quarry } from '../tiles/ifloor';
import { ihash, valueNoise } from '../tiles/noise';
import { P } from '../tiles/palette';
import { clockFace, framed, pc, prop } from './ifurn';
import { blend, depthShade, lightPool, paintShell, screenPool, screenSpill, shellProp } from './ishell';
import { exteriorGlow, exteriorImg, exteriorOver, withExterior } from './iexterior';
import { castRight, finish, lt } from './kit';
import { mkFrames, stand } from './pkit';
import { registerProp } from './registry';
import { fontTextSmall, printLines, tiny } from './text';
import type { PropArt, PropEnv } from './types';

// ---------------------------------------------------------------- shell

registerProp('in_mr_shell', () => {
  const rows = getMapDef('map_maruyama')?.rows ?? [];
  const tiles = quarry(71);
  const wood = boards({ bh: 5, lit: P.brassOld, base: P.wood, shade: P.woodDark, gap: P.woodDark, nail: P.wood, seed: 72 });
  const sh = paintShell({
    rows,
    floor: (x, y, _tx, ty) => (ty <= 4 ? tiles(x, y) : wood(x, y)),
    wall: (x, y) => {
      if (y <= 12) return valueNoise(x / 5, y / 4, 31) > 0.78 ? P.paper : P.paperGrid;
      if (y === 13) return P.woodLt;
      if (y === 14) return P.wood;
      const ty = y - 15;
      if (x % 5 === 4 || ty % 5 === 4) return P.concrete;
      return ihash(Math.floor(x / 5), Math.floor(ty / 5), 33) % 7 === 0 ? P.concreteLt : P.white;
    },
    trim: P.woodLt,
    base: P.woodDark,
    baseH: 3,
  });
  const p = sh.p;
  // ---- floor details: grease sheen by the fryer, a ribbed rubber mat, a drain grate
  for (let y = 48; y < 64; y++)
    for (let x = 32; x < 64; x++) {
      if (valueNoise(x / 6, y / 4, 74) > 0.7) blend(p, x, y, P.brassOld, 0.35);
    }
  // rubber mat in front of the fryer (row 3, x 2–3)
  for (let y = 50; y < 61; y++)
    for (let x = 34; x < 62; x++) {
      const edge = y === 50 || y === 60 || x === 34 || x === 61;
      p.set(x, y, edge ? P.ink : (y - 50) % 3 === 1 ? P.asphalt : P.charcoal);
    }
  // drain grate (5,3)
  p.rect(86, 52, 9, 7, P.asphalt);
  for (let x = 87; x < 94; x += 2) p.vline(x, 53, 57, P.charcoal);
  p.hline(86, 94, 52, P.steel);
  // a worn path on the boards from the door to the counter, a dropped price tag,
  // the grease-darkened boards where the queue stands at five
  for (let x = 40; x < 140; x++) for (let y = 81; y < 110; y++) if (valueNoise(x / 9, y / 3, 75) > 0.75 - (x >= 62 && x < 84 ? 0.08 : 0)) blend(p, x, y, P.woodLt, 0.25);
  for (let x = 88; x < 134; x++) for (let y = 97; y < 110; y++) if (valueNoise(x / 7, y / 4, 76) > 0.72) blend(p, x, y, P.woodDark, 0.3);
  p.rect(120, 90, 3, 2, P.white);
  p.set(121, 90, P.verm);
  // a croquette paper bag's twist, a bottle cap by the crates
  p.rect(98, 102, 4, 2, P.paper);
  p.set(101, 102, P.paperGrid);
  p.set(99, 104, P.paperGrid);
  p.rect(33, 106, 2, 2, P.gold);
  p.set(33, 106, P.goldPale);
  // ---- north wall
  // meat-cut poster (1–2): 『牛・豚・鶏 部位の図』
  meatChart(p, 17, 4);
  // range hood over the fryer + stainless backsplash with grease streaks
  for (let y = 3; y <= 12; y++) {
    const k = (y - 3) / 9;
    const x0 = Math.round(45 - k * 5);
    const x1 = Math.round(58 + k * 5);
    for (let x = x0; x <= x1; x++) p.set(x, y, x <= x0 + 1 ? P.concreteLt : x >= x1 - 1 ? P.asphalt : y === 12 ? P.steel : P.concrete);
  }
  p.rect(49, 0, 6, 3, P.steel);
  p.vline(49, 0, 2, P.concreteLt);
  p.hline(40, 63, 12, P.charcoal);
  p.hline(41, 62, 11, P.steel);
  castRight(p, 40, 3, 24, 10, 2);
  p.rect(34, 13, 30, 15, P.concrete);
  p.hline(34, 63, 13, P.concreteLt);
  p.vline(34, 13, 27, P.concreteLt);
  for (const [gx, gy, gl] of [[38, 15, 6], [44, 14, 9], [52, 16, 5], [57, 14, 8]] as const) {
    p.vline(gx, gy, gy + gl, P.brassOld);
    p.vline(gx + 1, gy + 1, gy + gl - 2, P.goldPale);
  }
  for (const rx of [36, 61]) {
    p.set(rx, 15, P.steel);
    p.set(rx, 25, P.steel);
  }
  // a hook rail with a ladle and a strainer above the backsplash
  p.hline(36, 62, 16, P.steel);
  p.vline(40, 16, 22, P.asphalt);
  p.ellipse(40.5, 23, 2, 1.5, P.asphalt);
  p.vline(59, 16, 20, P.asphalt);
  p.ring(59.5, 22.5, 2.5, 2.5, P.steel);
  // wooden menu plaques on a bar (tiles 5–6)
  p.hline(78, 111, 4, P.woodDark);
  p.hline(78, 111, 3, P.wood);
  const menus = [0, 1, 2, 3, 4, 5];
  for (const k of menus) {
    const x = 79 + k * 5 + (k >= 3 ? 1 : 0);
    const h = 13 + (k % 2);
    p.rect(x, 5, 4, h, P.woodLt);
    p.vline(x, 5, 5 + h - 1, P.goldPale);
    p.vline(x + 3, 5, 5 + h - 1, P.brassOld);
    p.hline(x, x + 3, 5 + h - 1, P.wood);
    for (let j = 0; j < 3; j++) p.vline(x + 1 + (j % 2), 6 + j * 3, 7 + j * 3, P.wood);
    // red price tag
    p.rect(x, 5 + h - 4, 4, 3, P.verm);
    p.hline(x + 1, x + 2, 5 + h - 3, P.white);
    castRight(p, x, 5, 4, h, 1);
  }
  // the croquette plaque gets a yellow sticky note 「5時」 hanging askew
  p.rect(90, 17, 5, 4, P.gold);
  p.set(90, 17, P.goldPale);
  p.hline(91, 93, 19, P.vermShade);
  p.set(94, 20, P.brass);
  // kamidana: a pale-cypress shrine on a shelf, sakaki in two vases, paper shide
  kamidana(p, 112, 1);
  // business licence in a frame and the wholesaler's cow calendar
  {
    const [ix, iy, iw, ih] = framed(p, 113, 16, 10, 9, P.woodDark);
    p.rect(ix, iy, iw, ih, P.white);
    printLines(p, ix + 1, iy + 1, iw - 2, 3, P.steel, 61);
    p.set(ix + iw - 2, iy + ih - 2, P.verm);
  }
  cowCalendar(p, 126, 14);
  // the back of the showcase: a white wall strip with a plug socket
  p.rect(98, 22, 4, 4, P.concreteLt);
  p.set(99, 23, P.charcoal);
  p.set(100, 23, P.charcoal);
  // ---- the entrance (4,7): threshold rail and the glass door with the noren's back seen through it
  const dx = 64;
  const dy = rows.length * 16 - 16;
  p.rect(dx - 2, dy, 20, 2, P.steel);
  p.hline(dx - 2, dx + 17, dy, P.concreteLt);
  p.rect(dx, dy + 2, 16, 8, P.shadeDeep);
  sh.glass.rect(dx + 1, dy + 3, 14, 6, '#ffffff');
  p.vline(dx - 1, dy + 2, dy + 9, P.steel);
  p.vline(dx + 16, dy + 2, dy + 9, P.asphalt);
  p.vline(dx + 8, dy + 2, dy + 9, P.steel);
  p.hline(dx - 1, dx + 16, dy + 10, P.charcoal);
  const W = p.w;
  // the arcade outside: the town's mosaic floor and the shop mat; ひのや and
  // まめ吉 next door to the east, the hedge and the road up the slope with its
  // crossing to the west (the town's own, moved out to the room's walls)
  const ext = withExterior(p, sh.glass, {
    rows,
    town: [27, 21],
    bld: [24, 30, 16],
    skin: [P.white, P.concreteLt, P.concrete],
    roof: 'tin',
    seed: 7101,
    props: [{ id: 'prop_shop_mats', tx: 24, ty: 22 }],
  });
  return shellProp({
    img: ext.p.toCanvas(),
    imgFor: exteriorImg(ext),
    glass: ext.glass.toCanvas(),
    ox: ext.ox,
    oy: ext.oy,
    over(g: Gfx, x: number, y: number, env: PropEnv) {
      exteriorOver(g, x, y, ext, env);
      depthShade(g, x + 16, y + 32, W - 32, 64, 0.16);
      const n = env.grade.night;
      // bare bulbs: warm pools on the floor (α20%)
      for (const bx of [56, 104]) screenPool(g, x + bx, y + 74, 36, 20, P.sky, 0.26 + n * 0.12);
      // the fryer's oil lights the mat a little
      screenPool(g, x + 48, y + 50, 18, 8, P.sun, 0.12);
      // the doorway spills the street's sky onto the boards
      screenSpill(g, x + 72, y + dy, 18, 34, 22, rgbHex(env.grade.skyBot), 0.2 - n * 0.12, true);
    },
    glow(g: Gfx, x: number, y: number, env: PropEnv) {
      // the arcade's lanterns and the neighbours' windows outside
      exteriorGlow(g, x, y, ext, env);
    },
  });
});

function rgbHex(c: [number, number, number]): string {
  const h = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${h(c[0])}${h(c[1])}${h(c[2])}`;
}

/** 『牛・豚・鶏 部位の図』 22×21: a proud cow over a pig and a hen, cuts in reds. */
function meatChart(p: PixelCanvas, x: number, y: number): void {
  const W = 22;
  const H = 21;
  p.rect(x, y, W, H, P.paper);
  p.hline(x, x + W - 1, y + H - 1, P.paperGrid);
  p.vline(x + W - 1, y, y + H - 1, P.paperGrid);
  p.rect(x + 1, y + 1, W - 2, 3, P.red);
  printLines(p, x + 3, y + 2, 16, 1, P.white, 5);
  // cow: body with four cuts divided by white lines, head raised to the right
  const cx = x + 2;
  const cy = y + 6;
  const cow = [
    '.....aaabbbbccccdd.',
    '....aaaabbbbccccddd',
    '...aaaaabbbbccccddd',
    '..eaaaaabbbbccccdd.',
    '..eeeeffffffggggg..',
    '...eeeffffffgggg...',
    '...h..h......h..h..',
  ];
  p.art(cow, { a: P.crimson, b: P.red, c: P.peach, d: P.sunShade, e: P.sunShade, f: P.peach, g: P.crimson, h: P.maroon }, cx, cy);
  for (const lx of [4, 8, 12]) p.vline(cx + lx + 1, cy, cy + 4, P.white);
  p.hline(cx + 3, cx + 16, cy + 4, P.white);
  // proud head: up and to the right, one horn, a smug eye
  p.rect(cx + 16, cy - 3, 3, 3, P.sunShade);
  p.set(cx + 19, cy - 2, P.sunShade);
  p.set(cx + 17, cy - 4, P.goldPale);
  p.set(cx + 17, cy - 2, P.ink);
  p.set(cx + 18, cy - 1, P.white);
  // pig (left) and hen (right)
  const py = y + 14;
  p.ellipse(x + 6, py + 2.5, 4, 2.5, P.skin2);
  p.vline(x + 5, py, py + 4, P.white);
  p.vline(x + 8, py, py + 4, P.white);
  p.set(x + 2, py + 1, P.skin3);
  p.set(x + 1, py + 2, P.skin3);
  p.set(x + 10, py + 1, P.skin3);
  p.set(x + 9, py + 1, P.ink);
  p.vline(x + 4, py + 5, py + 5, P.skin4);
  p.vline(x + 8, py + 5, py + 5, P.skin4);
  // hen
  p.ellipse(x + 16, py + 3, 3, 2.5, P.white);
  p.hline(x + 14, x + 18, py + 5, P.concrete);
  p.rect(x + 18, py, 2, 2, P.white);
  p.set(x + 18, py - 1, P.red);
  p.set(x + 19, py - 1, P.red);
  p.set(x + 20, py + 1, P.gold);
  p.set(x + 19, py, P.ink);
  p.vline(x + 16, py + 3, py + 4, P.concrete);
  castRight(p, x, y, W, H, 2);
  // pins
  p.set(x + 1, y, P.verm);
  p.set(x + W - 2, y, P.verm);
}

function kamidana(p: PixelCanvas, x: number, y: number): void {
  // shelf plank on two brackets
  p.rect(x, y + 10, 24, 2, P.woodLt);
  p.hline(x, x + 23, y + 10, P.goldPale);
  p.hline(x, x + 23, y + 12, P.wood);
  p.vline(x + 3, y + 12, y + 14, P.wood);
  p.vline(x + 20, y + 12, y + 14, P.wood);
  // shrine: gabled roof, pale body with a tiny round mirror and doors
  p.poly([[x + 7, y + 4], [x + 12, y + 1], [x + 17, y + 4]], P.wood);
  p.hline(x + 6, x + 18, y + 4, P.woodDark);
  p.set(x + 12, y + 1, P.woodLt);
  p.rect(x + 8, y + 5, 9, 5, P.goldPale);
  p.vline(x + 8, y + 5, y + 9, P.paper);
  p.vline(x + 16, y + 5, y + 9, P.brass);
  p.vline(x + 12, y + 6, y + 9, P.brass);
  p.set(x + 12, y + 5, P.glint);
  // sakaki vases
  for (const vx of [x + 2, x + 21]) {
    p.rect(vx - 1, y + 7, 3, 3, P.white);
    p.set(vx - 1, y + 7, P.concreteLt);
    p.rect(vx - 1, y + 3, 3, 4, P.leafDeep);
    p.set(vx, y + 2, P.leaf);
    p.set(vx - 1, y + 4, P.leaf);
    p.set(vx + 1, y + 5, P.leafShade);
  }
  // shimenawa with paper shide zigzags
  p.hline(x + 1, x + 22, y + 12, P.goldPale);
  for (const sx of [x + 6, x + 12, x + 18]) {
    p.set(sx, y + 13, P.white);
    p.set(sx + 1, y + 14, P.white);
    p.set(sx, y + 15, P.white);
  }
  castRight(p, x, y + 1, 24, 13, 2);
}

function cowCalendar(p: PixelCanvas, x: number, y: number): void {
  p.vline(x + 7, y - 2, y - 1, P.charcoal);
  p.rect(x, y, 15, 14, P.white);
  // photo: blue sky, green field, a black-and-white cow
  p.rect(x + 1, y + 1, 13, 3, P.aqua);
  p.rect(x + 1, y + 4, 13, 3, P.leaf);
  p.rect(x + 4, y + 3, 6, 3, P.white);
  p.set(x + 5, y + 3, P.ink);
  p.set(x + 8, y + 4, P.ink);
  p.rect(x + 10, y + 2, 2, 2, P.white);
  p.set(x + 11, y + 2, P.ink);
  // name band and the date grid
  p.rect(x + 1, y + 7, 13, 1, P.red);
  for (let r = 0; r < 3; r++) for (let c = 0; c < 6; c++) p.set(x + 2 + c * 2, y + 9 + r * 2, c === 5 ? P.verm : P.steel);
  p.ring(x + 11.5, y + 11.5, 1.5, 1.5, P.verm);
  p.hline(x, x + 14, y + 13, P.concrete);
  castRight(p, x, y, 15, 14, 2);
}

// ---------------------------------------------------------------- wall clock & wall fan (flat, animated)

function clockTime(env: PropEnv): [number, number] {
  if (env.stage >= 3) return [5, 1];
  if (env.stage >= 1) return [5, 0];
  const c = env.flag('flag_clock');
  return [4, c >= 2 ? 58 : c >= 1 ? 55 : 52];
}

registerProp('in_mr_clock', () => {
  const cache = new Map<string, HTMLCanvasElement>();
  const img = (env: PropEnv) => {
    const [h, m] = clockTime(env);
    const k = `${h}:${m}`;
    let c = cache.get(k);
    if (!c) {
      const p = pc(12, 12);
      clockFace(p, 5, 5, 4, h, m, { rim: P.woodDark });
      castRight(p, 0, 0, 11, 11, 1);
      c = p.toCanvas();
      cache.set(k, c);
    }
    return c;
  };
  return { ox: 3, oy: 1, w: 12, h: 12, foot: 0, flat: true, img };
});

const FAN = mkFrames(5, 14, 14, (p, k) => {
  // wall bracket and an oscillating fan head (frames 0–3), 4 = stuck (stage 1)
  p.rect(6, 10, 2, 4, P.concrete);
  p.hline(4, 9, 13, P.steel);
  const face = k === 4 ? 2 : [-2, -1, 1, 2][k];
  const cx = 7 + face;
  p.ellipse(cx, 6, 5, 5, P.white);
  p.ring(cx, 6, 5, 5, P.concrete);
  p.ellipse(cx, 6, 3.5, 3.5, P.goldPale);
  const bl = [[[5, 4], [9, 8]], [[9, 4], [5, 8]], [[7, 3], [7, 9]], [[4, 6], [10, 6]]][k % 4];
  for (const [bx, by] of bl) {
    p.set(bx + face, by, P.brass);
    p.set(bx + face + (bx < 7 ? 1 : -1), by, P.brass);
  }
  p.set(cx, 6, P.steel);
}, (p) => finish(p, { soft: true, rim: false }));

registerProp('in_mr_fan', () => ({
  ox: 1,
  oy: 13,
  w: 14,
  h: 14,
  foot: 0,
  flat: true,
  img: (env: PropEnv) => FAN[env.stage === 1 ? 4 : Math.floor(env.mt / 320) % 4],
}));

// ---------------------------------------------------------------- prep table (1,2)

registerProp('in_mr_prep', () =>
  prop(16, 22, (p) => {
    // stainless top
    p.rect(0, 4, 16, 5, P.concreteLt);
    p.hline(0, 15, 4, P.white);
    p.hline(0, 15, 8, P.steel);
    // tray with six breaded (raw) croquettes waiting for five o'clock
    p.rect(1, 3, 9, 5, P.steel);
    p.rect(2, 3, 7, 4, P.concrete);
    for (let k = 0; k < 6; k++) {
      const cx = 2 + (k % 3) * 2 + (k >= 3 ? 1 : 0);
      const cy = 3 + Math.floor(k / 3) * 2;
      p.rect(cx, cy, 2, 1, P.goldPale);
      p.set(cx + 1, cy, P.brass);
    }
    // flour and egg bowls
    p.ellipse(12.5, 4.5, 2.5, 1.5, P.white);
    p.hline(11, 14, 5, P.concreteLt);
    p.ellipse(12.5, 7, 2, 1, P.gold);
    p.set(12, 6, P.goldPale);
    // apron and legs, a lower shelf with a bucket and stacked trays
    p.rect(0, 9, 16, 2, P.steel);
    p.vline(1, 11, 21, P.steel);
    p.vline(14, 11, 21, P.asphalt);
    p.rect(2, 16, 12, 1, P.steel);
    p.rect(3, 12, 5, 4, P.blue);
    p.hline(3, 7, 12, P.aqua);
    p.rect(9, 14, 5, 2, P.concrete);
    p.hline(9, 13, 14, P.concreteLt);
    p.hline(1, 14, 21, P.charcoal);
  }, { base: 16, contact: 0, shadow: 0 }),
);

// ---------------------------------------------------------------- the fryer (2–3,2)

const FRYER_OX = 0;
registerProp('in_mr_fryer', () => {
  const p = pc(32, 24);
  // back rail with two frying baskets hanging
  p.hline(2, 29, 1, P.steel);
  for (const bx of [5, 18]) {
    p.rect(bx, 0, 8, 4, P.concrete);
    for (let i = bx; i < bx + 8; i += 2) p.vline(i, 1, 3, P.steel);
    p.hline(bx, bx + 7, 0, P.concreteLt);
    p.vline(bx + 8, 1, 2, P.asphalt);
  }
  // body (stainless), the recessed oil well
  p.rect(0, 4, 32, 20, P.concrete);
  p.hline(0, 31, 4, P.white);
  p.vline(0, 4, 23, P.concreteLt);
  p.vline(31, 5, 23, P.asphalt);
  p.rect(2, 5, 28, 7, P.steel);
  p.rect(3, 6, 26, 5, P.brassOld);
  p.hline(3, 28, 6, P.wood);
  p.set(3, 10, P.wood);
  p.set(28, 10, P.woodDark);
  // front: control panel, dials, a drip tray lip
  p.rect(1, 13, 30, 1, P.asphalt);
  p.rect(2, 15, 28, 5, P.concreteLt);
  for (const dx of [6, 13]) {
    p.ellipse(dx + 0.5, 17.5, 2, 2, P.charcoal);
    p.set(dx, 16, P.white);
  }
  p.rect(19, 16, 6, 3, P.ink);
  tiny(p, '180', 19, 16, P.red, undefined, 0);
  p.rect(26, 16, 2, 3, P.red);
  p.hline(1, 30, 21, P.steel);
  p.rect(1, 22, 30, 2, P.charcoal);
  finish(p, { soft: true });
  const img = p.toCanvas();
  const a = stand(img, { cx: 16, base: 16, shadow: 0, contact: 0 });
  a.over = (g: Gfx, x: number, y: number, env: PropEnv) => {
    const ox = x + a.ox + FRYER_OX;
    const oy = y + a.oy;
    const t = env.t;
    if (env.stage >= 3) {
      // the ending: it's frying — bubbles (4 frames)
      const f = Math.floor(t / 110) % 4;
      for (let k = 0; k < 7; k++) {
        const hh = ihash(k, f, 91);
        g.rect(ox + 4 + (hh % 24), oy + 7 + ((hh >>> 5) % 3), 1, 1, (hh >>> 9) & 1 ? P.horizon : P.goldPale);
      }
      return;
    }
    if (env.stage === 2) {
      // the sunset shows in the oil (under a roof)
      g.rect(ox + 7, oy + 7, 12, 1, P.sun);
      g.rect(ox + 10, oy + 8, 8, 1, P.crimson);
      g.rect(ox + 13, oy + 7, 3, 1, P.horizon);
      return;
    }
    // a 2px highlight that slowly pulses (2 s); stage 1: now and then a small sigh
    let k: number;
    if (env.stage === 1) {
      const u = (t % 5200) / 5200;
      k = u < 0.08 ? Math.sin((u / 0.08) * Math.PI) : 0;
    } else k = Math.sin(((t % 2000) / 2000) * Math.PI * 2) * 0.5 + 0.5;
    const len = 2 + Math.round(k * 4);
    g.rect(ox + 8, oy + 7, len, 1, k > 0.55 ? P.horizon : P.goldPale);
    g.rect(ox + 9, oy + 8, Math.max(1, len - 2), 1, P.brass);
    if (env.stage === 1 && k > 0.4) g.rect(ox + 19, oy + 8, 1, 1, P.goldPale);
  };
  a.glow = (g: Gfx, x: number, y: number, env: PropEnv) => {
    const n = env.grade.night;
    const k = env.stage === 0 ? Math.sin(((env.t % 2000) / 2000) * Math.PI * 2) * 0.5 + 0.5 : 0.3;
    screenPool(g, x + a.ox + 16, y + a.oy + 8, 18, 7, P.sky, 0.1 + k * 0.06 + n * 0.12);
    // the hood's two little lamps
    g.rect(x + a.ox + 12, y + a.oy - 20, 2, 1, P.horizon, 0.8);
    g.rect(x + a.ox + 20, y + a.oy - 20, 2, 1, P.horizon, 0.8);
  };
  return a;
});

// ---------------------------------------------------------------- chest freezer (7–8,2) with boxes on it

registerProp('in_mr_freezer', () =>
  prop(32, 34, (p) => {
    // body
    p.rect(0, 12, 32, 22, P.white);
    p.hline(0, 31, 12, P.glint);
    p.vline(0, 12, 33, P.white);
    p.vline(31, 13, 33, P.concrete);
    // sliding glass lids with frozen packs inside
    p.rect(1, 13, 30, 8, P.steel);
    p.rect(2, 14, 13, 6, P.navy);
    p.rect(16, 14, 13, 6, P.navy);
    for (const [bx, by, c] of [[3, 15, P.blue], [7, 16, P.white], [11, 15, P.aqua], [17, 16, P.white], [21, 15, P.peach], [25, 16, P.blue]] as const) {
      p.rect(bx, by, 3, 3, c);
      p.set(bx, by, lt(c));
    }
    p.hline(2, 28, 14, P.aqua);
    p.set(3, 19, P.white);
    p.set(27, 18, P.white);
    p.vline(15, 13, 20, P.concrete);
    // front: 冷凍 label, a vent, the green power lamp
    p.rect(3, 23, 9, 4, P.aqua);
    p.hline(4, 10, 24, P.navy);
    p.hline(4, 8, 25, P.navy);
    for (let x = 18; x < 29; x += 2) p.vline(x, 28, 31, P.steel);
    p.set(29, 23, P.leafYoung);
    p.rect(1, 32, 30, 2, P.charcoal);
    // cardboard boxes stacked on the lid (right)
    p.rect(17, 2, 13, 11, P.woodLt);
    p.rect(17, 0, 13, 2, P.goldPale);
    p.hline(17, 29, 2, P.brass);
    p.vline(29, 2, 12, P.brassOld);
    p.rect(22, 0, 2, 5, P.paperGrid);
    p.rect(18, 6, 5, 2, P.red);
    p.rect(19, 9, 9, 4, P.woodLt);
    printLines(p, 20, 10, 7, 2, P.wood, 3);
    p.rect(3, 8, 10, 5, P.woodLt);
    p.rect(3, 7, 10, 1, P.goldPale);
    p.vline(12, 8, 12, P.brassOld);
    p.rect(7, 7, 2, 3, P.paperGrid);
  }, { cx: 16, base: 16, contact: 0, shadow: 0 }),
);

// ---------------------------------------------------------------- the showcase (1–6,4)

registerProp('in_mr_showcase', () => {
  const p = pc(96, 28);
  // glass top (we look down through it at the trays)
  p.rect(0, 0, 96, 16, P.steel);
  p.rect(1, 1, 94, 14, P.shadeDeep);
  // interior: white enamel floor and a warm tube at the back
  p.rect(2, 2, 92, 12, P.concreteLt);
  p.hline(2, 93, 2, P.goldPale);
  // trays: meat, mince, ham, sausages, karaage — and the empty croquette tray
  const trays: [number, string][] = [
    [3, 'loin'], [15, 'mince'], [27, 'ham'], [39, 'sausage'], [51, 'karaage'], [64, 'empty'], [78, 'loin2'],
  ];
  /** The green plastic grass (バラン) that divides the trays: a zigzag strip. */
  const baran = (bx: number) => {
    for (let j = 5; j <= 10; j++) {
      p.set(bx + (j % 2), j, P.leafDeep);
      p.set(bx + 1 - (j % 2), j, P.leaf);
    }
    p.set(bx, 4, P.leafYoung);
  };
  for (const [tx, kind] of trays) {
    const w = kind === 'empty' ? 13 : 11;
    p.rect(tx, 4, w, 8, P.white);
    p.hline(tx, tx + w - 1, 11, P.concrete);
    p.vline(tx + w - 1, 4, 11, P.concrete);
    const ix = tx + 1;
    if (kind !== 'empty') baran(tx + w - 3);
    switch (kind) {
      case 'loin':
      case 'loin2':
        // three slices: red lean, a white rim of fat, marbling, a wet glint
        for (let j = 0; j < 3; j++) {
          const c = kind === 'loin' ? P.red : P.crimson;
          p.rect(ix + j * 3 - (j > 0 ? 1 : 0), 5, 3, 6, c);
          p.vline(ix + j * 3 - (j > 0 ? 1 : 0), 5, 10, P.skin1);
          p.set(ix + j * 3 + 1 - (j > 0 ? 1 : 0), 7 + (j % 2), P.peach);
          p.set(ix + j * 3 + 1 - (j > 0 ? 1 : 0), 5, P.glint);
          p.set(ix + j * 3 + 2 - (j > 0 ? 1 : 0), 10, P.vermShade);
        }
        break;
      case 'mince':
        // a mound of mince: pink with darker specks, a lit top, a glint
        p.ellipse(ix + 3.5, 7.5, 4, 3, P.peach);
        p.hline(ix + 1, ix + 5, 5, P.skin2);
        for (let j = 0; j < 7; j++) p.set(ix + 1 + ((j * 5) % 6), 6 + ((j * 3) % 4), j % 2 ? P.sunShade : P.crimson);
        p.set(ix + 2, 5, P.glint);
        p.set(ix + 3, 5, P.skin1);
        break;
      case 'ham':
        // round slices of ham fanned out, each with a pale rim and a glint
        for (let j = 0; j < 3; j++) {
          p.ellipse(ix + 2 + j * 2.5, 7.5, 2, 2.4, P.crimson);
          p.set(ix + 1 + j * 2.5, 6, P.skin1);
          p.set(ix + 2 + j * 2.5, 9, P.sunShade);
        }
        p.set(ix + 6, 6, P.glint);
        break;
      case 'sausage':
        for (let j = 0; j < 3; j++) {
          p.rect(ix, 5 + j * 2, 7, 2, P.sunShade);
          p.hline(ix, ix + 6, 5 + j * 2, P.peach);
          p.set(ix, 5 + j * 2, P.maroon);
          p.set(ix + 2 + j, 5 + j * 2, P.glint);
        }
        break;
      case 'karaage':
        for (let j = 0; j < 5; j++) {
          const kx = ix + (j % 3) * 2 + (j > 2 ? 1 : 0);
          const ky = 5 + Math.floor(j / 3) * 3;
          p.rect(kx, ky, 3, 3, P.brassOld);
          p.set(kx, ky, P.goldPale);
          p.set(kx + 1, ky, P.brass);
          p.set(kx + 2, ky + 2, P.wood);
        }
        break;
      case 'empty':
        // the croquette tray, empty: bare white, a few crumbs, the grease
        // stain where they sat, and a white card with a big red 5 (5時から)
        p.rect(ix, 5, w - 3, 6, P.glint);
        p.hline(ix, ix + w - 4, 10, P.concreteLt);
        for (const [cx, cy] of [[ix + 1, 9], [ix + 3, 10], [ix + 8, 9], [ix + 2, 6]] as const) p.set(cx, cy, P.brass);
        p.set(ix + 9, 7, P.goldPale);
        p.rect(ix + 4, 3, 7, 7, P.white);
        p.hline(ix + 4, ix + 10, 9, P.concrete);
        p.vline(ix + 10, 3, 9, P.concreteLt);
        // the hand-written 5
        p.hline(ix + 6, ix + 9, 4, P.verm);
        p.vline(ix + 6, 4, 6, P.verm);
        p.hline(ix + 6, ix + 8, 6, P.verm);
        p.vline(ix + 9, 6, 7, P.verm);
        p.hline(ix + 6, ix + 8, 8, P.verm);
        break;
    }
  }
  // the front glass: lit edge, two diagonal glints
  p.hline(1, 94, 13, P.aqua);
  p.hline(1, 94, 14, P.steel);
  for (const gx of [8, 44, 70]) {
    p.line(gx, 13, gx + 3, 10, P.white);
  }
  // the ledger (ツケ) with its string, on the glass top at the east end
  p.rect(84, 2, 9, 7, P.navy);
  p.rect(85, 2, 7, 6, P.paper);
  p.vline(85, 2, 7, P.navy);
  printLines(p, 87, 3, 4, 2, P.ink, 7);
  p.hline(87, 90, 6, P.steel);
  p.line(92, 7, 94, 10, P.verm);
  // stainless lip, white enamel front with a red stripe and the shop mark
  p.rect(0, 16, 96, 2, P.concrete);
  p.hline(0, 95, 16, P.white);
  p.rect(0, 18, 96, 8, P.white);
  p.hline(0, 95, 25, P.red);
  for (const mx of [20, 68]) {
    p.ellipse(mx + 3.5, 23.5, 3, 3, P.verm);
    p.ellipse(mx + 3.5, 23.5, 2, 2, P.white);
    p.set(mx + 3, 23, P.verm);
    p.set(mx + 4, 24, P.verm);
  }
  fontTextSmall(p, 'マルヤマ', 32, 18, P.verm, 1);
  p.rect(0, 26, 96, 2, P.charcoal);
  finish(p, { soft: true });
  const img = p.toCanvas();
  const a = stand(img, { cx: 48, base: 16, shadow: 0, contact: 0 });
  a.light = (g: Gfx, x: number, y: number, env: PropEnv) => {
    const n = env.grade.night;
    lightPool(g, x + a.ox + 48, y + a.oy + 20, 56, 14, P.goldPale, 0.05 + n * 0.22);
  };
  a.glow = (g: Gfx, x: number, y: number, env: PropEnv) => {
    // the case's warm tube and the glow on the trays
    const n = env.grade.night;
    g.rect(x + a.ox + 3, y + a.oy + 2, 90, 1, P.glint, 0.55 + n * 0.3);
    g.rect(x + a.ox + 2, y + a.oy + 3, 92, 10, P.goldPale, 0.07 + n * 0.08);
  };
  return a;
});

// ---------------------------------------------------------------- register + beckoning cat (7,4), scale (8,4)

function cabinet(p: PixelCanvas, y: number): void {
  // continues the showcase's front: steel lip, white enamel, red stripe
  p.rect(0, y, 16, 2, P.concrete);
  p.hline(0, 15, y, P.white);
  p.rect(0, y + 2, 16, 8, P.white);
  p.hline(0, 15, y + 9, P.red);
  p.rect(0, y + 10, 16, 2, P.charcoal);
}

const REGISTER = mkFrames(2, 16, 30, (p, k) => {
  cabinet(p, 18);
  p.rect(0, 15, 16, 3, P.concreteLt);
  p.hline(0, 15, 15, P.white);
  // old register: cream body, rows of keys, the number window
  p.rect(6, 3, 10, 12, P.paperGrid);
  p.hline(6, 15, 3, P.paper);
  p.vline(15, 4, 14, P.woodLt);
  p.rect(7, 4, 7, 3, P.charcoal);
  tiny(p, '80', 8, 4, P.leafYoung, undefined, 0);
  for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) p.set(7 + c * 2, 8 + r * 2, r === 2 && c === 3 ? P.red : P.white);
  p.rect(6, 14, 10, 1, P.woodLt);
  // manekineko: white, red collar, gold bell — the left paw beckons (2 frames)
  p.ellipse(3, 11.5, 3, 3.5, P.white);
  p.rect(1, 5, 5, 4, P.white);
  p.set(1, 4, P.white);
  p.set(5, 4, P.white);
  p.set(1, 5, P.crimson);
  p.set(5, 5, P.crimson);
  p.set(2, 6, P.ink);
  p.set(4, 6, P.ink);
  p.set(3, 7, P.crimson);
  p.hline(1, 5, 9, P.red);
  p.set(3, 10, P.gold);
  // beckoning paw (screen left = the cat's left): up / down
  if (k === 0) {
    p.rect(0, 3, 2, 3, P.white);
    p.set(0, 3, P.crimson);
  } else {
    p.rect(0, 5, 2, 2, P.white);
    p.set(0, 5, P.crimson);
  }
  p.set(4, 12, P.gold);
  p.hline(0, 6, 14, P.concrete);
}, (p) => finish(p, { soft: true }));

registerProp('in_mr_register', () => {
  const a = stand(REGISTER[0], { base: 16, shadow: 0, contact: 0 });
  a.img = (env) => REGISTER[Math.floor((env.t + 300) / 520) % 2];
  return a;
});

const SCALE = mkFrames(5, 16, 28, (p, k) => {
  cabinet(p, 16);
  p.rect(0, 13, 16, 3, P.concreteLt);
  p.hline(0, 15, 13, P.white);
  // spring scale: body, round dial, the pan on top
  p.rect(3, 6, 11, 7, P.white);
  p.vline(13, 6, 12, P.concrete);
  p.ellipse(8.5, 9, 3.5, 3.5, P.concreteLt);
  p.ring(8.5, 9, 3.5, 3.5, P.steel);
  p.set(8, 6, P.verm);
  // needle: frames 0–3 wobble around zero, 4 = 17
  const ang = k === 4 ? 1.9 : [-0.25, 0, 0.25, 0][k];
  p.line(8, 9, Math.round(8 + Math.sin(ang) * 3), Math.round(9 - Math.cos(ang) * 3), P.red);
  p.rect(2, 3, 13, 2, P.steel);
  p.hline(2, 14, 3, P.white);
  p.hline(3, 13, 5, P.asphalt);
  p.vline(8, 5, 5, P.asphalt);
}, (p) => finish(p, { soft: true }));

registerProp('in_mr_scale', () => {
  const a = stand(SCALE[0], { base: 16, shadow: 0, contact: 0 });
  a.img = (env) => (env.stage >= 1 && env.stage < 3 ? SCALE[4] : SCALE[Math.floor(env.mt / 260) % 4]);
  return a;
});

// ---------------------------------------------------------------- blackboard by the entrance (1,5)

registerProp('in_mr_board', () =>
  prop(16, 26, (p) => {
    // A-frame legs behind
    p.line(2, 25, 4, 2, P.wood);
    p.line(13, 25, 11, 2, P.wood);
    // board with frame
    p.rect(1, 2, 14, 18, P.wood);
    p.hline(1, 14, 2, P.woodLt);
    p.rect(2, 3, 12, 16, P.leafShade);
    // chalk: a line of 『本日のおすすめ』 (just strokes), a croquette drawn in
    // yellow chalk with crumbs, its price 80 in pink, underlined in red
    p.hline(3, 5, 5, P.concreteLt);
    p.hline(7, 8, 5, P.concreteLt);
    p.hline(10, 12, 5, P.concreteLt);
    p.set(4, 4, P.concreteLt);
    p.set(11, 4, P.concreteLt);
    p.ellipse(7.5, 10, 4, 2.5, P.goldPale);
    p.ellipse(7, 9.5, 2.5, 1.5, P.gold);
    p.set(5, 9, P.white);
    for (const [cx2, cy2] of [[4, 11], [9, 8], [10, 11], [6, 12]] as const) p.set(cx2, cy2, P.brass);
    p.hline(5, 10, 12, P.brassOld);
    tiny(p, '80', 5, 13, P.peach, undefined, 1);
    p.hline(3, 12, 18, P.vermLt);
    p.hline(1, 14, 20, P.woodDark);
    p.vline(3, 20, 25, P.woodDark);
    p.vline(12, 20, 25, P.woodDark);
  }, { base: 16, contact: 12, shadow: 0 }),
);

// ---------------------------------------------------------------- delivery crates by the door (1,6)

registerProp('in_mr_crates', () =>
  prop(16, 26, (p) => {
    // two blue plastic crates (通い箱) stacked, 『マルヤマ』 in marker on the
    // front, the top one holding folded paper bags and a roll of twine
    const crate = (y: number, h: number) => {
      p.rect(1, y, 14, h, P.blue);
      p.hline(1, 14, y, P.aqua);
      p.hline(1, 14, y + h - 1, P.navy);
      p.vline(14, y + 1, y + h - 1, P.navy);
      // grip hole and the ribbed sides
      p.rect(5, y + 2, 6, 2, P.navy);
      p.hline(6, 9, y + 2, P.ink);
      for (let yy = y + 5; yy < y + h - 1; yy += 2) p.hline(2, 13, yy, P.navy);
    };
    crate(14, 11);
    crate(5, 9);
    // marker lettering (a scrawl) on the lower crate's front
    p.hline(3, 6, 20, P.white);
    p.set(8, 20, P.white);
    p.hline(9, 11, 20, P.white);
    p.set(4, 21, P.white);
    // paper bags and twine in the top crate
    p.rect(2, 3, 9, 3, P.paper);
    p.hline(2, 10, 3, P.white);
    p.hline(2, 10, 5, P.paperGrid);
    p.rect(11, 2, 3, 3, P.woodLt);
    p.set(12, 3, P.brassOld);
    p.hline(1, 14, 25, P.charcoal);
  }, { base: 16, contact: 14, shadow: 0 }),
);

// ---------------------------------------------------------------- the waiting stool (8,6)

registerProp('in_mr_stool', () => {
  const build = (paper: boolean) => {
    const p = pc(16, 20);
    // a round red vinyl stool on chrome legs, where the first of the five o'clock queue sits
    p.ellipse(8, 7, 6, 2.5, P.red);
    p.hline(3, 12, 5, P.vermLt);
    p.hline(4, 12, 9, P.vermShade);
    p.set(5, 6, P.white);
    p.rect(3, 9, 11, 2, P.steel);
    p.hline(3, 13, 9, P.concreteLt);
    for (const lx of [4, 12]) {
      p.vline(lx, 11, 18, P.steel);
      p.set(lx, 19, P.charcoal);
    }
    p.vline(8, 11, 17, P.asphalt);
    p.hline(5, 11, 15, P.steel);
    if (paper) {
      // stage 1+: today's evening paper left folded on the seat (the date stays today)
      p.rect(4, 3, 8, 4, P.white);
      p.hline(4, 11, 3, P.glint);
      p.hline(5, 10, 5, P.steel);
      p.set(10, 4, P.verm);
      p.hline(4, 11, 7, P.concrete);
    }
    finish(p, { soft: true });
    return p.toCanvas();
  };
  const a = stand(build(false), { base: 16, contact: 10, shadow: 0 });
  const withPaper = build(true);
  const plain = a.img;
  a.img = (env: PropEnv) => (env.stage >= 1 && env.stage < 3 ? withPaper : plain(env));
  return a;
});

// ---------------------------------------------------------------- bare bulbs (foreground) with warm light

registerProp('in_mr_bulb', (opts) => {
  const v = Number(opts.v ?? 0);
  // three swing positions: the cord hangs from a fixed point, the bulb swings
  // 1px either way in the draught from the door (slow; still in stage 1)
  const frames = [-1, 0, 1].map((k) => {
    const p = pc(7, 22);
    p.line(3, 0, 3 + k, 13, P.charcoal);
    p.rect(2 + k, 13, 3, 2, P.asphalt);
    p.ellipse(3.5 + k, 17.5, 2.5, 3, P.goldPale);
    p.rect(3 + k, 16, 1, 2, P.glint);
    return p.toCanvas();
  });
  const swing = (env: PropEnv) => {
    const s = Math.sin(env.mt / (1500 + v * 230) + v * 2);
    return s < -0.55 ? -1 : s > 0.55 ? 1 : 0;
  };
  const oy = -30 - (v ? 2 : 0);
  return {
    ox: 5,
    oy,
    w: 7,
    h: 22,
    foot: 0,
    img: () => null,
    fg: [{ ox: 5, oy, img: (env: PropEnv) => frames[swing(env) + 1] }],
    glowFg: true,
    glow(g: Gfx, x: number, y: number, env: PropEnv) {
      const n = env.grade.night;
      const k = swing(env);
      screenPool(g, x + 8 + k, y + oy + 17, 10, 10, P.sky, 0.38 + n * 0.25);
      g.rect(x + 8 + k, y + oy + 16, 1, 2, P.glint, 0.9);
    },
    light(g: Gfx, x: number, y: number, env: PropEnv) {
      // the bare bulb lights the shop: a warm pool (strong at night)
      const n = env.grade.night;
      lightPool(g, x + 8, y + 26, 46, 34, P.sky, 0.14 + n * 0.62);
    },
  } as PropArt;
});

// ---------------------------------------------------------------- the noren's back, seen through the glass door (4,7)

const NOREN = mkFrames(3, 16, 8, (p, k) => {
  // three red panels (the back side is a shade darker), a white ring showing
  // through reversed, the hem swaying (frames 0–2)
  for (let i = 0; i < 3; i++) {
    const x = 1 + i * 5;
    const sway = [0, 1, 0][(k + i) % 3];
    p.rect(x, 0, 4, 7 + sway, P.vermShade);
    p.vline(x, 0, 6 + sway, P.verm);
    p.hline(x, x + 3, 6 + sway, P.maroon);
  }
  p.hline(0, 15, 0, P.woodDark);
  p.ring(8, 3.5, 2, 2, P.concreteLt);
});
registerProp('in_mr_noren', () => ({
  ox: 0,
  oy: 2,
  w: 16,
  h: 8,
  foot: 0,
  flat: true,
  img: (env: PropEnv) => NOREN[env.stage === 1 ? 0 : [0, 1, 2, 1][Math.floor(env.mt / 600) % 4]],
}));
