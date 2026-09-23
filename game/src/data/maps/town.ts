// map_town — 夕鳴町 (30_level_art.md 3章). 64×44 tiles.
// Rows are the level-design ASCII verbatim; objects add art, text and life.

import { flag } from '../../game/state';
import { registerMap } from '../../world/maps';
import type { MapObj, TileSpec } from '../../world/types';
import { OBJ, OBJ2, REWARD_TEXT, TALK } from './town_text';

const ROWS = [
  'HHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHH^^^^^^^^^^^^^^^^^^^^^^^^FbRbF,', // 0
  'H^^^^,T,,,,T,,,,,,,,,,,,T,,,,T,HHHWWWWWWWWWWWWWWWWWWWWWWWWFbRbF,', // 1
  'HWWWW,,,,,,,,,,,,,,,,,,,,,,,,,,HHHWWWWWWWWWWWWWWWWWWWWWWWWFbRbF,', // 2
  'HWWWW,:oooo:--------:ooo:,,o,,,HHHWWWWWWWWWWWWWWWWWWWWWWWWFbRbF,', // 3
  'H,,,,,::::::--------:::::,,,,T,HHHWWWWWWWWWWWWWWWWWWWWWWWWFbRbF,', // 4
  'H,,,,,::::::--------:::::,,,,,,HHHWWWWWWWWWWWWWWWWDWWWWWWWFbRbF,', // 5
  'H,T,,,oooo::---oo---:::::,,,,,,H------------oooo-----ooo--FbRbF,', // 6
  'H,,,,,::::::---oo---:::::,,,,,,H---PPPPPPPPPPPPPPPPPPPPPPPFbRbF,', // 7
  'H,,,,,::::::--------:ssss::::::H---PPPPPPPPPPPPPPPPPPPPPPPFbRbF,', // 8
  'H,,,ooo:::::--------:ssss::::::K---PPPPPYPPPPPPPPPPPPPPPPPFbRbF,', // 9
  'H,,,ooo:::::--------:sssso::T::K---PPPPPPPPPPPPPPPHTHPPPPPFbRbF,', // 10
  'H,,,,,:::::::::oo::::::::::::::K---PPPPPPPPPPoPPPPHHHPPPPPFbRbF,', // 11
  'H,,T,,:::::::::::::o:::::,,,,,,H-o-PPoooPPPPPPPPPPPPPPPYPPFbRbF,', // 12
  'H,,,,,,,,,T,,,,,,:::::::T,,,,,,H---PPoooPPPPPPPPPPPPPPPPPPFbRbF,', // 13
  'H,,,,,,,,,,,,,,,,o:::o:::,,,,,,H---PPPPPPPPPPPoPPPPPPPPPPPFbRbF,', // 14
  'HHHHHHHHHHHHHHHHHH...YHHHHHHHHHHFFFFFFFFFFFKKKFFFFFFFFFFFFFbRbF,', // 15
  'B""""""B^^^^^B^^^^...HHH^^^^^^^^^^^^^^^^^^^...^^^^^^^^^^HHFbRbF,', // 16
  'B:o::o"B^^^^^B^^^^CCCHHH^^^^^^^^^^^^^^^^^^^...^^^^^^^^^^HHFbRbF,', // 17
  'B::::""BWWWWWBWWWW...HHH^^^^^^^^^^^^^^^^^^^...^^^^^^^^^^HHFbRbF,', // 18
  'Bo"""""BWWWWWBWWWW...HHHWWWWWWWWWWWWWWWWWWW...WWWWWWWWWWHHFbRbF,', // 19
  'BFFF::oBWWWWWBWWWW...,THWWWWWWWWWWWWWWWWWWW...WWWWWWWWWWHHFbRbF,', // 20
  '.........oooo.o...zzz..oSSWDWWWWDWWSSSSWWWW...WWWWWWWWWWYoFbRbF,', // 21
  '________________..zzz..aaaoaaaooaaoaaaaoaaaaaaaoaaaoaaao..XXXXX.', // 22
  'BBBYBBTBBBBBBYBB.......aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa..XXXXX.', // 23
  'o,,,,,,,%,,ooo,B.......aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa..XXXXX.', // 24
  '^^^^^^^^%^^^^^,B.......aoaaoo%aaaoaooaaoooaaaaaoaoaaaaao..FbRbF,', // 25
  '^^^^^^^^%^^^^^,B...^^^^o^^^^^%^^^^^^^^^^^^^...^^^^^^^^HH..FbRbF,', // 26
  '^^^^^^^^%^^^^^.._o%^^^^H^^^^^%^^^^^^^^^^^^^...^^^^^^^^HH..FbRbF,', // 27
  'WWWWWWWW%WWWWW.._%YWWWWH^^^^^%^^^^^^^^^^^^^...^^^^^^^^HH..FbRbF,', // 28
  'WWWWWWWW%WWWWW.._ooWWWWHWWWWW%WWWWWWWWWWWWW...WWWWWWWW%%..FbRbF,', // 29
  'WWWWDWWW%WWWWW.._ooWWWWHWWWWW%WWWWWWWWWWWWW...WWWWWWWW%%..FbRbF,', // 30
  'BBBB%BBB%o%%%o.._oo%%o%HWWDWW%WWWWWWWWWWWWW...WWWWWDWW%o..FbRbF,', // 31
  '_____________o__________o---o-----------------------------FbRbF,', // 32
  '..........zz..............................................FbRbF,', // 33
  '..........zz..............................................FbRbF,', // 34
  'GGGGGGYGGG==GGGGTGGGGGYGGGGGTGGGGGYGGGGGTGGGGGYGGGGGTGGGGGFbRbF,', // 35
  'wwwwwwwwww==wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwbRbww', // 36
  'wwwwwwwwww==wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwbRbww', // 37
  'HHHHHHoHHH==HHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHFbRbF,', // 38
  '~~~::o:o::::::::::::::~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~FbRbF,', // 39
  '~~~:::::::::::::::::::~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~FbRbF,', // 40
  '~~~~~~~~~~~~:~~~o~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~FbRbF,', // 41
  '~~~~~~~~~~~~:~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~FbRbF,', // 42
  '~~~~~~~~~~~~:~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~FbRbF,', // 43
];

