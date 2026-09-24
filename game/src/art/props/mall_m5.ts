// M5 迷子センター (30_level_art 5.5, 14×11). The boss room: darker than the
// rest (pal_maigo), lit by one fluorescent tube that comes on and goes out
// every 1.3 s (in step with amb_fluorescent_flicker). Pastel wallpaper gone
// grey, the 『まいごセンター』 sign, a faded poster of the bell-headed mascot,
// children's drawings; the low counter 『どうしたの？』 with the log book and
// the dead microphone; a heap of unclaimed lost things in the corner whose
// outline trembles 1px (#3A2B5C) — the boss is waiting in it.

import type { Gfx } from '../../engine/gfx';
import { mix, PixelCanvas, rgba32 } from '../../engine/pixel';
import { getMapDef } from '../../world/maps';
import { mallTiles } from '../tiles/ifloor';
import { ihash, valueNoise } from '../tiles/noise';
import { P } from '../tiles/palette';
import { kidDrawing, pc, prop } from './ifurn';
import { blend, depthShade, lightPool, paintShell, screenPool, shellProp } from './ishell';
import { lvTime } from './istate';
import { castRight, dk, finish, lt, outline } from './kit';
import { mallGrade } from './mall_kit';
import { maigoOutGlow, maigoOutOver, maigoWindows, withMaigoOut } from './mall_m5_out';
import { mkFrames, stand } from './pkit';
import { registerProp } from './registry';
import { fontText, fontTextSmall, fontWidth, printLines, tiny } from './text';
import type { PropArt, PropEnv } from './types';

/** The lone tube: on for 1.3 s, off for 1.3 s, from the moment you come in. */
export function maigoTubeOn(t: number): boolean {
  if (lvTime.map !== 'map_mall_maigo') return true;
  return Math.floor((t - lvTime.enterT) / 1300) % 2 === 0;
}

// ---------------------------------------------------------------- shell

