// Walls, hedges, fences and guardrails drawn per cell from world-space
// patterns (so courses, boards and leaf clumps run on across cells), with
// junction handling from the 4-neighbour mask. Each cell sprite stands on the
// bottom edge of its tile: the front face rises `h` px, the top cap sits above.

import { PixelCanvas, rgba32 } from '../../engine/pixel';
import { ihash, valueNoise } from './noise';
import { P } from './palette';

export interface CellMask {
  n: boolean;
  s: boolean;
  e: boolean;
  w: boolean;
}

export interface CellArt {
  img: HTMLCanvasElement;
  /** Draw offset from the tile's top-left. */
  ox: number;
  oy: number;
  /** Height for the long shadow (0 = none). */
  shadow: number;
}

interface Mat {
  /** Face height above the tile bottom. */
  h: number;
  /** Cap (top) thickness for horizontal runs. */
  cap: number;
  /** Width of the cap for vertical runs. */
  vw: number;
  face(x: number, y: number, fy: number, fh: number): string | null;
  top(x: number, y: number, edge: 'n' | 's' | 'w' | 'e' | null): string | null;
}

const cache = new Map<string, CellArt>();

function mkFace(fn: Mat['face']): Mat['face'] {
  return fn;
}

// ---- materials ---------------------------------------------------------------

function blockFace(opts: { flower?: boolean; old?: boolean; low?: number; stain?: boolean }): Mat['face'] {
  return (x, y, fy, fh) => {
    // fy: 0 = top of the face, fh = face height
    const low = opts.low ?? 0;
    if (low && fy < fh - low) {
      // aluminium fence above a low block base
      const ly = fy;
      if (ly === 0 || ly === 1) return ly === 0 ? P.white : P.concrete;
      if (ly === fh - low - 2) return P.concrete;
      const px = ((x % 4) + 4) % 4;
      if (px === 0) return P.concreteLt;
      if (px === 1) return P.steel;
      return null; // see-through
    }
    const course = Math.floor(fy / 4);
    const ly = fy % 4;
    const off = course % 2 ? 4 : 0;
    const bx = Math.floor((x + off) / 8);
    const lx = (((x + off) % 8) + 8) % 8;
    const hh = ihash(bx, course + Math.floor(y / 64) * 7, opts.old ? 71 : 61);
    // flower openwork blocks on the top course every 4th block
    if (opts.flower && course === 0 && bx % 4 === 1) {
      if (lx === 7 || ly === 3) return P.steel;
      const cx = lx - 3;
      const cy = ly - 1;
      if ((cx === 0 || cx === 1) && (cy === 0 || cy === 1)) return P.concreteLt;
      if ((Math.abs(cx) <= 2 && cy >= -1 && cy <= 2) && (lx + ly) % 2 === 0) return P.charcoal;
      return P.concrete;
    }
    if (lx === 7 || ly === 3) return opts.old && hh % 5 === 0 ? P.asphalt : P.steel; // mortar
    let base: string = hh % 6 === 0 ? P.concreteLt : hh % 7 === 0 ? P.steel : P.concrete;
    if (opts.old && hh % 3 === 0) base = P.steel;
    if (ly === 0 && lx < 6) base = base === P.steel ? P.concrete : P.concreteLt;
    // rain streaks (vertical) and moss at the foot
    const streak = valueNoise(x / 3, 0.5, opts.old ? 9 : 5);
    if (opts.stain !== false && streak > 0.72 && fy > 3 && ly !== 0) base = P.steel;
    if (fy >= fh - 3 && valueNoise(x / 4, y / 16, 13) > 0.52) base = fy === fh - 1 ? P.leafDeep : P.leaf;
    if (opts.old && ihash(bx, course, 77) % 23 === 0 && lx === 3) base = P.charcoal; // crack
    return base;
  };
}

