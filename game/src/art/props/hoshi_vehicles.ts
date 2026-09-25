// The vehicles of chapter 2 (52_ch2_level_art 10.6, 6.1, 6.2): the unlit
// one-car train (seen from above, running north–south over 夕鳴町's
// crossing; and side-on, standing at 星見台's siding), the village bus (side
// view facing west at the turning circle; the back view facing north at 夕鳴町's
// bus stop), the little step that rises out of the crossing, and the plastic
// bag with four tomatoes.
//
// Props (the events place and move them):
//   prop_h_train_1car  opts { door: 0 | 1 | 2 }        30×122, anchor = the car's centre column on its tile
//   prop_h_train_side  opts { door: 0 | 1 }            124×40, anchor = the west end tile of the car
//   prop_h_bus         opts { view?: 'side' | 'back', lit?: boolean }  side 64×40 (4×2 tiles), back 34×72
//   prop_h_fumidai     opts { k: 0 | 1 | 2 }            the step rising (3 frames)
//   prop_h_tomato_bag                                   12×12
// Frames for scripted drawing: hoshiTrainImage(door), hoshiTrainSideImage(door), hoshiBusImage(view, lit).

import { mix, PixelCanvas } from '../../engine/pixel';
import { P } from '../tiles/palette';
import { outline } from './kit';
import { hs, nightK } from './hoshi_kit';
import { drawLight, poolEllipse, poolTrapezoid } from './light';
import { registerProp } from './registry';
import { fontTextSmall, handText } from './text';
import type { PropArt, PropEnv } from './types';

// ---------------------------------------------------------------- the one-car train (from above, N–S)

const CAR_W = 28;
const CAR_L = 112;
const NOSE = 10;

const trainCache = new Map<string, HTMLCanvasElement>();

