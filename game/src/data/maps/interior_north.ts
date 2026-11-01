// The north row's rooms (2026-09-28, 02_ch2_index #58; 30_level_art 4.7–4.12,
// texts 10_narrative 6.22 / 7.19): every building on the north side of the
// ginza and up the slope can be entered.
//
//   map_shingo  しんごの家（縁台将棋のしんご）      11×8  door (11,20) of bld_ojii
//   map_shodo   ふでの書道教室（坂の上の家）          11×8  door (17,20) — the gate of bld_slopetop
//   map_tofu    豆腐 くま吉の奥と作業場              12×8  door (38,21) — the counter's flap of bld_tofu
//   map_clock   時計店 チクタク堂                    10×7  door (42,21) of bld_clock
//   map_cafe    喫茶 初日の出                            12×8  door (48–49,21) of bld_cafe
//   map_sake    山吹酒店                             12×8  door (52–54,21) of bld_sake
//
// People already in the town stay there (しんご on his bench, くま吉 at his
// counter); the rooms add their families and the shopkeepers. Each room has
// one or two finds (money ≤ 60円 in all, so the errand's 320円 / ツケ branch
// is untouched). しんご's たんかん: heard from him → the frozen one in 喫茶
// 夕顔's freezer → back to him (src/events/rooms_north.ts).
//
// Grids follow the interiors' rules (interiors.ts): things examined across a
// counter sit on the row right behind it; wall things are examined facing up
// from the first floor row.

import '../../art/props/int_north';
import '../../art/chars/people/north_folk';
import { registerMap } from '../../world/maps';
import { SPEAKERS } from '../../world/msg';
import type { MapObj, TileSpec } from '../../world/types';
import { NOBJ, NREWARD, NREWARD_AFTER, NTALK } from './interior_north_text';

// name tags and voices of the new people (10_narrative 1.5)
Object.assign(SPEAKERS, {
  npc_yuzu: { name: 'ゆず', voice: 'mother' },
  npc_fudeno: { name: 'ふでの先生', voice: 'h_fumi' },
  npc_kinu: { name: 'きぬ', voice: 'h_yoshie' },
  npc_tokio: { name: 'ゆう', voice: 'tokio' }, // ★2026-09-29 ときお→ゆう（40代の女性）。IDは据え置き
  npc_master: { name: 'かずゆき', voice: 'kazuyuki' }, // ★2026-09-30 マスター→かずゆき（40代の男性）。IDは据え置き（02 #71）
  npc_okami: { name: 'おかみ', voice: 'mizumaki' },
});

const WALLS: Record<string, TileSpec> = {
  '#': { ground: 'void', solid: true, tag: 'void' },
  W: { ground: 'void', solid: true, tag: 'iwall' },
  o: { ground: 'auto', solid: true, tag: 'prop' },
  S: { ground: 'auto', solid: true, counter: true, tag: 'counter' },
  D: { ground: 'void', solid: true, door: true, tag: 'door' },
};
const legend = (floor: TileSpec['ground'], extra: Record<string, TileSpec> = {}): Record<string, TileSpec> => ({
  ...WALLS,
  '.': { ground: floor },
  ...extra,
});

const O = (id: string, x: number, y: number, extra: Record<string, unknown> = {}): MapObj =>
  ({ t: 'obj', id, x, y, text: NOBJ[id], ...extra }) as MapObj;
const PR = (prop: string, x: number, y: number, opts?: Record<string, unknown>): MapObj =>
  ({ t: 'prop', prop, x, y, ...(opts ? { opts } : {}) }) as MapObj;
/** A find: examined once for the item / money (the default examine handles it). */
const FIND = (id: string, x: number, y: number, reward: { item?: string; money?: number }, extra: Record<string, unknown> = {}): MapObj =>
  ({ t: 'obj', id, x, y, text: NREWARD[id], reward: { ...reward, flag: 'flag_find_' + id.replace(/^obj_/, ''), after: NREWARD_AFTER[id] }, ...extra }) as MapObj;
const NPC = (id: string, x: number, y: number, extra: Record<string, unknown> = {}): MapObj =>
  ({ t: 'npc', id, x, y, dir: 'down', talk: NTALK[id], move: { kind: 'stand' }, ...extra }) as MapObj;

// ================================================================ 4.7 map_shingo（しんごの家、11×8）

