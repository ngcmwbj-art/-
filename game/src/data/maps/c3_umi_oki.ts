// map_c3_umi_oki — 沖の ブイの 下（2026-10-19 依頼主の 採用：げむきか 10/19 の 案1「海の 水で 寄せる」、
// 03_ch3_index 28）。24×12、画面 1枚。海の 中 map_c3_umi の 海水浴場の 底の 南の はし (40,12) の 岩の すき間
// （door_c3_umi_oki）から だけ 来る（陸からは 入れない。グソっ君だけ）。北の はし (12,0) に 出る。
// 台本は events/ch3/yose.ts、文は data/text/c3_yose.ts、絵は art/props/yose_art.ts。
//
//      012345678901234567890123
//   0  RRRRRRRRRRRRDRRRRRRRRRRR   (12,0)：海水浴場の 底へ もどる 岩の すき間
//   1  RssssssssssssssssssssssR   白い 砂の 底が ゆるく 南へ 下がる
//   5  Rsssssssssss#ssssssssssR   (12,5)：遊泳区域の ブイの 鎖（上に 黄色い ブイの 影）
//  11  RddddddddddddddddddddddR   南の はし：岩の 段（この 先は 深い。行き止まり）
//
// 海藻の かたまり 2つ (5,3)・(18,7)、小さな 魚の 群れ 1つ (16,3)（止まった 正午なので 形の まま。種類は 言わない）。
// 人は いない。敵は 置かない（びんを 持って 帰る とちゅうで 戦闘に ならない）。光は 海水浴場の 底より 少し 青が 濃い
// （events/ch3/yose.ts の 水の 層）。

import '../../art/props/yose_art';
import { registerMap } from '../../world/maps';
import type { MapObj } from '../../world/types';
import { cg } from './umizoi';

export const UMI_OKI = 'map_c3_umi_oki';

const ROWS = [
  'RRRRRRRRRRRRDRRRRRRRRRRR', // 0
  'RssssssssssssssssssssssR', // 1
  'RssssssssssssssssssssssR', // 2
  'RssssssssssssssssssssssR', // 3
  'RssssssssssssssssssssssR', // 4
  'Rsssssssssss#ssssssssssR', // 5
  'RssssssssssssssssssssssR', // 6
  'RssssssssssssssssssssssR', // 7
  'RssssssssssssssssssssssR', // 8
  'RssssssssssssssssssssssR', // 9
  'RssssssssssssssssssssssR', // 10
  'RddddddddddddddddddddddR', // 11
];

const OBJECTS: MapObj[] = [
  // the south edge: the rock's step, the deep blue past it (flat, under everything)
  { t: 'prop', prop: 'prop_yd_dan', x: 1, y: 11, opts: { w: 22 } },
  // the buoy's chain, the seaweed, the school of little fish
  // (not in グソっ君's memory of the deep sea, S30: events/ch3/kioku.ts flag_c3_kioku)
  { t: 'prop', prop: 'prop_yd_kusari', x: 12, y: 5, cond: { notFlag: 'flag_c3_kioku' } },
  { t: 'prop', prop: 'prop_c3_umi_mo', x: 5, y: 3, opts: { v: 0 } },
  { t: 'prop', prop: 'prop_c3_umi_mo', x: 6, y: 3, opts: { v: 1 } },
  { t: 'prop', prop: 'prop_c3_umi_mo', x: 18, y: 7, opts: { v: 1 } },
  { t: 'prop', prop: 'prop_c3_umi_mo', x: 19, y: 7, opts: { v: 2 } },
  { t: 'prop', prop: 'prop_yd_mure', x: 16, y: 3 },
  // (their examines, obj_yd_oki_*, are the scenario's: events/ch3/yose.ts)
  // back up to the beach's floor (its south edge's gap)
  { t: 'door', id: 'door_c3_umi_oki_back', x: 12, y: 0, to: 'map_c3_umi', tx: 40, ty: 12, dir: 'up', se: 'se_c3_step_uw' },
] as unknown as MapObj[];

registerMap({
  id: UMI_OKI,
  name: '沖の ブイの 下',
  kind: 'outdoor',
  chapter: 3,
  stageFlag: 'flag_ch3_stage',
  rows: ROWS,
  legend: {
    s: { ground: cg('c3_soko_oki'), step: 'se_c3_step_uw' },
    '#': { ground: cg('c3_soko_oki'), solid: true, tag: 'prop' },
    R: { ground: cg('c3_soko_iwa'), solid: true, tag: 'prop' },
    D: { ground: cg('c3_soko_oki'), solid: true, door: true, tag: 'prop' },
    d: { ground: cg('c3_soko_iwa'), solid: true, tag: 'prop' },
  },
  objects: OBJECTS,
  camera: 'follow',
  space: 'room',
  outside: '#123050',
  onEnter: ['evt_yd_oki_enter'],
});
