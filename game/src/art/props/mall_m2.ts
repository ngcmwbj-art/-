// M2 フードコート (30_level_art 5.2, 20×13). Along the north wall: the ramen
// shop's shutter (『スープ切れ』 taped on, a red lantern gone pale), the
// kaitenyaki stall whose round iron plate keeps turning with a tiny key on
// it (fushigi_12), the lost-and-found counter with its stack of blank forms,
// the grey STAFF door. Six four-seat tables, each left differently (a high
// chair with a juice ring, the pager, a toppled cup, an umbrella on a chair,
// a child's cap), the pillar with the self-service water, the tray return.
// Its own floor (quarry tiles in terracotta and cream, the anti-slip strip
// before the stalls), trays swept onto the floor by the vacuums, and instead
// of a skylight shaft the roof's leak through a missing ceiling panel
// (mall_leak, mall_decay.ts).

import type { Gfx } from '../../engine/gfx';
import { PixelCanvas } from '../../engine/pixel';
import { getMapDef } from '../../world/maps';
import { fushigiDone } from '../../world/fushigi';
import { foodCourtTiles, laneOf } from '../tiles/ifloor';
import { ihash } from '../tiles/noise';
import { P } from '../tiles/palette';
import { notice, paperStack, pc, prop } from './ifurn';
import { blend, depthShade, paintShell, shellProp } from './ishell';
import { castRight, dk, finish, lt, outline } from './kit';
import { bannerScrap, exitCorridor, exitLight, fasciaText, mallGrade, mallLampLight, mallLamps, mallWall, posterGhost, shutter, small, smallW, type Lamp } from './mall_kit';
import { mkFrames, stand } from './pkit';
import { registerProp } from './registry';
import { printLines, tiny } from './text';
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
  // quarry tiles (the food court's own floor), the anti-slip strip before the
  // stalls, spills thickest round the tables
  const TABLES: [number, number][] = [[3, 5], [8, 5], [13, 5], [3, 9], [8, 9], [14, 9]];
  const spill = (x: number, y: number) => {
    let m = 0;
    for (const [tx, ty] of TABLES) m = Math.max(m, 1 - Math.hypot(x - (tx * 16 + 16), (y - (ty * 16 + 10)) * 1.4) / 30);
    return Math.max(0, m) * 0.45;
  };
  const tiles = foodCourtTiles({
    seed: 521,
    w: 20,
    h: 13,
    blocked,
    lane,
    service: (x, y) => y >= 64 && y < 80 && x >= 112 && x < 288,
    spill,
    decals: [
      { x: 262, y: 104, kind: 'arrow', dir: 0, c: P.gold },
      { x: 226, y: 176, kind: 'steps', dir: 2, n: 5 },
      { x: 30, y: 176, kind: 'pot' },
    ],
  });
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
  bannerScrap(p, 97, 3, 30, 11, 16);
  // ---- (8–11) the kaitenyaki stall: the menu sign with its growing brackets, the back wall
  p.rect(129, 21, 62, 24, P.concrete);
  p.hline(129, 190, 21, P.concreteLt);
  for (const sy of [30, 38]) {
    p.hline(131, 188, sy, P.steel);
    p.hline(131, 188, sy + 1, P.asphalt);
  }
  // paper bags, a batter jug, the bean paste pot, a price card (on the shelves)
  for (let k = 0; k < 4; k++) p.rect(178 + k * 3, 34, 2, 4, P.paper);
  p.rect(179, 24, 7, 6, P.charcoal);
  p.hline(179, 185, 24, P.asphalt);
  p.rect(180, 25, 5, 2, P.maroon);
  p.rect(186, 26, 3, 4, P.white);
  p.rect(131, 29, 10, 7, P.white);
  tiny(p, '80', 132, 30, P.verm);
  castRight(p, 131, 29, 10, 7, 1);
  kaitenyakiSign(p, 128, 3);
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
  // trays swept off the tables by the vacuums: one face up by the knocked-over
  // chair, one overturned in the aisle, one with a lid and a straw by the pillar
  floorTray(p, 86, 176, 0);
  floorTray(p, 150, 122, 1);
  floorTray(p, 206, 170, 2);
  p.line(106, 182, 110, 180, P.woodLt);
  p.line(107, 183, 111, 181, P.woodLt);
  // ---- the corridor to M1 (E, x19) fades into the dark
  exitCorridor(p, 19, 6, 2, 1);
  const img = p.toCanvas();
  const W = img.width;
  return shellProp({
    img,
    over(g: Gfx, x: number, y: number, env: PropEnv) {
      depthShade(g, x + 16, y + 48, W - 32, 80, 0.14);
      mallLamps(g, x, y, M2_LAMPS, env, 202, 0.16, rows);
    },
    light(g: Gfx, x: number, y: number, env: PropEnv) {
      mallGrade(g, 'mall', env, [x + 16, y + 48, 288, 144]);
      mallLampLight(g, x, y, M2_LAMPS, env, 202);
    },
    glow(g: Gfx, x: number, y: number, env: PropEnv) {
      // the hall's light at the end of the corridor to M1
      exitLight(g, x, y, 19, 6, 2, 1, P.sky, 0.28);
    },
  });
});