/** The one-car one-man train seen from above, heading south (its face at the bottom). */
export function hoshiTrainImage(door = 0, sign = 0): HTMLCanvasElement {
  const key = `${door}|${sign}`;
  const hit = trainCache.get(key);
  if (hit) return hit;
  const w = CAR_W + 2;
  const h = CAR_L + NOSE + 2;
  const p = new PixelCanvas(w, h);
  const x0 = 1;
  const y0 = 1;
  const y1 = y0 + CAR_L - 1;
  const R0 = x0 + 5;
  const R1 = x0 + CAR_W - 6;
  const mid = x0 + Math.floor(CAR_W / 2);
  // body: dark, unlit (a "明かりのない電車")
  p.rect(x0, y0, CAR_W, CAR_L, P.asphalt);
  p.vline(x0, y0, y1, P.steel);
  p.vline(x0 + CAR_W - 1, y0, y1, P.charcoal);
  // windows along both sides, dark; two doors per side
  const doors = [y0 + 22, y0 + 88];
  for (const side of [x0 + 1, x0 + CAR_W - 4]) {
    for (let wy = y0 + 4; wy < y1 - 4; wy++) {
      if (doors.some((d) => Math.abs(wy - d) <= 6)) continue;
      const seg = (wy - y0) % 10;
      if (seg < 8) p.hline(side, side + 2, wy, seg === 0 ? P.nightShade : P.night);
    }
    for (const d of doors) {
      p.rect(side, d - 5, 3, 11, P.charcoal);
      p.hline(side, side + 2, d, P.ink);
    }
  }
  // the west door (the side the children board from) opening: 2 frames
  if (door > 0) {
    const d = doors[1];
    const gap = door === 1 ? 2 : 5;
    p.rect(x0 - 1, d - gap, 4, gap * 2, P.void);
    p.vline(x0 - 1, d - gap, d + gap - 1, P.nightShade);
  }
  // the roof: pale, gutters, seams, one air conditioner, one pantograph
  p.rect(R0, y0 + 1, R1 - R0 + 1, CAR_L - 2, P.steel);
  p.vline(R0, y0 + 1, y1 - 1, P.concrete);
  p.vline(R1, y0 + 1, y1 - 1, P.asphalt);
  p.vline(R0 - 1, y0, y1, P.charcoal);
  p.vline(R1 + 1, y0, y1, P.charcoal);
  for (let yy = y0 + 4; yy < y1 - 1; yy += 8) p.hline(R0 + 1, R1 - 1, yy, P.concrete);
  p.vline(mid, y0 + 2, y1 - 2, P.concrete);
  const ac = y0 + 60;
  p.rect(R0 + 3, ac, R1 - R0 - 5, 16, P.concrete);
  p.strokeRect(R0 + 3, ac, R1 - R0 - 5, 16, P.asphalt);
  for (let k = 0; k < 5; k++) p.hline(R0 + 5, R1 - 4, ac + 3 + k * 2, P.asphalt);
  const py = y0 + 24;
  p.rect(mid - 6, py, 12, 2, P.charcoal);
  p.rect(mid - 6, py + 16, 12, 2, P.charcoal);
  p.line(mid - 5, py + 2, mid, py + 8, P.asphalt);
  p.line(mid + 5, py + 2, mid, py + 8, P.asphalt);
  p.line(mid - 5, py + 15, mid, py + 9, P.asphalt);
  p.line(mid + 5, py + 15, mid, py + 9, P.asphalt);
  p.hline(mid - 9, mid + 9, py + 8, P.steel);
  // the back end (north): a darker line and the tail
  p.hline(x0, x0 + CAR_W - 1, y0, P.charcoal);
  // the face (south)
  const fy = y1 + 1;
  p.rect(x0, fy, CAR_W, NOSE, P.charcoal);
  p.hline(x0, x0 + CAR_W - 1, fy, P.asphalt);
  p.rect(x0 + 2, fy + 2, 10, 5, P.void);
  p.rect(x0 + CAR_W - 12, fy + 2, 10, 5, P.void);
  p.set(x0 + 3, fy + 3, P.nightShade);
  p.rect(x0 + 2, fy + 8, 2, 1, P.ink);
  p.rect(x0 + CAR_W - 4, fy + 8, 2, 1, P.ink);
  p.rect(mid - 2, fy + NOSE - 2, 4, 2, P.ink);
  p.strokeRect(0, 0, w, h, P.ink);
  // the destination sign 「星見台」: the only faint light (2 frames of flicker)
  const sw = 24;
  const sx = x0 + Math.floor((CAR_W - sw) / 2);
  const sy = fy - 10;
  p.rect(sx - 1, sy - 1, sw + 2, 11, P.ink);
  p.rect(sx, sy, sw, 9, sign ? P.nightShade : P.night);
  handText(p, '星見台', sx + 1, sy + 1, sign ? P.glint : P.horizon, { spacing: 1 });
  const c = p.toCanvas();
  trainCache.set(key, c);
  return c;
}

registerProp('prop_h_train_1car', (opts) => {
  const door = Number(opts.door ?? 0);
  const a: PropArt = {
    ox: 8 - 15,
    oy: 16 - (CAR_L + NOSE + 2),
    w: CAR_W + 2,
    h: CAR_L + NOSE + 2,
    foot: 15,
    img: (env: PropEnv) => hoshiTrainImage(door, Math.floor(env.t / 90) % 2),
    contact: 0,
    glow(g, x, y, env) {
      // the sign's weak backlight
      const k = Math.max(0.4, nightK(env));
      g.rect(x + 8 - 12, y + 16 - NOSE - 12, 24, 9, '#FFE7A3', 0.16 * k * (Math.floor(env.t / 90) % 2 ? 1 : 0.7));
    },
  };
  return a;
});

// ---------------------------------------------------------------- the train standing at the siding (side-on, E–W)

const sideCache = new Map<number, HTMLCanvasElement>();

