// Water surfaces (canal, paddy fields) — 30_level_art 3.3 / 7.3 / 7.6 fx_water.
//
// The canal is "the only place where the sky shows in the top-down view", so
// it is drawn as a calm, bright sheet of the current stage's sky:
//   - banded vertical gradient across the canal (light near the far bank,
//     the low-sky colour towards the near bank), 1px dithered band borders;
//   - the revetment's shadow band on the water (#3A2B5C α40%, 3px) and a dark
//     lip where the water meets the near (south) bank;
//   - upside-down reflections of what stands on the bank (trees, poles),
//     as silhouettes wobbling row by row (α30%), and the guardrail;
//   - long horizontal highlight dashes (#FFF6D8) and darker ripple lines that
//     drift with the current; low-sun glitter; leaves, a fish shadow;
//   - stage 2: a patch of night sky drifting west; night: lamp reflections.
// Paddies: the same sky, with rice planted in rows of 3–4px tufts (water
// strips between the rows) and a wind wave that bends the tips in 2px steps.

import type { Grade } from '../../world/lighting';
import { css } from '../../world/lighting';
import { groundAt, type LoadedMap } from '../../world/maps';
import { H, W } from '../../engine/screen';
import { toRgb } from '../../engine/pixel';
import { ihash, valueNoise } from './noise';
import { P } from './palette';

type RGB = [number, number, number];

/** Something standing on the bank whose reflection shows in the water. */
export interface Reflector {
  /** Images making up the object (trunk + canopy...), world px of each top-left. */
  parts: { img: HTMLCanvasElement; x: number; top: number }[];
  /** Horizontal centre (world px). */
  cx: number;
  /** World y of the feet (the bank line). */
  foot: number;
  /** 0..1: a lit lamp at this height above the feet (night reflections). */
  lamp?: { h: number; a: number };
}

export interface WaterCtx {
  ctx: CanvasRenderingContext2D;
  /** World px of the chunk's top-left. */
  worldX: number;
  worldY: number;
  camX: number;
  camY: number;
  w: number;
  h: number;
  grade: Grade;
  t: number;
  /** Motion clock (reflection freezes in stage 1; water keeps flowing on t). */
  mt: number;
  stage: number;
  map: LoadedMap;
  /** Visible part of the chunk (local px); drawing is limited to it. */
  vis?: [number, number, number, number];
  reflect?: Reflector[];
}

const mixc = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const GLINT = toRgb(P.glint) as RGB;
const INK = toRgb(P.nightShade) as RGB;
const SUNSHADE = toRgb(P.sunShade) as RGB;
const LILAC = toRgb(P.lilac) as RGB;
/** Canal water: murky deep teal (between the navy and the leaf shade), darkened. */
const DEEP = mixc(mixc(toRgb(P.navy) as RGB, toRgb(P.leafShade) as RGB, 0.55), toRgb(P.aqua) as RGB, 0.08);

/** Rows of the revetment face drawn by the ground (the water surface starts below). */
const REVETMENT = 7;
/** Rows of the near bank's edge (ground art). */
const LIP = 1;

// ---------------------------------------------------------------- canal geometry

const runCache = new WeakMap<LoadedMap, Map<number, [number, number]>>();
/** Vertical extent [top, bottom) in world px of the water run containing tile (tx, ty). */
function waterRun(map: LoadedMap, tx: number, ty: number): [number, number] {
  let m = runCache.get(map);
  if (!m) {
    m = new Map();
    runCache.set(map, m);
  }
  const key = ty * 4096 + tx;
  let r = m.get(key);
  if (!r) {
    let a = ty;
    while (a > 0 && groundAt(map, tx, a - 1) === 'water') a--;
    let b = ty + 1;
    while (groundAt(map, tx, b) === 'water') b++;
    r = [a * 16, b * 16];
    m.set(key, r);
  }
  return r;
}

/** Horizontal runs of `kind` tiles in tile row ty between tx0..tx1 (inclusive). */
function runs(map: LoadedMap, ty: number, tx0: number, tx1: number, kind: string): [number, number][] {
  const out: [number, number][] = [];
  let s = -1;
  for (let tx = tx0; tx <= tx1 + 1; tx++) {
    const on = tx <= tx1 && groundAt(map, tx, ty) === kind;
    if (on && s < 0) s = tx;
    if (!on && s >= 0) {
      out.push([s, tx]);
      s = -1;
    }
  }
  return out;
}

// ---------------------------------------------------------------- palette

