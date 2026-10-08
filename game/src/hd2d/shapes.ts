// HD-2D (2026-10-05 依頼主「街全体に広げる」, 02 #85): bodies built by hand
// for the props of the outdoor places whose one ¾-view picture is not one
// thing standing at its foot line — a fenced pool, the round diversion, the
// morning platform, a stage with its backdrop, the roof's parapets. Every
// surface is still a rect of the prop's own picture (its uv): what the 2D
// draws as a top lies at the height it stands for, what it draws as a face
// stands, a receding fence becomes a fence along z.
//
// Picture coordinates are the art's own px (the skin's margin, `pad`, is
// added here); world px are the map's (x east, z south); heights are px of
// the 2D picture above the ground (× PX × SV in 3D, as everything standing).

import { P } from '../art/tiles/palette';
import type { Slab } from './overlap';
import type { Stood } from './props3d';
import { box, extrude, type Face, type Mask, PX, type Quads, type UvFn, type V3 } from './solid';

/** What a shape builds with: the picture (its uv and mask), where it is drawn, the ground's height there. */
export interface Kit {
  q: Quads;
  m: Mask;
  uv: UvFn;
  sv: number;
  /** The ground's height under it (units). */
  lift: number;
  rec?: Slab[];
  /** World px of the art's (0, 0) (without the margin). */
  x: number;
  y: number;
  /** The foot line (world y). */
  foot: number;
  /** The art's size (px). */
  w: number;
  h: number;
  /** The skin's margin round the art (over() / glow() reach past it). */
  pad: number;
  opts: Record<string, unknown>;
}

export type Shape = (k: Kit) => Stood;

// ---------------------------------------------------------------- helpers

/** Picture px (art) → uv. */
function puv(k: Kit): UvFn {
  return (c, r) => k.uv(c + k.pad, r + k.pad);
}

/** Height (units) of `px` picture px above the ground (`abs`: above 0, not the ground's step). */
function H(k: Kit, px: number, abs = false): number {
  return (abs ? 0 : k.lift) + px * PX * k.sv;
}

/** The overlap record's height (picture rows) of `px` above the ground. */
function hRow(k: Kit, px: number): number {
  return k.lift / (PX * k.sv) + px;
}

/**
 * Rect c0..c1 × r0..r1 of the picture standing with its painted pixels
 * pushed back `depth` px: its front at world z, its bottom row's lower edge
 * `base` px above the ground, its left column at world x (default: where
 * the 2D draws it).
 */
function stand(k: Kit, c0: number, r0: number, c1: number, r1: number, z: number, base = 0, depth = 0, x = k.x + c0, abs = false): void {
  const p = k.pad;
  extrude(k.q, k.m, c0 + p, r0 + p, c1 + p, r1 + p, { x0: x * PX, yTop: H(k, base + (r1 - r0), abs), sy: PX * k.sv, zf: z * PX }, depth * PX, k.uv);
  if (k.rec) {
    const m = k.m;
    const h0 = hRow(k, base);
    k.rec.push({ x0: x, x1: x + (c1 - c0), h0, h1: h0 + (r1 - r0), z0: z - depth, z1: z, face: true, at: (wx, hh) => m.at(Math.floor(wx - x) + c0 + p, r1 - 1 - Math.floor(hh - h0) + p) });
  }
}

/** Rect c0..c1 × r0..r1 of the picture lying flat `h` px up: its north-west corner at world (x, z), `w` × `d` px (default: its own size). */
function lie(k: Kit, c0: number, r0: number, c1: number, r1: number, x: number, z: number, h: number, w = c1 - c0, d = r1 - r0, abs = false): void {
  const uv = puv(k);
  const a = uv(c0, r1);
  const b = uv(c1, r0);
  const y = H(k, h, abs) + 0.004;
  const x0 = x * PX;
  const x1 = (x + w) * PX;
  const zN = z * PX;
  const zS = (z + d) * PX;
  k.q.add([x0, y, zS], [x1, y, zS], [x1, y, zN], [x0, y, zN], [0, 1, 0], a[0], a[1], b[0], b[1]);
}

/** A face of one pixel's colour. */
function px1(k: Kit, c: number, r: number): Face {
  const uv = puv(k);
  return { uv, c0: c + 0.5, r0: r + 0.5, c1: c + 0.5, r1: r + 0.5 };
}

/** A rect of the picture as a box face. */
function rect(k: Kit, c0: number, r0: number, c1: number, r1: number): Face {
  return { uv: puv(k), c0, r0, c1, r1 };
}

/**
 * A fence running north–south at world x, from z0 to z1, `h` px high, both
 * sides showing `face` (an east–west run's face of the same fence: its
 * columns go along z).
 */
function nsFence(k: Kit, x: number, z0: number, z1: number, h: number, face: Face, base = 0): void {
  box(k.q, x * PX, (x + 1) * PX, H(k, base), H(k, base + h), z0 * PX, z1 * PX, { left: face, right: face });
  if (k.rec) k.rec.push({ x0: x, x1: x + 1, h0: hRow(k, base), h1: hRow(k, base + h), z0, z1 });
}