/** 『回転焼き（今川焼き）（大判焼き）』: the name board with brackets taped on, one after another. */
function kaitenyakiSign(p: PixelCanvas, x: number, y: number): void {
  fasciaText(p, x, y, 64, 15, P.goldPale, '回転焼き', P.woodDark, P.brass);
  // two paper strips taped on under it, one after the other, each another
  // name for the same cake in brackets: （今川焼）（大判焼）
  for (const [sx, sy, word] of [[x - 7, y + 15, '（今川焼）'], [x + 36, y + 17, '（大判焼）']] as const) {
    const w = smallW(word) + 3;
    p.rect(sx, sy, w, 10, P.white);
    p.hline(sx, sx + w - 1, sy + 9, P.concreteLt);
    p.rect(sx - 1, sy - 1, 3, 2, P.goldPale);
    p.rect(sx + w - 2, sy - 1, 3, 2, P.goldPale);
    small(p, word, sx + 1, sy + 1, P.woodDark);
    castRight(p, sx, sy, w, 10, 1);
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

// one full turn in 2.0 s (the ambience's 'turn' is sent on the same beat),
// 24 frames so the moulds visibly creep round and the key rides the rim
const PLATE_N = 24;
const keyAngle = (k: number) => (k / PLATE_N) * Math.PI * 2 + 0.35;
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
  const phase = stopped ? 0 : (k / PLATE_N) * Math.PI * 2;
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
  void withKey;
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
  const key = keySprite();
  const a = stand(counter, { cx: 32, base: 16, shadow: 0, contact: 0 });
  /** Where the key is on the plate at time t (px of its sprite's top-left) and the angle. */
  const keyAt = (t: number, x: number, y: number): [number, number, number] => {
    const k = Math.floor(t / (2000 / PLATE_N)) % PLATE_N;
    const ka = keyAngle(k);
    // a 1px bob as it rattles round on the iron
    const bob = Math.floor(t / 170) % 3 === 0 ? -1 : 0;
    const kx = x + a.ox + 16 + Math.round(16 + Math.cos(ka) * 8.5) - 5;
    const ky = y + a.oy - 6 + Math.round(8 + Math.sin(ka) * 3.5) - 3 + bob;
    return [kx, ky, ka];
  };
  a.over = (g: Gfx, x: number, y: number, env: PropEnv) => {
    const stopped = fushigiDone('fushigi_12') || env.flag('flag_got_maigo_key') > 0;
    const img = stopped ? stoppedNoKey : frames[Math.floor(env.t / (2000 / PLATE_N)) % PLATE_N];
    g.img(img, x + a.ox + 16, y + a.oy - 6);
    if (env.flag('flag_got_maigo_key')) return;
    // fushigi_12: the key to the 迷子センター rides the plate — silver with a
    // dark outline and its red-and-white paper tag, nothing like the cakes.
    // Once the plate has stopped it lies still at the front until it is taken.
    if (stopped) g.img(key, x + a.ox + 16 + 11, y + a.oy - 6 + 8);
    else {
      const [kx, ky] = keyAt(env.t, x, y);
      g.img(key, kx, ky);
    }
  };
  a.glow = (g: Gfx, x: number, y: number, env: PropEnv) => {
    if (fushigiDone('fushigi_12')) {
      // stopped: the key still waiting on the cold plate glints now and then
      if (!env.flag('flag_got_maigo_key') && Math.floor(env.t / 150) % 12 === 0) g.rect(x + a.ox + 16 + 14, y + a.oy - 6 + 8, 1, 1, P.glint, 0.9);
      return;
    }
    // the plate is warm: a faint glow, and the key glints as it swings round
    // to the front (once a turn — the thing that draws the eye to it)
    g.rect(x + a.ox + 24, y + a.oy + 10, 16, 1, P.sun, 0.35);
    g.rect(x + a.ox + 22, y + a.oy - 1, 20, 1, P.sky, 0.12);
    if (env.flag('flag_got_maigo_key')) return;
    const [kx, ky, ka] = keyAt(env.t, x, y);
    // the bow always shows a pinpoint of light; at the front a full sparkle
    g.rect(kx + 2, ky + 1, 1, 1, P.glint, 0.7);
    if (Math.sin(ka) > 0.6) {
      const sx = kx + 3;
      const sy = ky - 1;
      g.rect(sx, sy - 1, 1, 3, P.glint, 0.95);
      g.rect(sx - 1, sy, 3, 1, P.glint, 0.95);
      g.rect(sx, sy - 3, 1, 1, P.glint, 0.5);
      g.rect(sx + 2, sy, 1, 1, P.glint, 0.5);
    }
  };
  return a;
});

