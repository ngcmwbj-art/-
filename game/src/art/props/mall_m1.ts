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
import { PixelCanvas } from '../../engine/pixel';
import { getMapDef } from '../../world/maps';
import { field } from '../../world/field';
import { charSprite, idleFrame } from '../chars';
import { laneOf, mallTiles } from '../tiles/ifloor';
import { ihash } from '../tiles/noise';
import { P } from '../tiles/palette';
import { clockFace, notice, pc, prop } from './ifurn';
import { blend, depthShade, lightPool, paintShell, screenPool, screenSpill, shellProp } from './ishell';
import { castRight, dk, finish, lt } from './kit';
import { arrowSign, bannerScrap, bellLogo, fasciaText, mallGrade, mallLampLight, mallLamps, mallWall, posterGhost, shaftProp, shutter, skyPatch, type Lamp } from './mall_kit';
import { mkFrames, stand } from './pkit';
import { registerProp } from './registry';
import { fontTextSmall, printLines, scribble, tiny } from './text';
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
  const tiles = mallTiles({ seed: 511, w: 22, h: 15, blocked, lane });
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
          return (tx + ty) % 2 ? P.skin4 : P.woodLt;
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
  fontTextSmall(p, 'きっさ', 94, 21, P.goldPale, 1);
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
  scribble(p, 226, 23, 4, P.leafDeep, 53, 4);
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
  // the red 『閉店セール』 banner scraps hanging from the slab
  bannerScrap(p, 36, 17, 24, 3);
  bannerScrap(p, 232, 17, 18, 7);
  // ---- the corridors at the west / east edges (E) continue into the dark
  for (const [cx, dir] of [[0, -1], [21, 1]] as const) {
    for (let y = 7 * 16; y < 9 * 16; y++)
      for (let i = 0; i < 16; i++) {
        const x = cx * 16 + i;
        const d = dir < 0 ? 15 - i : i;
        if (d > 9 && ((x + y) & 1) === 0) blend(p, x, y, P.night, 0.5);
        if (d > 12) blend(p, x, y, P.night, 0.4);
      }
  }
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
      mallLamps(g, x, y, M1_LAMPS, env, 101);
      // the outside's purple-pink evening coming in through the half-open door
      screenSpill(g, x + 176, y + 224, 26, 54, 40, rgbHex(env.grade.skyBot), 0.2, true);
    },
    light(g: Gfx, x: number, y: number, env: PropEnv) {
      mallGrade(g, 'mall', env);
      mallLampLight(g, x, y, M1_LAMPS, env, 101);
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

registerProp('mall_fountain', () => {
  const W = 96;
  const H = 100;
  const base = 64; // footprint height (4 tiles)
  const top = H - base; // statue above the footprint
  const p = pc(W, H);
  const cx = 48;
  const cy = top + 32;
  // outer basin side (stone), rim, inner dry basin
  p.ellipse(cx, cy + 3, 46, 29, P.steel);
  p.ellipse(cx, cy, 46, 29, P.concrete);
  p.ellipse(cx, cy, 45, 28, P.concreteLt);
  p.ellipse(cx, cy + 1, 40, 24, P.concrete);
  p.ellipse(cx, cy + 1, 39, 23, P.asphalt);
  p.ellipse(cx, cy + 2, 38, 22, P.steel);
  // rim joints (stone blocks)
  for (let k = 0; k < 16; k++) {
    const a = (k / 16) * Math.PI * 2;
    const x1 = Math.round(cx + Math.cos(a) * 42.5);
    const y1 = Math.round(cy + Math.sin(a) * 26);
    p.set(x1, y1, P.steel);
  }
  // dried water line and dust in the basin
  p.ring(cx, cy + 3, 33, 18, P.concrete);
  for (let k = 0; k < 40; k++) {
    const hh = ihash(k, 17, 601);
    const a = ((hh % 360) / 360) * Math.PI * 2;
    const r = 0.3 + ((hh >>> 9) % 100) / 150;
    const lx = Math.round(cx + Math.cos(a) * 32 * r);
    const ly = Math.round(cy + 3 + Math.sin(a) * 18 * r);
    if (k % 5 === 0) {
      // a dead leaf blown in through the automatic door
      p.rect(lx, ly, 2, 1, P.woodLt);
      p.set(lx + 1, ly + 1, P.wood);
    } else if (k % 5 === 1) p.rect(lx, ly, 2, 1, P.brassOld);
    else p.rect(lx, ly, 2, 1, k % 2 ? P.concrete : P.asphalt);
  }
  // the dry bottom has cracked
  p.line(cx - 24, cy + 9, cx - 12, cy + 13, P.asphalt);
  p.line(cx - 12, cy + 13, cx - 4, cy + 19, P.asphalt);
  p.line(cx - 12, cy + 13, cx - 10, cy + 17, P.asphalt);
  p.line(cx + 14, cy + 6, cx + 24, cy + 4, P.asphalt);
  // the old water line, a stain ring just under the rim
  p.ring(cx, cy + 2, 37, 21, P.concrete);
  // the outer side face shading (lit left)
  for (let x = 0; x < W; x++)
    for (let y = cy; y < cy + 33; y++) {
      if (p.get(x, y) >>> 24 === 0) continue;
      const dx = (x + 0.5 - cx) / 46;
      const dy = (y + 0.5 - cy) / 29;
      if (dx * dx + dy * dy > 1 && x > cx + 10) p.set(x, y, P.asphalt);
    }
  // the pedestal and the stone child holding up a bell
  const px = cx;
  const py = cy + 2;
  p.ellipse(px, py + 1, 9, 5, P.asphalt);
  p.ellipse(px, py - 1, 9, 5, P.concrete);
  p.rect(px - 7, py - 9, 14, 8, P.concrete);
  p.vline(px - 7, py - 9, py - 2, P.concreteLt);
  p.vline(px + 6, py - 9, py - 2, P.steel);
  p.ellipse(px, py - 9, 7, 3, P.concreteLt);
  // child in dark weathered bronze (reads against the sunlit basin): legs,
  // shorts, shirt, head tilted up, arms raised with a bell; verdigris streaks
  const by = py - 11;
  // silhouette outline first (1px darker all round)
  p.rect(px - 4, by - 7, 4, 8, P.ink);
  p.rect(px, by - 7, 4, 8, P.ink);
  p.rect(px - 5, by - 18, 10, 13, P.ink);
  p.ellipse(px, by - 21, 5, 5, P.ink);
  p.line(px - 5, by - 16, px - 7, by - 30, P.ink);
  p.line(px - 4, by - 16, px - 6, by - 30, P.ink);
  p.line(px + 4, by - 16, px + 6, by - 30, P.ink);
  p.line(px + 3, by - 16, px + 5, by - 30, P.ink);
  // body
  p.rect(px - 3, by - 6, 2, 6, P.wood);
  p.rect(px + 1, by - 6, 2, 6, P.woodDark);
  p.rect(px - 4, by - 10, 8, 4, P.wood);
  p.rect(px - 4, by - 17, 8, 7, P.wood);
  p.vline(px - 4, by - 17, by - 7, P.brassOld);
  p.vline(px + 2, by - 17, by - 7, P.woodDark);
  p.vline(px + 3, by - 17, by - 7, P.woodDark);
  p.hline(px - 4, px + 3, by - 10, P.woodDark);
  p.ellipse(px, by - 21, 4, 4, P.wood);
  p.set(px - 2, by - 23, P.brassOld);
  p.set(px - 1, by - 24, P.brass);
  p.set(px + 2, by - 20, P.woodDark);
  p.set(px + 3, by - 21, P.woodDark);
  p.hline(px - 2, px + 1, by - 19, P.woodDark);
  // arms up
  p.line(px - 4, by - 16, px - 6, by - 29, P.brassOld);
  p.line(px + 3, by - 16, px + 5, by - 29, P.woodDark);
  // verdigris: rain has run down from the bell for years
  p.vline(px - 1, by - 17, by - 12, P.leafShade);
  p.set(px - 1, by - 11, P.leafDeep);
  p.vline(px + 1, by - 6, by - 3, P.leafShade);
  p.set(px - 3, by - 22, P.leafShade);
  // the bell (weathered bronze with a green patina), held up above the head
  const bb = by - 33;
  p.ellipse(px, bb, 6, 5, P.ink);
  p.rect(px - 7, bb, 15, 5, P.ink);
  p.ellipse(px, bb, 5, 4, P.brassOld);
  p.rect(px - 6, bb, 13, 4, P.brassOld);
  p.hline(px - 7, px + 7, bb + 4, P.wood);
  p.set(px - 3, bb - 2, P.brass);
  p.set(px - 4, bb, P.brass);
  p.set(px - 3, bb - 1, P.goldPale);
  p.set(px + 3, bb + 1, P.leafDeep);
  p.set(px + 2, bb - 1, P.leafDeep);
  p.set(px + 4, bb + 2, P.leafShade);
  p.set(px, bb + 5, P.woodDark);
  // hands on the rim
  p.set(px - 6, bb + 4, P.brassOld);
  p.set(px + 6, bb + 4, P.woodDark);
  finish(p, { soft: true });
  const img = p.toCanvas();
  const a = stand(img, { cx: 48, base, foot: base - 1, shadow: 0, contact: 0 });
  // the skylight's patch lands on the basin's centre — the brightest spot of the hall
  a.glow = (g: Gfx, x: number, y: number, env: PropEnv) => {
    // (in front of the pedestal: the statue itself stays a dark silhouette)
    skyPatch(g, x + a.ox + 18, y + a.oy + top + 36, 50, 18, env, 0.26);
  };
  a.light = (g: Gfx, x: number, y: number, env: PropEnv) => {
    lightPool(g, x + a.ox + 48, y + a.oy + top + 32, 48, 30, P.sky, 0.35 * (1 - env.grade.night));
  };
  a.over = (g: Gfx, x: number, y: number, env: PropEnv) => {
    // fushigi_10: the 10-yen coin at the bottom (10,8) glints; gone once stamped
    if (env.flag('flag_fushigi_10')) return;
    const ox = x + a.ox;
    const oy = y + a.oy;
    const tx = ox + 40;
    const ty = oy + top + 42;
    g.rect(tx, ty, 2, 2, P.brass);
    g.rect(tx, ty, 1, 1, P.goldPale);
    const k = Math.floor(env.t / 140) % 14;
    if (k === 0 || k === 1) {
      g.rect(tx - 1, ty, 1, 1, P.glint);
      g.rect(tx + 2, ty + 1, 1, 1, P.glint);
      g.rect(tx + 1, ty - 1, 1, 1, P.glint);
    }
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
      if (y < 14 && ((x + y) & 1) === 0 && y < 8) c = P.steel;
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
    p.rect(3, 24, 11, 6, P.red);
    scribble(p, 4, 25, 2, P.white, 7, 3);
  } else if (v === 4) {
    // 『セルフサービス』 with a cup
    p.rect(3, 22, 12, 10, P.aqua);
    p.rect(6, 24, 5, 5, P.white);
    p.vline(11, 25, 27, P.white);
    p.hline(4, 13, 30, P.navy);
  } else {
    arrowSign(p, 2, 22, 14, -1, 1, 9);
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

// ---------------------------------------------------------------- the gacha corner (16–19, 3–4): 8 machines

registerProp('mall_gacha_row', () => {
  const p = pc(64, 48);
  const bases = [P.red, P.blue, P.gold, P.leafDeep, P.crimson, P.navy, P.sun, P.aqua];
  const machine = (x: number, y: number, k: number, tag: 'broken' | 'rest') => {
    const c = bases[k];
    // cabinet
    p.rect(x, y + 12, 14, 12, c);
    p.hline(x, x + 13, y + 12, lt(c));
    p.vline(x + 13, y + 12, y + 23, dk(c));
    p.hline(x, x + 13, y + 23, dk(c, 2));
    // coin handle
    p.ellipse(x + 5, y + 17, 2.5, 2.5, P.white);
    p.hline(x + 3, x + 7, y + 17, P.steel);
    p.rect(x + 9, y + 15, 3, 2, P.charcoal);
    p.rect(x + 9, y + 20, 3, 2, P.ink);
    // clear capsule box with capsules
    p.rect(x + 1, y + 1, 12, 11, P.aqua);
    p.hline(x + 1, x + 12, y + 1, P.white);
    for (let i = 0; i < 9; i++) {
      const hh = ihash(i, k, 701);
      const cx2 = x + 2 + (hh % 9);
      const cy2 = y + 4 + ((hh >>> 4) % 7);
      const cc = [P.red, P.gold, P.leafYoung, P.crimson, P.blue, P.white][(hh >>> 8) % 6];
      p.rect(cx2, cy2, 2, 2, cc);
      p.set(cx2, cy2, lt(cc));
    }
    p.vline(x + 1, y + 1, y + 11, P.white);
    p.rect(x, y, 14, 1, P.steel);
    // title card
    p.rect(x + 2, y + 13, 9, 2, P.paper);
    // tag
    if (tag === 'broken') {
      p.rect(x + 3, y + 6, 8, 5, P.white);
      p.strokeRect(x + 3, y + 6, 8, 5, P.verm);
      p.hline(x + 5, x + 8, y + 8, P.verm);
    } else {
      p.rect(x + 3, y + 6, 8, 5, P.white);
      p.strokeRect(x + 3, y + 6, 8, 5, P.blue);
      p.hline(x + 5, x + 8, y + 8, P.navy);
    }
  };
  for (let k = 0; k < 4; k++) machine(k * 16 + 1, 0, k, 'broken');
  for (let k = 0; k < 4; k++) machine(k * 16 + 1, 16, k + 4, k === 1 ? 'rest' : 'broken');
  finish(p, { soft: true });
  const a = stand(p.toCanvas(), { cx: 32, base: 32, foot: 31, shadow: 0, contact: 0 });
  a.glow = (g: Gfx, x: number, y: number, env: PropEnv) => {
    // 『休憩中』's little lamp, the only one still lit
    const on = Math.floor(env.t / 800) % 2;
    g.rect(x + a.ox + 17 + 10, y + a.oy + 16 + 15, 1, 1, on ? P.leafLt : P.leaf, 0.9);
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

registerProp('mall_info_counter', () =>
  prop(64, 30, (p) => {
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
    scribble(p, 31, 24, 2, P.crimson, 21, 3);
    castRight(p, 26, 23, 14, 5, 1);
  }, { cx: 32, base: 16, contact: 0, shadow: 0 }),
);

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

// ---------------------------------------------------------------- hanging signs (foreground)

function hangingSign(w: number, paint: (p: PixelCanvas) => void, ox: number, oy: number): PropArt {
  const p = pc(w, 24);
  p.vline(3, 0, 12, P.asphalt);
  p.vline(w - 4, 0, 12, P.asphalt);
  paint(p);
  const img = p.toCanvas();
  return { ox, oy, w, h: 24, foot: 0, img: () => null, fg: [{ ox, oy, img: () => img }] } as PropArt;
}

registerProp('mall_escalator_sign', () =>
  hangingSign(34, (p) => {
    p.rect(0, 12, 34, 11, P.white);
    p.hline(0, 33, 12, P.glint);
    p.hline(0, 33, 22, P.steel);
    p.rect(0, 12, 3, 11, P.leafDeep);
    // an escalator pictogram, a stroke of text and a hearty arrow →
    p.line(5, 20, 11, 14, P.navy);
    p.line(5, 21, 12, 14, P.navy);
    p.set(6, 17, P.navy);
    scribble(p, 14, 14, 2, P.navy, 3, 4);
    for (let i = 0; i < 6; i++) p.set(24 + i, 18, P.verm);
    p.set(28, 16, P.verm);
    p.set(28, 20, P.verm);
    p.set(29, 17, P.verm);
    p.set(29, 19, P.verm);
    finish(p, { soft: true, rim: false });
  }, -18, -48),
);

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
  return hangingSign(40, (p) => {
    p.rect(0, 12, 40, 10, P.navy);
    p.hline(0, 39, 12, P.blue);
    p.hline(0, 39, 21, P.nightShade);
    // white plate: the pictogram of where it leads and a big arrow
    p.rect(2, 13, 36, 8, P.white);
    p.hline(2, 37, 13, P.glint);
    const dir = right ? 1 : -1;
    pictogram(p, to, right ? 5 : 26, 13, P.navy);
    const ax = right ? 22 : 6;
    for (let i = 0; i < 10; i++) p.set(ax + i, 17, P.verm);
    const tip = right ? ax + 9 : ax;
    for (let k = 1; k <= 3; k++) {
      p.set(tip - dir * k, 17 - k, P.verm);
      p.set(tip - dir * k, 17 + k, P.verm);
    }
    finish(p, { soft: true, rim: false });
  }, right ? -24 : 0, -18);
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

void printLines;
void fontTextSmall;
void screenPool;
