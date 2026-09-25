// The farm things of 星見台 (52_ch2_level_art 3.5, 3.6, 7.3 西の斜面・棚田・東の
// 台地・耕作放棄地): harvest crates and shipping boxes in front of the tomato
// houses, the irrigation tank with its timer stopped at 5:00, the stake
// bundle, the water divider and the paddies' inlet board, the scarecrows (8,
// each dressed differently, turning to the hill in h2), ペロリ's kitchen
// garden (her own tomatoes are red: those she lets ripen on the vine), the
// hand pump, マサルさん's kei truck with feed bags and the dog's blanket, the
// electric fence's gate, signs and solar power unit, and the abandoned
// fields' pampas grass, goldenrod without flowers, fallen stakes, a
// collapsed hut roof, the cedars at the mouth of the hill path, the signs,
// the footprints.

import type { Gfx } from '../../engine/gfx';
import { mix, PixelCanvas } from '../../engine/pixel';
import { h01, ihash } from '../tiles/noise';
import { P } from '../tiles/palette';
import { dk, lt, outline } from './kit';
import { glowDot, HLIGHT, HP, hs, nightK, paintFrames, regStand, standProp, starTop } from './hoshi_kit';
import { drawLight, poolEllipse } from './light';
import { registerProp } from './registry';
import { fontTextSmall, tiny } from './text';
import type { PropArt, PropEnv } from './types';

// ---------------------------------------------------------------- 西の斜面：作業場の物

/** One orange harvest crate (#F07A2A) seen from the front: rim, handle hole, ribs. */
function crate(p: PixelCanvas, x: number, y: number, w = 14, h = 5): void {
  const O = '#F07A2A';
  const Od = mix(O, P.vermShade, 0.45);
  const Ol = mix(O, P.goldPale, 0.4);
  p.rect(x, y, w, h, O);
  p.hline(x, x + w - 1, y, Ol);
  p.hline(x, x + w - 1, y + h - 1, Od);
  p.vline(x + w - 1, y + 1, y + h - 1, Od);
  p.rect(x + Math.floor(w / 2) - 2, y + 1, 4, 1, Od);
  for (let i = x + 2; i < x + w - 2; i += 3) p.set(i, y + h - 2, Od);
}

regStand(
  'obj_hoshi_container',
  16,
  28,
  (p) => {
    for (let k = 0; k < 5; k++) crate(p, 1 + (k % 2), 23 - k * 5 - 1, 14, 5);
    p.hline(1, 15, 27, P.charcoal);
  },
  { cx: 8, base: 16, shadow: 26 },
);

/** ペロリ's seat: two crates, upside down (she sits on them; the NPC is drawn after). */
registerProp('prop_h_container_seat', () =>
  standProp(
    16,
    12,
    (p) => {
      crate(p, 1, 6, 14, 5);
      crate(p, 1, 1, 14, 5);
      p.hline(1, 14, 11, P.charcoal);
    },
    { cx: 8, base: 15, foot: 12, shadow: 0 },
  ),
);

regStand(
  'obj_hoshi_danball',
  18,
  22,
  (p) => {
    // twelve made-up shipping boxes, 「星見台 夏秋トマト」 in red
    for (let r = 0; r < 4; r++)
      for (let c = 0; c < 2; c++) {
        if (r === 3 && c === 1) continue;
        const x = 1 + c * 8 + (r % 2);
        const y = 17 - r * 5;
        p.rect(x, y, 8, 5, P.woodLt);
        p.hline(x, x + 7, y, P.goldPale);
        p.vline(x + 7, y + 1, y + 4, P.brassOld);
        p.hline(x + 1, x + 5, y + 2, P.verm);
        p.set(x + 2, y + 3, P.verm);
      }
    p.hline(1, 17, 21, P.charcoal);
  },
  { cx: 8, base: 16, shadow: 20 },
);

regStand(
  'obj_hoshi_taihi_bag',
  18,
  14,
  (p) => {
    // compost bags (white, 「石黒牛舎」 by hand)
    for (const [x, y] of [[1, 5], [8, 6], [4, 1]] as const) {
      p.rect(x, y, 9, 7, P.white);
      p.hline(x, x + 8, y, P.glint);
      p.hline(x, x + 8, y + 6, P.concrete);
      p.vline(x + 8, y + 1, y + 6, P.concrete);
      p.hline(x + 2, x + 6, y + 3, P.ink);
      p.set(x + 3, y + 4, P.ink);
      p.set(x + 5, y + 4, P.ink);
    }
  },
  { cx: 8, base: 16, shadow: 10 },
);

regStand(
  'obj_hoshi_tank',
  18,
  28,
  (p) => {
    // the blue tank (water from the stream), its black lid, the timer box (5:00)
    p.rect(1, 6, 14, 20, P.blue);
    p.ellipse(8, 6, 7, 2.5, P.aqua);
    p.ellipse(8, 5.5, 3.5, 1.5, P.charcoal);
    p.vline(1, 7, 25, P.aqua);
    p.vline(14, 7, 25, P.navy);
    for (let y = 10; y < 25; y += 5) p.hline(2, 13, y, P.navy);
    p.hline(1, 14, 26, P.navy);
    // the grey timer box on its side
    p.rect(10, 13, 8, 8, P.concrete);
    p.strokeRect(10, 13, 8, 8, P.steel);
    p.rect(11, 15, 6, 4, P.charcoal);
    tiny(p, '5', 12, 14, P.glow);
    p.set(16, 16, P.glow);
    // the hose down to the ground
    p.line(4, 26, 1, 27, P.charcoal);
  },
  { cx: 8, base: 16, shadow: 24 },
);

