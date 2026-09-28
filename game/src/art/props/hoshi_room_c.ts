// Chapter-2 rooms, part 3 (02_ch2_index #61, 52_ch2_level_art 4.5): the
// houses, sheds and greenhouses of 星見台 that can now be entered. One shell
// prop per room (`prop_hr_shell`: the north wall face in the room's own
// material with what hangs on it, the 4px wall sections against the dark
// outside, the door in the south wall) reads the room's rows from its map;
// the wall things are listed with the map (opts.deco) so the layout lives in
// one place (data/maps/hoshi_rooms2.ts). Furniture stands on top as
// depth-sorted props (`prop_hr_*`), a few of them moving (the mosquito
// coil's smoke, the fan, the goldfish, the TV left on, the candles, the
// compost's steam, the wind-bell) so that every room has something alive.
//
// The dark and the light are the maps' (lightBase); the lamps here add their
// pools to the light map. The clocks stand at 4:59 (52 8.8); from h2 their
// second hand tries to go on and falls back (the calling doesn't stop).

import type { Gfx } from '../../engine/gfx';
import { mix, PixelCanvas } from '../../engine/pixel';
import { getMapDef } from '../../world/maps';
import { h01, ihash, valueNoise } from '../tiles/noise';
import { P } from '../tiles/palette';
import { dk, lt, outline } from './kit';
import { HLIGHT, HP, hs, standProp } from './hoshi_kit';
import { drawLight, poolEllipse } from './light';
import { registerProp } from './registry';
import { fontTextSmall } from './text';
import type { PropArt, PropEnv } from './types';

// ================================================================ the shell

/** A thing on the north wall (tile x, width in tiles, variant). */
export interface WallDeco {
  k: string;
  x: number;
  w?: number;
  v?: string;
  /** a window on the hill's side: from h2 the loudspeaker's red lamp blinks in it */
  hill?: boolean;
}

type Style = 'plaster' | 'board' | 'tin' | 'block' | 'gym' | 'film' | 'shop';

const PLASTER = '#E4D6B6';
const PLASTER_LT = '#EFE4C8';
const PLASTER_DK = '#CDBE9C';

function wallAt(style: Style, x: number, j: number, fh: number, seed: number): string {
  if (j === 0) return P.ink;
  if (j === 1) return P.nightShade;
  if (j === 2) return P.charcoal;
  const n = h01(x, j, 7100 + seed);
  switch (style) {
    case 'plaster':
    case 'shop': {
      if (j === 3 || j === 4) return j === 3 ? P.woodLt : P.wood; // 回り縁
      if (j === 9) return P.woodLt; // 長押
      if (j === 10) return P.woodDark;
      if (j >= fh - 3) return j === fh - 3 ? P.woodLt : P.woodDark; // 幅木
      const base = style === 'shop' ? mix(PLASTER_LT, P.concreteLt, 0.5) : PLASTER;
      return n < 0.07 ? PLASTER_DK : n > 0.95 ? PLASTER_LT : valueNoise(x / 9, j / 7, seed) < 0.18 ? mix(base, PLASTER_DK, 0.5) : base;
    }
    case 'board': {
      if (j >= fh - 2) return P.woodDark;
      const k = x % 8;
      if (k === 7) return P.ink;
      const b = Math.floor(x / 8);
      const c = (b * 7 + seed) % 3 === 0 ? HP.oldWoodDk : (b + seed) % 2 ? HP.oldWood : mix(HP.oldWood, P.wood, 0.4);
      if (n < 0.05) return dk(c);
      if (k === 0) return lt(c);
      return c;
    }
    case 'tin': {
      if (j >= fh - 3) return h01(x, j, 71) < 0.5 ? P.brassOld : P.woodDark; // rust at the foot
      const k = x % 4;
      return k === 0 ? P.concrete : k === 3 ? P.asphalt : P.steel;
    }
    case 'block': {
      const row = Math.floor((j - 3) / 8);
      const off = row % 2 ? 8 : 0;
      if ((j - 3) % 8 === 7 || (x + off) % 16 === 15) return P.steel;
      return n < 0.1 ? P.concreteLt : P.concrete;
    }
    case 'gym': {
      if (j >= fh - 12) {
        if (j === fh - 12) return P.woodLt;
        return x % 6 === 5 ? P.wood : mix(P.woodLt, P.wood, 0.35);
      }
      return n < 0.06 ? P.concrete : P.concreteLt;
    }
    case 'film': {
      // the gable end of a greenhouse: frame pipes, the film over the night
      if (j >= fh - 4) return j === fh - 4 ? P.steel : P.charcoal;
      if (x % 32 === 0 || x % 32 === 1 || j === 12 || j === 13) return x % 32 === 1 || j === 13 ? P.asphalt : P.steel;
      const sheen = valueNoise(x / 20, j / 6, seed) > 0.72;
      return sheen ? mix(P.nightShade, P.concrete, 0.35) : mix(P.night, P.nightShade, 0.6 + 0.3 * (j / fh));
    }
  }
  return P.concrete;
}

/** The wall's own section (4px) against the outside: the school's dithered dark. */
function section(p: PixelCanvas, x: number, y: number, w: number, h: number): void {
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) p.set(x + i, y + j, (x + i + y + j) % 7 === 0 ? P.ink : P.nightShade);
}

// ---------------------------------------------------------------- wall things

/** Night sky with the ridge line and a few stars, in a window of w×h at (x, y). */
function nightPane(p: PixelCanvas, x: number, y: number, w: number, h: number, seed: number): void {
  for (let j = 0; j < h; j++)
    for (let i = 0; i < w; i++) {
      const top = Math.round(h * 0.62 - 3 * Math.sin(((i + seed) / (w + 6)) * Math.PI * 1.3));
      let c: string = j < h * 0.35 ? P.night : P.nightShade;
      if (j >= top) c = P.ink;
      p.set(x + i, y + j, c);
    }
  for (let k = 0; k < 3; k++) {
    const sx = x + 1 + (ihash(k, seed, 7131) % Math.max(1, w - 2));
    const sy = y + 1 + (ihash(seed, k, 7133) % Math.max(1, Math.floor(h * 0.4)));
    p.set(sx, sy, k === 0 ? P.white : P.concrete);
  }
}

function paintWindow(p: PixelCanvas, d: WallDeco, fy: number): void {
  const w = (d.w ?? 1) * 16;
  const x0 = d.x * 16 + 2;
  const ww = w - 4;
  const v = d.v ?? 'night';
  if (v === 'high') {
    // the gym's high windows under the eaves
    p.rect(x0, fy + 5, ww, 8, P.woodDark);
    nightPane(p, x0 + 1, fy + 6, ww - 2, 6, d.x);
    for (let i = x0 + 8; i < x0 + ww - 2; i += 8) p.vline(i, fy + 6, fy + 11, P.concreteLt);
    return;
  }
  const y0 = fy + 11;
  const h = 15;
  p.rect(x0, y0, ww, h, P.woodDark);
  if (v === 'amado') {
    // rain shutters shut from outside: old boards, the light of the night in their seams
    for (let i = 1; i < ww - 1; i++)
      for (let j = 1; j < h - 1; j++) p.set(x0 + i, y0 + j, i % 7 === 0 ? P.lilac : (i + j * 3) % 11 === 0 ? HP.oldWoodDk : HP.oldWood);
    return;
  }
  if (v === 'shoji') {
    for (let i = 1; i < ww - 1; i++)
      for (let j = 1; j < h - 1; j++) p.set(x0 + i, y0 + j, i % 5 === 0 || j % 5 === 0 ? P.woodLt : mix(P.paper, P.concrete, 0.25));
    return;
  }
  nightPane(p, x0 + 1, y0 + 1, ww - 2, h - 2, d.x * 5);
  // the sash's middle and the sill
  for (let i = x0 + Math.floor(ww / 2); i <= x0 + Math.floor(ww / 2); i++) p.vline(i, y0, y0 + h - 1, P.woodDark);
  p.hline(x0 - 1, x0 + ww, y0 + h, P.woodLt);
  p.hline(x0 - 1, x0 + ww, y0 + h + 1, P.wood);
}

function frameOn(p: PixelCanvas, x: number, y: number, w: number, h: number, c: string = P.woodDark): void {
  p.rect(x, y, w, h, c);
  p.hline(x, x + w - 1, y, lt(c));
}

