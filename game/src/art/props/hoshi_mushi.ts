// 捕まえない自由研究 (50_ch2_story 10.21, 52_ch2_level_art 7.5, 02_ch2_index #64):
// the night insects of 星見台 at the end of August, seen — not caught — in the
// tomato's light. Five that sing (53 1.6) and one that doesn't:
//
//   kantan   カンタン       a pale green tree cricket on a ヨモギ leaf by the
//                           paddies' stone steps; its broad clear wings held up
//   enma     エンマコオロギ the big black field cricket in the dry-stone wall's
//                           foot; the pale "eyebrows" that give it its name
//   kutsuwa  クツワムシ     the stout green katydid on a クズ leaf in the thicket
//   umaoi    ウマオイ       the slender green katydid with the brown stripe down
//                           its back, in the grass at the school cherry's foot
//   suzu     スズムシ       the black bell cricket in ぴょん夫人's rearing case,
//                           with its slice of eggplant
//   kabuto   カブトムシ     (a bonus, not counted) at the クヌギ's sap by the
//                           mouth of the hill path
//
// In the field each is a few pixels on its host plant (prop_h_mushi, litOnly:
// only the lantern shows it); the host plants are ordinary props. Examined,
// it comes up close in a round "loupe" of warm lantern light (mushiLoupe(),
// 76×76: the 36×28 close-up at 2×), two frames while it sings. The notebook's
// page draws it again as しゅん's pencil sketch (mushiSketch()).
//
// Nothing here is frightening (53 1.7): round eyes, soft colours, no fangs.
// Painted in daylight colours like every prop; the grade does the night.

import { mix, PixelCanvas } from '../../engine/pixel';
import { ihash } from '../tiles/noise';
import { P } from '../tiles/palette';
import { standProp } from './hoshi_kit';
import { registerProp } from './registry';
import type { PropArt, PropEnv } from './types';

export type MushiKind = 'kantan' | 'enma' | 'kutsuwa' | 'umaoi' | 'suzu' | 'kabuto';

/** The five that are counted, in the notebook's order. */
export const MUSHI5: MushiKind[] = ['kantan', 'enma', 'kutsuwa', 'umaoi', 'suzu'];

export const CLOSE_W = 36;
export const CLOSE_H = 28;

// ---------------------------------------------------------------- colours

const C = {
  // カンタン (pale: it is the colour of the grass, but lighter than this leaf)
  kGreen: '#DDF2AE',
  kShade: '#B2D084',
  kLight: '#F6FCDC',
  kWing: '#C9DCB2',
  kVein: '#EEF8D8',
  kEye: '#55663A',
  kThin: '#D8ECAA',
  // ヨモギ (grey-green above, felted white below)
  yomo: '#6A8762',
  yomoLt: '#8AA27E',
  yomoUnder: '#C2D0B8',
  yomoVein: '#4E6A48',
  // エンマコオロギ
  eBlack: '#2B201B',
  eGloss: '#6A5040',
  eShine: '#BFA286',
  eBrow: '#E8D29C',
  eLeg: '#3E2C22',
  eWing: '#4A382C',
  eWingLt: '#6A5242',
  // stone and soil, lit by the lantern
  stone: '#B2B0A8',
  stoneLt: '#D2D0C8',
  stoneDk: '#8A8982',
  gap: '#57504A',
  soil: '#8A6A50',
  soilDk: '#6A503C',
  // クツワムシ
  tGreen: '#8ED05E',
  tShade: '#5E9E3E',
  tLight: '#C8EE9A',
  tVein: '#6CAE4A',
  tEye: '#2E3C22',
  tThin: '#B4E284',
  // クズ (dark, so the green katydid stands out)
  kuzu: '#2E5C2D',
  kuzuLt: '#3E7A3A',
  kuzuVein: '#234622',
  // ウマオイ
  uGreen: '#B4E080',
  uShade: '#7CAE52',
  uLight: '#DAF2B0',
  uBrown: '#8A6444',
  uBrownLt: '#B08A60',
  uThin: '#CDEBA0',
  // grass
  grass: '#4A7E3E',
  grassLt: '#6E9E54',
  grassDk: '#33602C',
  // スズムシ and its case
  sBlack: '#1F1B19',
  sGloss: '#5A524C',
  sShine: '#A89E94',
  sWing: '#D8D2C4',
  sWingVein: '#9A9488',
  sWhite: '#F4F1E8',
  sThin: '#2E2824',
  caseWall: '#A9B7B4',
  caseWallLt: '#C8D4D0',
  nasu: '#5E2E5E',
  nasuLt: '#8A4A8A',
  nasuFlesh: '#F2E6C4',
  nasuSeed: '#C8B88A',
  // カブトムシ and the クヌギ's bark
  bRed: '#6A2C1C',
  bRedLt: '#A8563A',
  bShine: '#F2C8A0',
  bDark: '#3A1810',
  bark: '#6A4B3A',
  barkLt: '#8A6A50',
  barkDk: '#3E2C22',
  sap: '#43261A',
  sapShine: '#D9A441',
};

