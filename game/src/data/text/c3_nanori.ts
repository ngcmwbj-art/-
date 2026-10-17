// 灯台の 名のり（げむきか 10/15 の 案3、2026-10-15 依頼主の 採用。05_postgame 2.3・3.5、03_ch3_index）。
// 第3章の クリア後の 夜（19:00〜4:59）、海ぞいの 町の 防波堤の 石の ベンチ (42,31)。サイレンを 引退した ミナトは、
// 毎晩 テルの 灯台の 光を ストップウォッチで はかって「ずれとる」。テルは「ずれとらん」。しゅんが 予備の
// ストップウォッチで 夜の 海の 光を はかると、ずれて いたのは 灯台ではなく ミナトの 指だった。
// さいごに ミナトは 数えながら 眠り、しゅんは ストップウォッチを 止めずに おく。
//
//   1 ずれとる（夜、ベンチの ミナト）flag_nn_zure → 2 ずれとらん（灯室の テル）flag_nn_teru
//   → 3 予備の ストップウォッチ（ミナト）item_nn_stopwatch → 4 大写し「夜の 海」：光5つ
//   → 5 ずれて いたのは（テルの 灯台を 3回）→ 6 止めない 時計（名場面）flag_nn_done
//   → 7 朱肉 +2、みました帳③の すみ『名のり帳』、次の 夜から ミナトの 台詞、朝の テル（1回）。
//
// リードの 決めた こと：テルの「40年ぶりに」は「ひさしぶりに」（シークレットエンディングと 重ねない）。
// 漁船は「夜の 漁の 船」に ぼかす。灯台・ブイの 光り方は 町の 作りもの（実在の 灯台名は 出さない）。
// グソっ君と 合流中なら グソっ君の 台詞が 出る（いなくても 進む：events/ch3/nanori.ts が 抜く）。
// 名前は {name:npc_c3_*}（c3_names.ts）。地の文・名札の 名前に「さん」なし。1ページ 3行 × 336px。

import { pgDay, pgMin } from '../../world/postgame';

const MINATO = '{name:npc_c3_sirenban}';
const TERU = '{name:npc_c3_toudai}';

// ================================================================ 1 ずれとる

export const NN_ZURE = `@narr
${MINATO}が、ベンチで
ストップウォッチを
にぎっている。
/
灯台の 赤い 光が、{w=300}
ぱっ、と 光って、消える。
@npc_c3_sirenban
……4秒 2。{w=300}
ずれとる。
/
${TERU}の 灯台は、{w=300}
4秒に 1回じゃ。{w=300}
……2つ、おそい。
@npc_kanenari
0.2秒やろ？{w=300}
細かいなあ。
@npc_c3_sirenban
正午は、{w=300}
1秒も ずらさんかった。`;

/** かくし：潜りで めがねを 返した 人（flag_ch3_megane_back）。1 のあと。 */
export const NN_MEGANE = `@npc_c3_sirenban
……めがねが あると、{w=300}
光が よう 見える。{w=300}
見えすぎて、ずれも 見える。`;

/** 1 のあと、テルに 会う 前。 */
export const NN_ZURE_AGAIN = `@npc_c3_sirenban
……4秒 2。{w=300}
${TERU}に 言うても、
ずれとらん 言うじゃろう。`;

// ================================================================ 2 ずれとらん（灯室の テル）

export const NN_TERU = `@npc_c3_toudai
あら、いらっしゃい。{w=300}
……あの 人、また
ずれとる 言うとる？
/
レンズは、毎晩 みがいとる。{w=300}
ずれとらんよ。
/
灯台はね、{w=300}
光り方で、名前を
名のるの。
/
船は、それで、{w=300}
どの 灯台か わかって、{w=300}
帰って こられるのよ。
@npc_kanenari
名前を、{w=300}
光で 言うんか。
@npc_c3_toudai
ずれたら、{w=300}
ほかの 灯台に
なって しまうけえ。`;

/** 2 のあと、もう一度 テル（はかり終わる 前）。 */
export const NN_TERU_AGAIN = `@npc_c3_toudai
赤で、4秒に 1回。{w=300}
……それが、うちの
灯台の 名前よ。`;

/** 夕方の テル（はかり 始めて、終わる 前）。 */
export const NN_TERU_YU = `@npc_c3_toudai
点けるのは、{w=300}
日が しずんで から。`;

// ================================================================ 3 予備の ストップウォッチ

export const NN_YOBI = `@npc_c3_sirenban
……ほんなら、{w=300}
坊主が はかれ。
/
予備じゃ。{w=300}
わしの より、新しい。`;

export const NN_GET = `@sys
『予備の ストップウォッチ』を
あずかった。`;

