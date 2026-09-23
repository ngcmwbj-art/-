// モール駐車場・踏切・用水路と対岸 (30_level_art 6.5 D / 踏切 / 用水路):
// lot lamps, chains, bus stop, covered car, pay machine, bike rack, cart
// corral; the level crossing; the torii & hokora, scarecrow, sluice gate,
// the railway bridge and the ゆうなりばし railings.

import type { Gfx } from '../../engine/gfx';
import { PixelCanvas } from '../../engine/pixel';
import { charSprite, idleFrame } from '../chars';
import { P } from '../tiles/palette';
import { ihash } from '../tiles/noise';
import { castRight, cylinder, dk, finish, lt, maskOf, outline } from './kit';
import { flat, floatOffset, mkFrames, stand, standAnim } from './pkit';
import { registerProp } from './registry';
import { poleLampState } from './street';
import { fontTextSmall, led, printLines, tiny } from './text';
import type { PropArt, PropEnv } from './types';

const pc = (w: number, h: number) => new PixelCanvas(w, h);

// ---------------------------------------------------------------- 照明灯 prop_lot_lamp

registerProp('prop_lot_lamp', (opts) => {
  const H = 76;
  const p = pc(22, H);
  cylinder(p, 9, 8, 4, H - 8, P.steel);
  p.rect(7, H - 4, 8, 4, P.charcoal);
  p.hline(7, 14, H - 4, P.asphalt);
  // twin lamp heads
  p.hline(3, 18, 8, P.asphalt);
  for (const x of [2, 14]) {
    p.rect(x, 4, 7, 4, P.concreteLt);
    p.hline(x, x + 6, 4, P.white);
    p.hline(x, x + 6, 7, P.goldPale);
  }
  // number plate
  p.rect(8, 40, 6, 5, P.white);
  tiny(p, String(Number(opts.v ?? 0) + 1), 9, 40, P.navy);
  finish(p, { soft: true });
  const a = stand(p.toCanvas(), { cx: 8, shadow: 72, contact: 8 });
  a.glow = (g, x, y, env) => {
    const on = poleLampState(env);
    if (on <= 0) return;
    const ctx = g.ctx;
    ctx.save();
    ctx.globalAlpha = on;
    ctx.fillStyle = P.glint;
    ctx.fillRect(Math.round(x + a.ox + 2), Math.round(y + a.oy + 7), 7, 1);
    ctx.fillRect(Math.round(x + a.ox + 14), Math.round(y + a.oy + 7), 7, 1);
    ctx.globalCompositeOperation = 'screen';
    const gx = x + 8;
    const gy = y + 12;
    const grd = ctx.createRadialGradient(gx, gy, 3, gx, gy, 48);
    grd.addColorStop(0, 'rgba(255,231,163,0.35)');
    grd.addColorStop(1, 'rgba(255,231,163,0)');
    ctx.fillStyle = grd;
    ctx.fillRect(gx - 48, gy - 40, 96, 80);
    ctx.restore();
  };
  return a;
});

// ---------------------------------------------------------------- チェーン prop_chain (stage 2: dropped)

function chainArt(dir: 'h' | 'v', len: number, dropped: boolean): { img: HTMLCanvasElement; ox: number; oy: number } {
  if (dir === 'h') {
    const w = len * 16 + 4;
    const p = pc(w, 22);
    const posts = [2, w - 4];
    for (const x of posts) {
      for (let y = 4; y < 21; y++) p.set(x, y, Math.floor(y / 3) % 2 ? P.red : P.white);
      p.set(x + 1, 4, P.concrete);
      for (let y = 5; y < 21; y++) p.set(x + 1, y, Math.floor(y / 3) % 2 ? P.vermShade : P.concrete);
      p.rect(x - 1, 20, 4, 2, P.asphalt);
    }
    for (let x = 4; x < w - 4; x++) {
      const t = (x - 4) / (w - 8);
      const y = dropped ? 20 : Math.round(8 + Math.sin(t * Math.PI) * 5);
      p.set(x, y, (x & 1) ? P.steel : P.concreteLt);
      if (dropped && x % 5 === 0) p.set(x, y - 1, P.steel);
    }
    finish(p, { soft: true, rim: false });
    return { img: p.toCanvas(), ox: -2, oy: -6 };
  }
  const h = len * 16 + 22;
  const p = pc(16, h);
  const posts = [18, h - 3];
  for (const y0 of posts) {
    for (let y = y0 - 16; y < y0; y++) p.set(7, y, Math.floor(y / 3) % 2 ? P.red : P.white);
    for (let y = y0 - 16; y < y0; y++) p.set(8, y, Math.floor(y / 3) % 2 ? P.vermShade : P.concrete);
    p.rect(6, y0 - 1, 4, 2, P.asphalt);
  }
  for (let y = 4; y < h - 18; y++) {
    const t = (y - 4) / (h - 22);
    const x = dropped ? 8 + Math.round(Math.sin(t * 9) * 1) : 8 + Math.round(Math.sin(t * Math.PI) * 3);
    const yy = dropped ? y + 16 : y;
    p.set(x, yy, (y & 1) ? P.steel : P.concreteLt);
  }
  finish(p, { soft: true, rim: false });
  return { img: p.toCanvas(), ox: 0, oy: -18 };
}

