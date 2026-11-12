// スネトマト (40×40, 51 8.1): a big green tomato off the 3号ハウス vines,
// sulking because only the red ones get looked at. A wide, taut fruit with
// three shallow ribs, a star-shaped calyx tipped like a crown, a frayed bit
// of the twine it was trained on, a pouting little face — and its smooth
// back, which is what you mostly see of it. The star mark on its bottom
// shows only as it rolls. Lit by the lantern low on the left (51 8.0).
//
// Poses: idle (front 3f×200ms / back 2f×400ms with a glance at the light),
// turn (すねる: a 3px hop, side → back), roll (4f spin, the star mark on the
// 2nd), tremble (青くさい), hurt, rest (sits, eyes shut), refuse, turnFront.

import { BAYER4, PixelCanvas } from '../../engine/pixel';
import { hash2 } from '../../engine/rng';
import { registerEnemyArt, loop, type EnemyArt, type EnemyView } from './index';
import { Mask, mixU32 } from './lib';
import { INK, nightFinish, nshade, tintTop } from './night';

const W = 52;
const H = 58;
const OX = 6;
const OY = 12;

/** Green fruit, dark → light (deep shadow #1E4A34 … highlight #9BCB6B). */
const FRUIT = ['#1E4A34', '#265A3E', '#2E6B4A', '#3F7F4C', '#4F964F', '#5FA85A', '#7DBB62', '#9BCB6B'];
const CALYX = ['#1E4A34', '#2E6B4A', '#3FA66B', '#5FBF7E'];

interface Pose {
  view: 'front' | 'side' | 'back';
  /** Squash (px taken off the height, added to the width). */
  sq?: number;
  hop?: number;
  dx?: number;
  eyes?: 'open' | 'closed' | 'wide' | 'glance';
  /** Roll frame 0..3 (the ribs travel round; 1 shows the star mark). */
  roll?: number;
  /** Seen: the top third keeps a faint orange (照れ). */
  blush?: boolean;
  /** The calyx pops up (hurt). */
  calyxUp?: number;
  /** Back view hurt: a white streak across the smooth face. */
  streak?: boolean;
  /** Leaning forward (the sulk). */
  hunch?: number;
  /** Sitting (rest): sunk 2px. */
  sit?: boolean;
  mouth?: 'pout' | 'o' | 'flat';
}

