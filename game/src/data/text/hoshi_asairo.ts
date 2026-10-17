// 朝の 前の 色（げむきか 10/17 の 案5、2026-10-17 依頼主の 採用。02_ch2_index #104）。
// ソワカの 描きかけの 絵は 東の 空の はしだけ 白い、札の 下書きは『とまと』だけ 何回も 書きなおし（どちらも 今の 文）。
// 七夕の 朝に 葉っぱの 露で 墨を すると 字が うまく なる、という 言い伝えを ためす。トマトの 灯りで 露を さがす：
// サトイモの 葉の 上の 玉、稲の 葉の 先の 玉（トマじい「葉の 先が、みんな 光っとる」）、火の見の
// 足もとの クモの 巣。3つの 露で すった うすい 墨で、ソワカは 絵の 東の 空に ひとはけ。
//
//   1 赤く ならない 札（ソワカの 家の 絵か 札の 下書きを 2回 調べてから、ソワカに 話す）→ flag_as_start
//   2 露の 墨（同じ 話の 続き）→ 大事なもの『ソワカの 絵皿』
//   3 露あつめ（大写し「葉の 上の 玉」。サトイモ・稲・クモの 巣。どの 順でも）→ flag_as_tsuyu_<k>
//   4 朝の 前の 色・5 青い とまと（ソワカに 話す → 家の イーゼルの 前）・6 ごほうび → flag_as_done
//   かくし：3号ハウスの トマトの 葉の 先の 玉（flag_as_tsuyu_tomato）→ 4 の あとに 1つ
//
// 決まり：第2章の 台詞に 時刻の 数字・「まだ」・第3章の 中身・「いただきます」を 入れない（今の 地の文の
// 「まだ 白い」は 今の 文の まま）。地の文・名札の 名前に「さん」なし（グソっ君の「クモさん」は 呼び方）。
// 1ページ 3行 × 336px（textcheck2 と asText）。表示名は hoshi_npcs.ts（ソワカ・トマじい）。
// 事実：サトイモの 葉は 水を はじく（露が 玉に なる）。
// トマトの 葉の ふちにも 出る。七夕の 朝に サトイモの 葉の 露で 墨を する 言い伝え（地方で 言い方が ちがう）。

// ================================================================ 1 赤く ならない 札

export const AS_SUMI_A = `@npc_hoshi_sawako
『とまと』の 札ね。{w=300}
何回 書いても、
赤く ならないのよ。
/
墨だから。{w=300}
……あたりまえ よね。
@npc_kanenari
そら そうや。
@npc_hoshi_sawako
それに、あの 絵。{w=300}
朝の 色を 待ってるの。`;

/** 第2章の 夜だけ（クリア後の 夜は 朝が 来るので 抜く）。AS_SUMI_A の あと。 */
export const AS_SUMI_KONAI = `@npc_hoshi_sawako
でも、朝が 来ない。`;

export const AS_SUMI_A2 = `@npc_hoshi_sawako
……朝の 前の 色なら、{w=300}
描けるかしら。`;

// ================================================================ 2 露の 墨

export const AS_SUMI_B = `@npc_hoshi_sawako
七夕の 朝に、{w=300}
葉っぱの 露で 墨を すると、
字が うまく なるって。
/
七夕は、すぎたけど。{w=300}
露は、毎朝 あるわ。
/
露で すった 墨は、{w=300}
うすくて、やさしいの。`;

export const AS_GET_EZARA = `@sys
『ソワカの 絵皿』を 受けとった！`;

export const AS_EZARA_KN = `@npc_kanenari
絵皿、{w=300}
わいが はさんで 持つわ。
はさむのは、得意や。`;

export const AS_SUMI_HINT = `@npc_hoshi_sawako
うちの 裏の サトイモ。{w=300}
田んぼの 稲。
火の見の クモの 巣。
/
トマトの 灯りで 照らすと、
露が 光って 見えるわ。`;

/** 露を あつめて いる 間の ソワカ。 */
export const AS_SAWAKO_WAIT = `@npc_hoshi_sawako
サトイモ、稲、{w=300}
クモの 巣。
……絵皿は、急がないわ。`;

