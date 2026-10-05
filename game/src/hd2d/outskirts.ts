// HD-2D prototype (round 2, 2026-10-05 依頼主「左側の壁がここまでしか見れない
// の残念」): the land past the map's edges. In 3D the camera keeps Minato in
// the middle at the edges too (index.ts freeCam), so what lies there is drawn
// instead of the dark: nobody walks there (collisions are the 2D map's).
//
//  - the ground: the edge tiles go on (world/ground_cache's bakeGround clamps
//    to the edge, so the road, the gutter, the river and the paddies run on,
//    its noise in world space joins them without a seam); baked once per map;
//  - the walls and hedges that cross an edge go on (walls.ts);
//  - further out the town goes on: houses (the town's own house pictures,
//    some mirrored), trees, poles along the roads, and north of the park the
//    school (夕鳴小学校, its gate is in the park's hedge) — all one atlas,
//    one mesh, a step darker than the town.

import * as THREE from 'three';
import { bakeGround, type GroundSource } from '../art/tiles/ground';
import type { Ground } from '../world/types';
import { getProp } from '../art/props/registry';
import type { PropArt, PropEnv } from '../art/props/types';
import type { FieldScene } from '../world/field';
import { crownBoards, standUp } from './props3d';
import { Atlas, box, canvas, litMaterial, Mask, pixelTexture, PX, Quads, solidFace, type UvFn } from './solid';
import { P } from '../art/tiles/palette';
import { loadMap } from '../world/maps';
import { GroundCache } from '../world/ground_cache';
import { buildWalls } from './walls';
import { TUNE } from './tune';
import type { Margin } from './walls';
import type { Slab, Solid } from './overlap';

// ---------------------------------------------------------------- the ground

const groundCache = new Map<string, HTMLCanvasElement>();
/** Tiles of ground baked past each edge (outskirtsGround). */
const BAND = 4;

/**
 * The ground of the map and past its edges, without the decals: a canvas of
 * the map plus its margins (world px (-mg.x·16, -mg.n·16) at its top-left).
 * Baked once per map (the ground never changes; a map loaded again — a door
 * back, a warp — takes it from here instead of baking it again).
 */
export function outskirtsGround(f: FieldScene, mg: Margin): HTMLCanvasElement {
  const key = `${f.map.id}|${mg.x},${mg.n},${mg.s}`;
  const hit = groundCache.get(key);
  if (hit) return hit;
  const m = f.map;
  const W = (m.w + mg.x * 2) * 16;
  const H = (m.h + mg.n + mg.s) * 16;
  const [c, ctx] = canvas(W, H);
  const ox = mg.x * 16;
  const oy = mg.n * 16;
  const N = 256;
  const bake = (x0: number, y0: number, x1: number, y1: number) => {
    for (let y = y0; y < y1; y += N)
      for (let x = x0; x < x1; x += N) {
        const w = Math.min(N, x1 - x);
        const h = Math.min(N, y1 - y);
        ctx.drawImage(bakeGround(f.ground.src, x, y, w, h).toCanvas(), x + ox, y + oy);
      }
  };
  const mw = m.w * 16;
  const mh = m.h * 16;
  // the first BAND tiles past each edge are baked (they join the map's
  // ground without a seam); further out that band repeats (the far land is
  // in the blur; baking it all cost a second more on the first build)
  const B = BAND * 16;
  bake(-ox, -B, mw + ox, 0); // north (the corners with it)
  bake(-ox, mh, mw + ox, mh + B); // south
  bake(-B, 0, 0, mh); // west
  bake(mw, 0, mw + B, mh); // east
  // (the band repeated outward; drawImage clips what falls past the canvas)
  const copy = (sx: number, sy: number, w: number, h: number, dx: number, dy: number) => ctx.drawImage(c, sx + ox, sy + oy, w, h, dx + ox, dy + oy, w, h);
  for (let y = -2 * B; y > -oy - B; y -= B) copy(-ox, -B, W, B, -ox, y);
  for (let y = mh + B; y < mh + mg.s * 16; y += B) copy(-ox, mh, W, B, -ox, y);
  for (let x = -2 * B; x > -ox - B; x -= B) copy(-B, 0, B, mh, x, 0);
  for (let x = mw + B; x < mw + ox; x += B) copy(mw, 0, B, mh, x, 0);
  // what lies past the edges of a place other than its edge tiles (the river's west bank, a lane)
  const paint = OUTSIDE_GROUND[m.id];
  if (paint) {
    ctx.save();
    ctx.translate(ox, oy);
    paint((g, x, y, w, h) => {
      ctx.fillStyle = ctx.createPattern(groundPatch(g, f.ground.src.seed), 'repeat')!;
      // (the pattern from the world's origin, as the map's own ground)
      ctx.fillRect(x, y, w, h);
    }, mw, mh, mg);
    ctx.restore();
  }
  // the map's own ground (the field's chunks)
  for (let cy = 0; cy * N < mh; cy++) for (let cx = 0; cx * N < mw; cx++) ctx.drawImage(f.ground.chunk(cx, cy), cx * N + ox, cy * N + oy);
  groundCache.set(key, c);
  return c;
}

