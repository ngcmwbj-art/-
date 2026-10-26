// 寄り道の 長さの めやす（改善会議 2026-10-26 の 2）。寄り道が 始まった とき（audio/yorimichi.ts の
// YORIMICHI_START の flag が 0 から 立った とき）、画面の 上に「みじかい 寄り道」「ふつうの 寄り道」の 札を
// 2秒（ui/hud.ts、場所の 名前と 同じ 和紙テープ）。細かい 数字は 出さない。
//
// 長さは QA で 1つずつ 通して 測った 記録から 決めた（$SP/handoff/kaizenH_progress.md の 表）：
//   めやす ＝ 読む ページ × 3秒 ＋ 大写しの 遊びの 時間 ＋ 歩いて 行く 所 × 15秒。2分より 短い ＝ みじかい。
// 寄り道を 足したら、その 始まりの flag を 下の 表に 1行 足す（ない 物は 札を 出さない。
// __game.cmd.yoriLenCheck() の missing に 出る）。

export type YoriLen = 'short' | 'normal';

export const YORI_LEN_WORD: Record<YoriLen, string> = {
  short: 'みじかい 寄り道',
  normal: 'ふつうの 寄り道',
};

/** 寄り道の 始まりの flag → 長さ（コメントは 測った めやす）。 */
export const YORIMICHI_LEN: Record<string, YoriLen> = {
  flag_rt_start: 'normal', // retasu 寝とる うちに、とる（読む 約69ページ＋大写し 3回＋村から ネットの 戸・上の 畑：約4分）
  flag_hs_start: 'normal', // housou 終わりの 音は、下がる（読む 約66ページ＋大写し 2回＋入口から 1部屋：約4分）
};
