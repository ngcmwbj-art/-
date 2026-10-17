// 70年の 色紙と 小さな 夏祭り（02_ch2_index #84、52 7.6）：校庭の 桜に かけた 提灯 ひとつ、
// 祭りの あいだ 桜の 下に 置く 太鼓、集会所の 2人の 座布団の あいだに 立てた 色紙。
// それと、人物の 絵に 重ねる 小さな 物（グソっ君の 背中の 太鼓、エンディングの カット3で
// ぴょん夫人が 手に さげる 消えた 提灯）。
//
//   prop_h_matsuri_chochin  (24,30) 桜の 東の 低い 枝。頭の 上の 物なので fg（人物より 上）。
//                           トマトの 灯り（しゅん）が 近いあいだだけ、紙が 橙に すける（glow・light）
//   prop_h_matsuri_taiko    (27,29) 台に のせた 太鼓（皮は 東向き。祭りの あいだだけ）
//   prop_hr_shikishi_tate   集会所 (7,6) 小さな 台に 立てた 色紙

import { mix, PixelCanvas } from '../../engine/pixel';
import { P } from '../tiles/palette';
import { outline } from './kit';
import { glowDot, HLIGHT, nightK, standProp } from './hoshi_kit';
import { drawLight, poolEllipse } from './light';
import { registerProp } from './registry';
import type { PropArt, PropEnv } from './types';

// ---------------------------------------------------------------- 提灯

/** 提灯の 紙と 帯の 色（消えている ／ ともっている）。 */
const PAPER = { off: { hi: P.white, mid: P.concreteLt, lo: P.concrete, band: P.verm, bandLo: P.vermShade }, on: { hi: P.horizon, mid: P.sky, lo: P.sun, band: P.vermLt, bandLo: P.verm } };

/**
 * A festival paper lantern (提灯) w×h with its wooden top and bottom rims and
 * a red band round its belly; `lit`: the paper glows warm (the tomato's light
 * through it). `cord`: the cord it hangs by, above it.
 */
function lantern(w: number, h: number, lit: boolean, cord = 0): PixelCanvas {
  const p = new PixelCanvas(w + 2, h + cord + 2);
  const c = lit ? PAPER.on : PAPER.off;
  const x0 = 1;
  const y0 = 1 + cord;
  // the rims (dark wood), a step narrower than the belly
  p.hline(x0 + 1, x0 + w - 2, y0, P.woodDark);
  p.hline(x0 + 1, x0 + w - 2, y0 + h - 1, P.woodDark);
  // the paper: rounded at top and bottom, lit from the upper left (or from inside: brighter in the middle)
  for (let j = 1; j < h - 1; j++) {
    const edge = j === 1 || j === h - 2 ? 1 : 0;
    for (let i = edge; i < w - edge; i++) {
      const u = (i + 0.5) / w;
      let col: string = lit ? (u > 0.25 && u < 0.75 ? c.hi : c.mid) : u < 0.3 ? c.hi : u > 0.75 ? c.lo : c.mid;
      // the ribs every other row
      if (j % 2 === 0 && j !== Math.floor(h / 2)) col = lit ? mix(col, c.lo, 0.35) : mix(col, c.lo, 0.5);
      p.set(x0 + i, y0 + j, col);
    }
  }
  // the red band round the belly
  const by = y0 + Math.floor(h / 2);
  for (let i = 0; i < w; i++) {
    p.set(x0 + i, by, i > w - 3 ? c.bandLo : c.band);
    if (h >= 9) p.set(x0 + i, by - 1, i > w - 3 ? c.bandLo : i < 2 ? c.band : mix(c.band, c.hi, lit ? 0.2 : 0));
  }
  outline(p, { soft: true });
  // the cord it hangs by (after the outline: one pixel wide)
  if (cord) p.vline(x0 + Math.floor(w / 2), 0, y0 - 2, P.ink);
  return p;
}

