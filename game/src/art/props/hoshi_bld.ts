// The houses of 星見台 (52_ch2_level_art 3.3, 7.1 屋根と壁): every house its
// own roof and wall (7.4) — フミ先生's tiled bungalow with its telescope
// ornament, サワコさん's faded blue tin and her onions, 区長's tidy house
// with the circular's shelf, the empty 森本 house with its shutters closed,
// the ward storehouse, the old shop that is for sale, three more houses,
// ゲンさん's house with its night-light and ミツばあ's farmhouse (tin over
// thatch, the earthen kitchen, the veranda and the altar's two candles).
//
// All windows are dark (52 7.1: "どれも窓は暗い") but the few the night
// needs: the altar candles, the old man's night-light. Buildings anchor on
// the top-left tile of their roof, like chapter 1's (bkit.registerBuilding).

import { mix, PixelCanvas } from '../../engine/pixel';
import { h01, ihash } from '../tiles/noise';
import { P } from '../tiles/palette';
import { KAWARA_IBUSHI, KAWARA_OLD, registerBuilding, roofKawara, type Bld } from './bkit';
import { castRight, dk, lt, shadeRect } from './kit';
import {
  amado,
  darkWin,
  eaveDark,
  footing,
  glowDot,
  HLIGHT,
  hikido,
  HP,
  hs,
  hyousatsu,
  KAWARA_GRAY,
  nightK,
  paperNote,
  roofNeglect,
  roofTinH,
  starVerge,
  TIN_BLUE,
  TIN_BROWN,
  TIN_GRAY,
  TIN_MAROON,
  TIN_RED,
  TIN_RUST,
  wall,
  wallLap,
  wallOld,
  wallPlain,
  windowPool,
} from './hoshi_kit';
import { drawLight, poolEllipse } from './light';
import { registerProp } from './registry';
import { fontTextSmall } from './text';

// ---------------------------------------------------------------- shared bits

/** TV antenna on a ridge (フミ先生's house). */
function antenna(p: PixelCanvas, x: number, y0: number, y1: number): void {
  p.vline(x, y0, y1, P.steel);
  p.vline(x + 1, y0 + 2, y1, P.charcoal);
  for (const [dy, w] of [[1, 11], [4, 9], [7, 7], [10, 5]] as const) {
    const hw = Math.floor(w / 2);
    p.hline(x - hw, x + hw, y0 + dy, P.concrete);
    for (let i = x - hw; i <= x + hw; i += 2) p.set(i, y0 + dy + 1, P.steel);
  }
  p.set(x, y0, P.concreteLt);
  p.line(x, y0 + 8, x - 6, y1, P.asphalt);
  p.line(x + 1, y0 + 8, x + 7, y1, P.asphalt);
}

/** Solar water heater on a front slope (民家1). */
function solarHeater(p: PixelCanvas, x: number, y: number, w: number): void {
  castRight(p, x, y, w, 10, 3);
  p.rect(x, y, w, 10, P.steel);
  const n = Math.floor((w - 2) / 7);
  for (let k = 0; k < n; k++) {
    p.rect(x + 1 + k * 7, y + 4, 6, 5, P.navy);
    p.hline(x + 1 + k * 7, x + 6 + k * 7, y + 4, P.blue);
    p.set(x + 2 + k * 7, y + 5, P.aqua);
  }
  // the tank on top
  p.rect(x, y, w, 4, P.concreteLt);
  p.hline(x, x + w - 1, y, P.white);
  p.hline(x, x + w - 1, y + 3, P.concrete);
  p.set(x + 2, y + 1, P.steel);
  p.set(x + w - 3, y + 1, P.steel);
}

/** Drying platform on a roof (物干し台, 民家3). */
function monohoshiDai(p: PixelCanvas, x: number, y: number, w: number, h: number): void {
  castRight(p, x, y, w, h, 3);
  for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) p.set(i, j, (i - x) % 3 === 2 ? P.woodDark : (j - y) % 4 === 0 ? P.woodLt : P.wood);
  p.hline(x, x + w - 1, y, P.goldPale);
  // rail posts and the pole
  for (const px of [x, x + w - 1]) p.vline(px, y - 6, y, P.steel);
  p.hline(x, x + w - 1, y - 6, P.concrete);
  p.hline(x, x + w - 1, y - 5, P.steel);
  // one pair of work gloves forgotten on the pole
  p.rect(x + 5, y - 5, 2, 3, P.white);
  p.set(x + 5, y - 3, P.concrete);
}

/** The genkan's step and the little concrete porch in front. */
function genkanStep(p: PixelCanvas, x: number, y: number, w: number): void {
  p.rect(x - 2, y - 3, w + 4, 3, P.concrete);
  p.hline(x - 2, x + w + 1, y - 3, P.concreteLt);
  p.hline(x - 2, x + w + 1, y - 1, P.steel);
}

