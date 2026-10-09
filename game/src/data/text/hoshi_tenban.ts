// 無人販売所の 店番（げむきか 10/9 の 案3。02_ch2_index #94、50 10.30）。
//
//   段階1〜2（トマトの 灯りを 持っている あいだ）、ムジン販売員を 倒して ソワカの〔h1_2〕を 聞いた あと、
//   グソっ君が いっしょの とき：
//   1 店番 ぼしゅう（ソワカ。1回）→ そのまま モデルの あいだ。
//   2 モデルの あいだ：画面の 上に 大写し（左に じっと している グソっ君、右に ソワカの 下絵 4段）。
//     お客 4人（ぴょん夫人・トマじい・ハモ区長・さんかど）が 県道を 歩いて 来て、台の 前で 1人ずつ。
//     しゅんの 返事「ツッコむ｜うなずく｜料金箱を 指す」。ツッコむと グソっ君が「ぶふっ」と 動く。
//     区長で「うなずく」と、式辞が 長くなって グソっ君が こっくり（これも 動いた うち）。
//     段階1 は ふくじんづけが においを かぎに 来る（選ぶ所 なし）。段階2 は 区長の 式辞の とちゅうで
//     防災無線の 呼び声（区長は 山を 見る。返事は なし）。
//   3 できあがり：看板の 絵（動いた 回数で 3通り：0回 置物 級／1〜2回 店番 級／3回 以上 にぎやか 級）。
//     売り上げ 100円 × 5（ぴょん夫人は 2袋）。朱肉 +2、みました帳②の すみに『店番の 下絵』。
//   4 かくし：第1章で お地蔵さんの 前の グソっ君の ひとこと（flag_kanenari_flip_jizo）を 見た 人は、
//     はじめに「お地蔵さんにも、負けへんで。」。0回の ときだけ、看板の すみに はさみの サイン。
//   5 そのあと：看板を 調べると その 絵の 文（グソっ君 1回「気まずいわ」）。段階2 で ソワカの〔h2_1〕を
//     聞いた あと、1回〔satoshi〕。
//
// しゅんは 話さない（10_narrative 2.7）：返事は 選ぶ 所と 地の文だけ。
// 決まり：第2章の 台詞に 時刻の 数字・「12人」「1日2本」「おまけの 1つ」「具足様」「まだ」「平和」「17」
// 「3人」を 入れない（「100円」は 値段）。ペロ・マサルの 口癖は 使わない。地の文・名札の 名前に
// 「さん」を つけない（台詞の「店番さん」は 呼び方）。1ページ 3行 × 336px（textcheck2 と tenbanText）。
// 黄土：赤や 黄の 土の 顔料（オーカー）は、洞くつの 壁画にも 使われた いちばん 古い 絵の具の なかま
// （ラスコーや アルタミラの 壁画）。「いちばん 古い」と 言い切らず「いちばん 古い 絵の具の ひとつ」に した。

export type TenbanGuest = 'yoshie' | 'tome' | 'kucho' | 'sankado';
export const TENBAN_GUESTS: TenbanGuest[] = ['yoshie', 'tome', 'kucho', 'sankado'];

/** しゅんの 返事（この 順。0 ツッコむ、1 うなずく、2 料金箱を 指す）。 */
export const TENBAN_CHOICE = '? ツッコむ | うなずく | 料金箱を 指す';

// ================================================================ 1 店番 ぼしゅう

export const TENBAN_START = `@npc_hoshi_sawako
……あら。{w=300}
あなた、人じゃ {w=300}
ないわよねえ？
@npc_kanenari
オオグソクムシや。{w=300}
ダンゴムシ ちゃうで。
@npc_hoshi_sawako
じゃあ、あなたが 座っても、
{w=300}無人販売所の ままね！
/
看板に、店番として
描かせて ちょうだい。{w=300}
……動かないで いられる？
@npc_kanenari
じっと するんは、得意やで。
{w=300}何年でも いけるわ。
@npc_hoshi_sawako
何年は、いらないわ。{w=300}
……下絵 1枚ぶんで いいの。`;

/** かくし：第1章の お地蔵さんの 前の ひとことを 見た 人（flag_kanenari_flip_jizo）。 */
export const TENBAN_JIZO = `@npc_kanenari
お地蔵さんにも、{w=300}
負けへんで。`;

