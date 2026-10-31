// 真昼の 顔（げむきか 10/18 の 案1、2026-10-18 依頼主の 採用。03_ch3_index）。第3章の クリア前、段階1（正午）。
// あぜ道市の 便で 着いた 写真館の 主人（map_umizoi 防波堤 (12,32)、来る人の 表の 23番目）。町は 正午で 止まっている。
// お日さまが 真上だと、帽子の つばの 下と 目の 下が まっくろに なる（写真屋が いちばん 困る 光）。下から 白い 板で
// 光を 返して やる。主人に 古い カメラを 借り、市場の 前の トロ箱の 白い ふたを グソっ君が 持つ「照明係」に なって、
// カイト（監視台）・テル（灯台の 下）・ウミ（波打ちぎわ）を 撮る。主人が 来ていない 人には 出ない。
//
//   1 よりによって、正午（主人に 話す。今の 来た ときの 1行の あと 1回）→ 大事なもの item_c3_camera（flag_mh_start）
//   2 白い ふた（トロ箱 obj_c3_toro の 2回目から）→ 大事なもの item_c3_futa（flag_mh_futa）
//   3 下から 光（撮る 人に 話すと 大写し「のぞき窓」。←→で ふたの 角度 3段、けっていで シャッター）
//     → flag_mh_<who>（1 ちょうど・2 のどだけ 明るい・3 まぶしくて 目を 細める）
//   4〜6 カイト・テル・ウミ（撮る 前に 1ページ、撮った あとに 1ページ）
//   7 かぶりたい 物は（3枚 撮って 主人に もどる）→ 8 ごほうび（朱肉 +2、みました帳③の すみ『正午の 3まい』）flag_mh_done
//   かくし：3枚とも ちょうど → 4枚目（しゅんと グソっ君。ふたは テル）flag_mh_four。③を ほどいた あとに ウミを 撮る →
//   ぬれた 髪と 貝の ブレスレット（flag_mh_umi_br）。段階2 に 持ちこさない（主人「……日が 動いた。もう、板は いらんな。」）。
//   S31 の 集合写真の 前に 1ページ（主人が 来ていて、すんで いれば）、1枚絵 cut_c3_photo の グソっ君が 白い ふたを 持つ。
//
// 決まり：天丼の 口ぐせ（「ピッ！……あ、つい。」ほか）は 使わない。帽子の 話は 主人が この 1回だけ 口に する（だれの
// 家族かは 言わない）。地の文・名札の 名前に「さん」なし（グソっ君の「テルさん」は 呼び方）。1ページ 3行 × 336px
// （textcheck2 と mhText）。表示名は c3_names.ts（カイト・テル・ウミ）、写真館の 主人は interior_south_text.ts。
// カメラ・ふたに 品名や 会社名は 出さない。

// ================================================================ 1 よりによって、正午

export const MH_A = `@npc_photo_master
やあ、しゅんくん。{w=300}
……また、町が 止まって
いるね。
/
しかも、正午だ。{w=300}
写真屋が いちばん
困る 時刻だよ。
@npc_kanenari
正午やと、{w=300}
あかんのか？
@npc_photo_master
お日さまが、真上。{w=300}
帽子の つばの 下と、
目の 下が、まっくろに なる。
/
下から、白い 板で
光を 返して やるんだ。{w=300}
……顔が、明るく なる。
/
わしは ここで 待つ。{w=300}
この カメラを、貸そう。
その場で 写真が 出てくる。`;

export const MH_GET_CAMERA = `@sys
古い カメラを かりた！`;

export const MH_A2 = `@npc_photo_master
帽子も、ゴーグルも、{w=300}
とらせんで いい。`;

/** 撮っている 間（主人に もう一度）。 */
export const MH_WAIT = `@npc_photo_master
光は、下からだよ。{w=300}
白い 板で。`;

/** グソっ君が いない とき（ふたを 持つ 人が いない）。 */
export const MH_NO_KN = `@narr
……ふたを 持つ 人が いない。`;

// ================================================================ 2 白い ふた（トロ箱）

export const MH_FUTA = `@narr
魚の 箱。{w=300}
白い ふたが、何枚も
重ねてある。
@npc_kanenari
軽いし、白いし。{w=300}
……これ、ええ 板や。`;
export const MH_GET_FUTA = `@sys
トロ箱の ふたを かりた！`;
export const MH_TERASU = `@npc_kanenari
わい、照明係や。{w=300}
……かっこええ 名前やな。`;

// ================================================================ 3〜6 下から 光（撮る 人）

/** はじめての 大写し（1回）。 */
export const MH_RULE = `@narr
←→で、ふたの 角度。{w=300}
けっていで、シャッター。`;

export const MH_BEFORE: Record<'kaito' | 'teru' | 'umi', string> = {
  kaito: `@npc_c3_kanshiin
写真ですか！{w=300}
……監視員は、帽子を
とれません。
@npc_kanenari
とらんで ええって。{w=300}
わいが 下から 照らしたる。`,
  teru: `@npc_c3_toudai
わたしは ええよ。{w=300}
昼の 灯台と いっしょ。
光らんでも、立っとる。`,
  umi: `@npc_c3_mago
写真！？{w=300}
……ゴーグル、とった
ほうが ええ？
@npc_kanenari
とらせんで ええ、て
言うとったで。{w=300}
おでこの まま いこ。`,
};

