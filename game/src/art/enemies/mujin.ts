// ムジン販売員 (40×48, 51 8.5): the honesty box of the unmanned vegetable
// stand. A little cedar box — grain in fine lines, black iron fittings on
// the corners — with the coin slot on its lid for a mouth, two knots in the
// wood for eyes (the lantern glinting in them), the hand-written paper on
// its front (「1袋 100円 お金は ここへ」, in shape only), two thin wooden
// legs it hops about on, and, pushed up out of the slot on a disposable
// chopstick, the cardboard sign it talks with. Lit low on the left.

import { PixelCanvas } from '../../engine/pixel';
import { hash2 } from '../../engine/rng';
import { registerEnemyArt, loop, type EnemyArt, type EnemyView } from './index';
import { Mask } from './lib';
import { INK, nightFinish, nshade } from './night';

const W = 56;
const H = 70;
const OX = 8;
const OY = 18;

const CEDAR = ['#6A4A2A', '#8A6A3A', '#A8804A', '#C8A06A', '#DDB884'];
const CARD = ['#A8804A', '#C8A06A', '#D8B888', '#E8CCA0'];

interface Pose {
  hop?: number;
  /** Lean forward (the bow) px at the top. */
  lean?: number;
  /** Rock sideways (charin): px. */
  rock?: number;
  /** The sign: none, up (front), flipped (back side, the new price), resting (standing, back out). */
  sign?: 'none' | 'up' | 'flip' | 'rest';
  /** Sign height out of the slot (0..1). */
  signK?: number;
  /** Lid lifted 1px (hurt). */
  lid?: number;
  /** Sitting with the legs folded (rest). */
  sit?: boolean;
  eyes?: 'open' | 'shut' | 'wide';
  /** A 100円 coin glints in the slot. */
  glint?: boolean;
  /** Price text on the sign: 'irasshai' | 'nedan'. */
  text?: 'irasshai' | 'nedan' | 'kyuukei';
}

