// Event texts (10_narrative.md 5章). The msg-block format of 10_narrative 1.4
// (world/msg.ts): @speaker / text lines / `/` page / `? a | b` choice /
// [label] branches / !command. Staging lives in src/events; only the words
// live here. QA round 3 (tempo): the book's lines in fewer windows — the same
// beats and jokes, the repeats folded together (about two thirds of the pages).

// ---------------------------------------------------------------- 5.2 evt_opening

export const OPENING_CAPTION = ['8月31日。', '夏休み、最後の日。'];

export const OPENING_CALL = `@母の声:mother
しゅんー。{w=300}
ちょっと 降りてきてー。`;

export const OPENING_CALL2 = `@母の声:mother
しゅんー？{w=300} 寝てるのー？`;

/** A control guide row: the keys (drawn as keycaps; arrows by name) and what they do. */
export type GuideRow = [keys: string[], label: string];

/** 5.2's control guide, drawn with the keyboard's own keys (not a pad's 十字キー). */
export const GUIDE_MOVE: GuideRow[] = [
  [['left', 'up', 'down', 'right'], '移動'],
  [['Z'], '調べる・話す'],
];

/** Once, as the walk to the park begins: the menu and the dash. */
export const GUIDE_MENU: GuideRow[] = [
  [['Shift'], 'ダッシュ'],
  [['X', 'C'], 'メニュー'],
];

// ---------------------------------------------------------------- 5.3 evt_errand

export const ERRAND_A = `@npc_mother
あ、起きた。{w=300}おつかい 行ってきて。
たかしさんの お店で 焼きそば 4つ。
青のりは 別。{w=300}別よ？
/
1つは おまけ。だれかに あげなさい。
チャイムが 鳴るまでに 帰ること。{w=300}
たかしさんは 坂を 上って 右。はい、がま口。`;

export const ERRAND_GET = `@sys
がま口を 受けとった！（500円）
おつかいメモを 受けとった！`;


// ---------------------------------------------------------------- 5.4 evt_maruyama_first

export const MARUYAMA_FIRST_A = `@npc_maruyama
へい、らっしゃい！{w=300}
お、小林さんとこの ボウズか。{w=300}
焼きそば？ 悪いな、まだ 焼いてねえんだ。
/
焼くのは 5時の チャイムが
鳴り終わってから。{w=500}
オレの 信念じゃない。鉄板の 信念だ。`;

/**
 * ★2026-09-29 (04_gusokkun_plan 2章 1): 今日のぶんは 焼いていないが、ゆうべの
 * 売れ残りを 持たせる（鉄板の 信念とは ぶつからない）。公園で 倒れている
 * グソっ君に あげる 分。
 */
export const MARUYAMA_URENOKORI = `@npc_maruyama
……それと、これ。{w=300}
ゆうべの 売れ残りだ。
売りもんには ならねえ。
/
……腹 へってる やつに でも
やってくれ。`;
export const MARUYAMA_URENOKORI_GET = `@sys
売れ残りの焼きそばを 受けとった！`;
/** Stage 1, when the leftover was never given (the insurance 17:00 came first): he gives it now. */
export const MARUYAMA_URENOKORI_LATE = `@npc_maruyama
お、ボウズ。{w=300}焼くのは まだだ。
……代わりに、これ 持ってけ。
/
ゆうべの 売れ残りだ。
売りもんには ならねえ。{w=300}
腹 へってる やつに でも やってくれ。`;

export const MARUYAMA_FIRST_B = `@npc_maruyama
金が 足りなきゃ ツケで いい。
それまで ひのやで 時間でも
つぶしてきな。`;

// ---------------------------------------------------------------- 5.5 evt_obaa_first

/** One page; the shop opens straight after it. */
export const OBAA_FIRST = `@npc_obaa
おや、しゅん。{w=300}自由研究は？{w=500}
……白紙の 顔だね。先生を 40年 やると、
白紙は 顔で わかるのさ。`;

/** (ひのや before 焼きそばのたかし: she guesses the errand.) */
export const OBAA_FIRST_NOMEAT = `@npc_obaa
焼きそばかい？{w=300}
たかしは 5時から 焼きはじめるよ。
好きなの 選びな。`;

// ---------------------------------------------------------------- 5.6 evt_chime_stop

