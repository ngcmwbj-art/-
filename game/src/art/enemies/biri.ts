// ビリビリ番 (56×48, 51 8.3): one section of the boar fence come to life.
// Two thin FRP posts for legs with black caps, two runs of white-and-black
// polywire held on black insulators, the yellow 「危険 電気さく」 sign hung on
// the top wire for a face (three black lines of lettering nobody can read
// from here, two dots for eyes), the energiser box with its little solar
// panel on its back and the green 通電 lamp blinking once a second, and the
// earth rod on its green wire. A point of light runs along the wires every
// second (drawn live over the sprite). Lit by the lantern low on the left.

import type { Gfx } from '../../engine/gfx';
import { PixelCanvas } from '../../engine/pixel';
import { registerEnemyArt, loop, type EnemyArt, type EnemyView } from './index';
import { Mask } from './lib';
import { INK, nightFinish, nshade } from './night';

const W = 72;
const H = 64;
const OX = 8;
const OY = 10;

const POST = ['#6B7186', '#9AA0A8', '#C8C2B4', '#E8E4D8', '#F4F1E8'];
const SIGN = ['#B8862A', '#D9A441', '#F0BC3A', '#FFD23F', '#FFE27A'];
const BOX = ['#4A4F58', '#6B7186', '#8E95A6', '#B8BECC'];

interface Pose {
  /** Sign turned full on (kinshi): 0 normal, 1 bigger (1.3×). */
  signBig?: number;
  /** Sign frame flashes red. */
  red?: boolean;
  signTilt?: number;
  /** Wires sag (px) and sway (−1..1). */
  sag?: number;
  sway?: number;
  /** Lamp: 0 off, 1 on, 2 bright. */
  lamp: number;
  /** Sparks on the post heads (hurt). */
  sparks?: boolean;
  /** Bowed sign (rest). */
  droop?: boolean;
  eyes?: 'dot' | 'shut' | 'wide';
}

/** Wire y at x (0..56 logical) with sag/sway. */
function wireY(base: number, x: number, sag: number, sway: number): number {
  const k = Math.sin(((x - 10) / 36) * Math.PI);
  return base + Math.round((sag + sway * 2) * Math.max(0, k));
}

