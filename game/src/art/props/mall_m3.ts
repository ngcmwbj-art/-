// M3 健康器具コーナー (30_level_art 5.3, 16×13). The stopped escalator rises
// through an opening in the north wall towards 2F (fushigi_11: it thanks you
// on every step), its glass balustrades with black rubber rails; a row of
// four massage chairs in profile, all still 『お試し中』 and quietly
// vibrating; a body-fat scale that reads 17; the hanging bar with clothes
// pegs left on it; a height chart; the STAFF door to the backyard. The corner
// itself is carpeted (green, with the footprints of machines long gone and
// the roped-off demo dais, mall_decay.ts); the walkway from the hall to the
// escalator keeps the P-tiles. No skylight here: the evening comes down the
// escalator well, and the chairs' demo spotlights are still on.

import type { Gfx } from '../../engine/gfx';
import { PixelCanvas } from '../../engine/pixel';
import { getMapDef } from '../../world/maps';
import { healthCarpet, laneOf, mallTiles } from '../tiles/ifloor';
import { ihash } from '../tiles/noise';
import { P } from '../tiles/palette';
import { pc, prop } from './ifurn';
import { blend, depthShade, paintShell, screenPool, screenSpill, shellProp, tube } from './ishell';
import { castRight, dk, finish, lt } from './kit';
import { exitCorridor, exitLight, fasciaText, mallGrade, mallLampLight, mallLamps, mallWall, posterGhost, small, type Lamp } from './mall_kit';
import { flat, mkFrames, stand } from './pkit';
import { registerProp } from './registry';
import { fontTextSmall, printLines, tiny } from './text';
import type { PropArt, PropEnv } from './types';

const M3_LAMPS: Lamp[] = [
  { x: 56, y: 76 }, { x: 170, y: 72 }, { x: 56, y: 160 }, { x: 150, y: 160, flicker: true }, { x: 226, y: 184 },
];

// ---------------------------------------------------------------- shell

