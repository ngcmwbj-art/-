// The public and working buildings of 星見台 (52_ch2_level_art 3.3, 3.9, 7.1):
// the old branch school (now the meeting hall, the one warm window of the
// night), its gym and covered walkway, the Ishiguro barn (long gable with the
// ridge vent 越屋根, block wainscot, the open side under a bird net, the big
// wall fans), the compost shed, the fire-brigade hut, the farm-tool shed on
// the paddies, the station's waiting hut and the three rain-shelter
// greenhouses of the west slope (the newest one, 3号, glowing at its north
// end until the はなまるトマト is picked).

import type { Gfx } from '../../engine/gfx';
import { mix, PixelCanvas } from '../../engine/pixel';
import { h01, ihash } from '../tiles/noise';
import { P } from '../tiles/palette';
import { glassPane, KAWARA_IBUSHI, registerBuilding, roofKawara, type Bld, type RoofPal } from './bkit';
import { castRight, dk, lt, shadeRect } from './kit';
import {
  darkWin,
  eaveDark,
  footing,
  glowDot,
  HLIGHT,
  HP,
  hs,
  nightK,
  paperNote,
  roofTinH,
  starVerge,
  TIN_BROWN,
  TIN_GRAY,
  TIN_GREEN,
  TIN_RUST,
  wall,
  wallBlock,
  wallLap,
  wallOld,
  wallWainscot,
} from './hoshi_kit';
import { drawLight, drawLightAt, poolEllipse, poolTrapezoid } from './light';
import { registerProp } from './registry';
import { fontTextSmall } from './text';
import type { PropArt, PropEnv } from './types';

// ---------------------------------------------------------------- 旧 星見台分校 (21,22) 12×(4+2)

/** The meeting room's four windows (x21–24, y26): pane rects relative to the canvas. */
const SCHOOL_LIT: [number, number, number, number][] = [];

