// map_c3_iso — 岬の 磯（本日は、開館です。げむきか 10/14 の 案3、2026-10-15 依頼主の 採用。03_ch3_index、
// 05_postgame 2.3 yr_c3_iso）。30×14、旧水族館の 裏の 岬の 下。台本は events/ch3/iso.ts、文は data/text/c3_iso.ts。
//
//   北（行0〜1）：岬の 岩の 崖。(23,0–1) は 旧水族館の 前の 広場の 南の はしからの 石段（door_c3_iso_up）。
//   行2〜9：引き潮の 岩場。潮だまり 6つ（p）、めくれる 石 12（prop_iso_ishi）、乾いた 大きな 岩 2つ（K）。
//   東の はし (27,2–10)：旧水族館の 古い 取水管（札『取水口 さわらない』）。
//   行10：波の 来る 線（なぎさ）。行11〜：海。西の はし (0,5) から 防波堤と 赤い 灯台が 見える（地の文）。
//
// クリア後の 昼（11:00〜14:59）だけ 入れる（umizoi.ts の 石段 (73,34)）。満ちたら 石段へ 上がる。

import { registerMap } from '../../world/maps';
import type { MapObj, TileSpec } from '../../world/types';
import { cg } from './umizoi';

export const ISO_W = 30;
export const ISO_H = 14;

export const ISO_ROWS = [
  'KKKKKKKKKKKKKKKKKKKKKKKnKKKKKK', // 0
  'KKKKKKKKKKKKKKKKKKKKKKKnKKKKKK', // 1
  'KKKKrrrrrrKKKrrrrrrrrrrrrrrPKK', // 2
  'KKrrrrrrrrrrrrrrrppprrrrrrrPKK', // 3
  'rKKrrppprrrrrrrrrrprrrrrrrrPKK', // 4
  'rrrrrpprrrrrrrrrrrrrrrrrrrrPKK', // 5
  'rrrrrrrrrrrrrrrrrrrrrrpprrrPKK', // 6
  'rrrrrrrrrrrpprrrrrrrrrprrrrPKK', // 7
  'rrrprrrrrrrrrrrrrrrrrrrrrKrPKK', // 8
  'rrrrrrrrrrrrrrrpprrrrrrrrKKPKK', // 9
  'zzzzzzzz~~zzzzzzzzzz~zzzzzzPzz', // 10
  '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~', // 11
  '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~', // 12
  '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~', // 13
];

const LEGEND: Record<string, TileSpec> = {
  // the rock shelf of the low tide (walkable), the wet line where the waves come
  r: { ground: cg('c3_iwa'), step: 'se_step_stone' },
  z: { ground: cg('c3_nagisa'), step: 'se_step_wet' },
  n: { ground: cg('c3_ishidan'), step: 'se_step_stone' },
  // the cliff and the big dry rocks
  K: { ground: cg('c3_iwa'), solid: true, tag: 'hedge' },
  // the tide pools (still water) and the sea
  p: { ground: cg('c3_minato'), solid: true, tag: 'water' },
  '~': { ground: cg('c3_umi'), solid: true, tag: 'water' },
  // the old intake pipe of the aquarium
  P: { ground: cg('c3_iwa'), solid: true, tag: 'prop' },
};

/** めくれる 石 12（タイルの 位置）。中身は events/ch3/iso.ts の ISO_STONE_IN。 */
export const ISO_STONES: [number, number][] = [
  [4, 3], [8, 2], [10, 5], [14, 4], [16, 6], [20, 5], [24, 4], [25, 6], [6, 7], [13, 8], [19, 8], [23, 9],
];

/** 石でない 見る 所（id → 調べる タイル）。潮だまりの ふち・潮だまり・岩の 割れ目・乾いた 岩・岩の 上。 */
export const ISO_SPOTS: Record<string, [number, number]> = {
  yoroi: [5, 4],
  yadokari: [18, 3],
  agohaze: [22, 6],
  kamenote: [11, 2],
  funamushi: [2, 4],
  tamakibi: [25, 8],
};