registerProp('mall_m3_shell', () => {
  const rows = getMapDef('map_mall_health')?.rows ?? [];
  const blocked = (tx: number, ty: number) => (tx >= 6 && tx <= 8 && ty <= 7) || tx >= 13 || (tx === 1 && ty === 5) || (tx === 4 && ty === 9) || (tx === 11 && ty === 10);
  const lane = laneOf([[0, 7.5], [7, 7.5], [7, 3], [7, 7.5], [2, 3]], 20);
  const tiles = mallTiles({
    seed: 531,
    w: 16,
    h: 13,
    blocked,
    lane,
    decals: [
      { x: 118, y: 150, kind: 'arrow', dir: 2 },
      { x: 138, y: 170, kind: 'steps', dir: 0, n: 7 },
      { x: 176, y: 178, kind: 'tape', w: 22, h: 12 },
      { x: 94, y: 178, kind: 'pot' },
    ],
  });
  // the corner itself is carpeted (green, the machines' old footprints in
  // it); the walkway from the hall to the escalator keeps the P-tiles, a
  // brass edge strip where they meet
  const carpetAt = (tx: number, ty: number) => (tx >= 9 && ty >= 3 && ty <= 11) || (ty >= 9 && ty <= 11 && tx >= 1);
  const carpet = healthCarpet({
    seed: 537,
    lane: laneOf([[9, 7.5], [12, 7.5], [12, 11], [3, 10.5]], 16),
    ghosts: [[162, 66, 22, 14], [40, 160, 18, 10]],
  });
  const floor = (x: number, y: number) => {
    const tx = x >> 4;
    const ty = y >> 4;
    if (!carpetAt(tx, ty)) return tiles(x, y);
    // the edge strip: 2px of brass along a side that meets the tiles
    const lx = x & 15;
    const ly = y & 15;
    if ((lx < 2 && !carpetAt(tx - 1, ty) && tx > 0) || (ly < 2 && !carpetAt(tx, ty - 1) && ty > 3)) return lx === 0 || ly === 0 ? P.brass : P.brassOld;
    return carpet(x, y);
  };
  const wall = mallWall(533);
  const sh = paintShell({ rows, floor, wall, trim: P.nightShade, base: P.steel, baseH: 3 });
  const p = sh.p;
  // ---- (2) the STAFF door in the lowest wall row, its sign
  p.rect(33, 22, 14, 6, P.white);
  tiny(p, 'STAFF', 33, 22, P.navy, undefined, 0);
  p.hline(33, 46, 27, P.red);
  castRight(p, 33, 22, 14, 6, 1);
  p.rect(32, 30, 16, 18, P.steel);
  p.vline(32, 30, 47, P.concrete);
  p.vline(47, 30, 47, P.asphalt);
  p.rect(36, 32, 7, 5, P.shadeDeep);
  p.hline(36, 42, 34, P.asphalt);
  p.vline(39, 32, 36, P.asphalt);
  p.rect(34, 40, 3, 1, P.concreteLt);
  p.set(34, 41, P.charcoal);
  // ---- (3–4) 『1日1万歩』: the title band, a walking figure and a big 10000
  {
    const x = 47;
    const y = 4;
    const w = 35;
    p.rect(x, y, w, 26, P.paper);
    p.rect(x, y, w, 10, P.leafDeep);
    p.hline(x, x + w - 1, y, P.leaf);
    small(p, '1日1万歩', x + 2, y + 1, P.white);
    // walking figure
    p.ellipse(x + 7, y + 13, 2, 2, P.sun);
    p.line(x + 7, y + 15, x + 7, y + 19, P.sunDeep);
    p.line(x + 7, y + 19, x + 4, y + 23, P.sunDeep);
    p.line(x + 7, y + 19, x + 10, y + 23, P.sunDeep);
    p.line(x + 7, y + 16, x + 4, y + 18, P.sunDeep);
    p.line(x + 7, y + 16, x + 10, y + 17, P.sunDeep);
    tiny(p, '10000', x + 13, y + 13, P.verm, undefined, 0);
    printLines(p, x + 13, y + 20, 19, 2, P.steel, 33);
    castRight(p, x, y, w, 26, 2);
    p.set(x + 1, y, P.verm);
    p.set(x + w - 2, y, P.verm);
  }
  // ---- (5) height chart on the wall: a tape with a sliding head bar
  p.rect(84, 6, 6, 40, P.white);
  p.vline(84, 6, 45, P.concreteLt);
  for (let yy = 8; yy < 45; yy += 3) p.hline(86, yy % 9 === 8 ? 89 : 88, yy, P.steel);
  p.rect(82, 17, 10, 2, P.steel);
  p.hline(82, 91, 17, P.concreteLt);
  castRight(p, 84, 6, 6, 40, 2);
  // ---- (6–8) the opening the stopped escalator climbs into
  escalatorOpening(p, 96, 0);
  // ---- (9–12) 『健康器具』 fascia, two 『お試しください』 posters (a chair, 『0円』), a ghost
  fasciaText(p, 144, 3, 64, 14, P.leafDeep, '健康器具', P.white, P.leafShade);
  // 『おためし 0円』: the word on a gold band, the price in red below
  {
    const x = 146;
    p.rect(x, 21, 35, 16, P.paper);
    p.rect(x, 21, 35, 10, P.gold);
    p.hline(x, x + 34, 21, P.goldPale);
    small(p, 'おためし', x + 2, 22, P.vermShade);
    tiny(p, '0', x + 12, 31, P.verm);
    small(p, '円', x + 16, 30, P.verm);
    castRight(p, x, 21, 35, 16, 2);
    p.set(x + 1, 21, P.verm);
  }
  // a cartoon of a blissful face (closed happy eyes, steam of relief)
  {
    const x = 184;
    p.rect(x, 21, 17, 16, P.paper);
    p.rect(x, 21, 17, 3, P.aqua);
    p.ellipse(x + 8, 30, 5, 4.5, P.skin1);
    p.ring(x + 8, 30, 5, 4.5, P.skin3);
    p.set(x + 5, 29, P.ink);
    p.set(x + 6, 28, P.ink);
    p.set(x + 7, 29, P.ink);
    p.set(x + 9, 29, P.ink);
    p.set(x + 10, 28, P.ink);
    p.set(x + 11, 29, P.ink);
    p.hline(x + 7, x + 9, 32, P.sunShade);
    p.set(x + 4, 31, P.peach);
    p.set(x + 12, 31, P.peach);
    p.vline(x + 2, 25, 27, P.steel);
    p.vline(x + 14, 26, 28, P.steel);
    castRight(p, x, 21, 17, 16, 2);
    p.set(x + 1, 21, P.verm);
  }
  posterGhost(p, 203, 24, 5, 11);
  // ---- (13–14) the 『極上』 poster of a massage chair (inside the east wall) and a price card
  p.rect(209, 19, 28, 17, P.nightShade);
  p.rect(210, 20, 26, 15, P.shadeDeep);
  p.rect(212, 27, 7, 6, P.maroon);
  p.rect(217, 22, 3, 10, P.maroon);
  p.hline(212, 218, 27, P.sunShade);
  p.set(217, 22, P.sunShade);
  small(p, '極上', 220, 22, P.goldPale);
  p.hline(220, 235, 31, P.gold);
  castRight(p, 209, 19, 28, 17, 2);
  // ---- (1) a tall mirror for checking your posture: the room reflected dimly
  // (pale wall above, the floor's line, a lamp's bright band), two glints
  p.rect(18, 7, 11, 38, P.steel);
  p.hline(18, 28, 7, P.concreteLt);
  for (let j = 0; j < 36; j++)
    for (let i = 0; i < 9; i++) {
      const yy = 8 + j;
      const xx = 19 + i;
      let c: string = j < 22 ? (j < 4 ? P.concrete : P.paperGrid) : j === 22 ? P.steel : (i + j) % 7 === 0 ? P.concrete : P.concreteLt;
      if (j >= 5 && j <= 6) c = P.white;
      if ((i + j) % 13 === 0 || (i + j) % 13 === 1) c = P.white;
      p.set(xx, yy, c);
    }
  p.vline(27, 8, 43, P.concrete);
  castRight(p, 18, 7, 11, 38, 2);
  // ---- floor: the metal steps of the escalator (7,3)–(7,6) and its comb plate
  for (let y = 48; y < 112; y++)
    for (let x = 112; x < 128; x++) {
      const ly = (y - 48) % 16;
      const groove = x % 2 === 0;
      let c: string = ly < 2 ? P.concreteLt : ly === 15 ? P.charcoal : groove ? P.steel : P.concrete;
      if (ly === 2) c = P.gold;
      if (x === 112 || x === 127) c = P.asphalt;
      p.set(x, y, c);
    }
  for (let x = 112; x < 128; x++) {
    p.set(x, 112, P.concreteLt);
    p.set(x, 113, x % 2 ? P.steel : P.asphalt);
  }
  // scuffs, a lost sweatband by the scale
  p.rect(22, 106, 5, 2, P.aqua);
  p.hline(22, 26, 106, P.white);
  // ---- the corridor to M1 (E, x0) fades into the dark
  exitCorridor(p, 0, 7, 2, -1);
  const img = p.toCanvas();
  const W = img.width;
  return shellProp({
    img,
    over(g: Gfx, x: number, y: number, env: PropEnv) {
      depthShade(g, x + 16, y + 48, W - 32, 80, 0.14);
      mallLamps(g, x, y, M3_LAMPS, env, 303, 0.16, rows);
      // no skylight here: the evening comes down the escalator well from 2F
      // and lies on the tiles at its foot
      const n = env.grade.night;
      screenSpill(g, x + 112, y + 104, 30, 44, 34, P.sun, 0.2 * (1 - n));
    },
    light(g: Gfx, x: number, y: number, env: PropEnv) {
      mallGrade(g, 'mall', env, [x + 16, y + 48, 224, 144]);
      mallLampLight(g, x, y, M3_LAMPS, env, 303);
    },
    glow(g: Gfx, x: number, y: number, env: PropEnv) {
      exitLight(g, x, y, 0, 7, 2, -1, P.sky, 0.28);
      // the demo spotlights over the massage chairs, still on for 『お試し中』:
      // four warm cones, one of them buzzing dim now and then
      const dim = tube(env.t, 3311, [5000, 11000], [80, 260]);
      for (let k = 0; k < 4; k++) {
        const a = (k === 2 ? 0.1 + dim * 0.14 : 0.24) * (1 - env.grade.night * 0.4);
        screenPool(g, x + 222, y + 64 + k * 32, 20, 13, P.sky, a);
      }
      // the 2F landing is lit by the evening at the top of the opening
      g.rect(x + 108, y + 4, 24, 3, P.sky, 0.35 * (1 - env.grade.night));
    },
  });
});