/** 席に ついてから：何を するか（画面の 上の 大写しと いっしょに）。 */
export const TENBAN_RULE = `@npc_hoshi_sawako
お客さんが 来たら、{w=300}
しゅんくんが 相手を してね。
/
ただし、グソっ君を
笑わせたら 動いちゃうわよ。
{w=300}……動いた ぶんは、絵に 出るの。`;

// ================================================================ 2 モデルの あいだ（お客 4人）

/** 来た ときの 台詞（このあと しゅんの 返事）。 */
export const TENBAN_COME: Record<TenbanGuest, string> = {
  yoshie: `@npc_hoshi_yoshie
ええ 店番さんじゃ。{w=300}
……ちいとも 動かんのう。{w=300}
息、しとるかね。`,
  tome: `@npc_hoshi_tome
ほう。{w=300}
田んぼの かかしより、{w=300}
ようできとる。
/
……かかしは、
目が 動かんからのう。{w=300}
こいつは、目が 動いとる。
@narr
グソっ君の 目だけが、{w=300}
トマじいを 追っている。`,
  kucho: `@npc_hoshi_kucho
えー、本日は {w=300}
新しい 店番の {w=300}
就任に あたりまして……
/
えー、そもそも {w=300}
当 販売所の {w=300}
沿革を 申しますと……
@narr
グソっ君の 耳の 板が、{w=300}
少し たれた。{w=300}
……ねむい らしい。`,
  sankado: `@npc_hoshi_busdriver
店番さん、郵便です。{w=300}
……受け取りの ハンコを。`,
};

/** 「ツッコむ」：しゅんの 手（地の文）→ グソっ君が ふき出す → お客の ひとこと。 */
export const TENBAN_TSUKKOMI: Record<TenbanGuest, string> = {
  yoshie: `@narr
しゅんの 手が、{w=300}
『しとるわ！』の 形に
ぴしっと 動いた。`,
  tome: `@narr
しゅんの 手が、{w=300}
『かかしと くらべんな！』の
形に ぴしっと 動いた。`,
  kucho: `@narr
しゅんの 手が、{w=300}
『長いわ！』の 形に
ぴしっと 動いた。`,
  sankado: `@narr
しゅんの 手が、{w=300}
『店番に 郵便 来るんかい！』の
形に ぴしっと 動いた。`,
};

/** グソっ君が ふき出す（どの お客でも 同じ）。 */
export const TENBAN_BUFU = `@npc_kanenari
……ぶふっ。
@narr
グソっ君が、ふき出して
動いた。`;

/** ふき出した あとの お客の ひとこと（区長は 式辞が 終わる）。 */
export const TENBAN_AFTER_TSUKKOMI: Record<TenbanGuest, string> = {
  yoshie: `@npc_hoshi_yoshie
おや、生きとる。{w=300}
……よかった よかった。`,
  tome: `@npc_hoshi_tome
ほう、口も 動くか。{w=300}
……かかしより、上等じゃ。`,
  kucho: `@npc_hoshi_kucho
えー、店番も {w=300}
笑顔が いちばん、で
ございます。`,
  sankado: `@npc_hoshi_busdriver
……失礼 しました。{w=300}
ハンコは、どなたでも。`,
};

/** 「うなずく」。 */
export const TENBAN_UNAZUKU: Record<TenbanGuest, string> = {
  yoshie: `@narr
しゅんは、うなずいた。`,
  tome: `@narr
しゅんは、うなずいた。
@npc_hoshi_tome
……ボウズも、ええ 番じゃ。`,
  // 区長：式辞が 続いて、グソっ君が こっくり（動いた うち）
  kucho: `@narr
しゅんは、うなずいた。
@npc_hoshi_kucho
えー、さらに {w=300}
申しますと、当 販売所の
台は 杉の 板で……
@narr
グソっ君の 頭が、{w=300}
こっくり 動いた。`,
  sankado: `@narr
しゅんは、うなずいた。`,
};

