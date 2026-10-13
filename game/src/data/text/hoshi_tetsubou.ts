// 分校の 鉄棒と『懸垂、1回』（げむきか 10/11 の 案5、2026-10-13 依頼主の 採用。厳選の 直し：第1章で
// 懸垂に 挑んだ 人だけ。02_ch2_index #100、50 10.33）。
//
//   第1章で 公園の 鉄棒に 挑んだ 人（flag_kensui_try）だけ。段階0〜1、グソっ君が いっしょ：
//   1 校庭の 鉄棒（obj_hoshi_tetsubou）を 2回 調べる → グソっ君「まつ先生に 聞いてみよか」（flag_tetsu_hint）。
//   2 集会所の まつ先生〔tetsu〕：30年の 日課。グソっ君が「懸垂 0回」を ばらす →「0回。……いい 記録ですね。
//     そこから なら、ふえる だけです。」→ 先生は 先に 鉄棒へ（flag_tetsu_away。集会所の 席が 空く）。
//   3 鉄棒 → 大写し「鉄棒」：①ぶら下がる（けってい を おしたまま。はく の ときに おしなおす と 長もち。
//     先生が「とお」まで 数えたら 合格。その 先「はたち」で『先生より 長い』朱肉 +1）→ グソっ君の さかさま
//     （先生の 数える 声を「とお」まで 見とどけると ページの 吹き出し）→ ②肩を 下げる（印が「下」で けってい、
//     3回 続けて）→ ③1回（肩 → 息 → 長おし。ゲージが 切れたら やりなおし。やりなおす たびに 少し 長く）。
//   4 名場面「懸垂、1回。」「0から 1は、いちばん 遠いんやで！」。はなまる『懸垂挑戦！』を 持っている 人は
//     先生が『1回 星見台』と 書き足す（大事なものの 説明が かわる）。朱肉 +2、みました帳②の すみ『鉄棒』。
//   5 そのあと：鉄棒の 文が かわる（小さな 手の 形と 点々の あと）。「ぶら下がる」を 選べる（記録は かわらない）。
//     2回目の 懸垂は「あしたの しゅんに まかせた」。集会所の まつ先生に 1回「朝が 来たら、いっしょに 体操」。
//     段階0（灯りなし）は 鉄棒が 暗い：グソっ君の 1行（練習は できる）。段階2 は 先生が 山道の 入口で、できない。
//
// 確かめたい（依頼主）：懸垂は ひじを 曲げる 前に 肩を 下げる（肩を 耳から 遠ざける）、まず ぶら下がって
// にぎる 力を つける、は よく 言われる 練習の こつ として 書いた。オオグソクムシの 脚の 先が かぎの ように
// なっていて 物に しがみつける。まつ先生が 30年 毎朝 ぶら下がっている（今の 文「朝の 体操の あと、まつ先生が
// ぶら下がる らしい」を 年数に した。新しい 設定）。
// 決まり：第2章の 台詞に 時刻の 数字・「12人」「1日2本」「おまけの 1つ」「具足様」「まだ」「平和」「17」
// 「3人」を 入れない（数える 声は かなで「ひとつ」〜「はたち」）。地の文・名札の 名前に「さん」なし。
// グソっ君は 関西弁・「わい」。1ページ 3行 × 336px（textcheck2 と tetsuText）。

/** ぶら下がりの 合格（とお）と、先生が 数えるのに 飽きる 所（はたち）。 */
export const HANG_PASS = 10;
export const HANG_MAX = 20;
/** 肩を 下げる：続けて 合わせる 回数。 */
export const KATA_N = 3;

/** 先生の 数える 声（1〜20）。 */
export const KAZU = [
  'ひとつ', 'ふたつ', 'みっつ', 'よっつ', 'いつつ', 'むっつ', 'ななつ', 'やっつ', 'ここのつ', 'とお',
  'じゅういち', 'じゅうに', 'じゅうさん', 'じゅうし', 'じゅうご', 'じゅうろく', 'じゅうしち', 'じゅうはち', 'じゅうく', 'はたち',
];

// ================================================================ 1 鉄棒を 2回

export const TETSU_HINT = `@npc_kanenari
手の 形の さび、{w=300}
まつ先生の やったんか。
{w=300}……ぶらさがりかた、聞いてみよか。`;

// ================================================================ 2 30年の 日課（集会所の まつ先生）

export const TETSU_NIKKA = `@npc_hoshi_fumi
鉄棒、見ましたか。{w=300}
わたしの 朝の 日課です。
/
体操の あと、{w=300}
ぶら下がるだけ。{w=300}
……30年に なります。
/
朝が 来ないので、{w=300}
体操は できませんが、{w=300}
ぶら下がるのは、いつでも。
@npc_kanenari
しゅんな、{w=300}
町の 公園で、{w=300}
懸垂 0回 やってん。
@narr
……言わなくて いいのに。
@npc_hoshi_fumi
0回。{w=300}……いい 記録ですね。
/
そこから なら、{w=300}
ふえる だけです。`;

