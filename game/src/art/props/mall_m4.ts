// M4 2F通路 (30_level_art 5.4, 22×9). A long corridor on the gallery: the toy
// shop's shutter with boxed kits showing under it, the optician's big eye
// that glances every 2 s, the 迷子センター door at the east end (the note
// about the key taped on it). Two squares of evening fall from skylights —
// the brighter one right in front of the door. The glass railing along the
// south edge looks down into the atrium: M1's hall one storey below in
// perspective, with a skylight shaft falling to the fountain (mall_atrium.ts,
// the area's 見せ場). The top of the stopped escalator (down to M3) at the west
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
import { atriumGlow, atriumOver, atriumStatic } from './mall_atrium';
import { arrowSign, bannerScrap, fasciaText, mallGrade, mallLampLight, mallLamps, mallWall, posterGhost, shutter, skyPatch, skyPatchRim, type Lamp } from './mall_kit';
import { mkFrames, stand } from './pkit';
import { registerProp } from './registry';
import { fontTextSmall, tiny } from './text';
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
  const tiles = mallTiles({
    seed: 541,
    w: 22,
    h: 9,
    blocked,
    lane,
    decals: [
      { x: 196, y: 70, kind: 'arrow', dir: 0, c: P.peach },
      { x: 52, y: 96, kind: 'steps', dir: 0, n: 7 },
      { x: 280, y: 92, kind: 'tape', w: 24, h: 10 },
    ],
  });
  const wall = mallWall(543, false);
  const sh = paintShell({ rows, floor: (x, y) => tiles(x, y), wall, trim: P.nightShade, base: P.steel, baseH: 3 });
  const W = sh.p.w;
  const H = sh.p.h;
  const p = new PixelCanvas(W, H + BELOW);
  p.blit(sh.p, 0, 0);
  // ---- the atrium below the railing (rows 7+): M1's hall one storey down,
  // in perspective (mall_atrium.ts); over() redraws it with the parallax slide
  atriumStatic(p);
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
  arrowSign(p, 126, 21, 'まいご', 1, { edge: P.peach });
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
  bannerScrap(p, 212, 3, 34, 17, 8);
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
      atriumOver(g, x, y, env);
      depthShade(g, x + 16, y + 32, W - 32, 80, 0.12);
      mallLamps(g, x, y, M4_LAMPS, env, 404, 0.16, rows);
      // obj_skylight (6–8, 2–4): the square of evening, and the brighter one before the door
      skyPatch(g, x + 98, y + 36, 46, 42, env, 0.5);
      skyPatch(g, x + 280, y + 34, 44, 26, env, 0.6);
    },
    light(g: Gfx, x: number, y: number, env: PropEnv) {
      mallGrade(g, 'mall', env, [x + 16, y + 32, 320, 80]);
      mallLampLight(g, x, y, M4_LAMPS, env, 404);
    },
    glow(g: Gfx, x: number, y: number, env: PropEnv) {
      skyPatchRim(g, x + 98, y + 36, 46, 42, env, 0.3);
      skyPatchRim(g, x + 280, y + 34, 44, 26, env, 0.36);
      atriumGlow(g, x, y, env);
    },
  });
});

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
    // a pair of spectacles drawn over it, and a lens sparkle each side
    p.ring(ix, 8.5, 6, 6, P.brass);
    for (const [sx, c] of [[4, P.goldPale], [39, P.aqua]] as const) {
      p.vline(sx, 5, 11, c);
      p.hline(sx - 3, sx + 3, 8, c);
      p.set(sx, 8, P.white);
      p.set(sx - 1, 7, c);
      p.set(sx + 1, 9, c);
    }
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
  // the 休憩所 plate on a stand at the east end: a pictogram of someone
  // resting on a bench (navy on white, green band)
  p.rect(33, 0, 3, 10, P.steel);
  p.rect(25, 0, 11, 9, P.white);
  p.hline(25, 35, 0, P.glint);
  p.rect(25, 7, 11, 2, P.leafDeep);
  p.rect(29, 1, 2, 2, P.navy);
  p.rect(28, 3, 2, 2, P.navy);
  p.hline(30, 32, 4, P.navy);
  p.vline(32, 4, 6, P.navy);
  p.hline(26, 33, 5, P.steel);
  p.set(27, 6, P.steel);
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
      // a plush bear sunk in the open box and a sun hat on its flap (kept
      // low: the fallen 清掃中 sign lies in the gap just north of this box)
      p.ellipse(6, 11, 3.5, 3, P.woodLt);
      p.set(4, 8, P.woodLt);
      p.set(8, 8, P.woodLt);
      p.set(5, 11, P.ink);
      p.set(7, 11, P.ink);
      p.set(6, 12, P.woodDark);
      p.ellipse(11.5, 11, 3.5, 1.5, P.goldPale);
      p.hline(10, 13, 10, P.crimson);
    } else {
      // a stack: a second box on top, a cap and a lunch bag
      cardboard(p, 3, 3, 11, 8, 3, 9);
      p.rect(2, 1, 5, 3, P.blue);
      p.hline(2, 8, 3, P.navy);
      p.rect(10, 0, 4, 4, P.leafYoung);
    }
    // the box south of the sign's gap stands 2px further back (south), so a
    // strip of floor shows between the stacks once the sign is down
  }, { base: v === 1 ? 18 : 16, foot: 15, contact: 12, shadow: 0 });
});

