// 落とすけえ、甘うなる（げむきか 10/23 の 案1、2026-10-23 依頼主の 採用。03_ch3_index）。第3章の クリア前、段階1（正午）。
// S06 の あと（item_c3_map）から S12 の ナリオサメの 前まで。段階2（S13〜S14）は 上の 段に 2人が 来ている。
//
//   1 お昼を 食べたら（干物屋の ホシオ・ホシミ。いつもの〔c1〕の あと、もう 1回 話す〔mikan〕）→ flag_mk_start
//   2 数が ちがう（行く 前に 2人が 言い合う：「25枚！」「20枚！」だけ。干物の 天丼の 形は 使わない）
//   3 上の 段（みかん畑の 作業道の 奥の 石の 段 → 新しい 地図 map_c3_mikan_ue 24×10）。物置で はさみと かご
//   4 枝（大写し：段ごとに 1本、3本。←→で 実を 選んで、けっていで 切る。ちがう 実は 切らない。失敗は ない）
//   5 見晴らし（3本 すんだら 上の 段の ベンチ。大写しで 町の 屋根、港、赤い 灯台、鏡の 海、水平線）
//   6 どっちも（店先へ もどって かごを 見せる：「目安は 20から 25枚。どっちも その 中」）
//   7 ごほうび（朱肉 +2、『青い みかん』2つ、みました帳③の すみ『落とすけえ、甘うなる』）
//   段階2：上の 段に 2人（すんで いれば「もう、落として あった」→「……ほどよう。」。すんで いなければ 地の文だけ）。
//   かくし：しんご（来ていれば、すんだ あと 上の 段で 1回）、ナミエ（青い みかんを 持って、S08 の あと 1回）、
//           3本を まちがえずに 切った（2人の 声が そろう）。
//
// 依頼主の 確かめ（2026-10-23）：仕上げ摘果は 普通温州で 8月下旬〜9月（8月31日で よい）。摘果した 青い 実を
// しぼって 魚に かけるのも 実際に ある（青い みかんと ナミエの 1行は 使って よい）。
// 決まり：地の文・名札に「さん」なし。天丼の 口ぐせは 増やさない（「干しすぎ！」の みかん版も 使わない）。
// 時刻の 数字は 出さない。1ページ 3行 × 336px。

// ================================================================ 1 お昼を 食べたら（〔mikan〕）

export const MK_A = `@npc_c3_himono_otto
お昼を 食べたら、{w=300}
上の 段の 摘果じゃ
いうて 決めとったのに。
@npc_c3_himono_tsuma
お昼が、{w=300}
ちっとも 終わらん。
@npc_kanenari
てきか？{w=300}
……的に 当てる やつ？
@npc_c3_himono_tsuma
青い うちに、{w=300}
実を 落とすんよ。
/
みかん畑の いちばん 上。{w=300}
作業道の 奥の、
石の 段から 上がるんよ。
@npc_c3_himono_otto
しゅん、{w=300}
行って くれるか。
はさみは 物置じゃ。`;

// ================================================================ 2 数が ちがう

export const MK_KAZU = `@npc_c3_himono_otto
葉っぱ 25枚に、{w=300}
実 1つ！
@npc_c3_himono_tsuma
20枚に 1つ！
@npc_c3_himono_otto
25枚！
@npc_c3_himono_tsuma
20枚！
@npc_kanenari
……どっちに {w=300}
したら ええねん。
@c3_himono_futari
小さいのと、{w=300}
傷の あるのと、
上を 向いた 大きいの。
@npc_kanenari
そこは {w=300}
そろうんかい。`;

/** 〔mikan〕の あと、すむ 前に 話す。 */
export const MK_MADA = `@npc_c3_himono_otto
小さいのと、傷のと、{w=300}
上を 向いた 大きいの。
@npc_c3_himono_tsuma
段ごとに 1本で ええけえ。`;

// ================================================================ 3 上の 段

export const MK_IN = `@narr
段々の いちばん 上。{w=300}
青い 実が、
木いっぱい。`;

export const MK_IN_KN = `@npc_kanenari
せっかく {w=300}
なっとるのに、
落とすん？`;

export const MK_MONOOKI = `@narr
はさみと、かご。{w=300}
麦わら帽子が 2つ。
『{name:npc_c3_himono_otto}』『{name:npc_c3_himono_tsuma}』。
@sys
摘果ばさみと かごを
借りた。`;

