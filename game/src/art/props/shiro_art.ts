// 波に 見せる 城（03_ch3_index、events/ch3/shiro.ts）の 地図の 絵：海水浴場の 物。
//
//   prop_sr_bucket  海の 家の 前、浮き輪の 山の よこ (62,23) の 赤い バケツ（持って いる あいだは 出ない：地図の cond）。
//   prop_sr_shiro   波打ちぎわ (62,30) の 城。flag_sr_dan（0〜3 段）・flag_sr_deco（かざりを のせた）・flag_sr_toke
//                   （1 下の ほうが とけた、2 まるい 小山）・flag_sr_got_eda（小枝の 旗）。0段の 間は ならした しめった 砂。
//                   真上からの 日ざし（正午）：影は ほとんど ない。
//   prop_sr_suna    上の 乾いた 砂 (60,26)：すくう 所の 小さな 山（平ら）。
//   prop_sr_kazari  かざりの 3つ（opts.k：kaigara 貝がら・koishi 小石・eda 流木の 小枝。平ら。ひろうと 地図の cond で 消える）。

import { PixelCanvas } from '../../engine/pixel';
import { registerProp } from './registry';
import { outline } from './kit';
import type { PropArt } from './types';

const SAND = '#EAD8B0';
const SAND_LT = '#F6E8C8';
const SAND_DK = '#CDB88E';
const WET = '#C8B488';
const WET_DK = '#B09C70';
const WET_LT = '#D8C69C';

registerProp('prop_sr_bucket', () => {
  const W = 14;
  const H = 14;
  const p = new PixelCanvas(W, H);
  // a small red beach bucket, the sand on its rim, the white handle laid over
  p.poly([[2, 4], [11, 4], [10, 12], [3, 12]], '#D8483A');
  p.vline(3, 5, 11, '#B8362C');
  p.vline(10, 5, 11, '#E8685A');
  p.ellipse(6, 4, 4, 1, '#8A2A22');
  p.hline(3, 10, 3, '#E8685A');
  p.set(5, 4, SAND_DK);
  p.set(7, 4, SAND_DK);
  p.hline(3, 10, 12, '#9A2E26');
  p.line(2, 5, 6, 1, '#F4F1E8');
  p.line(6, 1, 11, 5, '#F4F1E8');
  // sand stuck to its side
  p.set(4, 9, SAND);
  p.set(8, 10, SAND);
  outline(p, { soft: true });
  const img = p.toCanvas();
  return { ox: 1, oy: 16 - H, w: W, h: H, foot: 14, img: () => img, contact: 0 } satisfies PropArt;
});

/** 城の 絵（段・かざり・とけ方 ごと）。 */
function castle(dan: number, deco: boolean, eda: boolean, toke: number): HTMLCanvasElement {
  const W = 20;
  const H = 26;
  const p = new PixelCanvas(W, H);
  const by = H - 3;
  const cx = 10;
  if (toke >= 2) {
    // a round low mound, the wave's line round its foot, the twig still standing if there was one
    p.ellipse(cx, by - 1, 7, 3, WET);
    p.ellipse(cx - 1, by - 2, 5, 2, WET_LT);
    p.hline(cx - 7, cx + 7, by + 1, WET_DK);
    p.hline(cx - 8, cx - 6, by + 2, '#E8F0F0');
    p.hline(cx + 5, cx + 8, by + 2, '#E8F0F0');
    outline(p, { soft: true });
    if (eda) {
      p.line(cx + 1, by - 3, cx + 2, by - 10, '#8A6444');
      p.set(cx + 3, by - 9, '#8A6444');
    }
    return p.toCanvas();
  }
  if (dan <= 0) {
    // the patted-flat damp sand where the castle will stand
    p.ellipse(cx, by, 7, 2, WET);
    p.hline(cx - 4, cx + 3, by - 1, WET_LT);
    return p.toCanvas();
  }
  // the tiers: each one the bucket's shape upside down (narrower at the top), smaller going up
  const tiers: [number, number][] = [
    [7, 6],
    [5, 5],
    [3, 4],
  ];
  let y = by;
  for (let i = 0; i < Math.min(3, dan); i++) {
    const [hw, h] = tiers[i];
    const melt = toke >= 1 && i === 0;
    for (let r = 0; r < h; r++) {
      const w = hw - Math.floor((r * 2) / h);
      p.hline(cx - w, cx + w, y - r, r === h - 1 ? WET_LT : WET);
      p.set(cx - w, y - r, WET_DK);
    }
    if (melt) {
      // the foot eaten away a little: notches along the bottom, darker (soaked)
      p.hline(cx - hw, cx + hw, y, WET_DK);
      p.set(cx - hw, y - 1, 0);
      p.set(cx + hw, y - 1, 0);
      p.set(cx - hw + 2, y, 0);
      p.set(cx + hw - 3, y, 0);
    }
    y -= h;
  }
  outline(p, { soft: true });
  if (deco) {
    // the shell window on the second tier, the pebble gate at the foot
    if (dan >= 2) {
      p.set(cx - 1, by - 8, '#F4F1E8');
      p.set(cx, by - 8, '#F8E8E0');
    }
    p.rect(cx - 1, by - 2, 2, 2, '#8A8A90');
  }
  if (deco && eda) {
    // the twig flag on top (the shade under it short: noon)
    const top = y;
    p.vline(cx, top - 6, top, '#8A6444');
    p.set(cx + 1, top - 6, '#8A6444');
    p.set(cx + 1, top - 5, '#A8825A');
  }
  return p.toCanvas();
}

