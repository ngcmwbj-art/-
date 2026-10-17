// ええ 色の わけ（げむきか 10/16 やり直しの 案5、2026-10-16 依頼主の 採用。02_ch2_index #103）。
// 寄り合いの あと、ぴょん夫人の お茶うけの ナスの 漬物が、はっとするほど 紫。区長の 家の 漬物の おけを のぞくと、
// ナスの 間に さびた 釘が 3本。ハモ区長は「遺憾ながら」と 式辞の 口調、ぴょん夫人は 笑う——ナスは 古い 鉄と
// 漬けると 紫が 残る。50年 食べてきた 区長は はじめて 知る。そのあと 漬物の 色あわせ（大写し「漬物の 色」）。
//
//   1 紫の ナス（集会所。ぴょん夫人の お茶の あと 1回。お茶を 1回 飲んでから）→ flag_ir_nasu
//   2 さびた 釘（区長の 家の 漬物の おけ。今の 文の あと）→ 大事なもの『さびた 釘』（flag_ir_kugi）
//   3 遺憾ながら・4 色止め（集会所の ハモ区長に 見せる）→ flag_ir_ikan
//   5 色あわせ（大写し。ナス＝さびた 釘、みょうが＝お酢、梅干し＝赤じそ）→ flag_ir_awase
//   6 さびた もん（名場面）・7 ごほうび（朱肉 +2、みました帳②の すみ『ええ 色の わけ』、釘は おけへ）→ flag_ir_done
//
// 決まり：第2章の 台詞に 時刻の 数字・「まだ」・第3章の 中身を 入れない（「50年」「3本」は 年と 本数）。
// 地の文・名札の 名前に「さん」なし（グソっ君の「区長さん」は 呼び方）。グソっ君は 関西弁・「わい」・敬語なし。
// 1ページ 3行 × 336px（textcheck2 と irText）。表示名は hoshi_npcs.ts（ぴょん夫人・ハモ区長）。
// 事実（リードの 確認）：ナスの 紫（ナスニン）は 鉄で 色が 落ちにくく なる。みょうがは 酢で 赤く なる。
// 梅干しの 赤は 赤じそ。釘は 50年の 話なので さびた 古釘、今は 鉄の 玉を 使う 家も ある（ぴょん夫人の 1行）。

// ================================================================ 1 紫の ナス

export const IR_NASU_A = `@narr
お茶うけの 皿に、{w=300}
ナスの 漬物。`;

/** 段階1（トマトの 灯りが 皿に 当たる）：IR_NASU_A の あと。 */
export const IR_NASU_H1 = `@npc_kanenari
紫に、夕焼けが
まざった。`;

export const IR_NASU_B = `@npc_kanenari
この ナス、{w=300}
えらい ええ 紫やな。
@npc_hoshi_yoshie
ええ 色じゃろ。{w=300}
……ないしょ。
@npc_kanenari
ないしょ、言われたら
気に なるやん。
@npc_hoshi_yoshie
おけを 見たら、{w=300}
わかるかもね。`;

// ================================================================ 2 さびた 釘

/** 今の 文（obj_hr_kucho_tsukemono）の あと、紫の ナスを 見ていれば。 */
export const IR_OKE_KUGI = `@narr
おけの ふたを
少し ずらした。{w=300}
紫の ナスが ならんでいる。
/
ナスの 間に、{w=300}
さびた 釘が 3本。
@npc_kanenari
釘 入っとる！{w=300}
……事件や！`;

/** かくし：先に 区長の 家の 額の 写真（obj_hr_kucho_yuki）を 見ている。 */
export const IR_OKE_YUKI = `@npc_kanenari
花嫁さんの 写真の
家の 釘や。`;

export const IR_OKE_MOTTEKO = `@npc_kanenari
しゅん、1本 持ってこ。{w=300}
区長さんに 言わな。`;

/** グソっ君が いない とき（IR_OKE_MOTTEKO の かわり）。 */
export const IR_OKE_SOLO = `@narr
……1本、区長に
見せて みよう。`;

