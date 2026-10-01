// 朝の ほうだけ 光る 星（第2章・段階2の 寄り道。げむきか 10/1 の 3、02_ch2_index #77、
// 50 3.7・9.8・9.9・10.25、52 4.7・7.7、53 8.17・12.20）。
//
//   まつ先生 (47,2) の〔dome〕（段階2、よびごえの つぎに 話した 1回）で 天文台の 鍵 →
//   丘の 扉 (4,5) から 村営 天文台の 中 map_hoshi_dome → カバーを とると タクミの
//   観望会カード（『くもり。つぎの 晴れた 朝に。』）が 落ちる → スリットを 手回しで 開ける →
//   ドームを 回す → ふたを とる → 接眼レンズで ①金星 ②オリオン座の 星雲 ③すばる →
//   まつ先生に 見せると〔kanbo〕：赤ペンの はなまる、カードは タクミへ（エンディングの
//   カット3で さんかどに）。朱肉 +2。
//
// 星の 見え方は 夏の 終わりの 夜明け前（北緯35度ほど）で 本当に 見える もの：金星（明けの
// 明星。半分＝東の 最大離角の ころ。光る 側は 地平線の 下の 太陽の 側。望遠鏡の 中は 上下
// 左右が さかさまなので、上に 見える）、オリオン座の 大星雲（三つ星の 下の 小三つ星の まん中。
// 目には 灰色の 雲、まん中に 台形の 4つの 星）、すばる（ほとんど 真上。目で 6〜7つ、
// 望遠鏡で たくさん）。年と 日付と 時刻は 言わない（50 の 決まり。金星は「明けの明星」の まま）。
//
// どのページも 3行 × 336px 以内（textcheck2）。画面の 小さな 言葉は domeText が 見る。
// 名札・地の文の 名前に「さん」を つけない。放送が 呼ぶ 名前は 段階2の 書き方で 1回だけ
// （ノートの 最後。「……タクミくん。」）。

// ---------------------------------------------------------------- まつ先生（山道の入口 (47,2)）

/** 〔dome〕 段階2、よびごえの あとに 話した はじめの 1回（flag_dome_key）。 */
export const DOME_KEY = `@npc_hoshi_fumi
しゅんさん、これを。{w=300}
天文台の 鍵です。
/
10年、開けて いません。{w=300}
最後の 観望会は、くもりの 朝でした。
/
東の、あの またたかない 星を、
天文台の 望遠鏡で、
見て あげて ください。
/
中で 明かりを 使うなら、
赤いのが いいんです。{w=300}
目が、夜の まま で いられる。
/
……その トマトなら、ちょうど いい。`;

export const DOME_KEY_GET = `@sys
天文台の鍵を 受けとった！`;

export const DOME_KEY_KANE = `@npc_kanenari
望遠鏡て、遠くの もんが
でっかく 見える やつやろ？{w=300}
……わくわく するな。`;

/** 鍵を 持っていて、まだ 3つ 見ていない あいだ（〔dome_2〕。くり返し）。 */
export const DOME_FUMI_WAIT = `@npc_hoshi_fumi
天文台は、丘の 上の 西。{w=300}
白い ドームですよ。`;

/** 〔kanbo〕 3つ 見た カードを 持って 話した 1回（flag_kanbo_report）。 */
export const KANBO_REPORT_A = `@npc_hoshi_fumi
……おや。{w=300}その カードは。`;

/** カードを 見たあと（しゅんの 字の 3つの 欄）。 */
export const KANBO_REPORT_B = `@npc_hoshi_fumi
タクミくんの カード。{w=300}
……字が、ちがいますね。
/
半分、でしたか。{w=300}
朝の ほうだけ 光っている。
/
金星は、地球より 内がわを
回って いますからね。{w=300}
月のように、満ち欠けを するんです。
/
鳥は、星の 生まれる 雲。{w=300}
すばるは、若い 星の
あつまりです。
/
星は、にげませんでしたか。
@npc_kanenari
ぜんぜん。{w=300}
じっと しとったで。
@npc_hoshi_fumi
ふだんは、にげるんですよ。{w=300}
地球が、回って いますから。
/
今夜は、追いかけなくて
よかったでしょう。{w=300}
……星も、待って いて くれた。`;

