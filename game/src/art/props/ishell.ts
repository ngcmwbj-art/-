// Room shells and indoor light for the shops and the mall (30_level_art 4.0,
// 5.0, 7.3, 7.4). A shell is one flat prop anchored at (0,0) that paints the
// floor, the north wall faces (with everything hung on them), the 4px wall
// sections against the dark outside and the contact shadows along the walls.
// Furniture stands on top as depth-sorted props.
//
// Light is layered at runtime:
//   over()  (under the characters): depth darkening, floor light pools
//           (lamps, windows, the door), skylight patches.
//   glow()  (after grading, over everything): lamp bulbs, light shafts with
//           dust, emissive glass, and the per-map grade correction (pal_mall
//           / pal_maigo) the renderer has no slot for.

import type { Gfx } from '../../engine/gfx';
import { PixelCanvas, toRgb } from '../../engine/pixel';
import { P } from '../tiles/palette';
import { ihash } from '../tiles/noise';
import type { FloorPainter } from '../tiles/ifloor';
import { dk, lt } from './kit';
import type { PropArt, PropEnv } from './types';

export type CellKind = 'floor' | 'wall' | 'void' | 'doorS';

export interface ShellSpec {
  rows: string[];
  /** Floor colour per world pixel (tile coords given for zoning). */
  floor: (x: number, y: number, tx: number, ty: number, ch: string) => string;
  /** Wall-face colour; y is measured from the top of the face (fh px tall). */
  wall: (x: number, y: number, fh: number) => string;
  /** Top moulding / ceiling edge. */
  trim?: string;
  /** Baseboard colour and height. */
  base?: string;
  baseH?: number;
  /** Wall cross-section colour. */
  section?: string;
}

export interface Shell {
  p: PixelCanvas;
  glass: PixelCanvas;
  w: number;
  h: number;
  ch: (x: number, y: number) => string;
  kind: (x: number, y: number) => CellKind;
}

/** How a map character is drawn by the shell. */
export function cellKind(rows: string[], x: number, y: number): CellKind {
  const h = rows.length;
  const at = (xx: number, yy: number) => (yy < 0 || yy >= h || xx < 0 ? '#' : [...rows[yy]][xx] ?? '#');
  const c = at(x, y);
  if (c === '#' || c === ' ') return 'void';
  if (c === 'W') return 'wall';
  if (c === 'D' || c === 'U') {
    if (at(x, y - 1) === 'W') return 'wall';
    if (y === h - 1 || at(x, y + 1) === '#' || at(x, y + 1) === ' ') return 'doorS';
  }
  return 'floor';
}

