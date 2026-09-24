// ショッピングプラザ・ユウナリ (30_level_art.md 5章; texts 10_narrative 7.12–7.16):
// M1 map_mall_hall, M2 map_mall_food, M3 map_mall_health, M4 map_mall_2f,
// M5 map_mall_maigo.
//
// Route: M1 (the floor guide says "the key is at the food court") → M2 (the
// ever-turning kaitenyaki machine, fushigi_12 = key) → M2's STAFF door opens
// the backyard shortcut to M3 (or back through M1) → M3's stopped escalator →
// M4 (the required ソウジロウ behind the 清掃中 sign, the rest bench) → M5.

import '../../art/props/mall';
import { registerMap } from '../../world/maps';
import type { MapObj, TileSpec } from '../../world/types';
import { IOBJ, IREWARD3 } from './interior_text';
import { CLEANING_SPEC } from './lv_logic';

const MALL_LEGEND: Record<string, TileSpec> = {
  '#': { ground: 'void', solid: true, tag: 'void' },
  W: { ground: 'void', solid: true, tag: 'iwall' },
  m: { ground: 'mall' },
  o: { ground: 'mall', solid: true, tag: 'prop' },
  S: { ground: 'mall', solid: true, counter: true, tag: 'counter' },
  D: { ground: 'void', solid: true, door: true, tag: 'door' },
  E: { ground: 'mall', door: true, tag: 'exit' },
  U: { ground: 'mall', door: true, tag: 'escalator', step: 'se_escalator_step' },
  e: { ground: 'mall', tag: 'escalator', step: 'se_escalator_step' },
  // 清掃中の看板: solid until the 2F ソウジロウ is beaten (lv_logic flips `solid`)
  C: CLEANING_SPEC,
  F: { ground: 'void', solid: true, tag: 'rail' },
};

const O = (id: string, x: number, y: number, extra: Record<string, unknown> = {}): MapObj =>
  ({ t: 'obj', id, x, y, text: IOBJ[id], ...extra }) as MapObj;
const PR = (prop: string, x: number, y: number, opts?: Record<string, unknown>): MapObj =>
  ({ t: 'prop', prop, x, y, ...(opts ? { opts } : {}) }) as MapObj;

const MALL_BGM = { 0: 'bgm_mall', 1: 'bgm_mall', 2: 'bgm_mall' };

// ================================================================ 5.1 M1 正面ホール（22×15）

export const ROWS_M1 = [
  '#WWWWWWWWWWWWWWWWWWWW#',
  '#WWWWWWWWWWWWWWWWWWWW#',
  '#WWWWWWWWWWWWWWWWWWWW#',
  '#mmmmmmmmmmmmmmmoooom#',
  '#mmmmmmmmmmmmmmmoooom#',
  '#moommmmmmmmmmmmmmomm#',
  '#mmmmmmmoooooommmmmmm#',
  'EmmmmmmmoooooommmmmmmE',
  'EmmmmmmmoooooommmmmmmE',
  '#mmmmmmmoooooommmmmmm#',
  '#mmmmmmmmmmmmmmmmmmmm#',
  '#mmommmmmmmmmommmmomm#',
  '#mmmSSSSmmmmmmmmmmmmm#',
  '#mmmmmmmmmmmmmmmmmmmm#',
  '##########DD##########',
];

