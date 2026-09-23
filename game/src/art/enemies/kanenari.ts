// カネナリくん: the retired town-mascot costume with a brass-bell head.
// Front battle sprite 48×64 (join battle, ノリツッコミ cut-ins) and the
// 40×48 back view used for PR-activity cut-ins (12.4).

import { PixelCanvas } from '../../engine/pixel';
import { hash2 } from '../../engine/rng';
import { registerEnemyArt, loop, type EnemyArt, type EnemyView } from './index';
import { K, Mask, ditherMask, rimLeft, shade } from './lib';

const BRASS = ['#6A4A1A', '#A8742A', '#C28C36', '#D9A441', '#E8BC62', '#F6D98A'];
const FUR = ['#8A4424', '#C8643A', '#DE7642', '#F2894B', '#F7A86A'];
const W = 56;
const H = 68;
const OX = 4;
const OY = 4;

interface FrontPose {
  sway?: number;
  /** Bell tilt toward the camera (bow) 0..2. */
  bow?: number;
  armL?: 'down' | 'up' | 'out' | 'wave1' | 'wave2' | 'mic' | 'point' | 'hold';
  armR?: 'down' | 'up' | 'out' | 'wave1' | 'wave2' | 'mic' | 'point' | 'hold';
  clapper?: number;
  squash?: number;
  glow?: number;
  /** Eyes closed happy ^^ */
  happy?: boolean;
  turned?: boolean;
}

/** Bell head (front) into p with its top-left at (x, y); 40×32 area. */
function bellFront(p: PixelCanvas, x: number, y: number, o: { bow: number; clapper: number; glow: number; happy: boolean; face: boolean }): void {
  const cx = x + 20;
  const bow = o.bow;
  const top = y + 3 + bow * 2;
  const lip = y + 30;
  const m = new Mask(p.w, p.h);
  for (let yy = top; yy <= lip; yy++) {
    const k = (yy - top) / (lip - top);
    let hw = 8 + 10.5 * Math.pow(k, 1.35);
    if (yy >= lip - 2) hw += 1.5;
    if (yy === top) hw -= 3;
    if (yy === top + 1) hw -= 1;
    for (let xx = Math.round(cx - hw); xx <= Math.round(cx + hw); xx++) m.set(xx, yy);
  }
  shade(p, m, BRASS, { mode: 'cyl', cx: cx - 1, rx: 20, base: 0.6, k: 0.75, grad: 0.12, dither: 0.5 });
  // lip ring (one step darker) and the dark mouth with the clapper
  for (let xx = cx - 19; xx <= cx + 19; xx++) {
    if (m.in(xx, lip)) p.set(xx, lip, BRASS[1]);
    if (m.in(xx, lip - 1)) p.set(xx, lip - 1, (xx - cx) < -12 ? BRASS[4] : BRASS[2]);
  }
  // specular streaks (left)
  for (let yy = top + 4; yy < lip - 4; yy++) {
    const k = (yy - top) / (lip - top);
    const hx = Math.round(cx - (6 + 8 * k));
    if (m.in(hx, yy)) p.set(hx, yy, '#FFF6D8');
    if ((yy & 3) === 0 && m.in(hx + 2, yy)) p.set(hx + 2, yy, BRASS[5]);
  }
  p.set(cx - 7, top + 4, '#FFFFFF');
  // hanging ring on top
  p.rect(cx - 2, top - 3, 4, 1, BRASS[1]);
  p.set(cx - 3, top - 2, BRASS[1]);
  p.set(cx + 2, top - 2, BRASS[1]);
  p.set(cx - 3, top - 1, BRASS[2]);
  p.set(cx + 2, top - 1, BRASS[0]);
  p.set(cx - 2, top - 3, BRASS[4]);
  // band ring around the shoulder of the bell
  const band = top + 6;
  for (let xx = cx - 17; xx <= cx + 17; xx++) if (m.in(xx, band)) p.set(xx, band, xx < cx - 6 ? BRASS[4] : BRASS[1]);
  if (o.face) {
    const ey = top + 12 - bow;
    if (o.happy) {
      for (const ex of [cx - 6, cx + 5]) {
        p.set(ex - 1, ey + 1, '#2A1E1A');
        p.set(ex, ey, '#2A1E1A');
        p.set(ex + 1, ey + 1, '#2A1E1A');
      }
    } else {
      p.rect(cx - 7, ey, 2, 3, '#2A1E1A');
      p.rect(cx + 5, ey, 2, 3, '#2A1E1A');
      p.set(cx - 7, ey, '#5A3A2A');
      p.set(cx + 5, ey, '#5A3A2A');
    }
    p.rect(cx - 11, ey + 5, 4, 2, '#F08A7A');
    p.rect(cx + 7, ey + 5, 4, 2, '#F08A7A');
    p.set(cx - 11, ey + 5, '#F7B0A0');
  }
  if (o.glow) {
    // soft glow on the crown
    ditherMask(p, new Mask(p.w, p.h).ellipse(cx - 4, top + 5, 10, 5).and(m), '#FFF6D8', 0.35 * o.glow);
  }
}

