// 第2章 — ツガオ便 (50_ch2_story 3.14〜3.16), the villagers' 〔ts〕 and 〔deli〕
// lines (3.3〜3.11), the delivery of 10.20 and the 9章 objects added with
// them. GENERATED from the design book by the scenario team's extractor
// (the book was still moving on 2026-09-25): keys are the book's own
// markers 〔…〕; `/<label>` is a branch of a choice; `共通N` the Nth common part;
// `!cue <name>` a stage direction the script stages (src/events/ch2/tsugao.ts;
// the book's own directions between the pages: hide, shh, blush, laugh, wave,
// flap, give, aori, knock, cap_swap / cap_back, yakiimo, put_down, done).

export const TSUGAO_NPC: Record<string, Record<string, string>> = {
  npc_tsugao: {
    "h0_1": `@npc_tsugao
……おや。{w=300}
電車で 来た ぼっちゃんですかな。
/
わたしは ツガオ。{w=300}
村の 野菜を、この 軽トラで
ふもとの 町へ 運んで おります。
/
朝の 5時に、集めて 回る。
{w=300}……その 5時が、まだ 来ません。
/
まあ、よろしい。{w=300}
まだ、急ぐ ことは ありません。
/
では、つがおちゃん 寝る〜♪
@flip
（……寝ました）`,
    "h0_2": `@narr
水玉の ナイトキャップの 人が、
運転席で 寝ている。{w=300}
……とても よく 寝ている。`,
    "h1_2": `@narr
ツガオさんが、寝言を 言った。
@npc_tsugao
……まだ……{w=300}
まだ、朝では ありませんな……。`,
    "h2_1": `@npc_tsugao
……放送が、にぎやかですな。
{w=300}山へ、行きますか。
/
まだ、夜ですよ。{w=300}
……まあ、よろしい。
お気を つけて。`,
  },
  npc_hirosuke: {
    "h0_1": `@npc_hirosuke
ども！{w=300}
こんな 時間に、お客さんとは！
/
おれは ヒロスケ。{w=300}
ツガオ便の 荷さばき係だよ。
よろしくな、少年！
/
ゆうべの おすそわけを、
配りそこねちゃってさ。{w=300}
……焼き芋 食うか？
@flip
（8月です）
@npc_hirosuke
わはは！{w=300}夏でも、芋は
焼ける！ ほかほかだよ。`,
    "h0_2": `@npc_hirosuke
師匠は、寝てるよ。{w=300}
朝の 5時に 起こす 決まりでね。
/
……その 5時が 来ないんだ。
{w=300}まいったね、わはは！
/
あ、こっちは ポコシャ。{w=300}
はずかしがりなんだ。
よろしく してやってな。
!cue hide`,
    "h1_2": `@npc_hirosuke
配達、ほんとに 助かったよ！
{w=300}朝に なったら、ここから
ふもとへ 出るんだ。`,
    "h2_1": `@npc_hirosuke
山の 放送、止まらないねえ。
{w=300}……師匠は、それでも 寝てる。
/
大物だよ、うちの 師匠は。`,
    "h2_1_after": `@npc_hirosuke
おすそわけは、朝に 配るよ。
{w=300}明るく なってからな！`,
  },
  npc_pokosha: {
    "h0_1": `@npc_pokosha
……あ。{w=300}
こ、こんばんは……。
/
自分、ポコシャ、です。{w=300}
ツガオ師匠の、弟子を……
して います。
/
こっちは、ぴーちゃん。{w=300}
ひよこの ころから、いっしょで。
@npc_piichan
……クゥ。
@npc_pokosha
……いまは、寝てます。{w=300}
ニワトリは、暗いと 寝るので。
/
師匠は、止まった 夜でも、
ぜんぜん あわてないんです。
{w=300}……さすが 師匠！
!cue blush
@npc_pokosha
……あ。{w=300}
す、すみません、大きな 声で……。`,
    "h0_2": `@npc_pokosha
……朝に なっても、ぴーちゃんは
コケコッコーとは 鳴きません。
{w=300}めんどり、なので。
/
自分は、まだまだ です。{w=300}
師匠みたいに、どこでも
すぐ 眠れたら……。`,
    "h1_2": `@npc_pokosha
……ぴーちゃんの 羽、
大事に して もらえたら……。
{w=300}うれしい、です。`,
    "h2_1": `@npc_pokosha
……ぴーちゃんが、山の ほうを
じっと 見て います。
/
朝が、近いのかも しれません。
{w=300}……めんどりの 勘、です。`,
  },
};

