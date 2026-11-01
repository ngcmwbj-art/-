// ちがう 花が、となりに（02_ch2_index、events/ch2/soba.ts）の 絵。
//
//   prop_sb_soba    分校の そば畑の そば 1株ぶん（うっすら 赤い 茎が 何本も、ハートの 形の 葉、てっぺんに 白い 小さな 花の
//                   ふさ）。opts.i：株の 番号。札が 立った 組（flag_sb_fuda の ビット）は、北の 畝の その 2株に 小さな 札。
//   prop_sb_koya    西の すみの 道具小屋（板張りの 小さな 小屋、トタンの 片屋根。軒に かま、立てかけた のし棒の 束）。2×2。
//   prop_sb_kui     東の すみの 名札の 杭（板の 名札が 7本。字は 雨で うすれて 読めない）。2×2。
//   prop_sb_touban  南の 戸の よこの 当番表（杭に 打った 板、夏と 冬の 2段）。
//   prop_sb_kaki    南の 竹垣（四つ目垣。16マス、opts.gate の マスは 戸の ために あける）。
//   prop_sb_to      竹垣の 戸（枝折戸）。opts.side 'out'：村の がわ（分校の 西の 壁ぎわ、左右に 短い 竹垣）。

import { mix, PixelCanvas } from '../../engine/pixel';
import { ihash } from '../tiles/noise';
import { P } from '../tiles/palette';
import { outline } from './kit';
import { registerProp } from './registry';
import { standProp } from './hoshi_kit';
import type { PropArt, PropEnv } from './types';

export const SB_STEM = '#B8506A';
export const SB_STEM_LT = '#D87890';
export const SB_LEAF = '#5FA85A';
export const SB_LEAF_DK = '#3E7A44';
export const SB_FLOWER = '#FBF6EE';
export const SB_FLOWER_SH = '#D8D0E0';
export const SB_ANTHER = '#E890A8';

const BAMBOO = { hi: P.goldPale, mid: P.woodLt, lo: P.brassOld, node: P.wood };

/** 組 k（0〜2）の 札が 立つ 株の 番号（北の 畝の 南の 列 y3：x5+2k・x6+2k）。 */
export const fudaKabu = (k: number): [number, number] => [6 + 2 * k, 7 + 2 * k];

// ---------------------------------------------------------------- そば 1株

const SW = 18;
const SH = 22;

function tuft(seed: number, fuda: 0 | 1 | 2): HTMLCanvasElement {
  const p = new PixelCanvas(SW, SH);
  const base = SH - 2;
  // the stems: four or five thin reddish stems leaning a little, branching at the top
  const n = 4 + (seed % 2);
  const tops: [number, number][] = [];
  for (let k = 0; k < n; k++) {
    const x0 = 3 + Math.round((k * (SW - 6)) / (n - 1));
    const lean = ((ihash(k, seed, 71) % 5) - 2) * 0.5;
    const top = 5 + (ihash(k, seed, 73) % 4);
    for (let y = base; y >= top; y--) {
      const x = Math.round(x0 + ((base - y) / (base - top)) * lean * 2);
      p.set(x, y, y < base - 4 ? SB_STEM : mix(SB_STEM, SB_LEAF_DK, 0.5));
      if (y === top) tops.push([x, y]);
    }
    // a heart-shaped leaf off the stem, halfway up
    const ly = base - 5 - (ihash(k, seed, 77) % 5);
    const lx = Math.round(x0 + ((base - ly) / (base - top)) * lean * 2) + (k % 2 ? 2 : -2);
    p.ellipse(lx, ly, 2, 1.5, k % 2 ? SB_LEAF : SB_LEAF_DK);
    p.set(lx + (k % 2 ? 2 : -2), ly + 1, SB_LEAF_DK);
  }
  // the white flower heads at the tops (small clusters)
  for (const [tx, ty] of tops) {
    // (a loose spray of tiny dots, not one blob: the stalks' tips show between them)
    for (const [dx, dy] of [[-2, -1], [0, -3], [2, -2], [-1, -4], [1, 0], [3, -4], [-3, -3]] as const) p.set(tx + dx, ty + dy, (dx + dy) & 1 ? SB_FLOWER : SB_FLOWER_SH);
    p.set(tx, ty - 1, SB_FLOWER);
    p.set(tx + 1, ty - 2, SB_ANTHER);
  }
  // only a faint dark rim at the foot (a full ink outline made the white sprays read as boxes)
  for (let x = 0; x < SW; x++) if (p.alpha(x, base) > 0) p.set(x, base + 1, mix(P.ink, SB_LEAF_DK, 0.4));
  // the tag of a pair (a small white board on a stick, its letter as one dark stroke: 長 tall, 短 low)
  if (fuda) {
    const fx = fuda === 1 ? 4 : SW - 6;
    p.rect(fx + 1, base - 9, 1, 9, P.woodLt);
    p.rect(fx - 1, base - 15, 5, 6, P.paper);
    p.strokeRect(fx - 1, base - 15, 5, 6, P.wood);
    if (fuda === 1) p.vline(fx + 1, base - 14, base - 10, P.ink);
    else p.hline(fx, fx + 2, base - 12, P.ink);
  }
  return p.toCanvas();
}

