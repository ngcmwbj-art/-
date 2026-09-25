// Shared scenery for the chapter-2 battle backdrops (51 15章): the far
// ridges and cedar lines of the mountain village, cached once as tiles that
// loop every 384px (so a drifting layer never shows a seam).

import { BAYER4, makeCanvas } from '../../engine/pixel';
import { hash2 } from '../../engine/rng';

/** A height that loops every 384px: base + Σ a·sin(2π·k·x/384 + φ). */
export function loopHeight(x: number, base: number, waves: [number, number, number][]): number {
  let h = base;
  for (const [a, k, ph] of waves) h += a * Math.sin((2 * Math.PI * k * x) / 384 + ph);
  return h;
}

const tileCache = new Map<string, HTMLCanvasElement>();

/**
 * A mountain ridge (384 × h tile): solid `color` below the line, a 1px
 * starlight rim on its crest (`rim`, α given), cedars standing on it here
 * and there (`trees` 0–1 density). The line's top is `top(x)` inside the tile.
 */
export function ridgeTile(
  key: string,
  h: number,
  top: (x: number) => number,
  color: string,
  o: { rim?: string; rimA?: number; trees?: number; treeH?: number; seed?: number; shade?: string; canopy?: string } = {},
): HTMLCanvasElement {
  const k = `ridge:${key}`;
  const hit = tileCache.get(k);
  if (hit) return hit;
  const [c, ctx] = makeCanvas(384, h);
  const seed = o.seed ?? 1;
  const tops: number[] = [];
  for (let x = 0; x < 384; x++) tops.push(Math.round(top(x)));
  // cedars: narrow jagged triangles on the crest (drawn first, the same colour)
  const treeTop = new Array<number>(384).fill(999);
  if (o.trees) {
    for (let x = 0; x < 384; x++) {
      if (hash2(x, 3, seed) > o.trees) continue;
      const th = Math.round((o.treeH ?? 10) * (0.6 + 0.6 * hash2(x, 4, seed)));
      const hw = Math.max(2, Math.round(th * 0.28));
      for (let dy = 0; dy < th; dy++) {
        const w = Math.round((dy / th) * hw + (dy % 3 === 2 ? 1 : 0));
        for (let dx = -w; dx <= w; dx++) {
          const xx = (x + dx + 384) % 384;
          treeTop[xx] = Math.min(treeTop[xx], tops[x] - th + dy + 1);
        }
      }
    }
  }
  ctx.fillStyle = color;
  for (let x = 0; x < 384; x++) {
    const y0 = Math.min(tops[x], treeTop[x]);
    ctx.fillRect(x, y0, 1, h - y0);
  }
  if (o.shade) {
    // the far side of each fold a shade darker (dithered)
    ctx.fillStyle = o.shade;
    for (let x = 0; x < 384; x++) {
      const slope = tops[(x + 1) % 384] - tops[x];
      if (slope <= 0) continue;
      for (let y = tops[x] + 1; y < Math.min(h, tops[x] + 10); y++) if (BAYER4[y & 3][x & 3] < 8) ctx.fillRect(x, y, 1, 1);
    }
  }
  if (o.canopy) {
    // the forest's depth: rounded crowns catching a little starlight inside the mass
    ctx.fillStyle = o.canopy;
    for (let x = 0; x < 384; x += 3) {
      for (let row = 0; row < 4; row++) {
        if (hash2(x, row, seed + 5) > 0.45) continue;
        const cy = tops[x] + 5 + row * 7 + Math.floor(hash2(x, row, seed + 6) * 4);
        if (cy >= h - 1) continue;
        const w = 3 + Math.floor(hash2(x, row, seed + 7) * 3);
        ctx.fillRect(x - (w >> 1) + 1, cy, w - 2, 1);
        ctx.fillRect(x - (w >> 1), cy + 1, 1, 1);
        ctx.fillRect(x + (w >> 1), cy + 1, 1, 1);
      }
    }
  }
  if (o.rim) {
    ctx.fillStyle = o.rim;
    ctx.globalAlpha = o.rimA ?? 0.6;
    for (let x = 0; x < 384; x++) {
      const y0 = Math.min(tops[x], treeTop[x]);
      // light from above: only the tops that face up get the rim
      const l = Math.min(tops[(x + 383) % 384], treeTop[(x + 383) % 384]);
      const r = Math.min(tops[(x + 1) % 384], treeTop[(x + 1) % 384]);
      if (y0 <= l + 1 && y0 <= r + 1) ctx.fillRect(x, y0, 1, 1);
    }
    ctx.globalAlpha = 1;
  }
  tileCache.set(k, c);
  return c;
}

/** Draw a 384-wide tile at x offset `off` (wrapping) and y. */
export function drawLoop(ctx: CanvasRenderingContext2D, tile: HTMLCanvasElement, off: number, y: number): void {
  const x = ((Math.round(off) % 384) + 384) % 384;
  ctx.drawImage(tile, x - 384, y);
  ctx.drawImage(tile, x, y);
}

/**
 * Grass tufts along a line (a 384 × h tile, bottom-aligned): thin blades in
 * `color`, some with a head (susuki / rice ears) in `head`.
 */
export function tuftTile(key: string, h: number, density: number, color: string, head: string | null, seed = 7): HTMLCanvasElement {
  const k = `tuft:${key}`;
  const hit = tileCache.get(k);
  if (hit) return hit;
  const [c, ctx] = makeCanvas(384, h);
  for (let x = 0; x < 384; x++) {
    if (hash2(x, 1, seed) > density) continue;
    const bh = Math.round(h * (0.35 + 0.65 * hash2(x, 2, seed)));
    const lean = hash2(x, 5, seed) < 0.5 ? -1 : 1;
    ctx.fillStyle = color;
    for (let y = 0; y < bh; y++) {
      const dx = y > bh * 0.6 ? lean * Math.round((y - bh * 0.6) / 3) : 0;
      ctx.fillRect((x + dx + 384) % 384, h - 1 - y, 1, 1);
    }
    if (head && hash2(x, 6, seed) < 0.45) {
      // a drooping plume at the tip (susuki just heading out, rice ears)
      const tx = (x + lean * Math.round((bh * 0.4) / 3) + 384) % 384;
      ctx.fillStyle = head;
      ctx.fillRect(tx, h - bh, 1, 3);
      ctx.fillRect((tx + lean + 384) % 384, h - bh + 1, 1, 3);
      if (hash2(x, 8, seed) < 0.5) ctx.fillRect((tx + 2 * lean + 384) % 384, h - bh + 3, 1, 1);
    }
  }
  tileCache.set(k, c);
  return c;
}