function build(o: Pose): PixelCanvas {
  const p = new PixelCanvas(W, H);
  const hop = o.hop ?? 0;
  const lean = o.lean ?? 0;
  const rock = o.rock ?? 0;
  const sit = !!o.sit;
  const X = (v: number) => Math.round(v + OX + rock);
  const Y = (v: number) => Math.round(v + OY - hop + (sit ? 7 : 0));
  // ---- the legs (thin, wooden) ----
  if (!sit) {
    for (const lx of [10, 28]) {
      p.rect(X(lx), Y(38), 2, 9, '#8A6A3A');
      p.vline(X(lx), Y(38), Y(46), '#A8804A');
      p.hline(X(lx - 1), X(lx + 2), Y(47), '#6A4A2A');
    }
  } else {
    // folded under it
    p.hline(X(8), X(15), Y(39), '#8A6A3A');
    p.hline(X(25), X(32), Y(39), '#8A6A3A');
  }
  // ---- the box: front, the lid seen from above, the side in shadow ----
  const shear = (y: number) => Math.round(lean * Math.max(0, (24 - y) / 24));
  const front = new Mask(W, H);
  for (let y = 10; y <= 38; y++) front.rect(X(6 + shear(y)), Y(y), 28, 1);
  nshade(p, front, CEDAR, { base: 0.6, k: 0.45, dither: 0.35 });
  const side = new Mask(W, H);
  for (let y = 7; y <= 36; y++) {
    const k = Math.min(1, (y - 7) / 3);
    side.rect(X(34 + shear(y)), Y(y + (y < 10 ? 0 : 0)), Math.round(3 * k) + 1, 1);
  }
  nshade(p, side, CEDAR, { base: 0.25, k: 0.3 });
  const lidY = 6 - (o.lid ?? 0);
  const lid = new Mask(W, H);
  for (let y = lidY; y < lidY + 4; y++) lid.rect(X(7 + (lidY + 4 - y) + shear(10)), Y(y), 30, 1);
  nshade(p, lid, CEDAR, { base: 0.72, k: 0.4 });
  // grain on the front: fine wavy lines, a knot or two
  for (let y = 12; y < 38; y += 3) {
    for (let x = 7; x < 33; x++) {
      const yy = y + Math.round(Math.sin((x + y * 1.7) / 5) * 0.8);
      if (hash2(x, y, 13) < 0.75) p.set(X(x + shear(yy)), Y(yy), '#A8804A');
    }
  }
  // board seams and iron corner fittings
  p.vline(X(20 + shear(24)), Y(10), Y(38), '#8A6A3A');
  for (const [cx, cy, dx, dy] of [[6, 10, 1, 1], [33, 10, -1, 1], [6, 38, 1, -1], [33, 38, -1, -1]] as [number, number, number, number][]) {
    for (let i = 0; i < 4; i++) {
      p.set(X(cx + dx * i + shear(cy)), Y(cy), '#3A3F48');
      p.set(X(cx + shear(cy + dy * i)), Y(cy + dy * i), '#3A3F48');
    }
    p.set(X(cx + dx + shear(cy)), Y(cy + dy), '#6B7186');
  }
  // the coin slot = its mouth
  const sx = X(15 + shear(8));
  const sy = Y(lidY + 1);
  p.rect(sx, sy, 10, 2, INK);
  p.hline(sx, sx + 9, sy + 2, '#DDB884');
  if (o.glint) {
    p.set(sx + 4, sy, '#C8C2B4');
    p.set(sx + 5, sy, '#F4F1E8');
  }
  // eyes: two knots in the wood, the lantern in them
  const ey = Y(13);
  for (const ex of [13, 25]) {
    const x = X(ex + shear(13));
    if (o.eyes === 'shut') p.hline(x - 1, x + 1, ey + 1, '#6A4A2A');
    else if (o.eyes === 'wide') {
      p.rect(x - 1, ey - 1, 3, 3, '#6A4A2A');
      p.rect(x, ey, 1, 1, '#2A1A10');
      p.set(x - 1, ey - 1, '#F7C27A');
    } else {
      p.rect(x, ey, 2, 2, '#6A4A2A');
      p.set(x, ey, '#F7C27A');
      // the grain swirls round the knot
      p.set(x - 1, ey + 2, '#A8804A');
      p.set(x + 2, ey - 1, '#A8804A');
    }
  }
  // the hand-written paper on its front (a line for each phrase)
  const px = X(10 + shear(20));
  const py = Y(18);
  p.rect(px, py, 20, 16, '#F4F1E8');
  p.hline(px, px + 19, py + 15, '#C8C2B4');
  p.vline(px + 19, py, py + 15, '#E2DED2');
  // tape at the top corners
  p.rect(px - 1, py - 1, 4, 2, '#F6D98A');
  p.rect(px + 17, py - 1, 4, 2, '#F6D98A');
  const lines = [
    [2, 3, 12],
    [2, 7, 9],
    [11, 7, 5],
    [2, 11, 15],
  ];
  for (const [lx, ly, lw] of lines) for (let i = 0; i < lw; i++) if ((i + ly) % 4 !== 3) p.set(px + lx + i, py + ly + ((i >> 1) % 2), INK);
  // the price circled in red marker
  p.set(px + 14, py + 2, '#E84E3C');
  p.set(px + 17, py + 4, '#E84E3C');
  p.set(px + 15, py + 5, '#E84E3C');
  // ---- the sign on its chopstick ----
  const sign = o.sign ?? 'none';
  if (sign !== 'none') {
    const k = o.signK ?? 1;
    const rest = sign === 'rest';
    const stickTop = Y(lidY - Math.round((rest ? 6 : 16) * k));
    const stx = rest ? X(36) : sx + 4;
    p.vline(stx, stickTop, rest ? Y(38) : sy, '#E8D8B0');
    p.vline(stx + 1, stickTop, rest ? Y(38) : sy, '#C8B890');
    const cw = 20;
    const ch = 12;
    const cx0 = stx - (rest ? 4 : 9);
    const cy0 = stickTop - ch + 2;
    const card = new Mask(W, H).rect(cx0, cy0, cw, ch);
    nshade(p, card, CARD, { base: sign === 'flip' ? 0.5 : 0.62, k: 0.4 });
    for (let x = cx0; x < cx0 + cw; x += 3) p.vline(x, cy0 + 1, cy0 + ch - 2, '#C8A06A');
    // squashed corner
    p.set(cx0 + cw - 1, cy0, 'transparent');
    p.set(cx0, cy0 + ch - 1, '#A8804A');
    // marker lettering, doubled 1px (the flip board's look)
    const t = o.text ?? 'irasshai';
    const rows = t === 'nedan' ? [[2, 3, 7], [11, 3, 6], [3, 7, 13]] : t === 'kyuukei' ? [[3, 4, 14], [5, 8, 9]] : [[2, 3, 15], [4, 7, 11]];
    for (const [lx, ly, lw] of rows) {
      for (let i = 0; i < lw; i++) {
        if ((i + lx) % 5 === 4) continue;
        p.set(cx0 + lx + i, cy0 + ly, INK);
        p.set(cx0 + lx + i + 1, cy0 + ly, INK);
      }
    }
    if (t === 'nedan') {
      // 「200円」: the price bigger and red-edged
      p.set(cx0 + 2, cy0 + 2, '#E84E3C');
      p.set(cx0 + 17, cy0 + 9, '#E84E3C');
    }
  }
  nightFinish(p, 0.5, 0.45, (x, y) => y >= Y(12) && y <= Y(15) && x >= X(12) && x <= X(28));
  return p;
}

