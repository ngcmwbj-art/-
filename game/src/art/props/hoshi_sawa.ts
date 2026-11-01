// 沢の上「水の 元」の小物 (map_hoshi_sawa, 52_ch2_level_art 4.6・7.3、02 #65) と、
// 棚田のいちばん上の電気柵の戸 (map_hoshimidai (14,1))。
//
//  prop_h_sawa_gate      電気柵の戸（1マス）。東のゲートと同じ作り：2本の線と黄色い
//                        取っ手。flag_ch2_sawa_open で取っ手が柱にかかる。
//  prop_h_sawa_iwa       苔の岩（v 0–3）。sandal: 子どものビーチサンダルが片方。
//  prop_h_sawa_tobiishi  飛び石（水の上、平ら。v 0 は上がすり減っている）。
//  prop_h_sawa_seki_ishi セキトメがほどけたあとの飛び石の列 (14–17,11)。石のあいだを
//                        水がいきおいよく流れる（しぶき、3コマ）。
//  prop_h_sawa_dry       せきの下の沢：セキトメの前は水が細く、底の石が出ている。
//  prop_h_wakimizu       わき水 (16–18,1–3)：岩にかこまれた澄んだ水。水面が湧いて
//                        輪がひろがる。まわりをほんのり照らす（light）。
//  prop_h_sawa_stars     星（光の層）：わき水の水面に1つずつ生まれて、沢を下る。
//                        セキトメの前はプールにたまって、ゆっくり回るだけ。
//  prop_h_sawa_hokora    水神の石のほこら（お供えの米つぶ）。
//  prop_h_sawa_kui       点検道の杭（白い札）。
//  prop_h_sawa_taore     倒れた杉（沢にかかる。根もとの土、苔、しずく）。
//  prop_h_sawa_fuda      プールの札（棒に段ボール、マーカーの字の線）。
//  prop_h_sawa_ishi      名前の石（岸に平たい石。ときどき光る）。
//
// 絵は昼の色で描き、夜はグレーディングにまかせる（52 7章）。星とわき水の輪は
// 光の層に置くので、暗がりでも見える。夜の沢をこわくしない（53 1.7・00）。

import type { Gfx } from '../../engine/gfx';
import { PixelCanvas } from '../../engine/pixel';
import { ihash, valueNoise } from '../tiles/noise';
import { P } from '../tiles/palette';
import { outline } from './kit';
import { drawLight, poolEllipse } from './light';
import { paintFrames, standProp } from './hoshi_kit';
import { registerProp } from './registry';
import type { PropEnv } from './types';

const SEKI = 'sym_hoshi_sawa_02';
/** セキトメ is undone (its symbol taken): the stream runs full. */
const flowing = (env: PropEnv) => env.flag('flag_ch2_sawa_seki') > 0;

// ---------------------------------------------------------------- 電気柵の戸 (village (14,1))

registerProp('prop_h_sawa_gate', () => {
  const make = (open: boolean) => {
    const p = new PixelCanvas(24, 28);
    const base = 22;
    const wire = P.concrete;
    // the two posts at the tile's edges (canvas 3 and 19)
    for (const px of [3, 19]) {
      p.vline(px, base - 11, base, P.white);
      p.vline(px + 1, base - 11, base, P.steel);
      p.set(px + 1, base - 3, P.ink);
      p.set(px + 1, base - 6, P.ink);
    }
    const handle = (x: number, y: number) => {
      p.rect(x, y, 4, 2, P.gold);
      p.hline(x, x + 3, y, P.goldPale);
      p.set(x + 4, y + 1, P.ink);
    };
    if (!open) {
      for (let x = 5; x < 19; x++) {
        p.set(x, base - 3, wire);
        p.set(x, base - 6, wire);
      }
      handle(10, base - 7);
      handle(10, base - 4);
    } else {
      // the handles hooked on the west post, the wires slack along it
      for (let y = base - 6; y <= base; y++) p.set(5, y, wire);
      p.line(5, base - 6, 8, base - 1, wire);
      handle(5, base - 8);
      handle(5, base - 5);
      for (let y = base - 6; y < base; y += 2) p.set(18, y, P.concreteLt);
    }
    return p.toCanvas();
  };
  const shut = make(false);
  const open = make(true);
  return { ox: -4, oy: 16 - 26, w: 24, h: 28, foot: 14, img: (env) => (env.flag('flag_ch2_sawa_open') ? open : shut), contact: 0 };
});