registerBuilding({
  id: 'prop_h_bld_school',
  W: 12,
  R: 4,
  F: 2,
  top: 4,
  band: 0,
  paint(b: Bld) {
    const p = b.p;
    const rY = b.roofY;
    const fY = b.faceY;
    const W = 192;
    roofKawara(p, 0, rY, W, 64, KAWARA_IBUSHI, 31, 0.32);
    starVerge(p, 0, rY, 64, KAWARA_IBUSHI);
    // a lightning rod on the ridge, and snow guards along the eave
    const ridgeY = rY + Math.round(64 * 0.32);
    p.vline(150, ridgeY - 12, ridgeY + 1, P.steel);
    p.set(150, ridgeY - 13, P.concreteLt);
    p.set(151, ridgeY - 1, P.charcoal);
    for (let i = 4; i < W - 4; i += 5) {
      p.set(i, rY + 56, P.concrete);
      p.set(i, rY + 57, P.charcoal);
    }
    // the walls: dark lap boards over a grey wainscot
    wall(p, 0, fY, W, 32, wallLap(P.woodDark, 31));
    wall(p, 0, fY + 21, W, 11, wallWainscot(31));
    eaveDark(p, 0, fY, W, 3);
    // corner posts every 4 tiles (the frame of the old wooden school)
    for (const px of [0, 63, 127, 191]) {
      p.vline(px, fY, b.botY - 1, P.wood);
      if (px < W - 1) p.vline(px + 1, fY, b.botY - 1, P.woodDark);
    }
    // the meeting room's four windows (white frames), lit at night (glow)
    SCHOOL_LIT.length = 0;
    for (let k = 0; k < 4; k++) {
      const wx = 2 + k * 16;
      const wy = fY + 5;
      p.rect(wx - 1, wy - 1, 14, 14, P.concreteLt);
      p.hline(wx - 1, wx + 12, wy - 1, P.white);
      glassPane(p, b.mask, wx, wy, 12, 12, { base: P.shadeDeep, glint: false });
      p.vline(wx + 6, wy, wy + 11, P.concreteLt);
      p.hline(wx, wx + 11, wy + 6, P.concreteLt);
      // the room behind: a lamp shade, a shelf, the top of a head (someone sits by the window)
      p.hline(wx + 1, wx + 5, wy + 2, P.shade);
      if (k === 1) p.rect(wx + 8, wy + 8, 3, 3, P.charcoal);
      p.hline(wx - 1, wx + 12, wy + 13, P.steel);
      SCHOOL_LIT.push([wx, wy, 6, 6], [wx + 7, wy, 5, 6], [wx, wy + 7, 6, 5], [wx + 7, wy + 7, 5, 5]);
    }
    // the dark classrooms' windows (east)
    for (let k = 0; k < 5; k++) darkWin(b, 114 + k * 16, fY + 5, 12, 12, { frame: P.concreteLt, curtain: k % 2 ? P.concrete : undefined, side: 'l' });
    // ---- the sign 「星見台 集会所」 (25,27), and the sun-bleached ghost of the old one (分校)
    const sx = 67;
    p.rect(sx - 2, fY + 1, 14, 30, mix(P.woodDark, P.wood, 0.55)); // the ghost: a paler patch where the bigger board hung
    wall(p, sx - 1, fY + 2, 12, 28, wallLap(mix(P.woodDark, P.wood, 0.5), 32));
    p.rect(sx, fY + 4, 10, 26, P.paper);
    p.strokeRect(sx, fY + 4, 10, 26, P.woodDark);
    p.hline(sx + 1, sx + 8, fY + 5, P.white);
    fontTextSmall(p, '集', sx + 1, fY + 5, P.ink);
    fontTextSmall(p, '会', sx + 1, fY + 13, P.ink);
    fontTextSmall(p, '所', sx + 1, fY + 21, P.ink);
    castRight(p, sx, fY + 4, 10, 26, 2);
    // ---- the entrance porch (昇降口) with its small red gable and the star emblem
    const cx = 88;
    const y0 = fY - 14;
    const apexY = fY - 2;
    const baseY = fY + 8;
    for (let j = y0; j < baseY; j++)
      for (let i = 70; i <= 106; i++) {
        const t = Math.abs(i - cx) / 18;
        const edgeY = apexY + t * (baseY - apexY);
        if (j >= edgeY) continue;
        const left = i < cx;
        const lx = Math.abs(i - cx) % 4;
        let c: string = left ? (lx === 1 ? P.verm : P.vermShade) : lx === 1 ? P.vermShade : P.maroon;
        if (i === cx) c = P.vermLt;
        if (j === y0) c = P.maroon;
        p.set(i, j, c);
      }
    // the barge boards (the ^ edge) and the white pediment under it
    for (let i = 70; i <= 106; i++) {
      const t = Math.abs(i - cx) / 18;
      const ey = Math.round(apexY + t * (baseY - apexY));
      p.set(i, ey, P.woodDark);
      p.set(i, ey - 1, P.concreteLt);
      for (let j = ey + 1; j < baseY; j++) p.set(i, j, P.concreteLt);
    }
    p.hline(70, 106, baseY, P.woodDark);
    // the school emblem: a gold disc with a star
    p.ellipse(cx, fY + 3.5, 3.5, 3.5, P.brass);
    p.set(cx, fY + 1, P.gold);
    p.hline(cx - 2, cx + 2, fY + 3, P.gold);
    p.set(cx - 1, fY + 5, P.gold);
    p.set(cx + 1, fY + 5, P.gold);
    p.set(cx, fY + 4, P.gold);
    // the porch posts and the dark glass doors of the entrance
    p.vline(71, baseY, b.botY - 1, P.concreteLt);
    p.vline(72, baseY, b.botY - 1, P.concrete);
    p.vline(104, baseY, b.botY - 1, P.concreteLt);
    p.vline(105, baseY, b.botY - 1, P.steel);
    p.rect(73, baseY + 1, 31, b.botY - baseY - 1, P.night);
    const dy = baseY + 3;
    for (const dx of [79, 88]) {
      p.rect(dx, dy, 9, b.botY - dy - 2, P.concrete);
      glassPane(p, b.mask, dx + 1, dy + 1, 7, b.botY - dy - 5, { base: P.shadeDeep, glint: dx === 79 });
      p.hline(dx + 1, dx + 7, dy + 9, P.concrete);
    }
    p.rect(74, b.botY - 3, 29, 3, P.concrete);
    p.hline(74, 102, b.botY - 3, P.concreteLt);
    castRight(p, 70, y0, 37, baseY - y0, 3);
    // ---- the clock over the entrance, right (27,26): long hand just short of 12
    const kx = 101;
    const ky = fY + 5;
    p.ellipse(kx + 0.5, ky + 0.5, 5.5, 5.5, P.charcoal);
    p.ellipse(kx + 0.5, ky + 0.5, 4.5, 4.5, P.white);
    for (const [ddx, ddy] of [[0, -4], [4, 0], [0, 4], [-4, 0]]) p.set(kx + ddx + (ddx > 0 ? 1 : 0), ky + ddy + (ddy > 0 ? 1 : 0), P.charcoal);
    footing(p, 0, b.botY, 70, P.concrete, 31);
    footing(p, 107, b.botY, 85, P.concrete, 32);
  },
  over(g, x, y, env, b) {
    // the clock's hands: 4:59, and 5:00 in the morning (52 7.3)
    const kx = x + 101;
    const ky = y + b.faceY + 5;
    const s = hs(env);
    const m = s >= 3 ? 0 : 59;
    const hAng = ((4 + m / 60 + (s >= 3 ? 1 : 0)) / 12) * Math.PI * 2;
    const mAng = (m / 60) * Math.PI * 2;
    // h2: the long hand shivers once in a while, with the HUD's colon
    const shiver = s === 2 && Math.floor(env.t / 90) % 97 === 0 ? 0.08 : 0;
    const hand = (a: number, len: number, c: string) => {
      for (let k = 1; k <= len; k++) g.rect(Math.round(kx + 0.5 + Math.sin(a) * k), Math.round(ky + 0.5 - Math.cos(a) * k), 1, 1, c);
    };
    hand(hAng, 2, P.ink);
    hand(mAng + shiver, 4, P.ink);
    g.rect(kx, ky, 1, 1, P.verm);
  },
  glow(g, x, y, env, b) {
    // the meeting room's windows (#F6D98A): the only warm window of the night
    if (hs(env) >= 3) return;
    const k = nightK(env);
    if (k <= 0) return;
    for (const [px, py, pw, ph] of SCHOOL_LIT) {
      g.rect(x + px, y + py, pw, ph, '#F6D98A', 0.72 * k);
      g.rect(x + px, y + py + Math.floor(ph / 2), pw, Math.ceil(ph / 2), '#FFE7A3', 0.2 * k);
    }
    void b;
  },
  light(g, x, y, env, b) {
    if (hs(env) >= 3) return;
    const k = nightK(env);
    if (k <= 0) return;
    // the trapezoid on the school yard: 64 → 96px wide, 48px long (52 3.9 / 8.6)
    const img = poolTrapezoid(64, 96, 48, HLIGHT.bulb);
    drawLightAt(g, img, x + 32 - img.width / 2, y + b.botY, 0.55 * k);
    // and the windows' own glow on the wall
    drawLight(g, poolEllipse(44, 14, HLIGHT.bulb), x + 32, y + b.faceY + 11, 0.3 * k);
  },
});

// ---------------------------------------------------------------- 渡り廊下と体育館 (33,22) 6×(4+2)

