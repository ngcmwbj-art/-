// bg_boss / bg_boss_clocks (17.7): the sun that doesn't set, radiating dusk,
// eighteen clock faces all running backwards while slowly orbiting it.
// Phase 2: faster, stronger waves, flashes of night. Final: frozen.

import type { Gfx } from '../../engine/gfx';
import { makeCanvas, BAYER4 } from '../../engine/pixel';
import { Rng } from '../../engine/rng';
import { Background, BG_H, fillCircle, pxLine, strokeCircle } from './common';

const STOPS = ['#FFE7A3', '#F2894B', '#D9728A', '#7A5AA0', '#3A2B5C'];
const SUN = { x: 192, y: 84 };

let radial: HTMLCanvasElement | null = null;
function radialTex(): HTMLCanvasElement {
  if (radial) return radial;
  const [c, ctx] = makeCanvas(384, BG_H);
  const img = ctx.createImageData(384, BG_H);
  const rgb = STOPS.map((s) => {
    const v = parseInt(s.slice(1), 16);
    return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
  });
  for (let y = 0; y < BG_H; y++)
    for (let x = 0; x < 384; x++) {
      const d = Math.hypot((x - SUN.x) / 1.35, y - SUN.y) / 150;
      const p = Math.min(0.999, d) * (STOPS.length - 1);
      const i0 = Math.floor(p);
      const f = p - i0;
      const col = BAYER4[y & 3][x & 3] < f * 16 ? rgb[Math.min(STOPS.length - 1, i0 + 1)] : rgb[i0];
      const i = (y * 384 + x) * 4;
      img.data[i] = col[0];
      img.data[i + 1] = col[1];
      img.data[i + 2] = col[2];
      img.data[i + 3] = 255;
    }
  ctx.putImageData(img, 0, 0);
  radial = c;
  return c;
}

interface Clock {
  r: number;
  dist: number;
  a0: number;
  alpha: number;
  hourSpd: number;
  h0: number;
  m0: number;
}

export class BossBg extends Background {
  private clocks: Clock[] = [];
  private stars: [number, number][] = [];
  /** Clocks shiver (4th chime). */
  shiver = 0;
  /** Big bell silhouette flash behind the boss (4th chime). */
  bellFlash = 0;
  private nightTimer = 0;
  phase2 = false;

  constructor() {
    super('bg_boss');
    this.wave = { A: 2, lambda: 56, f: 0.25, A2: 0, lambda2: 40, f2: 0.3, interlace: false };
    this.bottom = '#1B1733';
    const r = new Rng(44);
    for (let i = 0; i < 18; i++) {
      this.clocks.push({
        r: r.int(8, 26),
        dist: 40 + (i % 3) * 38 + r.range(0, 22),
        a0: (i / 18) * Math.PI * 2 + r.range(-0.15, 0.15),
        alpha: r.range(0.35, 0.6),
        hourSpd: (r.range(30, 90) * Math.PI) / 180,
        h0: r.range(0, 6.28),
        m0: r.range(0, 6.28),
      });
    }
    for (let i = 0; i < 60; i++) this.stars.push([r.int(0, 383), r.int(0, BG_H - 1)]);
  }

  update(dt: number): void {
    super.update(dt);
    if (this.shiver > 0) this.shiver -= dt;
    if (this.bellFlash > 0) this.bellFlash -= dt;
    if (this.phase2 && !this.frozen) {
      this.nightTimer += dt;
      if (this.nightTimer > 6000) {
        this.nightTimer = 0;
        this.night = 0.3;
      }
    }
  }

  protected paintL0(ctx: CanvasRenderingContext2D, t: number): void {
    if (this.night > 0) {
      ctx.fillStyle = '#1B1733';
      ctx.fillRect(0, 0, 384, BG_H);
      ctx.fillStyle = '#FFF6D8';
      for (const [x, y] of this.stars) ctx.fillRect(x, y, 1, 1);
      return;
    }
    ctx.drawImage(radialTex(), 0, 0);
    const pulse = Math.sin((t / 3) * Math.PI * 2);
    const r = 24 + pulse * 1.2;
    fillCircle(ctx, SUN.x, SUN.y, r + 7, '#F7C27A');
    fillCircle(ctx, SUN.x, SUN.y, r + 3, '#FFE7A3');
    fillCircle(ctx, SUN.x, SUN.y, r, '#FFF1C4');
    fillCircle(ctx, SUN.x - 5, SUN.y - 5, r * 0.6, '#FFF9E2');
    if (this.bellFlash > 0) {
      // a big bell silhouette flashes behind everything
      ctx.globalAlpha = Math.min(1, this.bellFlash / 200) * 0.45;
      ctx.fillStyle = '#FFE7A3';
      ctx.beginPath();
      ctx.moveTo(192, 20);
      ctx.bezierCurveTo(150, 22, 140, 70, 120, 120);
      ctx.lineTo(264, 120);
      ctx.bezierCurveTo(244, 70, 234, 22, 192, 20);
      ctx.fill();
      ctx.fillRect(116, 118, 152, 8);
      ctx.globalAlpha = 1;
    }
  }

  protected paintL1(ctx: CanvasRenderingContext2D, t: number): void {
    const night = this.night > 0;
    const orbit = (-4 * Math.PI) / 180;
    for (const c of this.clocks) {
      const a = c.a0 + orbit * t;
      let x = SUN.x + Math.cos(a) * c.dist * 1.5;
      let y = SUN.y + Math.sin(a) * c.dist * 0.75;
      if (this.shiver > 0) {
        x += Math.round(Math.random() * 2 - 1);
        y += Math.round(Math.random() * 2 - 1);
      }
      ctx.globalAlpha = night ? 0.8 : c.alpha;
      fillCircle(ctx, x, y, c.r, night ? '#3A2B5C' : '#F4F1E8');
      ctx.globalAlpha = night ? 0.9 : Math.min(1, c.alpha + 0.3);
      strokeCircle(ctx, x, y, c.r, '#5B4A7A');
      // hour ticks
      for (let k = 0; k < 12; k += c.r > 14 ? 1 : 3) {
        const ta = (k / 12) * Math.PI * 2;
        ctx.fillStyle = '#5B4A7A';
        ctx.fillRect(Math.round(x + Math.cos(ta) * (c.r - 2)), Math.round(y + Math.sin(ta) * (c.r - 2)), 1, 1);
      }
      // hands run counter-clockwise
      const ha = c.h0 - c.hourSpd * t;
      const ma = c.m0 - c.hourSpd * 4 * t;
      const hand = night ? '#1B1733' : '#3A2B5C';
      pxLine(ctx, x, y, x + Math.cos(ha) * c.r * 0.5, y + Math.sin(ha) * c.r * 0.5, hand, c.r > 16 ? 2 : 1);
      pxLine(ctx, x, y, x + Math.cos(ma) * c.r * 0.8, y + Math.sin(ma) * c.r * 0.8, hand, 1);
      ctx.fillStyle = hand;
      ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
      ctx.globalAlpha = 1;
    }
  }
}
