// 絵の きゅうりは、とり遅れない（げむきか 10/24 の 案5、2026-10-24 依頼主の 採用。02_ch2_index）。第2章、h1〜h2
// （トマトの 灯りで 葉の かげが 見える 間）。無人販売所の 世話人の ソワカは、家の 横で きゅうりを 作っている。
// 決まりは 朝どり。村は 夜の まま 止まって、とりに 来られなかった 間に、きゅうりは とり遅れた。
//
//   1 朝どりの 決まり（ソワカの〔kyuri〕。今の 会話の あと、もう 1回 話す）→ flag_ky_start。h0 は 最初の 2ページと
//     「暗くて、葉の かげが 見えないのよ。」だけ（flag_ky_h0）
//   2 大写し「葉の かげ」（ソワカの 家の 西の 路地の きゅうりの 棚 obj_ky_tana。←→↑↓ 灯りを 動かす、けってい 切る。
//     3本：ちょうど・大きめ・とり遅れ〈いちばん 奥の 低い 所〉）→ 3本 持つ（item_ky_sanbon）
//   3 札と くらべる（無人販売所の 札 obj_hoshi_mujin）→ 4 いちばん おいしい とき → 5 ごほうび（朱肉 +2、
//     みました帳②の すみ、きゅうり〈とれたて〉2つ）。とり遅れの 1本は、販売所の 台に『ご自由に』
//
// 調べた こと：きゅうりは 夏は 実の 育ちが 早く、毎日 とる。とり遅れて 大きく なりすぎると 株が 弱って、あとの 実が
// 減る（滋賀県の 資料。げむきか 10-24 の 出典）。会議の「3日で 腕より 太い は 大げさかも」に 合わせて、
// 「グソっ君の 腕くらい 太い」に 落とした（1か月 とらなかった 実で 直径 5cm ほどの 例が ある。3日 ぶんは それより 小さい）。
// 1日 遅れで「大きめ・くの字」、3日 ぶんで「腕くらい」。夜の 間に 太る 話は しない。
// 決まり：時刻の 数字・「まだ」・第3章の 中身・「いただきます」を 入れない（「3日 ぶん」は 日の 数）。地の文・名札に
// 「さん」なし。1ページ 3行 × 336px（textcheck2 と kyText）。

// ================================================================ 1 朝どりの 決まり（ソワカの〔kyuri〕）

const KYURI_A = `@npc_hoshi_sawako
うちの きゅうりは、{w=300}
朝どりの 決まりなのよ。
/
朝が 来ないでしょ。{w=300}
……とりに 来られ
なかったの。`;

/** h0（灯りが ない）：今の 会話の あと、1回。 */
export const KY_H0 = `${KYURI_A}
/
暗くて、{w=300}
葉の かげが
見えないのよ。`;

export const KY_START = `${KYURI_A}
/
きゅうりは、{w=300}
毎日 とらないと、
すぐ 大きく なるの。
/
とり遅れると、{w=300}
木が 疲れて、次が
ならなく なるのよ。
@npc_kanenari
木が、{w=300}
疲れるんか。
@npc_hoshi_sawako
はさみ、{w=300}
貸して あげる。
ねじっちゃ だめよ。
/
家の 横の 棚。{w=300}
葉の かげを、
灯りで 見てね。`;

/** 〔kyuri〕の あと、3本 そろう 前に ソワカ。 */
export const KY_WAIT = `@npc_hoshi_sawako
家の 横の 棚よ。{w=300}
葉の かげに、
かくれてるの。`;

/** 3本 持って、ソワカ（札の ほうへ）。 */
export const KY_FUDA_GO = `@npc_hoshi_sawako
あら、とれたのね。{w=300}
……札の 絵と、
くらべて ごらん。`;

// ================================================================ 棚

/** 棚（〔kyuri〕の 前、灯りが ある）。 */
export const KY_TANA = `@narr
きゅうりの 棚。{w=300}
ネットに、大きな 葉が
重なっている。`;

/** 棚（段階0、灯りが ない）。 */
export const KY_TANA_DARK = `@narr
きゅうりの 棚。{w=300}
暗くて、葉の かげが
見えない。`;

/** 棚（3本 とった あと）。 */
export const KY_TANA_DONE = `@narr
黄色い 花が、{w=300}
いくつか 咲いている。`;

// ================================================================ 2 大写し「葉の かげ」

export const KY_KAGE_START = `@narr
灯りを 動かして、{w=300}
葉の かげを 照らす。`;

/** 灯りを 当てて 何も ない 所（失敗に しない）。 */
export const KY_HA = `@narr
大きな 葉。{w=300}
……裏が、ちくちく
している。`;

/** 1本目（ちょうど）。 */
export const KY_ICHI_A = `@narr
葉の かげに、{w=300}
まっすぐな 1本。`;

export const KY_ICHI_B = `@npc_kanenari
いたっ！{w=300}
トゲ！
@npc_hoshi_sawako
トゲが 痛いのは、{w=300}
とれたての しるしよ。
@npc_kanenari
こいつも、{w=300}
よろい 着とる！`;

/** グソっ君が いない とき（1本目の あと）。 */
export const KY_ICHI_SOLO = `@narr
ちくっ。{w=300}
トゲが、痛い。
@npc_hoshi_sawako
とれたての しるしよ。`;

/** かくし：1本目の 所で、もう 1回 けってい（1回）。 */
export const KY_NIDO = `@npc_kanenari
……わかっとって {w=300}
さわってもうた。`;

/** 2本目（大きめ）。 */
export const KY_NI = `@narr
太い。{w=300}
……少し、くの字に
まがっている。
@npc_hoshi_sawako
1日 遅れると、{w=300}
これよ。`;

