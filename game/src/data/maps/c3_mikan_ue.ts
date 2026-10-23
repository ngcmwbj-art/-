// map_c3_mikan_ue — みかん畑の 上の 段（2026-10-23 依頼主の 採用：げむきか 10/23 の 案1「落とすけえ、甘うなる」、03_ch3_index）。
// 24×10、画面 1枚半。海ぞいの町の みかん畑の いちばん 上の 作業道 (52,2) の 北、クロマツの あいだの 石の 段
// （door_c3_mikan_ue、events/ch3/mikan.ts。段階1〜2 だけ）から だけ 来る。南の はしの 石段 (11–12,9) の 上 (12,8) に 着く。
// ほかに 出口は ない（北は クロマツ、東西と 南は 低い がけ）。干物屋の ホシオと ホシミの 畑。
//
//      012345678901234567890123
//   0  HHHHHHHHHHHHHHHHHHHHHHHH   クロマツ
//   1  KSSSmMMmMMmommmMMmmmTTmK   上の 段：物置 (1–3,1)、木 (5,8,15)、丸太の ベンチ (11,1)、いちばん 古い 木 (20–21,1)
//   2  KmmmmmmmmmmmmmmmmmmmmmmK
//   3  KBBBBBBBBBBnnBBBBBBBBBBK   石垣（石の 段 (11–12,3)）
//   4  KmmMMmmMMmmmmmmmMMmmMMmK   中の 段：木 (3,7,16,20)
//   5  KmmmmmmmmmmmmmmmmmmmmmmK
//   6  KBBBBBBBBBBnnBBBBBBBBBBK   石垣（石の 段 (11–12,6)）
//   7  KmmMMmmMMmmmmmmmMMmMMmmK   下の 段：木 (3,7,16,19)
//   8  KmmmmmmmmmmmmmmmmmmmmmoK   雨水を ためた ドラム缶 (22,8)
//   9  KKKKKKKKKKKnnKKKKKKKKKKK   南の はしの 石段 (11–12,9)：下の 作業道へ
//
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
  'HHHHHHHHHHHHHHHHHHHHHHHH', // 0
  'KSSSmMMmMMmommmMMmmmTTmK', // 1
  'KmmmmmmmmmmmmmmmmmmmmmmK', // 2
  'KBBBBBBBBBBnnBBBBBBBBBBK', // 3
  'KmmMMmmMMmmmmmmmMMmmMMmK', // 4
  'KmmmmmmmmmmmmmmmmmmmmmmK', // 5
  'KBBBBBBBBBBnnBBBBBBBBBBK', // 6
  'KmmMMmmMMmmmmmmmMMmMMmmK', // 7
  'KmmmmmmmmmmmmmmmmmmmmmoK', // 8
  'KKKKKKKKKKKnnKKKKKKKKKKK', // 9
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
    H: { ground: cg('c3_kusa'), solid: true, tag: 'hedge' },
    K: { ground: cg('c3_iwa'), solid: true, tag: 'hedge' },
    B: { ground: cg('c3_kusa'), solid: true, tag: 'wall' },
    m: { ground: cg('c3_mikan'), step: 'se_step_grass' },
    M: { ground: cg('c3_mikan'), solid: true, tag: 'prop' },
    T: { ground: cg('c3_mikan'), solid: true, tag: 'prop' },
    S: { ground: cg('c3_mikan'), solid: true, tag: 'prop' },
    o: { ground: cg('c3_mikan'), solid: true, tag: 'prop' },
    n: { ground: cg('c3_ishidan'), step: 'se_step_stone' },
  },
  objects: OBJECTS,
  camera: 'follow',
  variant: 'outdoor',
  space: 'minato',
  outside: '#2A5A82',
  zones: [{ id: 'area_c3_mikan_ue', name: 'みかん畑の 上の 段', x: 0, y: 0, w: MIKAN_UE_W, h: MIKAN_UE_H }],
  structMats: [
    { x: 0, y: 0, w: MIKAN_UE_W, h: MIKAN_UE_H, mat: 'c3_matsu', ch: 'H' },
    { x: 0, y: 0, w: MIKAN_UE_W, h: MIKAN_UE_H, mat: 'c3_iwa', ch: 'K' },
    { x: 0, y: 0, w: MIKAN_UE_W, h: MIKAN_UE_H, mat: 'c3_ishigaki', ch: 'B' },
  ],
  onEnter: ['evt_mk_enter'],
  bgm: { 1: 'bgm_umi_noon', 2: 'bgm_umi_noon' },
  amb: { 1: ['amb_c3_umi', 'amb_c3_semi'], 2: ['amb_c3_umi', 'amb_c3_semi'] },
};

// 12:00 (8月31日)：日は 南の 高い 所（町と 同じ。影は 北へ 短く。62 8.3・8.4）
Object.defineProperty(DEF, 'shadowVec', { value: [0, -1] as [number, number], enumerable: true });

registerMap(DEF);
