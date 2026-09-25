// 星見台駅 and the roadside of the prefectural road (52_ch2_level_art 3.5,
// 3.7, 7.3 駅と駅前): the station nameboard, the buffer stop, the waiting
// hut's bench and its notebook (ふしぎ01), the ceiling fan, the vending
// machine (the brightest thing in the village), the ticket box of the
// unmanned station, the platform lamp, the bus stop and its timetable
// (ふしぎ02), the bus shelter, the honesty stand, the signpost with its one
// new board, the wayside gods, the round post box, サワコさん's stool, the
// empty house's mailbox (ふしぎ04) and the village's utility poles.

import type { Gfx } from '../../engine/gfx';
import { mix, PixelCanvas } from '../../engine/pixel';
import { ihash } from '../tiles/noise';
import { P } from '../tiles/palette';
import { POLE } from './wires';
import { dk, lt, outline } from './kit';
import { glowDot, HLIGHT, hs, nightK, paintFrames, regStand, standProp, starTop } from './hoshi_kit';
import { drawLight, poolEllipse } from './light';
import { registerProp } from './registry';
import { fontTextSmall, tiny } from './text';
import type { PropArt, PropEnv } from './types';

const done = (env: PropEnv, f: string) => env.flag('flag_' + f) > 0;

// ---------------------------------------------------------------- 駅名標 (22,44)

regStand(
  'prop_h_ekimeihyo',
  48,
  30,
  (p) => {
    // two posts
    for (const px of [8, 38]) {
      p.vline(px, 14, 29, P.concrete);
      p.vline(px + 1, 14, 29, P.steel);
      p.set(px, 29, P.asphalt);
    }
    // the white board
    p.rect(1, 0, 46, 17, P.white);
    p.hline(1, 46, 0, P.glint);
    p.hline(1, 46, 16, P.concrete);
    p.vline(46, 1, 16, P.concrete);
    fontTextSmall(p, 'ほしみだい', 4, 1, P.ink);
    tiny(p, 'HOSHIMIDAI', 4, 9, P.asphalt);
    // the bottom band: the next station only to the west (left)
    p.rect(1, 15, 46, 3, P.navy);
    p.hline(3, 5, 16, P.white);
    p.set(2, 16, P.white);
    p.set(3, 15, P.white);
    p.set(3, 17, P.white);
    p.hline(7, 16, 16, P.concrete);
    starTop(p, 1, 46, 0, P.glint);
  },
  { cx: 8, base: 16, shadow: 24 },
);

// ---------------------------------------------------------------- 車止め (34,46)

regStand(
  'prop_h_kurumadome',
  18,
  18,
  (p) => {
    // the rusty steel frame
    p.vline(2, 4, 17, P.asphalt);
    p.vline(15, 4, 17, P.charcoal);
    p.line(2, 17, 8, 9, P.asphalt);
    p.line(15, 17, 9, 9, P.charcoal);
    for (let y = 5; y < 17; y++) if (ihash(y, 1, 3701) % 3 === 0) p.set(2, y, P.brassOld);
    // the striped board
    for (let x = 1; x < 17; x++)
      for (let y = 3; y < 9; y++) p.set(x, y, Math.floor((x + y) / 3) % 2 ? P.white : P.verm);
    p.hline(1, 16, 3, P.glint);
    p.hline(1, 16, 8, P.vermShade);
    // a dew drop catching the starlight
    p.set(11, 4, P.glint);
  },
  { cx: 8, base: 16, shadow: 14 },
);

// ---------------------------------------------------------------- 待合室のベンチ (16,41) と駅ノート (18,41)

registerProp('prop_h_machiai_bench', () =>
  standProp(
    80,
    14,
    (p) => {
      // the long plank seat on four legs
      p.rect(1, 5, 78, 4, P.woodLt);
      p.hline(1, 78, 5, P.goldPale);
      p.hline(1, 78, 8, P.wood);
      for (const lx of [3, 26, 52, 75]) {
        p.vline(lx, 9, 13, P.wood);
        p.vline(lx + 1, 9, 13, P.woodDark);
      }
      // three hand-made cushions: navy, maroon, mustard
      const cols = [P.navy, P.maroon, P.brass];
      for (let k = 0; k < 3; k++) {
        const cx = 6 + k * 25 + (k === 1 ? 14 : 0);
        const c = cols[k];
        p.rect(cx, 2, 14, 4, c);
        p.hline(cx + 1, cx + 12, 1, lt(c));
        p.hline(cx, cx + 13, 5, dk(c));
        p.set(cx + 7, 3, dk(c)); // the tuft
        for (let i = cx + 1; i < cx + 13; i += 3) p.set(i, 2, lt(c));
      }
    },
    { cx: 40, base: 16, shadow: 0 },
  ),
);

