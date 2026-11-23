// 前から 寝る（げむきか 10/20 の 案4、2026-10-20 依頼主の 採用。02_ch2_index）。第2章、h1〜h2（牛舎の 中に
// 入れるのは マサルの イベントの あと）。石黒牛舎の 南4の 牛房だけ、3頭とも 立った まま。牛房の うしろと
// 水飲み場の まわりが ぬれている。ぬれた 床には、牛は 寝ない。ぬれた 所だけ かき出して、新しい おがくずを
// 平らに 入れると、牛は 前の ひざから 折って 寝る（立つ ときは うしろから。エンディング 2a で 見える）。
//
//   1 ここだけ 起立（南4の 飼槽 obj_hoshi_minami4、(14–16,7)。給餌通路から 南向き）→ flag_nr_kiritsu
//   2 床だ（マサルの〔yuka〕。h1 は 給餌通路の 東の 端、h2 は ゲートの 横から 牛舎に もどる）→ flag_nr_start
//   3 かき出す・入れる：フォークと ネコ車（前室の 給餌車の 横 obj_hoshi_fork）→ 大写し「牛房の 床」
//     （↑↓ トマトの 灯りの 高さ、←→ 場所、けってい「ここ」：マサルが ぬれた 所を ネコ車へ。4か所）→
//     堆肥舎へ あける（obj_hoshi_taihisha）→ 稲わらの 屋根の 下の おがくずの 山（obj_hoshi_ogakuzu_yama）で 積む →
//     南4で しく（←→ 寄せる、けってい「これで よし」。まん中に 山が 残ると「……平らに。」）
//   4 おじぎ（牛が 前の ひざから 寝る）→ 5 寝るか 寝んか → 6 ごほうび（朱肉 +2、みました帳②の すみ『前から 寝る』）
//
// 依頼主の 答え（2026-10-20）：前ひざから 寝て、うしろ足から 立つ＝正しい。房の 頭数 3 は そのまま。水飲み場の
// まわりも 濡れる（ぬれた 所に 入れる）。子どもは 牛房に 入らない（マサルが 入る。しゅんは 柵の 外から 灯り、
// グソっ君は ネコ車）。牛を 叩く・追う・名前を つける・表情を つける は しない（50 2.2）。手綱は 使わず 声だけ。
// 決まり：時刻の 数字・「まだ」・第3章の 中身・「いただきます」を 入れない（マサルの「まだ……」は「いい」に）。
// 地の文・名札に「さん」なし（グソっ君の「マサルさん」は 呼び方）。「誰が らっきょやねん！」は 使わない。
// 1ページ 3行 × 336px（textcheck2 と nrText）。

// ================================================================ 1 ここだけ 起立

export const NR_KIRITSU = `@narr
この 牛房だけ、{w=300}
牛が 3頭とも、
立っている。
@npc_kanenari
ほかは みんな {w=300}
寝そべっとるのに、
ここだけ 起立や。`;

/** 1の あと、マサルに 話す 前に もう一度。 */
export const NR_KIRITSU_AGAIN = `@narr
3頭とも、{w=300}
立った まま。
床を、においで 見ている。`;

/** すんだ あと。 */
export const NR_AFTER = `@narr
3頭とも、{w=300}
寝そべって 反すう
している。`;

// ================================================================ 2 床だ（マサルの〔yuka〕）

export const NR_YUKA = `@npc_hoshi_gen
……床だ。
/
うしろの ほうが、{w=300}
ぬれとる。
水飲み場の まわりも。
/
ぬれた 床には、{w=300}
牛は 寝ん。
@npc_kanenari
寝たら ええのに。{w=300}
……つめたいんか。
@npc_hoshi_gen
夜が 長くて、{w=300}
入れかえて やれなかった。
/
フォーク、{w=300}
持ってこい。
前室の、給餌車の 横だ。`;

/** h2：ゲートの 横から、牛舎に もどる ひとこと。 */
export const NR_YUKA_H2 = `@npc_hoshi_gen
……南4か。{w=300}
おれも、もどる。`;

/** 〔yuka〕の あと、フォークを 持つ 前に マサル。 */
export const NR_GEN_FORK = `@npc_hoshi_gen
フォークだ。{w=300}
前室の、給餌車の 横。`;

/** 前室の フォークと ネコ車（〔yuka〕の 前）。 */
export const NR_FORK_BEFORE = `@narr
フォークと ネコ車。{w=300}
柄が、手の 形に
すりへっている。`;

export const NR_FORK = `@narr
フォークと ネコ車を
持った。
@npc_kanenari
ネコ車は、{w=300}
わいが 押したる。`;

