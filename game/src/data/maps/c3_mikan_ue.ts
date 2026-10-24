// map_c3_mikan_ue — みかん畑の 上の 段（2026-10-23 依頼主の 採用：げむきか 10/23 の 案1「落とすけえ、甘うなる」、03_ch3_index）。
// 24×10、画面 1枚半。海ぞいの町の みかん畑の いちばん 上の 作業道 (52,2) の 北、クロマツの あいだの 石の 段
// （door_c3_mikan_ue、events/ch3/mikan.ts。段階1〜2 だけ）から だけ 来る。南の はしの 石段 (11–12,9) の 上 (12,8) に 着く。
// ほかに 出口は ない（北は クロマツ、東西と 南は 低い がけ）。干物屋の ホシオと ホシミの 畑。
//
//      012345678901234567890123
//   0  hhhhhhhhhhhhhhhhhhhhhhhh   クロマツ（上の 段の 高さ）
//   1  hSSSpPPpPPpOpppPPpppTTph   上の 段：物置 (1–3,1)、木 (5,8,15)、丸太の ベンチ (11,1)、いちばん 古い 木 (20–21,1)
//   2  hppppppppppppppppppppppph
//   3  jCCCCCCCCCCNNCCCCCCCCCCj   石垣（石の 段 (11–12,3)）
//   4  jqqQQqqQQqqqqqqqQQqqQQqj   中の 段：木 (3,7,16,20)
//   5  jqqqqqqqqqqqqqqqqqqqqqqj
//   6  HBBBBBBBBBBnnBBBBBBBBBBH   石垣（石の 段 (11–12,6)）
//   7  HmmMMmmMMmmmmmmmMMmMMmmH   下の 段：木 (3,7,16,19)
//   8  HmmmmmmmmmmmmmmmmmmmmmoH   雨水を ためた ドラム缶 (22,8)
//   9  HDDDDDDDDDDzzDDDDDDDDDDH   いちばん 下の 石垣、南の はしの 石段 (11–12,9)：下の 作業道へ
//
// 段ごとに 字を 分けた（上 p・中 q・下 m、木 P・Q・M、石垣 C・B・D、石段 N・n・z、松 h・j・H）：HD-2D の 高さは
// 字ごと（hd2d/places.ts。上の 段ほど 高い。東西の 外は その 段の 高さの 松、南の 外は 1段 下の 畑）。
// 木は 2×1（幹の 列だけ 当たる。葉は 上の 列に かかる）。どの 段も 東西に 2本ずつ、計 12本（上の 段の 東の 1本が
// いちばん 古い 木）。HD-2D：上の 段ほど 高い（places.ts）。人：イベントの 間は いない（段階2 は 2人が 来ている）。
// 敵は 置かない。台本は events/ch3/mikan.ts、文は data/text/c3_mikan.ts、絵は art/props/mikan_ue_art.ts。

import '../../art/props/mikan_ue_art';
import { registerMap } from '../../world/maps';
import type { MapDef, MapObj } from '../../world/types';
import { cg } from './umizoi';

export const MIKAN_UE = 'map_c3_mikan_ue';
export const MIKAN_UE_W = 24;
export const MIKAN_UE_H = 10;

export const MIKAN_UE_ROWS = [
  'hhhhhhhhhhhhhhhhhhhhhhhh', // 0
  'hSSSpPPpPPpOpppPPpppTTph', // 1
  'hpppppppppppppppppppppph', // 2
  'jCCCCCCCCCCNNCCCCCCCCCCj', // 3
  'jqqQQqqQQqqqqqqqQQqqQQqj', // 4
  'jqqqqqqqqqqqqqqqqqqqqqqj', // 5
  'HBBBBBBBBBBnnBBBBBBBBBBH', // 6
  'HmmMMmmMMmmmmmmmMMmMMmmH', // 7
  'HmmmmmmmmmmmmmmmmmmmmmoH', // 8
  'HDDDDDDDDDDzzDDDDDDDDDDH', // 9
];

/** 木の 幹の 左の マス（段ごと。上・中・下）。 */
export const MIKAN_UE_TREES: { x: number; y: number }[] = [
  { x: 5, y: 1 },
  { x: 8, y: 1 },
  { x: 15, y: 1 },
  { x: 3, y: 4 },
  { x: 7, y: 4 },
  { x: 16, y: 4 },
  { x: 20, y: 4 },
  { x: 3, y: 7 },
  { x: 7, y: 7 },
  { x: 16, y: 7 },
  { x: 19, y: 7 },
];
/** いちばん 古い 木（上の 段の 東）。 */
export const MIKAN_UE_FURUKI: [number, number] = [20, 1];

