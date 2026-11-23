// bg_reverse_rain (17.3): dusk gradient that breathes, umbrella ribs and
// canopy rings rotating, rain falling *upward*. Cone: construction stripes and
// a rotating beacon fan. Wasuregasa: one broken rib, a little normal rain.

import type { Gfx } from '../../engine/gfx';
import { Rng } from '../../engine/rng';
import { Background, BG_H, gradientTexture, pxLine } from './common';

interface Drop {
  x: number;
  y: number;
  v: number;
  up: boolean;
}

export class RainBg extends Background {
  private variant: 'cone' | 'kasa' | 'plain';
  private drops: Drop[] = [];
  private splashes: { x: number; t: number }[] = [];

  constructor(enemyId: string) {
    super('bg_reverse_rain');
    this.variant = enemyId === 'enemy_cone_vocal' ? 'cone' : enemyId === 'enemy_wasuregasa' ? 'kasa' : 'plain';
    this.wave = { A: 2, lambda: 64, f: 0.2, A2: 0, lambda2: 40, f2: 0.3, interlace: false };
    this.bottom = '#2A2440';
    const r = new Rng(21);
    for (let i = 0; i < 60; i++) this.drops.push({ x: r.range(0, 384), y: r.range(0, 170), v: r.range(80, 140), up: true });
    if (this.variant === 'kasa') for (let i = 0; i < 14; i++) this.drops.push({ x: r.range(0, 384), y: r.range(0, 150), v: r.range(110, 150), up: false });
  }

  protected paintL0(ctx: CanvasRenderingContext2D): void {
    ctx.drawImage(gradientTexture(['#3A2B5C', '#5A4480', '#7A5AA0', '#A8659A', '#D9728A'], BG_H), 0, 0);
    // breathing ±4%
    const b = Math.sin((this.t / 4) * Math.PI * 2) * 0.04;
    ctx.globalAlpha = Math.abs(b);
    ctx.fillStyle = b > 0 ? '#FFFFFF' : '#000000';
    ctx.fillRect(0, 0, 384, BG_H);
    ctx.globalAlpha = 1;
  }

  protected paintL1(ctx: CanvasRenderingContext2D, t: number): void {
    const cx = 192;
    const cy = 96;
    const rot = (t * 12 * Math.PI) / 180;
    // canopy rings every 32px: scalloped between ribs
    ctx.fillStyle = '#5B4A7A';
    for (let r = 32; r < 260; r += 32) {
      const n = Math.ceil(r * 6.5);
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        const seg = ((a - rot) / (Math.PI * 2)) * 12;
        const u = seg - Math.floor(seg);
        const rr = r - Math.sin(u * Math.PI) * (r * 0.06);
        const x = Math.round(cx + Math.cos(a) * rr);
        const y = Math.round(cy + Math.sin(a) * rr);
        if (y >= 0 && y < BG_H) ctx.fillRect(x, y, 1, 1);
      }
    }
    // 12 ribs, 2px
    for (let i = 0; i < 12; i++) {
      const a = rot + (i / 12) * Math.PI * 2;
      const broken = this.variant === 'kasa' && i === 4;
      const len = broken ? 110 : 280;
      const x1 = cx + Math.cos(a) * len;
      const y1 = cy + Math.sin(a) * len;
      pxLine(ctx, cx + Math.cos(a) * 6, cy + Math.sin(a) * 6, x1, y1, '#4A3A6E', 2);
      if (broken) {
        // the snapped end bends outward
        const b = a + 0.5;
        pxLine(ctx, x1, y1, x1 + Math.cos(b) * 60, y1 + Math.sin(b) * 60, '#4A3A6E', 2);
      }
      // rib tips (small knobs on the rings)
      for (let r = 32; r < 260; r += 64) {
        if (broken && r > 110) continue;
        const x = Math.round(cx + Math.cos(a) * r);
        const y = Math.round(cy + Math.sin(a) * r);
        ctx.fillStyle = '#3A2B5C';
        ctx.fillRect(x - 1, y - 1, 3, 3);
      }
    }
    // hub (ferrule)
    ctx.fillStyle = '#4A3A6E';
    ctx.fillRect(cx - 3, cy - 3, 7, 7);
    ctx.fillStyle = '#3A2B5C';
    ctx.fillRect(cx - 1, cy - 1, 3, 3);
    if (this.variant === 'cone') {
      // diagonal construction stripes moving right (orange α18%, white α10%)
      const off = (this.t * 20) % 32;
      for (let y = 0; y < BG_H; y++) {
        for (let k = -2; k < 16; k++) {
          const x0 = Math.round(k * 32 + off - y);
          ctx.globalAlpha = 0.18;
          ctx.fillStyle = '#F07A2A';
          ctx.fillRect(x0, y, 16, 1);
          ctx.globalAlpha = 0.1;
          ctx.fillStyle = '#F4F1E8';
          ctx.fillRect(x0 + 16, y, 16, 1);
        }
      }
      ctx.globalAlpha = 1;
    }
  }

  protected updateL2(dt: number): void {
    const s = dt / 1000;
    for (const d of this.drops) {
      if (d.up) {
        d.y -= d.v * s;
        if (d.y < 48) {
          this.splashes.push({ x: d.x, t: 0 });
          d.y = BG_H + Math.random() * 20;
          d.x = Math.random() * 384;
        }
      } else {
        d.y += d.v * s;
        d.x -= d.v * s * 0.1;
        if (d.y > BG_H) {
          d.y = 44 - Math.random() * 10;
          d.x = Math.random() * 400;
        }
      }
    }
    for (const sp of this.splashes) sp.t += dt;
    this.splashes = this.splashes.filter((sp) => sp.t < 160);
  }

  protected drawL2(g: Gfx): void {
    const ctx = g.ctx;
    if (this.variant === 'cone') {
      // beacon light fan from the top centre, 90°/s
      const a = (this.t * Math.PI) / 2;
      ctx.globalAlpha = 0.12;
      ctx.fillStyle = '#FFD23F';
      ctx.beginPath();
      ctx.moveTo(192, 48);
      ctx.arc(192, 48, 260, a - 0.3, a + 0.3);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(192, 48);
      ctx.arc(192, 48, 260, a + Math.PI - 0.3, a + Math.PI + 0.3);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    for (const d of this.drops) {
      const x = Math.round(d.x);
      const y = Math.round(d.y);
      ctx.globalAlpha = 0.7;
      ctx.fillStyle = '#CFE3EA';
      ctx.fillRect(x, d.up ? y + 1 : y - 3, 1, 3);
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(x, d.up ? y : y, 1, 1);
    }
    ctx.fillStyle = '#CFE3EA';
    for (const sp of this.splashes) {
      const k = sp.t < 80 ? 1 : 2;
      const x = Math.round(sp.x);
      ctx.fillRect(x - k, 48 + (k - 1), 1, 1);
      ctx.fillRect(x + k, 48 + (k - 1), 1, 1);
    }
  }
}