/**
 * The 迷子センター key (12×9 with its outline): a silver bow with a hole, the
 * shaft and two teeth, and a paper tag on a string (white, a red band).
 */
function keySprite(): HTMLCanvasElement {
  const p = pc(13, 10);
  // bow (a ring with a dark hole)
  p.rect(2, 1, 4, 4, P.concreteLt);
  p.set(2, 1, P.white);
  p.set(3, 1, P.white);
  p.set(2, 2, P.white);
  p.rect(3, 2, 2, 2, P.ink);
  p.set(5, 4, P.steel);
  p.set(5, 3, P.steel);
  // shaft and the teeth
  p.hline(6, 11, 2, P.white);
  p.hline(6, 11, 3, P.steel);
  p.rect(8, 4, 1, 2, P.steel);
  p.rect(10, 4, 2, 1, P.steel);
  p.set(11, 5, P.asphalt);
  // the tag on its string
  p.set(2, 5, P.charcoal);
  p.rect(1, 6, 4, 3, P.white);
  p.hline(1, 4, 6, P.verm);
  p.set(4, 8, P.concreteLt);
  outline(p, { soft: false, bottom: true });
  return p.toCanvas();
}

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
    printLines(p, 11, 16, 14, 2, P.navy, 5);
  }, { cx: 32, base: 16, contact: 0, shadow: 0 }),
);

// ---------------------------------------------------------------- food court tables (2 tiles, four chairs tucked in)

