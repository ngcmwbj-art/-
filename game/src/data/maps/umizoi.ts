// map_umizoi — 海ぞいの町 (62_ch3_level_art 3章). 80×40 tiles, the section
// through a harbour town at noon: from the north the pines and the hill (the
// children's open ground, the siren tower's plaza, the mikan terraces), the
// round-stone wall and its three flights of steps, the houses facing the sea
// along the harbour road, the market, the dried-goods shop, the unloading
// shed and the harbour store, the quay, the harbour's water and its boats,
// the breakwater running west to the red lighthouse, and the beach east of
// the rocks; the old aquarium on the cape at the east end.
//
// Rows are 62 3.1 verbatim (the collision of stages 1–2), except: the
// lighthouse's cells are `L` (its door `d`) so its ground is the breakwater's,
// the boats' cells `b` (they float on the harbour), the truck's spot on the
// quay (46–48,24–25) is quay (the parked truck collides while it is there),
// the tetrapods outside the breakwater `X` (the rocks stay `K`), and the
// aquarium's plaza `q` (the hill's plaza stays `%`: HD-2D lifts the hill), and the
// breakwater's (20,31) is breakwater (its `o` had no prop: an unseen wall that, with
// the angler sitting at (21,32), shut the way west; fix1015), and the dried-fish shop's
// (15–20,13) is facade `W` (its open front is two tiles tall, c3_bld.ts; fix1015), and the rock under
// the plaza's south end (73,34) is the steps down to the cape's shore (`n`, 本日は、開館です: events/ch3/iso.ts;
// a rope over them while the shore is not open).
//
// The people and the things say what the scenario registers by their ids
// (events/ch3/umizoi.ts, 60 3.2・9.3); this map only places them.

import { flag } from '../../game/state';
import { registerMap } from '../../world/maps';
import { pgAqOpen, pgOn } from '../../world/postgame';
import type { Ground, MapDef, MapObj, TileSpec } from '../../world/types';
import type { C3Ground } from '../../art/tiles/c3_ground';

/** A chapter-3 ground id as a world Ground (art/tiles/c3_ground.ts draws it). */
export const cg = (g: C3Ground): Ground => g as string as Ground;

