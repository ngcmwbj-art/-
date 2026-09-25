// bg_mall_floor (17.6): a closed mall seen in perspective — dark ceiling with
// rows of flickering fluorescent tubes, the skylight's sunset line at the
// horizon, a tiled floor flowing toward the camera. Soujirou: dust bunnies
// rolling. Momisugi: slow massage-ball rings.

import type { Gfx } from '../../engine/gfx';
import { hash2, valueNoise } from '../../engine/rng';
import { Background, BG_H } from './common';

const HOR = 80;

function rgb(c: string): [number, number, number] {
  const v = parseInt(c.slice(1), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}

const CEIL = rgb('#2A2440');
const CEIL2 = rgb('#3A2B5C');
const TUBE_ON = rgb('#F4E6A8');
const TUBE_OFF = rgb('#5B4A7A');
const FLOOR = rgb('#6B7186');
const LINE = rgb('#9AA0A8');
const SUN = rgb('#F2894B');

export class MallBg extends Background {
  private variant: 'souji' | 'momi' | 'plain';
  private img: ImageData;
  private dust: { x: number; z: number; ph: number }[] = [];

  constructor(enemyId: string) {
    super('bg_mall_floor');
    this.variant = enemyId === 'enemy_soujirou' ? 'souji' : enemyId === 'enemy_momisugi' ? 'momi' : 'plain';
    this.wave = { A: 1, lambda: 48, f: 0.2, A2: 0, lambda2: 40, f2: 0.3, interlace: false };
    this.bottom = '#2A2440';
    this.img = new ImageData(384, BG_H);
    for (let i = 0; i < 5; i++) this.dust.push({ x: Math.random() * 384, z: Math.random(), ph: Math.random() * 6 });
  }

  protected paintL0(ctx: CanvasRenderingContext2D, t: number): void {
    const d = this.img.data;
    const scroll = t * 1.0; // 1 tile / s toward the camera
    const jitter = this.t % 6 < 0.1 ? 1 : 0;
    for (let y = 0; y < BG_H; y++) {
      const sy = y - jitter;
      for (let x = 0; x < 384; x++) {
        let r: number, g: number, b: number;
        if (sy < HOR - 4) {
          // drop ceiling in perspective: tile grid + recessed fluorescent panels
          // (every other column, flickering on their own), flowing with the floor
          // (the band hides y<48, so the visible strip gets a gentle perspective)
          const z = 12 / Math.max(1, HOR - sy);
          const u = ((x - 192) * z) / 14;
          const v = z * 1.6 + scroll;
          const cu = Math.floor(u);
          const cv = Math.floor(v);
          const fu = u - cu;
          const fv = v - cv;
          const lw = 0.04 + z * 0.004;
          let c: [number, number, number] = mix3(CEIL, CEIL2, Math.max(0, Math.min(1, (sy - 6) / 70)));
          if (fu < lw || fv < lw * 1.6) c = mix3(c, TUBE_OFF, 0.55);
          const fixture = (cu & 1) === 0 && Math.abs(cu) <= 6;
          if (fixture && fu > 0.28 && fu < 0.72 && fv > 0.18 && fv < 0.82) {
            const tubeId = cu * 97 + cv;
            const dead = hash2(tubeId, 5, 9) < 0.18;
            const on = !dead && (valueNoise(this.t * 6, tubeId, 3) > 0.22 || hash2(tubeId, 1, 2) > 0.45);
            const edge = fu < 0.33 || fu > 0.67 || fv < 0.24 || fv > 0.76;
            c = on ? (edge ? mix3(TUBE_ON, CEIL2, 0.35) : TUBE_ON) : edge ? CEIL2 : TUBE_OFF;
          } else if (fixture && fu > 0.2 && fu < 0.8 && fv > 0.1 && fv < 0.9) {
            // soft glow spilling round a lit panel
            const tubeId = cu * 97 + cv;
            if (hash2(tubeId, 5, 9) >= 0.18) c = mix3(c, TUBE_ON, 0.12);
          }
          // haze toward the horizon
          [r, g, b] = mix3(c, CEIL2, Math.max(0, Math.min(0.7, 1 - (HOR - sy) / 30)));
        } else if (sy < HOR + 4) {
          // skylight sunset line
          const k = 1 - Math.abs(sy - HOR) / 4;
          const base = mix3(CEIL2, FLOOR, 0.5);
          [r, g, b] = mix3(base, SUN, 0.3 * k + 0.1);
        } else {
          // floor
          const z = 30 / (sy - HOR + 2);
          const u = ((x - 192) * z) / 10;
          const v = z + scroll;
          const fu = u - Math.floor(u);
          const fv = v - Math.floor(v);
          const n = (hash2(Math.floor(u), Math.floor(v), 7) - 0.5) * 0.08;
          let c = FLOOR.map((q) => q * (1 + n)) as [number, number, number];
          const lw = 0.045 + z * 0.004;
          if (fu < lw || fv < lw * 1.6) c = LINE;
          // fluorescent reflections: pale streaks below each tube column
          const refl = Math.abs(u / 1.4 - Math.round(u / 1.4));
          if (refl < 0.05 && Math.abs(Math.round(u / 1.4)) <= 3) c = mix3(c, TUBE_ON, 0.35 * Math.min(1, (sy - HOR) / 50));
          // fade toward the horizon
          c = mix3(c, CEIL2, Math.max(0, 0.6 - (sy - HOR) / 40));
          [r, g, b] = c;
        }
        const i = (y * 384 + x) * 4;
        d[i] = r;
        d[i + 1] = g;
        d[i + 2] = b;
        d[i + 3] = 255;
      }
    }
    ctx.putImageData(this.img, 0, 0);
  }

  protected paintL1(ctx: CanvasRenderingContext2D, t: number): void {
    if (this.variant === 'momi') {
      // concentric massage-ball rings pulsing
      ctx.globalAlpha = 0.2;
      ctx.fillStyle = '#8A4A3E';
      const pulse = (t * 14) % 24;
      for (let r = pulse + 10; r < 240; r += 24) {
        const n = Math.ceil(r * 6);
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2;
          const x = Math.round(192 + Math.cos(a) * r);
          const y = Math.round(112 + Math.sin(a) * r * 0.45);
          ctx.fillRect(x, y, 2, 2);
        }
      }
      ctx.globalAlpha = 1;
    }
  }

  protected updateL2(dt: number): void {
    for (const d of this.dust) {
      d.z += dt / 4000;
      d.x += Math.sin(this.t + d.ph) * 0.2;
      if (d.z > 1) {
        d.z = 0;
        d.x = Math.random() * 384;
      }
    }
  }

  protected drawL2(g: Gfx): void {
    if (this.variant !== 'souji') return;
    const ctx = g.ctx;
    for (const d of this.dust) {
      const y = Math.round(HOR + 6 + d.z * 62);
      const x = Math.round(192 + (d.x - 192) * (0.4 + d.z));
      const roll = Math.floor(this.t * 8 + d.ph) % 2;
      ctx.fillStyle = '#6B7186';
      ctx.fillRect(x, y + 2, 3, 1);
      ctx.fillStyle = '#9AA0A8';
      ctx.fillRect(x, y, 3, 2);
      ctx.fillStyle = '#C8C2B4';
      ctx.fillRect(x + roll, y, 1, 1);
    }
  }
}

function mix3(a: number[], b: number[], t: number): [number, number, number] {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}
