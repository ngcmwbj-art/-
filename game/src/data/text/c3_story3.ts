// 第3章『海ぞいの町の いただきます』 — 第3期（S15〜S24：旧水族館の入口・回廊・ジオラマ・
// 深海の展示室・えさの部屋・大水槽のホールと初戦・えさの倉庫・エゴ・ヤキソバン・
// ヒロスケとポコシャ）の文（60_ch3_story 3.1・3.3・7.1・8・9.5・10.15〜10.24）。
// 演出は src/events/ch3/aq.ts・souko.ts。
// どのページも 3行 × 336px まで（__game.cmd.textcheck2 が見る）。
//
// 60 に文がなく、ここで作った文には「（E 作）」と書いた（報告に一覧）。
// 名札と地の文では、名前に「さん」をつけない。グソっ君の生まれ（S30）は、ここでは言わない。

import { fillNames } from './c3_names';

// ================================================================ 10.15 S15 旧水族館の入口

/** ガラス戸を入ったところ（館の中は 12:00）。 */
export const S15_A = `@npc_pokosha
……着きました。{w=300}
親分が、お待ちです。
@npc_kanenari
親分……。{w=300}
やっぱり、そういう ことか。`;

/** 貼り紙（60 の演出メモを地の文に。E 作）。 */
export const S15_HARIGAMI = `@narr
ガラス戸の 内側に、貼り紙。
『本日 休館』。{w=300}太い 字だ。
/
すみに、黒い 判が 1つ。`;

export const S15_B = `@npc_pokosha
本日は、休館日 です。
{w=300}……みなさまの ための。
/
これ、入館券です。`;

export const S15_GOT = `@sys
入館券を 受けとった！`;

export const S15_KEN = `@narr
『お届け先：大水槽ホール。
品名：小林しゅん（と グソっ君）』
@npc_kanenari
わいら、荷物なんか！
@npc_pokosha
……奥へ、どうぞ。{w=300}
順路の とおりに。`;

/** S15 のあと、外へのガラス戸を押したとき（E 作）。 */
export const AQ_GLASS_SHUT = `@narr
ガラス戸は、外から
閉まっている。`;

/** 鍵のかかった戸（E 作）。 */
export const AQ_LOCKED = `@narr
かぎが かかっている。`;
export const JIMUSHO_SHUT = `@narr
『関係者以外 立入禁止』。`;

/** 券売所の窓：セーブ（10.32。S15〜S19）。 */
export const SAVE_TICKET = ['券売所の 窓。\nここで、きろくを 書く？'];
export const SAVE_TICKET_OPTIONS = ['書く', '書かない'];
export const SAVE_TICKET_DONE = `@narr
入館券の うらに、
きょうの ことを 書いた。`;

// ================================================================ 10.16 S16 回廊「40年の 伝票」

export interface Denpyo {
  /** 太い（ツガオ）・細い（ヒロスケ）・丸い（ポコシャ）。 */
  ji: 'futoi' | 'hosoi' | 'marui';
  text: string;
  star?: boolean;
}

/** 回廊の伝票のメモ 01〜12（60 10.16 の表、西から順に）。 */
export const DENPYO: Denpyo[] = [
  { ji: 'futoi', star: true, text: '『台風。橋が 流れた。\n山回りで 届けた』' },
  { ji: 'futoi', text: '『星見台へ キャベツ 1個\nおまけ』' },
  { ji: 'futoi', text: '『夕鳴町 銀座。焼きそば屋の\n置物を 荷台に 立てて 運ぶ』' },
  { ji: 'futoi', star: true, text: '『駅の ベンチに 坊主。\n……助手席に 乗せた』' },
  { ji: 'hosoi', text: '『荷さばき、はじめて\nほめられた』' },
  { ji: 'hosoi', text: '『焼き芋。親分は 3本 食った』' },
  { ji: 'futoi', star: true, text: '『水族館、閉館。最後の 飼育係が\n泣いとる。……荷台に 乗せた』' },
  { ji: 'marui', text: '『えさ、間に合った』' },
  { ji: 'marui', text: '『ぴーちゃん、ひよこ 3日目』' },
  { ji: 'futoi', text: '『星見台。観望会の 望遠鏡を\n丘の 柱の 下まで』' },
  { ji: 'futoi', text: '『夕鳴町の 子に、えらいな と\n言うた。おつかい らしい』' },
  { ji: 'marui', star: true, text: '『親分、今日も 休まず。\n……40年』' },
];

