// 終わりの 音は、下がる（げむきか 10-26 の 案3、2026-10-26 依頼主の 採用。03_ch3_index）。第3章の クリア前、段階3（旧水族館の 中、12:00）。
// S15 の あと（flag_ch3_aq_enter）から S20 で ホールに 入るまで（flag_ch3_tsugao1 が 立ったら 戸は 閉まる）。
//
//   入口と券売所の 北の 壁の 小さな 戸『放送室』(5,1)：1回目 ジー と いう 音、2回目で 開く → 戸の 暗転で 放送室。
//   1 ジー（入って すぐ）  2 閉館の ご案内（テープ）  3 大写し「チャイム」その1（上り）
//   4 迷子の お知らせ（グソっ君の 館内放送）  5 大写し「チャイム」その2（下り）  6 ジー が 止まる（つまみ）  7 ごほうび
//
// 会議・指示に 合わせて 案から 直した 所：
//   ・音を 消して 遊ぶ 人でも 解けるように：チャイムの ボタンは 箱の 上で 高さの 順に 並んで いない。どの ボタンにも
//     下に「高さの 段」（1〜4 段）と 字（低い／高い）を 出し、押した 順は 右の 欄に 点で 並べる（上がる・下がるが 目で
//     分かる）。貼り紙の すみにも『上りは 低い → 高い』『下りは 高い → 低い』。
//   ・チャイムの 決まりは 言い切らない：貼り紙は「この 館の しかた」。調べた 所（防災無線の 放送の 文例では 前に
//     上り 4音、あとに 下り 4音。館内放送 一般の 決まりの 出典は 見つけていない）は $SP/handoff/housou_progress.md。
//   ・「ちがう 順」の あとの「貼り紙、もう 1回 見よ」は、大写しの 中から 貼り紙を 見に 行けないので、その 場で
//     貼り紙の すみの 字を 1行 出す 形に した。
//   ・ポコシャの 放送の 場所（えさの 部屋の 内線の マイク）は 台詞では 言わない（本筋の 台本は 変えない）。
//     この 部屋に ポコシャは 来ない、と いう 形だけ。
// 決まり：地の文・名札に「さん」なし。天丼の 口ぐせ（「本日も、休館です。」ほか）は 使わない。テープの 文に「いただき」は
// 使わない。閉館の 曲は 使わない（チャイムは ド・ミ・ソ・ドの 4音）。

// ================================================================ 入口の 戸と スピーカー

/** 戸（1回目）：札と、向こうの 音。 */
export const HS_TO_1 = `@narr
戸に 札。{w=300}
『放送室』。
/
戸の 向こうから、{w=300}
ジー と いう 音。`;

/** 戸（2回目）：開く。 */
export const HS_TO_OPEN = `@narr
ノブを 回すと、{w=300}
……開いた。`;

/** S20 から 先・クリア後。 */
export const HS_TO_SHIZUKA = `@narr
戸に 札『放送室』。{w=300}
戸の 向こうは、
しずかだ。`;

/** 入口の 天井の スピーカー（今の 文の あと、戸を まだ 開けていない とき 1回）。 */
export const HS_SPEAKER_KN = `@npc_kanenari
……この 音、{w=300}
どこから
来とるんや。`;

/** すんだ あとの スピーカー（今の 文に 替わる）。 */
export const HS_SPEAKER_DONE = `@narr
館内放送の スピーカー。{w=300}
……しずかだ。`;

// ================================================================ 1 ジー

export const HS_IN = `@narr
机の 上で、{w=300}
赤い ランプが
ついたまま。
@npc_kanenari
……10年、{w=300}
つけっぱなし
なんか。
@narr
貼り紙。{w=300}
『館内 放送の しかた』。
/
『はじめに 上り、{w=300}
おわりに 下り。
チャイムを 鳴らす こと』`;

/** 貼り紙（調べる）：すみの 絵の 字まで。 */
export const HS_HARIGAMI = `@narr
『館内 放送の しかた』。{w=300}
『はじめに 上り、
おわりに 下り』。
/
すみに、点の 絵。{w=300}
『上りは 低い → 高い』
『下りは 高い → 低い』`;

// ================================================================ 2 閉館の ご案内

