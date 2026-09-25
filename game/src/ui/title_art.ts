// Title screen art (30_level_art 11): the frozen sunset seen from the south
// bridge — five silhouette layers (sky, far hills with 星見台, the town,
// the near wires / crossing / bridge with Minato and Kanenari from behind,
// swaying grass) — and the 「あぜ道の夕焼け」 logo, stamped in 朱.
// Everything static is baked once; the scene animates clouds, the sun's
// red-pen swirl, wires, grass, crows and the lit 「ユ」.
//
// The same panorama in night colours is the ending's cut_night_sky (8.6).

import { charWidth, glyphImage } from '../engine/font';
import type { Gfx } from '../engine/gfx';
import { BAYER4, makeCanvas, PixelCanvas } from '../engine/pixel';
import { hash2 } from '../engine/rng';
import { hanamaruPath } from '../battle/art/stamps';

export type Sky = 'sunset' | 'night';

// ---- helpers ----------------------------------------------------------------------

function hexRgb(c: string): [number, number, number] {
  const h = c.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
function mixHex(a: string, b: string, t: number): string {
  const [r1, g1, b1] = hexRgb(a);
  const [r2, g2, b2] = hexRgb(b);
  const f = (x: number, y: number) => Math.round(x + (y - x) * t).toString(16).padStart(2, '0');
  return `#${f(r1, r2)}${f(g1, g2)}${f(b1, b2)}`;
}
const dith = (x: number, y: number, v: number) => BAYER4[(y >> 1) & 3][(x >> 1) & 3] < v * 16;
const dith1 = (x: number, y: number, v: number) => BAYER4[y & 3][x & 3] < v * 16;

// ---- sky -----------------------------------------------------------------------------

export const SUN = { x: 104, y: 92, r: 28 };

const skyCache = new Map<Sky, HTMLCanvasElement>();

/** Sky 0–150: four bands joined with a 2px Bayer dither, a warm glow round the sun. */
export function skyCanvas(sky: Sky): HTMLCanvasElement {
  let c = skyCache.get(sky);
  if (c) return c;
  const p = new PixelCanvas(384, 216);
  const stops = sky === 'sunset' ? ['#F7C27A', '#F4A45E', '#F2894B', '#E8705E', '#E0567A'] : ['#1B1733', '#221C3E', '#2A2248', '#322652', '#3A2B5C'];
  for (let y = 0; y < 216; y++) {
    const t = Math.min(1, y / 150);
    const pos = t * (stops.length - 1);
    const i = Math.min(stops.length - 2, Math.floor(pos));
    const f = pos - i;
    // flat bands, dithered only near the seams
    const fe = Math.max(0, Math.min(1, (f - 0.3) / 0.4));
    for (let x = 0; x < 384; x++) {
      let col = dith(x, y, fe) ? stops[i + 1] : stops[i];
      if (sky === 'sunset') {
        // the halo round the sun: three soft rings, 1px-dithered at their edges
        const d = Math.hypot(x - SUN.x, (y - SUN.y) * 1.15) - SUN.r;
        const rings: [number, number][] = [
          [9, 0.42],
          [22, 0.26],
          [40, 0.13],
        ];
        for (const [r, amt] of rings) {
          const edge = (r - d) / 3; // 0..1 across a 3px seam
          if (d < r - 3 || (edge > 0 && dith1(x, y, edge))) {
            col = mixHex(col, '#FFE7A3', amt);
            break;
          }
        }
      }
      p.set(x, y, col);
    }
  }
  if (sky === 'night') {
    // stars (fixed); the twinkling ones are drawn on top by the scene
    for (let i = 0; i < 60; i++) {
      const x = Math.floor(hash2(i, 1, 77) * 384);
      const y = Math.floor(hash2(i, 2, 77) * 120);
      p.set(x, y, hash2(i, 3, 77) < 0.3 ? '#FFF6D8' : '#8A7AB0');
    }
  }
  c = p.toCanvas();
  skyCache.set(sky, c);
  return c;
}

// ---- the sun (hanamaru-shaped) ------------------------------------------------------------

let sunC: HTMLCanvasElement | null = null;
/** 朱 disk with 12 petal scallops on the rim; the swirl is drawn live. */
export function sunCanvas(): HTMLCanvasElement {
  if (sunC) return sunC;
  const S = 72;
  const cx = S / 2;
  const p = new PixelCanvas(S, S);
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - cx;
      const a = Math.atan2(dy, dx);
      const d = Math.hypot(dx, dy);
      const R = SUN.r - 3 + 4 * Math.sqrt(Math.abs(Math.cos(a * 6)));
      if (d > R) continue;
      // lit from the upper left, darker to the lower right, a bright rim
      const lx = (dx + dy) / (R * 1.4);
      let col = '#E23B2E';
      // flat crescents of light and shade with a narrow dithered seam
      if (lx < -0.6 || (lx < -0.5 && dith1(x, y, (-0.5 - lx) * 10))) col = '#FF6A4D';
      if (lx > 0.55 || (lx > 0.45 && dith1(x, y, (lx - 0.45) * 10))) col = '#C82E26';
      if (d > R - 1.2) col = lx < 0.2 ? '#FF8A5A' : '#B8241E';
      p.set(x, y, col);
    }
  sunC = p.toCanvas();
  return sunC;
}