/** A row of potted plants (区長の家: きちんと並ぶ). */
function pots(p: PixelCanvas, x: number, y: number, n: number, seed: number, tidy = true): void {
  for (let k = 0; k < n; k++) {
    const h = ihash(k, seed, 3501);
    const px = x + k * (tidy ? 6 : 5 + (h % 3));
    const pot = tidy ? P.wood : h % 2 ? P.wood : P.concrete;
    p.rect(px, y - 4, 5, 4, pot);
    p.hline(px, px + 4, y - 4, lt(pot));
    p.set(px + 4, y - 2, dk(pot));
    p.hline(px, px + 4, y - 1, dk(pot));
    const leaf = h % 3 === 0 ? P.leafDeep : P.leaf;
    p.rect(px + 1, y - 7, 3, 3, leaf);
    p.set(px + 2, y - 8, P.leafYoung);
    p.set(px + 1, y - 7, P.leafYoung);
    p.set(px + 3, y - 5, P.leafShade);
    if (h % 4 === 1) p.set(px + 2, y - 7, P.crimson);
  }
}

/** A drain pipe from the gutter to the ground. */
function downPipe(p: PixelCanvas, x: number, y0: number, y1: number): void {
  p.vline(x, y0, y1, P.concrete);
  p.vline(x + 1, y0, y1, P.steel);
  for (let j = y0 + 5; j < y1; j += 9) p.hline(x - 1, x + 2, j, P.asphalt);
  p.hline(x - 1, x + 3, y1, P.steel);
}

/** A dark-wood porch light box, unlit (the village sleeps). */
function porchLamp(p: PixelCanvas, x: number, y: number): void {
  p.rect(x, y, 3, 4, P.concrete);
  p.hline(x, x + 2, y, P.concreteLt);
  p.set(x + 1, y + 2, P.steel);
  p.hline(x, x + 2, y + 4, P.charcoal);
}

// ---------------------------------------------------------------- フミ先生の家 (14,23) 5×(2+2)

registerBuilding({
  id: 'prop_h_bld_fumi',
  W: 5,
  R: 2,
  F: 2,
  top: 16,
  band: 0,
  paint(b: Bld) {
    const p = b.p;
    const rY = b.roofY;
    const fY = b.faceY;
    roofKawara(p, 0, rY, 80, 32, KAWARA_IBUSHI, 21, 0.3);
    starVerge(p, 0, rY, 32, KAWARA_IBUSHI);
    antenna(p, 56, 0, rY + 11);
    // plaster wall, dark lap boards below the windows
    wall(p, 0, fY, 80, 32, wallPlain(P.concreteLt, 3));
    wall(p, 0, fY + 20, 80, 12, wallLap(P.woodDark, 2));
    eaveDark(p, 0, fY, 80, 3);
    // the window with the telescope ornament on the sill (east)
    darkWin(b, 44, fY + 6, 22, 10, { frame: P.woodDark, curtain: P.aqua, side: 'r' });
    // the ornament: a small navy tube on a tripod, pointing up-left
    p.line(48, fY + 13, 53, fY + 9, P.navy);
    p.line(48, fY + 14, 53, fY + 10, P.blue);
    p.set(53, fY + 9, P.aqua);
    p.set(50, fY + 15, P.charcoal);
    p.set(52, fY + 15, P.charcoal);
    // the west window: paper screens behind the glass
    darkWin(b, 6, fY + 6, 12, 10, { frame: P.woodDark, shoji: true });
    // entrance
    hikido(b, 24, fY + 10, 14, 20, P.woodDark);
    genkanStep(p, 24, b.botY, 14);
    hyousatsu(p, 20, fY + 12, 1);
    // a star sticker by the nameplate (#FFD23F 1px)
    p.set(21, fY + 20, P.gold);
    p.set(20, fY + 21, P.brass);
    porchLamp(p, 39, fY + 9);
    footing(p, 0, b.botY, 80, P.concrete, 1);
    downPipe(p, 76, fY + 2, b.botY - 2);
  },
});

// ---------------------------------------------------------------- 民家1 (14,28) 瓦に太陽熱温水器

registerBuilding({
  id: 'prop_h_bld_minka1',
  W: 5,
  R: 2,
  F: 2,
  top: 4,
  band: 0,
  paint(b: Bld) {
    const p = b.p;
    const rY = b.roofY;
    const fY = b.faceY;
    roofKawara(p, 0, rY, 80, 32, KAWARA_OLD, 22, 0.28);
    starVerge(p, 0, rY, 32, KAWARA_OLD);
    solarHeater(p, 10, rY + 13, 30);
    wall(p, 0, fY, 80, 32, wallLap(mix(P.wood, P.woodDark, 0.4), 5));
    eaveDark(p, 0, fY, 80, 3);
    darkWin(b, 6, fY + 7, 20, 10, { frame: P.steel, curtain: P.peach, side: 'l' });
    darkWin(b, 58, fY + 7, 14, 10, { frame: P.steel, shoji: true });
    hikido(b, 34, fY + 10, 16, 20, P.steel);
    genkanStep(p, 34, b.botY, 16);
    hyousatsu(p, 51, fY + 12, 2);
    // a gas bottle and a broom by the wall
    p.rect(74, fY + 17, 5, 11, P.concreteLt);
    p.hline(74, 78, fY + 17, P.white);
    p.vline(78, fY + 18, fY + 27, P.steel);
    p.rect(75, fY + 15, 3, 2, P.steel);
    p.line(28, fY + 12, 30, fY + 28, P.woodLt);
    p.rect(29, fY + 24, 3, 5, P.brass);
    p.set(31, fY + 28, P.brassOld);
    footing(p, 0, b.botY, 80, P.concrete, 2);
  },
});

