// モミスギ (72×72): a plush leather massage chair seen from the front-left
// (11.7). Button-tufted headrest whose two tufts read as sleepy eyes, three
// quilted back channels with massage balls rolling in the seams between
// them, fat rolled armrests with quilted air-bag pads, a stitched seat
// cushion, the foot massager with its two foot slots, chrome swivel feet.
// Leather grain, creases round the tufts, sheen on the bulges, a crack
// showing yellow foam, the お試し tag, and the remote dangling on a coiled
// cord like a tail.

import { PixelCanvas } from '../../engine/pixel';
import { hash2 } from '../../engine/rng';
import { registerEnemyArt, loop, type EnemyArt, type EnemyView } from './index';
import { K, Mask, rimLeft, shade } from './lib';

const W = 88;
const H = 84;
const OX = 8;
const OY = 8;

const LEATHER = ['#241012', '#2E1414', '#3A1A18', '#4A2420', '#5A2E2A', '#6E3A32', '#8A4A3E', '#A45E4C'];
const PAD = ['#2E1414', '#4E2A26', '#6A3A34', '#84483E', '#9A5A4C'];
const BALL = ['#8A7A64', '#A89880', '#D9C8B0', '#F4E6D8'];
const CHROME = ['#4A4F58', '#6B7186', '#9AA0A8', '#C0C6CC', '#F4F1E8'];
const STITCH = '#8E4C40';

interface MomiPose {
  balls?: number;
  breathe?: number;
  /** Air-bag pads inflation (0..2). */
  pads?: number;
  remote?: number;
  remoteUp?: boolean;
  glow?: boolean;
  timer?: boolean;
  ripple?: number;
  jx?: number;
  /** 強モード / grab: the armrests reach out and forward (0..1). */
  reach?: number;
  /** The back pitches forward toward the camera (px). */
  pitch?: number;
  /** Vibration marks on both sides. */
  buzz?: number;
  /** Green sparkles (お試し). */
  sparkle?: number;
}

/** Leather: bevelled shading, grain, and a soft sheen on the top of the bulge. */
function leather(p: PixelCanvas, m: Mask, base: number, bevel: number, seed: number): void {
  shade(p, m, LEATHER, { base, k: 0.72, bevel, dither: 0.28 });
  const bb = m.bbox();
  m.each((x, y) => {
    const n = hash2(x, y, seed);
    // pebbled grain: a few darker pits and pale flecks
    if (n < 0.035) p.set(x, y, LEATHER[3]);
    else if (n > 0.988) p.set(x, y, LEATHER[6]);
    // sheen band just under the top edge on the lit (left) half
    const ty = (y - bb.y) / Math.max(1, bb.h);
    const tx = (x - bb.x) / Math.max(1, bb.w);
    if (ty > 0.12 && ty < 0.22 && tx > 0.12 && tx < 0.55 && m.in(x, y - 2) && hash2(x, y, seed + 1) < 0.55) p.set(x, y, LEATHER[7]);
  });
}

/** Dashed stitching along a list of points. */
function stitch(p: PixelCanvas, pts: [number, number][], every = 3): void {
  pts.forEach(([x, y], i) => {
    if (i % every !== every - 1) p.set(Math.round(x), Math.round(y), STITCH);
  });
}