// ---------------------------------------------------------------- 苔の岩

/** A mossy boulder (18×16): rounded grey stone lit top-left, moss on its crown, the water's line at its foot. */
registerProp('prop_h_sawa_iwa', (opts) => {
  const v = Number(opts.v ?? 0) % 4;
  const sandal = !!opts.sandal;
  return standProp(
    20,
    18,
    (p) => {
      const cx = 10 + (v === 1 ? -1 : v === 3 ? 1 : 0);
      const rx = 8 - (v === 2 ? 1 : 0);
      const ry = 6 + (v === 3 ? 1 : 0);
      const cy = 11;
      for (let y = cy - ry; y <= cy + ry + 2; y++)
        for (let x = cx - rx - 1; x <= cx + rx + 1; x++) {
          const dx = (x + 0.5 - cx) / (rx + 0.5);
          const dy = (y + 0.5 - cy) / (ry + 0.5);
          // flattened at the bottom: it sits in the ground
          if (dx * dx + (dy > 0 ? dy * dy * 0.55 : dy * dy) > 1 || y > 17) continue;
          const lit = dx + dy;
          let c: string = lit < -0.9 ? P.concreteLt : lit < -0.2 ? P.concrete : lit < 0.6 ? P.steel : P.asphalt;
          if (ihash(x, y, 1301 + v) % 9 === 0) c = lit < 0 ? P.steel : P.charcoal;
          p.set(x, y, c);
        }
      // moss on the crown (not over the lit edge), a few darker tufts
      for (let x = cx - rx + 2; x <= cx + rx - 1; x++) {
        const top = cy - ry + (Math.abs(x - cx) > rx - 3 ? 2 : 0);
        const h = 1 + (ihash(x, v, 1303) % 3);
        for (let y = top; y < top + h; y++) if (p.alpha(x, y)) p.set(x, y, y === top ? P.leafYoung : ihash(x, y, 1305) % 3 ? P.leaf : P.leafShade);
      }
      // a crack
      p.line(cx + 2, cy - 1, cx + 4, cy + 3, P.charcoal);
      if (sandal) {
        // a child's beach sandal left to dry on its crown: a pink sole, the blue thong
        const sx = cx - 5;
        const sy = cy - ry - 1;
        p.rect(sx, sy, 7, 3, P.crimson);
        p.hline(sx, sx + 6, sy, P.peach);
        p.set(sx + 3, sy - 1, P.blue);
        p.set(sx + 2, sy, P.blue);
        p.set(sx + 4, sy, P.blue);
      }
    },
    { cx: 8, base: 17, soft: true, contact: 16 },
  );
});

// ---------------------------------------------------------------- 飛び石

function tobiishiImg(v: number): HTMLCanvasElement {
  const p = new PixelCanvas(14, 11);
  const cx = 7;
  const cy = 5;
  for (let y = 0; y < 11; y++)
    for (let x = 0; x < 14; x++) {
      const dx = (x + 0.5 - cx) / 6.5;
      const dy = (y + 0.5 - cy) / 4.5;
      const d = dx * dx + dy * dy;
      if (d > 1) continue;
      // the worn top (v0 is rubbed flat by the boots): a pale oval
      let c: string = d < (v === 0 ? 0.55 : 0.35) ? P.concrete : dx + dy < 0 ? P.concreteLt : P.steel;
      if (dy > 0.55) c = P.asphalt;
      if (ihash(x, y, 1311 + v) % 11 === 0) c = P.steel;
      p.set(x, y, c);
    }
  // the water's lip round its foot
  for (let x = 2; x < 12; x++) if (ihash(x, 0, 1313 + v) % 3) p.set(x, 10, P.white);
  outline(p, { bottom: false, soft: true });
  return p.toCanvas();
}

