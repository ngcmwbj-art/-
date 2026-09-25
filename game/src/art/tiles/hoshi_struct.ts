// Chapter 2 structures from the ASCII layer (52_ch2_level_art 7.1): the
// cedar forest of the north mountain and the hill path (杉林), the bamboo
// on the west slope (竹), the round-crowned mixed woods to the east and south
// (雑木), the kuzu thickets of the abandoned fields (クズ), the dry-stone
// retaining wall of the east terrace (野面積みの石垣), the animal net on
// the west slope (獣害ネット), the two-wire electric fence (電気柵) and the
// log fence round the hill top (丸太の柵).
//
// Like the town's hedges these are y-sorted cell sprites whose pattern is
// placed in world space, so runs flow on from cell to cell and never repeat.

import { PixelCanvas } from '../../engine/pixel';
import { ihash, valueNoise } from './noise';
import { P } from './palette';
import type { CellArt, CellMask } from './structures';

const W = 16;

/** World-space tree centres on a jittered grid (x step, y step, seed) near a cell. */
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

/** Can a tree stand at world px (x, y)? (its base must be on a cell of the same structure). */
type Inside = (wx: number, wy: number) => boolean;

// ---------------------------------------------------------------- cedar (杉)

/**
 * Open tiles (not wood) of the map a downhill wood (`sugi_down`) belongs to.
 * The hill (map_hoshi_hill) is a hilltop with the path winding up through the
 * cedars: seen from there, the wood south of the plaza and of each turn of
 * the path falls away downhill, so its crowns never rise more than a few px
 * over the ground you walk on (the player is never lost behind a tree).
 */
let openAt: ((x: number, y: number) => boolean) | null = null;
export function setDownhillOpen(fn: (x: number, y: number) => boolean): void {
  openAt = fn;
  for (const k of [...cache.keys()]) if (k.includes('|sugi_down|')) cache.delete(k);
}

/** The highest world y a crown at column px x (half-width hw) may reach, standing in row ty. */
function crownLimit(x: number, hw: number, ty: number): number {
  if (!openAt) return -1e9;
  let lim = -1e9;
  for (const cx of [Math.floor((x - hw) / 16), Math.floor(x / 16), Math.floor((x + hw + 1) / 16)])
    for (let r = ty; r >= ty - 3; r--)
      if (openAt(cx, r)) {
        lim = Math.max(lim, (r + 1) * 16 - 5);
        break;
      }
  return lim;
}

