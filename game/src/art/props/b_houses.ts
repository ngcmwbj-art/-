// Houses of ひぐらし坂 and the park toilet (30_level_art 6.2): every house
// gets its own roof material, wall, windows and clutter.

import type { PixelCanvas } from '../../engine/pixel';
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
  KAWARA_IBUSHI,
  meter,
  rainStreaks,
  registerBuilding,
  roofCement,
  roofCopper,
  roofFlat,
  roofKawara,
  roofSlate,
  roofTin,
  shadeRect,
  signBoard,
  slidingDoor,
  sunWash,
  wallBoards,
  wallMortar,
  wallPlaster,
  wallSiding,
  wallTiles,
  windowAt,
  type Bld,
} from './bkit';
import { dk, lt } from './kit';
import { printLines, scribble, tiny } from './text';
import { drawLight, drawLightAt, halo, LIGHT, poolEllipse, poolTrapezoid } from './light';

/** Leaves of a planter / potted plant row on a sill or at a foot. */
function plants(p: PixelCanvas, x: number, y: number, n: number, seed: number): void {
  for (let k = 0; k < n; k++) {
    const h = ihash(k, seed, 1201);
    const px = x + k * 6;
    const pot = h % 3 === 0 ? P.skin4 : h % 3 === 1 ? P.wood : P.concrete;
    p.rect(px, y - 3, 5, 3, pot);
    p.hline(px, px + 4, y - 3, lt(pot));
    p.set(px + 4, y - 2, dk(pot));
    const leaf = h % 2 ? P.leaf : P.leafDeep;
    p.rect(px + 1, y - 6, 3, 3, leaf);
    p.set(px + 1, y - 6, P.leafYoung);
    p.set(px + 2, y - 7, P.leafYoung);
    p.set(px + 3, y - 4, P.leafShade);
    if (h % 4 === 0) p.set(px + 2, y - 6, P.crimson);
  }
}

/** Air conditioner outdoor unit mounted on a wall. */
export function acUnit(p: PixelCanvas, x: number, y: number): void {
  castRight(p, x, y, 12, 9, 3);
  p.rect(x, y, 12, 9, P.concreteLt);
  p.hline(x, x + 11, y, P.white);
  p.vline(x, y, y + 8, P.white);
  p.hline(x, x + 11, y + 8, P.steel);
  p.vline(x + 11, y + 1, y + 8, P.steel);
  p.ellipse(x + 4.5, y + 4.5, 3.5, 3.5, P.charcoal);
  p.ring(x + 4.5, y + 4.5, 3.5, 3.5, P.steel);
  p.set(x + 4, y + 4, P.concrete);
  for (let j = y + 2; j < y + 7; j += 2) p.hline(x + 9, x + 10, j, P.steel);
}

function antenna(p: PixelCanvas, x: number, y0: number, y1: number): void {
  p.vline(x, y0, y1, P.steel);
  p.vline(x + 1, y0 + 2, y1, P.charcoal);
  for (const [dy, w] of [[1, 9], [4, 7], [7, 5]] as const) {
    p.hline(x - Math.floor(w / 2), x + Math.floor(w / 2), y0 + dy, P.concrete);
    for (let i = x - Math.floor(w / 2); i <= x + Math.floor(w / 2); i += 2) p.set(i, y0 + dy + 1, P.steel);
  }
  // guy wires
  p.line(x, y0 + 6, x - 7, y1, P.asphalt);
  p.line(x + 1, y0 + 6, x + 8, y1, P.asphalt);
}

// ---------------------------------------------------------------- 小林家 (home)

