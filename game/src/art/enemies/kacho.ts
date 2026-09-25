// ヘノヘノ課長 (48×72, 51 8.2): the scarecrow of the terraces in Tome-jii's
// old navy suit — 「鳥獣対策課 課長」. One bamboo leg in a little mound of
// earth, a bamboo crossbar through the sleeves with straw tufting out of the
// cuffs, two old CDs hanging from each end (the rainbow cycling on them), a
// straw hat with a faded red ribbon, and a face that is a white cloth with
// へのへのもへじ brushed on in ink — redrawn for every move. Lit by the
// lantern low on the left; starlight on the hat.
//
// Faces: normal, kento (前向きに検討), komatta (the ハトの名刺 / ボケ負け),
// he (only 「へ」 left at 30% HP), sleep (休憩).

import { BAYER4, PixelCanvas } from '../../engine/pixel';
import { hash2 } from '../../engine/rng';
import { registerEnemyArt, loop, type EnemyArt, type EnemyView } from './index';
import { Mask, mixU32 } from './lib';
import { INK, nightFinish, nshade } from './night';

const W = 64;
const H = 86;
const OX = 8;
const OY = 10;

const SUIT = ['#141A2C', '#1E2640', '#26304C', '#2F3A5A', '#3C4A6E', '#4A5A7A'];
const BAMBOO = ['#6A5A34', '#8A7A4A', '#A8985E', '#C8B87A', '#DCCE96'];
const STRAW = ['#8A6A34', '#B89848', '#D8B868', '#E8C878', '#F6DC9A'];
const CLOTH = ['#A8A294', '#C8C2B4', '#E2DED2', '#F4F1E8'];
const RAINBOW = ['#E0567A', '#FFD23F', '#5FA85A', '#4AA8E0'];

type Face = 'normal' | 'kento' | 'komatta' | 'he' | 'sleep' | 'blank';

interface Pose {
  view: 'front' | 'side' | 'back';
  face: Face;
  hop?: number;
  /** Head nod (rest) / lean. */
  nod?: number;
  /** The bamboo leg bends (hurt): px at the top. */
  bend?: number;
  /** Stiff: 1px shiver lines at the sides. */
  stiff?: boolean;
  /** CD spin phase (0..3) and palette-cycle step. */
  cd: number;
  cyc: number;
  /** A CD flashes a white cross (glint): which (0..3), −1 none. */
  glint?: number;
  /** Brush out of the breast pocket, drawing (0..5), −1 none. */
  brush?: number;
  /** Crossbar swung toward the camera (the spin's hit). */
  swing?: number;
}