function sugiCell(tx: number, ty: number, m: CellMask, inside: Inside, down = false): CellArt {
  const RISE = 38;
  const h = 16 + RISE;
  const p = new PixelCanvas(W, h);
  const wx0 = tx * 16;
  const wy0 = ty * 16 + 16 - h;
  // forest floor and deep shade inside the wood
  // downhill under open ground: the crowns' tips make the edge, the dark between them starts lower
  const lim = down ? crownLimit(tx * 16 + 8, 8, ty) - wy0 : -1e9;
  const openN = lim > -1e8;
  const floorTop = openN ? Math.max(0, lim + 7) : m.n ? 0 : RISE - 4;
  for (let y = floorTop; y < h; y++)
    for (let x = 0; x < W; x++) {
      const wy = wy0 + y;
      // a ragged top to the dark under the downhill crowns
      if (openN && y < floorTop + 4 && ihash(wx0 + x, 0, 17) % 5 < floorTop + 4 - y - 1) continue;
      const edgeS = !m.s && y > h - 5;
      p.set(x, y, edgeS ? (ihash(wx0 + x, wy, 3) % 3 ? P.leafShade : P.woodDark) : ihash((wx0 + x) >> 1, wy >> 1, 5) % 6 === 0 ? P.leafShade : P.night);
    }
  const trees = gridPoints(tx, ty, 7, 6, 811, 10).filter((t) => inside(t.x, t.y));
  for (const t of trees) {
    const tall = 24 + (t.h >>> 4) % 12;
    const half = 5 + ((t.h >>> 9) % 3);
    const bx = t.x - wx0;
    let by = t.y - wy0;
    // downhill: a crown that would rise over open ground sinks (its trunk further down the slope, unseen)
    let sunk = false;
    if (down) {
      const lim = crownLimit(t.x, half, ty) - wy0 + ((t.h >>> 18) % 7);
      if (by - 5 - tall < lim) {
        by = lim + 5 + tall;
        sunk = true;
      }
    }
    // trunk (visible under the lowest sprays)
    if (!sunk)
      for (let j = 0; j < 7; j++) {
        p.set(bx, by - j, j === 0 ? P.ink : P.woodDark);
        p.set(bx + 1, by - j, j === 0 ? P.ink : P.wood);
        if (j > 1 && (t.h >>> 14) & 1) p.set(bx - 1, by - j, P.ink);
      }
    // crown: stacked sprays, each tier a little triangle; lit from the left
    const top = by - 5 - tall;
    for (let y = top; y <= by - 5; y++) {
      const k = (y - top) / tall; // 0 at the tip
      const tier = (y - top) % 4;
      let hw = Math.round(half * k + (tier === 3 ? 1 : tier === 0 ? -0.4 : 0));
      if (y - top < 2) hw = 0;
      for (let x = bx - hw; x <= bx + 1 + hw; x++) {
        const u = (x - (bx - hw)) / Math.max(1, hw * 2 + 1);
        let c: string = u < 0.32 ? P.leafDeep : u > 0.7 ? P.night : P.leafShade;
        if (tier === 3 && u < 0.5) c = P.leaf; // the lit lip of each spray
        if (tier === 0 && u > 0.35) c = P.ink;
        if (y === top) c = P.leaf;
        p.set(x, y, c);
      }
    }
  }
  // the edge of the wood: a lit rim along the south silhouette, dark east rims
  if (!m.s)
    for (let x = 0; x < W; x++) if (p.alpha(x, h - 1)) p.set(x, h - 1, P.ink);
  return { img: p.toCanvas(), ox: 0, oy: 16 - h, shadow: 0 };
}

// ---------------------------------------------------------------- bamboo (竹)

function takeCell(tx: number, ty: number, m: CellMask, inside: Inside): CellArt {
  const RISE = 36;
  const h = 16 + RISE;
  const p = new PixelCanvas(W, h);
  const wx0 = tx * 16;
  const wy0 = ty * 16 + 16 - h;
  const floorTop = m.n ? 0 : RISE - 6;
  for (let y = floorTop; y < h; y++) for (let x = 0; x < W; x++) p.set(x, y, ihash((wx0 + x) >> 1, (wy0 + y) >> 1, 7) % 5 === 0 ? P.leafShade : P.night);
  const culms = gridPoints(tx, ty, 4, 5, 821, 6).filter((t) => inside(t.x, t.y));
  for (const t of culms) {
    const tall = 26 + (t.h >>> 4) % 12;
    const bx = t.x - wx0;
    const by = t.y - wy0;
    const lean = ((t.h >>> 10) % 3) - 1;
    for (let j = 0; j < tall; j++) {
      const x = bx + Math.round(lean * (j / tall) * 2);
      const y = by - j;
      const node = (j + (t.h & 3)) % 6 === 0;
      p.set(x, y, node ? P.leafDeep : j < 3 ? P.leafShade : P.leafYoung);
      p.set(x + 1, y, node ? P.leafShade : j < 3 ? P.night : P.leaf);
      if (node && j > 8) {
        // a twig with leaves
        const d = (j >> 1) & 1 ? 1 : -1;
        p.set(x + (d > 0 ? 2 : -1), y - 1, P.leaf);
        p.set(x + (d > 0 ? 3 : -2), y - 1, P.leafDeep);
        p.set(x + (d > 0 ? 3 : -2), y - 2, P.leafYoung);
      }
    }
    // the feathery top
    const tx2 = bx + lean * 2;
    const ty2 = by - tall;
    for (let k = 0; k < 7; k++) {
      const hh = ihash(k, t.h, 823);
      const lx = tx2 + (hh % 7) - 3;
      const ly = ty2 + ((hh >>> 4) % 6) - 1;
      p.set(lx, ly, (hh >>> 8) % 3 === 0 ? P.leafYoung : P.leaf);
      p.set(lx + ((hh >>> 12) & 1 ? 1 : -1), ly + 1, P.leafDeep);
    }
  }
  if (!m.s) for (let x = 0; x < W; x++) if (p.alpha(x, h - 1)) p.set(x, h - 1, P.ink);
  return { img: p.toCanvas(), ox: 0, oy: 16 - h, shadow: 0 };
}