registerProp('prop_chain', (opts) => {
  const dir = opts.dir === 'v' ? 'v' : 'h';
  const len = Number(opts.len ?? 3);
  const up = chainArt(dir, len, false);
  const down = chainArt(dir, len, true);
  const dropped = (env: PropEnv) => env.stage >= 2 || env.flag('flag_parking_open') > 0;
  return {
    ox: up.ox,
    oy: up.oy,
    w: up.img.width,
    h: up.img.height,
    foot: dir === 'h' ? 14 : len * 16,
    img: (env: PropEnv) => (dropped(env) ? down.img : up.img),
    shadow: 18,
  };
});

// ---------------------------------------------------------------- バス停 obj_bus_stop

registerProp('obj_bus_stop', () => {
  const p = pc(22, 36);
  // bench
  p.rect(10, 26, 11, 3, P.aqua);
  p.hline(10, 20, 26, P.white);
  p.rect(11, 29, 1, 5, P.steel);
  p.rect(19, 29, 1, 5, P.steel);
  // pole with the round sign
  p.vline(5, 10, 35, P.steel);
  p.vline(6, 10, 35, P.asphalt);
  p.ellipse(5.5, 6, 5, 5, P.white);
  p.ring(5.5, 6, 5, 5, P.navy);
  p.hline(2, 9, 6, P.navy);
  p.set(4, 4, P.navy);
  p.set(7, 4, P.navy);
  // timetable
  p.rect(1, 13, 10, 10, P.white);
  p.strokeRect(1, 13, 10, 10, P.navy);
  printLines(p, 2, 15, 8, 4, P.navy, 3);
  p.rect(4, 33, 4, 3, P.charcoal);
  finish(p, { soft: true });
  return stand(p.toCanvas(), { cx: 8, shadow: 34, contact: 16 });
});

// ---------------------------------------------------------------- カバーの車 obj_covered_car (37–39, 12–13)

const CAR = mkFrames(3, 50, 34, (p, k) => {
  // a hatchback under a silver body cover, seen from above-front:
  // k=1 the hem flaps 1px, k=2 the cover "breathes" (stage 2)
  const puff = k === 2 ? 1 : 0;
  // body block with rounded corners
  p.rect(3, 12 - puff, 44, 18 + puff, P.concrete);
  p.rect(2, 14 - puff, 46, 14 + puff, P.concrete);
  // cabin hump (roof + windscreen under the cloth)
  p.rect(12, 3 - puff, 26, 12, P.concreteLt);
  p.rect(10, 6 - puff, 30, 8, P.concreteLt);
  p.hline(13, 36, 3 - puff, P.white);
  p.rect(14, 5 - puff, 12, 3, P.white); // light catching the roof
  // bonnet slope: a band of light where the windscreen meets the bonnet
  p.hline(8, 42, 15, P.white);
  p.hline(8, 42, 16, P.concreteLt);
  // mirrors
  p.rect(8, 12, 3, 2, P.concreteLt);
  p.rect(39, 12, 3, 2, P.steel);
  // cloth wrinkles and folds
  for (let n = 0; n < 6; n++) {
    const x = 7 + n * 7 + (k === 1 && n % 2 ? 1 : 0);
    p.line(x, 18, x + 2, 27, P.steel);
    p.set(x - 1, 18, P.white);
  }
  p.line(16, 4, 14, 13, P.concrete);
  p.line(33, 4, 35, 13, P.steel);
  // tie strap across the bonnet
  p.hline(2, 47, 22, P.charcoal);
  p.hline(2, 47, 23, P.asphalt);
  // right side in shade
  for (let y = 4; y < 30; y++) for (let x = 38; x < 48; x++) if (p.alpha(x, y) && (x + y) % 2 === 0) p.set(x, y, P.steel);
  // hem (flaps) and the tyres peeking out
  for (let x = 3; x < 47; x++) p.set(x, 29 + ((x + k) % 6 === 0 && k === 1 ? 1 : 0), P.steel);
  p.rect(6, 29, 7, 3, P.ink);
  p.rect(37, 29, 7, 3, P.ink);
  p.hline(7, 11, 29, P.charcoal);
  p.hline(38, 42, 29, P.charcoal);
}, (p) => finish(p, { soft: true }));

