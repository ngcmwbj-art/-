// The building and the street round a shop interior (review round 1: the
// 9–12×7 shops floated small in the middle of a flat dark screen). The room
// shell is set into a larger canvas that shows, from above, what is really
// outside that door on map_town:
//
//   - the street in front: the town's own ground baked from the tiles in
//     front of the shop's door (arcade mosaic, river-road pavers, curb and
//     asphalt) with the town's own things standing on it (pillars, benches,
//     poles, the buildings across the way) and the shop's listed extras;
//   - the building itself: the outer skin of the walls round the 4px wall
//     sections, the eave of the roof over the back wall;
//   - the neighbours on either side (the next door and the one after, their
//     roofs from above with a condenser or an aerial, the alley between) and
//     the houses of the next street behind, across a narrow back alley;
//   - the shop's own things outside (a bike, the red lamp...), painted by each shop;
//   - evening shade over all of it, stepping down towards the screen's edge
//     in flat steps joined by 1–2px checker bands (7.9), the street by the
//     door brightest.
//
// QA round 2: rooms are shown at 1× like everything else, so the outside
// fills the whole screen (extMargins) instead of the old 2× view's margins.
//
// At run time exteriorOver() tints the outside with the stage's outdoor grade
// and throws the shop's warm light out of the door onto the street.

import { Gfx } from '../../engine/gfx';
import { makeCanvas, PixelCanvas, rgba32 } from '../../engine/pixel';
import { H as SH, W as SW } from '../../engine/screen';
import { bakeGround } from '../tiles/ground';
import { ihash, valueNoise } from '../tiles/noise';
import { P } from '../tiles/palette';
import { loadMap, type LoadedMap } from '../../world/maps';
import { GroundCache } from '../../world/ground_cache';
import { buildStructures } from '../../world/structures';
import { css, GRADES } from '../../world/lighting';
import { ROOM_SLIDE } from '../../world/roomview';
import { charSprite, idleFrame } from '../chars';
import { getProp, hasProp } from './registry';
import { dk, lt } from './kit';
import { tintSpill } from './ishell';
import type { PropEnv } from './types';

/** Smallest margins (px) of the outside round the room canvas. */
export const EXT = { l: 48, r: 48, t: 28, b: 40 };

/**
 * Margins of the drawn outside round a W×H room shown at 1× by a fixed,
 * centred camera: past every edge of the screen, and a dialog's slide
 * (ROOM_SLIDE) further up and down.
 */
export function extMargins(W: number, H: number): { l: number; r: number; t: number; b: number } {
  const sx = Math.ceil((SW - W) / 2) + 16;
  const sy = Math.ceil((SH - H) / 2) + ROOM_SLIDE + 8;
  return { l: Math.max(EXT.l, sx), r: Math.max(EXT.r, sx), t: Math.max(EXT.t, sy), b: Math.max(EXT.b, sy) };
}

/** A neighbour's shop front along the street: the wall's edge and an awning. */
export interface Facade {
  /** Front wall / roof edge colour. */
  skin: string;
  /** Awning stripes (seen from above), if it has one. */
  awning?: [string, string];
  /** Its roof seen from above. */
  roof: 'kawara' | 'tin' | 'slab';
}

export interface ExtPainter {
  /** The whole exterior canvas (room not yet set in). */
  p: PixelCanvas;
  /** Room origin inside p. */
  ox: number;
  oy: number;
  /** Room size (px). */
  W: number;
  H: number;
  /** p's y of the street's top edge (the foot of the facade). */
  street: number;
  /** p's x of the door's centre. */
  door: number;
}

export interface ExteriorSpec {
  rows: string[];
  /** The shop's door on map_town (tile of its D cell). */
  town: [number, number];
  /** Outer skin of the walls: lit, base, shade. */
  skin: [string, string, string];
  roof: 'kawara' | 'tin' | 'slab';
  left: Facade;
  right: Facade;
  seed: number;
  /**
   * The town's own props in front of this shop, at their map_town tiles
   * (baked as they stand there: pillars with lanterns, the gacha, the
   * vending machine...). `sprite` bakes a field character instead (the cow
   * statue); `dy` moves one down (px) off the facade row.
   */
  props?: { id: string; tx: number; ty: number; opts?: Record<string, unknown>; sprite?: boolean; dy?: number }[];
  /** Town props (ids) not to bake even though they stand in front (e.g. the building the room is inside). */
  skip?: string[];
  /** Things outside this shop (painted before the shade and the fade). */
  paint?: (e: ExtPainter) => void;
}

