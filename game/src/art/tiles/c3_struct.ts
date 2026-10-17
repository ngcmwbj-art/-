// Chapter 3 structures from the ASCII layer (62_ch3_level_art 3.2・7.1): 海ぞいの町.
//
//   hedge|c3_matsu     the black pines (クロマツ) of the hill and the cape: dark
//                      blue-green needle pads in layers on leaning red-brown trunks
//   hedge|c3_iwa       the rocks of the shore (岩場): round grey boulders, barnacles
//   hedge|c3_tetra     the tetrapods outside the breakwater (テトラ): four-legged
//                      concrete blocks, two shapes turned this way and that
//   wall|c3_ishigaki   the hill's retaining wall: round sea stones (野面積み), the
//                      grass of the hill lipping over its top
//
// Like chapter 2's (hoshi_struct.ts) these are y-sorted cell sprites placed
// in world space, so runs flow on from cell to cell.

import { mix, PixelCanvas } from '../../engine/pixel';
import { ihash, valueNoise } from './noise';
import { P } from './palette';
import type { CellArt, CellMask } from './structures';

const W = 16;

const PINE = { lt: '#5A8A5A', base: '#3A6A4A', dk: '#2A4A3A', deep: '#1B2E2A' };
const BARK = { lt: '#A8644A', base: '#7A4A3A', dk: '#4A2E2A' };
const ROCK = { lt: '#A8A6A0', base: '#8E8C86', md: '#6B6A66', dk: '#4A4946', deep: '#2E2D2C' };
const TETRA = { lt: '#E8E4D8', base: '#C8C4B8', md: '#A8A498', dk: '#7A766C' };

/** World-space points on a jittered grid near a cell. */
function gridPoints(tx: number, ty: number, sx: number, sy: number, seed: number, margin: number): { x: number; y: number; h: number }[] {
  const out: { x: number; y: number; h: number }[] = [];
  const x0 = tx * 16 - margin;
  const x1 = tx * 16 + 16 + margin;
  const y0 = ty * 16;
  const y1 = ty * 16 + 16;
  for (let gy = Math.floor(y0 / sy) - 1; gy <= Math.floor(y1 / sy) + 1; gy++)
    for (let gx = Math.floor(x0 / sx) - 1; gx <= Math.floor(x1 / sx) + 1; gx++) {
      const h = ihash(gx, gy, seed);
      const x = gx * sx + (h % sx);
      const y = gy * sy + ((h >>> 8) % sy);
      if (x < x0 || x >= x1 || y < y0 || y >= y1) continue;
      out.push({ x, y, h });
    }
  out.sort((a, b) => a.y - b.y || a.x - b.x);
  return out;
}

// ---------------------------------------------------------------- クロマツ

function matsuCell(tx: number, ty: number, m: CellMask): CellArt {
  const RISE = 34;
  const h = 16 + RISE;
  const p = new PixelCanvas(W, h);
  const wx0 = tx * 16;
  const wy0 = ty * 16 + 16 - h;
  const inside = (wx: number) => {
    const cx = Math.floor(wx / 16);
    return cx < tx ? m.w : cx > tx ? m.e : true;
  };
  // the needle-strewn floor under the pines (inside the wood only)
  const floorTop = m.n ? 0 : RISE - 2;
  for (let y = floorTop; y < h; y++)
    for (let x = 0; x < W; x++) {
      const wy = wy0 + y;
      if (!m.w && x < 3 + Math.round(valueNoise(wy * 0.21, tx, 3301) * 4)) continue;
      if (!m.e && x > 12 - Math.round(valueNoise(wy * 0.21, tx + 3, 3303) * 4)) continue;
      if (!m.s && y > h - 3 - Math.round(valueNoise((wx0 + x) * 0.25, ty, 3305) * 3)) continue;
      p.set(x, y, ihash((wx0 + x) >> 1, (wy0 + y) >> 1, 3307) % 4 === 0 ? PINE.dk : PINE.deep);
    }
  const trees = gridPoints(tx, ty, 10, 8, 3309, 12).filter((t) => inside(t.x));
  for (const t of trees) {
    const bx = t.x - wx0;
    const by = t.y - wy0;
    const lean = ((t.h >>> 3) % 3) - 1;
    const tall = 18 + ((t.h >>> 5) % 8);
    // the trunk: red-brown, leaning, rough
    for (let j = 0; j < tall; j++) {
      const x = bx + Math.round((lean * j) / 9);
      p.set(x, by - j, j === 0 ? P.ink : BARK.base);
      p.set(x + 1, by - j, j === 0 ? P.ink : j % 4 === 1 ? BARK.lt : BARK.dk);
    }
    // the crown: 3–4 flat pads of needles in layers, the top one smallest
    const pads = 3 + ((t.h >>> 9) % 2);
    for (let k = 0; k < pads; k++) {
      const hh = ihash(k, t.h, 3311);
      const py = by - tall + 4 - k * 6 + ((hh >>> 3) % 2);
      const px = bx + Math.round((lean * (tall - 4 + k * 6)) / 9) + (((hh >>> 5) % 5) - 2);
      const rw = 8 - k * 1.5 + ((hh >>> 8) % 2);
      const rh = 2.6;
      for (let y = -3; y <= 3; y++)
        for (let x = -Math.ceil(rw); x <= Math.ceil(rw); x++) {
          const d = (x * x) / (rw * rw) + (y * y) / (rh * rh);
          if (d > 1) continue;
          let c = y <= -2 ? PINE.lt : y <= 0 ? PINE.base : y === 1 ? PINE.dk : PINE.deep;
          // needles: short strokes
          if (ihash(px + x, py + y, 3313) % 4 === 0) c = c === PINE.lt ? PINE.base : c === PINE.base ? PINE.dk : c;
          if (d > 0.8 && y > 0) c = PINE.deep;
          p.set(px + x, py + y, c);
        }
    }
  }
  if (!m.s) for (let x = 0; x < W; x++) if (p.alpha(x, h - 1)) p.set(x, h - 1, P.ink);
  return { img: p.toCanvas(), ox: 0, oy: 16 - h, shadow: 0 };
}