registerProp('mall_m5_shell', () => {
  const rows = getMapDef('map_mall_maigo')?.rows ?? [];
  const blocked = (tx: number, ty: number) => ty <= 5 || (ty === 7 && tx <= 3) || (tx <= 4 && ty >= 6);
  const tiles = mallTiles({ seed: 551, w: 14, h: 11, blocked, decals: [{ x: 150, y: 130, kind: 'balloon' }, { x: 176, y: 148, kind: 'tape', w: 20, h: 10 }] });
  const sh = paintShell({
    rows,
    floor: (x, y, tx, ty) => {
      // the play corner: faded interlocking foam mats (1–4, 6–9)
      if (tx >= 1 && tx <= 4 && ty >= 6 && ty <= 9) return foamMat(x, y);
      return tiles(x, y);
    },
    wall: (x, y, fh) => {
      // pastel wallpaper gone grey: small bell and star motifs, a wooden chair rail, a wainscot
      if (y === fh - 16) return P.woodLt;
      if (y === fh - 15) return P.wood;
      if (y > fh - 15) return valueNoise(x / 6, y / 4, 555) > 0.78 ? P.paper : P.paperGrid;
      const mx = x % 12;
      const my = y % 12;
      if ((mx === 3 && my === 3) || (mx === 9 && my === 9)) return P.skin2;
      if ((mx === 3 && my === 4) || (mx === 9 && my === 10)) return P.skin3;
      return valueNoise(x / 9, y / 9, 557) > 0.8 ? P.paper : P.skin1;
    },
    trim: P.nightShade,
    base: P.woodDark,
    baseH: 3,
  });
  const p = sh.p;
  // ---- the sign 『まいごセンター』 on a pink rounded board
  const tw = fontWidth('まいごセンター');
  const bx = Math.round((224 - tw) / 2) - 6;
  const bw = tw + 12;
  p.rect(bx + 1, 3, bw - 2, 18, P.peach);
  p.rect(bx, 4, bw, 16, P.peach);
  p.hline(bx + 1, bx + bw - 2, 3, P.skin1);
  p.hline(bx + 1, bx + bw - 2, 20, P.sunShade);
  fontText(p, 'まいごセンター', bx + 6, 5, P.white, { shadow: P.sunShade });
  castRight(p, bx, 3, bw, 18, 3);
  // ---- the faded mascot poster (the bell-headed one) on the left
  mascotPoster(p, 18, 5);
  // ---- a board of 『迷子のお知らせ』 sheets
  p.rect(52, 24, 30, 18, P.woodLt);
  p.strokeRect(51, 23, 32, 20, P.wood);
  for (let k = 0; k < 3; k++) {
    const x = 54 + k * 9;
    p.rect(x, 25 + (k % 2), 8, 15, P.white);
    printLines(p, x + 1, 27 + (k % 2), 6, 5, P.steel, 60 + k);
    p.set(x + 3, 25 + (k % 2), P.verm);
  }
  castRight(p, 51, 23, 32, 20, 2);
  // ---- children's drawings (right) — one of them draws the mascot
  kidDrawing(p, 176, 6, 13, 11, 1);
  kidDrawing(p, 191, 8, 13, 10, 2);
  kidDrawing(p, 180, 22, 12, 10, 3);
  for (const [x, y, w, h] of [[176, 6, 13, 11], [191, 8, 13, 10], [180, 22, 12, 10]] as const) castRight(p, x, y, w, h, 1);
  // a small wall clock, stopped
  p.ellipse(158.5, 31.5, 5, 5, P.woodDark);
  p.ellipse(158.5, 31.5, 4, 4, P.paper);
  p.line(158, 31, 158, 28, P.ink);
  p.line(158, 31, 160, 34, P.ink);
  // ---- floor: a dropped mitten, a hair clip, a lonely indoor shoe by the door
  p.rect(148, 136, 6, 3, P.white);
  p.rect(148, 136, 2, 3, P.red);
  p.rect(60, 122, 3, 2, P.crimson);
  // ---- the heavy door (6,10)
  const dx = 96;
  const dy = 160;
  p.rect(dx - 3, dy, 22, 2, P.steel);
  p.hline(dx - 3, dx + 18, dy, P.concreteLt);
  p.rect(dx, dy + 2, 16, 9, P.asphalt);
  p.vline(dx + 8, dy + 2, dy + 10, P.charcoal);
  p.hline(dx - 1, dx + 16, dy + 11, P.ink);
  // its small wired-glass window (the tube's light shows through it on the corridor)
  p.rect(dx + 5, dy + 3, 6, 5, mix(P.aqua, P.nightShade, 0.6));
  p.hline(dx + 5, dx + 10, dy + 3, P.steel);
  for (let k = 0; k < 6; k += 2) p.set(dx + 5 + k, dy + 5, P.asphalt);
  p.set(dx + 6, dy + 4, mix(P.aqua, P.white, 0.4));
  // the two low windows in the south wall either side of the door
  maigoWindows(p);
  const W = p.w;
  // set into the 2F round it (mall_m5_out.ts): corridor, neighbours, plenum
  const ext = withMaigoOut(p);
  return shellProp({
    img: ext.img,
    ox: ext.ox,
    oy: ext.oy,
    over(g: Gfx, x: number, y: number, env: PropEnv) {
      maigoOutOver(g, x, y, env, maigoTubeOn(env.t));
      depthShade(g, x + 16, y + 48, W - 32, 96, 0.2);
    },
    light(g: Gfx, x: number, y: number, env: PropEnv) {
      mallGrade(g, 'maigo', env);
      // the lone tube: a circle of yellowed light in the middle while it's on (#F4E6A8 α25%)
      if (maigoTubeOn(env.t)) lightPool(g, x + 104, y + 84, 58, 38, '#F4E6A8', 0.22);
    },
    glow(g: Gfx, x: number, y: number, env: PropEnv) {
      const on = maigoTubeOn(env.t);
      if (on) screenPool(g, x + 104, y + 84, 50, 30, '#F4E6A8', 0.1);
      maigoOutGlow(g, x, y, env, on);
    },
  });
});

/** Faded interlocking foam mats: pastel squares with notched edges. */
function foamMat(x: number, y: number): string {
  const tx = Math.floor((x - 16) / 16);
  const ty = Math.floor((y - 96) / 16);
  const lx = (x - 16) & 15;
  const ly = (y - 96) & 15;
  const cols = [P.skin1, P.aqua, P.leafLt, P.goldPale];
  const c = cols[(tx + ty * 3) % 4];
  // puzzle teeth along the seams
  const toothX = lx === 0 && ly >= 5 && ly <= 10;
  const toothY = ly === 0 && lx >= 5 && lx <= 10;
  if (toothX || toothY) return dk(c);
  if (lx === 15 || ly === 15) return dk(c);
  if (lx === 0 || ly === 0) return lt(c);
  // a faded letter in some squares
  const hh = ihash(tx, ty, 559);
  if (hh % 3 === 0 && lx >= 5 && lx <= 10 && ly >= 5 && ly <= 10 && (lx === 5 || ly === 10 || lx === 10)) return P.paperGrid;
  return c;
}

