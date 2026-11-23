// 湯を わかしてから（げむきか 10/18 の 案4、2026-10-18 依頼主の 採用。02_ch2_index #106）。第2章。
// シゲじいと スギばあの 家の 目覚まし時計 2つ（今の 文「起きる 気は あった らしい」）と、茶だんすの 横の 貼り紙
// 『とうもろこしは、湯を わかしてから もぎに 行く』。とうもろこしは もいだ とたんに 甘いのが 逃げて いくので、
// 湯を わかしてから 走って もぐ。スギばあが 湯を わかし、シゲじいが 走る。70年。
//
//   1 逆 ちゃうんか（貼り紙。h0〜）→ flag_yw_hari。目覚まし時計の 2回目に 1ページ（flag_yw_tokei）
//   2 走る 係（集会所の ぴょん夫人。h1〜h2）→ 3 湯が わく（お茶の 台の こんろに 大なべ。flag_yw_nabe → flag_yw_waita）
//   4 朝どり（新しい 地図 map_hoshi_ura_hata「裏の とうもろこし畑」。家の 東の 壁の 裏口から）：15株、とりごろ 4本の
//     うち 2本を もぐ（flag_yw_moida）→ 帰り道の 歩数で『あまさ』◎○△
//   5 湯気・6 寝言の しりとり・7 ごほうび（ゆでとうもろこし 1つ、朱肉 +2、みました帳②の すみ、無人販売所の 上限 +1）
//     → flag_yw_done
//
// 時期（リードが 調べた 結果、docs/ideas/2026-10-18.md の 末尾）：山の 上は 下より 遅く、8月の 終わりが とりごろ
// （ぴょん夫人の 1行だけ）。とりごろは ひげが 茶色に かれて、先を にぎると 丸い。もぐ ときは 下へ 折る。
//
// 決まり：第2章の 台詞に 時刻の 数字・「まだ」・第3章の 中身・「いただきます」を 入れない（「湯、わいてへんで」
// 「これからの やつや」）。地の文・名札の 名前に「さん」なし（「スギさん」「シゲさん」は ぴょん夫人と ソワカの 呼び方）。
// 1ページ 3行 × 336px（textcheck2 と ywText）。表示名は hoshi_npcs.ts（シゲじい・スギばあ・ぴょん夫人・ソワカ）。
// 寝言しりとり（09-28 の 採用）の 今の 流れは 変えない。しりとりの「……あちゃ〜。」は 2026-09-28 の 依頼主の 例外の とおり。
// 「70年」「2本」「4本」は 年と 本数。

// ================================================================ 1 逆 ちゃうんか（貼り紙）

export const YW_HARIGAMI = `@narr
茶だんすの 横に 貼り紙。{w=300}
『とうもろこしは、湯を
わかしてから もぎに 行く』
@npc_kanenari
湯を わかしてから？{w=300}
もぐ 前に？
/
ふつう、逆 ちゃうんか。`;

/** 2回目から。 */
export const YW_HARIGAMI_AGAIN = `@narr
『とうもろこしは、湯を
わかしてから もぎに 行く』{w=300}
……スギばあの 字。`;

/** 目覚まし時計の 2回目（貼り紙を 読んだ あと。今の 文の あと）。 */
export const YW_TOKEI = `@narr
目覚まし時計が 2つ。{w=300}
同じ 時刻で、
となりあって 止まっている。
@npc_kanenari
2人で、いっしょに
起きる つもり やったんや。`;

/** 裏口（勝手口）。段階0、灯りが ない とき。 */
export const YW_URA_DARK = `@narr
勝手口の 木の 戸。{w=300}
外は、畑 らしい。
@npc_kanenari
暗うて、{w=300}
足もとが 見えへん。`;

/** 裏口。灯りは あるが、湯が わく 前。 */
export const YW_URA_SHUT = `@narr
勝手口の 木の 戸。{w=300}
外は、畑 らしい。`;
export const YW_URA_SHUT_KN = `@npc_kanenari
貼り紙、{w=300}
湯を わかしてから、やで。`;

// ================================================================ 2 走る 係（ぴょん夫人）

export const YW_YOSHIE_A = `@npc_hoshi_yoshie
ああ、スギさんの 貼り紙。{w=300}
とうもろこしはね、
/
もいだ とたんに、{w=300}
甘いのが 逃げて いくんよ。
/
じゃけえ、湯を ぐらぐら
させてから、走って もぐの。{w=300}
朝の 涼しい うちに。
@npc_kanenari
時計が 2つ
あったんは、{w=300}
そういう ことか！
@npc_hoshi_yoshie
スギさんが 湯を わかして、{w=300}
シゲさんが 走るんよ。
……70年。
@npc_kanenari
シゲじいの 足が 速いの、{w=300}
とうもろこしの
おかげやな。
@npc_hoshi_yoshie
山は、下より 遅いけえ。{w=300}
今ごろが、とりごろなんよ。
/
火は、うちが 見とくけえ。{w=300}
あんたらは、走る 係。`;