export const CHIME_STOP = `@narr
……チャイムが、{w=300}
4つ目の 音で 止まった。`;

// ---------------------------------------------------------------- 5.7 evt_hato_block

/** (Its 「クルッ。」 before this is a small balloon over the hato, not a window.) */
export const HATO_CARD = `@narr
ハトが 名刺を さしだしてきた。{w=300}
両手で。{w=600}……羽で。`;

/** Two pages (QA round 2: the chime → ハト → ハンコ chain trimmed for tempo). */
export const HATO_B = `@ハト係長:hato
夕鳴町 鳩課 係長で ございます。{w=300}
本日の 窓口は 17時で 終了……{w=600}
……の はずが、17時が 終わりません。
/
つきましては、ここは
お通し できません。{w=300}
クルッ。`;


// ---------------------------------------------------------------- 5.8 evt_hanko_given

/** Her question (the usual opening: ひのや visited), straight after the battle. */
export const HANKO_Q = `@npc_obaa
……見てたよ。{w=300}
ツッコミ、いい 間だったね。{w=500}
あれ、ただの ハトじゃ なかったろ。
? うなずく | 首を かしげる`;

/** ひのや not visited: she introduces herself first. */
export const HANKO_Q_NOVISIT = `@npc_obaa
あんた、小林さんとこの しゅんだね。
……見てたよ。{w=300}ツッコミ、いい 間だった。
/
あれ、ただの ハトじゃ なかったろ。
? うなずく | 首を かしげる`;

/** Her answer to each choice; the page goes on with HANKO_TOWN. */
export const HANKO_ANSWER = ['そうかい。{w=300}あたしにも、そう 見えたよ。', 'そうかい。{w=300}あたしには、係長に 見えたよ。'];

export const HANKO_TOWN = `この町じゃね、見て もらえない モノは
自分が 何だったか、忘れちまうのさ。`;

export const HANKO_GIVE = `@npc_obaa
さっきの ハトみたいに。{w=500}
これ、あずけとくよ。昔の 商売道具さ。`;

export const HANKO_GET = `@sys
{c=#E23B2E}ハンコケース{/c}を 受けとった！
{c=#E23B2E}みました{/c}と {c=#E23B2E}ペケ{/c}の ハンコが 入っている。`;

/** The homework, and the try-it-now (the how-to is the guide note beside the HUD hanko). */
export const HANKO_C = `@npc_obaa
宿題はね、ぜんぶは 見きれなかった。{w=500}
だから 今度は、あんたが 見ておいで。{w=300}
ためしに ほら、くま吉の 『まいど』。`;

/** The how-to, once, beside the HUD hanko it points at. */
export const GUIDE_FUSHIGI = '調べると 『みました』を 押せる。\nふしぎの 近くでは ハンコが ゆれる。';

// ---------------------------------------------------------------- 5.9 evt_obaa_park_hint

export const PARK_HINT_A = `@npc_obaa
はい、よくできました。{w=600}
公園でね、なんか でっかい 虫みたいなのが
倒れてるってさ。
/
路地の 工事は 『17時まで』
だったろ？{w=300}行って、見て おいで。`;

export const PARK_HINT_B = `@npc_obaa
こら、しゅん。{w=600}……まあ いい。
押すのは 道々で いいさ。
/
公園の ほうでね、なんか でっかい
虫みたいなのが、倒れてるってさ。{w=300}
路地から 行けるよ。`;

// ---------------------------------------------------------------- 5.10 evt_alley_open

export const ALLEY_OPEN = '工事の コーンが いなくなっている。{w=300}\n『17時まで』だったから……らしい。';

// ---------------------------------------------------------------- 5.11 evt_kanenari_meet

// ★2026-09-29 (04_gusokkun_plan 2章 3): グソっ君 lies on his back under the
// clock tower, hungry. Until he gives his name his tag is 「？？？」.

/** The first look. */
export const KANENARI_MEET = `@narr
でっかい 虫が、あおむけに 倒れている。{w=300}
足が、ゆっくり 動いている。
@？？？:gusokkun
……は、腹 へって 動かれへん……`;

/** Talked to again (he was left there). */
export const KANENARI_MEET_AGAIN = `@？？？:gusokkun
……は、腹 へって 動かれへん……`;

