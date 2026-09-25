// ツガオ便 at the turning circle and the delivery stands (52_ch2_level_art
// 3.1・3.5・3.6・7.3・10.6, 50 10.20 「野菜を一緒に家に運ぼう」).
//
// prop_tsugao_truck and prop_pokosha_bike belong to the chars team (they are
// kept for chapter 3 too). Until their art is registered this module lends
// its own — registered after every module has loaded and only if nobody else
// registered the id, so the chars team's always win:
//   prop_tsugao_truck   48×32, facing west on (42–44,41–42): an olive kei
//                       truck, the yellow crates, ツガオさん asleep in his
//                       spotted nightcap behind the cab window (h3: his cap).
//   prop_pokosha_bike   16×16 on (45,44): a big black carrier bicycle.
//
// The delivery (evt_ch2_delivery), drawn on the house walls where the texts
// are read (52 3.5 野菜の配達の置き台):
//   prop_h_deli_dai   opts { n: 1|2|3|5 }  the stand itself, always there (a
//                     crate, a low stand, the back-door stand, a rice sack)
//   prop_h_deli_note  opts { n }  its yellow slip and white note — placed
//                     litOnly in the map: only the lantern shows them
//   prop_h_deli_bag   opts { n }  the vegetables left on it (6×6)

import { mix, PixelCanvas } from '../../engine/pixel';
import { P } from '../tiles/palette';
import { outline } from './kit';
import { hs, standProp } from './hoshi_kit';
import { hasProp, registerProp } from './registry';
import type { PropArt, PropEnv } from './types';

const OLIVE = '#5A6B2A';
const OLIVE_LT = '#7A8B3A';
const OLIVE_DK = '#3A4A1A';

// ---------------------------------------------------------------- the olive kei truck (fallback)

/** The truck side-on, facing west (48×32); `morning`: the driver awake in his work cap. */
function tsugaoTruck(morning: boolean, bob: number): HTMLCanvasElement {
  const p = new PixelCanvas(48, 32);
  // underbody and bumpers
  p.rect(3, 22, 42, 4, P.charcoal);
  p.hline(3, 44, 25, P.ink);
  p.rect(0, 21, 4, 3, P.steel);
  p.hline(0, 3, 21, P.concreteLt);
  p.rect(44, 20, 3, 4, P.steel);
  // the cab (west): olive, a flat face
  p.rect(3, 4, 13, 18, OLIVE);
  p.hline(4, 14, 3, OLIVE_LT);
  p.hline(3, 15, 4, OLIVE_LT);
  p.rect(1, 9, 3, 12, OLIVE);
  p.vline(1, 9, 20, OLIVE_DK);
  p.line(3, 4, 1, 9, OLIVE);
  // the side window with ツガオさん in it (8×6)
  p.rect(7, 6, 8, 6, P.navy);
  p.hline(7, 14, 6, P.blue);
  if (morning) {
    // awake: the olive work cap, the sideburns, a still face
    p.rect(9, 7, 5, 2, OLIVE);
    p.hline(8, 13, 9, OLIVE_DK);
    p.rect(10, 10 - 0, 3, 2, P.skin4);
    p.set(10, 10, P.ink);
  } else {
    // asleep: the white nightcap with navy spots and its pompom, the head tipped 1px
    p.rect(9, 8 + bob, 4, 3, P.skin4);
    p.poly([[8, 9 + bob], [13, 9 + bob], [14, 6 + bob], [11, 6 + bob]], P.white);
    p.set(10, 8 + bob, P.navy);
    p.set(12, 7 + bob, P.navy);
    p.set(14, 6 + bob, P.concreteLt); // the pompom
    p.set(15, 6 + bob, P.white);
  }
  p.line(3, 5, 6, 11, P.navy); // the windscreen, edge-on
  p.vline(6, 6, 20, OLIVE_DK);
  p.vline(15, 12, 20, OLIVE_DK);
  p.hline(9, 11, 14, P.steel); // the handle
  // the door's hand-painted lettering (「青果 ツガオ便」 as white strokes, not to be read)
  p.hline(8, 13, 16, P.white);
  p.set(9, 17, P.white);
  p.set(11, 17, P.white);
  p.hline(12, 13, 18, P.white);
  p.rect(0, 7, 2, 3, P.charcoal); // mirror
  p.rect(1, 15, 2, 2, P.steel); // the headlight (off)
  // the headboard guard
  p.vline(16, 5, 21, P.steel);
  // the bed and its gates
  p.rect(17, 14, 29, 8, OLIVE);
  p.hline(17, 45, 14, OLIVE_LT);
  p.hline(17, 45, 18, OLIVE_DK);
  for (const x of [26, 36]) p.vline(x, 15, 21, OLIVE_DK);
  p.rect(45, 16, 2, 3, P.red);
  // the clipboard of slips hung on the tailgate
  p.rect(41, 15, 3, 4, P.woodLt);
  p.hline(41, 43, 15, P.white);
  // the yellow crates, two tiers of three (the handle holes dark)
  for (const [x, y] of [[18, 9], [27, 9], [36, 9], [21, 4], [30, 4]] as const) {
    p.rect(x, y, 8, 5, P.gold);
    p.hline(x, x + 7, y, P.goldPale);
    p.vline(x + 7, y + 1, y + 4, P.brass);
    p.hline(x + 2, x + 4, y + 2, P.brassOld);
  }
  // wheels
  for (const cx of [10, 39]) {
    for (let y = 19; y <= 25; y++) for (let x = cx - 6; x <= cx + 6; x++) if (Math.hypot(x - cx, (y - 26) * 1.05) <= 5.8) p.set(x, y, P.ink);
    p.ellipse(cx, 26, 4.6, 4.6, P.ink);
    p.ellipse(cx, 26, 3.6, 3.6, P.charcoal);
    p.ellipse(cx, 26, 2, 2, P.steel);
  }
  for (const x of [5, 6, 15, 24, 33]) p.set(x, 21, P.brassOld); // dried mud on the sills
  outline(p, { bottom: true, soft: true });
  return p.toCanvas();
}