// ================================================================ 3 露あつめ

/** 灯りの ない 段階（h0）：露は 見えない。 */
export const AS_DARK = `@narr
暗くて、{w=300}
ただの 葉っぱに 見える。`;

export const AS_SATO_PLAIN = `@narr
サトイモの 大きな 葉が、
3株。{w=300}
ソワカの 家の 裏の 畑。`;

export const AS_SATO_A = `@narr
大きな 葉の 上に、{w=300}
水の 玉が、ころころ。
/
葉が、水を はじいている。
@npc_kanenari
ころころ やな！{w=300}
葉っぱ、ぬれへんのか。`;

export const AS_INE_PLAIN = `@narr
稲の 葉の 先が、
灯りで ちらちら 光る。`;

export const AS_INE_A = `@narr
稲の 葉の 先っぽに、{w=300}
1つずつ、水の 玉。`;

/** トマじいが そばに いる とき（AS_INE_A の あと）。 */
export const AS_INE_TOME = `@npc_hoshi_tome
朝の 田んぼは、{w=300}
葉の 先が、みんな
光っとる。
@npc_kanenari
稲の 汗か。
@npc_hoshi_tome
……汗は、{w=300}
刈る ほうが かく。`;

/** トマじいが いない とき。 */
export const AS_INE_SOLO = `@narr
葉の 先から、{w=300}
玉が にじみ出て くるように
見える。`;

export const AS_KUMO_PLAIN = `@narr
火の見やぐらの 足もとに、
クモの 巣。`;

export const AS_KUMO_A = `@narr
クモの 巣に、露が
ずらりと 並んでいる。{w=300}
……首かざり みたいだ。
@npc_kanenari
クモさん、{w=300}
起こさんように な。`;

/** かくし：3号ハウスの トマトの 株（絵皿を 持っている 間）。 */
export const AS_TOMATO_A = `@narr
トマトの 葉の ふちにも、{w=300}
小さな 水の 玉が
並んでいる。`;

export const AS_RULE = `@sys
←→で そっと かたむけて、{w=300}
玉を 絵皿へ。
かたむけすぎると、こぼれる。`;

export const AS_RULE_KUMO = `@sys
けってい を おして、はなすと
糸を はじく。{w=300}
強すぎても、弱すぎても だめ。`;

export const AS_DROP_OK = `@narr
ぽとん。{w=300}
露が、絵皿に 落ちた。`;

export const AS_DROP_NG = `@narr
玉が 割れて、こぼれた。{w=300}
……少し 待つと、
また 光る。`;

export const AS_KUMO_WEAK = `@narr
糸が、ゆれた だけ。`;

export const AS_KUMO_STRONG = `@narr
露が、ぱらぱら
ぜんぶ 落ちた。{w=300}
……少し 待とう。`;

export const AS_STOP = `@narr
葉を、そっと もどした。`;

export const AS_GOT_ALREADY = `@narr
ここの 露は、
もう 絵皿に もらった。`;

export const AS_TOMATO_GOT = `@narr
トマトの 露も、
絵皿に もらった。`;

export const AS_ALL3 = `@narr
絵皿に、露が
少し たまった。`;

/** 露の 数（何個目か）。 */
export function asCount(n: number): string {
  return `@sys\n露 ${n}/3`;
}

// ================================================================ 4 朝の 前の 色（ソワカの 家）

export const AS_SCENE_GO = `@npc_hoshi_sawako
あら、たまったのね。{w=300}
うちで、すりましょう。`;

export const AS_SCENE_A = `@narr
ソワカは、露で 墨を
すった。{w=300}
いつもより、ずっと うすい。
@npc_hoshi_sawako
サトイモの 露は、すっきり。{w=300}
稲の 露は、少し
土の におい。
/
クモの 巣のは……
@npc_kanenari
……クモの 巣のは？
@npc_hoshi_sawako
……ちょっと、ねばる。`;

/** かくし：トマトの 露も 入れた。 */
export const AS_SCENE_TOMATO = `@npc_hoshi_sawako
トマトの 露で すったら、{w=300}
赤く なるかしら。
@narr
……ならなかった。
@npc_hoshi_sawako
でしょうね。`;

