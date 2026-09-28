// しんごの家 (map_shingo) and ふでの書道教室 (map_shodo) — 30_level_art 4.7 / 4.8.
//
// しんごの家: a six-mat 茶の間 with sand walls under the 長押, a window with a
// mikan wind-bell, the 『柑橘の なかま』 poster (たんかん ringed three times),
// the calendar (『ボウズ 5時』), the old cream fridge with twelve mikan
// magnets, the tea chest with 『詰将棋 100題』, the CRT on its stand (high
// school baseball), mikan boxes to the ceiling (the 『鹿児島』 slot empty),
// the chabudai with a bowl of mikan and peel flowers, the standing fan, and
// by the tataki the 『ご自由に どうぞ』 box and the shoe chest.
//
// ふでの書道教室: white plaster, the alcove with a scroll no one can read and
// one sunflower, the summer homework drying on a line (they flutter in the
// fan's wind; in stage 2 their ink fades), the pendulum clock, the copybook
// shelf, the teacher's low desk (red ink, a sheet with a はなまる), two long
// desks with their inkstones and cushions, and the mosquito coil.

import type { Gfx } from '../../engine/gfx';
import { PixelCanvas } from '../../engine/pixel';
import { ihash, valueNoise } from '../tiles/noise';
import { P } from '../tiles/palette';
import { cardboard, framed, notice, pc, prop } from './ifurn';
import { blend, screenPool } from './ishell';
import { castRight, dk, finish, lt } from './kit';
import { mkFrames, stand } from './pkit';
import { registerProp } from './registry';
import { fontTextSmall, printLines, tiny } from './text';
import type { PropArt, PropEnv } from './types';
import { clockImg, pendulum, roomShell, spin, stageTime, tataki, tatami } from './int_north_kit';

const MIKAN = P.sun;
const MIKAN_LT = P.sky;
const MIKAN_DK = '#C8643A';

/** A mikan (3×3 or 4×3) at x,y with its highlight and the leaf dot. */
function mikan(p: PixelCanvas, x: number, y: number, big = false): void {
  const w = big ? 4 : 3;
  p.rect(x, y, w, 3, MIKAN);
  p.set(x, y, MIKAN_LT);
  p.hline(x + 1, x + w - 1, y + 2, MIKAN_DK);
  p.set(x + w - 1, y + 1, MIKAN_DK);
  if (y > 0) p.set(x + 1, y - 1, P.leafDeep);
}

// ================================================================ しんごの家

/** 砂壁 (a warm sand wall) under the 長押 beam, a pillar at the corners. */
function sandWall(seed: number): (x: number, y: number) => string {
  return (x, y) => {
    if (y >= 5 && y <= 7) return y === 5 ? P.woodLt : y === 7 ? P.woodDark : P.wood;
    if (x % 64 < 3 && x > 8) return x % 64 === 0 ? P.woodLt : x % 64 === 2 ? P.woodDark : P.wood;
    const n = valueNoise(x / 3, y / 3, seed);
    return n > 0.8 ? '#EADCB6' : n < 0.18 ? '#C8B488' : '#DCCB9E';
  };
}