export const MK_MONOOKI_AGAIN = `@narr
麦わら帽子が 2つ。{w=300}
『{name:npc_c3_himono_otto}』『{name:npc_c3_himono_tsuma}』。`;

/** 段階2（2人が 帽子を かぶって 来ている）。 */
export const MK_MONOOKI_C2 = `@narr
帽子かけが 2つ、{w=300}
からっぽ。`;

export const MK_FURUKI = `@narr
いちばん 古い 木。{w=300}
幹に 名札が 2枚。
/
かたい 字と、{w=300}
丸い 字。
@npc_kanenari
ここでも {w=300}
言い合うとったんやな。`;

export const MK_DRUM = `@narr
雨水。{w=300}
みかんに やる 水。`;

export const MK_BENCH = `@narr
丸太の ベンチ。{w=300}
町の ほうを 向いている。`;

/** ふつうの 木（枝の 木 いがい）。 */
export const MK_KI = `@narr
青い 実が、{w=300}
葉の かげに
ぎっしり。`;

/** はさみを 借りる 前に 枝の 木を 調べた。 */
export const MK_KI_HASAMI = `@narr
落とす 実が ある。{w=300}
……はさみは、物置だ。`;

/** グソっ君が 葉を 数える（はじめて 枝を 開く 前に 1回）。 */
export const MK_KAZOERU = `@npc_kanenari
1、2、3……{w=300}
/
……わい、足と 合わせても
14まで しか
数えられへん。`;

// ================================================================ 4 枝（大写し）

export const MK_RULE = `@sys
←→ で 実を 選んで、{w=300}
けってい で 切る。
/
1本の 枝で、
落とすのは 1つ。`;

/** 段ごとの はじめの 1行（下・中・上）。 */
export const MK_EDA_HINT: string[] = [
  `@narr
下の 段の 枝。{w=300}
1つだけ、小さい 実。`,
  `@narr
中の 段の 枝。{w=300}
1つだけ、茶色い すじ。`,
  `@narr
上の 段の 枝。{w=300}
1つだけ、上を 向いた
大きい 実。`,
];

export const MK_PACHIN = `@narr
ぱちん。{w=300}
……青い 実が、
かごに 落ちた。`;

/** 下を 向いた ふつうの 実を 選んだ（切らない）。 */
export const MK_IIKAO = `@npc_kanenari
それは {w=300}
ええ 顔 しとるで。`;

/** 上の 段の 上向きの 大きい 実（切る 前）。 */
export const MK_ERASOU = `@npc_kanenari
いちばん 大きいのに？{w=300}
いちばん えらそうに
しとるのに？`;

export const MK_NOKOTTA = `@narr
下を 向いた 実だけが、{w=300}
残った。`;

/** 3本 すんだ。 */
export const MK_SANBON = `@npc_kanenari
3本 すんだ。{w=300}
……ちょっと、
座っていかへん？`;

/** もう 切った 枝。 */
export const MK_EDA_DONE = `@narr
下を 向いた 実が、{w=300}
ならんでいる。`;

// ================================================================ 5 見晴らし（ベンチ、大写し）

export const MK_MIHARASHI = `@narr
町の 屋根の 向こうに、{w=300}
止まった 海が、
空まで つづいている。
@npc_kanenari
2人とも、{w=300}
毎年 ここで
昼から 落としとったんか。
/
……ええ 席や。`;

export const MK_MIHARASHI_AGAIN = `@narr
町の 屋根と、港と、{w=300}
鏡の 海。`;

/** 段階2 の ベンチ。 */
export const MK_MIHARASHI_C2 = `@narr
海に、{w=300}
波が 寄せている。`;

// ================================================================ 6 どっちも（店先）

export const MK_DOCCHI = `@sys
かごを 見せた。
@npc_c3_himono_otto
……25枚に 1つ {w=300}
くらいじゃな。
@npc_c3_himono_tsuma
20枚に 1つ {w=300}
くらいじゃね。
@npc_kanenari
おんなじ かご {w=300}
見とるやん。
@npc_c3_himono_tsuma
目安は、{w=300}
20から 25枚に 1つ。
/
どっちも、{w=300}
その 中なんよ。
@npc_c3_himono_otto
木に よるけえ。{w=300}
……どっちも 合っとる。
@npc_kanenari
ほな、{w=300}
なんで 言い合うとるん。
@npc_c3_himono_otto
……言い合うのが、{w=300}
うちらの 摘果じゃ。
@npc_c3_himono_tsuma
落とすけえ、{w=300}
残りが 甘うなる。
@npc_c3_himono_otto
……そこは、{w=300}
同じじゃ。`;