// ---------------------------------------------------------------- mixed woods (雑木)

function zokiCell(tx: number, ty: number, m: CellMask, inside: Inside): CellArt {
  const RISE = 30;
  const h = 16 + RISE;
  const p = new PixelCanvas(W, h);
  const wx0 = tx * 16;
  const wy0 = ty * 16 + 16 - h;
  const floorTop = m.n ? 0 : RISE - 2;
  for (let y = floorTop; y < h; y++) for (let x = 0; x < W; x++) p.set(x, y, ihash((wx0 + x) >> 1, (wy0 + y) >> 1, 9) % 5 === 0 ? P.leafShade : P.night);
  const trees = gridPoints(tx, ty, 9, 7, 831, 11).filter((t) => inside(t.x, t.y));
  for (const t of trees) {
    const bx = t.x - wx0;
    const by = t.y - wy0;
    const r = 6 + ((t.h >>> 4) % 4);
    const cy = by - 8 - r;
    // trunk
    for (let j = 0; j < 9; j++) {
      p.set(bx, by - j, j === 0 ? P.ink : P.woodDark);
      p.set(bx + 1, by - j, j === 0 ? P.ink : j > 5 ? P.woodDark : P.wood);
    }
    // crown: a few overlapping round clumps, lit upper-left
    const blobs = 3 + ((t.h >>> 8) % 2);
    for (let b = 0; b < blobs; b++) {
      const hh = ihash(b, t.h, 833);
      const ox = ((hh % 7) - 3) * (b ? 1 : 0);
      const oy = (((hh >>> 4) % 5) - 2) * (b ? 1 : 0);
      const rr = b === 0 ? r : r - 2 - ((hh >>> 8) % 2);
      for (let y = -rr; y <= rr; y++)
        for (let x = -rr; x <= rr; x++) {
          const d = (x * x + y * y) / (rr * rr);
          if (d > 1) continue;
          const lit = x + y;
          let c: string = lit < -rr * 0.6 ? P.leafYoung : lit < 0 ? P.leaf : lit < rr * 0.6 ? P.leafDeep : P.leafShade;
          if (d > 0.82 && lit > 0) c = P.night;
          // leaf texture: little clumps
          if (ihash(bx + x + ox, cy + y + oy, 835) % 5 === 0) c = c === P.leafYoung ? P.leaf : c === P.leaf ? P.leafDeep : P.leafShade;
          p.set(bx + x + ox, cy + y + oy, c);
        }
    }
  }
  if (!m.s) for (let x = 0; x < W; x++) if (p.alpha(x, h - 1)) p.set(x, h - 1, P.ink);
  return { img: p.toCanvas(), ox: 0, oy: 16 - h, shadow: 0 };
}

// ---------------------------------------------------------------- low scrub (やぶ)

/**
 * The bank south of the siding (and other low edges): the tops of the trees
 * growing on the slope below the village and low scrub — round clumps that
 * rise only a few px, so the rails and the platform edge in front of them
 * stay in view.
 */
