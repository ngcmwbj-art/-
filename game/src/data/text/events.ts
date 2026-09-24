// Event texts (10_narrative.md 5章). The msg-block format of 10_narrative 1.4
// (world/msg.ts): @speaker / text lines / `/` page / `? a | b` choice /
// [label] branches / !command. Staging lives in src/events; only the words
// live here, line for line as written in the design book.

// ---------------------------------------------------------------- 5.2 evt_opening

export const OPENING_CAPTION = ['8月31日。', '夏休み、最後の日。'];

export const OPENING_CALL = `@母の声:mother
ミナトー。{w=300}
ちょっと 降りてきてー。`;

export const OPENING_CALL2 = `@母の声:mother
ミナトー？{w=300} 寝てるのー？`;

export const GUIDE_MOVE = '移動：十字キー\n調べる・話す：Z';

// ---------------------------------------------------------------- 5.3 evt_errand

export const ERRAND_A = `@npc_mother
あ、起きた。{w=300}
おつかい 行ってきて。
/
肉のマルヤマで コロッケ 4つ。
ソースは 別。{w=300}別よ？
/
1つは おまけ。
だれかに あげなさい。
/
チャイムが 鳴るまでに 帰ること。
はい、がま口。`;

export const ERRAND_GET = `@sys
がま口を 受けとった！（500円）
/
おつかいメモを 受けとった！`;

export const ERRAND_B = `@npc_mother
肉屋は 銀座の 北がわ。
坂を 上って、右よ。`;

// ---------------------------------------------------------------- 5.4 evt_maruyama_first

export const MARUYAMA_FIRST_A = `@npc_maruyama
へい、らっしゃい！{w=300}
お、潮見さんとこの ボウズか。
/
コロッケ 4つ？{w=300}
悪いな、まだ 揚げてねえんだ。
/
揚げたては 五時の チャイムが
鳴り終わってから。
/
オレの 信念じゃない。{w=300}
油の 信念だ。`;

export const MARUYAMA_FIRST_B = `@npc_maruyama
金が 足りなきゃ ツケで いい。
それまで ひのやで 時間でも
つぶしてきな。`;

// ---------------------------------------------------------------- 5.5 evt_obaa_first

export const OBAA_FIRST = `@npc_obaa
おや、ミナト。{w=300}
自由研究は？
/
……白紙の 顔を してるね。
/
先生を 40年 やってるとね、
白紙は 顔で わかるのさ。`;

export const OBAA_FIRST_NOMEAT = `@npc_obaa
コロッケかい？{w=300}
マルヤマは 5時に ならないと
揚げないよ。まあ、見ておいき。`;

export const OBAA_FIRST_MEAT = `@npc_obaa
チャイムまで あと ちょっと。
好きなの 選びな。`;

// ---------------------------------------------------------------- 5.6 evt_chime_stop

export const CHIME_STOP = `@narr
……チャイムが、{w=300}
4つ目の 音で 止まった。`;

// ---------------------------------------------------------------- 5.7 evt_hato_block

export const HATO_A = `@npc_hato
クルッ。
@narr
ハトが 名刺を さしだしてきた。{w=300}
両手で。{w=600}……羽で。`;

export const HATO_B = `@ハト係長:hato
クルッ。{w=300}
夕鳴町 鳩課 係長で ございます。
/
17時を 過ぎましたので、
本日の 窓口は 終了……{w=600}
……の はずが、17時が 終わりません。
/
つきましては、本件、
ここは お通し できません。{w=300}
クルッ。`;

export const HATO_GET = `@sys
ハトの名刺を 手に入れた！`;

// ---------------------------------------------------------------- 5.8 evt_hanko_given

export const HANKO_A = `@npc_obaa
……見てたよ。{w=300}
ツッコミ、いい 間だったね。`;

export const HANKO_A_NOVISIT = `@npc_obaa
あんた、潮見さんとこの ミナトだね。
……見てたよ。{w=300}
ツッコミ、いい 間だったね。`;