// A six-mat room (茶の間) with the entrance's tataki by the door. The fridge
// and the tea chest in the north-west, the TV, the window with the mikan
// wind-bell, the 『柑橘の なかま』 poster and the wall of mikan boxes up to
// the ceiling (one slot, 『鹿児島』, empty); the chabudai with ゆず, the fan,
// and the 『ご自由に どうぞ』 box and the shoe chest at the entrance.
export const ROWS_SHINGO = [
  '#WWWWWWWWW#',
  '#WWWWWWWWW#',
  '#oo.o...oo#',
  '#.........#',
  '#...oo....#',
  '#o........#',
  '#...ggg.oo#',
  '#####D#####',
];

registerMap({
  id: 'map_shingo',
  name: 'しんごの家',
  kind: 'indoor',
  rows: ROWS_SHINGO,
  legend: legend('tatami', { g: { ground: 'genkan' } }),
  camera: 'fixed',
  space: 'room',
  theme: 'home',
  light: 'top',
  bgm: { 0: 'bgm_home', 1: 'bgm_home', 2: 'bgm_home' },
  amb: { 0: ['amb_fan', 'amb_fridge'], 1: [], 2: ['amb_fan', 'amb_fridge'] },
  objects: [
    PR('in_sg_shell', 0, 0),
    PR('in_sg_furin', 5, 0),
    PR('in_sg_fridge', 1, 2),
    PR('in_sg_tansu', 2, 2),
    PR('in_sg_tv', 4, 2),
    PR('in_sg_boxes', 8, 2),
    PR('in_sg_zabuton', 3, 4),
    PR('in_sg_table', 4, 4),
    PR('in_sg_fan', 1, 5),
    PR('in_sg_freebox', 8, 6),
    PR('in_sg_getabako', 9, 6),
    // examine
    O('obj_sg_fridge', 1, 2),
    O('obj_sg_tansu', 2, 2),
    O('obj_sg_calendar', 3, 1, { face: 'up' }),
    O('obj_sg_tv', 4, 2),
    O('obj_sg_furin', 5, 1, { face: 'up' }),
    O('obj_sg_poster', 6, 1, { w: 2, face: 'up' }),
    O('obj_sg_boxes', 8, 2, { w: 2 }),
    O('obj_sg_table', 4, 4, { w: 2 }),
    FIND('obj_sg_zabuton', 3, 4, { money: 10 }, { flat: true }),
    O('obj_sg_fan', 1, 5),
    FIND('obj_sg_freebox', 8, 6, { item: 'item_house_mikan' }),
    NPC('npc_yuzu', 6, 4, { dir: 'left', pose: 'sit' }),
    { t: 'door', id: 'door_town_shingo', x: 5, y: 7, to: 'map_town', tx: 11, ty: 21, dir: 'down', se: 'se_door' },
  ],
});

// ================================================================ 4.8 map_shodo（ふでの書道教室、11×8）

// 坂の上の家 — the house of the too-fluent nameplate is a calligraphy class.
// The alcove (a scroll no one can read, one sunflower), the summer homework
// drying on a line along the wall, the pendulum clock, the copybook shelf;
// ふでの先生 kneels behind her low desk (talked to across it, 'S'), two
// long pupils' desks with their cushions, the mosquito coil; the gate's
// door in the east (bld_slopetop's gate is its east end).
export const ROWS_SHODO = [
  '#WWWWWWWWW#',
  '#WWWWWWWWW#',
  '#o.......o#',
  '#...SSS...#',
  '#.........#',
  '#.oo..oo..#',
  '#o......gg#',
  '#########D#',
];

