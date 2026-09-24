// M1 正面ホール (30_level_art 5.1, 22×15). A double-height hall: the 2F
// gallery's glass railing runs along the top of the north wall, the big
// stopped clock hangs from its slab (17:00), shuttered shops below (a book
// shop, a café with chairs stacked behind a half-lowered shutter, the lift
// 『点検中』, a pharmacy), the red 『閉店セール』 scraps hanging from the slab.
// In the middle, the dry fountain on its tiled ring: a stone child holding up
// a bell, a 10-yen coin glinting at the bottom — and the skylight's slanted
// orange shaft lands on it (the brightest spot of the screen). Gacha corner,
// tanabata, mirror pillars, info counter, floor guide, the balloon on the
// ceiling, the half-open automatic door.

import type { Gfx } from '../../engine/gfx';
import { PixelCanvas, mix } from '../../engine/pixel';
import { getMapDef } from '../../world/maps';
import { field } from '../../world/field';
import { charSprite, idleFrame } from '../chars';
import { laneOf, mallTiles } from '../tiles/ifloor';
import { ihash } from '../tiles/noise';
import { P } from '../tiles/palette';
import { clockFace, notice, pc, prop } from './ifurn';
import { blend, depthShade, lightPool, paintShell, screenPool, screenSpill, shellProp } from './ishell';
import { castRight, dk, finish, lt } from './kit';
import { bannerScrap, bellLogo, exitCorridor, exitLight, fasciaText, mallGrade, mallLampLight, mallLamps, mallWall, posterGhost, shaftProp, shutter, skyPatch, skyPatchRim, small, smallW, type Lamp } from './mall_kit';
import { mkFrames, stand } from './pkit';
import { registerProp } from './registry';
import { printLines, tiny } from './text';
import type { PropArt, PropEnv } from './types';
import type { Dir } from '../../game/state';