registerBuilding({
  id: 'bld_shiomi',
  W: 8,
  R: 3,
  F: 3,
  top: 12,
  paint(b: Bld) {
    const p = b.p;
    const rY = b.roofY;
    const fY = b.faceY;
    roofKawara(p, 0, rY, 128, 48, KAWARA_IBUSHI, 1, 0.3);
    // solar water heater on the front slope
    const sx = 14;
    const sy = rY + 24;
    castRight(p, sx, sy, 30, 12, 3);
    p.rect(sx, sy, 30, 12, P.steel);
    for (let k = 0; k < 3; k++) {
      p.rect(sx + 1 + k * 10, sy + 4, 8, 7, P.navy);
      p.hline(sx + 1 + k * 10, sx + 8 + k * 10, sy + 4, P.blue);
      p.set(sx + 2 + k * 10, sy + 5, P.aqua);
      b.mask.rect(sx + 1 + k * 10, sy + 4, 8, 7, '#ffffff');
    }
    p.rect(sx, sy, 30, 4, P.concreteLt);
    p.hline(sx, sx + 29, sy, P.white);
    p.hline(sx, sx + 29, sy + 3, P.concrete);
    // antenna on the ridge
    antenna(p, 96, 0, rY + 15);
    // 2F wall (cream siding)
    fillWall(p, 0, fY, 128, 16, wallSiding(P.paperGrid, 3));
    eaveShadow(p, 0, fY, 128, 3);
    windowAt(b, 12, fY + 4, 22, 9, 'alu', { curtain: P.aqua, side: 'l' });
    windowAt(b, 76, fY + 4, 18, 9, 'alu', { curtain: P.peach, side: 'r' });
    // futon over the railing of the 2F veranda (east)
    p.rect(100, fY + 5, 22, 3, P.steel);
    p.hline(100, 121, fY + 5, P.concreteLt);
    p.rect(104, fY + 7, 14, 5, P.white);
    p.hline(104, 117, fY + 11, P.concrete);
    for (let i = 106; i < 118; i += 3) p.set(i, fY + 9, P.aqua);
    p.rect(100, fY + 12, 22, 2, P.steel);
    castRight(p, 100, fY + 5, 22, 9, 2);
    // 1F lean-to roof (下屋)
    const gY = fY + 16;
    for (let i = 0; i < 128; i++) {
      for (let j = 0; j < 7; j++) {
        const lx = i % 6;
        let c: string = lx === 1 || lx === 2 ? P.steel : lx >= 4 ? P.charcoal : P.asphalt;
        if (j === 0) c = P.charcoal;
        if (j === 5) c = lx === 1 || lx === 2 ? P.concrete : P.steel;
        if (j === 6) c = P.ink;
        p.set(i, gY + j, c);
      }
    }
    // 1F wall (plaster, warm white)
    fillWall(p, 0, gY + 7, 128, 25, wallPlaster(P.concreteLt, 5));
    eaveShadow(p, 0, gY + 7, 128, 2);
    // entrance (genkan) at tile x=4
    p.rect(60, gY + 9, 24, 3, P.woodDark);
    p.hline(60, 83, gY + 9, P.wood);
    shadeRect(p, 60, gY + 12, 26, 2);
    slidingDoor(b, 64, gY + 13, 16, 19, P.woodDark);
    // porch lamp
    p.rect(58, gY + 14, 3, 4, P.goldPale);
    p.set(58, gY + 14, P.glint);
    p.set(60, gY + 17, P.brassOld);
    // living room window with lace curtain
    windowAt(b, 14, gY + 12, 30, 12, 'alu', { curtain: P.white, side: 'both' });
    // kitchen window (frosted)
    windowAt(b, 96, gY + 12, 12, 8, 'alu', { curtain: P.concreteLt, side: 'both' });
    p.rect(96, gY + 12, 12, 8, P.concrete);
    b.mask.rect(96, gY + 12, 12, 8, 'transparent');
    p.set(97, gY + 13, P.white);
    p.set(98, gY + 13, P.white);
    drainPipe(p, 2, fY + 2, b.botY - 2);
    drainPipe(p, 124, fY + 2, b.botY - 2);
    meter(p, 88, gY + 13);
    facadeFoot(p, 0, b.botY, 128);
    rainStreaks(p, 0, gY + 9, 128, 14, 1, 9);
    // left corner rim
    for (let j = fY; j < b.botY; j++) if (j % 3 !== 2) p.set(0, j, P.sun);
  },
  glow(g, x, y, env, b) {
    // 8.6: at night the Shiomi living room is the warmest window in town —
    // the lace curtain glows amber, the porch lamp is lit
    const n = env.grade.night;
    if (n < 0.05) return;
    const gY = b.faceY + 16;
    g.rect(x + 14, y + gY + 12, 30, 12, P.sky, 0.5 * n);
    g.rect(x + 15, y + gY + 17, 28, 6, P.horizon, 0.45 * n);
    g.rect(x + 14, y + gY + 12, 30, 1, P.goldPale, 0.4 * n);
    halo(g, x + 29, y + gY + 18, 20, LIGHT.lamp, 0.22 * n);
    halo(g, x + 59, y + gY + 16, 6, LIGHT.street, 0.5 * n);
    g.rect(x + 58, y + gY + 14, 3, 4, P.glint, 0.9 * n);
  },
  light(g, x, y, env, b) {
    // the living room's light and the porch lamp on the path and the wall
    const n = env.grade.night;
    if (n < 0.05) return;
    const gY = b.faceY + 16;
    drawLightAt(g, poolTrapezoid(34, 58, 30, LIGHT.lamp), x + 29 - 29, y + b.botY - 1, 0.75 * n);
    drawLight(g, poolEllipse(30, 20, LIGHT.lamp), x + 29, y + gY + 18, 0.45 * n);
    drawLight(g, poolEllipse(26, 16, LIGHT.street), x + 59, y + b.botY + 4, 0.55 * n);
  },
});

