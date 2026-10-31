// 土を 寄せるほど、白く なる（第2章。げむきか 10/30 の 案5、2026-10-30 依頼主の 採用。02_ch2_index）。
// マサル（いつもの 会話の あと、もう 1回）→ マサルの 家の 庭の 東の はしの 木戸 → 裏の ネギ畑（map_hoshi_negi）の
// 畝 3本（大写し「畝の 断面」：1本目は 見るだけ、2本目は 寄せる、3本目は のける）→ グソっ君が 首まで → 物置の そばで
// マサル（白い ところは、土が 育てる）。
//
// 事実（調べた 範囲。$SP/handoff/negi_progress.md に 出典）：ネギの 白い 所（葉鞘）は、土を 寄せて 光を さえぎると 白く
// 長く なる（軟白）。土寄せは 何回かに 分け、1回に 寄せすぎない。途中の 土寄せは 葉の 分かれ目（分岐部）の 少し 下まで
// （茨城県・滋賀県・Honda）。緑の 葉の 所まで 寄せると 軟腐病が 出やすい。高温期は 根の 働きが 落ち、病気も 出やすいので、
// あわてて 寄せない（千葉県・全農）。最後の 止め土（分かれ目より 上まで）の 事は 言わない（8月末は 途中の 土寄せ）。
// 「夏は 浅く すると 根が いたまない」は 言い切れる 出典が ないので、台詞は「ネギが いたむ」に とどめた。
// 堆肥は 牛舎の ふんと おがくずを よく ねかせた 物（2026-10-30 会議：湯気は 出さない＝熟した 物に 見せる）。
//
// 決まり：第2章の 台詞に 時刻の 数字・「まだ」・「いただきます」・第3章の 中身を 入れない。天丼の 口ぐせは 足さない
// （マサルの「誰が らっきょやねん！」「牛は、しゃべらん。」は 使わない）。マサルの 母は 顔を 出さない（麦わら帽子と
// 札だけ）。地の文・名札の 名前に「さん」なし（「マサルさん」は グソっ君の 呼び方）。1ページ 3行 × 336px。

// ================================================================ 1 母の ネギ（マサルの〔negi〕）

/** 段階0：木戸（開かない）。 */
export const NH_TO_H0 = `@narr
木戸。{w=300}
マサルの 家の 畑。`;

/** 段階1〜2、〔negi〕の 前：木戸（開かない）。 */
export const NH_TO_SHUT = `@narr
木戸。{w=300}
マサルの 家の 畑。
/
かんぬきが、{w=300}
かかっている。`;

/** クリア後・段階3。 */
export const NH_TO_PG = `@narr
木戸。{w=300}
ネギの 畑が、
しずかに 寝ている。`;

/** 〔negi〕。 */
export const NH_START = `@npc_hoshi_gen
……母の ネギに、{w=300}
土を 寄せる 番だ。
/
暑うなる 前に だ。{w=300}
おれは 牛が ある。
ボウズ、手を かせ。
@npc_kanenari
ネギ？{w=300}
マサルさん、
牛だけ ちゃうんか。
@npc_hoshi_gen
植えたのは、母だ。{w=300}
……寄せるのは、おれだ。
/
庭の 東の はしの、{w=300}
木戸から 入れ。
かんぬきは 外しとく。`;

/** 〔negi〕の あと、畑に 入らずに もう一度 話す（1回）。 */
export const NH_WAIT = `@npc_hoshi_gen
庭の 東の はしの、{w=300}
木戸だ。`;

/** 〔negi〕の あと、木戸を 調べる（入る 前の 1行）。 */
export const NH_TO_OPEN = `@narr
木戸を 押した。`;

/** すんだ あと、木戸を 調べる（この 1行の あと 入る）。 */
export const NH_TO_AFTER = `@narr
土の 線が、{w=300}
3本 そろっている。`;

// ================================================================ 2 畑（入って すぐ、1回）

export const NH_ENTER = `@narr
ネギが、3本の 畝に
ならんでいる。{w=300}
土は、黒くて ふかふか。
@npc_hoshi_gen
牛舎の 堆肥だ。{w=300}
ふんと おがくず。
よく ねかせて ある。
@npc_kanenari
牛の おかげの {w=300}
ネギやな。
@npc_hoshi_gen
まず、1本目を 見ろ。{w=300}
いちばん 上の 畝だ。`;

/** 麦わら帽子の 杭（1回目は マサルも）。 */
export const NH_BOUSHI = `@narr
麦わら帽子。{w=300}
ふちに、土の あと。`;
export const NH_BOUSHI_GEN = `@npc_hoshi_gen
……母のだ。`;

/** 堆肥の 山。 */
export const NH_TAIHI = `@narr
よく ねかせた 堆肥。{w=300}
においは、ほとんど ない。
黒くて、ぼろぼろ している。`;

