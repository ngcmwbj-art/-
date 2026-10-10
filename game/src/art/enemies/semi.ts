// セミファイナル (72×48): a huge cicada lying belly-up, head to the left,
// wings sticking out from underneath, six legs toward the sky (11.2).

import { PixelCanvas } from '../../engine/pixel';
import { registerEnemyArt, loop, type EnemyArt, type EnemyView } from './index';
import { K, Mask, ditherMask, rimLeft, shade } from './lib';

const W = 84;
const H = 60;
const OX = 6;
const OY = 8;

const BELLY = ['#7A5A30', '#A8834A', '#B8935A', '#C9A36A', '#DDB87E', '#E8C88A'];
const DARK = ['#2A1A12', '#3A2616', '#4A2E1A', '#5A3A22', '#6A4A2E', '#7A5A3A'];
const WING = ['#3A2616', '#5A3F28', '#6A4A30', '#7A5A3A', '#8E6E48', '#A88A5A'];

interface SemiPose {
  /** Leg spread 0 = curled (dead) … 3 = wide. Per-leg overrides via `legs`. */
  legs?: number[];
  belly?: number;
  wingBlur?: number;
  bob?: number;
  side?: boolean;
  squash?: boolean;
}

/** One leg from (x, y) pointing upward with a bend. `k` 0 curled … 3 spread. */
function leg(p: PixelCanvas, x: number, y: number, k: number, dir: number, len: number): void {
  const X = (v: number) => v + OX;
  const Y = (v: number) => v + OY;
  const a1 = -Math.PI / 2 + dir * (0.25 + 0.2 * k);
  const l1 = len * (0.55 + 0.12 * k);
  const jx = x + Math.cos(a1) * l1;
  const jy = y + Math.sin(a1) * l1;
  const a2 = a1 + dir * (k === 0 ? 1.9 : 1.1 - 0.25 * k);
  const l2 = len * (0.5 + 0.1 * k);
  const ex = jx + Math.cos(a2) * l2;
  const ey = jy + Math.sin(a2) * l2;
  p.line(X(Math.round(x)), Y(Math.round(y)), X(Math.round(jx)), Y(Math.round(jy)), '#4A2E1A');
  p.line(X(Math.round(x + 1)), Y(Math.round(y)), X(Math.round(jx + 1)), Y(Math.round(jy)), '#3A2616');
  p.line(X(Math.round(jx)), Y(Math.round(jy)), X(Math.round(ex)), Y(Math.round(ey)), '#4A2E1A');
  p.set(X(Math.round(jx)), Y(Math.round(jy)), '#7A5A3A');
  // claw (2px)
  p.set(X(Math.round(ex)), Y(Math.round(ey)), '#2A1A12');
  p.set(X(Math.round(ex + dir)), Y(Math.round(ey - 1)), '#2A1A12');
}

function wing(p: PixelCanvas, pts: [number, number][], blur: number, far: boolean): void {
  const X = (v: number) => v + OX;
  const Y = (v: number) => v + OY;
  const m = new Mask(W, H).poly(pts.map(([x, y]) => [X(x), Y(y)]));
  shade(p, m, WING, { base: far ? 0.42 : 0.6, bevel: 2, dither: 0.3 });
  // veins
  const [x0, y0] = pts[0];
  for (let i = 1; i < pts.length - 1; i++) {
    const [x1, y1] = pts[i];
    p.line(X(x0 + 2), Y(y0), X(Math.round(x0 + (x1 - x0) * 0.85)), Y(Math.round(y0 + (y1 - y0) * 0.85)), '#3A2616');
  }
  // edge highlight on the upper edge
  m.each((x, y) => {
    if (!m.in(x, y - 1) && m.in(x, y + 1)) p.set(x, y, '#A88A5A');
  });
  // dark spot near the tip
  const tip = pts[Math.floor(pts.length / 2)];
  p.set(X(tip[0] - 4), Y(tip[1]), '#2A1A12');
  p.set(X(tip[0] - 5), Y(tip[1]), '#3A2616');
  if (blur) {
    // motion smear
    ditherMask(p, m.shifted(blur * 3, -blur), '#A88A5A', 0.3);
  }
}

