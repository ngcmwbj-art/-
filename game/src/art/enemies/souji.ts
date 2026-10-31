// ソウジロウ (48×24): a disc robot vacuum seen from slightly above (11.6).
// Glossy pearl-grey lid with a chrome trim, a bevelled lid seam and the mall's
// ceiling lights reflected in it; a ribbed side band and a rubber bumper; LED
// "eyes" with a blue glow; a smoked dust-bin window with one lonely sock in
// the dust; a spinning three-bristle side brush. It can turn its whole top
// (the features revolve), rear up over a step (showing its wheels), and roll
// over onto its back.

import { PixelCanvas } from '../../engine/pixel';
import { hash2 } from '../../engine/rng';
import { registerEnemyArt, loop, type EnemyArt, type EnemyView } from './index';
import { K, Mask, rimLeft, shade } from './lib';

const W = 64;
const H = 44;
const OX = 8;
const OY = 16;

const TOP = ['#6E747E', '#848A94', '#9AA0A8', '#B0B6BE', '#C6CBD2', '#D8DDE2', '#E8ECF0'];
const BAND = { lit: '#C8CDD4', mid: '#9AA0A8', dark: '#7E8494', deep: '#5E6472' };
const RUBBER = { top: '#6B7186', mid: '#3A3F48', deep: '#262A32' };

interface SoujiPose {
  /** Forward/back jitter (px, logical y). */
  jitter?: number;
  led?: 'on' | 'off' | 'amber' | 'wide' | 'squint';
  /** Rotation of the lid features (radians, 0 = eyes to the front). */
  rot?: number;
  brush?: number;
  dent?: boolean;
  /** 'top' normal, 'lift' front reared up over a step, 'under' flipped over. */
  view?: 'top' | 'lift' | 'under';
  /** Roll while flipped (−1..1). */
  roll?: number;
  /** Speed streaks behind (dash). */
  streaks?: boolean;
  /** Wheel tread phase (under / lift). */
  wheel?: number;
}

const cx = 24;

/** Point on the lid ellipse at angle a (0 = right, π/2 = front/screen-down), radius factor k. */
function lidPt(a: number, k: number, cy: number, ry: number): [number, number] {
  return [cx + Math.cos(a) * 23 * k, cy + Math.sin(a) * ry * k];
}

