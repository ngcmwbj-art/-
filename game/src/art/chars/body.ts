// Shared body-part helpers for humanoid sprites: legs with walk/run cycles,
// limbs drawn along paths, standard arm swing, eyes and simple faces.

import type { Fig } from './fig';
import type { Pose } from './rig';

export type Pt = [number, number];

/** Bresenham points from a to b (inclusive). */
export function path(x0: number, y0: number, x1: number, y1: number): Pt[] {
  x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
  const out: Pt[] = [];
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  for (let n = 0; n < 256; n++) {
    out.push([x0, y0]);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x0 += sx; }
    if (e2 <= dx) { err += dx; y0 += sy; }
  }
  return out;
}

/** Polyline through several points (no duplicated joints). */
export function polyPath(pts: Pt[]): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i + 1 < pts.length; i++) {
    const seg = path(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]);
    if (i > 0) seg.shift();
    out.push(...seg);
  }
  if (pts.length === 1) out.push(pts[0]);
  return out;
}

export interface Seg {
  mat: string;
  /** Number of path pixels in this material (last segment takes the rest). */
  n?: number;
  tone?: number | null;
}

/**
 * Draw a limb along a path. `segs` color consecutive stretches (sleeve,
 * forearm, hand...). `w` = thickness; extra columns go toward `side`
 * (-1 left, +1 right).
 */
export function limb(f: Fig, pts: Pt[], segs: Seg[], w = 1, side = 1): void {
  let k = 0;
  let si = 0;
  let left = segs[0].n ?? Infinity;
  for (const [x, y] of pts) {
    while (left <= 0 && si < segs.length - 1) {
      si++;
      left = segs[si].n ?? Infinity;
    }
    const s = segs[si];
    f.m(s.mat).t(s.tone ?? null);
    for (let j = 0; j < w; j++) f.px(x + j * side, y);
    left--;
    k++;
  }
  f.t(null);
}

// ---- legs -----------------------------------------------------------------

export interface LegSpec {
  /** Center column boundary (pixels cx-1 | cx straddle the middle). */
  cx: number;
  /** Top row of the legs when standing (below the pelvis/garment). */
  hip: number;
  /** Row of the soles. */
  foot: number;
  /** Leg thickness (px). */
  w?: number;
  /** Gap between the legs in front/back view. */
  gap?: number;
  /** Leg material (skin, trousers...). */
  mat: string;
  /** Optional lower-leg material (socks / boots) and its height from the sole up. */
  low?: { mat: string; h: number };
  /** Shoe material. */
  shoe: string;
  /** Shoe length in side view (default 3). */
  shoeLen?: number;
  /** Extra shoe height rows (boots). */
  shoeH?: number;
  /** Tone for the far leg in side view. */
  farShift?: number;
}

function legColumn(f: Fig, x: number, y0: number, y1: number, L: LegSpec, w: number, shift: number) {
  // y0 top, y1 sole row. Material bands from the bottom up.
  const lowH = L.low?.h ?? 0;
  const shoeH = L.shoeH ?? 1;
  for (let y = y0; y <= y1; y++) {
    const fromBottom = y1 - y;
    let m = L.mat;
    if (fromBottom < shoeH) m = L.shoe;
    else if (fromBottom < shoeH + lowH) m = L.low!.mat;
    f.m(m);
    for (let i = 0; i < w; i++) f.px(x + i, y);
  }
  void shift;
}

/**
 * Legs for walk / run / stand in every view. Parts: far leg then near leg, so
 * call it before the torso. `p.bob` moves the hip; the soles stay planted.
 */