/** 赤ペンの はなまるの あと（カードの 大写しが 閉じてから）。 */
export const KANBO_REPORT_C = `@narr
赤ペンの はなまる。{w=300}
『つぎの 晴れた 朝に。』の となり。
@npc_hoshi_fumi
この カード、タクミくんに
送っても いいですか。
/
つづきを 見て くれた 子が
いましたよ、って。{w=300}
……観望会も、また ひらきます。
/
朝に なったら、
みんなで 見ましょう。{w=300}
明けの明星は、朝の 星ですから。
/
鍵は、朝まで 持って いて ください。
{w=300}天文台は、開けた ままで。`;

export const KANBO_REWARD = `@sys
朱肉が 2 たまった。`;

/** 家の 缶の 金平糖を もう 見つけていた（flag_ch2_find_fumi_konpeito）。 */
export const KANBO_KONPEITO_FOUND = `@npc_hoshi_fumi
家の 缶の 金平糖は、
観望会の ごほうびでした。{w=300}
……星の 形でしょう。`;

/** まだ 見つけていない：家の 缶を 教える。 */
export const KANBO_KONPEITO_TELL = `@npc_hoshi_fumi
家の 本棚の 缶に、金平糖が
1つ 残って いるはずです。{w=300}
観望会の ごほうびです。どうぞ。
@npc_kanenari
星の 形の おかし……！{w=300}
あとで、もらいに 行こな。`;

/** 〔kanbo〕の あと、つぎに 話した 1回（flag_kanbo_after）。 */
export const KANBO_AFTER = `@npc_hoshi_fumi
丘の 上の ドームから、
星あかりが こぼれて いますね。
{w=300}……10年ぶりです。`;

// ---------------------------------------------------------------- エンディング（カット3）

/**
 * カット3の 転回場（flag_kanbo_report のとき）：まつ先生の「はっち先生に、よろしく。」の
 * あと、さんかど (37,43) に 封筒を わたす（約4秒と 2ページ）。
 */
export const KANBO_END = `@npc_hoshi_fumi
さんかどさん、これも。{w=300}
タクミくんに、観望会の
お知らせです。
@npc_hoshi_busdriver
宛名、たしかに。`;

// ---------------------------------------------------------------- 星見の丘（扉 (4,5)）

/** 鍵が ない 段階2、扉を 調べた あとに 1回（flag_dome_hint）。 */
export const DOME_DOOR_HINT = `@npc_kanenari
中、見て みたいなあ。{w=300}
星の ことなら、まつ先生に
聞いて みよか。`;

/** 鍵を 持って 扉を 調べたとき（中へ）。 */
export const DOME_DOOR_OPEN = `@narr
鍵を 回した。{w=300}
……10年ぶりの 音が した。`;

/** 中を 見たあと、丘の 小窓（obj_hr_dome_mado）。 */
export const DOME_MADO_OPEN = `@narr
天文台の 小窓から、
中を のぞいた。
/
カバーを はずした 望遠鏡に、
天井の すきまから 星あかり。`;

// ---------------------------------------------------------------- 天文台の中（map_hoshi_dome）

/** はじめて 入ったとき（evt_dome_enter。1回）。 */
export const DOME_ENTER = `@narr
まっくらだ。{w=300}
ほこりと、古い 油の におい。
/
トマトの 灯りが、丸い 部屋を
赤く 照らした。
@npc_kanenari
……ほんまや。{w=300}
この 明かり、目に やさしいわ。`;

/** 望遠鏡（カバー つき）。 */
export const SCOPE_COVER = `@narr
布の カバーを かぶった、
大きな 望遠鏡。{w=300}
ほこりが、白く つもっている。
? カバーを とる | やめておく`;

export const SCOPE_COVER_OFF = `@narr
……ばさっ。
@npc_kanenari
けほっ、けほっ。{w=300}
10年ぶんの ほこりや。
@narr
白い 筒の 望遠鏡。{w=300}筒の 先に ふた。
台の 軸が 1本、北の 壁の 上を
さしている。{w=300}……北極星の ほうだ。
/
カバーの ひだから、
カードが 1枚 落ちた。`;

/** カードの 大写しの あと。 */
export const SCOPE_CARD = `@narr
答えの 欄は、3つとも 白い。
{w=300}……10年前の、くもりの 朝。`;

export const SCOPE_CARD_GET = `@sys
タクミの観望会カードを 手に入れた！`;

export const SCOPE_CARD_KANE = `@npc_kanenari
つぎの 晴れた 朝、か。{w=300}
……10年、待っとったんやな。`;

