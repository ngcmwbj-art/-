// The rooms of 海ぞいの町 the first part needs (62_ch3_level_art 4.2・4.3):
// 食堂 かもめ (map_c3_shokudo, 16×9: the counter of six stools, the kitchen
// behind it, the raised tatami corner) and 港の 市場 (map_c3_ichiba, 37×12:
// the auction floor in the west with its fish boxes and the wet ring under
// the skylight, the row of empty shops = あぜ道市 in the east, shutters down).
//
// A shell (ishell.ts paintShell: the floor, the north wall's face) and the
// furniture as y-sorted props, like chapter 1's shops. At 12:00 everything
// stands still: the pot's steam is a white column, the dust in the skylight
// hangs in the air.

import { mix, PixelCanvas } from '../../engine/pixel';
import { h01, ihash, valueNoise } from '../tiles/noise';
import { P } from '../tiles/palette';
import { getMapDef } from '../../world/maps';
import { blend, paintShell } from './ishell';
import { boards } from '../tiles/ifloor';
import { outline } from './kit';
import { standProp } from './hoshi_kit';
import { fontTextSmall } from './text';
import { registerProp } from './registry';
import type { PropArt } from './types';

// ---------------------------------------------------------------- 食堂 かもめ

registerProp('prop_c3_shokudo_shell', () => {
  const rows = getMapDef('map_c3_shokudo')?.rows ?? [];
  const wood = boards({ bh: 6, lit: '#C8A06A', base: '#A87A4A', shade: '#7A5A3A', gap: '#5A3A2A', nail: '#8A5A3A', seed: 3601 });
  const sh = paintShell({
    rows,
    floor: (x, y, tx, ty, ch) => {
      // the kitchen: small white tiles; the shop: worn boards
      if (ch === 'k' || ch === 'K' || ch === 'O' || (ty <= 4 && tx <= 8)) {
        const lx = x % 6;
        const ly = y % 6;
        if (lx === 5 || ly === 5) return '#B8B4AA';
        return ihash(Math.floor(x / 6), Math.floor(y / 6), 3603) % 9 === 0 ? '#D8D4C8' : '#E8E4D8';
      }
      return wood(x, y);
    },
    wall: (x, y, fh) => {
      // cream plaster over a dark wainscot; the menu cards hang high on the east half
      if (y >= fh - 10) return y === fh - 10 ? '#C8A06A' : (x % 8 === 7 ? '#5A3A2A' : '#7A5A3A');
      return valueNoise(x / 6, y / 5, 3605) > 0.8 ? '#F4EAD6' : '#EADCC0';
    },
    trim: '#C8A06A',
    base: '#5A3A2A',
    baseH: 3,
  });
  const p = sh.p;
  // the blackboard 『本日の 日替わり』 (4,1): the line, then nothing under it (12:00)
  const bx = 3 * 16 + 4;
  const by = 8;
  p.rect(bx, by, 26, 18, '#5A3A2A');
  p.rect(bx + 1, by + 1, 24, 16, '#2A3A2A');
  p.hline(bx + 3, bx + 20, by + 4, '#E8E4D8');
  p.hline(bx + 3, bx + 14, by + 5, '#C8C2B4');
  // the clock (8,1): 12:00, both hands up
  const cx = 8 * 16 + 8;
  const cy = 14;
  p.ellipse(cx, cy, 6, 6, '#5A3A2A');
  p.ellipse(cx, cy, 5, 5, '#F4F1E8');
  p.vline(cx, cy - 4, cy, '#2A2440');
  p.vline(cx + 1, cy - 3, cy, '#2A2440');
  // the menu cards (11–14,1): a row of white cards with strokes
  for (let k = 0; k < 8; k++) {
    const x = 10 * 16 + 4 + k * 9;
    p.rect(x, 6, 7, 16, '#FBF3DC');
    p.vline(x, 6, 21, '#E8D9B5');
    for (let j = 8; j < 20; j += 3) p.hline(x + 2, x + 4, j, k % 3 === 0 ? '#C8452E' : '#2A2440');
  }
  // a window in the kitchen wall, the day outside
  p.rect(14, 8, 26, 14, '#8A5A3A');
  p.rect(16, 10, 22, 10, '#B8E0F4');
  p.hline(16, 37, 10, '#FFFFFF');
  p.vline(27, 10, 19, '#8A5A3A');
  sh.glass.rect(16, 10, 22, 10, '#ffffff');
  // the tatami corner's floor edge drawn by the tatami prop; the doorway's mat
  for (let y = 7 * 16 + 4; y < 8 * 16; y++) for (let x = 7 * 16 + 2; x < 9 * 16 - 2; x++) p.set(x, y, (x + y) % 3 === 0 ? '#6A4A3A' : '#8A5A3A');
  const img = p.toCanvas();
  const glass = sh.glass.toCanvas();
  return { ox: 0, oy: 0, w: sh.w * 16, h: sh.h * 16, foot: 0, flat: true, img: () => img, glass } satisfies PropArt;
});

