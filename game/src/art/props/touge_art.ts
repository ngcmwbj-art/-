// 雲の 下にも、郵便受け（02_ch2_index、events/ch2/touge.ts）の 絵。峠の カーブ（map_hoshi_touge）。
//
//   prop_ks2_shima_1  雲から 出た 高台の お寺の 屋根（瓦の 大屋根の てっぺん、反った 軒。足もとに 雲の すじ）。遠いので 小さく。
//   prop_ks2_shima_2  雲から 出た 丘の 神社の 大杉の てっぺん（とがった 濃い 緑の 穂先）。
//   prop_ks2_shima_3  雲から 出た 尾根の 送電線の 鉄塔の 頭（格子の 柱と 腕 3段、てっぺんの 小さな 腕）。
//   prop_ks2_hyochu   もう 使って いない 古い バス停の 標柱（丸い 板の 字は かすれて 読めない。時刻の 数字は 描かない。
//                     足は コンクリートの 重し）。
//   prop_ks2_hansha   道の はしの 反射板（白い 細い 柱の 上に 丸い 反射板。トマトの 灯りが 近いと 光る）。
//   prop_ks2_road     県道の まん中の 白い 破線（地面に 平たく。24 マス）。

import { mix, PixelCanvas } from '../../engine/pixel';
import { P } from '../tiles/palette';
import { registerProp } from './registry';
import { standProp } from './hoshi_kit';
import type { PropArt, PropEnv } from './types';

/** 雲の 色（art/tiles/hoshi_ground.ts texKumo と そろえる）。 */
export const KS_KUMO = ['#F4F6FA', '#E6EAF2', '#D6DCE8', '#C6CEDE'] as const;
/** 星あかりの ふち（52 7章：ものの 上の ふちに 1px の 明るい 線）。 */
const STAR = '#DCE4F4';

/** 足もとの 雲の すじ（ものが 雲から 出て 見える ように、下の 2〜3行を 雲で かくす）。 */
function wisps(p: PixelCanvas, w: number, base: number, seed: number): void {
  for (let x = 0; x < w; x++) {
    const h = 2 + ((x * 7 + seed * 13) % 5 === 0 ? 1 : 0) + ((x + seed) % 9 < 3 ? 1 : 0);
    for (let y = base - h; y <= base; y++) p.set(x, y, y === base - h ? KS_KUMO[0] : y < base - 1 ? KS_KUMO[1] : KS_KUMO[2]);
  }
}

// ---------------------------------------------------------------- 雲から 出た 目印（遠くの 島）

/**
 * 遠くの 島 1つ：小さく 描いて 2倍に（HD-2D では 雲が 道より 低く 遠いので、絵の ままだと 小さすぎる）。
 * 足もとの 雲の すじは 2倍に した あとで 細かく 足す。
 */
function shima(w: number, h: number, paint: (p: PixelCanvas) => void, seed: number): PropArt {
  const s = new PixelCanvas(w, h);
  paint(s);
  const W = w * 2;
  const H = h * 2;
  const p = new PixelCanvas(W, H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const v = s.get(x >> 1, y >> 1);
    if (v >>> 24) p.set(x, y, v);
  }
  wisps(p, W, H - 1, seed);
  const img = p.toCanvas();
  return { ox: Math.round(8 - W / 2), oy: 16 - H, w: W, h: H, foot: 15, img: () => img, contact: 0, xray: 0 };
}

registerProp('prop_ks2_shima_1', () =>
  shima(
    30,
    14,
    (p) => {
      // the big tiled roof's top: the ridge with its two end ornaments, the sweep of the eaves
      const roof = mix(P.asphalt, P.navy, 0.35);
      p.poly([[3, 12], [8, 5], [22, 5], [27, 12]], roof);
      p.hline(8, 22, 5, STAR);
      p.rect(7, 3, 17, 2, P.charcoal);
      p.hline(7, 23, 3, STAR);
      p.rect(6, 1, 2, 3, P.charcoal);
      p.rect(23, 1, 2, 3, P.charcoal);
      // the tile rows (a few lines down the slope)
      for (let x = 10; x < 21; x += 3) p.vline(x, 6, 11, mix(roof, P.charcoal, 0.5));
      // the eaves turned up at the ends
      p.line(1, 11, 4, 12, P.charcoal);
      p.line(26, 12, 29, 11, P.charcoal);
    },
    1,
  ),
);

registerProp('prop_ks2_shima_2', () =>
  shima(
    16,
    22,
    (p) => {
      // a great cedar's spire: tiers of dark green narrowing to the tip
      const g0 = mix(P.leafShade, P.navy, 0.3);
      const g1 = mix(P.leafDeep, P.navy, 0.2);
      for (let k = 0; k < 6; k++) {
        const y = 2 + k * 3;
        const hw = 1 + k;
        p.poly([[8 - hw - 1, y + 3], [8, y - 1], [8 + hw + 1, y + 3]], k % 2 ? g0 : g1);
      }
      p.vline(8, 0, 2, g1);
      p.set(8, 0, STAR);
      for (let k = 0; k < 5; k++) p.set(8 - k, 2 + k * 3, STAR);
    },
    2,
  ),
);