const patchCache = new Map<string, HTMLCanvasElement>();
/** 64 × 64 px of one kind of ground, baked (a pattern to fill land past the edges with). */
function groundPatch(g: Ground, seed: number): HTMLCanvasElement {
  const key = `${g}|${seed}`;
  let c = patchCache.get(key);
  if (!c) {
    const src: GroundSource = { w: 4, h: 4, ground: () => g, theme: () => '', seed };
    c = bakeGround(src, 0, 0, 64, 64).toCanvas();
    patchCache.set(key, c);
  }
  return c;
}

type Fill = (g: Ground, x: number, y: number, w: number, h: number) => void;

/** Land past the edges of a place painted over its edge tiles (world px; mw × mh: the map's size in px). */
const OUTSIDE_GROUND: Record<string, (fill: Fill, mw: number, mh: number, mg: Margin) => void> = {
  // 夕鳴川の 堰: the river is 13 tiles wide (x −4..8: water3d.ts lays it), past it the west bank (となり町)
  map_seki: (fill, mw, mh, mg) => {
    fill('grass', -mg.x * 16, -mg.n * 16, (mg.x - 4) * 16, mg.n * 16);
    fill('grass', -mg.x * 16, 64, (mg.x - 4) * 16, mh + mg.s * 16 - 64);
  },
  // 裏庭: east of the pool's end (x 31–) the grass of the school's east garden
  map_school: (fill, mw, mh, mg) => {
    fill('grass', 31 * 16, 3 * 16, (mg.x - 3) * 16, 7 * 16);
  },
  // 校庭: south of the mesh fence a lane, the houses beyond face it
  map_school_kotei: (fill, mw, mh, mg) => {
    fill('asphalt', -mg.x * 16, mh + 8, mw + mg.x * 32, 32);
  },
};

// ---------------------------------------------------------------- what stands there

/** One thing outside: a prop of the registry at an anchor tile (as map objects are placed). */
interface Far {
  id: string;
  x: number;
  y: number;
  opts?: Record<string, unknown>;
  /** Mirrored left to right (a house seen again should not look the same). */
  flip?: boolean;
  /** A box this many tiles deep for a building drawn without roof rows (the school). */
  depth?: number;
  /** Only columns c0..c1 of its picture (a building going on past the edge: its end bay). */
  crop?: [number, number];
}

/**
 * map_town (64×44): west of the park trees and two houses; along the road
 * west (rows 16–20 north of it, 25–30 south behind the wall) houses and a
 * pole, so the road reads as going on to the next town; a pole on the river
 * road; north of the park the school; east of the railway houses and trees.
 */