/** 伝票のいつ（伝票の端の日付の代わり。E 作）。 */
const DENPYO_WHEN = ['40年前', '30年前', '25年前', '20年前', '18年前', '15年前', '10年前', '9年前', '6年前', '3年前', '1年前', 'きのう'];

/** 伝票のメモを読んだとき。 */
export function denpyoRead(i: number): string {
  return `@narr
${DENPYO_WHEN[i]}の 伝票。{w=300}端に、メモ。
${DENPYO[i].text}`;
}

/** 字に気づく（はじめてちがう字を読んだとき・2つ目のちがう字のとき。60「字が3人ぶん」を地の文に。E 作）。 */
const JI_DESC = { hosoi: '細くて、ていねいな 字。', marui: '丸くて、小さい 字。' } as const;
export function denpyoJi(kind: 'hosoi' | 'marui', second: boolean): string {
  if (!second)
    return `@narr
……字が ちがう。{w=300}
${JI_DESC[kind]}`;
  return `@narr
また、ちがう 字。{w=300}
${JI_DESC[kind]}
/
太い 字、細い 字、丸い 字。
{w=300}伝票の 字は、3人ぶん。`;
}

export function denpyoGot(n: number): string {
  return `@sys
伝票の メモを 書きとめた！
メモ ${n}/12`;
}

/** しゅんの印（60 10.16 の表の右の列。第1章・第2章で行った所。E 作）。 */
export const DENPYO_SHIRUSHI: Record<number, string> = {
  1: `@npc_kanenari
星見台や。{w=300}
……ここ、知っとるとこや。`,
  2: `@npc_kanenari
たかしの 店の 置物や！
{w=300}……あれ、荷台で 来たんか。`,
  9: `@npc_kanenari
星見の 丘の 柱や。{w=300}
……あの 晩の 望遠鏡か。`,
  10: `@npc_kanenari
……おつかいの 子。{w=300}
これ、しゅんの ことちゃうか。`,
};

/** 〔12枚目を読んだとき〕（集めた数のあと、1回）。 */
export const DENPYO_12_KN = `@npc_kanenari
ツガオ便、ただの 運び屋 ちゃう。
{w=300}……行き場の ない 人を、
拾うて 乗せて きたんや。`;

/** 回廊の終わり：伝票が4枚に足りないとき（E 作）。 */
export const KAIRO_MORE = `@npc_hirosuke
……壁の 伝票を、
読んで こい。{w=300}
話は、それからじゃ。`;

/** 同じ（そばを通るときの吹き出し。E 作）。 */
export const KAIRO_MORE_BUBBLE = '……伝票を、読んで こい。';

/** 〔回廊の終わり、ヒロスケ〕★4枚で起動。 */
export const KAIRO_A = `@npc_hirosuke
……読んだか。
/
親分は、拾うた もんは
最後まで 面倒を 見る 人じゃ。
{w=300}わしも、その 1人よ。
/
ひとつだけ、例外が ある。`;

/** ヒロスケが白紙の伝票を指でたたく（60 の演出メモを地の文に。E 作）。 */
export const KAIRO_HAKUSHI = `@narr
ヒロスケが、1枚の 伝票を
指で たたいた。{w=300}白紙だ。
/
日付だけが 書いてある。
『8月30日』。`;

export const KAIRO_B = `@npc_hirosuke
40年で、この 日だけ、
親分は 休んだ。
/
その日の ことは、
わしらも 知らん。{w=300}
親分は、ひとりで 出かけた。
@npc_kanenari
……拾うて ばっかりの 人が、
1日だけ、何を
しとったんやろな。
@npc_hirosuke
……ついて 来い。`;

/** 白紙の伝票（fushigi_ch3_07 の文。60 8章。みました帳 ③ は第4期）。 */
export const DENPYO_HAKUSHI = `@narr
40年で、1枚だけ 白い。
日付だけが 書いてある。`;

/** ヒロスケが去ったあと、回廊の東のはしで（ジオラマへの口。E 作）。 */
export const KAIRO_DOOR_SHUT = `@narr
ヒロスケが 立っていて、
先へ 行けない。`;