function build(o: SemiPose): PixelCanvas {
  const p = new PixelCanvas(W, H);
  const X = (v: number) => v + OX;
  const Y = (v: number) => v + OY;
  const bob = o.bob ?? 0;
  const legs = o.legs ?? [0, 0, 0, 0, 0, 0];
  if (o.side) return buildSide(o.wingBlur ?? 0);
  const by = 30 + bob;
  // wings (far one above, near one below), sticking out from under the body
  wing(p, [[24, by - 6], [44, by - 18], [62, by - 20], [72, by - 16], [66, by - 10], [46, by - 6]], o.wingBlur ?? 0, true);
  wing(p, [[24, by + 4], [44, by + 14], [64, by + 16], [71, by + 12], [64, by + 6], [44, by + 3]], o.wingBlur ?? 0, false);
  // abdomen (belly up): tapered segmented barrel
  const abd = new Mask(W, H).ellipse(X(43), Y(by), 17 + (o.belly ?? 0), 9);
  abd.or(new Mask(W, H).ellipse(X(57 + (o.belly ?? 0)), Y(by + 1), 6, 5.5));
  shade(p, abd, BELLY, { mode: 'sphere', cx: X(40), cy: Y(by - 3), rx: 22, ry: 12, base: 0.62, k: 0.7, dither: 0.35 });
  // segment lines every 3px across the belly (curved)
  for (let sx = 30; sx < 62 + (o.belly ?? 0); sx += 3) {
    for (let yy = -9; yy <= 9; yy++) {
      const xx = X(sx + Math.round((yy * yy) / 30));
      const Yy = Y(by + yy);
      if (abd.in(xx, Yy) && abd.in(xx + 1, Yy)) p.set(xx, Yy, yy < -3 ? '#B8935A' : '#A8834A');
    }
  }
  // thorax (underside) and head
  const tho = new Mask(W, H).ellipse(X(24), Y(by - 1), 9, 8.5);
  shade(p, tho, ['#4A3220', '#6A4E30', '#7A5A3A', '#8A6A3A', '#9A7A4A'], { mode: 'sphere', base: 0.55, dither: 0.3 });
  const head = new Mask(W, H).ellipse(X(12), Y(by - 1), 7, 7.5);
  shade(p, head, DARK, { mode: 'sphere', base: 0.6, k: 0.7 });
  // compound eyes (big hemispheres on both sides of the head)
  for (const [ex, ey] of [[9, by - 7], [9, by + 5]] as [number, number][]) {
    const eye = new Mask(W, H).ellipse(X(ex), Y(ey), 3.5, 3);
    shade(p, eye, ['#1A100A', '#2A1A12', '#3A2A1E', '#4A3A2E'], { mode: 'sphere', base: 0.5 });
    p.set(X(ex - 2), Y(ey - 1), K.white);
    p.set(X(ex - 1), Y(ey), '#6A5A4A');
    p.set(X(ex), Y(ey), '#6A5A4A');
  }
  // proboscis along the thorax
  p.line(X(14), Y(by), X(26), Y(by + 1), '#3A2616');
  // legs point to the sky from the thorax
  const roots: [number, number, number][] = [[18, by - 5, -1], [22, by - 6, -1], [26, by - 6, 1], [18, by + 3, -1], [23, by + 4, 1], [28, by + 3, 1]];
  roots.forEach(([lx, ly, d], i) => leg(p, lx, ly, legs[i] ?? 0, d, i < 3 ? 12 : 10));
  if (o.squash) {
    // hurt: legs thrown open, a startled twitch
    ditherMask(p, abd, '#F4E0B0', 0.12);
  }
  p.outline(K.outline);
  rimLeft(p, K.rim, 0.5);
  return p;
}

