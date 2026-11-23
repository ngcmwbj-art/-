// A year of closure in ショッピングプラザ・ユウナリ (review round 1: M1–M4 had
// few big shapes of decay, the areas were hard to tell apart). Landmarks that
// each belong to one area:
//
//   mall_leak        M2  the roof leaks through a gap in the ceiling: a panel
//                        lies soaked on the floor by the puddle; a drop falls
//                        every 1.6 s (rings, se_drip from lv_logic) and a thin
//                        column of evening comes straight down through the hole
//   mall_dead_plant  M1/M4  a big potted rubber plant / palm left to dry out
//   mall_fallen_sign M1  the 『本日特売』 A-board, blown flat on its face-up side
//   mall_roped_stage M3  a demo dais roped off with chrome stanchions, the
//                        machine that stood on it long gone

import type { Gfx } from '../../engine/gfx';
import { ihash } from '../tiles/noise';
import { P } from '../tiles/palette';
import { pc, prop } from './ifurn';
import { dust, lightPool, screenPool } from './ishell';
import { castRight, dk, finish } from './kit';
import { flat } from './pkit';
import { registerProp } from './registry';
import { fontTextSmall, tiny } from './text';
import type { PropArt, PropEnv } from './types';

/** The drip's period (ms); lv_logic plays se_drip on the same beat. */
export const DRIP_MS = 1600;

