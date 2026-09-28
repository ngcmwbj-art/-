// 豆腐 くま吉の奥と作業場 (map_tofu) and 時計店 チクタク堂 (map_clock) —
// 30_level_art 4.9 / 4.10.
//
// 豆腐屋: white glazed tiles to shoulder height, a wet concrete floor with
// its drain, the little shrine and the licence, the tofu horn on its hook;
// the cauldron under its hood (steam: rising in stage 0, a candy-floss knot
// in stage 1, sinking back into the pot in stage 2), the moulds and the
// press, the mill, the shelf of fried tofu, the long water tank (ripples, a
// dripping tap, the ラムネ cooling in the corner until it's found), the tub
// of tomorrow's soybeans, the sacks and the stacked delivery trays.
//
// 時計店: deep green wallpaper over dark wood, clocks everywhere — the
// grandfather clock, the wall of clocks and the cuckoo clock behind the
// glass counter (all at 16:5x in stage 0 with their seconds running; 17:00
// on the dot in stage 1, the cuckoo half out; in stage 2 every second hand
// goes one on and one back and the cuckoo can't decide), the repair shelf
// with its tags, the candy tin and the table of alarm clocks.

import type { Gfx } from '../../engine/gfx';
import { PixelCanvas } from '../../engine/pixel';
import { ihash, valueNoise } from '../tiles/noise';
import { P } from '../tiles/palette';
import { cardboard, framed, notice, pc, prop } from './ifurn';
import { blend, screenPool } from './ishell';
import { castRight, dk, finish, lt } from './kit';
import { mkFrames, stand } from './pkit';
import { registerProp } from './registry';
import { fontTextSmall, handGlyph, printLines, tiny } from './text';
import type { PropArt, PropEnv } from './types';
import { clockImg, pendulum, roomShell, spin, stageTime, wetConcrete, woodFloor } from './int_north_kit';

// ================================================================ 豆腐 くま吉

function tileWall(seed: number): (x: number, y: number) => string {
  return (x, y) => {
    if (y < 9) return valueNoise(x / 6, y / 4, seed) > 0.8 ? P.white : P.concreteLt;
    if (y === 9) return P.steel;
    const lx = x % 8;
    const ly = (y - 10) % 8;
    if (lx === 7 || ly === 7) return P.concrete;
    return lx === 0 || ly === 0 ? '#FFFFFF' : ihash(Math.floor(x / 8), Math.floor(y / 8), seed) % 7 === 0 ? P.concreteLt : P.white;
  };
}

registerProp('in_tf_shell', () =>
  roomShell({
    map: 'map_tofu',
    floor: (x, y) => wetConcrete(8501, 92)(x, y),
    wall: tileWall(8503),
    trim: P.concreteLt,
    base: P.steel,
    baseH: 2,
    door: 'noren',
    ext: {
      town: [38, 21],
      bld: [35, 39, 16],
      skin: [P.concreteLt, P.concrete, P.steel],
      roof: 'tin',
      seed: 8505,
      props: [
        { id: 'obj_tofu_tank', tx: 37, ty: 21 },
        { id: 'obj_wagon', tx: 39, ty: 22 },
      ],
    },
    tube: 1,
    lamps: [[96, 60, 60, 26, P.white]],
    deco(p) {
      // the little shrine (4, 0) high on the wall: a shelf, a roof, the sakaki
      p.rect(66, 3, 12, 2, P.woodLt);
      p.poly([[65, 3], [72, 0], [79, 3]], P.woodDark);
      p.rect(69, 5, 6, 3, P.paper);
      p.set(67, 5, P.leaf);
      p.set(76, 5, P.leaf);
      p.hline(65, 79, 8, P.wood);
      // the licence (10, 0–1) and the calendar (11? the east wall end)
      const [ix, iy, iw, ih] = framed(p, 162, 6, 12, 10, P.woodDark);
      p.rect(ix, iy, iw, ih, P.paper);
      printLines(p, ix + 1, iy + 1, iw - 2, 3, P.steel, 851);
      p.set(ix + iw - 2, iy + ih - 2, P.verm);
      // the tofu horn on its hook (8, 0–1)
      p.set(135, 9, P.charcoal);
      p.line(135, 10, 133, 12, P.charcoal);
      p.hline(128, 139, 14, P.brass);
      p.hline(129, 138, 13, P.goldPale);
      p.poly([[139, 12], [143, 10], [143, 18], [139, 16]], P.brass);
      p.vline(143, 10, 18, P.brassOld);
      p.set(141, 12, P.goldPale);
      p.rect(126, 13, 2, 3, P.charcoal);
      castRight(p, 126, 10, 18, 9, 1);
      // a towel on a nail beside it
      p.rect(147, 12, 5, 9, P.aqua);
      p.vline(151, 12, 20, P.blue);
      p.set(149, 11, P.charcoal);
    },
  }),
);

