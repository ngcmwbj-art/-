// 本日は、開館です（げむきか 10/14 の 案3、2026-10-15 依頼主の 採用。05_postgame 2.3 yr_c3_iso、03_ch3_index）。
// 第3章の クリア後の 昼。旧水族館の 券売所の ポコシャは「開館の 準備中」。水槽は からっぽなので、館の 裏の 岬の 磯を
// 『そとの 展示室』に する。グソっ君と しゅんが 昼の 引き潮の 磯で 石を めくり（めくったら、もとに もどす）、
// よろいを 着た 生き物を 見て、ポコシャが 名札を 書く。最後に、10年「休館です」と 入口を 掃いてきた ハキコが、
// はじめての お客に なる。
//
//   1 開館の 準備中（券売所の ポコシャ。グソっ君と いっしょ）→ 大事なもの『からの 名札』（flag_iso_start）
//   2 石段の ハキコ（旧水族館の 前）flag_iso_hakiko
//   3 石めくり（岬の 磯 map_c3_iso。大写し。昼の あいだ 何回でも。潮が 満ちたら 石段へ）
//   4 名札を わたす（券売所。見つけた 名札の 子 1枚ずつ）flag_iso_card_<id>
//   5 いちばん 奥の 名札（6枚の あと。ポコシャと 深海の 展示室へ）flag_iso_oku
//   6 ちいさな 開館（券売所）→ 順路 → 磯 → 7 本日は、開館です（入口）flag_iso_kaikan
//
// リードの 決めた こと：ちいさく 開館して よい。開館の あとも 伝票・日誌・えさの 札は そのまま 拾える。券の 代金は
// お金が 減る（足りない ときは ポコシャ「……今日は、招待券 です。」で 無料）。クリア後の 昼は、磯の 潮が 引いている。
// 生き物の 事実（ヒザラガイの 板 8枚、カメノテが 蔓脚で 集める、フナムシと オオグソクムシは 同じ 等脚目）は 正しい。
// 生き物は 見るだけ、石は もどす。空の 水槽の 名札は エンディングで 明かした 範囲（深い 海から 来た）だけ。
// 名前は {name:npc_c3_*}（c3_names.ts）。地の文・名札の 名前に「さん」なし。1ページ 3行 × 336px。

const HAKIKO = '{name:npc_c3_uketsuke}';

// ================================================================ 1 開館の 準備中

export const ISO_START = `@npc_kanenari
開館って、{w=300}
なに 見せるん？{w=300}
水槽、からっぽやで。
@npc_pokosha
……そこが、{w=300}
問題 です。
/
生き物は、{w=300}
ほかの 水族館へ、
引っこしました。
/
……なので、{w=300}
見に 行く 展示に
します。
/
裏の 磯。{w=300}
昼は、潮が 引きます。{w=300}
……そとの 展示室 です。
/
名札が、6枚 いります。{w=300}
見て きて、ください。`;

export const ISO_GET = `@sys
『からの 名札』を 6枚
あずかった。`;

export const ISO_START_EGO = `@エゴ:dakoku
ジュンビチュウ。{w=300}
ガチャン。`;

/** グソっ君が いない ときの ポコシャ（はじまる 前）。 */
export const ISO_POKO_SOLO = `@npc_pokosha
……開館の 準備中 です。
{w=300}……展示の ことで、
ちょっと、困って います。`;

/** 名札を 待っている 間（わたす 物が ない）。 */
export const ISO_POKO_WAIT = `@npc_pokosha
……裏の 磯。{w=300}
昼の 引き潮 です。
{w=300}石段は、館の 前の 南。`;

// ================================================================ 2 石段の ハキコ

export const ISO_HAKIKO = `@npc_c3_uketsuke
……あら、磯へ？{w=300}
石を めくったら、{w=300}
もとに もどして ね。
/
下に 住んどる 子の、{w=300}
屋根 じゃけえ。`;

// ================================================================ 石段（旧水族館の 前の 南）

/** 第3章の 段階1〜2：止まった 正午。 */
export const ISO_ROPE_NOON = `@narr
石段に、ロープ。{w=300}
札に『潮が 止まって います』。`;

/** クリア後、昼の ほかの 時間：潮が 満ちている。 */
export const ISO_ROPE_MITSU = `@narr
石段の 下まで、
潮が 満ちている。{w=300}
……昼には、引く。`;

