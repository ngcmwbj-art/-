// 上の 柵ぞいの 見回り（第2章。2026-10-13 依頼主の採用：げむきか 10/11 の 案3〈厳選5案の 3〉。
// 02_ch2_index #99、50 10.34、52 4.9）。台本は events/ch2/sakuzoi.ts、地図は data/maps/hoshi_sakuzoi.ts。
//
//   段階1〜2（トマトの 灯り、ゲートが 開いた あと、グソっ君が いっしょ）：
//   1 ランプが 弱い：電気柵の 電源の 箱 obj_hoshi_dengen（ふだんの 文の あと）→ グソっ君「マサルに 言うとこか」。
//     マサル〔saku〕（段階1は 牛舎で、ランプを 見た あと。段階2は ゲートの 横で、その場で 箱を 見る）
//     →『柵の テスター』を 借りる → 暗転 → 上の 柵ぞい（map_hoshi_sakuzoi）の 東の はし。
//   2 柵の 外へ：マサルが 西の はしまで 測る 前に、ここで 1回 当てる（針は 黄）→ 区間の スイッチを 切る（針は 赤）。
//   3 直す 所 6つ（どの 順でも よい。灯りが 近いと 光る）：クズの つる 2・杉の 枝 1・掘られた 土 1・
//     内側の 畦草 2（1つ目で マサルと トマじいが 柵を はさんで 言い合い、大写し「畦」で 細い 葉の 草だけ 刈る）。
//   4 森の 目（電気を 切っている あいだ。ゲージ）：半分で シカの 目が 2つ、いっぱいで タヌキも 来て 4つ
//     → 森へ 灯りを 向けると 帰る（評価が 1つ 下がる）。こわく しない（顔の 形が 見える。だれも 倒されない）。
//   5 入れる：東の はしの スイッチ → 西の はし（電源から いちばん 遠い 所）で、マサルが テスターを 線と 地面に
//     当てる → 針が 緑へ →「……生きとる。」→ 評価（良し・まあ 良し・もう 1回）。朱肉 +2（「良し」で +1）。
//   6 そのあと：見回り帳の 行・電源の 箱の 文・支柱の 番号札（マサルの 字）・みました帳②の すみ『上の 柵』。
//
// 電気柵の 事実（依頼主に 確かめて もらう 所。docs/design/02_ch2_index.md #99）：草・クズの つる・枝が 線に
// さわると 漏電して 電圧が 下がる／見回りで テスターを 線と 地面（アース）に 当てて 測る／草を 刈る ときは
// 電源を 切る／イノシシは 柵の 下を 鼻で 掘って くぐる。電圧の 数字は 出さない（針の 色だけ）。
//
// 決まり：第2章の 台詞に 時刻の 数字・「まだ」「12人」「具足様」「平和」「17」「3人」を 入れない。マサルの 口癖
// 「誰が らっきょやねん！」は 言いかけて やめるだけ（「……誰が」。回数に 数えない）。地の文・名札に「さん」を
// つけない。1ページ 3行 × 336px（textcheck2 と sakuzoiText が 見る）。

export type SakuSpot = 'kuzu1' | 'kuzu2' | 'eda' | 'tsuchi' | 'aze1' | 'aze2';
/** 直す 所（東から 西への 並び）。 */
export const SAKU_SPOTS: SakuSpot[] = ['tsuchi', 'eda', 'kuzu1', 'kuzu2', 'aze1', 'aze2'];

// ================================================================ 1 ランプが 弱い

/** 電源の 箱（ふだんの 文の あと。はじまる 前、1回）。 */
export const SAKU_LAMP = `@narr
……緑の ランプが、{w=300}
いつもより 少し 暗い。
@npc_kanenari
なんか、{w=300}
元気 ないな、この 箱。
{w=300}マサルに 言うとこか。`;

/** 電源の 箱（ランプを 見た あと、見回りの 前）。 */
export const SAKU_LAMP_AGAIN = `@narr
ランプは、{w=300}
やっぱり 少し 暗い。`;

/** 電源の 箱（見回りの あと）。 */
export const SAKU_LAMP_AFTER = `@narr
……ランプは、{w=300}
くっきり 点いている。`;

/** マサル〔saku〕段階1（牛舎。ランプを 見た あと）。 */
export const SAKU_START_H1 = `@npc_kanenari
マサル、{w=300}
電気柵の 箱の ランプ、
いつもより 暗かったで。
@npc_hoshi_gen
……暗い？`;

