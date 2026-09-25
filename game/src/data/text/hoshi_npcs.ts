// 第2章『星見台のトマト』 — the villagers' talk (50_ch2_story 3章), カネナリくん's
// flips by place (3.1), the broadcast's names (3.2 / 3.13) and 無人販売所 (7.3).
//
// The ids stay the old ones (npc_hoshi_mitsu = ペロリ, npc_hoshi_gen = マサルさん,
// npc_hoshi_fumi = まつ先生 …; 02_ch2_index 2.2): only the name tags, the
// people and their words changed (2026-09-25).
//
// Keys (50 3.0): h0 = 段階0「よなか」, h1 = 「ともしび」, h2 = 「よびごえ」;
// `_1` the first talk at that stage, `_2` / `_3` the later ones (the last one
// repeats). Keys that are not a plain stage count (h0_0, kacho_done,
// mujin_done, tea, …) are picked by the scripts in src/events/ch2/npcs.ts.
// The msg-block format of 10_narrative 1.4 (world/msg.ts): @speaker / lines /
// `/` page / `? a | b` / [label] / !command. Every page is at most 3 lines of
// 336 px (__game.cmd.textcheck2 checks them).

import type { TalkTable } from '../../world/types';

/** Name tags and voices of the village (50 3.2, 53 9.1). The voice ids keep the old names. */
export const HOSHI_SPEAKERS: Record<string, { name: string; voice: string }> = {
  npc_hoshi_mitsu: { name: 'ペロリ', voice: 'h_mitsu' },
  npc_hoshi_gen: { name: 'マサルさん', voice: 'h_gen' },
  npc_hoshi_fumi: { name: 'まつ先生', voice: 'h_fumi' },
  npc_hoshi_kucho: { name: 'エー区長', voice: 'h_kucho' },
  npc_hoshi_yoshie: { name: 'エー夫人', voice: 'h_yoshie' },
  npc_hoshi_tome: { name: 'トマじい', voice: 'h_tome' },
  npc_hoshi_sawako: { name: 'ソワカさん', voice: 'h_sawako' },
  npc_hoshi_busdriver: { name: 'さんかど', voice: 'h_driver' },
  npc_hoshi_traindriver: { name: '運転士', voice: 'h_train' },
  npc_hoshi_gon: { name: 'ふくじんづけ', voice: 'h_gon' },
  npc_hoshi_speaker: { name: '防災無線', voice: 'broadcast' },
};

