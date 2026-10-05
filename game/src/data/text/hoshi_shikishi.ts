// 70年の 色紙と 小さな 夏祭り（げむきか10/5の 改5。もとの 案は 10/4 の3「70年の 色紙」と
// 10/2 の2「提灯 ひとつの 夏祭り」。02_ch2_index #84、50 9.9・10.26）。
//
//   段階1〜2（トマトの 灯りを 持ってから）：
//   1 シゲじいと スギばあの 家の カレンダー『結婚 70年』→ グソっ君（1回）→ 集会所の
//     ぴょん夫人〔70〕→ 大事なもの『70年の色紙』。「ひとことは 7つ。10年に 1つずつじゃ。」
//   2 7人の ひとこと（1回ずつ。どの 順でも よい）：トマじい・マサル・ペロ・ハモ区長・
//     まつ先生・ソワカ・さんかど。マサルの あと、マサルの 家の 母の 寝言（任意）。
//   3 7つの あと、ぴょん夫人〔さいご〕：「しゅんが 書く｜グソっ君が 書く」→ 朱肉 +2。
//   4 区の 倉庫の 提灯の 箱 → グソっ君「ハモ区長に、聞いて みいひん？」→ 区長〔matsuri〕
//     → 箱から『夏祭りの提灯』、太鼓は グソっ君が 背負う → 校庭の 桜に かける → 太鼓
//     （ドン・ドン・カッ）→ タケじいの 寝言 → ぴょん夫人と 区長が 校庭へ → 踊りと 拍手 →
//     （色紙が そろっていれば）区長の 読み上げ → 窓から 寝言 2つ → 朱肉 +2。
//   5 かくし：座布団の 10円玉の 紙の 裏、勝敗表の △、エンディングの 絵の 差分 2つ。
//
// 決まり：第2章の 台詞に 時刻の 数字・「12人」「1日2本」「おまけの 1つ」「具足様」「まだ」
// 「平和」「17」「3人」を 入れない（「70年」「7つ」「10年」「8本」は 時刻では ない）。
// ペロと マサルの 口癖は 使わない。区長は「具足様」と 言わない。「盆踊り」の 語と、
// 夏祭りが 箱の ままの わけには ふれない。火は 使わない（提灯は トマトの 灯りで ともる）。
// タケじいは 寝言だけ。寝言しりとり（9.6）の 決まりは そのまま（足す 寝言は「ありがとう →
// うん」と 太鼓の 1回だけ。グソっ君の「あちゃ〜」は 使わない）。地の文・名札の 名前に
// 「さん」を つけない。1ページ 3行 × 336px（textcheck2 と shikishiText が 見る）。

export type ShikishiWho = 'tome' | 'gen' | 'mitsu' | 'kucho' | 'fumi' | 'sawako' | 'sankado';

/**
 * 7人（ぴょん夫人が 言う 順）：NPC の id、みました帳の 名前、ぴょん夫人の 呼び方。
 * 色紙の フラグは flag_shikishi_<who>（値は もらった 順番 1〜7）。
 */
export const SHIKISHI_WHO: { who: ShikishiWho; npc: string; name: string; call: string }[] = [
  { who: 'tome', npc: 'npc_hoshi_tome', name: 'トマじい', call: 'トマじい' },
  { who: 'gen', npc: 'npc_hoshi_gen', name: 'マサル', call: 'マサルさん' },
  { who: 'mitsu', npc: 'npc_hoshi_mitsu', name: 'ペロ', call: 'ペロさん' },
  { who: 'kucho', npc: 'npc_hoshi_kucho', name: '区長', call: 'うちの 人' },
  { who: 'fumi', npc: 'npc_hoshi_fumi', name: 'まつ先生', call: 'まつ先生' },
  { who: 'sawako', npc: 'npc_hoshi_sawako', name: 'ソワカ', call: 'ソワカさん' },
  { who: 'sankado', npc: 'npc_hoshi_busdriver', name: 'さんかど', call: '郵便の 人' },
];