/** The escalator climbing into the ceiling: steps receding into the dark, 2F sign. */
function escalatorOpening(p: PixelCanvas, x: number, y: number): void {
  // dark void of the well
  p.rect(x, y + 3, 48, 45, P.night);
  // the ceiling edge and the underside of the 2F floor
  p.rect(x, y + 3, 48, 4, P.shadeDeep);
  p.hline(x, x + 47, y + 7, P.ink);
  // the steps going up (top = far, smaller and darker)
  for (let j = 0; j < 38; j++) {
    const yy = y + 47 - j;
    const k = j / 38;
    const half = Math.round(8 - k * 3);
    const cx = x + 24;
    const step = Math.floor(j / (4 - k * 2));
    const c = step % 2 === 0 ? (k < 0.4 ? P.steel : k < 0.7 ? P.asphalt : P.charcoal) : k < 0.4 ? P.asphalt : P.charcoal;
    p.hline(cx - half, cx + half - 1, yy, c);
    // balustrades: glass (lilac tint) outside, the black rubber rail inside
    const bw = Math.round(6 - k * 3);
    p.hline(cx - half - bw - 1, cx - half - 2, yy, k < 0.5 ? P.lilac : P.shade);
    p.hline(cx + half + 1, cx + half + bw, yy, k < 0.5 ? P.lilac : P.shade);
    p.set(cx - half - 1, yy, P.charcoal);
    p.set(cx + half, yy, P.charcoal);
  }
  // 2F sign hanging at the top: 『2F ↑』
  p.rect(x + 14, y + 9, 20, 8, P.navy);
  p.hline(x + 14, x + 33, y + 9, P.blue);
  tiny(p, '2F', x + 17, y + 10, P.white);
  p.vline(x + 29, y + 10, y + 14, P.gold);
  p.set(x + 28, y + 11, P.gold);
  p.set(x + 30, y + 11, P.gold);
  p.vline(x + 16, y + 7, y + 8, P.steel);
  p.vline(x + 31, y + 7, y + 8, P.steel);
}

