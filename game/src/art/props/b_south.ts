// 夕鳴銀座・南の列（川べり通りに正面を向ける, 30_level_art 6.2）: コインランドリー
// ふわり, 夕鳴写真館, シャッターの3軒, 交番 — and the mall facade.

import type { Gfx } from '../../engine/gfx';
import { PixelCanvas } from '../../engine/pixel';
import { P } from '../tiles/palette';
import { ihash } from '../tiles/noise';
import {
  castRight,
  drainPipe,
  eaveShadow,
  facadeFoot,
  fillWall,
  frameAt,
  frames,
  glassDoor,
  KAWARA_IBUSHI,
  registerBuilding,
  roofFlat,
  roofKawara,
  roofTin,
  signBoard,
  steamFrames,
  sunWash,
  wallMortar,
  wallPlaster,
  wallTiles,
  windowAt,
  type Bld,
  type RoofPal,
} from './bkit';
import { dk, glassPane, lt, shadeRect } from './kit';
import { acUnit } from './b_houses';
import { rimLeft } from './b_shops';
import { fontText, fontTextSmall, fontWidth, handGlyph, printLines, scribble, tiny } from './text';
import type { PropEnv } from './types';

// ---------------------------------------------------------------- コインランドリー ふわり

const AC_FAN = frames(3, 6, 6, 60, (p, k) => {
  p.ellipse(3, 3, 3, 3, P.charcoal);
  const pts = [[[1, 2], [4, 3]], [[2, 1], [3, 4]], [[1, 3], [4, 2]]][k];
  for (const [x, y] of pts) p.set(x, y, P.steel);
  p.set(3, 3, P.concrete);
});

registerBuilding({
  id: 'bld_laundry',
  W: 5,
  R: 3,
  F: 3,
  top: 16,
  paint(b: Bld) {
    const p = b.p;
    const rY = b.roofY;
    const fY = b.faceY;
    const [ix, iy] = roofFlat(p, 0, rY, 80, 48, { base: P.concrete, seed: 23 });
    // exhaust ducts (dryers)
    for (const dx of [12, 26]) {
      p.rect(ix + dx, iy + 2, 7, 18, P.steel);
      p.vline(ix + dx, iy + 2, iy + 19, P.concreteLt);
      p.vline(ix + dx + 6, iy + 2, iy + 19, P.asphalt);
      p.rect(ix + dx - 1, iy - 1, 9, 4, P.concrete);
      p.hline(ix + dx - 1, ix + dx + 7, iy - 1, P.white);
      castRight(p, ix + dx, iy + 2, 7, 18, 4);
    }
    acUnit(p, ix + 50, iy + 18);
    // facade: pale tile wall, aqua sign, full glass front
    fillWall(p, 0, fY, 80, 48, wallTiles(P.concreteLt, P.concrete, 5));
    eaveShadow(p, 0, fY, 80, 2);
    signBoard(p, 2, fY + 2, 76, 15, P.aqua, P.blue, 3);
    fontText(p, 'ふわり', 8, fY + 2, P.white, { shadow: P.blue });
    // bubbles / a round washer icon on the sign
    p.ellipse(66, fY + 9, 5, 5, P.white);
    p.ellipse(66, fY + 9, 3, 3, P.blue);
    p.set(64, fY + 7, P.aqua);
    p.set(57, fY + 5, P.white);
    p.set(59, fY + 13, P.white);
    // glass front: left window (dryers: obj_laundry_window), door, right window
    p.rect(2, fY + 20, 76, 28, P.steel);
    glassPane(p, b.mask, 3, fY + 21, 28, 24, { base: P.nightShade, glint: false });
    // right window: washers and a folding table inside
    glassPane(p, b.mask, 49, fY + 21, 28, 24, { base: P.nightShade });
    for (let k = 0; k < 2; k++) {
      const wx = 51 + k * 12;
      p.rect(wx, fY + 31, 10, 13, P.concreteLt);
      p.ellipse(wx + 5, fY + 37, 3.2, 3.2, P.shadeDeep);
      p.ring(wx + 5, fY + 37, 3.5, 3.5, P.steel);
      p.hline(wx, wx + 9, fY + 31, P.white);
    }
    p.rect(50, fY + 24, 26, 3, P.woodLt);
    b.lights.push([49, fY + 21, 28, 24]);
    b.lights.push([3, fY + 21, 28, 24]);
    // stickers on the glass
    tiny(p, 'COIN', 5, fY + 23, P.white);
    tiny(p, 'LAUNDRY', 5, fY + 29, P.white);
    // glass door (26,31)
    glassDoor(b, 33, fY + 21, 14, 27, P.steel);
    tiny(p, '24H', 35, fY + 23, P.aqua);
    facadeFoot(p, 0, b.botY, 80, P.steel);
    rimLeft(p, fY, b.botY);
  },
  over(g, x, y, env, b) {
    // steam from the ducts (stops at stage 1), AC fan
    if (env.stage !== 1) {
      const s = steamFrames();
      g.img(frameAt(s, env.mt), x + 14, y + b.roofY - 14);
      g.img(frameAt(s, env.mt, 1.3), x + 28, y + b.roofY - 14);
    }
    g.img(frameAt(AC_FAN, env.mt), x + 56, y + b.roofY + 25);
  },
});

