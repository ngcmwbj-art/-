// M2 フードコート (30_level_art 5.2, 20×13). Along the north wall: the ramen
// shop's shutter (『スープ切れ』 taped on, a red lantern gone pale), the
// kaitenyaki stall whose round iron plate keeps turning with a tiny key on
// it (fushigi_12), the lost-and-found counter with its stack of blank forms,
// the grey STAFF door. Six four-seat tables, each left differently (a high
// chair with a juice ring, the pager, a toppled cup, an umbrella on a chair,
// a child's cap), the pillar with the self-service water, the tray return.

import type { Gfx } from '../../engine/gfx';
import { PixelCanvas } from '../../engine/pixel';
import { getMapDef } from '../../world/maps';
import { fushigiDone } from '../../world/fushigi';
import { laneOf, mallTiles } from '../tiles/ifloor';
import { ihash } from '../tiles/noise';
import { P } from '../tiles/palette';
import { notice, paperStack, pc, prop } from './ifurn';
import { blend, depthShade, paintShell, shellProp } from './ishell';
import { castRight, dk, finish, lt } from './kit';
import { arrowSign, bannerScrap, fasciaText, mallGrade, mallLampLight, mallLamps, mallWall, posterGhost, shutter, skyPatch, type Lamp } from './mall_kit';
import { mkFrames, stand } from './pkit';
import { registerProp } from './registry';
import { fontTextSmall, printLines, scribble, tiny } from './text';
import type { PropArt, PropEnv } from './types';

const M2_LAMPS: Lamp[] = [
  { x: 72, y: 72 }, { x: 160, y: 80 }, { x: 250, y: 72 },
  { x: 72, y: 150, flicker: true }, { x: 160, y: 158 }, { x: 250, y: 150 },
];

// ---------------------------------------------------------------- shell