/** The quad of a standing strip between two points on the ground (a wall of a round thing), its uv given per corner. */
function wallQuad(q: Quads, a: [number, number], b: [number, number], y0: number, y1: number, uv: number[]): void {
  const n = norm([b[1] - a[1], 0, -(b[0] - a[0])]);
  q.add4([a[0], y0, a[1]], [b[0], y0, b[1]], [b[0], y1, b[1]], [a[0], y1, a[1]], n, uv);
}

function norm(v: V3): V3 {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
}

/**
 * Something round drawn in ¾ view (a ring wall, a cylinder): its centre at
 * picture (cx, cy) on the ground (world (wx, wz)), radii rx × ry (px; the
 * picture's ellipse), `h` px tall. The south half of its outer face (the
 * part the picture shows) stands as a wall wrapped in the picture's columns
 * (rows from its top edge, cy − h + dy, to its foot, cy + dy); the lid (its
 * top as the picture draws it, centred h rows higher) lies on top, cut to
 * the ellipse (and to the ring between r and `hole` × r when given).
 */
function round(k: Kit, cx: number, cy: number, wx: number, wz: number, rx: number, ry: number, h0: number, h1: number, lid: boolean, hole = 0): void {
  const uv = puv(k);
  const N = 28;
  const y0 = H(k, h0);
  const y1 = H(k, h1);
  const at = (a: number, s = 1): [number, number] => [(wx + Math.cos(a) * rx * s) * PX, (wz + Math.sin(a) * ry * s) * PX];
  // the outer face: the half facing south (sin > 0) and a little round the sides
  for (let i = 0; i < N; i++) {
    const a0 = (i / N) * Math.PI * 2;
    const a1 = ((i + 1) / N) * Math.PI * 2;
    if (Math.sin((a0 + a1) / 2) < -0.15) continue;
    const pa = at(a0);
    const pb = at(a1);
    const ca = cx + Math.cos(a0) * rx;
    const cb = cx + Math.cos(a1) * rx;
    const da = Math.max(0, Math.sin(a0)) * ry;
    const db = Math.max(0, Math.sin(a1)) * ry;
    // (the picture's face of that column: from the top edge down to the foot)
    const ua = uv(ca, cy + da)[0];
    const ub = uv(cb, cy + db)[0];
    const vba = uv(0, cy - h0 + da)[1];
    const vbb = uv(0, cy - h0 + db)[1];
    const vta = uv(0, cy - h1 + da + 0.5)[1];
    const vtb = uv(0, cy - h1 + db + 0.5)[1];
    wallQuad(k.q, pa, pb, y0, y1, [ua, vba, ub, vbb, ub, vtb, ua, vta]);
  }
  if (!lid) return;
  // the lid: a fan (or a ring) of the picture's top, centred h1 rows up
  const ly = cy - h1;
  for (let i = 0; i < N; i++) {
    const a0 = (i / N) * Math.PI * 2;
    const a1 = ((i + 1) / N) * Math.PI * 2;
    const p = (a: number, s: number): [V3, number, number] => {
      const [x, z] = at(a, s);
      const t = uv(cx + Math.cos(a) * rx * s, ly + Math.sin(a) * ry * s);
      return [[x, y1, z], t[0], t[1]];
    };
    const [A, ua, va] = p(a0, 1);
    const [B, ub, vb] = p(a1, 1);
    if (hole > 0) {
      const [C, uc, vc] = p(a1, hole);
      const [D, ud, vd] = p(a0, hole);
      k.q.add4(D, C, B, A, [0, 1, 0], [ud, vd, uc, vc, ub, vb, ua, va]);
    } else {
      const c = uv(cx, ly);
      // (a triangle: the fourth corner repeats the third)
      k.q.add4([wx * PX, y1, wz * PX], B, A, A, [0, 1, 0], [c[0], c[1], ub, vb, ua, va, ua, va]);
    }
  }
}

/** The far (north) half of a ring's inner face, from h0 to h1 px, wrapped in the picture's rows above the water (centre row cy). */
function innerFar(k: Kit, cx: number, cy: number, wx: number, wz: number, rx: number, ry: number, h0: number, h1: number): void {
  const uv = puv(k);
  const N = 24;
  for (let i = 0; i < N; i++) {
    const a0 = Math.PI + (i / N) * Math.PI;
    const a1 = Math.PI + ((i + 1) / N) * Math.PI;
    // (facing south: walked east → west so the quad faces the inside)
    const pa: [number, number] = [(wx + Math.cos(a1) * rx) * PX, (wz + Math.sin(a1) * ry) * PX];
    const pb: [number, number] = [(wx + Math.cos(a0) * rx) * PX, (wz + Math.sin(a0) * ry) * PX];
    const ca = cx + Math.cos(a1) * rx;
    const cb = cx + Math.cos(a0) * rx;
    const ra = cy + Math.sin(a1) * ry;
    const rb = cy + Math.sin(a0) * ry;
    const ua = uv(ca, 0)[0];
    const ub = uv(cb, 0)[0];
    wallQuad(k.q, pa, pb, H(k, h0), H(k, h1), [ua, uv(0, ra)[1], ub, uv(0, rb)[1], ub, uv(0, rb - (h1 - h0))[1], ua, uv(0, ra - (h1 - h0))[1]]);
  }
}

