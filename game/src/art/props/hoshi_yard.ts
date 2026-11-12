// The school yard and the village's own things (52_ch2_level_art 3.5, 7.3
// 集落): the closed school's memorial stone, the weather box, the three
// iron bars (the lowest one rubbed bright by small hands), the cherry in
// summer leaf, three days of laundry that never dried, the statue of the
// child pointing at the eastern sky, the fire lookout with its bell, the
// ward storehouse's box of ink pads, and what each house keeps under its
// eaves (52 7.4: every house a different set).

import { mix, PixelCanvas } from '../../engine/pixel';
import { h01, ihash } from '../tiles/noise';
import { P } from '../tiles/palette';
import { dk, lt, outline } from './kit';
import { glowDot, HLIGHT, HP, hs, nightK, paintFrames, regStand, standProp, starTop } from './hoshi_kit';
import { drawLight, drawLightAt, poolEllipse, poolTrapezoid } from './light';
import { registerProp } from './registry';
import { fontTextSmall } from './text';
import type { PropArt, PropEnv } from './types';

// ---------------------------------------------------------------- 閉校記念碑 (21,30)

regStand(
  'prop_h_kinenhi',
  18,
  28,
  (p) => {
    // the base stone
    p.rect(1, 22, 16, 6, P.steel);
    p.hline(1, 16, 22, P.concreteLt);
    p.hline(1, 16, 27, P.asphalt);
    // the dark polished stone, slightly narrower at the top
    p.rect(3, 2, 12, 20, P.charcoal);
    p.vline(3, 2, 21, P.asphalt);
    p.vline(14, 2, 21, P.ink);
    p.hline(3, 14, 2, P.steel);
    // carved characters: three columns of short strokes
    for (let c = 0; c < 3; c++)
      for (let r = 0; r < 5; r++) {
        const hh = ihash(c, r, 3801);
        const x = 11 - c * 3;
        const y = 5 + r * 3;
        p.set(x, y, P.asphalt);
        if (hh % 2) p.set(x, y + 1, P.asphalt);
        if (hh % 3 === 0) p.set(x - 1, y, P.ink);
      }
    // a starlit top edge, a lichen spot
    starTop(p, 4, 13, 2, P.concreteLt);
    p.set(4, 18, P.leafShade);
    p.set(5, 19, P.leafShade);
  },
  { cx: 8, base: 16, shadow: 24 },
);

// ---------------------------------------------------------------- 百葉箱 (33,28)

regStand(
  'prop_h_hyakuyobako',
  16,
  30,
  (p) => {
    // four legs
    for (const lx of [3, 12]) {
      p.vline(lx, 14, 29, P.white);
      p.vline(lx + 1, 14, 29, P.concrete);
    }
    p.line(4, 26, 12, 20, P.concrete);
    // the box: white louvres (horizontal slats)
    p.rect(1, 3, 14, 12, P.white);
    for (let y = 5; y < 14; y += 2) p.hline(2, 13, y, P.concrete);
    p.vline(1, 3, 14, P.glint);
    p.vline(14, 3, 14, P.steel);
    // the little roof
    p.rect(0, 0, 16, 3, P.concreteLt);
    p.hline(0, 15, 0, P.glint);
    p.hline(0, 15, 2, P.steel);
    // the door's latch
    p.set(12, 9, P.brassOld);
  },
  { cx: 8, base: 16, shadow: 26 },
);

// ---------------------------------------------------------------- 鉄棒 (30,30) 48×20

regStand(
  'prop_h_tetsubou',
  48,
  24,
  (p) => {
    // posts (three heights: the bars step down west to east)
    const posts = [2, 17, 32, 46];
    const bars = [4, 9, 14];
    for (let k = 0; k < 4; k++) {
      const top = k === 0 ? bars[0] : bars[Math.min(2, k - 1)];
      p.vline(posts[k], top - 1, 23, P.navy);
      p.vline(posts[k] + 1, top - 1, 23, mix(P.navy, P.nightShade, 0.5));
      p.set(posts[k], top - 1, P.blue);
    }
    for (let b = 0; b < 3; b++) {
      const y = bars[b];
      const x0 = posts[b] + 1;
      const x1 = posts[b + 1];
      p.hline(x0, x1, y, P.blue);
      p.hline(x0, x1, y + 1, P.navy);
      // rust, and the lowest bar worn bright where hands held it
      for (let x = x0; x <= x1; x++) if (h01(x, b, 3811) < 0.18) p.set(x, y + 1, P.brassOld);
      if (b === 2)
        for (const hx of [x0 + 3, x0 + 9]) {
          p.hline(hx, hx + 2, y, P.steel);
          p.hline(hx, hx + 2, y + 1, P.concrete);
        }
    }
    // the worn hollows in the sand under the bars
    for (let x = 4; x < 46; x++) if (x % 15 > 4 && x % 15 < 11) p.set(x, 23, mix(P.woodLt, P.brassOld, 0.5));
  },
  { cx: 24, base: 16, shadow: 18, outline: true },
);