const ROWS = [
  'HHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHH', // 0
  'HHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHH', // 1
  'HH,,,,,,,,,,,,,,,,,,,HHHH%%%%%%%%^^^^%%%%%%%%HmmmmmmmmmmmmmmmmmmmmHHHHHHHHHHHHHH', // 2
  'HH,,,,,,,,,,,,,,,,T,,HHHH%o%%%%%%^^^^%%%%%%T%HmMMmMMmMMmmmmMMmMMmMHHHHHHHHHHHHHH', // 3
  'HH,,,o,,,,,,,,,,,,,,,HHHH%%%%%%%%^^^^%%%%%%%%HmMMmMMmMMmmmmMMmMMmMHHHHHHHHHHHHHH', // 4
  'HH,,,,,,,,,,,,,,,,,,,HHHH%%%%%%%%WWWW%%%%%%%%HmmmmmmmmmmmmmmmmmmmmHHHHHHHHHHHHHH', // 5
  'HH,,,,,,,,,,,,,o,,,,,HHHH%%%%%%%%WDWW%%%%%%%%HmMMmMMmMMmmmmMMmMMmMHHHHHHHHHHHHHH', // 6
  'HH,,,,,,,,,,,,,,,,,,,HHHH%%%%%%%%%%%%%%%%%%%%HmMMmMMmMMmmmmMMmMMmMHHHHHHHHHHHHHH', // 7
  'HH,,,,,,,,,,,,,,,,,,,HHHH%%o%%%%%%%%%%%%%%o%%HmmmmmmmmmmmmmmmmmmmmHHHHHHHHHHHHHH', // 8
  'HH,,,,,,,,,,,,,,,,,,,HHHH%%%%%%%%%%%%%%%%%%%%HmmmmmmmmmmmmmmmmmmmmHHHHHHHHHHHHHH', // 9
  'BBBBBBBBBBBBnnBBBBBBBBBBBBBBBBBBBBnnBBBBBBBBBBBBBBBBBBBBnnBBBBBBBBHHHHHHHHHHHHHH', // 10
  '^^^^^^^^^^HHnnH^^^^^^:::HH^^^^^^^^nnHH^^^^^^^^HH^^^^^^^^nn^^^^^^^^HHHHHHHHHHHHHH', // 11
  '^^^^^^^^^^HHnnH^^^^^^:o:HH^^^^^^^^nnHH^^^^^^^^HH^^^^^^^^nn^^^^^^^^HHHHHHHHHHHHHH', // 12
  '^^^^^^^^^^HHnnHWWWWWW:::HH^^^^^^^^nnHH^^^^^^^^HH^^^^^^^^nn^^^^^^^^HHHHHHHHHHHHHH', // 13
  'WWWWWWWWWWHHnnHWWWWWW:o:HHWWWWWWWWnnHHWWWWWWWWHHWWWWWWWWnnWWWWWWWWHHHHHHHHHHHHHH', // 14
  'WWWWWWWWWWHHnnHSSSSSS:::HHWWWWDWWWnnHHWWWWWWWWHHWWWWWWWWnnWWWWWWWWHHHHHHHHHHHHHH', // 15
  '........Y...............Y............o.........Y................Y.....HHHHHHHHHH', // 16
  '......................................................................HHHHHHHHHH', // 17
  '......................................................................HHHHHHHHHH', // 18
  'HHHH^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^_oo___^^^^^^__Ksss^^^^^^^ssssK..^^^^^^^^^^', // 19
  'HHHH^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^______^^^^^^__Ksss^^^^^^^ssssK..^^^^^^^^^^', // 20
  'HHHH^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^____o_^^^^^^__KsssWWWWWWWssssK..^^^^^^^^^^', // 21
  'HHHHWWWWWWWWWWWWWWWWWWWWWWWWWWWWWvvvvv______WWWWWW__KsssWWWDWWWssssK..^^^^^^^^^^', // 22
  'HHHHWWWWWWDDWWWWWWWWWWWWWDDWWWWWWSSSSS______WWooWW__KsosssssssssossK..^^^^^^^^^^', // 23
  'KK__________________o_________________o__o__________nssssssssssssssK..^^^^^^^^^^', // 24
  'KK__________________________________________________nssssssssssssssK..^^^^^^^^^^', // 25
  'KK_o___________o____________________o_____________o_KssssssssssssssK..WWWWWWWWWW', // 26
  'KKwwwwwwwwwwbbbbwbbbbwwwwwwwnnwwwwwwbbbbwwww--X~~~~~KssssosssssssosK..WWWWWWWWWW', // 27
  'KKwwwwwLLLwwbbbbwbbbbwwwwwwwwwwwwwwwbbbbwwww--X~~~~~KssssssssssssssK..WWSWDDWWWW', // 28
  'KKwwwwwLdLwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww--X~~~~~KssssssssssssssKqqqqqqqqqqoq', // 29
  'KKwww------wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww--X~~~~~KssosssssssssssKqqqqqqqqqqqq', // 30
  'KK~~~-------------------------------------o---X~~~~~KzzzzzzzzzzzzzzKqqqqqqqqqqqq', // 31
  'KK~~~-----------------------------------------X~~~~~K~~~~~~~~~~~~~~Kqqqqqqqqqqqq', // 32
  'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX~~~~~K~~~~~~~~~~~~~~Kqqoqqqqqqoqq', // 33
  'KK~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~K~~~~~~~~~~~~~~KKKKKKnKKKKKK', // 34
  'KK~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~K~~~~~~~~~~~~~~K~~~~~~~~~~~~', // 35
  'KK~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~K~~~~~~~~~~~~~~K~~~~~~~~~~~~', // 36
  'KK~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~K~~~~~~~~~~~~~~K~~~~~~~~~~~~', // 37
  'KK~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~K~~~~~~~~~~~~~~K~~~~~~~~~~~~', // 38
  'KK~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~K~~~~~~~~~~~~~~K~~~~~~~~~~~~', // 39
];