registerProp('obj_covered_car', () =>
  standAnim(CAR, (env) => (env.stage === 2 ? (Math.floor(env.t / 1600) % 2 ? 2 : 0) : Math.floor(env.mt / 2200) % 5 === 0 ? 1 : 0), {
    cx: 24,
    base: 32,
    shadow: 22,
    contact: 44,
  }),
);

// ---------------------------------------------------------------- 車止め / 雑草 / 案内板 / 精算機 / 自転車置き場

registerProp('obj_car_stop', () => {
  const p = pc(18, 8);
  p.rect(1, 2, 16, 4, P.concrete);
  p.hline(1, 16, 2, P.white);
  p.hline(1, 16, 5, P.steel);
  p.set(5, 3, P.charcoal); // gum
  p.set(9, 4, P.charcoal);
  p.set(12, 3, P.ink);
  finish(p, { soft: true, rim: false });
  return stand(p.toCanvas(), { base: 10, shadow: 0, contact: 16 });
});

registerProp('obj_asphalt_weed', () => {
  const p = pc(12, 10);
  p.line(1, 8, 10, 7, P.charcoal);
  for (const [x, h] of [[3, 5], [5, 7], [7, 4], [8, 6]]) {
    p.vline(x, 8 - h, 8, P.leaf);
    p.set(x, 8 - h, P.leafYoung);
    p.set(x + 1, 8 - Math.floor(h / 2), P.leafDeep);
  }
  return flat(p.toCanvas(), 2, 4);
});

registerProp('obj_broken_guide', () => {
  const p = pc(26, 28);
  for (const x of [5, 20]) p.vline(x, 18, 27, P.steel);
  p.rect(1, 1, 24, 18, P.white);
  p.strokeRect(1, 1, 24, 18, P.steel);
  p.rect(3, 3, 20, 14, P.aqua);
  printLines(p, 4, 5, 18, 3, P.navy, 3);
  p.rect(5, 12, 6, 4, P.gold);
  // crack across the acrylic
  p.line(4, 17, 12, 6, P.ink);
  p.line(12, 6, 18, 9, P.ink);
  p.line(9, 10, 13, 16, P.ink);
  p.set(13, 5, P.glint);
  finish(p, { soft: true });
  return stand(p.toCanvas(), { shadow: 26 });
});

registerProp('obj_pay_machine', () => {
  const p = pc(14, 26);
  p.rect(1, 1, 12, 24, P.concreteLt);
  p.vline(1, 1, 24, P.white);
  p.vline(12, 2, 24, P.steel);
  p.rect(3, 4, 8, 6, P.ink);
  led(p, '17', 3, 5, P.glow);
  p.rect(3, 12, 8, 3, P.gold);
  p.rect(4, 17, 6, 2, P.charcoal);
  p.hline(1, 12, 24, P.asphalt);
  finish(p, { soft: true });
  const a = stand(p.toCanvas(), { shadow: 24 });
  a.glow = (g, x, y, env) => {
    g.rect(x + a.ox + 3, y + a.oy + 4, 8, 6, P.glow, 0.15 + (Math.floor(env.t / 1200) % 2) * 0.05 + env.grade.night * 0.3);
  };
  return a;
});