function stood(k: Kit, top: number, cx = k.x + k.w / 2, cz = k.foot): Stood {
  return { stand: [k.lift, H(k, top)], cx: cx * PX, cz: cz * PX, solid: true, noXray: true };
}

// ---------------------------------------------------------------- 夕鳴小学校 裏庭 (map_school)

/**
 * The class garden's bamboo fence running north–south (prop_sch_gakuen w /
 * e1 / e2): the picture is its top seen from above; in 3D three rails along
 * z and an upright every 8px, in the bamboo's own colours.
 */
const gakuenNS: Shape = (k) => {
  const FH = 13;
  // the run: the strip's rows FH.. are its top line, from z = y0 to the foot
  const z0 = k.y + FH;
  const z1 = k.y + k.h;
  const x = k.x + 2;
  const q = k.q;
  const hi = px1(k, 2, FH + 1);
  const mid = px1(k, 3, FH + 1);
  const lo = px1(k, 4, FH + 1);
  for (const r of [2, 6, 10]) box(q, x * PX, (x + 2) * PX, H(k, r), H(k, r + 2), z0 * PX, z1 * PX, { top: hi, left: mid, right: lo, front: mid });
  for (let z = z0 + 3; z < z1 - 1; z += 8) box(q, x * PX, (x + 2) * PX, H(k, 0), H(k, FH), z * PX, (z + 2) * PX, { top: hi, left: mid, right: lo, front: mid });
  k.rec?.push({ x0: x, x1: x + 2, h0: hRow(k, 0), h1: hRow(k, FH), z0, z1 });
  return { ...stood(k, FH, x + 1, z1), noXray: true };
};

/**
 * The pool behind its mesh (prop_sch_pool, 128 × 108, its row 12 = world
 * y 64): the deck and the water lie flat — the water 5px down in its basin,
 * the far inner wall and the west one standing — the north and south mesh
 * runs stand, the west one runs along z; past the east edge the pool goes
 * on two tiles and its mesh closes it.
 */
const pool: Shape = (k) => {
  const WX0 = 22;
  const WY0 = 34;
  const WY1 = 86;
  const NB = 22;
  const SB = 102;
  const Z = (r: number) => k.y + r;
  const X = (c: number) => k.x + c;
  const EAST = 2 * 16;
  const W = k.w;
  // the deck: north of the basin, west of it, the coping, south of it
  lie(k, 4, NB, W, WY0 - 3, X(4), Z(NB), 0, W - 4 + EAST);
  lie(k, 4, WY0 - 3, WX0 - 2, WY1 + 3, X(4), Z(WY0 - 3), 0);
  lie(k, WX0 - 2, WY0 - 3, W, WY0 - 1, X(WX0 - 2), Z(WY0 - 3), 0, W - WX0 + 2 + EAST);
  lie(k, WX0 - 2, WY1 + 1, W, WY1 + 3, X(WX0 - 2), Z(WY1 + 1), 0, W - WX0 + 2 + EAST);
  // (south of the basin the mesh is painted over the deck: the plain deck of the north strip)
  lie(k, 4, NB, W, NB + 9, X(4), Z(WY1 + 3), 0, W - 4 + EAST, SB - WY1 - 3);
  // the water, 5px down; past the edge it goes on (its east columns again)
  const wl = -5;
  lie(k, WX0, WY0 + 1, W, WY1 + 1, X(WX0), Z(WY0 + 1), wl, W - WX0, WY1 - WY0, true);
  lie(k, W - EAST, WY0 + 1, W, WY1 + 1, X(W), Z(WY0 + 1), wl, EAST, WY1 - WY0, true);
  // the deck at the far east end, and the basin's east coping
  lie(k, 4, NB, 12, WY1 + 3, X(W + EAST), Z(NB), 0, 8, WY1 + 3 - NB);
  // the far inner wall (the band of blue tile) and the west one (the coping's concrete)
  const yW = H(k, wl, true);
  const yT = H(k, 0);
  const far = puv(k);
  const fa = far(WX0, WY0 + 1);
  const fb = far(W, WY0 - 1);
  k.q.add([X(WX0) * PX, yW, Z(WY0) * PX], [(X(W) + EAST) * PX, yW, Z(WY0) * PX], [(X(W) + EAST) * PX, yT, Z(WY0) * PX], [X(WX0) * PX, yT, Z(WY0) * PX], [0, 0, 1], fa[0], fa[1], fb[0], fb[1]);
  box(k.q, (X(WX0) - 0.2) * PX, X(WX0) * PX, yW, yT, Z(WY0) * PX, Z(WY1 + 1) * PX, { right: px1(k, WX0 - 1, 60) });
  // the mesh: north and south runs standing (the signs on the south one), the west one along z
  stand(k, 2, NB - 16, W, NB + 1, Z(NB), 0, 1);
  stand(k, 2, NB - 16, 2 + EAST + 6, NB + 1, Z(NB), 0, 1, X(W) - 2);
  stand(k, 2, SB - 16, W, SB + 1, Z(SB), 0, 1);
  stand(k, 2, SB - 16, 2 + EAST + 6, SB + 1, Z(SB), 0, 1, X(W) - 2);
  const face = rect(k, 20, SB - 16, 20 + (SB - NB), SB + 1);
  nsFence(k, X(2), Z(NB), Z(SB), 17, face);
  nsFence(k, X(W + EAST + 6), Z(NB), Z(SB), 17, face);
  return stood(k, 16, X(W / 2), Z(SB));
};