export interface Exterior {
  p: PixelCanvas;
  glass: PixelCanvas;
  /** Offset of the canvas from the map origin (negative). */
  ox: number;
  oy: number;
  W: number;
  H: number;
  /** Door centre x and the street's top edge, in map px. */
  doorX: number;
  streetY: number;
}

let townCache: GroundCache | null = null;
export function townGround(): GroundCache | null {
  if (townCache) return townCache;
  const m = loadMap('map_town');
  if (!m) return null;
  townCache = new GroundCache(m);
  return townCache;
}

type RoofKind = Facade['roof'];

/** A roof seen from above, as a colour per pixel (x, y in canvas px). */
export function roofPx(kind: RoofKind, x: number, y: number, seed: number, base?: string): string {
  switch (kind) {
    case 'kawara': {
      // grey-blue tiles from above: rounded columns running down the slope
      // (lit crest, dark groove), each course overlapping the next
      const col = Math.floor(x / 5);
      const lx = x % 5;
      const ly = (y + (col % 2)) % 7;
      if (lx === 4) return P.ink;
      if (ly === 6) return lx === 0 ? P.ink : P.nightShade;
      if (lx === 1) return ly === 0 ? P.steel : P.asphalt;
      return ihash(col, Math.floor((y + (col % 2)) / 7), seed) % 6 === 0 ? P.shade : P.charcoal;
    }
    case 'tin': {
      // corrugated sheet running north–south, rust creeping from the seams
      const lx = x % 4;
      const rust = valueNoise(x / 5, y / 9, seed) > 0.7;
      const c = base ?? P.asphalt;
      if (lx === 0) return lt(c);
      if (lx === 3) return dk(c);
      return rust ? P.brassOld : c;
    }
    default: {
      // flat concrete roof: sheet waterproofing seams, rain stains in a
      // fine checker (not blotches)
      if (y % 12 === 0) return P.steel;
      if (x % 24 === 0) return P.steel;
      const n = valueNoise(x / 4, y / 3, seed);
      if (n > 0.76 && (x + y) % 2 === 0) return P.steel;
      return base ?? P.concrete;
    }
  }
}

/** One roof block from above: its covering, a ridge, an outlined edge and a thing or two on it. */
function roofBlock(p: PixelCanvas, x0: number, y0: number, x1: number, y1: number, f: Facade, seed: number, frontEdge: boolean): void {
  if (x1 <= x0 || y1 <= y0) return;
  const base = f.roof === 'tin' ? f.skin : undefined;
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) p.set(x, y, roofPx(f.roof, x, y, seed, base));
  // a gabled roof shows its ridge (棟) running along the street
  if (f.roof !== 'slab' && y1 - y0 > 18) {
    const ry = y0 + Math.round((y1 - y0) * 0.42);
    for (let x = x0; x < x1; x++) {
      p.set(x, ry - 1, f.roof === 'kawara' ? P.asphalt : lt(f.skin));
      p.set(x, ry, f.roof === 'kawara' ? P.steel : lt(f.skin, 2));
      p.set(x, ry + 1, P.ink);
    }
  }
  // edges: dark on the far sides, the drip edge along the back
  for (let y = y0; y < y1; y++) {
    p.set(x0, y, P.ink);
    p.set(x1 - 1, y, P.ink);
  }
  for (let x = x0; x < x1; x++) {
    p.set(x, y0, P.ink);
    if (!frontEdge) p.set(x, y1 - 1, P.ink);
  }
  // rooftop things (deterministic per block)
  const w = x1 - x0;
  const h = y1 - y0;
  const r = ihash(x0, y0, seed);
  if (w < 20 || h < 16) return;
  const tx = x0 + 4 + (r % Math.max(1, w - 18));
  const ty = y0 + 4 + ((r >>> 5) % Math.max(1, h - 16));
  switch (r % 4) {
    case 0:
    case 1: {
      // an air-conditioner's outdoor unit: a grey box with its round grille
      p.rect(tx, ty, 11, 7, P.concreteLt);
      p.hline(tx, tx + 10, ty, P.white);
      p.ring(tx + 7.5, ty + 3.5, 2.5, 2.5, P.steel);
      p.set(tx + 7, ty + 3, P.charcoal);
      p.rect(tx + 1, ty + 2, 3, 1, P.steel);
      p.rect(tx + 1, ty + 4, 3, 1, P.steel);
      p.hline(tx, tx + 10, ty + 7, P.ink);
      p.vline(tx + 11, ty + 1, ty + 7, P.ink);
      break;
    }
    case 2: {
      // a TV aerial on a short mast, its shadow falling east
      p.vline(tx + 5, ty, ty + 10, P.steel);
      for (const [dy, hw] of [[1, 4], [4, 3], [7, 2]] as const) {
        p.hline(tx + 5 - hw, tx + 5 + hw, ty + dy, P.concrete);
        p.hline(tx + 7 - hw, tx + 7 + hw, ty + dy + 1, P.ink);
      }
      p.set(tx + 5, ty + 10, P.ink);
      break;
    }
    default: {
      if (f.roof === 'slab') {
        // an elevated water tank: a round lid on legs
        p.ellipse(tx + 5, ty + 5, 5, 4, P.concrete);
        p.ring(tx + 5, ty + 5, 5, 4, P.steel);
        p.hline(tx + 2, tx + 7, ty + 3, P.white);
        p.hline(tx + 1, tx + 9, ty + 10, P.ink);
      } else {
        // a skylight: a pale pane in a dark frame
        p.rect(tx, ty, 9, 6, P.ink);
        p.rect(tx + 1, ty + 1, 7, 4, P.shade);
        p.hline(tx + 1, tx + 6, ty + 1, P.lilac);
      }
    }
  }
}