export const HOSHI_NPC: Record<string, TalkTable> = {
  // ------------------------------------------------------------ 3.3 さんかど（郵便配達員）
  npc_hoshi_busdriver: {
    /** Ends on 「明かりが 見えるだろ。」: the camera pans north to the window (the script). */
    h0_1: `@npc_hoshi_busdriver
おや、電車で 来たのかい。{w=300}
こんな 時間に。
/
……こんな 時間って いうか、
ずっと この 時間 なんだけどね。
4:59。
/
ぼくは 郵便配達の さんかど。
夕方の 便で 郵便と 上がってきて、
朝の 便で 手紙を 局へ 持って帰る。
/
1日2本。{w=300}
その 朝の 便が、出せない。
手紙も ぼくも、足どめさ。
/
村の 人は 12人。{w=300}
みんな、分校の 集会所に
集まってるよ。明かりが 見えるだろ。`,
    h0_2: `@npc_hoshi_busdriver
朝の 便は 6:12発。
ユウナリ前 ゆき。
/
村の ポストの 手紙は、
もう この 袋の 中。{w=300}
時間どおりに 届けるのが、仕事でね。`,
    h1_1: `@npc_hoshi_busdriver
わ、まぶしい。{w=300}
……それ、トマト？
/
朝日かと 思って、
郵便袋を かつぐ ところだった。`,
    h1_2: `@npc_hoshi_busdriver
その 明かり、懐中電灯より
やわらかいね。{w=300}
かすれた 宛名も、読めそうだ。`,
    h2_1: `@npc_hoshi_busdriver
山の ほうの 放送、
さっきから 止まらないね。
/
宛名 みたいに、名前を
順番に 読んでる。{w=300}
……差出人が、書いてないんだな。
/
この 袋にも、あの 名前が ある。
{w=300}村から 出す 手紙の、宛名にね。`,
    h2_2: `@npc_hoshi_busdriver
6:12発。{w=300}
いつでも 出られる ように、
袋の 口は しばってあるよ。`,
  },

  // ------------------------------------------------------------ 3.4 運転士（車内）
  npc_hoshi_traindriver: {
    /** The first time: the sign on the cab window. */
    first: `@narr
運転席の 窓に 『運転中は
話しかけないで ください』。
@npc_hoshi_traindriver
……。`,
    /** From the second time on (then evt_ch2_arrive at once). */
    second: `@npc_hoshi_traindriver
つぎは、星見台。{w=300}
終点で ございます。`,
  },

  // ------------------------------------------------------------ 3.5 エー区長（初回は evt_ch2_yoriai）
  npc_hoshi_kucho: {
    /** After the gathering (the gathering itself was the first talk). */
    h0_2: `@npc_hoshi_kucho
えー、ペロリさんの ハウスは、
西の 斜面で ございます。
/
県道の 沢の 橋を 渡って、
3つ目の ハウス。{w=300}
……3号で ございます。`,
    /** The third time on. */
    h0_3: `@npc_hoshi_kucho
えー、星見台は 12人。
平均年齢 79.3歳。
/
……毎年 きっちり 1歳ずつ
上がって おります。{w=600}
/
みんな 元気な 証拠で
ございます。`,
    h1_1: `@npc_hoshi_kucho
えー、それが うわさの……。{w=300}
なるほど、光っとる。
/
えー、山へは、東の 牛舎の 前の
農道から まいります。
/
牛舎の マサルさんが、
山の 道に くわしゅう ございます。
/
……ただ、懐中電灯が
切れて おりまして。`,
    h1_2: `@npc_hoshi_kucho
えー、東の 牛舎で ございます。
山へは、牛舎の 前の 農道から。`,
    h2_1: `@npc_hoshi_kucho
えー、まつ先生は マサルさんの
軽トラで、山の 入口へ
向かわれました。
/
わたくしは ここで 留守番を。{w=300}
区長の 仕事の 8割は、
留守番で ございます。`,
    h2_2: `@npc_hoshi_kucho
えー、放送が 呼んでいる 名前、
回覧板の 名簿と 同じ 順番で
ございます。{w=300}
/
……古い ほうの 名簿の。`,
  },

  // ------------------------------------------------------------ 3.6 エー夫人（evt_ch2_rest_yoriai）
  npc_hoshi_yoshie: {
    /** The first time after the gathering (then the tea). */
    h0_1: `@npc_hoshi_yoshie
あんた、夜道を 歩いてきたんかね。
お茶 飲んで いきなさい。
/
漬物も。{w=300}
……ええから、食べなさい。`,
    /** Every later time (stages 1 and 2 go back to it after their first line). */
    h0_2: `@npc_hoshi_yoshie
お茶、まだ あるよ。{w=300}
夜が 長いから、
やかんが 休まらん。`,
    /** The third time only (once, at whatever stage). */
    h0_3: `@npc_hoshi_yoshie
うちの 人は『えー、』。{w=300}
あたしは『ええ 色』『ええ 子』。
/
それで 村では、エー夫婦。{w=300}
……ええ 名前じゃろ。`,
    h1_1: `@npc_hoshi_yoshie
あら、ええ 色。{w=300}
トマトの 色じゃ ないね。
……夕焼けの 色じゃ。
/
お茶 飲んで いきなさい。`,
    /** After h1_1's tea. */
    h1_1_after: `@narr
カネナリくんの 湯のみは、
いつのまにか からに なっていた。`,
    h2_1: `@npc_hoshi_yoshie
放送、止まらんねえ。{w=300}
名前、ぜんぶ 覚えとるよ。
/
みんな、ここで お茶を
こぼしていった 子らじゃ。
/
お茶 飲んで いきなさい。`,
    /** After every line: se_heal, HP full (not 朱肉). */
    tea: `@sys
お茶を 飲んだ。
HPが 回復した。`,
  },

  // ------------------------------------------------------------ 3.7 まつ先生（初回は evt_ch2_yoriai）
  npc_hoshi_fumi: {
    h0_2: `@npc_hoshi_fumi
山の 上の 天文台までは、
明かりが ないと 登れません。
/
ペロリさんの ハウスで、トマトが
1つ 光っているそうですよ。{w=300}
……借りて いらっしゃい。`,
    /** The third time on: the morning star. */
    h0_3: `@npc_hoshi_fumi
東の 空、見えますか。{w=300}
1つだけ、またたかない 星。
/
またたかない 星は、惑星です。
あれは 明けの明星。
金星ですよ。
/
朝が 来るのを、いちばん
先に 待っている 星です。`,
    h1_1: `@npc_hoshi_fumi
おはだっちょ！{w=300}
……おや、朝日かと 思ったら、
トマトでしたか。
/
きれいな 夕焼け色ですね。{w=300}
それなら 山道も 登れます。
/
東の 牛舎の 前から、
農道が 山へ 続いています。`,
    h1_2: `@npc_hoshi_fumi
その 明かりで、廊下も
見て いらっしゃい。{w=300}
放送室は、いちばん 奥です。
/
むかし、夜の 放送は、
あそこで 読んでいたんですよ。`,
    /** The third time on: the hanko case. */
    h1_3: `@npc_hoshi_fumi
タエ先生は、お元気ですか。{w=300}
ひのやの 日野タエ先生。
/
新任の ころ、となりの 組でね。
{w=300}はなまるの 描き方を、
あの人に 教わりました。
/
あの人の はなまるは、いつも
花びらが 1枚 多い。{w=300}
……まねしても、できなかった。`,
    /** At the mountain path's entrance (after evt_ch2_yobigoe). */
    h2: `@npc_hoshi_fumi
わたしは、ここで 待っています。
/
あの 放送の 最後は、いつも
『おやすみなさい』でした。{w=300}
/
……言わせて あげて くださいね。`,
    /** After カネナリくん's 〔hoshi_school〕 flip, in the gathering room. */
    school_flip: `@npc_hoshi_fumi
その 1人は、わたしですよ。`,
  },

  // ------------------------------------------------------------ 3.8 ペロリ（初回は evt_ch2_mitsu）
  npc_hoshi_mitsu: {
    /** Before the gathering: talked to, or the closed door of 3号 examined (he calls from beside it). */
    h0_0: `@npc_hoshi_mitsu
……夜道だね。{w=300}
だれか 来たのかい。
/
村の みんなは、分校の 集会所に
いるよ。{w=300}お茶でも もらって おいで。`,
    /** Met, the tomato not taken yet. */
    h0_2: `@npc_hoshi_mitsu
いちばん 奥だよ。{w=300}
光ってるから、すぐ わかる。
/
おれは 夜目が きかなくてね。
暗いと、足もとが 見えない。
……たのんだよ。`,
    h1_1: `@npc_hoshi_mitsu
よく 似合う。{w=300}
アミの 中の トマト。
/
ちょうちんか。{w=300}まぶしくも、
暗くもない。{w=300}……ほどよいなぁ。`,
    h1_2: `@npc_hoshi_mitsu
ほかの 子らは、まだ 青いまま。
/
朝が 来たら、いっぺんに
赤く なるさ。{w=300}
トマトは、待つのが うまいんだ。`,
    h1_3: `@npc_hoshi_mitsu
うちの ハウスの 土は、
マサルさんとこの 堆肥でね。
/
牛の おかげで、トマトが うまい。
トマトの おかげで……{w=300}
マサルさんが 夏に やせない。
/
……ほどよいなぁ。`,
    h2_1: `@npc_hoshi_mitsu
放送が、おぴぴの 名前を
呼んでる。{w=300}
……娘だよ。
/
夕鳴の 高校に 通ってる。
踏切の 前で、よく 電車を
待ってる 子さ。
/
元気に してるよ。{w=300}
おれは、知ってる。`,
    h2_2: `@npc_hoshi_mitsu
朝に なったら、ほどよい 色の
4つ、とっといて やろう。`,
  },

  // ------------------------------------------------------------ 3.9 マサルさん
  npc_hoshi_gen: {
    /** Before the tomato. */
    h0_1: `@npc_hoshi_gen
……懐中電灯の 電池が、
夜の 長さに 負けた。
/
中は 真っ暗だ。{w=300}
見回りが、あと 1房 残ってる。
/
ボウズ。{w=300}
暗い うちは、牛舎に 入るな。
牛が びっくりする。`,
    h0_2: `@npc_hoshi_gen
明かりが あれば、
すぐ すむんだがな。
/
……頭は 光らんぞ。{w=300}
誰が らっきょやねん！
@flip
（まだ 何も 言っていません）`,
    /** In the barn at (20,6) after the round; 10.19's invitation follows while flag_ch2_barn_work=0. */
    h1_1: `@npc_hoshi_gen
ゲートは 開けといた。{w=300}
柵には、さわるなよ。
/
取っ手の ところだけ 持つ。
それ以外は、ビリッと くる。`,
    /** The shipping talk (once). Nothing in the music or the sounds changes for it; no invitation after it. */
    h1_2: `@npc_hoshi_gen
この 列は、来月 出荷だ。
/
7か月で 来て、
26か月くらいで 出る。{w=300}
農協を 通してな。
/
出荷の 朝は、ブラシを かける。
……おれは、そう してる。`,
    /** The third time on (the invitation follows while flag_ch2_barn_work=0). */
    h1_3: `@npc_hoshi_gen
牛は 朝夕 2回。{w=300}
盆も 正月も、牛は 食う。
/
だから おれも、休みは ない。
……休みたいとも、思わんな。`,
    /** After the chores (flag_ch2_barn_work=1), instead of h1_3. */
    h1_4: `@npc_hoshi_gen
エサも 寄せた。水も 出る。
{w=300}……あとは、朝を 待つだけだ。`,
    /** Beside the gate. */
    h2_1: `@npc_hoshi_gen
シュンスケ……{w=300}
うちの せがれの 名前だ。
/
町で 働いてる。
盆は、仕事で 来られんかった。
/
元気で やってりゃ、それでいい。
{w=300}……放送にも、そう
言って やってくれ。`,
    h2_2: `@npc_hoshi_gen
まつ先生は、山の 入口まで
送った。{w=300}
あとは、おまえらの 番だ。`,
    /** After h2_2 when the chores were done. */
    h2_2_worked: `@npc_hoshi_gen
……牛舎は、心配 するな。
{w=300}エサは、寄せてある。`,
    /** After h2_2 when they were not (the chores can't be done in stage 2). */
    h2_2_unworked: `@npc_hoshi_gen
……エサ寄せは、朝に おれが やる。`,
  },

  // ------------------------------------------------------------ 3.10 トマじい
  npc_hoshi_tome: {
    h0_1: `@npc_hoshi_tome
水の 見回りじゃ。{w=300}
穂が 実を ためとる ところでな。
/
水を 切るのは、もうちょい 先。
……朝が 来たらの 話じゃが。`,
    h0_2: `@npc_hoshi_tome
ばあさんは、町の 娘の とこへ
泊まりに 行っとる。{w=300}
あさっての バスで 帰る。
/
……あさってが 来たらの
話じゃが。`,
    h0_3: `@npc_hoshi_tome
トマじい、と 呼ばれとるが、
トマトは 作っとらん。{w=300}
米じゃ。
/
トマトは、ペロリの とこじゃ。
{w=300}……名前で 決めるな。`,
    h1_1: `@npc_hoshi_tome
ほう、明るいのう。{w=300}
スズメが 起きるで。
/
……いや、起きんか。
夜じゃからな。`,
    h1_2: `@npc_hoshi_tome
上の 田の かかしが、
さっきから 背広で
うろうろ しとる。
/
わしが 着せた 背広じゃ。{w=300}
……役場の 課長の ころの。`,
    h2_1: `@npc_hoshi_tome
かかしが みんな、山を
向きおった。{w=300}
/
あっちに 用が あるんじゃろ。
ボウズも、行って やれ。`,
    /** 〔h2_2〕 of 50 3.10: both ヘノヘノ課長 beaten (at any stage, once). */
    kacho_done: `@npc_hoshi_tome
背広の かかし、田んぼの 番に
もどっとったのう。{w=300}
/
……わしより、課長が
似合うとる。`,
  },

  // ------------------------------------------------------------ 3.11 ソワカさん（→ 無人販売所 7.3）
  npc_hoshi_sawako: {
    h0_1: `@npc_hoshi_sawako
いらっしゃい。{w=300}
……あら、いらっしゃいって
言っちゃった。
/
ここ、無人販売所なのよ。
夜は 野菜が 心配でねえ、
絵を 描きながら 見てるの。
/
どれでも 100円。{w=300}
お金は、その 箱に 入れてね。`,
    h0_2: `@npc_hoshi_sawako
無人販売所に 人が いたら、
有人販売所よねえ。{w=300}
/
……看板、描きなおそうかしら。
今度は、わたしの 顔も 入れて。`,
    /** The third time on, after the gathering (before it, h0_2 repeats). */
    h0_3: `@npc_hoshi_sawako
そうそう、ペロリさんの ハウス、
さっき 奥が 光ってたのよ。{w=300}
/
西の 斜面の、いちばん 西の 1棟。
/
ペロリって、あだ名よ。{w=300}
とれた トマトを ぺろりと
食べて、色と 味を みるの。`,
    /** While ムジン販売員 is still about. */
    h1_1: `@npc_hoshi_sawako
料金箱が ね、勝手に
『いらっしゃいませ』って
札を 出すのよ。
/
しかも、わたしの 筆で。{w=300}
……字は、まだまだね。`,
    /** 〔h1_2〕 of 50 3.11: ムジン販売員 beaten (at any stage, once). */
    mujin_done: `@npc_hoshi_sawako
箱、おとなしく なったわね。{w=300}
中の お金？
/
1円も へってないわよ。{w=300}
……えらい 箱。
今度、絵に 描いて あげる。`,
    h2_1: `@npc_hoshi_sawako
放送で 呼ばれてる サトシくん、
100円玉 にぎって、うちの
きゅうり 買いに 来てたのよ。
/
札の 絵を 見て『本物より
うまそう』ですって。{w=300}
……失礼しちゃうわよねえ。
/
いまは 町の お店で
買ってるでしょうねえ。{w=300}
それで いいのよ。`,
  },

  // ------------------------------------------------------------ 3.12 ふくじんづけ（マサルさんの犬）
  npc_hoshi_gon: {
    h0_1: `@npc_hoshi_gon
……ぷすー。
@narr
小さな 犬が 片目だけ 開けて、
また 閉じた。{w=300}
大きな 耳だけが、起きている。`,
    h0_2: `@narr
首輪の 名札に『ふくじんづけ』。
{w=300}……カレーの 横に いる 名前だ。`,
    h1: `@narr
犬が 起きて、トマトの 光を
大きな 耳ごと 目で 追っている。`,
    h2: `@npc_hoshi_gon
キャン！
@narr
犬は 山の ほうを 向いて、
1回だけ 吠えた。{w=300}
耳の 飾り毛が、ふわっと ゆれた。`,
  },
};