// ---------------------------------------------------------------- 民家2 (41,22) 赤いトタン

registerBuilding({
  id: 'prop_h_bld_minka2',
  W: 5,
  R: 3,
  F: 2,
  top: 2,
  band: 0,
  paint(b: Bld) {
    const p = b.p;
    const rY = b.roofY;
    const fY = b.faceY;
    roofTinH(p, 0, rY, 80, 48, TIN_RED, 23, { rust: 0.3, ridgeFrac: 0.3 });
    // a chimney pipe for the bath stove
    p.rect(62, rY + 4, 4, 14, P.steel);
    p.vline(62, rY + 4, rY + 17, P.concreteLt);
    p.rect(61, rY + 2, 6, 3, P.charcoal);
    p.hline(61, 66, rY + 2, P.asphalt);
    castRight(p, 62, rY + 4, 4, 14, 3);
    wall(p, 0, fY, 80, 32, wallPlain(mix(P.concrete, P.paperGrid, 0.4), 4));
    eaveDark(p, 0, fY, 80, 3);
    darkWin(b, 8, fY + 7, 18, 10, { frame: P.steel, curtain: P.leafYoung, side: 'both' });
    darkWin(b, 52, fY + 7, 20, 10, { frame: P.steel, bars: true });
    hikido(b, 32, fY + 10, 14, 20, P.woodDark);
    genkanStep(p, 32, b.botY, 14);
    hyousatsu(p, 28, fY + 12, 3);
    footing(p, 0, b.botY, 80, P.concrete, 3);
    downPipe(p, 1, fY + 2, b.botY - 2);
  },
});

// ---------------------------------------------------------------- 民家3 (41,33) 灰色の瓦に物干し台

registerBuilding({
  id: 'prop_h_bld_minka3',
  W: 5,
  R: 2,
  F: 2,
  top: 8,
  band: 0,
  paint(b: Bld) {
    const p = b.p;
    const rY = b.roofY;
    const fY = b.faceY;
    roofKawara(p, 0, rY, 80, 32, KAWARA_GRAY, 24, 0.3);
    starVerge(p, 0, rY, 32, KAWARA_GRAY);
    monohoshiDai(p, 44, rY + 14, 24, 12);
    wall(p, 0, fY, 80, 32, wallLap(P.woodDark, 6));
    eaveDark(p, 0, fY, 80, 3);
    darkWin(b, 6, fY + 7, 14, 10, { frame: P.woodDark, shoji: true });
    darkWin(b, 24, fY + 7, 14, 10, { frame: P.woodDark, shoji: true });
    hikido(b, 50, fY + 10, 16, 20, P.woodDark);
    genkanStep(p, 50, b.botY, 16);
    hyousatsu(p, 67, fY + 12, 4);
    // a stack of firewood under the eave at the west end
    for (let r = 0; r < 3; r++)
      for (let k = 0; k < 5 - r; k++) {
        const cx = 42 + k * 3 + r;
        const cy = b.botY - 6 - r * 3;
        p.rect(cx, cy, 3, 3, P.woodLt);
        p.set(cx + 1, cy + 1, P.brassOld);
        p.set(cx + 2, cy + 2, P.wood);
      }
    footing(p, 0, b.botY, 80, P.concrete, 4);
  },
});

// ---------------------------------------------------------------- 空き家A 森本 (14,33): 瓦がずれ、雨戸が閉まる

registerBuilding({
  id: 'prop_h_bld_akiya',
  W: 5,
  R: 2,
  F: 2,
  top: 2,
  band: 0,
  paint(b: Bld) {
    const p = b.p;
    const rY = b.roofY;
    const fY = b.faceY;
    roofKawara(p, 0, rY, 80, 32, KAWARA_OLD, 25, 0.3);
    starVerge(p, 0, rY, 32, KAWARA_OLD);
    roofNeglect(p, 0, rY, 80, 32, 25, 7);
    // moss along the ridge
    for (let i = 3; i < 78; i++) if (h01(i, 1, 3511) < 0.25) p.set(i, rY + 13, P.leafShade);
    wall(p, 0, fY, 80, 32, wallOld(5));
    eaveDark(p, 0, fY, 80, 3);
    // all the rain shutters closed
    amado(p, 4, fY + 6, 32, 14, 5, 'r');
    amado(p, 58, fY + 6, 16, 14, 6, null);
    // the entrance: old sliding door, the nameplate 森本
    hikido(b, 44, fY + 10, 12, 20, HP.oldWoodDk);
    hyousatsu(p, 40, fY + 12, 5);
    genkanStep(p, 44, b.botY, 12);
    // weeds against the wall (the front of the door itself is mown: 52 3.5)
    for (let i = 0; i < 80; i++) {
      if (i > 40 && i < 60) continue;
      const hh = ihash(i, 3, 3513);
      if (hh % 3) continue;
      const len = 2 + (hh % 5);
      for (let k = 0; k < len; k++) p.set(i, b.botY - 1 - k, k === len - 1 ? P.leafYoung : k % 2 ? P.leaf : P.leafDeep);
    }
    footing(p, 0, b.botY, 80, P.steel, 5);
  },
});

// ---------------------------------------------------------------- 空き家B 区の倉庫 (34,28): 錆びたトタン