registerProp('in_sg_shell', () =>
  roomShell({
    map: 'map_shingo',
    floor: (x, y, _tx, _ty, ch) => (ch === 'g' ? tataki(8101)(x, y) : tatami(1)(x, y)),
    wall: sandWall(8103),
    trim: P.woodLt,
    base: P.woodDark,
    baseH: 2,
    door: 'shoji',
    ext: {
      town: [11, 20],
      bld: [8, 13, 16],
      skin: [P.woodLt, P.wood, P.woodDark],
      roof: 'slab',
      seed: 8105,
      props: [
        { id: 'prop_engawa_bench', tx: 9, ty: 21 },
        { id: 'obj_pots_1', tx: 12, ty: 21 },
      ],
    },
    lamps: [[88, 70, 44, 22, P.sky]],
    deco(p) {
      // the calendar (3, 0–1): 8月, the 31st ringed, 『ボウズ 5時』
      p.rect(51, 9, 11, 16, P.paper);
      p.rect(51, 9, 11, 4, P.red);
      tiny(p, '8', 55, 9, P.white);
      for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) p.set(52 + c * 3, 15 + r * 2, P.steel);
      p.ring(58.5, 21.5, 2, 1.5, P.verm);
      p.hline(52, 57, 23, P.ink);
      castRight(p, 51, 9, 11, 16, 1);
      p.set(56, 8, P.verm);
      // the window (5, 0–1): a sunset through the glass, frame and sill
      p.rect(81, 8, 14, 18, P.woodDark);
      p.rect(82, 9, 12, 16, P.sky);
      p.rect(82, 17, 12, 8, P.sun);
      p.rect(82, 22, 12, 3, P.crimson);
      p.vline(87, 9, 24, P.woodDark);
      p.hline(82, 93, 16, P.woodDark);
      p.hline(80, 95, 26, P.woodLt);
      // the poster (6–7, 0–1): 『柑橘の なかま』, six citrus, たんかん ringed ×3
      p.rect(99, 5, 26, 22, P.paper);
      p.rect(99, 5, 26, 4, P.leafDeep);
      printLines(p, 101, 6, 20, 1, P.white, 81);
      const fruits: [number, number, string, number][] = [
        [102, 11, MIKAN, 3],
        [110, 11, P.gold, 4],
        [118, 11, '#F2A04B', 3],
        [102, 18, '#F2894B', 4],
        [110, 18, P.goldPale, 4],
        [118, 18, MIKAN, 3],
      ];
      for (const [fx, fy, c, s] of fruits) {
        p.rect(fx, fy, s, s - 1, c);
        p.set(fx, fy, lt(c));
        p.set(fx + s - 1, fy + s - 2, dk(c));
        p.set(fx + 1, fy - 1, P.leafDeep);
        p.hline(fx - 1, fx + 4, fy + s, P.steel);
      }
      // たんかん (bottom right) ringed three times in red
      p.ring(119.5, 19.5, 4, 3.5, P.verm);
      p.ring(119.5, 19.5, 5, 4.5, P.red);
      p.set(115, 16, P.verm);
      p.set(124, 22, P.verm);
      castRight(p, 99, 5, 26, 22, 2);
      p.set(100, 6, P.verm);
      p.set(123, 6, P.verm);
      // a framed photo high on the east wall (the kid and him at the board)
      const [ix, iy, iw, ih] = framed(p, 140, 8, 12, 10, P.woodDark);
      p.rect(ix, iy, iw, ih, P.goldPale);
      p.rect(ix + 1, iy + 4, 3, 4, P.navy);
      p.rect(ix + 6, iy + 3, 3, 5, P.white);
      p.rect(ix + 3, iy + 6, 4, 2, P.woodLt);
    },
  }),
);

// the window's mikan wind-bell (5, 0): sways (a bell and a paper strip)
registerProp('in_sg_furin', () => {
  const frames = mkFrames(5, 12, 22, (p, k) => {
    const sw = k - 2;
    p.vline(6, 0, 4, P.charcoal);
    // the bell: a little mikan of glass
    p.ellipse(6, 7, 3, 2.5, MIKAN);
    p.set(5, 6, P.glint);
    p.hline(4, 8, 9, MIKAN_DK);
    p.set(6, 4, P.leafDeep);
    // the clapper and the paper strip on its string
    p.set(6 + Math.sign(sw), 10, P.steel);
    p.line(6, 10, 6 + sw, 14, P.charcoal);
    p.rect(5 + sw * 2, 14, 3, 6, P.paper);
    p.set(6 + sw * 2, 16, P.verm);
    p.vline(7 + sw * 2, 14, 19, P.paperGrid);
  });
  return {
    ox: 2,
    oy: 4,
    w: 12,
    h: 22,
    foot: 0,
    flat: true,
    img: (env: PropEnv) => {
      if (env.stage === 1) return frames[4];
      const a = Math.sin(env.mt / (env.stage === 2 ? -560 : 560));
      return frames[Math.max(0, Math.min(4, Math.round(2 + a * 2)))];
    },
  } as PropArt;
});

