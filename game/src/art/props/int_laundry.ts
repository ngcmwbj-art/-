// コインランドリー ふわり interior (30_level_art 4.5, 12×7). Six built-in
// dryers (16×32, round glass window over the coin slot): No.3 keeps turning
// with warm light in its window (fushigi_05), the others hold their own small
// stories (a towel, 故障中, one sock, a coin trace). Two big washers, a row of
// plastic seats where 乾 waits, a folding table with the lost-sock basket, a
// small detergent vending machine, a corkboard of flyers, pale tiled walls
// with an aqua band, a vinyl checker floor under white tube light.

import type { Gfx } from '../../engine/gfx';
import { PixelCanvas } from '../../engine/pixel';
import { getMapDef } from '../../world/maps';
import { fushigiDone } from '../../world/fushigi';
import { laneOf, vinyl } from '../tiles/ifloor';
import { ihash, valueNoise } from '../tiles/noise';
import { P } from '../tiles/palette';
import { clockFace, notice, pc, prop } from './ifurn';
import { depthShade, lightPool, paintShell, screenPool, screenSpill, shellProp, tube } from './ishell';
import { lvTime } from './istate';
import { castRight, dk, finish, lt } from './kit';
import { mkFrames, stand } from './pkit';
import { registerProp } from './registry';
import { fontTextSmall, printLines, scribble, tiny } from './text';
import type { PropArt, PropEnv } from './types';