/** The neighbour after the next door: the same street, a different house (roof, front, awning). */
function farOf(f: Facade, seed: number): Facade {
  const roofs: RoofKind[] = ['kawara', 'tin', 'slab'];
  const roof = roofs[(roofs.indexOf(f.roof) + 1 + (seed % 2)) % 3];
  const skins = [P.concreteLt, P.paper, P.woodLt, P.concrete, P.goldPale];
  const skin = roof === 'tin' ? [P.asphalt, P.leafShade, P.maroon][seed % 3] : skins[seed % skins.length];
  const awnings: ([string, string] | undefined)[] = [undefined, [P.leafDeep, P.white], undefined, [P.navy, P.concreteLt], [P.brass, P.white]];
  return { skin, roof, awning: awnings[(seed >>> 3) % awnings.length] };
}

/**
 * Build the room shell set into its surroundings. `room` / `glass` are the
 * shell canvases (map size); the result is larger by extMargins() on every side.
 */
export function withExterior(room: PixelCanvas, glass: PixelCanvas, s: ExteriorSpec): Exterior {
  const W = room.w;
  const H = room.h;
  const { l: L, r: R, t: T, b: B } = extMargins(W, H);
  const EW = W + L + R;
  const EH = H + T + B;
  const p = new PixelCanvas(EW, EH);
  const last = [...s.rows[s.rows.length - 1]];
  const doorTx = Math.max(0, last.indexOf('D'));
  const doorCx = L + doorTx * 16 + 8;
  // building (room px): the side walls' outer faces
  const bx0 = 12;
  const bx1 = W - 12;
  // the front wall's outer face is at H - 12; the street starts 3px below it
  const street = T + H - 9;
  // our row of buildings runs back to the back alley
  const back = T - 11;
  const alleyTop = back - 9;
  // ---- 1. the street: the town's own ground in front of the door
  const tg = townGround();
  const [tdx, tdy] = s.town;
  if (tg) {
    const src = tg.src;
    const wrap = {
      ...src,
      // under the facades the street's first row carries on (it is covered anyway)
      ground: (tx: number, ty: number) => src.ground(tx, Math.max(ty, tdy + 1)),
    };
    const x0 = (tdx - doorTx) * 16 - L;
    const y0 = (tdy + 1) * 16 - 12;
    const gp = bakeGround(wrap, x0, y0, EW, EH - (street - 3));
    p.blit(gp, 0, street - 3);
  } else p.rect(0, street - 3, EW, EH - street + 3, P.shade);
  // ---- 2. the neighbours either side: the next door, an alley, the one after
  const blocks: { x0: number; x1: number; f: Facade }[] = [];
  const gapW = 6;
  const nearW = (k: number) => 60 + ((s.seed >>> k) % 4) * 10;
  {
    // west
    let x1 = L + bx0 - 4 - gapW;
    let f = s.left;
    for (let k = 0; x1 > 0; k++) {
      const x0 = k === 0 ? x1 - nearW(1) : x1 - 70 - ((s.seed >>> (4 + k)) % 3) * 14;
      blocks.push({ x0: Math.max(0, x0), x1, f });
      x1 = x0 - gapW;
      f = farOf(f, s.seed + k * 13 + 1);
    }
    // east
    let x0 = L + bx1 + 4 + gapW;
    f = s.right;
    for (let k = 0; x0 < EW; k++) {
      const xe = k === 0 ? x0 + nearW(2) : x0 + 70 + ((s.seed >>> (6 + k)) % 3) * 14;
      blocks.push({ x0, x1: Math.min(EW, xe), f });
      x0 = xe + gapW;
      f = farOf(f, s.seed + k * 17 + 2);
    }
  }
  // the alleys between the buildings (dark, a drain grate now and then)
  for (let y = back; y < street - 3; y++)
    for (let x = 0; x < EW; x++) {
      const rx = x - L;
      if (rx >= bx0 - 4 && rx < bx1 + 4) continue;
      p.set(x, y, (y + x) % 7 === 0 ? P.nightShade : P.ink);
    }
  blocks.forEach((b, i) => roofBlock(p, b.x0, back, b.x1, street - 3, b.f, s.seed + 31 * i + (b.x0 < L ? 1 : 2), true));
  // ---- 3. behind: a back alley, then the houses of the next street
  for (let y = alleyTop; y < back; y++)
    for (let x = 0; x < EW; x++) {
      let c: string = (x * 3 + y) % 11 === 0 ? P.nightShade : P.ink;
      // the drain channel down the middle of the alley
      if (y === alleyTop + 4) c = x % 6 === 0 ? P.charcoal : P.nightShade;
      p.set(x, y, c);
    }
  {
    let x0 = -((s.seed >>> 3) % 40);
    for (let k = 0; x0 < EW; k++) {
      const w = 56 + ((s.seed >>> (k % 9)) % 5) * 12;
      const f = farOf(k % 2 ? s.right : s.left, s.seed + k * 7 + 5);
      roofBlock(p, Math.max(0, x0), 0, Math.min(EW, x0 + w), alleyTop - 1, f, s.seed + 101 + k * 11, false);
      // their eave and gutter over the alley, and its shadow
      for (let x = Math.max(0, x0); x < Math.min(EW, x0 + w); x++) {
        p.set(x, alleyTop - 1, P.steel);
        if (alleyTop < EH) p.set(x, alleyTop, P.void);
      }
      x0 += w + 5;
    }
  }
  // ---- 4. the fronts along the street: neighbours' walls and awnings, ours
  const blockAt = (x: number) => blocks.find((b) => x >= b.x0 && x < b.x1);
  for (let x = 0; x < EW; x++) {
    const rx = x - L;
    const ours = rx >= bx0 - 3 && rx < bx1 + 3;
    const nb = ours ? null : blockAt(x);
    if (!ours && !nb) {
      // an alley's mouth: the dark goes on to the street
      for (let j = 0; j < 3; j++) p.set(x, street - 3 + j, j === 2 ? P.nightShade : P.ink);
      continue;
    }
    const col = ours ? s.skin[1] : nb!.f.skin;
    p.set(x, street - 3, ours ? s.skin[0] : lt(col));
    p.set(x, street - 2, col);
    p.set(x, street - 1, ours ? s.skin[2] : dk(col));
    const aw = nb?.f.awning;
    if (nb && aw) {
      // an awning over the neighbour's front: stripes, a scalloped hem, its shadow
      if (x < nb.x0 + 2 || x >= nb.x1 - 2) continue;
      const [a, b] = aw;
      for (let j = 0; j < 7; j++) {
        const stripe = Math.floor((x + 2) / 5) % 2 ? a : b;
        p.set(x, street - 3 + j, j === 0 ? lt(stripe) : j === 6 ? dk(stripe) : stripe);
      }
      if (x % 5 < 3) p.set(x, street + 4, dk(Math.floor((x + 2) / 5) % 2 ? a : b));
      p.set(x, street + 5, P.nightShade);
      if (x % 5 < 3) p.set(x, street + 6, P.nightShade);
    }
  }
  // ---- 5. our walls' outer skin (3px round the sections) and the back eave
  const [sLt, sBase, sDk] = s.skin;
  for (let y = T - 3; y < street - 3; y++) {
    for (let i = 0; i < 3; i++) {
      p.set(L + bx0 - 3 + i, y, i === 0 ? sLt : sBase);
      p.set(L + bx1 + i, y, i === 2 ? sDk : sBase);
    }
    p.set(L + bx0 - 4, y, P.ink);
    p.set(L + bx1 + 3, y, P.ink);
  }
  // our roof behind the back wall, back to the alley
  for (let y = back; y < T - 9; y++) for (let x = L + bx0 - 4; x < L + bx1 + 4; x++) p.set(x, y, roofPx(s.roof, x, y, s.seed + 5, s.roof === 'tin' ? P.steel : undefined));
  for (let x = L + bx0 - 4; x < L + bx1 + 4; x++) {
    p.set(x, back, P.ink);
    p.set(x, T - 3, sLt);
    p.set(x, T - 2, sBase);
    p.set(x, T - 1, sBase);
  }
  // the eave of our roof, just over the back wall's top (overhanging 3px)
  for (let y = T - 9; y < T - 3; y++)
    for (let x = L + bx0 - 7; x < L + bx1 + 7; x++) {
      const j = y - (T - 9);
      let c = roofPx(s.roof, x, y, s.seed + 5, s.roof === 'tin' ? P.steel : undefined);
      if (j === 5) c = P.ink;
      else if (s.roof === 'kawara' && j === 4) c = x % 4 < 2 ? P.asphalt : P.charcoal;
      else if (s.roof !== 'kawara' && j === 4) c = P.charcoal;
      if (x === L + bx0 - 7 || x === L + bx1 + 6) c = P.ink;
      p.set(x, y, c);
    }
  // the gutter along the eave, and a downpipe at the back corner
  p.hline(L + bx0 - 7, L + bx1 + 6, T - 10, P.steel);
  const pipeX = L + bx1 + 4;
  for (let y = T - 10; y < street - 3; y++) {
    p.set(pipeX, y, P.steel);
    p.set(pipeX + 1, y, P.asphalt);
    if (y % 14 === 3) p.set(pipeX + 1, y, P.charcoal);
  }
  // ---- 6. the town's things in front of the shop, then the shop's own things
  const x0t = tdx - doorTx - Math.ceil(L / 16) - 1;
  const x1t = tdx - doorTx + Math.ceil((W + R) / 16) + 1;
  const y1t = tdy + 1 + Math.ceil(B / 16) + 6;
  const list = townThings(s, tdy + 1, x0t, x1t, y1t);
  bakeTownProps(p, list, (tx) => L + (tx - (tdx - doorTx)) * 16, (ty) => T + H + (ty - tdy - 1) * 16, street - 3);
  s.paint?.({ p, ox: L, oy: T, W, H, street, door: doorCx });
  // ---- 7. evening shade, darker in steps towards the screen's edge
  shadeAndFade(p, { cx: L + W / 2, cy: T + H / 2, doorCx, street, W, roofs: true });
  // ---- 8. the room on top, then the doorstep outside the door (street, a step)
  const outside = p.clone();
  p.blit(room, L, T);
  for (let y = T + H - 5; y < T + H; y++) for (let x = doorCx - 8; x < doorCx + 8; x++) p.set(x, y, outside.get(x, y));
  // a worn concrete step in front of the door
  for (let x = doorCx - 9; x <= doorCx + 8; x++) {
    p.set(x, T + H - 5, x === doorCx - 9 ? P.steel : P.concreteLt);
    p.set(x, T + H - 4, x === doorCx - 9 || x === doorCx + 8 ? P.steel : P.concrete);
    p.set(x, T + H - 3, P.asphalt);
  }
  for (let x = doorCx - 7; x < doorCx + 7; x += 5) p.set(x, T + H - 4, P.steel);
  const g2 = new PixelCanvas(EW, EH);
  g2.blit(glass, L, T);
  return { p, glass: g2, ox: -L, oy: -T, W, H, doorX: doorCx - L, streetY: street - T };
}

