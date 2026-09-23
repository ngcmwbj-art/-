// bg_ojigi (17.5): deep red gradient, a lattice of spinning 10-yen coins
// rotating as a whole, "あったか〜い" ribbons scrolling, twinkling LED dots.

import type { Gfx } from '../../engine/gfx';
import { drawText, measure } from '../../engine/font';
import { makeCanvas } from '../../engine/pixel';
import { Rng } from '../../engine/rng';
import { Background, BG_H, gradientTexture } from './common';

const COIN = { base: '#C08040', light: '#E8B070', shadow: '#8A5A2A', edge: '#4A2A14', hi: '#F6D0A0' };

let coinFrames: HTMLCanvasElement[] | null = null;
/**
 * A 10-yen-style coin (not the real design) spinning in 4 frames: face,
 * three-quarter, edge-on, three-quarter (back). Radius 10, hard 1px dark rim,
 * a bright bevel on the upper-left, an inner ring and a raised "10".
 */
function coins(): HTMLCanvasElement[] {
  if (coinFrames) return coinFrames;
  const S = 25;
  const C0 = 12.5;
  coinFrames = [1, 0.6, 0.16, 0.6].map((sx, fi) => {
    const R = 10;
    const [c, ctx] = makeCanvas(S, S);
    const img = ctx.createImageData(S, S);
    const put = (x: number, y: number, col: string) => {
      if (x < 0 || y < 0 || x >= S || y >= S) return;
      const v = parseInt(col.slice(1), 16);
      const i = (y * S + x) * 4;
      img.data[i] = (v >> 16) & 255;
      img.data[i + 1] = (v >> 8) & 255;
      img.data[i + 2] = v & 255;
      img.data[i + 3] = 255;
    };
    const rx = Math.max(1.5, R * sx);
    const back = fi === 3;
    const inside = (x: number, y: number, k = 1) => {
      const dx = (x + 0.5 - C0) / (rx * k);
      const dy = (y + 0.5 - C0) / (R * k);
      return dx * dx + dy * dy <= 1;
    };
    for (let y = 0; y < S; y++)
      for (let x = 0; x < S; x++) {
        if (!inside(x, y)) continue;
        const edge = !inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1);
        const dx = (x + 0.5 - C0) / rx;
        const dy = (y + 0.5 - C0) / R;
        const lit = -dx * 0.7 - dy * 0.7;
        let col = back ? COIN.shadow : COIN.base;
        if (edge) col = COIN.edge;
        else if (fi === 2) col = x < C0 ? COIN.light : COIN.shadow;
        else if (!inside(x, y, 0.84)) col = lit > 0.15 ? COIN.hi : lit < -0.2 ? COIN.shadow : COIN.light;
        else if (inside(x, y, 0.74) && !inside(x, y, 0.64)) col = COIN.shadow;
        else if (lit > 0.55) col = COIN.light;
        else if (lit < -0.55) col = back ? COIN.edge : COIN.shadow;
        put(x, y, col);
      }
    if (fi === 0) {
      // a raised "10" (lit on the upper-left, shadowed on the lower-right)
      const one = ['.#', '##', '.#', '.#', '.#', '###'];
      const zero = ['.##.', '#..#', '#..#', '#..#', '#..#', '.##.'];
      const draw = (rows: string[], ox: number, col: string) =>
        rows.forEach((r, y) => [...r].forEach((ch, x) => ch === '#' && put(ox + x, 10 + y, col)));
      draw(one, 8, COIN.shadow);
      draw(zero, 11, COIN.shadow);
      draw(one, 7, COIN.hi);
      draw(zero, 10, COIN.hi);
      put(6, 6, '#FFF0D0');
      put(7, 5, '#FFF0D0');
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
    // 17.5 asks for A=2, λ=32, f=0.5 with interlace; on the 21px coins the
    // interlaced rows smear the spin frames into blurry ovals, so the coins
    // get a gentle whole-row sway instead (A=1.2, no interlace) and stay crisp.
    this.wave = { A: 1.2, lambda: 32, f: 0.5, A2: 0, lambda2: 40, f2: 0.3, interlace: false };
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
        ctx.drawImage(fr[f], Math.round(x - 12), Math.round(y - 12));
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