/** The mall mascot poster, bleached: the bell-headed character waving, 『よいこの みかた』. */
function mascotPoster(p: PixelCanvas, x: number, y: number): void {
  const w = 28;
  const h = 40;
  p.rect(x, y, w, h, P.paper);
  p.hline(x, x + w - 1, y + h - 1, P.paperGrid);
  p.vline(x + w - 1, y, y + h - 1, P.paperGrid);
  // sky gone pale
  p.rect(x + 1, y + 1, w - 2, 14, P.skin1);
  // the bell head (faded brass): a knob, the dome, the flared rim; the face; the body (faded orange), a waving arm
  const cx = x + 14;
  p.rect(cx - 1, y + 3, 3, 2, P.brass);
  p.ellipse(cx + 0.5, y + 10, 6, 6, P.goldPale);
  p.rect(cx - 6, y + 10, 13, 5, P.goldPale);
  p.hline(cx - 8, cx + 9, y + 15, P.goldPale);
  p.hline(cx - 8, cx + 9, y + 16, P.brass);
  p.vline(cx - 4, y + 7, y + 13, P.paper);
  p.set(cx - 2, y + 11, P.woodDark);
  p.set(cx + 3, y + 11, P.woodDark);
  p.hline(cx, cx + 1, y + 13, P.skin4);
  p.rect(cx - 5, y + 18, 11, 9, P.skin2);
  p.hline(cx - 5, cx + 5, y + 18, P.skin1);
  p.line(cx + 5, y + 20, cx + 9, y + 16, P.skin2);
  p.rect(cx - 4, y + 27, 3, 3, P.skin3);
  p.rect(cx + 2, y + 27, 3, 3, P.skin3);
  // text strokes 『よいこの みかた カネナリくん』
  printLines(p, x + 3, y + 31, 22, 2, P.peach, 91, 2);
  printLines(p, x + 6, y + 36, 16, 1, P.skin3, 93);
  castRight(p, x, y, w, h, 2);
  // one tape corner has let go
  p.rect(x - 1, y - 1, 3, 2, P.goldPale);
  p.set(x + w - 1, y, P.paperGrid);
  p.set(x + w - 2, y, P.paperGrid);
}

// ---------------------------------------------------------------- the low counter 『どうしたの？』 (3–7,3)

registerProp('mall_maigo_counter', () =>
  prop(80, 30, (p) => {
    const Y = 6; // headroom for the microphone's gooseneck
    // child-height counter: pale wood top, a pastel front with the question
    p.rect(0, Y + 6, 80, 4, P.woodLt);
    p.hline(0, 79, Y + 6, P.goldPale);
    p.hline(0, 79, Y + 9, P.wood);
    p.rect(0, Y + 10, 80, 12, P.paper);
    p.hline(0, 79, Y + 10, P.white);
    p.rect(0, Y + 20, 80, 2, P.skin2);
    fontTextSmall(p, 'どうしたの？', 14, Y + 12, P.sunShade, 1);
    p.ellipse(6, Y + 15, 2.5, 2.5, P.aqua);
    p.ellipse(73, Y + 15, 2.5, 2.5, P.leafLt);
    p.rect(0, Y + 22, 80, 2, P.woodDark);
    // the log book (x4): open, lines, the last page with no name
    p.rect(17, Y + 1, 14, 7, P.white);
    p.vline(24, Y + 1, Y + 7, P.concrete);
    printLines(p, 18, Y + 2, 5, 3, P.steel, 7);
    printLines(p, 25, Y + 2, 4, 1, P.steel, 9);
    p.rect(15, Y + 2, 2, 6, P.navy);
    // a tissue box and a small plush rabbit waiting on the counter
    p.rect(35, Y + 2, 8, 5, P.aqua);
    p.hline(35, 42, Y + 2, P.glint);
    p.rect(38, Y + 1, 2, 2, P.white);
    p.ellipse(68, Y + 5, 3, 2.5, P.peach);
    p.rect(66, Y, 1, 3, P.peach);
    p.rect(69, Y, 1, 3, P.peach);
    p.set(67, Y + 4, P.ink);
    p.set(69, Y + 4, P.ink);
    // the broadcast microphone (x6): a round chrome head on a segmented
    // gooseneck, a heavy base, its 『放送中』 lamp dark
    p.rect(49, Y + 4, 11, 4, P.charcoal);
    p.hline(49, 59, Y + 4, P.asphalt);
    p.hline(50, 58, Y + 7, P.ink);
    p.rect(51, Y + 5, 3, 2, P.maroon);
    p.set(51, Y + 5, P.vermShade);
    for (const [x, y] of [[56, Y + 3], [56, Y + 2], [57, Y + 1], [57, Y], [58, Y - 1], [59, Y - 2]] as const) {
      p.set(x, y, (x + y) % 2 ? P.steel : P.asphalt);
    }
    p.ellipse(61, Y - 4, 2.6, 2.6, P.steel);
    p.ellipse(61, Y - 4, 1.6, 1.6, P.charcoal);
    p.set(60, Y - 5, P.concreteLt);
    p.set(62, Y - 3, P.asphalt);
  }, { cx: 40, base: 16 + 0, contact: 0, shadow: 0 }),
);

