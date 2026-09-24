// 夕鳴銀座・北の列（看板建築, 30_level_art 6.2）: 肉のマルヤマ, 駄菓子ひのや,
// 豆腐まめ吉, 時計店チクタク堂, 喫茶 夕顔, 山吹酒店. Each facade faces the
// arcade; signs are drawn facing the screen (3.10).

import type { Gfx } from '../../engine/gfx';
import { PixelCanvas } from '../../engine/pixel';
import { P } from '../tiles/palette';
import { ihash } from '../tiles/noise';
import {
  awning,
  castRight,
  drainPipe,
  eaveShadow,
  facadeFoot,
  fillWall,
  frameAt,
  frames,
  glassDoor,
  KAWARA_OLD,
  norenFrames,
  roofFlat,
  roofKawara,
  roofTin,
  shadeRect,
  signBoard,
  slidingDoor,
  steamFrames,
  sunWash,
  wallBoards,
  wallMortar,
  wallPlaster,
  windowAt,
  type Bld,
  registerBuilding,
} from './bkit';
import { dk, glassPane, lt } from './kit';
import { acUnit } from './b_houses';
import { fontSmallWidth, fontText, fontTextSmall, fontWidth, handGlyph, printLines, scribble, tiny } from './text';
import { registerProp } from './registry';
import { drawLightAt, LIGHT, poolTrapezoid } from './light';
import type { PropEnv } from './types';

function rimLeft(p: PixelCanvas, y0: number, y1: number): void {
  for (let j = y0; j < y1; j++) if (j % 3 !== 2) p.set(0, j, P.sun);
}

/** Water tank on legs (屋上の給水タンク). */
function waterTank(p: PixelCanvas, x: number, y: number): void {
  castRight(p, x, y, 16, 14, 4);
  for (const lx of [x + 2, x + 13]) p.vline(lx, y + 9, y + 15, P.asphalt);
  p.rect(x, y, 16, 10, P.concreteLt);
  p.hline(x, x + 15, y, P.white);
  p.vline(x, y, y + 9, P.white);
  p.vline(x + 15, y + 1, y + 9, P.steel);
  p.hline(x, x + 15, y + 9, P.steel);
  p.hline(x + 1, x + 14, y + 4, P.concrete);
  p.rect(x + 6, y - 2, 4, 2, P.steel);
}

/** Small colourful goods / bags hanging from the eaves (sway frames). */
const BAGS = frames(3, 44, 9, 520, (p, k) => {
  p.hline(0, 43, 0, P.woodDark);
  const cols = [P.red, P.gold, P.blue, P.leafYoung, P.peach, P.aqua, P.verm, P.goldPale];
  for (let n = 0; n < 7; n++) {
    const x = 1 + n * 6 + (n % 2);
    const sway = k === 0 ? 0 : k === 1 ? (n % 2 ? 1 : 0) : (n % 3 === 0 ? -1 : 0);
    const c = cols[n % cols.length];
    p.vline(x + 1, 1, 2, P.steel);
    p.rect(x + sway, 3, 4, 5, c);
    p.hline(x + sway, x + 3 + sway, 3, lt(c));
    p.vline(x + 3 + sway, 4, 7, dk(c));
    p.set(x + 1 + sway, 5, P.white);
  }
});

/** Glass wind chime (風鈴) 2 frames. */
const FURIN = frames(3, 7, 14, 700, (p, k) => {
  p.vline(3, 0, 1, P.steel);
  p.ellipse(3.5, 4, 3, 2.6, P.aqua);
  p.set(2, 3, P.glint);
  p.hline(1, 5, 6, P.blue);
  const sx = k === 1 ? 1 : k === 2 ? -1 : 0;
  p.vline(3, 7, 8, P.steel);
  p.rect(2 + sx, 9, 3, 5, P.paper);
  p.set(2 + sx, 12, P.crimson);
});

// ---------------------------------------------------------------- 肉のマルヤマ

const NOREN_MEAT = norenFrames(16, 9, P.verm, 2, (p) => {
  handGlyph(p, '肉', 2, 0, P.white);
});