/** A thin line that thins out (every other pixel) over the last part of its last segment. */
function antenna(p: PixelCanvas, pts: [number, number][], c: string): void {
  let n = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[i + 1];
    const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
    for (let s = 0; s <= steps; s++) {
      const x = Math.round(x0 + ((x1 - x0) * s) / Math.max(1, steps));
      const y = Math.round(y0 + ((y1 - y0) * s) / Math.max(1, steps));
      if (i === pts.length - 2 && s > steps * 0.7 && n % 2) {
        n++;
        continue;
      }
      p.set(x, y, c);
      n++;
    }
  }
}

// ---------------------------------------------------------------- the close-ups (36×28)
//
// Three layers: the host (bg), the thin parts — legs and antennae, 1px, no
// outline (thin), and the body, outlined in ink (body). The loupe draws them
// at 2×; the notebook's sketch takes thin + body.

/** A lobed ヨモギ leaf lying across the bottom (the felted underside shows along its edge). */
function paintYomogi(p: PixelCanvas): void {
  p.poly(
    [
      [0, 24],
      [8, 21],
      [16, 20],
      [26, 19],
      [35, 17],
      [35, 22],
      [26, 24],
      [14, 26],
      [0, 27],
    ],
    C.yomo,
  );
  for (const [x, y] of [
    [4, 22],
    [12, 21],
    [21, 20],
    [30, 18],
  ] as [number, number][]) {
    p.ellipse(x, y - 1, 3, 2, C.yomo);
    p.set(x - 1, y - 2, C.yomoLt);
    p.set(x, y - 2, C.yomoLt);
  }
  for (let x = 0; x < 36; x++) p.set(x, Math.min(27, Math.round(26.6 - x * 0.14)), C.yomoUnder);
  for (let x = 0; x < 36; x++) p.set(x, Math.round(24.2 - x * 0.18), C.yomoVein);
  for (let n = 0; n < 16; n++) {
    const h = ihash(n, 3, 9121);
    const x = h % 34;
    const y = 21 + ((h >>> 8) % 4) - Math.round(x * 0.1);
    if (p.alpha(x, y) > 0) p.set(x, y, C.yomoLt);
  }
}

const kantan = {
  thin(p: PixelCanvas, k: number) {
    // hind legs: long thighs angled back and up, the shins down to the leaf
    p.line(12, 16, 8, 12, C.kShade);
    p.line(8, 12, 5, 19, C.kShade);
    p.line(14, 17, 11, 13, C.kShade);
    p.line(11, 13, 10, 19, C.kShade);
    // fore and middle legs
    p.line(23, 17, 25, 19, C.kShade);
    p.line(21, 17, 20, 19, C.kShade);
    p.line(18, 17, 17, 19, C.kShade);
    // antennae: longer than the body, forward and up (their tips move while it sings)
    antenna(p, [[25, 14], [30, 8], [35, 3 + k]], C.kThin);
    antenna(p, [[26, 15], [31, 11], [35, 9 - k]], C.kThin);
  },
  body(p: PixelCanvas, k: number) {
    // the wings held straight up over the back: a clear oval, veined; a-tremble, it widens
    const rx = k ? 5 : 4;
    p.ellipse(16, 10, rx, 5, C.kWing);
    p.line(16, 15, 13, 6, C.kVein);
    p.line(16, 15, 17, 5, C.kVein);
    p.line(16, 15, 19 + k, 8, C.kVein);
    // the slender body
    p.ellipse(15, 16, 7, 1.6, C.kGreen);
    p.hline(9, 21, 17, C.kShade);
    p.hline(10, 20, 15, C.kLight);
    p.rect(21, 15, 3, 2, C.kGreen);
    p.set(21, 15, C.kLight);
    // the head, the eye
    p.ellipse(25, 15.5, 2, 1.5, C.kGreen);
    p.set(24, 15, C.kLight);
    p.set(26, 15, C.kEye);
  },
};