// ---------------------------------------------------------------- the heap of lost things (8–11, 3–5)

const PILE_W = 68;
const PILE_H = 64;
let PILE: { img: HTMLCanvasElement; rim: HTMLCanvasElement } | null = null;

/** One lost thing: painted on its own canvas and outlined (ink below/right, a darker tone above/left). */
function thing(w: number, h: number, paint: (p: PixelCanvas) => void): PixelCanvas {
  const p = new PixelCanvas(w + 2, h + 2);
  const inner = new PixelCanvas(w, h);
  paint(inner);
  p.blit(inner, 1, 1);
  outline(p, { soft: true, bottom: true });
  return p;
}

/**
 * The heap: about twenty unclaimed things piled back to front against the
 * wall — coats at the bottom, an umbrella bundle and a big bear at the back,
 * the gym bag, the blue water bottle (#4AA8E0, the boss's colour), a yellow
 * school hat, a rabbit, a towel, the recorder, crayons, a ball, a lunch bag;
 * at the front a single indoor shoe, gloves, the shogi 『歩』, a sock, a
 * harmonica, a yo-yo. Each has its own colours, shade and outline; the base
 * sinks into shadow; umbrellas and ears poke out of the silhouette.
 */
function buildPile(): { img: HTMLCanvasElement; rim: HTMLCanvasElement } {
  const p = pc(PILE_W, PILE_H);
  const put = (t: PixelCanvas, x: number, y: number) => p.blit(t, x - 1, y - 1);
  // ---- the bulk: a navy duffle coat, a brown coat, a grey hoodie (big folds)
  put(thing(30, 30, (q) => {
    q.poly([[2, 29], [4, 8], [12, 2], [22, 3], [29, 12], [29, 29]], P.navy);
    q.line(4, 8, 12, 2, P.blue);
    q.line(12, 8, 10, 28, P.nightShade);
    q.line(20, 6, 22, 28, P.nightShade);
    for (const [x, y] of [[15, 10], [15, 16], [15, 22]] as const) q.rect(x, y, 2, 1, P.goldPale);
    q.line(5, 12, 9, 20, P.blue);
  }), 3, 32);
  put(thing(32, 32, (q) => {
    q.poly([[1, 31], [3, 10], [14, 1], [26, 4], [31, 16], [31, 31]], P.wood);
    q.line(3, 10, 14, 1, P.woodLt);
    q.line(10, 6, 12, 30, P.woodDark);
    q.line(22, 5, 26, 30, P.woodDark);
    q.rect(15, 12, 6, 8, P.woodDark);
    q.hline(15, 20, 12, P.wood);
  }), 30, 28);
  put(thing(26, 24, (q) => {
    q.poly([[0, 23], [3, 6], [12, 0], [22, 4], [25, 23]], P.asphalt);
    q.line(3, 6, 12, 0, P.steel);
    q.ellipse(12, 5, 5, 3, P.charcoal);
    q.line(8, 10, 9, 22, P.charcoal);
    q.vline(12, 8, 11, P.white);
    q.vline(14, 8, 12, P.white);
  }), 42, 40);
  // ---- the umbrella bundle leaning at the back, handles up (poking out)
  const umbrellas: [number, string, string][] = [[38, P.navy, P.blue], [42, P.red, P.vermLt], [46, P.concreteLt, P.white], [50, P.gold, P.goldPale], [54, P.aqua, P.white]];
  umbrellas.forEach(([ux, c, l], i) => {
    const top = 2 + (i % 2) * 3;
    const lean = i < 2 ? -1 : i > 2 ? 1 : 0;
    put(thing(10, 30, (q) => {
      // leaning in the bundle: the J handle on top, the furled canopy, its strap
      const tx = 4 + lean * 3;
      q.vline(tx + 1, 0, 2, P.charcoal);
      q.set(tx + 2, 3, P.charcoal);
      q.set(tx + 3, 2, P.charcoal);
      q.set(tx, 0, P.charcoal);
      q.poly([[tx, 4], [tx + 3, 4], [5, 29], [3, 29]], c);
      q.line(tx + 1, 5, 4, 27, l);
      const my = 14;
      const mx = Math.round(tx + (4 - tx) * (my / 29));
      q.hline(mx, mx + 3, my, dk(c));
      q.set(mx + 3, my + 1, P.white);
    }), ux - 4 - i, top);
  });
  // ---- a big teddy bear sitting at the back left
  put(thing(16, 17, (q) => {
    q.ellipse(4, 3, 2.5, 2.5, P.woodLt);
    q.ellipse(12, 3, 2.5, 2.5, P.woodLt);
    q.ellipse(8, 7, 6, 5.5, P.woodLt);
    q.ellipse(8, 14, 7, 4, P.brass);
    q.ellipse(7, 6, 3, 2.5, P.goldPale);
    q.set(6, 7, P.ink);
    q.set(10, 7, P.ink);
    q.rect(7, 9, 3, 2, P.paperGrid);
    q.set(8, 9, P.ink);
    q.hline(4, 12, 12, P.verm);
    q.set(8, 13, P.vermShade);
  }), 8, 14);
  // ---- the gym-clothes bag (navy drawstring bag, a blank white name tag)
  put(thing(14, 13, (q) => {
    q.poly([[2, 1], [11, 1], [13, 12], [0, 12]], P.navy);
    q.hline(2, 11, 1, P.blue);
    q.hline(3, 10, 3, P.white);
    q.rect(4, 6, 6, 4, P.white);
    q.hline(4, 9, 9, P.concrete);
    q.line(0, 0, 3, 3, P.white);
  }), 20, 26);
  // ---- a yellow school hat
  put(thing(13, 7, (q) => {
    q.ellipse(6, 3, 5, 3, P.gold);
    q.ellipse(5, 2, 3, 1.5, P.goldPale);
    q.hline(0, 12, 5, P.brass);
    q.hline(2, 10, 6, P.brassOld);
    q.hline(3, 9, 4, P.sunShade);
  }), 40, 22);
  // ---- a pink rabbit, ears up (poking out of the silhouette)
  put(thing(9, 15, (q) => {
    q.rect(1, 0, 2, 6, P.skin1);
    q.rect(6, 0, 2, 6, P.skin1);
    q.vline(2, 1, 4, P.peach);
    q.vline(6, 1, 4, P.peach);
    q.ellipse(4, 8, 4, 3.5, P.skin1);
    q.ellipse(4, 12.5, 4, 2.5, P.skin2);
    q.set(3, 8, P.ink);
    q.set(5, 8, P.ink);
    q.set(4, 9, P.peach);
  }), 54, 20);
  // ---- a towel draped over the coat (aqua with white stripes)
  put(thing(16, 9, (q) => {
    q.poly([[0, 1], [15, 0], [15, 6], [10, 8], [0, 7]], P.aqua);
    for (const x of [3, 8, 13]) q.vline(x, 0, 7, P.white);
    q.hline(0, 15, 0, P.glint);
    q.line(10, 8, 15, 6, P.blue);
  }), 8, 35);
  // ---- the blue water bottle (the boss's colour), standing, strap looped
  put(thing(7, 15, (q) => {
    q.rect(1, 2, 5, 13, P.blue);
    q.vline(1, 2, 14, P.aqua);
    q.vline(5, 3, 14, P.navy);
    q.rect(1, 0, 5, 2, P.navy);
    q.hline(2, 4, 0, P.blue);
    q.hline(1, 5, 8, P.white);
    q.set(2, 4, P.glint);
    q.line(6, 2, 6, 7, P.charcoal);
  }), 31, 31);
  // ---- the recorder lying across (cream, finger holes, a brown mouthpiece)
  put(thing(19, 7, (q) => {
    q.line(0, 6, 17, 0, P.paperGrid);
    q.line(1, 6, 18, 0, P.paper);
    q.line(0, 5, 3, 4, P.woodDark);
    q.line(0, 6, 3, 5, P.woodDark);
    for (const k of [6, 9, 12]) q.set(k, 6 - Math.round(k / 3), P.woodDark);
    q.set(17, 1, P.woodLt);
  }), 39, 38);
  // ---- a box of crayons
  put(thing(9, 6, (q) => {
    q.rect(0, 1, 9, 5, P.gold);
    q.hline(0, 8, 1, P.goldPale);
    [P.red, P.blue, P.leaf, P.crimson, P.navy, P.sun].forEach((c, i) => q.vline(1 + i, 0, 2, c));
    q.rect(2, 3, 5, 2, P.white);
  }), 15, 45);
  // ---- a red-and-white ball
  put(thing(7, 7, (q) => {
    q.ellipse(3, 3, 3.2, 3.2, P.red);
    q.hline(0, 6, 3, P.white);
    q.set(2, 1, P.vermLt);
    q.set(1, 2, P.vermLt);
  }), 57, 44);
  // ---- a lunch bag with a bear face
  put(thing(9, 8, (q) => {
    q.rect(0, 1, 9, 7, P.peach);
    q.hline(0, 8, 1, P.skin1);
    q.set(1, 0, P.peach);
    q.set(7, 0, P.peach);
    q.set(3, 4, P.ink);
    q.set(5, 4, P.ink);
    q.set(4, 5, P.sunShade);
  }), 4, 46);
  // ---- the front: one indoor shoe, a red glove and a navy mitten, the 歩,
  // a green sock, a harmonica, a yo-yo
  put(thing(11, 5, (q) => {
    q.rect(0, 0, 11, 4, P.white);
    q.rect(8, 0, 3, 4, P.red);
    q.hline(0, 10, 4, P.concrete);
    q.rect(2, 1, 5, 1, P.concreteLt);
    q.set(3, 1, P.blue);
  }), 42, 55);
  put(thing(6, 5, (q) => {
    q.rect(0, 1, 5, 4, P.red);
    q.vline(5, 1, 2, P.red);
    q.hline(0, 4, 1, P.vermLt);
    q.rect(0, 0, 2, 1, P.red);
  }), 21, 55);
  put(thing(5, 5, (q) => {
    q.rect(0, 1, 5, 4, P.navy);
    q.hline(0, 4, 4, P.white);
    q.set(0, 0, P.navy);
  }), 27, 57);
  put(thing(6, 7, (q) => {
    q.poly([[0, 6], [0, 2], [3, 0], [5, 2], [5, 6]], P.woodLt);
    q.line(0, 2, 3, 0, P.goldPale);
    q.set(2, 3, P.ink);
    q.hline(1, 4, 4, P.ink);
    q.set(3, 5, P.ink);
  }), 58, 54);
  put(thing(7, 4, (q) => {
    q.rect(0, 0, 4, 3, P.leafYoung);
    q.rect(3, 2, 4, 2, P.leafYoung);
    q.hline(0, 3, 0, P.white);
  }), 34, 58);
  put(thing(9, 3, (q) => {
    q.rect(0, 0, 9, 3, P.blue);
    q.hline(0, 8, 0, P.concreteLt);
    for (let x = 1; x < 9; x += 2) q.set(x, 1, P.navy);
    q.set(1, 0, P.glint);
  }), 9, 58);
  put(thing(4, 4, (q) => {
    q.ellipse(1.5, 1.5, 2, 2, P.crimson);
    q.set(1, 1, P.white);
  }), 52, 58);
  // ---- the base sinks into shadow; the far back (against the wall) is dimmer too
  for (let y = 0; y < PILE_H; y++)
    for (let x = 0; x < PILE_W; x++) {
      const v = p.get(x, y);
      if (!(v >>> 24)) continue;
      const low = Math.max(0, (y - 44) / 20);
      if (low > 0) blend(p, x, y, P.nightShade, 0.2 * low);
    }
  // the trembling rim: the outline pixels of the heap's silhouette
  const rim = new PixelCanvas(PILE_W + 2, PILE_H + 2);
  const op = (x: number, y: number) => x >= 0 && y >= 0 && x < PILE_W && y < PILE_H && p.get(x, y) >>> 24 !== 0;
  for (let y = -1; y <= PILE_H; y++)
    for (let x = -1; x <= PILE_W; x++) {
      if (op(x, y)) continue;
      if (op(x - 1, y) || op(x + 1, y) || op(x, y - 1) || op(x, y + 1)) rim.set(x + 1, y + 1, rgba32(P.nightShade));
    }
  return { img: p.toCanvas(), rim: rim.toCanvas() };
}