/** マサル〔saku〕段階2（ゲートの 横。その場で 箱を 見る）。 */
export const SAKU_START_H2 = `@narr
マサルが、電源の 箱を
のぞきこんだ。{w=300}
……緑の ランプが、少し 暗い。`;

/** 2つの 段階で 同じ 続き。 */
export const SAKU_START = `@npc_hoshi_gen
……電気が、にげとる。{w=300}
どこかで 草が、{w=300}
線に さわっとるな。
/
上の 柵だ。{w=300}
森の すその、外側。
{w=300}……朝に 回る つもりだった。
@npc_kanenari
朝、来えへんもんな。{w=300}
わいら、灯り あるで。
@npc_hoshi_gen
……ついて来い。{w=300}
柵には、さわるなよ。`;

export const SAKU_TESTER_GET = `@narr
マサルから、{w=300}
『柵の テスター』を 借りた。`;

export const SAKU_TESTER_RULE = `@npc_hoshi_gen
針だけ 見とけ。{w=300}
線に 当てるのは、おれだ。`;

// ================================================================ 2 柵の 外へ

/** 東の はし：まず 1回 当てる（針は 黄）。 */
export const SAKU_OUT_MEASURE = `@narr
マサルが、テスターの 先を
上の 線に、{w=300}もう 片方を
地面に さした。`;

export const SAKU_OUT_LOW = `@npc_hoshi_gen
……下がっとる。{w=300}
赤まで いかんが、
緑にも とどかん。`;

/** スイッチを 切る（!cue off）。 */
export const SAKU_OUT_OFF = `@npc_hoshi_gen
この 区間だけ、{w=300}
電気を 切る。
/
切らずに 草を 刈る やつは、
{w=300}ばかだ。
!cue off
@narr
カチッ、カチッ と 鳴っていた
箱の 音が、{w=300}止んだ。
@npc_hoshi_gen
切っとる あいだは、{w=300}
けものが 来ても、{w=300}
止まらん。{w=300}……急げ。
@npc_kanenari
わいの よろい、{w=300}
電気 通すんかな。
@npc_hoshi_gen
試すな。`;

export const SAKU_OUT_GUIDE = `@narr
灯りを 近づけると、{w=300}
直す 所が 見えてくる。`;

// ================================================================ 3 直す 所

/** クズの つる 1つ目（!cue cut）。 */
export const SAKU_KUZU1 = `@narr
クズの つるが、森から
のびて、{w=300}下の 線に
巻きついている。
@npc_hoshi_gen
森は、{w=300}
毎日 こっちへ 手を のばす。
@npc_kanenari
根もとは、{w=300}
わいに 任しとき。
!cue cut
@narr
チョキン。{w=300}
マサルが、線から つるを
ほどいた。
@npc_kanenari
わいの 手、{w=300}
草刈りに ちょうど ええな。`;

/** クズの つる 2つ目。 */
export const SAKU_KUZU2 = `@narr
ここにも、クズの つる。
{w=300}上の 線まで、
のぼっている。
!cue cut
@narr
チョキン。{w=300}
マサルが つるを ほどいて、
森の ほうへ 投げた。
@npc_kanenari
森の 手、{w=300}
多いな。`;

/** 杉の 枝（!cue carry）。 */
export const SAKU_EDA = `@narr
杉の 枝が 1本、{w=300}
2段の 線に、
のっかっている。
@npc_kanenari
よっしゃ、{w=300}
わいが 持ってったる。
!cue carry
@npc_kanenari
おっと、重たいな。{w=300}
……こう見えて、{w=300}
わいも 重いけど。
@narr
グソっ君は、たくさんの 足で
枝を かかえて、{w=300}
森へ もどした。`;

/** 掘られた 土（!cue fill）。 */
export const SAKU_TSUCHI = `@narr
柵の 下の 土が、{w=300}
えぐれている。{w=300}
鼻で 掘った あとだ。
@npc_hoshi_gen
イノシシだ。{w=300}
下の 線の 下が すいとると、
{w=300}くぐられる。
/
土を 入れて、{w=300}
ならしとけ。
!cue fill
@narr
しゅんが 手で 土を 寄せる。
{w=300}グソっ君の 足が、
いっせいに 土を ふんだ。
@npc_hoshi_gen
……よし。{w=300}
すき間が、なくなった。`;

