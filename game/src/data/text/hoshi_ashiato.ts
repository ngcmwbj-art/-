// 夜の 足あと帳（げむきか 10/6 の 案3。02_ch2_index #87、50 10.28・9.9）。
//
//   段階1〜2（トマトの 灯りを 持っていて、牛舎の おてつだい〈10.19〉の あと）：
//   1 はじまり：マサル〔ashiato〕（牛舎 (20,6) か、段階2は ゲートの 横）。見回り帳の『きょうの 客』、
//     「今夜の 分、ボウズが 数えて こい。」→ みました帳②の すみに『よるの 足あと』（○/6）。
//   2 足あと 6つ（灯りの 中だけ。どの 順でも よい）と、知らせる 相手（犯人が わかる）：
//     イノシシ（ペロ）・ハクビシン（ペロ）・タヌキ（ハモ区長）・シカ（トマじい）・ノウサギ（ソワカ）・
//     ふくじんづけ（マサル。寝床と 軍手の 箱の 1ページずつ）。今ある 子どもの 足あとは 数えない（マサル）。
//     6つ そろうと 朱肉 +2。
//   3 かくし：14本の 足（6つの あと、しゅんの 歩いた あとに 出る）→ マサル『グ 1』。
//   4 うり坊を 数える（6つの あと、マサルに 話す）：ゲートの 内側から、灯りを 低く して。
//     朱肉 +2、表紙の うり坊の シール。
//   5 そのあと：電柱の 張り紙『絵 ソワカ』（⑤を 聞いた 人は グソっ君の ひとこと）、見回り帳の『グ 1』。
//
// 依頼主の 変更（2026-10-06）：シカには 稲を 食べさせない。犯人は 畦に 植えた 豆（大豆）の 葉の 先
// （「稲は 食べない」とも 言わせない）。ボツの 案2（村営バス）に ふれる 行は 入れない。
//
// 決まり：第2章の 台詞に 時刻の 数字・「12人」「1日2本」「おまけの 1つ」「具足様」「まだ」「平和」
// 「17」「3人」を 入れない（「100円」「5ひき」「14本」「7つ」は 時刻では ない）。マサルの 口癖と
// ペロの「ほどよいなぁ」は 使わない。だれも 倒されない（わな・駆除の 話は しない。柵の 内側から
// 見るだけ）。今ある 子どもの 足あとは、だれのかを 言わない。地の文・名札の 名前に「さん」を
// つけない。1ページ 3行 × 336px（textcheck2 と ashiatoText が 見る）。

export type AshiatoKind = 'ino' | 'haku' | 'tanu' | 'shika' | 'usagi' | 'inu';
export const ASHIATO_KINDS: AshiatoKind[] = ['ino', 'haku', 'tanu', 'shika', 'usagi', 'inu'];

// ================================================================ 1 はじまり

/** 牛舎の おてつだいの あと、見回り帳に 足す 1ページ（はじまる 前）。 */
export const ASHIATO_CHO_HINT = `@narr
いちばん うしろの ページは、
{w=300}『きょうの 客』。`;

/** マサル〔ashiato〕（1回）。 */
export const ASHIATO_START = `@npc_hoshi_gen
……その 灯り、{w=300}
足あとが よく 見えるな。
/
おれは、村の 獣害の 係だ。
{w=300}毎晩、柵の まわりの
足あとを 見る。
@narr
マサルは、見回り帳の
いちばん うしろを 開いた。
/
『きょうの 客』{w=300}
『イ 2　タ 1　シ 1』
@npc_kanenari
客？{w=300}
イノシシとか、{w=300}
お客さん あつかいなん？
@npc_hoshi_gen
来るんだから、客だ。{w=300}
……帰って もらうのも、{w=300}
おれの 仕事だ。
/
今夜の 分、{w=300}
ボウズが 数えて こい。
/
足あとは、うそを つかん。
{w=300}……人間よりは。`;

/** グソっ君が いないとき（ふつうは いる）：グソっ君の ページを 抜いた もの。 */
export const ASHIATO_START_SOLO = ASHIATO_START.replace(/@npc_kanenari\n[^@]*/, '');

export const ASHIATO_PAGE = `@narr
みました帳②の すみに、
しゅんの 字で『よるの 足あと』。`;

