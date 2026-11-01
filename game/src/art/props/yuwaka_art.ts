// 湯を わかしてから（02_ch2_index #106、events/ch2/yuwaka.ts）の 絵。
//
//   prop_yw_corn      裏の 畑の とうもろこし 1株（背は しゅんより 高い。茎・長い 葉・実と ひげ）。opts.k：'tori' ひげが
//                     茶色に かれた・'hayai' ひげが 青い・'kajiri' 先を かじられた。opts.picked：もいだ あと（茎だけ）。
//                     灯りが あると 葉の ふちが ちらちら 光る（風は ないので 葉は 動かない）。
//   prop_yw_kabe      畑の 西の はしの 家の 裏の 板壁（1マス ぶん）。opts.door：勝手口の 木の 戸。
//   prop_yw_koya      畑の 北の すみの 物置（トタン。ざると 手ぬぐい）。
//   prop_yw_harigami  シゲじいと スギばあの 家の 茶だんすの 横の 貼り紙（スギばあの 字）。
//   prop_yw_uraguchi  同じ 家の 東の 壁の 勝手口 (11,4) の しきい（床の 上）。
//   prop_yw_nabe      集会所の お茶の 台の こんろの 大なべ（わいた あとは 湯気）。

import { mix, PixelCanvas } from '../../engine/pixel';
import { P } from '../tiles/palette';
import { registerProp } from './registry';
import { standProp } from './hoshi_kit';
import type { PropArt, PropEnv } from './types';

const STALK = '#5E8A3A';
const LEAF = '#4E7A32';
const LEAF_LT = '#7AA24A';
const LEAF_DK = '#2E4A22';
const HUSK = '#7AA84A';
const HUSK_LT = '#9CC468';
const SILK_BROWN = '#8A5A32';
const SILK_GREEN = '#B8D888';
const KERNEL = '#F2D25A';

function lit(env: PropEnv): boolean {
  return env.flag('flag_ch2_got_tomato') > 0 && env.flag('flag_ch2_stage') >= 1;
}

registerProp('prop_yw_corn', (opts) => {
  const k = String(opts.k ?? 'hayai');
  const picked = !!opts.picked;
  const v = Number(opts.i ?? 0);
  const W = 18;
  const H = 46;
  const art = standProp(
    W,
    H,
    (p) => {
      const sx = 9;
      // the stalk, its joints
      p.rect(sx - 1, 4, 2, H - 4, STALK);
      p.vline(sx - 1, 4, H - 1, mix(STALK, P.white, 0.15));
      for (const y of [14, 24, 34]) p.hline(sx - 1, sx, y, LEAF_DK);
      // the tassel on top (the male flowers, dried)
      p.vline(sx, 0, 4, '#B89A5A');
      p.set(sx - 2, 1, '#B89A5A');
      p.set(sx + 2, 2, '#B89A5A');
      p.line(sx, 2, sx - 3, 4, '#A88A4A');
      // the long leaves, arched out and down
      const leaf = (y0: number, dir: 1 | -1, len: number) => {
        for (let i = 0; i < len; i++) {
          const x = sx + dir * (1 + i);
          const y = y0 - Math.round(Math.sin((i / len) * 2.2) * 5) + Math.round((i / len) * (i / len) * 6);
          p.set(x, y, LEAF);
          p.set(x, y + 1, LEAF_DK);
          if (i % 3 === 0) p.set(x, y - 1, LEAF_LT);
        }
      };
      leaf(12 + (v % 2), -1, 8);
      leaf(18, 1, 8);
      leaf(28 - (v % 3), -1, 8);
      leaf(34, 1, 7);
      if (picked) {
        // the broken stub where the ear was
        p.rect(sx + 1, 21, 2, 3, mix(HUSK, P.white, 0.2));
        p.set(sx + 2, 20, '#E8E0B0');
        return;
      }
      // the ear on the stalk's side, in its husk, the silk out of the tip
      p.rect(sx + 1, 17, 4, 10, HUSK);
      p.vline(sx + 1, 18, 26, HUSK_LT);
      p.set(sx + 4, 26, LEAF_DK);
      p.rect(sx + 2, 15, 2, 2, HUSK);
      const silk = k === 'hayai' ? SILK_GREEN : SILK_BROWN;
      p.set(sx + 3, 13, silk);
      p.set(sx + 4, 12, silk);
      p.set(sx + 2, 14, silk);
      p.set(sx + 5, 13, mix(silk, P.ink, 0.2));
      if (k === 'kajiri') {
        // the tip chewed open: yellow kernels, bits of husk
        p.rect(sx + 2, 15, 3, 3, KERNEL);
        p.set(sx + 3, 16, '#C8A838');
        p.set(sx + 1, 15, '#D8D0A0');
      }
    },
    { cx: 8, base: 16, shadow: 6, contact: 8 },
  );
  return {
    ...art,
    glow: (g, x, y, env) => {
      if (!lit(env)) return;
      // the lantern on the leaves' edges (no wind: the glints only twinkle)
      for (let j = 0; j < 4; j++) {
        const tw = (Math.sin(env.t / 520 + j * 1.9 + v) + 1) / 2;
        const gx = x + art.ox + [2, 15, 3, 14][j];
        const gy = y + art.oy + [11, 16, 26, 32][j];
        g.rect(gx, gy, 2, 1, '#F4F0C8', 0.15 + 0.3 * tw);
      }
    },
  };
});

