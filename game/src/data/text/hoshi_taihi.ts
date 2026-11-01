// 堆肥の 中の 親戚（げむきか 10/10 の 案2、依頼主の 変更つき。02_ch2_index #97、50 10.32）。
//
//   依頼主の 変更（2026-10-10）：「カブトムシの幼虫ならいるね。他はいないかも、だからカブトムシの幼虫を
//   見つけるミニゲームで良いかも」→ 堆肥の 山の 住人は カブトムシの 幼虫だけ。グソっ君は まるまった
//   白い 幼虫を 親戚だと 思いこみ、マサルに「……カブトムシの 子だ。」と 言われる。
//
//   段階1〜2、トマトの 灯り、グソっ君が いっしょ：
//   1 張り紙：堆肥舎の『切り返し 月・木』を 調べると、いつもの 文の あと グソっ君（1回）。
//   2 マサルに 話す〔taihi〕：切り返しの 前に、古い ほうの 山の 住人を 数えて こい。手で 掘れ、
//     フォークは 使うな。見つけたら 数えて、もとの 所へ そっと 返せ。
//   3 古い 山（obj_hr_taihi_yama）を 調べる → 大写し「古い 山の 断面」：灯りを 動かして、表面の
//     つぶつぶ（幼虫の ふん）の 多い 所を 手で 掘る。6ぴき 見つけて、1ぴきずつ もとの 所へ もどす。
//     湯気の 所（まだ 熱い 芯）を 掘ると「熱すぎる」。いちども 掘らなければ『ていねい』。
//   4 マサルに 話す〔kodomo〕：「……カブトムシの 子だ。」。住人の いる 山は まぜない。
//   5 フォーク → 温度計の 山の 切り返し（4回。湯気が ふわっと 上がった 所で すくう。4回 そろうと
//     『湯気 名人』）→ 朱肉 +2、みました帳②の すみ『堆肥の 山の 住人』。
//   6 そのあと：ペロ・トマじいに 1回ずつ（まわる 堆肥。ページに 1つずつ）、2つの 名人で マサル（朱肉 +1）、
//     古い 山を 調べると グソっ君（1回）と 地の文。段階0 は 暗くて 掘れない（グソっ君の 1行）。
//
// 事実（農家の 目で）：カブトムシは 夏に 発酵が 落ちついた 堆肥・腐葉土に 卵を 産み、8月の おわりには
// 小さな 白い 幼虫（1〜2令）。熱い 芯（切り返し 直後の 山の 中は 60℃ を こえる）には いない。
// 幼虫の ふんは 小さな 粒。掘るのは 手で（フォークだと 幼虫を 刺す）。来年の 夏に 成虫。
// 稲わらは 肥育牛の えさ（粗飼料）に なり、牛ふん堆肥は 田んぼ・ハウスへ（耕畜連携）。
// 虫は とらない・持ち帰らない・食べさせない。『むし』の 自由研究（50 10.21）の 数には 入れない。
// 決まり：第2章の 台詞に 時刻の 数字・「12人」「1日2本」「おまけの 1つ」「具足様」「まだ」「平和」「17」
// 「3人」を 入れない。マサルの 口癖・ペロの「ほどよい」は 使わない。名札・地の文の 名前に「さん」なし。
// 1ページ 3行 × 336px（textcheck2 と taihiText）。

/** 古い 山の 住人（カブトムシの 幼虫）の 数。 */
export const TAIHI_N = 6;
/** 切り返しの 回数。 */
export const KAESHI_N = 4;

// ================================================================ 1 張り紙

export const TAIHI_HARIGAMI = `@npc_kanenari
切り返し、{w=300}
わいら 手伝えへんかな。
{w=300}……マサルに 聞いてみよ。`;

/** 段階0（灯りが ない）：古い 山を 調べた とき、1回。 */
export const TAIHI_H0 = `@npc_kanenari
……山の 中で、{w=300}
ごそっと 音が したで。
/
暗いの 得意やけど、{w=300}
しゅんが 見えへんやろ。`;

// ================================================================ 2 マサル〔taihi〕

export const TAIHI_ASK = `@npc_kanenari
マサル、{w=300}
堆肥舎の 張り紙の 切り返し、
わいら やったろか？
@npc_hoshi_gen
……山を まぜて、
空気を 入れる。{w=300}
そうすると、また 熱が 出る。
/
その 前に、古い ほうの 山の
住人を 数えて こい。{w=300}
……住人の いる 山は、まぜん。
@npc_kanenari
住人？
@npc_hoshi_gen
掘るのは、手で。{w=300}
フォークは 使うな。
/
見つけたら、数えて、
もとの 所へ 返せ。{w=300}
……そっとな。`;

// ================================================================ 3 古い 山の 断面（大写し）