// ---------------------------------------------------------------- 夕鳴写真館

registerBuilding({
  id: 'bld_photo',
  W: 5,
  R: 3,
  F: 3,
  top: 2,
  paint(b: Bld) {
    const p = b.p;
    const rY = b.roofY;
    const fY = b.faceY;
    roofKawara(p, 0, rY, 80, 48, KAWARA_IBUSHI, 9, 0.3);
    // studio skylight (天窓) reflecting the sky
    p.rect(36, rY + 20, 30, 16, P.steel);
    p.hline(36, 65, rY + 20, P.concreteLt);
    glassPane(p, b.mask, 38, rY + 22, 26, 12, { base: P.shadeDeep });
    for (let i = 44; i < 64; i += 7) p.vline(i, rY + 22, rY + 33, P.steel);
    castRight(p, 36, rY + 20, 30, 16, 3);
    // facade: warm grey mortar, sign, show window recess, half shutter
    fillWall(p, 0, fY, 80, 48, wallMortar(P.concrete, 29));
    eaveShadow(p, 0, fY, 80, 2);
    signBoard(p, 3, fY + 1, 74, 11, P.paper, P.leafShade, 3);
    fontTextSmall(p, '夕鳴写真館', 24, fY + 2, P.leafShade, 1);
    // camera icon
    p.rect(8, fY + 4, 10, 6, P.charcoal);
    p.rect(10, fY + 3, 3, 1, P.charcoal);
    p.ellipse(13, fY + 7, 2, 2, P.asphalt);
    p.set(12, fY + 6, P.aqua);
    // show window recess (obj_photo_window draws the frame and photo)
    p.rect(0, fY + 13, 34, 35, P.woodDark);
    // green enamel plate by the door (32,31)
    p.rect(36, fY + 22, 8, 22, P.leafDeep);
    p.strokeRect(36, fY + 22, 8, 22, P.white);
    p.hline(37, 42, fY + 23, P.leafYoung);
    scribble(p, 38, fY + 25, 3, P.white, 41, 4, true);
    p.set(37, fY + 42, P.asphalt); // chipped enamel
    p.set(42, fY + 26, P.asphalt);
    castRight(p, 36, fY + 22, 8, 22, 2);
    // entrance with a half-lowered shutter
    const sx = 48;
    p.rect(sx, fY + 19, 30, 29, P.night);
    p.rect(sx + 1, fY + 34, 28, 14, P.nightShade);
    for (let j = fY + 19; j < fY + 33; j++) p.hline(sx, sx + 29, j, (j - fY) % 2 ? P.concrete : P.steel);
    p.hline(sx, sx + 29, fY + 33, P.charcoal);
    p.rect(sx - 1, fY + 17, 32, 3, P.asphalt);
    p.vline(sx - 1, fY + 17, b.botY - 1, P.steel);
    p.vline(sx + 30, fY + 17, b.botY - 1, P.asphalt);
    // inside: a studio umbrella light glinting
    p.ellipse(sx + 20, fY + 38, 4, 2.5, P.concrete);
    p.vline(sx + 20, fY + 40, fY + 46, P.steel);
    facadeFoot(p, 0, b.botY, 80, P.steel);
    rimLeft(p, fY, b.botY);
  },
});

