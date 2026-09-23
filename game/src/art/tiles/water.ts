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
import { ihash } from './noise';
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

/** Rows of the revetment face drawn by the ground (the water surface starts below). */
const REVETMENT = 5;
/** Rows of the moss lip at the near bank (ground art). */
const LIP = 2;

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
  return {
    hi: mixc(top, GLINT, 0.35 * (1 - night)),
    top: mixc(top, GLINT, 0.12 * (1 - night)),
    mid: mixc(top, low, 0.5),
    low,
    edge: mixc(low, SUNSHADE, 0.45),
    ripple: mixc(mixc(low, LILAC, 0.55), INK, night * 0.5),
    dash: mixc(GLINT, g.horizon, 0.3),
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
  // 1. banded gradient (4 bands, dithered 1px borders)
  const bandCol = (v: number): RGB => (v < 0.22 ? pal.hi : v < 0.48 ? pal.top : v < 0.76 ? pal.mid : pal.low);
  for (let ly = ly0; ly < ly1; ly++) {
    const wy = w.worldY + ly;
    const v = (wy - s0) / Math.max(1, span);
    const col = bandCol(Math.max(0, Math.min(0.999, v)));
    ctx.fillStyle = css(col);
    ctx.fillRect(lx0, ly, W0, 1);
    // dither the row just above a band border with the next band's colour
    const vn = (wy + 1 - s0) / Math.max(1, span);
    const nxt = bandCol(Math.max(0, Math.min(0.999, vn)));
    if (nxt !== col) {
      ctx.fillStyle = css(nxt);
      for (let lx = lx0 + ((w.worldX + lx0 + wy) & 1); lx < lx1; lx += 2) ctx.fillRect(lx, ly, 1, 1);
    }
  }
  const t = w.t;
  // 2. reflections of the bank (guardrail rail + posts, trees, poles), wobbling
  const wob = (wy: number) => Math.round(Math.sin(wy * 0.75 + t / 260) * 1.1);
  const mirror = s0 - 1; // reflection axis ≈ the revetment middle (objects stand REVETMENT px above the water)
  ctx.fillStyle = css(mixc(pal.hi, GLINT, 0.5), 0.35 * (1 - w.grade.night * 0.6));
  const railRefl = mirror + REVETMENT + 10;
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
    ctx.globalAlpha = 0.3;
    for (const r of refl) {
      const lift = r.foot - (top - 1); // how far above the bank line the feet stand
      for (const part of r.parts) {
        if (part.x > w.worldX + lx1 || part.x + part.img.width < w.worldX + lx0) continue;
        const sil = silhouette(part.img, P.shadeDeep);
        for (let ly = ly0; ly < ly1; ly++) {
          const wy = w.worldY + ly;
          if (wy < s0) continue;
          // height above the water of the object row that reflects here
          const hgt = wy - s0 + 1 - REVETMENT - lift;
          const srcY = r.foot - hgt - part.top;
          if (srcY < 0 || srcY >= part.img.height) continue;
          ctx.drawImage(sil, 0, srcY, part.img.width, 1, part.x - w.worldX + wob(wy), ly, part.img.width, 1);
        }
      }
    }
    ctx.globalAlpha = 1;
  }
  // 3. the revetment's shadow band on the water, and the dark lip at the near bank
  const shade: [number, number][] = [
    [s0, 0.42],
    [s0 + 1, 0.3],
    [s0 + 2, 0.16],
    [s1 - 2, 0.22],
    [s1 - 1, 0.42],
  ];
  for (const [wy, al] of shade) {
    const ly = wy - w.worldY;
    if (ly < ly0 || ly >= ly1) continue;
    ctx.fillStyle = css(INK, al);
    ctx.fillRect(lx0, ly, W0, 1);
  }
  // 4. ripples and highlight dashes drifting east with the current (never freeze)
  const flow = (t / 1000) * 6;
  const lanes = Math.floor(span / 3);
  for (let L = 1; L < lanes; L++) {
    const wy = s0 + 1 + L * 3 + (L % 2);
    const ly = wy - w.worldY;
    if (ly < ly0 || ly >= ly1) continue;
    const S = 22; // spacing between dashes on a lane
    const off = flow * (0.7 + (L % 3) * 0.2);
    const j0 = Math.floor((w.worldX + lx0 - off - 12) / S);
    const j1 = Math.floor((w.worldX + lx1 - off) / S);
    for (let j = j0; j <= j1; j++) {
      const hh = ihash(j, L, 4321 + ty);
      const x = Math.round(j * S + (hh % S) + off) - w.worldX;
      const life = Math.sin(t / (900 + (hh >>> 20) % 700) + (hh % 628) / 100);
      if (life < -0.2) continue;
      const kind = (hh >>> 8) % 5;
      if (kind <= 1) {
        // dark ripple line
        const len = 4 + ((hh >>> 12) % 6);
        ctx.fillStyle = css(pal.ripple, 0.35 + 0.15 * life);
        ctx.fillRect(x, ly, len, 1);
      } else if (kind === 2 || kind === 3) {
        // highlight dash (a second, shorter one below sometimes)
        const len = 3 + ((hh >>> 12) % 4);
        ctx.fillStyle = css(pal.dash, (0.55 + 0.35 * life) * (1 - w.grade.night * 0.7));
        ctx.fillRect(x, ly, len, 1);
        if ((hh >>> 16) % 3 === 0) ctx.fillRect(x + 2, ly + 1, Math.max(2, len - 3), 1);
      }
    }
  }
  // 5. low-sun glitter: bright dashes, denser at the western (left) edge of the screen
  if (w.grade.night < 0.5) {
    const gt = Math.floor((w.stage === 1 ? 0 : w.mt) / 200);
    for (let wy = s0 + 3; wy < s1 - 2; wy += 2) {
      const ly = wy - w.worldY;
      if (ly < ly0 || ly >= ly1) continue;
      for (let k = 0; k < 6; k++) {
        const hh = ihash(k, wy + gt * 7, 71);
        const sx = hh % W;
        if ((hh >>> 10) % 100 > 8 + (1 - sx / W) * 40) continue;
        const lx = sx + w.camX - w.worldX;
        if (lx < lx0 - 4 || lx > lx1) continue;
        ctx.fillStyle = (hh >>> 20) % 3 ? 'rgba(255,231,163,0.75)' : 'rgba(255,246,216,0.95)';
        ctx.fillRect(lx, ly, 2 + ((hh >>> 16) % 3), 1);
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

function nightPatch(ctx: CanvasRenderingContext2D, bx: number, by: number, w: WaterCtx): void {
  const lx = Math.floor(bx - w.worldX);
  const ly = Math.floor(by - w.worldY);
  if (lx < -30 || ly < -12 || lx > w.w + 30 || ly > w.h + 12) return;
  ctx.fillStyle = css([27, 23, 51], 0.92);
  for (let yy = -5; yy <= 5; yy++) {
    const half = Math.round(12 * Math.sqrt(Math.max(0, 1 - (yy / 5.4) ** 2)));
    ctx.fillRect(lx - half, ly + yy, half * 2, 1);
  }
  ctx.fillStyle = css([58, 43, 92], 0.9);
  for (let yy = -5; yy <= 5; yy += 10) ctx.fillRect(lx - 6, ly + yy, 12, 1);
  ctx.fillStyle = P.glint;
  ctx.fillRect(lx + 4, ly - 2, 1, 1);
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
 *   2 = stage 2 (tips lean north-east).
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
  const leafCols = [P.leafYoung, P.leaf, P.leafDeep, P.leafShade];
  const ROW = 6;
  const COL = 4;
  for (let gy = y0 * 16 + 5; gy < (y1 + 1) * 16; gy += ROW) {
    const row = Math.floor(gy / ROW);
    const shift = (row % 2) * 2;
    for (let gx = x0 * 16 + shift; gx < (x1 + 1) * 16; gx += COL) {
      const hh = ihash(Math.floor(gx / COL), row, 5501);
      if (hh % 23 === 0) continue; // a missing tuft: open water
      const bx = gx + ((hh >>> 5) % 2);
      const by = gy;
      // keep tufts off the edges of the paddy (ridge paths)
      if (!isPaddy(bx - 1, by + 2) || !isPaddy(bx + 4, by + 2) || !isPaddy(bx + 1, by - 5)) continue;
      const hgt = 4 + ((hh >>> 8) % 3); // 4–6px
      const w4 = (hh >>> 11) % 3 === 0 ? 3 : 4;
      const lx = bx - x0 * 16;
      const ly = by - y0 * 16;
      const tip = lean === 1 ? -2 : lean === 2 ? 1 : 0;
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
  const r = { c, x0: x0 * 16, y0: y0 * 16 };
  m.set(lean, r);
  return r;
}

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
  // stage 2 "night patch" in the paddy water, under the rice
  if (w.stage === 2 || w.grade.toMall > 0.5) nightPatch(ctx, 31.5 * 16 - ((w.t / 1000) * 3 * 0.3) % 200, 41 * 16 + 6, w);
  // paddy water is shallow and muddy: the sky seen through green-brown
  ctx.fillStyle = 'rgba(46,107,74,0.3)';
  ctx.fillRect(sx - w.worldX, sy - w.worldY, ex - sx, ey - sy);
  ctx.drawImage(upright.c, sx - upright.x0, sy - upright.y0, ex - sx, ey - sy, sx - w.worldX, sy - w.worldY, ex - sx, ey - sy);
  // the wind wave: a band ~40px wide sweeping east → west, bending the tips 2px
  if (w.stage === 0 || w.stage === 3) {
    const bent = riceLayer(map, 1)!;
    const period = 7000;
    const ph = (w.mt % period) / period;
    const span = upright.c.width + 200;
    const bandX = upright.x0 + upright.c.width + 100 - ph * span;
    for (const [bx0, bw] of [[bandX - 20, 40], [bandX + 180, 24]] as [number, number][]) {
      const ax = Math.max(sx, Math.round(bx0));
      const bx = Math.min(ex, Math.round(bx0 + bw));
      if (bx <= ax) continue;
      // clear the upright tufts inside the band, then draw the bent ones
      ctx.save();
      ctx.beginPath();
      ctx.rect(ax - w.worldX, sy - w.worldY, bx - ax, ey - sy);
      ctx.clip();
      drawSkyBase(w);
      ctx.fillStyle = 'rgba(46,107,74,0.3)';
      ctx.fillRect(ax - w.worldX, sy - w.worldY, bx - ax, ey - sy);
      ctx.drawImage(bent.c, ax - bent.x0, sy - bent.y0, bx - ax, ey - sy, ax - w.worldX, sy - w.worldY, bx - ax, ey - sy);
      ctx.restore();
    }
  }
}
