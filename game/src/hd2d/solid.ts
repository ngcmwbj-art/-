// HD-2D prototype (2026-10-05 round 2, 02 #85): the tools that give the 2D
// pictures their thickness. Everything here writes quads into one
// BufferGeometry (Quads) whose uv point into a picture or an atlas of
// pictures (Atlas), so a whole set of things is one draw call:
//
//  - extrude(): the voxel look — the opaque pixels of a picture pushed back
//    a few px. One quad for the front (the picture itself, alpha-tested),
//    and for the sides and tops only the faces on the silhouette's edge,
//    merged along runs; each samples the colour of its edge pixel (one in
//    from the outline when that one is painted too). No back or bottom
//    faces: the camera always looks from the south and from above;
//  - prism(): an 8-sided column (poles, lamp posts, trunks) wrapped in the
//    columns of the picture it stood for;
//  - box(): a box with any of its faces mapped to a rect of the picture.
//
// Units: one tile = 1, world px × PX; up is +Y, south (the camera) is +Z.

import * as THREE from 'three';

export const PX = 1 / 16;

export type V3 = [number, number, number];

export function pixelTexture(c: HTMLCanvasElement): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  return t;
}

export function canvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.imageSmoothingEnabled = false;
  return [c, ctx];
}

/** The material of the town's pictures: lit, alpha-tested, both sides cast shadows. */
export function litMaterial(map: THREE.Texture | null, opts: THREE.MeshLambertMaterialParameters = {}): THREE.MeshLambertMaterial {
  return new THREE.MeshLambertMaterial({ map, alphaTest: 0.5, side: THREE.FrontSide, shadowSide: THREE.DoubleSide, ...opts });
}

/** A plane that only casts the shadow of its picture (never drawn on screen). */
export function casterMaterial(map: THREE.Texture | null): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({ map, alphaTest: 0.5, colorWrite: false, depthWrite: false, side: THREE.DoubleSide });
}

// ---------------------------------------------------------------- shadow-only meshes

let inShadowPass = false;

/**
 * The renderer's shadow pass marks itself (view.ts wraps shadowMap.render
 * with this), so meshes made shadowOnly() are drawn into the shadow map and
 * culled from the picture: no draw call for something that is never seen.
 */
export function markShadowPass(sm: { render: (...args: never[]) => void }): void {
  const orig = sm.render.bind(sm) as (...args: unknown[]) => void;
  (sm as { render: (...args: unknown[]) => void }).render = (...args: unknown[]) => {
    inShadowPass = true;
    try {
      orig(...args);
    } finally {
      inShadowPass = false;
    }
  };
}

/** Drawn into the shadow map only (see markShadowPass). */
export function shadowOnly<T extends THREE.Object3D>(o: T): T {
  o.frustumCulled = true;
  o.intersectsFrustum = () => inShadowPass;
  return o;
}

/** Quads collected into one BufferGeometry (one draw call per material). */
export class Quads {
  private pos: number[] = [];
  private nor: number[] = [];
  private uv: number[] = [];
  private idx: number[] = [];
  /** Corners a, b, c, d counter-clockwise seen from the front; uv (u0,v0) at a, (u1,v0) at b, (u1,v1) at c, (u0,v1) at d. */
  add(a: V3, b: V3, c: V3, d: V3, n: V3, u0: number, v0: number, u1: number, v1: number): void {
    this.add4(a, b, c, d, n, [u0, v0, u1, v0, u1, v1, u0, v1]);
  }
  /** The same with the uv of each corner given (a, b, c, d). */
  add4(a: V3, b: V3, c: V3, d: V3, n: V3, uv: number[]): void {
    const i = this.pos.length / 3;
    this.pos.push(...a, ...b, ...c, ...d);
    for (let k = 0; k < 4; k++) this.nor.push(...n);
    this.uv.push(...uv);
    this.idx.push(i, i + 1, i + 2, i, i + 2, i + 3);
  }
  /** Another set's quads, their uv (over a w × h picture of their own) carried through `uv` (into an atlas). */
  append(src: Quads, uv: UvFn, w: number, h: number): void {
    const i0 = this.pos.length / 3;
    this.pos.push(...src.pos);
    this.nor.push(...src.nor);
    for (let k = 0; k < src.uv.length; k += 2) this.uv.push(...uv(src.uv[k] * w, (1 - src.uv[k + 1]) * h));
    for (const i of src.idx) this.idx.push(i + i0);
  }
  get empty(): boolean {
    return this.idx.length === 0;
  }
  get count(): number {
    return this.idx.length / 6;
  }
  /** `atlasH`: the uv came from an Atlas (v = minus the atlas row): turned into uv here. */
  geometry(atlasH = 0): THREE.BufferGeometry {
    if (atlasH > 0) for (let i = 1; i < this.uv.length; i += 2) this.uv[i] = 1 + this.uv[i] / atlasH;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.setIndex(this.idx);
    g.computeBoundingSphere();
    return g;
  }
}