registerBuilding({
  id: 'prop_h_bld_gym',
  W: 6,
  R: 4,
  F: 2,
  top: 4,
  band: 0,
  paint(b: Bld) {
    const p = b.p;
    const rY = b.roofY;
    const fY = b.faceY;
    // the gap between the buildings (the back yard: weeds and dark earth), then the walkway's low tin roof
    for (let j = rY; j < fY; j++)
      for (let i = 0; i < 16; i++) {
        const n = h01(i, j, 3601);
        p.set(i, j, n < 0.25 ? P.leafShade : n < 0.5 ? mix(P.woodDark, P.night, 0.4) : n < 0.6 ? P.leafDeep : P.night);
      }
    for (let i = 0; i < 16; i++) {
      p.set(i, rY + 4, P.charcoal); // the eaves of the two buildings' shadows
    }
    roofTinH(p, 0, rY + 40, 16, fY - rY - 38, TIN_GRAY, 32, { mono: true, rust: 0.3, patches: 0 });
    // the walkway: posts, a handrail, the dark passage behind
    p.rect(0, fY + 2, 16, 30, P.night);
    for (const px of [1, 13]) {
      p.vline(px, fY + 2, b.botY - 1, P.concrete);
      p.vline(px + 1, fY + 2, b.botY - 1, P.steel);
    }
    p.hline(1, 14, fY + 18, P.concreteLt);
    p.hline(1, 14, fY + 19, P.steel);
    for (let i = 3; i < 13; i += 3) p.vline(i, fY + 20, b.botY - 3, P.asphalt);
    p.rect(1, b.botY - 3, 14, 3, P.concrete);
    p.hline(1, 14, b.botY - 3, P.concreteLt);
    // the gym: faded green tin gable
    roofTinH(p, 16, rY, 80, 64, TIN_GREEN, 33, { rust: 0.22, ridgeFrac: 0.3, patches: 3 });
    wall(p, 16, fY, 80, 32, wallOld(33, 7));
    eaveDark(p, 16, fY, 80, 3);
    // high long windows under the eave
    for (let k = 0; k < 4; k++) darkWin(b, 20 + k * 19, fY + 4, 15, 5, { frame: P.concreteLt, sill: false });
    // the iron sliding door (closed) and its rail
    const dx = 62;
    for (let j = fY + 12; j < b.botY - 1; j++)
      for (let i = dx; i < dx + 28; i++) p.set(i, j, (i - dx) % 14 === 13 ? P.charcoal : (i - dx) % 3 === 0 ? P.concrete : P.steel);
    p.hline(dx - 2, dx + 29, fY + 11, P.charcoal);
    p.hline(dx - 2, dx + 29, fY + 10, P.asphalt);
    p.rect(dx + 11, fY + 20, 2, 5, P.charcoal);
    p.rect(dx + 15, fY + 20, 2, 5, P.charcoal);
    for (let i = dx; i < dx + 28; i++) if (h01(i, 7, 3603) < 0.3) p.set(i, b.botY - 2 - (i % 2), P.brassOld);
    // a sign above the door: 「体育館」
    p.rect(dx + 2, fY + 1, 24, 0, P.paper);
    footing(p, 16, b.botY, 80, P.concrete, 33);
  },
});

// ---------------------------------------------------------------- 石黒牛舎 (50,24) 10×(6+2)

/** Wall fan (換気扇) blades, 18px, 4 frames. */
function fanFrames(): HTMLCanvasElement[] {
  const out: HTMLCanvasElement[] = [];
  for (let k = 0; k < 4; k++) {
    const p = new PixelCanvas(18, 18);
    const c = 8.5;
    for (let b = 0; b < 3; b++) {
      const a0 = (b / 3) * Math.PI * 2 + (k / 4) * ((Math.PI * 2) / 3);
      for (let r = 2; r <= 7; r++)
        for (const da of [-0.22, 0, 0.22]) {
          const a = a0 + da * (1 - r / 12);
          const px = Math.round(c + Math.cos(a) * r);
          const py = Math.round(c + Math.sin(a) * r);
          p.set(px, py, da < 0 ? P.concreteLt : da > 0 ? P.steel : P.concrete);
        }
    }
    p.ellipse(c, c, 1.6, 1.6, P.asphalt);
    p.set(8, 8, P.concreteLt);
    out.push(p.toCanvas());
  }
  return out;
}
let FANS: HTMLCanvasElement[] | null = null;
const BARN_FANS: [number, number][] = [
  [104, 12],
  [132, 12],
];