function build(o: SoujiPose): PixelCanvas {
  const view = o.view ?? 'top';
  if (view === 'under') return buildUnder(o);
  const p = new PixelCanvas(W, H);
  const jy = o.jitter ?? 0;
  const X = (v: number) => Math.round(v + OX);
  const Y = (v: number) => Math.round(v + OY + jy);
  const lift = view === 'lift';
  // lid ellipse (seen from 20° above); rearing up flattens it and lifts it
  const ry = lift ? 3.2 : 8;
  const cy = lift ? 4 : 9;
  const bandH = lift ? 6 : 5;
  const rot = o.rot ?? 0;

  const lidBottom = (x: number) => {
    const dx = (x + 0.5 - cx) / 23;
    return cy + ry * Math.sqrt(Math.max(0, 1 - dx * dx)) * 0.96;
  };

  // ---- underside (only when reared up): dark base, wheels, intake ----
  if (lift) {
    const uy = cy + bandH + 1;
    const under = new Mask(W, H);
    for (let x = 1; x < 47; x++) {
      const dx = (x + 0.5 - cx) / 23;
      const e = Math.sqrt(Math.max(0, 1 - dx * dx));
      const y0 = Math.round(lidBottom(x) + bandH - 1);
      const y1 = Math.round(uy + 7 * e);
      for (let y = y0; y <= y1; y++) under.set(X(x), Y(y));
    }
    shade(p, under, ['#2E323A', '#3A3F48', '#4A4F58', '#5A5F68'], { base: 0.45, k: 0.3, bevel: 2 });
    // two rubber drive wheels (treads roll)
    for (const wx of [cx - 13, cx + 10]) {
      const wy = uy + 1;
      p.rect(X(wx), Y(wy), 4, 6, RUBBER.deep);
      for (let i = 0; i < 3; i++) p.hline(X(wx), X(wx + 3), Y(wy + ((i * 2 + (o.wheel ?? 0)) % 6)), RUBBER.mid);
      p.rect(X(wx + 1), Y(wy + 2), 2, 2, '#9AA0A8');
      p.set(X(wx + 1), Y(wy + 2), '#C8CDD4');
    }
    // suction intake with a brush roll and a caster
    p.rect(X(cx - 6), Y(uy + 2), 12, 3, '#1B1733');
    for (let i = 0; i < 12; i += 2) p.set(X(cx - 6 + i + ((o.wheel ?? 0) & 1)), Y(uy + 3), '#E84E3C');
    p.rect(X(cx - 1), Y(uy + 5), 2, 2, '#6B7186');
  }

  // ---- side band (ribbed plastic) and the rubber bumper on the front ----
  const band = new Mask(W, H);
  for (let x = 1; x < 47; x++) {
    const y0 = Math.round(lidBottom(x));
    for (let y = y0; y < y0 + bandH; y++) band.set(X(x), Y(y));
  }
  band.each((x, y) => {
    const u = (x - X(1)) / 46;
    let col = u < 0.12 ? BAND.lit : u < 0.55 ? BAND.mid : u < 0.82 ? BAND.dark : BAND.deep;
    // vent ribs every 4px on the upper half of the band
    const lx = x - OX;
    const y0 = Y(Math.round(lidBottom(lx)));
    if (y - y0 === 1 && lx % 4 === 1 && lx > 4 && lx < 44) col = BAND.deep;
    if (y - y0 === 0 && u < 0.4) col = '#DADFE4';
    p.set(x, y, col);
  });
  // bumper: the front arc of the band, 3px (4 when reared up), dented on a hit
  for (let x = 4; x < 44; x++) {
    const y0 = Math.round(lidBottom(x)) + bandH - (lift ? 4 : 3);
    const dent = o.dent && x > 17 && x < 30 ? 1 : 0;
    const hh = lift ? 4 : 3;
    for (let k = 0; k < hh; k++) {
      const col = k === 0 ? RUBBER.top : k === hh - 1 ? RUBBER.deep : RUBBER.mid;
      p.set(X(x), Y(y0 + k + dent), col);
    }
    if (dent) p.set(X(x), Y(y0), BAND.dark);
    // rubber sheen
    if (x > 8 && x < 14) p.set(X(x), Y(y0 + 1 + dent), '#8A90A0');
  }

  // ---- lid ----
  const lid = new Mask(W, H).ellipse(X(cx), Y(cy), 23, ry);
  shade(p, lid, TOP, { mode: 'sphere', cx: X(cx - 8), cy: Y(cy - ry * 0.6), rx: 30, ry: ry * 2.2, base: 0.62, k: 0.7, dither: 0.12 });
  // chrome trim: bright on the upper left, dark on the lower right
  lid.each((x, y) => {
    const outer = !lid.in(x - 1, y) || !lid.in(x + 1, y) || !lid.in(x, y - 1) || !lid.in(x, y + 1);
    if (!outer) return;
    const lx = x - X(cx);
    const ly = y - Y(cy);
    p.set(x, y, lx * 0.6 + ly * 1.6 < 0 ? '#EEF1F4' : '#7E848E');
  });
  if (!lift) {
    // bevelled lid seam at 72%: dark line above, light line below
    for (let a = 0; a < Math.PI * 2; a += 0.012) {
      const [sx, sy] = lidPt(a, 0.72, cy, ry);
      const x = X(sx);
      const y = Y(sy);
      if (!lid.in(x, y)) continue;
      const front = Math.sin(a) > 0;
      p.set(x, y, front ? '#E8ECF0' : '#8A909A');
    }
    // the mall's ceiling lights reflected in the gloss (two soft streaks)
    for (let i = 0; i < 7; i++) {
      p.set(X(cx + 7 + i), Y(cy - 5 + Math.round(i * 0.15)), '#F4F6F8');
      if (i < 5) p.set(X(cx + 9 + i), Y(cy - 3 + Math.round(i * 0.15)), '#E0E4E8');
    }
  }
  // smoked face plate on the front of the lid (revolves with it): the LED
  // eyes glow out of it like a visor
  const plate = new Mask(W, H);
  const plateA = Math.PI / 2 + rot;
  lid.each((x, y) => {
    const u = (x + 0.5 - X(cx)) / 23;
    const v = (y + 0.5 - Y(cy)) / ry;
    const r = Math.hypot(u, v);
    let da = Math.atan2(v, u) - plateA;
    da = Math.atan2(Math.sin(da), Math.cos(da));
    if (r > 0.16 && r < (lift ? 0.95 : 0.8) && Math.abs(da) < 0.8) plate.set(x, y);
  });
  plate.each((x, y) => {
    const top = !plate.in(x, y - 1);
    const u = (x - X(cx)) / 23;
    p.set(x, y, top ? '#5A5F68' : u < -0.08 ? '#353A44' : '#2A2E36');
  });
  // gloss streak across the plate
  plate.each((x, y) => {
    const d = (x - X(cx - 6)) + (y - Y(cy)) * 2;
    if (d >= 0 && d < 2 && !plate.in(x, y - 1) === false) p.set(x, y, '#6B7186');
  });

  // specular arc on the upper left + a hot spot
  for (let a = 3.35; a < 4.35; a += 0.03) {
    const [sx, sy] = lidPt(a, 0.86, cy, ry);
    p.set(X(sx), Y(sy), '#FFFFFF');
    if (a > 3.6 && a < 4.1 && !lift) {
      const [tx, ty] = lidPt(a, 0.8, cy, ry);
      p.set(X(tx), Y(ty), '#F4F6F8');
    }
  }
  p.set(X(cx - 15), Y(cy - Math.round(ry * 0.35)), '#FFFFFF');

  if (!lift) {
    // ---- dust bin window at the back (it revolves with the lid) ----
    const [bxC, byC] = lidPt(-Math.PI / 2 + rot, 0.42, cy, ry);
    const bx = Math.round(bxC - 7);
    const by = Math.round(byC - 3);
    const bw = Math.max(6, Math.round(14 * (0.55 + 0.45 * Math.abs(Math.cos(rot)))));
    const bxx = Math.round(bxC - bw / 2);
    for (let y = 0; y < 6; y++)
      for (let x = 0; x < bw; x++) {
        const corner = (x === 0 || x === bw - 1) && (y === 0 || y === 5);
        if (corner) continue;
        const rim = x === 0 || x === bw - 1 || y === 0 || y === 5;
        let c = rim ? '#6E747E' : y === 1 ? '#C9D2DC' : '#A3AFBC';
        if (!rim && y >= 3 && hash2(x, y, 3) < 0.55) c = hash2(x, y, 9) < 0.5 ? '#6B7186' : '#8A90A0';
        p.set(X(bxx + x), Y(by + y), c);
      }
    void bx;
    // the lonely sock (white, red toe and heel), tumbling with the lid
    const sk = Math.round(Math.sin(rot * 2) * 1.5);
    const sx0 = bxx + Math.max(1, Math.round(bw / 2) - 3) + sk;
    p.hline(X(sx0), X(sx0 + 3), Y(by + 2), '#F4F1E8');
    p.hline(X(sx0 + 2), X(sx0 + 4), Y(by + 3), '#F4F1E8');
    p.set(X(sx0), Y(by + 2), '#E84E3C');
    p.set(X(sx0 + 4), Y(by + 3), '#E84E3C');
    p.set(X(sx0 + 1), Y(by + 3), '#C8C2B4');
    // glass glint
    p.set(X(bxx + 1), Y(by + 1), '#FFFFFF');
    p.set(X(bxx + 2), Y(by + 1), '#E8ECF0');
    // ---- the round button in the middle ----
    const [bcx, bcy] = lidPt(0, 0, cy, ry);
    p.rect(X(bcx - 1), Y(bcy - 1), 3, 3, '#2F7AB0');
    p.set(X(bcx), Y(bcy - 1), '#4AA8E0');
    p.set(X(bcx - 1), Y(bcy), '#4AA8E0');
    p.set(X(bcx), Y(bcy), '#7FD1E8');
    p.set(X(bcx - 1), Y(bcy - 1), '#9FE3F2');
  }

  // ---- LED eyes (front of the lid; revolve with it) ----
  const led = o.led ?? 'on';
  const eyeCol = led === 'amber' ? '#FFD23F' : led === 'off' ? '#2F5A6E' : '#5CE1FF';
  const glow = led === 'amber' ? '#8A5A2A' : '#2F4A8A';
  for (const side of [-1, 1]) {
    const a = Math.PI / 2 + rot + side * (lift ? 0.3 : 0.34);
    const [ex, ey] = lidPt(a, lift ? 0.62 : 0.5, cy, ry);
    const x = X(ex) - 1;
    const y = Y(ey) - (lift ? 1 : 0);
    const tall = led === 'wide' || led === 'on' || led === 'amber' ? 2 : 1;
    if (led !== 'off') {
      p.hline(x - 1, x + 3, y - 1, glow);
      p.hline(x - 1, x + 3, y + tall, glow);
      p.set(x - 1, y, glow);
      p.set(x + 3, y, glow);
      if (tall === 2) {
        p.set(x - 1, y + 1, glow);
        p.set(x + 3, y + 1, glow);
      }
    }
    if (led === 'squint') {
      p.hline(x, x + 2, y, '#2F4A8A');
      p.set(x + 1, y, eyeCol);
    } else {
      p.rect(x, y, 3, tall, eyeCol);
      if (led !== 'off') p.set(x, y, '#E8FCFF');
    }
  }

  // ---- side brush on the front left: hub + three bristles ----
  const br = (o.brush ?? 0) % 4;
  const bcxB = X(lift ? 3 : 3);
  const bcyB = Y(lift ? cy + bandH + 4 : lidBottom(3) + 3);
  for (let i = 0; i < 3; i++) {
    const a = (br / 4) * ((Math.PI * 2) / 3) + (i / 3) * Math.PI * 2;
    const ex = bcxB + Math.round(Math.cos(a) * 5);
    const ey = bcyB + Math.round(Math.sin(a) * 2.2);
    p.line(bcxB, bcyB, ex, ey, '#3A3F48');
    p.set(ex, ey, '#8A90A0');
  }
  p.rect(bcxB - 1, bcyB - 1, 2, 2, '#6B7186');
  p.set(bcxB - 1, bcyB - 1, '#9AA0A8');

  p.outline(K.outline);
  rimLeft(p, K.rim, 0.42);

  // speed streaks flaring out on both sides (the dash toward the camera)
  if (o.streaks) {
    for (const [y, len] of [[3, 5], [8, 7], [13, 6], [17, 4]] as [number, number][]) {
      for (let i = 0; i < len; i++) {
        const c = i < 2 ? '#F4F6F8' : '#C8CDD4';
        p.under(X(-1 - i), Y(y + Math.round(i * 0.3)), c);
        p.under(X(48 + i), Y(y + Math.round(i * 0.3)), c);
      }
    }
  }
  return p;
}