// ================================================================ 10.17 S17 ジオラマの部屋

/** 〔はじめて入ったとき〕 */
export const DIORAMA_A = `@npc_hirosuke
親分が、町ごとに 押して
きた『まだ』じゃ。
/
……夕鳴町も、星見台も、
おまえが はがした。`;

/** 人形（60 の例の形のまま。名前だけ入れかえる）。 */
export function dollLine(name: string): string {
  return `@narr
${name}の 人形。{w=300}
手の 中に、小さな はなまる。`;
}
/** そのジオラマの人形が、もう みんな光っているとき（E 作）。 */
export const DOLL_ALL = `@narr
人形は、もう みんな
光っている。`;
/** そのジオラマに、しゅんが話しかけた人がいないとき（E 作）。 */
export const DOLL_NONE = `@narr
人形は、小さすぎて
だれだか わからない。`;
/** 光った数（E 作）。 */
export function dollCount(n: number): string {
  return `@sys
光った 人形 ${n}/10`;
}

export const DIORAMA_YURE1 = `@npc_hirosuke
……この 町の もんは、
よう 笑うのう。`;
export const DIORAMA_YURE2 = `@npc_hirosuke
……わしの 知らん 顔も、
ようけ 笑うとる。`;

/** ジオラマの部屋でヒロスケに話しかける（マフィ屋の前。E 作）。 */
export const DIORAMA_HIRO = `@npc_hirosuke
……模型を、よう 見て みい。
{w=300}夕鳴町の、銀座の すみじゃ。`;

/** 3つのジオラマ（調べたとき、人形の前の1ページ。E 作）。 */
export const DIORAMA_TOWN: Record<'yunari' | 'hoshi' | 'umi', string> = {
  yunari: `@narr
夕鳴町の 模型。{w=300}
夕焼けの 色の 小さな 照明。`,
  hoshi: `@narr
星見台の 模型。{w=300}
夜明け前の 青い 照明。`,
  umi: `@narr
海ぞいの 町の 模型。{w=300}
岬の 上に、この 建物。`,
};

/** 〔マフィ屋〕（必須） */
export const MAFIYA_A = `@narr
銀座の すみの 小さな 店。
シャッターが 下りている。
名札『マフィ屋』。
@npc_hirosuke
……わしの 家の 店じゃ。
{w=300}マフィンの 店。
/
20年前、店を たたんで、
家の もんは 町を 出た。
{w=300}その 朝……
/
わしは、駅の ベンチで
寝すごした。
{w=600}……電車が、先に 出た。
@npc_kanenari
……………………
@npc_hirosuke
明日が 来なければ、
店は 閉まらん。{w=300}
電車も 出ん。
/
……だれも、
置いていかれん。
/
じゃけえ、わしは この 町に、
おまえの 会うた 人を
集めた。
@npc_kanenari
……あのツガオ便、
そういう ことやったんか。
/
置いていかれるのは、
つらいわ。{w=300}
わいも、公園で ひとりやった。
/
けど、しゅんが 来たで。
{w=300}……明日が 来たから、
来たんや。`;

/** ヒロスケが背中を向けて、目もとをぬぐう（60 の演出メモを地の文に。E 作）。 */
export const MAFIYA_NUGUU = `@narr
ヒロスケは 背中を 向けて、
サングラスを 少し ずらした。`;

export const MAFIYA_B = `@npc_hirosuke
……親分が 待っとる。{w=300}
わしの 口からは、
もう 言わん。`;

/** マフィ屋をもう一度（E 作）。 */
export const MAFIYA_AGAIN = `@narr
『マフィ屋』の シャッター。
{w=300}小さな 鉄板の 絵の 看板。`;

/** 3つの時計（fushigi_ch3_08 の文）。 */
export const DIORAMA_CLOCK = `@narr
5:00、4:59、12:00。
……2つは、もう 動いている。`;

/** 先の口（黒いカーテン）が、まだのとき（E 作）。 */
export const DIORAMA_DOOR_SHUT = `@npc_kanenari
……ヒロスケ、まだ
話 あるんちゃうか。`;

// ================================================================ 10.18 S18 深海の展示室

