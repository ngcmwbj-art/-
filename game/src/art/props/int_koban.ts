// 交番 interior (30_level_art 4.6, 9×7). An institutional little room: pale
// plaster over a wood wainscot, the traffic-safety poster whose traffic
// light smiles in all three colours, a map of the whole town (with the
// 『営業中』 sticky note still on the mall), the 『本日の落とし物』 board
// (fushigi_06), a grey locker with the white helmet, a steel desk with the
// duty diary, a radio and the 交通安全 teacup, the lost-property box, and
// the red lamp outside breathing red light in through the door.

import type { Gfx } from '../../engine/gfx';
import { PixelCanvas } from '../../engine/pixel';
import { getMapDef } from '../../world/maps';
import { fushigiDone } from '../../world/fushigi';
import { terrazzo } from '../tiles/ifloor';
import { valueNoise } from '../tiles/noise';
import { P } from '../tiles/palette';
import { cardboard, clockFace, framed, notice, pc, prop } from './ifurn';
import { depthShade, lightPool, paintShell, screenPool, screenSpill, shellProp } from './ishell';
import { castRight, finish } from './kit';
import { stand } from './pkit';
import { registerProp } from './registry';
import { fontTextSmall, printLines, scribble, tiny } from './text';
import type { PropArt, PropEnv } from './types';

// ---------------------------------------------------------------- shell

registerProp('in_kb_shell', () => {
  const rows = getMapDef('map_koban')?.rows ?? [];
  const floor = terrazzo(141);
  const sh = paintShell({
    rows,
    floor: (x, y) => floor(x, y),
    wall: (x, y) => {
      if (y <= 17) return valueNoise(x / 6, y / 4, 143) > 0.8 ? P.white : P.concreteLt;
      if (y === 18) return P.woodLt;
      if (y === 19) return P.wood;
      // wainscot boards
      if (x % 8 === 7) return P.woodDark;
      return valueNoise(Math.floor(x / 8) * 2.1, y / 6, 144) > 0.7 ? P.woodLt : P.wood;
    },
    trim: P.white,
    base: P.woodDark,
    baseH: 3,
  });
  const p = sh.p;
  trafficPoster(p, 17, 3);
  townMap(p, 34, 2);
  // ---- floor: the entrance mat 『交番』
  const dx = 64;
  const dy = 96;
  p.rect(dx - 2, dy, 20, 2, P.steel);
  p.hline(dx - 2, dx + 17, dy, P.white);
  p.rect(dx, dy + 2, 16, 8, P.shadeDeep);
  sh.glass.rect(dx + 1, dy + 3, 14, 6, '#ffffff');
  p.vline(dx - 1, dy + 2, dy + 9, P.steel);
  p.vline(dx + 16, dy + 2, dy + 9, P.asphalt);
  p.vline(dx + 8, dy + 2, dy + 9, P.steel);
  p.hline(dx - 1, dx + 16, dy + 10, P.charcoal);
  const img = p.toCanvas();
  const W = img.width;
  return shellProp({
    img,
    glass: sh.glass.toCanvas(),
    over(g: Gfx, x: number, y: number, env: PropEnv) {
      depthShade(g, x + 16, y + 32, W - 32, 64, 0.12);
      const n = env.grade.night;
      screenPool(g, x + 72, y + 64, 50, 22, P.glint, 0.14 + n * 0.1);
      // the red lamp outside: slow red breathing through the door (slower in stage 1)
      const period = env.stage === 1 ? 4000 : 2000;
      const k = Math.sin(((env.t % period) / period) * Math.PI * 2) * 0.5 + 0.5;
      screenSpill(g, x + 72, y + 96, 16, 34, 26, P.red, 0.06 + k * 0.12 + n * 0.06, true);
    },
    light(g: Gfx, x: number, y: number, env: PropEnv) {
      const n = env.grade.night;
      lightPool(g, x + 72, y + 62, 64, 40, P.white, 0.08 + n * 0.62);
    },
  });
});

