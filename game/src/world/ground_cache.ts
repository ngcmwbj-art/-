// Static ground baked per 256×256 chunk (lazily, on first sight).
import { bakeGround, type GroundSource } from '../art/tiles/ground';
import { strSeed } from '../art/tiles/noise';
import type { Gfx } from '../engine/gfx';
import { groundAt, type LoadedMap } from './maps';
import type { Ground } from './types';

export const CHUNK = 256;

export class GroundCache {
  private chunks = new Map<number, HTMLCanvasElement>();
  readonly src: GroundSource;
  constructor(readonly map: LoadedMap) {
    const zones = map.def.zones ?? [];
    const theme = (tx: number, ty: number): string => {
      for (const z of zones) if (tx >= z.x && ty >= z.y && tx < z.x + z.w && ty < z.y + z.h) return z.id;
      return map.def.theme ?? '';
    };
    this.src = {
      w: map.w,
      h: map.h,
      seed: strSeed(map.id) & 0xffff,
      theme,
      ground: (tx, ty): Ground => {
        const g = groundAt(map, tx, ty);
        if (g === 'sidewalk' && theme(tx, ty) === 'park') return 'plaza';
        return g;
      },
    };
  }

  chunk(cx: number, cy: number): HTMLCanvasElement {
    const key = cy * 1000 + cx;
    let c = this.chunks.get(key);
    if (!c) {
      const w = Math.min(CHUNK, this.map.w * 16 - cx * CHUNK);
      const h = Math.min(CHUNK, this.map.h * 16 - cy * CHUNK);
      c = bakeGround(this.src, cx * CHUNK, cy * CHUNK, w, h).toCanvas();
      this.chunks.set(key, c);
    }
    return c;
  }

  draw(g: Gfx, camX: number, camY: number, vw: number, vh: number): void {
    const x0 = Math.max(0, Math.floor(camX / CHUNK));
    const y0 = Math.max(0, Math.floor(camY / CHUNK));
    const x1 = Math.min(Math.ceil((this.map.w * 16) / CHUNK) - 1, Math.floor((camX + vw) / CHUNK));
    const y1 = Math.min(Math.ceil((this.map.h * 16) / CHUNK) - 1, Math.floor((camY + vh) / CHUNK));
    for (let cy = y0; cy <= y1; cy++)
      for (let cx = x0; cx <= x1; cx++) g.img(this.chunk(cx, cy), cx * CHUNK - camX, cy * CHUNK - camY);
  }

  /** Bake everything now (avoids hitches later). */
  warm(): void {
    const nx = Math.ceil((this.map.w * 16) / CHUNK);
    const ny = Math.ceil((this.map.h * 16) / CHUNK);
    for (let cy = 0; cy < ny; cy++) for (let cx = 0; cx < nx; cx++) this.chunk(cx, cy);
  }
}