// ---------------------------------------------------------------- 3.1 カネナリくんのフリップ（場所ごと）

/** Place key (52 1.8) → the flip shown the first time there. */
export const KANENARI_FLIPS_HOSHI: Record<string, string> = {
  hoshi_train: `@flip
電車は ひさしぶりです。
（つり革に 鐘が あたります）`,
  hoshi_station: `@flip
となり町の 駅です。
（PRは 管轄外です）`,
  hoshi_bus: `@flip
1日2本。
（ぼくの 出番も 年2回でした）`,
  /** Before ムジン販売員 is met (stage 0). */
  hoshi_mujin: `@flip
どれでも 100円。
（ぼくは 非売品です）`,
  hoshi_school: `@flip
ここで 観望会の PRを しました。
（1人 来ました）`,
  hoshi_house: `@flip
トマトは 苦手では ありません。
（中が 暗いだけです）`,
  hoshi_barn: `@flip
夕鳴町にも 牛が います。
（置物です）`,
  hoshi_tanada: `@flip
田んぼが 階段に なっています。
（のぼると 鐘が ゆれます）`,
  hoshi_fence: `@flip
柵には さわりません。
（マサルさんに 言われたので）`,
  hoshi_houki: `@flip
ここは、むかし 畑でした。
（クズが そう 言っています）`,
  hoshi_akiya: `@flip
（……）`,
  hoshi_hill: `@flip
（……ここから、夕鳴町が
見えます）`,
};

