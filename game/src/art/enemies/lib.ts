// Pixel-art sculpting helpers for the enemy battle sprites.
//
// Workflow per sprite: build boolean shape masks (Mask), paint each part with
// a shading ramp (light from the upper-left = the western sunset, 3.6), draw
// details, then finish with a coloured outline + left rim light.

import { BAYER4, PixelCanvas, hex, toRgb } from '../../engine/pixel';

export type Ramp = string[]; // dark → light

/** Global light direction (upper-left, slightly toward camera). */
const LX = -0.62;
const LY = -0.58;
const LZ = 0.53;

export class Mask {
  readonly d: Uint8Array;
  constructor(
    readonly w: number,
    readonly h: number,
  ) {
    this.d = new Uint8Array(w * h);
  }
  static of(w: number, h: number, fn: (m: Mask) => void): Mask {
    const m = new Mask(w, h);
    fn(m);
    return m;
  }
  in(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.w && y < this.h && this.d[y * this.w + x] !== 0;
  }
  set(x: number, y: number, v = 1): this {
    x = Math.round(x);
    y = Math.round(y);
    if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.d[y * this.w + x] = v;
    return this;
  }
  rect(x: number, y: number, w: number, h: number, v = 1): this {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.set(i, j, v);
    return this;
  }
  ellipse(cx: number, cy: number, rx: number, ry: number, v = 1): this {
    for (let y = Math.floor(cy - ry - 1); y <= Math.ceil(cy + ry + 1); y++)
      for (let x = Math.floor(cx - rx - 1); x <= Math.ceil(cx + rx + 1); x++) {
        const dx = (x + 0.5 - cx) / rx;
        const dy = (y + 0.5 - cy) / ry;
        if (dx * dx + dy * dy <= 1) this.set(x, y, v);
      }
    return this;
  }
  poly(pts: [number, number][], v = 1): this {
    const ys = pts.map((p) => p[1]);
    const y0 = Math.floor(Math.min(...ys));
    const y1 = Math.ceil(Math.max(...ys));
    for (let y = y0; y <= y1; y++) {
      const sy = y + 0.5;
      const xs: number[] = [];
      for (let i = 0; i < pts.length; i++) {
        const [ax, ay] = pts[i];
        const [bx, by] = pts[(i + 1) % pts.length];
        if ((ay <= sy && by > sy) || (by <= sy && ay > sy)) xs.push(ax + ((sy - ay) / (by - ay)) * (bx - ax));
      }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2)
        for (let x = Math.ceil(xs[k] - 0.5); x <= Math.floor(xs[k + 1] - 0.5); x++) this.set(x, y, v);
    }
    return this;
  }
  /** Thick line (round brush of radius r). */
  line(x0: number, y0: number, x1: number, y1: number, r = 0.5, v = 1): this {
    const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2));
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const x = x0 + (x1 - x0) * t;
      const y = y0 + (y1 - y0) * t;
      if (r <= 0.5) this.set(Math.floor(x), Math.floor(y), v);
      else this.ellipse(x, y, r, r, v);
    }
    return this;
  }
  /** Quadratic bezier stroke. */
  curve(x0: number, y0: number, cx: number, cy: number, x1: number, y1: number, r = 0.5, v = 1): this {
    const n = Math.ceil((Math.hypot(cx - x0, cy - y0) + Math.hypot(x1 - cx, y1 - cy)) * 2) + 2;
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const x = (1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * cx + t * t * x1;
      const y = (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * cy + t * t * y1;
      if (r <= 0.5) this.set(Math.floor(x), Math.floor(y), v);
      else this.ellipse(x, y, r, r, v);
    }
    return this;
  }
  or(o: Mask): this {
    for (let i = 0; i < this.d.length; i++) if (o.d[i]) this.d[i] = 1;
    return this;
  }
  sub(o: Mask): this {
    for (let i = 0; i < this.d.length; i++) if (o.d[i]) this.d[i] = 0;
    return this;
  }
  and(o: Mask): this {
    for (let i = 0; i < this.d.length; i++) if (!o.d[i]) this.d[i] = 0;
    return this;
  }
  clone(): Mask {
    const m = new Mask(this.w, this.h);
    m.d.set(this.d);
    return m;
  }
  /** Mask of opaque pixels of a canvas. */
  static fromCanvas(p: PixelCanvas): Mask {
    const m = new Mask(p.w, p.h);
    for (let i = 0; i < p.data.length; i++) if (p.data[i] >>> 24) m.d[i] = 1;
    return m;
  }
  shifted(dx: number, dy: number): Mask {
    const m = new Mask(this.w, this.h);
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) if (this.d[y * this.w + x]) m.set(x + dx, y + dy);
    return m;
  }
  bbox(): { x: number; y: number; w: number; h: number } {
    let x0 = this.w, y0 = this.h, x1 = -1, y1 = -1;
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++)
        if (this.d[y * this.w + x]) {
          if (x < x0) x0 = x;
          if (y < y0) y0 = y;
          if (x > x1) x1 = x;
          if (y > y1) y1 = y;
        }
    return { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
  }
  each(fn: (x: number, y: number) => void): void {
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) if (this.d[y * this.w + x]) fn(x, y);
  }
}