/** No leftover in the bag (the insurance 17:00 came before 焼きそばのたかし). */
export const KANENARI_NOFOOD = `@narr
なにか、食べる ものが いりそうだ。{w=300}
……焼きそばの たかしの 店なら。`;

export const KANENARI_GIVE_Q = `@narr
売れ残りの焼きそばが ある。
? あげる | やめておく`;

export const KANENARI_GIVE_NO = `@narr
足が、ゆっくり 動いている。`;

/** The first bite of a land food: he freezes, then this. */
export const KANENARI_SHOCK = `@？？？:gusokkun
{shake}な、なんやこれ……！！{/shake}{w=300}
うっま！！
陸の 食いもんって、どないなっとんねん！`;

export const KANENARI_SEA = `@？？？:gusokkun
いつもは 海の 底で、
落ちてくる 魚とか 食うとったんや。`;

// ---------------------------------------------------------------- 5.12 evt_kanenari_join

/** His name, しゅん's (told by a gesture), and the question. */
export const KANENARI_NAME = `@npc_kanenari
わい、グソっ君 いうねん。{w=300}
……そう 呼ばれとった 気が する。
だれにかは 忘れてもうた。
/
自分は？
@narr
しゅんは、名前を 教えた。
@npc_kanenari
しゅん、か。{w=300}……しゅん、おおきにな。
/
わい、行く とこ ないねん。{w=300}
……ついて 行っても ええか？
? うなずく | 首を かしげる
[うなずく]
@npc_kanenari
ほんまか！{w=300} おおきに！
[首を かしげる]
@npc_kanenari
……あかんか。{w=300}
ほな、勝手に ついて 行くわ。
[-]`;
export const KANENARI_JOIN_SYS = `@sys
グソっ君が 仲間に なった！`;
/** Before はなまる rises: he is well again, and しゅん saw it. */
export const KANENARI_HANAMARU = `@narr
……ハンコケースが、
ほんのり あたたかい。`;

// ---------------------------------------------------------------- 5.13 evt_maigo_broadcast

export const BROADCAST = `@npc_broadcast
{spd=0.3}ピンポンパンポーン。{/spd}{w=400}
迷子の お知らせです。{w=300}黄色い 通学帽の子、
青い 水筒の子、片方だけの 上履きの子。
/
おうちの かたは、
ショッピングプラザ・ユウナリ
迷子センターへ おむかえに 来てください。`;

/** The last words, in a child's voice: no window, typed slowly in the middle of the screen. */
export const BROADCAST_LAST = '……だれか。';

/** The shadows turn, and the chain comes off (its sound falls on the pause). */
export const BROADCAST_SHADOWS = `@narr
町じゅうの 影が、
いっせいに 北東を 向いた。{w=700}
どこかで、鎖の はずれる 音が した。`;

export const BROADCAST_FLIP = `@npc_kanenari
モールは 北東や。{w=300}
影が、みんな そっち 向いとる。`;

// ---------------------------------------------------------------- 5.14 evt_ojigi

/** (Its 「アリガトウ ゴザイマシタ」 while it bows is a small balloon, not a window.) */
export const OJIGI_A = `@narr
銀座から 消えた 自販機だ。{w=300}
コードを 引きずって、
ここまで 来たらしい。
@おじぎ自販機:vending
イラッシャイマセ。{w=600}
……ドナタモ、押シテ
クダサイマセン デシタ。`;

/** Its last word before the bow and the DOSUN (a small balloon, as its thank-yous while bowing). */
export const OJIGI_B = 'アリガトウ ゴザイマシタ！';

export const OJIGI_AFTER = `@npc_kanenari
陸の あいさつ、覚えたで。{w=300}
……おじぎ 仲間やな。`;

// ---------------------------------------------------------------- 5.15 evt_mall_enter

export const MALL_ENTER = `@narr
ショッピングプラザ・ユウナリ。{w=300}
閉店して、ちょうど 1年。`;

/** グソっ君 in the hall for the first time (the shock: every shop in one box). */
export const MALL_ENTER_FLIP = `@npc_kanenari
な、なんや ここ……！{w=300}
店が ぎょうさん、1つの 箱に
入っとる……！`;

// ---------------------------------------------------------------- 5.17 evt_maigo_door

