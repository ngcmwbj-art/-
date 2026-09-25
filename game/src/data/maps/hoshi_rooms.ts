// The rooms of chapter 2 (52_ch2_level_art 4章): the unlit train (20×7),
// ペロリさん's greenhouse No.3 (9×18), the Ishiguro barn (22×12) and the old
// 星見台 branch school, now the meeting hall (26×12). Rows are 52 4.1–4.4
// verbatim. Each room is painted by one shell prop (art/props/hoshi_rooms_*)
// plus depth-sorted fittings; the dark (52 1.7) and the lights are declared
// here for the world's light map. Since 2026-09-26 the greenhouse's lamps
// and the barn's tubes are on all night (only 南5, under its dead tube, is
// dim); the school's far corridor and rooms stay a step darker than the night.

import { flag } from '../../game/state';
import { registerMap } from '../../world/maps';
import type { MapObj, TileSpec } from '../../world/types';
import { hg, htalk, INDOOR, O, O2, PR } from './hoshi_common';

const s1 = { stage: 1 };
const s1p = { stage: '1+' };

// ================================================================ 4.1 map_hoshi_train（夜の電車、20×7）

const TRAIN_ROWS = [
  '####################', // 0
  '#WWWWWWWWWWWWWWW#CC#', // 1
  '#..SSSSSSSSSSS..SCC#', // 2
  '#...............SCC#', // 3
  '#...............SCC#', // 4
  '#.o.SSSSSSSSSS.oSCC#', // 5
  '##D############D####', // 6
];

const TRAIN_OBJ: MapObj[] = [
  PR('prop_h_train_shell', 0, 0),
  PR('prop_h_train_seiriken', 2, 5),
  PR('prop_h_train_untin', 15, 5),
  PR('prop_h_train_straps', 0, 0),
  // examine: the windows over the north seats (from the aisle, facing north)
  O('obj_hoshi_train_window', 3, 1, { w: 3, face: 'up' }),
  O2('obj_hoshi_train_window', 1, 7, 1, { w: 7, face: 'up' }),
  O('obj_hoshi_amidana', 6, 1, { face: 'up' }),
  O('obj_hoshi_rosenzu', 14, 1, { face: 'up' }),
  O('obj_hoshi_nakazuri', 10, 3, { w: 2, flat: true }),
  O('obj_hoshi_tsurikawa', 3, 4, { w: 11, flat: true }),
  O2('obj_hoshi_tsurikawa', 1, 3, 3, { w: 7, flat: true }),
  O2('obj_hoshi_tsurikawa', 2, 12, 3, { w: 2, flat: true }),
  O('obj_hoshi_seiriken', 2, 5, { face: 'down' }),
  O('obj_hoshi_untin', 15, 5, { face: 'down' }),
  // the driver, his back to us behind the glass (talk from (15,3) facing east)
  { t: 'npc', id: 'npc_hoshi_traindriver', x: 18, y: 3, dir: 'right', noTurn: true, talk: htalk('npc_hoshi_traindriver') },
  // 1.5 s at the front of the car → evt_ch2_arrive (52 1.6)
  { t: 'trig', id: 'trig_ch2_train_front', x: 14, y: 2, w: 2, h: 3, on: 'stay', stayMs: 1500, script: 'evt_ch2_arrive', cond: { notFlag: 'flag_ch2_arrived' } },
];

registerMap({
  id: 'map_hoshi_train',
  name: '夜の電車',
  kind: 'indoor',
  chapter: 2,
  stageFlag: 'flag_ch2_stage',
  rows: TRAIN_ROWS,
  legend: {
    ...INDOOR,
    '.': { ground: hg('h_trainfloor'), step: 'se_step_tile' },
    S: { ground: hg('h_trainfloor'), solid: true, counter: true, tag: 'counter' },
    C: { ground: hg('h_trainfloor'), solid: true, tag: 'prop' },
    o: { ground: hg('h_trainfloor'), solid: true, tag: 'prop' },
    D: { ground: 'void', solid: true, tag: 'void' },
  },
  objects: TRAIN_OBJ,
  camera: 'fixed',
  onEnter: ['evt_ch2_train'],
  space: 'room',
  // the car's lights are off: the night through the windows, lighter since 2026-09-26 (52 4.1)
  lightBase: '#6E6C9E',
  outside: '#0B0B14',
  bgm: { 0: null, 1: null, 2: null },
  amb: { 0: ['amb_h_train'], 1: ['amb_h_train'], 2: ['amb_h_train'] },
});