registerBuilding({
  id: 'bld_maruyama',
  W: 6,
  R: 3,
  F: 3,
  top: 6,
  paint(b: Bld) {
    const p = b.p;
    const rY = b.roofY;
    const fY = b.faceY;
    const [ix, iy] = roofFlat(p, 0, rY, 96, 48, { base: P.concrete, seed: 7 });
    waterTank(p, ix + 60, iy + 4);
    // rooftop billboard frame (steel lattice) at the front edge
    for (let i = 6; i < 58; i += 6) p.vline(i, rY + 26, rY + 44, P.asphalt);
    p.hline(4, 58, rY + 26, P.steel);
    p.hline(4, 58, rY + 35, P.asphalt);
    for (let i = 6; i < 56; i += 6) p.line(i, rY + 26, i + 6, rY + 35, P.charcoal);
    castRight(p, 4, rY + 26, 56, 19, 3);
    acUnit(p, ix + 64, iy + 26);
    // facade: white tiles 2F, sign, red tent, storefront
    fillWall(p, 0, fY, 96, 48, wallMortar(P.concreteLt, 3));
    eaveShadow(p, 0, fY, 96, 2);
    signBoard(p, 3, fY + 2, 90, 16, P.white, P.steel, 3);
    // big red 肉 in a red ring + マルヤマ
    p.ellipse(13, fY + 10, 8, 7, P.verm);
    p.ellipse(13, fY + 10, 7, 6, P.white);
    handGlyph(p, '肉', 7, fY + 4, P.red, P.vermShade);
    const mw = fontWidth('マルヤマ');
    fontText(p, 'マルヤマ', 24 + Math.floor((66 - mw) / 2), fY + 4, P.red, { shadow: P.vermShade });
    // red tent
    awning(p, 0, fY + 19, 96, 5, P.red, P.white, true);
    // showcase (tiles 24–25 → x 0..31): warm lit glass case
    const sy = fY + 32;
    p.rect(1, sy, 30, 16, P.steel);
    p.rect(2, sy + 1, 28, 9, P.goldPale);
    glassPane(p, b.mask, 2, sy + 1, 28, 9, { base: P.goldPale, glint: true });
    // meat trays inside
    for (let k = 0; k < 4; k++) {
      const tx = 3 + k * 7;
      p.rect(tx, sy + 5, 6, 4, P.white);
      p.rect(tx + 1, sy + 6, 4, 2, k % 2 ? P.crimson : P.peach);
      p.set(tx + 1, sy + 6, P.skin1);
    }
    // croquettes on a tray
    for (let k = 0; k < 5; k++) p.rect(4 + k * 5, sy + 2, 3, 2, P.brass);
    p.rect(1, sy + 10, 30, 6, P.concreteLt);
    p.hline(1, 30, sy + 10, P.white);
    p.hline(1, 30, sy + 15, P.charcoal);
    // price tag: コロッケ 80円
    p.rect(20, sy + 11, 10, 4, P.paper);
    tiny(p, '80', 21, sy + 11, P.verm);
    b.lights.push([2, sy + 1, 28, 9]);
    // pillar between showcase and door
    p.rect(32, fY + 24, 16, 24, P.concreteLt);
    fillWall(p, 32, fY + 24, 16, 24, wallMortar(P.white, 9));
    // menu board: 手書きのお品書き
    signBoard(p, 35, fY + 27, 10, 13, P.paper, P.wood, 2);
    printLines(p, 37, fY + 30, 6, 4, P.verm, 3);
    // glass door (27,21)
    glassDoor(b, 49, fY + 24, 14, 24, P.steel);
    // fryer window (tiles 28–29): steam and warm light
    windowAt(b, 66, fY + 27, 26, 12, 'alu', { curtain: undefined, sill: true });
    p.rect(66, fY + 33, 26, 6, P.brassOld);
    p.hline(66, 91, fY + 33, P.goldPale);
    printLines(p, 68, fY + 29, 20, 2, P.paper, 11, 2);
    fillWall(p, 64, fY + 42, 32, 6, wallMortar(P.concrete, 2));
    facadeFoot(p, 0, b.botY, 96, P.steel);
    drainPipe(p, 94, fY + 1, b.botY - 1);
    rimLeft(p, fY, b.botY);
  },
  over(g, x, y, env, b) {
    const f = env.stage === 1 ? 0 : env.stage >= 2 ? 2 : Math.floor(env.mt / 600) % 2;
    g.img(NOREN_MEAT.f[f], x + 48, y + b.faceY + 24);
  },
  glow(g, x, y, env, b) {
    // the showcase glass is lit (a little by day, fully at night)
    const a = 0.1 + 0.3 * env.grade.night;
    g.rect(x + 2, y + b.faceY + 33, 28, 9, P.goldPale, a);
    g.rect(x + 3, y + b.faceY + 38, 26, 3, P.horizon, a * 0.8);
  },
  light(g, x, y, env, b) {
    // warm showcase light spilling onto the arcade floor
    const n = env.grade.night;
    if (n < 0.05) return;
    drawLightAt(g, poolTrapezoid(30, 44, 22, LIGHT.window), x + 16 - 22, y + b.botY - 1, 0.7 * n);
  },
});