// ================================================================ 2 足あと（見つけた とき）

/** 見つけた ときの 地の文（1回目）。 */
export const ASHIATO_FIND: Record<AshiatoKind, string> = {
  ino: `@narr
ひづめが 2つ。{w=300}
うしろに、小さい 点が 2つ。
/
ハウスの 裾が、{w=300}
鼻で 掘りかえされている。`,
  haku: `@narr
戸の 柱の 下に、小さな 手の あと。
{w=300}5本ゆび。
/
柱にも、泥の 手の あと。
{w=300}……のぼっている。
/
天井の 近くの ビニールに、
{w=300}小さな すきま。`,
  tanu: `@narr
用水路の 岸の 泥に、
犬に 似た 足あと。
/
ゆびは 4本。{w=300}
……ゆびの 間が、広い。`,
  shika: `@narr
細い ひづめが 2つ。{w=300}
イノシシより、{w=300}
つま先が とがっている。
/
畦に 植えた 豆の 葉が、
先だけ かじられている。`,
  usagi: `@narr
台の 下に、かじった きゅうり。
{w=300}歯の あとが、小さい。
/
足あとは、小さい 丸が 2つ、
{w=300}その 前に、長いのが 2つ。`,
  inu: `@narr
小さな 犬の 足あと。{w=300}
軍手の 糸くずが、少し。
/
堆肥舎から、{w=300}
マサルの 家の 戸まで
続いている。`,
};

/** 見つけた あとの グソっ君（いる ときだけ）：知らせる 相手の ほのめかし。 */
export const ASHIATO_FIND_KANE: Record<AshiatoKind, string> = {
  ino: `@npc_kanenari
ペロさんの ハウスや。{w=300}
聞いて みよか。`,
  haku: `@npc_kanenari
ここも、ペロさんの ハウスや。`,
  tanu: `@npc_kanenari
集会所の 裏の ほうや。{w=300}
区長さんに、聞いて みよか。`,
  shika: `@npc_kanenari
トマじいの 田んぼや。{w=300}
聞いて みよか。`,
  usagi: `@npc_kanenari
料金箱かと 思たわ。{w=300}
……あいつも、跳ねよるし。
/
ソワカさんに、聞いて みよか。`,
  inu: `@npc_kanenari
マサルさんに、{w=300}
聞いて みよか。`,
};

/** 2回目からの 地の文（だれか わかったら、その 名前）。 */
export const ASHIATO_AGAIN: Record<AshiatoKind, { who: string; dunno: string }> = {
  ino: {
    who: `@narr
ハウスの 裾の 足あと。{w=300}
……イノシシの 足あと。`,
    dunno: `@narr
ハウスの 裾の 足あと。{w=300}
ひづめが 2つと、小さい 点が 2つ。`,
  },
  haku: {
    who: `@narr
戸の 柱の 下の 手の あと。
{w=300}……ハクビシンの 足あと。`,
    dunno: `@narr
戸の 柱の 下の 手の あと。
{w=300}5本ゆび。`,
  },
  tanu: {
    who: `@narr
用水路の 岸の 足あと。{w=300}
……タヌキの 足あと。`,
    dunno: `@narr
用水路の 岸の 足あと。{w=300}
ゆびの 間が、広い。`,
  },
  shika: {
    who: `@narr
畦の 細い ひづめの あと。
{w=300}……シカの 足あと。`,
    dunno: `@narr
畦の 細い ひづめの あと。
{w=300}つま先が、とがっている。`,
  },
  usagi: {
    who: `@narr
台の 下の 足あと。{w=300}
……ノウサギの 足あと。`,
    dunno: `@narr
台の 下の 足あと。{w=300}
長いのが、前に 2つ。`,
  },
  inu: {
    who: `@narr
堆肥舎から 続く 小さな 足あと。
{w=300}……ふくじんづけの 足あと。`,
    dunno: `@narr
堆肥舎から 続く 小さな 足あと。
{w=300}軍手の 糸くずが、少し。`,
  },
};

/** 段階2で はじめて 足あとを 見た とき（グソっ君、1回）。 */
export const ASHIATO_H2_KANE = `@npc_kanenari
みんな、山へ 帰りよる。`;

