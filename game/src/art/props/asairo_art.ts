// 朝の 前の 色（02_ch2_index #104、events/ch2/asairo.ts）の 絵：村の 露の 場所。
//
//   prop_as_satoimo   ソワカの 家の 裏の サトイモ 1株（大きな 葉が 3〜4枚、長い 葉柄）。灯りで 葉の 上の 玉が 光る。
//   prop_as_kumonosu  火の見やぐらの 足もとの クモの 巣（柱の あいだ）。灯りで 露の 首かざりが 光る。
//   prop_as_tama      稲の 葉の 先の 玉（棚田の トマじいの 東）。灯りで ちらちら 光る。
//
// 光る 物は glow（灯りの 層）。段階0（灯りが ない）は 光らない。露を もらった あとは 光らない（opts.k の flag）。

import { mix } from '../../engine/pixel';
import { P } from '../tiles/palette';
import { registerProp } from './registry';
import { standProp } from './hoshi_kit';
import type { PropEnv } from './types';

const LEAF = '#3E6A3A';
const LEAF_LT = '#5E8E4A';
const LEAF_DK = '#24442A';
const STEM = '#6A8A4A';
const DROP = '#E8F4FA';

/** 灯りが あって、まだ その 露を もらって いない（光る）。 */
function shining(env: PropEnv, k: string): boolean {
  return env.flag('flag_ch2_got_tomato') > 0 && env.flag('flag_ch2_stage') >= 1 && !env.flag(`flag_as_tsuyu_${k}`) && !env.flag('flag_as_done');
}

registerProp('prop_as_satoimo', (opts) => {
  const v = Number(opts.v ?? 0);
  // the leaves' tips (where the drops sit), per plant
  const drops: [number, number][] = v === 1 ? [[7, 9], [17, 6]] : v === 2 ? [[9, 7], [19, 10]] : [[6, 8], [16, 5], [20, 11]];
  const art = standProp(
    26,
    30,
    (p) => {
      // the long stalks from the ground
      for (const [x, top] of [[10, 12], [13, 9], [16, 13]] as const) {
        p.vline(x, top, 29, STEM);
        p.set(x + 1, top + 4, mix(STEM, P.white, 0.2));
      }
      // the big heart-shaped leaves, tipped a little
      const leaf = (cx: number, cy: number, rx: number, ry: number, c: string) => {
        p.ellipse(cx, cy, rx, ry, c);
        p.ellipse(cx, cy - 1, rx - 1, ry - 1, mix(c, LEAF_LT, 0.5));
        p.hline(cx - rx + 2, cx + rx - 2, cy, mix(c, LEAF_DK, 0.4));
        p.set(cx, cy + ry, LEAF_DK);
      };
      if (v === 1) {
        leaf(8, 11, 7, 4, LEAF);
        leaf(18, 8, 7, 5, LEAF_DK);
        leaf(13, 16, 6, 3, LEAF);
      } else if (v === 2) {
        leaf(10, 9, 8, 4, LEAF_DK);
        leaf(19, 12, 6, 4, LEAF);
        leaf(7, 15, 5, 3, LEAF);
      } else {
        leaf(7, 10, 7, 4, LEAF);
        leaf(16, 7, 8, 5, LEAF_DK);
        leaf(20, 13, 5, 3, LEAF);
        leaf(11, 16, 6, 3, LEAF);
      }
      for (const [x, y] of drops) {
        p.set(x, y, mix(DROP, LEAF, 0.4));
        p.set(x + 1, y, mix(DROP, LEAF, 0.6));
      }
    },
    { cx: 13, base: 18, shadow: 8 },
  );
  return {
    ...art,
    glow: (g, x, y, env) => {
      if (!shining(env, 'satoimo')) return;
      const tw = (Math.sin(env.t / 500 + v * 2) + 1) / 2;
      for (const [dx, dy] of drops) {
        const gx = x + art.ox + dx;
        const gy = y + art.oy + dy;
        g.rect(gx, gy, 2, 1, '#FFFFFF', 0.55 + 0.4 * tw);
        g.rect(gx - 1, gy - 1, 4, 3, '#FFE7A3', 0.15 + 0.15 * tw);
      }
    },
  };
});

registerProp('prop_as_kumonosu', () => {
  const art = standProp(
    18,
    18,
    (p) => {
      // the threads: spokes from the hub, three rings
      const cx = 9;
      const cy = 8;
      const c = mix(P.white, '#8A90A0', 0.35);
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2;
        p.line(cx, cy, Math.round(cx + Math.cos(a) * 8), Math.round(cy + Math.sin(a) * 7), c);
      }
      for (const r of [3, 5, 7]) {
        for (let k = 0; k < 16; k++) {
          const a = (k / 16) * Math.PI * 2;
          p.set(Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r * 0.9), c);
        }
      }
      // the little spider asleep at the hub
      p.set(cx, cy, P.ink);
      p.set(cx + 1, cy, P.charcoal);
    },
    { cx: 8, base: 14, outline: false, shadow: 0 },
  );
  return {
    ...art,
    glow: (g, x, y, env) => {
      if (!shining(env, 'kumo')) return;
      const cx = x + art.ox + 9;
      const cy = y + art.oy + 8;
      for (let k = 0; k < 12; k++) {
        const a = (k / 12) * Math.PI * 2;
        const tw = (Math.sin(env.t / 420 + k) + 1) / 2;
        g.rect(Math.round(cx + Math.cos(a) * 5), Math.round(cy + Math.sin(a) * 4.5), 1, 1, '#FFFFFF', 0.4 + 0.5 * tw);
      }
    },
  };
});

registerProp('prop_as_tama', () => {
  const pts: [number, number][] = [[2, 3], [6, 1], [9, 4], [13, 2]];
  // (the rice is the paddy's own: only the glints are this prop's)
  const art = standProp(16, 8, () => {}, { cx: 8, base: 12, outline: false, shadow: 0 });
  return {
    ...art,
    glow: (g, x, y, env) => {
      if (!shining(env, 'ine')) return;
      pts.forEach(([dx, dy], k) => {
        const tw = (Math.sin(env.t / 380 + k * 1.7) + 1) / 2;
        g.rect(x + art.ox + dx, y + art.oy + dy, 1, 1, '#FFFFFF', 0.35 + 0.55 * tw);
      });
    },
  };
});