function paintDeco(p: PixelCanvas, d: WallDeco, fy: number): void {
  const px = d.x * 16;
  const w = (d.w ?? 1) * 16;
  switch (d.k) {
    case 'window':
      paintWindow(p, d, fy);
      return;
    case 'post':
      for (let j = 3; j < 32; j++) {
        p.set(px + 6, fy + j, P.woodLt);
        p.set(px + 7, fy + j, P.wood);
        p.set(px + 8, fy + j, P.wood);
        p.set(px + 9, fy + j, P.woodDark);
      }
      return;
    case 'calendar': {
      const x = px + 3;
      const y = fy + 11;
      p.rect(x, y, 10, 14, P.white);
      p.rect(x, y, 10, 3, d.v === 'kyuji' ? P.leafDeep : P.verm);
      for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) p.set(x + 1 + c * 2 + (r % 2), y + 5 + r * 2, d.v === 'kyuji' ? P.leafShade : P.steel);
      if (d.v !== 'kyuji') p.ring(x + 6, y + 9, 1.5, 1.5, P.red);
      p.set(x + 5, y - 1, P.charcoal);
      return;
    }
    case 'frame': {
      const x = px + 2;
      const y = fy + 11;
      frameOn(p, x, y, 12, 11, d.v === 'kansha' ? P.brass : P.woodDark);
      if (d.v === 'kansha') {
        p.rect(x + 1, y + 1, 10, 9, P.paper);
        for (let r = 0; r < 4; r++) p.hline(x + 2, x + 8 - (r % 2), y + 2 + r * 2, P.ink);
        p.set(x + 9, y + 8, P.verm);
      } else if (d.v === 'kids') {
        // the last graduation: two children and their teacher before the school
        p.rect(x + 1, y + 1, 10, 9, P.aqua);
        p.rect(x + 1, y + 6, 10, 4, P.leafYoung);
        for (const [fx, c, hh] of [[3, P.navy, 3], [5, P.red, 3], [8, P.charcoal, 5]] as const) {
          p.rect(x + fx, y + 9 - hh, 2, hh, c);
          p.set(x + fx, y + 8 - hh, P.peach);
        }
      } else if (d.v === 'wedding') {
        p.rect(x + 1, y + 1, 10, 9, mix(P.concreteLt, P.goldPale, 0.4));
        p.rect(x + 4, y + 4, 4, 6, P.white);
        p.set(x + 5, y + 3, P.peach);
        p.set(x + 6, y + 3, P.peach);
        p.hline(x + 4, x + 7, y + 2, P.charcoal);
      } else if (d.v === 'work') {
        // a young man in work clothes
        p.rect(x + 1, y + 1, 10, 9, mix(P.steel, P.aqua, 0.4));
        p.rect(x + 4, y + 5, 4, 5, P.navy);
        p.rect(x + 5, y + 3, 2, 2, P.peach);
        p.hline(x + 5, x + 6, y + 2, P.ink);
      } else if (d.v === 'couple') {
        p.rect(x + 1, y + 1, 10, 9, mix(P.brassOld, P.concrete, 0.5)); // sepia
        p.rect(x + 3, y + 5, 2, 5, P.woodDark);
        p.rect(x + 7, y + 5, 2, 5, mix(P.woodDark, P.brassOld, 0.5));
        p.set(x + 3, y + 4, P.concreteLt);
        p.set(x + 7, y + 4, P.concreteLt);
      } else if (d.v === 'ghost') {
        // where a frame hung: the plaster not faded by the sun, the nail
        p.rect(x, y, 12, 11, PLASTER_LT);
        p.hline(x, x + 11, y, mix(PLASTER_LT, P.white, 0.5));
        p.set(x + 6, y - 1, P.steel);
      } else {
        p.rect(x + 1, y + 1, 10, 9, P.aqua);
        p.rect(x + 1, y + 7, 10, 3, P.leaf);
        p.rect(x + 5, y + 4, 2, 4, P.navy);
      }
      return;
    }
    case 'keys': {
      const x = px + 2;
      const y = fy + 12;
      p.rect(x, y, 12, 9, P.woodLt);
      p.hline(x, x + 11, y, P.goldPale);
      p.hline(x, x + 11, y + 8, P.wood);
      for (let k = 0; k < 3; k++) {
        const kx = x + 2 + k * 4;
        p.set(kx, y + 2, P.charcoal);
        p.vline(kx, y + 3, y + 6, P.brass);
        p.set(kx + 1, y + 6, P.brassOld);
      }
      // the key with the white tag 『天文台』
      p.rect(x + 3, y + 5, 3, 3, P.white);
      return;
    }
    case 'map': {
      const x = px + 1;
      const y = fy + 11;
      p.rect(x, y, w - 2, 14, P.paper);
      p.rect(x + 2, y + 2, w - 12, 5, P.leafYoung); // the paddies
      p.rect(x + 3, y + 8, 4, 3, P.leaf);
      p.hline(x + 1, x + w - 4, y + 7, P.blue); // the canal
      for (let k = 0; k < 7; k++) p.set(x + 4 + ((k * 5) % (w - 8)), y + 9 + (k % 3), k % 2 ? P.red : P.navy);
      p.set(x + 2, y - 1, P.verm);
      return;
    }
    case 'paper': {
      const x = px + 3;
      const y = fy + 12;
      const ww = d.v === 'long' ? w - 6 : 10;
      p.rect(x, y, ww, 11, P.paper);
      p.hline(x, x + ww - 1, y + 10, P.paperGrid);
      for (let r = 0; r < 4; r++) for (let i = x + 2; i < x + ww - 2; i++) if (ihash(i, r, 7151 + d.x) % 4) p.set(i, y + 2 + r * 2, P.ink);
      p.set(x + Math.floor(ww / 2), y - 1, P.steel);
      return;
    }
    case 'chart': {
      // a hand-drawn table: しりとり's ×, the fire watch roster, the water, the rows of a field
      const x = px + 2;
      const y = fy + 11;
      const ww = w - 4;
      p.rect(x, y, ww, 14, P.paper);
      p.strokeRect(x, y, ww, 14, P.paperGrid);
      for (let r = 1; r < 4; r++) p.hline(x + 1, x + ww - 2, y + r * 3 + 1, P.paperGrid);
      p.vline(x + 5, y + 1, y + 12, P.paperGrid);
      for (let r = 0; r < 4; r++)
        for (let c = 0; c < Math.floor((ww - 7) / 3); c++) {
          const cx = x + 7 + c * 3;
          const cy = y + 2 + r * 3;
          if (d.v === 'shiritori') {
            p.set(cx, cy, P.red);
            p.set(cx + 1, cy + 1, P.red);
          } else if (d.v === 'une') {
            p.hline(x + 2, x + ww - 3, y + 2 + r * 3, P.woodLt);
          } else if (ihash(r, c, 7161 + d.x) % 3) p.set(cx, cy, d.v === 'mizu' ? P.blue : P.ink);
        }
      p.set(x + Math.floor(ww / 2), y - 1, P.steel);
      return;
    }
    case 'hooks': {
      const y = fy + 10;
      p.hline(px + 1, px + w - 2, y, P.woodLt);
      p.hline(px + 1, px + w - 2, y + 1, P.woodDark);
      const v = d.v ?? 'hat';
      if (v === 'hats3') {
        // straw, a felt hat, a flat cap
        p.ellipse(px + 5, y + 5, 4, 2, P.goldPale);
        p.rect(px + 3, y + 3, 5, 2, P.brass);
        p.ellipse(px + 16, y + 5, 4, 2, P.charcoal);
        p.rect(px + 14, y + 2, 5, 3, P.asphalt);
        p.hline(px + 14, px + 18, y + 4, P.maroon);
        p.ellipse(px + 27, y + 4, 4, 2, mix(P.wood, P.steel, 0.4));
        p.hline(px + 24, px + 30, y + 5, P.woodDark);
      } else if (v === 'hat') {
        p.ellipse(px + 6, y + 5, 5, 2, P.goldPale);
        p.rect(px + 4, y + 3, 5, 2, P.brass);
        p.rect(px + 11, y + 2, 3, 12, P.white); // the towel
        p.hline(px + 11, px + 13, y + 6, P.blue);
      } else if (v === 'hanger') {
        // the empty hanger with its tape 『背広（役場）』
        p.line(px + 8, y + 2, px + 3, y + 6, P.woodLt);
        p.line(px + 8, y + 2, px + 13, y + 6, P.woodLt);
        p.hline(px + 3, px + 13, y + 6, P.wood);
        p.rect(px + 6, y + 8, 5, 3, P.white);
      } else if (v === 'happi') {
        for (let k = 0; k < 3; k++) {
          const hx = px + 2 + k * (w / 3);
          p.rect(hx, y + 2, 9, 12, P.navy);
          p.vline(hx + 4, y + 2, y + 13, P.white);
          p.hline(hx, hx + 8, y + 12, P.red);
        }
      } else if (v === 'helmets') {
        for (let k = 0; k < 2; k++) {
          const hx = px + 4 + k * 12;
          p.ellipse(hx, y + 5, 4, 3, P.concreteLt);
          p.hline(hx - 5, hx + 5, y + 7, P.steel);
          p.set(hx - 1, y + 3, P.white);
          p.set(hx, y + 5, P.red);
        }
      } else if (v === 'tools') {
        // sickles and a hoe on nails
        p.line(px + 3, y + 2, px + 3, y + 14, P.woodLt);
        p.line(px + 3, y + 2, px + 8, y + 4, P.steel);
        p.line(px + 12, y + 2, px + 12, y + 14, P.woodLt);
        p.line(px + 12, y + 14, px + 17, y + 13, P.steel);
        if (w > 16) {
          p.line(px + 22, y + 2, px + 22, y + 15, P.wood);
          p.rect(px + 19, y + 14, 7, 2, P.steel);
        }
      }
      return;
    }
    case 'kamidana': {
      const x = px + 1;
      const y = fy + 4;
      p.rect(x, y + 6, 14, 2, P.woodLt);
      p.rect(x + 4, y, 6, 6, mix(P.woodLt, P.goldPale, 0.4));
      p.poly([[x + 3, y + 1], [x + 7, y - 2], [x + 11, y + 1]], P.wood);
      p.set(x + 2, y + 4, P.leaf);
      p.set(x + 12, y + 4, P.leaf);
      p.hline(x, x + 14, y + 9, P.white); // the shimenawa's paper
      return;
    }
    case 'scroll': {
      const x = px + 4;
      p.rect(x, fy + 6, 8, 20, mix(P.paper, P.goldPale, 0.3));
      p.hline(x - 1, x + 8, fy + 6, P.woodDark);
      p.hline(x - 1, x + 8, fy + 25, P.woodDark);
      p.vline(x + 4, fy + 9, fy + 21, P.ink); // one line of brush (a mountain and a star)
      p.set(x + 3, fy + 12, P.ink);
      p.set(x + 5, fy + 15, P.ink);
      return;
    }
    case 'sketches': {
      const cols = [P.leaf, P.red, P.blue, P.gold, P.peach, P.navy, P.leafDeep];
      for (let k = 0; k < (d.w ?? 1) * 3; k++) {
        const sx = px + 2 + (k % ((d.w ?? 1) * 2)) * 8 + (k % 2);
        const sy = fy + 9 + Math.floor(k / ((d.w ?? 1) * 2)) * 9;
        p.rect(sx, sy, 7, 7, P.paper);
        p.set(sx + 3, sy, P.steel);
        const c = cols[k % cols.length];
        p.ellipse(sx + 3.5, sy + 4, 2, 1.5, c);
        p.set(sx + 2, sy + 2, dk(c));
      }
      return;
    }
    case 'onions': {
      p.hline(px + 1, px + w - 2, fy + 8, P.woodDark);
      for (let k = 0; k < (d.w ?? 1) * 3; k++) {
        const ox = px + 2 + k * 5;
        const oy = fy + 11 + (k % 2) * 3;
        p.vline(ox + 1, fy + 9, oy, P.woodLt);
        p.rect(ox, oy, 3, 3, P.brass);
        p.set(ox, oy, P.goldPale);
        p.set(ox + 2, oy + 2, P.brassOld);
      }
      return;
    }
    case 'banner': {
      const x = px + 2;
      const y = fy + 4;
      const ww = w - 4;
      p.rect(x, y, ww, 9, P.white);
      p.hline(x, x + ww - 1, y + 8, P.concrete);
      for (let i = x + 4; i < x + ww - 4; i++) if (ihash(i, 1, 7171) % 5 < 3) p.set(i, y + 3 + (i % 2), P.ink);
      // the children's hand prints round the words
      const cols = [P.red, P.blue, P.gold, P.leaf, P.peach];
      for (let k = 0; k < Math.floor(ww / 7); k++) {
        const hx = x + 2 + k * 7;
        const hy = y + (k % 2 ? 1 : 6);
        p.rect(hx, hy, 2, 2, cols[k % cols.length]);
      }
      return;
    }
    case 'curtain': {
      // the stage's back: the proscenium and the maroon curtain
      p.rect(px, fy + 3, w, 3, P.woodDark);
      for (let i = 0; i < w; i++)
        for (let j = 6; j < 32; j++) {
          const f = i % 6;
          p.set(px + i, fy + j, f === 0 ? P.maroon : f < 3 ? mix(P.maroon, P.crimson, 0.35) : mix(P.maroon, P.nightShade, 0.2));
        }
      return;
    }
    case 'hoop': {
      const x = px + 1;
      p.rect(x, fy + 4, 14, 10, P.white);
      p.strokeRect(x, fy + 4, 14, 10, P.steel);
      p.strokeRect(x + 4, fy + 8, 6, 5, P.red);
      p.hline(x + 3, x + 11, fy + 14, P.sunDeep);
      for (let j = 15; j < 20; j++) for (let i = x + 4 + (j % 2); i < x + 11; i += 2) p.set(i, fy + j, P.concreteLt);
      return;
    }
    case 'exit': {
      const x = px + 3;
      p.rect(x, fy + 5, 10, 6, P.leafDeep);
      p.rect(x + 1, fy + 6, 8, 4, P.leaf);
      p.set(x + 3, fy + 7, P.white);
      p.line(x + 3, fy + 8, x + 5, fy + 9, P.white);
      p.rect(x + 6, fy + 7, 2, 3, P.white);
      return;
    }
    case 'board': {
      // the shop's price list: wooden slats, a paper tag each
      const x = px + 2;
      const y = fy + 8;
      const ww = w - 4;
      p.rect(x, y, ww, 16, P.woodLt);
      p.strokeRect(x, y, ww, 16, P.wood);
      for (let k = 0; k < Math.floor(ww / 8); k++) {
        const tx = x + 2 + k * 8;
        p.rect(tx, y + 2, 6, 12, P.paper);
        p.vline(tx + 3, y + 3, y + 8, P.ink);
        p.hline(tx + 1, tx + 4, y + 11, P.verm);
      }
      return;
    }
    case 'patch': {
      // the old film's square patches of tape
      for (let k = 0; k < (d.w ?? 1) * 2; k++) {
        const x = px + 3 + k * 7;
        const y = fy + 8 + ((k * 5) % 12);
        p.rect(x, y, 5, 5, mix(P.goldPale, P.concrete, 0.4));
        p.strokeRect(x, y, 5, 5, P.brassOld);
      }
      return;
    }
    case 'fan': {
      // the greenhouse's circulation fan on the end wall, still
      const cx = px + 8;
      const cy = fy + 18;
      p.circle(cx, cy, 6, P.charcoal);
      p.ring(cx, cy, 6, 6, P.steel);
      for (let k = 0; k < 3; k++) {
        const a = (k / 3) * Math.PI * 2;
        p.line(cx, cy, Math.round(cx + Math.cos(a) * 5), Math.round(cy + Math.sin(a) * 5), P.concrete);
      }
      p.set(cx, cy, P.white);
      return;
    }
    case 'shelf': {
      // a wall shelf: jars, a tin, a radio
      const y = fy + 14;
      p.rect(px + 1, y, w - 2, 2, P.woodLt);
      p.hline(px + 1, px + w - 2, y + 2, P.woodDark);
      for (let k = 0; k < Math.floor((w - 4) / 5); k++) {
        const jx = px + 2 + k * 5;
        const c = [P.aqua, P.brass, P.red, P.leafYoung][(k + d.x) % 4];
        p.rect(jx, y - 5, 4, 5, c);
        p.hline(jx, jx + 3, y - 5, lt(c));
      }
      return;
    }
  }
}