/** Dry stones and their gaps behind, soil in front. */
function paintWallFoot(p: PixelCanvas): void {
  p.rect(0, 0, 36, 21, C.gap);
  const stones: [number, number, number, number][] = [
    [-2, 0, 11, 7],
    [10, -1, 12, 6],
    [23, 0, 14, 7],
    [1, 8, 9, 6],
    [27, 8, 10, 6],
    [-3, 15, 8, 6],
    [31, 15, 7, 6],
  ];
  for (const [x, y, w, h] of stones) {
    p.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, C.stone);
    p.hline(Math.round(x + 2), Math.round(x + w - 3), y + 1, C.stoneLt);
    p.hline(Math.round(x + 2), Math.round(x + w - 3), y + h - 1, C.stoneDk);
  }
  p.rect(0, 21, 36, 7, C.soil);
  for (let n = 0; n < 24; n++) {
    const h = ihash(n, 5, 7713);
    p.set(h % 36, 21 + ((h >>> 8) % 7), (h >>> 16) % 3 ? C.soilDk : mix(C.soil, C.stoneLt, 0.4));
  }
}

const enma = {
  thin(p: PixelCanvas, k: number) {
    // legs: the big hind thighs are body; the shins and the front legs are thin
    p.line(7, 20, 4, 25, C.eLeg);
    p.line(29, 20, 32, 25, C.eLeg);
    p.line(13, 21, 11, 26, C.eLeg);
    p.line(23, 21, 25, 26, C.eLeg);
    p.line(15, 22, 14, 26, C.eLeg);
    p.line(21, 22, 22, 26, C.eLeg);
    // antennae: long, curving up and out over the stones
    antenna(p, [[16, 12], [12, 6], [6 - k, 1]], C.eLeg);
    antenna(p, [[20, 12], [25, 6], [31 + k, 1]], C.eLeg);
  },
  body(p: PixelCanvas, k: number) {
    // the body and folded wings behind the head (raised a little when it sings)
    p.ellipse(18, 18 - k, 8, 3, C.eWing);
    p.hline(12, 24, 16 - k, C.eWingLt);
    // the hind thighs out to the sides
    p.ellipse(8, 19, 3, 1.5, C.eBlack);
    p.ellipse(28, 19, 3, 1.5, C.eBlack);
    p.set(7, 18, C.eGloss);
    p.set(27, 18, C.eGloss);
    // the head: big and round, glossy
    p.ellipse(18, 16, 5, 4.5, C.eBlack);
    p.ellipse(16, 13, 2, 1, C.eGloss);
    p.set(15, 13, C.eShine);
    // the eyes and the pale "eyebrows" over them (the 閻魔's frown — only a pattern)
    p.rect(15, 16, 1, 2, '#120C0A');
    p.rect(21, 16, 1, 2, '#120C0A');
    p.set(15, 16, C.eShine);
    p.set(21, 16, C.eShine);
    p.hline(13, 16, 14, C.eBrow);
    p.set(12, 15, C.eBrow);
    p.hline(20, 23, 14, C.eBrow);
    p.set(24, 15, C.eBrow);
    // the mouthparts
    p.set(17, 20, C.eGloss);
    p.set(19, 20, C.eGloss);
  },
};

/** A big three-lobed クズ leaf. */
function paintKuzu(p: PixelCanvas): void {
  p.ellipse(18, 22, 17, 6, C.kuzu);
  p.ellipse(5, 14, 7, 6, C.kuzu);
  p.ellipse(31, 13, 6, 6, C.kuzu);
  p.ellipse(18, 22, 15, 4, C.kuzuLt);
  p.ellipse(18, 22, 13, 3, C.kuzu);
  p.line(18, 27, 18, 17, C.kuzuVein);
  p.line(18, 23, 7, 19, C.kuzuVein);
  p.line(18, 23, 30, 18, C.kuzuVein);
  p.line(5, 19, 3, 10, C.kuzuVein);
  p.line(31, 18, 33, 9, C.kuzuVein);
  p.set(1, 12, C.kuzuLt);
  p.set(29, 9, C.kuzuLt);
}

const kutsuwa = {
  thin(p: PixelCanvas, k: number) {
    // hind shins, and the front and middle legs
    p.line(30, 11, 33, 21, C.tShade);
    p.line(25, 13, 27, 21, C.tShade);
    p.line(8, 18, 6, 22, C.tShade);
    p.line(11, 18, 11, 22, C.tShade);
    p.line(15, 19, 16, 22, C.tShade);
    // antennae: twice the body, sweeping forward and back up
    antenna(p, [[6, 14], [3, 8], [2, 3], [7 + k, 0]], C.tThin);
    antenna(p, [[7, 14], [7, 8], [10, 4], [17 - k, 1]], C.tThin);
  },
  body(p: PixelCanvas, k: number) {
    // the thick hind thighs
    p.line(23, 17, 30, 11, C.tShade);
    p.line(24, 18, 31, 12, C.tGreen);
    p.line(20, 18, 25, 13, C.tShade);
    // the broad forewings (a leaf of their own), veined — lifted when it clatters
    const w = k;
    p.ellipse(21, 14 - w, 9, 3.5, C.tGreen);
    p.hline(14, 28, 11 - w, C.tLight);
    p.line(13, 15 - w, 29, 13 - w, C.tVein);
    for (const x of [17, 21, 25]) p.line(x, 12 - w, x - 1, 16 - w, C.tVein);
    // the body under them
    p.ellipse(19, 17, 6, 1.5, C.tShade);
    // pronotum and head
    p.rect(9, 13, 5, 5, C.tGreen);
    p.hline(9, 13, 13, C.tLight);
    p.ellipse(7, 16, 3, 2.5, C.tGreen);
    p.set(6, 14, C.tLight);
    p.set(6, 15, C.tEye);
    p.set(5, 17, C.tShade);
  },
};