/** The station notebook (ふしぎ01): a page turns every 6 s, its edge lit white. */
const NOTE = paintFrames(4, 12, 8, (p, k) => {
  // open notebook: blue cover edges, two pages
  p.rect(0, 2, 12, 6, P.blue);
  p.rect(1, 2, 5, 5, P.paper);
  p.rect(6, 2, 5, 5, P.paper);
  p.vline(6, 2, 6, P.paperGrid);
  for (let j = 3; j < 7; j += 1) {
    if (j % 2) continue;
    p.hline(2, 4, j, P.steel);
    p.hline(7, 9, j, P.steel);
  }
  // the turning page (frames 1–2), its lit edge
  if (k === 1) {
    p.rect(6, 1, 4, 5, P.white);
    p.vline(9, 1, 5, P.glint);
  } else if (k === 2) {
    p.rect(4, 0, 3, 6, P.white);
    p.vline(4, 0, 5, P.glint);
  }
  if (k === 3) {
    // after the stamp: a little bell doodled in the margin (2px)
    p.set(9, 5, P.brass);
    p.set(9, 4, P.brass);
    p.set(8, 5, P.brass);
  }
});
registerProp('prop_h_ekinote', () => ({
  ox: 2,
  oy: -1,
  w: 12,
  h: 8,
  foot: 16,
  img: (env) => {
    if (done(env, 'fushigi_ch2_01')) return NOTE[3];
    const ph = env.t % 6000;
    return ph < 120 ? NOTE[1] : ph < 240 ? NOTE[2] : NOTE[0];
  },
}));

/** The ceiling fan under the hut's roof: seen only while someone is inside (the roof fades). */
const FAN = paintFrames(4, 18, 8, (p, k) => {
  p.vline(8, 0, 2, P.steel);
  p.ellipse(8.5, 4, 2, 1.5, P.white);
  for (let b = 0; b < 3; b++) {
    const a = (b / 3) * Math.PI * 2 + (k / 4) * ((Math.PI * 2) / 3);
    for (let r = 2; r <= 8; r++) p.set(Math.round(8.5 + Math.cos(a) * r), Math.round(4 + Math.sin(a) * r * 0.35), r > 6 ? P.concreteLt : P.white);
  }
  p.set(8, 4, P.steel);
});
registerProp('prop_h_senpuki', () => ({
  ox: 0,
  oy: 0,
  w: 0,
  h: 0,
  foot: 0,
  flat: true,
  img: () => null,
  fg: [
    {
      ox: -1,
      oy: -30,
      img: (env) => {
        // only while the player is inside the hut (x16–20, y41–42)
        const tx = env.px / 16;
        const ty = (env.py - 1) / 16;
        if (tx < 16 || tx >= 21 || ty < 41 || ty >= 43) return null;
        return FAN[Math.floor(env.t / 250) % 4];
      },
    },
  ],
}));

// ---------------------------------------------------------------- 自販機 (23,40)