// ---------------------------------------------------------------- 夕鳴小学校 校庭 (map_school_kotei)

/**
 * The morning platform (prop_kotei_chorei, 52 × 36): a box — the chequered
 * top plate (rows 6–16) lies on it, the braced front (rows 16–35) stands,
 * its sides in the frame's dark green — and the steps on its east side.
 */
const chorei: Shape = (k) => {
  const T0 = 6;
  const F0 = 16;
  const B = 35;
  const D = 12;
  const zf = k.foot;
  const x0 = k.x + 2;
  const x1 = k.x + 46;
  const hF = B - F0;
  box(k.q, x0 * PX, x1 * PX, H(k, 0), H(k, hF), (zf - D) * PX, zf * PX, {
    front: rect(k, 2, F0, 46, B),
    top: rect(k, 2, T0, 46, F0),
    left: px1(k, 2, F0 + 4),
    right: px1(k, 45, F0 + 4),
  });
  // the steps (three treads going down east)
  stand(k, 46, T0 + 6, 52, B, zf, 0, 4);
  k.rec?.push({ x0, x1, h0: hRow(k, 0), h1: hRow(k, hF), z0: zf - D, z1: zf, face: true });
  return stood(k, hF);
};

/** The sand pit's wooden frame (prop_kotei_sunaba, flat): low boards round the pit sunk a step (places.ts). */
const sunabaFrame: Shape = (k) => {
  const FX = 80;
  const FY = 48;
  const h = 3;
  const wood = px1(k, 10, 0);
  const lit = px1(k, 10, 0);
  const dark = px1(k, 10, FY - 1);
  const X = (c: number) => (k.x + c) * PX;
  const Z = (r: number) => (k.y + r) * PX;
  // (above 0: the pit is sunk, the frame stands on the ground round it)
  const y0 = H(k, -2, true);
  const y1 = H(k, h, true);
  box(k.q, X(0), X(FX), y0, y1, Z(0), Z(2), { top: lit, front: wood });
  box(k.q, X(0), X(FX), y0, y1, Z(FY - 2), Z(FY), { top: lit, front: dark });
  box(k.q, X(FX - 2), X(FX), y0, y1, Z(0), Z(FY), { top: lit, left: wood, right: dark, front: dark });
  return stood(k, h);
};

// ---------------------------------------------------------------- 畦道の先の 分水 (map_aze)

/**
 * The round diversion in its fence (prop_bunsui, 112 × 126; its row 14 =
 * world y 64): the apron and the channels lie flat; the outer ring stands
 * 6px (its rim a ring on top, the water inside 2px up with the far inner
 * wall above it), the inner cylinder 12px with the water spilling down its
 * face; the four mesh runs of the fence stand (the gate in the south one).
 */