/** The kitchen's line (1–8,2): the stove with the big pot (オカワリナベ's pot, its lid floating), the sink, the shelves. */
registerProp('prop_c3_shokudo_kitchen', () =>
  standProp(112, 30, (p) => {
    p.rect(0, 10, 112, 20, '#C8CCD2');
    p.hline(0, 111, 10, '#E8ECF0');
    p.rect(0, 22, 112, 8, '#9AA0A8');
    for (let x = 4; x < 108; x += 14) p.rect(x, 24, 10, 4, '#8E95A6');
    // the stove and the big pot (2,2)
    p.rect(16, 12, 26, 6, '#3A3F48');
    p.ellipse(24, 8, 10, 6, '#9AA0A8');
    p.ellipse(24, 4, 10, 3, '#C8CDD4');
    p.hline(14, 34, 2, '#E8ECF0');
    // the steam stopped in a white column over the lid
    for (const [x, y] of [[22, 0], [25, -3], [23, -6]] as const) p.ellipse(x, y + 6, 3, 2, '#FFFFFF');
    // the sink, a tap
    p.rect(56, 12, 22, 6, '#E8ECF0');
    p.rect(58, 13, 18, 4, '#9AA0A8');
    p.vline(66, 4, 12, '#C8CDD4');
    p.hline(66, 70, 4, '#C8CDD4');
    // the rice cooker, the bowls
    p.rect(86, 4, 12, 10, '#F4F1E8');
    p.ellipse(92, 4, 6, 2, '#E8E4D8');
    for (let k = 0; k < 4; k++) p.ellipse(102 + (k % 2) * 4, 13 - Math.floor(k / 2) * 3, 2, 1, '#E8E4D8');
  }, { cx: 56, base: 32, shadow: 0, foot: 31 }),
);

/** The fridge (1,3). */
registerProp('prop_c3_shokudo_fridge', () =>
  standProp(14, 30, (p) => {
    p.rect(0, 2, 14, 28, '#E8E4D8');
    p.hline(0, 13, 2, '#F4F1E8');
    p.vline(13, 3, 29, '#C8C2B4');
    p.hline(0, 13, 12, '#C8C2B4');
    p.vline(11, 5, 10, '#9AA0A8');
    p.vline(11, 15, 22, '#9AA0A8');
  }, { cx: 8, base: 16, shadow: 24 }),
);

/**
 * The counter (1–6,4) and its six round stools in front (1–6,5). On the
 * counter: the bowls of the meal that never ends, and in front of the
 * regular's seat (3,5) his tower of tea bowls (fushigi_ch3_02, 41 on top).
 */