// ---------------------------------------------------------------- 校庭の桜 (24,30)

registerProp('prop_h_sakura', () => {
  // the trunk (8×24, dark bark with horizontal lenticels)
  const t = new PixelCanvas(10, 26);
  for (let y = 0; y < 26; y++)
    for (let x = 1; x < 9; x++) {
      const u = (x - 1) / 7;
      let c: string = u < 0.25 ? P.wood : u > 0.7 ? P.ink : P.woodDark;
      if (y % 5 === 2 && x > 2 && x < 7) c = P.woodLt; // the cherry's bark bands
      p0(t, x, y, c);
    }
  t.rect(0, 23, 10, 3, P.woodDark);
  t.set(0, 25, P.ink);
  t.set(9, 25, P.ink);
  outline(t, { bottom: true, soft: true });
  const trunk = t.toCanvas();
  // the canopy (48×40): summer leaves, round clumps, lit from above
  const c = new PixelCanvas(52, 44);
  const blobs: [number, number, number][] = [
    [26, 22, 18], [12, 24, 11], [40, 24, 11], [20, 12, 11], [34, 11, 12], [27, 30, 12], [8, 30, 7], [44, 31, 7],
  ];
  for (const [bx, by, r] of blobs)
    for (let y = -r; y <= r; y++)
      for (let x = -r; x <= r; x++) {
        const d = (x * x + y * y) / (r * r);
        if (d > 1) continue;
        const lit = x * 0.4 + y;
        let col: string = lit < -r * 0.5 ? P.leafYoung : lit < 0 ? P.leaf : lit < r * 0.55 ? P.leafDeep : P.leafShade;
        if (ihash(bx + x, by + y, 3821) % 6 === 0) col = col === P.leafYoung ? P.leaf : col === P.leaf ? P.leafDeep : P.leafShade;
        if (d > 0.85 && y > 0) col = P.leafShade;
        c.set(bx + x, by + y, col);
      }
  // starlight on the top of the crown
  for (let x = 0; x < 52; x++)
    for (let y = 0; y < 44; y++) if (c.alpha(x, y) && !c.alpha(x, y - 1)) {
      if (ihash(x, y, 3823) % 3) c.set(x, y, P.leafLt);
      break;
    }
  outline(c, { bottom: true, soft: true });
  const crown = c.toCanvas();
  const a: PropArt = {
    ox: 3,
    oy: -10,
    w: 10,
    h: 26,
    foot: 15,
    img: () => trunk,
    shadow: 26,
    contact: 12,
    contactX: 8,
    // the fade rect is anchor-relative like the crown: the part of the crown a character can stand under
    fg: [{ ox: -18, oy: -48, img: () => crown, fade: { x: -16, y: -44, w: 48, h: 42, alpha: 0.35 } }],
  };
  return a;
});
function p0(p: PixelCanvas, x: number, y: number, c: string): void {
  p.set(x, y, c);
}

// ---------------------------------------------------------------- 物干し (21,28) 48×28: 3日ぶんの洗濯物

