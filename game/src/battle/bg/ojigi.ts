// bg_ojigi (17.5): deep red gradient, a lattice of spinning 10-yen coins
// rotating as a whole, "あったか〜い" ribbons scrolling, twinkling LED dots.

import type { Gfx } from '../../engine/gfx';
import { drawText, measure } from '../../engine/font';
import { makeCanvas } from '../../engine/pixel';
import { Rng } from '../../engine/rng';
import { Background, BG_H, gradientTexture } from './common';

const COIN = { base: '#C08040', light: '#E8B070', shadow: '#8A5A2A', edge: '#6A4020', hi: '#F6D0A0' };

let coinFrames: HTMLCanvasElement[] | null = null;
function coins(): HTMLCanvasElement[] {
  if (coinFrames) return coinFrames;
  coinFrames = [1, 0.62, 0.18, 0.62].map((sx, fi) => {
    const R = 10;
    const [c, ctx] = makeCanvas(23, 23);
    const img = ctx.createImageData(23, 23);
    const put = (x: number, y: number, col: string) => {
      const v = parseInt(col.slice(1), 16);
      const i = (y * 23 + x) * 4;
      img.data[i] = (v >> 16) & 255;
      img.data[i + 1] = (v >> 8) & 255;
      img.data[i + 2] = v & 255;
      img.data[i + 3] = 255;
    };
    const rx = Math.max(1.2, R * sx);
    for (let y = 0; y < 23; y++)
      for (let x = 0; x < 23; x++) {
        const dx = (x + 0.5 - 11.5) / rx;
        const dy = (y + 0.5 - 11.5) / R;
        const d = dx * dx + dy * dy;
        if (d > 1) continue;
        let col = COIN.base;
        const lit = -dx * 0.6 - dy * 0.6;
        if (d > 0.78) col = lit > 0.1 ? COIN.light : COIN.edge;
        else if (d > 0.62 && d < 0.72) col = COIN.shadow; // inner ring
        else if (lit > 0.45) col = COIN.light;
        else if (lit < -0.45) col = COIN.shadow;
        if (fi === 2) col = x < 11 ? COIN.light : COIN.shadow;
        put(x, y, col);
      }
    if (fi === 0) {
      // "10" silhouette (not the real design): two small digits
      const one = ['.#', '##', '.#', '.#', '##'];
      const zero = ['.#.', '#.#', '#.#', '#.#', '.#.'];
      one.forEach((r, y) => [...r].forEach((ch, x) => ch === '#' && put(8 + x, 9 + y, COIN.shadow)));
      zero.forEach((r, y) => [...r].forEach((ch, x) => ch === '#' && put(11 + x, 9 + y, COIN.shadow)));
      put(7, 6, COIN.hi);
      put(8, 5, COIN.hi);
    }
    ctx.putImageData(img, 0, 0);
    return c;
  });
  return coinFrames;
}

let ribbon: HTMLCanvasElement | null = null;
function ribbonStrip(): HTMLCanvasElement {
  if (ribbon) return ribbon;
  const unit = 'あったか〜い　';
  const uw = measure(unit);
  const n = Math.ceil(384 / uw) + 2;
  const [c, ctx] = makeCanvas(uw * n, 18);
  ctx.fillStyle = '#E84E3C';
  ctx.fillRect(0, 0, c.width, 18);
  ctx.fillStyle = '#B83A2A';
  ctx.fillRect(0, 17, c.width, 1);
  ctx.fillStyle = '#FF7A62';
  ctx.fillRect(0, 0, c.width, 1);
  for (let i = 0; i < n; i++) drawText(ctx, unit, i * uw + 4, 1, { color: '#F4F1E8' });
  (c as HTMLCanvasElement & { unit?: number }).unit = uw;
  ribbon = c;
  return c;
}

export class OjigiBg extends Background {
  private leds: { x: number; y: number; ph: number }[] = [];
  private rot = 0;

  constructor() {
    super('bg_ojigi');
    this.wave = { A: 2, lambda: 32, f: 0.5, A2: 0, lambda2: 40, f2: 0.3, interlace: true };
    this.bottom = '#2A1418';
    const r = new Rng(8);
    for (let i = 0; i < 26; i++) this.leds.push({ x: r.range(0, 384), y: r.range(48, 150), ph: r.range(0, 10) });
  }

  /** Charging: grid spins 3× and the whole thing dims 20%. */
  charging = false;

  update(dt: number): void {
    super.update(dt);
    if (!this.frozen) this.rot += (dt / 1000) * ((8 * Math.PI) / 180) * (this.charging ? 3 : 1) * this.speed;
    this.dim = this.charging ? 0.2 : 0;
  }

  protected paintL0(ctx: CanvasRenderingContext2D): void {
    ctx.drawImage(gradientTexture(['#3A1A1E', '#5A1C24', '#8E1F2A'], BG_H), 0, 0);
  }

  protected paintL1(ctx: CanvasRenderingContext2D, t: number): void {
    const fr = coins();
    const ca = Math.cos(this.rot);
    const sa = Math.sin(this.rot);
    for (let gy = -8; gy <= 8; gy++)
      for (let gx = -8; gx <= 8; gx++) {
        const lx = gx * 32 + (gy & 1 ? 16 : 0);
        const ly = gy * 32;
        const x = 192 + lx * ca - ly * sa;
        const y = 96 + lx * sa + ly * ca;
        if (x < -12 || x > 396 || y < -12 || y > BG_H + 12) continue;
        const f = Math.floor(t * 6 + gx * 1.7 + gy * 2.3) & 3;
        ctx.drawImage(fr[f], Math.round(x - 11), Math.round(y - 11));
      }
  }

  protected drawL2(g: Gfx): void {
    const strip = ribbonStrip();
    const uw = (strip as HTMLCanvasElement & { unit?: number }).unit ?? 100;
    const ctx = g.ctx;
    const o1 = (this.t * 30) % uw;
    ctx.drawImage(strip, Math.round(o1), 0, 384, 18, 0, 54, 384, 18);
    const o2 = uw - ((this.t * 30) % uw);
    ctx.drawImage(strip, Math.round(o2), 0, 384, 18, 0, 124, 384, 18);
    for (const l of this.leds) {
      if (Math.sin(this.t * 4 + l.ph) > 0.3) {
        ctx.fillStyle = '#7CFF9A';
        ctx.fillRect(Math.round(l.x), Math.round(l.y), 1, 1);
      }
    }
  }
}