export const HANKO_B = `@npc_obaa
ミナト。{w=300}
あれ、ただの ハトじゃ なかったろ。
? うなずく | 首を かしげる
[うなずく]
@npc_obaa
そうかい。{w=300}
あたしにも、そう 見えたよ。
[首を かしげる]
@npc_obaa
そうかい。{w=300}
あたしには、係長に 見えたよ。
[-]
@npc_obaa
この町じゃね、だれかに 見て
もらえた モノは、ちゃんと
そのモノの ままで いられるの。
/
見て もらえなく なった モノは、
自分が 何だったか 忘れちまう。
さっきの ハトみたいにね。
/
これを あずけとくよ。{w=300}
昔の 商売道具さ。`;

export const HANKO_GET = `@sys
ハンコケースを 受けとった！
/
{c=#E23B2E}みました{/c}と {c=#E23B2E}ペケ{/c}の ハンコが
入っている。`;

export const HANKO_C = `@npc_obaa
宿題はね、ぜんぶは
見て あげられなかった。{w=600}
/
だから 今、あんたが
見に 行っておいで。`;

/** The last two pages (also what she repeats while waiting at the storefront). */
export const HANKO_D = `@npc_obaa
ためしに、ほら。{w=300}
まめ吉の 『まいど』が、
さっきから 止まらない。
/
近くで 調べて、
『みました』を 押して ごらん。`;

export const GUIDE_FUSHIGI = 'ふしぎ の近くでは、\n左下のハンコがゆれる';

// ---------------------------------------------------------------- 5.9 evt_obaa_park_hint

export const PARK_HINT_A1 = `@npc_obaa
はい、よくできました。`;

export const PARK_HINT_A2 = `@npc_obaa
……さて。{w=300}
公園の ほうでね、鐘の 頭を した
のが、ひとりで 回ってるって さ。
/
路地の 工事は 『17時まで』
だったろ。{w=300}
行って、見て おいで。`;

export const PARK_HINT_B = `@npc_obaa
こら、ミナト。{w=600}
……まあ いい。押すのは
道々で いいさ。
/
公園の ほうでね、鐘の 頭を した
のが、ひとりで 回ってるって さ。
路地から 行けるよ。`;

// ---------------------------------------------------------------- 5.10 evt_alley_open

export const ALLEY_OPEN = '工事の コーンが いなくなっている。{w=300}\n『17時まで』だったから……らしい。';

// ---------------------------------------------------------------- 5.11 evt_kanenari_meet

export const KANENARI_MEET_1 = `@flip
夕鳴町へ ようこそ！`;
export const KANENARI_MEET_2 = `@flip
（引退しました）`;
export const KANENARI_MEET_3 = `@narr
カネナリくんは ミナトを
PRの 相手に 決めた！`;

// ---------------------------------------------------------------- 5.12 evt_kanenari_join

export const KANENARI_JOIN_FLIP = `@flip
PR大使、ふっかつします
（非公式）`;
export const KANENARI_JOIN_SYS = `@sys
カネナリくんが 仲間に なった！`;

// ---------------------------------------------------------------- 5.13 evt_maigo_broadcast

export const BROADCAST = `@npc_broadcast
ピンポンパンポーン。
/
迷子の お知らせです。
/
黄色い 通学帽の子、
青い 水筒の子、
片方だけの 上履きの子。
/
おうちの かたは、
ショッピングプラザ・ユウナリ
迷子センターまで、
/
おむかえに 来てください。`;

export const BROADCAST_LAST = `@防災無線:broadcast_child
{spd=0.5}……だれか。`;

export const BROADCAST_SHADOWS = `@narr
町じゅうの 影が、{w=300}
いっせいに 北東を 向いた。`;

export const BROADCAST_CHAIN = `@narr
どこかで、鎖の はずれる 音が した。`;

export const BROADCAST_FLIP = `@flip
モールです。
（影の むいてる ほう）`;

