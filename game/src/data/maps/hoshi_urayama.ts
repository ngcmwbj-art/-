// map_hoshi_urayama — 分校の 裏の 丘（★2026-10-01 依頼主の指示、02_ch2_index #80）。
// 「天文台は 分校の 裏の 小さな 丘に。まつ先生たちが いる 建物の いちばん 右の 部屋に
// 扉を 付けて、そこから 行ける ように」：旧 星見台分校の 放送室の 裏口 (24,2) から 出る、
// 1画面ほどの 小さな 丘。草の 斜面を 細い 坂道が のぼり、てっぺんに 村営 天文台の
// 白い ドーム（prop_h_dome。星見の丘から ここへ 移した）。東の 柵の 向こうは 夜明け前の 空。
// ドームの 戸 (11,5) は 天文台の 鍵が あるときだけ 開く（map_hoshi_dome）。下の 口 (10–11,13)
// から 分校の 放送室へ もどる。暗がりでは ない（夜明け前の 薄明。中だけが 暗い）。
//
//      012345678901234567890123
//   0  HHHHHHHHHHHHHHHHHHHHHHHH   丘の うしろの 杉
//   1  F,,,,,,,^^^^^^^,,,,,,,,F   村営 天文台 (8–14,1–5)
//   4  F,,,,,,,WWWWWWW,,,,,,,,F   小窓 (8,4)
//   5  F,,,,,,,WWWWWWW,,,,,,,,F   戸 (11,5)
//   6  F,,,,,,,,,,::,,,,,,,,,,F   東の 空 (23,4)
//   8  YYYY""""""::"""""""YYYYY   草の 斜面と 細い 坂道
//  13  YYYYYYYYYYDDYYYYYYYYYYYY   分校の 裏口へ

import { registerMap } from '../../world/maps';
import type { MapObj } from '../../world/types';
import { hg, O, O2, PR } from './hoshi_common';
import { R2_MISC } from '../text/hoshi_rooms2';

const ROWS = [
  'HHHHHHHHHHHHHHHHHHHHHHHH', // 0
  'F,,,,,,,^^^^^^^,,,,,,,,F', // 1
  'F,,,,,,,^^^^^^^,,,,,,,,F', // 2
  'F,,,,,,,^^^^^^^,,,,,,,,F', // 3
  'F,,,,,,,WWWWWWW,,,,,,,,F', // 4
  'F,,,,,,,WWWWWWW,,,,,,,,F', // 5
  'F,,,,,,,,,,::,,,,,,,,,,F', // 6
  'F,,,,,,,,,,::,,,,,,,,,,F', // 7
  'YYYY""""""::"""""""YYYYY', // 8
  'YYYYY"""""::""""""YYYYYY', // 9
  'YYYYY""""::"""""""YYYYYY', // 10
  'YYYYYY"""::""""""YYYYYYY', // 11
  'YYYYYYY""::""""""YYYYYYY', // 12
  'YYYYYYYYYYDDYYYYYYYYYYYY', // 13
];

const OBJECTS: MapObj[] = [
  // the observatory (moved here from 星見の丘): shut, or its slit open once it was opened inside (02 #77)
  PR('prop_h_dome', 8, 1, undefined, { cond: { notFlag: 'flag_dome_slit' } }),
  PR('prop_h_dome', 8, 1, { open: 1 }, { cond: { flag: 'flag_dome_slit' } }),
  // beyond the east fence: the slope's cedar tops and the sky before dawn
  PR('prop_h_hill_view', 23, 1),
  // the sign of the viewing party, fallen by the path (stood up once looked at)
  PR('prop_h_kanbou_board', 13, 10),
  PR('prop_h_susuki', 6, 9, { v: 1 }),
  PR('prop_h_susuki', 16, 11, { v: 2 }),
  PR('prop_h_goldenrod', 7, 11, { v: 1 }),
  PR('prop_h_goldenrod', 17, 9, { v: 3 }),
  // examine
  O('obj_hoshi_dome', 11, 5, { face: 'up' }),
  { t: 'obj', id: 'obj_hr_dome_mado', x: 8, y: 4, face: 'right', text: R2_MISC.obj_hr_dome_mado } as MapObj,
  O('obj_hoshi_kanbou_board', 13, 10, { face: 'left' }),
  O2('obj_hoshi_view_east', 1, 23, 4, { face: 'right' }),
  // the observatory's door (11,5): only with 天文台の鍵 from まつ先生 (02 #77, map_hoshi_dome)
  { t: 'door', id: 'door_hoshi_dome', x: 11, y: 5, to: 'map_hoshi_dome', tx: 6, ty: 8, dir: 'up', se: ['se_dome_unlock', 'se_dome_door'], cond: { flag: 'flag_dome_key', notFlag: 'flag_ch2_boss_beaten' } },
  // down the path to the school's back door (the 放送室, 24,3)
  { t: 'door', id: 'door_hoshi_urayama_out', x: 10, y: 13, to: 'map_hoshi_school', tx: 24, ty: 3, dir: 'down', se: 'se_door' },
  { t: 'door', id: 'door_hoshi_urayama_out_e', x: 11, y: 13, to: 'map_hoshi_school', tx: 24, ty: 3, dir: 'down', se: 'se_door' },
];

registerMap({
  id: 'map_hoshi_urayama',
  name: '分校の 裏の 丘',
  kind: 'outdoor',
  chapter: 2,
  stageFlag: 'flag_ch2_stage',
  rows: ROWS,
  legend: {
    H: { ground: 'grass', solid: true, tag: 'hedge' },
    Y: { ground: 'grass', solid: true, tag: 'hedge' },
    F: { ground: hg('h_urayama'), solid: true, tag: 'fence' },
    ':': { ground: hg('h_yamamichi'), step: 'se_step_dirt' },
    ',': { ground: hg('h_urayama'), step: 'se_step_grass' },
    '"': { ground: hg('h_urayama'), step: 'se_step_grass' },
    '^': { ground: hg('h_urayama'), solid: true, tag: 'roof' },
    W: { ground: hg('h_urayama'), solid: true, tag: 'facade' },
    D: { ground: hg('h_yamamichi'), solid: true, door: true },
  },
  objects: OBJECTS,
  camera: 'follow',
  variant: 'hill',
  pa: 'yama',
  space: 'yama',
  outside: '#0B0B14',
  zones: [{ id: 'area_hoshi_urayama', name: '分校の 裏の 丘', x: 0, y: 0, w: 24, h: 14, wind: 'hill' }],
  structMats: [
    // the cedars behind the hilltop; low scrub down the two sides of the slope (it never hides the path)
    { x: 0, y: 0, w: 24, h: 1, mat: 'sugi', ch: 'H' },
    { x: 0, y: 8, w: 24, h: 6, mat: 'yabu', ch: 'Y' },
    { x: 0, y: 0, w: 24, h: 14, mat: 'maruta', ch: 'F' },
  ],
  bgm: { 0: 'bgm_hoshi_night', 1: 'bgm_hoshi_night', 2: 'bgm_hoshi_night' },
  amb: { 0: ['amb_h_insects', 'amb_h_wind'], 1: ['amb_h_insects', 'amb_h_wind'], 2: ['amb_h_insects', 'amb_h_wind', 'amb_h_pa_hum'] },
  ambVol: { amb_h_pa_hum: { vol: 0.3, lp: 1200 } },
});