// the old cream fridge (1,2): two doors, twelve mikan magnets, a calendar strip
registerProp('in_sg_fridge', () =>
  prop(16, 36, (p) => {
    p.rect(1, 1, 14, 35, '#EDE6D2');
    p.vline(1, 1, 35, P.white);
    p.vline(14, 2, 35, P.concrete);
    p.hline(1, 14, 1, P.white);
    p.hline(1, 14, 12, P.concrete);
    p.hline(1, 14, 13, P.steel);
    p.rect(12, 4, 1, 6, P.steel);
    p.rect(12, 16, 1, 9, P.steel);
    // magnets
    for (let k = 0; k < 12; k++) {
      const x = 3 + (k % 4) * 2 + (k >= 8 ? 1 : 0);
      const y = 16 + Math.floor(k / 4) * 3 + (k % 2);
      p.set(x, y, MIKAN);
      p.set(x, y - 1, P.leafDeep);
    }
    // a note under a magnet on the freezer door
    p.rect(3, 4, 5, 6, P.paper);
    printLines(p, 3, 5, 4, 2, P.steel, 811);
    p.set(5, 3, MIKAN);
    p.hline(1, 14, 35, P.steel);
  }, { base: 16, contact: 12, shadow: 0 }),
);

// the tea chest (2,2): glass doors, cups, 『詰将棋 100題』 on top, a mikan-shaped tin
registerProp('in_sg_tansu', () =>
  prop(16, 30, (p) => {
    p.rect(1, 6, 14, 24, P.wood);
    p.hline(1, 14, 6, P.woodLt);
    p.vline(1, 6, 29, P.woodLt);
    p.vline(14, 7, 29, P.woodDark);
    // glass doors with cups
    p.rect(2, 8, 12, 9, P.shadeDeep);
    p.vline(8, 8, 16, P.woodDark);
    for (const [x, c] of [[3, P.white], [5, P.leafYoung], [10, P.white], [12, P.aqua]] as [number, string][]) {
      p.rect(x, 13, 2, 3, c);
      p.set(x, 13, P.glint);
    }
    p.hline(2, 13, 12, P.woodLt);
    // drawers
    p.hline(2, 13, 19, P.woodDark);
    p.hline(2, 13, 24, P.woodDark);
    p.set(8, 21, P.brass);
    p.set(8, 26, P.brass);
    p.hline(1, 14, 29, P.woodDark);
    // on top: the shogi problem book and the mikan tin
    p.rect(2, 3, 7, 3, P.paper);
    p.rect(2, 2, 7, 1, P.verm);
    p.vline(8, 2, 5, P.paperGrid);
    p.rect(10, 2, 4, 4, MIKAN);
    p.set(10, 2, MIKAN_LT);
    p.set(12, 1, P.leafDeep);
  }, { base: 16, contact: 12, shadow: 0 }),
);

// the CRT on its stand (4,2): high school baseball; stage 1 a frozen pitch, stage 2 the ball flies back
const TV_FRAMES = mkFrames(4, 16, 13, (p, k) => {
  p.rect(0, 0, 16, 13, '#3A7A4A');
  p.rect(0, 0, 16, 4, '#5FA85A');
  // the mound and the pitcher (a white figure), the ball on its way (k)
  p.ellipse(8, 8, 4, 1.5, P.woodLt);
  p.rect(7, 4, 2, 4, P.white);
  p.set(7, 3, P.skin3);
  const bx = [9, 11, 13, 15][k];
  p.set(bx, 6, P.white);
  p.hline(0, 15, 12, P.ink);
  // scanlines
  for (let y = 1; y < 12; y += 2) for (let x = 0; x < 16; x += 3) blend(p, x, y, P.ink, 0.25);
});
registerProp('in_sg_tv', () => {
  const body = pc(18, 30);
  // stand
  body.rect(1, 20, 16, 10, P.woodDark);
  body.hline(1, 16, 20, P.wood);
  body.rect(3, 23, 12, 5, P.shadeDeep);
  body.rect(4, 24, 4, 3, P.navy);
  // the set: wood-grain cabinet, a bulging screen
  body.rect(0, 3, 18, 17, P.woodDark);
  body.hline(0, 17, 3, P.wood);
  body.rect(1, 4, 13, 14, P.charcoal);
  body.rect(15, 5, 2, 12, P.wood);
  body.set(15, 7, P.brass);
  body.set(15, 10, P.brass);
  body.vline(16, 12, 16, P.woodDark);
  // rabbit-ear antenna
  body.line(6, 3, 3, 0, P.steel);
  body.line(9, 3, 12, 0, P.steel);
  finish(body, { soft: true });
  const img = body.toCanvas();
  const cache = new Map<number, HTMLCanvasElement>();
  const a = stand(img, { base: 16, contact: 14, shadow: 0 });
  a.img = (env: PropEnv) => {
    const k = env.stage === 1 ? 0 : env.stage === 2 ? 3 - (Math.floor(env.t / 260) % 4) : Math.floor(env.mt / 260) % 4;
    let c = cache.get(k);
    if (!c) {
      const ctx = document.createElement('canvas');
      ctx.width = 18;
      ctx.height = 30;
      const g2 = ctx.getContext('2d')!;
      g2.drawImage(img, 0, 0);
      g2.drawImage(TV_FRAMES[k], 0, 0, 16, 13, 2, 5, 12, 12);
      c = ctx;
      cache.set(k, c);
    }
    return c;
  };
  a.glow = (g: Gfx, x: number, y: number, env: PropEnv) => {
    const fl = env.stage === 1 ? 0.2 : 0.2 + (Math.floor(env.t / 180) % 3) * 0.05;
    screenPool(g, x + 8, y + a.oy + 11, 9, 7, P.aqua, fl);
  };
  a.light = (g: Gfx, x: number, y: number) => {
    screenPool(g, x + 8, y + 20, 14, 8, P.aqua, 0.12);
  };
  return a;
});