/** Picture px → texture uv. (c, r) are pixel corners: column c, row r from the top. */
export type UvFn = (c: number, r: number) => [number, number];

/** The uv of a picture of its own (w × h). */
export function ownUv(w: number, h: number): UvFn {
  return (c, r) => [c / w, 1 - r / h];
}

/**
 * An atlas of pictures (shelves 2048 wide): add() places a rect of a picture
 * and hands back its UvFn; texture() draws them all once everything is in.
 */
export class Atlas {
  private readonly items: { src: HTMLCanvasElement; sx: number; sy: number; w: number; h: number; x: number; y: number }[] = [];
  private readonly seen = new Map<HTMLCanvasElement, Map<string, [number, number]>>();
  private x = 0;
  private y = 0;
  private row = 0;
  readonly W = 2048;
  private canvasEl: HTMLCanvasElement | null = null;
  private tex: THREE.CanvasTexture | null = null;
  private readonly swatches = new Map<string, UvFn>();

  /**
   * Place (sx, sy, w, h) of `src` (the whole picture by default; the same
   * rect of the same picture is placed once). Its UvFn gives v as minus the
   * atlas row: Quads.geometry(atlas.height) turns that into uv.
   */
  add(src: HTMLCanvasElement, sx = 0, sy = 0, w = src.width, h = src.height): UvFn {
    const key = `${sx},${sy},${w},${h}`;
    let m = this.seen.get(src);
    if (!m) this.seen.set(src, (m = new Map()));
    let at = m.get(key);
    if (!at) {
      // a 1px gutter round each rect (edge pixels repeated) so nearest sampling never bleeds
      const gw = w + 2;
      const gh = h + 2;
      if (this.x + gw > this.W) {
        this.x = 0;
        this.y += this.row;
        this.row = 0;
      }
      at = [this.x + 1, this.y + 1];
      this.items.push({ src, sx, sy, w, h, x: at[0], y: at[1] });
      this.x += gw;
      this.row = Math.max(this.row, gh);
      m.set(key, at);
    }
    const [ax, ay] = at;
    return (c, r) => [(ax + c - sx) / this.W, -(ay + r - sy)];
  }

  /** A small block of one colour (side walls, rails): its UvFn always hits its middle. */
  swatch(colour: string): UvFn {
    const hit = this.swatches.get(colour);
    if (hit) return hit;
    const [c, ctx] = canvas(4, 4);
    ctx.fillStyle = colour;
    ctx.fillRect(0, 0, 4, 4);
    const inner = this.add(c);
    const fn: UvFn = () => inner(2, 2);
    this.swatches.set(colour, fn);
    return fn;
  }

  /** The atlas's height in px (what Quads.geometry() needs). */
  get height(): number {
    return Math.max(4, this.y + this.row);
  }

  /** Draw the atlas (call once, after every add()). */
  texture(): THREE.CanvasTexture {
    if (this.tex) return this.tex;
    const [c, ctx] = canvas(this.W, this.height);
    for (const it of this.items) {
      // the rect and its 1px gutter (edges repeated)
      ctx.drawImage(it.src, it.sx, it.sy, it.w, it.h, it.x, it.y, it.w, it.h);
      ctx.drawImage(it.src, it.sx, it.sy, it.w, 1, it.x, it.y - 1, it.w, 1);
      ctx.drawImage(it.src, it.sx, it.sy + it.h - 1, it.w, 1, it.x, it.y + it.h, it.w, 1);
      ctx.drawImage(it.src, it.sx, it.sy, 1, it.h, it.x - 1, it.y, 1, it.h);
      ctx.drawImage(it.src, it.sx + it.w - 1, it.sy, 1, it.h, it.x + it.w, it.y, 1, it.h);
    }
    this.canvasEl = c;
    this.tex = pixelTexture(c);
    return this.tex;
  }

  get canvas(): HTMLCanvasElement | null {
    return this.canvasEl;
  }

  dispose(): void {
    this.tex?.dispose();
  }
}

// ---------------------------------------------------------------- alpha masks

