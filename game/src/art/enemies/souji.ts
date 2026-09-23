// ソウジロウ (48×24): a disc robot vacuum seen from slightly above; LED eyes,
// a clear dust bin with one lonely sock, a spinning side brush (11.6).

import { PixelCanvas } from '../../engine/pixel';
import { hash2 } from '../../engine/rng';
import { registerEnemyArt, loop, type EnemyArt, type EnemyView } from './index';
import { K, Mask, rimLeft, shade } from './lib';

const W = 60;
const H = 40;
const OX = 6;
const OY = 12;

const TOP = ['#8A9098', '#9AA0A8', '#B4BAC2', '#C8CDD4', '#DADFE4', '#E8ECF0'];

interface SoujiPose {
  jitter?: number;
  led?: 'on' | 'off' | 'amber' | 'spin';
  ledPhase?: number;
  brush?: number;
  lift?: number;
  look?: number;
  dent?: boolean;
  tilt?: number;
}

function build(o: SoujiPose): PixelCanvas {
  const p = new PixelCanvas(W, H);
  const X = (v: number) => v + OX + (o.jitter ?? 0);
  const Y = (v: number) => v + OY;
  const lift = o.lift ?? 0; // front edge raised (段差)
  const cx = 24;
  const cy = 9 - lift / 2;
  const ry = 8 + lift / 2;
  // side band (4px) below the top ellipse
  const side = new Mask(W, H);
  for (let x = 1; x < 47; x++) {
    const dx = (x + 0.5 - cx) / 23;
    const e = Math.sqrt(Math.max(0, 1 - dx * dx));
    const y0 = Math.round(cy + ry * e * 0.95);
    for (let y = y0; y < y0 + 5; y++) side.set(X(x), Y(y));
  }
  side.each((x, y) => {
    const u = (x - X(1)) / 46;
    p.set(x, y, u < 0.1 ? '#C0C6CC' : u < 0.6 ? '#9AA0A8' : u < 0.85 ? '#7E8494' : '#6B7186');
  });
  // bumper (front): dark band on the lower front arc
  for (let x = 4; x < 44; x++) {
    const dx = (x + 0.5 - cx) / 23;
    const e = Math.sqrt(Math.max(0, 1 - dx * dx));
    const y0 = Math.round(cy + ry * e * 0.95) + 1 + (o.dent && x > 18 && x < 28 ? 1 : 0);
    p.set(X(x), Y(y0), '#5A5F68');
    p.set(X(x), Y(y0 + 1), '#3A3F48');
    p.set(X(x), Y(y0 + 2), '#3A3F48');
  }
  // top surface
  const top = new Mask(W, H).ellipse(X(cx), Y(cy), 23, ry);
  shade(p, top, TOP, { mode: 'sphere', cx: X(cx - 6), cy: Y(cy - 4), rx: 30, ry: 14, base: 0.6, k: 0.55, dither: 0.3 });
  // outer step ring
  top.each((x, y) => {
    if (!top.in(x, y - 2) || !top.in(x, y + 2) || !top.in(x - 3, y) || !top.in(x + 3, y)) {
      if (top.in(x, y - 1) && top.in(x, y + 1)) p.set(x, y, x < X(cx - 8) ? '#C0C6CC' : '#9AA0A8');
    }
  });
  // highlight arc (top-left)
  for (let a = 3.5; a < 4.6; a += 0.04) p.set(X(Math.round(cx + Math.cos(a) * 18)), Y(Math.round(cy + Math.sin(a) * (ry - 3))), '#E8ECF0');
  // dust bin window (back, 12×6) with dust and a single sock
  const bx = X(cx - 6);
  const by = Y(cy - ry + 2);
  for (let y = 0; y < 6; y++)
    for (let x = 0; x < 12; x++) {
      if ((x === 0 || x === 11) && (y === 0 || y === 5)) continue;
      let c = '#B8C0C8B3';
      if (hash2(x, y, 3) < 0.35) c = '#6B7186';
      p.set(bx + x, by + y, c);
    }
  // sock (white with red toe/heel), rotating a bit with the look
  const sk = (o.look ?? 0) + (o.brush ?? 0) % 2;
  p.rect(bx + 3 + sk, by + 1, 4, 2, '#F4F1E8');
  p.rect(bx + 6 + sk, by + 2, 2, 2, '#F4F1E8');
  p.set(bx + 3 + sk, by + 1, '#E84E3C');
  p.set(bx + 7 + sk, by + 3, '#E84E3C');
  // button
  p.rect(X(cx - 1), Y(cy), 3, 2, '#4AA8E0');
  p.set(X(cx - 1), Y(cy), '#7FD1E8');
  // LED eyes (front of the top) with a navy glow
  const lx = X(cx - 6 + (o.look ?? 0) * 2);
  const ly = Y(cy + ry - 4);
  const col = o.led === 'amber' ? '#FFD23F' : '#5CE1FF';
  if (o.led === 'spin') {
    const a = ((o.ledPhase ?? 0) / 6) * Math.PI * 2;
    const sx = X(Math.round(cx + Math.cos(a) * 20));
    const sy = Y(Math.round(cy + Math.sin(a) * (ry - 1)));
    p.rect(sx, sy, 2, 1, '#5CE1FF');
  } else if (o.led !== 'off') {
    for (const ex of [lx, lx + 9]) {
      p.hline(ex - 1, ex + 2, ly + 1, '#2F4A8A');
      p.rect(ex, ly, 2, 1, col);
    }
  } else {
    for (const ex of [lx, lx + 9]) p.rect(ex, ly, 2, 1, '#3A4A6A');
  }
  // side brush (front-left): 3 bristles rotating
  const br = (o.brush ?? 0) % 4;
  const bcx = X(4);
  const bcy = Y(cy + ry);
  for (let i = 0; i < 3; i++) {
    const a = (br / 4) * Math.PI * 2 + (i / 3) * Math.PI * 2;
    p.line(bcx, bcy, bcx + Math.round(Math.cos(a) * 4), bcy + Math.round(Math.sin(a) * 2), '#3A3F48');
  }
  p.outline(K.outline);
  rimLeft(p, K.rim, 0.45);
  if (o.tilt) {
    // tipped over (失敗): shift rows for a rolling look
    const q = new PixelCanvas(W, H);
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        const v = p.get(x, y);
        if (!(v >>> 24)) continue;
        const ny = y + Math.round(((x - W / 2) / W) * o.tilt * 8);
        if (ny >= 0 && ny < H) q.set(x, ny, v);
      }
    return q;
  }
  return p;
}