/** 3 湯が わく（大なべを かける）。 */
export const YW_NABE = `@narr
ぴょん夫人が、お茶の 台の
こんろに 大なべを かけた。
/
なべの 底から、{w=300}
小さな 泡が のぼってくる。`;

/** わく 前に もう一度（お茶の あとに 1ページ）。 */
export const YW_NABE_WAIT = `@npc_hoshi_yoshie
ぐらぐら するまで、{w=300}
もう ひと息。`;

/** わく 前に 集会所を 出ようと した。 */
export const YW_LEAVE_KN = `@npc_kanenari
湯、わいてへんで。{w=300}
……貼り紙、なんて
書いてあった？`;
export const YW_LEAVE_SOLO = `@narr
……湯が わくのを、
待とう。`;

export const YW_WAITA = `@npc_hoshi_yoshie
わいたよ！{w=300}
走りんさい！`;

/** わいた あと、もぐ 前（もう一度 話す）。 */
export const YW_YOSHIE_GO = `@npc_hoshi_yoshie
シゲさんとこの 裏口から、{w=300}
畑に 出られるけえ。`;

// ================================================================ 4 朝どり（裏の とうもろこし畑）

/** はじめて 畑に 出た。 */
export const YW_FIELD_FIRST = `@narr
背の 高い とうもろこしが、{w=300}
3列。
/
灯りの 中で、葉が
さらさら 光っている。{w=300}
……風は ない。`;

/** 段階2 で はじめて 入った（1回）。 */
export const YW_FIELD_H2 = `@npc_kanenari
ここの 畑、{w=300}
かかし おらんな。`;

/** 株を 調べる（湯が わく 前・すんだ あと）。 */
export const YW_KABU_PLAIN = `@narr
とうもろこし。{w=300}
背が、しゅんより 高い。`;

export const YW_KABU_A = `@narr
トマトの 灯りで、{w=300}
株を 照らした。`;

/** 大写しの 見え方。 */
export const YW_TORI = `@narr
ひげが、茶色く
かれている。{w=300}
先を にぎると、丸い。`;
export const YW_HAYAI = `@narr
ひげが、青い。{w=300}
先を にぎると、とがって
やわらかい。`;
export const YW_KAJIRI = `@narr
先が、かじられている。{w=300}
……先に 来た 客が いる。
@npc_kanenari
タヌキか。{w=300}
わいらより、早起きや。`;

export const YW_ASK = `@narr
? もぐ | やめる`;

/** 早い 株を もごうと した。 */
export const YW_HAYAI_KN = `@npc_kanenari
これは、{w=300}
これからの やつや。`;
export const YW_HAYAI_SOLO = `@narr
……これは、
これからの 株だ。`;

export const YW_HOW = `@narr
どっちへ？
? 下へ 折る | 上へ 引っぱる`;
export const YW_UE = `@narr
……びくとも しない。
@npc_kanenari
下や、下！`;
export const YW_POKI = `@narr
ポキッ。`;

export function ywMoida(n: number): string {
  return `@sys\nとうもろこし ${n}/2`;
}

export const YW_GOT2 = `@sys
もいだ とうもろこしを
2本 手に 入れた！`;
export const YW_RUN_KN = `@npc_kanenari
走るで！{w=300}
甘いのが 逃げる！`;
export const YW_RUN_SOLO = `@narr
……走ろう。{w=300}
甘いのが 逃げる。`;

/** 2本 もいだ あと、のこりの とりごろ。 */
export const YW_ENOUGH = `@narr
2本で、じゅうぶん。`;

/** もいだ あとの 株。 */
export const YW_MOIDA_ATO = `@narr
茎だけが、{w=300}
残っている。`;

/** 物置（ざると 手ぬぐい）。 */
export const YW_KOYA = `@narr
物置。{w=300}
ざると、手ぬぐいが
かけてある。
@npc_kanenari
もいだ のを、{w=300}
入れる ざるや。`;

/** 獣よけの ネット（南の すき間）。 */
export const YW_NET = `@narr
獣よけの ネット。{w=300}
ここだけ、下が
少し めくれている。`;

/** 畑の 物の 数（2本・早い 株・かじられ・物置）。 */
export function ywHata(n: number): string {
  return `@sys\n畑の 物 ${n}/4`;
}

// ================================================================ 5 湯気・6 寝言の しりとり

export const YW_YUGE = `@npc_hoshi_yoshie
早かったねえ！{w=300}
ほら、入れて。
@narr
湯気と いっしょに、{w=300}
甘い においが
広がった。`;

export const YW_AMA: Record<'a' | 'b' | 'c', string> = {
  a: `@npc_kanenari
……甘っ！{w=300}
走った ぶん、甘いで！`,
  b: `@npc_kanenari
……うん、甘い。`,
  c: `@npc_kanenari
……走りが、
たりんかった。`,
};
export const YW_AMA_SOLO: Record<'a' | 'b' | 'c', string> = {
  a: `@narr
ひと口。{w=300}
……甘い！`,
  b: `@narr
ひと口。{w=300}
……うん、甘い。`,
  c: `@narr
ひと口。{w=300}
……走りが、たりなかった。`,
};