// ---------------------------------------------------------------- シャッターの3軒

interface ShutterV {
  roof: RoofPal;
  seed: number;
}
const SHUTTER_ROOFS: Record<number, ShutterV> = {
  1: { roof: { hi: P.white, base: P.concrete, lo: P.steel, deep: P.asphalt }, seed: 31 },
  2: { roof: { hi: P.leafYoung, base: P.leaf, lo: P.leafDeep, deep: P.leafShade }, seed: 37 },
  3: { roof: { hi: P.aqua, base: P.blue, lo: P.navy, deep: P.nightShade }, seed: 41 },
};

/** へのへのもへじ, 12×13; `look` shifts the pupils (stage 2: north-east). */
function henohe(p: PixelCanvas, x: number, y: number, col: string, look: 'side' | 'ne'): void {
  // eyebrows へ へ
  for (const ex of [x + 1, x + 7]) {
    p.set(ex, y + 2, col);
    p.set(ex + 1, y + 1, col);
    p.set(ex + 2, y + 2, col);
    p.set(ex + 3, y + 3, col);
  }
  // eyes の の
  for (const ex of [x + 1, x + 7]) {
    p.ring(ex + 2, y + 6, 1.8, 1.6, col);
    const px = look === 'ne' ? ex + 3 : ex + 1;
    const py = look === 'ne' ? y + 5 : y + 6;
    p.set(px, py, col);
  }
  // nose も
  p.vline(x + 6, y + 5, y + 9, col);
  p.hline(x + 5, x + 7, y + 7, col);
  // mouth へ
  p.set(x + 3, y + 11, col);
  p.set(x + 4, y + 10, col);
  p.set(x + 5, y + 11, col);
  p.set(x + 6, y + 12, col);
  p.set(x + 7, y + 12, col);
  // じ outline
  p.line(x + 11, y + 1, x + 12, y + 7, col);
  p.line(x + 12, y + 7, x + 9, y + 13, col);
  p.set(x + 12, y + 0, col);
  p.set(x + 10, y + 0, col);
}