function build(o: Pose): PixelCanvas {
  const p = new PixelCanvas(W, H);
  const X = (v: number) => Math.round(v + OX);
  const Y = (v: number) => Math.round(v + OY);
  const sag = o.sag ?? 0;
  const sway = o.sway ?? 0;
  // ---- the energiser box and its panel, behind (upper right) ----
  const box = new Mask(W, H).rect(X(39), Y(4), 12, 9);
  nshade(p, box, BOX, { base: 0.55 });
  p.hline(X(39), X(50), Y(4), '#B8BECC');
  // the solar panel leaning back on top
  for (let y = 0; y < 5; y++) for (let x = 0; x < 14; x++) p.set(X(38 + x + (4 - y) * 0), Y(-1 + y), (x % 4 === 3 || y === 2) ? '#4AA8E0' : '#2F4A8A');
  p.hline(X(38), X(51), Y(-1), '#6A8AC8');
  // the 通電 lamp
  const lampC = o.lamp === 0 ? '#2E5A3A' : o.lamp === 2 ? '#C8FFD8' : '#7CFF9A';
  p.rect(X(41), Y(7), 2, 2, lampC);
  if (o.lamp > 0) p.set(X(41), Y(7), '#FFFFFF');
  // a little dial
  p.rect(X(46), Y(7), 3, 3, '#2A2440');
  p.set(X(47), Y(8), '#FFD23F');
  // ---- the earth rod and its green wire ----
  p.vline(X(52), Y(30), Y(46), '#9AA0A8');
  p.vline(X(53), Y(30), Y(46), '#6B7186');
  p.set(X(52), Y(30), '#C8CDD4');
  for (let y = 12; y < 32; y++) p.set(X(50 + Math.round(Math.sin(y / 3) * 1)), Y(y), '#5FA85A');
  // ---- the two posts (FRP), black caps ----
  for (const px of [10, 46]) {
    const post = new Mask(W, H).rect(X(px - 1), Y(12), 2, 35);
    nshade(p, post, POST, { mode: 'cyl', cx: X(px), rx: 1.5, base: 0.6, k: 0.6 });
    p.rect(X(px - 1), Y(10), 3, 3, INK);
    p.set(X(px - 1), Y(10), '#4A4460');
    // a little foot of earth
    p.hline(X(px - 3), X(px + 2), Y(47), '#4A3A2A');
    p.hline(X(px - 2), X(px + 1), Y(46), '#6B5A4A');
    if (o.sparks) {
      for (const [dx, dy] of [[-2, -2], [2, -3], [0, -4], [3, -1]] as [number, number][]) p.set(X(px + dx), Y(10 + dy), '#FFD23F');
      p.set(X(px), Y(7), '#FFF6D8');
    }
  }
  // ---- the two runs of polywire, white twisted with black ----
  for (const base of [22, 34]) {
    for (let x = 4; x <= 52; x++) {
      const y = Y(wireY(base, x, sag, sway));
      p.set(X(x), y, (x % 3 === 0) ? INK : '#E8E4D8');
      p.set(X(x), y + 1, '#6B7186');
    }
    // insulators on the posts
    for (const px of [10, 46]) p.rect(X(px - 1), Y(base - 1), 3, 3, INK);
  }
  // ---- the sign on the top wire: the face ----
  const big = o.signBig ?? 0;
  const sw = Math.round(20 + big * 6);
  const sh = Math.round(14 + big * 4);
  const tilt = o.signTilt ?? 0;
  const sx = X(28 - sw / 2) + tilt;
  const sy = Y(wireY(22, 28, sag, sway) - 2 + (o.droop ? 2 : 0));
  const sign = new Mask(W, H).rect(sx, sy, sw, sh);
  nshade(p, sign, SIGN, { base: 0.62, k: 0.5, dither: 0.3 });
  const frame = o.red ? '#E84E3C' : INK;
  for (let x = sx; x < sx + sw; x++) {
    p.set(x, sy, frame);
    p.set(x, sy + sh - 1, frame);
  }
  for (let y = sy; y < sy + sh; y++) {
    p.set(sx, y, frame);
    p.set(sx + sw - 1, y, frame);
  }
  // hooks over the wire
  p.set(sx + 3, sy - 1, '#9AA0A8');
  p.set(sx + sw - 4, sy - 1, '#9AA0A8');
  // the eyes above three lines of lettering (it has the shape of words)
  const ex = [sx + Math.round(sw * 0.32), sx + Math.round(sw * 0.62)];
  const ey = sy + 3 + (o.droop ? 1 : 0);
  for (const e of ex) {
    if (o.eyes === 'shut') p.hline(e, e + 2, ey + 1, INK);
    else if (o.eyes === 'wide') {
      p.rect(e, ey, 3, 3, INK);
      p.set(e, ey, '#FFF6D8');
    } else p.rect(e, ey, 2, 2, INK);
  }
  for (let k = 0; k < 3; k++) {
    const ly = ey + 5 + k * (big ? 3 : 2);
    if (ly >= sy + sh - 1) break;
    const lw = [sw - 6, sw - 9, sw - 7][k];
    for (let x = 0; x < lw; x++) if ((x + k) % 5 !== 4) p.set(sx + 3 + x, ly, INK);
  }
  nightFinish(p, 0.5, 0.45, (x, y) => (x === X(41) || x === X(42)) && (y === Y(7) || y === Y(8)));
  return p;
}

let restoredC: HTMLCanvasElement | null = null;
/** Back in the fence line (32×16): a straight section, its sign the right way up. */
function restored(): HTMLCanvasElement {
  if (restoredC) return restoredC;
  const p = new PixelCanvas(32, 18);
  for (const x of [3, 28]) {
    p.vline(x, 2, 17, '#E8E4D8');
    p.set(x, 1, INK);
  }
  for (const y of [6, 11]) for (let x = 0; x < 32; x++) p.set(x, y, x % 3 === 0 ? INK : '#E8E4D8');
  p.rect(12, 3, 8, 6, '#FFD23F');
  p.hline(13, 18, 5, INK);
  p.hline(13, 17, 7, INK);
  p.outline(INK);
  restoredC = p.toCanvas();
  return restoredC;
}