regStand(
  'prop_h_shichu_taba',
  18,
  30,
  (p) => {
    // a bundle of stakes stood on end, leaning a little: bamboo (nodes) and steel pipes, tied twice
    for (let k = 0; k < 6; k++) {
      const bamboo = k % 3 !== 1;
      const top = 1 + ((k * 5) % 4);
      for (let y = top; y < 28; y++) {
        const x = 5 + k * 1.5 + (27 - y) / 9;
        const c = bamboo ? ((y + k * 3) % 6 === 0 ? P.brassOld : k % 2 ? P.woodLt : P.goldPale) : y % 5 === 0 ? P.steel : P.concrete;
        p.set(Math.round(x), y, c);
      }
      p.set(Math.round(5 + k * 1.5 + (27 - top) / 9), top, bamboo ? P.wood : P.concreteLt);
    }
    // the ties (誘引ひも, pale string)
    for (const y of [9, 20]) {
      const x0 = Math.round(4 + (27 - y) / 9);
      p.hline(x0, x0 + 10, y, P.paperGrid);
      p.set(x0 + 10, y + 1, P.paperGrid);
    }
    // the foot: the stakes' dirty ends, and a coil of string beside
    p.hline(4, 14, 28, P.woodDark);
    p.ring(15, 26, 2.5, 1.6, P.paperGrid);
  },
  { cx: 8, base: 16, shadow: 26 },
);

regStand(
  'prop_h_pump',
  12,
  20,
  (p) => {
    // a green hand pump on a concrete block, a bucket under it
    p.rect(1, 15, 10, 5, P.concrete);
    p.hline(1, 10, 15, P.concreteLt);
    p.rect(4, 4, 3, 11, P.leafDeep);
    p.vline(4, 4, 14, P.leaf);
    p.rect(3, 2, 5, 3, P.leafDeep);
    p.line(7, 3, 11, 0, P.leafShade); // the handle
    p.rect(7, 7, 2, 2, P.leafShade); // the spout
    for (const [x, y] of [[5, 6], [4, 10], [6, 12]]) p.set(x, y, P.brassOld);
    p.rect(6, 11, 5, 4, P.steel);
    p.hline(6, 10, 11, P.concreteLt);
  },
  { cx: 8, base: 16, shadow: 16 },
);

/** The divider where the stream feeds the canal: a concrete box and a wooden weir board (flat on the water). */
registerProp('prop_h_bunsui', () => {
  const p = new PixelCanvas(18, 34);
  p.rect(1, 2, 16, 30, P.concrete);
  p.rect(3, 4, 12, 26, P.navy); // water inside (mirrors the sky)
  p.hline(1, 16, 2, P.concreteLt);
  p.vline(1, 2, 31, P.concreteLt);
  p.vline(16, 3, 31, P.steel);
  p.hline(1, 16, 31, P.steel);
  // the weir board and its slot
  p.rect(3, 14, 12, 3, P.wood);
  p.hline(3, 14, 14, P.woodLt);
  p.set(2, 15, P.charcoal);
  p.set(15, 15, P.charcoal);
  // white water over the board
  for (let x = 4; x < 14; x += 2) p.set(x, 17, P.white);
  const img = p.toCanvas();
  return { ox: -1, oy: -2, w: 18, h: 34, foot: 0, flat: true, img: () => img };
});

// ---------------------------------------------------------------- ペロリの家庭菜園 (9,42) 64×32

regStand(
  'prop_h_hatake',
  66,
  36,
  (p) => {
    // the soil bed
    for (let y = 26; y < 36; y++) for (let x = 1; x < 65; x++) p.set(x, y, (y + (x >> 3)) % 4 === 0 ? P.brassOld : h01(x, y, 3901) < 0.2 ? P.woodDark : P.wood);
    p.hline(1, 64, 26, mix(P.wood, P.woodLt, 0.5));
    // six tomato plants on stakes, their fruit red (she lets hers ripen on the vine)
    for (let k = 0; k < 6; k++) {
      const x = 5 + k * 6 + (k > 2 ? 2 : 0);
      p.vline(x, 4, 30, P.woodLt); // the bamboo stake
      for (let y = 6; y < 28; y++) {
        if (h01(x, y, 3903 + k) < 0.55) p.set(x - 1 + (y % 3 === 0 ? -1 : 0), y, y % 2 ? P.leaf : P.leafDeep);
        if (h01(x + 1, y, 3905 + k) < 0.55) p.set(x + 1 + (y % 4 === 0 ? 1 : 0), y, y % 3 ? P.leafDeep : P.leafShade);
      }
      for (const fy of [11, 17, 22]) {
        if (ihash(k, fy, 3907) % 3 === 0) continue;
        const fx = x + (fy % 2 ? -2 : 1);
        p.rect(fx, fy, 2, 2, P.red);
        p.set(fx, fy, P.vermLt);
      }
      p.set(x - 1, 4, P.leafYoung);
    }
    // aubergines and shishito on the east
    for (let k = 0; k < 2; k++) {
      const x = 48 + k * 8;
      for (let y = 14; y < 28; y++) if (h01(x, y, 3909) < 0.6) p.set(x + (y % 3) - 1, y, y % 2 ? P.leafShade : P.leafDeep);
      p.rect(x - 1, 20, 2, 4, '#7A5AA0');
      p.set(x - 1, 20, P.lilac);
      p.set(x + 3, 22, P.leafYoung);
      p.set(x + 3, 23, P.leafYoung);
    }
  },
  { cx: 32, base: 32, shadow: 0, contact: 0 },
);

// ---------------------------------------------------------------- かかし (8体、服がそれぞれちがう)