function shutterPaint(v: number) {
  return (b: Bld) => {
    const p = b.p;
    const rY = b.roofY;
    const fY = b.faceY;
    const sv = SHUTTER_ROOFS[v] ?? SHUTTER_ROOFS[1];
    roofTin(p, 0, rY, 64, 48, sv.roof, sv.seed, 0.16);
    if (v === 1) {
      // empty can left on the roof
      p.rect(40, rY + 30, 3, 4, P.red);
      p.set(40, rY + 30, P.white);
      p.hline(40, 42, rY + 34, P.maroon);
    } else if (v === 2) {
      // anti-pigeon spikes along the eave
      for (let i = 2; i < 62; i += 2) {
        p.set(i, rY + 42, P.white);
        p.set(i, rY + 43, P.steel);
      }
    } else {
      // small antenna
      p.vline(50, rY - 2, rY + 20, P.steel);
      p.hline(46, 54, rY + 2, P.concrete);
      p.hline(47, 53, rY + 5, P.concrete);
    }
    const wallBase = v === 2 ? P.paperGrid : v === 3 ? P.concreteLt : P.concrete;
    fillWall(p, 0, fY, 64, 48, wallMortar(wallBase, sv.seed));
    eaveShadow(p, 0, fY, 64, 2);
    // faded shop sign: letters half gone
    signBoard(p, 3, fY + 2, 58, 11, v === 3 ? P.aqua : v === 2 ? P.goldPale : P.white, P.steel, 2);
    scribble(p, 8, fY + 5, 6, v === 3 ? P.blue : v === 2 ? P.brassOld : P.steel, sv.seed, 5);
    for (let i = 4; i < 60; i++) if (ihash(i, v, 1601) % 3 === 0) p.set(i, fY + 5 + (i % 5), v === 3 ? P.aqua : P.concreteLt);
    // shutter box and slats
    const top = fY + 15;
    p.rect(1, top, 62, 4, P.steel);
    p.hline(1, 62, top, P.concreteLt);
    p.hline(1, 62, top + 3, P.asphalt);
    const open = v === 3 ? 10 : 0;
    for (let j = top + 4; j < b.botY - open; j++) {
      const ly = (j - top) % 3;
      p.hline(2, 61, j, ly === 0 ? P.concreteLt : ly === 1 ? P.concrete : P.steel);
    }
    p.vline(1, top, b.botY - 1, P.asphalt);
    p.vline(62, top, b.botY - 1, P.charcoal);
    if (open) {
      p.rect(2, b.botY - open, 60, open, P.night);
      p.hline(2, 61, b.botY - open, P.charcoal);
      // something glints inside
      p.set(20, b.botY - 4, P.steel);
      p.set(44, b.botY - 6, P.shade);
    }
    // rust streaks at the foot of the shutter
    for (let i = 3; i < 61; i += 5) if (ihash(i, v, 1603) % 2) p.vline(i, b.botY - open - 4, b.botY - open - 1, P.brassOld);
    // graffiti / notices
    if (v === 1) {
      fontTextSmall(p, 'ここに夢を', 8, top + 7, P.crimson, 1);
      fontTextSmall(p, '置いていく', 14, top + 17, P.crimson, 1);
      p.set(52, top + 24, P.crimson);
      p.set(52, top + 25, P.crimson);
    } else if (v === 3) {
      // closing notice taped on
      p.rect(20, top + 7, 20, 14, P.paper);
      p.strokeRect(20, top + 7, 20, 14, P.paperGrid);
      fontTextSmall(p, '閉店', 22, top + 8, P.ink, 2);
      printLines(p, 22, top + 16, 16, 2, P.shade, 5);
      for (const [tx, ty] of [[19, top + 6], [39, top + 6], [19, top + 20], [39, top + 20]]) {
        p.set(tx, ty, P.goldPale);
        p.set(tx + 1, ty, P.goldPale);
      }
      castRight(p, 20, top + 7, 20, 14, 2);
    }
    facadeFoot(p, 0, b.botY, 64, P.steel);
    rimLeft(p, fY, b.botY);
    drainPipe(p, v === 2 ? 0 : 62, fY + 1, top);
  };
}

registerBuilding((opts) => {
  const v = Number(opts.v ?? 1);
  return {
    id: 'bld_shutter',
    W: 4,
    R: 3,
    F: 3,
    top: 4,
    paint: shutterPaint(v),
    stage:
      v === 2
        ? (b, stage) => (p) => {
            const top = b.faceY + 15;
            const look = stage === 2 ? 'ne' : 'side';
            // repaint the three faces for this stage
            for (const [fx, fy] of [[6, top + 6], [26, top + 14], [46, top + 5]]) {
              for (let j = fy - 1; j < fy + 15; j++) {
                for (let i = fx - 1; i < fx + 15; i++) {
                  const ly = (j - top) % 3;
                  p.set(i, j, ly === 0 ? P.concreteLt : ly === 1 ? P.concrete : P.steel);
                }
              }
              henohe(p, fx, fy, fx === 26 ? P.blue : P.ink, look);
            }
          }
        : undefined,
  };
});

// ---------------------------------------------------------------- 交番