const bunsui: Shape = (k) => {
  const CX = 56;
  const GY = 70;
  const RO = { rx: 36, ry: 27, h: 6 };
  const RI = { rx: 12, ry: 9, h: 12 };
  const HW = 2;
  const NB = 16;
  const SB = 123;
  const Z = (r: number) => k.y + r;
  const X = (c: number) => k.x + c;
  const wx = X(CX);
  const wz = Z(GY);
  // the ground inside the fence (apron, channels), without the fence's own pixels
  lie(k, 4, NB + 1, 108, SB - 12, X(4), Z(NB + 1), 0);
  // the outer ring: its face (south half) and the rim on top (a ring); inside, the water and the far wall
  round(k, CX, GY, wx, wz, RO.rx, RO.ry, 0, RO.h, true, 1 - 3 / RO.rx);
  const irx = RO.rx - 3;
  const iry = RO.ry - 2.5;
  // (the water as the picture draws it, centred HW rows up: an ellipse at HW)
  round(k, CX, GY, wx, wz, irx, iry, HW, HW, true);
  innerFar(k, CX, GY - HW, wx, wz, irx, iry, HW, RO.h);
  // the inner cylinder: the sheet of water down its face, the crest and the boil on top
  round(k, CX, GY, wx, wz, RI.rx, RI.ry, HW, RI.h, true);
  // the fence: north and south runs, the two sides along z
  stand(k, 2, NB - 12, 110, NB + 1, Z(NB), 0, 1);
  stand(k, 2, SB - 12, 110, SB + 1, Z(SB), 0, 1);
  const face = rect(k, 2, SB - 12, 2 + (SB - NB), SB + 1);
  nsFence(k, X(2), Z(NB), Z(SB), 13, face);
  nsFence(k, X(108), Z(NB), Z(SB), 13, face);
  k.rec?.push({ x0: wx - RO.rx, x1: wx + RO.rx, h0: hRow(k, 0), h1: hRow(k, RI.h), z0: wz - RO.ry, z1: wz + RO.ry });
  return stood(k, 12, wx, Z(SB));
};

/** A shed / box drawn as a building is (rows r0..r1 its top, the rows below to the foot its face), the top `depth` px deep. */
function boxy(r0: number, r1: number, c0?: number, c1?: number, depth?: number): Shape {
  return (k) => {
    const a = c0 ?? 0;
    const b = c1 ?? k.w;
    const rf = k.foot - k.y;
    const hF = rf - r1;
    const D = depth ?? r1 - r0;
    const zf = k.foot;
    const x0 = k.x + a;
    const x1 = k.x + b;
    box(k.q, x0 * PX, x1 * PX, H(k, 0), H(k, hF), (zf - D) * PX, zf * PX, {
      front: rect(k, a, r1, b, rf),
      top: rect(k, a, r0, b, r1),
      left: px1(k, a + 1, r1 + Math.floor(hF / 2)),
      right: px1(k, b - 2, r1 + Math.floor(hF / 2)),
    });
    // what stands above the top (a board on the roof) and beside the box
    if (r0 > 0) stand(k, a, 0, b, r0, zf - D / 2, hF, 2);
    if (a > 0) stand(k, 0, 0, a, rf, zf, 0, 3);
    if (b < k.w) stand(k, b, 0, k.w, rf, zf, 0, 3);
    // the rows below the foot line lie on the ground in front
    if (rf < k.h) lie(k, 0, rf, k.w, k.h, k.x, zf, 0);
    k.rec?.push({ x0, x1, h0: hRow(k, 0), h1: hRow(k, hF), z0: zf - D, z1: zf, face: true });
    return stood(k, hF + r0);
  };
}

// ---------------------------------------------------------------- 夕鳴川の 堰 (map_seki)

/**
 * The bridge's south parapet (prop_seki_bridge_s, 148 × 30): the parapet
 * stands on the deck; the girder's face (rows 17–24) hangs from the deck's
 * edge (world y 64) down to the river (places.ts: 8px below the bank); the
 * shadow under it lies on the water. The bridge goes on west to となり町.
 */
const bridgeS: Shape = (k) => {
  const TOP = 4;
  const BOT = 15;
  const W = 144;
  const zEdge = 64.06;
  const deck = 2;
  const river = -8;
  const WEST = 16 * 16;
  // the parapet (its picture again further west, a post every 16px matches)
  stand(k, 0, 0, W - 6, BOT + 1, k.foot, deck, 4, k.x, true);
  for (let x = k.x - 128; x >= k.x - WEST; x -= 128) stand(k, 0, TOP, 128, BOT + 1, k.foot, deck, 4, x, true);
  stand(k, W - 6, 0, W + 4, BOT + 1, k.foot, deck, 4, k.x + W - 6, true);
  // the girder's face, hanging over the river
  const uv = puv(k);
  const g0 = uv(0, BOT + 9);
  const g1 = uv(W - 4, BOT + 2);
  const yT = H(k, deck, true);
  const yB = H(k, river, true);
  k.q.add([(k.x - WEST) * PX, yB, zEdge * PX], [(k.x + W) * PX, yB, zEdge * PX], [(k.x + W) * PX, yT, zEdge * PX], [(k.x - WEST) * PX, yT, zEdge * PX], [0, 0, 1], g0[0], g0[1], g1[0] + ((g1[0] - g0[0]) * WEST) / W, g1[1]);
  return { stand: [H(k, deck, true), H(k, deck + BOT - TOP, true)], cx: (k.x + W / 2) * PX, cz: k.foot * PX, solid: true, noXray: true };
};

/** The north parapet (prop_seki_bridge_n): as the town's walls, and again west along the bridge. */
const bridgeN: Shape = (k) => {
  const W = 144;
  stand(k, 0, 0, W + 4, k.h, k.foot, 2, 4, k.x, true);
  for (let x = k.x - 128; x >= k.x - 16 * 16; x -= 128) stand(k, 0, 2, 128, k.h, k.foot, 2, 4, x, true);
  return { stand: [H(k, 2, true), H(k, 2 + k.h, true)], cx: (k.x + W / 2) * PX, cz: k.foot * PX, solid: true, noXray: true };
};