export type Baked = NonNullable<ExteriorSpec['props']>[number] & { wall?: boolean };

/**
 * What stands on the town's street in front of the shop (rows y0..y1,
 * columns x0..x1): the listed extras first, then every prop and wall of
 * map_town there that is always present (no stage condition), so the view
 * out of the door is the real street.
 */
export function townThings(s: Pick<ExteriorSpec, 'props' | 'skip'>, y0: number, x0: number, x1: number, y1: number): Baked[] {
  const out: Baked[] = [...(s.props ?? [])];
  const seen = new Set(out.map((o) => `${o.id}@${o.tx},${o.ty}`));
  const m = loadMap('map_town');
  if (!m) return out;
  const skip = new Set(s.skip ?? []);
  for (const o of m.objects) {
    if (o.t !== 'prop' && o.t !== 'obj') continue;
    if (o.cond) continue;
    const id = o.t === 'prop' ? o.prop : (o.prop ?? o.id);
    if (!hasProp(id) || skip.has(id)) continue;
    if (o.y < y0 || o.y > y1 || o.x < x0 - 3 || o.x > x1) continue;
    const key = `${id}@${o.x},${o.y}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ id, tx: o.x, ty: o.y, opts: o.opts });
  }
  for (const st of walls(m)) if (st.ty >= y0 && st.ty <= y1 && st.tx >= x0 - 1 && st.tx <= x1) out.push({ id: '', tx: st.tx, ty: st.ty, wall: true });
  return out;
}

let wallCache: ReturnType<typeof buildStructures> | null = null;
function walls(m: LoadedMap): ReturnType<typeof buildStructures> {
  wallCache ??= buildStructures(m);
  return wallCache;
}

/** A still, stage-0 environment for baking the town's props once. */
function bakeEnv(seed: number): PropEnv {
  return { t: 0, stage: 0, grade: GRADES[0], motion: 1, mt: 0, flag: () => 0, seed, near: 999, px: -999, py: -999 };
}

/**
 * Draw the town's props (their image and over() parts: lanterns, flags) and
 * walls into a scratch canvas at their tiles, in the town's depth order, and
 * lay the result into the exterior below `top` (the facade line: nothing of
 * the street is drawn over the roofs, except what leans on the fronts).
 */
export function bakeTownProps(p: PixelCanvas, list: Baked[], xOf: (tx: number) => number, yOf: (ty: number) => number, top: number): void {
  const [c, ctx] = makeCanvas(p.w, p.h, { willReadFrequently: true });
  const g = new Gfx(ctx, p.w, p.h);
  const m = loadMap('map_town');
  const items: { foot: number; flat: boolean; draw: () => void }[] = [];
  list.forEach((o, i) => {
    const x = xOf(o.tx);
    const y = yOf(o.ty) + (o.dy ?? 0);
    if (o.wall) {
      const st = m ? walls(m).find((w) => w.tx === o.tx && w.ty === o.ty) : undefined;
      if (st) items.push({ foot: y + 16, flat: false, draw: () => ctx.drawImage(st.art.img, x + st.art.ox, y + st.art.oy) });
      return;
    }
    if (o.sprite) {
      // a field character standing on the tile (feet at the tile's bottom centre)
      const img = idleFrame(charSprite(o.id), 'down', 0);
      items.push({ foot: y + 16, flat: false, draw: () => ctx.drawImage(img, Math.round(x + 8 - img.width / 2), Math.round(y + 16 - img.height)) });
      return;
    }
    const a = getProp(o.id, o.opts ?? {});
    if (!a) return;
    const env = bakeEnv(i * 7 + 3);
    items.push({
      foot: y + a.foot,
      flat: !!a.flat,
      draw: () => {
        const img = a.img(env);
        if (img) ctx.drawImage(img, x + a.ox, y + a.oy);
        a.over?.(g, x, y, env);
        // canopies and overhead parts too (a tree's crown), as they stand
        for (const part of a.fg ?? []) {
          const pi = part.img(env);
          if (pi) ctx.drawImage(pi, x + part.ox, y + part.oy);
        }
      },
    });
  });
  items.sort((a, b) => Number(b.flat) - Number(a.flat) || a.foot - b.foot);
  for (const it of items) it.draw();
  const d = new Uint32Array(ctx.getImageData(0, 0, p.w, p.h).data.buffer);
  for (let i = 0; i < d.length; i++) {
    if (d[i] >>> 24 <= 127) continue;
    // over the roofs only right against the fronts (a vending machine, a gacha)
    if (Math.floor(i / p.w) < top - 22) continue;
    p.data[i] = (d[i] | 0xff000000) >>> 0;
  }
  void c;
}

/**
 * Evening shade over everything outside, then flat steps down towards the
 * dark as the screen's edge nears (the room is shown centred): the building
 * and the street by the door stay brightest; steps joined by 1–2px checker
 * bands (never smooth gradients or scattered noise).
 */
export function shadeAndFade(p: PixelCanvas, o: { cx: number; cy: number; doorCx: number; street: number; W: number; roofs?: boolean }): void {
  const night = rgba32(P.night);
  const [nr, ng, nb] = [0x1b, 0x17, 0x33];
  const STEPS = [0.24, 0.38, 0.5, 0.6, 0.7, 0.78, 0.86, 0.93];
  const level = (x: number, y: number): number => {
    // a rounded-rectangle distance: 1 on the screen's edge
    const nx = Math.abs(x - o.cx) / (SW / 2);
    const ny = Math.abs(y - o.cy) / (SH / 2);
    const d = Math.pow(Math.pow(nx, 4) + Math.pow(ny, 4), 0.25);
    let t = (d - 0.36) / 0.64;
    // the street round the door: an ellipse wider than it is deep
    const ex = (x - o.doorCx) / (o.W * 0.5 + 40);
    const ey = (y - o.street - 6) / 44;
    t = Math.min(t, Math.max(0, Math.hypot(ex, ey) - 0.45) * 1.1);
    // the roofs above the street sit a step darker than the lit street
    const roof = o.roofs && y < o.street - 3 ? 1.3 : 0;
    return Math.max(0, Math.min(STEPS.length - 1, t * (STEPS.length - 1) + roof));
  };
  for (let y = 0; y < p.h; y++)
    for (let x = 0; x < p.w; x++) {
      const v = p.get(x, y);
      if (v >>> 24 === 0) {
        p.set(x, y, night);
        continue;
      }
      const s = level(x, y);
      let k = Math.floor(s);
      // a checker band at the top of each step
      if (s - k > 0.82 && ((x + y) & 1) === 0) k++;
      const a = STEPS[Math.min(STEPS.length - 1, k)];
      const r = v & 255;
      const g = (v >>> 8) & 255;
      const b = (v >>> 16) & 255;
      // evening shade: towards #3A2B5C first, then into the night
      const sr = r + (0x3a - r) * 0.22;
      const sg = g + (0x2b - g) * 0.22;
      const sb = b + (0x5c - b) * 0.22;
      const rr = Math.round(sr + (nr - sr) * a);
      const gg = Math.round(sg + (ng - sg) * a);
      const bb = Math.round(sb + (nb - sb) * a);
      p.set(x, y, ((255 << 24) | (bb << 16) | (gg << 8) | rr) >>> 0);
    }
}

/**
 * Run-time light outside (call first thing in the shell's over()): the stage's
 * outdoor grade over the street and the roofs (the room keeps the indoor one),
 * then the shop's warm light thrown out of the door onto the street.
 */
export function exteriorOver(g: Gfx, x: number, y: number, e: Exterior, env: PropEnv, o: { spill?: string; spillA?: number; noSpill?: boolean } = {}): void {
  const ctx = g.ctx;
  const X = Math.round(x);
  const Y = Math.round(y);
  const n = env.grade.night;
  ctx.save();
  // everything but the building's inside (the sections and the room stay as they are)
  const path = new Path2D();
  path.rect(X + e.ox, Y + e.oy, e.p.w, e.p.h);
  path.rect(X + 12, Y, e.W - 24, e.H - 12);
  ctx.clip(path, 'evenodd');
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = css(env.grade.mul);
  ctx.fillRect(X + e.ox, Y + e.oy, e.p.w, e.p.h);
  ctx.restore();
  // the shop's light out of the door onto the street (stronger as night falls)
  if (o.noSpill) return;
  const a = (o.spillA ?? 0.3) + n * 0.45;
  tintSpill(g, X + e.doorX, Y + e.streetY - 1, 16, 46, 36, o.spill ?? P.sky, a);
}