/** 124×40: the roof from above and the south side (#2A2440, panels #3A2B5C), the face to the east. */
export function hoshiTrainSideImage(door = 0): HTMLCanvasElement {
  const hit = sideCache.get(door);
  if (hit) return hit;
  const W = 124;
  const H = 40;
  const p = new PixelCanvas(W, H);
  // the roof strip
  p.rect(1, 1, W - 8, 9, P.asphalt);
  p.hline(1, W - 8, 1, P.steel);
  for (let x = 8; x < W - 8; x += 8) p.vline(x, 2, 8, P.charcoal);
  p.rect(46, 2, 20, 6, P.steel);
  p.hline(46, 65, 2, P.concrete);
  // the side
  p.rect(1, 10, W - 8, 24, P.ink);
  for (let x = 4; x < W - 10; x += 22) p.rect(x, 12, 18, 20, P.nightShade);
  // five dark windows, a 1px reflection each
  for (let k = 0; k < 5; k++) {
    const x = 6 + k * 22;
    p.rect(x, 14, 14, 8, P.void);
    p.hline(x, x + 13, 14, P.nightShade);
    p.line(x + 2, 21, x + 6, 15, P.nightShade);
  }
  // the door (between window 3 and 4) and its step
  const dx = 72;
  p.rect(dx, 13, 10, 19, door ? P.void : P.night);
  p.vline(dx + 5, 13, 31, door ? P.void : P.ink);
  if (door) {
    p.rect(dx - 3, 13, 3, 19, P.night);
    p.rect(dx + 10, 13, 3, 19, P.night);
  }
  // the side sign 「星見台」 (weakly lit)
  p.rect(24, 24, 26, 8, P.night);
  handText(p, '星見台', 25, 24, P.horizon, { spacing: 1 });
  // the face at the east
  p.rect(W - 8, 4, 7, 30, P.charcoal);
  p.vline(W - 8, 4, 33, P.asphalt);
  p.rect(W - 6, 12, 4, 6, P.void);
  // the underframe and the wheels
  p.rect(2, 34, W - 10, 3, P.charcoal);
  for (const x of [14, 30, 88, 104]) {
    p.ellipse(x, 36, 3.5, 3, P.ink);
    p.set(x, 35, P.asphalt);
  }
  outline(p, { bottom: true, soft: true });
  const c = p.toCanvas();
  sideCache.set(door, c);
  return c;
}

registerProp('prop_h_train_side', (opts) => {
  const img = hoshiTrainSideImage(Number(opts.door ?? 0));
  return { ox: 0, oy: 16 - 40, w: 124, h: 40, foot: 15, img: () => img, contact: 0 };
});

// ---------------------------------------------------------------- the village bus

const busCache = new Map<string, HTMLCanvasElement>();

/**
 * Side view facing west (64×40): white #E8E4D8, the green waist band, six
 * dark windows, 「村営バス」 on the side, the door at the front on the south
 * side (the side we see), the destination sign 「ユウナリ前」 (lit in h3).
 */