registerBuilding({
  id: 'prop_h_bld_barn',
  W: 10,
  R: 6,
  F: 2,
  top: 6,
  band: 0,
  paint(b: Bld) {
    const p = b.p;
    const rY = b.roofY;
    const fY = b.faceY;
    const W = 160;
    roofTinH(p, 0, rY, W, 96, TIN_GRAY, 34, { rust: 0.18, ridgeFrac: 0.3, patches: 2 });
    // translucent skylight sheets (採光波板) on the south slope
    for (const sx of [18, 58, 98, 138]) {
      for (let j = rY + 40; j < rY + 90; j++)
        for (let i = sx; i < sx + 8; i++) {
          const lx = i % 4;
          p.set(i, j, lx === 0 ? P.white : lx === 3 ? mix(P.concrete, P.leafYoung, 0.2) : mix(P.concreteLt, P.leafLt, 0.25));
        }
    }
    // the ridge vent (越屋根): a narrow raised gable along the ridge and its dark louvred gap
    const vy = rY + 20;
    for (let j = vy; j < vy + 16; j++)
      for (let i = 6; i < W - 6; i++) {
        const lx = i % 4;
        let c: string;
        if (j < vy + 6) c = lx === 0 ? TIN_GRAY.base : lx === 3 ? TIN_GRAY.deep : TIN_GRAY.lo;
        else if (j < vy + 8) c = j === vy + 6 ? lt(TIN_GRAY.hi) : TIN_GRAY.hi;
        else if (j < vy + 13) c = lx === 0 ? TIN_GRAY.hi : lx === 3 ? TIN_GRAY.lo : TIN_GRAY.base;
        else c = (i % 3 === 0) ? P.charcoal : P.void; // the vent opening under the raised roof
        p.set(i, j, c);
      }
    p.vline(6, vy, vy + 15, lt(TIN_GRAY.hi));
    p.vline(W - 7, vy, vy + 15, TIN_GRAY.deep);
    castRight(p, 6, vy, W - 12, 16, 2);
    // ---- the south side: the rolled curtain, the bird net over the dark pens, the block wainscot
    const netY = fY + 5;
    const kosY = fY + 19;
    p.rect(0, fY, W, netY - fY, P.charcoal);
    for (let i = 0; i < W; i++) {
      p.set(i, fY + 2, P.white);
      p.set(i, fY + 3, P.concreteLt);
      p.set(i, fY + 4, P.concrete);
      if (i % 11 === 0) p.set(i, fY + 4, P.steel); // the ties of the curtain roll
    }
    for (let j = netY; j < kosY; j++)
      for (let i = 0; i < W; i++) {
        // the pens behind the net: dark, a rail of the pen 2px below the net's top
        let c: string = j < netY + 3 ? P.void : P.night;
        if (j === netY + 6) c = P.charcoal;
        // the net (#3FA66B 1px grid, 3px)
        if ((i + j) % 3 === 0 && (i - j + 300) % 3 === 0) c = mix(P.leafDeep, P.leafShade, 0.3);
        else if (i % 3 === 0 && j % 3 === 0) c = P.leafShade;
        p.set(i, j, c);
      }
    // posts between the bays
    for (let i = 0; i < W; i += 32) {
      p.vline(i + 1, netY, kosY - 1, P.concrete);
      p.vline(i + 2, netY, kosY - 1, P.steel);
    }
    wall(p, 0, kosY, W, b.botY - kosY, wallBlock(34));
    p.hline(0, W - 1, kosY, P.white);
    for (let i = 0; i < W; i++) if (h01(i, 3, 3611) < 0.4) p.set(i, b.botY - 1 - (i % 2), mix(P.concrete, P.woodDark, 0.4));
    // the wall fans' housings (the blades turn in over())
    for (const [cx, cyo] of BARN_FANS) {
      const cy = fY + cyo;
      p.ellipse(cx, cy, 10, 10, P.steel);
      p.ellipse(cx, cy, 9, 9, P.charcoal);
      p.ellipse(cx, cy, 8, 8, P.night);
      p.ring(cx, cy, 10, 10, P.concreteLt);
      for (let k = -8; k <= 8; k += 4) p.hline(cx - 8, cx + 8, cy + k, P.asphalt); // the guard
      castRight(p, cx - 10, cy - 10, 21, 21, 2);
    }
    // ---- the entrance: the big sliding door at the west end (51,31)
    const dx = 16;
    p.hline(dx - 2, dx + 17, fY + 3, P.charcoal);
    for (let j = fY + 4; j < b.botY - 1; j++)
      for (let i = dx; i < dx + 16; i++) p.set(i, j, i === dx ? P.concreteLt : i === dx + 15 ? P.asphalt : (i - dx) % 4 === 2 ? P.concrete : P.steel);
    p.hline(dx, dx + 15, fY + 4, P.white);
    p.rect(dx + 11, fY + 15, 2, 6, P.charcoal);
    p.hline(dx - 1, dx + 16, b.botY - 1, P.ink);
    // the board 「石黒牛舎」 over the net, and the white notice on the wainscot (52,31)
    const bx = 34;
    p.rect(bx, fY + 5, 36, 11, P.woodDark);
    p.rect(bx + 1, fY + 6, 34, 9, mix(P.wood, P.woodDark, 0.3));
    p.hline(bx, bx + 35, fY + 5, P.wood);
    fontTextSmall(p, '石黒牛舎', bx + 2, fY + 6, P.paper);
    castRight(p, bx, fY + 5, 36, 11, 2);
    paperNote(p, bx + 2, kosY + 2, 17, 9, P.verm, 34);
    p.set(bx + 2, kosY + 2, P.steel);
    p.set(bx + 18, kosY + 2, P.steel);
    // a hose reel hook and the boot-wash tap by the door
    p.rect(4, kosY + 3, 4, 3, P.brass);
    p.set(5, kosY + 6, P.steel);
    p.vline(6, kosY + 6, b.botY - 3, P.steel);
  },
  over(g, x, y, env, b) {
    FANS ??= fanFrames();
    // the wall fans turn slowly all night (4 frames, 180 ms)
    const k = Math.floor(env.t / 180) % 4;
    for (const [cx, cyo] of BARN_FANS) g.img(FANS[(k + (cx >> 3)) % 4], x + cx - 9, y + b.faceY + cyo - 9);
  },
  glow(g, x, y, env, b) {
    const s = hs(env);
    const fY = y + b.faceY;
    if (s >= 3) {
      // the morning: the barn's lights are on, white light out of the net (52 9.4)
      g.rect(x, fY + 5, 160, 14, '#E8ECF0', 0.35);
      return;
    }
    const k = nightK(env);
    if (k <= 0) return;
    // ear tags (#FFD23F) glinting in the dark pens; a pair where the lantern is near
    // (the lantern is in world px: the barn stands at (50,24), its only placement)
    const lan = env.lantern;
    const wx = 50 * 16;
    const wy = 24 * 16 + b.faceY;
    for (let n = 0; n < 14; n++) {
      const tx = 4 + ((n * 37 + 11) % 150);
      // not over the door and the board, nor over the fans
      if (tx > 12 && tx < 72) continue;
      if (BARN_FANS.some(([fx]) => Math.abs(fx - tx) < 12)) continue;
      const ty = 8 + ((n * 5) % 7);
      const near = lan ? Math.hypot(lan.x - (wx + tx), lan.y - (wy + ty)) < 56 : false;
      const per = 4000 + ((n * 977) % 4000);
      const on = near || (env.t + n * 613) % per < 90;
      if (!on) continue;
      g.rect(x + tx, fY + ty, 1, 1, '#FFD23F', 0.9);
      if (near) g.rect(x + tx + 3, fY + ty, 1, 1, '#FFD23F', 0.9);
    }
  },
  light(g, x, y, env, b) {
    if (hs(env) < 3) return;
    drawLight(g, poolEllipse(80, 14, HLIGHT.led), x + 80, y + b.botY + 4, 0.3);
  },
});

// ---------------------------------------------------------------- 堆肥舎 (47,40) 5×(2+2)

registerBuilding({
  id: 'prop_h_bld_taihisha',
  W: 5,
  R: 2,
  F: 2,
  top: 0,
  band: 0,
  paint(b: Bld) {
    const p = b.p;
    const rY = b.roofY;
    const fY = b.faceY;
    roofTinH(p, 0, rY, 80, 32, TIN_GRAY, 35, { mono: true, rust: 0.35 });
    // three open concrete bays, the compost heaps
    p.rect(0, fY, 80, 32, P.night);
    eaveDark(p, 0, fY, 80, 4);
    for (let k = 0; k < 3; k++) {
      const bx = 2 + k * 26;
      // the heap: dark brown, lit crumbs on top
      for (let i = 0; i < 24; i++) {
        const hgt = Math.round(14 * Math.sin((Math.PI * (i + 1)) / 25)) + (ihash(i, k, 3621) % 2);
        for (let j = 0; j < hgt; j++) {
          const yy = b.botY - 2 - j;
          p.set(bx + i, yy, j === hgt - 1 ? P.wood : h01(bx + i, yy, 3623) < 0.2 ? P.wood : P.woodDark);
        }
      }
    }
    // the dividing walls (concrete, seen end-on) and the back wall
    for (const wx of [0, 26, 52, 78]) {
      p.rect(wx, fY + 2, 2, 30, P.concrete);
      p.vline(wx, fY + 2, b.botY - 1, P.concreteLt);
    }
    p.hline(0, 79, b.botY - 1, P.steel);
    // a pitchfork against the east wall
    p.line(74, fY + 6, 76, b.botY - 2, P.woodLt);
    for (const dx of [72, 74, 76]) p.vline(dx, fY + 3, fY + 6, P.steel);
  },
  over(g, x, y, env, b) {
    // steam rising slowly off the heaps (fermenting: the one thing that moves without wind)
    const fY = y + b.faceY;
    for (let k = 0; k < 3; k++)
      for (let n = 0; n < 4; n++) {
        const ph = ((env.t / 2600 + n * 0.25 + k * 0.37) % 1 + 1) % 1;
        const px = x + 8 + k * 26 + ((n * 7) % 12) + Math.round(Math.sin(ph * 6 + n) * 1.5);
        const py = fY + 16 - Math.round(ph * 22);
        g.rect(px, py, 1, 1, '#F4F1E8', 0.28 * (1 - ph));
      }
  },
});