export const SHINKAI_A = `@npc_kanenari
……暗いな。{w=300}
しゅん、わいの うしろ
歩き。`;

/** 道案内（吹き出し。60 の台本の4つ）。 */
export const SHINKAI_MIGI = '……右や。';
export const SHINKAI_DANSA = 'そこ、段差 あるで。';
export const SHINKAI_NAZE = '……なんで わい、知っとるんやろ。';
export const SHINKAI_CHAU = 'ちゃう、そっちや。';

/** 〔館内放送〕立入禁止の札の前。 */
export const SHINKAI_PA = `@？？？:pokosha_pa
……そこは、立入禁止です。
/
……でも、今日は、
休館日 なので。`;

/** 飼育日誌の切れはし 01〜06（60 10.18 の表）。すみの時刻は、えさの札のヒント（E 作）。 */
export const NISSHI: { text: string; time?: string }[] = [
  { text: '『よう 食う』', time: '9:00' },
  { text: '『今日も 足 14本、元気』', time: '11:00' },
  { text: '『水温 低め。……毛布は いらんか』', time: '15:00' },
  { text: '『名前を 呼ぶと、こっちを 向く』', time: '12:00' },
  { text: '『今日の 練習、強うなった。\n……強うなりすぎた』' },
  { text: '『焼きそばの においが、\n好きらしい』' },
];

export function nisshiRead(i: number): string {
  const d = NISSHI[i];
  return `@narr
飼育日誌の 切れはし。{w=300}太い 字。
${d.text}${d.time ? `\n/\nすみに、小さく『${d.time}』。` : ''}`;
}
export function nisshiGot(n: number): string {
  return `@sys
飼育日誌の 切れはしを 拾った！
切れはし ${n}/6`;
}
/** グソっ君は首をかしげるだけ（1回）。 */
export const NISSHI_KN = `@npc_kanenari
……だれの ことやろな。`;

/** 展示ケース（9.5）。 */
export const SHINKAI_CASE = ['ダイオウイカ（標本）', 'チョウチンアンコウ', 'メンダコ', 'ラブカ', 'タカアシガニ'];
export function shinkaiCase(i: number): string {
  return `@narr
空の ケース。名札だけ。
『${SHINKAI_CASE[i % SHINKAI_CASE.length]}』。`;
}

/** マリンスノー（fushigi_ch3_09 の文と、グソっ君のひとこと）。 */
export const MARINE_SNOW = `@narr
展示の 中で、白い 粒が
ゆっくり 下へ 降っている。`;
export const MARINE_SNOW_KN = `@npc_kanenari
……これ、下から 見とった。`;

/** 〔いちばん奥・空の水槽〕（必須） */
export const KARA_A = `@narr
いちばん 奥に、空の 水槽。
{w=300}名札は 削られて、読めない。
/
ガラスの 内側に、小さな
引っかき傷が 並んでいる。`;
export const KARA_B = `@narr
グソっ君の よろいが、
少しだけ 冷たかった。`;
/** 空の水槽をもう一度（E 作）。 */
export const KARA_AGAIN = `@narr
空の 水槽。{w=300}
ガラスに、小さな 引っかき傷。`;

/** 「関係者以外」の戸が、まだのとき（E 作）。 */
export const SHINKAI_DOOR_SHUT = `@narr
「関係者以外」の 戸。
{w=300}鍵が かかっている。`;

// ================================================================ 10.19 S19 えさの時間の部屋

export const ESA_A = `@npc_pokosha
……自分、ここの
最後の 飼育係 でした。
/
係長に、毎日
どなられて いました。
{w=300}えさが 遅いって。
/
トラックが 遅れても、
『おまえの せいだ』って。
{w=300}……記録は、係長の 名前で。
@npc_kanenari
……そんなん、
ポコシャの せいや ないやん。
@npc_pokosha
毎朝、えさを 届けに 来て
くれたのが、ツガオ便 でした。
/
親分だけが、毎朝、
『えさ、間に合うたか』って。
{w=300}……声を、かけて くれた。
/
閉館の 日、生き物は
ほかの 水族館へ 移りました。
/
……1つだけ、
引き取り先が 決まらなかった。
/
{w=1200}
/
親分が『わしが 預かる』と
言って。{w=300}
自分も、荷台に 乗りました。
/
親分は、あの日から、
えさの 時間に なると、
ここへ 来ます。
/
空の 水槽の 前に 座って、
何も しないで、帰る。
/
40年、1日しか 休んで
いない 人です。{w=300}
休んだら、その 1日の ことを
/
思い出して しまう から。
{w=300}……自分は、そう 思って
います。`;

