// 焼きそばのたかし interior (30_level_art 4.3, 10×8: a second row of floor for
// the customers, review round 1). A narrow yakisoba shop: white tiled walls
// under cream plaster, the 『焼きそばの 焼き方』 poster, a stainless back bench
// with the pot of house sauce (its surface quietly glows and pulses) and a
// can of sauce, the long teppan counter in front of たかし — a black iron
// griddle, the spatulas laid on it, the sauce bottle, the 青のり shaker and
// the 「5時から」 card — the old register with a beckoning cat, the noodle
// scale, a kamidana shelf, wooden menu plaques, two bare bulbs; by the door
// the delivery crates and the waiting stool for the five o'clock queue.
// Outside: the arcade (iexterior.ts).

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
import { fontSmallWidth, fontTextSmall, printLines, tiny } from './text';
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
  // ---- floor details: a sauce-and-grease sheen by the back bench, a ribbed rubber mat, a drain grate
  for (let y = 48; y < 64; y++)
    for (let x = 32; x < 64; x++) {
      if (valueNoise(x / 6, y / 4, 74) > 0.7) blend(p, x, y, P.brassOld, 0.35);
    }
  // rubber mat in front of the back bench (row 3, x 2–3)
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
  // a dropped paper napkin, a bottle cap by the crates
  p.rect(98, 102, 4, 2, P.paper);
  p.set(101, 102, P.paperGrid);
  p.set(99, 104, P.paperGrid);
  p.rect(33, 106, 2, 2, P.gold);
  p.set(33, 106, P.goldPale);
  // ---- north wall
  // the how-to poster (1–2): 『焼きそばの 焼き方』
  howtoPoster(p, 17, 4);
  // range hood over the back bench + stainless backsplash with sauce streaks
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
  // a hook rail above the backsplash: two spare spatulas (ヘラ) and the oil brush
  p.hline(36, 62, 16, P.steel);
  for (const hx of [39, 44]) {
    p.vline(hx + 1, 16, 19, P.wood);
    p.set(hx + 1, 17, P.woodLt);
    p.rect(hx, 20, 3, 3, P.steel);
    p.hline(hx, hx + 2, 20, P.concreteLt);
    p.hline(hx, hx + 2, 22, P.asphalt);
  }
  p.vline(59, 16, 20, P.wood);
  p.rect(58, 21, 3, 2, P.brassOld);
  p.hline(58, 60, 23, P.goldPale);
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
  // the yakisoba plaque gets a yellow sticky note 「5時」 hanging askew
  p.rect(90, 17, 5, 4, P.gold);
  p.set(90, 17, P.goldPale);
  p.hline(91, 93, 19, P.vermShade);
  p.set(94, 20, P.brass);
  // kamidana: a pale-cypress shrine on a shelf, sakaki in two vases, paper shide
  kamidana(p, 112, 1);
  // business licence in a frame and the sauce maker's calendar
  {
    const [ix, iy, iw, ih] = framed(p, 113, 16, 10, 9, P.woodDark);
    p.rect(ix, iy, iw, ih, P.white);
    printLines(p, ix + 1, iy + 1, iw - 2, 3, P.steel, 61);
    p.set(ix + iw - 2, iy + ih - 2, P.verm);
  }
  sauceCalendar(p, 126, 14);
  // behind the counter: a white wall strip with a plug socket
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
  // くま吉 next door to the east, the hedge and the road up the slope with its
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
      // the burner under the sauce pot lights the mat a little
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

/**
 * 『焼きそばの 焼き方』 22×21: a red header, three steps down the left —
 * the steamed noodles, the cabbage, the sauce bottle pouring — each with its
 * printed line, and the last line twice as thick in red
 * (『ソースは 最後に 一気に！』).
 */