// ---------------------------------------------------------------- 消防小屋 (43,30) 3×(1+1)

registerBuilding({
  id: 'prop_h_shouboya',
  W: 3,
  R: 1,
  F: 1,
  top: 28,
  band: 0,
  paint(b: Bld) {
    const p = b.p;
    const rY = b.roofY;
    const fY = b.faceY;
    roofTinH(p, 0, rY, 48, 16, TIN_GRAY, 36, { ridgeFrac: 0.35, rust: 0.3 });
    wall(p, 0, fY, 48, 16, wallOld(36, 6));
    // the red roll-up door with the white 「消防」 strokes
    for (let j = fY + 2; j < b.botY - 1; j++) for (let i = 6; i < 34; i++) p.set(i, j, (j - fY) % 2 ? P.verm : P.vermShade);
    p.hline(6, 33, fY + 1, P.charcoal);
    fontTextSmall(p, '消防', 12, fY + 4, P.white);
    // the hose tower: a tall pole with the hoses hung to dry
    const hx = 40;
    p.vline(hx, 0, b.botY - 1, P.steel);
    p.vline(hx + 1, 2, b.botY - 1, P.asphalt);
    p.hline(hx - 3, hx + 4, 2, P.concrete);
    for (const dx of [-3, 4]) {
      for (let j = 3; j < 24; j++) p.set(hx + dx, j, j % 4 === 0 ? P.concreteLt : P.white);
      p.set(hx + dx, 24, P.brass);
    }
  },
});

// ---------------------------------------------------------------- 農具小屋 トマキチ (34,12) 2×(1+1)

registerBuilding({
  id: 'prop_h_koya',
  W: 2,
  R: 1,
  F: 1,
  top: 4,
  band: 0,
  paint(b: Bld) {
    const p = b.p;
    const rY = b.roofY - 4;
    const fY = b.faceY;
    roofTinH(p, 0, rY, 32, 20, TIN_RUST, 37, { ridgeFrac: 0.3, rust: 0.6, patches: 1 });
    wall(p, 0, fY, 32, 16, wallOld(37, 5));
    eaveDark(p, 0, fY, 32, 2);
    // the door with 「トマキチ」 in ink (a few strokes)
    p.rect(9, fY + 3, 14, 13, HP.oldWoodDk);
    p.strokeRect(9, fY + 3, 14, 13, P.woodDark);
    for (let k = 0; k < 4; k++) {
      p.hline(12, 14 + (k % 2), fY + 5 + k * 2, P.ink);
      if (k % 2) p.set(18, fY + 5 + k * 2, P.ink);
    }
    p.set(21, fY + 10, P.steel); // the latch
    // a sickle on a nail, a straw hat
    p.line(3, fY + 5, 6, fY + 7, P.steel);
    p.vline(3, fY + 5, fY + 11, P.woodLt);
    p.ellipse(28, fY + 7, 3, 2, P.goldPale);
    p.hline(25, 31, fY + 8, P.brass);
  },
});

// ---------------------------------------------------------------- 稲わらのロールと片流れの屋根 (50,22) 8×1

registerProp('prop_h_wara_shed', () => {
  // A low lean-to against the canal's south wall: the galvanised roof (mono
  // pitch, falling to the front), under its eave the dark back wall of old
  // boards, the six rolls (直径 20px) standing in a row in front of it. The
  // roof's back edge sits on the canal wall, so the shed hides the canal's
  // south half like any building hides what is behind it.
  const W = 128;
  const H = 36;
  const p = new PixelCanvas(W, H);
  const base = H - 1; // the rolls' foot (bottom of tile row 22)
  const ROOF = 11;
  const GALV: RoofPal = { hi: P.concreteLt, base: P.concrete, lo: mix(P.concrete, P.steel, 0.6), deep: P.steel };
  // the back wall and the shade under the roof (rough boards, gaps of dark)
  for (let j = ROOF; j <= base; j++)
    for (let i = 1; i < W - 1; i++) {
      const board = Math.floor((i + (ihash(j >> 3, 0, 3811) % 3)) / 9);
      let c: string = (i + 9) % 9 === 0 ? P.ink : ihash(board, 1, 3813) % 3 === 0 ? mix(P.woodDark, P.ink, 0.35) : mix(P.woodDark, P.ink, 0.55);
      if (j === ROOF || j === ROOF + 1) c = P.ink; // the eave's own shadow
      p.set(i, j, c);
    }
  // the ground under the shed: straw litter in the shade
  for (let i = 2; i < W - 2; i++) if (ihash(i, 2, 3815) % 3 === 0) p.set(i, base - (ihash(i, 3, 3817) % 2), mix(P.woodLt, P.woodDark, 0.5));
  // the corner posts (squared timber, weathered) and the middle posts behind the rolls
  for (const px of [0, W - 2]) {
    p.vline(px, ROOF - 1, base, P.woodDark);
    p.vline(px + 1, ROOF - 1, base, P.wood);
  }
  for (const px of [42, 85]) p.vline(px, ROOF, base - 18, P.wood);
  // the roof: galvanised sheet, ribs down the slope, some rust, the front eave
  roofTinH(p, 0, 0, W, ROOF, GALV, 38, { mono: true, rust: 0.35, patches: 1 });
  p.hline(0, W - 1, 0, P.steel); // the back edge on the canal wall
  p.hline(0, W - 1, ROOF - 1, P.white); // the lit front edge
  for (let i = 0; i < W; i += 4) p.set(i, ROOF - 1, P.concreteLt);
  // a stone on the roof against the wind, a coil of twine on a nail
  p.ellipse(33, 4, 2.5, 1.5, P.steel);
  p.hline(32, 34, 3, P.concreteLt);
  // six rolls (直径 20px): gold with a spiral of 1px
  for (let k = 0; k < 6; k++) {
    const cx = 11 + k * 21;
    const cy = base - 9;
    p.ellipse(cx, cy, 10, 9.5, P.brassOld);
    p.ellipse(cx - 0.5, cy - 0.5, 9, 8.5, P.woodLt);
    for (let a = 0; a < 40; a++) {
      const t = a / 40;
      const r = 1 + t * 7.5;
      const th = t * Math.PI * 6 + k;
      p.set(Math.round(cx + Math.cos(th) * r), Math.round(cy + Math.sin(th) * r * 0.95), P.brassOld);
    }
    // the roof's shade on the rolls' tops
    for (let i = -9; i <= 9; i++) {
      const top = Math.round(cy - Math.sqrt(Math.max(0, 90 - i * i)) * 0.95);
      for (let j = top; j < top + 2; j++) if (p.get(cx + i, j)) p.set(cx + i, j, P.brassOld);
    }
    p.set(cx - 5, cy - 5, P.goldPale);
    p.set(cx - 6, cy - 3, P.goldPale);
    p.set(cx - 3, cy - 6, P.goldPale);
    // loose straws
    for (let s = 0; s < 3; s++) p.set(cx - 9 + ((k * 7 + s * 5) % 18), base - (s % 2), P.woodLt);
  }
  const img = p.toCanvas();
  const a: PropArt = { ox: 0, oy: 16 - H, w: W, h: H, foot: 15, img: () => img, contact: 0 };
  return a;
});