registerProp('prop_sb_soba', (opts) => {
  const i = Number(opts.i ?? 0);
  const plain = tuft(i, 0);
  // which pair's tag stands here, and whether this one is the long (1) or the short (2) of it
  let k = -1;
  let side: 0 | 1 | 2 = 0;
  for (let j = 0; j < 3; j++) {
    const [a, b] = fudaKabu(j);
    if (i === a || i === b) {
      k = j;
      side = i === a ? 1 : 2;
    }
  }
  const tagged = k >= 0 ? tuft(i, side) : plain;
  const img = (env: PropEnv) => (k >= 0 && env.flag('flag_sb_fuda') & (1 << k) ? tagged : plain);
  return { ox: -1, oy: 16 - SH, w: SW, h: SH, foot: 14, img, contact: 12, shadow: 6 } satisfies PropArt;
});

// ---------------------------------------------------------------- 道具小屋

registerProp('prop_sb_koya', () =>
  standProp(
    32,
    34,
    (p) => {
      // the board walls (vertical planks), a door of the same boards with a black latch
      p.rect(2, 12, 28, 21, P.wood);
      for (let x = 2; x < 30; x += 4) p.vline(x, 12, 32, P.woodDark);
      p.rect(17, 17, 9, 16, mix(P.wood, P.woodLt, 0.3));
      p.vline(21, 17, 32, P.woodDark);
      p.rect(18, 24, 2, 2, P.ink);
      // the tin lean-to roof
      p.poly([[0, 12], [32, 8], [32, 11], [0, 15]], P.steel);
      p.line(0, 12, 31, 8, mix(P.steel, P.white, 0.4));
      for (let x = 2; x < 32; x += 3) p.line(x, 12 - Math.round(x / 8), x, 14 - Math.round(x / 8), P.asphalt);
      // the sickle on a nail under the eave, the rolling pins leaning on the wall (a bundle)
      p.line(6, 16, 9, 16, P.steel);
      p.line(9, 16, 10, 19, P.woodLt);
      for (let k = 0; k < 4; k++) p.line(5 + k * 2, 32, 7 + k * 2, 20, k % 2 ? P.goldPale : P.woodLt);
      // small sieves hung on the wall (round rims)
      p.ring(13, 18, 2, 2, P.woodLt);
      p.ring(13, 25, 2, 2, P.woodLt);
    },
    { cx: 16, base: 32, foot: 30, shadow: 10, contact: 26, extra: { oy: 32 - 34 } },
  ),
);

// ---------------------------------------------------------------- 名札の 杭

registerProp('prop_sb_kui', () =>
  standProp(
    32,
    30,
    (p) => {
      // seven stakes in two rows (4 behind, 3 in front), each a small board with faded strokes
      const at: [number, number][] = [[4, 16], [12, 15], [20, 16], [28, 15], [8, 26], [16, 27], [24, 26]];
      at.forEach(([x, y], k) => {
        p.rect(x, y - 2, 2, 6, P.wood);
        p.rect(x - 3, y - 10, 8, 8, mix(P.paper, P.woodLt, 0.35));
        p.strokeRect(x - 3, y - 10, 8, 8, P.woodDark);
        // the children's letters, washed out by the rain (only faint marks)
        const c = mix(P.woodLt, P.ink, 0.25);
        p.set(x - 1, y - 8 + (k % 2), c);
        p.set(x + 1, y - 7, c);
        p.set(x, y - 5 - (k % 2), c);
      });
    },
    { cx: 16, base: 30, foot: 28, shadow: 4, contact: 28, extra: { oy: 32 - 30 } },
  ),
);

// ---------------------------------------------------------------- 当番表

