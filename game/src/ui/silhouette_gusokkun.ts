// グソっ君 from behind as a one-colour silhouette (★2026-09-29 カネナリくん→グソっ君,
// ★2026-10-08 依頼主の手本の絵に合わせて 描き直し): the title screen's bridge
// (title_art.ts) and chapter 2's sunrise over the east fence (cut_sunrise.ts)
// show him the same way, beside Minato. A big round head turned a little
// toward Minato (on his left), the headband standing out round it as a ridge
// with its ends, the little ear plates, one long tusk hanging under his face,
// the plates poking out at his sides like scales, the pincers at his sides
// and the ribbed fan tail behind.
//
//   gusokkunSilhouette(p, kx, fy, col)   // kx = his centre, fy = the row under his feet

import type { PixelCanvas } from '../engine/pixel';

/** Where the top of his head catches the light (the title's glint every 4 s), relative to (kx, fy). */
export const GUSOKKUN_GLINT = { dx: -5, dy: -39 };

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
  // three-toed feet under the fan
  for (const fx of [kx - 6, kx + 5]) {
    for (let x = fx - 3; x <= fx + 3; x++) for (let y = fy - 4; y < fy - 1; y++) set(x, y);
    for (const t of [-3, 0, 3]) set(fx + t, fy - 1);
  }
  // the fan tail: widening to its hem, the ribs' ends notching it
  for (let y = fy - 14; y <= fy - 4; y++) {
    const k = (y - (fy - 14)) / 10;
    const hw = Math.round(7 + k * 5);
    for (let x = kx - hw; x <= kx + hw; x++) {
      if (y === fy - 4 && (x - kx + 30) % 3 === 0) continue;
      set(x, y);
    }
  }
  // the body: a round egg, and at both sides the plates poking out like scales
  ell(kx, fy - 21, 11.5, 11);
  for (let k = 1; k < 5; k++) {
    const y = fy - 29 + k * 4;
    for (const s of [-1, 1]) {
      for (let i = 0; i < 2; i++) set(kx + s * (11 + i), y + i);
      set(kx + s * 11, y + 2);
    }
  }
  // arms down his sides (inside the outline), only the open pincers poke out
  for (const s of [-1, 1]) {
    set(kx + s * 12, fy - 13);
    set(kx + s * 13, fy - 14);
    set(kx + s * 14, fy - 15);
    set(kx + s * 14, fy - 13);
    set(kx + s * 15, fy - 12);
  }
  // the head, turned a little toward Minato: the ear plates, then the bun
  const hx = kx - 2;
  const hy = fy - 33;
  for (const s of [-1, 1]) {
    for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) set(hx + s * (10 + i), hy + i + j);
  }
  // the bun, a pixel narrower just above and below the headband, so the
  // band stands proud of it all round like a ridge
  for (let y = Math.floor(hy - 8); y <= Math.ceil(hy + 8); y++) {
    const u = (y + 0.5 - hy) / 8;
    if (Math.abs(u) > 1) continue;
    const band = y >= hy - 5 && y <= hy - 3;
    const next = y === hy - 6 || y === hy - 2;
    const hw = Math.round(10 * Math.sqrt(1 - u * u)) + (band ? 1 : next ? -2 : 0);
    for (let x = hx - hw; x <= hx + hw; x++) set(x, y);
  }
  // one long tusk hanging under his face (turned to the left), splaying out past his side
  for (const [dx, dy] of [[-8, 6], [-9, 7], [-10, 8], [-11, 9], [-12, 10], [-12, 11], [-13, 12], [-13, 13], [-13, 14]] as [number, number][]) set(hx + dx, hy + dy);
}