/** かくし：牛舎の おてつだいを すませている（1回）。 */
export const NH_TAIHI_BARN = `@npc_hoshi_gen
……おまえが 寄せた {w=300}
エサの、行き先だ。`;

/** かくし：堆肥の 中の 親戚（カブトムシの 幼虫）を すませている（1回）。 */
export const NH_TAIHI_KO = `@npc_kanenari
ここにも、親戚の {w=300}
子ら、おるかな。
@npc_hoshi_gen
……おらん。{w=300}
ここは、畑の 分だ。`;

/** 鍬と 移植ごて。 */
export const NH_DOUGU = `@narr
鍬と、移植ごて。{w=300}
柄が、手の 形に
すり減っている。`;

/** 雨水の かめ。 */
export const NH_KAME = `@narr
雨水の かめ。{w=300}
ひしゃくが、
ふちに かけてある。`;

/** 物置（5 の 前）。 */
export const NH_MONOOKI = `@narr
小さな 物置。{w=300}
ネギの 束を しばる
わらが、つるしてある。`;

/** 北の 杉林の すそ。 */
export const NH_SUGI = `@narr
杉林の すそ。{w=300}
空が、少しずつ
うすく なっていく。`;

/** 南と 東の 低い 石垣。 */
export const NH_ISHIGAKI = `@narr
低い 石垣。{w=300}
下の 段は、草地だ。`;

/** 畑の マサル（順番の 声かけ）。 */
export const NH_GEN_ICHI = `@npc_hoshi_gen
1本目を 見ろ。{w=300}
いちばん 上の 畝だ。`;
export const NH_GEN_NI = `@npc_hoshi_gen
2本目に、{w=300}
寄せて みろ。`;
export const NH_GEN_SAN = `@npc_hoshi_gen
3本目を、{w=300}
直して くれ。`;
export const NH_GEN_ATO = `@npc_hoshi_gen
……物置の とこで、{w=300}
ひと休みだ。`;

// ================================================================ 3 寄せる（大写し「畝の 断面」）

/** 1本目（見本）。 */
export const NH_ICHI = `@npc_hoshi_gen
これくらいだ。{w=300}
白い ところの 上まで。
/
分かれ目の、{w=300}
少し 下まで。
……そこから 上は、葉だ。`;

/** 1本目を 見た あと（もう一度 見る）。 */
export const NH_ICHI_AGAIN = `@npc_hoshi_gen
白い ところの 上、{w=300}
分かれ目の 少し 下だ。`;

/** 1本目を 見る 前に 2本目・3本目を 調べる。 */
export const NH_SAKI = `@npc_hoshi_gen
先に、{w=300}
1本目を 見ろ。`;

/** 2本目の はじめ（暑い 時期の 1行）。 */
export const NH_NI_MAE = `@npc_hoshi_gen
2本目は、{w=300}
寄せて ない。
/
暑い ときは、浅く。{w=300}
いっぺんに 寄せると、
ネギが いたむ。
/
何回かに 分けて、{w=300}
少しずつ 寄せる。`;

/** 2本目：分かれ目を こえた（1段 もどる。失敗に しない）。 */
export const NH_KOETA = `@npc_hoshi_gen
……そこまで。{w=300}
分かれ目は、埋めるな。`;

/** 2回目からの こえた（短く）。 */
export const NH_KOETA_2 = `@narr
土を、ひと すくい
のけた。`;

/** 「よし」が 早すぎる（白い ところが 出ている）。 */
export const NH_HAYAI = `@npc_hoshi_gen
もう 少し。{w=300}
白い ところが、出とる。`;

/** 2本目が すんだ。 */
export const NH_NI_OK = `@npc_hoshi_gen
……よし。{w=300}
それで いい。`;

/** かくし：2本目を 一度も 分かれ目を こえずに（1回）。 */
export const NH_UMAI = `@npc_hoshi_gen
……母より、{w=300}
うまい。`;

/** 3本目の はじめ（去年の 札）。 */
export const NH_SAN_MAE = `@narr
畝の はしに、
古い 札。{w=300}
『ここは 私』。
@npc_hoshi_gen
母の 札だ。{w=300}
……母も、寄せすぎる。
/
分かれ目が 見えるまで、{w=300}
こてで のけて くれ。`;

/** 3本目：のけすぎた（1段 もどる）。 */
export const NH_NOKESUGI = `@npc_hoshi_gen
……のけすぎだ。{w=300}
白い ところが 出る。`;

/** 3本目：分かれ目が 埋まった まま「よし」。 */
export const NH_UMATTA = `@npc_hoshi_gen
分かれ目が、{w=300}
埋まっとる。`;

/** 3本目が すんだ。 */
export const NH_SAN_OK = `@npc_hoshi_gen
……よし。
@npc_kanenari
親子で {w=300}
寄せすぎや。`;

