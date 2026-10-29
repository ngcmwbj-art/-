// 雲の 下にも、郵便受け（第2章。げむきか 10/29 の 案5、2026-10-29 依頼主の 採用。02_ch2_index）。
// 転回場の さんかど（いつもの 会話を ひととおり 聞いた あと、もう 1回）→ 県道の 西の はし → 峠の カーブ
// （map_hoshi_touge）の 見晴らし（大写し「雲の 海」：手紙の 目印の 島を 1つずつ 選ぶ → 坂を 下る 順に 1つずつ 選ぶ）
// → 転回場の さんかど。
//
// 事実（調べた 範囲。$SP/research/unkai_kamemushi.md に 出典）：盆地や 谷の 雲海の 多くは 放射霧。晴れて 風の 弱い 夜に
// 地面が 冷え、冷えた 空気が 谷に たまって 霧に なる（コトバンク・ウェザーニュース ほか）。前の 日に 雨が 降ると さらに
// 出やすい（秩父の 雲海の 資料）。明け方〜早朝に 多く、日が 昇って 気温が 上がると 消える。8月末は 秋の さかりより
// 出にくい（本州の 名所の 多くは 9月中旬〜下旬から）→ さんかどに「めずらしく 出てるね」と 言わせ、「よく 出る」とは
// 言わない（2026-10-29 リードの 判断）。雲から 頭を 出す 目印は 高い 所に 立つ 物だけ（尾根の 鉄塔・丘の 神社の 大杉・
// 高台の お寺の 屋根。町なかの 低い 所の 火の見やぐらは 使わない：リードの 判断）。配る 前に 配る 道の 順に 郵便を 並べ
// かえる 作業を「道順組立」と いう（郵政博物館 研究紀要・文化遺産オンライン）。
//
// 決まり：第2章の 台詞に 時刻の 数字・「まだ」・「いただきます」・第3章の 中身を 入れない。天丼の「1日2本」は 言わせない。
// 宛名の 名前は 言わない（防災無線が 呼ぶ 名前と ヨビモドシの 決着に ふれない）。地の文・名札の 名前に「さん」なし。
// 1ページ 3行 × 336px。

// ================================================================ 1 かすれた 宛名（さんかどの〔kumo〕）

/** 段階1〜2：〔kumo〕（いつもの 会話を ひととおり 聞いた あと、もう 1回）。 */
export const KS_START = `@npc_hoshi_busdriver
その 明かりで、{w=300}
宛名を 読んで
くれるかい。
@narr
手紙が 3通。{w=300}
宛名の 横に、
えんぴつの 小さな 字。
@npc_hoshi_busdriver
下の 町の どこか、{w=300}
目印を 書いて
おいたんだ。
/
峠の カーブから、{w=300}
下の 町が 見える。
……今夜は、雲だけどね。
/
夕方、上がって くる とき、{w=300}
ひと雨 来てね。
そのあと 晴れて、風も ない。
/
そういう 夜明け前は、{w=300}
冷えた 空気が 谷に
たまって、霧に なる。
/
今夜は、{w=300}
めずらしく 出てるね。
/
雲から 出てる 目印で、{w=300}
道の 順に 並べて
おいて くれるかい。
/
県道の 西の はしから、{w=300}
カーブへ 行けるよ。
@npc_kanenari
まかしとき！`;

export const KS_GET = `@sys
『さんかどの 手紙 3通』を
あずかった。`;

/** 峠へ 行かずに もう一度 さんかどに 話す（1回）。 */
export const KS_WAIT = `@npc_hoshi_busdriver
県道の 西の はしの 先さ。{w=300}
峠の カーブ。`;

/** 並べる 前に 峠から もどって 話す（1回）。 */
export const KS_WAIT2 = `@npc_hoshi_busdriver
カーブの 見晴らしから、{w=300}
雲の 上の 目印が
見えるよ。`;

// ================================================================ 県道の 西の はし（村の (0,38–39)）

/** 〔kumo〕の あと：はじめて ぶつかった とき（1回）。 */
export const KS_EDGE_GO = `@narr
県道は、西へ {w=300}
下りながら、
大きく 曲がっている。`;

// ================================================================ 2 山の 上の 海（峠の カーブに 入ると すぐ。1回）