/** フォークと ネコ車を 持っている 間の 前室。 */
export const NR_FORK_OUT = `@narr
給餌車の 横。{w=300}
ネコ車は、グソっ君が
押している。`;

/** フォークを 持って、マサルに 話す（南4へ）。 */
export const NR_GEN_GO = `@npc_hoshi_gen
南4だ。{w=300}
灯りを、床に 当てて くれ。`;

// ================================================================ 3 かき出す（大写し「牛房の 床」）

export const NR_KAKI_START = `@npc_hoshi_gen
……よし、よし。
@narr
マサルが 声を かけると、{w=300}
牛は 柵の ほうへ
寄った。
@npc_hoshi_gen
灯りを、{w=300}
低う して みろ。`;

/** 灯りが 高い まま「ここ」を 押した。 */
export const NR_TAKAI = `@npc_hoshi_gen
……灯りを、{w=300}
もっと 低く。`;

/** かわいた 所を「ここ」。 */
export const NR_KAWAITA = `@npc_hoshi_gen
そこは、{w=300}
いい。`;

/** ぬれた 所を 1つ かき出した。 */
export function nrKaki(n: number): string {
  return `@sys\nぬれた 所 ${n}/4`;
}

/** 水飲み場の まわり（はじめて かき出した とき 1回）。 */
export const NR_KAKI_MIZU = `@npc_hoshi_gen
水飲み場の まわりは、{w=300}
牛が こぼすから な。`;

export const NR_KAKI_END = `@npc_hoshi_gen
ぬれたのは、{w=300}
堆肥舎へ。
/
帰りに、新しい おがくずを {w=300}
積んでこい。
稲わらの 屋根の 下だ。
@npc_kanenari
ネコ車、{w=300}
出発や！`;

/** かき出した あと、堆肥舎に あける 前（マサル・南4）。 */
export const NR_GEN_SUTE = `@npc_hoshi_gen
ぬれたのは、{w=300}
堆肥舎へ。`;

/** あけた あと、積む 前（マサル・南4）。 */
export const NR_GEN_YAMA = `@npc_hoshi_gen
新しい おがくずを、{w=300}
稲わらの 屋根の 下から。`;

/** 大写しを とちゅうで 閉じた。 */
export const NR_STOP = `@npc_hoshi_gen
……つづきは、{w=300}
いつでも いい。`;

// ================================================================ 3 運ぶ

/** 堆肥舎に あける（今の 調べる 文の かわり。ネコ車に ぬれた おがくずが ある とき）。 */
export const NR_SUTE = `@narr
堆肥舎の 山に、{w=300}
ぬれた おがくずを
あけた。
@npc_kanenari
これも、{w=300}
畑の 土に なるんやな。`;

/** おがくずの 山（稲わらの 屋根の 下の はし）。 */
export const NR_YAMA = `@narr
屋根の 下に、{w=300}
おがくずの 山。`;

/** ネコ車が ぬれた ままで 山に 来た。 */
export const NR_YAMA_SAKI = `@npc_kanenari
先に、{w=300}
ぬれたのを 堆肥舎へ やな。`;

export const NR_TSUMU = `@narr
新しい おがくずを、{w=300}
ネコ車に 積んだ。
@npc_kanenari
木の においや。{w=300}
……ええ においや なあ。`;

/** 積んで 牛舎に もどる 前に、マサル（給餌通路）。 */
export const NR_GEN_SHIKU = `@npc_hoshi_gen
南4に、{w=300}
うすく、まんべんなく。`;

/** ネコ車を 押している 間の グソっ君（ぬれた／新しい）。 */
export const NR_KN_CARRY = ['@npc_kanenari\nおっとっと。{w=300}\nネコ車、まっすぐ 進まへん。', '@npc_kanenari\nええ におい、{w=300}\n運んどる 気分や。'];

/** かくし：ふくじんづけ（耳の あいさつが すんでいる。1回）。 */
export const NR_FUKU = `@narr
ネコ車の おがくずに、{w=300}
ふくじんづけが
飛びこんで 転がった。
@npc_hoshi_gen
……おまえの {w=300}
床じゃ ない。`;

// ================================================================ 3 しく

export const NR_SHIKU_START = `@narr
マサルが、{w=300}
新しい おがくずを
牛房に あけた。
@npc_hoshi_gen
寄せる ほうを、{w=300}
言って くれ。`;

export const NR_TAIRA = `@npc_hoshi_gen
……平らに。`;

export const NR_SHIKU_END = `@narr
白い おがくずが、{w=300}
うすく、まんべんなく。`;

// ================================================================ 4 おじぎ

