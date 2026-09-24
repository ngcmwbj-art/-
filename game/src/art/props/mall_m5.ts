// M5 迷子センター (30_level_art 5.5, 14×11). The boss room: darker than the
// rest (pal_maigo), lit by one fluorescent tube that comes on and goes out
// every 1.3 s (in step with amb_fluorescent_flicker). Pastel wallpaper gone
// grey, the 『まいごセンター』 sign, a faded poster of the bell-headed mascot,
// children's drawings; the low counter 『どうしたの？』 with the log book and
// the dead microphone; a heap of unclaimed lost things in the corner whose
// outline trembles 1px (#3A2B5C) — the boss is waiting in it.

import type { Gfx } from '../../engine/gfx';
import { PixelCanvas, rgba32 } from '../../engine/pixel';
import { getMapDef } from '../../world/maps';
import { mallTiles } from '../tiles/ifloor';
import { ihash, valueNoise } from '../tiles/noise';
import { P } from '../tiles/palette';
import { kidDrawing, pc, prop } from './ifurn';
import { blend, depthShade, lightPool, paintShell, screenPool, shellProp } from './ishell';
import { lvTime } from './istate';
import { castRight, dk, finish, lt } from './kit';
import { mallGrade } from './mall_kit';
import { mkFrames, stand } from './pkit';
import { registerProp } from './registry';
import { fontText, fontTextSmall, fontWidth, printLines, scribble, tiny } from './text';
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
  const tiles = mallTiles({ seed: 551, w: 14, h: 11, blocked });
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
  const img = p.toCanvas();
  const W = img.width;
  return shellProp({
    img,
    over(g: Gfx, x: number, y: number, env: PropEnv) {
      depthShade(g, x + 16, y + 48, W - 32, 96, 0.2);
    },
    light(g: Gfx, x: number, y: number, env: PropEnv) {
      mallGrade(g, 'maigo', env);
      // the lone tube: a circle of yellowed light in the middle while it's on (#F4E6A8 α25%)
      if (maigoTubeOn(env.t)) lightPool(g, x + 104, y + 84, 58, 38, '#F4E6A8', 0.22);
    },
    glow(g: Gfx, x: number, y: number, env: PropEnv) {
      if (maigoTubeOn(env.t)) screenPool(g, x + 104, y + 84, 50, 30, '#F4E6A8', 0.1);
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
  scribble(p, x + 3, y + 31, 4, P.peach, 91, 4);
  scribble(p, x + 5, y + 36, 3, P.skin3, 93, 3);
  castRight(p, x, y, w, h, 2);
  // one tape corner has let go
  p.rect(x - 1, y - 1, 3, 2, P.goldPale);
  p.set(x + w - 1, y, P.paperGrid);
  p.set(x + w - 2, y, P.paperGrid);
}

// ---------------------------------------------------------------- the low counter 『どうしたの？』 (3–7,3)

registerProp('mall_maigo_counter', () =>
  prop(80, 24, (p) => {
    // child-height counter: pale wood top, a pastel front with the question
    p.rect(0, 6, 80, 4, P.woodLt);
    p.hline(0, 79, 6, P.goldPale);
    p.hline(0, 79, 9, P.wood);
    p.rect(0, 10, 80, 12, P.paper);
    p.hline(0, 79, 10, P.white);
    p.rect(0, 20, 80, 2, P.skin2);
    fontTextSmall(p, 'どうしたの？', 14, 12, P.sunShade, 1);
    p.ellipse(6, 15, 2.5, 2.5, P.aqua);
    p.ellipse(73, 15, 2.5, 2.5, P.leafLt);
    p.rect(0, 22, 80, 2, P.woodDark);
    // the log book (x4): open, lines, the last page with no name
    p.rect(17, 1, 14, 7, P.white);
    p.vline(24, 1, 7, P.concrete);
    printLines(p, 18, 2, 5, 3, P.steel, 7);
    printLines(p, 25, 2, 4, 1, P.steel, 9);
    p.rect(15, 2, 2, 6, P.navy);
    // a tissue box and a small plush on the counter
    p.rect(35, 2, 8, 5, P.aqua);
    p.rect(38, 1, 2, 2, P.white);
    p.ellipse(60, 4, 3, 3, P.peach);
    p.set(58, 2, P.peach);
    p.set(62, 2, P.peach);
    p.set(59, 4, P.ink);
    // the broadcast microphone (x6): a gooseneck on a base, its power lamp dark
    p.rect(64, 5, 9, 3, P.charcoal);
    p.hline(64, 72, 5, P.asphalt);
    p.set(71, 6, P.maroon);
    p.line(68, 5, 69, -1 + 2, P.asphalt);
    p.line(69, 1, 72, -1 + 1, P.asphalt);
    p.rect(72, 0, 3, 2, P.charcoal);
  }, { cx: 40, base: 16, contact: 0, shadow: 0 }),
);

// ---------------------------------------------------------------- the heap of lost things (8–11, 3–5)

const PILE_W = 64;
const PILE_H = 60;
let PILE: { img: HTMLCanvasElement; rim: HTMLCanvasElement } | null = null;

function buildPile(): { img: HTMLCanvasElement; rim: HTMLCanvasElement } {
  const p = pc(PILE_W, PILE_H);
  // the mound (a dark mass of cloth and bags) as the base
  const top = 14;
  for (let y = top; y < PILE_H; y++)
    for (let x = 0; x < PILE_W; x++) {
      const u = (x - 34) / 30;
      const hump = 1 - u * u;
      const ht = top + (1 - hump) * 30 + Math.sin(x * 0.7) * 1.5;
      if (y < ht) continue;
      const n = valueNoise(x / 5, y / 4, 901);
      p.set(x, y, n > 0.7 ? P.shade : n > 0.4 ? P.shadeDeep : P.nightShade);
    }
  // things lying on and sticking out of the heap
  // a bundle of umbrellas leaning at the back (transparent, navy, red, a yellow child's one)
  for (const [x, c] of [[26, P.concrete], [30, P.navy], [34, P.red], [38, P.gold], [42, P.aqua]] as const) {
    p.line(x, 2, x - 3 + (x % 4), 26, c);
    p.set(x, 1, P.charcoal);
  }
  p.line(24, 3, 22, 1, P.charcoal);
  // the blue water bottle #4AA8E0 (the boss's colour), front and centre
  p.rect(30, 30, 6, 12, P.blue);
  p.vline(30, 30, 41, P.aqua);
  p.rect(30, 28, 6, 2, P.navy);
  p.rect(31, 27, 4, 1, P.white);
  p.hline(31, 34, 36, P.white);
  // a navy gym bag with a blank name tag
  p.rect(10, 34, 14, 10, P.navy);
  p.hline(10, 23, 34, P.blue);
  p.rect(14, 37, 6, 3, P.white);
  p.line(10, 34, 16, 30, P.white);
  // the recorder (cream with holes)
  p.line(40, 42, 54, 32, P.paperGrid);
  p.line(40, 43, 54, 33, P.woodLt);
  for (const k of [44, 47, 50]) p.set(k, 41 - Math.round((k - 40) * 0.7), P.woodDark);
  // one indoor shoe (white, a red toe)
  p.rect(44, 46, 9, 5, P.white);
  p.rect(51, 46, 3, 5, P.red);
  p.hline(44, 53, 50, P.concrete);
  // gloves (red, navy), a cap, a plush rabbit's ears
  p.rect(20, 46, 5, 4, P.red);
  p.rect(25, 48, 4, 3, P.navy);
  p.ellipse(50, 26, 5, 2, P.gold);
  p.hline(52, 57, 27, P.brass);
  p.rect(14, 24, 2, 7, P.white);
  p.rect(17, 25, 2, 6, P.white);
  p.set(15, 25, P.peach);
  p.ellipse(16, 33, 4, 3, P.white);
  // the shogi piece 『歩』 (a small wooden pentagon)
  p.poly([[57, 44], [59, 41], [61, 44], [61, 48], [57, 48]], P.woodLt);
  p.set(59, 45, P.ink);
  p.hline(58, 60, 46, P.ink);
  // a lunch bag with a bear face, a sock
  p.rect(4, 44, 7, 6, P.peach);
  p.set(6, 46, P.ink);
  p.set(9, 46, P.ink);
  p.rect(56, 51, 5, 3, P.leafYoung);
  finish(p, { soft: true, rim: false });
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
  const oy = -6;
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
  return {
    ox: 2,
    oy,
    w: 30,
    h: 30,
    foot: 0,
    img: () => null,
    fg: [{ ox: 2, oy, img: (env: PropEnv) => frames[Math.floor(env.t / 900) % 4] }],
  } as PropArt;
});

void blend;
void tiny;