/** 〔鍵〕 */
export const ESA_KEY = `@npc_pokosha
これ、大水槽ホールの 鍵 です。
{w=300}飼育係の 名札つき。
/
親分を、休ませて
あげて ください。
/
……自分たちでは、
言えないんです。`;
/** 〔札〕（えさの札がそろっていれば、1ページ足す） */
export const ESA_FUDA_LINE = `@npc_pokosha
……12時の えさは、
いつも 親分が 自分で。
{w=300}だれの えさかは、言わずに。`;
export const ESA_GOT = `@sys
大水槽ホールの 鍵を 受けとった！`;

/** 鍵のあと、ポコシャにもう一度（E 作）。 */
export const ESA_AFTER = `@npc_pokosha
……ホールは、南の 通路の
先 です。{w=300}
自分は、ここに います。`;

/** えさの札（任意の小さな謎。E 作：日誌のすみの時刻の順に、左からかける）。 */
export const FUDA_TIMES = ['9:00', '11:00', '12:00', '15:00'];
export const FUDA_INTRO = `@narr
えさの 時間の 札かけ。
札が 4枚、ばらばらに
落ちている。`;
export const FUDA_HINT = `@npc_kanenari
日誌の すみに、時間
書いてあったな。{w=300}
朝から 順や。`;
export function fudaAsk(k: number): string {
  return `@narr
左から ${k + 1}番目の かけ金。`;
}
export const FUDA_NG = `@narr
札が、すとんと 落ちた。
{w=300}……順番が ちがうらしい。`;
export const FUDA_OK = `@narr
札が 4枚、きれいに 並んだ。
9:00、11:00、12:00、15:00。`;
export const FUDA_DONE = `@narr
えさの 時間の 札。
9:00、11:00、12:00、15:00。`;
export const FUDA_LATER = `@narr
……また 今度に しよう。`;

/** えさの部屋の物（9.5）。 */
export const ESA_BOARD = `@narr
えさの 時刻表。
担当の 名前は、消してある。
/
すみに、消しきれない 字。
『係長』。`;
export const ESA_CLOCK = `@narr
12:00 で 止まっている。`;
export const ESA_BUCKET = `@narr
オキアミの 空き箱。
『冷凍』の 字が かすれている。`;

/** ホールへの通路の戸、鍵の前（E 作）。 */
export const ESA_DOOR_SHUT = `@narr
飼育係の 通路。{w=300}
鍵が かかっている。`;

// ================================================================ 10.20 S20 大水槽のホール

export const HALL_A = `@npc_tsugao
……よう 来たのう、
しゅん坊。
/
ここは、わしの
最後の 休み場じゃ。`;
/** 表の口調が一度だけもれる（表の声で）。 */
export const HALL_EBI = `@ツガオ:tsugao_omote
{w=600}……でっけえ エビ、だな。`;
export const HALL_B = `@npc_tsugao
……いや。{w=300}
こっちの 話じゃ。
@npc_kanenari
……エビ ちゃう。{w=300}
……グソクムシや。
@npc_tsugao
わしゃあ 40年、
1日しか 休んどらん。
/
その 1日の ツケを、
わしは まだ 払いきっとらん
のじゃ。
/
仁義は 切らせて もらう。
{w=300}……少しだけ、
起きとって やろう。`;

/** 戦闘が無いあいだの代わり（60 6.8 の〔登場〕〜〔終わり〕を地の文で）。 */
export const TSUGAO1_STANDIN = `@narr
ツガオは 長いすに すわった まま だ。
{w=300}……仁義は 切らせて もらう。
/
朱の インクが、黒い『まだ』に
はじかれた！
@npc_tsugao
……この程度じゃあ、
寝てしまうわい。`;

/** 〔evt_ch3_tsugao1_end〕 */
export const T1END_A = `@npc_tsugao
……ヒロスケ。{w=300}ポコシャ。
@npc_hirosuke
はい。`;
export const T1END_B = `@npc_pokosha
……さすが、親分。
@narr
ポコシャの 声は、
いつもより 小さかった。`;
export const T1END_C = `@npc_tsugao
……つがおちゃん 寝る〜♪`;