/** The shells, cached per map. */
interface ShellImg {
  img: HTMLCanvasElement;
  W: number;
  H: number;
  shade: [number, number, number, number, number][];
  hillWins: [number, number, number, number][];
}

function buildShell(mapId: string, style: Style, door: string, deco: WallDeco[]): ShellImg {
  const rows = getMapDef(mapId)?.rows ?? ['#'];
  const TW = [...rows[0]].length;
  const TH = rows.length;
  const W = TW * 16;
  const H = TH * 16;
  const p = new PixelCanvas(W, H);
  const at = (x: number, y: number): string => (y < 0 || y >= TH || x < 0 || x >= TW ? '#' : [...rows[y]][x] ?? '#');
  const isFloor = (x: number, y: number) => {
    const c = at(x, y);
    return c !== '#' && c !== 'W' && c !== 'D';
  };
  const seed = ihash(TW, TH, mapId.length);
  // the wall faces (the rows of W from the top)
  let fh = 0;
  while (fh < TH && [...rows[fh]].some((c) => c === 'W')) fh++;
  const faceH = fh * 16;
  for (let y = 0; y < faceH; y++)
    for (let x = 0; x < W; x++) if (at(Math.floor(x / 16), Math.floor(y / 16)) === 'W') p.set(x, y, wallAt(style, x, y, faceH, seed));
  for (const d of deco) paintDeco(p, d, 0);
  // sections: the side walls (the void cells next to the floor or the face), the south wall
  const shade: [number, number, number, number, number][] = [];
  for (let ty = 0; ty < TH; ty++)
    for (let tx = 0; tx < TW; tx++) {
      const c = at(tx, ty);
      if (c !== '#') continue;
      const inner = (x: number, y: number) => at(x, y) !== '#';
      if (inner(tx + 1, ty)) section(p, tx * 16 + 12, ty * 16, 4, 16);
      if (inner(tx - 1, ty)) section(p, tx * 16, ty * 16, 4, 16);
      if (inner(tx, ty - 1)) section(p, tx * 16, ty * 16, 16, 4);
    }
  // the south wall's corners
  for (let tx = 0; tx < TW; tx++)
    if (at(tx, TH - 1) === '#' && at(tx, TH - 2) === '#' && (at(tx + 1, TH - 2) !== '#' || at(tx - 1, TH - 2) !== '#')) section(p, tx * 16 + (at(tx + 1, TH - 2) !== '#' ? 12 : 0), (TH - 1) * 16, 4, 4);
  // the door in the south wall
  for (let tx = 0; tx < TW; tx++) {
    if (at(tx, TH - 1) !== 'D') continue;
    const dx = tx * 16;
    const dy = (TH - 1) * 16;
    p.rect(dx - 2, dy, 20, 2, door === 'iron' || door === 'shutter' ? P.steel : P.wood);
    p.hline(dx - 2, dx + 17, dy, door === 'iron' || door === 'shutter' ? P.concreteLt : P.woodLt);
    p.rect(dx, dy + 2, 16, 10, P.night);
    for (let i = 0; i < 16; i++) if (h01(dx + i, dy, 7181) < 0.4) p.set(dx + i, dy + 2, P.nightShade);
    // the door leaf, slid aside
    if (door === 'hikido' || door === 'glass') {
      p.rect(dx + 11, dy + 2, 5, 9, P.steel);
      p.rect(dx + 12, dy + 3, 3, 7, P.nightShade);
      p.set(dx + 12, dy + 3, P.aqua);
    } else if (door === 'wood') {
      p.rect(dx + 11, dy + 2, 5, 9, HP.oldWood);
      p.vline(dx + 13, dy + 2, dy + 10, HP.oldWoodDk);
    } else if (door === 'shutter') {
      // the roll-up's bottom bar, up in its box
      p.hline(dx, dx + 15, dy + 2, P.asphalt);
    } else if (door === 'film') {
      p.rect(dx + 11, dy + 2, 5, 9, mix(P.nightShade, P.concrete, 0.3));
      p.vline(dx + 11, dy + 2, dy + 10, P.woodLt);
    } else if (door === 'iron') {
      p.rect(dx + 10, dy + 2, 6, 9, P.steel);
      p.vline(dx + 12, dy + 2, dy + 10, P.asphalt);
    }
    p.hline(dx - 1, dx + 16, dy + 11, P.ink);
  }
  // contact shadows along the walls (drawn over the floor each frame)
  for (let ty = 0; ty < TH; ty++)
    for (let tx = 0; tx < TW; tx++) {
      if (!isFloor(tx, ty)) continue;
      if (at(tx, ty - 1) === 'W') shade.push([tx * 16, ty * 16, 16, 4, 0.22]);
      if (at(tx - 1, ty) === '#') shade.push([tx * 16, ty * 16, 3, 16, 0.18]);
      if (at(tx + 1, ty) === '#') shade.push([tx * 16 + 13, ty * 16, 3, 16, 0.18]);
    }
  const hillWins: [number, number, number, number][] = [];
  for (const d of deco) if (d.k === 'window' && d.hill) hillWins.push([d.x * 16 + 3, 12, (d.w ?? 1) * 16 - 6, 13]);
  return { img: p.toCanvas(), W, H, shade, hillWins };
}

