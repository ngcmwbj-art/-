// 第3章『海ぞいの町の いただきます』 — 第1期（序〜海ぞいの町に着くまで、S00〜S06）の
// 文（60_ch3_story 1.4・3.2・9.1〜9.3・10.0〜10.6・10.32）。演出（カメラ・音・動き）は
// src/events/ch3。書式は 10_narrative 1.4 の msg ブロック（world/msg.ts）。
// `{name:npc_c3_*}` は表示名（c3_names.ts の C3_NAMES）に置きかえて出す。
// どのページも 3行 × 336px まで（__game.cmd.textcheck2 が見る）。

import { fillNames } from './c3_names';
import { C3_HIRUMAE } from './c3_hirumae';

// ================================================================ 1.4 タイトル・つづきから（UI が使う）

/** 「第3章から」: the confirmation (the same shape as 「第2章から」). */
export const CH3_TITLE_CONFIRM = `@sys
第3章『海ぞいの町の いただきます』から
はじめますか？`;
export const CH3_TITLE_CONFIRM_OPTIONS = ['はじめる', 'やめる'];

/** 「第3章から」 when the save slot is a game in progress: one page first. */
export const CH3_TITLE_OVERWRITE = `@sys
いまの きろくは、
上書きされます。`;

// ================================================================ 10.0 S00 章の扉

export const CH3_TITLE_STAMP = '第3章';
export const CH3_TITLE_NAME = '海ぞいの町の いただきます';

/** The report card's heading when chapter3Adjust() raised a level (61 3.1). */
export const CH3_REPORT_TITLE = 'なつやすみの つうちひょう';

// ================================================================ 10.1 S01 evt_ch3_prologue（小林家、11:10）

export const S01_A = `@npc_mother
おかえり。{w=300}
始業式、どうだった？
/
……あら、2人とも、
顔が まだ 夏休みね。
@npc_kanenari
始業式って、ずっと
立っとるんやな。{w=300}
わい、足 14本 あるのに 疲れたわ。
@npc_mother
ほら、きのうの おまけ。{w=300}
{c=#E23B2E}ひのや{/c}の おばあちゃんに
持っていきなさい。
/
ほかの 3つは、ゆうべ
おいしく いただきました。`;

/** After the tomato is given (give). */
export const S01_GOT = `@sys
トマト（おまけ）を 受けとった！`;

export const S01_TV = `@npc_tv
続いて、各地の 時刻です。{w=300}
海ぞいの 町は、今日も 正午。
/
お昼の サイレンが、
鳴りかけの まま です。`;

export const S01_B = `@npc_mother
……あそこの 人たち、
お昼ごはん、何回目かしら。`;

/** 母に また話しかけたとき（段階0）。S01 の台詞のくり返し。 */
export const MOTHER_C0 = {
  tomato: `@npc_mother
ほら、きのうの おまけ。{w=300}
{c=#E23B2E}ひのや{/c}の おばあちゃんに
持っていきなさい。`,
  after: S01_B,
};

// ================================================================ 10.2 S02 evt_ch3_hinoya

export const S02_A = `@npc_obaa
おや、しゅん。{w=300}
始業式は、立派に 立って
いられたかい。`;

/** しゅんがトマトを出す（give）。 */
export const S02_GIVE = `@sys
トマト（おまけ）を わたした。`;

export const S02_B = `@npc_obaa
……星見台の トマトだね。
{w=300}まつ先生の 村の。
/
ありがとう。{w=300}
はなまる、あげよう。`;

export const S02_C = `@npc_obaa
……それにしても、
海ぞいの 町の 親戚から、
まだ 返事が 来ないんだよ。
/
きのう、お昼に 電話したら、
ずっと『いただきます』の
声が するだけでね。
@npc_kanenari
……ずっと、いただきます？
@npc_obaa
行くなら、あの 町の
食堂に よろしく 言っとくれ。
{w=300}わたしの 教え子が いるんだ。`;