const LEGEND: Record<string, TileSpec> = {
  // walkable
  '.': { ground: cg('c3_road'), step: 'se_step_asphalt' },
  _: { ground: cg('c3_quay'), step: 'se_step_stone' },
  '-': { ground: cg('c3_bouhatei'), step: 'se_step_stone' },
  s: { ground: cg('c3_sand'), step: 'se_step_sand' },
  z: { ground: cg('c3_nagisa'), step: 'se_step_sand' },
  n: { ground: cg('c3_ishidan'), step: 'se_step_stone' },
  '%': { ground: cg('c3_hiroba'), step: 'se_step_stone' },
  q: { ground: cg('c3_hiroba'), step: 'se_step_stone' },
  ',': { ground: cg('c3_kusa'), step: 'se_step_grass' },
  m: { ground: cg('c3_mikan'), step: 'se_step_grass' },
  ':': { ground: cg('c3_alley'), step: 'se_step_dirt' },
  // solid
  H: { ground: cg('c3_kusa'), solid: true, tag: 'hedge' },
  // buildings stand on plain ground (never 'auto': the sea would spread under them)
  '^': { ground: cg('c3_alley'), solid: true, tag: 'roof' },
  W: { ground: cg('c3_alley'), solid: true, tag: 'facade' },
  D: { ground: cg('c3_alley'), solid: true, door: true, tag: 'facade' },
  B: { ground: cg('c3_kusa'), solid: true, tag: 'wall' },
  K: { ground: cg('c3_iwa'), solid: true, tag: 'hedge' },
  X: { ground: cg('c3_iwa'), solid: true, tag: 'hedge' },
  w: { ground: cg('c3_minato'), solid: true, tag: 'water' },
  '~': { ground: cg('c3_umi'), solid: true, tag: 'water' },
  b: { ground: cg('c3_minato'), solid: true, tag: 'prop' },
  L: { ground: cg('c3_bouhatei'), solid: true, tag: 'prop' },
  d: { ground: cg('c3_bouhatei'), solid: true, door: true, tag: 'prop' },
  S: { ground: 'auto', solid: true, counter: true, tag: 'counter' },
  v: { ground: cg('c3_quay'), solid: true, tag: 'facade' },
  M: { ground: cg('c3_mikan'), solid: true, tag: 'prop' },
  T: { ground: 'auto', solid: true, tag: 'trunk' },
  Y: { ground: 'auto', solid: true, tag: 'pole' },
  o: { ground: 'auto', solid: true, tag: 'prop' },
};

/** An examinable thing (its text and script are the scenario's: events/ch3/umizoi.ts registers them by id). */
function O(id: string, x: number, y: number, extra: Record<string, unknown> = {}): MapObj {
  return { t: 'obj', id, x, y, ...extra } as unknown as MapObj;
}
/** A second placement of the same thing (another tile, the same script). */
function O2(id: string, n: number, x: number, y: number, extra: Record<string, unknown> = {}): MapObj {
  return O(`${id}_${n}`, x, y, { script: id, ...extra });
}
/** A decorative prop. */
function PR(prop: string, x: number, y: number, opts?: Record<string, unknown>, extra: Record<string, unknown> = {}): MapObj {
  return { t: 'prop', prop, x, y, ...(opts ? { opts } : {}), ...extra } as unknown as MapObj;
}

/** 12:00 and 12:01 (the town's stages 1–2, 62 3.4). */
const S12 = { stage: '1-2' };
const S1 = { stage: 1 };
const S2 = { stage: 2 };

/**
 * テル is up in the lamp room while the lens is turned (S09: once the bracelet
 * is back, until the three waves move — map_c3_toudai), on the plinth otherwise.
 */
export const teruInside = (): boolean => flag('flag_ch3_moguri_bracelet') > 0 && flag('flag_ch3_lens_n') < 3;