registerProp('prop_c3_shokudo_counter', () =>
  standProp(96, 26, (p) => {
    p.rect(0, 6, 96, 6, '#C8A06A');
    p.hline(0, 95, 6, '#E8C890');
    p.rect(0, 12, 96, 12, '#8A5A3A');
    for (let x = 0; x < 96; x += 8) p.vline(x, 12, 23, '#6A4A3A');
    p.hline(0, 95, 12, '#5A3A2A');
    // bowls and plates along it
    for (let k = 0; k < 6; k++) {
      if (k === 2) continue;
      const x = 6 + k * 16;
      p.ellipse(x, 7, 4, 2, '#F4F1E8');
      p.ellipse(x, 6, 3, 1, k % 2 ? '#C8452E' : '#E8C890');
    }
    // the tower of tea bowls (3,4) — 10 px of stacked cups
    for (let k = 0; k < 10; k++) {
      p.rect(37, 6 - k, 6, 1, k % 2 ? '#9AAAB4' : '#C8D2DA');
      p.set(37, 6 - k, '#6B7186');
    }
  }, { cx: 48, base: 16, shadow: 0, foot: 15 }),
);

registerProp('prop_c3_stool', () =>
  standProp(10, 12, (p) => {
    p.ellipse(5, 3, 4, 2, '#C8452E');
    p.ellipse(5, 2, 3, 1, '#E06A4E');
    p.vline(5, 5, 10, '#9AA0A8');
    p.hline(2, 8, 10, '#9AA0A8');
  }, { cx: 8, base: 16, shadow: 8 }),
);

/** 小上がり (10–14,2–5): the raised tatami, two low tables, cushions (customers' bowls on them). */
registerProp('prop_c3_shokudo_tatami', () => {
  const p = new PixelCanvas(80, 70);
  for (let y = 0; y < 64; y++)
    for (let x = 0; x < 80; x++) {
      const lx = x % 40;
      const ly = y % 32;
      let c = lx === 0 || ly === 0 ? '#7A8A3A' : (x + y * 3) % 4 === 0 ? '#A8B060' : '#B8C070';
      if (lx === 39 || ly === 31) c = '#6A7A30';
      p.set(x, y, c);
    }
  // the raised edge (上がり框), dark wood, facing the shop
  p.rect(0, 64, 80, 6, '#5A3A2A');
  p.hline(0, 79, 64, '#8A5A3A');
  // two low tables with bowls, zabuton round them
  for (const [tx, ty] of [[14, 12], [50, 34]] as const) {
    for (const [dx, dy] of [[-10, 0], [16, 0], [3, -10], [3, 12]] as const) p.rect(tx + dx, ty + dy, 8, 7, '#8A2E3A');
    p.rect(tx, ty, 14, 10, '#8A5A3A');
    p.rect(tx, ty, 14, 2, '#A87A4A');
    p.ellipse(tx + 4, ty + 4, 2, 1, '#F4F1E8');
    p.ellipse(tx + 10, ty + 5, 2, 1, '#F4F1E8');
  }
  const img = p.toCanvas();
  // (it is floor: drawn lying under everyone, in 3D too)
  return { ox: 0, oy: 0, w: 80, h: 70, foot: 0, flat: true, img: () => img } satisfies PropArt;
});

/** The register and the umbrella stand by the door (13–14,7). */
registerProp('prop_c3_shokudo_reji', () =>
  standProp(32, 22, (p) => {
    p.rect(1, 8, 16, 13, '#8A5A3A');
    p.hline(1, 16, 8, '#A87A4A');
    p.rect(4, 3, 10, 6, '#3A3F48');
    p.rect(5, 4, 8, 2, '#7FD1E8');
    p.rect(22, 10, 8, 11, '#9AA0A8');
    p.vline(24, 2, 10, '#2F4A8A');
    p.vline(27, 4, 10, '#E84E3C');
  }, { cx: 16, base: 16, shadow: 16 }),
);

// ---------------------------------------------------------------- 港の 市場