const JIHANKI = paintFrames(2, 16, 33, (p, k) => {
  // the white box (no brand, no names: 52 7.3)
  p.rect(0, 1, 16, 31, P.white);
  p.hline(0, 15, 1, P.glint);
  p.vline(15, 2, 31, P.concrete);
  p.hline(0, 15, 31, P.steel);
  p.rect(1, 0, 14, 1, P.concreteLt);
  // the sample window: three rows of plain-coloured cans
  p.rect(2, 3, 12, 12, P.shadeDeep);
  const can = [P.blue, P.red, P.gold, P.leaf];
  for (let r = 0; r < 3; r++)
    for (let c = 0; c < 4; c++) {
      const x = 3 + c * 3;
      const y = 4 + r * 4;
      const col = can[(r + c * 3) % 4];
      p.rect(x, y, 2, 3, col);
      p.set(x, y, lt(col));
      p.set(x + 1, y + 2, dk(col));
    }
  // the price buttons under each row (lit, blinking alternately)
  for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) p.set(3 + c * 3, 7 + r * 4, (c + r + k) % 2 ? P.glow : P.aqua);
  // coin slot, the change cup, the delivery flap
  p.rect(12, 17, 2, 4, P.charcoal);
  p.rect(3, 17, 7, 3, P.concrete);
  p.rect(2, 24, 12, 5, P.charcoal);
  p.hline(2, 13, 24, P.asphalt);
  p.hline(3, 12, 26, P.ink);
  p.set(13, 17, P.steel);
});
registerProp('obj_hoshi_jihanki', () => {
  const imgs = JIHANKI;
  const a: PropArt = {
    ox: 0,
    oy: 16 - 33,
    w: 16,
    h: 33,
    foot: 15,
    img: (env) => imgs[Math.floor(env.t / 900) % 2],
    shadow: 30,
    contact: 14,
    contactX: 8,
    moths: { x: 8, y: -12, r: 12 },
    glow(g: Gfx, x: number, y: number, env: PropEnv) {
      const k = nightK(env);
      if (k <= 0 && hs(env) < 3) return;
      const a = Math.max(k, 0.3);
      // the lit front panel and its buttons
      g.rect(x + 2, y - 14, 12, 12, '#E8ECF0', 0.55 * a);
      g.rect(x + 1, y - 16, 14, 1, '#FFFFFF', 0.35 * a);
      const on = Math.floor(env.t / 900) % 2;
      for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) if ((c + r + on) % 2) g.rect(x + 3 + c * 3, y - 10 + r * 4, 1, 1, '#5CE1FF', 0.9 * a);
    },
    light(g: Gfx, x: number, y: number, env: PropEnv) {
      const k = nightK(env);
      drawLight(g, poolEllipse(28, 18, HLIGHT.led), x + 8, y + 18, 0.5 * k);
      drawLight(g, poolEllipse(14, 16, HLIGHT.led), x + 8, y - 6, 0.25 * k);
    },
  };
  return a;
});

// ---------------------------------------------------------------- きっぷ回収箱 (31,44)

const KIPPU = paintFrames(2, 10, 22, (p, k) => {
  // a thin post (no collision) with a small wooden box on it
  p.vline(4, 9, 21, P.steel);
  p.vline(5, 9, 21, P.asphalt);
  p.rect(0, 1, 10, 9, P.woodLt);
  p.hline(0, 9, 1, P.goldPale);
  p.rect(0, 0, 10, 1, P.wood); // the lid
  p.vline(9, 1, 9, P.wood);
  p.hline(0, 9, 9, P.woodDark);
  p.rect(2, 3, 6, 1, P.ink); // the slot
  for (let i = 2; i < 8; i += 2) p.set(i, 6, P.woodDark); // 「きっぷは こちらへ」
  p.hline(2, 7, 7, P.wood);
  // the cricket resting on the lid, its feeler twitching
  p.set(6, 0, P.woodDark);
  p.set(7, 0, P.ink);
  p.set(8, k ? 0 : 1 - 1, P.woodDark);
  if (k) p.set(9, 0, P.wood);
});
registerProp('prop_h_kippu_box', () => ({
  ox: 3,
  oy: -8,
  w: 10,
  h: 22,
  foot: 15,
  img: (env) => KIPPU[Math.floor((env.t + 300) / 700) % 4 === 0 ? 1 : 0],
  contact: 4,
  contactX: 8,
}));

// ---------------------------------------------------------------- ホームの照明灯 (30,44)

registerProp('prop_h_platform_lamp', () => {
  const p = new PixelCanvas(12, 58);
  p.vline(5, 6, 57, P.concrete);
  p.vline(6, 6, 57, P.steel);
  p.set(5, 57, P.asphalt);
  // the arm and the long fluorescent shade
  p.hline(1, 10, 5, P.steel);
  p.rect(0, 2, 12, 3, P.concreteLt);
  p.hline(0, 11, 2, P.white);
  p.hline(1, 10, 5, P.concrete);
  p.hline(2, 9, 4, P.goldPale);
  outline(p, { bottom: true, soft: true });
  const img = p.toCanvas();
  const on = (env: PropEnv): number => {
    if (hs(env) >= 3) return 0;
    // a flicker every ~20 s
    const ph = (env.t + env.seed * 20000) % 20000;
    return ph < 60 || (ph > 140 && ph < 190) ? 0.2 : 1;
  };
  return {
    ox: 2,
    oy: 16 - 58,
    w: 12,
    h: 58,
    foot: 15,
    img: () => img,
    shadow: 52,
    contact: 5,
    contactX: 8,
    xray: 0,
    moths: { x: 8, y: -38, r: 11 },
    glow(g, x, y, env) {
      const k = nightK(env) * on(env);
      if (k <= 0) return;
      g.rect(x + 4, y - 38, 8, 1, '#FFFFFF', 0.9 * k);
      glowDot(g, x + 8, y - 37, '#FFFFFF', HLIGHT.led, 6, 0.6 * k);
    },
    light(g, x, y, env) {
      const k = nightK(env) * on(env);
      drawLight(g, poolEllipse(32, 16, HLIGHT.led), x + 8, y + 6, 0.55 * k);
    },
  };
});