export function paintShell(s: ShellSpec): Shell {
  const rows = s.rows;
  const h = rows.length;
  const w = Math.max(...rows.map((r) => [...r].length));
  const p = new PixelCanvas(w * 16, h * 16);
  const glass = new PixelCanvas(w * 16, h * 16);
  const ch = (x: number, y: number) => (y < 0 || y >= h || x < 0 || x >= w ? '#' : [...rows[y]][x] ?? '#');
  const kind = (x: number, y: number) => (y < 0 || y >= h || x < 0 || x >= w ? 'void' : cellKind(rows, x, y));
  const section = s.section ?? P.nightShade;
  const trim = s.trim ?? P.woodLt;
  const base = s.base ?? P.wood;
  const baseH = s.baseH ?? 4;
  // floor (also under solid furniture cells, E exits and the south door notch)
  for (let ty = 0; ty < h; ty++)
    for (let tx = 0; tx < w; tx++) {
      const k = kind(tx, ty);
      if (k !== 'floor' && k !== 'doorS') continue;
      for (let j = 0; j < 16; j++) for (let i = 0; i < 16; i++) p.set(tx * 16 + i, ty * 16 + j, s.floor(tx * 16 + i, ty * 16 + j, tx, ty, ch(tx, ty)));
    }
  // wall faces: contiguous runs per column
  for (let tx = 0; tx < w; tx++) {
    let ty = 0;
    while (ty < h) {
      if (kind(tx, ty) !== 'wall') {
        ty++;
        continue;
      }
      let t1 = ty;
      while (kind(tx, t1) === 'wall') t1++;
      const fh = (t1 - ty) * 16;
      for (let j = 0; j < fh; j++)
        for (let i = 0; i < 16; i++) {
          const x = tx * 16 + i;
          let c = s.wall(x, j, fh);
          if (j === 0) c = section;
          else if (j === 1) c = trim;
          else if (j === 2) c = dk(trim);
          else if (j >= fh - baseH) c = j === fh - baseH ? lt(base) : j === fh - 1 ? dk(base) : base;
          p.set(x, ty * 16 + j, c);
        }
      ty = t1;
    }
  }
  // wall cross-sections where the outside meets the room / the wall face
  const roomish = (k: CellKind) => k !== 'void';
  for (let ty = 0; ty < h; ty++)
    for (let tx = 0; tx < w; tx++) {
      if (kind(tx, ty) !== 'void') continue;
      const X = tx * 16;
      const Y = ty * 16;
      if (roomish(kind(tx + 1, ty))) for (let j = 0; j < 16; j++) for (let i = 12; i < 16; i++) p.set(X + i, Y + j, i === 12 ? dk(section) : section);
      if (roomish(kind(tx - 1, ty))) for (let j = 0; j < 16; j++) for (let i = 0; i < 4; i++) p.set(X + i, Y + j, i === 3 ? dk(section) : section);
      if (roomish(kind(tx, ty - 1))) for (let j = 0; j < 4; j++) for (let i = 0; i < 16; i++) p.set(X + i, Y + j, j === 0 ? lt(section) : section);
      if (roomish(kind(tx, ty + 1)) && kind(tx, ty + 1) !== 'wall') for (let j = 12; j < 16; j++) for (let i = 0; i < 16; i++) p.set(X + i, Y + j, j === 15 ? lt(section) : section);
    }
  // contact shadows: 2px under the north wall (#3A2B5C α40%), 1px beside side walls
  const isFloor = (k: CellKind) => k === 'floor';
  for (let ty = 0; ty < h; ty++)
    for (let tx = 0; tx < w; tx++) {
      if (!isFloor(kind(tx, ty))) continue;
      const X = tx * 16;
      const Y = ty * 16;
      if (kind(tx, ty - 1) === 'wall')
        for (let i = 0; i < 16; i++) {
          blend(p, X + i, Y, section, 0.45);
          blend(p, X + i, Y + 1, section, 0.4);
          blend(p, X + i, Y + 2, section, 0.14);
        }
      if (kind(tx - 1, ty) === 'void') for (let j = 0; j < 16; j++) blend(p, X, Y + j, section, 0.35);
      if (kind(tx + 1, ty) === 'void') for (let j = 0; j < 16; j++) blend(p, X + 15, Y + j, section, 0.35);
    }
  return { p, glass, w, h, ch, kind };
}

/** Alpha-blend a colour over an opaque pixel (baked, so the result is exact). */
export function blend(p: PixelCanvas, x: number, y: number, col: string, a: number): void {
  const v = p.get(x, y);
  if (!(v >>> 24)) return;
  const [r, g, b] = toRgb(col);
  const r0 = v & 255;
  const g0 = (v >>> 8) & 255;
  const b0 = (v >>> 16) & 255;
  const rr = Math.round(r0 + (r - r0) * a);
  const gg = Math.round(g0 + (g - g0) * a);
  const bb = Math.round(b0 + (b - b0) * a);
  p.set(x, y, ((255 << 24) | (bb << 16) | (gg << 8) | rr) >>> 0);
}

/** Blend a rect. */
export function blendRect(p: PixelCanvas, x: number, y: number, w: number, h: number, col: string, a: number, checker = false): void {
  for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (!checker || ((i + j) & 1) === 0) blend(p, i, j, col, a);
}

/** Paint a floor painter into a rect of an existing canvas (for re-flooring parts). */
export function paintFloorRect(p: PixelCanvas, x: number, y: number, w: number, h: number, f: FloorPainter): void {
  for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) p.set(i, j, f(i, j));
}

