// 喫茶 初日の出 (map_cafe) and 山吹酒店 (map_sake) — 30_level_art 4.11 / 4.12.
//
// 喫茶 初日の出: dark boards, cream stucco over dark wood panels, amber lamps;
// the counter (the siphon bubbling — held at the top in stage 1, running
// down in stage 2 — and the menu stand), the chest freezer and the cup
// shelf behind it, the record player (turning; backwards in stage 2), the
// painting of 初日の出 (its clock at 5), the pink phone, the 夕顔 in its pot
// (buds swelling / held / closing), the regular's window seat with the
// paper, the table game, a table for two with a cream soda, and the
// ceiling fan turning over it all.
//
// 山吹酒店: pale quarry tiles, plaster over a wood wainscot; the wall of
// 一升瓶, the glass fridge (its light, the drops on the glass), the island
// of snacks and 星見台 トマトジュース, the うちわ and the brewery calendar,
// the register counter with its desk fan, the beer crates (the black cat
// asleep on top is a field character) and the crates of empties.

import type { Gfx } from '../../engine/gfx';
import { flag } from '../../game/state';
import { ihash, valueNoise } from '../tiles/noise';
import { P } from '../tiles/palette';
import { framed, pc, prop } from './ifurn';
import { screenPool, warmPool } from './ishell';
import { castRight, finish, lt } from './kit';
import { mkFrames, stand } from './pkit';
import { registerProp } from './registry';
import { fontTextSmall, printLines } from './text';
import type { PropArt, PropEnv } from './types';
import { plasterWall, roomShell, shopTiles, spin, stageTime, woodFloor } from './int_north_kit';

// ================================================================ 喫茶 初日の出

function cafeWall(seed: number): (x: number, y: number) => string {
  return (x, y) => {
    if (y < 17) return valueNoise(x / 5, y / 4, seed) > 0.78 ? '#FBF3DC' : '#EADCB6';
    if (y === 17) return P.woodLt;
    if (y === 18) return P.woodDark;
    if (x % 12 === 11) return '#3A2418';
    if (x % 12 === 0) return P.wood;
    return y % 7 === 0 ? P.wood : '#6E4630';
  };
}

registerProp('in_cf_shell', () =>
  roomShell({
    map: 'map_cafe',
    floor: (x, y) => woodFloor(8701, 'dark')(x, y),
    wall: cafeWall(8703),
    trim: P.woodDark,
    base: '#3A2418',
    baseH: 2,
    door: 'glass',
    ext: {
      town: [48, 21],
      bld: [46, 51, 16],
      skin: [P.woodLt, P.wood, P.woodDark],
      roof: 'tin',
      seed: 8705,
      props: [
        { id: 'obj_cafe_sample', tx: 46, ty: 21 },
        { id: 'obj_cafe_board', tx: 47, ty: 22 },
      ],
    },
    lamps: [
      [48, 56, 30, 16, P.sky],
      [136, 72, 34, 18, P.sky],
    ],
    deco(p) {
      // the painting of 初日の出 (7–8, 0–1; ★2026-09-30 喫茶 夕顔→喫茶 初日の出): the first sun of
      // the year coming up behind a mountain ridge, rays on a dawn sky, a clock at 5
      const [ix, iy, iw, ih] = framed(p, 114, 3, 28, 17, P.brass);
      for (let y = iy; y < iy + ih; y++) for (let x = ix; x < ix + iw; x++) p.set(x, y, y < iy + 5 ? P.sky : y < iy + 10 ? P.sun : P.shade);
      const sx = ix + 12;
      const sy = iy + 10;
      for (const [dx, dy] of [[-7, -3], [-4, -6], [0, -7], [4, -6], [7, -3]] as [number, number][]) p.line(sx + Math.round(dx / 2), sy + Math.round(dy / 2), sx + dx, sy + dy, P.goldPale);
      p.ellipse(sx, sy, 3, 3, P.goldPale);
      p.ellipse(sx, sy, 2, 2, P.white);
      // the mountain ridge in front of the sun (dark), a lower one behind it
      for (let x = ix; x < ix + iw; x++) {
        const h1 = 3 + Math.round(2 * Math.sin((x - ix) / 3.1)) + ((x - ix) % 7 === 3 ? 1 : 0);
        const h2 = 5 + Math.round(3 * Math.cos((x - ix) / 4.3));
        for (let y = iy + ih - h2; y < iy + ih; y++) p.set(x, y, P.leafShade);
        for (let y = iy + ih - h1; y < iy + ih; y++) p.set(x, y, P.ink);
      }
      p.ellipse(137, 6, 2, 2, P.paper);
      p.set(137, 6, P.ink);
      p.set(137, 7, P.ink);
      // amber wall lamps (between the panels)
      for (const lx of [36, 164]) {
        p.rect(lx, 6, 5, 6, P.brass);
        p.rect(lx + 1, 7, 3, 4, P.goldPale);
        p.hline(lx, lx + 4, 12, P.brassOld);
      }
      // a menu board behind the counter (3–5, 0)
      p.rect(52, 4, 30, 14, P.charcoal);
      p.strokeRect(52, 4, 30, 14, P.woodDark);
      printLines(p, 55, 6, 24, 4, P.white, 871);
      p.set(78, 7, P.gold);
    },
  }),
);

