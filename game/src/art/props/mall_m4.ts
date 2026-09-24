// M4 2F通路 (30_level_art 5.4, 22×9). A long corridor on the gallery: the toy
// shop's shutter with boxed kits showing under it, the optician's big eye
// that glances every 2 s, the 迷子センター door at the east end (the note
// about the key taped on it). Two squares of evening fall from skylights —
// the brighter one right in front of the door. The glass railing along the
// south edge looks down into the dark atrium, where M1's fountain sits small
// and far below. The top of the stopped escalator (down to M3) at the west
// end, the rest bench, a mannequin, boxes of lost things and the 清掃中 sign.

import type { Gfx } from '../../engine/gfx';
import { PixelCanvas } from '../../engine/pixel';
import { getMapDef } from '../../world/maps';
import { laneOf, mallTiles } from '../tiles/ifloor';
import { ihash } from '../tiles/noise';
import { P } from '../tiles/palette';
import { cardboard, notice, pc, prop } from './ifurn';
import { blend, depthShade, lightPool, paintShell, screenPool, shellProp } from './ishell';
import { lvTime } from './istate';
import { castRight, dk, finish, lt } from './kit';
import { arrowSign, bannerScrap, fasciaText, mallGrade, mallLampLight, mallLamps, mallWall, posterGhost, shutter, skyPatch, type Lamp } from './mall_kit';
import { mkFrames, stand } from './pkit';
import { registerProp } from './registry';
import { fontTextSmall, scribble, tiny } from './text';
import type { PropArt, PropEnv } from './types';

const M4_LAMPS: Lamp[] = [
  { x: 60, y: 76 }, { x: 150, y: 80 }, { x: 236, y: 76, flicker: true }, { x: 300, y: 84 },
];
/** Below the map (rows 8+): the atrium seen from the gallery. */
const BELOW = 44;

// ---------------------------------------------------------------- shell