export const HS_TAPE_A = `@narr
テープが 1本、{w=300}
機械に 入ったまま。
背に『閉館の ご案内』。
/
机に、手書きの 台本。{w=300}
すみに、名前。
『ハキコ』。
@npc_kanenari
館の 前を {w=300}
掃いとる 人や。`;

export const HS_TAPE_PLAY = `@narr
しゅんは、{w=300}
再生の ボタンを
押した。`;

/** 10年前の テープの 声（館じゅうの スピーカーから）。 */
export const HS_TAPE_VOICE = `@ハキコ（テープ）:c3_uketsuke_tape
……本日を もちまして、{w=300}
閉館 いたします。
/
長い あいだ、{w=300}
ありがとう
ございました。`;

export const HS_TAPE_B = `@narr
カチッ。{w=300}
……テープが、
止まった。
/
ジー と いう 音だけが、{w=300}
残っている。
@npc_kanenari
……チャイム、{w=300}
鳴っとらんな。`;

export const HS_TAPE_AGAIN = `@narr
『閉館の ご案内』。{w=300}
テープは、
止まったまま。`;

/** テープの 棚の 背の 字（1回に 1本ずつ。流せるのは 機械の『閉館の ご案内』だけ）。 */
export const HS_TANA = [
  `@narr
テープの 背に、{w=300}
『開館の ご案内』。`,
  `@narr
テープの 背に、{w=300}
『えさの 時間』。`,
  `@narr
テープの 背に、{w=300}
『迷子の お知らせ』。`,
];
export const HS_TANA_ALL = `@narr
テープの 棚。{w=300}
1本 ぶん、
すき間が ある。`;

// ================================================================ 3〜5 チャイム

/** テープを 流す 前の チャイムの 箱。 */
export const HS_CHIME_MAE = `@narr
チャイムの 箱。{w=300}
4つの ボタンが
並んでいる。`;

export const HS_CHIME_A = `@npc_kanenari
せっかくやし、{w=300}
わいも 放送
したろ。
/
はじめは、{w=300}
上りの チャイム
やな。`;

/** 大写しの やり方（1回）：段の 数が 音の 高さ。 */
export const HS_RULE = `@narr
ボタンの 下に、{w=300}
高さの 段。
段が 多いほど、高い 音。`;

export const HS_UP_OK = `@narr
ピン、ポン、パン、ポーン。
@npc_kanenari
……ええ 音や。{w=300}
はじまる 感じ
するな。`;

export const HS_UP_NG = `@narr
ポン、ピン、……ポーン？
@npc_kanenari
……ちゃう。{w=300}
貼り紙、もう 1回
思い出そ。
@narr
『上りは {w=300}
低い → 高い』。`;

/** 4 グソっ君の 館内放送（前半）。 */
export const HS_MAIGO_1 = `@グソっ君:gusokkun_pa
迷子の お知らせ {w=300}
やで。
/
青い よろいの、{w=300}
足 14本の、
はさみの ある……`;

/** 4 の あいだに チャイムを 押した（1回。押した 音は 鳴らない）。 */
export const HS_OSUNA = `@npc_kanenari
押すな！{w=300}
……まだ しゃべっとる
とちゅうや！`;

/** 4 グソっ君の 館内放送（後半）。 */
export const HS_MAIGO_2 = `@グソっ君:gusokkun_pa
…………{w=300}
わいや。
/
……ちゃうちゃう。{w=300}
迷子は、もう
見つかっとるわ。
/
しゅんくんの {w=300}
おともだち は、
ここに おります。`;

export const HS_DOWN_A = `@npc_kanenari
終わりは、{w=300}
下がる ほう やな。`;

export const HS_DOWN_OK = `@narr
ピン、ポン、パン、{w=300}
ポーン……
@npc_kanenari
……終わった。{w=300}
ちゃんと、
終わった 感じ する。`;

/** 終わりで 上りを 押した。 */
export const HS_DOWN_UP = `@npc_kanenari
……あかん。{w=300}
まだ 何か 言いそうな
音や。`;

export const HS_DOWN_NG = `@npc_kanenari
……ちゃう。{w=300}
もう 1回 や。
@narr
『下りは {w=300}
高い → 低い』。`;

/** 鳴らした あとの チャイムの 箱。 */
export const HS_CHIME_SUMI = `@narr
チャイムの 箱。{w=300}
上りも、下りも、
もう 鳴らした。`;
export const HS_CHIME_OFF = `@narr
チャイムの 箱。{w=300}
電源は、
切れている。`;

