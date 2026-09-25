// 第2章『星見台のトマト』 — the words of the event scripts (50_ch2_story 10章,
// 1.4, 7.1, 10.17, 10.18, 10.19). Staging (camera, sound, moves) lives in
// src/events/ch2. The msg-block format of 10_narrative 1.4 (world/msg.ts),
// plus one line of our own: `!cue <name>` marks where the script does
// something between two pages (src/events/ch2/common.ts runCue: the pages
// before it are shown, the cue runs, the next pages keep the speaker).
// `>` lines are the design book's stage directions, kept where they help.
// Every page: at most 3 lines of 336 px (__game.cmd.textcheck2 checks them).

// ================================================================ 1.4 タイトル・つづきから（UI が使う）

/** 「つづきから」 with the chapter-2 clear data, before chapter 3 exists. */
export const CH2_CONTINUE_CLEARED = `@sys
つづきは、また こんど。
（第2章から、もう一度 遊べます）`;

/** 「第2章から」: the confirmation. */
export const CH2_TITLE_CONFIRM = `@sys
第2章『星見台の トマト』から
はじめますか？`;
export const CH2_TITLE_CONFIRM_OPTIONS = ['はじめる', 'やめる'];

/** 「第2章から」 when the save slot is mid chapter 1 or mid chapter 2: one page first. */
export const CH2_TITLE_OVERWRITE = `@sys
いまの きろくは、
上書きされます。`;

/** The clear card on the title (lines 1–2; the ② line only with the chapter-2 record). */
export function clearCardLines(one: { f: number; a: number; t: number }, two: { f: number; a: number; t: number } | null): string[] {
  const out = [`① ふしぎ ${one.f}/12 あいて ${one.a}/7 ツッコミ ${one.t}/19`];
  if (two) out.push(`② ふしぎ ${two.f}/10 あいて ${two.a}/6 ツッコミ ${two.t}/17`);
  out.push('ここまで 見てくれて、ありがとう。');
  return out;
}

// ================================================================ 7.1 回覧板の地図（目的メモ）

/** The first line of 回覧板の地図's description. */
export const KAIRAN_MAP_LINE1 = '星見台の 回覧板。うらに 区長の 地図。';

/** Second line: the last row whose flag is set wins (checked top to bottom). */
export const KAIRAN_MAP_LINES: [flag: string, line: string][] = [
  ['flag_ch2_yoriai', '→ 西の 斜面、3号ハウス（光る トマト）'],
  ['flag_ch2_got_tomato', '→ 東の 牛舎。山へは 牛舎の 前から'],
  ['flag_ch2_gate_open', '→ ゲートの 先。山道の 入口'],
  ['flag_ch2_tetsuya_beaten', '→ 星見の丘の 防災無線'],
  ['flag_ch2_boss_beaten', '→ 朝の バス 6:12発'],
];

// ================================================================ 10.1 章の扉

export const CH2_TITLE_STAMP = '第2章';
export const CH2_TITLE_NAME = '星見台の トマト';

// ================================================================ 10.2 evt_ch2_prologue

/** On black, typed like evt_opening (12 chars/s). */
export const PROLOGUE_CAPTION = ['8月31日。', '夏休み、最後の 夜。'];

/** The report card's heading when chapter2Adjust() raised a level. */
export const PROLOGUE_REPORT_TITLE = 'なつやすみの つうちひょう';

/** At the crossing, 19:30. Cues: turn (he looks east), glow (the case), bell (the crossing rings, the train comes and stops). */
export const PROLOGUE_A = `@flip
コロッケ、ごちそうさまでした。
（揚げたてでした）
!cue turn
@flip
（むこうは、いつも 夜です）
!cue glow
@narr
ポケットの ハンコケースが、
かすかに あたたかい。
/
空き枠の『おやすみなさい』が、
うっすら 光っている。
!cue train
@narr
ふつうの 電車は、
踏切では 止まらない。{w=600}
/
これは、ふつうの 電車では ない。
!cue face
@flip
見に いきませんか。
（星見台）`;