registerProp('mall_lost_pile', () => {
  PILE = PILE ?? buildPile();
  const pile = PILE;
  const a = stand(pile.img, { cx: 32, base: 48, foot: 47, shadow: 0, contact: 0 });
  const shaking = (t: number) => t < lvTime.pileShakeUntil;
  a.img = (env) => (lvTime.pileHidden || shaking(env.t) ? null : pile.img);
  a.over = (g: Gfx, x: number, y: number, env: PropEnv) => {
    if (lvTime.pileHidden) return;
    const ox = x + a.ox;
    const oy = y + a.oy;
    // evt_boss_intro: the heap shudders 2px (three times)
    if (shaking(env.t)) g.img(pile.img, ox + (Math.floor(env.t / 60) % 2 ? 2 : -2), oy);
    if (env.flag('flag_boss_beaten')) return;
    // the outline trembles by 1px (#3A2B5C): something inside is waiting
    const k = Math.floor(env.t / 260) % 4;
    const d = [[0, 0], [1, 0], [0, -1], [-1, 0]][k];
    g.alpha(0.75, () => g.img(pile.rim, ox - 1 + d[0], oy - 1 + d[1]));
  };
  a.glow = (g: Gfx, x: number, y: number, env: PropEnv) => {
    if (lvTime.pileHidden || !maigoTubeOn(env.t)) return;
    // two things in the heap catch the lone tube: the bottle's shoulder and the harmonica
    const ox = x + a.ox;
    const oy = y + a.oy;
    const k = (Math.sin(env.t / 380) + 1) / 2;
    g.rect(ox + 33, oy + 34, 1, 2, P.glint, 0.5 + k * 0.4);
    g.rect(ox + 10, oy + 58, 2, 1, P.glint, 0.3 + (1 - k) * 0.4);
  };
  return a;
});