const MATS: Record<string, Mat> = {
  block: {
    h: 18,
    cap: 4,
    vw: 6,
    face: blockFace({}),
    top: (x, _y, e) => (e === 'n' || e === 'w' ? P.white : e === 's' ? P.steel : (x & 7) === 7 ? P.concrete : P.concreteLt),
  },
  block_flower: {
    h: 18,
    cap: 4,
    vw: 6,
    face: blockFace({ flower: true }),
    top: (x, _y, e) => (e === 'n' || e === 'w' ? P.white : e === 's' ? P.steel : (x & 7) === 7 ? P.concrete : P.concreteLt),
  },
  block_old: {
    h: 16,
    cap: 4,
    vw: 6,
    face: blockFace({ old: true }),
    top: (x, y, e) => (e === 'n' || e === 'w' ? P.concreteLt : e === 's' ? P.asphalt : ihash(x >> 2, y >> 2, 3) % 5 === 0 ? P.leaf : P.concrete),
  },
  block_low: {
    h: 18,
    cap: 3,
    vw: 5,
    face: blockFace({ low: 8 }),
    top: (_x, _y, e) => (e === 'n' || e === 'w' ? P.white : e === 's' ? P.steel : P.concreteLt),
  },
  yakisugi: {
    h: 20,
    cap: 3,
    vw: 5,
    face: mkFace((x, y, fy, fh) => {
      const board = Math.floor(x / 4);
      const lx = ((x % 4) + 4) % 4;
      const isNew = ihash(board, Math.floor(y / 64), 91) % 13 === 0;
      if (lx === 3) return isNew ? P.woodDark : P.ink;
      if (fy === 0 || fy === 1) return isNew ? P.woodLt : P.steel;
      if (fy === fh - 1) return P.ink;
      // charred texture (scaly bands)
      const g = valueNoise(board * 3.1, fy / 2.2, 17);
      if (isNew) return lx === 0 ? P.woodLt : g > 0.6 ? P.woodDark : P.wood;
      if (lx === 0) return P.asphalt;
      return g > 0.62 ? P.asphalt : P.charcoal;
    }),
    top: (_x, _y, e) => (e === 's' ? P.ink : P.asphalt),
  },
  stone: {
    h: 20,
    cap: 4,
    vw: 6,
    face: mkFace((x, y, fy) => {
      // irregular stones: jittered cells
      const row = Math.floor(fy / 5);
      const ly = fy % 5;
      const off = (ihash(0, row, 31) % 6);
      const bx = Math.floor((x + off) / 7);
      const lx = (((x + off) % 7) + 7) % 7;
      const hh = ihash(bx, row + (y >> 4) * 11, 33);
      if (lx === 6 || ly === 4) return hh % 4 === 0 ? P.leafDeep : P.charcoal;
      if (lx === 0 || ly === 0) return P.concrete;
      if (hh % 11 === 0 && lx === 3 && ly === 2) return P.white; // chalk arrow dot
      return hh % 3 === 0 ? P.asphalt : P.steel;
    }),
    top: (_x, _y, e) => (e === 'n' || e === 'w' ? P.concrete : e === 's' ? P.charcoal : P.steel),
  },
  plaster: {
    h: 18,
    cap: 4,
    vw: 6,
    face: mkFace((x, _y, fy, fh) => {
      if (fy === 0) return P.concreteLt;
      if (fy >= fh - 2) return fy === fh - 1 ? P.steel : P.concrete;
      const n = valueNoise(x / 5, fy / 7, 41);
      return n > 0.74 ? P.concreteLt : P.white;
    }),
    top: (_x, _y, e) => (e === 's' ? P.concrete : P.maroon),
  },
};

// ---- hedges ------------------------------------------------------------------------

type HedgeKind = 'tsuge' | 'satsuki' | 'kaname' | 'tsutsuji' | 'reeds';

function hedgePalette(k: HedgeKind): { lt: string; mid: string; dk: string; deep: string; accent?: string } {
  switch (k) {
    case 'kaname':
      return { lt: P.leafYoung, mid: P.leafDeep, dk: P.leafShade, deep: P.ink, accent: P.sunShade };
    case 'satsuki':
      return { lt: P.leafYoung, mid: P.leaf, dk: P.leafDeep, deep: P.leafShade, accent: P.crimson };
    case 'tsutsuji':
      return { lt: P.leaf, mid: P.leafDeep, dk: P.leafShade, deep: P.ink, accent: P.peach };
    case 'reeds':
      return { lt: P.leafLt, mid: P.leafYoung, dk: P.leaf, deep: P.leafDeep, accent: P.goldPale };
    default:
      return { lt: P.leafYoung, mid: P.leaf, dk: P.leafDeep, deep: P.leafShade };
  }
}

