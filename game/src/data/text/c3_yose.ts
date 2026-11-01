// 海の 水で 寄せる（げむきか 10/19 の 案1、2026-10-19 依頼主の 採用。03_ch3_index 28）。第3章の クリア前、段階1
// （正午）。くま吉（★。1便目で 必ず 来る）が あぜ道市の 豆腐の 屋台 (27,3) に 来てから、S09 で 潜れるように なって
// から（flag_ch3_kaisui_start）、S12 の ナリオサメの 前まで。くま吉は 今の 到着の 台詞の あと、2回目に 話すと〔yose〕。
//
//   1 にがり、忘れた（〔yose〕）→ 空きびん item_c3_akibin、flag_yd_start
//   2 ロープを たどる（海水浴場の 底の 南の はし (40,12) の 岩の すき間。監視台の カイトに 1回）
//   3 沖の ブイの 下（新しい 地図 map_c3_umi_oki、24×12）：ブイの 鎖で 水を くむ（flag_yd_kumu）。沖の 物 4つ
//   4 ひと回し（大写し「なべの 中」：←→ で びんを 傾けて 入れる、けっていで 木べらを 1回 大きく 回す）
//   5 しょうゆ、いらん → 6 ごほうび（海の 寄せ豆腐 item_c3_yosedofu、朱肉 +2、みました帳③の すみ『海の 寄せ豆腐』）
//   段階2（12:01）：くんで いなければ くま吉「……海が 動いたら、水を くむのは、また こんど。」（flag_yd_end）。
//   S13：防波堤の ござに、くま吉の 前の 寄せ豆腐の 鉢（絵の 差分。台詞は 足さない）。
//
// リードの 決め（2026-10-19）：止まった 正午の あいだに 豆腐が 固まって よい（人は 動ける。止まっているのは 時計と 日）。
// 海の 水と 豆乳の 割合の 数字は 台詞に 出さない。沖の きれいな 水を くむ わけ（港の 中の 水は 使わない）は 1行。
// 沖縄の 島豆腐の 話は くま吉の「南の 島じゃ、昔から 海の 水で 寄せるんだい」程度に 1回。
// 決まり：地の文・名札に「さん」なし。天丼の 口ぐせ（ほどよいなぁ・ピッ！）は 使わない。1ページ 3行 × 336px。
// 9.4 の〔深い所のはし〕の においの 話は しない（沖の 南の はしは「今日は、ブイまでや」だけ）。

// ================================================================ 1 にがり、忘れた

export const YD_A = `@npc_mamekichi
まいど！{w=300}
海の 町で、寄せ豆腐を
作って 見せようと 思って。
/
豆乳は、持ってきた。{w=300}
なべも ある。火も ある。
/
……にがり、忘れた！{w=300}
まいど！
@npc_kanenari
まいど ちゃうやろ！
@npc_mamekichi
にがりってのは、{w=300}
海の 水から 塩を とった
残りの 苦い 水だい。
/
南の 島じゃ、昔から {w=300}
海の 水で、そのまま
寄せるんだい。
@npc_kanenari
海の 水なら、{w=300}
目の 前に ようけ あるで。
@npc_mamekichi
港の 水は だめだい。{w=300}
船の 油が 浮いてる。
……沖の、きれいなのを。
@npc_kanenari
沖なら、{w=300}
わいの 出番や。`;

export const YD_GET_BIN = `@sys
空きびんを あずかった！`;

/** くむ 前に もう一度（1回。そのあとは 今の 台詞）。 */
export const YD_WAIT = `@npc_mamekichi
沖の 水だい。{w=300}
港の 中のは、だめだぞ。`;

/** グソっ君が いない とき（隊列に いない）。 */
export const YD_NO_KN = `@npc_mamekichi
まいど！{w=300}
……沖の 水が あれば、
なあ。`;

// ================================================================ 2 ロープを たどる