export const YW_MAKURA = `@narr
ゆでた とうもろこしを 1本、{w=300}
2人の 枕もとに 置いた。`;

/** かくし：あまさ ◎ で もどった（しりとりの 前に 1つ）。 */
export const YW_HAYAKATTA = `@narr
スギばあの 寝言。{w=300}
『……はやかったねえ……』`;

export const YW_SHIRITORI = `@narr
シゲじいの 寝言。{w=300}
『……とうもろこし……』
/
スギばあ『……しお……』{w=300}
シゲじい『……おいしい……』
/
スギばあ『……いっしょに……』{w=300}
シゲじい『……にほん……』
!se se_h_acha
2人『……あちゃ〜……』
@npc_kanenari
……あちゃ〜。
@narr
2人の 寝顔が、{w=300}
少しだけ、笑った。`;

/** かくし：寝言しりとり（09-28）を 最後まで 聞いている（1回）。 */
export const YW_N_HAYAI = `@npc_kanenari
こんどは、{w=300}
『ん』まで 早かったな。`;

// ================================================================ 7 ごほうび

export const YW_REWARD_A = `@npc_hoshi_yoshie
1本は、2人の ぶん。{w=300}
もう 1本は、あんたらの。`;
export const YW_GOT_CORN = `@sys
ゆでとうもろこしを
もらった！`;
export const YW_BAG_FULL = `@npc_hoshi_yoshie
ポケットが いっぱい？{w=300}
ほんなら、ここで 食べて
いきんさい。`;

/** かくし：70年の 色紙が 終わっている（1回）。 */
export const YW_SHIKISHI = `@npc_hoshi_yoshie
色紙の 2人の 字、{w=300}
とうもろこしの においが
しそうね。`;

export const YW_REWARD = `@sys
朱肉が 2 ふえた。
/
みました帳②の すみに、
『湯を わかしてから』の ページ。`;

/** すんだ あとの ぴょん夫人（お茶の あとに 1回）。 */
export const YW_YOSHIE_AFTER = `@npc_hoshi_yoshie
大なべは、{w=300}
あとで スギさんに 返しとくけえ。`;

/** 無人販売所：すんだ あと、はじめて ゆでとうもろこしを 買う ときの 前に 1回（ソワカ）。 */
export const YW_MUJIN = 'スギさんとこの\nとうもろこし、{w=300}\n……もう 1本 あるのね。';

/** 貼り紙（すんだ あと）。 */
export const YW_HARIGAMI_AFTER = `@narr
『とうもろこしは、湯を
わかしてから もぎに 行く』{w=300}
……ちゃんと、そうした。`;

// ================================================================ 大写し「ひげと 先」・あまさの 札

export const YW_UI = {
  place: 'ひげと 先',
  ama: 'あまさ',
  marks: ['◎', '○', '△'],
};

// ================================================================ みました帳②の すみ『湯を わかしてから』

export const YW_BOOK = {
  title: '湯を わかしてから',
  harigami: ['とうもろこしは、', '湯を わかしてから', 'もぎに 行く'],
  rows: ['2本 もいだ', '早い 株', 'かじられ', '物置'],
  count: '畑の 物',
  ama: 'あまさ',
};

export const YW_ITEM_DESC: [string, string] = ['裏の 畑で もいだ 2本。', '甘いのが 逃げる 前に 湯へ。'];

/** 文の検査（ywText・debug の walk）に出す物。 */
export const YW_TEXTS: Record<string, unknown> = {
  YW_HARIGAMI, YW_HARIGAMI_AGAIN, YW_TOKEI, YW_URA_DARK, YW_URA_SHUT, YW_URA_SHUT_KN, YW_YOSHIE_A, YW_NABE, YW_NABE_WAIT,
  YW_LEAVE_KN, YW_LEAVE_SOLO, YW_WAITA, YW_YOSHIE_GO, YW_FIELD_FIRST, YW_FIELD_H2, YW_KABU_PLAIN, YW_KABU_A, YW_TORI, YW_HAYAI,
  YW_KAJIRI, YW_ASK, YW_HAYAI_KN, YW_HAYAI_SOLO, YW_HOW, YW_UE, YW_POKI, moida: [1, 2].map(ywMoida), YW_GOT2, YW_RUN_KN,
  YW_RUN_SOLO, YW_ENOUGH, YW_MOIDA_ATO, YW_KOYA, YW_NET, hata: [1, 4].map(ywHata), YW_YUGE, YW_AMA, YW_AMA_SOLO, YW_MAKURA,
  YW_HAYAKATTA, YW_SHIRITORI, YW_N_HAYAI, YW_REWARD_A, YW_GOT_CORN, YW_BAG_FULL, YW_SHIKISHI, YW_REWARD, YW_YOSHIE_AFTER,
  mujin: `@npc_hoshi_sawako\n${YW_MUJIN}`, YW_HARIGAMI_AFTER,
};
