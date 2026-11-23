// map_c3_aq_hoso — 旧水族館の 放送室（終わりの 音は、下がる、げむきか 10-26 の 案3、2026-10-26 依頼主の 採用。03_ch3_index）。
// 10×7、画面 1枚。入口と券売所 map_c3_aq_iriguchi の 北の 壁の 小さな 戸 (5,1)（events/ch3/housou.ts。段階3、
// S15 の あと から S20 の 前まで。戸を 調べて 暗転）から だけ 来る。南の 戸 (4,6) の 上 (4,5) に 着く。ほかに 出口は ない。
//
//      0123456789
//   0  #WWWWWWWW#   北の 壁：音を 吸う 穴あきの 板。西の すみに 貼り紙『館内 放送の しかた』(1,1)、
//   1  #WWWWWWWW#   机の 上の 壁に 放送の 機械の 棚（赤い ランプ・緑の 目もり、(2–5,1)）
//   2  #.TTTTCHH#   放送の 机 (2–5,2)：マイク (2)・つまみ (3)・テープの 機械 (4–5)、
//   3  #......HH#   チャイムの 箱 (6,2)、テープの 棚 (7–8,2–3)
//   4  #........#
//   5  #.......P#   たたんだ パイプいす (8,5)
//   6  ####D#####   南の 戸
//
// 床は 古い リノリウム。人は いない（ポコシャは ここに 来ない。S18 の 放送の 場所は 本筋の 台本の まま 言わない）。
// 敵は 置かない。小窓は ない：光は 天井の 白い 灯り（廊下と 同じ 12:00 の 光）と、机の 赤い ランプ・緑の 目もりだけ。
// 電源を 切ると（flag_hs_off）、部屋が 一段 暗く なる（lightBase）。

import '../../art/props/housou_art';
import { getMapDef, registerMap } from '../../world/maps';
import { flag } from '../../game/state';
import type { MapObj, TileSpec } from '../../world/types';

export const HOSO = 'map_c3_aq_hoso';
export const HS_W = 10;
export const HS_H = 7;

export const HS_ROWS = [
  '#WWWWWWWW#', // 0
  '#WWWWWWWW#', // 1
  '#.TTTTCHH#', // 2
  '#......HH#', // 3
  '#........#', // 4
  '#.......P#', // 5
  '####D#####', // 6
];

/** 放送の 机（2–5, 2）：マイク・つまみ・テープの 機械。 */
export const HS_DESK: [number, number] = [2, 2];
/** チャイムの 箱。 */
export const HS_CHIME: [number, number] = [6, 2];
/** テープの 棚（7–8, 2–3）。 */
export const HS_TANA: [number, number] = [7, 2];
/** 貼り紙（北の 壁、西の すみ）。 */
export const HS_HARIGAMI: [number, number] = [1, 1];
/** パイプいす。 */
export const HS_ISU: [number, number] = [8, 5];

const LEGEND: Record<string, TileSpec> = {
  '#': { ground: 'void', solid: true, tag: 'void' },
  W: { ground: 'void', solid: true, tag: 'iwall' },
  D: { ground: 'void', solid: true, door: true, tag: 'door' },
  '.': { ground: 'tile_floor', step: 'se_step_tile' },
  T: { ground: 'tile_floor', solid: true, tag: 'prop' },
  C: { ground: 'tile_floor', solid: true, tag: 'prop' },
  H: { ground: 'tile_floor', solid: true, tag: 'prop' },
  P: { ground: 'tile_floor', solid: true, tag: 'prop' },
};

const PR = (prop: string, x: number, y: number): MapObj => ({ t: 'prop', prop, x, y }) as MapObj;

registerMap({
  id: HOSO,
  name: '放送室',
  kind: 'indoor',
  chapter: 3,
  stageFlag: 'flag_ch3_stage',
  rows: HS_ROWS,
  legend: LEGEND,
  camera: 'fixed',
  space: 'room',
  light: 'top',
  outside: '#0E1620',
  objects: [
    PR('prop_hs_shell', 0, 0),
    PR('prop_hs_desk', HS_DESK[0], HS_DESK[1]),
    PR('prop_hs_chime', HS_CHIME[0], HS_CHIME[1]),
    PR('prop_hs_tana', HS_TANA[0], HS_TANA[1]),
    PR('prop_hs_isu', HS_ISU[0], HS_ISU[1]),
    { t: 'door', id: 'door_c3_aq_hoso_out', x: 4, y: 6, to: 'map_c3_aq_iriguchi', tx: 5, ty: 2, dir: 'down', se: 'se_door' },
    // (the things to examine: events/ch3/housou.ts)
  ] as MapObj[],
  onEnter: ['evt_hs_enter'],
  bgm: { 3: null },
} as Parameters<typeof registerMap>[0]);

// the room's light: the ceiling's dim white, a step darker once the set is switched off; the hum of the set
// (amb_fluorescent: a thin ジー) only while it is on
{
  const def = getMapDef(HOSO);
  if (def) {
    Object.defineProperty(def, 'lightBase', { get: () => (flag('flag_hs_off') ? '#5A6470' : '#86949C'), enumerable: true, configurable: true });
    Object.defineProperty(def, 'amb', { get: () => ({ 3: flag('flag_hs_off') ? [] : ['amb_fluorescent'] }), enumerable: true, configurable: true });
  }
}