interface WaterPal {
  hi: RGB;
  top: RGB;
  mid: RGB;
  low: RGB;
  edge: RGB;
  ripple: RGB;
  dash: RGB;
}

function waterPal(g: Grade): WaterPal {
  const top = g.skyTop;
  const low = g.skyBot;
  const night = g.night;
  // The far part of the water mirrors the bright low sky; the near part
  // mirrors the higher, cooler sky and the water's depth: it cools towards
  // lilac, so the canal never reads as a strip of warm dirt (review round 2).
  return {
    hi: mixc(top, GLINT, 0.4 * (1 - night)),
    top: mixc(top, GLINT, 0.12 * (1 - night)),
    mid: mixc(mixc(top, low, 0.5), LILAC, 0.18),
    low: mixc(low, LILAC, 0.42),
    edge: mixc(low, SUNSHADE, 0.45),
    ripple: mixc(mixc(low, LILAC, 0.6), INK, 0.25 + night * 0.4),
    dash: mixc(GLINT, g.horizon, 0.2),
  };
}

// ---------------------------------------------------------------- entry

export function drawWater(w: WaterCtx): void {
  const { ctx, map } = w;
  const [rx, ry, rw, rh] = w.vis ?? [0, 0, w.w, w.h];
  const tx0 = Math.floor((w.worldX + rx) / 16);
  const ty0 = Math.floor((w.worldY + ry) / 16);
  const tx1 = Math.floor((w.worldX + rx + rw - 1) / 16);
  const ty1 = Math.floor((w.worldY + ry + rh - 1) / 16);
  const pal = waterPal(w.grade);
  // paddies and anything else: the stage sky in screen space
  drawSkyBase(w);
  for (let ty = ty0; ty <= ty1; ty++)
    for (const [a, b] of runs(map, ty, tx0, tx1, 'water')) drawCanalRun(w, pal, a, b, ty);
  drawPaddies(w, pal);
}

function drawSkyBase(w: WaterCtx): void {
  const { ctx, grade } = w;
  const sy0 = w.worldY - w.camY;
  const g = ctx.createLinearGradient(0, -sy0, 0, H - sy0);
  g.addColorStop(0, css(mixc(grade.skyTop, GLINT, 0.1 * (1 - grade.night))));
  g.addColorStop(0.7, css(grade.skyBot));
  g.addColorStop(1, css(mixc(grade.skyBot, SUNSHADE, 0.3)));
  ctx.fillStyle = g;
  const [rx, ry, rw, rh] = w.vis ?? [0, 0, w.w, w.h];
  ctx.fillRect(rx, ry, rw, rh);
}

// ---------------------------------------------------------------- canal

