// The rooms of 海ぞいの町 the first part needs (62_ch3_level_art 4.2・4.3):
// 食堂 かもめ (map_c3_shokudo) and 港の 市場 (map_c3_ichiba). Rows are 62's
// grids verbatim. The people and the things say what the scenario registers
// by their ids (events/ch3/umizoi.ts); the auction (S07), the set meal
// (S08) and あぜ道市's shops (S10) are the second part's.

import '../../art/props/c3_rooms';
import { getMapDef, registerMap } from '../../world/maps';
import { pgBand, pgOn, pgRoomTone } from '../../world/postgame';
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

// (at 12:01 the cook, the regular and the auctioneers are outside: umizoi.ts)
const S1 = { stage: 1 };
/**
 * 港の 市場's customers (fix1015 G2): at 12:00 where they stood (S1), from 12:01 on and after
 * the clear moving (S2P); after the clear only while the market is open (the morning and the day).
 */
const S2P = { stage: '2+', when: () => !pgOn() || pgBand() === 'asa' || pgBand() === 'hiru' };

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
    PR('prop_c3_noren_in', 9, 0),
    { t: 'door', id: 'door_c3_shokudo_out', x: 7, y: 8, w: 2, to: 'map_umizoi', tx: 30, ty: 16, dir: 'down', se: 'se_door_glass' },
    // examine (60 9.3): the blackboard from the counter's end, the menu cards over the tatami's edge
    O('obj_c3_kokuban', 4, 1, { face: 'up' }),
    O('obj_c3_menu', 10, 5, { w: 5, face: 'up' }),
    // ナミエ behind the counter, ゴロウ on his stool (62 4.3)
    { t: 'npc', id: 'npc_c3_shokudo', x: 4, y: 3, dir: 'down', cond: S1 },
    { t: 'npc', id: 'npc_c3_jouren', x: 3, y: 5, dir: 'up', pose: 'sit', off: [0, 1], cond: S1 },
    // two of the town on the tatami, eating the meal that never ends (62 4.3: eat_loop; not to be spoken to)
    { t: 'npc', id: 'c3_kyaku_1', sprite: 'c3_kyaku_a', x: 11, y: 3, dir: 'right', pose: 'eat', off: [0, -2], passerby: true, noTurn: true, cond: S1 },
    { t: 'npc', id: 'c3_kyaku_2', sprite: 'c3_kyaku_b', x: 13, y: 4, dir: 'left', pose: 'eat', off: [0, -2], passerby: true, noTurn: true, cond: S1 },
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
    // the light (fix1015 G2, 依頼主「市場の中をもっと明るく」; 62 4.2・8.6): the fluorescent fittings and the bulbs,
    // the skylights' shafts onto the squares the shell paints (the auction ring, the arcade); boots and ice on the floor
    PR('prop_c3_ichiba_lights', 0, 0),
    PR('prop_c3_tenmado', 0, 0, { fx: 112, fy: 64, fw: 96, fh: 64, rise: 110, shear: 0.15, a: 0.12, motes: 14, seed: 3651 }),
    PR('prop_c3_tenmado', 0, 0, { fx: 336, fy: 80, fw: 208, fh: 32, rise: 96, shear: 0.15, a: 0.14, motes: 16, seed: 3652 }),
    PR('prop_c3_gomunaga', 1, 3),
    PR('prop_c3_gomunaga', 35, 3, { v: 1 }),
    PR('prop_c3_koori', 8, 10),
    // あぜ道市: the six shop spaces, opened by who came (62 4.2: 上 ひのや・豆腐・喫茶 / 下 トマト・休み所・時計)
    ...[20, 25, 30].flatMap((x, i) => [
      // (fix1020c3: the shop's inside and its counter are two pictures, the keeper between them)
      PR('prop_c3_akimise_back', x, 3, { v: i, shop: ['hinoya', 'tofu', 'cafe'][i] }),
      PR('prop_c3_akimise', x, 3, { v: i, shop: ['hinoya', 'tofu', 'cafe'][i] }),
      PR('prop_c3_akimise_back', x, 7, { v: i + 1, shop: ['tomato', 'yasumi', 'tokei'][i] }),
      PR('prop_c3_akimise', x, 7, { v: i + 1, shop: ['tomato', 'yasumi', 'tokei'][i] }),
    ]),
    { t: 'door', id: 'door_c3_seri_out', x: 5, y: 11, w: 2, to: 'map_umizoi', tx: 10, ty: 24, dir: 'down' },
    { t: 'door', id: 'door_c3_azemichi_out', x: 33, y: 11, w: 2, to: 'map_umizoi', tx: 25, ty: 24, dir: 'down' },
    // ネフダマヨイ along the empty shops' back aisle (62 1.5 sym_c3_ichiba_01; stage 1; kept off the shop fronts
    // and the mouth's way in: y9, x20–26 instead of y10, x20–33)
    { t: 'sym', id: 'sym_c3_ichiba_01', enemies: ['enemy_nefuda'], x: 26, y: 9, dir: 'left', move: 'cone', to: [20, 9], cond: S1, restoreAt: [27, 8] },
    // ゲン in front of the auction stand, ツグミ beside him (62 4.2)
    { t: 'npc', id: 'npc_c3_seri', x: 9, y: 4, dir: 'down', cond: S1 },
    { t: 'npc', id: 'npc_c3_seri_deshi', x: 11, y: 4, dir: 'down', cond: S1 },
    // the customers (fix1015 G2, 依頼主「お客がいる雰囲気が欲しい」). 12:00: each stopped where the noon caught
    // them — an アジ held up to the eye over the boxes (pose 'reach', one still frame; passers-by can't be
    // spoken to and don't block). The one who can be spoken to (events/ch3/umizoi.ts) stands by the west boxes.
    // Kept off the auction ring and its trigger (x7–12, y4–7), the 符丁 notes, the shops' talking spots and
    // where あぜ道市's people stand (events/ch3/azemichi.ts)
    { t: 'npc', id: 'c3_ichiba_kyaku', x: 6, y: 7, dir: 'left', pose: 'reach', noTurn: true, cond: S1 },
    { t: 'npc', id: 'c3_ichiba_okyaku_c', x: 6, y: 4, dir: 'left', pose: 'reach', passerby: true, noTurn: true, cond: S1 },
    { t: 'npc', id: 'c3_ichiba_okyaku_b', x: 18, y: 4, dir: 'left', pose: 'reach', passerby: true, noTurn: true, cond: S1 },
    { t: 'npc', id: 'c3_ichiba_okyaku_a', x: 13, y: 8, dir: 'right', pose: 'reach', passerby: true, noTurn: true, cond: S1 },
    { t: 'npc', id: 'c3_ichiba_okyaku_d', sprite: 'c3_ichiba_okyaku_b', x: 24, y: 6, dir: 'up', pose: 'reach', passerby: true, noTurn: true, cond: S1 },
    // 12:01 and after: looking over the boxes, walking the aisles, one going home with a whole box
    { t: 'npc', id: 'c3_ichiba_kyaku', x: 6, y: 8, dir: 'left', move: { kind: 'look', dirs: ['left', 'left', 'down', 'right'], every: [2500, 5000] }, cond: S2P },
    {
      t: 'npc', id: 'c3_ichiba_okyaku_c', x: 1, y: 6, dir: 'right', passerby: true, cond: S2P,
      move: { kind: 'route', points: [[1, 6], [6, 6]], speed: 0.45, wait: 3200 },
    },
    {
      t: 'npc', id: 'c3_ichiba_okyaku_a', x: 13, y: 6, dir: 'down', passerby: true, cond: S2P,
      move: { kind: 'route', points: [[16, 6], [13, 6], [13, 9], [6, 9], [6, 10]], speed: 0.7, wait: 3500, hide: [4] },
    },
    {
      t: 'npc', id: 'c3_ichiba_okyaku_b', x: 20, y: 6, dir: 'right', passerby: true, cond: S2P,
      move: { kind: 'route', points: [[20, 6], [34, 6]], speed: 0.6, wait: 2600, phase: 1.2 },
    },
    {
      t: 'npc', id: 'c3_ichiba_okyaku_d', sprite: 'c3_ichiba_okyaku_c', x: 34, y: 9, dir: 'left', passerby: true, cond: S2P,
      move: { kind: 'route', points: [[34, 9], [20, 9]], speed: 0.5, wait: 3000, phase: 2.5 },
    },
  ] as MapObj[],
  bgm: { 1: 'bgm_umi_noon', 2: 'bgm_umi_noon' },
});

// 港の 市場 is bright (62 1.1・4.2: 天窓と蛍光灯、下地 #EEF2EE; fix1015 G2, 依頼主「市場の中をもっと明るく」): the base of
// its light (render.ts c3Base, hd2d/room.ts brightBase) in place of the stage's evening indoor colour. After the
// clear, in the evening and at night (postgame.ts pgRoomTone), the room takes the time of day's colour instead.
{
  const def = getMapDef('map_c3_ichiba');
  if (def) Object.defineProperty(def, 'lightBase', { get: () => (pgRoomTone(def) ? undefined : '#EEF2EE'), enumerable: true, configurable: true });
}