export const KS_ENTER = `@narr
ガードレールの 向こうは、{w=300}
いちめんの 白い 雲。
@npc_kanenari
海や！{w=300}
……山の 上に、
海が ある！
@narr
雲の 上に、{w=300}
3つだけ、
何かが 出ている。`;

// ================================================================ 峠の カーブの 物（5つ）

/** カーブミラー（1回目、グソっ君が いる とき：かくし）。 */
export const KS_MIRROR = `@narr
カーブミラー。{w=300}
星あかりで、
カーブの 先が 白い。`;
export const KS_MIRROR_KN = `@narr
ミラーに、{w=300}
トマトの 灯りと、
大きな よろい。
@npc_kanenari
わい、{w=300}
映りが ええな。`;

/** もう 使って いない 古い バス停の 標柱。 */
export const KS_HYOCHU = `@narr
古い バス停の 標柱。{w=300}
字が かすれて、
停留所の 名前が 読めない。
/
時刻表の 板は、{w=300}
はずして ある。`;

/** 道の はしの 反射板。 */
export const KS_HANSHA = `@narr
道の はしの 反射板。{w=300}
トマトの 灯りを、
まるく 返して くる。`;

/** ガードレール（見晴らしの 外）。 */
export const KS_GUARD = `@narr
ガードレールの 下は、{w=300}
いちめんの 雲。
音が しない。`;

/** 見晴らし：手紙が ない（〔kumo〕の 前・すんだ あと）。 */
export const KS_MIHARASHI = `@narr
雲の 上に、{w=300}
鉄塔の 頭と、大きな 杉と、
お寺の 屋根。`;

/** 見晴らし：すんだ あと。 */
export const KS_MIHARASHI_AFTER = `@narr
3つの 島の 下に、{w=300}
3通の 行き先。`;

/** 杉の 斜面。 */
export const KS_SUGI = `@narr
杉の 斜面。{w=300}
しめった 土の
においが する。`;

/** 西の はし（ふもとへは 行けない）。 */
export const KS_WEST = `@narr
道は、雲の 中へ {w=300}
下りて いく。
@npc_kanenari
この 先は、{w=300}
朝の バスで。`;
export const KS_WEST_SOLO = `@narr
道は、雲の 中へ {w=300}
下りて いく。
この 先は、朝の バスで。`;

// ================================================================ 3 雲の 海（大写し）

/** 大写しの はじめ（1回目）。 */
export const KS_KUMO_HAJIME = `@narr
手紙の えんぴつの 字と、{w=300}
雲から 出た 目印を、
見くらべよう。`;

/** 手紙 i の 字（宛名の 横の メモ）。 */
export const KS_MEMO: [string, string, string] = ['鉄塔の 下の 団地', '大杉の 神社の 前', 'お寺の 坂の 下'];

export const ksMemoLine = (i: number): string => `@narr
${i + 1}通目。{w=300}
『${KS_MEMO[i]}』。`;

/** 行き先が 合った。 */
export const KS_ATE_OK: [string, string, string] = [
  `@narr
尾根の 鉄塔。{w=300}
その 下の 雲の 中に、
団地が ある。`,
  `@narr
丘の 上の 大杉。{w=300}
神社は、雲の 下だ。`,
  `@narr
高台の お寺の 屋根。{w=300}
坂は、雲の 中へ
下りて いる。`,
];

/** 行き先が ちがう（失敗に しない。何度でも）。 */
export const KS_ATE_NG = `@narr
メモの 目印と、{w=300}
形が ちがう。`;

/** 3通の 行き先が きまった。 */
export const KS_ATE_DONE = `@narr
3通の 行き先が、{w=300}
きまった。
/
つぎは、坂を 下る 順。{w=300}
県道の 線を、
上から たどろう。`;

/** 道の 順の 1つ目・2つ目（合った）。 */
export const KS_JUN_OK: [string, string] = [
  `@narr
峠を 下りて、{w=300}
いちばん 先に 通る。`,
  `@narr
雲を くぐって、{w=300}
その 先。`,
];

/** 道の 順が ちがう（何度でも）。 */
export const KS_JUN_NG = `@npc_kanenari
それやと、{w=300}
坂を 2回
のぼるで。`;
export const KS_JUN_NG_SOLO = `@narr
道を、{w=300}
もう 一度 たどって みよう。`;

/** 3通が 道の 順に 並んだ。 */
export const KS_JUN_DONE = `@narr
3通が、{w=300}
道の 順に 並んだ。`;