/** ホールの物（9.5）。 */
export const HALL_SUISOU = `@narr
空っぽの 大水槽。
青い 光だけが、残っている。`;
export const HALL_BENCH = `@narr
長いす。まん中だけ、
少し へこんでいる。`;
export const HALL_PACK = `@narr
焼きそばの たかしの 包み。
冷めている。`;

// ================================================================ 10.21 S21 えさの倉庫

export const SOUKO_A = `@npc_hirosuke
……焼き芋、置いとくけえ。`;
export const SOUKO_EGO = `@エゴ:dakoku
ホリョ 2メイ。{w=300}
……ニュウカン ダコク。
ガチャン。`;
/** エゴが台車で小窓の外を横切る（地の文。E 作）。 */
export const SOUKO_EGO_NARR = `@narr
扉の 小窓の 外を、
台車が 横切っていく。
{w=300}上に、しゅんの ハンコケース。`;
export const SOUKO_B = `@グソっ君:gusokkun_yowai
……わい、あの 人の 前で、
足が 動かへんかった。
/
海では 敵なしや
言うてたのに、
かっこ悪いな。`;
export const SOUKO_IMO = `@narr
しゅんは、冷めた 焼き芋を
半分に 割って、わたした。`;
export const SOUKO_C = `@グソっ君:gusokkun_nurui
……ぬるいわ。
/
{w=600}ぬるいのに、うまいわ。`;
export const SOUKO_HEAL = `@sys
HPと 朱肉が 回復した。`;

// ================================================================ 10.22 S22 エゴの「まだ」

export const EGO_A = `@エゴ:dakoku
……オキテ イマスカ。
{w=300}ガチャン。
@npc_kanenari
……起きとるで。
@エゴ:dakoku
ツガオ ダンチョウ ノ カード。
{w=300}ガチャン。
/
シュッキン、1万4千6百 カイ。
{w=300}タイキン、0 カイ。
{w=300}ガチャン。
@npc_kanenari
……1回も、
帰っとらんのか。
@エゴ:dakoku
ワタシ ハ、40ネン、
タイキン ヲ オシテ
モラッタ コトガ アリマセン。`;
/** 白紙のカードを半分だけ出す（地の文。E 作）。 */
export const EGO_CARD_NARR = `@narr
エゴの すきまから、カードが
半分だけ 出てきた。{w=300}白紙。
日付は『8月30日』。`;
export const EGO_CARD = `@エゴ:dakoku
……コノ ヒ ハ、
ダコク シテ イマセン。`;
export const EGO_KACHI = `@npc_kanenari
……今、カチって
言うたな。`;

/** 倉庫の物（9.5）。 */
export const SOUKO_BOX = `@narr
空き箱が 積んである。
『南極産』の 字。`;
export const SOUKO_DENKYU = `@narr
裸電球が、少し ゆれている。`;
/** S21〜S22 のあいだに扉を調べる（夜の前。E 作）。 */
export const SOUKO_DOOR_LOCKED = `@narr
重い 扉。{w=300}
外から 鍵が かかっている。`;

// ================================================================ 10.23 S23 ヤキソバン

export const YK_A = `@narr
錠は 外れている。{w=300}
でも、扉が 開かない。
/
扉の 内側に、黒い 判。
『まだ』。
@npc_kanenari
……出さへん、て ことか。`;
export const YK_NIOI = `@npc_kanenari
……この におい。`;
export const YK_KOGE = `@？？？:maruyama
……焦げは、
こそげりゃ 落ちる。`;
export const YK_SANJO = `@？？？:maruyama
ヤキソバン、
出前に 参上。`;
export const YK_B = `@npc_kanenari
た、たかしやんか！{w=300}
その かっこ、
どっから 出てきたん！
@npc_yakisoban
……店の 前に、
立っとるだろう。
/
……いいから、前を 見ろ。`;
export const YK_C = `@npc_kanenari
……なんで、ここが
わかったん。
@npc_yakisoban
青のりが 切れてな。
{w=300}この 町まで、
仕入れに 来た。
/
港に、ツガオ便が
止まっとった。{w=300}
運転席に、うちの 包みが。
/
……40年、毎晩、閉店まぎわに
最後の 1パックを
買っていく 客が いる。
/
『冷めても ええ』と 言ってな。
{w=600}……あの 人だ。
@npc_kanenari
……ツガオの おっちゃんが。`;
export const YK_CASE = `@sys
ハンコケースを 取りもどした！`;
export const YK_D = `@npc_yakisoban
ボウズ。{w=300}グソっ君。
/
腹が へっては、
話も できねえ。{w=300}
……行くぞ。`;
export const YK_JOIN = `@sys
ヤキソバンが 仲間に なった！`;