// ================================================================ 1 はじまり

/** カレンダー（段階1〜2）を 見た あと、グソっ君（1回）。 */
export const SHIKISHI_CAL_FLIP = `@npc_kanenari
70年て、集会所で 寝とる
2人の ことやろか。{w=300}
ぴょん夫人に、聞いてみよか。`;

/** ぴょん夫人〔70〕（カレンダーを 見た あと、1回）。 */
export const SHIKISHI_YOSHIE_70 = `@npc_hoshi_yoshie
見たんか、あの カレンダー。{w=300}
秋に、2人の 70年の
お祝いを するんじゃ。
/
起きとる ときに 言うと、{w=300}
しりとりで はぐらかされる。{w=300}
……今が ちょうど いい。
/
色紙に、みんなの ひとことを
集めとる。{w=300}
聞いて きて くれんか。`;
export const SHIKISHI_GET = `@sys
70年の色紙を あずかった！`;
export const SHIKISHI_YOSHIE_7 = `@npc_hoshi_yoshie
ひとことは 7つ。{w=300}
10年に 1つずつじゃ。
/
トマじいに、マサルさん、
ペロさん。{w=300}うちの 人に、
まつ先生、ソワカさん、郵便の 人。`;
/** 色紙を あずかった あと、グソっ君（1回）。 */
export const SHIKISHI_FLIP_70 = `@npc_kanenari
70年も しりとり しとったら、{w=300}
言葉、なくならへんのかな。`;

/** とちゅうで ぴょん夫人に 話すと：のこりの 人（呼ぶ側が 名前を 入れる。3行まで）。 */
export const SHIKISHI_LEFT_HEAD = '@npc_hoshi_yoshie';
export const SHIKISHI_LEFT_PRE = (n: number): string => `ひとこと、あと ${n}つじゃ。{w=300}`;

// ================================================================ 2 7人の ひとこと

/** 7人の 前に 1ページ（色紙を 見せる）。 */
export const SHIKISHI_SHOW = `@narr
しゅんは、色紙を 見せた。`;

/** 7人の ひとこと（色紙に 書くまで）。 */
export const SHIKISHI_WORD: Record<ShikishiWho, string> = {
  tome: `@npc_hoshi_tome
わしと マルの 祝言の 晩じゃ。{w=300}
あの 2人が、余興で
しりとりを してくれての。
/
朝まで 終わらんかった。{w=300}
……わしらの 祝言は、{w=300}
半分 あの 2人の もんじゃ。
!se se_pen_write
!wait 160
!se se_pen_write
!wait 160
@narr
トマじいは、色紙の すみに
ゆっくり 書いた。{w=300}
『朝まで ありがとう とまたろう』`,
  gen: `@npc_hoshi_gen
おふくろと スギばあは、{w=300}
同じ 年に、この 村へ
嫁に 来た。
/
谷の 向こうから、{w=300}
同じ 道を 歩いて。{w=300}
……70年、となりの 畑だ。
!se se_pen_write
!wait 160
!se se_pen_write
!wait 160
@narr
マサルは、太い 字で 書いた。
{w=300}『おふくろの ぶんも マサル』`,
  mitsu: `@npc_hoshi_mitsu
くりこが 赤んぼの ころ、{w=300}
ハウスの 仕事の あいだ、
スギばあが 子守りを してくれた。
/
子守歌が、しりとりでね。{w=300}
……くりこは、『ん』で 寝る。
!se se_pen_write
!wait 160
!se se_pen_write
!wait 160
@narr
ペロは、2人ぶんの 名前を 書いた。
{w=300}『くりこと ペロ』`,
  kucho: `@npc_hoshi_kucho
えー、村の 記録に よりますと、{w=300}
お2人の けんかの 記録は、
ございません。
/
えー、しりとりの 記録は、{w=300}
ございます。{w=600}
……ぜんぶ ひきわけで ございます。
!se se_pen_write
!wait 160
!se se_pen_write
!wait 160
@narr
区長は、式辞の 字で 書いた。
{w=300}『えー、おめでとう ございます 区長』`,
  fumi: `@npc_hoshi_fumi
分校の 国語の 時間に、{w=300}
お2人を、しりとりの 先生に
お呼びしました。
/
子どもが『ん』で 負けると、{w=300}
シゲさんが、いちばん
くやしがりました。
/
スギさんが 教えてくれました。
{w=300}『ん』で 終わる 言葉は、{w=300}
やさしい 言葉が 多いと。
@npc_kanenari
ありがとさん、ごめん、{w=300}
ごはん、みかん……{w=300}
ほんまや。
!se se_pen_write
!wait 160
!se se_pen_write
!wait 160
@narr
まつ先生は、黒板の 字で 書いた。
{w=300}『ひきわけも、りっぱな 勝負です まつ』`,
  sawako: `@npc_hoshi_sawako
スギさんの もんぺの 色、{w=300}
藍と 茶の あいだ。{w=300}
70年 洗うと、ああ なるの。
/
ひとことの かわりに、{w=300}
絵に するわ。`,
  sankado: `@npc_hoshi_busdriver
あの 家から 出る 手紙はね、{w=300}
差出人の 名前の 順番が、{w=300}
毎年 入れかわるんだ。
/
『シゲ・スギ』の 年と、{w=300}
『スギ・シゲ』の 年。{w=300}
……消印より 正確だよ。
@npc_kanenari
差出人まで、{w=300}
ひきわけ しとる！
!se se_pen_write
!wait 160
!se se_pen_write
!wait 160
@narr
さんかどは、宛名の 字で 書いた。
{w=300}『差出人 さんかど』`,
};