/** The page the choice stays under. */
export const PROLOGUE_ASK = `@narr
お母さんには『すぐ もどる』と
言って、出てきた。
? 乗る | やめておく`;

/** 〔やめておく〕: back to the choice (as often as he likes). */
export const PROLOGUE_WAIT = `@flip
（待ってます）
@narr
電車は、扉を 開けたまま
待っている。{w=300}
/
時刻表に ない 電車は、
待つのも 自由 らしい。`;

// ================================================================ 10.3 evt_ch2_train / evt_ch2_arrive

export const ARRIVE_ANNOUNCE = `@npc_hoshi_traindriver
つぎは、星見台。{w=300}
終点で ございます。
/
お忘れもの、
ございませんよう。`;

export const ARRIVE_STATION = `@narr
星見台駅。{w=300}
時計が『4:59』に なった。`;

export const ARRIVE_FLIP = `@flip
（……だれかが、
呼ばれています）`;

// ================================================================ 10.4 evt_ch2_dark_block

export const DARK_FIRST = `@narr
暗くて、足もとが 見えない。
@flip
（ぼくも 見えません。
中が 暗いので）
/
明かりが いりますね。`;

export const DARK_AGAIN = `@narr
暗くて、足もとが 見えない。`;

/** The school corridor, from the second time on. */
export const DARK_SCHOOL_AGAIN = `@narr
廊下の 先は、真っ暗だ。{w=300}
……明かりが あれば。`;

// ================================================================ 10.5 evt_ch2_yoriai

/**
 * Cues: yunomi (エー夫人 puts two cups on the long desk), fumi (まつ先生
 * turns; the glasses catch the light), case (the case's rim glows).
 */
export const YORIAI_A = `@npc_hoshi_kucho
えー、これは これは。{w=300}
夜分に、お若い お客様。
/
えー、星見台 区長の
エーで ございます。{w=300}
……どちらから？
@flip
夕鳴町から 来ました。
（PR大使です）
/
こちらは、ミナトくんです。
（小学5年生です）
@npc_hoshi_kucho
えー、ただいま 寄り合いの
最中で ございまして。{w=300}
議題は『朝が 来ない 件』。
/
えー、星見台は ずっと 4:59。
あと 1分で、朝の チャイム。
その ところで 止まって おります。
@npc_hoshi_yoshie
トマトは 赤く ならんし、
洗濯物は 乾かんし、{w=300}
ツガオさんの 軽トラも 出られん。
/
あんたら、お茶 飲みなさい。
!cue yunomi
!cue fumi
@npc_hoshi_fumi
おはだっちょ！{w=300}
……と、言いたいのですが。
朝が 来ないのは、山の 放送の せいです。
/
星見台の 防災無線は、むかし
毎晩 9時に『おやすみ放送』を
流していたんです。
/
『きょうも 一日、
おつかれさまでした。{w=300}
おやすみなさい』と。
/
それが この夏、お盆の あとから、
村を 出た 人の 名前を
呼ぶように なりましてね。
/
へんじが ないから、
点呼が 終わらない。{w=300}
『おやすみなさい』まで、行かない。
/
夜が 終わらないから、
朝の チャイムも 鳴らないんです。
!cue case`;

/** The hanko case: a choice with two answers, then on together. */
export const YORIAI_CASE = `@npc_hoshi_fumi
……おや。{w=300}その ケース、
タエ先生の 採点ハンコでは
ありませんか？
? うなずく | 首を かしげる
[うなずく]
@npc_hoshi_fumi
やっぱり。{w=300}
新任の ころ、となりの 組の
先生でしてね。
[首を かしげる]
@npc_hoshi_fumi
ひのやの 日野タエ先生。{w=300}
わたしの 新任の ころの、
先輩ですよ。
[-]`;