export const TETSU_NIKKA_2 = `@npc_hoshi_fumi
懸垂はね、{w=300}
腕で するんじゃ ありません。{w=300}
まず、ぶら下がる ことです。
/
では、鉄棒へ。{w=300}
……先に 行って います。`;

/** 先生が 鉄棒の 横に いる あいだ（練習の とちゅう）。 */
export const TETSU_WAIT = `@npc_hoshi_fumi
いちばん 低い 段です。{w=300}
……どうぞ。`;

// ================================================================ 3 大写し「鉄棒」

export const TETSU_START = `@narr
いちばん 低い 段。{w=300}
しゅんの 手の 横に、
大きな 手の 形の さび。`;

/** 段階0、灯りなし（1回）。 */
export const TETSU_DARK = `@npc_kanenari
暗いの 得意やけど、{w=300}
しゅんの 手が 見えへんな。`;

export const HANG_RULE = `@npc_hoshi_fumi
けってい を 押している あいだ、
にぎって います。{w=300}
とおまで 数えます。
/
「はく」の ときに、
いちど はなして、押しなおす。{w=300}
……息を、はくんです。
/
とおの 先も、{w=300}
数えて いますよ。`;

/** 落ちた とき（1回目は 長い 文、あとは 短い 文）。 */
export const HANG_FALL = `@npc_hoshi_fumi
いま 落ちたのは、{w=300}
手じゃ なくて、{w=300}
息です。{w=300}……はいて ごらん。`;
export const HANG_FALL_AGAIN = `@npc_hoshi_fumi
もう いちど。{w=300}
……はいて。`;

export const HANG_PASS_TEXT = `@npc_hoshi_fumi
とお。{w=300}
……ほら、ぶら下がれました。`;

/** はたちまで（1回、朱肉 +1）。 */
export const HANG_HATACHI = `@npc_hoshi_fumi
……はたち。{w=300}
……先生より、{w=300}
長い。`;
export const HANG_HATACHI_REWARD = `@narr
しゅんの 朱肉が、
1 ふえた。`;

/** グソっ君も やる。 */
export const KANE_SAKASA = `@narr
グソっ君は、足の 先の かぎを
鉄棒に かけて、{w=300}
……さかさまに ぶら下がった。
@npc_kanenari
わい、ぶら下がるんは
得意やで。{w=300}
何年でも いけるわ。
@npc_hoshi_fumi
……それは、{w=300}
ずるいですね。
@npc_kanenari
さかさまに 見たら、{w=300}
村が、空に 浮いとるわ。
@npc_hoshi_fumi
では、グソっ君も 数えます。`;

/** 先生の 声を「とお」まで 見とどけた（かくし。ページの 吹き出し）。 */
export const KANE_TOO = `@npc_kanenari
……さかさまで、{w=300}
とおまで 聞いたん、{w=300}
はじめてや。`;
/** とちゅうで 押した とき。 */
export const KANE_STOP = `@npc_kanenari
よっと。{w=300}
……おりたで。`;

export const KATA_RULE = `@npc_hoshi_fumi
ひじを 曲げる 前に、{w=300}
肩を、耳から 遠ざける。
/
肩の 印が「下」に 来たら、
けってい。{w=300}
3回 続けて。`;

export const KATA_FIRST = `@narr
……ほんの 少し、{w=300}
鉄棒が 近づいた。`;

export const KATA_PASS = `@npc_hoshi_fumi
……それだけで、{w=300}
少し 上がります。
@npc_kanenari
わいの 肩、どこや？
@npc_hoshi_fumi
……さあ。{w=300}
先生にも、わかりません。`;

export const IKKAI_RULE = `@npc_hoshi_fumi
では、1回。{w=300}
肩を 下げて、{w=300}
息を はいて、
/
それから、{w=300}
けってい を 長く 押します。`;

/** ゲージが 切れた（何回でも。やりなおす たびに、ゲージが 少し 長く）。 */
export const IKKAI_FAIL = `@narr
あごが、{w=300}
鉄棒の 下で 止まった。`;
/** 2回目の 失敗の あと（1回）。 */
export const IKKAI_FAIL_FUMI = `@npc_hoshi_fumi
ぶら下がった ぶん、{w=300}
手が 長もち します。{w=300}
……もう いちど。`;

// ================================================================ 4 名場面

export const IKKAI_DONE = `@narr
……あごが、{w=300}
鉄棒を こえた。
/
懸垂、1回。
@npc_hoshi_fumi
ほら。{w=300}
ふえたでしょう。
@npc_kanenari
しゅん！{w=300}
1回や！{w=300}
0から 1は、いちばん 遠いんやで！
@npc_hoshi_fumi
……グソっ君の 言うとおり。{w=300}
0から 1が、{w=300}いちばん 遠い。`;