/** Chamfer distance from each masked pixel to the outside (capped). */
function distMap(m: Mask, cap: number): Float32Array {
  const { w, h } = m;
  const INF = 1e6;
  const d = new Float32Array(w * h);
  for (let i = 0; i < d.length; i++) d[i] = m.d[i] ? INF : 0;
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : d[y * w + x]);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (!d[i]) continue;
      d[i] = Math.min(d[i], at(x - 1, y) + 1, at(x, y - 1) + 1, at(x - 1, y - 1) + 1.414, at(x + 1, y - 1) + 1.414);
    }
  for (let y = h - 1; y >= 0; y--)
    for (let x = w - 1; x >= 0; x--) {
      const i = y * w + x;
      if (!d[i]) continue;
      d[i] = Math.min(d[i], at(x + 1, y) + 1, at(x, y + 1) + 1, at(x + 1, y + 1) + 1.414, at(x - 1, y + 1) + 1.414);
    }
  for (let i = 0; i < d.length; i++) if (d[i] > cap) d[i] = cap;
  return d;
}

export interface ShadeOpts {
  /** 'bevel' = height from edge distance, 'sphere'/'cyl' = analytic normals. */
  mode?: 'bevel' | 'sphere' | 'cyl' | 'flat';
  /** Bevel width in px (bevel mode). */
  bevel?: number;
  /** Base brightness 0..1 before lighting. */
  base?: number;
  /** Lighting strength. */
  k?: number;
  /** Extra left→right / top→bottom falloff. */
  grad?: number;
  /** Dither between ramp steps. */
  dither?: number;
  /** Ellipse for sphere/cyl modes. */
  cx?: number;
  cy?: number;
  rx?: number;
  ry?: number;
  /** Clip painting to this mask (shading still computed from `m`). */
  clip?: Mask;
  /**
   * Light direction (x, y, z; unit length). Default: the western sunset,
   * upper left. 第2章: NIGHT_LIGHT, the lantern low in front on the left.
   */
  light?: [number, number, number];
  /** Which way the extra falloff brightens (default up-left [−1, −1]; night: down-left [−1, 1]). */
  gradDir?: [number, number];
}

/** 第2章 (51 8.0): the tomato lantern, low and in front, on the left. */
export const NIGHT_LIGHT: [number, number, number] = [-0.62, 0.5, 0.6];