registerProp('mall_m2_shell', () => {
  const rows = getMapDef('map_mall_food')?.rows ?? [];
  const blocked = (tx: number, ty: number) => ty <= 3 || (ty === 5 || ty === 9) || (tx >= 11 && tx <= 12 && ty === 7) || (tx === 18 && ty === 10);
  const lane = laneOf([[19, 6.5], [12, 6.5], [6, 7], [2, 7], [6, 4], [15, 4]], 20);
  const tiles = mallTiles({ seed: 521, w: 20, h: 13, blocked, lane });
  const wall = mallWall(523);
  const sh = paintShell({ rows, floor: (x, y) => tiles(x, y), wall, trim: P.nightShade, base: P.steel, baseH: 3 });
  const p = sh.p;
  // ---- (2–5) ラーメン: fascia, pale red lantern, shutter with 『スープ切れ』
  fasciaText(p, 32, 3, 64, 14, P.red, 'ラーメン', P.white, P.vermShade);
  shutter(p, 34, 21, 60, 24);
  notice(p, 56, 27, 16, 11, { paper: P.paper, ink: P.verm, head: P.red, seed: 21, rows: 3 });
  // red lantern (akachochin) faded, hanging at the left
  p.vline(35, 17, 19, P.charcoal);
  p.ellipse(35.5, 24, 3, 4, P.peach);
  p.hline(33, 38, 20, P.charcoal);
  p.hline(33, 38, 28, P.charcoal);
  p.set(34, 22, P.crimson);
  p.set(34, 23, P.white);
  // ---- (6–7) a menu poster of bowls, a ghost of another
  {
    const x = 99;
    const y = 20;
    p.rect(x, y, 22, 16, P.paper);
    p.rect(x, y, 22, 3, P.sunDeep);
    for (let k = 0; k < 3; k++) {
      const bx = x + 2 + k * 7;
      p.ellipse(bx + 2.5, y + 8, 3, 2, k === 0 ? P.brass : k === 1 ? P.goldPale : P.sun);
      p.hline(bx, bx + 5, y + 10, P.white);
      p.rect(bx + 1, y + 12, 4, 2, P.red);
    }
    castRight(p, x, y, 22, 16, 2);
    p.set(x + 1, y, P.verm);
  }
  posterGhost(p, 101, 38, 14, 5);
  bannerScrap(p, 98, 4, 26, 11);
  // ---- (8–11) the kaitenyaki stall: the menu sign with its growing brackets, the back wall
  kaitenyakiSign(p, 128, 3);
  p.rect(129, 21, 62, 24, P.concrete);
  p.hline(129, 190, 21, P.concreteLt);
  for (const sy of [27, 36]) {
    p.hline(131, 188, sy, P.steel);
    p.hline(131, 188, sy + 1, P.asphalt);
  }
  // paper bags, a batter jug, the bean paste pot, a price card
  for (let k = 0; k < 4; k++) p.rect(133 + k * 4, 23, 3, 4, P.paper);
  p.rect(152, 22, 5, 5, P.white);
  p.rect(157, 23, 1, 2, P.white);
  p.rect(165, 30, 7, 6, P.charcoal);
  p.hline(165, 171, 30, P.asphalt);
  p.rect(166, 31, 5, 2, P.maroon);
  p.rect(176, 29, 10, 7, P.white);
  tiny(p, '80', 177, 30, P.verm);
  // ---- (13–16) lost-and-found counter: fascia, shelves of kept things through the window
  fasciaText(p, 208, 3, 64, 14, P.navy, '忘れ物', P.white, P.nightShade);
  p.rect(209, 21, 62, 24, P.woodLt);
  p.rect(211, 22, 58, 22, P.nightShade);
  for (const sy of [30, 38]) p.hline(211, 268, sy, P.woodDark);
  // umbrellas, a bag, a cap, boxes on the shelves
  for (let k = 0; k < 5; k++) p.vline(214 + k * 3, 23, 29, [P.aqua, P.navy, P.red, P.white, P.leaf][k]);
  p.rect(232, 24, 8, 6, P.maroon);
  p.rect(244, 26, 6, 4, P.gold);
  p.rect(254, 23, 10, 7, P.woodLt);
  p.rect(214, 32, 9, 6, P.paper);
  p.rect(226, 33, 7, 5, P.blue);
  p.rect(238, 31, 12, 7, P.woodLt);
  p.rect(254, 33, 8, 5, P.crimson);
  // ---- (17) the STAFF door (row 2 is the door itself; its sign above)
  p.rect(273, 18, 14, 6, P.white);
  tiny(p, 'STAFF', 273, 18, P.navy, undefined, 0);
  p.hline(273, 286, 23, P.red);
  castRight(p, 273, 18, 14, 6, 1);
  staffDoor(p, 272, 32);
  // ---- (18) fire hose cabinet
  p.rect(290, 24, 12, 16, P.verm);
  p.hline(290, 301, 24, P.vermLt);
  p.rect(292, 26, 8, 8, P.vermShade);
  p.ring(296, 30, 3, 3, P.white);
  p.set(296, 30, P.gold);
  castRight(p, 290, 24, 12, 16, 2);
  // ---- floor: spills, a straw, a flyer
  for (const [sx, sy] of [[62, 124], [226, 132]] as const) {
    for (let j = 0; j < 4; j++) for (let i = 0; i < 7; i++) if ((i - 3) ** 2 / 9 + (j - 1.5) ** 2 / 2.5 < 1) blend(p, sx + i, sy + j, P.brassOld, 0.45);
  }
  p.hline(180, 186, 150, P.red);
  p.hline(181, 185, 151, P.white);
  p.rect(96, 170, 9, 6, P.white);
  p.rect(96, 170, 9, 2, P.gold);
  // ---- the corridor to M1 (E, x19) fades into the dark
  for (let y = 6 * 16; y < 8 * 16; y++)
    for (let i = 0; i < 16; i++) {
      const x = 19 * 16 + i;
      if (i > 9 && ((x + y) & 1) === 0) blend(p, x, y, P.night, 0.5);
      if (i > 12) blend(p, x, y, P.night, 0.4);
    }
  const img = p.toCanvas();
  const W = img.width;
  return shellProp({
    img,
    over(g: Gfx, x: number, y: number, env: PropEnv) {
      depthShade(g, x + 16, y + 48, W - 32, 80, 0.14);
      mallLamps(g, x, y, M2_LAMPS, env, 202);
    },
    light(g: Gfx, x: number, y: number, env: PropEnv) {
      mallGrade(g, 'mall', env);
      mallLampLight(g, x, y, M2_LAMPS, env, 202);
    },
    glow(g: Gfx, x: number, y: number, env: PropEnv) {
      skyPatch(g, x + 98, y + 118, 46, 30, env);
    },
  });
});