/** Cue: map (エー区長 draws the map on the back of the circular). */
export const YORIAI_B = `@npc_hoshi_fumi
防災無線は、山の 上の
天文台の となり。
/
でも、山道は 真っ暗。{w=300}
明かりが ないと 登れません。
@npc_hoshi_yoshie
明かりなら、ペロリさんの
ハウスよ。{w=300}
/
トマトが 1つ、光っとるの。
さっき 見た。{w=300}夕焼けの、ええ 色で。
@npc_hoshi_kucho
えー、では ペロリさんの ハウスへ。
西の 斜面の、3号で ございます。
!cue map`;

export const YORIAI_GET_MAP = `@sys
回覧板の地図を 受けとった！`;

export const YORIAI_SHUNIKU = `@npc_hoshi_kucho
えー、それと、回覧板の 朱肉で
ございます。{w=300}
ハンコの かたに、どうぞ。`;

export const YORIAI_GET_SHUNIKU = `@sys
回覧板の朱肉を 手に入れた！`;

// ================================================================ 10.6 evt_ch2_mitsu

export const MITSU_A = `@npc_hoshi_mitsu
……おぴぴか？{w=300}
……いや、背たけが ちがうな。
@flip
夕鳴町から 来ました。
（PR大使です）
@npc_hoshi_mitsu
夕鳴から。{w=300}
娘の おぴぴが、そこの 高校に
通ってる。
/
トマトかい。{w=300}
区長さんに 聞いたんだね。
/
いちばん 奥で、1つだけ
赤く なったのが いる。{w=300}
夕焼けの 色で 光ってる。
/
おれは 夜目が きかなくてね。
{w=300}暗い ハウスの 奥までは
行けない。とってきて くれるかい。
/
……たぶん、きみに
見て ほしがってる。`;

// ================================================================ 10.7 evt_ch2_house → sune → tomato → light

export const HOUSE_ENTER = `@narr
暗い。{w=300}
……でも、奥が 夕焼け色だ。`;

/** Cue: glance (it looks at the red one at the far end, and away). */
export const SUNE_A = `@narr
青い トマトが、通路を
ふさいでいる。{w=300}
/
……こっちに、背中を 向けた。
!cue glance
@narr
奥の 赤い トマトを 見て、
ぷいっと した。`;

/** Cues: catch (it drops into his hands), point (カネナリくん points at the net). */
export const TOMATO_A = `@narr
トマトは、見て もらえて、
ぽっと 明るく なった。
/
……それから、自分から
枝を はなれた。
!cue catch
!cue point
@flip
アミに 入れると、
ちょうちんに なります。`;

export const TOMATO_GET = `@sys
はなまるトマトを 手に入れた！
/
アミに 入れると、あたりが
照らされる ように なった。`;

export const LIGHT_A = `@narr
ハウスの 中が、夕焼け色に
照らされた。{w=300}
/
……光に 気づいて、
なにかが こっちを 見た。`;

/** 〔ハウスを出たとき〕 (trig_ch2_house_exit, once). */
export const HOUSE_EXIT = `@npc_hoshi_mitsu
……ほう。{w=300}
見えるよ。夕焼け色だ。
/
持っていきな。{w=300}
その 子も、行きたがってる。`;

// ================================================================ 10.8 evt_ch2_gen_stop

/** Cue: near (he walks up and looks at the lantern; it shines on his head). */
export const GEN_STOP = `@npc_hoshi_gen
……なんだ、その 光。{w=300}
朝か と 思った。
!cue near
@npc_hoshi_gen
……おい。{w=300}
誰が らっきょやねん！
@flip
（まだ 何も 言っていません）
@npc_hoshi_gen
……ペロリの とこの トマトか。
{w=300}ボウズ、名前は？
@flip
ミナトくんです。
（ぼくは PR大使です）
@npc_hoshi_gen
……ミナト、か。{w=300}
ちょうど いい。
/
牛舎の 見回りが、あと 1房。
懐中電灯が 切れてな。{w=300}
その 明かりで、手伝って くれんか。`;

// ================================================================ 10.9 evt_ch2_barn → otsukare → gate

