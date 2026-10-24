// 掃除は 上から（げむきか 10/20 の 案3、2026-10-20 依頼主の 採用。03_ch3_index）。第3章の クリア前、段階3
// （旧水族館の 中。12:00）。S15 の あと（flag_ch3_aq_enter）から S20 で ホールに 入るまで（flag_ch3_tsugao1）。
// 入口と 券売所の 西の 壁 (0,4) の 鉄の 戸『屋上 ― 点検用』→ 新しい 地図 map_c3_aq_okujou（旧水族館の 屋上、20×10）。
// 屋上の 上に 入った ところで 止まった カモメ、南西の 排水口の つまり（羽・松葉・ゴムボール・砂。いちばん 下に ふたの 網）、
// 南の 手すりから 下の ハキコ（元・受付）。寄らなくても 本筋は 進む。
//
//   1 屋上 ― 点検用（入口の 西の 戸 obj_oj_to）→ flag_oj_to（戸が 開く）
//   2 止まる カモメ（屋上に 出た とき 1回）→ flag_oj_in
//   3 黒い 輪（南西の 排水口 obj_oj_haisui_sw）→ flag_oj_wa ／ 南東の 排水口（くらべる）
//   4 屋上も、休館です（南の 手すり (8–12,9) から 下を のぞく）→ flag_oj_talk
//   5 上から 1つずつ（大写し「排水口」。↑↓で 選んで けってい。上の 物を 残して 下を 引くと、上の 物が すべる）
//   6 ボールは 下へ（選ぶ：そっと 落とす｜持っておく）→ flag_oj_ball（1 落とした・2 持っている）
//   7 2人で、やっと → 8 ごほうび（朱肉 +2、みました帳③の すみ『掃除は 上から』）→ flag_oj_done
//
// 決まり：ハキコは ていねい（「わたくし」）。ポコシャを 知っている こと（伏線）には ふれない。S19 より 前なので
// 飼育係・えさ・係長・「1つだけ」の 話は しない。子どもの 身の 乗り出しは 書かない（のぞく だけ）。地の文・名札に
// 「さん」なし（グソっ君の「ハキコさん」・ハキコの「しゅんさん」は 呼び方）。天丼の 口ぐせは ハキコの
// 「本日も、休館です。」（この 案の 決まりの 場面）だけ。1ページ 3行 × 336px（textcheck2 と ojText）。
// 事実：掃除は 上から（ほこりも 水も 上から 下へ 落ちる）。屋上の 排水口が つまると、水が たまって 別の 所から
// あふれ落ちる（ベランダや 雨どいと 同じ）。排水口の ふたの 網は 外さない（網が あるから 穴の 奥まで つまらない）。

// ================================================================ 1 屋上 ― 点検用

export const OJ_TO_FIRST = `@narr
鉄の 戸。『屋上 ―
点検用』。{w=300}……かぎは、
さびて 開いた まま。
@npc_kanenari
順路の 外やな。{w=300}
……ちょっとだけ、
見てこか。`;

/** 2回目から（開いている 間）。 */
export const OJ_TO_AGAIN = `@narr
鉄の 戸。『屋上 ―
点検用』。{w=300}
すき間から、外の 光。`;

/** 開いていない 間（S15 より 前・S20 から 先・クリア後）。 */
export const OJ_TO_SHUT = `@narr
鉄の 戸。『屋上 ―
点検用』。{w=300}
閉まっている。`;

// ================================================================ 2 止まる カモメ

export const OJ_IN = `@narr
町の ほうから、{w=300}
カモメが 1羽、
飛んで きた。
/
屋上の 上に 入った {w=300}
ところで、羽を
広げた まま 止まった。
@npc_kanenari
……ここは、{w=300}
正午の ままなんや。
下の 町は、動いとるのに。`;

/** かくし：「水槽の うら」が すんでいる（1回）。 */
export const OJ_IN_URA = `@npc_kanenari
うらの 次は、{w=300}
上や。`;

// ================================================================ 屋上の 物（○/5）

export const OJ_KAMOME = `@narr
カモメが、{w=300}
羽を 広げた まま、
宙に 止まっている。
@npc_kanenari
手すりの 外の カモメは、{w=300}
飛んどる のにな。`;

export const OJ_TANK = `@narr
給水塔。{w=300}
はしごの 下に、
『点検 毎月』の 札。`;

export const OJ_TENMADO = `@narr
くもった ガラスの 天窓。{w=300}
下は、大水槽の ホール。
……中は、見えない。`;

export const OJ_SHITSUGAIKI = `@narr
古い 室外機。{w=300}
羽根は、止まっている。
@npc_kanenari
これは、{w=300}
前から 止まっとる やつや。`;