// ================================================================ 4.2 map_hoshi_house（ペロリさんの3号ハウス、9×18）

const HOUSE_ROWS = [
  '#WWWWWWW#', // 0
  '#WWWWWWW#', // 1
  '#pop.p.p#', // 2
  '#p.p.p.p#', // 3
  '#p.p.p.p#', // 4
  '#p.p.p.p#', // 5
  '#p.p.p.p#', // 6
  '#p.p.p.p#', // 7
  '#S.p.p.p#', // 8
  '#p.p.p.p#', // 9
  '#p.p.p.p#', // 10
  '#p.p.p.p#', // 11
  '#p.p.p.p#', // 12
  '#p.p.p.p#', // 13
  '#p.p.p.p#', // 14
  '#o......#', // 15
  '#......o#', // 16
  '####D####', // 17
];

/** A row of 13 plants (y2–14) at column x, each its own prop; `gap`: the missing plant's index. */
function tomatoRow(x: number, seed: number, gap = -1): MapObj[] {
  const n = 13;
  return Array.from({ length: n }, (_, i) =>
    PR('prop_h_tomato', x, 2 + i, { i, n, seed, ...(i === gap ? { gap: 1 } : {}), ...(i - 1 === gap ? { north: 0 } : {}) }),
  );
}

const HOUSE_OBJ: MapObj[] = [
  PR('prop_h_house_shell', 0, 0),
  // the four rows of plants, one prop per plant (x1 has the gap at (1,8): ふしぎ07)
  ...tomatoRow(1, 1, 6),
  ...tomatoRow(3, 3),
  ...tomatoRow(5, 5),
  ...tomatoRow(7, 7),
  PR('prop_h_hanamaru', 5, 2),
  PR('prop_h_subako', 2, 2),
  PR('prop_h_wakime_bucket', 1, 15),
  PR('prop_h_house_shelf', 7, 16),
  PR('prop_h_house_wire', 0, 0),
  // examine (52 4.2)
  O('obj_hoshi_hanamaru', 5, 2, { face: 'right', fushigi: 'fushigi_ch2_06' }),
  O('obj_hoshi_film', 1, 8, { face: 'left', fushigi: 'fushigi_ch2_07' }),
  O('obj_hoshi_ondokei', 6, 1, { face: 'up' }),
  O('obj_hoshi_subako', 2, 2, { face: 'up' }),
  O('obj_hoshi_kansui', 2, 12, { flat: true }),
  O('obj_hoshi_yuuin', 1, 3, { h: 12, face: 'left' }),
  O2('obj_hoshi_yuuin', 1, 7, 3, { h: 12, face: 'right' }),
  O('obj_hoshi_aotomato', 3, 3, { h: 12 }),
  O2('obj_hoshi_aotomato', 1, 5, 3, { h: 12 }),
  O('obj_hoshi_wakime', 1, 15, { face: 'left' }),
  O('obj_hoshi_nisshi', 7, 16, { face: 'right' }),
  O('obj_hoshi_makiage', 8, 15, { face: 'right' }),
  O('obj_hoshi_house_door', 4, 17, { face: 'down', cond: { notFlag: 'flag_ch2_got_tomato' } }),
  // the sulking tomato (evt_ch2_sune rolls it out) and the pair at the end of the east aisle (h1〜)
  {
    t: 'sym', id: 'sym_hoshi_house_00', enemies: ['enemy_sune_tomato'], x: 4, y: 8, dir: 'down', move: 'sune',
    // beaten, it hangs back on the plant (3,8), on its aisle side: anchored a row
    // lower so it sorts in front of the plant south of it, drawn 28px up
    script: 'evt_ch2_sune', restoreAt: [3, 9], restoreOff: [4, -28], cond: { notFlag: 'flag_ch2_sune_beaten' },
  },
  {
    t: 'sym', id: 'sym_hoshi_house_01', enemies: ['enemy_sune_tomato', 'enemy_sune_tomato'], x: 6, y: 4, dir: 'up', move: 'sune',
    restoreAt: [7, 5], restoreOff: [-4, -28], cond: { stage: '1-2' },
  },
  { t: 'trig', id: 'trig_ch2_sune', x: 4, y: 9, w: 1, h: 2, script: 'evt_ch2_sune', cond: { notFlag: 'flag_ch2_sune_beaten' } },
  { t: 'door', id: 'door_hoshi_house_out', x: 4, y: 17, to: 'map_hoshimidai', tx: 2, ty: 31, dir: 'down', se: 'se_h_vinyl_door' },
];