function fur(p: PixelCanvas, m: Mask, seed: number): void {
  shade(p, m, FUR, { mode: 'sphere', base: 0.6, k: 0.6, dither: 0.5 });
  // fluffy tufts: small lighter curls and a dithered fuzzy edge
  m.each((x, y) => {
    const n = hash2(x, y, seed);
    const edge = !m.in(x - 1, y) || !m.in(x + 1, y) || !m.in(x, y - 1) || !m.in(x, y + 1);
    if (edge && n < 0.35) p.set(x, y, 'transparent');
    else if (!edge && n > 0.93) p.set(x, y, FUR[4]);
    else if (!edge && n < 0.05) p.set(x, y, FUR[1]);
  });
}

function mitten(p: PixelCanvas, x: number, y: number, up = false): void {
  const m = new Mask(p.w, p.h).ellipse(x, y, 3.5, up ? 4 : 3.5);
  shade(p, m, FUR, { mode: 'sphere', base: 0.62 });
  p.set(Math.round(x + (up ? 0 : 2)), Math.round(y - 3), FUR[4]);
}

function buildFront(o: FrontPose): PixelCanvas {
  const p = new PixelCanvas(W, H);
  const X = (v: number) => v + OX;
  const Y = (v: number) => v + OY;
  const sway = o.sway ?? 0;
  const sq = o.squash ?? 0;
  // feet
  for (const fx of [16, 29]) {
    const f = new Mask(W, H).ellipse(X(fx + 1), Y(61), 5, 2.6);
    shade(p, f, ['#6A3420', '#8A4424', '#C8643A', '#DE7642'], { mode: 'sphere', base: 0.55 });
  }
  // body
  const body = new Mask(W, H).ellipse(X(24 + sway * 0.5), Y(45 + sq), 17, 14 - sq);
  fur(p, body, 7);
  // tummy lighter patch
  ditherMask(p, new Mask(W, H).ellipse(X(22 + sway * 0.5), Y(47 + sq), 9, 7).and(body), FUR[4], 0.35);
  // sash: left shoulder → right hip
  for (let i = 0; i < 30; i++) {
    const t = i / 29;
    const sx = Math.round(X(10 + sway * 0.5) + t * 24);
    const sy = Math.round(Y(33 + sq) + t * 20);
    for (let w = 0; w < 4; w++) {
      if (!body.in(sx + w, sy)) continue;
      const stripe = i % 7 === 3 && w > 0 && w < 3;
      p.set(sx + w, sy, stripe ? '#E84E3C' : w === 3 ? '#C8C2B4' : '#F4F1E8');
    }
  }
  // arms / mittens
  const armPos = (side: -1 | 1, a: FrontPose['armL']): [number, number, boolean] => {
    const bx = 24 + sway * 0.5 + side * 17;
    switch (a) {
      case 'up':
        return [bx + side * 2, 24, true];
      case 'out':
        return [bx + side * 6, 38, false];
      case 'wave1':
        return [bx + side * 4, 26, true];
      case 'wave2':
        return [bx + side * 7, 28, true];
      case 'mic':
        return [24 + side * 4, 36, true];
      case 'point':
        return [16, 38, false];
      case 'hold':
        return [bx - side * 3, 38, false];
      default:
        return [bx, 46, false];
    }
  };
  for (const side of [-1, 1] as const) {
    const [ax, ay, up] = armPos(side, side < 0 ? o.armL : o.armR);
    // short arm tube
    const arm = new Mask(W, H).line(X(24 + side * 13 + sway * 0.5), Y(40 + sq), X(ax), Y(ay), 3);
    shade(p, arm, FUR, { base: 0.58 });
    mitten(p, X(ax), Y(ay), up);
  }
  // bell head
  bellFront(p, X(4 + sway), Y(0 + sq), { bow: o.bow ?? 0, clapper: o.clapper ?? 0, glow: o.glow ?? 0, happy: !!o.happy, face: !o.turned });
  // clapper peeking under the lip
  const clx = X(24 + sway + (o.clapper ?? 0));
  const cly = Y(31 + sq);
  p.rect(clx - 1, cly, 3, 2, '#6A4A1A');
  p.set(clx - 1, cly, '#A8742A');
  p.outline(K.outline);
  rimLeft(p, K.rim, 0.5);
  return p;
}