/** 「料金箱を 指す」。 */
export const TENBAN_HAKO: Record<TenbanGuest, string> = {
  yoshie: `@narr
しゅんは、料金箱を 指した。
@npc_hoshi_yoshie
おお、そうじゃ そうじゃ。{w=300}
お代が 先じゃな。`,
  tome: `@narr
しゅんは、料金箱を 指した。
@npc_hoshi_tome
わかっとる。{w=300}
……米と ちごうて、
野菜は 現金じゃ。`,
  kucho: `@narr
しゅんは、料金箱を 指した。
@npc_hoshi_kucho
えー、つまり {w=300}
お代は 箱へ、で
ございます。`,
  sankado: `@narr
しゅんは、料金箱を 指した。
@npc_hoshi_busdriver
……ああ、お代も。{w=300}
きゅうりを 1袋。`,
};

/** さんかどの ハンコ（ツッコんでも、ツッコまなくても）。 */
export const TENBAN_HANKO = `@npc_kanenari
（……しゅん、{w=300}
押しといて。）
@narr
しゅんは、かわりに {w=300}
はなまるを 押した。
@npc_hoshi_busdriver
……店番さんの、{w=300}
いい 字ですね。`;

/** お代（料金箱の 音の あと）。ぴょん夫人は 2袋。 */
export const TENBAN_PAY: Record<TenbanGuest, string> = {
  yoshie: `@narr
ぴょん夫人は、100円を 2つ
料金箱に 入れて、{w=300}
グソっ君に おじぎを した。`,
  tome: `@narr
トマじいは、なすを 1袋。{w=300}
100円が、箱の 中で 鳴った。`,
  kucho: `@narr
区長は、とうもろこしを 1袋。
{w=300}100円を 入れて、
満足そうに 帰っていった。`,
  sankado: `@narr
さんかどは、きゅうりを 1袋。
{w=300}100円を 入れて、
帽子に 手を やった。`,
};

/** 段階2：区長の 式辞の とちゅうで 呼び声（返事は なし。グソっ君が いちばん 動かない）。 */
export const TENBAN_KUCHO_H2 = `@narr
区長は 式辞を 止めて、{w=300}
山の ほうを 見た。
/
グソっ君も、{w=300}
いちばん 動かなかった。`;

export const TENBAN_KUCHO_H2_AFTER = `@npc_hoshi_kucho
……えー、本日は {w=300}
これにて。`;

/** 段階1：ふくじんづけ（選ぶ 所 なし）。 */
export const TENBAN_DOG = `@narr
小さな 犬が、グソっ君の {w=300}
しっぽの においを {w=300}
かいで、帰っていった。`;

/** 下絵が 1段 すすむ ときの ソワカ（筆の 音の あと。1段目〜3段目）。 */
export const TENBAN_SKETCH: string[] = [
  `@npc_hoshi_sawako
……ふふ。{w=300}
まずは、まるい 線から。`,
  `@npc_hoshi_sawako
はちまきは、白を {w=300}
残して おくの。`,
  `@npc_hoshi_sawako
さあ、色を 置くわよ。`,
];

// ================================================================ 3 できあがり

export const TENBAN_DONE = `@npc_hoshi_sawako
……はい、できた。
@narr
看板の 板に、{w=300}
『どれでも 100円』。{w=300}
その 下に、店番の 絵。
/
『店番 グソっ君{w=300}
（人では ありません）』。
@npc_kanenari
……わい、{w=300}
こんな 色か。
@npc_hoshi_sawako
黄土色。{w=300}
いちばん 古い 絵の具の
ひとつよ。
/
むかしの 人が、{w=300}
洞くつの 壁に 塗った 色。
/
土の 色なの。{w=300}
……地面を 掘れば、{w=300}
どこにでも ある 色。
@npc_kanenari
海の 底の 生まれやのに、
{w=300}陸の 土の 色なんか、{w=300}
わい。
@npc_hoshi_sawako
……よかったじゃない。{w=300}
陸に 来て。
/
わたしの 顔は、{w=300}
となりに 小さく {w=300}
描いておいたわ。`;

/** 動いた 回数で 変わる 絵（0回・1〜2回・3回 以上）。 */
export const TENBAN_RESULT: [string, string, string] = [
  `@narr
グソっ君が、きりっと
座っている 絵。
@npc_kanenari
……男前やん。`,
  `@narr
腕が 2本ずつに
見える 絵。
@npc_hoshi_sawako
ちょっと、{w=300}
動いた ぶんよ。`,
  `@narr
足と 腕が、何本にも
なっている 絵。
@npc_kanenari
足、ふえとる！{w=300}
……ダンゴムシ ちゃうで！
@npc_hoshi_sawako
動いた ぶんよ。{w=300}
……でも、いちばん {w=300}
元気な 絵ね。`,
];