function build(o: Pose): PixelCanvas {
  const p = new PixelCanvas(W, H);
  const hop = o.hop ?? 0;
  const bend = o.bend ?? 0;
  const X = (v: number) => Math.round(v + OX);
  const Y = (v: number) => Math.round(v + OY - hop);
  const side = o.view === 'side';
  const back = o.view === 'back';
  // ---- the mound of earth and the leg ----
  const mound = new Mask(W, H).ellipse(X(24), Y(71) + hop, 8, 3);
  nshade(p, mound, ['#2A1E14', '#3A2A1E', '#4A3A2A', '#6B5A4A'], { base: 0.5 });
  for (let x = X(18); x < X(31); x++) if (hash2(x, 3, 71) < 0.3 && p.alpha(x, Y(69) + hop)) p.set(x, Y(69) + hop, '#6B5A4A');
  const leg = new Mask(W, H);
  for (let y = 46; y <= 70; y++) {
    const k = (70 - y) / 24;
    const lx = 23 + Math.round(bend * k * k);
    leg.rect(X(lx), Y(y) + (y > 66 ? hop : 0), 3, 1);
  }
  nshade(p, leg, BAMBOO, { mode: 'cyl', cx: X(24), rx: 2, base: 0.55, k: 0.7 });
  for (let y = 50; y <= 66; y += 12) p.hline(X(23 + Math.round(bend * ((70 - y) / 24) ** 2)), X(25 + Math.round(bend * ((70 - y) / 24) ** 2)), Y(y), '#8A7A4A');
  // ---- the suit (torso) ----
  const tw = side ? 7 : 13;
  const torso = new Mask(W, H);
  for (let y = 22; y <= 48; y++) {
    const k = (y - 22) / 26;
    const hw = tw + (k < 0.2 ? -2 + k * 10 : 0) - (k > 0.85 ? (k - 0.85) * 12 : 0);
    torso.rect(X(24 - hw + (o.nod ?? 0) * (1 - k) * 0.5), Y(y), Math.round(hw * 2), 1);
  }
  nshade(p, torso, SUIT, { mode: 'cyl', cx: X(23), rx: tw + 2, base: 0.5, k: 0.6, dither: 0.5 });
  if (!back && !side) {
    // shirt V, lapels, the faded tie, the name tag in the breast pocket
    for (let y = 23; y < 33; y++) {
      const hw = Math.max(0, 5 - Math.floor((y - 23) / 2));
      p.hline(X(24 - hw), X(24 + hw - 1), Y(y), '#E8E4D8');
      p.set(X(24 - hw - 1), Y(y), '#24304A');
      p.set(X(24 + hw), Y(y), '#24304A');
      if (hw > 0) p.set(X(24 - hw), Y(y), '#C8C2B4');
    }
    p.rect(X(23), Y(25), 2, 9, '#8A5A3A');
    p.set(X(23), Y(25), '#A87A4A');
    p.set(X(23), Y(34), '#6A3A2A');
    p.set(X(24), Y(34), '#6A3A2A');
    p.rect(X(28), Y(29), 8, 4, '#F4F1E8');
    p.hline(X(29), X(34), Y(30), INK);
    p.hline(X(29), X(32), Y(31), INK);
    // buttons and a crease
    p.set(X(24), Y(38), '#8E95A6');
    p.set(X(24), Y(43), '#8E95A6');
    for (let y = 36; y < 47; y++) if (y % 3) p.set(X(20), Y(y), '#1E2640');
  } else if (back) {
    // the back seam and a patch at the shoulder blade
    for (let y = 24; y < 48; y++) p.set(X(24), Y(y), '#1E2640');
    p.rect(X(28), Y(30), 5, 4, '#3C4A6E');
    p.hline(X(28), X(32), Y(30), '#4A5A7A');
  }
  // ---- the crossbar and the sleeves ----
  const swing = o.swing ?? 0;
  if (!side) {
    const bar = new Mask(W, H).rect(X(2 - swing), Y(24), 44 + swing * 2, 3);
    nshade(p, bar, BAMBOO, { mode: 'bevel', base: 0.6, k: 0.6 });
    for (const nx of [6, 18, 30, 42]) p.vline(X(nx), Y(24), Y(26), '#8A7A4A');
    // sleeves over the bar, worn at the elbows
    for (const dir of [-1, 1]) {
      const sl = new Mask(W, H);
      for (let i = 0; i < 12; i++) sl.rect(X(24 + dir * (tw - 1 + i) - (dir < 0 ? 0 : 0)), Y(22 + Math.floor(i / 6)), 1, 7 - Math.floor(i / 5));
      nshade(p, sl, SUIT, { base: dir < 0 ? 0.6 : 0.42, k: 0.5 });
      const ex = X(24 + dir * (tw + 5));
      p.set(ex, Y(25), '#4A5A7A');
      p.set(ex + dir, Y(26), '#4A5A7A');
      // straw out of the cuff
      const cx = X(24 + dir * (tw + 11));
      for (let k = 0; k < 5; k++) {
        const len = 2 + ((k * 7) % 3);
        for (let j = 0; j < len; j++) p.set(cx + dir * (j + 1), Y(22 + k) + (k > 2 ? j >> 1 : -(j >> 1)), STRAW[2 + ((k + j) % 3)]);
      }
    }
  } else {
    // side view: the bar end-on, a stub through the sleeve
    const stub = new Mask(W, H).rect(X(20), Y(23), 8, 5);
    nshade(p, stub, SUIT, { base: 0.5 });
    p.rect(X(27), Y(24), 3, 3, BAMBOO[3]);
    p.set(X(28), Y(25), BAMBOO[1]);
  }
  // ---- CDs on threads (two at each end) ----
  if (!side) {
    const cds: [number, number][] = [
      [3, 34],
      [9, 37],
      [39, 37],
      [45, 34],
    ];
    cds.forEach(([cxL, cyL], i) => {
      const cxx = X(cxL - (i < 2 ? swing : -swing));
      const cyy = Y(cyL);
      p.vline(cxx, Y(26), cyy - 5, '#E8E4D8');
      const ph = (o.cd + i) % 4;
      const hw = [4, 3, 1, 3][ph];
      for (let y = -4; y <= 4; y++) {
        const w = Math.round(hw * Math.sqrt(1 - (y * y) / 17));
        for (let x = -w; x <= w; x++) p.set(cxx + x, cyy + y, x < 0 && y > 0 ? '#E8ECF0' : '#C8CDD4');
      }
      if (hw >= 3) {
        p.set(cxx, cyy, INK);
        // the rainbow sheen (3px arc), cycling every 120ms
        for (let k = 0; k < 3; k++) p.set(cxx - 2 + k, cyy - 2 + (k === 1 ? -1 : 0), RAINBOW[(o.cyc + k + i) % 4]);
      }
      if (o.glint === i) {
        p.hline(cxx - 3, cxx + 3, cyy, '#FFF6D8');
        p.vline(cxx, cyy - 3, cyy + 3, '#FFF6D8');
      }
    });
  }
  // ---- the head: the cloth face and the straw hat ----
  const nod = o.nod ?? 0;
  const hx = 24 + Math.round(nod * 0.5);
  const hy = 6 + nod;
  const cloth = new Mask(W, H);
  const fw = side ? 7 : 10;
  for (let y = 0; y < 17; y++) {
    const hw = fw - (y > 13 ? y - 13 : 0) - (y < 2 ? 1 : 0);
    cloth.rect(X(hx - hw), Y(hy + y), hw * 2, 1);
  }
  nshade(p, cloth, CLOTH, { mode: 'bevel', base: 0.78, k: 0.35, dither: 0.1, bevel: 2 });
  // wrinkles and the knot under the chin
  for (const [wx, wy] of [[hx - 6, hy + 12], [hx + 5, hy + 3], [hx + 7, hy + 10]] as [number, number][]) if (!side) p.set(X(wx), Y(wy), '#C8C2B4');
  p.rect(X(hx - 1), Y(hy + 16), 3, 2, '#E2DED2');
  p.set(X(hx + 2), Y(hy + 18), '#C8C2B4');
  if (!back && !side) drawFace(p, X(hx), Y(hy), o.face);
  if (side && o.face !== 'blank') {
    // profile: one 「の」 and the edge of 「へ」
    p.set(X(hx - 5), Y(hy + 5), INK);
    p.hline(X(hx - 6), X(hx - 4), Y(hy + 3), INK);
    p.set(X(hx - 6), Y(hy + 11), INK);
  }
  // straw hat: crown and a wide brim, woven, with a red ribbon
  const hat = new Mask(W, H);
  hat.ellipse(X(hx), Y(hy + 1), side ? 11 : 14, 3);
  hat.ellipse(X(hx), Y(hy - 3), 7, 4);
  nshade(p, hat, STRAW, { mode: 'bevel', base: 0.6, k: 0.55 });
  hat.each((x, y) => {
    if ((x + y * 2) % 4 === 0 && BAYER4[y & 3][x & 3] > 6) p.set(x, y, '#D8B868');
  });
  p.hline(X(hx - 7), X(hx + 6), Y(hy - 1), '#8A2E3A');
  p.hline(X(hx - 6), X(hx + 5), Y(hy), '#6A1E2A');
  p.set(X(hx - 7), Y(hy - 1), '#A8404C');
  // the brush out of the breast pocket, redrawing the face
  if (o.brush !== undefined && o.brush >= 0 && !back) {
    const k = o.brush;
    const bx = X(30 - k);
    const by = Y(29 - k * 3);
    p.line(bx, by, bx + 3, by + 5, '#6A4A2A');
    p.rect(bx - 1, by - 2, 2, 3, INK);
    p.set(bx - 1, by - 3, '#3A3456');
  }
  nightFinish(p, 0.5, 0.45, (x, y) => y >= Y(hy + 2) && y <= Y(hy + 15) && x > X(hx - 9) && x < X(hx + 9));
  if (o.stiff) {
    // こわばり: two short tense lines either side
    for (const dx of [-17, 17]) {
      p.vline(X(24 + dx), Y(30), Y(33), '#F4F1E8');
      p.vline(X(24 + dx + Math.sign(dx) * 2), Y(29), Y(34), '#C8C2B4');
    }
  }
  return p;
}

