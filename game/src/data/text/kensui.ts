// 第1章〔懸垂〕（10_narrative 6.6・7.9、02_ch2_index #64）: the park's high bar
// (obj_tetsubo, stages 1–2) and ワイスタ巡査, who loves his pull-ups. しゅん
// tries one and can't do a single one; back at the police box the officer
// sees it on his face, lets his salute go for once and draws him a はなまる
// 「懸垂挑戦！」 (item_hanamaru_kensui). After that, his stage's repeated line
// is his own count.

/** obj_tetsubo at stages 1–2: the bar (7.9's text) and the choice. */
export const KENSUI_ASK = `@narr
鉄棒が 3段。{w=300}
いちばん 高い 段に、
夕日が 引っかかっている。
? 懸垂に 挑戦する | やめておく`;

/** The first try: still hanging from the bar after the trembling. */
export const KENSUI_TRY1_HANG = `@narr
……うっ。{w=300}
あごが、鉄棒まで とどかない。`;

/** The first try: back on the ground. */
export const KENSUI_TRY1_DOWN = `@narr
懸垂、0回。{w=300}
夕日だけが、少し 近かった。`;

/** カネナリくん watching (when he is with him, stage 2). */
export const KENSUI_FLIP = `@flip
（ぼくは 鐘が 重いので
見学です）`;

/** Every try after the first. */
export const KENSUI_AGAIN = `@narr
懸垂、0回。{w=300}
記録は、変わらない。`;

/** At the police box, the next talk after a try (once): he sees it on his face. */
export const KENSUI_KOBAN_1 = `@npc_tsurumi
挑戦してきたね！{w=300}
顔で 分かるよ！`;

/** His salute is let go (the grin pose). */
export const KENSUI_KOBAN_2 = `@narr
ワイスタ巡査の 右手が、
はじめて 額から はなれていた。`;

/** Back at his brim. */
export const KENSUI_KOBAN_3 = `@npc_tsurumi
……はっ。{w=300}失礼！
本官、うれしくて
素が 出て おりました！
/
本官も、はじめの 1回までに
3年 かかったので あります！`;

/** The notebook and the red pen. */
export const KENSUI_KOBAN_4 = `@narr
ワイスタ巡査は 手帳を 1枚 やぶって、
赤ペンで なにか 描いた。`;

/** The item (getKeyItem). */
export const KENSUI_GET = `@sys
はなまる「懸垂挑戦！」を
もらった！`;

/** The last page: the old one on his notebook's back cover (not explained). */
export const KENSUI_KOBAN_5 = `@narr
手帳の 裏表紙にも、
色あせた はなまるが 1つ あった。`;

/** After the はなまる: his stage's repeated line becomes his count. */
export const KENSUI_BRAG = `@npc_tsurumi
異常なし！{w=300}
本官は 本日も、
懸垂 12回で あります！
/
……左手だけなら、
3回で あります！`;

/** Every page above (the width check, __game.cmd.kensuiText). */
export const KENSUI_TEXTS: Record<string, string> = {
  ask: KENSUI_ASK,
  try1_hang: KENSUI_TRY1_HANG,
  try1_down: KENSUI_TRY1_DOWN,
  flip: KENSUI_FLIP,
  again: KENSUI_AGAIN,
  koban_1: KENSUI_KOBAN_1,
  koban_2: KENSUI_KOBAN_2,
  koban_3: KENSUI_KOBAN_3,
  koban_4: KENSUI_KOBAN_4,
  get: KENSUI_GET,
  koban_5: KENSUI_KOBAN_5,
  brag: KENSUI_BRAG,
};