/** Draw the canal between tile columns [a, b) of tile row ty (clipped to the chunk's visible part). */
function drawCanalRun(w: WaterCtx, pal: WaterPal, a: number, b: number, ty: number): void {
  const { ctx } = w;
  const [top, bot] = waterRun(w.map, a, ty);
  const s0 = top + REVETMENT; // water surface top (world)
  const s1 = bot - LIP; // near-bank lip
  const span = s1 - s0;
  const [rx, ry, rw, rh] = w.vis ?? [0, 0, w.w, w.h];
  const lx0 = Math.max(rx, a * 16 - w.worldX);
  const lx1 = Math.min(rx + rw, b * 16 - w.worldX);
  const ly0 = Math.max(ry, ty * 16 - w.worldY);
  const ly1 = Math.min(ry + rh, ty * 16 + 16 - w.worldY);
  if (lx1 <= lx0 || ly1 <= ly0) return;
  const W0 = lx1 - lx0;
  ctx.save();
  ctx.beginPath();
  ctx.rect(lx0, ly0, W0, ly1 - ly0);
  ctx.clip();
  const t = w.t;
  const flow = (t / 1000) * 6;
  const night = w.grade.night;
  // 1. the water itself: dark, murky canal water (deep teal), a little of the
  // low sky mixed in towards the far bank (the glancing reflection), darker
  // towards the near bank where the bank's shadow falls (QA round 1: no more
  // opaque sky-coloured strip)
  const skyAt = (sy: number): RGB => mixc(w.grade.skyTop, w.grade.skyBot, Math.max(0, Math.min(1, sy / H)));
  for (let ly = ly0; ly < ly1; ly++) {
    const wy = w.worldY + ly;
    const v = Math.max(0, Math.min(1, (wy - s0) / Math.max(1, span)));
    const sky = skyAt(wy - w.camY);
    const base = mixc(mixc(DEEP, sky, 0.24 - v * 0.14), INK, v * 0.24 + night * 0.3);
    ctx.fillStyle = css(base);
    ctx.fillRect(lx0, ly, W0, 1);
  }
  // 2. the sky's reflection: long streaky bands with ragged, dithered edges
  // (sky colour of the screen row, a touch lighter), drifting east with the
  // current and breaking up where the ripples cross them
  const sway = (wy: number) => Math.round(Math.sin(wy * 0.9 + t / 300) * 1.2);
  for (let ly = ly0; ly < ly1; ly++) {
    const wy = w.worldY + ly;
    if (wy < s0 + 1 || wy >= s1 - 2) continue;
    const v = (wy - s0) / Math.max(1, span);
    const sky = skyAt(wy - w.camY);
    const core = mixc(sky, GLINT, 0.12 * (1 - night));
    const soft = mixc(core, DEEP, 0.4);
    // band strength along this row: two streaky layers of value noise
    const rowK = 0.6 - v * 0.36;
    const d = sway(wy);
    let runX = -1;
    let runC = 0;
    const flush = (x: number) => {
      if (runX >= 0 && runC > 0) {
        ctx.fillStyle = css(runC === 2 ? core : soft, runC === 2 ? 0.92 : 0.7);
        ctx.fillRect(runX + d, ly, x - runX, 1);
      }
    };
    for (let lx = lx0; lx <= lx1; lx++) {
      let c = 0;
      if (lx < lx1) {
        const wx = w.worldX + lx;
        const n = valueNoise((wx - flow * 1.4) / 58, wy / 1.9, 611 + ty) * 0.62 + valueNoise((wx - flow * 2.2) / 17, wy / 1.2, 617) * 0.38;
        const k = n + rowK - 0.5;
        if (k > 0.57) c = 2;
        else if (k > 0.5) c = (wx + wy) & 1 ? 1 : 0;
      }
      if (c !== runC) {
        flush(lx);
        runX = lx;
        runC = c;
      }
    }
    flush(lx1);
  }
  // 3. reflections of what stands on the bank (trees, poles, the guardrail),
  // upside down, in their own muted colours, each row shifted by the ripples
  // (2px sway, alternate rows the other way)
  const mirror = s0 - 1;
  const wob = (wy: number) => Math.round(Math.sin(wy * 0.75 + t / 260) * 1.6) * ((wy & 1) ? 1 : -1);
  ctx.fillStyle = css(mixc(DEEP, INK, 0.35), 0.5);
  const railRefl = mirror + REVETMENT + 9;
  for (const ry2 of [railRefl, railRefl + 2]) {
    const ly = ry2 - w.worldY;
    if (ly >= ly0 && ly < ly1) ctx.fillRect(lx0 + wob(ry2), ly, W0, 1);
  }
  for (let wy = s0; wy < railRefl; wy++) {
    const ly = wy - w.worldY;
    if (ly < ly0 || ly >= ly1) continue;
    const d = wob(wy);
    for (let wx = Math.floor((w.worldX + lx0) / 32) * 32 + 3; wx < w.worldX + lx1; wx += 32) ctx.fillRect(wx - w.worldX + d, ly, 2, 1);
  }
  const refl = w.reflect ?? [];
  if (refl.length) {
    for (const r of refl) {
      const lift = r.foot - (top - 1);
      for (const part of r.parts) {
        if (part.x > w.worldX + lx1 + 4 || part.x + part.img.width < w.worldX + lx0 - 4) continue;
        const dim = dimmed(part.img);
        for (let ly = ly0; ly < ly1; ly++) {
          const wy = w.worldY + ly;
          if (wy < s0 || wy >= s1 - 1) continue;
          const hgt = wy - s0 + 1 - REVETMENT - lift;
          const srcY = r.foot - hgt - part.top;
          if (srcY < 0 || srcY >= part.img.height) continue;
          // fainter further from the bank, broken into dashes by the ripples
          const fade = 1 - (wy - s0) / Math.max(1, span);
          if (((wy + Math.floor(t / 400)) % 5) === 0) continue;
          ctx.globalAlpha = (0.3 + 0.28 * fade) * (1 - night * 0.4);
          ctx.drawImage(dim, 0, srcY, part.img.width, 1, part.x - w.worldX + wob(wy), ly, part.img.width, 1);
        }
      }
    }
    ctx.globalAlpha = 1;
  }
  // 4. depth: under the north wall a dark waterline and a soft shadow; along
  // the near (south) bank the bank's own overhang throws a 3px shadow
  const shade: [number, number][] = [
    [s0, 0.55],
    [s0 + 1, 0.3],
    [s1 - 3, 0.2],
    [s1 - 2, 0.38],
    [s1 - 1, 0.55],
  ];
  for (const [wy, al] of shade) {
    const ly = wy - w.worldY;
    if (ly < ly0 || ly >= ly1) continue;
    ctx.fillStyle = css(INK, al);
    ctx.fillRect(lx0, ly, W0, 1);
  }
  {
    const ly = s0 + 2 - w.worldY;
    if (ly >= ly0 && ly < ly1) {
      ctx.fillStyle = css(INK, 0.25);
      for (let lx = lx0 + ((w.worldX + lx0) & 1); lx < lx1; lx += 2) ctx.fillRect(lx, ly, 1, 1);
    }
    const ey = s1 - 4 - w.worldY;
    if (ey >= ly0 && ey < ly1) {
      ctx.fillStyle = css(INK, 0.2);
      for (let lx = lx0 + ((w.worldX + lx0 + 1) & 1); lx < lx1; lx += 2) ctx.fillRect(lx, ey, 1, 1);
    }
  }
  // 5. ripples: dark lines and a few light crests drifting east (never freeze)
  const lanes = Math.floor(span / 3);
  for (let L = 1; L < lanes; L++) {
    const wy = s0 + 1 + L * 3 + (L % 2);
    const ly = wy - w.worldY;
    if (ly < ly0 || ly >= ly1 || wy >= s1 - 3) continue;
    const S = 26;
    const off = flow * (0.7 + (L % 3) * 0.2);
    const j0 = Math.floor((w.worldX + lx0 - off - 12) / S);
    const j1 = Math.floor((w.worldX + lx1 - off) / S);
    for (let j = j0; j <= j1; j++) {
      const hh = ihash(j, L, 4321 + ty);
      const x = Math.round(j * S + (hh % S) + off) - w.worldX;
      const life = Math.sin(t / (900 + (hh >>> 20) % 700) + (hh % 628) / 100);
      if (life < -0.1) continue;
      const len = 4 + ((hh >>> 12) % 6);
      if ((hh >>> 8) % 3) {
        ctx.fillStyle = css(mixc(DEEP, INK, 0.5), 0.45 + 0.2 * life);
        ctx.fillRect(x, ly, len, 1);
      } else {
        ctx.fillStyle = css(pal.dash, (0.35 + 0.25 * life) * (1 - night * 0.7));
        ctx.fillRect(x, ly - 1, Math.max(2, len - 3), 1);
      }
    }
  }
  // 6. glints: white sparkles that blink on and off where the low sun
  // catches a ripple — denser towards the west edge of the screen
  if (night < 0.5) {
    const gt = Math.floor((w.stage === 1 ? 0 : t) / 170);
    for (let wy = s0 + 3; wy < s1 - 4; wy += 3) {
      const ly = wy - w.worldY;
      if (ly < ly0 || ly >= ly1) continue;
      for (let k = 0; k < 5; k++) {
        const hh = ihash(k, wy, 71);
        const sx = hh % W;
        if ((hh >>> 10) % 100 > 6 + (1 - sx / W) * 26) continue;
        // each sparkle lives a few frames of its own cycle
        const ph = (gt + ((hh >>> 4) % 13)) % 13;
        if (ph > 3) continue;
        const lx = sx + w.camX - w.worldX;
        if (lx < lx0 - 4 || lx > lx1) continue;
        ctx.fillStyle = ph === 1 || ph === 2 ? 'rgba(255,246,216,0.95)' : 'rgba(255,231,163,0.6)';
        ctx.fillRect(lx, ly, ph === 1 || ph === 2 ? 3 : 1, 1);
        if (ph === 1) ctx.fillRect(lx + 1, ly - 1, 1, 1);
      }
    }
  }
  // 6. night: lamp light reflected as wobbling vertical streaks
  if (w.grade.night > 0.05) {
    for (const r of refl) {
      if (!r.lamp || r.lamp.a <= 0) continue;
      const cxw = r.cx + 8;
      for (let wy = s0 + 2; wy < s1 - 1; wy++) {
        const ly = wy - w.worldY;
        if (ly < ly0 || ly >= ly1) continue;
        const k = (wy - s0) / span;
        const wdt = 2 + Math.round(k * 3);
        const a2 = r.lamp.a * w.grade.night * (0.55 - k * 0.35) * (((wy >> 1) & 1) ? 1 : 0.6);
        ctx.fillStyle = `rgba(255,231,163,${a2.toFixed(3)})`;
        ctx.fillRect(Math.round(cxw - 8 - w.worldX + wob(wy) * 2 - wdt / 2), ly, wdt, 1);
      }
    }
    // a few stars
    ctx.fillStyle = P.glint;
    for (let k = 0; k < 6; k++) {
      const hh = ihash(k, a, 811);
      const sx = a * 16 + (hh % Math.max(1, (b - a) * 16)) - w.worldX;
      const sy = s0 + 4 + ((hh >>> 12) % Math.max(1, span - 8)) - w.worldY;
      if ((Math.floor(t / 600) + k) % 5 && sy >= ly0 && sy < ly1) ctx.fillRect(sx, sy, 1, 1);
    }
  }
  // 7. drifting leaves (east, 6px/s) and a fish shadow now and then
  for (let i = 0; i < 6; i++) {
    const wx = (i * 173 + (t / 1000) * 6) % 1024;
    const wy = s0 + 3 + ((i * 37) % Math.max(1, span - 6));
    const lx = Math.floor(wx - w.worldX);
    const ly = Math.floor(wy - w.worldY);
    if (lx < lx0 - 4 || ly < ly0 - 2 || lx > lx1 || ly > ly1) continue;
    ctx.fillStyle = css(INK, 0.25);
    ctx.fillRect(lx + 1, ly + 2, 3, 1);
    ctx.fillStyle = i % 3 === 0 ? P.goldPale : P.leaf;
    ctx.fillRect(lx, ly, 3, 1);
    ctx.fillRect(lx + 1, ly + 1, 2, 1);
    ctx.fillStyle = P.leafShade;
    ctx.fillRect(lx + 3, ly + 1, 1, 1);
  }
  {
    const cyc = (t / 1000) % 11;
    if (cyc < 3) {
      const fx = 22 * 16 + cyc * 20 - w.worldX;
      const fy = s0 + Math.floor(span * 0.55) - w.worldY;
      ctx.fillStyle = css(INK, 0.35);
      ctx.fillRect(Math.floor(fx), fy, 5, 2);
      ctx.fillRect(Math.floor(fx) - 2, fy - 1 + (Math.floor(t / 150) % 2), 2, 1);
      ctx.fillRect(Math.floor(fx) - 2, fy + 2 - (Math.floor(t / 150) % 2), 2, 1);
    }
  }
  // 8. stage 2: a patch of night sky drifting west (fx_night_patch)
  if (w.stage === 2 || w.grade.toMall > 0.5) nightPatch(ctx, 40 * 16 - ((t / 1000) * 3) % 200, s0 + Math.floor(span / 2), w);
  ctx.restore();
}

