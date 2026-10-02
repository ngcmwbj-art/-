// 練習台 (48×56): the park lesson's target (evt_kn_lesson, 2026-09-28). Two
// cardboard boxes stacked up by グソっ君 (★2026-09-29 カネナリくん→グソっ君):
// the upper one has his own face drawn on in marker — the round head, two
// big blacked-in eyes with the cardboard left bare for the glints, the
// feelers, pink cheeks — and the lower one his armour plates, four curved
// lines; two paper tubes stick out for arms. Nobody is in it and nothing
// about it gets hurt — a たたく only dents the cardboard.

import { PixelCanvas } from '../../engine/pixel';
import { registerEnemyArt, loop, type EnemyArt, type EnemyView } from './index';
import { K, Mask, ditherMask, rimLeft, shade } from './lib';

const W = 60;
const H = 66;
const OX = 6;
const OY = 6;

const BOX = ['#7A4E24', '#94632F', '#AE7A3E', '#C4904E', '#D6A662', '#E4BA7A'];
const TAPE = '#E8D8A8';
const TAPE_D = '#C8B488';
const TUBE = ['#8E8474', '#A89E8C', '#C2B8A4', '#D8D0BC'];
const MARKER = '#2A2440';
/** グソっ君's grey-violet marker (his head and plates). */
const GREY = '#6E6890';

interface RPose {
  /** Lean of the whole stack: + leans back (away), − leans toward the party. */
  lean?: number;
  /** The stack sits lower (a dent) — hurt. */
  dent?: boolean;
  /** The face: 'smile' | 'hurt' | 'happy' | 'dizzy'. */
  face?: string;
  /** Arm tubes: 0 down, 1 out, 2 up. */
  arms?: number;
  bob?: number;
}

function build(o: RPose): PixelCanvas {
  const p = new PixelCanvas(W, H);
  const X = (v: number) => v + OX;
  const Y = (v: number) => v + OY;
  const bob = o.bob ?? 0;
  const dent = o.dent ? 2 : 0;
  // ---- lower box (the body) 36×24 on the ground line (y56)
  const lower = new Mask(W, H).rect(X(6), Y(32 + dent), 36, 24 - dent);
  shade(p, lower, BOX, { mode: 'bevel', bevel: 2, base: 0.55, dither: 0.25 });
  // flap seam and packing tape across the top
  p.hline(X(7), X(40), Y(32 + dent), BOX[5]);
  p.rect(X(21), Y(32 + dent), 6, 24 - dent, TAPE);
  p.vline(X(26), Y(33 + dent), Y(55), TAPE_D);
  // his armour, drawn on in grey marker: four plates, each a line that dips
  // in the middle (a round back), the ends hooked down like the plates' points
  for (let k = 0; k < 4; k++) {
    const py = 37 + dent + k * 4;
    for (let x = 9; x <= 38; x++) {
      if (x >= 21 && x <= 26) continue;
      const u = (x - 23.5) / 15;
      const yy = Y(py + Math.round(2 * (1 - u * u)));
      if (lower.in(X(x), yy)) p.set(X(x), yy, GREY);
    }
    for (const x of [8, 39]) if (lower.in(X(x), Y(py + 1))) p.set(X(x), Y(py + 1), GREY);
  }
  // ---- arms: paper tubes out of the sides
  const armY = Y(38 + dent);
  const tube = (x0: number, y0: number, x1: number, y1: number) => {
    const m = new Mask(W, H).line(x0, y0, x1, y1, 2.2);
    shade(p, m, TUBE, { mode: 'bevel', bevel: 1, base: 0.6, dither: 0.2 });
    // the open end of the tube
    p.set(Math.round(x1), Math.round(y1), '#5A5244');
  };
  const arms = o.arms ?? 1;
  const aY = arms === 2 ? -10 : arms === 1 ? -2 : 6;
  tube(X(6), armY, X(-2), armY + aY);
  tube(X(42), armY, X(50), armY + aY);
  // ---- upper box (the head) 30×26, sits on the body
  const hy = 7 + dent + bob;
  const head = new Mask(W, H).rect(X(10), Y(hy), 28, 25);
  shade(p, head, BOX, { mode: 'bevel', bevel: 2, base: 0.62, dither: 0.25 });
  p.hline(X(11), X(36), Y(hy), BOX[5]);
  p.rect(X(10), Y(hy + 2), 28, 3, TAPE);
  p.hline(X(10), X(37), Y(hy + 4), TAPE_D);
  // グソっ君's face, drawn by グソっ君: the round head in grey marker
  const bx = 24;
  const by = hy + 6;
  for (let x = bx - 11; x <= bx + 11; x++) {
    const u = (x - bx) / 11.5;
    const yy = by + 16 - Math.round(15 * Math.sqrt(Math.max(0, 1 - u * u)));
    p.set(X(x), Y(yy), GREY);
    if (Math.abs(u) > 0.8) p.set(X(x), Y(yy + 1), GREY);
  }
  p.hline(X(bx - 11), X(bx + 11), Y(by + 17), GREY);
  // the feelers: two long ones curling out, two little ones between
  for (const s of [-1, 1]) {
    p.line(X(bx + s * 4), Y(by + 1), X(bx + s * 8), Y(by - 3), GREY);
    p.set(X(bx + s * 9), Y(by - 3), GREY);
    p.set(X(bx + s * 10), Y(by - 2), GREY);
    p.set(X(bx + s * 1), Y(by + 1), GREY);
    p.set(X(bx + s * 2), Y(by), GREY);
  }
  // the face, in black marker
  const face = o.face ?? 'smile';
  const ey = by + 9;
  for (const s of [-1, 1]) {
    const ex = bx + s * 5;
    if (face === 'hurt') {
      // > <
      p.line(X(ex - 2 * s), Y(ey - 2), X(ex + s), Y(ey), MARKER);
      p.line(X(ex - 2 * s), Y(ey + 2), X(ex + s), Y(ey), MARKER);
    } else if (face === 'dizzy') {
      // spirals
      p.art(['.###.', '#...#', '#.#.#', '#..#.', '.##..'], { '#': MARKER }, X(ex - 2), Y(ey - 2), s > 0);
    } else if (face === 'happy') {
      // ^ ^
      p.set(X(ex - 2), Y(ey + 1), MARKER);
      p.set(X(ex - 1), Y(ey), MARKER);
      p.set(X(ex), Y(ey - 1), MARKER);
      p.set(X(ex + 1), Y(ey - 1), MARKER);
      p.set(X(ex + 2), Y(ey), MARKER);
      p.set(X(ex + 3), Y(ey + 1), MARKER);
    } else {
      // the big eyes, blacked in, the glint left bare
      p.rect(X(ex - 2), Y(ey - 2), 5, 5, MARKER);
      p.rect(X(ex - 3), Y(ey - 1), 7, 3, MARKER);
      p.set(X(ex - 1), Y(ey - 1), BOX[5]);
      p.set(X(ex - 2), Y(ey - 2), BOX[4]);
    }
  }
  // cheeks, and a small mouth (an "o" when hurt)
  p.rect(X(bx - 10), Y(ey + 3), 3, 1, '#F08A7A');
  p.rect(X(bx + 8), Y(ey + 3), 3, 1, '#F08A7A');
  if (face === 'hurt' || face === 'dizzy') {
    p.set(X(bx), Y(ey + 4), MARKER);
    p.set(X(bx), Y(ey + 6), MARKER);
    p.set(X(bx - 1), Y(ey + 5), MARKER);
    p.set(X(bx + 1), Y(ey + 5), MARKER);
  } else {
    p.set(X(bx - 1), Y(ey + 4), MARKER);
    p.set(X(bx), Y(ey + 5), MARKER);
    p.set(X(bx + 1), Y(ey + 4), MARKER);
  }
  if (o.dent) ditherMask(p, head, '#F4E0B0', 0.1);
  // the head box sits on the body: a dark seam and its shadow on the body's lid
  p.hline(X(10), X(37), Y(hy + 25), K.outline);
  p.hline(X(8), X(39), Y(hy + 26), BOX[1]);
  p.outline(K.outline);
  rimLeft(p, K.rim, 0.45);
  // lean: shift each row sideways, more toward the top (the stack pivots on the ground)
  const lean = o.lean ?? 0;
  if (lean) {
    const q = new PixelCanvas(W, H);
    const ground = Y(56);
    for (let y = 0; y < H; y++) {
      const dx = Math.round((lean * (ground - y)) / 48);
      for (let x = 0; x < W; x++) {
        const c = p.get(x, y);
        if (p.alpha(x, y) > 0) q.set(x + dx, y, c);
      }
    }
    return q;
  }
  return p;
}