registerProp('prop_c3_ichiba_shell', () => {
  const rows = getMapDef('map_c3_ichiba')?.rows ?? [];
  const sh = paintShell({
    rows,
    floor: (x, y, tx, ty, ch) => {
      // wet concrete, the skylight's white in the puddles, scales; the auction ring wetter
      const n = valueNoise(x / 14, y / 10, 3611);
      const g = h01(x, y, 3613);
      let c = '#8A9098';
      if (n > 0.64 && g < (n - 0.58) * 1.8) c = '#9AA0A8';
      else if (n < 0.3 && g < (0.36 - n) * 1.8) c = '#7A8090';
      if (g > 0.985) c = '#F4F1E8';
      if (ch === ',') {
        c = n > 0.5 ? '#7A8A98' : '#6A7A88';
        if (valueNoise(x / 6, y / 4, 3615) > 0.66) c = '#C8D8E0';
      }
      // the drain channel along the east row of shops
      if (tx >= 19 && (y % 16 === 15) && ty === 6) c = '#3A3F48';
      return c;
    },
    wall: (x, y, fh) => {
      if (y >= fh - 6) return '#6B7186';
      return x % 4 === 3 ? '#A8AEB6' : x % 4 === 0 ? '#D2D6DC' : '#C2C8CE';
    },
    trim: '#9AA0A8',
    base: '#4A4E58',
    baseH: 4,
  });
  const p = sh.p;
  // the skylight's square of light on the floor (the auction ring, the arcade), stopped dust in it
  for (const [x0, y0, w, h] of [[7 * 16, 4 * 16, 6 * 16, 4 * 16], [21 * 16, 5 * 16, 13 * 16, 2 * 16]] as const)
    for (let y = y0; y < y0 + h; y++)
      for (let x = x0; x < x0 + w; x++) {
        if (((x + y) & 1) === 0 || (x - x0 > 3 && x - x0 < w - 3 && y - y0 > 3 && y - y0 < h - 3)) blend(p, x, y, '#FFF6D8', 0.18);
        if (ihash(x, y, 3617) % 400 === 0) p.set(x, y - 6, '#FFFFFF');
      }
  // the wall over あぜ道市: old painted fish on the boards (what is left of a sign)
  for (let k = 0; k < 3; k++) {
    const fx = 22 * 16 + k * 80;
    p.poly([[fx, 18], [fx + 14, 14], [fx + 22, 18], [fx + 14, 22]], '#8E95A6');
    p.poly([[fx + 22, 18], [fx + 28, 13], [fx + 28, 23]], '#8E95A6');
  }
  const img = p.toCanvas();
  const glass = sh.glass.toCanvas();
  return { ox: 0, oy: 0, w: sh.w * 16, h: sh.h * 16, foot: 0, flat: true, img: () => img, glass } satisfies PropArt;
});

/** A block of fish boxes (4×2 tiles): white foam boxes, ice, the catch of 8月31日 (stopped, glistening). */
registerProp('prop_c3_sakanabako', (opts) =>
  standProp(64, 36, (p) => {
    for (let r = 0; r < 2; r++)
      for (let k = 0; k < 4; k++) {
        const x = k * 16 + 1;
        const y = r * 16 + 6;
        p.rect(x, y, 14, 12, '#F4F1E8');
        p.hline(x, x + 13, y, '#FFFFFF');
        p.vline(x + 13, y + 1, y + 11, '#C8C2B4');
        p.hline(x, x + 13, y + 11, '#C8C2B4');
        p.rect(x + 2, y + 2, 10, 6, '#C8E8F4');
        const fish = (ihash(k, r, 3621 + Number(opts.v ?? 0)) % 3) as 0 | 1 | 2;
        const fc = ['#9AA0A8', '#C8452E', '#C8CDD4'][fish];
        for (let f = 0; f < 3; f++) {
          p.hline(x + 3, x + 10, y + 3 + f * 2, fc);
          p.set(x + 3, y + 3 + f * 2, '#2A2440');
        }
      }
  }, { cx: 32, base: 32, shadow: 0, foot: 31 }),
);