// ---------------------------------------------------------------- children's lockers (12,3), little chairs (2–3,7)

registerProp('mall_kids_locker', () =>
  prop(16, 34, (p) => {
    p.rect(1, 2, 14, 32, P.paperGrid);
    p.vline(1, 2, 33, P.paper);
    p.vline(14, 2, 33, P.woodLt);
    const doors = [P.skin1, P.aqua, P.leafLt, P.goldPale, P.peach, P.aqua];
    for (let k = 0; k < 6; k++) {
      const dx = 2 + (k % 2) * 6;
      const dy = 3 + Math.floor(k / 2) * 10;
      p.rect(dx, dy, 5, 9, doors[k]);
      p.hline(dx, dx + 4, dy, lt(doors[k]));
      p.set(dx + 3, dy + 4, P.woodDark);
    }
    // stickers: a star and a bell
    p.set(4, 6, P.gold);
    p.set(3, 7, P.gold);
    p.set(5, 7, P.gold);
    p.set(10, 26, P.brass);
    p.set(10, 27, P.brass);
    p.rect(2, 33, 12, 1, P.woodDark);
  }, { base: 16, contact: 12, shadow: 0 }),
);

registerProp('mall_kids_chairs', () =>
  prop(32, 18, (p) => {
    for (const [cx, c] of [[3, P.peach], [19, P.aqua]] as const) {
      p.rect(cx + 1, 0, 9, 6, c);
      p.hline(cx + 1, cx + 9, 0, lt(c));
      p.rect(cx, 7, 11, 4, c);
      p.hline(cx, cx + 10, 7, lt(c));
      p.hline(cx, cx + 10, 10, dk(c));
      p.vline(cx + 1, 11, 16, dk(c, 2));
      p.vline(cx + 9, 11, 16, dk(c, 2));
    }
    // a picture book left on the pink one
    p.rect(6, 5, 6, 3, P.blue);
    p.hline(6, 11, 5, P.aqua);
  }, { cx: 16, base: 16, contact: 0, shadow: 0 }),
);

