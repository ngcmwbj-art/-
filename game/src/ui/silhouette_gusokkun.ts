// グソっ君 from behind as a one-colour silhouette (★2026-09-29 カネナリくん→グソっ君):
// the title screen's bridge (title_art.ts) and chapter 2's sunrise over the
// east fence (cut_sunrise.ts) show him the same way, beside Minato. The
// armour's saw-tooth sides tell the seven plates even without detail, the
// feelers rise off the head, and the fan tail hangs behind him like a cape.
//
//   gusokkunSilhouette(p, kx, fy, col)   // kx = his centre, fy = the row under his feet

import type { PixelCanvas } from '../engine/pixel';

/** Where the top of his shell catches the light (the title's glint every 4 s), relative to (kx, fy). */
export const GUSOKKUN_GLINT = { dx: -5, dy: -36 };

export function gusokkunSilhouette(p: PixelCanvas, kx: number, fy: number, col: string): void {
  const set = (x: number, y: number) => p.set(Math.round(x), Math.round(y), col);
  const ell = (cx: number, cy: number, rx: number, ry: number) => {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x + 0.5 - cx) / rx;
        const dy = (y + 0.5 - cy) / ry;
        if (dx * dx + dy * dy <= 1) set(x, y);
      }
  };
  // feet under the fan
  for (let x = kx - 8; x < kx - 2; x++) for (let y = fy - 4; y < fy; y++) set(x, y);
  for (let x = kx + 3; x < kx + 9; x++) for (let y = fy - 4; y < fy; y++) set(x, y);
  // the fan tail: a cape widening to its fringed hem
  for (let y = fy - 14; y <= fy - 4; y++) {
    const k = (y - (fy - 14)) / 10;
    const hw = Math.round(7 + k * 6);
    for (let x = kx - hw; x <= kx + hw; x++) {
      // the hem's fringe: every third pixel of the last row missing
      if (y === fy - 4 && (x - kx + 30) % 3 === 0) continue;
      set(x, y);
    }
  }
  // the armour: seven plates stacked like trapezoids, each one a pixel wider
  // at its lower edge than the next one's top (the saw-tooth sides), and
  // over it the top of his head
  for (let k = 0; k < 7; k++) {
    const y0 = fy - 31 + k * 3;
    for (let j = 0; j < 3; j++) {
      const y = y0 + j;
      const u = (y + 0.5 - (fy - 20)) / 11.5;
      const hw = Math.round(12 * Math.sqrt(Math.max(0, 1 - u * u))) - 1 + j;
      for (let x = kx - hw; x <= kx + hw; x++) set(x, y);
    }
  }
  ell(kx, fy - 32, 8.5, 6.5);
  // arms at his sides
  for (let y = fy - 23; y <= fy - 15; y++) {
    set(kx - 13, y);
    set(kx + 13, y);
  }
  for (const s of [-1, 1]) for (let y = fy - 16; y <= fy - 14; y++) for (let i = 0; i < 2; i++) set(kx + s * (13 + i), y);
  // the long feelers, rising and curling out; the short ones between them
  const feel: [number, number][] = [[-3, -38], [-4, -40], [-5, -42], [-7, -44], [-9, -45], [-11, -45], [-13, -44], [-14, -43]];
  for (const [dx, dy] of feel) {
    set(kx + dx, fy + dy);
    set(kx - dx, fy + dy);
  }
  set(kx - 1, fy - 39);
  set(kx - 2, fy - 40);
  set(kx + 1, fy - 39);
  set(kx + 2, fy - 40);
}