// the chest freezer (1,2) and the cup shelf (2,2), behind the counter
registerProp('in_cf_back', () =>
  prop(32, 34, (p) => {
    // freezer: white chest with a lid handle and a sticker
    p.rect(1, 18, 14, 16, P.white);
    p.hline(1, 14, 18, '#FFFFFF');
    p.rect(1, 17, 14, 2, P.concrete);
    p.hline(3, 12, 20, P.concrete);
    p.rect(6, 22, 4, 2, P.aqua);
    p.vline(14, 19, 33, P.concrete);
    p.hline(1, 14, 33, P.steel);
    // the cup shelf: cups, bean jars
    p.rect(17, 2, 14, 32, P.wood);
    p.vline(17, 2, 33, P.woodLt);
    for (const sy of [5, 14, 23]) {
      p.rect(18, sy, 12, 7, '#3A2418');
      p.hline(18, 29, sy + 7, P.woodDark);
    }
    for (let i = 0; i < 3; i++) {
      p.rect(19 + i * 4, 9, 3, 3, P.white);
      p.set(22 + i * 4, 10, P.white);
    }
    for (let i = 0; i < 3; i++) {
      p.rect(19 + i * 4, 17, 3, 4, '#BDEFFA');
      p.rect(19 + i * 4, 19, 3, 2, P.woodDark);
    }
    p.rect(19, 26, 10, 4, P.maroon);
    p.hline(19, 28, 26, P.crimson);
  }, { cx: 16, base: 16, contact: 28, shadow: 0 }),
);

// the counter (1–5,3): the siphon (2) and the menu stand (4)
registerProp('in_cf_counter', () => {
  const body = prop(80, 22, (p) => {
    p.rect(1, 6, 78, 16, '#6E4630');
    p.rect(1, 4, 78, 3, P.woodLt);
    p.hline(1, 78, 4, '#DCC08A');
    p.hline(1, 78, 7, P.woodDark);
    for (let i = 6; i < 78; i += 14) p.vline(i, 8, 21, P.woodDark);
    p.hline(1, 78, 21, '#3A2418');
    // siphon stand base (x 16–31)
    p.rect(20, 1, 8, 3, P.steel);
    p.hline(20, 27, 1, P.concreteLt);
    p.rect(22, 3, 2, 1, P.red);
    // the menu stand (x 64–79 is 5; 48–63 is 4)
    p.rect(52, 0, 7, 5, P.paper);
    p.hline(52, 58, 0, P.leafShade);
    p.hline(53, 57, 2, P.steel);
    // sugar pot and a spoon glass
    p.rect(36, 1, 4, 3, P.white);
    p.set(37, 0, P.white);
    p.rect(66, 1, 2, 3, P.aqua);
  }, { cx: 40, base: 16, contact: 72, shadow: 0 });
  // the siphon's glass: bubbling up (0), held at the top (1), draining forever (2)
  body.over = (g: Gfx, x: number, y: number, env: PropEnv) => {
    const bx = x + body.ox + 20;
    const by = y + body.oy;
    // lower bulb
    g.rect(bx + 1, by - 5, 6, 5, '#5A3A2A', 0.95);
    g.rect(bx + 2, by - 6, 4, 1, '#5A3A2A', 0.95);
    // tube and upper vessel
    g.rect(bx + 3, by - 12, 2, 6, P.aqua, 0.7);
    const fill = env.stage === 1 ? 1 : env.stage === 2 ? 1 - ((env.t / 1800) % 1) : ((env.mt / 1800) % 1);
    g.rect(bx + 1, by - 18, 6, 6, P.aqua, 0.5);
    g.rect(bx + 1, by - 12 - Math.round(fill * 6), 6, Math.round(fill * 6), '#6E4630', 0.95);
    g.rect(bx + 1, by - 18, 1, 6, P.white, 0.6);
    // bubbles
    for (let i = 0; i < 3; i++) {
      const k = env.stage === 1 ? i : ((env.mt / 120 + i * 3) % 6);
      g.rect(bx + 2 + ((i * 2) % 4), by - 2 - Math.round(k % 4), 1, 1, P.white, 0.7);
    }
    // the little burner flame
    if (env.stage !== 1) g.rect(bx + 3, by + 1, 2, 1, Math.floor(env.t / 120) % 2 ? P.blue : P.aqua, 0.9);
  };
  return body;
});