// ---------------------------------------------------------------- 水まきの家

registerBuilding({
  id: 'bld_mizumaki',
  W: 5,
  R: 3,
  F: 3,
  top: 12,
  paint(b: Bld) {
    const p = b.p;
    const rY = b.roofY;
    const fY = b.faceY;
    roofTin(p, 0, rY, 80, 48, { hi: P.sunShade, base: P.maroon, lo: P.nightShade, deep: P.ink }, 2, 0.22);
    // drying platform (物干し台) on the roof
    const px = 38;
    const py = rY + 6;
    p.rect(px, py + 10, 34, 4, P.woodLt);
    for (let i = px; i < px + 34; i += 3) p.set(i, py + 12, P.wood);
    p.hline(px, px + 33, py + 13, P.woodDark);
    for (const x of [px, px + 16, px + 33]) {
      p.vline(x, py - 6, py + 12, P.steel);
      p.set(x, py - 6, P.white);
    }
    p.hline(px, px + 33, py - 6, P.concrete);
    p.hline(px, px + 33, py - 2, P.steel);
    // towels on the line
    for (const [tx, c] of [[px + 4, P.white], [px + 11, P.gold], [px + 20, P.aqua]] as [number, string][]) {
      p.rect(tx, py - 5, 5, 8, c);
      p.vline(tx + 4, py - 5, py + 2, dk(c));
      p.hline(tx, tx + 4, py - 5, lt(c));
    }
    castRight(p, px, py + 10, 34, 4, 3);
    // wall: pale siding, darker at the foot where the hose sprays
    fillWall(p, 0, fY, 80, 48, wallSiding(P.concreteLt, 7));
    eaveShadow(p, 0, fY, 80, 3);
    windowAt(b, 8, fY + 5, 20, 10, 'alu', { curtain: P.goldPale, side: 'r' });
    windowAt(b, 52, fY + 5, 16, 10, 'alu');
    // entrance: aluminium door with a small awning
    awning(p, 30, fY + 19, 20, 3, P.steel, null, false);
    glassDoor(b, 33, fY + 25, 14, 23, P.steel);
    p.rect(35, fY + 27, 10, 8, P.concreteLt);
    b.mask.rect(35, fY + 27, 10, 8, 'transparent');
    p.set(36, fY + 28, P.white);
    windowAt(b, 8, fY + 26, 18, 11, 'alu', { curtain: P.white, side: 'l' });
    windowAt(b, 56, fY + 26, 14, 9, 'alu', { curtain: P.concrete, side: 'both' });
    plants(p, 54, fY + 44, 3, 5);
    // wet lower wall
    shadeRect(p, 0, fY + 38, 80, 8, 1, (i, j) => ((i * 3 + j * 5) % 7) !== 0 || j > fY + 41);
    drainPipe(p, 76, fY + 2, b.botY - 2);
    meter(p, 3, fY + 30);
    facadeFoot(p, 0, b.botY, 80);
    for (let j = fY; j < b.botY; j++) if (j % 3 !== 2) p.set(0, j, P.sun);
  },
});

// ---------------------------------------------------------------- おじいさんの家

