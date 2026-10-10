// bg_kanenari / bg_pr_board (17.4; the park's practice battle, evt_kn_lesson).
// ★2026-09-29 カネナリくん→グソっ君: the bells are gone — the sunset park
// instead. Warm gradient, the hand-drawn grid of a practice sheet drifting
// diagonally, rows of red dragonflies (赤とんぼ) flying in opposite
// directions, dandelion fluff floating up and small leaves drifting down.

import type { Gfx } from '../../engine/gfx';
import { Rng, hash2 } from '../../engine/rng';
import { Background, BG_H, gradientTexture } from './common';

// 12×5 red dragonfly seen from above: the dark head on the left, the long
// red body, two pairs of pale wings (spread / swept back on the beat)
const TOMBO = [
  ['..ww...ww...', '...ww.ww....', 'hhbbbbbbbbbb', '...ww.ww....', '..ww...ww...'],
  ['....ww..ww..', '...wwwwww...', 'hhbbbbbbbbbb', '...wwwwww...', '....ww..ww..'],
];
const TOMBO_COL: Record<string, string> = { h: '#8A2E3A', b: '#B8241E', w: '#FFF6D8' };
const LEAVES = ['#E8603C', '#F7C27A', '#C8A06A', '#9BCB6B', '#F4F1E8'];

export class KanenariBg extends Background {
  private fluff: { x: number; y: number; ph: number }[] = [];
  private leaves: { x: number; y: number; vy: number; ph: number }[] = [];

  constructor() {
    super('bg_kanenari');
    this.wave = { A: 1, lambda: 64, f: 0.2, A2: 0, lambda2: 40, f2: 0.3, interlace: false };
    this.bottom = '#5B3A4A';
    const r = new Rng(5);
    for (let i = 0; i < 8; i++) this.fluff.push({ x: r.range(10, 374), y: r.range(40, 170), ph: r.range(0, 6) });
    for (let i = 0; i < 30; i++) this.leaves.push({ x: r.range(0, 384), y: r.range(40, 150), vy: r.range(8, 20), ph: r.int(0, 5) });
  }

  protected paintL0(ctx: CanvasRenderingContext2D): void {
    ctx.drawImage(gradientTexture(['#F7C27A', '#F4A860', '#F2894B'], BG_H), 0, 0);
  }

  protected paintL1(ctx: CanvasRenderingContext2D, t: number): void {
    // hand-drawn 24px grid drifting (−10, −6) px/s; each segment wobbles ±1px
    const ox = ((-t * 10) % 24 + 24) % 24;
    const oy = ((-t * 6) % 24 + 24) % 24;
    ctx.globalAlpha = 0.45;
    ctx.fillStyle = '#FFE7A3';
    const cellX = Math.floor(-t * 10 / 24);
    const cellY = Math.floor(-t * 6 / 24);
    for (let gx = -1; gx < 18; gx++) {
      const x = Math.round(gx * 24 + ox);
      for (let gy = -1; gy < 8; gy++) {
        const j = Math.round(hash2(gx - cellX, gy - cellY, 3) * 2) - 1;
        ctx.fillRect(x + j, Math.round(gy * 24 + oy), 1, 24);
      }
    }
    for (let gy = -1; gy < 8; gy++) {
      const y = Math.round(gy * 24 + oy);
      for (let gx = -1; gx < 18; gx++) {
        const j = Math.round(hash2(gx - cellX, gy - cellY, 9) * 2) - 1;
        ctx.fillRect(Math.round(gx * 24 + ox), y + j, 24, 1);
      }
    }
    ctx.globalAlpha = 1;
    this.paintTombo(ctx, t);
  }

  /**
   * HD-2D (place.ts): over the park in 3D, the evening stays the practice
   * battle's — a warm wash of its sunset, the rows of red dragonflies, the
   * fluff and the leaves (the practice sheet's grid is left out).
   */
  protected drawOverPlace(g: Gfx): void {
    const ctx = g.ctx;
    ctx.globalAlpha = 0.38;
    ctx.drawImage(gradientTexture(['#F7C27A', '#F4A860', '#F2894B'], BG_H), 0, 0);
    ctx.globalAlpha = 1;
    this.paintTombo(ctx, this.mt);
    this.drawL2(g);
  }

  /**
   * Rows of red dragonflies at y52 and y118, flying in opposite directions;
   * their wings beat and each one bobs a pixel, neighbours out of phase.
   */
  private paintTombo(ctx: CanvasRenderingContext2D, t: number): void {
    for (const [y, dir] of [[52, 1], [118, -1]] as [number, number][]) {
      const off = ((t * 14 * dir) % 48 + 48) % 48;
      for (let k = -1; k < 9; k++) {
        const bx = Math.round(k * 48 + off);
        const beat = (Math.floor(t * 8) + k) & 1;
        const bob = [0, -1, 0, 1][(Math.floor(t * 2.5) + k * 3) & 3];
        const rows = TOMBO[beat];
        for (let r = 0; r < rows.length; r++)
          for (let c = 0; c < 12; c++) {
            const col = TOMBO_COL[rows[r][dir > 0 ? 11 - c : c]];
            if (!col) continue;
            ctx.fillStyle = col;
            ctx.fillRect(bx + c, y + r + bob, 1, 1);
          }
      }
    }
  }

  protected updateL2(dt: number): void {
    const s = dt / 1000;
    for (const b of this.fluff) {
      b.y -= 12 * s;
      if (b.y < 30) {
        b.y = 175;
        b.x = Math.random() * 364 + 10;
      }
    }
    for (const c of this.leaves) {
      c.y += c.vy * s;
      if (c.y > 152) c.y = 44;
    }
  }

  protected drawL2(g: Gfx): void {
    const ctx = g.ctx;
    const cyc = Math.floor(this.t * 3);
    // small leaves turning as they drift down
    for (const c of this.leaves) {
      ctx.fillStyle = LEAVES[c.ph % LEAVES.length];
      const x = Math.round(c.x + Math.sin(this.t * 1.6 + c.ph) * 4);
      const y = Math.round(c.y);
      if ((cyc + c.ph) % 2) ctx.fillRect(x, y, 2, 1);
      else ctx.fillRect(x, y, 1, 2);
    }
    // dandelion fluff floating up: a pale seed head on a thin stalk
    for (const b of this.fluff) {
      const x = Math.round(b.x + Math.sin(this.t * 1.2 + b.ph) * 5);
      const y = Math.round(b.y);
      ctx.fillStyle = '#FBF3DC';
      ctx.fillRect(x - 1, y - 2, 3, 1);
      ctx.fillRect(x - 2, y - 1, 1, 1);
      ctx.fillRect(x + 2, y - 1, 1, 1);
      ctx.fillRect(x, y - 3, 1, 1);
      ctx.fillStyle = '#F4F1E8';
      ctx.fillRect(x - 1, y - 1, 3, 1);
      ctx.fillStyle = '#C8A06A';
      ctx.fillRect(x, y, 1, 3);
    }
  }
}