// ---------------------------------------------------------------- the escalator's balustrades (6 and 8, rows 3–6)

registerProp('mall_escalator_up', () =>
  prop(48, 80, (p) => {
    // two glass balustrades with black rubber rails and steel skirts, rounded ends at the foot
    for (const [bx, inner] of [[4, 13], [33, 33]] as const) {
      const w = 11;
      // tinted glass: the floor shows through, a few diagonal glints
      for (let j = 0; j < 76; j++)
        for (let i = bx; i < bx + w; i++) p.set(i, j, '#9AA0A866');
      for (let j = 4; j < 72; j += 11)
        for (let k = 0; k < 4; k++) p.set(bx + 2 + k, j + 3 - k, '#F4F1E8AA');
      p.vline(bx, 0, 75, P.steel);
      p.vline(bx + w - 1, 0, 75, P.asphalt);
      // the black rubber handrail along the step side
      p.rect(inner, 0, 2, 78, P.charcoal);
      p.vline(inner, 0, 77, P.asphalt);
      // steel skirt at the foot of the glass
      p.rect(bx, 72, w, 6, P.concrete);
      p.hline(bx, bx + w - 1, 72, P.concreteLt);
      // the newel: a rounded end where the rail turns under
      p.ellipse(inner + 0.5, 77, 2.5, 2, P.charcoal);
    }
    p.hline(0, 47, 79, P.ink);
  }, { cx: 24, base: 80, foot: 79, contact: 0, shadow: 0 }),
);

// ---------------------------------------------------------------- massage chairs (13–14, 3–10), four in profile facing west

interface ChairLook {
  /** leather: light / base / dark */
  lea: [string, string, string];
  /** backrest angle: 0 upright, 1 reclined */
  recline: number;
  /** leg rest raised */
  legUp: boolean;
  /** extra: 'towel' on the head pillow, 'note' 『故障』, 'bag' a forgotten tote, '' none */
  extra: string;
}

const LOOKS: ChairLook[] = [
  { lea: [P.woodLt, P.wood, P.woodDark], recline: 0, legUp: false, extra: 'towel' },
  { lea: [P.sunShade, P.maroon, P.nightShade], recline: 1, legUp: true, extra: '' },
  { lea: [P.goldPale, P.woodLt, P.brassOld], recline: 0, legUp: false, extra: 'bag' },
  { lea: [P.asphalt, P.charcoal, P.ink], recline: 1, legUp: false, extra: 'note' },
];

