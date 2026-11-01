// シークレットエンディング「40年ぶりの 休み」（05_postgame 10章。決定：案A）の台本。
//
// 60_ch3_story の書式（```msg```）で書いた物を、そのまま msg ブロックに。1ページ3行・1行 336px。
// ツガオは表の「みんなのオヤジ」の声（S30 と同じ。任侠の口調にしない）。
// グソっ君の生まれは、第3章で明かした範囲だけ（8月30日の晩、40年で 1日だけ休んだ、公園に置いた、
// 「冷めても うまいけえ」、「おっちゃんも、もう 休んで ええで」）。新しい事実は足さない。
//
// 流れ（10.2）：
//   0 入口（flag_pg_secret 1）：グソっ君が1回「……おっちゃんに、見せに 行こか。」
//   1 どの町でも、ツガオ便のツガオに話す → ページを見る →「ほんなら、わしも 1日 休むか。」（2）
//   2 暗転 → 次の日。1日を回る（夜明け前の星見台 → 朝の夕鳴町 → 昼の港 → 旧水族館の入口）
//   3〜6 夕方の公園の時計塔の下：寝ているツガオ →「……迎えに 来たで、おっちゃん。」→ 5時の
//        チャイム 8音 → 焼きそば「冷めても うまいけど、／……出来たてや。」→ タイムカードの『休』に
//        はなまる →「……よう 寝た。」→ 1枚絵
//   7 17:10、操作がもどる（3）。『おわり』の判は押さない

/** 0 入口が開いたあと、グソっ君の1回。 */
export const SEC_OPEN = `@npc_kanenari
……しゅん。{w=300}
やり残し、ぜんぶ はなまるや。
/
……おっちゃんに、
見せに 行こか。`;

/** 1 ツガオに話す（グソっ君が いっしょでないとき）。 */
export const SEC_TSUGAO_NO_KN = `@ツガオ:tsugao_omote
……ほう、ええ 帳面じゃな。
{w=300}グソっ君にも、
見せてやれ。`;

/** 1 ツガオに話す（グソっ君と）。 */
export const SEC_TSUGAO = `@ツガオ:tsugao_omote
おう、しゅん。{w=300}
……なんじゃ、その 帳面は。
@narr
しゅんは、みました帳の
『やり残し』の ページを ひらいた。
@ツガオ:tsugao_omote
…………{w=600}
はなまるで、いっぱいじゃな。
/
町も、村も、海も。{w=300}
……ぜんぶ、やりきったんか。
@npc_kanenari
おっちゃんは？{w=300}
……休み、とったこと あるん？
@ツガオ:tsugao_omote
40年で、1日だけじゃ。
{w=600}……8月30日の 晩。
/
……あれは、休みじゃ
なかったのう。
@npc_kanenari
……………………
@ツガオ:tsugao_omote
…………{w=600}
……ほんなら、わしも
1日 休むか。
/
今度は、自分で 選んだ 休みじゃ。
{w=300}……あしたの 仕事は、
ヒロスケに まかせる。
@npc_kanenari
ほな、わいらも 手伝うで。
{w=300}荷台、乗せてや。
@ツガオ:tsugao_omote
……おう。`;

// ---------------------------------------------------------------- 2 次の日、1日を回る

/** 夜明け前の星見台（マサルとキャベツ）。 */
export const SEC_DAY_HOSHI = `@narr
次の日。夜明け前の 星見台。
{w=300}ヒロスケの 運転で、
ツガオ便が 走りだした。
@npc_hoshi_gen
キャベツ 20玉。{w=300}
……ツガオさんは？
@npc_hirosuke
今日は、休み！{w=300}
……わはは、はじめてだよ！`;

/** 朝の夕鳴町（たかしに卸す）。 */
export const SEC_DAY_YUNARI = `@npc_maruyama
キャベツと、青のり。
{w=300}……ツガオは どうした。
@npc_kanenari
今日は、休みやねん。
@npc_maruyama
……そうか。{w=300}
そりゃ、ええ。`;

/** 昼の港（ナミエの店へ）。 */
export const SEC_DAY_UMI = `@npc_c3_shokudo
あら、今日は 若い 子らだけ？
{w=300}……カレイ 3箱ね。
@narr
港に、正午の チャイムが
鳴りひびいた。`;

/** 旧水族館の入口（エゴが『休』の欄を作る）。 */
export const SEC_DAY_AQ = `@エゴ:dakoku
キュウカ、デスネ。
{w=300}……『休』ノ 欄ヲ、
ツクリマシタ。
@narr
エゴは、ツガオの タイムカードに
新しい 欄を 1つ 書きたした。`;

// ---------------------------------------------------------------- 3〜6 夕方の公園

export const SEC_PARK_A = `@narr
夕方。夕鳴公園の 時計塔の 下。
/
ベンチで、だれかが
ナイトキャップを かぶって
寝ている。
@npc_kanenari
……おっちゃんや。
{w=300}ほんまに、寝とる。`;

/** 寝言。 */
export const SEC_PARK_NEGOTO = `@ツガオ:tsugao_omote
……ぐう。{w=600}
……まだ……{w=600}
……いや、ええんじゃ……。`;

/** 4 グソっ君が起こす（山場）。 */
export const SEC_PARK_MUKAE = `@npc_kanenari
……迎えに 来たで、おっちゃん。`;
export const SEC_PARK_OKIRU = `@ツガオ:tsugao_omote
……ん。{w=600}
……グソっ君か。`;

/** 5 チャイムのあと、焼きそば（S30「冷めても うまいけえ」への返事。小さく）。 */
export const SEC_PARK_YAKISOBA = `@narr
グソっ君が、焼きそばの
パックを さしだした。
@npc_kanenari
冷めても うまいけど、
{w=300}……出来たてや。
@ツガオ:tsugao_omote
…………{w=600}
……うまいのう。`;

/** 6 『休』の欄に はなまる。 */
export const SEC_PARK_HANKO = `@narr
しゅんは、ツガオの タイムカードの
『休』の 欄に、はなまるを 押した。`;
export const SEC_PARK_YOKU = `@ツガオ:tsugao_omote
……よう 寝た。`;

/** 1枚絵が まだ 無いときの 代わりの1ページ。 */
export const SEC_STILL_NARR = `@narr
夕方の 公園。{w=300}
ベンチの 上に、からの
焼きそばの パックが 1つ。`;

// ---------------------------------------------------------------- 見たあと（次に話したとき、1回ずつ）

export const SEC_AFTER_TSUGAO = `@ツガオ:tsugao_omote
おう、しゅん。{w=300}
休みは、ええもんじゃのう。
/
……また、とるわい。
{w=300}自分で 選んでな。`;

export const SEC_AFTER_KN = `@npc_kanenari
おっちゃん、あの 焼きそば、
ぜんぶ 食べたんやて。
{w=300}……冷めんうちに。`;

export function pgSecretTexts(): Record<string, string> {
  return {
    SEC_OPEN, SEC_TSUGAO_NO_KN, SEC_TSUGAO, SEC_DAY_HOSHI, SEC_DAY_YUNARI, SEC_DAY_UMI, SEC_DAY_AQ,
    SEC_PARK_A, SEC_PARK_NEGOTO, SEC_PARK_MUKAE, SEC_PARK_OKIRU, SEC_PARK_YAKISOBA, SEC_PARK_HANKO, SEC_PARK_YOKU,
    SEC_STILL_NARR, SEC_AFTER_TSUGAO, SEC_AFTER_KN,
  };
}