export function legs(f: Fig, p: Pose, L: LegSpec): void {
  const w = L.w ?? 2;
  const gap = L.gap ?? 2;
  const hip = L.hip + p.bob;
  const foot = L.foot;
  const run = p.run;
  const st = p.step % 4;
  if (p.view === 'down' || p.view === 'up') {
    const lx = L.cx - Math.ceil(gap / 2) - w; // viewer-left leg
    const rx = L.cx + Math.floor(gap / 2);
    // lift: which leg is raised this frame
    let liftL = 0;
    let liftR = 0;
    if (st === 1) liftL = run ? 2 : 1;
    if (st === 3) liftR = run ? 2 : 1;
    if (run && st === 0) liftR = 1;
    if (run && st === 2) liftL = 1;
    f.part(L.mat, { shade: 'r', light: '', shift: p.view === 'up' ? -1 : 0 });
    legColumn(f, lx, hip, foot - liftL, L, w, 0);
    f.part(L.mat, { shade: 'r', light: '', shift: -1 });
    legColumn(f, rx, hip, foot - liftR, L, w, 0);
    // soles of a lifted foot in back view
    if (p.view === 'up') {
      f.part(L.shoe, { flat: true });
      if (liftL) f.t(-1).rect(lx, foot - liftL, w, 1).t(null);
      if (liftR) f.t(-1).rect(rx, foot - liftR, w, 1).t(null);
    }
    return;
  }
  // side view (facing left): forward = -x
  const x = L.cx - 1; // leg column (w wide)
  const sl = L.shoeLen ?? 3;
  type LegPose = { dx: number; lift: number; bend?: number };
  let near: LegPose = { dx: 0, lift: 0 };
  let far: LegPose = { dx: 0, lift: 0 };
  if (!run) {
    if (st === 1) { near = { dx: -2, lift: 0 }; far = { dx: 2, lift: 0 }; }
    if (st === 2) { near = { dx: 0, lift: 0 }; far = { dx: 1, lift: 1 }; }
    if (st === 3) { near = { dx: 2, lift: 0 }; far = { dx: -2, lift: 0 }; }
  } else {
    if (st === 0) { near = { dx: -3, lift: 0 }; far = { dx: 3, lift: 1 }; }
    if (st === 1) { near = { dx: -1, lift: 0 }; far = { dx: 1, lift: 2, bend: 1 }; }
    if (st === 2) { near = { dx: 3, lift: 1 }; far = { dx: -3, lift: 0 }; }
    if (st === 3) { near = { dx: 1, lift: 2, bend: 1 }; far = { dx: -1, lift: 0 }; }
  }
  const drawLeg = (lp: LegPose, shift: number) => {
    f.part(L.mat, { shade: 'r', light: '', shift });
    const fy = foot - lp.lift;
    const fx = x + lp.dx;
    const kneeY = Math.round((hip + fy) / 2);
    const kx = lp.bend ? x + lp.dx + 1 : Math.round(x + lp.dx / 2);
    const pts = polyPath([[x, hip], [kx, kneeY], [fx, fy]]);
    // material bands along the leg by height above the sole
    const lowH = L.low?.h ?? 0;
    const shoeH = L.shoeH ?? 1;
    for (const [px, py] of pts) {
      const fb = fy - py;
      f.m(fb < shoeH ? L.shoe : fb < shoeH + lowH ? L.low!.mat : L.mat);
      for (let i = 0; i < w; i++) f.px(px + i, py);
    }
    // shoe toe forward (left)
    f.m(L.shoe);
    for (let i = 1; i <= sl - w; i++) f.px(fx - i, fy);
    if ((L.shoeH ?? 1) > 1) for (let i = 1; i <= sl - w - 1; i++) f.px(fx - i, fy - 1);
  };
  drawLeg(far, L.farShift ?? -1);
  drawLeg(near, 0);
}

// ---- arms -----------------------------------------------------------------

export interface ArmSpec {
  /** Shoulder point (standing, before bob). */
  sx: number;
  sy: number;
  /** Hand point relative to the shoulder when hanging. */
  hx: number;
  hy: number;
  segs: Seg[];
  w?: number;
  /** Direction extra width goes (-1/+1). */
  side?: number;
  shift?: number;
}

/** Draw one arm to an absolute hand target (hand = last path pixel). */
export function armTo(f: Fig, a: ArmSpec, hx: number, hy: number, elbow?: Pt, partMat?: string): void {
  f.part(partMat ?? a.segs[0].mat, { shade: 'rb', light: 't', shift: a.shift ?? 0 });
  const pts = elbow ? polyPath([[a.sx, a.sy], elbow, [hx, hy]]) : path(a.sx, a.sy, hx, hy);
  limb(f, pts, a.segs, a.w ?? 1, a.side ?? 1);
}

/** Hanging arm with walk swing (front/back views): swing moves the hand ±1 row. */
export function armHang(f: Fig, a: ArmSpec, dy: number, dx = 0): void {
  armTo(f, a, a.sx + a.hx + dx, a.sy + a.hy + dy);
}

/** Swing amount for the viewer-left (-1) / viewer-right (+1) arm on a walk frame. */
export function swing(p: Pose, side: -1 | 1): number {
  const st = p.step % 4;
  if (p.mode !== 'walk' && p.mode !== 'run') return 0;
  const a = p.run ? 2 : 1;
  if (st === 1) return side < 0 ? -a : a;
  if (st === 3) return side < 0 ? a : -a;
  return 0;
}

// ---- faces ------------------------------------------------------------------

/** Two front-view eyes. `x` = viewer-left eye column; `d` = distance to the other. */
export function eyesFront(f: Fig, x: number, y: number, d: number, o: { h?: number; blink?: boolean; mat?: string; shine?: string; up?: boolean } = {}): void {
  const h = o.h ?? 2;
  f.part(o.mat ?? 'eye', { flat: true, rim: false });
  if (o.blink) {
    f.px(x, y + h - 1).px(x + d, y + h - 1);
    return;
  }
  const yy = o.up ? y - 1 : y;
  f.rect(x, yy, 1, h).rect(x + d, yy, 1, h);
  if (o.shine && h >= 2) {
    f.part(o.shine, { flat: true, rim: false });
    f.px(x, yy).px(x + d, yy);
  }
}