// ---------------------------------------------------------------- the lone fluorescent tube (6,2), foreground

registerProp('mall_maigo_tube', () => {
  const mk = (on: boolean) => {
    const p = pc(40, 16);
    // two hanging wires, the steel housing, the tube
    p.vline(6, 0, 9, P.charcoal);
    p.vline(33, 0, 9, P.charcoal);
    p.rect(2, 9, 36, 3, P.steel);
    p.hline(2, 37, 9, P.concreteLt);
    p.rect(3, 12, 34, 2, on ? P.glint : P.concrete);
    p.hline(3, 36, 13, on ? '#F4E6A8' : P.steel);
    p.rect(2, 12, 1, 2, P.charcoal);
    p.rect(37, 12, 1, 2, P.charcoal);
    return p.toCanvas();
  };
  const onImg = mk(true);
  const offImg = mk(false);
  // hung high enough to clear the log book and the microphone on the counter
  const oy = -13;
  return {
    ox: -12,
    oy,
    w: 40,
    h: 16,
    foot: 0,
    img: () => null,
    fg: [{ ox: -12, oy, img: (env: PropEnv) => (maigoTubeOn(env.t) ? onImg : offImg) }],
    glowFg: true,
    glow(g: Gfx, x: number, y: number, env: PropEnv) {
      if (!maigoTubeOn(env.t)) return;
      g.rect(x - 9, y + oy + 12, 34, 2, '#F4E6A8', 0.5);
      screenPool(g, x + 8, y + oy + 13, 26, 8, '#F4E6A8', 0.3);
    },
  } as PropArt;
});