let restoredC: HTMLCanvasElement | null = null;
/** Folded flat: two sheets of cardboard, one with the drawn face. */
function restored(): HTMLCanvasElement {
  if (restoredC) return restoredC;
  const p = new PixelCanvas(20, 10);
  const m = new Mask(20, 10).rect(1, 3, 18, 6);
  shade(p, m, BOX, { mode: 'bevel', bevel: 1, base: 0.6 });
  p.hline(2, 17, 5, BOX[5]);
  p.hline(7, 12, 4, GREY);
  p.set(8, 5, MARKER);
  p.set(11, 5, MARKER);
  p.outline(K.outline);
  restoredC = p.toCanvas();
  return restoredC;
}

registerEnemyArt('enemy_renshudai', (): EnemyArt => {
  const cache = new Map<string, HTMLCanvasElement>();
  const get = (key: string, o: RPose) => {
    let c = cache.get(key);
    if (!c) {
      c = build(o).toCanvas();
      cache.set(key, c);
    }
    return c;
  };
  return {
    id: 'enemy_renshudai',
    w: W,
    h: H,
    ox: OX,
    oy: OY,
    frame(v: EnemyView): HTMLCanvasElement {
      if (v.pose === 'hurt') return get('hurt', { dent: true, face: 'hurt', arms: 2 });
      if (v.pose === 'windup') {
        // it rocks back, arms out (the wind-up of 「もたれかかる」)
        const f = loop(v.t, 120, 2);
        return get(`wind${f}`, { lean: 3 + f, arms: 2, face: 'smile' });
      }
      if (v.pose === 'attack') return get('lean', { lean: -6, arms: 1, face: 'happy' });
      if (v.pose === 'happy' || v.flags.happy) return get(`happy${loop(v.gt, 220, 2)}`, { face: 'happy', arms: 2, bob: loop(v.gt, 220, 2) ? -1 : 0 });
      if (v.flags.bokemake) return get('dizzy', { face: 'dizzy', arms: 0 });
      // idle: the head box sits a pixel lower now and then (it is only stacked)
      const f = loop(v.gt, 700, 2);
      return get(`idle${f}`, { bob: f, arms: 1 });
    },
    restored,
    gallery: [{ pose: 'idle' }, { pose: 'windup' }, { pose: 'attack' }, { pose: 'hurt' }, { pose: 'happy' }, { pose: 'idle', flags: { bokemake: 1 } }],
  };
});
