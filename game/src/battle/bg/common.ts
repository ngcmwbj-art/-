// Battle background framework (20_systems_battle.md 17.1, 17.8).
//
// L0 (sunset band) and L1 (motif silhouettes) are painted into a 384×150
// offscreen, optionally saturated (kire ≥ 2), then drawn one scanline at a
// time with a sine offset dx(y,t) = A·sin(2π(y/λ + f·t)) + A2·sin(2π(y/λ2 − f2·t)).
// L2 (particles) is drawn undistorted on top, then the kire focus lines.

import type { Gfx } from '../../engine/gfx';
import { makeCanvas } from '../../engine/pixel';
import { BAYER4 } from '../../engine/pixel';

export const BG_H = 150;

export interface Wave {
  A: number;
  lambda: number;
  f: number;
  A2: number;
  lambda2: number;
  f2: number;
  interlace: boolean;
}

export abstract class Background {
  t = 0;
  kire = 0;
  /** Speed multiplier for motif animation (boss phase 2 = 2.5). */
  speed = 1;
  /** When true the motif animation stops (boss final). */
  frozen = false;
  /** Seconds of "night" palette left (boss phase 2 flash). */
  night = 0;
  /** Extra brightness multiplier (ojigi charge −20%). */
  dim = 0;
  wave: Wave = { A: 2, lambda: 64, f: 0.2, A2: 0, lambda2: 40, f2: 0.3, interlace: false };
  /** Distort only L1 (L0 drawn straight). */
  distortL1Only = false;
  /** Color under the windows (y ≥ 150). */
  bottom = '#2A2440';
  /** Motif clock (advances with speed, stops when frozen). */
  mt = 0;
  /**
   * State the battle hands the background (第2章: charge, stiff, light,
   * phase2, dark steps …): each background reads the keys it knows.
   */
  flags: Record<string, number> = {};
  private l0: HTMLCanvasElement;
  private l0ctx: CanvasRenderingContext2D;
  private l1: HTMLCanvasElement;
  private l1ctx: CanvasRenderingContext2D;
  private sat: HTMLCanvasElement;
  private satCtx: CanvasRenderingContext2D;
  private focusSeed = 0;
  private focusLines: { a: number; w: number; len: number }[] = [];
  private frameN = 0;
  /** Waves smoothly approach targets (boss phase 2 changes A/f). */
  waveTarget: Partial<Wave> | null = null;

  constructor(readonly id: string) {
    [this.l0, this.l0ctx] = makeCanvas(384, BG_H);
    [this.l1, this.l1ctx] = makeCanvas(384, BG_H);
    [this.sat, this.satCtx] = makeCanvas(384, BG_H);
  }

  /** Paint the sky / band layer (full 384×150, opaque). */
  protected abstract paintL0(ctx: CanvasRenderingContext2D, t: number): void;
  /** Paint the motif silhouettes (transparent background). */
  protected abstract paintL1(ctx: CanvasRenderingContext2D, t: number): void;
  /** Undistorted particles etc. (screen coords). */
  protected drawL2(_g: Gfx, _t: number): void {}
  /** Per-column vertical offset for L0 (heat haze), or null. */
  protected columnWave(): { A: number; lambda: number; f: number } | null {
    return null;
  }

  update(dt: number): void {
    this.t += dt / 1000;
    if (!this.frozen) this.mt += (dt / 1000) * this.speed;
    if (this.night > 0) this.night -= dt / 1000;
    if (this.waveTarget) {
      const k = Math.min(1, dt / 400);
      for (const key of Object.keys(this.waveTarget) as (keyof Wave)[]) {
        const tv = this.waveTarget[key];
        if (typeof tv === 'number') (this.wave[key] as number) += (tv - (this.wave[key] as number)) * k;
      }
    }
    this.updateL2(dt);
  }

  protected updateL2(_dt: number): void {}