/** 海水浴場の 底の 南の はしの 岩の すき間（びんを 持っている とき 1回）。 */
export const YD_ROPE = `@narr
ロープの 先が、{w=300}
岩の すき間の 向こうへ
のびている。
@npc_kanenari
ブイの とこまで、{w=300}
歩いて 行けそうや。`;

/** 監視台の カイト（陸。びんを 持っている とき、くむ 前に 1回）。 */
export const YD_KAITO = `@npc_c3_kanshiin
ブイの 外は、{w=300}
泳いだら いけません！
@npc_kanenari
歩くんや。
@npc_c3_kanshiin
……歩くのは、{w=300}
決まりに ありません。`;

// ================================================================ 3 沖の ブイの 下

export const YD_OKI_IN = `@narr
白い 砂が、{w=300}
ずっと 向こうまで
続いている。
@npc_kanenari
水が、すうっと {w=300}
青い。……ここの なら、
ええ 豆腐に なるわ。`;

/** 段階2 で 入った（1回）。 */
export const YD_OKI_IN2 = `@npc_kanenari
動いたら、{w=300}
みんな 行ってもうた。`;

/** ブイの 鎖（びんに 水を くむ）。 */
export const YD_KUMU = `@sys
沖の 水を くんだ！
@npc_kanenari
ふた、しっかり。{w=300}
……はさみで しめると、
かたいなあ。`;

/** ブイの 鎖（くんだ あと・びんが ない とき）。 */
export const YD_KUSARI = `@narr
ブイの 鎖。{w=300}
上の ほうに、黄色い
ブイの 影が 見える。`;

export const YD_MO = `@narr
海藻が、{w=300}
ゆらりと 立っている。`;
export const YD_MO2 = `@narr
海藻が、{w=300}
ゆらゆら ゆれている。`;

export const YD_MURE = `@narr
小さな 魚の 群れが、{w=300}
形の まま、
止まっている。
@npc_kanenari
……写真みたいや。`;
export const YD_MURE2 = `@narr
魚の 群れが いた 所。{w=300}
砂の 上に、影だけ
ゆれている。`;

/** 南の はし（1回）。 */
export const YD_DAN = `@narr
砂が、岩の 段で {w=300}
ふっと 切れている。
@npc_kanenari
この 先は、深い。{w=300}
……今日は、ブイまでや。`;
export const YD_DAN2 = `@narr
岩の 段の 先は、{w=300}
青が 濃い。`;

/** 沖の 物 n/4。 */
export function ydOki(n: number): string {
  return `@sys\n沖の 物 ${n}/4`;
}

// ================================================================ 4 ひと回し（屋台に もどる）

export const YD_BACK = `@npc_mamekichi
まいど！{w=300}
……おう、沖の 水だい。
きれいなもんだ。
/
火は、おれが 見る。{w=300}
びんは、まかせた。`;

export const YD_RULE = `@narr
←→で びんを 傾けて、
細く 入れる。{w=300}
けっていで 止める。`;

/** 少なすぎる（もう 1回）。 */
export const YD_SUKUNAI = `@npc_mamekichi
……寄らねえ。{w=300}
もう ちょい。`;

/** 多すぎる（しょっぱい 版で 進む）。 */
export const YD_OOI = `@npc_mamekichi
……しょっぱいぞ！{w=300}
まあ、いいだい。`;

export const YD_MAWASU_RULE = `@npc_mamekichi
木べらで、{w=300}
1回だけ、大きく 回せ。
@narr
けっていで 回す。`;

export const YD_YOSE = `@narr
白い 雲が、{w=300}
なべの 中で 寄りあった。`;

export const YD_OBORO = `@narr
……ぼろぼろに なった。
@npc_mamekichi
これは これで、{w=300}
おぼろ豆腐だい！`;

// ================================================================ 5 しょうゆ、いらん

