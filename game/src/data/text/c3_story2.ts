// 第3章『海ぞいの町の いただきます』 — 第2期（S07〜S14：市場・食堂・海水浴場、あぜ道市の
// 来る人、いただきます、ナリオサメ、ごちそうさま、案A「いつもの 軽トラ」）の文
// （60_ch3_story 3.2・3.3・3.4・7.1・9.3・9.4・9.6・10.7〜10.14）。演出は src/events/ch3。
// `{name:npc_c3_*}` は表示名（c3_names.ts の C3_NAMES）に置きかえて出す。
// どのページも 3行 × 336px まで（__game.cmd.textcheck2 が見る）。
//
// 60 に文がなく、ここで作った文には「（E 作）」と書いた（報告に一覧）。

import { c3Name, fillNames } from './c3_names';

/** The first letter of ミナト's name (written on his glasses). */
const MI = c3Name('npc_c3_sirenban').slice(0, 1);

// ================================================================ 10.7 S07 ① 市場

/** 〔evt_ch3_ichiba〕ツグミに2回目に話したとき。 */
export const S07_START = `@npc_c3_seri_deshi
……セリは、買い手の 手を
見るんです。{w=300}
指の 形が、値段。
/
でも、師匠の 符丁ノートが
ばらばらに なって。{w=300}
……わたし、まだ 読めんのです。
@npc_kanenari
ほな、わいらで
拾うて きたるわ。`;

/** 符丁ノートの切れはし5枚（拾う所は 62 4.2）。指の形と、その意味（この町だけの作りもの。60 2.2）。 */
export const FUCHO = [
  { hand: '指 1本、立てて', word: 'いち', short: '1本 立てる' },
  { hand: '指 2本、まげて', word: 'に', short: '2本 まげる' },
  { hand: '指 3本、横に', word: 'さん', short: '3本 横' },
  { hand: '手を ひらいて', word: 'ご', short: '手を ひらく' },
  { hand: '指で 輪を 作って', word: 'じゅう', short: '指で 輪' },
] as const;

/** 拾ったとき（$n 枚目）。 */
export function fuchoGot(i: number, n: number): string {
  const f = FUCHO[i];
  return `@narr
符丁ノートの 切れはし。
${f.hand}……『${f.word}』。
@sys
符丁ノートの 切れはしを 拾った！\n切れはし ${n}/5`;
}

/** 3枚までのあいだ、ツグミにもう一度話すと（E 作）。 */
export const S07_MORE = `@npc_c3_seri_deshi
……もう 少し、集めて
みて ください。{w=300}
市場の あちこちに、あるはず。`;

/** 3枚以上でツグミに話すと〔セリ〕へ（E 作）。 */
export const S07_SERI_GO = `@npc_c3_seri_deshi
……これだけ あれば、
読めるかも しれません。
/
わたしの 横で、
いちばん 高い 人に、
札を 上げて ください。`;

/** セリの はじめ（E 作）。買い手3人が前に立つ。 */
export const S07_SERI_BUYERS = `@narr
セリ場の 前に、買い手が 3人。
{name:npc_c3_shokudo}は お玉を 持っている。
@npc_hirosuke
ども！{w=300}
焼き芋と 交換で！
@npc_kanenari
お金で 買うんや！`;

/** 来ていれば、ハモ区長・なんばるわんも買い手に（値段には関係しない。60 3.4・10.7。E 作）。 */
export const S07_SERI_KUCHO = `@npc_hoshi_kucho
えー、星見台 区長も、
買い手で ございます。
……えー、指が 足りません。`;
export const S07_SERI_MADAM = `@npc_madam
わたくしも、1つ。{w=300}
……手の 合図は、
大きい ほうが すてきよ。`;

/** セリの3回：買い手（0 ナミエ 1 ホシミ 2 ヒロスケ）の指（FUCHO の番号）。いちばん高い人が正しい。 */
export const SERI_ROUNDS: { hands: [number, number, number]; best: number }[] = [
  { hands: [0, 2, 1], best: 1 },
  { hands: [2, 1, 3], best: 2 },
  { hands: [4, 3, 2], best: 0 },
];
export const SERI_BUYER_IDS = ['npc_c3_shokudo', 'npc_c3_himono_tsuma', 'npc_hirosuke'] as const;
export const SERI_BUYER_NAMES = ['{name:npc_c3_shokudo}', '{name:npc_c3_himono_tsuma}', 'ヒロスケ'] as const;

/** 1回の セリの 見出し（E 作）。 */
export function seriAsk(round: number): string {
  return `@npc_c3_seri_deshi
${round + 1}回目。{w=300}……手を、見て ください。`;
}
/** 手の形の1行（切れはしで意味が分かれば『…』、なければ『？』）。 */
export function seriHandLine(buyer: number, hand: number, known: boolean): string {
  const f = FUCHO[hand];
  return `${SERI_BUYER_NAMES[buyer]}：${f.short}……『${known ? f.word : '？'}』`;
}

/** 正しかった／まちがえた（「……もう 1回、見ます」は 60）。 */
export const SERI_OK = `@npc_c3_seri_deshi
……はい！{w=300}
その 人が、いちばん 高い。`;
export const SERI_NG = `@npc_c3_seri_deshi
……あ、ちがう 指でした。{w=300}
……もう 1回、見ます。`;