function yabuCell(tx: number, ty: number, m: CellMask, inside: Inside): CellArt {
  const RISE = 7;
  const h = 16 + RISE;
  const p = new PixelCanvas(W, h);
  const wx0 = tx * 16;
  const wy0 = ty * 16 + 16 - h;
  const floorTop = m.n ? 0 : RISE + 3;
  for (let y = floorTop; y < h; y++) for (let x = 0; x < W; x++) p.set(x, y, ihash((wx0 + x) >> 1, (wy0 + y) >> 1, 13) % 4 === 0 ? P.leafShade : P.night);
  const clumps = gridPoints(tx, ty, 6, 5, 851, 7).filter((t) => inside(t.x, t.y));
  for (const t of clumps) {
    const bx = t.x - wx0;
    const by = t.y - wy0;
    const r = 3 + ((t.h >>> 4) % 3);
    const cy = by - r + 2;
    for (let y = -r; y <= r; y++)
      for (let x = -r - 1; x <= r + 1; x++) {
        const d = (x * x) / ((r + 1) * (r + 1)) + (y * y) / (r * r);
        if (d > 1) continue;
        const lit = x * 0.5 + y;
        let c: string = lit < -r * 0.5 ? P.leaf : lit < r * 0.2 ? P.leafDeep : P.leafShade;
        if (ihash(bx + x, cy + y, 853) % 5 === 0) c = c === P.leaf ? P.leafDeep : P.leafShade;
        if (d > 0.8 && y > 0) c = P.night;
        p.set(bx + x, cy + y, c);
      }
    // the starlit top of the clump
    p.set(bx - 1, cy - r, P.leafYoung);
    p.set(bx, cy - r, P.leaf);
  }
  if (!m.s) for (let x = 0; x < W; x++) if (p.alpha(x, h - 1)) p.set(x, h - 1, P.ink);
  return { img: p.toCanvas(), ox: 0, oy: 16 - h, shadow: 0 };
}

// ---------------------------------------------------------------- kuzu (クズ)

/**
 * A heaped kuzu thicket: big three-lobed leaves overlapping, rising 12px
 * above the tile, a purple-red flower spike every other tile (it blooms at
 * the end of August), and now and then the shape of what it swallowed — a
 * post, a sapling — standing out of the mound.
 */