/** かくし：3本を まちがえずに 切った（1回）。 */
export const MK_SOROU = `@c3_himono_futari
…………{w=300}
ほどよい。
@narr
2人の 声が、そろった。`;

export const MK_REWARD = `@sys
朱肉が 2 ふえた。
『青いみかん』を
2つ もらった。
/
みました帳③の すみに、
『落とすけえ、甘うなる』の
ページ。`;

/** すんだ あと（店先、段階1）。 */
export const MK_AFTER = `@npc_c3_himono_tsuma
落とすけえ、{w=300}
残りが 甘うなる。
@npc_c3_himono_otto
……そこは、同じじゃ。`;

// ================================================================ 段階2（12:01）

export const MK_C2_DONE = `@npc_c3_himono_otto
お昼が 終わったけえ、{w=300}
来たら……
@npc_c3_himono_tsuma
もう、{w=300}
落として あった。
@c3_himono_futari
……ほどよう。`;

export const MK_C2_MADA = `@narr
{name:npc_c3_himono_otto}と {name:npc_c3_himono_tsuma}が、{w=300}
言い合いながら
実を 落としている。`;

/** 段階2、話した あと。 */
export const MK_C2_AGAIN = `@npc_c3_himono_otto
25枚！
@npc_c3_himono_tsuma
20枚！
@narr
はさみは、休まない。`;

// ================================================================ かくし

/** しんご（来ていれば、すんだ あと 上の 段で 1回）。 */
export const MK_SHINGO = `@npc_ojii
落とすのか……{w=300}
おれ、見て
られないよ。
@narr
しんごは、木の 下に
落ちていた 青い 実を
ひろって、かじった。
@npc_ojii
すっぱ！{w=300}
……でも、夏の
味だな。
@npc_kanenari
……ええ 顔 {w=300}
しとるで。`;

/** 食堂かもめの ナミエ（青い みかんを 持って、S08 の あと 1回）。 */
export const MK_NAMIE = `@npc_c3_shokudo
青い みかん？{w=300}
魚に しぼると、
さっぱり するんよ。`;

// ================================================================ 入口（町の 作業道の 奥）

export const MK_DAN = `@narr
クロマツの あいだに、{w=300}
石の 段が 3段。
上にも、みかん畑。`;

/** 段階3 から 先・クリア後（入れない）。 */
export const MK_DAN_YASUMI = `@narr
石の 段の 上に、札。{w=300}
『本日 休み』。`;

// ================================================================ 大写し・持ち物・帳面

export const MK_UI = {
  eda: '枝',
  miharashi: '上の 段から',
  keys: ['←→ 選ぶ', 'けってい 切る'],
  dan: ['下の 段', '中の 段', '上の 段'],
  kago: (n: number) => `かご ${n}/3`,
};

export const MK_ITEM_DESC: [string, string] = ['しぼると、すっぱい。魚に かける。', 'HPを 20 回復。'];

/** みました帳③の すみの 1ページ（ui/menu/book_mikan.ts）。 */
export const MK_BOOK = {
  title: '落とすけえ、甘うなる',
  fuda: ['かたい 字', '丸い 字'],
  quote: ['落とすけえ、', '残りが 甘うなる。'],
  meyasu: '葉 20〜25枚に 実 1つ',
};

export const MK_TEXTS: Record<string, unknown> = {
  MK_A, MK_KAZU, MK_MADA, MK_IN, MK_IN_KN, MK_MONOOKI, MK_MONOOKI_AGAIN, MK_MONOOKI_C2, MK_FURUKI, MK_DRUM, MK_BENCH,
  MK_KI, MK_KI_HASAMI, MK_KAZOERU, MK_RULE, MK_EDA_HINT, MK_PACHIN, MK_IIKAO, MK_ERASOU, MK_NOKOTTA, MK_SANBON,
  MK_EDA_DONE, MK_MIHARASHI, MK_MIHARASHI_AGAIN, MK_MIHARASHI_C2, MK_DOCCHI, MK_SOROU, MK_REWARD, MK_AFTER,
  MK_C2_DONE, MK_C2_MADA, MK_C2_AGAIN, MK_SHINGO, MK_NAMIE, MK_DAN, MK_DAN_YASUMI,
};