registerBuilding({
  id: 'bld_ojii',
  W: 5,
  R: 2,
  F: 3,
  top: 0,
  paint(b: Bld) {
    const p = b.p;
    const fY = b.faceY;
    roofCement(p, 0, b.roofY, 80, 32, 3);
    // old board wall with a plaster band on top
    fillWall(p, 0, fY, 80, 14, wallPlaster(P.paperGrid, 9));
    fillWall(p, 0, fY + 14, 80, 34, wallBoards(P.wood, 11, 5));
    eaveShadow(p, 0, fY, 80, 3);
    p.hline(0, 79, fY + 13, P.woodDark);
    p.hline(0, 79, fY + 14, P.woodLt);
    // transom lattice
    for (let i = 6; i < 74; i += 3) p.vline(i, fY + 5, fY + 10, P.woodDark);
    p.hline(6, 73, fY + 4, P.woodDark);
    p.hline(6, 73, fY + 11, P.woodDark);
    // sliding shoji doors behind glass with bamboo blinds (すだれ)
    windowAt(b, 6, fY + 17, 40, 26, 'shoji', { sill: false });
    for (let i = 4; i < 48; i++) {
      for (let j = fY + 15; j < fY + 36; j++) {
        if ((j - fY) % 2 === 0) p.set(i, j, (i + j) % 7 === 0 ? P.woodLt : P.goldPale);
        else if (i % 9 === 0) p.set(i, j, P.brassOld);
      }
    }
    // blind cords and hem
    p.hline(4, 47, fY + 36, P.brassOld);
    p.vline(10, fY + 36, fY + 39, P.verm);
    p.vline(40, fY + 36, fY + 39, P.verm);
    castRight(p, 4, fY + 15, 44, 22, 3);
    // entrance
    slidingDoor(b, 54, fY + 19, 18, 29, P.woodDark);
    p.rect(54, fY + 15, 18, 3, P.woodDark);
    // house number plate & small mailbox slot
    p.rect(74, fY + 20, 4, 6, P.white);
    p.vline(75, fY + 21, fY + 24, P.ink);
    p.vline(76, fY + 22, fY + 23, P.ink);
    castRight(p, 74, fY + 20, 4, 6, 2);
    // old calendar pinned by the door
    facadeFoot(p, 0, b.botY, 80, P.steel);
    for (let j = fY; j < b.botY; j++) if (j % 3 !== 2) p.set(0, j, P.sun);
  },
});

// ---------------------------------------------------------------- 坂の上の家（石垣・銅板屋根・達筆の表札）

registerBuilding({
  id: 'bld_slopetop',
  W: 4,
  R: 2,
  F: 3,
  top: 8,
  paint(b: Bld) {
    const p = b.p;
    const fY = b.faceY;
    roofCopper(p, 0, b.roofY, 64, 32, 4);
    // lightning rod
    p.vline(32, 0, b.roofY + 4, P.steel);
    p.set(32, 0, P.glint);
    p.set(31, 2, P.steel);
    p.set(33, 2, P.steel);
    // plaster wall (warm grey) above a stone wall (石垣)
    fillWall(p, 0, fY, 64, 30, wallMortar(P.concrete, 13));
    eaveShadow(p, 0, fY, 64, 3);
    windowAt(b, 6, fY + 6, 16, 12, 'wood', { curtain: P.paperGrid, side: 'l' });
    windowAt(b, 28, fY + 6, 12, 12, 'wood');
    // gate: roofed gateposts with the nameplate (17,20)
    p.rect(44, fY + 12, 20, 3, P.charcoal);
    p.hline(44, 63, fY + 12, P.asphalt);
    castRight(p, 44, fY + 12, 18, 3, 2);
    p.rect(46, fY + 15, 16, 15, P.woodDark);
    for (let i = 47; i < 61; i += 2) p.vline(i, fY + 16, fY + 29, P.wood);
    // nameplate: calligraphy far too fluent to read
    p.rect(58, fY + 17, 5, 10, P.woodLt);
    p.vline(58, fY + 17, fY + 26, P.goldPale);
    p.line(60, fY + 18, 61, fY + 21, P.ink);
    p.line(61, fY + 21, 59, fY + 24, P.ink);
    p.line(59, fY + 24, 61, fY + 26, P.ink);
    p.set(60, fY + 20, P.ink);
    castRight(p, 58, fY + 17, 5, 10, 2);
    // stone wall
    for (let j = fY + 30; j < b.botY; j++)
      for (let i = 0; i < 44; i++) {
        const row = Math.floor((j - fY - 30) / 6);
        const ly = (j - fY - 30) % 6;
        const off = ihash(0, row, 1301) % 7;
        const bx = Math.floor((i + off) / 9);
        const lx = (i + off) % 9;
        const hh = ihash(bx, row, 1303);
        let c: string = hh % 3 === 0 ? P.asphalt : P.steel;
        if (lx === 0 || ly === 0) c = hh % 3 === 0 ? P.steel : P.concrete;
        if (lx === 8 || ly === 5) c = hh % 4 === 0 ? P.leafDeep : P.charcoal;
        p.set(i, j, c);
      }
    // white chalk arrow on one stone
    p.hline(10, 14, fY + 39, P.white);
    p.set(13, fY + 38, P.white);
    p.set(13, fY + 40, P.white);
    p.rect(44, fY + 30, 20, 18, P.woodDark);
    for (let i = 45; i < 63; i += 2) p.vline(i, fY + 31, b.botY - 1, P.wood);
    p.hline(44, 63, fY + 30, P.woodLt);
    for (let j = fY; j < b.botY; j++) if (j % 3 !== 2) p.set(0, j, P.sun);
  },
});