const OBJECTS: MapObj[] = [
  // ======================================================== buildings (62 3.3・7.1)
  PR('prop_c3_bld_gyokyo', 0, 11),
  PR('prop_c3_bld_himono', 15, 11),
  PR('prop_c3_himono_counter', 15, 15),
  PR('prop_c3_bld_kamome', 26, 11),
  PR('prop_c3_noren', 30, 15),
  PR('prop_c3_yuge', 32, 14),
  PR('prop_c3_bld_jouren', 38, 11),
  PR('prop_c3_bld_minka', 48, 11),
  PR('prop_c3_bld_toudai', 58, 11),
  PR('prop_c3_bld_ichiba', 4, 19),
  PR('prop_c3_bld_kanbutsu', 33, 19),
  PR('prop_c3_bld_souko', 44, 19),
  PR('prop_c3_bld_uminoie', 56, 19),
  PR('prop_c3_bld_aq', 70, 19),
  PR('prop_c3_siren_tower', 33, 2),
  PR('prop_c3_toudai', 7, 28),

  // ======================================================== doors (62 1.4)
  { t: 'door', id: 'door_c3_seri', x: 10, y: 23, w: 2, to: 'map_c3_ichiba', tx: 5, ty: 10, dir: 'up' },
  { t: 'door', id: 'door_c3_azemichi', x: 25, y: 23, w: 2, to: 'map_c3_ichiba', tx: 33, ty: 10, dir: 'up' },
  { t: 'door', id: 'door_c3_shokudo', x: 30, y: 15, to: 'map_c3_shokudo', tx: 7, ty: 7, dir: 'up', se: 'se_door_glass' },
  { t: 'door', id: 'door_c3_uminoie', x: 59, y: 22, to: 'map_c3_uminoie', tx: 5, ty: 5, dir: 'up', se: 'se_door_small' },
  { t: 'door', id: 'door_c3_siren', x: 34, y: 6, to: 'map_c3_siren', tx: 6, ty: 9, dir: 'up', se: 'se_door_heavy', cond: { flag: 'flag_ch3_got_itadakimasu' } },
  { t: 'door', id: 'door_c3_toudai', x: 8, y: 29, to: 'map_c3_toudai', tx: 4, ty: 5, dir: 'up', se: 'se_door_small', cond: { flag: 'flag_ch3_toudai_open' } },
  { t: 'door', id: 'door_c3_aq', x: 74, y: 28, w: 2, to: 'map_c3_aq_iriguchi', tx: 7, ty: 10, dir: 'up', se: 'se_door_glass', cond: { stage: '3+', when: () => !pgOn() || pgAqOpen() } },
  // the doors while they are shut: what is read there (60 9.3)
  O('obj_c3_siren_zaishitsu', 34, 6, { face: 'up', cond: { notFlag: 'flag_ch3_got_itadakimasu' } }),
  O('obj_c3_toudai_door', 8, 29, { face: 'up', cond: { notFlag: 'flag_ch3_toudai_open' } }),
  O('obj_c3_aq_harigami', 74, 28, { w: 2, face: 'up', cond: { stage: '0-2' } }),
  // after the clear: shut outside its hours (9:00–16:59, 05_postgame 5.3)
  O('obj_c3_aq_pg_shut', 74, 28, { w: 2, face: 'up', text: '@narr\nガラス戸に、札が 下がっている。\n『開館の 準備は、また あした。』', cond: { when: () => pgOn() && !pgAqOpen() } }),

  // ======================================================== 丘 (y2–9)
  PR('tree_matsu', 18, 3),
  PR('tree_matsu', 43, 3),
  PR('prop_c3_fune', 3, 4, { v: 'fuse' }),
  PR('obj_tires', 15, 6),
  O('obj_c3_siren_board', 26, 3, { prop: 'prop_c3_keijiban' }),
  O('obj_c3_siren_tower', 35, 6, { w: 2, face: 'up' }),
  O2('obj_c3_siren_tower', 1, 33, 6, { face: 'up' }),
  PR('prop_c3_ishi_bench', 27, 8),
  PR('prop_c3_ishi_bench', 42, 8),
  // みかん畑: a tree every 2×2 (the green fruit of 8月31日); the far east one is しんごのたんかん
  ...[47, 50, 53, 59, 62].flatMap((x) => [PR('prop_c3_mikan', x, 4), PR('prop_c3_mikan', x, 7)]),
  PR('prop_c3_mikan', 65, 4, { tankan: true }),
  O('obj_c3_mikan_tankan', 65, 6, { prop: 'prop_c3_mikan', opts: { tankan: true } }),

  // ======================================================== 家並み (y11–15)
  O('obj_c3_himono_dai', 22, 12, { prop: 'prop_c3_himono_dai', opts: { ring: true }, fushigi: 'fushigi_ch3_06' }),
  O2('obj_c3_himono_dai', 1, 22, 14, { prop: 'prop_c3_himono_dai' }),
  O('obj_c3_kokuban', 28, 15, { face: 'up' }),
  O('obj_c3_kanban', 29, 15, { face: 'up' }),
  O2('obj_c3_kanban', 1, 31, 15, { face: 'up' }),
  O('obj_c3_noren', 30, 15, { face: 'up', priority: -1 }),

  // ======================================================== 港通り (y16–18)
  PR('prop_utility_pole', 8, 16),
  PR('prop_utility_pole', 24, 16),
  PR('prop_utility_pole', 47, 16),
  PR('prop_utility_pole', 64, 16),
  PR('obj_vending_normal', 37, 16),
  // after the clear (05_postgame 4.1): the harbour's lamps along the quay — they light at night (pal_c9);
  // not there in chapter 3 (its noon never needed them)
  ...[10, 24, 42].map((x) => PR('prop_park_lamp', x, 26, {}, { cond: { when: pgOn }, solid: [0, 0, 1, 1] })),

  // ======================================================== 市場・荷さばき場・岸壁 (y19–26)
  PR('prop_c3_seihyo', 39, 19),
  PR('prop_c3_uwaya', 38, 23),
  PR('prop_c3_tare', 42, 21),
  O('obj_c3_kanbutsuya', 33, 23, { w: 5, face: 'up' }),
  O('obj_c3_kamome', 18, 23, { face: 'up', fushigi: 'fushigi_ch3_04' }),
  PR('prop_c3_ami', 6, 24, { w: 30 }),
  PR('prop_c3_ami', 32, 25, { w: 24 }),
  O('obj_c3_toro', 20, 24, { prop: 'prop_c3_toro' }),
  O('obj_c3_post', 38, 24, { prop: 'obj_postbox' }),
  PR('prop_park_bench', 41, 24),
  O('obj_c3_shiokaze', 3, 26, { prop: 'prop_c3_bitt' }),
  O2('obj_c3_shiokaze', 1, 15, 26, { prop: 'prop_c3_bitt' }),
  O2('obj_c3_shiokaze', 2, 36, 26, { prop: 'prop_c3_bitt' }),
  O('obj_c3_hoshi_yasai', 50, 26, { prop: 'prop_c3_yasai_box' }),
  O('obj_c3_kage', 24, 25, { flat: true, fushigi: 'fushigi_ch3_01' }),
  // ツガオ便 parked in front of the harbour store from S05 to S14, nobody in the cab (62 3.1・3.4)
  {
    t: 'npc', id: 'c3_truck_quay', sprite: 'npc_tsugao', vehicle: 'tsugao_truck_empty', x: 47, y: 25, dir: 'left', noTurn: true,
    cond: { flag: 'flag_ch3_arrived', notFlag: 'flag_ch3_truck_trap' },
  },

  // ======================================================== 港の水・船 (y27–30)
  O('obj_c3_gyosen', 12, 27, { w: 4, h: 2, prop: 'prop_c3_fune', opts: { name: true } }),
  PR('prop_c3_refl', 12, 27, { of: 'prop_c3_fune', o: { name: true } }),
  PR('prop_c3_fune', 17, 27),
  PR('prop_c3_refl', 17, 27, { of: 'prop_c3_fune', o: {} }),
  PR('prop_c3_fune', 36, 27, { hull: '#DCE6EC' }),
  PR('prop_c3_refl', 36, 27, { of: 'prop_c3_fune', o: { hull: '#DCE6EC' } }),

  // ======================================================== 防波堤・灯台 (y27–33)
  PR('prop_c3_ishi_bench', 42, 31, { c: '#C8C4B8' }),
  // the real lunch's mats (S13 and the ending, 62 3.3・12.6): from the moment the town says ごちそうさま
  { t: 'prop', prop: 'prop_c3_goza', x: 22, y: 31, cond: { flag: 'flag_ch3_got_gochisou' } } as MapObj,
  // the ending (60 10.29): the griddle at the goza (S29) and the photographer's tripod (S31), the scenario's flags
  PR('prop_c3_end_teppan', 30, 32, {}, { cond: { flag: 'flag_c3_end_goza' } }),
  PR('prop_c3_end_tripod', 31, 33, {}, { cond: { flag: 'flag_c3_end_tripod' } }),
  O('obj_c3_bouhatei', 4, 31, { h: 2, face: 'left', fushigi: 'fushigi_ch3_03' }),
  PR('prop_c3_shibuki', 20, 33),
  PR('prop_c3_shibuki', 33, 33),
  PR('prop_c3_shibuki', 46, 29),

  // ======================================================== 海水浴場 (x52–67)
  PR('prop_c3_shower', 54, 23),
  O('obj_c3_uminoie_kakigori', 58, 22, { face: 'up' }),
  O('obj_c3_uminoie_ukiwa', 61, 23, { prop: 'prop_c3_ukiwa_yama', solid: [0, 0, 1, 1] }),
  O('obj_c3_tetsubou', 64, 23, { prop: 'prop_c3_tetsubou' }),
  PR('prop_c3_kanshidai', 57, 27),
  O('obj_c3_kanshidai', 56, 27, {}),
  PR('prop_c3_parasol', 65, 27),
  PR('prop_c3_rope_kui', 55, 30),
  PR('prop_c3_buoy', 55, 31),
  O('obj_c3_umi_kagami', 53, 31, { w: 14, flat: true }),

  // ======================================================== 旧水族館の前 (x68–79)
  O('obj_c3_aq_kanban', 78, 29, { prop: 'prop_c3_aq_kanban' }),
  PR('prop_c3_tobera', 70, 33),
  PR('prop_c3_tobera', 77, 33),

  // ======================================================== カモメ, stopped in the air (62 8.8)
  PR('prop_c3_kamome_sora', 18, 21, { v: 0, h: 34 }),
  PR('prop_c3_kamome_sora', 9, 26, { v: 1, h: 30 }),
  PR('prop_c3_kamome_sora', 31, 28, { v: 0, h: 26 }),
  PR('prop_c3_kamome_sora', 25, 31, { v: 1, h: 36 }),
  PR('prop_c3_kamome_sora', 60, 29, { v: 0, h: 30 }),

  // ======================================================== people (62 3.4: stage 1 = 12:00, stage 2 = 12:01, S13–S14)
  { t: 'npc', id: 'npc_c3_toudai', x: 9, y: 30, dir: 'left', cond: { ...S1, when: () => !teruInside() } },
  { t: 'npc', id: 'npc_c3_toudai', x: 10, y: 30, dir: 'left', cond: S2 },
  { t: 'npc', id: 'npc_c3_mago', x: 60, y: 30, dir: 'down', cond: S1 },
  { t: 'npc', id: 'npc_c3_mago', x: 34, y: 32, dir: 'down', cond: S2 },
  // カイト up on the lifeguard chair (spoken to from (57,28)); at 12:01 under it, the flag folded
  { t: 'npc', id: 'npc_c3_kanshiin', x: 57, y: 27, dir: 'down', pose: 'sit', off: [0, -18], noTurn: false, cond: S1 },
  { t: 'npc', id: 'npc_c3_kanshiin', x: 57, y: 28, dir: 'down', cond: S2 },
  { t: 'npc', id: 'npc_c3_himono_otto', x: 17, y: 14, dir: 'down', cond: S12 },
  { t: 'npc', id: 'npc_c3_himono_tsuma', x: 19, y: 14, dir: 'down', cond: S12 },
  { t: 'npc', id: 'npc_c3_tsuri', x: 21, y: 32, dir: 'down', pose: 'sit', cond: S12 },
  {
    t: 'npc', id: 'npc_c3_uketsuke', x: 73, y: 30, dir: 'left', cond: S12,
    move: { kind: 'patrol', points: [[71, 30], [77, 30]], speed: 0.6, wait: 2000 },
  },
  // 12:01: the cook and the regular at the shop's door (the noren in her hands), the auctioneers
  // at the auction floor's mouth, the siren keeper at the breakwater's root
  { t: 'npc', id: 'npc_c3_shokudo', x: 29, y: 16, dir: 'down', cond: S2 },
  { t: 'npc', id: 'npc_c3_jouren', x: 31, y: 16, dir: 'down', cond: S2 },
  { t: 'npc', id: 'npc_c3_seri', x: 9, y: 24, dir: 'down', cond: S2 },
  { t: 'npc', id: 'npc_c3_seri_deshi', x: 12, y: 24, dir: 'down', cond: S2 },
  { t: 'npc', id: 'npc_c3_sirenban', x: 44, y: 28, dir: 'down', cond: S2 },
  // the three children: at the breakwater's root until they run to the newcomers (S06), then on the open ground; at 12:01 on the breakwater.
  // The breakwater is two tiles wide (y31–32): whoever stands on it keeps to the sea side (y32) and leaves y31
  // free, and the root (x44–45) keeps x45 free — nobody shuts the way to the lighthouse (fix1015 ④)
  { t: 'npc', id: 'npc_c3_kid_a', x: 44, y: 29, dir: 'down', cond: { ...S1, notFlag: 'flag_ch3_kids' } },
  { t: 'npc', id: 'npc_c3_kid_b', x: 43, y: 31, dir: 'right', cond: { ...S1, notFlag: 'flag_ch3_kids' } },
  { t: 'npc', id: 'npc_c3_kid_c', x: 44, y: 31, dir: 'up', cond: { ...S1, notFlag: 'flag_ch3_kids' } },
  { t: 'npc', id: 'npc_c3_kid_a', x: 6, y: 6, dir: 'right', cond: { ...S1, flag: 'flag_ch3_kids' } },
  { t: 'npc', id: 'npc_c3_kid_b', x: 9, y: 4, dir: 'down', cond: { ...S1, flag: 'flag_ch3_kids' } },
  { t: 'npc', id: 'npc_c3_kid_c', x: 12, y: 7, dir: 'left', cond: { ...S1, flag: 'flag_ch3_kids' } },
  { t: 'npc', id: 'npc_c3_kid_a', x: 33, y: 32, dir: 'down', cond: S2 },
  { t: 'npc', id: 'npc_c3_kid_b', x: 35, y: 32, dir: 'down', cond: S2 },
  { t: 'npc', id: 'npc_c3_kid_c', x: 38, y: 32, dir: 'down', cond: S2 },
  // ツガオ便's two (the scenario's lines: script ids of their own so chapter 2's never answer here)
  { t: 'npc', id: 'npc_hirosuke', script: 'c3_hirosuke_umi', x: 18, y: 24, dir: 'down', cond: { ...S12, flag: 'flag_ch3_arrived' } },
  { t: 'npc', id: 'npc_pokosha', script: 'c3_pokosha_umi', x: 71, y: 31, dir: 'up', cond: { ...S1, flag: 'flag_ch3_arrived' } },

  // ======================================================== the town's own symbols (62 1.5・60 5.5; stage 1 only — at 12:01
  // they are what they were again). Moved off the ways everyone walks: ヨコドリ circles the children's open ground on
  // the hill (62: the breakwater, the way to the lighthouse), アソビタリン rolls along the beach's east edge (62: y24)
  { t: 'sym', id: 'sym_c3_01', enemies: ['enemy_hoshisugi'], x: 21, y: 13, dir: 'down', move: 'cone', to: [21, 15], cond: S1, restoreAt: [22, 12] },
  { t: 'sym', id: 'sym_c3_02', enemies: ['enemy_hoshisugi', 'enemy_hoshisugi'], x: 23, y: 11, dir: 'down', move: 'cone', to: [23, 13], phase: 1.5, cond: S1, restoreAt: [22, 14] },
  { t: 'sym', id: 'sym_c3_03', enemies: ['enemy_asobitarin'], x: 66, y: 25, dir: 'down', move: 'cone', to: [66, 29], cond: S1, restoreAt: [61, 23] },
  { t: 'sym', id: 'sym_c3_04', enemies: ['enemy_yokodori'], x: 4, y: 8, dir: 'right', move: 'cone', to: [10, 8], cond: S1, restoreAt: [9, 8] },


  { t: 'trig', id: 'trig_ch3_kids', x: 18, y: 16, w: 9, h: 3, script: 'evt_ch3_kids', cond: { flag: 'flag_ch3_arrived', notFlag: 'flag_ch3_kids' } },
  { t: 'trig', id: 'trig_ch3_edge_road', x: 0, y: 16, w: 1, h: 3, on: 'bump' },
  // the quay's and the breakwater's edges over the water (pushing towards the sea; not the harbour steps)
  { t: 'trig', id: 'trig_ch3_edge_sea', x: 2, y: 26, w: 26, h: 1, on: 'bump', script: 'trig_ch3_edge_sea' },
  { t: 'trig', id: 'trig_ch3_edge_sea_2', x: 30, y: 26, w: 22, h: 1, on: 'bump', script: 'trig_ch3_edge_sea' },
  { t: 'trig', id: 'trig_ch3_edge_sea_3', x: 5, y: 31, w: 1, h: 2, on: 'bump', script: 'trig_ch3_edge_sea' },
  // (the two ways into the sea, trig_ch3_dive_minato / _hama, and the trap's trigger are the scenario's: events/ch3)
];