registerMap({
  id: 'map_hoshi_house',
  name: 'ペロリさんの 3号ハウス',
  kind: 'indoor',
  chapter: 2,
  stageFlag: 'flag_ch2_stage',
  rows: HOUSE_ROWS,
  legend: {
    ...INDOOR,
    '.': { ground: hg('h_sheet'), step: 'se_step_sheet' },
    p: { ground: hg('h_mulch'), solid: true, tag: 'prop' },
    S: { ground: hg('h_mulch'), solid: true, counter: true, tag: 'counter' },
    o: { ground: hg('h_sheet'), solid: true, tag: 'prop' },
    D: { ground: 'void', solid: true, door: true, tag: 'door' },
  },
  objects: HOUSE_OBJ,
  camera: 'follow',
  onEnter: ['evt_ch2_house'],
  variant: 'house',
  space: 'room',
  outside: '#0B0B14',
  // the lamps are on (52 4.2, 2026-09-26): a warm white all through
  lightBase: '#F0E6D2',
  // the はなまるトマト (5,2), 5th truss, until it is picked: it glows even
  // among the lamps — its own warm circle and a breathing halo on the fruit
  darkLights: [{ x: 5, y: 2, ox: 8, oy: 4, r: 88, amp: 4, k: 1, halo: 18, cond: { notFlag: ['flag_ch2_got_tomato', 'flag_ch2_tomato_picked'] } }],
  bgm: { 0: 'bgm_hoshi_night', 1: 'bgm_hoshi_night', 2: 'bgm_hoshi_night' },
  amb: { 0: ['amb_h_house', 'amb_h_tomato', 'amb_h_hachi'], 1: ['amb_h_house', 'amb_h_hachi'], 2: ['amb_h_house', 'amb_h_hachi'] },
});

// ================================================================ 4.3 map_hoshi_barn（石黒牛舎、22×12）

const BARN_ROWS = [
  '#WWWWWWWWWWWWWWWWWWWW#', // 0
  '#WWWWWWWWWWWWWWWWWWWW#', // 1
  '#o..#pppppppppppppppo#', // 2
  '#...#pppppppppppppppo#', // 3
  '#..o#pppppppppppppppo#', // 4
  '#...#SSSSSSSSSSSSSSSo#', // 5
  '#o...................#', // 6
  '#...#SSSSSSSSSSSSSSSo#', // 7
  '#...#pppppppppppppppo#', // 8
  '#...#pppppppppppppppo#', // 9
  '#...#pppppppppppppppo#', // 10
  '##D###################', // 11
];

/**
 * The cows (52 4.3): 4 to a pen, the pen types A–D, 1 in 5 with a little
 * white (8 of 40). Pens: x 5/8/11/14/17, north y2–4, south y8–10.
 * Each cow: [pose, dx, dy (px from the pen's top-left), facing right?, white].
 * 'front' feed at the rail facing the aisle (north pens), 'back' the same seen
 * from behind (south pens), 'side' stand, 'lie' lie and chew the cud, 'sleep'
 * the head turned back.
 */