// the cauldron (1–2,2): brick stove, a steel pot, the hood; steam by stage
registerProp('in_tf_kama', () => {
  const a = prop(32, 44, (p) => {
    // hood
    p.poly([[4, 0], [27, 0], [31, 9], [0, 9]], P.concrete);
    p.hline(1, 30, 9, P.steel);
    p.hline(4, 27, 0, P.concreteLt);
    p.rect(12, 0, 8, 2, P.steel);
    // the hood's stays down to the stove's back
    p.vline(3, 9, 25, P.steel);
    p.vline(28, 9, 25, P.steel);
    // stove
    p.rect(2, 26, 28, 18, '#8A5A4A');
    for (let y = 27; y < 44; y += 3) for (let x = 2 + ((y / 3) % 2) * 3; x < 30; x += 6) p.hline(x, x + 4, y, '#A8705A');
    p.rect(12, 34, 8, 6, P.ink);
    p.rect(13, 36, 6, 3, P.red);
    p.hline(13, 18, 36, P.gold);
    // the pot
    p.ellipse(16, 24, 13, 4, P.steel);
    p.ellipse(16, 23, 12, 3, P.concreteLt);
    p.ellipse(16, 23, 10, 2, '#E8E4D8');
    p.rect(4, 24, 24, 4, P.steel);
    p.hline(4, 27, 27, P.asphalt);
    p.set(8, 22, P.white);
  }, { cx: 16, base: 16, contact: 28, shadow: 0 });
  a.over = (g: Gfx, x: number, y: number, env: PropEnv) => {
    const cx = x + 17;
    const top = y + a.oy + 20;
    for (let i = 0; i < 9; i++) {
      let k: number;
      if (env.stage === 1) k = (i * 0.9) % 8;
      else if (env.stage === 2) k = 8 - ((env.t / 180 + i) % 8);
      else k = (env.mt / 180 + i) % 8;
      const yy = top - k * 1.6;
      const xx = cx - 8 + ((i * 5) % 16) + Math.sin(k * 0.8 + i) * 1.5;
      g.rect(Math.round(xx), Math.round(yy), 2, 1, P.white, 0.55 - k * 0.06);
    }
  };
  return a;
});

// the moulds and the press (5–7,2)
registerProp('in_tf_molds', () =>
  prop(48, 30, (p) => {
    // steel table
    p.rect(1, 14, 46, 3, P.concreteLt);
    p.hline(1, 46, 14, P.white);
    p.rect(2, 17, 2, 13, P.steel);
    p.rect(44, 17, 2, 13, P.steel);
    p.hline(3, 44, 25, P.steel);
    // stacked wooden moulds (型箱) with holes
    for (let k = 0; k < 3; k++) {
      const y = 10 - k * 4;
      p.rect(4 + k, y, 16, 4, P.woodLt);
      p.hline(4 + k, 19 + k, y, '#DCC08A');
      for (let i = 6 + k; i < 19 + k; i += 3) p.set(i, y + 2, P.wood);
      p.vline(19 + k, y, y + 3, P.wood);
    }
    // folded bleached cloth
    p.rect(22, 9, 9, 5, P.white);
    p.hline(22, 30, 11, P.concreteLt);
    // the press: a lever over a block
    p.rect(34, 6, 10, 8, P.steel);
    p.rect(35, 7, 8, 6, P.concreteLt);
    p.line(36, 5, 46, 0, P.charcoal);
    p.rect(44, 0, 3, 2, P.red);
    // tubs under the table
    p.rect(8, 20, 10, 5, P.aqua);
    p.rect(26, 20, 10, 5, P.aqua);
    p.hline(8, 17, 20, '#BDEFFA');
    p.hline(26, 35, 20, '#BDEFFA');
  }, { cx: 24, base: 16, contact: 40, shadow: 0 }),
);