/** fx_night_patch (stage 2): a hole of night sky in the water, its rim dithered 2px, two stars, a slow wobble. */
function nightPatch(ctx: CanvasRenderingContext2D, bx: number, by: number, w: WaterCtx): void {
  const lx = Math.floor(bx - w.worldX);
  const ly = Math.floor(by - w.worldY);
  if (lx < -30 || ly < -12 || lx > w.w + 30 || ly > w.h + 12) return;
  const t = w.t;
  const RX = 13;
  const RY = 5.6;
  for (let yy = -6; yy <= 6; yy++) {
    const q = yy / RY;
    if (Math.abs(q) > 1) continue;
    const half = RX * Math.sqrt(1 - q * q);
    const wob = Math.round(Math.sin((by + yy) * 0.8 + t / 420) * 1.2);
    for (let xx = -Math.ceil(half); xx <= Math.ceil(half); xx++) {
      const d = Math.abs(xx) / Math.max(1, half);
      const px = lx + xx + wob;
      const py = ly + yy;
      // 2px checker-dithered rim: the outer ring half covered, then a softer tone
      if (d > 1) continue;
      const rim = half - Math.abs(xx) < 2 || Math.abs(yy) >= 5;
      if (rim && (px + py) & 1) continue;
      ctx.fillStyle = rim ? css([58, 43, 92], 0.8) : css([27, 23, 51], 0.92);
      ctx.fillRect(px, py, 1, 1);
    }
  }
  // two stars, one twinkling
  ctx.fillStyle = P.glint;
  ctx.fillRect(lx + 4 + Math.round(Math.sin(t / 420) * 1.2), ly - 2, 1, 1);
  if (Math.floor(t / 500) % 3) ctx.fillRect(lx - 5 + Math.round(Math.sin((by + 1) * 0.8 + t / 420) * 1.2), ly + 1, 1, 1);
}