export const NN_YOBI_2 = `@npc_c3_sirenban
光った とき 押す。{w=300}
次に 光った とき、
もう 1回 押す。`;

/** はかる 前の たずね（ベンチの ミナト）。 */
export const NN_ASK = `@npc_c3_sirenban
……はかるか。
? はかる | やめておく`;

// ================================================================ 4 大写し「夜の 海」

export const NN_RULE = `@npc_c3_sirenban
←→ で、光を 選べ。{w=300}
けってい で、押す。{w=300}
1つの 光を、3回。
/
もどる で、やめじゃ。`;

/** 名のりが 書けた ときの グソっ君（光ごとに 1回）。 */
export const NN_KN: Record<string, string> = {
  teru: `@npc_kanenari
赤で、4秒。{w=300}
……${TERU}の 名前や。`,
  oki: `@npc_kanenari
ぱぱっ……{w=300}
……………{w=300}
名前、2文字なんか？`,
  buoy: `@npc_kanenari
せっかちな 名前やな。`,
};

/** 名のらない 光（はかれない）を 選んで けってい。 */
export const NN_NONAME: Record<string, string> = {
  gyosen: `@npc_kanenari
この 子は、{w=300}
名のらへん。{w=300}
……はたらいとる 最中や。
@npc_c3_sirenban
……夜の 漁の 船じゃ。{w=300}
朝には、港へ もどる。`,
  hoshi: `@npc_kanenari
星は、{w=300}
名のらんでも
みんな 知っとるな。`,
};

/** グソっ君の いない ときの 名のらない 光。 */
export const NN_NONAME_SOLO: Record<string, string> = {
  gyosen: `@narr
白い 灯りが、
光りつづけて いる。
@npc_c3_sirenban
……夜の 漁の 船じゃ。{w=300}
朝には、港へ もどる。`,
  hoshi: `@narr
星が、またたいて いる。{w=300}
……はかれない。`,
};

/** はかった 数が ずれすぎて いた（数えない）。 */
export const NN_MISS = `@npc_kanenari
……今のは、{w=300}
しゅんの 指が
ずれとったで。`;

export const NN_MISS_SOLO = `@narr
……今のは、
押すのが ずれた。`;

/** 名のり帳に 書いた（3回 はかった 光）。 */
export const NN_WRITE = `@narr
名のり帳に 書いた。`;

// ================================================================ 5 ずれて いたのは

/** a・b・c：しゅんの はかった 3つ（『4秒 0』の 形）。 */
export function nnKazu(a: string, b: string, c: string): string {
  return `@narr
しゅんの はかった 数。{w=300}
『${a}』『${b}』
『${c}』。
@npc_c3_sirenban
……………
/
わしの 指が、{w=300}
おそいんじゃ。
@npc_kanenari
……0.2秒、{w=300}
眠かったんちゃう？
@npc_c3_sirenban
……40年、{w=300}
1秒も ずらさんかった
指じゃが のう。`;
}

// ================================================================ 6 止めない 時計（名場面）

export const NN_TERU_DOWN = `@narr
灯台の 戸が 開いて、{w=300}
${TERU}が 下りて きた。`;

export const NN_TOMENAI = `@npc_c3_toudai
あんたの 指は、{w=300}
40年、はたらいたんよ。
/
……数えんでも、{w=300}
ちゃんと 回っとるよ。
@narr
${MINATO}は、ストップウォッチを
にぎったまま、{w=300}
目を つむった。
/
数字が、{w=300}
ずっと 進んでいる。
? 止める | 止めない`;

export const NN_TOMERU_KN = `@npc_kanenari
……ええやん。{w=300}
進めといたろ。`;

export const NN_TOMENAI_2 = `@narr
……止めないで おいた。
/
${TERU}が、レンズを みがく
布を、${MINATO}の
ひざに かけた。
@npc_c3_toudai
今夜は、わたしが
数えとくけえ。{w=300}
……すぐ 眠く なるけど。
@narr
灯台が、{w=300}
赤く、名前を 言った。`;

/** かくし：サイレン塔の「正午は、1秒も ずらさん。」を 聞いた 人（S12。本筋なので クリア後は みんな）。 */
export const NN_SIREN_KN = `@npc_kanenari
1秒も ずらさん 人が、{w=300}
ずれたまま 寝とる。{w=300}
……ええ 夜やな。`;

export const NN_REWARD = `@sys
朱肉が 2 ふえた。
/
みました帳③の すみに、
『名のり帳』の ページ。`;

// ================================================================ 7 そのあと

/** その 夜（名場面の 夜）の ベンチ：寝ている。 */
export const NN_NERU = `@narr
${MINATO}は、ベンチで
寝息を たてている。{w=300}
ストップウォッチの 数字が、進む。`;