// ---------------------------------------------------------------- バス停と時刻表 (34,43) ふしぎ02

/** The two departures of the day; every 4 s the figures flip to 4:59 and back (3 frames). */
function busStopFrame(mode: 'day' | 'flip1' | 'flip2' | 'stop'): HTMLCanvasElement {
  const p = new PixelCanvas(18, 44);
  // the pole on its concrete base
  p.vline(8, 10, 41, P.steel);
  p.vline(9, 10, 41, P.asphalt);
  p.rect(5, 40, 8, 4, P.concrete);
  p.hline(5, 12, 40, P.concreteLt);
  // the round sign 「星見台駅前」
  p.ellipse(8.5, 6, 6.5, 6.5, P.verm);
  p.ellipse(8.5, 6, 5.5, 5.5, P.white);
  p.hline(4, 13, 6, P.verm);
  for (let i = 5; i < 13; i += 2) p.set(i, 4, P.ink);
  p.set(6, 8, P.ink);
  p.set(10, 8, P.ink);
  // the timetable board
  p.rect(1, 14, 16, 14, P.white);
  p.strokeRect(1, 14, 16, 14, P.steel);
  p.hline(2, 15, 15, P.navy);
  const row = (s: string, y: number, c: string) => tiny(p, s, 17 - 1 - (s.length * 4 - 1), y, c);
  if (mode === 'day' || mode === 'stop') {
    row('6:12', 17, P.ink);
    row('1740', 23, P.ink);
    p.set(2, 17, P.leaf);
    p.set(2, 23, P.leaf);
  } else if (mode === 'flip1') {
    for (let i = 3; i < 16; i++) if (i % 2) p.set(i, 19, P.steel);
    for (let i = 3; i < 16; i++) if (i % 2 === 0) p.set(i, 25, P.steel);
  } else {
    row('4:59', 17, P.ink);
    row('4:59', 23, P.ink);
  }
  if (mode === 'stop') p.set(15, 16, P.verm); // after the stamp: the board rests at 6:12
  return p.toCanvas();
}
registerProp('prop_h_busstop', () => {
  const F = { day: busStopFrame('day'), f1: busStopFrame('flip1'), f2: busStopFrame('flip2'), stop: busStopFrame('stop') };
  return {
    ox: -1,
    oy: 16 - 44,
    w: 18,
    h: 44,
    foot: 15,
    img: (env) => {
      if (done(env, 'fushigi_ch2_02')) return F.stop;
      const ph = env.t % 4000;
      // 0–100 ms flip, 100–700 ms at 4:59, 700–800 flip back
      return ph < 100 ? F.f1 : ph < 700 ? F.f2 : ph < 800 ? F.f1 : F.day;
    },
    shadow: 40,
    contact: 7,
    contactX: 8,
    xray: 0,
  };
});

// ---------------------------------------------------------------- バス停の雨よけとベンチ (36,44)

regStand(
  'prop_h_busstop_bench',
  38,
  30,
  (p) => {
    // two posts
    for (const px of [2, 34]) {
      p.vline(px, 6, 29, P.steel);
      p.vline(px + 1, 6, 29, P.asphalt);
    }
    // the little tin roof seen from above (sloping back)
    for (let y = 0; y < 8; y++)
      for (let x = 0; x < 38; x++) p.set(x, y, y === 0 ? P.concreteLt : x % 4 === 0 ? P.concrete : y === 7 ? P.asphalt : P.steel);
    for (let x = 4; x < 36; x += 9) p.set(x, 3, P.brassOld);
    // the bench
    p.rect(5, 18, 28, 4, P.woodLt);
    p.hline(5, 32, 18, P.goldPale);
    p.hline(5, 32, 21, P.wood);
    p.rect(5, 12, 28, 3, P.wood); // backrest
    p.hline(5, 32, 12, P.woodLt);
    for (const lx of [7, 30]) p.vline(lx, 22, 29, P.woodDark);
    // someone's forgotten umbrella hooked on the post
    p.line(35, 14, 35, 25, P.navy);
    p.set(36, 13, P.navy);
    p.set(34, 25, P.charcoal);
  },
  { cx: 17, base: 16, shadow: 24 },
);