/** Which pixels of a picture are painted (alpha ≥ 128). */
export class Mask {
  readonly w: number;
  readonly h: number;
  private readonly a: Uint8Array;
  constructor(c: HTMLCanvasElement) {
    this.w = c.width;
    this.h = c.height;
    this.a = new Uint8Array(this.w * this.h);
    if (!this.w || !this.h) return;
    const d = c.getContext('2d', { willReadFrequently: true })!.getImageData(0, 0, this.w, this.h).data;
    for (let i = 0; i < this.a.length; i++) this.a[i] = d[i * 4 + 3] >= 128 ? 1 : 0;
  }
  at(c: number, r: number): boolean {
    return c >= 0 && r >= 0 && c < this.w && r < this.h && this.a[r * this.w + c] === 1;
  }
  clear(c: number, r: number): void {
    if (c >= 0 && r >= 0 && c < this.w && r < this.h) this.a[r * this.w + c] = 0;
  }
  /** Painted pixels in the rect. */
  count(c0: number, r0: number, c1: number, r1: number): number {
    let n = 0;
    for (let r = Math.max(0, r0); r < Math.min(this.h, r1); r++) for (let c = Math.max(0, c0); c < Math.min(this.w, c1); c++) n += this.a[r * this.w + c];
    return n;
  }
}

// ---------------------------------------------------------------- extrusion

/** Where a picture rect stands: column c0's left edge at x0, row r0's top at yTop, `sy` units per px upward, the front at zf. */
export interface Stand {
  x0: number;
  yTop: number;
  sy: number;
  zf: number;
}

/**
 * The voxel look: rect (c0, r0)–(c1, r1) of a picture, its painted pixels
 * pushed back `depth` units from the front at stand.zf. `front: false`
 * leaves the front quad out (it is drawn elsewhere). Returns the number of
 * quads added.
 */
export function extrude(q: Quads, m: Mask, c0: number, r0: number, c1: number, r1: number, st: Stand, depth: number, uv: UvFn, front = true): number {
  const n0 = q.count;
  const { x0, yTop, sy, zf } = st;
  const zb = zf - depth;
  const X = (c: number) => x0 + (c - c0) * PX;
  const Y = (r: number) => yTop - (r - r0) * sy;
  const on = (c: number, r: number) => c >= c0 && c < c1 && r >= r0 && r < r1 && m.at(c, r);
  if (front) {
    const a = uv(c0, r1);
    const b = uv(c1, r0);
    q.add([X(c0), Y(r1), zf], [X(c1), Y(r1), zf], [X(c1), Y(r0), zf], [X(c0), Y(r0), zf], [0, 0, 1], a[0], a[1], b[0], b[1]);
  }
  if (depth <= 0) return q.count - n0;
  // left and right faces: per column edge, merged down the rows (same sample column)
  for (const side of [-1, 1] as const) {
    for (let c = c0; c < c1; c++) {
      let start = -1;
      let sc = -1;
      const flush = (end: number) => {
        if (start < 0) return;
        const x = side < 0 ? X(c) : X(c + 1);
        const u = uv(sc + 0.5, 0)[0];
        const vb = uv(0, end)[1];
        const vt = uv(0, start)[1];
        if (side < 0) q.add([x, Y(end), zb], [x, Y(end), zf], [x, Y(start), zf], [x, Y(start), zb], [-1, 0, 0], u, vb, u, vt);
        else q.add([x, Y(end), zf], [x, Y(end), zb], [x, Y(start), zb], [x, Y(start), zf], [1, 0, 0], u, vb, u, vt);
        start = -1;
      };
      for (let r = r0; r <= r1; r++) {
        const edge = r < r1 && on(c, r) && !on(c + side, r);
        // sample one pixel in from the outline when it is painted
        const s = edge ? (on(c - side, r) ? c - side : c) : -1;
        if (edge && start >= 0 && s === sc) continue;
        flush(r);
        if (edge) {
          start = r;
          sc = s;
        }
      }
    }
  }
  // top faces: per row edge, merged along the columns (same sample row)
  for (let r = r0; r < r1; r++) {
    let start = -1;
    let sr = -1;
    const flush = (end: number) => {
      if (start < 0) return;
      const y = Y(r);
      const v = uv(0, sr + 0.5)[1];
      const ul = uv(start, 0)[0];
      const ur = uv(end, 0)[0];
      q.add([X(start), y, zf], [X(end), y, zf], [X(end), y, zb], [X(start), y, zb], [0, 1, 0], ul, v, ur, v);
      start = -1;
    };
    for (let c = c0; c <= c1; c++) {
      const edge = c < c1 && on(c, r) && !on(c, r - 1);
      const s = edge ? (on(c, r + 1) ? r + 1 : r) : -1;
      if (edge && start >= 0 && s === sr) continue;
      flush(c);
      if (edge) {
        start = c;
        sr = s;
      }
    }
  }
  return q.count - n0;
}

// ---------------------------------------------------------------- columns

/**
 * An 8-sided column round (cx, cz), its faces r from the axis (as wide as
 * the picture's columns c0..c1), from yb to yt, wrapped in those columns and
 * rows r0..r1 (seen from the front the column shows them as the picture
 * did), with a lid.
 */