function rgbHex(c: [number, number, number]): string {
  const h = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${h(c[0])}${h(c[1])}${h(c[2])}`;
}

// ---------------------------------------------------------------- M2: the leak

/**
 * Anchored at the puddle's tile (M2 x15,y8). Canvas 48×30 from 8px left of
 * the tile: the puddle (x 10–40, y 12–26) and the fallen ceiling panel.
 */
const LEAK = { ox: -8, oy: -6, cx: 25, cy: 19 };
registerProp('mall_leak', () => {
  const p = pc(48, 30);
  // ---- the puddle: an irregular sheet of water. Only its dried tide-line is
  // baked; the water itself darkens the tiles under it at run time (a
  // multiply through a mask), so the grout shows through as on wet floors
  const inside = (x: number, y: number) => {
    const dx = (x - LEAK.cx) / 15;
    const dy = (y - LEAK.cy) / 6.5;
    const wob = Math.sin(x * 0.7) * 0.08 + Math.cos(y * 1.3 + x * 0.2) * 0.06;
    return dx * dx + dy * dy < 1 + wob;
  };
  const mask = pc(48, 30);
  const deep = pc(48, 30);
  for (let y = 0; y < 30; y++)
    for (let x = 0; x < 48; x++) {
      if (!inside(x, y)) {
        // the dried tide-line: a stained ring just outside the water
        if (inside(x - 1, y) || inside(x + 1, y) || inside(x, y - 1) || inside(x, y + 1)) p.set(x, y, ihash(x, y, 91) % 3 ? P.brassOld : P.woodLt);
        continue;
      }
      mask.set(x, y, P.steel);
      const dx = (x - LEAK.cx) / 15;
      const dy = (y - LEAK.cy) / 6.5;
      if (dx * dx + dy * dy < 0.45) deep.set(x, y, P.shade);
      // the near edge catches the lamps: a lilac lip
      if (!inside(x, y - 1)) p.set(x, y, P.lilac);
    }
  // glints on the surface (the lamps)
  p.hline(15, 18, 15, P.steel);
  p.set(33, 22, P.steel);
  p.hline(30, 31, 16, P.aqua);
  // ---- the fallen panel: a 600-mm fibreboard tile lying skewed, a corner
  // snapped off, its pin-hole pattern, one edge soaked dark in the water
  const px0 = 1;
  const py0 = 3;
  for (let j = 0; j < 11; j++)
    for (let i = 0; i < 15; i++) {
      const x = px0 + i + Math.floor(j / 3);
      const y = py0 + j;
      if (i + j < 2) continue; // the broken corner
      if (i > 12 && j > 8) continue;
      const edge = j === 0 || i === 0 || j === 10 || i === 14;
      let c: string = edge ? P.concrete : P.white;
      if (!edge && (i % 3 === 1) && (j % 2 === 1)) c = P.concreteLt;
      // soaked where it lies in the water
      if (inside(x, y) || inside(x - 1, y) || inside(x, y + 1)) c = edge ? P.steel : P.concrete;
      p.set(x, y, c);
    }
  // the panel's shadow and its grid rail snapped off with it
  for (let i = 2; i < 16; i++) p.set(px0 + i + 3, py0 + 11, P.shade);
  p.hline(px0 + 5, px0 + 13, py0 - 1, P.steel);
  p.set(px0 + 14, py0 - 1, P.asphalt);
  // crumbs of board and a bent hanger wire
  for (const [cx, cy] of [[20, 6], [23, 9], [42, 12], [8, 18], [44, 25]] as const) {
    p.rect(cx, cy, 2, 1, P.white);
    p.set(cx, cy + 1, P.concrete);
  }
  p.line(38, 4, 44, 7, P.steel);
  p.set(45, 8, P.asphalt);
  const img = p.toCanvas();
  const maskImg = mask.toCanvas();
  const deepImg = deep.toCanvas();
  const a = flat(img, LEAK.ox, LEAK.oy);
  a.w = 48;
  a.h = 30;
  // the whole column of light must stay in the prop's bounds (it is culled by them)
  const RISE = 120;
  a.oy = LEAK.oy - RISE;
  a.h = 30 + RISE;
  const bx = LEAK.ox + LEAK.cx;
  const by = LEAK.oy + LEAK.cy;
  const imgOy = LEAK.oy;
  a.img = () => null;
  a.glowFg = true;
  a.over = (g: Gfx, x: number, y: number, env: PropEnv) => {
    const ctx = g.ctx;
    const ix = Math.round(x + LEAK.ox);
    const iy = Math.round(y + imgOy);
    // the water: the tiles under it go dark and cool, deeper in the middle
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.globalAlpha = 0.75;
    ctx.drawImage(maskImg, ix, iy);
    ctx.globalAlpha = 0.45;
    ctx.drawImage(deepImg, ix, iy);
    ctx.restore();
    g.img(img, ix, iy);
    const X = x + bx;
    const Y = y + by;
    // the hole's evening in the water: a pale patch, dithered, wobbling a little
    const sky = rgbHex(env.grade.skyBot);
    const wob = env.stage === 1 ? 0 : Math.round(Math.sin(env.t / 700));
    const sa = 0.5 * (1 - env.grade.night * 0.8);
    for (let j = 0; j < 3; j++) for (let i = 0; i < 7; i++) if ((i + j) % 2 === 0 || j === 1) g.rect(X - 3 + wob + i, Y - 3 + j, 1, 1, sky, sa);
    g.rect(X - 2 + wob, Y - 2, 5, 1, P.horizon, 0.4 * (1 - env.grade.night));
    // the drop: a 1×3 streak falling from the ceiling's dark, then rings
    const u = env.t % DRIP_MS;
    if (u < 260) {
      const k = u / 260;
      const dy = Math.round((k * k) * 70);
      g.rect(X, Y - 72 + dy, 1, 3, P.aqua, 0.9);
      g.rect(X, Y - 72 + dy, 1, 1, P.glint, 0.9);
    } else {
      const r = (u - 260) / 700;
      if (r < 1) {
        const rx = 2 + Math.round(r * 9);
        const ry = 1 + Math.round(r * 3);
        const al = 0.7 * (1 - r);
        ringDither(g, X, Y, rx, ry, P.aqua, al);
        if (r > 0.3) ringDither(g, X, Y, Math.max(1, rx - 4), Math.max(1, ry - 1), P.glint, al * 0.7);
        if (r < 0.15) g.rect(X - 1, Y - 2, 1, 1, P.glint, 0.8);
        if (r < 0.15) g.rect(X + 1, Y - 3, 1, 1, P.glint, 0.8);
      }
    }
  };
  a.glow = (g: Gfx, x: number, y: number, env: PropEnv) => {
    const n = env.grade.night;
    const al = 0.16 * (1 - n);
    if (al <= 0.005) return;
    // a thin column of evening straight down through the missing panel (the
    // skylights' shafts slant; this one does not), with dust turning in it
    const X = x + bx;
    const Y = y + by;
    const top = Y - RISE;
    const ctx = g.ctx;
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    for (let j = 0; j < RISE; j++) {
      const w = 9 + Math.round((j / RISE) * 5);
      ctx.globalAlpha = al * (0.55 + (j / RISE) * 0.45);
      ctx.fillStyle = P.sky;
      ctx.fillRect(Math.round(X - w / 2), top + j, w, 1);
      ctx.globalAlpha = al * 0.9;
      ctx.fillStyle = P.horizon;
      ctx.fillRect(Math.round(X - w / 2) - 1, top + j, 1, 1);
      ctx.fillRect(Math.round(X + w / 2), top + j, 1, 1);
    }
    ctx.restore();
    dust(g, X - 6, top, 12, RISE, 0, 6, env.stage === 1 ? 0 : env.t, 8801, 0.8);
    screenPool(g, X, Y, 14, 6, P.sky, al * 1.4);
  };
  a.light = (g: Gfx, x: number, y: number, env: PropEnv) => {
    lightPool(g, x + bx, y + by, 22, 12, P.sky, 0.22 * (1 - env.grade.night));
  };
  return a as PropArt;
});

/** A dithered 1px ellipse outline (ripples). */
function ringDither(g: Gfx, cx: number, cy: number, rx: number, ry: number, col: string, a: number): void {
  const n = Math.max(8, Math.round((rx + ry) * 3));
  for (let i = 0; i < n; i++) {
    if (i % 2) continue;
    const t = (i / n) * Math.PI * 2;
    g.rect(Math.round(cx + Math.cos(t) * rx), Math.round(cy + Math.sin(t) * ry), 1, 1, col, a);
  }
}

// ---------------------------------------------------------------- M1 / M4: dead potted plants

/**
 * v 0: a rubber plant (ゴムの木) in a white ceramic pot, its big leaves gone
 * brown and hanging, three on the floor; v 1: a kentia palm in a terracotta
 * pot, fronds broken and bleached, a care tag 『水やり 月・木』 on a stick.
 */
registerProp('mall_dead_plant', (o) => {
  const v = Number(o.v ?? 0);
  return prop(24, 40, (p) => {
    // the pot
    const potC = v ? P.skin4 : P.white;
    const potL = v ? P.skin3 : P.glint;
    const potD = v ? P.wood : P.concrete;
    for (let y = 28; y < 38; y++) {
      const inset = Math.floor((y - 28) / 4);
      p.hline(6 + inset, 17 - inset, y, potC);
      p.set(6 + inset, y, potL);
      p.set(17 - inset, y, potD);
    }
    p.hline(5, 18, 27, potL);
    p.hline(5, 18, 28, potD);
    p.hline(8, 15, 38, P.ink);
    // dry soil, cracked, a cigarette end someone left
    p.hline(7, 16, 27, P.woodDark);
    p.set(10, 27, P.wood);
    p.set(14, 27, P.white);
    if (v === 0) {
      // rubber plant: a leaning trunk; the big leaves hang straight down from
      // it, brown and curled, a pale midrib each; one small green leaf left
      p.line(12, 27, 10, 6, P.woodDark);
      p.line(13, 27, 11, 6, P.wood);
      const leaves: [number, number, number, number][] = [
        // stem x, y on the trunk, hang dx (sideways), length
        [11, 8, -5, 9], [11, 10, 5, 8], [11, 14, -6, 8], [12, 17, 6, 7], [12, 21, -5, 6], [11, 7, 3, 6],
      ];
      leaves.forEach(([sx, sy, hx, len], i) => {
        const c = i % 3 === 0 ? P.brassOld : i % 3 === 1 ? P.wood : P.woodLt;
        // the petiole out to the side, then the blade hanging down
        const ex = sx + hx;
        p.line(sx, sy, ex, sy + 1, P.woodDark);
        for (let k = 0; k < len; k++) {
          const wdt = k < 1 || k > len - 2 ? 1 : 2;
          const x = ex + (hx < 0 ? -Math.floor(k / 4) : Math.floor(k / 4));
          p.hline(x - (hx < 0 ? wdt - 1 : 0), x + (hx < 0 ? 0 : wdt - 1), sy + 1 + k, c);
          if (k > 0 && k < len - 1) p.set(x + (hx < 0 ? -2 : 2), sy + 1 + k, dk(c));
        }
        // the midrib and the tip curling in
        p.vline(ex, sy + 2, sy + len - 1, i % 2 ? P.goldPale : P.woodLt);
        p.set(ex + (hx < 0 ? 1 : -1), sy + len, dk(c));
      });
      p.ellipse(10.5, 4, 1.5, 2, P.leafShade);
      p.set(10, 3, P.leafDeep);
    } else {
      // palm: bleached fronds, two snapped and hanging over the pot's rim
      for (const [ex, ey, c] of [[2, 6, P.goldPale], [21, 5, P.woodLt], [5, 1, P.brassOld], [18, 12, P.goldPale], [3, 20, P.woodLt], [21, 24, P.brassOld]] as const) {
        p.line(12, 26, ex, ey, c);
        for (let k = 1; k < 6; k++) {
          const t = k / 6;
          const fx = Math.round(12 + (ex - 12) * t);
          const fy = Math.round(26 + (ey - 26) * t);
          p.set(fx + 1, fy + 1, dk(c));
          if (k % 2) p.set(fx - 1, fy + 1, c);
        }
      }
      // the care tag on its stick
      p.vline(16, 22, 27, P.woodLt);
      p.rect(15, 19, 5, 4, P.white);
      p.hline(16, 18, 20, P.leafDeep);
      p.hline(16, 17, 21, P.steel);
    }
    castRight(p, 5, 27, 14, 12, 2);
  }, { cx: 8, base: 16, contact: 14, shadow: 0 });
});

/** The leaves the rubber plant has dropped round its pot (flat). */
registerProp('mall_dead_leaves', () => {
  const p = pc(40, 14);
  for (const [x, y, c, r] of [[3, 3, P.brassOld, 0], [30, 5, P.wood, 1], [14, 9, P.woodLt, 0], [34, 10, P.brassOld, 1]] as const) {
    p.ellipse(x + 2.5, y + 1.5, 3, 1.5, c);
    p.hline(x, x + 5, y + 1 + r, dk(c));
    p.set(x + 6, y + 2 - r, dk(c));
  }
  return flat(p.toCanvas(), -30, 13);
});

// ---------------------------------------------------------------- M1: the fallen A-board

/**
 * The shop's standing board 『本日特売』 blown over onto its back: the painted
 * face up at a skew, a dusty shoe print across it, one hinge leg splayed.
 */
registerProp('mall_fallen_sign', () => {
  const p = pc(34, 22);
  // the lower leaf of the A-frame lying under it (its back, plain board)
  for (let j = 0; j < 7; j++) p.hline(3 + j, 29 + j, 13 + j, j === 0 ? P.woodLt : j === 6 ? P.woodDark : P.wood);
  // the face: a white board in a red frame, skewed 1px per 3 rows
  for (let j = 0; j < 14; j++) {
    const off = Math.floor(j / 3);
    for (let i = 0; i < 26; i++) {
      const x = 2 + i + off;
      const y = 1 + j;
      const edge = j === 0 || j === 13 || i === 0 || i === 25;
      p.set(x, y, edge ? (j === 0 ? P.vermLt : P.vermShade) : P.white);
    }
  }
  // 『本日特売』 in red, a price in black, a yellow burst — seen upside down-ish
  fontTextSmall(p, '特売', 6, 4, P.red, 1);
  p.rect(21, 4, 5, 5, P.gold);
  p.set(23, 3, P.gold);
  p.set(20, 6, P.gold);
  tiny(p, '98', 21, 5, P.verm, undefined, 0);
  p.hline(7, 18, 12, P.ink);
  // a grey shoe print walked across it
  for (const [sx, sy] of [[12, 7], [13, 8], [14, 8], [12, 9], [15, 9], [13, 10], [14, 10]] as const) p.set(sx, sy, P.steel);
  // the splayed hinge leg
  p.line(29, 14, 33, 11, P.steel);
  p.set(33, 10, P.asphalt);
  p.hline(4, 33, 21, P.shade);
  castRight(p, 2, 1, 30, 14, 1);
  return flat(p.toCanvas(), -9, -3);
});

// ---------------------------------------------------------------- M3: the roped-off demo stage

/**
 * A low display dais (3×2 tiles) roped off with four chrome stanchions and a
 * red rope sagging between them. On it only the pale rectangle and four foot
 * dents of the machine that stood there, and the card 『展示品・お試し中止』.
 */
registerProp('mall_roped_stage', () => {
  const W = 52;
  const H = 42;
  const p = pc(W, H);
  const dy = 10;
  // the dais: grey carpeted box, a lit top edge, dark front
  p.rect(2, dy + 2, 44, 24, P.concrete);
  p.hline(2, 45, dy + 2, P.white);
  p.vline(2, dy + 2, dy + 25, P.concreteLt);
  p.rect(2, dy + 26, 44, 4, P.steel);
  p.hline(2, 45, dy + 29, P.asphalt);
  // where the machine stood: an unfaded rectangle and four dents
  p.rect(12, dy + 7, 22, 14, P.concreteLt);
  p.strokeRect(12, dy + 7, 22, 14, P.steel);
  for (const [fx, fy] of [[14, dy + 9], [31, dy + 9], [14, dy + 18], [31, dy + 18]] as const) p.rect(fx, fy, 2, 2, P.asphalt);
  // the card on a little acrylic stand
  p.rect(36, dy + 4, 9, 7, P.white);
  p.hline(36, 44, dy + 4, P.red);
  p.hline(37, 43, dy + 7, P.steel);
  p.hline(37, 41, dy + 9, P.steel);
  p.hline(36, 44, dy + 11, P.aqua);
  // stanchions at the corners (behind first), rope between
  const posts: [number, number][] = [[1, 4], [46, 4], [1, 36], [46, 36]];
  const rope = (x0: number, y0: number, x1: number, y1: number) => {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const sag = Math.round(Math.sin(t * Math.PI) * (y0 === y1 ? 3 : 1));
      const x = Math.round(x0 + (x1 - x0) * t);
      const y = Math.round(y0 + (y1 - y0) * t) + sag;
      p.set(x, y, P.verm);
      p.set(x, y + 1, P.maroon);
    }
  };
  const post = (x: number, y: number) => {
    p.ellipse(x + 2, y + 5, 3, 1.5, P.steel);
    p.vline(x + 1, y - 7, y + 4, P.concreteLt);
    p.vline(x + 2, y - 7, y + 4, P.steel);
    p.vline(x + 3, y - 7, y + 4, P.asphalt);
    p.rect(x, y - 9, 5, 3, P.concreteLt);
    p.set(x + 1, y - 9, P.glint);
  };
  post(posts[0][0], posts[0][1] + 6);
  post(posts[1][0], posts[1][1] + 6);
  rope(4, 2, 48, 2);
  rope(3, 4, 3, 34);
  rope(48, 4, 48, 34);
  post(posts[2][0], posts[2][1]);
  post(posts[3][0], posts[3][1]);
  rope(4, 28, 48, 28);
  finish(p, { soft: true });
  const img = p.toCanvas();
  return {
    ox: -2,
    oy: -8,
    w: W,
    h: H,
    foot: 32,
    img: () => img,
    contact: 44,
    contactX: 24,
  } as PropArt;
});