/** セリ台 (9–10,3): a wooden stand, the bell and the wooden mallet, the price-tag stand. */
registerProp('prop_c3_seridai', () =>
  standProp(32, 30, (p) => {
    p.rect(1, 12, 30, 14, '#A87A4A');
    p.hline(1, 30, 12, '#C8A06A');
    for (let x = 1; x < 31; x += 6) p.vline(x, 13, 25, '#8A5A3A');
    p.rect(4, 4, 6, 7, '#D9A441');
    p.ellipse(7, 4, 3, 2, '#F6D98A');
    p.vline(7, 0, 3, '#5A3A2A');
    p.rect(20, 8, 8, 3, '#8A5A3A');
    p.vline(26, 4, 8, '#5A3A2A');
    p.ellipse(27, 9, 2, 1, '#0B0B14'); // the black stamp on the mallet (60 S07)
    p.rect(14, 2, 4, 9, '#E8D9B5');
    p.hline(14, 17, 4, '#2A2440');
  }, { cx: 16, base: 16, shadow: 20 }),
);

/**
 * An empty shop of あぜ道市 (5 tiles): its shutter down, a faded hand-painted
 * fish on it; the counter in front (S, the row below). `v` varies the fish.
 */
registerProp('prop_c3_akimise', (opts) =>
  standProp(80, 34, (p) => {
    const v = Number(opts.v ?? 0);
    p.rect(0, 0, 80, 18, '#9AA0A8');
    for (let y = 1; y < 18; y += 2) p.hline(0, 79, y, '#8A9098');
    p.rect(0, 0, 80, 3, '#6B7186');
    p.hline(0, 79, 0, '#B8BCC4');
    const fx = 22 + v * 9;
    p.poly([[fx, 10], [fx + 14, 6], [fx + 22, 10], [fx + 14, 14]], mix('#3A7EA8', '#9AA0A8', 0.4));
    p.poly([[fx + 22, 10], [fx + 28, 5], [fx + 28, 15]], mix('#3A7EA8', '#9AA0A8', 0.4));
    p.set(fx + 5, 9, '#3A3F48');
    // the counter (empty)
    p.rect(0, 18, 80, 16, '#8A7A60');
    p.rect(0, 18, 80, 4, '#B8A888');
    p.hline(0, 79, 18, '#D8C8A8');
    for (let x = 0; x < 80; x += 16) p.vline(x, 22, 33, '#6A5A48');
  }, { cx: 40, base: 32, shadow: 0, foot: 31 }),
);

/** The ice box and the platform scale in the auction floor's west corner (1–2,10). */
registerProp('prop_c3_hakari', () =>
  standProp(32, 22, (p) => {
    p.rect(1, 8, 14, 13, '#F4F1E8');
    p.hline(1, 14, 8, '#FFFFFF');
    p.rect(3, 9, 10, 4, '#C8E8F4');
    p.rect(18, 14, 12, 7, '#9AA0A8');
    p.rect(20, 4, 8, 10, '#C8CDD4');
    p.ellipse(24, 8, 3, 3, '#F4F1E8');
    p.vline(24, 6, 8, '#E84E3C');
  }, { cx: 16, base: 16, shadow: 16 }),
);

/** The wooden board 「セリ場」 by the auction floor (strokes), a hose reel. */
registerProp('prop_c3_hose', () =>
  standProp(14, 14, (p) => {
    p.ellipse(7, 7, 6, 6, '#3FA66B');
    p.ellipse(7, 7, 3, 3, '#2E6B4A');
    p.ellipse(7, 7, 1, 1, '#3A3F48');
  }, { cx: 8, base: 16, shadow: 8 }),
);

void outline;
void fontTextSmall;