registerProp('mall_food_table', (opts) => {
  const v = Number(opts.v ?? 0);
  const chair = [P.sun, P.leafDeep, P.sun, P.blue, P.leafDeep, P.sun][v % 6];
  // The image starts only 4px above the table's own row: the chairs on the
  // north side are pushed in under the table (just their backrests peek over
  // its top), so someone walking along the row behind is never drawn as if
  // standing on a chair; the front chairs reach into the row south of it.
  // Every table was left its own way (review round 1: six identical sets):
  // 0 tidy, 1 a chair pulled out and turned, 2 closed — the chairs up on the
  // table legs in the air, 3 a chair knocked over, 4 shoved askew with its
  // chairs pushed together, 5 one chair gone, a tray left behind.
  const W = 40;
  const backrest = (p: PixelCanvas, cx: number) => {
    p.rect(cx, 1, 9, 3, dk(chair));
    p.hline(cx, cx + 8, 1, chair);
    p.set(cx, 2, chair);
    p.set(cx + 8, 2, dk(chair, 2));
  };
  const seat = (p: PixelCanvas, cx: number, cy: number) => {
    p.rect(cx, cy, 9, 3, chair);
    p.hline(cx, cx + 8, cy, lt(chair));
    p.set(cx + 8, cy + 2, dk(chair));
    p.vline(cx + 1, cy + 3, cy + 7, P.asphalt);
    p.vline(cx + 7, cy + 3, cy + 7, P.asphalt);
    p.set(cx + 1, cy + 7, P.ink);
    p.set(cx + 7, cy + 7, P.ink);
  };
  /** A chair upside down on the table top: the seat's underside, four legs in the air. */
  const upturned = (p: PixelCanvas, cx: number, cy: number) => {
    p.rect(cx, cy + 3, 9, 3, dk(chair));
    p.hline(cx, cx + 8, cy + 5, dk(chair, 2));
    p.rect(cx + 1, cy + 4, 7, 1, P.charcoal);
    for (const lx of [cx + 1, cx + 7]) {
      p.vline(lx, cy - 3, cy + 3, P.steel);
      p.set(lx, cy - 4, P.ink);
    }
    for (const lx of [cx + 2, cx + 6]) p.vline(lx, cy - 1, cy + 2, P.asphalt);
  };
  /** A chair knocked over backwards: lying on the floor, seat towards us, legs out to the side. */
  const toppled = (p: PixelCanvas, cx: number, cy: number) => {
    p.rect(cx, cy, 3, 8, dk(chair));
    p.vline(cx, cy, cy + 7, chair);
    p.rect(cx + 3, cy + 2, 7, 4, chair);
    p.hline(cx + 3, cx + 9, cy + 2, lt(chair));
    p.hline(cx + 10, cx + 13, cy + 3, P.steel);
    p.hline(cx + 10, cx + 13, cy + 5, P.asphalt);
    p.set(cx + 14, cy + 3, P.ink);
    p.set(cx + 14, cy + 5, P.ink);
    p.hline(cx, cx + 14, cy + 8, P.shade);
  };
  const top = (p: PixelCanvas, x: number, y: number) => {
    // white laminate with a wooden edge, one steel leg
    p.rect(x, y + 4, 32, 11, P.white);
    p.hline(x, x + 31, y + 4, P.glint);
    p.rect(x, y + 15, 32, 2, P.woodLt);
    p.hline(x, x + 31, y + 16, P.wood);
    p.vline(x + 15, y + 17, y + 24, P.steel);
    p.vline(x + 16, y + 17, y + 24, P.asphalt);
    p.hline(x + 11, x + 20, y + 25, P.charcoal);
  };
  return prop(W, 28, (p) => {
    switch (v) {
      case 0: // tidy: napkin holder, soy sauce and shichimi
        backrest(p, 4);
        backrest(p, 20);
        top(p, 0, 0);
        seat(p, 3, 19);
        seat(p, 20, 19);
        p.rect(12, 6, 6, 5, P.steel);
        p.rect(13, 5, 4, 2, P.white);
        p.rect(20, 7, 2, 4, P.ink);
        p.rect(23, 8, 2, 3, P.verm);
        break;
      case 1: // (8,5) the child's high chair pushed in behind, a juice ring, the right chair pulled out and turned
        backrest(p, 20);
        p.rect(3, 0, 9, 4, P.goldPale);
        p.hline(3, 11, 0, P.white);
        p.hline(2, 12, 3, P.gold);
        top(p, 0, 0);
        seat(p, 3, 19);
        // pulled out and swung round: its backrest now faces the table's end
        p.rect(27, 18, 3, 6, dk(chair));
        p.vline(27, 18, 23, chair);
        seat(p, 29, 20);
        p.ring(24, 9, 3, 2, P.brass);
        p.set(24, 9, P.goldPale);
        break;
      case 2: // (13,5) closed for the night a year ago: chairs upside down on the table, the pager at the edge
        top(p, 0, 0);
        upturned(p, 2, 6);
        upturned(p, 12, 5);
        upturned(p, 22, 6);
        p.ellipse(29, 12.5, 2.5, 1.5, P.charcoal);
        p.set(29, 12, P.maroon);
        break;
      case 3: // (3,9) a chair knocked over, the paper cup too
        backrest(p, 4);
        backrest(p, 20);
        top(p, 0, 0);
        seat(p, 3, 19);
        toppled(p, 22, 18);
        p.rect(8, 8, 6, 3, P.white);
        p.hline(8, 13, 8, P.red);
        p.line(14, 9, 20, 7, P.aqua);
        // what spilled from it has dried on the laminate
        p.hline(15, 18, 11, P.goldPale);
        p.set(19, 12, P.goldPale);
        break;
      case 4: // (8,9) shoved askew: the top off-centre, its chairs pushed together to one side
        backrest(p, 1);
        backrest(p, 10);
        top(p, 4, 1);
        seat(p, 13, 20);
        seat(p, 22, 21);
        // an umbrella hooked on the edge, a flyer
        p.line(29, 5, 33, 14, P.navy);
        p.line(30, 5, 34, 14, P.blue);
        p.set(28, 5, P.charcoal);
        p.rect(12, 8, 8, 4, P.paper);
        p.hline(13, 18, 9, P.crimson);
        break;
      default: // (14,9) one chair gone, a tray left with a bowl and chopsticks, a child's cap on the other chair
        backrest(p, 4);
        backrest(p, 20);
        top(p, 0, 0);
        seat(p, 3, 19);
        p.rect(14, 6, 13, 8, P.sun);
        p.strokeRect(14, 6, 13, 8, P.sunDeep);
        p.hline(15, 25, 6, P.sky);
        p.ellipse(19, 9.5, 3, 2, P.white);
        p.ellipse(19, 9.5, 2, 1, P.brass);
        p.line(23, 7, 25, 12, P.woodLt);
        p.line(24, 7, 26, 12, P.woodLt);
        p.ellipse(7.5, 19.5, 4, 2, P.gold);
        p.hline(7, 12, 20, P.brass);
        p.set(6, 18, P.goldPale);
    }
  }, { cx: 16 + (W - 32) / 2, base: 24, foot: 23, contact: 0, shadow: 0 });
});