/** おばあに また話しかけたとき（段階0）。S02 の しめの くり返し。 */
export const OBAA_C0 = `@npc_obaa
行くなら、あの 町の
食堂に よろしく 言っとくれ。
{w=300}わたしの 教え子が いるんだ。`;

// ================================================================ 10.3 S03 焼きそばのたかし（閉まっている）

/** 前を通ると、グソっ君の吹き出し（1回）。 */
export const S03_BUBBLE = '……たかし、おらんのか。';

// ================================================================ 10.4 S04 evt_ch3_truck_go

export const S04_A = `@npc_tsugao
おう！ しゅん！{w=300}
始業式か？ えらいな！
/
わしゃ これから、海の 町まで
配達じゃ。{w=300}
……乗ってくか？
@npc_kanenari
海の 町！{w=300}
……乗る！ 乗るで！`;

export const S04_OPTIONS = ['乗る', 'まだ 町に いる'];

export const S04_WAIT = `@npc_tsugao
まあ、ええわい！{w=300}
ひと眠り しとるけえ、
来たら 起こせ。`;

export const S04_RIDE = `@npc_hirosuke
ども！{w=300}
荷台へ どうぞ！ 少年と、
……でっかい 相棒！
@npc_pokosha
……あ。{w=300}
こ、こんにちは……。
@npc_piichan
コケ。`;

/** 荷台（map_c3_nidai）。 */
export const S04_NIDAI_A = `@npc_hirosuke
焼き芋 食うか？
@npc_kanenari
9月1日やで？
@npc_hirosuke
わはは！{w=300}
9月は、もう 芋の 季節さ！`;

export const S04_NIDAI_B = `@narr
潮の においが した。
@npc_kanenari
……この においは、知っとる。
{w=300}
/
知っとるのに、
どこで 知ったか、知らん。`;

export const S04_NIDAI_C = `@narr
正午で、時計が 止まった。`;

// ================================================================ 10.5 S05 evt_ch3_arrive

export const S05_A = `@npc_tsugao
わしゃ 配達が あるけえ。{w=300}
……しゅん、海は 気ぃ つけえよ。
@npc_pokosha
……い、いってらっしゃい。`;

export const S05_B = `@npc_kanenari
……なんや、この 町。{w=300}
影が、足の 真下に しか ない。`;

// ================================================================ 10.6 S06 evt_ch3_kids

export const S06_A = `@npc_c3_kid_a
しゅん、どっから 来たん？
@npc_c3_kid_b
それ、でっかい ダンゴムシ？
@npc_kanenari
ダンゴムシ ちゃうで。{w=300}
エビや カニの なかまや。
@npc_c3_kid_c
へえー！{w=300}
……この 町、昼休みが
終わらんのよ。
@npc_c3_kid_a
みんな、お昼を 何回も
食べよる。{w=300}でも、
「ごちそうさま」が 言えんの。
/
言おうと したら、サイレンが
また 最初から 鳴るんよ。`;

export const S06_B = `@npc_c3_kid_b
市場の {name:npc_c3_seri}じいは、
「ひゃく……」で 止まっとるし。
@npc_c3_kid_c
食堂の {name:npc_c3_shokudo}おばちゃんは、
おかわりばっかり 出しよるし。
@npc_c3_kid_a
{name:npc_c3_mago}は、海に 入れんし。{w=300}
……はい、地図。`;

export const S06_GOT = `@sys
海ぞいの町の 地図を 受けとった！`;

export const S06_C = `@npc_kanenari
ほな、どこから 行こか。`;

// ================================================================ 3.2 海ぞいの町の人（第1期：段階1のいつもの台詞）
//
// キーは `c<段階>_<n>`（3.0。c1_1＝段階1の1回目、c1_2＝2回目から）。①〜③の本筋の
// 起動（S07〜S09）はまだ置かないので、2回目からは いちばん後ろのキーをくり返す。

