// bg_residential (17.2): flowing sunset bands, the sun peeking under the
// notebook strip, utility poles and sagging wires (waving), low rooftops.
// Hato: business cards fluttering down-left. Semi: leaf silhouettes + heat haze.

import type { Gfx } from '../../engine/gfx';
import { Rng } from '../../engine/rng';
import { Background, BG_H, fillCircle, paintBands, pxLine } from './common';

const BANDS = ['#FFE7A3', '#F7C27A', '#F2894B', '#E8603C', '#D9728A', '#B04A7A', '#D9728A', '#E8603C', '#F2894B', '#F7C27A'];
const SIL = '#5B4A7A';
const SIL2 = '#4A3A6E';

interface Mote {
  x: number;
  y: number;
  vx: number;
  vy: number;
  ph: number;
}

export class ResidentialBg extends Background {
  private variant: 'hato' | 'semi' | 'plain';
  private motes: Mote[] = [];
  private cards: Mote[] = [];
  private roofs: { x: number; w: number; h: number; kind: number }[] = [];

  constructor(enemyId: string) {
    super('bg_residential');
    this.variant = enemyId === 'enemy_hato_kakaricho' ? 'hato' : enemyId === 'enemy_semi_final' ? 'semi' : 'plain';
    this.distortL1Only = true;
    this.wave = { A: 3, lambda: 40, f: 0.3, A2: 0, lambda2: 40, f2: 0.3, interlace: false };
    this.bottom = '#3A2B5C';
    const r = new Rng(11);
    for (let i = 0; i < 20; i++) this.motes.push({ x: r.range(0, 384), y: r.range(48, 150), vx: r.range(-4, 4), vy: r.range(-3, 1), ph: r.range(0, 6) });
    for (let i = 0; i < 10; i++) this.cards.push({ x: r.range(0, 420), y: r.range(40, 160), vx: -20 * r.range(0.8, 1.2), vy: 20 * r.range(0.5, 0.8), ph: r.int(0, 2) });
    let x = -10;
    while (x < 520) {
      const w = r.int(26, 54);
      this.roofs.push({ x, w, h: r.int(10, 22), kind: r.int(0, 2) });
      x += w + r.int(-2, 6);
    }
  }

  protected columnWave(): { A: number; lambda: number; f: number } | null {
    return this.variant === 'semi' ? { A: 1, lambda: 16, f: 1.5 } : null;
  }

  protected paintL0(ctx: CanvasRenderingContext2D, t: number): void {
    paintBands(ctx, BANDS, 10, t * 8);
    // sun with 3 halo rings cycling outward every 200ms
    const cyc = Math.floor(t * 5) % 3;
    const halo = ['#FFE7A3', '#F7C27A', '#F2894B'];
    for (let i = 2; i >= 0; i--) {
      const col = halo[(i - cyc + 3) % 3];
      ringFill(ctx, 96, 40, 28 + 4 + i * 4, 28 + 2 + i * 4, col, 0.55 - i * 0.12);
    }
    fillCircle(ctx, 96, 40, 28, '#FFE7A3');
    fillCircle(ctx, 90, 36, 20, '#FFF1C4');
    // the town skyline and the poles sit in L0 so they stay solid while the wires wave
    this.paintPoles(ctx, t);
    this.paintRoofs(ctx, t);
  }