// ---- back view (40×48, PR cut-ins) -----------------------------------------------------

const BW = 44;
const BH = 52;

function buildBack(frame: string): PixelCanvas {
  const p = new PixelCanvas(BW, BH);
  const ox = 2;
  const oy = 2;
  let bow = 0;
  let squash = 0;
  let armR: 'down' | 'up' | 'hit' = 'down';
  let lean = 0;
  let step = 0;
  switch (frame) {
    case 'step':
      squash = 2;
      step = 1;
      break;
    case 'run':
      lean = 2;
      step = 2;
      break;
    case 'slam':
      lean = 3;
      squash = 1;
      break;
    case 'ring':
      lean = -1;
      break;
    case 'hit':
      armR = 'hit';
      break;
    case 'raise':
      armR = 'up';
      break;
    case 'bow1':
      bow = 1;
      break;
    case 'bow2':
      bow = 2;
      break;
    case 'bow3':
      bow = 3;
      break;
    case 'walk1':
      step = 1;
      break;
    case 'walk2':
      step = 2;
      break;
  }
  const X = (v: number) => v + ox;
  const Y = (v: number) => v + oy;
  // feet (soles visible from behind)
  const fo = step === 1 ? 1 : step === 2 ? -1 : 0;
  for (const [fx, d] of [[12, fo], [26, -fo]] as [number, number][]) {
    const f = new Mask(BW, BH).ellipse(X(fx + 1), Y(45 - Math.max(0, d)), 4.5, 2.4);
    shade(p, f, ['#6A3420', '#8A4424', '#C8643A'], { base: 0.5 });
  }
  // fluffy back
  const body = new Mask(BW, BH).ellipse(X(20 + lean * 0.5), Y(33 + squash), 16, 13 - squash);
  fur(p, body, 3);
  // zipper, slightly open: pitch-dark inside
  const zx = X(20 + lean * 0.5);
  for (let yy = Y(22 + squash); yy < Y(44); yy++) {
    if (!body.in(zx, yy)) continue;
    p.set(zx, yy, '#C0C6CC');
    p.set(zx + 1, yy, (yy & 1) ? '#9AA0A8' : '#C0C6CC');
  }
  p.rect(zx - 1, Y(25 + squash), 2, 6, '#0B0B14');
  p.set(zx + 1, Y(24 + squash), '#E8ECF0');
  p.rect(zx + 1, Y(31 + squash), 2, 3, '#C0C6CC');
  // arms
  const armL = new Mask(BW, BH).line(X(6 + lean), Y(30 + squash), X(3 + lean), Y(38), 3);
  shade(p, armL, FUR, { base: 0.62 });
  mitten(p, X(3 + lean), Y(39));
  if (armR === 'hit' || armR === 'up') {
    const hy = armR === 'hit' ? 6 : 10;
    const armRm = new Mask(BW, BH).line(X(33 + lean), Y(28), X(35), Y(hy + 4), 3);
    shade(p, armRm, FUR, { base: 0.5 });
    mitten(p, X(35), Y(hy + 3), true);
  } else {
    const armRm = new Mask(BW, BH).line(X(34 + lean), Y(30 + squash), X(37 + lean), Y(38), 3);
    shade(p, armRm, FUR, { base: 0.5 });
    mitten(p, X(37 + lean), Y(39));
  }
  // bell head from behind (no face), tilting forward when bowing
  const cx = X(20 + lean);
  const top = Y(1 + bow * 3 + squash);
  const lip = Y(24 + squash + (bow ? 1 : 0));
  const m = new Mask(BW, BH);
  for (let yy = top; yy <= lip; yy++) {
    const k = (yy - top) / Math.max(1, lip - top);
    let hw = 7 + 9 * Math.pow(k, 1.35);
    if (yy >= lip - 1) hw += 1;
    if (yy === top) hw -= 2;
    for (let xx = Math.round(cx - hw); xx <= Math.round(cx + hw); xx++) m.set(xx, yy);
  }
  shade(p, m, BRASS, { mode: 'cyl', cx: cx - 1, rx: 17, base: 0.55, k: 0.75, dither: 0.5 });
  for (let yy = top + 3; yy < lip - 3; yy++) {
    const hx = Math.round(cx - (5 + 7 * ((yy - top) / (lip - top))));
    if (m.in(hx, yy)) p.set(hx, yy, '#FFF6D8');
  }
  for (let xx = cx - 16; xx <= cx + 16; xx++) if (m.in(xx, lip)) p.set(xx, lip, BRASS[1]);
  const band = top + 5;
  for (let xx = cx - 14; xx <= cx + 14; xx++) if (m.in(xx, band)) p.set(xx, band, xx < cx - 5 ? BRASS[4] : BRASS[1]);
  if (!bow) {
    p.rect(cx - 2, top - 3, 4, 1, BRASS[1]);
    p.set(cx - 3, top - 2, BRASS[1]);
    p.set(cx + 2, top - 2, BRASS[0]);
  }
  if (frame === 'ring') {
    // the bell sways after the impact
    p.set(cx + 17, top + 8, '#FFF6D8');
    p.set(cx + 18, top + 10, '#FFF6D8');
  }
  p.outline(K.outline);
  rimLeft(p, K.rim, 0.5);
  return p;
}