export const IR_GET_KUGI = `@sys
『さびた 釘』を 1本 持った。`;

/** 釘を 持っている 間の おけ（今の 文の あと）。 */
export const IR_OKE_WAIT = `@narr
ナスの 間に、{w=300}
釘が 2本 残っている。`;

/** すんだ あとの おけ（今の 文の かわり。区長の 字）。 */
export const IR_OKE_AFTER = `@narr
重しの 石に『ぴょん』。{w=300}
その 下に、えんぴつで
小さく『感謝』。`;

// ================================================================ 3 遺憾ながら（集会所。ハモ区長に 見せる）

export const IR_IKAN = `@npc_hoshi_kucho
えー、{w=300}
本日は、遺憾ながら、
わが家の おけより……
/
えー、さびた 釘が、{w=300}
3本 発見 されまして
ございます。
@npc_hoshi_yoshie
あんた、{w=300}
それ、50年 食べとるのよ。
@npc_hoshi_kucho
えー……{w=600}`;

// ================================================================ 4 色止め（ぴょん夫人。続けて）

export const IR_IRODOME = `@npc_hoshi_yoshie
ナスはね、{w=300}
古い 鉄と 漬けると、
紫が 抜けんのよ。
/
釘は、よう 洗って、{w=300}
火で あぶってから
入れるの。
/
おばあちゃんの
代からの 釘よ。
/
今は、鉄の 玉を
入れる 家も 多いけどね。
@npc_kanenari
釘が、{w=300}
ナスの 色を
守っとったんか。
@npc_hoshi_kucho
えー……{w=300}
50年、釘で
ございましたか。
@npc_kanenari
区長さん、{w=300}
釘 食うて
長生きしとるで。
@npc_hoshi_yoshie
食べとらんよ。`;

// ================================================================ 5 色あわせ（大写し「漬物の 色」）

export const IR_AWASE_RULE = `@npc_hoshi_yoshie
ほかの 漬物も、{w=300}
色の もとが あるの。
……当てて ごらん。`;

/** ナスに『さびた 釘』（さっき 聞いた 所。短く）。 */
export const IR_AWASE_NASU = `@npc_hoshi_yoshie
そう。{w=300}
ナスは、釘。`;

export const IR_AWASE_MYOGA = `@npc_hoshi_yoshie
みょうがは、{w=300}
お酢に つけると、
ほんのり 桃色に なるの。
@npc_kanenari
すっぱいと、{w=300}
赤くなるんか。
……照れとるんやな。`;

export const IR_AWASE_UME = `@npc_hoshi_yoshie
梅は、もとは 黄色。{w=300}
赤じその 色が、
梅の 汁で 赤く 出るの。`;

/** まちがえた（何回でも やりなおせる）。 */
export const IR_AWASE_MISS = `@npc_hoshi_yoshie
ええ 線よ。{w=300}
……もう ひと声。`;

/** 大写しを やめた（集会所の ぴょん夫人か 区長に 話すと 続き）。 */
export const IR_AWASE_STOP = `@npc_hoshi_yoshie
ええよ。{w=300}
皿は、ここに 置いとくけえ。`;

/** やめた あとの 続き（ぴょん夫人か 区長に 話す）。 */
export const IR_AWASE_AGAIN = `@npc_hoshi_yoshie
続き、やるかね。{w=300}
……当てて ごらん。`;

/** かくし：野菜の 配達で ぴょん夫人に きゅうりを 運んでいる（色あわせの あと）。 */
export const IR_KYURI = `@npc_hoshi_yoshie
あんたの きゅうりは、{w=300}
色の もと なし。
そのままで ええ 色。`;

// ================================================================ 6 さびた もん（名場面）

export const IR_SABITA = `@npc_hoshi_yoshie
ええ 色は、{w=300}
さびた もんが
出すのよ。
@narr
ハモ区長が、{w=300}
自分の 頭を
なでた。
@npc_hoshi_kucho
えー……{w=300}
それは、わしの ことで
ございますか。
@npc_hoshi_yoshie
……ええから、{w=300}
お茶 飲みなさい。
@npc_kanenari
答え、{w=300}
言わへんのかい。`;

