// げむきか 2026-09-30 の案のうち、依頼主が採用した 1・2（第1章の部分）・5（02 #71）。
//
//   1 ふろしきの マント（依頼主の変更つき。10_narrative 6.2・6.3・7.4）：段階2、
//     ひのやのクラス写真の2ページ目（緑のふろしきのマントの男の子『ももせ たかし』）。
//     写真の文が終わると、そのまま カウンターの奥の おばあが話しかけてくる〔cape〕
//     （flag_cape_obaa。グソっ君がいれば ひとこと）。そのあと たかしに 段階2で1回〔cape〕
//     （flag_cape_takashi）。置物（ヤキソバン）のことは文で言わない。
//   2 の第1章の部分（10 6.19）：ヤキソバンの置物を2回目以降に調べると、段階を問わず
//     1ページ（ヘラだけ 塗っていない）。
//   5 減らない コーヒー（依頼主の変更つき。10 6.16・6.22・6.27・7.19）：段階2、喫茶 夕顔の
//     窓ぎわの席に ぶーさんの本体（npc_bu_body）。2回目に話すと なんばるわんが店に来て、
//     グソっ君が ひと口（にっが！！）、コーヒーが やっと減り、なんばるわんが ぶーさんを
//     公園の影の所へ 連れて行く（flag_bu_left）。公園では 本体が影の となりに座り、
//     はじめて話すと 本体と影が会う（flag_bu_met）。喫茶のマスターは 40代の男性の
//     かずゆき（★2026-09-30 依頼主の指示。IDは npc_master のまま）。豆は 星見台の
//     タケじいが焙煎して ツガオ便で届ける（第2章のタケじいの家に 焙煎器と麻袋。
//     data/text/hoshi_rooms2.ts）。
//
// 天丼の決まり（10 2.x）：「平和」「まだ」「17」「3人」は使わない。第3章の構想には
// ふれない。名札・地の文は名前に「さん」をつけない（ぶーさんは名前の一部）。
// ぶーさんの口ぐせ「限界です……」は、依頼主の指示で本体も1回だけ言う（お腹が）。
// なんばるわんの「負けない！」は、喫茶の場面で1回。
// 1ページ3行・1行336px（__game.cmd.textcheck2 が見る。capeText() も）。

/** 1 ふろしきの マント。 */
export const CAPE = {
  /** The class photo's second page at stage 2 (the first page is IOBJ.obj_class_photo's). */
  photo: `前の 列の はしの 男の子。{w=300}
緑の ふろしきを、マントに している。
名札は『ももせ たかし』。`,
  /** おばあ, from behind the counter, right after the photo (once). */
  obaa: `@npc_obaa
写真の マントの 子かい。{w=300}
たかしだよ。
/
毎日、ふろしきを 首に
むすんで 来てね。{w=300}
『町の ヒーローに なる』って。
/
給食当番の ときも、
はずさなかった。{w=300}
……ソースが はねてねえ。
/
焼きそば屋に なったけど、
腹ぺこの 子には、{w=300}
いまでも ヒーローだろうさ。`,
  /** グソっ君, when he is walking with しゅん. */
  obaa_gk: `@npc_kanenari
ほんまや。{w=300}わいも、
あの 焼きそばに 助けて もろた。`,
  /** たかし, once at stage 2 after おばあ told it. */
  takashi: `@npc_maruyama
……先生、しゃべったのか。
/
ガキの ころの 話だ。{w=300}
いまの オレの マントは、
これよ。`,
  takashi_narr: `@narr
たかしは、首の タオルを
ぱんと はたいた。`,
};

/** 2（第1章）: the statue's page from the second look on, any stage. */
export const HERA = `かかげた ヘラだけ、
色を 塗っていない。{w=300}
本物の 鉄の 色だ。`;

/** 5 減らない コーヒー: the café. */
export const BU = {
  /** The window seat (obj_cf_booth) while he sits there (stage 2). */
  booth: `@narr
窓ぎわの 席に、会社員。{w=300}
ネクタイを ゆるめて、
新聞を 読んでいる。
/
……足もとに、影が ない。
/
テーブルの 飲みかけの コーヒーが、
少しずつ 増えていく。`,
  /** The window seat after he left with なんばるわん. */
  booth_after: `@narr
窓ぎわの 席に、からの カップ。
{w=300}新聞は、きちんと
たたんで ある。`,
  /** ぶーさん (the body), the first talk. */
  s2_1: `@npc_bu_body
ああ、影かい。{w=300}
公園で 残業してる だろう。
/
僕は 帰る とちゅうでね。{w=300}
ここで 1杯だけ、と 思って。`,
  /** The second talk (then なんばるわん comes in, when グソっ君 is with しゅん). */
  s2_2: `@npc_bu_body
飲みおえたら、迎えに 行くよ。
……それが、減らないんだ。
/
飲むと、そのぶん 増える。
むしろ、増える……{w=300}
お腹が 限界です……
/
……影の 口ぐせ？{w=300}
あれは、もとは 僕のでね。
うつったんだ。`,
  /** なんばるわん comes in (the shop bell). */
  madam_in: `@npc_madam
かずゆきさん、いつもの……{w=300}
あら、ぶーさん。
/
公園の ベンチで、あなたの 影が
ため息 ついてたわよ。{w=300}
コタロウが 吠えても、知らんぷり。`,
  gk_offer: `@npc_kanenari
ほな、わいが 半分 飲んだろか。`,
  gk_sip: `@narr
グソっ君は カップを 両手で
持って、ひと口。`,
  gk_bitter: `@npc_kanenari
……にっが！！{w=300}
な、なんや これ！{w=300}
陸の 飲みもん、こわっ！`,
  bu_laugh: `@npc_bu_body
……はは。{w=300}減った。`,
  bu_drink: `@narr
ぶーさんは、残りを
ひと息に 飲みほした。`,
  bu_thanks: `@npc_bu_body
ありがとう。{w=300}……さて、
影を 迎えに 行かなくちゃ。`,
  madam_go: `@npc_madam
公園なら、散歩の とちゅうよ。{w=300}
コタロウも、店の 外で
待ってるの。
/
さ、行きましょ。{w=300}
コーヒーにも 残業にも、
負けない！`,
  master_bye: `@npc_master
……いってらっしゃい。{w=300}
なんばるわんさんの いつもの、
いれて 待ってるよ。`,
  /** Without グソっ君 (he is always there at stage 2; a fallback): the second talk again. */
  again: `@npc_bu_body
飲むと、そのぶん 増える。{w=300}
……お腹が、たぷたぷだ。`,
};