registerProp('prop_sr_shiro', () => {
  const W = 20;
  const H = 26;
  const cache = new Map<string, HTMLCanvasElement>();
  return {
    ox: -2,
    oy: 16 - H + 1,
    w: W,
    h: H,
    foot: 15,
    img: (env) => {
      const dan = env.flag('flag_sr_dan');
      const deco = env.flag('flag_sr_deco') > 0;
      const eda = env.flag('flag_sr_got_eda') > 0;
      const toke = env.flag('flag_sr_toke');
      const key = `${dan}|${deco}|${eda}|${toke}`;
      let c = cache.get(key);
      if (!c) {
        c = castle(dan, deco, eda, toke);
        cache.set(key, c);
      }
      return c;
    },
    contact: 0,
  } satisfies PropArt;
});

registerProp('prop_sr_suna', () => {
  const W = 16;
  const H = 8;
  const p = new PixelCanvas(W, H);
  // a little heap of the dry sand, pale and loose, the scoop's mark on its side
  p.ellipse(8, 5, 6, 2, SAND_DK);
  p.ellipse(8, 4, 5, 2, SAND_LT);
  p.hline(5, 9, 3, '#FFF6E0');
  p.set(11, 5, SAND_DK);
  p.set(3, 6, SAND_LT);
  p.set(13, 6, SAND_LT);
  const img = p.toCanvas();
  return { ox: 0, oy: 6, w: W, h: H, foot: 14, flat: true, img: () => img } satisfies PropArt;
});

registerProp('prop_sr_kazari', (opts) => {
  const k = String(opts?.k ?? 'kaigara');
  const W = 10;
  const H = 6;
  const p = new PixelCanvas(W, H);
  if (k === 'kaigara') {
    // a small white fan of a shell, its ribs
    p.ellipse(5, 3, 3, 2, '#F4F1E8');
    p.set(4, 2, '#D8CFC0');
    p.set(6, 2, '#D8CFC0');
    p.hline(4, 6, 5, '#C8BCA8');
    p.set(5, 1, '#F8E0D8');
  } else if (k === 'koishi') {
    // a flat grey pebble
    p.ellipse(5, 3, 3, 1, '#8A8A90');
    p.hline(3, 6, 2, '#B0B0B8');
    p.hline(3, 7, 4, '#6A6A72');
  } else {
    // a bleached bit of driftwood, a fork at one end
    p.line(1, 4, 8, 2, '#A8906C');
    p.line(1, 5, 8, 3, '#8A7454');
    p.set(8, 1, '#A8906C');
  }
  outline(p, { soft: true });
  const img = p.toCanvas();
  return { ox: 3, oy: 8, w: W, h: H, foot: 14, flat: true, img: () => img } satisfies PropArt;
});

// (the colours of the beach, for the close-up: events/ch3/shiro.ts)
export const SR_SAND = { sand: SAND, lt: SAND_LT, dk: SAND_DK, wet: WET, wetDk: WET_DK, wetLt: WET_LT };