// ---------------------------------------------------------------- the 清掃中 sign (15,4): standing / knocked flat

function cleaningSign(p: PixelCanvas, ox: number, oy: number): void {
  // yellow A-frame: a black caution band on top, the janitor-with-mop
  // pictogram (no lettering: at this size a word would only be noise — the
  // examine text says 清掃中), yellow/black hazard stripes at the foot
  p.rect(ox + 2, oy + 2, 12, 20, P.gold);
  p.hline(ox + 2, ox + 13, oy + 2, P.goldPale);
  p.vline(ox + 2, oy + 3, oy + 21, P.goldPale);
  p.vline(ox + 13, oy + 3, oy + 21, P.brass);
  p.rect(ox + 3, oy + 4, 10, 3, P.ink);
  p.set(ox + 8, oy + 5, P.gold);
  p.set(ox + 7, oy + 5, P.gold);
  // pictogram: a figure pushing a mop
  p.rect(ox + 6, oy + 8, 2, 2, P.ink);
  p.vline(ox + 6, oy + 10, oy + 14, P.ink);
  p.vline(ox + 7, oy + 10, oy + 13, P.ink);
  p.line(ox + 6, oy + 14, ox + 5, oy + 16, P.ink);
  p.line(ox + 7, oy + 14, ox + 8, oy + 16, P.ink);
  p.line(ox + 7, oy + 11, ox + 11, oy + 15, P.ink);
  p.hline(ox + 10, ox + 12, oy + 16, P.ink);
  p.set(ox + 12, oy + 15, P.ink);
  // hazard stripes
  for (let i = 0; i < 10; i++) for (let j = 0; j < 3; j++) p.set(ox + 3 + i, oy + 18 + j, ((i + j) >> 1) % 2 ? P.ink : P.gold);
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
  // knocked flat after the vacuum went home: the A-frame lies on its back
  // inside its own tile (seen from above: the yellow board foreshortened,
  // its hinge and the second leaf folded under), a soft floor shadow round it
  const p = pc(18, 12);
  // floor shadow (baked: #3A2B5C, drawn first)
  for (let y = 4; y < 12; y++) for (let x = 1; x < 18; x++) if (((x - 9.5) / 8.5) ** 2 + ((y - 8) / 3.8) ** 2 <= 1) p.set(x, y, '#3A2B5C55');
  // the board: a flat parallelogram, a little askew
  const quad: [number, number][] = [[2, 3], [14, 1], [16, 7], [4, 9]];
  p.poly(quad, P.gold);
  p.line(2, 3, 14, 1, P.goldPale);
  p.line(4, 9, 16, 7, P.brassOld);
  p.line(14, 1, 16, 7, P.brass);
  // the caution band and the pictogram, squashed flat
  p.line(4, 4, 12, 3, P.ink);
  p.line(4, 5, 12, 4, P.ink);
  p.set(8, 6, P.ink);
  p.set(9, 6, P.ink);
  p.set(10, 7, P.ink);
  // the stripes at the foot end
  for (let i = 0; i < 4; i++) p.set(13 + (i >> 1), 3 + i + (i & 1), i % 2 ? P.gold : P.ink);
  // the folded second leaf peeking out on the hinge side, and a leg
  p.line(1, 4, 3, 10, P.brassOld);
  p.line(0, 5, 2, 10, P.brass);
  p.set(17, 8, P.brassOld);
  return { ox: -1, oy: 3, w: 18, h: 12, foot: 0, flat: true, img: () => p.toCanvas() } as PropArt;
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