registerProp('prop_h_sawa_tobiishi', (opts) => {
  const img = tobiishiImg(Number(opts.v ?? 0));
  return { ox: 1, oy: 3, w: 14, h: 11, foot: 0, flat: true, img: () => img };
});

/** セキトメ undone: its stones laid out as four stepping stones, the stream rushing between them. */
registerProp('prop_h_sawa_seki_ishi', () => {
  const stones = [tobiishiImg(1), tobiishiImg(2), tobiishiImg(3), tobiishiImg(1)];
  const frames = paintFrames(3, 64, 16, (p, k) => {
    // white water between the stones, flowing south (3 frames)
    for (let i = 0; i < 5; i++) {
      const gx = i * 16 - 2;
      for (let y = 0; y < 16; y++)
        for (let x = gx; x < gx + 5; x++) {
          if (x < 0 || x >= 64) continue;
          const n = ihash(x, Math.floor((y + k * 3) / 2), 1321 + i);
          if (n % 3 === 0) p.set(x, y, (y + k) % 4 === 0 ? P.white : P.concreteLt);
        }
    }
  });
  return {
    ox: 0,
    oy: 0,
    w: 64,
    h: 16,
    foot: 0,
    flat: true,
    img: (env) => frames[Math.floor(env.t / 140) % 3],
    over(g: Gfx, x: number, y: number) {
      stones.forEach((s, i) => g.img(s, x + i * 16 + 1, y + 3));
    },
  };
});

// ---------------------------------------------------------------- せきの下の細い沢

/** The stream cells below the dam (x ranges by row, map_hoshi_sawa). */
const DRY: [number, number, number][] = [
  // y, x0, x1
  ...[12, 13, 14, 15, 16, 17, 18].map((y) => [y, 14, 15] as [number, number, number]),
  [19, 10, 11],
  [19, 14, 15],
  [20, 10, 11],
  [21, 9, 10],
  [22, 8, 9],
  [23, 8, 9],
  [24, 9, 10],
  [25, 9, 10],
  [26, 9, 10],
];

let dryC: HTMLCanvasElement | null = null;
/** Distance (px) from a world point to the stream's line below the dam (PATH_ALL from the crest down). */
function channelD(wx: number, wy: number): number {
  let best = 1e9;
  for (let i = DAM_AT + 1; i < PATH_ALL.length; i++) {
    const ax = PATH_ALL[i - 1][0] * 16;
    const ay = PATH_ALL[i - 1][1] * 16;
    const bx = PATH_ALL[i][0] * 16;
    const by = PATH_ALL[i][1] * 16;
    const dx = bx - ax;
    const dy = by - ay;
    const t = Math.max(0, Math.min(1, ((wx - ax) * dx + (wy - ay) * dy) / (dx * dx + dy * dy)));
    best = Math.min(best, Math.hypot(wx - ax - dx * t, wy - ay - dy * t));
  }
  return best;
}
/**
 * The bed below the dam while the water is held back (origin (8,12)): only a
 * thin thread of water (3px, a glint on it) winds down the middle; on both
 * sides the stones of the bed stand dry, darker and damp where the water
 * touches them.
 */
function dryImg(): HTMLCanvasElement {
  if (dryC) return dryC;
  const p = new PixelCanvas(8 * 16, 15 * 16);
  for (const [ty, x0, x1] of DRY) {
    for (let y = 0; y < 16; y++)
      for (let x = 0; x < (x1 - x0 + 1) * 16; x++) {
        const gx = x0 * 16 + x;
        const gy = ty * 16 + y;
        const wx = gx - 8 * 16;
        const wy = gy - 12 * 16;
        const d = channelD(gx + 0.5, gy + 0.5) + (valueNoise(gx / 6, gy / 6, 1335) - 0.5) * 2;
        if (d < 1.6) continue; // the thread of water (the ground's own water shows)
        // stones of different sizes on damp gravel; the ones by the water darker
        const cell = d < 5 ? 3 : 5;
        const cx = Math.floor(gx / cell);
        const cy = Math.floor(gy / cell);
        const h = ihash(cx, cy, 1331 + cell);
        const ox = gx - cx * cell - (h & 1);
        const oy = gy - cy * cell - ((h >>> 1) & 1);
        const r = cell - 2;
        let c: string;
        if (ox >= 0 && oy >= 0 && ox <= r && oy <= r && !(ox === r && oy === r)) {
          const lit = ox + oy;
          c = lit === 0 ? (d < 5 ? P.steel : P.concreteLt) : lit >= r * 2 - 1 ? P.charcoal : d < 5 ? P.asphalt : (h >>> 5) % 5 === 0 ? P.leafShade : P.concrete;
        } else c = d < 3 ? P.navy : ihash(gx, gy, 1333) % 3 ? P.charcoal : P.asphalt;
        p.set(wx, wy, c);
      }
  }
  dryC = p.toCanvas();
  return dryC;
}