let restoredC: HTMLCanvasElement | null = null;
/** Back on the stand (12×10): the honesty box and 「ありがとう ございます」 in hand. */
function restored(): HTMLCanvasElement {
  if (restoredC) return restoredC;
  const p = new PixelCanvas(16, 14);
  p.rect(1, 12, 14, 2, '#8A6A3A');
  p.rect(2, 3, 12, 9, '#C8A06A');
  p.rect(12, 3, 2, 9, '#8A6A3A');
  p.rect(3, 2, 11, 1, '#DDB884');
  p.hline(5, 9, 2, INK);
  p.rect(4, 6, 7, 4, '#F4F1E8');
  p.hline(5, 9, 7, INK);
  p.hline(5, 8, 9, INK);
  p.outline(INK);
  restoredC = p.toCanvas();
  return restoredC;
}

registerEnemyArt('enemy_mujin_hanbaiin', (): EnemyArt => {
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
    id: 'enemy_mujin_hanbaiin',
    w: W,
    h: H,
    ox: OX,
    oy: OY,
    frame(v: EnemyView): HTMLCanvasElement {
      const f = v.flags;
      const priced = (f.atkUp ?? 0) >= 1;
      if (f.kyuukei || v.pose === 'rest') return get({ sit: true, sign: 'rest', text: 'kyuukei', eyes: 'shut' });
      if (v.pose === 'hurt') {
        const k = Math.min(2, Math.floor(v.t / 70));
        return get({ rock: [2, -1, 0][k], lid: k < 2 ? 1 : 0, eyes: 'wide' });
      }
      if (v.pose === 'sign' || v.pose === 'bow' || ((v.pose === 'windup' || v.pose === 'attack') && v.skill === 'skill_mujin_irasshai')) {
        // the sign pops out (4f) and the box bows 1px
        const k = Math.min(1, v.t / 70);
        return get({ sign: 'up', signK: k, lean: v.pose === 'bow' || v.pose === 'attack' ? 1 : 0, text: 'irasshai', eyes: 'open' });
      }
      if (v.pose === 'flip' || ((v.pose === 'windup' || v.pose === 'attack') && v.skill === 'skill_mujin_nefuda')) {
        const k = loop(v.t, 90, 2);
        return get({ sign: k ? 'flip' : 'up', text: k ? 'nedan' : 'irasshai', eyes: 'shut' });
      }
      if (v.pose === 'push' || ((v.pose === 'windup' || v.pose === 'attack') && v.skill === 'skill_mujin_osusume')) {
        return get({ lean: 2, sign: 'up', text: priced ? 'nedan' : 'irasshai', eyes: 'wide', hop: 1 });
      }
      if (v.pose === 'shake' || ((v.pose === 'windup' || v.pose === 'attack') && v.skill === 'skill_mujin_charin')) {
        const k = loop(v.t, 50, 4);
        return get({ rock: [-2, 0, 2, 0][k], lid: k % 2, glint: true, eyes: 'shut' });
      }
      if (v.pose === 'refuse') return get({ rock: loop(v.t, 100, 2) ? -2 : 2, eyes: 'shut' });
      if (v.pose === 'idleact') return get({ sign: 'flip', text: 'kyuukei', eyes: 'open' });
      // idle: hopping 2px (2f × 200ms); now and then a 100円 coin glints in the slot
      const k = loop(v.gt, 200, 2);
      return get({ hop: k * 2, glint: v.gt % 2400 < 80, eyes: 'open', sign: priced ? 'up' : 'none', text: 'nedan' });
    },
    restored,
    gallery: [
      { pose: 'idle' },
      { pose: 'sign', t: 100 },
      { pose: 'push' },
      { pose: 'shake', t: 0 },
      { pose: 'flip', t: 100 },
      { pose: 'hurt', t: 0 },
      { pose: 'rest', flags: { kyuukei: 1 } },
    ],
  };
});