// ---------------------------------------------------------------- 岩場

function rockCell(tx: number, ty: number, _m: CellMask): CellArt {
  const RISE = 10;
  const h = 16 + RISE;
  const p = new PixelCanvas(W, h);
  const wx0 = tx * 16;
  const wy0 = ty * 16 + 16 - h;
  const pts = gridPoints(tx, ty, 8, 6, 3321, 6);
  for (const t of pts) {
    const bx = t.x - wx0;
    const by = t.y - wy0;
    const rw = 4 + ((t.h >>> 4) % 4);
    const rh = 3 + ((t.h >>> 7) % 3);
    for (let y = -rh * 2; y <= 0; y++)
      for (let x = -rw; x <= rw; x++) {
        const d = (x * x) / (rw * rw) + ((y + rh) * (y + rh)) / (rh * rh);
        if (d > 1) continue;
        const lit = x * 0.5 + (y + rh);
        let c = lit < -rh * 0.6 ? ROCK.lt : lit < 0 ? ROCK.base : lit < rh * 0.7 ? ROCK.md : ROCK.dk;
        if (y === 0 || d > 0.86) c = d > 0.86 && lit < 0 ? ROCK.md : ROCK.deep;
        if (ihash(bx + x + wx0, by + y + wy0, 3323) % 13 === 0 && y > -rh) c = P.concreteLt; // barnacles
        p.set(bx + x, by + y, c);
      }
  }
  return { img: p.toCanvas(), ox: 0, oy: 16 - h, shadow: 0 };
}

// ---------------------------------------------------------------- テトラポッド

/** One tetrapod (about 18 px across) with its hub at (cx, cy), in one of four turns, outlined. */
function tetrapod(p: PixelCanvas, cx: number, cy: number, turn: number): void {
  const legs: [number, number][][] = [
    [[-8, 4], [8, 4], [0, -9], [1, 7]],
    [[-7, 2], [8, 6], [-2, -9], [4, -3]],
    [[-8, 6], [7, 2], [3, -9], [-3, -2]],
    [[-6, 3], [8, 2], [-4, -8], [2, 7]],
  ];
  const L = legs[turn % 4];
  const shape = new PixelCanvas(p.w, p.h);
  const order = [...L].sort((a, b) => a[1] - b[1]);
  for (const [lx, ly] of order) {
    const n = Math.max(Math.abs(lx), Math.abs(ly), 1);
    for (let k = 0; k <= n; k++) {
      const x = cx + (lx * k) / n;
      const y = cy + (ly * k) / n;
      const r = 3.2 - (k / n) * 1.1;
      for (let j = -4; j <= 4; j++)
        for (let i = -4; i <= 4; i++) {
          if (i * i + j * j > r * r) continue;
          const X = Math.round(x + i);
          const Y = Math.round(y + j);
          const lit = i + j;
          const c = lit < -2 ? TETRA.lt : lit < 1 ? TETRA.base : lit < 3 ? TETRA.md : TETRA.dk;
          shape.set(X, Y, c);
        }
    }
    // the leg's flat end, a step darker
    shape.set(cx + lx, cy + ly, TETRA.dk);
  }
  shape.set(cx - 1, cy - 1, TETRA.lt);
  shape.outline('#4A4840');
  p.blit(shape, 0, 0);
}

function tetraCell(tx: number, ty: number, m: CellMask): CellArt {
  const RISE = 12;
  const h = 16 + RISE;
  const p = new PixelCanvas(W + 12, h);
  // one block a cell, its hub jittered a little; the next cell's block overlaps this one's edge
  const k = ihash(tx, ty, 3331);
  const cx = 6 + 8 + ((k % 5) - 2);
  const cy = h - 9 + (((k >>> 4) % 3) - 1);
  tetrapod(p, cx, cy, (k >>> 8) + tx);
  // the wet foot where it stands in the sea: a dark rim
  for (let x = 0; x < p.w; x++) for (let y = h - 3; y < h; y++) if (p.alpha(x, y) && ihash(x, y, 3333 + tx) % 2 === 0) p.set(x, y, TETRA.dk);
  void m;
  return { img: p.toCanvas(), ox: -6, oy: 16 - h, shadow: 0 };
}

