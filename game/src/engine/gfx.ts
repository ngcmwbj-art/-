// Immediate-mode drawing helpers for the 384x216 back buffer. All positions
// are rounded to whole pixels; prefer these over raw ctx calls so nothing
// ever lands on a half pixel.

import { drawText, measure, type TextOpts } from './font';
import { makeCanvas } from './pixel';

type Img = HTMLCanvasElement | HTMLImageElement | ImageBitmap | OffscreenCanvas;

export interface ImgOpts {
  sx?: number;
  sy?: number;
  sw?: number;
  sh?: number;
  flipX?: boolean;
  flipY?: boolean;
  alpha?: number;
  /** Integer scale factor. */
  scale?: number;
  /** Draw a solid silhouette of this color instead of the image (hit flash). */
  tint?: string;
  /** 0..1 amount to blend `tint` over the image (1 = solid). */
  tintAmount?: number;
  composite?: GlobalCompositeOperation;
}

const silCache = new WeakMap<object, Map<string, HTMLCanvasElement>>();

/** Cached solid-color silhouette of an image (for flashes / shadows). */
export function silhouette(src: Img, color: string): HTMLCanvasElement {
  let m = silCache.get(src);
  if (!m) {
    m = new Map();
    silCache.set(src, m);
  }
  let c = m.get(color);
  if (!c) {
    const [cv, ctx] = makeCanvas(src.width as number, src.height as number);
    ctx.drawImage(src as CanvasImageSource, 0, 0);
    ctx.globalCompositeOperation = 'source-in';
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, cv.width, cv.height);
    c = cv;
    m.set(color, c);
  }
  return c;
}

export class Gfx {
  readonly ctx: CanvasRenderingContext2D;
  readonly w: number;
  readonly h: number;

  constructor(ctx: CanvasRenderingContext2D, w: number, h: number) {
    this.ctx = ctx;
    this.w = w;
    this.h = h;
  }

  clear(color: string): void {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(0, 0, this.w, this.h);
  }

  rect(x: number, y: number, w: number, h: number, color: string, alpha = 1): void {
    const c = this.ctx;
    const prev = c.globalAlpha;
    if (alpha !== 1) c.globalAlpha = prev * alpha;
    c.fillStyle = color;
    c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
    if (alpha !== 1) c.globalAlpha = prev;
  }

  /** 1px rectangle outline. */
  frame(x: number, y: number, w: number, h: number, color: string): void {
    x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
    const c = this.ctx;
    c.fillStyle = color;
    c.fillRect(x, y, w, 1);
    c.fillRect(x, y + h - 1, w, 1);
    c.fillRect(x, y, 1, h);
    c.fillRect(x + w - 1, y, 1, h);
  }

  px(x: number, y: number, color: string): void {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
  }

  /** Pixel-perfect Bresenham line. */
  line(x0: number, y0: number, x1: number, y1: number, color: string): void {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const c = this.ctx;
    c.fillStyle = color;
    if (y0 === y1) {
      c.fillRect(Math.min(x0, x1), y0, Math.abs(x1 - x0) + 1, 1);
      return;
    }
    if (x0 === x1) {
      c.fillRect(x0, Math.min(y0, y1), 1, Math.abs(y1 - y0) + 1);
      return;
    }
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (let n = 0; n < 4096; n++) {
      c.fillRect(x0, y0, 1, 1);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }

  /** Filled pixel circle. */
  circle(cx: number, cy: number, r: number, color: string): void {
    const c = this.ctx;
    c.fillStyle = color;
    cx = Math.round(cx); cy = Math.round(cy);
    const rr = r * r;
    for (let y = -Math.ceil(r); y <= Math.ceil(r); y++) {
      const half = Math.floor(Math.sqrt(Math.max(0, rr - y * y)));
      if (rr - y * y < 0) continue;
      c.fillRect(cx - half, cy + y, half * 2 + 1, 1);
    }
  }

  /** 1px pixel ring. */
  ring(cx: number, cy: number, r: number, color: string): void {
    const c = this.ctx;
    c.fillStyle = color;
    cx = Math.round(cx); cy = Math.round(cy); r = Math.round(r);
    let x = r, y = 0, err = 1 - r;
    while (x >= y) {
      const pts = [[x, y], [y, x], [-y, x], [-x, y], [-x, -y], [-y, -x], [y, -x], [x, -y]];
      for (const [px, py] of pts) c.fillRect(cx + px, cy + py, 1, 1);
      y++;
      if (err < 0) err += 2 * y + 1;
      else { x--; err += 2 * (y - x) + 1; }
    }
  }

  img(src: Img, x: number, y: number, o: ImgOpts = {}): void {
    const c = this.ctx;
    const sx = o.sx ?? 0;
    const sy = o.sy ?? 0;
    const sw = o.sw ?? (src.width as number);
    const sh = o.sh ?? (src.height as number);
    const s = o.scale ?? 1;
    x = Math.round(x);
    y = Math.round(y);
    const needSave = o.flipX || o.flipY || o.alpha !== undefined || o.composite;
    if (needSave) {
      c.save();
      if (o.alpha !== undefined) c.globalAlpha *= o.alpha;
      if (o.composite) c.globalCompositeOperation = o.composite;
      if (o.flipX || o.flipY) {
        c.translate(o.flipX ? x + sw * s : x, o.flipY ? y + sh * s : y);
        c.scale(o.flipX ? -1 : 1, o.flipY ? -1 : 1);
        x = 0;
        y = 0;
      }
    }
    if (o.tint && (o.tintAmount ?? 1) >= 1) {
      c.drawImage(silhouette(src, o.tint), sx, sy, sw, sh, x, y, sw * s, sh * s);
    } else {
      c.drawImage(src as CanvasImageSource, sx, sy, sw, sh, x, y, sw * s, sh * s);
      if (o.tint && (o.tintAmount ?? 0) > 0) {
        const a = c.globalAlpha;
        c.globalAlpha = a * (o.tintAmount ?? 0);
        c.drawImage(silhouette(src, o.tint), sx, sy, sw, sh, x, y, sw * s, sh * s);
        c.globalAlpha = a;
      }
    }
    if (needSave) c.restore();
  }

  text(str: string, x: number, y: number, o?: TextOpts): number {
    return drawText(this.ctx, str, x, y, o);
  }

  measure(str: string): number {
    return measure(str);
  }

  /** Run `fn` with a translated origin (camera). */
  translated(dx: number, dy: number, fn: () => void): void {
    this.ctx.save();
    this.ctx.translate(Math.round(dx), Math.round(dy));
    fn();
    this.ctx.restore();
  }

  clip(x: number, y: number, w: number, h: number, fn: () => void): void {
    const c = this.ctx;
    c.save();
    c.beginPath();
    c.rect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
    c.clip();
    fn();
    c.restore();
  }

  alpha(a: number, fn: () => void): void {
    const c = this.ctx;
    const prev = c.globalAlpha;
    c.globalAlpha = prev * a;
    fn();
    c.globalAlpha = prev;
  }

  composite(op: GlobalCompositeOperation, fn: () => void): void {
    const c = this.ctx;
    const prev = c.globalCompositeOperation;
    c.globalCompositeOperation = op;
    fn();
    c.globalCompositeOperation = prev;
  }
}