// ---------------------------------------------------------------- 屋上 ゆうやけひろば (map_mall_roof)

/**
 * The roof's shell (mall_roof_shell, flat 384 × 240): the deck stays the
 * ground; in 3D the parapets get their bodies — the north one (its coping
 * rows 24–31) with the mesh fence on it (rows 0–25 of the picture without
 * the sky: only the fence's own colours are kept, mask set by the caller),
 * the west and east ones as long boxes with their rails and posts, the
 * outer wall dropping from the south edge.
 */
const shell: Shape = (k) => {
  const W = 384;
  const Hh = 240;
  const PH = 8;
  const X = (c: number) => (k.x + c) * PX;
  const Z = (r: number) => (k.y + r) * PX;
  const y0 = H(k, 0, true);
  const yP = H(k, PH, true);
  // north parapet (z 24–32): its coping on top, its inner face to the deck
  box(k.q, X(0), X(W), y0, yP, Z(24), Z(32), { top: rect(k, 0, 24, W, 28), front: rect(k, 0, 27, W, 32) });
  // the fence on it (rows 0–23 of the picture, the sky left out: the mask)
  stand(k, 0, 0, W, 24, 26, PH, 0, k.x, true);
  // west and east parapets: coping (cols 2–11 / W−12..W−2), inner faces
  box(k.q, X(0), X(12), y0, yP, Z(24), Z(Hh - 12), { top: rect(k, 0, 24, 12, Hh - 12), right: rect(k, 12, 40, 13, 40 + (Hh - 36)) });
  box(k.q, X(W - 12), X(W), y0, yP, Z(24), Z(Hh - 12), { top: rect(k, W - 12, 24, W, Hh - 12), left: rect(k, W - 13, 40, W - 12, 40 + (Hh - 36)) });
  // their rails and posts (the rail columns 6–7 / W−8..W−7 of the picture)
  for (const [c, lt] of [
    [6, 7],
    [W - 8, W - 7],
  ] as const) {
    const rail = px1(k, lt, 60);
    const dk = px1(k, c, 60);
    for (const hh of [PH + 6, PH + 13]) box(k.q, X(c), X(c + 2), H(k, hh, true), H(k, hh + 1.5, true), Z(26), Z(Hh - 14), { top: rail, left: dk, right: rail, front: rail });
    for (let r = 40; r < Hh - 14; r += 32) box(k.q, X(c - 1), X(c + 3), y0, H(k, PH + 15, true), Z(r), Z(r + 2), { top: rail, left: dk, right: rail, front: rail });
  }
  return { stand: [y0, H(k, PH + 24, true)], cx: X(W / 2), cz: Z(Hh), solid: true, noXray: true };
};

/**
 * The stage (mall_roof_stage, 144 × 62; its row r is world y r + 2): a
 * platform 7px high (the red carpet its top, the 紅白幕 its front), the
 * backdrop board standing at its back, the mic stand and the speaker on it.
 */
const stage: Shape = (k) => {
  const PF = 7;
  const c0 = 8;
  const c1 = 136;
  const zf = k.y + 62;
  const zb = zf - 21;
  box(k.q, (k.x + c0) * PX, (k.x + c1) * PX, H(k, 0), H(k, PF), zb * PX, zf * PX, {
    front: rect(k, c0, 55, c1, 62),
    top: rect(k, c0, 34, c1, 55),
    left: px1(k, c0, 58),
    right: px1(k, c1 - 1, 58),
  });
  // the backdrop and its stands, at the platform's back
  stand(k, 24, 0, 120, 37, zb + 3, PF, 2);
  stand(k, 30, 4, 32, 39, zb + 1, PF, 1);
  stand(k, 112, 4, 114, 39, zb + 1, PF, 1);
  // the mic stand (x 49–55, rows 34–51) and the speaker (x 122–133, rows 24–45)
  stand(k, 49, 34, 56, 51, zb + 18, PF, 1);
  stand(k, 122, 24, 134, 46, zb + 9, PF, 4);
  k.rec?.push({ x0: k.x + c0, x1: k.x + c1, h0: hRow(k, 0), h1: hRow(k, PF), z0: zb, z1: zf, face: true });
  return stood(k, PF + 37);
};

/** The south fence on the parapet (mall_roof_fence_s): standing on the coping, PH up. */
const fenceS: Shape = (k) => {
  const rf = k.foot - k.y;
  stand(k, 0, 0, k.w, rf, k.foot, 0, 1);
  return { stand: [k.lift, H(k, rf)], cx: (k.x + k.w / 2) * PX, cz: k.foot * PX, solid: false, noXray: false };
};