registerMap({
  id: 'map_mall_hall',
  name: 'ユウナリ 正面ホール',
  kind: 'indoor',
  rows: ROWS_M1,
  legend: MALL_LEGEND,
  camera: 'follow',
  space: 'hall',
  theme: 'mall',
  onEnter: ['lv_in_mall_hall'],
  bgm: MALL_BGM,
  amb: { 0: ['amb_fluorescent', 'amb_kaitenyaki', 'amb_mall_wind'], 1: ['amb_fluorescent', 'amb_kaitenyaki', 'amb_mall_wind'], 2: ['amb_fluorescent', 'amb_kaitenyaki', 'amb_mall_wind'] },
  objects: [
    PR('mall_m1_shell', 0, 0),
    PR('mall_m1_clock', 10, 0),
    PR('mall_gacha_row', 16, 3),
    PR('mall_tanabata', 2, 5),
    PR('mall_pillar', 3, 5, { v: 0 }),
    PR('mall_pillar', 18, 5, { v: 1 }),
    PR('mall_pillar', 3, 11, { v: 2 }),
    PR('mall_pillar', 18, 11, { v: 3 }),
    PR('mall_fountain', 8, 6),
    PR('mall_escalator_sign', 20, 6),
    PR('mall_floor_guide', 13, 11),
    PR('mall_info_counter', 4, 12),
    PR('mall_balloon', 15, 2),
    PR('mall_autodoor', 10, 14),
    PR('mall_shaft', 0, 0, { fx: 150, fy: 112, fw: 52, fh: 34, rise: 108, shear: 0.62, motes: 12, seed: 5101 }),
    PR('mall_exit_sign', 0, 7, { to: 'food' }),
    // examine
    O('obj_hall_clock', 10, 2, { w: 2, face: 'up' }),
    O('obj_ceiling_balloon', 15, 2, { face: 'up' }),
    O('obj_gacha_corner', 16, 3, { w: 4, h: 2 }),
    O('obj_tanabata', 2, 5),
    O('obj_fountain', 8, 6, { w: 6, h: 4, fushigi: 'fushigi_10', text: undefined }),
    O('obj_hall_escalator_sign', 20, 6, { flat: true }),
    O('obj_floor_guide', 13, 11),
    O('obj_info_counter', 4, 12, { w: 4 }),
    { t: 'door', id: 'door_town_mall', x: 10, y: 14, w: 2, to: 'map_town', tx: 50, ty: 6, dir: 'down', se: 'se_auto_door' },
    { t: 'door', id: 'door_m1_m2', x: 0, y: 7, to: 'map_mall_food', tx: 18, ty: 6, dir: 'left', step: true },
    { t: 'door', id: 'door_m1_m2_b', x: 0, y: 8, to: 'map_mall_food', tx: 18, ty: 7, dir: 'left', step: true },
    { t: 'door', id: 'door_m1_m3', x: 21, y: 7, to: 'map_mall_health', tx: 1, ty: 7, dir: 'right', step: true },
    { t: 'door', id: 'door_m1_m3_b', x: 21, y: 8, to: 'map_mall_health', tx: 1, ty: 8, dir: 'right', step: true },
  ],
});

// ================================================================ 5.2 M2 フードコート（20×13）

export const ROWS_M2 = [
  '#WWWWWWWWWWWWWWWWWW#',
  '#WWWWWWWWWWWWWWWWWW#',
  '#WWWWWWWWWWWWWWWWDW#',
  '#mmmmmmmSSSSmSSSSmm#',
  '#mmmmmmmmmmmmmmmmmm#',
  '#mmoommmoommmoommmm#',
  '#mmmmmmmmmmmmmmmmmmE',
  '#mmmmmmmmmmoommmmmmE',
  '#mmmmmmmmmmmmmmmmmm#',
  '#mmoommmoommmmoommm#',
  '#mmmmmmmmmmmmmmmmmo#',
  '#mmmmmmmmmmmmmmmmmm#',
  '####################',
];