/** Flipped onto its back: the dark underside with its wheels spinning in the air. */
function buildUnder(o: SoujiPose): PixelCanvas {
  const p = new PixelCanvas(W, H);
  const X = (v: number) => Math.round(v + OX);
  const Y = (v: number) => Math.round(v + OY);
  const cy = 10;
  const ry = 8;
  // the lid edge (now at the bottom) peeks out as a pale band
  const band = new Mask(W, H);
  for (let x = 1; x < 47; x++) {
    const dx = (x + 0.5 - cx) / 23;
    const y0 = Math.round(cy + ry * Math.sqrt(Math.max(0, 1 - dx * dx)) * 0.96);
    for (let y = y0; y < y0 + 4; y++) band.set(X(x), Y(y));
  }
  shade(p, band, TOP, { mode: 'cyl', base: 0.55, k: 0.5 });
  const base = new Mask(W, H).ellipse(X(cx), Y(cy), 23, ry);
  shade(p, base, ['#262A32', '#2E323A', '#3A3F48', '#4A4F58', '#5A5F68'], { mode: 'sphere', cx: X(cx - 6), cy: Y(cy - 4), rx: 30, ry: 16, base: 0.5, k: 0.5 });
  // screws and the battery hatch
  p.strokeRect(X(cx - 5), Y(cy - 5), 10, 5, '#262A32');
  p.hline(X(cx - 4), X(cx + 4), Y(cy - 5), '#6B7186');
  for (const [sx, sy] of [[cx - 16, cy - 2], [cx + 15, cy - 2], [cx - 8, cy + 5], [cx + 8, cy + 5]]) p.set(X(sx), Y(sy), '#9AA0A8');
  // wheels spinning in the air
  const wph = o.wheel ?? 0;
  for (const wx of [cx - 15, cx + 11]) {
    p.rect(X(wx), Y(cy - 3), 4, 7, RUBBER.deep);
    for (let i = 0; i < 3; i++) p.hline(X(wx), X(wx + 3), Y(cy - 3 + ((i * 2 + wph) % 7)), RUBBER.mid);
    p.rect(X(wx + 1), Y(cy - 1), 2, 2, '#C0C6CC');
  }
  // brush roll with its red bristles
  p.rect(X(cx - 7), Y(cy + 1), 14, 3, '#1B1733');
  for (let i = 0; i < 14; i += 2) p.set(X(cx - 7 + i + (wph & 1)), Y(cy + 2), '#E84E3C');
  p.outline(K.outline);
  rimLeft(p, K.rim, 0.35);
  const roll = o.roll ?? 0;
  if (!roll) return p;
  // rolling: shear the rows (the disc rocks on its rim)
  const q = new PixelCanvas(W, H);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const v = p.get(x, y);
      if (!(v >>> 24)) continue;
      const ny = y + Math.round(((x - W / 2) / W) * roll * 8);
      if (ny >= 0 && ny < H) q.set(x, ny, v);
    }
  return q;
}