type Cow = [string, number, number, boolean, string?, string?];
// the pen types (52 4.3); `reach` puts the chores' reaching cow (50 10.19) at the spot's tile
const PEN_A_N = (w1 = '', w4 = '', reach = ''): Cow[] => [['front', 8, 46, false], ['front', 30, 46, false, w1, reach], ['side', 22, 30, true], ['lie', 18, 16, false, w4]];
const PEN_B_N = (w0 = '', reach = ''): Cow[] => [['front', 34, 46, false, w0, reach], ['lie', 14, 18, true], ['lie', 34, 30, false], ['side', 18, 34, false]];
const PEN_C_N = (): Cow[] => [['lie', 14, 14, true], ['lie', 34, 20, false], ['sleep', 16, 32, false], ['lie', 34, 38, true]];
const PEN_D_N = (w2 = '', reach = ''): Cow[] => [['front', 8, 46, false], ['front', 24, 46, false], ['front', 38, 46, false, w2, reach], ['lie', 24, 22, true]];
const PEN_A_S = (w0 = '', w2 = '', w3 = '', reach = ''): Cow[] => [['back', 10, 20, false, w0], ['back', 36, 20, false, '', reach], ['side', 22, 36, false, w2], ['lie', 26, 46, true, w3]];
const PEN_B_S = (w0 = '', reach = ''): Cow[] => [['back', 36, 20, false, w0, reach], ['lie', 12, 36, true], ['lie', 34, 44, false], ['side', 16, 28, true]];
const PEN_C_S = (w3 = ''): Cow[] => [['lie', 14, 24, false], ['lie', 34, 28, true], ['lie', 16, 42, true], ['lie', 36, 46, false, w3]];
const PEN_D_S = (w1 = '', reach = ''): Cow[] => [['back', 8, 20, false], ['back', 24, 20, false, w1, reach], ['back', 40, 20, false], ['lie', 22, 42, true]];

const PENS: { x: number; y: number; cows: Cow[]; sync?: boolean }[] = [
  // north: 北1 A, 北2 B, 北3 C (ふしぎ08), 北4 D, 北5 A
  { x: 5, y: 2, cows: PEN_A_N('belly', '', 'spot_h_esa_01') },
  { x: 8, y: 2, cows: PEN_B_N('leg', 'spot_h_esa_02') },
  { x: 11, y: 2, cows: PEN_C_N(), sync: true },
  { x: 14, y: 2, cows: PEN_D_N('face', 'spot_h_esa_03') },
  { x: 17, y: 2, cows: PEN_A_N('', 'belly_leg') },
  // south: 南1 B, 南2 A (the white-bellied one standing side-on in the middle
  // of the pen, where the white under its belly shows from the aisle), 南3 C, 南4 D, 南5 A
  { x: 5, y: 8, cows: PEN_B_S('', 'spot_h_esa_04') },
  { x: 8, y: 8, cows: PEN_A_S('', 'belly') },
  { x: 11, y: 8, cows: PEN_C_S('face') },
  { x: 14, y: 8, cows: PEN_D_S('belly', 'spot_h_esa_05') },
  { x: 17, y: 8, cows: PEN_A_S('', 'leg', '', 'spot_h_esa_06') },
];

function barnCows(): MapObj[] {
  const out: MapObj[] = [];
  let n = 0;
  for (const pen of PENS)
    for (const [pose, dx, dy, right, white, reach] of pen.cows) {
      // anchor on the tile the cow's feet are on, the rest as a pixel offset
      const px = pen.x * 16 + dx;
      const py = pen.y * 16 + dy;
      const tx = Math.floor(px / 16);
      const ty = Math.floor((py - 1) / 16);
      out.push(
        PR('prop_h_cow', tx, ty, {
          pose,
          right,
          white: white ?? '',
          dx: px - tx * 16,
          dy: py - ty * 16,
          phase: ((n * 37) % 100) / 100,
          sync: pen.sync ? 1 : 0,
          reach: reach ?? '',
          n: n++,
        }),
      );
    }
  return out;
}

