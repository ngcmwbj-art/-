// map_seki — 夕鳴川の 堰（30_level_art 3.16, 10_narrative 6.25〔seki〕・7.24, 02_ch2_index #81;
// 2026-10-05 依頼主の採用：げむきかの 改1「水辺の 図鑑」、もとは 10-02 の案1「手の 長い 親戚」）.
// 24×16 (the camera moves 40px up and down).
//
// 川べり通りの 西の はし (map_town (0,33–34)) を 西へ 押すと、東の はしの 道 (23,1–2) に 出る。
// The road goes on west over the bridge (x0–8) to となり町 (blocked at (0,1–2)). Under the bridge
// 夕鳴川 flows south: the pool, the weir across it (row 7) with the fish pass at its east end (8,6–8),
// the deep pool under it, the shallows. On the east bank above the weir the intake and its gate
// (9,4–5) feed the canal (x10–23, rows 4–5) that goes on east as the town's 用水路. The canal is
// crossed by a slab bridge (17–18,4–5) down to the river bed: the stone revetment (8,9–13),
// おぴぃ on her bucket on top of it (9,10) once she has asked Minato here, the gravel bar (河原)
// with the driftwood and someone's bucket, and the reed bed (ヨシ原) in the south-east where
// the swallows gather before the night.
//
//   000000000011111111112222
//   012345678901234567890123
// 0 rrrrrrrrrHHHHHHHHHHHHHHH   r: the bridge's north parapet, H: the bank's bushes
// 1 bbbbbbbbb...............   b: the bridge (x0–8), .: the road; (0,1–2) 「橋の 向こうは、となり町。」
// 2 bbbbbbbbb...............   (23,1–2): back to map_town (1,33)
// 3 rrrrrrrrrGGTGGnGG,,GGGTG   the south parapet; the guardrail with two cherries; the sign (14,3); the gap (17–18,3)
// 4 vvvvvvvvvXccccccc==ccccc   v: the river; X: the intake and its gate (9,4–5); c: the canal; =: the slab bridge
// 5 vvvvvvvvvXccccccc==ccccc
// 6 vvvvvvvvf,,,,,,,,::,,,,,   f: the fish pass (8,6–8); the gauge (7,6) stands in the pool
// 7 vvvvvvvvf,,,,,,,,::,,,,,   the weir (x0–7, row 7)
// 8 vvvvvvvvf%%%%%%%%%%%%,,,   %: the gravel bar
// 9 vvvvvvvvz%%%%%%%%%%%%%,,   z: the stone revetment (8,9–13)
// 10 vvvvvvvvz%%%%%%%%%%%RRRR  おぴぃ (9,10) faces west over the deep pool; Minato fishes from (9,11)
// 11 vvvvvvvvz%%%%%%%%%%RRRRR  R: the reed bed
// 12 vvvvvvvvz%%%%oo%%%RRRRRR  the driftwood (13–14,12)
// 13 vvvvvvvvz%%%%%%%%RRRRRRR
// 14 vvvvvvvvv%%o%%%%%RRRRRRR  the bucket (11,14)
// 15 vvvvvvvvv%%%%%%%RRRRRRRR

import '../../art/props/seki';
import { registerMap } from '../../world/maps';
import type { MapObj, TileSpec } from '../../world/types';
import { SEKI_OBJ } from '../text/mizube';

export const ROWS_SEKI = [
  'rrrrrrrrrHHHHHHHHHHHHHHH', // 0
  'bbbbbbbbb...............', // 1
  'bbbbbbbbb...............', // 2
  'rrrrrrrrrGGTGGnGG,,GGGTG', // 3
  'vvvvvvvvvXccccccc==ccccc', // 4
  'vvvvvvvvvXccccccc==ccccc', // 5
  'vvvvvvvvf,,,,,,,,::,,,,,', // 6
  'vvvvvvvvf,,,,,,,,::,,,,,', // 7
  'vvvvvvvvf%%%%%%%%%%%%,,,', // 8
  'vvvvvvvvz%%%%%%%%%%%%%,,', // 9
  'vvvvvvvvz%%%%%%%%%%%RRRR', // 10
  'vvvvvvvvz%%%%%%%%%%RRRRR', // 11
  'vvvvvvvvz%%%%oo%%%RRRRRR', // 12
  'vvvvvvvvz%%%%%%%%RRRRRRR', // 13
  'vvvvvvvvv%%o%%%%%RRRRRRR', // 14
  'vvvvvvvvv%%%%%%%RRRRRRRR', // 15
];