export const NR_OJIGI_A = `@narr
牛が、鼻で {w=300}
新しい おがくずを
かいでいる。`;

export const NR_OJIGI_B = `@narr
前の ひざを、{w=300}
ゆっくり 折った。`;

export const NR_OJIGI_C = `@narr
それから、うしろを {w=300}
どすん と 下ろした。
@npc_kanenari
おじぎ {w=300}
してから 寝るんか！
@npc_hoshi_gen
牛は、前から 寝る。{w=300}
立つ ときは、
うしろから。
@npc_kanenari
逆 なんか。{w=300}
……ほな 起きる とき、
おしりが 先に 上がるんか。
@npc_hoshi_gen
見て いれば、{w=300}
わかる。`;

export const NR_OJIGI_D = `@narr
2頭目も、3頭目も、{w=300}
前から 寝た。
/
もぐ、……もぐ。{w=300}
反すうが 始まった。`;

/** かくし：ふしぎ08「そろった 反すう」を 押している（1回）。 */
export const NR_HANSUU = `@npc_kanenari
南4も、{w=300}
自分の 拍子で
かみだしたな。`;

// ================================================================ 5 寝るか 寝んか

export const NR_NERUKA = `@npc_hoshi_gen
……牛は、しゃべらん。
/
寝るか {w=300}
寝んかで、言うんだ。
@npc_kanenari
床が いやや、{w=300}
って 言うとったんか。
@npc_hoshi_gen
……ああ。
/
おれは、{w=300}
寝てる 顔を 見てから、
寝る。
@npc_kanenari
今夜は、{w=300}
マサルさんも 寝れるな。
@npc_hoshi_gen
……朝が 来たらな。`;

/** グソっ君が いない とき。 */
export const NR_NERUKA_SOLO = `@npc_hoshi_gen
……牛は、しゃべらん。
/
寝るか {w=300}
寝んかで、言うんだ。
/
おれは、{w=300}
寝てる 顔を 見てから、
寝る。`;

/** かくし：牛舎の おてつだいが すんでいる（1回）。 */
export const NR_WORK = `@npc_hoshi_gen
エサ、水、床。{w=300}
……それで、牛の 1日だ。`;

export const NR_REWARD = `@sys
朱肉が 2 ふえた。
/
みました帳②の すみに、
『前から 寝る』の ページ。`;

/** すんだ あと、マサルに もう一度（1回）。 */
export const NR_GEN_AFTER = `@npc_hoshi_gen
……南4、{w=300}
よう 寝とる。`;

// ================================================================ 大写し・帯・帳面

export const NR_UI = {
  place: '牛房の 床',
  light: '灯り',
  /** 画面の 下の 帯（いま 押す ボタンと、何を するか）。 */
  bandKaki: '↑↓ 灯りの 高さ　←→ 場所　けってい「ここ」',
  bandShiku: '←→ 寄せる 向き　けってい「これで よし」',
  bandSute: 'ネコ車を 押して、堆肥舎へ（村の 南）',
  bandYama: '帰りに、稲わらの 屋根の 下の おがくずの 山へ',
  bandBack: '新しい おがくずを、牛舎の 南4へ',
};

/** みました帳②の すみの 1ページ（ui/menu/book_neru.ts）。 */
export const NR_BOOK = {
  title: '前から 寝る',
  wet: (n: number) => `ぬれた 所 ${n}/4`,
  taira: { 1: '平らに しけた', 2: '2回目で 平らに' } as Record<number, string>,
  quote: ['牛は しゃべらん。', '寝るか 寝んかで、', '言うんだ。'],
};

export const NR_TEXTS: Record<string, unknown> = {
  NR_KIRITSU, NR_KIRITSU_AGAIN, NR_AFTER, NR_YUKA, NR_YUKA_H2, NR_GEN_FORK, NR_FORK_BEFORE, NR_FORK, NR_GEN_GO, NR_GEN_SUTE, NR_GEN_YAMA, NR_FORK_OUT,
  NR_KAKI_START, NR_TAKAI, NR_KAWAITA, NR_KAKI_MIZU, NR_KAKI_END, NR_STOP, NR_SUTE, NR_YAMA, NR_YAMA_SAKI, NR_TSUMU,
  NR_GEN_SHIKU, NR_KN_CARRY, NR_FUKU, NR_SHIKU_START, NR_TAIRA, NR_SHIKU_END, NR_OJIGI_A, NR_OJIGI_B, NR_OJIGI_C,
  NR_OJIGI_D, NR_HANSUU, NR_NERUKA, NR_NERUKA_SOLO, NR_WORK, NR_REWARD, NR_GEN_AFTER, kaki: [1, 4].map(nrKaki),
};