function busSide(lit: boolean): HTMLCanvasElement {
  const key = 'side' + lit;
  const hit = busCache.get(key);
  if (hit) return hit;
  const W = 64;
  const H = 40;
  const p = new PixelCanvas(W, H);
  const BODY = P.concreteLt;
  // the roof strip, seen from above
  p.rect(3, 1, W - 6, 8, P.white);
  p.hline(3, W - 4, 1, P.glint);
  p.rect(34, 2, 16, 5, P.concrete); // the roof air conditioner
  p.hline(34, 49, 2, P.white);
  for (let x = 36; x < 49; x += 3) p.set(x, 5, P.steel);
  // the side
  p.rect(1, 9, W - 2, 24, BODY);
  p.hline(1, W - 2, 9, P.white);
  // the green band
  p.rect(1, 23, W - 2, 3, P.leaf);
  p.hline(1, W - 2, 23, P.leafYoung);
  p.hline(1, W - 2, 25, P.leafDeep);
  // the windscreen at the front (west), the driver's back behind it, the destination sign above it
  p.rect(1, 10, 5, 12, P.navy);
  p.line(2, 20, 4, 12, P.blue);
  if (lit) {
    // the morning: cap on, driving
    p.rect(3, 13, 3, 2, P.navy);
    p.hline(2, 5, 15, P.navy);
    p.rect(3, 16, 3, 4, P.aqua);
  } else {
    // h0–h2: asleep in his seat, the cap over his face (only its brim shows, 1px)
    p.rect(3, 15, 3, 5, mix(P.navy, P.shadeDeep, 0.4));
    p.hline(2, 5, 15, P.navy);
    p.set(5, 14, P.blue);
  }
  p.rect(2, 9, 16, 4, P.charcoal);
  if (lit) fontTextSmall(p, 'ユウナリ前', 2, 6, P.horizon);
  else p.hline(3, 16, 11, P.nightShade);
  // the door (front, south side)
  p.rect(7, 13, 8, 19, P.shadeDeep);
  p.vline(11, 13, 31, P.steel);
  p.rect(8, 15, 2, 7, P.navy);
  p.rect(12, 15, 2, 7, P.navy);
  p.hline(7, 14, 32, P.steel);
  // six windows
  for (let k = 0; k < 6; k++) {
    const x = 17 + k * 7;
    p.rect(x, 13, 6, 8, P.navy);
    p.hline(x, x + 5, 13, P.blue);
    p.set(x + 1, 14, P.aqua);
  }
  // 「村営バス」 under the windows
  fontTextSmall(p, '村営バス', 22, 25, P.leafShade);
  // the lower body, the bumpers
  p.rect(1, 30, W - 2, 3, P.concrete);
  p.hline(1, W - 2, 32, P.steel);
  p.rect(0, 28, 2, 5, P.steel);
  p.rect(W - 2, 28, 2, 5, P.steel);
  // mirror, head and tail lights
  p.rect(0, 11, 1, 5, P.charcoal);
  p.set(1, 27, P.goldPale);
  p.set(W - 2, 27, P.red);
  // wheels in their arches
  for (const cx of [13, 51]) {
    for (let y = 29; y <= 35; y++) for (let x = cx - 6; x <= cx + 6; x++) if (Math.hypot(x - cx, (y - 35) * 1.05) <= 5.8) p.set(x, y, P.ink);
    p.ellipse(cx, 35, 4.6, 4.6, P.ink);
    p.ellipse(cx, 35, 3.6, 3.6, P.charcoal);
    p.ellipse(cx, 35, 1.8, 1.8, P.steel);
  }
  outline(p, { bottom: true, soft: true });
  const c = p.toCanvas();
  busCache.set(key, c);
  return c;
}

/** Back view facing north (34×72): the roof and the back face, the rear window, tail lights. */
function busBack(lit: boolean): HTMLCanvasElement {
  const key = 'back' + lit;
  const hit = busCache.get(key);
  if (hit) return hit;
  const W = 34;
  const H = 72;
  const p = new PixelCanvas(W, H);
  // the long roof seen from above
  p.rect(2, 1, W - 4, 44, P.white);
  p.vline(2, 1, 44, P.glint);
  p.vline(W - 3, 1, 44, P.concrete);
  p.rect(8, 8, 18, 12, P.concrete);
  p.strokeRect(8, 8, 18, 12, P.steel);
  for (let y = 10; y < 19; y += 2) p.hline(10, 23, y, P.steel);
  p.rect(12, 30, 10, 6, P.concreteLt); // the roof hatch
  // the back face
  p.rect(1, 45, W - 2, 22, P.concreteLt);
  p.hline(1, W - 2, 45, P.white);
  p.rect(4, 47, W - 8, 8, P.navy); // rear window
  p.hline(4, W - 5, 47, P.blue);
  p.set(6, 48, P.aqua);
  p.rect(1, 57, W - 2, 3, P.leaf); // the green band
  p.hline(1, W - 2, 57, P.leafYoung);
  p.rect(2, 61, 4, 3, lit ? P.red : P.maroon); // tail lights
  p.rect(W - 6, 61, 4, 3, lit ? P.red : P.maroon);
  p.rect(12, 61, 10, 3, P.white); // the plate
  p.hline(13, 20, 62, P.leafShade);
  p.rect(1, 64, W - 2, 3, P.steel);
  p.rect(3, 67, 5, 5, P.ink);
  p.rect(W - 8, 67, 5, 5, P.ink);
  outline(p, { bottom: true, soft: true });
  const c = p.toCanvas();
  busCache.set(key, c);
  return c;
}

