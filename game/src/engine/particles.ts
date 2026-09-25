// Lightweight pixel particle system. Each emitter owns its particles; draw
// them in screen or world space by passing an offset.

import type { Gfx } from './gfx';
import { rng } from './rng';

export type ParticleShape = 'px' | 'sq' | 'spark' | 'ring' | 'star' | 'img';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  ax: number;
  ay: number;
  drag: number;
  life: number;
  maxLife: number;
  size: number;
  sizeEnd: number;
  colors: string[];
  shape: ParticleShape;
  img?: CanvasImageSource & { width: number; height: number };
  spin?: number;
  angle?: number;
  /** Delay before becoming visible (ms). */
  delay?: number;
}

export interface BurstOpts {
  count: number;
  speed: [number, number];
  angle?: [number, number]; // radians
  life: [number, number]; // ms
  size?: [number, number];
  sizeEnd?: number;
  colors: string[];
  gravity?: number; // px/s^2
  drag?: number; // per second (0..)
  shape?: ParticleShape;
  spread?: number; // spawn radius
  img?: CanvasImageSource & { width: number; height: number };
  delay?: [number, number];
}

export class Particles {
  list: Particle[] = [];

  add(p: Partial<Particle> & { x: number; y: number }): Particle {
    const q: Particle = {
      vx: 0, vy: 0, ax: 0, ay: 0, drag: 0, life: 500, maxLife: 500, size: 1, sizeEnd: 1,
      colors: ['#fff'], shape: 'px', ...p,
    } as Particle;
    q.maxLife = p.maxLife ?? q.life;
    this.list.push(q);
    return q;
  }

  burst(x: number, y: number, o: BurstOpts): void {
    const [a0, a1] = o.angle ?? [0, Math.PI * 2];
    for (let i = 0; i < o.count; i++) {
      const a = a0 + rng.next() * (a1 - a0);
      const sp = o.speed[0] + rng.next() * (o.speed[1] - o.speed[0]);
      const life = o.life[0] + rng.next() * (o.life[1] - o.life[0]);
      const r = (o.spread ?? 0) * Math.sqrt(rng.next());
      const ra = rng.next() * Math.PI * 2;
      const size = o.size ? o.size[0] + rng.next() * (o.size[1] - o.size[0]) : 1;
      this.add({
        x: x + Math.cos(ra) * r,
        y: y + Math.sin(ra) * r,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        ay: o.gravity ?? 0,
        drag: o.drag ?? 0,
        life,
        maxLife: life,
        size,
        sizeEnd: o.sizeEnd ?? size,
        colors: o.colors,
        shape: o.shape ?? 'px',
        img: o.img,
        delay: o.delay ? o.delay[0] + rng.next() * (o.delay[1] - o.delay[0]) : 0,
        angle: rng.next() * Math.PI * 2,
        spin: (rng.next() - 0.5) * 10,
      });
    }
  }

  update(dt: number): void {
    const s = dt / 1000;
    for (const p of this.list) {
      if (p.delay && p.delay > 0) {
        p.delay -= dt;
        continue;
      }
      p.vx += p.ax * s;
      p.vy += p.ay * s;
      if (p.drag) {
        const k = Math.exp(-p.drag * s);
        p.vx *= k;
        p.vy *= k;
      }
      p.x += p.vx * s;
      p.y += p.vy * s;
      if (p.spin) p.angle = (p.angle ?? 0) + p.spin * s;
      p.life -= dt;
    }
    this.list = this.list.filter((p) => p.life > 0);
  }

  draw(g: Gfx, ox = 0, oy = 0): void {
    const c = g.ctx;
    for (const p of this.list) {
      if (p.delay && p.delay > 0) continue;
      const t = 1 - p.life / p.maxLife; // 0 → 1
      const col = p.colors[Math.min(p.colors.length - 1, Math.floor(t * p.colors.length))];
      const size = Math.max(1, Math.round(p.size + (p.sizeEnd - p.size) * t));
      const x = Math.round(p.x + ox);
      const y = Math.round(p.y + oy);
      c.fillStyle = col;
      switch (p.shape) {
        case 'px':
          c.fillRect(x, y, 1, 1);
          break;
        case 'sq':
          c.fillRect(x - (size >> 1), y - (size >> 1), size, size);
          break;
        case 'spark': {
          const len = Math.max(1, Math.round(Math.hypot(p.vx, p.vy) / 40));
          const nx = p.vx / (Math.hypot(p.vx, p.vy) || 1);
          const ny = p.vy / (Math.hypot(p.vx, p.vy) || 1);
          for (let i = 0; i < len; i++) c.fillRect(Math.round(x - nx * i), Math.round(y - ny * i), 1, 1);
          break;
        }
        case 'ring':
          g.ring(x, y, size, col);
          break;
        case 'star':
          c.fillRect(x - size, y, size * 2 + 1, 1);
          c.fillRect(x, y - size, 1, size * 2 + 1);
          break;
        case 'img':
          if (p.img) c.drawImage(p.img, x - (p.img.width >> 1), y - (p.img.height >> 1));
          break;
      }
    }
  }

  clear(): void {
    this.list = [];
  }
}