// mikan boxes up to the ceiling (8–9,2): prefecture stamps; the top slot 『鹿児島』 empty
registerProp('in_sg_boxes', () =>
  prop(32, 56, (p) => {
    const rowsY = [42, 29, 16, 3];
    rowsY.forEach((y, r) => {
      for (let c = 0; c < 2; c++) {
        if (r === 3 && c === 1) {
          // the empty slot: a paper tag 『鹿児島』 pinned on the box below
          p.rect(18, y + 7, 9, 5, P.paper);
          p.hline(19, 25, y + 9, P.ink);
          p.set(22, y + 6, P.verm);
          continue;
        }
        const x = 1 + c * 15;
        cardboard(p, x, y, 15, 13, 3, 8200 + r * 3 + c);
        // the printed mikan logo and the prefecture word
        p.ellipse(x + 4.5, y + 8.5, 2, 2, MIKAN);
        p.set(x + 4, y + 7, MIKAN_LT);
        p.set(x + 5, y + 6, P.leafDeep);
        p.hline(x + 8, x + 12, y + 8, P.verm);
        p.hline(x + 8, x + 11, y + 10, P.woodDark);
      }
    });
  }, { base: 16, contact: 26, shadow: 0 }),
);

// the purple zabuton (3,4), flat (the 10円 under it)
registerProp('in_sg_zabuton', () => {
  const p = pc(16, 16);
  p.rect(2, 3, 12, 10, '#7A5AA0');
  p.hline(3, 12, 3, '#9A7AC0');
  p.vline(2, 4, 12, '#9A7AC0');
  p.hline(2, 13, 12, '#4A3A6E');
  p.vline(13, 3, 12, '#4A3A6E');
  p.set(7, 7, P.gold);
  p.set(8, 8, P.gold);
  for (const [x, y] of [[3, 4], [12, 4], [3, 11], [12, 11]]) p.set(x, y, P.gold);
  const img = p.toCanvas();
  return { ox: 0, oy: 0, w: 16, h: 16, foot: 0, flat: true, img: () => img } as PropArt;
});

// the chabudai (4–5,4): a round low table, a bowl of mikan, peel flowers, 麦茶
registerProp('in_sg_table', () =>
  prop(32, 18, (p) => {
    p.ellipse(16, 7, 14, 6, P.wood);
    p.ellipse(16, 6, 14, 5.5, '#A8784A');
    p.ellipse(15, 5.5, 11, 4, P.woodLt);
    p.hline(3, 28, 12, P.woodDark);
    p.rect(5, 12, 2, 5, P.woodDark);
    p.rect(25, 12, 2, 5, P.woodDark);
    // the bowl
    p.ellipse(11, 6, 5, 2.5, P.white);
    p.ellipse(11, 5.5, 4, 1.5, P.aqua);
    mikan(p, 8, 3);
    mikan(p, 11, 2, true);
    mikan(p, 13, 4);
    // two peel flowers
    for (const cx of [20, 25]) {
      for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) p.set(cx + dx, 6 + dy, MIKAN);
      p.set(cx, 6, P.goldPale);
    }
    // a glass of barley tea
    p.rect(17, 2, 2, 3, P.brass);
    p.set(17, 2, P.goldPale);
  }, { base: 16, contact: 26, shadow: 0 }),
);

