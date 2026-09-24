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
  /** Hand-placed decals for the big empty stretches (world px of their top-left). */
  decals?: MallDecal[];
}

/**
 * Larger floor decals that break up an empty stretch of tiles:
 * arrow — a faded floor sticker arrow (dir 0 →, 1 ↓, 2 ←, 3 ↑), its white edge peeling;
 * steps — a trail of dusty shoe prints (dir as arrow, n prints);
 * tape — the yellowed trace of curing tape, an L where a display once stood (w×h);
 * balloon — a deflated balloon with its curly string;
 * pot — the ring a flower pot left, a dead leaf or two.
 */
export interface MallDecal {
  x: number;
  y: number;
  kind: 'arrow' | 'steps' | 'tape' | 'balloon' | 'pot';
  dir?: number;
  w?: number;
  h?: number;
  n?: number;
  c?: string;
}

/** Pixel of a hand-placed mall decal at (dx, dy) from its top-left, or null. */
function mallDecalAt(d: MallDecal, dx: number, dy: number, seed: number): string | null {
  switch (d.kind) {
    case 'arrow': {
      // 15×9 arrow pointing east in its own frame, rotated by dir
      const dir = d.dir ?? 0;
      let ax = dx;
      let ay = dy;
      if (dir === 1) [ax, ay] = [dy, 8 - dx];
      else if (dir === 2) [ax, ay] = [14 - dx, 8 - dy];
      else if (dir === 3) [ax, ay] = [14 - dy, dx];
      if (ax < 0 || ay < 0 || ax > 14 || ay > 8) return null;
      const head = ax >= 8 && Math.abs(ay - 4) <= 14 - ax;
      const shaft = ax <= 8 && ay >= 2 && ay <= 6;
      const inHead = ax >= 9 && Math.abs(ay - 4) <= 12 - ax;
      const inShaft = ax >= 1 && ax <= 9 && ay >= 3 && ay <= 5;
      if (!head && !shaft) return null;
      // worn: scuffed out in the middle of the shaft, the white edge peeled at the tail
      const worn = ihash(ax >> 1, ay >> 1, seed) % 5 === 0;
      if (inHead || inShaft) return worn ? P.paperGrid : d.c ?? P.leafYoung;
      if (ax <= 2 && ay % 2 === 0) return null;
      return worn ? null : P.white;
    }
    case 'steps': {
      // dusty prints walking along dir, alternating left/right feet
      const n = d.n ?? 6;
      const dir = d.dir ?? 0;
      const along = dir === 0 || dir === 2 ? dx : dy;
      const across = dir === 0 || dir === 2 ? dy : dx;
      const i = Math.floor(along / 7);
      if (i < 0 || i >= n) return null;
      const la = along - i * 7;
      const side = i % 2 ? 0 : 3;
      const lc = across - side;
      if (lc < 0 || lc > 2 || la > 4) return null;
      // sole (3 px) and heel (2 px) with a gap between
      if (la === 2) return null;
      if ((lc === 0 || lc === 2) && (la === 0 || la === 4)) return null;
      const fade = i / n;
      return ihash(i, la + lc * 5, seed) % 4 === 0 && fade > 0.4 ? null : fade > 0.6 ? P.concrete : P.steel;
    }
    case 'tape': {
      // an L of yellowed tape residue, 3px wide, torn off in bits
      const w = d.w ?? 30;
      const h = d.h ?? 18;
      const onTop = dy >= 0 && dy <= 2 && dx >= 0 && dx < w;
      const onSide = dx >= 0 && dx <= 2 && dy >= 0 && dy < h;
      if (!onTop && !onSide) return null;
      const k = onTop ? dx : dy;
      if (ihash(k >> 2, 0, seed + 3) % 6 === 0) return null;
      const edge = onTop ? dy === 0 || dy === 2 : dx === 0 || dx === 2;
      return edge ? P.paperGrid : ihash(k, 1, seed) % 3 === 0 ? P.goldPale : P.paperGrid;
    }
    case 'balloon': {
      // a shrivelled red balloon (8×6), its knot and a curly string trailing east
      const bx = dx - 1;
      const by = dy - 1;
      const inB = ((bx - 3) / 3.6) ** 2 + ((by - 2.5) / 2.8) ** 2 <= 1;
      if (inB) {
        if (bx === 2 && by === 1) return P.vermLt;
        if (bx + by >= 7) return P.vermShade;
        return by === 2 && bx === 4 ? P.maroon : P.red;
      }
      if (bx === 7 && by === 2) return P.vermShade;
      if (bx >= 8 && bx <= 18) {
        const sy = 2 + Math.round(Math.sin((bx - 8) * 0.9) * 1.5);
        if (by === sy) return P.white;
      }
      return null;
    }
    case 'pot': {
      // a ring of grime 12×7 where a pot stood, the inside cleaner
      const rx = (dx - 6) / 6;
      const ry = (dy - 3.5) / 3.5;
      const r = rx * rx + ry * ry;
      if (r <= 1 && r >= 0.55) return ihash(dx, dy, seed) % 5 === 0 ? P.concrete : P.steel;
      if (r < 0.55) return (dx + dy) % 5 === 0 ? P.concreteLt : null;
      // a dead leaf blown against it
      if (dx === 13 && dy === 5) return P.woodLt;
      if (dx === 14 && dy === 5) return P.wood;
      return null;
    }
  }
  return null;
}