registerEnemyArt('enemy_biribiri_ban', (): EnemyArt => {
  const cache = new Map<string, HTMLCanvasElement>();
  const get = (o: Pose): HTMLCanvasElement => {
    const key = JSON.stringify(o);
    let c = cache.get(key);
    if (!c) {
      c = build(o).toCanvas();
      cache.set(key, c);
    }
    return c;
  };
  const charged = (v: EnemyView) => (v.flags.atkUp ?? 0) >= 1;
  return {
    id: 'enemy_biribiri_ban',
    w: W,
    h: H,
    ox: OX,
    oy: OY,
    frame(v: EnemyView): HTMLCanvasElement {
      const blink = v.gt % 1000 < 500 ? 1 : 0;
      const lamp = charged(v) ? 2 : blink;
      if (v.flags.kyuukei || v.pose === 'rest') return get({ lamp: 0, sag: 2, droop: true, eyes: 'shut' });
      if (v.pose === 'hurt') {
        // the wires wobble three times, dying away; sparks off the post heads
        const k = Math.min(3, Math.floor(v.t / 60));
        return get({ lamp, sway: [1, -1, 0.5, 0][k], sparks: k < 2, eyes: 'wide' });
      }
      if (v.pose === 'sign' || ((v.pose === 'windup' || v.pose === 'attack') && v.skill === 'skill_biri_kinshi')) {
        const k = Math.min(3, Math.floor(v.t / 110));
        return get({ lamp, signBig: k >= 1 ? 1 : 0.5, red: k === 1 || k === 3, eyes: 'wide' });
      }
      if (v.pose === 'pulse' || ((v.pose === 'windup' || v.pose === 'attack') && v.skill === 'skill_biri_pulse')) {
        return get({ lamp: 2, sway: loop(v.t, 80, 2) ? 0.5 : 0, eyes: 'wide' });
      }
      if (v.pose === 'charge' || ((v.pose === 'windup' || v.pose === 'attack') && v.skill === 'skill_biri_tsuden')) return get({ lamp: 2, eyes: 'dot' });
      if (v.pose === 'refuse') return get({ lamp, signTilt: loop(v.t, 100, 2) ? -2 : 2, eyes: 'shut' });
      if (v.pose === 'idleact') return get({ lamp, sag: 1, eyes: 'shut' });
      // idle: the sign sways 1px
      return get({ lamp, signTilt: loop(v.gt, 600, 2), eyes: 'dot' });
    },
    over(g: Gfx, x: number, y: number, v: EnemyView): void {
      if (v.flags.kyuukei || v.pose === 'rest') return;
      const ch = charged(v);
      const ctx = g.ctx;
      // 夜間通電中: the whole run glows (#7CFF9A α40%)
      if (ch) {
        g.alpha(0.4, () => {
          for (const base of [22, 34]) for (let lx = 4; lx <= 52; lx++) g.rect(x + OX + lx, y + OY + wireY(base, lx, 0, 0) - 1, 1, 3, '#7CFF9A');
        });
      }
      // the pulse: a point of cream with a green tail, left → right each second
      const per = ch ? 500 : 1000;
      const k = (v.gt % per) / per;
      const px = Math.round(4 + k * 60);
      for (const base of [22, 34]) {
        for (let tI = 0; tI < 6; tI++) {
          const lx = px - tI;
          if (lx < 4 || lx > 52) continue;
          ctx.globalAlpha = (1 - tI / 6) * 0.9;
          g.rect(x + OX + lx, y + OY + wireY(base, lx, 0, 0), 1, 1, tI === 0 ? '#FFF6D8' : '#7CFF9A');
        }
        ctx.globalAlpha = 1;
      }
    },
    restored,
    gallery: [
      { pose: 'idle' },
      { pose: 'sign', t: 150 },
      { pose: 'pulse', t: 0 },
      { pose: 'charge', flags: { atkUp: 1 } },
      { pose: 'hurt', t: 0 },
      { pose: 'rest', flags: { kyuukei: 1 } },
    ],
  };
});