const dimCache = new WeakMap<HTMLCanvasElement, HTMLCanvasElement>();
/** The image darkened and cooled towards the water's colour (for reflections). */
function dimmed(img: HTMLCanvasElement): HTMLCanvasElement {
  let s = dimCache.get(img);
  if (!s) {
    s = document.createElement('canvas');
    s.width = img.width;
    s.height = img.height;
    const c = s.getContext('2d')!;
    c.drawImage(img, 0, 0);
    c.globalCompositeOperation = 'source-atop';
    c.fillStyle = css(mixc(DEEP, INK, 0.3), 0.55);
    c.fillRect(0, 0, s.width, s.height);
    dimCache.set(img, s);
  }
  return s;
}

const silCache = new WeakMap<HTMLCanvasElement, HTMLCanvasElement>();
function silhouette(img: HTMLCanvasElement, color: string): HTMLCanvasElement {
  let s = silCache.get(img);
  if (!s) {
    s = document.createElement('canvas');
    s.width = img.width;
    s.height = img.height;
    const c = s.getContext('2d')!;
    c.drawImage(img, 0, 0);
    c.globalCompositeOperation = 'source-in';
    c.fillStyle = color;
    c.fillRect(0, 0, s.width, s.height);
    silCache.set(img, s);
  }
  return s;
}