/**
 * へのへのもへじ brushed on the cloth (20×17), one set per expression:
 * へ・へ the brows, の・の the eyes, も the nose, へ the mouth, じ the jaw on
 * the right with its two dots. '#' ink, 'g' ink that has run.
 */
const FACES: Record<Exclude<Face, 'blank'>, string[]> = {
  normal: [
    '....................',
    '...#..........#.....',
    '..#.#........#.#....',
    '.#...#......#...#...',
    '....................',
    '..###........###....',
    '.#.#.#......#.#.#...',
    '.#.#.#......#.#.#...',
    '.#..#.......#..#....',
    '..##.........##..#.#',
    '........#........#..',
    '.......###.......#..',
    '........#........#..',
    '.......###......#...',
    '......#...#...##....',
    '.....#.....#........',
    '....................',
  ],
  kento: [
    '...#..........#.....',
    '..#.#........#.#....',
    '.#...#......#...#...',
    '....................',
    '....................',
    '..###........###....',
    '.#.#.#......#.#.#...',
    '.#.#.#......#.#.#...',
    '.#..#.......#..#....',
    '..##.........##..#.#',
    '........#........#..',
    '.......###.......#..',
    '........#........#..',
    '.......###......#...',
    '..............##....',
    '.....#######........',
    '....................',
  ],
  komatta: [
    '....................',
    '....................',
    '.##..........##.....',
    '...##......##.......',
    '....................',
    '..###........###....',
    '.#..##......#..##...',
    '.#.#.#......#.#.#...',
    '..#..#.......#..#...',
    '...##.........##.#.#',
    '........#........#..',
    '.......###.......#..',
    '........#........#..',
    '.......###......#...',
    '.....#.#.#.#..##....',
    '....#.#.#.#.#.......',
    '....................',
  ],
  he: [
    '....................',
    '...#................',
    '..#.#...............',
    '.#...#......g.......',
    '....................',
    '...............g....',
    '....g...............',
    '....................',
    '.........g..........',
    '..................g.',
    '........g...........',
    '....................',
    '...........g........',
    '....................',
    '......g.............',
    '....................',
    '....................',
  ],
  sleep: [
    '....................',
    '...#..........#.....',
    '..#.#........#.#....',
    '.#...#......#...#...',
    '....................',
    '....................',
    '.#####......#####...',
    '....................',
    '....................',
    '.................#.#',
    '........#........#..',
    '.......###.......#..',
    '........#........#..',
    '.......###......#...',
    '..............##....',
    '......####..........',
    '....................',
  ],
};