/** ソワカの 絵（マサルの 母の 寝言を 聞いていれば、その 前に「藍を 2つ」）。 */
export const SHIKISHI_SAWAKO_AI = `@narr
しゅんは、マサルの お母さんの
寝言の ことを 話した。
@npc_hoshi_sawako
おそろいの もんぺ？{w=300}
……じゃあ、藍を 2つ。`;
export const SHIKISHI_SAWAKO_E = `@narr
色紙の まんなかに、{w=300}
向かい合った 枕が 2つ。`;
export const SHIKISHI_SAWAKO_E_AI = `@narr
色紙の まんなかに、{w=300}
向かい合った 枕が 2つ。{w=300}
すみに、藍色の もんぺが 2つ。`;

/** マサルの あと、グソっ君（隊列に いれば）。 */
export const SHIKISHI_GEN_FLIP = `@npc_kanenari
ほな、マサルの おばあちゃんにも、
{w=300}聞いて みよか。`;

/** マサルの 家の 母の 寝言（マサルの ひとことの あと、1回）。 */
export const SHIKISHI_HAHA = `@narr
おばあさんが、ねむったまま
小さく 言った。
/
『……スギちゃん……
おそろいの、もんぺ……』
{w=300}……すう、すう。`;

/** 7つ そろった とき、グソっ君。 */
export const SHIKISHI_SOROTA = `@npc_kanenari
7つ、そろたで！{w=300}
ぴょん夫人に、見せに 行こ。`;

// ================================================================ 3 さいごの ひとこと