/** The red-pen swirl inside the sun (3 turns), rotated by `rot` radians; `pulse` 0..1 brightens it. */
export function drawSunSwirl(g: Gfx, rot: number, pulse: number): void {
  const col = pulse > 0.05 ? mixHex('#FF6A4D', '#FFE7A3', Math.min(1, pulse)) : '#FF6A4D';
  let px = -999;
  let py = -999;
  for (let i = 0; i <= 260; i++) {
    const t = i / 260;
    const a = rot + t * Math.PI * 2 * 3;
    const r = 2 + t * 19;
    const x = Math.round(SUN.x + Math.cos(a) * r);
    const y = Math.round(SUN.y + Math.sin(a) * r);
    if (x === px && y === py) continue;
    g.px(x, y, col);
    px = x;
    py = y;
  }
}

// ---- clouds ------------------------------------------------------------------------------

export const CLOUDS = [
  { x: 20, y: 40, len: 104, th: 4, seed: 1 },
  { x: 190, y: 62, len: 78, th: 3, seed: 2 },
  { x: 250, y: 30, len: 120, th: 5, seed: 3 },
];

const cloudCache = new Map<string, HTMLCanvasElement>();
/** A long thin cloud: #FFE7A3 body, #D9728A under-edge (sunset) / dim violet (night). */
export function cloudCanvas(i: number, sky: Sky): HTMLCanvasElement {
  const key = i + sky;
  let c = cloudCache.get(key);
  if (c) return c;
  const d = CLOUDS[i];
  const p = new PixelCanvas(d.len, d.th + 3);
  const body = sky === 'sunset' ? '#FFE7A3' : '#4A3A6E';
  const under = sky === 'sunset' ? '#D9728A' : '#2A2248';
  const top = sky === 'sunset' ? '#FFF6D8' : '#5B4A7A';
  for (let x = 0; x < d.len; x++) {
    const u = x / d.len;
    // lens shape with a lumpy top
    const h = Math.max(0, Math.round(d.th * Math.sin(Math.PI * u) + (hash2(x >> 3, 0, d.seed) - 0.5) * 1.6));
    if (h <= 0) continue;
    const y0 = d.th + 1 - h;
    for (let y = y0; y <= d.th; y++) p.set(x, y, y === y0 ? top : body);
    p.set(x, d.th + 1, under);
  }
  c = p.toCanvas();
  cloudCache.set(key, c);
  return c;
}

// ---- far hills with 星見台 --------------------------------------------------------------------

const farCache = new Map<Sky, HTMLCanvasElement>();

/** Screen y of the top of the far hills (and 星見台's dome) at column x. */
export function farTop(x: number): number {
  let top = 128 + Math.sin(x / 47) * 5 + Math.sin(x / 19 + 1.3) * 2;
  if (x > 300) top = Math.min(top, 120 - Math.sin(((x - 300) / 84) * Math.PI) * 10);
  const dx = x - 352;
  if (Math.abs(dx) <= 10) top = Math.min(top, 108 - Math.sqrt(Math.max(0, 100 - dx * dx) / 1.2));
  return Math.round(top);
}

export function farCanvas(sky: Sky): HTMLCanvasElement {
  let c = farCache.get(sky);
  if (c) return c;
  const p = new PixelCanvas(384, 60);
  const col = sky === 'sunset' ? '#B04A7Acc' : '#2E2450';
  const oy = 104; // canvas y 0 = screen y 104
  for (let x = 0; x < 384; x++) {
    let top = 128 + Math.sin(x / 47) * 5 + Math.sin(x / 19 + 1.3) * 2;
    // the hill of 星見台 on the right
    if (x > 300) top = Math.min(top, 120 - Math.sin(((x - 300) / 84) * Math.PI) * 10);
    for (let y = Math.round(top); y < 164; y++) p.set(x, y - oy, col);
  }
  // a lighter rim along the ridge: the last of the light on the hilltops
  if (sky === 'sunset') for (let x = 0; x < 384; x++) p.set(x, farTop(x) - oy, '#C8608Acc');
  // observatory dome with its slit
  const dx = 352;
  const dy = 108;
  for (let y = -9; y <= 0; y++)
    for (let x = -10; x <= 10; x++) if (x * x + y * y * 1.2 <= 100) p.set(dx + x, dy + y - oy, col);
  p.rect(dx - 11, dy + 1 - oy, 23, 5, col);
  p.rect(dx - 13, dy + 5 - oy, 27, 3, col);
  // the slit shows the night inside it
  p.vline(dx + 2, dy - 8 - oy, dy - oy, sky === 'sunset' ? '#3A2B5C' : '#F6D98A');
  p.vline(dx + 3, dy - 7 - oy, dy - oy, sky === 'sunset' ? '#3A2B5C' : '#F6D98A');
  c = p.toCanvas();
  farCache.set(sky, c);
  return c;
}