registerBuilding({
  id: 'prop_h_bld_soko',
  W: 5,
  R: 2,
  F: 2,
  top: 0,
  band: 0,
  paint(b: Bld) {
    const p = b.p;
    const rY = b.roofY;
    const fY = b.faceY;
    roofTinH(p, 0, rY, 80, 32, TIN_RUST, 26, { rust: 0.7, ridgeFrac: 0.28, patches: 3 });
    wall(p, 0, fY, 80, 32, wallOld(8, 7));
    eaveDark(p, 0, fY, 80, 3);
    // the storehouse door (wide wooden sliding door) with the paper 「区の 倉庫」
    const dx = 24;
    for (let j = fY + 8; j < b.botY - 1; j++)
      for (let i = dx; i < dx + 32; i++) p.set(i, j, (i - dx) % 16 === 15 ? P.ink : (i - dx) % 4 === 3 ? HP.oldWoodDk : HP.oldWood);
    p.hline(dx - 1, dx + 32, fY + 7, P.woodDark);
    p.hline(dx - 1, dx + 32, b.botY - 1, P.ink);
    // X braces on the door
    p.line(dx + 1, fY + 9, dx + 14, b.botY - 3, HP.oldWoodDk);
    p.line(dx + 14, fY + 9, dx + 1, b.botY - 3, HP.oldWoodDk);
    paperNote(p, dx + 18, fY + 11, 10, 8, P.ink, 26);
    p.set(dx + 18, fY + 11, P.steel); // tape
    // a small high window, boarded
    p.rect(8, fY + 8, 10, 6, HP.oldWoodDk);
    p.hline(7, 18, fY + 9, HP.oldWood);
    p.hline(7, 18, fY + 12, HP.oldWood);
    // a stepladder leaning on the east wall
    p.line(66, fY + 6, 62, b.botY - 2, P.steel);
    p.line(70, fY + 6, 72, b.botY - 2, P.steel);
    for (let k = 0; k < 4; k++) p.hline(64 - Math.floor(k / 2), 70 + Math.floor(k / 3), fY + 11 + k * 5, P.concrete);
    footing(p, 0, b.botY, 80, P.steel, 6);
  },
});

// ---------------------------------------------------------------- サワコさんの家 (21,33) 4×: 青いトタン、たまねぎ

registerBuilding({
  id: 'prop_h_bld_sawako',
  W: 4,
  R: 2,
  F: 2,
  top: 2,
  band: 0,
  paint(b: Bld) {
    const p = b.p;
    const rY = b.roofY;
    const fY = b.faceY;
    roofTinH(p, 0, rY, 64, 32, TIN_BLUE, 27, { rust: 0.2, ridgeFrac: 0.3 });
    wall(p, 0, fY, 64, 32, wallLap(mix(P.woodLt, P.wood, 0.5), 7));
    eaveDark(p, 0, fY, 64, 3);
    darkWin(b, 36, fY + 7, 20, 10, { frame: P.steel, curtain: P.peach, side: 'both' });
    hikido(b, 16, fY + 10, 14, 20, P.steel);
    genkanStep(p, 16, b.botY, 14);
    hyousatsu(p, 31, fY + 12, 6);
    // onions hung under the west eave (#D9A441 × 6)
    p.hline(1, 12, fY + 3, P.woodDark);
    for (let k = 0; k < 6; k++) {
      const ox = 2 + (k % 3) * 4;
      const oy = fY + 5 + Math.floor(k / 3) * 4;
      p.vline(ox + 1, fY + 3, oy, P.woodLt);
      p.rect(ox, oy, 3, 3, P.brass);
      p.set(ox, oy, P.goldPale);
      p.set(ox + 2, oy + 2, P.brassOld);
    }
    // a bench (縁台) with the knitting bag against the east wall
    p.rect(40, b.botY - 9, 20, 2, P.woodLt);
    p.hline(40, 59, b.botY - 9, P.goldPale);
    p.vline(41, b.botY - 7, b.botY - 2, P.wood);
    p.vline(58, b.botY - 7, b.botY - 2, P.wood);
    p.rect(50, b.botY - 14, 7, 5, P.navy);
    p.set(51, b.botY - 15, P.gold);
    p.set(53, b.botY - 16, P.gold);
    p.set(52, b.botY - 14, P.gold);
    p.set(55, b.botY - 15, P.woodLt);
    footing(p, 0, b.botY, 64, P.concrete, 7);
  },
});

// ---------------------------------------------------------------- 旧商店 売家 (27,33)