let restoredC: HTMLCanvasElement | null = null;
function restored(): HTMLCanvasElement {
  if (restoredC) return restoredC;
  // tiny vacuum docked on its charger, one green light on
  const p = new PixelCanvas(22, 13);
  p.rect(14, 1, 7, 10, '#3A3F48');
  p.rect(15, 2, 5, 3, '#5A5F68');
  p.set(17, 3, '#9BCB6B');
  p.rect(12, 10, 10, 2, '#262A32');
  const top = new Mask(22, 13).ellipse(9, 6, 8, 3.5);
  shade(p, top, TOP, { mode: 'sphere', base: 0.62, k: 0.6 });
  p.hline(2, 16, 9, '#7E8494');
  p.hline(3, 15, 10, '#3A3F48');
  p.set(6, 7, '#5CE1FF');
  p.set(10, 7, '#5CE1FF');
  p.set(4, 4, '#FFFFFF');
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
      // the LED eyes stay lit, dimming briefly (a slow blink) every 1.2s
      const blink = v.gt % 1200 < 110 ? 'off' : 'on';
      if (v.pose === 'hurt') return get(`hurt${brush}`, { dent: true, brush, led: 'squint' });
      if (v.pose === 'lift') {
        const wh = loop(v.t, 50, 6);
        return get(`lift${brush}${wh}`, { view: 'lift', brush, led: 'wide', wheel: wh });
      }
      if (v.pose === 'fall') {
        const f = loop(v.t, 90, 4);
        return get(`fall${f}`, { view: 'under', roll: [1, 0, -1, 0][f], wheel: f * 2 });
      }
      if (v.pose === 'charge') {
        // amber LEDs, the lid turning left and right looking for its base
        const f = loop(v.t, 260, 4);
        const rot = [-0.45, 0, 0.45, 0][f];
        return get(`chg${f}${loop(v.t, 200, 2)}`, { led: loop(v.t, 200, 2) ? 'amber' : 'off', rot, brush: 0 });
      }
      if (v.skill === 'skill_souji_teinei' && (v.pose === 'windup' || v.pose === 'attack')) {
        // spins on the spot: the whole lid (eyes, bin, button) goes round
        const ph = loop(v.t, 50, 8);
        return get(`spin${ph}${brush}`, { led: 'on', rot: (ph / 8) * Math.PI * 2, brush: (brush + ph) % 4 });
      }
      if (v.pose === 'attack') return get(`atk${brush}`, { brush, led: 'wide', streaks: true });
      const f = loop(v.gt, 120, 4);
      return get(`idle${f}${brush}${blink}`, { jitter: [0, 1, 0, -1][f], brush, led: blink as 'on' | 'off' });
    },
    restored,
    gallery: [
      { pose: 'idle' },
      { pose: 'windup', skill: 'skill_souji_teinei', t: 100 },
      { pose: 'windup', skill: 'skill_souji_teinei', t: 250 },
      { pose: 'lift' },
      { pose: 'attack', skill: 'skill_souji_dansa' },
      { pose: 'fall' },
      { pose: 'charge', t: 0 },
      { pose: 'charge', t: 520 },
      { pose: 'hurt' },
    ],
  };
});