/**
 * What the patch of sky over 星見台 looks like (52_ch2_level_art 12.4):
 * 'night' (chapter 1, and chapter 2 not yet finished) or 'dawn' (chapter 2
 * has been finished: the village's morning came).
 */
export type HoshimiSky = 'night' | 'dawn';

/**
 * The little patch of sky above 星見台, drawn behind the far hills. 'night':
 * a pocket of dusk violet deepening to #3A2B5C with its two stars. 'dawn':
 * the same pocket gone to morning glow — #FFE7A3 in the middle, #F7C27A,
 * and an edge of #F2894B dithered into the sunset — with no stars.
 */
export function drawHoshimiNight(g: Gfx, t: number, frozenStar: boolean, sky: HoshimiSky = 'night'): void {
  const cx = 352;
  const cy = 100;
  const dawn = sky === 'dawn';
  for (let y = -16; y <= (dawn ? 16 : 6); y++)
    for (let x = -28; x <= (dawn ? 32 : 28); x++) {
      const X = cx + x;
      const Y = cy + y;
      if (Y >= farTop(X)) continue;
      // the glow wells up round the sunrise point on the ridge (366,112)
      const gx = X - HOSHIMI_SUNRISE.x;
      const gy = Y - HOSHIMI_SUNRISE.y;
      const d = dawn ? (gx * gx) / 900 + (gy * gy) / 441 : (x * x) / 784 + (y * y) / 256;
      if (d > 1) continue;
      let col: string;
      if (dawn) {
        if (d > 0.72) {
          if (!dith1(X, Y, (1 - d) / 0.28)) continue;
          col = '#F2894B';
        } else if (d > 0.45) col = dith1(X, Y, (0.72 - d) / 0.27) ? '#F7C27A' : '#F2A060';
        else if (d > 0.18) col = dith1(X, Y, (0.45 - d) / 0.27) ? '#FFE7A3' : '#F7C27A';
        else col = '#FFE7A3';
      } else {
        col = '#3A2B5C';
        if (d > 0.72) {
          if (!dith1(X, Y, (1 - d) / 0.28)) continue;
          col = '#8A4E86';
        } else if (d > 0.4) col = dith1(X, Y, (0.72 - d) / 0.32) ? '#4E3A70' : '#6A4680';
        else if (d > 0.2) col = dith1(X, Y, (0.4 - d) / 0.2) ? '#3A2B5C' : '#4E3A70';
      }
      g.px(X, Y, col);
    }
  if (dawn) return;
  const tw = Math.floor(t / 700) % 3 !== 0;
  g.px(cx - 12, cy - 7, tw ? '#FFF6D8' : '#B8A8D8');
  g.px(cx + 9, cy - 10, '#FFF6D8');
  g.px(cx - 2, cy - 12, Math.floor(t / 900) % 2 ? '#C8B8E0' : '#6A5A8E');
  if (frozenStar) {
    g.px(cx + 8, cy - 10, '#FFE7A3');
    g.px(cx + 10, cy - 10, '#FFE7A3');
    g.px(cx + 9, cy - 11, '#FFE7A3');
    g.px(cx + 9, cy - 9, '#FFE7A3');
  }
}

/** Where the village sits on 星見台's slope (52 12.4): the tomato's light walks there. */
export const HOSHIMI_VILLAGE = { x: 336, y: 121 };
/** The morning sun just over the ridge, once chapter 2 is finished. */
export const HOSHIMI_SUNRISE = { x: 366, y: 112 };

/**
 * Chapter 2's marks on the title, drawn over the far hills (52 12.4):
 *  - `lantern`: chapter 2 is under way — on the hill's slope where the
 *    village is, one pixel of tomato light (#F2894B), 1.2 s lit and 0.8 s
 *    back to the hill's own colour: someone is walking the village with it.
 *  - `dawn`: chapter 2 is finished — the ridge of 星見台's hill catches the
 *    morning (#FFE7A3 along its edge, dithered away at both ends) and the
 *    sun is a 朱 point just over it.
 */
export function drawHoshimiMarks(g: Gfx, t: number, o: { lantern?: boolean; dawn?: boolean }): void {
  if (o.dawn) {
    for (let x = 318; x < 384; x++) {
      // strongest under the glow, fading out toward the two ends
      const u = 1 - Math.abs(x - HOSHIMI_SUNRISE.x) / 40;
      if (u <= 0 || !dith1(x, 3, Math.min(1, u * 1.8))) continue;
      g.px(x, farTop(x), '#FFE7A3');
    }
    g.px(HOSHIMI_SUNRISE.x, HOSHIMI_SUNRISE.y, '#E23B2E');
  }
  if (o.lantern) {
    const on = t % 2000 < 1200;
    g.px(HOSHIMI_VILLAGE.x, HOSHIMI_VILLAGE.y, on ? '#F2894B' : '#B04A7A');
  }
}