/** 3本目（とり遅れ。いちばん 奥の 低い 所）。 */
export const KY_SAN = `@narr
…………{w=300}
ずしり。
/
グソっ君の 腕くらい、{w=300}
太い。
@npc_kanenari
……これ、{w=300}
きゅうり？
ほんまに？
@npc_hoshi_sawako
3日 ぶんよ。`;

/** グソっ君が いない とき（3本目）。 */
export const KY_SAN_SOLO = `@narr
…………{w=300}
ずしり。
/
腕くらい、{w=300}
太い。
@npc_hoshi_sawako
3日 ぶんよ。`;

/** 切った（1本ごと）。 */
export const kyKiru = (n: number): string => `@narr
はさみで、{w=300}
つるを 切った。（${n}/3）`;

export const KY_SOROTTA = `@sys
きゅうりを 3本 持った。
/
無人販売所の 札と、
くらべて みよう。`;

/** 大写しを とちゅうで 閉じた。 */
export const KY_STOP = `@npc_hoshi_sawako
ゆっくりで いいのよ。`;

// ================================================================ 3 札と くらべる ・ 4 いちばん おいしい とき

export const KY_FUDA = `@narr
手描きの 札の、{w=300}
きゅうりの 絵。
/
細くて、まっすぐで、{w=300}
つやつや。
@npc_kanenari
……札と、{w=300}
別の 野菜や。
/
こっちは、{w=300}
絵の ほうが
うまそうや。
@npc_hoshi_sawako
失礼しちゃうわよねえ。{w=300}
……でも、そうね。`;

/** グソっ君が いない とき。 */
export const KY_FUDA_SOLO = `@narr
手描きの 札の、{w=300}
きゅうりの 絵。
/
細くて、まっすぐで、{w=300}
つやつや。
/
手の 中の 3本とは、{w=300}
ずいぶん ちがう。`;

export const KY_OISHII = `@npc_hoshi_sawako
絵の きゅうりは、{w=300}
とり遅れないのよ。
/
……ずっと、{w=300}
いちばん おいしい
ときの まま。
@npc_kanenari
ほな、{w=300}
本物は？
@npc_hoshi_sawako
本物は、{w=300}
大きく なるの。
/
大きいのも、{w=300}
ちゃんと 食べるのよ。
……絵は、食べられない。
@npc_kanenari
……せやな。{w=300}
絵は、かじられへん。`;

/** グソっ君が いない とき。 */
export const KY_OISHII_SOLO = `@npc_hoshi_sawako
絵の きゅうりは、{w=300}
とり遅れないのよ。
/
……ずっと、{w=300}
いちばん おいしい
ときの まま。
/
本物は、{w=300}
大きく なるの。
大きいのも、ちゃんと 食べるのよ。`;

/** かくし：店番（flag_tenban_done）が すんでいる（1回）。 */
export const KY_TENBAN = `@npc_hoshi_sawako
看板の きゅうりも、{w=300}
描き直そうかしら。
……大きいのを。`;

/** 大きいのを 台へ（ソワカ）。 */
export const KY_DAI = `@narr
ソワカが、{w=300}
大きい 1本を 台に のせて、
札を 1枚 足した。`;

export const KY_REWARD = `@sys
朱肉が 2 ふえた。
/
『きゅうり（とれたて）』を
2つ もらった。
/
みました帳②の すみに、
『絵の きゅうりは、
とり遅れない』の ページ。`;

/** すんだ あと、無人販売所の 台（今の 文の あと）。 */
export const KY_DAI_AFTER = `@narr
きゅうりが、{w=300}
1本だけ、とても 大きい。
『ご自由に』の 札つき。`;

/** すんだ あと、ソワカに もう一度（1回）。 */
export const KY_AFTER = `@npc_hoshi_sawako
朝が 来たら、{w=300}
また 朝どりよ。`;

/** かくし：3本 持って、集会所の ぴょん夫人（お茶の あと。1回）。 */
export const KY_YOSHIE = `@npc_hoshi_yoshie
大きいのは、{w=300}
皮を むいて、種を とって、
炒めるか 煮るか。
/
……ええ 味に {w=300}
なるよ。`;

// ================================================================ 回復の 物・大写し・帳面

export const KY_ITEM_DESC: [string, string] = ['トゲが、痛い。とれたての しるし。', 'HPを 45 回復。'];
export const KY_SANBON_DESC: [string, string] = ['ソワカの 棚の 3本。', '札の 絵と くらべる。'];

export const KY_UI = {
  place: '葉の かげ',
  keys: ['←→↑↓ 灯り', 'けってい 切る'],
  count: (n: number) => `${n}/3`,
};

/** みました帳②の すみの 1ページ（ui/menu/book_kyuri.ts）。 */
export const KY_BOOK = {
  title: '絵の きゅうりは、とり遅れない',
  titleLines: ['絵の きゅうりは、', 'とり遅れない'],
  fuda: '札',
  quote: ['絵の きゅうりは、', 'とり遅れないのよ'],
};

export const KY_TEXTS: Record<string, unknown> = {
  KY_H0, KY_START, KY_WAIT, KY_FUDA_GO, KY_TANA, KY_TANA_DARK, KY_TANA_DONE, KY_KAGE_START, KY_HA, KY_ICHI_A, KY_ICHI_B,
  KY_ICHI_SOLO, KY_NIDO, KY_NI, KY_SAN, KY_SAN_SOLO, KY_SOROTTA, KY_STOP, KY_FUDA, KY_FUDA_SOLO, KY_OISHII, KY_OISHII_SOLO,
  KY_TENBAN, KY_DAI, KY_REWARD, KY_DAI_AFTER, KY_AFTER, KY_YOSHIE, kiru: [1, 2, 3].map(kyKiru),
};