/** かくし：段階2 に「さびた もん」まで すませた（放送が ゆきちゃんを 呼んでいる）。 */
export const IR_YUKI = `@narr
放送が『ゆきちゃん』と
呼んでいる。
@npc_hoshi_yoshie
ゆきが 嫁に 行く とき、{w=300}
釘を 3本、
持たせたのよ。
/
……あっちの ナスも、{w=300}
ええ 色じゃろ。`;

// ================================================================ 7 ごほうびと そのあと

export const IR_REWARD = `@narr
釘は、おけに もどった。
@sys
朱肉が 2 ふえた。
/
みました帳②の すみに、
『ええ 色の わけ』の ページ。`;

/** IR_YUKI の あと（段階2 の かくし）。 */
export const IR_REWARD_YUKI = `@sys
ぴょん夫人が、
もう 1ページ 足した。`;

/** すんだ あとの ぴょん夫人（お茶の あと、1回）。 */
export const IR_YOSHIE_AFTER = `@npc_hoshi_yoshie
釘は、おけに
もどしたけえね。{w=300}
……ないしょよ。`;

/** すんだ あとの ハモ区長（1回）。 */
export const IR_KUCHO_AFTER = `@npc_hoshi_kucho
えー、本日より、{w=300}
漬物には、一礼して から
食べる ことに いたします。`;

// ================================================================ 区長の 家の びんと かめ（R2_OBJ の 文。色あわせの ヒント）

export const IR_MYOGA_TEXT = `@narr
ガラスの びんに、{w=300}
うす桃色の みょうが。
……つんと、すっぱい におい。`;

export const IR_UMEKAME_TEXT = `@narr
梅干しの かめ。{w=300}
ふたを とると、
赤い 葉っぱが のぞいた。`;

// ================================================================ 大写しの 字（札・皿・ボタン）

export const IR_UI = {
  place: '漬物の 色',
  plates: ['ナス', 'みょうが', '梅干し'],
  cards: ['さびた 釘', 'お酢', '赤じそ'],
  keys: ['↑↓ 札', 'けってい 置く', 'もどる やめる'],
};

/** みました帳②の すみ『ええ 色の わけ』と、段階2 の かくしの ページ『ゆきの 釘』。 */
export const IR_BOOK = {
  title: 'ええ 色の わけ',
  rows: [
    ['ナス', '紫', 'さびた 釘'],
    ['みょうが', '桃色', 'お酢'],
    ['梅干し', '赤', '赤じそ'],
  ] as [string, string, string][],
  count: '漬物の 色',
  eeme: '『ええ 目』',
  yukiTitle: 'ゆきの 釘',
  yuki: ['嫁に 行く とき、', '釘を 3本。', 'あっちの ナスも、', 'ええ 色。'],
};

export const IR_ITEM_KUGI_DESC: [string, string] = ['漬物の おけに 入っていた。', 'よく 洗ってある。'];

/** 文の検査（irText・debug の walk）に出す物。 */
export const IR_TEXTS: Record<string, unknown> = {
  IR_NASU_A, IR_NASU_H1, IR_NASU_B, IR_OKE_KUGI, IR_OKE_YUKI, IR_OKE_MOTTEKO, IR_OKE_SOLO, IR_GET_KUGI, IR_OKE_WAIT,
  IR_OKE_AFTER, IR_IKAN, IR_IRODOME, IR_AWASE_RULE, IR_AWASE_NASU, IR_AWASE_MYOGA, IR_AWASE_UME, IR_AWASE_MISS,
  IR_AWASE_STOP, IR_AWASE_AGAIN, IR_KYURI, IR_SABITA, IR_YUKI, IR_REWARD, IR_REWARD_YUKI, IR_YOSHIE_AFTER, IR_KUCHO_AFTER,
  IR_MYOGA_TEXT, IR_UMEKAME_TEXT,
};