// the mill (9,2)
registerProp('in_tf_mill', () =>
  prop(16, 30, (p) => {
    p.rect(2, 14, 12, 16, P.steel);
    p.vline(2, 14, 29, P.concreteLt);
    p.vline(13, 15, 29, P.asphalt);
    p.poly([[1, 4], [14, 4], [11, 13], [4, 13]], P.concreteLt);
    p.hline(1, 14, 4, P.white);
    p.rect(4, 5, 7, 2, P.goldPale);
    p.rect(6, 18, 4, 3, P.charcoal);
    p.set(7, 19, P.leafYoung);
    p.rect(12, 22, 3, 5, P.concrete);
    p.set(13, 27, P.white);
  }, { base: 16, contact: 12, shadow: 0 }),
);

// the shelf of fried tofu (10,2)
registerProp('in_tf_shelf', () =>
  prop(16, 34, (p) => {
    p.rect(1, 2, 14, 32, P.concrete);
    p.vline(1, 2, 33, P.concreteLt);
    p.vline(14, 2, 33, P.steel);
    for (const sy of [6, 16, 26]) p.hline(1, 14, sy, P.steel);
    // 油あげ (golden slabs), がんも (round), okara in a bag
    for (let i = 0; i < 3; i++) p.rect(2 + i * 4, 3, 3, 3, P.brass);
    for (let i = 0; i < 3; i++) p.set(3 + i * 4, 3, P.goldPale);
    for (let i = 0; i < 3; i++) {
      p.ellipse(4 + i * 4, 13.5, 1.5, 1.5, P.brassOld);
      p.set(3 + i * 4, 12, P.woodLt);
    }
    p.rect(3, 19, 9, 7, P.white);
    p.rect(4, 20, 7, 5, P.paper);
    p.hline(3, 11, 19, P.concreteLt);
    printLines(p, 5, 21, 5, 2, P.woodDark, 871);
    p.rect(3, 28, 10, 4, P.aqua);
  }, { base: 16, contact: 12, shadow: 0 }),
);

// the long water tank (2–5,4): tofu blocks under water, the tap, the ラムネ in the east corner
registerProp('in_tf_tank', () => {
  const make = (withRamune: boolean) => {
    const p = pc(64, 24);
    p.rect(1, 6, 62, 18, P.steel);
    p.rect(1, 6, 62, 2, P.concreteLt);
    p.hline(1, 62, 6, P.white);
    p.rect(3, 8, 58, 9, '#4AA8E0');
    p.rect(3, 8, 58, 2, P.aqua);
    // tofu blocks
    for (let i = 0; i < 6; i++) {
      const x = 5 + i * 8;
      p.rect(x, 10, 6, 5, P.white);
      p.hline(x, x + 5, 10, '#FFFFFF');
      p.vline(x + 5, 11, 14, P.concreteLt);
    }
    p.hline(3, 60, 17, P.asphalt);
    p.rect(2, 18, 60, 6, P.concrete);
    p.hline(2, 61, 23, P.asphalt);
    // the tap at the west end
    p.rect(2, 0, 2, 7, P.steel);
    p.rect(2, 0, 6, 2, P.concreteLt);
    p.set(7, 2, P.steel);
    if (withRamune) {
      // a ラムネ in the east corner, standing in the water up to its neck
      p.rect(54, 3, 4, 8, '#4AA8E0');
      p.vline(54, 3, 10, '#BDEFFA');
      p.rect(55, 0, 2, 3, '#7FD1E8');
      p.set(55, 1, P.white);
      p.set(56, 4, P.white);
    }
    finish(p, { soft: true, rim: false });
    return p.toCanvas();
  };
  const full = make(true);
  const empty = make(false);
  const a = stand(full, { cx: 32, base: 16, contact: 56, shadow: 0 });
  a.img = (env: PropEnv) => (env.flag('flag_find_tf_ramune') ? empty : full);
  a.over = (g: Gfx, x: number, y: number, env: PropEnv) => {
    const top = y + a.oy + 8;
    // ripples running along the water (frozen in stage 1)
    for (let i = 0; i < 4; i++) {
      const k = env.stage === 1 ? i * 13 : ((env.stage === 2 ? -env.mt : env.mt) / 60 + i * 13) % 52;
      const rx = x + 4 + ((k + 52) % 52);
      g.rect(Math.round(rx), top + 1 + (i % 2), 3, 1, P.white, 0.55);
    }
    // the drip from the tap
    const d = env.stage === 1 ? 0.4 : ((env.stage === 2 ? -env.mt : env.mt) / 900) % 1;
    const dd = (d + 1) % 1;
    g.rect(x + 7, Math.round(y + a.oy + 2 + dd * 6), 1, 1, P.aqua, 0.9);
  };
  return a;
});

