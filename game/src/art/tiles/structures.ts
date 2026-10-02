// Walls, hedges, fences and guardrails drawn per cell from world-space
// patterns (so courses, boards and leaf clumps run on across cells), with
// junction handling from the 4-neighbour mask. Each cell sprite stands on the
// bottom edge of its tile: the front face rises `h` px, the top cap sits above.

import { PixelCanvas, mix, rgba32 } from '../../engine/pixel';
import { ihash, valueNoise } from './noise';
import { P } from './palette';
import { hoshiStructureCell, isHoshiMat } from './hoshi_struct';

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
  /** Stage-2 variant (reeds leaning north-east, 8.4). */
  ne?: HTMLCanvasElement;
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

/**
 * Hedge mass (7.9: texture from clumps, never 1px noise): the cell's volume
 * is filled with overlapping leaf clumps (3–5px round tufts, 3 variants
 * chosen by hash) placed on a jittered world-space grid, lit from the upper
 * left. Clumps poke out of the top/side silhouette by 1–3px, the front face
 * is one step darker, and here and there a gap shows a branch, or a flower /
 * new shoot sits on top. World-space placement keeps runs seamless and never
 * repeats a pattern along a row.
 */
function hedgeCell(kind: HedgeKind, tx: number, ty: number, m: CellMask): CellArt {
  if (kind === 'reeds') return reedCell(tx, ty, m);
  const H = 12;
  const W = 16;
  const h = 16 + H;
  const p = new PixelCanvas(W, h);
  const pal = hedgePalette(kind);
  const wx0 = tx * 16;
  const wy0 = ty * 16 + 16 - h; // world y of canvas top
  const faceTop = 14; // canvas row where the front face begins (when !m.s)
  // core volume (clumps may bulge 1–3px out of it)
  const xl = m.w ? -8 : 3;
  const xr = m.e ? W + 8 : W - 4;
  const yt = m.n ? -8 : 4;
  const inCore = (x: number, y: number) => x >= xl && x <= xr && y >= yt && y < h;
  const mass = new Uint8Array(W * h);
  const col = new Array<string>(W * h);
  const setPx = (x: number, y: number, c: string) => {
    if (x < 0 || y < 0 || x >= W || y >= h) return;
    mass[y * W + x] = 1;
    col[y * W + x] = c;
  };
  // base fill of the core (deep shade between clumps)
  for (let y = 0; y < h; y++) for (let x = 0; x < W; x++) if (inCore(x, y)) setPx(x, y, y >= faceTop && !m.s ? pal.deep : pal.dk);
  // clumps on a jittered 4px world grid, drawn back (north) to front (south)
  const darker = (c: string) => (c === pal.lt ? pal.mid : c === pal.mid ? pal.dk : pal.deep);
  for (let gy = Math.floor((wy0 - 6) / 4); gy <= Math.floor((wy0 + h + 4) / 4); gy++)
    for (let gx = Math.floor((wx0 - 6) / 4); gx <= Math.floor((wx0 + W + 6) / 4); gx++) {
      const hh = ihash(gx, gy, 95 + (kind === 'kaname' ? 7 : kind === 'satsuki' ? 11 : 0));
      const cxw = gx * 4 + (hh % 3) - 1;
      const cyw = gy * 4 + ((hh >>> 3) % 3) - 1;
      const lx = cxw - wx0;
      const ly = cyw - wy0;
      // the clump's centre must lie in (or just outside) the core
      if (!(lx >= xl - 1 && lx <= xr + 1 && ly >= yt - 1 && ly < h - 1)) continue;
      const variant = (hh >>> 6) % 3; // 0 round 2.5, 1 small 2, 2 wide 3×2
      const rX = variant === 2 ? 2.6 : variant === 1 ? 1.8 : 2.3;
      const rY = variant === 2 ? 1.9 : variant === 1 ? 1.8 : 2.3;
      const face = !m.s && ly >= faceTop;
      for (let dy = -3; dy <= 3; dy++)
        for (let dx = -3; dx <= 3; dx++) {
          const e = (dx / rX) ** 2 + (dy / rY) ** 2;
          if (e > 1) continue;
          const x = lx + dx;
          const y = ly + dy;
          // never bulge below the foot, and only 1–3px beyond the core
          if (y >= h - 1 || x < 0 || x >= W) continue;
          if (!inCore(x, y) && (x < xl - 3 || x > xr + 3 || y < yt - 3)) continue;
          let c = dx + dy <= -2 ? pal.lt : dx + dy >= 2 || e > 0.8 ? pal.dk : pal.mid;
          if (variant === 1 && c === pal.lt) c = pal.mid; // the small clumps sit a bit in shade
          if (face || (y >= faceTop && !m.s)) c = darker(c);
          if (!m.s && y > h - 5) c = darker(c);
          setPx(x, y, c);
        }
      // a lit pair of leaves on some clumps
      if ((hh >>> 9) % 4 === 0 && !face) setPx(lx - 1, ly - 1, pal.lt === P.leafLt ? P.leafLt : lt1(pal.lt));
    }
  // accents on the top surface: flowers (satsuki / tsutsuji), red new shoots (kaname)
  for (let k = 0; k < 2; k++) {
    const hh = ihash(tx * 3 + k, ty, 97);
    if (!pal.accent || hh % 3 !== 0) continue;
    const x = 3 + (hh >>> 4) % 10;
    const y = (m.n ? 1 : yt + 1) + ((hh >>> 8) % 6);
    if (!mass[y * W + x] || (y >= faceTop && !m.s)) continue;
    if (kind === 'kaname') {
      setPx(x, y, pal.accent);
      setPx(x + 1, y, pal.accent);
      setPx(x, y - 1, P.crimson);
    } else {
      setPx(x, y, pal.accent);
      setPx(x + 1, y, pal.accent);
      setPx(x, y + 1, pal.accent);
      setPx(x + 1, y + 1, P.white);
    }
  }
  // a gap in the face now and then, with a branch across it
  if (!m.s) {
    const hh = ihash(tx, ty, 99);
    if (hh % 5 === 0) {
      const gx = 3 + ((hh >>> 4) % 9);
      for (let y = faceTop + 3; y < faceTop + 8; y++)
        for (let x = gx; x < gx + 3; x++) if (mass[y * W + x]) col[y * W + x] = y === faceTop + 3 ? pal.deep : P.ink;
      for (let x = gx - 1; x < gx + 4; x++) if (mass[(faceTop + 5 + ((x - gx) >> 1)) * W + x]) col[(faceTop + 5 + ((x - gx) >> 1)) * W + x] = P.woodDark;
    }
  }
  for (let y = 0; y < h; y++) for (let x = 0; x < W; x++) if (mass[y * W + x]) p.set(x, y, col[y * W + x]);
  // silhouette: lit top rim, darker right rim, ink foot line
  const src = p.data.slice();
  const op = (x: number, y: number) => x >= 0 && y >= 0 && x < W && y < h && src[y * W + x] >>> 24 !== 0;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < W; x++) {
      if (!op(x, y)) continue;
      if (!op(x, y - 1) && y > 0 && !m.n) p.set(x, y, (x + y) % 3 ? P.leafLt : pal.lt);
      else if (!op(x + 1, y) && x + 1 < W && !m.e) p.set(x, y, pal.deep);
    }
  if (!m.s) for (let x = 0; x < W; x++) if (op(x, h - 1)) p.set(x, h - 1, P.ink);
  return { img: p.toCanvas(), ox: 0, oy: 16 - h, shadow: m.s ? 0 : H };
}