/** Hedge mass: a lumpy volume, lit from the upper left, darker at the foot. */
function hedgeCell(kind: HedgeKind, tx: number, ty: number, m: CellMask): CellArt {
  const H = kind === 'reeds' ? 14 : 12;
  const W = 16;
  const h = 16 + H;
  const p = new PixelCanvas(W, h);
  const pal = hedgePalette(kind);
  const wx0 = tx * 16;
  const wy0 = ty * 16 + 16 - h; // world y of canvas top
  // the mass: occupies the tile, raised by H; edges bulge with noise
  for (let y = 0; y < h; y++)
    for (let x = 0; x < W; x++) {
      const wx = wx0 + x;
      const wy = wy0 + y;
      // top surface region: from y=0 to 16 (raised tile), front face from 16..h
      const bump = valueNoise(wx / 4, wy / 4, 91) * 3;
      const topEdge = m.n ? -2 : 1 + bump; // north edge lumpy
      if (y < topEdge) continue;
      const leftIn = m.w ? -1 : 1 + valueNoise(wx / 3, wy / 5, 92) * 2;
      const rightIn = m.e ? W + 1 : W - 1 - valueNoise(wx / 3, wy / 5, 93) * 2;
      if (x < leftIn || x > rightIn) continue;
      const isFace = !m.s && y >= 16 - 2;
      let col: string;
      // leaf clumps: 4px cells with a lit upper-left and a shaded lower-right
      const cx = Math.floor((wx + (Math.floor(wy / 4) % 2) * 2) / 4);
      const cy = Math.floor(wy / 4);
      const lx = ((wx + (Math.floor(wy / 4) % 2) * 2) % 4 + 4) % 4;
      const ly = ((wy % 4) + 4) % 4;
      const hh = ihash(cx, cy, 95);
      if (kind === 'reeds') {
        const blade = ((wx * 3 + (hh & 7)) % 5 === 0);
        col = blade ? (ly < 2 ? pal.lt : pal.mid) : pal.dk;
        if (hh % 17 === 0 && ly === 0) col = pal.accent!;
        if (isFace && y > h - 4) col = pal.deep;
      } else if (isFace) {
        const depth = (y - 14) / (h - 14);
        col = lx + ly <= 1 && depth < 0.6 ? pal.mid : depth > 0.75 ? pal.deep : pal.dk;
        if (lx === 0 && ly === 0 && hh % 3 === 0 && depth < 0.5) col = pal.lt;
      } else {
        col = lx + ly <= 1 ? pal.lt : lx + ly >= 5 ? pal.dk : pal.mid;
        if (hh % 5 === 0 && lx === 1 && ly === 1) col = pal.lt;
        if (y > 13 && !m.s) col = lx + ly >= 4 ? pal.dk : pal.mid;
      }
      if (pal.accent && kind !== 'reeds' && hh % 29 === 0 && lx === 1 && ly === 1) col = pal.accent;
      if (kind === 'kaname' && !isFace && y < 6 && hh % 3 === 0 && lx <= 1 && ly <= 1) col = pal.accent!;
      p.set(x, y, col);
    }
  // lumpy outline: darker rim on the south/east side of the mass
  const src = p.data.slice();
  const op = (x: number, y: number) => x >= 0 && y >= 0 && x < W && y < h && src[y * W + x] >>> 24 !== 0;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < W; x++) {
      if (!op(x, y)) continue;
      if (!op(x, y + 1) && y + 1 < h) p.set(x, y, pal.deep);
      else if (!op(x + 1, y) && x + 1 < W && !m.e) p.set(x, y, pal.dk);
      else if (!op(x, y - 1) && y > 0 && !m.n) p.set(x, y, P.leafLt);
    }
  // foot shadow line
  if (!m.s) for (let x = 0; x < W; x++) if (op(x, h - 1)) p.set(x, h - 1, P.ink);
  return { img: p.toCanvas(), ox: 0, oy: 16 - h, shadow: m.s ? 0 : H };
}

// ---- fences --------------------------------------------------------------------------

