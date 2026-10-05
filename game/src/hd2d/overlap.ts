// HD-2D prototype (round 3, 2026-10-05, 02 #85): where two solids of the 3D
// town go into each other. Every building, prop, wall and hedge leaves a
// record of the room it takes while it is stood up (town.ts, props3d.ts,
// walls.ts); overlaps() looks for the pictures that end up inside another
// solid — hidden by it in 3D although the 2D draws them over it (the 2D
// draws the one whose foot line is further south on top).
//
//   __game.cmd.hd2dOverlaps()          the worst first (QA)
//   __game.cmd.hd2dOverlaps({ min: 1, all: true })
//
// Units: world px across (x) and north–south (z, south = the camera's side);
// heights in px of the 2D picture above the ground (h; × PX × SV in 3D), so
// what the 2D draws one pixel apart is one apart here too.

/** QA: whether the town notes the room its solids take while it is stood up (off for the players: no cost). */
export const recording = { on: false };

/** A box of a solid. */
export interface Slab {
  x0: number;
  x1: number;
  h0: number;
  h1: number;
  /** North and south (front) faces. A face alone (a picture standing as a plane): z0 = z1. */
  z0: number;
  z1: number;
  /** Which (x, h) of it are filled (its picture's painted pixels); omitted: all of it. */
  at?: (x: number, h: number) => boolean;
  /** Its south face shows a picture: its pixels are checked for being buried in another solid. */
  face?: boolean;
}

export interface Solid {
  /** prop id @ tile (QA). */
  name: string;
  kind: 'building' | 'prop' | 'wall';
  /** Its foot line (world y): the 2D draws the one further south over the other (on one line, the one further east). */
  foot: number;
  x?: number;
  slabs: Slab[];
}

/** Where on the map (the areas the QA reports by; tiles of map_town). */
export function areaOf(tx: number, ty: number): string {
  if (tx < 4) return '西のはし';
  if (ty >= 32) return '川べり';
  if (ty < 16) return tx < 32 ? '夕鳴公園' : 'モール前';
  if (tx >= 23) return '銀座通り';
  return 'ひぐらし坂';
}

export interface Overlap {
  /** The one drawn over the other in 2D, whose picture is buried in 3D. */
  front: string;
  back: string;
  /** Its picture's pixels inside the other solid. */
  px: number;
  /** The other way round (the back one's picture inside the front one: as the 2D hides it anyway). */
  backPx: number;
  /** Where (tiles, the middle of the buried pixels) and the area. */
  at: [number, number];
  area: string;
  /** How deep the buried picture goes in (px, the most). */
  depth: number;
  /** Pixels where the two pictures stand on the same plane (they flicker through each other). */
  flush: number;
}

function bounds(s: Solid): [number, number, number, number, number, number] {
  let x0 = Infinity;
  let x1 = -Infinity;
  let h0 = Infinity;
  let h1 = -Infinity;
  let z0 = Infinity;
  let z1 = -Infinity;
  for (const b of s.slabs) {
    x0 = Math.min(x0, b.x0);
    x1 = Math.max(x1, b.x1);
    h0 = Math.min(h0, b.h0);
    h1 = Math.max(h1, b.h1);
    z0 = Math.min(z0, b.z0);
    z1 = Math.max(z1, b.z1);
  }
  return [x0, x1, h0, h1, z0, z1];
}

/** A's picture pixels buried in B: count, their middle (world px) and how deep the deepest one is. */
function buried(a: Solid, b: Solid, eps: number): { n: number; sx: number; sz: number; depth: number } {
  let n = 0;
  let sx = 0;
  let sz = 0;
  let depth = 0;
  for (const f of a.slabs) {
    if (!f.face) continue;
    const z = f.z1;
    for (const v of b.slabs) {
      if (v.z1 - v.z0 <= eps * 2 || z <= v.z0 + eps || z >= v.z1 - eps) continue;
      const x0 = Math.max(f.x0, v.x0);
      const x1 = Math.min(f.x1, v.x1);
      const h0 = Math.max(f.h0, v.h0);
      const h1 = Math.min(f.h1, v.h1);
      if (x1 <= x0 || h1 <= h0) continue;
      for (let x = Math.floor(x0) + 0.5; x < x1; x++)
        for (let h = Math.floor(h0) + 0.5; h < h1; h++) {
          if (x < x0 || h < h0) continue;
          if (f.at && !f.at(x, h)) continue;
          if (v.at && !v.at(x, h)) continue;
          n++;
          sx += x;
          sz += z;
          depth = Math.max(depth, v.z1 - z);
        }
    }
  }
  return { n, sx, sz, depth };
}

