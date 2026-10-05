// HD-2D prototype (round 2): the walls, hedges, fences and rails of the
// ASCII layer as solid things — one atlas of their cell pictures, one mesh.
//
//  - block walls: a box 4px thick; its face rows in front, the cap rows on
//    top, the run's ends painted with the end columns of the picture; a
//    north–south run is a box down the cells, its top the picture's cap
//    strip, its sides the material's face (as an east–west run shows it);
//  - hedges: the leafy mass a box: the face rows in front, the top rows on
//    top (as deep as the 2D picture draws them);
//  - mesh fences: two panels 3px apart with the top rail across; guard
//    rails, pipe rails and ropes: pushed back 3px (the voxel look);
//    the railway fence (north–south): rails and posts;
//  - reeds stay standing pictures.
//
// The runs that meet a map edge (a wall along the road, the guardrail, the
// reeds, the railway's fences) go on past it into the land outside (MARGIN).

import * as THREE from 'three';
import { P } from '../art/tiles/palette';
import { structureCell, type CellArt, type CellMask } from '../art/tiles/structures';
import { cellAt, charAt, type LoadedMap } from '../world/maps';
import { Atlas, box, extrude, litMaterial, Mask, PX, Quads, solidFace, type Face } from './solid';

/** world/structures.ts's kinds and default materials (by the cell's tag). */
const DEFAULT_MAT: Record<string, [string, string]> = {
  wall: ['wall', 'block'],
  hedge: ['hedge', 'tsuge'],
  fence: ['fence', 'mesh'],
  guardrail: ['guardrail', 'rail'],
};

/** A wall's thickness (px). */
const T = 4;
/** world/structures.ts wallCell: a north–south run's strip (lit edge + cap) starts at this column, 4px wide. */
const VX0 = 3;

export interface Margin {
  x: number;
  n: number;
  s: number;
}

/**
 * The map's characters, and past its edges the runs that go on: a wall,
 * hedge or fence that crosses the edge (it runs along the edge's normal and
 * does not turn there) goes on `margin` tiles into the land outside.
 */
function grid(m: LoadedMap, mg: Margin) {
  const { w, h } = m;
  const same = (x: number, y: number, ch: string) => charAt(m, x, y) === ch;
  const structural = (x: number, y: number) => !!DEFAULT_MAT[cellAt(m, x, y).tag ?? ''];
  const edgeOf = (x: number, y: number): [number, number] | null => {
    const out = (x < 0 ? 1 : 0) + (x >= w ? 1 : 0) + (y < 0 ? 1 : 0) + (y >= h ? 1 : 0);
    if (!out) return [x, y];
    if (out > 1) return null;
    if (x < 0 || x >= w) {
      if (Math.abs(x < 0 ? x : x - w + 1) > mg.x) return null;
      const ex = x < 0 ? 0 : w - 1;
      const inn = x < 0 ? 1 : w - 2;
      const ch = charAt(m, ex, y);
      return structural(ex, y) && same(inn, y, ch) && !same(ex, y - 1, ch) && !same(ex, y + 1, ch) ? [ex, y] : null;
    }
    if (y < 0 ? -y > mg.n : y - h + 1 > mg.s) return null;
    const ey = y < 0 ? 0 : h - 1;
    const inn = y < 0 ? 1 : h - 2;
    const ch = charAt(m, x, ey);
    return structural(x, ey) && same(x, inn, ch) && !same(x - 1, ey, ch) && !same(x + 1, ey, ch) ? [x, ey] : null;
  };
  const ch = (x: number, y: number): string => {
    const e = edgeOf(x, y);
    return e ? charAt(m, e[0], e[1]) : ' ';
  };
  const kindMat = (x: number, y: number): [string, string] | null => {
    const e = edgeOf(x, y);
    if (!e) return null;
    const dm = DEFAULT_MAT[cellAt(m, e[0], e[1]).tag ?? ''];
    if (!dm) return null;
    let [kind, mat] = dm;
    const c = charAt(m, e[0], e[1]);
    for (const z of m.def.structMats ?? []) if (e[0] >= z.x && e[1] >= z.y && e[0] < z.x + z.w && e[1] < z.y + z.h && (!z.ch || z.ch === c)) mat = z.mat;
    return [kind, mat];
  };
  return { ch, kindMat };
}