// the tub of tomorrow's soybeans (9–10,4)
registerProp('in_tf_tub', () =>
  prop(32, 16, (p) => {
    p.ellipse(16, 8, 14, 6, P.blue);
    p.ellipse(16, 7, 13, 5, '#7FD1E8');
    for (let i = 0; i < 40; i++) {
      const h = ihash(i, 3, 861);
      const bx = 6 + (h % 20);
      const by = 5 + ((h >> 5) % 5);
      p.set(bx, by, (h >> 9) % 3 ? P.goldPale : P.brass);
    }
    p.hline(3, 28, 12, '#2F7AB0');
    p.set(9, 4, P.white);
    // the scoop resting on the rim
    p.line(24, 3, 30, 1, P.woodLt);
    p.rect(21, 3, 4, 2, P.woodLt);
  }, { cx: 16, base: 16, contact: 28, shadow: 0 }),
);

// sacks of soybeans (1,6)
registerProp('in_tf_sack', () =>
  prop(16, 22, (p) => {
    for (const [x, y] of [[1, 10], [3, 3]] as [number, number][]) {
      p.rect(x, y, 12, 9, '#C8A878');
      p.hline(x + 1, x + 10, y, '#DCC090');
      p.vline(x + 11, y + 1, y + 8, '#A8885A');
      for (let i = x + 1; i < x + 11; i += 2) p.set(i, y + 4, '#B8986A');
      p.rect(x + 3, y + 3, 6, 3, P.paper);
      p.hline(x + 4, x + 7, y + 4, P.verm);
    }
  }, { base: 16, contact: 12, shadow: 0 }),
);

// stacked delivery trays (10,6)
registerProp('in_tf_crates', () =>
  prop(16, 24, (p) => {
    for (let k = 0; k < 4; k++) {
      const y = 18 - k * 5;
      p.rect(1, y, 14, 5, k % 2 ? '#4AA8E0' : '#2F7AB0');
      p.hline(1, 14, y, '#7FD1E8');
      for (let i = 3; i < 13; i += 3) p.set(i, y + 2, P.navy);
    }
    p.rect(3, 0, 10, 3, P.white);
    p.hline(3, 12, 0, '#FFFFFF');
  }, { base: 16, contact: 12, shadow: 0 }),
);

// ================================================================ 時計店 チクタク堂

function greenPaper(seed: number): (x: number, y: number) => string {
  return (x, y) => {
    if (y >= 22) return y === 22 ? P.woodLt : x % 10 === 9 ? '#3A2418' : P.woodDark;
    const motif = ((x + (Math.floor(y / 6) % 2) * 4) % 8 === 0 && y % 6 === 2);
    if (motif) return P.brassOld;
    return valueNoise(x / 9, y / 6, seed) > 0.75 ? '#3A7A5A' : '#2E6B4A';
  };
}

