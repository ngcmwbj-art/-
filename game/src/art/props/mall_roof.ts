// 屋上 ゆうやけひろば (map_mall_roof, 30_level_art 5.6, 24×15; ★2026-09-28).
//
// A rooftop playground closed for a year, at 17:00 of stage 2: over the north
// fence the dusk (lilac, rose, the last orange low in the west) and the far
// hills with a few roofs; the stair house in the north-west with its
// 『ようこそ ゆうやけひろば』 board (the よ has fallen onto the deck); the
// little stage of カネナリくん's handshake event (red carpet, 紅白幕, the
// backdrop, a mic stand with no mic, bunting, two drooping bell balloons);
// the name book on a table beside it; three pipe chairs (one turned away);
// the queue line taped all the way down to a 『最後尾』 placard; two panda
// cars on the faded turf (one 故障中, staring at the other); a coin binocular
// at the east fence; the FRP water tank; the skylight over M4; two air-con
// units by the south parapet, their fans turned by the wind.
//
// The runtime state the scenes drive (roofRt): the panda ride (Minato sits on
// it; it goes 1 m and comes back), the clasped hands of the handshake, the
// view through the binocular (drawScopeView, 10_narrative 7.18).

import type { Gfx } from '../../engine/gfx';
import { PixelCanvas } from '../../engine/pixel';
import { h01, ihash, valueNoise } from '../tiles/noise';
import { P } from '../tiles/palette';
import { castRight, dk, finish, lightRect, lt, outline, shadeRect } from './kit';
import { mkFrames, stand } from './pkit';
import { registerProp } from './registry';
import { drain, moss, puddleMark } from './roofkit';
import { fontText, fontTextSmall, tiny } from './text';
import type { PropArt, PropEnv } from './types';
import { charSprite, idleFrame } from '../chars';

const W = 24 * 16;
const H = 15 * 16;

// ---------------------------------------------------------------- runtime state (events/mall_roof.ts)

export const roofRt = {
  /** The panda car's ride: started at world time t0 (ms); Minato (sprite) sits on it. */
  ride: null as null | { t0: number; sprite: string },
  /** The handshake: clasped hands at world px (x, y), shaken from t0. */
  clasp: null as null | { x: number; y: number; t0: number },
};

/** The ride's timeline (ms): on, 1 m forward, a stop, 1 m back, off. */
export const RIDE = { on: 260, go: 1250, hold: 320, back: 1250, off: 3200 };

/** How far (px) the ridden panda is from its place at `u` ms into the ride. */
function rideOffset(u: number): number {
  const e = (k: number) => 0.5 - Math.cos(Math.PI * Math.max(0, Math.min(1, k))) / 2;
  if (u < RIDE.on) return 0;
  if (u < RIDE.on + RIDE.go) return 16 * e((u - RIDE.on) / RIDE.go);
  if (u < RIDE.on + RIDE.go + RIDE.hold) return 16;
  return 16 * (1 - e((u - RIDE.on - RIDE.go - RIDE.hold) / RIDE.back));
}

// ---------------------------------------------------------------- small helpers

/** Ordered dither pick between two colours by a 0..1 amount. */
function dith(x: number, y: number, t: number, a: string, b: string): string {
  const m = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5][(y & 3) * 4 + (x & 3)] / 16;
  return t > m ? b : a;
}

/** A deflated bell balloon (the one in the parking lot's hedge, 30 3.5), face turned to `look` (−1 left, 1 right). */
function balloonHusk(look: -1 | 1): HTMLCanvasElement {
  const p = new PixelCanvas(12, 12);
  // a wrinkled, sagging bag hanging from its string
  p.ellipse(6, 7, 4, 3.5, P.gold);
  p.set(2, 8, P.brass);
  p.hline(3, 9, 10, P.brass);
  p.set(4, 5, P.goldPale);
  p.set(5, 4, P.goldPale);
  // the crease where it has gone soft
  p.line(7, 5, 9, 8, P.brass);
  // the bell face, looking toward the stage
  const fx = 6 + look;
  p.set(fx - 1, 7, P.ink);
  p.set(fx + 1, 7, P.ink);
  p.hline(fx - 1, fx, 9, P.brassOld);
  // knot and string
  p.set(6, 3, P.brassOld);
  p.vline(6, 0, 2, P.white);
  outline(p, { soft: true });
  return p.toCanvas();
}
const HUSK = { l: balloonHusk(-1), r: balloonHusk(1) };

/** Sway of a hanging thing: −1/0/1 px, slow (the wind of stage 2). */
function sway(env: PropEnv, seed: number, ms = 900): number {
  return Math.round(Math.sin(env.mt / ms + seed * 2.1) * 1.2);
}

// ================================================================ the shell (whole map, flat)

/** The dusk over the north fence (stage 2's sky, 7.3), the far hills and roofs. */
function paintView(p: PixelCanvas): void {
  const bands: [number, string][] = [
    [0, P.lilac],
    [5, P.peach],
    [9, P.crimson],
    [13, P.sun],
    [16, P.sky],
    [19, P.horizon],
  ];
  for (let y = 0; y < 26; y++)
    for (let x = 0; x < W; x++) {
      const west = 1 - x / W;
      const v = y + west * 3.5 - (x > 250 ? ((x - 250) / 134) * 2 : 0);
      let i = 0;
      while (i < bands.length - 1 && v >= bands[i + 1][0]) i++;
      let c = bands[i][1];
      // dither the last 1.5 rows into the next band
      if (i < bands.length - 1) {
        const d = bands[i + 1][0] - v;
        if (d < 1.5) c = dith(x, y, 1 - d / 1.5, c, bands[i + 1][1]);
      }
      // the east is already going to night
      if (x > 250 && h01(x, y, 5611) < ((x - 250) / 134) * 0.55) c = dk(c);
      p.set(x, y, c);
    }
  // long thin clouds, lit from below in the west
  const cloud = (x0: number, y0: number, len: number, lit: string) => {
    for (let i = 0; i < len; i++) {
      const edge = i < 3 || i > len - 4;
      if (edge && (i & 1)) continue;
      p.set(x0 + i, y0, lit);
      if (!edge) p.set(x0 + i, y0 + 1, P.sunShade);
    }
  };
  cloud(28, 8, 54, P.sky);
  cloud(60, 5, 22, P.horizon);
  cloud(166, 4, 38, P.peach);
  cloud(300, 7, 46, P.peach);
  // the far hills
  for (let x = 0; x < W; x++) {
    const top = Math.round(17 + 2 * Math.sin(x / 41 + 0.7) + 1.2 * Math.sin(x / 17) - (x > 290 ? (x - 290) / 40 : 0));
    const far = x > 260 ? P.shadeDeep : P.shade;
    for (let y = top; y < 26; y++) p.set(x, y, y === top ? (x < 200 ? P.lilac : far) : far);
  }
  // the roofs on this side of the hills (north of the mall): blocks, gables, a few lit windows
  let x = 0;
  let k = 0;
  while (x < W) {
    const hh = ihash(k, 3, 5621);
    const w = 8 + (hh % 17);
    const h = 2 + ((hh >>> 5) % 4);
    const top = 25 - h;
    const body = x > 270 ? P.nightShade : P.shadeDeep;
    for (let i = 0; i < w && x + i < W; i++)
      for (let y = top; y < 26; y++) p.set(x + i, y, y === top ? P.shade : body);
    if ((hh >>> 9) % 3 === 0) {
      // a gable
      for (let s = 1; s <= Math.min(4, w >> 1); s++) p.hline(x + s, x + w - 1 - s, top - s, s === 1 ? body : body);
      for (let s = 1; s <= Math.min(4, w >> 1); s++) p.set(x + s, top - s, P.shade);
    }
    for (let q = 0; q < 2; q++) {
      const wx = x + 2 + ((hh >>> (12 + q * 4)) % Math.max(1, w - 4));
      const wy = top + 2 + ((hh >>> (20 + q)) & 1);
      if (((hh >>> (24 + q)) & 3) === 0 && wy < 25) p.set(wx, wy, P.goldPale);
    }
    x += w + ((hh >>> 27) % 3);
    k++;
  }
  // a pylon and the wires on the hill, a water tower to the east
  for (let y = 4; y < 20; y++) {
    const half = Math.round((y - 4) / 5);
    p.set(58 - half, y, P.shadeDeep);
    p.set(58 + half, y, P.shadeDeep);
    if (y % 4 === 0) p.hline(58 - half, 58 + half, y, P.shadeDeep);
  }
  p.hline(55, 61, 7, P.shadeDeep);
  for (let i = 0; i < 90; i++) {
    const sag = Math.round(Math.sin((i / 90) * Math.PI) * 3);
    p.set(61 + i, 7 + sag, P.shade);
  }
  p.rect(331, 13, 7, 5, P.nightShade);
  p.vline(332, 18, 23, P.nightShade);
  p.vline(336, 18, 23, P.nightShade);
  p.hline(331, 337, 13, P.shade);
}

