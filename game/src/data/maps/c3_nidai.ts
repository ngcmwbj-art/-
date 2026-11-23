// map_c3_nidai — 軽トラの 荷台 (62_ch3_level_art 4.1). 10×6: ツガオ便's bed,
// fixed in the middle of the screen while the land rushes past it (the
// scenario's flag_c3_nidai_view picks the scenery: c3_props.ts
// prop_c3_nidai_view). The rides: S04 to the sea, S14 (the trap), S32 home.
//
//   Z the gates and the cab's back   X the yellow crates, the cabbage basket   c the steel bed

import { registerMap } from '../../world/maps';
import type { MapObj } from '../../world/types';
import { cg } from './umizoi';

const ROWS = [
  'ZZZZZZZZZZ', // 0
  'ZXXXXXXccZ', // 1
  'ZXXccccccZ', // 2
  'ZccccccccZ', // 3
  'ZccccXXccZ', // 4
  'ZZZZZZZZZZ', // 5
];

const OBJECTS: MapObj[] = [
  { t: 'prop', prop: 'prop_c3_nidai_view', x: 0, y: 0 },
  { t: 'prop', prop: 'prop_c3_nidai_back', x: 0, y: 0 },
  { t: 'prop', prop: 'prop_c3_nidai_container', x: 1, y: 1, opts: { n: 6 } },
  { t: 'prop', prop: 'prop_c3_nidai_container', x: 1, y: 2, opts: { n: 2 } },
  // S14 (the trap): the black board's corner under the basket (60 9.2; until the aquarium)
  { t: 'prop', prop: 'prop_c3_nidai_kairan', x: 4, y: 4, cond: { flag: 'flag_ch3_got_gochisou', stage: '1-2' } },
  { t: 'prop', prop: 'prop_c3_nidai_cabbage', x: 5, y: 4 },
  { t: 'prop', prop: 'prop_c3_nidai_front', x: 0, y: 5 },
  // examine (60 9.1, events/ch3/umizoi.ts)
  { t: 'obj', id: 'obj_c3_nidai_container', x: 1, y: 1, w: 6, h: 2 },
  { t: 'obj', id: 'obj_c3_nidai_cabbage', x: 5, y: 4, w: 2 },
  { t: 'obj', id: 'obj_c3_nidai_aori', x: 1, y: 0, w: 8, face: 'up' },
  { t: 'obj', id: 'obj_c3_nidai_kairan', x: 5, y: 4, w: 2, priority: 1, cond: { flag: 'flag_ch3_got_gochisou', stage: '1-2' } },
] as MapObj[];

registerMap({
  id: 'map_c3_nidai',
  name: '軽トラの 荷台',
  kind: 'outdoor',
  chapter: 3,
  stageFlag: 'flag_ch3_stage',
  rows: ROWS,
  legend: {
    c: { ground: cg('c3_nidai'), step: 'se_step_metal' },
    Z: { ground: cg('c3_nidai'), solid: true, tag: 'prop' },
    X: { ground: cg('c3_nidai'), solid: true, tag: 'prop' },
  },
  objects: OBJECTS,
  camera: 'fixed',
  space: 'outdoor',
  outside: '#6B7186',
  bgm: { 0: 'bgm_tsugaobin', 1: 'bgm_tsugaobin', 2: 'bgm_tsugaobin', 4: 'bgm_tsugaobin' },
  amb: { 0: ['amb_c3_keitora'], 1: ['amb_c3_keitora'], 2: ['amb_c3_keitora'], 4: ['amb_c3_keitora'] },
});
