// モミスギ (72×72): a leather massage chair with sleepy button-tuft eyes,
// massage balls peeking through the seams and a remote swaying like a tail (11.7).

import { PixelCanvas } from '../../engine/pixel';
import { hash2 } from '../../engine/rng';
import { registerEnemyArt, loop, type EnemyArt, type EnemyView } from './index';
import { K, Mask, ditherMask, rimLeft, shade } from './lib';

const W = 84;
const H = 84;
const OX = 6;
const OY = 8;

const LEATHER = ['#2A1418', '#3A1A18', '#4A2420', '#5A2E2A', '#6E3A32', '#8A4A3E', '#A0604E'];
const PAD = ['#3A1A18', '#4E2A26', '#6A3A34', '#7E4A40'];
const BALL = ['#A89880', '#D9C8B0', '#F4E6D8'];
const CHROME = ['#6B7186', '#9AA0A8', '#C0C6CC', '#F4F1E8'];

interface MomiPose {
  balls?: number;
  breathe?: number;
  pads?: number;
  remote?: number;
  remoteUp?: boolean;
  glow?: boolean;
  timer?: boolean;
  ripple?: number;
  jx?: number;
}

function leatherPart(p: PixelCanvas, m: Mask, base = 0.58, bevel = 3): void {
  shade(p, m, LEATHER, { base, k: 0.6, bevel, dither: 0.35 });
  // subtle grain + creases
  m.each((x, y) => {
    const n = hash2(x, y, 21);
    if (n < 0.03) p.set(x, y, LEATHER[2]);
    else if (n > 0.985) p.set(x, y, LEATHER[5]);
  });
}