// the record player on its cabinet (6,2): the disc turns (backwards in stage 2)
registerProp('in_cf_record', () => {
  const frames = mkFrames(4, 16, 28, (p, k) => {
    p.rect(1, 10, 14, 18, P.woodDark);
    p.hline(1, 14, 10, P.wood);
    p.rect(3, 13, 10, 12, '#3A2418');
    for (let i = 0; i < 4; i++) p.rect(4 + i * 2, 15, 1, 8, P.wood);
    p.rect(0, 5, 16, 5, P.wood);
    p.hline(0, 15, 5, P.woodLt);
    p.ellipse(7, 7, 5, 2, P.ink);
    p.ellipse(7, 7, 1.5, 0.8, P.red);
    // a glint travelling round the grooves
    const gx = [[4, 7], [7, 6], [10, 7], [7, 8]][k];
    p.set(gx[0], gx[1], P.asphalt);
    p.line(13, 5, 10, 7, P.concreteLt);
    // a record sleeve leaning
    p.rect(10, 0, 5, 5, P.sun);
    p.set(12, 2, P.white);
  }, (p) => finish(p, { soft: true }));
  const a = stand(frames[0], { base: 16, contact: 12, shadow: 0 });
  a.img = (env: PropEnv) => frames[Math.floor(spin(env, 600) * 4) % 4];
  return a;
});

// the pink phone on its little table (9,2)
registerProp('in_cf_phone', () =>
  prop(16, 26, (p) => {
    p.rect(2, 14, 12, 3, P.woodLt);
    p.hline(2, 13, 14, '#DCC08A');
    p.rect(3, 17, 2, 9, P.wood);
    p.rect(11, 17, 2, 9, P.wood);
    p.rect(3, 6, 10, 8, P.crimson);
    p.hline(3, 12, 6, P.peach);
    p.rect(4, 3, 8, 3, P.crimson);
    p.hline(4, 11, 3, '#F59AB0');
    p.ellipse(8, 10, 2.5, 2.5, P.white);
    p.set(8, 10, P.crimson);
    p.rect(10, 7, 2, 1, P.charcoal);
  }, { base: 16, contact: 12, shadow: 0 }),
);

// the 夕顔 in its pot (10,2): a trellis, leaves, buds that swell / hold / close
registerProp('in_cf_plant', () => {
  const frames = mkFrames(3, 16, 36, (p, k) => {
    p.rect(4, 28, 8, 8, P.skin4);
    p.hline(4, 11, 28, P.skin3);
    p.hline(5, 10, 35, P.wood);
    for (const x of [3, 8, 12]) p.vline(x, 2, 28, P.woodLt);
    for (const y of [6, 14, 22]) p.hline(3, 12, y, P.woodLt);
    for (let i = 0; i < 14; i++) {
      const h = ihash(i, 7, 881);
      p.rect(2 + (h % 11), 3 + ((h >> 4) % 24), 3, 2, (h >> 8) % 2 ? P.leaf : P.leafDeep);
    }
    // buds: long and furled (0), about to open (1), closing tighter (2)
    for (const [bx, by] of [[5, 5], [11, 12], [6, 19]] as [number, number][]) {
      if (k === 1) {
        p.ellipse(bx, by, 2, 1.5, P.white);
        p.set(bx, by, P.goldPale);
      } else {
        p.rect(bx, by - (k === 0 ? 2 : 1), 1, k === 0 ? 3 : 2, P.white);
        p.set(bx, by + 1, P.leafShade);
      }
    }
  }, (p) => finish(p, { soft: true }));
  const a = stand(frames[0], { base: 16, contact: 10, shadow: 0 });
  a.img = (env: PropEnv) => frames[env.stage === 1 ? 1 : env.stage >= 2 ? 2 : 0];
  return a;
});

