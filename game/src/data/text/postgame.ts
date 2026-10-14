// クリア後（05_postgame）の文：グソっ君の合流・別れ（7章）、ツガオ便（8章）、待つ・寝る（3.4）。
// 1ページ3行・1行 336px。名札・地の文に「さん」をつけない。止まった時間の話はしない（6.1）。
// グソっ君の生まれ（真相）にはふれない。

// ================================================================ 7 グソっ君の合流

/** 7.2 焼きそばのたかしの前（〔pg_1〕）：今の〔c4〕に「いっしょに 行く」を足した形。 */
export const PG_KN_ASK = `@npc_kanenari
おう、しゅん。
出来たて、食べてくか？
? 食べる | いっしょに 行く | また あとで`;

/** 夜は店の中（仕込みのあと片づけ）。 */
export const PG_KN_ASK_NIGHT = `@npc_kanenari
おう、しゅん。{w=300}
今、片づけ しとる とこや。
? 食べる | いっしょに 行く | また あとで`;

/** 「いっしょに 行く」（はじめての1回）。 */
export const PG_KN_JOIN_FIRST = `@npc_kanenari
……ええで。{w=300}
たかし！ ちょっと 出てくる！
@npc_maruyama
おう。{w=300}仕込みは、
わしが やっとく。
/
……腹が へったら、
2人で もどって こい。
@npc_kanenari
しゅん、みました帳 見せてみ。
{w=300}……あー。{w=300}
やり残し、けっこう あるやんけ。
/
夕方の 町、夜の 村、
昼の 海。{w=300}……時間が 合わな
できへん もんも あるで。
/
ツガオ便なら、どこでも
乗せてくれる。{w=300}乗っとる
間に、時間は たつけどな。`;

/** 2回目から（合流していないとき）。 */
export const PG_KN_JOIN = `@npc_kanenari
ほな、行こか。
……どこ 行く？`;

export const PG_KN_LATER = `@npc_kanenari
ほな、また あとで な。`;

/** 7.3 店にもどす（たかしの前で、隊列のグソっ君に話す）。 */
export const PG_KN_BACK_ASK = `@npc_kanenari
? 店に もどる？ | まだ いっしょ`;
export const PG_KN_BACK = `@npc_kanenari
ほな、焼いて 待っとるわ。
{w=300}……やり残し、
がんばりや。`;
export const PG_KN_STAY = `@npc_kanenari
よっしゃ。{w=300}
ほな、次 行こか。`;

/** ほかの町の休める所で「先に 帰す」（仮）。 */
export const PG_KN_SEND = `@npc_kanenari
ほな、ツガオ便で
先に 帰っとくわ。{w=300}
……店で 焼いて 待っとる。`;

// ================================================================ 8 ツガオ便

export const PG_TOWN_NAME: Record<string, string> = { yunari: '夕鳴町', hoshi: '星見台', umi: '海ぞいの 町' };

/** 8.3 乗るとき（行き先は、今いる町をのぞいた2つ）。 */
export function pgTruckAsk(a: string, b: string): string {
  return `@ツガオ:tsugao_omote
乗ってくか？{w=300}
どこへ 行く？
? ${a} | ${b} | やめておく`;
}

/** 選んだあと（かかる時間：8.2）。 */
export function pgTruckGo(dest: string, dur: string): string {
  return `@ツガオ:tsugao_omote
${dest}じゃな。{w=300}
着くのは、ひと眠り……
いや、${dur} あとじゃ。`;
}

/** 夕方の夕鳴町（昼寝を起こす。はじめての1回）。 */
export const PG_TRUCK_NAP = `@ツガオ:tsugao_omote
……ぐう。{w=600}
……ん。{w=300}もう 夕方か。
/
昼寝は、ええぞ。
{w=300}……40年、知らんかった。`;

/** 2回目からの夕方の夕鳴町（昼寝から起きる）。 */
export const PG_TRUCK_NAP_AGAIN = `@ツガオ:tsugao_omote
……ぐう。{w=600}
……ん。{w=300}おう、しゅん。`;