/** A wall material's face height and cap rows (from an east–west cell of it). */
function wallDims(mat: string): { H: number; cap: number } {
  const probe = structureCell('wall', mat, 0, 0, { n: false, s: false, e: true, w: true });
  const H = probe.shadow || 18;
  return { H, cap: Math.max(1, probe.img.height - 16 - H) };
}

export interface Walls {
  mesh: THREE.Mesh;
  atlas: Atlas;
  dispose(): void;
}

/** Every wall, hedge, fence and rail of the map (and their runs past the edges) as one mesh. */
export function buildWalls(m: LoadedMap, sv: number, mg: Margin): Walls | null {
  const g = grid(m, mg);
  const atlas = new Atlas();
  const q = new Quads();
  const dims = new Map<string, { H: number; cap: number }>();
  const masks = new Map<HTMLCanvasElement, Mask>();
  const maskOf = (c: HTMLCanvasElement) => {
    let k = masks.get(c);
    if (!k) masks.set(c, (k = new Mask(c)));
    return k;
  };
  const Y = (px: number) => px * PX * sv;
  let n = 0;
  for (let ty = -mg.n; ty < m.h + mg.s; ty++)
    for (let tx = -mg.x; tx < m.w + mg.x; tx++) {
      const km = g.kindMat(tx, ty);
      if (!km) continue;
      const [kind, mat] = km;
      const c = g.ch(tx, ty);
      const mk: CellMask = { n: g.ch(tx, ty - 1) === c, s: g.ch(tx, ty + 1) === c, e: g.ch(tx + 1, ty) === c, w: g.ch(tx - 1, ty) === c };
      const art = structureCell(kind, mat, tx, ty, mk);
      const ox = tx * 16;
      const foot = ty * 16 + 16;
      n++;
      if (kind === 'wall' && !mat.startsWith('h_')) {
        let d = dims.get(mat);
        if (!d) dims.set(mat, (d = wallDims(mat)));
        wallCell(q, atlas, art, kind, mat, tx, ty, mk, d, Y);
      } else if (kind === 'hedge' && mat !== 'reeds') hedgeCell(q, atlas, art, mat, tx, ty, mk, Y);
      else if (kind === 'fence' && mat === 'railfence') railFenceCell(q, atlas, tx, ty, mk, Y);
      else if (kind === 'fence' && mat === 'mesh') {
        const uv = atlas.add(art.img);
        const k = maskOf(art.img);
        const top = ty * 16 + art.oy;
        const st = (z: number) => ({ x0: (ox + art.ox) * PX, yTop: Y(foot - top), sy: PX * sv, zf: z });
        const rf = art.img.height;
        // two panels, the top rail across them, the end posts
        extrude(q, k, 0, 0, 16, rf, st((foot - 2) * PX), 0, uv);
        extrude(q, k, 0, 0, 16, rf, st((foot - 5) * PX), 0, uv);
        let r0 = 0;
        while (r0 < rf && k.count(0, r0, 16, r0 + 1) < 8) r0++;
        if (r0 < rf) box(q, ox * PX, (ox + 16) * PX, 0, Y(foot - top - r0), (foot - 5) * PX, (foot - 2) * PX, { top: solidFace(uv, 8, r0) });
        if (!mk.w) box(q, (ox + 2) * PX, (ox + 4) * PX, 0, Y(foot - top - r0 + 1), (foot - 5) * PX, (foot - 2) * PX, { left: { uv, c0: 2.5, r0: r0, c1: 2.5, r1: rf }, top: solidFace(uv, 2, r0) });
        if (!mk.e) box(q, (ox + 14) * PX, (ox + 16) * PX, 0, Y(foot - top - r0 + 1), (foot - 5) * PX, (foot - 2) * PX, { right: { uv, c0: 15.5, r0: r0, c1: 15.5, r1: rf }, top: solidFace(uv, 14, r0) });
      } else if (kind === 'fence' || kind === 'guardrail') {
        // rails, ropes and posts: pushed back 3px
        const uv = atlas.add(art.img);
        const top = ty * 16 + art.oy;
        extrude(q, maskOf(art.img), 0, 0, art.img.width, art.img.height, { x0: (ox + art.ox) * PX, yTop: Y(foot - top), sy: PX * sv, zf: (foot - 1) * PX }, 3 * PX, uv);
      } else standing(q, atlas, art, tx, ty, Y);
    }
  if (!n) return null;
  const tex = atlas.texture();
  const geo = q.geometry(atlas.height);
  const mesh = new THREE.Mesh(geo, litMaterial(tex));
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return {
    mesh,
    atlas,
    dispose() {
      geo.dispose();
      (mesh.material as THREE.Material).dispose();
      atlas.dispose();
    },
  };
}

