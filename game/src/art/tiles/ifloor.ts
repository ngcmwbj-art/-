// Indoor floors for the shops and the mall (30_level_art 4.0 / 5.0 / 6.1).
// Each painter returns the palette colour of one world pixel. They are baked
// once into the room shells (art/props/ishell.ts), never per frame.
//
// Rules kept here: 2px+ clusters (no 1px noise), variants picked with hashes
// so no two neighbouring boards / tiles repeat, wear and dirt as low-frequency
// clusters, hand-placed details (coins, lint, scuffs) as tiny decals.

import { P } from './palette';
import { h01, ihash, valueNoise } from './noise';

export type FloorPainter = (x: number, y: number) => string;

// ---------------------------------------------------------------- wooden boards

export interface BoardStyle {
  /** Board height (px). */
  bh: number;
  lit: string;
  base: string;
  shade: string;
  gap: string;
  /** Knot / nail colour. */
  nail: string;
  seed: number;
  /** 0..1 how worn (lighter) the boards are at (x, y) (a path to the counter). */
  wear?: (x: number, y: number) => number;
}

/**
 * Boards running east–west. Butt joints are staggered per board, the grain is
 * a stretched noise, every board has its own tone (one of three), knots and
 * nail heads sit at the joints.
 */
export function boards(s: BoardStyle): FloorPainter {
  return (x, y) => {
    const row = Math.floor(y / s.bh);
    const ly = y - row * s.bh;
    const len = 36 + (ihash(0, row, s.seed) % 28);
    const off = ihash(1, row, s.seed + 1) % len;
    const bx = Math.floor((x + off) / len);
    const lx = (x + off) % len;
    const hh = ihash(bx, row, s.seed + 2);
    if (ly === s.bh - 1) return s.gap;
    if (lx === 0) return s.gap;
    // nail heads near the joints (2px, one per board end)
    if ((lx === 2 || lx === len - 3) && ly === Math.floor(s.bh / 2) && hh % 3 !== 0) return s.nail;
    const wear = s.wear ? s.wear(x, y) : 0;
    const tone = hh % 3; // 0 base, 1 lighter board, 2 darker board
    // grain streak: stretched noise along the board
    const g = valueNoise(x / 11 + bx * 3.7, row * 2.3 + ly * 0.35, s.seed + (hh & 7));
    if (ly === 0) return tone === 2 ? s.base : s.lit;
    // knot (a 2×2 dark eye) on some boards
    const kx = 8 + (hh >>> 5) % Math.max(1, len - 16);
    if (hh % 7 === 0 && Math.abs(lx - kx) <= 1 && ly >= 1 && ly <= 2) return s.shade;
    const w = wear + (valueNoise(x / 7, y / 5, s.seed + 9) - 0.5) * 0.35;
    if (tone === 2) return g > 0.72 ? s.shade : w > 0.55 ? s.base : s.shade;
    if (tone === 1) return g > 0.8 ? s.base : w > 0.35 ? s.lit : s.base;
    return g > 0.78 ? s.shade : w > 0.62 ? s.lit : s.base;
  };
}

// ---------------------------------------------------------------- quarry tiles (butcher's back)

/** 8×8 terracotta quarry tiles with grout, a wet sheen near the prep area. */
export function quarry(seed: number): FloorPainter {
  return (x, y) => {
    const lx = x & 7;
    const ly = y & 7;
    const tx = x >> 3;
    const ty = y >> 3;
    const hh = ihash(tx, ty, seed);
    if (lx === 7 || ly === 7) return P.wood;
    if (ly === 0 || lx === 0) return hh % 4 === 0 ? P.skin3 : P.skin4;
    // wet sheen streak (2px) on some tiles
    if (hh % 5 === 0 && lx + ly === 7) return P.skin3;
    if (hh % 9 === 1 && lx >= 2 && lx <= 4 && ly >= 3 && ly <= 4) return P.woodLt;
    return hh % 3 === 0 ? P.skin4 : hh % 3 === 1 ? P.skin4 : P.woodLt;
  };
}

// ---------------------------------------------------------------- vinyl checker (laundry)

/**
 * The laundromat's vinyl floor: 8px checker in two pale greys with a seam
 * every 16px, a darker traffic lane in front of the machines, lint balls and a
 * lost 10-yen coin.
 */