export const OJ_TESURI = `@narr
手すりの 向こうに、{w=300}
町と 海。
波が、動いている。`;

/** 屋上の 物の 数。 */
export function ojMono(n: number): string {
  return `@sys\n屋上の 物 ${n}/5`;
}

// ================================================================ 3 黒い 輪（南西の 排水口）

export const OJ_WA = `@narr
排水口の まわりに、{w=300}
黒い 輪が いくつも。
/
排水口は、{w=300}
砂と 羽で、ふさがって
いる。
@npc_kanenari
雨の 日、{w=300}
ここ、プールやったんちゃうか。`;

/** 3の あと、話す 前に もう一度。 */
export const OJ_WA_AGAIN = `@narr
砂と 羽で、{w=300}
ふさがっている。
@npc_kanenari
……下に、だれか おるな。{w=300}
手すりから、のぞいて みよか。`;

/** 南東の 排水口（くらべる）。 */
export const OJ_SE = `@narr
こっちの 排水口は、{w=300}
網の 目が 見えている。`;

/** すんだ あと、南西の 排水口。 */
export const OJ_WA_DONE = `@narr
網の 目が、{w=300}
見えている。`;

// ================================================================ 4 屋上も、休館です（南の 手すり）

/** 3の 前に 手すりから のぞく。 */
export const OJ_SHITA_BEFORE = `@narr
下で、{w=300}
ほうきの 音が して いる。`;

export const OJ_TALK_A = `@narr
下で、{w=300}
ほうきの 音。
@npc_c3_uketsuke
……しゅんさん？{w=300}
本日は、休館です。
@npc_kanenari
知っとる。{w=300}
屋上に おるねん。
@npc_c3_uketsuke
屋上も、{w=300}
休館です。`;

export const OJ_TALK_B = `@npc_kanenari
ハキコさん、{w=300}
雨の 日、入口って
どうなるん？
@npc_c3_uketsuke
……ひさしから、{w=300}
水が 滝の ように。
10年、ずっと。
/
下は、毎日 {w=300}
掃いて おりましたが。
@npc_kanenari
原因、上や！{w=300}
排水口、つまっとる！
@npc_c3_uketsuke
…………{w=300}
掃除は、上から。
/
受付で、{w=300}
いちばん はじめに
習いましたのに。`;

/** グソっ君が いない とき（隊列に いない）の 4の 終わり。 */
export const OJ_TALK_SOLO = `@npc_c3_uketsuke
雨の 日は、ひさしから {w=300}
水が 滝の ように。
10年、ずっと。
/
……排水口、ですか。{w=300}
掃除は、上から。
受付で 習いましたのに。`;

/** 4の あと、もう一度 手すり（ミニゲームの 前）。 */
export const OJ_TALK_AGAIN = `@npc_c3_uketsuke
……排水口、{w=300}
お願い できますか。`;

/** すんだ あと、手すり。 */
export const OJ_TALK_DONE = `@narr
下で、{w=300}
ほうきの 音。
@npc_c3_uketsuke
本日も、休館です。`;

// ================================================================ 5 上から 1つずつ（大写し「排水口」）

export const OJ_RULE = `@sys
↑↓で 選んで、けっていで 取る。{w=300}
いちばん 上の 物から。`;

/** 上の 物を 残して 下の 物を 引いた。 */
export const OJ_KUZURE: Record<string, string> = {
  hane: `@narr
……羽が、{w=300}
穴の ほうへ すべった。
@npc_kanenari
上からや、上から！`,
  matsuba: `@narr
……松葉が、{w=300}
穴の ほうへ すべった。
@npc_kanenari
上からや、上から！`,
  ball: `@narr
……ボールが、{w=300}
ころん と 転がった。
@npc_kanenari
上からや、上から！`,
};

export const OJ_TORU: Record<string, string> = {
  hane: `@narr
カモメの 羽。{w=300}
そっと つまんだ。`,
  matsuba: `@narr
松葉が、ひとかたまり。{w=300}
町の 松の 葉だ。`,
  ball: `@narr
子どもの ゴムボール。{w=300}
空気が、少し ぬけている。`,
  suna: `@npc_kanenari
わいの はさみ、{w=300}
スコップに なるで。
@narr
グソっ君が、{w=300}
砂を すくった。`,
};

/** 網まで 来た（網は 外さない）。 */
export const OJ_AMI = `@narr
いちばん 下に、ふたの 網。
/
網は、そのまま。{w=300}
……これが あるから、
穴まで つまらない。
/
網の 目が、{w=300}
見えた。`;