// ---------------------------------------------------------------- 5.14 evt_ojigi

export const OJIGI_A = `@おじぎ自販機:vending
アリガトウ ゴザイマシタ。{w=300}
アリガトウ ゴザイマシタ。
@narr
銀座から 消えた 自販機だ。{w=300}
コードを 引きずって、
ここまで 来たらしい。
@おじぎ自販機:vending
イラッシャイマセ。{w=600}
……ドナタモ、押シテ
クダサイマセン デシタ。`;

export const OJIGI_B = `@おじぎ自販機:vending
アリガトウ ゴザイマシタ！`;

export const OJIGI_AFTER = `@flip
ごあいさつを 覚えました。
（おじぎ仲間です）`;

// ---------------------------------------------------------------- 5.15 evt_mall_enter

export const MALL_ENTER = `@narr
ショッピングプラザ・ユウナリ。{w=300}
閉店して、ちょうど 1年。`;

export const MALL_ENTER_FLIP = `@flip
ここで 握手会を したことが
あります。（3人 来ました）`;

// ---------------------------------------------------------------- 5.17 evt_maigo_door

export const MAIGO_DOOR_LOCKED = `@narr
カギが かかっている。
/
貼り紙：『カギは フードコートの
忘れ物カウンターで
お預かり しています』`;
export const MAIGO_DOOR_LOCKED_FLIP = `@flip
（フードコートは 1Fです）`;
export const MAIGO_DOOR_USE = `@sys
迷子センターの カギを 使った。`;
export const MAIGO_DOOR_OPEN_FLIP = `@flip
（……ここ、知っている
気がします）`;
export const MAIGO_DOOR_REST_FLIP = `@flip
ベンチで ひと休み してから
行きましょう。`;
export const MAIGO_DOOR_OPENED = `@narr
迷子センターの 扉。{w=300}
カギは 開いている。`;

// ---------------------------------------------------------------- 5.18 evt_boss_intro

export const BOSS_A = `@narr
忘れ物の 山。{w=300}
傘、水筒、手袋、上履き……
/
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

export const BOSS_FLIP = `@flip
（……）`;

// ---------------------------------------------------------------- 5.20 evt_ending

export const END_MEAT_A = `@npc_maruyama
揚がった！{w=300}
油が、やっと 納得した。
/
コロッケ 4つ。ソースは 別。{w=300}
……わかってるよ。`;
export const END_MEAT_PAY = `@sys
320円 はらった。`;
export const END_MEAT_TSUKE = `@npc_maruyama
足りない 分は ツケだ。{w=300}
夏休みの 最終日 だからな。`;
export const END_MEAT_GET = `@sys
揚げたて コロッケを 受けとった！`;
export const END_MEAT_FLIP = `@flip
いい においが します。
（たぶん）`;

export const END_HOME_A = `@npc_mother
おかえり。{w=300}
ソースは？
? べつ | いっしょ
[べつ]
@npc_mother
えらい。
[いっしょ]
@npc_mother
……今日だけよ。
[-]`;

export const END_HOME_B = `@npc_mother
で、おまけの 1つ。{w=300}
あげる 人、見つかった？
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

export const END_TV = `@npc_tv
あすの 夕鳴町は、晴れ。{w=300}
ところにより 夕方が
残るでしょう。
/
なお、となりの 星見台では、
引き続き 『夜』が 続いています。`;

export const END_TV_MOTHER = `@npc_mother
あら。{w=300}
星見台の 人たち、
洗濯物 乾かないわね。`;

export const END_GIVE = `@narr
おまけの 1つを わたした。`;

export const END_VOICE = `@カネナリくん:kanenari_voice
{spd=0.4}……おいしい。`;

// ---------------------------------------------------------------- 5.22 セーブ（ベンチ・お地蔵さんは UI の saveMenu を使う）

export const MOM_REST_SYS = `@sys
麦茶を 飲んだ。
HPが 回復した。`;