function laundryFrame(k: number): HTMLCanvasElement {
  const p = new PixelCanvas(50, 30);
  // two bamboo posts with crossbars, the pole
  for (const px of [2, 46]) {
    p.vline(px, 4, 29, P.woodLt);
    p.vline(px + 1, 4, 29, P.brassOld);
    for (let y = 8; y < 29; y += 6) p.set(px, y, P.goldPale);
    p.hline(px - 2, px + 3, 5, P.woodLt);
  }
  p.hline(0, 49, 4, P.goldPale);
  p.hline(0, 49, 5, P.woodLt);
  const sway = (i: number) => (k === 0 ? 0 : Math.round(Math.sin((i + k * 2) * 0.9) * (k === 2 ? 1 : 0.6)));
  // a towel, the work clothes, a hand towel, the cook's apron (all white or navy)
  const hang = (x: number, w: number, h: number, col: string, deco?: (px: number, py: number) => string | null) => {
    for (let i = 0; i < w; i++) {
      const dx = sway(i);
      for (let j = 0; j < h; j++) {
        let c = col;
        if (i === 0) c = lt(col);
        if (i === w - 1 || j === h - 1) c = dk(col);
        const d = deco?.(i, j);
        if (d) c = d;
        p.set(x + i + (j > h / 2 ? dx : 0), 6 + j, c);
      }
      p.set(x + i, 5, P.woodLt);
    }
    p.set(x, 5, P.steel); // pegs
    p.set(x + w - 1, 5, P.steel);
  };
  hang(5, 8, 12, P.white, (i, j) => (j === 9 ? P.concrete : null));
  hang(15, 11, 15, P.navy, (i, j) => (j < 4 && (i < 2 || i > 8) ? null : j === 3 && i > 3 && i < 7 ? P.blue : i === 5 && j > 3 ? mix(P.navy, P.nightShade, 0.5) : null));
  hang(28, 5, 11, P.blue, (i, j) => ((i + j) % 4 === 0 ? P.aqua : null));
  hang(35, 9, 14, P.white, (i, j) => (j < 3 && (i === 0 || i === 8) ? P.concreteLt : j === 7 ? P.concrete : null));
  outline(p, { bottom: true, soft: true });
  return p.toCanvas();
}
registerProp('prop_h_monohoshi', () => {
  const F = [0, 1, 2, 1].map((k) => laundryFrame(k));
  return {
    ox: -1,
    oy: 16 - 30,
    w: 50,
    h: 30,
    foot: 15,
    // no wind at night: still; the morning wind (h3) moves it
    img: (env: PropEnv) => (hs(env) >= 3 ? F[Math.floor(env.t / 260) % 4] : F[0]),
    shadow: 26,
    contact: 40,
    contactX: 24,
  };
});

// ---------------------------------------------------------------- 「星を見上げる子」の像 (28,28)

registerProp('prop_h_zou', () => {
  const make = (dawn: boolean) => {
    const p = new PixelCanvas(18, 34);
    // the pedestal and its plate 「星を 見上げて」
    p.rect(2, 20, 14, 14, P.concrete);
    p.hline(2, 15, 20, P.concreteLt);
    p.vline(15, 21, 33, P.steel);
    p.rect(1, 31, 16, 3, P.steel);
    p.hline(1, 16, 31, P.concrete);
    p.rect(5, 23, 8, 5, P.brassOld);
    p.strokeRect(5, 23, 8, 5, P.brass);
    p.hline(6, 11, 25, P.woodDark);
    // the bronze child: standing, the right arm up pointing east (right), a round planisphere in the left hand
    const B = P.brassOld;
    const L = P.brass;
    const D = P.woodDark;
    const G = P.leafDeep; // verdigris
    p.rect(6, 10, 5, 7, B); // body
    p.vline(6, 10, 16, L);
    p.vline(10, 11, 16, D);
    p.rect(6, 17, 2, 3, B); // legs
    p.rect(9, 17, 2, 3, D);
    p.ellipse(8.5, 6.5, 2.6, 2.6, B); // head, tilted up
    p.set(7, 5, L);
    p.set(8, 4, L);
    p.set(10, 7, D);
    // the arm up to the right, the finger
    p.line(10, 10, 14, 5, B);
    p.line(11, 11, 15, 6, D);
    p.set(15, 4, L);
    // the planisphere
    p.ellipse(4.5, 13.5, 2.2, 2.2, L);
    p.set(4, 13, P.goldPale);
    // verdigris spots
    for (const [x, y] of [[7, 12], [9, 15], [8, 8], [12, 8]]) p.set(x, y, G);
    if (dawn) {
      p.set(15, 2, P.horizon);
      p.set(16, 2, P.horizon);
    }
    outline(p, { bottom: true, soft: true });
    return p.toCanvas();
  };
  const night = make(false);
  const dawn = make(true);
  return {
    ox: -1,
    oy: 16 - 34,
    w: 18,
    h: 34,
    foot: 15,
    img: (env) => (hs(env) >= 3 ? dawn : night),
    shadow: 32,
    contact: 12,
    contactX: 8,
  };
});

// ---------------------------------------------------------------- 火の見やぐら (41,30) 32×112