/** Sudden sideways pose for the 3-hit attack: profile view, wings buzzing. */
function buildSide(blur: number): PixelCanvas {
  const p = new PixelCanvas(W, H);
  const X = (v: number) => v + OX;
  const Y = (v: number) => v + OY;
  // wings raised in a blur
  const wm = new Mask(W, H).poly([[X(24), Y(20)], [X(50), Y(4)], [X(70), Y(6)], [X(56), Y(18)], [X(34), Y(26)]]);
  shade(p, wm, WING, { base: 0.6, bevel: 2 });
  if (blur) ditherMask(p, wm.shifted(blur * 2, blur * 3), '#C9D0C0', 0.25);
  const body = new Mask(W, H).ellipse(X(38), Y(30), 20, 9).or(new Mask(W, H).ellipse(X(57), Y(32), 7, 5));
  shade(p, body, DARK, { mode: 'sphere', base: 0.6, k: 0.7 });
  // belly stripes visible underneath
  for (let x = 30; x < 60; x += 3) p.vline(X(x), Y(34), Y(37), '#A8834A');
  const head = new Mask(W, H).ellipse(X(16), Y(28), 7, 7);
  shade(p, head, DARK, { mode: 'sphere', base: 0.62 });
  const eye = new Mask(W, H).ellipse(X(13), Y(25), 3.5, 3.5);
  shade(p, eye, ['#1A100A', '#2A1A12', '#3A2A1E', '#4A3A2E'], { mode: 'sphere', base: 0.5 });
  p.set(X(11), Y(24), K.white);
  // legs clawing forward
  for (let i = 0; i < 3; i++) {
    p.line(X(22 + i * 5), Y(36), X(18 + i * 5), Y(44), '#4A2E1A');
    p.set(X(17 + i * 5), Y(45), '#2A1A12');
  }
  p.outline(K.outline);
  rimLeft(p, K.rim, 0.5);
  return p;
}

let restoredC: HTMLCanvasElement | null = null;
function restored(): HTMLCanvasElement {
  if (restoredC) return restoredC;
  const p = new PixelCanvas(14, 12);
  const b = new Mask(14, 12).ellipse(7, 7, 3, 4.5);
  shade(p, b, DARK, { mode: 'sphere', base: 0.6 });
  p.poly([[3, 4], [0, 10], [4, 9]], '#A88A5A');
  p.poly([[11, 4], [13, 10], [10, 9]], '#8E6E48');
  p.set(5, 3, '#2A1A12');
  p.set(8, 3, '#2A1A12');
  p.outline(K.outline);
  restoredC = p.toCanvas();
  return restoredC;
}

registerEnemyArt('enemy_semi_final', (): EnemyArt => {
  const cache = new Map<string, HTMLCanvasElement>();
  const get = (key: string, o: SemiPose) => {
    let c = cache.get(key);
    if (!c) {
      c = build(o).toCanvas();
      cache.set(key, c);
    }
    return c;
  };
  const DEAD = [0, 0, 0, 0, 0, 0];
  const flail = (f: number) => [0, 1, 2, 3].map((k) => (k + f) % 4).concat([(f + 2) % 4, (f + 3) % 4]);
  return {
    id: 'enemy_semi_final',
    w: W,
    h: H,
    ox: OX,
    oy: OY,
    frame(v: EnemyView): HTMLCanvasElement {
      const dead = v.flags.shindafuri || v.pose === 'dead';
      if (v.pose === 'hurt') return get('hurt', { legs: [3, 3, 3, 3, 3, 3], squash: true, bob: -2 });
      if (v.pose === 'twitch') {
        const L = [...DEAD];
        L[2] = 3;
        return get('tw2', { legs: L });
      }
      if (v.pose === 'attack' && v.skill === 'skill_semi_final') return get(`side${loop(v.t, 50, 2)}`, { side: true, wingBlur: 1 + loop(v.t, 50, 2) });
      if (v.skill === 'skill_semi_miin' && (v.pose === 'windup' || v.pose === 'attack')) {
        const f = loop(v.t, 60, 2);
        return get(`miin${f}`, { legs: [2, 1, 2, 1, 2, 1], belly: f });
      }
      if (v.skill === 'skill_semi_final' && v.pose === 'windup') return get(`fl${loop(v.t, 45, 4)}`, { legs: flail(loop(v.t, 45, 4)), bob: loop(v.t, 90, 2) ? -1 : 1 });
      if (dead) {
        // one leg twitches every 600–1400ms
        const cyc = v.gt % 2000;
        const legI = Math.floor(v.gt / 2000) % 6;
        if (cyc > 1400 && cyc < 1520) {
          const L = [...DEAD];
          L[legI] = 2;
          return get(`tw${legI}`, { legs: L });
        }
        return get('dead', { legs: DEAD });
      }
      const f = loop(v.gt, 90, 4);
      return get(`act${f}`, { legs: flail(f), bob: f % 2 ? 1 : -1 });
    },
    restored,
    gallery: [
      { pose: 'dead' },
      { pose: 'twitch' },
      { pose: 'idle' },
      { pose: 'windup', skill: 'skill_semi_final' },
      { pose: 'attack', skill: 'skill_semi_final' },
      { pose: 'windup', skill: 'skill_semi_miin' },
      { pose: 'hurt' },
    ],
  };
});