registerBuilding({
  id: 'prop_h_bld_shoten',
  W: 5,
  R: 2,
  F: 2,
  top: 2,
  band: 0,
  paint(b: Bld) {
    const p = b.p;
    const rY = b.roofY;
    const fY = b.faceY;
    roofKawara(p, 0, rY, 80, 32, KAWARA_OLD, 28, 0.32);
    starVerge(p, 0, rY, 32, KAWARA_OLD);
    // the old shop's sign board across the top of the front: only 「商店」 still reads
    wall(p, 0, fY, 80, 32, wallPlain(mix(P.concrete, P.steel, 0.3), 8));
    p.rect(2, fY + 1, 76, 8, mix(P.white, P.concrete, 0.4));
    p.hline(2, 77, fY + 1, P.white);
    p.hline(2, 77, fY + 8, P.steel);
    for (let i = 4; i < 44; i++) if (h01(i, fY, 3521) < 0.22) p.set(i, fY + 3 + (i % 3), P.steel); // the faded name
    fontTextSmall(p, '商店', 52, fY + 1, mix(P.navy, P.steel, 0.3));
    // tin eave over the shutter
    for (let i = 0; i < 80; i++) {
      p.set(i, fY + 9, (i % 4) === 0 ? P.concreteLt : P.steel);
      p.set(i, fY + 10, (i % 4) === 3 ? P.asphalt : P.steel);
      p.set(i, fY + 11, P.charcoal);
    }
    shadeRect(p, 0, fY + 12, 80, 2);
    // the shutter, down (horizontal waves, rust at the bottom)
    for (let j = fY + 12; j < b.botY - 1; j++)
      for (let i = 6; i < 74; i++) {
        let c = (j - fY) % 3 === 0 ? P.concreteLt : (j - fY) % 3 === 1 ? P.steel : mix(P.steel, P.asphalt, 0.4);
        if (j > b.botY - 6 && h01(i, j, 3523) < 0.35) c = P.brassOld;
        p.set(i, j, c);
      }
    p.vline(5, fY + 12, b.botY - 1, P.charcoal);
    p.vline(74, fY + 12, b.botY - 1, P.charcoal);
    p.rect(38, b.botY - 4, 4, 2, P.charcoal); // the handle
    // the 売家 board: white with red hand-drawn characters, the phone number smudged
    const sx = 20;
    const sy = fY + 14;
    p.rect(sx, sy, 20, 11, P.white);
    p.strokeRect(sx, sy, 20, 11, P.steel);
    fontTextSmall(p, '売家', sx + 2, sy + 1, P.verm);
    for (let i = sx + 3; i < sx + 17; i++) if (ihash(i, 1, 3525) % 3) p.set(i, sy + 9, mix(P.verm, P.white, 0.55));
    castRight(p, sx, sy, 20, 11, 2);
    // the old red phone booth's mark and a sun-bleached poster ghost
    p.rect(54, fY + 15, 10, 12, mix(P.concrete, P.steel, 0.2));
    for (let j = fY + 16; j < fY + 26; j += 2) p.hline(55, 62, j, mix(P.steel, P.concrete, 0.5));
    footing(p, 0, b.botY, 80, P.concrete, 8);
  },
});

// ---------------------------------------------------------------- 区長の家 中村 (34,33)

registerBuilding({
  id: 'prop_h_bld_kucho',
  W: 5,
  R: 2,
  F: 2,
  top: 2,
  band: 0,
  paint(b: Bld) {
    const p = b.p;
    const rY = b.roofY;
    const fY = b.faceY;
    roofKawara(p, 0, rY, 80, 32, KAWARA_IBUSHI, 29, 0.3);
    starVerge(p, 0, rY, 32, KAWARA_IBUSHI);
    wall(p, 0, fY, 80, 32, wallPlain(P.concreteLt, 9));
    // cedar boards at the foot, neat
    wall(p, 0, fY + 22, 80, 10, wallLap(P.wood, 9, 5));
    eaveDark(p, 0, fY, 80, 3);
    darkWin(b, 50, fY + 7, 24, 10, { frame: P.woodDark, shoji: true });
    darkWin(b, 4, fY + 7, 10, 10, { frame: P.woodDark, bars: true });
    // entrance (1 tile east of the anchor: the door the text reads (35,36))
    hikido(b, 18, fY + 10, 16, 20, P.woodDark);
    genkanStep(p, 18, b.botY, 16);
    // nameplate 中村 and the circular's shelf beside the door
    hyousatsu(p, 35, fY + 11, 7);
    p.rect(38, fY + 17, 10, 2, P.woodLt);
    p.hline(38, 47, fY + 17, P.goldPale);
    p.vline(39, fY + 19, fY + 21, P.wood);
    p.vline(46, fY + 19, fY + 21, P.wood);
    p.rect(40, fY + 13, 6, 4, P.blue); // a circular board waiting on it
    p.hline(40, 45, fY + 13, P.aqua);
    p.set(45, fY + 16, P.navy);
    // the pots in a straight row
    pots(p, 48, b.botY - 1, 5, 29, true);
    footing(p, 0, b.botY, 80, P.concrete, 9);
  },
});

// ---------------------------------------------------------------- ゲンさんの家 (54,40) 6×: 大きな作業場の下屋、常夜灯