registerProp('prop_h_sawa_dry', () => ({
  // anchored at (14,12), the bed's picture starts at (8,12)
  ox: -6 * 16,
  oy: 0,
  w: 8 * 16,
  h: 15 * 16,
  foot: 0,
  flat: true,
  img: () => dryImg(),
}));

// ---------------------------------------------------------------- わき水（水の 元）

let springC: HTMLCanvasElement | null = null;
function springImg(): HTMLCanvasElement {
  if (springC) return springC;
  // 48×48 over (16–18,1–3): a round basin of stones, the clear water, pebbles on its floor
  const p = new PixelCanvas(48, 48);
  const cx = 24;
  const cy = 22;
  for (let y = 0; y < 48; y++)
    for (let x = 0; x < 48; x++) {
      const dx = (x + 0.5 - cx) / 21;
      const dy = (y + 0.5 - cy) / 19;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d > 1.12) continue;
      if (d > 0.86) {
        // the stone rim: rounded stones, lit on the upper left, moss here and there
        const h = ihash(Math.floor(x / 4), Math.floor(y / 4), 1341);
        const lx = x % 4;
        const ly = y % 4;
        let c: string = lx + ly <= 1 ? P.concreteLt : lx + ly >= 5 ? P.charcoal : (h >>> 3) % 5 === 0 ? P.leaf : P.steel;
        if ((lx === 3 && ly === 3) || h % 7 === 0) c = P.asphalt;
        p.set(x, y, c);
        continue;
      }
      // the water: clear, the pebbles of the floor showing through (deeper in the middle)
      const peb = ihash(Math.floor(x / 3), Math.floor(y / 3), 1343);
      let c: string = d < 0.35 ? '#2F5A8A' : '#3F7AA8';
      if (peb % 5 === 0 && (x + y) % 3) c = d < 0.35 ? P.navy : '#5A8AB0';
      if (d < 0.2) c = '#274A7A';
      p.set(x, y, c);
    }
  // the outflow notch at the bottom (toward (17,4))
  for (let y = 40; y < 48; y++) for (let x = 21; x < 28; x++) p.set(x, y, (x + y) % 4 ? '#3F7AA8' : P.white);
  springC = p.toCanvas();
  return springC;
}

registerProp('prop_h_wakimizu', () => {
  const pool = poolEllipse(40, 30, '150,190,230');
  return {
    ox: 0,
    oy: 0,
    w: 48,
    h: 48,
    foot: 0,
    flat: true,
    img: () => springImg(),
    // the water wells up: rings widen from the middle (the glow layer, readable in the dark)
    glow(g: Gfx, x: number, y: number, env: PropEnv) {
      const t = env.t / 1000;
      for (let i = 0; i < 3; i++) {
        const k = ((t / 2.4 + i / 3) % 1 + 1) % 1;
        const rx = Math.round(3 + k * 15);
        const ry = Math.round(2 + k * 12);
        const a = 0.35 * (1 - k);
        g.ctx.globalAlpha = a;
        g.ctx.fillStyle = '#BDEFFA';
        for (let s = 0; s < 28; s++) {
          const ang = (s / 28) * Math.PI * 2;
          g.ctx.fillRect(Math.round(x + 24 + Math.cos(ang) * rx), Math.round(y + 22 + Math.sin(ang) * ry), 1, 1);
        }
      }
      g.ctx.globalAlpha = 1;
    },
    light(g: Gfx, x: number, y: number) {
      drawLight(g, pool, x + 24, y + 26, 0.55);
    },
  };
});

