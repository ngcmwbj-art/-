// After the clear (05_postgame 10.2): the secret ending's things on the park's bench.
//
//   prop_pg_yakisoba   たかしの 店's yakisoba in its clear pack, a rubber band round it, on the bench
//                      under the clock tower (グソっ君 hands it to ツガオ: 「……出来たてや。」)

import { PixelCanvas } from '../../engine/pixel';
import { registerProp } from './registry';
import type { PropArt } from './types';

/** The pack (12×7): the clear lid's sheen, the noodles, 紅しょうが and 青のり, the rubber band. */
export function yakisobaPack(): HTMLCanvasElement {
  const p = new PixelCanvas(12, 7);
  // the tray (white foam) and the clear lid's rim
  p.rect(0, 2, 12, 5, '#E8E4D8');
  p.hline(0, 11, 6, '#B8B4A8');
  p.rect(1, 1, 10, 4, '#C8A06A');
  // the noodles' strands, a little sauce-dark
  for (let x = 1; x < 11; x += 2) p.vline(x, 1, 4, '#A87A4A');
  // 紅しょうが, 青のり
  p.set(3, 2, '#E23B2E');
  p.set(4, 2, '#E23B2E');
  p.set(7, 3, '#5A8A3A');
  p.set(8, 1, '#5A8A3A');
  // the lid's sheen and the rubber band across
  p.hline(1, 10, 0, '#F4F1E8');
  p.set(2, 1, '#FFFFFF');
  p.vline(6, 0, 6, '#E8705A');
  return p.toCanvas();
}

registerProp('prop_pg_yakisoba', () => {
  const img = yakisobaPack();
  // on the bench's seat (prop_park_bench at the same tile: its seat ~9 px over its foot), at its left half
  return { ox: -6, oy: 16 - 9 - 7, w: 12, h: 7, foot: 17, img: () => img } satisfies PropArt;
});