registerBuilding({
  id: 'prop_h_bld_gen',
  W: 6,
  R: 2,
  F: 2,
  top: 2,
  band: 0,
  paint(b: Bld) {
    const p = b.p;
    const rY = b.roofY;
    const fY = b.faceY;
    roofKawara(p, 32, rY, 64, 32, KAWARA_IBUSHI, 30, 0.3);
    starVerge(p, 32, rY, 32, KAWARA_IBUSHI);
    // the workshop lean-to (下屋) on the west: low tin, open front
    roofTinH(p, 0, rY + 6, 34, 26, TIN_GRAY, 30, { mono: true, rust: 0.25 });
    wall(p, 32, fY, 64, 32, wallLap(P.woodDark, 10));
    eaveDark(p, 32, fY, 64, 3);
    // the open workshop: dark inside, a hanging hose, a tool rack, feed bags
    p.rect(0, fY, 32, 32, P.night);
    for (let j = fY; j < fY + 3; j++) for (let i = 0; i < 32; i++) p.set(i, j, P.charcoal);
    p.vline(0, fY, b.botY - 1, P.woodDark);
    p.vline(1, fY, b.botY - 1, P.wood);
    p.rect(4, fY + 6, 12, 2, P.woodDark); // tool rack
    p.vline(6, fY + 8, fY + 16, P.steel);
    p.vline(9, fY + 8, fY + 18, P.woodLt);
    p.vline(12, fY + 8, fY + 14, P.steel);
    p.rect(11, fY + 14, 3, 3, P.steel);
    // coiled hose
    p.ring(24, fY + 12, 4, 4, P.leafDeep);
    p.ring(24, fY + 12, 3, 3, P.leaf);
    // feed sacks (#E8D9B5, green band)
    for (let k = 0; k < 3; k++) {
      const sx = 4 + k * 9;
      const sy = b.botY - 10 - (k === 1 ? 4 : 0);
      p.rect(sx, sy, 8, 9, P.paperGrid);
      p.hline(sx, sx + 7, sy, P.paper);
      p.hline(sx, sx + 7, sy + 4, P.leafDeep);
      p.vline(sx + 7, sy + 1, sy + 8, P.woodLt);
    }
    // the night-light window (the text reads (56,43); the light shows at (56,42))
    darkWin(b, 36, fY + 7, 12, 8, { frame: P.woodDark, shoji: true });
    darkWin(b, 76, fY + 7, 14, 10, { frame: P.woodDark, shoji: true });
    hikido(b, 56, fY + 10, 14, 20, P.woodDark);
    genkanStep(p, 56, b.botY, 14);
    hyousatsu(p, 52, fY + 12, 10);
    // two pairs of boots at the door: a big pair and a small pair
    for (const [bx, big] of [[58, true], [65, false]] as const) {
      const h = big ? 6 : 4;
      p.rect(bx, b.botY - 2 - h, 2, h, P.white);
      p.rect(bx + 3, b.botY - 2 - h, 2, h, P.white);
      p.set(bx + 1, b.botY - 2 - h, P.concreteLt);
      p.set(bx + 4, b.botY - 2 - h, P.concreteLt);
      p.hline(bx, bx + 5, b.botY - 2, P.steel);
    }
    footing(p, 32, b.botY, 64, P.concrete, 10);
  },
  glow(g, x, y, env, b) {
    // 常夜灯: the weak warm light behind the paper of the west window (52 8.6, h0–h2)
    if (hs(env) >= 3) return;
    const k = nightK(env);
    if (k <= 0) return;
    g.rect(x + 37, y + b.faceY + 8, 10, 6, '#F7C27A', 0.4 * k);
    g.rect(x + 39, y + b.faceY + 10, 6, 3, '#FFE7A3', 0.25 * k);
  },
  light(g, x, y, env, b) {
    if (hs(env) >= 3) return;
    const k = nightK(env);
    drawLight(g, poolEllipse(14, 10, HLIGHT.warm), x + 42, y + b.faceY + 11, 0.28 * k);
    windowPool(g, x + 37, y + b.botY, 10, 12, 0.18 * k, HLIGHT.warm);
  },
});

// ---------------------------------------------------------------- ミツばあの家（古民家） (1,40) 8×: トタンをかぶせた茅葺き