registerProp('in_ck_shell', () =>
  roomShell({
    map: 'map_clock',
    floor: (x, y) => woodFloor(8601, 'dark')(x, y),
    wall: greenPaper(8603),
    trim: P.woodLt,
    base: P.woodDark,
    baseH: 2,
    door: 'glass',
    ext: {
      town: [42, 21],
      bld: [39, 43, 16],
      skin: [P.woodLt, P.wood, P.woodDark],
      roof: 'tin',
      seed: 8605,
      props: [
        { id: 'obj_wagon', tx: 39, ty: 22 },
      ],
    },
    lamps: [[80, 60, 40, 20, P.sky]],
    deco(p) {
      // a small brass plaque 『チクタク堂』 on the east wall end (7–8, 0)
      p.rect(116, 3, 26, 7, P.brass);
      p.hline(116, 141, 3, P.goldPale);
      p.hline(116, 141, 9, P.brassOld);
      fontTextSmall(p, 'チクタク', 118, 3, P.woodDark);
      // the notice 『電池交換 いたします』
      notice(p, 145, 12, 10, 9, { seed: 861, rows: 3 });
    },
  }),
);

// the grandfather clock (1,2): a tall case, the face up top, the pendulum behind glass
registerProp('in_ck_grand', () => {
  const faces = new Map<string, HTMLCanvasElement>();
  const cache = new Map<string, HTMLCanvasElement>();
  const art = stand(pc(16, 46).toCanvas(), { base: 16, contact: 12, shadow: 0 });
  art.img = (env: PropEnv) => {
    const [h, m, s] = stageTime(env);
    const sw = Math.round(pendulum(env, 2000) * 3);
    const key = `${h}:${m}:${s}:${sw}`;
    let c = cache.get(key);
    if (c) return c;
    const p = pc(16, 46);
    p.rect(2, 0, 12, 46, P.woodDark);
    p.rect(3, 1, 10, 44, '#6E4630');
    p.vline(3, 1, 44, P.wood);
    p.poly([[1, 3], [8, -1], [15, 3]], P.woodDark);
    p.hline(1, 14, 3, P.wood);
    // pendulum window
    p.rect(5, 17, 6, 20, P.shadeDeep);
    p.line(8, 17, 8 + sw, 31, P.brassOld);
    p.ellipse(8 + sw, 32, 2, 2, P.brass);
    p.set(7 + sw, 31, P.goldPale);
    p.hline(3, 12, 40, P.woodDark);
    p.rect(2, 44, 12, 2, P.woodDark);
    finish(p, { soft: true, rim: false });
    c = p.toCanvas();
    c.getContext('2d')!.drawImage(clockImg(faces, 4, h, m, s, { face: P.paper, rim: P.brassOld }), 2, 5);
    cache.set(key, c);
    return c;
  };
  return art;
});

// the wall of clocks behind the counter (2–5, 0): six faces of different frames
const WALLCLOCKS: [number, number, number, string, string][] = [
  [2, 4, 5, P.woodDark, P.paper],
  [16, 2, 4, P.brassOld, P.white],
  [28, 6, 5, P.navy, P.paper],
  [43, 3, 4, P.maroon, P.goldPale],
  [54, 7, 3, P.woodLt, P.white],
  [8, 17, 3, P.steel, P.white],
];
registerProp('in_ck_wall', () => {
  const faces = new Map<string, HTMLCanvasElement>();
  const cache = new Map<string, HTMLCanvasElement>();
  return {
    ox: 0,
    oy: 0,
    w: 64,
    h: 30,
    foot: 0,
    flat: true,
    img: (env: PropEnv) => {
      const [h, m, s] = stageTime(env);
      // stage 2: all the seconds go one on and one back together
      const sec = env.stage === 2 ? (Math.floor(env.t / 1000) % 2 ? 1 : 0) : s;
      const key = `${h}:${m}:${sec}`;
      let c = cache.get(key);
      if (c) return c;
      c = document.createElement('canvas');
      c.width = 64;
      c.height = 30;
      const g = c.getContext('2d')!;
      for (const [x, y, r, rim, face] of WALLCLOCKS) {
        g.drawImage(clockImg(faces, r, h, m, sec, { rim, face }), x, y);
      }
      // a square clock with a little pendulum of its own
      const sq = pc(12, 14);
      sq.rect(0, 0, 12, 14, P.woodDark);
      sq.rect(1, 1, 10, 7, P.paper);
      sq.hline(6, 8, 4, P.ink);
      sq.vline(6, 2, 4, P.ink);
      sq.rect(3, 9, 6, 4, P.shadeDeep);
      sq.set(6, 12, P.brass);
      g.drawImage(sq.toCanvas(), 26, 16);
      cache.set(key, c);
      return c;
    },
  } as PropArt;
});