registerProp('prop_hr_shell', (opts) => {
  let s: ShellImg | null = null;
  const get = () => (s ??= buildShell(String(opts.map), (opts.wall as Style) ?? 'plaster', String(opts.door ?? 'hikido'), (opts.deco as WallDeco[]) ?? []));
  const a: PropArt = {
    ox: 0,
    oy: 0,
    get w() {
      return get().W;
    },
    get h() {
      return get().H;
    },
    foot: 0,
    flat: true,
    img: () => get().img,
    over(g: Gfx, x: number, y: number) {
      const sh = get();
      for (const [sx, sy, w, h, al] of sh.shade) g.rect(x + sx, y + sy, w, h, P.ink, al);
    },
    glow(g: Gfx, x: number, y: number, env: PropEnv) {
      // from h2 the loudspeaker's red lamp on the hill, in the windows that face it (the calling doesn't stop)
      if (hs(env) !== 2) return;
      const sh = get();
      const on = Math.floor(env.t / 900) % 2 === 0;
      for (const [wx, wy, ww, wh] of sh.hillWins) {
        const lx = x + wx + Math.floor(ww * 0.6);
        const ly = y + wy + Math.floor(wh * 0.4);
        g.rect(lx - 1, ly - 1, 3, 3, '#E84E3C', on ? 0.35 : 0.12);
        g.rect(lx, ly, 1, 1, '#FF6A4D', on ? 1 : 0.4);
      }
    },
  } as PropArt;
  return a;
});

// ================================================================ furniture

interface Furn {
  w: number;
  h: number;
  /** anchor: the art's centre x over the anchor tile's left edge, and its foot line (px from the tile's top) */
  cx?: number;
  base?: number;
  foot?: number;
  paint(p: PixelCanvas, o: Record<string, unknown>): void;
  extra?(o: Record<string, unknown>, art: PropArt): Partial<PropArt>;
}

const FURN: Record<string, Furn> = {};
const furn = (id: string, f: Furn) => {
  FURN[id] = f;
  registerProp('prop_hr_' + id, (o) => {
    const art = standProp(f.w, f.h, (p) => f.paint(p, o), { cx: f.cx ?? 8, base: f.base ?? 16, foot: f.foot, shadow: 0 });
    return { ...art, ...(f.extra?.(o, art) ?? {}) };
  });
};

/** A little box with a lighter top edge. */
function blk(p: PixelCanvas, x: number, y: number, w: number, h: number, c: string): void {
  p.rect(x, y, w, h, c);
  p.hline(x, x + w - 1, y, lt(c));
  p.vline(x + w - 1, y + 1, y + h - 1, dk(c));
}

// ---------------------------------------------------------------- shelves and chests

furn('shelf', {
  w: 32,
  h: 40,
  cx: 16,
  paint(p, o) {
    const v = String(o.v ?? 'books');
    const frame = v === 'chadansu' || v === 'kairan' ? P.wood : v === 'bichiku' || v === 'empty' ? P.steel : P.woodDark;
    p.rect(0, 0, 32, 40, frame);
    p.hline(0, 31, 0, lt(frame));
    for (let s = 0; s < 3; s++) {
      const y = 3 + s * 12;
      p.rect(2, y, 28, 10, dk(frame));
      p.hline(2, 29, y + 10, lt(frame));
      for (let i = 0; i < 28; ) {
        const k = ihash(i, s, 7201 + v.length);
        let bw = 2 + (k % 3);
        const x = 2 + i;
        if (v === 'books' || v === 'stars') {
          const cols = v === 'stars' ? [P.navy, P.blue, P.nightShade, P.gold, P.white] : [P.maroon, P.navy, P.leafShade, P.brassOld, P.concrete];
          const hh = 6 + (k % 4);
          p.rect(x, y + 10 - hh, bw, hh, cols[k % cols.length]);
          p.set(x, y + 10 - hh, lt(cols[k % cols.length]));
        } else if (v === 'jars' || v === 'paint') {
          bw = 4;
          const cols = v === 'paint' ? [P.red, P.gold, P.blue, P.leaf, P.peach, P.white] : [P.aqua, P.brass, P.concreteLt];
          const c = cols[k % cols.length];
          p.rect(x, y + 4, 3, 6, v === 'paint' ? c : mix(c, P.white, 0.3));
          p.hline(x, x + 2, y + 3, P.steel);
          if (v === 'paint' && s === 0 && i < 6) p.rect(x, y + 4, 3, 6, P.concreteLt); // the empty jar (夕焼けの赤)
        } else if (v === 'chadansu') {
          if (s === 0) {
            // glass doors, cups behind
            p.set(x + 1, y + 6, P.white);
            p.set(x, y + 7, P.white);
          } else if (s === 1) {
            p.rect(x, y + 5, 2, 5, [P.gold, P.leafYoung, P.white][k % 3]); // tins
          } else p.rect(x, y + 2, bw, 8, P.wood);
        } else if (v === 'kairan') {
          p.rect(x, y + 2, 2, 8, [P.blue, P.leafDeep, P.navy][k % 3]);
          p.set(x, y + 2, P.white);
        } else if (v === 'bichiku') {
          const c = s === 0 ? P.aqua : s === 1 ? P.concreteLt : P.gold;
          p.rect(x, y + 3, bw, 7, c);
          p.hline(x, x + bw - 1, y + 3, lt(c));
          if (s === 1) p.hline(x, x + bw - 1, y + 6, P.blue);
        } else if (v === 'empty') {
          if (k % 5 === 0) p.rect(x, y + 8, 3, 2, P.paper); // a price tag left
        } else if (v === 'tools') {
          p.rect(x, y + 3, bw, 7, [P.steel, P.verm, P.leafDeep, P.woodLt][k % 4]);
        }
        i += bw + (v === 'empty' ? 4 : 1);
      }
    }
    if (v === 'chadansu') {
      p.vline(16, 3, 13, P.woodLt);
      p.rect(8, 27, 2, 2, P.brass);
      p.rect(22, 27, 2, 2, P.brass);
    }
  },
});

furn('tansu', {
  w: 30,
  h: 32,
  cx: 16,
  paint(p, o) {
    blk(p, 0, 4, 30, 28, P.wood);
    for (let r = 0; r < 4; r++) {
      const y = 7 + r * 6;
      p.hline(1, 28, y + 5, P.woodDark);
      p.rect(7, y + 2, 3, 1, P.brass);
      p.rect(20, y + 2, 3, 1, P.brass);
    }
    if (o.top === 'photo') {
      p.rect(3, 0, 8, 5, P.woodDark);
      p.rect(4, 1, 6, 3, P.aqua);
    }
    if (o.top === 'kingyo' || o.top === 'radio') {
      p.rect(18, 0, 9, 5, P.charcoal);
      p.rect(19, 1, 4, 3, P.steel);
    }
  },
});

furn('butsudan', {
  w: 16,
  h: 30,
  paint(p) {
    blk(p, 0, 0, 16, 30, P.ink);
    p.rect(2, 3, 12, 15, P.night);
    p.rect(5, 5, 6, 8, P.brassOld); // the gold within
    p.rect(6, 6, 4, 6, P.brass);
    p.set(8, 7, P.goldPale);
    // the doors open
    p.rect(0, 2, 2, 17, P.maroon);
    p.rect(14, 2, 2, 17, P.maroon);
    // the candles
    p.vline(3, 14, 17, P.white);
    p.vline(12, 14, 17, P.white);
    p.rect(2, 18, 12, 2, P.brassOld);
    p.rect(1, 21, 14, 9, P.woodDark);
    p.hline(1, 14, 21, P.wood);
    p.rect(6, 17, 4, 2, P.charcoal); // the incense bowl
  },
  extra(o) {
    if (!o.lit) return {};
    return {
      glow(g: Gfx, x: number, y: number, env: PropEnv) {
        const f = 0.75 + 0.25 * valueNoise(env.t / 90, x, 3);
        g.rect(x + 3, y - 1, 1, 2, '#FFE7A3', f);
        g.rect(x + 12, y - 1, 1, 2, '#FFE7A3', 0.8 + 0.2 * valueNoise(env.t / 80, y, 5));
        g.rect(x + 3, y - 2, 1, 1, '#F7C27A', 0.6 * f);
        g.rect(x + 12, y - 2, 1, 1, '#F7C27A', 0.6);
      },
      light(g: Gfx, x: number, y: number, env: PropEnv) {
        drawLight(g, poolEllipse(26, 18, HLIGHT.warm), x + 8, y + 4, 0.42 + 0.06 * valueNoise(env.t / 120, 1, 7));
      },
    };
  },
});

furn('tv', {
  w: 22,
  h: 24,
  cx: 8,
  paint(p) {
    blk(p, 1, 14, 20, 10, P.woodDark); // the low stand
    blk(p, 2, 1, 18, 14, P.charcoal);
    p.rect(4, 3, 12, 9, P.ink);
    p.set(5, 4, P.asphalt);
    p.rect(17, 4, 2, 2, P.steel);
    p.rect(17, 8, 2, 1, P.steel);
  },
  extra(o) {
    if (o.top === 'clocks') {
      // two alarm clocks on the set, both stopped at the same time
      const c = new PixelCanvas(22, 8);
      for (const cx of [5, 14]) {
        c.circle(cx, 4, 3, cx === 5 ? P.red : P.blue);
        c.circle(cx, 4, 2, P.white);
        c.set(cx, 3, P.ink);
        c.set(cx + 1, 4, P.ink);
        c.set(cx - 2, 0, P.brass);
        c.set(cx + 2, 0, P.brass);
      }
      const img = c.toCanvas();
      return { fg: [{ ox: -3, oy: -14, img: () => img }] };
    }
    if (!o.on) return {};
    return {
      glow(g: Gfx, x: number, y: number, env: PropEnv) {
        // the set left on: the snow of a station off the air, the corner clock at 4:59; from h2 a line runs across
        const t = Math.floor(env.t / 70);
        for (let j = 0; j < 9; j++)
          for (let i = 0; i < 12; i++) {
            const n = ihash(i + t * 13, j + t * 7, 7301) % 7;
            g.rect(x - 1 + i, y - 11 + j, 1, 1, n < 2 ? '#DDE6F0' : n < 4 ? '#8E95A6' : '#3A3F48', 0.85);
          }
        g.rect(x + 5, y - 11, 6, 3, '#1B1733', 0.9);
        g.rect(x + 6, y - 10, 1, 1, '#DDE6F0');
        g.rect(x + 8, y - 10, 2, 1, '#DDE6F0');
        if (hs(env) === 2) {
          const off = Math.floor(env.t / 60) % 16;
          g.rect(x - 1, y - 5, 12, 2, '#1B1733', 0.85);
          for (let i = 0; i < 12; i++) if ((i + off) % 4 < 2) g.rect(x - 1 + i, y - 5, 1, 1, '#FFE7A3', 0.9);
        }
      },
      light(g: Gfx, x: number, y: number, env: PropEnv) {
        drawLight(g, poolEllipse(24, 16, '150,170,220'), x + 5, y + 6, 0.28 + 0.08 * ((Math.floor(env.t / 70) * 7) % 3) / 2);
      },
    };
  },
});