registerMap({
  id: 'map_shodo',
  name: 'ふでの書道教室',
  kind: 'indoor',
  rows: ROWS_SHODO,
  legend: legend('tatami', { g: { ground: 'genkan' } }),
  camera: 'fixed',
  space: 'room',
  theme: 'home',
  light: 'top',
  bgm: { 0: 'bgm_home', 1: 'bgm_home', 2: 'bgm_home' },
  amb: { 0: ['amb_clock_tick'], 1: [], 2: [] },
  objects: [
    PR('in_sd_shell', 0, 0),
    PR('in_sd_works', 2, 0),
    PR('in_sd_clock', 7, 0),
    PR('in_sd_tokonoma', 1, 2),
    PR('in_sd_shelf', 9, 2),
    PR('in_sd_desk', 4, 3),
    PR('in_sd_long', 2, 5, { v: 0 }),
    PR('in_sd_long', 6, 5, { v: 1 }),
    ...[2, 3, 6, 7].map((x) => PR('in_sd_zabuton', x, 6, { v: x })),
    PR('in_sd_katori', 1, 6),
    // examine
    O('obj_sd_scroll', 1, 2),
    O('obj_sd_works', 2, 1, { w: 5, face: 'up' }),
    O('obj_sd_clock', 7, 1, { face: 'up' }),
    O('obj_sd_books', 9, 2),
    O('obj_sd_desk', 4, 3),
    O('obj_sd_desk', 6, 3, { id: 'obj_sd_desk_r', text: NOBJ.obj_sd_desk }),
    FIND('obj_sd_suzuri', 2, 5, { item: 'item_shuzumi' }, { w: 2 }),
    O('obj_sd_practice', 6, 5, { w: 2 }),
    O('obj_sd_katori', 1, 6),
    NPC('npc_fudeno', 5, 2, { pose: 'sit' }),
    { t: 'door', id: 'door_town_shodo', x: 9, y: 7, to: 'map_town', tx: 17, ty: 21, dir: 'down', se: 'se_door' },
  ],
});

// ================================================================ 4.9 map_tofu（豆腐 くま吉の奥と作業場、12×8）

// Through the flap at the counter's east end into the back: the cauldron
// under its hood, the stacked moulds and the press, the mill and the shelf
// of fried tofu; the long water tank (a ラムネ cooling in its corner), the
// tub of tomorrow's soybeans, the sacks and the delivery bike. くま吉 stays
// at his counter on the street (map_town); his wife きぬ works back here.
export const ROWS_TOFU = [
  '#WWWWWWWWWW#',
  '#WWWWWWWWWW#',
  '#oo..ooo.oo#',
  '#..........#',
  '#.oooo...oo#',
  '#..........#',
  '#o........o#',
  '#########D##',
];

registerMap({
  id: 'map_tofu',
  name: '豆腐 くま吉',
  kind: 'indoor',
  rows: ROWS_TOFU,
  legend: legend('genkan'),
  camera: 'fixed',
  space: 'room',
  theme: 'shop',
  light: 'top',
  bgm: { 0: 'bgm_shop', 1: 'bgm_shop', 2: 'bgm_shop' },
  amb: { 0: ['amb_fridge'], 1: [], 2: ['amb_fridge'] },
  objects: [
    PR('in_tf_shell', 0, 0),
    PR('in_tf_kama', 1, 2),
    PR('in_tf_molds', 5, 2),
    PR('in_tf_mill', 9, 2),
    PR('in_tf_shelf', 10, 2),
    PR('in_tf_tank', 2, 4),
    PR('in_tf_tub', 9, 4),
    PR('in_tf_sack', 1, 6),
    PR('in_tf_crates', 10, 6),
    // examine
    O('obj_tf_kama', 1, 2, { w: 2 }),
    O('obj_tf_molds', 5, 2, { w: 3 }),
    O('obj_tf_rappa', 8, 1, { face: 'up' }),
    O('obj_tf_shelf', 10, 2),
    O('obj_tf_tank', 2, 4, { w: 3 }),
    FIND('obj_tf_ramune', 5, 4, { item: 'item_ramune' }),
    O('obj_tf_tub', 9, 4, { w: 2 }),
    FIND('obj_tf_sack', 1, 6, { money: 10 }),
    NPC('npc_kinu', 7, 3),
    { t: 'door', id: 'door_town_tofu', x: 9, y: 7, to: 'map_town', tx: 38, ty: 22, dir: 'down', se: 'se_door_small' },
  ],
});

// ================================================================ 4.10 map_clock（時計店 チクタク堂、10×7）

// Clocks on every wall: the grandfather clock, the wall of clocks and the
// cuckoo clock behind the glass counter (examined across it), ゆう with
// her pocket watch at the counter, the repair shelf (one alarm clock waiting to be
// collected), the 『ご自由に どうぞ』 candy tin and the table of alarm clocks.
export const ROWS_CLOCK = [
  '#WWWWWWWW#',
  '#WWWWWWWW#',
  '#o.....oo#',
  '#.SSSSS..#',
  '#........#',
  '#o..oo...#',
  '#######D##',
];