export const SHIKISHI_LAST_ASK = `@npc_hoshi_yoshie
……ええ 色紙じゃ。{w=300}
7つ、ちゃんと そろうとる。
/
さいごの ひとことは、{w=300}
これからの 10年の ぶん。{w=300}
あんたらが 書き。
? しゅんが 書く | グソっ君が 書く`;
export const SHIKISHI_LAST_SHUN = `@narr
しゅんは、色紙の いちばん 下に
書いた。{w=300}
『ひきわけ、おめでとう しゅん』`;
export const SHIKISHI_LAST_GK = `@narr
グソっ君は、ペンを
両手で にぎった。{w=300}
『ん』。
@npc_kanenari
……あかん。{w=300}
いきなり 負けてもうた。`;
/** グソっ君の『ん』の あと（まつ先生の『ん』の 話を 聞いていれば。7つの あとなので いつも）。 */
export const SHIKISHI_LAST_GK_YOSHIE = `@npc_hoshi_yoshie
……『ん』で 終わるのは、{w=300}
あの 家の 決まりじゃ。{w=300}
ええ 字じゃ。`;
export const SHIKISHI_KEEP = `@npc_hoshi_yoshie
色紙は、あたしが あずかっとく。`;
/** 祭りの 前：区長〔matsuri〕を まだ 聞いていない。 */
export const SHIKISHI_KEEP_SOKO = `@npc_hoshi_yoshie
区の 倉庫にな、夏祭りの
提灯が しもうて あるんじゃ。{w=300}
……ここ 何年かは、箱の まま。`;
/** 祭りの 前：区長〔matsuri〕を 聞いた あと。 */
export const SHIKISHI_KEEP_MATSURI = `@npc_hoshi_yoshie
祭りの 席で、うちの 人に
読み上げて もらおうかね。`;
/** 祭りの あと（集会所で 読み上げる）。 */
export const SHIKISHI_KEEP_READ = `@npc_hoshi_yoshie
あんた、読み上げて やって。`;
export const SHIKISHI_REWARD = `@sys
朱肉が 2 たまった。`;

// ================================================================ 区長の 読み上げ（祭り、または 集会所）

export const SHIKISHI_READ = `@npc_hoshi_kucho
えー、ただいまより、{w=300}
70年の 色紙を、{w=300}
読み上げまして ございます。
@narr
区長は、ひとことずつ、{w=300}
式辞の 声で 読み上げた。{w=300}
……『差出人』まで。`;
export const SHIKISHI_READ_GK = `@npc_hoshi_kucho
えー、さいごに……{w=300}『ん』。
{w=600}……以上で ございます。`;
export const SHIKISHI_READ_SHUN = `@npc_hoshi_kucho
えー、さいごに、{w=300}
『ひきわけ、おめでとう』。{w=300}
……以上で ございます。`;
/** シゲじいと スギばあの 寝言（祭り：集会所の 窓から／集会所：座布団の 上で）。 */
export const SHIKISHI_NEGOTO = (where: 'mado' | 'heya'): string => `@narr
${where === 'mado' ? '集会所の 窓から' : '座布団の 上で'}、シゲじいの
寝言。{w=300}『……70年……{w=300}
ありがとう……』
/
スギばあの 寝言。{w=300}
『……うん。』
/
『ん』で 終わった。{w=300}
……今夜も、ひきわけ。`;
export const SHIKISHI_KIKOE = `@npc_hoshi_yoshie
……聞こえとる。{w=300}
寝とっても、{w=300}
耳が 覚えとる。`;
/** 祭りの 校庭で（このあと 集会所へ もどって 立てる）。 */
export const SHIKISHI_TATE_MATSURI = `@npc_hoshi_yoshie
色紙は、2人の 座布団の
あいだに 立てとこう。{w=300}
起きたら、いちばんに 見える ように。`;
/** 集会所で（その場で 立てる）。 */
export const SHIKISHI_TATE_HEYA = `@npc_hoshi_yoshie
起きたら、{w=300}
いちばんに 見える ように。
!cue tate
@narr
ぴょん夫人は、色紙を 2人の
座布団の あいだに 立てた。`;
/** 立てた 色紙（集会所 (7,6)）。 */
export const SHIKISHI_TATE_OBJ = `@narr
2人の 座布団の あいだに、
色紙が 立っている。
/
7つの ひとことと、枕の 絵。
{w=300}いちばん 下に、さいごの 1つ。`;

// ================================================================ 5 かくし