/**
 * A patch of peeled tiles: 1–3 tiles in a row or an L, or just a corner of
 * one, with a chipped edge; the grey base shows the adhesive's comb grooves
 * (arcs from the trowel), the tile's edge is a pale lip, a shadow under it.
 */
interface Peel {
  tiles: [number, number][];
  /** A corner chunk only (of the first tile): the corner index 0–3. */
  corner?: number;
  seed: number;
}

function peelAt(pl: Peel, x: number, y: number): string | null {
  const tx = x >> 4;
  const ty = y >> 4;
  if (!pl.tiles.some(([a, b]) => a === tx && b === ty)) return null;
  const lx = x & 15;
  const ly = y & 15;
  const inside = (xx: number, yy: number): boolean => {
    const ttx = xx >> 4;
    const tty = yy >> 4;
    if (!pl.tiles.some(([a, b]) => a === ttx && b === tty)) return false;
    const ux = xx & 15;
    const uy = yy & 15;
    // chipped boundary: the peel stops 1–4 px short of the grout, raggedly
    const j = (ihash(xx >> 1, yy >> 1, pl.seed) % 4) - 1;
    const first = ttx === pl.tiles[0][0] && tty === pl.tiles[0][1];
    if (first && pl.corner !== undefined) {
      const cx = pl.corner & 1 ? 15 - ux : ux;
      const cy = pl.corner & 2 ? 15 - uy : uy;
      return cx + cy + j < 11;
    }
    const inN = !pl.tiles.some(([a, b]) => a === ttx && b === tty - 1);
    const inS = !pl.tiles.some(([a, b]) => a === ttx && b === tty + 1);
    const inW = !pl.tiles.some(([a, b]) => a === ttx - 1 && b === tty);
    const inE = !pl.tiles.some(([a, b]) => a === ttx + 1 && b === tty);
    if (inN && uy < 1 + Math.max(0, j)) return false;
    if (inS && uy > 14 - Math.max(0, j)) return false;
    if (inW && ux < 1 + Math.max(0, j + 1)) return false;
    if (inE && ux > 14 - Math.max(0, j)) return false;
    return true;
  };
  if (!inside(x, y)) return null;
  // the remaining tile's lip casts a 1px shadow onto the base below / right of it
  if (!inside(x, y - 1) || !inside(x - 1, y)) return P.asphalt;
  // comb grooves: arcs of adhesive left by the trowel
  const gx = x - (pl.tiles[0][0] * 16 - 6);
  const gy = y - (pl.tiles[0][1] * 16 - 10);
  const rr = Math.sqrt(gx * gx + gy * gy);
  if (Math.floor(rr) % 3 === 0) return ihash(x, y, pl.seed + 1) % 4 === 0 ? P.steel : '#8A909A';
  // a leftover flake of the tile stuck to the glue
  if (ihash(x >> 1, y >> 1, pl.seed + 2) % 29 === 0) return P.concrete;
  void lx;
  void ly;
  return P.steel;
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
  // peeled patches: 2–3 per map, each its own size and shape
  const peels: Peel[] = [];
  for (let i = 0; i < 40 && peels.length < 2; i++) {
    const tx = 1 + (rnd(i, 21) % Math.max(1, o.w - 3));
    const ty = 3 + (rnd(i, 22) % Math.max(1, o.h - 5));
    // a whole tile, two side by side, or just a corner chunk of one
    const shape = [0, 1, 4, 4, 0][rnd(i, 23) % 5];
    const cand: [number, number][] = shape === 1 ? [[tx, ty], [tx + 1, ty]] : [[tx, ty]];
    if (cand.some(([a, b]) => o.blocked?.(a, b) || a >= o.w - 1 || b >= o.h - 1)) continue;
    if (peels.some((q) => q.tiles.some(([a, b]) => Math.abs(a - tx) < 6 && Math.abs(b - ty) < 4))) continue;
    peels.push({ tiles: cand, corner: shape === 4 ? rnd(i, 24) % 4 : undefined, seed: o.seed * 7 + i });
  }
  const hand = o.decals ?? [];
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
    // peeled tiles: the grey base with the adhesive's grooves, chipped edges
    for (const pl of peels) {
      const c = peelAt(pl, x, y);
      if (c) return c;
    }
    for (const hd of hand) {
      if (x < hd.x - 1 || y < hd.y - 1 || x > hd.x + 40 || y > hd.y + 44) continue;
      const c = mallDecalAt(hd, x - hd.x, y - hd.y, o.seed + hd.x * 3 + hd.y);
      if (c) return c;
    }
    const d = at(x, y);
    if (d) return d;
    if (lx === 15 || ly === 15) return P.concrete;
    // irregular two-colour layout (not a checker): runs of the same colour
    // two tones laid irregularly (runs of 1–3 tiles), about half and half
    let tone = (ihash(tx >> 1, ty, o.seed + 1) + (hh % 5 === 0 ? 1 : 0)) % 2;
    // the walking routes are worn to a pale, polished band (a large, soft
    // tone change across several tiles); the backwaters keep their grime
    const worn = o.lane ? o.lane(x, y) : 0;
    if (tone && worn > 0.45 + (valueNoise(x / 9, y / 9, o.seed + 6) - 0.5) * 0.4) tone = 0;
    const grime = !tone && worn < 0.05 && valueNoise(x / 46, y / 38, o.seed + 7) > 0.66;
    const base = tone || grime ? P.concrete : P.concreteLt;
    const lite = tone ? P.concreteLt : P.white;
    // yellowed wax (#F6D98A α15%): the pale tiles turn beige in soft patches
    const wax = valueNoise(x / 30, y / 30, o.seed + 2) + (o.lane ? o.lane(x, y) * 0.15 : 0);
    // tile bevel: lit top-left
    if (lx === 0 || ly === 0) return lite;
    // 2px scuff clusters from shoes along the lane
    const lane = o.lane ? o.lane(x, y) : 0;
    if (lane > 0.2 && (ihash(x >> 1, y >> 1, o.seed + 9) % 61) === 0) return P.steel;
    if (!tone && wax > 0.74) return P.paperGrid;
    if (!tone && wax > 0.68 && h01(x >> 1, y >> 1, o.seed + 5) < (wax - 0.68) / 0.06) return P.paperGrid;
    // a faint mottling so big areas don't look flat: sparse 2px chips in the
    // tile's own family (a pale chip on the dark tiles, a mid chip on the pale
    // ones), clustered in a few tiles instead of sprinkled evenly
    const busy = (hh >>> 7) % 5 === 0;
    const m = h01(x >> 1, y >> 1, o.seed + 4);
    if (m < (busy ? 0.035 : 0.006)) return tone ? (m < 0.002 ? P.steel : P.concreteLt) : P.concrete;
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

// ---------------------------------------------------------------- hand-placed floor decals (shops)

export type ShopDecal =
  | 'coin' // a 10-yen coin (3×2, rim lit)
  | 'lint' // a ball of lint
  | 'sock' // one lost sock (5×3, a stripe)
  | 'sheet' // a used dryer sheet
  | 'powder' // spilt detergent (blue-white grains)
  | 'hairtie' // a hair tie
  | 'drops' // a trail of water drops from a wet basket
  | 'print' // a wet shoe print (grey sole and heel)
  | 'band' // a rubber band
  | 'leaf' // a dead leaf blown in from the door
  | 'clip' // a paper clip
  | 'heel' // a black rubber heel mark
  | 'crack'; // a crack running across a tile

export interface ShopDecalAt {
  x: number;
  y: number;
  k: ShopDecal;
  /** Mirror / rotate variant. */
  v?: number;
}

/** Pixel of a hand-placed decal list at (x, y), or null. */
export function shopDecals(list: ShopDecalAt[]): (x: number, y: number) => string | null {
  return (x, y) => {
    for (const d of list) {
      const dx = x - d.x;
      const dy = y - d.y;
      if (dx < -1 || dy < -1 || dx > 12 || dy > 8) continue;
      const v = d.v ?? 0;
      switch (d.k) {
        case 'coin':
          if (dy === 0 && dx >= 0 && dx <= 2) return dx === 0 ? P.goldPale : P.brass;
          if (dy === 1 && dx >= 0 && dx <= 2) return dx === 2 ? P.brassOld : P.brass;
          if (dy === 2 && dx >= 1 && dx <= 2) return P.steel;
          break;
        case 'lint':
          if (dx >= 0 && dx <= 1 && dy >= 0 && dy <= 1) return dx + dy === 2 ? P.steel : P.concreteLt;
          if (dx === 2 && dy === 1) return P.concrete;
          break;
        case 'sock': {
          const sx = v ? 5 - dx : dx;
          if (dy === 0 && sx >= 0 && sx <= 3) return sx === 1 ? P.crimson : P.white;
          if (dy === 1 && sx >= 0 && sx <= 5) return sx === 1 ? P.crimson : sx >= 4 ? P.concreteLt : P.white;
          if (dy === 2 && sx >= 3 && sx <= 5) return P.concrete;
          break;
        }
        case 'sheet':
          if (dx >= 0 && dx <= 5 && dy >= 0 && dy <= 3 && !(dx === 5 && dy === 0)) return dy === 3 || dx === 5 ? P.concreteLt : P.glint;
          break;
        case 'powder':
          if (dx >= 0 && dx <= 8 && dy >= 0 && dy <= 4) {
            const h = ihash(x, y, 777) % 7;
            if ((dx - 4) ** 2 / 16 + (dy - 2) ** 2 / 4 < 1 && h < 3) return h === 0 ? P.aqua : P.glint;
          }
          break;
        case 'hairtie':
          if ((dy === 0 || dy === 2) && dx >= 1 && dx <= 2) return P.crimson;
          if (dy === 1 && (dx === 0 || dx === 3)) return P.crimson;
          break;
        case 'drops':
          if (dy >= 0 && dy <= 6 && dx >= 0 && dx <= 10 && ihash(dx, dy, 781 + v) % 13 === 0 && ((dx + dy) & 1) === 0) return P.concrete;
          break;
        case 'print': {
          // a sole (4×5) and a heel (4×2) below it, in damp grey
          const sx = dx;
          if (sx >= 0 && sx <= 3 && dy >= 0 && dy <= 3 && !(dy === 0 && (sx === 0 || sx === 3))) return (sx + dy) % 3 === 0 ? P.concrete : P.steel;
          if (sx >= 0 && sx <= 3 && dy >= 5 && dy <= 6) return P.steel;
          break;
        }
        case 'band':
          if ((dy === 0 && dx >= 1 && dx <= 3) || (dy === 2 && dx >= 0 && dx <= 2)) return P.woodLt;
          if (dy === 1 && (dx === 0 || dx === 4)) return P.woodLt;
          break;
        case 'leaf':
          if (dy === 0 && dx >= 1 && dx <= 2) return P.brass;
          if (dy === 1 && dx >= 0 && dx <= 3) return dx === 3 ? P.brassOld : P.woodLt;
          if (dy === 2 && dx >= 2 && dx <= 4) return dx === 4 ? P.wood : P.brassOld;
          break;
        case 'clip':
          if ((dy === 0 || dy === 2) && dx >= 0 && dx <= 3) return P.steel;
          if (dy === 1 && dx === 0) return P.steel;
          break;
        case 'heel':
          if (dy === 0 && dx >= 1 && dx <= 3) return P.asphalt;
          if (dy === 1 && (dx === 0 || dx === 4)) return P.asphalt;
          break;
        case 'crack':
          if (dx >= 0 && dx <= 9 && dy === Math.floor(dx / 3) + (v && dx > 5 ? -1 : 0)) return P.steel;
          break;
      }
    }
    return null;
  };
}

/**
 * The laundromat's floor (review round 1: the flat two-tone grid read as
 * fill): 16px vinyl tiles in a cream / pale-grey checker with thin grimy
 * grout, a sun-yellowed replacement tile here and there, cracks, grime
 * collecting along the skirting (dithered), polished wear along the walking
 * lane, rubber heel scuffs, and the hand-placed things people leave.
 */
export function laundryFloor(seed: number, lane: (x: number, y: number) => number, edge: (x: number, y: number) => number, decals: ShopDecalAt[]): FloorPainter {
  const dec = shopDecals(decals);
  return (x, y) => {
    const d = dec(x, y);
    if (d) return d;
    const tx = x >> 4;
    const ty = y >> 4;
    const lx = x & 15;
    const ly = y & 15;
    const hh = ihash(tx, ty, seed);
    const e = edge(x, y);
    if (lx === 15 || ly === 15) return e > 0.5 ? P.steel : P.concrete;
    const cream = ((tx + ty) & 1) === 0;
    let base: string = cream ? P.white : P.concreteLt;
    let lite: string = cream ? P.glint : P.white;
    let dark: string = cream ? P.concreteLt : P.concrete;
    if (hh % 9 === 4) {
      // a sun-yellowed replacement tile
      base = P.paper;
      lite = P.glint;
      dark = P.paperGrid;
    }
    if (lx === 0 || ly === 0) return lite;
    // grime along the walls (2px clusters)
    if (e > 0.45 && ihash(x >> 1, y >> 1, seed + 5) % (e > 0.8 ? 2 : 3) === 0) return dark;
    // a crack across a few tiles
    if (hh % 13 === 5 && ly === 3 + Math.floor(lx / 3) && lx > 1 && lx < 13) return P.steel;
    // the grey tiles are speckled vinyl (2px flecks), the cream ones plain
    const f = ihash(x >> 1, y >> 1, seed + 11) % 23;
    if (!cream && f === 0) return P.concrete;
    if (!cream && f === 1) return P.white;
    const w = lane(x, y);
    // polished lane: 2px sheen flecks; elsewhere a few soft stains
    const n = valueNoise(x / 7, y / 5, seed + 3);
    if (w > 0.45 && n > 0.66 && (((x >> 1) + (y >> 1)) & 1) === 0) return lite;
    if (w < 0.25 && n > 0.84) return dark;
    // black heel scuffs (short arcs), mostly along the lane
    const s = ihash(x >> 2, y >> 1, seed + 9);
    if (s % (w > 0.3 ? 97 : 211) === 0 && (x & 3) < 3) return P.asphalt;
    return base;
  };
}

/**
 * The koban's floor: grey terrazzo in 16px tiles (8px tiles in a border
 * round the walls), grey grout, three slab tones, stone chips (grey, white,
 * a few warm and dark ones), a polished path from the door to the desk, heel
 * marks, and the hand-placed decals.
 */
export function kobanFloor(seed: number, lane: (x: number, y: number) => number, border: (x: number, y: number) => boolean, decals: ShopDecalAt[]): FloorPainter {
  const dec = shopDecals(decals);
  return (x, y) => {
    const d = dec(x, y);
    if (d) return d;
    const small = border(x, y);
    const sz = small ? 8 : 16;
    const lx = x % sz;
    const ly = y % sz;
    const tx = Math.floor(x / sz);
    const ty = Math.floor(y / sz);
    if (lx === sz - 1 || ly === sz - 1) return P.steel;
    const hh = ihash(tx + (small ? 1000 : 0), ty, seed);
    const tone = hh % 3;
    const w = lane(x, y);
    if (lx === 0 || ly === 0) return tone === 2 ? P.concrete : P.concreteLt;
    // chips: a hash per 1–2px cell; the polished lane shows fewer
    const c = ihash(x >> 1, y >> 1, seed + 1);
    const cw = w > 0.4 ? 2 : 1;
    if (c % Math.round(61 * cw) === 0) return P.steel;
    if (c % Math.round(89 * cw) === 7) return P.white;
    if (c % 211 === 11) return P.skin4;
    if (c % 307 === 13) return P.asphalt;
    // slab tones: more pale chips on some slabs, more grey chips on others
    const c2 = ihash(x >> 1, y >> 1, seed + 2) % 23;
    if (tone === 0 && c2 === 0) return P.concreteLt;
    if (tone === 2 && c2 === 0) return P.steel;
    // the polished path: a sheen (2px flecks)
    if (w > 0.5 && valueNoise(x / 6, y / 4, seed + 7) > 0.6 && (((x >> 1) + (y >> 1)) & 1) === 0) return P.concreteLt;
    // heel marks
    const s = ihash(x >> 2, y >> 1, seed + 9);
    if (s % 173 === 0 && (x & 3) < 3) return P.asphalt;
    return P.concrete;
  };
}