// ---------------------------------------------------------------- 雨よけハウス 1〜3号 (x,21) 3×(8+2)

/**
 * A rain-shelter greenhouse seen from above: the long round hood of film
 * over the rows of tomatoes (dark streaks through the film), ribs every
 * 16px, the rolled side film at both edges; the half-round south end with
 * its wooden door frame. n = 1 (old film, patched), 2 (bees inside), 3 (the
 * newest film; the glow at the far end until the tomato is picked).
 */
registerBuilding((opts: Record<string, unknown>) => {
  const n = Number(opts.n ?? 3);
  return {
    id: 'prop_h_vinyl',
    W: 3,
    R: 8,
    F: 2,
    top: 4,
    band: 0,
    paint(b: Bld) {
      const p = b.p;
      const rY = b.roofY;
      const fY = b.faceY;
      const W = 48;
      const film = n === 1 ? P.paperGrid : n === 2 ? P.concreteLt : P.white;
      const clear = n === 3 ? 0.5 : n === 2 ? 0.4 : 0.3; // how much of the inside shows
      for (let j = rY; j < fY + 2; j++)
        for (let i = 0; i < W; i++) {
          // the round section: bright along the crown, darker to the sides
          const u = Math.abs(i + 0.5 - W / 2) / (W / 2);
          let c = mix(film, P.steel, u * u * 0.8);
          // rows of plants inside (4 dark streaks), seen through the film
          const row = ((i - 3) % 12 + 12) % 12;
          if (row < 5 && i > 2 && i < W - 3) c = mix(c, P.leafShade, clear * (row === 0 || row === 4 ? 0.55 : 0.9));
          if (row >= 5 && i > 2 && i < W - 3 && h01(i, j, 3631 + n) < 0.08) c = mix(c, P.charcoal, clear * 0.6);
          // the ribs every 16px, the crown line
          if ((j - rY) % 16 === 0) c = P.concrete;
          if (i === 23 || i === 24) c = (j - rY) % 16 === 0 ? P.white : mix(c, P.white, 0.5);
          p.set(i, j, c);
        }
      // the rolled side film (3px tubes) and the side poles
      for (let j = rY; j < fY + 2; j++) {
        p.set(0, j, P.steel);
        p.set(1, j, film);
        p.set(2, j, P.concrete);
        p.set(W - 3, j, film);
        p.set(W - 2, j, P.concrete);
        p.set(W - 1, j, P.asphalt);
      }
      // the north end: the round top of the hood
      for (let i = 0; i < W; i++) {
        const u = Math.abs(i + 0.5 - W / 2) / (W / 2);
        const cut = Math.round((1 - Math.sqrt(1 - Math.min(1, u * u))) * 5);
        for (let j = rY; j < rY + cut; j++) p.set(i, j, 'transparent');
        p.set(i, rY + cut, P.concreteLt);
      }
      if (n === 1) {
        // old film: yellowed, square repair tapes, a slack wrinkle
        // the repair tapes: translucent, gone the colour of old paper, their edges lifting (darker)
        for (const [tx, ty] of [[9, 30], [31, 62], [15, 95], [36, 18]] as const) {
          for (let j = 0; j < 5; j++)
            for (let i = 0; i < 5; i++) {
              const edge = i === 0 || j === 0 || i === 4 || j === 4;
              const under = p.get(tx + i, rY + ty + j) ? 0.45 : 0;
              p.set(tx + i, rY + ty + j, edge ? mix(P.paperGrid, P.steel, 0.45) : mix(P.paperGrid, film, under));
            }
          p.set(tx + 4, rY + ty, P.concrete); // a corner coming unstuck
        }
        for (let j = rY + 40; j < rY + 80; j++) if (j % 3) p.set(18 + ((j >> 2) % 2), j, P.woodLt);
      }
      // ---- the south end (妻面): half-round film, the wooden door frame, the crank
      for (let j = fY; j < b.botY; j++)
        for (let i = 0; i < W; i++) {
          const u = Math.abs(i + 0.5 - W / 2) / (W / 2);
          const top = fY + 2 + Math.round((1 - Math.sqrt(Math.max(0, 1 - u * u))) * 12);
          if (j < top) continue;
          let c = mix(film, P.nightShade, 0.35 + (1 - clear) * 0.2);
          if (j === top) c = P.concreteLt;
          if ((i - 3) % 12 < 5 && j > fY + 10) c = mix(c, P.leafShade, clear * 0.6);
          p.set(i, j, c);
        }
      // the arch pipe
      for (let i = 0; i < W; i++) {
        const u = Math.abs(i + 0.5 - W / 2) / (W / 2);
        const top = fY + 2 + Math.round((1 - Math.sqrt(Math.max(0, 1 - u * u))) * 12);
        p.set(i, top, P.white);
        p.set(i, top + 1, P.steel);
      }
      // the door frame and the sliding film door
      const dx = 16;
      p.rect(dx, fY + 8, 16, 24, P.wood);
      p.rect(dx + 2, fY + 10, 12, 22, mix(film, P.nightShade, 0.45));
      p.vline(dx, fY + 8, b.botY - 1, P.woodLt);
      p.hline(dx, dx + 15, fY + 8, P.woodLt);
      p.vline(dx + 15, fY + 8, b.botY - 1, P.woodDark);
      p.vline(dx + 8, fY + 10, b.botY - 1, P.wood);
      p.hline(dx + 2, dx + 13, fY + 19, P.wood);
      if (n === 2) {
        // 「ハチ 飼育中 あけたら しめて」 on a small card
        paperNote(p, dx + 3, fY + 12, 10, 7, P.ink, 39);
        p.rect(dx + 4, fY + 13, 2, 2, P.gold);
      }
      // the side-film crank handle in the corner
      p.ring(W - 6, b.botY - 6, 2.5, 2.5, P.steel);
      p.set(W - 6, b.botY - 6, P.charcoal);
      p.set(W - 3, b.botY - 8, P.charcoal);
      // the ground line and the side film roll ends
      p.hline(0, W - 1, b.botY - 1, P.steel);
    },
    glow: n === 3 ? vinylGlow : undefined,
    light: n === 3 ? vinylLight : undefined,
  };
});