/** 〔ts〕 (ツガオさんの話, once) and 〔deli〕 (after the delivery, once) of the villagers (3.0). */
export const TS_LINES: Record<string, Record<string, string>> = {
  npc_hoshi_busdriver: {
    "ts": `@npc_hoshi_busdriver
ツガオさんとは、朝を 待つ
仲間でね。{w=300}軽トラの 人さ。
/
あの人、いつ 見ても 寝てる。
{w=300}……この 夜が、いちばん
似合う 人かも しれない。`,
  },
  npc_hoshi_kucho: {
    "ts": `@npc_hoshi_kucho
えー、ツガオさんには、40年
お世話に なって おります。
/
村の 野菜は、みな ツガオさんの
軽トラで ふもとへ まいります。
/
えー、ふもとの 方なので、村の
名簿には 入って おりませんが……
{w=300}村の 一員の ような 方で ございます。`,
  },
  npc_hoshi_yoshie: {
    "ts": `@npc_hoshi_yoshie
ツガオさん？{w=300}ええ 人よ。
漬物の きゅうりも、あの人が
運んで くれる。
/
指が いつも 黒いのは、
伝票の 書きすぎじゃ。{w=300}
……あたしは、そう 思っとる。`,
    "deli": `@npc_hoshi_yoshie
あんたが 運んだ きゅうり、
漬けといたよ。{w=300}
……ええ 色に なるよ。`,
  },
  npc_hoshi_fumi: {
    "ts": `@npc_hoshi_fumi
ツガオさんですか。{w=300}
観望会の 日は、いつも 軽トラで
望遠鏡を 運んで くれました。
/
山の 上の、防災無線の
柱の 下まで。{w=300}
……ありがたい ことです。`,
  },
  npc_hoshi_tome: {
    "ts": `@npc_hoshi_tome
ツガオか。{w=300}わしが 役場の
課長を しとった ころから、
あの 軽トラで 来とる。
/
……あの 顔の まんまじゃ。
{w=300}年を とらん 男じゃのう。`,
  },
  npc_hoshi_sawako: {
    "ts": `@npc_hoshi_sawako
ツガオさんの 顔、絵に
描かせてって 頼んでるのよ。
{w=300}渋くて、いい 顔でしょ。
/
でも いつも『まだ まだ』って。
{w=300}……もう 40年、まだ まだ。`,
  },
};