registerProp('mall_m4_shell', () => {
  const rows = getMapDef('map_mall_2f')?.rows ?? [];
  const blocked = (tx: number, ty: number) => tx <= 1 || tx === 15 || (ty === 5 && (tx === 10 || tx === 11)) || ty >= 7;
  const lane = laneOf([[2, 4], [19, 3]], 22);
  const tiles = mallTiles({ seed: 541, w: 22, h: 9, blocked, lane });
  const wall = mallWall(543, false);
  const sh = paintShell({ rows, floor: (x, y) => tiles(x, y), wall, trim: P.nightShade, base: P.steel, baseH: 3 });
  const W = sh.p.w;
  const H = sh.p.h;
  const p = new PixelCanvas(W, H + BELOW);
  p.blit(sh.p, 0, 0);
  // ---- the atrium below the railing (rows 8+): a dark drop with M1 far down
  atrium(p, 128, H + BELOW);
  // ---- the glass railing (row 7): steel top rail, posts, glass with the drop behind it
  for (let x = 16; x < W - 16; x++) {
    p.set(x, 112, P.concreteLt);
    p.set(x, 113, P.steel);
    for (let y = 114; y < 128; y++) {
      const c = p.get(x, y);
      void c;
      // what is behind the glass: the dark drop (lighter at the top edge = the floor lip)
      p.set(x, y, y < 116 ? P.charcoal : y < 120 ? P.shadeDeep : P.nightShade);
      if ((x + y * 2) % 23 === 0 || (x + y * 2) % 23 === 1) p.set(x, y, P.shade);
    }
    if (x % 32 === 16) for (let y = 112; y < 128; y++) p.set(x, y, y === 112 ? P.white : P.steel);
    p.set(x, 127, P.asphalt);
  }
  // the floor lip: the gallery's edge in front of the rail
  for (let x = 16; x < W - 16; x++) {
    p.set(x, 110, P.concrete);
    p.set(x, 111, P.steel);
  }
  // ---- north wall (rows 0–1)
  // (1–2) 『↓1F』 escalator sign
  p.rect(20, 10, 22, 9, P.navy);
  p.hline(20, 41, 10, P.blue);
  tiny(p, '1F', 23, 12, P.white);
  p.vline(36, 11, 16, P.gold);
  p.set(35, 15, P.gold);
  p.set(37, 15, P.gold);
  castRight(p, 20, 10, 22, 9, 2);
  // (3–7) the toy shop: bright fascia, shutter with kits showing under a 3px gap
  fasciaText(p, 50, 2, 76, 13, P.gold, 'おもちゃ', P.red, P.brass);
  p.rect(128 - 2, 3, 1, 1, P.white);
  shutter(p, 52, 18, 72, 14, { gap: 3 });
  for (let k = 0; k < 8; k++) {
    const c = [P.red, P.blue, P.gold, P.leafDeep, P.crimson, P.aqua, P.sun, P.navy][k];
    p.rect(54 + k * 9, 29, 7, 3, c);
    p.hline(54 + k * 9, 60 + k * 9, 29, lt(c));
  }
  // (8–9) ghost of a poster, a 『迷子センター →』 sign
  posterGhost(p, 132, 6, 12, 16);
  arrowSign(p, 136, 22, 22, 1, 2, 44);
  // (10–12) the optician's display window under the eye
  p.rect(162, 19, 44, 13, P.nightShade);
  p.hline(162, 205, 19, P.ink);
  for (const gx of [168, 184, 198]) {
    p.vline(gx + 3, 26, 31, P.steel);
    p.ring(gx + 1.5, 24.5, 1.5, 1.5, P.concreteLt);
    p.ring(gx + 5.5, 24.5, 1.5, 1.5, P.concreteLt);
    p.hline(gx + 3, gx + 4, 24, P.concreteLt);
  }
  p.line(164, 30, 170, 21, P.shade);
  // (13–17) posters, a clock, the sale banner's scraps
  bannerScrap(p, 214, 3, 30, 17);
  {
    const x = 262;
    p.rect(x, 12, 16, 14, P.paper);
    p.rect(x, 12, 16, 3, P.crimson);
    p.rect(x + 2, 17, 5, 6, P.aqua);
    p.rect(x + 9, 18, 5, 5, P.gold);
    castRight(p, x, 12, 16, 14, 2);
    p.set(x + 1, 12, P.verm);
  }
  // (18) the vertical 『まいご』 sign by the door
  p.rect(290, 4, 11, 26, P.peach);
  p.vline(290, 4, 29, P.skin2);
  p.hline(290, 300, 29, P.sunShade);
  fontTextSmall(p, 'ま', 292, 5, P.white, 1);
  fontTextSmall(p, 'い', 292, 13, P.white, 1);
  fontTextSmall(p, 'ご', 292, 21, P.white, 1);
  castRight(p, 290, 4, 11, 26, 2);
  const img = p.toCanvas();
  return shellProp({
    img,
    over(g: Gfx, x: number, y: number, env: PropEnv) {
      depthShade(g, x + 16, y + 32, W - 32, 80, 0.12);
      mallLamps(g, x, y, M4_LAMPS, env, 404);
    },
    light(g: Gfx, x: number, y: number, env: PropEnv) {
      mallGrade(g, 'mall', env);
      mallLampLight(g, x, y, M4_LAMPS, env, 404);
      // the squares of evening light warm whoever stands in them
      lightPool(g, x + 122, y + 58, 26, 20, P.sun, 0.12 * (1 - env.grade.night));
      lightPool(g, x + 304, y + 48, 26, 14, P.sun, 0.14 * (1 - env.grade.night));
    },
    glow(g: Gfx, x: number, y: number, env: PropEnv) {
      // obj_skylight (6–8, 2–4): the square of evening (#F2894B α28%), and the one before the door
      skyPatch(g, x + 98, y + 36, 46, 42, env, 0.28);
      skyPatch(g, x + 280, y + 34, 44, 26, env, 0.34);
      // far below: the fountain's patch of sun, small
      g.rect(x + 170, y + 128 + 26, 12, 2, P.sun, 0.35 * (1 - env.grade.night));
    },
  });
});

/** The atrium drop: darkness, the rim of the 1F floor, the fountain ring small and far. */
function atrium(p: PixelCanvas, y0: number, y1: number): void {
  for (let y = y0; y < y1; y++)
    for (let x = 0; x < p.w; x++) {
      const k = (y - y0) / (y1 - y0);
      p.set(x, y, k < 0.15 ? P.ink : P.night);
    }
  // far-below floor: faint tile lines of M1 in perspective (1/3 scale), and the fountain
  const fy = y0 + 22;
  // the 1F floor far below: a dim, slightly lighter plane with sparse tile seams
  for (let y = fy - 6; y < y1; y++)
    for (let x = 18; x < p.w - 18; x++) {
      const seam = (x - 18) % 12 === 0 || (y - fy + 6) % 6 === 0;
      if (seam && ((x + y) & 1) === 0) p.set(x, y, P.ink);
      else if (!seam && ihash(x >> 2, y >> 1, 77) % 5 === 0) p.set(x, y, P.ink);
    }
  const cx = 176;
  p.ellipse(cx, fy + 10, 20, 8, P.nightShade);
  p.ring(cx, fy + 10, 20, 8, P.skin4);
  p.ellipse(cx, fy + 10, 15, 5.5, P.shade);
  p.ellipse(cx, fy + 10, 13, 4.5, P.shadeDeep);
  p.rect(cx - 1, fy + 5, 3, 5, P.steel);
  p.set(cx, fy + 4, P.brassOld);
  // the gacha colours in a corner, a pillar top
  for (let k = 0; k < 4; k++) p.rect(262 + k * 5, fy + 1, 3, 3, [P.maroon, P.navy, P.brassOld, P.leafShade][k]);
  p.rect(56, fy - 2, 5, 10, P.asphalt);
  p.rect(290, fy - 2, 5, 10, P.asphalt);
}

