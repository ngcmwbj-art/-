// map_c3_aq_fureai — 旧水族館の ふれあいの 磯（目で、いちばん 長く、げむきか 10-27 の 案3、2026-10-27 依頼主の 採用。03_ch3_index）。
// 12×8、画面 1枚。回廊 map_c3_aq_kairo の 南の 壁の 木の 戸 (33,6)（events/ch3/fureai.ts。段階3、S16 の 回廊の あと から
// S20 の 前まで。戸を 調べて 暗転）から だけ 来る。北の 戸 (6,1) の 下 (6,2) に 着く。ほかに 出口は ない。
//
//      0123456789AB
//   0  #WWWWWWWWWW#   北の 壁：白い しっくいと 青い 帯（館の 壁）。西の すみに 貼り紙『ふれあいの やくそく』(1–2,1)、
//   1  #WWWWWDWWWW#   北の 戸 (6,1)（回廊へ）。天井の 小窓は 絵だけ（水槽の 上の 光の 柱）
//   2  #.........J#   手洗い場 (10,2)：蛇口と 石けん置き
//   3  #..TTTTTT..#   昔の タッチプール (3–8,3–5)：腰の 高さの 低い 水槽。水は ぬけて、ごつごつした 岩と 乾いた 白い 線
//   4  #..TTTTTT..#
//   5  #..TTTTTT..#
//   6  #...F.....O#   子ども用の 踏み台 (4,6)、ふちの 欠けた 手おけ (10,6)
//   7  ############
//
// 案から：水槽を 1段 下げた（3–8,3–5。北の 戸の 下 (6,2) に 着く 床が 要る）。貼り紙は 北の 壁の 西の すみ（HD-2D は 横の 壁に
// 絵を 描けないので、案の「西の 壁」(1,2) の 上の 北の 壁に。(1,2)・(2,2) から 上向きで 読む）。踏み台は 水槽の 南 (4,6)。
// 人は いない。敵は 置かない。光は 天井の 小窓から 12:00 の 白い 光が まっすぐ 水槽の 岩に（HD-2D の 見せ場）。
// 音は 回廊と 同じ 館の 空気（amb_c3_aq_kan）を 小さく、歌は なし。

import '../../art/props/fureai_art';
import { registerMap } from '../../world/maps';
import type { MapObj, TileSpec } from '../../world/types';

export const FUREAI = 'map_c3_aq_fureai';
export const FR_W = 12;
export const FR_H = 8;

export const FR_ROWS = [
  '#WWWWWWWWWW#', // 0
  '#WWWWWDWWWW#', // 1
  '#.........J#', // 2
  '#..TTTTTT..#', // 3
  '#..TTTTTT..#', // 4
  '#..TTTTTT..#', // 5
  '#...F.....O#', // 6
  '############', // 7
];

/** 水槽（3–8, 3–5）の 左上。 */
export const FR_SUISOU: [number, number] = [3, 3];
/** 手洗い場。 */
export const FR_JAGUCHI: [number, number] = [10, 2];
/** 貼り紙（北の 壁、西の すみ。2マス）。 */
export const FR_HARIGAMI: [number, number] = [1, 1];
/** 踏み台。 */
export const FR_FUMIDAI: [number, number] = [4, 6];
/** 手おけ。 */
export const FR_OKE: [number, number] = [10, 6];
/** 北の 戸と、着く 所。 */
export const FR_DOOR: [number, number] = [6, 1];
export const FR_IN_AT: [number, number] = [6, 2];

const LEGEND: Record<string, TileSpec> = {
  '#': { ground: 'void', solid: true, tag: 'void' },
  W: { ground: 'void', solid: true, tag: 'iwall' },
  D: { ground: 'void', solid: true, door: true, tag: 'door' },
  '.': { ground: 'tile_floor', step: 'se_step_tile' },
  T: { ground: 'tile_floor', solid: true, tag: 'prop' },
  J: { ground: 'tile_floor', solid: true, tag: 'prop' },
  F: { ground: 'tile_floor', solid: true, tag: 'prop' },
  O: { ground: 'tile_floor', solid: true, tag: 'prop' },
};

const PR = (prop: string, x: number, y: number): MapObj => ({ t: 'prop', prop, x, y }) as MapObj;

registerMap({
  id: FUREAI,
  name: 'ふれあいの 磯',
  kind: 'indoor',
  chapter: 3,
  stageFlag: 'flag_ch3_stage',
  rows: FR_ROWS,
  legend: LEGEND,
  camera: 'fixed',
  space: 'room',
  light: 'top',
  outside: '#0E1620',
  lightBase: '#9AA8AC',
  objects: [
    PR('prop_fr_shell', 0, 0),
    PR('prop_fr_suisou', FR_SUISOU[0], FR_SUISOU[1]),
    PR('prop_fr_jaguchi', FR_JAGUCHI[0], FR_JAGUCHI[1]),
    PR('prop_fr_fumidai', FR_FUMIDAI[0], FR_FUMIDAI[1]),
    PR('prop_fr_oke', FR_OKE[0], FR_OKE[1]),
    // (the way out and the things to examine: events/ch3/fureai.ts)
  ] as MapObj[],
  onEnter: ['evt_fr_enter'],
  bgm: { 3: null },
  amb: { 3: ['amb_c3_aq_kan'] },
  ambVol: { amb_c3_aq_kan: { vol: 0.35, lp: 1400 } },
} as Parameters<typeof registerMap>[0]);