/** Grass blades in the cherry's shade. */
function paintShitakusa(p: PixelCanvas): void {
  // a few blades of different heights, leaning this way and that (bent at a third of the way up)
  for (let n = 0; n < 7; n++) {
    const h = ihash(n, 1, 6671);
    const x0 = 2 + n * 5 + (h % 3);
    const top = 12 + ((h >>> 4) % 11);
    const lean = ((h >>> 9) % 7) - 3;
    const mid = Math.round((27 + top) / 2);
    const c = n % 3 ? C.grass : C.grassDk;
    p.line(x0, 27, x0 + Math.round(lean / 3), mid, c);
    p.line(x0 + Math.round(lean / 3), mid, x0 + lean, top, c);
    p.set(x0 + lean, top, C.grassLt);
  }
  // the blade it sits on: a long one from the left, bending right
  p.line(0, 23, 12, 19, C.grassLt);
  p.line(12, 19, 32, 18, C.grassLt);
  p.line(0, 24, 12, 20, C.grass);
  p.line(12, 20, 32, 19, C.grassDk);
}

const umaoi = {
  thin(p: PixelCanvas, k: number) {
    // long hind legs
    p.line(12, 16, 8, 10, C.uShade);
    p.line(8, 10, 6, 18, C.uShade);
    p.line(14, 16, 11, 12, C.uShade);
    p.line(11, 12, 10, 18, C.uShade);
    // front legs with their little spines (for catching; tonight he catches nothing)
    p.line(26, 16, 29, 18, C.uShade);
    p.set(27, 18, C.uShade);
    p.set(28, 19, C.uShade);
    p.line(24, 16, 24, 18, C.uShade);
    p.line(20, 16, 19, 18, C.uShade);
    // antennae: very long and fine
    antenna(p, [[29, 12], [32, 7], [33 + k, 0]], C.uThin);
    antenna(p, [[30, 13], [34, 9], [35, 4 - k]], C.uThin);
  },
  body(p: PixelCanvas, k: number) {
    // the slim wings and body; the brown stripe along the top
    const u = k;
    p.ellipse(17, 14 - u, 8, 2, C.uGreen);
    p.hline(10, 24, 16, C.uShade);
    p.hline(10, 23, 12 - u, C.uBrown);
    p.hline(12, 20, 13 - u, C.uBrownLt);
    p.rect(24, 12, 3, 4, C.uGreen);
    p.hline(24, 26, 12, C.uBrown);
    // the head
    p.ellipse(28, 14, 2, 2, C.uGreen);
    p.set(27, 13, C.uLight);
    p.set(29, 13, '#3E4E2A');
  },
};

/** Inside the rearing case: its clear back wall, damp soil, a slice of eggplant, a twig. */
function paintCase(p: PixelCanvas): void {
  p.rect(0, 0, 36, 20, C.caseWall);
  p.vline(29, 0, 19, C.caseWallLt);
  p.vline(30, 0, 19, C.caseWallLt);
  p.vline(3, 0, 19, C.caseWallLt);
  p.rect(0, 19, 36, 9, C.soil);
  for (let n = 0; n < 26; n++) {
    const h = ihash(n, 7, 3391);
    p.set(h % 36, 19 + ((h >>> 8) % 9), (h >>> 16) % 3 ? C.soilDk : mix(C.soil, C.sWhite, 0.25));
  }
  // the eggplant slice at the left
  p.ellipse(6, 21, 5, 2.5, C.nasu);
  p.ellipse(6, 21, 4, 1.5, C.nasuFlesh);
  p.set(5, 21, C.nasuSeed);
  p.set(7, 21, C.nasuSeed);
  p.set(2, 20, C.nasuLt);
  // a twig to climb
  p.line(25, 22, 35, 13, C.bark);
  p.line(26, 22, 35, 14, C.barkDk);
}