function kuzuCell(tx: number, ty: number, m: CellMask): CellArt {
  const RISE = 13;
  const h = 16 + RISE;
  const p = new PixelCanvas(W, h);
  const wx0 = tx * 16;
  const wy0 = ty * 16 + 16 - h;
  // an organic mound: the open edges wander in world space (continuous from
  // cell to cell), bulging where the kuzu has climbed something
  const nz = (a: number, b: number, seed: number) => valueNoise(a, b, seed);
  const topAt = (x: number) => (m.n ? -8 : RISE - 12 + Math.round(nz((wx0 + x) * 0.16, ty * 3.1, 841) * 9));
  const leftAt = (y: number) => (m.w ? -8 : 1 + Math.round(nz((wy0 + y) * 0.2, tx * 2.3, 842) * 5));
  const rightAt = (y: number) => (m.e ? W + 8 : W - 2 - Math.round(nz((wy0 + y) * 0.2, tx * 2.3 + 7, 844) * 5));
  const footAt = (x: number) => (m.s ? h + 8 : h - 1 - Math.round(nz((wx0 + x) * 0.22, ty * 1.7, 846) * 3));
  const inCore = (x: number, y: number) => x >= leftAt(y) && x <= rightAt(y) && y >= topAt(x) && y < Math.min(h, footAt(x));
  const yt = m.n ? -8 : RISE - 12;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < W; x++) if (inCore(x, y)) p.set(x, y, !m.s && y > footAt(x) - 4 ? P.ink : P.leafShade);
  // what the kuzu swallowed (a post or a sapling), 1 cell in 5
  const sw = ihash(tx, ty, 843);
  if (sw % 5 === 0 && !m.n) {
    const x = 4 + (sw >>> 4) % 8;
    for (let y = yt - 7; y < yt + 6; y++) {
      p.set(x, y, P.woodDark);
      if ((y & 3) === 0) p.set(x + 1, y, P.leafDeep);
    }
  }
  // leaves on a jittered 5px grid, back to front
  for (let gy = Math.floor((wy0 - 8) / 5); gy <= Math.floor((wy0 + h) / 5); gy++)
    for (let gx = Math.floor((wx0 - 8) / 5); gx <= Math.floor((wx0 + W + 8) / 5); gx++) {
      const hh = ihash(gx, gy, 845);
      const cx = gx * 5 + (hh % 3) - wx0;
      const cy = gy * 5 + ((hh >>> 3) % 3) - wy0;
      if (!inCore(cx, cy) && !inCore(cx, cy + 2)) continue;
      if (cy >= h - 1) continue;
      const face = !m.s && cy > footAt(Math.max(0, Math.min(W - 1, cx))) - 6;
      // three lobes: left, right, top, each a small round blob
      const lobes: [number, number][] = [[-2, 0], [2, 0], [0, -2]];
      for (const [lx, ly] of lobes)
        for (let y = -2; y <= 1; y++)
          for (let x = -2; x <= 2; x++) {
            if (x * x + y * y * 1.4 > 4.2) continue;
            const px = cx + lx + x;
            const py = cy + ly + y;
            if (py >= h - 1 || px < 0 || px >= W) continue;
            if (!m.s && py >= footAt(px)) continue;
            let c: string = x + y < -1 ? P.leaf : x + y > 1 ? P.leafShade : P.leafDeep;
            if (ly < 0 && y < 0 && x <= 0) c = P.leafYoung;
            if (face) c = c === P.leafYoung ? P.leaf : c === P.leaf ? P.leafDeep : P.leafShade;
            p.set(px, py, c);
          }
      // the leaf's central vein
      if (cy >= 0 && cy < h - 1) p.set(cx, cy, face ? P.leafShade : P.leafDeep);
    }
  // flower spikes (every other tile, on top)
  const fh = ihash(tx, ty, 847);
  if ((tx + ty) % 2 === 0 && fh % 3 !== 0) {
    const fx = 3 + (fh >>> 4) % 10;
    const fy = Math.max(1, yt - 1 + ((fh >>> 8) % 4));
    for (let j = 0; j < 6; j++) {
      const c = j < 2 ? P.lilac : j % 2 ? P.sunShade : P.crimson;
      p.set(fx, fy + j, c);
      if (j > 0 && j < 5) p.set(fx + ((j & 1) ? 1 : -1), fy + j, j < 3 ? P.lilac : P.sunShade);
    }
    p.set(fx, fy + 6, P.leafDeep);
  }
  // silhouette: lit top rim, ink foot at the south edge
  const src = p.data.slice();
  const op = (x: number, y: number) => x >= 0 && y >= 0 && x < W && y < h && src[y * W + x] >>> 24 !== 0;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < W; x++) if (op(x, y) && !op(x, y - 1) && !m.n && p.get(x, y) !== src[y * W + x]) p.set(x, y, P.leaf);
  if (!m.s)
    for (let x = 0; x < W; x++) {
      // the ink foot under the mound's south face, and the shade it throws
      let yb = h - 1;
      while (yb > 0 && !op(x, yb)) yb--;
      if (op(x, yb)) p.set(x, yb, P.ink);
    }
  return { img: p.toCanvas(), ox: 0, oy: 16 - h, shadow: 0 };
}

// ---------------------------------------------------------------- dry-stone wall (野面積み)

