// 目で、いちばん 長く（げむきか 10-27 の 案3、2026-10-27 依頼主の 採用。03_ch3_index）。第3章の クリア前、段階3（旧水族館の 中、12:00）。
// S16 の 回廊の あと（flag_ch3_kairo_done）から S20 で ホールに 入るまで（flag_ch3_tsugao1 が 立ったら 戸は 閉まる）。
//
//   回廊の 南の 壁の 木の 戸『ふれあいの 磯』(33,6)：S16 の 間は 札だけ。回廊の あとで 開く → 戸の 暗転で ふれあいの 磯。
//   1 水の ない 磯（入って すぐ）  2 ふれあいの やくそく（貼り紙）  3 生き物 役（水槽）
//   4 ふれあい：手（手洗い場）・目と 指（大写し「ふれあい」）  5 いちばん 下の 字（貼り紙を もう1回）  6 ごほうび
//
// 会議・指示に 合わせて 案から 直した 所：
//   ・戸は (33,6)（前は (33,5)）。案の (32,5) は 回廊の 4つめの 展示台の 固い 所（地図の o）だったので、1つ 東へ。
//     S25 に みんなが 通る 道（(1,5)→(20,4)→(20,5)）からは 13 マス 離れて いる。S16 の 終わりの きっかけ（x34〜38）にも かからない。
//   ・やくそくは「この 館の」と 貼り紙の 題に 入れた（タッチプールの 決まりは 館で ちがう。手を 水で すすぐ・水から 出さない は
//     海外の 水族館の 案内で 確かめた。指は「2本」の 館も「小指 1本」の 館も ある。日本の 水族館の 言い方の 出典は 見つけていない）。
//   ・指で さわった 手ざわりは「やわらかい」を「かたい」に した（オオグソクムシの 背中は 固い からだ）。
//   ・「目」と「指」は 1つの 大写しに まとめた（←→で 触角・足・しっぽ・指。手洗いは 部屋の 手洗い場で、歩いて する）。
//   ・グソっ君が 水槽に いる 間に 戸から 出ると、回廊で 追いついて くる（「生き物 役、いったん 休憩や。」）。
// 決まり：地の文・名札に「さん」なし。天丼の 口ぐせは 使わない。ポコシャの 名前は 出さない（S19 の あとの 1行も「字が 同じ」だけ）。
// 「前にも ここに いた 気が する」とは 言わない（「落ちつく 高さや」まで）。

// ================================================================ 回廊の 戸

/** S16 の 間（ヒロスケに 会う 前）。 */
export const FR_TO_FUDA = `@narr
札。{w=300}
『ふれあいの 磯 →』。`;

/** 回廊の あと、はじめて：開く。 */
export const FR_TO_OPEN = `@narr
色の あせた 札。{w=300}
『ふれあいの 磯 →』。
/
戸は、{w=300}
すっと 開いた。`;

/** S20 から 先・クリア後。 */
export const FR_TO_SHIZUKA = `@narr
札『ふれあいの 磯』。{w=300}
戸の 向こうは、
しずかだ。`;

// ================================================================ 1 水の ない 磯

export const FR_IN = `@narr
低い 水槽。{w=300}
水は なく、
岩だけ。
/
岩に、{w=300}
水の あった 高さの
白い 線。
@npc_kanenari
……ここ、{w=300}
生き物に さわれる
水槽 やったんか。`;

// ================================================================ 2 ふれあいの やくそく

export const FR_HARIGAMI = `@narr
『この 館の {w=300}
ふれあいの やくそく』
小さな 字が 並ぶ。
/
『1 さわる 前に、{w=300}
手を 水だけで 洗う。
石けんは つかわない』
/
『2 水の 中で、{w=300}
2本の 指で、
やさしく』
/
『3 水から {w=300}
出さない』
/
いちばん 下に、{w=300}
もっと 小さな 字。
……かすれて、読めない。`;

/** 2回目から（いちばん 下の 字を 読む 前）。 */
export const FR_HARIGAMI_AGAIN = `@narr
『1 手を 水だけで』{w=300}
『2 2本の 指で』
『3 水から 出さない』
/
いちばん 下の 字は、{w=300}
かすれて、読めない。`;