registerBuilding({
  id: 'bld_koban',
  W: 4,
  R: 3,
  F: 3,
  top: 18,
  paint(b: Bld) {
    const p = b.p;
    const rY = b.roofY;
    const fY = b.faceY;
    const [ix, iy] = roofFlat(p, 0, rY, 64, 48, { base: P.concreteLt, seed: 43 });
    // radio antenna
    p.vline(ix + 8, rY - 18, iy + 10, P.steel);
    p.vline(ix + 9, rY - 16, iy + 10, P.asphalt);
    for (const dy of [-16, -11, -6]) p.hline(ix + 5, ix + 12, rY + dy, P.concrete);
    p.set(ix + 8, rY - 18, P.verm);
    acUnit(p, ix + 40, iy + 20);
    // white walls with a tiled wainscot
    fillWall(p, 0, fY, 64, 30, wallPlaster(P.white, 43));
    fillWall(p, 0, fY + 30, 64, 18, wallTiles(P.concreteLt, P.concrete, 4));
    p.hline(0, 63, fY + 30, P.steel);
    eaveShadow(p, 0, fY, 64, 2);
    // 交番 / KOBAN (the red lamp, obj_koban_lamp, hangs at x 34..45)
    fontText(p, '交番', 2, fY + 1, P.navy, { shadow: P.concrete });
    tiny(p, 'KOBAN', 45, fY + 4, P.navy);
    // lamp bracket
    p.hline(38, 42, fY + 14, P.steel);
    // gold badge
    p.ellipse(54, fY + 13, 3, 3, P.brass);
    p.set(53, fY + 12, P.goldPale);
    p.set(54, fY + 13, P.gold);
    // entrance (51,31) → x 16..31
    p.rect(15, fY + 17, 18, 31, P.steel);
    glassDoor(b, 16, fY + 18, 16, 30, P.steel);
    tiny(p, '110', 19, fY + 21, P.verm);
    // notice board
    signBoard(p, 36, fY + 18, 24, 18, P.woodLt, P.woodDark, 3);
    for (let k = 0; k < 3; k++) {
      const nx = 38 + k * 7;
      p.rect(nx, fY + 20, 6, 8, k === 1 ? P.paper : P.white);
      p.rect(nx + 1, fY + 21, 4, 3, k === 0 ? P.skin3 : k === 1 ? P.leafYoung : P.aqua);
      printLines(p, nx + 1, fY + 25, 4, 2, P.asphalt, 50 + k);
    }
    p.rect(38, fY + 29, 20, 5, P.paper);
    fontTextSmall(p, 'おとしもの', 38, fY + 29, P.verm, 2);
    facadeFoot(p, 0, b.botY, 64, P.steel);
    rimLeft(p, fY, b.botY);
    drainPipe(p, 62, fY + 1, b.botY - 1);
  },
  glow(g, x, y, env, b) {
    if (env.grade.night < 0.05) return;
    const ctx = g.ctx;
    ctx.save();
    ctx.globalAlpha = 0.35 * env.grade.night;
    ctx.fillStyle = P.horizon;
    ctx.fillRect(Math.round(x + 12), Math.round(y + b.botY), 26, 10);
    ctx.restore();
  },
});

// ---------------------------------------------------------------- ショッピングプラザ・ユウナリ

const DOOR_W = 26;