/**
 * The east terrace's retaining wall (x46): seen from above as a strip of
 * irregular field stones, the terrace grass lipping over its east edge, the
 * west edge dropping away in shade. Where a run ends to the south the wall's
 * face shows, stone courses 18px tall.
 */
function ishigakiCell(tx: number, ty: number, m: CellMask): CellArt {
  const FACE = m.s ? 0 : 18;
  const h = 16 + (m.s ? 0 : 2);
  const hh = h + FACE;
  const p = new PixelCanvas(W, hh);
  const wx0 = tx * 16;
  const wy0 = ty * 16 + 16 - hh;
  const stone = (x: number, y: number, seed: number): string => {
    // irregular stones on a jittered 6×5 grid
    const row = Math.floor(y / 5);
    const off = ihash(row, 0, seed) % 6;
    const cell = Math.floor((x + off) / 6);
    const lx = (x + off) - cell * 6;
    const ly = y - row * 5;
    const k = ihash(cell, row, seed + 1);
    if (lx === 5 || ly === 4) return (k >>> 5) % 4 === 0 ? P.leafShade : P.charcoal;
    let c: string = k % 3 === 0 ? P.concrete : k % 3 === 1 ? P.steel : P.asphalt;
    if (lx === 0 || ly === 0) c = c === P.asphalt ? P.steel : c === P.steel ? P.concrete : P.concreteLt;
    if (lx === 4 || ly === 3) c = c === P.concreteLt ? P.concrete : P.asphalt;
    if ((k >>> 9) % 11 === 0 && lx > 1) c = P.leafDeep; // moss
    return c;
  };
  // the top of the wall (the strip seen from above)
  for (let y = 0; y < h; y++)
    for (let x = 0; x < W; x++) {
      const wy = wy0 + y;
      let c = stone(wx0 + x, wy, 851);
      if (x <= 1) c = x === 0 ? P.charcoal : P.asphalt; // west edge falling away
      // the terrace grass lipping over the east edge
      const lip = 12 + Math.round(valueNoise(wy / 5, tx, 853) * 3);
      if (x >= lip) c = (x + wy) & 1 ? P.leaf : P.leafDeep;
      if (x === lip - 1 && ihash(x, wy, 855) % 3 === 0) c = P.leafYoung;
      p.set(x, y, c);
    }
  // the south face at the end of a run
  if (!m.s) {
    for (let y = 0; y < FACE; y++)
      for (let x = 0; x < W; x++) {
        let c = stone(wx0 + x + 3, y + 101, 857);
        if (y === 0) c = P.concreteLt;
        if (y >= FACE - 2) c = y === FACE - 1 ? P.ink : P.charcoal;
        // grass hanging over the face
        if (y < 1 + (ihash(x, ty, 859) % 4) && x > 8) c = (x & 1) ? P.leaf : P.leafDeep;
        p.set(x, h + y, c);
      }
  }
  void m.n;
  return { img: p.toCanvas(), ox: 0, oy: 16 - hh, shadow: 0 };
}

// ---------------------------------------------------------------- 獣害ネット

function juugaiCell(tx: number, _ty: number, m: CellMask): CellArt {
  const H = 16;
  const h = 16 + 8;
  const p = new PixelCanvas(W, h);
  const base = h - 3;
  const top = base - 12;
  for (let x = 0; x < W; x++) {
    const wx = tx * 16 + x;
    const sag = Math.round(Math.sin(((wx % 32) / 32) * Math.PI) * 2);
    const t = top + sag;
    for (let y = t; y <= base; y++) {
      const gx = (wx & 1) === 0;
      const gy = ((y - t) & 1) === 0;
      if (gx || gy) p.set(x, y, gx && gy ? P.leafDeep : P.leafShade);
    }
    p.set(x, t, P.leaf); // the top rope
    // the net's skirt pegged to the ground, grass through it
    p.set(x, base, ihash(wx, 0, 861) % 3 ? P.leafShade : P.leaf);
  }
  // FRP posts every 32px
  const posts: number[] = [];
  for (let x = 0; x < W; x++) if ((tx * 16 + x) % 32 === 6) posts.push(x);
  if (!m.w) posts.push(1);
  if (!m.e) posts.push(13);
  for (const x of posts) {
    p.vline(x, top - 3, base + 1, P.leafDeep);
    p.vline(x + 1, top - 3, base + 1, P.leafShade);
    p.set(x, top - 3, P.leafYoung);
  }
  // the bulge where something pushed at it (obj_hoshi_net at x4)
  if (tx === 4) for (let x = 5; x < 12; x++) p.set(x, base - 1 - ((x - 5) % 3 === 1 ? 1 : 0), P.leafDeep);
  void H;
  return { img: p.toCanvas(), ox: 0, oy: 16 - h, shadow: 0 };
}