furn('chabudai', {
  w: 30,
  h: 16,
  cx: 16,
  paint(p, o) {
    p.ellipse(15, 6, 14, 5, P.woodDark);
    p.ellipse(15, 5, 14, 5, P.wood);
    p.ellipse(15, 4.5, 12, 3.5, mix(P.wood, P.woodLt, 0.35));
    p.vline(5, 9, 15, P.woodDark);
    p.vline(25, 9, 15, P.woodDark);
    const items = String(o.items ?? 'tea');
    if (items.includes('tea')) {
      p.rect(8, 2, 3, 3, P.white);
      p.hline(8, 10, 2, P.leafYoung);
      p.rect(18, 1, 5, 4, P.steel); // the teapot
      p.set(23, 2, P.steel);
    }
    if (items.includes('two')) {
      p.rect(7, 2, 3, 3, P.white);
      p.rect(20, 2, 3, 3, P.white);
    }
    if (items.includes('hayami')) {
      p.circle(20, 4, 3, P.navy);
      p.set(19, 3, P.white);
      p.set(21, 5, P.gold);
    }
    if (items.includes('letters')) {
      p.rect(9, 2, 7, 4, P.white);
      p.rect(11, 1, 7, 4, P.paper);
      p.set(16, 2, P.red);
    }
    if (items.includes('kairan')) {
      p.rect(10, 1, 10, 5, P.blue);
      p.rect(11, 2, 8, 3, P.white);
    }
    if (items.includes('sketch')) {
      p.rect(6, 1, 9, 6, P.paper);
      p.ellipse(10, 4, 2, 1.5, P.leaf);
      p.rect(17, 2, 6, 5, P.paper);
      p.set(19, 4, P.red);
    }
  },
});

furn('futon', {
  w: 18,
  h: 30,
  cx: 8,
  base: 28,
  paint(p, o) {
    if (o.v === 'folded') {
      // two sets folded, the two pillows facing each other
      for (let k = 0; k < 2; k++) {
        const x = k * 9;
        blk(p, x, 12, 9, 16, k ? P.peach : P.blue);
        p.hline(x, x + 8, 17, P.white);
        p.hline(x, x + 8, 22, P.white);
        blk(p, x + 1, 8, 7, 4, P.white);
      }
      return;
    }
    // the futon laid out, someone under it (head north)
    blk(p, 1, 2, 16, 27, P.white);
    p.rect(2, 10, 14, 18, mix(P.peach, P.white, 0.45));
    for (let j = 12; j < 28; j += 4) p.hline(3, 14, j, mix(P.peach, P.crimson, 0.25));
    p.rect(4, 2, 10, 6, P.concreteLt); // the pillow
    p.ellipse(9, 6, 3, 3, P.concreteLt); // white hair
    p.set(8, 7, P.peach);
    p.set(10, 7, P.peach);
  },
  extra(o) {
    if (o.v === 'folded') return {};
    return {
      over(g: Gfx, x: number, y: number, env: PropEnv) {
        // breathing: the quilt rises and falls (4.5 s)
        const b = Math.sin((env.t / 4500) * Math.PI * 2);
        if (b > 0.2) g.rect(x + 3, y - 18 + 12, 12, 1, '#F4F1E8', 0.7);
      },
    };
  },
});

furn('futon2', {
  w: 18,
  h: 26,
  paint(p) {
    // two sets folded, the two pillows facing each other on top
    for (let k = 0; k < 2; k++) {
      const x = k * 9;
      blk(p, x, 10, 9, 16, k ? P.peach : P.blue);
      p.hline(x, x + 8, 15, P.white);
      p.hline(x, x + 8, 20, P.white);
    }
    blk(p, 2, 6, 6, 4, P.white);
    blk(p, 10, 6, 6, 4, P.white);
  },
});

furn('fridge', {
  w: 16,
  h: 32,
  paint(p, o) {
    blk(p, 0, 0, 16, 32, P.concreteLt);
    p.hline(1, 14, 11, P.concrete);
    p.vline(13, 3, 9, P.steel);
    p.vline(13, 14, 22, P.steel);
    if (o.v !== 'plain') {
      // a grandchild's drawing held by magnets
      p.rect(3, 14, 8, 7, P.paper);
      p.set(5, 16, P.red);
      p.set(8, 16, P.blue);
      p.hline(5, 8, 19, P.leaf);
      p.set(4, 13, P.red);
      p.set(10, 13, P.gold);
    }
  },
});

furn('nagashi', {
  w: 32,
  h: 26,
  cx: 16,
  paint(p) {
    blk(p, 0, 8, 32, 18, P.concrete);
    p.rect(1, 8, 30, 3, P.steel);
    p.rect(3, 9, 12, 2, P.charcoal); // the sink
    p.vline(9, 3, 8, P.steel); // the tap
    p.hline(9, 12, 3, P.steel);
    p.rect(19, 6, 10, 3, P.charcoal); // the gas stove
    p.rect(21, 3, 6, 4, P.steel); // the kettle
    p.set(27, 4, P.steel);
    p.hline(21, 26, 3, P.concreteLt);
    for (let i = 2; i < 30; i += 10) p.rect(i, 14, 8, 10, dk(P.concrete));
    p.set(6, 11, P.white); // a cup turned down
  },
});

furn('kamado', {
  w: 32,
  h: 24,
  cx: 16,
  paint(p) {
    blk(p, 0, 6, 32, 18, mix(P.woodLt, P.concrete, 0.4));
    for (let k = 0; k < 2; k++) {
      const cx = 8 + k * 16;
      p.ellipse(cx, 7, 6, 3, P.ink);
      p.rect(cx - 4, 16, 8, 6, P.night); // the fire mouth, cold
      p.hline(cx - 4, cx + 3, 16, P.charcoal);
    }
    // the black pot with its wooden lid
    p.ellipse(8, 5, 6, 3, P.charcoal);
    p.ellipse(8, 3, 5, 2, P.wood);
    p.hline(5, 11, 3, P.woodLt);
    p.rect(23, 3, 3, 3, P.steel);
  },
});

furn('irori', {
  w: 32,
  h: 44,
  cx: 16,
  base: 32,
  paint(p) {
    // the sunken hearth (2×2) with its wooden frame, the ash, the kettle on the hook
    p.rect(0, 12, 32, 32, P.woodDark);
    p.rect(3, 15, 26, 26, mix(P.concrete, P.steel, 0.5));
    for (let i = 0; i < 26; i++) for (let j = 0; j < 26; j++) if (h01(i, j, 7401) < 0.2) p.set(3 + i, 15 + j, P.concrete);
    p.hline(0, 31, 12, P.woodLt);
    p.vline(16, 0, 26, P.woodDark); // the pot hook
    p.rect(14, 2, 5, 3, P.wood);
    p.ellipse(16, 30, 6, 4, P.charcoal);
    p.ellipse(16, 28, 5, 2, P.asphalt);
    p.set(14, 27, P.steel);
    p.rect(8, 34, 2, 2, P.ink);
    p.set(8, 34, P.sunDeep); // one live coal
  },
});

furn('telescope', {
  w: 20,
  h: 30,
  paint(p) {
    p.line(8, 18, 3, 29, P.steel);
    p.line(8, 18, 14, 29, P.steel);
    p.line(8, 18, 8, 29, P.asphalt);
    p.rect(6, 16, 5, 3, P.charcoal);
    // the tube, pointing up to the window
    for (let k = 0; k < 16; k++) {
      const x = 3 + Math.round(k * 0.55);
      const y = 16 - k;
      p.set(x, y, P.white);
      p.set(x + 1, y, P.concreteLt);
      p.set(x + 2, y, P.concrete);
    }
    p.rect(11, 0, 4, 2, P.navy);
    p.set(3, 16, P.charcoal);
  },
});

furn('easel', {
  w: 30,
  h: 36,
  cx: 8,
  paint(p) {
    p.line(15, 0, 6, 35, P.woodLt);
    p.line(15, 0, 24, 35, P.woodLt);
    p.line(15, 4, 15, 35, P.wood);
    // the big canvas: 星見台 at night, the east edge still white
    p.rect(1, 4, 28, 20, P.woodLt);
    for (let j = 0; j < 18; j++)
      for (let i = 0; i < 26; i++) {
        let c: string = j < 8 ? P.navy : j < 12 ? P.nightShade : P.leafShade;
        if (i > 21) c = j < 12 ? P.white : P.leafShade;
        p.set(2 + i, 5 + j, c);
      }
    for (const [i, j] of [[4, 2], [9, 4], [15, 1], [19, 5]]) p.set(2 + i, 5 + j, P.white);
    p.set(12, 18, P.sun); // a little lamp in the village
    p.set(7, 19, P.goldPale);
    p.rect(4, 24, 22, 2, P.wood);
  },
});

