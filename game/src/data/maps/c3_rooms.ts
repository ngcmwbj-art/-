// The rooms of 海ぞいの町 the first part needs (62_ch3_level_art 4.2・4.3):
// 食堂 かもめ (map_c3_shokudo) and 港の 市場 (map_c3_ichiba). Rows are 62's
// grids verbatim. The people and the things say what the scenario registers
// by their ids (events/ch3/umizoi.ts); the auction (S07), the set meal
// (S08) and あぜ道市's shops (S10) are the second part's.

import '../../art/props/c3_rooms';
import { registerMap } from '../../world/maps';
import type { MapObj, TileSpec } from '../../world/types';

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

const S12 = { stage: '1-2' };

// ================================================================ 4.3 map_c3_shokudo（食堂 かもめ、16×9）

const ROWS_SHOKUDO = [
  '#WWWWWWWWWWWWWW#', // 0
  '#WWWWWWWWWWWWWW#', // 1
  '#KKKKKKkk#TTTTT#', // 2
  '#Okkkkkkk#TTTTT#', // 3
  '#SSSSSSkk.TTTTT#', // 4
  '#tttttttttTTTTT#', // 5
  '#tttttttttttttt#', // 6
  '#ttttttttttttoo#', // 7
  '#######DD#######', // 8
];

registerMap({
  id: 'map_c3_shokudo',
  name: '食堂 かもめ',
  kind: 'indoor',
  chapter: 3,
  stageFlag: 'flag_ch3_stage',
  rows: ROWS_SHOKUDO,
  legend: {
    ...WALLS,
    t: { ground: 'shopwood', step: 'se_step_wood' },
    '.': { ground: 'shopwood', step: 'se_step_wood' },
    k: { ground: 'kitchen', step: 'se_step_wood' },
    K: { ground: 'kitchen', solid: true, tag: 'prop' },
    O: { ground: 'kitchen', solid: true, tag: 'prop' },
    T: { ground: 'tatami', solid: true, tag: 'prop' },
  },
  camera: 'fixed',
  space: 'room',
  light: 'top',
  objects: [
    PR('prop_c3_shokudo_shell', 0, 0),
    PR('prop_c3_shokudo_kitchen', 1, 2),
    PR('prop_c3_shokudo_fridge', 1, 3),
    PR('prop_c3_shokudo_counter', 1, 4),
    ...[1, 2, 4, 5, 6].map((x) => PR('prop_c3_stool', x, 5)),
    PR('prop_c3_shokudo_tatami', 10, 2),
    PR('prop_c3_shokudo_reji', 13, 7),
    { t: 'door', id: 'door_c3_shokudo_out', x: 7, y: 8, w: 2, to: 'map_umizoi', tx: 30, ty: 16, dir: 'down', se: 'se_door_glass' },
    // examine (60 9.3): the blackboard from the counter's end, the menu cards over the tatami's edge
    O('obj_c3_kokuban', 4, 1, { face: 'up' }),
    O('obj_c3_menu', 10, 5, { w: 5, face: 'up' }),
    // ナミエ behind the counter, ゴロウ on his stool (62 4.3)
    { t: 'npc', id: 'npc_c3_shokudo', x: 4, y: 3, dir: 'down', cond: S12 },
    { t: 'npc', id: 'npc_c3_jouren', x: 3, y: 5, dir: 'up', pose: 'sit', off: [0, 1], cond: S12 },
  ] as MapObj[],
  bgm: { 1: 'bgm_umi_noon', 2: 'bgm_umi_noon' },
});

// ================================================================ 4.2 map_c3_ichiba（港の 市場、37×12）

const ROWS_ICHIBA = [
  '#####################################', // 0
  '#WWWWWWWWWWWWWWWWWW#WWWWWWWWWWWWWWWW#', // 1
  '#WWWWWWWWWWWWWWWWWW#WWWWWWWWWWWWWWWW#', // 2
  '#ccccccccoocccccccc#vvvvvvvvvvvvvvvc#', // 3
  '#cXXXXccccccccXXXXc#SSSSSSSSSSSSSSSc#', // 4
  '#cXXXXcc,,,,ccXXXXcccccccccccccccccc#', // 5
  '#cccccc,,,,,,ccccccccccccccccccccccc#', // 6
  '#cXXXXcc,,,,ccXXXXc#vvvvvvvvvvvvvvvc#', // 7
  '#cXXXXccccccccXXXXc#SSSSSSSSSSSSSSSc#', // 8
  '#cccccccccccccccccc#cccccccccccccccc#', // 9
  '#oocccccccccccccccc#ccccccccccccccoc#', // 10
  '#####DD##########################DD##', // 11
];

registerMap({
  id: 'map_c3_ichiba',
  name: '港の 市場',
  kind: 'indoor',
  chapter: 3,
  stageFlag: 'flag_ch3_stage',
  rows: ROWS_ICHIBA,
  legend: {
    ...WALLS,
    c: { ground: 'tile_floor', step: 'se_step_wet' },
    ',': { ground: 'tile_floor', step: 'se_step_wet' },
    X: { ground: 'tile_floor', solid: true, tag: 'prop' },
    v: { ground: 'tile_floor', solid: true, tag: 'prop' },
  },
  camera: 'follow',
  space: 'room',
  light: 'top',
  objects: [
    PR('prop_c3_ichiba_shell', 0, 0),
    ...[[2, 4], [14, 4], [2, 7], [14, 7]].map(([x, y], i) => PR('prop_c3_sakanabako', x, y, { v: i })),
    PR('prop_c3_seridai', 9, 3),
    PR('prop_c3_hakari', 1, 10),
    PR('prop_c3_hose', 34, 10),
    ...[20, 25, 30].flatMap((x, i) => [PR('prop_c3_akimise', x, 3, { v: i }), PR('prop_c3_akimise', x, 7, { v: i + 1 })]),
    { t: 'door', id: 'door_c3_seri_out', x: 5, y: 11, w: 2, to: 'map_umizoi', tx: 10, ty: 24, dir: 'down' },
    { t: 'door', id: 'door_c3_azemichi_out', x: 33, y: 11, w: 2, to: 'map_umizoi', tx: 25, ty: 24, dir: 'down' },
    // ゲン in front of the auction stand, ツグミ beside him (62 4.2)
    { t: 'npc', id: 'npc_c3_seri', x: 9, y: 4, dir: 'down', cond: S12 },
    { t: 'npc', id: 'npc_c3_seri_deshi', x: 11, y: 4, dir: 'down', cond: S12 },
  ] as MapObj[],
  bgm: { 1: 'bgm_umi_noon', 2: 'bgm_umi_noon' },
});