/** 『交通安全週間』: a traffic light with three smiling faces. */
function trafficPoster(p: PixelCanvas, x: number, y: number): void {
  p.rect(x, y, 14, 22, P.white);
  p.rect(x, y, 14, 4, P.leafDeep);
  scribble(p, x + 1, y, 3, P.white, 5, 3);
  // the traffic light: dark body, three lamps, three smiles
  p.rect(x + 2, y + 6, 10, 5, P.charcoal);
  p.hline(x + 2, x + 11, y + 6, P.asphalt);
  const lamps = [P.leafYoung, P.gold, P.red];
  for (let k = 0; k < 3; k++) {
    const cx = x + 3 + k * 3;
    p.rect(cx, y + 7, 2, 2, lamps[k]);
    p.set(cx, y + 9, P.white);
    p.set(cx + 1, y + 9, P.white);
  }
  p.vline(x + 7, y + 11, y + 15, P.steel);
  // two kids crossing, a zebra crossing
  for (let k = 0; k < 4; k++) p.rect(x + 1 + k * 3, y + 18, 2, 2, P.steel);
  p.set(x + 4, y + 15, P.gold);
  p.vline(x + 4, y + 16, y + 17, P.blue);
  p.set(x + 9, y + 15, P.red);
  p.vline(x + 9, y + 16, y + 17, P.navy);
  p.hline(x, x + 13, y + 21, P.concrete);
  castRight(p, x, y, 14, 22, 2);
  p.set(x + 1, y + 1, P.verm);
  p.set(x + 12, y + 1, P.verm);
}

/** A little map of the town (the real layout, simplified), the mall's sticky note. */
function townMap(p: PixelCanvas, x: number, y: number): void {
  const W = 44;
  const H = 24;
  const [ix, iy, iw, ih] = framed(p, x, y, W, H, P.steel);
  p.rect(ix, iy, iw, ih, P.paper);
  // 64×44 tiles → 42×22: 1px ≈ 1.5×2 tiles
  const T = (tx: number, ty: number) => [ix + Math.round((tx / 64) * iw), iy + Math.round((ty / 44) * ih)] as const;
  const area = (x0: number, y0: number, x1: number, y1: number, c: string) => {
    const [a, b] = T(x0, y0);
    const [c2, d] = T(x1, y1);
    p.rect(a, b, Math.max(1, c2 - a), Math.max(1, d - b), c);
  };
  area(0, 0, 32, 15, P.leafYoung); // park
  area(32, 0, 58, 15, P.concrete); // parking
  area(35, 0, 58, 5, P.paperGrid); // the mall
  area(0, 16, 22, 34, P.paperGrid); // higurashi
  area(23, 16, 57, 34, P.skin2); // ginza
  area(23, 22, 56, 26, P.woodLt); // arcade
  area(0, 32, 58, 35, P.white); // kawabe road
  area(0, 36, 58, 38, P.blue); // canal
  area(0, 39, 58, 44, P.leaf); // paddies
  area(58, 0, 64, 44, P.steel); // rail line
  // roads
  const [ax] = T(19, 0);
  p.vline(ax, iy + 7, iy + 11, P.white);
  // markers: home (red), koban (blue), the mall's 『営業中』 note
  const [hx, hy] = T(4, 30);
  p.rect(hx, hy, 2, 2, P.verm);
  const [kx, ky] = T(51, 31);
  p.rect(kx, ky, 2, 2, P.navy);
  const [mx, my] = T(47, 2);
  p.rect(mx, my - 1, 6, 4, P.gold);
  p.hline(mx + 1, mx + 4, my, P.vermShade);
  p.set(mx + 5, my + 2, P.brass);
  // push pins
  p.set(ix, iy, P.verm);
  p.set(ix + iw - 1, iy, P.blue);
  printLines(p, ix + 1, iy + ih - 2, 10, 1, P.steel, 7);
}

// ---------------------------------------------------------------- 『本日の落とし物』 board (5–6, 0–1) — fushigi_06