// ---------------------------------------------------------------- 無人販売所 (21,37)

registerProp('prop_h_mujin', () => {
  const W = 36;
  const H = 30;
  const make = (box: boolean) => {
    const p = new PixelCanvas(W, H);
    // the posts and the little tin roof
    for (const px of [2, 32]) {
      p.vline(px, 4, 29, P.woodDark);
      p.vline(px + 1, 4, 29, P.wood);
    }
    for (let y = 0; y < 6; y++) for (let x = 0; x < W; x++) p.set(x, y, y === 0 ? P.concreteLt : y === 5 ? P.charcoal : x % 4 === 0 ? P.concrete : P.steel);
    for (let x = 3; x < W; x += 7) p.set(x, 2, P.brassOld);
    // ソワカさん's hand-painted sign 「どれでも 100円」: a white board, fat brush strokes, her little signature
    p.rect(8, 6, 20, 8, P.white);
    p.hline(8, 27, 6, P.glint);
    p.hline(10, 13, 8, P.ink);
    p.set(11, 9, P.ink);
    p.hline(15, 17, 9, P.ink);
    tiny(p, '100', 10, 8, P.verm);
    p.rect(21, 8, 3, 4, P.verm);
    p.set(22, 9, P.white);
    p.set(26, 12, P.blue); // the signature
    p.set(25, 12, P.leaf);
    // the painted board on the post: cucumber, aubergine, sweetcorn (16×8)
    p.rect(29, 12, 7, 7, P.paper);
    p.strokeRect(29, 12, 7, 7, P.wood);
    p.hline(30, 32, 14, P.leaf);
    p.set(33, 15, '#7A5AA0');
    p.set(33, 16, '#7A5AA0');
    p.vline(31, 16, 17, P.gold);
    p.set(30, 16, P.leaf);
    // the stand
    p.rect(1, 20, 34, 3, P.woodLt);
    p.hline(1, 34, 20, P.goldPale);
    p.hline(1, 34, 22, P.wood);
    p.rect(3, 23, 30, 6, P.woodDark);
    for (let x = 4; x < 32; x += 5) p.vline(x, 23, 28, P.wood);
    // the bags: cucumbers, aubergines, sweetcorn
    const bag = (x: number, fill: (px: number, py: number) => string) => {
      for (let y = 13; y < 20; y++) for (let xx = x; xx < x + 6; xx++) p.set(xx, y, fill(xx - x, y - 13));
      p.hline(x, x + 5, 13, P.white);
      p.set(x + 2, 12, P.concreteLt);
    };
    bag(4, (i, j) => ((i + j) % 3 === 0 ? P.leafYoung : j > 4 ? P.leafDeep : P.leaf));
    bag(12, (i, j) => ((i + j * 2) % 4 === 0 ? mix('#7A5AA0', P.white, 0.4) : j > 4 ? P.shadeDeep : '#7A5AA0'));
    bag(26, (i, j) => (i === 0 || i === 5 ? P.leaf : (i + j) % 2 ? P.gold : P.goldPale));
    // the cash box (杉の板), only while the seller is on the stand (h0)
    if (box) {
      p.rect(19, 14, 7, 6, P.woodLt);
      p.hline(19, 25, 14, P.goldPale);
      p.rect(21, 15, 3, 1, P.ink);
      p.vline(25, 15, 19, P.wood);
    }
    outline(p, { bottom: true, soft: true });
    return p.toCanvas();
  };
  const withBox = make(true);
  const noBox = make(false);
  return {
    ox: -2,
    oy: 16 - H + 2,
    w: W,
    h: H,
    foot: 15,
    img: (env) => (hs(env) >= 1 && hs(env) < 3 ? noBox : withBox),
    contact: 30,
    contactX: 16,
    shadow: 22,
  };
});

// ---------------------------------------------------------------- 道標 (28,40)