/** The fence on the north parapet: a top rail, posts every 32 px, the diamond mesh over the view. */
function paintNorthFence(p: PixelCanvas): void {
  for (let y = 4; y < 22; y++)
    for (let x = 0; x < W; x++) {
      const d1 = (((x + y) % 8) + 8) % 8 === 0;
      const d2 = (((x - y) % 8) + 8) % 8 === 0;
      if (d1 && d2) p.set(x, y, P.concreteLt);
      else if ((d1 || d2) && (x & 1) === 0) p.set(x, y, P.steel);
    }
  p.hline(0, W - 1, 2, P.concreteLt);
  p.hline(0, W - 1, 3, P.steel);
  p.hline(0, W - 1, 22, P.steel);
  for (let x = 6; x < W; x += 32) {
    p.vline(x, 1, 25, P.concreteLt);
    p.vline(x + 1, 1, 25, P.steel);
    p.set(x, 0, P.steel);
    p.set(x + 1, 0, P.asphalt);
  }
}

/** Coping and inner face of the parapets (N, W, E, S), the outer wall below the south one. */
function paintParapets(p: PixelCanvas): void {
  // north: coping top (24–26), its lip, the inner face down to the deck (27–31)
  for (let x = 0; x < W; x++) {
    p.set(x, 24, P.concreteLt);
    p.set(x, 25, P.concrete);
    p.set(x, 26, h01(x, 26, 5631) < 0.1 ? P.steel : P.concrete);
    p.set(x, 27, P.steel);
    for (let y = 28; y < 32; y++) p.set(x, y, y === 31 ? P.steel : h01(x, 5, 5633) < 0.12 && y < 31 ? P.steel : P.concrete);
  }
  // west (0–15): the drop, the lit outer lip, the coping, the shaded inner face
  // east (368–383): mirrored, its inner face turned to the setting sun
  for (let y = 24; y < H; y++) {
    const cop = (x: number) => (h01(x, y, 5641) < 0.08 ? P.steel : P.concrete);
    p.set(0, y, P.nightShade);
    p.set(1, y, P.shadeDeep);
    p.set(2, y, P.concreteLt);
    for (let x = 3; x < 11; x++) p.set(x, y, cop(x));
    p.set(11, y, P.steel);
    p.set(12, y, P.steel);
    p.set(13, y, P.asphalt);
    p.set(14, y, P.asphalt);
    p.set(15, y, P.charcoal);
    p.set(W - 1, y, P.nightShade);
    p.set(W - 2, y, P.shadeDeep);
    p.set(W - 3, y, P.steel);
    for (let x = W - 11; x < W - 3; x++) p.set(x, y, cop(x));
    p.set(W - 12, y, P.concreteLt);
    p.set(W - 13, y, P.concreteLt);
    p.set(W - 14, y, P.concrete);
    p.set(W - 15, y, P.concrete);
    p.set(W - 16, y, P.steel);
  }
  // the fence rails along the side copings, with a post every 32 px
  for (let y = 24; y < H - 12; y++) {
    p.set(6, y, P.steel);
    p.set(7, y, P.concreteLt);
    p.set(W - 8, y, P.steel);
    p.set(W - 7, y, P.concreteLt);
    if ((y - 40) % 32 === 0)
      for (const px of [5, W - 9]) {
        p.rect(px, y, 4, 3, P.concreteLt);
        p.hline(px, px + 3, y + 2, P.steel);
        p.set(px + 3, y + 1, P.steel);
      }
  }
  // south (224–239): the deck's last shadow, the coping top, the outside wall going down
  for (let x = 0; x < W; x++) {
    p.set(x, 226, P.concreteLt);
    for (let y = 227; y < 232; y++) p.set(x, y, h01(x, y, 5651) < 0.07 ? P.steel : P.concrete);
    p.set(x, 232, P.steel);
    for (let y = 233; y < H; y++) {
      const t = (y - 233) / 7;
      let c = dith(x, y, t * 0.8, P.steel, P.asphalt);
      if (ihash(x, 0, 5653) % 11 === 0 && y < 238) c = P.asphalt;
      p.set(x, y, c);
    }
  }
  // the corners where the side copings meet the south one
  for (let y = 224; y < 233; y++) {
    for (let x = 0; x < 16; x++) if (y >= 226) p.set(x, y, y === 226 && x > 1 ? P.concreteLt : x < 2 ? P.shadeDeep : P.concrete);
    for (let x = W - 16; x < W; x++) if (y >= 226) p.set(x, y, y === 226 && x < W - 2 ? P.concreteLt : x >= W - 2 ? P.shadeDeep : P.concrete);
  }
}

/** The deck: protective concrete in 3-tile panels with sealed joints, quietly weathered. */
function paintDeck(p: PixelCanvas): void {
  const x0 = 16;
  const y0 = 32;
  const x1 = W - 16;
  const y1 = 224;
  for (let y = y0; y < y1; y++)
    for (let x = x0; x < x1; x++) {
      const px = Math.floor((x - x0 + 8) / 48);
      const py = Math.floor((y - y0 + 18) / 48);
      const tone = ihash(px, py, 5663) % 4;
      const hh = h01(x, y, 5665);
      let c: string = P.concrete;
      // each panel its own tone: a fine lighter grain, a plain one, a dirtier one
      if (tone === 0) c = dith(x, y, 0.22, P.concrete, P.concreteLt);
      else if (tone === 3) c = dith(x, y, 0.1, P.concrete, P.steel);
      // the grain of the concrete
      if (hh < 0.035) c = P.concreteLt;
      else if (hh > 0.965) c = P.steel;
      // joints (sealant, cracked open here and there) with the lit edge beside them
      const jx = (x - x0 + 8) % 48;
      const jy = (y - y0 + 18) % 48;
      if (jx === 47 || jy === 47) c = h01(x, y, 5667) < 0.12 ? P.concrete : P.asphalt;
      else if (jx === 0 || jy === 0) c = P.concreteLt;
      p.set(x, y, c);
    }
  // hairline cracks
  for (let k = 0; k < 22; k++) {
    let cx = x0 + 6 + (ihash(k, 1, 5671) % (x1 - x0 - 12));
    let cy = y0 + 6 + (ihash(k, 2, 5671) % (y1 - y0 - 12));
    const len = 5 + (ihash(k, 3, 5671) % 9);
    for (let s = 0; s < len; s++) {
      p.set(cx, cy, P.steel);
      const r = ihash(k, s, 5673) % 4;
      cx += r === 0 ? -1 : r === 1 ? 1 : 0;
      cy += r >= 2 ? 1 : 0;
    }
  }
  // the parapets' shadow on the deck (north 2 rows, the sides 2 columns, the south row)
  shadeRect(p, x0, y0, x1 - x0, 1, 2);
  shadeRect(p, x0, y0 + 1, x1 - x0, 2, 1);
  shadeRect(p, x0, y0, 2, y1 - y0, 1);
  shadeRect(p, x1 - 1, y0, 1, y1 - y0, 1);
  shadeRect(p, x0, y1 - 2, x1 - x0, 2, 1);
  // rain streaks under the north parapet
  for (let x = x0 + 2; x < x1 - 2; x++) {
    const hh = ihash(x, 7, 5675);
    if (hh % 9) continue;
    const len = 3 + ((hh >>> 8) % 6);
    for (let j = 0; j < len; j++) if (j < 2 || (hh >>> (10 + j)) & 1) shadeRect(p, x, y0 + 3 + j, 1, 1, 1);
  }
}

/** The faded artificial turf of the kids' corner (tiles x1–5, y5–11), worn under the pandas. */
function paintTurf(p: PixelCanvas): void {
  const x0 = 16;
  const y0 = 80;
  const x1 = 96;
  const y1 = 192;
  // worn to the backing where the pandas stood and where the children came in
  const bald: [number, number, number, number][] = [
    [32, 108, 15, 5],
    [64, 156, 15, 5],
    [90, 134, 6, 10],
  ];
  for (let y = y0; y < y1; y++)
    for (let x = x0; x < x1; x++) {
      // sun-bleached toward the west (the afternoons), a knit of lighter tips
      const fade = Math.max(0, Math.min(1, (x1 - x) / 70 - 0.25 + (valueNoise(x / 26, y / 22, 5681) - 0.5) * 0.5));
      let c: string = dith(x, y, fade * 0.7, P.leafDeep, P.leaf);
      const tip = (x + 2 * (y % 2)) % 4 === 0 && y % 2 === 0;
      if (tip) c = fade > 0.55 ? P.leafYoung : P.leaf;
      else if ((x + y) % 4 === 2 && y % 2 === 1) c = P.leafShade;
      for (const [bx, by, rx, ry] of bald) {
        const d = ((x - bx) / rx) ** 2 + ((y - by) / ry) ** 2;
        if (d < 1) c = dith(x, y, 1 - d, c, d < 0.4 ? P.asphalt : P.leafShade);
      }
      p.set(x, y, c);
    }
  // the mat's binding tape (worn white) and its shadow on the concrete
  for (let x = x0; x < x1 + 1; x++) {
    p.set(x, y0, P.concreteLt);
    p.set(x, y1, P.concrete);
    p.set(x, y1 + 1, P.steel);
  }
  for (let y = y0; y < y1 + 1; y++) {
    p.set(x1, y, P.concreteLt);
    p.set(x1 + 1, y, P.steel);
  }
}