function tsugaoTruckArt(): PropArt {
  const night = [tsugaoTruck(false, 0), tsugaoTruck(false, 1)];
  let day: HTMLCanvasElement | null = null;
  return {
    ox: 0,
    oy: 0,
    w: 48,
    h: 32,
    foot: 30,
    // the nightcap's pompom nods with his breathing (4 s)
    img: (env: PropEnv) => (hs(env) >= 3 ? (day ??= tsugaoTruck(true, 0)) : night[Math.floor(env.t / 2000) % 2]),
    shadow: 20,
    contact: 42,
    contactX: 24,
  };
}

/** ポコシャさん's big black carrier bicycle (16×16): straw in the front basket, no logo. */
function pokoshaBike(): PropArt {
  return standProp(
    18,
    16,
    (p) => {
      const K = '#1B1733';
      for (const cx of [4, 13]) {
        p.ring(cx, 11, 3.5, 3.5, K);
        p.set(cx, 11, P.charcoal);
      }
      p.line(4, 11, 8, 6, K); // the frame
      p.line(8, 6, 13, 11, K);
      p.line(8, 6, 12, 6, K);
      p.line(12, 6, 13, 11, P.charcoal);
      p.vline(8, 4, 6, K); // the seat post, the saddle
      p.hline(7, 9, 3, P.charcoal);
      p.rect(9, 4, 6, 2, P.asphalt); // the rear carrier
      p.hline(9, 14, 4, P.steel);
      p.line(3, 4, 4, 10, K); // the fork and the bars
      p.hline(1, 4, 3, K);
      p.rect(0, 4, 4, 3, P.woodDark); // the front basket, straw in it
      p.hline(0, 3, 4, P.woodLt);
      p.set(1, 3, P.goldPale);
      p.set(3, 3, P.woodLt);
    },
    { cx: 9, base: 16, shadow: 10 },
  );
}

// registered once every module has run, and only where the chars team has not
queueMicrotask(() => {
  if (!hasProp('prop_tsugao_truck')) registerProp('prop_tsugao_truck', () => tsugaoTruckArt());
  if (!hasProp('prop_pokosha_bike')) registerProp('prop_pokosha_bike', () => pokoshaBike());
});

// ---------------------------------------------------------------- the delivery stands (evt_ch2_delivery)

/**
 * The stand at a house's door (52 3.5), drawn at the foot of the wall tile it
 * is read from: 1 タケじい's crate, 2 エー区長's low stand, 3 the back-door
 * stand of シゲじい and スギばあ, 5 the rice sack at トマじい's door.
 */
registerProp('prop_h_deli_dai', (opts) => {
  const n = Number(opts.n ?? 1);
  if (n === 5)
    return standProp(
      12,
      12,
      (p) => {
        // a rice sack (#E8E4D8, 8×10), tied at the neck
        p.rect(2, 3, 8, 8, P.concreteLt);
        p.hline(3, 8, 2, P.concreteLt);
        p.hline(4, 7, 1, P.concrete);
        p.vline(9, 4, 10, P.concrete);
        p.hline(2, 9, 10, P.concrete);
        p.hline(4, 7, 3, P.brassOld); // the string
        p.hline(3, 8, 7, mix(P.concrete, P.leaf, 0.3)); // a faint printed band
      },
      { cx: 8, base: 16, foot: 18, shadow: 8 },
    );
  return standProp(
    14,
    10,
    (p) => {
      const top = n === 2 ? 4 : 2;
      // a wooden box / stand (#C8A06A, shade #8A5A3A)
      p.rect(1, top, 12, 10 - top, P.woodLt);
      p.hline(1, 12, top, P.goldPale);
      p.vline(12, top + 1, 9, P.wood);
      p.hline(1, 12, 9, P.wood);
      if (n === 1) {
        p.hline(1, 12, 5, P.wood); // the crate's slats
        p.vline(6, top + 1, 8, P.wood);
      }
      if (n === 3) p.vline(3, top + 1, 8, P.wood);
    },
    { cx: 8, base: 16, foot: 18, shadow: 8 },
  );
});