// ---- mid layer: the town ---------------------------------------------------------------------

const midCache = new Map<Sky, HTMLCanvasElement>();
export const MALL_SIGN = { x: 262, y: 118 };

export function midCanvas(sky: Sky): HTMLCanvasElement {
  let c = midCache.get(sky);
  if (c) return c;
  const col = sky === 'sunset' ? '#5B4A7A' : '#221C3A';
  const p = new PixelCanvas(384, 100);
  const oy = 110;
  const put = (x: number, y: number) => p.set(x, y - oy, col);
  const rect = (x: number, y: number, w: number, h: number) => p.rect(x, y - oy, w, h, col);
  // base of the town
  rect(0, 156, 384, 30);
  // houses: gabled roofs of varying widths, ridge tiles, antennas
  let x = 0;
  let i = 0;
  while (x < 384) {
    const w = 18 + Math.floor(hash2(i, 0, 3) * 20);
    const eave = 150 - Math.floor(hash2(i, 1, 3) * 10);
    const peak = eave - 5 - Math.floor(hash2(i, 2, 3) * 6);
    for (let k = 0; k < w; k++) {
      const u = Math.abs(k - w / 2) / (w / 2);
      const top = Math.round(peak + (eave - peak) * u);
      for (let y = top; y < 160; y++) put(x + k, y);
    }
    // ridge tile bumps
    if (w > 22) for (let k = 3; k < w - 3; k += 4) put(x + k, peak - 1);
    // TV antenna on some roofs
    if (hash2(i, 4, 3) < 0.4) {
      const ax = x + Math.floor(w * 0.6);
      for (let y = peak - 9; y < peak; y++) put(ax, y);
      for (let k = -3; k <= 3; k++) put(ax + k, peak - 7);
      for (let k = -2; k <= 2; k++) put(ax + k, peak - 4);
    }
    x += w - 2;
    i++;
  }
  // clock tower (x70) with its face (a lighter disc)
  rect(64, 120, 12, 40);
  rect(62, 118, 16, 3);
  for (let k = 0; k < 8; k++) rect(66 + (k > 3 ? 1 : 0), 110 + k, 8 - (k > 3 ? 2 : 0) - Math.max(0, 3 - k), 1);
  // arcade arch (夕鳴銀座) around x 150
  for (let a = 0; a <= 40; a++) {
    const t = (a / 40) * Math.PI;
    const ax = Math.round(150 + Math.cos(Math.PI - t) * 26);
    const ay = Math.round(140 - Math.sin(t) * 14);
    rect(ax, ay, 2, 2);
  }
  rect(123, 140, 3, 20);
  rect(175, 140, 3, 20);
  rect(136, 128, 28, 5);
  // keyaki tree (round canopy) at x ~205
  for (let y = -16; y <= 12; y++)
    for (let k = -18; k <= 18; k++) {
      const d = (k * k) / 324 + (y * y) / 196;
      const edge = 0.9 + hash2(k >> 1, y >> 1, 8) * 0.2;
      if (d < edge) put(205 + k, 140 + y);
    }
  rect(204, 150, 3, 10);
  // disaster-prevention speaker pole with its horns (x 232)
  rect(232, 112, 2, 48);
  for (const [hx, hy, dir] of [[228, 114, -1], [236, 114, 1], [228, 120, -1], [236, 120, 1]] as [number, number, number][])
    for (let k = 0; k < 4; k++) rect(hx + (dir < 0 ? -k : 0), hy - Math.floor(k / 2), k + 1, 1 + k);
  // the mall and its sign 「ユウナリ」 on a tall pole
  rect(282, 132, 56, 28);
  rect(290, 126, 40, 8);
  rect(MALL_SIGN.x + 20, 128, 2, 30);
  rect(MALL_SIGN.x - 2, MALL_SIGN.y - 2, 46, 14);
  c = p.toCanvas();
  midCache.set(sky, c);
  return c;
}

// tiny 7×7 katakana for the mall sign: ユ ウ ナ リ
const SIGN_GLYPHS = [
  ['.......', '.#####.', '.....#.', '.....#.', '.....#.', '#######', '.......'],
  ['...#...', '#######', '#.....#', '.....#.', '....#..', '..##...', '.......'],
  ['...#...', '#######', '...#...', '...#...', '...#...', '..#....', '.#.....'],
  ['.#...#.', '.#...#.', '.#...#.', '.....#.', '....#..', '...#...', '.##....'],
];

/** The mall sign: 「ユ」 flickers lit (#FFE7A3), the rest are dead tubes. */
export function drawMallSign(g: Gfx, lit: boolean, sky: Sky): void {
  const dead = sky === 'sunset' ? '#6E5A8E' : '#2E2648';
  SIGN_GLYPHS.forEach((rows, i) => {
    const on = i === 0 && lit;
    const col = on ? '#FFE7A3' : dead;
    rows.forEach((r, y) => [...r].forEach((ch, x) => ch === '#' && g.px(MALL_SIGN.x + 1 + i * 10 + x, MALL_SIGN.y + 1 + y, col)));
    if (on) {
      // a soft halo round the lit tube
      g.alpha(0.25, () => g.rect(MALL_SIGN.x - 1 + i * 10, MALL_SIGN.y - 1, 11, 11, '#FFE7A3'));
    }
  });
}

