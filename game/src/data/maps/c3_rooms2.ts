// The rooms of 海ぞいの町 the second part needs (62_ch3_level_art 4.4〜4.7):
// サイレン塔の上 (map_c3_siren), 灯台 (map_c3_toudai), 海の家
// (map_c3_uminoie) and 海の 中 (map_c3_umi, グソっ君 alone). Rows are 62's
// grids verbatim. The people and the things say what the scenario registers
// by their ids (events/ch3); the battle (S12), the lens (S09) and the dive
// (S09) are its scenes — this file only places them.

import '../../art/props/c3_rooms2';
import { registerMap } from '../../world/maps';
import type { MapObj, TileSpec } from '../../world/types';
import { cg, teruInside } from './umizoi';

const WALLS: Record<string, TileSpec> = {
  '#': { ground: 'void', solid: true, tag: 'void' },
  W: { ground: 'void', solid: true, tag: 'iwall' },
  o: { ground: 'auto', solid: true, tag: 'prop' },
  S: { ground: 'auto', solid: true, counter: true, tag: 'counter' },
  D: { ground: 'void', solid: true, door: true, tag: 'door' },
};

const PR = (prop: string, x: number, y: number, opts?: Record<string, unknown>): MapObj =>
  ({ t: 'prop', prop, x, y, ...(opts ? { opts } : {}) }) as MapObj;
const O = (id: string, x: number, y: number, extra: Record<string, unknown> = {}): MapObj => ({ t: 'obj', id, x, y, ...extra }) as unknown as MapObj;

const S1 = { stage: 1 };
const S12 = { stage: '1-2' };

// ================================================================ 4.4 map_c3_siren（サイレン塔の上、14×11）

const ROWS_SIREN = [
  '##############', // 0
  '#oooAAAAAAooo#', // 1
  '#,,,,,,,,,,,,#', // 2
  '#,,,,,,,,,,,,#', // 3
  '#,,,,,,,,,,,,#', // 4
  '#FFFFF,,FFFFF#', // 5
  '#WWWWW==WWWWW#', // 6
  '#WWWWW==WWWWW#', // 7
  '#ccoocccccooc#', // 8
  '#cccccccccccc#', // 9
  '######DD######', // 10
];

registerMap({
  id: 'map_c3_siren',
  name: 'サイレン塔',
  kind: 'indoor',
  chapter: 3,
  stageFlag: 'flag_ch3_stage',
  rows: ROWS_SIREN,
  legend: {
    ...WALLS,
    // the lookout: concrete in the open sun; the little room's worn boards; the iron doorway between
    ',': { ground: 'tile_floor', step: 'se_step_stone' },
    c: { ground: 'wood_bare', step: 'se_step_wood' },
    '=': { ground: 'tile_floor', step: 'se_step_metal' },
    A: { ground: 'tile_floor', solid: true, tag: 'prop' },
    F: { ground: 'tile_floor', solid: true, tag: 'prop' },
  },
  camera: 'fixed',
  space: 'room',
  light: 'top',
  objects: [
    PR('prop_c3_siren_shell', 0, 0),
    PR('prop_c3_siren_saku', 1, 5),
    PR('prop_c3_nariosame', 4, 1),
    PR('prop_c3_siren_hiraishin', 1, 1),
    PR('prop_c3_siren_tenken', 10, 1),
    PR('prop_c3_siren_ban', 3, 8),
    PR('prop_c3_siren_kikai', 10, 8),
    { t: 'door', id: 'door_c3_siren_out', x: 6, y: 10, w: 2, to: 'map_umizoi', tx: 34, ty: 7, dir: 'down', se: 'se_door_heavy' },
    // examine (60 9.3・10.12; the scripts are the scenario's)
    O('obj_c3_siren_ban', 3, 8, { w: 2, face: 'up' }),
    O('obj_c3_siren_kikai', 10, 8, { w: 2, face: 'up' }),
    O('obj_c3_nariosame', 4, 1, { w: 6, face: 'up' }),
    // ミナト at his button, his finger on it (stage 1, 62 3.4); after S12 he is on the breakwater
    { t: 'npc', id: 'npc_c3_sirenban', x: 3, y: 9, dir: 'up', cond: S1 },
    // (the battle's start in front of the siren, trig_ch3_siren_top, is the scenario's: events/ch3)
  ] as MapObj[],
});