/** The slip (the same yellow as the delivery slips) and the handwritten note: only in the lantern's light. */
registerProp('prop_h_deli_note', (opts) => {
  const n = Number(opts.n ?? 1);
  const art = standProp(
    12,
    14,
    (p) => {
      // the white note on the wall above the stand (6×5) and its line of writing
      p.rect(1, 0, 6, 5, P.white);
      p.hline(1, 6, 0, P.glint);
      if (n === 2) p.hline(2, 3, 1, P.ink); // 「えー、」 heading the note
      for (let r = 0; r < 2; r++) {
        const y = 2 + r * 2;
        if (n === 3) {
          p.set(2, y - 1, P.ink);
          p.set(3, y, P.ink); // the lines slope down to the right
          p.set(4, y, P.ink);
          p.set(5, y + 1, P.ink);
        } else p.hline(2, 5 - r, y, P.ink);
      }
      // the yellow slip on the stand (2×2)
      p.rect(8, 10, 2, 2, P.gold);
      p.set(8, 10, P.goldPale);
    },
    { cx: 7, base: 16, shadow: 0, outline: false },
  );
  return { ...art, oy: art.oy - 4, foot: 19 };
});

/**
 * The vegetables left on a stand (52 3.5): a thin white produce bag, its
 * handles tied, the vegetables showing through the film and out of its
 * mouth — a different share at each house: 1 tomatoes and shishito, 2
 * aubergines and a tomato, 3 a bunch of shishito and an aubergine, 4 a
 * small kabocha beside a bag of tomatoes.
 */
registerProp('prop_h_deli_bag', (opts) => {
  const n = Number(opts.n ?? 1);
  const FILM = (c: string) => mix(c, P.white, 0.28); // seen through the bag
  const tomato = (p: PixelCanvas, x: number, y: number, film = true) => {
    const f = film ? FILM : (c: string) => c;
    p.rect(x, y, 3, 3, f('#E84E3C'));
    p.set(x, y, f('#FF6A4D'));
    p.set(x + 2, y + 2, f(P.vermShade));
    p.set(x + 1, y, f(P.leafDeep)); // the calyx
  };
  const nasu = (p: PixelCanvas, x: number, y: number, len: number, film = true) => {
    const f = film ? FILM : (c: string) => c;
    for (let k = 0; k < len; k++) {
      p.set(x + (k > len - 3 ? 1 : 0), y + k, f(k === 0 ? P.leafShade : '#4A2E5C'));
      p.set(x + 1 + (k > len - 3 ? 1 : 0), y + k, f(k === 0 ? P.leafDeep : k === 1 ? '#7A5AA0' : '#5B3A6E'));
    }
  };
  const shishito = (p: PixelCanvas, x: number, y: number, film = true) => {
    const f = film ? FILM : (c: string) => c;
    p.line(x, y, x + 1, y + 4, f(P.leaf));
    p.set(x, y, f(P.leafShade));
    p.set(x + 1, y + 3, f(P.leafYoung));
  };
  return standProp(
    12,
    12,
    (p) => {
      // the bag: white film, its folds shaded, the tied handles on top
      const x0 = n === 4 ? 1 : 2;
      for (let j = 4; j < 12; j++)
        for (let i = x0; i < x0 + 8; i++) {
          const edge = i === x0 || i === x0 + 7 || j === 11;
          p.set(i, j, edge ? P.concrete : (i + j) % 5 === 0 ? P.concreteLt : P.white);
        }
      if (n === 1) {
        tomato(p, x0 + 1, 7);
        tomato(p, x0 + 4, 8);
        shishito(p, x0 + 4, 3, false);
        shishito(p, x0 + 5, 4, false);
      } else if (n === 2) {
        nasu(p, x0 + 1, 3, 7, false);
        nasu(p, x0 + 4, 4, 6, false);
        tomato(p, x0 + 3, 8);
      } else if (n === 3) {
        for (let k = 0; k < 4; k++) shishito(p, x0 + 1 + k, 3 + (k & 1), k > 1);
        nasu(p, x0 + 5, 5, 6);
      } else {
        tomato(p, x0 + 1, 6);
        tomato(p, x0 + 4, 7);
        tomato(p, x0 + 2, 8);
      }
      // the mouth of the bag and the knot of the handles
      p.hline(x0 + 1, x0 + 6, 4, P.concreteLt);
      p.set(x0 + 2, 3, P.white);
      p.set(x0 + 5, 3, P.white);
      p.set(x0 + 3, 2, P.concrete);
      p.set(x0 + 4, 2, P.white);
      if (n === 4) {
        // a small kabocha beside the bag: dark green with pale specks, its stalk
        p.ellipse(10, 9, 2, 2, '#3F6A3A');
        p.set(9, 8, '#5A8A4A');
        p.set(11, 10, P.brass);
        p.set(9, 10, P.brass);
        p.set(10, 6, P.woodDark);
      }
    },
    { cx: 7, base: 14, foot: 19, shadow: 4 },
  );
});