// the regular's window seat (8–9,4): paper and a coffee (in stage 2 it creeps back up)
registerProp('in_cf_booth', () => {
  // frames: 0 the regular's paper and half-drunk cup (stages 0–1); 1 stage 2 with ぶーさん's
  // body at the seat (★2026-09-30, 02 #71: he holds the paper up himself, the cup brimming);
  // 2 stage 2 after なんばるわん took him to the park (the cup drained, the paper folded)
  const frames = mkFrames(3, 32, 24, (p, k) => {
    // two chairs (backs) and the table
    for (const cx of [3, 26]) {
      p.rect(cx, 4, 4, 14, '#8A2E3A');
      p.vline(cx, 4, 17, P.crimson);
      p.rect(cx - 1, 18, 6, 2, P.woodDark);
    }
    p.ellipse(16, 12, 10, 4, P.woodDark);
    p.ellipse(16, 11, 10, 3.5, P.wood);
    p.rect(15, 14, 2, 8, P.woodDark);
    p.hline(11, 21, 22, P.woodDark);
    // the paper and the cup
    if (k === 0) {
      p.rect(9, 9, 8, 4, P.paper);
      printLines(p, 10, 10, 6, 2, P.steel, 891);
    } else if (k === 2) {
      // folded neatly in four where he sat
      p.rect(18, 9, 5, 3, P.paper);
      p.hline(18, 22, 9, P.white);
      p.set(20, 10, P.steel);
      p.set(21, 11, P.steel);
    }
    // the cup: by the paper (0); moved to the middle of the table, clear of the paper he
    // holds up (1: brimming; 2: drained)
    const cx = k === 0 ? 20 : 13;
    p.ellipse(cx, 10, 2, 1.2, P.white);
    if (k < 2) p.rect(cx - 1, 10 - k, 3, 1 + k, '#5A3A2A');
    else p.hline(cx - 1, cx + 1, 10, P.concrete);
    p.set(cx + 2, 10, P.white);
  }, (p) => finish(p, { soft: true }));
  const a = stand(frames[0], { cx: 16, base: 16, contact: 26, shadow: 0 });
  a.img = (env: PropEnv) => frames[env.stage >= 2 ? (flag('flag_bu_left') ? 2 : 1) : 0];
  return a;
});

// the table game (2–3,6): a glass-topped cabinet, invaders marching (toward the sunset in stage 2)
registerProp('in_cf_game', () => {
  const frames = mkFrames(2, 32, 22, (p, k) => {
    p.rect(2, 6, 28, 12, P.charcoal);
    p.rect(3, 5, 26, 2, P.asphalt);
    p.rect(5, 7, 22, 8, P.ink);
    for (let r = 0; r < 2; r++)
      for (let c = 0; c < 5; c++) {
        const x = 7 + c * 4 + k;
        const y = 8 + r * 3;
        p.rect(x, y, 2, 1, r ? P.leafYoung : P.aqua);
        p.set(x + (k ? 0 : 1), y + 1, r ? P.leafYoung : P.aqua);
      }
    p.rect(15, 13, 2, 1, P.gold);
    p.hline(5, 26, 15, P.asphalt);
    p.rect(4, 18, 3, 4, P.charcoal);
    p.rect(25, 18, 3, 4, P.charcoal);
    // the coin slot and the return tray
    p.rect(14, 16, 4, 1, P.steel);
    p.set(28, 12, P.red);
  }, (p) => finish(p, { soft: true }));
  const a = stand(frames[0], { cx: 16, base: 16, contact: 26, shadow: 0 });
  a.img = (env: PropEnv) => frames[env.stage === 1 ? 0 : Math.floor((env.stage === 2 ? env.t : env.mt) / 500) % 2];
  a.glow = (g: Gfx, x: number, y: number) => {
    screenPool(g, x + 16, y + a.oy + 11, 12, 5, P.aqua, 0.18);
  };
  return a;
});