const suzu = {
  thin(p: PixelCanvas, k: number) {
    // hind legs
    p.line(12, 20, 9, 16, C.sThin);
    p.line(9, 16, 7, 22, C.sThin);
    p.line(14, 21, 12, 17, C.sThin);
    p.line(12, 17, 11, 23, C.sThin);
    p.line(21, 21, 22, 23, C.sThin);
    p.line(19, 21, 18, 23, C.sThin);
    // antennae: white near the base, then long and dark (swaying a little)
    p.set(25, 18, C.sWhite);
    p.set(26, 17, C.sWhite);
    p.set(26, 19, C.sWhite);
    p.set(27, 19, C.sWhite);
    antenna(p, [[27, 16], [31, 9], [34, 2 + k]], C.sThin);
    antenna(p, [[28, 19], [32, 15], [35, 12 - k]], C.sThin);
  },
  body(p: PixelCanvas, k: number) {
    // the broad wings held up over the back (clear, veined), wider as they shiver
    const rx = k ? 6 : 5;
    p.ellipse(16, 13, rx, 5, C.sWing);
    p.line(16, 18, 12, 9, C.sWingVein);
    p.line(16, 18, 16, 8, C.sWingVein);
    p.line(16, 18, 20 + k, 9, C.sWingVein);
    // body, thorax and head: black and glossy
    p.ellipse(16, 19, 6, 2, C.sBlack);
    p.hline(12, 18, 18, C.sGloss);
    p.rect(21, 18, 3, 2, C.sBlack);
    p.ellipse(25, 18.5, 2, 1.5, C.sBlack);
    p.set(24, 18, C.sShine);
    p.set(13, 18, C.sShine);
  },
};

/** The クヌギ's ridged bark with its sap. */
function paintKunugi(p: PixelCanvas): void {
  p.rect(4, 0, 28, 28, C.bark);
  for (let x = 4; x < 32; x++) {
    for (let y = 0; y < 28; y++) {
      const h = ihash(x, y >> 2, 1811);
      if (x % 4 === 0 || (h % 7 === 0 && y % 3 === 0)) p.set(x, y, C.barkDk);
      else if (x % 4 === 1 && h % 3 === 0) p.set(x, y, C.barkLt);
    }
  }
  p.vline(4, 0, 27, C.barkDk);
  p.vline(31, 0, 27, C.barkDk);
  p.ellipse(18, 18, 5, 6, C.sap);
  p.line(16, 23, 15, 27, C.sap);
  p.line(20, 23, 21, 26, C.sap);
  p.set(16, 15, C.sapShine);
  p.set(20, 20, C.sapShine);
}

const kabuto = {
  thin(p: PixelCanvas, k: number) {
    // legs gripping the bark
    p.line(13, 12, 9, 10 - k, C.bDark);
    p.line(23, 12, 27, 10 + k, C.bDark);
    p.line(13, 16, 9, 17 + k, C.bDark);
    p.line(23, 16, 27, 17 - k, C.bDark);
    p.line(14, 20, 11, 24, C.bDark);
    p.line(22, 20, 25, 24, C.bDark);
  },
  body(p: PixelCanvas) {
    // the wing cases, glossy reddish brown
    p.ellipse(18, 16, 6, 6, C.bRed);
    p.vline(18, 11, 22, C.bDark);
    p.ellipse(15, 14, 1.5, 3, C.bRedLt);
    p.set(15, 13, C.bShine);
    p.set(21, 15, C.bRedLt);
    // the pronotum and its small horn
    p.ellipse(18, 9, 4, 2.5, C.bRed);
    p.set(17, 8, C.bShine);
    p.set(18, 6, C.bDark);
    // the head and the big forked horn, raised
    p.rect(17, 4, 3, 2, C.bDark);
    p.rect(18, 0, 2, 4, C.bRed);
    p.set(18, 1, C.bRedLt);
    p.set(17, 0, C.bRed);
    p.set(20, 0, C.bRed);
  },
};

type Painter = { bg: (p: PixelCanvas) => void; thin: (p: PixelCanvas, k: number) => void; body: (p: PixelCanvas, k: number) => void };
const PAINT: Record<MushiKind, Painter> = {
  kantan: { bg: paintYomogi, ...kantan },
  enma: { bg: paintWallFoot, ...enma },
  kutsuwa: { bg: paintKuzu, ...kutsuwa },
  umaoi: { bg: paintShitakusa, ...umaoi },
  suzu: { bg: paintCase, ...suzu },
  kabuto: { bg: paintKunugi, ...kabuto },
};

/** The insect alone (thin parts, then the outlined body), frame k. */
function bugLayer(kind: MushiKind, k: number): PixelCanvas {
  const thin = new PixelCanvas(CLOSE_W, CLOSE_H);
  PAINT[kind].thin(thin, k);
  const body = new PixelCanvas(CLOSE_W, CLOSE_H);
  PAINT[kind].body(body, k);
  body.outline(mix(P.ink, P.woodDark, 0.3));
  thin.blit(body, 0, 0);
  return thin;
}