furn('boxes', {
  w: 32,
  h: 30,
  cx: 16,
  paint(p, o) {
    const v = String(o.v ?? 'cardboard');
    if (v === 'chochin') {
      // the festival's lantern boxes, one open: a paper lantern folded in it
      blk(p, 0, 12, 18, 18, P.woodLt);
      blk(p, 16, 8, 16, 22, P.wood);
      p.ellipse(9, 11, 6, 4, P.white);
      for (let k = 0; k < 3; k++) p.hline(4, 14, 9 + k * 2, P.concrete);
      p.rect(7, 12, 5, 2, P.red);
      p.rect(19, 12, 10, 6, P.paper);
      p.hline(20, 27, 14, P.ink);
    } else if (v === 'rice') {
      for (let k = 0; k < 3; k++) {
        const x = (k % 2) * 14 + (k === 2 ? 7 : 0);
        const y = k === 2 ? 4 : 14;
        blk(p, x, y, 16, 14, P.concreteLt);
        p.rect(x + 3, y + 5, 10, 4, P.leafYoung);
        p.hline(x + 4, x + 11, y + 6, P.leafDeep);
      }
    } else if (v === 'tent') {
      blk(p, 0, 16, 32, 12, P.white);
      for (let i = 0; i < 32; i += 8) p.vline(i, 16, 27, P.concrete);
      p.rect(3, 18, 6, 4, P.blue);
      p.rect(0, 26, 32, 4, P.steel); // the poles bundled
      p.hline(0, 31, 26, P.concreteLt);
    } else if (v === 'bags') {
      for (let k = 0; k < 3; k++) {
        const x = k * 10;
        blk(p, x, 12 + (k % 2) * 3, 12, 15, mix(P.white, P.concrete, 0.3));
        p.rect(x + 2, 17 + (k % 2) * 3, 8, 3, P.leafDeep);
        p.hline(x + 3, x + 8, 18 + (k % 2) * 3, P.white);
      }
    } else if (v === 'boards') {
      for (let k = 0; k < 5; k++) blk(p, 1 + k, 10 + k * 4, 30 - k, 4, k % 2 ? HP.oldWood : P.woodLt);
      p.vline(4, 12, 28, P.ink);
    } else if (v === 'crate') {
      // the ramune crate: empty bottles, the marbles inside
      blk(p, 2, 14, 28, 16, P.sunDeep);
      for (let k = 0; k < 6; k++) {
        const x = 4 + k * 4;
        p.rect(x, 6, 3, 9, mix(P.aqua, P.white, 0.3));
        p.set(x + 1, 9, P.leafYoung);
        p.hline(x, x + 2, 5, P.blue);
      }
      for (let i = 4; i < 28; i += 4) p.vline(i, 16, 28, dk(P.sunDeep));
    } else {
      blk(p, 0, 12, 18, 18, mix(P.woodLt, P.goldPale, 0.3));
      blk(p, 14, 4, 18, 26, mix(P.woodLt, P.brass, 0.35));
      p.hline(0, 17, 17, P.brassOld);
      p.hline(14, 31, 12, P.brassOld);
      p.rect(18, 16, 8, 5, P.paper);
    }
  },
});

furn('workbench', {
  w: 32,
  h: 26,
  cx: 16,
  paint(p, o) {
    blk(p, 0, 8, 32, 5, P.woodLt);
    p.vline(2, 13, 25, P.woodDark);
    p.vline(29, 13, 25, P.woodDark);
    p.hline(2, 29, 20, P.wood);
    if (o.v === 'manual') {
      p.rect(4, 4, 9, 5, P.white);
      p.rect(4, 4, 9, 2, P.verm);
      p.set(8, 7, P.ink);
      p.rect(17, 5, 5, 3, P.steel); // a spanner, a can of oil
      p.rect(24, 2, 4, 6, P.red);
      p.hline(24, 27, 2, P.vermLt);
    } else if (o.v === 'genko') {
      // the 放送 manuscripts in a pile, a mic stand's clip (just the papers)
      for (let k = 0; k < 4; k++) p.rect(3 + k, 5 - k, 12, 4, k % 2 ? P.paper : P.white);
      p.rect(19, 4, 8, 4, P.paper);
      p.hline(20, 25, 5, P.ink);
      p.rect(28, 3, 2, 5, P.navy);
    } else if (o.v === 'shikiji') {
      p.rect(3, 4, 12, 5, P.white);
      for (let i = 5; i < 14; i += 2) p.vline(i, 5, 7, P.ink);
      p.rect(19, 3, 9, 6, P.blue); // the spare pads' box
      p.rect(20, 4, 7, 2, P.white);
      p.set(23, 7, P.verm);
    } else if (o.v === 'hikae') {
      p.rect(4, 4, 11, 5, mix(P.paper, P.paperGrid, 0.5));
      for (let r = 0; r < 2; r++) p.hline(5, 13, 5 + r * 2, P.steel);
      p.rect(18, 5, 3, 3, P.gold); // an ear tag on the desk
      p.rect(24, 3, 2, 6, P.red); // the red pen
    } else if (o.v === 'fuda') {
      for (let k = 0; k < 3; k++) {
        p.rect(3 + k * 9, 3 + (k % 2), 8, 6, P.paper);
        p.set(6 + k * 9, 5 + (k % 2), [P.leaf, '#7A5AA0', P.red][k]);
      }
    }
  },
});

// ---------------------------------------------------------------- small things

furn('obj', {
  w: 18,
  h: 26,
  extra(o) {
    if (o.v !== 'andon') return {};
    // the night-light by the old woman's pillow
    return {
      glow(g: Gfx, x: number, y: number, env: PropEnv) {
        g.rect(x + 5, y - 5, 7, 10, '#FFE7A3', 0.35 + 0.05 * Math.sin(env.t / 700));
      },
      light(g: Gfx, x: number, y: number) {
        drawLight(g, poolEllipse(40, 26, HLIGHT.warm), x + 8, y + 6, 0.5);
      },
    };
  },
  paint(p, o) {
    const v = String(o.v ?? 'mizugame');
    if (v === 'mizugame') {
      p.ellipse(8, 17, 7, 8, P.woodDark);
      p.ellipse(8, 16, 6, 7, mix(P.woodDark, P.brassOld, 0.4));
      p.ellipse(8, 10, 6, 2, P.nightShade);
      p.line(10, 9, 15, 3, P.woodLt); // the ladle
    } else if (v === 'komebitsu') {
      blk(p, 1, 8, 15, 18, P.wood);
      p.rect(3, 12, 11, 2, P.woodDark);
      p.rect(4, 17, 9, 5, P.paper);
      p.set(8, 19, P.ink);
    } else if (v === 'oke') {
      // the pickle tub and its weight stone 『ぴょん』
      p.ellipse(8, 18, 7, 7, P.woodLt);
      for (let i = 2; i < 15; i += 3) p.vline(i, 13, 24, P.wood);
      p.hline(1, 15, 16, P.steel);
      p.hline(1, 15, 22, P.steel);
      p.ellipse(8, 12, 6, 3, P.woodDark);
      p.ellipse(8, 10, 4, 3, P.steel);
      p.set(7, 9, P.concreteLt);
    } else if (v === 'bucket') {
      p.rect(3, 14, 11, 11, P.steel);
      p.hline(3, 13, 14, P.concreteLt);
      p.ellipse(8.5, 15, 5, 1.5, P.blue);
      p.rect(9, 7, 3, 9, mix(P.aqua, P.white, 0.3)); // the ramune
      p.hline(9, 11, 6, P.blue);
      p.set(10, 10, P.leafYoung);
      p.line(3, 14, 8, 9, P.charcoal); // the handle
      p.line(8, 9, 13, 14, P.charcoal);
    } else if (v === 'taiko') {
      p.ellipse(8, 12, 7, 7, P.maroon);
      p.ellipse(8, 12, 5, 5, mix(P.paper, P.goldPale, 0.4));
      for (let k = 0; k < 8; k++) p.set(Math.round(8 + Math.cos(k) * 6), Math.round(12 + Math.sin(k) * 6), P.goldPale);
      p.line(3, 20, 1, 25, P.woodDark);
      p.line(13, 20, 15, 25, P.woodDark);
      p.line(5, 6, 11, 3, P.woodLt);
    } else if (v === 'andon') {
      blk(p, 4, 8, 9, 14, mix(P.paper, P.goldPale, 0.4));
      p.vline(8, 8, 21, P.woodLt);
      p.hline(4, 12, 14, P.woodLt);
      p.rect(5, 22, 7, 3, P.woodDark);
    } else if (v === 'kagu') {
      // the grandchildren's candy basket on the shoe chest
      blk(p, 0, 12, 18, 14, P.wood);
      p.hline(0, 17, 18, P.woodDark);
      p.ellipse(9, 10, 6, 3, P.brass);
      p.ellipse(9, 9, 5, 2, P.brassOld);
      p.rect(6, 6, 2, 4, P.goldPale);
      p.rect(10, 7, 4, 2, P.red);
      p.rect(4, 3, 3, 4, P.white);
      p.set(5, 5, P.ink);
    } else if (v === 'kyukyu') {
      blk(p, 2, 10, 14, 10, P.white);
      p.rect(8, 12, 2, 6, P.red);
      p.rect(6, 14, 6, 2, P.red);
      blk(p, 0, 20, 18, 6, P.steel);
    } else if (v === 'bonsai') {
      for (let k = 0; k < 3; k++) {
        const x = k * 6;
        p.rect(x, 18, 5, 5, P.brassOld);
        p.hline(x, x + 4, 18, P.woodLt);
        p.ellipse(x + 2.5, 14, 2.5, 3, k === 1 ? P.leafDeep : P.leaf);
        p.set(x + 2, 12, P.leafYoung);
      }
    } else if (v === 'suito') {
      blk(p, 0, 14, 18, 12, P.woodLt);
      p.rect(2, 4, 4, 10, P.leafDeep); // the flask
      p.rect(2, 3, 4, 2, P.steel);
      p.rect(9, 7, 6, 7, mix(P.white, P.aqua, 0.3)); // the jar of umeboshi
      p.rect(10, 10, 4, 3, P.red);
      p.hline(9, 14, 6, P.red);
    } else if (v === 'thermo') {
      p.vline(8, 2, 22, P.steel);
      p.circle(8, 4, 3, P.white);
      p.set(8, 4, P.red);
      p.set(9, 3, P.ink);
    } else if (v === 'hosebox') {
      for (let k = 0; k < 3; k++) {
        p.ellipse(8, 22 - k * 6, 7, 3, P.concreteLt);
        p.ellipse(8, 22 - k * 6, 3, 1, P.steel);
      }
      p.rect(6, 1, 4, 5, P.brass);
    } else if (v === 'kusakari') {
      p.line(2, 25, 15, 4, P.verm);
      p.line(3, 25, 16, 4, P.vermShade);
      p.circle(3, 24, 2, P.steel);
      p.rect(10, 10, 6, 5, P.red);
      p.hline(6, 11, 14, P.charcoal);
    } else if (v === 'fork') {
      p.line(3, 25, 10, 2, P.woodLt);
      for (let k = 0; k < 4; k++) p.line(9 + k, 2, 8 + k, 0, P.steel);
      p.line(12, 25, 15, 6, P.wood);
      p.rect(13, 3, 4, 4, P.steel);
    } else if (v === 'omake') {
      // ペロ's shelf in the earthen kitchen: the box marked 『おまけ』
      blk(p, 0, 12, 18, 14, HP.oldWood);
      p.hline(0, 17, 18, HP.oldWoodDk);
      blk(p, 3, 5, 12, 8, mix(P.woodLt, P.goldPale, 0.3));
      p.rect(5, 7, 8, 3, P.paper);
      p.hline(6, 11, 8, P.verm);
    } else if (v === 'gunte') {
      blk(p, 1, 12, 16, 12, mix(P.woodLt, P.goldPale, 0.3));
      p.hline(1, 16, 16, P.brassOld);
      for (let k = 0; k < 3; k++) p.rect(3 + k * 4, 8 + (k % 2), 3, 5, P.white);
    } else if (v === 'kigae') {
      // the scarecrows' change of clothes in a basket
      p.ellipse(8, 19, 8, 6, P.brassOld);
      for (let i = 1; i < 16; i += 2) p.vline(i, 15, 24, P.woodLt);
      p.rect(3, 10, 5, 5, P.navy);
      p.rect(8, 11, 6, 4, P.brass);
      p.rect(6, 8, 4, 3, P.red);
    } else if (v === 'tape') {
      blk(p, 1, 14, 16, 4, P.woodLt);
      p.vline(3, 18, 25, P.woodDark);
      p.vline(14, 18, 25, P.woodDark);
      p.circle(6, 11, 3, mix(P.goldPale, P.concrete, 0.4));
      p.circle(6, 11, 1, P.woodDark);
      p.circle(12, 12, 2, mix(P.aqua, P.white, 0.5));
    } else if (v === 'dogbed') {
      p.ellipse(9, 20, 8, 5, P.maroon);
      p.ellipse(9, 19, 6, 3, mix(P.peach, P.white, 0.4));
      p.rect(4, 17, 4, 2, P.white); // a bone toy
      p.rect(10, 16, 3, 3, P.leafYoung); // a ball
      p.rect(13, 19, 3, 2, P.white); // a work glove
      p.set(7, 19, P.steel);
    }
  },
});