  /** Low rooftops, water tanks and block walls with a few lit windows. */
  private paintRoofs(ctx: CanvasRenderingContext2D, t: number): void {
    const rs = (t * 6) % 520;
    const lit = '#FFD98A';
    const litDim = '#E8A86A';
    for (const r of this.roofs) {
      let x = Math.round(r.x - rs);
      if (x + r.w < -10) x += 520;
      if (x > 390) continue;
      const top = BG_H - 14 - r.h;
      const w = r.w;
      ctx.fillStyle = SIL2;
      if (r.kind === 0) {
        // gabled tile roof with eaves and a TV antenna
        for (let yy = 0; yy < 9; yy++) ctx.fillRect(x + 9 - yy, top + yy, w - 18 + yy * 2, 1);
        ctx.fillRect(x - 1, top + 8, w + 2, 2); // eaves
        ctx.fillRect(x + 2, top + 10, w - 4, BG_H - top - 10);
        // ridge highlight (sun from the upper left)
        ctx.fillStyle = SIL;
        ctx.fillRect(x + 9, top, w - 18, 1);
        for (let yy = 1; yy < 8; yy++) ctx.fillRect(x + 9 - yy, top + yy, 1, 1);
        // antenna
        ctx.fillStyle = SIL2;
        const ax = x + Math.round(w * 0.35);
        ctx.fillRect(ax, top - 9, 1, 9);
        ctx.fillRect(ax - 4, top - 8, 9, 1);
        ctx.fillRect(ax - 3, top - 5, 7, 1);
        ctx.fillRect(ax - 2, top - 2, 5, 1);
        // windows: two, one lit
        const wy = top + 14;
        const lightOn = (r.w * 7 + r.h) % 3 !== 0;
        ctx.fillStyle = lightOn ? lit : '#3A2B5C';
        ctx.fillRect(x + 6, wy, 5, 4);
        ctx.fillStyle = '#3A2B5C';
        ctx.fillRect(x + w - 12, wy, 5, 4);
        if (lightOn) {
          ctx.fillStyle = litDim;
          ctx.fillRect(x + 6, wy + 3, 5, 1);
          ctx.fillStyle = SIL2;
          ctx.fillRect(x + 8, wy, 1, 4); // window frame
        }
      } else if (r.kind === 1) {
        // flat-roofed apartment with a water tank and a row of windows
        ctx.fillRect(x, top + 4, w, BG_H - top - 4);
        ctx.fillRect(x - 1, top + 3, w + 2, 2);
        ctx.fillRect(x + w - 12, top - 4, 8, 7);
        ctx.fillRect(x + w - 11, top - 6, 6, 2);
        ctx.fillRect(x + w - 11, top + 3, 1, 1);
        ctx.fillStyle = SIL;
        ctx.fillRect(x + w - 12, top - 4, 1, 7);
        ctx.fillRect(x, top + 4, 1, BG_H - top - 4);
        for (let wx = x + 4, i = 0; wx + 4 < x + w - 2; wx += 8, i++) {
          const on = (i * 5 + r.w) % 4 === 0;
          const blink = on && (i + r.h) % 5 === 0 && Math.floor(t * 0.5 + i) % 7 === 0;
          ctx.fillStyle = on && !blink ? lit : '#3A2B5C';
          ctx.fillRect(wx, top + 9, 4, 3);
        }
      } else {
        // concrete block wall (with see-through blocks) and a garden tree
        const wy = BG_H - 16;
        fillCircle(ctx, x + w / 2, top + 3, 8, SIL2);
        fillCircle(ctx, x + w / 2 - 6, top + 7, 6, SIL2);
        fillCircle(ctx, x + w / 2 + 6, top + 6, 6, SIL2);
        ctx.fillStyle = SIL;
        for (let i = -5; i <= 1; i += 2) ctx.fillRect(Math.round(x + w / 2 - 7 + (i + 5)), top - 4 + Math.abs(i), 2, 1);
        ctx.fillStyle = SIL2;
        ctx.fillRect(x + w / 2 - 1, top + 8, 2, wy - top - 8);
        ctx.fillRect(x, wy, w, 16);
        ctx.fillStyle = SIL;
        ctx.fillRect(x, wy, w, 1);
        ctx.fillStyle = '#6A5486';
        for (let bx = x + 4; bx + 5 < x + w; bx += 12) {
          ctx.fillRect(bx, wy + 4, 5, 1);
          ctx.fillRect(bx + 1, wy + 5, 1, 2);
          ctx.fillRect(bx + 3, wy + 5, 1, 2);
        }
      }
    }
  }

  /** Pole x positions (every 112px, scrolling left 12px/s). */
  private poles(t: number): number[] {
    const scroll = (t * 12) % 112;
    const out: number[] = [];
    for (let px = -scroll - 112; px < 384 + 112; px += 112) out.push(Math.round(px + 60));
    return out;
  }

  /**
   * Utility poles stay upright (drawn into L0); only the wires live in the
   * distorted L1 so they ripple while the poles stand still.
   */
  private paintPoles(ctx: CanvasRenderingContext2D, t: number): void {
    const lit = '#6A5486';
    this.poles(t).forEach((p, i) => {
      // shaft with a lit left edge, step bolts alternating sides
      ctx.fillStyle = SIL;
      ctx.fillRect(p - 2, 50, 4, BG_H - 50);
      ctx.fillStyle = lit;
      ctx.fillRect(p - 2, 52, 1, BG_H - 52);
      ctx.fillStyle = SIL;
      for (let y = 88; y < BG_H - 12; y += 7) ctx.fillRect(((y / 7) | 0) % 2 ? p + 2 : p - 4, y, 2, 1);
      // crossarms and insulators
      ctx.fillRect(p - 12, 57, 24, 2);
      ctx.fillRect(p - 10, 62, 20, 1);
      ctx.fillStyle = lit;
      ctx.fillRect(p - 12, 57, 24, 1);
      ctx.fillStyle = SIL;
      for (const ix of [-11, -5, 5, 11]) {
        ctx.fillRect(p + ix, 54, 1, 3);
        ctx.fillRect(p + ix - 1, 55, 3, 1);
      }
      // pole-top transformer (every other pole) or a street lamp
      if (i % 2 === 0) {
        ctx.fillRect(p + 2, 70, 8, 11);
        ctx.fillRect(p + 3, 68, 6, 2);
        ctx.fillStyle = SIL2;
        ctx.fillRect(p + 8, 70, 2, 11);
        ctx.fillStyle = lit;
        ctx.fillRect(p + 2, 71, 1, 9);
        ctx.fillStyle = SIL;
        ctx.fillRect(p + 4, 81, 1, 3);
      } else {
        ctx.fillRect(p - 1, 78, 1, 1);
        pxLine(ctx, p - 2, 80, p - 14, 76, SIL, 1);
        ctx.fillRect(p - 18, 76, 6, 2);
        ctx.fillStyle = '#FFE7A3';
        ctx.fillRect(p - 17, 78, 4, 1);
      }
      // the address plate halfway down
      ctx.fillStyle = SIL2;
      ctx.fillRect(p - 3, 104, 6, 9);
      ctx.fillStyle = '#7A6496';
      ctx.fillRect(p - 2, 105, 4, 1);
      ctx.fillRect(p - 2, 108, 3, 1);
    });
  }