/** Host and insect together (36×28). */
function artOf(kind: MushiKind, k: number): PixelCanvas {
  const p = new PixelCanvas(CLOSE_W, CLOSE_H);
  PAINT[kind].bg(p);
  p.blit(bugLayer(kind, k), 0, 0);
  return p;
}

const closeCache = new Map<string, HTMLCanvasElement>();

/** The close-up (36×28): the host plant and the insect, frame `k` (0 still, 1 singing). */
export function mushiCloseup(kind: MushiKind, k = 0): HTMLCanvasElement {
  const key = `${kind}:${k}`;
  let c = closeCache.get(key);
  if (c) return c;
  c = artOf(kind, k).toCanvas();
  closeCache.set(key, c);
  return c;
}

// ---------------------------------------------------------------- the loupe (76×76)

export const LOUPE = 76;
const loupeCache = new Map<string, HTMLCanvasElement>();

/**
 * The close-up seen in the lantern's warm light: a disc (r 36) darkening from
 * a warm middle to the night at its rim, the close-up at 2× over it, a 1px
 * lantern-coloured ring and the ink edge.
 */
export function mushiLoupe(kind: MushiKind, k = 0): HTMLCanvasElement {
  const key = `${kind}:${k}`;
  let c = loupeCache.get(key);
  if (c) return c;
  const S = LOUPE;
  const r = S / 2 - 2;
  const cx = S / 2 - 0.5;
  const cy = S / 2 - 0.5;
  const art = artOf(kind, k);
  const p = new PixelCanvas(S, S);
  const ox = Math.round((S - CLOSE_W * 2) / 2);
  const oy = Math.round((S - CLOSE_H * 2) / 2);
  const warmIn = '#8A5A3E';
  const warmOut = '#2E2440';
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const d = Math.hypot(x - cx, y - cy);
      if (d > r) continue;
      // warm in the middle, the night toward the rim (dithered in 4 steps)
      const t = Math.min(1, d / r);
      const step = Math.min(3, Math.floor(t * 4 + (((x + y) & 1) ? 0.25 : 0)));
      let col = mix(warmIn, warmOut, step / 3);
      const ax = Math.floor((x - ox) / 2);
      const ay = Math.floor((y - oy) / 2);
      if (ax >= 0 && ay >= 0 && ax < CLOSE_W && ay < CLOSE_H && art.alpha(ax, ay) > 0) {
        // the lantern's light: warm, and dimmer toward the rim
        col = mix(rgbaToHex(art.get(ax, ay)), '#F7C27A', 0.12);
        if (t > 0.78) col = mix(col, warmOut, (t - 0.78) * 2.2);
      }
      p.set(x, y, col);
    }
  // the lantern-coloured ring, and the ink edge outside it
  for (let a = 0; a < 720; a++) {
    const th = (a / 720) * Math.PI * 2;
    p.set(Math.round(cx + Math.cos(th) * (r + 0.5)), Math.round(cy + Math.sin(th) * (r + 0.5)), '#F7C27A');
  }
  p.outline(P.ink);
  c = p.toCanvas();
  loupeCache.set(key, c);
  return c;
}

