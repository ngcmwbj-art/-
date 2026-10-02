// bg_h_sawa (51 15.9、02 #65): セキトメ — 沢の上の夜。上に細い夜空と天の川、左右から
// 杉の梢がせまる谷。まん中に子どものプール（せきでたまった水）が光り、星が1つずつ
// 流れてきては、せきの手前でたまって回る。手前はぬれた石の岸。提灯の橙の帯は1本
// （51 15.1 の決まり）。セキトメが休むと（flags.rest）、水面の星が下へ流れはじめる。

import type { Gfx } from '../../engine/gfx';
import { BAYER4, makeCanvas } from '../../engine/pixel';
import { hash2, Rng } from '../../engine/rng';
import { Background, BG_H, gradientTexture } from './common';
import { drawLoop, milkyWayTile, ridgeTile } from './hoshi_scenery';

const TOMATO = '#F2894B';

interface Star {
  x: number;
  y: number;
  ph: number;
  a: number;
}

export class HoshiSawaBg extends Background {
  private stars: Star[] = [];
  private milky = milkyWayTile('sawa', 16, (x) => 6 + 4 * Math.sin((x / 384) * Math.PI * 2 + 0.4), 5, 71);
  private cedarL: HTMLCanvasElement;
  private cedarR: HTMLCanvasElement;
  private far = ridgeTile('sawa_far', 40, (x) => 14 + 6 * Math.sin(x / 41 + 1) + 3 * Math.sin(x / 13), '#2A2440', { rim: '#5B4A7A', rimA: 0.6, trees: 0.5, treeH: 9, seed: 72 });
  private bank: HTMLCanvasElement;

  constructor() {
    super('bg_h_sawa');
    this.wave = { A: 1, lambda: 48, f: 0.25, A2: 0, lambda2: 40, f2: 0.3, interlace: false };
    this.bottom = '#1B1733';
    const r = new Rng(73);
    for (let i = 0; i < 26; i++) this.stars.push({ x: r.int(90, 294), y: r.int(2, 34), ph: r.range(0, 6.28), a: r.range(0.5, 1) });
    // the cedar walls of the valley (left and right), their near edges catching the starlight
    const wall = (side: -1 | 1): HTMLCanvasElement => {
      const [c, ctx] = makeCanvas(384, BG_H);
      // cedars standing on the far banks, taller toward the edges of the picture;
      // their feet end at the water's far edge (y ≈ 60), the pool stays open below
      for (let i = 0; i < 11; i++) {
        const baseX = side < 0 ? 6 + i * 13 + hash2(i, 1, 74) * 6 : 378 - i * 13 - hash2(i, 2, 74) * 6;
        const top = 2 + Math.round(hash2(i, 3, 74) * 12) + i * 3;
        const bot = 58 + Math.round(hash2(i, 4, 74) * 6);
        for (let y = top; y < bot; y++) {
          const k = (y - top) / Math.max(1, bot - top);
          const hw = Math.min(11, Math.round(1 + k * 10 + ((y - top) % 5 === 4 ? 1 : 0)));
          ctx.fillStyle = i % 3 === 0 ? '#141028' : '#0B0B14';
          ctx.fillRect(Math.round(baseX - hw), y, hw * 2 + 1, 1);
          // the inner (valley-side) edge: a 1px violet rim of starlight
          ctx.fillStyle = '#3A2B5C';
          ctx.fillRect(Math.round(baseX + (side < 0 ? hw : -hw)), y, 1, 1);
        }
        if (baseX > 140 && baseX < 244) break;
      }
      // the far bank under them: a dark line of stones
      for (let x = 0; x < 384; x++) {
        const edge = side < 0 ? x < 150 : x > 234;
        if (!edge) continue;
        const h = 3 + Math.round(hash2(x >> 2, 9, 74) * 3);
        ctx.fillStyle = '#141028';
        ctx.fillRect(x, 58, 1, h);
        if (hash2(x >> 2, 10, 74) < 0.4) {
          ctx.fillStyle = '#3A2B5C';
          ctx.fillRect(x, 58, 1, 1);
        }
      }
      return c;
    };
    this.cedarL = wall(-1);
    this.cedarR = wall(1);
    // the wet stones of the near bank (a 384 × 34 strip)
    const [b, bx] = makeCanvas(384, 34);
    for (let x = 0; x < 384; x += 1)
      for (let y = 0; y < 34; y++) {
        const cx = Math.floor(x / 9);
        const cy = Math.floor((y + (cx % 2) * 4) / 8);
        const h = hash2(cx, cy, 75);
        const ox = x - cx * 9 - Math.floor(h * 2);
        const oy = y + (cx % 2) * 4 - cy * 8 - Math.floor(hash2(cx, cy, 76) * 2);
        if (ox < 0 || oy < 0 || ox > 7 || oy > 6) continue;
        bx.fillStyle = ox + oy <= 2 ? '#5B4A7A' : ox + oy >= 10 ? '#141028' : '#2A2440';
        if (ox + oy <= 1 && h > 0.6) bx.fillStyle = '#7A6A9A';
        bx.fillRect(x, y, 1, 1);
      }
    this.bank = b;
  }