/** 〔hoshi_mujin〕 from stage 1 on (ムジン販売員 is up and about). */
export const KANENARI_FLIP_MUJIN_H1 = `@flip
（キャラが かぶっています）`;

/** 〔いつもの・第2章〕 after the place flips: the three in turn (counted apart from chapter 1's). */
export const KANENARI_USUAL_HOSHI: string[] = [
  `@flip
星見台は、となり町です。`,
  `@flip
夕鳴町を よろしく
おねがいします。（となりも）`,
  `@flip
（トマトの 光、
あったかいです）`,
];

// ---------------------------------------------------------------- 3.2 / 3.13 防災無線の呼び声

/**
 * The names the broadcast calls, in this order, over and over (50 3.2; all
 * fictional). The world's timer (world/hoshi.ts) reads them from here.
 */
export const CALL_NAMES: string[] = ['おぴぴちゃん', 'シュンスケくん', 'もとくん', 'アスカちゃん', 'サトシくん', 'タクミくん', 'クリコさん', 'タカシさん'];

/** Stage 2 alternates this line with the names. */
export const CALL_HEAD = 'こちらは、防災 星見台です。';

/** One call's bubble text: 「……おぴぴちゃん。」 */
export function callLine(name: string): string {
  return `……${name}。`;
}

// ---------------------------------------------------------------- 7.3 無人販売所（ソワカさんが売る）

export const MUJIN_SHOP = {
  title: '星見台 無人販売所',
  /** 1回の買い物の上限（店を出て入りなおせば、また買える）。 */
  limits: { item_kyuri_zuke: 3, item_toumorokoshi: 1, item_umeboshi: 2 } as Record<string, number>,
  goods: ['item_kyuri_zuke', 'item_toumorokoshi', 'item_umeboshi'],
  price: 100,
  confirm: (item: string) => `${item}を 買う？（100円）`,
  /** 〔購入・1回目〕 */
  first: ['はい、まいど。{w=300}\n……あら、また 言っちゃった。'],
  /** 〔購入・2回目以降〕 in turn. */
  again: [['箱に 入れてね。'], ['ありがとうねえ。']],
  /** The first ゆでとうもろこし (instead of the line above). */
  corn: ['ぼくは 1列ずつ 派？\nぐるっと 派？{w=300}\n……どっちも、絵に なるのよ。'],
  noMoney: ['100円玉、ない？{w=300}\n朝に なったら、また 来てね。'],
  bagFull: ['ポケット、いっぱいねえ。{w=300}\n野菜が つぶれちゃうわよ。'],
  bye: ['夜道、気を つけてね。'],
};