// the standing fan (1,5): swings its head, blades turn (stops in stage 1, backwards in stage 2)
registerProp('in_sg_fan', () => {
  const frames: HTMLCanvasElement[] = [];
  for (const yaw of [-1, 0, 1])
    for (let b = 0; b < 3; b++) {
      const p = pc(16, 30);
      p.ellipse(8, 27.5, 5.5, 2, P.concrete);
      p.hline(4, 12, 27, P.white);
      p.vline(8, 14, 26, P.concreteLt);
      p.vline(9, 15, 26, P.steel);
      const cx = 8 + yaw;
      const rx = yaw ? 4.6 : 5.6;
      for (let y = 0; y < 16; y++)
        for (let x = 0; x < 16; x++) {
          const dx = (x + 0.5 - (cx + 0.5)) / rx;
          const dy = (y + 0.5 - 7.5) / 5.6;
          const d = Math.hypot(dx, dy);
          if (d > 1) continue;
          if (d > 0.82) {
            p.set(x, y, dx < -0.2 || dy < -0.5 ? P.white : P.concrete);
            continue;
          }
          const ang = ((Math.atan2(dy, dx) * 180) / Math.PI + 360 + b * 40) % 120;
          p.set(x, y, ang < 50 && d > 0.2 ? (dx + dy < 0 ? P.leafLt : P.leafYoung) : d < 0.22 ? P.white : P.shadeDeep);
        }
      p.set(cx, 7, P.steel);
      finish(p, { soft: true, rim: false });
      frames.push(p.toCanvas());
    }
  const a = stand(frames[4], { base: 16, contact: 10, shadow: 0 });
  a.img = (env: PropEnv) => {
    const sway = Math.sin(env.mt / 1900);
    const yi = sway < -0.45 ? 0 : sway > 0.45 ? 2 : 1;
    const bi = Math.floor(spin(env, 165) * 3) % 3;
    return frames[yi * 3 + bi];
  };
  return a;
});

// 『ご自由に どうぞ』 box by the tataki (8,6): one summer mikan until it's taken
registerProp('in_sg_freebox', () => {
  const make = (full: boolean) => {
    const p = pc(16, 16);
    cardboard(p, 1, 5, 14, 10, 3, 8301);
    p.rect(3, 9, 9, 4, P.paper);
    fontTextSmall(p, 'ご自由に', 3, 9, P.ink);
    if (full) {
      mikan(p, 6, 3, true);
      p.set(7, 2, P.leafDeep);
    }
    finish(p, { soft: true });
    return p.toCanvas();
  };
  const full = make(true);
  const empty = make(false);
  const a = stand(full, { base: 16, contact: 12, shadow: 0 });
  a.img = (env: PropEnv) => (env.flag('flag_find_sg_freebox') ? empty : full);
  return a;
});

// the shoe chest (9,6): a mikan-shaped piggy bank and a potted plant on top
registerProp('in_sg_getabako', () =>
  prop(16, 26, (p) => {
    p.rect(1, 8, 14, 18, P.woodLt);
    p.hline(1, 14, 8, '#DCC08A');
    p.vline(14, 9, 25, P.wood);
    p.vline(8, 9, 25, P.wood);
    for (const y of [13, 18, 23]) p.hline(2, 13, y, P.wood);
    p.set(6, 16, P.brass);
    p.set(10, 16, P.brass);
    p.rect(3, 3, 5, 5, MIKAN);
    p.set(3, 3, MIKAN_LT);
    p.set(5, 2, P.leafDeep);
    p.hline(4, 6, 4, P.woodDark);
    p.rect(10, 4, 3, 4, P.skin4);
    p.rect(9, 1, 5, 3, P.leaf);
    p.set(10, 1, P.leafYoung);
  }, { base: 16, contact: 12, shadow: 0 }),
);

// ================================================================ ふでの書道教室