// ---------------------------------------------------------------- moving things

furn('katori', {
  w: 12,
  h: 12,
  cx: 8,
  base: 14,
  paint(p) {
    // the mosquito-coil pig
    p.ellipse(6, 7, 5, 4, mix(P.concrete, P.steel, 0.3));
    p.ellipse(6, 7, 3, 2.5, P.charcoal);
    p.ellipse(6, 7, 2, 1.5, P.leafShade);
    p.set(1, 5, P.concreteLt);
    p.set(10, 9, P.steel);
  },
  extra() {
    return {
      over(g: Gfx, x: number, y: number, env: PropEnv) {
        // the smoke: a thin curl rising and bending
        const t = env.t / 1000;
        for (let k = 0; k < 14; k++) {
          const yy = y + 4 - k * 2;
          const xx = x + 8 + Math.round(Math.sin(t * 1.6 + k * 0.45) * (1 + k * 0.25));
          g.rect(xx, yy, 1, 2, '#E8E4D8', Math.max(0, 0.55 - k * 0.035));
        }
      },
      glow(g: Gfx, x: number, y: number, env: PropEnv) {
        g.rect(x + 8, y + 7, 1, 1, '#FF6A4D', 0.7 + 0.3 * Math.sin(env.t / 300));
      },
    };
  },
});

furn('senpuki', {
  w: 16,
  h: 28,
  paint(p) {
    p.rect(6, 14, 3, 11, P.concreteLt);
    p.ellipse(8, 25, 6, 2, P.concrete);
  },
  extra(o) {
    return {
      over(g: Gfx, x: number, y: number, env: PropEnv) {
        // the head swings (left on) and the blades turn
        const sw = o.on ? Math.round(Math.sin(env.t / 1800) * 2) : 0;
        const cx = x + 8 + sw;
        const cy = y - 6;
        g.circle(cx, cy, 6, '#3A3F48');
        g.ring(cx, cy, 6, '#E8E4D8');
        const a0 = o.on ? env.t / 40 : 0;
        for (let k = 0; k < 3; k++) {
          const a = a0 + (k / 3) * Math.PI * 2;
          g.line(cx, cy, Math.round(cx + Math.cos(a) * 5), Math.round(cy + Math.sin(a) * 5), '#7FD1E8');
        }
        g.rect(cx, cy, 1, 1, '#F4F1E8');
      },
    };
  },
});

furn('kingyo', {
  w: 16,
  h: 22,
  paint(p) {
    blk(p, 0, 14, 16, 8, P.wood);
    p.ellipse(8, 9, 6, 5, mix(P.aqua, P.white, 0.45));
    p.ellipse(8, 10, 5, 4, mix(P.aqua, P.blue, 0.2));
    p.hline(3, 12, 5, P.white);
    p.set(5, 13, P.leaf);
  },
  extra() {
    return {
      over(g: Gfx, x: number, y: number, env: PropEnv) {
        for (let k = 0; k < 2; k++) {
          const t = env.t / (1400 + k * 500) + k * 2;
          const fx = x + 8 + Math.round(Math.sin(t) * 3);
          const fy = y + 4 + Math.round(Math.sin(t * 1.7) * 1.5) + k;
          g.rect(fx, fy, 2, 1, k ? '#E84E3C' : '#F2894B');
          g.rect(fx + (Math.cos(t) > 0 ? -1 : 2), fy, 1, 1, '#FF6A4D', 0.7);
        }
      },
    };
  },
});

/** The wind-bell at a window (flat on the wall; tile x of the window's first tile). */
registerProp('prop_hr_furin', () => {
  const a: PropArt = {
    ox: 0,
    oy: 0,
    w: 16,
    h: 16,
    foot: 0,
    flat: true,
    img: () => null,
    over(g: Gfx, x: number, y: number, env: PropEnv) {
      const s = Math.sin(env.t / 700) + 0.4 * Math.sin(env.t / 310);
      const bx = x + 8;
      const by = y + 12;
      g.rect(bx, by - 3, 1, 3, '#9AA0A8');
      g.rect(bx - 2, by, 5, 3, '#BDEFFA', 0.9);
      g.rect(bx - 2, by, 5, 1, '#F4F1E8');
      // the paper strip: swinging, or from h2 drawn up the wall toward the hill (the north), still
      const up = hs(env) === 2;
      const sx = bx + (up ? 0 : Math.round(s * 1.5));
      if (up) g.rect(sx, by - 8, 2, 5, '#E23B2E', 0.9);
      else {
        g.rect(bx, by + 3, 1, 2, '#F4F1E8');
        g.rect(sx, by + 5, 2, 5, '#E23B2E', 0.9);
      }
    },
  } as PropArt;
  return a;
});

/** A ceiling lamp (the ring fluorescent with its pull cord, or a bare bulb): foreground, and its pool. */
registerProp('prop_hr_lamp', (o) => {
  const kind = String(o.kind ?? 'ring');
  const on = o.on !== false;
  const r = Number(o.r ?? 70);
  // hung from the ceiling on a long cord: the shade floats over the room's middle
  const p = new PixelCanvas(24, 44);
  if (kind === 'bulb') {
    p.vline(12, 0, 34, P.charcoal);
    p.rect(10, 34, 5, 3, P.steel);
    p.ellipse(12, 39, 3, 3, on ? P.goldPale : P.concrete);
    p.set(11, 38, on ? P.white : P.concreteLt);
  } else {
    // the ring fluorescent's shade (seen from below and aside) and its pull cord
    p.vline(12, 0, 28, P.charcoal);
    p.rect(9, 28, 7, 2, P.steel);
    p.ellipse(12, 33, 10, 3, P.concrete);
    p.hline(3, 21, 31, P.concreteLt);
    p.ellipse(12, 34, 8, 2, on ? P.white : P.concreteLt);
    p.hline(5, 19, 36, P.steel);
    p.vline(19, 36, 43, P.steel);
    p.set(19, 43, P.brass);
  }
  const img = p.toCanvas();
  // anchored two rows below what it hangs over (the table): dx shifts it to a 2-tile table's middle
  const dx = Number(o.dx ?? 0);
  return {
    ox: -4 + dx,
    oy: -64,
    w: 0,
    h: 0,
    foot: 0,
    flat: true,
    img: () => null,
    fg: [{ ox: -4 + dx, oy: -64, img: () => img }],
    moths: on ? { x: 8 + dx, y: -30, r: 12 } : undefined,
    glow(g: Gfx, x: number, y: number) {
      if (!on) return;
      if (kind === 'bulb') g.rect(x + 6 + dx, y - 27, 4, 3, '#FFF6D8', 0.9);
      else g.rect(x + 1 + dx, y - 30, 15, 1, '#FFF6D8', 0.85);
    },
    light(g: Gfx, x: number, y: number) {
      if (!on) return;
      drawLight(g, poolEllipse(r, Math.round(r * 0.6), kind === 'bulb' ? HLIGHT.warm : HLIGHT.bulb), x + 8 + dx, y - 22, 0.3);
    },
  } as PropArt;
});