export function prism(q: Quads, cx: number, cz: number, r: number, yb: number, yt: number, uv: UvFn, c0: number, r0: number, c1: number, r1: number, lid = true): void {
  const N = 8;
  const ang = (k: number) => Math.PI / N + (k * 2 * Math.PI) / N;
  // x of a corner → a picture column (front and back the same way)
  const col = (x: number) => c0 + Math.max(0, Math.min(1, (x - (cx - r)) / (2 * r))) * (c1 - c0);
  const vb = uv(0, r1)[1];
  const vt = uv(0, r0)[1];
  const pts: [number, number][] = [];
  const R = r / Math.cos(Math.PI / N);
  for (let k = 0; k < N; k++) pts.push([cx + Math.sin(ang(k)) * R, cz + Math.cos(ang(k)) * R]);
  for (let k = 0; k < N; k++) {
    const [xa, za] = pts[k];
    const [xb, zb] = pts[(k + 1) % N];
    const mid = (ang(k) + ang(k + 1)) / 2;
    const n: V3 = [Math.sin(mid), 0, Math.cos(mid)];
    const ua = uv(col(xa), 0)[0];
    const ub = uv(col(xb), 0)[0];
    q.add4([xa, yb, za], [xb, yb, zb], [xb, yt, zb], [xa, yt, za], n, [ua, vb, ub, vb, ub, vt, ua, vt]);
  }
  if (!lid) return;
  // the lid: the top row of the picture's columns
  const v = uv(0, r0 + 0.5)[1];
  const u = (x: number) => uv(col(x), 0)[0];
  const P = (k: number): V3 => [pts[k][0], yt, pts[k][1]];
  const quad = (a: number, b: number, c: number, d: number) =>
    q.add4(P(a), P(b), P(c), P(d), [0, 1, 0], [u(pts[a][0]), v, u(pts[b][0]), v, u(pts[c][0]), v, u(pts[d][0]), v]);
  // (corners k go counter-clockwise seen from above)
  quad(0, 1, 2, 3);
  quad(0, 3, 4, 7);
  quad(4, 5, 6, 7);
}

// ---------------------------------------------------------------- boxes

/** A uv rect: picture columns c0..c1, rows r0..r1 (rows from the top) through `uv`. */
export interface Face {
  uv: UvFn;
  c0: number;
  r0: number;
  c1: number;
  r1: number;
}

/** A face that is one colour: the middle of a swatch, or of one pixel. */
export function solidFace(uv: UvFn, c = 0, r = 0): Face {
  return { uv, c0: c + 0.5, r0: r + 0.5, c1: c + 0.5, r1: r + 0.5 };
}

/**
 * A box x0..x1 × y0..y1 × z0..z1 (z0 north, z1 south). Each face given is
 * drawn: front (+Z) and the sides with the picture's rows upright; the top
 * with its first row at the back (north) edge; the sides with the rect's
 * columns along z (a wall's face texture on the side of a north–south run;
 * a rect one column wide paints the side in that column's colours).
 */
export function box(
  q: Quads,
  x0: number,
  x1: number,
  y0: number,
  y1: number,
  z0: number,
  z1: number,
  f: { front?: Face; top?: Face; left?: Face; right?: Face; back?: Face },
): void {
  const uvr = (fc: Face): [number, number, number, number] => {
    const a = fc.uv(fc.c0, fc.r1);
    const b = fc.uv(fc.c1, fc.r0);
    return [a[0], a[1], b[0], b[1]];
  };
  if (f.front) {
    const [u0, v0, u1, v1] = uvr(f.front);
    q.add([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [0, 0, 1], u0, v0, u1, v1);
  }
  if (f.back) {
    const [u0, v0, u1, v1] = uvr(f.back);
    q.add([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [0, 0, -1], u0, v0, u1, v1);
  }
  if (f.top) {
    // rows: r0 at the back (z0), r1 at the front (z1)
    const [u0, v0, u1, v1] = uvr(f.top);
    q.add([x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], [0, 1, 0], u0, v0, u1, v1);
  }
  for (const [fc, x, n] of [
    [f.left, x0, -1],
    [f.right, x1, 1],
  ] as const) {
    if (!fc) continue;
    const [u0, v0, u1, v1] = uvr(fc);
    // corners: bottom-back, bottom-front, top-front, top-back (left); mirrored (right)
    // (the rect's columns run along z: back → front on the left side, front → back on the right)
    const zA = n < 0 ? z0 : z1;
    const zB = n < 0 ? z1 : z0;
    q.add([x, y0, zA], [x, y0, zB], [x, y1, zB], [x, y1, zA], [n, 0, 0], u0, v0, u1, v1);
  }
}