/** 名札の 杭（名札に なる 6つ。わたした あと 立つ）。 */
export const ISO_KUI: Record<string, [number, number]> = {
  yoroi: [4, 5],
  hizara: [9, 3],
  yadokari: [16, 3],
  isogani: [21, 4],
  kamenote: [12, 3],
  funamushi: [3, 3],
};

const OBJ = (o: Record<string, unknown>): MapObj => o as unknown as MapObj;

const OBJECTS: MapObj[] = [
  // the stones (flat on the rock; examined from beside: the close-up opens with that stone)
  ...ISO_STONES.map(([x, y], i) => OBJ({ t: 'obj', id: `obj_iso_ishi_${i}`, x, y, prop: 'prop_iso_ishi', opts: { v: i % 4 }, script: 'obj_iso_t', priority: 1 })),
  // the pools, the crack, the dry rock, the rock's top
  ...Object.entries(ISO_SPOTS).map(([k, [x, y]]) => OBJ({ t: 'obj', id: `obj_iso_spot_${k}`, x, y, script: 'obj_iso_t' })),
  // the other pools (only water: the close-up)
  OBJ({ t: 'obj', id: 'obj_iso_pool_c', x: 11, y: 7, w: 2, script: 'obj_iso_t' }),
  OBJ({ t: 'obj', id: 'obj_iso_pool_e', x: 3, y: 8, script: 'obj_iso_t' }),
  OBJ({ t: 'obj', id: 'obj_iso_pool_f', x: 15, y: 9, w: 2, script: 'obj_iso_t' }),
  // the funamushi on the dry rock (they run when one comes near: events/ch3/iso.ts)
  { t: 'prop', prop: 'prop_iso_funamushi', x: 2, y: 4 } as MapObj,
  // the kamenote in the crack, the barnacles and the little winkles
  { t: 'prop', prop: 'prop_iso_kamenote', x: 11, y: 2 } as MapObj,
  // the name stakes, once the card is handed over
  ...Object.entries(ISO_KUI).map(([k, [x, y]]) => OBJ({ t: 'prop', prop: 'prop_iso_kui', x, y, opts: { k }, cond: { flag: `flag_iso_card_${k}` } })),
  ...Object.entries(ISO_KUI).map(([k, [x, y]]) => OBJ({ t: 'obj', id: `obj_iso_kui_${k}`, x, y, script: 'obj_iso_kui', solid: [0, 0, 1, 1], cond: { flag: `flag_iso_card_${k}` } })),
  // the intake pipe and its sign
  ...Array.from({ length: 9 }, (_, i) => OBJ({ t: 'prop', prop: 'prop_iso_kan', x: 27, y: 2 + i, opts: { end: i === 8 } })),
  OBJ({ t: 'prop', prop: 'prop_iso_fuda', x: 26, y: 2 }),
  OBJ({ t: 'obj', id: 'obj_iso_shusui', x: 26, y: 2, script: 'obj_iso_shusui', solid: [0, 0, 1, 1] }),
  // the view west (the breakwater and the red lighthouse, far)
  OBJ({ t: 'obj', id: 'obj_iso_nishi', x: 0, y: 5, h: 5, face: 'left', script: 'obj_iso_nishi' }),
  // the steps up to the aquarium's plaza
  { t: 'door', id: 'door_c3_iso_up', x: 23, y: 1, step: true, to: 'map_umizoi', tx: 73, ty: 33, dir: 'up', se: 'se_step_stone' } as MapObj,
];

registerMap({
  id: 'map_c3_iso',
  name: '岬の 磯',
  kind: 'outdoor',
  chapter: 3,
  stageFlag: 'flag_ch3_stage',
  rows: ISO_ROWS,
  legend: LEGEND,
  objects: OBJECTS,
  camera: 'follow',
  variant: 'outdoor',
  space: 'minato',
  outside: '#2A5A82',
  zones: [{ id: 'area_c3_iso', name: '岬の 磯', x: 0, y: 0, w: ISO_W, h: ISO_H }],
  structMats: [{ x: 0, y: 0, w: ISO_W, h: ISO_H, mat: 'c3_iwa', ch: 'K' }],
  // the first time down (events/ch3/iso.ts: once)
  onEnter: ['evt_iso_first'],
  bgm: { 4: null },
  amb: { 4: ['amb_c3_umi'] },
});