interface Dress {
  body: string;
  bodyD: string;
  deco?: (p: PixelCanvas, x: number, y: number, back: boolean) => void;
  hat?: string;
}
const DRESS: Record<string, Dress> = {
  tshirt: { body: P.red, bodyD: P.vermShade },
  mino: {
    body: P.brassOld,
    bodyD: P.wood,
    deco: (p, x, y) => {
      for (let j = 0; j < 9; j++) for (let i = 0; i < 10; i++) if ((i + j) % 2 === 0) p.set(x + i, y + j, j % 3 === 0 ? P.woodLt : P.brass);
    },
  },
  happi: {
    body: P.blue,
    bodyD: P.navy,
    deco: (p, x, y, back) => {
      if (back) {
        p.ellipse(x + 5, y + 4, 2, 2, P.white);
        return;
      }
      p.vline(x + 4, y, y + 8, P.white);
      p.vline(x + 5, y, y + 8, P.white);
    },
  },
  jersey: {
    body: P.navy,
    bodyD: P.nightShade,
    deco: (p, x, y, back) => {
      if (back) return;
      p.hline(x + 1, x + 3, y + 2, P.white);
      p.hline(x + 1, x + 3, y + 4, P.white);
    },
  },
  apron: {
    body: P.peach,
    bodyD: P.sunShade,
    deco: (p, x, y) => {
      for (let j = 0; j < 9; j++) for (let i = 0; i < 10; i++) if ((i * 3 + j * 5) % 7 === 0) p.set(x + i, y + j, P.white);
    },
  },
  shirt: { body: P.concreteLt, bodyD: P.concrete },
  kappougi: {
    body: P.white,
    bodyD: P.concrete,
    deco: (p, x, y) => {
      p.hline(x, x + 9, y + 8, P.steel);
      p.set(x + 5, y + 1, P.steel);
    },
  },
  kappa: {
    body: P.gold,
    bodyD: P.brass,
    deco: (p, x, y) => {
      p.set(x + 7, y + 5, P.ink);
      p.set(x + 8, y + 6, P.ink);
      p.set(x + 7, y + 7, P.ink);
    },
    hat: P.brassOld,
  },
};

/** Scarecrow frame: facing 0 front, 1 side, 2 back (to the hill; the hat 1px east). */
function kakashi(v: string, face: 0 | 1 | 2, tilt: number): HTMLCanvasElement {
  const d = DRESS[v] ?? DRESS.shirt;
  const p = new PixelCanvas(20, 32);
  const cx = 10;
  // the bamboo cross
  p.vline(cx, 10, 31, P.woodLt);
  p.vline(cx + 1, 10, 31, P.brassOld);
  if (face !== 1) p.hline(1, 18, 13, P.woodLt);
  else p.hline(8, 12, 13, P.woodLt);
  // the clothes on the crossbar
  const bx = face === 1 ? cx - 3 : cx - 5;
  const bw = face === 1 ? 7 : 10;
  for (let j = 0; j < 10; j++)
    for (let i = 0; i < bw; i++) {
      if (face !== 1 && j < 3 && (i < 1 || i > bw - 2)) continue;
      p.set(bx + i, 12 + j, i === bw - 1 || j === 9 ? d.bodyD : d.body);
    }
  if (face !== 1) {
    // sleeves out along the crossbar
    p.rect(2, 12, 4, 3, d.body);
    p.rect(14, 12, 4, 3, d.bodyD);
  }
  d.deco?.(p, bx, 12, face === 2);
  // the head: a white cloth face with ink dots and a line mouth (not へのへのもへじ)
  p.ellipse(cx + 0.5, 7.5, 3.5, 3.5, P.white);
  p.set(cx + 3, 9, P.concrete);
  p.set(cx + 2, 10, P.concrete);
  if (face === 0) {
    p.set(cx - 1, 7, P.ink);
    p.set(cx + 2, 7, P.ink);
    p.hline(cx, cx + 1, 9, P.ink);
  } else if (face === 1) {
    p.set(cx + 2, 7, P.ink);
    p.set(cx + 3, 9, P.ink);
  } else {
    p.set(cx + 0, 5, P.concrete); // the knot at the back
    p.set(cx + 1, 6, P.concrete);
  }
  // the straw hat (#F6D98A)
  const hatC = d.hat ?? P.goldPale;
  const hx = face === 2 ? 1 : 0;
  p.ellipse(cx + 0.5 + hx, 4, 6, 1.6, hatC);
  p.rect(cx - 2 + hx, 1, 6, 3, hatC);
  p.hline(cx - 2 + hx, cx + 3 + hx, 1, mix(hatC, P.white, 0.4));
  p.hline(cx - 5 + hx, cx + 6 + hx, 5, P.brass);
  p.hline(cx - 2 + hx, cx + 3 + hx, 3, P.maroon);
  outline(p, { bottom: true, soft: true });
  if (!tilt) return p.toCanvas();
  // the leaning one (the raincoat in the little plot): shear 1px per 8 rows
  const q = new PixelCanvas(22, 32);
  for (let y = 0; y < 32; y++) for (let x = 0; x < 20; x++) {
    const v2 = p.get(x, y);
    if (v2 >>> 24) q.set(x + Math.floor((31 - y) / 9), y, v2);
  }
  return q.toCanvas();
}

registerProp('prop_kakashi', (opts) => {
  const v = String(opts.v ?? 'shirt');
  const tilt = Number(opts.tilt ?? 0);
  const F = [kakashi(v, 0, tilt), kakashi(v, 1, tilt), kakashi(v, 2, tilt)];
  return {
    ox: -2,
    oy: 16 - 32,
    w: F[0].width,
    h: 32,
    foot: 15,
    img: (env: PropEnv) => F[env.kakashi ?? (hs(env) === 2 ? 2 : 0)],
    shadow: 28,
    contact: 6,
    contactX: 10,
  };
});

// ---------------------------------------------------------------- 棚田の水口・水をくむ段・取水口