export function hoshiBusImage(view: 'side' | 'back' = 'side', lit = false): HTMLCanvasElement {
  return view === 'back' ? busBack(lit) : busSide(lit);
}

registerProp('prop_h_bus', (opts) => {
  const back = opts.view === 'back';
  const forced = opts.lit === undefined ? null : !!opts.lit;
  const isLit = (env: PropEnv) => forced ?? hs(env) >= 3;
  if (back) {
    return {
      ox: 1,
      oy: 16 * 5 - 72,
      w: 34,
      h: 72,
      foot: 16 * 5 - 1,
      img: (env: PropEnv) => busBack(isLit(env)),
      contact: 0,
      light(g, x, y, env) {
        if (!isLit(env)) return;
        // the warm light out of the open door onto the pavement (west side)
        const img = poolTrapezoid(10, 28, 22, '255,196,84');
        g.ctx.save();
        g.ctx.globalAlpha = 0.25 * Math.max(0.5, nightK(env));
        g.ctx.translate(x - 4, y + 50);
        g.ctx.rotate(Math.PI / 2);
        g.ctx.drawImage(img, 0, 0);
        g.ctx.restore();
      },
    } as PropArt;
  }
  const a: PropArt = {
    ox: 0,
    oy: 32 - 40,
    w: 64,
    h: 40,
    foot: 31,
    img: (env: PropEnv) => busSide(isLit(env)),
    shadow: 30,
    contact: 56,
    contactX: 32,
    over(g, x, y, env) {
      // h3: the engine is running: white puffs of exhaust at the back (east)
      if (!isLit(env)) return;
      for (let n = 0; n < 5; n++) {
        const ph = ((env.t / 900 + n * 0.2) % 1 + 1) % 1;
        g.rect(Math.round(x + 64 + ph * 10), Math.round(y + 26 - ph * 8 + Math.sin(ph * 9 + n) * 1.5), ph < 0.5 ? 2 : 1, 1, '#F4F1E8', 0.5 * (1 - ph));
      }
    },
    glow(g, x, y, env) {
      if (!isLit(env)) return;
      g.rect(x + 2, y - 7, 16, 4, '#FFE7A3', 0.5);
      for (let k = 0; k < 6; k++) g.rect(x + 17 + k * 7, y - 3, 6, 8, '#F6D98A', 0.35);
    },
    light(g, x, y, env) {
      if (!isLit(env)) return;
      drawLight(g, poolEllipse(30, 10, '255,196,84'), x + 32, y + 36, 0.25);
    },
  };
  return a;
});

// ---------------------------------------------------------------- 踏み台 (the step out of the crossing) and the tomato bag

registerProp('prop_h_fumidai', (opts) => {
  const k = Math.max(0, Math.min(2, Number(opts.k ?? 2)));
  const h = 2 + k * 2;
  const p = new PixelCanvas(12, 6);
  p.rect(0, 6 - h, 12, h, P.wood);
  p.hline(0, 11, 6 - h, P.goldPale);
  p.vline(11, 6 - h + 1, 5, P.woodDark);
  const img = p.toCanvas();
  return { ox: 2, oy: 10, w: 12, h: 6, foot: 15, img: () => img, contact: 0 };
});

registerProp('prop_h_tomato_bag', () => {
  const p = new PixelCanvas(12, 12);
  // a white plastic bag: four red tomatoes show through
  p.rect(1, 3, 10, 9, P.white);
  p.hline(1, 10, 3, P.glint);
  p.rect(2, 1, 2, 2, P.concreteLt); // the handles
  p.rect(8, 1, 2, 2, P.concreteLt);
  for (const [x, y] of [[3, 6], [6, 6], [3, 9], [7, 9]]) {
    p.rect(x, y, 3, 2, mix(P.red, P.white, 0.35));
    p.set(x + 1, y, mix(P.leafDeep, P.white, 0.4));
  }
  outline(p, { bottom: true, soft: true });
  const img = p.toCanvas();
  return { ox: 2, oy: 4, w: 12, h: 12, foot: 15, img: () => img, contact: 8 };
});