/** 『よるの 足あと』に 書きこんだ（場所と 数）。 */
export const ASHIATO_NOTE = (place: string, n: number): string => `@sys
『よるの 足あと』に 書きこんだ。
（${place}　${n}/6）`;

/** 犯人が わかって、書きこんだ。 */
export const ASHIATO_NOTE_WHO = (who: string): string => `@sys
『よるの 足あと』に 書きこんだ。
（${who}）`;

/** 6つ そろった。 */
export const ASHIATO_SIX = `@sys
『よるの 足あと』が 6つ そろった。
朱肉が 2 たまった。`;
export const ASHIATO_SIX_KANE = `@npc_kanenari
6つ、そろたで。{w=300}
マサルさんに、見せに 行こか。`;

// ================================================================ 2 知らせる（犯人が わかる）

/** しゅんが 知らせる（地の文、1ページ）。 */
export const ASHIATO_TELL: Record<AshiatoKind, string> = {
  ino: `@narr
ハウスの 裾の 足あとの ことを、
{w=300}ペロに 話した。`,
  haku: `@narr
3号ハウスの 戸の 手の あとの
ことを、ペロに 話した。`,
  tanu: `@narr
用水路の 岸の 足あとの ことを、
{w=300}区長に 話した。`,
  shika: `@narr
畦の 細い ひづめの あとの
ことを、トマじいに 話した。`,
  usagi: `@narr
販売所の 台の 下の 足あとの
ことを、ソワカに 話した。`,
  inu: `@narr
堆肥舎から 続く 足あとの
ことを、マサルに 話した。`,
};

/** 聞いた 人の 答え。 */
export const ASHIATO_ANSWER: Record<AshiatoKind, string> = {
  ino: `@npc_hoshi_mitsu
ああ。{w=300}
ミミズを 探して いたのさ。
/
トマトには、手を 出さない。
{w=300}……あれで、わきまえてる。`,
  haku: `@npc_hoshi_mitsu
……あいつか。{w=300}
いちばん 赤いのを、
いちばん 先に 食べる。
/
目利き なのさ。{w=300}
……おれと 同じだ。`,
  tanu: `@npc_hoshi_kucho
えー、それは タヌキで
ございます。
/
毎晩、集会所の 裏を
通って おります。
/
えー、寄り合いの 晩は、
{w=300}窓の 下で、最後まで
聞いて おります。`,
  shika: `@npc_hoshi_tome
シカじゃ。{w=300}
畦に 植えた 豆の 葉を、
先っぽだけ 食いよる。
/
……ぜいたくな やつじゃ。`,
  usagi: `@npc_hoshi_sawako
あら、また。{w=300}
……100円は、もらって
ないわねえ。
/
でも、きれいな 歯形 でしょう。
{w=300}描いて おいたの。
@narr
ソワカの スケッチブックに、
{w=300}きゅうりの 歯形が 7つ。
@npc_hoshi_sawako
足あと、うしろ足が
前に 来るのよ。{w=300}跳ぶから。
/
……前と うしろが、
あべこべの 絵に なるの。`,
  inu: `@npc_hoshi_gen
……あいつか。{w=300}
左手だけ、好きなんだ。
/
おれが、左手で
なでるから だろうな。`,
};

/** 答えの あとの グソっ君（いる ときだけ）。 */
export const ASHIATO_ANSWER_KANE: Partial<Record<AshiatoKind, string>> = {
  haku: `@npc_kanenari
トマトどろぼうと、
目利き くらべ すな！`,
  tanu: `@npc_kanenari
タヌキも、寄り合い
出とるんかい！
@npc_hoshi_kucho
えー、皆勤で ございます。`,
  shika: `@npc_kanenari
やわらかい 先っぽだけって、
{w=300}いちばん うまい とこ、
{w=300}知っとるんや。`,
};

/** マサル（イノシシの 足あとを 見た あと、1回）。 */
export const ASHIATO_GEN_NET = `@npc_hoshi_gen
ハウスの 裾は、{w=300}
ネットを もう 1段だ。`;

/** マサル（今ある 子どもの 足あとを 見た あと、1回。だれのかは 言わない）。 */
export const ASHIATO_GEN_KODOMO = `@narr
山道の ほうへ 続く、
小さな 運動ぐつの 足あとの
ことを 話した。
@npc_hoshi_gen
それは、数えん。{w=300}
……客じゃ ない。{w=300}
村の 子の だ。`;

