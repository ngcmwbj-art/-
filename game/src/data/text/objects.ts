// Examine texts (10_narrative.md 7章) where the story needs more than the map
// data's default (flag branches) or where the default drifted from the
// book. Keys are object ids; values are stage-keyed like the map data
// (s0 / s1 / s2 / 's1+' / default).

import type { StageText } from '../../world/types';

export const OBJ_TEXT: Record<string, StageText> = {
  // 7.6 交番の自転車
  obj_koban_bicycle: `@narr
交番の 自転車。{w=300}
サドルが、巡査の 形に
へこんでいる。`,
  // 7.8 自販機のあった場所（段階2）
  obj_vending_trace: `@narr
自販機の あった 場所。{w=300}
日焼けの 跡と、コンセントだけ
残っている。
/
コードを 引きずった 跡が、
駐車場の ほうへ 続いている。`,
  // 7.8 掲示板のポスター
  obj_poster_board: `@narr
『夕鳴町PR大使 カネナリくん
引退セレモニー』。{w=300}
去年の 日付だ。`,
  // 7.12 M1 フロア案内板: the floor list is broken between the floors (a
  // line mustn't start with 「・」)
  obj_floor_guide: `@narr
『1F 正面ホール・フードコート・健康器具
2F 迷子センター』
/
手書きで：『迷子センターの カギ
→ フードコート 忘れ物
カウンター』`,
  // 7.10 カート置き場
  obj_cart_corral: `@narr
カート置き場は からっぽ。{w=300}
カートたちは 家出中 らしい。`,
};

/** 7.8 obj_poster_board while Kanenari-kun is in the party. */
export const POSTER_WITH_KANENARI = `@narr
カネナリくんは、ポスターを
見ないように している。`;

/** 8.9 obj_cart_corral after fushigi_09. */
export const CART_CORRAL_DONE = `@narr
カートたちは 置き場で、
ぴったり 重なっている。`;

/** 12.2 銀座のガチャ台. */
export const GACHA_GINZA = `@narr
1回 100円。{w=300}
『からっぽ も 入っています』と、
正直に 書いてある。`;
export const GACHA_GINZA_S1 = `@narr
ハンドルが、途中で 止まる。{w=300}
ガチャの 中も、
17時で 止まっている らしい。`;