// ---------------------------------------------------------------- 駄菓子 ひのや

registerBuilding({
  id: 'bld_hinoya',
  W: 5,
  R: 3,
  F: 3,
  top: 2,
  paint(b: Bld) {
    const p = b.p;
    const fY = b.faceY;
    roofKawara(p, 0, b.roofY, 80, 48, KAWARA_OLD, 5, 0.34);
    // 2F: plaster with a wooden lattice window (虫籠窓)
    fillWall(p, 0, fY, 80, 14, wallPlaster(P.paperGrid, 23));
    eaveShadow(p, 0, fY, 80, 3);
    windowAt(b, 12, fY + 4, 24, 7, 'lattice', { sill: false });
    windowAt(b, 50, fY + 4, 18, 7, 'lattice', { sill: false });
    // 庇 (small tiled eave) between floors
    for (let i = 0; i < 80; i++)
      for (let j = 0; j < 6; j++) {
        const lx = i % 5;
        let c: string = lx < 2 ? P.asphalt : lx === 4 ? P.ink : P.charcoal;
        if (j === 0) c = P.ink;
        if (j === 4) c = lx < 2 ? P.steel : P.asphalt;
        if (j === 5) c = P.night;
        p.set(i, fY + 14 + j, c);
      }
    // 1F: dark wooden frontage
    fillWall(p, 0, fY + 20, 80, 28, wallBoards(P.woodDark, 5, 4));
    eaveShadow(p, 0, fY + 20, 80, 2);
    // wooden 看板 standing on the eave of the roof: ひのや
    const sw = fontWidth('ひのや') + 10;
    const sx = Math.floor((80 - sw) / 2);
    for (const px of [sx + 6, sx + sw - 8]) p.rect(px, fY - 4, 2, 5, P.woodDark);
    signBoard(p, sx, fY - 17, sw, 14, P.wood, P.woodDark, 3);
    fontText(p, 'ひのや', sx + 5, fY - 16, P.paper, { shadow: P.woodDark });
    fontText(p, 'ひのや', sx + 6, fY - 16, P.paper);
    // glass sliding doors across the front (door D at tile 32 → x 32..47)
    slidingDoor(b, 20, fY + 24, 20, 24, P.wood);
    slidingDoor(b, 40, fY + 24, 20, 24, P.wood);
    // goods visible through the glass: jars and boxes
    for (let k = 0; k < 6; k++) {
      const gx = 22 + k * 6;
      p.rect(gx, fY + 38, 4, 5, [P.gold, P.red, P.aqua, P.leafYoung, P.peach, P.gold][k]);
      p.set(gx, fY + 38, P.glint);
    }
    // ramune crate and the old tin sign on the pillars
    p.rect(3, fY + 25, 13, 16, P.navy);
    p.strokeRect(3, fY + 25, 13, 16, P.nightShade);
    p.rect(5, fY + 27, 9, 4, P.white);
    scribble(p, 5, fY + 32, 2, P.gold, 9, 4, true);
    castRight(p, 3, fY + 25, 13, 16, 2);
    p.rect(64, fY + 26, 13, 12, P.gold);
    p.strokeRect(64, fY + 26, 13, 12, P.brassOld);
    scribble(p, 66, fY + 28, 2, P.verm, 13, 4);
    p.rect(66, fY + 34, 9, 2, P.verm);
    castRight(p, 64, fY + 26, 13, 12, 2);
    facadeFoot(p, 0, b.botY, 80, P.steel);
    rimLeft(p, fY, b.botY);
  },
  over(g, x, y, env, b) {
    g.img(frameAt(BAGS, env.mt), x + 18, y + b.faceY + 21);
    g.img(frameAt(FURIN, env.mt, 0.4), x + 40, y + b.faceY + 3);
  },
  light(g, x, y, env, b) {
    const n = env.grade.night;
    if (n < 0.05) return;
    drawLightAt(g, poolTrapezoid(40, 56, 20, LIGHT.window), x + 40 - 28, y + b.botY - 1, 0.6 * n);
  },
});