registerMap({
  id: 'map_mall_food',
  name: 'ユウナリ フードコート',
  kind: 'indoor',
  rows: ROWS_M2,
  legend: MALL_LEGEND,
  camera: 'follow',
  space: 'hall',
  theme: 'mall',
  bgm: MALL_BGM,
  amb: { 0: ['amb_fluorescent', 'amb_kaitenyaki'], 1: ['amb_fluorescent', 'amb_kaitenyaki'], 2: ['amb_fluorescent', 'amb_kaitenyaki'] },
  objects: [
    PR('mall_m2_shell', 0, 0),
    PR('mall_kaitenyaki', 8, 3),
    PR('mall_lost_counter', 13, 3),
    PR('mall_food_table', 3, 5, { v: 0 }),
    PR('mall_food_table', 8, 5, { v: 1 }),
    PR('mall_food_table', 13, 5, { v: 2 }),
    PR('mall_food_table', 3, 9, { v: 3 }),
    PR('mall_food_table', 8, 9, { v: 4 }),
    PR('mall_food_table', 14, 9, { v: 5 }),
    PR('mall_pillar', 11, 7, { v: 4 }),
    PR('mall_water_server', 12, 7),
    PR('mall_tray_return', 18, 10),
    PR('mall_exit_sign', 19, 6, { to: 'hall', dir: 1 }),
    PR('mall_shaft', 0, 0, { fx: 98, fy: 118, fw: 46, fh: 30, rise: 104, shear: 0.6, motes: 10, seed: 5201 }),
    // examine
    O('obj_ramen_shutter', 2, 2, { w: 4, face: 'up' }),
    O('obj_menu_sign', 8, 2, { w: 4, face: 'up' }),
    O('obj_kaitenyaki', 9, 3, { w: 2, fushigi: 'fushigi_12', script: 'evt_kaitenyaki' }),
    O('obj_lost_counter', 13, 3, { w: 4 }),
    O('obj_staff_door_m2', 17, 2, { face: 'up' }),
    O('obj_food_table', 8, 5, { w: 2 }),
    O('obj_pager', 13, 5, { w: 2 }),
    O('obj_water_server', 12, 7),
    O('obj_tray_return', 18, 10, {
      reward: { item: 'item_fugashi', flag: 'flag_hidden_tray', second: true, after: IREWARD3.obj_tray_return },
    }),
    { t: 'door', id: 'door_m2_m3_staff', x: 17, y: 2, to: 'map_mall_health', tx: 2, ty: 3, dir: 'down', se: 'se_door' },
    { t: 'door', id: 'door_m1_m2', x: 19, y: 6, to: 'map_mall_hall', tx: 1, ty: 7, dir: 'right', step: true },
    { t: 'door', id: 'door_m1_m2_b', x: 19, y: 7, to: 'map_mall_hall', tx: 1, ty: 8, dir: 'right', step: true },
    { t: 'sym', id: 'sym_mall_food_01', enemies: ['enemy_soujirou'], x: 6, y: 7, dir: 'right', move: 'soujirou', restoreAt: [1, 11] },
  ],
});

// ================================================================ 5.3 M3 健康器具コーナー（16×13）

export const ROWS_M3 = [
  '#WWWWWWWWWWWWWW#',
  '#WWWWWWWWWWWWWW#',
  '#WDWWWWUWWWWWWW#',
  '#mmmmmoeommmmoo#',
  '#mmmmmoeommmmoo#',
  '#ommmmoeommmmoo#',
  '#mmmmmoeommmmoo#',
  'Emmmmmmmmmmmmoo#',
  'Emmmmmmmmmmmmoo#',
  '#mmmommmmmmmmoo#',
  '#mmmmmmmmmmmmoo#',
  '#mmmmmmmmmmmmmm#',
  '################',
];