  draw(g: Gfx): void {
    this.frameN++;
    const t = this.mt;
    const c0 = this.l0ctx;
    c0.clearRect(0, 0, 384, BG_H);
    this.paintL0(c0, t);
    const c1 = this.l1ctx;
    c1.clearRect(0, 0, 384, BG_H);
    this.paintL1(c1, t);
    const ampK = this.kire >= 1 ? 1.3 : 1;
    const w = this.wave;
    const T = this.frozen ? this.mt : this.t;
    const dxAt = (y: number) => {
      let d = w.A * ampK * Math.sin(2 * Math.PI * (y / w.lambda + w.f * T));
      if (w.A2) d += w.A2 * ampK * Math.sin(2 * Math.PI * (y / w.lambda2 - w.f2 * T));
      if (w.interlace && y & 1) d = -d;
      return Math.round(d);
    };
    const ctx = g.ctx;
    const saturate = this.kire >= 2;
    const filt = [saturate ? 'saturate(1.2)' : '', this.dim ? `brightness(${1 - this.dim})` : ''].join(' ').trim();
    const filtered = (src: HTMLCanvasElement): HTMLCanvasElement => {
      if (!filt) return src;
      const s = this.satCtx;
      s.clearRect(0, 0, 384, BG_H);
      s.filter = filt;
      s.drawImage(src, 0, 0);
      s.filter = 'none';
      return this.sat;
    };
    const rows = (src: HTMLCanvasElement, wrap: boolean) => {
      for (let y = 0; y < BG_H; y++) {
        const dx = dxAt(y);
        ctx.drawImage(src, 0, y, 384, 1, dx, y, 384, 1);
        if (!wrap) continue;
        if (dx > 0) ctx.drawImage(src, 384 - dx, y, dx, 1, 0, y, dx, 1);
        else if (dx < 0) ctx.drawImage(src, 0, y, -dx, 1, 384 + dx, y, -dx, 1);
      }
    };
    if (this.distortL1Only) {
      const s0 = filtered(this.l0);
      const cw = this.columnWave();
      if (cw) {
        for (let x = 0; x < 384; x++) {
          const dy = Math.round(cw.A * Math.sin(2 * Math.PI * (x / cw.lambda + cw.f * this.t)));
          ctx.drawImage(s0, x, 0, 1, BG_H, x, dy, 1, BG_H);
          if (dy > 0) ctx.drawImage(s0, x, 0, 1, 1, x, 0, 1, dy);
        }
      } else ctx.drawImage(s0, 0, 0);
      rows(filtered(this.l1), false);
    } else {
      c0.drawImage(this.l1, 0, 0);
      rows(filtered(this.l0), true);
    }
    // under the windows
    ctx.fillStyle = this.bottom;
    ctx.fillRect(0, BG_H, 384, 216 - BG_H);
    this.drawL2(g, t);
    if (this.kire >= 3) this.drawFocus(g);
  }