registerBuilding({
  id: 'bld_mall',
  W: 24,
  R: 1,
  F: 5,
  top: 0,
  paint(b: Bld) {
    const p = b.p;
    const fY = b.faceY;
    // roof: parapet edge seen from above, sign frame backs, HVAC units
    const [ix, iy, iw] = roofFlat(p, 0, 0, 384, 16, { base: P.paperGrid, lip: P.concreteLt, seed: 47, stains: true });
    for (let k = 0; k < 5; k++) {
      const ux = ix + 20 + k * 70;
      p.rect(ux, iy + 1, 20, 8, P.concreteLt);
      p.hline(ux, ux + 19, iy + 1, P.white);
      p.hline(ux, ux + 19, iy + 8, P.steel);
      p.ellipse(ux + 6, iy + 5, 2.5, 2.5, P.charcoal);
      p.ellipse(ux + 14, iy + 5, 2.5, 2.5, P.charcoal);
      castRight(p, ux, iy + 1, 20, 8, 3);
    }
    void iw;
    // facade: faded cream wall with a blue band
    fillWall(p, 0, fY, 384, 80, wallMortar(P.paperGrid, 53));
    eaveShadow(p, 0, fY, 384, 3);
    for (let i = 0; i < 384; i++) {
      p.set(i, fY + 6, P.blue);
      p.set(i, fY + 7, P.blue);
      p.set(i, fY + 8, P.navy);
      p.set(i, fY + 5, P.aqua);
      // faded patches in the band
      if (ihash(i >> 3, 0, 1701) % 5 === 0) {
        p.set(i, fY + 6, P.aqua);
        p.set(i, fY + 7, P.aqua);
      }
    }
    // rain stains under the band
    for (let i = 0; i < 384; i += 1) if (ihash(i, 1, 1703) % 9 === 0) shadeRect(p, i, fY + 9, 1, 4 + (ihash(i, 2, 1705) % 10));
    // big sign (48,2) → x 224..351, y 32..55
    const sx = (48 - 34) * 16;
    const sy = 26;
    signBoard(p, sx, sy, 128, 24, P.white, P.steel, 4);
    p.rect(sx + 2, sy + 2, 124, 3, P.blue);
    // bell logo
    handGlyph(p, 'bell', sx + 6, sy + 8, P.brass, P.brassOld);
    fontText(p, 'ユウナリ', sx + 20, sy + 6, P.navy, { shadow: P.concrete });
    tiny(p, 'SHOPPING PLAZA', sx + 20 + 68, sy + 8, P.blue);
    tiny(p, 'SINCE 1987', sx + 20 + 68, sy + 15, P.steel);
    // 毎日が夕やけ市: a faded banner on the left
    signBoard(p, 40, fY + 12, 120, 16, P.goldPale, P.brassOld, 3);
    fontText(p, '毎日が夕やけ市', 44, fY + 12, P.sunDeep);
    for (let i = 42; i < 158; i++) if (ihash(i, 3, 1707) % 4 === 0) p.set(i, fY + 13 + (ihash(i, 4, 1709) % 14), P.goldPale);
    // ground floor: glass storefront
    const gy = fY + 38;
    p.rect(0, gy - 2, 384, 2, P.steel);
    p.hline(0, 383, gy - 2, P.concreteLt);
    for (let k = 0; k < 12; k++) {
      const gx = k * 32 + 2;
      const gw = 28;
      if (gx + gw > sx + 22 && gx < sx + 26 + DOOR_W + 4 && k !== 7 && k !== 8) {
        // near the door
      }
      glassPane(p, b.mask, gx, gy, gw, 40, { base: P.nightShade });
      // dim interior: shelves, a mannequin, posters
      const hh = ihash(k, 0, 1711);
      p.rect(gx, gy + 28, gw, 12, P.shadeDeep);
      if (hh % 3 === 0) {
        p.rect(gx + 10, gy + 14, 6, 18, P.concrete);
        p.ellipse(gx + 13, gy + 12, 3, 3, P.concreteLt);
      } else if (hh % 3 === 1) {
        for (let j = 0; j < 3; j++) p.hline(gx + 2, gx + gw - 3, gy + 12 + j * 8, P.steel);
      }
      if (hh % 4 === 0) {
        p.rect(gx + 4, gy + 4, 9, 12, P.paper);
        p.rect(gx + 5, gy + 5, 7, 6, [P.peach, P.aqua, P.gold][hh % 3]);
        printLines(p, gx + 5, gy + 12, 7, 2, P.shade, hh);
      }
      p.vline(gx + gw, gy, gy + 41, P.steel);
      p.vline(gx + gw + 1, gy, gy + 41, P.concreteLt);
    }
    // entrance canopy (ひさし) and the auto door (50,5)
    const dx = (50 - 34) * 16 - 5;
    p.rect(dx - 12, gy - 12, DOOR_W + 24, 5, P.white);
    p.hline(dx - 12, dx + DOOR_W + 11, gy - 12, P.glint);
    p.hline(dx - 12, dx + DOOR_W + 11, gy - 8, P.steel);
    shadeRect(p, dx - 12, gy - 7, DOOR_W + 26, 3);
    castRight(p, dx - 12, gy - 12, DOOR_W + 24, 5, 3);
    p.rect(dx - 2, gy - 1, DOOR_W + 4, 43, P.steel);
    p.rect(dx, gy, DOOR_W, 42, P.night);
    p.rect(dx, gy + 28, DOOR_W, 14, P.nightShade);
    p.hline(dx - 2, dx + DOOR_W + 1, gy - 1, P.concreteLt);
    // sensor lamp
    p.rect(dx + 11, gy - 5, 4, 2, P.charcoal);
    // closing notice (49,5) on the glass left of the door
    const nx = (49 - 34) * 16 + 1;
    p.rect(nx, gy + 10, 11, 14, P.paper);
    fontTextSmall(p, '閉店', nx + 0, gy + 11, P.verm, 2);
    printLines(p, nx + 1, gy + 19, 9, 2, P.asphalt, 61);
    // old poster (41,5): 夏休み大抽選会
    const px = (41 - 34) * 16 + 2;
    p.rect(px, gy + 6, 12, 18, P.gold);
    p.rect(px + 1, gy + 7, 10, 6, P.verm);
    p.ellipse(px + 6, gy + 17, 3, 3, P.white);
    p.set(px + 6, gy + 17, P.verm);
    p.set(px + 11, gy + 6, P.goldPale); // peeling corner
    // pillars between bays
    for (let k = 0; k <= 12; k++) {
      const cx = k * 32;
      p.vline(cx, fY + 10, b.botY - 1, P.concreteLt);
    }
    facadeFoot(p, 0, b.botY, 384, P.steel);
    rimLeft(p, fY, b.botY);
  },
  over(g, x, y, env, b) {
    // auto door panels, 1px twitch in stage 2
    const dx = (50 - 34) * 16 - 5;
    const gy = b.faceY + 38;
    const tw = env.stage === 2 ? (Math.floor(env.t / 700) % 3 === 0 ? 1 : 0) : 0;
    const half = DOOR_W / 2;
    const gap = 6 + tw;
    g.img(doorPanel(), x + dx + half - gap / 2 - 13, y + gy);
    g.img(doorPanel(), x + dx + half + gap / 2, y + gy);
    // sensor lamp
    const on = env.stage === 2 ? Math.floor(env.t / 500) % 2 === 0 : false;
    g.rect(x + dx + 12, y + gy - 5, 2, 1, on ? P.verm : P.maroon);
  },
  glow(g, x, y, env, b) {
    // stage 2: only the ユ of the neon sign is lit, flickering
    if (env.stage !== 2) return;
    const sx = (48 - 34) * 16 + 20;
    const sy = 26 + 6;
    const f = Math.floor(env.t / 90);
    if (f % 37 === 0 || f % 53 === 3) return;
    g.img(neonYu(), x + sx - 2, y + sy - 2, { alpha: 0.95 });
    void b;
  },
  band: 16,
});

let DOOR: HTMLCanvasElement | null = null;
function doorPanel(): HTMLCanvasElement {
  if (!DOOR) {
    const p = new PixelCanvas(13, 42);
    p.rect(0, 0, 13, 42, P.steel);
    p.rect(1, 1, 11, 39, P.shadeDeep);
    p.rect(1, 28, 11, 12, P.nightShade);
    p.line(2, 12, 6, 4, P.aqua);
    p.line(2, 16, 9, 6, P.shade);
    p.hline(0, 12, 41, P.charcoal);
    p.vline(0, 0, 41, P.concreteLt);
    DOOR = p.toCanvas();
  }
  return DOOR;
}

let NEON: HTMLCanvasElement | null = null;
function neonYu(): HTMLCanvasElement {
  if (!NEON) {
    const p = new PixelCanvas(20, 20);
    fontText(p, 'ユ', 2, 2, P.crimson, { outline: P.peach });
    fontText(p, 'ユ', 2, 2, P.glint);
    NEON = p.toCanvas();
  }
  return NEON;
}

export type { PropEnv, Gfx };