/** 2回目のあと：値札がくっついて立ちあがる（60 10.7・6.1。E 作）。 */
export const S07_NEFUDA = `@narr
セリ台の 値札が、ぱたぱたと
3枚 くっついて、立ちあがった。
@npc_kanenari
値札が 立ったで！{w=300}
……値段、決めたれ！`;

/** ネフダマヨイのあと（E 作）。 */
export const S07_AFTER_NEFUDA = `@npc_c3_seri_deshi
……値札、おとなしく
なりました。{w=300}
最後の 1回、いきます。`;

/** 〔3回目のあと〕60 10.7。 */
export const S07_UTTA_A = `@narr
{name:npc_c3_seri_deshi}が、息を すいこんだ。
@npc_c3_seri_deshi
{shake}……は、{/shake}{w=300}
……はい、売った！`;

export const S07_UTTA_B = `@npc_c3_seri
……ひゃく……{w=300}
……いや。
/
……わしより、ええ 声じゃ。
@npc_kanenari
師匠に ほめられたで！
@npc_c3_seri_deshi
……あ。{w=300}
……あの、これ。
/
市場の 割り箸です。{w=300}
今日の 魚、{name:npc_c3_shokudo}さんの
店に 届きます。`;

export const S07_GOT_HASHI = `@sys
割り箸を 受けとった！
部品①『お箸』が そろった！`;

export const S07_KOUIKA = `@npc_hirosuke
ども！{w=300}
コウイカ、もらってくよ！
……墨が たっぷり なんでね！`;

// ================================================================ 10.8 S08 ② 食堂かもめ

/** 〔evt_ch3_shokudo〕ゴロウの本音のあと、ナミエに話す。 */
export const S08_START_A = `@npc_c3_shokudo
……え？ はっち先生の？{w=300}
あんた、はっち先生の
教え子の 教え子かい！
/
わたしも、2年 教わったのよ。
{w=300}赤ペンの はなまる、
もらいそこねたけど。`;

/** おばあが来ていれば（60 10.8・3.4）。 */
export const S08_OBAA = `@npc_obaa
……{name:npc_c3_shokudo}。
おかわり、ひかえめにね。
@npc_c3_shokudo
先生！？`;

export const S08_START_B = `@npc_c3_shokudo
ねえ、手伝って くれる？
{w=300}最後の 日替わり、
黒板が 空白 なんよ。
/
今日の 魚と、何か 1品。
……町じゅうの 物で、
最後の 定食を 作りたいの。`;

/** 定食の品（60 10.8 の表。台詞はナミエ）。 */
export const TEISHOKU = {
  sakana: { name: '煮つけの 魚', nami: `@npc_c3_shokudo
これこれ、今日の 魚！` },
  himono: { name: 'アジの 干物', nami: `@npc_c3_shokudo
{name:npc_c3_himono_otto}さんとこの、ほどよいの！` },
  tofu: { name: '豆腐の 小鉢', nami: `@npc_c3_shokudo
豆腐、ええ 角じゃね！` },
  tomato: { name: 'トマトの 小鉢', nami: `@npc_c3_shokudo
星見台の トマト！` },
  coffee: { name: '食後の コーヒー', nami: `@npc_c3_shokudo
コーヒーまで ついとる！` },
} as const;
export type TeishokuId = keyof typeof TEISHOKU;
export const TEISHOKU_ORDER: TeishokuId[] = ['sakana', 'himono', 'tofu', 'tomato', 'coffee'];

/** 品が1つ ふえたとき（$n 品）。 */
export function teishokuGot(name: string, n: number): string {
  return `@sys
定食の 品が ふえた！\n『${name}』　品 ${n}/5`;
}

/** 2品に足りないとき（E 作。5.4「もう 少し 集めて みて」）。 */
export const S08_MORE = `@npc_c3_shokudo
あと 1品、ほしいねえ。
{w=300}干物屋さんの 言い合い、
止めて きて くれる？`;
export const S08_MORE_SAKANA = `@npc_c3_shokudo
魚は、市場の セリが
終わらんと 届かんのよ。
{w=300}ほかの 物でも ええよ。`;

/** 干物屋（〔c1_2〕S08 の材料。60 10.8：選択肢「どっちも ほどよい」で止める。E 作）。 */
export const HIMONO_ASK = `@npc_c3_himono_otto
干しすぎ！
@npc_c3_himono_tsuma
干したりない！
@npc_kanenari
しゅん、どっちの 味方や？
? どっちも ほどよい | 干しすぎ | 干したりない`;
export const HIMONO_OK = `@npc_c3_himono_otto
……ほどよい？
@npc_c3_himono_tsuma
……ほどよい。{w=300}
そう 言われたら、そうかも。
/
ほら、いちばん ほどよいの。
{name:npc_c3_shokudo}さんとこへ 持って いき。`;
export const HIMONO_NG = `@npc_c3_himono_otto
ほら 見い！
@npc_c3_himono_tsuma
ほら 見い！
@npc_kanenari
……言い合いが ふえたわ。`;

/** 来た人から品をもらう（60 3.4 の「手を貸す」。E 作）。 */
export const KITA_TOFU = `@npc_mamekichi
最後の 定食？{w=300}
そりゃ 豆腐が いるだろ！
……角、とがらせて おいた。`;
export const KITA_TOMATO = `@npc_hoshi_mitsu
ほどよく 冷えとる。{w=300}
……小鉢に 1つ、持っていけ。`;
export const KITA_COFFEE = `@npc_master
食後の 1杯、
食堂さんに 届けて ください。
{w=300}豆は、タケじいの。`;