function build(o: MomiPose): PixelCanvas {
  const p = new PixelCanvas(W, H);
  const jx = o.jx ?? 0;
  const X = (v: number) => Math.round(v + OX + jx);
  const Y = (v: number) => Math.round(v + OY);
  const br = o.breathe ?? 0;
  const reach = o.reach ?? 0;
  const pitch = o.pitch ?? 0;
  const R = (x: number, y: number, w: number, h: number) => new Mask(W, H).rect(X(x), Y(y), w, h);

  // ---- chrome swivel feet ----
  for (const lx of [16, 52]) {
    p.rect(X(lx), Y(66), 4, 5, CHROME[2]);
    p.vline(X(lx), Y(66), Y(70), CHROME[4]);
    p.vline(X(lx + 3), Y(66), Y(70), CHROME[0]);
    p.rect(X(lx - 2), Y(70), 8, 2, CHROME[1]);
    p.hline(X(lx - 2), X(lx + 5), Y(70), CHROME[3]);
    p.set(X(lx - 1), Y(70), CHROME[4]);
  }

  // ---- foot massager: a rounded box with two padded foot slots ----
  const foot = R(20, 54, 32, 14);
  foot.sub(R(20, 54, 2, 2)).sub(R(50, 54, 2, 2)).sub(R(20, 66, 1, 2)).sub(R(51, 66, 1, 2));
  leather(p, foot, 0.5, 3, 31);
  for (const sx of [24, 38]) {
    const slot = new Mask(W, H).ellipse(X(sx + 5), Y(61), 5, 4.5);
    slot.each((x, y) => p.set(x, y, y < Y(59) ? LEATHER[0] : LEATHER[1]));
    // rows of massage nubs in the slot
    for (let i = 0; i < 3; i++) p.set(X(sx + 3 + i * 2), Y(62 + (i & 1)), PAD[3]);
    p.hline(X(sx + 2), X(sx + 8), Y(65), LEATHER[5]);
  }
  stitch(p, Array.from({ length: 28 }, (_, i) => [22 + i + OX + jx, 56 + OY] as [number, number]));

  // ---- backrest: three quilted channels (breathing 1px), seams with balls ----
  const bt = 13 - br + pitch;
  const back = new Mask(W, H);
  const channels: [number, number][] = [[15, 14], [29, 14], [43, 14]];
  channels.forEach(([cx0, cw]) => {
    const ch = R(cx0, bt, cw, 34 + br - pitch);
    ch.sub(R(cx0, bt, 2, 2)).sub(R(cx0 + cw - 2, bt, 2, 2));
    back.or(ch);
  });
  channels.forEach(([cx0, cw], i) => {
    const ch = R(cx0, bt, cw, 34 + br - pitch).and(back);
    shade(p, ch, LEATHER, { mode: 'cyl', cx: X(cx0 + cw / 2 - 1), rx: cw / 2 + 1, base: 0.52 + (i === 0 ? 0.08 : i === 2 ? -0.06 : 0), k: 0.62, dither: 0.28 });
    ch.each((x, y) => {
      const n = hash2(x, y, 40 + i);
      if (n < 0.035) p.set(x, y, LEATHER[3]);
      else if (n > 0.99) p.set(x, y, LEATHER[6]);
    });
    // a horizontal quilting tuck across each channel
    for (let x = cx0 + 1; x < cx0 + cw - 1; x++) {
      p.set(X(x), Y(bt + 17), LEATHER[1]);
      p.set(X(x), Y(bt + 18), LEATHER[5]);
    }
  });
  // seams between the channels, the massage balls rolling up and down
  const bo = o.balls ?? 0;
  for (const [sx, ph] of [[28, 0], [42, 3]] as [number, number][]) {
    for (let y = bt + 2; y < bt + 33 - pitch; y++) {
      p.set(X(sx), Y(y), LEATHER[0]);
      p.set(X(sx + 1), Y(y), LEATHER[0]);
    }
    for (let k = 0; k < 2; k++) {
      const by = bt + 5 + ((bo + ph + k * 4) % 8) * 3;
      const ball = new Mask(W, H).ellipse(X(sx + 1), Y(by), 2.6, 2.6);
      ball.each((x, y) => {
        const u = x - X(sx + 1) + (y - Y(by));
        p.set(x, y, u < -2 ? BALL[3] : u < 1 ? BALL[2] : u < 3 ? BALL[1] : BALL[0]);
      });
    }
  }
  // cracked leather showing the yellow foam
  const cy0 = bt + 8;
  p.line(X(49), Y(cy0), X(53), Y(cy0 + 3), LEATHER[0]);
  p.set(X(50), Y(cy0 + 1), '#F6D98A');
  p.set(X(51), Y(cy0 + 2), '#F6D98A');
  p.set(X(51), Y(cy0 + 1), '#FBE7A8');
  p.set(X(52), Y(cy0 + 2), '#D9B060');

  // ---- headrest pillow: button tufts = sleepy eyes, creases around them ----
  const hy = 9 - br + pitch;
  const hsz = pitch > 0 ? 1 : 0;
  const head = new Mask(W, H).ellipse(X(36), Y(hy), 16 + hsz, 8 + hsz).or(R(22, hy - 2, 28, 8));
  leather(p, head, 0.66, 4, 23);
  for (const ex of [30, 42]) {
    // creases fanning out from the tuft
    for (const [dx, dy] of [[-3, -2], [3, -2], [-3, 2], [3, 2]] as [number, number][]) p.line(X(ex + dx), Y(hy + dy), X(ex + Math.sign(dx)), Y(hy + Math.sign(dy)), LEATHER[3]);
    p.hline(X(ex - 1), X(ex + 1), Y(hy), LEATHER[0]);
    p.set(X(ex), Y(hy + 1), LEATHER[1]);
    p.set(X(ex - 1), Y(hy - 1), LEATHER[6]);
  }
  stitch(p, Array.from({ length: 30 }, (_, i) => {
    const a = Math.PI + (i / 29) * Math.PI;
    return [X(36) + Math.cos(a) * (14 + hsz), Y(hy) + Math.sin(a) * (6 + hsz)] as [number, number];
  }), 3);

  // ---- seat cushion with the front roll and stitching ----
  // the seat: a lighter top plane going back under the backrest, then the
  // plump front roll with its piping and stitching
  const seatTop = R(15, 42, 42, 5);
  shade(p, seatTop, LEATHER, { mode: 'flat', base: 0.74, k: 0, grad: 0.3, dither: 0.3 });
  for (let x = 16; x < 56; x++) if (hash2(x, 42, 5) < 0.3) p.set(X(x), Y(42), LEATHER[4]);
  const seat = R(14, 47, 44, 9);
  seat.sub(R(14, 47, 2, 1)).sub(R(56, 47, 2, 1));
  leather(p, seat, 0.6, 4, 27);
  for (let x = 16; x < 56; x++) {
    p.set(X(x), Y(47), LEATHER[6]);
    p.set(X(x), Y(54), LEATHER[2]);
    if (x % 3) p.set(X(x), Y(49), STITCH);
  }

  // ---- armrests: fat rolls with quilted air-bag pads (they reach on 強) ----
  const pads = o.pads ?? 0;
  for (const [ax0, side] of [[1, -1], [57, 1]] as [number, number][]) {
    const out = Math.round(reach * 6) * side;
    const down = Math.round(reach * 5);
    const ax = ax0 + out;
    // rolled arm: the top roll overhangs a little to the outside
    const arm = new Mask(W, H).rect(X(ax), Y(32), 14, 24 + down).or(new Mask(W, H).ellipse(X(ax + 7 + side), Y(32), 8, 4.5));
    arm.sub(R(ax, 55 + down, 1, 1)).sub(R(ax + 13, 55 + down, 1, 1));
    leather(p, arm, side < 0 ? 0.68 : 0.5, 4, 35 + side);
    // the roll's front end cap
    const cap = new Mask(W, H).ellipse(X(ax + 7 + side), Y(32), 7, 3.2);
    shade(p, cap, LEATHER, { mode: 'sphere', base: side < 0 ? 0.72 : 0.56, k: 0.6 });
    stitch(p, Array.from({ length: 12 }, (_, i) => [X(ax + 1 + i), Y(36)] as [number, number]));
    // quilted air-bag pad on the inner face
    const pw = 4 + pads + Math.round(reach * 2);
    const ph = 7 + pads + Math.round(reach * 2);
    const pcx = ax + 7 - side * 1;
    const pad = new Mask(W, H).ellipse(X(pcx), Y(45 + Math.round(down / 2)), pw, ph);
    shade(p, pad, PAD, { mode: 'sphere', base: 0.58, k: 0.6 });
    for (let yy = -ph + 2; yy < ph - 1; yy += 3) p.hline(X(pcx - pw + 2), X(pcx + pw - 2), Y(45 + Math.round(down / 2) + yy), PAD[1]);
  }

  // ---- お試し tag hanging from the left armrest ----
  const tagX = 3 + Math.round(reach * -6);
  p.line(X(tagX + 4), Y(33), X(tagX + 3), Y(37), '#C8C2B4');
  p.rect(X(tagX), Y(37), 7, 6, '#F6D98A');
  p.hline(X(tagX), X(tagX + 6), Y(37), '#FBE7A8');
  p.hline(X(tagX + 1), X(tagX + 5), Y(39), '#A8742A');
  p.hline(X(tagX + 1), X(tagX + 4), Y(41), '#C8904A');
  p.set(X(tagX + 1), Y(38), '#6A4A1A');

  // ---- the remote on its coiled cord, swaying like a tail ----
  const sway = [0, 1, 0, -1][(o.remote ?? 0) % 4];
  const ry = o.remoteUp ? 30 : 56;
  const rx = 69 + sway + Math.round(reach * 6);
  for (let i = 0; i < 14; i++) {
    const t = i / 13;
    const cxp = 68 + (rx - 68) * t + Math.sin(i * 1.7) * 1.2;
    const cyp = 46 + (ry - 46) * t;
    p.set(X(cxp), Y(cyp), K.outline);
    if (i % 2) p.set(X(cxp) + 1, Y(cyp), '#4A4466');
  }
  const remote = new Mask(W, H).rect(X(rx - 3), Y(ry), 6, 12);
  remote.sub(R(rx - 3, ry, 1, 1)).sub(R(rx + 2, ry, 1, 1));
  shade(p, remote, ['#A8A294', '#C8C2B4', '#E8E4D8', '#F8F4EA'], { base: 0.6, bevel: 2 });
  // the "強" button (red; glows #FF6A4D in strong mode), green, blue
  const g = !!o.glow;
  p.rect(X(rx - 2), Y(ry + 2), 2, 2, g ? '#FF6A4D' : '#E84E3C');
  p.set(X(rx - 2), Y(ry + 2), g ? '#FFD0C0' : '#FF8A7A');
  p.set(X(rx + 1), Y(ry + 3), '#5FA85A');
  p.set(X(rx + 1), Y(ry + 5), '#4AA8E0');
  p.hline(X(rx - 2), X(rx + 1), Y(ry + 9), '#A8A294');
  if (o.timer) {
    p.rect(X(rx - 2), Y(ry + 6), 4, 3, '#1A2A20');
    p.hline(X(rx - 1), X(rx), Y(ry + 7), '#7CFF9A');
  }
  if (o.ripple !== undefined) {
    // the leather's sheen ripples across (被弾)
    const r0 = 18 + (o.ripple % 2) * 10;
    for (let y = bt + 2; y < 44; y += 2) {
      const x = r0 + ((y / 2) % 4);
      if (back.in(X(x), Y(y))) p.set(X(x), Y(y), LEATHER[7]);
      if (back.in(X(x + 14), Y(y))) p.set(X(x + 14), Y(y), LEATHER[6]);
    }
  }
  p.outline(K.outline);
  rimLeft(p, K.rim, 0.5);
  // vibration marks (強) and green sparkles (お試し) outside the outline
  if (o.buzz !== undefined) {
    const b = o.buzz % 2;
    for (const [x, y] of [[-6, 20], [-7, 30], [-5, 40], [74 + 6, 22], [75 + 6, 32], [73 + 6, 42]] as [number, number][]) {
      p.vline(X(x + b), Y(y), Y(y + 4), '#FFF6D8');
      p.vline(X(x + 2 - b), Y(y + 1), Y(y + 3), '#FFE7A3');
    }
  }
  if (o.sparkle !== undefined) {
    for (const [x, y, ph] of [[8, 16, 0], [62, 12, 1], [70, 50, 2], [2, 48, 3]] as [number, number, number][]) {
      if ((o.sparkle + ph) % 4 > 1) continue;
      p.set(X(x), Y(y), '#E8FFD0');
      p.set(X(x - 1), Y(y), '#9BCB6B');
      p.set(X(x + 1), Y(y), '#9BCB6B');
      p.set(X(x), Y(y - 1), '#9BCB6B');
      p.set(X(x), Y(y + 1), '#9BCB6B');
    }
  }
  return p;
}