/** 座布団の 10円玉（色紙を ぜんぶ 書いた あと）：いつもの 文の あとの 1ページ（「そっと もどしておいた。」は その あと）。 */
export const SHIKISHI_URA = `@narr
紙の 裏にも、2人の 字。{w=300}
『ひきわけの ときは、
2人の もの』。`;
/** 紙の 裏の あと（いつもの 文の さいごの 1行を ここへ 回す）。 */
export const SHIKISHI_URA_END = `@narr
そっと もどしておいた。`;
export const SHIKISHI_URA_FLIP = `@npc_kanenari
……はじめから、{w=300}
そのつもり やったんや。`;
/** 勝敗表（色紙を ぜんぶ 書いた あと、グソっ君が いれば 1回）。 */
export const SHIKISHI_SANKAKU_FLIP = `@npc_kanenari
ぜんぶ ×て、ほんまかいな。{w=300}
ひきわけは、三角やろ。`;
export const SHIKISHI_SANKAKU = `@narr
よく 見ると、×の 列の
さいごに、{w=300}小さな △。`;

// ================================================================ 4 提灯 ひとつの 夏祭り

/** 区の 倉庫の 提灯の 箱、グソっ君（部屋の ひとこと「祭りって 行ってみたいわ」が まだ なら）。 */
export const MATSURI_BOX_FLIP = `@npc_kanenari
夏祭りの 道具や。{w=300}
わい、祭りって
行ってみたいわ。`;
/** 同じ（部屋の ひとことを もう 言った あと）。 */
export const MATSURI_BOX_FLIP2 = `@npc_kanenari
ええ 色やなあ。{w=300}
わい、やっぱり 祭りって
行ってみたいわ。`;
/** 第1章で 商店会の 倉庫の 垂れ幕の ひとことを 聞いた 人だけ。 */
export const MATSURI_BOX_BANNER = `@npc_kanenari
夕鳴町の 祭りは、{w=300}
先週 終わっとったしな。`;
export const MATSURI_BOX_ASK = `@npc_kanenari
ハモ区長に、
聞いて みいひん？`;

/** 区長〔matsuri〕（1回）。 */
export const MATSURI_KUCHO = `@npc_hoshi_kucho
えー、星見台 夏祭り。{w=300}
校庭に やぐらを 組んで、
太鼓と 提灯で ございました。
/
えー、やぐらを 組むには、
手が 8本 いるので
ございます。
@npc_kanenari
手ぇなら、わい いっぱい あるで。
@npc_hoshi_kucho
……えー、何本で ございますか。
@npc_kanenari
……数えたこと ないわ。
@npc_hoshi_kucho
えー、では、提灯 1つと、
太鼓 1つ。{w=300}
それなら、手は 足ります。`;
/** 色紙を あずかっていれば（とちゅう）。 */
export const MATSURI_KUCHO_SHIKISHI = `@npc_hoshi_kucho
えー、では 夏祭りは、{w=300}
お2人の 70年の 前祝いと
いたしましょう。
/
えー、色紙が そろいましたら、
{w=300}わたくしが 読み上げまして
ございます。`;
/** 色紙が もう そろっていれば。 */
export const MATSURI_KUCHO_SHIKISHI_DONE = `@npc_hoshi_kucho
えー、では 夏祭りは、{w=300}
お2人の 70年の 前祝いと
いたしましょう。
/
えー、色紙は、祭りの 席で、
{w=300}わたくしが 読み上げまして
ございます。`;
export const MATSURI_KUCHO_END = `@npc_hoshi_kucho
えー、区の 物で ございます。
{w=300}使ったら、元の 場所へ。`;

