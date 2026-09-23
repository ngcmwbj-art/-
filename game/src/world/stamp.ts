// 『みました』 stamp on a fushigi (10_narrative 8.0 / 30_level_art 10.9):
// a 24×16 vermilion oval seal pressed onto the target in 0.4s (1.25→1.0,
// 1px shake), left for 1s, then faded.

import type { Co } from '../engine/co';
import { game } from '../engine/game';
import { PixelCanvas } from '../engine/pixel';
import { P } from '../art/tiles/palette';
import { field } from './field';
import { registerWorldFx } from './fx';
import { ihash } from '../art/tiles/noise';

// tiny hand-drawn kana (4×6): み ま し た
const KANA: string[][] = [
  ['1110', '0010', '0110', '1011', '1010', '0101'],
  ['1111', '0100', '1111', '0100', '1110', '1101'],
  ['1000', '1000', '1000', '1000', '1001', '0110'],
  ['0100', '1111', '0100', '0111', '0100', '0111'],
];

let seal: HTMLCanvasElement | null = null;
export function sealImg(): HTMLCanvasElement {
  if (seal) return seal;
  const p = new PixelCanvas(24, 16);
  p.ring(12, 8, 11.5, 7.5, P.verm);
  p.ring(12, 8, 10.5, 6.5, P.verm);
  KANA.forEach((g, i) => {
    for (let y = 0; y < 6; y++) for (let x = 0; x < 4; x++) if (g[y][x] === '1') p.set(3 + i * 5 + x, 5 + y, P.verm);
  });
  // かすれ: knock out ~4% of the ink at fixed spots
  for (let y = 0; y < 16; y++)
    for (let x = 0; x < 24; x++) if (p.alpha(x, y) && ihash(x, y, 42) % 23 === 0) p.set(x, y, 'transparent');
  seal = p.toCanvas();
  return seal;
}

interface Active {
  x: number;
  y: number;
  t: number;
}
const active: Active[] = [];

registerWorldFx({
  map: '',
  update(_f, dt) {
    for (const a of active) a.t += dt;
    while (active.length && active[0].t > 1800) active.shift();
  },
  draw(_f, g, cx, cy, layer) {
    if (layer !== 'top') return;
    const img = sealImg();
    for (const a of active) {
      let scale = 1;
      let alpha = 1;
      if (a.t < 100) scale = 1.25 - (a.t / 100) * 0.25;
      if (a.t > 1400) alpha = Math.max(0, 1 - (a.t - 1400) / 400);
      const shake = a.t < 180 ? (Math.floor(a.t / 30) % 2 ? 1 : -1) : 0;
      const w = Math.round(24 * scale);
      const h = Math.round(16 * scale);
      g.ctx.save();
      g.ctx.globalAlpha = alpha;
      g.ctx.drawImage(img, Math.round(a.x - cx - w / 2 + shake), Math.round(a.y - cy - h / 2), w, h);
      g.ctx.restore();
    }
  },
});

/** Press the seal on the fushigi `id` (waits ~0.4s). */
export function* stampFx(id: string): Co {
  const f = field();
  if (!f) return;
  const spot = f.fushigiSpots().find((s) => s.id === id);
  const x = spot?.x ?? f.player.x;
  const y = (spot?.y ?? f.player.y - 24) - 6;
  active.push({ x, y, t: 0 });
  game.shake(1, 120);
  yield 400;
}