// the cuckoo clock (6, 0): stage 0 closed, the pine-cone weights; stage 1 the bird half out, frozen; stage 2 in and out
registerProp('in_ck_cuckoo', () => {
  const faces = new Map<string, HTMLCanvasElement>();
  const cache = new Map<string, HTMLCanvasElement>();
  return {
    ox: 1,
    oy: 0,
    w: 14,
    h: 32,
    foot: 0,
    flat: true,
    img: (env: PropEnv) => {
      const [h, m] = stageTime(env);
      const bird = env.stage === 1 ? 1 : env.stage === 2 ? Math.floor(env.t / 700) % 3 : 0;
      const sw = Math.round(pendulum(env, 1000) * 2);
      const key = `${h}:${m}:${bird}:${sw}`;
      let c = cache.get(key);
      if (c) return c;
      const p = pc(14, 32);
      // the carved house: roof, walls, the little door
      p.poly([[0, 6], [7, 0], [13, 6]], P.woodDark);
      p.hline(0, 13, 6, P.wood);
      p.rect(1, 7, 12, 13, '#6E4630');
      p.vline(1, 7, 19, P.wood);
      p.set(3, 8, P.leaf);
      p.set(10, 8, P.leaf);
      p.rect(5, 2, 4, 4, P.shadeDeep);
      if (bird === 0) p.rect(5, 2, 4, 4, P.woodLt);
      else {
        // the bird: half out (1) or all out (2)
        const bx = bird === 1 ? 6 : 5;
        p.rect(bx, 3, 3, 2, P.sky);
        p.set(bx - 1, 4, P.brass);
        p.set(bx + 1, 3, P.ink);
        p.set(9, 2, P.woodLt);
      }
      // the pendulum and the pine-cone weights on chains
      p.line(7, 20, 7 + sw, 27, P.brassOld);
      p.rect(6 + sw, 27, 3, 3, P.woodLt);
      p.vline(3, 20, 26, P.steel);
      p.vline(11, 20, 23, P.steel);
      p.rect(2, 27, 3, 4, P.brassOld);
      p.rect(10, 24, 3, 4, P.brassOld);
      c = p.toCanvas();
      c.getContext('2d')!.drawImage(clockImg(faces, 3, h, m, 0, { second: false, face: P.paper, rim: P.woodDark }), 3, 11);
      cache.set(key, c);
      return c;
    },
  } as PropArt;
});

// the glass counter (2–6,3): watches on velvet, the workbench end with the loupe and an opened watch
registerProp('in_ck_counter', () =>
  prop(80, 22, (p) => {
    p.rect(1, 4, 78, 18, P.woodDark);
    p.rect(2, 5, 76, 8, P.shadeDeep);
    p.rect(3, 6, 42, 6, P.maroon);
    for (let i = 0; i < 7; i++) {
      const x = 6 + i * 6;
      p.ellipse(x, 8.5, 1.5, 1.5, i % 3 === 0 ? P.gold : i % 3 === 1 ? P.concreteLt : P.brass);
      p.set(x, 8, P.white);
      p.hline(x - 1, x + 1, 11, P.woodDark);
    }
    // the small waterproof watch for children (blue)
    p.ellipse(38, 8.5, 1.5, 1.5, P.blue);
    p.set(38, 8, P.white);
    p.hline(2, 77, 4, P.concreteLt);
    p.hline(2, 77, 5, P.white);
    // the workbench end (x 48–63): mat, loupe, tweezers, an opened watch and its wheels
    p.rect(48, 5, 28, 8, P.leafShade);
    p.ellipse(55, 8, 3, 3, P.concrete);
    p.ellipse(55, 8, 2, 2, P.gold);
    for (let i = 0; i < 4; i++) p.set(60 + i * 2, 7 + (i % 2), P.brass);
    p.rect(69, 6, 3, 3, P.charcoal);
    p.set(70, 6, P.aqua);
    p.line(73, 10, 77, 6, P.steel);
    p.hline(1, 78, 13, P.wood);
    for (let i = 4; i < 78; i += 12) p.vline(i, 14, 21, '#3A2418');
    p.hline(1, 78, 21, '#3A2418');
  }, { cx: 40, base: 16, contact: 72, shadow: 0 }),
);