registerProp('prop_h_michishirube', () => {
  const W = 26;
  const H = 34;
  const make = (shine: boolean) => {
    const p = new PixelCanvas(W, H);
    p.vline(12, 2, 33, P.wood);
    p.vline(13, 2, 33, P.woodDark);
    p.set(12, 2, P.woodLt);
    // four arrow boards; the one to the hill is new and white
    const board = (y: number, left: boolean, col: string, lines: number) => {
      const x0 = left ? 2 : 13;
      p.rect(x0, y, 11, 5, col);
      if (left) {
        p.set(x0 - 1, y + 2, col);
        p.set(x0, y, 'transparent');
        p.set(x0, y + 4, 'transparent');
      } else {
        p.set(x0 + 11, y + 2, col);
        p.set(x0 + 10, y, 'transparent');
        p.set(x0 + 10, y + 4, 'transparent');
      }
      for (let k = 0; k < lines; k++) p.hline(x0 + 2 + k * 3, x0 + 3 + k * 3, y + 2, col === P.white ? P.ink : dk(col, 2));
      p.hline(x0, x0 + 10, y + 4, dk(col));
    };
    board(3, false, P.white, 3);
    board(10, true, HPold, 2);
    board(17, false, mix(P.woodLt, P.steel, 0.3), 3);
    board(24, true, HPold, 2);
    // the new board's arrow points up: ↑↑ painted on its end
    p.set(21, 4, P.verm);
    p.set(23, 4, P.verm);
    if (shine) {
      p.hline(13, 22, 3, P.glint);
      p.set(24, 5, P.glint);
    }
    outline(p, { bottom: true, soft: true });
    return p.toCanvas();
  };
  const base = make(false);
  const lit = make(true);
  return {
    ox: -5,
    oy: 16 - H,
    w: W,
    h: H,
    foot: 15,
    img: (env) => (hs(env) === 2 && env.t % 3000 < 160 ? lit : base),
    shadow: 30,
    contact: 6,
    contactX: 8,
  };
});
const HPold = mix(P.woodLt, P.wood, 0.5);

// ---------------------------------------------------------------- 道祖神 (24,37)

regStand(
  'prop_h_dosojin',
  18,
  18,
  (p) => {
    // a rounded natural stone, two figures side by side in low relief
    p.ellipse(9, 8, 7.5, 7.5, P.steel);
    p.ellipse(8.5, 7.5, 6.5, 6.5, P.concrete);
    for (let y = 1; y < 17; y++) for (let x = 1; x < 17; x++) if (p.alpha(x, y) && ihash(x, y, 3711) % 9 === 0) p.set(x, y, P.leafShade);
    // the two figures: heads, shoulders, joined hands
    for (const fx of [6, 11]) {
      p.ellipse(fx, 5, 1.6, 1.6, P.concreteLt);
      p.set(fx + 1, 6, P.steel);
      p.rect(fx - 1, 7, 3, 5, P.concreteLt);
      p.vline(fx + 1, 8, 11, P.steel);
    }
    p.hline(7, 10, 10, P.steel);
    // the base and a small vase of flowers
    p.rect(2, 14, 14, 4, P.asphalt);
    p.hline(2, 15, 14, P.steel);
    p.rect(14, 11, 3, 5, P.navy);
    p.set(15, 10, P.leaf);
    p.set(16, 9, P.crimson);
    p.set(14, 9, P.peach);
  },
  { cx: 8, base: 16, shadow: 14 },
);

// ---------------------------------------------------------------- 丸型ポスト (27,37)

regStand(
  'prop_h_post',
  14,
  26,
  (p) => {
    p.rect(2, 3, 10, 21, P.verm);
    p.ellipse(7, 3, 5, 2.5, P.verm);
    p.vline(2, 3, 23, P.vermLt);
    p.vline(3, 2, 22, P.vermLt);
    p.vline(11, 3, 23, P.vermShade);
    p.hline(3, 10, 1, P.vermLt);
    p.rect(4, 8, 6, 1, P.ink); // the slot
    p.rect(5, 12, 4, 3, P.white); // the collection-time card
    p.hline(5, 8, 13, P.steel);
    p.rect(3, 23, 8, 3, P.charcoal);
    p.hline(3, 10, 23, P.asphalt);
    p.set(4, 5, P.glint);
  },
  { cx: 8, base: 16, shadow: 22 },
);

// ---------------------------------------------------------------- サワコさんの丸いす (23,37)