function chairFrames(look: ChairLook): HTMLCanvasElement[] {
  const [li, ba, dkc] = look.lea;
  const lean = look.recline ? 1 : 0.4;
  return mkFrames(2, 32, 40, (p, k) => {
    const d = k; // 1px shiver (the plinth stays put)
    const set = (x: number, y: number, c: string) => {
      if (x >= 0 && x < 32 && y + d >= 0 && y + d < 40) p.set(x, y + d, c);
    };
    const has = (x: number, y: number) => x >= 0 && x < 32 && y + d >= 0 && y + d < 40 && p.alpha(x, y + d) > 0;
    // plinth
    p.rect(7, 35, 22, 4, P.charcoal);
    p.hline(7, 28, 34, P.asphalt);
    // leg rest: hanging down to the west (or raised level), the dark foot pocket at its end
    if (look.legUp) {
      for (let x = 0; x < 12; x++) for (let y = 23; y < 29; y++) set(x, y, y === 23 ? li : x < 2 ? dkc : ba);
      for (let y = 24; y < 28; y++) for (let x = 0; x < 3; x++) set(x, y, P.ink);
      p.rect(9, 29, 3, 6, P.asphalt);
    } else {
      for (let i = 0; i < 12; i++) for (let t = 0; t < 7; t++) set(7 - i + t, 25 + i, t === 0 ? li : ba);
      for (let y = 31; y < 37; y++) for (let x = 0; x < 6; x++) if (x + (36 - y) * 0.2 < 5) set(x, y, P.ink);
    }
    // seat cushion
    for (let y = 22; y < 28; y++) for (let x = 9; x < 24; x++) set(x, y, y === 22 ? li : ba);
    // the backrest (leaning back to the east), stitched
    for (let y = 3; y < 31; y++) {
      const kk = ((30 - y) / 27) * lean;
      const xl = Math.round(20 - lean + kk * 5);
      const xr = Math.round(28 + kk * 3);
      for (let x = xl; x <= xr; x++) set(x, y, x === xl ? li : x >= xr - 1 ? dkc : ba);
      if (y % 2 === 0 && y > 8 && y < 28) set(Math.round(24 - lean + kk * 5), y, dkc);
    }
    // the hood over the head, curving forward
    const hx = 25 + lean * 1.5;
    for (let y = 0; y < 7; y++)
      for (let x = 18; x < 32; x++) {
        const dx = (x - hx) / 6.2;
        const dy = (y - 5) / 5.2;
        if (dx * dx + dy * dy <= 1) set(x, y, y < 2 ? li : x < hx - 3.5 ? li : x > hx + 2.5 ? dkc : ba);
      }
    for (let x = Math.round(hx - 6); x < Math.round(hx - 1); x++) set(x, 6, dkc);
    // the big arm pod in front of the seat (air-bag seams, the control panel on top)
    const inPod = (x: number, y: number) => Math.abs((x - 17) / 7.6) ** 3 + Math.abs((y - 19) / 6.2) ** 3 <= 1;
    for (let y = 13; y < 26; y++)
      for (let x = 10; x < 27; x++) {
        if (inPod(x, y)) set(x, y, y <= 15 ? li : x <= 11 ? li : x >= 23 || y >= 23 ? dkc : ba);
        else if (inPod(x - 1, y) && has(x, y)) set(x, y, P.ink);
      }
    for (let x = 12; x < 23; x++) set(x, 19, dkc);
    for (const [x, y] of [[15, 20], [15, 21], [19, 20], [19, 21]] as const) set(x, y, dkc);
    for (let x = 14; x < 20; x++) set(x, 14, P.steel);
    set(15, 14, P.vermLt);
    set(17, 14, P.leafYoung);
    // the remote on its curly cord
    set(24, 17, P.white);
    set(24, 18, P.white);
    for (let j = 0; j < 4; j++) set(25 + (j % 2), 19 + j, P.charcoal);
    // 『お試し中』 card hanging from the pod
    for (let y = 24; y < 29; y++) for (let x = 12; x < 18; x++) set(x, y, P.gold);
    for (let x = 13; x < 17; x++) set(x, 26, P.vermShade);
    set(14, 23, P.charcoal);
    set(15, 23, P.charcoal);
    switch (look.extra) {
      case 'towel':
        for (let x = Math.round(hx - 4); x < Math.round(hx + 4); x++) {
          set(x, 1, P.white);
          set(x, 2, P.white);
          set(x, 3, P.aqua);
        }
        set(Math.round(hx - 5), 3, P.white);
        set(Math.round(hx - 5), 4, P.white);
        break;
      case 'bag':
        for (let y = 9; y < 15; y++) for (let x = 20; x < 26; x++) set(x, y, y === 9 ? P.leafLt : P.leafYoung);
        p.line(21, 9 + d, 22, 6 + d, P.leafDeep);
        p.line(24, 9 + d, 23, 6 + d, P.leafDeep);
        break;
      case 'note':
        for (let y = 8; y < 15; y++) for (let x = 25; x < 30; x++) set(x, y, P.white);
        for (let x = 26; x < 29; x++) set(x, 10, P.verm);
        for (let x = 26; x < 28; x++) set(x, 12, P.verm);
        set(27, 7, P.goldPale);
        break;
    }
  }, (p) => finish(p, { soft: true }));
}