// ---------------------------------------------------------------- the top of the escalator down (1, 3–5)

registerProp('mall_escalator_down', () => {
  const p = pc(32, 48);
  // steps going down to the west into the dark (the landing comb plate at x 16–31, row 4)
  for (let y = 16; y < 32; y++)
    for (let x = 0; x < 32; x++) {
      const d = (31 - x) / 31;
      const step = Math.floor((31 - x) / 5);
      let c: string = x >= 24 ? (x % 2 ? P.steel : P.concrete) : step % 2 ? P.asphalt : P.charcoal;
      if (x < 24 && d > 0.55) c = step % 2 ? P.charcoal : P.ink;
      if (x < 10) c = P.night;
      if (x === 24) c = P.gold;
      p.set(x, y, c);
    }
  // balustrades (rows 3 and 5): glass with the black rail on the step side, descending west
  for (const [by, rail] of [[2, 14], [33, 32]] as const) {
    for (let y = by; y < by + 13; y++)
      for (let x = 6; x < 32; x++) p.set(x, y, x < 14 ? P.shadeDeep : '#9AA0A866');
    p.hline(6, 31, by, P.steel);
    p.hline(6, 31, by + 12, P.asphalt);
    p.hline(4, 31, rail, P.charcoal);
    p.hline(4, 31, rail + 1, P.asphalt);
    for (let k = 0; k < 3; k++) p.line(16 + k * 5, by + 9, 19 + k * 5, by + 3, '#F4F1E8AA');
    p.ellipse(31, rail + 0.5, 1.5, 2, P.charcoal);
  }
  return { ox: -16, oy: 0, w: 32, h: 48, foot: 0, flat: true, img: () => p.toCanvas() } as PropArt;
});

// ---------------------------------------------------------------- the optician's eye (10–12, 0–1)

registerProp('mall_glasses_eye', () => {
  const frames = mkFrames(3, 44, 17, (p, k) => {
    // a signboard shaped like an eye: white, lashes, the iris glances 1px
    p.rect(0, 0, 44, 17, P.navy);
    p.hline(0, 43, 0, P.blue);
    p.hline(0, 43, 16, P.nightShade);
    p.ellipse(22, 8.5, 17, 7, P.white);
    p.ring(22, 8.5, 17, 7, P.ink);
    for (let i = 0; i < 6; i++) p.set(9 + i * 5, 1, P.ink);
    const ix = 22 + [-1, 0, 1][k];
    p.ellipse(ix, 8.5, 5, 5, P.leafDeep);
    p.ellipse(ix, 8.5, 3, 3, P.ink);
    p.rect(ix - 2, 6, 2, 2, P.white);
    // a pair of spectacles drawn over it, and the shop's name strokes
    p.ring(ix, 8.5, 6, 6, P.brass);
    scribble(p, 2, 4, 1, P.white, 3, 4);
    scribble(p, 38, 4, 1, P.white, 5, 4);
  }, (p) => castRight(p, 0, 0, 44, 17, 2));
  return {
    ox: 2,
    oy: 1,
    w: 44,
    h: 17,
    foot: 0,
    flat: true,
    // every 2 s the black of the eye moves 1px (left, centre, right, centre)
    img: (env: PropEnv) => frames[[0, 1, 2, 1][Math.floor(env.t / 2000) % 4]],
  } as PropArt;
});

// ---------------------------------------------------------------- the rest bench (10–11,5) — evt_save_bench

