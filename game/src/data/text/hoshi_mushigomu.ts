// 上へ 降る 雪（げむきか 10/15 の 案2、2026-10-15 依頼主の 採用。02_ch2_index #101）。
// ポコシャの 自転車の 後ろの タイヤが、少しずつ ぺしゃんこ。まつ先生の パンク修理の 箱を 借りて、分校の 前で
// 空気を 入れ、たらいの 水で 泡を さがす。泡は 穴からではなく、空気を 入れる 口（バルブ）から 上がって くる
// ——犯人は「虫ゴム」。グソっ君「……下から 上へ 降っとる。マリンスノーの、反対や。」
//
//   1 ぺしゃんこ（自転車を 調べる。段階0〜1、配達の 外）→ ポコシャ・ヒロスケ（flag_mg_start）。
//   2 まつ先生の 箱（集会所。その 人の 物語が 先）→ 大事なもの『パンク修理の 箱』（flag_mg_box）。
//   3 自転車を 分校の 前へ 押す（ポコシャも いっしょ。flag_mg_school）。
//   4 空気入れ（昇降口の 横）：押すたびに ふくらむ。入れすぎると ポコシャ「かたすぎ」（flag_mg_pump）。
//   5 たらい（大写し。段階1〜。段階0 は 暗くて 泡が 見えない）：回して 水に 入れる → 口から 泡（flag_mg_found）。
//   6 虫ゴム：箱に 予備が ない → 旧商店の レジの 引き出し『虫ゴム ご自由に』（flag_mg_new）→ たらいで
//     つけかえ → 空気 → たらい（泡なし）→ 名場面「穴が ない ことが わかりました」（flag_mg_done）。
//   7 そのあと：ポコシャが 転回場を 1周、朱肉 +2、大事なもの『古い 虫ゴム』、みました帳②の すみ『上へ 降る 雪』。
//     自転車置き場の 2台（もと・アスカ）は 同じ 手順で 直せる（○/2）。まつ先生に 1台ずつ 話す。
//
// 決まり：第2章の 台詞に 時刻の 数字・「12人」「1日2本」「おまけの 1つ」「具足様」「まだ」「平和」「17」
// 「3人」を 入れない。第3章の 中身（海ぞいの 町・旧水族館）に ふれない。地の文・名札の 名前に「さん」なし。
// グソっ君は 関西弁・「わい」・敬語なし。1ページ 3行 × 336px（textcheck2 と mgText）。
// 事実：英式バルブの 中の 虫ゴムが 古く なって ひびが 入ると、空気が もれる（依頼主 確認ずみ）。

// ================================================================ 1 ぺしゃんこ

export const MG_PESHANKO = `@narr
後ろの タイヤが、{w=300}
指で 押すと、
ぐにゃっと へこむ。
@npc_pokosha
……あ。{w=300}
気づいて、ました。
/
……帰りの 下り坂、{w=300}
このままでは、
こわい です。
@npc_hirosuke
ども！{w=300}
少年、見てやって
くれるか！ わはは！
/
こいつ、{w=300}
自分からは 言わんのよ！
@npc_pokosha
……す、すみません。
@npc_kanenari
パンクの 道具、{w=300}
だれか 持っとらんかな。`;

/** 1 のあと、自転車をもう一度（まつ先生に会う前）。 */
export const MG_PESHANKO_AGAIN = `@narr
後ろの タイヤが、
ぐにゃっと へこむ。{w=300}
……道具が いりそうだ。`;

/** 1 のあと、ポコシャに話す（まつ先生に会う前）。 */
export const MG_POKOSHA_WAIT = `@npc_pokosha
……すみません。{w=300}
自分の 自転車、なのに。`;

// ================================================================ 2 まつ先生の 箱

export const MG_FUMI_BOX = `@npc_hoshi_fumi
パンクですか。{w=300}
分校の 子の 自転車は、{w=300}
わたしが 直して いました。
/
箱を 貸しましょう。{w=300}
……やるのは、しゅんさん
ですよ。
/
先生は、{w=300}
見ているのが
仕事ですから。`;

export const MG_GET_BOX = `@sys
『パンク修理の 箱』を 借りた。`;

export const MG_FUMI_BOX_2 = `@npc_hoshi_fumi
自転車は、分校の 前へ。{w=300}
空気入れも、たらいも、
あそこに あります。`;

/** 箱のあと、自転車を押していく前（まつ先生にもう一度）。 */
export const MG_FUMI_GO = `@npc_hoshi_fumi
自転車を、分校の 前へ。{w=300}
……先に 行って います。`;