// ---------------------------------------------------------------- 豆腐まめ吉（開いた店先）

const NOREN_TOFU = norenFrames(56, 9, P.navy, 4, (p, k) => {
  // white 豆 on the two middle panels
  const dy = k === 2 ? -1 : 0;
  handGlyph(p, '豆', 16, 1 + dy, P.white);
  handGlyph(p, '豆', 30, 1 + dy, P.white);
});

registerBuilding({
  id: 'bld_tofu',
  W: 4,
  R: 3,
  F: 3,
  top: 14,
  paint(b: Bld) {
    const p = b.p;
    const rY = b.roofY;
    const fY = b.faceY;
    roofTin(p, 0, rY, 64, 48, { hi: P.concreteLt, base: P.steel, lo: P.asphalt, deep: P.charcoal }, 9, 0.18);
    // chimney (煙突)
    p.rect(44, rY - 10, 6, 24, P.charcoal);
    p.vline(44, rY - 10, rY + 13, P.steel);
    p.rect(43, rY - 12, 8, 3, P.asphalt);
    p.hline(43, 50, rY - 12, P.steel);
    castRight(p, 44, rY - 10, 6, 24, 4);
    // rooftop sign facing the arcade: 豆腐 まめ吉
    signBoard(p, 1, rY + 26, 62, 16, P.paper, P.navy, 2);
    p.rect(3, rY + 28, 12, 12, P.navy);
    handGlyph(p, '豆', 5, rY + 30, P.white);
    fontText(p, 'まめ吉', 16, rY + 27, P.navy, { spacing: -2 });
    for (const lx of [10, 52]) p.vline(lx, rY + 42, rY + 47, P.asphalt);
    // facade: plaster above the open front
    fillWall(p, 0, fY, 64, 8, wallPlaster(P.concreteLt, 31));
    eaveShadow(p, 0, fY, 64, 2);
    // open storefront: interior shows through (transparent) – drawn by bld_tofu_back
    p.rect(4, fY + 7, 56, 26, 'transparent');
    // posts
    fillWall(p, 0, fY + 7, 4, 41, wallBoards(P.wood, 3, 4));
    fillWall(p, 60, fY + 7, 4, 41, wallBoards(P.wood, 4, 4));
    p.hline(0, 63, fY + 7, P.woodDark);
    // counter: stainless top, wooden front (row 21)
    p.rect(4, fY + 33, 56, 3, P.concreteLt);
    p.hline(4, 59, fY + 33, P.white);
    p.hline(4, 59, fY + 35, P.steel);
    fillWall(p, 4, fY + 36, 56, 12, wallBoards(P.woodLt, 7, 6));
    p.hline(4, 59, fY + 36, P.wood);
    // price cards on the counter front
    for (const [cx, txt] of [[8, '120'], [40, '90']] as [number, string][]) {
      p.rect(cx, fY + 38, 14, 7, P.paper);
      p.strokeRect(cx, fY + 38, 14, 7, P.woodDark);
      tiny(p, txt, cx + 2, fY + 39, P.navy);
    }
    facadeFoot(p, 0, b.botY, 64, P.steel);
    rimLeft(p, fY, b.botY);
  },
  over(g, x, y, env, b) {
    // chimney steam (stops at stage 1: motion clock)
    if (env.stage !== 1) g.img(frameAt(steamFrames(), env.mt), x + 42, y + b.roofY - 30);
    const f = env.stage === 1 ? 0 : env.stage >= 2 ? 2 : Math.floor(env.mt / 600) % 2;
    g.img(NOREN_TOFU.f[f], x + 4, y + b.faceY + 7);
    // white 豆 on the middle panels
  },
  band: 10,
});

/** Interior behind the open tofu shop front (flat layer, under the shopkeeper). */
registerProp('bld_tofu_back', () => tofuBack());

