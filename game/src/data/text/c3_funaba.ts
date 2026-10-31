// お昼の あとで、こする（げむきか 10/31 の 案1、2026-10-31 依頼主の 採用。03_ch3_index）。第3章の クリア前。
// 段階1（正午）：S06 の あと（flag_ch3_kids）から S12 の ナリオサメの 前まで。〔ぬる〕だけ 段階2（S13 の あと〜S14 の 前）。
//
//   1 お昼の あとの 紙（空き地の 子ども npc_c3_kid_a。いつもの〔c1〕・〔mizukiri〕の あと、もう 1回 話す〔funa〕）
//   2 船揚げ場（港の 倉庫の わきの 岩の 切れ目の 坂 (52,21) → 新しい 地図 map_c3_funaba「船揚げ場」28×14）
//     台車の わきの 紙『昼から こする。塗るのは わし』（うらに『スクリューは わし』）→ 箱の 軍手
//   3 こする（大写し「船の 底」：へさき・まん中・とも・スクリュー を ←→ で 選んで けってい。スクリューは さわらない）
//   4 フジツボの なかま（すんだ あと、落ちた 殻を 調べる。1回）
//   5 〔ぬる〕（段階2：食堂の 前の ゴロウ → 暗転で 船揚げ場。ゴロウが 塗る。子どもは はけを 持たせて もらえない）
//   6 ごほうび（朱肉 +2、みました帳③の すみ）
//
// 調べた 事（出典は $SP/handoff/funaba_progress.md）：
//   ・船底に 貝類などが つくと 船が 遅く なり 燃料が 増える。陸に 揚げて 落とし、船底の 塗料を 塗る（国・県・
//     水産大学校の 資料）。→ 台詞では「何年おき」「塗料の 種類」「落とし方の 決まり」は 言わない。
//   ・フジツボは 貝の ように 見えるが、エビや カニと 同じ 甲殻類（辞書・博物館の 資料）。
//   ・潮が ひくと フジツボは 殻の 口（蓋板）を 閉じて、かわかないように する（海外の 大学の 教材・論文）。
//     → グソっ君の「干上がったら、戸を 閉めるんや」。足で えさを かきこむ 話は 入れない（案の とおり）。
// 案から 変えた 所：
//   ・坂の 入口は 案の (52,24) では なく (52,21)（(52,24)〜(52,25) は 今 浜へ 下りる 石段。倉庫の 東の 路地の 岩に 切れ目）。
//   ・軍手は、こすり おわった ときに 子どもが 箱へ もどす（〔ぬる〕を 見ない 人の 持ち物に 残らない）。
//   ・マサルの 1行は「足が 重うなる」→「歩きにくう なる」（伸びすぎた ひづめで 歩き方が 悪く なる、の 言い方に 寄せた）。
//   ・S23 の グソっ君の 1行（「フジツボも こそげた」）は 足していない（リードと 相談。台本は 変えない）。
// 決まり：地の文・名札に「さん」なし。天丼の 口ぐせは 使わない（ゴロウの「……もう 1杯。」も）。時刻の 数字は 出さない。

// ================================================================ 1 お昼の あとの 紙（子どもの〔funa〕）

export const FB_A = `@npc_c3_kid_a
ゴロウじいの 船、{w=300}
昼から、底を こするって
言いよったんよ。
@npc_c3_kid_b
でも、昼が
終わらんじゃろ。
@npc_c3_kid_c
……ほんなら、
うちらが こすっとこ。
@npc_kanenari
ええ 段取りや。{w=300}
……昼は 終わらんけど。
@npc_c3_kid_a
港の 倉庫の よこ、{w=300}
岩の 切れ目の 坂。
/
下りた 先が、
船揚げ場。{w=300}
先に 行っとるね！`;

/** 坂の 上（はじめて 近づいた とき、1回）。 */
export const FB_SAKA_MIRU = `@narr
岩の 切れ目に、
下りる 坂。{w=300}
札『船揚げ場』。`;

/** 坂（調べる。入れない とき）。 */
export const FB_SAKA_FUDA = `@narr
岩の 切れ目に、{w=300}
下りる 坂。
札『船揚げ場』。`;

export const FB_SAKA_JIKAN = `@narr
今は、寄り道の
時間じゃ ない。`;

// ================================================================ 2 船揚げ場（はじめて）

export const FB_IN = `@narr
レールの 上に、
船が 1そう、
陸に 上がっている。
/
船の 腹に、{w=300}
白い つぶが びっしり。
@npc_c3_kid_a
台車の よこに、{w=300}
ゴロウじいの 紙。`;

/** 台車の わきの 紙（調べる）。 */
export const FB_KAMI = `@narr
『昼から こする。{w=300}
塗るのは わし』。
/
うらにも、字。{w=300}
『スクリューは わし』。`;