regStand(
  'prop_h_minakuchi',
  18,
  12,
  (p) => {
    // the inlet board (dark with hands), set in a notch of the ridge, a trickle over it
    p.rect(3, 1, 12, 7, P.wood);
    p.hline(3, 14, 1, P.woodLt);
    p.rect(4, 3, 10, 4, P.woodDark);
    p.set(8, 2, P.ink); // hand-worn black
    p.set(9, 2, P.ink);
    p.rect(1, 6, 16, 3, P.steel);
    p.hline(1, 16, 6, P.concrete);
    for (let x = 6; x < 12; x += 2) p.set(x, 9, P.white);
    p.set(7, 10, P.aqua);
    p.set(10, 11, P.aqua);
  },
  { cx: 8, base: 12, shadow: 0, foot: 10 },
);

registerProp('prop_h_canal_steps', (opts) => {
  const v = Number(opts.v ?? 0);
  const p = new PixelCanvas(16, 12);
  for (let k = 0; k < 3; k++) {
    const y = 2 + k * 3;
    p.rect(3 + k, y, 10 - k * 2, 3, k % 2 ? P.concrete : P.concreteLt);
    p.hline(3 + k, 12 - k, y, P.white);
    p.hline(3 + k, 12 - k, y + 2, P.steel);
  }
  if (v) p.set(5, 3, P.leafShade);
  const img = p.toCanvas();
  return { ox: 0, oy: 6, w: 16, h: 12, foot: 0, flat: true, img: () => img };
});

registerProp('prop_h_intake', () => {
  // a small wooden weir across the stream where the paddies take their water
  const p = new PixelCanvas(16, 14);
  p.rect(1, 4, 14, 4, P.wood);
  p.hline(1, 14, 4, P.woodLt);
  p.vline(2, 1, 11, P.woodDark);
  p.vline(13, 1, 11, P.woodDark);
  for (let x = 3; x < 13; x += 2) p.set(x, 8, P.white);
  p.set(4, 9, P.aqua);
  p.set(9, 10, P.aqua);
  const img = p.toCanvas();
  return { ox: 0, oy: 2, w: 16, h: 14, foot: 0, flat: true, img: () => img };
});

// ---------------------------------------------------------------- 東の台地：軽トラ・一輪車・ホース

/** One paper feed sack (#E8D9B5) with its green band. */
function feedSack(p: PixelCanvas, x: number, y: number, w = 8, h = 5): void {
  p.rect(x, y, w, h, P.paperGrid);
  p.hline(x, x + w - 1, y, P.paper);
  p.hline(x, x + w - 1, y + Math.floor(h / 2), P.leafDeep);
  p.vline(x + w - 1, y + 1, y + h - 1, P.woodLt);
  p.hline(x, x + w - 1, y + h - 1, P.brassOld);
}

/** マサルさん's white kei truck, parked facing west (side view 60×32): feed sacks ×4 and the dog's blanket on the bed. */
function keitoraSide(): HTMLCanvasElement {
  const p = new PixelCanvas(60, 32);
  const Wc = P.white;
  const G = P.concreteLt;
  // underbody, bumpers
  p.rect(4, 22, 52, 4, P.charcoal);
  p.hline(4, 55, 25, P.ink);
  p.rect(0, 21, 6, 3, P.steel);
  p.hline(0, 5, 21, G);
  p.rect(55, 20, 4, 4, P.steel);
  p.hline(55, 58, 20, G);
  // the cab at the west (left): cab-over, flat face
  p.rect(5, 3, 16, 20, Wc);
  p.hline(6, 19, 2, P.glint);
  p.hline(5, 20, 3, P.glint);
  p.line(4, 3, 2, 9, Wc);
  p.rect(2, 9, 3, 13, Wc);
  p.vline(1, 9, 20, P.concrete);
  // windows
  p.rect(10, 5, 9, 7, P.navy);
  p.hline(10, 18, 5, P.blue);
  p.line(12, 10, 16, 6, P.aqua);
  p.line(4, 4, 8, 11, P.navy);
  p.line(3, 4, 7, 11, P.blue);
  p.vline(9, 5, 20, G);
  p.vline(20, 12, 20, G);
  p.hline(12, 14, 14, P.steel); // handle
  p.rect(0, 6, 2, 3, P.charcoal); // mirror
  p.rect(2, 15, 2, 2, P.goldPale); // headlight
  p.set(2, 18, P.sun);
  // the headboard guard
  p.vline(21, 4, 21, P.steel);
  p.vline(22, 4, 21, P.concrete);
  // the bed
  p.rect(23, 13, 34, 9, Wc);
  p.hline(23, 56, 13, P.glint);
  p.hline(23, 56, 17, G);
  p.hline(23, 56, 21, P.concrete);
  for (const x of [34, 46]) p.vline(x, 14, 21, P.concrete);
  p.rect(56, 16, 2, 3, P.red);
  // the load: four feed sacks and the folded blanket (#8A5A3A)
  feedSack(p, 24, 8, 9, 5);
  feedSack(p, 33, 8, 9, 5);
  feedSack(p, 26, 3, 9, 5);
  feedSack(p, 42, 8, 8, 5);
  p.rect(50, 9, 6, 4, P.wood);
  p.hline(50, 55, 9, P.woodLt);
  p.hline(50, 55, 11, P.woodDark);
  // wheel arches and tyres
  for (const cx of [13, 49])
    for (let y = 19; y <= 25; y++) for (let x = cx - 7; x <= cx + 7; x++) if (Math.hypot(x - cx, (y - 26) * 1.05) <= 6.6) p.set(x, y, P.ink);
  for (const cx of [13, 49]) {
    p.ellipse(cx, 26, 5.2, 5.2, P.ink);
    p.ellipse(cx, 26, 4.2, 4.2, P.charcoal);
    p.ellipse(cx, 26, 2.4, 2.4, P.steel);
    p.set(cx, 26, P.concrete);
  }
  // mud on the sills
  for (const x of [6, 7, 18, 30, 31, 44, 52]) p.set(x, 21, P.brassOld);
  outline(p, { bottom: true, soft: true });
  return p.toCanvas();
}
registerProp('prop_h_keitora', () => {
  const img = keitoraSide();
  return { ox: -4, oy: 32 - 32 - 0, w: 60, h: 32, foot: 30, img: () => img, shadow: 24, contact: 50, contactX: 24 };
});