/** 盛りつけ（台所。ナミエの指示で皿を置く。並べ方は ふつうの 和食の 置き方。E 作）。 */
export const MORI_INTRO = `@npc_c3_shokudo
さ、盛りつけよ。{w=300}
置く 所、まちがえんでね。
@npc_kanenari
足、14本 あるからな。
{w=300}……手は 2本や。`;
export const MORI_STEPS = [
  { ask: `@npc_c3_shokudo
ごはんは、どこ？
? 手前の 左 | 手前の 右`, ok: 0 },
  { ask: `@npc_c3_shokudo
みそ汁は？
? 手前の 右 | 奥の 左`, ok: 0 },
  { ask: `@npc_c3_shokudo
主菜の お皿は？
? 奥の 右 | 手前の まん中`, ok: 0 },
];
export const MORI_OK = `@npc_c3_shokudo
そう、そこ！`;
export const MORI_NG = `@npc_c3_shokudo
おしい！{w=300}
……ここよ、ここ。`;
export const MORI_DONE = `@narr
最後の 日替わり定食が、
カウンターに 並んだ。`;

/** 来ていれば：黒板（ソワカ）・のれん（ふでの先生）・コーヒー（かずゆき）。60 3.4。E 作。 */
export const S08_SAWAKO = `@npc_hoshi_sawako
黒板、描いて おいたよ。
{w=300}『本日の 日替わり』……
『さいごの 定食』。`;
export const S08_FUDENO = `@npc_fudeno
のれんの 裏に、1つ。
{w=300}……『ありがとう』。`;

/** 盛りつけのあと、大鍋のふたがガタガタ（60 10.8・6.6。E 作）。 */
export const S08_NABE = `@narr
台所の 大鍋の ふたが、
ガタガタ 鳴りだした。
@npc_c3_shokudo
あらあら、また……。{w=300}
おかわり、あるよ！
@npc_kanenari
鍋が 言うとるんかい！`;

/** 〔オカワリナベのあと〕60 10.8。 */
export const S08_GOCHISOU_A = `@npc_c3_jouren
……………………{w=600}
……ごちそうさま。`;
export const S08_GOCHISOU_B = `@narr
……サイレンは、鳴らなかった。
@npc_c3_shokudo
……ごちそうさまは、
おしまいじゃ なくて、
ありがとう なんだね。`;
export const S08_GOCHISOU_C = `@npc_c3_shokudo
40年、ありがとう ございました。
@npc_c3_jouren
明日から、わしが 船で
弁当を 作るわい。{w=300}
……まずいぞ。
@npc_c3_shokudo
あはは！{w=300}
しょうゆは、ひかえめにね。`;
/** かずゆきが来ていれば（S08 のしめ。60 3.4。E 作）。 */
export const S08_COFFEE = `@npc_master
食後の コーヒーです。
{w=300}……ぶーさんの 席も、
取って あります。`;
export const S08_GOT_GASSHO = `@sys
部品②『手を 合わせる』が
そろった！`;
/** 60 10.8 の注。 */
export const S08_OUTSIDE = `@npc_c3_shokudo
……店の 中だけ、正午が
終わった みたい。`;

// ================================================================ 10.9 S09 ③ 海水浴場

/** 〔evt_ch3_kaisui〕60 10.9。 */
export const S09_START = `@npc_c3_mago
波が 止まっとるじゃろ。{w=300}
海に 入っても、
音が せんの。
/
……それに、去年 ここで、
貝の ブレスレット、なくした。
{w=300}見つかるまで、入りたくない。
@npc_kanenari
……海の 中なら、
わいの 出番や。
@npc_c3_kanshiin
ピッ！{w=300}……あ、つい。
遊泳は、もう……。
/
……いや、監視員として 言います。
{w=300}その 体なら、だいじょうぶ。`;

/** 潜る所を教える（E 作）。 */
export const S09_WHERE = `@npc_kanenari
港の 階段か、この 浜から
潜れるで。{w=300}
しゅんは、岸で 待っとって。`;

/** 潜るか（港の階段・波打ちぎわで南へ。E 作）。 */
export const DIVE_ASK = `@npc_kanenari
潜って くるか？
? 潜る | やめとく`;
/** 潜りを始める前に海へ押したとき（E 作）。 */
export const DIVE_NOT_YET = `@npc_kanenari
……海の 中、気に なるな。
{w=300}けど、今は 用が ないわ。`;

/** 9.4 の グソっ君のひとこと。 */
export const MOGURI = {
  first: `@npc_kanenari
……海の 中は、体が かるいわ。
{w=300}陸より、ずっと。
/
……なんで、ええんやろ。`,
  ka: `@npc_kanenari
『か』や。{w=300}
これで『かもめ』に もどるで。`,
  megane: `@npc_kanenari
めがねや。{w=300}
ふちに『${MI}』って 書いとる。`,
  shikake: `@npc_kanenari
釣りの 仕掛けや。{w=300}
……針は、ついとらんな。
よかった。`,
  bracelet: `@npc_kanenari
白い 貝の ブレスレット。
{w=300}……{name:npc_c3_mago}の やな。`,
  fuchi: `@npc_kanenari
この 先は、もっと 深い。
{w=300}……なんか、なつかしい においや。
/
……けど、今日は ここまでや。`,
} as const;
/** 拾ったときの @sys。 */
export function moguriGot(name: string): string {
  return `@sys
${name}を 拾った！`;
}
/** 上がるか（上がり口。E 作）。 */
export const UMI_UP_ASK = `@npc_kanenari
上がるか？
? 上がる | まだ 探す`;
/** 地図がないあいだの潜り（暗い画面の代わり。E 作）。 */
export const MOGURI_DARK = `@narr
グソっ君は、海の 底を
ゆっくり 歩いて いった。`;