export const C3_TALK: Record<string, Record<string, string>> = {
  npc_c3_shokudo: {
    c1_1: `@npc_c3_shokudo
いらっしゃい！{w=300}
定食で ええね？
おかわり、あるよ！
/
……あら、見ない 顔。
{w=300}海の 子じゃ ないね。
@npc_kanenari
海の 子……では、
ある かも しれへんな。`,
    c1_2: `@npc_c3_shokudo
{name:npc_c3_jouren}さん、40杯目よ。{w=300}
……あの 人、いつもは 1杯で
「ごちそうさま」なのに。`,
  },
  npc_c3_jouren: {
    c1_1: `@npc_c3_jouren
……もう 1杯。
@narr
{name:npc_c3_jouren}の 前に、からの 茶わんが
高く 積まれている。`,
    c1_2: `@npc_c3_jouren
……わしが ごちそうさまを
言うと、{name:npc_c3_shokudo}の 店は 終わる。
{w=300}……だから、言わん。`,
  },
  npc_c3_seri: {
    c1_1: `@npc_c3_seri
……はい、ひゃくえん、
ひゃく……{w=600}
ひゃく……
@narr
{name:npc_c3_seri}の 声は、そこで
止まったまま だ。`,
  },
  npc_c3_seri_deshi: {
    c1_1: `@npc_c3_seri_deshi
……あ、お客さん？{w=300}
すみません、セリが
終わらんのです。
/
師匠が 言い終わらんと、
わたしは 言えん。{w=300}
……まだ、わたしには。`,
  },
  npc_c3_toudai: {
    c1_1: `@npc_c3_toudai
あら、いらっしゃい。{w=300}
昼の 灯台は、光らんでも
立っとるのよ。
/
うちの 人は、塔の 上。{w=300}
最後の 1回を、まだ
押しきれんのよ。`,
    c1_2: `@npc_c3_toudai
……あんたの 相棒も、
そういう 顔 しとるね。
{w=300}光らんでも、立っとる 顔。
@npc_kanenari
……ほめられたんかな、わい。`,
  },
  npc_c3_mago: {
    c1_1: `@npc_c3_mago
しゅん、いうん？{w=300}
あたし、{name:npc_c3_mago}。
/
今日で、夏休み 終わるじゃろ。
{w=300}今年 最後の 海。
……入ったら、終わる。
/
最後って、こわくない？`,
    c1_2: `@npc_c3_mago
今年 最後の 海。
……入ったら、終わる。
/
最後って、こわくない？`,
  },
  npc_c3_kanshiin: {
    c1_1: `@npc_c3_kanshiin
……あ、こんにちは。
/
監視員の {name:npc_c3_kanshiin}です。{w=300}
遊泳旗を、下ろす 時間なんです。
……でも、下ろしたら、夏が。`,
  },
  npc_c3_himono: {
    c1_1: `@npc_c3_himono_otto
干しすぎ！
@npc_c3_himono_tsuma
干したりない！
@narr
正午の 日が、ずっと
干し台に 当たっている。
/
アジの 開きは、もう
板みたいに なっている。`,
  },
  npc_c3_tsuri: {
    c1_1: `@npc_c3_tsuri
海の ぬしは、陸の ぬしより
気が 長い。{w=300}
わしも 40年、待っとる。
@npc_kanenari
陸の ぬしも、気ぃ 長かったで。`,
  },
  npc_c3_uketsuke: {
    c1_1: `@npc_c3_uketsuke
本日も、休館です。{w=300}
……10年、ずっと。`,
    c1_2: `@npc_c3_uketsuke
ここの 飼育係の 子、
毎朝 軽トラに 乗せて もらって
来とったんよ。
/
えさの 時間に、遅れんように。
{w=300}……いい 子じゃった。`,
  },
  // 港の 市場の お客（fix1015 G2。名前のない町の人：C3_NAMES に入れない＝来る人・よぶの数に入らない）
  c3_ichiba_kyaku: {
    c1_1: `@c3_ichiba_kyaku
お昼の おかずに、アジを
買いに 来たんじゃけど……
/
値札が みんな『ひゃく……』で
止まっとるんよ。{w=300}
いくらか 決まらんと、買えんけえ。`,
    c1_2: `@c3_ichiba_kyaku
アジはね、目が 澄んどって
えらが 赤いのが 新しいんよ。
{w=300}……この アジは、ずっと 新しい。`,
    c2_1: `@c3_ichiba_kyaku
値札に、ちゃんと 字が
入っとる！{w=300}
小アジ、ひと山 ちょうだい。
/
今晩は 南蛮漬けに しよ。
小アジは 二度 揚げたら、
骨まで 食べられるけえね。`,
    c2_2: `@c3_ichiba_kyaku
コウイカは、背中に 白い
甲が 入っとるけえ コウイカ。
/
墨を ようけ 吐くけえ、
スミイカとも 言うんよ。`,
    c4_1: `@c3_ichiba_kyaku
朝の セリが すんだら、
ここで 小売りも するんよ。
{w=300}今日は、何に しよかね。`,
  },
  // 防波堤の子どもたち（3人のだれに話しかけても、1人ずつ順に）
  npc_c3_kid: {
    c1_1: `@npc_c3_kid_a
昼休みが 終わらんけえ、
ずっと 遊べるんじゃ。
@npc_c3_kid_b
でも、ちょっと あきた。
@npc_c3_kid_c
……それ、でっかい ダンゴムシ？
@npc_kanenari
ダンゴムシ ちゃうで。{w=300}
エビや カニの なかまや。`,
  },
};