/** h2: the truck is at the hill path; the feed sacks it carried wait on a pallet. */
regStand(
  'prop_h_feed_pallet',
  34,
  16,
  (p) => {
    p.rect(1, 11, 32, 4, P.woodLt);
    p.hline(1, 32, 11, P.goldPale);
    for (const x of [2, 16, 30]) p.rect(x, 13, 3, 3, P.woodDark);
    feedSack(p, 3, 6, 9, 5);
    feedSack(p, 12, 6, 9, 5);
    feedSack(p, 7, 1, 9, 5);
  },
  { cx: 16, base: 16, shadow: 10 },
);

/** h2: the truck at the mouth of the hill path, facing north (its back to us), headlights on (52 8.6). */
registerProp('prop_h_keitora_parked', () => {
  const p = new PixelCanvas(34, 34);
  // the roof of the cab and the bed seen from behind and above
  p.rect(3, 2, 28, 12, P.white); // cab roof / back of cab
  p.hline(3, 30, 2, P.glint);
  p.rect(5, 5, 24, 6, P.navy); // the rear window
  p.hline(5, 28, 5, P.blue);
  p.set(8, 6, P.aqua);
  p.rect(2, 14, 30, 14, P.white); // the bed (empty now)
  p.rect(4, 15, 26, 10, P.concrete);
  for (let x = 6; x < 30; x += 4) p.vline(x, 15, 24, P.concreteLt);
  p.hline(2, 31, 14, P.glint);
  p.rect(2, 25, 30, 4, P.concreteLt); // the tailgate
  p.hline(2, 31, 28, P.steel);
  p.rect(3, 26, 3, 2, P.red); // tail lights (off)
  p.rect(28, 26, 3, 2, P.red);
  p.rect(12, 26, 10, 2, P.gold); // the yellow plate
  p.set(13, 26, P.ink);
  p.set(16, 26, P.ink);
  // tyres
  p.rect(1, 29, 5, 4, P.ink);
  p.rect(28, 29, 5, 4, P.ink);
  outline(p, { bottom: true, soft: true });
  const img = p.toCanvas();
  const a: PropArt = {
    ox: 0,
    oy: 32 - 34,
    w: 34,
    h: 34,
    foot: 31,
    img: () => img,
    shadow: 18,
    contact: 30,
    contactX: 16,
    glow(g, x, y, env) {
      const k = nightK(env);
      if (k <= 0) return;
      // the headlights, just visible over the cab's front edge
      g.rect(x + 5, y - 3, 3, 1, '#FFE7A3', 0.9 * k);
      g.rect(x + 26, y - 3, 3, 1, '#FFE7A3', 0.9 * k);
    },
    light(g, x, y, env) {
      // two fans of 48px to the north, onto the mouth of the hill path
      const k = nightK(env);
      for (const dx of [6, 27]) {
        drawLight(g, poolEllipse(14, 26, HLIGHT.head), x + dx, y - 26, 0.55 * k);
        drawLight(g, poolEllipse(9, 14, HLIGHT.head), x + dx, y - 12, 0.4 * k);
      }
    },
  };
  return a;
});

regStand(
  'prop_h_ichirinsha',
  18,
  12,
  (p) => {
    p.poly([[1, 1], [13, 1], [11, 7], [3, 7]], P.steel);
    p.hline(1, 13, 1, P.concreteLt);
    p.hline(3, 11, 7, P.charcoal);
    for (let x = 3; x < 12; x += 3) p.set(x, 3, P.brassOld);
    p.set(5, 2, P.woodLt); // a few straws in it
    p.set(8, 2, P.woodLt);
    p.line(12, 6, 17, 9, P.woodLt);
    p.line(3, 7, 1, 10, P.charcoal);
    p.ellipse(9, 9, 2.5, 2.5, P.ink);
    p.set(9, 9, P.steel);
  },
  { cx: 8, base: 15, shadow: 0, contact: 12 },
);

regStand(
  'prop_h_hose_reel',
  14,
  14,
  (p) => {
    p.ring(7, 6, 5, 5, P.leafDeep);
    p.ring(7, 6, 4, 4, P.leaf);
    p.ring(7, 6, 3, 3, P.leafDeep);
    p.set(7, 6, P.steel);
    p.vline(2, 6, 13, P.steel);
    p.vline(12, 6, 13, P.steel);
    p.hline(2, 12, 13, P.asphalt);
    p.line(11, 9, 13, 12, P.leafShade);
  },
  { cx: 8, base: 16, shadow: 10 },
);

// ---------------------------------------------------------------- 電気柵：ゲート・表示板・電源装置

