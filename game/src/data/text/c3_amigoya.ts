// 破れたら、つくろう（げむきか 10/25 の 案2、2026-10-25 依頼主の 採用。03_ch3_index）。第3章の クリア前、段階2（12:01）。
// S13 の あと（flag_ch3_got_gochisou）から S14 の 前まで（flag_ch3_truck_trap が 立ったら 起きない）。
//
//   段階1 の 前ぶれ：港通りの 西の はしの 漁協の 建物の 木の 戸 (5,15)（札『網小屋』、網の におい、グソっ君。1回）。
//   1 明日、船を 出す（食堂かもめの 前の ゴロウ。いつもの〔c2〕の あと、もう 1回 話す〔ami〕）
//   2 網小屋（漁協の 戸の 暗転で 新しい 地図 map_c3_amigoya、16×10）
//   3 切って、ととのえる（1つめの 破れの 前。網針と 目板）
//   4 大写し「網の 目」：破れ 3つ、1つに 2目ずつ（合わせて 6目）。針を 目板に かけて〈けってい〉、
//     糸を 回して 結ぶ〈←→〉。目板に かけずに 結ぶと、その 目だけ 大きく なる（1つ 前に もどる。失敗に しない）。
//   5 また 出る → ごほうび
//
// 依頼主の 返事・会議に 合わせて 案から 直した 所：
//   ・網の 種類は 言い切らない（依頼主の 返事なし、60 2.2「漁の 種類を 言い切らない」）。「刺し網」は 使わず「網」。
//     刺し網の 説明の 2ページ（「魚の 通り道に 立てる」「網の 目に ささる」）と、グソっ君の「ささらんように せな」は
//     外して、「網に かかっても、はさみで 出られる」→ ゴロウ「……網は 切るな。」に した。
//   ・結ぶ 操作は 12回 → 6回（会議：長い）。目の 数は 2・2・2。
//   ・「本目」は 言わない。「目板」は ゴロウが 言った あと、グソっ君が「目の 大きさの、ものさし」と 言いかえる。
//   ・「穴を 切って そろえる」→「ちぎれた 糸を 切って、穴の 形を ととのえる」（調べ物：切れた 糸を 少し 残して
//     切り除き、形を ととのえてから 編む。$SP/handoff/amigoya_progress.md）。
//   ・スナホリムシは「網の 魚を 食う」→「網に かかった 魚を、食う ことが ある」（徳島県の 報告は 例の 1つ）。
//     オオグソクムシも スナホリムシ科なので「グソクの 親戚」は そのまま。
// 決まり：地の文・名札に「さん」なし。天丼の 口ぐせ（「……もう 1杯。」ほか）は 使わない。時刻の 数字は 出さない。

// ================================================================ 漁協の 戸（網小屋の 戸）

/** 段階1 の 前ぶれ（1回目）。 */
export const AG_DOOR_C1 = `@narr
戸に 札。{w=300}
『網小屋』。
/
すきまから、{w=300}
網の においが する。`;

export const AG_DOOR_C1_KN = `@npc_kanenari
……だれも おらんな。{w=300}
網の 持ち主、
お昼が 長いんや。`;

/** 札だけ（段階1 の 2回目から、段階2 の 始まる 前、S15 から 先、クリア後）。 */
export const AG_DOOR_FUDA = `@narr
戸に 札。{w=300}
『網小屋』。`;

export const AG_DOOR_DONE = `@narr
戸に 札『網小屋』。{w=300}
中で、網を たたむ 音。`;

// ================================================================ 1 明日、船を 出す（〔ami〕）

export const AG_A = `@npc_c3_jouren
……明日、{w=300}
船を 出す。
/
網が、{w=300}
破れたまま じゃ。
@npc_kanenari
つくろうんか？{w=300}
手伝うで。
@npc_c3_jouren
…………{w=300}
ついて こい。`;

export const AG_A_SOLO = `@npc_c3_jouren
……明日、{w=300}
船を 出す。
/
網が、{w=300}
破れたまま じゃ。
/
…………{w=300}
ついて こい。`;

/** 漁協の 戸の 前（ゴロウが 鍵を 開ける）。 */
export const AG_TO = `@narr
ゴロウが、
漁協の はしの 木の 戸を
開けた。`;

// ================================================================ 2 網小屋（入って すぐ、1回）

export const AG_IN = `@narr
梁から、{w=300}
網が 何枚も
下がっている。
@npc_c3_jouren
……破れが、{w=300}
3つ ある。`;

export const AG_IN_KN = `@npc_kanenari
わい、網に かかっても、{w=300}
はさみで 出られるな。
@npc_c3_jouren
……網は 切るな。`;