registerBuilding({
  id: 'prop_h_bld_kominka',
  W: 8,
  R: 2,
  F: 2,
  top: 10,
  band: 0,
  paint(b: Bld) {
    const p = b.p;
    const rY = b.roofY;
    const fY = b.faceY;
    const W = 128;
    // hipped roof (寄棟) of tin over thatch: steep, a short ridge, the hips
    const y0 = rY - 6;
    const yE = rY + 30;
    const ridgeY = y0 + 10;
    const rx0 = 22;
    const rx1 = W - 23;
    for (let j = y0; j < yE; j++)
      for (let i = 0; i < W; i++) {
        const lx = i % 4;
        // which face: the west / east hip triangles, the back or the front slope
        const tW = j < ridgeY ? (i * (ridgeY - y0)) / rx0 < j - y0 : (i * (yE - ridgeY)) / rx0 < yE - j;
        const tE = j < ridgeY ? ((W - 1 - i) * (ridgeY - y0)) / rx0 < j - y0 : ((W - 1 - i) * (yE - ridgeY)) / rx0 < yE - j;
        let c: string;
        if (tW) c = (j + i) % 4 === 0 ? TIN_MAROON.base : lx === 3 ? TIN_MAROON.base : TIN_MAROON.hi;
        else if (tE) c = lx === 0 ? TIN_MAROON.lo : TIN_MAROON.deep;
        else if (j < ridgeY) c = lx === 0 ? TIN_MAROON.base : lx === 3 ? TIN_MAROON.deep : TIN_MAROON.lo;
        else if (j < ridgeY + 3 && i >= rx0 && i <= rx1) c = j === ridgeY ? lt(TIN_MAROON.hi) : j === ridgeY + 1 ? TIN_MAROON.hi : TIN_MAROON.deep;
        else c = lx === 0 ? TIN_MAROON.hi : lx === 3 ? TIN_MAROON.lo : TIN_MAROON.base;
        p.set(i, j, c);
      }
    // hip lines catch the starlight
    p.line(rx0, ridgeY, 0, y0, lt(TIN_MAROON.hi));
    p.line(rx0, ridgeY + 1, 0, yE - 1, lt(TIN_MAROON.hi));
    p.line(rx1, ridgeY, W - 1, y0, TIN_MAROON.hi);
    p.line(rx1, ridgeY + 1, W - 1, yE - 1, TIN_MAROON.deep);
    // rust streaks running down the tin
    for (let i = 3; i < W - 3; i += 1) {
      if (ihash(i, 0, 3531) % 9) continue;
      const len = 4 + (ihash(i, 1, 3533) % 12);
      const top = ridgeY + 4 + (ihash(i, 2, 3535) % 6);
      if (i < rx0 - 6 || i > rx1 + 6) continue;
      for (let k = 0; k < len && top + k < rY + 30; k++) p.set(i, top + k, k < 2 ? P.brassOld : mix(P.brassOld, TIN_MAROON.base, 0.5));
    }
    // the thick eave of the thatch showing under the tin
    for (let i = 0; i < W; i++) {
      p.set(i, rY + 30, h01(i, 0, 3537) < 0.5 ? P.woodLt : P.brassOld);
      p.set(i, rY + 31, i % 2 ? P.wood : P.woodDark);
    }
    // the smoke outlet box on the ridge (煙出し)
    const sx = 56;
    p.rect(sx, ridgeY - 8, 16, 9, TIN_MAROON.base);
    p.hline(sx, sx + 15, ridgeY - 8, lt(TIN_MAROON.hi));
    p.rect(sx + 3, ridgeY - 4, 10, 3, P.night);
    for (let i = sx + 4; i < sx + 13; i += 2) p.vline(i, ridgeY - 4, ridgeY - 2, P.woodDark);
    p.hline(sx, sx + 15, ridgeY, TIN_MAROON.deep);
    castRight(p, sx, ridgeY - 8, 16, 9, 3);
    // ---- the front: west half the earthen kitchen, east half the veranda
    wall(p, 0, fY, W, 32, wallPlain(mix(P.paperGrid, P.concrete, 0.4), 11));
    // timber frame (posts and the tie beam)
    for (const px of [0, 15, 47, 63, 95, 111, 127]) p.vline(px, fY, b.botY - 1, P.woodDark);
    p.hline(0, W - 1, fY + 3, P.woodDark);
    p.hline(0, W - 1, fY + 4, P.wood);
    eaveDark(p, 0, fY, W, 4);
    // 土間の大戸 (2,43): the big wooden door half open, the dark inside
    const dx = 16;
    p.rect(dx, fY + 6, 30, 26, P.night);
    p.rect(dx + 1, fY + 7, 28, 24, P.void);
    wall(p, dx + 14, fY + 6, 16, 25, wallOld(11, 4)); // the half-open leaf slid east
    p.vline(dx + 14, fY + 6, b.botY - 2, P.woodDark);
    p.hline(dx, dx + 29, fY + 6, P.woodDark);
    p.hline(dx, dx + 29, b.botY - 1, P.ink);
    // the threshold stone
    p.rect(dx + 2, b.botY - 3, 12, 2, P.steel);
    p.hline(dx + 2, dx + 13, b.botY - 3, P.concrete);
    // the western wall: a lattice window of the kitchen, a hanging straw hat and a basket
    for (let j = fY + 8; j < fY + 18; j++) for (let i = 2; i < 13; i++) p.set(i, j, (i % 2 === 0) ? P.wood : P.night);
    p.hline(1, 13, fY + 7, P.woodDark);
    p.hline(1, 13, fY + 18, P.woodDark);
    p.ellipse(8, fY + 23, 4, 2, P.brass); // the basket on a nail
    p.hline(5, 11, fY + 22, P.goldPale);
    p.set(8, fY + 21, P.woodDark);
    // ---- the veranda (縁側): glass doors slid open, the tatami room, the altar deep inside
    const ex = 64;
    // the room inside
    p.rect(ex, fY + 6, 47, 20, P.nightShade);
    for (let j = fY + 18; j < fY + 26; j++) for (let i = ex; i < ex + 47; i++) p.set(i, j, (j - fY) % 4 === 0 ? mix(P.paperGrid, P.woodLt, 0.5) : P.paperGrid);
    // the lintel (鴨居) and the ranma openwork
    p.hline(ex, ex + 46, fY + 6, P.woodDark);
    for (let i = ex + 2; i < ex + 45; i += 3) p.set(i, fY + 7, P.wood);
    p.hline(ex, ex + 46, fY + 8, P.woodDark);
    // the altar (仏壇) at the back: black lacquer with gold edges, two electric candles
    const ax = 96;
    p.rect(ax - 1, fY + 9, 12, 10, P.woodDark);
    p.rect(ax, fY + 10, 10, 8, P.night);
    p.strokeRect(ax - 1, fY + 9, 12, 10, P.brass);
    p.set(ax + 2, fY + 13, P.goldPale);
    p.set(ax + 7, fY + 13, P.goldPale);
    p.rect(ax + 4, fY + 14, 2, 3, P.brass); // the little figure
    // shoji half open on the west, the glass doors stacked on the east
    for (let j = fY + 9; j < fY + 26; j++)
      for (let i = ex; i < ex + 10; i++) p.set(i, j, (i - ex) % 3 === 2 || (j - fY) % 4 === 0 ? P.wood : P.paper);
    for (let j = fY + 9; j < fY + 26; j++) for (let i = ex + 38; i < ex + 47; i++) p.set(i, j, (i - ex) % 4 === 0 ? P.steel : (j + i) % 7 === 0 ? P.aqua : P.shadeDeep);
    // the veranda boards (縁側) across the front
    for (let i = ex - 1; i < W; i++) {
      p.set(i, fY + 26, P.goldPale);
      p.set(i, fY + 27, i % 8 === 0 ? P.woodDark : P.woodLt);
      p.set(i, fY + 28, P.wood);
      p.set(i, fY + 29, P.woodDark);
    }
    p.rect(ex - 1, fY + 30, W - ex + 1, 2, P.night); // under the veranda
    for (let i = ex + 4; i < W; i += 14) p.vline(i, fY + 30, b.botY - 1, P.woodDark);
    // the jar of umeboshi on the veranda (6,43): a glass jar, red inside, a paper lid
    const jx = 84;
    p.rect(jx, fY + 21, 6, 6, mix(P.aqua, P.white, 0.4));
    p.rect(jx + 1, fY + 23, 4, 4, P.vermShade);
    p.set(jx + 2, fY + 24, P.red);
    p.set(jx + 3, fY + 25, P.red);
    p.hline(jx, jx + 5, fY + 20, P.white);
    p.set(jx, fY + 22, P.glint);
    // the 沓脱ぎ石 in front of the veranda
    p.rect(98, b.botY - 3, 12, 3, P.steel);
    p.hline(98, 109, b.botY - 3, P.concrete);
    p.rect(101, b.botY - 5, 3, 2, P.charcoal); // a pair of zori
    p.rect(105, b.botY - 5, 3, 2, P.charcoal);
    p.set(102, b.botY - 5, P.verm);
    p.set(106, b.botY - 5, P.verm);
    // the east wall end: a stack of firewood under the eave
    for (let r = 0; r < 4; r++) for (let k = 0; k < 3; k++) {
      const cx = 113 + k * 4 + (r % 2);
      const cy = b.botY - 5 - r * 3;
      p.rect(cx, cy, 3, 3, P.woodLt);
      p.set(cx + 1, cy + 1, P.brassOld);
    }
    footing(p, 0, b.botY, 64, P.steel, 11);
  },
  glow(g, x, y, env, b) {
    // 灯明: two small candle lights in the altar, ±5% (52 8.6, h0–h2)
    if (hs(env) >= 3) return;
    const k = nightK(env);
    if (k <= 0) return;
    const fl = 0.95 + 0.05 * Math.sin(env.t / 170) * Math.sin(env.t / 97 + 1.3);
    const fY = y + b.faceY;
    for (const dx of [98, 103]) glowDot(g, x + dx, fY + 13, '#FFF6D8', HLIGHT.warm, 5, 0.9 * k * fl);
    g.rect(x + 98, fY + 12, 1, 1, '#F7C27A', 0.7 * k * fl);
    g.rect(x + 103, fY + 12, 1, 1, '#F7C27A', 0.7 * k * fl);
  },
  light(g, x, y, env, b) {
    if (hs(env) >= 3) return;
    const k = nightK(env);
    const fl = 0.95 + 0.05 * Math.sin(env.t / 170);
    drawLight(g, poolEllipse(12, 12, HLIGHT.warm), x + 101, y + b.faceY + 14, 0.2 * k * fl * 1.6);
    drawLight(g, poolEllipse(26, 10, HLIGHT.warm), x + 100, y + b.faceY + 26, 0.1 * k * fl);
  },
});