export const TAIHI_GAME_START = `@narr
温度計の ない ほうの、
古い 山。{w=300}
灯りを 近づけると、ほんのり 湯気。
@npc_kanenari
住人、どこや。{w=300}
……掘るで、しゅん。
{w=300}手で、そっとな。`;

/** 大写しが 開いた あと（何を すれば いいか）。 */
export const TAIHI_RULE = `@narr
表面の 細かい つぶつぶは、
だれかの ふん らしい。
/
つぶつぶが 多い 所ほど、
近くに いる。{w=300}
湯気の 所は、熱い。`;

/** 1ぴき目（見つけた とき）。 */
export const TAIHI_FIRST = `@narr
小さな、白い 幼虫。{w=300}
まるまったまま、
ゆっくり 足を 動かした。
@npc_kanenari
…………{w=300}
白くて、まるまって、
ふしが いっぱい……
/
……親戚や。{w=300}
わいの、親戚や！`;

/** 1ぴき目：第1章で ゲンジロウを 見た 人（flag_seen_obj_mushikago）。しゅんの 地の文。 */
export const TAIHI_FIRST_GENJIRO = `@narr
……ゲンジロウの、{w=300}
親戚かも しれない。`;

export const TAIHI_FIRST_AISATSU = `@npc_kanenari
……どうも。{w=300}
遠い 親戚の、わいです。`;

/** 1ぴき目を もどした あと。 */
export const TAIHI_FIRST_BACK = `@narr
もとの 所に 置いて、
上から そっと 土を かけた。
@npc_kanenari
……ほな、また。{w=300}
親戚の 集まりで。`;

/** 2ひき目。 */
export const TAIHI_SECOND = `@npc_kanenari
こっちにも おった。{w=300}
……親戚、多いな。
{w=300}わい、知らんかったわ。`;

/** 4ひき目。 */
export const TAIHI_FOURTH = `@npc_kanenari
みんな、まるまり方が
うまいなあ。{w=300}
わいは、うまく でけへん。`;

/** 湯気の 所を 掘った とき（1回目だけ。2回目からは 大写しの 字だけ）。 */
export const TAIHI_HOT = `@narr
ここは、熱すぎる。{w=300}
……だれも いない。`;

/** ぜんぶ 見つけて、もどした。 */
export const TAIHI_ALL = `@narr
${TAIHI_N}ぴき。{w=300}
みんな、もとの 所で
土の 中に もどった。
@npc_kanenari
親戚、${TAIHI_N}ぴき。{w=300}
……マサルに 言うたろ。`;

/** 湯気の 所を いちども 掘らなかった。 */
export const TAIHI_TEINEI = `@narr
湯気の 所には、
いちども 手を 入れなかった。`;

// ================================================================ 4 マサル〔kodomo〕

export const TAIHI_GEN = `@npc_kanenari
マサル！{w=300}
古い 山に、わいの 親戚
${TAIHI_N}ぴき おったで！
@npc_hoshi_gen
……カブトムシの 子だ。
@npc_kanenari
…………{w=300}
カブトムシ。
/
……あの、角の？{w=300}
夏の 夜に、木に おる？
@npc_hoshi_gen
来年の 夏、あの 山から
出てくる。{w=300}
……毎年 そうだ。
@npc_kanenari
……親戚 ちゃうかった。
/
でも、まるまり方は、{w=300}
わいより うまかったで。
@npc_hoshi_gen
……${TAIHI_N}ぴきか。{w=300}
去年より 多い。
/
住人の いる 山は、まぜん。
{w=300}切り返すのは、
温度計の 山だけだ。`;

// ================================================================ 5 切り返し

export const KAESHI_START = `@narr
切り返し用の フォーク。
{w=300}柄が、手の 形に
すりへっている。
@npc_kanenari
温度計の 山や。{w=300}
……ここは、だれも
住んどらんな。`;

export const KAESHI_RULE = `@narr
山を すくって、横へ 返す。
{w=300}湯気が ふわっと 上がったら、
次を すくう。`;

export const KAESHI_DONE: Record<'h1' | 'h2', string> = {
  h1: `@narr
山から、白い 湯気が
いっぺんに 立った。{w=300}
……夜明け前の 空へ。`,
  h2: `@narr
山から、白い 湯気が
いっぺんに 立った。{w=300}
……山の ほうへ、なびいていく。`,
};

export const KAESHI_KANE = `@npc_kanenari
……あったかいな。{w=300}
住人の おらん 山で、
思いっきり まぜられたわ。`;

/** 4回とも 湯気と そろった。 */
export const KAESHI_YUGE = `@narr
${KAESHI_N}回とも、湯気と
いっしょに すくえた。`;

export const TAIHI_REWARD = `@narr
みました帳②の すみに、
『堆肥の 山の 住人』の
ページが 1枚 ふえた。
/
しゅんの 朱肉が、
2 ふえた。`;

// ================================================================ 6 そのあと