/** A picture standing at the tile's foot as before (reeds, unknown kinds): rows above the foot up, none below. */
function standing(q: Quads, atlas: Atlas, art: CellArt, tx: number, ty: number, Y: (px: number) => number): void {
  const uv = atlas.add(art.img);
  const left = tx * 16 + art.ox;
  const top = ty * 16 + art.oy;
  const foot = ty * 16 + 16;
  const ih = art.img.height;
  const rf = Math.max(0, Math.min(ih, foot - top));
  const a = uv(0, rf);
  const b = uv(art.img.width, 0);
  const x0 = left * PX;
  const x1 = (left + art.img.width) * PX;
  if (rf > 0) q.add([x0, Y(foot - top - rf), foot * PX], [x1, Y(foot - top - rf), foot * PX], [x1, Y(foot - top), foot * PX], [x0, Y(foot - top), foot * PX], [0, 0, 1], a[0], a[1], b[0], b[1]);
}

function wallCell(q: Quads, atlas: Atlas, art: CellArt, kind: string, mat: string, tx: number, ty: number, mk: CellMask, d: { H: number; cap: number }, Y: (px: number) => number): void {
  const uv = atlas.add(art.img);
  const hh = art.img.height;
  const fT = 16 + d.cap;
  const ox = tx * 16;
  const foot = ty * 16 + 16;
  const vertical = mk.s || (mk.n && !mk.e && !mk.w);
  const horiz = mk.e || mk.w || !vertical;
  const H = Y(d.H);
  // the face of the run as an east–west cell draws it (for the sides of a north–south run; one per material)
  const run = structureCell(kind, mat, 0, 0, { n: false, s: false, e: true, w: true });
  const ruv = atlas.add(run.img);
  if (horiz) {
    const x0 = mk.w ? 0 : vertical ? VX0 : 1;
    const x1 = mk.e ? 16 : vertical ? VX0 + 4 : 15;
    // where the run goes on south the cell has no face: the plain run's
    const plain = mk.s ? structureCell(kind, mat, tx, ty, { n: false, s: false, e: mk.e, w: mk.w }) : art;
    const puv = plain === art ? uv : atlas.add(plain.img);
    const ph = plain.img.height;
    box(q, (ox + x0) * PX, (ox + x1) * PX, 0, H, (foot - T) * PX, foot * PX, {
      front: { uv: puv, c0: x0, r0: ph - d.H, c1: x1, r1: ph },
      top: { uv, c0: x0, r0: 16, c1: x1, r1: fT },
      // the run's ends: the lit west edge, the dark east edge of the picture
      left: mk.w ? undefined : { uv: puv, c0: 1.5, r0: ph - d.H, c1: 1.5, r1: ph },
      right: mk.e ? undefined : { uv: puv, c0: 14.5, r0: ph - d.H, c1: 14.5, r1: ph },
    });
  }
  if (!horiz || mk.n) {
    // a north–south run down the cell (to the east–west part when there is one)
    const z0 = ty * 16;
    const z1 = horiz ? foot - T : foot;
    const side: Face = { uv: ruv, c0: 0, r0: run.img.height - d.H, c1: z1 - z0, r1: run.img.height };
    box(q, (ox + VX0) * PX, (ox + VX0 + 4) * PX, 0, H, z0 * PX, z1 * PX, {
      top: { uv, c0: VX0, r0: d.cap + (z0 - ty * 16), c1: VX0 + 4, r1: d.cap + (z1 - ty * 16) },
      left: side,
      right: side,
      // the south end of the run: its end face as drawn
      front: !horiz && !mk.s ? { uv, c0: VX0, r0: hh - d.H, c1: VX0 + 4, r1: hh } : undefined,
    });
  }
}