function rgbHex(c: [number, number, number]): string {
  const h = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${h(c[0])}${h(c[1])}${h(c[2])}`;
}

// ---------------------------------------------------------------- shell

registerProp('in_ld_shell', () => {
  const rows = getMapDef('map_laundry')?.rows ?? [];
  const lane = laneOf([[3, 5], [3, 3], [9, 3]], 18);
  const floor = vinyl(121, lane);
  const sh = paintShell({
    rows,
    floor: (x, y) => floor(x, y),
    wall: (x, y) => {
      // cream upper wall, an aqua band with a blue line, white tiles below
      if (y <= 10) return valueNoise(x / 6, y / 4, 123) > 0.82 ? P.white : P.concreteLt;
      if (y === 11 || y === 12) return P.aqua;
      if (y === 13) return P.blue;
      const ty = y - 14;
      if (x % 6 === 5 || ty % 6 === 5) return P.concrete;
      return ihash(Math.floor(x / 6), Math.floor(ty / 6), 125) % 9 === 0 ? P.concreteLt : P.white;
    },
    trim: P.concreteLt,
    base: P.steel,
    baseH: 3,
  });
  const p = sh.p;
  // price panel over the dryers: 『乾燥機 10分 100円』 and the machine numbers
  p.rect(34, 3, 92, 9, P.navy);
  p.hline(34, 125, 3, P.blue);
  p.hline(34, 125, 11, P.nightShade);
  tiny(p, 'DRYER', 38, 5, P.white);
  tiny(p, '10', 62, 5, P.gold);
  fontTextSmall(p, '分', 70, 4, P.white, 1);
  tiny(p, '100', 84, 5, P.gold);
  fontTextSmall(p, '円', 96, 4, P.white, 1);
  // a little tumbling-shirt pictogram
  p.ring(115.5, 7, 3.5, 3.5, P.aqua);
  p.rect(113, 6, 5, 3, P.white);
  p.set(112, 6, P.white);
  p.set(118, 6, P.white);
  castRight(p, 34, 3, 92, 9, 2);
  // (1,1) the notice: 『乾燥機に入れたまま帰らないでください』 in red, three times
  notice(p, 17, 5, 13, 20, { paper: P.paper, ink: P.verm, head: P.red, seed: 31, rows: 7 });
  // corkboard with flyers above the washers (9–10)
  p.rect(146, 3, 28, 15, P.woodLt);
  p.strokeRect(145, 2, 30, 17, P.wood);
  notice(p, 148, 4, 8, 10, { paper: P.white, ink: P.steel, head: P.leafYoung, seed: 41, tape: false });
  notice(p, 157, 5, 7, 8, { paper: P.paper, ink: P.blue, seed: 42, tape: false });
  notice(p, 165, 4, 8, 12, { paper: P.white, ink: P.crimson, head: P.peach, seed: 43, tape: false });
  castRight(p, 145, 2, 30, 17, 2);
  // outlet and a small 禁煙 sign by the door side
  p.rect(18, 26, 5, 4, P.white);
  p.ring(20.5, 28, 1.5, 1.5, P.verm);
  // ---- floor: lint balls, a lost 10-yen coin, a dryer sheet
  for (const [lx, ly] of [[40, 70], [118, 60], [150, 88]] as const) {
    p.rect(lx, ly, 2, 2, P.concreteLt);
    p.set(lx + 1, ly + 1, P.steel);
  }
  p.rect(134, 76, 2, 2, P.brass);
  p.set(134, 76, P.goldPale);
  p.rect(58, 84, 5, 3, P.white);
  p.hline(58, 62, 86, P.concrete);
  // ---- the entrance (3,6): aluminium glass door
  const dx = 48;
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
      // two white tube lights on the ceiling (one flickers now and then)
      const t2 = tube(env.t, 131, [7000, 16000], [50, 120]);
      screenPool(g, x + 64, y + 62, 44, 18, P.glint, 0.16 + n * 0.1);
      screenPool(g, x + 136, y + 62, 44, 18, P.glint, (0.16 + n * 0.1) * (0.35 + t2 * 0.65));
      screenSpill(g, x + 56, y + 96, 18, 36, 24, rgbHex(env.grade.skyBot), 0.2 - n * 0.12, true);
    },
    light(g: Gfx, x: number, y: number, env: PropEnv) {
      // white tube light: the laundromat is the brightest room on the river road at night
      const n = env.grade.night;
      const t2 = tube(env.t, 131, [7000, 16000], [50, 120]);
      lightPool(g, x + 64, y + 60, 64, 44, P.white, 0.1 + n * 0.55);
      lightPool(g, x + 136, y + 60, 64, 44, P.white, (0.1 + n * 0.55) * (0.3 + t2 * 0.7));
    },
  });
});

// ---------------------------------------------------------------- the dryers (2–7,2)

type DryerKind = 1 | 2 | 3 | 4 | 5 | 6;

function dryerBody(p: PixelCanvas, n: number): void {
  // 16×32: white enamel body built into the wall, number plate, round glass
  // window (drum) over a coin box with a slot and the 100-yen lamp
  p.rect(0, 0, 16, 32, P.white);
  p.vline(0, 0, 31, P.glint);
  p.vline(15, 0, 31, P.concrete);
  p.hline(0, 15, 0, P.concreteLt);
  // number plate
  p.rect(5, 1, 6, 5, P.navy);
  tiny(p, String(n), 7, 1, P.white);
  // door: steel ring and dark glass
  p.ellipse(8, 12.5, 6.5, 6.5, P.steel);
  p.ellipse(8, 12.5, 5.5, 5.5, P.concreteLt);
  p.ellipse(8, 12.5, 4.5, 4.5, P.shadeDeep);
  p.set(3, 9, P.white);
  p.set(4, 8, P.white);
  // handle
  p.rect(13, 11, 2, 4, P.asphalt);
  // coin box
  p.rect(2, 21, 12, 8, P.concreteLt);
  p.hline(2, 13, 21, P.white);
  p.rect(4, 23, 4, 1, P.ink);
  p.rect(9, 23, 3, 3, P.steel);
  p.set(10, 24, P.ink);
  p.rect(4, 26, 2, 2, P.gold);
  p.rect(0, 30, 16, 2, P.asphalt);
}

/** Clothes tumbling in the drum: frame k of 4 (90° a frame), pieces in 4 colours. */
function tumble(p: PixelCanvas, k: number, colors: string[]): void {
  const cx = 8;
  const cy = 12.5;
  for (let i = 0; i < colors.length; i++) {
    const a = ((k + i * 1.3) / 4) * Math.PI * 2;
    const r = 2.4 + (i % 2) * 0.8;
    const x = Math.round(cx + Math.cos(a) * r - 1);
    const y = Math.round(cy + Math.sin(a) * r - 1);
    p.rect(x, y, 2, 2, colors[i]);
    p.set(x, y, lt(colors[i]));
  }
}

const DRYER_FRAMES = new Map<string, HTMLCanvasElement[]>();
function dryerFrames(n: DryerKind): HTMLCanvasElement[] {
  const key = String(n);
  const hit = DRYER_FRAMES.get(key);
  if (hit) return hit;
  // frames: 0–3 turning, 4 still, 5 = No.3 stopped with its door open
  const fr = mkFrames(6, 16, 32, (p, k) => {
    dryerBody(p, n);
    const turning = k < 4;
    if (n === 3) {
      if (k === 5) {
        // stopped, the door open (swung left), warm and empty
        p.ellipse(8, 12.5, 4.5, 4.5, P.nightShade);
        p.ellipse(8, 13, 3, 3, P.shadeDeep);
        p.ellipse(1, 12.5, 2, 5.5, P.steel);
        p.vline(0, 8, 17, P.concreteLt);
        return;
      }
      p.ellipse(8, 12.5, 4.5, 4.5, P.brassOld);
      p.ellipse(8, 12.5, 3.5, 3.5, P.brass);
      tumble(p, turning ? k : 0, [P.blue, P.white, P.crimson, P.leafYoung]);
      p.set(10, 9, P.goldPale);
      // the 100-yen lamp is lit
      p.rect(4, 26, 2, 2, P.vermLt);
      return;
    }
    if (n === 5 && turning) {
      p.ellipse(8, 12.5, 4.5, 4.5, P.nightShade);
      tumble(p, k, [P.peach]);
      return;
    }
    switch (n) {
      case 1: // empty — a round reflection of whoever looks in
        p.ring(8, 12.5, 3, 3, P.nightShade);
        break;
      case 2: // a single towel lying in the drum
        p.rect(4, 14, 8, 3, P.aqua);
        p.hline(4, 11, 14, P.white);
        p.set(11, 16, P.blue);
        break;
      case 4: // 『故障中』 paper taped over the window
        // slightly askew: the right half sits one pixel lower
        p.rect(3, 8, 5, 9, P.paper);
        p.rect(8, 9, 5, 9, P.paper);
        p.hline(3, 7, 16, P.paperGrid);
        p.hline(8, 12, 17, P.paperGrid);
        p.hline(4, 7, 10, P.verm);
        p.hline(8, 11, 11, P.verm);
        // two lines of hand-written text (dashes, not a picture)
        for (const [x0, x1, y] of [[4, 5, 13], [7, 7, 13], [9, 11, 14], [4, 6, 15], [8, 9, 16], [11, 11, 16]]) {
          p.hline(x0, x1, y, y < 15 ? P.ink : P.asphalt);
        }
        p.rect(2, 7, 3, 1, P.goldPale);
        p.rect(11, 8, 3, 1, P.goldPale);
        break;
      case 5: // one sock
        p.rect(5, 15, 5, 2, P.peach);
        p.rect(9, 13, 2, 3, P.peach);
        p.set(5, 15, P.white);
        break;
      case 6: // a 10-yen coin and the ring it wore into the drum
        p.ring(8, 12.5, 3.5, 3.5, P.nightShade);
        p.rect(7, 15, 2, 2, P.brass);
        p.set(7, 15, P.goldPale);
        break;
    }
  }, (p) => finish(p, { soft: true, rim: false }));
  DRYER_FRAMES.set(key, fr);
  return fr;
}

registerProp('in_ld_dryer', (opts) => {
  const n = Math.max(1, Math.min(6, Number(opts.n ?? 1))) as DryerKind;
  const fr = dryerFrames(n);
  const a = stand(fr[4], { base: 16, shadow: 0, contact: 0 });
  a.img = (env) => {
    if (n === 3) return fushigiDone('fushigi_05') ? fr[5] : fr[Math.floor(env.t / 120) % 4];
    if (n === 5 && env.stage === 2) {
      // stage 2: No.5 turns exactly once, a few seconds after you come in
      const u = env.t - lvTime.enterT - 2600;
      if (lvTime.map === 'map_laundry' && u >= 0 && u < 960) return fr[Math.floor(u / 120) % 4];
    }
    return fr[4];
  };
  if (n === 3)
    a.glow = (g: Gfx, x: number, y: number, env: PropEnv) => {
      if (fushigiDone('fushigi_05')) return;
      // warm light in the window, and a round warm pool on the floor
      const fl = 0.85 + Math.sin(env.t / 240) * 0.1;
      screenPool(g, x + a.ox + 8, y + a.oy + 13, 7, 7, P.sky, 0.35 * fl);
      screenPool(g, x + 8, y + 25, 18, 9, P.sky, 0.4 * fl);
      screenPool(g, x + 8, y + 25, 9, 5, P.horizon, 0.22 * fl);
    };
  return a;
});

// ---------------------------------------------------------------- big washers (9–10,2)

registerProp('in_ld_washer', () => {
  // the left washer is running (somebody's wash, 38 minutes to go — the owner
  // never shows up): water sloshes and a shirt turns in the porthole (4
  // frames on the motion clock, so it freezes at 17:00); the right one is idle
  const frames = mkFrames(4, 32, 30, (p, k) => {
    for (const bx of [0, 16]) {
      const run = bx === 0;
      p.rect(bx, 0, 16, 30, P.concreteLt);
      p.hline(bx, bx + 15, 0, P.white);
      p.vline(bx, 0, 29, P.white);
      p.vline(bx + 15, 1, 29, P.steel);
      // control strip with a little LED display
      p.rect(bx + 1, 2, 14, 5, P.steel);
      p.rect(bx + 2, 3, 6, 3, P.ink);
      if (run) tiny(p, '38', bx + 2, 3, P.leafYoung, undefined, 0);
      else p.hline(bx + 3, bx + 6, 4, P.leafShade);
      p.set(bx + 11, 4, run ? P.verm : P.charcoal);
      p.set(bx + 13, 4, run && k % 2 ? P.leafLt : P.leafShade);
      // big porthole
      p.ellipse(bx + 8, 17, 6.5, 6.5, P.asphalt);
      p.ellipse(bx + 8, 17, 5.5, 5.5, P.steel);
      p.ellipse(bx + 8, 17, 4.5, 4.5, P.navy);
      if (run) {
        // soapy water: the surface tilts with the drum, suds on top
        const tilt = [1, 0, -1, 0][k];
        for (let y = 13; y <= 21; y++)
          for (let x = bx + 4; x <= bx + 12; x++) {
            const dx = x + 0.5 - (bx + 8.5);
            const dy = y + 0.5 - 17.5;
            if (dx * dx + dy * dy > 4.5 * 4.5) continue;
            const surf = 16 + Math.round((dx / 4) * tilt);
            if (y === surf) p.set(x, y, (x + k) % 3 === 0 ? P.white : P.aqua);
            else if (y > surf) p.set(x, y, P.blue);
          }
        // a pink shirt and a white sock going round
        const ang = (k / 4) * Math.PI * 2;
        const sx = Math.round(bx + 8 + Math.cos(ang) * 2.5 - 1);
        const sy = Math.round(17.5 + Math.sin(ang) * 2.2 - 1);
        p.rect(sx, sy, 3, 2, P.peach);
        p.set(sx, sy, P.skin2);
        const wx = Math.round(bx + 8 - Math.cos(ang) * 2.2);
        const wy = Math.round(17.5 - Math.sin(ang) * 2);
        p.rect(wx, wy, 2, 1, P.white);
      }
      p.set(bx + 5, 14, P.aqua);
      p.set(bx + 6, 13, P.glint);
      p.rect(bx + 1, 26, 14, 3, P.steel);
      p.hline(bx + 1, bx + 14, 26, P.concrete);
    }
    // a detergent bottle on top of the right one
    p.rect(22, 0, 4, 1, P.blue);
  }, (p) => finish(p, { soft: true }));
  const a = stand(frames[0], { cx: 16, base: 16, contact: 0, shadow: 0 });
  a.img = (env: PropEnv) => frames[Math.floor(env.mt / 180) % 4];
  return a;
});

// ---------------------------------------------------------------- plastic seats (3–5,4) and the magazine

registerProp('in_ld_bench', () =>
  prop(48, 20, (p) => {
    // steel beam and legs
    p.rect(1, 12, 46, 2, P.steel);
    p.hline(1, 46, 12, P.concreteLt);
    for (const lx of [3, 23, 44]) {
      p.vline(lx, 14, 19, P.asphalt);
      p.set(lx - 1, 19, P.charcoal);
      p.set(lx + 1, 19, P.charcoal);
    }
    // three moulded seats: orange, blue, orange
    const cols = [P.sun, P.blue, P.sun];
    for (let k = 0; k < 3; k++) {
      const x = 1 + k * 16;
      const c = cols[k];
      p.rect(x + 1, 0, 13, 7, dk(c));
      p.hline(x + 1, x + 13, 0, c);
      p.rect(x, 7, 15, 5, c);
      p.hline(x, x + 14, 7, lt(c));
      p.hline(x, x + 14, 11, dk(c));
    }
    // the weekly magazine on the left seat
    p.rect(3, 6, 9, 5, P.white);
    p.rect(3, 6, 9, 2, P.red);
    p.rect(8, 8, 3, 2, P.skin2);
    scribble(p, 4, 9, 1, P.ink, 7, 3);
  }, { cx: 24, base: 16, contact: 0, shadow: 0 }),
);

// ---------------------------------------------------------------- folding table with the lost-sock basket (9–10,4)

registerProp('in_ld_table', () =>
  prop(32, 22, (p) => {
    p.rect(0, 6, 32, 4, P.concreteLt);
    p.hline(0, 31, 6, P.white);
    p.hline(0, 31, 9, P.steel);
    p.vline(2, 10, 21, P.steel);
    p.vline(29, 10, 21, P.asphalt);
    p.rect(2, 16, 28, 1, P.steel);
    // a folded towel stack
    p.rect(3, 3, 9, 4, P.aqua);
    p.hline(3, 11, 3, P.white);
    p.hline(3, 11, 5, P.blue);
    // the basket: pale blue plastic, five odd socks over the rim, a label 『忘れ物』
    p.rect(14, 1, 15, 8, P.aqua);
    p.hline(14, 28, 1, P.white);
    for (let x = 15; x < 28; x += 3) p.vline(x, 3, 7, P.blue);
    p.hline(14, 28, 8, P.navy);
    const socks = [P.red, P.gold, P.leafDeep, P.crimson, P.white];
    for (let k = 0; k < 5; k++) {
      const x = 15 + k * 3;
      const c = socks[k];
      p.rect(x, -0 + (k % 2), 2, 3, c);
      p.set(x + (k % 2 ? -1 : 2), 2 + (k % 2), c);
      p.set(x, (k % 2), lt(c));
    }
    p.rect(18, 4, 7, 3, P.paper);
    scribble(p, 19, 4, 2, P.verm, 9, 2);
  }, { cx: 16, base: 16, contact: 0, shadow: 0 }),
);

// ---------------------------------------------------------------- detergent vending machine (1,5)

registerProp('in_ld_vend', () => {
  const p = pc(16, 30);
  p.rect(1, 1, 14, 29, P.white);
  p.vline(1, 1, 29, P.glint);
  p.vline(14, 2, 29, P.concrete);
  p.rect(1, 1, 14, 3, P.blue);
  // soap bubbles on the header band
  for (const [bx, by] of [[3, 2], [6, 1], [9, 2], [12, 1]] as const) p.set(bx, by, P.white);
  p.set(7, 2, P.aqua);
  // product window: four small detergent boxes
  p.rect(2, 5, 12, 9, P.navy);
  for (let k = 0; k < 4; k++) {
    const bx = 3 + (k % 2) * 6;
    const by = 6 + Math.floor(k / 2) * 4;
    const c = [P.red, P.leafYoung, P.aqua, P.gold][k];
    p.rect(bx, by, 4, 3, c);
    p.set(bx, by, P.white);
  }
  // buttons, coin slot, price and the take-out tray
  for (let k = 0; k < 4; k++) p.set(3 + k * 3, 15, P.steel);
  p.rect(10, 17, 3, 4, P.steel);
  p.set(11, 18, P.ink);
  p.rect(3, 17, 5, 3, P.ink);
  tiny(p, '50', 3, 17, P.verm, undefined, 0);
  p.rect(3, 23, 10, 4, P.charcoal);
  p.hline(3, 12, 23, P.asphalt);
  p.rect(1, 28, 14, 2, P.asphalt);
  finish(p, { soft: true });
  const a = stand(p.toCanvas(), { base: 16, contact: 12, shadow: 0 });
  a.glow = (g: Gfx, x: number, y: number, env: PropEnv) => {
    const blink = Math.floor(env.t / 900) % 2;
    g.rect(x + a.ox + 3, y + a.oy + 15, 1, 1, blink ? P.glow : P.aqua, 0.9);
    g.rect(x + a.ox + 2, y + a.oy + 5, 12, 9, P.aqua, 0.08);
  };
  return a;
});

// ---------------------------------------------------------------- wall clock (8,1)

function laundryTime(env: PropEnv): [number, number, number] {
  if (env.stage >= 3) return [5, 1, Math.floor(env.t / 1000) % 60];
  if (env.stage >= 1) {
    // 17:00 — the second hand stamps its feet just before 12
    const s = 58 + (Math.floor(env.t / 500) % 2);
    return [5, 0, s];
  }
  const c = env.flag('flag_clock');
  return [4, c >= 2 ? 58 : c >= 1 ? 55 : 52, Math.floor(env.t / 1000) % 60];
}

registerProp('in_ld_clock', () => {
  const cache = new Map<string, HTMLCanvasElement>();
  const img = (env: PropEnv) => {
    const [h, m, s] = laundryTime(env);
    const k = `${h}:${m}:${s}`;
    let c = cache.get(k);
    if (!c) {
      const p = pc(13, 13);
      clockFace(p, 6, 6, 5, h, m, { rim: P.steel, face: P.white });
      const a = (s / 60) * Math.PI * 2;
      p.line(6, 6, Math.round(6 + Math.sin(a) * 4), Math.round(6 - Math.cos(a) * 4), P.red);
      p.set(6, 6, P.ink);
      castRight(p, 0, 0, 12, 12, 1);
      c = p.toCanvas();
      if (cache.size > 200) cache.clear();
      cache.set(k, c);
    }
    return c;
  };
  return { ox: 1, oy: 16, w: 13, h: 13, foot: 0, flat: true, img } as PropArt;
});

void printLines;
void valueNoise;
void rgbHex;