/** 2回目から、子どもそれぞれの ひとこと（〔c1〕の自分の行）。 */
export const C3_KID_AGAIN: Record<string, string> = {
  npc_c3_kid_a: `@npc_c3_kid_a
昼休みが 終わらんけえ、
ずっと 遊べるんじゃ。`,
  npc_c3_kid_b: `@npc_c3_kid_b
でも、ちょっと あきた。`,
  npc_c3_kid_c: `@npc_c3_kid_c
……あ、エビの なかまの 人。
@npc_kanenari
覚えて くれたんか。{w=300}
……ええ子や。`,
};

/**
 * ツガオ便の2人（表の顔、62 3.4：ヒロスケは市場の前の岸壁、ポコシャは旧水族館の前＝岬 map_c3_misaki）。
 * S10 の〔ヒロスケ c1〕（あぜ道市）までの つなぎ。ヒロスケの「焼き芋 食うか？」は
 * 天丼の回数（2.6）を守って言わせない。
 */
export const C3_TSUGAOBIN = {
  hirosuke: `@npc_hirosuke
ども！{w=300}
師匠は 配達、おれは 荷おろし。
/
海の 町は、ずっと 昼だねえ。
{w=300}わはは！`,
  pokosha: `@npc_pokosha
……あ。{w=300}
こ、こんにちは……。
@npc_piichan
コケ。`,
};

// ================================================================ 9.1〜9.3 調べる物（第1期の分）
//
// 文の `／` はページ内の改行、`//` はページ送り（9章）。〔kn〕は グソっ君の
// ひとこと（1回だけ。flag_kanenari_flip_c3_<obj>）、〔2回目〕は2回目からの文。

export interface C3Obj {
  text: string;
  kn?: string;
  again?: string;
}