/** The pendulum clock on the wall, stopped at 4:59 (flat on the wall's tile). */
registerProp('prop_hr_clock', () => {
  const p = new PixelCanvas(14, 26);
  p.rect(0, 0, 14, 26, P.woodDark);
  p.hline(0, 13, 0, P.wood);
  p.circle(7, 7, 5, P.paper);
  p.ring(7, 7, 5, 5, P.brassOld);
  // 4:59 — the long hand just short of 12, the short one near 5
  p.line(7, 7, 7, 3, P.ink);
  p.line(7, 7, 9, 10, P.ink);
  p.rect(2, 14, 10, 10, P.night);
  p.vline(7, 14, 21, P.brassOld);
  p.circle(7, 21, 2, P.brass);
  const img = p.toCanvas();
  return {
    ox: 1,
    oy: 4,
    w: 14,
    h: 26,
    foot: 0,
    flat: true,
    img: () => img,
    over(g: Gfx, x: number, y: number, env: PropEnv) {
      // from h2 the second hand tries to go on and falls back (every 1.1 s)
      if (hs(env) !== 2) return;
      const k = Math.floor(env.t / 1100) % 3 === 2;
      g.rect(x + 8, y + 5, 1, k ? 3 : 4, '#E23B2E', 0.9);
    },
  } as PropArt;
});

/** A shaft of the night through a gap (shutters, the shop's pass door): a line of light on the floor and its dust. */
registerProp('prop_hr_shaft', (o) => {
  const w = Number(o.w ?? 2) * 16;
  const h = Number(o.h ?? 3) * 16;
  return {
    ox: 0,
    oy: 0,
    w,
    h,
    foot: 0,
    flat: true,
    img: () => null,
    over(g: Gfx, x: number, y: number, env: PropEnv) {
      const sh = Number(o.shear ?? 0.4);
      for (let j = 0; j < h; j++) g.rect(x + Math.round(j * sh), y + j, 2, 1, '#B8B4E0', 0.16 * (1 - j / h));
      const t = env.t / 1000;
      for (let k = 0; k < 6; k++) {
        const jj = (k * 23 + t * 6 * (1 + (k % 3) * 0.3)) % h;
        const xx = x + Math.round(jj * sh) + Math.round(Math.sin(t + k) * 3);
        g.rect(xx, y + Math.round(jj), 1, 1, '#E8E4D8', 0.45);
      }
    },
    light(g: Gfx, x: number, y: number) {
      const sh = Number(o.shear ?? 0.4);
      drawLight(g, poolEllipse(10, Math.round(h / 3), '120,120,170'), x + Math.round((h / 2) * sh), y + h / 2, 0.25);
    },
  } as PropArt;
});

/** A small light of its own (the gym's exit sign): an emissive dot and its pool. */
registerProp('prop_hr_glow', (o) => {
  const lx = Number(o.x ?? 8);
  const ly = Number(o.y ?? 8);
  const rgb = String(o.rgb ?? HLIGHT.warm);
  const c = String(o.c ?? '#FFE7A3');
  return {
    ox: 0,
    oy: 0,
    w: 16,
    h: 16,
    foot: 0,
    flat: true,
    img: () => null,
    glow(g: Gfx, x: number, y: number) {
      g.rect(x + lx - 3, y + ly - 1, 8, 3, c, 0.55);
    },
    light(g: Gfx, x: number, y: number) {
      drawLight(g, poolEllipse(34, 26, rgb), x + lx, y + ly + 20, 0.3);
    },
  } as PropArt;
});

// ---------------------------------------------------------------- the empty house, the shop, the store, the gym

furn('cloth', {
  w: 32,
  h: 30,
  cx: 16,
  paint(p, o) {
    // furniture under a white dust sheet (a chest; or a low table and chairs)
    const tall = o.v !== 'low';
    const top = tall ? 2 : 12;
    for (let j = top; j < 30; j++)
      for (let i = 1; i < 31; i++) {
        const edge = j > 26 ? (i + j) % 3 === 0 : false;
        if (edge) continue;
        const f = (i + Math.floor(j / 3)) % 7;
        p.set(i, j, f === 0 ? P.concrete : f < 3 ? P.white : P.concreteLt);
      }
    p.hline(1, 30, top, P.white);
  },
});

furn('pillar', {
  w: 12,
  h: 48,
  cx: 8,
  paint(p) {
    // the big post, the pencil lines of heights (まさと 6さい … 12さい)
    blk(p, 2, 0, 9, 48, P.wood);
    p.vline(3, 1, 47, P.woodLt);
    for (let k = 0; k < 7; k++) {
      const y = 38 - k * 3;
      p.hline(4, 9, y, P.ink);
      p.set(10, y, P.charcoal);
    }
    p.rect(4, 12, 5, 4, P.white); // the ward's note pinned on it
    p.set(6, 12, P.red);
  },
});

furn('freezer', {
  w: 32,
  h: 24,
  cx: 16,
  paint(p) {
    blk(p, 0, 6, 32, 18, P.white);
    p.rect(2, 2, 28, 6, mix(P.aqua, P.white, 0.45)); // the sliding glass lid
    p.hline(2, 29, 2, P.white);
    p.vline(16, 2, 7, P.concrete);
    p.rect(4, 12, 24, 6, P.blue);
    p.hline(6, 25, 14, P.white);
    p.set(28, 20, P.charcoal); // the plug, pulled
  },
});

furn('counter', {
  w: 32,
  h: 30,
  cx: 16,
  paint(p) {
    blk(p, 0, 12, 32, 18, P.wood);
    p.hline(0, 31, 12, P.woodLt);
    p.rect(2, 13, 28, 2, P.woodLt);
    // the old register and the abacus
    blk(p, 4, 2, 13, 11, P.steel);
    p.rect(6, 4, 8, 3, P.ink);
    p.rect(7, 5, 4, 1, P.leaf);
    for (let i = 5; i < 16; i += 2) p.set(i, 9, P.concreteLt);
    p.rect(20, 8, 10, 4, P.woodDark);
    for (let i = 21; i < 29; i += 2) p.set(i, 9, P.woodLt);
  },
});

furn('pump', {
  w: 44,
  h: 30,
  cx: 24,
  paint(p) {
    // the hand-drawn fire pump: red body, brass, two wheels, the shafts
    blk(p, 6, 6, 26, 14, P.verm);
    p.hline(6, 31, 6, P.vermLt);
    p.rect(12, 2, 8, 5, P.brass);
    p.hline(12, 19, 2, P.goldPale);
    p.rect(24, 9, 6, 6, P.charcoal);
    p.set(25, 10, P.white);
    for (const wx of [10, 28]) {
      p.circle(wx, 22, 7, P.ink);
      p.circle(wx, 22, 5, P.charcoal);
      p.set(wx, 22, P.steel);
      p.line(wx - 4, 22, wx + 4, 22, P.asphalt);
    }
    p.line(32, 12, 43, 16, P.woodLt);
    p.line(32, 14, 43, 18, P.woodLt);
    fontTextSmall(p, '星', 8, 8, P.white);
  },
});

furn('stage', {
  w: 160,
  h: 18,
  cx: 80,
  paint(p) {
    // the stage's front (10 tiles): boards, the step at its west end
    p.rect(0, 0, 160, 14, P.woodLt);
    p.hline(0, 159, 0, P.goldPale);
    for (let i = 0; i < 160; i += 12) p.vline(i, 1, 13, P.wood);
    p.rect(0, 14, 160, 4, P.woodDark);
    p.rect(4, 6, 20, 8, P.wood); // the drawer under the stage
    p.hline(4, 23, 6, P.woodLt);
    p.rect(12, 9, 4, 1, P.brass);
  },
});

furn('chairs', {
  w: 18,
  h: 34,
  paint(p) {
    for (let k = 0; k < 6; k++) {
      const y = 4 + k * 4;
      p.rect(1, y, 15, 3, P.steel);
      p.hline(1, 15, y, P.concreteLt);
      p.rect(2, y + 1, 13, 1, P.navy);
    }
    p.vline(2, 4, 33, P.asphalt);
    p.vline(14, 4, 33, P.asphalt);
  },
});

furn('ballcage', {
  w: 20,
  h: 24,
  cx: 8,
  paint(p) {
    p.strokeRect(1, 4, 18, 18, P.steel);
    for (let i = 4; i < 19; i += 3) p.vline(i, 5, 21, P.asphalt);
    p.circle(6, 16, 4, P.white);
    p.circle(13, 17, 4, mix(P.white, P.red, 0.4));
    p.set(5, 14, P.concrete);
    p.circle(3, 23, 1, P.charcoal);
    p.circle(17, 23, 1, P.charcoal);
  },
});

// ---------------------------------------------------------------- the compost, the greenhouse

furn('heap', {
  w: 44,
  h: 26,
  cx: 24,
  base: 32,
  paint(p) {
    for (let j = 0; j < 22; j++) {
      const hw = Math.round(6 + j * 0.9);
      for (let i = -hw; i <= hw; i++) {
        const n = h01(i + 22, j, 7501);
        p.set(22 + i, 4 + j, n < 0.15 ? mix(P.wood, P.woodLt, 0.4) : n < 0.6 ? P.woodDark : mix(P.woodDark, P.ink, 0.4));
      }
    }
    for (let i = 0; i < 12; i++) p.set(16 + i, 4 + (i % 2), P.brassOld); // straw on the top
  },
  extra() {
    return {
      over(g: Gfx, x: number, y: number, env: PropEnv) {
        // the heap's warm breath, rising slowly
        const t = env.t / 1000;
        for (let k = 0; k < 7; k++) {
          const ph = (t * 0.35 + k / 7) % 1;
          const xx = x + 2 + ((k * 7) % 20) + Math.round(Math.sin(t + k) * 2);
          g.rect(xx, y - 8 - Math.round(ph * 20), 1, 1, '#F4F1E8', 0.28 * (1 - ph));
        }
      },
    };
  },
});

/** The bumblebee that crawls out on the hive's landing board now and then (2号ハウス). */
registerProp('prop_hr_bee', () => ({
  ox: 0,
  oy: 0,
  w: 16,
  h: 16,
  foot: 12,
  img: () => null,
  over(g: Gfx, x: number, y: number, env: PropEnv) {
    const ph = (env.t % 9000) / 9000;
    if (ph > 0.35) return;
    const k = ph / 0.35;
    const bx = x + 4 + Math.round(Math.sin(k * Math.PI) * 5);
    g.rect(bx, y + 8, 2, 1, '#FFD23F');
    g.rect(bx + 1, y + 8, 1, 1, '#2A2440');
  },
}));

void outline;