registerMap({
  id: 'map_mall_health',
  name: 'ユウナリ 健康器具コーナー',
  kind: 'indoor',
  rows: ROWS_M3,
  legend: MALL_LEGEND,
  camera: 'follow',
  space: 'hall',
  theme: 'mall',
  onEnter: ['lv_in_mall_health'],
  bgm: MALL_BGM,
  amb: { 0: ['amb_fluorescent'], 1: ['amb_fluorescent'], 2: ['amb_fluorescent'] },
  objects: [
    PR('mall_m3_shell', 0, 0),
    PR('mall_escalator_up', 6, 2),
    ...[0, 1, 2, 3].map((k) => PR('mall_massage_chair', 13, 3 + k * 2, { v: k })),
    PR('mall_shaft', 0, 0, { fx: 94, fy: 116, fw: 50, fh: 28, rise: 100, shear: 0.58, motes: 10, seed: 5301 }),
    PR('mall_body_scale', 1, 5),
    PR('mall_burasagari', 4, 9),
    PR('mall_foot_mat', 7, 7),
    PR('mall_exit_sign', 0, 7, { to: 'hall', dir: -1 }),
    // examine
    O('obj_health_poster', 3, 2, { w: 2, face: 'up' }),
    O('obj_escalator', 6, 3, { w: 3, h: 4, fushigi: 'fushigi_11', text: undefined }),
    O('obj_escalator', 7, 2, { id: 'obj_escalator_top', fushigi: 'fushigi_11', text: undefined, script: 'obj_escalator', face: 'up' }),
    O('obj_foot_mat', 7, 7, { flat: true }),
    O('obj_body_scale', 1, 5, {
      reward: { item: 'item_hakka_ame', flag: 'flag_hidden_scale', second: true, after: IREWARD3.obj_body_scale },
    }),
    O('obj_burasagari', 4, 9),
    O('obj_massage_row', 13, 3, { w: 2, h: 8 }),
    O('obj_staff_door_m3', 2, 2, { face: 'up', cond: { notFlag: 'flag_mall_staffdoor' } }),
    { t: 'door', id: 'door_m2_m3_staff', x: 2, y: 2, to: 'map_mall_food', tx: 17, ty: 3, dir: 'down', se: 'se_door', cond: { flag: 'flag_mall_staffdoor' } },
    { t: 'door', id: 'door_m3_m4_escalator', x: 7, y: 2, to: 'map_mall_2f', tx: 2, ty: 4, dir: 'right', step: true, se: 'se_escalator_step' },
    { t: 'door', id: 'door_m1_m3', x: 0, y: 7, to: 'map_mall_hall', tx: 20, ty: 7, dir: 'left', step: true },
    { t: 'door', id: 'door_m1_m3_b', x: 0, y: 8, to: 'map_mall_hall', tx: 20, ty: 8, dir: 'left', step: true },
    { t: 'sym', id: 'sym_mall_health_01', enemies: ['enemy_momisugi'], x: 12, y: 11, dir: 'down', move: 'momisugi', restoreAt: [12, 11] },
  ],
});

// ================================================================ 5.4 M4 2F通路（22×9）

export const ROWS_M4 = [
  '#WWWWWWWWWWWWWWWWWWWW#',
  '#WWWWWWWWWWWWWWWWWWDW#',
  '#mmmmmmmmmmmmmmommmmm#',
  '#ommmmmmmmmmmmmommmmm#',
  '#UmmmmmmmmmmmmmCmmmmm#',
  '#ommmmmmmmoommmommmmm#',
  '#mmmmmmmmmmmmmmommmmm#',
  '#FFFFFFFFFFFFFFFFFFFF#',
  '######################',
];