/** Paint mask `m` with a lit ramp. */
export function shade(p: PixelCanvas, m: Mask, ramp: Ramp, o: ShadeOpts = {}): void {
  const mode = o.mode ?? 'bevel';
  const n = ramp.length;
  const base = o.base ?? 0.55;
  const k = o.k ?? 0.55;
  const grad = o.grad ?? 0.18;
  const dith = o.dither ?? 0.4;
  const bb = m.bbox();
  const cx = o.cx ?? bb.x + bb.w / 2;
  const cy = o.cy ?? bb.y + bb.h / 2;
  const rx = o.rx ?? bb.w / 2;
  const ry = o.ry ?? bb.h / 2;
  const bev = o.bevel ?? Math.max(2, Math.min(6, Math.round(Math.min(bb.w, bb.h) / 4)));
  const dm = mode === 'bevel' ? distMap(m, bev) : null;
  const [lx, ly, lz] = o.light ?? [LX, LY, LZ];
  const hAt = (x: number, y: number) => (x < 0 || y < 0 || x >= m.w || y >= m.h ? 0 : dm![y * m.w + x] / bev);
  m.each((x, y) => {
    if (o.clip && !o.clip.in(x, y)) return;
    let nx = 0;
    let ny = 0;
    let nz = 1;
    if (mode === 'sphere') {
      nx = (x + 0.5 - cx) / rx;
      ny = (y + 0.5 - cy) / ry;
      const r2 = Math.min(1, nx * nx + ny * ny);
      nz = Math.sqrt(1 - r2);
    } else if (mode === 'cyl') {
      nx = Math.max(-1, Math.min(1, (x + 0.5 - cx) / rx));
      ny = 0;
      nz = Math.sqrt(1 - nx * nx);
    } else if (mode === 'bevel') {
      const gx = (hAt(x + 1, y) - hAt(x - 1, y)) / 2;
      const gy = (hAt(x, y + 1) - hAt(x, y - 1)) / 2;
      nx = -gx * 1.6;
      ny = -gy * 1.6;
      nz = 1;
      const l = Math.hypot(nx, ny, nz);
      nx /= l;
      ny /= l;
      nz /= l;
    }
    let lit = mode === 'flat' ? 0 : nx * lx + ny * ly + nz * lz - lz;
    if (mode === 'sphere' || mode === 'cyl') lit = nx * lx + ny * ly + nz * lz - 0.35;
    const [gdx, gdy] = o.gradDir ?? [-1, -1];
    const g = ((x + 0.5 - cx) / Math.max(1, bb.w)) * grad * gdx + ((y + 0.5 - cy) / Math.max(1, bb.h)) * grad * gdy;
    let v = base + lit * k + g;
    v = Math.max(0, Math.min(0.999, v));
    const t = (BAYER4[y & 3][x & 3] + 0.5) / 16 - 0.5;
    let idx = Math.floor(v * n + t * dith);
    idx = Math.max(0, Math.min(n - 1, idx));
    p.set(x, y, ramp[idx]);
  });
}

/** Fill a mask with one color. */
export function fill(p: PixelCanvas, m: Mask, c: string): void {
  m.each((x, y) => p.set(x, y, c));
}

/** Outer outline around all opaque pixels (8-neighbour optional). */
export function outline(p: PixelCanvas, c = '#2A2440', diagonal = false): void {
  p.outline(c, diagonal);
}

/** Left-side rim light: recolour the left-most opaque pixel of each run. */
export function rimLeft(p: PixelCanvas, c = '#F2894B', amount = 0.55, skip?: (x: number, y: number) => boolean): void {
  const src = p.data.slice();
  const W = p.w;
  for (let y = 0; y < p.h; y++)
    for (let x = 0; x < W; x++) {
      const v = src[y * W + x];
      if (!(v >>> 24)) continue;
      const left = x > 0 ? src[y * W + x - 1] : 0;
      if (left >>> 24) continue;
      if (skip?.(x, y)) continue;
      // don't recolour the outline itself: look one pixel in
      const inner = src[y * W + x + 1];
      if (!(inner >>> 24)) continue;
      p.set(x + 1, y, mixU32(inner, c, amount));
    }
}

/** Mix a packed pixel with a hex color. */
export function mixU32(v: number, c: string, t: number): string {
  const r = v & 255;
  const g = (v >>> 8) & 255;
  const b = (v >>> 16) & 255;
  const [r2, g2, b2] = toRgb(c);
  return hex(r + (r2 - r) * t, g + (g2 - g) * t, b + (b2 - b) * t);
}