/** Cue: shodoku (they step through the footbath), walk (the walk down the aisle). */
export const BARN_A = `@npc_hoshi_gen
入る 前に、そこの
消毒槽を 踏め。{w=300}
牛の ための 決まりだ。
!cue shodoku
@npc_hoshi_gen
……よし。{w=300}
静かに 歩け。
!cue walk`;

/** While the light passes the pens (shown on the walk, cue: stop at 南5). */
export const BARN_COWS = `@narr
黒い 牛が、4頭ずつ
並んでいる。{w=300}
/
光が 通ると、耳の
黄色い 耳標が 光る。`;

/** Cues: holdup (the net held high), look (he checks them one by one), write (the round's book), sit (he sits on the feed bag). */
export const BARN_B = `@npc_hoshi_gen
ここだ。{w=300}
照らして くれ。
!cue holdup
!cue look
@npc_hoshi_gen
……食いは いい。{w=300}
便も いい。
/
目も 澄んでる。{w=300}
……よし。みんな 元気だ。
!cue write
@npc_hoshi_gen
名前は、つけてない。
番号で 呼ぶ。{w=300}
/
……顔は、ぜんぶ
覚えてるがな。
!cue sit
@npc_hoshi_gen
……ふう。`;

/** Before the hanko case (evt_ch2_otsukare). */
export const OTSUKARE_A = `@narr
ひと晩じゅう 見回りを していた
人を、見届けた。`;

/** Shown when the battle team's playHankoLearn is not there (it says these itself). */
export const OTSUKARE_LEARN = `@sys
ハンコケースに 新しい ハンコが
浮かびあがった。
/
{c=#E23B2E}おつかれさま{/c}が 使えるように なった！`;

export const OTSUKARE_B = `@npc_hoshi_gen
……『おつかれさま』、か。
/
そんなこと、言われたのは、
何年ぶりかな。{w=600}
/
牛は、言わんからな。
@flip
（おつかれさまです）
@npc_hoshi_gen
……おう。`;

/** At the gate. Cue: hook (he unhooks the handle and hangs it on the post). */
export const GATE_A = `@npc_hoshi_gen
山へ 行くんだろ。{w=300}
まつ先生の 話を 聞いた 顔だ。
/
この 先は、イノシシよけの
電気柵だ。
/
柵には、さわるな。{w=300}
ビリッと くる。
/
出入りは、この 取っ手だけを
持って、外す。
!cue hook
@npc_hoshi_gen
柵の 向こうは、耕作放棄地だ。
むかしは 畑だった。{w=300}
/
いまは、タケじいの 耕うん機が
ひと晩じゅう 耕してる。
/
乗る 人も いないのにな。{w=300}
……おれは、牛舎に おる。
気を つけて 行け。`;

// ================================================================ 10.10 evt_ch2_houki

/** Shown while walking (auto, 1500 ms per page). */
export const HOUKI_LINE = '背の 高い 草。{w=300}\nむかしは 畑だった ところだ。';

// ================================================================ 10.11 evt_ch2_tetsuya

/** Cue: rev (the engine revs, a tile forward; the name tag becomes テツヤ). */
export const TETSUYA_A = `@耕うん機:h_tetsuya
……マダ タガヤセマス。
/
ヒト ウネ……{w=300}
モウ ヒト ウネ……。
@narr
山道の 入口の 前を、
何往復も 耕している。{w=300}
/
……そこは、道だ。
@flip
（あの人、ひと晩じゅう
起きて います）
@耕うん機:h_tetsuya
タケジイガ ノラナクテモ、
ハルニハ、ハタケニ……。
/
マダ、ヤスミマセン！`;

// ================================================================ 10.12 evt_ch2_yobigoe

/** The line stays open: the names in the voice of the loudspeaker. */
export const YOBIGOE_BROADCAST = `@npc_hoshi_speaker
こちらは、防災 星見台です。
/
……おぴぴちゃん。シュンスケくん。
{w=300}もとくん。
/
……アスカちゃん。サトシくん。
タクミくん……`;

export const YOBIGOE_KAKASHI = `@narr
村じゅうの かかしが、
いっせいに 山を 向いた。`;