// a table for two (8–9,6): a cream soda, its cherry
registerProp('in_cf_table', () =>
  prop(32, 22, (p) => {
    for (const cx of [3, 26]) {
      p.rect(cx, 6, 4, 12, '#8A2E3A');
      p.vline(cx, 6, 17, P.crimson);
      p.rect(cx - 1, 18, 6, 2, P.woodDark);
    }
    p.ellipse(16, 13, 9, 3.5, P.woodDark);
    p.ellipse(16, 12, 9, 3, P.wood);
    p.rect(15, 15, 2, 6, P.woodDark);
    p.hline(11, 21, 21, P.woodDark);
    // cream soda: green glass, white ice cream, a cherry
    p.rect(14, 5, 4, 6, P.leafYoung);
    p.vline(14, 5, 10, P.leafLt);
    p.rect(14, 3, 4, 2, P.white);
    p.set(16, 2, P.red);
    p.line(18, 1, 19, 5, P.red);
  }, { cx: 16, base: 16, contact: 26, shadow: 0 }),
);

// the ceiling fan over the room (5,4): hung in the foreground, four blades turning
registerProp('in_cf_fan', () => {
  const frames = mkFrames(3, 44, 22, (p, k) => {
    // the rod up into the dark above the room
    p.vline(22, 0, 11, P.woodDark);
    p.vline(23, 0, 11, P.wood);
    for (let b = 0; b < 4; b++) {
      const a = ((b / 4) + k / 12) * Math.PI * 2;
      const ex = Math.round(22 + Math.cos(a) * 19);
      const ey = Math.round(14 + Math.sin(a) * 5);
      p.line(22, 13, ex, ey - 1, P.woodDark);
      p.line(22, 14, ex, ey, '#DCC08A');
      p.line(22, 15, ex, ey + 1, P.woodLt);
      p.line(22, 16, ex, ey + 2, P.woodDark);
    }
    p.ellipse(22, 13, 4, 2.5, P.brass);
    p.hline(19, 25, 12, P.goldPale);
    p.rect(21, 16, 4, 3, P.goldPale);
    p.hline(21, 24, 18, P.brass);
  }, (p) => finish(p, { soft: true, rim: false }));
  const oy = -34;
  const a: PropArt = {
    ox: -14,
    oy,
    w: 44,
    h: 22,
    foot: 0,
    img: () => null,
    fg: [{ ox: -14, oy, img: (env: PropEnv) => frames[Math.floor(spin(env, 240) * 3) % 3] }],
    glow(g: Gfx, x: number, y: number) {
      warmPool(g, x + 9, y + oy + 18, 5, 3, P.sky, 0.4);
    },
  };
  return a;
});

// ================================================================ 山吹酒店

registerProp('in_yb_shell', () =>
  roomShell({
    map: 'map_sake',
    floor: (x, y) => shopTiles(8801)(x, y),
    wall: plasterWall(8803, P.concreteLt, 20, P.wood),
    trim: P.woodLt,
    base: P.woodDark,
    baseH: 2,
    door: 'glassPair',
    ext: {
      town: [53, 21],
      bld: [51, 56, 16],
      skin: [P.woodLt, P.wood, P.woodDark],
      roof: 'kawara',
      seed: 8805,
      props: [
        { id: 'obj_beer_crate', tx: 51, ty: 22 },
        { id: 'obj_hoshimi_yasai', tx: 53, ty: 22 },
      ],
    },
    tube: 1,
    lamps: [[96, 64, 64, 24, P.white]],
    deco(p) {
      // the うちわ (6, 0–1): a round fan, faded, ユウナリ's bell mark
      // (★2026-09-29: no face)
      p.ellipse(103.5, 11.5, 6, 6, '#F6D98A');
      p.ring(103.5, 11.5, 6, 6, P.brassOld);
      p.hline(103, 104, 7, P.brassOld);
      p.ellipse(103.5, 11, 3, 3, P.gold);
      p.rect(100, 11, 8, 3, P.gold);
      p.hline(99, 108, 14, P.brassOld);
      p.vline(101, 10, 12, '#F6D98A');
      p.vline(103, 18, 26, P.woodLt);
      p.vline(104, 18, 26, P.wood);
      // the brewery calendar (7, 0–1)
      p.rect(114, 4, 12, 20, P.paper);
      p.rect(114, 4, 12, 8, P.navy);
      p.set(119, 6, P.white);
      p.set(120, 7, P.white);
      p.hline(116, 123, 10, P.gold);
      for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) p.set(116 + c * 3, 14 + r * 2, P.steel);
      castRight(p, 114, 4, 12, 20, 1);
      // the price strip along the wall top
      for (let i = 0; i < 5; i++) {
        p.rect(20 + i * 14, 3, 10, 4, i % 2 ? P.paper : P.goldPale);
        p.hline(21 + i * 14, 27 + i * 14, 5, P.verm);
      }
    },
  }),
);