const backCache = new Map<string, HTMLCanvasElement>();
/** Back view (for PR / tackle cut-ins). Frames: idle step run slam ring hit raise bow1-3 walk1-2. */
export function kanenariBack(frame: string): HTMLCanvasElement {
  let c = backCache.get(frame);
  if (!c) {
    c = buildBack(frame).toCanvas();
    backCache.set(frame, c);
  }
  return c;
}

const frontCache = new Map<string, HTMLCanvasElement>();
function front(key: string, o: FrontPose): HTMLCanvasElement {
  let c = frontCache.get(key);
  if (!c) {
    c = buildFront(o).toCanvas();
    frontCache.set(key, c);
  }
  return c;
}

/** Front battle sprite for cut-ins (ノリツッコミ boke): 'sing' | 'flag' | 'flip' | 'idle'. */
export function kanenariFront(pose: string, t: number): HTMLCanvasElement {
  const f = loop(t, 140, 2);
  if (pose === 'sing') return front(`sing${f}`, { armL: 'mic', armR: f ? 'up' : 'out', sway: f ? 1 : -1, clapper: f ? 1 : -1, happy: true });
  if (pose === 'flag') return flagFrame(f);
  if (pose === 'flip') return front(`flip${f}`, { armL: 'hold', armR: 'hold', sway: 0, clapper: f ? 1 : 0 });
  return front('idle0', {});
}