registerProp('obj_bike_rack', () => {
  const p = pc(66, 30);
  // roof on posts
  p.rect(0, 2, 66, 4, P.concreteLt);
  p.hline(0, 65, 2, P.white);
  p.hline(0, 65, 5, P.steel);
  for (const x of [2, 62]) p.vline(x, 6, 29, P.steel);
  // rack loops
  for (let x = 8; x < 60; x += 6) {
    p.vline(x, 20, 28, P.steel);
    p.vline(x + 3, 20, 28, P.steel);
    p.hline(x, x + 3, 20, P.concreteLt);
  }
  // the one bike left (a rusty one)
  const bx = 30;
  p.ring(bx, 23, 4, 4, P.charcoal);
  p.ring(bx + 14, 23, 4, 4, P.charcoal);
  p.line(bx, 23, bx + 5, 18, P.leafDeep);
  p.line(bx + 5, 18, bx + 12, 18, P.leafDeep);
  p.line(bx + 12, 18, bx + 14, 23, P.leafDeep);
  p.hline(bx + 3, bx + 6, 16, P.charcoal);
  p.set(bx + 7, 21, P.brassOld);
  finish(p, { soft: true });
  const a = stand(p.toCanvas(), { cx: 32, shadow: 26, contact: 56 });
  a.shadowFn = (ctx, x, y, dir, len) => {
    if (len <= 0.01) return;
    ctx.fillRect(Math.round(x + dir[0] * len * 24), Math.round(y + 2 + dir[1] * len * 24), 66, 6);
  };
  return a;
});

function cart(p: PixelCanvas, x: number, y: number): void {
  // silver wire basket, red handle, 2-frame wheels drawn by the caller
  p.rect(x + 1, y + 2, 12, 8, P.steel);
  for (let i = x + 1; i < x + 13; i += 2) p.vline(i, y + 2, y + 9, P.concreteLt);
  for (let j = y + 3; j < y + 10; j += 2) p.hline(x + 1, x + 12, j, P.concrete);
  p.hline(x, x + 13, y + 1, P.red);
  p.hline(x, x + 13, y, P.vermLt);
  p.vline(x + 12, y + 10, y + 12, P.steel);
  p.vline(x + 2, y + 10, y + 12, P.steel);
}

registerProp('obj_cart_corral', () => {
  const p = pc(50, 20);
  p.hline(1, 48, 6, P.concreteLt);
  p.hline(1, 48, 7, P.steel);
  p.hline(1, 48, 16, P.steel);
  for (const x of [1, 48]) p.vline(x, 5, 18, P.steel);
  cart(p, 6, 4);
  cart(p, 10, 5);
  cart(p, 30, 5);
  for (const x of [8, 18, 12, 22, 32, 42]) p.rect(x, 17, 2, 2, P.charcoal);
  // sign
  p.rect(38, 0, 10, 6, P.blue);
  p.set(40, 2, P.white);
  p.set(42, 2, P.white);
  finish(p, { soft: true });
  return stand(p.toCanvas(), { cx: 24, shadow: 14, contact: 44 });
});

/** A stray cart sprite (2 frames) for the fushigi_09 carts (world/places.ts). */
export const CART_FRAMES = [0, 1].map((k) => {
  const p = pc(16, 16);
  cart(p, 1, 2);
  p.rect(2 + k, 14, 2, 2, P.charcoal);
  p.rect(11 - k, 14, 2, 2, P.charcoal);
  finish(p, { soft: true });
  return p;
});

registerProp('prop_cart', () => {
  const img = CART_FRAMES[0].toCanvas();
  return stand(img, { shadow: 12 });
});

registerProp('obj_balloon_husk', () => {
  const p = pc(12, 12);
  p.ellipse(6, 6, 4, 3.5, P.gold);
  p.set(4, 4, P.goldPale);
  p.set(5, 6, P.ink); // the bell face
  p.set(7, 6, P.ink);
  p.hline(5, 7, 8, P.brassOld);
  p.vline(6, 10, 11, P.white);
  outline(p, { soft: true });
  const img = p.toCanvas();
  return {
    ox: 2,
    oy: 0,
    w: 12,
    h: 12,
    foot: 17,
    img: (env: PropEnv) => (env.stage === 2 ? null : img),
    over(g: Gfx, x: number, y: number, env: PropEnv) {
      if (env.stage === 2) g.img(img, x + 2, y + floatOffset(env, 2));
    },
  } as PropArt;
});