function plasterWhite(seed: number): (x: number, y: number) => string {
  return (x, y) => {
    if (y >= 5 && y <= 7) return y === 5 ? P.woodLt : y === 7 ? P.woodDark : P.wood;
    if (x % 80 < 3 && x > 8) return x % 80 === 0 ? P.woodLt : x % 80 === 2 ? P.woodDark : P.wood;
    return valueNoise(x / 6, y / 4, seed) > 0.82 ? P.white : P.concreteLt;
  };
}

registerProp('in_sd_shell', () =>
  roomShell({
    map: 'map_shodo',
    floor: (x, y, _tx, _ty, ch) => (ch === 'g' ? tataki(8401)(x, y) : tatami(0)(x, y)),
    wall: plasterWhite(8403),
    trim: P.woodLt,
    base: P.woodDark,
    baseH: 2,
    door: 'wood',
    ext: {
      town: [17, 20],
      bld: [14, 18, 16],
      skin: [P.concreteLt, P.concrete, P.steel],
      roof: 'kawara',
      seed: 8405,
      props: [
        { id: 'obj_pots_3', tx: 14, ty: 21 },
        { id: 'tree_keyaki', tx: 22, ty: 20 },
      ],
    },
    lamps: [[88, 66, 50, 22, P.goldPale]],
    deco(p) {
      // the alcove (1, 0–1): a darker recess and the hanging scroll
      p.rect(17, 3, 14, 29, '#C8C2B4');
      p.vline(17, 3, 31, P.woodDark);
      p.vline(30, 3, 31, P.wood);
      p.rect(20, 5, 8, 22, P.paper);
      p.hline(19, 28, 4, P.woodDark);
      p.hline(19, 28, 27, P.woodDark);
      p.set(23, 3, P.charcoal);
      p.set(24, 3, P.charcoal);
      // calligraphy too fluent to read: one long running stroke
      const pts: [number, number][] = [[22, 7], [25, 9], [22, 12], [26, 14], [23, 17], [25, 20], [22, 22], [25, 24]];
      for (let i = 1; i < pts.length; i++) p.line(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], P.ink);
      p.set(26, 25, P.verm);
      // the copybook shelf's wall: a framed certificate (9, 0–1)
      const [ix, iy, iw, ih] = framed(p, 146, 8, 12, 14, P.woodDark);
      p.rect(ix, iy, iw, ih, P.paper);
      printLines(p, ix + 1, iy + 2, iw - 2, 4, P.steel, 841);
      p.set(ix + iw - 2, iy + ih - 2, P.verm);
    },
  }),
);

// the summer homework drying on a line (2–6, 0): five sheets, fluttering; in stage 2 the ink fades
const WORKS = ['夕', 'す', '花', '宿', 'は'];
registerProp('in_sd_works', () => {
  const cache = new Map<string, HTMLCanvasElement>();
  const make = (k: number, fade: number) => {
    const key = `${k}:${fade}`;
    let c = cache.get(key);
    if (c) return c;
    const p = pc(80, 30);
    p.line(0, 3, 79, 3, P.charcoal);
    for (let i = 0; i < 5; i++) {
      const x = 3 + i * 16;
      const lift = (k + i) % 3 === 0 ? 1 : 0;
      p.rect(x, 4 + lift, 11, 16 - lift, P.white);
      p.vline(x + 10, 5 + lift, 19, P.paperGrid);
      p.hline(x, x + 10, 19, P.paperGrid);
      p.rect(x + 4, 2, 3, 3, P.woodLt);
      // the big stroke (one kana / kanji written boldly)
      const ink = fade >= 2 && i !== 0 ? P.paperGrid : fade >= 1 && i % 2 === 1 ? P.steel : P.ink;
      fontTextSmall(p, WORKS[i], x + 2, 7 + lift, ink, 1);
      if (i === 4 && fade < 2) p.ring(x + 5.5, 13.5, 4, 4, P.verm);
      // a name at the foot
      p.vline(x + 8, 16, 18, fade >= 2 ? P.paperGrid : P.steel);
    }
    c = p.toCanvas();
    cache.set(key, c);
    return c;
  };
  return {
    ox: 0,
    oy: 2,
    w: 80,
    h: 30,
    foot: 0,
    flat: true,
    img: (env: PropEnv) => {
      const k = env.stage === 1 ? 0 : Math.floor(env.mt / 420) % 3;
      const fade = env.stage >= 2 ? 1 + (Math.floor(env.t / 3000) % 2) : 0;
      return make(k, fade);
    },
  } as PropArt;
});