/** 廊下の机（ケースのあと。E 作）。 */
export const ROUKA_DESK = `@narr
古い 机。{w=300}
ケースが 置いてあった あとが、
ほこりに 残っている。`;

/** ヤキソバンに話しかける（フィールド。E 作）。 */
export const YK_TALK = [
  `@npc_yakisoban
……前を 見ろ。{w=300}
鉄板は、あたたまっとる。`,
  `@npc_yakisoban
……ひげは、描いた。
{w=300}それ以上は、聞くな。`,
];

// ================================================================ 10.24 S24 ヒロスケ・ポコシャ戦

/** 〔evt_ch3_hp_intro〕 */
export const HP_INTRO = `@npc_hirosuke
親分は、40年
寝とらんのじゃ。
{w=300}……今、やっと 座っとる。
@npc_pokosha
起こさないで ください。
{w=300}……お願い、です。
@npc_yakisoban
……起こしに 来たんじゃねえ。
/
冷めた 焼きそばを、
あたためなおしに 来たんだ。`;

/** 戦闘の中で出す分（戦闘が無いあいだだけ、フィールドで。60 6.9 の1段目のおわり）。 */
export const HP_STANDIN = `@npc_hirosuke
……マフィ屋の 鉄板も、
まだ、物置に あるんじゃ。`;

/** 〔2段目のあと〕ポコシャが、はじめて大きな声（ここから E。B の戦闘は名札のはなまるまで）。 */
export const HP_END_A = `@npc_pokosha
……自分は、
悪く ない！
!se se_piichan_big
@npc_piichan
{shake}コケーーッ！{/shake}
@narr
めんどりの ぴーちゃんが、
はじめて 大きな 声で 鳴いた。`;

/** ポコシャは、すぐ小さな声にもどる。 */
export const HP_END = `@npc_pokosha
……親分は、一度も
どならなかった。
/
『えさ、間に合うたか』って。
{w=300}……毎朝。
@npc_kanenari
……今度は、あんたが
聞く 番や。
/
親分に、『休めたか』って。
@npc_pokosha
……さすが、……グソっ君。`;
export const HP_END_B = `@npc_hirosuke
わしは、軽トラを 回す。
{w=300}……拾うんは、
ツガオ便の 仕事じゃけえ。
@npc_pokosha
自分は、館内放送を。`;

/** 第3期の終わり：廊下の西の戸（S25 の前。いつもの調べる文。E 作）。 */
export const ROUKA_URA = `@narr
従業員の 通路の 戸。
{w=300}向こうで、館内放送の
スピーカーが ジーと 鳴っている。`;
/** 戦いの前に、西の戸を押したとき（E 作）。 */
export const ROUKA_URA_BEFORE = `@narr
従業員の 通路の 戸。
{w=300}鍵が かかっている。`;

// ================================================================ 旧水族館の物（9.5）

export const AQ_OBJ: Record<string, string> = {
  obj_c3_aq_penguin: `@narr
ペンギンの 形の 案内板。
『順路 →』。`,
  obj_c3_aq_speaker: `@narr
館内放送の スピーカー。
小さく、ジー と 鳴っている。`,
  obj_c3_hall_suisou: HALL_SUISOU,
  obj_c3_hall_bench: HALL_BENCH,
  obj_c3_hall_pack: HALL_PACK,
  obj_c3_souko_box: SOUKO_BOX,
  obj_c3_souko_denkyu: SOUKO_DENKYU,
  obj_c3_esa_board: ESA_BOARD,
  obj_c3_esa_clock: ESA_CLOCK,
  obj_c3_esa_bucket: ESA_BUCKET,
  obj_c3_aq_ticket: `@narr
券売所の 窓。
『大人 800円 こども 400円』。`,
};