/** The queue line (yellow tape, peeled here and there) from the stage down to the 『最後尾』 placard. */
const QUEUE: [number, number][] = [
  [200, 66],
  [200, 128],
  [152, 128],
  [152, 160],
  [200, 160],
  [200, 200],
];
function paintQueue(p: PixelCanvas): void {
  let run = 0;
  for (let s = 0; s < QUEUE.length - 1; s++) {
    const [ax, ay] = QUEUE[s];
    const [bx, by] = QUEUE[s + 1];
    const n = Math.max(Math.abs(bx - ax), Math.abs(by - ay));
    const sx = Math.sign(bx - ax);
    const sy = Math.sign(by - ay);
    for (let i = 0; i <= n; i++) {
      run++;
      const x = ax + sx * i;
      const y = ay + sy * i;
      // peeled: a gap now and then, and the tape gone dull in the sun
      const hh = ihash(run, 1, 5691);
      if (hh % 23 === 0 || (run % 37 > 33)) continue;
      const c = hh % 5 === 0 ? P.brass : P.goldPale;
      if (sy) {
        p.set(x, y, c);
        p.set(x + 1, y, P.brass);
      } else {
        p.set(x, y, c);
        p.set(x, y + 1, P.brass);
      }
      // arrows printed on it, toward the stage
      if (run % 28 === 14) {
        if (sy) {
          const d = -sy;
          p.set(x - 1, y + d, P.brassOld);
          p.set(x + 2, y + d, P.brassOld);
        } else {
          const d = -sx;
          p.set(x + d, y - 1, P.brassOld);
          p.set(x + d, y + 2, P.brassOld);
        }
      }
    }
  }
}

/** けんけんぱ in faded white paint (x 292–352, y 184–212). */
function paintHopscotch(p: PixelCanvas): void {
  const paint = (x: number, y: number) => {
    if (h01(x, y, 5701) < 0.1) return;
    p.set(x, y, h01(x, y, 5703) < 0.6 ? P.white : P.concreteLt);
  };
  const sq = (x: number, y: number, s: number) => {
    for (let i = 0; i <= s; i++) {
      paint(x + i, y);
      paint(x + i, y + s);
      paint(x, y + i);
      paint(x + s, y + i);
    }
  };
  // 1 | 2 | 3/4 | 5 | 6/7 | (the round end)
  const S = 12;
  let x = 288;
  const cy = 192;
  sq(x, cy, S);
  x += S;
  sq(x, cy, S);
  x += S;
  sq(x, cy - 6, S);
  sq(x, cy + 6, S);
  x += S;
  sq(x, cy, S);
  x += S;
  sq(x, cy - 6, S);
  sq(x, cy + 6, S);
  x += S;
  for (let a = -Math.PI / 2; a <= Math.PI / 2; a += 0.12) paint(x + Math.round(Math.cos(a) * 7), cy + 5 + Math.round(Math.sin(a) * 9));
  // the numbers, half gone
  const nums: [string, number, number][] = [['1', 293, 196], ['2', 305, 196], ['3', 317, 190], ['4', 317, 202], ['5', 329, 196], ['6', 341, 190], ['7', 341, 202]];
  for (const [t, nx, ny] of nums) tiny(p, t, nx, ny, P.concreteLt);
}

registerProp('mall_roof_shell', () => {
  const p = new PixelCanvas(W, H);
  paintView(p);
  paintNorthFence(p);
  paintParapets(p);
  paintDeck(p);
  paintTurf(p);
  paintQueue(p);
  paintHopscotch(p);
  // drains in the corners, damp and mossy in the south-west one
  drain(p, 22, 214, 5711);
  moss(p, 20, 216, 4, 5713);
  drain(p, 356, 214, 5715);
  drain(p, 356, 36, 5717);
  puddleMark(p, 248, 150, 12, 5, 5719);
  puddleMark(p, 118, 58, 9, 4, 5721);
  puddleMark(p, 330, 118, 7, 3, 5723);
  // confetti left from the event, gone pale, around the stage
  for (let k = 0; k < 44; k++) {
    const hh = ihash(k, 9, 5725);
    const cx = 124 + (hh % 150);
    const cy = 66 + ((hh >>> 8) % 38);
    const c = [P.verm, P.gold, P.aqua, P.leafYoung, P.peach, P.white][(hh >>> 16) % 6];
    if (h01(cx, cy, 5727) < 0.3) continue;
    p.set(cx, cy, c);
    if ((hh >>> 20) & 1) p.set(cx + 1, cy, dk(c));
  }
  // a few leaves blown into the corners, a crushed paper cup by the chairs
  for (const [lx, ly] of [[20, 40], [24, 44], [360, 60], [362, 210], [290, 212], [100, 214], [18, 150]] as [number, number][]) {
    const c = [P.brass, P.brassOld, P.woodLt, P.sunDeep][ihash(lx, ly, 5729) % 4];
    p.set(lx, ly, c);
    p.set(lx + 1, ly, c);
    p.set(lx + 1, ly - 1, lt(c));
    shadeRect(p, lx + 1, ly + 1, 2, 1, 1);
  }
  p.rect(236, 96, 4, 3, P.white);
  p.hline(236, 239, 96, P.glint);
  p.set(239, 98, P.verm);
  shadeRect(p, 237, 99, 4, 1, 1);
  // the よ fallen off the welcome board, face up on the deck (x 60–68, y 68–76)
  p.rect(59, 68, 10, 10, P.white);
  p.hline(59, 68, 68, P.glint);
  p.vline(68, 69, 77, P.concrete);
  p.hline(60, 68, 77, P.concrete);
  fontTextSmall(p, 'よ', 60, 69, P.verm, 1);
  shadeRect(p, 60, 78, 10, 1, 1);
  shadeRect(p, 69, 69, 1, 9, 1);
  const img = p.toCanvas();
  return {
    ox: 0,
    oy: 0,
    w: W,
    h: H,
    foot: 0,
    flat: true,
    img: () => img,
    // two bell balloons tied to the north fence's top rail, drooping, turned to the stage
    over(g: Gfx, x: number, y: number, env: PropEnv) {
      for (const [bx, look, s] of [[102, 1, 1], [292, -1, 2]] as [number, -1 | 1, number][]) {
        const d = sway(env, s, 1100);
        g.line(x + bx + 1, y + 3, x + bx + 1 + d, y + 7, P.white);
        g.img(look > 0 ? HUSK.r : HUSK.l, x + bx - 5 + d, y + 7);
      }
    },
  } as PropArt;
});

// ================================================================ the stair house (1,2): x1–4, door at (2,3)