// ---------------------------------------------------------------- 石垣（丸い石の野面積み）

function ishigakiCell(tx: number, ty: number, m: CellMask): CellArt {
  const FACE = 22;
  const CAP = 2;
  const top = 16 + CAP;
  const p = new PixelCanvas(W, top + FACE);
  const wx0 = tx * 16;
  // round sea stones of mixed sizes: a jittered grid of centres, each pixel
  // takes the nearest one (a Voronoi), shaded as a cushion; the joints deep
  const stone = (wx: number, y: number, seed: number): string => {
    let best = 1e9;
    let second = 1e9;
    let bk = 0;
    let bdx = 0;
    let bdy = 0;
    const gx0 = Math.floor(wx / 7);
    const gy0 = Math.floor(y / 6);
    for (let gy = gy0 - 1; gy <= gy0 + 1; gy++)
      for (let gx = gx0 - 1; gx <= gx0 + 1; gx++) {
        const k = ihash(gx, gy, seed);
        const cx = gx * 7 + (k % 5) + 1;
        const cy = gy * 6 + ((k >>> 4) % 4) + 1;
        const sx = 1 + ((k >>> 8) % 3) * 0.25;
        const dx = (wx - cx) / sx;
        const dy = y - cy;
        const d = dx * dx + dy * dy * 1.3;
        if (d < best) {
          second = best;
          best = d;
          bk = k;
          bdx = dx;
          bdy = dy;
        } else if (d < second) second = d;
      }
    const edge = Math.sqrt(second) - Math.sqrt(best);
    if (edge < 1.1) return (bk >>> 5) % 6 === 0 ? '#3A5A3A' : '#3A3830';
    const base = bk % 3 === 0 ? '#B8B4AA' : bk % 3 === 1 ? '#9A968C' : '#A8A296';
    if ((bk >>> 11) % 9 === 0 && bdy > 0) return '#6A8A5A';
    const lit = bdx + bdy;
    if (lit < -2.2) return mix(base, '#E8E4D8', 0.5);
    if (edge < 2 || lit > 2.2) return mix(base, '#5A564E', 0.45);
    return base;
  };
  // the top of the wall seen from above: the cap stones, the hill's grass lipping over
  for (let y = 0; y < top; y++)
    for (let x = 0; x < W; x++) {
      const lip = 5 + (ihash(wx0 + x, ty, 3341) % 4);
      let c = stone(wx0 + x, y + 200, 3347);
      if (y < lip) c = (x + y) & 1 ? '#7AA85A' : '#4A7A3A';
      else if (y === lip && ihash(wx0 + x, ty, 3349) % 3 === 0) c = '#9BCB6B';
      if (y === top - 1) c = '#E8E4D8';
      p.set(x, y, c);
    }
  // the face: round sea stones packed in courses, the joints deep
  for (let y = 0; y < FACE; y++)
    for (let x = 0; x < W; x++) {
      let c = stone(wx0 + x, y, 3343);
      if (y >= FACE - 2) c = y === FACE - 1 ? P.ink : '#3A3830';
      // grass hanging over the face here and there
      if (y < (ihash(wx0 + x, ty, 3351) % 5) - 2) c = (x & 1) ? '#7AA85A' : '#4A7A3A';
      p.set(x, top + y, c);
    }
  void m;
  return { img: p.toCanvas(), ox: 0, oy: 16 - p.h, shadow: FACE };
}

// ---------------------------------------------------------------- entry

const cache = new Map<string, CellArt>();
const C3_MATS = new Set(['hedge|c3_matsu', 'hedge|c3_iwa', 'hedge|c3_tetra', 'wall|c3_ishigaki']);

export function isC3Mat(kind: string, mat: string): boolean {
  return C3_MATS.has(kind + '|' + mat);
}

/** Chapter-3 woods and rocks are y-sorted crowds per cell in HD-2D too (walls.ts card()). */
export const C3_WOODS = ['c3_matsu', 'c3_iwa', 'c3_tetra'];

export function c3StructureCell(kind: string, mat: string, tx: number, ty: number, m: CellMask): CellArt {
  const key = `${kind}|${mat}|${tx},${ty}|${+m.n}${+m.s}${+m.e}${+m.w}`;
  let a = cache.get(key);
  if (a) return a;
  if (mat === 'c3_matsu') a = matsuCell(tx, ty, m);
  else if (mat === 'c3_iwa') a = rockCell(tx, ty, m);
  else if (mat === 'c3_tetra') a = tetraCell(tx, ty, m);
  else a = ishigakiCell(tx, ty, m);
  cache.set(key, a);
  return a;
}