// ================================================================ 4.5 map_c3_toudai（灯台、9×7）

const ROWS_TOUDAI = [
  '#########', // 0
  '#WWWWWWW#', // 1
  '#,,LLL,,#', // 2
  '#,,LLL,,#', // 3
  '#,,,,,,,#', // 4
  '#FFF=FFF#', // 5
  '####D####', // 6
];

registerMap({
  id: 'map_c3_toudai',
  name: '灯台',
  kind: 'indoor',
  chapter: 3,
  stageFlag: 'flag_ch3_stage',
  rows: ROWS_TOUDAI,
  legend: {
    ...WALLS,
    ',': { ground: 'tile_floor', step: 'se_step_metal' },
    '=': { ground: 'tile_floor', step: 'se_step_metal' },
    L: { ground: 'tile_floor', solid: true, tag: 'prop' },
    F: { ground: 'tile_floor', solid: true, tag: 'prop' },
  },
  camera: 'fixed',
  space: 'room',
  light: 'top',
  objects: [
    PR('prop_c3_toudai_shell', 0, 0),
    PR('prop_c3_toudai_saku', 1, 5),
    PR('prop_c3_lens', 3, 2),
    { t: 'door', id: 'door_c3_toudai_out', x: 4, y: 6, to: 'map_umizoi', tx: 8, ty: 30, dir: 'down', se: 'se_door_small' },
    O('obj_c3_lens', 3, 2, { w: 3, h: 2, fushigi: 'fushigi_ch3_05' }),
    // テル by the lens, her cloth in hand, while the lens is being turned (S09: after the bracelet, until
    // the three waves move); outside on the plinth the rest of the time (umizoi.ts teruInside)
    { t: 'npc', id: 'npc_c3_toudai', x: 6, y: 4, dir: 'left', cond: { stage: 1, when: teruInside } },
  ] as MapObj[],
});

// ================================================================ 4.6 map_c3_uminoie（海の家、12×7）

const ROWS_UMINOIE = [
  '#WWWWWWWWWW#', // 0
  '#WWWWWWWWWW#', // 1
  '#KKKSttoott#', // 2
  '#kkkSttoott#', // 3
  '#kkkkttttto#', // 4
  '#tttttttttt#', // 5
  '#####DD#####', // 6
];

registerMap({
  id: 'map_c3_uminoie',
  name: '海の家',
  kind: 'indoor',
  chapter: 3,
  stageFlag: 'flag_ch3_stage',
  rows: ROWS_UMINOIE,
  legend: {
    ...WALLS,
    t: { ground: 'shopwood', step: 'se_step_wood' },
    k: { ground: 'kitchen', step: 'se_step_wood' },
    K: { ground: 'kitchen', solid: true, tag: 'prop' },
    O: { ground: 'shopwood', solid: true, tag: 'prop' },
  },
  camera: 'fixed',
  space: 'room',
  light: 'top',
  objects: [
    PR('prop_c3_uminoie_shell', 0, 0),
    PR('prop_c3_uminoie_kitchen', 1, 2),
    PR('prop_c3_uminoie_counter', 4, 2),
    PR('prop_c3_uminoie_bench', 7, 2),
    PR('prop_c3_uminoie_tana', 10, 4),
    { t: 'door', id: 'door_c3_uminoie_out', x: 5, y: 6, w: 2, to: 'map_umizoi', tx: 59, ty: 23, dir: 'down', se: 'se_door_small' },
    O('obj_c3_uminoie_menu', 5, 1, { w: 4, face: 'up' }),
    O('obj_c3_uminoie_kakigori_ki', 1, 2, { w: 3, face: 'up' }),
    O('obj_c3_uminoie_ukiwa', 10, 4, {}),
  ] as MapObj[],
});

// ================================================================ 4.7 map_c3_umi（海の 中、48×14）