/** 牛舎のおてつだい (50 10.19 / 52 4.3): the nine spots, the cups, the pushed feed. */
const ESA: [string, number, number][] = [
  ['spot_h_esa_01', 6, 5], ['spot_h_esa_02', 10, 5], ['spot_h_esa_03', 16, 5],
  ['spot_h_esa_04', 7, 7], ['spot_h_esa_05', 15, 7], ['spot_h_esa_06', 19, 7],
];
const CUPS: [string, number, number][] = [['spot_h_cup_01', 8, 5], ['spot_h_cup_02', 11, 7], ['spot_h_cup_03', 17, 5]];

function barnChores(): { props: MapObj[]; spots: MapObj[] } {
  const props: MapObj[] = [];
  const spots: MapObj[] = [];
  // a water cup on every pen's west post (x5·8·11·14·17; north on the y4 rail, south on y8)
  for (const x of [5, 8, 11, 14, 17])
    for (const north of [true, false]) {
      const spot = CUPS.find(([, cx, cy]) => cx === x && (cy === 5) === north);
      props.push(PR('prop_h_watercup', x, north ? 4 : 8, { side: north ? 'n' : 's', spot: spot ? spot[0] : '' }));
    }
  for (const [id, x, y] of ESA) props.push(PR('decal_h_feed', x, y, { spot: id, side: y === 5 ? 'n' : 's' }));
  // the spots themselves: examined before whatever else is on the trough tile, only while the chores run
  for (const [id, x, y] of [...ESA, ...CUPS])
    spots.push(O(id, x, y, { face: y === 5 ? 'up' : 'down', priority: 1, cond: { flag: 'flag_ch2_barn_work_on', notFlag: 'flag_' + id } }));
  return { props, spots };
}
const CHORES = barnChores();

/** What is examined across each trough tile (52 4.3 飼槽のタイルの調べる物). */
function troughObjs(): MapObj[] {
  const out: MapObj[] = [];
  const north: [number, string, number?][] = [
    [5, 'obj_hoshi_shisou'], [6, 'obj_hoshi_cow', 2], [8, 'obj_hoshi_watercup'], [9, 'obj_hoshi_cow', 2],
    [11, 'fushigi', 3], [14, 'obj_hoshi_kanriban'], [15, 'obj_hoshi_cow', 2], [17, 'obj_hoshi_ogakuzu'], [18, 'obj_hoshi_cow', 2],
  ];
  const south: [number, string, number?][] = [
    [5, 'obj_hoshi_cow', 4], [9, 'obj_hoshi_cow_white', 2], [11, 'obj_hoshi_cow', 9],
  ];
  let k = 0;
  const cow = (x: number, y: number, w: number, face: 'up' | 'down') =>
    k++ === 0 ? O('obj_hoshi_cow', x, y, { w, face }) : O2('obj_hoshi_cow', k, x, y, { w, face });
  for (const [x, id, w] of north) {
    if (id === 'fushigi') out.push(O('obj_hoshi_hansuu', x, 5, { w: w ?? 1, face: 'up', fushigi: 'fushigi_ch2_08', cond: s1p }));
    else if (id === 'obj_hoshi_cow') out.push(cow(x, 5, w ?? 1, 'up'));
    else out.push(O(id, x, 5, { w: w ?? 1, face: 'up' }));
  }
  for (const [x, id, w] of south) {
    if (id === 'obj_hoshi_cow') out.push(cow(x, 7, w ?? 1, 'down'));
    else out.push(O(id, x, 7, { w: w ?? 1, face: 'down' }));
  }
  return out;
}