/** 畦草 1つ目：柵を はさんで（!cue tome で トマじいが 来る）。 */
export const SAKU_AZE1 = `@narr
柵の 内側から、畦の 草が
のびて、{w=300}下の 線に
さわっている。
!cue tome
@npc_hoshi_gen
この 草は、{w=300}
トマじいの 畦の だ。
@npc_hoshi_tome
この 柵は、{w=300}
マサルの じゃ。
@narr
2人は、柵を はさんで
しばらく だまった。
@npc_kanenari
どっちも 正しいな！{w=300}
ほな、草は わいが 刈ったる。
{w=300}柵の こっちも、あっちも。
@npc_hoshi_tome
豆は 刈るなよ。{w=300}
畦の 豆は、{w=300}
わしの 冬の 味噌じゃ。`;

/** 畦草 2つ目。 */
export const SAKU_AZE2 = `@narr
ここも、畦の 草が
下の 線に {w=300}さわっている。
@npc_hoshi_tome
……さっきの 調子で、{w=300}
たのむ。`;

/** 大写し「畦」の はじめ（1回目だけ）。 */
export const SAKU_AZE_RULE = `@narr
細い 葉の 草だけ、刈る。
{w=300}丸い 葉が 3枚の 豆は、
のこす。`;

/** 豆を 切った（もとに もどせる。評価だけ 下がる）。 */
export const SAKU_AZE_MAME = `@npc_hoshi_tome
……それは 豆じゃ。
@narr
グソっ君が、豆を
そっと 起こして、{w=300}
土を 寄せた。`;

/** 畦草を 刈りおえた。 */
export const SAKU_AZE_DONE = `@npc_kanenari
きれいに なったで。
@npc_hoshi_tome
……ふむ。`;

/** 大写しの 言葉。 */
export const SAKU_AZE_UI = {
  place: '畦',
  keys: ['←→ えらぶ', 'けってい 刈る'],
  left: (n: number) => `草 のこり ${n}`,
  cut: 'チョキン',
  mame: '豆！',
};

/** 6つ 直した（マサル）。 */
export const SAKU_ALL = `@npc_hoshi_gen
……これで、ぜんぶだ。
{w=300}スイッチへ もどるぞ。`;

// ================================================================ 4 森の 目

/** ゲージが 半分（シカ。1回ごと）。 */
export const SAKU_ME_HALF = `@narr
ササの 奥で、{w=300}
目が 2つ、光った。
@npc_kanenari
……シカや。{w=300}
耳が 大きいな。
{w=300}こっち 見とる。`;

/** 2回目からの 半分。 */
export const SAKU_ME_HALF_AGAIN = `@narr
ササの 奥で、{w=300}
また 目が 2つ。`;

/** 段階2で 半分（山の ほうを 向いている。1回）。 */
export const SAKU_ME_HALF_H2 = `@narr
ササの 奥で、{w=300}
目が 2つ。{w=300}
……山の ほうを 向いている。
@npc_kanenari
けものも、{w=300}
山の 放送 聞いとるんか。`;

/** ゲージが いっぱい（タヌキも 来た）。 */
export const SAKU_ME_FULL = `@narr
目が、4つに ふえた。{w=300}
……タヌキも 来た。
@npc_hoshi_gen
……来たか。{w=300}
灯りを 向けろ。{w=300}
入れるな。`;

export const SAKU_ME_GUIDE = '森へ 灯りを 向ける';

/** 灯りを 向けた。 */
export const SAKU_ME_BACK = `@narr
目は、ゆっくり
森へ もどっていった。`;

// ================================================================ 5 入れる

/** 直しおえる 前の スイッチ。 */
export const SAKU_SWITCH_WAIT = `@npc_hoshi_gen
直す 所が、のこっとる。
{w=300}入れるのは、それからだ。`;

/** 入れる（!cue on → !cue west）。 */
export const SAKU_ON = `@npc_hoshi_gen
入れるぞ。
!cue on
@narr
カチッ。{w=300}……カチッ。
{w=300}箱の 音が、もどってきた。
@npc_hoshi_gen
西の はしで、測る。{w=300}
電源から いちばん 遠い 所で
見りゃ、ぜんぶ わかる。`;

/** 西の はし：テスター（!cue needle）。 */
export const SAKU_MEASURE = `@narr
マサルが、テスターの 先を
上の 線に、{w=300}もう 片方を
地面に さした。
!cue needle
@npc_hoshi_gen
……生きとる。
/
柵は、たたく ためじゃない。
{w=300}『ここまで』と、{w=300}
教える ためだ。`;