// ---------------------------------------------------------------- a paper mobile over the play corner (2,6)

registerProp('mall_mobile', () => {
  const frames = mkFrames(4, 30, 30, (p, k) => {
    // a cross of two sticks turning slowly; paper stars and a little bell hang from it
    p.vline(15, 0, 6, P.concrete);
    const a = (k / 4) * Math.PI;
    const dx = Math.round(Math.cos(a) * 11);
    const dy = Math.round(Math.sin(a) * 3);
    p.line(15 - dx, 7 - dy, 15 + dx, 7 + dy, P.woodLt);
    p.line(15 - Math.round(dx * 0.4), 7 + 3, 15 + Math.round(dx * 0.4), 7 - 3, P.woodLt);
    const ends: [number, number, string][] = [
      [15 - dx, 7 - dy, P.gold],
      [15 + dx, 7 + dy, P.peach],
      [15 - Math.round(dx * 0.4), 10, P.aqua],
      [15 + Math.round(dx * 0.4), 4, P.leafLt],
    ];
    ends.forEach(([ex, ey, c], i) => {
      const len = 7 + (i % 2) * 5;
      p.vline(ex, ey + 1, ey + len, P.concreteLt);
      const sy = ey + len + 1;
      if (i === 1) {
        // the bell (the mascot's)
        p.rect(ex - 2, sy, 5, 3, P.brass);
        p.set(ex, sy - 1, P.brass);
        p.hline(ex - 3, ex + 3, sy + 3, P.brassOld);
      } else {
        // a paper star
        p.set(ex, sy, c);
        p.hline(ex - 2, ex + 2, sy + 1, c);
        p.hline(ex - 1, ex + 1, sy + 2, c);
        p.set(ex - 1, sy + 3, c);
        p.set(ex + 1, sy + 3, c);
      }
    });
  }, (p) => finish(p, { soft: true, rim: false }));
  const oy = -46;
  // the thread it hangs from runs all the way up to the ceiling (off the top
  // of the room), so it never reads as a figurine standing on the floor
  const thread = new PixelCanvas(1, 96 + oy);
  for (let y = 0; y < thread.h; y++) thread.set(0, y, y % 9 === 4 ? P.white : P.steel);
  const threadImg = thread.toCanvas();
  return {
    ox: 2,
    oy: -96,
    w: 30,
    h: 96 + oy + 30,
    foot: 0,
    img: () => null,
    fg: [
      { ox: 17, oy: -96, img: () => threadImg },
      { ox: 2, oy, img: (env: PropEnv) => frames[Math.floor(env.t / 900) % 4] },
    ],
  } as PropArt;
});

// ---------------------------------------------------------------- the mobile's shadow on the play mats (2,6)

registerProp('mall_mobile_shadow', () => {
  // a soft shadow straight below it: the two crossed sticks turning with it
  const frames = mkFrames(4, 30, 10, (p, k) => {
    const a = (k / 4) * Math.PI;
    const dx = Math.round(Math.cos(a) * 10);
    const dy = Math.round(Math.sin(a) * 2);
    for (let y = 0; y < 10; y++)
      for (let x = 0; x < 30; x++) {
        const r = ((x + 0.5 - 15) / 11) ** 2 + ((y + 0.5 - 5) / 3.4) ** 2;
        if (r <= 1) p.set(x, y, r < 0.35 ? '#3A2B5C38' : '#3A2B5C22');
      }
    p.line(15 - dx, 5 - dy, 15 + dx, 5 + dy, '#3A2B5C55');
    p.line(15 - Math.round(dx * 0.4), 7, 15 + Math.round(dx * 0.4), 3, '#3A2B5C44');
  });
  return {
    ox: 2,
    oy: 6,
    w: 30,
    h: 10,
    foot: 0,
    flat: true,
    img: (env: PropEnv) => frames[Math.floor(env.t / 900) % 4],
  } as PropArt;
});

void blend;
void tiny;