/** 浜へもどったとき（ブレスレットがある）。60 10.9。 */
export const S09_BRACELET = `@npc_c3_mago
……あった！{w=300}
去年の！
/
でも、波が 止まっとると、
やっぱり こわい。{w=300}
海が、息を してないもん。
@npc_c3_toudai
波は、光で 起こせるよ。
{w=300}昼の 灯台にも、
仕事は あるの。`;
/** テルの案内（E 作）。 */
export const S09_TERU = `@npc_c3_toudai
灯台の 上へ おいで。
{w=300}レンズの みがき方、
教えて あげる。`;
/** ブレスレットを まだ 見つけていないとき、ウミにまた話すと（E 作）。 */
export const S09_MAGO_WAIT = `@npc_c3_mago
……貝の ブレスレット。
{w=300}白い 貝が、7つ。`;
/** レンズのあいだ、ウミにまた話すと（E 作）。 */
export const S09_MAGO_LENS = `@npc_c3_mago
波が もどったら、
入れる 気が する。`;

/** 灯台のレンズ（map_c3_toudai。テルに教わる光の謎。E 作）。 */
export const LENS_TERU = `@npc_c3_toudai
レンズは、布で まあるく
みがくの。{w=300}
……ほら、光が 集まった。
/
海に、印の ブイが 3つ。
{w=300}西と、南と、東。
光を 当てたら、波が 起きる。`;
/** まつ先生が来ていれば（60 3.4：1つ目の答え。E 作）。 */
export const LENS_FUMI = `@npc_hoshi_fumi
1つ目は、西の 港の 口。
{w=300}……光は、まっすぐ 進むよ。`;
export const LENS_DIRS = ['西', '南西', '南', '南東', '東'] as const;
/** ブイのある向き（LENS_DIRS の番号）と、その場所。 */
export const LENS_BUOYS = [
  { dir: 0, place: '港の 口' },
  { dir: 2, place: '防波堤の 外' },
  { dir: 4, place: '浜の 沖' },
] as const;
export function lensAsk(dir: number, n: number): string {
  return `@narr
レンズは いま、${LENS_DIRS[dir]}を 向いている。
動いた 波 ${n}/3
? 西へ 回す | 東へ 回す | 光を 当てる | やめる`;
}
export function lensHit(place: string, n: number): string {
  return `@narr
光の 筋が、${place}の ブイに
とどいた。{w=300}波が 1つ、動きだした。
動いた 波 ${n}/3`;
}
export const LENS_MISS = `@narr
光は、なにも ない 海に
落ちた。`;
export const LENS_AGAIN = `@narr
そこの 波は、もう 動いている。`;
export const LENS_DONE = `@npc_c3_toudai
浜に、波が 寄せとる。
{w=300}……昼の 灯台も、
ちゃんと 仕事 したね。`;
/** 来ていれば：マサル（波が戻るのを数える。60 3.4。E 作）。 */
export const LENS_GEN = `@npc_hoshi_gen
……ひとつ、ふたつ。
{w=300}……数えて、見送る。`;

/** 〔波がもどった〕60 10.9。 */
export const S09_FIN_A = `@npc_kanenari
ほな、わいが 先に 行くで。`;
export const S09_FIN_B = `@npc_c3_mago
……あはは！{w=300}
なに、その 泳ぎ！`;
export const S09_FIN_C = `@npc_c3_mago
……最後の 海って、
来年の 最初の 海の、
前の 日だよね。`;
export const S09_FIN_D = `@npc_c3_kanshiin
今年も、ありがとう
ございました！{w=300}
……ピッ！
@narr
{name:npc_c3_mago}が、大きな 声で 言った。
@npc_c3_mago
いっただっきまーす！
@npc_kanenari
まだ ごはん ちゃうで！
@npc_c3_mago
海の 家の お昼！{w=300}
{name:npc_c3_kanshiin}兄ちゃんが、笛で
合図 したもん！`;
/** 来ていれば：さや（「最後の 海」の絵をウミに見せる。60 3.4。E 作）。 */
export const S09_SAE = `@npc_sae
『最後の 海』、描けた。
{w=300}……{name:npc_c3_mago}ちゃん、
まん中に 入れといたよ。`;
export const S09_GOT_KOE = `@sys
部品③『いただきます の 声』が
そろった！`;

// ================================================================ 10.10 S10 あぜ道市（来る人）

/** 〔便が着いたとき〕1回目。60 10.10。 */
export const BIN_FIRST = `@npc_hirosuke
ども！{w=300}
夕鳴町と 星見台から、
お客さん 連れてきたよ！
/
止まった 町は、さびしいけえ。
{w=300}……あ、いや、さびしいからね！`;
/** 2回目から。 */
export const BIN_AGAIN = `@npc_hirosuke
ども！ また 連れてきたよ！`;