export const FB_KAMI_KIDS = `@npc_c3_kid_a
塗るのは、ゴロウじい。{w=300}
うちらは、こするだけ。
/
軍手と ヘラは、
箱の 中。`;

export const FB_GUNTE = `@sys
『軍手』を 借りた。`;

/** 軍手を つけずに 船底を 調べた（何も 起きない）。 */
export const FB_SUDE = `@npc_c3_kid_b
素手は だめ。{w=300}
フジツボで、手を
切るけえ。`;

export const FB_SUDE_SOLO = `@narr
白い つぶは、
とがっている。{w=300}
素手では あぶない。`;

// ================================================================ 3 こする（大写し「船の 底」）

/** 大写しの やり方（はじめての 1回）。 */
export const FB_RULE = `@npc_c3_kid_a
白い つぶは、{w=300}
ヘラで 2回。
緑の ひもは、1回。`;

/** まん中の フジツボの 1つ（1回）。 */
export const FB_KUCHI = `@narr
つぶの 口が、{w=300}
ぴたっと 閉じている。`;

export const FB_KUCHI_KN = `@npc_kanenari
干上がったら、
戸を 閉めるんや。{w=300}
……かしこいな。`;

/** スクリューと 舵（さわらない）。 */
export const FB_SCREW = `@npc_c3_kid_c
そこは さわらんの。{w=300}
ゴロウじいの 紙に、
書いてあった。`;

export const FB_SCREW_SOLO = `@narr
『スクリューは わし』。{w=300}
紙の うらの 字。`;

/** 3つ すんだ（ホースで 流す。自動）。 */
export const FB_HOSE = `@narr
ホースで、{w=300}
海の 水を かけた。
/
船の 腹が、
つるっと した。`;

export const FB_HOSE_KIDS = `@npc_c3_kid_a
軍手、箱に
もどしとこ。
@sys
『軍手』を 箱に もどした。`;

export const FB_HOSE_SOLO = `@sys
『軍手』を 箱に もどした。`;

/** 船の 腹（すんだ あと、段階1）。 */
export const FB_TSURUTTO = `@narr
船の 腹は、{w=300}
つるっと している。`;

// ================================================================ 4 フジツボの なかま（落ちた 殻）

export const FB_KARA = `@narr
落ちた フジツボの 殻。{w=300}
中は、からっぽ。`;

export const FB_NAKAMA = `@npc_c3_kid_b
フジツボって、
貝じゃ ないんよ。{w=300}
先生が 言いよった。
/
エビや カニの、
遠い なかまなんて。
@npc_kanenari
…………
/
……ほな、{w=300}
わい、今 親戚の 家を
こすっとったんか。
@npc_c3_kid_a
もう だれも
住んどらんよ。`;

// ================================================================ 船揚げ場の 物・人

export const FB_KOYA = `@narr
巻き上げ機の 小屋。{w=300}
戸に、鍵が かかっている。
/
太い ワイヤーが、
台車の 方へ
のびている。`;

export const FB_TORYO = `@narr
赤い 塗料の 缶。{w=300}
ふたは、閉まっている。`;

export const FB_TORYO_AKI = `@narr
缶の ふたが、開いている。{w=300}
はけが 1本、
立てかけてある。`;

export const FB_HAKO = `@narr
軍手と ヘラの 箱。`;

export const FB_BAKETSU = `@narr
ホースと、{w=300}
海の 水の バケツ。`;

export const FB_REIRU = `@narr
2本の レールが、{w=300}
海の 中へ
続いている。`;

export const FB_REIRU_TOMARI = `@narr
止まった 海に、{w=300}
レールが 消えていく。`;

export const FB_FUNA_MAE = `@narr
船の 腹に、{w=300}
白い つぶと 緑の ひも。`;

export const FB_FUNA_AKA = `@narr
船の 底が、赤い。{w=300}
まだ、ぬれている。`;

export const FB_FUNA_MADA = `@narr
船の 腹は、つるっと。{w=300}
塗料の 缶は、
まだ 閉まっている。`;

/** 浜の 子ども（段階1）。 */
export const FB_KID = {
  mae: `@npc_c3_kid_a
軍手と ヘラは、
箱の 中。`,
  naka: `@npc_c3_kid_b
白い つぶは、{w=300}
ヘラで 2回。`,
  ato: `@npc_c3_kid_c
あとは、ゴロウじいが
塗るんよ。`,
};

// ================================================================ 段階2：こすって いない とき（ゴロウが 1人で）

export const FB_HITORI = `@narr
ゴロウは、1人で
こすっている。`;

export const FB_HITORI_GORO = `@npc_c3_jouren
……昼から、{w=300}
また 海じゃ。`;