export const TOWN_LEGEND: Record<string, TileSpec> = {
  '.': { ground: 'asphalt' },
  _: { ground: 'gutter' },
  '-': { ground: 'sidewalk' },
  a: { ground: 'arcade' },
  z: { ground: 'crosswalk' },
  ',': { ground: 'grass' },
  '"': { ground: 'weeds' },
  ':': { ground: 'dirt' },
  s: { ground: 'sand' },
  '%': { ground: 'gravel' },
  P: { ground: 'lot' },
  '=': { ground: 'bridge' },
  '^': { ground: 'auto', solid: true, tag: 'roof' },
  W: { ground: 'auto', solid: true, tag: 'facade' },
  D: { ground: 'auto', solid: true, door: true, tag: 'facade' },
  S: { ground: 'auto', solid: true, counter: true, tag: 'facade' },
  B: { ground: 'auto', solid: true, tag: 'wall' },
  H: { ground: 'grass', solid: true, tag: 'hedge' },
  F: { ground: 'auto', solid: true, tag: 'fence' },
  G: { ground: 'grass', solid: true, tag: 'guardrail' },
  T: { ground: 'auto', solid: true, tag: 'trunk' },
  Y: { ground: 'auto', solid: true, tag: 'pole' },
  K: { ground: 'auto', solid: true, tag: 'chain' },
  C: { ground: 'asphalt', solid: true, tag: 'barricade' },
  o: { ground: 'auto', solid: true, tag: 'prop' },
  w: { ground: 'water', solid: true, tag: 'water' },
  '~': { ground: 'paddy', solid: true, tag: 'paddy' },
  b: { ground: 'ballast', solid: true },
  R: { ground: 'rail', solid: true },
  X: { ground: 'crossing', solid: true, tag: 'crossing' },
};

const s0 = { stage: 0 };
const s1 = { stage: 1 };
const s2 = { stage: '2+' };
const s12 = { stage: '1-2' };
const s01 = { stage: '0-1' };
const s02 = { stage: '0-2' };

const O = (id: string, x: number, y: number, extra: Record<string, unknown> = {}): MapObj => ({
  t: 'obj',
  id,
  x,
  y,
  text: OBJ[id],
  ...extra,
} as MapObj);