/** グソっ君の場所のひとこと（62 1.8 c3_aq。E 作）。 */
export const KN_AQ = [
  `……静かやな。{w=300}
水の 音も せえへん。`,
  `ここ、水族館やったんやな。
{w=300}……魚、おらんけど。`,
];
export const KN_SOUKO = `……ここ、寒ないのに、
寒いわ。`;

// ================================================================ QA（文の検査に渡す）

/** Every msg block of this file, names filled in (textcheck2 measures them). */
export function c3Texts3(): Record<string, unknown> {
  const fill = (v: unknown): unknown =>
    typeof v === 'string' ? fillNames(v) : Array.isArray(v) ? v.map(fill) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, fill(x)])) : v;
  const bubble = (t: string) => `@npc_kanenari\n${t}`;
  return fill({
    s15: { AQ_LOCKED, JIMUSHO_SHUT, S15_A, S15_HARIGAMI, S15_B, S15_GOT, S15_KEN, AQ_GLASS_SHUT, ticket: '@narr\n' + SAVE_TICKET[0], SAVE_TICKET_DONE },
    s16: {
      denpyo: DENPYO.map((_, i) => denpyoRead(i)),
      got: denpyoGot(12),
      ji: [denpyoJi('hosoi', false), denpyoJi('marui', false), denpyoJi('hosoi', true), denpyoJi('marui', true)], shirushi: DENPYO_SHIRUSHI, DENPYO_12_KN, KAIRO_MORE, bubble: '@npc_hirosuke\n' + KAIRO_MORE_BUBBLE, KAIRO_A, KAIRO_HAKUSHI, KAIRO_B, DENPYO_HAKUSHI, KAIRO_DOOR_SHUT,
    },
    s17: {
      DIORAMA_A, DIORAMA_HIRO, doll: dollLine('ホシノ・サワコ'), DOLL_ALL, DOLL_NONE, count: dollCount(10), DIORAMA_YURE1, DIORAMA_YURE2, town: DIORAMA_TOWN,
      MAFIYA_A, MAFIYA_NUGUU, MAFIYA_B, MAFIYA_AGAIN, DIORAMA_CLOCK, DIORAMA_DOOR_SHUT,
    },
    s18: {
      SHINKAI_A, guide: [SHINKAI_MIGI, SHINKAI_DANSA, SHINKAI_NAZE, SHINKAI_CHAU].map(bubble), SHINKAI_PA,
      nisshi: NISSHI.map((_, i) => nisshiRead(i)), got: nisshiGot(6), NISSHI_KN, cases: SHINKAI_CASE.map((_, i) => shinkaiCase(i)),
      MARINE_SNOW, MARINE_SNOW_KN, KARA_A, KARA_B, KARA_AGAIN, SHINKAI_DOOR_SHUT,
    },
    s19: { ESA_A, ESA_KEY, ESA_FUDA_LINE, ESA_GOT, ESA_AFTER, FUDA_INTRO, FUDA_HINT, ask: fudaAsk(3), FUDA_NG, FUDA_OK, FUDA_DONE, FUDA_LATER, ESA_DOOR_SHUT },
    s20: { HALL_A, HALL_EBI, HALL_B, TSUGAO1_STANDIN, T1END_A, T1END_B, T1END_C },
    s21: { SOUKO_A, SOUKO_EGO, SOUKO_EGO_NARR, SOUKO_B, SOUKO_IMO, SOUKO_C, SOUKO_HEAL, SOUKO_DOOR_LOCKED },
    s22: { EGO_A, EGO_CARD_NARR, EGO_CARD, EGO_KACHI },
    s23: { YK_A, YK_NIOI, YK_KOGE, YK_SANJO, YK_B, YK_C, YK_CASE, YK_D, YK_JOIN, ROUKA_DESK, talk: YK_TALK },
    s24: { HP_INTRO, HP_STANDIN, HP_END_A, HP_END, HP_END_B, ROUKA_URA, ROUKA_URA_BEFORE },
    obj: AQ_OBJ,
    kn: [...KN_AQ, KN_SOUKO].map(bubble),
  }) as Record<string, unknown>;
}
