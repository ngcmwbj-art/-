// The building and the street round a shop interior (review round 1: the
// 9–12×7 shops floated small in the middle of a flat dark screen). The room
// shell is set into a larger canvas that shows what is really round that
// shop on map_town (QA round 3: the old neighbours were the same rusty tin
// roof beside every shop, and the outside was a dead, dark frame):
//
//   - the street in front: the town's own ground and everything always
//     standing on it (pillars and lanterns, benches, poles, the trees) and
//     the shop's listed extras, lined up on the door;
//   - the row of buildings the shop stands in: the town's own buildings,
//     alleys, hedges, the railway..., baked as the town draws them, the ones
//     west of the shop moved out to the room's west wall and the ones east of
//     it to the east wall (the room is wider than the shop's frontage);
//   - north of that row the town again, lined up on the door (the park's
//     hedge behind the ginza, the arcade behind the river road);
//   - the building itself: the outer skin of the walls round the 4px wall
//     sections, the eave of the roof over the back wall;
//   - the shop's own things outside (a bike, the red lamp...), painted by each shop;
//   - evening shade over all of it, darkening towards the screen's edge
//     through fine ordered-dither steps (no bands, no rings), the street by
//     the door brightest.
//
// At run time exteriorOver() walks passers-by along the street (the town's
// walkers; only their shadows in stage 2), grades the outside like the town
// (lifted out of the room's own indoor grade), and throws the shop's light
// out of the door; exteriorGlow() lights the town's lamps, signs and windows
// (their own glow, so a flickering street lamp flickers here too).
//
// QA round 2: rooms are shown at 1× like everything else, so the outside
// fills the whole screen (extMargins) instead of the old 2× view's margins.

import { Gfx } from '../../engine/gfx';
import { makeCanvas, PixelCanvas, rgba32 } from '../../engine/pixel';
import { H as SH, W as SW } from '../../engine/screen';
import { bakeGround } from '../tiles/ground';
import { ihash, valueNoise } from '../tiles/noise';
import { P } from '../tiles/palette';
import { flag } from '../../game/state';
import { condOk, loadMap, type LoadedMap } from '../../world/maps';
import type { Cond } from '../../world/types';
import { GroundCache } from '../../world/ground_cache';
import { buildStructures } from '../../world/structures';
import { css, GRADES, INDOOR_MUL, shadowDir } from '../../world/lighting';
import { ROOM_SLIDE } from '../../world/roomview';
import { charSprite, hasChar, idleFrame, walkFrame } from '../chars';
import { getProp, hasProp } from './registry';
import { dk, lt } from './kit';
import { tintSpill } from './ishell';
import type { PropArt, PropEnv } from './types';

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
  /**
   * The shop's own building on map_town: its first tile column, the column
   * just past it, and its back row. The town's row of buildings west of it
   * is moved out to the room's west wall, the one east of it to the east wall.
   */
  bld: [number, number, number];
  /** Outer skin of the walls: lit, base, shade. */
  skin: [string, string, string];
  /** Our own roof (its eave over the back wall). */
  roof: 'kawara' | 'tin' | 'slab';
  seed: number;
  /**
   * The shop's own things outside at their map_town tiles, lined up on the
   * door like the street (the gacha, the vending machine...). `sprite` bakes
   * a field character instead (the cow statue); `dy` moves one down (px).
   */
  props?: { id: string; tx: number; ty: number; opts?: Record<string, unknown>; sprite?: boolean; dy?: number }[];
  /** Town props (ids) not to bake even though they stand there. */
  skip?: string[];
  /** Things outside this shop (painted before the shade and the fade). */
  paint?: (e: ExtPainter) => void;
}

/** A baked town prop whose lamps / lit windows are lit at run time (canvas px of its anchor tile). */
export interface ExtLight {
  art: PropArt;
  x: number;
  y: number;
  seed: number;
  /** Distance (px) from the shop's door: the street lamps come on nearest first. */
  near: number;
}

/** The outside as it stands in one stage. */
export interface ExtStage {
  img: HTMLCanvasElement;
  lights: ExtLight[];
  /** What stands in front of the lane (foot below lane / lane + 6): drawn back over the walkers. */
  front: [HTMLCanvasElement, HTMLCanvasElement];
}