const ROWS_UMI = [
  'RRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRR', // 0
  'RuuuuuuuuuuuuuuuuuuuuuRRuuuuuuuuuuuuuuuuuuuuuu^R', // 1
  'RuuuRRuuuuuuuuuRRuuuuuRRuuuuuRRuuuuuuuuuRRuuuuuR', // 2
  'RuuuRRuuuuoouuuRRuuuuuRRuuuuuRRuuuoouuuuRRuuuuuR', // 3
  'RuuuuuuuuuoouuuuuuuuuuRRuuRuuuuuuuoouuuuuuuuRRuR', // 4
  'RuuuuuuuuuuuuuuuuuuRuuuuuuRuuuuuuuuuuuuuuuuuRRuR', // 5
  'RuuRRuuuuuuuuuuuuuuRuuuuuuuuuuuuuRRRuuuuuuuuuuuR', // 6
  'RuuRRuuuuuuRRuuuuuuuuuRRuuuuuuuuuRRRuuuuuuRuuuuR', // 7
  'RuuuuuuuuuuRRuuuuuuuuuRRuuuoouuuuuuuuuuuuuRuuuuR', // 8
  'RuuuuuuuuuuuuuuuuuuuuuRRuuuoouuuuuuuuRRuuuuuuuuR', // 9
  'RuuuuuuuuuuuuuuuuuuuuuRRuuuuuuuuuuuuuRRuuuuooouR', // 10
  'R^uuuuuuuuuuuuuuuuuuuuRRuuuuuuuuRRuuuuuuuuuuuuuR', // 11
  'RuuuuuuuuuuuuuuuuuuuuuRRuuuuuuuuRRuuuuuuuuuuuuuR', // 12
  'RRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRR', // 13
];

registerMap({
  id: 'map_c3_umi',
  name: '海の 中',
  kind: 'outdoor',
  chapter: 3,
  stageFlag: 'flag_ch3_stage',
  rows: ROWS_UMI,
  legend: {
    // the floor: the harbour's mud west of the rock wall, the beach's white sand east of it (art/tiles/c3_ground.ts)
    u: { ground: cg('c3_soko'), step: 'se_c3_step_uw' },
    '^': { ground: cg('c3_soko'), step: 'se_c3_step_uw' },
    R: { ground: cg('c3_soko_iwa'), solid: true, tag: 'prop' },
    o: { ground: cg('c3_soko'), solid: true, tag: 'prop' },
  },
  objects: [
    // the light from the surface, the rock wall's faces (one flat picture over the floor)
    PR('prop_c3_umi_shell', 0, 0),
    // the ways up (S09: the harbour steps / the beach's edge)
    PR('prop_c3_umi_agari', 1, 11, { v: 'minato' }),
    PR('prop_c3_umi_agari', 46, 1, { v: 'hama' }),
    // (their triggers, trig_ch3_umi_up_minato / _hama, are the scenario's)
    // the sunk things (62 4.7): the old anchor and its chain, the big rock, the old boat, the pile of old rings
    PR('prop_c3_umi_ikari', 10, 3),
    PR('prop_c3_umi_bigrock', 34, 3),
    PR('prop_c3_umi_boat', 27, 8),
    PR('prop_c3_umi_ukiwa', 43, 10),
    // seaweed and shells (no collision)
    ...([[6, 5], [14, 9], [3, 8], [19, 3], [8, 12], [26, 2], [31, 11], [38, 6], [44, 8], [36, 12], [29, 5]] as const).map(([x, y], i) =>
      PR('prop_c3_umi_mo', x, y, { v: i % 3 }),
    ),
    // (the townspeople's lost things, obj_c3_moguri_*, are the scenario's: they take the picture
    // prop_c3_umi_otoshimono { v: 'ka' | 'shikake' | 'bracelet' | 'megane' }, flat)
    // 〔深い所のはし〕: the sand drops away into the dark blue (its examine, obj_c3_umi_fuchi, is the scenario's)
    PR('prop_c3_umi_fuchi', 45, 12),
    // the sunk letterbox (62 16.2, flag_ch3_hidden_kaitei; its text is the scenario's)
    O('obj_c3_umi_post', 10, 12, { prop: 'prop_c3_umi_post', flat: true }),
  ] as MapObj[],
  camera: 'follow',
  space: 'room',
  outside: '#1A3A5A',
});