export function vinyl(seed: number, lane?: (x: number, y: number) => number): FloorPainter {
  return (x, y) => {
    const lx = x & 15;
    const ly = y & 15;
    if (lx === 15 || ly === 15) return P.steel;
    if (lx === 0 || ly === 0) return P.white;
    const ck = ((x >> 3) + (y >> 3)) & 1;
    const lane01 = lane ? lane(x, y) : 0;
    const n = valueNoise(x / 9, y / 9, seed) + lane01 * 0.3;
    // scuff clusters (2px)
    const s = ihash(x >> 1, y >> 1, seed + 3);
    if (s % 151 === 0) return P.concrete;
    if (ck) return n > 0.86 ? P.concrete : P.concreteLt;
    return n > 0.8 ? P.concreteLt : P.white;
  };
}

// ---------------------------------------------------------------- terrazzo (koban)

/** Grey terrazzo (研ぎ出し) in 32px slabs: chips of three greys, a brass divider strip. */
export function terrazzo(seed: number): FloorPainter {
  return (x, y) => {
    const lx = x & 31;
    const ly = y & 31;
    if (lx === 31 || ly === 31) return P.brassOld;
    const c = ihash(x >> 1, y >> 1, seed);
    if (c % 37 === 0) return P.steel;
    if (c % 37 === 1) return P.concreteLt;
    if (c % 113 === 2) return P.skin4;
    // Each slab was poured separately: a few are a touch paler (sparse dither),
    // no large blotches (they read as stains).
    const slab = ihash(x >> 5, y >> 5, seed + 9) % 4;
    if (slab === 0 && ihash(x, y, seed + 3) % 13 === 0) return P.concreteLt;
    if (slab === 1 && ihash(x, y, seed + 4) % 23 === 0) return P.concreteLt;
    return P.concrete;
  };
}

// ---------------------------------------------------------------- mall P-tiles (5.0)

export interface MallFloorOpts {
  seed: number;
  /** Map size in tiles (for the hand-placed decals). */
  w: number;
  h: number;
  /** Tiles that should never get decals (under furniture). */
  blocked?: (tx: number, ty: number) => boolean;
  /** Extra wear lane 0..1 (the main walking route). */
  lane?: (x: number, y: number) => number;
}

interface Dec {
  x: number;
  y: number;
  kind: number;
}

/**
 * P-tiles 16px: two colours placed irregularly (not a checker), yellowed wax
 * clusters, scuff marks, peeled tiles showing the grey base (#9AA0A8) with
 * torn edges, masking-tape traces and a few small lost things (a mitten, a
 * hair tie, a toy car, a button, a marble).
 */