const SEKI_LEGEND: Record<string, TileSpec> = {
  '.': { ground: 'asphalt' },
  ',': { ground: 'grass' },
  ':': { ground: 'dirt' },
  '%': { ground: 'gravel', step: 'se_step_gravel' },
  // the bridge's deck and its parapets (prop_seki_bridge_n / _s)
  b: { ground: 'bridge' },
  r: { ground: 'bridge', solid: true, tag: 'prop' },
  // the bank's bushes north of the road
  H: { ground: 'grass', solid: true, tag: 'hedge' },
  // the guardrail along the canal (an old pipe rail, as on 川べり通り) and the cherries' trunks
  G: { ground: 'grass', solid: true, tag: 'guardrail' },
  T: { ground: 'auto', solid: true, tag: 'trunk' },
  n: { ground: 'grass', solid: true, tag: 'prop' },
  // the river (drawn whole by prop_seki_river), the fish pass, the stone revetment
  v: { ground: 'none', solid: true, tag: 'water' },
  f: { ground: 'none', solid: true, tag: 'water' },
  z: { ground: 'none', solid: true, tag: 'prop' },
  // the intake and its gate
  X: { ground: 'gravel', solid: true, tag: 'prop' },
  // the canal and the slab over it
  c: { ground: 'water', solid: true, tag: 'water' },
  '=': { ground: 'bridge' },
  // the reed bed (the town's reeds, as along the far bank)
  R: { ground: 'grass', solid: true, tag: 'hedge' },
  o: { ground: 'gravel', solid: true, tag: 'prop' },
};

type Text = string | Record<string, string>;
const O = (id: string, x: number, y: number, extra: Record<string, unknown> = {}): MapObj =>
  ({ t: 'obj', id, x, y, text: (SEKI_OBJ as Record<string, Text>)[id], ...extra }) as MapObj;
const PR = (prop: string, x: number, y: number, opts?: Record<string, unknown>, extra: Record<string, unknown> = {}): MapObj =>
  ({ t: 'prop', prop, x, y, ...(opts ? { opts } : {}), ...extra }) as MapObj;

/** The reed bed's edge tiles (examined facing them from the gravel). */
const YOSHI: [number, number, number, number][] = [
  [20, 10, 4, 1],
  [19, 11, 1, 1],
  [18, 12, 1, 1],
  [17, 13, 1, 2],
  [16, 15, 1, 1],
];