// ---------------------------------------------------------------- 電気柵

/**
 * The two-wire electric fence against boar (20cm and 40cm: 3px and 6px),
 * white FRP posts every 32px (9px tall), black insulators where the wires
 * meet a post, the grass under it mown short. N–S runs (x36) read as posts
 * down a line with the two wires offset up by their heights.
 */
function efenceCell(tx: number, ty: number, m: CellMask): CellArt {
  const h = 16 + 10;
  const p = new PixelCanvas(W, h);
  const base = h - 4; // the fence's foot line (4px up from the tile's bottom)
  const vertical = (m.n || m.s) && !(m.e || m.w);
  const wire = P.concrete;
  const post = (x: number, y: number) => {
    p.vline(x, y - 9, y, P.white);
    p.vline(x + 1, y - 9, y, P.steel);
    p.set(x, y - 9, P.concreteLt);
    p.set(x + 1, y + 1, P.ink);
    // insulators
    p.set(x + 1, y - 3, P.ink);
    p.set(x + 1, y - 6, P.ink);
  };
  if (!vertical) {
    const x0 = m.w ? 0 : 2;
    const x1 = m.e ? W - 1 : 13;
    for (let x = x0; x <= x1; x++) {
      p.set(x, base - 3, wire);
      p.set(x, base - 6, wire);
      if (ihash(tx * 16 + x, 0, 871) % 9 === 0) p.set(x, base - 6, P.white);
    }
    const posts: number[] = [];
    for (let x = 0; x < W; x++) if ((tx * 16 + x) % 32 === 9) posts.push(x);
    if (!m.w) posts.push(2);
    if (!m.e) posts.push(12);
    for (const x of posts) post(x, base);
    // a vertical leg joining at a corner
    if (m.s) for (let y = base; y < h; y++) {
      p.set(7, y - 3, wire);
      p.set(9, y - 6, wire);
    }
    if (m.n) for (let y = 0; y < base; y++) {
      p.set(7, y - 3 + 3, wire);
      p.set(9, y - 6 + 6, wire);
    }
  } else {
    // N–S: the wires are two vertical lines (their heights offset them up), posts every 32px
    for (let y = 0; y < h; y++) {
      const wy = ty * 16 + 16 - h + y;
      if ((m.n || y >= 6) && (m.s || y <= base)) {
        p.set(7, y, wire);
        p.set(9, y, ihash(wy, 1, 873) % 11 === 0 ? P.white : wire);
      }
    }
    for (let y = 0; y < h; y++) if ((ty * 16 + 16 - h + y) % 32 === 20) post(7, Math.min(h - 2, y + 9));
    if (!m.s) post(7, base);
    if (!m.n) post(7, 11);
  }
  return { img: p.toCanvas(), ox: 0, oy: 16 - h, shadow: 0 };
}

// ---------------------------------------------------------------- 丸太の柵 (hill top)