registerProp('prop_h_hinomi', () => {
  const W = 34;
  const H = 116;
  const p = new PixelCanvas(W, H);
  const foot = H - 1;
  const top = 18;
  // four legs tapering towards the top (front two drawn, back two behind)
  const legX = (y: number, side: -1 | 1, back: boolean): number => {
    const t = (foot - y) / (foot - top);
    const half = 14 - t * 8 - (back ? 3 : 0);
    return Math.round(17 + side * half);
  };
  const steel = P.asphalt;
  for (let y = top; y <= foot; y++) {
    for (const s of [-1, 1] as const) {
      p.set(legX(y, s, true), y, P.charcoal);
      const x = legX(y, s, false);
      p.set(x, y, steel);
      p.set(x + (s > 0 ? 0 : 1), y, s > 0 ? P.charcoal : P.steel);
    }
  }
  // the lattice: X braces between the front legs every 14px, rusty
  for (let y = foot - 2; y > top + 4; y -= 14) {
    const y2 = y - 14;
    p.line(legX(y, -1, false), y, legX(y2, 1, false), y2, steel);
    p.line(legX(y, 1, false), y, legX(y2, -1, false), y2, P.charcoal);
    p.hline(legX(y, -1, false), legX(y, 1, false), y, P.steel);
  }
  for (let y = top; y < foot; y++) for (let x = 0; x < W; x++) if (p.alpha(x, y) && h01(x, y, 3831) < 0.12) p.set(x, y, P.brassOld);
  // the ladder up the west side
  for (let y = top + 6; y < foot; y++) {
    const x = legX(y, -1, false) - 3;
    p.set(x, y, P.steel);
    if (y % 4 === 0) p.hline(x, x + 2, y, P.concrete);
  }
  // the lookout platform and its railing
  p.rect(4, top, 26, 3, P.steel);
  p.hline(4, 29, top, P.concreteLt);
  for (let x = 5; x < 29; x += 4) p.vline(x, top - 6, top, P.asphalt);
  p.hline(4, 29, top - 6, P.steel);
  // the small roof (#8A2E3A) and the bell (#D9A441) hanging under it
  for (let y = 0; y < 8; y++) {
    const half = 3 + y * 1.6;
    for (let x = Math.round(17 - half); x <= Math.round(17 + half); x++) p.set(x, y + 2, y === 7 ? P.nightShade : x < 17 ? P.maroon : mix(P.maroon, P.nightShade, 0.4));
  }
  p.vline(17, 0, 2, P.steel);
  p.set(17, 0, P.concreteLt);
  p.line(17, 2, 5, 9, P.sunShade);
  p.rect(14, 10, 6, 6, P.brass);
  p.hline(14, 19, 10, P.goldPale);
  p.set(14, 11, P.goldPale);
  p.vline(19, 11, 15, P.brassOld);
  p.set(16, 16, P.woodDark); // the clapper
  p.vline(17, 8, 9, P.charcoal);
  // the foot: concrete bases
  for (const s of [-1, 1] as const) {
    const x = legX(foot, s, false);
    p.rect(x - 2, foot - 2, 5, 3, P.concrete);
    p.hline(x - 2, x + 2, foot - 2, P.concreteLt);
  }
  outline(p, { bottom: true, soft: true });
  const img = p.toCanvas();
  const a: PropArt = {
    ox: 16 - 17,
    oy: 32 - H,
    w: W,
    h: H,
    foot: 31,
    img: () => img,
    shadow: 100,
    contact: 26,
    contactX: 16,
    xray: 0.25,
  };
  return a;
});

// ---------------------------------------------------------------- 区の倉庫の箱 (39,31)

regStand(
  'prop_h_soko_box',
  16,
  20,
  (p) => {
    // a wooden box on two legs 「回覧板用 朱肉 ご自由に」
    for (const lx of [3, 12]) p.vline(lx, 11, 19, P.woodDark);
    p.rect(1, 2, 14, 10, P.woodLt);
    p.hline(1, 14, 2, P.goldPale);
    p.vline(14, 3, 11, P.wood);
    p.hline(1, 14, 11, P.woodDark);
    p.rect(1, 0, 14, 2, P.wood); // the hinged lid
    p.hline(1, 14, 0, P.woodLt);
    p.rect(3, 4, 10, 6, P.white);
    for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) if ((r + c) % 3 !== 2) p.set(4 + c * 2, 5 + r * 2, r === 1 ? P.verm : P.ink);
    // a round ink tin peeking at the side
    p.ellipse(13, 13, 2, 1.2, P.verm);
    p.set(12, 13, P.white);
  },
  { cx: 8, base: 16, shadow: 16 },
);