// ---------------------------------------------------------------- 夕鳴公園 (map_town): the clock tower

/**
 * 時計塔 (prop_clocktower, 34 × 92; foot at its bottom row): the stone
 * pedestal, the fluted shaft and the clock box as boxes — the box's face on
 * all four sides, as a tower clock has it — under its green hipped cap, a
 * pyramid of the cap's rows. (2026-10-05, 依頼主の「書き割りっぽい所」.)
 */
const clocktower: Shape = (k) => {
  const B = k.h - 1;
  const h = (r: number) => B - r;
  const zf = k.foot;
  const X = (c: number) => (k.x + c) * PX;
  const block = (c0: number, c1: number, r0: number, r1: number, d: number, top?: Face) => {
    const zc = zf - 8;
    const face = rect(k, c0, r0, c1, r1);
    box(k.q, X(c0), X(c1), H(k, h(r1)), H(k, h(r0)), (zc - d / 2) * PX, (zc + d / 2) * PX, { front: face, left: face, right: face, back: face, top });
    k.rec?.push({ x0: k.x + c0, x1: k.x + c1, h0: hRow(k, h(r1)), h1: hRow(k, h(r0)), z0: zc - d / 2, z1: zc + d / 2, face: true });
  };
  // pedestal, shaft, clock box
  block(1, 33, 72, B, 16, px1(k, 16, 72));
  block(10, 24, 26, 72, 12, px1(k, 16, 30));
  block(6, 28, 10, 32, 20, px1(k, 16, 11));
  // the cap: a pyramid from the box's top edge to the finial's foot (its front rows on each side)
  const uv = puv(k);
  const zc = (zf - 8) * PX;
  const r = 13 * PX;
  const d = 12 * PX;
  const y0 = H(k, h(11));
  const y1 = H(k, h(-1));
  const apex: V3 = [X(17), y1, zc];
  const base = uv(4, 11);
  const tip = uv(17, 0);
  const right = uv(30, 11);
  const corners: [number, number][] = [
    [X(17) - r, zc + d],
    [X(17) + r, zc + d],
    [X(17) + r, zc - d],
    [X(17) - r, zc - d],
  ];
  for (let i = 0; i < 4; i++) {
    const [ax, az] = corners[i];
    const [bx, bz] = corners[(i + 1) % 4];
    const n = norm([bz - az, 0.6, -(bx - ax)]);
    k.q.add4([ax, y0, az], [bx, y0, bz], apex, apex, n, [base[0], base[1], right[0], right[1], tip[0], tip[1], tip[0], tip[1]]);
  }
  // the finial
  box(k.q, X(16.5), X(17.5), y1, H(k, h(-6)), zc - 0.5 * PX, zc + 0.5 * PX, { front: px1(k, 17, 0), left: px1(k, 17, 0), right: px1(k, 17, 0) });
  return { stand: [k.lift, H(k, k.h)], cx: X(17), cz: zc, solid: true };
};

// ---------------------------------------------------------------- ツガオ便 at 星見台's turning circle

/**
 * The olive kei truck parked side-on, facing west (prop_tsugao_truck, 48×32,
 * art/props/hoshi_tsugaobin.ts; 2026-10-08 依頼主「箱をりったいてきに」, 02 #91):
 * the cab and the bed a truck's width (16 px) deep, as the moving one
 * (actors.ts vehicleGeometry), and the yellow crates of the delivery real
 * boxes — each tier (the lower one on the bed, rows 9–13; the upper one on
 * top of it, rows 4–8 with their outline) in three rows across the bed with
 * a px between them, so the load reads as crates from above, not as long bars.
 */
const tsugaoTruck: Shape = (k) => {
  const rf = k.foot - k.y;
  const D = 16;
  stand(k, 0, 0, 17, rf, k.foot, 0, D);
  stand(k, 17, 14, k.w, rf, k.foot, 0, D);
  const seg = (D - 2) / 3;
  for (const [r0, r1] of [
    [9, 14],
    [0, 9],
  ] as const)
    for (let i = 0; i < 3; i++) stand(k, 17, r0, k.w, r1, k.foot - i * (seg + 1), rf - r1, seg);
  if (rf < k.h) lie(k, 0, rf, k.w, k.h, k.x, k.foot, 0);
  return stood(k, rf);
};

// ---------------------------------------------------------------- 星見台: 地図の はしの 柵 (02 #92)

/**
 * A fence down the west or east edge of the village (prop_h_edge_saku,
 * side 'w' / 'e'; art/props/hoshi_public.ts): the picture is the run seen
 * from above; in 3D a fence along z — the log fence two rails 2px thick
 * (4 and 9 px up) and a post every tile, the electric fence two thin wires
 * (3 and 6 px up) and its white posts — in the picture's own colours.
 * (side 's', an east–west run, stands as any picture does.)
 */
