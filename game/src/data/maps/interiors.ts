// Shop interiors (30_level_art.md 4.3–4.6; texts 10_narrative 6.2–6.6, 7.3–7.6):
// map_maruyama（肉のマルヤマ）, map_hinoya（駄菓子 ひのや）,
// map_laundry（コインランドリー ふわり）, map_koban（交番）.
//
// The ASCII is the level-design grid verbatim. Examine hit areas are placed
// where the field's examine probe can reach them: through a counter the probe
// reaches one tile beyond it, so things behind a counter sit on the row right
// behind it (e.g. the fryer and the meat chart on row 3 of the butcher's).

import '../../art/props/interiors';
import { registerMap } from '../../world/maps';
import type { MapObj, TileSpec } from '../../world/types';
import { IOBJ, ITALK } from './interior_text';
import './lv_logic';

const WALLS: Record<string, TileSpec> = {
  '#': { ground: 'void', solid: true, tag: 'void' },
  W: { ground: 'void', solid: true, tag: 'iwall' },
  o: { ground: 'auto', solid: true, tag: 'prop' },
  S: { ground: 'auto', solid: true, counter: true, tag: 'counter' },
  D: { ground: 'void', solid: true, door: true, tag: 'door' },
};
/** 肉屋・ひのや: wooden floors (se_step_wood). */
const WOOD_LEGEND: Record<string, TileSpec> = { ...WALLS, '.': { ground: 'shopwood' } };
/** ランドリー・交番: tiled floors (se_step_tile). */
const TILE_LEGEND: Record<string, TileSpec> = { ...WALLS, '.': { ground: 'tile_floor' } };

const O = (id: string, x: number, y: number, extra: Record<string, unknown> = {}): MapObj =>
  ({ t: 'obj', id, x, y, text: IOBJ[id], ...extra }) as MapObj;
const PR = (prop: string, x: number, y: number, opts?: Record<string, unknown>): MapObj =>
  ({ t: 'prop', prop, x, y, ...(opts ? { opts } : {}) }) as MapObj;

// ================================================================ 4.3 map_maruyama（肉のマルヤマ、10×7）

export const ROWS_MARUYAMA = [
  '#WWWWWWWW#',
  '#WWWWWWWW#',
  '#ooo...oo#',
  '#........#',
  '#SSSSSSoo#',
  '#o.......#',
  '####D#####',
];

registerMap({
  id: 'map_maruyama',
  name: '肉のマルヤマ',
  kind: 'indoor',
  rows: ROWS_MARUYAMA,
  legend: WOOD_LEGEND,
  camera: 'fixed',
  space: 'room',
  theme: 'shop',
  light: 'top',
  onEnter: ['lv_in_maruyama'],
  bgm: { 0: 'bgm_shop', 1: 'bgm_shop', 2: 'bgm_shop' },
  amb: { 0: ['amb_oil'], 1: ['amb_oil'], 2: ['amb_oil'], 3: ['amb_oil'] },
  objects: [
    PR('in_mr_shell', 0, 0),
    // furniture (north wall, left to right)
    PR('in_mr_prep', 1, 2),
    PR('in_mr_fryer', 2, 2),
    PR('in_mr_freezer', 7, 2),
    PR('in_mr_showcase', 1, 4),
    PR('in_mr_register', 7, 4),
    PR('in_mr_scale', 8, 4),
    PR('in_mr_board', 1, 5),
    PR('in_mr_clock', 4, 0),
    PR('in_mr_noren', 4, 6),
    PR('in_mr_bulb', 3, 3, { v: 0 }),
    PR('in_mr_bulb', 6, 3, { v: 1 }),
    // examine (from row 5 facing north: x2 chart, x3 fryer, x4 丸山, x5 showcase, x6 ledger, x7 cat, x8 scale)
    O('obj_meat_chart', 2, 3),
    O('obj_fryer', 3, 3),
    O('obj_showcase', 5, 4),
    O('obj_tsuke_book', 6, 4),
    O('obj_manekineko', 7, 4),
    O('obj_scale', 8, 4),
    O('obj_menu_meat', 1, 5),
    {
      t: 'npc', id: 'npc_maruyama', x: 4, y: 3, dir: 'down', script: 'npc_maruyama', talk: ITALK.npc_maruyama,
      move: { kind: 'stand' },
    },
    { t: 'door', id: 'door_town_maruyama', x: 4, y: 6, to: 'map_town', tx: 27, ty: 22, dir: 'down', se: ['se_door_glass', 'se_shop_bell'] },
  ],
});