registerProp('mall_roof_stairhouse', () => {
  // image: world x 14–81, y 0–63 (anchor (16,32))
  const p = new PixelCanvas(68, 64);
  const X = (wx: number) => wx - 14;
  // the welcome board on two posts, standing on the roof of the house
  const bx = X(17);
  p.vline(X(24), 18, 24, P.asphalt);
  p.vline(X(70), 18, 24, P.asphalt);
  p.rect(bx, 0, 62, 19, P.verm);
  p.rect(bx + 1, 1, 60, 17, P.white);
  p.hline(bx + 1, bx + 60, 1, P.glint);
  p.vline(bx + 60, 2, 17, P.concrete);
  p.hline(bx + 1, bx + 60, 17, P.concrete);
  // 『 うこそ』: a clean pale square where the よ was, its four nail holes
  p.rect(bx + 4, 3, 8, 7, P.glint);
  for (const [nx, ny] of [[bx + 4, 3], [bx + 11, 3], [bx + 4, 9], [bx + 11, 9]]) p.set(nx, ny, P.steel);
  fontTextSmall(p, 'うこそ', bx + 13, 2, P.verm, 1);
  fontTextSmall(p, 'ゆうやけひろば', bx + 3, 10, P.navy, 1);
  // sun-faded top edge
  for (let i = 1; i < 61; i++) if (h01(i, 0, 5741) < 0.3) p.set(bx + i, 1, P.concreteLt);
  // the roof of the house (seen from above) and its front edge
  const top = 19;
  p.rect(X(16), top, 64, 8, P.concrete);
  p.hline(X(16), X(79), top, P.concreteLt);
  for (let i = 0; i < 64; i++) if (h01(i, 1, 5743) < 0.2) p.set(X(16) + i, top + 2 + (i % 4), P.concreteLt);
  // a vent cap on it
  p.rect(X(66), top + 1, 6, 4, P.steel);
  p.hline(X(66), X(71), top + 1, P.concreteLt);
  p.hline(X(65), X(72), top + 4, P.asphalt);
  p.hline(X(16), X(79), top + 7, P.steel);
  // the front (south) face: painted concrete, streaked from the edge
  const f0 = top + 8;
  for (let y = f0; y < 64; y++)
    for (let x = X(16); x <= X(79); x++) {
      let c: string = y === f0 ? P.concreteLt : P.concreteLt;
      if (h01(x, y, 5745) < 0.12) c = P.concrete;
      if (y > 58) c = dith(x, y, (y - 58) / 6, P.concreteLt, P.concrete);
      p.set(x, y, c);
    }
  for (let x = X(17); x < X(79); x++) {
    const hh = ihash(x, 3, 5747);
    if (hh % 5) continue;
    const len = 4 + ((hh >>> 8) % 12);
    for (let j = 0; j < len; j++) if (j < 3 || ((hh >>> (10 + (j % 12))) & 1)) p.set(x, f0 + 1 + j, P.concrete);
  }
  // the steel door (world x 33–46, y 38–63) in its frame
  const dx = X(32);
  p.rect(dx, 36, 16, 28, P.asphalt);
  p.rect(dx + 1, 37, 14, 27, P.steel);
  p.vline(dx + 1, 37, 63, P.concreteLt);
  p.hline(dx + 1, dx + 14, 37, P.concreteLt);
  p.vline(dx + 14, 38, 63, P.asphalt);
  // the wired-glass window, dark stairwell behind
  p.rect(dx + 4, 41, 8, 7, P.nightShade);
  for (let i = 0; i < 8; i += 3) p.vline(dx + 4 + i, 41, 47, P.shadeDeep);
  for (let j = 0; j < 7; j += 3) p.hline(dx + 4, dx + 11, 41 + j, P.shadeDeep);
  p.set(dx + 5, 42, P.lilac);
  p.set(dx + 6, 42, P.shade);
  p.strokeRect(dx + 3, 40, 10, 9, P.asphalt);
  // lever handle, kick plate
  p.rect(dx + 11, 51, 3, 1, P.brass);
  p.set(dx + 13, 52, P.brassOld);
  p.rect(dx + 2, 59, 12, 4, P.concrete);
  p.hline(dx + 2, dx + 13, 59, P.concreteLt);
  // the green exit sign over the door
  p.rect(X(35), 30, 10, 5, P.leafShade);
  p.rect(X(36), 31, 8, 3, P.leaf);
  p.set(X(38), 31, P.white);
  p.line(X(38), 32, X(40), 33, P.white);
  p.set(X(41), 32, P.white);
  // a bulkhead lamp (off) left of the door, a faded poster of the panda car right of it
  p.rect(X(24), 32, 4, 4, P.concrete);
  p.rect(X(25), 33, 2, 2, P.goldPale);
  p.set(X(25), 33, P.glint);
  p.rect(X(52), 36, 14, 18, P.paper);
  p.hline(X(52), X(65), 36, P.glint);
  p.rect(X(54), 42, 8, 5, P.white);
  p.rect(X(54), 45, 2, 2, P.ink);
  p.rect(X(60), 45, 2, 2, P.ink);
  p.set(X(61), 42, P.ink);
  p.set(X(62), 41, P.ink);
  p.hline(X(54), X(63), 49, P.peach);
  p.hline(X(54), X(60), 51, P.verm);
  castRight(p, X(52), 36, 14, 18, 1);
  // a dried potted plant at the corner, a hose reel on the wall
  p.rect(X(70), 56, 6, 7, P.wood);
  p.hline(X(70), X(75), 56, P.woodLt);
  p.line(X(72), 55, X(70), 48, P.brassOld);
  p.line(X(73), 55, X(76), 47, P.brass);
  p.set(X(71), 49, P.brass);
  p.ellipse(X(21), 48, 3, 3, P.verm);
  p.set(X(21), 48, P.vermShade);
  p.set(X(20), 46, P.vermLt);
  // outline the whole block
  outline(p, { soft: true });
  const img = p.toCanvas();
  return {
    ox: -2,
    oy: -32,
    w: 68,
    h: 64,
    foot: 31,
    img: () => img,
    shadow: 18,
    contact: 0,
    // the exit sign's green, even at dusk
    glow(g: Gfx, x: number, y: number) {
      g.rect(x - 2 + X(36), y - 32 + 31, 8, 3, '#5FA85A', 0.5);
      g.rect(x - 2 + X(35), y - 32 + 30, 10, 5, '#9BCB6B', 0.14);
    },
  } as PropArt;
});

// ================================================================ the stage (8,2): x8–15, y2–3

/** The bunting: a string sagging between two points with little flags, fluttering. */
function bunting(g: Gfx, ax: number, ay: number, bx: number, by: number, sag: number, env: PropEnv, seed: number): void {
  const n = Math.max(2, Math.round(Math.abs(bx - ax) / 7));
  const cols = [P.verm, P.gold, P.aqua, P.leafYoung, P.white, P.peach];
  let px = ax;
  let py = ay;
  for (let i = 1; i <= 24; i++) {
    const t = i / 24;
    const x = ax + (bx - ax) * t;
    const y = ay + (by - ay) * t + Math.sin(t * Math.PI) * sag;
    g.line(Math.round(px), Math.round(py), Math.round(x), Math.round(y), P.concreteLt);
    px = x;
    py = y;
  }
  for (let k = 0; k < n; k++) {
    const t = (k + 0.5) / n;
    const x = Math.round(ax + (bx - ax) * t);
    const y = Math.round(ay + (by - ay) * t + Math.sin(t * Math.PI) * sag) + 1;
    const c = cols[(k + seed) % cols.length];
    const flap = Math.sin(env.mt / 260 + k * 1.7 + seed) > 0.4 ? 1 : 0;
    g.rect(x - 1, y, 3, 1, c);
    g.rect(x - 1 + flap, y + 1, 2, 1, c);
    g.px(x + flap, y + 2, dk(c));
  }
}

