// Pictures the ending's cuts draw for themselves (50_ch2_story 10.16, 52 4.3・6.4):
//   feedCartImg()     the barn's feed cart, left standing in the aisle by
//                     マサルさん in cut 2a (the one he pushed: the handle to
//                     the west, toward him; the same cart as chars' 'feed')
//   sketchbookImg()   ソワカさん's sketchbook held up over her head as the
//                     bus leaves (cut 3): a big red hanamaru copied from
//                     Shun's stamp (00 1.1)
//   HANAMARU_9 / HANAMARU_7 / HANAMARU_CHALK   the hand-drawn hanamaru (a
//                     spiral inside eight petals) at 9 and 7 px, and the chalk
//                     one (9×8, petals and spiral) on ツガオ便's tailgate and
//                     エゴ's third card

import { PixelCanvas } from '../../engine/pixel';
import { P } from '../tiles/palette';

/** A hanamaru drawn by hand: the spiral, the petals round it (9×9). */
export const HANAMARU_9 = [
  '..#.#.#..',
  '.#######.',
  '##.....##',
  '.#.###.#.',
  '##.#.#.##',
  '.#.#..##.',
  '##..##..#',
  '.#######.',
  '..#.#.#..',
];
/** The same at 7×7 (a chalk mark, a card's picture). */
export const HANAMARU_7 = ['.#.#.#.', '#.###.#', '.#...#.', '.#.#.#.', '.#..##.', '#.###.#', '.#.#.#.'];
/**
 * The chalk one (9×8): ヒロスケさん's copy of Shun's stamp on ツガオ便's
 * tailgate, and the same mark on エゴ's third card. The scalloped ring of
 * petals (two over the top, two under, two each side) with the spiral inside
 * it (the stamp's hanamaruPath, its spiral cut to a turn and a quarter). At
 * 7×6 it was the spiral alone and read as a clump of white specks (QA
 * 2026-09-27): 9×8 is the least that keeps both the petals and the spiral.
 */
export const HANAMARU_CHALK = [
  '..##.##..',
  '.#..#..#.',
  '#.......#',
  '#..###..#',
  '.#.#.#.#.',
  '#..#..#.#',
  '.#..##.#.',
  '..##.##..',
];

/**
 * The feed cart standing on its own (16×13), the handle at the left: drawn
 * as chars' withCart draws it in front of マサルさん pushing east. Its
 * top-left goes at his feet +(2, −12) where he let go of it.
 */
export function feedCartImg(): HTMLCanvasElement {
  const p = new PixelCanvas(16, 13);
  // cart coordinates as withCart's (x 0..13, y 13..23), mirrored for pushing east
  const px = (x: number, y: number, c: string) => p.set(1 + (13 - x), 1 + (y - 13), c);
  const rect = (x0: number, y0: number, w: number, h: number, c: string) => {
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) px(x, y, c);
  };
  rect(0, 15, 12, 6, P.steel);
  for (let x = 0; x <= 11; x++) px(x, 15, P.concreteLt);
  for (let y = 16; y <= 20; y++) px(11, y, P.asphalt);
  for (let x = 0; x <= 11; x++) px(x, 20, P.asphalt);
  rect(1, 14, 10, 2, P.brassOld);
  for (const x of [2, 4, 5, 7, 9]) px(x, 14, '#C8A06A');
  px(3, 13, '#C8A06A');
  px(6, 13, P.brassOld);
  px(8, 13, '#E8D9B5');
  for (const cx of [2, 10]) {
    for (let y = 19; y <= 23; y++) for (let x = cx - 2; x <= cx + 2; x++) if (Math.abs(x - cx) + Math.abs(y - 21) <= 3) px(x, y, P.ink);
    px(cx, 21, P.steel);
    px(cx - 1, 22, P.charcoal);
  }
  px(11, 14, P.steel);
  px(12, 13, P.steel);
  px(13, 13, P.concrete);
  px(12, 14, P.white);
  px(12, 15, P.white);
  px(13, 14, P.white);
  px(12, 16, P.concreteLt);
  p.outline('#2A2440');
  return p.toCanvas();
}

/**
 * ソワカさん's sketchbook held up facing us (18×15): the steel rings along the
 * top, the white sheet, the navy cover's edge showing at the right and the
 * bottom, and on the sheet a big hanamaru in red paint (a darker red where
 * the brush lingered).
 */
export function sketchbookImg(): HTMLCanvasElement {
  const p = new PixelCanvas(18, 15);
  // the cover behind the sheet (its edge right and below)
  p.rect(2, 2, 15, 12, P.navy);
  p.vline(16, 3, 13, '#223668');
  p.hline(2, 16, 13, '#223668');
  // the sheet
  p.rect(1, 1, 15, 12, P.white);
  p.hline(1, 15, 12, P.concreteLt);
  p.vline(15, 1, 12, P.concreteLt);
  // a faint wash of a sky behind the mark (her paints: the morning's orange, a green hill)
  for (let x = 2; x <= 14; x++) if ((x * 7) % 5 === 0) p.set(x, 11, '#5FA85A');
  p.set(3, 10, '#5FA85A');
  p.set(13, 10, '#5FA85A');
  // the hanamaru, big, the brush a little heavy on the petals' tips
  HANAMARU_9.forEach((r, y) =>
    [...r].forEach((ch, x) => {
      if (ch !== '#') return;
      const heavy = (y === 0 || y === 8 || x === 0 || x === 8) && (x + y) % 3 === 0;
      p.set(4 + x, 2 + y, heavy ? P.vermShade : P.verm);
    }),
  );
  // the rings over the top edge
  for (let x = 2; x <= 14; x += 2) {
    p.set(x, 0, P.steel);
    p.set(x, 1, P.asphalt);
  }
  p.outline('#2A2440');
  return p.toCanvas();
}
