// HD-2D prototype (round 2): a prop's picture stood up with a body. The
// rows above its foot line stand (as before), now with thickness by the
// prop's solid (tune.ts SOLID): pushed back a few px (slab), a column for
// the shaft (pole, the trunk of a tree), the crown of a tree as crossed
// boards; the rows below the foot still lie on the ground in front.

import { extrude, Mask, prism, PX, type Quads, type UvFn } from './solid';
import type { Slab } from './overlap';
import type { PropSolid } from './tune';

/** A picture iw × ih drawn at world px (left, top), its foot line at world y `foot`. */
export interface Placed {
  iw: number;
  ih: number;
  left: number;
  top: number;
  foot: number;
  /** It stands this many px further south in 3D (tune.ts NUDGE). */
  dz?: number;
}

export interface Stood {
  /** The standing part's bottom and top heights (units); null: nothing stands. */
  stand: [number, number] | null;
  /** The column's axis (poles, trunks; else the picture's middle and the foot line), units. */
  cx: number;
  cz: number;
  /** Thick enough to cast its own shadow (no sun-facing shadow plane). */
  solid: boolean;
  /** Never see-through (a shape whose parts stand all round, shapes.ts: the x-ray would thin all of it). */
  noXray?: boolean;
}

/** The shaft of a pole or a trunk: the run of columns that stand tallest from the foot. */
export function findShaft(m: Mask, rf: number, w: number, maxW: number): { c0: number; c1: number; r0: number } | null {
  const run = new Int32Array(w);
  for (let c = 0; c < w; c++) {
    let r = rf - 1;
    while (r >= Math.max(0, rf - 4) && !m.at(c, r)) r--;
    if (r < Math.max(0, rf - 4) || !m.at(c, r)) continue;
    let n = 0;
    while (r >= 0 && m.at(c, r)) {
      n++;
      r--;
    }
    run[c] = n;
  }
  let best = 0;
  let at = -1;
  for (let c = 0; c < w; c++)
    if (run[c] > best) {
      best = run[c];
      at = c;
    }
  if (best < 12) return null;
  let c0 = at;
  let c1 = at + 1;
  while (c0 > 0 && run[c0 - 1] >= best * 0.7) c0--;
  while (c1 < w && run[c1] >= best * 0.7) c1++;
  if (c1 - c0 < 2 || c1 - c0 > maxW) return null;
  let h = best;
  for (let c = c0; c < c1; c++) h = Math.min(h, run[c]);
  return { c0, c1, r0: Math.max(0, rf - h) };
}

/**
 * Stand a prop's picture up with its solid into q (its own texture, `uv`).
 * The mask is the picture's (it is changed: the shaft's pixels go to the column).
 * `rec`: where the room it takes goes (overlap.ts, world px).
 */