/** Pixels where a picture of A and one of B stand on the same plane (within eps), both painted. */
function flush(a: Solid, b: Solid, eps: number): { n: number; sx: number; sz: number } {
  let n = 0;
  let sx = 0;
  let sz = 0;
  for (const f of a.slabs) {
    if (!f.face) continue;
    for (const v of b.slabs) {
      if (!v.face || Math.abs(f.z1 - v.z1) > eps) continue;
      const x0 = Math.max(f.x0, v.x0);
      const x1 = Math.min(f.x1, v.x1);
      const h0 = Math.max(f.h0, v.h0);
      const h1 = Math.min(f.h1, v.h1);
      for (let x = Math.floor(x0) + 0.5; x < x1; x++)
        for (let h = Math.floor(h0) + 0.5; h < h1; h++) {
          if (x < x0 || h < h0) continue;
          if (f.at && !f.at(x, h)) continue;
          if (v.at && !v.at(x, h)) continue;
          n++;
          sx += x;
          sz += f.z1;
        }
    }
  }
  return { n, sx, sz };
}

/**
 * Every pair of solids where a picture the 2D draws on top is buried in the
 * other solid, or where two pictures stand on one plane (`min` px or
 * more), the worst first. `all`: also the pairs where only the back one's
 * picture is buried (the 2D hides it anyway).
 */
export function overlaps(solids: Solid[], o: { min?: number; all?: boolean; eps?: number } = {}): Overlap[] {
  const min = o.min ?? 4;
  const eps = o.eps ?? 0.3;
  const bx = solids.map(bounds);
  const out: Overlap[] = [];
  for (let i = 0; i < solids.length; i++)
    for (let j = i + 1; j < solids.length; j++) {
      const a = solids[i];
      const b = solids[j];
      // (wall cells meet each other everywhere, and a tree's crown boards
      // cross its own trunk: not what this looks for)
      if (a.kind === 'wall' && b.kind === 'wall') continue;
      if (a.name.split(':')[0] === b.name.split(':')[0]) continue;
      const p = bx[i];
      const q = bx[j];
      if (p[0] >= q[1] || q[0] >= p[1] || p[2] >= q[3] || q[2] >= p[3] || p[4] > q[5] || q[4] > p[5]) continue;
      const ab = buried(a, b, eps);
      const ba = buried(b, a, eps);
      const fl = flush(a, b, eps);
      if (ab.n < min && ba.n < min && fl.n < min) continue;
      // the one the 2D draws on top (a tie: either)
      const aFront = a.foot > b.foot || (a.foot === b.foot && (a.x ?? 0) >= (b.x ?? 0));
      const [fs, bs, fr, br] = aFront ? [a, b, ab, ba] : [b, a, ba, ab];
      if (fr.n < min && fl.n < min && !o.all) continue;
      const r = fr.n >= min ? fr : fl.n >= min ? fl : br;
      const tx = Math.floor(r.sx / r.n / 16);
      const ty = Math.floor(r.sz / r.n / 16);
      out.push({ front: fs.name, back: bs.name, px: fr.n, backPx: br.n, flush: fl.n, at: [tx, ty], area: areaOf(tx, ty), depth: Math.round(Math.max(fr.depth, 0) * 10) / 10 });
    }
  return out.sort((u, v) => v.px + v.flush - (u.px + u.flush) || v.backPx - u.backPx);
}