/** かくし：やっと、魚の 昼（ツリノの 浮き釣り）を 済ませている（1回）。 */
export const AG_TSURINO = `@npc_kanenari
竿の 人と、{w=300}
網の 人や。
@npc_c3_jouren
……ツリノは、{w=300}
竿しか 信用せん。`;

// ================================================================ 3 切って、ととのえる（1つめの 破れの 前）

export const AG_DOUGU = `@narr
平たい 竹の 針に、{w=300}
糸が 巻いてある。
@npc_c3_jouren
……網針。{w=300}
こっちは 目板。
/
目の 大きさを、{w=300}
そろえる 板じゃ。`;

export const AG_DOUGU_KN = `@npc_kanenari
目の 大きさの、{w=300}
ものさし やな。`;

export const AG_KIRU = `@npc_c3_jouren
……まず、{w=300}
ちぎれた 糸を 切って、
穴の 形を ととのえる。`;

export const AG_KIRU_KN = `@npc_kanenari
破れとるのに、{w=300}
もっと 切るんか！`;

export const AG_KIRU_2 = `@npc_c3_jouren
……形が 決まらんと、{w=300}
目が そろわん。
/
あとは、1本の 糸で、{w=300}
続けて 結ぶ。`;

/** 穴の 形を ととのえた（毎回、大写しを 開く 前）。 */
export const AG_CHOKI = `@narr
ちぎれた 糸を 切って、{w=300}
穴の 形を ととのえた。`;

// ================================================================ 4 大写し「網の 目」

/** 大写しの 中の はじめの 1回：やり方。 */
export const AG_RULE = `@npc_c3_jouren
針を、目板に {w=300}
かけてから、結ぶ。`;

/** グソっ君（1つめの 破れで 1回だけ）。 */
export const AG_OSAERU = `@npc_kanenari
押さえる 係なら、{w=300}
まかしとき。`;

/** 目板に かけずに 結んだ（1つ 前に もどる）。 */
export const AG_OOKII = `@npc_c3_jouren
……大きい 目から、{w=300}
魚が 逃げる。
@narr
結び目を ほどいた。`;

/** 2つめ（長い 裂け目）。 */
export const AG_NE = `@narr
網が、{w=300}
縦に 長く
裂けている。
@npc_c3_jouren
……根に かけた。
@npc_kanenari
根？
@npc_c3_jouren
海の 底の、岩じゃ。`;

export const AG_NE_SOLO = `@narr
網が、{w=300}
縦に 長く
裂けている。
@npc_c3_jouren
……根に かけた。{w=300}
海の 底の、岩じゃ。`;

/** 3つめ（骨の あと）。 */
export const AG_HONE = `@narr
破れの そばに、{w=300}
魚の 骨が
ひっかかっている。
@npc_c3_jouren
……スナホリに {w=300}
やられた。
@npc_kanenari
すなほり？
@npc_c3_jouren
砂に もぐる、{w=300}
小さい 虫じゃ。
/
網に かかった 魚を、{w=300}
食う ことが ある。
/
……グソクの {w=300}
親戚じゃ。
@npc_kanenari
親戚が、{w=300}
えらい すんません！
@npc_c3_jouren
……海の 掃除屋じゃ。{w=300}
腹は 立てん。`;

export const AG_HONE_SOLO = `@narr
破れの そばに、{w=300}
魚の 骨が
ひっかかっている。
@npc_c3_jouren
……スナホリに {w=300}
やられた。
/
砂に もぐる、{w=300}
小さい 虫じゃ。
/
網に かかった 魚を、{w=300}
食う ことが ある。
/
……海の 掃除屋じゃ。{w=300}
腹は 立てん。`;

/** 1つ つくろった（地の文）。 */
export const AG_TSUKUROTTA = [
  `@narr
1つめの 破れを、{w=300}
つくろった。`,
  `@narr
2つめの 破れを、{w=300}
つくろった。`,
  `@narr
3つめの 破れを、{w=300}
つくろった。`,
];

/** 順番（小さい 穴から）。 */
export const AG_JUNBAN = `@npc_c3_jouren
……小さい 穴から じゃ。{w=300}
左の はし。`;

/** つくろった 破れを また 調べる。 */
export const AG_SUNDA = `@narr
つくろった 目が、{w=300}
きちんと 並んでいる。`;

/** 始まる 前・すんだ あとの 網。 */
export const AG_AMI = `@narr
梁から 下がった 網。{w=300}
窓の 光が、
目から もれている。`;