/** カバーを とった あと、スリットが 閉じている。 */
export const SCOPE_SHUT = `@narr
望遠鏡の 先の 天井は、
閉じた ままだ。`;
export const SCOPE_SHUT_KANE = `@npc_kanenari
空、見えへんな。{w=300}
あの 壁の ハンドル ちゃう？`;

/** スリットは 開いたが、ドームが つぎの 星の 方角を 向いていない。 */
export const SCOPE_WRONG_1 = `@narr
スリットの 外は、
ちがう 方角の 空。
@npc_kanenari
東の、あの 星やろ。{w=300}
ドーム、回さな あかんな。`;
export const SCOPE_WRONG = `@narr
カードの つぎの 星は、
スリットの 外だ。{w=300}
……ドームを 回さないと。`;

/** はじめて 金星に 向いたとき：ふた。 */
export const SCOPE_CAP = `@narr
筒の 先に、ふたが してある。
? ふたを とる | のぞいて みる`;
export const SCOPE_CAP_PEEK = `@narr
……まっくら。
@npc_kanenari
ふた、しとるやん。`;
export const SCOPE_CAP_OFF = `@narr
かぽっ。{w=300}
……10年ぶりの 夜空だ。`;

/** 接眼レンズを のぞく 前の 1ページ（星ごと）。 */
export const SCOPE_AIM: Record<1 | 2 | 3, string> = {
  1: `@narr
筒を、またたかない 星へ
ぐっと 向けて、のぞいた。`,
  2: `@narr
三つ星の 下に、小さく 縦に 3つ。
{w=300}その まん中の、ぼんやりした
ところへ 向けた。`,
  3: `@narr
筒を、ほとんど 真上へ。{w=300}
しゃがんで、のぞいた。`,
};

/** はじめて 押した ほうへ 光が 逃げたとき（1回。flag_dome_gyaku）。 */
export const EYE_GYAKU = `@npc_kanenari
逆やん！{w=300}
押した ほうに、逃げよるで！`;

/** はじめて まん中に 入ったとき（ピントの 前。1回）。 */
export const EYE_SAKASAMA = `@narr
望遠鏡の 中は、上も 下も、
右も 左も、さかさま らしい。`;

/** 金星（ピントが 合って 見た）。 */
export const SEE_VENUS = `@narr
……星じゃ ない。{w=300}
半分だけ 光った、
小さな 月みたいな 形。
/
光って いる ほうは、上。{w=300}
……さかさま だから、
ほんとうは 下の ほう。
/
地平線の 下の、
まだ のぼらない 朝日の ほうだ。`;
export const SEE_VENUS_KANE = `@npc_kanenari
朝の ほうだけ、光っとるんか。
{w=300}……ずっと、朝の ほう
見とるんやな。`;

/** オリオン座の 星雲。 */
export const SEE_ORION = `@narr
星の まわりに、うすい 雲。{w=300}
羽を 広げた 鳥みたいだ。
/
ピントを 合わせても、
雲は 雲の まま。{w=300}
まん中に、小さな 星が 4つ。
/
……星は、じっと している。`;
export const SEE_ORION_KANE = `@npc_kanenari
カードに『にげるよ』て
書いてあったのに。
/
……そうか。{w=300}
止まっとるから、星も
逃げへんのや。`;

/** すばる。 */
export const SEE_SUBARU = `@narr
星が、いっぱい。{w=300}
数え きれない。
/
目で 見た 7つの あいだにも、
小さな 星が、ぎっしり。
@npc_kanenari
わいにも 見せて。`;
/** グソっ君が のぞく（複眼の 画面の あと）。 */
export const SEE_SUBARU_KANE = `@npc_kanenari
……星が いっぱいに なったわ。
{w=300}わいの 目ぇ、つぶつぶ
やからな。`;
/** カードの すばるの 欄の となりに、ふるえた 字。 */
export const SEE_SUBARU_MOTTO = `@narr
となりに、ふるえた 字で
『もっと』。
@npc_kanenari
わいの 分や。`;

/** カードの 欄に 書いたあと（1つめ・2つめ）：つぎの 星へ。 */
export const NEXT_KANE: Record<1 | 2, string> = {
  1: `@npc_kanenari
つぎは、オリオン座の 星雲やて。
{w=300}ドーム、回そか。`,
  2: `@npc_kanenari
最後は、すばる。{w=300}
……真上の ほう ちゃうか。`,
};

/** 3つとも 書いた。 */
export const ALL_DONE = `@npc_kanenari
3つとも、見たで！{w=300}
まつ先生に、見せに 行こ。`;

