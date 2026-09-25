// Kanenari's bell glow ring (30_level_art 9.2: "a #FFE7A3 1px ring pulses
// around the bell twice"). A separate 32×32 overlay so the ring can travel
// well past the 20×26 field sprite. Frames 0–3 are one pulse (radius 8 → 14,
// fading), 4–7 the second. Draw it centred on the bell:
//   centre = (feetX, feetY + GLOW_CENTER_DY)   → top-left = centre − 16.
// The field anim 'glow' already has it composited in (32×34 frames).

import { PixelCanvas } from '../../engine/pixel';

export const GLOW_RING_FRAMES = 8;
/** Bell centre relative to the feet anchor (px). */
export const GLOW_CENTER_DY = -18;

const RADII = [8, 10, 12, 14];
/**
 * How much of each ring is lit as it travels out: the fade is drawn with the
 * pixel pattern (every pixel → 3 of 4 → every other → every third), never
 * with alpha, so the ring stays the one color #FFE7A3 wherever it is drawn
 * (over the ground or composited behind the sprite).
 */
const KEEP = [1, 0.75, 0.5, 0.34];

const cache = new Map<number, HTMLCanvasElement>();

/** Frame `i` (0..7) of the pulsing ring, 32×32. */
export function glowRing(i: number): HTMLCanvasElement {
  const k = ((i % GLOW_RING_FRAMES) + GLOW_RING_FRAMES) % GLOW_RING_FRAMES;
  let c = cache.get(k);
  if (c) return c;
  const p = new PixelCanvas(32, 32);
  const r = RADII[k % 4];
  const keep = KEEP[k % 4];
  // ring pixels in order around the circle, so the pattern is even
  const ring: [number, number, number][] = [];
  for (let y = 0; y < 32; y++)
    for (let x = 0; x < 32; x++) {
      const d = Math.hypot(x + 0.5 - 16, y + 0.5 - 16);
      if (Math.abs(d - r) < 0.5) ring.push([x, y, Math.atan2(y + 0.5 - 16, x + 0.5 - 16)]);
    }
  ring.sort((a, b) => a[2] - b[2]);
  let acc = 0;
  for (const [x, y] of ring) {
    acc += keep;
    if (acc >= 1 - 1e-6) {
      acc -= 1;
      p.set(x, y, '#FFE7A3');
    }
  }
  // the first, brightest ring gets a sparse inner glow (every 4th pixel)
  if (k % 4 === 0)
    for (let y = 0; y < 32; y++)
      for (let x = 0; x < 32; x++) {
        const d = Math.hypot(x + 0.5 - 16, y + 0.5 - 16);
        if (Math.abs(d - (r - 1)) < 0.5 && (x + y * 3) % 4 === 0) p.set(x, y, '#FFE7A3');
      }
  c = p.toCanvas();
  cache.set(k, c);
  return c;
}
