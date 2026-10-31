// 寝とる うちに、とる（02_ch2_index、events/ch2/retasu.ts）の 絵。
//
//   prop_rt_retasu   上の 畑の レタス 1株（丸く 巻いた 玉と、まわりに 広がる 外の 葉。葉の ふちが 露で 白く 光る）。
//                    opts.i：株の 番号（玉の 大きさが それぞれ ちがう）。opts.t：とる 3株の 番号（-1 は ほかの 株）。
//                    とった 株（flag_rt_tama_<t> 1）は 切り株と 根もとの 葉だけ。見送った 株（2）は そのまま。
//   prop_rt_kontena  畝の はしの オレンジの 収穫コンテナ（とった 玉が 外の 葉 2枚 つきで 入る。flag_rt_tama_* の 1 の 数）。
//   prop_rt_kiri     霧吹きと 水の 入った バケツ。
//   prop_rt_to       獣よけの ネットの 戸（人の 背の 高さの パイプの 枠に ネット、ひもの 輪）。opts.side 'out'：村の がわ。
//   prop_rt_tsuru    北西の すみの ネットに からんだ 草の つる。

import { mix, PixelCanvas } from '../../engine/pixel';
import { ihash } from '../tiles/noise';
import { P } from '../tiles/palette';
import { outline } from './kit';
import { registerProp } from './registry';
import { standProp } from './hoshi_kit';
import type { PropArt, PropEnv } from './types';

export const RT_LEAF = '#7CC850';
export const RT_LEAF_LT = '#B8E878';
export const RT_LEAF_DK = '#4A9A40';
export const RT_HEAD = '#CCEE8C';
export const RT_HEAD_LT = '#ECFABC';
export const RT_DEW = '#F4FBEA';

const W = 18;
const H = 16;

/** 1株（size 0..2：玉の 大きさ）。picked：切り株だけ。 */
function kabu(size: number, seed: number, picked: boolean): HTMLCanvasElement {
  const p = new PixelCanvas(W, H);
  const cx = 9;
  const base = H - 2;
  // the outer leaves, spread flat round the foot (wavy edges, a pale rib)
  const lw = 7 + size;
  for (let k = 0; k < 7; k++) {
    const a = (k / 7) * Math.PI * 2 + (seed % 5) * 0.3;
    const ex = Math.round(Math.cos(a) * lw);
    const ey = Math.round(Math.sin(a) * 3);
    p.ellipse(cx + Math.round(ex * 0.65), base - 3 + Math.round(ey * 0.8), 3.4, 2.2, k % 2 ? RT_LEAF : RT_LEAF_DK);
  }
  p.ellipse(cx, base - 3, lw - 1, 3, RT_LEAF);
  for (let x = -lw + 2; x <= lw - 2; x += 3) p.set(cx + x, base - 2 - (ihash(x, seed, 31) % 2), RT_LEAF_DK);
  if (picked) {
    // the cut stump, a little white where the cut was washed
    p.rect(cx - 2, base - 4, 4, 2, '#D8E8B0');
    p.hline(cx - 2, cx + 1, base - 5, '#F0F4E0');
    outline(p, { bottom: true, soft: true });
    return p.toCanvas();
  }
  // the head: round and close (bigger ones a little taller)
  const r = 4 + size;
  const hy = base - 4 - Math.round(r * 0.6);
  p.ellipse(cx, hy, r, r - 1, RT_HEAD);
  p.ellipse(cx - 1, hy - 1, r - 2, r - 3, RT_HEAD_LT);
  // the wrapper leaves' lines over it
  p.line(cx - r + 1, hy + 1, cx, hy - r + 2, RT_LEAF);
  p.line(cx + r - 1, hy + 1, cx + 1, hy - r + 2, RT_LEAF);
  p.hline(cx - r + 1, cx + r - 1, hy + r - 2, RT_LEAF);
  outline(p, { bottom: true, soft: true });
  // the dew on the leaves' edges (after the outline: it catches the light)
  for (const [dx, dy] of [[-lw + 1, -3], [lw - 2, -4], [-2, -r - 2], [3, -r - 1], [-lw + 4, -1]] as const) {
    const x = cx + dx;
    const y = (dy < -4 ? hy + r : base) + dy;
    if (p.alpha(x, y) > 0) p.set(x, y, RT_DEW);
  }
  return p.toCanvas();
}

registerProp('prop_rt_retasu', (opts) => {
  const i = Number(opts.i ?? 0);
  const t = Number(opts.t ?? -1);
  // three sizes, as the field has them (the three to pick: hard 1, soft 0, too hard 2)
  const size = t === 0 ? 1 : t === 1 ? 0 : t === 2 ? 2 : [1, 2, 0, 1, 1, 2, 0][i % 7];
  const whole = kabu(size, i, false);
  const stump = kabu(size, i, true);
  const img = (env: PropEnv) => (t >= 0 && env.flag(`flag_rt_tama_${t}`) === 1 ? stump : whole);
  return { ox: -1, oy: 16 - H, w: W, h: H, foot: 13, img, contact: 12, shadow: 4 } satisfies PropArt;
});