function hedgeCell(q: Quads, atlas: Atlas, art: CellArt, mat: string, tx: number, ty: number, mk: CellMask, Y: (px: number) => number): void {
  // world/structures.ts hedgeCell: 28 rows, the front face from row 14, the top above it
  const uv = atlas.add(art.img);
  const FT = 14;
  const hh = art.img.height;
  const ox = tx * 16;
  const foot = ty * 16 + 16;
  const xl = mk.w ? 0 : 3;
  const xr = mk.e ? 16 : 13;
  const zN = mk.n ? ty * 16 : foot - 10;
  const run = structureCell('hedge', mat, 0, 0, { n: false, s: false, e: true, w: true });
  const ruv = atlas.add(run.img);
  const side: Face = { uv: ruv, c0: 0, r0: FT, c1: Math.min(16, foot - zN), r1: run.img.height };
  // where the hedge goes on south, the east–west part still shows its face
  let front: Face | undefined;
  if (!mk.s) front = { uv, c0: xl, r0: FT, c1: xr, r1: hh };
  else if (mk.e || mk.w) {
    const plain = structureCell('hedge', mat, tx, ty, { n: false, s: false, e: mk.e, w: mk.w });
    front = { uv: atlas.add(plain.img), c0: xl, r0: FT, c1: xr, r1: plain.img.height };
  }
  box(q, (ox + xl) * PX, (ox + xr) * PX, 0, Y(hh - FT), zN * PX, foot * PX, {
    front,
    top: { uv, c0: xl, r0: Math.max(0, zN - ty * 16 - 2), c1: xr, r1: FT },
    left: mk.w ? undefined : side,
    right: mk.e ? undefined : side,
  });
}

/** The railway's wooden fence (north–south): two rails and a post every other tile. */
function railFenceCell(q: Quads, atlas: Atlas, tx: number, ty: number, mk: CellMask, Y: (px: number) => number): void {
  const lt = solidFace(atlas.swatch(P.woodLt));
  const md = solidFace(atlas.swatch(P.wood));
  const dk = solidFace(atlas.swatch(P.woodDark));
  const x0 = (tx * 16 + 7) * PX;
  const x1 = (tx * 16 + 10) * PX;
  const z0 = ty * 16 * PX;
  const z1 = (ty * 16 + 16) * PX;
  for (const [a, b] of [
    [4, 6],
    [9, 11],
  ])
    box(q, x0, x1, Y(a), Y(b), z0, z1, { top: lt, left: md, right: dk, front: mk.s ? undefined : md });
  if (ty % 2 === 0 || !mk.s) box(q, x0 - 0.5 * PX, x1 + 0.5 * PX, 0, Y(13), (ty * 16 + 6) * PX, (ty * 16 + 9) * PX, { top: lt, left: md, right: dk, front: md });
}