let LANTERN_IMG: { off: HTMLCanvasElement; on: HTMLCanvasElement } | null = null;
function lanternImgs(): { off: HTMLCanvasElement; on: HTMLCanvasElement } {
  if (!LANTERN_IMG) LANTERN_IMG = { off: lantern(7, 10, false, 4).toCanvas(), on: lantern(7, 10, true, 4).toCanvas() };
  return LANTERN_IMG;
}

/** How lit the lantern on the cherry is: the tomato in the net (しゅん) near it, smoothly (0..1). */
export function chochinLit(env: PropEnv): number {
  if (!env.flag('flag_ch2_got_tomato') || env.flag('flag_ch2_boss_beaten')) return 0;
  // full while the lantern's light (radius ≈ 72 px, 52 8.5) reaches it; it fades out to 90 px
  return Math.max(0, Math.min(1, (90 - env.near) / 24));
}

// the lantern hangs from the crown's lower edge on the east side, over the path (x 401–409, y 466–484 for the tile (24,30))
const CH_OX = 16;
const CH_OY = -15;

registerProp('prop_h_matsuri_chochin', () => {
  const blank = new PixelCanvas(1, 1).toCanvas();
  const a: PropArt = {
    ox: 0,
    oy: 0,
    w: 1,
    h: 1,
    foot: 15,
    img: () => blank,
    // overhead: drawn above the people under it (like the canopy it hangs from)
    fg: [{ ox: CH_OX, oy: CH_OY, img: () => lanternImgs().off }],
    glowFg: true,
    glow(g, x, y, env) {
      const k = chochinLit(env);
      if (k <= 0.01) return;
      const im = lanternImgs().on;
      const lx = x + CH_OX;
      const ly = y + CH_OY;
      // the paper through which the light shows (it breathes a little, like a flame — though it is the tomato's)
      const fl = 0.92 + 0.08 * Math.sin(env.t * 0.0023);
      g.img(im, lx, ly, { alpha: Math.min(1, k * 1.05) });
      glowDot(g, lx + 4, ly + 10, '#FFE7A3', HLIGHT.warm, 13, 0.75 * k * fl);
    },
    light(g, x, y, env) {
      const k = chochinLit(env);
      if (k <= 0.01) return;
      // a small warm pool on the ground under it
      drawLight(g, poolEllipse(20, 10, HLIGHT.warm), x + CH_OX + 4, y + 14, 0.45 * k * Math.max(0.4, nightK(env)));
    },
  };
  return a;
});

// ---------------------------------------------------------------- 太鼓（台の 上）

/** The drum seen from the south: a lacquered barrel, brass tacks, its skin facing east (the drummer's side). */
function drumBody(p: PixelCanvas, x: number, y: number, w: number, h: number): void {
  // the barrel: darker at the ends, a highlight along the top
  for (let i = 0; i < w; i++) {
    const end = i === 0 || i === w - 1;
    for (let j = 0; j < h; j++) {
      if ((j === 0 || j === h - 1) && (i < 1 || i > w - 2)) continue;
      const v = j / (h - 1);
      let c: string = v < 0.25 ? P.red : v > 0.75 ? P.maroon : P.vermShade;
      if (end) c = v > 0.6 ? P.night : P.maroon;
      p.set(x + i, y + j, c);
    }
  }
  p.hline(x + 2, x + w - 3, y, P.vermLt);
  // the rows of brass tacks near both ends
  for (const tx of [x + 1, x + w - 2]) for (let j = 1; j < h - 1; j += 2) p.set(tx, y + j, P.brass);
  // the skin on the east end: an upright ellipse, cream
  const sx = x + w - 1;
  for (let j = 1; j < h - 1; j++) {
    p.set(sx, y + j, j < h / 2 ? P.paper : P.paperGrid);
    p.set(sx + 1, y + j, j === 1 || j === h - 2 ? P.paperGrid : P.paper);
  }
}