// ================================================================ 3 分校の 前へ

export const MG_PUSH = `@narr
自転車を 押して、
分校の 前へ。{w=300}
ポコシャも、ついて くる。`;

/** 分校の前の自転車（空気を入れる前）。 */
export const MG_BIKE_SCHOOL = `@narr
ポコシャの 自転車。{w=300}
後ろの タイヤが、
ぺしゃんこだ。`;

/** 分校の前のポコシャ（とちゅう）。 */
export const MG_POKOSHA_SCHOOL = `@npc_pokosha
……ぴーちゃんも、{w=300}
見て います。`;

/** 分校の前のまつ先生（とちゅう）。 */
export const MG_FUMI_WATCH = `@npc_hoshi_fumi
先生は、見て います。{w=300}
……どうぞ。`;

// ================================================================ 4 空気を 入れる

export const MG_PUMP_RULE = `@npc_hoshi_fumi
けってい で、1回 押す。{w=300}
タイヤを 指で 押して、
かたさを 見ます。
/
「ちょうど」の 所で、
もどる を 押して、
やめましょう。`;

export const MG_PUMP_OVER = `@npc_pokosha
……あ、{w=300}
かたすぎ、です。`;

export const MG_PUMP_OVER_NUKU = `@narr
口を ゆるめて、{w=300}
空気を 少し ぬいた。`;

export const MG_PUMP_LOW = `@npc_hoshi_fumi
指で 押すと、{w=300}
へこみますね。{w=300}
……もう 少しです。`;

export const MG_PUMP_GOOD = `@narr
指で 押すと、{w=300}
ぐっと 押しかえして くる。`;

/** 空気のあと、少し歩くと、また少しへこむ（はじめの1回）。 */
export const MG_LEAK = `@narr
……少し たって、もう 一度
指で 押すと、{w=300}
また 少し へこんでいる。
@npc_kanenari
ゆっくり 逃げとる。{w=300}
……どこから やろ。`;

/** 第1章の屋上の『4人目』（握手会）を見た人だけ、MG_LEAK のあと。 */
export const MG_LEAK_FUUSEN = `@npc_kanenari
風船は われるけど、{w=300}
タイヤは、ゆっくり
逃げるんやな。`;

/** 空気を入れる前に、たらいを調べた。 */
export const MG_TARAI_FIRST = `@npc_hoshi_fumi
まず、空気を 入れて。{w=300}
どこから 逃げるかは、
それから です。`;

/** 段階0：泡は暗くて見えない。 */
export const MG_DARK = `@npc_hoshi_fumi
この 暗さでは、{w=300}
泡が 見えませんね。
/
村に 灯りが ついたら、
たらいで さがしましょう。`;

// ================================================================ 5 たらい

export const MG_TARAI_RULE = `@npc_hoshi_fumi
穴は、目では
見つかりません。{w=300}
水に 聞きましょう。
/
←→ で、タイヤを
少しずつ 回します。{w=300}
泡を、よく 見て。`;

/** 泡の出ない所を水に入れているあいだ（はじめの1回）。 */
export const MG_TARAI_NONE = `@npc_kanenari
……出えへんな。{w=300}
次、回してみよ。`;

export const MG_TARAI_AWA = `@npc_kanenari
……あ。{w=300}
泡が、下から 上へ
降っとる。
/
マリンスノーの、{w=300}
反対や。
/
……海の 底では、{w=300}
上から 降って きたんや。
@npc_hoshi_fumi
よく 覚えて いましたね。{w=300}
……そこが、犯人です。`;

/** グソっ君がいないとき（泡を見つけた）。 */
export const MG_TARAI_AWA_SOLO = `@narr
空気を 入れる 口から、
小さな 泡が 1つずつ、
まっすぐ 上がって いく。
@npc_hoshi_fumi
……そこが、犯人です。`;

/** かくし：つけかえる前に、タイヤを全部の向きで水に入れた（1周）。 */
export const MG_TARAI_ISSHUU = `@npc_hoshi_fumi
全部 たしかめましたね。{w=300}
……いい 理科の
ノートが 書けます。`;

export const MG_MUSHI = `@npc_hoshi_fumi
口の 中に、{w=300}
細い ゴムの 管。{w=300}
虫ゴムと いいます。
/
古く なると、{w=300}
ひびが 入って、{w=300}
空気が もれるんです。
@npc_kanenari
虫？{w=300}
……わい、虫 ちゃうで。{w=300}
エビや カニの なかまや。
@npc_hoshi_fumi
ゴムの ほうも、{w=300}
虫では ありません。
/
……予備は、と。{w=300}
……使いきって、{w=300}
いましたね。`;