/** かずゆき (npc_master) at stage 2, once each: before and after the scene. */
export const MASTER_BU = {
  before: `@npc_master
窓ぎわの 客？{w=300}ぶーさんだよ。
ユウナリの ころからの 常連さ。
/
毎日 5時前に 来て、1杯。{w=300}
……影を 忘れて 来たのは、
今日が はじめてだ。`,
  after: `@npc_master
グソっ君には、にがすぎたか。{w=300}
豆は、星見台の タケじいが
焙煎して 送って くれるんだ。
/
生の 豆を 取り寄せて、
手回しで 煎るんだそうだ。{w=300}
山の じいさんの、いい 腕さ。
/
なんばるわんさんも、常連でね。
{w=300}散歩の とちゅうに、1杯。
コタロウは、店の 外で 待つ。`,
};

/**
 * 5, the park: the body beside his shadow on the wisteria's bench (stage 2). With the
 * two of them there, the shadow's pages go under the tag 『ぶーさんの影』 (@npc_bu_shadow,
 * the same voice `shadow`); the body keeps 『ぶーさん』.
 */
export const BU_PARK = {
  /** The first talk to either of them after the café (once). */
  meet: `@npc_bu_shadow
……本体。{w=300}
迎えに 来て くれたのかい。
@npc_bu_body
コーヒーが、やっと 減ってね。
{w=300}グソっ君の おかげだ。`,
  meet_gk: `@npc_kanenari
にっがかったで。{w=300}
陸の 飲みもん、なめたら あかん。`,
  meet_end: `@npc_bu_shadow
……それは、たいへん だったね。
/
チャイムが 鳴ったら、
いっしょに 帰ろう。{w=300}
定時 だからね。`,
  /** The shadow from then on: its 〔s2_2〕〔s2_3〕 not heard yet first (their tag changed), then this one again and again (its 〔s2_1〕 no longer fits). */
  shadow_after: `@npc_bu_shadow
本体が、迎えに 来たよ。{w=300}
……チャイムが 鳴るまで、
ここで いっしょに 待つんだ。`,
  /** The body in the park: the first talk, then the second again and again. */
  park_1: `@npc_bu_body
影の やつ、ずっと ここで
待ってたんだね。{w=300}
……残業、させちゃったな。`,
  park_2: `@npc_bu_body
定時まで、あと 少しだ。{w=300}
……ここの ベンチは、
会社の いすより いい。`,
};

/** なんばるわん on the slope after she took him to the park (once, stage 2). */
export const MADAM_BU = `@npc_madam
ぶーさんなら、公園の ベンチよ。
{w=300}影と ならんで、チャイムを
待つんですって。`;

/**
 * なんばるわん on the slope, her 〔s2_2〕 once she has said her 「負けない！」 of stage 2
 * in the café (the catchphrase stays once a stage, 10 6.11): the last page without it.
 */
export const MADAM_S2_2_AFTER = `@npc_madam
あら、コタロウが しっぽ
振ってる。{w=300}
よろいの ある 子、好きなのよ。
@npc_kanenari
おおきに。{w=300}わいも、
ふわふわの 子は 好きやで。
@npc_madam
……わたしの 髪だって、
ふわふわよ。`;

/**
 * 第2章 タケじいの家（map_hoshi_minka3）の 焙煎器（obj_hr_mk3_baisen, the text in
 * data/text/hoshi_rooms2.ts）: グソっ君, once, when he had the sip in chapter 1
 * (flag_bu_gk_sip).
 */
export const BAISEN_GK = `@npc_kanenari
この におい……{w=300}
夕顔の、にっがい やつや！
/
……においは、ええのにな。`;

/** Every page of this file (textcheck2 walks it as 'cape_coffee'). */
export const CAPE_COFFEE_TEXTS = {
  cape: { ...CAPE, photo: `@narr\n${CAPE.photo}` },
  hera: `@narr\n${HERA}`,
  bu: BU,
  master: MASTER_BU,
  park: BU_PARK,
  madam: MADAM_BU,
  madam_s2_2: MADAM_S2_2_AFTER,
  baisen_gk: BAISEN_GK,
};