function marutaCell(tx: number, ty: number, m: CellMask): CellArt {
  const h = 16 + 12;
  const p = new PixelCanvas(W, h);
  const vertical = (m.n || m.s) && !(m.e || m.w);
  const log = (x: number, y: number, len: number, horiz: boolean) => {
    for (let k = 0; k < len; k++) {
      if (horiz) {
        p.set(x + k, y, P.woodLt);
        p.set(x + k, y + 1, P.wood);
        p.set(x + k, y + 2, P.woodDark);
      } else {
        p.set(x, y + k, P.woodLt);
        p.set(x + 1, y + k, P.wood);
        p.set(x + 2, y + k, P.woodDark);
      }
    }
  };
  if (vertical) {
    // posts every 32px, two rails seen from above as two parallel logs
    log(5, m.n ? 0 : 8, h - (m.n ? 0 : 8) - (m.s ? 0 : 3), false);
    log(9, m.n ? 0 : 5, h - (m.n ? 0 : 5) - (m.s ? 0 : 6), false);
    for (let y = 0; y < h; y++)
      if ((ty * 16 + 16 - h + y) % 32 === 24 || (!m.s && y === h - 4) || (!m.n && y === 10)) {
        p.rect(6, y - 6, 4, 8, P.wood);
        p.vline(6, y - 6, y + 1, P.woodLt);
        p.hline(6, 9, y - 6, P.goldPale);
        p.vline(9, y - 5, y + 1, P.woodDark);
        p.hline(6, 9, y + 2, P.ink);
      }
  } else {
    log(0, h - 12, W, true);
    log(0, h - 7, W, true);
    if (tx % 2 === 0) {
      p.rect(6, h - 15, 3, 13, P.wood);
      p.vline(6, h - 15, h - 3, P.woodLt);
      p.hline(6, 8, h - 15, P.goldPale);
      p.hline(6, 8, h - 2, P.ink);
    }
  }
  return { img: p.toCanvas(), ox: 0, oy: 16 - h, shadow: 0 };
}

// ---------------------------------------------------------------- entry

const cache = new Map<string, CellArt>();

/** Materials this module draws: [kind, mat]. */
const H_MATS = new Set(['hedge|sugi', 'hedge|sugi_down', 'hedge|take', 'hedge|zoki', 'hedge|yabu', 'hedge|kuzu', 'wall|ishigaki', 'fence|juugai', 'fence|efence', 'fence|maruta']);

export function isHoshiMat(kind: string, mat: string): boolean {
  return H_MATS.has(kind + '|' + mat);
}

/** A chapter-2 structure cell (cached per position and neighbour mask). */
export function hoshiStructureCell(kind: string, mat: string, tx: number, ty: number, m: CellMask): CellArt {
  const key = `${kind}|${mat}|${tx},${ty}|${+m.n}${+m.s}${+m.e}${+m.w}`;
  let a = cache.get(key);
  if (a) return a;
  // trees stand only on cells of the wood (its neighbours in the row, by the mask)
  const inside: Inside = (wx) => {
    const cx = Math.floor(wx / 16);
    return cx < tx ? m.w : cx > tx ? m.e : true;
  };
  switch (mat) {
    case 'sugi':
      a = sugiCell(tx, ty, m, inside);
      break;
    case 'sugi_down':
      a = sugiCell(tx, ty, m, inside, true);
      break;
    case 'take':
      a = takeCell(tx, ty, m, inside);
      break;
    case 'zoki':
      a = zokiCell(tx, ty, m, inside);
      break;
    case 'yabu':
      a = yabuCell(tx, ty, m, inside);
      break;
    case 'kuzu':
      a = kuzuCell(tx, ty, m);
      break;
    case 'ishigaki':
      a = ishigakiCell(tx, ty, m);
      break;
    case 'juugai':
      a = juugaiCell(tx, ty, m);
      break;
    case 'maruta':
      a = marutaCell(tx, ty, m);
      break;
    default:
      a = efenceCell(tx, ty, m);
  }
  cache.set(key, a);
  return a;
}