export function mallTiles(o: MallFloorOpts): FloorPainter {
  // decal list (world px), deterministic per map
  const decs: Dec[] = [];
  const rnd = (i: number, k: number) => ihash(i, k, o.seed + 77);
  for (let i = 0; i < Math.max(4, Math.floor((o.w * o.h) / 14)); i++) {
    const tx = 1 + (rnd(i, 1) % Math.max(1, o.w - 2));
    const ty = 3 + (rnd(i, 2) % Math.max(1, o.h - 4));
    if (o.blocked?.(tx, ty)) continue;
    decs.push({ x: tx * 16 + 2 + (rnd(i, 3) % 10), y: ty * 16 + 2 + (rnd(i, 4) % 10), kind: rnd(i, 5) % 9 });
  }
  const at = (x: number, y: number): string | null => {
    for (const d of decs) {
      const dx = x - d.x;
      const dy = y - d.y;
      if (dx < -2 || dy < -2 || dx > 8 || dy > 6) continue;
      switch (d.kind) {
        case 0: // scuff: two short dark arcs
          if ((dy === 0 && dx >= 0 && dx <= 5) || (dy === 1 && dx >= 4 && dx <= 7)) return P.steel;
          break;
        case 1: // masking tape trace (yellowed rectangle outline, 1 side torn)
          if (dx >= 0 && dx <= 7 && dy >= 0 && dy <= 2) return dy === 1 ? P.goldPale : P.paperGrid;
          break;
        case 2: // mitten (red wool, cuff white)
          if (dx >= 0 && dx <= 4 && dy >= 0 && dy <= 3) {
            if (dx === 4 && dy >= 2) return null;
            if (dx === 0 && dy === 0) return null;
            return dy === 3 ? P.white : dx === 0 ? P.vermLt : dy === 0 ? P.vermLt : P.verm;
          }
          if (dx === -1 && dy >= 1 && dy <= 2) return P.verm; // thumb
          if (dx >= 0 && dx <= 4 && dy === 4) return P.vermShade;
          break;
        case 3: // hair tie (yellow ring with a bead)
          if ((Math.abs(dx - 2) === 2 && dy >= 1 && dy <= 2) || (Math.abs(dy - 1.5) === 1.5 && dx >= 1 && dx <= 3)) return P.gold;
          if (dx === 5 && dy === 1) return P.crimson;
          break;
        case 4: // toy car (blue body, black wheels)
          if (dy >= 0 && dy <= 2 && dx >= 0 && dx <= 5) return dy === 0 ? P.aqua : P.blue;
          if (dy === 3 && (dx === 1 || dx === 4)) return P.ink;
          if (dy === 3 && dx >= 0 && dx <= 5) return P.navy;
          break;
        case 5: // button (brown, 4 holes)
          if (dx >= 0 && dx <= 2 && dy >= 0 && dy <= 2) return dx === 1 && dy === 1 ? P.woodDark : P.brassOld;
          break;
        case 6: // marble (glass: aqua with a glint)
          if (dx >= 0 && dx <= 2 && dy >= 0 && dy <= 2) return dx === 0 && dy === 0 ? P.glint : dx + dy >= 3 ? P.blue : P.aqua;
          break;
        default: // gum / dust
          if (dx >= 0 && dx <= 1 && dy >= 0 && dy <= 1) return P.asphalt;
      }
    }
    return null;
  };
  return (x, y) => {
    const tx = x >> 4;
    const ty = y >> 4;
    const lx = x & 15;
    const ly = y & 15;
    const hh = ihash(tx, ty, o.seed);
    // peeled tile: the grey base with a torn edge
    const peeled = hh % 53 === 0 && !o.blocked?.(tx, ty);
    if (peeled) {
      const edge = 3 + ((ihash(tx, ly, o.seed + 5) >>> 3) % 3);
      if (lx >= edge && ly >= 2 && ly <= 13 - ((lx * 7 + tx) % 3)) return lx === edge || ly === 2 ? P.asphalt : P.steel;
    }
    const d = at(x, y);
    if (d) return d;
    if (lx === 15 || ly === 15) return P.concrete;
    // irregular two-colour layout (not a checker): runs of the same colour
    // two tones laid irregularly (runs of 1–3 tiles), about half and half
    const tone = (ihash(tx >> 1, ty, o.seed + 1) + (hh % 5 === 0 ? 1 : 0)) % 2;
    const base = tone ? P.concrete : P.concreteLt;
    const lite = tone ? P.concreteLt : P.white;
    // yellowed wax (#F6D98A α15%): the pale tiles turn beige in soft patches
    const wax = valueNoise(x / 30, y / 30, o.seed + 2) + (o.lane ? o.lane(x, y) * 0.15 : 0);
    // tile bevel: lit top-left
    if (lx === 0 || ly === 0) return lite;
    // 2px scuff clusters from shoes along the lane
    const lane = o.lane ? o.lane(x, y) : 0;
    if (lane > 0.2 && (ihash(x >> 1, y >> 1, o.seed + 9) % 61) === 0) return P.steel;
    if (!tone && wax > 0.74) return P.paperGrid;
    if (!tone && wax > 0.68 && ((x + y) & 1) === 0) return P.paperGrid;
    // a faint 2px mottling so big areas don't look flat
    const m = h01(x >> 1, y >> 1, o.seed + 4);
    if (m < 0.03) return tone ? P.steel : P.concrete;
    return base;
  };
}

/** Wear lane helper: 1 on the given polyline of tile centres, fading over `r` px. */
export function laneOf(points: [number, number][], r = 20): (x: number, y: number) => number {
  const seg = points.slice(1).map((p, i) => [points[i][0] * 16 + 8, points[i][1] * 16 + 8, p[0] * 16 + 8, p[1] * 16 + 8]);
  return (x, y) => {
    let best = 1e9;
    for (const [ax, ay, bx, by] of seg) {
      const vx = bx - ax;
      const vy = by - ay;
      const l2 = vx * vx + vy * vy || 1;
      const t = Math.max(0, Math.min(1, ((x - ax) * vx + (y - ay) * vy) / l2));
      const d = Math.hypot(x - (ax + vx * t), y - (ay + vy * t));
      if (d < best) best = d;
    }
    return Math.max(0, 1 - best / r);
  };
}