/** 満ちたあと、その 日の 昼の 残り。 */
export const ISO_ROPE_ASHITA = `@narr
石段の 下まで、
潮が 満ちて きた。{w=300}
……また あしたの 昼。`;

// ================================================================ 3 石めくり（岬の 磯）

export const ISO_FIRST = `@narr
岬の 磯。{w=300}
岩の くぼみに、
潮だまりが 残っている。
@npc_kanenari
……海の におい、{w=300}
するなあ。`;

export const ISO_RULE = `@npc_kanenari
石を 選んで、けってい で
めくる。{w=300}
見たら、もう 1回で もどす。
/
はしの 波の 線が、
潮の めもりや。{w=300}
満ちたら、上がるで。`;

/** 生き物（id → 見つけた ときの 文）。名札に なる 6つと、ならない 3つ。 */
export const ISO_FIND: Record<string, string> = {
  yoroi: `@narr
小石や 貝がらを、{w=300}
体じゅうに
くっつけて いる。
@npc_kanenari
……よろいや。{w=300}
わいと、名前が
かぶっとる。`,
  hizara: `@narr
背中に、板が 8枚。{w=300}
岩に ぴったり。
@npc_kanenari
わいより、{w=300}
板 多いやん。`,
  yadokari: `@narr
潮だまりの 底を、
巻き貝が 歩いている。
@npc_kanenari
よろい、借りもんか。{w=300}
……大きなったら、
どないすんねん。`,
  isogani: `@narr
石を めくると、{w=300}
カニが 横に 走った。
@npc_kanenari
なかま！{w=300}
……逃げられた。`,
  kamenote: `@narr
岩の すき間に、{w=300}
指みたいな 物が
並んでいる。
@npc_kanenari
……だれかの 手が、{w=300}
はさまっとる？`,
  funamushi: `@narr
乾いた 岩の 上を、
小さな 虫が いっせいに
走って 消えた。
@npc_kanenari
あ、親戚や！{w=300}
……はやっ！
/
わいら、同じ なかま
なんやで。{w=300}
あいさつ くらい、させてえな。`,
  agohaze: `@narr
潮だまりの 底で、
小さな ハゼが じっと
している。`,
  iboni: `@narr
石の 裏に、{w=300}
いぼいぼの 巻き貝。`,
  tamakibi: `@narr
岩の 上に、{w=300}
小さな 巻き貝が
ぽつぽつ。`,
};

/** 名札に ならない 子を 見た あと、名札を わたす とき（1回）。 */
export const ISO_NOT_CARD = `@npc_pokosha
……名札は、6枚 なので。`;

/** 2回目からの フナムシ（また 逃げた）。 */
export const ISO_FUNA_AGAIN = `@narr
フナムシが、
いっせいに 逃げた。`;

/** かくし：フナムシに 3回 逃げられた。 */
export const ISO_FUNA_3 = `@npc_kanenari
……親戚づきあい、{w=300}
むずかしいな。`;

/** 石の 下に 何も いない（id → 文）。 */
export const ISO_KARA = [
  `@narr
からっぽ。{w=300}
ぬれた 砂だけ。`,
  `@narr
からっぽ。{w=300}
小さな 穴が 1つ。`,
  `@narr
からっぽ。{w=300}
石の 裏に、海藻の 切れはし。`,
];

/** もどさずに 離れた とき（グソっ君が もどす）。 */
export const ISO_KN_MODOSU = `@npc_kanenari
屋根、{w=300}
もどしとくで。`;

/** 2回目からの 生き物（同じ 子を また 見た）。 */
export const ISO_AGAIN = `@narr
……また 会えた。`;

/** 潮が 満ちた。 */
export const ISO_MITSU = `@narr
足もとに、波が
寄せて きた。{w=300}
……潮が 満ちて くる。
@npc_kanenari
上がろか。{w=300}
あしたの 昼、また 引くで。`;

/** グソっ君と いっしょで ない とき（石段の 上）。 */
export const ISO_NEED_KN = `@narr
……石を めくるなら、
グソっ君と 来たほうが
よさそうだ。`;

/** 取水口（古い 管）。 */
export const ISO_SHUSUI = `@narr
古い 管が、海へ のびている。
{w=300}札に『取水口 さわらない』。
/
……水族館の 水は、
ここから 来ていた らしい。`;

/** 名札の 杭（磯。ポコシャの 名札）。 */
export const ISO_KUI = `@narr
潮だまりの そばの 杭に、
名札。{w=300}
すみに 小さく『解説 ポコシャ』。`;