registerProp('mall_massage_chair', (opts) => {
  const v = Number(opts.v ?? 0);
  const frames = chairFrames(LOOKS[v % LOOKS.length]);
  const a = stand(frames[0], { cx: 16, base: 32, foot: 31, shadow: 0, contact: 26 });
  // 『お試し中』: they all still vibrate, each at its own beat (the broken one doesn't)
  a.img = (env) => {
    if (v === 3) return frames[0];
    const k = Math.floor((env.t + v * 170) / 90) % (7 + v);
    return frames[k === 0 || k === 2 ? 1 : 0];
  };
  return a;
});

// ---------------------------------------------------------------- body-fat scale (1,5) — reads 17

registerProp('mall_body_scale', () => {
  const p = pc(16, 40);
  // platform with foot marks
  p.rect(1, 32, 14, 6, P.white);
  p.hline(1, 14, 32, P.glint);
  p.rect(3, 34, 3, 2, P.concrete);
  p.rect(9, 34, 3, 2, P.concrete);
  p.hline(1, 14, 37, P.steel);
  // the pole and the head with handles and the LCD
  p.rect(6, 10, 3, 22, P.concreteLt);
  p.vline(6, 10, 31, P.white);
  p.rect(2, 2, 12, 9, P.white);
  p.hline(2, 13, 2, P.glint);
  p.rect(4, 4, 8, 5, P.navy);
  p.rect(0, 5, 2, 5, P.steel);
  p.rect(14, 5, 2, 5, P.steel);
  finish(p, { soft: true });
  const img = p.toCanvas();
  const a = stand(img, { base: 16, contact: 12, shadow: 0 });
  a.glow = (g: Gfx, x: number, y: number, env: PropEnv) => {
    // 『17』 on the pale blue LCD
    const ox = x + a.ox + 4;
    const oy = y + a.oy + 4;
    g.rect(ox, oy, 8, 5, P.glow, 0.25);
    const on = Math.floor(env.t / 1400) % 6 !== 5;
    if (on) {
      // "1" and "7"
      g.rect(ox + 2, oy + 1, 1, 3, P.aqua, 0.95);
      g.rect(ox + 4, oy + 1, 3, 1, P.aqua, 0.95);
      g.rect(ox + 6, oy + 2, 1, 2, P.aqua, 0.95);
    }
  };
  return a;
});

// ---------------------------------------------------------------- the hanging bar (4,9) with clothes pegs left on it

registerProp('mall_burasagari', () =>
  prop(18, 44, (p) => {
    // two splayed legs, a top bar with foam grips
    p.line(2, 43, 5, 4, P.steel);
    p.line(3, 43, 6, 4, P.concreteLt);
    p.line(15, 43, 12, 4, P.asphalt);
    p.line(14, 43, 11, 4, P.steel);
    p.rect(1, 2, 16, 3, P.concreteLt);
    p.hline(1, 16, 2, P.white);
    p.hline(1, 16, 4, P.steel);
    p.rect(2, 2, 3, 3, P.charcoal);
    p.rect(13, 2, 3, 3, P.charcoal);
    // the pegs someone left after drying laundry on it
    for (const [px, c] of [[6, P.red], [8, P.gold], [10, P.aqua], [12, P.leafYoung]] as const) {
      p.rect(px, 4, 1, 4, c);
      p.set(px, 7, dk(c));
    }
    // cross brace and feet
    p.hline(4, 13, 30, P.steel);
    p.rect(0, 42, 6, 2, P.charcoal);
    p.rect(12, 42, 6, 2, P.charcoal);
  }, { base: 16, contact: 14, shadow: 0 }),
);

// ---------------------------------------------------------------- the foot-acupressure mat (7,7)

registerProp('mall_foot_mat', () => {
  const p = pc(16, 14);
  p.rect(0, 1, 16, 13, P.leafDeep);
  p.strokeRect(0, 1, 16, 13, P.leafShade);
  for (let j = 3; j < 13; j += 3)
    for (let i = 2; i < 15; i += 3) {
      p.set(i + ((j / 3) % 2), j, P.leafYoung);
      p.set(i + ((j / 3) % 2), j + 1, P.leaf);
    }
  return { ox: 0, oy: 1, w: 16, h: 14, foot: 0, flat: true, img: () => p.toCanvas() } as PropArt;
});