registerProp('mall_roof_stage', () => {
  // image: world x 120–263, y 2–63 (anchor (128,32))
  const p = new PixelCanvas(144, 62);
  const X = (wx: number) => wx - 120;
  const Y = (wy: number) => wy - 2;
  // the backdrop's stands behind it
  for (const sx of [150, 232]) {
    p.vline(X(sx), Y(8), Y(40), P.asphalt);
    p.vline(X(sx + 1), Y(8), Y(40), P.charcoal);
  }
  // the backdrop board (x 144–239, y 6–38): sky blue gone pale at the top
  const b0 = X(144);
  for (let y = Y(6); y <= Y(38); y++)
    for (let x = b0; x < b0 + 96; x++) {
      const t = (y - Y(6)) / 32;
      let c = dith(x, y, t * 1.3, P.concreteLt, P.aqua);
      if (y === Y(6)) c = P.white;
      if (x === b0 || x === b0 + 95) c = P.white;
      if (y === Y(38)) c = P.concrete;
      p.set(x, y, c);
    }
  p.vline(b0 + 94, Y(7), Y(37), P.concrete);
  // the bell face (カネナリくん's head as a logo), a little faded
  const lx = X(166);
  const ly = Y(22);
  p.ellipse(lx, ly, 9, 10, P.gold);
  p.rect(lx - 11, ly + 7, 23, 3, P.gold);
  p.hline(lx - 11, lx + 11, ly + 9, P.brass);
  for (let i = -8; i <= 8; i++) if (h01(i, 1, 5751) < 0.4) p.set(lx + i, ly - 8 + Math.abs(i) / 3, P.goldPale);
  p.ellipse(lx + 3, ly + 3, 6, 6, P.brass);
  p.ellipse(lx + 1, ly + 1, 6, 6, P.gold);
  p.set(lx - 4, ly, P.ink);
  p.set(lx - 4, ly - 1, P.ink);
  p.set(lx + 3, ly, P.ink);
  p.set(lx + 3, ly - 1, P.ink);
  p.hline(lx - 2, lx + 1, ly + 4, P.ink);
  p.set(lx - 6, ly + 2, P.peach);
  p.set(lx + 5, ly + 2, P.peach);
  p.rect(lx - 1, ly - 13, 2, 3, P.brass);
  // the letters
  fontTextSmall(p, 'カネナリくん', X(180), Y(10), P.navy, 1);
  fontText(p, '握手会', X(182), Y(19), P.verm);
  // hearts and stars in the corners, the tape that held a sign
  for (const [hx, hy, c] of [[X(229), Y(11), P.crimson], [X(228), Y(31), P.gold], [X(150), Y(33), P.crimson]] as [number, number, string][]) {
    p.set(hx, hy, c);
    p.set(hx + 2, hy, c);
    p.hline(hx, hx + 2, hy + 1, c);
    p.set(hx + 1, hy + 2, c);
  }
  p.rect(X(200), Y(35), 6, 2, P.goldPale);
  castRight(p, b0, Y(6), 96, 33, 2);
  // the platform: red carpet on top (y 36–56), faded in the middle, its white edge
  for (let y = Y(36); y <= Y(56); y++)
    for (let x = X(128); x <= X(255); x++) {
      const n = valueNoise(x / 30, y / 14, 5753);
      let c: string = P.red;
      // sun-faded a little toward the front, the pile's weave
      if (n > 0.66) c = dith(x, y, (n - 0.66) * 4, P.red, P.peach);
      if ((x + y * 3) % 7 === 0) c = c === P.red ? P.verm : c;
      if (y === Y(36)) c = P.vermShade;
      if (y === Y(56)) c = P.white;
      if (x === X(128) || x === X(255)) c = P.white;
      p.set(x, y, c);
    }
  // the backdrop's shadow on the carpet
  for (let x = b0; x < b0 + 96; x++) {
    p.set(x, Y(39), P.vermShade);
    p.set(x, Y(40), dith(x, 40, 0.5, P.red, P.vermShade));
  }
  // 紅白幕 on the front (y 57–63): red and white panels with folds
  for (let y = Y(57); y <= Y(63); y++)
    for (let x = X(128); x <= X(255); x++) {
      const k = Math.floor((x - X(128)) / 6) % 2;
      let c: string = k ? P.red : P.white;
      const fold = (x - X(128)) % 6;
      if (fold === 5) c = k ? P.vermShade : P.concrete;
      if (fold === 0) c = k ? P.vermLt : P.glint;
      if (y === Y(57)) c = P.steel;
      p.set(x, y, c);
    }
  // the mic stand (no mic) at the front left, a small speaker on the right
  p.ellipse(X(172), Y(52), 3, 1, P.charcoal);
  p.vline(X(172), Y(38), Y(51), P.charcoal);
  p.set(X(173), Y(38), P.steel);
  p.hline(X(171), X(174), Y(37), P.asphalt);
  p.set(X(174), Y(36), P.asphalt);
  p.rect(X(243), Y(26), 10, 14, P.charcoal);
  p.rect(X(244), Y(27), 8, 12, P.ink);
  p.ellipse(X(248), Y(35), 2, 2, P.asphalt);
  p.set(X(247), Y(30), P.steel);
  p.hline(X(243), X(252), Y(26), P.asphalt);
  p.vline(X(247), Y(40), Y(46), P.charcoal);
  finish(p, { soft: true, rim: false });
  const img = p.toCanvas();
  return {
    ox: -8,
    oy: -30,
    w: 144,
    h: 62,
    foot: 31,
    img: () => img,
    shadow: 26,
    contact: 0,
    over(g: Gfx, x: number, y: number, env: PropEnv) {
      const wx = x - 128;
      const wy = y - 32;
      // bunting out to the fence posts on both sides
      bunting(g, wx + 144, wy + 7, wx + 102, wy + 4, 5, env, 0);
      bunting(g, wx + 239, wy + 7, wx + 294, wy + 4, 6, env, 3);
      bunting(g, wx + 146, wy + 8, wx + 237, wy + 8, 3, env, 1);
      // a balloon tied to each stand, drooping, face to the middle
      for (const [bx, look, s] of [[151, 1, 3], [233, -1, 4]] as [number, -1 | 1, number][]) {
        const d = sway(env, s, 800);
        g.line(wx + bx, wy + 8, wx + bx + d, wy + 3, P.white);
        g.img(look > 0 ? HUSK.r : HUSK.l, wx + bx - 6 + d, wy - 4 + Math.max(0, d));
      }
    },
  } as PropArt;
});

// ================================================================ the table and the name book (16,3)

registerProp('mall_roof_table', () => {
  const build = (names: number, lift: boolean) => {
    const p = new PixelCanvas(20, 26);
    // legs under the cloth
    p.vline(4, 20, 25, P.steel);
    p.vline(15, 20, 25, P.steel);
    // the cloth over the top, hanging in folds
    p.rect(1, 8, 18, 13, P.white);
    p.hline(1, 18, 8, P.glint);
    for (const fx of [4, 8, 12, 16]) p.vline(fx, 12, 20, P.concreteLt);
    for (const fx of [5, 13]) p.vline(fx, 14, 20, P.concrete);
    p.hline(1, 18, 20, P.concrete);
    // the book, open
    p.rect(4, 5, 11, 5, P.paper);
    p.vline(9, 5, 9, P.paperGrid);
    p.hline(4, 14, 9, P.paperGrid);
    for (let i = 0; i < names; i++) {
      const y = 6 + (i % 2) * 2;
      const x = i < 2 ? 5 : 10;
      p.hline(x, x + (i === 3 ? 2 : 3), y, i === 3 ? P.navy : P.ink);
    }
    if (lift) {
      p.set(14, 5, P.glint);
      p.set(13, 4, P.paper);
      p.set(14, 4, P.paper);
    }
    // the pen on its string, the tent card 『お名前を どうぞ』
    p.line(15, 7, 17, 11, P.verm);
    p.set(17, 12, P.steel);
    p.line(16, 12, 18, 16, P.white);
    p.rect(1, 3, 3, 5, P.white);
    p.set(2, 2, P.white);
    p.set(1, 5, P.verm);
    p.set(2, 5, P.verm);
    finish(p, { soft: true });
    return p.toCanvas();
  };
  const imgs = [build(3, false), build(3, true), build(4, false), build(4, true)];
  return {
    ox: -2,
    oy: -10,
    w: 20,
    h: 26,
    foot: 15,
    img: (env: PropEnv) => {
      const four = env.flag('flag_roof_handshake') > 0 ? 2 : 0;
      // the page corner lifts in the wind now and then
      const lift = Math.floor(env.mt / 420) % 11 === 0 ? 1 : 0;
      return imgs[four + lift];
    },
    shadow: 14,
    contact: 16,
    contactX: 8,
  } as PropArt;
});

// ================================================================ the coin binocular (22,3), facing east

registerProp('mall_roof_scope', () => {
  const p = new PixelCanvas(20, 32);
  // the pedestal and its base plate
  p.rect(3, 29, 13, 3, P.steel);
  p.hline(3, 15, 29, P.concreteLt);
  p.rect(8, 16, 3, 13, P.navy);
  p.vline(8, 16, 28, P.blue);
  // the head: a blue box, eyepieces to the west, the lens hood to the east
  p.rect(4, 7, 12, 10, P.blue);
  p.hline(4, 15, 7, P.aqua);
  p.vline(4, 7, 16, P.aqua);
  p.hline(4, 15, 16, P.navy);
  p.vline(15, 8, 16, P.navy);
  p.rect(0, 10, 4, 3, P.charcoal);
  p.rect(1, 8, 3, 2, P.ink);
  p.set(0, 11, P.asphalt);
  p.rect(16, 8, 3, 8, P.navy);
  p.vline(18, 9, 14, P.glow);
  p.set(18, 9, P.white);
  // the coin box on top, its slot; 『100』 on the side
  p.rect(7, 4, 6, 3, P.steel);
  p.hline(7, 12, 4, P.concreteLt);
  p.hline(9, 10, 5, P.ink);
  tiny(p, '100', 6, 10, P.white);
  finish(p, { soft: true });
  const img = p.toCanvas();
  return stand(img, { cx: 9, base: 16, contact: 12, shadow: 26 });
});

// ================================================================ pipe chairs (9,5) (11,5) (13,5)

registerProp('mall_roof_chair', (opts) => {
  const v = Number(opts.v ?? 0);
  const p = new PixelCanvas(14, 20);
  const vinyl = P.navy;
  if (v < 2) {
    // from behind (facing the stage): the back panel, the seat beyond it, legs
    p.vline(2, 1, 19, P.steel);
    p.vline(11, 1, 19, P.steel);
    p.set(2, 1, P.concreteLt);
    p.set(11, 1, P.concreteLt);
    p.rect(3, 9, 8, 3, vinyl);
    p.hline(3, 10, 9, P.blue);
    p.vline(4, 12, 18, P.asphalt);
    p.vline(9, 12, 18, P.asphalt);
    p.hline(3, 10, 16, P.asphalt);
    p.rect(2, 2, 10, 5, vinyl);
    p.hline(2, 11, 2, P.blue);
    p.vline(2, 2, 6, P.blue);
    p.hline(3, 10, 6, P.nightShade);
    if (v === 1) {
      // a paper cup left on the seat
      p.rect(9, 7, 3, 3, P.white);
      p.set(9, 7, P.glint);
      p.set(11, 9, P.concrete);
      p.set(10, 8, P.verm);
    } else {
      // sun-bleached corner of the back
      p.set(3, 3, P.aqua);
      p.set(4, 3, P.blue);
    }
  } else {
    // turned round: facing the town, its back to the stage — the seat to us
    p.rect(2, 1, 10, 5, vinyl);
    p.hline(2, 11, 1, P.blue);
    p.vline(3, 6, 17, P.asphalt);
    p.vline(10, 6, 17, P.asphalt);
    p.rect(1, 8, 12, 4, vinyl);
    p.hline(1, 12, 8, P.aqua);
    p.hline(1, 12, 9, P.blue);
    p.hline(1, 12, 11, P.nightShade);
    p.vline(1, 12, 19, P.steel);
    p.vline(12, 12, 19, P.steel);
    p.set(1, 12, P.concreteLt);
    p.hline(2, 11, 17, P.steel);
    // a split in the vinyl, the foam showing
    p.set(6, 9, P.goldPale);
    p.set(7, 9, P.goldPale);
  }
  finish(p, { soft: true });
  return stand(p.toCanvas(), { cx: 8, base: 16, contact: 12, shadow: 16 });
});