/** Areas (62 1.2): the place on the HUD, Kanenari's place key, the beds of sound (63 4.3). Narrowest first. */
const ZONES: NonNullable<MapDef['zones']> = [
  { id: 'area_c3_ichiba_mae', x: 4, y: 24, w: 29, h: 2, name: '市場の 前' },
  { id: 'area_c3_himono', x: 14, y: 11, w: 12, h: 8, name: '干物屋' },
  { id: 'area_c3_shokudo_mae', x: 24, y: 16, w: 17, h: 3, name: '食堂かもめ' },
  { id: 'area_c3_suizokukan', x: 68, y: 16, w: 12, h: 19, name: '旧水族館' },
  { id: 'area_c3_kaisui', x: 52, y: 19, w: 16, h: 13, name: '海水浴場' },
  { id: 'area_c3_siren', x: 25, y: 2, w: 20, h: 9, name: 'サイレン塔' },
  { id: 'area_c3_dandan', x: 46, y: 2, w: 20, h: 9, name: 'みかん畑' },
  { id: 'area_c3_bouhatei', x: 5, y: 27, w: 42, h: 7, name: '防波堤' },
  { id: 'area_c3_minato', x: 33, y: 19, w: 19, h: 5, name: '港' },
  { id: 'area_c3_minato', x: 2, y: 24, w: 50, h: 7, name: '港' },
];