/** The gate (48–49,18): two wires with yellow handles; opened, the handles hang on the posts (47,18)(50,18). */
registerProp('prop_h_egate', () => {
  const make = (open: boolean) => {
    const p = new PixelCanvas(64, 28);
    const base = 22; // the fence foot line in the canvas (the tile row 18's bottom - 4)
    const wire = P.concrete;
    // the two posts at x47 and x50 (canvas 8 and 56)
    for (const px of [8, 55]) {
      p.vline(px, base - 11, base, P.white);
      p.vline(px + 1, base - 11, base, P.steel);
      p.set(px + 1, base - 3, P.ink);
      p.set(px + 1, base - 6, P.ink);
    }
    const handle = (x: number, y: number) => {
      p.rect(x, y, 4, 2, P.gold);
      p.hline(x, x + 3, y, P.goldPale);
      p.set(x + 4, y + 1, P.ink); // the hook
    };
    if (!open) {
      // the wires across the opening, the handles in the middle
      for (let x = 10; x < 55; x++) {
        p.set(x, base - 3, wire);
        p.set(x, base - 6, wire);
      }
      handle(30, base - 7);
      handle(30, base - 4);
    } else {
      // opened: the handles hooked on the west post, the wires slack along it
      for (let y = base - 6; y <= base; y++) {
        p.set(10, y, wire);
        p.set(12, y + (y % 2), wire);
      }
      p.line(10, base - 6, 14, base - 1, wire);
      handle(11, base - 8);
      handle(11, base - 5);
      // a short run of spring wire coiled on the east post
      for (let y = base - 6; y < base; y += 2) p.set(54, y, P.concreteLt);
    }
    // the gate stands across the farm lane: no mown band here (the fence's own cells carry it)
    return p.toCanvas();
  };
  const shut = make(false);
  const open = make(true);
  return {
    ox: -16,
    oy: 16 - 26,
    w: 64,
    h: 28,
    foot: 14,
    img: (env) => (env.flag('flag_ch2_gate_open') ? open : shut),
    contact: 0,
  };
});

/** 「危険 電気さく」: a yellow plate, black frame, two lines and a lightning mark (8×6). */
registerProp('prop_h_fence_sign', (opts) => {
  const v = opts.side === 'v';
  return standProp(
    10,
    14,
    (p) => {
      p.vline(4, 6, 13, v ? P.white : 'transparent');
      p.rect(0, 0, 10, 7, P.ink);
      p.rect(1, 1, 8, 5, P.gold);
      p.hline(1, 8, 1, P.goldPale);
      p.hline(2, 4, 3, P.ink);
      p.hline(2, 4, 5, P.ink);
      p.set(7, 2, P.ink);
      p.set(6, 3, P.ink);
      p.set(7, 4, P.ink);
      p.set(6, 5, P.ink);
    },
    { cx: v ? 8 : 8, base: v ? 12 : 11, foot: 12, outline: false, shadow: 0, contact: 0 },
  );
});

/** The power unit (47,19): a grey box on a post, a small solar panel, the green LED on the village clock. */
registerProp('obj_hoshi_dengen', () => {
  const p = new PixelCanvas(18, 28);
  p.vline(8, 10, 27, P.woodDark);
  p.vline(9, 10, 27, P.wood);
  // the solar panel on top, tilted south
  p.rect(1, 0, 16, 6, P.navy);
  for (let x = 1; x < 17; x += 4) p.vline(x, 0, 5, P.nightShade);
  p.hline(1, 16, 3, P.nightShade);
  p.set(16, 0, P.aqua);
  p.hline(1, 16, 6, P.steel);
  // the box
  p.rect(3, 9, 12, 11, P.concrete);
  p.hline(3, 14, 9, P.concreteLt);
  p.vline(14, 10, 19, P.steel);
  p.hline(3, 14, 19, P.asphalt);
  p.rect(5, 11, 4, 3, P.charcoal);
  p.set(11, 12, P.charcoal); // the LED housing
  p.rect(5, 16, 8, 1, P.steel);
  // the warning tag and the earth rod
  p.rect(10, 15, 4, 3, P.gold);
  p.vline(16, 20, 27, P.steel);
  outline(p, { bottom: true, soft: true });
  const img = p.toCanvas();
  const a: PropArt = {
    ox: -1,
    oy: 16 - 28,
    w: 18,
    h: 28,
    foot: 15,
    img: () => img,
    shadow: 24,
    contact: 10,
    contactX: 8,
    glow(g: Gfx, x: number, y: number, env: PropEnv) {
      // 1 Hz, on for 120 ms (the village clock, 53 17 #7)
      const pl = env.pulse ?? env.t % 1000;
      if (pl >= 120) return;
      glowDot(g, x + 10, y - 4, '#7CFF9A', HLIGHT.green, 5, 0.9);
      g.rect(x + 10, y - 4, 1, 1, '#E8FFE8', 1);
    },
  };
  return a;
});

// ---------------------------------------------------------------- 耕作放棄地

registerProp('prop_h_susuki', (opts) => {
  const v = Number(opts.v ?? 0);
  return standProp(
    20,
    26,
    (p) => {
      // arching narrow leaves from one clump; 8月末: only three young ears (#E8D9B5)
      const n = 9 + v * 2;
      for (let k = 0; k < n; k++) {
        const hh = ihash(k, v, 3921);
        const dir = k % 2 ? 1 : -1;
        const len = 12 + (hh % 10);
        const bend = 0.6 + ((hh >>> 4) % 5) / 10;
        let x = 10 + ((hh >>> 8) % 3) - 1;
        for (let j = 0; j < len; j++) {
          const y = 25 - j;
          x += j > len * 0.5 ? dir * bend : dir * 0.15;
          p.set(Math.round(x), y, j < 4 ? P.leafDeep : j > len - 3 ? P.leafLt : k % 3 ? P.leafYoung : P.leaf);
        }
      }
      // the clump's dark heart at the foot
      p.hline(7, 13, 25, P.leafShade);
      p.hline(8, 12, 24, P.leafShade);
      // three young ears on slender stalks, each leaning its own way, the
      // plume just out and drooping (8月末: pale, not yet the silver of autumn)
      const ears: [number, number, number][] = [[18 + v, -0.12, 1], [22 - v, 0.1, -1], [15 + (v % 2) * 3, 0.22, 1]];
      ears.forEach(([len, lean, droop], e) => {
        let x = 9.5 + e - 1;
        let y = 25;
        for (let j = 0; j < len; j++) {
          x += lean;
          y = 25 - j;
          p.set(Math.round(x), y, j < 5 ? P.leafShade : P.leafDeep);
        }
        const tx = Math.round(x);
        for (let j = 0; j < 5; j++) {
          const px = tx + (j > 1 ? droop : 0) + (j > 3 ? droop : 0);
          p.set(px, y - 1 + j, j === 0 ? P.paper : j % 2 ? P.paperGrid : P.woodLt);
          if (j > 0 && j < 4) p.set(px + droop, y - 1 + j, j === 2 ? P.woodLt : P.paperGrid);
        }
      });
    },
    { cx: 8, base: 16, shadow: 0, contact: 10, outline: false },
  );
});