/** Cue: look (まつ先生 looks up at the mountain). */
export const YOBIGOE_FUMI = `@npc_hoshi_fumi
……とうとう、止まらなく
なりましたね。
/
あの 放送、むかしは
わたしが 読んでいたんです。{w=300}
30年。毎晩 9時に。
/
分校が 閉じて、わたしが
読まなく なってからも、
スピーカーは 覚えていたんですね。
/
……村の 子の 名前を、
ぜんぶ。
!cue look
@npc_hoshi_fumi
あの 放送の 最後は、いつも
『おやすみなさい』でした。{w=300}
/
……言わせて あげて くださいね。
わたしは、ここで 待っています。
@npc_hoshi_gen
……おれは、ゲートの 番に
もどる。
/
軽トラの ライトは、点けとく。
{w=300}帰り道の 目じるしだ。
/
シュンスケの 名前が 聞こえたら、
元気だと 伝えといてくれ。`;

// ================================================================ 10.13 evt_ch2_hill

export const HILL_ENTER = `@narr
山道の 上で、赤い ランプが
1つ、こっちを 見ている。`;

/** On the upper plaza (y ≤ 7, once: trig_ch2_hill_top). */
export const HILL_TOP = `@flip
ベンチで ひと休み してから
行きましょう。（夜は 長いので）`;

// ================================================================ 10.14 evt_ch2_boss_intro

/** 「ピンポンパンポーン。」: no text blips, se_pa_chime (−35 cents) instead (the script). */
export const BOSS_CHIME = `@npc_hoshi_speaker
ピンポンパンポーン。`;

export const BOSS_TENKO = `@npc_hoshi_speaker
こちらは、防災 星見台です。
{w=300}点呼を 続けます。
/
……おぴぴちゃん。{w=600}
……シュンスケくん。
/
……へんじが ありません。`;

/** Cue: flip (カネナリくん steps forward and holds the board up high). */
export const BOSS_ASK = `@？？？:yobimodoshi
……そこに、だれか いますか。
? 手を あげる | だまって 見る
[手を あげる]
@？？？:yobimodoshi
……名簿に ない 子です。
[だまって 見る]
@？？？:yobimodoshi
……へんじが ありません。
[-]
!cue flip
@flip
（はい）
@？？？:yobimodoshi
……へんじは、声で
おねがいします。`;

export const BOSS_MORNING = `@？？？:yobimodoshi
朝は、まだです。{w=600}
/
朝が 来たら、きょうも
だれも 帰らなかった ことに なる。
/
だから、点呼を 続けます。`;

/** The name tag written over the pole's plate. */
export const BOSS_NAME = 'ヨビモドシ';

// ================================================================ 10.16 evt_ch2_ending

// ---- カット1 丘

export const END_SUNRISE = `@narr
夕焼けを ためこんだ トマトが、
朝焼けに なった。`;

/** The second voice (after chapter 1's 「……おいしい。」). */
export const END_OHAYOU = `@カネナリくん:kanenari_voice
{spd=0.4}……おはよう。`;

// ---- カット2 村の朝

export const END_2A = `@npc_hoshi_gen
……よし。{w=300}朝だ。`;
/** 2a when the chores were done (flag_ch2_barn_work=1). */
export const END_2A_WORKED = `@npc_hoshi_gen
……よし。{w=300}水も 出る。{w=300}朝だ。`;

export const END_2B = `@npc_hoshi_mitsu
3日ぶん、いっぺんに 色づいた。
{w=300}……ほどよいなぁ。`;

export const END_2D = `@narr
『……あちゃ〜、よう 寝た。』`;

export const END_2E = `@npc_hoshi_fumi
おはだっちょ！{w=300}
……やっと、朝に 言えました。`;

// ---- カット3 転回場

export const END_3_MITSU = `@npc_hoshi_mitsu
ほどよい 色の 4つ。{w=300}
1つは おまけ。
/
だれかに あげると いい。`;

export const END_3_GET = `@sys
トマト（4つ）を 受けとった！`;