// the wall of 一升瓶 (1–5,2): three tiers, green and brown bottles, white labels
registerProp('in_yb_shelf', () =>
  prop(80, 46, (p) => {
    p.rect(1, 2, 78, 44, P.wood);
    p.hline(1, 78, 2, P.woodLt);
    p.vline(1, 2, 45, P.woodLt);
    p.vline(78, 3, 45, P.woodDark);
    for (const [ti, sy] of [[0, 4], [1, 18], [2, 32]] as [number, number][]) {
      p.rect(2, sy, 76, 12, '#3A2418');
      for (let i = 0; i < 12; i++) {
        const x = 3 + i * 6 + (ti % 2);
        const h = ihash(i, ti, 901);
        const c = h % 3 === 0 ? P.leafShade : h % 3 === 1 ? P.woodDark : '#1F4E36';
        p.rect(x + 1, sy + 1, 2, 3, c);
        p.rect(x, sy + 4, 4, 8, c);
        p.vline(x, sy + 4, sy + 11, lt(c));
        p.rect(x, sy + 7, 4, 3, h % 5 === 0 ? P.goldPale : P.paper);
        p.set(x + 1, sy + 8, h % 4 === 0 ? P.verm : P.ink);
      }
      p.hline(2, 77, sy + 12, P.woodDark);
      p.hline(2, 77, sy + 13, P.woodLt);
    }
    // 『星見台』: one label with a star
    p.set(40, 25, P.gold);
    p.set(39, 25, P.gold);
  }, { cx: 40, base: 16, contact: 72, shadow: 0 }),
);

// the glass fridge (8–10,2): its light, bottles; drops on the glass (held in 1, climbing in 2)
registerProp('in_yb_fridge', () => {
  const a = prop(48, 42, (p) => {
    p.rect(1, 2, 46, 40, P.concreteLt);
    p.hline(1, 46, 2, P.white);
    p.rect(1, 2, 46, 5, P.red);
    fontTextSmall(p, 'ビール', 16, 2, P.white);
    for (const dx of [3, 18, 33]) {
      p.rect(dx, 8, 13, 31, '#BDEFFA');
      for (const sy of [11, 20, 29]) {
        for (let i = 0; i < 4; i++) {
          const c = sy === 11 ? P.woodDark : sy === 20 ? P.sun : '#4AA8E0';
          p.rect(dx + 1 + i * 3, sy, 2, 7, c);
          p.set(dx + 1 + i * 3, sy, lt(c));
        }
        p.hline(dx, dx + 12, sy + 7, P.steel);
      }
      p.vline(dx + 12, 8, 38, P.steel);
      p.set(dx + 11, 23, P.charcoal);
    }
    p.hline(1, 46, 41, P.steel);
  }, { cx: 24, base: 16, contact: 40, shadow: 0 });
  a.over = (g: Gfx, x: number, y: number, env: PropEnv) => {
    for (let i = 0; i < 6; i++) {
      const h = ihash(i, 2, 911);
      const k = env.stage === 1 ? (h % 20) : env.stage === 2 ? 20 - ((env.t / 90 + h) % 20) : ((env.mt / 90 + h) % 20);
      g.rect(x + a.ox + 5 + (h % 38), Math.round(y + a.oy + 10 + k), 1, 2, P.white, 0.55);
    }
  };
  a.glow = (g: Gfx, x: number, y: number, env: PropEnv) => {
    const fl = env.stage === 1 ? 0.2 : 0.2 + (Math.floor(env.t / 2300) % 7 === 0 ? -0.1 : 0);
    screenPool(g, x + 24, y + a.oy + 24, 22, 14, '#BDEFFA', fl);
  };
  return a;
});