/** 西の はしから 見える 物。 */
export const ISO_NISHI = `@narr
岬の 西の はしから、
防波堤と 赤い 灯台が
見える。`;

// ================================================================ 4 名札を わたす

/** 名札の 文（名前・解説 2行）。 */
export const ISO_CARDS: Record<string, { name: string; kaisetsu: [string, string] }> = {
  yoroi: { name: 'ヨロイイソギンチャク', kaisetsu: ['小石を つけて、', 'よろいに する。'] },
  hizara: { name: 'ヒザラガイ', kaisetsu: ['背中の 板は 8枚。', 'はがれない。'] },
  yadokari: { name: 'ホンヤドカリ', kaisetsu: ['大きく なったら、', '貝を 引っこす。'] },
  isogani: { name: 'イソガニ', kaisetsu: ['よろいを ぬいで、', '大きく なる。'] },
  kamenote: { name: 'カメノテ', kaisetsu: ['岩に くっついた まま、', '足で ごはんを 集める。'] },
  funamushi: { name: 'フナムシ', kaisetsu: ['海と 陸の あいだを', '走る。足が 速い。'] },
};

/** 名札に ならない 子の 名前（みました帳）。 */
export const ISO_MINI_NAMES: Record<string, string> = { agohaze: 'アゴハゼ', iboni: 'イボニシ', tamakibi: 'タマキビ' };

export const ISO_CARD_FIRST = `@npc_pokosha
……書き ました。
@narr
名札の すみに、{w=300}
小さく『解説 ポコシャ』。
@npc_kanenari
名前、{w=300}
ちゃんと 書いとるやん。
@npc_pokosha
……はい。{w=300}
自分が、書いたので。`;

/** 名札 1枚（2枚目から）。 */
export const ISO_CARD_NEXT = `@npc_pokosha
……書き ました。`;

/** 名札の 中身を 見せる 地の文。 */
export function isoCardText(id: string): string {
  const c = ISO_CARDS[id];
  return `@narr
『${c.name}』。
/
『${c.kaisetsu[0]}
${c.kaisetsu[1]}』`;
}

export const ISO_CARD_KUI = `@npc_pokosha
……磯の 杭に、
立てて おきます。`;

// ================================================================ 5 いちばん 奥の 名札

export const ISO_OKU_ASK = `@npc_pokosha
……6枚、そろい ました。
/
……あと 1枚。{w=300}
深海の 展示室へ、
いっしょに 来て ください。`;

export const ISO_OKU = `@narr
いちばん 奥の、{w=300}
空の 水槽。{w=300}
名札は、削られた まま。
@npc_pokosha
……ここにも、{w=300}
1枚。
@narr
新しい 名札。{w=300}
『オオグソクムシ』。
/
深い 海の 底に すむ。{w=300}
何年も 食べずに
いられる ことが ある。
@npc_kanenari
わいは、{w=300}
1日も むりやで。
@narr
その 下に、もう 1行。{w=300}
『この 水槽の 子は、
ただいま 外で 勤務中』。
@npc_kanenari
……留守の 札や。{w=300}
焼きそば屋の。
@npc_pokosha
……はい。{w=300}
帰って こなくて、{w=300}
いい 札 です。`;

/** かくし：潜りで「なつかしい においや」を 聞いた 人。 */
export const ISO_OKU_FUCHI = `@npc_kanenari
……あの 深い ほうから、{w=300}
来たんやな。わい。`;

export const ISO_OKU_AFTER = `@npc_pokosha
……券売所へ、{w=300}
もどります。`;

// ================================================================ 6 ちいさな 開館

export const ISO_KAIKAN = `@npc_pokosha
……ちいさく、{w=300}
開館 します。{w=300}
磯の 展示 だけ。
@エゴ:dakoku
カイカン。{w=300}
ニュウカン ダコク、{w=300}
ジュンビ ヨシ。ガチャン。
@narr
ガラス戸の 前に、{w=300}
ほうきを 持った 人。`;

export const ISO_KAIKAN_2 = `@npc_c3_uketsuke
……大人、1枚。
@npc_pokosha
……は、800円 です。
@npc_kanenari
はじめての お客さんが、{w=300}
元・受付 なんか。
@npc_c3_uketsuke
受付の 窓から、{w=300}
順路の 入口は、毎日
見とった けどね。
/
……歩くのは、はじめて。
@エゴ:dakoku
ニュウカン。{w=300}
ガチャン。
@npc_pokosha
……こども、400円 です。`;