export const AS_SCENE_B = `@narr
ソワカは、絵の 東の
空の はしに、{w=300}
うすい 墨を、ひとはけ。
/
白かった 空の はしが、{w=300}
夜と 朝の あいだの
色に なった。
@npc_hoshi_sawako
朝の 色は、{w=300}
朝が 描いて くれるわ。
/
わたしは、{w=300}
その 前まで。`;

// ================================================================ 5 青い とまと

export const AS_SCENE_C = `@narr
残りの 墨で、{w=300}
『とまと』と 書いた。
@npc_hoshi_sawako
……青い トマトくらいには、{w=300}
なったわね。
@npc_kanenari
ほな、朝に なったら、{w=300}
赤なるで。
@npc_hoshi_sawako
……そういう ことに
しましょう。`;

// ================================================================ 6 ごほうび

export const AS_REWARD = `@narr
絵皿は、ソワカに 返した。
@sys
朱肉が 2 ふえた。
/
みました帳②の すみに、
『朝の 前の 色』の ページ。`;

// ================================================================ すんだ あと

/** 描きかけの 絵（今の 文の かわり）。 */
export const AS_EASEL_AFTER = `@narr
東の 空の はしに、{w=300}
うすい 墨の 色。
……夜と 朝の あいだ。`;

/** 無人販売所の 札（今の 文の あと）。 */
export const AS_MUJIN_AFTER = `@narr
うすい 墨の『とまと』。{w=300}
……青い トマトの 色。`;

/** すんだ あとの ソワカ（1回）。 */
export const AS_SAWAKO_AFTER = `@npc_hoshi_sawako
あの 絵ね、{w=300}
いちばん 東の はしが、
いちばん 気に入ってるの。`;

// ================================================================ 大写しの 字

export const AS_UI = {
  place: '葉の 上の 玉',
  names: { satoimo: 'サトイモ', ine: '稲', kumo: 'クモの 巣', tomato: 'トマト' } as Record<string, string>,
  keys: ['←→ かたむき', 'もどる やめる'],
  keysKumo: ['けってい はじく', 'もどる やめる'],
  tilt: 'かたむき',
  power: '強さ',
};

/** みました帳②の すみ『朝の 前の 色』。 */
export const AS_BOOK = {
  title: '朝の 前の 色',
  rows: [
    ['サトイモ', 'すっきり'],
    ['稲', '土の におい'],
    ['クモの 巣', 'ねばる'],
  ] as [string, string][],
  tomato: ['トマト', '赤く ならない'] as [string, string],
  count: '露',
  quote: 'ちょっと ねばる',
  hake: '墨の ひとはけ',
};

export const AS_ITEM_EZARA_DESC: [string, string] = ['ソワカから 借りた 白い 絵皿。', '露を 落として あつめる。'];

/** 文の検査（asText・debug の walk）に出す物。 */
export const AS_TEXTS: Record<string, unknown> = {
  AS_SUMI_A, AS_SUMI_KONAI, AS_SUMI_A2, AS_SUMI_B, AS_GET_EZARA, AS_EZARA_KN, AS_SUMI_HINT, AS_SAWAKO_WAIT,
  AS_DARK, AS_SATO_PLAIN, AS_SATO_A, AS_INE_PLAIN, AS_INE_A, AS_INE_TOME, AS_INE_SOLO, AS_KUMO_PLAIN, AS_KUMO_A,
  AS_TOMATO_A, AS_RULE, AS_RULE_KUMO, AS_DROP_OK, AS_DROP_NG, AS_KUMO_WEAK, AS_KUMO_STRONG, AS_STOP, AS_GOT_ALREADY,
  AS_TOMATO_GOT, AS_ALL3, count: [1, 2, 3].map(asCount), AS_SCENE_GO, AS_SCENE_A, AS_SCENE_TOMATO, AS_SCENE_B,
  AS_SCENE_C, AS_REWARD, AS_EASEL_AFTER, AS_MUJIN_AFTER, AS_SAWAKO_AFTER,
};
