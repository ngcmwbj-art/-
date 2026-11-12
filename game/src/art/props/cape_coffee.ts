// げむきか 2026-09-30 の 5「減らない コーヒー」（02_ch2_index #71、52_ch2_level_art 4.5、
// 50_ch2_story 9.9）: タケじいの家（map_hoshi_minka3）の土間のすみ (1,7) に、
// 手回しの コーヒーの 焙煎器と、ふもとへ 送る 麻袋。喫茶 初日の出の かずゆきの 豆は、
// 86歳の タケじいが ここで 焙煎して、ツガオ便の 軽トラで 送っている。
//
//   prop_hr_baisen  18×20: 左に 口を しばった 麻袋（紙の 札つき）、右に 七輪の 上の
//                   黒い 鉄の 筒（リベットの 帯、網の ふた）と、横に 出た ハンドル
//                   （木の にぎり）。夜で 火は 落ちている。

import { mix } from '../../engine/pixel';
import { P } from '../tiles/palette';
import { dk, lt } from './kit';
import { standProp } from './hoshi_kit';
import { registerProp } from './registry';

const BURLAP = '#D8C39A';
const BURLAP_DK = '#A8885C';
const CLAY = '#E2C48E';

registerProp('prop_hr_baisen', () =>
  standProp(
    18,
    16,
    (p) => {
      // ---- the burlap sack (left): paler than the earth floor, the neck tied, lumpy with beans
      p.ellipse(4, 11.5, 4, 4.5, BURLAP);
      p.rect(1, 8, 7, 7, BURLAP);
      p.rect(2, 4, 4, 4, BURLAP);
      p.set(2, 3, BURLAP);
      p.set(5, 3, BURLAP_DK);
      p.hline(2, 5, 4, lt(BURLAP));
      // the string round the neck
      p.hline(2, 5, 6, P.woodDark);
      // the weave (darker specks), the room's light on its left side, its shade on the right
      for (const [x, y] of [[2, 10], [4, 12], [6, 9], [3, 14], [6, 13]] as const) p.set(x, y, BURLAP_DK);
      p.vline(1, 9, 13, lt(BURLAP));
      p.vline(7, 9, 14, BURLAP_DK);
      // the paper tag on the string (『喫茶 初日の出 かずゆき 様』: two lines of ink)
      p.rect(4, 7, 4, 3, P.white);
      p.hline(5, 6, 8, P.ink);
      p.set(5, 9, mix(P.ink, P.white, 0.5));
      // ---- the brazier (七輪): a clay pot on the earth, a dark band, the little air vent (the fire is out)
      p.rect(9, 10, 8, 6, CLAY);
      p.hline(9, 16, 10, lt(CLAY));
      p.hline(9, 16, 12, dk(CLAY));
      p.vline(16, 11, 15, dk(CLAY));
      p.rect(11, 13, 3, 2, P.woodDark);
      // ---- the drum: a black iron tube lying across it, a ring in the middle, the round end to the right
      p.rect(9, 5, 7, 4, P.charcoal);
      p.hline(9, 15, 5, P.asphalt);
      p.hline(9, 15, 8, P.ink);
      p.vline(12, 5, 8, P.steel);
      p.ellipse(15.5, 6.5, 1.2, 2, P.asphalt);
      p.set(16, 6, P.steel);
      // its two feet on the brazier's rim
      p.set(10, 9, P.charcoal);
      p.set(15, 9, P.charcoal);
      // ---- the crank: out of the end, bent down, a wooden grip
      p.hline(16, 17, 6, P.steel);
      p.vline(17, 6, 8, P.steel);
      p.rect(16, 8, 2, 2, P.wood);
      p.set(16, 8, P.woodLt);
    },
    { cx: 8, base: 16, shadow: 0, contact: 16 },
  ),
);