/** 大写しを とちゅうで 閉じた。 */
export const OJ_STOP = `@npc_kanenari
……続きは、{w=300}
また あとで。`;

// ================================================================ 6 ボールは 下へ

export const OJ_BALL_A = `@npc_kanenari
ボール、{w=300}
どないしよ。
@npc_c3_uketsuke
……10年前の 夏、{w=300}
男の子が、ここで
泣いて おりました。
/
屋上に、{w=300}
乗っちゃったと。
/
下には、だれも {w=300}
おりません。……どうぞ。
わたくしが、受けます。
? そっと 落とす | 持っておく`;

export const OJ_BALL_DROP = `@narr
ボールを、{w=300}
手すりの 上から
そっと はなした。
/
ハキコは、ほうきで {w=300}
ぽん と 受けた。
@npc_kanenari
受付、{w=300}
うまいなあ！`;

export const OJ_BALL_KEEP = `@npc_c3_uketsuke
それでは、{w=300}
お帰りの ときに。`;

export const OJ_GET_BALL = `@sys
ゴムボールを
大事に 持った！`;

// ================================================================ 7 2人で、やっと

export const OJ_FUTARI = `@npc_c3_uketsuke
次の 雨が、{w=300}
少し 楽しみです。
/
10年、下だけ {w=300}
掃いて まいりました。
/
下を 掃く 人と、{w=300}
上を 掃く 人。
/
……2人で、やっと {w=300}
掃除ですね。
@npc_kanenari
わいと しゅんで、{w=300}
2人や けどな。
@npc_c3_uketsuke
では、3人で。{w=300}
……本日も、休館です。`;

/** グソっ君が いない とき。 */
export const OJ_FUTARI_SOLO = `@npc_c3_uketsuke
次の 雨が、{w=300}
少し 楽しみです。
/
下を 掃く 人と、{w=300}
上を 掃く 人。
……2人で、やっと 掃除ですね。
/
……本日も、休館です。`;

/** かくし：「下の 紙の 字」で つづりを こすった（1回）。 */
export const OJ_TSUZURI = `@npc_c3_uketsuke
……券売所の 入館券の
つづり、{w=300}見て
いただけましたか。
/
わたくしが、{w=300}
受付で 使って
おりました。`;

export const OJ_REWARD = `@sys
朱肉が 2 ふえた。
/
みました帳③の すみに、
『掃除は 上から』の ページ。`;

// ================================================================ クリア後（ボールを 持っていた 人だけ、1回）

export const OJ_PG_BALL = `@npc_c3_uketsuke
お帰りなさいませ。{w=300}
……お預かり して おりました
ボールですね。
@sys
ゴムボールを わたした。`;

// ================================================================ 道具・大写し・帳面

export const OJ_ITEM_BALL_DESC: [string, string] = ['屋上の 排水口に つまっていた。', '10年前の 夏の ボール。'];

export const OJ_UI = {
  place: '排水口',
  keys: ['↑↓ 選ぶ', 'けってい 取る'],
  names: { hane: 'カモメの 羽', matsuba: '松葉', ball: 'ゴムボール', suna: '砂', ami: 'ふたの 網' } as Record<string, string>,
};

/** みました帳③の すみの 1ページ（ui/menu/book_okujou.ts）。 */
export const OJ_BOOK = {
  title: '掃除は 上から',
  mono: (n: number) => `屋上の 物 ${n}/5`,
  ball: { 1: 'ボール：下へ', 2: 'ボール：持った', 3: 'ボール：返した' } as Record<number, string>,
  quote: ['下を 掃く 人と、', '上を 掃く 人。'],
};

export const OJ_TEXTS: Record<string, unknown> = {
  OJ_TO_FIRST, OJ_TO_AGAIN, OJ_TO_SHUT, OJ_IN, OJ_IN_URA, OJ_KAMOME, OJ_TANK, OJ_TENMADO, OJ_SHITSUGAIKI, OJ_TESURI,
  OJ_WA, OJ_WA_AGAIN, OJ_SE, OJ_WA_DONE, OJ_SHITA_BEFORE, OJ_TALK_A, OJ_TALK_B, OJ_TALK_SOLO, OJ_TALK_AGAIN, OJ_TALK_DONE,
  OJ_RULE, OJ_KUZURE, OJ_TORU, OJ_AMI, OJ_STOP, OJ_BALL_A, OJ_BALL_DROP, OJ_BALL_KEEP, OJ_GET_BALL, OJ_FUTARI,
  OJ_FUTARI_SOLO, OJ_TSUZURI, OJ_REWARD, OJ_PG_BALL, mono: [1, 5].map(ojMono),
};