/** 着いたときのひとこと（60 10.10 の表。／は改行）。 */
export const KITA_LINE: Record<string, string> = {
  npc_obaa: '教え子の 店が、今日で\nおしまいと 聞いてね。',
  npc_mamekichi: 'まいど！ 海の 町にも、\n豆腐の 角を 届けに 来た！',
  npc_hoshi_mitsu: 'ほどよい 海じゃな。\n……ちと、まぶしいが。',
  npc_hoshi_gen: '……海は、数えにくいな。\n波が、止まっとる。',
  npc_hoshi_fumi: 'はっち先生から、手紙で。\n昼の 灯台を、見たくてね。',
  npc_hoshi_kucho: 'えー、星見台 区長の ハモで\nございます。……海で ございます。',
  npc_tsurumi: '本官、休暇で あります！\n……鉄棒は、ありますか！',
  npc_sae: '海の 絵、描きに 来た。\n……13枚目、まだ 題が ないの。',
  npc_ojii: 'みかんの 斜面が あると、\n聞いてな。',
  npc_tamotsu: '海の ぬし。……待つ 釣りは、\n海でも できる。',
  npc_tokio: '町の 時計が、ぜんぶ 12時。\n見て おきたくて。',
  npc_master: '海の 店、1日だけ 出します。\n豆は、タケじいの。',
  npc_madam: 'コタロウ、海は はじめてよ。\n……日傘、正解ね。',
  npc_bu_body: '有給、とりました。\n……限界です。海が、まぶしい。',
  npc_maru: 'トマじいと、2人で 来たんよ。\n……バスじゃ なくてね。',
  npc_hoshi_tome: '……海の 米は、とれんのか。',
  npc_hoshi_sawako: '看板が、ぜんぶ 印刷だ。\n……描いて いいかい。',
  npc_hoshi_yoshie: 'お茶 入れるけえ、\n休んで いきんさい。',
  npc_jk: '父さんの トマト、海でも\n売るって 言うけえ。',
  npc_hoshi_busdriver: '海ぞいの 町あての 手紙、\nたまってたんだ。',
  npc_hoshi_traindriver: '………………海。',
  npc_fudeno: 'のれんの 字を、書きに。\n……最後の 日の。',
  npc_photo_master: '1枚、撮らせて もらおうと\n思ってね。',
  npc_mizumaki: '干物に 水、あげても いい？',
};

/** 寄り道の続き（60 3.4 の「寄り道」列。済ませた人だけ）。 */
export const KITA_YORIMICHI: Record<string, string> = {
  npc_mamekichi: '油揚げ、こっちでも\n売れたわい。',
  npc_hoshi_mitsu: 'ほどよく 休め。\n……今日は、わしが 言われる 番か。',
  npc_hoshi_gen: '見回り帳に、海の 欄を\n足した。',
  npc_hoshi_fumi: '昼の 星も、ちゃんと\n空に あるんだよ。',
  npc_tsurumi: '海の 鉄棒は、潮で 重い！',
  npc_sae: '13枚目の 題が 決まった。\n『正午の 海』。',
  npc_tamotsu: '図鑑『みずべ』の 最後の\nページは、『うみ』。',
  npc_tokio: '7つ目の 時計も、\n今 動いてます。',
  npc_master: 'ぶーさんの 席、\n取って あります。',
  npc_madam: 'ピー・コックも、\n走りたがって いたわ。',
  npc_bu_body: '限界です……\nでも、もう 1回。',
  npc_maru: '2人で 食べる お昼は、\nええね。',
  npc_hoshi_tome: '海の ぬしも、ドジョウより\n気が 長いか。',
  npc_hoshi_sawako: '看板の モデル、\nまた たのむよ。',
  npc_jk: '父さん、帽子 かぶってきた。',
  npc_hoshi_busdriver: '『あした』宛ては、\nちゃんと 着いたよ。',
};

/** あぜ道市の店（おばあの『ひのや 出張所』。ショップ。E 作）。 */
export const OBAA_SHOP = {
  title: 'ひのや 出張所',
  first: ['海でも、まいど。{w=300}\n……おにぎりは、食堂の 味を まねたよ。'],
  again: ['はいよ。', '毎度 ありがとね。'],
  noMoney: ['足りないね。{w=300}\n海の 町でも、ツケは なしだよ。'],
  soldOut: ['それは きょうは もう おしまい。'],
  bagFull: ['もちものが いっぱいだよ。'],
  bye: ['……ちゃんと 帰って おいでよ。'],
};

/** ぴょん夫人のお茶（休憩：全回復。E 作）。 */
export const YOSHIE_TEA = `@npc_hoshi_yoshie
お茶 入れるけえ、
休んで いきんさい。
@sys
お茶を いただいた。
HPと 朱肉が もどった！`;

/** 人ごみの人（9.7。台詞なし、調べると1ページ。E 作の分は報告）。 */
export const CROWD_LINE: Record<string, string> = {
  npc_inui: 'えすけも 来ている。\n洗濯物を、海風で 干している。',
  npc_sand_girl: 'ひよりも 来ている。\n砂で、灯台を 作っている。',
  npc_gacha_boy: 'ともきも 来ている。\nガチャの カプセルに、海の 水。',
};

// ================================================================ 10.11 S11 いただきます

export const S11_A = `@npc_c3_shokudo
……そろったんだね。`;
export const S11_B = `@npc_c3_shokudo
この 町の 正午は、
ずっと これの ための
音 だったんだよ。`;
export const S11_GOT = `@sys
ハンコ『いただきます』を
手に 入れた！`;
export const S11_C = `@npc_c3_shokudo
{c=#E23B2E}サイレン塔{/c}の {name:npc_c3_sirenban}さん、
最後の 1回を、押したまま
はなせずに いるの。
/
……行って あげて。`;
/** 部品がそろう前に食堂に入ると（2つまで。E 作）。 */
export const S11_PARTS_NOT_YET = `@npc_kanenari
部品、あと いくつや？`;