// ---- near layer: poles, crossing, canal rail, bridge, the two of them ------------------------------

const nearCache = new Map<Sky, HTMLCanvasElement>();
export const POLES = [
  { x: 36, top: 146 },
  { x: 318, top: 142 },
];
/** The canal between the far bank and the bridge (reflects the sky). */
export const WATER = { y0: 186, y1: 199 };

export function nearCanvas(sky: Sky): HTMLCanvasElement {
  let c = nearCache.get(sky);
  if (c) return c;
  const col = sky === 'sunset' ? '#2A2440' : '#141026';
  const rim = sky === 'sunset' ? '#F2894B' : '#6A5A8E';
  const p = new PixelCanvas(384, 216);
  const rect = (x: number, y: number, w: number, h: number, cc = col) => p.rect(x, y, w, h, cc);
  // the far bank of the canal (a little uneven), its guard rail on top
  for (let x = 0; x < 384; x++) {
    const bump = Math.round(Math.sin(x / 13) * 1 + hash2(x >> 2, 0, 12) * 1.6);
    rect(x, 183 - bump, 1, WATER.y0 - 183 + bump);
  }
  // the guard rail on the far bank (a gap where the two of them stand)
  for (let x = 0; x < 384; x++) if ((x < 126 || x > 190) && (x < 292 || x > 372)) rect(x, 178, 1, 1);
  for (let x = 4; x < 292; x += 22) if (x < 126 || x > 190) rect(x, 178, 2, 6);
  // utility poles with crossarms and a transformer
  for (const pl of POLES) {
    rect(pl.x - 1, pl.top, 3, WATER.y0 - pl.top);
    rect(pl.x - 9, pl.top + 4, 19, 2);
    rect(pl.x - 6, pl.top + 10, 13, 2);
    rect(pl.x + 3, pl.top + 16, 6, 9);
    for (const k of [-8, -3, 4, 9]) rect(pl.x + k, pl.top + 2, 1, 2);
    for (let y = pl.top + 20; y < pl.top + 40; y += 5) rect(pl.x + (y % 10 ? -2 : 2), y, 1, 1);
  }
  // railway crossing on the right: post, ✕ sign, lamps, barrier arm lowered
  const cx = 364;
  rect(cx - 1, 146, 3, 40);
  for (let k = -6; k <= 6; k++) {
    rect(cx + k, 154 + k, 2, 1);
    rect(cx + k, 154 - k, 2, 1);
  }
  rect(cx - 7, 162, 15, 4);
  rect(cx - 8, 163, 3, 3);
  rect(cx + 6, 163, 3, 3);
  rect(cx - 3, 170, 7, 4);
  for (let x = 294; x < cx; x++) if (x % 7 !== 0) rect(x, 176, 1, 2);
  rect(cx + 1, 174, 5, 6);
  // the bridge in front: deck and railing
  rect(0, 202, 384, 14);
  rect(0, 199, 384, 2);
  for (let x = 6; x < 384; x += 30) rect(x, 199, 4, 17);
  for (let x = 0; x < 384; x += 2) p.set(x, 203, sky === 'sunset' ? '#3A2B5C' : '#1E1834');
  // ---- Minato (the bug net over his shoulder) and Kanenari (bell), from behind
  const mx = 146;
  const fy = 204; // feet, behind the railing
  const body = (x: number, y: number, w: number, h: number) => rect(x, y, w, h);
  // Minato: spiky hair, head, neck, T-shirt, shorts
  p.ellipse(mx + 0.5, fy - 25, 5.5, 6, col);
  body(mx - 4, fy - 31, 9, 2);
  p.set(mx - 3, fy - 33, col);
  p.set(mx - 2, fy - 32, col);
  p.set(mx + 2, fy - 33, col);
  p.set(mx + 4, fy - 32, col);
  body(mx - 2, fy - 20, 5, 2);
  body(mx - 6, fy - 18, 13, 11);
  body(mx - 8, fy - 17, 2, 7); // arms
  body(mx + 7, fy - 17, 2, 7);
  body(mx - 5, fy - 7, 11, 5);
  // the bug net over his left shoulder, the hoop up behind to the left
  for (let k = 0; k < 22; k++) p.set(mx - 6 - Math.floor(k * 0.5), fy - 15 - k, col);
  for (let k = 0; k < 22; k++) p.set(mx - 5 - Math.floor(k * 0.5), fy - 15 - k, col);
  p.ring(mx - 20, fy - 41, 6, 4.5, col);
  p.ring(mx - 20, fy - 41, 5, 3.5, col);
  // the bag of netting hanging off the hoop (every other pixel: it's see-through)
  for (let y = -3; y <= 5; y++)
    for (let x = -4; x <= 3; x++) if ((x + y) % 2 === 0 && x * x + (y - 1) * (y - 1) < 20) p.set(mx - 21 + x, fy - 36 + y, col);
  // Kanenari: the big bell head (a dome that flares into a lip), its hanging loop, a stubby body
  const kx = 168;
  for (let y = fy - 40; y <= fy - 19; y++) {
    const u = (y - (fy - 40)) / 21;
    // dome for the top third, then flaring out to the lip
    const half = u < 0.3 ? Math.sqrt(Math.max(0, 1 - Math.pow((0.3 - u) / 0.3, 2))) * 6.5 : 6.5 + Math.pow((u - 0.3) / 0.7, 1.6) * 6;
    for (let x = Math.round(kx - half); x <= Math.round(kx + half); x++) p.set(x, y, col);
  }
  body(kx - 13, fy - 20, 27, 2); // the lip
  p.ring(kx + 0.5, fy - 43, 2.5, 2.5, col);
  body(kx - 9, fy - 18, 19, 13);
  body(kx - 11, fy - 16, 3, 8); // arms
  body(kx + 9, fy - 16, 3, 8);
  body(kx - 8, fy - 5, 17, 3);
  // 1px rim light on their left edges (the sun is on the left)
  const src = p.data.slice();
  const colV = src[(fy - 25) * 384 + mx];
  for (let y = fy - 48; y < 199; y++)
    for (let x = 118; x < 184; x++) {
      const i = y * 384 + x;
      if (src[i] !== colV || src[i - 1] === colV) continue;
      p.set(x, y, rim);
    }
  c = p.toCanvas();
  nearCache.set(sky, c);
  return c;
}