export const C3_OBJ: Record<string, C3Obj> = {
  // 9.1 夕鳴町（段階0）
  obj_c3_tv: {
    text: `@npc_tv
続いて、各地の 時刻です。
海ぞいの 町は、今日も 正午。
/
……お昼の サイレンが、
鳴りかけの まま です。`,
  },
  obj_c3_randoseru: {
    text: `@narr
始業式の 手紙。
『2学期も、はなまるを。』`,
  },
  obj_c3_takashi_harigami: {
    text: `@narr
『青のり 切れ。
仕入れに 出ます。たかし』`,
    kn: `@npc_kanenari
焼きそばに 青のり ないの、
考えられへん。`,
  },
  obj_c3_yakisoban_statue: {
    text: `@narr
ヤキソバンの 置物。
昼の 光で、ヘラが 光っている。`,
    again: `@narr
……マントの 緑が、
少し 濃く 見えた。`,
  },
  // 9.2 荷台
  obj_c3_nidai_container: {
    text: `@narr
黄色い コンテナ。
『夕鳴町 → 海ぞいの町』の 伝票。`,
  },
  obj_c3_nidai_cabbage: {
    text: `@narr
星見台の キャベツ。
葉が かたく 巻いている。`,
  },
  obj_c3_nidai_aori: {
    text: `@narr
あおりに、白い チョークの
はなまる。……まだ 消えていない。`,
  },
  // 9.3 海ぞいの町
  obj_c3_shiokaze: {
    text: `@narr
係船柱に、ロープの あと。
40年ぶんの 白い すじ。`,
  },
  obj_c3_gyosen: {
    text: `@narr
小さな 漁船。
名前は『第三 かもめ丸』。`,
    kn: `@npc_kanenari
……船の 下、深いな。`,
  },
  obj_c3_kanbutsuya: {
    text: `@narr
青のり、するめ、ちりめん。
『本日 青のり 入荷』の 札。`,
  },
  obj_c3_toro: {
    text: `@narr
発泡スチロールの トロ箱。
氷が 溶けかけの まま。`,
  },
  obj_c3_noren: {
    text: `@narr
赤い のれん。『かもめ』。
すそが 少し ほつれている。`,
  },
  obj_c3_kokuban: {
    text: `@narr
『本日の 日替わり』。
その下が、空白。`,
  },
  obj_c3_kanban: {
    text: `@narr
『かもめ』の『か』が 落ちて、
『もめ』に なっている。`,
    kn: `@npc_kanenari
……もめとるんか。`,
  },
  obj_c3_menu: {
    text: `@narr
お品書き。『煮つけ定食』
『おかわり 自由』。`,
  },
  obj_c3_siren_tower: {
    text: `@narr
塔の 時計は 12:00。
秒針が、ふるえている。`,
  },
  obj_c3_siren_board: {
    text: `@narr
『サイレンの 引退の お知らせ
9月1日から チャイムに なります』`,
  },
  // 〔ミナト〕塔の下の扉（S11 まで閉まっている。60 3.2）
  obj_c3_siren_zaishitsu: {
    text: `@narr
扉に 貼り紙。
『サイレン番 在室。
正午は、1秒も ずらさん。』`,
  },
  obj_c3_toudai_door: {
    text: `@narr
小さな 扉。『関係者 以外……』
の 下に『どうぞ』と 手書き。`,
  },
  obj_c3_kanshidai: {
    text: `@narr
波の 絵の 旗が 上がっている。
ロープが 少し ゆるんでいる。`,
  },
  obj_c3_umi_kagami: {
    text: `@narr
波が 止まっている。
足を 入れても、波紋が できない。`,
    kn: `@npc_kanenari
……入るんは、わいの 仕事やな。`,
  },
  obj_c3_uminoie_kakigori: {
    text: `@narr
『かき氷』の 旗。
氷は、溶けかけの まま。`,
  },
  obj_c3_uminoie_ukiwa: {
    text: `@narr
浮き輪が 山に なっている。
1つだけ、こっちを 見た 気が した。`,
  },
  obj_c3_tetsubou: {
    text: `@narr
鉄棒。潮で 少し さびている。`,
  },
  obj_c3_aq_harigami: {
    text: `@narr
貼り紙『本日 休館』。
すみに、黒い 判。`,
    kn: `@npc_kanenari
……この 字、どっかで。`,
  },
  obj_c3_aq_kanban: {
    text: `@narr
色あせた 看板。
『ふしぎな 深海生物展』の あと。`,
  },
  obj_c3_hoshi_yasai: {
    text: `@narr
『星見台の やさい』の 木箱。
ツガオ便の 字。`,
  },
  // ふしぎ③の物（8章）。第1期は見て分かる文だけ（「みました」を押すのは第2期のみました帳③と）
  obj_c3_kage: {
    text: `@narr
影が、足の 真下に しか ない。
太陽が、ずっと 真上だ。`,
  },
  obj_c3_bouhatei: {
    text: `@narr
波が ない。海に 空が
そのまま 写っている。`,
  },
  obj_c3_kamome: {
    text: `@narr
羽を ひろげたまま、
カモメが 空に 置いてある。`,
  },
  obj_c3_himono_dai: {
    text: `@narr
日に 当てすぎた アジの 開きに、
日の あとが 輪に なっている。`,
  },
};