export const MAIGO_DOOR_LOCKED = `@narr
カギが かかっている。
/
貼り紙：『カギは フードコートの
忘れ物カウンターで
お預かり しています』`;
export const MAIGO_DOOR_LOCKED_FLIP = `@npc_kanenari
フードコートは 1階やで。{w=300}
……フードて、食いもんの ことか？`;
export const MAIGO_DOOR_USE = `@sys
迷子センターの鍵を 使った。`;
export const MAIGO_DOOR_OPEN_FLIP = `@npc_kanenari
ここ……なんか、落ち着くな。{w=300}
だれか 待っとった 気が するわ。`;
export const MAIGO_DOOR_REST_FLIP = `@npc_kanenari
ベンチで ひと休み してから
行こか。`;
export const MAIGO_DOOR_OPENED = `@narr
迷子センターの 扉。{w=300}
カギは 開いている。`;

// ---------------------------------------------------------------- 5.18 evt_boss_intro

export const BOSS_A = `@narr
忘れ物の 山。{w=300}傘、水筒、手袋、上履き……{w=500}
どれにも、名前が 書いてない。`;

export const BOSS_B = `@？？？:omukaemachi
{spd=0.6}……だれ？{w=600}
おむかえ？
? うなずく | 首を ふる
[うなずく]
@？？？:omukaemachi
……うそ。{w=300}
おむかえの 人は、
そんなに 小さく ない。
[首を ふる]
@？？？:omukaemachi
……じゃあ、帰って。{w=300}
ぼくたちは、ここで 待つ。
[-]
@？？？:omukaemachi
5時の チャイムは、
鳴らさない。{w=600}
鳴ったら、今日が 終わっちゃう。`;

/** グソっ君, after its words (the first time only; with him in the party). */
export const BOSS_KANENARI = `@npc_kanenari
……待っとるんか。{w=300}ずっと。`;

/** A retry: only the last page (the same words). */
export const BOSS_B_AGAIN = `@？？？:omukaemachi
5時の チャイムは、
鳴らさない。{w=600}
鳴ったら、今日が 終わっちゃう。`;


// ---------------------------------------------------------------- 5.20 evt_ending

/** The price is in his line; the bag goes onto the counter (no @sys window: the ending keeps one line per beat). */
export const END_MEAT_A = `@npc_maruyama
焼けた！{w=300} 鉄板が、やっと 納得した。
焼きそば 4つ、青のりは 別で 320円。{w=400}
……わかってるよ。`;
/** Short of 320 yen: the rest goes on the tab. */
export const END_MEAT_TSUKE = `@npc_maruyama
足りない 分は ツケだ。{w=300}
夏休みの 最終日 だからな。`;

/** 「青のりは 別」 was his line; she asks only about the extra one. */
export const END_HOME = `@npc_mother
おかえり。{w=300}
で、おまけの 1つ。あげる 人、見つかった？
? うなずく | まだ
[うなずく]
@npc_mother
そう。{w=300}
じゃあ、冷めないうちに ね。
[まだ]
@npc_mother
そう？{w=300}
顔に 『いる』って 書いてあるけど。
[-]`;

/** One page (the ending keeps one line of talk per beat). */
export const END_TV = `@npc_tv
あすの 夕鳴町は、晴れ。ところにより
夕方が 残るでしょう。{w=400}となりの 星見台は、
引き続き 『夜』が 続いています。`;

export const END_TV_MOTHER = `@npc_mother
あら。{w=300}
星見台の 人たち、
洗濯物 乾かないわね。`;

/** Cut 2: グソっ君 at the counter, over the bag (★2026-09-29: the first fresh one's smell). */
export const END_MEAT_KN = `@npc_kanenari
……焼きたては、
こんな においなんか。`;

/**
 * Cut 6, the last line of chapter 1 (★2026-09-29 依頼主: 出来たての 焼きそばを
 * 食べて「めっちゃ美味いやんけ！」と言って終わる). The leftover began it; the
 * fresh one ends it.
 */
export const END_VOICE = `@npc_kanenari
{shake}めっちゃ美味いやんけ！{/shake}`;

// ---------------------------------------------------------------- 5.22 セーブ（ベンチ・お地蔵さんは UI の saveMenu を使う）

export const MOM_REST_SYS = `@sys
麦茶を 飲んだ。
HPが 回復した。`;