export const END_3_B = `@flip
トマトは 食べられます。
（前回 学びました）
@npc_hoshi_fumi
タエ先生に、よろしく。
@npc_hoshi_kucho
えー、夕鳴町の ミナト様、
カネナリ様。
/
えー、星見台は、12人と
牛40頭で、お待ち して おります。
@npc_hoshi_busdriver
6:12発、ユウナリ前 ゆき。{w=300}
……手紙も、いっしょに 出発だ。`;

// ---- カット4 夕鳴町のバス停

export const END_4_DRIVER = `@npc_hoshi_busdriver
……夕鳴町は、まだ 夜か。{w=300}
/
この 手紙の 消印、
どっちの 日付に なるかな。`;

export const END_4_NARR = `@narr
夕鳴町は 19:31。{w=300}
/
……出てから、1分しか
たっていない。
@flip
見回りに もどります。
（踏切まで）`;

// ---- カット5 家

/** Cue: yawn (Minato yawns). */
export const END_5_A = `@npc_mother
おかえり。{w=300}
早かったわね。
/
……あら、顔が 朝みたいよ。
!cue yawn
@npc_mother
それ、トマト？{w=300}
4つ。
/
……1つ、おまけ？
? うなずく | 首を かしげる
[うなずく]
@npc_mother
やっぱり。{w=300}
だれかさんに 似てるわね。
[首を かしげる]
@npc_mother
顔に『おまけ』って
書いてあるわよ。
[-]
@npc_mother
じゃあ、おまけの 1つは、
あした、ひのやの おばあちゃんに
持っていきなさい。`;

export const END_5_TV = `@npc_tv
続いて、お天気です。{w=300}
となりの 星見台では、
ひと足 早く、朝が 来ました。
/
なお、海ぞいの 町では、
朝から ずっと『正午』です。
@npc_mother
あら。{w=300}
お昼ごはん、何回 食べるのかしら。`;

export const END_NOTE_TITLE = '星見台 みました帳 ②';
export const END_NOTE_COVER = '夕鳴町 みました帳 ①';
export const END_TSUZUKU = 'つづく';

/** In the chapter-2 clear data the bag keeps one of the four (7.1). */
export const OMAKE_ITEM = 'item_tomato_omiyage';

// ---- カット7 ツガオの部屋（第3章への引き）: the UI's cut_tsugao_room plays it
// with its lines (src/ui/cut_tsugao.ts TSUGAO_LINES, 50 10.16 カット7).

// ================================================================ 10.17 evt_gameover（第2章の差分）

/** From the second wipe-out (flag_lost_count ≥ 2), before the retry. */
export const GAMEOVER_FLIP_TETSUYA = `@flip
（ぼくたちも、ひと休み
してから 行きましょう）`;
export const GAMEOVER_FLIP_BOSS = `@flip
（ベンチで ひと休み。
……夜は 長いので）`;

// ================================================================ 10.18 セーブと休憩

export const SAVE_DOSOJIN = `@narr
道祖神。石に、男の人と
女の人が 並んで 彫ってある。
/
……セーブしますか？
? する | しない`;
export const SAVE_DOSOJIN_DONE = `@narr
道祖神に 手を あわせた。{w=300}
夜道の ことを、覚えて もらった。`;
export const SAVE_DOSOJIN_NO = `@narr
道祖神は、2人で だまっている。`;

export const SAVE_KAIRAN = `@narr
回覧板の 確認の 欄。{w=300}
名前を 書きますか？（セーブ）
? 書く | 書かない`;
export const SAVE_KAIRAN_DONE = `@narr
『ミナト』と 書いた。{w=300}
……星見台の 名簿に、1行 ふえた。`;
export const SAVE_KAIRAN_FLIP = `@flip
（ぼくも 書きました）`;
export const SAVE_KAIRAN_NO = `@narr
回覧板は、次の 人を 待っている。`;