function rgbHex(c: [number, number, number]): string {
  const h = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${h(c[0])}${h(c[1])}${h(c[2])}`;
}

const M1_LAMPS: Lamp[] = [
  { x: 72, y: 64 }, { x: 150, y: 58 }, { x: 232, y: 64 }, { x: 312, y: 104 },
  { x: 64, y: 150 }, { x: 280, y: 150, flicker: true }, { x: 104, y: 200 }, { x: 184, y: 206 }, { x: 264, y: 200 },
];

// ---------------------------------------------------------------- shell

registerProp('mall_m1_shell', () => {
  const rows = getMapDef('map_mall_hall')?.rows ?? [];
  const blocked = (tx: number, ty: number) => (tx >= 7 && tx <= 14 && ty >= 5 && ty <= 10) || (tx >= 16 && ty <= 4) || ty >= 12;
  const lane = laneOf([[10.5, 14], [10.5, 11], [1, 7.5], [20, 7.5], [10.5, 11]], 22);
  const tiles = mallTiles({
    seed: 511,
    w: 22,
    h: 15,
    blocked,
    lane,
    // the open south-east stretch: a floor sticker pointing to the health
    // corner, dusty prints, a tape trace, a pot ring, a lost balloon
    decals: [
      { x: 252, y: 150, kind: 'arrow', dir: 0 },
      { x: 272, y: 170, kind: 'steps', dir: 1, n: 6 },
      { x: 236, y: 190, kind: 'tape', w: 26, h: 14 },
      { x: 314, y: 150, kind: 'pot' },
      { x: 304, y: 206, kind: 'balloon' },
      { x: 60, y: 186, kind: 'steps', dir: 0, n: 5 },
    ],
  });
  const wallBase = mallWall(513, false);
  const sh = paintShell({
    rows,
    floor: (x, y, tx, ty) => {
      // a terracotta ring of tiles around the fountain (7–14, 5–10)
      if (tx >= 7 && tx <= 14 && ty >= 5 && ty <= 10) {
        const inner = tx >= 8 && tx <= 13 && ty >= 6 && ty <= 9;
        if (!inner) {
          const lx = x & 15;
          const ly = y & 15;
          if (lx === 15 || ly === 15) return P.wood;
          if (lx === 0 || ly === 0) return P.skin3;
          const odd = (tx + ty) % 2 === 1;
          const hh = ihash(tx, ty, 517);
          // glazed tiles: a diagonal sheen on some, fired-in 2px spots, and the
          // south row worn pale where everyone walks round the fountain
          if (hh % 3 === 0 && lx > 1 && ly > 1 && lx + ly >= 7 && lx + ly <= 8) return P.skin3;
          if (ihash(x >> 1, y >> 1, 518) % 47 === 0) return odd ? P.woodLt : P.skin4;
          if (ty === 10 && ((x >> 1) + (y >> 1)) % 3 === 0 && ihash(x >> 1, y >> 1, 519) % 3 === 0) return P.skin3;
          return odd ? P.skin4 : P.woodLt;
        }
      }
      return tiles(x, y);
    },
    wall: (x, y, fh) => {
      // y 3–15: the 2F gallery far back; 16–18 the slab edge; below: the 1F wall
      if (y <= 9) return (Math.floor(x / 24) + (y > 5 ? 1 : 0)) % 3 === 0 ? P.shadeDeep : y % 3 === 0 ? P.asphalt : P.shade;
      if (y === 10) return P.concreteLt;
      if (y === 11) return P.steel;
      if (y <= 13) return x % 24 === 0 ? P.steel : (x + y) % 5 === 0 ? P.aqua : P.lilac;
      if (y === 14) return P.white;
      if (y === 15) return P.concreteLt;
      if (y === 16) return P.concrete;
      if (y === 17) return P.nightShade;
      return wallBase(x, y, fh);
    },
    trim: P.nightShade,
    base: P.steel,
    baseH: 3,
  });
  const p = sh.p;
  // ---- 1F shop fronts (y 18–44)
  // (1–4) book shop: fascia and a closed shutter
  fasciaText(p, 18, 19, 60, 13, P.navy, '書店', P.white, P.nightShade);
  shutter(p, 20, 34, 56, 11);
  posterGhost(p, 24, 36, 10, 6);
  // (5–8) café: half-lowered shutter, dark inside with chairs stacked on tables
  p.rect(82, 19, 60, 12, P.woodDark);
  p.hline(82, 141, 19, P.wood);
  small(p, 'きっさ', 94, 21, P.goldPale);
  p.rect(126, 21, 12, 7, P.goldPale);
  bellLogo(p, 128, 20, P.brassOld);
  castRight(p, 82, 19, 60, 12, 2);
  p.rect(84, 32, 56, 13, P.ink);
  for (const cx of [90, 106, 122]) {
    p.rect(cx, 40, 10, 2, P.woodDark);
    p.rect(cx + 1, 36, 3, 4, P.nightShade);
    p.rect(cx + 6, 36, 3, 4, P.nightShade);
  }
  shutter(p, 84, 32, 56, 7);
  // (9–12) the lift, 『点検中』 on a stand, the floor lamps above dark
  p.rect(146, 20, 60, 25, P.concreteLt);
  p.rect(160, 23, 32, 22, P.steel);
  p.vline(176, 23, 44, P.asphalt);
  p.hline(160, 191, 23, P.concrete);
  for (const [lx, c] of [[168, P.charcoal], [184, P.charcoal]] as const) {
    p.rect(lx - 2, 20, 5, 2, c);
  }
  tiny(p, '1', 166, 20, P.asphalt);
  tiny(p, '2', 182, 20, P.asphalt);
  p.rect(151, 30, 5, 3, P.charcoal);
  p.set(153, 31, P.steel);
  notice(p, 170, 31, 12, 8, { paper: P.gold, ink: P.ink, seed: 51, tape: true });
  // (13–15) pharmacy: faded green cross, shutter
  p.rect(210, 19, 44, 12, P.white);
  p.hline(210, 253, 19, P.glint);
  p.rect(214, 21, 8, 8, P.leafYoung);
  p.rect(217, 21, 2, 8, P.white);
  p.rect(214, 24, 8, 2, P.white);
  small(p, 'くすり', 226, 21, P.leafShade);
  castRight(p, 210, 19, 44, 12, 2);
  shutter(p, 211, 34, 42, 11);
  // (16–20) behind the gacha: the corner's colourful sign and ghosts of posters
  p.rect(258, 19, 76, 11, P.gold);
  p.hline(258, 333, 19, P.goldPale);
  p.hline(258, 333, 29, P.brass);
  for (let k = 0; k < 6; k++) {
    const c = [P.red, P.blue, P.leaf, P.crimson, P.sun, P.aqua][k];
    p.ellipse(266 + k * 11, 24, 3.5, 3.5, c);
    p.hline(263 + k * 11, 269 + k * 11, 24, P.white);
  }
  castRight(p, 258, 19, 76, 11, 2);
  posterGhost(p, 262, 33, 12, 9);
  posterGhost(p, 300, 32, 14, 10);
  // the red 『閉店セール』 banner scraps still tied to the 2F railing (above the fascias)
  // (read left to right: 『閉店セ』 … torn … 『ール』)
  bannerScrap(p, 34, 8, 30, 3, 0);
  bannerScrap(p, 226, 8, 27, 7, 24);
  // ---- the corridors at the west / east edges (E) continue into the dark
  exitCorridor(p, 0, 7, 2, -1);
  exitCorridor(p, 21, 7, 2, 1);
  // ---- the entrance (10–11,14): half-open automatic glass doors
  const dx = 160;
  const dy = 224;
  p.rect(dx - 4, dy, 40, 2, P.steel);
  p.hline(dx - 4, dx + 35, dy, P.white);
  p.rect(dx - 2, dy + 2, 36, 9, P.shadeDeep);
  sh.glass.rect(dx - 1, dy + 3, 34, 7, '#ffffff');
  // two panels slid apart (a 10px gap in the middle)
  p.vline(dx - 2, dy + 2, dy + 10, P.steel);
  p.vline(dx + 11, dy + 2, dy + 10, P.concreteLt);
  p.vline(dx + 21, dy + 2, dy + 10, P.concreteLt);
  p.vline(dx + 33, dy + 2, dy + 10, P.asphalt);
  p.rect(dx + 12, dy + 2, 9, 9, P.lilac);
  p.hline(dx - 2, dx + 33, dy + 11, P.charcoal);
  // mat inside the door: 『ユウナリ』 rubber mat, faded
  p.rect(dx - 4, dy - 14, 40, 12, P.navy);
  p.strokeRect(dx - 4, dy - 14, 40, 12, P.nightShade);
  bellLogo(p, dx + 12, dy - 13, P.blue);
  const img = p.toCanvas();
  const W = img.width;
  return shellProp({
    img,
    glass: sh.glass.toCanvas(),
    over(g: Gfx, x: number, y: number, env: PropEnv) {
      depthShade(g, x + 16, y + 48, W - 32, 90, 0.14);
      mallLamps(g, x, y, M1_LAMPS, env, 101, 0.16, rows);
      // the outside's purple-pink evening coming in through the half-open door
      screenSpill(g, x + 176, y + 224, 26, 54, 40, rgbHex(env.grade.skyBot), 0.2, true);
    },
    light(g: Gfx, x: number, y: number, env: PropEnv) {
      mallGrade(g, 'mall', env, [x + 16, y + 48, 320, 176]);
      mallLampLight(g, x, y, M1_LAMPS, env, 101);
    },
    glow(g: Gfx, x: number, y: number, env: PropEnv) {
      // the food court's warm light down the west corridor, the health corner's cooler one east
      exitLight(g, x, y, 0, 7, 2, -1, P.sky, 0.3);
      exitLight(g, x, y, 21, 7, 2, 1, P.aqua, 0.24);
      // the gacha corner's sign: its six capsule lamps still chase round,
      // one after another (the only thing in the hall still 'open')
      const k = Math.floor(env.t / 260) % 8;
      if (k < 6) {
        const cx0 = x + 266 + k * 11;
        g.rect(cx0 - 2, y + 22, 5, 5, P.glint, 0.55);
        screenPool(g, cx0 + 0.5, y + 24.5, 7, 6, P.sky, 0.3);
      }
    },
  });
});

// ---------------------------------------------------------------- the skylight shaft in the air (all mall areas)

registerProp('mall_shaft', (o) =>
  shaftProp({
    fx: Number(o.fx ?? 0),
    fy: Number(o.fy ?? 0),
    fw: Number(o.fw ?? 48),
    fh: Number(o.fh ?? 32),
    rise: o.rise === undefined ? undefined : Number(o.rise),
    shear: o.shear === undefined ? undefined : Number(o.shear),
    motes: o.motes === undefined ? undefined : Number(o.motes),
    a: o.a === undefined ? undefined : Number(o.a),
    seed: o.seed === undefined ? undefined : Number(o.seed),
  }) as PropArt,
);

// ---------------------------------------------------------------- the stopped clock (10–11, 0–1): 28px, 17:00

registerProp('mall_m1_clock', () => {
  const p = pc(32, 32);
  // two rods up to the slab
  p.vline(9, 0, 3, P.asphalt);
  p.vline(22, 0, 3, P.asphalt);
  p.ellipse(16, 17, 14, 14, P.brassOld);
  p.ellipse(16, 17, 13, 13, P.brass);
  p.ellipse(16, 17, 12, 12, P.paper);
  p.ellipse(15, 16, 9, 9, P.white);
  // hour ticks
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2;
    const r = k % 3 === 0 ? 10 : 10.5;
    p.set(Math.round(16 + Math.sin(a) * r), Math.round(17 - Math.cos(a) * r), k % 3 === 0 ? P.ink : P.steel);
    if (k % 3 === 0) p.set(Math.round(16 + Math.sin(a) * (r - 1)), Math.round(17 - Math.cos(a) * (r - 1)), P.ink);
  }
  // 17:00 — hands at 5 and 12
  p.line(16, 17, 16, 8, P.ink);
  p.line(16, 17, 20, 22, P.ink);
  p.line(17, 17, 21, 22, P.ink);
  p.set(16, 17, P.verm);
  // the Yunari bell under 12, a crack across the glass
  bellLogo(p, 12, 19, P.brass);
  p.line(7, 11, 12, 14, P.concrete);
  p.line(12, 14, 14, 13, P.concrete);
  p.set(4, 13, P.goldPale);
  p.set(5, 10, P.goldPale);
  finish(p, { soft: true, rim: false });
  castRight(p, 2, 3, 29, 29, 3);
  const img = p.toCanvas();
  return { ox: 0, oy: 0, w: 32, h: 32, foot: 0, flat: true, img: () => img } as PropArt;
});

// ---------------------------------------------------------------- the fountain (8–13, 6–9)

/**
 * The bronze child on the pedestal, holding a bell up over its head with
 * both hands (30×46): dark weathered bronze lit from the upper left by the
 * skylight's shaft (a warm 1px rim along the left edges and the crown of the
 * head), verdigris pooled green in the folds, the hems and the shoes, a calm
 * face (eyes looking up, a closed smile) — and the bell rubbed bright gold by
 * a year of hands: flared mouth, waist band, crown loop, the clapper.
 * Outlined in the darkest bronze on the outside only, so the gaps between the
 * raised arms and the head stay open.
 */
function statue(): PixelCanvas {
  const p = pc(30, 46);
  const D = '#2A1810';
  const S = '#3E2619';
  const B = '#5A3A28';
  const M = '#76503A';
  const L = '#96694A';
  const R = '#F7C27A';
  const V = '#4F8A7A';
  const Vl = '#6FA898';
  // legs (x 11–13, 16–18) and shoes
  for (const lx of [11, 16]) {
    for (let y = 36; y <= 40; y++) {
      p.set(lx, y, lx === 11 ? L : M);
      p.set(lx + 1, y, B);
      p.set(lx + 2, y, S);
    }
    p.hline(lx - 1, lx + 3, 41, B);
    p.hline(lx - 1, lx + 3, 42, S);
    p.set(lx - 1, 41, lx === 11 ? R : M);
    p.set(lx, 41, V);
    p.set(lx + 1, 41, Vl);
  }
  // the smock: an A-line from the shoulders to the hem (x 15±w)
  for (let y = 23; y <= 35; y++) {
    const w = 4 + Math.round((y - 23) * 0.3);
    const x0 = 15 - w;
    const x1 = 14 + w;
    for (let x = x0; x <= x1; x++) {
      const u = (x - x0) / (x1 - x0);
      p.set(x, y, u < 0.12 ? L : u < 0.4 ? M : u < 0.78 ? B : S);
    }
    p.set(x0, y, R);
  }
  // collar (a shadowed neckline) and the two folds running down, verdigris pooled where they end
  p.hline(12, 17, 23, B);
  p.hline(13, 16, 23, S);
  p.set(13, 24, S);
  p.set(16, 24, S);
  for (let y = 27; y <= 34; y++) {
    p.set(13, y, S);
    p.set(17, y, D);
  }
  p.hline(10, 19, 35, S);
  p.hline(9, 20, 36, D);
  p.set(13, 34, V);
  p.set(17, 34, V);
  p.set(17, 33, Vl);
  p.hline(11, 12, 35, V);
  // the arms raised in a V from the shoulders to the lip of the bell (2px, lit outer-left)
  for (let y = 11; y <= 24; y++) {
    const k = (24 - y) / 13;
    const lx = Math.round(10 - k * 5);
    const rx = Math.round(19 + k * 5);
    p.set(lx, y, R);
    p.set(lx + 1, y, M);
    p.set(rx - 1, y, B);
    p.set(rx, y, S);
  }
  // the shoulders and the neck: the upper arms rise out of them beside the
  // head (no daylight between the chin and the shoulders)
  for (let y = 20; y <= 23; y++) {
    const k = (24 - y) / 13;
    const lx = Math.round(10 - k * 5) + 2;
    const rx = Math.round(19 + k * 5) - 2;
    for (let x = lx; x <= rx; x++) {
      if (p.get(x, y) >>> 24) continue;
      const u = (x - lx) / Math.max(1, rx - lx);
      p.set(x, y, y === 20 && (u < 0.25 || u > 0.75) ? 'transparent' : u < 0.3 ? M : u < 0.7 ? B : S);
    }
  }
  // verdigris run down the inside of the arms from the hands (the rain)
  for (const [x, y] of [[7, 14], [7, 15], [8, 17], [21, 13], [22, 14], [21, 16]] as const) p.set(x, y, V);
  // the hands wrapped round the lip
  p.rect(4, 9, 3, 3, M);
  p.set(4, 9, R);
  p.set(4, 10, R);
  p.set(6, 11, B);
  p.rect(23, 9, 3, 3, B);
  p.set(25, 11, S);
  p.set(25, 10, S);
  // the head: a cap of hair (dark, its crown lit by the evening), the face
  // plane lighter below it — eyes turned up to the bell, a closed smile
  for (let y = 14; y <= 22; y++)
    for (let x = 10; x <= 20; x++) {
      const dx = (x + 0.5 - 15.5) / 4.6;
      const dy = (y + 0.5 - 18.5) / 4.4;
      if (dx * dx + dy * dy > 1) continue;
      const hair = y <= 16 || (y <= 18 && (dx < -0.62 || dx > 0.62));
      if (hair) p.set(x, y, dx < -0.3 && y <= 15 ? M : dx > 0.4 ? D : S);
      else p.set(x, y, dx < -0.35 ? L : dx < 0.35 ? M : B);
    }
  for (const [x, y] of [[13, 14], [14, 14], [12, 15], [11, 16], [11, 17]] as const) p.set(x, y, R);
  p.set(16, 14, L);
  p.set(17, 14, M);
  // eyes (2px each, turned up), cheeks, a closed smile
  p.vline(13, 18, 19, D);
  p.vline(17, 18, 19, D);
  p.set(12, 20, L);
  p.set(18, 20, B);
  p.hline(14, 16, 21, S);
  p.set(15, 21, D);
  p.set(15, 22, B);
  // ---- the bell, rubbed bright: crown loop, shoulder, waist band, flared lip
  p.ring(15, 1, 1.6, 1.3, P.brassOld);
  p.set(14, 0, P.brass);
  const rows: [number, number, number][] = [[2, 12, 17], [3, 11, 18], [4, 10, 19], [5, 10, 19], [6, 10, 19], [7, 10, 19], [8, 9, 20], [9, 8, 21]];
  for (const [y, x0, x1] of rows) {
    for (let x = x0; x <= x1; x++) {
      const u = (x - x0) / (x1 - x0);
      p.set(x, y, u < 0.18 ? P.glint : u < 0.4 ? P.goldPale : u < 0.72 ? P.gold : u < 0.88 ? P.brass : P.brassOld);
    }
  }
  p.hline(10, 19, 6, P.brass);
  p.set(11, 6, P.goldPale);
  p.hline(6, 23, 10, P.brassOld);
  p.hline(7, 10, 10, P.brass);
  p.hline(7, 22, 11, S);
  // the clapper hanging in the mouth
  p.rect(14, 11, 2, 2, P.charcoal);
  p.set(14, 11, P.asphalt);
  // outline on the outside only (flood the exterior from the canvas border)
  const ext = new Uint8Array(p.w * p.h);
  const q: number[] = [];
  for (let x = 0; x < p.w; x++) q.push(x, (p.h - 1) * p.w + x);
  for (let y = 0; y < p.h; y++) q.push(y * p.w, y * p.w + p.w - 1);
  while (q.length) {
    const i = q.pop()!;
    if (ext[i] || p.data[i] >>> 24) continue;
    ext[i] = 1;
    const x = i % p.w;
    const y = (i / p.w) | 0;
    if (x > 0) q.push(i - 1);
    if (x < p.w - 1) q.push(i + 1);
    if (y > 0) q.push(i - p.w);
    if (y < p.h - 1) q.push(i + p.w);
  }
  const src = p.data.slice();
  for (let y = 0; y < p.h; y++)
    for (let x = 0; x < p.w; x++) {
      const i = y * p.w + x;
      if (!ext[i]) continue;
      const on = (xx: number, yy: number) => xx >= 0 && yy >= 0 && xx < p.w && yy < p.h && src[yy * p.w + xx] >>> 24 !== 0;
      if (on(x - 1, y) || on(x + 1, y) || on(x, y - 1) || on(x, y + 1)) p.set(x, y, y <= 11 ? P.woodDark : D);
    }
  return p;
}

registerProp('mall_fountain', () => {
  const W = 96;
  const H = 100;
  const base = 64; // footprint height (4 tiles)
  const top = H - base; // statue above the footprint
  const p = pc(W, H);
  const cx = 48;
  const cy = top + 32;
  // outer basin side (stone), rim, inner dry basin (pale: it catches the evening)
  p.ellipse(cx, cy + 3, 46, 29, P.steel);
  p.ellipse(cx, cy, 46, 29, P.concrete);
  p.ellipse(cx, cy, 45, 28, P.concreteLt);
  p.ellipse(cx, cy + 1, 40, 24, P.concrete);
  p.ellipse(cx, cy + 1, 39, 23, P.steel);
  p.ellipse(cx, cy + 2, 38, 22, P.steel);
  p.ellipse(cx - 2, cy + 1, 32, 17, P.concrete);
  // the dry bottom darkened by old water, grime collected in the low ring
  for (let y = cy - 20; y < cy + 24; y++)
    for (let x = cx - 38; x < cx + 38; x++) {
      const dx = (x + 0.5 - cx) / 35;
      const dy = (y + 0.5 - cy - 3) / 20;
      const d = dx * dx + dy * dy;
      if (d > 1 || d < 0.62 || (p.get(x, y) >>> 24) === 0) continue;
      if (((x * 7 + y * 3) % 5) < 2) p.set(x, y, P.steel);
    }
  // rim joints (stone blocks)
  for (let k = 0; k < 16; k++) {
    const a = (k / 16) * Math.PI * 2;
    const x1 = Math.round(cx + Math.cos(a) * 42.5);
    const y1 = Math.round(cy + Math.sin(a) * 26);
    p.set(x1, y1, P.steel);
  }
  // the old water line, a stain ring just under the rim, and the drain
  p.ring(cx, cy + 3, 33, 18, P.steel);
  p.ring(cx, cy + 2, 37, 21, P.steel);
  p.ellipse(cx + 16, cy + 12, 2.5, 1.5, P.asphalt);
  p.hline(cx + 15, cx + 17, cy + 12, P.charcoal);
  // dust and a few dead leaves blown in through the automatic door: dull
  // browns, pushed out to the edge of the bottom — the middle 24px are
  // clear, so the copper of the coin is the only warm speck there
  const coinX = 40;
  const coinY = top + 42;
  const LEAF = ['#7A5A3A', '#6A4A30', '#8A6A4A'];
  for (let k = 0; k < 30; k++) {
    const hh = ihash(k, 17, 601);
    const a = ((hh % 360) / 360) * Math.PI * 2;
    const r = 0.62 + ((hh >>> 9) % 100) / 260;
    const lx = Math.round(cx + Math.cos(a) * 33 * r);
    const ly = Math.round(cy + 3 + Math.sin(a) * 19 * r);
    if (Math.abs(lx - cx) < 12 && Math.abs(ly - cy - 3) < 8) continue;
    if (Math.abs(lx - coinX) < 9 && Math.abs(ly - coinY) < 6) continue;
    if (k % 3 === 0) {
      p.rect(lx, ly, 2, 1, LEAF[k % 3]);
      p.set(lx + 1, ly + 1, P.woodDark);
    } else if (k % 3 === 1) p.rect(lx, ly, 2, 1, LEAF[(k >> 1) % 3]);
    else p.rect(lx, ly, 2, 1, k % 2 ? P.steel : P.asphalt);
  }
  // the dry bottom has cracked
  p.line(cx - 24, cy + 9, cx - 12, cy + 13, P.steel);
  p.line(cx - 12, cy + 13, cx - 4, cy + 19, P.steel);
  p.line(cx - 12, cy + 13, cx - 10, cy + 17, P.asphalt);
  p.line(cx + 14, cy + 6, cx + 24, cy + 4, P.steel);
  // the outer side face shading (lit left)
  for (let x = 0; x < W; x++)
    for (let y = cy; y < cy + 33; y++) {
      if (p.get(x, y) >>> 24 === 0) continue;
      const dx = (x + 0.5 - cx) / 46;
      const dy = (y + 0.5 - cy) / 29;
      if (dx * dx + dy * dy > 1 && x > cx + 10) p.set(x, y, P.asphalt);
    }
  // the pedestal
  const px = cx;
  const py = cy + 2;
  p.ellipse(px, py + 1, 10, 5, P.asphalt);
  p.ellipse(px, py - 1, 10, 5, P.concrete);
  p.rect(px - 8, py - 11, 16, 10, P.concrete);
  p.vline(px - 8, py - 11, py - 2, P.white);
  p.vline(px - 7, py - 11, py - 2, P.concreteLt);
  p.vline(px + 7, py - 11, py - 2, P.steel);
  p.ellipse(px, py - 11, 8, 3, P.concreteLt);
  p.hline(px - 5, px + 3, py - 12, P.white);
  // a small brass plaque on the pedestal, green run-off from the bronze
  p.rect(px - 3, py - 7, 6, 3, P.brassOld);
  p.hline(px - 3, px + 2, py - 7, P.brass);
  for (const [dx, dy] of [[-4, -11], [-4, -10], [2, -11], [3, -10], [3, -9], [-1, -12]] as const) p.set(px + dx, py + dy, '#4F8A7A');
  p.set(px + 3, py - 8, '#6FA898');
  finish(p, { soft: true, rim: false });
  // the statue stands on it (after the outline pass: see statue())
  p.blit(statue(), px - 15, py - 11 - 44);
  const img = p.toCanvas();
  const a = stand(img, { cx: 48, base, foot: base - 1, shadow: 0, contact: 0 });
  // the skylight's patch lands on the basin's centre — the brightest spot of the hall
  a.glow = (g: Gfx, x: number, y: number, env: PropEnv) => {
    const n = 1 - env.grade.night;
    skyPatchRim(g, x + a.ox + 22, y + a.oy + 41, 50, 26, env, 0.3);
    // the polished bell catches the evening (the brightest thing in the hall)
    const k = (Math.sin(env.t / 700) + 1) / 2;
    g.rect(x + a.ox + px - 9, y + a.oy + py - 53, 2, 3, P.glint, (0.45 + k * 0.45) * n);
    screenPool(g, x + a.ox + px - 1, y + a.oy + py - 50, 14, 8, P.sky, (0.22 + k * 0.08) * n);
    // the warm light on the back rim of the basin, behind the pedestal
    screenPool(g, x + a.ox + px - 4, y + a.oy + py - 3, 26, 9, P.sky, 0.18 * n);
    // fushigi_10: the coin's cross-shaped glint (2 frames every 1.96 s) pops
    // out well past the coin itself, over the bottom of the basin
    if (env.flag('flag_fushigi_10')) return;
    const c = Math.floor(env.t / 140) % 14;
    if (c > 1) return;
    const tx = x + a.ox + coinX + 1;
    const ty = y + a.oy + coinY + 1;
    const r = c === 0 ? 3 : 5;
    g.rect(tx, ty - r, 1, r * 2 + 1, P.horizon, c === 0 ? 0.75 : 0.9);
    g.rect(tx - r, ty, r * 2 + 1, 1, P.horizon, c === 0 ? 0.75 : 0.9);
    g.rect(tx - 1, ty - 1, 3, 3, P.glint, 0.9);
    if (c === 1) {
      g.rect(tx - 2, ty - 2, 1, 1, P.glint, 0.6);
      g.rect(tx + 2, ty - 2, 1, 1, P.glint, 0.6);
      g.rect(tx - 2, ty + 2, 1, 1, P.glint, 0.6);
      g.rect(tx + 2, ty + 2, 1, 1, P.glint, 0.6);
    }
  };
  a.light = (g: Gfx, x: number, y: number, env: PropEnv) => {
    const n = 1 - env.grade.night;
    lightPool(g, x + a.ox + 48, y + a.oy + top + 20, 34, 18, P.sky, 0.26 * n);
    lightPool(g, x + a.ox + 48, y + a.oy + top + 4, 16, 28, P.sky, 0.34 * n);
  };
  a.over = (g: Gfx, x: number, y: number, env: PropEnv) => {
    // the skylight's patch lands on the statue's feet and the back of the basin
    skyPatch(g, x + a.ox + 22, y + a.oy + 41, 50, 26, env, 0.5);
    // fushigi_10: the 10-yen coin at the bottom (10,8): copper with a dark
    // rim (its glint is in glow()); gone once stamped
    if (env.flag('flag_fushigi_10')) return;
    const tx = x + a.ox + coinX;
    const ty = y + a.oy + coinY;
    g.rect(tx, ty, 3, 3, '#B8683A');
    g.rect(tx, ty, 2, 1, '#E8A070');
    g.rect(tx, ty + 1, 1, 1, '#D88850');
    g.rect(tx + 2, ty + 1, 1, 2, '#8A4A28');
    g.rect(tx - 1, ty, 1, 3, '#4A2818');
    g.rect(tx + 3, ty, 1, 3, '#4A2818');
    g.rect(tx, ty - 1, 3, 1, '#4A2818');
    g.rect(tx, ty + 3, 3, 1, '#4A2818');
  };
  return a;
});

// ---------------------------------------------------------------- mirror pillars

registerProp('mall_pillar', (opts) => {
  const v = Number(opts.v ?? 0);
  const H = 60;
  const p = pc(18, H);
  // mirror cladding: pale steel with a vertical highlight band, fading up into the ceiling
  for (let y = 0; y < H - 4; y++)
    for (let x = 1; x < 17; x++) {
      let c: string = x < 4 ? P.concreteLt : x > 13 ? P.steel : x === 5 || x === 6 ? P.white : P.concrete;
      // the top fades up into the ceiling's shadow in three bands
      if (y < 9) c = mix(c, P.shade, y < 3 ? 0.55 : y < 6 ? 0.35 : 0.16);
      p.set(x, y, c);
    }
  p.vline(1, 0, H - 5, P.white);
  p.vline(16, 0, H - 5, P.asphalt);
  // base skirting
  p.rect(0, H - 6, 18, 6, P.asphalt);
  p.hline(0, 17, H - 6, P.steel);
  p.hline(0, 17, H - 1, P.charcoal);
  // per-pillar details: a floor sign, a sticker, a fire extinguisher, the bell logo
  if (v === 0) {
    p.rect(3, 22, 12, 8, P.white);
    tiny(p, '1F', 5, 23, P.navy);
    p.rect(3, 29, 12, 1, P.blue);
  } else if (v === 1) {
    p.rect(3, 22, 12, 12, P.paper);
    bellLogo(p, 4, 23, P.brass);
  } else if (v === 2) {
    // fire extinguisher at the foot
    p.rect(12, H - 16, 4, 10, P.verm);
    p.hline(12, 15, H - 16, P.vermLt);
    p.set(13, H - 18, P.charcoal);
    // the red 『消火器』 plate: a white extinguisher pictogram
    p.rect(3, 23, 11, 9, P.red);
    p.hline(3, 13, 23, P.vermLt);
    p.hline(3, 13, 31, P.vermShade);
    p.rect(7, 26, 3, 5, P.white);
    p.hline(7, 9, 25, P.white);
    p.set(10, 25, P.white);
    p.set(11, 26, P.white);
    p.set(11, 27, P.white);
  } else if (v === 4) {
    // 『セルフサービス』 with a cup
    p.rect(3, 22, 12, 10, P.aqua);
    p.rect(6, 24, 5, 5, P.white);
    p.vline(11, 25, 27, P.white);
    p.hline(4, 13, 30, P.navy);
  } else {
    // toilets: the man / woman pictogram, an arrow west
    p.rect(2, 22, 14, 12, P.white);
    p.hline(2, 15, 22, P.glint);
    p.hline(2, 15, 33, P.concrete);
    p.rect(4, 24, 2, 2, P.navy);
    p.rect(3, 26, 4, 4, P.navy);
    p.vline(4, 30, 31, P.navy);
    p.vline(5, 30, 31, P.navy);
    p.rect(11, 24, 2, 2, P.verm);
    p.rect(11, 26, 2, 2, P.verm);
    p.rect(10, 28, 4, 2, P.verm);
    p.vline(11, 30, 31, P.verm);
    p.vline(12, 30, 31, P.verm);
    p.vline(8, 24, 31, P.concrete);
  }
  finish(p, { soft: true, rim: false });
  const img = p.toCanvas();
  const a = stand(img, { base: 16, shadow: 0, contact: 14 });
  a.xray = 0.4;
  a.over = (g: Gfx, x: number, y: number, env: PropEnv) => {
    // the mirror shows Minato when he stands in front of it
    const f = field();
    if (!f) return;
    const wx = x + Math.round(f.camX) + 8;
    const wy = y + Math.round(f.camY) + 16;
    const dxw = env.px - wx;
    const dyw = env.py - wy;
    if (dyw < 4 || dyw > 64 || Math.abs(dxw) > 26) return;
    const off = Math.round(dxw * 0.5);
    const opp: Record<Dir, Dir> = { up: 'down', down: 'up', left: 'right', right: 'left' };
    const fr = idleFrame(charSprite('minato'), opp[f.player.dir], 0);
    const ctx = g.ctx;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x + a.ox + 2, y + a.oy + 14, 14, H - 22);
    ctx.clip();
    ctx.globalAlpha = 0.4 * Math.max(0, 1 - (dyw - 8) / 60) * (1 - Math.abs(dxw) / 30);
    const fx = Math.round(x + a.ox + 9 + off - fr.width / 2);
    const fy = Math.round(y + a.oy + H - 8 - fr.height - Math.min(18, dyw / 3));
    ctx.drawImage(fr, fx, fy);
    ctx.restore();
  };
  return a;
});

// ---------------------------------------------------------------- the gacha corner (16–17 | 19–20, 3–4): 8 machines round the pillar

/**
 * Where the eight machines stand: two columns each side of the mirror pillar
 * at (18,5) (so it never hides one), a back row raised on a low rack, a front
 * row on the floor. x = canvas px of the machine's left edge.
 */
const GACHA_COLS = [1, 17, 49, 65];
const GACHA_BODY = [P.red, P.blue, P.leafDeep, P.sun, P.crimson, P.navy, P.gold, P.aqua];

/** One capsule toy machine: a clear dome full of two-tone capsules on a coloured body. */
function gachaMachine(p: PixelCanvas, x: number, y: number, k: number, tag: 'none' | 'broken' | 'brokenLow' | 'rest'): void {
  const c = GACHA_BODY[k];
  // body (14×12): lit top edge, darker right side, the coin handle, the outlet
  p.rect(x, y + 10, 14, 12, c);
  p.hline(x, x + 13, y + 10, lt(c));
  p.vline(x + 13, y + 11, y + 21, dk(c));
  p.hline(x, x + 13, y + 21, dk(c, 2));
  // the display card with a toy printed on it
  p.rect(x + 2, y + 12, 7, 4, P.white);
  const toy = [P.leafYoung, P.peach, P.sun, P.aqua, P.gold, P.crimson, P.blue, P.leafLt][k];
  p.rect(x + 4, y + 13, 3, 2, toy);
  p.set(x + 5, y + 13, lt(toy));
  // coin handle (a white knob with a bar)
  p.ellipse(x + 11, y + 14, 1.6, 1.6, P.white);
  p.hline(x + 10, x + 12, y + 14, P.steel);
  p.set(x + 11, y + 12, P.steel);
  // outlet flap
  p.rect(x + 2, y + 17, 5, 3, P.ink);
  p.hline(x + 2, x + 6, y + 17, P.charcoal);
  p.rect(x + 9, y + 17, 3, 2, dk(c));
  // the neck ring
  p.rect(x + 1, y + 9, 12, 1, P.steel);
  // the dome: clear glass (a pale tint), capsules piled in the bottom half
  const dx = x + 7;
  const dy = y + 5;
  p.ellipse(dx, dy, 6, 5, '#C9D6E0');
  for (let i = 0; i < 6; i++) {
    const hh = ihash(i, k, 701);
    const cx2 = dx - 4 + (i % 3) * 3 + ((hh >>> 3) & 1);
    const cy2 = dy + (i < 3 ? 1 : -1) + ((hh >>> 5) & 1) * (i < 3 ? 0 : -1);
    const cc = [P.red, P.gold, P.leafYoung, P.crimson, P.blue, P.sun][(hh + k) % 6];
    // a capsule: coloured top half, white bottom half
    p.set(cx2, cy2, lt(cc));
    p.set(cx2 + 1, cy2, cc);
    p.set(cx2, cy2 + 1, P.white);
    p.set(cx2 + 1, cy2 + 1, P.concreteLt);
  }
  // glass rim and glints (drawn over the capsules)
  p.ring(dx, dy, 6, 5, P.steel);
  p.set(dx - 3, dy - 3, P.white);
  p.set(dx - 4, dy - 2, P.white);
  p.set(dx - 2, dy - 4, P.glint);
  p.set(dx + 4, dy + 2, P.white);
  // a coloured cap on the dome
  p.rect(dx - 2, y - 1, 5, 2, c);
  p.hline(dx - 2, dx + 2, y - 1, lt(c));
  // tags: the 『故障中』 slips on the body (never over the dome), one 『休憩中』
  if (tag === 'broken') {
    p.rect(x + 1, y + 11, 8, 6, P.white);
    p.strokeRect(x + 1, y + 11, 8, 6, P.verm);
    p.hline(x + 3, x + 6, y + 13, P.verm);
    p.hline(x + 3, x + 5, y + 15, P.verm);
  } else if (tag === 'brokenLow') {
    p.rect(x + 7, y + 16, 6, 5, P.paper);
    p.strokeRect(x + 7, y + 16, 6, 5, P.verm);
    p.hline(x + 9, x + 11, y + 18, P.verm);
    p.set(x + 12, y + 16, P.goldPale);
  } else if (tag === 'rest') {
    p.rect(x + 1, y + 16, 9, 5, P.white);
    p.strokeRect(x + 1, y + 16, 9, 5, P.blue);
    p.hline(x + 3, x + 7, y + 18, P.navy);
  }
}

registerProp('mall_gacha_row', () => {
  const p = pc(80, 48);
  // the low rack the back row stands on (a steel plinth with a blue skirt)
  for (const [x0, x1] of [[0, 31], [48, 79]] as const) {
    p.rect(x0, 26, x1 - x0 + 1, 5, P.navy);
    p.hline(x0, x1, 26, P.blue);
    p.hline(x0, x1, 30, P.nightShade);
  }
  const tags: ('none' | 'broken' | 'brokenLow' | 'rest')[] = ['broken', 'none', 'brokenLow', 'broken', 'brokenLow', 'rest', 'broken', 'none'];
  // back row (raised 4px), then the front row in front of it
  GACHA_COLS.forEach((x, i) => gachaMachine(p, x, 4, i, tags[i]));
  GACHA_COLS.forEach((x, i) => gachaMachine(p, x, 26, i + 4, tags[i + 4]));
  // a capsule dropped on the floor by the front row, and an empty half
  p.rect(33, 44, 2, 1, P.crimson);
  p.rect(33, 45, 2, 1, P.white);
  p.set(46, 46, P.aqua);
  p.set(47, 46, P.concreteLt);
  finish(p, { soft: true });
  const a = stand(p.toCanvas(), { cx: 40, base: 32, foot: 31, shadow: 0, contact: 0 });
  a.glow = (g: Gfx, x: number, y: number, env: PropEnv) => {
    // 『休憩中』's little lamp (front row, x=49), the only one still lit
    const on = Math.floor(env.t / 800) % 2;
    g.rect(x + a.ox + 49 + 9, y + a.oy + 26 + 14, 1, 1, on ? P.leafLt : P.leaf, 0.9);
    // the domes catch the light one after another (the glass glints move along the row)
    const k = Math.floor(env.t / 420) % 12;
    if (k < 8) {
      const col = GACHA_COLS[k % 4];
      const row = k < 4 ? 4 : 26;
      g.rect(x + a.ox + col + 3, y + a.oy + row + 2, 1, 1, P.glint, 0.8);
      g.rect(x + a.ox + col + 4, y + a.oy + row + 1, 1, 1, P.glint, 0.5);
    }
  };
  return a;
});

// ---------------------------------------------------------------- tanabata bamboo (2,5): the strips shiver once as Minato passes

registerProp('mall_tanabata', () => {
  const frames = mkFrames(3, 24, 52, (p, k) => {
    // stand (a bucket of stones), the pole, leaves, faded paper strips
    p.rect(7, 44, 10, 8, P.woodDark);
    p.hline(7, 16, 44, P.wood);
    p.rect(8, 45, 8, 2, P.steel);
    p.vline(11, 4, 44, P.leafShade);
    p.vline(12, 4, 44, P.leaf);
    for (const ny of [14, 26, 38]) p.hline(11, 12, ny, P.leafDeep);
    const leaves: [number, number, number][] = [[4, 6, -1], [15, 3, 1], [3, 16, -1], [17, 13, 1], [5, 27, -1], [16, 24, 1]];
    for (const [lx, ly, d] of leaves) {
      for (let i = 0; i < 6; i++) p.set(lx + i * d * -1 + (d > 0 ? -3 : 3), ly + Math.floor(i / 2), i < 3 ? P.leafDeep : P.leafShade);
    }
    // strips (tanzaku) hanging, faded colours; k = shiver frame
    const strips: [number, number, string][] = [[6, 9, P.peach], [16, 7, P.paper], [4, 20, P.aqua], [18, 18, P.goldPale], [7, 31, P.leafYoung], [17, 29, P.peach], [10, 36, P.paper]];
    strips.forEach(([sx, sy, c], i) => {
      const sw = k === 0 ? 0 : (i + k) % 2 ? 1 : -1;
      p.vline(sx, sy - 1, sy, P.concrete);
      p.rect(sx - 1 + sw, sy + 1, 3, 7, c);
      p.set(sx + sw, sy + 3, dk(c));
      p.set(sx + sw, sy + 5, dk(c));
    });
  }, (p) => finish(p, { soft: true, rim: false }));
  let was = 999;
  let shiverT = -9999;
  const a = stand(frames[0], { base: 16, shadow: 0, contact: 12 });
  a.img = (env) => {
    if (env.near < 26 && was >= 26) shiverT = env.t;
    was = env.near;
    const u = env.t - shiverT;
    if (u < 0 || u > 560) return frames[0];
    return frames[1 + (Math.floor(u / 140) % 2)];
  };
  return a;
});

// ---------------------------------------------------------------- info counter (4–7,12) and the floor guide (13,11)

registerProp('mall_info_counter', () => {
  const a = prop(64, 30, (p) => {
    // back panel with 『インフォメーション』 sign on a pole
    p.rect(22, 0, 20, 8, P.blue);
    p.hline(22, 41, 0, P.aqua);
    tiny(p, 'INFO', 24, 2, P.white);
    p.vline(31, 8, 12, P.steel);
    // curved white counter top and its front with a blue band
    p.rect(0, 12, 64, 5, P.white);
    p.hline(0, 63, 12, P.glint);
    p.hline(0, 63, 16, P.concrete);
    p.rect(0, 17, 64, 11, P.concreteLt);
    p.rect(0, 20, 64, 3, P.blue);
    p.hline(0, 63, 22, P.navy);
    p.rect(0, 28, 64, 2, P.charcoal);
    // the call bell, a stack of flyers, a pen on a chain
    p.ellipse(12, 12.5, 3, 2, P.brass);
    p.set(12, 10, P.goldPale);
    p.set(11, 11, P.goldPale);
    p.rect(40, 10, 8, 5, P.paper);
    p.rect(41, 9, 8, 5, P.white);
    p.hline(42, 47, 11, P.concrete);
    p.line(52, 13, 56, 11, P.navy);
    // a poster on the front: 『カネナリくん 握手会』, faded, one corner loose
    p.rect(26, 23, 14, 5, P.paper);
    p.rect(27, 24, 3, 3, P.sun);
    p.set(28, 23, P.brass);
    printLines(p, 31, 24, 8, 2, P.crimson, 21);
    castRight(p, 26, 23, 14, 5, 1);
  }, { cx: 32, base: 16, contact: 0, shadow: 0 });
  a.glow = (g: Gfx, x: number, y: number, env: PropEnv) => {
    // the call bell's dome catches the door's light: a slow glint wandering over it
    const u = (env.t % 3400) / 3400;
    if (u < 0.3) {
      const k = Math.floor(u * 10);
      g.rect(x + a.ox + 10 + k, y + a.oy + 11 - (k === 1 ? 1 : 0), 1, 1, P.glint, 0.85);
    }
  };
  return a;
});

registerProp('mall_floor_guide', () =>
  prop(18, 44, (p) => {
    // two posts and the board: 1F / 2F coloured blocks, the handwritten memo taped on
    p.vline(3, 20, 43, P.asphalt);
    p.vline(14, 20, 43, P.charcoal);
    p.rect(0, 0, 18, 22, P.steel);
    p.rect(1, 1, 16, 20, P.white);
    p.rect(1, 1, 16, 3, P.navy);
    tiny(p, '2F', 2, 5, P.navy);
    p.rect(9, 5, 7, 4, P.peach);
    p.rect(2, 11, 4, 1, P.navy);
    tiny(p, '1F', 2, 12, P.navy);
    p.rect(9, 12, 3, 4, P.leafYoung);
    p.rect(12, 12, 4, 4, P.gold);
    p.rect(9, 16, 7, 3, P.aqua);
    p.set(12, 17, P.red);
    // memo: yellow paper, red handwriting, tape
    p.rect(3, 15, 7, 6, P.gold);
    p.hline(4, 8, 17, P.vermShade);
    p.hline(4, 7, 19, P.vermShade);
    p.rect(5, 14, 3, 1, P.goldPale);
    p.rect(1, 42, 16, 2, P.charcoal);
  }, { base: 16, contact: 14, shadow: 0 }),
);

// ---------------------------------------------------------------- hanging signs (depth-sorted, above head height)

/** Rods from the ceiling down to the board (px). */
const ROD = 16;
/** Gap between the board's bottom edge and the floor line of the row it hangs over (px): 8px over a child's head. */
const CLEAR = 32;

/**
 * A sign hung from the ceiling over a walkway. It is depth-sorted on the
 * floor line of the row it hangs over and its board hangs above head height
 * (bottom edge CLEAR px above that line), so whoever stands on that row or
 * south of it walks under it untouched.
 *
 * Someone further north (behind it) sees the whole board fade to about 35%
 * over 0.15 s, its 1px frame staying solid — no hole, no muddy mix of letters
 * and hair. The board is lit evenly: its light-map rect is set to the plain
 * indoor light (sampled just outside the room, `outX` px right of the
 * anchor), so the half hanging over the room is not darkened by the lamp
 * grading and the wall shadow while the other half stays white.
 * `paint` draws the board at y = ROD.
 */
const plainLight = new Map<string, string>();
function hangingSign(w: number, bh: number, paint: (p: PixelCanvas) => void, ox: number, outX: number): PropArt {
  const h = ROD + bh;
  const p = pc(w, h);
  p.vline(3, 0, ROD, P.asphalt);
  p.vline(w - 4, 0, ROD, P.asphalt);
  p.set(3, ROD - 1, P.steel);
  p.set(w - 4, ROD - 1, P.steel);
  paint(p);
  const LEVELS = [1, 0.8, 0.62, 0.48, 0.35];
  const imgs = LEVELS.map((lv) => {
    if (lv === 1) return p.toCanvas();
    const q = p.clone();
    for (let y = ROD + 1; y < h - 1; y++)
      for (let x = 1; x < w - 1; x++) {
        const v = q.get(x, y);
        const al = v >>> 24;
        if (!al) continue;
        q.set(x, y, ((Math.round(al * lv) << 24) | (v & 0xffffff)) >>> 0);
      }
    return q.toCanvas();
  });
  const oy = 16 - CLEAR - h;
  let fade = 0;
  let lastT = -1;
  const a: PropArt = {
    ox,
    oy,
    w,
    h,
    foot: 15,
    img: () => imgs[Math.round(fade * (LEVELS.length - 1))],
    contact: 0,
    shadow: undefined,
    over(_g: Gfx, x: number, y: number, env: PropEnv) {
      const f = field();
      if (!f) return;
      // the anchor tile in world px
      const wx = x + Math.round(f.camX);
      const wy = y + Math.round(f.camY);
      const bx0 = wx + ox;
      const by0 = wy + oy + ROD;
      const by1 = wy + oy + h;
      const behind = [f.player, f.follower].some((c) => {
        if (!c || !c.visible) return false;
        if (c.y >= wy + 15) return false;
        return c.x + 6 > bx0 && c.x - 6 < bx0 + w && c.y > by0 && c.y - 24 < by1;
      });
      const dt = lastT < 0 ? 0 : Math.max(0, Math.min(100, env.t - lastT));
      lastT = env.t;
      const step = dt / 150;
      fade = behind ? Math.min(1, fade + step) : Math.max(0, fade - step);
    },
    light(g: Gfx, x: number, y: number, env: PropEnv) {
      const ctx = g.ctx;
      // the plain indoor light only changes with the stage / night: sample it once per grade
      const key = `${env.stage}:${env.grade.night.toFixed(2)}`;
      let col = plainLight.get(key);
      if (!col) {
        const sx = Math.round(x + outX);
        const sy = Math.round(y + oy + ROD + Math.floor(bh / 2));
        if (sx < 0 || sy < 0 || sx >= g.w || sy >= g.h) return;
        const d = ctx.getImageData(sx, sy, 1, 1).data;
        col = `rgb(${d[0]},${d[1]},${d[2]})`;
        plainLight.set(key, col);
      }
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = col;
      ctx.fillRect(Math.round(x + ox), Math.round(y + oy), w, h);
    },
  };
  return a;
}

registerProp('mall_escalator_sign', () => {
  // hung over the east exit (the row the M3 link arrives on, so nobody walks
  // under its board): the escalator pictogram, 『2F』 and a hearty arrow →
  const W = 32;
  return hangingSign(W, 11, (p) => {
    const y = ROD;
    p.rect(0, y, W, 11, P.white);
    p.hline(0, W - 1, y, P.glint);
    p.hline(0, W - 1, y + 10, P.steel);
    p.rect(0, y, 3, 11, P.leafDeep);
    p.line(5, y + 8, 10, y + 3, P.navy);
    p.line(5, y + 9, 11, y + 3, P.navy);
    p.hline(10, 12, y + 3, P.navy);
    p.set(4, y + 9, P.navy);
    p.rect(8, y + 1, 2, 2, P.navy);
    tiny(p, '2F', 14, y + 3, P.navy);
    const ax = 22;
    for (let i = 0; i < 7; i++) p.set(ax + i, y + 5, P.verm);
    for (let k = 1; k <= 2; k++) {
      p.set(ax + 6 - k, y + 5 - k, P.verm);
      p.set(ax + 6 - k, y + 5 + k, P.verm);
    }
    finish(p, { soft: true, rim: false });
  }, 16 - W, 24);
});

/** Pictograms for the direction signs: fork & bowl, fountain, escalator. */
function pictogram(p: PixelCanvas, to: string, x: number, y: number, c: string): void {
  if (to === 'food') {
    // a bowl with steam, a fork beside it
    p.hline(x + 1, x + 7, y + 4, c);
    p.hline(x + 2, x + 6, y + 5, c);
    p.hline(x + 3, x + 5, y + 6, c);
    p.set(x + 3, y + 1, c);
    p.set(x + 5, y + 2, c);
    p.vline(x + 9, y + 1, y + 6, c);
    p.set(x + 8, y + 1, c);
    p.set(x + 10, y + 1, c);
  } else if (to === 'hall') {
    // a fountain: basin and a jet
    p.hline(x, x + 8, y + 5, c);
    p.hline(x + 1, x + 7, y + 6, c);
    p.vline(x + 4, y + 1, y + 4, c);
    p.set(x + 3, y + 1, c);
    p.set(x + 5, y + 1, c);
    p.set(x + 2, y + 2, c);
    p.set(x + 6, y + 2, c);
  } else {
    // an escalator: the rising handrail and a figure on the steps
    p.line(x, y + 6, x + 7, y + 1, c);
    p.hline(x + 7, x + 9, y + 1, c);
    p.hline(x, x + 1, y + 6, c);
    p.set(x + 4, y + 1, c);
    p.vline(x + 4, y + 2, y + 3, c);
  }
}

registerProp('mall_exit_sign', (opts) => {
  const to = String(opts.to ?? 'food');
  const right = opts.dir === undefined ? to === 'health' : Number(opts.dir) > 0;
  const W = 32;
  return hangingSign(W, 10, (p) => {
    const y = ROD;
    p.rect(0, y, W, 10, P.navy);
    p.hline(0, W - 1, y, P.blue);
    p.hline(0, W - 1, y + 9, P.nightShade);
    // white plate: the pictogram of where it leads and a big arrow
    p.rect(2, y + 1, W - 4, 8, P.white);
    p.hline(2, W - 3, y + 1, P.glint);
    const dir = right ? 1 : -1;
    pictogram(p, to, right ? 4 : W - 14, y + 1, P.navy);
    const ax = right ? 17 : 4;
    for (let i = 0; i < 10; i++) p.set(ax + i, y + 5, P.verm);
    const tip = right ? ax + 9 : ax;
    for (let k = 1; k <= 3; k++) {
      p.set(tip - dir * k, y + 5 - k, P.verm);
      p.set(tip - dir * k, y + 5 + k, P.verm);
    }
    finish(p, { soft: true, rim: false });
  }, right ? 16 - W : 0, 8);
});

// ---------------------------------------------------------------- the balloon on the ceiling (15,2)

registerProp('mall_balloon', () => {
  const frames = mkFrames(3, 16, 34, (p, k) => {
    // a bell-faced balloon (the mascot's face), string swaying 1px
    p.ellipse(8, 7, 6.5, 6, P.sun);
    p.ellipse(7, 6, 5, 4.5, P.sky);
    p.rect(4, 3, 2, 2, P.goldPale);
    // bell-head face: eyes and a small mouth, the bell rim
    p.set(6, 7, P.ink);
    p.set(10, 7, P.ink);
    p.hline(7, 9, 9, P.sunShade);
    p.hline(2, 14, 11, P.brassOld);
    p.set(8, 13, P.sunDeep);
    const sx = [0, 1, -1][k];
    p.line(8, 14, 8 + sx, 22, P.concreteLt);
    p.line(8 + sx, 22, 8, 33, P.concrete);
  }, (p) => finish(p, { soft: true, rim: false }));
  return {
    ox: 0,
    oy: -30,
    w: 16,
    h: 34,
    foot: 0,
    img: () => null,
    fg: [{ ox: 0, oy: -30, img: (env: PropEnv) => frames[[0, 1, 0, 2][Math.floor(env.t / 700) % 4]] }],
  } as PropArt;
});

// ---------------------------------------------------------------- a plastic bag stirring in the automatic door's draft (13,13)

registerProp('mall_bag_scrap', () => {
  // a crumpled white shopping bag (the bell logo, faded) lying on the floor;
  // its loose handle and one corner lift and settle in the draft
  const frames = mkFrames(3, 16, 12, (p, k) => {
    p.poly([[2, 5], [9, 3], [14, 6], [12, 10], [3, 10]], P.white);
    p.line(2, 5, 9, 3, P.glint);
    p.line(3, 10, 12, 10, P.concrete);
    p.line(12, 10, 14, 6, P.concrete);
    p.line(5, 6, 8, 9, P.concreteLt);
    p.rect(8, 6, 2, 2, P.aqua);
    // the corner / handle that lifts (frames 1–2)
    if (k === 0) p.line(9, 3, 12, 2, P.concreteLt);
    else if (k === 1) {
      p.line(9, 3, 12, 0, P.concreteLt);
      p.set(13, 1, P.white);
    } else {
      p.line(9, 3, 13, 1, P.concreteLt);
      p.set(14, 2, P.white);
      p.set(1, 4, P.white);
    }
  }, (p) => finish(p, { soft: true, rim: false }));
  return {
    ox: 0,
    oy: 3,
    w: 16,
    h: 12,
    foot: 0,
    flat: true,
    img: (env: PropEnv) => {
      // gusts: a few flutters every ~2.6 s, then still
      const u = (env.t + 900) % 2600;
      if (u > 900) return frames[0];
      return frames[1 + (Math.floor(u / 150) % 2)];
    },
  } as PropArt;
});

// ---------------------------------------------------------------- the automatic door's sensor lamp (10,14)

registerProp('mall_autodoor', () => ({
  ox: 0,
  oy: 0,
  w: 32,
  h: 16,
  foot: 0,
  flat: true,
  img: () => null,
  glow(g: Gfx, x: number, y: number, env: PropEnv) {
    // the sensor keeps half-seeing someone: a red lamp that blinks
    const on = Math.floor(env.t / 450) % 3 !== 2;
    g.rect(x + 15, y + 2, 2, 1, on ? P.vermLt : P.maroon, 0.95);
    if (on) screenPool(g, x + 16, y + 3, 5, 3, P.red, 0.25);
  },
}));

void screenPool;