/** 読んだ あと。 */
export const FR_HARIGAMI_SUMI = `@narr
『いちばん 長く {w=300}
さわって いいのは、
目です。』`;

/** S19 の あと（flag_ch3_esa_done）、はじめて／もう1回 読む とき 1回。 */
export const FR_ESA_KN = `@npc_kanenari
……この 字、{w=300}
えさの 部屋の 札の
字と、同じや。`;

// ================================================================ 3 生き物 役

/** 貼り紙を 読む 前の 水槽。 */
export const FR_SUISOU_MAE = `@narr
水の ない 水槽。{w=300}
ごつごつした 岩と、
白い 線。
@npc_kanenari
壁の 貼り紙、{w=300}
何か 書いとるで。`;

export const FR_YAKU_A = `@npc_kanenari
生き物、{w=300}
おらんやん。
/
……ほな、{w=300}
わいが、生き物 役
したる。`;

/** 水槽に 入った あと。 */
export const FR_YAKU_B = `@narr
グソっ君が、{w=300}
水槽の 岩の 上に
まるく なった。
@npc_kanenari
……なんか、{w=300}
落ちつく 高さや。`;

/** いったん 出た あとで、もう1回。 */
export const FR_YAKU_AGAIN = `@npc_kanenari
もう 1回、{w=300}
生き物 役 したる。
@narr
グソっ君が、{w=300}
岩の 上に
まるく なった。`;

/** 水槽に いる 間に 戸から 出た（回廊で 追いついて）。 */
export const FR_DERU = `@npc_kanenari
ちょ、待ってえな。{w=300}
……生き物 役、
いったん 休憩や。`;

/** グソっ君が いない とき（隊列に いない）の 水槽。 */
export const FR_SUISOU_HITORI = `@narr
水の ない 水槽。{w=300}
岩の 上に、
だれも いない。`;

// ================================================================ 4 ふれあい：手

export const FR_JAGUCHI = `@narr
手洗い場。{w=300}
古い 蛇口と、
石けん置き。`;

export const FR_JAGUCHI_ASK = `@narr
手洗い場。{w=300}
古い 蛇口と、
石けん置き。
? 水で 洗う | 石けんで 洗う`;

export const FR_MIZU = `@narr
じゃー。{w=300}
……つめたい。`;

export const FR_SEKKEN = `@npc_kanenari
それ、{w=300}
あかんて 書いとる！`;

/** 洗った あと。 */
export const FR_JAGUCHI_SUMI = `@narr
蛇口を しめた。{w=300}
手は、もう 洗った。`;

/** 洗わずに 水槽へ。 */
export const FR_TE_MADA = `@npc_kanenari
しゅん、{w=300}
手、洗たか？
/
……顔に {w=300}
書いとるで。`;

// ================================================================ 4 ふれあい：目と 指（大写し）

export const FR_FUREAI_A = `@npc_kanenari
ほな、{w=300}
やくそくの とおりに
たのむで。`;

/** よく 見る（触角・足・しっぽの 扇）。 */
export const FR_ME = [
  `@narr
長い ひげが 2本、{w=300}
ゆっくり、こっちを
さぐっている。`,
  `@narr
足が、{w=300}
7本ずつ、2列。
@npc_kanenari
数えたやろ。{w=300}
14本や。`,
  `@narr
おしりに、{w=300}
小さな 扇の 形。
@npc_kanenari
そこ、{w=300}
見る 人 少ないねん。`,
];

export const FR_ME_AGAIN = `@narr
もう 1回、{w=300}
よく 見た。`;

export const FR_YUBI_ASK = `@narr
2本の 指を、{w=300}
そっと……
? 背中に さわる | 持ち上げる`;

export const FR_YUBI = `@narr
つるっと して、{w=300}
思ったより、
かたい。
@npc_kanenari
……くすぐったい。{w=300}
わい、こういうの
はじめてや。`;

/** 持ち上げる（1回目）。 */
export const FR_MOCHI = `@npc_kanenari
水から 出したら {w=300}
あかんて！
/
……あ。{w=300}
わい、ずっと 出とるわ。
@narr
そっと、{w=300}
岩の 上に もどした。`;

/** 持ち上げる（2回目から）。 */
export const FR_MOCHI_AGAIN = `@npc_kanenari
あかんて。{w=300}
やくそく 3や。`;