/** 3号's far end in h0: the はなまるトマト's glow through the film (52 3.9). */
function vinylGlow(g: Gfx, x: number, y: number, env: PropEnv, b: Bld): void {
  if (env.flag('flag_ch2_got_tomato') || hs(env) >= 1) return;
  const k = nightK(env);
  if (k <= 0) return;
  const breathe = Math.round(Math.sin(env.t * 0.0008 * Math.PI * 2) * 2);
  const cx = x + 24;
  const cy = y + b.roofY + 12;
  glowDot(g, cx, cy, '#FFE7A3', '242,137,75', 20 + breathe, 0.7 * k);
  g.rect(cx - 1, cy - 1, 3, 3, '#F2894B', 0.6 * k);
  g.rect(cx, cy, 1, 1, '#FFE7A3', 0.8 * k);
  // the light leaking along the ribs, 2px at a time
  for (let r = 0; r < 3; r++) {
    const ry = y + b.roofY + 16 + r * 16;
    const a = (0.45 - r * 0.13) * k;
    g.rect(cx - 12 + r * 2, ry, 24 - r * 4, 1, '#F2894B', a);
  }
  // and down the length of the house, faint, so the film door at the south
  // end shows the far light too (seen from the road below: 52 3.10 2:55)
  const dx = x + 16;
  const fy = y + b.faceY;
  const pulse = 0.85 + 0.15 * Math.sin(env.t * 0.0008 * Math.PI * 2);
  g.rect(dx + 3, fy + 11, 10, 7, '#F2894B', 0.16 * k * pulse);
  g.rect(dx + 6, fy + 13, 4, 3, '#F2894B', 0.3 * k * pulse);
  g.rect(dx + 7, fy + 14, 2, 1, '#FFE7A3', 0.55 * k * pulse);
}
function vinylLight(g: Gfx, x: number, y: number, env: PropEnv, b: Bld): void {
  if (env.flag('flag_ch2_got_tomato') || hs(env) >= 1) return;
  const breathe = Math.round(Math.sin(env.t * 0.0008 * Math.PI * 2) * 2);
  drawLight(g, poolEllipse(20 + breathe, 20 + breathe, '242,137,75'), x + 24, y + b.roofY + 12, 0.35 * nightK(env));
  // the far glow comes out of the film door too: a faint orange fan on the
  // yard to the south, so the house reads from the road and the bridge
  // (52 3.10 2:55: 「3棟のうち西の1棟だけ光っている」)
  const pulse = 0.85 + 0.15 * Math.sin(env.t * 0.0008 * Math.PI * 2);
  const fan = poolTrapezoid(12, 48, 72, '242,137,75');
  drawLightAt(g, fan, x + 24 - fan.width / 2, y + b.botY - 2, 0.6 * nightK(env) * pulse);
}

// ---------------------------------------------------------------- 待合室 (15,40) 7×4

/**
 * The station's waiting hut: a wooden hut open to the platform, painted-brown
 * tin gable. Three props so characters inside sort right: the inside (back
 * wall with the timetable, side walls, floor) drawn under everyone; the front
 * wall; the roof in the foreground, fading to 20% while someone is inside.
 */
registerProp('prop_h_machiai', () => {
  const W = 112;
  const H = 64 + 8;
  const p = new PixelCanvas(W, H);
  const oy = 8; // canvas y of the anchor tile's top (row 40)
  // the back wall's inner face (row 40, 16px, plus 8px of wall above)
  wall(p, 0, 0, W, oy + 16, wallLap(P.wood, 40, 5));
  for (let i = 0; i < W; i++) {
    p.set(i, 0, P.woodDark);
    p.set(i, oy + 15, P.woodDark);
  }
  // the station timetable (20,40): a white board with rows of figures, the lower rows emptier
  const tx = 82;
  p.rect(tx, 3, 14, 18, P.white);
  p.strokeRect(tx, 3, 14, 18, P.woodDark);
  for (let r = 0; r < 7; r++) {
    const len = r < 3 ? 10 : r < 5 ? 6 : 3;
    for (let i = 0; i < len; i++) if (i % 3 !== 2) p.set(tx + 2 + i, 5 + r * 2, P.ink);
  }
  p.hline(tx + 1, tx + 12, 4, P.navy);
  castRight(p, tx, 3, 14, 18, 2);
  // a poster of the observatory's star party (old, curling) and a calendar
  p.rect(8, 5, 10, 13, P.navy);
  p.set(12, 8, P.white);
  p.ellipse(13, 13, 4, 2, P.concreteLt);
  p.set(17, 5, P.paperGrid);
  p.rect(28, 6, 8, 10, P.white);
  p.hline(28, 35, 6, P.verm);
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) p.set(29 + c * 2, 9 + r * 2, P.steel);
  // the floor (rows 41–42): old concrete, the platform's grit blown in
  for (let j = oy + 16; j < oy + 48; j++)
    for (let i = 4; i < W - 4; i++) p.set(i, j, h01(i, j, 3641) < 0.12 ? P.steel : (j % 16 === 0 ? mix(P.concrete, P.steel, 0.5) : P.concrete));
  // the side walls (x15, x21), seen end-on: 4px of board with a lit top
  for (const sx of [0, W - 4]) {
    for (let j = oy - 2; j < oy + 48; j++) for (let i = sx; i < sx + 4; i++) p.set(i, j, i === sx ? P.woodLt : (j % 5 === 0 ? P.woodDark : P.wood));
  }
  shadeRect(p, 4, oy + 16, W - 8, 2, 1);
  const img = p.toCanvas();
  return { ox: 0, oy: -oy, w: W, h: H, foot: 15, img: () => img, contact: 0 };
});