const OBJECTS: MapObj[] = [
  // ======================================================== flat things first
  PR('prop_seki_river', 0, 4),
  PR('prop_seki_stones', 10, 8, { w: 6, h: 3, seed: 1 }),
  PR('prop_seki_stones', 12, 13, { w: 5, h: 3, seed: 2 }),
  PR('prop_seki_stones', 16, 8, { w: 5, h: 2, seed: 3 }),
  // ======================================================== standing
  PR('prop_seki_bridge_n', 0, 0),
  PR('prop_seki_bridge_s', 0, 3),
  PR('prop_seki_suimon', 9, 4),
  PR('prop_seki_annai', 14, 3),
  PR('prop_seki_ryousui', 7, 6),
  PR('prop_seki_ryuboku', 13, 12),
  PR('prop_seki_bucket', 11, 14),
  { t: 'prop', prop: 'tree_cherry', x: 11, y: 3, opts: { v: 1 } } as MapObj,
  { t: 'prop', prop: 'tree_cherry', x: 22, y: 3, opts: { v: 2 } } as MapObj,
  // an egret in the shallows
  PR('prop_heron', 5, 13, { seed: 2 }),

  // ======================================================== examine (10_narrative 7.24)
  O('obj_seki_suimon', 9, 4, { h: 2, script: 'obj_seki_suimon' }),
  O('obj_seki_annai', 14, 3, { script: 'obj_seki_annai' }),
  O('obj_seki_ryousui', 8, 6, { priority: 1 }),
  O('obj_seki_seki', 8, 7, { priority: 1 }),
  O('obj_seki_gyodo', 8, 8, { priority: 1 }),
  { ...O('obj_seki_fuchi', 8, 9, { h: 5, script: 'obj_seki_fuchi' }) } as MapObj,
  { ...O('obj_seki_yousui', 10, 4, { w: 7, h: 2 }) } as MapObj,
  { ...O('obj_seki_yousui', 19, 4, { w: 5, h: 2 }), id: 'obj_seki_yousui2' } as MapObj,
  O('obj_seki_ryuboku', 13, 12, { w: 2 }),
  O('obj_seki_bucket', 11, 14),
  ...YOSHI.map(([x, y, w, h], i) => ({ ...O('obj_seki_yoshi', x, y, { w, h, script: 'obj_seki_yoshi' }), id: i ? `obj_seki_yoshi${i + 1}` : 'obj_seki_yoshi' }) as MapObj),

  // ======================================================== おぴぃ (asked here: events/mizube.ts)
  {
    t: 'npc', id: 'npc_tamotsu', x: 9, y: 10, dir: 'left', noTurn: true, pose: 'sit', script: 'npc_tamotsu',
    cond: { stage: '0-2', flag: 'flag_mizube_seki' },
  } as MapObj,

  // ======================================================== stage 2: an umbrella left on the gravel (ワスレガサ)
  {
    t: 'sym', id: 'sym_seki_01', enemies: ['enemy_wasuregasa'], x: 15, y: 10, move: 'umbrella', radius: 1,
    cond: { stage: 2 }, restoreAt: [12, 9], restoreOff: [-4, 0],
  } as MapObj,

  // ======================================================== the ends
  { t: 'door', id: 'door_seki_town', x: 23, y: 1, h: 2, to: 'map_town', tx: 1, ty: 33, dir: 'right', se: 'se_step_asphalt' },
  { t: 'trig', id: 'trig_seki_edge', x: 0, y: 1, w: 1, h: 2, on: 'bump', text: SEKI_OBJ.obj_seki_edge },
  // leaving over the canal's slab after the first shrimp: おぴぃ calls after him (once)
  { t: 'trig', id: 'trig_seki_exit', x: 17, y: 3, w: 2, h: 1, script: 'trig_seki_exit' },
];

registerMap({
  id: 'map_seki',
  name: '夕鳴川の 堰',
  kind: 'outdoor',
  rows: ROWS_SEKI,
  legend: SEKI_LEGEND,
  objects: OBJECTS,
  camera: 'follow',
  space: 'outdoor',
  onEnter: ['lv_in_seki'],
  outside: '#1B1733',
  // the town's music; the river's air (40 4.2): the weir's water, the wind — in stage 1 only the stillness
  bgm: { 0: 'bgm_town_s0', 1: 'bgm_town_s1', 2: 'bgm_town_s2' },
  amb: {
    0: ['amb_higurashi', 'amb_kawabe', 'amb_wind'],
    1: ['amb_still'],
    2: ['amb_s2_town', 'amb_kawabe', 'amb_wind'],
  },
  structMats: [
    { x: 9, y: 3, w: 15, h: 1, mat: 'pipe', ch: 'G' },
    { x: 16, y: 8, w: 8, h: 8, mat: 'reeds', ch: 'R' },
  ],
  groundDecals: [{ k: 'footprints', x: 17, y: 6, h: 2, dir: 'v' }],
});