const LAYOUT: Record<string, Far[]> = {
  map_town: [
    // west of the park
    { id: 'tree_kusu', x: -2, y: 1, opts: { v: 1 } },
    { id: 'tree_sakura', x: -5, y: 4, opts: { v: 0 } },
    { id: 'tree_kusu', x: -3, y: 9, opts: { v: 0 } },
    { id: 'tree_ichou', x: -8, y: 11, opts: { v: 1 } },
    { id: 'tree_matsu', x: -2, y: 13, opts: { v: 1 } },
    { id: 'bld_madam', x: -12, y: 2 },
    { id: 'bld_ojii', x: -14, y: 7, flip: true },
    // the road west: houses facing it, a pole at the corner
    // (never next to the house it copies: the akichi has ojii's house east of it, so madam's west)
    { id: 'bld_madam', x: -5, y: 16, flip: true },
    { id: 'bld_slopetop', x: -11, y: 16 },
    { id: 'bld_mizumaki', x: -17, y: 15, flip: true },
    { id: 'prop_utility_pole', x: -7, y: 20, opts: { ad: 'bank', lamp: true } },
    // behind the wall south of the road
    { id: 'bld_ojii', x: -6, y: 25, flip: true },
    { id: 'tree_persimmon', x: -8, y: 24 },
    { id: 'bld_madam', x: -13, y: 26 },
    // the river road west
    { id: 'prop_utility_pole', x: -10, y: 35, opts: { ad: 'lashes', lamp: true } },
    // north of the park: the school, cherry trees along its fence
    { id: 'bld_sch_kousha', x: 3, y: -10, depth: 3 },
    { id: 'tree_sakura', x: 1, y: -3, opts: { v: 0 } },
    { id: 'tree_sakura', x: 10, y: -3, opts: { v: 1 } },
    { id: 'tree_kusu', x: 25, y: -3, opts: { v: 0 } },
    { id: 'tree_sakura', x: 31, y: -4, opts: { v: 0 } },
    { id: 'tree_ichou', x: -3, y: -6, opts: { v: 0 } },
    // east of the railway
    { id: 'tree_kusu', x: 66, y: 3, opts: { v: 1 } },
    { id: 'tree_ichou', x: 70, y: 8, opts: { v: 0 } },
    { id: 'tree_sakura', x: 66, y: 12, opts: { v: 1 } },
    { id: 'bld_madam', x: 66, y: 16, flip: true },
    { id: 'bld_slopetop', x: 71, y: 16 },
    { id: 'prop_utility_pole', x: 65, y: 21, opts: { ad: 'dog', lamp: true } },
    { id: 'bld_mizumaki', x: 66, y: 26 },
    { id: 'bld_ojii', x: 72, y: 26, flip: true },
    { id: 'tree_matsu', x: 68, y: 33, opts: { v: 0 } },
    // past the paddies
    { id: 'tree_kusu', x: 20, y: 47, opts: { v: 1 } },
    { id: 'tree_matsu', x: 41, y: 48, opts: { v: 0 } },
  ],
  // 夕鳴小学校 裏庭 (28×14, 2026-10-05): the school building goes on west and
  // east (its end bays); south of its mesh fence the park — its north hedge
  // (walls.ts) with the iron back gate, the trees of its north row, the toilet
  // (the town's own places: the gate is map_town (18,0), 4 tiles east of here)
  map_school: [
    { id: 'bld_sch_kousha', x: -4, y: 0, depth: 9, crop: [0, 64] },
    { id: 'bld_sch_kousha', x: 28, y: 0, depth: 9, crop: [384, 448] },
    { id: 'tree_kusu', x: -6, y: 4, opts: { v: 1 } },
    { id: 'tree_sakura', x: -9, y: 8, opts: { v: 0 } },
    { id: 'tree_matsu', x: -5, y: 10, opts: { v: 0 } },
    { id: 'tree_sakura', x: 33, y: 5, opts: { v: 1 } },
    { id: 'tree_kusu', x: 36, y: 10, opts: { v: 0 } },
    { id: 'bld_madam', x: 33, y: 7, flip: true },
    { id: 'prop_sch_uramon', x: 14, y: 14 },
    { id: 'tree_sakura', x: 2, y: 15, opts: { v: 0 } },
    { id: 'tree_kusu', x: 7, y: 15, opts: { v: 0 } },
    { id: 'tree_sakura', x: 20, y: 15, opts: { v: 1 } },
    { id: 'tree_kusu', x: 25, y: 15, opts: { v: 1 } },
    { id: 'bld_toilet', x: -3, y: 15 },
    { id: 'tree_sarusuberi', x: -2, y: 20, opts: { v: 0 } },
  ],
  // 夕鳴小学校 校庭 (36×22): the building's end bays; west and east hedges of
  // the neighbours' gardens; south of the mesh fence a lane (outsideGround)
  // and the houses facing it, two poles
  map_school_kotei: [
    { id: 'bld_kotei_kousha', x: -4, y: 0, depth: 10, crop: [0, 64] },
    { id: 'bld_kotei_kousha', x: 36, y: 0, depth: 10, crop: [512, 576] },
    { id: 'tree_kusu', x: -3, y: 6, opts: { v: 0 } },
    { id: 'bld_madam', x: -12, y: 7 },
    { id: 'tree_sakura', x: -4, y: 13, opts: { v: 1 } },
    { id: 'bld_ojii', x: -13, y: 15, flip: true },
    { id: 'tree_matsu', x: -3, y: 19, opts: { v: 1 } },
    { id: 'tree_sakura', x: 38, y: 6, opts: { v: 0 } },
    { id: 'tree_kusu', x: 41, y: 12, opts: { v: 1 } },
    { id: 'tree_ichou', x: 38, y: 17, opts: { v: 0 } },
    { id: 'bld_slopetop', x: 2, y: 26 },
    { id: 'bld_mizumaki', x: 9, y: 26, flip: true },
    { id: 'prop_utility_pole', x: 15, y: 24, opts: { ad: 'bank', lamp: true } },
    { id: 'bld_madam', x: 18, y: 27 },
    { id: 'bld_ojii', x: 26, y: 26, flip: true },
    { id: 'prop_utility_pole', x: 31, y: 24, opts: { ad: 'dog', lamp: true } },
    { id: 'tree_persimmon', x: 33, y: 27 },
  ],
  // 畦道の先の 分水 (24×14): the paddies go on all round (water3d.ts); the
  // path north to the town with its poles, the town's roofs far off; となり町's
  // farmhouse west, trees on the ridges
  map_aze: [
    { id: 'prop_utility_pole', x: 13, y: -3, opts: { ad: 'bank', lamp: false } },
    { id: 'prop_utility_pole', x: 13, y: -9, opts: { ad: 'dog', lamp: true } },
    { id: 'bld_ojii', x: 1, y: -13 },
    { id: 'bld_madam', x: 7, y: -14, flip: true },
    { id: 'bld_slopetop', x: 16, y: -13 },
    { id: 'tree_kusu', x: -3, y: -10, opts: { v: 1 } },
    { id: 'tree_sakura', x: 23, y: -10, opts: { v: 0 } },
    { id: 'bld_mizumaki', x: -13, y: 5, flip: true },
    { id: 'tree_kusu', x: -6, y: 1, opts: { v: 0 } },
    { id: 'tree_matsu', x: -9, y: 11, opts: { v: 1 } },
    { id: 'tree_ichou', x: 29, y: 3, opts: { v: 0 } },
    { id: 'tree_kusu', x: 33, y: 9, opts: { v: 1 } },
    { id: 'bld_ojii', x: 31, y: 13, flip: true },
    { id: 'tree_kusu', x: 6, y: 19, opts: { v: 0 } },
    { id: 'tree_matsu', x: 18, y: 20, opts: { v: 0 } },
  ],
  // 夕鳴川の 堰 (24×16): the river goes on north and south (water3d.ts), its
  // west bank and となり町 past the bridge; north of the bushes the town's
  // edge; the road and the canal go on east
  map_seki: [
    { id: 'tree_yanagi', x: -6, y: 6 },
    { id: 'tree_kusu', x: -8, y: 12, opts: { v: 0 } },
    { id: 'bld_mizumaki', x: -14, y: -1, flip: true },
    { id: 'bld_ojii', x: -12, y: 8 },
    { id: 'prop_utility_pole', x: -6, y: 4, opts: { ad: 'bank', lamp: true } },
    { id: 'tree_kusu', x: 10, y: -3, opts: { v: 1 } },
    { id: 'bld_madam', x: 13, y: -5, flip: true },
    { id: 'bld_slopetop', x: 19, y: -5 },
    { id: 'tree_sakura', x: 25, y: -2, opts: { v: 0 } },
    { id: 'prop_utility_pole', x: 27, y: 3, opts: { ad: 'fishing', lamp: true } },
    { id: 'tree_kusu', x: 30, y: 10, opts: { v: 1 } },
    { id: 'tree_matsu', x: 14, y: 19, opts: { v: 0 } },
    { id: 'tree_kusu', x: 21, y: 18, opts: { v: 0 } },
  ],
};