registerProp('prop_sb_touban', () =>
  standProp(
    16,
    24,
    (p) => {
      p.rect(7, 12, 2, 12, P.wood);
      p.rect(1, 2, 14, 12, P.paper);
      p.strokeRect(1, 2, 14, 12, P.woodDark);
      p.hline(2, 13, 8, P.paperGrid);
      // two rows of the teacher's hand (夏 / 冬), a little flower and a little bowl drawn by them
      p.hline(3, 8, 5, P.navy);
      p.circle(11, 5, 1, SB_FLOWER_SH);
      p.hline(3, 8, 11, P.navy);
      p.hline(10, 13, 11, P.wood);
      p.set(11, 10, P.wood);
    },
    { cx: 8, base: 24, foot: 22, shadow: 3, extra: { oy: 16 - 24 } },
  ),
);

// ---------------------------------------------------------------- 竹垣（四つ目垣）

const FH = 13;

function kakiRun(w: number, seed: number, gap: [number, number] | null): PixelCanvas {
  const h = FH + 3;
  const p = new PixelCanvas(w, h);
  const base = h - 1;
  const inGap = (x: number) => !!gap && x >= gap[0] && x < gap[1];
  for (const ry of [base - 3, base - 7, base - 11]) {
    for (let x = 0; x < w; x++) {
      if (inGap(x)) continue;
      const node = (x + seed * 5 + ry) % 11 === 0;
      p.set(x, ry, node ? BAMBOO.node : BAMBOO.hi);
      p.set(x, ry + 1, node ? BAMBOO.node : BAMBOO.lo);
    }
  }
  for (let x = 3; x < w - 1; x += 8) {
    if (inGap(x) || inGap(x + 1)) continue;
    const top = base - FH + (ihash(x, seed, 8821) % 2);
    for (let y = top; y <= base; y++) {
      p.set(x, y, BAMBOO.mid);
      p.set(x + 1, y, BAMBOO.lo);
    }
    p.set(x, top, BAMBOO.hi);
    p.set(x + 1, top, BAMBOO.hi);
    for (const ry of [base - 3, base - 7, base - 11]) {
      p.set(x, ry, P.ink);
      p.set(x + 1, ry + 1, P.ink);
    }
  }
  for (let x = 0; x < w; x += 2) {
    if (inGap(x)) continue;
    const hh = ihash(x, seed, 8823);
    if (hh % 3) continue;
    const g = 1 + ((hh >>> 4) % 3);
    for (let k = 0; k < g; k++) p.set(x + (k & 1), base - k, k === g - 1 ? P.leafYoung : P.leaf);
  }
  return p;
}

registerProp('prop_sb_kaki', (opts) => {
  const gate = Number(opts.gate ?? -1);
  const run = kakiRun(16 * 16, 5, gate >= 0 ? [gate * 16, gate * 16 + 16] : null);
  outline(run, { bottom: true, soft: true });
  const img = run.toCanvas();
  return { ox: 0, oy: 16 - (FH + 3) - 2, w: 256, h: FH + 3, foot: 14, img: () => img, shadow: 0, contact: 0 } satisfies PropArt;
});

// ---------------------------------------------------------------- 竹垣の 戸（枝折戸）

registerProp('prop_sb_to', (opts) => {
  const out = opts.side === 'out';
  const w = out ? 24 : 16;
  const cx = w / 2;
  return standProp(
    w,
    24,
    (p) => {
      const g0 = Math.round(cx - 7);
      // two bamboo posts
      for (const x of [g0, g0 + 13]) {
        p.rect(x, 3, 2, 21, BAMBOO.mid);
        p.vline(x + 1, 3, 23, BAMBOO.lo);
        p.set(x, 3, BAMBOO.hi);
      }
      // the woven door between (thin split bamboo in a lattice, a frame)
      p.strokeRect(g0 + 2, 6, 11, 16, BAMBOO.mid);
      for (let y = 7; y < 21; y++) {
        for (let x = g0 + 3; x < g0 + 12; x++) {
          if ((x + y) % 4 === 0) p.set(x, y, BAMBOO.hi);
          else if ((x - y + 64) % 4 === 0) p.set(x, y, BAMBOO.lo);
        }
      }
      // the rope ring on the post that shuts it
      p.rect(g0 + 12, 13, 3, 2, P.ink);
      if (out) {
        // short wings of the fence on both sides (against the school's west wall)
        for (const x0 of [0, g0 + 15]) {
          const ww = x0 === 0 ? g0 : w - x0;
          for (const ry of [20, 16, 12]) {
            p.hline(x0, x0 + ww - 1, ry, BAMBOO.hi);
            p.hline(x0, x0 + ww - 1, ry + 1, BAMBOO.lo);
          }
          p.rect(x0 + Math.floor(ww / 2), 9, 1, 15, BAMBOO.mid);
        }
      }
    },
    { cx, base: 24, foot: 15, shadow: 0, contact: 12, extra: { oy: 16 - 24, ox: Math.round(8 - cx) } },
  );
});