registerMap({
  id: 'map_mall_2f',
  name: 'ユウナリ 2F通路',
  kind: 'indoor',
  rows: ROWS_M4,
  legend: MALL_LEGEND,
  camera: 'follow',
  space: 'hall',
  theme: 'mall',
  bgm: MALL_BGM,
  amb: { 0: ['amb_fluorescent'], 1: ['amb_fluorescent'], 2: ['amb_fluorescent'] },
  objects: [
    PR('mall_m4_shell', 0, 0),
    PR('mall_glasses_eye', 10, 0),
    PR('mall_escalator_down', 1, 3),
    PR('mall_rest_bench', 10, 5),
    PR('mall_mannequin', 15, 2),
    PR('mall_lost_boxes', 15, 3, { v: 0 }),
    PR('mall_lost_boxes', 15, 5, { v: 1 }),
    PR('mall_lost_boxes', 15, 6, { v: 2 }),
    { t: 'prop', prop: 'mall_cleaning_sign', x: 15, y: 4, cond: { notTaken: 'sym_mall_2f_01' } },
    { t: 'prop', prop: 'mall_cleaning_sign_down', x: 15, y: 4, cond: { taken: 'sym_mall_2f_01' } },
    PR('mall_shaft', 0, 0, { fx: 98, fy: 36, fw: 46, fh: 42, rise: 34, shear: 0.55, motes: 8, seed: 5401 }),
    PR('mall_shaft', 0, 0, { fx: 280, fy: 34, fw: 44, fh: 26, rise: 32, shear: 0.55, motes: 10, seed: 5402, a: 0.26 }),
    PR('mall_maigo_door', 19, 0),
    // examine
    O('obj_toy_shutter', 3, 1, { w: 5, face: 'up' }),
    O('obj_glasses_sign', 10, 1, { w: 3, face: 'up' }),
    O('obj_maigo_door', 19, 1, { face: 'up', script: 'evt_maigo_door' }),
    O('obj_skylight', 6, 2, { w: 3, h: 3, flat: true }),
    O('obj_rest_bench', 10, 5, { w: 2, script: 'evt_save_bench' }),
    O('obj_mannequin', 15, 2),
    O('obj_cleaning_sign', 15, 4, { cond: { notTaken: 'sym_mall_2f_01' } }),
    { t: 'trig', id: 'trig_maigo_door_rest', x: 18, y: 2, w: 3, h: 2, once: true, script: 'trig_maigo_door_rest', cond: { flag: 'flag_maigo_door_open' } },
    { t: 'door', id: 'door_m4_m5', x: 19, y: 1, to: 'map_mall_maigo', tx: 6, ty: 9, dir: 'up', se: 'se_door_heavy', cond: { flag: 'flag_maigo_door_open' } },
    { t: 'door', id: 'door_m3_m4_escalator', x: 1, y: 4, to: 'map_mall_health', tx: 7, ty: 3, dir: 'down', step: true, se: 'se_escalator_step' },
    { t: 'sym', id: 'sym_mall_2f_01', enemies: ['enemy_soujirou'], x: 8, y: 3, dir: 'right', move: 'soujirou', restoreAt: [8, 2] },
  ],
});

// ================================================================ 5.5 M5 迷子センター（14×11）

export const ROWS_M5 = [
  '#WWWWWWWWWWWW#',
  '#WWWWWWWWWWWW#',
  '#WWWWWWWWWWWW#',
  '#mmSSSSSooooo#',
  '#mmmmmmmoooom#',
  '#mmmmmmmoooom#',
  '#mmmmmmmmmmmm#',
  '#moommmmmmmmm#',
  '#mmmmmmmmmmmm#',
  '#mmmmmmmmmmmm#',
  '######D#######',
];

registerMap({
  id: 'map_mall_maigo',
  name: 'ユウナリ 迷子センター',
  kind: 'indoor',
  rows: ROWS_M5,
  legend: MALL_LEGEND,
  camera: 'fixed',
  space: 'maigo',
  theme: 'mall',
  bgm: { 0: null, 1: null, 2: null },
  amb: { 0: ['amb_fluorescent_flicker'], 1: ['amb_fluorescent_flicker'], 2: ['amb_fluorescent_flicker'] },
  objects: [
    PR('mall_m5_shell', 0, 0),
    PR('mall_maigo_counter', 3, 3),
    PR('mall_lost_pile', 8, 3),
    PR('mall_kids_locker', 12, 3),
    PR('mall_kids_chairs', 2, 7),
    PR('mall_maigo_tube', 6, 2),
    PR('mall_mobile', 2, 6),
    // examine (log and mic before the counter: the first match wins)
    O('obj_maigo_log', 4, 3),
    O('obj_broadcast_mic', 6, 3),
    O('obj_maigo_counter', 3, 3, { w: 5 }),
    O('obj_lost_pile', 8, 3, { w: 4, h: 3 }),
    O('obj_maigo_poster', 1, 2, { face: 'up' }),
    { t: 'trig', id: 'trig_boss_intro', x: 5, y: 6, w: 3, h: 1, script: 'evt_boss_intro', cond: { notFlag: 'flag_boss_beaten' } },
    { t: 'door', id: 'door_m4_m5', x: 6, y: 10, to: 'map_mall_2f', tx: 19, ty: 2, dir: 'down', se: 'se_door_heavy' },
  ],
});