function tofuBack() {
  const p = new PixelCanvas(56, 32);
  // back wall and shelves in the shop's shade
  p.rect(0, 0, 56, 32, P.nightShade);
  p.rect(0, 0, 56, 10, P.shadeDeep);
  // fluorescent tube
  p.hline(10, 44, 1, P.glint);
  p.hline(10, 44, 2, P.horizon);
  // tofu vat (white water tank) and shelves
  p.rect(2, 12, 20, 12, P.steel);
  p.rect(3, 13, 18, 4, P.aqua);
  p.hline(3, 20, 13, P.white);
  for (let k = 0; k < 3; k++) p.rect(4 + k * 6, 15, 4, 3, P.white);
  p.rect(30, 6, 22, 3, P.wood);
  p.rect(30, 14, 22, 3, P.wood);
  for (let k = 0; k < 5; k++) {
    p.rect(31 + k * 4, 3, 3, 3, [P.gold, P.white, P.brass, P.white, P.leafYoung][k]);
    p.rect(31 + k * 4, 11, 3, 3, [P.white, P.goldPale, P.white, P.paperGrid, P.white][k]);
  }
  // steam from the vat
  p.set(8, 10, P.concreteLt);
  p.set(12, 8, P.concreteLt);
  p.set(10, 6, P.concrete);
  const img = p.toCanvas();
  return {
    ox: 4,
    oy: 7,
    w: 56,
    h: 32,
    foot: 0,
    flat: true,
    img: () => img,
    over: (g: Gfx, x: number, y: number, env: PropEnv) => {
      // flickering tube
      const on = env.stage >= 2 ? Math.floor(env.t / 90) % 23 !== 0 : true;
      if (!on) g.rect(x + 14, y + 8, 35, 2, P.shadeDeep);
    },
  };
}

// ---------------------------------------------------------------- 時計店チクタク堂

registerBuilding({
  id: 'bld_clock',
  W: 4,
  R: 3,
  F: 3,
  top: 14,
  paint(b: Bld) {
    const p = b.p;
    const rY = b.roofY;
    const fY = b.faceY;
    const [ix, iy] = roofFlat(p, 0, rY, 64, 48, { base: P.concreteLt, seed: 11 });
    // rooftop clock objet: a big pocket-watch on a post
    p.vline(20, rY + 8, rY + 30, P.asphalt);
    p.vline(21, rY + 8, rY + 30, P.charcoal);
    p.ellipse(20.5, rY - 2, 9, 9, P.brass);
    p.ellipse(20.5, rY - 2, 7.5, 7.5, P.white);
    p.ring(20.5, rY - 2, 9, 9, P.brassOld);
    p.set(14, rY - 7, P.goldPale);
    p.set(15, rY - 8, P.goldPale);
    p.vline(20, rY - 7, rY - 2, P.ink);
    p.hline(20, 24, rY - 2, P.ink);
    p.rect(19, rY - 13, 3, 3, P.brass);
    castRight(p, 11, rY - 11, 19, 19, 4);
    void ix;
    void iy;
    // facade: dark green tiles with a gold-framed sign
    fillWall(p, 0, fY, 64, 48, wallMortar(P.leafShade, 5));
    eaveShadow(p, 0, fY, 64, 2);
    signBoard(p, 3, fY + 2, 58, 15, P.nightShade, P.brass, 3);
    p.strokeRect(4, fY + 3, 56, 13, P.goldPale);
    fontText(p, '時計', 16, fY + 3, P.goldPale, { shadow: P.brassOld });
    // little clock faces either side of the lettering
    for (const cx of [9, 55]) {
      p.ellipse(cx, fY + 9, 4, 4, P.brass);
      p.ellipse(cx, fY + 9, 3, 3, P.paper);
      p.vline(cx, fY + 7, fY + 9, P.ink);
      p.hline(cx, cx + 1, fY + 9, P.ink);
    }
    // window recess for obj_clock_shop (x 4..51, y fY+22..45)
    p.rect(3, fY + 21, 50, 26, P.brassOld);
    p.strokeRect(3, fY + 21, 50, 26, P.brass);
    p.hline(3, 52, fY + 21, P.goldPale);
    // narrow glass door
    glassDoor(b, 53, fY + 22, 10, 26, P.brass);
    facadeFoot(p, 0, b.botY, 64, P.steel);
    rimLeft(p, fY, b.botY);
  },
});