registerProp('prop_h_matsuri_taiko', () =>
  standProp(
    18,
    16,
    (p) => {
      // the stand: two splayed legs and a cross bar (dark wood)
      p.line(4, 9, 2, 15, P.woodDark);
      p.line(12, 9, 14, 15, P.woodDark);
      p.line(5, 10, 3, 15, P.wood);
      p.hline(3, 13, 12, P.wood);
      // the drum on it
      drumBody(p, 2, 2, 13, 9);
      // the two sticks resting on its top
      p.line(4, 1, 11, 3, P.woodLt);
      p.line(5, 0, 12, 2, P.goldPale);
    },
    { cx: 8, base: 16, shadow: 10, contact: 12 },
  ),
);

// ---------------------------------------------------------------- 色紙（集会所）

registerProp('prop_hr_shikishi_tate', () =>
  standProp(
    12,
    15,
    (p) => {
      // a small wooden easel (色紙掛けの 台)
      p.line(2, 14, 4, 9, P.woodDark);
      p.line(9, 14, 7, 9, P.woodDark);
      p.hline(1, 10, 13, P.wood);
      // the card, gold rim, leaning back a little
      p.rect(1, 1, 10, 11, P.brass);
      p.rect(2, 2, 8, 9, P.paper);
      p.hline(2, 9, 2, P.white);
      // the words in ink, the two pillows in the middle, the last one at the bottom
      // (寄せ書き: short vertical columns of ink round the edge)
      p.vline(8, 3, 6, P.ink);
      p.vline(6, 3, 4, P.ink);
      p.vline(3, 3, 6, P.ink);
      p.vline(8, 8, 9, P.charcoal);
      p.vline(3, 8, 9, P.charcoal);
      p.set(5, 6, P.navy);
      p.set(5, 7, P.paperGrid);
      p.set(6, 7, P.navy);
      p.set(5, 9, P.verm);
      p.set(6, 9, P.verm);
    },
    { cx: 7, base: 16, shadow: 8, contact: 8 },
  ),
);

// ---------------------------------------------------------------- 人物に 重ねる 物

let DRUM_BACK: Record<'side' | 'back' | 'front', HTMLCanvasElement> | null = null;

/**
 * The drum on グソっ君's back (11×9): from behind (the barrel across his back,
 * the strap), from the front (only the barrel's top and ends above his
 * shoulders: drawn behind him), from the side (the skin end toward his back).
 */
export function drumOnBack(view: 'side' | 'back' | 'front'): HTMLCanvasElement {
  if (!DRUM_BACK) {
    const mk = (v: 'side' | 'back' | 'front') => {
      const p = new PixelCanvas(13, 11);
      if (v === 'side') {
        // seen from the side: the round skin toward us, the barrel's rim
        p.ellipse(6, 5, 4, 4, P.maroon);
        p.ellipse(6, 5, 3, 3, P.paper);
        p.set(5, 4, P.white);
        p.set(7, 7, P.paperGrid);
        for (const [x, y] of [[2, 5], [6, 1], [10, 5], [6, 9], [3, 2], [9, 2], [3, 8], [9, 8]] as [number, number][]) p.set(x, y, P.brass);
      } else {
        drumBody(p, 1, 1, 11, 8);
        if (v === 'back') {
          // the cord over the shoulders
          p.vline(4, 1, 8, P.ink);
          p.vline(8, 1, 8, P.ink);
        }
      }
      outline(p, { soft: true });
      return p.toCanvas();
    };
    DRUM_BACK = { side: mk('side'), back: mk('back'), front: mk('front') };
  }
  return DRUM_BACK[view];
}

let HAND_LANTERN: HTMLCanvasElement | null = null;
/** A small lantern hanging from a hand by its cord (unlit, the morning after: ぴょん夫人 in cut 3). */
export function handLantern(): HTMLCanvasElement {
  if (!HAND_LANTERN) HAND_LANTERN = lantern(5, 7, false, 3).toCanvas();
  return HAND_LANTERN;
}