// the island (2–3,4): snacks and juice, 『星見台 トマトジュース』 at the front
registerProp('in_yb_display', () =>
  prop(32, 20, (p) => {
    p.rect(1, 8, 30, 12, P.woodLt);
    p.hline(1, 30, 8, '#DCC08A');
    p.vline(30, 9, 19, P.wood);
    p.hline(1, 30, 19, P.wood);
    const bags = [P.red, P.gold, P.leaf, P.blue, P.crimson];
    for (let i = 0; i < 5; i++) {
      p.rect(3 + i * 4, 3, 3, 5, bags[i]);
      p.set(3 + i * 4, 3, lt(bags[i]));
    }
    // tomato juice bottles (red with white caps)
    for (let i = 0; i < 3; i++) {
      p.rect(24 + (i % 2) * 3, 2 + i, 2, 6 - i, P.red);
      p.set(24 + (i % 2) * 3, 1 + i, P.white);
    }
    p.rect(22, 11, 8, 4, P.paper);
    p.hline(23, 28, 12, P.verm);
    p.set(26, 14, P.leaf);
  }, { cx: 16, base: 16, contact: 26, shadow: 0 }),
);

// the register counter (8–9,4): the old register and the desk fan
registerProp('in_yb_counter', () => {
  const blades = mkFrames(3, 10, 10, (p, k) => {
    p.ellipse(5, 5, 4.5, 4.5, P.white);
    p.ring(5, 5, 4.5, 4.5, P.concrete);
    const bl = [[[3, 3], [7, 7]], [[7, 3], [3, 7]], [[5, 2], [5, 8]]][k];
    for (const [bx, by] of bl) p.set(bx, by, P.aqua);
    p.set(5, 5, P.steel);
  });
  const a = prop(32, 22, (p) => {
    p.rect(1, 8, 30, 14, P.wood);
    p.rect(1, 6, 30, 3, P.woodLt);
    p.hline(1, 30, 6, '#DCC08A');
    p.hline(1, 30, 21, P.woodDark);
    for (let i = 5; i < 30; i += 8) p.vline(i, 10, 20, P.woodDark);
    // the register (left)
    p.rect(3, 0, 12, 7, P.concrete);
    p.hline(3, 14, 0, P.concreteLt);
    p.rect(4, 1, 6, 2, P.charcoal);
    p.set(5, 1, P.leafYoung);
    for (let i = 0; i < 4; i++) p.set(5 + i * 2, 4, P.white);
    // the fan's stand (right)
    p.rect(24, 4, 2, 3, P.concrete);
    p.rect(21, 6, 8, 1, P.white);
  }, { cx: 16, base: 16, contact: 28, shadow: 0 });
  a.over = (g: Gfx, x: number, y: number, env: PropEnv) => {
    const img = blades[Math.floor(spin(env, 150) * 3) % 3];
    g.img(img, x + a.ox + 20, y + a.oy - 6);
  };
  return a;
});

// stacked beer crates (1–2,6): yellow and red plastic
registerProp('in_yb_crates', () =>
  prop(32, 26, (p) => {
    for (let k = 0; k < 3; k++) {
      const y = 18 - k * 8;
      for (const [x, c] of [[1, P.gold], [16, P.red]] as [number, string][]) {
        if (k === 2 && x === 16) continue;
        p.rect(x, y, 15, 8, c);
        p.hline(x, x + 14, y, lt(c));
        for (let i = x + 2; i < x + 14; i += 3) p.rect(i, y + 2, 2, 4, c === P.gold ? P.brassOld : P.vermShade);
        for (let i = x + 2; i < x + 14; i += 3) p.set(i, y + 1, P.woodDark);
      }
    }
    // (sorted early: the black cat asleep on top is a field character)
  }, { cx: 16, base: 16, contact: 28, shadow: 0, foot: 2 }),
);

// crates of empties (9–10,6)
registerProp('in_yb_empties', () =>
  prop(32, 18, (p) => {
    for (const x of [1, 16]) {
      p.rect(x, 8, 15, 10, P.gold);
      p.hline(x, x + 14, 8, P.goldPale);
      for (let i = 0; i < 4; i++) {
        const bx = x + 2 + i * 3;
        p.rect(bx, 2, 2, 7, P.woodDark);
        p.set(bx, 2, P.wood);
        p.set(bx, 1, P.charcoal);
      }
      p.hline(x, x + 14, 17, P.brassOld);
    }
    p.rect(20, 11, 7, 4, P.paper);
    p.hline(21, 25, 13, P.ink);
  }, { cx: 16, base: 16, contact: 28, shadow: 0 }),
);

void stageTime;
void castRight;