function build(o: Pose): PixelCanvas {
  const p = new PixelCanvas(W, H);
  const X = (v: number) => Math.round(v + OX + (o.dx ?? 0));
  const Y = (v: number) => Math.round(v + OY - (o.hop ?? 0) + (o.sit ? 2 : 0));
  const sq = o.sq ?? 0;
  const cx = 20;
  const cy = 24 + sq * 0.5;
  const rx = 17 + sq * 0.6;
  const ry = 15 - sq * 0.5;
  const hunch = o.hunch ?? 0;
  // ---- the fruit (a little wider than tall, flattened at the bottom) ----
  const m = new Mask(W, H);
  for (let y = Math.floor(cy - ry - 1); y <= Math.ceil(cy + ry + 1); y++) {
    const dy = (y + 0.5 - cy) / ry;
    if (Math.abs(dy) > 1) continue;
    // the lower half is a touch flatter; the top leans forward when it sulks
    let hw = rx * Math.sqrt(1 - dy * dy) * (dy > 0.6 ? 1 - (dy - 0.6) * 0.18 : 1);
    if (dy < -0.6) hw *= 0.96;
    const lean = Math.round(hunch * Math.max(0, -dy));
    for (let x = Math.floor(cx - hw); x <= Math.ceil(cx + hw); x++) m.set(X(x - lean), Y(y));
  }
  nshade(p, m, FRUIT, { mode: 'sphere', cx: X(cx - 2), cy: Y(cy + 1), rx: rx + 2, ry: ry + 2, base: 0.52, k: 0.7, dither: 0.45 });
  // three shallow ribs (the 筋): lobes running down from the calyx, strongest
  // at the shoulders, fading toward the belly; they travel round as it rolls
  const roll = o.roll ?? -1;
  const ribPhase = roll >= 0 ? roll * 0.22 : o.view === 'side' ? 0.3 : 0;
  for (let i = 0; i < 4; i++) {
    const u = (((i + 0.5) / 4 + ribPhase) % 1) * 2 - 1; // −1..1 across the face
    if (Math.abs(u) > 0.86) continue;
    for (let y = Math.floor(cy - ry + 2); y <= Math.ceil(cy + ry * 0.35); y++) {
      const dy = (y + 0.5 - cy) / ry;
      const hw = rx * Math.sqrt(Math.max(0, 1 - dy * dy));
      // the lobe line bows outward from the top
      const bow = 1 - Math.pow(Math.max(0, (y - (cy - ry)) / (ry * 1.35)), 1.4) * 0.25;
      const x = X(cx + u * hw * 0.85 * bow - Math.round(hunch * Math.max(0, -dy)));
      const yy = Y(y);
      if (!m.in(x, yy)) continue;
      const fade = (y - (cy - ry)) / (ry * 1.35);
      if (fade > 0.55 && (y & 1)) continue;
      const v = p.data[yy * W + x];
      p.set(x, yy, mixU32(v, '#1E4A34', 0.45 * (1 - fade * 0.8)));
      // the lit side of the lobe, one pixel toward the lantern
      if (u > -0.5 && fade < 0.6 && m.in(x - 1, yy)) p.set(x - 1, yy, mixU32(p.data[yy * W + x - 1], '#9BCB6B', 0.25));
    }
  }
  // the lantern's soft sheen on the lower left, and the skin's taut shine
  for (let y = Math.floor(cy + 1); y <= Math.ceil(cy + ry * 0.7); y++)
    for (let x = Math.floor(cx - rx * 0.85); x <= cx - rx * 0.2; x++) {
      const dx = (x - (cx - rx * 0.5)) / (rx * 0.38);
      const dy2 = (y - (cy + ry * 0.35)) / (ry * 0.3);
      if (dx * dx + dy2 * dy2 > 1) continue;
      const xx = X(x);
      const yy = Y(y);
      if (m.in(xx, yy) && BAYER4[yy & 3][xx & 3] < 7) p.set(xx, yy, mixU32(p.data[yy * W + xx], '#F7C27A', 0.18));
    }
  // gloss 2×2 on the lower left (the lantern's catchlight on the skin)
  if (roll < 0 || roll === 0) {
    p.rect(X(11 - Math.round(sq * 0.3)), Y(28), 2, 2, '#E8F4D8');
    p.set(X(13), Y(29), '#C8E4B8');
  }
  // the star mark (白い放射のすじ): the bottom turned toward us mid-roll
  if (roll === 1) {
    const sx = X(cx + 3);
    const sy = Y(cy + 4);
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 + 0.3;
      for (let r = 2; r <= 6; r++) p.set(Math.round(sx + Math.cos(a) * r), Math.round(sy + Math.sin(a) * r * 0.8), r < 5 ? '#E8F4D8' : '#B8DCA8');
    }
    p.set(sx, sy, '#9BCB6B');
  }
  if (o.blush) tintTop(p, 0.34, '#F2894B', 0.15);
  if (o.streak) {
    for (let x = -12; x <= 10; x++) {
      const y = Math.round(cy - 3 - x * 0.35);
      if (m.in(X(cx + x), Y(y))) p.set(X(cx + x), Y(y), '#E8F4D8');
    }
  }
  // ---- the calyx: five points, a crown tipped 2px to the right ----
  const up = o.calyxUp ?? 0;
  const topY = cy - ry;
  if (o.view !== 'back' || true) {
    const kx = cx + (o.view === 'side' ? -3 : 1) - Math.round(hunch);
    const ky = topY + 1 - up + (o.view === 'back' ? 2 : 0);
    const cal = new Mask(W, H);
    const pts = o.view === 'back' ? 3 : 5;
    for (let i = 0; i < pts; i++) {
      const a = -Math.PI / 2 + (i / 5) * Math.PI * 2 + 0.2;
      const len = o.view === 'back' ? 4 : 7;
      const tipX = kx + Math.cos(a) * len * 1.25 + (Math.sin(a) < 0 ? 1 : 0);
      const tipY = ky + Math.sin(a) * len * 0.45 - (Math.sin(a) < 0 ? 2 : 0);
      cal.line(X(kx), Y(ky), X(tipX), Y(tipY), 1.1);
    }
    cal.ellipse(X(kx), Y(ky), 3, 1.6);
    if (o.view === 'back') {
      // from behind only the points poking over the top of the fruit
      const hideBelow = Y(topY + 2);
      cal.each((x, y) => {
        if (y >= hideBelow) cal.set(x, y, 0);
      });
    }
    nshade(p, cal, CALYX, { mode: 'bevel', base: 0.55, k: 0.6 });
    // stem, with the frayed end of the twine
    const stx = X(kx + 1);
    const sty = Y(ky - 5);
    p.rect(stx, sty, 2, 4, '#3F7A3A');
    p.set(stx, sty, '#5A9A4A');
    p.set(stx + 2, sty + 1, '#E8E4D8');
    p.set(stx + 3, sty + 1, '#E8E4D8');
    p.set(stx + 4, sty, '#E8E4D8');
    p.set(stx + 4, sty + 2, '#C8C2B4');
    p.set(stx + 5, sty - 1, '#E8E4D8');
  }
  // ---- the face ----
  if (o.view === 'front' || o.view === 'side' || o.eyes === 'glance') {
    const side = o.view === 'side';
    const glance = o.view === 'back' && o.eyes === 'glance';
    const ex = side ? [cx - 12] : glance ? [cx - 16] : [cx - 5, cx + 4];
    const ey = Y(cy - 2 - sq * 0.2);
    for (const e of ex) {
      const x = X(e);
      // the sulk is in the brows: short, knitted toward the middle
      if (!glance && o.eyes !== 'closed' && o.eyes !== 'wide') {
        const inner = side || e > cx ? -1 : 1;
        p.set(x + (inner > 0 ? 1 : 0), ey - 3, '#1E3A2A');
        p.set(x + (inner > 0 ? 2 : -1), ey - 2, '#1E3A2A');
      }
      if (o.eyes === 'closed') {
        p.hline(x, x + 1, ey + 1, '#1E3A2A');
      } else if (o.eyes === 'wide') {
        p.rect(x - 1, ey - 1, 3, 3, '#1E3A2A');
        p.set(x - 1, ey - 1, '#F7C27A');
      } else {
        p.rect(x, ey, 2, 2, '#1E3A2A');
        // the lantern reflected in the eye
        p.set(x, ey, '#F7C27A');
      }
    }
    if (!glance) {
      const mx = X(side ? cx - 11 : cx - 1);
      const my = ey + 5;
      const mouth = o.mouth ?? 'pout';
      if (mouth === 'o') {
        p.rect(mx, my - 1, 2, 2, '#1E3A2A');
      } else if (mouth === 'flat') {
        p.hline(mx - 1, mx + 1, my, '#1E3A2A');
      } else {
        // the pout: a little downturned line
        p.set(mx - 1, my + 1, '#1E3A2A');
        p.hline(mx, mx + 1, my, '#1E3A2A');
        if (!side) p.set(mx + 2, my + 1, '#1E3A2A');
      }
      if (!side) {
        // puffed cheeks catch a little more light
        p.set(X(cx - 8), ey + 3, '#7DBB62');
        p.set(X(cx + 7), ey + 3, '#4F964F');
      }
    }
  }
  // flecks on the skin
  m.each((x, y) => {
    if (hash2(x, y, 31) < 0.012 && p.alpha(x, y)) p.set(x, y, '#7DBB62');
  });
  nightFinish(p, 0.55, 0.45, (x, y) => y > Y(cy - 4) && y < Y(cy + 1) && Math.abs(x - X(cx)) < 7 && o.view === 'front');
  return p;
}