// ---------------------------------------------------------------- runtime light helpers

const rgbOf = (hexc: string) => toRgb(hexc).join(',');

/** Soft elliptical light pool (pixel-art steps) with screen blending. */
export function screenPool(g: Gfx, cx: number, cy: number, rx: number, ry: number, col: string, a: number): void {
  if (a <= 0.004) return;
  const img = poolSoft(rx, ry, rgbOf(col));
  const ctx = g.ctx;
  const pa = ctx.globalAlpha;
  const pc = ctx.globalCompositeOperation;
  ctx.globalCompositeOperation = 'screen';
  ctx.globalAlpha = Math.min(1, a);
  ctx.drawImage(img, Math.round(cx - img.width / 2), Math.round(cy - img.height / 2));
  ctx.globalAlpha = pa;
  ctx.globalCompositeOperation = pc;
}

/**
 * A coloured pool of light on a pale floor (call from over()): multiply
 * tints the near-white tiles towards the light's colour (a screen pool only
 * washes them out to a white haze), a little screen on top for the glow.
 */
export function warmPool(g: Gfx, cx: number, cy: number, rx: number, ry: number, col: string, a: number): void {
  if (a <= 0.004) return;
  const img = poolSoft(rx, ry, rgbOf(col));
  const ctx = g.ctx;
  ctx.save();
  const x = Math.round(cx - img.width / 2);
  const y = Math.round(cy - img.height / 2);
  ctx.globalCompositeOperation = 'multiply';
  ctx.globalAlpha = Math.min(1, a * 0.55);
  ctx.drawImage(img, x, y);
  ctx.globalCompositeOperation = 'screen';
  ctx.globalAlpha = Math.min(1, a * 0.3);
  ctx.drawImage(img, x, y);
  ctx.restore();
}

/** Light thrown through a doorway or window onto the floor (trapezoid, top edge at y). */
export function screenSpill(g: Gfx, cx: number, y: number, w0: number, w1: number, len: number, col: string, a: number, flipUp = false): void {
  if (a <= 0.004) return;
  const img = bandTrapezoid(w0, w1, len, rgbOf(col));
  const ctx = g.ctx;
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.globalAlpha = Math.min(1, a);
  if (flipUp) {
    ctx.translate(Math.round(cx - img.width / 2), Math.round(y));
    ctx.scale(1, -1);
    ctx.drawImage(img, 0, 0);
  } else ctx.drawImage(img, Math.round(cx - img.width / 2), Math.round(y));
  ctx.restore();
}

/**
 * Coloured light thrown through a doorway onto a pale floor (call from
 * over()): like warmPool, multiply tints the tiles towards the light's colour
 * (a plain screen spill only greys them out), a little screen on top.
 */
export function tintSpill(g: Gfx, cx: number, y: number, w0: number, w1: number, len: number, col: string, a: number, flipUp = false): void {
  if (a <= 0.004) return;
  const img = bandTrapezoid(w0, w1, len, rgbOf(col));
  const ctx = g.ctx;
  ctx.save();
  if (flipUp) {
    ctx.translate(Math.round(cx - img.width / 2), Math.round(y));
    ctx.scale(1, -1);
  } else ctx.translate(Math.round(cx - img.width / 2), Math.round(y));
  ctx.globalCompositeOperation = 'multiply';
  ctx.globalAlpha = Math.min(1, a * 0.8);
  ctx.drawImage(img, 0, 0);
  ctx.globalCompositeOperation = 'screen';
  ctx.globalAlpha = Math.min(1, a * 0.35);
  ctx.drawImage(img, 0, 0);
  ctx.restore();
}

/**
 * A parallelogram of light (window patch or skylight beam), top edge from x0
 * to x0+w at y0, sheared right by `shear` px per px of height.
 */