// ================================================================ panda cars (1,6) 故障中 and (3,9) the one that runs

/** A panda car, side view facing east, 32×26 (the ground at y 25). */
function pandaCanvas(broken: boolean, seatTop = false): PixelCanvas {
  const p = new PixelCanvas(34, 26);
  const white = broken ? P.concreteLt : P.white;
  const lite = broken ? P.white : P.glint;
  // far legs and wheels (darker, peeking)
  for (const lx of [9, 23]) {
    p.rect(lx, 18, 3, 5, P.ink);
    p.circle(lx + 1, 23, 1.5, P.charcoal);
  }
  // body
  p.ellipse(15, 14, 10.5, 6.5, white);
  for (let x = 5; x < 26; x++)
    for (let y = 8; y < 21; y++) {
      if (p.alpha(x, y) === 0) continue;
      const d = (x - 15) / 10.5 + (y - 14) / 6.5;
      if (d > 0.9) p.set(x, y, P.concrete);
      else if (d > 0.45) p.set(x, y, broken ? P.concrete : P.concreteLt);
      else if (d < -0.8) p.set(x, y, lite);
    }
  // the black band over the shoulders and the black hind legs
  for (let y = 8; y < 21; y++)
    for (let x = 17; x < 23; x++) {
      if (p.alpha(x, y) === 0) continue;
      const band = x - 17 + (y - 8) * 0.25;
      if (band >= 0 && band < 4.2) p.set(x, y, y < 11 ? P.charcoal : P.ink);
    }
  p.ellipse(8, 17, 4, 3.5, P.ink);
  p.set(6, 15, P.charcoal);
  // near legs and wheels
  for (const lx of [6, 19]) {
    p.rect(lx, 18, 4, 5, P.ink);
    p.hline(lx, lx + 3, 18, P.charcoal);
    p.circle(lx + 2, 23, 2, P.charcoal);
    p.set(lx + 2, 23, P.steel);
  }
  // the head (a notch lower when broken)
  const hy = broken ? 10 : 9;
  p.circle(27, hy, 5.5, white);
  for (let x = 21; x < 34; x++)
    for (let y = hy - 6; y < hy + 6; y++) if (p.alpha(x, y) && (x - 27) + (y - hy) > 5) p.set(x, y, P.concrete);
  p.circle(23, hy - 5, 2, P.ink);
  p.circle(29, hy - 5.5, 1.8, P.charcoal);
  if (broken) p.set(29, hy - 7, 0);
  p.ellipse(28.5, hy, 1.8, 1.4, P.ink);
  p.set(28, hy - 1, broken ? P.charcoal : P.goldPale);
  p.set(32, hy + 1, P.ink);
  p.hline(30, 31, hy + 3, P.concrete);
  // the saddle and the handle bar
  p.rect(10, seatTop ? 8 : 7, 8, 3, P.red);
  p.hline(10, 17, seatTop ? 8 : 7, P.vermLt);
  p.hline(10, 17, seatTop ? 10 : 9, P.vermShade);
  p.vline(20, 3, 8, P.steel);
  p.hline(19, 22, 3, P.concreteLt);
  p.set(22, 4, P.steel);
  // the coin box on the flank
  p.rect(8, 12, 4, 4, P.steel);
  p.hline(8, 11, 12, P.concreteLt);
  p.hline(9, 10, 13, P.ink);
  p.set(10, 15, P.verm);
  if (broken) {
    // 『故障中』 taped on its side, gone yellow
    p.rect(12, 12, 8, 6, P.paper);
    p.hline(13, 18, 14, P.verm);
    p.hline(13, 17, 16, P.verm);
    p.set(12, 12, P.goldPale);
    p.set(19, 12, P.goldPale);
    // dust on its back
    for (let i = 0; i < 12; i++) p.set(8 + ((i * 7) % 14), 9 + (i % 3), P.concrete);
  }
  outline(p, { soft: true });
  return p;
}

/** Minato sitting astride, facing east: the upper body on the saddle, one leg down the near side. */
function drawRider(g: Gfx, spriteId: string, sx: number, seatY: number, t: number): void {
  const spr = charSprite(spriteId);
  const img = idleFrame(spr, 'right', t);
  const h = img.height;
  const lap = h - 6;
  const x = Math.round(sx - img.width / 2);
  const top = Math.round(seatY + 2 - lap);
  g.ctx.drawImage(img, 0, 0, img.width, lap + 1, x, top, img.width, lap + 1);
  // the near leg hanging down the panda's side
  g.rect(x + Math.floor(img.width / 2) - 1, top + lap + 1, 2, 3, '#FFD9B8');
  g.px(x + Math.floor(img.width / 2) - 1, top + lap + 4, '#2A2440');
  g.px(x + Math.floor(img.width / 2), top + lap + 4, '#2A2440');
}

registerProp('mall_roof_panda', (opts) => {
  const broken = !!opts.broken;
  const img = pandaCanvas(broken).toCanvas();
  const a = stand(img, { cx: 16, base: 16, contact: 26, shadow: 20 });
  if (broken) return a;
  // the working one: eye lamps that blink now and then; the ride
  const still = a.img;
  a.img = (env: PropEnv) => (roofRt.ride ? null : still(env));
  a.over = (g: Gfx, x: number, y: number, env: PropEnv) => {
    const r = roofRt.ride;
    if (!r) return;
    const u = env.t - r.t0;
    const off = Math.round(rideOffset(u));
    const moving = u > RIDE.on && u < RIDE.on + RIDE.go + RIDE.hold + RIDE.back;
    const bob = moving && Math.floor(u / 180) % 2 ? 1 : 0;
    const px = x + a.ox + off;
    const py = y + a.oy - bob;
    g.img(img, px, py);
    // on (hop) and off: 2px above, then settled
    const settle = u < 120 ? -2 : 0;
    if (u < RIDE.off) drawRider(g, r.sprite, px + 13, py + 7 + settle, env.t);
  };
  a.glow = (g: Gfx, x: number, y: number, env: PropEnv) => {
    const r = roofRt.ride;
    const off = r ? Math.round(rideOffset(env.t - r.t0)) : 0;
    // the eye lamp: on, with a blink every few seconds (and steady while it runs)
    const blink = !r && Math.floor(env.t / 150) % 26 === 0;
    if (blink) return;
    g.rect(x + a.ox + off + 28, y + a.oy + 8, 1, 1, '#FFE7A3', 0.9);
    g.rect(x + a.ox + off + 27, y + a.oy + 7, 3, 3, '#FFD23F', 0.22);
  };
  return a;
});

// ================================================================ the water tank (18,9): FRP panels on a steel base

registerProp('mall_roof_tank', () => {
  // image: world x 286–337, y 110–175 (anchor (288,144))
  const p = new PixelCanvas(52, 66);
  // steel base: H-beams under the tank
  p.rect(2, 58, 48, 4, P.asphalt);
  p.hline(2, 49, 58, P.steel);
  for (const lx of [3, 24, 45]) {
    p.rect(lx, 62, 4, 4, P.charcoal);
    p.hline(lx, lx + 3, 62, P.asphalt);
  }
  // the top of the tank (y 2–13) and its manhole
  p.rect(3, 2, 46, 12, P.concreteLt);
  p.hline(3, 48, 2, P.white);
  for (let i = 3; i < 49; i += 11) p.vline(i, 3, 13, P.concrete);
  p.ellipse(18, 7, 5, 2.5, P.concrete);
  p.ellipse(18, 7, 4, 1.8, P.concreteLt);
  p.set(16, 6, P.white);
  p.rect(36, 5, 3, 3, P.steel);
  // the front: square panels with raised ribs (y 14–57)
  for (let y = 14; y < 58; y++)
    for (let x = 3; x < 49; x++) {
      const px = (x - 3) % 11;
      const py = (y - 14) % 11;
      let c: string = P.concreteLt;
      if (px === 0 || py === 0) c = P.white;
      else if (px === 10 || py === 10) c = P.concrete;
      else if (px + py < 5) c = P.white;
      if (x > 40 && c === P.concreteLt) c = P.concrete;
      p.set(x, y, c);
    }
  p.hline(3, 48, 14, P.steel);
  // grime under the ribs
  for (let x = 4; x < 48; x++) if (h01(x, 3, 5761) < 0.3) p.set(x, 56, P.steel);
  // the ladder up the front right, a chain across it and the plate
  for (const lx of [37, 43]) p.vline(lx, 4, 58, P.steel);
  for (let y = 8; y < 58; y += 5) p.hline(37, 43, y, P.asphalt);
  p.line(37, 30, 43, 32, P.brassOld);
  p.rect(28, 27, 8, 10, P.white);
  p.rect(29, 28, 6, 2, P.verm);
  p.hline(29, 34, 31, P.ink);
  p.hline(29, 33, 33, P.ink);
  p.hline(29, 34, 35, P.ink);
  // a pipe out of the bottom to the east parapet
  p.rect(47, 52, 5, 3, P.steel);
  p.hline(47, 51, 52, P.concreteLt);
  finish(p, { soft: true });
  const img = p.toCanvas();
  return { ox: -2, oy: -34, w: 52, h: 66, foot: 31, img: () => img, shadow: 28, contact: 0 } as PropArt;
});