// ================================================================ 10.12 S12 ナリオサメ

export const S12_A = `@npc_c3_sirenban
……来たか。{w=300}
正午は、1秒も ずらさん。
/
40年、そうして きた。
{w=300}……最後の 1回も、
ちゃんと 押した。
/
押した。{w=300}……けど、
指が、はなれんのよ。`;
/** めがねを持っていれば（9.4 の落とし物を返す。E 作）。 */
export const S12_MEGANE = `@npc_kanenari
これ、海で 拾うた。
{w=300}ふちに『${MI}』って。
@npc_c3_sirenban
……わしの めがねじゃ。
去年、塔から 落とした。
{w=300}……よう 見える。`;
/** 見晴らし台へ行くよう（E 作）。 */
export const S12_GO_UP = `@npc_kanenari
外の サイレン、
見に 行こか。`;
export const S12_B = `@ナリオサメ:nariosame
……マダ、鳴リ終ワリタク ナイ。
/
鳴リ終ワッタラ、
モウ、ダレモ 呼ベナイ。
@npc_c3_sirenban
わしも、まだ 押したく
なかった。{w=300}
……押したら、終わる 気が して。
@npc_c3_toudai
押しなさい。{w=300}
……わたしの 灯台は、
毎晩 ちゃんと 消して きたよ。
/
消すのも、仕事。{w=300}
朝が 来るから、消すの。`;
/** ゆうが来ていれば（S12：塔の時計の針を見て。60 3.4）。 */
export const S12_TOKIO = `@npc_tokio
12:01 へ、進む 準備は
できてます。`;

/** 〔evt_ch3_nariosame_end〕60 10.12。 */
export const S12_END = `@ナリオサメ:nariosame
……鳴リ……{w=600}
……終ワッタ。
@npc_c3_sirenban
……鳴り終わる って、
ちゃんと 聞いて もらえた
って ことだな。
@npc_kanenari
ええ 音やったで。{w=300}
……ほんまに。`;

/** 戦闘に負けて「戦う前から」のとき、もう一度見晴らし台へ（E 作）。 */
export const S12_RETRY = `@npc_c3_sirenban
……もう 1回、たのむ。`;

// ================================================================ S13 ごちそうさま（60 10.12 の後半）

export const S13_A = `@narr
町じゅうで、
声が そろった。
@sys
ごちそうさま でした！`;
export const S13_GOT = `@sys
ハンコ『ごちそうさま』を
手に 入れた！`;
export const S13_B = `@npc_c3_shokudo
さあ！{w=300}
ほんとの お昼に しよう。
防波堤に、ござ 出して！`;
export const S13_C = `@npc_c3_shokudo
それじゃ、みんなで。
@sys
いただきます！`;
export const S13_D = `@npc_kanenari
……ええ 声やな。`;
/** S14 へのみちびき（60 10.13 の注）。 */
export const S13_BUBBLE = '……港、なんか 来とる。';

// ================================================================ 10.14 S14 案A

export const S14_CONFIRM = `@npc_kanenari
しゅん、この 町で、
やり残し ないか？
? だいじょうぶ | もう 少し 回る`;
export const S14_A = `@npc_tsugao
おう！ しゅん！{w=300}
送ってくぞ！
/
みんなの 昼ごはん、
すんだら 帰るんじゃろ。
{w=300}ほれ、乗れ 乗れ！
@narr
防波堤から、{name:npc_c3_shokudo}の 声。
@npc_c3_shokudo
あんたらの ぶん、
とっとくからね！`;
export const S14_KAIRAN = `@narr
野菜の かごの 下に、
黒い 回覧板。
/
表紙に、白い 字。
『まだまだ団』。`;
export const S14_KN_STOP = `@npc_kanenari
……………………`;
export const S14_POKOSHA = `@npc_pokosha
……すみません。{w=300}
少しだけ、お付き合い ください。
@npc_piichan
コケ。`;
/** 旧水族館の前に止まった軽トラ（第2期の終わり。E 作）。 */
export const TRUCK_AQ = `@narr
ツガオ便の 軽トラ。
運転席には、だれも いない。`;
export const S14_KN_OYA = `@npc_kanenari
……ツガオの おっちゃん。{w=300}
「親」って、もしかして。`;


// ================================================================ 9.3 調べる物（第2期の分）

export const C3_OBJ2: Record<string, { text: string; after?: string }> = {
  obj_c3_kouika: {
    text: `@narr
コウイカが 1箱。墨が たっぷり。
/
箱の 横に、メモ。
『インク用。……親分へ』`,
    // ヒロスケが 買っていったあと（E 作）
    after: `@narr
コウイカの 箱が あった 所。
床に、黒い 墨の しみ。`,
  },
  obj_c3_seri_kane: {
    text: `@narr
セリの 開始の 鐘。
木づちに、黒い 判。`,
    // S07 のあと（E 作）
    after: `@narr
セリの 開始の 鐘。
木づちの 黒い 判は、消えていた。`,
  },
  // 灯台のレンズ（fushigi_ch3_05 の文。60 8章）
  obj_c3_lens: {
    text: `@narr
レンズの 中に、小さな 太陽が
いくつも 入っている。`,
  },
  // W の部屋の物（文は E 作）
  obj_c3_siren_ban: {
    text: `@narr
古い 押しボタン。赤い 傘の 下、
まん中だけ、色が はげている。`,
  },
  obj_c3_siren_kikai: {
    text: `@narr
サイレンの モーターの 箱。
『点検 毎月 1日』の 札。`,
  },
  obj_c3_nariosame: {
    text: `@narr
古い サイレン。羽根の すきまに、
銘板。すみに、黒い 判。`,
    after: `@narr
古い サイレン。銘板の すみに、
チョークの はなまる。`,
  },
  obj_c3_uminoie_menu: {
    text: `@narr
品書き。『かき氷』『おにぎり』
『ラーメン』。……『焼きそば』は ない。`,
  },
  obj_c3_uminoie_kakigori_ki: {
    text: `@narr
かき氷の 機械。
ハンドルを 回すと、しゃりしゃり。`,
  },
  obj_c3_umi_post: {
    text: `@narr
砂に 半分 うまった、郵便受け。
『海の 家』の 字が かすれている。`,
  },
  obj_c3_akimise: {
    text: `@narr
シャッターに、貼り紙。
『貸し店舗』。`,
  },
};