export const SAVE_BENCH = `@narr
観望会の ベンチ。
『星を 見る 人の 席』。
/
すわると、夜風が 気持ちいい。`;
export const SAVE_BENCH_HEAL = `@sys
HPと 朱肉が 回復した。
/
……セーブしますか？
? する | しない`;
export const SAVE_BENCH_DONE = `@sys
セーブした。`;

/** A save that could not be written (storage full / private window). */
export const SAVE_FAILED = `@sys
セーブ できなかった。`;

// ================================================================ 7.4 おつかれさま（フィールド）

export const OTSUKARE_FIELD = `@sys
いまは、押す 相手が いない。`;

// ================================================================ 10.19 evt_ch2_barn_work（牛舎のおてつだい・任意）

/** 〔誘い〕 after 〔h1_1〕 / 〔h1_3〕 while flag_ch2_barn_work=0. Returns the choice. */
export const WORK_ASK = `@npc_hoshi_gen
……それと。{w=300}
手が あいてるなら、
エサ寄せを 手伝って いくか。
? 手伝う | またこんど`;

export const WORK_LATER = `@npc_hoshi_gen
……おう。{w=300}
気が むいたら、来い。`;

/** 〔手伝う〕. Cue: give (he hands over the scoop leaning on the straw at (20,5)). */
export const WORK_HOW = `@npc_hoshi_gen
牛は、食べながら 鼻で
エサを 押しやる。
/
口の 届かない ところへ
いった エサを、柵の 側へ
寄せもどす。{w=300}それが エサ寄せだ。
/
暗くて、どこが 寄ってるか
見えん。{w=300}
その 明かりで 探せ。
/
それと、水だ。{w=300}
給水器に エサが 落ちると、
水が にごる。
/
すくって 出して、押し板を
押して みろ。{w=300}
水が 出れば、よし。
/
牛房には 入るな。{w=300}
通路から、柵ごしに やれ。
……静かにな。
!cue give
@flip
（ぼくは、見守り係です）`;

/** 〔エサ寄せ・1回目〕 (from the second, only the sound and the count). */
export const WORK_ESA_FIRST = `@narr
エサを、牛の 口の 届く
ところへ 寄せた。{w=300}
牛が、すぐに 顔を 寄せてきた。`;

/** 〔給水器・1回目〕 */
export const WORK_CUP_FIRST = `@narr
落ちていた エサを すくって、
押し板を 押した。{w=300}
きれいな 水が 出た。`;

/** 〔とちゅうで マサルさんに 話す〕 */
export const WORK_TALK = `@npc_hoshi_gen
……あわてるな。{w=300}
明かりで、よく 見ろ。`;

/** 〔とちゅうで 牛舎を 出ようとした〕 */
export const WORK_QUIT_ASK = `@sys
おてつだいを やめますか？
? やめる | つづける`;
export const WORK_QUIT = `@npc_hoshi_gen
……おう。{w=300}
また 気が むいたら、来い。`;

/** 〔ぜんぶ終わった〕 */
export const WORK_DONE = `@npc_hoshi_gen
……よし。{w=300}
エサも 寄ったし、
水も きれいに 出る。`;
/** Done within 75 s of the start. */
export const WORK_DONE_FAST = `@npc_hoshi_gen
手際が いいな。{w=300}
……牛が、もう 食ってる。`;
/** Over 75 s. */
export const WORK_DONE_SLOW = `@npc_hoshi_gen
ていねいだ。{w=300}
牛の 仕事は、それで いい。`;

/** Cues: holdup (the net held high; his head glows sunset), pay (+300円). */
export const WORK_END = `!cue holdup
@npc_hoshi_gen
……おい。{w=300}
誰が らっきょやねん！
@flip
（まだ 何も 言っていません）
@npc_hoshi_gen
……おだちんだ。{w=300}
無人販売所で、なにか 買え。
!cue pay
@sys
300円 もらった！
@npc_hoshi_gen
……おつかれさん。`;

/** The strip on the HUD (52 13.1): the two counts. */
export const WORK_CARD = [
  { label: 'エサ寄せ', total: 6 },
  { label: '水', total: 3 },
];