registerProp('prop_yw_kabe', (opts) => {
  const door = !!opts.door;
  const top = !!opts.top;
  return standProp(
    16,
    30,
    (p) => {
      // weathered vertical boards, the eave's shadow at the top
      p.rect(0, 0, 16, 30, '#5A4434');
      for (let x = 0; x < 16; x += 4) {
        p.vline(x, 0, 29, '#3E2E24');
        p.vline(x + 1, 0, 29, '#6A5242');
      }
      p.rect(0, 0, 16, 4, '#2A2028');
      if (top) p.rect(0, 0, 16, 8, '#2A2028');
      if (door) {
        // the kitchen door: a lighter plank door in its frame, a round wooden pull
        p.rect(2, 6, 12, 24, '#7A6048');
        p.rect(2, 6, 12, 1, '#3E2E24');
        p.vline(2, 6, 29, '#3E2E24');
        p.vline(13, 6, 29, '#3E2E24');
        for (const y of [12, 20]) p.hline(3, 12, y, '#5A4434');
        p.set(11, 18, '#C8A878');
        p.set(11, 19, '#8A6A48');
      }
    },
    { cx: 8, base: 16, shadow: 0, outline: false },
  );
});

registerProp('prop_yw_koya', () =>
  standProp(
    18,
    28,
    (p) => {
      // a little tin shed, its door open: the sieve and the towel on a nail
      p.rect(1, 6, 16, 22, '#7A8088');
      for (let x = 1; x < 17; x += 3) p.vline(x, 6, 27, '#5A6068');
      p.rect(0, 3, 18, 4, '#6A5A4A');
      p.hline(0, 17, 3, '#8A7A62');
      p.rect(4, 12, 10, 16, '#2A2830');
      p.ellipse(9, 16, 3, 2, '#C8A868');
      p.ellipse(9, 16, 2, 1, '#8A7048');
      p.rect(6, 20, 3, 6, '#E8E4D8');
      p.set(7, 19, '#9A9AA0');
    },
    { cx: 8, base: 16, shadow: 6 },
  ),
);

registerProp('prop_yw_harigami', () => {
  // the paper pasted beside the tea cabinet: スギばあの brush strokes (unreadable at this size)
  const p = new PixelCanvas(8, 10);
  p.rect(0, 0, 8, 10, '#F2ECD8');
  p.hline(0, 7, 0, '#D8D0B8');
  for (const [x, y0, y1] of [[6, 1, 8], [4, 1, 6], [2, 2, 8]] as const) p.vline(x, y0, y1, '#3A3440');
  p.set(4, 8, '#3A3440');
  p.set(1, 9, '#C8C0A8');
  const img = p.toCanvas();
  return { ox: 4, oy: -22, w: 8, h: 10, foot: 16, img: () => img } satisfies PropArt;
});

registerProp('prop_yw_uraguchi', () => {
  // the kitchen door in the east wall: the sill on the floor's edge, the night beyond the open gap
  const p = new PixelCanvas(16, 16);
  p.rect(12, 1, 4, 14, '#1A1A2A');
  p.rect(11, 1, 1, 14, '#6A5242');
  p.rect(10, 0, 6, 1, '#4A382A');
  p.rect(10, 15, 6, 1, '#4A382A');
  p.rect(13, 4, 2, 8, '#2A2840');
  const img = p.toCanvas();
  return { ox: 0, oy: 0, w: 16, h: 16, foot: 0, flat: true, img: () => img } satisfies PropArt;
});

registerProp('prop_yw_nabe', () => {
  const art = standProp(
    12,
    10,
    (p) => {
      // the big pot on the little stove, at the table's right end
      p.rect(1, 2, 10, 6, '#7A808A');
      p.hline(1, 10, 2, '#A8AEB8');
      p.hline(0, 11, 1, '#5A606A');
      p.set(0, 3, '#3A3F48');
      p.set(11, 3, '#3A3F48');
      p.rect(2, 8, 8, 2, '#3A3440');
      p.set(5, 9, '#E86A3A');
      p.set(7, 9, '#F28A3A');
    },
    { cx: 6, base: 14, foot: 33, shadow: 0, outline: false },
  );
  return {
    ...art,
    over: (g, x, y, env) => {
      if (!env.flag('flag_yw_waita')) return;
      // the steam curling up off the boiling water
      for (let i = 0; i < 3; i++) {
        const k = ((env.t / 900 + i / 3) % 1 + 1) % 1;
        const sx = x + art.ox + 4 + i * 2 + Math.round(Math.sin(k * 6 + i) * 2);
        const sy = y + art.oy - Math.round(k * 12);
        g.rect(sx, sy, 2, 2, '#F4F4F8', 0.5 * (1 - k));
      }
    },
  };
});

registerProp('prop_yw_uraguchi_to', () =>
  // the kitchen door's wooden leaf, pushed open against the east wall (a narrow board standing up), and a pair of
  // straw sandals on the floor in front of it
  standProp(
    16,
    30,
    (p) => {
      p.rect(11, 2, 4, 28, '#7A6048');
      p.vline(11, 2, 29, '#5A4434');
      p.vline(14, 2, 29, '#3E2E24');
      for (const y of [9, 18]) p.hline(11, 14, y, '#5A4434');
      p.set(12, 15, '#C8A878');
      p.rect(2, 26, 3, 3, '#C8B078');
      p.rect(6, 26, 3, 3, '#C8B078');
      p.set(3, 26, '#8A6A48');
      p.set(7, 26, '#8A6A48');
    },
    { cx: 8, base: 16, shadow: 0, outline: false },
  ),
);