// ================================================================ 3.2 段階2（12:01）と「ほどけたあと」の台詞

/** 〔c2〕60 3.2 の写し。①〜③がほどけたあとは、段階1でもこれ（E）。 */
export const C2_TALK: Record<string, string> = {
  npc_c3_shokudo: `@npc_c3_shokudo
のれん、下ろしたら、
肩が かるう なったわ。{w=300}
……ふしぎ じゃね。`,
  npc_c3_jouren: `@npc_c3_jouren
明日から、わしが 船で
弁当を 作るわい。{w=300}
……まずいぞ。`,
  npc_c3_seri: `@npc_c3_seri
……わしより、ええ 声じゃ。`,
  npc_c3_seri_deshi: `@npc_c3_seri_deshi
明日の 朝も、
わたしが 言います。`,
  npc_c3_mago: `@npc_c3_mago
来年の 最初の 海、
いっしょに 入ろうね。
{w=300}グソっ君も！`,
  npc_c3_kanshiin: `@npc_c3_kanshiin
旗、下ろせました。{w=300}
来年も、ここで 待ってます。
ピッ！……あ、つい。`,
  npc_c3_himono: `@npc_c3_himono_otto
日が 動いたら、
ちょうど ええのが できた。
@npc_c3_himono_tsuma
ほどよい！{w=300}
……あんたが 言うな！`,
  // ミナト（段階2：防波堤の根元。E 作）
  npc_c3_sirenban: `@npc_c3_sirenban
明日からは、チャイムじゃ。
{w=300}……正午は、ちゃんと
来るけえ、ええ。`,
  // 子どもたち（段階2。E 作）
  npc_c3_kid: `@npc_c3_kid_a
昼休み、終わった！
@npc_c3_kid_b
……お昼、おいしかった。
@npc_c3_kid_c
グソっ君、また 来てな。`,
};
/** ①〜③がほどけたあと、段階1のあいだの干物屋（S08 の品を出したあと。E 作）。 */
export const HIMONO_AFTER = `@npc_c3_himono_otto
ほどよいのが、1枚 できた。
@npc_c3_himono_tsuma
……ほかは、まだ 干しすぎ。`;

// ================================================================ 落とし物を返す（9.4 の続き。E 作）

export const RETURN_KA = `@npc_kanenari
看板の『か』、海に
落ちとったで。
@npc_c3_shokudo
あら！{w=300}
……これで『かもめ』に もどるね。`;
export const RETURN_SHIKAKE = `@npc_c3_tsuri
……わしの 仕掛けじゃ。
{w=300}針が ないのは、
ぬしに 持って いかれたんじゃ。`;

// ================================================================ グソっ君の場所ごとのひとこと（62 1.8。60 に文がないので E 作）

export const KN_PLACE: Record<string, string> = {
  c3_minato: `船の におい、ええな。
{w=300}……なんでか、落ちつくわ。`,
  c3_ichiba: `魚、ようけ 並んどるな。
{w=300}……目が 合うたで。`,
  c3_shokudo: `煮つけの におい……。
{w=300}わい、腹 鳴っとるわ。`,
  c3_himono: `干物は、加減が むずかしいで。
{w=300}わいも、日なたは 苦手や。`,
  c3_siren: `塔の 時計、12時の まんまや。
{w=300}……てっぺん、高いなあ。`,
  c3_bouhatei: `海が、鏡みたいや。
{w=300}……わいの 顔、映っとる。`,
  c3_kaisui: `砂、あつない？
{w=300}わい、14本 ぜんぶ あついわ。`,
  c3_dandan: `みかん、まだ 青いな。
{w=300}冬に 来たら、甘いんやろな。`,
  c3_suizokukan: `古い 水族館やな。
{w=300}……ここ、静かすぎるわ。`,
  c3_machi: `正午の 町は、影が 短いな。
{w=300}……わいの 影、どこや。`,
  c3_nidai: `荷台は、ゆれるな。
{w=300}……わい、ゆれるの 好きや。`,
};
/** 第3章のいつもの（場所のひとことのあと、順に。E 作）。 */
export const KN_USUAL3 = [
  `次、どこ 行こか。`,
  `……しゅん、腹 へらん？
{w=300}わいは、へった。`,
  `海の 町、ええとこやな。`,
];

// ================================================================ 導線（5.3 グソっ君の吹き出し）