export function lightQuad(g: Gfx, x0: number, y0: number, w: number, h: number, shear: number, col: string, a: number, op: GlobalCompositeOperation = 'screen'): void {
  if (a <= 0.004) return;
  const ctx = g.ctx;
  ctx.save();
  ctx.globalCompositeOperation = op;
  ctx.globalAlpha = Math.min(1, a);
  ctx.fillStyle = col;
  // scanline fill: stays on whole pixels and gets a 1px dithered edge
  for (let j = 0; j < h; j++) {
    const sx = Math.round(x0 + j * shear);
    ctx.fillRect(sx + 1, Math.round(y0) + j, Math.max(0, Math.round(w) - 2), 1);
    if (((j + sx) & 1) === 0) {
      ctx.fillRect(sx, Math.round(y0) + j, 1, 1);
      ctx.fillRect(sx + Math.round(w) - 1, Math.round(y0) + j, 1, 1);
    }
  }
  ctx.restore();
}

/** Room depth: the back of the room darker (multiply #5B4A7A α a → 0). */
export function depthShade(g: Gfx, x: number, y: number, w: number, h: number, a = 0.18, col = '91,74,122'): void {
  const ctx = g.ctx;
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  const gr = ctx.createLinearGradient(0, y, 0, y + h);
  gr.addColorStop(0, `rgba(${col},${a})`);
  gr.addColorStop(1, `rgba(${col},0)`);
  ctx.fillStyle = gr;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  ctx.restore();
}

/** Multiply the whole screen (grade corrections for pal_mall / pal_maigo). */
export function screenMultiply(g: Gfx, col: string, a = 1): void {
  const ctx = g.ctx;
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  ctx.globalAlpha = a;
  ctx.fillStyle = col;
  ctx.fillRect(0, 0, g.w, g.h);
  ctx.restore();
}

/** Top darkness band (source-over gradient from the top of the screen). */
export function topDark(g: Gfx, col: string, a: number, frac = 0.35): void {
  const ctx = g.ctx;
  ctx.save();
  const [r, gg, b] = toRgb(col);
  const gr = ctx.createLinearGradient(0, 0, 0, g.h * frac);
  gr.addColorStop(0, `rgba(${r},${gg},${b},${a})`);
  gr.addColorStop(1, `rgba(${r},${gg},${b},0)`);
  ctx.fillStyle = gr;
  ctx.fillRect(0, 0, g.w, Math.ceil(g.h * frac));
  ctx.restore();
}

// ---------------------------------------------------------------- light map helpers (PropArt.light)
//
// light() draws into the renderer's light map: it starts as the grade's
// multiply colour, lights are added ('lighter'), and the graded world is
// multiplied by it. So adding light only takes the grade's tint away (up to
// the art's own colours), and multiplying the map tints the whole room.

const trapCache = new Map<string, HTMLCanvasElement>();
/**
 * Light thrown through a door or window onto the floor: a trapezoid `w0`
 * wide at the wall, `w1` at the far end, `h` long, fading away from the wall
 * and at its sides, in eight steps joined by 1–2px dithered edges.
 */
export function bandTrapezoid(w0: number, w1: number, h: number, rgb: string): HTMLCanvasElement {
  const key = `${w0},${w1},${h},${rgb}`;
  let c = trapCache.get(key);
  if (c) return c;
  const W = Math.max(w0, w1);
  const p = new PixelCanvas(W, h);
  const [r, g, b] = rgb.split(',').map(Number);
  const N = 8;
  const fall = (x: number, y: number) => {
    const k = (y + 0.5) / h;
    const half = (w0 + (w1 - w0) * k) / 2;
    const u = Math.abs(x + 0.5 - W / 2) / half;
    if (u >= 1 || k >= 1) return 0;
    return Math.min(1, (1 - k) * Math.min(1, (1 - u) * 3) * 1.15);
  };
  for (let y = 0; y < h; y++)
    for (let x = 0; x < W; x++) {
      const l0 = Math.floor(fall(x, y) * N);
      if (l0 <= 0 && fall(x, y - 1.5) <= 0) continue;
      const l1 = Math.floor(Math.max(fall(x, y - 1.5), fall(x + (x < W / 2 ? 1.5 : -1.5), y)) * N);
      const lv = Math.min(N, l1 > l0 && ((x + y) & 1) === 0 ? l0 + 1 : l0) / N;
      if (lv <= 0) continue;
      const a = Math.round(lv * 255);
      p.set(x, y, ((a << 24) | (b << 16) | (g << 8) | r) >>> 0);
    }
  c = p.toCanvas();
  trapCache.set(key, c);
  return c;
}