export const ISO_PAY = `@sys
400円 はらった。`;

export const ISO_SHOTAI = `@npc_pokosha
……今日は、{w=300}
招待券 です。`;

export const ISO_KN_TICKET = `@npc_pokosha
……展示の 方は、{w=300}
無料 です。
@npc_kanenari
なんでやねん！`;

/** 順路（短い カット）。 */
export const ISO_JUNRO = `@narr
床の 矢印が、
まっすぐ 奥を 指している。`;

export const ISO_JUNRO_OKU = `@npc_c3_uketsuke
……ええ 名札。`;

export const ISO_JUNRO_ISO = `@npc_c3_uketsuke
ここ、受付の 窓から、{w=300}
いつも 海だけ
見えとった。
/
……屋根の 下に、{w=300}
こんな 子らが
おったんね。`;

/** かくし：12の 石を 全部 自分で もどした。 */
export const ISO_JUNRO_YANE = `@npc_c3_uketsuke
屋根、{w=300}
ぜんぶ もどして
くれたのね。`;

// ================================================================ 7 本日は、開館です（名場面）

export const ISO_HONJITSU = `@narr
${HAKIKO}が、ガラス戸の
貼り紙を はがした。
/
ポコシャの 字で、{w=300}
新しい 紙。
@npc_c3_uketsuke
……本日は、{w=300}
開館です。
@npc_pokosha
……い、いらっしゃいませ。
@npc_c3_uketsuke
受付の 声は、{w=300}
小さくて ええの。{w=300}
お客さんの 前で 言うけえ。
@エゴ:dakoku
……ガチャン。`;

export const ISO_REWARD = `@sys
朱肉が ぜんぶ もどった。
/
みました帳③の すみに、
『そとの 展示室』の ページ。`;

// ================================================================ そのあと

/** 入口の 貼り紙（開館の あと）。 */
export const ISO_HARIGAMI = `@narr
ガラス戸に、ポコシャの 字。
{w=300}『本日 開館』。`;

/** 順路の ベンチの ハキコ。 */
export const ISO_HAKIKO_BENCH = `@npc_c3_uketsuke
本日は、開館です。`;

/** 券売所の ポコシャ（開館の あと）。 */
export const ISO_POKO_AFTER = `@npc_pokosha
……開館中 です。{w=300}
展示は、裏の 磯 です。`;

// ================================================================ 大写しの 字

export const ISO_UI = {
  place: '石めくり',
  keys: ['↑↓←→ 選ぶ', 'けってい', 'めくる・見る'],
  keysBack: ['けってい', '石を もどす'],
  shio: '潮',
  ishi: '石',
};

/** みました帳③の すみ『そとの 展示室』。 */
export const ISO_BOOK = {
  title: 'そとの 展示室',
  oku: 'オオグソクムシ',
  ishi: '石',
  mini: '名札なし',
};

export const ISO_ITEM_DESC: [string, string] = ['ポコシャから あずかった。', '白い 名札が 6枚。'];

export const ISO_TEXTS: Record<string, unknown> = {
  ISO_START, ISO_GET, ISO_START_EGO, ISO_POKO_SOLO, ISO_POKO_WAIT, ISO_HAKIKO, ISO_ROPE_MITSU, ISO_ROPE_ASHITA,
  ISO_FIRST, ISO_RULE, ISO_FIND, ISO_NOT_CARD, ISO_FUNA_AGAIN, ISO_FUNA_3, ISO_KARA, ISO_KN_MODOSU,
  ISO_AGAIN, ISO_MITSU, ISO_NEED_KN, ISO_SHUSUI, ISO_KUI, ISO_NISHI, ISO_CARD_FIRST, ISO_CARD_NEXT,
  cards: Object.keys(ISO_CARDS).map((id) => isoCardText(id)), ISO_CARD_KUI, ISO_OKU_ASK, ISO_OKU, ISO_OKU_FUCHI,
  ISO_OKU_AFTER, ISO_KAIKAN, ISO_KAIKAN_2, ISO_PAY, ISO_SHOTAI, ISO_KN_TICKET, ISO_JUNRO, ISO_JUNRO_OKU, ISO_JUNRO_ISO,
  ISO_JUNRO_YANE, ISO_HONJITSU, ISO_REWARD, ISO_HARIGAMI, ISO_HAKIKO_BENCH, ISO_POKO_AFTER,
};