// ---------------------------------------------------------------- paddies

/**
 * Rice for a whole paddy region, baked once per lean: tufts of 3–4px planted
 * on a 5×8px grid (rows offset per row), each with a dark base, lit tips and
 * a short reflection on the water strip below it.
 *   lean 0 = upright, 1 = bent west by the wind (tips 2px left),
 *   2 = stage 2 (tips lean north-east), 3 = half bent (the wave's shoulders).
 */
const riceBakes = new WeakMap<LoadedMap, Map<number, { c: HTMLCanvasElement; x0: number; y0: number }>>();
function riceLayer(map: LoadedMap, lean: number): { c: HTMLCanvasElement; x0: number; y0: number } | null {
  let m = riceBakes.get(map);
  if (!m) {
    m = new Map();
    riceBakes.set(map, m);
  }
  const hit = m.get(lean);
  if (hit) return hit;
  // bounds of the paddy tiles
  let x0 = 1e9;
  let y0 = 1e9;
  let x1 = -1;
  let y1 = -1;
  for (let ty = 0; ty < map.h; ty++)
    for (let tx = 0; tx < map.w; tx++)
      if (groundAt(map, tx, ty) === 'paddy') {
        x0 = Math.min(x0, tx);
        y0 = Math.min(y0, ty);
        x1 = Math.max(x1, tx);
        y1 = Math.max(y1, ty);
      }
  if (x1 < 0) return null;
  const c = document.createElement('canvas');
  c.width = (x1 - x0 + 1) * 16;
  c.height = (y1 - y0 + 1) * 16;
  const ctx = c.getContext('2d')!;
  const px = (x: number, y: number, col: string) => {
    ctx.fillStyle = col;
    ctx.fillRect(x, y, 1, 1);
  };
  const isPaddy = (wx: number, wy: number) => groundAt(map, Math.floor(wx / 16), Math.floor(wy / 16)) === 'paddy';
  const leafMid = [P.leafYoung, P.leaf, P.leafDeep, P.leafShade];
  const leafRich = [P.leaf, P.leafDeep, P.leafShade, P.ink];
  const leafPale = [P.leafLt, P.leafYoung, P.leaf, P.leafDeep];
  const ROW = 6;
  const COL = 4;
  for (let gy = y0 * 16 + 5; gy < (y1 + 1) * 16; gy += ROW) {
    const row = Math.floor(gy / ROW);
    const shift = (row % 2) * 2;
    for (let gx = x0 * 16 + shift; gx < (x1 + 1) * 16; gx += COL) {
      const hh = ihash(Math.floor(gx / COL), row, 5501);
      if (hh % 23 === 0) continue; // a missing tuft: open water
      // stage 2: the rice parts round the patch of night sky (fx_night_patch in the paddy)
      if (lean === 2 && ((gx + 2 - PADDY_PATCH[0]) / 24) ** 2 + ((gy - 2 - PADDY_PATCH[1]) / 11) ** 2 < 1) continue;
      const bx = gx + ((hh >>> 5) % 2);
      const by = gy;
      // keep tufts off the edges of the paddy (ridge paths)
      if (!isPaddy(bx - 1, by + 2) || !isPaddy(bx + 4, by + 2) || !isPaddy(bx + 1, by - 5)) continue;
      // growth varies across the field (valueNoise): taller, darker rice in
      // the rich patches, short pale seedlings where the water stands deeper
      // (QA round 1) every planting row has its own height and tone too —
      // rows planted a few days apart — so the field isn't one even grid
      const rh = ihash(row, 7, 5509);
      const rowGrow = ((rh % 5) - 2) * 0.07;
      const grow = valueNoise(gx / 44, gy / 22, 5507) + rowGrow;
      const hgt = Math.max(3, Math.min(9, 4 + ((hh >>> 8) % 3) + Math.round((grow - 0.5) * 5) + ((rh >>> 4) % 3 === 0 ? 1 : 0)));
      const w4 = (hh >>> 11) % 3 === 0 ? 3 : 4;
      const leafCols = grow > 0.62 ? leafRich : grow < 0.34 ? leafPale : (rh >>> 8) % 4 === 0 ? leafPale : leafMid;
      const lx = bx - x0 * 16;
      const ly = by - y0 * 16;
      const tip = lean === 1 ? -2 : lean === 3 ? -1 : lean === 2 ? 1 : 0;
      const tipUp = lean === 2 ? -1 : 0;
      // reflection of the tuft on the water strip below (short, dark)
      ctx.fillStyle = 'rgba(46,107,74,0.45)';
      ctx.fillRect(lx, ly + 1, w4, 1);
      ctx.fillStyle = 'rgba(46,107,74,0.25)';
      ctx.fillRect(lx + 1, ly + 2, w4 - 1, 1);
      // base (dark) → body → lit left side → tips
      for (let j = 0; j < hgt; j++) {
        const y = ly - j;
        const k = j / hgt;
        const bend = k > 0.55 ? Math.round(tip * (k - 0.55) * 2.2) : 0;
        const wid = j < hgt - 2 ? w4 : w4 - 1;
        for (let i = 0; i < wid; i++) {
          let col = k < 0.3 ? leafCols[3] : i === 0 ? leafCols[1] : i === wid - 1 ? leafCols[2] : leafCols[1];
          if (k > 0.7 && i === 0) col = leafCols[0];
          px(lx + i + bend, y + (j > hgt - 3 ? tipUp : 0), col);
        }
      }
      // tips: two 1px blades (2px apart), a pale ear on a few
      const ty2 = ly - hgt;
      const bendT = Math.round(tip * 1.0);
      px(lx + bendT, ty2 + tipUp, P.leaf);
      if ((hh >>> 13) % 2) px(lx + 2 + bendT, ty2 + tipUp, P.leafYoung);
      if ((hh >>> 14) % 6 === 0) px(lx + 1 + bendT, ty2 - 1 + tipUp, P.goldPale);
    }
  }
  // water inlets (水口): a concrete notch in the ridge where water runs in,
  // the bright ripple fanning out from it into the paddy
  for (const [wx, wy, dir] of INLETS) {
    const lx = wx - x0 * 16;
    const ly = wy - y0 * 16;
    ctx.clearRect(lx - 1, ly - 5, dir === 'w' ? 9 : 6, dir === 'w' ? 7 : 10);
    if (dir === 'w') {
      // on the west bank: box in the ridge, water flowing east
      ctx.fillStyle = P.concrete;
      ctx.fillRect(lx - 4, ly - 3, 4, 5);
      ctx.fillStyle = P.concreteLt;
      ctx.fillRect(lx - 4, ly - 3, 4, 1);
      ctx.fillStyle = P.charcoal;
      ctx.fillRect(lx - 1, ly - 2, 1, 3);
      ctx.fillStyle = P.glint;
      ctx.fillRect(lx, ly - 1, 2, 1);
      ctx.fillStyle = 'rgba(255,246,216,0.6)';
      ctx.fillRect(lx + 2, ly - 2, 2, 1);
      ctx.fillRect(lx + 2, ly, 3, 1);
      ctx.fillStyle = 'rgba(255,246,216,0.35)';
      ctx.fillRect(lx + 5, ly - 3, 2, 1);
      ctx.fillRect(lx + 5, ly + 1, 2, 1);
    } else {
      // on the north bank: a pipe mouth, water falling south
      ctx.fillStyle = P.concrete;
      ctx.fillRect(lx - 1, ly - 4, 5, 3);
      ctx.fillStyle = P.concreteLt;
      ctx.fillRect(lx - 1, ly - 4, 5, 1);
      ctx.fillStyle = P.charcoal;
      ctx.fillRect(lx, ly - 2, 3, 1);
      ctx.fillStyle = P.glint;
      ctx.fillRect(lx + 1, ly - 1, 1, 2);
      ctx.fillStyle = 'rgba(255,246,216,0.55)';
      ctx.fillRect(lx - 1, ly + 1, 2, 1);
      ctx.fillRect(lx + 2, ly + 1, 2, 1);
      ctx.fillStyle = 'rgba(255,246,216,0.3)';
      ctx.fillRect(lx - 2, ly + 3, 2, 1);
      ctx.fillRect(lx + 3, ly + 3, 2, 1);
    }
  }
  const r = { c, x0: x0 * 16, y0: y0 * 16 };
  m.set(lean, r);
  return r;
}