function drawFace(p: PixelCanvas, cx: number, top: number, face: Face): void {
  if (face === 'blank') return;
  FACES[face].forEach((row, y) =>
    [...row].forEach((v, x) => {
      if (v === '#') p.set(cx - 10 + x, top + y, INK);
      else if (v === 'g') p.set(cx - 10 + x, top + y, '#8E95A6');
    }),
  );
}

let restoredC: HTMLCanvasElement | null = null;
/** The scarecrow standing in the paddy again (16×32), facing the field. */
function restored(): HTMLCanvasElement {
  if (restoredC) return restoredC;
  const p = new PixelCanvas(18, 32);
  p.vline(8, 14, 30, '#C8B87A');
  p.vline(9, 14, 30, '#8A7A4A');
  p.rect(1, 11, 16, 2, '#C8B87A');
  p.rect(4, 10, 10, 11, '#2F3A5A');
  p.vline(8, 11, 15, '#E8E4D8');
  p.rect(5, 3, 8, 7, '#F4F1E8');
  p.set(6, 5, INK);
  p.set(10, 5, INK);
  p.hline(7, 9, 8, INK);
  p.rect(3, 2, 12, 2, '#E8C878');
  p.rect(6, 0, 6, 2, '#E8C878');
  p.hline(6, 11, 2, '#8A2E3A');
  p.rect(6, 29, 6, 2, '#4A3A2A');
  p.set(1, 14, '#C8CDD4');
  p.set(16, 14, '#C8CDD4');
  p.outline(INK);
  restoredC = p.toCanvas();
  return restoredC;
}