let restoredC: HTMLCanvasElement | null = null;
function restored(): HTMLCanvasElement {
  if (restoredC) return restoredC;
  const p = new PixelCanvas(18, 18);
  p.rect(4, 1, 10, 4, '#6E3A32');
  p.rect(3, 4, 12, 7, '#5A2E2A');
  p.rect(1, 7, 3, 6, '#4A2420');
  p.rect(14, 7, 3, 6, '#4A2420');
  p.rect(3, 10, 12, 4, '#6E3A32');
  p.rect(4, 14, 1, 3, '#C0C6CC');
  p.rect(13, 14, 1, 3, '#C0C6CC');
  // "お試し中止" tag
  p.rect(6, 6, 6, 4, '#F6D98A');
  p.hline(7, 10, 8, '#E23B2E');
  p.outline(K.outline);
  restoredC = p.toCanvas();
  return restoredC;
}

registerEnemyArt('enemy_momisugi', (): EnemyArt => {
  const cache = new Map<string, HTMLCanvasElement>();
  const get = (key: string, o: MomiPose) => {
    let c = cache.get(key);
    if (!c) {
      c = build(o).toCanvas();
      cache.set(key, c);
    }
    return c;
  };
  return {
    id: 'enemy_momisugi',
    w: W,
    h: H,
    ox: OX,
    oy: OY,
    frame(v: EnemyView): HTMLCanvasElement {
      const balls = loop(v.gt, 150, 8);
      const remote = loop(v.gt, 200, 4);
      const breathe = loop(v.gt, 900, 2);
      if (v.pose === 'hurt') return get(`hurt${loop(v.t, 80, 2)}`, { ripple: loop(v.t, 80, 2), balls, remote });
      const sk = v.skill;
      if ((v.pose === 'windup' || v.pose === 'attack') && sk === 'skill_momi_momi') {
        // the pads swell, the balls race, then the arms reach to grab
        const fast = loop(v.gt, 50, 8);
        const atk = v.pose === 'attack';
        return get(`momi${fast}${atk ? 1 : 0}`, { balls: fast, pads: atk ? 2 : 1, remote, reach: atk ? 0.6 : 0 });
      }
      if ((v.pose === 'windup' || v.pose === 'attack') && sk === 'skill_momi_kyou') {
        // 強: the remote flies up with the red button lit, the whole chair
        // shakes ±2px and buzzes; on the attack it pitches forward, arms out
        const j = loop(v.gt, 33, 2) ? 2 : -2;
        const atk = v.pose === 'attack';
        const bz = loop(v.gt, 50, 2);
        return get(`kyou${j}${bz}${atk ? 1 : 0}${loop(v.gt, 40, 8)}`, { remoteUp: true, glow: true, jx: j, balls: loop(v.gt, 40, 8), buzz: bz, reach: atk ? 1 : 0.3, pitch: atk ? 3 : 0, pads: atk ? 2 : 1 });
      }
      if ((v.pose === 'windup' || v.pose === 'attack') && sk === 'skill_momi_otameshi') {
        const sp = loop(v.gt, 120, 4);
        return get(`ota${balls}${sp}`, { timer: true, balls, remote: 0, sparkle: sp });
      }
      return get(`idle${balls}${remote}${breathe}`, { balls, remote, breathe });
    },
    restored,
    gallery: [
      { pose: 'idle' },
      { pose: 'windup', skill: 'skill_momi_momi' },
      { pose: 'attack', skill: 'skill_momi_momi' },
      { pose: 'windup', skill: 'skill_momi_kyou' },
      { pose: 'attack', skill: 'skill_momi_kyou' },
      { pose: 'windup', skill: 'skill_momi_otameshi' },
      { pose: 'hurt' },
    ],
  };
});