const softCache = new Map<string, HTMLCanvasElement>();
/**
 * A light pool: a smooth falloff quantized into eight brightness steps, each
 * step joined to the next by a dithered ring only 1–2px wide (review round 1:
 * the old six steps with wide checker bands read as a screen door on the
 * night floors).
 */
export function poolSoft(rx: number, ry: number, rgb: string): HTMLCanvasElement {
  rx = Math.round(rx);
  ry = Math.round(ry);
  const key = `${rx},${ry},${rgb}`;
  let c = softCache.get(key);
  if (c) return c;
  const p = new PixelCanvas(rx * 2, ry * 2);
  const [r, g, b] = rgb.split(',').map(Number);
  const N = 8;
  const fall = (d: number) => (d >= 1 ? 0 : Math.pow(1 - Math.max(0, d), 1.25));
  const inward = 1.5 / Math.max(rx, ry);
  for (let y = 0; y < ry * 2; y++)
    for (let x = 0; x < rx * 2; x++) {
      const dx = (x + 0.5 - rx) / rx;
      const dy = (y + 0.5 - ry) / ry;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d >= 1) continue;
      const l0 = Math.floor(fall(d) * N);
      const l1 = Math.floor(fall(d - inward) * N);
      const lv = Math.min(N, l1 > l0 && ((x + y) & 1) === 0 ? l0 + 1 : l0) / N;
      if (lv <= 0) continue;
      const a = Math.round(lv * 255);
      p.set(x, y, ((a << 24) | (b << 16) | (g << 8) | r) >>> 0);
    }
  c = p.toCanvas();
  softCache.set(key, c);
  return c;
}

/** Additive pool of light into the light map. */
export function lightPool(g: Gfx, cx: number, cy: number, rx: number, ry: number, col: string, a: number): void {
  if (a <= 0.004) return;
  const img = poolSoft(rx, ry, rgbOf(col));
  const ctx = g.ctx;
  const pa = ctx.globalAlpha;
  ctx.globalAlpha = Math.min(1, a);
  ctx.drawImage(img, Math.round(cx - img.width / 2), Math.round(cy - img.height / 2));
  ctx.globalAlpha = pa;
}

/** Multiply the light map (a per-map grade: pal_mall / pal_maigo). */
export function mapMultiply(g: Gfx, col: string): void {
  const ctx = g.ctx;
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  ctx.globalAlpha = 1;
  ctx.fillStyle = col;
  ctx.fillRect(0, 0, g.w, g.h);
  ctx.restore();
}

/** Darken the top of the light map (multiply gradient col → white over `frac` of the height). */
export function mapTopDark(g: Gfx, col: string, frac = 0.35): void {
  const ctx = g.ctx;
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  const gr = ctx.createLinearGradient(0, 0, 0, g.h * frac);
  gr.addColorStop(0, col);
  gr.addColorStop(1, '#ffffff');
  ctx.fillStyle = gr;
  ctx.fillRect(0, 0, g.w, Math.ceil(g.h * frac));
  ctx.restore();
}

/** Darken the light map away from a centre (a soft vignette: multiply white → col). */
export function mapVignette(g: Gfx, cx: number, cy: number, r0: number, r1: number, col: string, sy = 0.75): void {
  const ctx = g.ctx;
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  ctx.translate(Math.round(cx), Math.round(cy));
  ctx.scale(1, sy);
  const gr = ctx.createRadialGradient(0, 0, r0, 0, 0, r1);
  gr.addColorStop(0, '#ffffff');
  gr.addColorStop(1, col);
  ctx.fillStyle = gr;
  ctx.fillRect(-g.w * 2, -g.h * 3, g.w * 4, g.h * 6);
  ctx.restore();
}