registerMap({
  id: 'map_clock',
  name: '時計店 チクタク堂',
  kind: 'indoor',
  rows: ROWS_CLOCK,
  legend: legend('shopwood'),
  camera: 'fixed',
  space: 'room',
  theme: 'shop',
  light: 'top',
  bgm: { 0: 'bgm_shop', 1: 'bgm_shop', 2: 'bgm_shop' },
  amb: { 0: ['amb_clock_tick'], 1: [], 2: [] },
  objects: [
    PR('in_ck_shell', 0, 0),
    PR('in_ck_wall', 2, 0),
    PR('in_ck_cuckoo', 6, 0),
    PR('in_ck_grand', 1, 2),
    PR('in_ck_repair', 7, 2),
    PR('in_ck_counter', 2, 3),
    PR('in_ck_candy', 1, 5),
    PR('in_ck_table', 4, 5),
    // examine (across the counter from row 4: x2 the wall of clocks, x3 the
    // showcase, x4 ゆう, x5 the workbench, x6 the cuckoo clock)
    O('obj_ck_grandfather', 1, 2),
    O('obj_ck_wall', 2, 2),
    O('obj_ck_cuckoo', 6, 2),
    O('obj_ck_showcase', 3, 3),
    O('obj_ck_bench', 5, 3),
    O('obj_ck_repair', 7, 2, { w: 2 }),
    FIND('obj_ck_candy', 1, 5, { item: 'item_hakka_ame' }),
    O('obj_ck_table', 4, 5, { w: 2 }),
    // チクタク堂の ばらばら時計（02 #88）：7つ目の あと、作業台の よこ（カウンターの 東の はし）に 額の 写真。
    // (7,3) から 西を 向いて 調べる（(6,4) から 北は 鳩時計の まま）。絵と 文は art/props/tokei7.ts・events/tokei7.ts
    { t: 'prop', prop: 'prop_tokei7_photo', x: 6, y: 3, cond: { flag: 'flag_tokei7_done' } } as MapObj,
    O('obj_tokei7_photo', 6, 3, { face: 'left', cond: { flag: 'flag_tokei7_done' } }),
    NPC('npc_tokio', 4, 2),
    { t: 'door', id: 'door_town_clock', x: 7, y: 6, to: 'map_town', tx: 42, ty: 22, dir: 'down', se: ['se_door_glass', 'se_shop_bell'] },
  ],
});

// ================================================================ 4.11 map_cafe（喫茶 初日の出、12×8）

// The counter along the west (the master behind it, the siphon and the
// menu on it, the chest freezer and the cups behind), the record player,
// the painting of 夕顔, the pink phone and the 夕顔 in its pot; the regular's
// window seat, the table game (two 10円 in its return slot) and a table
// for two. A ceiling fan turns over the middle of the room.
export const ROWS_CAFE = [
  '#WWWWWWWWWW#',
  '#WWWWWWWWWW#',
  '#oo...o..oo#',
  '#SSSSS.....#',
  '#.......oo.#',
  '#..........#',
  '#.oo....oo.#',
  '######D#####',
];