registerProp('prop_h_goldenrod', (opts) => {
  const v = Number(opts.v ?? 0);
  return standProp(
    10,
    30,
    (p) => {
      // three tall stems, each leaning a little its own way, narrow leaves
      // angled up and out along them (alternate sides), the tip a tight
      // unopened head; no flowers (the yellow comes in autumn)
      const stems: [number, number, number][] = [[4, 2 + v, 0.06], [6, 6 + (v % 2) * 2, -0.08], [3, 10 + v, 0.1]];
      stems.forEach(([x0, top, lean], s) => {
        let x = x0 + (v % 2);
        for (let y = 29; y >= top; y--) {
          x += lean;
          const X = Math.round(x);
          p.set(X, y, y < top + 3 ? P.leafYoung : (y + s) % 3 ? P.leafDeep : P.leafShade);
          // a leaf every 3px: 3px long, angled up, the upper ones lighter
          if ((y + s * 2) % 3 === 0 && y > top + 2 && y < 27) {
            const side = ((y / 3) | 0) % 2 ? 1 : -1;
            const c = y < top + 10 ? P.leaf : P.leafDeep;
            p.set(X + side, y - 1, c);
            p.set(X + side * 2, y - 2, c);
            p.set(X + side * 2, y - 1, P.leafShade);
          }
        }
        p.set(Math.round(x), top - 1, P.leafLt);
        p.set(Math.round(x) + 1, top, P.leafYoung);
      });
      p.hline(2, 7, 29, P.leafShade);
    },
    { cx: 8, base: 16, shadow: 0, contact: 6, outline: false },
  );
});

registerProp('prop_h_old_shichu', (opts) => {
  const v = Number(opts.v ?? 0);
  return standProp(
    34,
    12,
    (p) => {
      // a rusty steel pipe fallen at a slant, a kuzu vine winding round it
      const y0 = 2 + (v % 2) * 2;
      p.line(1, y0 + 8, 32, y0, P.brassOld);
      p.line(1, y0 + 9, 32, y0 + 1, P.wood);
      for (let x = 2; x < 32; x++) {
        if (ihash(x, v, 3931) % 3) continue;
        const y = Math.round(y0 + 8 - (x * 8) / 31);
        p.set(x, y - 1, P.leafDeep);
        p.set(x + 1, y + 2, P.leaf);
      }
      for (const [lx, ly] of [[8, 4], [20, 1], [28, 0]]) {
        p.ellipse(lx, ly + y0, 2, 1.5, P.leafDeep);
        p.set(lx - 1, ly + y0 - 1, P.leafYoung);
      }
    },
    { cx: 16, base: 16, shadow: 0, contact: 0 },
  );
});

regStand(
  'prop_h_kuchita_koya',
  34,
  18,
  (p) => {
    // only the rusty tin roof is left, lying on the ground at a slant
    p.poly([[1, 8], [28, 1], [33, 10], [6, 17]], P.brassOld);
    for (let k = 0; k < 8; k++) p.line(2 + k * 4, 8 - Math.round(k * 0.9) + 0, 7 + k * 4, 17 - Math.round(k * 0.9), k % 2 ? P.wood : mix(P.brassOld, P.steel, 0.3));
    p.line(1, 8, 28, 1, P.steel);
    // the weeds through the holes
    for (const [x, y] of [[12, 9], [21, 6], [26, 10]]) {
      p.set(x, y, P.leafYoung);
      p.set(x + 1, y - 1, P.leaf);
    }
  },
  { cx: 16, base: 16, shadow: 0, contact: 0 },
);

/** The two thick cedars at the mouth of the hill path, their low branches in the foreground. */
registerProp('prop_h_sugi_edge', (opts) => {
  const v = Number(opts.v ?? 0);
  const t = new PixelCanvas(16, 64);
  for (let y = 0; y < 64; y++)
    for (let x = 3; x < 13; x++) {
      const u = (x - 3) / 9;
      let c: string = u < 0.2 ? P.wood : u > 0.7 ? P.ink : P.woodDark;
      if ((y + x * 3) % 7 === 0 && u > 0.2 && u < 0.7) c = P.wood;
      t.set(x, y, c);
    }
  // the roots
  t.poly([[0, 63], [3, 55], [3, 63]], P.woodDark);
  t.poly([[15, 63], [12, 55], [12, 63]], P.ink);
  outline(t, { bottom: true, soft: true });
  const trunk = t.toCanvas();
  const b = new PixelCanvas(40, 24);
  for (let k = 0; k < 4; k++) {
    const y = 4 + k * 5;
    const dir = (k + v) % 2 ? 1 : -1;
    for (let i = 0; i < 16; i++) {
      const x = 20 + dir * i;
      const hw = Math.max(0, 3 - Math.floor(i / 5));
      for (let j = -hw; j <= hw; j++) b.set(x, y + j + Math.floor(i / 6), j < 0 ? P.leafDeep : j > 0 ? P.night : P.leafShade);
    }
  }
  outline(b, { bottom: true, soft: true });
  const bough = b.toCanvas();
  return {
    ox: 0,
    oy: 16 - 64,
    w: 16,
    h: 64,
    foot: 15,
    img: () => trunk,
    shadow: 60,
    contact: 12,
    contactX: 8,
    fg: [{ ox: -12, oy: -52, img: () => bough }],
  };
});