// ---------------------------------------------------------------- 喫茶 夕顔

registerBuilding({
  id: 'bld_cafe',
  W: 5,
  R: 3,
  F: 3,
  top: 4,
  paint(b: Bld) {
    const p = b.p;
    const rY = b.roofY;
    const fY = b.faceY;
    const [ix, iy, iw] = roofFlat(p, 0, rY, 80, 48, { base: P.concrete, seed: 17 });
    // rooftop vegetable planters
    for (let k = 0; k < 3; k++) {
      const px = ix + 6 + k * 22;
      const py = iy + 8 + (k % 2) * 6;
      p.rect(px, py + 6, 16, 6, P.skin4);
      p.hline(px, px + 15, py + 6, P.skin3);
      p.hline(px, px + 15, py + 11, P.wood);
      for (let i = 0; i < 16; i += 3) {
        p.rect(px + i, py + 2 + (i % 2), 3, 4, P.leaf);
        p.set(px + i, py + 2 + (i % 2), P.leafYoung);
      }
      if (k === 1) p.set(px + 7, py + 3, P.red);
      castRight(p, px, py + 2, 16, 10, 3);
    }
    void iw;
    // dark wood exterior
    fillWall(p, 0, fY, 80, 48, wallBoards(P.woodDark, 9, 6));
    eaveShadow(p, 0, fY, 80, 2);
    // sign: 喫茶 夕顔
    signBoard(p, 6, fY + 2, 68, 14, P.paper, P.woodDark, 3);
    const tw = fontWidth('喫茶夕顔', 1);
    fontText(p, '喫茶夕顔', 6 + Math.floor((68 - tw) / 2), fY + 2, P.woodDark, { spacing: 1 });
    // arched windows
    windowAt(b, 20, fY + 22, 14, 16, 'arch', { curtain: P.crimson, side: 'both', frame: P.wood });
    windowAt(b, 60, fY + 22, 14, 16, 'arch', { curtain: P.crimson, side: 'both', frame: P.wood });
    // stained glass over the door
    const dgx = 40;
    const cols = [P.crimson, P.gold, P.blue, P.gold, P.crimson];
    for (let k = 0; k < 5; k++) p.rect(dgx + 1 + k * 3, fY + 19, 3, 4, cols[k]);
    p.strokeRect(dgx, fY + 18, 17, 6, P.wood);
    // door with a brass handle and a hanging OPEN plate
    p.rect(dgx, fY + 25, 17, 23, P.wood);
    p.rect(dgx + 2, fY + 27, 13, 9, P.shadeDeep);
    glassPane(p, b.mask, dgx + 3, fY + 28, 11, 7, { base: P.shadeDeep });
    p.set(dgx + 14, fY + 38, P.brass);
    p.rect(dgx + 4, fY + 30, 9, 5, P.paper);
    tiny(p, 'OP', dgx + 5, fY + 30, P.leafShade);
    b.lights.push([dgx + 3, fY + 28, 11, 7]);
    // food sample case (tile 46 → x 0..15)
    const cx = 1;
    const cy = fY + 30;
    p.rect(cx, cy, 16, 18, P.woodDark);
    glassPane(p, b.mask, cx + 1, cy + 1, 14, 10, { base: P.goldPale });
    // cream soda
    p.rect(cx + 2, cy + 4, 3, 6, P.leafYoung);
    p.set(cx + 3, cy + 3, P.white);
    p.set(cx + 3, cy + 2, P.red);
    // napolitan
    p.rect(cx + 6, cy + 7, 4, 3, P.sunDeep);
    p.set(cx + 7, cy + 7, P.leaf);
    // pudding
    p.rect(cx + 11, cy + 6, 3, 3, P.gold);
    p.hline(cx + 11, cx + 13, cy + 6, P.wood);
    p.rect(cx + 1, cy + 11, 14, 7, P.wood);
    printLines(p, cx + 2, cy + 12, 12, 3, P.paper, 21);
    b.lights.push([cx + 1, cy + 1, 14, 10]);
    facadeFoot(p, 0, b.botY, 80, P.charcoal);
    rimLeft(p, fY, b.botY);
    // wall lamps
    p.rect(35, fY + 24, 3, 4, P.gold);
    p.rect(58, fY + 24, 3, 4, P.gold);
  },
  glow(g, x, y, env, b) {
    const ctx = g.ctx;
    ctx.save();
    ctx.globalAlpha = 0.25 + 0.4 * env.grade.night;
    ctx.fillStyle = P.horizon;
    ctx.fillRect(Math.round(x + 35), Math.round(y + b.faceY + 24), 3, 4);
    ctx.fillRect(Math.round(x + 58), Math.round(y + b.faceY + 24), 3, 4);
    ctx.restore();
  },
});

