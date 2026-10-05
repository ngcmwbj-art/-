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
import { bakeGround } from '../art/tiles/ground';
import { getProp } from '../art/props/registry';
import type { PropArt, PropEnv } from '../art/props/types';
import type { FieldScene } from '../world/field';
import { crownBoards, standUp } from './props3d';
import { Atlas, box, canvas, litMaterial, Mask, PX, Quads, solidFace, type UvFn } from './solid';
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
  // the map's own ground (the field's chunks)
  for (let cy = 0; cy * N < mh; cy++) for (let cx = 0; cx * N < mw; cx++) ctx.drawImage(f.ground.chunk(cx, cy), cx * N + ox, cy * N + oy);
  groundCache.set(key, c);
  return c;
}

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

  /** `solids`: where the room each thing takes goes (QA, overlap.ts). */
  constructor(f: FieldScene, sv: number, solids: Solid[] | null = null) {
    const list = LAYOUT[f.map.id];
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
    mat.color.setScalar(0.86);
    this.mesh = new THREE.Mesh(q.geometry(this.atlas.height), mat);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
  }

  /** A house as the town stands its buildings up (town.ts BuildingView): facade, roof on a box, the strip above it, side walls. */
  private building(q: Quads, art: PropArt, o: Far, env: PropEnv, sv: number, rec: Slab[] | null): void {
    const b = art.box!;
    let img = art.img(env);
    if (!img) return;
    if (o.flip) img = mirrored(img);
    const uv = this.atlas.add(img);
    const iw = img.width;
    const ih = img.height;
    const faceY = b.top + b.R * 16;
    const x0 = (o.x * 16 + art.ox) * PX;
    const x1 = x0 + iw * PX;
    const zf = (o.y * 16 + art.foot) * PX;
    const D = b.R || o.depth || 2;
    const zb = zf - D;
    const hF = b.F * sv;
    const rise = TUNE[o.id]?.rise ?? 0;
    const side = solidFace(this.atlas.swatch(sideColour(img, faceY)));
    box(q, x0, x1, 0, hF, zb, zf, { front: { uv, c0: 0, r0: faceY, c1: iw, r1: ih }, left: side, right: side, back: side });
    rec?.push({ x0: x0 / PX, x1: x1 / PX, h0: 0, h1: b.F * 16, z0: zb / PX, z1: zf / PX, face: true });
    if (b.R) {
      const a = uv(0, faceY);
      const c = uv(iw, b.top);
      const l = Math.hypot(D, rise) || 1;
      q.add([x0, hF, zf], [x1, hF, zf], [x1, hF + rise, zb], [x0, hF + rise, zb], [0, D / l, rise / l], a[0], a[1], c[0], c[1]);
    } else box(q, x0, x1, 0, hF, zb, zf, { top: solidFace(this.atlas.swatch(sideColour(img, faceY))) });
    if (b.top > 0) {
      const a = uv(0, b.top);
      const c = uv(iw, 0);
      const y = hF + rise;
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