/** 3つ 見た あとの 望遠鏡。 */
export const SCOPE_DONE = `@narr
望遠鏡は、すばるを 向いた まま。
{w=300}……星は、じっと している。`;

// ---- 見上げる 画面（スリットと ドーム）

/** スリットの ハンドル。 */
export const CRANK_SLIT = `@narr
壁の ハンドル。{w=300}
札に『スリット』。
? 回す | やめておく`;
/** スリットが 開いた（見上げる 画面の 上で）。 */
export const SLIT_OPEN = `@narr
天井に、星の 帯が 1本 開いた。
@npc_kanenari
細い すきまから、星が
降って くるみたいや。
/
……なんや、なつかしいわ。`;
export const CRANK_SLIT_DONE = `@narr
スリットは、開いている。{w=300}
星あかりが、床に 細く 落ちている。`;

/** ドームの ハンドル。 */
export const CRANK_ROT_SHUT = `@narr
壁の ハンドル。{w=300}札に『ドーム』。
/
……すきまが 閉じた ままでは、
回しても 空は 見えない。`;
export const CRANK_ROT = `@narr
壁の ハンドル。{w=300}札に『ドーム』。
? 回す | やめておく`;
export const CRANK_ROT_DONE = `@narr
ドームは、すばるの ほうを
向いている。`;

/** ドームが 星に 向いて 止まったとき（星ごと）。 */
export const ROT_STOP: Record<1 | 2 | 3, string> = {
  1: `@narr
スリットの まん中に、
またたかない 星が 来た。`,
  2: `@narr
スリットに、3つ ならんだ 星。
{w=300}オリオン座の、三つ星だ。`,
  3: `@narr
スリットの 上の ほうに、
小さな 星の かたまり。`,
};
/** すばるを 目で 数える（ドームが 向いたとき、1回）。 */
export const ROT_COUNT = `@narr
目で 数えた。{w=300}
1、2、3、4、5、6……
/
……目を こらすと、7つ。`;

// ---- 部屋の 物

export const NOTE = `@narr
机に、ノート。{w=300}
表紙に『観望会の 記録』。
/
ページごとに、日付と
見た 星の 名前。{w=300}
子どもの 字が 並んでいる。
/
『土星の わっか、ほんとに あった。
タクミ（小3）』{w=300}
赤い はなまる。
/
『月の クレーター 23こ。
タクミ（小5）』
/
『星は すぐ にげる。{w=300}
赤道儀の ハンドルは、ぼくの 係。
タクミ（中1）』
/
タクミの 字は、ページごとに
大きく なっていく。
/
最後の ページ。{w=300}
『春から、町の 高校。
星の 部活に 入ります。 タクミ』
/
壁の 向こうで、放送が
呼んでいる。{w=300}
『……タクミくん。』
@npc_kanenari
町でも、星 見とるんやろな。`;
export const NOTE_AGAIN = `@narr
『観望会の 記録』。{w=300}
最後の ページの つぎは、白い。`;

export const LIGHTBOX = `@narr
段ボール箱に
『観望会用 赤い ライト』。
/
懐中電灯に、赤い セロハンが
輪ゴムで とめてある。{w=300}
……電池は、切れている。`;
export const LIGHTBOX_KANE = `@npc_kanenari
トマトの ほうが、ええ 赤や。`;

export const CHAIRS = `@narr
パイプいすが、重ねてある。{w=300}
いちばん 下に、子ども用の 踏み台。
/
踏み台に、マジックで『タクミ』。
{w=300}線で 消して、『だれでも』。`;

export const PHOTO = `@narr
観望会の 写真。{w=300}
ドームの 前で、子どもたちが
空を 指さしている。
/
まん中に、まつ先生。{w=300}
はしの 背の 低い 子が、
望遠鏡の ふたを かかえている。
/
……放送が、写真の 子たちの
名前を 呼んでいる。{w=300}
みんな、楽しそうに 笑っている。`;

/** 星座早見盤（机の 上）。 */
export const HAYAMI = `@narr
大きな 星座早見盤。{w=300}
8月の 末の、夜明け前に
合わせてある。
/
東に、冬の 星座が
もう のぼっている。`;

// ---------------------------------------------------------------- 大写しの カード（観望会 カード）

