// map_c3_amigoya — 網小屋（破れたら、つくろう、げむきか 10/25 の 案2、2026-10-25 依頼主の 採用。03_ch3_index）。
// 16×10、画面 1枚。港通りの 西の はしの 漁協の 建物 (0,11) の 正面の 木の 戸 (5,15)（events/ch3/amigoya.ts。
// 段階2、〔ami〕の あと だけ 開く。戸を 調べて 暗転）から だけ 来る。南の 戸 (7,9) の 上 (7,8) に 着く。ほかに 出口は ない。
// 漁協の 建物の 一部を、漁師が 網を つくろう 場所に している。
//
//      0123456789012345
//   0  #WWWWWWWWWWWWWW#   北の 壁：梁から 下げた 網 (2–13)、破れ 3つ (4,2)・(8,2)・(12,2)、窓 (14,0–1)
//   1  #WWWWWWWWWWWWWW#
//   2  #WWWWWWWWWWWWWW#   （網の すそ。破れは (x,3) から 北を 向いて 調べる）
//   3  #..............#   床に、網目の 影（窓の 光。床の 絵に 描いて ある：ちらつかない）
//   4  #.......BB.....#   腰かけ (7,4)：ゴロウ（イベントの あいだ）、その 東に 道具箱 (8–9,4)
//   5  #YYY.........UU#   たたんだ 網の 山 (1–3,5–6)、浮きと おもりの 箱 (13–14,5–6)
//   6  #YYY.........UU#
//   7  #..............#
//   8  #........k.....#   長靴 (9,8)
//   9  #######D########   南の 戸
//
// 床は 板。敵は 置かない（段階2 は 町の 敵が もとに もどっている：60 5.5）。

import '../../art/props/amigoya_art';
import { registerMap } from '../../world/maps';
import type { MapObj, TileSpec } from '../../world/types';

export const AMIGOYA = 'map_c3_amigoya';
export const AG_W = 16;
export const AG_H = 10;

export const AG_ROWS = [
  '#WWWWWWWWWWWWWW#', // 0
  '#WWWWWWWWWWWWWW#', // 1
  '#WWWWWWWWWWWWWW#', // 2
  '#..............#', // 3
  '#.......BB.....#', // 4
  '#YYY.........UU#', // 5
  '#YYY.........UU#', // 6
  '#..............#', // 7
  '#........k.....#', // 8
  '#######D########', // 9
];

/** 破れ 3つ（北の 壁の 網、左から。小さい 穴・長い 裂け目・骨の あと）。 */
export const AG_ANA: [number, number][] = [
  [4, 2],
  [8, 2],
  [12, 2],
];
/** 窓（北の 壁、14 列）。 */
export const AG_MADO: [number, number] = [14, 1];
/** 腰かけ（ゴロウ）。 */
export const AG_KOSHI: [number, number] = [7, 4];

const LEGEND: Record<string, TileSpec> = {
  '#': { ground: 'void', solid: true, tag: 'void' },
  W: { ground: 'void', solid: true, tag: 'iwall' },
  D: { ground: 'void', solid: true, door: true, tag: 'door' },
  '.': { ground: 'tile_floor', step: 'se_step_wood' },
  Y: { ground: 'tile_floor', solid: true, tag: 'prop' },
  B: { ground: 'tile_floor', solid: true, tag: 'prop' },
  U: { ground: 'tile_floor', solid: true, tag: 'prop' },
  k: { ground: 'tile_floor', solid: true, tag: 'prop' },
};

const PR = (prop: string, x: number, y: number): MapObj => ({ t: 'prop', prop, x, y }) as MapObj;

registerMap({
  id: AMIGOYA,
  name: '網小屋',
  kind: 'indoor',
  chapter: 3,
  stageFlag: 'flag_ch3_stage',
  rows: AG_ROWS,
  legend: LEGEND,
  camera: 'fixed',
  space: 'room',
  light: 'top',
  objects: [
    PR('prop_ag_shell', 0, 0),
    PR('prop_ag_yama', 1, 5),
    PR('prop_ag_dougu', 8, 4),
    PR('prop_ag_hako', 13, 5),
    PR('prop_ag_nagagutsu', 9, 8),
    PR('prop_ag_koshi', AG_KOSHI[0], AG_KOSHI[1]),
    { t: 'door', id: 'door_c3_amigoya_out', x: 7, y: 9, to: 'map_umizoi', tx: 5, ty: 16, dir: 'down', se: 'se_door' },
    // (the holes, ゴロウ, the things to examine: events/ch3/amigoya.ts)
  ] as MapObj[],
  onEnter: ['evt_ag_enter'],
  bgm: { 2: 'bgm_umi_noon' },
} as Parameters<typeof registerMap>[0]);