// ---------------------------------------------------------------- 星（わき水で生まれて、沢を下る）

/** The stream's middle line from the spring to the south edge (tile coords). */
const PATH_ALL: [number, number][] = [
  [17.5, 2.4],
  [17.5, 4.2],
  [17.5, 7.4],
  [16.5, 9.2],
  [15.9, 11.5],
  [15.0, 12.6],
  [15.0, 18.6],
  [13.0, 19.5],
  [11.0, 20.0],
  [10.2, 21.0],
  [9.2, 22.6],
  [9.4, 24.0],
  [10.0, 27.2],
];
/** Where the pool is on that line (before the dam is undone, the stars stay there), and the dam's crest. */
const POOL_AT = 3;
const DAM_AT = 4;

function pathLen(pts: [number, number][]): number[] {
  const out = [0];
  for (let i = 1; i < pts.length; i++) out.push(out[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]) * 16);
  return out;
}
const LENS = pathLen(PATH_ALL);

function along(s: number): [number, number] {
  for (let i = 1; i < PATH_ALL.length; i++) {
    if (s <= LENS[i]) {
      const k = (s - LENS[i - 1]) / Math.max(1e-6, LENS[i] - LENS[i - 1]);
      return [(PATH_ALL[i - 1][0] + (PATH_ALL[i][0] - PATH_ALL[i - 1][0]) * k) * 16, (PATH_ALL[i - 1][1] + (PATH_ALL[i][1] - PATH_ALL[i - 1][1]) * k) * 16];
    }
  }
  const e = PATH_ALL[PATH_ALL.length - 1];
  return [e[0] * 16, e[1] * 16];
}

registerProp('prop_h_sawa_stars', (opts) => ({
  ox: 0,
  oy: 0,
  w: 24 * 16,
  h: 27 * 16,
  foot: 0,
  flat: true,
  img: () => null,
  glow(g: Gfx, x: number, y: number, env: PropEnv) {
    const t = env.t / 1000;
    const full = flowing(env);
    // the water's surface in the dark: faint violet glints drifting downstream
    // (the pool's only shiver), so the stream reads as water, never as a hole
    const water = (opts.water as [number, number, number][] | undefined) ?? [];
    g.ctx.fillStyle = '#8E95C8';
    for (const [tx, ty, still] of water) {
      if (!full && ty >= 12) continue; // below the dam the bed is dry (prop_h_sawa_dry)
      for (let k = 0; k < 2; k++) {
        const h = ihash(tx * 2 + k, ty, 1371);
        const len = 2 + (h % 3);
        const gx = still ? (h >>> 3) % 13 + (Math.floor(t * 1.5 + k) % 2) : (h >>> 3) % 13;
        const gy = still ? (h >>> 7) % 16 : (((h >>> 7) % 16) + Math.floor(t * 12)) % 16;
        g.ctx.globalAlpha = still ? 0.22 : 0.3;
        g.ctx.fillRect(Math.round(x + tx * 16 + gx), Math.round(y + ty * 16 + gy), len, 1);
      }
    }
    g.ctx.globalAlpha = 1;
    const EVERY = 1.7;
    const SPEED = full ? 15 : 9;
    const ctx = g.ctx;
    const n0 = Math.floor(t / EVERY);
    const life = full ? LENS[LENS.length - 1] / SPEED + 1 : 26;
    for (let n = n0; n > n0 - Math.ceil(life / EVERY) - 1; n--) {
      const age = t - n * EVERY;
      if (age < 0) continue;
      let s = age * SPEED;
      let px: number;
      let py: number;
      let a = 1;
      if (!full && s > LENS[POOL_AT]) {
        // the pool: it circles slowly, fading as others come
        const tp = (s - LENS[POOL_AT]) / SPEED;
        if (tp > 18) continue;
        const ang = tp * 0.35 + (ihash(n, 0, 1351) % 628) / 100;
        const rr = 10 + (ihash(n, 1, 1353) % 18);
        px = 16 * 16 + Math.cos(ang) * rr * 1.5;
        py = 9.2 * 16 + Math.sin(ang) * rr * 0.55;
        a = Math.min(1, (18 - tp) / 4);
      } else {
        if (s > LENS[LENS.length - 1]) continue;
        [px, py] = along(s);
        // a little side-to-side as it drifts
        px += Math.sin(age * 1.7 + n) * 2;
      }
      const tw = 0.7 + 0.3 * Math.sin(t * 3 + n * 1.3);
      ctx.globalAlpha = a * tw;
      ctx.fillStyle = '#FFF6D8';
      ctx.fillRect(Math.round(x + px), Math.round(y + py), 1, 1);
      // born: a little cross for the first half second
      if (age < 0.5) {
        s = 1 - age / 0.5;
        ctx.globalAlpha = s;
        ctx.fillStyle = '#FFE7A3';
        ctx.fillRect(Math.round(x + px) - 1, Math.round(y + py), 3, 1);
        ctx.fillRect(Math.round(x + px), Math.round(y + py) - 1, 1, 3);
      }
    }
    ctx.globalAlpha = 1;
  },
}));

