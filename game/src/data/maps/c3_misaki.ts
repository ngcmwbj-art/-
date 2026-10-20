// map_c3_misaki — 岬（2026-10-20 依頼主「車で移動するほどの距離じゃないのが違和感。なんなら最初から旧水族館は
// 無くって違う場所にあっても良いかも」→ 旧水族館を 海ぞいの町の 東の はしから 町の 外の 岬へ 移した）。32×20。
// 海ぞいの町から 海ぞいの 道を 軽トラで 走った 先の 岬の 上：旧水族館の 正面と 前の 広場、松林、
// ガードレールと 崖と 海、軽トラの 停まる 所、町へ もどる 道（西の はし）。
//
// 座標は 前の 海ぞいの町の 東の はし（map_umizoi の x68–79, y16–34）を (−48, −17) ずらした もの：
//   旧水族館 (22,2) 10×(7+3)、券売所の 窓 (24,11)、ガラス戸 (26–27,11)、前の 広場 x20–31 行12–16、
//   石段 (25,17)（下は 岬の 磯 map_c3_iso、本日は、開館です：events/ch3/iso.ts）。
//   軽トラの 停まる 所 (22,14) 上向き（車体は 21–23,13–14）。着く 所 (25,13)。
//   海ぞいの 道 行12–14 は 西の はしで 町へ（歩いては 行けない：trig_c3_misaki_edge、events/ch3/umizoi.ts）。
//
// 人と 物は 前の 海ぞいの町の 東の はしに いた もの（ハキコ・ポコシャ・看板・トベラ）。台本は 前と 同じ id。

import { flag } from '../../game/state';
import { registerMap } from '../../world/maps';
import { pgAqOpen, pgOn } from '../../world/postgame';
import type { MapDef, MapObj, TileSpec } from '../../world/types';
import { cg } from './umizoi';

export const MISAKI_W = 32;
export const MISAKI_H = 20;

const ROWS = [
  'HHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHH', // 0
  'HHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHH', // 1
  'HHHHHHHHHHHHHHHHHHHHHH^^^^^^^^^^', // 2
  'HHHHHHHHHHHHHHHHHHHHHH^^^^^^^^^^', // 3
  'HHHHHHH,,,,HHHHHHHHHHH^^^^^^^^^^', // 4
  'HHHHH,,,,,,,,HHHHHHHHH^^^^^^^^^^', // 5
  'HHHH,,,T,,,,,,,HHHHHHH^^^^^^^^^^', // 6
  'HHH,,,,,,,,,,,,,,HHHHH^^^^^^^^^^', // 7
  'HH,,,,,,,,,,T,,,,,,HHH^^^^^^^^^^', // 8
  'H,,,,,,,,,,,,,,,,,,,,,WWWWWWWWWW', // 9
  ',,,,,,,,,,,,,,,,,,,,,,WWWWWWWWWW', // 10
  ',,,,o,,,,,,,,,,,,,o,,,WWSWDDWWWW', // 11
  '....................qqqqqqqqqqoq', // 12
  '....................qqqqqqqqqqqq', // 13
  '....................qqqqqqqqqqqq', // 14
  'GGGGGGGGGGGGGGGGGGGGqqqqqqqqqqqq', // 15
  'KKKKKKKKKKKKKKKKKKKKqqoqqqqqqoqq', // 16
  '~~~~~~~~~~~~~~~~~~KKKKKKKnKKKKKK', // 17
  '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~', // 18
  '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~', // 19
];

const LEGEND: Record<string, TileSpec> = {
  // walkable
  '.': { ground: cg('c3_road'), step: 'se_step_asphalt' },
  q: { ground: cg('c3_hiroba'), step: 'se_step_stone' },
  n: { ground: cg('c3_ishidan'), step: 'se_step_stone' },
  ',': { ground: cg('c3_kusa'), step: 'se_step_grass' },
  // solid
  H: { ground: cg('c3_kusa'), solid: true, tag: 'hedge' },
  K: { ground: cg('c3_iwa'), solid: true, tag: 'hedge' },
  G: { ground: cg('c3_kusa'), solid: true, tag: 'guardrail' },
  '^': { ground: cg('c3_alley'), solid: true, tag: 'roof' },
  W: { ground: cg('c3_alley'), solid: true, tag: 'facade' },
  D: { ground: cg('c3_alley'), solid: true, door: true, tag: 'facade' },
  S: { ground: 'auto', solid: true, counter: true, tag: 'counter' },
  '~': { ground: cg('c3_umi'), solid: true, tag: 'water' },
  T: { ground: 'auto', solid: true, tag: 'trunk' },
  o: { ground: 'auto', solid: true, tag: 'prop' },
};