// ---------------------------------------------------------------- 軒下の物 (52 7.4: 家ごとにちがう組み合わせ)

type EavePaint = (p: PixelCanvas) => void;
const EAVE: Record<string, [number, number, EavePaint]> = {
  // まつ先生: a watering can and potted herbs
  fumi: [
    24,
    14,
    (p) => {
      p.rect(2, 7, 8, 6, P.leafShade);
      p.hline(2, 9, 7, P.leaf);
      p.line(9, 8, 12, 5, P.leafShade);
      p.rect(0, 8, 2, 2, P.leafShade);
      for (let k = 0; k < 2; k++) {
        const x = 14 + k * 5;
        p.rect(x, 9, 4, 4, P.wood);
        p.hline(x, x + 3, 9, P.woodLt);
        p.rect(x + 1, 5, 2, 4, P.leaf);
        p.set(x, 6, P.leafYoung);
        p.set(x + 3, 5, P.leafDeep);
      }
    },
  ],
  // 民家2: two pairs of rubber boots and an umbrella stand
  minka2: [
    22,
    16,
    (p) => {
      for (const [x, c] of [[1, P.leafShade], [7, P.navy]] as const) {
        p.rect(x, 6, 2, 9, c);
        p.rect(x + 3, 7, 2, 8, c);
        p.set(x, 6, lt(c));
        p.hline(x, x + 5, 14, P.ink);
      }
      p.rect(14, 5, 6, 10, P.steel);
      p.hline(14, 19, 5, P.concreteLt);
      p.vline(15, 0, 5, P.verm);
      p.vline(17, 1, 5, P.navy);
      p.set(15, 0, P.vermShade);
    },
  ],
  // 民家1: a wheelbarrow leaning on the wall
  minka1: [
    20,
    14,
    (p) => {
      p.poly([[2, 3], [14, 3], [12, 10], [4, 10]], P.leafShade);
      p.hline(2, 14, 3, P.leaf);
      p.line(12, 9, 19, 12, P.woodLt);
      p.line(4, 9, 0, 12, P.steel);
      p.ellipse(7, 11, 2.5, 2.5, P.charcoal);
      p.set(7, 11, P.steel);
    },
  ],
  // 区長: a broom and a dustpan hung neatly
  kucho: [
    16,
    20,
    (p) => {
      p.vline(4, 0, 13, P.woodLt);
      p.rect(2, 13, 5, 6, P.brass);
      for (let x = 2; x < 7; x++) p.set(x, 19, P.brassOld);
      p.rect(9, 10, 6, 5, P.red);
      p.vline(12, 3, 10, P.charcoal);
      p.hline(9, 14, 14, P.vermShade);
    },
  ],
  // 民家3: an old bicycle with a basket
  minka3: [
    30,
    18,
    (p) => {
      p.ring(6, 12, 5, 5, P.charcoal);
      p.ring(23, 12, 5, 5, P.charcoal);
      p.line(6, 12, 13, 6, P.steel);
      p.line(13, 6, 23, 12, P.steel);
      p.line(13, 6, 15, 12, P.steel);
      p.line(15, 12, 23, 12, P.steel);
      p.vline(21, 3, 8, P.steel);
      p.rect(22, 2, 6, 4, P.concrete);
      p.hline(22, 27, 2, P.concreteLt);
      p.hline(11, 15, 5, P.charcoal);
      for (let x = 2; x < 28; x++) if (ihash(x, 1, 3841) % 7 === 0) p.set(x, 8, P.brassOld);
    },
  ],
  // マサルさん: a bucket and a coil of straw rope
  gen: [
    20,
    12,
    (p) => {
      p.rect(2, 3, 7, 8, P.steel);
      p.hline(1, 9, 3, P.concreteLt);
      p.vline(8, 4, 10, P.asphalt);
      p.hline(2, 8, 10, P.charcoal);
      p.ring(15, 8, 4, 3, P.woodLt);
      p.ring(15, 8, 2.5, 1.8, P.brassOld);
    },
  ],
};
registerProp('prop_h_eave', (opts) => {
  const e = EAVE[String(opts.set ?? 'gen')] ?? EAVE.gen;
  const [w, h, paint] = e;
  // standing against the wall: the feet on the wall's foot line (the tile's top)
  return standProp(w, h, paint, { cx: w / 2, base: 2, foot: 1, shadow: 0, contact: 0 });
});