/** 『回転焼き（今川焼き）（大判焼き）』: the name board with brackets taped on, one after another. */
function kaitenyakiSign(p: PixelCanvas, x: number, y: number): void {
  fasciaText(p, x, y, 64, 15, P.goldPale, '回転焼き', P.woodDark, P.brass);
  // two strips taped on under it, each a name in brackets: （今川焼き）（大判焼き）
  for (const [sx, sy, w] of [[x + 6, y + 16, 30], [x + 26, y + 22, 34]] as const) {
    p.rect(sx, sy, w, 5, P.white);
    p.hline(sx, sx + w - 1, sy + 4, P.concreteLt);
    p.rect(sx - 1, sy, 3, 2, P.goldPale);
    p.rect(sx + w - 2, sy, 3, 2, P.goldPale);
    // the brackets
    p.set(sx + 2, sy + 1, P.woodDark);
    p.set(sx + 1, sy + 2, P.woodDark);
    p.set(sx + 2, sy + 3, P.woodDark);
    p.set(sx + w - 3, sy + 1, P.woodDark);
    p.set(sx + w - 2, sy + 2, P.woodDark);
    p.set(sx + w - 3, sy + 3, P.woodDark);
    scribble(p, sx + 4, sy + 1, Math.floor((w - 8) / 4), P.wood, sx + sy, 3);
    castRight(p, sx, sy, w, 5, 1);
  }
}

function staffDoor(p: PixelCanvas, x: number, y: number): void {
  // grey steel door, small wired window, lever handle
  p.rect(x, y, 16, 16, P.steel);
  p.vline(x, y, y + 15, P.concrete);
  p.vline(x + 15, y, y + 15, P.asphalt);
  p.rect(x + 4, y + 2, 7, 5, P.shadeDeep);
  p.hline(x + 4, x + 10, y + 4, P.asphalt);
  p.vline(x + 7, y + 2, y + 6, P.asphalt);
  p.rect(x + 11, y + 9, 3, 1, P.concreteLt);
  p.set(x + 11, y + 10, P.charcoal);
  p.rect(x + 3, y + 10, 5, 4, P.gold);
  p.hline(x + 4, x + 6, y + 12, P.ink);
}

// ---------------------------------------------------------------- the kaitenyaki stall (8–11,3): counter + the turning plate

const PLATE_N = 8;
function plateFrame(k: number, withKey: boolean, stopped: boolean): HTMLCanvasElement {
  const p = pc(32, 22);
  // the machine body (steel box with a burner window glowing orange)
  p.rect(4, 12, 24, 9, P.steel);
  p.hline(4, 27, 12, P.concreteLt);
  p.vline(27, 12, 20, P.asphalt);
  p.rect(8, 15, 16, 3, P.nightShade);
  for (let i = 9; i < 23; i += 2) p.set(i, 16, stopped ? P.charcoal : P.sunDeep);
  p.hline(4, 27, 20, P.charcoal);
  // the round iron plate on top (seen from above, flattened), eight moulds on it
  p.ellipse(16, 8.5, 14, 7, P.ink);
  p.ellipse(16, 8, 13, 6, P.asphalt);
  p.ellipse(16, 8, 4, 2, P.charcoal);
  p.hline(8, 20, 3, P.steel);
  const phase = stopped ? 0 : (k / PLATE_N) * (Math.PI * 2) / 8;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + phase;
    const mx = Math.round(16 + Math.cos(a) * 9);
    const my = Math.round(8 + Math.sin(a) * 4);
    p.rect(mx - 1, my, 3, 2, P.ink);
    // most moulds hold cakes (golden brown), two are empty and dark
    if (i !== 3 && i !== 6) {
      p.rect(mx - 1, my, 3, 2, P.brassOld);
      p.rect(mx - 1, my, 2, 1, P.brass);
      p.set(mx - 1, my, P.goldPale);
    }
  }
  if (withKey) {
    // the little key rides on the plate (gold, a blue cord)
    const a = phase + 0.35;
    const kx = Math.round(16 + Math.cos(a) * 11);
    const ky = Math.round(8 + Math.sin(a) * 5);
    p.rect(kx - 1, ky - 1, 3, 2, P.gold);
    p.set(kx - 1, ky - 1, P.goldPale);
    p.set(kx + 2, ky - 1, P.brass);
    p.set(kx + 3, ky, P.brass);
    p.set(kx - 2, ky, P.blue);
  }
  return p.toCanvas();
}