export const UMIZOI: MapDef = {
  id: 'map_umizoi',
  name: '海ぞいの町',
  kind: 'outdoor',
  chapter: 3,
  stageFlag: 'flag_ch3_stage',
  rows: ROWS,
  legend: LEGEND,
  objects: OBJECTS,
  camera: 'follow',
  variant: 'outdoor',
  space: 'minato',
  outside: '#2A5A82',
  zones: ZONES,
  structMats: [
    // (the last zone that matches wins) every H the black pines of the hill and the cape…
    { x: 0, y: 0, w: 80, h: 40, mat: 'c3_matsu', ch: 'H' },
    { x: 0, y: 0, w: 80, h: 40, mat: 'c3_iwa', ch: 'K' },
    { x: 0, y: 0, w: 80, h: 40, mat: 'c3_tetra', ch: 'X' },
    { x: 0, y: 0, w: 80, h: 40, mat: 'c3_ishigaki', ch: 'B' },
    // …but the garden trees between the houses (y11–15)
    ...[10, 14, 24, 36, 46].map((x) => ({ x, y: 11, w: x === 14 ? 1 : 2, h: 5, mat: 'zoki', ch: 'H' })),
  ],
  bgm: { 1: 'bgm_umi_noon', 2: 'bgm_umi_noon', 4: 'bgm_umi_noon' },
  amb: { 1: ['amb_c3_umi', 'amb_c3_semi'], 2: ['amb_c3_umi', 'amb_c3_semi'] },
};

// 12:00 (8月31日): the sun is due south and high (62 8.3 pal_c3_noon) — every
// long shadow falls straight north and short. (The ending's afternoon, stage
// 4, leans a little east of north: pal_c3_gogo.)
Object.defineProperty(UMIZOI, 'shadowVec', {
  get: (): [number, number] => (flag('flag_ch3_stage') >= 4 ? [0.35, -0.94] : [0, -1]),
  enumerable: true,
});

registerMap(UMIZOI);
