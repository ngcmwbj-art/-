// 落とすけえ、甘うなる（03_ch3_index、events/ch3/mikan.ts）の 絵：みかん畑の 上の 段 map_c3_mikan_ue と、
// 町の みかん畑の 作業道の 奥の 石の 段。
//
//   prop_mk_dan      石の 段 3段。opts.side 'umizoi'：町の 作業道 (52,1) の クロマツの あいだ（上に 白い 照り返し。
//                    見つけやすく：events/ch3/mikan.ts が 入れる ときだけ 置く）。'ue'：上の 段の 南の はし (11–12,9)。
//   prop_mk_monooki  物置（1–3,1。トタン屋根、戸は 開いている。中に 麦わら帽子 2つ・かご・はさみ）。
//                    段階2 は 帽子が ない（2人が かぶって 来ている）。
//   prop_mk_furuki   いちばん 古い 木（20–21,1。幹が 太く、名札が 2枚：白い 板に かたい 字と 丸い 字）。
//   prop_mk_bench    丸太の ベンチ (11,1)（南の 町を 向いている）。
//   prop_mk_drum     雨水を ためた ドラム缶 (22,8)（青い さびた 缶、水面に 空）。

import { mix, PixelCanvas } from '../../engine/pixel';
import { CP } from '../tiles/c3_ground';
import { standProp } from './hoshi_kit';
import { registerProp } from './registry';
import type { PropArt, PropEnv } from './types';

const ISHI = '#A8A49A';
const ISHI_LT = '#D0CCC0';
const ISHI_DK = '#6B6A66';
const WOOD = '#8A5A3A';
const WOOD_LT = '#B8885A';
const WOOD_DK = '#5A3A2A';
const MUGI = '#E8C890';
const MUGI_DK = '#B8904A';

registerProp('prop_mk_dan', (opts) => {
  const machi = opts.side !== 'ue';
  // three flat stone steps going up (north) between the pines: each tread a pale slab, its riser in shadow
  const p = new PixelCanvas(18, 20);
  for (let k = 0; k < 3; k++) {
    const y = 14 - k * 6;
    const inset = k;
    p.rect(1 + inset, y, 16 - inset * 2, 4, ISHI);
    p.hline(1 + inset, 16 - inset, y, ISHI_LT);
    p.rect(1 + inset, y + 4, 16 - inset * 2, 2, ISHI_DK);
    for (let x = 3 + inset; x < 15 - inset; x += 5) p.set(x, y + 2, mix(ISHI, ISHI_DK, 0.5));
  }
  const img = p.toCanvas();
  return {
    ox: -1,
    oy: machi ? -4 : -2,
    w: 18,
    h: 20,
    foot: 15,
    flat: true,
    img: () => img,
    contact: 0,
    // the town side: a white glint of the noon sun on the top step now and then (seen from the work path)
    glow(g, x, y, env: PropEnv) {
      if (!machi) return;
      const ph = (env.t / 1500 + env.seed) % 1;
      if (ph > 0.2) return;
      const a = Math.sin((ph / 0.2) * Math.PI);
      g.rect(x + 8, y + 3, 3, 1, '#FFFFFF', a);
      g.rect(x + 9, y + 2, 1, 3, '#FFFFFF', a);
    },
  } satisfies PropArt;
});

function hat(p: PixelCanvas, cx: number, cy: number): void {
  p.ellipse(cx, cy + 2, 6, 1.6, MUGI);
  p.ellipse(cx, cy, 3.4, 2.4, MUGI);
  p.hline(cx - 3, cx + 3, cy + 1, '#C25A4A');
  p.hline(cx - 5, cx + 5, cy + 3, MUGI_DK);
}

registerProp('prop_mk_monooki', () => {
  const build = (hats: boolean): HTMLCanvasElement => {
    const w = 48;
    const h = 34;
    const p = new PixelCanvas(w, h);
    // the board walls, the tin roof leaning south
    p.rect(1, 10, w - 2, 22, '#7A5A42');
    for (let x = 2; x < w - 2; x += 4) p.vline(x, 11, 31, '#6A4A34');
    p.rect(0, 4, w, 7, '#9AA0A8');
    for (let x = 1; x < w; x += 3) p.vline(x, 4, 10, '#7A8090');
    p.hline(0, w - 1, 4, '#C8CCD4');
    p.hline(0, w - 1, 10, '#5E6478');
    // the open door: the dark inside, two straw hats on pegs, the basket and the shears
    p.rect(14, 13, 20, 19, '#2A2236');
    p.rect(12, 12, 2, 20, WOOD_DK);
    p.rect(34, 12, 2, 20, WOOD_DK);
    p.rect(36, 13, 8, 19, WOOD);
    p.vline(36, 13, 31, WOOD_LT);
    p.set(17, 15, '#8A84A0');
    p.set(29, 15, '#8A84A0');
    if (hats) {
      hat(p, 18, 15);
      hat(p, 29, 15);
      // the names written on the brims (two little white marks)
      p.hline(16, 19, 18, '#F4F1E8');
      p.hline(27, 30, 18, '#F4F1E8');
    }
    // the basket (green fruit in it? not yet) and the thinning shears hanging
    p.rect(17, 25, 10, 6, '#C8A06A');
    p.hline(17, 26, 25, '#E8C890');
    for (let x = 18; x < 27; x += 2) p.vline(x, 26, 30, '#A8804A');
    p.line(30, 22, 31, 27, '#C8CCD4');
    p.line(32, 22, 31, 27, '#C8CCD4');
    p.rect(30, 20, 3, 2, '#C25A4A');
    return p.toCanvas();
  };
  const withHats = build(true);
  const noHats = build(false);
  return {
    ox: 0,
    oy: -18,
    w: 48,
    h: 34,
    foot: 15,
    img: (env) => (env.flag('flag_ch3_stage') >= 2 ? noHats : withHats),
    contact: 46,
    shadow: 40,
  } satisfies PropArt;
});