registerProp('prop_ks2_shima_3', () =>
  shima(
    18,
    26,
    (p) => {
      // a pylon's head: two legs of lattice narrowing upward, three crossarms, the earth wire's small arm on top
      const st = mix(P.steel, P.navy, 0.25);
      for (let y = 4; y < 26; y++) {
        const hw = 2 + Math.floor((y - 4) / 7);
        p.set(9 - hw, y, st);
        p.set(9 + hw, y, st);
        if (y % 3 === 0) p.line(9 - hw, y, 9 + hw, y + 2, mix(st, P.charcoal, 0.4));
      }
      for (const [y, a] of [[8, 7], [14, 8], [20, 7]] as const) {
        p.hline(9 - a, 9 + a, y, st);
        p.set(9 - a, y + 1, P.charcoal);
        p.set(9 + a, y + 1, P.charcoal);
        p.hline(9 - a, 9 + a, y - 1, STAR);
      }
      p.vline(9, 1, 4, st);
      p.hline(7, 11, 2, st);
      p.set(9, 1, STAR);
    },
    3,
  ),
);

// ---------------------------------------------------------------- 古い バス停の 標柱

registerProp('prop_ks2_hyochu', () =>
  standProp(
    14,
    40,
    (p) => {
      // the concrete weight, the rusted pipe, the round plate with its letters gone
      p.rect(2, 34, 10, 5, P.concrete);
      p.hline(2, 11, 34, P.concreteLt);
      p.vline(6, 12, 34, mix(P.steel, P.brassOld, 0.5));
      p.vline(7, 12, 34, mix(P.asphalt, P.brassOld, 0.4));
      p.ellipse(6.5, 7, 6, 6, mix(P.white, P.concrete, 0.4));
      p.ring(6.5, 7, 6, 6, mix(P.verm, P.brassOld, 0.5));
      // faded strokes (unreadable)
      const c = mix(P.concrete, P.steel, 0.6);
      p.set(4, 5, c);
      p.set(6, 6, c);
      p.set(8, 5, c);
      p.set(5, 9, c);
      p.set(8, 8, c);
      // the timetable's frame, its board taken off (two bolts)
      p.strokeRect(3, 18, 8, 10, mix(P.steel, P.brassOld, 0.4));
      p.set(4, 19, P.charcoal);
      p.set(9, 26, P.charcoal);
    },
    { cx: 8, base: 16, foot: 15, shadow: 36, contact: 8, extra: { oy: 16 - 40 } },
  ),
);

// ---------------------------------------------------------------- 反射板

const hansha = (lit: boolean): PropArt =>
  standProp(
    8,
    24,
    (p) => {
      p.vline(3, 6, 23, P.white);
      p.vline(4, 6, 23, P.concrete);
      p.hline(3, 4, 14, P.verm);
      p.ellipse(3.5, 3.5, 3, 3, lit ? '#FFD27A' : mix(P.sunDeep, P.brassOld, 0.3));
      p.set(2, 2, lit ? '#FFF6D8' : P.sun);
    },
    { cx: 8, base: 16, foot: 15, shadow: 20, contact: 4, extra: { oy: 16 - 24 } },
  );

registerProp('prop_ks2_hansha', () => {
  const off = hansha(false);
  const on = hansha(true);
  const imgOff = off.img({} as PropEnv);
  const imgOn = on.img({} as PropEnv);
  return {
    ...off,
    // the tomato's light comes back off it when the light is near (52 4.5 の 灯りの 輪 くらい)
    img: (env: PropEnv) => (env.near < 56 && env.flag('flag_ch2_got_tomato') > 0 ? imgOn : imgOff),
  } satisfies PropArt;
});

// ---------------------------------------------------------------- 県道の まん中の 線

registerProp('prop_ks2_road', () => {
  const W = 24 * 16;
  const p = new PixelCanvas(W, 48);
  // the centre line between the two lanes (rows 4–6: y 24 of the 48), worn white dashes
  for (let x = 2; x < W; x += 12) for (let k = 0; k < 6; k++) p.set(x + k, 24, (x + k) % 17 === 0 ? mix(P.white, P.concrete, 0.6) : mix(P.white, P.concreteLt, 0.3));
  // the white edge lines by the guardrail and the shoulder
  for (let x = 0; x < W; x++) {
    if ((x * 5) % 23 !== 0) p.set(x, 1, mix(P.white, P.concrete, 0.45));
    if ((x * 7) % 29 !== 0) p.set(x, 46, mix(P.white, P.concrete, 0.45));
  }
  const img = p.toCanvas();
  return { ox: 0, oy: 0, w: W, h: 48, foot: 0, flat: true, img: () => img } satisfies PropArt;
});