registerProp('in_kb_board', () => {
  const build = (state: 0 | 1 | 2) => {
    const p = pc(30, 26);
    p.rect(0, 0, 30, 26, P.wood);
    p.hline(0, 29, 0, P.woodLt);
    p.rect(1, 1, 28, 24, P.white);
    // header band 『本日の落とし物』: an umbrella and a key drawn in white
    p.rect(1, 1, 28, 6, P.navy);
    p.hline(5, 9, 2, P.white);
    p.hline(4, 10, 3, P.white);
    p.vline(7, 4, 5, P.white);
    p.set(6, 5, P.white);
    p.ring(14, 4, 1.5, 1.5, P.white);
    p.hline(16, 21, 4, P.white);
    p.set(19, 5, P.white);
    p.set(21, 5, P.white);
    p.set(24, 4, P.goldPale);
    p.set(26, 4, P.goldPale);
    // ruled lines
    for (let r = 0; r < 4; r++) p.hline(3, 26, 9 + r * 4, P.concreteLt);
    if (state >= 1) {
      // 『17時（1個）』 written in marker
      tiny(p, '17:00', 4, 9, P.ink);
      p.hline(4, 22, 14, P.steel);
      // the count, circled in red on the next line
      tiny(p, '1', 6, 16, P.verm);
      p.ring(7, 18, 3, 3, P.verm);
    }
    if (state === 2) {
      // 受付印: a red round stamp
      p.ring(21.5, 18.5, 4, 4, P.verm);
      p.ring(21.5, 18.5, 3, 3, P.verm);
      p.hline(19, 24, 18, P.verm);
      p.set(21, 16, P.verm);
    }
    castRight(p, 0, 0, 30, 26, 2);
    // two magnets
    p.set(2, 2, P.red);
    p.set(27, 2, P.gold);
    return p.toCanvas();
  };
  const imgs = [build(0), build(1), build(2)];
  return {
    ox: 2,
    oy: 3,
    w: 30,
    h: 26,
    foot: 0,
    flat: true,
    img: (env: PropEnv) => imgs[fushigiDone('fushigi_06') ? 2 : env.stage >= 1 && env.stage < 3 ? 1 : 0],
  } as PropArt;
});

// ---------------------------------------------------------------- wall clock (7,0)

registerProp('in_kb_clock', () => {
  const cache = new Map<string, HTMLCanvasElement>();
  return {
    ox: 18,
    oy: 1,
    w: 12,
    h: 12,
    foot: 0,
    flat: true,
    img: (env: PropEnv) => {
      const c = env.flag('flag_clock');
      const [h, m] = env.stage >= 3 ? [5, 1] : env.stage >= 1 ? [5, 0] : [4, c >= 2 ? 58 : c >= 1 ? 55 : 52];
      const k = `${h}:${m}`;
      let img = cache.get(k);
      if (!img) {
        const p = pc(12, 12);
        clockFace(p, 5, 5, 4, h, m, { rim: P.woodDark });
        p.ring(5.5, 5.5, 5, 5, P.ink);
        castRight(p, 0, 0, 11, 11, 1);
        img = p.toCanvas();
        cache.set(k, img);
      }
      return img;
    },
  } as PropArt;
});

// ---------------------------------------------------------------- grey locker with the white helmet (7,2)

registerProp('in_kb_locker', () =>
  prop(16, 34, (p) => {
    p.rect(1, 6, 14, 28, P.steel);
    p.vline(1, 6, 33, P.concrete);
    p.vline(14, 6, 33, P.asphalt);
    p.hline(1, 14, 6, P.concreteLt);
    p.vline(8, 7, 32, P.asphalt);
    for (let j = 9; j < 14; j += 2) {
      p.hline(3, 6, j, P.asphalt);
      p.hline(10, 13, j, P.asphalt);
    }
    p.rect(6, 18, 1, 4, P.charcoal);
    p.rect(10, 18, 1, 4, P.charcoal);
    p.rect(3, 24, 4, 3, P.white);
    scribble(p, 3, 24, 1, P.navy, 3, 3);
    p.hline(1, 14, 33, P.charcoal);
    // white helmet with a navy stripe on top
    p.ellipse(8, 3.5, 5, 3.5, P.white);
    p.hline(4, 12, 4, P.navy);
    p.hline(3, 13, 6, P.concrete);
    p.set(6, 1, P.glint);
  }, { base: 16, contact: 0, shadow: 0 }),
);

// ---------------------------------------------------------------- steel desk (3–5,3): diary, radio, teacup; chair behind