let restoredC: HTMLCanvasElement | null = null;
/** Hanging from the vine at the 5th truss: a green tomato on its stalk (16×20). */
function restored(): HTMLCanvasElement {
  if (restoredC) return restoredC;
  const p = new PixelCanvas(16, 20);
  // the vine and the twine (a thin pale line) coming down from the top
  p.vline(3, 0, 12, '#3F7A3A');
  p.vline(4, 0, 12, '#5A9A4A');
  p.vline(12, 0, 19, '#E8E4D8');
  p.line(4, 4, 8, 6, '#3F7A3A');
  // the fruit
  const m = new Mask(16, 20).ellipse(8.5, 12.5, 6, 5.2);
  nshade(p, m, FRUIT, { mode: 'sphere', base: 0.55, k: 0.7 });
  p.rect(5, 13, 1, 1, '#E8F4D8');
  // calyx
  for (const [x, y] of [[7, 7], [8, 6], [9, 7], [6, 8], [10, 8], [8, 7]] as [number, number][]) p.set(x, y, '#3FA66B');
  p.set(7, 11, '#1E3A2A');
  p.set(10, 11, '#1E3A2A');
  p.outline(INK);
  restoredC = p.toCanvas();
  return restoredC;
}

registerEnemyArt('enemy_sune_tomato', (): EnemyArt => {
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
  return {
    id: 'enemy_sune_tomato',
    w: W,
    h: H,
    ox: OX,
    oy: OY,
    frame(v: EnemyView): HTMLCanvasElement {
      const f = v.flags;
      const back = !!f.sune;
      const blush = !!f.mimaEver;
      const resting = !!f.kyuukei;
      if (v.pose === 'hurt') {
        const k = Math.min(2, Math.floor(v.t / 70));
        if (back) return get({ view: 'back', sq: [2, 1, 0][k], streak: k === 0, blush, hunch: 2 });
        return get({ view: 'front', sq: [3, 1, 0][k], calyxUp: [2, 1, 0][k], eyes: 'wide', mouth: 'o', blush });
      }
      if (v.pose === 'turn') {
        // すねる: hop 3px, side → back in two frames
        const k = Math.min(2, Math.floor(v.t / 120));
        return get({ view: k === 0 ? 'side' : 'back', hop: [3, 2, 0][k], blush, hunch: k === 2 ? 2 : 1 });
      }
      if (v.pose === 'turnFront') {
        const k = Math.min(2, Math.floor(v.t / 110));
        return get({ view: k === 0 ? 'back' : k === 1 ? 'side' : 'front', hop: [0, 2, 0][k], blush: true, eyes: k === 2 ? 'wide' : 'open', mouth: 'o' });
      }
      if (v.pose === 'roll' || (v.pose === 'attack' && v.skill === 'skill_sune_korogaru')) {
        return get({ view: 'front', roll: loop(v.t, 60, 4), eyes: 'closed', blush, mouth: 'flat' });
      }
      if ((v.pose === 'windup' && v.skill === 'skill_sune_korogaru') || v.pose === 'windupRoll') {
        // rocking back before the roll
        const k = loop(v.t, 90, 2);
        return get({ view: back ? 'back' : 'front', dx: k ? -1 : 1, sq: 1, blush, hunch: back ? 2 : 0, eyes: 'wide' });
      }
      if (v.pose === 'tremble' || ((v.pose === 'windup' || v.pose === 'attack') && v.skill === 'skill_sune_aokusai')) {
        const k = loop(v.t, 40, 2);
        return get({ view: back ? 'back' : 'front', dx: k ? -1 : 1, sq: 1, blush, hunch: back ? 2 : 0, eyes: 'closed', mouth: 'flat' });
      }
      if (v.pose === 'refuse') {
        const k = loop(v.t, 100, 2);
        return get({ view: 'front', dx: k ? -2 : 2, eyes: 'closed', mouth: 'pout', blush });
      }
      if (resting || v.pose === 'rest') {
        return get({ view: back ? 'back' : 'front', sit: true, eyes: 'closed', mouth: 'flat', blush, sq: loop(v.gt, 700, 2) });
      }
      if (v.pose === 'idleact' || ((v.pose === 'windup' || v.pose === 'attack') && v.skill === 'skill_idle')) {
        // fiddling with its calyx
        const k = loop(v.t, 140, 2);
        return get({ view: back ? 'back' : 'front', calyxUp: k, blush, hunch: back ? 2 : 0, eyes: k ? 'closed' : 'open' });
      }
      if (back) {
        // the sulk: sways 1px (2f × 400ms); every 3s a peek at the light
        const glance = v.gt % 3000 < 160;
        return get({ view: 'back', dx: loop(v.gt, 400, 2) ? 1 : 0, hunch: 2, blush, eyes: glance ? 'glance' : undefined });
      }
      // front: a 1px stretch and squash (3f × 200ms)
      const k = loop(v.gt, 200, 3);
      return get({ view: 'front', sq: [0, 1, 0][k], hop: [0, 0, 1][k], blush });
    },
    restored,
    gallery: [
      { pose: 'idle', flags: { sune: 1 } },
      { pose: 'idle' },
      { pose: 'turn', t: 250 },
      { pose: 'windup', skill: 'skill_sune_korogaru' },
      { pose: 'roll', t: 60 },
      { pose: 'tremble', skill: 'skill_sune_aokusai' },
      { pose: 'hurt', t: 0 },
      { pose: 'hurt', t: 0, flags: { sune: 1 } },
      { pose: 'rest', flags: { kyuukei: 1 } },
      { pose: 'idle', flags: { mimaEver: 1 } },
    ],
  };
});
