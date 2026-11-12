// 2枚の うず（げむきか 10/19 の 案5、2026-10-19 依頼主の 採用。02_ch2_index #108）。第2章、段階0〜2
// （転回場は 駅前の 明かりが あるので 灯りが なくても 遊べる）。野菜の 配達の あいだは 起きない。
// 転回場の ツガオ便：ポコシャ（荷台の うしろ (45,42)）の 今の 会話の あと、もう 1回 話すと〔uzu〕。
//
//   1 プーン（ポコシャの〔uzu〕）→ flag_uz_start
//   2 まん中から そっと（大写し「2枚の うず」。グソっ君の 1回目は 外側の はしで 折れる。2回目は しゅん）
//   3 折れても 燃える（ヒロスケが マッチ。炎は 吹き消して、先を 赤く）
//   4 置き場所（選ぶ：運転席の 中｜荷台の 上｜窓の 下の 石）→ 窓の 下の 石 (41,43)
//   5 割れたのも（ツガオの 寝言、ポコシャの ひとこと）→ 6 ごほうび（朱肉 +2、みました帳②の すみ『2枚の うず』）
//
// 決まり：第2章の 台詞に 時刻の 数字・「まだ」・第3章の 中身・「いただきます」を 入れない。地の文・名札の 名前に
// 「さん」なし。ツガオは 表の 顔だけ（寝言の「おう」）。天丼の 口ぐせ（さすが 師匠！・焼き芋 食うか？・
// つがおちゃん 寝る〜♪）は 使わない（ポコシャの「……さすが……」は 言いかけて 止める）。子どもは 火を 使わない
// （マッチは ヒロスケ）。山の 上の 夜明け前の 蚊は いて よい（依頼主 2026-10-19）。1ページ 3行 × 336px。

// ================================================================ 1 プーン（ポコシャの〔uzu〕）

export const UZ_A = `@narr
プーン、と {w=300}
小さな 音。
@npc_pokosha
……あ。{w=300}
蚊が、師匠の 窓に。
/
蚊取り線香、{w=300}
燃えて しまって。
……新しいの、あるんですが。
@narr
ポコシャの 手に、{w=300}
重なった 緑の うず巻きが
2枚。
@npc_pokosha
……自分、いつも {w=300}
割って しまうので。
@npc_kanenari
ほな、わいが {w=300}
はずしたる！`;

/** グソっ君が いない とき（しゅんが やる）。 */
export const UZ_A_SOLO = `@narr
しゅんは、うず巻きを
受けとった。`;

// ================================================================ 2 まん中から そっと（大写し）

/** やり方（はじめの 1回）。 */
export const UZ_RULE = `@narr
まん中を つまんで、{w=300}
←→で 少しずつ ねじる。
/
けっていを 長押しすると、{w=300}
2枚の すきまが 広がる。`;

/** グソっ君の 1回目（どうやっても 外側の はしで 折れる）。 */
export const UZ_KN_ORE = `@narr
……ぽきっ。
@npc_kanenari
……はさみ やと、{w=300}
力の 加減が
わからへん。`;

/** グソっ君が いない とき、しゅんの 1回目。 */
export const UZ_SOLO_ORE = `@narr
……ぽきっ。{w=300}
外側の はしが、折れた。`;

/** 2回目は しゅん。 */
export const UZ_SHUN = `@npc_kanenari
しゅん、たのむ。{w=300}
そうっと やで。`;

/** 2回目の でき。 */
export const UZ_SURU = `@narr
するっと、{w=300}
2枚に わかれた。`;
export const UZ_NIHON = `@narr
……2本に なった。`;

/** 急いだ（けっていを 連打した）とき、大写しの 中の ひとこと。 */
export const UZ_ISOGU = `@narr
……ぽきっ。`;

// ================================================================ 3 折れても 燃える

/** かくし：しゅんが 1回で「するっと」（1回）。 */
export const UZ_SASUGA = `@npc_pokosha
……さすが……
@npc_kanenari
……さすが、なんや？
@npc_pokosha
……なんでも ないです。`;

export const UZ_MOERU = `@npc_kanenari
……これ、もう {w=300}
あかんか。
@npc_hirosuke
ども！{w=300}
……いや、燃える 燃える。
/
折れても、{w=300}
短う なる だけよ。
@npc_pokosha
…………`;

/** グソっ君が いない とき。 */
export const UZ_MOERU_SOLO = `@npc_hirosuke
ども！{w=300}
折れたのも、燃える 燃える。
/
折れても、{w=300}
短う なる だけよ。
@npc_pokosha
…………`;