// ---------------------------------------------------------------- 山吹酒店

const SUGIDAMA = frames(3, 12, 16, 900, (p, k) => {
  p.vline(6, 0, 2, P.woodDark);
  const cx = 6 + (k === 1 ? 0.5 : k === 2 ? -0.5 : 0);
  p.ellipse(cx, 9, 5.5, 5.5, P.brassOld);
  for (let j = 4; j < 15; j++)
    for (let i = 0; i < 12; i++) {
      if (p.alpha(i, j) === 0) continue;
      const h = ihash(i, j, 1401);
      p.set(i, j, h % 3 === 0 ? P.wood : h % 3 === 1 ? P.brassOld : P.goldPale);
    }
  p.set(3, 6, P.goldPale);
  p.set(4, 5, P.goldPale);
});

registerBuilding({
  id: 'bld_sake',
  W: 5,
  R: 3,
  F: 3,
  top: 10,
  paint(b: Bld) {
    const p = b.p;
    const rY = b.roofY;
    const fY = b.faceY;
    roofTin(p, 0, rY, 80, 48, { hi: P.goldPale, base: P.brass, lo: P.brassOld, deep: P.wood }, 13, 0.3);
    // stacked beer crates on the roof
    for (let k = 0; k < 4; k++) {
      const cx = 44 + (k % 2) * 13;
      const cy = rY + 4 + Math.floor(k / 2) * 9 - (k % 2) * 2;
      p.rect(cx, cy, 12, 8, P.gold);
      p.hline(cx, cx + 11, cy, P.goldPale);
      p.rect(cx + 2, cy + 2, 8, 3, P.brassOld);
      p.hline(cx, cx + 11, cy + 7, P.brassOld);
      castRight(p, cx, cy, 12, 8, 3);
    }
    // wooden lattice facade
    fillWall(p, 0, fY, 80, 48, wallBoards(P.wood, 15, 3));
    eaveShadow(p, 0, fY, 80, 2);
    // yellow sign 山吹酒店
    signBoard(p, 4, fY + 2, 72, 15, P.gold, P.brassOld, 3);
    const tw = fontWidth('山吹酒店');
    fontText(p, '山吹酒店', 4 + Math.floor((72 - tw) / 2), fY + 2, P.woodDark);
    // glass sliding doors (the shop is open: bottles on shelves inside)
    slidingDoor(b, 22, fY + 22, 20, 26, P.woodDark);
    slidingDoor(b, 42, fY + 22, 20, 26, P.woodDark);
    for (let k = 0; k < 8; k++) {
      const bx = 24 + k * 5;
      p.rect(bx, fY + 33, 2, 6, [P.leafShade, P.brass, P.leafShade, P.maroon][k % 4]);
      p.set(bx, fY + 32, P.charcoal);
    }
    // lattice window (left) and poster (right)
    windowAt(b, 4, fY + 24, 14, 14, 'lattice', { frame: P.woodDark });
    signBoard(p, 65, fY + 23, 12, 16, P.white, P.steel, 2);
    p.rect(67, fY + 25, 8, 6, P.blue);
    p.rect(69, fY + 27, 4, 3, P.gold);
    printLines(p, 67, fY + 33, 8, 3, P.asphalt, 31);
    facadeFoot(p, 0, b.botY, 80, P.steel);
    rimLeft(p, fY, b.botY);
    drainPipe(p, 77, fY + 1, b.botY - 1);
  },
  over(g, x, y, env, b) {
    g.img(frameAt(SUGIDAMA, env.mt, 0.3), x + 30, y + b.faceY + 17);
  },
});

export { rimLeft, waterTank };