// ================================================================ the skylight (6,10): M4's, from above

registerProp('mall_roof_skylight', () => {
  // image: world x 94–145, y 150–191 (anchor (96,160))
  const p = new PixelCanvas(52, 42);
  // the curb
  p.rect(2, 12, 48, 30, P.concrete);
  p.hline(2, 49, 12, P.concreteLt);
  p.vline(2, 12, 41, P.concreteLt);
  p.hline(2, 49, 41, P.steel);
  p.vline(49, 13, 41, P.steel);
  // the far slope of the glass (steep, the sky in it) and the near slope (M4 below)
  for (let y = 4; y < 22; y++)
    for (let x = 4; x < 48; x++) {
      const t = (y - 4) / 18;
      let c = dith(x, y, t, P.lilac, P.peach);
      if ((x + y * 2) % 23 < 2) c = P.sky;
      p.set(x, y, c);
    }
  for (let y = 22; y < 39; y++)
    for (let x = 4; x < 48; x++) {
      // the 2F corridor below: dark, its P-tiles, the square of evening on its floor
      let c: string = (x + y) % 8 === 0 || (x - y) % 8 === 0 ? P.shadeDeep : P.nightShade;
      if (x > 12 && x < 30 && y > 25 && y < 35) c = (x + y) & 1 ? P.sun : P.sky;
      if (x > 34 && x < 42 && y > 31 && y < 34) c = P.maroon;
      p.set(x, y, c);
    }
  // the frame: ridge, mullions, the sill
  p.hline(4, 47, 21, P.concreteLt);
  p.hline(4, 47, 22, P.steel);
  for (let x = 4; x < 48; x += 11) {
    p.vline(x, 4, 38, P.steel);
    p.vline(x + 1, 4, 38, P.concreteLt);
  }
  p.hline(4, 47, 4, P.concreteLt);
  p.hline(4, 47, 39, P.steel);
  // a glint across the glass, leaves caught at the sill
  p.line(8, 30, 14, 24, P.white);
  p.line(28, 18, 32, 14, P.white);
  for (const [lx, ly] of [[20, 38], [22, 37], [40, 38]]) p.set(lx, ly, P.brassOld);
  outline(p, { soft: true });
  const img = p.toCanvas();
  return { ox: -2, oy: -10, w: 52, h: 42, foot: 31, img: () => img, shadow: 8, contact: 0 } as PropArt;
});

// ================================================================ 『最後尾』 (12,12)

registerProp('mall_roof_saigobi', () => {
  const p = new PixelCanvas(28, 32);
  p.ellipse(13, 29, 6, 2, P.charcoal);
  p.hline(8, 18, 28, P.asphalt);
  p.vline(13, 13, 28, P.steel);
  p.vline(14, 13, 28, P.asphalt);
  p.rect(1, 1, 26, 13, P.verm);
  p.rect(2, 2, 24, 11, P.white);
  p.hline(2, 25, 2, P.glint);
  fontTextSmall(p, '最後尾', 2, 3, P.verm, 1);
  // a curled corner
  p.set(25, 12, P.concrete);
  p.set(24, 12, P.concreteLt);
  finish(p, { soft: true });
  return stand(p.toCanvas(), { cx: 14, base: 16, contact: 12, shadow: 28 });
});

// ================================================================ the air-con units (14,13), fans turned by the wind

registerProp('mall_roof_ac', () => {
  const frames = mkFrames(3, 54, 24, (p, k) => {
    for (const ux of [2, 28]) {
      // blocks under it
      p.rect(ux + 2, 20, 5, 4, P.concrete);
      p.rect(ux + 16, 20, 5, 4, P.concrete);
      // the casing: top face, front
      p.rect(ux, 2, 24, 18, P.concreteLt);
      p.hline(ux, ux + 23, 2, P.white);
      p.hline(ux, ux + 23, 5, P.concrete);
      p.hline(ux, ux + 23, 19, P.concrete);
      p.vline(ux + 23, 3, 19, P.concrete);
      // the fan behind its grille
      const cx = ux + 8;
      const cy = 12;
      p.circle(cx, cy, 6, P.charcoal);
      for (let b = 0; b < 3; b++) {
        const a = (b * 2 * Math.PI) / 3 + (k * 2 * Math.PI) / 9;
        p.line(cx, cy, Math.round(cx + Math.cos(a) * 5), Math.round(cy + Math.sin(a) * 5), P.steel);
        p.set(Math.round(cx + Math.cos(a + 0.4) * 4), Math.round(cy + Math.sin(a + 0.4) * 4), P.steel);
      }
      p.ring(cx, cy, 6, 6, P.asphalt);
      p.ring(cx, cy, 3.5, 3.5, P.asphalt);
      p.set(cx, cy, P.concreteLt);
      // the vent slats on the right
      for (let y = 8; y < 18; y += 2) p.hline(ux + 16, ux + 21, y, P.concrete);
      // the pipe out of its side, wrapped in tape
      p.rect(ux + 22, 14, 3, 3, P.paperGrid);
      p.hline(ux + 22, ux + 24, 14, P.paper);
    }
    // the pipes run on along the parapet, east
    p.rect(50, 20, 4, 3, P.paperGrid);
    p.hline(50, 53, 20, P.paper);
  }, (p) => finish(p, { soft: true }));
  const fin = frames;
  const img = (env: PropEnv) => fin[Math.floor(env.mt / 140) % 3];
  return { ox: -2, oy: -8, w: 54, h: 24, foot: 15, img, shadowImg: () => fin[0], shadow: 18, contact: 0 } as PropArt;
});

// ================================================================ the south fence, in front (0,14)

registerProp('mall_roof_fence_s', () => {
  // image: world x 0–383, y 204–239 (anchor (0,224)); a low safety fence on the coping (base y 230)
  const p = new PixelCanvas(W, 36);
  for (let y = 15; y < 25; y++)
    for (let x = 12; x < W - 12; x++) {
      const d1 = (((x + y) % 8) + 8) % 8 === 0;
      const d2 = (((x - y) % 8) + 8) % 8 === 0;
      if (d1 && d2) p.set(x, y, P.concreteLt);
      else if ((d1 || d2) && (x & 1) === 0) p.set(x, y, P.steel);
    }
  p.hline(8, W - 9, 12, P.white);
  p.hline(8, W - 9, 13, P.concreteLt);
  p.hline(8, W - 9, 14, P.steel);
  p.hline(8, W - 9, 25, P.steel);
  for (let x = 6; x < W; x += 32) {
    p.vline(x, 11, 26, P.concreteLt);
    p.vline(x + 1, 11, 26, P.steel);
  }
  const img = p.toCanvas();
  return { ox: 0, oy: -20, w: W, h: 36, foot: 6, img: () => img, xray: 0.35 } as PropArt;
});

// ================================================================ M4's steel door up to the roof (map_mall_2f (2,0)–(2,1))

/**
 * On M4's north wall, tile 2 (the 『↓1F』 sign beside it was narrowed to
 * tile 1): a plain steel door under a 『屋上』 plate, its wired-glass
 * window lit from above — the stairwell's evening — and a line of it under
 * the door, a small warm pool on the floor in front.
 */