export function standUp(q: Quads, m: Mask, uv: UvFn, pl: Placed, spec: Required<PropSolid>, sv: number, lift = 0, rec?: Slab[]): Stood {
  const { iw, ih, left, top } = pl;
  const rf = Math.max(0, Math.min(ih, pl.foot - top));
  // (where it stands in 3D: its foot line, or a few px south of it)
  const foot = pl.foot + (pl.dz ?? 0);
  const out: Stood = { stand: null, cx: (left + iw / 2) * PX, cz: foot * PX, solid: false };
  // (the overlap record: the picture's painted pixels, rows above the foot line)
  const h0 = lift / (PX * sv);
  const painted = (x: number, h: number) => m.at(Math.floor(x - left), rf - 1 - Math.floor(h - h0));
  const slab = (z0: number, z1: number): Slab => ({ x0: left, x1: left + iw, h0, h1: h0 + rf, z0, z1, at: painted, face: true });
  if (rf > 0) {
    const yt = (pl.foot - top) * PX * sv + lift;
    const yb = (pl.foot - top - rf) * PX * sv + lift;
    out.stand = [yb, yt];
    const sy = PX * sv;
    const st = { x0: left * PX, yTop: yt, sy, zf: foot * PX };
    const d = spec.depth * PX;
    if (spec.kind === 'pole' || spec.kind === 'tree') {
      const sh = findShaft(m, rf, iw, spec.kind === 'tree' ? 10 : 12);
      if (sh) {
        // the shaft: an 8-sided column whose front touches the foot line
        const r = ((sh.c1 - sh.c0) / 2) * PX;
        out.cx = (left + (sh.c0 + sh.c1) / 2) * PX;
        out.cz = foot * PX - r;
        prism(q, out.cx, out.cz, r, yb, yt - sh.r0 * sy, uv, sh.c0, sh.r0, sh.c1, rf);
        for (let rr = sh.r0; rr < rf; rr++) for (let c = sh.c0; c < sh.c1; c++) m.clear(c, rr);
        // arms, signs, lamps, roots: round the column's middle (the flat
        // picture stays inside the column)
        const zf = out.cz + Math.min(d / 2, 0.4 * r);
        extrude(q, m, 0, 0, iw, rf, { ...st, zf }, d, uv);
        out.solid = true;
        rec?.push(
          { x0: left + sh.c0, x1: left + sh.c1, h0, h1: h0 + rf - sh.r0, z0: (out.cz - r) / PX, z1: (out.cz + r) / PX, face: true },
          slab((zf - d) / PX, zf / PX),
        );
      } else {
        extrude(q, m, 0, 0, iw, rf, st, Math.max(2 * PX, d), uv);
        out.solid = spec.depth >= 5;
        rec?.push(slab(foot - Math.max(2, spec.depth), foot));
      }
    } else if (spec.kind === 'slab') {
      extrude(q, m, 0, 0, iw, rf, st, d, uv);
      out.solid = spec.depth >= 5;
      rec?.push(slab(foot - spec.depth, foot));
    } else {
      extrude(q, m, 0, 0, iw, rf, st, 0, uv);
      rec?.push(slab(foot, foot));
    }
  }
  if (rf < ih) {
    // the rows below the foot line lie on the ground in front
    const a = uv(0, ih);
    const b = uv(iw, rf);
    const x0 = left * PX;
    const x1 = (left + iw) * PX;
    const zN = foot * PX;
    const zS = (top + ih + (pl.dz ?? 0)) * PX;
    const y = 0.012 + lift;
    q.add([x0, y, zS], [x1, y, zS], [x1, y, zN], [x0, y, zN], [0, 1, 0], a[0], a[1], b[0], b[1]);
  }
  return out;
}

/**
 * A tree's crown as crossed boards round the trunk (cx, cz): the picture
 * (rows 0..rf stand, from height yt down, `sy` units per px) on a board
 * through the trunk, a smaller one in front and one behind, and one across
 * (both ways) — the crown has a body from any side. D: its depth (units).
 */
export function crownBoards(q: Quads, uv: UvFn, iw: number, rf: number, left: number, yt: number, sy: number, cx: number, cz: number, D: number): { front: number } {
  const x0 = left * PX;
  const x1 = (left + iw) * PX;
  const yb = yt - rf * sy;
  const a = uv(0, rf);
  const b = uv(iw, 0);
  const mx = (x0 + x1) / 2;
  const my = (yb + yt) / 2;
  const board = (z: number, k: number) => {
    const hx = ((x1 - x0) / 2) * k;
    const hy = ((yt - yb) / 2) * k;
    q.add([mx - hx, my - hy, z], [mx + hx, my - hy, z], [mx + hx, my + hy, z], [mx - hx, my + hy, z], [0, 0, 1], a[0], a[1], b[0], b[1]);
  };
  board(cz - D / 3, 0.82);
  board(cz, 1);
  board(cz + D / 3, 0.82);
  q.add([cx, yb, cz - D / 2], [cx, yb, cz + D / 2], [cx, yt, cz + D / 2], [cx, yt, cz - D / 2], [-1, 0, 0], a[0], a[1], b[0], b[1]);
  q.add([cx, yb, cz + D / 2], [cx, yb, cz - D / 2], [cx, yt, cz - D / 2], [cx, yt, cz + D / 2], [1, 0, 0], a[0], a[1], b[0], b[1]);
  return { front: cz + D / 3 };
}