// ================================================================ 5〔ぬる〕（段階2）

/** 食堂かもめの 前の ゴロウ。 */
export const FB_NURU_A = `@npc_c3_jouren
……昼が、{w=300}
すんだ。
/
船を、
塗りに いく。`;

export const FB_NURU = `@narr
ゴロウは、船の 腹を
手の ひらで なでた。{w=600}
@npc_c3_jouren
…………
/
……だれが こすった。`;

export const FB_NURU_UCHIRA = `@c3_kodomotachi
うちら！`;

export const FB_NURU_TO = `@npc_kanenari
と、しゅん。`;

export const FB_NURU_B = `@narr
ゴロウが、缶の ふたを
開けた。
/
赤い 塗料。{w=300}
船の 底の 色だ。
@npc_c3_jouren
底は、だれも 見ん。{w=300}
……海に 入ったら、
見えんけえな。
/
……底を 見る もんが
おるけえ、{w=300}
船は 走る。`;

export const FB_NURU_C = `@narr
ゴロウが、はけを
入れた。{w=300}
1本目の 赤。
@npc_c3_kid_c
……うちも、
塗りたい。
@npc_c3_jouren
塗るのは、わし。
@npc_c3_kid_c
……ちぇっ。`;

export const FB_REWARD = `@sys
朱肉が 2 ふえた。
/
みました帳③の すみに、
『お昼の あとで、こする』の
ページ。`;

/** 塗って いる ゴロウ（〔ぬる〕の あと、船揚げ場に いる あいだ）。 */
export const FB_NURU_GORO = `@npc_c3_jouren
……乾くまで、{w=300}
さわるな。`;

// ================================================================ かくし

/** S08 の 前、食堂の ゴロウ（〔funa〕の あと、1回）。 */
export const FB_GORO_C1 = `@npc_c3_jouren
……昼から、{w=300}
船を こする。`;

export const FB_GORO_C1_KN = `@npc_kanenari
その 昼が、
来んのや。`;

/** 来た マサル（船揚げ場の 帰り、すんだ あと 1回）。 */
export const FB_MASARU = `@npc_hoshi_gen
……牛も、ひづめを
切って やらんと、{w=300}
歩きにくう なる。
/
……足の うらは、{w=300}
だれも 見んけえな。`;

export const FB_MASARU_KN = `@npc_kanenari
船は 底、
牛は 足の うら やな。`;

// ================================================================ 大写し・持ち物・帳面

export const FB_HOWTO = { id: 'funaba', line: '{←→}で 選んで、{Z}で こする', pic: 'lr' as const };

/** 大写しの 字（右の 列）。 */
export const FB_UI = {
  title: '船の 底',
  parts: ['へさき', 'まん中', 'とも', 'スクリュー'],
  nokori: (n: number) => `のこり ${n}`,
  tsuru: 'つるつる',
  sawaranai: 'さわらない',
  keys: ['←→ 場所', 'けってい こする'],
};

export const FB_ITEM_DESC: [string, string] = ['ゴロウの 船の 箱の 軍手。', '少し 大きい。'];

/** みました帳③の すみの 1ページ（ui/menu/book_funaba.ts）。 */
export const FB_BOOK = {
  title: 'お昼の あとで、こする',
  titleLines: ['お昼の あとで、', 'こする'],
  kosuri: (n: number) => `こすった ${n}/3`,
  kata: (n: number) => `付いた 物 ${n}/2`,
  kn: '親戚の 家',
  quote: ['塗るのは わし'],
};

export const FB_TEXTS: Record<string, unknown> = {
  FB_A, FB_SAKA_MIRU, FB_SAKA_FUDA, FB_SAKA_JIKAN, FB_IN, FB_KAMI, FB_KAMI_KIDS, FB_GUNTE, FB_SUDE, FB_SUDE_SOLO,
  FB_RULE, FB_KUCHI, FB_KUCHI_KN, FB_SCREW, FB_SCREW_SOLO, FB_HOSE, FB_HOSE_KIDS, FB_HOSE_SOLO, FB_TSURUTTO,
  FB_KARA, FB_NAKAMA, FB_KOYA, FB_TORYO, FB_TORYO_AKI, FB_HAKO, FB_BAKETSU, FB_REIRU, FB_REIRU_TOMARI,
  FB_FUNA_MAE, FB_FUNA_AKA, FB_FUNA_MADA, FB_KID, FB_HITORI, FB_HITORI_GORO, FB_NURU_A, FB_NURU, FB_NURU_UCHIRA,
  FB_NURU_TO, FB_NURU_B, FB_NURU_C, FB_REWARD, FB_NURU_GORO, FB_GORO_C1, FB_GORO_C1_KN, FB_MASARU, FB_MASARU_KN,
};