// ---------------------------------------------------------------- ふくじんづけの 寝床と 軍手の 箱

/** マサルの 家の 犬の 寝床（⑥を 見た あと、いつもの 文の あとに）。 */
export const ASHIATO_NEDOKO = `@narr
寝床の 軍手は、ぜんぶ 左手。`;
/** 堆肥舎の 軍手の 箱（⑥を 見た あと）：寝床を 見た あとと、まだ 見ていない とき。 */
export const ASHIATO_GUNTE = {
  after: `@narr
……こっちは、ぜんぶ 右手。`,
  first: `@narr
……ぜんぶ 右手。`,
};

// ================================================================ 3 かくし：14本の 足

export const ASHIATO_GU_FIND = `@narr
灯りの 中に、{w=300}
細かい 点が、2列に 7つずつ。
@npc_kanenari
なんや、これ。{w=300}
虫か？{w=300}
いや、エビや カニの……
/
……わいや。`;

/** マサルに 知らせる。 */
export const ASHIATO_GU_TELL = `@narr
灯りの 中の、細かい 点の
ことを 話した。
@npc_hoshi_gen
客の 欄に、{w=300}
書いとくか。
@npc_kanenari
客ちゃうわ！{w=300}
……いや、客か。
/
ほな、また 来る 客や。
{w=300}書いといて。
@narr
見回り帳に、マサルの 字。
{w=300}『グ 1』。`;

// ================================================================ 4 うり坊を 数える

/** マサル（6つの あと）：ゲートの 内側へ。 */
export const URIBO_GO = `@npc_hoshi_gen
……ゲートの 内側へ 行くぞ。
{w=300}柵には、さわるなよ。`;
export const URIBO_COME = `@npc_hoshi_gen
……来るぞ。{w=300}
灯りを、低く しろ。`;
export const URIBO_SEE = `@narr
電気柵の 向こう、{w=300}
クズの 間で、黒い 背中が
動いた。`;
export const URIBO_SEE2 = `@narr
大きい 1頭の うしろに、{w=300}
小さいのが、ころころ
ついて いく。`;
export const URIBO_KANE = `@npc_kanenari
うり坊や……！{w=300}
ちっこ！
/
……しまが、{w=300}
うすうなっとる。`;
export const URIBO_NATSU = `@npc_hoshi_gen
夏の 終わりだからな。{w=300}
……もうすぐ、親と 同じ 色だ。`;
export const URIBO_COUNT = `@npc_hoshi_gen
数えろ。`;
/** まちがえた とき（何度でも）。 */
export const URIBO_AGAIN = `@npc_hoshi_gen
……もう 1回 通る。{w=300}
あいつらは、律儀だ。`;
export const URIBO_OK = `@narr
1、2、3、4……{w=300}5。`;
export const URIBO_TURN = `@narr
親の イノシシは、{w=300}
柵の 前で 鼻を 1回 鳴らして、
{w=300}山の ほうへ 向きを 変えた。`;
export const URIBO_KAETTA = `@npc_hoshi_gen
……帰った。`;
export const URIBO_HONNE = `@npc_hoshi_gen
腹が 立つ 夜も ある。{w=300}
ハウスの 裾を 掘られた
朝は、とくにな。
/
でも、柵の 外は、{w=300}
あいつらの 山だ。
/
数えて、見送る。{w=300}
……今夜の 客は、{w=300}
これで しまいだ。`;
export const URIBO_CHO = `@narr
見回り帳の『きょうの 客』に、
{w=300}しゅんの 字が ならんだ。`;
/** しゅんの 字の 2行（グは マサルに 知らせた ときだけ）。 */
export const URIBO_LIST = (gu: boolean): string => `@narr
『イ 1　うり坊 5　ハ 1　タ 1』
『シ 1　ウ 1　犬 1${gu ? '　グ 1' : ''}』`;
export const URIBO_YOSHI = `@narr
その 下に、マサルの 太い 字で
{w=300}『よし』。`;
export const URIBO_REWARD = `@sys
朱肉が 2 たまった。
みました帳 ②の 表紙に、うり坊の シール。`;