  protected paintL1(ctx: CanvasRenderingContext2D, t: number): void {
    const poles = this.poles(t);
    // wires (3) sag 10px between poles
    ctx.fillStyle = SIL;
    for (let i = 0; i + 1 < poles.length; i++) {
      const a = poles[i];
      const b = poles[i + 1];
      for (let k = 0; k < 3; k++) {
        const y0 = 56 + k * 3 + (k === 2 ? 3 : 0);
        const sagH = 10 - k;
        for (let x = a; x <= b; x++) {
          const u = (x - a) / (b - a);
          const sag = sagH * 4 * u * (1 - u);
          ctx.fillRect(x, Math.round(y0 + sag), 1, 1);
        }
      }
      // a thinner drop wire to the lamp side
      for (let x = a; x <= a + 40; x++) {
        const u = (x - a) / 40;
        ctx.fillRect(x, Math.round(66 + 14 * u * u), 1, 1);
      }
    }
    if (this.variant === 'semi') {
      // leaf clusters hanging in both upper corners
      leaves(ctx, 18, 58, t, false);
      leaves(ctx, 366, 60, t, true);
    }
  }

  protected updateL2(dt: number): void {
    const s = dt / 1000;
    for (const m of this.motes) {
      m.x += (m.vx + Math.sin(this.t * 0.7 + m.ph) * 3) * s;
      m.y += m.vy * s;
      if (m.x < -2) m.x += 388;
      if (m.x > 386) m.x -= 388;
      if (m.y < 46) m.y += 104;
      if (m.y > 150) m.y -= 104;
    }
    for (const c of this.cards) {
      c.x += c.vx * s;
      c.y += c.vy * s;
      if (c.x < -12 || c.y > 160) {
        c.x += 400;
        c.y -= 130;
      }
    }
  }

  protected drawL2(g: Gfx, t: number): void {
    const ctx = g.ctx;
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = '#FFE7A3';
    for (const m of this.motes) {
      ctx.fillRect(Math.round(m.x), Math.round(m.y), 1, 1);
      if (Math.sin(this.t * 3 + m.ph) > 0.6) ctx.fillRect(Math.round(m.x) + 1, Math.round(m.y), 1, 1);
    }
    ctx.globalAlpha = 1;
    if (this.variant === 'hato') {
      ctx.globalAlpha = 0.6;
      ctx.fillStyle = SIL2;
      for (const c of this.cards) {
        const f = (Math.floor(t * 6 + c.ph) % 3 + 3) % 3;
        const x = Math.round(c.x);
        const y = Math.round(c.y);
        if (f === 0) ctx.fillRect(x, y, 8, 5);
        else if (f === 1) {
          // tilted card
          for (let i = 0; i < 5; i++) ctx.fillRect(x + i, y + i, 6, 1);
        } else ctx.fillRect(x + 2, y, 3, 6);
      }
      ctx.globalAlpha = 1;
    }
  }
}

function ringFill(ctx: CanvasRenderingContext2D, cx: number, cy: number, r0: number, r1: number, color: string, alpha: number): void {
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  for (let y = -r0; y <= r0; y++) {
    const o = Math.floor(Math.sqrt(Math.max(0, r0 * r0 - y * y)));
    const i2 = r1 * r1 - y * y;
    const inr = i2 > 0 ? Math.floor(Math.sqrt(i2)) : -1;
    if (inr < 0) ctx.fillRect(cx - o, cy + y, o * 2 + 1, 1);
    else {
      ctx.fillRect(cx - o, cy + y, o - inr, 1);
      ctx.fillRect(cx + inr + 1, cy + y, o - inr, 1);
    }
  }
  ctx.globalAlpha = 1;
}

function leaves(ctx: CanvasRenderingContext2D, x: number, y: number, t: number, flip: boolean): void {
  const s = flip ? -1 : 1;
  ctx.fillStyle = SIL2;
  // branch
  pxLine(ctx, x - 30 * s, y - 16, x + 10 * s, y + 8, SIL2, 2);
  const sway = Math.round(Math.sin(t * 1.3) * 1.5);
  const pts = [
    [0, 0], [10, 6], [-8, 8], [18, 14], [4, 14], [-14, 2], [24, 4], [-2, 20],
  ];
  for (const [dx, dy] of pts) {
    const lx = x + dx * s + sway;
    const ly = y + dy;
    // teardrop leaf 7×4
    for (let i = 0; i < 7; i++) {
      const hw = i < 2 ? i : i > 4 ? 6 - i : 2;
      ctx.fillRect(Math.round(lx + i * s - (s < 0 ? 1 : 0)), Math.round(ly - hw / 2), 1, hw + 1);
    }
  }
}