  protected paintL0(ctx: CanvasRenderingContext2D, t: number): void {
    ctx.drawImage(gradientTexture(['#0B0B14', '#141028', '#1B1733', '#2A2440'], BG_H), 0, 0);
    ctx.drawImage(this.milky, 0, 6);
    ctx.fillStyle = '#FFF6D8';
    for (const s of this.stars) {
      ctx.globalAlpha = s.a * (0.55 + 0.45 * Math.sin(t * 0.9 + s.ph));
      ctx.fillRect(s.x, s.y, 1, 1);
    }
    ctx.globalAlpha = 1;
    drawLoop(ctx, this.far, t * 2, 22);
  }

  protected paintL1(ctx: CanvasRenderingContext2D, t: number): void {
    // the pool: a band of water between the banks, the sky in it (violet), the lantern's band on it
    const y0 = 58;
    const y1 = 118;
    for (let y = y0; y < y1; y++) {
      const k = (y - y0) / (y1 - y0);
      ctx.fillStyle = k < 0.1 ? '#2A2440' : k < 0.45 ? '#3A2B5C' : k < 0.8 ? '#2A2440' : '#1B1733';
      ctx.fillRect(0, y, 384, 1);
      // the milky way mirrored in it, a pale smear near the far bank
      if (k > 0.1 && k < 0.24) {
        ctx.fillStyle = '#5B4A7A';
        for (let x = 0; x < 384; x++) if (hash2(x >> 1, y, 80) < 0.35 - Math.abs(k - 0.17) * 3) ctx.fillRect(x, y, 1, 1);
      }
      // ripples: short pale dashes drifting toward us
      for (let i = 0; i < 7; i++) {
        const x = Math.round(((hash2(i, y, 77) * 384 + t * (6 + k * 10)) % 400) - 8);
        if (hash2(i, y, 78) < 0.3) {
          ctx.fillStyle = k < 0.5 ? '#7A6A9A' : '#5B4A7A';
          ctx.fillRect(x, y, 3 + Math.round(hash2(i, y, 79) * 4), 1);
        }
      }
    }
    // the one band of the tomato's light, lying on the water (51 15.1)
    const a = 0.45 * (1 + 0.1 * Math.sin(t * Math.PI * 2 * 0.8));
    ctx.save();
    ctx.globalAlpha = a;
    ctx.fillStyle = TOMATO;
    ctx.fillRect(0, 100, 384, 6);
    for (let x = 0; x < 384; x++) {
      if (BAYER4[98 & 3][x & 3] < 6) ctx.fillRect(x, 98, 1, 1);
      if (BAYER4[106 & 3][x & 3] < 6) ctx.fillRect(x, 106, 1, 1);
    }
    ctx.restore();
    // the valley's cedars close in from both sides
    ctx.drawImage(this.cedarL, 0, 0);
    ctx.drawImage(this.cedarR, 0, 0);
    // the near bank of wet stones
    ctx.drawImage(this.bank, 0, BG_H - 34);
    // behind the enemy: the dark lifted (a soft ellipse, #3A2B5C → #5B4A7A)
    const g = ctx.createRadialGradient(192, 92, 8, 192, 92, 90);
    g.addColorStop(0, 'rgba(91,74,122,0.55)');
    g.addColorStop(1, 'rgba(58,43,92,0)');
    ctx.fillStyle = g;
    ctx.fillRect(100, 40, 184, 104);
  }

  protected drawL2(g: Gfx, t: number): void {
    const ctx = g.ctx;
    // stars on the water: born upstream (the back, y62) and drifting down to the dam;
    // while it keeps watch they gather and circle, once it rests (閉場) they flow on out
    const rest = (this.flags.rest ?? 0) > 0;
    ctx.fillStyle = '#FFF6D8';
    for (let i = 0; i < 14; i++) {
      const born = i * 0.9;
      const age = ((t - born) % 12.6 + 12.6) % 12.6;
      let x = 60 + ((i * 97) % 264);
      let y = 64 + age * 3.2;
      if (!rest && y > 96) {
        // held at the dam: circling slowly
        const ang = age * 0.8 + i;
        x += Math.cos(ang) * 10;
        y = 96 + Math.sin(ang) * 3;
      }
      if (y > 118) continue;
      ctx.globalAlpha = 0.6 + 0.4 * Math.sin(t * 3 + i);
      ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
    }
    ctx.globalAlpha = 1;
  }
}