/** 指の あと、まだ 見て いない 所が ある。 */
export const FR_MADA_MIRU = `@npc_kanenari
……もうちょい、{w=300}
見て いって ええで。`;

/** 3つ すんだ。 */
export const FR_FUREAI_END = `@npc_kanenari
……ふう。{w=300}
生き物 役、
けっこう 大変やな。
@narr
小窓の 光が、{w=300}
貼り紙の すみに
当たっている。`;

// ================================================================ 5 いちばん 下の 字

export const FR_YOMU_A = `@narr
光が 当たって、{w=300}
いちばん 下の 字が
読めた。
/
『いちばん 長く {w=300}
さわって いいのは、
目です。』`;

/** かくし：下の 紙の 字（券売所の つづりを こすった、flag_sh_tsuzuri）。 */
export const FR_YOMU_SHITA = `@npc_kanenari
えんぴつで {w=300}
こすらんでも、
光で 読めたな。`;

export const FR_YOMU_B = `@npc_kanenari
……目で、{w=300}
さわるんか。
/
ほな、{w=300}
さっきから いちばん
さわられとったんは、
/
……見られるのも、{w=300}
悪ない もんやな。
@narr
グソっ君が、{w=300}
水槽から
もそもそ 出てきた。`;

/** かくし：目の 3か所を ぜんぶ 見てから 指へ（やくそくの 順の まま）。 */
export const FR_HANAMARU = `@narr
貼り紙の すみに、{w=300}
小さな はなまるの
あとが ある。`;

export const FR_REWARD = `@sys
朱肉が 2 ふえた。
/
みました帳③の すみに、
『目で、いちばん 長く』の
ページ。`;

// ================================================================ 済んだ あと・部屋の 物

export const FR_KUBOMI = `@narr
岩の 上に、{w=300}
グソっ君の 形の
小さな くぼみ。`;

export const FR_KUBOMI_KN = `@npc_kanenari
わいの 席や。`;

export const FR_OKE = `@narr
手おけ。{w=300}
ふちが 欠けている。
/
……いっぱい、{w=300}
使われた あと。`;

export const FR_FUMIDAI = `@narr
子ども用の 踏み台。{w=300}
上の 板だけ、
つるつるに すりへっている。`;

// ================================================================ 大写し・帳面

export const FR_HOWTO = { id: 'fureai', line: '{←→}で えらび、{Z}で 見る', pic: 'lr' as const };

export const FR_UI = {
  title: 'ふれあい',
  parts: ['触角', '足', 'しっぽ', '指'],
  keys: '←→ えらぶ  けってい',
  seen: '見た',
  touched: 'さわった',
  me: 'よく 見る',
  yubi: '2本の 指',
};

export const FR_BOOK = {
  title: '目で、いちばん 長く',
  titleLines: ['目で、', 'いちばん 長く'],
  yaku: (n: number) => `やくそく ${n}/3`,
  me: (n: number) => `よく 見た 所 ${n}/3`,
  mono: (n: number) => `部屋の 物 ${n}/3`,
  quote: ['いちばん 長く', 'さわって いいのは', '目です。'],
};

export const FR_TEXTS: Record<string, unknown> = {
  FR_TO_FUDA, FR_TO_OPEN, FR_TO_SHIZUKA, FR_IN, FR_HARIGAMI, FR_HARIGAMI_AGAIN, FR_HARIGAMI_SUMI, FR_ESA_KN, FR_SUISOU_MAE,
  FR_YAKU_A, FR_YAKU_B, FR_YAKU_AGAIN, FR_DERU, FR_SUISOU_HITORI, FR_JAGUCHI, FR_JAGUCHI_ASK, FR_MIZU, FR_SEKKEN,
  FR_JAGUCHI_SUMI, FR_TE_MADA, FR_FUREAI_A, FR_ME, FR_ME_AGAIN, FR_YUBI_ASK, FR_YUBI, FR_MOCHI, FR_MOCHI_AGAIN,
  FR_MADA_MIRU, FR_FUREAI_END, FR_YOMU_A, FR_YOMU_SHITA, FR_YOMU_B, FR_HANAMARU, FR_REWARD, FR_KUBOMI, FR_KUBOMI_KN,
  FR_OKE, FR_FUMIDAI,
};