let restoredC: HTMLCanvasElement | null = null;
function restored(): HTMLCanvasElement {
  if (restoredC) return restoredC;
  // tiny vacuum docked on its charger
  const p = new PixelCanvas(20, 12);
  p.rect(12, 2, 7, 9, '#3A3F48');
  p.rect(13, 3, 5, 2, '#5A5F68');
  p.set(15, 4, '#5CE1FF');
  const top = new Mask(20, 12).ellipse(8, 6, 7, 3.5);
  shade(p, top, TOP, { mode: 'sphere', base: 0.6 });
  p.hline(2, 14, 9, '#6B7186');
  p.set(5, 7, '#5CE1FF');
  p.set(8, 7, '#5CE1FF');
  p.outline(K.outline);
  restoredC = p.toCanvas();
  return restoredC;
}

registerEnemyArt('enemy_soujirou', (): EnemyArt => {
  const cache = new Map<string, HTMLCanvasElement>();
  const get = (key: string, o: SoujiPose) => {
    let c = cache.get(key);
    if (!c) {
      c = build(o).toCanvas();
      cache.set(key, c);
    }
    return c;
  };
  return {
    id: 'enemy_soujirou',
    w: W,
    h: H,
    ox: OX,
    oy: OY,
    frame(v: EnemyView): HTMLCanvasElement {
      const brush = loop(v.gt, 60, 4);
      const blink = loop(v.gt, 600, 2) ? 'on' : 'off';
      if (v.pose === 'hurt') return get('hurt', { dent: true, brush, led: 'on' });
      if (v.pose === 'lift') return get(`lift${brush}`, { lift: 5, brush, led: 'on' });
      if (v.pose === 'fall') return get(`fall${loop(v.t, 90, 2)}`, { tilt: loop(v.t, 90, 2) ? 1 : -1, led: 'off' });
      if (v.pose === 'charge') {
        const look = loop(v.t, 260, 2) ? 1 : -1;
        return get(`chg${look}${loop(v.t, 200, 2)}`, { led: loop(v.t, 200, 2) ? 'amber' : 'off', look, brush: 0 });
      }
      if (v.skill === 'skill_souji_teinei' && (v.pose === 'windup' || v.pose === 'attack')) {
        const ph = loop(v.t, 50, 6);
        return get(`spin${ph}${brush}`, { led: 'spin', ledPhase: ph, brush: (brush + ph) % 4 });
      }
      if (v.pose === 'attack') return get(`atk${brush}`, { lift: 2, brush, led: 'on' });
      const f = loop(v.gt, 120, 4);
      return get(`idle${f}${brush}${blink}`, { jitter: [0, 1, 0, -1][f] > 0 ? 1 : 0, brush, led: blink as 'on' | 'off' });
    },
    restored,
    gallery: [
      { pose: 'idle' },
      { pose: 'windup', skill: 'skill_souji_teinei' },
      { pose: 'lift' },
      { pose: 'fall' },
      { pose: 'charge' },
      { pose: 'hurt' },
    ],
  };
});