function build(o: MomiPose): PixelCanvas {
  const p = new PixelCanvas(W, H);
  const jx = o.jx ?? 0;
  const X = (v: number) => v + OX + jx;
  const Y = (v: number) => v + OY;
  const br = o.breathe ?? 0;
  // chrome legs
  for (const lx of [14, 54]) {
    p.rect(X(lx), Y(66), 4, 6, CHROME[1]);
    p.vline(X(lx), Y(66), Y(71), CHROME[3]);
    p.vline(X(lx + 3), Y(66), Y(71), CHROME[0]);
    p.hline(X(lx - 1), X(lx + 4), Y(71), CHROME[0]);
  }
  // foot massager (front, 32×14) with slits
  const foot = new Mask(W, H).rect(X(20), Y(54), 32, 14);
  leatherPart(p, foot, 0.5, 2);
  for (const sx of [26, 36, 46]) {
    p.vline(X(sx), Y(57), Y(65), LEATHER[0]);
    p.vline(X(sx + 1), Y(57), Y(65), LEATHER[1]);
  }
  // backrest (40×30) with a breathing 1px
  const back = new Mask(W, H).rect(X(16), Y(14 - br), 40, 32 + br);
  back.sub(new Mask(W, H).rect(X(16), Y(14 - br), 2, 2)).sub(new Mask(W, H).rect(X(54), Y(14 - br), 2, 2));
  leatherPart(p, back, 0.6, 4);
  // seams + massage balls
  const bo = o.balls ?? 0;
  for (const [sx, ph] of [[27, 0], [43, 2]] as [number, number][]) {
    for (let y = 18; y < 38; y++) {
      p.set(X(sx), Y(y - br), LEATHER[0]);
      p.set(X(sx + 1), Y(y - br), LEATHER[0]);
    }
    for (let k = 0; k < 2; k++) {
      const by = 20 + ((bo + ph + k * 4) % 8) * 2.2;
      const ball = new Mask(W, H).ellipse(X(sx + 1), Y(Math.round(by) - br), 2.5, 2.5);
      ball.each((x, y) => {
        const u = (x - X(sx)) + (y - Y(Math.round(by) - br));
        p.set(x, y, u < -1 ? BALL[2] : u < 2 ? BALL[1] : BALL[0]);
      });
    }
  }
  // cracked leather showing yellow foam
  p.set(X(50), Y(22 - br), '#F6D98A');
  p.set(X(51), Y(23 - br), '#F6D98A');
  p.set(X(50), Y(23 - br), '#D9B060');
  p.line(X(49), Y(21 - br), X(52), Y(24 - br), LEATHER[1]);
  // headrest pillow (28×14) with two button tufts (sleepy eyes)
  const head = new Mask(W, H).ellipse(X(36), Y(9 - br), 15, 7.5);
  leatherPart(p, head, 0.66, 3);
  for (const ex of [30, 42]) {
    p.hline(X(ex - 1), X(ex + 1), Y(9 - br), LEATHER[0]);
    p.set(X(ex), Y(10 - br), LEATHER[1]);
    p.set(X(ex - 2), Y(8 - br), LEATHER[2]);
    p.set(X(ex + 2), Y(8 - br), LEATHER[2]);
  }
  // seat (44×12) with stitching
  const seat = new Mask(W, H).rect(X(14), Y(44), 44, 12);
  leatherPart(p, seat, 0.62, 3);
  for (let x = 16; x < 56; x += 3) p.hline(X(x), X(x + 1), Y(47), '#7A3E36');
  // armrests (12×26) with airbag pads
  const pads = o.pads ?? 0;
  for (const [ax, side] of [[3, -1], [57, 1]] as [number, number][]) {
    const arm = new Mask(W, H).rect(X(ax), Y(30), 12, 26);
    arm.sub(new Mask(W, H).rect(X(ax), Y(30), 1, 1)).sub(new Mask(W, H).rect(X(ax + 11), Y(30), 1, 1));
    leatherPart(p, arm, side < 0 ? 0.66 : 0.5, 3);
    const pad = new Mask(W, H).ellipse(X(ax + 6 - side * 1), Y(38), 3 + pads, 5 + pads);
    shade(p, pad, PAD, { mode: 'sphere', base: 0.55 });
  }
  // お試し tag on the left armrest
  p.line(X(6), Y(31), X(5), Y(35), '#C8C2B4');
  p.rect(X(2), Y(35), 6, 5, '#F6D98A');
  p.hline(X(3), X(6), Y(37), '#A8742A');
  p.set(X(2), Y(35), '#FBE7A8');
  // remote on a coiled cord from the right armrest, swaying like a tail
  const sway = [0, 1, 0, -1][(o.remote ?? 0) % 4];
  const ry = o.remoteUp ? 34 : 56;
  const rx = 66 + sway;
  for (let i = 0; i < 12; i++) {
    const t = i / 11;
    const cxp = 66 + (rx - 66) * t + Math.sin(i * 1.6) * 1;
    const cyp = 44 + (ry - 44) * t;
    p.set(X(Math.round(cxp)), Y(Math.round(cyp)), K.outline);
    if (i % 2) p.set(X(Math.round(cxp) + 1), Y(Math.round(cyp)), '#4A4466');
  }
  const remote = new Mask(W, H).rect(X(rx - 3), Y(ry), 6, 12);
  shade(p, remote, ['#A8A294', '#C8C2B4', '#E8E4D8', '#F8F4EA'], { base: 0.6, bevel: 2 });
  p.set(X(rx - 1), Y(ry + 3), o.glow ? '#FF6A4D' : '#E84E3C');
  p.set(X(rx), Y(ry + 3), o.glow ? '#FFB0A0' : '#E84E3C');
  p.set(X(rx - 1), Y(ry + 6), '#5FA85A');
  p.set(X(rx), Y(ry + 6), '#4AA8E0');
  if (o.timer) {
    p.rect(X(rx - 2), Y(ry + 8), 4, 2, '#1A2A20');
    p.set(X(rx - 1), Y(ry + 8), '#7CFF9A');
    p.set(X(rx), Y(ry + 8), '#7CFF9A');
  }
  if (o.ripple !== undefined) {
    // leather highlight ripples across (被弾)
    const rx0 = 16 + (o.ripple % 2) * 8;
    for (let y = 16; y < 44; y += 2) p.set(X(rx0 + ((y / 2) % 4)), Y(y), LEATHER[6]);
  }
  p.outline(K.outline);
  rimLeft(p, K.rim, 0.5);
  void ditherMask;
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
        const fast = loop(v.gt, 50, 8);
        return get(`momi${fast}${v.pose === 'attack' ? 1 : 0}`, { balls: fast, pads: v.pose === 'attack' ? 2 : 1, remote });
      }
      if ((v.pose === 'windup' || v.pose === 'attack') && sk === 'skill_momi_kyou') {
        const j = loop(v.gt, 33, 2) ? 2 : -2;
        return get(`kyou${j}${balls}`, { remoteUp: true, glow: true, jx: j, balls: loop(v.gt, 40, 8) });
      }
      if ((v.pose === 'windup' || v.pose === 'attack') && sk === 'skill_momi_otameshi') return get(`ota${balls}`, { timer: true, balls, remote: 0 });
      return get(`idle${balls}${remote}${breathe}`, { balls, remote, breathe });
    },
    restored,
    gallery: [
      { pose: 'idle' },
      { pose: 'windup', skill: 'skill_momi_momi' },
      { pose: 'attack', skill: 'skill_momi_momi' },
      { pose: 'windup', skill: 'skill_momi_kyou' },
      { pose: 'windup', skill: 'skill_momi_otameshi' },
      { pose: 'hurt' },
    ],
  };
});