/**
 * The canal between the bank and the bridge: the sky's colours in it, and
 * the sun's reflection as a column of broken streaks (they stop when the
 * town stops).
 */
export function drawWater(g: Gfx, t: number, sky: Sky, frozenT: number | null): void {
  const tt = frozenT ?? t;
  const cols = sky === 'sunset' ? ['#C85A7E', '#A8487A', '#8A3E74', '#6E3A6E'] : ['#2A2248', '#241E40', '#1E1834', '#18142C'];
  for (let y = WATER.y0; y < WATER.y1; y++) {
    const k = (y - WATER.y0) / (WATER.y1 - WATER.y0);
    const ci = Math.min(3, Math.floor(k * 4));
    g.rect(0, y, 384, 1, cols[ci]);
  }
  const glint = sky === 'sunset' ? ['#FFE7A3', '#F2894B', '#E8603C'] : ['#F6D98A', '#8A7AB0', '#4A3A6E'];
  const cx = sky === 'sunset' ? SUN.x : 60;
  for (let y = WATER.y0 + 1; y < WATER.y1; y += 2) {
    const row = (y - WATER.y0) >> 1;
    const w = sky === 'sunset' ? 22 - row * 1.5 : 10;
    const drift = Math.sin(tt / 700 + row * 1.7) * 3;
    const len = Math.max(2, Math.round(w * (0.6 + 0.4 * Math.sin(tt / 450 + row))));
    const x = Math.round(cx - len / 2 + drift);
    g.rect(x, y, len, 1, glint[Math.min(2, row % 3)]);
    // scattered sparkles further out
    for (let k = 0; k < 3; k++) {
      const sx = Math.round(cx + Math.sin(row * 3.1 + k * 2.3 + tt / 1300) * (30 + k * 18));
      if ((Math.floor(tt / 200) + k + row) % 4 === 0) g.rect(sx, y, 2 + k, 1, glint[2]);
    }
  }
  // the far bank's dark reflection along the top edge
  g.rect(0, WATER.y0, 384, 1, sky === 'sunset' ? '#5B3A64' : '#141026');
}

/** Wires between the poles (and off-screen), sagging; `sway` is a small offset in px. */
export function drawWires(g: Gfx, sway: number, sky: Sky): void {
  const col = sky === 'sunset' ? '#2A2440' : '#141026';
  const spans: [number, number, number, number, number][] = [
    [-40, 140, POLES[0].x - 8, POLES[0].top + 4, 7],
    [POLES[0].x + 9, POLES[0].top + 4, POLES[1].x - 8, POLES[1].top + 4, 20],
    [POLES[1].x + 9, POLES[1].top + 4, 420, 138, 8],
    [POLES[0].x - 5, POLES[0].top + 10, POLES[1].x - 5, POLES[1].top + 10, 16],
    [POLES[0].x + 6, POLES[0].top + 10, POLES[1].x + 6, POLES[1].top + 10, 17],
  ];
  spans.forEach(([x0, y0, x1, y1, sag], si) => {
    let py = -1;
    for (let x = Math.max(0, Math.ceil(x0)); x <= Math.min(383, x1); x++) {
      const u = (x - x0) / (x1 - x0);
      const y = Math.round(y0 + (y1 - y0) * u + Math.sin(Math.PI * u) * (sag + sway * (si % 2 ? 0.7 : 1)));
      if (py >= 0 && Math.abs(y - py) > 1) {
        const a = Math.min(py, y);
        const b = Math.max(py, y);
        for (let yy = a; yy <= b; yy++) g.px(x, yy, col);
      } else g.px(x, y, col);
      py = y;
    }
  });
}