registerProp('mall_kaitenyaki', () => {
  // counter (64 wide): stainless front with the stall's name band, the plate at x9–10
  const p = pc(64, 30);
  p.rect(0, 4, 64, 10, P.concreteLt);
  p.hline(0, 63, 4, P.white);
  p.hline(0, 63, 13, P.steel);
  p.rect(0, 14, 64, 14, P.concrete);
  p.hline(0, 63, 14, P.steel);
  p.rect(0, 17, 64, 3, P.sunDeep);
  p.hline(0, 63, 19, P.sunShade);
  for (const bx of [4, 50]) {
    p.ellipse(bx + 4, 24, 3, 2, P.brass);
    p.set(bx + 3, 23, P.goldPale);
  }
  p.rect(0, 28, 64, 2, P.charcoal);
  // the machine's base (x 16–47), its gas knob
  p.rect(17, 9, 30, 4, P.charcoal);
  p.hline(17, 46, 9, P.asphalt);
  p.rect(30, 12, 4, 2, P.verm);
  // a tray of wrapping papers, a pair of tongs
  p.rect(2, 6, 9, 5, P.paper);
  p.hline(2, 10, 6, P.white);
  p.line(52, 11, 58, 7, P.steel);
  p.line(53, 11, 59, 8, P.steel);
  finish(p, { soft: true });
  const counter = p.toCanvas();
  const frames = Array.from({ length: PLATE_N }, (_, k) => plateFrame(k, true, false));
  const stoppedNoKey = plateFrame(0, false, true);
  const a = stand(counter, { cx: 32, base: 16, shadow: 0, contact: 0 });
  a.over = (g: Gfx, x: number, y: number, env: PropEnv) => {
    const done = fushigiDone('fushigi_12') || env.flag('flag_got_maigo_key') > 0;
    const img = done ? stoppedNoKey : frames[Math.floor(env.t / (2000 / PLATE_N)) % PLATE_N];
    g.img(img, x + a.ox + 16, y + a.oy - 9);
  };
  a.glow = (g: Gfx, x: number, y: number, env: PropEnv) => {
    if (fushigiDone('fushigi_12')) return;
    // the plate is warm: a faint glow and the key's glint once a turn
    const u = (env.t % 2000) / 2000;
    g.rect(x + a.ox + 24, y + a.oy + 7, 16, 1, P.sun, 0.35);
    g.rect(x + a.ox + 22, y + a.oy - 4, 20, 1, P.sky, 0.12);
    if (u < 0.06) g.rect(x + a.ox + 42, y + a.oy - 1, 1, 1, P.glint, 0.9);
  };
  return a;
});

// ---------------------------------------------------------------- lost-and-found counter (13–16,3)

registerProp('mall_lost_counter', () =>
  prop(64, 26, (p) => {
    p.rect(0, 8, 64, 4, P.woodLt);
    p.hline(0, 63, 8, P.goldPale);
    p.rect(0, 12, 64, 12, P.wood);
    p.hline(0, 63, 12, P.woodLt);
    p.rect(2, 15, 60, 6, P.woodDark);
    p.rect(0, 24, 64, 2, P.ink);
    // the stack of 『お名前をお書きください』 forms, a pen on a chain, a bell, a box of lost gloves
    paperStack(p, 6, 3, 14, 7);
    p.line(22, 9, 27, 6, P.navy);
    p.line(27, 6, 30, 4, P.steel);
    p.ellipse(38, 8, 3, 2, P.brass);
    p.set(38, 6, P.goldPale);
    p.rect(46, 3, 12, 7, P.woodLt);
    p.rect(46, 2, 12, 1, P.goldPale);
    p.rect(48, 1, 3, 3, P.red);
    p.rect(52, 0, 3, 4, P.navy);
    p.rect(10, 16, 16, 4, P.paper);
    scribble(p, 11, 16, 3, P.navy, 5, 3);
  }, { cx: 32, base: 16, contact: 0, shadow: 0 }),
);

// ---------------------------------------------------------------- food court tables (2 tiles, four chairs tucked in)