/** トマじい（柵の 内側から）：豆を 1本も 切らなかった／切った。 */
export const SAKU_TOME_GOOD = `@npc_hoshi_tome
……ええ 刈りかたじゃ。{w=300}
豆が 1本も 寝とらん。`;
export const SAKU_TOME_SO = `@npc_hoshi_tome
……豆は 起きとる。{w=300}
まあ、ええ 刈りかたじゃ。`;

export const SAKU_NOD = `@narr
柵を はさんで、{w=300}
マサルと トマじいが、{w=300}
同時に うなずいた。
@npc_kanenari
……今の、{w=300}
息 ぴったりやったで。
@npc_hoshi_gen
……誰が
@narr
マサルは、口を 閉じた。`;

/** かくし：森の 目を 一度も 出さなかった。 */
export const SAKU_SECRET_ME = `@narr
森の 奥で、{w=300}
小さな 足音が 遠ざかった。`;

/** かくし：豆を 1本も 切らなかった（トマじい）。 */
export const SAKU_SECRET_MAME = `@npc_hoshi_tome
冬に、{w=300}
味噌が できたら、{w=300}
……ペロに 言うとく。`;

/** 評価（マサル）。 */
export const SAKU_RANK = {
  yoshi: `@npc_hoshi_gen
……良し。
/
……おれより 早い。{w=300}
いや、灯りの おかげだ。`,
  maa: `@npc_hoshi_gen
……まあ 良し。{w=300}
けものが 来る 前に、
回りきれ。`,
  mou: `@npc_hoshi_gen
……もう 1回だ。{w=300}
次は、森の 目を
ささの 奥で とめろ。`,
};

export const SAKU_RETURN = `@narr
『柵の テスター』を、
マサルに 返した。`;

export const SAKU_REWARD = `@sys
上の 柵の 見回りが おわった。
朱肉が 2 たまった。`;

export const SAKU_REWARD_YOSHI = `@narr
しゅんの 朱肉が、
1 ふえた。`;

export const SAKU_PAGE = `@narr
みました帳②の すみに、
しゅんの 字で『上の 柵』。`;

export const SAKU_LEAVE = `@narr
マサルは 牛舎へ、{w=300}
トマじいは 水口へ、
それぞれ もどっていった。`;

// ================================================================ 6 そのあと

/** 見回り帳（牛舎）に 足す 行。 */
export const SAKU_CHO: Record<'yoshi' | 'maa' | 'mou', string> = {
  yoshi: `@narr
下の 欄に、太い 字で
『上の 柵 良し』。{w=300}
その 横に 小さく『しゅん・グソ』。`,
  maa: `@narr
下の 欄に、太い 字で
『上の 柵 まあ 良し』。{w=300}
その 横に 小さく『しゅん・グソ』。`,
  mou: `@narr
下の 欄に、太い 字で
『上の 柵 もう 1回』。{w=300}
その 横に 小さく『しゅん・グソ』。`,
};

/** 支柱の 番号札（東の 1 から 西の 8。マサルの 字）。 */
export const SAKU_FUDA: string[] = [
  '1 森が 近い',
  '2 ササ 刈る',
  '3 けもの道',
  '4 枝 落ちる',
  '5 クズ 注意',
  '6 ぬかるみ',
  '7 豆の 畦',
  '8 沢の 音',
];
export const SAKU_FUDA_TEXT = (n: number): string => `@narr
支柱の 番号札。{w=300}
マサルの 字で
『${SAKU_FUDA[n - 1]}』。`;

/** 区間の スイッチ（見回りの あと）。 */
export const SAKU_SWITCH_AFTER = `@narr
この 区間の スイッチ。
{w=300}『入』に なっている。`;

/** 村の 杉の すきま (44,0)（見回りの 前）。 */
export const SAKU_SUKIMA = `@narr
杉の あいだに、細い 道。
{w=300}電気柵の 外を、
西へ つづいている。`;

/** 見回りの あいだ、はしから 出ようと した とき。 */
export const SAKU_DOOR_WAIT = `@npc_hoshi_gen
電気を 切ったまま、{w=300}
帰る やつが あるか。`;

/** 見回りの あと、棚田の 戸が かかっている ときの 西の はし。 */
export const SAKU_DOOR_SHUT = `@narr
棚田へ おりる 戸は、{w=300}
内側から かけてある。
{w=300}……東の はしから 帰ろう。`;