/** Run-time life round a shop (exteriorOver / exteriorGlow). */
export interface ExtLife {
  /** The picture, its lights and fronts for a stage (built the first time it is needed). */
  at(stage: number): ExtStage;
  /** Alpha mask (canvas size): how much of a light gets through the fade. */
  vig: HTMLCanvasElement;
  /** The walkers' street: feet y of the eastbound lane (westbound +6, the quick ones +3). */
  lane: number;
  /** Fade towards the night colour at canvas px (0..1). */
  fade(x: number, y: number): number;
  seed: number;
  /** The shop's door on map_town (the shadows fall as they do there). */
  town: [number, number];
  scratch?: {
    c: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    g: Gfx;
    lc: HTMLCanvasElement;
    lctx: CanvasRenderingContext2D;
    lg: Gfx;
  };
}

export interface Exterior {
  /** The finished picture (for a shop: in the stage it was first built in). */
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
  /** Shops only: walkers, the town's lights and the night lift. */
  life?: ExtLife;
}

let townCache: GroundCache | null = null;
export function townGround(): GroundCache | null {
  if (townCache) return townCache;
  const m = loadMap('map_town');
  if (!m) return null;
  townCache = new GroundCache(m);
  return townCache;
}

type RoofKind = ExteriorSpec['roof'];

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
  const last = [...s.rows[s.rows.length - 1]];
  const doorTx = Math.max(0, last.indexOf('D'));
  const doorCx = L + doorTx * 16 + 8;
  // building (room px): the side walls' outer faces
  const bx0 = 12;
  const bx1 = W - 12;
  // the front wall's outer face is at H - 12; the street starts 3px below it
  const street = T + H - 9;
  // ---- the three pieces of the town (town px → canvas px)
  const [tdx, tdy] = s.town;
  const [bX0, bX1, bY0] = s.bld;
  // the street and the town north of the row: lined up on the door
  const X0 = (tdx - doorTx) * 16 - L;
  const Y0 = (tdy + 1) * 16 - T - H;
  // the row of buildings, split at the shop and moved out to the room's walls
  const XL = bX0 * 16;
  const XR = bX1 * 16;
  const wl = L + bx0 - 4;
  const xr = L + bx1 + 4;
  const shL = wl - XL;
  const shR = xr - XR;
  const bandY = bY0 * 16 - Y0;
  const bandB = T + H;
  const roomTop = tdy + 1 - Math.round(H / 16);
  // ---- 1. the ground (the same in every stage)
  const ground = new PixelCanvas(EW, EH);
  const tg = townGround();
  if (tg) {
    const src = tg.src;
    if (bandY > 0) ground.blit(bakeGround(src, X0, Y0, EW, bandY), 0, 0);
    // the street, carried on under our (recessed) front wall
    const wrap = { ...src, ground: (tx: number, ty: number) => src.ground(tx, Math.max(ty, tdy + 1)) };
    const sy = street - 3;
    ground.blit(bakeGround(wrap, X0, Y0 + sy, EW, EH - sy), 0, sy);
    // the row either side, as far as the room's walls
    const bh = bandB - bandY;
    if (wl > 0) ground.blit(bakeGround(src, XL - wl, bY0 * 16, wl, bh), 0, bandY);
    if (xr < EW) ground.blit(bakeGround(src, XR, bY0 * 16, EW - xr, bh), xr, bandY);
    // a room shorter than the row: the town's ground behind it, on the door
    if (T > bandY) ground.blit(bakeGround(src, X0 + wl, Y0 + bandY, xr - wl, T - bandY), wl, bandY);
  } else ground.rect(0, 0, EW, EH, P.shade);
  // ---- where the town's things stand on the canvas
  const colOf = (tx: number, ty: number): number | null => {
    if (ty >= bY0 && ty <= tdy) {
      if (tx < bX0) return tx * 16 + shL;
      if (tx >= bX1) return tx * 16 + shR;
      return null;
    }
    const x = tx * 16 - X0;
    // nothing of the town north of the row stands inside the room
    if (ty < bY0 && ty >= roomTop && x + 16 > wl && x < xr) return null;
    return x;
  };
  const rowOf = (ty: number) => ty * 16 - Y0;
  const colsW = Math.floor(Math.min(X0, XL - wl) / 16) - 2;
  const colsE = Math.ceil(Math.max(X0 + EW, XR + (EW - xr)) / 16) + 2;
  const extras = s.props?.length ?? 0;
  const fo = { cx: L + W / 2, cy: T + H / 2, doorCx, street, W, upper: 0.06 };
  const lane = rowOf(tdy + 2) + 13;
  /** The whole picture as it stands in one stage (the town's things change with the stage). */
  const build = (stage: number): { p: PixelCanvas; drawn: Drawn[] } => {
    const p = ground.clone();
    // ---- 2. everything that stands there in this stage, in the town's depth order
    // (the shop's extras first, lined up on the door wherever they stand; the town's copies of them are left out)
    const placed: Placed[] = [];
    const list = townThings({ props: s.props, skip: s.skip }, Math.floor(Y0 / 16) - 1, colsW, colsE, Math.ceil((Y0 + EH) / 16) + 5, true, stage);
    list.forEach((o, i) => {
      if (i < extras) {
        placed.push({ ...o, x: o.tx * 16 - X0, y: rowOf(o.ty) + (o.dy ?? 0) });
        return;
      }
      const x = colOf(o.tx, o.ty);
      if (x !== null) placed.push({ ...o, x, y: rowOf(o.ty) });
    });
    const drawn = layTown(p, placed, 0, stage);
    // ---- 3. our walls' outer skin (3px round the sections) and the back eave
    const [sLt, sBase, sDk] = s.skin;
    for (let y = T - 3; y < street - 3; y++) {
      for (let i = 0; i < 3; i++) {
        p.set(L + bx0 - 3 + i, y, i === 0 ? sLt : sBase);
        p.set(L + bx1 + i, y, i === 2 ? sDk : sBase);
      }
      p.set(L + bx0 - 4, y, P.ink);
      p.set(L + bx1 + 3, y, P.ink);
    }
    // our roof behind the back wall
    const back = T - 11;
    for (let y = back; y < T - 9; y++) for (let x = wl; x < xr; x++) p.set(x, y, roofPx(s.roof, x, y, s.seed + 5, s.roof === 'tin' ? P.steel : undefined));
    for (let x = wl; x < xr; x++) {
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
    // ---- 4. the shop's own things
    s.paint?.({ p, ox: L, oy: T, W, H, street, door: doorCx });
    // ---- 5. evening shade, darker towards the screen's edge
    shadeAndFade(p, fo);
    // ---- 6. the room on top, then the doorstep outside the door (street, a step)
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
    return { p, drawn };
  };
  /** One stage's picture with its lit things and what stands in front of the walkers. */
  const stageOf = (b: { p: PixelCanvas; drawn: Drawn[] }): ExtStage => {
    const lights: ExtLight[] = [];
    for (const d of b.drawn) {
      if (!d.art || !(d.art.glow || d.art.light)) continue;
      // lamps come on nearest the shop's door first (street.ts lampState)
      const near = Math.hypot(d.x + 8 - doorCx, d.y + 8 - street);
      lights.push({ art: d.art, x: d.x, y: d.y, seed: d.seed, near });
    }
    const front = [lane, lane + 6].map((ly) => frontOf(b.p, b.drawn, ly)) as [HTMLCanvasElement, HTMLCanvasElement];
    return { img: b.p.toCanvas(), lights, front };
  };
  // the stage we are in now first; the others when first needed (30–60 ms each)
  const now = Math.max(0, Math.min(3, Math.floor(flag('flag_stage'))));
  const first = build(now);
  const stages = new Map<number, ExtStage>([[now, stageOf(first)]]);
  const g2 = new PixelCanvas(EW, EH);
  g2.blit(glass, L, T);
  // ---- 7. life: the fade (for the lights and the walkers), per-stage pictures built when first needed
  const fade = (x: number, y: number) => fadeLevel(x, y, fo);
  const vig = new PixelCanvas(EW, EH);
  for (let y = 0; y < EH; y++)
    for (let x = 0; x < EW; x++) {
      const a = Math.max(0, Math.min(255, Math.round((1 - fade(x, y) * 0.85) * 255)));
      vig.data[y * EW + x] = ((a << 24) | 0xffffff) >>> 0;
    }
  const life: ExtLife = {
    at(stage: number): ExtStage {
      const k = Math.max(0, Math.min(3, Math.floor(stage)));
      let v = stages.get(k);
      if (!v) stages.set(k, (v = stageOf(build(k))));
      return v;
    },
    vig: vig.toCanvas(),
    lane,
    fade,
    seed: s.seed,
    town: [tdx, tdy],
  };
  return { p: first.p, glass: g2, ox: -L, oy: -T, W, H, doorX: doorCx - L, streetY: street - T, life };
}