/** はなまる『懸垂挑戦！』を 持っている 人だけ。 */
export const HANAMARU = `@narr
はなまるを、{w=300}
まつ先生に 見せた。
@npc_hoshi_fumi
この はなまる、{w=300}
記録が 0回ですね。{w=300}
……書き足して いいですか。`;
export const HANAMARU_2 = `@narr
『0回』の 下に、{w=300}
ちがう 字で『1回 星見台』。
@npc_hoshi_fumi
この 字を 見たら、{w=300}
書いた 人も、{w=300}
きっと 敬礼しますよ。`;
export const HANAMARU_SYS = `@sys
はなまる「懸垂挑戦！」に、
1行 書き足された。`;

/** はなまるの 説明（書き足した あと）。 */
export const HANAMARU_DESC: [string, string] = ['赤ペンの はなまる。記録は 0回、', 'その 下に『1回 星見台』。'];

export const TETSU_BYE = `@npc_hoshi_fumi
では、先生は 集会所へ。{w=300}
……あしたの 朝も、{w=300}
ぶら下がりますよ。`;

export const TETSU_REWARD = `@narr
みました帳②の すみに、
『鉄棒』の
ページが 1枚 ふえた。
/
しゅんの 朱肉が、
2 ふえた。`;

// ================================================================ 5 そのあと

export const TETSU_AFTER = `@narr
いちばん 低い 段の さびに、{w=300}
大きな 手の 形が 2つ。{w=300}
となりに、小さな 手の 形が 2つ。
/
……その 横に、{w=300}
点々の あとが、たくさん。
? ぶら下がる | 懸垂に 挑戦する | やめておく`;

export const TETSU_NIKAIME = `@narr
……2回目は、{w=300}
あしたの しゅんに まかせた。`;

/** ひとりで ぶら下がる（記録は かわらない。数は しゅんが 自分で）。 */
export const SOLO_RULE = `@narr
けってい を 押している あいだ、
ぶら下がる。{w=300}
数は、自分で 数える。`;
export const SOLO_END = (n: number) => `@narr
${n > 0 ? `${KAZU[Math.min(n, HANG_MAX) - 1]}まで、` : ''}{w=300}
ぶら下がった。`;

/** 集会所の まつ先生（すんだ あと 1回）。 */
export const TETSU_FUMI_AFTER = `@npc_hoshi_fumi
朝が 来たら、{w=300}
いっしょに 体操 しましょう。`;

// ================================================================ 大写しの 言葉

export const TETSU_UI = {
  place: '鉄棒',
  /** 練習の 札（右の 列）。 */
  fuda: ['ぶら下がる', '肩を 下げる', '1回'],
  grip: 'にぎる 力',
  suu: 'すう',
  haku: 'はく',
  kataUp: '上',
  kataDown: '下',
  keysHang: ['けってい', 'おしたまま'],
  keysKata: ['「下」で', 'けってい'],
  keysIkkai: ['肩 → 息', '→ 長おし'],
  keysWatch: ['見とどける', ''],
  cancel: 'もどる やめる',
  good: 'そろった',
  hai: 'はー',
  miss: 'もう 少し',
  up: 'ぐっ',
  over: '1回！',
};

// ================================================================ みました帳

export const TETSU_BOOK = {
  title: '鉄棒',
  /** さびの 手の 形の 絵の 下。 */
  te: '大きな 手 2つ、小さな 手 2つ',
  kiroku: '懸垂 0回 → 1回',
  hatachi: 'はたち',
  /** グソっ君の 吹き出し（かくし：さかさまで とおまで）。 */
  kane: 'とおまで 聞いた',
};

/** textcheck2 が 見る ページ。 */
export const TETSU_TEXTS: Record<string, unknown> = {
  hint: TETSU_HINT,
  nikka: TETSU_NIKKA,
  nikka2: TETSU_NIKKA_2,
  wait: TETSU_WAIT,
  start: TETSU_START,
  dark: TETSU_DARK,
  hangRule: HANG_RULE,
  hangFall: HANG_FALL,
  hangFallAgain: HANG_FALL_AGAIN,
  hangPass: HANG_PASS_TEXT,
  hatachi: HANG_HATACHI,
  hatachiReward: HANG_HATACHI_REWARD,
  sakasa: KANE_SAKASA,
  kaneToo: KANE_TOO,
  kaneStop: KANE_STOP,
  kataRule: KATA_RULE,
  kataFirst: KATA_FIRST,
  kataPass: KATA_PASS,
  ikkaiRule: IKKAI_RULE,
  ikkaiFail: IKKAI_FAIL,
  ikkaiFailFumi: IKKAI_FAIL_FUMI,
  ikkaiDone: IKKAI_DONE,
  hanamaru: HANAMARU,
  hanamaru2: HANAMARU_2,
  hanamaruSys: HANAMARU_SYS,
  bye: TETSU_BYE,
  reward: TETSU_REWARD,
  after: TETSU_AFTER,
  nikaime: TETSU_NIKAIME,
  soloRule: SOLO_RULE,
  soloEnd: SOLO_END(HANG_MAX),
  soloEnd9: SOLO_END(19),
  fumiAfter: TETSU_FUMI_AFTER,
};
