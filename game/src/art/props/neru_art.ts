// 前から 寝る（げむきか 10/20 の 案4、02_ch2_index）：石黒牛舎の 南4（x14–16, y8–10）の ぬれた おがくず、
// 前室の フォークと ネコ車、稲わらの 屋根の 下の おがくずの 山、寝に いく 牛（立つ → 前の ひざを 折る → うしろを
// 下ろす）。牛の 絵は art/chars/hoshi_cattle.ts の cowFrame（前の ひざを 折った 1こまは、夜明けに うしろから 立つ
// ときの r1 と 同じ 形：前が 下、うしろが 上）。台本は events/ch2/neru.ts。

import { mix, PixelCanvas } from '../../engine/pixel';
import type { Gfx } from '../../engine/gfx';
import { h01 } from '../tiles/noise';
import { P } from '../tiles/palette';
import { standProp } from './hoshi_kit';
import { registerProp } from './registry';
import type { PropArt, PropEnv } from './types';
import { cowFrame } from '../chars/hoshi_cattle';

/** 寝に いく 牛の 時計（events/ch2/neru.ts が 動かす。ms、-1 は まだ 立っている）。 */
export const NR_COWS = { t: -1 };
/** 1頭ずつ ずらして（ms）、1こまの 長さ。 */
export const NR_COW_GAP = 1500;
const STEP = 520;

/** 南4の 牛房の ぬれた おがくず（床の しみ。うしろの ほうと、水飲み場の まわり）。v：0 うしろ・1 水飲み場。 */
registerProp('prop_nr_wet', (opts) => {
  const v = Number(opts.v ?? 0);
  const w = v ? 22 : 44;
  const h = v ? 14 : 16;
  const p = new PixelCanvas(w, h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const dx = (x - w / 2) / (w / 2);
      const dy = (y - h / 2) / (h / 2);
      const d = dx * dx + dy * dy + (h01(x, y, 9101 + v) - 0.5) * 0.5;
      if (d < 1) p.set(x, y, d < 0.5 ? '#6A5434' : '#8A7048');
    }
  const img = p.toCanvas();
  return {
    ox: 0,
    oy: 0,
    w,
    h,
    foot: 0,
    flat: true,
    img: () => img,
    over: (g: Gfx, x: number, y: number, env: PropEnv) => {
      // (a damp sheen now and then under the tubes)
      if (Math.floor(env.t / 900) % 3 === 0) g.rect(x + Math.round(w * 0.3), y + 3, 3, 1, '#C8B898', 0.35);
    },
  } satisfies PropArt;
});

/** 前室の 給餌車の 横 (1,7)：立てかけた フォークと、ネコ車（一輪車）。 */
registerProp('prop_nr_fork', () =>
  standProp(22, 30, (p) => {
    // the wheelbarrow: the green tub, the wheel in front, the two handles
    p.poly([[2, 14], [18, 14], [15, 22], [5, 22]], '#3F7A5A');
    p.hline(2, 18, 14, '#6AA884');
    p.hline(5, 15, 22, '#2A5A40');
    p.ellipse(10, 25, 3, 3, P.ink);
    p.set(10, 25, P.steel);
    p.line(2, 14, 0, 27, P.steel);
    p.line(18, 14, 20, 27, P.steel);
    // the fork leaning on the wall behind it: the worn handle, the tines
    p.line(15, 0, 12, 18, '#B08A5A');
    p.line(16, 0, 13, 18, '#8A6A44');
    for (const dx of [-3, -1, 1, 3]) p.line(15 + dx, 0, 15 + dx, 4, P.steel);
    p.hline(12, 18, 4, P.steel);
  }, { cx: 8, base: 16, shadow: 0 }),
);

/** 稲わらの 屋根の 下の はし (50,22) の おがくずの 山（白っぽい 木の くず、上に スコップ）。 */
registerProp('prop_nr_yama', () =>
  standProp(18, 12, (p) => {
    for (let y = 0; y < 12; y++)
      for (let x = 0; x < 18; x++) {
        const dx = (x - 9) / 9;
        const dy = (y - 12) / 11;
        if (dx * dx + dy * dy < 1) p.set(x, y, h01(x, y, 9111) > 0.6 ? '#F0E4C4' : h01(x, y, 9113) > 0.5 ? '#E0D0A8' : '#D0BC90');
      }
    p.line(12, 2, 16, 9, '#8A6A44');
    p.rect(15, 8, 3, 3, P.steel);
  }, { cx: 8, base: 16, shadow: 0, outline: false }),
);

/**
 * 寝に いく 牛（南4、3頭）：opts { k 何頭目, right, dx, dy, white }。NR_COWS.t が 進むと、1頭ずつ
 * 立った まま（side）→ 鼻を 下げて かぐ → 前の ひざを 折る（r1）→ うしろを 下ろす（lie）→ 反すう。
 */
registerProp('prop_nr_cow', (opts) => {
  const k = Number(opts.k ?? 0);
  const right = !!opts.right;
  const white = String(opts.white ?? '');
  const dx = Number(opts.dx ?? 8);
  const dy = Number(opts.dy ?? 16);
  const frame = (env: PropEnv): [string, string] => {
    if (NR_COWS.t < 0) return ['side', 'base'];
    const u = NR_COWS.t - k * NR_COW_GAP;
    if (u < STEP) return ['side', 'base'];
    if (u < STEP * 2) return ['side', 'chew'];
    if (u < STEP * 3) return ['rise', 'r1'];
    return ['lie', Math.floor(env.t / 600) % 2 ? 'chew' : 'base'];
  };
  return {
    ox: 8 - 16 + dx - 8,
    oy: 16 - 21 + dy - 16,
    w: 32,
    h: 21,
    foot: 15 + dy - 16,
    img: (env) => {
      const [p, f] = frame(env);
      return cowFrame(p, f, p === 'rise' ? '' : white, right);
    },
    contact: 24,
    contactX: dx,
  } satisfies PropArt;
});

/** ネコ車を 押す グソっ君の 前の ネコ車（絵だけ。events/ch2/neru.ts の fx が 描く）。load：0 から・1 ぬれた・2 新しい。 */
export function drawBarrow(g: Gfx, x: number, y: number, right: boolean, load: number): void {
  const s = right ? 1 : -1;
  const X = (dx: number) => Math.round(x + s * dx);
  g.line(X(-6), y - 6, X(2), y - 3, P.steel);
  for (let i = 0; i < 9; i++) g.rect(Math.min(X(2 + i), X(2 + i)), y - 4 - (i < 7 ? 3 : 1), 1, i < 7 ? 6 : 3, i === 0 ? '#2A5A40' : '#3F7A5A');
  if (load) {
    const c = load === 1 ? '#6A5434' : '#F0E4C4';
    for (let i = 1; i < 8; i++) g.rect(X(2 + i), y - 9 + (i === 1 || i === 7 ? 1 : 0), 1, 2, i % 3 ? c : mix(c, '#FFFFFF', 0.2));
  }
  g.circle(X(10), y - 1, 2, P.ink);
}