// ---------------------------------------------------------------- 水神のほこら

registerProp('prop_h_sawa_hokora', () =>
  standProp(
    18,
    22,
    (p) => {
      // the stone base
      p.rect(3, 15, 12, 5, P.steel);
      p.hline(3, 14, 15, P.concreteLt);
      p.hline(3, 14, 19, P.asphalt);
      // the little stone house: walls, a dark opening with the plaque, the roof slab
      p.rect(5, 8, 8, 7, P.concrete);
      p.vline(12, 8, 14, P.steel);
      p.rect(7, 10, 4, 4, P.ink);
      p.rect(8, 11, 2, 2, P.woodLt); // the wooden plaque 『水神』 (a mark, not letters)
      p.set(8, 11, P.woodDark);
      p.rect(3, 5, 12, 3, P.steel);
      p.hline(4, 13, 4, P.concreteLt);
      p.hline(3, 14, 7, P.asphalt);
      p.rect(7, 3, 4, 2, P.steel);
      // moss on the roof, the offering of rice grains on a tiny dish at its foot
      for (const x of [4, 5, 9, 12, 13]) p.set(x, 5, P.leaf);
      p.set(6, 4, P.leafYoung);
      p.rect(6, 15, 6, 1, P.white);
      p.set(7, 14, P.white);
      p.set(9, 14, P.white);
      p.set(10, 14, P.concreteLt);
    },
    { cx: 8, base: 17, soft: true, contact: 12 },
  ),
);

// ---------------------------------------------------------------- 点検道の杭

registerProp('prop_h_sawa_kui', () =>
  standProp(
    14,
    26,
    (p) => {
      p.rect(6, 8, 2, 18, P.wood);
      p.vline(6, 8, 25, P.woodLt);
      // the white board with two lines of writing and a pencil line under
      p.rect(1, 2, 12, 7, P.white);
      p.hline(1, 12, 8, P.concrete);
      p.hline(3, 10, 4, P.ink);
      p.hline(3, 8, 6, P.ink);
      p.hline(4, 9, 7, P.steel);
    },
    { cx: 8, base: 16, soft: true, contact: 6 },
  ),
);

// ---------------------------------------------------------------- 倒れた杉