const OBJECTS: MapObj[] = [
  ...MIKAN_UE_TREES.map(({ x, y }) => ({ t: 'prop', prop: 'prop_c3_mikan', x, y }) as unknown as MapObj),
  { t: 'prop', prop: 'prop_mk_furuki', x: MIKAN_UE_FURUKI[0], y: MIKAN_UE_FURUKI[1] } as unknown as MapObj,
  { t: 'prop', prop: 'prop_mk_monooki', x: 1, y: 1 } as unknown as MapObj,
  { t: 'prop', prop: 'prop_mk_bench', x: 11, y: 1 } as unknown as MapObj,
  { t: 'prop', prop: 'prop_mk_drum', x: 22, y: 8 } as unknown as MapObj,
  // the stone steps down to the work path (south end)
  { t: 'prop', prop: 'prop_mk_dan', x: 11, y: 9, opts: { side: 'ue' } } as unknown as MapObj,
  { t: 'door', id: 'door_c3_mikan_ue_back', x: 11, y: 9, w: 2, to: 'map_umizoi', tx: 52, ty: 2, dir: 'down', se: 'se_step_stone' } as unknown as MapObj,
  // (the things to examine, obj_mk_*, the branches, the two at 12:01: events/ch3/mikan.ts)
];

const DEF: MapDef = {
  id: MIKAN_UE,
  name: 'みかん畑の 上の 段',
  kind: 'outdoor',
  chapter: 3,
  stageFlag: 'flag_ch3_stage',
  rows: MIKAN_UE_ROWS,
  legend: {
    // the pines (north, and east and west at each terrace's height)
    h: { ground: cg('c3_kusa'), solid: true, tag: 'hedge' },
    j: { ground: cg('c3_kusa'), solid: true, tag: 'hedge' },
    H: { ground: cg('c3_kusa'), solid: true, tag: 'hedge' },
    // the stone walls of the terraces
    C: { ground: cg('c3_kusa'), solid: true, tag: 'wall' },
    B: { ground: cg('c3_kusa'), solid: true, tag: 'wall' },
    D: { ground: cg('c3_kusa'), solid: true, tag: 'wall' },
    // the terraces' ground, the trees' trunks (2×1), the shed, the old tree, the bench, the drum
    p: { ground: cg('c3_mikan'), step: 'se_step_grass' },
    q: { ground: cg('c3_mikan'), step: 'se_step_grass' },
    m: { ground: cg('c3_mikan'), step: 'se_step_grass' },
    P: { ground: cg('c3_mikan'), solid: true, tag: 'prop' },
    Q: { ground: cg('c3_mikan'), solid: true, tag: 'prop' },
    M: { ground: cg('c3_mikan'), solid: true, tag: 'prop' },
    S: { ground: cg('c3_mikan'), solid: true, tag: 'prop' },
    T: { ground: cg('c3_mikan'), solid: true, tag: 'prop' },
    O: { ground: cg('c3_mikan'), solid: true, tag: 'prop' },
    o: { ground: cg('c3_mikan'), solid: true, tag: 'prop' },
    // the stone steps up through the walls, and down at the south end
    N: { ground: cg('c3_ishidan'), step: 'se_step_stone' },
    n: { ground: cg('c3_ishidan'), step: 'se_step_stone' },
    z: { ground: cg('c3_ishidan'), step: 'se_step_stone' },
    // (past the south edge only: the town's terraces below)
    v: { ground: cg('c3_mikan'), step: 'se_step_grass' },
  },
  objects: OBJECTS,
  camera: 'follow',
  variant: 'outdoor',
  space: 'minato',
  outside: '#2A5A82',
  zones: [{ id: 'area_c3_mikan_ue', name: 'みかん畑の 上の 段', x: 0, y: 0, w: MIKAN_UE_W, h: MIKAN_UE_H }],
  structMats: [
    ...['h', 'j', 'H'].map((ch) => ({ x: 0, y: 0, w: MIKAN_UE_W, h: MIKAN_UE_H, mat: 'c3_matsu', ch })),
    ...['C', 'B', 'D'].map((ch) => ({ x: 0, y: 0, w: MIKAN_UE_W, h: MIKAN_UE_H, mat: 'c3_ishigaki', ch })),
  ],
  onEnter: ['evt_mk_enter'],
  bgm: { 1: 'bgm_umi_noon', 2: 'bgm_umi_noon' },
  amb: { 1: ['amb_c3_umi', 'amb_c3_semi'], 2: ['amb_c3_umi', 'amb_c3_semi'] },
  // (high above the harbour: the sea far and soft, the cicadas of the pines close)
  ambVol: { amb_c3_umi: { vol: 0.5 }, amb_c3_semi: { vol: 0.8 } },
};

// 12:00 (8月31日)：日は 南の 高い 所（町と 同じ。影は 北へ 短く。62 8.3・8.4）
Object.defineProperty(DEF, 'shadowVec', { value: [0, -1] as [number, number], enumerable: true });

registerMap(DEF);