// ---------------------------------------------------------------- QA round 3: the carpet's bare corners

/**
 * (1,11) the 『健康まつり』 banner (のぼり) blown over and never picked up:
 * the yellow cloth lying on its side along its pole, the lettering running
 * sideways, the water-filled base tipped over at the far end; creases, the
 * dust of a year and a shoe print across it.
 */
registerProp('mall_fallen_nobori', () => {
  const W = 58;
  const p = pc(W, 20);
  // the cloth: x 4–47, y 5–15, a red band along the edge that hung free
  for (let y = 5; y <= 15; y++)
    for (let x = 4; x <= 47; x++) {
      let c: string = y >= 14 ? P.red : P.gold;
      if (y === 5) c = P.goldPale;
      if (y === 15) c = P.vermShade;
      p.set(x, y, c);
    }
  // the red sun mark at the banner's top, then 『まつり』 written top to
  // bottom, now lying on its side (the rest of 『健康まつり 本日かぎり』 is
  // folded under)
  p.ellipse(9.5, 9.5, 3.5, 3.5, P.verm);
  p.set(8, 8, P.vermLt);
  const word = 'まつり';
  const t = pc(8, word.length * 10);
  [...word].forEach((ch, k) => fontTextSmall(t, ch, 0, k * 10, P.verm, 1));
  for (let y = 0; y < t.h; y++)
    for (let x = 0; x < t.w; x++) {
      if (!(t.get(x, y) >>> 24)) continue;
      // rotate a quarter turn anticlockwise: the banner's top is at the left
      p.set(16 + y, 5 + (t.w - 1 - x), P.verm);
    }
  // creases where it folded as it fell, dust settled on the upper half
  for (const [x0, len] of [[17, 6], [31, 5], [40, 7]] as const) for (let k = 0; k < len; k++) p.set(x0 + Math.floor(k / 2), 6 + k, P.brass);
  for (let x = 4; x <= 47; x++) if (ihash(x, 3, 7707) % 4 === 0) p.set(x, 6 + (ihash(x, 5, 7707) % 3), P.concreteLt);
  for (const [sx, sy] of [[25, 8], [26, 9], [27, 9], [25, 10], [28, 10], [26, 11], [27, 11]] as const) p.set(sx, sy, P.steel);
  // the pole along the cloth's attached side, the short top bar at the left
  p.hline(2, 51, 4, P.concreteLt);
  p.hline(2, 51, 3, P.white);
  p.vline(3, 3, 15, P.concreteLt);
  p.vline(4, 4, 15, P.steel);
  p.set(3, 2, P.steel);
  // the tipped base: a black plastic tank on its side, its filler cap
  p.rect(49, 1, 8, 11, P.charcoal);
  p.hline(49, 56, 1, P.asphalt);
  p.vline(49, 1, 11, P.asphalt);
  p.rect(51, 12, 4, 2, P.charcoal);
  p.set(52, 12, P.verm);
  p.hline(49, 56, 11, P.ink);
  // its shadow on the carpet
  p.hline(4, 48, 16, P.shade);
  p.hline(49, 56, 14, P.shade);
  castRight(p, 49, 1, 8, 11, 1);
  return flat(p.toCanvas(), 0, -2);
});

/**
 * (11,10) the free-sample table: a folding table in a white cloth, the big
 * jug of 青汁 gone dark, the paper cups all turned down, a stack of leaflets
 * and the 『ご自由に どうぞ』 card.
 */