// ---------------------------------------------------------------- trays and lids swept off the tables (flat, on the floor)

/**
 * Orange food-court trays and their litter on the floor: a tray face up with
 * a bowl, one overturned, one on its edge against a chair, a lid, chopsticks.
 */
function floorTray(p: PixelCanvas, x: number, y: number, k: number): void {
  if (k === 1) {
    // overturned: the pale ribbed underside
    p.rect(x, y, 13, 8, P.skin3);
    p.strokeRect(x, y, 13, 8, P.sunDeep);
    for (let i = x + 2; i < x + 12; i += 3) p.vline(i, y + 2, y + 5, P.sun);
    p.hline(x + 1, x + 12, y + 8, P.shade);
    return;
  }
  p.rect(x, y, 13, 8, P.sun);
  p.strokeRect(x, y, 13, 8, P.sunDeep);
  p.hline(x + 1, x + 11, y + 1, P.sky);
  p.hline(x + 1, x + 12, y + 8, P.shade);
  if (k === 0) {
    p.ellipse(x + 5, y + 4, 3, 2, P.white);
    p.ellipse(x + 5, y + 4, 2, 1, P.goldPale);
    p.line(x + 9, y + 2, x + 11, y + 6, P.woodLt);
  } else {
    // a cup lid and a straw
    p.ellipse(x + 8, y + 4, 2, 2, P.white);
    p.set(x + 8, y + 4, P.concrete);
    p.line(x + 2, y + 5, x + 6, y + 3, P.aqua);
  }
}

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
    // a tray-and-cup pictogram on the 『返却口』 plate
    p.hline(3, 9, 5, P.navy);
    p.rect(5, 3, 2, 2, P.navy);
    p.set(8, 4, P.navy);
    p.set(11, 3, P.verm);
    p.hline(10, 12, 4, P.verm);
    p.set(11, 5, P.verm);
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
void PixelCanvas;
void mkFrames;