regStand(
  'prop_h_marui_isu',
  12,
  11,
  (p) => {
    p.ellipse(6, 2, 5, 2, P.red);
    p.hline(2, 9, 1, P.vermLt);
    p.hline(2, 9, 3, P.vermShade);
    p.vline(3, 4, 10, P.steel);
    p.vline(8, 4, 10, P.steel);
    p.hline(3, 8, 7, P.concrete);
    // her paint box at its foot (#8A5A3A, the colours showing)
    p.rect(7, 7, 5, 4, P.wood);
    p.hline(7, 11, 7, P.woodLt);
    p.set(8, 8, P.red);
    p.set(9, 8, P.gold);
    p.set(10, 8, P.blue);
  },
  { cx: 8, base: 15, shadow: 0 },
);

// ---------------------------------------------------------------- 空き家の郵便受け (17,37) ふしぎ04

registerProp('prop_h_yuubinuke', () => {
  const W = 14;
  const H = 26;
  const make = (out: number) => {
    const p = new PixelCanvas(W, H);
    // the concrete gate post
    p.rect(3, 6, 8, 20, P.concrete);
    p.vline(3, 6, 25, P.concreteLt);
    p.vline(10, 6, 25, P.steel);
    p.hline(3, 10, 6, P.concreteLt);
    p.hline(2, 11, 5, P.concreteLt);
    for (let y = 8; y < 25; y++) if (ihash(y, 3, 3721) % 5 === 0) p.set(4 + (y % 5), y, P.leafShade);
    // the tin mailbox on the post
    p.rect(2, 9, 10, 8, P.leafShade);
    p.hline(2, 11, 9, P.leaf);
    p.rect(4, 11, 6, 1, P.ink); // the mouth
    p.set(11, 12, P.brassOld);
    // the blue circular board slipping out of the mouth
    if (out > 0) {
      p.rect(5, 11 - out, 5, out + 1, P.blue);
      p.hline(5, 9, 11 - out, P.aqua);
    }
    outline(p, { bottom: true, soft: true });
    return p.toCanvas();
  };
  const F = [make(0), make(2), make(4)];
  return {
    ox: 1,
    oy: 16 - H,
    w: W,
    h: H,
    foot: 15,
    img: (env) => {
      if (done(env, 'fushigi_ch2_04')) return F[0];
      // every 8 s: out 4px (2 frames), 0.4 s, back
      const ph = env.t % 8000;
      return ph < 80 ? F[1] : ph < 480 ? F[2] : ph < 560 ? F[1] : F[0];
    },
    shadow: 22,
    contact: 8,
    contactX: 8,
  };
});

// ---------------------------------------------------------------- 電柱 (the village's poles, 30 3.7 の絵)

/**
 * The village pole: the same geometry as chapter 1's (so the wires hang the
 * same), no lamp except the one security light (32,37); wrap-around boards
 * of the village: 「ふもとまで 10km」, 「イノシシに 注意」 (the boar drawn round).
 */