registerProp('obj_ojigi_restored', () => {
  const spr = charSprite('restored_enemy_ojigi_jihanki');
  return {
    ox: 8 - Math.floor(spr.w / 2),
    oy: 16 - spr.h,
    w: spr.w,
    h: spr.h,
    foot: 15,
    img: (env: PropEnv) => idleFrame(spr, 'down', env.t),
    shadow: spr.h,
    contact: 14,
  } as PropArt;
});

// ---------------------------------------------------------------- 踏切 prop_crossing_gate (x58–62, y21–25)

function crossbuck(p: PixelCanvas, x: number, y: number): void {
  // signal post: × board, two red lamps, bell, black & yellow base
  p.vline(x + 6, y + 10, y + 44, P.concrete);
  p.vline(x + 7, y + 10, y + 44, P.steel);
  for (let j = y + 36; j < y + 45; j++) {
    p.set(x + 6, j, Math.floor(j / 2) % 2 ? P.gold : P.ink);
    p.set(x + 7, j, Math.floor(j / 2) % 2 ? P.brass : P.night);
  }
  // × board
  for (let k = 0; k < 11; k++) {
    for (const [a, b] of [[k, k], [k, 10 - k]]) {
      p.set(x + 1 + a, y + b, P.gold);
      p.set(x + 2 + a, y + b, P.gold);
      if ((a + b) % 4 < 2) p.set(x + 1 + a, y + b, P.ink);
    }
  }
  // lamps on a bar
  p.hline(x - 2, x + 15, y + 14, P.ink);
  for (const lx of [x - 2, x + 11]) {
    p.rect(lx, y + 12, 5, 5, P.ink);
    p.rect(lx + 1, y + 13, 3, 3, P.maroon);
  }
  // bell
  p.ellipse(x + 6.5, y + 20, 3, 2.5, P.charcoal);
  p.set(x + 5, y + 19, P.steel);
}

function gateArm(p: PixelCanvas, x0: number, y0: number, len: number, vertical: boolean, dir: 1 | -1): void {
  for (let k = 0; k < len; k++) {
    const c = Math.floor(k / 5) % 2 ? P.ink : P.gold;
    const c2 = Math.floor(k / 5) % 2 ? P.night : P.brass;
    if (vertical) {
      p.set(x0, y0 + k * dir, c);
      p.set(x0 + 1, y0 + k * dir, c2);
    } else {
      p.set(x0 + k * dir, y0, c);
      p.set(x0 + k * dir, y0 + 1, c2);
    }
  }
}