/** 10.20 evt_ch2_delivery, segment by segment. */
export const DELI_TEXT: Record<string, string> = {
  "誘い": `@npc_piichan
ココッ？
@npc_hirosuke
ども！{w=300}おっ、ぴーちゃんが
起きた！ 少年、その 明かり！`,
  "ヒロスケさんに まだ 会っていない": `@npc_hirosuke
おれは ヒロスケ。{w=300}
ツガオ便の 荷さばき係だよ。`,
  "ポコシャさんに まだ 会っていない": `@npc_pokosha
……ポ、ポコシャ、です。{w=300}
師匠の、弟子です……。`,
  "共通1": `@npc_hirosuke
明るいねえ！{w=300}
これなら 表札が 読めるよ！
@flip
（その メガネ、夜は
暗いのでは）
@npc_hirosuke
わはは！ 師匠に もらったからさ、
外せないんだよ。{w=300}
……焼き芋 食うか？
@npc_pokosha
……自分も、外すと、
人の 顔が 見られなくて……。
@npc_hirosuke
師匠ー！ 起きてー！{w=300}
明かりが 来たよー！
!cue knock
@narr
ツガオさんの 腕時計は、
12時で 止まっている。
@npc_tsugao
……時計は、止めて あるのです。
{w=300}急がない ように。`,
  "ツガオさんに まだ 会っていない": `@npc_tsugao
わたしは ツガオ。{w=300}村の 野菜を、
ふもとの 町へ 運んで おります。`,
  "共通2": `@npc_tsugao
……ゆうべの おすそわけを、
配りそこねましたな。
/
ぼっちゃん。{w=300}その 明かりで、
配達を 手伝って いただけますかな。
? 手伝う | またこんど`,
  "共通2/またこんど": `@npc_tsugao
まあ、よろしい。{w=300}
まだ、急ぐ ことは ありません。
@npc_hirosuke
じゃ、またな！{w=300}
焼き芋、とっとくよ！`,
  "共通2/手伝う": `@npc_pokosha
……さすが 師匠。{w=300}
頼み方が、しぶい……。
!cue flap
@npc_tsugao
伝票は 5枚。{w=300}
伝票の 順に、置き台へ。
表札を 照らして くだされ。
!cue give
@narr
伝票の すみに、小さな 黒い 判。
{w=300}……かすれて、読めない。
@flip
（ぼくは、伝票係です）
@npc_hirosuke
荷は、ポコシャが かつぐよ。
{w=300}こいつ、力持ちなんだ！
@npc_pokosha
……よ、よろしく、おねがいします。
{w=300}まず、タケじいさんの 家、です。
!cue aori`,
  "誘い・2回目": `@npc_tsugao
……おや。{w=300}配達、
手伝って いただけますかな。
? 手伝う | またこんど`,
  "おとどけ 1": `@narr
表札を 照らした。{w=300}
伝票の 1枚目と、同じ 名前だ。
!cue put_down
@narr
ペロリさんの 赤い トマトを、
置き台に 置いた。{w=300}貼り紙に、
『ひと畝 耕したら 食う　タケ』
@npc_pokosha
……タケじいさん、耕うん機の
名人、だったそうです。`,
  "おとどけ 2": `@narr
ソワカさんの なすを、置き台に
置いた。{w=300}回覧板の 棚に 貼り紙。
『えー、野菜は こちらへ　エー』
@npc_piichan
ココッ。
@npc_pokosha
……次は、東の 小道の 奥、です。`,
  "おとどけ 3": `@narr
ペロリさんの ししとうを、
勝手口の 置き台に 置いた。
{w=300}『寝とったら、起こさんで ええ』
@npc_pokosha
……いまも、集会所で
ぐっすり、です。{w=300}
次は、その 集会所に。`,
  "おとどけ 4": `@npc_hoshi_yoshie
あら、ツガオさんとこの 伝票。
{w=300}あんたが 運んで きたんかね。
/
ソワカさんの きゅうり。{w=300}
ええ きゅうりじゃ。
……漬けとくよ。
!cue hide
!cue shh
@npc_pokosha
……ま、毎度、です。{w=300}
最後は、トマじいさんの 家、です。`,
  "おとどけ 5": `@narr
シゲじいさんと スギばあさんの
かぼちゃを、米袋の 上に 置いた。
{w=300}『マルは 町の 娘の とこ』
@npc_pokosha
……マルさんが 帰ったら、
かぼちゃの 煮物、ですね。
!cue done
@npc_pokosha
……ぜ、ぜんぶ、配れました。
{w=300}師匠に、報告を。`,
  "順番のちがう置き台": `@npc_pokosha
……あ、あの、そこは、まだ です。
{w=300}伝票の、順番が……。`,
  "やめますか": `@sys
配達を やめますか？
? やめる | つづける`,
  "やめますか/やめる": `@npc_pokosha
……わ、わかりました。{w=300}
また、明かりを 貸して ください。`,
  "しめ": `@npc_hirosuke
おかえり！{w=300}
5軒、配り終えたって？
@npc_pokosha
……は、はい。{w=300}
ぜんぶ、です。
!cue cap_swap
@npc_tsugao
……ほう。{w=300}
伝票の 字が、読めましたか。
/
ぼっちゃんの 明かりは、
ちょうど よろしい。{w=300}
……明るすぎなくて。
@npc_hirosuke
ありがとな！ おだちんだ。
{w=300}焼き芋 食うか？
!cue yakiimo
@sys
焼き芋を 2つ もらった！
@flip
（あとで いただきます）
!cue flap
@npc_piichan
コケッ！
@narr
ぴーちゃんの 白い 羽が、
みました帳に はさまった。
@npc_tsugao
では、朝まで ひと休み。
{w=300}つがおちゃん 寝る〜♪
!cue cap_back
@npc_pokosha
さすが 師匠！
!cue blush
!cue laugh
@npc_hirosuke
わはは！{w=300}
寝ても ほめられる 師匠だよ。`,
};

/** 9章 objects added with ツガオ便 (a plain text, or stage keys h0 / 'h1+'; the field reads them). */
export const TSUGAO_OBJ: Record<string, string | Record<string, string>> = {
  obj_hoshi_tsugao_truck: {
    h0: `@narr
くすんだ 緑の 軽トラ。{w=300}ドアに
白い 手書きの 字『青果 ツガオ便』。
/
荷台に、黄色い コンテナが
きちんと 積んである。`,
    /** h1〜: the tomato's light reaches into the cab (then 10.20 〔誘い〕 if not delivered yet). */
    'h1+': `@narr
ダッシュボードに、黒い スタンプ台。
{w=300}……伝票に 押す ものらしい。
/
キーに、黄色い 札と、
白い 羽が 1本 結んである。`,
  },
  obj_hoshi_pokosha_bike: `@narr
荷台つきの 黒い 自転車。{w=300}
前かごに、わらが 敷いてある。
/
……ふもとから、これで
山道を 上がってくるらしい。`,
};
