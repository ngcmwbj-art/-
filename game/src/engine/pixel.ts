// PixelCanvas: a tiny software raster for authoring pixel art in code.
// All art in this game is produced with it (no image files). Work in
// integer pixel coordinates; call toCanvas() once and cache the result.

export type Color = string; // '#rgb' | '#rrggbb' | '#rrggbbaa' | 'transparent'

const colorCache = new Map<string, number>();

/** Convert a CSS hex color into a little-endian ABGR uint32 (ImageData layout). */
export function rgba32(c: Color): number {
  let v = colorCache.get(c);
  if (v !== undefined) return v;
  if (c === 'transparent' || c === '') v = 0;
  else {
    let h = c.startsWith('#') ? c.slice(1) : c;
    if (h.length === 3 || h.length === 4) h = h.split('').map((ch) => ch + ch).join('');
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    const a = h.length >= 8 ? parseInt(h.slice(6, 8), 16) : 255;
    v = ((a << 24) | (b << 16) | (g << 8) | r) >>> 0;
  }
  colorCache.set(c, v);
  return v;
}

export function hex(r: number, g: number, b: number): Color {
  const c = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}

export function toRgb(c: Color): [number, number, number] {
  const v = rgba32(c);
  return [v & 255, (v >>> 8) & 255, (v >>> 16) & 255];
}

/** Linear blend between two hex colors (t=0 → a, t=1 → b). */
export function mix(a: Color, b: Color, t: number): Color {
  const [r1, g1, b1] = toRgb(a);
  const [r2, g2, b2] = toRgb(b);
  return hex(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t);
}

/** 4x4 Bayer matrix, values 0..15. Use for ordered dithering. */
export const BAYER4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

export class PixelCanvas {
  readonly w: number;
  readonly h: number;
  readonly data: Uint32Array;
  private canvas: HTMLCanvasElement | null = null;
  private dirty = true;

  constructor(w: number, h: number) {
    this.w = w;
    this.h = h;
    this.data = new Uint32Array(w * h);
  }

  static fromArt(rows: string[], palette: Record<string, Color>): PixelCanvas {
    const w = Math.max(...rows.map((r) => r.length));
    const p = new PixelCanvas(w, rows.length);
    p.art(rows, palette, 0, 0);
    return p;
  }

  inside(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.w && y < this.h;
  }

  set(x: number, y: number, c: Color | number): void {
    x |= 0;
    y |= 0;
    if (!this.inside(x, y)) return;
    const v = typeof c === 'number' ? c : rgba32(c);
    this.data[y * this.w + x] = v;
    this.dirty = true;
  }

  /** Set only if the target pixel is currently transparent. */
  under(x: number, y: number, c: Color): void {
    if (this.inside(x, y) && this.alpha(x, y) === 0) this.set(x, y, c);
  }

  get(x: number, y: number): number {
    if (!this.inside(x, y)) return 0;
    return this.data[(y | 0) * this.w + (x | 0)];
  }

  alpha(x: number, y: number): number {
    return this.get(x, y) >>> 24;
  }

  fill(c: Color): void {
    this.data.fill(rgba32(c));
    this.dirty = true;
  }

  clear(): void {
    this.data.fill(0);
    this.dirty = true;
  }

  rect(x: number, y: number, w: number, h: number, c: Color): void {
    const v = rgba32(c);
    for (let j = Math.max(0, y); j < Math.min(this.h, y + h); j++)
      for (let i = Math.max(0, x); i < Math.min(this.w, x + w); i++) this.data[j * this.w + i] = v;
    this.dirty = true;
  }

  strokeRect(x: number, y: number, w: number, h: number, c: Color): void {
    this.hline(x, x + w - 1, y, c);
    this.hline(x, x + w - 1, y + h - 1, c);
    this.vline(x, y, y + h - 1, c);
    this.vline(x + w - 1, y, y + h - 1, c);
  }

  hline(x0: number, x1: number, y: number, c: Color): void {
    if (x1 < x0) [x0, x1] = [x1, x0];
    for (let x = x0; x <= x1; x++) this.set(x, y, c);
  }

  vline(x: number, y0: number, y1: number, c: Color): void {
    if (y1 < y0) [y0, y1] = [y1, y0];
    for (let y = y0; y <= y1; y++) this.set(x, y, c);
  }

  line(x0: number, y0: number, x1: number, y1: number, c: Color): void {
    x0 |= 0; y0 |= 0; x1 |= 0; y1 |= 0;
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.set(x0, y0, c);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }

  /** Filled ellipse centered on (cx,cy) with radii rx, ry (pixel-center sampling). */
  ellipse(cx: number, cy: number, rx: number, ry: number, c: Color): void {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x + 0.5 - cx) / rx;
        const dy = (y + 0.5 - cy) / ry;
        if (dx * dx + dy * dy <= 1) this.set(x, y, c);
      }
  }

  circle(cx: number, cy: number, r: number, c: Color): void {
    this.ellipse(cx, cy, r, r, c);
  }

  /** 1px ring (ellipse outline). */
  ring(cx: number, cy: number, rx: number, ry: number, c: Color): void {
    for (let y = Math.floor(cy - ry - 1); y <= Math.ceil(cy + ry + 1); y++)
      for (let x = Math.floor(cx - rx - 1); x <= Math.ceil(cx + rx + 1); x++) {
        const inside = (px: number, py: number) => {
          const dx = (px + 0.5 - cx) / rx;
          const dy = (py + 0.5 - cy) / ry;
          return dx * dx + dy * dy <= 1;
        };
        if (inside(x, y) && (!inside(x + 1, y) || !inside(x - 1, y) || !inside(x, y + 1) || !inside(x, y - 1)))
          this.set(x, y, c);
      }
  }

  /** Filled polygon (even-odd, pixel-center sampling). */
  poly(pts: [number, number][], c: Color): void {
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
        for (let x = Math.ceil(xs[k] - 0.5); x <= Math.floor(xs[k + 1] - 0.5); x++) this.set(x, y, c);
    }
  }

  /**
   * Stamp character-art rows. Each char maps through `palette`; '.' and ' '
   * are transparent unless present in the palette.
   */
  art(rows: string[], palette: Record<string, Color>, ox = 0, oy = 0, flipX = false): void {
    for (let y = 0; y < rows.length; y++) {
      const row = rows[y];
      for (let x = 0; x < row.length; x++) {
        const ch = row[x];
        const col = palette[ch];
        if (col === undefined) continue;
        const px = flipX ? ox + row.length - 1 - x : ox + x;
        if (col === 'transparent') continue;
        this.set(px, oy + y, col);
      }
    }
  }

  /** Ordered-dither fill: covers `density` (0..1) of the rect with color c. */
  dither(x: number, y: number, w: number, h: number, c: Color, density: number): void {
    const t = density * 16;
    for (let j = y; j < y + h; j++)
      for (let i = x; i < x + w; i++) if (BAYER4[j & 3][i & 3] < t) this.set(i, j, c);
  }

  /** Replace every pixel of one color with another. */
  replace(from: Color, to: Color): void {
    const a = rgba32(from);
    const b = rgba32(to);
    for (let i = 0; i < this.data.length; i++) if (this.data[i] === a) this.data[i] = b;
    this.dirty = true;
  }

  /** Map colors through a palette-swap table. */
  swap(table: Record<Color, Color>): PixelCanvas {
    const out = this.clone();
    const m = new Map<number, number>();
    for (const k of Object.keys(table)) m.set(rgba32(k), rgba32(table[k]));
    for (let i = 0; i < out.data.length; i++) {
      const v = m.get(out.data[i]);
      if (v !== undefined) out.data[i] = v;
    }
    return out;
  }

  /**
   * Draw a 1px outline around all opaque pixels (outside only).
   * `diagonal` also fills corner neighbours for a heavier outline.
   */
  outline(c: Color, diagonal = false): void {
    const v = rgba32(c);
    const src = this.data.slice();
    const W = this.w;
    const H = this.h;
    const op = (x: number, y: number) => x >= 0 && y >= 0 && x < W && y < H && src[y * W + x] >>> 24 !== 0;
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        if (op(x, y)) continue;
        let n = op(x - 1, y) || op(x + 1, y) || op(x, y - 1) || op(x, y + 1);
        if (!n && diagonal) n = op(x - 1, y - 1) || op(x + 1, y - 1) || op(x - 1, y + 1) || op(x + 1, y + 1);
        if (n) this.data[y * W + x] = v;
      }
    this.dirty = true;
  }

  /**
   * Recolor the existing 1px edge of the shape (inside) with a light or dark
   * tone depending on side — handy for rim lighting. `fn` receives which
   * sides are open and returns a color or null.
   */
  edge(fn: (x: number, y: number, open: { l: boolean; r: boolean; t: boolean; b: boolean }) => Color | null): void {
    const src = this.data.slice();
    const W = this.w;
    const H = this.h;
    const op = (x: number, y: number) => x >= 0 && y >= 0 && x < W && y < H && src[y * W + x] >>> 24 !== 0;
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        if (!op(x, y)) continue;
        const open = { l: !op(x - 1, y), r: !op(x + 1, y), t: !op(x, y - 1), b: !op(x, y + 1) };
        if (!(open.l || open.r || open.t || open.b)) continue;
        const c = fn(x, y, open);
        if (c) this.data[y * W + x] = rgba32(c);
      }
    this.dirty = true;
  }

  /** Copy another PixelCanvas onto this one (alpha-tested, not blended). */
  blit(src: PixelCanvas, dx: number, dy: number, flipX = false): void {
    for (let y = 0; y < src.h; y++)
      for (let x = 0; x < src.w; x++) {
        const v = src.data[y * src.w + x];
        if (v >>> 24 === 0) continue;
        const tx = flipX ? dx + src.w - 1 - x : dx + x;
        if (this.inside(tx, dy + y)) this.data[(dy + y) * this.w + tx] = v;
      }
    this.dirty = true;
  }

  clone(): PixelCanvas {
    const p = new PixelCanvas(this.w, this.h);
    p.data.set(this.data);
    return p;
  }

  flipped(): PixelCanvas {
    const p = new PixelCanvas(this.w, this.h);
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) p.data[y * this.w + (this.w - 1 - x)] = this.data[y * this.w + x];
    return p;
  }

  /** Returns a cached HTMLCanvasElement with the current pixels. */
  toCanvas(): HTMLCanvasElement {
    if (!this.canvas) {
      this.canvas = document.createElement('canvas');
      this.canvas.width = this.w;
      this.canvas.height = this.h;
    }
    if (this.dirty) {
      const ctx = this.canvas.getContext('2d')!;
      const img = ctx.createImageData(this.w, this.h);
      new Uint32Array(img.data.buffer).set(this.data);
      ctx.putImageData(img, 0, 0);
      this.dirty = false;
    }
    return this.canvas;
  }
}

/** Create an offscreen canvas of the given size with smoothing disabled. */
export function makeCanvas(w: number, h: number, opts: { willReadFrequently?: boolean } = {}): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d', opts.willReadFrequently ? { willReadFrequently: true } : undefined)!;
  ctx.imageSmoothingEnabled = false;
  return [c, ctx];
}