/** 『ていねい』と『湯気 名人』の 2つ：マサル（1回、朱肉 +1）。 */
export const TAIHI_GEN_MEIJIN = `@npc_hoshi_gen
……堆肥舎の 湯気の においが、
{w=300}ここまで 来た。
/
熱い 所には 手を 入れずに、
住人も ぜんぶ 数えた。{w=300}
……おれより うまい。`;

export const TAIHI_MEIJIN_REWARD = `@narr
しゅんの 朱肉が、
1 ふえた。`;

/** ペロ（3号ハウス、1回）。 */
export const TAIHI_PERO = `@npc_hoshi_mitsu
……カブトムシの 子が、
いたかい。{w=300}
あの 山は、いい 山だ。
/
あの 子らが 食べて、{w=300}
土が もっと 細かく なる。
……うちの ハウスの 土もね。
@npc_kanenari
ほな、トマトの 味にも、{w=300}
親戚……ちゃう、
カブトムシの 子の 仕事が 入っとるんや。`;

/** トマじい（棚田、1回）。 */
export const TAIHI_TOME = `@npc_hoshi_tome
わしの 田んぼの わらは、
マサルの 牛の えさに なる。
/
牛の ふんが、堆肥に なって、
{w=300}また 田んぼへ 来る。
{w=300}……ぐるっと じゃ。
@npc_kanenari
……ぐるっと まわっとるんやな。
{w=300}カブトムシの 子も、
まぜて。`;

/** 古い 山（できあがった あと）：グソっ君（1回）。 */
export const TAIHI_AFTER_KANE = `@npc_kanenari
カブトムシの 子の 家や。
{w=300}……親戚 ちゃうけど、
あったかいとこに 住んどるなあ。`;

/** 古い 山（できあがった あと、いつもの 文の あと）。 */
export const TAIHI_AFTER = `@narr
この 山の 中で、${TAIHI_N}ぴきが
来年の 夏を 待っている。`;

// ================================================================ 大写しの 字

export const TAIHI_UI = {
  place: '古い 山の 断面',
  placeKaeshi: '温度計の 山',
  found: (n: number) => `みつけた ${n}/${TAIHI_N}`,
  left: (n: number) => (n > 0 ? `あと ${n}ひき` : 'そろった'),
  dug: (n: number) => `掘った ${n}`,
  keys: ['十字 灯り', 'けってい 掘る'],
  back: 'けってい そっと もどす',
  legend: ['近い', '熱い'],
  none: 'いない',
  dry: 'さらさら',
  hot: 'あつっ',
  dugAlready: '掘った',
  one: '1ぴき！',
  kaeshi: (n: number) => `すくった ${n}/${KAESHI_N}`,
  kaeshiKeys: ['ふわっ で', 'けってい'],
  good: 'そろった',
  early: 'はやい',
  late: 'おそい',
};

// ================================================================ みました帳

export const TAIHI_BOOK = {
  title: '堆肥の 山の 住人',
  row: 'カブトムシの 幼虫',
  /** グソっ君の 字（線で 消す）と、しゅんの 字。 */
  kane: 'しんせき',
  shun: 'カブトムシの 子',
  place: '古い 山の 中',
  teinei: 'ていねい',
  yuge: '湯気 名人',
  /** ペロ・トマじいの あと 1つずつ（わら → 牛 → 堆肥 → 田んぼ・ハウス）。 */
  cycle: ['わら', '牛', '堆肥', '田んぼ', 'ハウス'],
};

/** textcheck2 が 見る ページ。 */
export const TAIHI_TEXTS: Record<string, unknown> = {
  harigami: TAIHI_HARIGAMI,
  h0: TAIHI_H0,
  ask: TAIHI_ASK,
  gameStart: TAIHI_GAME_START,
  rule: TAIHI_RULE,
  first: TAIHI_FIRST,
  firstGenjiro: TAIHI_FIRST_GENJIRO,
  firstAisatsu: TAIHI_FIRST_AISATSU,
  firstBack: TAIHI_FIRST_BACK,
  second: TAIHI_SECOND,
  fourth: TAIHI_FOURTH,
  hot: TAIHI_HOT,
  all: TAIHI_ALL,
  teinei: TAIHI_TEINEI,
  gen: TAIHI_GEN,
  kaeshiStart: KAESHI_START,
  kaeshiRule: KAESHI_RULE,
  kaeshiDone: KAESHI_DONE,
  kaeshiKane: KAESHI_KANE,
  kaeshiYuge: KAESHI_YUGE,
  reward: TAIHI_REWARD,
  genMeijin: TAIHI_GEN_MEIJIN,
  meijinReward: TAIHI_MEIJIN_REWARD,
  pero: TAIHI_PERO,
  tome: TAIHI_TOME,
  afterKane: TAIHI_AFTER_KANE,
  after: TAIHI_AFTER,
};