/** かくし：3つめで、目板を 1回も はずさなかった（1回）。 */
export const AG_KIYOU = `@npc_c3_jouren
……海の 掃除屋の {w=300}
親戚は、手が
器用じゃのう。`;

/** 大写しの はじめの カード（ui/closeup.ts、改善会議 10-25 の1）：針が 目板に 重なったら けってい、←→ で 結ぶ。 */
export const AG_HOWTO = { id: 'amigoya', line: '{Z}で かけて、{←→}で 結ぶ', pic: 'timing' as const };

/** 大写しの 字（右の 列）。 */
export const AG_UI = {
  title: '網の 目',
  hole: ['1つめ', '2つめ', '3つめ'],
  me: (n: number, of: number) => `目 ${n}/${of}`,
  keysKake: ['けってい', '目板に かける'],
  keysMawasu: ['←→', '糸を 回す'],
};

// ================================================================ 5 また 出る

export const AG_DERU = `@narr
つくろった 目が、{w=300}
ほかの 目と、
同じ 大きさに 並んだ。
/
ゴロウが、網を
窓の 光に かざした。
@npc_c3_jouren
……破れん 網は、{w=300}
海に 出とらん
網じゃ。
/
破れたら、つくろう。{w=300}
……また 出る。`;

export const AG_DERU_KN = `@npc_kanenari
……ゴロウさん、{w=300}
今日 いちばん
しゃべったな。`;

export const AG_MOTTOKE = `@npc_c3_jouren
…………{w=300}
持っとけ。
@narr
ゴロウが、網針を
しゅんに わたした。`;

export const AG_REWARD = `@sys
朱肉が 2 ふえた。
『古い網針』を
もらった。
/
みました帳③の すみに、
『破れたら、つくろう』の
ページ。`;

/** かくし：マサルが 来ている（網小屋の 戸の 前、1回）。 */
export const AG_MASARU = `@npc_hoshi_gen
……山の 網も、{w=300}
破れる。
イノシシが、くぐる。
@npc_c3_jouren
……つくろうか。
@npc_hoshi_gen
……つくろう。`;

// ================================================================ 網小屋の 物・人

export const AG_GORO_MAE = `@npc_c3_jouren
……3つ。{w=300}
つくろう。`;

export const AG_GORO_NAKA = `@npc_c3_jouren
……あと、{w=300}
もう ひと息じゃ。`;

export const AG_YAMA = `@narr
たたんだ 網が、{w=300}
山に なっている。
/
はしに、浮きと
おもりが 並んでいる。`;

export const AG_HAKO = `@narr
浮きの 箱と、{w=300}
おもりの 箱。`;

export const AG_DOUGUBAKO = `@narr
道具箱。{w=300}
網針、目板、
網糸の 玉。`;

export const AG_MADO = `@narr
窓の 外に、{w=300}
港と 船。
/
船が、{w=300}
ゆれている。`;

export const AG_NAGAGUTSU = `@narr
長靴が 1足。{w=300}
白く かわいた
塩の あと。`;

export const AG_ITEM_DESC: [string, string] = ['竹の 網針。', '糸の あとで、すべすべ。'];

/** みました帳③の すみの 1ページ（ui/menu/book_amigoya.ts）。 */
export const AG_BOOK = {
  title: '破れたら、つくろう',
  titleLines: ['破れたら、', 'つくろう'],
  ana: (n: number) => `つくろった ${n}/3`,
  me: (n: number) => `結んだ 目 ${n}`,
  kn: '親戚が すんません',
  quote: ['また 出る'],
};

export const AG_TEXTS: Record<string, unknown> = {
  AG_DOOR_C1, AG_DOOR_C1_KN, AG_DOOR_FUDA, AG_DOOR_DONE, AG_A, AG_A_SOLO, AG_TO, AG_IN, AG_IN_KN, AG_TSURINO,
  AG_DOUGU, AG_DOUGU_KN, AG_KIRU, AG_KIRU_KN, AG_KIRU_2, AG_CHOKI, AG_RULE, AG_OSAERU, AG_OOKII, AG_NE, AG_NE_SOLO,
  AG_HONE, AG_HONE_SOLO, AG_TSUKUROTTA, AG_JUNBAN, AG_SUNDA, AG_AMI, AG_KIYOU, AG_DERU, AG_DERU_KN, AG_MOTTOKE,
  AG_REWARD, AG_MASARU, AG_GORO_MAE, AG_GORO_NAKA, AG_YAMA, AG_HAKO, AG_DOUGUBAKO, AG_MADO, AG_NAGAGUTSU,
};
