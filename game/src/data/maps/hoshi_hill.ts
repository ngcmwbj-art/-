// map_hoshi_hill — 星見の丘 (52_ch2_level_art 5章). 24×20: the dark cedar path
// winding up from the mouth of the hill path (the village (48–49,0)) to the
// open top: the disaster loudspeaker's pole (ヨビモドシ) east of centre, the
// empty telescope pier, the bench, the fence with the eastern sky beyond it.
// (★2026-10-01 依頼主の指示、02 #80: the village observatory's white dome
// that stood to the west has moved to the little hill behind the school,
// map_hoshi_urayama; the plaza's west is open grass now.)

import { setDownhillOpen } from '../../art/tiles/hoshi_struct';
import { registerMap } from '../../world/maps';
import type { MapObj } from '../../world/types';
import { hg, O, PR } from './hoshi_common';

const ROWS = [
  'HHHHHHHHHHHHHHHHHHHHHHHH', // 0
  'F,,,,,,,,,,,,,,,,,,,,,,F', // 1
  'F,,,,,,,,,,,,,,oo,,,,,,F', // 2
  'F,,,,,,,,,,o,,,oo,,,,,,F', // 3
  'F,,,,,,,,,,,,,,,,,,,,,,F', // 4
  'F,,,,,,,,,,,,,,,,,,,,,,F', // 5
  'F,,,,,,,,,,,,,,,,,,oo,,F', // 6
  'F,,,,,,,,,,,,,,,,,,,,,,F', // 7
  'HHHHHHHHHHHHHHHHH::HHHHH', // 8
  'HHHHHTHHHHHHHHHHH::HHHHH', // 9
  'HHHHH:::::::::::::::HHHH', // 10
  'HHHHH::::::::::::::THHHH', // 11
  'HHHHH::HHHHHHHHHHHHHHHHH', // 12
  'HHHHT::HHHHHHHHHHHHHHHHH', // 13
  'HHHHH::::::::HHHHHHHHHHH', // 14
  'HHHHH::::::::HHHHHHHHHHH', // 15 (the fallen sign of the viewing party moved to map_hoshi_urayama, 02 #80)
  'HHHHHHHHHHH::HHHHHHHHHHH', // 16
  'HHHHHHHHHHH::THHHHHHHHHH', // 17
  'HHHHHHHHHHH::HHHHHHHHHHH', // 18
  'HHHHHHHHHHHDDHHHHHHHHHHH', // 19
];

setDownhillOpen((x, y) => {
  const c = ROWS[y]?.[x];
  return c !== undefined && c !== 'H' && c !== 'T';
});

const OBJECTS: MapObj[] = [
  // (the observatory moved to the little hill behind the school: map_hoshi_urayama, 02 #80)
  PR('prop_h_susuki', 3, 2, { v: 1 }),
  PR('prop_h_susuki', 6, 4, { v: 2 }),
  PR('prop_h_goldenrod', 2, 5, { v: 3 }),
  PR('prop_h_speaker_pole', 15, 2),
  PR('prop_h_pier', 11, 3),
  PR('prop_h_hill_bench', 19, 6),
  // the cedars standing out beside the path (T); the ones just below open ground are kept short
  PR('prop_h_hill_trunk', 5, 9, { v: 0, h: 42 }),
  PR('prop_h_hill_trunk', 19, 11, { v: 1, h: 30 }),
  PR('prop_h_hill_trunk', 4, 13, { v: 2, marks: 1 }),
  PR('prop_h_hill_trunk', 13, 17, { v: 3, h: 44 }),
  PR('prop_h_hill_view', 23, 1),
  // examine (52 5章)
  O('obj_hoshi_speaker_plate', 15, 3, { face: 'up', cond: { flag: 'flag_ch2_boss_beaten' } }),
  O('obj_hoshi_pier', 11, 3),
  O('obj_hoshi_hill_bench', 19, 6, { w: 2 }),
  O('obj_hoshi_view_east', 23, 4, { face: 'right' }),
  O('obj_hoshi_view_west', 0, 6, { face: 'left' }),
  O('obj_hoshi_sugi', 4, 13, { face: 'left' }),
  // triggers (52 1.6)
  { t: 'trig', id: 'trig_ch2_hill_top', x: 1, y: 1, w: 22, h: 7, cond: { notFlag: 'flag_ch2_hill_top' } },
  { t: 'trig', id: 'trig_ch2_boss_intro', x: 13, y: 4, w: 6, h: 2, script: 'evt_ch2_boss_intro', cond: { notFlag: 'flag_ch2_boss_beaten' } },
  { t: 'door', id: 'door_hoshi_hill_out', x: 11, y: 19, to: 'map_hoshimidai', tx: 48, ty: 1, dir: 'down', se: 'se_step_dirt' },
  { t: 'door', id: 'door_hoshi_hill_out_e', x: 12, y: 19, to: 'map_hoshimidai', tx: 49, ty: 1, dir: 'down', se: 'se_step_dirt' },
];

registerMap({
  id: 'map_hoshi_hill',
  name: '星見の丘',
  kind: 'outdoor',
  chapter: 2,
  stageFlag: 'flag_ch2_stage',
  rows: ROWS,
  legend: {
    H: { ground: 'grass', solid: true, tag: 'hedge' },
    F: { ground: hg('h_hilltop'), solid: true, tag: 'fence' },
    ':': { ground: hg('h_yamamichi'), step: 'se_step_dirt' },
    ',': { ground: hg('h_hilltop'), step: 'se_step_gravel' },
    '^': { ground: hg('h_hilltop'), solid: true, tag: 'roof' },
    W: { ground: hg('h_hilltop'), solid: true, tag: 'facade' },
    T: { ground: hg('h_yamamichi'), solid: true, tag: 'trunk' },
    o: { ground: 'auto', solid: true, tag: 'prop' },
    D: { ground: hg('h_yamamichi'), solid: true, door: true },
  },
  objects: OBJECTS,
  camera: 'follow',
  // the plaza (y ≤ 7): the camera holds still over the whole of it (52 5章, trig_ch2_hill_top)
  camLocks: [{ x: 0, y: 0, w: 24, h: 8, at: [12, 4] }],
  onEnter: ['evt_ch2_hill'],
  variant: 'hill',
  pa: 'yama',
  space: 'yama',
  outside: '#0B0B14',
  dark: [{ x: 0, y: 8, w: 24, h: 12 }],
  zones: [
    { id: 'area_hoshi_hill_top', name: '星見の丘', x: 0, y: 0, w: 24, h: 8, wind: 'hill' },
    { id: 'area_hoshi_hill_path', name: '星見の丘', x: 0, y: 8, w: 24, h: 12, wind: 'sugi' },
  ],
  structMats: [
    // the cedars behind the plaza stand tall; the rest of the wood falls away
    // downhill from the plaza and the path (its crowns never hide the ground you walk)
    { x: 0, y: 0, w: 24, h: 1, mat: 'sugi', ch: 'H' },
    { x: 0, y: 1, w: 24, h: 19, mat: 'sugi_down', ch: 'H' },
    { x: 0, y: 0, w: 24, h: 20, mat: 'maruta', ch: 'F' },
  ],
  bgm: { 0: 'bgm_hoshi_night', 1: 'bgm_hoshi_night', 2: 'bgm_hoshi_night' },
  amb: { 0: ['amb_h_insects', 'amb_h_wind'], 1: ['amb_h_insects', 'amb_h_wind', 'amb_h_yama'], 2: ['amb_h_insects', 'amb_h_wind', 'amb_h_yama', 'amb_h_pa_hum', 'amb_h_kusa'] },
});