// ---------------------------------------------------------------- flickering tubes

interface FlickerState {
  t0: number;
  k: number;
  on: number;
  off1: number;
  gap: number;
  off2: number;
}
const fstate = new Map<number, FlickerState>();

function cycle(seed: number, k: number, t0: number, on: [number, number], off: [number, number]): FlickerState {
  const h = ihash(k, seed, 5501);
  const r = (n: number) => ((h >>> n) & 1023) / 1023;
  return {
    t0,
    k,
    on: on[0] + (on[1] - on[0]) * r(0),
    off1: off[0] + (off[1] - off[0]) * r(10),
    gap: 50 + 90 * r(20),
    off2: off[0] + (off[1] - off[0]) * r(5),
  };
}

/**
 * A fluorescent tube that is on 2–5 s, then drops out twice for 60–200 ms
 * (5.0). Deterministic in t per seed. Returns 1 (on) / 0 (off) and whether a
 * drop-out started within the last `dt` ms (for the ambience 'flicker' event).
 */
export function tube(t: number, seed: number, on: [number, number] = [2000, 5000], off: [number, number] = [60, 200]): number {
  let s = fstate.get(seed);
  if (!s || t < s.t0) s = cycle(seed, 0, 0, on, off);
  for (let guard = 0; guard < 100000; guard++) {
    const len = s.on + s.off1 + s.gap + s.off2;
    if (t < s.t0 + len) break;
    s = cycle(seed, s.k + 1, s.t0 + len, on, off);
  }
  fstate.set(seed, s);
  const u = t - s.t0;
  if (u < s.on) return 1;
  if (u < s.on + s.off1) return 0;
  if (u < s.on + s.off1 + s.gap) return 1;
  return 0;
}

// ---------------------------------------------------------------- dust in light

/**
 * 1px dust motes (#FFE7A3) drifting slowly inside a sheared light beam
 * (x0,y0 top-left, w wide, h tall, shear px/px). `frozen` motes hang still.
 */
export function dust(g: Gfx, x0: number, y0: number, w: number, h: number, shear: number, n: number, t: number, seed: number, a = 0.75): void {
  const tt = t / 1000;
  for (let i = 0; i < n; i++) {
    const hh = ihash(i, seed, 3301);
    const v = ((hh >>> 8) % 100) / 100;
    const yy = ((hh % h) + tt * (2 + v * 3)) % h;
    const u = ((hh >>> 16) % 1000) / 1000;
    const drift = Math.sin(tt * (0.3 + v * 0.4) + i * 1.7) * 3;
    const x = x0 + yy * shear + u * (w - 2) + 1 + drift;
    const y = y0 + yy;
    const tw = Math.sin(tt * (1.2 + v) + i) * 0.5 + 0.5;
    g.rect(Math.round(x), Math.round(y), 1, 1, P.horizon, a * (0.45 + tw * 0.55));
  }
}

// ---------------------------------------------------------------- shell prop wrapper

export interface ShellArt {
  img: HTMLCanvasElement;
  glass?: HTMLCanvasElement;
  /** Extra canvas drawn beyond the map (e.g. the atrium below M4's railing). */
  ox?: number;
  oy?: number;
  over?(g: Gfx, x: number, y: number, env: PropEnv): void;
  glow?(g: Gfx, x: number, y: number, env: PropEnv): void;
  light?(g: Gfx, x: number, y: number, env: PropEnv): void;
  fg?: PropArt['fg'];
}

/** Wrap a shell image as a flat prop anchored at the map origin. */
export function shellProp(s: ShellArt): PropArt {
  return {
    ox: s.ox ?? 0,
    oy: s.oy ?? 0,
    w: s.img.width,
    h: s.img.height,
    foot: 0,
    flat: true,
    img: () => s.img,
    glass: s.glass,
    over: s.over,
    glow: s.glow,
    light: s.light,
    fg: s.fg,
  };
}

/** Night factor helpers. */
export function nightOf(env: PropEnv): number {
  return env.grade.night;
}