registerProp('mall_sample_stand', () =>
  prop(22, 30, (p) => {
    // (22 wide, anchored so it keeps clear of the roped dais to the west)
    // legs under the cloth, the cloth's drape with a scalloped hem
    p.vline(4, 22, 28, P.steel);
    p.vline(17, 22, 28, P.asphalt);
    p.rect(1, 13, 20, 10, P.white);
    p.hline(1, 20, 13, P.glint);
    p.hline(1, 20, 14, P.concreteLt);
    for (let x = 1; x <= 20; x++) {
      p.set(x, 22, x % 4 === 2 ? P.concreteLt : P.white);
      if (x % 4 === 0) p.vline(x, 16, 21, P.concreteLt);
    }
    p.vline(20, 14, 22, P.concrete);
    // the jug (clear plastic, the green gone dark at the bottom), its tap
    p.rect(2, 3, 6, 10, P.aqua);
    p.rect(3, 6, 4, 7, P.leafDeep);
    p.rect(3, 10, 4, 3, P.leafShade);
    p.vline(2, 4, 11, P.glint);
    p.rect(3, 1, 4, 2, P.leaf);
    p.set(8, 11, P.steel);
    // the cups, all turned down
    for (const [cx, cy] of [[10, 9], [13, 9], [16, 9], [11, 11], [14, 11], [17, 11]] as const) {
      p.rect(cx, cy, 2, 2, P.white);
      p.set(cx, cy, P.glint);
      p.set(cx + 1, cy + 1, P.concrete);
    }
    // leaflets and the card
    p.rect(9, 3, 5, 4, P.leafYoung);
    p.hline(9, 13, 3, P.leafLt);
    p.hline(10, 12, 5, P.white);
    p.rect(15, 2, 6, 5, P.paper);
    p.hline(16, 19, 3, P.verm);
    p.hline(16, 18, 5, P.steel);
    p.set(15, 7, P.woodLt);
    castRight(p, 1, 13, 20, 10, 2);
  }, { cx: 11, base: 16, contact: 18, shadow: 0 }),
);

/**
 * (9–12,11) the massage chairs' cords: grey, black and white leads snaking
 * over the carpet from the chairs, taped down with yellow-and-black tape,
 * a spare coil, the power strip with its switch lamp still red. The leads
 * twitch where they leave the chairs while the chairs hum.
 */
registerProp('mall_cord_bundle', () => {
  const W = 66;
  const p = pc(W, 14);
  const cords: [number, string][] = [[5, P.charcoal], [7, P.steel], [9, P.white]];
  for (const [y0, c] of cords) {
    let y = y0;
    for (let x = 20; x < W; x++) {
      // a lazy wander, all three bundled under the tape
      const bundled = (x >= 30 && x <= 34) || (x >= 48 && x <= 51);
      const target = bundled ? 6 + (y0 - 5) / 2 : y0 + Math.round(Math.sin(x / 7 + y0) * 2);
      if (x % 3 === 0) y += Math.sign(target - y);
      p.set(x, y, c);
      p.set(x, y + 1, dk(c));
    }
  }
  // the tape strips across the bundle
  for (const tx of [31, 49]) {
    for (let j = 3; j <= 11; j++) {
      p.set(tx, j, (j >> 1) % 2 ? P.ink : P.gold);
      p.set(tx + 1, j, (j >> 1) % 2 ? P.gold : P.ink);
    }
    p.hline(tx, tx + 1, 12, P.shade);
  }
  // a spare coil of white lead
  p.ring(42, 11, 4, 2, P.white);
  p.ring(42, 11, 3, 1.4, P.concrete);
  // the power strip: white, four sockets, the switch
  p.rect(4, 4, 16, 6, P.white);
  p.hline(4, 19, 4, P.glint);
  p.hline(4, 19, 9, P.concrete);
  for (let k = 0; k < 3; k++) {
    p.set(8 + k * 4, 6, P.charcoal);
    p.set(9 + k * 4, 6, P.charcoal);
    p.set(8 + k * 4, 7, P.asphalt);
  }
  p.rect(5, 6, 2, 2, P.vermShade);
  // its own lead to the wall socket beyond the west
  p.hline(0, 4, 7, P.charcoal);
  p.hline(0, 4, 8, P.ink);
  p.hline(4, 20, 10, P.shade);
  const img = p.toCanvas();
  const a = flat(img, 0, 2);
  a.over = (g: Gfx, x: number, y: number, env: PropEnv) => {
    // the leads twitch at the chairs' end on their hum (mall_massage_chair v 0's beat)
    const k = Math.floor(env.t / 90) % 7;
    if (k === 0 || k === 2) {
      g.rect(x + W - 5, y + 2 + 6, 4, 1, P.charcoal);
      g.rect(x + W - 4, y + 2 + 9, 3, 1, P.white);
    }
  };
  a.glow = (g: Gfx, x: number, y: number) => {
    // the switch lamp
    g.rect(x + 5, y + 2 + 6, 2, 2, P.red, 0.8);
    g.rect(x + 4, y + 2 + 5, 4, 4, P.red, 0.18);
  };
  return a;
});

void ihash;
void lt;
void PixelCanvas;
