// Chapter 2 ground decals (52_ch2_level_art 7.2): the random wear of the
// village road, and the hand-placed marks — 軽トラ ruts (with puddles that
// mirror the stars), spilt rice straw, the barn's 消石灰 band, the village
// manholes (a star over three terraces; one of them a はなまる), the school
// yard's faded track, the bus's tyre arc in the turning circle, dirt by the
// barn door, leaves blown against the houses.

import { mix, rgba32, toRgb } from '../../engine/pixel';
import type { DecalPen, GroundDecal } from './decals';
import { h01, ihash, valueNoise } from './noise';
import { P } from './palette';

export type HDecalKind = 'h_ruts' | 'h_straw' | 'h_shoukai' | 'h_manhole' | 'h_chalk' | 'h_tirearc' | 'h_stain' | 'h_leaves' | 'h_sand' | 'h_grassedge';

const RUT = mix(P.wood, P.woodDark, 0.55);
const RUT_LT = mix(P.brassOld, P.woodLt, 0.5);

/** Blend a colour over what is already there (decals are baked, so this is exact). */
function tint(pen: DecalPen, x: number, y: number, col: string, a: number): void {
  const v = pen.get(x, y);
  if (!(v >>> 24)) return;
  const [r, g, b] = toRgb(col);
  const r0 = v & 255;
  const g0 = (v >>> 8) & 255;
  const b0 = (v >>> 16) & 255;
  const rr = Math.round(r0 + (r - r0) * a);
  const gg = Math.round(g0 + (g - g0) * a);
  const bb = Math.round(b0 + (b - b0) * a);
  pen.set(x, y, ((255 << 24) | (bb << 16) | (gg << 8) | rr) >>> 0);
}

/** The village road's wear (random layer): cracks with grass in them, patches, small holes. */
export function roadWear(pen: DecalPen, tx: number, ty: number, seed: number): void {
  const r = h01(tx + 97, ty + 13, seed);
  const r2 = h01(tx + 31, ty + 57, seed + 1);
  if (r < 0.1) {
    // crack, a tuft of grass in it now and then
    const h = ihash(tx, ty, seed + 301);
    let x = tx * 16 + 2 + (h % 12);
    let y = ty * 16 + 1 + ((h >>> 4) % 8);
    const len = 8 + ((h >>> 8) % 9);
    let dx = (h >>> 12) & 1 ? 1 : -1;
    for (let k = 0; k < len; k++) {
      pen.set(x, y, P.charcoal);
      if (k % 3 === 0) pen.set(x + dx, y, mix(P.asphalt, P.steel, 0.3));
      const q = ihash(k, h, 7) % 5;
      if (q < 2) x += dx;
      else if (q < 4) y += 1;
      else {
        x += dx;
        y += 1;
      }
      if (k === (len >> 1) && (h >>> 16) % 2 === 0) dx = -dx;
      if (k === len - 3 && r2 < 0.5) {
        pen.set(x, y - 1, P.leaf);
        pen.set(x + 1, y - 2, P.leafYoung);
        pen.set(x - 1, y - 1, P.leafDeep);
      }
    }
  } else if (r < 0.16) {
    // patch: a newer, darker square of asphalt with crisp seams
    const h = ihash(tx, ty, seed + 303);
    const w = 8 + (h % 6);
    const hh = 6 + ((h >>> 4) % 5);
    const x = tx * 16 + ((h >>> 8) % Math.max(1, 16 - w));
    const y = ty * 16 + ((h >>> 12) % Math.max(1, 16 - hh));
    for (let j = 0; j < hh; j++)
      for (let i = 0; i < w; i++) {
        let col = mix(P.asphalt, P.charcoal, 0.4);
        if (j === 0 || i === 0) col = P.charcoal;
        else if (j === hh - 1 || i === w - 1) col = mix(P.asphalt, P.steel, 0.25);
        else if (ihash(x + i, y + j, 5) % 7 === 0) col = mix(P.asphalt, P.charcoal, 0.2);
        pen.set(x + i, y + j, col);
      }
  } else if (r < 0.17) {
    // a small pothole
    const h = ihash(tx, ty, seed + 305);
    const x = tx * 16 + 3 + (h % 10);
    const y = ty * 16 + 3 + ((h >>> 4) % 10);
    for (let j = 0; j < 3; j++) for (let i = 0; i < 4; i++) if (!((i === 0 || i === 3) && (j === 0 || j === 2))) pen.set(x + i, y + j, j === 0 ? P.ink : P.charcoal);
    pen.set(x + 1, y + 2, P.steel);
  }
  if (r2 > 0.92) {
    // grass along a seam at the tile's foot
    const h = ihash(tx, ty, seed + 307);
    const x = tx * 16 + 2 + (h % 12);
    const y = ty * 16 + 15;
    pen.set(x, y, P.leafDeep);
    pen.set(x + 1, y, P.leaf);
    pen.set(x, y - 1, P.leaf);
    pen.set(x + 1, y - 2, P.leafYoung);
  }
}