registerEnemyArt('enemy_henoheno_kacho', (): EnemyArt => {
  const cache = new Map<string, HTMLCanvasElement>();
  const get = (o: Pose): HTMLCanvasElement => {
    const key = JSON.stringify(o);
    let c = cache.get(key);
    if (!c) {
      c = build(o).toCanvas();
      cache.set(key, c);
      if (cache.size > 400) cache.delete(cache.keys().next().value!);
    }
    return c;
  };
  const baseFace = (v: EnemyView): Face => {
    if (v.flags.kyuukei) return 'sleep';
    if (v.flags.bokemake) return 'komatta';
    if (v.hpRate <= 0.3) return 'he';
    return 'normal';
  };
  return {
    id: 'enemy_henoheno_kacho',
    w: W,
    h: H,
    ox: OX,
    oy: OY,
    frame(v: EnemyView): HTMLCanvasElement {
      const cd = loop(v.gt, 160, 4);
      const cyc = Math.floor(v.gt / 120) % 4;
      const face = baseFace(v);
      if (v.pose === 'hurt') {
        const k = Math.min(2, Math.floor(v.t / 80));
        return get({ view: 'front', face: face === 'he' ? 'he' : 'komatta', bend: [3, -2, 0][k], cd, cyc });
      }
      if (v.pose === 'redraw' || (v.pose === 'windup' && v.skill === 'skill_heno_kaonaoshi')) {
        // the brush redraws the face in 6 frames (the face is blank in between)
        const k = Math.min(5, Math.floor(v.t / 60));
        return get({ view: 'front', face: k < 2 ? face : k < 4 ? 'blank' : 'normal', brush: k, cd, cyc });
      }
      if (v.pose === 'spin' || (v.pose === 'attack' && v.skill === 'skill_heno_kaonaoshi')) {
        // one turn on the leg: front / side / back / side, then the bar at the camera
        const k = Math.min(4, Math.floor(v.t / 70));
        const views: Pose['view'][] = ['side', 'back', 'side', 'front', 'front'];
        return get({ view: views[k], face: 'normal', cd, cyc, swing: k === 4 ? 3 : 0, hop: k % 2 });
      }
      if (v.pose === 'stiff' || (v.pose === 'windup' && v.skill === 'skill_heno_tachippanashi') || (v.flags.defUp ?? 0) >= 2) {
        return get({ view: 'front', face: 'kento', stiff: true, cd: 0, cyc });
      }
      if (v.pose === 'glint' || ((v.pose === 'windup' || v.pose === 'attack') && v.skill === 'skill_heno_toriodoshi')) {
        const k = loop(v.t, 90, 4);
        return get({ view: 'front', face: 'kento', glint: v.pose === 'attack' ? 1 : k, cd: k, cyc });
      }
      if (v.pose === 'trouble') return get({ view: 'front', face: 'komatta', cd, cyc, hop: loop(v.t, 150, 2) });
      if (v.pose === 'refuse') return get({ view: loop(v.t, 100, 2) ? 'side' : 'front', face: 'kento', cd, cyc });
      if (v.flags.kyuukei || v.pose === 'rest') {
        // dozing: the head nods 2px (2f × 500ms)
        return get({ view: 'front', face: 'sleep', nod: loop(v.gt, 500, 2) * 2, cd: 0, cyc: 0 });
      }
      if (v.pose === 'idleact' || v.pose === 'windup' || v.pose === 'attack') return get({ view: 'front', face: 'kento', cd, cyc, hop: 1 });
      // idle: a 2px hop on the leg (4f × 180ms), the CDs turning
      const f = loop(v.gt, 180, 4);
      return get({ view: 'front', face, hop: [0, 1, 2, 1][f], cd, cyc });
    },
    restored,
    gallery: [
      { pose: 'idle' },
      { pose: 'redraw', t: 200 },
      { pose: 'spin', t: 80 },
      { pose: 'stiff' },
      { pose: 'glint', t: 0 },
      { pose: 'hurt', t: 0 },
      { pose: 'trouble' },
      { pose: 'rest', flags: { kyuukei: 1 } },
    ],
  };
});