// ================================================================ 4.4 map_hinoya（駄菓子 ひのや、10×8）

// 4.4's grid with the pig mosquito-coil holder's tile (3,6) made solid: the
// follower arrives beside Minato at the door and would stand on it.
export const ROWS_HINOYA = [
  '#WWWWWWWW#',
  '#WWWWWWWW#',
  '#o......o#',
  '#oSSSSSoo#',
  '#o.....oo#',
  '#...oo..o#',
  '#..o....o#',
  '####D#####',
];

registerMap({
  id: 'map_hinoya',
  name: '駄菓子 ひのや',
  kind: 'indoor',
  rows: ROWS_HINOYA,
  legend: WOOD_LEGEND,
  camera: 'fixed',
  space: 'room',
  theme: 'shop',
  light: 'top',
  onEnter: ['lv_in_hinoya'],
  bgm: { 0: 'bgm_shop', 1: 'bgm_shop', 2: 'bgm_shop' },
  amb: { 0: ['amb_clock_tick'], 1: [], 2: [] },
  objects: [
    PR('in_hi_shell', 0, 0),
    PR('in_hi_clock', 1, 0),
    PR('in_hi_back', 2, 2),
    PR('in_hi_fan', 6, 2),
    PR('in_hi_bungu', 1, 2),
    PR('in_hi_counter', 2, 3),
    PR('in_hi_shelf_n', 8, 2),
    PR('in_hi_dagashi', 7, 3),
    PR('in_hi_shelf_e', 8, 5),
    PR('in_hi_jars', 4, 5),
    PR('in_hi_kayari', 3, 6),
    PR('in_hi_ramune', 8, 6),
    PR('in_hi_mat', 4, 6),
    // examine
    O('obj_bungu', 1, 2, { h: 3 }),
    O('obj_class_photo', 3, 2, { face: 'up' }),
    O('obj_kids_drawings', 6, 2, { face: 'up' }),
    O('obj_kuji', 5, 3),
    O('obj_dagashi_shelf', 7, 3, { w: 2, h: 3 }),
    O('obj_dagashi_shelf', 8, 2, { id: 'obj_dagashi_shelf_n', script: 'obj_dagashi_shelf' }),
    O('obj_kayaributa', 3, 6),
    O('obj_ramune_case', 8, 6),
    {
      t: 'npc', id: 'npc_obaa', x: 4, y: 2, dir: 'down', script: 'npc_obaa', talk: ITALK.npc_obaa, pose: 'breathe',
      move: { kind: 'stand' },
    },
    { t: 'door', id: 'door_town_hinoya', x: 4, y: 7, to: 'map_town', tx: 32, ty: 22, dir: 'down', se: ['se_door', 'se_shop_bell'] },
  ],
});

// ================================================================ 4.5 map_laundry（コインランドリー ふわり、12×7）

export const ROWS_LAUNDRY = [
  '#WWWWWWWWWW#',
  '#WWWWWWWWWW#',
  '#.oooooo.oo#',
  '#..........#',
  '#..ooo...oo#',
  '#o.........#',
  '###D########',
];