// ---------------------------------------------------------------- 収穫コンテナ

const ORANGE = '#F08A2A';
const ORANGE_DK = '#B85A1A';
const ORANGE_LT = '#FFB060';

function kontena(n: number): HTMLCanvasElement {
  const w = 18;
  const h = 16;
  const p = new PixelCanvas(w, h);
  // the heads inside (each with its two outer leaves round it)
  for (let k = 0; k < n; k++) {
    const x = 5 + k * 7;
    p.ellipse(x, 6, 4, 2.5, RT_LEAF_DK);
    p.ellipse(x, 5, 3, 3, RT_HEAD);
    p.ellipse(x - 1, 4, 1.5, 1.5, RT_HEAD_LT);
    p.line(x - 4, 7, x - 2, 3, RT_LEAF);
    p.line(x + 4, 7, x + 2, 3, RT_LEAF);
  }
  // the crate: orange plastic, a lattice of holes, the hand-grip slot
  p.rect(1, 7, w - 2, h - 8, ORANGE);
  p.hline(1, w - 2, 7, ORANGE_LT);
  p.hline(1, w - 2, h - 2, ORANGE_DK);
  for (let y = 10; y < h - 2; y += 2) for (let x = 3; x < w - 3; x += 3) p.rect(x, y, 2, 1, ORANGE_DK);
  p.rect(7, 8, 4, 1, ORANGE_DK);
  outline(p, { bottom: true, soft: true });
  return p.toCanvas();
}

registerProp('prop_rt_kontena', () => {
  const imgs = [0, 1, 2].map(kontena);
  const img = (env: PropEnv) => imgs[[0, 1, 2].filter((t) => env.flag(`flag_rt_tama_${t}`) === 1).length];
  return { ox: -1, oy: 0, w: 18, h: 16, foot: 14, img, contact: 14, shadow: 6 } satisfies PropArt;
});

// ---------------------------------------------------------------- 霧吹きと バケツ

registerProp('prop_rt_kiri', () =>
  standProp(
    16,
    16,
    (p) => {
      // the bucket (galvanised), water in it
      p.rect(2, 7, 9, 8, P.steel);
      p.vline(2, 7, 14, mix(P.steel, P.white, 0.3));
      p.hline(2, 10, 14, P.asphalt);
      p.ellipse(6, 7, 4.5, 1.5, P.concrete);
      p.ellipse(6, 7, 3.5, 1, '#4A7AA8');
      p.line(2, 6, 6, 3, P.asphalt);
      p.line(10, 6, 6, 3, P.asphalt);
      // the sprayer beside it (white bottle, a green trigger head)
      p.rect(11, 9, 4, 6, P.white);
      p.vline(14, 9, 14, P.concrete);
      p.rect(11, 6, 3, 3, '#4E9A3A');
      p.set(10, 6, '#4E9A3A');
      p.set(13, 8, P.asphalt);
    },
    { cx: 8, base: 16, foot: 14, shadow: 4 },
  ),
);

// ---------------------------------------------------------------- 獣よけの ネットの 戸

registerProp('prop_rt_to', (opts) => {
  const out = opts.side === 'out';
  return standProp(
    16,
    26,
    (p) => {
      // two thicker posts, the pipe frame of the door between them
      p.rect(1, 2, 2, 23, P.asphalt);
      p.vline(1, 2, 24, P.steel);
      p.rect(13, 2, 2, 23, P.asphalt);
      p.vline(13, 2, 24, P.steel);
      p.hline(3, 12, 4, P.steel);
      p.hline(3, 12, 23, P.steel);
      // the net in the frame (a little lighter than the fence's: a newer piece)
      for (let y = 5; y < 23; y++) for (let x = 3; x < 13; x++) if (((x + y) & 1) === 0 && (x % 2 === 0 || y % 2 === 0)) p.set(x, y, P.leafYoung);
      // the rope loop that ties it shut (on the post by the latch)
      const rx = out ? 12 : 3;
      p.rect(rx - 1, 12, 3, 2, P.goldPale);
      p.set(rx, 14, P.brass);
      p.set(rx, 15, P.brass);
    },
    { cx: 8, base: 26, foot: 15, shadow: 0, contact: 12, extra: { oy: 16 - 26 } },
  );
});

// ---------------------------------------------------------------- ネットに からんだ 草の つる

registerProp('prop_rt_tsuru', () =>
  standProp(
    14,
    18,
    (p) => {
      for (let k = 0; k < 4; k++) {
        const x0 = 2 + k * 3;
        for (let y = 2; y < 17; y++) p.set(x0 + Math.round(Math.sin(y / 2 + k) * 1.5), y, k % 2 ? P.leafShade : P.leaf);
      }
      for (const [x, y] of [[3, 4], [9, 6], [5, 10], [11, 12], [7, 15]] as const) {
        p.rect(x, y, 2, 2, P.leafYoung);
        p.set(x + 2, y, P.leaf);
      }
    },
    { cx: 8, base: 18, foot: 15, shadow: 0, extra: { oy: 16 - 18 } },
  ),
);