function hPole(opts: Record<string, unknown>): PropArt {
  const W = 26;
  const H = 70;
  const p = new PixelCanvas(W, H);
  const cx = 12;
  const foot = H - 1;
  const lamp = !!opts.lamp;
  const trans = !!opts.trans;
  const ad = String(opts.ad ?? '');
  for (let y = foot - 64; y <= foot; y++) {
    const half = (y - (foot - 64)) / 64 < 0.3 ? 2 : 3;
    for (let x = cx - half; x < cx + half; x++) {
      const u = (x - (cx - half)) / (half * 2 - 1);
      p.set(x, y, u < 0.2 ? P.white : u > 0.75 ? P.steel : P.concrete);
    }
  }
  p.hline(cx - 2, cx + 1, foot - 64, P.concreteLt);
  for (let y = foot - 6; y <= foot; y++) for (let x = cx - 3; x < cx + 3; x++) if (p.alpha(x, y) && (x + y) % 3 === 0) p.set(x, y, h01s(x, y) ? P.leafShade : P.steel);
  const ay = foot - POLE.arm + 2;
  p.rect(cx - 10, ay, 20, 2, P.steel);
  p.hline(cx - 10, cx + 9, ay, P.concrete);
  p.hline(cx - 10, cx + 9, ay + 1, P.asphalt);
  for (const o of POLE.armSpan) {
    const ix = cx + o - (o === 0 ? 1 : 0);
    p.rect(ix, ay - 3, 2, 3, P.white);
    p.set(ix + 1, ay - 2, P.concrete);
  }
  p.line(cx - 8, ay + 2, cx - 2, ay + 7, P.asphalt);
  if (trans) {
    const ty = foot - 50;
    p.rect(cx + 3, ty, 7, 11, P.concrete);
    p.vline(cx + 3, ty, ty + 10, P.white);
    p.vline(cx + 9, ty, ty + 10, P.steel);
    p.hline(cx + 3, cx + 9, ty, P.concreteLt);
    p.hline(cx + 3, cx + 9, ty + 10, P.asphalt);
    p.rect(cx + 5, ty - 2, 3, 2, P.steel);
  }
  p.rect(cx - 4, foot - POLE.low - 1, 8, 2, P.asphalt);
  // the wrap-around board
  const by = foot - 32;
  if (ad === 'fumoto') {
    p.rect(cx - 3, by, 7, 15, P.white);
    p.vline(cx + 3, by, by + 14, P.concrete);
    p.hline(cx - 3, cx + 3, by, P.navy);
    tiny(p, '10', cx - 3, by + 3, P.navy);
    p.hline(cx - 2, cx + 2, by + 10, P.ink);
    p.hline(cx - 2, cx + 1, by + 12, P.ink);
  } else if (ad === 'inoshishi' || ad === 'inoshishi_s') {
    const big = ad === 'inoshishi';
    const hgt = big ? 16 : 11;
    p.rect(cx - 3, by, 7, hgt, P.gold);
    p.vline(cx - 3, by, by + hgt - 1, P.goldPale);
    p.vline(cx + 3, by, by + hgt - 1, P.brass);
    // the round boar
    p.ellipse(cx + 0.5, by + 4.5, 2.5, 2, P.woodDark);
    p.set(cx - 2, by + 4, P.wood);
    p.set(cx + 2, by + 6, P.ink);
    p.set(cx - 1, by + 6, P.ink);
    p.hline(cx - 2, cx + 2, by + 9, P.verm);
    if (big) {
      p.hline(cx - 2, cx + 2, by + 11, P.ink);
      p.hline(cx - 2, cx + 1, by + 13, P.ink);
    }
  }
  // address plate
  const ay2 = foot - 40;
  p.rect(cx - 3, ay2, 7, 5, P.navy);
  p.hline(cx - 2, cx + 2, ay2 + 2, P.white);
  for (let k = 0; k < 5; k++) {
    const sy = foot - 22 - k * 6;
    if (sy > by - 1 && sy < by + 17) continue;
    p.hline(k % 2 ? cx + 3 : cx - 5, (k % 2 ? cx + 3 : cx - 5) + 1, sy, P.asphalt);
  }
  // the security light: a white LED head on an arm towards the road
  if (lamp) {
    const ly = foot - 48;
    p.hline(cx - 9, cx - 3, ly, P.steel);
    p.set(cx - 4, ly + 1, P.asphalt);
    p.rect(cx - 13, ly - 1, 6, 3, P.concreteLt);
    p.hline(cx - 13, cx - 8, ly - 1, P.white);
    p.hline(cx - 12, cx - 9, ly + 2, P.concrete);
  }
  outline(p, { bottom: true, soft: true });
  const img = p.toCanvas();
  const ox = 8 - cx;
  const oy = 14 - H;
  const lx = ox + cx - 10;
  const ly = oy + foot - 46;
  return {
    ox,
    oy,
    w: W,
    h: H,
    foot: 14,
    img: () => img,
    shadow: 64,
    contact: 8,
    contactX: 8,
    xray: 0,
    moths: lamp ? { x: lx, y: ly + 2, r: 12 } : undefined,
    glow: lamp
      ? (g, x, y, env) => {
          if (env.lampOn === false || hs(env) >= 3) return;
          const k = nightK(env);
          g.rect(x + lx - 2, y + ly, 5, 1, '#FFFFFF', 0.95 * k);
          g.rect(x + lx - 1, y + ly + 1, 3, 1, '#E8ECF0', 0.8 * k);
          drawLight(g, poolEllipse(8, 8, HLIGHT.led), x + lx, y + ly + 1, 0.45 * k);
        }
      : undefined,
    light: lamp
      ? (g, x, y, env) => {
          if (env.lampOn === false || hs(env) >= 3) return;
          // 52 8.6: a circle of 40px at 30%, on the road under the head
          drawLight(g, poolEllipse(40, 26, HLIGHT.led), x + lx + 1, y + 14 - 18, 0.6 * nightK(env));
        }
      : undefined,
  };
}
function h01s(x: number, y: number): boolean {
  return ihash(x, y, 3731) % 4 === 0;
}
registerProp('prop_h_pole', hPole);