// ================================================================ 10.32 セーブ（港のポスト）

export const SAVE_POST = ['赤い ポスト。\nここで、きろくを 書く？'];
export const SAVE_POST_OPTIONS = ['書く', '書かない'];
export const SAVE_POST_DONE = `@narr
ポストに、きょうの ことを
書いた 紙を 入れた。`;

// ================================================================ 海と町のはし（62 1.6）

/** trig_ch3_edge_sea（1回目だけ）。 */
export const EDGE_SEA = `@npc_kanenari
わいだけなら 行けるで。
……潜れるんは、港の 階段と 浜や。`;

/** trig_ch3_edge_road〔町の外〕（60 に文がないので、第1期の仮。12.4 で確かめる）。 */
export const EDGE_ROAD = `@narr
この 先は、山へ 向かう 道。
……今日は、海の 町に 用が ある。`;

/**
 * trig_c3_misaki_edge：海ぞいの町の 東の はし・岬の 西の はし（2026-10-20 旧水族館を 岬へ 移した）。
 * 町と 岬の あいだは 軽トラで 行く 道：歩いて 行こうと すると もどされる。グソっ君が いなければ 地の文。
 */
export const EDGE_MISAKI = `@npc_kanenari
歩いたら、日が 暮れるで。`;
export const EDGE_MISAKI_SOLO = `@narr
歩いて 行くには、遠すぎる。`;

// ================================================================ QA（文の検査に渡す）


/** Every chapter-3 msg block of this file, with the names filled in (textcheck2 measures them). */
export function c3Texts(): Record<string, unknown> {
  const fill = (v: unknown): unknown =>
    typeof v === 'string' ? fillNames(v) : Array.isArray(v) ? v.map(fill) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, fill(x)])) : v;
  return fill({
    title: { CH3_TITLE_CONFIRM, CH3_TITLE_OVERWRITE },
    s01: { S01_A, S01_GOT, S01_TV, S01_B, MOTHER_C0 },
    s02: { S02_A, S02_GIVE, S02_B, S02_C, OBAA_C0 },
    s04: { S04_A, S04_WAIT, S04_RIDE, S04_NIDAI_A, S04_NIDAI_B, S04_NIDAI_C },
    s05: { S05_A, S05_B },
    s06: { S06_A, S06_B, S06_GOT, S06_C },
    talk: C3_TALK,
    hirumae: C3_HIRUMAE,
    kid: C3_KID_AGAIN,
    tsugaobin: C3_TSUGAOBIN,
    obj: C3_OBJ,
    save: { post: '@narr\n' + SAVE_POST[0], SAVE_POST_DONE },
    edge: { EDGE_SEA, EDGE_ROAD, EDGE_MISAKI, EDGE_MISAKI_SOLO },
    bubble: '@npc_kanenari\n' + S03_BUBBLE,
  }) as Record<string, unknown>;
}