  private drawFocus(g: Gfx): void {
    if (this.frameN % 4 === 0 || !this.focusLines.length) {
      this.focusSeed++;
      this.focusLines = [];
      for (let i = 0; i < 24; i++) {
        const r = hashN(i, this.focusSeed);
        this.focusLines.push({ a: ((i + r * 0.8) / 24) * Math.PI * 2, w: 1 + Math.floor(hashN(i + 99, this.focusSeed) * 3), len: 70 + r * 40 });
      }
    }
    const ctx = g.ctx;
    ctx.save();
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = '#E23B2E';
    for (const l of this.focusLines) {
      const ca = Math.cos(l.a);
      const sa = Math.sin(l.a);
      // wedge from far outside toward the centre, stopping `len` px short
      const r0 = l.len;
      const r1 = 460;
      ctx.beginPath();
      const px = -sa * l.w * 0.5;
      const py = ca * l.w * 0.5;
      ctx.moveTo(192 + ca * r0, 96 + sa * r0);
      ctx.lineTo(192 + ca * r1 + px * 6, 96 + sa * r1 + py * 6);
      ctx.lineTo(192 + ca * r1 - px * 6, 96 + sa * r1 - py * 6);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }
}

function hashN(i: number, s: number): number {
  let h = Math.imul(i + 1, 374761393) ^ Math.imul(s + 7, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

// ---- painting helpers ---------------------------------------------------------------

function rgbOf(c: string): [number, number, number] {
  const v = parseInt(c.slice(1), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}

const texCache = new Map<string, HTMLCanvasElement>();

/** Cached texture of repeating horizontal bands with 2px ordered-dither seams. */
function bandTexture(colors: string[], bandH: number): HTMLCanvasElement {
  const key = 'b:' + colors.join(',') + ':' + bandH;
  let c = texCache.get(key);
  if (c) return c;
  const period = colors.length * bandH;
  const H = period + BG_H + 4;
  const [cv, ctx] = makeCanvas(384, H);
  const img = ctx.createImageData(384, H);
  const rgb = colors.map(rgbOf);
  for (let y = 0; y < H; y++) {
    const v = y % period;
    const bi = Math.floor(v / bandH);
    const inBand = v - bi * bandH;
    const cur = rgb[bi];
    const prev = rgb[(bi - 1 + colors.length) % colors.length];
    const th = inBand === 0 ? 10 : inBand === 1 ? 5 : 0;
    for (let x = 0; x < 384; x++) {
      const col = th && BAYER4[y & 3][x & 3] < th ? prev : cur;
      const i = (y * 384 + x) * 4;
      img.data[i] = col[0];
      img.data[i + 1] = col[1];
      img.data[i + 2] = col[2];
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  texCache.set(key, cv);
  return cv;
}

/** Horizontal bands with 2px ordered-dither seams. `offset` scrolls down. */
export function paintBands(ctx: CanvasRenderingContext2D, colors: string[], bandH: number, offset: number, y0 = 0, y1 = BG_H): void {
  const period = colors.length * bandH;
  const off = ((Math.round(offset) % period) + period) % period;
  const tex = bandTexture(colors, bandH);
  ctx.drawImage(tex, 0, period - off + y0, 384, y1 - y0, 0, y0, 384, y1 - y0);
}

/**
 * Cached vertical gradient between color stops, height h. The ramp is cut
 * into many close shades (one every ~5px) and only neighbouring shades are
 * dithered, so the transitions read as soft bands, never as a checkerboard.
 */
export function gradientTexture(stops: string[], h: number, w = 384): HTMLCanvasElement {
  const key = 'g:' + stops.join(',') + ':' + h + ':' + w;
  let c = texCache.get(key);
  if (c) return c;
  const [cv, ctx] = makeCanvas(w, h);
  const img = ctx.createImageData(w, h);
  const rgb = stops.map(rgbOf);
  const n = stops.length - 1;
  const levels = Math.max(2, Math.round(h / 5));
  const colorAt = (q: number): [number, number, number] => {
    const p = Math.max(0, Math.min(1, q)) * n;
    const i0 = Math.min(n - 1, Math.floor(p));
    const f = p - i0;
    const a = rgb[i0];
    const b = rgb[i0 + 1];
    return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
  };
  const shades: [number, number, number][] = [];
  for (let k = 0; k <= levels; k++) shades.push(colorAt(k / levels).map((v) => Math.round(v)) as [number, number, number]);
  for (let y = 0; y < h; y++) {
    const q = (y / Math.max(1, h - 1)) * levels;
    const k0 = Math.min(levels - 1, Math.floor(q));
    const th = Math.round((q - k0) * 16);
    for (let x = 0; x < w; x++) {
      const col = BAYER4[y & 3][x & 3] < th ? shades[k0 + 1] : shades[k0];
      const i = (y * w + x) * 4;
      img.data[i] = col[0];
      img.data[i + 1] = col[1];
      img.data[i + 2] = col[2];
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  texCache.set(key, cv);
  return cv;
}

/** Vertical gradient via dithered bands between color stops. */
export function paintGradient(ctx: CanvasRenderingContext2D, stops: string[], y0: number, y1: number): void {
  ctx.drawImage(gradientTexture(stops, y1 - y0), 0, y0);
}

/** Mix two hex colors. */
export function mixHex(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const r = Math.round(((pa >> 16) & 255) + ((((pb >> 16) & 255) - ((pa >> 16) & 255)) * t));
  const g = Math.round(((pa >> 8) & 255) + ((((pb >> 8) & 255) - ((pa >> 8) & 255)) * t));
  const bl = Math.round((pa & 255) + (((pb & 255) - (pa & 255)) * t));
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | bl).toString(16).slice(1);
}

/** Pixel-snapped filled circle on a raw 2D context. */
export function fillCircle(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string): void {
  ctx.fillStyle = color;
  cx = Math.round(cx);
  cy = Math.round(cy);
  for (let y = -Math.ceil(r); y <= Math.ceil(r); y++) {
    const s = r * r - y * y;
    if (s < 0) continue;
    const half = Math.floor(Math.sqrt(s));
    ctx.fillRect(cx - half, cy + y, half * 2 + 1, 1);
  }
}

/** Pixel ring (1px) on a raw 2D context. */
export function strokeCircle(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string, w = 1): void {
  ctx.fillStyle = color;
  const n = Math.max(12, Math.ceil(r * 7));
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    ctx.fillRect(Math.round(cx + Math.cos(a) * r - w / 2), Math.round(cy + Math.sin(a) * r - w / 2), w, w);
  }
}

/** Pixel line on a raw 2D context. */
export function pxLine(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, color: string, w = 1): void {
  ctx.fillStyle = color;
  const n = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))));
  for (let i = 0; i <= n; i++) {
    const x = x0 + ((x1 - x0) * i) / n;
    const y = y0 + ((y1 - y0) * i) / n;
    ctx.fillRect(Math.round(x - (w - 1) / 2), Math.round(y - (w - 1) / 2), w, w);
  }
}
