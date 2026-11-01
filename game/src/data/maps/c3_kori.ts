// map_c3_kori — 氷の 蔵（明日の 朝の 氷、げむきか 10/24 の 案2、2026-10-24 依頼主の 採用。03_ch3_index）。
// 16×10、画面 1枚。港の 倉庫 (44–49,19–23) の 西の はしの 小さな 鉄の 戸 (45,23)（events/ch3/kori.ts。段階2、
// 〔kori〕の あと だけ 開く）から だけ 来る。南の 戸 (7–8,9) の 上 (7,8) に 着く。ほかに 出口は ない。
//
//      0123456789012345
//   0  #WWWWWWWWWWWWWW#   北の 壁（温度計 (10,1)、防寒着の かけくぎ (12,1)）
//   1  #WWWWWWWWWWWWWW#
//   2  #KKKK..........#   積み場（角氷を 積んだ 山、1–4）。(2,2) から 鉤で 引いて (2,3) → 氷道の 口 (2,4)
//   3  #.............M#   砕く 機械 (14,3–5)。口は (14,4)
//   4  #P============M#   プッシャー (1,4)。鉄の 氷道 (2–13,4)：分かれ道 A (4,4)、止め板 1 (8,4)、合流 (11,4)
//   5  #...=......=..M#   A から 南へ (4,5–6)。合流へ 北から (11,5–6)
//   6  #...=..=...=...#   分かれ道 B の 北の 行き止まり (7,6)
//   7  #...========...#   (4,7) 角 → 東へ、分かれ道 B (7,7)、止め板 2 (9,7)、(11,7) 角
//   8  #..............#
//   9  #######DD#######   南の 戸
//
// 床は ふつうの コンクリートの 床（霜で 白い）。すべるのは 鉄の 氷道（=）の 中だけ：氷道の つながり・分かれ道・
// 止め板は 台本（events/ch3/kori.ts の RAIL）、絵は art/props/kori_art.ts。人：イベントの 間 ゲン (5,8)、ツグミ (13,6)。
// 敵は 置かない。マイナス 10度くらい（貯氷庫）。

import '../../art/props/kori_art';
import { registerMap } from '../../world/maps';
import type { MapObj, TileSpec } from '../../world/types';

export const KORI = 'map_c3_kori';
export const KORI_W = 16;
export const KORI_H = 10;

export const KORI_ROWS = [
  '#WWWWWWWWWWWWWW#', // 0
  '#WWWWWWWWWWWWWW#', // 1
  '#KKKK..........#', // 2
  '#.............M#', // 3
  '#P============M#', // 4
  '#...=......=..M#', // 5
  '#...=..=...=...#', // 6
  '#...========...#', // 7
  '#..............#', // 8
  '#######DD#######', // 9
];

/**
 * The iron ice-road (氷道): each tile's ends (N E S W). The switches and the merge have three:
 * `trunk` is the end the block comes in by (or, at the merge, goes out by); the other two are its branches.
 */
export const KR_RAIL: Record<string, string> = {
  '2,4': 'E', // 氷道の 口（プッシャーの 前）
  '3,4': 'WE',
  '4,4': 'WES', // 分かれ道 A
  '5,4': 'WE',
  '6,4': 'WE',
  '7,4': 'WE',
  '8,4': 'WE', // 止め板 1
  '9,4': 'WE',
  '10,4': 'WE',
  '11,4': 'WES', // 合流
  '12,4': 'WE',
  '13,4': 'WE', // → 砕く 機械の 口 (14,4)
  '4,5': 'NS',
  '4,6': 'NS',
  '4,7': 'NE',
  '5,7': 'WE',
  '6,7': 'WE',
  '7,7': 'WEN', // 分かれ道 B
  '7,6': 'S', // 行き止まり
  '8,7': 'WE',
  '9,7': 'WE', // 止め板 2
  '10,7': 'WE',
  '11,7': 'WN',
  '11,6': 'NS',
  '11,5': 'NS',
};
/** 分かれ道：trunk と 2つの 行き先（0・1）。 */
export const KR_BUNKI = [
  { x: 4, y: 4, trunk: 'W', to: ['E', 'S'] as const },
  { x: 7, y: 7, trunk: 'W', to: ['E', 'N'] as const },
];
/** 合流（どちらから 来ても 東へ）。 */
export const KR_GORYU = { x: 11, y: 4, trunk: 'E' };
/** 止め板。 */
export const KR_ITA: [number, number][] = [
  [8, 4],
  [9, 7],
];
/** 氷道の 口、砕く 機械の 口、積み場から 引く 所。 */
export const KR_KUCHI: [number, number] = [2, 4];
export const KR_SAIHYO: [number, number] = [14, 4];
export const KR_HIKI: [number, number] = [2, 2];

const LEGEND: Record<string, TileSpec> = {
  '#': { ground: 'void', solid: true, tag: 'void' },
  W: { ground: 'void', solid: true, tag: 'iwall' },
  D: { ground: 'void', solid: true, door: true, tag: 'door' },
  '.': { ground: 'tile_floor', step: 'se_step_stone' },
  '=': { ground: 'tile_floor', step: 'se_step_metal' },
  K: { ground: 'tile_floor', solid: true, tag: 'prop' },
  P: { ground: 'tile_floor', solid: true, tag: 'prop' },
  M: { ground: 'tile_floor', solid: true, tag: 'prop' },
};

const PR = (prop: string, x: number, y: number): MapObj => ({ t: 'prop', prop, x, y }) as MapObj;

registerMap({
  id: KORI,
  name: '氷の 蔵',
  kind: 'indoor',
  chapter: 3,
  stageFlag: 'flag_ch3_stage',
  rows: KORI_ROWS,
  legend: LEGEND,
  camera: 'fixed',
  space: 'soko',
  light: 'top',
  objects: [
    PR('prop_kr_shell', 0, 0),
    PR('prop_kr_tsumiba', 1, 2),
    PR('prop_kr_pusher', 1, 4),
    PR('prop_kr_saihyoki', 14, 3),
    { t: 'door', id: 'door_c3_kori_out', x: 7, y: 9, w: 2, to: 'map_umizoi', tx: 45, ty: 24, dir: 'down', se: 'se_c3_aq_reizo' },
    // (the switches' tongues on the floor, the gates, the blocks, the two, the things to examine: events/ch3/kori.ts)
  ] as MapObj[],
  onEnter: ['evt_kr_enter'],
  // no song in the cold store: the walk-in freezer's metal (the old aquarium's feed store's bed), its own echo
  bgm: { 2: null },
  amb: { 2: ['amb_c3_aq_souko'] },
} as Parameters<typeof registerMap>[0]);