// the pendulum clock on the wall (7, 0)
registerProp('in_sd_clock', () => {
  const cache = new Map<string, HTMLCanvasElement>();
  const faces = new Map<string, HTMLCanvasElement>();
  return {
    ox: 1,
    oy: 1,
    w: 14,
    h: 30,
    foot: 0,
    flat: true,
    img: (env: PropEnv) => {
      const [h, m, s] = stageTime(env);
      const sw = Math.round(pendulum(env, 1400) * 3);
      const key = `${h}:${m}:${s}:${sw}`;
      let c = cache.get(key);
      if (!c) {
        const p = pc(14, 30);
        p.rect(1, 0, 12, 29, P.woodDark);
        p.rect(2, 1, 10, 27, P.wood);
        p.vline(2, 1, 27, P.woodLt);
        p.rect(3, 14, 8, 12, P.shadeDeep);
        // the pendulum behind glass
        p.line(7, 14, 7 + sw, 22, P.brassOld);
        p.ellipse(7 + sw, 23, 1.5, 1.5, P.brass);
        p.set(6 + sw, 22, P.goldPale);
        p.hline(3, 10, 14, P.woodDark);
        c = p.toCanvas();
        const g = c.getContext('2d')!;
        g.drawImage(clockImg(faces, 4, h, m, s, { face: P.paper }), 2, 2);
        cache.set(key, c);
      }
      return c;
    },
  } as PropArt;
});

// the alcove's sunflower (1,2): a tall slim vase on a board
registerProp('in_sd_tokonoma', () =>
  prop(16, 28, (p) => {
    p.rect(1, 24, 14, 4, P.woodDark);
    p.hline(1, 14, 24, P.wood);
    p.rect(6, 15, 4, 9, P.navy);
    p.vline(6, 15, 23, P.blue);
    p.line(8, 15, 8, 6, P.leafShade);
    p.rect(9, 10, 3, 2, P.leaf);
    p.rect(4, 12, 3, 2, P.leafDeep);
    p.ellipse(8, 4, 3.5, 3.5, P.gold);
    p.ellipse(8, 4, 1.5, 1.5, P.woodDark);
    p.set(6, 2, P.goldPale);
  }, { base: 16, contact: 12, shadow: 0 }),
);

// the copybook shelf (9,2)
registerProp('in_sd_shelf', () =>
  prop(16, 34, (p) => {
    p.rect(1, 2, 14, 32, P.wood);
    p.vline(1, 2, 33, P.woodLt);
    p.vline(14, 3, 33, P.woodDark);
    p.hline(1, 14, 2, P.woodLt);
    for (const sy of [4, 14, 24]) {
      p.rect(2, sy, 12, 9, P.shadeDeep);
      for (let i = 0; i < 6; i++) {
        const c = [P.navy, P.paper, P.maroon, P.paperGrid, P.leafShade, P.paper][(i + sy) % 6];
        const hgt = 7 + ((i * 3 + sy) % 3) - 1;
        p.rect(2 + i * 2, sy + 9 - hgt, 2, hgt, c);
        p.set(2 + i * 2, sy + 9 - hgt, lt(c));
      }
      p.hline(2, 13, sy + 9, P.woodDark);
    }
  }, { base: 16, contact: 12, shadow: 0 }),
);

// the teacher's low desk (4–6,3): inkstone, red ink, brushes on a rest, a sheet with a はなまる
registerProp('in_sd_desk', () =>
  prop(48, 16, (p) => {
    p.rect(1, 3, 46, 7, '#6E4630');
    p.hline(1, 46, 3, P.woodLt);
    p.hline(1, 46, 4, P.wood);
    p.rect(3, 10, 3, 6, P.woodDark);
    p.rect(42, 10, 3, 6, P.woodDark);
    p.hline(1, 46, 9, P.woodDark);
    // felt mat and a sheet with a red はなまる
    p.rect(16, 4, 14, 5, P.navy);
    p.rect(18, 3, 10, 6, P.white);
    p.ring(23, 6, 3, 2, P.verm);
    p.set(26, 4, P.verm);
    // inkstone (black) and the red ink dish
    p.rect(7, 4, 6, 4, P.charcoal);
    p.rect(8, 5, 3, 2, P.ink);
    p.set(8, 5, P.asphalt);
    p.ellipse(35, 6, 2.5, 1.5, P.white);
    p.rect(34, 5, 3, 2, P.verm);
    // brushes on their rest
    p.hline(38, 44, 5, P.woodLt);
    p.hline(38, 44, 7, P.woodLt);
    p.set(38, 5, P.ink);
    p.set(38, 7, P.verm);
  }, { cx: 24, base: 16, contact: 40, shadow: 0 }),
);