registerProp('prop_crossing_gate', () => {
  // image covers x 57..63 (tiles), y 18..26
  const W = 7 * 16;
  const H = 9 * 16;
  const X0 = 57 * 16;
  const Y0 = 18 * 16;
  const make = (up: number) => {
    const p = pc(W, H);
    // west gate: post at (58,21) south side; arm spans down across the road (y22–24)
    const wx = 58 * 16 + 2 - X0;
    const wy = 21 * 16 - 30 - Y0;
    crossbuck(p, wx, wy);
    // gate machine box
    p.rect(wx + 9, 21 * 16 + 4 - Y0, 6, 10, P.gold);
    p.strokeRect(wx + 9, 21 * 16 + 4 - Y0, 6, 10, P.brassOld);
    const pivotX = wx + 12;
    const pivotY = 21 * 16 + 6 - Y0;
    if (up <= 0) gateArm(p, pivotX, pivotY, 58, true, 1);
    else {
      // raised: arm points up along the post (fore-shortened)
      const l = Math.round(58 * (1 - up) + 22 * up);
      gateArm(p, pivotX, pivotY, l, true, up >= 1 ? -1 : 1);
    }
    // east gate: post at (62,25), arm up across the road
    const ex = 62 * 16 + 2 - X0;
    const ey = 25 * 16 - 30 - Y0;
    crossbuck(p, ex, ey);
    p.rect(ex - 2, 25 * 16 + 4 - Y0, 6, 10, P.gold);
    p.strokeRect(ex - 2, 25 * 16 + 4 - Y0, 6, 10, P.brassOld);
    const px2 = ex + 1;
    const py2 = 25 * 16 + 6 - Y0;
    if (up <= 0) gateArm(p, px2, py2, 58, true, -1);
    else {
      const l = Math.round(58 * (1 - up) + 22 * up);
      gateArm(p, px2, py2, l, true, -1);
    }
    finish(p, { soft: true });
    return p.toCanvas();
  };
  const down = make(0);
  const half = make(0.5);
  const upImg = make(1);
  let openedAt = -1;
  const lampPos: [number, number][] = [
    [58 * 16 + 2 - X0 - 1, 21 * 16 - 30 - Y0 + 13],
    [58 * 16 + 2 - X0 + 12, 21 * 16 - 30 - Y0 + 13],
    [62 * 16 + 2 - X0 - 1, 25 * 16 - 30 - Y0 + 13],
    [62 * 16 + 2 - X0 + 12, 25 * 16 - 30 - Y0 + 13],
  ];
  const ox = X0 - 58 * 16;
  const oy = Y0 - 21 * 16;
  return {
    ox,
    oy,
    w: W,
    h: H,
    foot: 25 * 16 + 15 - 21 * 16,
    img: (env: PropEnv) => {
      // night: the barrier rises over 1.2 s once flag_crossing_open is set
      if (env.flag('flag_crossing_open') > 0) {
        if (openedAt < 0) openedAt = env.t;
        const t = (env.t - openedAt) / 1200;
        return t >= 1 ? upImg : t >= 0.4 ? half : down;
      }
      openedAt = -1;
      return down;
    },
    shadow: 40,
    glow(g: Gfx, x: number, y: number, env: PropEnv) {
      // stage 0: silent alternate blinking; 1: both half-lit, frozen; 2: off; night: off (open)
      if (env.stage === 2 || env.flag('flag_crossing_open') > 0) return;
      const ph = Math.floor(env.t / 450) % 2;
      for (let i = 0; i < lampPos.length; i++) {
        const [lx, ly] = lampPos[i];
        const on = env.stage === 1 ? 0.5 : (i % 2) === ph ? 1 : 0;
        if (on <= 0) continue;
        const cx = x + ox + lx + 2;
        const cy = y + oy + ly + 2;
        g.rect(cx - 1, cy - 1, 3, 3, P.vermLt, on);
        const ctx = g.ctx;
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        const grd = ctx.createRadialGradient(cx, cy, 1, cx, cy, 9);
        grd.addColorStop(0, `rgba(255,106,77,${0.6 * on})`);
        grd.addColorStop(1, 'rgba(226,59,46,0)');
        ctx.fillStyle = grd;
        ctx.fillRect(cx - 9, cy - 9, 18, 18);
        ctx.restore();
      }
    },
  } as PropArt;
});

registerProp('obj_tomare_sign', () => {
  const p = pc(16, 30);
  p.vline(7, 10, 29, P.steel);
  p.vline(8, 10, 29, P.asphalt);
  p.poly([[1, 1], [14, 1], [7.5, 13]], P.white);
  p.line(1, 1, 7, 12, P.verm);
  p.line(14, 1, 8, 12, P.verm);
  p.hline(1, 14, 1, P.verm);
  p.hline(4, 11, 3, P.ink);
  p.hline(5, 10, 5, P.ink);
  p.set(7, 7, P.ink);
  finish(p, { soft: true });
  return stand(p.toCanvas(), { shadow: 28 });
});

const FOXTAIL = mkFrames(4, 14, 16, (p, k) => {
  const lean = k === 3 ? 2 : [-1, 0, 1][k];
  for (const [bx, h] of [[3, 12], [6, 14], [9, 11], [11, 9]]) {
    for (let y = 0; y < h; y++) {
      const t = y / h;
      p.set(bx + Math.round(lean * t * t * 2), 15 - y, y < h - 3 ? P.leaf : P.goldPale);
    }
    const tx = bx + lean * 2;
    p.set(tx, 15 - h, P.goldPale);
    p.set(tx + 1, 16 - h, P.brass);
  }
});

registerProp('obj_foxtail', () => {
  const a = standAnim(FOXTAIL, (env) => (env.stage === 1 ? 1 : env.stage === 2 ? 3 : [0, 1, 2, 1][Math.floor(env.mt / 450) % 4]), {
    shadow: 12,
  });
  return a;
});

// ---------------------------------------------------------------- 鉄橋 prop_rail_bridge (59–61, 36–37)