/** 小窓の 言葉。 */
export const URIBO_UI = {
  place: '電気柵の ゲートの 内側',
  count: 'ひき',
  hint: '灯りの はしを 横切ったら 数える',
  /** 見回り帳の カード（小窓）。 */
  card: { title: 'きょうの 客', yoshi: 'よし' },
};

// ================================================================ 5 そのあと

/** 電柱の 張り紙（うり坊の あと、いつもの 文の あとに）。 */
export const ASHIATO_HARIGAMI = `@narr
すみに、小さく『絵 ソワカ』。
{w=300}……うり坊も、5ひき
描いてある。`;
/** ⑤を ソワカに 聞いた 人だけ。 */
export const ASHIATO_HARIGAMI_KANE = `@npc_kanenari
ソワカさん、{w=300}
数えとったんや。`;

/** 見回り帳（うり坊の あと／グ 1 の あと）。 */
export const ASHIATO_CHO_AFTER = {
  yoshi: `@narr
いちばん うしろの ページに、
{w=300}しゅんの 字と、『よし』。`,
  gu: `@narr
いちばん うしろの ページに、
{w=300}『グ 1』。`,
  both: `@narr
いちばん うしろの ページに、
{w=300}しゅんの 字と、『よし』。
{w=300}……『グ 1』。`,
};

// ================================================================ みました帳②の すみの 1ページ

export const ASHIATO_BOOK = {
  title: 'よるの 足あと',
  /** 見つける 前（鉛筆の 薄い 字）・見つけた あと・犯人。 */
  rows: {
    ino: { place: 'ハウスの 路地', who: 'イノシシ' },
    haku: { place: '3号ハウスの 戸', who: 'ハクビシン' },
    tanu: { place: '用水路の 岸', who: 'タヌキ' },
    shika: { place: '棚田の 畦', who: 'シカ' },
    usagi: { place: '販売所の 台', who: 'ノウサギ' },
    inu: { place: '堆肥舎の 前', who: 'ふくじんづけ' },
  } as Record<AshiatoKind, { place: string; who: string }>,
  unknown: '？',
  uribo: 'うり坊 5',
  meijin: '数え名人',
  gu: 'グ 1',
  /** 数えた 回数（1回で ぴったり でなければ）。 */
  tries: (n: number): string => `（${n}回目）`,
};

/** textcheck2 が 見る ページ。 */
export const ASHIATO_TEXTS: Record<string, unknown> = {
  choHint: ASHIATO_CHO_HINT,
  start: ASHIATO_START,
  startSolo: ASHIATO_START_SOLO,
  page: ASHIATO_PAGE,
  find: ASHIATO_FIND,
  findKane: ASHIATO_FIND_KANE,
  again: ASHIATO_AGAIN,
  h2: ASHIATO_H2_KANE,
  note: ASHIATO_NOTE('3号ハウスの 戸', 6),
  noteWho: ASHIATO_NOTE_WHO('ふくじんづけ'),
  six: ASHIATO_SIX,
  sixKane: ASHIATO_SIX_KANE,
  tell: ASHIATO_TELL,
  answer: ASHIATO_ANSWER,
  answerKane: ASHIATO_ANSWER_KANE,
  genNet: ASHIATO_GEN_NET,
  genKodomo: ASHIATO_GEN_KODOMO,
  nedoko: ASHIATO_NEDOKO,
  gunte: ASHIATO_GUNTE,
  guFind: ASHIATO_GU_FIND,
  guTell: ASHIATO_GU_TELL,
  go: URIBO_GO,
  come: URIBO_COME,
  see: URIBO_SEE,
  see2: URIBO_SEE2,
  kane: URIBO_KANE,
  natsu: URIBO_NATSU,
  count: URIBO_COUNT,
  again2: URIBO_AGAIN,
  ok: URIBO_OK,
  turn: URIBO_TURN,
  kaetta: URIBO_KAETTA,
  honne: URIBO_HONNE,
  cho: URIBO_CHO,
  list: URIBO_LIST(true),
  yoshi: URIBO_YOSHI,
  reward: URIBO_REWARD,
  harigami: ASHIATO_HARIGAMI,
  harigamiKane: ASHIATO_HARIGAMI_KANE,
  choAfter: ASHIATO_CHO_AFTER,
};