export const UZ_MATCH = `@narr
先が、赤く なった。{w=300}
ヒロスケは、炎を
ふっと 吹いて 消した。
@npc_hirosuke
炎は 消す。{w=300}
先が 赤けりゃ、
ひと晩 もつ。`;

// ================================================================ 4 置き場所

export const UZ_OKU = `@npc_hirosuke
ほい、線香立て。{w=300}
どこに 置く？
? 運転席の 中 | 荷台の 上 | 窓の 下の 石`;

/** 運転席の 中・荷台の 上（もう 1回）。 */
export const UZ_OKU_NG = `@npc_hirosuke
火の もんは、{w=300}
車の 中には 置かん！
……燃える もんが ようけ ある。`;

export const UZ_OKU_ISHI = `@narr
白い 煙が、{w=300}
まっすぐ 上がっていく。`;

// ================================================================ 5 割れたのも

export const UZ_NEGOTO = `@narr
プーン、が {w=300}
遠く なった。
@npc_tsugao
……おう……{w=300}
しゅん……
@npc_kanenari
寝とっても、{w=300}
『おう』なんか！
@npc_hirosuke
わはは！{w=300}
師匠は、夢の 中でも
配達しよるけえ。`;

/** グソっ君が いない とき。 */
export const UZ_NEGOTO_SOLO = `@narr
プーン、が {w=300}
遠く なった。
@npc_tsugao
……おう……{w=300}
しゅん……
@npc_hirosuke
わはは！{w=300}
師匠は、夢の 中でも
配達しよるけえ。`;

export const UZ_WARETA = `@narr
ポコシャは、折れた うずを
手に とった。
@npc_pokosha
……これも、{w=300}
燃やして いいですか。
@npc_hirosuke
おう。{w=300}
あしたの ぶんよ。
@npc_pokosha
……割れたのも、{w=300}
ちゃんと 燃えるんですね。
@npc_piichan
コケ。`;

/** かくし：上へ 降る 雪（flag_mg_done）が すんでいる（1回）。 */
export const UZ_MG = `@npc_pokosha
……自転車の、{w=300}
空気の ときも。
……ありがとう ございました。`;

/** かくし：野菜の 配達（flag_ch2_delivery）を すませている（1回）。 */
export const UZ_DELI = `@npc_hirosuke
配達の あとの 線香は、{w=300}
ええ においじゃろ。`;

export const UZ_REWARD = `@sys
朱肉が 2 ふえた。
/
みました帳②の すみに、
『2枚の うず』の
ページ。`;

// ================================================================ すんだ あと

/** 窓の 下の 石（すんだ あと）。 */
export const UZ_ISHI_AFTER = `@narr
うずの 形の 灰。{w=300}
白い 煙が、まっすぐ。`;

/** 窓の 下の 石（はじめる 前）。 */
export const UZ_ISHI_BEFORE = `@narr
運転席の 窓の 下の、
平らな 石。`;

/** すんだ あと、ポコシャに もう一度（1回）。 */
export const UZ_POKO_AFTER = `@npc_pokosha
……あ。{w=300}
蚊、来なく なりました。`;

// ================================================================ 帳面・大写し

export const UZ_UI = {
  place: '2枚の うず',
  keys: ['←→ ねじる', 'けってい 長押し'],
  kn: 'グソっ君',
  shun: 'しゅん',
};

/** みました帳②の すみの 1ページ（ui/menu/book_uzu.ts）。 */
export const UZ_BOOK = {
  title: '2枚の うず',
  how: { suru: 'するっと', nihon: '2本' } as Record<string, string>,
  label: 'はずし方：',
  quote: ['……割れたのも、', 'ちゃんと', '燃えるんですね。'],
};

export const UZ_TEXTS: Record<string, unknown> = {
  UZ_A, UZ_A_SOLO, UZ_RULE, UZ_KN_ORE, UZ_SOLO_ORE, UZ_SHUN, UZ_SURU, UZ_NIHON, UZ_ISOGU, UZ_SASUGA, UZ_MOERU,
  UZ_MOERU_SOLO, UZ_MATCH, UZ_OKU, UZ_OKU_NG, UZ_OKU_ISHI, UZ_NEGOTO, UZ_NEGOTO_SOLO, UZ_WARETA, UZ_MG, UZ_DELI,
  UZ_REWARD, UZ_ISHI_AFTER, UZ_ISHI_BEFORE, UZ_POKO_AFTER,
};
