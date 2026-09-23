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
const ALPHA = [1, 0.8, 0.55, 0.3];

const cache = new Map<number, HTMLCanvasElement>();

function hexA(a: number): string {
  return Math.round(Math.max(0, Math.min(1, a)) * 255).toString(16).padStart(2, '0');
}

/** Frame `i` (0..7) of the pulsing ring, 32×32. */
export function glowRing(i: number): HTMLCanvasElement {
  const k = ((i % GLOW_RING_FRAMES) + GLOW_RING_FRAMES) % GLOW_RING_FRAMES;
  let c = cache.get(k);
  if (c) return c;
  const p = new PixelCanvas(32, 32);
  const r = RADII[k % 4];
  const a = ALPHA[k % 4];
  for (let y = 0; y < 32; y++)
    for (let x = 0; x < 32; x++) {
      const d = Math.hypot(x + 0.5 - 16, y + 0.5 - 16);
      // the ring (1px, pixel-perfect circle) with a faint inner glow
      if (Math.abs(d - r) < 0.5) p.set(x, y, '#FFE7A3' + hexA(a));
      else if (Math.abs(d - (r - 1)) < 0.5) p.set(x, y, '#FFE7A3' + hexA(a * 0.35));
    }
  c = p.toCanvas();
  cache.set(k, c);
  return c;
}