/** Foreground grass tufts (#1B1733) along the bottom, swaying with `t`. */
export function drawGrass(g: Gfx, t: number, move: number): void {
  const col = '#1B1733';
  for (let i = 0; i < 26; i++) {
    const u = hash2(i, 0, 21);
    const bx = u < 0.5 ? Math.floor(u * 2 * 110) - 6 : 290 + Math.floor((u - 0.5) * 2 * 100);
    const h = 5 + Math.floor(hash2(i, 1, 21) * 9);
    const ph = hash2(i, 2, 21) * 6;
    const sw = Math.sin(t / 900 + ph) * move;
    for (let b = -2; b <= 2; b++) {
      const bh = h - Math.abs(b) * 2;
      for (let k = 0; k < bh; k++) {
        const lean = Math.round((k / bh) * (b * 1.2 + sw * 1.5));
        g.px(bx + b + lean, 215 - k, col);
      }
    }
  }
}

// ---- crows ----------------------------------------------------------------------------

const CROW = [
  ['#.....#', '.##.##.', '..###..'],
  ['.......', '###.###', '..###..'],
];
export function drawCrow(g: Gfx, x: number, y: number, frame: number, col = '#2A2440'): void {
  CROW[frame % 2].forEach((r, j) => [...r].forEach((ch, i) => ch === '#' && g.px(Math.round(x) + i, Math.round(y) + j, col)));
}

// ---- the logo ----------------------------------------------------------------------------

type Mask = { w: number; h: number; d: Uint8Array };

function glyphMask(ch: string): Mask {
  const img = glyphImage(ch, '#ffffff');
  const [c, ctx] = makeCanvas(img.width, img.height);
  ctx.drawImage(img, 0, 0);
  const src = ctx.getImageData(0, 0, c.width, c.height).data;
  const d = new Uint8Array(c.width * c.height);
  for (let i = 0; i < d.length; i++) d[i] = src[i * 4 + 3] > 127 ? 1 : 0;
  return { w: c.width, h: c.height, d };
}

/** Scale2x (EPX): doubles a 1-bit glyph with smoothed diagonals. */
function scale2x(m: Mask): Mask {
  const W = m.w * 2;
  const H = m.h * 2;
  const d = new Uint8Array(W * H);
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= m.w || y >= m.h ? 0 : m.d[y * m.w + x]);
  for (let y = 0; y < m.h; y++)
    for (let x = 0; x < m.w; x++) {
      const P = at(x, y);
      const A = at(x, y - 1);
      const B = at(x + 1, y);
      const C = at(x - 1, y);
      const D = at(x, y + 1);
      const e0 = C === A && C !== D && A !== B ? A : P;
      const e1 = A === B && A !== C && B !== D ? B : P;
      const e2 = D === C && D !== B && C !== A ? C : P;
      const e3 = B === D && B !== A && D !== C ? D : P;
      d[y * 2 * W + x * 2] = e0;
      d[y * 2 * W + x * 2 + 1] = e1;
      d[(y * 2 + 1) * W + x * 2] = e2;
      d[(y * 2 + 1) * W + x * 2 + 1] = e3;
    }
  return { w: W, h: H, d };
}

function dilate(m: Mask, diag: boolean): Mask {
  const d = new Uint8Array(m.w * m.h);
  for (let y = 0; y < m.h; y++)
    for (let x = 0; x < m.w; x++) {
      let v = m.d[y * m.w + x];
      if (!v)
        for (let oy = -1; oy <= 1 && !v; oy++)
          for (let ox = -1; ox <= 1; ox++) {
            if (!ox && !oy) continue;
            if (!diag && ox && oy) continue;
            const X = x + ox;
            const Y = y + oy;
            if (X >= 0 && Y >= 0 && X < m.w && Y < m.h && m.d[Y * m.w + X]) {
              v = 1;
              break;
            }
          }
      d[y * m.w + x] = v;
    }
  return { w: m.w, h: m.h, d };
}

let logoC: HTMLCanvasElement | null = null;
export const LOGO_CENTER = { x: 192, y: 42 };

type Grid = Uint8Array;

/** Paper rim then ink rim round the non-empty cells of a grid (in place). */
function rims(g: Grid, W: number, H: number, isInk: (v: number) => boolean): void {
  const ring = (from: (v: number) => boolean, to: number) => {
    const src = g.slice();
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        const i = y * W + x;
        if (src[i]) continue;
        let hit = false;
        for (let oy = -1; oy <= 1 && !hit; oy++)
          for (let ox = -1; ox <= 1; ox++) {
            const X = x + ox;
            const Y = y + oy;
            if (X >= 0 && Y >= 0 && X < W && Y < H && from(src[Y * W + X])) {
              hit = true;
              break;
            }
          }
        if (hit) g[i] = to;
      }
  };
  ring(isInk, 3);
  ring((v) => v === 3, 4);
}