/** 虫ゴムが無いうちに、たらいをもう一度。 */
export const MG_NEED_NEW = `@npc_hoshi_fumi
新しい 虫ゴムが、
いりますね。{w=300}
……村に、売って いた 所は。`;

// ================================================================ 6 虫ゴム（旧商店）

/** 旧商店のレジの下の引き出し（虫ゴムをさがしているとき）。 */
export const MG_SHOTEN_GET = `@narr
レジの 下の 引き出しに、
小箱が 1つ。{w=300}
『虫ゴム ご自由に』。
/
小箱に、店の 人の 字。{w=300}
『村の 自転車の ために』。`;

export const MG_SHOTEN_GOT = `@sys
虫ゴムを 1本 もらった。`;

/** 新しい虫ゴムのあと、引き出しをもう一度。 */
export const MG_SHOTEN_AFTER = `@narr
『虫ゴム ご自由に』の 小箱。{w=300}
『村の 自転車の ために』。`;

/** つけかえ（たらいの大写しの中）。 */
export const MG_KAE_RULE = `@npc_hoshi_fumi
古い 虫ゴムを 抜いて、{w=300}
新しいのを かぶせて、{w=300}
口を しめます。
/
けってい を 3回。{w=300}
……ゆっくりで いいですよ。`;

export const MG_KAE_DONE = `@narr
新しい 虫ゴム。{w=300}
口を、きゅっと しめた。`;

export const MG_PUMP_AGAIN = `@npc_hoshi_fumi
空気を 入れて、{w=300}
もう 一度、水に
聞きましょう。`;

/** 泡が出ない（つけかえのあと、1周）。 */
export const MG_TARAI_CLEAR = `@narr
タイヤを ぐるりと 1周、
水に くぐらせた。{w=300}
……泡は、1つも 出ない。`;

// ================================================================ 6 穴が ない ことが わかった（名場面）

export const MG_DONE = `@npc_hoshi_fumi
穴を さがして、{w=300}
穴が ない ことが
わかりました。
/
……それも、{w=300}
立派な 発見ですよ。
@npc_pokosha
……あの、{w=300}
乗って みても、
いい ですか。`;

export const MG_RIDE = `@narr
ポコシャが、{w=300}
転回場を 1周した。
/
前かごの わらの 上で、{w=300}
ぴーちゃんが 胸を はる。
@npc_piichan
ココッ。
@npc_pokosha
……まっすぐ、です。{w=300}
タイヤが、{w=300}
ちゃんと 丸い です。
@npc_hirosuke
わはは！{w=300}
よかったな！`;

/** かくし：空気を入れすぎてポコシャに3回止められた（転回場で、ヒロスケ）。 */
export const MG_RIDE_FUUSEN = `@npc_hirosuke
少年、{w=300}
タイヤは 風船じゃ
ないぞ！ わはは！`;

export const MG_RIDE_TSUGAO = `@npc_tsugao
……おう。{w=300}
えらいな……
@narr
……起きない。
@npc_kanenari
寝とっても、{w=300}
ほめるんや。`;

export const MG_REWARD = `@sys
『古い 虫ゴム』を もらった。
朱肉が 2 ふえた。
/
みました帳②の すみに、
『上へ 降る 雪』の ページ。`;

/** 終わったあとのまつ先生（集会所、1回）。 */
export const MG_FUMI_AFTER = `@npc_hoshi_fumi
分校の 前に、
自転車置き場が あります。{w=300}
……2台、残って います。`;

/** 終わったあとのポコシャ（1回）。 */
export const MG_POKOSHA_AFTER = `@npc_pokosha
……下り坂、{w=300}
こわく ない です。{w=300}
……ちょっとだけ。`;

/** 終わったあとの自転車（今の文の差しかえ）。 */
export const MG_BIKE_AFTER = `@narr
荷台つきの 黒い 自転車。{w=300}
後ろの タイヤが、{w=300}
ぱんぱんに 丸い。`;

// ================================================================ 7 自転車置き場の 2台

/** 置き場（終わる前）。 */
export const MG_OKI_BEFORE = `@narr
自転車置き場。{w=300}
古い 子ども用の 自転車が
2台。タイヤは ぺしゃんこ。`;

/** 段階2：放送が名前を呼んでいる（9.9 と同じ書き方）。 */
export const MG_OKI_H2 = `@narr
泥よけに、名前の シール。{w=300}
『もと』『アスカ』。
/
放送が『もとくん』と
呼んでいる。`;