registerProp('mall_roof_door', () => {
  const p = new PixelCanvas(16, 32);
  // the plate
  p.rect(0, 0, 16, 10, P.navy);
  p.hline(0, 15, 0, P.blue);
  fontTextSmall(p, '屋上', 0, 1, P.white, 1);
  // frame and leaf
  p.rect(1, 11, 14, 21, P.asphalt);
  p.rect(2, 12, 12, 20, P.concrete);
  p.vline(2, 12, 31, P.concreteLt);
  p.hline(2, 13, 12, P.concreteLt);
  p.vline(13, 13, 31, P.steel);
  // the window: warm light from the stairs up to the roof
  p.rect(5, 15, 6, 5, P.sky);
  p.hline(5, 10, 15, P.horizon);
  p.set(7, 17, P.sun);
  p.vline(8, 15, 19, P.brass);
  p.hline(5, 10, 17, P.brass);
  p.strokeRect(4, 14, 8, 7, P.steel);
  // push bar, kick plate, the warm line at the threshold
  p.hline(4, 12, 23, P.steel);
  p.hline(4, 12, 24, P.asphalt);
  p.rect(3, 28, 10, 3, P.steel);
  p.hline(3, 12, 28, P.concreteLt);
  p.hline(2, 13, 31, P.sky);
  castRight(p, 0, 0, 16, 32, 1);
  const img = p.toCanvas();
  return {
    ox: 0,
    oy: 0,
    w: 16,
    h: 32,
    foot: 0,
    flat: true,
    img: () => img,
    glow(g: Gfx, x: number, y: number) {
      g.rect(x + 5, y + 15, 6, 5, '#F7C27A', 0.35);
      g.rect(x + 2, y + 31, 12, 1, '#FFE7A3', 0.6);
    },
    light(g: Gfx, x: number, y: number) {
      // the evening that comes down the stairs, a little on the floor in front
      g.rect(x + 1, y + 32, 14, 3, '#F7C27A', 0.18);
      g.rect(x + 3, y + 35, 10, 3, '#F7C27A', 0.1);
    },
  } as PropArt;
});

// ================================================================ the view through the binocular (evt_roof_scope)

let scopePano: HTMLCanvasElement | null = null;

/**
 * The east from the roof, 640×216: the railway and the level crossing, the
 * roofs of 夕鳴町 in the dusk, the river bridge, the mountains — and above
 * and beyond them a patch of night that should not be there yet: stars, and
 * on a far hill with terraced fields the few small lights of a village
 * (星見台; nobody in it is shown).
 */
function panorama(): HTMLCanvasElement {
  if (scopePano) return scopePano;
  const PW = 640;
  const PH = 216;
  const p = new PixelCanvas(PW, PH);
  // the near mountains fall away on the right, into a gap: the far hill shows beyond it
  const ridge = (x: number) => Math.round(92 + 10 * Math.sin(x / 70 + 0.4) + 6 * Math.sin(x / 23) + (x > 400 ? Math.min(34, (x - 400) / 4) : 0));
  const hillTop = (x: number) => Math.round(108 - 16 * Math.sin(Math.max(0, Math.min(1, (x - 452) / 170)) * Math.PI));
  // the sky: dusk on the left, going to night past the mountains
  for (let y = 0; y < PH; y++)
    for (let x = 0; x < PW; x++) {
      const night = Math.max(0, Math.min(1, (x - 330) / 150));
      const v = y / 120;
      let c: string = v < 0.3 ? P.lilac : v < 0.55 ? P.peach : v < 0.75 ? P.crimson : P.sun;
      if (v > 0.25 && v < 0.35) c = dith(x, y, (v - 0.25) / 0.1, P.lilac, P.peach);
      if (v > 0.5 && v < 0.6) c = dith(x, y, (v - 0.5) / 0.1, P.peach, P.crimson);
      if (night > 0) {
        const n = y < 70 ? P.night : y < 100 ? P.nightShade : P.shadeDeep;
        c = dith(x, y, night, c, n);
      }
      p.set(x, y, c);
    }
  // stars in the night part
  for (let k = 0; k < 90; k++) {
    const sx = 420 + (ihash(k, 1, 5771) % 220);
    const sy = 4 + (ihash(k, 2, 5771) % 90);
    if (sy > ridge(sx) - 4) continue;
    p.set(sx, sy, ihash(k, 3, 5771) % 4 ? P.horizon : P.glint);
    if (ihash(k, 4, 5771) % 9 === 0) {
      p.set(sx - 1, sy, P.shade);
      p.set(sx + 1, sy, P.shade);
    }
  }
  // the far range
  for (let x = 0; x < PW; x++) {
    const far = ridge(x) - 8 + Math.round(4 * Math.sin(x / 31));
    const night = Math.max(0, Math.min(1, (x - 330) / 150));
    for (let y = far; y < PH; y++) p.set(x, y, night > 0.5 ? P.nightShade : P.shade);
    if (night < 0.5) p.set(x, far, P.lilac);
  }
  // the far hill beyond the gap: terraced fields in the night, a village's few lights
  for (let x = 452; x < 622; x++)
    for (let y = hillTop(x); y < PH; y++) p.set(x, y, (y - hillTop(x)) % 4 === 3 ? P.nightShade : P.night);
  for (const [lx, ly, c] of [[498, 104, P.gold], [521, 99, P.sky], [540, 102, P.gold], [563, 106, P.goldPale], [590, 112, P.sky], [612, 118, P.gold]] as [number, number, string][]) {
    p.set(lx, ly, c);
    p.set(lx + 1, ly, dk(c));
  }
  // the near mountains
  for (let x = 0; x < PW; x++) {
    const near = ridge(x);
    const night = Math.max(0, Math.min(1, (x - 330) / 150));
    for (let y = near; y < PH; y++) p.set(x, y, night > 0.5 ? P.night : P.shadeDeep);
    if (night < 0.5) p.set(x, near, P.shade);
  }
  // the town: roofs under the mountains (tiles, flat roofs), poles and wires
  let x = 0;
  let k = 0;
  while (x < 420) {
    const hh = ihash(k, 5, 5773);
    const w = 16 + (hh % 30);
    const top = 128 + ((hh >>> 6) % 22);
    const roof = [P.shade, P.sunShade, P.lilac, P.shadeDeep][(hh >>> 12) % 4];
    for (let i = 0; i < w && x + i < PW; i++) {
      for (let y = top; y < PH; y++) p.set(x + i, y, y < top + 4 ? roof : y % 7 === 0 ? P.shadeDeep : P.shade);
      if (i === 0) for (let y = top; y < PH; y++) p.set(x + i, y, P.nightShade);
    }
    if ((hh >>> 16) % 3 === 0) p.set(x + 4 + ((hh >>> 18) % Math.max(1, w - 8)), top + 8, P.goldPale);
    x += w;
    k++;
  }
  // the railway embankment and its rails across the foot of the view, the crossing's lamps
  for (let xx = 0; xx < 440; xx++) {
    p.set(xx, 176, P.steel);
    p.set(xx, 180, P.steel);
    for (let y = 181; y < 186; y++) p.set(xx, y, (xx + y) % 4 ? P.shadeDeep : P.shade);
    if (xx % 6 === 0) p.vline(xx, 177, 179, P.wood);
  }
  p.vline(150, 150, 176, P.charcoal);
  p.rect(146, 152, 9, 3, P.charcoal);
  p.set(147, 153, P.red);
  p.set(153, 153, P.maroon);
  for (let px = 40; px < 440; px += 64) {
    p.vline(px, 112, 176, P.nightShade);
    p.hline(px - 3, px + 3, 116, P.nightShade);
    for (let i = 0; i < 64 && px + i < 440; i++) p.set(px + i, 117 + Math.round(Math.sin((i / 64) * Math.PI) * 4), P.shadeDeep);
  }
  scopePano = p.toCanvas();
  return scopePano;
}

/**
 * Draw the view through the binocular over the whole screen: two round
 * fields in the dark, the scene panning from the town to the night beyond
 * the mountains. `k` 0..1 opens the shutter, `pan` 0..1 turns the head.
 */
export function drawScopeView(g: Gfx, sw: number, sh: number, k: number, pan: number, t: number): void {
  const pano = panorama();
  const ctx = g.ctx;
  ctx.save();
  ctx.fillStyle = '#0B0B14';
  ctx.fillRect(0, 0, sw, sh);
  if (k > 0) {
    const r = Math.round(62 * k + 4);
    const cy = Math.round(sh / 2);
    const cx0 = Math.round(sw / 2 - 42);
    const cx1 = Math.round(sw / 2 + 42);
    // hand shake: a pixel now and then
    const jx = Math.round(Math.sin(t / 530) * 0.8);
    const jy = Math.round(Math.sin(t / 410 + 1) * 0.8);
    const sx = Math.round(pan * (pano.width - sw)) + jx;
    ctx.beginPath();
    ctx.moveTo(cx0 + r, cy);
    ctx.arc(cx0, cy, r, 0, Math.PI * 2);
    ctx.moveTo(cx1 + r, cy);
    ctx.arc(cx1, cy, r, 0, Math.PI * 2);
    ctx.clip();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(pano, sx, jy, sw, sh, 0, 0, sw, sh);
    // the lens's rim: darker toward the edge
    for (const cx of [cx0, cx1]) {
      const gr = ctx.createRadialGradient(cx, cy, r * 0.62, cx, cy, r);
      gr.addColorStop(0, 'rgba(11,11,20,0)');
      gr.addColorStop(1, 'rgba(11,11,20,0.75)');
      ctx.fillStyle = gr;
      ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    }
  }
  ctx.restore();
}

void lightRect;