export const YD_AJI = `@narr
くま吉が、茶わんに
すくった。
@npc_kanenari
……あ、しょっぱい。{w=300}
ちょうど ええ しょっぱさ。`;
export const YD_AJI_SHOPPAI = `@narr
くま吉が、茶わんに
すくった。
@npc_kanenari
……しょっぱっ！{w=300}
でも、うまい。`;

export const YD_SHOYU = `@npc_kanenari
しょうゆ、{w=300}
いらんやん！
@npc_mamekichi
海が、{w=300}
味つけ してくれたんだい。
@narr
くま吉は 茶わんを 持ったまま、
屋台の 向こうの 海を 見た。
@npc_mamekichi
……毎日、にがりを {w=300}
袋から 使ってたけどよ。
親の 顔は、はじめて 見た。
@npc_kanenari
にがりの 親、{w=300}
でっかいなあ。
@npc_mamekichi
畑の 豆と、海の 水。{w=300}
……豆腐は、その あいだで
寄るんだい。
/
まいど。{w=300}
……1回で、いいな。`;

/** かくし：ペロが 来ていて トマトの 屋台に いる（1回）。 */
export const YD_PERO = `@npc_hoshi_mitsu
豆腐に トマト。{w=300}
……1切れ、のせて いけ。
@narr
寄せ豆腐に、トマトが
1切れ のった。`;

/** かくし：祠の きつねの 寄り道を して いる（1回）。 */
export const YD_KITSUNE = `@narr
屋台の 下から、{w=300}
小さな きつねが、
茶わんを のぞいた。
@npc_mamekichi
おめえは、{w=300}
油揚げの ほうだろ。`;

export const YD_REWARD = `@sys
海の 寄せ豆腐を
手に入れた！
/
朱肉が 2 ふえた。
/
みました帳③の すみに、
『海の 寄せ豆腐』の
ページ。`;

/** すんだ あと、くま吉に もう一度（1回。そのあとは 今の 台詞）。 */
export const YD_AFTER = `@npc_mamekichi
まいど！{w=300}
……びんの 水、
少し 残ってるだい。`;

/** 段階2（12:01）に なって、くんで いない（びんは 返す）。 */
export const YD_END = `@npc_mamekichi
……海が 動いたら、{w=300}
水を くむのは、また こんど。
@sys
空きびんを 返した。`;

// ================================================================ 道具・大写し・帳面

export const YD_ITEM_BIN_DESC: [string, string] = ['くま吉の 空きびん。', '沖の 水を くむ。'];
export const YD_ITEM_DOFU_DESC: [string, string] = ['くま吉の 海の 寄せ豆腐。', 'HPを 70 回復。しょうゆは いらない。'];

export const YD_UI = {
  place: 'なべの 中',
  keysPour: ['←→ 傾ける', 'けってい 止める'],
  keysMawasu: ['けってい 回す'],
  mizu: '海の 水',
};

/** みました帳③の すみの 1ページ（ui/menu/book_yose.ts）。 */
export const YD_BOOK = {
  title: '海の 寄せ豆腐',
  dekiLabel: 'でき：',
  deki: { yose: '寄せ', oboro: 'おぼろ', shoppai: 'しょっぱい' } as Record<string, string>,
  oki: (n: number) => `沖の 物 ${n}/4`,
  quote: ['畑の 豆と、', '海の 水。'],
};

export const YD_TEXTS: Record<string, unknown> = {
  YD_A, YD_GET_BIN, YD_WAIT, YD_NO_KN, YD_ROPE, YD_KAITO, YD_OKI_IN, YD_OKI_IN2, YD_KUMU, YD_KUSARI, YD_MO, YD_MO2,
  YD_MURE, YD_MURE2, YD_DAN, YD_DAN2, YD_BACK, YD_RULE, YD_SUKUNAI, YD_OOI, YD_MAWASU_RULE, YD_YOSE, YD_OBORO, YD_AJI,
  YD_AJI_SHOPPAI, YD_SHOYU, YD_PERO, YD_KITSUNE, YD_REWARD, YD_AFTER, YD_END, ydOki: ydOki(4),
};