registerMap({
  id: 'map_laundry',
  name: 'コインランドリー ふわり',
  kind: 'indoor',
  rows: ROWS_LAUNDRY,
  legend: TILE_LEGEND,
  camera: 'fixed',
  space: 'room',
  theme: 'shop',
  light: 'top',
  bgm: { 0: 'bgm_shop', 1: 'bgm_shop', 2: 'bgm_shop' },
  amb: { 0: ['amb_dryer'], 1: ['amb_dryer'], 2: ['amb_dryer'] },
  objects: [
    PR('in_ld_shell', 0, 0),
    PR('in_ld_clock', 8, 0),
    ...[1, 2, 3, 4, 5, 6].map((n) => PR('in_ld_dryer', n + 1, 2, { n })),
    PR('in_ld_washer', 9, 2),
    PR('in_ld_bench', 3, 4),
    PR('in_ld_table', 9, 4),
    PR('in_ld_vend', 1, 5),
    // examine
    O('obj_laundry_notice', 1, 1, { face: 'up' }),
    O('obj_dryer_1', 2, 2),
    O('obj_dryer_2', 3, 2),
    O('obj_dryer_3', 4, 2, { text: undefined, fushigi: 'fushigi_05' }),
    O('obj_dryer_4', 5, 2),
    O('obj_dryer_5', 6, 2),
    O('obj_dryer_6', 7, 2),
    O('obj_laundry_clock', 8, 1, { face: 'up' }),
    O('obj_laundry_mag', 3, 4),
    O('obj_lost_socks', 9, 4, { w: 2 }),
    O('obj_detergent_vend', 1, 5),
    {
      t: 'npc', id: 'npc_inui', x: 4, y: 4, dir: 'up', script: 'npc_inui', talk: ITALK.npc_inui, pose: 'sit',
      move: { kind: 'stand' }, off: [0, -3],
    },
    { t: 'door', id: 'door_town_laundry', x: 3, y: 6, to: 'map_town', tx: 26, ty: 32, dir: 'down', se: 'se_door_glass' },
  ],
});

// ================================================================ 4.6 map_koban（交番、9×7）

// 4.6's grid plus four lived-in corners made solid: the tea cabinet (1,2),
// the standing fan (6,2), the umbrella stand (1,5) and the visitors' pipe
// chair (7,5).
export const ROWS_KOBAN = [
  '#WWWWWWW#',
  '#WWWWWWW#',
  '#o....oo#',
  '#..ooo.o#',
  '#.......#',
  '#o.....o#',
  '####D####',
];

registerMap({
  id: 'map_koban',
  name: '夕鳴銀座 交番',
  kind: 'indoor',
  rows: ROWS_KOBAN,
  legend: TILE_LEGEND,
  camera: 'fixed',
  space: 'room',
  theme: 'shop',
  light: 'top',
  bgm: { 0: 'bgm_shop', 1: 'bgm_shop', 2: 'bgm_shop' },
  amb: { 0: ['amb_koban'], 1: ['amb_koban'], 2: ['amb_koban'] },
  objects: [
    PR('in_kb_shell', 0, 0),
    PR('in_kb_board', 5, 0),
    PR('in_kb_clock', 6, 0),
    PR('in_kb_locker', 7, 2),
    PR('in_kb_desk', 3, 3),
    PR('in_kb_lostbox', 7, 3),
    PR('in_kb_mat', 4, 5),
    // lived-in extras on the free corners (solid 'o' cells in the grid above)
    PR('in_kb_tea', 1, 2),
    PR('in_kb_fan', 6, 2),
    PR('in_kb_umbrella', 1, 5),
    PR('in_kb_chair', 7, 5),
    // examine
    O('obj_koban_poster', 1, 1, { face: 'up' }),
    O('obj_koban_map', 2, 1, { w: 3, face: 'up' }),
    O('obj_koban_board', 5, 1, { w: 2, face: 'up', fushigi: 'fushigi_06' }),
    O('obj_koban_diary', 3, 3),
    O('obj_koban_teacup', 5, 3),
    O('obj_koban_lostbox', 7, 3),
    O('obj_koban_tea', 1, 2),
    O('obj_koban_fan', 6, 2),
    O('obj_koban_umbrella', 1, 5),
    {
      t: 'npc', id: 'npc_tsurumi', x: 4, y: 4, dir: 'down', script: 'npc_tsurumi', talk: ITALK.npc_tsurumi,
      move: { kind: 'stand' },
    },
    { t: 'door', id: 'door_town_koban', x: 4, y: 6, to: 'map_town', tx: 51, ty: 32, dir: 'down', se: 'se_door_glass' },
  ],
});