regStand(
  'obj_hoshi_houki_sign',
  26,
  26,
  (p) => {
    // a rotted wooden sign, leaning: 「――さんの 畑」, the middle of the name gone
    p.line(12, 25, 14, 10, P.woodDark);
    p.line(13, 25, 15, 10, P.wood);
    p.poly([[2, 3], [23, 1], [24, 12], [3, 14]], HP.oldWood);
    p.line(2, 3, 23, 1, mix(HP.oldWood, P.concrete, 0.4));
    p.line(3, 14, 24, 12, HP.oldWoodDk);
    // the name: the middle rotted away
    p.hline(5, 7, 6, P.ink);
    p.set(6, 8, P.ink);
    p.poly([[9, 4], [15, 3], [14, 9], [10, 10]], HP.oldWoodDk);
    p.hline(17, 21, 6, P.ink);
    p.set(19, 8, P.ink);
    p.set(20, 9, P.ink);
    p.set(8, 11, P.leafShade);
  },
  { cx: 8, base: 16, shadow: 20 },
);

regStand(
  'obj_hoshi_yamaguchi_sign',
  14,
  30,
  (p) => {
    // a post with an arrow board 「星見の丘 天文台 →」
    p.vline(6, 4, 29, P.wood);
    p.vline(7, 4, 29, P.woodDark);
    p.rect(1, 6, 12, 6, P.woodLt);
    p.hline(1, 11, 6, P.goldPale);
    p.set(12, 8, P.woodLt);
    p.set(13, 9, P.woodLt);
    p.set(12, 10, P.woodLt);
    p.hline(3, 5, 8, P.ink);
    p.hline(7, 9, 8, P.ink);
    p.set(4, 10, P.ink);
    p.set(8, 10, P.ink);
    p.set(6, 3, P.woodLt);
  },
  { cx: 8, base: 16, shadow: 26 },
);

/** A stump by the wallow, mud rubbed up its foot to 8px (こすりつけた跡). */
regStand(
  'prop_h_nuta_tree',
  16,
  24,
  (p) => {
    for (let y = 0; y < 24; y++) for (let x = 4; x < 12; x++) p.set(x, y, x < 6 ? P.wood : x > 9 ? P.ink : P.woodDark);
    for (let y = 16; y < 24; y++) for (let x = 3; x < 13; x++) if (p.alpha(x, y) || (y > 20 && (x === 3 || x === 12))) p.set(x, y, y === 16 ? P.wood : h01(x, y, 3941) < 0.3 ? P.wood : P.woodDark);
    p.hline(4, 11, 0, P.woodLt);
    p.set(7, 1, P.brassOld);
  },
  { cx: 8, base: 16, shadow: 20 },
);

// ---------------------------------------------------------------- ふくじんづけの毛布 (53,33)

/** The dog's folded blanket on the concrete in front of the barn (he lies on it; 52 3.4). */
registerProp('prop_h_blanket', () => {
  const p = new PixelCanvas(18, 12);
  p.rect(1, 2, 16, 9, P.wood);
  p.hline(1, 16, 2, P.woodLt);
  p.hline(1, 16, 6, P.woodDark);
  p.hline(2, 15, 7, P.woodLt);
  p.vline(16, 3, 10, P.woodDark);
  for (let x = 3; x < 16; x += 4) p.set(x, 4, P.brassOld);
  p.set(1, 10, P.woodDark);
  const img = p.toCanvas();
  return { ox: -1, oy: 5, w: 18, h: 12, foot: 0, flat: true, img: () => img };
});

// ---------------------------------------------------------------- 足あと

/** Children's shoe prints on the old lane (x48–49, y7–15): drawn only in the lantern's light (litOnly). */
registerProp('decal_h_kodomo_ashiato', (opts) => {
  const n = Number(opts.n ?? 0);
  const p = new PixelCanvas(32, 32);
  const col = mix(P.woodLt, P.brassOld, 0.35);
  for (let k = 0; k < 4; k++) {
    const x = 9 + (k % 2) * 8 + ((n + k) % 2);
    const y = 26 - k * 7;
    // a small sneaker print: sole, heel, the toe's groove
    p.rect(x, y, 3, 4, col);
    p.set(x + 1, y + 1, P.wood);
    p.rect(x, y + 5, 3, 1, col);
    p.set(x + 1, y, mix(col, P.white, 0.3));
  }
  const img = p.toCanvas();
  return { ox: 0, oy: 0, w: 32, h: 32, foot: 0, flat: true, img: () => img };
});

/** Boar prints (two-toed hooves, 4px apart) running off to the woods (restored_enemy_chototsu). */
registerProp('decal_h_inoshishi_ashiato', (opts) => {
  const len = Number(opts.len ?? 5);
  const dir = String(opts.dir ?? 'n');
  const dx = dir === 'ne' ? 5 : 0;
  const W = 16 + len * dx + 8;
  const H = len * 14 + 16;
  const p = new PixelCanvas(W, H);
  const col = mix(P.woodDark, P.charcoal, 0.3);
  for (let k = 0; k < len * 3; k++) {
    const x = 6 + Math.round((k * dx) / 3) + (k % 2) * 4;
    const y = H - 6 - k * 5;
    if (y < 0) break;
    p.set(x, y, col);
    p.set(x + 1, y, col);
    p.set(x, y + 1, col);
    p.set(x + 2, y + 1, col);
    p.set(x, y + 2, col);
    p.set(x + 2, y + 2, col);
  }
  const img = p.toCanvas();
  return { ox: 0, oy: 16 - H, w: W, h: H, foot: 0, flat: true, img: () => img };
});

void lt;
void dk;
void starTop;
void fontTextSmall;
void paintFrames;