registerProp('mall_rest_bench', () => {
  const p = pc(36, 26);
  // padded vinyl bench (faded maroon) on steel legs, a sign on a little stand
  p.rect(1, 8, 32, 5, P.maroon);
  p.hline(1, 32, 8, P.sunShade);
  p.rect(1, 13, 32, 5, P.maroon);
  p.hline(1, 32, 13, P.crimson);
  p.hline(1, 32, 17, P.nightShade);
  for (let x = 6; x < 32; x += 8) p.set(x, 15, P.sunShade);
  for (const lx of [3, 30]) p.rect(lx, 18, 2, 7, P.steel);
  p.hline(1, 34, 25, P.charcoal);
  // 『ご自由に おかけください』 on a stand at the east end
  p.rect(33, 0, 3, 10, P.steel);
  p.rect(26, 0, 10, 7, P.white);
  p.hline(26, 35, 0, P.glint);
  scribble(p, 27, 2, 2, P.navy, 12, 3);
  p.rect(26, 5, 10, 1, P.leafDeep);
  finish(p, { soft: true });
  const a = stand(p.toCanvas(), { cx: 17, base: 16, contact: 30, shadow: 0 });
  a.glow = (g: Gfx, x: number, y: number, env: PropEnv) => {
    // a warm spot on the seat: the save point feels like a place to sit
    const k = 0.5 + Math.sin(env.t / 900) * 0.5;
    screenPool(g, x + a.ox + 17, y + a.oy + 12, 14, 5, P.sky, 0.12 + k * 0.06);
  };
  return a;
});

// ---------------------------------------------------------------- mannequin (15,2): pose held for a year

registerProp('mall_mannequin', () =>
  prop(16, 34, (p) => {
    // round base and pole
    p.ellipse(8, 32, 5, 2, P.steel);
    p.vline(8, 26, 31, P.asphalt);
    // faded summer dress (peach), bald ceramic head, one hand on the hip
    p.poly([[4, 26], [5, 14], [11, 14], [12, 26]], P.peach);
    p.vline(5, 15, 25, P.skin2);
    p.vline(11, 15, 25, P.sunShade);
    p.rect(5, 10, 6, 5, P.white);
    p.ellipse(8, 6, 3, 3.5, P.white);
    p.set(7, 4, P.glint);
    // arms: left hangs, right bent to the hip
    p.vline(4, 11, 18, P.concreteLt);
    p.line(12, 11, 14, 15, P.concreteLt);
    p.line(14, 15, 11, 18, P.concreteLt);
    // a price tag still on the sleeve
    p.rect(2, 12, 2, 3, P.white);
    p.set(2, 13, P.verm);
    // a sun hat
    p.ellipse(8, 3, 5, 1.5, P.goldPale);
    p.rect(6, 1, 4, 2, P.goldPale);
    p.hline(6, 9, 2, P.red);
  }, { base: 16, contact: 10, shadow: 0 }),
);

// ---------------------------------------------------------------- boxes of lost things (15, 3/5/6)

registerProp('mall_lost_boxes', (opts) => {
  const v = Number(opts.v ?? 0);
  return prop(16, 26, (p) => {
    cardboard(p, 1, 10, 14, 16, 4, v + 5);
    if (v === 0) {
      // umbrellas poking out
      for (const [x, c] of [[3, P.navy], [6, P.white], [9, P.red], [12, P.aqua]] as const) {
        p.vline(x, 1, 10, c);
        p.set(x, 0, P.charcoal);
      }
      p.line(5, 2, 8, 9, P.leaf);
    } else if (v === 1) {
      // a plush bear and a sun hat
      p.ellipse(6, 7, 3.5, 3.5, P.woodLt);
      p.set(4, 4, P.woodLt);
      p.set(8, 4, P.woodLt);
      p.set(5, 7, P.ink);
      p.set(7, 7, P.ink);
      p.ellipse(11.5, 9, 3.5, 1.5, P.goldPale);
      p.hline(10, 13, 8, P.crimson);
    } else {
      // a stack: a second box on top, a cap and a lunch bag
      cardboard(p, 3, 3, 11, 8, 3, 9);
      p.rect(2, 1, 5, 3, P.blue);
      p.hline(2, 8, 3, P.navy);
      p.rect(10, 0, 4, 4, P.leafYoung);
    }
  }, { base: 16, contact: 12, shadow: 0 });
});

// ---------------------------------------------------------------- the 清掃中 sign (15,4): standing / knocked flat

