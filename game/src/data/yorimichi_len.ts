// 寄り道の 長さの めやす（改善会議 2026-10-26 の 2）。寄り道が 始まった とき（audio/yorimichi.ts の
// YORIMICHI_START の flag が 0 から 立った とき）、画面の 上に「みじかい 寄り道」「ふつうの 寄り道」の 札を
// 2秒（ui/hud.ts、場所の 名前と 同じ 和紙テープ）。細かい 数字は 出さない。
//
// 長さは QA で 1つずつ 通して 測った 記録から 決めた（$SP/handoff/kaizenH_progress.md の 表）：
//   めやす ＝ 読む ページ × 3秒 ＋ 大写しの 遊びの 時間 ＋ 歩いて 行く 所 × 15秒。3分より 短い ＝ みじかい（2026-10-27 依頼主「境目を３分に」。前は 2分）。
// 寄り道を 足したら、その 始まりの flag を 下の 表に 1行 足す（ない 物は 札を 出さない。
// __game.cmd.yoriLenCheck() の missing に 出る）。

export type YoriLen = 'short' | 'normal';

export const YORI_LEN_WORD: Record<YoriLen, string> = {
  short: 'みじかい 寄り道',
  normal: 'ふつうの 寄り道',
};

/** 寄り道の 始まりの flag → 長さ（コメントは 測った めやす）。 */
export const YORIMICHI_LEN: Record<string, YoriLen> = {
  // ---- 第2章
  flag_an_start: 'normal', // akinasu 読む 35＋大写し 3回・歩く 7か所：約3分半
  flag_as_start: 'normal', // asairo 読む 62＋大写し 4回・8か所：約5分
  flag_ashiato_start: 'normal', // ashiato 読む 49＋うり坊・9か所：約5分
  flag_bm_start: 'short', // busmaku 読む 34＋幕・2か所：約2分
  flag_hg_start: 'normal', // hagama 読む 64＋大写し 2回・4か所：約4分半
  flag_ky_start: 'normal', // kyuri 読む 91＋葉の かげ・3か所：約5分半
  flag_hn_start: 'normal', // hana 読む 77＋穂 6か所：約6分
  flag_hm_start: 'normal', // himo 読む 約40＋爪（大写しまで 19ページ）：約3分
  flag_ku_start: 'normal', // kutsu 読む 74＋長靴・5か所：約5分
  flag_mimi_start: 'normal', // mimi 読む 47＋耳あわせ・7か所：約4分
  flag_mg_start: 'normal', // mushigomu 読む 52＋大写し 3回・7か所：約4分半
  flag_nr_start: 'normal', // neru 読む 46＋大写し 2回・7か所：約4分
  flag_saku_start: 'short', // sakuzoi 読む 24＋畦・柵ぞい 6か所を 歩く：約2分57秒（測った 177秒）
  flag_ub_start: 'short', // ushibana 読む 31＋房 3つ：約2分半
  flag_shikishi_start: 'normal', // shikishi 読む 86・11か所：約7分
  flag_ss_start: 'normal', // shishito 読む 46＋七輪・5か所：約3分半
  flag_uz_start: 'short', // uzu 読む 35＋大写し 2回・ポコシャの 前だけ：約2分 弱
  flag_yw_start: 'normal', // yuwaka 読む 53＋とうもろこし・9か所：約5分
  // ---- 第3章
  flag_ab_start: 'short', // abura 読む 32＋ヘラ 2本・廊下の 机：約2分
  flag_im_start: 'normal', // imo 読む 48＋焼き芋の 窓：約3分
  flag_iso_start: 'normal', // iso 読む 69＋磯・6か所：約4分半
  flag_kr_start: 'normal', // kori 読む 56＋氷の 道 3本：約5分
  flag_ag_start: 'normal', // amigoya 読む 53＋網の 目 3つ：約4分
  flag_mh_start: 'normal', // mahiru 読む 56＋のぞき 3回・7か所：約4分
  flag_mk_start: 'normal', // mikan 読む 46＋枝 3本・8か所：約4分
  flag_mz_start: 'normal', // mizukiri 読む 34＋水切り・7か所：約3分
  flag_ng_start: 'normal', // nukegara 読む 32・7か所：約3分
  flag_sk_start: 'normal', // sakana 読む 49＋浮き 3回：約3分半
  flag_tk_start: 'normal', // tokoro 読む 57＋天突き・3か所：約3分半
  flag_sr_start: 'normal', // shiro 波に 見せる 城（読む 約40ページ＋大写し「砂」4回＋浜の 6か所：約3分半）
  flag_yd_start: 'short', // yose 読む 34＋なべ・沖まで 5か所：約2分50秒（測った 170秒）
  flag_rt_start: 'normal', // retasu 寝とる うちに、とる（読む 約69ページ＋大写し 3回＋村から ネットの 戸・上の 畑：約4分）
  flag_hb_start: 'normal', // hokihata 穂は ほうき、茎は 柄（読む 約45ページ＋大写し 3回＋集会所・東の 路地・竹ざお・集会所：約3分半）
  flag_fr_start: 'normal', // fureai 目で、いちばん 長く（読む 約45ページ＋手洗い＋大写し「ふれあい」4か所＋回廊から 1部屋：約3分）
  flag_hs_start: 'normal', // housou 終わりの 音は、下がる（読む 約66ページ＋大写し 2回＋入口から 1部屋：約4分）
};