/** 見回りの あいだに 話しかけた とき。 */
export const SAKU_GEN_TALK = {
  left: (n: number) => `@npc_hoshi_gen
……あと ${n}か所。{w=300}
灯りで 探せ。`,
  all: `@npc_hoshi_gen
スイッチへ もどるぞ。`,
};
export const SAKU_TOME_TALK = {
  before: `@npc_hoshi_tome
……柵の 外は、{w=300}
マサルの 持ち場じゃ。`,
  during: `@npc_hoshi_tome
豆は 刈るなよ。`,
};

/** 見回りの あいだ、柵（線）を 調べた とき。 */
export const SAKU_SEN = {
  off: `@narr
電気柵の 2段の 線。{w=300}
……今は、切ってある。
@npc_hoshi_gen
それでも、さわるな。`,
  on: `@narr
電気柵の 2段の 線。{w=300}
……さわらないで おこう。`,
};

/** グソっ君の 場所の ひとこと（上の 柵ぞい、1回）。 */
export const SAKU_FLIP = `@npc_kanenari
柵の 外って、{w=300}
なんや どきどきするな。
{w=300}……森の においや。`;

// ================================================================ みました帳②の すみ『上の 柵』

export const SAKU_BOOK = {
  title: '上の 柵',
  /** 支柱の 図の 下：直した 所の 数。 */
  fixed: (n: number) => `直した 所 ${n}`,
  /** マサルと トマじい（柵を はさんで）。 */
  two: 'マサル｜トマじい',
  rank: { yoshi: '良し', maa: 'まあ 良し', mou: 'もう 1回' } as Record<'yoshi' | 'maa' | 'mou', string>,
  /** かくし（森の 目を 出さなかった）：イノシシの 足あとの 小さな 絵の 横。 */
  ashi: '森へ 帰った',
};

/** 区間の 図の 名前（画面の 左上の 札）。 */
export const SAKU_HUD = {
  title: '上の 柵',
};

/** textcheck2 と sakuzoiText が 見る 文。 */
export const SAKU_TEXTS: Record<string, unknown> = {
  lamp: SAKU_LAMP,
  lampAgain: SAKU_LAMP_AGAIN,
  lampAfter: SAKU_LAMP_AFTER,
  startH1: SAKU_START_H1,
  startH2: SAKU_START_H2,
  start: SAKU_START,
  testerGet: SAKU_TESTER_GET,
  testerRule: SAKU_TESTER_RULE,
  outMeasure: SAKU_OUT_MEASURE,
  outLow: SAKU_OUT_LOW,
  outOff: SAKU_OUT_OFF,
  outGuide: SAKU_OUT_GUIDE,
  kuzu1: SAKU_KUZU1,
  kuzu2: SAKU_KUZU2,
  eda: SAKU_EDA,
  tsuchi: SAKU_TSUCHI,
  aze1: SAKU_AZE1,
  aze2: SAKU_AZE2,
  azeRule: SAKU_AZE_RULE,
  azeMame: SAKU_AZE_MAME,
  azeDone: SAKU_AZE_DONE,
  all: SAKU_ALL,
  meHalf: SAKU_ME_HALF,
  meHalfAgain: SAKU_ME_HALF_AGAIN,
  meHalfH2: SAKU_ME_HALF_H2,
  meFull: SAKU_ME_FULL,
  meBack: SAKU_ME_BACK,
  switchWait: SAKU_SWITCH_WAIT,
  on: SAKU_ON,
  measure: SAKU_MEASURE,
  tomeGood: SAKU_TOME_GOOD,
  tomeSo: SAKU_TOME_SO,
  nod: SAKU_NOD,
  secretMe: SAKU_SECRET_ME,
  secretMame: SAKU_SECRET_MAME,
  rank: SAKU_RANK,
  ret: SAKU_RETURN,
  reward: SAKU_REWARD,
  rewardYoshi: SAKU_REWARD_YOSHI,
  page: SAKU_PAGE,
  leave: SAKU_LEAVE,
  cho: SAKU_CHO,
  fuda: Object.fromEntries(SAKU_FUDA.map((_, i) => [i + 1, SAKU_FUDA_TEXT(i + 1)])),
  switchAfter: SAKU_SWITCH_AFTER,
  sukima: SAKU_SUKIMA,
  doorWait: SAKU_DOOR_WAIT,
  doorShut: SAKU_DOOR_SHUT,
  genLeft: SAKU_GEN_TALK.left(6),
  genAll: SAKU_GEN_TALK.all,
  tomeBefore: SAKU_TOME_TALK.before,
  tomeDuring: SAKU_TOME_TALK.during,
  sen: SAKU_SEN,
  flip: SAKU_FLIP,
};