void fontTextSmall;
void paintFrames;

// ---------------------------------------------------------------- 校門 (24–27,31): the gate posts and the gate lamp

/**
 * The old school's front gate where the village road enters the yard
 * through the azalea hedge: two square concrete posts with pyramid caps,
 * the old wooden name board on the west one (「星見台分校」, a column of
 * ink strokes), and on the east one a small round gate lamp. Tonight, with
 * the meeting on, the lamp is lit (h0–h2): a warm pool on the road in the
 * gap and a faint fan down the road to the south, so from the 県道's
 * crossing the way north starts with a warm light (52 3.10 1:10).
 */
registerProp('prop_h_school_gate', () => {
  const W = 64;
  const H = 34;
  const base = H - 1; // the posts' foot (row 31's bottom)
  const p = new PixelCanvas(W, H);
  const post = (x0: number) => {
    // the cap: a low pyramid, its lit west half
    for (let j = 0; j < 3; j++) p.hline(x0 + 2 - j, x0 + 5 + j, 8 + j, j === 0 ? P.concreteLt : P.concrete);
    p.hline(x0, x0 + 7, 11, P.steel);
    // the shaft: lit west face, shaded east, a crack, moss at the foot
    for (let j = 12; j <= base; j++)
      for (let i = x0; i < x0 + 8; i++) {
        let c: string = i === x0 ? P.concreteLt : i >= x0 + 6 ? P.steel : P.concrete;
        if (h01(i, j, 3891) < 0.05) c = mix(c, P.steel, 0.6);
        if (j > base - 3 && h01(i, j, 3893) < 0.4) c = P.leafDeep;
        p.set(i, j, c);
      }
    p.set(x0 + 4, 17, P.steel);
    p.set(x0 + 5, 18, P.steel);
    p.set(x0 + 5, 19, P.asphalt);
    p.hline(x0, x0 + 7, base, P.asphalt);
  };
  post(10);
  post(46);
  // the name board on the west post: weathered wood, the school's name in ink
  p.rect(12, 14, 4, 16, HP.oldWood);
  p.vline(12, 14, 29, mix(HP.oldWood, P.white, 0.3));
  p.vline(15, 14, 29, mix(HP.oldWood, P.ink, 0.35));
  for (let k = 0; k < 5; k++) {
    p.set(13 + (k & 1), 16 + k * 3, P.ink);
    p.set(14, 17 + k * 3, P.ink);
  }
  // the gate lamp on the east post: a bracket and a round milk-glass globe
  p.vline(50, 3, 8, P.charcoal);
  p.hline(49, 51, 8, P.charcoal);
  p.ellipse(50, 3, 3, 3, P.paperGrid);
  p.set(49, 2, P.white);
  p.hline(48, 52, 0, P.charcoal);
  outline(p, { bottom: true, soft: true });
  const img = p.toCanvas();
  const on = (env: PropEnv) => hs(env) < 3;
  const a: PropArt = {
    ox: 0,
    oy: 16 - H,
    w: W,
    h: H,
    foot: 17,
    img: () => img,
    shadow: 24,
    contact: 0,
    glow(g, x, y, env) {
      if (!on(env)) return;
      const gx = x + 50;
      const gy = y + 16 - H + 3;
      const fl = 0.94 + 0.06 * Math.sin(env.t * 0.0031);
      glowDot(g, gx, gy, '#FFE7A3', HLIGHT.bulb, 12, 0.9 * fl);
      g.rect(gx - 2, gy - 2, 5, 5, '#F6D98A', 0.8 * fl);
      g.rect(gx - 1, gy - 1, 2, 2, '#FFF6D8', 0.9 * fl);
    },
    light(g, x, y, env) {
      if (!on(env)) return;
      const k = nightK(env);
      // the pool round the gate and the road in the gap
      drawLight(g, poolEllipse(44, 28, HLIGHT.bulb), x + 40, y + 12, 0.8 * k);
      drawLight(g, poolEllipse(18, 12, HLIGHT.warm), x + 44, y + 10, 0.5 * k);
      // and a fan down the road to the south (the way back to the crossing)
      const fan = poolTrapezoid(28, 48, 96, HLIGHT.warm);
      drawLightAt(g, fan, x + 32 - fan.width / 2, y + 14, 0.42 * k);
    },
  };
  return a;
});