/**
 * 「あぜ道の夕焼け」: あぜ道の in round marker letters (Scale2x + a round
 * dilate), 夕焼け in fat brush letters (Scale2x + a square dilate), 朱 with a
 * #FF6A4D light on the upper-left and a #B8241E shade on the lower-right, a
 * red-pen hanamaru circling 「夕」 (drawn behind, with its own rim), the
 * stamped かすれ (~4% of the ink knocked out at fixed spots), and a double
 * rim of paper and ink so it reads on the sky.
 */
export function logoCanvas(): HTMLCanvasElement {
  if (logoC) return logoC;
  const W = 250;
  const H = 76;
  // letters: 1 fill, 5 かすれ; rims 3 paper, 4 ink
  const g = new Uint8Array(W * H);
  // the pen ring behind: 2 pen; rims 3/4
  const pen = new Uint8Array(W * H);
  const stamp = (dst: Grid, m: Mask, ox: number, oy: number, v: number) => {
    for (let y = 0; y < m.h; y++)
      for (let x = 0; x < m.w; x++)
        if (m.d[y * m.w + x]) {
          const X = ox + x;
          const Y = oy + y;
          if (X >= 0 && Y >= 0 && X < W && Y < H) dst[Y * W + X] = v;
        }
  };
  // あぜ道の: marker letters, bouncing a little
  let x = 6;
  const sb = [12, 9, 13, 10];
  [...'あぜ道の'].forEach((ch, i) => {
    stamp(g, dilate(scale2x(glyphMask(ch)), false), x, sb[i], 1);
    x += charWidth(ch) * 2 - 3;
  });
  // 夕焼け: brush letters, heavier
  x += 8;
  const bigY = 20;
  const hc = { x: x + 16, y: bigY + 17 };
  const bob = [0, -2, 1];
  [...'夕焼け'].forEach((ch, i) => {
    stamp(g, dilate(scale2x(glyphMask(ch)), true), x, bigY + bob[i], 1);
    x += charWidth(ch) * 2 + 2;
  });
  // the red-pen hanamaru round 「夕」: its petal ring, open where the pen lifted
  const pts = hanamaruPath();
  const ringStart = pts.findIndex((p) => Math.hypot(p[0], p[1]) > 0.55);
  for (let i = Math.max(0, ringStart - 10); i < pts.length - 4; i++) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[i + 1];
    for (let st = 0; st <= 4; st++) {
      const px = hc.x + (x0 + (x1 - x0) * (st / 4)) * 29;
      const py = hc.y + (y0 + (y1 - y0) * (st / 4)) * 27;
      for (const [ox, oy] of [[0, 0], [1, 0], [0, 1], [1, 1]] as [number, number][]) {
        const X = Math.round(px) + ox;
        const Y = Math.round(py) + oy;
        if (X >= 0 && Y >= 0 && X < W && Y < H) pen[Y * W + X] = 2;
      }
    }
  }
  // かすれ: knock ~4% of the letters' ink out, at fixed spots (not on edges)
  for (let i = W; i < W * (H - 1); i++)
    if (g[i] === 1 && g[i - 1] && g[i + 1] && g[i - W] && g[i + W] && hash2(i % W, Math.floor(i / W), 91) < 0.05) g[i] = 5;
  rims(g, W, H, (v) => v === 1 || v === 5);
  rims(pen, W, H, (v) => v === 2);
  const p = new PixelCanvas(W + 2, H + 2);
  // drop shadow (#5B4A7A, +2,+2) under everything
  for (let y = 0; y < H; y++) for (let xx = 0; xx < W; xx++) if (g[y * W + xx] || pen[y * W + xx]) p.set(xx + 2, y + 2, '#5B4A7A');
  const isFill = (q: number) => q === 1 || q === 5;
  const paint = (grid: Grid, fill: (i: number, xx: number, y: number) => string) => {
    for (let y = 0; y < H; y++)
      for (let xx = 0; xx < W; xx++) {
        const i = y * W + xx;
        const v = grid[i];
        if (!v) continue;
        let col: string;
        if (v === 3) col = '#FBF3DC';
        else if (v === 4) col = '#2A2440';
        else col = fill(i, xx, y);
        p.set(xx, y, col);
      }
  };
  paint(pen, () => '#D8302A');
  paint(g, (i, xx, y) => {
    const v = g[i];
    if (v === 5) return '#F2B8A0';
    const up = y > 0 ? g[i - W] : 0;
    const left = xx > 0 ? g[i - 1] : 0;
    const down = y < H - 1 ? g[i + W] : 0;
    const right = xx < W - 1 ? g[i + 1] : 0;
    if (!isFill(up) || !isFill(left)) return '#FF6A4D';
    if (!isFill(down) || !isFill(right)) return '#B8241E';
    return '#E23B2E';
  });
  logoC = p.toCanvas();
  return logoC;
}