registerProp('prop_mk_furuki', () => {
  const w = 36;
  const h = 36;
  return standProp(
    w,
    h,
    (p) => {
      const cx = w / 2;
      // a thick old trunk, forked low
      p.rect(cx - 3, 20, 6, 15, '#4A2E22');
      p.vline(cx - 3, 20, 34, '#6A4432');
      p.line(cx - 2, 22, cx - 8, 16, '#4A2E22');
      p.line(cx + 2, 22, cx + 8, 15, '#4A2E22');
      for (let k = 0; k < 8; k++) {
        const bx = cx + ((k * 9) % 21) - 10;
        const by = 11 + ((k * 5) % 8) - 4;
        const r = 7;
        for (let y = -r; y <= r; y++)
          for (let x = -r; x <= r; x++) {
            if (x * x + y * y > r * r || bx + x < 0 || bx + x >= w || by + y < 0) continue;
            const lit = x + y;
            p.set(bx + x, by + y, lit < -r * 0.5 ? CP.mikanLeafLt : lit < r * 0.4 ? CP.mikanLeaf : '#1E4A2A');
          }
      }
      for (let k = 0; k < 9; k++) {
        const fx = 4 + ((k * 11) % (w - 8));
        const fy = 5 + ((k * 7) % 13);
        p.rect(fx, fy, 2, 2, CP.mikanGreen);
        p.set(fx, fy, '#9BCB6B');
      }
      // two name tags on the trunk: a square hand and a round one (two little boards, a few strokes each)
      p.rect(cx - 7, 25, 6, 4, '#F4F1E8');
      p.vline(cx - 6, 26, 27, '#2A2440');
      p.hline(cx - 5, cx - 3, 26, '#2A2440');
      p.vline(cx - 3, 26, 28, '#2A2440');
      p.rect(cx + 1, 26, 6, 4, '#F4F1E8');
      p.set(cx + 2, 28, '#5A4A8A');
      p.set(cx + 3, 27, '#5A4A8A');
      p.set(cx + 4, 28, '#5A4A8A');
      p.set(cx + 5, 27, '#5A4A8A');
      p.set(cx - 4, 24, '#C8CCD4');
      p.set(cx + 4, 25, '#C8CCD4');
    },
    { cx: 16, base: 16, shadow: 28, contact: 24 },
  );
});

registerProp('prop_mk_bench', () =>
  standProp(22, 12, (p) => {
    // a half log on two stumps, the cut face up
    p.rect(1, 3, 20, 4, WOOD_LT);
    p.hline(1, 20, 3, '#D8B080');
    p.hline(1, 20, 6, WOOD);
    p.ellipse(1, 5, 1, 2, '#E8C890');
    p.ellipse(20, 5, 1, 2, '#E8C890');
    for (const x of [3, 15]) {
      p.rect(x, 7, 4, 4, WOOD);
      p.vline(x, 7, 10, WOOD_LT);
    }
  }, { cx: 8, base: 16, shadow: 10 }),
);

registerProp('prop_mk_drum', () =>
  standProp(14, 20, (p) => {
    p.rect(1, 3, 12, 16, '#3A6A8A');
    p.vline(1, 3, 18, '#5A8AAA');
    p.vline(12, 3, 18, '#2A4A6A');
    for (const y of [7, 13]) p.hline(1, 12, y, '#2A4A6A');
    for (const [x, y] of [[4, 10], [9, 15], [6, 5]] as const) p.set(x, y, '#9A5A3A');
    // the rain water at the brim, the sky in it
    p.ellipse(7, 3, 5, 1.6, '#A8D0EA');
    p.hline(3, 10, 2, '#5A8AAA');
  }, { cx: 8, base: 16, shadow: 10 }),
);