registerProp('mall_food_table', (opts) => {
  const v = Number(opts.v ?? 0);
  const chair = [P.sun, P.leafDeep, P.sun, P.blue, P.leafDeep, P.sun][v % 6];
  return prop(32, 30, (p) => {
    // two chairs behind (their backs above the table top)
    for (const cx of [4, 20]) {
      p.rect(cx, 0, 9, 7, dk(chair));
      p.hline(cx, cx + 8, 0, chair);
      p.vline(cx, 0, 6, chair);
    }
    // table top: white laminate with a wooden edge, one steel leg
    p.rect(0, 6, 32, 11, P.white);
    p.hline(0, 31, 6, P.glint);
    p.rect(0, 17, 32, 2, P.woodLt);
    p.hline(0, 31, 18, P.wood);
    p.vline(15, 19, 26, P.steel);
    p.vline(16, 19, 26, P.asphalt);
    p.hline(11, 20, 27, P.charcoal);
    // two chairs in front (seats and legs)
    for (const cx of [3, 20]) {
      p.rect(cx, 21, 9, 3, chair);
      p.hline(cx, cx + 8, 21, lt(chair));
      p.vline(cx + 1, 24, 28, P.asphalt);
      p.vline(cx + 7, 24, 28, P.asphalt);
    }
    // per table: what was left behind
    switch (v) {
      case 0: // napkin holder, soy sauce and shichimi
        p.rect(12, 8, 6, 5, P.steel);
        p.rect(13, 7, 4, 2, P.white);
        p.rect(20, 9, 2, 4, P.ink);
        p.rect(23, 10, 2, 3, P.verm);
        break;
      case 1: // (8,5) the child's high chair behind, a ring of juice
        p.rect(2, -2 + 2, 11, 3, P.gold);
        p.rect(3, 0, 9, 7, P.goldPale);
        p.hline(3, 11, 0, P.white);
        p.ring(24, 11, 3, 2, P.brass);
        p.set(24, 11, P.goldPale);
        break;
      case 2: // (13,5) the pager: a round coaster with a dark lamp
        p.ellipse(9, 11, 4, 3, P.charcoal);
        p.ellipse(9, 10.5, 3, 2, P.asphalt);
        p.set(9, 10, P.maroon);
        tiny(p, '7', 20, 9, P.steel);
        break;
      case 3: // a toppled paper cup and its straw
        p.rect(8, 10, 6, 3, P.white);
        p.hline(8, 13, 10, P.red);
        p.line(14, 11, 20, 9, P.aqua);
        break;
      case 4: // an umbrella hanging on the back of a chair
        p.line(21, 0, 26, 10, P.navy);
        p.line(22, 0, 27, 10, P.blue);
        p.set(20, 0, P.charcoal);
        p.rect(10, 9, 8, 4, P.paper);
        break;
      default: // a child's yellow cap
        p.ellipse(16, 11, 4, 2.5, P.gold);
        p.hline(16, 21, 12, P.brass);
        p.set(15, 10, P.goldPale);
    }
  }, { cx: 16, base: 16, contact: 0, shadow: 0 });
});

// ---------------------------------------------------------------- self-service water (12,7): cups upside down, a slow drip

registerProp('mall_water_server', () => {
  const p = pc(16, 30);
  p.rect(1, 6, 14, 22, P.concreteLt);
  p.vline(1, 6, 27, P.white);
  p.vline(14, 6, 27, P.steel);
  p.rect(1, 2, 14, 4, P.steel);
  p.hline(1, 14, 2, P.concreteLt);
  tiny(p, 'H2O', 3, 8, P.blue, undefined, 0);
  // taps and the grid tray
  p.rect(4, 14, 2, 3, P.asphalt);
  p.rect(10, 14, 2, 3, P.asphalt);
  p.rect(2, 20, 12, 2, P.asphalt);
  for (let x = 3; x < 13; x += 2) p.set(x, 20, P.steel);
  // the cups, all turned down (tidy) on top
  for (let k = 0; k < 4; k++) {
    p.rect(2 + k * 3, 0, 2, 2, P.aqua);
    p.set(2 + k * 3, 0, P.white);
  }
  p.rect(1, 28, 14, 2, P.charcoal);
  finish(p, { soft: true });
  const a = stand(p.toCanvas(), { base: 16, contact: 12, shadow: 0 });
  a.over = (g: Gfx, x: number, y: number, env: PropEnv) => {
    // one drop every 3.2 s falls from the left tap to the tray
    const u = (env.t % 3200) / 3200;
    if (u < 0.12) g.rect(x + a.ox + 4, y + a.oy + 17 + Math.round(u * 20), 1, 1, P.aqua);
  };
  return a;
});

// ---------------------------------------------------------------- tray return (18,10)

registerProp('mall_tray_return', () =>
  prop(16, 34, (p) => {
    // shelf unit with slots, the 『ごちそうさまでした』 plate, the last tray
    p.rect(1, 2, 14, 30, P.woodDark);
    p.vline(1, 2, 31, P.wood);
    p.rect(1, 2, 14, 5, P.white);
    scribble(p, 2, 3, 2, P.navy, 91, 4);
    for (let j = 9; j < 30; j += 4) p.hline(2, 14, j, P.wood);
    p.rect(2, 10, 12, 2, P.sunDeep);
    p.hline(2, 13, 10, P.sun);
    p.set(8, 11, P.woodDark);
    // chopstick bin
    p.rect(3, 26, 6, 5, P.steel);
    p.vline(4, 23, 26, P.woodLt);
    p.vline(6, 24, 26, P.woodLt);
    p.rect(1, 32, 14, 2, P.charcoal);
  }, { base: 16, contact: 12, shadow: 0 }),
);

void ihash;
void printLines;
void arrowSign;
void PixelCanvas;
void mkFrames;