const flipCache = new WeakMap<HTMLCanvasElement, HTMLCanvasElement>();
function mirrored(c: HTMLCanvasElement): HTMLCanvasElement {
  let m = flipCache.get(c);
  if (m) return m;
  const [mc, ctx] = canvas(c.width, c.height);
  ctx.translate(c.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(c, 0, 0);
  flipCache.set(c, mc);
  m = mc;
  return m;
}

const cropCache = new WeakMap<HTMLCanvasElement, Map<string, HTMLCanvasElement>>();
/** Columns c0..c1 of a picture. */
function cropped(c: HTMLCanvasElement, c0: number, c1: number): HTMLCanvasElement {
  let m = cropCache.get(c);
  if (!m) cropCache.set(c, (m = new Map()));
  const key = `${c0},${c1}`;
  let o = m.get(key);
  if (!o) {
    const [oc, ctx] = canvas(c1 - c0, c.height);
    ctx.drawImage(c, c0, 0, c1 - c0, c.height, 0, 0, c1 - c0, c.height);
    m.set(key, (o = oc));
  }
  return o;
}

/** The facade's average colour, a step darker (the side walls). */
function sideColour(c: HTMLCanvasElement, faceY: number): string {
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  const h = Math.max(1, c.height - faceY);
  const d = ctx.getImageData(0, faceY, c.width, h).data;
  let r = 0;
  let g = 0;
  let b = 0;
  let n = 0;
  for (let i = 0; i < d.length; i += 16) {
    if (d[i + 3] < 128) continue;
    r += d[i];
    g += d[i + 1];
    b += d[i + 2];
    n++;
  }
  if (!n) return '#8a8078';
  const k = (v: number, s: number) => Math.round((v / n) * s);
  return `rgb(${k(r, 0.78)},${k(g, 0.74)},${k(b, 0.8)})`;
}

export class Outskirts {
  readonly mesh: THREE.Mesh | null = null;
  private readonly atlas = new Atlas();

  /** `solids`: where the room each thing takes goes (QA, overlap.ts). `list`: what stands (default: the map's LAYOUT); `dim`: how much darker than the town. */
  constructor(f: FieldScene, sv: number, solids: Solid[] | null = null, list: Far[] | undefined = LAYOUT[f.map.id], dim = 0.86) {
    if (!list) return;
    const q = new Quads();
    const env: PropEnv = { ...f.propEnv(null), seed: 0.37 };
    for (const o of list) {
      const art = getProp(o.id, o.opts ?? {});
      if (!art) continue;
      const rec: Slab[] | null = solids ? [] : null;
      if (art.box) this.building(q, art, o, env, sv, rec);
      else this.thing(q, art, o, env, sv, rec);
      if (solids && rec?.length) solids.push({ name: `outskirts:${o.id}@${o.x},${o.y}`, kind: art.box ? 'building' : 'prop', foot: o.y * 16 + art.foot, x: o.x * 16, slabs: rec });
    }
    if (q.empty) return;
    const tex = this.atlas.texture();
    const mat = litMaterial(tex);
    // a step darker than the town (further away; the fog does the rest)
    mat.color.setScalar(dim);
    this.mesh = new THREE.Mesh(q.geometry(this.atlas.height), mat);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
  }

  /** A house as the town stands its buildings up (town.ts BuildingView): facade, roof on a box, the strip above it, side walls. */
  private building(q: Quads, art: PropArt, o: Far, env: PropEnv, sv: number, rec: Slab[] | null): void {
    const b = art.box!;
    const orig = art.img(env);
    if (!orig) return;
    let img = orig;
    if (o.flip) img = mirrored(img);
    if (o.crop) img = cropped(img, o.crop[0], o.crop[1]);
    const uv = this.atlas.add(img);
    const iw = img.width;
    const ih = img.height;
    const faceY = b.top + b.R * 16;
    const x0 = (o.x * 16 + art.ox) * PX;
    const x1 = x0 + iw * PX;
    const zf = (o.y * 16 + art.foot) * PX;
    const tune = TUNE[o.id] ?? {};
    const D = b.R || o.depth || tune.depth || 2;
    const zb = zf - D;
    const hF = b.F * sv;
    const rise = tune.rise ?? 0;
    // the storeys the 2D never shows (tune.ts upper), as the town's building has them
    const up = tune.upper;
    const hTop = hF + (up ? up.n * (up.r1 - up.r0) * PX * sv : 0);
    if (up) {
      const rh = up.r1 - up.r0;
      const cw = up.c1 - up.c0;
      const [uc, uctx] = canvas(iw, rh * up.n);
      for (let k = 0; k < up.n; k++) for (let x = 0; x < iw; x += cw) uctx.drawImage(orig, up.c0, faceY + up.r0, cw, rh, x, k * rh, cw, rh);
      const uuv = this.atlas.add(uc);
      const a = uuv(0, rh * up.n);
      const c = uuv(iw, 0);
      q.add([x0, hF, zf], [x1, hF, zf], [x1, hTop, zf], [x0, hTop, zf], [0, 0, 1], a[0], a[1], c[0], c[1]);
    }
    const side = solidFace(this.atlas.swatch(sideColour(img, faceY)));
    box(q, x0, x1, 0, hF, zb, zf, { front: { uv, c0: 0, r0: faceY, c1: iw, r1: ih } });
    box(q, x0, x1, 0, hTop, zb, zf, { left: side, right: side, back: side });
    rec?.push({ x0: x0 / PX, x1: x1 / PX, h0: 0, h1: b.F * 16, z0: zb / PX, z1: zf / PX, face: true });
    if (b.R) {
      const a = uv(0, faceY);
      const c = uv(iw, b.top);
      const l = Math.hypot(D, rise) || 1;
      q.add([x0, hF, zf], [x1, hF, zf], [x1, hF + rise, zb], [x0, hF + rise, zb], [0, D / l, rise / l], a[0], a[1], c[0], c[1]);
    } else box(q, x0, x1, 0, hTop, zb, zf, { top: solidFace(this.atlas.swatch(tune.roof ?? sideColour(img, faceY))) });
    if (b.top > 0 && !tune.lid) {
      const a = uv(0, b.top);
      const c = uv(iw, 0);
      const y = hTop + rise;
      q.add([x0, y, zb], [x1, y, zb], [x1, y + b.top * PX * sv, zb], [x0, y + b.top * PX * sv, zb], [0, 0, 1], a[0], a[1], c[0], c[1]);
    }
  }

  /** A tree (trunk column, crown boards) or a pole (column, arms pushed back). */
  private thing(q: Quads, art: PropArt, o: Far, env: PropEnv, sv: number, rec: Slab[] | null): void {
    const img = art.img(env);
    if (!img) return;
    const uv: UvFn = this.atlas.add(img);
    const left = o.x * 16 + art.ox;
    const top = o.y * 16 + art.oy;
    const foot = o.y * 16 + art.foot;
    const tree = o.id.startsWith('tree_');
    const st = standUp(q, new Mask(img), uv, { iw: img.width, ih: img.height, left, top, foot }, { kind: tree ? 'tree' : 'pole', depth: 3 }, sv, 0, rec ?? undefined);
    const crown = tree ? art.fg?.[0]?.img(env) : null;
    if (crown && art.fg) {
      const part = art.fg[0];
      const ptop = o.y * 16 + part.oy;
      const rf = Math.max(0, Math.min(crown.height, foot - ptop));
      if (rf > 0) {
        const D = crown.width * 0.55 * PX;
        crownBoards(q, this.atlas.add(crown), crown.width, rf, o.x * 16 + part.ox, (foot - ptop) * PX * sv, PX * sv, st.cx, st.cz, D);
        // (the crown's middle board, for the overlap check)
        const m = rec ? new Mask(crown) : null;
        const cl = o.x * 16 + part.ox;
        const ht = foot - ptop;
        if (m) rec!.push({ x0: cl, x1: cl + crown.width, h0: ht - rf, h1: ht, z0: st.cz / PX, z1: st.cz / PX, face: true, at: (x, h) => m.at(Math.floor(x - cl), Math.floor(ht - h)) });
      }
    }
  }

  dispose(): void {
    if (this.mesh) {
      this.mesh.geometry.dispose();
      (this.mesh.material as THREE.Material).dispose();
    }
    this.atlas.dispose();
  }
}

// ---------------------------------------------------------------- the town below the roof

/**
 * 屋上 ゆうやけひろば is the roof of the mall (bld_mall, map_town (34,0), 24
 * tiles wide as the roof): under it, `drop` units down, the town itself —
 * its ground, its walls and hedges, its houses, trees and poles as the town
 * stands them (a step darker, the fog over the far part) — with the mall's
 * front under the roof's south edge (the town's y 6 at the roof's y 15),
 * and north of the mall the trees of the hill behind it.
 */
const BELOW = { map: 'map_town', dx: -34, dz: 9, x0: -8, x1: 84, y0: -24, y1: 36 };

let belowGround: HTMLCanvasElement | null = null;

export class BelowTown {
  readonly group = new THREE.Group();
  private readonly parts: { dispose(): void }[] = [];

  constructor(f: FieldScene, sv: number, drop: number) {
    const town = loadMap(BELOW.map);
    if (!town) return;
    this.group.position.y = -drop;
    const { dx, dz, x0, x1, y0, y1 } = BELOW;
    // the ground (baked once: the town's own chunks)
    if (!belowGround) {
      // (half size: it lies far below, in the tilt-shift's blur; grass and fields round the town)
      const [c, ctx] = canvas((x1 - x0) * 8, (y1 - y0) * 8);
      ctx.save();
      ctx.scale(0.5, 0.5);
      // the town's ground as its 3D view baked it (with its own land round it), when it was
      // seen in HD-2D on the way here; else baked now (the town's chunks: ~0.5 s once)
      const seen = [...groundCache.entries()].find(([k]) => k.startsWith(`${BELOW.map}|`));
      if (seen) {
        const [mx, mn] = seen[0].split('|')[1].split(',').map(Number);
        ctx.fillStyle = ctx.createPattern(groundPatch('grass', 0), 'repeat')!;
        ctx.fillRect(0, 0, c.width * 2, c.height * 2);
        ctx.drawImage(seen[1], (-mx - x0) * 16, (-mn - y0) * 16);
      } else {
        const gc = new GroundCache(town);
        ctx.fillStyle = ctx.createPattern(groundPatch('grass', gc.src.seed), 'repeat')!;
        ctx.fillRect(0, 0, c.width * 2, c.height * 2);
        for (let cy = 0; cy * 256 < Math.min(y1, town.h) * 16; cy++)
          for (let cx = 0; cx * 256 < Math.min(x1, town.w) * 16; cx++) ctx.drawImage(gc.chunk(cx, cy), cx * 256 - x0 * 16, cy * 256 - y0 * 16);
      }
      // the road behind the mall, north of the town (town y −5..−3), as the town's own lanes
      ctx.fillStyle = ctx.createPattern(groundPatch('asphalt', 0), 'repeat')!;
      ctx.fillRect(0, (-5 - y0) * 16, c.width * 2, 32);
      ctx.restore();
      belowGround = c;
    }
    const tex = new THREE.CanvasTexture(belowGround);
    tex.colorSpace = THREE.SRGBColorSpace;
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, y1 - y0).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ map: tex }));
    ground.position.set((x0 + x1) / 2 + dx, 0, (y0 + y1) / 2 + dz);
    ground.receiveShadow = true;
    ground.material.color.setScalar(0.86);
    this.group.add(ground);
    this.parts.push({ dispose: () => (tex.dispose(), ground.geometry.dispose(), ground.material.dispose()) });
    // its walls, hedges and fences
    const walls = buildWalls(town, sv, { x: 0, n: 0, s: 0 });
    if (walls) {
      walls.mesh.position.set(dx, 0, dz);
      (walls.mesh.material as THREE.MeshLambertMaterial).color.setScalar(0.86);
      this.group.add(walls.mesh);
      this.parts.push(walls);
    }
    // its houses, trees and poles (the mall itself is what the roof stands on)
    const list: Far[] = [];
    for (const o of town.objects) {
      if (o.t !== 'prop') continue;
      const id = o.prop;
      if (id === 'bld_mall' || !(id.startsWith('bld_') || id.startsWith('tree_') || id === 'prop_utility_pole')) continue;
      if (o.x < x0 - 2 || o.x >= x1 || o.y < y0 || o.y >= y1) continue;
      list.push({ id, x: o.x + dx, y: o.y + dz, opts: o.opts as Record<string, unknown> | undefined });
    }
    // past the town's edges what its own 3D view stands there (LAYOUT.map_town: the school
    // north of the park, the houses east of the railway...), and behind the mall, along the
    // road north of it, the houses of the next street and the hill's trees (town tiles)
    for (const o of LAYOUT[BELOW.map] ?? []) list.push({ ...o, x: o.x + dx, y: o.y + dz });
    const north: [string, number, number, Record<string, unknown>, boolean?][] = [
      ['bld_madam', 30, -10, {}, true],
      ['bld_slopetop', 36, -9, {}],
      ['bld_ojii', 42, -10, {}, true],
      ['bld_mizumaki', 47, -9, {}],
      ['bld_madam', 53, -10, {}],
      ['bld_ojii', 66, -10, {}],
      ['bld_slopetop', 72, -9, {}, true],
      ['prop_utility_pole', 33, -6, { ad: 'bank', lamp: true }],
      ['prop_utility_pole', 45, -6, { ad: 'dog', lamp: true }],
      ['prop_utility_pole', 57, -6, { ad: 'lashes', lamp: true }],
      ['tree_kusu', 40, -13, { v: 0 }],
      ['tree_sakura', 51, -14, { v: 1 }],
      ['tree_matsu', 58, -12, { v: 0 }],
      ['tree_kusu', 27, -14, { v: 1 }],
      ['tree_ichou', 69, -14, { v: 0 }],
      ['tree_kusu', 46, -18, { v: 1 }],
      ['tree_matsu', 34, -19, { v: 1 }],
    ];
    for (const [id, x, y, opts, flip] of north) list.push({ id, x: x + dx, y: y + dz, opts, flip });
    const things = new Outskirts(f, sv, null, list, 0.8);
    if (things.mesh) this.group.add(things.mesh);
    this.parts.push(things);
    // the mall's front under the roof's south edge: its ground floor as the
    // town's facade, above it the blank upper wall (a bay of the facade's
    // plain wall, x 0–36, rows 26–50, along it) and the blue band under the parapet
    const mall = getProp('bld_mall', {});
    const img = mall?.img(f.propEnv(null));
    if (mall?.box && img) {
      const fy = mall.box.top + mall.box.R * 16;
      const hF = mall.box.F * sv;
      const rows = Math.max(4, Math.round((drop - 0.5 - hF) / (PX * sv)));
      const [c, ctx] = canvas(img.width, img.height - fy + rows);
      ctx.drawImage(img, 0, fy + 4, img.width, 4, 0, 0, img.width, 4);
      for (let y = 4; y < rows; y += 24) for (let x = 0; x < img.width; x += 36) ctx.drawImage(img, 0, 26, 36, 24, x, y, 36, Math.min(24, rows - y));
      ctx.drawImage(img, 0, fy, img.width, img.height - fy, 0, rows, img.width, img.height - fy);
      const ftex = pixelTexture(c);
      const q = new Quads();
      const z = 15 + 0.03;
      const top = hF + rows * PX * sv;
      q.add([0, 0, z], [img.width * PX, 0, z], [img.width * PX, top, z], [0, top, z], [0, 0, 1], 0, 0, 1, 1);
      const m = new THREE.Mesh(q.geometry(), litMaterial(ftex));
      m.receiveShadow = true;
      this.group.add(m);
      this.parts.push({ dispose: () => (ftex.dispose(), m.geometry.dispose(), (m.material as THREE.Material).dispose()) });
    }
  }

  dispose(): void {
    for (const p of this.parts) p.dispose();
  }
}