const edgeFence: Shape = (k) => {
  const len = Math.max(1, Number(k.opts.len ?? 1));
  const ex = k.h - len * 16;
  const z0 = k.y + ex;
  const z1 = z0 + len * 16;
  const q = k.q;
  const efence = k.opts.mat === 'efence';
  const mid = Math.floor(k.h / 2);
  const x = k.x + 7;
  let top: number;
  if (efence) {
    const pr = (len - 1) * 16 + 17;
    const white = px1(k, 7, pr);
    const steel = px1(k, 8, pr);
    const wire = px1(k, 7, mid);
    top = 9;
    for (const h of [3, 6]) box(q, (x + 0.5) * PX, (x + 1) * PX, H(k, h), H(k, h + 0.5), z0 * PX, z1 * PX, { top: wire, left: wire, right: wire, front: wire });
    const posts = [z0 + 4, z1 - 3];
    for (let z = Math.ceil((z0 + 1) / 32) * 32 + 20; z < z1 - 8; z += 32) if (z > z0 + 8) posts.push(z);
    for (const z of posts) box(q, x * PX, (x + 2) * PX, H(k, 0), H(k, top), (z - 1) * PX, (z + 1) * PX, { top: white, left: white, right: steel, front: white, back: steel });
  } else {
    const lt = px1(k, 5, mid);
    const wd = px1(k, 6, mid);
    const dkf = px1(k, 7, mid);
    top = 12;
    for (const h of [4, 9]) box(q, x * PX, (x + 2) * PX, H(k, h), H(k, h + 2), z0 * PX, z1 * PX, { top: lt, left: wd, right: dkf, front: wd });
    const posts = [z0 + 3, z1 - 2];
    for (let z = z0 + 16; z < z1 - 6; z += 16) posts.push(z);
    for (const z of posts) box(q, (x - 0.5) * PX, (x + 2.5) * PX, H(k, 0), H(k, top), (z - 1.5) * PX, (z + 1.5) * PX, { top: lt, left: wd, right: dkf, front: wd, back: dkf });
  }
  k.rec?.push({ x0: x - 1, x1: x + 3, h0: hRow(k, 0), h1: hRow(k, top), z0, z1 });
  return { ...stood(k, top, x + 1, z1), noXray: true };
};

// ---------------------------------------------------------------- the table

/** Shapes by prop id (a function of the opts where one picture serves several). */
export function shapeOf(id: string, opts: Record<string, unknown>): Shape | null {
  switch (id) {
    case 'prop_sch_gakuen':
      return opts.side === 'n' || opts.side === 's' || opts.side === undefined ? null : gakuenNS;
    case 'prop_sch_pool':
      return pool;
    case 'prop_kotei_chorei':
      return chorei;
    case 'prop_bunsui':
      return bunsui;
    case 'prop_aze_monooki':
      return boxy(0, 12, 0, 34, 14);
    case 'prop_seki_bridge_s':
      return bridgeS;
    case 'prop_seki_bridge_n':
      return bridgeN;
    case 'mall_roof_stage':
      return stage;
    case 'mall_roof_machine':
      return boxy(18, 26, 0, 68, 14);
    case 'mall_roof_tank':
      return boxy(0, 16, 0, 52, 18);
    case 'mall_roof_skylight':
      return boxy(0, 20, 0, 52, 20);
    case 'mall_roof_fence_s':
      return fenceS;
    case 'prop_clocktower':
      return clocktower;
    case 'prop_tsugao_truck':
      return tsugaoTruck;
    case 'prop_h_edge_saku':
      return opts.side === 'w' || opts.side === 'e' ? edgeFence : null;
    default:
      return null;
  }
}

/** The roof shell's picture for its bodies: rows 0–24 (the view over the north fence) keep only the fence's own colours. */
function fenceOnly(c: HTMLCanvasElement): HTMLCanvasElement {
  const o = document.createElement('canvas');
  o.width = c.width;
  o.height = c.height;
  const ctx = o.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(c, 0, 0);
  const keep = new Set([P.concreteLt, P.steel, P.asphalt, P.white].map((h) => h.toLowerCase()));
  const d = ctx.getImageData(0, 0, c.width, 24);
  const hex = (v: number) => v.toString(16).padStart(2, '0');
  for (let i = 0; i < d.data.length; i += 4) if (!keep.has(`#${hex(d.data[i])}${hex(d.data[i + 1])}${hex(d.data[i + 2])}`)) d.data[i + 3] = 0;
  ctx.putImageData(d, 0, 0);
  return o;
}

/** 3D bodies for flat props (they stay in the ground's picture too); `prep`: the picture they are built from. */
export function flatShapeOf(id: string): { shape: Shape; prep?: (c: HTMLCanvasElement) => HTMLCanvasElement } | null {
  switch (id) {
    case 'prop_kotei_sunaba':
      return { shape: sunabaFrame };
    case 'mall_roof_shell':
      return { shape: shell, prep: fenceOnly };
    default:
      return null;
  }
}