registerProp('prop_rail_bridge', () => {
  const W = 3 * 16;
  const H = 2 * 16 + 12;
  const p = pc(W, H);
  // deck: sleepers over open girders, canal visible between
  for (let y = 10; y < H; y++)
    for (let x = 0; x < W; x++) {
      const ly = (y - 10) % 6;
      if (x < 5 || x >= W - 5) p.set(x, y, (y & 1) ? P.maroon : P.sunShade);
      else if (ly < 3) p.set(x, y, ly === 0 ? P.woodLt : P.wood);
    }
  // rails
  for (const rx of [16 + 4, 16 + 11]) {
    p.vline(rx, 10, H - 1, P.concreteLt);
    p.vline(rx + 1, 10, H - 1, P.steel);
  }
  // side girders with rivets (maroon, #8A2E3A)
  for (const gx of [0, W - 5]) {
    p.rect(gx, 0, 5, H, P.maroon);
    p.vline(gx, 0, H - 1, P.sunShade);
    p.vline(gx + 4, 0, H - 1, P.nightShade);
    for (let y = 2; y < H; y += 4) p.set(gx + 2, y, P.peach);
    for (let y = 0; y < H; y += 8) p.line(gx, y, gx + 4, y + 4, P.nightShade);
  }
  finish(p, { soft: true });
  return {
    ox: 0,
    oy: -12,
    w: W,
    h: H,
    foot: 32,
    img: () => p.toCanvas(),
    shadowFn(ctx, x, y, dir, len) {
      if (len <= 0.01) return;
      ctx.fillRect(Math.round(x + W), Math.round(y + 2), Math.round(10 * len * dir[0]), 28);
    },
  } as PropArt;
});

// ---------------------------------------------------------------- 鳥居と祠 / かかし / 水門 / 橋

registerProp('prop_torii', () => {
  // tall enough that the little shrine behind shows through the opening
  const H = 40;
  const p = pc(50, H);
  for (const x of [6, 38]) {
    p.rect(x, 10, 5, H - 11, P.verm);
    p.vline(x, 10, H - 2, P.vermLt);
    p.vline(x + 4, 10, H - 2, P.vermShade);
    p.rect(x - 1, H - 4, 7, 3, P.ink);
  }
  // kasagi (black top beam, curved ends), shimaki, nuki
  p.rect(0, 2, 50, 4, P.ink);
  p.hline(1, 48, 2, P.charcoal);
  p.set(0, 1, P.ink);
  p.set(49, 1, P.ink);
  p.rect(2, 6, 46, 3, P.verm);
  p.hline(2, 47, 6, P.vermLt);
  p.rect(4, 15, 42, 3, P.verm);
  p.hline(4, 45, 15, P.vermLt);
  p.hline(4, 45, 17, P.vermShade);
  p.rect(22, 6, 6, 9, P.paper);
  p.vline(25, 8, 12, P.ink);
  finish(p, { soft: true });
  return stand(p.toCanvas(), { cx: 24, shadow: 46, contact: 0 });
});

const HOKORA = mkFrames(3, 30, 30, (p, k) => {
  // stone base
  p.rect(3, 22, 24, 7, P.concrete);
  p.hline(3, 26, 22, P.concreteLt);
  p.hline(3, 26, 28, P.steel);
  // small wooden shrine
  p.rect(8, 8, 14, 14, P.wood);
  p.rect(10, 11, 10, 9, P.woodDark);
  p.vline(8, 8, 21, P.woodLt);
  p.poly([[4, 10], [15, 2], [26, 10]], P.charcoal);
  p.line(4, 10, 15, 2, P.asphalt);
  p.hline(4, 26, 10, P.ink);
  // white foxes
  for (const [x, flip] of [[4, false], [22, true]] as [number, boolean][]) {
    p.rect(x, 16, 4, 6, P.white);
    p.set(flip ? x + 3 : x, 15, P.white);
    p.set(flip ? x : x + 3, 15, P.white);
    p.set(x + 1, 17, P.verm);
    p.set(x + (flip ? 0 : 3), 20, P.concreteLt);
    p.set(flip ? x - 1 : x + 4, 20, P.white); // tail
  }
  // candles
  for (const x of [12, 17]) {
    p.rect(x, 17, 1, 3, P.white);
    p.set(x + (k === 2 ? 1 : 0), 16 - (k === 1 ? 1 : 0), P.gold);
  }
}, (p) => finish(p, { soft: true }));

