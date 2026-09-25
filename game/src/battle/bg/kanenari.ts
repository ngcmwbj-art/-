// bg_kanenari / bg_pr_board (17.4): warm gradient, hand-drawn PR board grid
// drifting diagonally, rows of little bells, rising balloons and confetti.

import type { Gfx } from '../../engine/gfx';
import { Rng, hash2 } from '../../engine/rng';
import { Background, BG_H, gradientTexture } from './common';

// 8×8 school bell: loop on top, lit from the left, flared lip, clapper
const BELL = [
  '...hh...',
  '..h..h..',
  '..hhhh..',
  '.hlhhhh.',
  '.hlhhhh.',
  '.hlhhhhh',
  'hhhhhhhh',
  '..ddd...',
];
const BELL_COL: Record<string, string> = { h: '#A8742A', l: '#D9A441', d: '#7A4E1E' };
const BALLOON_COLS = ['#F2894B', '#E0567A', '#FFD23F', '#5CE1FF'];
const CONFETTI = ['#E84E3C', '#FFD23F', '#5CE1FF', '#F4F1E8', '#E0567A', '#9BCB6B'];

export class KanenariBg extends Background {
  private balloons: { x: number; y: number; c: number; ph: number }[] = [];
  private confetti: { x: number; y: number; vy: number; ph: number }[] = [];

  constructor() {
    super('bg_kanenari');
    this.wave = { A: 1, lambda: 64, f: 0.2, A2: 0, lambda2: 40, f2: 0.3, interlace: false };
    this.bottom = '#5B3A4A';
    const r = new Rng(5);
    for (let i = 0; i < 8; i++) this.balloons.push({ x: r.range(10, 374), y: r.range(40, 170), c: i % 4, ph: r.range(0, 6) });
    for (let i = 0; i < 40; i++) this.confetti.push({ x: r.range(0, 384), y: r.range(40, 150), vy: r.range(8, 22), ph: r.int(0, 5) });
  }

  protected paintL0(ctx: CanvasRenderingContext2D): void {
    ctx.drawImage(gradientTexture(['#F7C27A', '#F4A860', '#F2894B'], BG_H), 0, 0);
  }

  protected paintL1(ctx: CanvasRenderingContext2D, t: number): void {
    // hand-drawn 24px grid drifting (−10, −6) px/s; each segment wobbles ±1px
    const ox = ((-t * 10) % 24 + 24) % 24;
    const oy = ((-t * 6) % 24 + 24) % 24;
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = '#D9A441';
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
    // bell rows at y30 and y120, moving in opposite directions
    // (y30 sits under the message band, so the upper row is lowered to y54)
    for (const [y, dir] of [[54, 1], [120, -1]] as [number, number][]) {
      const off = ((t * 14 * dir) % 32 + 32) % 32;
      for (let k = -1; k < 13; k++) {
        const bx = Math.round(k * 32 + off);
        // every bell swings a little, neighbours out of phase
        const sw = [0, 1, 0, -1][(Math.floor(t * 2.5) + k * dir) & 3];
        for (let r = 0; r < BELL.length; r++) {
          const dx = r < 3 ? sw : r === 7 ? -sw : 0;
          for (let c = 0; c < 8; c++) {
            const col = BELL_COL[BELL[r][c]];
            if (!col) continue;
            ctx.fillStyle = col;
            ctx.fillRect(bx + c + dx, y + r, 1, 1);
          }
        }
      }
    }
  }

  protected updateL2(dt: number): void {
    const s = dt / 1000;
    for (const b of this.balloons) {
      b.y -= 20 * s;
      if (b.y < 30) {
        b.y = 175;
        b.x = Math.random() * 364 + 10;
      }
    }
    for (const c of this.confetti) {
      c.y += c.vy * s;
      if (c.y > 152) c.y = 44;
    }
  }

  protected drawL2(g: Gfx): void {
    const ctx = g.ctx;
    const cyc = Math.floor(this.t * 6);
    for (const c of this.confetti) {
      ctx.fillStyle = CONFETTI[(c.ph + cyc) % CONFETTI.length];
      const x = Math.round(c.x + Math.sin(this.t * 2 + c.ph) * 3);
      const y = Math.round(c.y);
      if ((cyc + c.ph) % 2) ctx.fillRect(x, y, 2, 1);
      else ctx.fillRect(x, y, 1, 2);
    }
    for (const b of this.balloons) {
      const x = Math.round(b.x + Math.sin(this.t * 1.4 + b.ph) * 4);
      const y = Math.round(b.y);
      const col = BALLOON_COLS[b.c];
      // body 10×12 with highlight and outline
      ctx.fillStyle = '#5B3A4A';
      ctx.fillRect(x + 2, y - 1, 6, 1);
      ctx.fillRect(x, y + 1, 1, 7);
      ctx.fillRect(x + 9, y + 1, 1, 7);
      ctx.fillRect(x + 1, y, 1, 1);
      ctx.fillRect(x + 8, y, 1, 1);
      ctx.fillRect(x + 1, y + 8, 2, 1);
      ctx.fillRect(x + 7, y + 8, 2, 1);
      ctx.fillRect(x + 3, y + 9, 4, 1);
      ctx.fillStyle = col;
      ctx.fillRect(x + 2, y, 6, 9);
      ctx.fillRect(x + 1, y + 1, 8, 7);
      ctx.fillStyle = '#FFF6D8';
      ctx.fillRect(x + 2, y + 2, 1, 2);
      ctx.fillStyle = '#F4F1E8';
      for (let i = 0; i < 8; i++) ctx.fillRect(x + 5 + Math.round(Math.sin(this.t * 3 + i * 0.7 + b.ph) * 1), y + 10 + i, 1, 1);
    }
  }
}