const BARN_OBJ: MapObj[] = [
  PR('prop_h_barn_shell', 0, 0),
  PR('prop_h_barn_haigou', 1, 2),
  PR('prop_h_barn_pillar', 3, 4),
  PR('prop_h_barn_cart', 1, 6),
  PR('prop_h_barn_shodoku', 2, 9),
  PR('prop_h_barn_spare', 20, 2, { n: 4, v: 1 }),
  PR('prop_h_barn_spare', 20, 7, { n: 4 }),
  PR('prop_h_scoop', 20, 5, {}, { cond: { notFlag: 'flag_ch2_barn_work_on' } }),
  ...barnCows(),
  PR('prop_h_barn_rail', 5, 5, { side: 'n' }),
  PR('prop_h_barn_rail', 5, 7, { side: 's' }),
  ...CHORES.props,
  PR('prop_h_barn_blower', 4, 3),
  PR('prop_h_barn_lights', 0, 0),
  // the chores' spots first (they win over the trough's own examine while the chores run)
  ...CHORES.spots,
  // examine: the anteroom (52 4.3)
  O('obj_hoshi_shodoku', 2, 9, { flat: true }),
  O('obj_hoshi_haigou', 1, 2, { face: 'left' }),
  O('obj_hoshi_brush', 2, 1, { face: 'up' }),
  O('obj_hoshi_mimawari', 3, 4),
  O('obj_hoshi_kanki', 4, 3, { face: 'right' }),
  O('obj_hoshi_kyujisha', 1, 6, { face: 'left' }),
  ...troughObjs(),
  // マサルさん after the gate (h1): at the east end of the feed aisle, his elbow on 北5's rail (52 4.3)
  { t: 'npc', id: 'npc_hoshi_gen', x: 20, y: 6, dir: 'left', pose: 'lean', talk: htalk('npc_hoshi_gen'), cond: { stage: 1, flag: 'flag_ch2_gate_open' } },
  // leaving in the middle of the chores asks first (50 10.19): the door waits, the step before it asks
  { t: 'trig', id: 'trig_ch2_barn_work_quit', x: 2, y: 10, w: 1, h: 1, cond: { flag: 'flag_ch2_barn_work_on' } },
  { t: 'door', id: 'door_hoshi_barn_out', x: 2, y: 11, to: 'map_hoshimidai', tx: 51, ty: 32, dir: 'down', se: 'se_door_heavy', cond: { notFlag: 'flag_ch2_barn_work_on' } },
];

registerMap({
  id: 'map_hoshi_barn',
  name: '石黒牛舎',
  kind: 'indoor',
  chapter: 2,
  stageFlag: 'flag_ch2_stage',
  rows: BARN_ROWS,
  legend: {
    ...INDOOR,
    '.': { ground: hg('h_barnfloor'), step: 'se_step_stone' },
    p: { ground: hg('h_sawdust'), solid: true, tag: 'prop' },
    S: { ground: hg('h_barnfloor'), solid: true, counter: true, tag: 'counter' },
    o: { ground: hg('h_barnfloor'), solid: true, tag: 'prop' },
    D: { ground: 'void', solid: true, door: true, tag: 'door' },
  },
  objects: BARN_OBJ,
  camera: 'fixed',
  onEnter: ['evt_ch2_barn'],
  variant: 'barn',
  space: 'barn',
  outside: '#0B0B14',
  // the tubes over the feed aisle are on all night (52 4.3, 2026-09-26): the
  // fluorescent white. 南5 (x17–19, y8–10) is dim under its one dead tube —
  // the cows' shapes show, their faces don't: マサルさん's flashlight is flat
  // too, so the round's last pen waits for the tomato's light
  lightBase: '#E8ECF0',
  dark: [{ x: 17, y: 8, w: 3, h: 3 }],
  darkCol: '#6E6E86',
  darkEdge: 6,
  darkStar: false,
  bgm: { 0: 'bgm_hoshi_night', 1: 'bgm_hoshi_night', 2: 'bgm_hoshi_night' },
  amb: { 0: ['amb_h_barn'], 1: ['amb_h_barn'], 2: ['amb_h_barn'] },
});