function howtoPoster(p: PixelCanvas, x: number, y: number): void {
  const W = 22;
  const H = 21;
  p.rect(x, y, W, H, P.paper);
  p.hline(x, x + W - 1, y + H - 1, P.paperGrid);
  p.vline(x + W - 1, y, y + H - 1, P.paperGrid);
  p.rect(x + 1, y + 1, W - 2, 3, P.red);
  printLines(p, x + 3, y + 2, 16, 1, P.white, 5);
  // 1: the noodles, a pale wavy bundle
  const sx = x + 2;
  for (let r = 0; r < 3; r++) for (let c = 0; c < 5; c++) if ((c + r) % 2 === 0) p.set(sx + c, y + 5 + r, r === 1 ? P.brass : P.goldPale);
  printLines(p, x + 9, y + 5, 10, 1, P.steel, 21);
  // 2: the cabbage, a green leaf with a pale rib
  p.ellipse(sx + 2, y + 10.5, 2.5, 1.8, P.leafYoung);
  p.hline(sx + 1, sx + 3, y + 10, P.leafLt);
  p.set(sx + 4, y + 11, P.leaf);
  printLines(p, x + 9, y + 10, 10, 1, P.steel, 22);
  // 3: the sauce bottle tipped over a heap, the brown stream between
  p.rect(sx, y + 13, 2, 3, P.woodDark);
  p.set(sx, y + 13, P.verm);
  p.set(sx + 2, y + 15, P.wood);
  p.set(sx + 3, y + 16, P.wood);
  p.hline(sx + 2, sx + 5, y + 17, P.brassOld);
  p.set(sx + 3, y + 17, P.woodDark);
  printLines(p, x + 9, y + 14, 10, 1, P.steel, 23);
  // the last line, big: 『ソースは 最後に 一気に！』
  p.rect(x + 9, y + 17, 9, 2, P.red);
  p.vline(x + 19, y + 16, y + 17, P.red);
  p.set(x + 19, y + 19, P.red);
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

/** The sauce maker's calendar: a photo of a plate of yakisoba on a warm ground, the name band, the dates. */
function sauceCalendar(p: PixelCanvas, x: number, y: number): void {
  p.vline(x + 7, y - 2, y - 1, P.charcoal);
  p.rect(x, y, 15, 14, P.white);
  // photo: a warm orange ground, a white plate, the brown heap with 青のり and 紅しょうが
  p.rect(x + 1, y + 1, 13, 6, P.sky);
  p.hline(x + 1, x + 13, y + 1, P.horizon);
  p.ellipse(x + 7, y + 4.5, 5, 2, P.white);
  p.ellipse(x + 7, y + 4, 3.5, 1.6, P.brassOld);
  p.hline(x + 5, x + 9, y + 3, P.brass);
  p.set(x + 6, y + 4, P.leaf);
  p.set(x + 8, y + 3, P.leafShade);
  p.set(x + 9, y + 4, P.verm);
  // name band and the date grid
  p.rect(x + 1, y + 7, 13, 1, P.woodDark);
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
    // a tray of steamed noodles in six bundles, waiting for five o'clock
    p.rect(1, 3, 9, 5, P.steel);
    p.rect(2, 3, 7, 4, P.concrete);
    for (let k = 0; k < 6; k++) {
      const cx = 2 + (k % 3) * 2 + (k >= 3 ? 1 : 0);
      const cy = 3 + Math.floor(k / 3) * 2;
      p.rect(cx, cy, 2, 1, P.goldPale);
      p.set(cx + ((k + 1) % 2), cy, P.brass);
    }
    // a bowl heaped with chopped cabbage, a smaller one of 紅しょうが
    p.ellipse(12.5, 5, 2.5, 1.5, P.white);
    p.hline(11, 14, 4, P.leafLt);
    p.set(12, 3, P.leafYoung);
    p.set(13, 4, P.leaf);
    p.ellipse(12.5, 7, 2, 1, P.concreteLt);
    p.hline(12, 13, 7, P.verm);
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

// ---------------------------------------------------------------- the back bench (2–3,2): the sauce pot and the can

/** Where the pot's sauce shows (image px): the dark surface inside the rim. */
const POT = { x0: 4, x1: 13, y: 3 };
registerProp('in_mr_fryer', () => {
  const p = pc(32, 24);
  // body (stainless) and its top
  p.rect(0, 4, 32, 20, P.concrete);
  p.hline(0, 31, 4, P.white);
  p.vline(0, 4, 23, P.concreteLt);
  p.vline(31, 5, 23, P.asphalt);
  p.rect(1, 5, 30, 7, P.concreteLt);
  p.hline(1, 30, 11, P.steel);
  // the house sauce (つぎたし) in a stainless stock pot, a ladle leaning in it
  p.rect(2, 4, 14, 8, P.concrete);
  p.vline(2, 4, 11, P.concreteLt);
  p.vline(3, 5, 10, P.white);
  p.vline(15, 4, 11, P.asphalt);
  p.hline(2, 15, 11, P.steel);
  p.set(1, 6, P.steel);
  p.set(16, 6, P.asphalt);
  p.ellipse(8.5, 3, 7, 2, P.steel);
  p.hline(3, 14, 1, P.concreteLt);
  p.ellipse(8.5, 3, 5.6, 1.2, '#5A3A22');
  p.hline(POT.x0, POT.x1, 2, '#8A5220');
  p.line(12, 3, 15, 0, P.steel);
  p.set(15, 0, P.concreteLt);
  // an 18-litre can of sauce: silver, the brown label with its red stripe, the red cap
  p.rect(19, 0, 10, 12, P.concreteLt);
  p.hline(19, 28, 0, P.white);
  p.vline(28, 1, 11, P.steel);
  p.rect(26, 0, 2, 1, P.red);
  p.rect(19, 4, 10, 5, P.woodDark);
  p.hline(19, 28, 5, P.red);
  p.hline(21, 26, 7, P.paper);
  p.vline(28, 4, 8, P.maroon);
  p.hline(19, 28, 11, P.steel);
  // front: two cupboard doors with bar handles, the plinth
  p.rect(1, 13, 30, 1, P.asphalt);
  for (const dx of [2, 17]) {
    p.rect(dx, 14, 13, 7, P.concreteLt);
    p.hline(dx, dx + 12, 14, P.white);
    p.vline(dx + 12, 14, 20, P.steel);
  }
  p.hline(12, 13, 17, P.charcoal);
  p.hline(18, 19, 17, P.charcoal);
  p.hline(1, 30, 21, P.steel);
  p.rect(1, 22, 30, 2, P.charcoal);
  finish(p, { soft: true });
  const img = p.toCanvas();
  const a = stand(img, { cx: 16, base: 16, shadow: 0, contact: 0 });
  a.over = (g: Gfx, x: number, y: number, env: PropEnv) => {
    const ox = x + a.ox;
    const oy = y + a.oy;
    const t = env.t;
    if (env.stage >= 3) return;
    if (env.stage === 2) {
      // the sunset shows in the sauce (under a roof)
      g.rect(ox + POT.x0 + 1, oy + POT.y, 8, 1, P.sun);
      g.rect(ox + POT.x0 + 3, oy + POT.y, 3, 1, P.horizon);
      return;
    }
    // a glossy highlight that slowly pulses (2 s); stage 1: now and then a small sigh (ぷく)
    let k: number;
    if (env.stage === 1) {
      const u = (t % 5200) / 5200;
      k = u < 0.08 ? Math.sin((u / 0.08) * Math.PI) : 0;
    } else k = Math.sin(((t % 2000) / 2000) * Math.PI * 2) * 0.5 + 0.5;
    const len = 1 + Math.round(k * 3);
    g.rect(ox + POT.x0 + 2, oy + POT.y, len, 1, k > 0.55 ? P.goldPale : P.brassOld);
    if (env.stage === 1 && k > 0.4) g.rect(ox + POT.x0 + 7, oy + POT.y, 1, 1, P.brass);
  };
  a.glow = (g: Gfx, x: number, y: number, env: PropEnv) => {
    const n = env.grade.night;
    screenPool(g, x + a.ox + 9, y + a.oy + 4, 10, 4, P.sky, 0.06 + n * 0.1);
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

// ---------------------------------------------------------------- the teppan counter (1–6,4)

/** The griddle on the counter (image px): the plate, and its front gutter row. */
const PLATE = { x0: 3, x1: 68, y0: 2, y1: 11 };

/** The shop mark on the counter front: a peach (モモ), 7×7. */
function peachMark(p: PixelCanvas, x: number, y: number): void {
  p.ellipse(x + 3, y + 4, 3, 2.6, P.skin2);
  p.ellipse(x + 4, y + 4.5, 1.6, 1.6, P.crimson);
  p.set(x + 2, y + 3, P.skin1);
  p.vline(x + 3, y + 2, y + 5, P.sunShade);
  p.set(x + 3, y + 1, P.woodDark);
  p.set(x + 4, y + 1, P.leaf);
  p.set(x + 5, y + 0, P.leafYoung);
}

registerProp('in_mr_showcase', () => {
  const build = (tools: boolean) => {
    const p = pc(96, 28);
    // the stainless counter top
    p.rect(0, 0, 96, 16, P.concreteLt);
    p.hline(0, 95, 0, P.white);
    p.hline(0, 95, 15, P.steel);
    // the griddle: a black iron plate, years of seasoning in it, a low
    // splash guard at the back and the grease gutter along the front
    const { x0, x1, y0, y1 } = PLATE;
    p.hline(x0 - 1, x1 + 1, y0 - 1, P.steel);
    p.rect(x0, y0, x1 - x0 + 1, y1 - y0 + 1, P.charcoal);
    for (let y = y0; y <= y1; y++)
      for (let x = x0; x <= x1; x++) {
        const v = valueNoise(x / 7, y / 2, 83);
        if (v > 0.74) p.set(x, y, P.ink);
        else if (v < 0.2 && ihash(x, y, 84) % 3 === 0) p.set(x, y, P.asphalt);
      }
    p.vline(x0, y0, y1, P.asphalt);
    p.hline(x0, x1, y0, P.asphalt);
    p.hline(x0 - 1, x1 + 1, y1 + 1, P.steel);
    p.hline(x0 - 1, x1 + 1, y1 + 2, P.asphalt);
    p.set(x1 + 1, y1 + 2, P.ink);
    if (tools) {
      // the two spatulas (ヘラ) laid on the right of the plate, handles to the back
      for (const [bx, by] of [[54, 6], [58, 8]] as const) {
        p.rect(bx, by, 4, 3, P.steel);
        p.hline(bx, bx + 3, by, P.concreteLt);
        p.set(bx, by + 2, P.asphalt);
        p.line(bx + 4, by, bx + 8, by - 3, P.wood);
        p.set(bx + 8, by - 3, P.woodLt);
      }
    }
    // the ledge on the right: the sauce bottle, the 青のり shaker, the 「5時から」 card
    p.rect(71, 3, 3, 7, P.woodDark);
    p.vline(71, 3, 9, P.wood);
    p.rect(71, 5, 3, 2, P.sun);
    p.set(72, 1, P.red);
    p.rect(71, 2, 3, 1, P.red);
    p.rect(75, 5, 3, 5, P.leafShade);
    p.vline(75, 5, 9, P.leaf);
    p.hline(75, 77, 7, P.paper);
    p.rect(75, 4, 3, 1, P.concreteLt);
    p.hline(75, 77, 3, P.white);
    // the card: white, a big red hand-written 5
    p.rect(78, 2, 6, 8, P.white);
    p.hline(78, 83, 9, P.concrete);
    p.vline(83, 2, 9, P.concreteLt);
    p.hline(79, 82, 3, P.verm);
    p.vline(79, 3, 5, P.verm);
    p.hline(79, 81, 5, P.verm);
    p.vline(82, 5, 7, P.verm);
    p.hline(79, 81, 8, P.verm);
    // the ledger (ツケ) with its string, at the east end
    p.rect(84, 2, 9, 7, P.navy);
    p.rect(85, 2, 7, 6, P.paper);
    p.vline(85, 2, 7, P.navy);
    printLines(p, 87, 3, 4, 2, P.ink, 7);
    p.hline(87, 90, 6, P.steel);
    p.line(92, 7, 94, 10, P.verm);
    // stainless lip, white enamel front with a red stripe, the peach marks and たかし
    p.rect(0, 16, 96, 2, P.concrete);
    p.hline(0, 95, 16, P.white);
    p.rect(0, 18, 96, 8, P.white);
    p.hline(0, 95, 25, P.red);
    for (const mx of [20, 68]) peachMark(p, mx, 18);
    const tw = fontSmallWidth('たかし');
    fontTextSmall(p, 'たかし', 48 - Math.floor(tw / 2), 18, P.verm, 1);
    p.rect(0, 26, 96, 2, P.charcoal);
    finish(p, { soft: true });
    return p.toCanvas();
  };
  const a = stand(build(true), { cx: 48, base: 16, shadow: 0, contact: 0 });
  const bare = build(false);
  const withTools = a.img;
  // the ending: the spatulas are in たかし's hands (events/ending.ts)
  a.img = (env: PropEnv) => (env.stage >= 3 ? bare : withTools(env));
  a.over = (g: Gfx, x: number, y: number, env: PropEnv) => {
    const ox = x + a.ox;
    const oy = y + a.oy;
    const t = env.t;
    if (env.stage >= 3) return;
    if (env.stage === 2) {
      // the sunset shows in the iron (under a roof)
      g.rect(ox + 22, oy + 5, 16, 1, P.sun, 0.55);
      g.rect(ox + 26, oy + 6, 10, 1, P.crimson, 0.45);
      g.rect(ox + 28, oy + 5, 4, 1, P.horizon, 0.6);
      return;
    }
    // the plate heating: a dull sheen that slowly swells and fades (2.4 s);
    // stage 1 it hangs, still
    const k = env.stage === 1 ? 0.35 : Math.sin(((t % 2400) / 2400) * Math.PI * 2) * 0.5 + 0.5;
    const len = 6 + Math.round(k * 10);
    g.rect(ox + 14, oy + 4, len, 1, P.asphalt, 0.5 + k * 0.4);
    g.rect(ox + 16, oy + 5, Math.max(2, len - 6), 1, P.steel, 0.25 + k * 0.3);
  };
  a.light = (g: Gfx, x: number, y: number, env: PropEnv) => {
    const n = env.grade.night;
    lightPool(g, x + a.ox + 48, y + a.oy + 20, 56, 14, P.goldPale, 0.05 + n * 0.22);
  };
  return a;
});

// ---------------------------------------------------------------- register + beckoning cat (7,4), scale (8,4)

function cabinet(p: PixelCanvas, y: number): void {
  // continues the counter's front: steel lip, white enamel, red stripe
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
    // chalk: a line of 『本日のおすすめ』 (just strokes), a plate of yakisoba
    // drawn in chalk — the white plate, the noodles in wavy yellow and brown,
    // green dots of 青のり — its price 80 in pink, underlined in red
    p.hline(3, 5, 5, P.concreteLt);
    p.hline(7, 8, 5, P.concreteLt);
    p.hline(10, 12, 5, P.concreteLt);
    p.set(4, 4, P.concreteLt);
    p.set(11, 4, P.concreteLt);
    p.ellipse(7.5, 11, 5, 1.6, P.concreteLt);
    for (let j = 0; j < 7; j++) {
      p.set(5 + j, 9 + (j % 2), j % 3 === 1 ? P.brass : P.goldPale);
      p.set(5 + j, 10 - (j % 2), P.goldPale);
    }
    p.set(6, 8, P.leafYoung);
    p.set(9, 8, P.leafYoung);
    p.set(8, 9, P.vermLt);
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
    // two blue plastic crates (通い箱) stacked, 『たかし』 in marker on the
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