/** Where the night sky shows in the paddy water in stage 2 (world px, centre). */
const PADDY_PATCH: [number, number] = [31.5 * 16, 41 * 16 + 8];

/** Water inlets of the paddies (world px, which bank they sit on). */
const INLETS: [number, number, 'w' | 'n'][] = [
  [13 * 16 + 1, 42 * 16 + 7, 'w'],
  [36 * 16 + 6, 39 * 16 + 5, 'n'],
];

function drawPaddies(w: WaterCtx, pal: WaterPal): void {
  void pal;
  const { ctx, map } = w;
  const [rx, ry, rw, rh] = w.vis ?? [0, 0, w.w, w.h];
  const upright = riceLayer(map, w.stage === 2 ? 2 : 0);
  if (!upright) return;
  // is any paddy visible in this chunk?
  const sx = Math.max(w.worldX + rx, upright.x0);
  const sy = Math.max(w.worldY + ry, upright.y0);
  const ex = Math.min(w.worldX + rx + rw, upright.x0 + upright.c.width);
  const ey = Math.min(w.worldY + ry + rh, upright.y0 + upright.c.height);
  if (ex <= sx || ey <= sy) return;
  // paddy water is shallow and muddy: the sky seen through green-brown
  ctx.fillStyle = 'rgba(46,107,74,0.3)';
  ctx.fillRect(sx - w.worldX, sy - w.worldY, ex - sx, ey - sy);
  // stage 2 "night patch" in an opening of the rice (30–33, 41–42), wobbling in place
  if (w.stage === 2) nightPatch(ctx, PADDY_PATCH[0], PADDY_PATCH[1], w);
  ctx.drawImage(upright.c, sx - upright.x0, sy - upright.y0, ex - sx, ey - sy, sx - w.worldX, sy - w.worldY, ex - sx, ey - sy);
  // the wind wave (QA round 1: diagonal and smooth, not whole columns
  // switching): per 6px planting row the band sits a little further east, so
  // it runs across the field on a slant; its core bends the tips 2px, its
  // shoulders 1px
  if (w.stage === 0 || w.stage === 3) {
    const bent = riceLayer(map, 1)!;
    const half = riceLayer(map, 3)!;
    const period = 7000;
    const ph = (w.mt % period) / period;
    const span = upright.c.width + 360;
    const head = upright.x0 + upright.c.width + 180 - ph * span;
    const strip0 = upright.y0 + Math.floor((sy - upright.y0) / 6) * 6;
    for (let ry0 = strip0; ry0 < ey; ry0 += 6) {
      const ya = Math.max(sy, ry0);
      const yb = Math.min(ey, ry0 + 6);
      if (yb <= ya) continue;
      const slant = (ry0 - upright.y0) * 0.9;
      for (const [off, core] of [[0, 22], [230, 14]] as [number, number][]) {
        const c0 = head + off + slant;
        for (const [bx0, bw, layer] of [
          [c0 - core / 2 - 9, 9, half],
          [c0 - core / 2, core, bent],
          [c0 + core / 2, 9, half],
        ] as [number, number, typeof bent][]) {
          const ax = Math.max(sx, Math.round(bx0));
          const bx = Math.min(ex, Math.round(bx0 + bw));
          if (bx <= ax) continue;
          ctx.save();
          ctx.beginPath();
          ctx.rect(ax - w.worldX, ya - w.worldY, bx - ax, yb - ya);
          ctx.clip();
          drawSkyBase(w);
          ctx.fillStyle = 'rgba(46,107,74,0.3)';
          ctx.fillRect(ax - w.worldX, ya - w.worldY, bx - ax, yb - ya);
          ctx.drawImage(layer.c, ax - layer.x0, ya - layer.y0, bx - ax, yb - ya, ax - w.worldX, ya - w.worldY, bx - ax, yb - ya);
          ctx.restore();
        }
      }
    }
  }
}