export const GUIDE_START = '市場、食堂、海水浴場……どこから 行こか。';
export const GUIDE_PARTS = '部品、そろったで。{name:npc_c3_shokudo}さんの 店に 行こ。';
export const GUIDE_SIREN = 'サイレン塔、開いたで。';

// ================================================================ 大事なもの（7.1）の説明

export const MAP_DESC = {
  none: ['子どもの 手描き。', '印が 3つ。'],
  some: (n: number): [string, string] => ['子どもの 手描き。', `はなまる ${n}つ、印 ${3 - n}つ。`],
  all: ['はなまるが 3つ。', 'まん中の 塔に、印が 1つ。'],
  done: ['はなまるが 4つ。', 'どこも、ほどけた。'],
} as const;

// ================================================================ QA（文の検査に渡す）

/** Every msg block of this file, names filled in (textcheck2 measures them). */
export function c3Texts2(): Record<string, unknown> {
  const fill = (v: unknown): unknown =>
    typeof v === 'string' ? fillNames(v) : Array.isArray(v) ? v.map(fill) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, fill(x)])) : v;
  const kita: Record<string, string> = {};
  for (const [id, l] of Object.entries(KITA_LINE)) kita[id] = `@${id}\n${l}`;
  for (const [id, l] of Object.entries(KITA_YORIMICHI)) kita[id + '_y'] = `@${id}\n${l}`;
  for (const [id, l] of Object.entries(CROWD_LINE)) kita[id + '_c'] = `@narr\n${l}`;
  const fucho = FUCHO.map((_, i) => fuchoGot(i, 5));
  const seri: string[] = [];
  for (const [r, round] of SERI_ROUNDS.entries()) {
    seri.push(seriAsk(r));
    seri.push('@narr\n' + round.hands.map((h, b) => seriHandLine(b, h, true)).join('\n'));
    seri.push('@narr\n' + round.hands.map((h, b) => seriHandLine(b, h, false)).join('\n'));
  }
  const lens: string[] = [];
  for (let d = 0; d < 5; d++) lens.push(lensAsk(d, 3).replace(/\n\?.*$/, ''));
  for (const b of LENS_BUOYS) lens.push(lensHit(b.place, 3));
  const kn: Record<string, string> = {};
  for (const [k, t] of Object.entries(KN_PLACE)) kn[k] = `@npc_kanenari\n${t}`;
  KN_USUAL3.forEach((t, i) => (kn['usual' + i] = `@npc_kanenari\n${t}`));
  return fill({
    s07: { S07_START, S07_MORE, S07_SERI_GO, S07_SERI_BUYERS, S07_SERI_KUCHO, S07_SERI_MADAM, SERI_OK, SERI_NG, S07_NEFUDA, S07_AFTER_NEFUDA, S07_UTTA_A, S07_UTTA_B, S07_GOT_HASHI, S07_KOUIKA },
    fucho,
    seri,
    s08: {
      S08_START_A, S08_OBAA, S08_START_B, S08_MORE, S08_MORE_SAKANA, HIMONO_ASK, HIMONO_OK, HIMONO_NG, KITA_TOFU, KITA_TOMATO, KITA_COFFEE, MORI_INTRO, MORI_OK, MORI_NG, MORI_DONE,
      S08_SAWAKO, S08_FUDENO, S08_NABE, S08_GOCHISOU_A, S08_GOCHISOU_B, S08_GOCHISOU_C, S08_COFFEE, S08_GOT_GASSHO, S08_OUTSIDE, HIMONO_AFTER,
      mori: MORI_STEPS.map((s) => s.ask),
      teishoku: Object.values(TEISHOKU).map((t) => t.nami),
      got: Object.values(TEISHOKU).map((t) => teishokuGot(t.name, 5)),
    },
    s09: {
      S09_START, S09_WHERE, DIVE_ASK, DIVE_NOT_YET, MOGURI, UMI_UP_ASK, MOGURI_DARK, S09_BRACELET, S09_TERU, S09_MAGO_WAIT, S09_MAGO_LENS,
      LENS_TERU, LENS_FUMI, LENS_MISS, LENS_AGAIN, LENS_DONE, LENS_GEN, S09_FIN_A, S09_FIN_B, S09_FIN_C, S09_FIN_D, S09_SAE, S09_GOT_KOE,
      got: ['『か』の 字', 'ミナトの めがね', '切れた 仕掛け', '貝の ブレスレット'].map(moguriGot),
    },
    lens,
    s10: { BIN_FIRST, BIN_AGAIN, YOSHIE_TEA, shop: Object.values(OBAA_SHOP).flat().map((t) => `@npc_obaa\n${t}`) },
    kita,
    s11: { S11_A, S11_B, S11_GOT, S11_C, S11_PARTS_NOT_YET },
    s12: { S12_A, S12_MEGANE, S12_GO_UP, S12_B, S12_TOKIO, S12_END, S12_RETRY },
    s13: { S13_A, S13_GOT, S13_B, S13_C, S13_D, bubble: '@npc_kanenari\n' + S13_BUBBLE },
    s14: { S14_CONFIRM, S14_A, S14_KAIRAN, S14_KN_STOP, S14_POKOSHA, S14_KN_OYA, TRUCK_AQ },
    c2: C2_TALK,
    ret: { RETURN_KA, RETURN_SHIKAKE },
    obj2: C3_OBJ2,
    kn,
    guide: [GUIDE_START, GUIDE_PARTS, GUIDE_SIREN].map((t) => '@npc_kanenari\n' + t),
  }) as Record<string, unknown>;
}