function flagFrame(f: number): HTMLCanvasElement {
  const key = 'flag' + f;
  let c = frontCache.get(key);
  if (c) return c;
  const base = buildFront({ armL: 'down', armR: 'up', sway: f ? 1 : 0, clapper: f ? 1 : -1, happy: true });
  // nobori flag on a pole held up in the right mitten
  const p = new PixelCanvas(W + 16, H);
  p.blit(base, 0, 0);
  const px = 44;
  p.vline(px, 2, 30, '#8A6A4A');
  p.vline(px + 1, 2, 30, '#C8A06A');
  const wave = f ? 1 : -1;
  for (let y = 4; y < 26; y++) {
    const off = Math.round(Math.sin(y / 4 + f) * wave);
    for (let x = 0; x < 10; x++) {
      const edge = x === 0 || x === 9 || y === 4 || y === 25;
      p.set(px + 2 + x + off, y, edge ? '#E84E3C' : '#F4F1E8');
    }
    if (y % 5 === 2) p.hline(px + 4 + off, px + 8 + off, y, '#E84E3C');
  }
  p.outline(K.outline);
  c = p.toCanvas();
  frontCache.set(key, c);
  return c;
}

let restoredC: HTMLCanvasElement | null = null;

registerEnemyArt('enemy_kanenari', (): EnemyArt => ({
  id: 'enemy_kanenari',
  w: W,
  h: H,
  ox: OX,
  oy: OY,
  frame(v: EnemyView): HTMLCanvasElement {
    const sway = [0, 1, 0, -1][loop(v.gt, 220, 4)];
    const clap = [0, 1, 0, -1][loop(v.gt, 160, 4)];
    switch (v.pose) {
      case 'windup':
      case 'attack': {
        if (v.skill === 'skill_kn_fuusen') return front(`fuu${v.t > 300 ? 1 : 0}`, { armL: v.t > 300 ? 'up' : 'out', armR: 'out', clapper: clap });
        if (v.skill === 'skill_kn_goaisatsu') return front(`bow${v.t > 200 ? 2 : 1}`, { bow: v.t > 200 ? 2 : 1, armL: 'down', armR: 'down', squash: 1 });
        const kind = (v.params?.pose ?? 0) % 3;
        if (kind === 0) return front('pose0', { armL: 'up', armR: 'up', happy: true, clapper: clap });
        if (kind === 1) return front('pose1', { armL: 'point', armR: 'out', clapper: clap });
        const spin = loop(v.t, 90, 4);
        return spin === 2 ? front('spin', { turned: true, armL: 'out', armR: 'out' }) : front(`posesp${spin}`, { armL: 'out', armR: 'out', sway: spin - 1 });
      }
      case 'fan': {
        const f = loop(v.t, 100, 2);
        return front(`fan${f}`, { armL: 'up', armR: 'up', happy: true, squash: f ? 1 : 0 });
      }
      case 'seen':
        return front(`seen${loop(v.gt, 300, 2)}`, { happy: true, glow: 1, armL: 'down', armR: 'down' });
      case 'hurt':
        return front('hurt', { squash: 1, happy: true });
      default: {
        // occasionally waves at nobody
        const cyc = v.gt % 5200;
        if (cyc > 3600 && cyc < 4400) {
          const w = loop(cyc, 110, 4);
          return front(`wave${w}${sway}`, { armR: w % 2 ? 'wave1' : 'wave2', sway, clapper: clap });
        }
        return front(`idle${sway}${clap}`, { sway, clapper: clap });
      }
    }
  },
  restored() {
    if (!restoredC) restoredC = kanenariBack('idle');
    return restoredC;
  },
  gallery: [
    { pose: 'idle' },
    { pose: 'windup', skill: 'skill_kn_fuusen', t: 400 },
    { pose: 'windup', skill: 'skill_kn_goaisatsu', t: 300 },
    { pose: 'windup', skill: 'skill_kn_pose', t: 0 },
    { pose: 'fan' },
    { pose: 'seen' },
  ],
}));