/** Darken pixels of mask `m` that border (inside) other opaque pixels not in `m` → inner contour. */
export function innerContour(p: PixelCanvas, m: Mask, color: string, sides: 'all' | 'br' = 'all'): void {
  const W = p.w;
  const src = p.data.slice();
  m.each((x, y) => {
    const test = (dx: number, dy: number) => {
      const xx = x + dx;
      const yy = y + dy;
      if (xx < 0 || yy < 0 || xx >= W || yy >= p.h) return false;
      return !m.in(xx, yy) && src[yy * W + xx] >>> 24 !== 0;
    };
    const hit = sides === 'all' ? test(1, 0) || test(-1, 0) || test(0, 1) || test(0, -1) : test(1, 0) || test(0, 1);
    if (hit) p.set(x, y, color);
  });
}

/** Recolour mask pixels that border transparency on given sides. */
export function edgeLight(p: PixelCanvas, m: Mask, color: string, side: 'tl' | 'br' | 't' | 'l' | 'b' | 'r'): void {
  m.each((x, y) => {
    const out = (dx: number, dy: number) => !m.in(x + dx, y + dy);
    let hit = false;
    if (side === 'tl') hit = out(-1, 0) || out(0, -1);
    else if (side === 'br') hit = out(1, 0) || out(0, 1);
    else if (side === 't') hit = out(0, -1);
    else if (side === 'l') hit = out(-1, 0);
    else if (side === 'b') hit = out(0, 1);
    else hit = out(1, 0);
    if (hit) p.set(x, y, color);
  });
}

/** Ordered dither of color c over mask m with density 0..1 (optionally varying). */
export function ditherMask(p: PixelCanvas, m: Mask, c: string, density: number | ((x: number, y: number) => number)): void {
  m.each((x, y) => {
    const d = typeof density === 'number' ? density : density(x, y);
    if (BAYER4[y & 3][x & 3] < d * 16) p.set(x, y, c);
  });
}

/** Stamp character-art rows with palette at (ox, oy). */
export function art(p: PixelCanvas, rows: string[], pal: Record<string, string>, ox = 0, oy = 0, flipX = false): void {
  p.art(rows, pal, ox, oy, flipX);
}

/** Copy of a canvas with its colors desaturated by `amt` (0..1) — for ボケ負け. */
export function desaturate(src: HTMLCanvasElement, amt = 0.4, into?: HTMLCanvasElement): HTMLCanvasElement {
  const c = into ?? document.createElement('canvas');
  if (c.width !== src.width || c.height !== src.height) {
    c.width = src.width;
    c.height = src.height;
  }
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.clearRect(0, 0, c.width, c.height);
  ctx.drawImage(src, 0, 0);
  if (!c.width || !c.height) return c;
  const img = ctx.getImageData(0, 0, c.width, c.height);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    if (!d[i + 3]) continue;
    const l = d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11;
    d[i] = d[i] + (l - d[i]) * amt;
    d[i + 1] = d[i + 1] + (l - d[i + 1]) * amt;
    d[i + 2] = d[i + 2] + (l - d[i + 2]) * amt;
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

/** Build several frames with a builder function. */
export function frames(n: number, build: (i: number) => PixelCanvas): HTMLCanvasElement[] {
  const out: HTMLCanvasElement[] = [];
  for (let i = 0; i < n; i++) out.push(build(i).toCanvas());
  return out;
}

/** Rotate a point around (cx, cy). */
export function rot(x: number, y: number, cx: number, cy: number, a: number): [number, number] {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [cx + (x - cx) * c - (y - cy) * s, cy + (x - cx) * s + (y - cy) * c];
}

/** Common colors (3.6). */
export const K = {
  outline: '#2A2440',
  darkest: '#0B0B14',
  rim: '#F2894B',
  white: '#F4F1E8',
  pureWhite: '#FFFFFF',
  shu: '#E23B2E',
};
