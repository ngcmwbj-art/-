// ごはん 一粒、花 一つ（02_ch2_index #107、events/ch2/hana.ts）の 絵：いちばん 上の 段の 西の 田、水口の そばの
// 遅れた 穂（6か所）。稲は 田の 地面の 絵の まま、ここは トマトの 灯りの 中で 光る 物だけ（prop_as_tama と 同じ 形）。
//
//   prop_hn_ho  opts.i（0〜5）・opts.look（'ato' 白い 糸くず・'kore' 閉じた 青い もみ・'mae' 葉に くるまれた 穂）。
//               はじめた あと（flag_hn_start）、その か所を 見る までの あいだだけ ちらちら 光る。

import { registerProp } from './registry';
import { standProp } from './hoshi_kit';
import type { PropEnv } from './types';

function shining(env: PropEnv, i: number): boolean {
  return env.flag('flag_ch2_got_tomato') > 0 && env.flag('flag_hn_start') > 0 && !env.flag('flag_hn_done') && !env.flag(`flag_hn_seen_${i}`);
}

registerProp('prop_hn_ho', (opts) => {
  const i = Number(opts.i ?? 0);
  const look = String(opts.look ?? 'kore');
  // the ears' tips bowing over the water (a few px per ear)
  const pts: [number, number][] = [[3, 2], [7, 1], [11, 3], [5, 5], [10, 6]];
  const art = standProp(16, 10, () => {}, { cx: 8, base: 12, outline: false, shadow: 0 });
  return {
    ...art,
    glow: (g, x, y, env) => {
      if (!shining(env, i)) return;
      pts.forEach(([dx, dy], k) => {
        const tw = (Math.sin(env.t / 420 + k * 1.3 + i) + 1) / 2;
        const gx = x + art.ox + dx;
        const gy = y + art.oy + dy;
        if (look === 'ato') {
          // the white threads that hang from the glumes
          g.rect(gx, gy, 1, 2, '#F4F0E0', 0.35 + 0.5 * tw);
        } else if (look === 'mae') {
          if (k < 2) g.rect(gx, gy, 2, 1, '#9AD870', 0.3 + 0.4 * tw);
        } else {
          g.rect(gx, gy, 1, 1, '#E8F8D8', 0.35 + 0.55 * tw);
        }
      });
    },
  };
});