/** 0回の ときだけ：はさみの サイン。 */
export const TENBAN_SIGN = `@narr
看板の すみに、{w=300}
『ソワカ』の サイン。{w=300}
その 横に、はさみの 形。`;

/** 売り上げ（料金箱の 100円 5つ）。 */
export const TENBAN_URIAGE = `@narr
料金箱の 中に、{w=300}
100円が 5つ。
@npc_hoshi_sawako
……えらい 箱ね。{w=300}
今夜は、もうけたわ。`;

export const TENBAN_REWARD = `@narr
ソワカの 下絵が 1枚、
みました帳②の すみに
はさまった。{w=300}
/
しゅんの 朱肉が、
2 ふえた。`;

// ================================================================ 5 そのあと

/** 看板を 調べた とき（h1〜h2、できあがった あと）。 */
export const TENBAN_KANBAN: [string, string, string] = [
  `@narr
看板に、きりっと 座った
店番の 絵。{w=300}
『店番 グソっ君（人では ありません）』。`,
  `@narr
看板に、腕が 2本ずつに
見える 店番の 絵。{w=300}
『店番 グソっ君（人では ありません）』。`,
  `@narr
看板に、足と 腕が
何本にも なった 店番の 絵。{w=300}
『店番 グソっ君（人では ありません）』。`,
];

export const TENBAN_KANBAN_KANE = `@npc_kanenari
店番、{w=300}
さぼっとるみたいで {w=300}
気まずいわ。`;

/** 段階2、ソワカの〔h2_1〕（サトシくん）を 聞いた あと、1回。 */
export const TENBAN_SATOSHI = `@npc_hoshi_sawako
サトシくんが 見たら、{w=300}
『本物より うまそう』って {w=300}
言うかしらね。
@npc_kanenari
わいは、{w=300}
食べもん ちゃうで！
@npc_hoshi_sawako
……そうね。{w=300}
それで いいのよ。`;

// ================================================================ 大写しと みました帳

export const TENBAN_UI = {
  /** 大写しの 札。 */
  place: 'モデル中',
  moved: (n: number): string => `うごいた ${n}`,
  box: (n: number): string => `料金箱 ${n}`,
  /** 右の 列の 2行：何を するか。 */
  guide: ['お客が 来たら', '返事を えらぶ'],
  /** 看板の 字（大写しの さいご）。 */
  kanban: 'どれでも 100円',
  name: '店番 グソっ君',
  note: '（人では ありません）',
};

export const TENBAN_BOOK = {
  title: '店番の 下絵',
  ranks: ['置物 級', '店番 級', 'にぎやか 級'] as [string, string, string],
  moved: (n: number): string => `うごいた ${n}回`,
  uriage: '売り上げ 100円×5',
  satoshi: '本物より うまそう',
};

/** 動いた 回数 → 0 / 1 / 2（絵と 級）。 */
export function tenbanRank(moves: number): 0 | 1 | 2 {
  return moves <= 0 ? 0 : moves <= 2 ? 1 : 2;
}

/** textcheck2 が 見る ページ。 */
export const TENBAN_TEXTS: Record<string, unknown> = {
  start: TENBAN_START,
  jizo: TENBAN_JIZO,
  rule: TENBAN_RULE,
  come: TENBAN_COME,
  tsukkomi: TENBAN_TSUKKOMI,
  bufu: TENBAN_BUFU,
  afterTsukkomi: TENBAN_AFTER_TSUKKOMI,
  unazuku: TENBAN_UNAZUKU,
  hako: TENBAN_HAKO,
  hanko: TENBAN_HANKO,
  pay: TENBAN_PAY,
  kuchoH2: TENBAN_KUCHO_H2,
  kuchoH2After: TENBAN_KUCHO_H2_AFTER,
  dog: TENBAN_DOG,
  sketch: TENBAN_SKETCH,
  done: TENBAN_DONE,
  result: TENBAN_RESULT,
  sign: TENBAN_SIGN,
  uriage: TENBAN_URIAGE,
  reward: TENBAN_REWARD,
  kanban: TENBAN_KANBAN,
  kanbanKane: TENBAN_KANBAN_KANE,
  satoshi: TENBAN_SATOSHI,
};