void TIN_BROWN;

// ---------------------------------------------------------------- 土間のかまど (2,43): only in the lantern's light

registerProp('prop_h_kamado', () => {
  // an earthen stove (#8A5A3A) with two fire mouths and a black rice pot, deep in the kitchen
  const p = new PixelCanvas(18, 14);
  p.rect(1, 5, 16, 9, P.wood);
  p.hline(1, 16, 5, P.woodLt);
  p.vline(16, 6, 13, P.woodDark);
  for (let i = 2; i < 16; i++) if (h01(i, 9, 3541) < 0.25) p.set(i, 9 + (i % 3), P.woodDark);
  // the fire mouths (cold)
  for (const fx of [3, 10]) {
    p.rect(fx, 9, 4, 4, P.night);
    p.hline(fx, fx + 3, 9, P.ink);
    p.set(fx + 1, 12, P.charcoal);
  }
  // the black pot (羽釜) with its wooden lid
  p.ellipse(6, 4, 4, 2, P.charcoal);
  p.hline(2, 10, 4, P.ink);
  p.ellipse(6, 2.5, 3, 1.2, P.woodLt);
  p.set(6, 1, P.wood);
  p.ellipse(13, 4, 2.5, 1.5, P.steel); // a kettle
  p.set(15, 3, P.steel);
  const img = p.toCanvas();
  return { ox: -1, oy: 2, w: 18, h: 14, foot: 17, img: () => img, contact: 0 };
});