registerProp('prop_h_sawa_taore', () => {
  // (6,22) → (10,22): the trunk lies across the stream, its root plate on the east bank
  const frames = paintFrames(1, 80, 30, (p) => {
    // the trunk, from the crown's stub (west, higher) to the root plate (east)
    for (let x = 2; x < 64; x++) {
      const y0 = 12 + Math.round((x / 64) * 5);
      for (let k = 0; k < 6; k++) {
        const c = k === 0 ? P.woodLt : k === 5 ? P.woodDark : ihash(x, k, 1361) % 5 ? P.wood : P.woodDark;
        p.set(x, y0 + k, c);
      }
      // moss along its top, bark grooves
      if (ihash(x, 0, 1363) % 3) p.set(x, y0, P.leaf);
      if (x % 5 === 0) p.set(x, y0 + 3, P.woodDark);
    }
    // broken branch stubs
    for (const bx of [14, 30, 45]) {
      const y0 = 12 + Math.round((bx / 64) * 5);
      p.line(bx, y0, bx - 2, y0 - 3, P.woodDark);
    }
    // the root plate standing up at the east end (dark earth and roots)
    for (let y = 4; y < 28; y++)
      for (let x = 62; x < 78; x++) {
        const dx = (x - 70) / 8;
        const dy = (y - 16) / 12;
        if (dx * dx + dy * dy > 1) continue;
        let c: string = ihash(x, y, 1365) % 4 ? P.woodDark : P.ink;
        if (ihash(x >> 1, y >> 1, 1367) % 6 === 0) c = P.wood;
        if (dx < -0.6) c = P.woodDark;
        p.set(x, y, c);
      }
    // roots poking out
    for (const [x0, y0, x1, y1] of [[64, 6, 60, 2], [74, 7, 78, 3], [76, 18, 79, 22], [66, 26, 63, 29]] as [number, number, number, number][]) p.line(x0, y0, x1, y1, P.wood);
    outline(p, { bottom: true, soft: true });
  });
  return {
    ox: 0,
    oy: -6,
    w: 80,
    h: 30,
    foot: 0,
    flat: true,
    img: () => frames[0],
    // a drop falls from the trunk into the water now and then
    over(g: Gfx, x: number, y: number, env: PropEnv) {
      const t = env.t % 2300;
      if (t > 600) return;
      const k = t / 600;
      g.rect(Math.round(x + 34), Math.round(y + 12 + k * 12), 1, 2, P.aqua);
      if (k > 0.85) g.rect(Math.round(x + 32), Math.round(y + 25), 5, 1, P.white);
    },
  };
});

// ---------------------------------------------------------------- プールの札

registerProp('prop_h_sawa_fuda', () =>
  standProp(
    20,
    26,
    (p) => {
      // a split-bamboo stake, a cardboard board, marker lines (『遊泳は 5時まで』 in shape only)
      p.rect(9, 12, 2, 14, P.woodLt);
      p.vline(10, 12, 25, P.brassOld);
      p.rect(2, 2, 16, 11, P.paperGrid);
      p.hline(2, 17, 2, P.paper);
      p.vline(17, 2, 12, P.woodLt);
      p.hline(2, 17, 12, P.woodLt);
      // 『遊泳は』 in blue, 『5時まで』 in red: two rows of marker strokes, doubled
      for (const [x0, y0, w, c] of [[4, 5, 10, P.blue], [5, 8, 3, P.red], [9, 8, 6, P.red]] as [number, number, number, string][])
        for (let i = 0; i < w; i++) if ((i + x0) % 4 !== 3) p.set(x0 + i, y0, c);
      p.set(15, 5, P.blue);
    },
    { cx: 10, base: 16, soft: true, contact: 8 },
  ),
);

// ---------------------------------------------------------------- 名前の石

registerProp('prop_h_sawa_ishi', () => {
  const p = new PixelCanvas(12, 8);
  for (let y = 0; y < 8; y++)
    for (let x = 0; x < 12; x++) {
      const dx = (x + 0.5 - 6) / 6;
      const dy = (y + 0.5 - 4) / 3.5;
      if (dx * dx + dy * dy > 1) continue;
      p.set(x, y, dy > 0.5 ? P.asphalt : dx + dy < -0.5 ? P.concreteLt : P.concrete);
    }
  // the scratched names: a long stroke and a short one
  p.hline(3, 8, 3, P.steel);
  p.hline(4, 6, 5, P.steel);
  outline(p, { bottom: true, soft: true });
  const img = p.toCanvas();
  return {
    ox: 2,
    oy: 6,
    w: 12,
    h: 8,
    foot: 0,
    flat: true,
    img: () => img,
    // it catches the lantern's light now and then (so it is noticed)
    glow(g: Gfx, x: number, y: number, env: PropEnv) {
      const t = env.t % 2600;
      if (t > 260) return;
      g.ctx.globalAlpha = 1 - t / 260;
      g.rect(x + 5, y + 7, 1, 1, '#FFF6D8');
      g.rect(x + 4, y + 8, 3, 1, '#FFE7A3');
      g.ctx.globalAlpha = 1;
    },
  };
});

void SEKI;