/** 並べた あと、見晴らしで（グソっ君が いる とき）。 */
export const KS_JUN_DONE_KN = `@npc_kanenari
さんかどに、{w=300}
見せに 行こか。`;

// ================================================================ 4 道の 順 → 5 雲の 下にも（転回場の さんかど）

export const KS_HOUKOKU = `@narr
しゅんは、並べた 手紙を
さんかどに 返した。
@npc_hoshi_busdriver
……道の 順だ。{w=300}
局の 人と、
同じ 並べ方だよ。
/
配る 前に、{w=300}
配る 順に 並べる。
道順組立って いうんだ。
@npc_kanenari
むずかしい 名前の
わりに、{w=300}
やさしい 仕事や。`;

/** かくし：1回も まちがえずに 並べた（1回）。 */
export const KS_KYOKU = `@npc_hoshi_busdriver
……局で、{w=300}
やって いけるよ。`;

/** かくし：第1章の『あした』宛ての 手紙を あずけて いる（1回）。 */
export const KS_ASHITA = `@npc_hoshi_busdriver
『あした』宛ては、{w=300}
道の 順の、
いちばん 最後だ。`;

export const KS_KUMO_SHITA = `@npc_hoshi_busdriver
朝が 来たら、{w=300}
あの 雲は 消える。
/
雲の 下にも、{w=300}
ちゃんと 郵便受けが
ある。
/
……届けに 行くよ。{w=300}
朝の 便で。`;

export const KS_REWARD = `@sys
朱肉が 2 ふえた。
/
みました帳②の すみに、
『雲の 下にも、郵便受け』の
ページ。`;

/** すんだ あと、さんかど（1回）。 */
export const KS_AFTER = `@npc_hoshi_busdriver
袋の いちばん 上は、{w=300}
峠を 下りて、
いちばん 先の 家さ。`;

/** すんだ あと、県道の 西の はしに ぶつかる。 */
export const KS_EDGE_AFTER = `@narr
峠の 下は、{w=300}
雲の 海。`;

// ================================================================ 大写し「雲の 海」の 字

export const KS_UI = {
  place: '雲の 海',
  /** やり方の カード（ui/closeup.ts）。 */
  howto: { id: 'touge', line: '{←→}で 島を 選んで、{Z}', pic: 'lr' as const },
  keys: {
    ate: 'けってい えらぶ',
    jun: 'けってい えらぶ',
  },
  /** 右の 列の 見出し。 */
  ateHead: (n: number) => `行き先 ${n}/3`,
  junHead: (n: number) => `道の 順 ${n}/3`,
  letter: (i: number) => `${i + 1}通目`,
  road: '県道',
  shima: ['お寺', '大杉', '鉄塔'] as [string, string, string],
};

/** 大事な もの（items.ts）。 */
export const KS_ITEM_DESC: [string, string] = ['宛名の 横に、えんぴつの', '小さな 目印。'];

// ================================================================ みました帳②の すみ『雲の 下にも、郵便受け』

export const KS_BOOK = {
  title: '雲の 下にも、郵便受け',
  titleLines: ['雲の 下にも、', '郵便受け'],
  /** さんかどの 字。 */
  quote: ['道順'],
  rows: ['手紙の 行き先', '峠の 物'],
};

/** 文の検査（ksText・textcheck2 の walk）に出す物。 */
export const KS_TEXTS: Record<string, unknown> = {
  KS_START, KS_GET, KS_WAIT, KS_WAIT2, KS_EDGE_GO, KS_ENTER, KS_MIRROR, KS_MIRROR_KN, KS_HYOCHU, KS_HANSHA, KS_GUARD,
  KS_MIHARASHI, KS_MIHARASHI_AFTER, KS_SUGI, KS_WEST, KS_WEST_SOLO, KS_KUMO_HAJIME, memo: [0, 1, 2].map(ksMemoLine), KS_ATE_OK,
  KS_ATE_NG, KS_ATE_DONE, KS_JUN_OK, KS_JUN_NG, KS_JUN_NG_SOLO, KS_JUN_DONE, KS_JUN_DONE_KN, KS_HOUKOKU, KS_KYOKU, KS_ASHITA,
  KS_KUMO_SHITA, KS_REWARD, KS_AFTER, KS_EDGE_AFTER,
};