function fenceCell(kind: string, tx: number, ty: number, m: CellMask): CellArt {
  const W = 16;
  if (kind === 'rope') {
    // tiger rope between short stakes
    const h = 16 + 8;
    const p = new PixelCanvas(W, h);
    const base = h - 3;
    const stake = (x: number) => {
      p.vline(x, base - 11, base, P.wood);
      p.vline(x + 1, base - 11, base, P.woodDark);
      p.set(x, base - 11, P.woodLt);
    };
    if (!m.w || tx % 2 === 0) stake(1);
    for (let x = 0; x < W; x++) {
      const sag = Math.round(Math.sin(((x + (m.w ? 0 : 1)) / 16) * Math.PI) * 2);
      const y = base - 9 + sag;
      p.set(x, y, ((x + tx * 16) >> 1) % 2 ? P.gold : P.ink);
      p.set(x, y + 1, ((x + tx * 16) >> 1) % 2 ? P.brass : P.night);
    }
    return { img: p.toCanvas(), ox: 0, oy: 16 - h, shadow: 0 };
  }
  if (kind === 'railfence') {
    // wooden railway fence (N–S): posts with two rails seen from above + weeds
    const h = 16 + 10;
    const p = new PixelCanvas(W, h);
    const cx = 7;
    for (let y = 0; y < h - 10; y++) {
      p.set(cx, y, P.woodLt);
      p.set(cx + 1, y, P.wood);
      p.set(cx + 2, y, P.woodDark);
    }
    if (ty % 2 === 0) {
      p.rect(cx - 1, 2, 5, 3, P.wood);
      p.hline(cx - 1, cx + 3, 2, P.woodLt);
      p.hline(cx - 1, cx + 3, 4, P.woodDark);
    }
    if (!m.s) {
      for (let y = h - 10; y < h; y++) {
        p.set(cx, y, P.wood);
        p.set(cx + 1, y, P.woodDark);
        p.set(cx + 2, y, P.ink);
      }
    }
    // weeds at the foot
    for (let i = 0; i < 4; i++) {
      const wx = (ihash(tx, ty * 4 + i, 5) % 14) + 1;
      const wy = h - 10 - (ihash(tx, ty * 4 + i, 6) % 12);
      p.set(wx, wy, P.leaf);
      p.set(wx, wy - 1, P.leafYoung);
    }
    return { img: p.toCanvas(), ox: 0, oy: 16 - h, shadow: 0 };
  }
  // mesh fence (parking lot): E–W, 20px tall, posts every 32px
  const H = 22;
  const h = 16 + H - 12;
  const p = new PixelCanvas(W, h + 12);
  const hh = h + 12;
  const base = hh - 2;
  const top = base - H;
  for (let x = 0; x < W; x++) {
    const wx = tx * 16 + x;
    for (let y = top + 2; y < base; y++) {
      const d1 = ((wx + y) % 4 + 4) % 4 === 0;
      const d2 = ((wx - y) % 4 + 4) % 4 === 0;
      if (d1 || d2) p.set(x, y, d1 && d2 ? P.concreteLt : P.steel);
    }
    p.set(x, top, P.concreteLt);
    p.set(x, top + 1, P.steel);
    p.set(x, base, P.asphalt);
  }
  if (tx % 2 === 0 || !m.w) {
    p.vline(2, top - 1, base, P.concreteLt);
    p.vline(3, top - 1, base, P.asphalt);
  }
  if (!m.e) {
    p.vline(14, top - 1, base, P.concreteLt);
    p.vline(15, top - 1, base, P.asphalt);
  }
  // weeds creeping up the mesh
  for (let i = 0; i < 3; i++) {
    const wx = ihash(tx, i, 7) % 16;
    const hgt = 2 + (ihash(tx, i, 8) % 5);
    for (let k = 0; k < hgt; k++) p.set(wx + (k % 2), base - 1 - k, k === hgt - 1 ? P.leafYoung : P.leaf);
  }
  void ty;
  return { img: p.toCanvas(), ox: 0, oy: 16 - hh, shadow: 0 };
}

function guardrailCell(tx: number, ty: number, m: CellMask): CellArt {
  // white W-beam rail on posts, facing south; the canal is beyond
  const W = 16;
  const hh = 16 + 6;
  const p = new PixelCanvas(W, hh);
  const base = hh - 3;
  const dent = ihash(tx, ty, 13) % 9 === 0;
  // posts every 32px
  if (tx % 2 === 0 || !m.w) {
    p.vline(3, base - 12, base, P.white);
    p.vline(4, base - 12, base, P.steel);
    p.set(3, base - 12, P.glint);
  }
  for (let x = 0; x < W; x++) {
    const d = dent && x > 4 && x < 12 ? 1 : 0;
    p.set(x, base - 11 + d, P.glint);
    p.set(x, base - 10 + d, P.white);
    p.set(x, base - 9 + d, P.concrete);
    p.set(x, base - 8 + d, P.white);
    p.set(x, base - 7 + d, P.concreteLt);
    p.set(x, base - 6 + d, P.steel);
    if ((x + tx * 16) % 16 === 9) {
      p.set(x, base - 9 + d, P.steel); // bolt
    }
  }
  // grass tufts at the foot
  for (let i = 0; i < 3; i++) {
    const wx = ihash(tx, i, 17) % 15;
    p.set(wx, base, P.leafYoung);
    p.set(wx + 1, base, P.leaf);
    p.set(wx, base + 1, P.leaf);
  }
  return { img: p.toCanvas(), ox: 0, oy: 16 - hh, shadow: 12 };
}