function lt1(c: string): string {
  return c === P.leaf ? P.leafYoung : c === P.leafYoung ? P.leafLt : c === P.leafDeep ? P.leaf : P.leafLt;
}

/**
 * Reeds on the canal's near bank: clumps (株) of 4–7 blades fanning from a
 * dark base, three heights, some with brown ears (穂). The sprite stays in its
 * own tile; only the tips rise 2–4px above it (the canal stays readable).
 */
function reedCell(tx: number, ty: number, m: CellMask): CellArt {
  const calm = reedImage(tx, ty, false);
  void m;
  return { img: calm, ox: 0, oy: -4, shadow: 0, ne: reedImage(tx, ty, true) };
}

/** One reed cell; `ne` = stage 2: every clump leans north-east, tips and plumes 1–2px over. */
function reedImage(tx: number, ty: number, ne: boolean): HTMLCanvasElement {
  const W = 16;
  const RISE = 4;
  const h = 16 + RISE;
  const p = new PixelCanvas(W, h);
  const wx0 = tx * 16;
  // dark undergrowth filling the tile (clumps read against it), lumpy top
  for (let x = 0; x < W; x++) {
    const top = RISE + 5 + (ihash(wx0 + x >> 1, ty, 301) % 3);
    for (let y = top; y < h; y++) p.set(x, y, y === top ? P.leafDeep : ihash((wx0 + x) >> 1, y >> 1, 305) % 5 === 0 ? P.ink : P.leafShade);
  }
  // clumps (株) on a jittered 6px world grid, back to front; each is a mass
  // shaped like a sheaf: narrow foot, widest at 60%, 2–3 pointed tips
  for (let gx = Math.floor((wx0 - 8) / 6); gx <= Math.floor((wx0 + W + 8) / 6); gx++) {
    const hh = ihash(gx, ty, 303);
    const bx = gx * 6 + (hh % 3) - wx0; // centre
    const variant = (hh >>> 3) % 3; // 0 short, 1 medium, 2 tall with a plume
    const tall = variant === 0 ? 9 : variant === 1 ? 13 : 17 + ((hh >>> 6) % 2);
    const baseY = h - 1 - ((hh >>> 9) % 2);
    const half = variant === 0 ? 2.2 : 2.8;
    const lean = ne ? 1.5 : ((hh >>> 12) % 3) - 1; // -1, 0, 1 (tips lean); stage 2: all to the north-east
    for (let j = 0; j < tall; j++) {
      const k = j / tall;
      const wdt = k < 0.6 ? 1.2 + (half - 1.2) * (k / 0.6) : half * (1 - (k - 0.6) / 0.55);
      const cxj = ne ? bx + Math.max(0, k - 0.3) * 4.3 : bx + lean * Math.max(0, k - 0.5) * 3;
      const y = baseY - j;
      if (y < 0) break;
      for (let x = Math.floor(cxj - wdt); x <= Math.ceil(cxj + wdt); x++) {
        if (x < 0 || x >= W) continue;
        const u = (x - (cxj - wdt)) / (2 * wdt + 0.01);
        if (u < 0 || u > 1) continue;
        let c: string = u < 0.3 ? P.leafYoung : u > 0.7 ? P.leafDeep : P.leaf;
        if (k < 0.22) c = u < 0.3 ? P.leafDeep : P.leafShade;
        else if (k > 0.75 && u < 0.5) c = P.leafLt;
        // blade grooves every 2px in the body
        if (k > 0.25 && k < 0.8 && ((x + gx) & 1) === 0 && u > 0.35 && u < 0.8) c = P.leafDeep;
        p.set(x, y, c);
      }
    }
    // 2–3 pointed blade tips above the mass
    for (let b = -1; b <= 1; b++) {
      if (b !== 0 && (hh >>> (15 + b + 1)) & 1) continue;
      const x = Math.round(bx + (ne ? 3.4 : lean * 1.5) + b * 1.5);
      const y0 = baseY - tall - (b === 0 ? 2 : 1);
      for (let j = 0; j < (b === 0 ? 3 : 2); j++) if (x >= 0 && x < W && y0 + j >= 0) p.set(x, y0 + j, j === 0 ? P.leafLt : P.leafYoung);
    }
    // plume (穂) on the tall clumps: a drooping brown-purple head
    if (variant === 2) {
      const ex = Math.round(bx + (ne ? 4 : lean * 2) + (lean >= 0 ? 1 : -2));
      const ey = baseY - tall - 1;
      const plume = [
        [0, 0, P.goldPale], [1, 0, P.brass], [0, 1, P.brassOld], [1, 1, P.brassOld], [2, 1, P.wood],
        [0, 2, P.wood], [1, 2, P.sunShade], [1, 3, P.wood],
      ] as const;
      for (const [dx, dy, c] of plume) {
        const x = ex + (lean < 0 ? -dx : dx);
        const y = ey + dy;
        if (x >= 0 && x < W && y >= 0 && y < h) p.set(x, y, c);
      }
    }
  }
  // foot line on the bank
  for (let x = 0; x < W; x++) p.set(x, h - 1, P.leafShade);
  return p.toCanvas();
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

/**
 * An old riverside railing (mat 'pipe', QA round 3: the guardrail ran
 * unbroken along three screens): two round pipes on posts, sky-blue paint
 * gone to rust in patches, one pipe sagging where it was hit long ago.
 */
function pipeRailCell(tx: number, ty: number, m: CellMask): CellArt {
  const W = 16;
  const hh = 16 + 6;
  const p = new PixelCanvas(W, hh);
  const base = hh - 3;
  const paint = (x: number, y: number, lit: boolean) => {
    const h = ihash(tx * 16 + x, y, 29);
    const rust = h % 5 === 0 || (h % 3 === 0 && y > base - 6);
    // faded sky-blue paint (never the green of the grass behind it)
    return rust ? (lit ? P.brass : P.brassOld) : lit ? '#A9C0D0' : '#5E7088';
  };
  // posts at both ends of a run and every 16px
  const posts = [3];
  if (!m.e) posts.push(12);
  for (const x of posts) {
    p.vline(x, base - 11, base, paint(x, base - 11, true));
    p.vline(x + 1, base - 11, base, '#4A5870');
    p.set(x, base - 11, P.glint);
    for (let y = base - 8; y <= base; y += 3) if (ihash(tx, y, 31) % 2) p.set(x, y, P.brassOld);
  }
  const x0 = m.w ? 0 : 3;
  const x1 = m.e ? W - 1 : 13;
  const sag = ihash(tx, ty, 37) % 4 === 0;
  for (let x = x0; x <= x1; x++) {
    const d = sag && x > 4 && x < 12 ? 1 : 0;
    // upper pipe (lit on top), lower pipe
    p.set(x, base - 10, paint(x, 0, true));
    p.set(x, base - 9, paint(x, 1, false));
    p.set(x, base - 5 + d, paint(x, 2, true));
    p.set(x, base - 4 + d, paint(x, 3, false));
  }
  // weeds grown through it
  for (let i = 0; i < 4; i++) {
    const wx = ihash(tx, i, 41) % 15;
    const hgt = 2 + (ihash(tx, i, 43) % 4);
    for (let k = 0; k < hgt; k++) p.set(wx, base + 1 - k, k === hgt - 1 ? P.leafYoung : P.leaf);
  }
  return { img: p.toCanvas(), ox: 0, oy: 16 - hh, shadow: 12 };
}

function guardrailCell(tx: number, ty: number, m: CellMask, mat = 'rail'): CellArt {
  if (mat === 'pipe') return pipeRailCell(tx, ty, m);
  // white W-beam rail on posts, facing south; the canal is beyond
  const W = 16;
  const hh = 16 + 6;
  const p = new PixelCanvas(W, hh);
  const base = hh - 3;
  const dent = ihash(tx, ty, 13) % 9 === 0;
  // posts every 32px, and at the end of a run (a gap for steps, another railing)
  if (tx % 2 === 0 || !m.w) {
    p.vline(3, base - 12, base, P.white);
    p.vline(4, base - 12, base, P.steel);
    p.set(3, base - 12, P.glint);
  }
  if (!m.e) {
    p.vline(11, base - 12, base, P.white);
    p.vline(12, base - 12, base, P.steel);
    p.set(11, base - 12, P.glint);
  }
  for (let x = 0; x < W; x++) {
    // the beam ends in a rounded flare (袖) at the end of a run
    if ((!m.e && x > 13) || (!m.w && x < 2)) continue;
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
  const vx0 = VX0;
  const vx1 = VX1;
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
  // vertical part (a N–S run, review round 2): seen from the south it is a
  // strip with a 1px lit west edge, a 3px cap (笠木) with joints every 8px
  // and a 4px east side face in shade showing the block courses; the strip
  // is raised by H (the cap is the top of the wall) and continues into the
  // neighbouring cells.
  if (vertical || m.n || m.s) {
    const top = m.n ? 0 : faceTop - mat.cap;
    const bottom = m.s ? hh : faceTop; // continues into the next cell
    const wy0 = ty * 16 + 16 - hh; // world y of image row 0
    for (let y = Math.max(0, top - H); y < bottom; y++) {
      const wy = wy0 + y;
      for (let x = VX0; x <= VX1; x++) put(x, y, vColumn(mat, x - VX0, wy, wx0 + x, H));
    }
    if (!m.s) {
      // south end of the run: the end face (lit) under the cap, the side face
      // continuing down to the ground
      for (let y = 0; y < H; y++)
        for (let x = VX0; x <= VX1; x++) {
          const wy = wy0 + faceTop + y;
          const col = x - VX0;
          if (col < V_CAP + 1) put(x, faceTop + y, col === 0 ? edgeLight(mat) : mat.face(wx0 + x, ty * 16, y, H));
          else if (x === VX1) put(x, faceTop + y, P.ink);
          else put(x, faceTop + y, sideFace(mat, col - V_CAP - 1, wy, H));
        }
      for (let x = VX0; x <= VX1; x++) p.set(x, faceTop - 1, x - VX0 < V_CAP + 1 ? mat.top(wx0 + x, ty * 16, 's') ?? P.steel : P.asphalt);
    }
    // contact shadow on the ground east of the side face (translucent)
    const sy0 = m.n ? 0 : hh - 16;
    for (let y = sy0; y < hh; y++) {
      p.under(VX1 + 1, y, P.ink + '66');
      if ((y + tx) % 2 === 0) p.under(VX1 + 2, y, P.ink + '33');
    }
  }
  // clear the raised strip above the vertical cap when this cell has a north neighbour
  // (the north cell's own sprite draws it)
  // ink foot line
  for (let x = 0; x < W; x++) if (p.alpha(x, hh - 1)) p.set(x, hh - 1, P.charcoal);
  return { img: p.toCanvas(), ox: 0, oy: 16 - hh, shadow: (horiz && !m.s) || (!horiz && vertical) ? H : 0 };
}

/** Vertical-run geometry (image x): lit edge, cap, side face, ink edge. */
const VX0 = 3;
const V_CAP = 3;
const V_SIDE = 4;
const VX1 = VX0 + V_CAP + V_SIDE + 1;

/** One column of a N–S run: 0 = lit west edge, 1..3 cap, 4..7 east side face, 8 ink. */
function vColumn(mat: Mat, col: number, wy: number, wx: number, H: number): string {
  if (col === 0) return wy % 3 === 0 ? P.sun : edgeLight(mat);
  if (col <= V_CAP) {
    // cap (笠木): the material's top, a joint across it every 8px along the run
    let c = mat.top(wy, wx, null) ?? P.concreteLt;
    if ((wy & 7) === 7) c = shadeCol(c, 1);
    else if (col === 1) c = lighten(c);
    else if (col === V_CAP) c = shadeCol(c, 1);
    return c;
  }
  if (col === V_CAP + V_SIDE + 1) return P.ink;
  return sideFace(mat, col - V_CAP - 1, wy, H);
}

/**
 * East side face of a N–S run, in the wall's own shade: two block courses
 * (2px and 1px) with a mortar line between them, block ends staggered by
 * half a block — the courses of the south face seen edge-on.
 */
function sideFace(mat: Mat, k: number, wy: number, H: number): string {
  const fyA = 1;
  const fyB = Math.min(H - 4, 5);
  if (k === 2) return mix(mat.face(wy, 0, 3, H) ?? P.steel, P.shade, 0.45);
  const c = mat.face(wy, 0, k < 2 ? fyA : fyB, H) ?? P.concrete;
  return mix(c, P.shade, k === 0 ? 0.16 : k === 1 ? 0.3 : 0.42);
}

function edgeLight(mat: Mat): string {
  return mat.top(0, 0, 'n') ?? P.white;
}

const SHADE: Record<string, string> = {
  [P.white]: P.concreteLt, [P.concreteLt]: P.concrete, [P.concrete]: P.steel, [P.steel]: P.asphalt,
  [P.asphalt]: P.charcoal, [P.charcoal]: P.ink, [P.ink]: P.night, [P.leafLt]: P.leafYoung, [P.leafYoung]: P.leaf,
  [P.leaf]: P.leafDeep, [P.leafDeep]: P.leafShade, [P.leafShade]: P.ink, [P.woodLt]: P.wood, [P.wood]: P.woodDark,
  [P.woodDark]: P.ink, [P.paper]: P.paperGrid, [P.paperGrid]: P.woodLt, [P.goldPale]: P.brass, [P.brass]: P.brassOld,
};
const LIGHTEN: Record<string, string> = {
  [P.concreteLt]: P.white, [P.concrete]: P.concreteLt, [P.steel]: P.concrete, [P.asphalt]: P.steel, [P.charcoal]: P.asphalt,
  [P.wood]: P.woodLt, [P.woodDark]: P.wood, [P.leaf]: P.leafYoung, [P.leafDeep]: P.leaf,
};
function shadeCol(c: string, n = 1): string {
  let r = c.toUpperCase();
  for (let i = 0; i < n; i++) r = SHADE[r] ?? r;
  return r;
}
function lighten(c: string): string {
  return LIGHTEN[c.toUpperCase()] ?? c;
}

export function structureCell(kind: string, mat: string, tx: number, ty: number, m: CellMask): CellArt {
  if (isHoshiMat(kind, mat)) return hoshiStructureCell(kind, mat, tx, ty, m);
  const key = `${kind}|${mat}|${tx},${ty}|${+m.n}${+m.s}${+m.e}${+m.w}`;
  let a = cache.get(key);
  if (a) return a;
  if (kind === 'hedge') a = hedgeCell(mat as HedgeKind, tx, ty, m);
  else if (kind === 'fence') a = fenceCell(mat, tx, ty, m);
  else if (kind === 'guardrail') a = guardrailCell(tx, ty, m, mat);
  else a = wallCell(mat, tx, ty, m);
  cache.set(key, a);
  return a;
}

export const _unused = rgba32;