// ================================================================ 4.4 map_hoshi_school（旧 星見台分校・集会所、26×12）

const SCHOOL_ROWS = [
  '##########################', // 0
  '#WWWWWWWWWW#WWWWW#WWW#WWW#', // 1
  '#WWWWWWWWWW#WWWWW#WWW#WWW#', // 2
  '#....o.....#...o.#o.o#ooo#', // 3
  '#o.........#.....#o..#...#', // 4
  '#o..zzzzz..#.....#...#...#', // 5
  '#...z...z..#.oooo#...#...#', // 6
  '#...zzzzz..#.oooo#...#...#', // 7
  '####.....###.#####.###.###', // 8
  '#........................#', // 9
  '#ooo..o..................#', // 10
  '#####D####################', // 11
];

const ZABUTON: [number, number][] = [
  [4, 5], [5, 5], [6, 5], [7, 5], [8, 5], [4, 6], [8, 6], [4, 7], [5, 7], [6, 7], [7, 7], [8, 7],
];

const SCHOOL_OBJ: MapObj[] = [
  PR('prop_h_school_shell', 0, 0),
  ...ZABUTON.map(([x, y], i) => PR('prop_h_zabuton', x, y, { c: i % 3 })),
  // シゲじい and スギばあ (a couple, snoring away) and タケじい (52 10.5; the chars ids keep the old names)
  PR('prop_h_napper', 5, 5, { who: 'masa' }),
  PR('prop_h_napper', 8, 6, { who: 'kiyo' }),
  PR('prop_h_napper', 6, 7, { who: 'take' }),
  PR('prop_h_ochadai', 1, 4),
  PR('prop_h_kyotaku', 5, 3),
  PR('prop_h_getabako', 1, 10),
  PR('prop_h_kasatate', 6, 10),
  // the dark rooms' furniture: always there, sunk a step darker than the night (52 8.5, 2026-09-26)
  PR('prop_h_desks', 13, 6),
  PR('prop_h_kyotaku2', 15, 3),
  PR('prop_h_shokuin_desk', 18, 3),
  PR('prop_h_housou', 22, 3),
  PR('prop_h_school_lamps', 0, 0),
  // examine (52 4.4)
  O('obj_hoshi_kairan', 5, 3, { face: 'up' }),
  O('obj_hoshi_kokuban1', 4, 2, { w: 1, face: 'up' }),
  O2('obj_hoshi_kokuban1', 1, 3, 2, { face: 'up' }),
  O2('obj_hoshi_kokuban1', 2, 5, 2, { face: 'up' }),
  O2('obj_hoshi_kokuban1', 3, 6, 2, { face: 'up' }),
  O('obj_hoshi_photo', 2, 2, { face: 'up' }),
  O('obj_hoshi_kouka', 8, 2, { face: 'up' }),
  O('obj_hoshi_school_window', 10, 2, { face: 'up' }),
  O2('obj_hoshi_school_window', 1, 9, 2, { face: 'up' }),
  ...ZABUTON.filter(([x, y]) => !(x === 5 && y === 5) && !(x === 8 && y === 6) && !(x === 6 && y === 7)).map(([x, y], i) =>
    i === 0 ? O('obj_hoshi_zabuton', x, y, { flat: true }) : O2('obj_hoshi_zabuton', i, x, y, { flat: true }),
  ),
  O('obj_hoshi_nappers', 5, 5, { flat: true }),
  O2('obj_hoshi_nappers', 1, 8, 6, { flat: true }),
  O2('obj_hoshi_nappers', 2, 6, 7, { flat: true }),
  O('obj_hoshi_desks', 13, 6, { w: 4, face: 'down' }),
  O('obj_hoshi_kokuban2', 13, 2, { face: 'up', fushigi: 'fushigi_ch2_09', cond: s1p }),
  O('obj_hoshi_gakkyu_nisshi', 15, 3, { face: 'up' }),
  O('obj_hoshi_yosegaki', 16, 2, { face: 'up' }),
  O('obj_hoshi_shokuin_desk', 18, 3, { h: 2, face: 'left', reward: { item: 'item_kairan_shuniku', flag: 'flag_ch2_hidden_shokuin' } }),
  O('obj_hoshi_kagi', 19, 2, { face: 'up' }),
  O('obj_hoshi_housou_kiki', 23, 3, { face: 'up' }),
  O('obj_hoshi_mic', 22, 3, { face: 'up', fushigi: 'fushigi_ch2_10', cond: s1p }),
  O('obj_hoshi_zukan', 24, 3, { face: 'up' }),
  // the people of the meeting (52 4.4)
  { t: 'npc', id: 'npc_hoshi_kucho', x: 6, y: 3, dir: 'down', talk: htalk('npc_hoshi_kucho') },
  { t: 'npc', id: 'npc_hoshi_fumi', x: 9, y: 3, dir: 'up', talk: htalk('npc_hoshi_fumi'), cond: { stage: '0-1' } },
  { t: 'npc', id: 'npc_hoshi_yoshie', x: 2, y: 5, dir: 'left', talk: htalk('npc_hoshi_yoshie'), script: 'evt_ch2_rest_yoriai' },
  // the dark corridor: pushed back until the lantern (52 1.6: the floor is bad
  // and the rooms at its end are dark); facing it from the lit end says the same
  O('obj_hoshi_rouka_dark', 10, 9, { h: 2, face: 'right', script: 'evt_ch2_dark_block', cond: { notFlag: 'flag_ch2_got_tomato' } }),
  { t: 'trig', id: 'trig_ch2_dark_school', x: 10, y: 9, w: 1, h: 2, script: 'evt_ch2_dark_block', cond: { notFlag: 'flag_ch2_got_tomato' } },
  { t: 'door', id: 'door_hoshi_school_out', x: 5, y: 11, to: 'map_hoshimidai', tx: 26, ty: 28, dir: 'down', se: 'se_door' },
];