registerProp('obj_hokora', () => {
  const a = standAnim(HOKORA, (env) => (env.stage === 1 ? 0 : env.stage === 2 ? 2 : Math.floor(env.mt / 300) % 2), { shadow: 26, base: 6, foot: 17 });
  a.glow = (g, x, y, env) => {
    if (env.grade.night < 0.05) return;
    const ctx = g.ctx;
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const gx = x + a.ox + 15;
    const gy = y + a.oy + 17;
    const grd = ctx.createRadialGradient(gx, gy, 1, gx, gy, 16);
    grd.addColorStop(0, `rgba(255,210,63,${0.45 * env.grade.night})`);
    grd.addColorStop(1, 'rgba(255,210,63,0)');
    ctx.fillStyle = grd;
    ctx.fillRect(gx - 16, gy - 16, 32, 32);
    ctx.restore();
  };
  return a;
});

const SCARECROW = mkFrames(3, 22, 32, (p, k) => {
  const ne = k === 2;
  p.vline(11, 10, 31, P.wood);
  p.hline(3, 19, 13, P.woodLt);
  // T-shirt with flapping sleeves
  p.rect(7, 12, 9, 10, P.aqua);
  p.vline(7, 12, 21, P.white);
  const s = k === 1 ? 1 : 0;
  p.rect(3, 12 + s, 4, 3, P.aqua);
  p.rect(16, 12 - s, 4, 3, P.aqua);
  // head (sack) with a straw hat; stage 2 looks north-east
  p.ellipse(11.5, 8, 4, 4, P.paper);
  if (!ne) {
    p.set(10, 8, P.ink);
    p.set(13, 8, P.ink);
    p.hline(10, 13, 10, P.verm);
  } else {
    p.set(13, 7, P.ink);
    p.set(14, 7, P.ink);
  }
  p.ellipse(11.5, 5, 8, 2.5, P.goldPale);
  p.ellipse(11.5, 3.5, 4, 2, P.gold);
  p.hline(8, 15, 5, P.red);
}, (p) => finish(p, { soft: true }));

registerProp('obj_scarecrow', () =>
  standAnim(SCARECROW, (env) => (env.stage === 1 ? 0 : env.stage === 2 ? 2 : Math.floor(env.mt / 600) % 2), { shadow: 30 }),
);

registerProp('prop_water_gate', () => {
  const p = pc(18, 26);
  p.rect(2, 10, 14, 14, P.steel);
  p.strokeRect(2, 10, 14, 14, P.asphalt);
  for (let y = 12; y < 23; y += 3) p.hline(3, 14, y, P.brassOld);
  p.vline(9, 2, 10, P.asphalt);
  p.ellipse(9, 3, 5, 2, P.brassOld);
  p.ring(9, 3, 5, 2, P.wood);
  p.set(5, 3, P.brass);
  finish(p, { soft: true });
  return stand(p.toCanvas(), { shadow: 22 });
});

registerProp('obj_bridge', () => {
  // ゆうなりばし: concrete parapets both sides (x10–11, y35–38), name posts at the north end
  const W = 40;
  const H = 4 * 16 + 14;
  const p = pc(W, H);
  const top = 14;
  for (const x of [1, W - 6]) {
    p.rect(x, top, 5, H - top, P.concrete);
    p.vline(x, top, H - 1, P.white);
    p.vline(x + 4, top, H - 1, P.steel);
    for (let y = top + 6; y < H; y += 16) p.hline(x, x + 4, y, P.steel);
  }
  // 親柱 with the name plates
  for (const x of [0, W - 7]) {
    p.rect(x, 2, 7, 16, P.concreteLt);
    p.hline(x, x + 6, 2, P.white);
    p.vline(x + 6, 3, 17, P.steel);
    p.rect(x + 1, 0, 5, 3, P.concrete);
    p.rect(x + 2, 6, 3, 9, P.brass);
    p.vline(x + 3, 7, 14, P.brassOld);
  }
  finish(p, { soft: true });
  const img = p.toCanvas();
  return {
    ox: -4,
    oy: -top,
    w: W,
    h: H,
    foot: 16,
    img: () => img,
    shadowFn(ctx, x, y, dir, len) {
      if (len <= 0.01) return;
      ctx.fillRect(Math.round(x - 4 + W - 1), Math.round(y + 2), Math.round(6 * len), 4 * 16 - 2);
    },
  } as PropArt;
});

export { chainArt };