// ---------------------------------------------------------------- 婦人の家（洋風・白い漆喰）

registerBuilding({
  id: 'bld_madam',
  W: 4,
  R: 2,
  F: 3,
  top: 6,
  paint(b: Bld) {
    const p = b.p;
    const rY = b.roofY;
    const fY = b.faceY;
    roofSlate(p, 0, rY, 64, 32, 5);
    // dormer window (屋根窓)
    const dx = 22;
    const dy = rY - 2;
    p.rect(dx, dy + 6, 20, 14, P.white);
    p.poly([[dx - 2, dy + 7], [dx + 10, dy - 2], [dx + 22, dy + 7]], P.charcoal);
    p.line(dx - 2, dy + 7, dx + 10, dy - 2, P.asphalt);
    p.line(dx + 10, dy - 2, dx + 22, dy + 7, P.ink);
    glassPaneSmall(b, dx + 5, dy + 9, 10, 8);
    castRight(p, dx, dy + 6, 20, 14, 3);
    // white plaster wall
    fillWall(p, 0, fY, 64, 48, wallPlaster(P.white, 17));
    eaveShadow(p, 0, fY, 64, 3);
    // arched window with a flower box
    windowAt(b, 8, fY + 6, 14, 16, 'arch', { curtain: P.peach, side: 'both', frame: P.woodDark });
    p.rect(6, fY + 24, 18, 3, P.woodDark);
    for (let i = 7; i < 23; i += 2) {
      p.set(i, fY + 23, i % 4 === 1 ? P.crimson : P.peach);
      p.set(i + 1, fY + 23, P.leaf);
    }
    // front door with a porch lamp
    p.rect(34, fY + 18, 18, 30, P.concreteLt);
    p.rect(36, fY + 21, 14, 27, P.wood);
    p.vline(36, fY + 21, b.botY - 1, P.woodLt);
    p.rect(39, fY + 24, 8, 10, P.woodDark);
    p.set(47, fY + 36, P.brass);
    p.rect(52, fY + 22, 3, 5, P.goldPale);
    p.set(52, fY + 22, P.glint);
    castRight(p, 52, fY + 22, 3, 5, 2);
    // 犬に注意 plate
    p.rect(8, fY + 32, 12, 7, P.white);
    p.strokeRect(8, fY + 32, 12, 7, P.steel);
    scribble(p, 9, fY + 33, 2, P.verm, 51, 4);
    castRight(p, 8, fY + 32, 12, 7, 2);
    // hairline cracks with rain stains
    p.line(26, fY + 8, 29, fY + 16, P.concrete);
    rainStreaks(p, 0, fY + 3, 64, 20, 5, 11);
    facadeFoot(p, 0, b.botY, 64, P.concrete);
    for (let j = fY; j < b.botY; j++) if (j % 3 !== 2) p.set(0, j, P.sun);
  },
});