// the pupils' long desks (2–3,5) and (6–7,5): inkstone, paperweight, a practice sheet
registerProp('in_sd_long', (opts) => {
  const v = Number(opts.v ?? 0);
  return prop(32, 16, (p) => {
    p.rect(1, 4, 30, 6, '#6E4630');
    p.hline(1, 30, 4, P.woodLt);
    p.rect(3, 10, 2, 6, P.woodDark);
    p.rect(27, 10, 2, 6, P.woodDark);
    p.hline(1, 30, 9, P.woodDark);
    // two places: felt, a sheet, the inkstone box
    for (const x of [2, 17]) {
      p.rect(x + 3, 4, 9, 5, P.navy);
      p.rect(x + 4, 4, 7, 5, P.white);
      p.hline(x + 4, x + 10, 4, P.steel);
      const ink = v === 1 ? P.ink : x === 2 ? P.ink : P.charcoal;
      p.line(x + 6, 5, x + 8, 7, ink);
      p.set(x + 9, 6, ink);
      p.rect(x, 5, 3, 3, P.charcoal);
      p.set(x, 5, P.asphalt);
    }
    if (v === 1) {
      // the nameplate practice: a pile of the same sheet, one ringed red
      p.rect(13, 1, 6, 3, P.white);
      p.hline(13, 18, 2, P.paperGrid);
      p.ring(16, 2, 2, 1, P.verm);
    } else {
      // the inkstone box with the red stub (the find)
      p.rect(13, 2, 5, 3, P.woodDark);
      p.hline(13, 17, 2, P.wood);
    }
  }, { cx: 16, base: 16, contact: 28, shadow: 0 });
});

// cushions (flat) behind the long desks
registerProp('in_sd_zabuton', (opts) => {
  const v = Number(opts.v ?? 0);
  const p = pc(16, 16);
  const c = v % 2 ? '#8A2E3A' : '#2F4A8A';
  p.rect(2, 2, 12, 9, c);
  p.hline(3, 12, 2, lt(c));
  p.hline(2, 13, 10, dk(c));
  p.set(7, 6, P.gold);
  const img = p.toCanvas();
  return { ox: 0, oy: 0, w: 16, h: 16, foot: 0, flat: true, img: () => img } as PropArt;
});

// the mosquito coil on its stand (1,6): smoke climbs, bends — frozen in stage 1, sinking back in stage 2
registerProp('in_sd_katori', () => {
  const base = pc(16, 14);
  base.ellipse(8, 10, 6, 3, P.charcoal);
  base.ellipse(8, 9.5, 5, 2.5, P.asphalt);
  // the green coil
  for (let a = 0; a < 18; a++) {
    const r = 1 + a * 0.22;
    const t = a * 0.9;
    base.set(Math.round(8 + Math.cos(t) * r), Math.round(9 + Math.sin(t) * r * 0.5), P.leafShade);
  }
  base.set(12, 9, P.red);
  finish(base, { soft: true, rim: false });
  const a = stand(base.toCanvas(), { base: 16, contact: 10, shadow: 0 });
  a.over = (g: Gfx, x: number, y: number, env: PropEnv) => {
    const tip = [x + 12, y + 11];
    const t = env.stage === 1 ? 900 : env.stage === 2 ? -env.mt : env.mt;
    for (let i = 0; i < 12; i++) {
      const k = (((t / 140 + i) % 12) + 12) % 12;
      const yy = tip[1] - k * 2;
      const bend = k > 6 ? (k - 6) * 1.2 : 0;
      const xx = tip[0] + Math.sin(k * 0.7 + t / 800) * 1 + bend;
      g.rect(Math.round(xx), Math.round(yy), 1, 1, P.white, 0.5 - k * 0.035);
    }
  };
  return a;
});