/** 撮った あと（1 ちょうど・2 のどだけ・3 まぶしい）。テルと ウミは どれでも 同じ。 */
export const MH_AFTER: Record<'kaito' | 'teru' | 'umi', string[]> = {
  kaito: [
    `@npc_c3_kanshiin
つばの 下まで、{w=300}
明るい……。`,
    `@npc_c3_kanshiin
……のどだけ、{w=300}
明るいです。`,
    `@npc_c3_kanshiin
ま、まぶしい……。`,
  ],
  teru: [
    `@npc_kanenari
テルさん、光ったで。{w=300}
……下から やけど。
@npc_c3_toudai
あら。{w=300}
昼に 光ったのは、
はじめてじゃね。`,
  ],
  umi: [
    `@npc_c3_mago
あはは！{w=300}
グソっ君、ふたで
顔 かくれとる！`,
  ],
};

/** かくし：③（ウミの 海）を ほどいた あとに ウミを 撮った（1回）。 */
export const MH_UMI_BR = `@npc_kanenari
去年の ブレスレット、{w=300}
写っとる！`;

export const MH_SHOT_NAMES = ['ちょうど', 'のどだけ', 'まぶしい'];

export function mhCount(n: number): string {
  return `@sys\n写真 ${n}/3`;
}

/** 撮った あと、もう一度 話す。 */
export const MH_TAKEN: Record<'kaito' | 'teru' | 'umi', string> = {
  kaito: `@npc_c3_kanshiin
写真、{w=300}
楽しみに して います。`,
  teru: `@npc_c3_toudai
灯台の 写真より、{w=300}
ええ 顔 しとった？`,
  umi: `@npc_c3_mago
ゴーグルの まま、{w=300}
写ったね！`,
};

// ================================================================ 7 かぶりたい 物は（主人に もどる）

export const MH_FIN_A = `@narr
主人は、3枚の 写真を
1枚ずつ 見た。
@npc_photo_master
……ええ 顔だ。{w=300}
止まった 正午でも、
顔は、ちゃんと 写る。
/
……ゴーグル、{w=300}
とらせなかったね。
@npc_kanenari
とらんで ええ、て
言うたやん。
@npc_photo_master
10年前、帽子を {w=300}
かぶりたがった 子に、
とらせた ことが あってね。
/
写真館の 決まりだった。{w=300}
……ずっと、気に なってた。
/
かぶりたい 物は、{w=300}
かぶって 写る もんだ。
@npc_kanenari
……ほな、わいの
はちまきも、
そのまま やな。
@npc_photo_master
もちろん。{w=300}
……照明係の ぶんも、
1枚 とって おこう。`;

/** かくし：3枚とも ちょうど → 4枚目（しゅんと グソっ君。ふたは テル）。 */
export const MH_FOUR_A = `@npc_photo_master
1枚、余った。{w=300}
……2人で、並びな。
@npc_kanenari
照明係が 写る ほうに
回ったら、{w=300}
だれが 持つんや。
@npc_c3_toudai
わたしが 持とうか。{w=300}
……灯台の 仕事よ。`;
export const MH_FOUR_B = `@npc_photo_master
……ええ 2人だ。`;

export const MH_REWARD = `@narr
カメラと ふたは、
主人に 返した。
@sys
朱肉が 2 ふえた。
/
みました帳③の すみに、
『正午の 3まい』の ページ。`;

/** すんだ あとの 主人（1回。そのあとは 今の 1行）。 */
export const MH_AFTER_MASTER = `@npc_photo_master
……ふつうの 日の 写真も、{w=300}
いいもんだよ。`;

/** 段階2 に なった（撮りかけ）。 */
export const MH_END = `@npc_photo_master
……日が 動いた。{w=300}
もう、板は いらんな。`;
export const MH_END_RETURN = `@narr
カメラと ふたは、
主人に 返した。`;

// ================================================================ S31 の 1ページ（集合写真の 前）

export const MH_S31 = `@npc_photo_master
……照明係、たのむよ。
@npc_kanenari
まかしとき！`;

// ================================================================ 大写し「のぞき窓」・帳面

export const MH_UI = {
  place: 'のぞき窓',
  angles: ['低い', 'ちょうど', '高い'],
  keys: ['←→ ふたの 角度', 'けってい 撮る'],
};

export const MH_BOOK = {
  title: '正午の 3まい',
  names: ['カイト', 'テル', 'ウミ', 'わいら'],
  /** ちょうど（朱の ◎）・惜しい（えんぴつの ○）。 */
  marks: ['◎', '○'],
  pencil: '照明係 わい',
};

export const MH_ITEM_CAMERA_DESC: [string, string] = ['写真館の 主人に かりた。', 'その場で 写真が 出てくる。'];
export const MH_ITEM_FUTA_DESC: [string, string] = ['市場の 前の トロ箱の ふた。', '軽くて、白い。下から 光を 返す。'];

/** 文の検査（mhText・debug の walk）に出す物。 */
export const MH_TEXTS: Record<string, unknown> = {
  MH_A, MH_GET_CAMERA, MH_A2, MH_WAIT, MH_NO_KN, MH_FUTA, MH_GET_FUTA, MH_TERASU, MH_RULE, MH_BEFORE, MH_AFTER, MH_UMI_BR,
  count: [1, 3].map(mhCount), MH_TAKEN, MH_FIN_A, MH_FOUR_A, MH_FOUR_B, MH_REWARD, MH_AFTER_MASTER, MH_END, MH_END_RETURN, MH_S31,
};