/** PixelCanvas.get() gives a packed RGBA; turn it back into #RRGGBB. */
function rgbaToHex(v: number): string {
  // packed as 0xAABBGGRR (little-endian ImageData) — see engine/pixel rgba32
  const r = v & 0xff;
  const g = (v >>> 8) & 0xff;
  const b = (v >>> 16) & 0xff;
  return '#' + [r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('');
}

// ---------------------------------------------------------------- しゅん's pencil sketch (the notebook)

const sketchCache = new Map<string, HTMLCanvasElement>();

/**
 * The insect as しゅん draws it in みました帳 ② (36×28): its outline in pencil,
 * light hatching inside, the host plant as a couple of loose lines under it.
 */
export function mushiSketch(kind: MushiKind): HTMLCanvasElement {
  let c = sketchCache.get(kind);
  if (c) return c;
  const bug = bugLayer(kind, 0);
  const out = new PixelCanvas(CLOSE_W, CLOSE_H);
  const pencil = '#6A6484';
  const hatch = '#B5AAC8';
  const on = (x: number, y: number) => x >= 0 && y >= 0 && x < CLOSE_W && y < CLOSE_H && bug.alpha(x, y) > 0;
  for (let y = 0; y < CLOSE_H; y++)
    for (let x = 0; x < CLOSE_W; x++) {
      if (!on(x, y)) continue;
      const edge = !on(x - 1, y) || !on(x + 1, y) || !on(x, y - 1) || !on(x, y + 1);
      if (edge) out.set(x, y, pencil);
      else if ((x + y) % 3 === 0) out.set(x, y, hatch);
    }
  // the leaf / stone / soil: two loose pencil strokes under it
  for (let x = 2; x < 34; x++) {
    if (ihash(x, 1, 44) % 5 === 0) continue;
    out.set(x, Math.round(25 - x * 0.08), hatch);
  }
  c = out.toCanvas();
  sketchCache.set(kind, c);
  return c;
}

// ---------------------------------------------------------------- the field: host plants (always) and the insects (litOnly)

/** A ヨモギ clump on the ridge by the stone steps (the カンタン's): grey-green leaves, their felted white undersides. */
registerProp('prop_h_yomogi', () =>
  standProp(
    16,
    11,
    (p) => {
      // stems from one root, leaf clusters on them (no ink outline: a plant, not a thing)
      for (const [x0, x1, top] of [
        [7, 3, 3],
        [8, 8, 0],
        [9, 13, 2],
        [7, 5, 5],
        [9, 11, 5],
      ] as [number, number, number][]) {
        p.line(x0, 10, x1, top + 2, C.yomoVein);
        p.ellipse(x1, top + 1.5, 2, 1.5, C.yomo);
        p.set(x1 - 1, top + 1, C.yomoLt);
        p.set(x1 + 1, top + 2, C.yomoUnder);
      }
      p.hline(5, 11, 10, C.yomoVein);
    },
    { cx: 8, base: 14, shadow: 0, outline: false },
  ),
);

/** Grass at the school cherry's foot (the ウマオイ's). */
registerProp('prop_h_shitakusa', () =>
  standProp(
    16,
    10,
    (p) => {
      for (let n = 0; n < 9; n++) {
        const h = ihash(n, 4, 8819);
        const x = 1 + n + (n > 4 ? 4 : 0) + (h % 2);
        const top = (h >>> 4) % 5;
        const lean = ((h >>> 9) % 3) - 1;
        p.line(x, 9, x + lean, top, n % 2 ? C.grassLt : C.grass);
        p.set(x, 9, C.grassDk);
      }
    },
    { cx: 9, base: 15, foot: 32, shadow: 0, outline: false },
  ),
);

/** The クヌギ by the mouth of the hill path: its trunk rising out of the thicket, a dark run of sap (drawn over the クズ's cells). */
registerProp('prop_h_kunugi', () =>
  standProp(
    12,
    30,
    (p) => {
      p.rect(2, 0, 8, 30, C.bark);
      for (let y = 0; y < 30; y++)
        for (let x = 2; x < 10; x++) {
          const h = ihash(x, y >> 1, 2717);
          if (x % 3 === 0 || h % 9 === 0) p.set(x, y, C.barkDk);
          else if (h % 5 === 0) p.set(x, y, C.barkLt);
        }
      p.vline(2, 0, 29, C.barkDk);
      p.vline(9, 0, 29, C.barkDk);
      // roots into the hedge
      p.rect(0, 27, 12, 3, C.bark);
      p.hline(0, 11, 29, C.barkDk);
      // the sap, a hand's height up
      p.ellipse(6, 18, 2, 3, C.sap);
      p.set(5, 17, C.sapShine);
    },
    { cx: 8, base: 14, foot: 32, shadow: 30 },
  ),
);

/** ぴょん夫人's rearing case beside the goldfish bowl: clear plastic, a green lid, soil, an eggplant slice. */
registerProp('prop_hr_mushi_case', () =>
  standProp(
    14,
    12,
    (p) => {
      // the case (clear: the room's light shows through it), soil in the bottom
      p.rect(0, 2, 14, 10, '#DDE8E6');
      p.rect(1, 8, 12, 4, C.soil);
      p.set(3, 9, C.soilDk);
      p.set(9, 10, C.soilDk);
      // the eggplant slice
      p.rect(2, 7, 3, 1, C.nasu);
      p.set(3, 7, C.nasuFlesh);
      // two bell crickets (tiny)
      p.rect(7, 7, 2, 1, C.sBlack);
      p.set(10, 8, C.sBlack);
      p.set(11, 8, C.sBlack);
      // the clear wall's highlight
      p.vline(12, 3, 7, '#FFFFFF');
      // the green lid and its vents
      p.rect(0, 0, 14, 2, '#5FA85A');
      p.hline(0, 13, 0, '#8FD07A');
      for (let x = 2; x < 12; x += 3) p.set(x, 1, '#2E6B4A');
    },
    { cx: 8, base: 16, shadow: 0 },
  ),
);

/**
 * The insect itself on its host (litOnly on the map: only the lantern shows
 * it). opts.k is the kind; a two-frame shiver while the player is close, and
 * a pixel of the lantern's light caught on a wing or a shell (the glow layer:
 * a find to notice, 52 8.5).
 */
registerProp('prop_h_mushi', (opts): PropArt => {
  const kind = String(opts.k ?? 'kantan') as MushiKind;
  const frames = [0, 1].map((k) => tinyBug(kind, k).toCanvas());
  // where on its tile it sits (the host plant's top, the wall's foot, the leaf's edge, the trunk)
  const at: Record<MushiKind, [number, number]> = {
    kantan: [0, -6],
    enma: [-4, -1],
    kutsuwa: [4, -4],
    umaoi: [1, -3],
    suzu: [0, 0],
    kabuto: [-1, -12],
  };
  // depth: in front of the stone wall's end, the thicket's and the hedge's cells below
  // them and the forest edge (their art reaches up over these tiles)
  const foot: Record<MushiKind, number> = { kantan: 15, enma: 16, kutsuwa: 32, umaoi: 32, suzu: 15, kabuto: 33 };
  const glint: Record<MushiKind, [number, number]> = {
    kantan: [7, 9],
    enma: [7, 11],
    kutsuwa: [8, 10],
    umaoi: [8, 10],
    suzu: [7, 11],
    kabuto: [8, 11],
  };
  const [dx, dy] = at[kind];
  const sings = (env: PropEnv) => env.near < 52 && kind !== 'kabuto';
  return {
    ox: dx,
    oy: dy,
    w: 16,
    h: 16,
    foot: foot[kind],
    img(env: PropEnv) {
      return frames[sings(env) && Math.floor(env.t / 130) % 2 ? 1 : 0];
    },
    glow(g, x, y, env) {
      const on = 0.55 + 0.35 * Math.sin(env.t / 380);
      g.rect(x + dx + glint[kind][0], y + dy + glint[kind][1], 1, 1, '#FFF6D8', on);
    },
  };
});

/** A few pixels of each (the field's size) on a 16×16 canvas: the body inked, the legs and antennae 1px. */
function tinyBug(kind: MushiKind, k: number): PixelCanvas {
  const b = new PixelCanvas(16, 16);
  const t = new PixelCanvas(16, 16);
  switch (kind) {
    case 'kantan':
      // slender, pale; the wings up
      b.hline(4, 10, 12, C.kGreen);
      b.hline(5, 9, 11, C.kLight);
      b.rect(11, 11, 2, 2, C.kGreen);
      b.set(12, 11, C.kEye);
      b.rect(6, 8 - k, 3, 3, C.kWing);
      b.set(7, 8 - k, C.kLight);
      t.set(13, 10, C.kThin);
      t.set(14, 9, C.kThin);
      t.set(15, 8, C.kThin);
      t.set(4, 13, C.kShade);
      t.set(8, 13, C.kShade);
      t.set(11, 13, C.kShade);
      break;
    case 'enma':
      // the head out of the gap: black, the pale brows
      b.rect(6, 11, 4, 3, C.eBlack);
      b.hline(6, 9, 11, C.eGloss);
      b.set(6, 11, C.eBrow);
      b.set(9, 11, C.eBrow);
      t.set(5, 10 - k, C.eLeg);
      t.set(4, 9 - k, C.eLeg);
      t.set(10, 10 + k, C.eLeg);
      t.set(11, 9 + k, C.eLeg);
      break;
    case 'kutsuwa':
      // stout and green, the wings a leaf
      b.rect(6, 10 - k, 5, 2, C.tGreen);
      b.hline(6, 10, 10 - k, C.tLight);
      b.hline(5, 10, 12, C.tShade);
      b.rect(4, 11, 2, 2, C.tGreen);
      t.set(3, 10, C.tThin);
      t.set(2, 9, C.tThin);
      t.set(1, 8, C.tThin);
      t.set(11, 13, C.tShade);
      t.set(7, 13, C.tShade);
      break;
    case 'umaoi':
      // slim and green, the brown stripe
      b.hline(4, 11, 12, C.uGreen);
      b.hline(5, 10, 11 - k, C.uBrown);
      b.rect(12, 11, 2, 2, C.uGreen);
      t.set(14, 10, C.uThin);
      t.set(15, 9, C.uThin);
      t.set(4, 13, C.uShade);
      t.set(8, 13, C.uShade);
      break;
    case 'suzu':
      b.rect(7, 12, 2, 1, C.sBlack);
      break;
    case 'kabuto':
      // the reddish shell, the horn up
      b.rect(7, 11, 3, 4, C.bRed);
      b.set(7, 11, C.bRedLt);
      b.vline(8, 9, 10, C.bDark);
      b.set(8, 8, C.bRed);
      t.set(6, 12 + k, C.bDark);
      t.set(10, 13 - k, C.bDark);
      break;
  }
  b.outline(mix(P.ink, P.woodDark, 0.3));
  b.blit(t, 0, 0);
  return b;
}