/** 区長〔matsuri〕の あと、箱から 提灯。 */
export const MATSURI_BOX_TAKE = `@narr
箱から、提灯を 1つ 出した。`;
export const MATSURI_CHOCHIN_GET = `@sys
夏祭りの提灯を 手に入れた！`;
export const MATSURI_TAIKO_SEOU = `@npc_kanenari
太鼓は、わいが 持ったる。{w=300}
背中に のせたら ええねん。
!cue seou
@narr
よろいの 背中に、
太鼓が ぴったり のった。
@npc_kanenari
提灯は、校庭の 桜が
ちょうど ええんちゃう？`;
/** 提灯を 出した あとの 箱（祭りの あとも）。 */
export const MATSURI_BOX_AFTER = `@narr
祭りの 提灯の 箱。
/
箱の すきまが、1つ ぶん。`;
/** 太鼓の あった ところ（背負っている あいだ）。 */
export const MATSURI_TAIKO_GONE = `@narr
太鼓の あった ところに、
丸い あとが 1つ。`;
/** 祭りの あと、元の 場所に もどった 太鼓。 */
export const MATSURI_TAIKO_BACK = `@narr
太鼓。{w=300}
ばちが 2本、皮の 上で
休んでいる。
/
……皮が、少し あたたかい。`;

/** 校庭の 桜（提灯を 持っていて、色紙が とちゅうの とき）：やわらかく 止める。 */
export const MATSURI_SAKURA_WAIT = `@npc_kanenari
提灯、ここに かけるんか。{w=300}
……色紙が そろうてからの
ほうが、ええんちゃう？`;
export const MATSURI_SAKURA_ASK = `@narr
校庭の 桜。{w=300}
低い 枝が、提灯に
ちょうど いい 高さだ。
? 提灯を かける | やめておく`;
export const MATSURI_SAKURA_HANG = `@narr
桜の 枝に、提灯が 1つ。{w=300}
灯りが 近づくと、
紙が 橙に ともった。`;
export const MATSURI_TAIKO_OKU = `@npc_kanenari
太鼓、ここに 置くで。{w=300}
しゅん、たたいて みいひん？`;
/** 太鼓を たたく 案内（キーの 横の 字）。 */
export const MATSURI_WORD = { tataku: 'たたく' };
/** たたいた ときに 浮かぶ 字（3回目は ふち）。 */
export const MATSURI_HITS = ['ドン', 'ドン', 'カッ'];
export const MATSURI_TAKE_NEGOTO = `@narr
集会所の ほうから、
寝言が 1つ。{w=300}
『……ドン、ドン、カッ……』`;
export const MATSURI_YOSHIE_OUT = `@npc_hoshi_yoshie
タケさんの 太鼓じゃ。{w=300}
寝とっても、手が 覚えとる。`;
export const MATSURI_KUCHO_OUT = `@npc_hoshi_kucho
えー、校庭は、{w=300}
留守番の 範囲で ございます。`;
export const MATSURI_ODORI = `@npc_hoshi_yoshie
ほれ、踊り。{w=300}
手を 2つ たたいて、くるっと。`;
export const MATSURI_HAKUSHU = `@narr
パン、パン、
パパパパパパン。
@npc_hoshi_yoshie
……ええ 拍手じゃ。{w=300}
数は、多すぎるけど。`;
export const MATSURI_GK_END = `@npc_kanenari
これが 祭りか。{w=300}
……ちっこいけど、ええなあ。`;
/** 第1章の 垂れ幕の「ほな、来年は 行こな。」を 聞いた 人だけ。 */
export const MATSURI_GK_RAINEN = `@npc_kanenari
来年まで、
待たんで よかったわ。`;
export const MATSURI_KUCHO_TAIKO = `@npc_hoshi_kucho
えー、太鼓は、わたくしが
元の 場所へ。{w=300}
区の 物で ございますので。`;
/** 祭りの あと、校庭の 桜。 */
export const MATSURI_SAKURA_AFTER = `@narr
桜の 枝に、提灯が 1つ。{w=300}
灯りが 近づくと、
紙が 橙に すける。`;
export const MATSURI_REWARD = SHIKISHI_REWARD;

// ================================================================ みました帳②の すみの 1ページ

/** 題と 一覧の 行（鉛筆、番号なし）。 */
export const SHIKISHI_BOOK = {
  title: '70年の 色紙',
  last: { shun: 'さいご：しゅん', gk: 'さいご：『ん』' },
  negoto: { haha: '寝言：もんぺ', take: '寝言：ドン、カッ' },
};