function O(id: string, x: number, y: number, extra: Record<string, unknown> = {}): MapObj {
  return { t: 'obj', id, x, y, ...extra } as unknown as MapObj;
}
function PR(prop: string, x: number, y: number, opts?: Record<string, unknown>, extra: Record<string, unknown> = {}): MapObj {
  return { t: 'prop', prop, x, y, ...(opts ? { opts } : {}), ...extra } as unknown as MapObj;
}

const OBJECTS: MapObj[] = [
  // ======================================================== 旧水族館（62 3.3・7.1）
  PR('prop_c3_bld_aq', 22, 2),
  { t: 'door', id: 'door_c3_aq', x: 26, y: 11, w: 2, to: 'map_c3_aq_iriguchi', tx: 7, ty: 10, dir: 'up', se: 'se_door_glass', cond: { stage: '3+', when: () => !pgOn() || pgAqOpen() } } as unknown as MapObj,
  // the door while it is shut: what is read there (60 9.3)
  O('obj_c3_aq_harigami', 26, 11, { w: 2, face: 'up', cond: { stage: '0-2' } }),
  // after the clear: shut outside its hours (9:00–16:59, 05_postgame 5.3)
  O('obj_c3_aq_pg_shut', 26, 11, { w: 2, face: 'up', text: '@narr\nガラス戸に、札が 下がっている。\n『開館の 準備は、また あした。』', cond: { when: () => pgOn() && !pgAqOpen() } }),

  // ======================================================== 前の 広場
  O('obj_c3_aq_kanban', 30, 12, { prop: 'prop_c3_aq_kanban' }),
  PR('prop_c3_tobera', 22, 16),
  PR('prop_c3_tobera', 29, 16),

  // ======================================================== 松林・海ぞいの 道
  PR('tree_matsu', 7, 6),
  PR('tree_matsu', 12, 8),
  PR('prop_c3_ishi_bench', 4, 11),
  // the road sign back the way the truck came (the town's own says 『岬 →』, umizoi.ts)
  O('obj_c3_misaki_fuda_machi', 18, 11, { prop: 'prop_c3_misaki_fuda', opts: { to: 'machi' }, text: '@narr\n道の 札。\n『← 海ぞいの町』' }),

  // ======================================================== 人（62 3.4：段階1 = 12:00、段階2 = 12:01）
  {
    t: 'npc', id: 'npc_c3_uketsuke', x: 25, y: 13, dir: 'left', cond: { stage: '1-2' },
    move: { kind: 'patrol', points: [[24, 13], [29, 13]], speed: 0.6, wait: 2000 },
  },
  { t: 'npc', id: 'npc_pokosha', script: 'c3_pokosha_umi', x: 23, y: 14, dir: 'up', cond: { stage: 1, flag: 'flag_ch3_arrived' } },

  // the way back to the town: too far to walk (the line is events/ch3/umizoi.ts)
  { t: 'trig', id: 'trig_c3_misaki_edge', x: 0, y: 12, w: 1, h: 3, on: 'bump', script: 'trig_c3_misaki_edge' } as unknown as MapObj,
];

export const MISAKI: MapDef = {
  id: 'map_c3_misaki',
  name: '岬',
  kind: 'outdoor',
  chapter: 3,
  stageFlag: 'flag_ch3_stage',
  rows: ROWS,
  legend: LEGEND,
  objects: OBJECTS,
  camera: 'follow',
  variant: 'outdoor',
  space: 'minato',
  outside: '#2A5A82',
  zones: [
    { id: 'area_c3_suizokukan', x: 20, y: 2, w: 12, h: 16, name: '旧水族館' },
    { id: 'area_c3_misaki', x: 0, y: 0, w: MISAKI_W, h: MISAKI_H, name: '岬' },
  ],
  structMats: [
    { x: 0, y: 0, w: MISAKI_W, h: MISAKI_H, mat: 'c3_matsu', ch: 'H' },
    { x: 0, y: 0, w: MISAKI_W, h: MISAKI_H, mat: 'c3_iwa', ch: 'K' },
  ],
  bgm: { 1: 'bgm_umi_noon', 2: 'bgm_umi_noon', 4: 'bgm_umi_noon' },
  amb: { 1: ['amb_c3_umi', 'amb_c3_semi'], 2: ['amb_c3_umi', 'amb_c3_semi'] },
};

// the sun as in the town (umizoi.ts): due south at 12:00, a little east of north in the afternoon (stage 4)
Object.defineProperty(MISAKI, 'shadowVec', {
  get: (): [number, number] => (flag('flag_ch3_stage') >= 4 ? [0.35, -0.94] : [0, -1]),
  enumerable: true,
});

registerMap(MISAKI);