registerProp('prop_h_machiai_front', () => {
  // anchored at (15,43): the front wall with the opening at x18, and the roof above the whole hut
  const W = 112;
  const p = new PixelCanvas(W, 20);
  wall(p, 0, 4, W, 16, wallLap(P.wood, 41, 5));
  // the eave's shadow on the top of the front wall (the roof overhangs it)
  for (let j = 4; j < 8; j++) for (let i = 0; i < W; i++) p.set(i, j, mix(p.get(i, j) ? P.woodDark : P.woodDark, P.ink, j < 6 ? 0.55 : 0.3));
  // the opening at x18: the dim inside under the roof — the bench's cushions
  // (red-brown, a faded blue one) and a fleck of the timetable's white on the
  // back wall — in its upper half; the floor shows through below
  for (let j = 0; j < 20; j++) for (let i = 48; i < 64; i++) p.set(i, j, 'transparent');
  for (let j = 4; j < 11; j++)
    for (let i = 48; i < 64; i++) p.set(i, j, j < 6 ? P.ink : mix(P.woodDark, P.ink, 0.5));
  p.rect(49, 9, 6, 2, P.maroon);
  p.hline(49, 54, 9, mix(P.maroon, P.peach, 0.35));
  p.rect(56, 9, 5, 2, mix(P.navy, P.steel, 0.3));
  p.hline(56, 60, 9, mix(P.navy, P.steel, 0.55));
  p.rect(59, 6, 3, 2, P.concreteLt); // the timetable, far back
  p.set(59, 6, P.white);
  // the door posts (old timber, grey-brown)
  for (const px of [46, 64]) {
    p.vline(px, 2, 19, HP.oldWoodDk);
    p.vline(px + 1, 2, 19, HP.oldWood);
  }
  // the corner posts
  for (const px of [0, W - 2]) {
    p.vline(px, 4, 19, HP.oldWood);
    p.vline(px + 1, 4, 19, HP.oldWoodDk);
  }
  // a line of top rail
  p.hline(2, 45, 8, P.woodLt);
  p.hline(66, W - 3, 8, P.woodLt);
  // the swallow's nest under the eave at the west end (15,43)
  p.ellipse(8, 7, 3, 2, P.wood);
  p.hline(6, 10, 6, P.woodLt);
  p.set(8, 9, P.woodDark);
  p.hline(0, W - 1, 19, P.ink);
  const img = p.toCanvas();
  // the roof: a painted-brown corrugated tin gable seen from above, over rows
  // 39.5–43 — the ridge cap catching the starlight, the ribs, rust running
  // down from the nails, the barge boards at both gable ends, the eave's lip
  const RW = W + 8;
  const R = new PixelCanvas(RW, 64);
  roofTinH(R, 0, 0, RW, 60, TIN_BROWN, 40, { ridgeFrac: 0.4, rust: 0.5, patches: 2 });
  // stronger ribs (every 4px a lit crest) so the sheet reads as corrugated tin
  for (let j = 28; j < 58; j++)
    for (let i = 3; i < RW - 3; i += 4) {
      R.set(i, j, j % 9 === 0 ? P.woodLt : mix(P.woodLt, P.goldPale, 0.25));
      R.set(i + 2, j, mix(P.woodDark, P.ink, 0.2));
    }
  // rust streaks down the south slope
  for (let k = 0; k < 7; k++) {
    const x = 6 + ((k * 37 + 11) % (RW - 12));
    const y0 = 30 + ((k * 13) % 12);
    for (let j = y0; j < Math.min(58, y0 + 8 + (k % 3) * 5); j++) R.set(x, j, mix(P.brassOld, P.wood, (j - y0) / 20));
  }
  // the ridge cap: a rounded strip with its starlit crest
  for (let i = 0; i < RW; i++) {
    R.set(i, 23, P.woodDark);
    R.set(i, 24, P.goldPale);
    R.set(i, 25, P.woodLt);
    R.set(i, 26, P.wood);
    R.set(i, 27, P.woodDark);
  }
  // the barge boards at the gable ends (west lit, east in shade)
  for (let j = 0; j < 60; j++) {
    R.set(0, j, P.woodDark);
    R.set(1, j, HP.oldWood);
    R.set(2, j, HP.oldWoodDk);
    R.set(RW - 3, j, HP.oldWoodDk);
    R.set(RW - 2, j, HP.oldWoodDk);
    R.set(RW - 1, j, P.ink);
  }
  // the eave's lip and the dark under it
  for (let i = 0; i < RW; i++) {
    R.set(i, 58, P.woodLt);
    R.set(i, 59, P.wood);
    R.set(i, 60, P.woodDark);
    R.set(i, 61, P.ink);
  }
  const roof = R.toCanvas();
  const a: PropArt = {
    ox: 0,
    oy: -4,
    w: W,
    h: 20,
    // one px before the row's foot: someone standing in the doorway (18,43) is drawn in front
    foot: 15,
    img: () => img,
    fg: [{ ox: -4, oy: -62, img: () => roof, fade: { x: 4, y: -40, w: W - 8, h: 44, alpha: 0.2 } }],
  };
  return a;
});

void TIN_RUST;
void dk;