/** Dirt lanes and yards: now and then a dropped straw knot or a stone. */
export function dirtWear(pen: DecalPen, tx: number, ty: number, seed: number): void {
  const r = h01(tx + 7, ty + 29, seed + 11);
  if (r > 0.05) return;
  const h = ihash(tx, ty, seed + 313);
  const x = tx * 16 + 3 + (h % 10);
  const y = ty * 16 + 4 + ((h >>> 4) % 8);
  for (let k = 0; k < 5; k++) pen.set(x + k, y + ((k * 3) >> 2), k & 1 ? P.woodLt : P.goldPale);
  pen.set(x + 1, y + 1, P.brassOld);
}

function strand(pen: DecalPen, x: number, y: number, h: number): void {
  const len = 2 + (h % 3);
  const dx = (h >>> 3) & 1 ? 1 : -1;
  for (let k = 0; k < len; k++) pen.set(x + k * dx, y + ((k + (h >>> 5)) % 3 === 0 ? 1 : 0), k === 0 ? P.goldPale : (h >>> 7) & 1 ? P.woodLt : P.brass);
}

const PAINT: Record<HDecalKind, (pen: DecalPen, d: GroundDecal) => void> = {
  /** 軽トラのわだち: two worn lines 12px apart along `dir`, a puddle here and there (navy → stars). */
  h_ruts(pen, d) {
    const W = (d.w ?? 1) * 16;
    const Hh = (d.h ?? 1) * 16;
    const x0 = d.x * 16;
    const y0 = d.y * 16;
    const vert = d.dir === 'v';
    const len = vert ? Hh : W;
    const across = vert ? W : Hh;
    const mid = Math.floor(across / 2);
    for (let t = 0; t < len; t++) {
      for (const side of [-6, 6]) {
        const wob = Math.round((valueNoise(t / 17, side, 1401 + (d.v ?? 0)) - 0.5) * 2);
        const a = mid + side + wob;
        const X = vert ? x0 + a : x0 + t;
        const Y = vert ? y0 + t : y0 + a;
        pen.set(X, Y, RUT);
        const lX = vert ? X - 1 : X;
        const lY = vert ? Y : Y - 1;
        if ((t & 1) === 0) pen.set(lX, lY, RUT_LT);
        // puddles: 5–8px long, 2px wide, in the rut
        const p = valueNoise(t / 9, side + 3, 1403 + (d.v ?? 0));
        if (p > 0.74) {
          pen.set(X, Y, P.navy);
          const oX = vert ? X + 1 : X;
          const oY = vert ? Y : Y + 1;
          pen.set(oX, oY, p > 0.8 ? P.navy : RUT);
        }
      }
    }
  },
  /** こぼれた稲わら: strands scattered thickest in the middle of the rect. */
  h_straw(pen, d) {
    const W = (d.w ?? 1) * 16;
    const Hh = (d.h ?? 1) * 16;
    const n = Math.round((W * Hh) / 30);
    for (let i = 0; i < n; i++) {
      const h = ihash(i, d.x * 64 + d.y, 1411 + (d.v ?? 0));
      const u = (h % 1000) / 1000;
      const v = ((h >>> 10) % 1000) / 1000;
      const edge = Math.max(Math.abs(u - 0.5), Math.abs(v - 0.5)) * 2;
      if (edge > 0.6 && (h >>> 20) % 3 !== 0) continue;
      strand(pen, d.x * 16 + Math.floor(u * W), d.y * 16 + Math.floor(v * Hh), h >>> 3);
    }
  },
  /** 消石灰: the white powder band across the barn entrance (48×10). */
  h_shoukai(pen, d) {
    const W = (d.w ?? 3) * 16;
    const x0 = d.x * 16;
    const y0 = d.y * 16 + 3;
    for (let j = 0; j < 10; j++)
      for (let i = 0; i < W; i++) {
        const edge = Math.min(i, W - 1 - i, j, 9 - j);
        const n = valueNoise((x0 + i) / 3, (y0 + j) / 3, 1421);
        if (edge === 0 && n < 0.55) continue;
        if (edge === 1 && n < 0.3) continue;
        if (h01(x0 + i, y0 + j, 1423) < 0.8 || edge > 1) pen.set(x0 + i, y0 + j, n > 0.7 ? P.concreteLt : P.white);
      }
    // footprints through it (boots, going in)
    for (let k = 0; k < 3; k++) {
      const fx = x0 + 18 + k * 5 + (k & 1) * 3;
      const fy = y0 + 2 + (k & 1) * 3;
      for (let j = 0; j < 4; j++) for (let i = 0; i < 2; i++) pen.set(fx + i, fy + j, P.concrete);
    }
  },
  /** 村の集落排水のマンホール: a star over three terraces (v=1: the star is a はなまる). */
  h_manhole(pen, d) {
    const cx = d.x * 16 + 8;
    const cy = d.y * 16 + 8;
    for (let j = -8; j <= 8; j++)
      for (let i = -8; i <= 8; i++) {
        const r = Math.hypot(i + 0.5, j + 0.5);
        if (r > 7.6) continue;
        let col: string = P.asphalt;
        if (r > 6.6) col = i + j < 0 ? P.steel : P.charcoal;
        else if (r > 5.9) col = P.charcoal;
        else {
          // three terraces (arcs stepping down) in the lower half
          const yy = j + 0.5;
          if (yy > 0.5) {
            const step = Math.floor((yy - 0.5) / 1.8);
            const arc = Math.round((i + 0.5) * (i + 0.5) / 14);
            if ((yy - 0.5 - arc) % 2 < 1 && step < 3) col = P.steel;
            else col = (i + j) & 1 ? P.asphalt : mix(P.asphalt, P.charcoal, 0.3);
          } else col = (i + j) & 1 ? P.asphalt : mix(P.asphalt, P.charcoal, 0.3);
        }
        pen.set(cx + i, cy + j, col);
      }
    // the star (or the hanamaru) in the upper half
    const sy = cy - 3;
    if (d.v === 1) {
      for (let a = 0; a < 16; a++) {
        const t = (a / 16) * Math.PI * 2;
        const rr = 2.6 + (a & 1) * 0.9;
        pen.set(Math.round(cx + Math.cos(t) * rr), Math.round(sy + Math.sin(t) * rr), P.concreteLt);
      }
      pen.set(cx, sy, P.steel);
      pen.set(cx - 1, sy, P.steel);
    } else {
      const star = ['..#..', '.###.', '#####', '.#.#.'];
      star.forEach((row, j) => [...row].forEach((ch, i) => ch === '#' && pen.set(cx - 2 + i, sy - 2 + j, j === 0 || i === 0 ? P.concreteLt : P.steel)));
    }
  },
  /** 校庭の消えかけた白線: a running-track bend and a straight, 1px, broken. */
  h_chalk(pen, d) {
    const W = (d.w ?? 1) * 16;
    const Hh = (d.h ?? 1) * 16;
    const x0 = d.x * 16;
    const y0 = d.y * 16;
    const rx = W / 2 - 3;
    const ry = Hh / 2 - 3;
    const cx = x0 + W / 2;
    const cy = y0 + Hh / 2;
    for (let a = 0; a < 720; a++) {
      const t = (a / 720) * Math.PI * 2;
      const x = Math.round(cx + Math.cos(t) * rx);
      const y = Math.round(cy + Math.sin(t) * ry);
      if (valueNoise(a / 9, 0, 1431) < 0.42) continue;
      tint(pen, x, y, P.white, 0.4);
    }
    // the start line
    for (let j = -3; j <= 3; j++) if (h01(j, 0, 1433) > 0.3) tint(pen, Math.round(cx), Math.round(cy + ry + j - 1), P.white, 0.38);
  },
  /** The bus's tyre arc through the gravel of the turning circle. */
  h_tirearc(pen, d) {
    const W = (d.w ?? 1) * 16;
    const Hh = (d.h ?? 1) * 16;
    const cx = d.x * 16 + W;
    const cy = d.y * 16 + Hh;
    for (const off of [0, 9]) {
      const rx = W - 4 - off;
      const ry = Hh - 4 - off;
      for (let a = 0; a < 200; a++) {
        const t = Math.PI + (a / 200) * (Math.PI / 2);
        const x = Math.round(cx + Math.cos(t) * rx);
        const y = Math.round(cy + Math.sin(t) * ry);
        tint(pen, x, y, P.charcoal, 0.45);
        if (a % 3 === 0) tint(pen, x + 1, y, P.charcoal, 0.25);
      }
    }
  },
  /** Trodden dirt by a doorway (#6B5A4A α30%, 52 7.1). */
  h_stain(pen, d) {
    const W = (d.w ?? 1) * 16;
    const Hh = (d.h ?? 1) * 16;
    for (let j = 0; j < Hh; j++)
      for (let i = 0; i < W; i++) {
        const u = (i + 0.5) / W - 0.5;
        const v = (j + 0.5) / Hh;
        const k = 1 - Math.hypot(u * 1.6, v) + (valueNoise(i / 4, j / 4, 1441) - 0.5) * 0.5;
        if (k <= 0) continue;
        tint(pen, d.x * 16 + i, d.y * 16 + j, '#6B5A4A', Math.min(0.32, k * 0.5));
      }
  },
  /** Leaves blown against the front of a house. */
  h_leaves(pen, d) {
    const W = (d.w ?? 1) * 16;
    const n = Math.round(W / 3);
    const cols = [P.leaf, P.brass, P.leafDeep, P.brassOld, P.goldPale];
    for (let i = 0; i < n; i++) {
      const h = ihash(i, d.x * 97 + d.y, 1451);
      const x = d.x * 16 + (h % W);
      const y = d.y * 16 + ((h >>> 8) % 5);
      const col = cols[(h >>> 12) % cols.length];
      pen.set(x, y, col);
      pen.set(x + 1, y, col);
      pen.set(x + 1, y + 1, mix(col, P.nightShade, 0.35));
    }
  },
  /**
   * Sand washed down to the foot of the slope: a fan of fine grains, densest
   * where the water stopped (the middle of the rect's south half), thinning
   * into scattered grains, with the faint ripple lines the runoff left.
   */
  h_sand(pen, d) {
    const W = (d.w ?? 1) * 16;
    const Hh = (d.h ?? 1) * 16;
    for (let j = 0; j < Hh; j++)
      for (let i = 0; i < W; i++) {
        const X = d.x * 16 + i;
        const Y = d.y * 16 + j;
        const u = (i + 0.5) / W - 0.5;
        const vv = (j + 0.5) / Hh;
        const fan = 1 - Math.hypot(u * 1.7, (vv - 0.7) * 1.3) + (valueNoise(X / 7, Y / 5, 1461) - 0.5) * 0.45;
        if (fan <= 0.15) continue;
        const g = h01(X, Y, 1463);
        if (g > fan * 1.25) continue; // grains thin out toward the fan's edge
        let col = g < 0.18 ? P.paperGrid : g < 0.6 ? mix(P.paperGrid, P.woodLt, 0.45) : mix(P.woodLt, P.brassOld, 0.3);
        // the runoff's ripple lines, curving round the fan
        if (fan > 0.45 && Math.floor(Math.hypot(u * 1.7, (vv - 0.7) * 1.3) * 22) % 4 === 0 && g < 0.5) col = mix(P.woodLt, P.brassOld, 0.45);
        pen.set(X, Y, col);
      }
  },
  /** Grass mown back along a fence line (the strip under the electric fence is kept low). */
  h_grassedge(pen, d) {
    const W = (d.w ?? 1) * 16;
    for (let i = 0; i < W; i++) {
      const x = d.x * 16 + i;
      const y = d.y * 16;
      for (let j = 0; j < 5; j++) {
        const v = pen.get(x, y + j);
        if (v === rgba32(P.leaf) || v === rgba32(P.leafDeep)) pen.set(x, y + j, (x + j) & 1 ? P.leafYoung : P.leaf);
      }
    }
  },
};

export function paintHDecal(pen: DecalPen, d: GroundDecal): boolean {
  const f = (PAINT as Record<string, ((p: DecalPen, dd: GroundDecal) => void) | undefined>)[d.k];
  if (!f) return false;
  f(pen, d);
  return true;
}