const OBJECTS: MapObj[] = [
  // ======================================================== buildings
  { t: 'prop', prop: 'bld_toilet', x: 1, y: 1 },
  { t: 'prop', prop: 'bld_mall', x: 34, y: 0 },
  { t: 'prop', prop: 'bld_ojii', x: 8, y: 16 },
  { t: 'prop', prop: 'bld_slopetop', x: 14, y: 16 },
  { t: 'prop', prop: 'bld_shiomi', x: 0, y: 25 },
  { t: 'prop', prop: 'bld_mizumaki', x: 9, y: 25 },
  { t: 'prop', prop: 'bld_madam', x: 19, y: 26 },
  { t: 'prop', prop: 'bld_maruyama', x: 24, y: 16 },
  { t: 'prop', prop: 'bld_hinoya', x: 30, y: 16 },
  { t: 'prop', prop: 'bld_tofu', x: 35, y: 16 },
  { t: 'prop', prop: 'bld_clock', x: 39, y: 16 },
  { t: 'prop', prop: 'bld_cafe', x: 46, y: 16 },
  { t: 'prop', prop: 'bld_sake', x: 51, y: 16 },
  { t: 'prop', prop: 'bld_laundry', x: 24, y: 26 },
  { t: 'prop', prop: 'bld_photo', x: 30, y: 26 },
  { t: 'prop', prop: 'bld_shutter', x: 35, y: 26, opts: { v: 1 } },
  { t: 'prop', prop: 'bld_shutter', x: 39, y: 26, opts: { v: 2 } },
  { t: 'prop', prop: 'bld_shutter', x: 46, y: 26, opts: { v: 3 } },
  { t: 'prop', prop: 'bld_koban', x: 50, y: 26 },

  // ======================================================== doors
  { t: 'door', id: 'door_town_home', x: 4, y: 30, to: 'map_home_1f', tx: 2, ty: 7, dir: 'up', se: 'se_door' },
  { t: 'door', id: 'door_town_maruyama', x: 27, y: 21, to: 'map_maruyama', tx: 4, ty: 5, dir: 'up', se: ['se_door_glass', 'se_shop_bell'] },
  { t: 'door', id: 'door_town_hinoya', x: 32, y: 21, to: 'map_hinoya', tx: 4, ty: 6, dir: 'up', se: ['se_door', 'se_shop_bell'] },
  { t: 'door', id: 'door_town_laundry', x: 26, y: 31, to: 'map_laundry', tx: 3, ty: 5, dir: 'up', se: 'se_door_glass' },
  { t: 'door', id: 'door_town_koban', x: 51, y: 31, to: 'map_koban', tx: 4, ty: 5, dir: 'up', se: 'se_door_glass' },
  { t: 'door', id: 'door_town_mall', x: 50, y: 5, to: 'map_mall_hall', tx: 10, ty: 13, dir: 'up', se: 'se_auto_door', cond: { flag: 'flag_ojigi_beaten' } },

  // ======================================================== A ひぐらし坂
  O('obj_minato_mailbox', 5, 31, { face: 'up' }),
  O('obj_minato_nameplate', 3, 31, { face: 'up' }),
  O('obj_outdoor_unit', 7, 29),
  O('obj_asagao', 2, 31),
  O('obj_hose', 8, 30),
  O('obj_block_hole', 15, 25),
  { ...O('obj_jizo', 17, 29, { w: 2, h: 2, script: 'evt_save_jizo' }), text: `@narr
よだれかけに はなまるの 刺しゅう。
/
……セーブしますか？
? する | しない
[する]
!save
@narr
お地蔵さんに 手を あわせた。
今日の ことを、覚えて もらった。
[しない]
@narr
お地蔵さんは、なにも 言わない。` } as MapObj,
  O('obj_garbage_sign', 17, 31, { w: 2 }),
  { ...O('obj_curve_mirror_post', 17, 27), fushigi: 'fushigi_01' } as MapObj,
  O('obj_poster_lostcat', 18, 28),
  O('obj_sokko', 16, 29),
  O('obj_neighbor_mailbox', 9, 31),
  O('obj_pots_2', 13, 31),
  O('obj_doghouse', 21, 31),
  O('obj_signpost', 13, 32),
  O('obj_akichi_hoshimono', 2, 17),
  O('obj_rusty_bike', 1, 19),
  O('obj_akichi_sign', 6, 20),
  { t: 'obj', id: 'obj_tires', x: 5, y: 17, text: REWARD_TEXT.obj_tires, reward: { item: 'item_kinakobou', flag: 'flag_hidden_tires', after: OBJ2.obj_tires } },
  O('obj_pots_1', 11, 21, { w: 2 }),
  O('obj_pots_3', 14, 21),
  O('obj_nameplate_calligraphy', 17, 20, { face: 'up' }),
  O('obj_higurashi_tree', 22, 20),
  { ...O('obj_barricade', 18, 17, { w: 3 }), cond: s0 } as MapObj,
  { t: 'obj', id: 'obj_backyard_cooler', x: 0, y: 24, text: REWARD_TEXT.obj_backyard_cooler, reward: { item: 'item_ramune', flag: 'flag_hidden_backyard', after: OBJ2.obj_backyard_cooler } },
  { t: 'prop', prop: 'prop_engawa_bench', x: 9, y: 21 },
  { t: 'prop', prop: 'prop_laundry_pole', x: 1, y: 24 },
  { t: 'prop', prop: 'prop_veg_patch', x: 11, y: 24 },
  { t: 'prop', prop: 'prop_propane', x: 8, y: 28 },
  { t: 'prop', prop: 'prop_mama_bike', x: 6, y: 31 },
  { t: 'prop', prop: 'prop_tiger_rope', x: 1, y: 20 },
  { t: 'prop', prop: 'prop_bonsai', x: 12, y: 20 },
  { t: 'prop', prop: 'prop_garbage_station', x: 17, y: 31 },
  { t: 'prop', prop: 'prop_curve_mirror', x: 17, y: 27 },
  { t: 'prop', prop: 'decal_tomare', x: 15, y: 21, opts: {} },
  { t: 'prop', prop: 'decal_cone_mark', x: 18, y: 17, cond: { stage: '1+' } },
  { t: 'prop', prop: 'decal_puddle', x: 11, y: 33 },
  { t: 'prop', prop: 'decal_green_belt', x: 0, y: 32 },
  { t: 'prop', prop: 'prop_cat_hole_moss', x: 15, y: 26 },
  { t: 'prop', prop: 'prop_pots_row', x: 20, y: 31 },

  // trees
  { t: 'prop', prop: 'tree_keyaki', x: 22, y: 20 },
  { t: 'prop', prop: 'tree_persimmon', x: 6, y: 23 },

  // poles & wires (wires are drawn between poles by the renderer)
  { t: 'prop', prop: 'prop_utility_pole', x: 3, y: 23, opts: { ad: 'dagashi', wires5: true, lamp: false } },
  { t: 'prop', prop: 'prop_utility_pole', x: 13, y: 23, opts: { ad: 'bank', trans: true } },
  { t: 'prop', prop: 'prop_utility_pole', x: 18, y: 28, opts: { ad: 'lostcat', lamp: true } },
  { t: 'prop', prop: 'prop_utility_pole', x: 21, y: 15, opts: { ad: 'dog', trans: true } },
  { t: 'prop', prop: 'prop_utility_pole', x: 56, y: 21, opts: { ad: 'lashes', lamp: false } },
  { t: 'prop', prop: 'prop_utility_pole', x: 6, y: 35, opts: { ad: 'bank', lamp: true } },
  { t: 'prop', prop: 'prop_utility_pole', x: 22, y: 35, opts: { ad: 'dagashi', lamp: true, trans: true } },
  { ...O('obj_canal_sign', 34, 35), prop: 'prop_utility_pole', opts: { ad: 'fishing', lamp: true } } as MapObj,
  { t: 'prop', prop: 'prop_utility_pole', x: 46, y: 35, opts: { ad: 'lashes', lamp: true } },

  // ======================================================== B 夕鳴銀座
  O('obj_arch_sign', 23, 21),
  O('obj_chochin', 23, 22, { face: 'up' }),
  { t: 'prop', prop: 'prop_arch_post', x: 23, y: 26 },
  O('obj_meat_showcase', 24, 21, { w: 2, face: 'up' }),
  { t: 'npc', id: 'npc_cow_statue', x: 26, y: 22, dir: 'down', noTurn: true, talk: TALK.npc_cow_statue, cond: s02 },
  { t: 'obj', id: 'obj_gacha_ginza', x: 30, y: 22, w: 2, script: 'evt_gacha_ginza', text: {
    s1: `@narr
ハンドルが、途中で 止まる。{w=300}
ガチャの 中も、
17時で 止まっている らしい。`,
    default: `@narr
1回 100円。{w=300}
『からっぽ も 入っています』と、
正直に 書いてある。
!gacha`,
  } },
  { ...O('obj_meishi_ground', 34, 23), cond: s0 } as MapObj,
  O('obj_fire_bucket', 34, 22),
  O('obj_tofu_tank', 37, 21, { face: 'up' }),
  O('obj_wagon', 39, 22),
  O('obj_clock_shop', 40, 21, { w: 2, face: 'up' }),
  O('obj_banner', 27, 25),
  O('obj_ginza_bench', 35, 25, { w: 2 }),
  O('obj_poster_board', 40, 25, { w: 2 }),
  O('obj_postbox', 47, 25),
  O('obj_parking_chain', 43, 15, { w: 3 }),
  O('obj_cafe_sample', 46, 21, { face: 'up' }),
  O('obj_cafe_board', 47, 22),
  O('obj_beer_crate', 51, 22),
  { t: 'obj', id: 'obj_vending_ginza', x: 55, y: 22, cond: s01, text: OBJ.obj_vending_ginza,
    reward: { money: 10, flag: 'flag_hidden_vending', second: true, after: OBJ.obj_vending_ginza } },
  { ...O('obj_vending_trace', 55, 22), cond: s2 } as MapObj,
  O('obj_vending_normal', 24, 32),
  O('obj_laundry_window', 25, 31, { face: 'up' }),
  O('obj_danball', 28, 32),
  { t: 'obj', id: 'obj_catalley_bucket', x: 28, y: 25, text: REWARD_TEXT.obj_catalley_bucket, reward: { item: 'item_stamp_pad', flag: 'flag_hidden_catalley', after: OBJ2.obj_catalley_bucket } },
  O('obj_photo_window', 30, 31, { w: 2, face: 'up' }),
  O('obj_photo_sign', 32, 31, { face: 'up' }),
  O('obj_shutter_1', 37, 31, { face: 'up' }),
  O('obj_shutter_2', 41, 31, { face: 'up' }),
  O('obj_shutter_3', 47, 31, { face: 'up' }),
  O('obj_koban_lamp', 52, 31, { face: 'up' }),
  O('obj_koban_bicycle', 55, 31),
  O('obj_arcade_roof', 23, 23, { w: 33, h: 2, flat: true }),
  // arcade furniture
  { t: 'prop', prop: 'prop_planter', x: 24, y: 25 },
  { t: 'prop', prop: 'prop_arcade_pillar', x: 27, y: 25, opts: { banner: 'matsuri' } },
  { t: 'prop', prop: 'prop_arcade_pillar', x: 33, y: 25, opts: { banner: 'dagashi' } },
  { t: 'prop', prop: 'prop_arcade_pillar', x: 39, y: 25, opts: { banner: 'tofu' } },
  { t: 'prop', prop: 'prop_arcade_pillar', x: 49, y: 25, opts: { banner: 'clock' } },
  { t: 'prop', prop: 'prop_arcade_pillar', x: 55, y: 25, opts: { banner: 'korokke' } },
  { t: 'prop', prop: 'prop_postman_bike', x: 48, y: 24, cond: { stage: '1-2' } },
  { t: 'prop', prop: 'decal_emblem', x: 31, y: 23 },
  { t: 'prop', prop: 'decal_emblem', x: 48, y: 23 },
  { t: 'prop', prop: 'decal_cord_trace', x: 0, y: 0, cond: { stage: 2, notFlag: 'flag_ojigi_beaten' } },
  { t: 'prop', prop: 'decal_cord_trace', x: 0, y: 0, cond: { stage: 2, flag: 'flag_ojigi_beaten' }, opts: { faded: true } },
  { t: 'prop', prop: 'prop_cat_kuro', x: 28, y: 25 },
  { t: 'prop', prop: 'prop_shop_mats', x: 24, y: 22 },

  // ======================================================== 用水路・対岸
  O('obj_canal', 0, 35, { w: 58, face: 'down', flat: true }),
  O('obj_bridge', 10, 35),
  { ...O('obj_hokora', 6, 38), text: `@narr
小さな 祠。{w=300}
白い きつねが 2ひき、
すまし顔で 座っている。
?! flag_hidden_hokora
/
手を あわせますか？
? あわせる | やめておく
[あわせる]
@narr
しんと した。{w=300}
体が、すこし 軽く なった。
!fullheal
!flag flag_hidden_hokora 1
[-]`, text2: `@narr
きつねは、すまし顔の ままだ。` } as MapObj,
  { t: 'prop', prop: 'prop_torii', x: 5, y: 39 },
  O('obj_scarecrow', 16, 41, { face: 'down' }),
  O('obj_paddy', 13, 41, { w: 45, h: 3, face: 'down', flat: true }),
  { t: 'trig', id: 'trig_edge_south', x: 12, y: 43, w: 1, h: 1, on: 'bump', text: OBJ.obj_edge_south as string },
  { t: 'trig', id: 'trig_edge_west', x: 0, y: 21, w: 1, h: 2, on: 'bump', text: OBJ.obj_edge_west as string },
  { t: 'trig', id: 'trig_edge_west2', x: 0, y: 33, w: 1, h: 2, on: 'bump', text: OBJ.obj_edge_west as string },
  { t: 'prop', prop: 'tree_cherry', x: 16, y: 35, opts: { v: 0 } },
  { t: 'prop', prop: 'tree_cherry', x: 28, y: 35, opts: { v: 1 } },
  { t: 'prop', prop: 'tree_cherry', x: 40, y: 35, opts: { v: 2 } },
  { t: 'prop', prop: 'tree_cherry', x: 52, y: 35, opts: { v: 3 } },
  { t: 'prop', prop: 'prop_rail_bridge', x: 59, y: 36 },
  { t: 'prop', prop: 'prop_water_gate', x: 30, y: 38 },

  // ======================================================== C 夕鳴公園
  O('obj_toilet', 2, 3, { face: 'up' }),
  { t: 'obj', id: 'obj_swing', x: 7, y: 3, w: 4, text: OBJ.obj_swing },
  { t: 'prop', prop: 'prop_wisteria', x: 6, y: 6 },
  O('obj_park_bench', 7, 6, { w: 2 }),
  { ...O('obj_early_leaf', 8, 7), flat: true } as MapObj,
  O('obj_semi_shell', 2, 6),
  O('obj_kaba', 4, 9, { w: 3, h: 2 }),
  O('obj_shrubs', 0, 8, { face: 'left' }),
  { ...O('obj_clocktower_base', 15, 7, { w: 2, face: 'up' }), prop: 'prop_clocktower', fushigi: 'fushigi_08' } as MapObj,
  O('obj_tetsubo', 21, 3, { w: 3 }),
  O('obj_speaker_pole', 27, 3),
  { ...O('obj_sandbox', 24, 9), flat: true } as MapObj,
  O('obj_kids_bike', 25, 10),
  O('obj_drinking_fountain', 19, 12),
  { ...O('obj_pigeons', 17, 12), flat: true } as MapObj,
  { ...O('obj_akikan', 17, 13), flat: true } as MapObj,
  O('obj_rules_sign', 17, 14),
  O('obj_park_board', 21, 14),
  { t: 'prop', prop: 'prop_park_bench', x: 15, y: 11 },
  { t: 'prop', prop: 'prop_park_lamp', x: 12, y: 3 },
  { t: 'prop', prop: 'prop_park_lamp', x: 19, y: 3 },
  { t: 'prop', prop: 'prop_park_lamp', x: 12, y: 10 },
  { t: 'prop', prop: 'prop_park_lamp', x: 19, y: 10 },
  { t: 'prop', prop: 'prop_sandbox_frame', x: 21, y: 8 },
  { t: 'prop', prop: 'tree_sakura', x: 6, y: 1, opts: { v: 0 } },
  { t: 'prop', prop: 'tree_sakura', x: 24, y: 1, opts: { v: 1 } },
  { t: 'prop', prop: 'tree_kusu', x: 11, y: 1, opts: { v: 0 } },
  { t: 'prop', prop: 'tree_kusu', x: 29, y: 1, opts: { v: 1 } },
  { t: 'prop', prop: 'tree_sarusuberi', x: 2, y: 6, opts: { v: 0 } },
  { t: 'prop', prop: 'tree_sarusuberi', x: 3, y: 12, opts: { v: 1 } },
  { t: 'prop', prop: 'tree_ichou', x: 28, y: 10, opts: { v: 0 } },
  { t: 'prop', prop: 'tree_ichou', x: 29, y: 4, opts: { v: 1 } },
  { t: 'prop', prop: 'tree_matsu', x: 10, y: 13, opts: { v: 0 } },
  { t: 'prop', prop: 'tree_matsu', x: 24, y: 13, opts: { v: 1 } },

  // ======================================================== D 駐車場・モール前
  O('obj_parking_chain_west', 31, 9, { h: 3, face: 'right' }),
  O('obj_bus_stop', 33, 12),
  { t: 'obj', id: 'obj_covered_car', x: 37, y: 12, w: 3, h: 2, text: REWARD_TEXT.obj_covered_car, reward: { money: 50, flag: 'flag_hidden_car', after: OBJ2.obj_covered_car } },
  { ...O('obj_parking_lines', 41, 8), flat: true } as MapObj,
  { ...O('obj_car_stop', 42, 7), flat: true } as MapObj,
  { ...O('obj_car_stop', 48, 7), id: 'obj_car_stop_2', script: 'obj_car_stop', flat: true } as MapObj,
  { ...O('obj_car_stop', 54, 7), id: 'obj_car_stop_3', script: 'obj_car_stop', flat: true } as MapObj,
  { ...O('obj_asphalt_weed', 41, 11), flat: true } as MapObj,
  { ...O('obj_asphalt_weed', 52, 13), id: 'obj_asphalt_weed_2', script: 'obj_asphalt_weed', flat: true } as MapObj,
  { ...O('obj_asphalt_weed', 36, 9), id: 'obj_asphalt_weed_3', script: 'obj_asphalt_weed', flat: true } as MapObj,
  O('obj_broken_guide', 45, 11),
  O('obj_pay_machine', 46, 14),
  O('obj_bike_rack', 44, 6, { w: 4 }),
  O('obj_mall_sign', 48, 5, { face: 'up' }),
  O('obj_old_poster', 41, 5, { face: 'up' }),
  O('obj_closing_notice', 49, 5, { face: 'up' }),
  { ...O('obj_auto_door', 50, 5, { face: 'up' }), cond: { flag: 'flag_ojigi_beaten' } } as MapObj,
  O('obj_cart_corral', 53, 6, { w: 3 }),
  { ...O('obj_balloon_husk', 50, 11), face: 'up' } as MapObj,
  { ...O('obj_ojigi_restored', 51, 6), cond: { flag: 'flag_ojigi_beaten' } } as MapObj,
  { t: 'prop', prop: 'prop_lot_lamp', x: 40, y: 9, opts: { v: 0 } },
  { t: 'prop', prop: 'prop_lot_lamp', x: 55, y: 12, opts: { v: 1 } },
  { t: 'prop', prop: 'tree_hanamizuki', x: 51, y: 10 },
  { t: 'prop', prop: 'prop_chain', x: 31, y: 9, opts: { dir: 'v', len: 3 } },
  { t: 'prop', prop: 'prop_chain', x: 43, y: 15, opts: { dir: 'h', len: 3 } },
  { t: 'prop', prop: 'decal_parking', x: 35, y: 7 },
  { t: 'prop', prop: 'prop_cart', x: 0, y: 0, id: 'cart_1', opts: { i: 0 } },
  { t: 'prop', prop: 'prop_cart', x: 0, y: 0, id: 'cart_2', opts: { i: 1 } },
  { t: 'prop', prop: 'prop_cart', x: 0, y: 0, id: 'cart_3', opts: { i: 2 } },

  // ======================================================== 踏切
  O('obj_crossing', 58, 22, { w: 5, h: 3 }),
  O('obj_tomare_sign', 57, 21),
  O('obj_rail', 58, 25, { face: 'right' }),
  { ...O('obj_foxtail', 57, 25), flat: true } as MapObj,
  { t: 'prop', prop: 'prop_crossing_gate', x: 58, y: 21 },

  // ======================================================== NPCs
  { t: 'npc', id: 'npc_sae', x: 21, y: 24, dir: 'left', cond: s0, talk: TALK.npc_sae, pose: 'sketch' },
  { t: 'npc', id: 'npc_sae', x: 14, y: 11, dir: 'left', cond: s12, talk: TALK.npc_sae, pose: 'sketch' },
  { t: 'npc', id: 'npc_jk', x: 57, y: 23, dir: 'right', cond: s02, talk: TALK.npc_jk },
  { t: 'npc', id: 'npc_chugaku', x: 3, y: 18, dir: 'down', cond: s02, talk: TALK.npc_chugaku },
  { t: 'npc', id: 'npc_postman', x: 47, y: 24, dir: 'down', cond: s12, talk: TALK.npc_postman },
  { t: 'npc', id: 'npc_madam', x: 17, y: 23, dir: 'down', cond: s01, talk: TALK.npc_madam, move: { kind: 'patrol', points: [[17, 23], [17, 26]], speed: 1.0, wait: 2000 } },
  { t: 'npc', id: 'npc_madam', x: 17, y: 26, dir: 'down', cond: { stage: 2 }, talk: TALK.npc_madam },
  { t: 'npc', id: 'npc_kotaro', x: 16, y: 23, dir: 'down', cond: s02, talk: TALK.npc_kotaro, move: { kind: 'follow', target: 'npc_madam', dx: -1, dy: 0 } },
  { t: 'npc', id: 'npc_sand_girl', x: 22, y: 9, dir: 'left', cond: s12, talk: TALK.npc_sand_girl, pose: 'crouch', fushigi: 'fushigi_07' },
  { t: 'npc', id: 'npc_gacha_boy', x: 31, y: 23, dir: 'up', cond: s02, talk: TALK.npc_gacha_boy },
  { t: 'npc', id: 'npc_ojii', x: 10, y: 21, dir: 'down', cond: s02, talk: TALK.npc_ojii, pose: 'sit', off: [0, -2] },
  { t: 'npc', id: 'npc_mizumaki', x: 11, y: 32, dir: 'down', cond: s02, talk: TALK.npc_mizumaki },
  { t: 'npc', id: 'npc_shadow_man', x: 8, y: 6, dir: 'down', cond: { stage: 2 }, talk: TALK.npc_shadow_man, ghost: true, noTurn: true, shadow: 0 },
  {
    t: 'npc', id: 'npc_kanenari', x: 16, y: 9, dir: 'down', cond: { stage: '1-2', notFlag: 'flag_kanenari_joined' },
    script: 'evt_kanenari_meet', move: { kind: 'orbit', cx: 256, cy: 112, r: 32, period: 6000, cw: true, waveEvery: 7000 },
  },
  { t: 'npc', id: 'npc_hato', x: 33, y: 23, dir: 'down', cond: s0, talk: TALK.npc_hato, pose: 'peck' },
  { t: 'npc', id: 'npc_cat_sauce', x: 15, y: 24, dir: 'right', cond: s02, talk: TALK.npc_cat_sauce, ghost: true, off: [0, -14], fushigi: 'fushigi_02' },
  { t: 'npc', id: 'npc_cat_mike', x: 30, y: 32, dir: 'down', cond: s0, talk: TALK.npc_cat_mike, noTurn: true, pose: 'sleep' },
  { t: 'npc', id: 'npc_cat_mike', x: 30, y: 32, dir: 'up', cond: s12, talk: TALK.npc_cat_mike, noTurn: true, pose: 'look_up' },
  { t: 'npc', id: 'npc_crow', x: 21, y: 15, dir: 'down', cond: s12, talk: TALK.npc_crow, ghost: true, off: [2, -52], shadow: 0 },
  {
    t: 'npc', id: 'npc_mamekichi', x: 36, y: 20, dir: 'down', cond: s02, talk: TALK.npc_mamekichi, fushigi: 'fushigi_04',
    off: [0, 2],
  },

  // ======================================================== enemy symbols (20_systems 14)
  { t: 'sym', id: 'sym_town_01', enemies: ['enemy_hato_kakaricho'], x: 33, y: 23, move: 'hato', cond: { stage: 1 }, script: 'evt_hato_block', restoreAt: [33, 23] },
  { t: 'sym', id: 'sym_town_02', enemies: ['enemy_semi_final'], x: 21, y: 20, move: 'semi', cond: { stage: '1-2', flag: 'flag_got_hanko' }, restoreAt: [22, 20], restoreOff: [0, -12] },
  { t: 'sym', id: 'sym_town_03', enemies: ['enemy_semi_final'], x: 53, y: 11, move: 'semi', cond: { stage: 2 }, restoreAt: [51, 10], restoreOff: [0, -10] },
  { t: 'sym', id: 'sym_town_04', enemies: ['enemy_cone_vocal', 'enemy_cone_vocal'], x: 18, y: 16, to: [18, 19], move: 'cone', dir: 'down', cond: { stage: 2 }, restoreAt: [18, 18] },
  { t: 'sym', id: 'sym_town_04b', link: 'sym_town_04', enemies: [], x: 20, y: 19, to: [20, 16], move: 'cone', dir: 'up', cond: { stage: 2 }, restoreAt: [20, 18], phase: 0.5 } as MapObj,
  { t: 'sym', id: 'sym_town_05', enemies: ['enemy_wasuregasa'], x: 3, y: 5, move: 'umbrella', radius: 3, cond: { stage: 2 }, restoreAt: [4, 4], restoreOff: [4, 0] },
  { t: 'sym', id: 'sym_town_06', enemies: ['enemy_wasuregasa'], x: 45, y: 8, move: 'umbrella', radius: 3, cond: { stage: 2 }, restoreAt: [48, 6], restoreOff: [0, 2] },
  { t: 'sym', id: 'sym_town_07', enemies: ['enemy_ojigi_jihanki'], x: 50, y: 6, move: 'ojigi', cond: { stage: 2, notFlag: 'flag_ojigi_beaten' }, script: 'evt_ojigi', music: 'bgm_midboss' },

  // ======================================================== event triggers (30_level_art 1.6)
  { t: 'trig', id: 'trig_alley_open', x: 18, y: 15, w: 3, h: 6, script: 'evt_alley_open', once: true, cond: { stage: '1+' }, text: `@narr
工事の コーンが いなくなっている。{w=300}
『17時まで』だったから……らしい。` },
  { t: 'trig', id: 'trig_ojigi', x: 47, y: 8, w: 7, h: 2, script: 'evt_ojigi', cond: { stage: 2, notFlag: 'flag_ojigi_beaten' } },
  { t: 'trig', id: 'trig_ginza_exit', x: 21, y: 21, w: 2, h: 5, script: 'evt_obaa_park_hint', cond: { flag: 'flag_got_hanko', notFlag: 'flag_park_hint' } },
  { t: 'trig', id: 'trig_ginza_exit_s', x: 22, y: 32, w: 2, h: 3, script: 'evt_obaa_park_hint', cond: { flag: 'flag_got_hanko', notFlag: 'flag_park_hint' } },
  { t: 'trig', id: 'trig_ginza_exit_e', x: 56, y: 25, w: 2, h: 2, script: 'evt_obaa_park_hint', cond: { flag: 'flag_got_hanko', notFlag: 'flag_park_hint' } },
];