function cleaningSign(p: PixelCanvas, ox: number, oy: number): void {
  // yellow A-frame: 『清掃中』 and a janitor-with-mop pictogram
  p.rect(ox + 2, oy + 2, 12, 20, P.gold);
  p.hline(ox + 2, ox + 13, oy + 2, P.goldPale);
  p.vline(ox + 13, oy + 3, oy + 21, P.brass);
  p.rect(ox + 3, oy + 4, 10, 5, P.ink);
  scribble(p, ox + 4, oy + 5, 2, P.gold, 13, 3);
  // pictogram: a figure and a mop
  p.set(ox + 6, oy + 11, P.ink);
  p.vline(ox + 6, oy + 12, oy + 16, P.ink);
  p.line(ox + 6, oy + 16, ox + 5, oy + 18, P.ink);
  p.line(ox + 6, oy + 16, ox + 7, oy + 18, P.ink);
  p.line(ox + 6, oy + 13, ox + 10, oy + 17, P.ink);
  p.hline(ox + 9, ox + 11, oy + 18, P.ink);
  p.hline(ox + 1, ox + 14, oy + 22, P.brassOld);
}

registerProp('mall_cleaning_sign', () =>
  prop(16, 26, (p) => {
    cleaningSign(p, 0, 1);
    p.line(3, 23, 1, 25, P.brassOld);
    p.line(12, 23, 14, 25, P.brassOld);
  }, { base: 16, contact: 12, shadow: 0 }),
);

registerProp('mall_cleaning_sign_down', () => {
  // knocked over after the vacuum went home: lying flat, face up, a little askew
  const p = pc(28, 16);
  p.rect(2, 3, 23, 10, P.gold);
  p.hline(2, 24, 3, P.goldPale);
  p.hline(2, 24, 12, P.brass);
  p.rect(4, 5, 6, 6, P.ink);
  scribble(p, 5, 6, 1, P.gold, 13, 3);
  p.hline(12, 22, 7, P.ink);
  p.hline(12, 20, 9, P.ink);
  p.hline(1, 25, 13, P.brassOld);
  return { ox: -6, oy: 2, w: 28, h: 16, foot: 0, flat: true, img: () => p.toCanvas() } as PropArt;
});

// ---------------------------------------------------------------- the 迷子センター door (19, 0–1)

registerProp('mall_maigo_door', () => {
  const build = (open: boolean) => {
    const p = pc(20, 32);
    // steel frame, a pale pink door with a round window, the plate above
    p.rect(1, 3, 18, 29, P.steel);
    p.vline(1, 3, 31, P.concreteLt);
    p.rect(2, 4, 16, 28, open ? P.ink : P.skin1);
    if (!open) {
      p.vline(2, 4, 31, P.white);
      p.vline(16, 4, 31, P.skin2);
      p.vline(17, 4, 31, P.skin3);
      p.hline(3, 16, 4, P.white);
      p.ellipse(10, 10, 3.5, 3.5, P.nightShade);
      p.ring(10, 10, 3.5, 3.5, P.concrete);
      p.set(9, 9, P.shade);
      p.set(8, 9, P.lilac);
      // lever handle and the kick plate
      p.rect(14, 18, 2, 1, P.brass);
      p.rect(15, 18, 1, 3, P.brassOld);
      p.rect(3, 27, 14, 4, P.concrete);
      p.hline(3, 16, 27, P.concreteLt);
      p.hline(3, 16, 30, P.steel);
      // the note taped on: 『カギは フードコートの 忘れ物カウンターで…』
      notice(p, 4, 15, 9, 10, { paper: P.white, ink: P.verm, seed: 71, rows: 4 });
    } else {
      // slid open: dark inside, a line of the lone tube's light on the floor
      p.rect(2, 4, 3, 28, P.skin2);
      p.vline(4, 4, 31, P.sunShade);
      p.hline(6, 16, 29, P.shadeDeep);
    }
    p.rect(3, 0, 14, 3, P.peach);
    p.hline(3, 16, 0, P.skin1);
    p.set(9, 1, P.white);
    p.set(10, 1, P.white);
    castRight(p, 1, 0, 18, 32, 2);
    return p.toCanvas();
  };
  const closed = build(false);
  const open = build(true);
  return {
    ox: -2,
    oy: 0,
    w: 20,
    h: 32,
    foot: 0,
    flat: true,
    img: (env: PropEnv) => (env.flag('flag_maigo_door_open') ? open : closed),
    glow(g: Gfx, x: number, y: number, env: PropEnv) {
      if (!env.flag('flag_maigo_door_open')) return;
      // the tube inside flickers on and off (1.3 s), seen through the open door
      const on = Math.floor((env.t - lvTime.enterT) / 1300) % 2 === 0;
      if (on) g.rect(x + 3, y + 8, 10, 22, '#F4E6A8', 0.12);
    },
  } as PropArt;
});

void ihash;
void blend;
void dk;
void lt;
void fasciaText;
