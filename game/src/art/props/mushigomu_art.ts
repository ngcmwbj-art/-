// 上へ 降る 雪（02_ch2_index #101、events/ch2/mushigomu.ts）の 絵：分校の 昇降口の まわり。
//
//   prop_mg_tarai         外の 水道（細い 管と 蛇口）と、水を 張った 古い ブリキの たらい。
//   prop_mg_kuukiire      赤い 筒の 足踏みの 空気入れ（Tの 取っ手、黒い ホース）。
//   prop_mg_jitensha_oki  自転車置き場（2マス）：低い 鉄の 枠に、古い 子ども用の 自転車が 2台。
//                         泥よけに 名前の シール。直すと タイヤが 丸く なる（flag_mg_kid_moto・_asuka）。

import { mix } from '../../engine/pixel';
import { P } from '../tiles/palette';
import { registerProp } from './registry';
import { standProp } from './hoshi_kit';
import type { PropArt, PropEnv } from './types';

const K = '#1B1733';
const TIN = { lt: '#C8CCD4', base: '#9AA0AC', dk: '#6A707C' };

registerProp('prop_mg_tarai', () =>
  standProp(
    16,
    20,
    (p) => {
      // the tap's pipe up the wall, the tap
      p.vline(2, 0, 13, TIN.dk);
      p.vline(3, 0, 13, TIN.base);
      p.hline(2, 6, 3, TIN.base);
      p.set(6, 4, TIN.dk);
      p.set(6, 5, P.aqua);
      p.rect(1, 1, 4, 2, P.verm); // the red handle
      // the tub: an oval of tin, the water in it
      p.ellipse(9, 15, 6.5, 3.5, TIN.dk);
      p.ellipse(9, 14, 6.5, 3, TIN.lt);
      p.ellipse(9, 14, 5.2, 2.2, mix(P.blue, P.navy, 0.35));
      p.hline(6, 9, 13, P.aqua);
      p.set(11, 14, P.white);
      p.hline(3, 15, 17, TIN.dk);
      p.hline(4, 14, 18, TIN.base);
    },
    { cx: 8, base: 20, shadow: 4 },
  ),
);

registerProp('prop_mg_kuukiire', () =>
  standProp(
    12,
    22,
    (p) => {
      // the foot plates, the red barrel, the T handle
      p.hline(1, 10, 21, K);
      p.hline(2, 9, 20, TIN.dk);
      p.rect(5, 6, 3, 14, P.verm);
      p.vline(5, 6, 19, P.vermLt);
      p.vline(7, 6, 19, P.vermShade);
      p.vline(6, 2, 5, TIN.lt);
      p.hline(2, 10, 1, K);
      p.hline(2, 10, 2, P.charcoal);
      // the black hose hanging off the side, its head
      p.line(8, 17, 10, 12, K);
      p.line(10, 12, 10, 8, K);
      p.set(10, 7, P.brass);
    },
    { cx: 8, base: 22, shadow: 12 },
  ),
);

/** A small child's bicycle (14×11): the tyres flat (squashed at the ground) or round. */
function kidBike(p: { set(x: number, y: number, c: string): void; ring(cx: number, cy: number, rx: number, ry: number, c: string): void; line(x0: number, y0: number, x1: number, y1: number, c: string): void; hline(x0: number, x1: number, y: number, c: string): void; rect(x: number, y: number, w: number, h: number, c: string): void }, ox: number, oy: number, frame: string, round: boolean, sticker: string): void {
  for (const cx of [ox + 3, ox + 11]) {
    if (round) p.ring(cx, oy + 8, 2.6, 2.6, K);
    else {
      // flat: the tyre sags at the bottom
      p.ring(cx, oy + 8, 2.6, 2.2, K);
      p.hline(cx - 3, cx + 3, oy + 10, K);
    }
    p.set(cx, oy + 8, P.steel);
  }
  p.line(ox + 3, oy + 8, ox + 7, oy + 4, frame);
  p.line(ox + 7, oy + 4, ox + 11, oy + 8, frame);
  p.line(ox + 7, oy + 4, ox + 10, oy + 4, frame);
  p.line(ox + 10, oy + 4, ox + 11, oy + 8, frame);
  p.hline(ox + 6, ox + 8, oy + 2, P.charcoal); // the saddle
  p.line(ox + 2, oy + 2, ox + 3, oy + 7, frame); // the fork
  p.hline(ox + 1, ox + 3, oy + 1, K);
  // the rear mudguard and its name sticker
  p.hline(ox + 9, ox + 13, oy + 5, TIN.base);
  p.rect(ox + 11, oy + 5, 2, 1, sticker);
}

registerProp('prop_mg_jitensha_oki', () => {
  const cache = new Map<string, HTMLCanvasElement>();
  const build = (moto: boolean, asuka: boolean): PropArt =>
    standProp(
      32,
      16,
      (p) => {
        // the low iron rack: two posts and a rail
        p.vline(1, 6, 15, TIN.dk);
        p.vline(30, 6, 15, TIN.dk);
        p.hline(1, 30, 9, TIN.base);
        p.hline(1, 30, 15, TIN.dk);
        kidBike(p, 1, 4, '#3A6AB0', moto, P.white);
        kidBike(p, 16, 4, '#C8506A', asuka, P.goldPale);
      },
      { cx: 16, base: 16, shadow: 6 },
    );
  return {
    ox: 0,
    oy: 0,
    w: 32,
    h: 16,
    foot: 15,
    img: (env: PropEnv) => {
      const m = env.flag('flag_mg_kid_moto') > 0;
      const a = env.flag('flag_mg_kid_asuka') > 0;
      const key = `${m}:${a}`;
      let c = cache.get(key);
      if (!c) {
        c = build(m, a).img(env)!;
        cache.set(key, c);
      }
      return c;
    },
    shadow: 6,
    contact: 26,
    contactX: 16,
  };
});