registerProp('in_kb_desk', () => {
  const p = pc(48, 30);
  // the officer's chair pushed in behind the desk (north side): a rounded back
  // rest seen from behind, two armrests either side of it
  p.ellipse(24, 3.5, 5, 3.5, P.charcoal);
  p.rect(19, 3, 11, 5, P.charcoal);
  p.ellipse(24, 3, 4, 2.5, P.asphalt);
  p.hline(21, 26, 1, P.steel);
  p.rect(16, 5, 3, 3, P.asphalt);
  p.hline(16, 18, 5, P.steel);
  p.rect(30, 5, 3, 3, P.asphalt);
  p.hline(30, 32, 5, P.steel);
  // desk top: grey steel with a green mat
  p.rect(0, 8, 48, 8, P.concrete);
  p.hline(0, 47, 8, P.concreteLt);
  p.rect(2, 9, 44, 6, P.leafShade);
  p.hline(2, 45, 9, P.leafDeep);
  // the duty diary (open, lines of 『本日も異常なし』)
  p.rect(3, 9, 12, 6, P.white);
  p.vline(9, 9, 14, P.concrete);
  printLines(p, 4, 10, 4, 3, P.steel, 3);
  printLines(p, 10, 10, 4, 3, P.steel, 5);
  p.line(13, 14, 15, 12, P.navy);
  // radio set with its antenna and an LED
  p.rect(19, 7, 9, 6, P.charcoal);
  p.rect(20, 8, 4, 4, P.asphalt);
  for (let j = 8; j < 12; j += 2) p.hline(20, 23, j, P.ink);
  p.vline(27, 2, 6, P.steel);
  // in-tray with papers
  p.rect(30, 10, 7, 4, P.woodLt);
  p.rect(31, 9, 5, 3, P.white);
  // teacup 『交通安全』 (cold)
  p.rect(40, 9, 4, 5, P.white);
  p.hline(40, 43, 9, P.leafDeep);
  p.set(41, 11, P.leafShade);
  p.set(42, 12, P.leafShade);
  // front: steel drawers
  p.rect(0, 16, 48, 12, P.steel);
  p.hline(0, 47, 16, P.concreteLt);
  p.rect(2, 18, 14, 4, P.concrete);
  p.rect(2, 23, 14, 4, P.concrete);
  p.rect(32, 18, 14, 9, P.concrete);
  for (const [hx, hy] of [[8, 20], [8, 25], [38, 21]] as const) p.rect(hx, hy, 3, 1, P.charcoal);
  p.rect(18, 17, 12, 10, P.asphalt);
  p.rect(0, 28, 48, 2, P.charcoal);
  finish(p, { soft: true });
  const a = stand(p.toCanvas(), { cx: 24, base: 16, contact: 0, shadow: 0 });
  a.glow = (g: Gfx, x: number, y: number, env: PropEnv) => {
    // the radio's LED (receiving now and then)
    const on = Math.floor(env.t / 600) % 5 !== 0;
    g.rect(x + a.ox + 25, y + a.oy + 9, 1, 1, on ? P.leafYoung : P.vermLt, 0.95);
  };
  return a;
});

// ---------------------------------------------------------------- lost-property box (7,3)

registerProp('in_kb_lostbox', () =>
  prop(16, 20, (p) => {
    cardboard(p, 1, 6, 14, 14, 4, 3);
    // a handkerchief, one glove, a pass case poking out
    p.rect(2, 3, 5, 4, P.peach);
    p.set(2, 3, P.skin1);
    p.rect(7, 2, 3, 5, P.navy);
    p.set(7, 1, P.navy);
    p.set(9, 1, P.navy);
    p.rect(10, 4, 5, 3, P.charcoal);
    p.set(11, 5, P.white);
    // label 『落とし物』
    p.rect(3, 12, 10, 4, P.white);
    scribble(p, 4, 12, 2, P.verm, 11, 3);
  }, { base: 16, contact: 0, shadow: 0 }),
);

// ---------------------------------------------------------------- the entrance mat (4,5)

registerProp('in_kb_mat', () => {
  const p = pc(24, 12);
  p.rect(0, 0, 24, 12, P.charcoal);
  p.strokeRect(0, 0, 24, 12, P.ink);
  for (let x = 2; x < 22; x += 2) p.vline(x, 2, 9, P.asphalt);
  tiny(p, 'KOBAN', 2, 4, P.concrete, undefined, 0);
  return { ox: -4, oy: 5, w: 24, h: 12, foot: 0, flat: true, img: () => p.toCanvas() } as PropArt;
});

void notice;