// ---- walls -----------------------------------------------------------------------------

function wallCell(matId: string, tx: number, ty: number, m: CellMask): CellArt {
  const mat = MATS[matId] ?? MATS.block;
  const H = mat.h;
  const W = 16;
  const hh = 16 + H + mat.cap;
  const p = new PixelCanvas(W, hh);
  const baseY = hh; // bottom of canvas = tile bottom
  const faceTop = baseY - H;
  const vertical = m.s || (m.n && !m.e && !m.w);
  const vx0 = Math.floor((W - mat.vw) / 2);
  const vx1 = vx0 + mat.vw - 1;
  const wx0 = tx * 16;
  const put = (x: number, y: number, c: string | null) => {
    if (c) p.set(x, y, c);
  };
  // horizontal part (E–W run or isolated): cap + face across the tile
  const horiz = m.e || m.w || !vertical;
  if (horiz) {
    const x0 = m.w ? 0 : vertical ? vx0 : 1;
    const x1 = m.e ? W - 1 : vertical ? vx1 : W - 2;
    if (!m.s) {
      for (let y = 0; y < H; y++)
        for (let x = x0; x <= x1; x++) put(x, faceTop + y, mat.face(wx0 + x, ty * 16, y, H));
      // face side edges at run ends
      if (!m.w) for (let y = faceTop; y < baseY; y++) if (p.alpha(x0, y)) p.set(x0, y, P.white);
      if (!m.e) for (let y = faceTop; y < baseY; y++) if (p.alpha(x1, y)) p.set(x1, y, P.asphalt);
    }
    // cap
    for (let c = 0; c < mat.cap; c++)
      for (let x = x0; x <= x1; x++) {
        const edge = c === 0 ? 'n' : c === mat.cap - 1 ? 's' : x === x0 && !m.w ? 'w' : null;
        put(x, faceTop - mat.cap + c, mat.top(wx0 + x, ty * 16 + c, edge));
      }
  }
  // vertical part: cap strip through the tile (raised by H)
  if (vertical || m.n || m.s) {
    const top = m.n ? 0 : faceTop - mat.cap;
    const bottom = m.s ? hh : faceTop; // continues into the next cell
    for (let y = Math.max(0, top - H); y < bottom; y++) {
      const yy = y;
      if (yy < 0 || yy >= hh) continue;
      for (let x = vx0; x <= vx1; x++) {
        const edge = x === vx0 ? 'w' : x === vx1 ? 's' : null;
        put(x, yy, mat.top(wx0 + x, ty * 16 + yy, edge));
      }
    }
    if (!m.s) {
      // end face of a vertical run
      for (let y = 0; y < H; y++) for (let x = vx0; x <= vx1; x++) put(x, faceTop + y, mat.face(wx0 + x, ty * 16, y, H));
      for (let y = faceTop; y < baseY; y++) {
        p.set(vx0, y, P.white);
        p.set(vx1, y, P.asphalt);
      }
    }
  }
  // clear the raised strip above the vertical cap when this cell has a north neighbour
  // (the north cell's own sprite draws it)
  // ink foot line
  for (let x = 0; x < W; x++) if (p.alpha(x, hh - 1)) p.set(x, hh - 1, P.charcoal);
  return { img: p.toCanvas(), ox: 0, oy: 16 - hh, shadow: horiz && !m.s ? H : 0 };
}

export function structureCell(kind: string, mat: string, tx: number, ty: number, m: CellMask): CellArt {
  const key = `${kind}|${mat}|${tx},${ty}|${+m.n}${+m.s}${+m.e}${+m.w}`;
  let a = cache.get(key);
  if (a) return a;
  if (kind === 'hedge') a = hedgeCell(mat as HedgeKind, tx, ty, m);
  else if (kind === 'fence') a = fenceCell(mat, tx, ty, m);
  else if (kind === 'guardrail') a = guardrailCell(tx, ty, m);
  else a = wallCell(mat, tx, ty, m);
  cache.set(key, a);
  return a;
}

export const _unused = rgba32;