/** 置き場（終わったあと）：どちらを直すか。 */
export const MG_OKI_ASK = `@narr
泥よけに、名前の シール。{w=300}
『もと』『アスカ』。
? 『もと』を 直す | 『アスカ』を 直す | やめておく`;

export const MG_OKI_ASK_MOTO = `@narr
泥よけに、名前の シール。{w=300}
『もと』『アスカ』。
? 『もと』を 直す | やめておく`;

export const MG_OKI_ASK_ASUKA = `@narr
泥よけに、名前の シール。{w=300}
『もと』『アスカ』。
? 『アスカ』を 直す | やめておく`;

export const MG_OKI_DONE = `@narr
泥よけに、名前の シール。{w=300}
『もと』『アスカ』。
/
2台とも、タイヤが 丸い。`;

export const MG_KID_FIXED = `@narr
虫ゴムを 替えて、{w=300}
空気を 入れた。{w=300}
……タイヤが、丸く なった。`;

/** まつ先生（集会所。直したあと、1台ずつ1回）。 */
export const MG_FUMI_MOTO = `@npc_hoshi_fumi
自転車置き場の、{w=300}
……もとくんの です。
/
坂の 下で、いつも
ころんで いました。`;

export const MG_FUMI_ASUKA = `@npc_hoshi_fumi
アスカちゃんは、{w=300}
ブレーキを かけずに
下りる 子でした。`;

export const MG_FUMI_KIDS = `@npc_hoshi_fumi
……もう、大人ですけどね。{w=300}
子どもを 乗せて、{w=300}
来るかも しれません。`;

// ================================================================ 大写しの 字（札・ボタン）

export const MG_UI = {
  placeTarai: 'たらい',
  placePump: '空気入れ',
  katasa: 'かたさ',
  low: 'やわらかい',
  good: 'ちょうど',
  over: 'かたすぎ',
  keysPump: ['けってい 押す', 'もどる やめる'],
  keysTarai: ['←→ 回す', 'もどる やめる'],
  keysKae: ['けってい', 'すすめる'],
  kae: ['ぬく', 'かぶせる', 'しめる'],
  valve: '口',
  awa: 'ぷく',
};

/** みました帳②の すみ『上へ 降る 雪』。 */
export const MG_BOOK = {
  title: '上へ 降る 雪',
  furui: '古い 虫ゴム',
  atarashii: '新しい 虫ゴム',
  hibi: 'ひびが 3つ',
  kids: '自転車置き場',
  hana: '1周',
};

export const MG_ITEM_HAKO_DESC: [string, string] = ['分校の 備品。', 'ゴムのりは、ふたが かたい。'];
export const MG_ITEM_FURUI_DESC: [string, string] = ['ひびが 3つ。', 'よく がんばった。'];

/** 文の検査（mgText・debug の walk）に出す物。 */
export const MG_TEXTS: Record<string, unknown> = {
  MG_PESHANKO, MG_PESHANKO_AGAIN, MG_POKOSHA_WAIT, MG_FUMI_BOX, MG_GET_BOX, MG_FUMI_BOX_2, MG_FUMI_GO, MG_PUSH,
  MG_BIKE_SCHOOL, MG_POKOSHA_SCHOOL, MG_FUMI_WATCH, MG_PUMP_RULE, MG_PUMP_OVER, MG_PUMP_OVER_NUKU, MG_PUMP_LOW,
  MG_PUMP_GOOD, MG_TARAI_FIRST, MG_LEAK, MG_LEAK_FUUSEN, MG_DARK, MG_TARAI_RULE, MG_TARAI_NONE, MG_TARAI_AWA, MG_TARAI_AWA_SOLO,
  MG_TARAI_ISSHUU, MG_MUSHI, MG_NEED_NEW, MG_SHOTEN_GET, MG_SHOTEN_GOT, MG_SHOTEN_AFTER, MG_KAE_RULE,
  MG_KAE_DONE, MG_PUMP_AGAIN, MG_TARAI_CLEAR, MG_DONE, MG_RIDE, MG_RIDE_FUUSEN, MG_RIDE_TSUGAO, MG_REWARD,
  MG_FUMI_AFTER, MG_POKOSHA_AFTER, MG_BIKE_AFTER, MG_OKI_BEFORE, MG_OKI_H2, MG_OKI_ASK, MG_OKI_ASK_MOTO,
  MG_OKI_ASK_ASUKA, MG_OKI_DONE, MG_KID_FIXED, MG_FUMI_MOTO, MG_FUMI_ASUKA, MG_FUMI_KIDS,
};