/** 次の 夜から。 */
export const NN_AFTER = `@npc_c3_sirenban
……4秒 0。{w=300}
ええ 名のりじゃ。`;

/** 次の 朝の テル（1回）。 */
export const NN_TERU_ASA = `@npc_c3_toudai
あの 人、ベンチで
朝まで 寝とったのよ。{w=300}
……ひさしぶりに。`;

// ================================================================ かくし：夜光虫（港の 階段、グソっ君と）

export const NN_YAKOU_ASK = `@npc_kanenari
……夜の 海、さわって
みてええ？
? さわって みる | やめておく`;

export const NN_YAKOU = `@narr
グソっ君が、水に 手を
入れた。{w=300}
……海が、青く 光った。
@npc_kanenari
……海の 中の
名のらへん 光や。{w=300}
さわると、返事 しよる。`;

export const NN_YAKOU_AGAIN = `@narr
水を ゆらすと、
青い 光が ちらちら する。`;

// ================================================================ 大写しの 字

export const NN_UI = {
  place: '夜の 海',
  keys: ['←→ 光を 選ぶ', 'けってい 押す'],
  sec: '秒',
  /** 光の 名前（仮。町の 作りもの）。 */
  names: {
    teru: `${TERU}の 灯台`,
    oki: '沖の 島の 灯台',
    buoy: '港の 口の ブイ',
    gyosen: '夜の 漁の 船',
    hoshi: '星',
  } as Record<string, string>,
  nanoranai: '名のらない',
};

/** みました帳③の すみ『名のり帳』。 */
export const NN_BOOK = {
  title: '名のり帳',
  minato: '4秒 0。ずれとらん',
  hanamaru: 'ぴったり',
};

export const NN_ITEM_DESC: [string, string] = ['予備の ストップウォッチ。', '止めずに おいた。'];
export const NN_ITEM_DESC_BEFORE: [string, string] = ['ミナトの 予備。', '光った とき 押す。'];

export const NN_TEXTS: Record<string, unknown> = {
  NN_ZURE, NN_MEGANE, NN_ZURE_AGAIN, NN_TERU, NN_TERU_AGAIN, NN_TERU_YU, NN_YOBI, NN_GET, NN_YOBI_2, NN_ASK, NN_RULE,
  NN_KN, NN_NONAME, NN_NONAME_SOLO, NN_MISS, NN_MISS_SOLO, NN_WRITE, kazu: nnKazu('4秒 0', '4秒 0', '4秒 0'), NN_TERU_DOWN,
  NN_TOMENAI, NN_TOMERU_KN, NN_TOMENAI_2, NN_SIREN_KN, NN_REWARD, NN_NERU, NN_AFTER, NN_TERU_ASA, NN_YAKOU_ASK,
  NN_YAKOU, NN_YAKOU_AGAIN,
};

// ================================================================ 光の 表（大写しと みました帳）

/** 光の 表：周期（ms）、光っている 間、はかれるか、許す ずれ（秒）。 */
export interface Light {
  id: string;
  /** 大写しの 中の 位置（窓の 中の px）。 */
  x: number;
  y: number;
  color: string;
  /** 周期（ms）と、光る 時（周期の 中の [始め, 終わり] ms）。null：光りつづける・またたく。 */
  period: number | null;
  on: [number, number][];
  tol: number;
  phase: number;
}

export const LIGHTS: Light[] = [
  { id: 'teru', x: 26, y: 40, color: '#FF5A4A', period: 4000, on: [[0, 450]], tol: 0.5, phase: 700 },
  { id: 'oki', x: 140, y: 52, color: '#F4F0E0', period: 6000, on: [[0, 280], [700, 980]], tol: 0.6, phase: 2300 },
  { id: 'buoy', x: 92, y: 78, color: '#5AE08A', period: 1000, on: [[0, 220]], tol: 0.3, phase: 150 },
  { id: 'gyosen', x: 182, y: 56, color: '#FFF4C8', period: null, on: [], tol: 0, phase: 0 },
  { id: 'hoshi', x: 112, y: 14, color: '#E8ECFF', period: null, on: [], tol: 0, phase: 0 },
];

/** 今の 夜の 番号（夜は 0:00 で 日が かわるので、0:00〜4:59 は 前の 日の 夜）。 */
export function nnNightId(): number {
  return pgMin() >= 19 * 60 ? pgDay() : pgDay() - 1;
}

/** 0.1秒 単位の 値 → 『4秒 0』の 形。 */
export function fmtSec(tenths: number): string {
  return `${Math.floor(tenths / 10)}${NN_UI.sec} ${tenths % 10}`;
}