// ---------------------------------------------------------------- the sky behind the roof's north fence

/**
 * The evening sky as the roof's 2D draws it over its north fence (the
 * shell's rows 0–25: the bands of the sunset, the long clouds, the hills),
 * the fence painted out, as a backdrop far north: in 3D the camera sees past
 * the fence and the drop to the hills (no fog on it: it is the sky).
 */
export function skyBackdrop(f: FieldScene): THREE.Mesh | null {
  const p = f.props.find((q) => q.obj.t === 'prop' && q.obj.prop === 'mall_roof_shell');
  const src = p?.art.img(f.propEnv(p));
  if (!src) return null;
  const Hh = 26;
  const [c, ctx] = canvas(src.width, Hh);
  ctx.drawImage(src, 0, 0, src.width, Hh, 0, 0, src.width, Hh);
  // the fence out: a fence pixel takes the sky's colour to its left (the bands run along the rows), a rail row the row above
  const d = ctx.getImageData(0, 0, src.width, Hh);
  const fence = new Set([P.concreteLt, P.steel, P.asphalt, P.white].map((h) => parseInt(h.slice(1), 16)));
  const rgb = (i: number) => (d.data[i] << 16) | (d.data[i + 1] << 8) | d.data[i + 2];
  for (let y = 0; y < Hh; y++)
    for (let x = 0; x < src.width; x++) {
      const i = (y * src.width + x) * 4;
      if (!fence.has(rgb(i))) continue;
      let k = x - 1;
      while (k >= 0 && fence.has(rgb((y * src.width + k) * 4))) k--;
      const j = k >= 0 ? (y * src.width + k) * 4 : y > 0 ? i - src.width * 4 : i;
      d.data[i] = d.data[j];
      d.data[i + 1] = d.data[j + 1];
      d.data[i + 2] = d.data[j + 2];
    }
  ctx.putImageData(d, 0, 0);
  // smooth (it is far): four times larger, drawn soft
  const [big, bctx] = canvas(src.width * 4, Hh * 4);
  bctx.imageSmoothingEnabled = true;
  bctx.drawImage(c, 0, 0, big.width, big.height);
  const tex = new THREE.CanvasTexture(big);
  tex.colorSpace = THREE.SRGBColorSpace;
  // (placed by the town each frame: town.ts SKY_AT)
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(64, 9.5), new THREE.MeshBasicMaterial({ map: tex, fog: false }));
  mesh.renderOrder = -1;
  return mesh;
}