function glassPaneSmall(b: Bld, x: number, y: number, w: number, h: number): void {
  b.p.rect(x - 1, y - 1, w + 2, h + 2, P.woodDark);
  b.p.rect(x, y, w, h, P.shadeDeep);
  b.mask.rect(x, y, w, h, '#ffffff');
  b.p.vline(x + Math.floor(w / 2), y, y + h - 1, P.woodDark);
  b.p.set(x + 1, y + h - 2, P.glint);
  b.lights.push([x, y, w, h]);
}

// ---------------------------------------------------------------- 公衆トイレ（公園）

const FAN = frames(3, 8, 8, 60, (p, k) => {
  p.rect(0, 0, 8, 8, P.steel);
  p.rect(1, 1, 6, 6, P.charcoal);
  const pts = [
    [[3, 1], [4, 6], [1, 3], [6, 4]],
    [[1, 1], [6, 6], [1, 6], [6, 1]],
    [[4, 1], [3, 6], [1, 4], [6, 3]],
  ][k];
  for (const [x, y] of pts) p.set(x, y, P.concreteLt);
  p.set(3, 3, P.white);
  p.set(4, 4, P.concrete);
});

registerBuilding({
  id: 'bld_toilet',
  W: 4,
  R: 1,
  F: 2,
  top: 4,
  paint(b: Bld) {
    const p = b.p;
    const fY = b.faceY;
    const inner = roofFlat(p, 0, b.roofY, 64, 16, { base: P.concrete, seed: 3 });
    void inner;
    // vent hood
    p.rect(40, b.roofY - 2, 12, 10, P.concreteLt);
    p.hline(40, 51, b.roofY - 2, P.white);
    p.hline(40, 51, b.roofY + 7, P.steel);
    castRight(p, 40, b.roofY - 2, 12, 10, 3);
    // walls: plaster above white tiles
    fillWall(p, 0, fY, 64, 10, wallPlaster(P.concreteLt, 21));
    fillWall(p, 0, fY + 10, 64, 22, wallTiles(P.white, P.concrete, 4));
    eaveShadow(p, 0, fY, 64, 2);
    // two entrances with privacy screens
    for (const [ex, mark] of [[6, P.blue], [40, P.red]] as [number, string][]) {
      p.rect(ex, fY + 8, 18, 24, P.nightShade);
      p.rect(ex + 2, fY + 12, 14, 20, P.shadeDeep);
      p.hline(ex, ex + 17, fY + 8, P.ink);
      // screen wall in front
      p.rect(ex + 3, fY + 18, 12, 14, P.concreteLt);
      p.hline(ex + 3, ex + 14, fY + 18, P.white);
      p.vline(ex + 14, fY + 18, fY + 31, P.steel);
      castRight(p, ex + 3, fY + 18, 12, 14, 2);
      // pictogram plate
      p.rect(ex + 6, fY + 1, 7, 6, P.white);
      p.strokeRect(ex + 6, fY + 1, 7, 6, P.steel);
      p.rect(ex + 9, fY + 2, 1, 1, mark);
      p.rect(ex + 8, fY + 3, 3, 3, mark);
      if (mark === P.red) p.hline(ex + 7, ex + 11, fY + 5, mark);
    }
    // wash basin between
    p.rect(27, fY + 16, 10, 5, P.white);
    p.hline(27, 36, fY + 16, P.glint);
    p.set(31, fY + 14, P.steel);
    p.set(32, fY + 14, P.steel);
    p.rect(30, fY + 21, 4, 11, P.concrete);
    castRight(p, 27, fY + 16, 10, 5, 2);
    // park notice
    signBoard(p, 26, fY + 2, 12, 9, P.white, P.steel, 2);
    printLines(p, 28, fY + 4, 8, 3, P.asphalt, 7);
    facadeFoot(p, 0, b.botY, 64, P.steel);
    for (let j = fY; j < b.botY; j++) if (j % 3 !== 2) p.set(0, j, P.sun);
    tiny(p, 'WC', 29, fY + 26, P.steel);
  },
  over(g, x, y, env, b) {
    g.img(frameAt(FAN, env.mt), x + 42, y + b.roofY);
  },
  band: 10,
});