/** すんだ 畝を 調べる。 */
export const NH_UNE_AFTER = `@narr
土の 線が、{w=300}
分かれ目の 少し 下で
そろっている。`;

/** 段階2、すんだ あと 畝を 調べる（1回）。 */
export const NH_UNE_H2 = `@narr
かかしは 山を 向いて、{w=300}
ネギは 空を 向いている。`;

// ================================================================ 4 わいも 白う（3本目の あと、1回）

export const NH_WAIMO = `@npc_kanenari
わいも、土 寄せたら {w=300}
白う なるか。`;

export const NH_NEKORO = `@narr
グソっ君が、畝の はしに
ごろんと 寝ころんだ。`;

export const NH_KUBI = `@narr
首まで、寄せた。`;

export const NH_WAKAREME = `@npc_kanenari
……分かれ目は、{w=300}
埋めんといてや。`;

/** しゅんの ツッコミ（書き文字）。 */
export const NH_DOKO = 'どこ！';

export const NH_GEN_KUCHI = `@narr
マサルの 口の はしが、
少しだけ 動いた。
@npc_hoshi_gen
…………`;

export const NH_DERU = `@narr
グソっ君が、{w=300}
土から 出てきた。
@npc_kanenari
……白う なっとらん。`;

// ================================================================ 5 白い ところ（物置の そばで、マサル）

export const NH_SHIROI = `@npc_hoshi_gen
ネギの 白い ところは、{w=300}
光が 当たらん
ところだ。
/
土で かくすほど、{w=300}
白く、長く なる。
/
白い ところは、{w=300}
土が 育てる。
/
……母に、{w=300}
そう 習った。`;

export const NH_REWARD = `@sys
朱肉が 2 ふえた。
/
みました帳②の すみに、
『土を 寄せるほど、白く
なる』の ページ。`;

/** すんだ あと、畑の マサル（1回）。 */
export const NH_GEN_AFTER = `@npc_hoshi_gen
……母が 起きたら、{w=300}
見せて やる。`;

/** すんだ あとの マサル（2回目から）。 */
export const NH_GEN_AFTER2 = `@npc_hoshi_gen
牛に、もどる。{w=300}
ボウズも、行け。`;

/** 帰りに、マサルの 家の 窓（obj_hoshi_gen_house の 今の 文の あと。1回）。 */
export const NH_NEIKI = `@narr
……寝息が、少し {w=300}
やわらかい 気が した。`;

// ================================================================ 大写し「畝の 断面」の 字

export const NH_UI = {
  place: '畝の 断面',
  /** やり方の カード（ui/closeup.ts。はじめての 1回）。 */
  howto: { id: 'negi', line: '{←→}で 選んで、{Z}で 押す', pic: 'lr' as const },
  yoseru: '寄せる',
  nokeru: 'のける',
  yoshi: 'よし',
  modoru: 'もどる',
  wakareme: '分かれ目',
  shiroi: '白い ところ',
  tsuchi: '土',
  koko: 'ここまで',
  une: (n: number) => `${n}本目`,
};

// ================================================================ みました帳②の すみ『土を 寄せるほど、白く なる』

export const NH_BOOK = {
  title: '土を 寄せるほど、白く なる',
  titleLines: ['土を 寄せるほど、', '白く なる'],
  /** マサルの 母の 札。 */
  quote: ['『ここは 私』'],
  rows: ['寄せた 畝', '見た 畝'],
};

/** 文の検査（nhText・textcheck2 の walk）に出す物。 */
export const NH_TEXTS: Record<string, unknown> = {
  NH_TO_H0, NH_TO_SHUT, NH_TO_PG, NH_START, NH_WAIT, NH_TO_OPEN, NH_TO_AFTER, NH_ENTER, NH_BOUSHI, NH_BOUSHI_GEN, NH_TAIHI,
  NH_TAIHI_BARN, NH_TAIHI_KO, NH_DOUGU, NH_KAME, NH_MONOOKI, NH_SUGI, NH_ISHIGAKI, NH_GEN_ICHI, NH_GEN_NI, NH_GEN_SAN, NH_GEN_ATO,
  NH_ICHI, NH_ICHI_AGAIN, NH_SAKI, NH_NI_MAE, NH_KOETA, NH_KOETA_2, NH_HAYAI, NH_NI_OK, NH_UMAI, NH_SAN_MAE, NH_NOKESUGI, NH_UMATTA,
  NH_SAN_OK, NH_UNE_AFTER, NH_UNE_H2, NH_WAIMO, NH_NEKORO, NH_KUBI, NH_WAKAREME, NH_GEN_KUCHI, NH_DERU, NH_SHIROI, NH_REWARD,
  NH_GEN_AFTER, NH_GEN_AFTER2, NH_NEIKI,
};