/** The shell image for the stage (the town round a shop changes with it); `p`'s for an exterior without life. */
export function exteriorImg(e: Exterior): (env: PropEnv) => HTMLCanvasElement {
  const still = e.p.toCanvas();
  return (env) => e.life?.at(env.stage).img ?? still;
}

export type Baked = NonNullable<ExteriorSpec['props']>[number] & { wall?: boolean };

/**
 * What stands on the town in rows y0..y1, columns x0..x1: the listed extras
 * first, then every prop and wall of map_town there that is always present
 * (no condition), so the view out of the door is the real street. With a
 * `stage`, the things that stand there only in some stages (and depend on
 * nothing else) are included for that stage too. `exact` keeps to the
 * columns asked for (no reach back for wide props).
 */
export function townThings(s: Pick<ExteriorSpec, 'props' | 'skip'>, y0: number, x0: number, x1: number, y1: number, exact = false, stage?: number): Baked[] {
  const out: Baked[] = [...(s.props ?? [])];
  const seen = new Set(out.map((o) => `${o.id}@${o.tx},${o.ty}`));
  const m = loadMap('map_town');
  if (!m) return out;
  const skip = new Set(s.skip ?? []);
  const reach = exact ? 0 : 3;
  for (const o of m.objects) {
    if (o.t !== 'prop' && o.t !== 'obj') continue;
    // things that come and go: only those that depend on the stage alone, for a given stage
    if (o.cond && (stage === undefined || !stageOnly(o.cond) || !condOk(o.cond, stage))) continue;
    const id = o.t === 'prop' ? o.prop : (o.prop ?? o.id);
    if (!hasProp(id) || skip.has(id)) continue;
    if (o.y < y0 || o.y > y1 || o.x < x0 - reach || o.x > x1) continue;
    const key = `${id}@${o.x},${o.y}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ id, tx: o.x, ty: o.y, opts: o.opts });
  }
  for (const st of walls(m)) if (st.ty >= y0 && st.ty <= y1 && st.tx >= x0 - 1 && st.tx <= x1) out.push({ id: '', tx: st.tx, ty: st.ty, wall: true });
  return out;
}

function stageOnly(c: Cond): boolean {
  return Object.keys(c).every((k) => k === 'stage');
}

let wallCache: ReturnType<typeof buildStructures> | null = null;
function walls(m: LoadedMap): ReturnType<typeof buildStructures> {
  wallCache ??= buildStructures(m);
  return wallCache;
}

/** A still environment for baking the town's props once (stage 0 unless asked). */
function bakeEnv(seed: number, stage = 0): PropEnv {
  return { t: 0, stage, grade: GRADES[stage] ?? GRADES[0], motion: stage === 1 ? 0 : 1, mt: 0, flag: () => 0, seed, near: 999, px: -999, py: -999 };
}

/** A town thing at its canvas px (top-left of its anchor tile). */
type Placed = Baked & { x: number; y: number };

/** One laid-out town thing: depth, how to draw it, its art (for the lights at run time). */
interface Drawn {
  foot: number;
  flat: boolean;
  x: number;
  y: number;
  seed: number;
  art: PropArt | null;
  draw(ctx: CanvasRenderingContext2D, g: Gfx): void;
}

/** Lay town things into p (the town's depth order); pixels above `top` are left alone. */
function layTown(p: PixelCanvas, list: Placed[], top: number, stage = 0): Drawn[] {
  const m = loadMap('map_town');
  const items: Drawn[] = [];
  list.forEach((o, i) => {
    const { x, y } = o;
    if (o.wall) {
      const st = m ? walls(m).find((w) => w.tx === o.tx && w.ty === o.ty) : undefined;
      if (st) items.push({ foot: y + (st.foot - st.ty * 16), flat: false, x, y, seed: 0, art: null, draw: (ctx) => ctx.drawImage(st.art.img, x + st.art.ox, y + st.art.oy) });
      return;
    }
    if (o.sprite) {
      // a field character standing on the tile (feet at the tile's bottom centre)
      const img = idleFrame(charSprite(o.id), 'down', 0);
      items.push({ foot: y + 16, flat: false, x, y, seed: 0, art: null, draw: (ctx) => ctx.drawImage(img, Math.round(x + 8 - img.width / 2), Math.round(y + 16 - img.height)) });
      return;
    }
    const a = getProp(o.id, o.opts ?? {});
    if (!a) return;
    // a per-thing seed in 0..1 like the field's (street lamps flicker out of step)
    const seed = (ihash(o.tx, o.ty, 7919 + i) % 1000) / 1000;
    const env = bakeEnv(seed, stage);
    items.push({
      foot: y + a.foot,
      flat: !!a.flat,
      x,
      y,
      seed,
      art: a,
      draw: (ctx, g) => {
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
  const [c, ctx] = makeCanvas(p.w, p.h, { willReadFrequently: true });
  const g = new Gfx(ctx, p.w, p.h);
  for (const it of items) it.draw(ctx, g);
  const d = new Uint32Array(ctx.getImageData(0, 0, p.w, p.h).data.buffer);
  for (let i = 0; i < d.length; i++) {
    if (d[i] >>> 24 <= 127) continue;
    if (Math.floor(i / p.w) < top) continue;
    p.data[i] = (d[i] | 0xff000000) >>> 0;
  }
  void c;
  return items;
}

/**
 * Draw the town's props (their image and over() parts: lanterns, flags) and
 * walls into p at their tiles, in the town's depth order (nothing of the
 * street is drawn above `top` - 22, except what leans on the fronts).
 */
export function bakeTownProps(p: PixelCanvas, list: Baked[], xOf: (tx: number) => number, yOf: (ty: number) => number, top: number): void {
  layTown(
    p,
    list.map((o) => ({ ...o, x: xOf(o.tx), y: yOf(o.ty) + (o.dy ?? 0) })),
    top > 0 ? top - 22 : 0,
  );
}

/**
 * The pixels of the finished exterior that stand in front of a walker whose
 * feet are at `lane` (every upright thing whose foot is below it), so they
 * can be laid back over the walkers.
 */
function frontOf(p: PixelCanvas, drawn: Drawn[], lane: number): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(p.w, p.h, { willReadFrequently: true });
  const g = new Gfx(ctx, p.w, p.h);
  for (const it of drawn) if (!it.flat && it.foot > lane) it.draw(ctx, g);
  const d = new Uint32Array(ctx.getImageData(0, 0, p.w, p.h).data.buffer);
  const out = new PixelCanvas(p.w, p.h);
  for (let i = 0; i < d.length; i++) if (d[i] >>> 24 > 127) out.data[i] = p.data[i];
  void c;
  return out.toCanvas();
}

// ---------------------------------------------------------------- shade

interface FadeOpts {
  cx: number;
  cy: number;
  doorCx: number;
  street: number;
  W: number;
  /** Extra shade above the street (the row of buildings), 0..1. */
  upper?: number;
  /** @deprecated the old flat-step shade darkened the roofs by a step; now `upper`. */
  roofs?: boolean;
}

/** Nearest to the room / the street by the door: 0; the screen's edge: 1. */
function fadeLevel(x: number, y: number, o: FadeOpts): number {
  // a rounded-rectangle distance: 1 on the screen's edge
  const nx = Math.abs(x - o.cx) / (SW / 2);
  const ny = Math.abs(y - o.cy) / (SH / 2);
  const d = Math.pow(Math.pow(nx, 4) + Math.pow(ny, 4), 0.25);
  let t = (d - 0.4) / 0.62;
  // the street round the door: an ellipse wider than it is deep
  const ex = (x - o.doorCx) / (o.W * 0.5 + 40);
  const ey = (y - o.street - 6) / 44;
  t = Math.min(t, Math.max(0, Math.hypot(ex, ey) - 0.45) * 1.1);
  t = Math.max(0, Math.min(1, t));
  const up = o.upper ?? (o.roofs ? 0.1 : 0);
  if (up && y < o.street - 3) t = Math.min(1, t + up);
  return t;
}

/** 4×4 ordered-dither thresholds. */
const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
/** Night amount near the room / at the screen's edge, and the number of dithered steps between. */
const FADE_NEAR = 0.16;
const FADE_FAR = 0.8;
const FADE_STEPS = 24;

/**
 * Evening shade over everything outside, then darker towards the screen's
 * edge (the room is shown centred): the building and the street by the door
 * stay brightest. The darkening is quantised into many small steps joined by
 * a 4×4 ordered dither (QA round 3: the old eight flat steps with checker
 * bands read as concentric rings); neighbouring steps are a few values
 * apart, so no edge and no dither pattern shows.
 */
export function shadeAndFade(p: PixelCanvas, o: FadeOpts): void {
  const night = rgba32(P.night);
  const [nr, ng, nb] = [0x1b, 0x17, 0x33];
  for (let y = 0; y < p.h; y++)
    for (let x = 0; x < p.w; x++) {
      const v = p.get(x, y);
      if (v >>> 24 === 0) {
        p.set(x, y, night);
        continue;
      }
      const q = (FADE_NEAR + (FADE_FAR - FADE_NEAR) * fadeLevel(x, y, o)) * FADE_STEPS;
      let k = Math.floor(q);
      if (q - k > (BAYER4[(y & 3) * 4 + (x & 3)] + 0.5) / 16) k++;
      const a = k / FADE_STEPS;
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

// ---------------------------------------------------------------- run time

/** The town's passers-by (char art 'people/walkers'). */
const WALKERS = ['npc_walker_shufu', 'npc_walker_salaryman', 'npc_walker_kid', 'npc_walker_bike'] as const;
/** One walker may set off per slot. */
const SLOT_MS = 6500;

interface Walker {
  id: string;
  x: number;
  y: number;
  dir: 1 | -1;
  t: number;
}

/** The walkers on the street now (deterministic in time: no state to keep). */
function walkersAt(life: ExtLife, EW: number, env: PropEnv): Walker[] {
  const out: Walker[] = [];
  const stage = Math.floor(env.stage);
  const now = env.t;
  const k0 = Math.floor(now / SLOT_MS);
  for (let k = k0 - 4; k <= k0; k++) {
    const h = ihash(k, 11, life.seed);
    // a quiet street: a slot or two without anyone, fewer still after dark
    if (h % 10 < (stage >= 3 ? 6 : 3)) continue;
    let kind: string = WALKERS[(h >>> 4) % WALKERS.length];
    // stage 2: only the grown-ups' shadows walk on (like the town's)
    if (stage === 2 && (kind === WALKERS[2] || kind === WALKERS[3])) kind = WALKERS[(h >>> 6) % 2];
    if (!hasChar(kind)) continue;
    const quick = kind === WALKERS[2] || kind === WALKERS[3];
    const dir: 1 | -1 = (h >>> 9) & 1 ? 1 : -1;
    const speed = kind === WALKERS[3] ? 0.07 : quick ? 0.05 : 0.028;
    const t = now - (k * SLOT_MS + ((h >>> 12) % 2400));
    if (t < 0) continue;
    const dist = t * speed;
    if (dist > EW + 64) continue;
    const x = dir > 0 ? -32 + dist : EW + 32 - dist;
    const y = life.lane + (dir > 0 ? 0 : 6) + (quick ? 3 : 0);
    out.push({ id: kind, x, y, dir, t });
  }
  return out.sort((a, b) => a.y - b.y);
}

/** Colour and amount of a flat tint that gives the baked shade + fade at canvas px (x, y). */
function shadeTint(life: ExtLife, x: number, y: number): [string, number] {
  const a = FADE_NEAR + (FADE_FAR - FADE_NEAR) * life.fade(x, y);
  // c' = c·(1−A) + Q·A with A = 1 − 0.78(1−a), Q the mix of the evening and night colours
  const A = 1 - 0.78 * (1 - a);
  const we = (0.22 * (1 - a)) / A;
  const wn = a / A;
  const q = [0x3a * we + 0x1b * wn, 0x2b * we + 0x17 * wn, 0x5c * we + 0x33 * wn].map((v) => Math.round(v));
  return [css(q as [number, number, number]), A];
}

function drawWalker(g: Gfx, X: number, Y: number, w: Walker, life: ExtLife, env: PropEnv): void {
  const s = charSprite(w.id);
  const dir = w.dir > 0 ? 'right' : 'left';
  const img = walkFrame(s, dir, w.t);
  const fx = Math.round(X + w.x);
  const fy = Math.round(Y + w.y);
  const ctx = g.ctx;
  const gd = env.grade;
  const shadowOnly = Math.floor(env.stage) === 2;
  const clear = 1 - life.fade(w.x, w.y) * 0.8;
  // the long shadow, thrown the way the town's shadows fall there (render.ts
  // cast(): the sun's, or in stage 2 every shadow pointing at the mall)
  const len = gd.shadowLen;
  if (len > 0.05) {
    const sd = shadowDir(gd, life.town[0], life.town[1] + 2);
    // sprite (u, v), v up from the feet: a point h px up lands h·len along the shadow
    const k = len;
    ctx.save();
    ctx.globalAlpha = Math.min(1, gd.shadowA * (shadowOnly ? 1.6 : 1)) * clear;
    ctx.translate(fx, fy);
    ctx.transform(1, 0, -sd[0] * k, -sd[1] * k, 0, 0);
    ctx.drawImage(silhouetteOf(img, css(gd.shadow)), -Math.round(img.width / 2), -img.height);
    ctx.restore();
  }
  // a contact shadow under the feet
  g.rect(fx - 5, fy - 1, 10, 2, P.nightShade, 0.35 * clear);
  if (shadowOnly) return;
  const [tint, amt] = shadeTint(life, w.x, w.y - 10);
  g.img(img, fx - Math.round(img.width / 2), fy - img.height, { tint, tintAmount: amt });
}

const silCache = new WeakMap<HTMLCanvasElement, Map<string, HTMLCanvasElement>>();
function silhouetteOf(img: HTMLCanvasElement, color: string): HTMLCanvasElement {
  let m = silCache.get(img);
  if (!m) silCache.set(img, (m = new Map()));
  let c = m.get(color);
  if (c) return c;
  const [cc, ctx] = makeCanvas(img.width, img.height);
  ctx.drawImage(img, 0, 0);
  ctx.globalCompositeOperation = 'source-in';
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, img.width, img.height);
  c = cc;
  m.set(color, c);
  return c;
}

/**
 * Run-time light outside (call first thing in the shell's over()): the
 * walkers on the street, the stage's outdoor grade over the street and the
 * row of buildings (the room keeps the indoor one; a shop's outside — or
 * any other with `lift` — is lifted out of the room's own indoor grade, so
 * at night it is as dark as the town and no darker), then the shop's light
 * thrown out of the door onto the street.
 */
export function exteriorOver(g: Gfx, x: number, y: number, e: Exterior, env: PropEnv, o: { spill?: string; spillA?: number; noSpill?: boolean; lift?: boolean } = {}): void {
  const ctx = g.ctx;
  const X = Math.round(x);
  const Y = Math.round(y);
  const n = env.grade.night;
  const life = e.life;
  // ---- the walkers, and what stands in front of them laid back over them
  if (life) {
    const ws = walkersAt(life, e.p.w, env);
    if (ws.length) {
      const front = life.at(env.stage).front;
      const OX = X + e.ox;
      const OY = Y + e.oy;
      const near = ws.filter((w) => w.y < life.lane + 6);
      const far = ws.filter((w) => w.y >= life.lane + 6);
      for (const w of near) drawWalker(g, OX, OY, w, life, env);
      ctx.drawImage(front[0], OX, OY);
      for (const w of far) drawWalker(g, OX, OY, w, life, env);
      if (far.length) ctx.drawImage(front[1], OX, OY);
    }
  }
  // ---- the outdoor grade over everything but the building's inside (the sections and the room stay as they are)
  ctx.save();
  const path = new Path2D();
  path.rect(X + e.ox, Y + e.oy, e.p.w, e.p.h);
  path.rect(X + 12, Y, e.W - 24, e.H - 12);
  ctx.clip(path, 'evenodd');
  ctx.globalCompositeOperation = 'multiply';
  let mul = env.grade.mul;
  let lift = 0;
  if (o.lift ?? !!life) {
    // the renderer grades the whole screen with the room's indoor colour
    // afterwards: grade the outside with outdoor ÷ indoor instead, split
    // into a multiply (≤ 1) and a lift of itself (the part above 1)
    const st = Math.max(0, Math.min(2, Math.floor(env.stage)));
    const day = INDOOR_MUL[st] ?? INDOOR_MUL[0];
    const nt = Math.max(0, Math.min(1, n));
    const ind = [0, 1, 2].map((i) => day[i] + (INDOOR_MUL[3][i] - day[i]) * nt);
    const r = [0, 1, 2].map((i) => env.grade.mul[i] / Math.max(1, ind[i]));
    const top = Math.max(1, ...r);
    mul = r.map((v) => Math.round((v / top) * 255)) as [number, number, number];
    lift = Math.min(1, top - 1);
  }
  ctx.fillStyle = css(mul);
  ctx.fillRect(X + e.ox, Y + e.oy, e.p.w, e.p.h);
  if (lift > 0.02) {
    const tr = ctx.getTransform();
    if (tr.a === 1 && tr.d === 1 && tr.b === 0 && tr.c === 0) {
      const cv = ctx.canvas;
      const sx = Math.max(0, X + e.ox + tr.e);
      const sy = Math.max(0, Y + e.oy + tr.f);
      const sw = Math.min(cv.width, X + e.ox + tr.e + e.p.w) - sx;
      const sh = Math.min(cv.height, Y + e.oy + tr.f + e.p.h) - sy;
      if (sw > 0 && sh > 0) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = lift;
        ctx.drawImage(cv, sx, sy, sw, sh, sx - tr.e, sy - tr.f, sw, sh);
      }
    }
  }
  ctx.restore();
  // the shop's light out of the door onto the street (stronger as night falls)
  if (o.noSpill) return;
  const a = (o.spillA ?? 0.3) + n * 0.45;
  tintSpill(g, X + e.doorX, Y + e.streetY - 1, 16, 46, 36, o.spill ?? P.sky, a);
}

/**
 * The town's lights round a shop (call from the shell's glow()): the lamps,
 * lit signs and windows of the baked props, as each of them lights itself
 * in the town (a flickering street lamp flickers here too), and the pools
 * their lamps throw on the street (the room's light map stops at its walls);
 * dimmed with the fade towards the screen's edge.
 */
export function exteriorGlow(g: Gfx, x: number, y: number, e: Exterior, env: PropEnv): void {
  const life = e.life;
  const lights = life?.at(env.stage).lights;
  if (!life || !lights || !lights.length) return;
  const w = e.p.w;
  const h = e.p.h;
  if (!life.scratch) {
    const [c, ctx] = makeCanvas(w, h);
    const [lc, lctx] = makeCanvas(w, h);
    life.scratch = { c, ctx, g: new Gfx(ctx, w, h), lc, lctx, lg: new Gfx(lctx, w, h) };
  }
  const { c, ctx, g: sg, lc, lctx, lg } = life.scratch;
  for (const k of [ctx, lctx]) {
    k.setTransform(1, 0, 0, 1, 0, 0);
    k.globalAlpha = 1;
    k.globalCompositeOperation = 'source-over';
    k.clearRect(0, 0, w, h);
  }
  // the pools the lamps throw (added up like the light map), then laid in faintly
  let pools = false;
  if (env.grade.night > 0.05) {
    lctx.globalCompositeOperation = 'lighter';
    for (const it of lights) {
      if (!it.art.light) continue;
      lctx.save();
      it.art.light(lg, it.x, it.y, { ...env, seed: it.seed, near: it.near, px: -999, py: -999 });
      lctx.restore();
      pools = true;
    }
    lctx.globalCompositeOperation = 'source-over';
  }
  if (pools) {
    ctx.globalAlpha = 0.32;
    ctx.drawImage(lc, 0, 0);
    ctx.globalAlpha = 1;
  }
  // the lamps, signs and windows themselves
  let any = pools;
  for (const it of lights) {
    if (!it.art.glow) continue;
    ctx.save();
    it.art.glow(sg, it.x, it.y, { ...env, seed: it.seed, near: it.near, px: -999, py: -999 });
    ctx.restore();
    any = true;
  }
  if (!any) return;
  ctx.globalCompositeOperation = 'destination-in';
  ctx.drawImage(life.vig, 0, 0);
  ctx.globalCompositeOperation = 'source-over';
  g.ctx.drawImage(c, Math.round(x) + e.ox, Math.round(y) + e.oy);
}