/** カードに 印刷された 字（まつ先生が 作った カード）と、書かれた 字。 */
export const CARD = {
  title: '観望会 カード',
  nameLabel: 'なまえ',
  name: 'タクミ',
  sub: '☆ 夜明け前の 星を 見よう',
  q: ['1 明けの明星（金星）　かたちは？', '2 オリオン座の 星雲　なにに 見える？', '3 すばる　星は いくつ？'],
  /** しゅんが 書く 答え（1つめは 半分の 丸の 絵の あとに）。 */
  a: ['朝の ほうだけ 光ってる', '鳥。まん中に 星が 4つ。', '目で 7つ。望遠鏡で いっぱい。'],
  motto: 'もっと',
  foot: '星は すぐ にげるよ。おいかけよう。',
  teacher: 'くもり。つぎの 晴れた 朝に。',
};

// ---------------------------------------------------------------- 画面の 小さな 言葉（domeText が 幅を 見る）

export const DOME_WORD = {
  /** 星の 名前（札と ドームの 画面の 名札）。 */
  star: ['金星', 'オリオン座の 星雲', 'すばる'] as const,
  /** 左上の 札：n つめ。 */
  tape: (n: number) => `${n}つめ　${['金星', 'オリオン座の 星雲', 'すばる'][n - 1]}`,
  aim: 'ハンドルを 回す',
  focus: 'ピントを 合わせる',
  look: '見る',
  center: 'まん中！',
  mash: '連打！',
  crank: '回す',
  rot: 'ドームを 回す',
  /** ドームの 画面を 出る（星の 前でなくても）。 */
  back: 'やめる',
  stop: 'カチッ',
  goro: 'ゴロゴロ',
  gi: 'ギ……',
  dir: ['北', '東', '南', '西'] as const,
  /** 接眼の 画面で、ピントが 合ったとき（けっていの ボタンにも）。 */
  sharp: '見る！',
};

/** textcheck2 が 見る ページ。 */
export const DOME_PAGES: Record<string, string> = {
  key: DOME_KEY,
  keyGet: DOME_KEY_GET,
  keyKane: DOME_KEY_KANE,
  fumiWait: DOME_FUMI_WAIT,
  reportA: KANBO_REPORT_A,
  reportB: KANBO_REPORT_B,
  reportC: KANBO_REPORT_C,
  reward: KANBO_REWARD,
  konpeitoFound: KANBO_KONPEITO_FOUND,
  konpeitoTell: KANBO_KONPEITO_TELL,
  after: KANBO_AFTER,
  end: KANBO_END,
  doorHint: DOME_DOOR_HINT,
  doorOpen: DOME_DOOR_OPEN,
  madoOpen: DOME_MADO_OPEN,
  enter: DOME_ENTER,
  cover: SCOPE_COVER,
  coverOff: SCOPE_COVER_OFF,
  card: SCOPE_CARD,
  cardGet: SCOPE_CARD_GET,
  cardKane: SCOPE_CARD_KANE,
  shut: SCOPE_SHUT,
  shutKane: SCOPE_SHUT_KANE,
  wrong1: SCOPE_WRONG_1,
  wrong: SCOPE_WRONG,
  cap: SCOPE_CAP,
  capPeek: SCOPE_CAP_PEEK,
  capOff: SCOPE_CAP_OFF,
  aim1: SCOPE_AIM[1],
  aim2: SCOPE_AIM[2],
  aim3: SCOPE_AIM[3],
  gyaku: EYE_GYAKU,
  sakasama: EYE_SAKASAMA,
  venus: SEE_VENUS,
  venusKane: SEE_VENUS_KANE,
  orion: SEE_ORION,
  orionKane: SEE_ORION_KANE,
  subaru: SEE_SUBARU,
  subaruKane: SEE_SUBARU_KANE,
  subaruMotto: SEE_SUBARU_MOTTO,
  next1: NEXT_KANE[1],
  next2: NEXT_KANE[2],
  allDone: ALL_DONE,
  scopeDone: SCOPE_DONE,
  crankSlit: CRANK_SLIT,
  slitOpen: SLIT_OPEN,
  crankSlitDone: CRANK_SLIT_DONE,
  rotShut: CRANK_ROT_SHUT,
  rot: CRANK_ROT,
  rotDone: CRANK_ROT_DONE,
  stop1: ROT_STOP[1],
  stop2: ROT_STOP[2],
  stop3: ROT_STOP[3],
  count: ROT_COUNT,
  note: NOTE,
  noteAgain: NOTE_AGAIN,
  lightbox: LIGHTBOX,
  lightboxKane: LIGHTBOX_KANE,
  chairs: CHAIRS,
  photo: PHOTO,
  hayami: HAYAMI,
};