// ================================================================ 6 ジー が 止まる

export const HS_TSUMAMI_MAE = `@narr
つまみが 並んでいる。{w=300}
緑の 目もりが、
かすかに ゆれる。`;

/** 下りを 鳴らす 前に つまみ（グソっ君がいる とき）。 */
export const HS_TSUMAMI_KN = `@npc_kanenari
……切るんは、{w=300}
チャイムが
すんでから や。`;

export const HS_OFF = `@narr
しゅんは、{w=300}
いちばん 大きい
つまみを 回した。
/
赤い ランプが、{w=300}
消えた。
/
……ジー が、{w=300}
止まった。
/
台本の すみに、{w=300}
ハキコの 字。
/
『終わりの チャイムまでが、{w=300}
放送です。』`;

export const HS_OFF_KN = `@npc_kanenari
……10年、{w=300}
館の 前を
掃いとったんは、
/
……ちゃう ちゃう、{w=300}
わいが 言う ことや
ないな。`;

/** かくし：屋上の 手すりから ハキコを 見ている（flag_oj_talk）。 */
export const HS_OKUJOU_KN = `@npc_kanenari
……屋上から 見えた {w=300}
ほうきの 人の
字や。`;

export const HS_REWARD = `@sys
朱肉が 2 ふえた。
/
みました帳③の すみに、
『終わりの 音は、下がる』の
ページ。`;

export const HS_TSUMAMI_OFF = `@narr
つまみ。{w=300}
赤い ランプは、
消えている。`;

// ================================================================ 部屋の 物

export const HS_MIC = `@narr
古い マイク。{w=300}
台の スイッチに、
『放送中』の 札。`;
export const HS_ISU = `@narr
たたんだ パイプいす。{w=300}
壁に、
立てかけてある。`;

// ================================================================ S18・S25

/** S18 の 館内放送（済ませた あと、放送の あとに 1回）。 */
export const HS_S18_KN = `@npc_kanenari
……下がったな。`;

/** S25 の 回廊で、来た 人の 中の ハキコ（済ませた あと。吹き出し、／で 2つ）。 */
export const HS_S25_HAKIKO = '……チャイム、／下がって おりましたね。';

// ================================================================ 大写し・帳面

export const HS_HOWTO = { id: 'housou', line: '{←→}で えらび、{Z}で 押す', pic: 'lr' as const };

export const HS_UI = {
  title: 'チャイム',
  up: '上り',
  down: '下り',
  upHint: '低い → 高い',
  downHint: '高い → 低い',
  low: '低い',
  high: '高い',
  keys: '←→ えらぶ けってい 押す',
  mic: '放送中',
};

export const HS_BOOK = {
  title: '終わりの 音は、下がる',
  titleLines: ['終わりの 音は、', '下がる'],
  chime: (n: number) => `チャイム ${n}/2`,
  tape: (n: number) => `読んだ テープ ${n}/4`,
  quote: ['終わりの チャイム', 'までが、', '放送です。'],
};

export const HS_TEXTS: Record<string, unknown> = {
  HS_TO_1, HS_TO_OPEN, HS_TO_SHIZUKA, HS_SPEAKER_KN, HS_SPEAKER_DONE, HS_IN, HS_HARIGAMI, HS_TAPE_A, HS_TAPE_PLAY,
  HS_TAPE_VOICE, HS_TAPE_B, HS_TAPE_AGAIN, HS_TANA, HS_TANA_ALL, HS_CHIME_MAE, HS_CHIME_A, HS_RULE, HS_UP_OK, HS_UP_NG,
  HS_MAIGO_1, HS_OSUNA, HS_MAIGO_2, HS_DOWN_A, HS_DOWN_OK, HS_DOWN_UP, HS_DOWN_NG, HS_CHIME_SUMI, HS_CHIME_OFF,
  HS_TSUMAMI_MAE, HS_TSUMAMI_KN, HS_OFF, HS_OFF_KN, HS_OKUJOU_KN, HS_REWARD, HS_TSUMAMI_OFF, HS_MIC, HS_ISU, HS_S18_KN,
  S25: `@npc_c3_uketsuke\n${HS_S25_HAKIKO.split('／').join('\n')}`,
};