registerMap({
  id: 'map_town',
  name: '夕鳴町',
  kind: 'outdoor',
  rows: ROWS,
  legend: TOWN_LEGEND,
  objects: OBJECTS,
  camera: 'follow',
  bgm: { 0: 'bgm_town_s0', 1: 'bgm_town_s1', 2: 'bgm_town_s2' },
  amb: {
    0: ['amb_higurashi', 'amb_kawabe', 'amb_arcade', 'amb_wind'],
    1: ['amb_still', 'amb_kawabe', 'amb_arcade'],
    2: ['amb_s2_town', 'amb_kawabe', 'amb_wind', 'amb_train_far'],
    3: ['amb_night_insects', 'amb_kawabe'],
  },
  space: 'outdoor',
  zones: [
    { id: 'park', x: 0, y: 0, w: 32, h: 16 },
    { id: 'mallfront', x: 32, y: 6, w: 26, h: 1 },
    { id: 'mallfront', x: 32, y: 7, w: 3, h: 8 },
    { id: 'kawabe', x: 0, y: 32, w: 58, h: 3 },
    { id: 'akichi', x: 0, y: 16, w: 7, h: 5 },
    { id: 'home', x: 0, y: 23, w: 16, h: 9 },
    { id: 'taigan', x: 0, y: 38, w: 58, h: 6 },
  ],
  onEnter: ['map_town_enter'],
  structMats: [
    { x: 0, y: 23, w: 8, h: 1, mat: 'block_flower' },
    { x: 0, y: 31, w: 8, h: 1, mat: 'block_flower' },
    { x: 8, y: 23, w: 7, h: 1, mat: 'block_low' },
    { x: 15, y: 23, w: 1, h: 4, mat: 'block' },
    { x: 0, y: 16, w: 1, h: 5, mat: 'block_old' },
    { x: 7, y: 16, w: 1, h: 5, mat: 'block_old' },
    { x: 13, y: 16, w: 1, h: 5, mat: 'yakisugi' },
    { x: 21, y: 16, w: 3, h: 6, mat: 'kaname' },
    { x: 23, y: 27, w: 1, h: 5, mat: 'tsutsuji' },
    { x: 31, y: 6, w: 1, h: 10, mat: 'satsuki', ch: 'H' },
    { x: 50, y: 10, w: 3, h: 2, mat: 'satsuki' },
    { x: 0, y: 38, w: 58, h: 1, mat: 'reeds' },
    { x: 1, y: 20, w: 3, h: 1, mat: 'rope' },
    { x: 58, y: 0, w: 1, h: 44, mat: 'railfence' },
    { x: 62, y: 0, w: 1, h: 44, mat: 'railfence' },
  ],
});

/** Whether the parking-lot chains are down (stage 2). */
export function chainsDown(): boolean {
  return flag('flag_parking_open') > 0 || flag('flag_stage') >= 2;
}