// the repair shelf (7–8,2): clocks with paper tags; the last alarm clock's tag has no name
registerProp('in_ck_repair', () =>
  prop(32, 40, (p) => {
    p.rect(1, 2, 30, 38, P.wood);
    p.vline(1, 2, 39, P.woodLt);
    p.vline(30, 3, 39, P.woodDark);
    for (const sy of [4, 16, 28]) {
      p.rect(2, sy, 28, 10, P.shadeDeep);
      p.hline(2, 29, sy + 10, P.woodDark);
    }
    const items: [number, number, string][] = [
      [5, 8, P.gold],
      [13, 8, P.concreteLt],
      [22, 8, P.maroon],
      [5, 20, P.white],
      [14, 20, P.brass],
      [23, 20, P.leaf],
      [6, 32, P.navy],
      [16, 32, P.concreteLt],
      [25, 32, P.red],
    ];
    for (const [x, y, c] of items) {
      p.ellipse(x, y, 2.5, 2.5, c);
      p.ellipse(x, y, 1.5, 1.5, P.white);
      p.set(x, y, P.ink);
      p.rect(x + 1, y + 3, 3, 2, P.paper);
    }
    // the alarm clock at the end: bells on top, the blank tag
    p.set(24, 29, P.gold);
    p.set(27, 29, P.gold);
    p.rect(26, 35, 4, 3, P.white);
  }, { cx: 16, base: 16, contact: 28, shadow: 0 }),
);

// the candy tin on a round stool (1,5): 『ご自由に どうぞ』 (empty after the find)
registerProp('in_ck_candy', () => {
  const make = (full: boolean) => {
    const p = pc(16, 24);
    p.ellipse(8, 11, 6, 2, P.woodLt);
    p.hline(3, 13, 12, P.wood);
    p.vline(7, 13, 22, P.woodDark);
    p.vline(9, 13, 22, P.woodDark);
    p.hline(4, 12, 22, P.woodDark);
    p.rect(4, 5, 8, 6, P.aqua);
    p.hline(4, 11, 5, '#BDEFFA');
    p.rect(5, 7, 6, 2, P.white);
    if (full) {
      p.set(6, 4, P.white);
      p.set(8, 3, '#BDEFFA');
      p.set(9, 4, P.white);
    }
    finish(p, { soft: true });
    return p.toCanvas();
  };
  const full = make(true);
  const empty = make(false);
  const a = stand(full, { base: 16, contact: 10, shadow: 0 });
  a.img = (env: PropEnv) => (env.flag('flag_find_ck_candy') ? empty : full);
  return a;
});

// the table of alarm clocks (4–5,5): ten, all set to 7; in stage 2 one shivers
registerProp('in_ck_table', () => {
  const frames = mkFrames(2, 32, 20, (p, k) => {
    p.rect(1, 8, 30, 4, P.woodLt);
    p.hline(1, 30, 8, '#DCC08A');
    p.rect(3, 12, 2, 8, P.wood);
    p.rect(27, 12, 2, 8, P.wood);
    for (let i = 0; i < 10; i++) {
      const x = 3 + (i % 5) * 6;
      const y = i < 5 ? 3 : 6;
      const dx = i === 7 && k ? 1 : 0;
      const c = [P.red, P.gold, P.leaf, P.blue, P.white][i % 5];
      p.ellipse(x + 1.5 + dx, y + 1.5, 2, 2, c);
      p.set(x + 1 + dx, y + 1, P.white);
      p.set(x + dx, y - 1, P.brass);
      p.set(x + 3 + dx, y - 1, P.brass);
    }
  }, (p) => finish(p, { soft: true }));
  const a = stand(frames[0], { cx: 16, base: 16, contact: 28, shadow: 0 });
  a.img = (env: PropEnv) => frames[env.stage === 2 && Math.floor(env.t / 90) % 2 ? 1 : 0];
  return a;
});

void blend;
void cardboard;
void dk;
void lt;
void handGlyph;
void tiny;
void screenPool;
void PixelCanvas;