/** textcheck2 が 見る ページ。 */
export const SHIKISHI_TEXTS: Record<string, unknown> = {
  cal: SHIKISHI_CAL_FLIP,
  y70: SHIKISHI_YOSHIE_70,
  get: SHIKISHI_GET,
  y7: SHIKISHI_YOSHIE_7,
  flip70: SHIKISHI_FLIP_70,
  show: SHIKISHI_SHOW,
  word: SHIKISHI_WORD,
  sawakoAi: SHIKISHI_SAWAKO_AI,
  sawakoE: SHIKISHI_SAWAKO_E,
  sawakoEAi: SHIKISHI_SAWAKO_E_AI,
  genFlip: SHIKISHI_GEN_FLIP,
  haha: SHIKISHI_HAHA,
  sorota: SHIKISHI_SOROTA,
  lastAsk: SHIKISHI_LAST_ASK,
  lastShun: SHIKISHI_LAST_SHUN,
  lastGk: SHIKISHI_LAST_GK,
  lastGkYoshie: SHIKISHI_LAST_GK_YOSHIE,
  keep: SHIKISHI_KEEP,
  keepSoko: SHIKISHI_KEEP_SOKO,
  keepMatsuri: SHIKISHI_KEEP_MATSURI,
  keepRead: SHIKISHI_KEEP_READ,
  reward: SHIKISHI_REWARD,
  read: SHIKISHI_READ,
  readGk: SHIKISHI_READ_GK,
  readShun: SHIKISHI_READ_SHUN,
  negotoMado: SHIKISHI_NEGOTO('mado'),
  negotoHeya: SHIKISHI_NEGOTO('heya'),
  kikoe: SHIKISHI_KIKOE,
  tateMatsuri: SHIKISHI_TATE_MATSURI,
  tateHeya: SHIKISHI_TATE_HEYA,
  tateObj: SHIKISHI_TATE_OBJ,
  ura: SHIKISHI_URA,
  uraFlip: SHIKISHI_URA_FLIP,
  uraEnd: SHIKISHI_URA_END,
  sankakuFlip: SHIKISHI_SANKAKU_FLIP,
  sankaku: SHIKISHI_SANKAKU,
  boxFlip: MATSURI_BOX_FLIP,
  boxFlip2: MATSURI_BOX_FLIP2,
  boxBanner: MATSURI_BOX_BANNER,
  boxAsk: MATSURI_BOX_ASK,
  kucho: MATSURI_KUCHO,
  kuchoShikishi: MATSURI_KUCHO_SHIKISHI,
  kuchoShikishiDone: MATSURI_KUCHO_SHIKISHI_DONE,
  kuchoEnd: MATSURI_KUCHO_END,
  boxTake: MATSURI_BOX_TAKE,
  chochinGet: MATSURI_CHOCHIN_GET,
  taikoSeou: MATSURI_TAIKO_SEOU,
  boxAfter: MATSURI_BOX_AFTER,
  taikoGone: MATSURI_TAIKO_GONE,
  taikoBack: MATSURI_TAIKO_BACK,
  sakuraWait: MATSURI_SAKURA_WAIT,
  sakuraAsk: MATSURI_SAKURA_ASK,
  sakuraHang: MATSURI_SAKURA_HANG,
  taikoOku: MATSURI_TAIKO_OKU,
  takeNegoto: MATSURI_TAKE_NEGOTO,
  yoshieOut: MATSURI_YOSHIE_OUT,
  kuchoOut: MATSURI_KUCHO_OUT,
  odori: MATSURI_ODORI,
  hakushu: MATSURI_HAKUSHU,
  gkEnd: MATSURI_GK_END,
  gkRainen: MATSURI_GK_RAINEN,
  kuchoTaiko: MATSURI_KUCHO_TAIKO,
  sakuraAfter: MATSURI_SAKURA_AFTER,
};