registerMap({
  id: 'map_cafe',
  name: '喫茶 初日の出',
  kind: 'indoor',
  rows: ROWS_CAFE,
  legend: legend('shopwood'),
  camera: 'fixed',
  space: 'room',
  theme: 'shop',
  light: 'top',
  bgm: { 0: 'bgm_shop', 1: 'bgm_shop', 2: 'bgm_shop' },
  amb: { 0: ['amb_fan'], 1: [], 2: ['amb_fan'] },
  objects: [
    PR('in_cf_shell', 0, 0),
    PR('in_cf_back', 1, 2),
    PR('in_cf_counter', 1, 3),
    PR('in_cf_record', 6, 2),
    PR('in_cf_phone', 9, 2),
    PR('in_cf_plant', 10, 2),
    PR('in_cf_booth', 8, 4),
    PR('in_cf_game', 2, 6),
    PR('in_cf_table', 8, 6),
    PR('in_cf_fan', 5, 4),
    // examine
    { t: 'obj', id: 'obj_cf_freezer', x: 1, y: 2, text: NOBJ.obj_cf_freezer, script: 'obj_cf_freezer' } as MapObj,
    O('obj_cf_siphon', 2, 3),
    O('obj_cf_menu', 4, 3),
    O('obj_cf_record', 6, 2),
    O('obj_cf_painting', 7, 1, { w: 2, face: 'up' }),
    O('obj_cf_phone', 9, 2),
    O('obj_cf_plant', 10, 2),
    O('obj_cf_booth', 8, 4, { w: 2 }),
    FIND('obj_cf_game', 2, 6, { money: 20 }, { w: 2 }),
    NPC('npc_master', 3, 2),
    // ぶーさんの本体（02 #71）: stage 2, on the window seat's right chair, until なんばるわん takes him to the park
    NPC('npc_bu_body', 9, 4, { dir: 'left', pose: 'sit', ghost: true, shadow: 0, script: 'npc_bu_body', cond: { stage: 2, notFlag: 'flag_bu_left' } }),
    { t: 'door', id: 'door_town_cafe', x: 6, y: 7, to: 'map_town', tx: 48, ty: 22, dir: 'down', se: ['se_door', 'se_shop_bell'] },
  ],
});

// ================================================================ 4.12 map_sake（山吹酒店、12×8）

// The wall of 一升瓶, the うちわ and the brewery's calendar, the glass
// fridge; the island of snacks and juice (星見台 トマトジュース), the
// register counter with the desk fan and おかみ; beer crates with the black
// cat asleep on top, and the crates of empties.
export const ROWS_SAKE = [
  '#WWWWWWWWWW#',
  '#WWWWWWWWWW#',
  '#ooooo..ooo#',
  '#..........#',
  '#.oo....SS.#',
  '#..........#',
  '#oo......oo#',
  '######D#####',
];

registerMap({
  id: 'map_sake',
  name: '山吹酒店',
  kind: 'indoor',
  rows: ROWS_SAKE,
  legend: legend('tile_floor'),
  camera: 'fixed',
  space: 'room',
  theme: 'shop',
  light: 'top',
  bgm: { 0: 'bgm_shop', 1: 'bgm_shop', 2: 'bgm_shop' },
  amb: { 0: ['amb_fridge'], 1: [], 2: ['amb_fridge'] },
  objects: [
    PR('in_yb_shell', 0, 0),
    PR('in_yb_shelf', 1, 2),
    PR('in_yb_fridge', 8, 2),
    PR('in_yb_display', 2, 4),
    PR('in_yb_counter', 8, 4),
    PR('in_yb_crates', 1, 6),
    PR('in_yb_empties', 9, 6),
    // examine
    O('obj_yb_shelf', 1, 2, { w: 5 }),
    { t: 'obj', id: 'obj_yb_uchiwa', x: 6, y: 1, face: 'up', text: NOBJ.obj_yb_uchiwa, script: 'obj_yb_uchiwa' } as MapObj,
    O('obj_yb_calendar', 7, 1, { face: 'up' }),
    O('obj_yb_fridge', 8, 2, { w: 3 }),
    O('obj_yb_display', 2, 4, { w: 2 }),
    O('obj_yb_register', 9, 4),
    FIND('obj_yb_bottles', 9, 6, { money: 20 }, { w: 2 }),
    NPC('npc_okami', 8, 3),
    NPC('npc_sake_cat', 1, 6, { sprite: 'npc_cat_kuro', animal: true, noTurn: true, pose: 'sleep', off: [6, -13], shadow: 0 }),
    { t: 'door', id: 'door_town_sake', x: 6, y: 7, to: 'map_town', tx: 54, ty: 22, dir: 'down', se: 'se_door_glass' },
  ],
});

/** Debug spots (lvN): name → [map, x, y, dir]. */
export const NORTH_SPOTS: Record<string, [string, number, number, 'up' | 'down' | 'left' | 'right']> = {
  shingo: ['map_shingo', 5, 6, 'up'],
  shodo: ['map_shodo', 9, 6, 'up'],
  tofu: ['map_tofu', 9, 6, 'up'],
  clock: ['map_clock', 7, 5, 'up'],
  cafe: ['map_cafe', 6, 6, 'up'],
  sake: ['map_sake', 6, 6, 'up'],
};
export const NORTH_MAPS = Object.values(NORTH_SPOTS).map((s) => s[0]);