/** 夜の星見台に着いたとき（はじめての1回。ペロが灯りを貸す。仮）。 */
export const PG_PERO_LAMP = `@npc_hoshi_mitsu
おや、しゅんくん。
{w=300}……夜の 見回りだ。
/
暗いだろう。{w=300}
この 灯りを 持って いきな。
……ほどよく 休めよ。`;
export const PG_PERO_LAMP_KN = `@npc_kanenari
これや これ。
夜の 村は、これが ないと。`;

// ================================================================ 2.2 野菜を 一緒に 家に 運ぼう（クリア後の誘い）

/** 夜の転回場で、起きているツガオ（表の顔）が頼む（第2章の〔誘い〕の代わり）。 */
export const PG_DELI_INVITE = `@ツガオ:tsugao_omote
おう、しゅん。{w=300}
今夜も、村の 配達じゃ。
/
5軒 ぶん。{w=300}その 灯りで、
手伝って くれるか？
? 手伝う | またこんど`;
/** 配達の 途中に ツガオ便に 乗ろうと したとき。 */
export const PG_TRUCK_DELI_FIRST = `@ツガオ:tsugao_omote
配達が 先じゃ。{w=300}
5軒 回ったら、乗せちゃる。`;
export const PG_DELI_LATER = `@ツガオ:tsugao_omote
ほうか。{w=300}
ほんなら、また 今度じゃな。`;

// ================================================================ 3.4 待つ・寝る

/** 休める所（セーブの所・ベンチ）で、クリア後だけ先に出す。 */
export const PG_REST_ASK = `@narr
ここで、ひと休み できそうだ。
? セーブ | 待つ | やめておく`;
export const PG_REST_ASK_KN = `@narr
ここで、ひと休み できそうだ。
? セーブ | 待つ | グソっ君を 先に 帰す | やめておく`;
/** セーブの所でない休める所（公園のベンチ）。 */
export const PG_REST_ASK_BENCH = `@narr
ここで、ひと休み できそうだ。
? 待つ | やめておく`;

/** 配達の 途中（待たない）。 */
export const PG_WAIT_DELI = `@narr
今は、配達の 途中だ。`;
export const PG_WAIT_ASK = `@narr
いつまで 待つ？
? 朝まで | 昼まで | 夕方まで | 夜まで | やめておく`;

/** 家の2階のふとん。 */
export const PG_BED_ASK = `@narr
ふとん。{w=300}
……ひと眠り する？
? 寝る | やめておく`;
export const PG_BED_SLEEP = `@narr
ぐう……。`;
export const PG_BED_HEAL = `@sys
HP と 朱肉が ぜんぶ 回復した！`;

/** 母の朝の1ページ（起きたとき。日で入れかわる）。 */
export const PG_MOM_MORNING: string[] = [
  `@npc_mother
しゅん！ 朝よー！{w=300}
……顔、洗って きなさい。`,
  `@npc_mother
しゅん、起きたー？{w=300}
お味噌汁、冷めるわよー。`,
  `@npc_mother
おはよう。{w=300}
今日は、どこ 行くの？
……夕方には 帰って きなさいね。`,
];

// ================================================================ QA

export function pgTexts(): Record<string, unknown> {
  const ask = pgTruckAsk('星見台', '海ぞいの 町');
  const go = [
    pgTruckGo('夕鳴町', '1時間'),
    pgTruckGo('海ぞいの 町', '1時間'),
    pgTruckGo('星見台', '1時間半'),
    pgTruckGo('海ぞいの 町', '2時間半'),
  ];
  return {
    PG_KN_ASK, PG_KN_ASK_NIGHT, PG_KN_JOIN_FIRST, PG_KN_JOIN, PG_KN_LATER, PG_KN_BACK_ASK, PG_KN_BACK, PG_KN_STAY, PG_KN_SEND,
    ask, go, PG_DELI_INVITE, PG_DELI_LATER, PG_TRUCK_DELI_FIRST, PG_TRUCK_NAP, PG_TRUCK_NAP_AGAIN, PG_PERO_LAMP, PG_PERO_LAMP_KN,
    PG_REST_ASK, PG_REST_ASK_KN, PG_REST_ASK_BENCH, PG_WAIT_ASK, PG_WAIT_DELI, PG_BED_ASK, PG_BED_SLEEP, PG_BED_HEAL, PG_MOM_MORNING,
  };
}