const SCHOOL_HALL_SPILL = [{ x: 1, y: 9, w: 9, h: 2, color: '#8A7E90' }];

registerMap({
  id: 'map_hoshi_school',
  name: '旧 星見台分校',
  kind: 'indoor',
  chapter: 2,
  stageFlag: 'flag_ch2_stage',
  rows: SCHOOL_ROWS,
  legend: {
    ...INDOOR,
    '.': { ground: hg('h_schoolwood'), step: 'se_step_wood_bare' },
    z: { ground: hg('h_schoolwood'), step: 'se_step_wood_bare' },
    o: { ground: hg('h_schoolwood'), solid: true, tag: 'prop' },
    D: { ground: 'void', solid: true, door: true, tag: 'door' },
  },
  objects: SCHOOL_OBJ,
  camera: 'follow',
  onEnter: ['evt_ch2_yoriai'],
  variant: 'school',
  space: 'room',
  outside: '#0B0B14',
  lightBase: '#F2E6D0',
  // the spill from the meeting room into the hallway (the night only: in the
  // morning the day comes in through every window alike)
  get lightRegions() {
    return flag('flag_ch2_stage') >= 3 ? undefined : SCHOOL_HALL_SPILL;
  },
  // 52 1.7 gives x10–25, y0–11, but the meeting room's floor runs to x10 (its
  // wall is x11): the dark starts at the partition wall north of the hallway
  // and at x10 in the hallway itself (trig_ch2_dark_school), so the lit room
  // and まつ先生's window are never cut
  dark: [
    { x: 11, y: 0, w: 15, h: 9 },
    { x: 10, y: 9, w: 16, h: 3 },
  ],
  bgm: { 0: 'bgm_hoshi_night', 1: 'bgm_hoshi_night', 2: 'bgm_hoshi_night' },
  amb: { 0: ['amb_h_school', 'amb_h_insects'], 1: ['amb_h_school', 'amb_h_insects'], 2: ['amb_h_school', 'amb_h_insects'] },
});

void s1;
