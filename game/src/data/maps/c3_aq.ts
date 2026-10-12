// 旧水族館 (62_ch3_level_art 4.8〜4.17): the third part of chapter 3 —
// 入口と券売所 (map_c3_aq_iriguchi), 回廊「40年の 伝票」 (map_c3_aq_kairo),
// ジオラマの 部屋 (map_c3_aq_diorama), 深海の 展示室 (map_c3_aq_shinkai,
// all dark), えさの 部屋 (map_c3_aq_esa), 大水槽の ホール (map_c3_aq_hall),
// えさの 倉庫 (map_c3_aq_souko), 倉庫の外の 廊下 (map_c3_aq_rouka) and 事務所
// (map_c3_aq_jimusho, S25's). Rows are 62's grids, with four fixes where a
// door or an arrival tile fell on a solid cell (the notes at each map). The
// way through is one way (60 4.2): each door opens on the flag of the room
// before it. The people and the things say what the scenario registers by
// their ids (events/ch3); the triggers (62 1.6) are the scenario's too.

import '../../art/props/c3_aq';
import { registerMap } from '../../world/maps';
import type { MapObj, TileSpec } from '../../world/types';

const WALLS: Record<string, TileSpec> = {
  '#': { ground: 'void', solid: true, tag: 'void' },
  W: { ground: 'void', solid: true, tag: 'iwall' },
  o: { ground: 'tile_floor', solid: true, tag: 'prop' },
  S: { ground: 'tile_floor', solid: true, counter: true, tag: 'counter' },
  D: { ground: 'void', solid: true, door: true, tag: 'door' },
};
/** The old aquarium's worn tiles (the shells paint them; the ground is only the footsteps' and the fallback's). */
const FLOOR: TileSpec = { ground: 'tile_floor', step: 'se_step_tile' };
const SOLID: TileSpec = { ground: 'tile_floor', solid: true, tag: 'prop' };

const PR = (prop: string, x: number, y: number, opts?: Record<string, unknown>, cond?: Record<string, unknown>): MapObj =>
  ({ t: 'prop', prop, x, y, ...(opts ? { opts } : {}), ...(cond ? { cond } : {}) }) as MapObj;
const O = (id: string, x: number, y: number, extra: Record<string, unknown> = {}): MapObj => ({ t: 'obj', id, x, y, ...extra }) as unknown as MapObj;

/**
 * A door that stays shut until its flag: the door does nothing while shut
 * (field.ts checkDoors); what is said on pushing it is the scenario's
 * (trig door_c3_aq_*_locked, events/ch3). `closed` notes what it is.
 */
function gated(d: Record<string, unknown>, closed: string): MapObj[] {
  void closed;
  return [{ t: 'door', ...d } as unknown as MapObj];
}

/** Until みんなが来る (S25): the staff doors stay shut (the chapter's third part stops before it). */
const MINNA = { flag: 'flag_ch3_minna' };
const SHUT = 'かぎが かかっている。';

const COMMON = {
  kind: 'indoor' as const,
  chapter: 3 as const,
  stageFlag: 'flag_ch3_stage' as const,
  space: 'room',
  light: 'top' as const,
  outside: '#0E1620',
};

// ================================================================ 4.8 map_c3_aq_iriguchi（入口と券売所、20×12）

const ROWS_IRIGUCHI = [
  '#WWWWWWWWWWWWWWWWWW#', // 0
  '#WWWWWWWWWDWWWWWWWW#', // 1
  '#ffffffffffffffffff#', // 2
  '#ffoofffffffffffoofD', // 3
  '#ffffffffffffffffff#', // 4
  '#ffffffffffffffffff#', // 5
  '#WWWWSff####WWWWWWW#', // 6
  '#eeeeSff#..........#', // 7
  '#eoeeSff#..oo..oo..#', // 8
  '#eeeeSff#..........#', // 9
  '#eeee#fff..........#', // 10
  '#######DD###########', // 11
];

registerMap({
  ...COMMON,
  id: 'map_c3_aq_iriguchi',
  name: '旧水族館',
  rows: ROWS_IRIGUCHI,
  legend: {
    ...WALLS,
    f: FLOOR,
    '.': FLOOR,
    // inside the ticket booth (nobody goes in: ポコシャ / エゴ at its window)
    e: SOLID,
  },
  camera: 'fixed',
  lightBase: '#9AB0B4',
  objects: [
    PR('prop_c3_aq_iriguchi_shell', 0, 0),
    PR('prop_c3_aq_bench_s', 3, 3),
    PR('prop_c3_aq_penguin', 16, 3),
    PR('prop_c3_aq_reji', 2, 8),
    PR('prop_c3_aq_tana', 11, 8, { v: 0 }),
    PR('prop_c3_aq_tana', 15, 8, { v: 1 }),
    // ポコシャ's arrows on the floor at each room's way on (60 5.3, decal_c3_pokosha_ya)
    PR('prop_c3_aq_ya', 10, 2, { dir: 'up' }),
    // the sunfish under the ceiling, dusty on its strings (a foreground part)
    PR('prop_c3_aq_manbou', 0, 0),
    ...gated({ id: 'door_c3_aq_glass_out', x: 7, y: 11, w: 2, to: 'map_umizoi', tx: 74, ty: 29, dir: 'down', se: 'se_door_glass', cond: { notFlag: 'flag_ch3_aq_enter' } }, 'ガラス戸は、外から／かぎが かけられている。'),
    { t: 'door', id: 'door_c3_aq_kairo', x: 10, y: 1, to: 'map_c3_aq_kairo', tx: 1, ty: 5, dir: 'up' },
    // the staff passage to the corridor outside the store (S25 on)
    ...gated({ id: 'door_c3_aq_ura_in', x: 19, y: 3, to: 'map_c3_aq_rouka', tx: 1, ty: 3, dir: 'right', se: 'se_door', cond: MINNA }, SHUT),
    O('obj_c3_aq_ticket', 5, 6, { h: 4, face: 'left' }),
    O('obj_c3_aq_penguin', 16, 3, { w: 2, face: 'up' }),
    // the PA's loudspeaker high on the north wall (62: over (10,2); moved two tiles east off the doorway)
    O('obj_c3_aq_speaker', 12, 1, { face: 'up' }),
  ] as MapObj[],
});

// ================================================================ 4.11 map_c3_aq_kairo（回廊「40年の 伝票」、40×7）
// (62's grid had the display stands at (1–2,5) over the way in (1,6) and at (20–21,5) over the staff door
// (20,6): they stand at (3–4,5) and (23–24,5) here so both doors have a floor tile in front)

const ROWS_KAIRO = [
  '########################################', // 0
  '#WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW#', // 1
  '#WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW#', // 2
  '#ffffffffffffffffffffffffffffffffffffffD', // 3
  '#ffffffffffffffffffffffffffffffffffffff#', // 4
  '#ffooffffffooffffffffffooffffffooffffff#', // 5
  '#D##################D###################', // 6
];

registerMap({
  ...COMMON,
  id: 'map_c3_aq_kairo',
  name: '回廊',
  rows: ROWS_KAIRO,
  legend: { ...WALLS, f: FLOOR },
  camera: 'follow',
  lightBase: '#8A9CA4',
  objects: [
    PR('prop_c3_aq_kairo_shell', 0, 0),
    ...[3, 10, 23, 30].map((x, i) => PR('prop_c3_aq_tenjidai', x, 5, { v: i })),
    PR('prop_c3_aq_ya', 38, 3, { dir: 'right' }),
    { t: 'door', id: 'door_c3_aq_kairo_back', x: 1, y: 6, to: 'map_c3_aq_iriguchi', tx: 10, ty: 2, dir: 'down' },
    ...gated({ id: 'door_c3_aq_diorama', x: 39, y: 3, to: 'map_c3_aq_diorama', tx: 1, ty: 14, dir: 'right', cond: { flag: 'flag_ch3_kairo_done' } }, 'ヒロスケが、道を ふさいでいる。'),
    ...gated({ id: 'door_c3_aq_jimusho', x: 20, y: 6, to: 'map_c3_aq_jimusho', tx: 5, ty: 6, dir: 'down', se: 'se_door', cond: MINNA }, '『関係者以外 立入禁止』。'),
    // the twelve notes among 40 years of slips (60 S16; west to east 01〜12), and the one blank day
    ...Array.from({ length: 12 }, (_, k) => O(`obj_c3_denpyo_${String(k + 1).padStart(2, '0')}`, 4 + 3 * k, 2, { face: 'up' })),
    O('obj_c3_denpyo_hakushi', 38, 2, { face: 'up', fushigi: 'fushigi_ch3_07' }),
    // ジュンロ (61 9.5, optional; stays after S24 so ヤキソバン can be tried, 61 15)
    { t: 'sym', id: 'sym_c3_aq_01', enemies: ['enemy_junro'], x: 20, y: 4, dir: 'right', move: 'cone', to: [30, 4], cond: { flag: 'flag_ch3_aq_enter', notFlag: 'flag_ch3_minna' }, restoreAt: [20, 4] },
  ] as MapObj[],
});

// ================================================================ 4.12 map_c3_aq_diorama（ジオラマの 部屋、24×16）
// (62's way in at (0,15) touched no floor tile: the doorway is (0,14), arrival (1,14))

const ROWS_DIORAMA = [
  '########################', // 0
  '#WWWWWWWWWWWWWWWWWWWWWW#', // 1
  '#WWWWWWWWWWWWWWWWWWWWWW#', // 2
  '#ffffffffffffffffffffffD', // 3
  '#ffJJJJJffffffJJJJJffff#', // 4
  '#ffJJJJJffffffJJJJJffff#', // 5
  '#ffJJJJJffffffJJJJJffff#', // 6
  '#ffffffffffffffffffffff#', // 7
  '#ffffffJJJJJJJJJfffffff#', // 8
  '#ffffffJJJJJJJJJfffffff#', // 9
  '#ffffffJJJJJJJJJfffffff#', // 10
  '#ffffffffffffffffffffff#', // 11
  '#ffoffffffffffffffffoff#', // 12
  '#ffffffffffffffffffffff#', // 13
  'Dffffffffffffffffffffff#', // 14
  '########################', // 15
];

registerMap({
  ...COMMON,
  id: 'map_c3_aq_diorama',
  name: 'ジオラマの 部屋',
  rows: ROWS_DIORAMA,
  legend: { ...WALLS, f: FLOOR, J: SOLID },
  camera: 'follow',
  lightBase: '#6E7A8A',
  objects: [
    PR('prop_c3_aq_diorama_shell', 0, 0),
    PR('prop_c3_aq_diorama', 3, 4, { town: 'yunari' }),
    PR('prop_c3_aq_diorama', 14, 4, { town: 'hoshi' }),
    PR('prop_c3_aq_diorama', 7, 8, { town: 'umi' }),
    PR('prop_c3_aq_setsumei', 3, 12, { v: 0 }),
    PR('prop_c3_aq_setsumei', 20, 12, { v: 1 }),
    PR('prop_c3_aq_ya', 22, 3, { dir: 'right' }),
    { t: 'door', id: 'door_c3_aq_diorama_back', x: 0, y: 14, to: 'map_c3_aq_kairo', tx: 38, ty: 3, dir: 'left' },
    ...gated({ id: 'door_c3_aq_shinkai', x: 23, y: 3, to: 'map_c3_aq_shinkai', tx: 21, ty: 16, dir: 'right', se: 'se_c3_curtain', cond: { flag: 'flag_ch3_diorama_done' } }, '黒い カーテンの 前に、／ヒロスケが 立っている。'),
    O('obj_c3_diorama_yunari', 3, 4, { w: 5, h: 3 }),
    O('obj_c3_diorama_hoshi', 14, 4, { w: 5, h: 3 }),
    O('obj_c3_diorama_umi', 7, 8, { w: 9, h: 3 }),
    // マフィ屋: the 夕鳴町 model's south-west corner, examined from (3,7) facing up (60 S17, required)
    O('obj_c3_diorama_mafiya', 3, 6, { face: 'up', priority: 1 }),
    // the three clocks over the models (5,1) 夕鳴町・(11,1) 海ぞいの町・(16,1) 星見台
    O('obj_c3_diorama_clock', 5, 1, { face: 'up', fushigi: 'fushigi_ch3_08' }),
    O('obj_c3_diorama_clock', 11, 1, { face: 'up', fushigi: 'fushigi_ch3_08' }),
    O('obj_c3_diorama_clock', 16, 1, { face: 'up', fushigi: 'fushigi_ch3_08' }),
    { t: 'sym', id: 'sym_c3_aq_02', enemies: ['enemy_junro'], x: 21, y: 3, dir: 'left', move: 'cone', to: [16, 3], cond: { flag: 'flag_ch3_aq_enter', notFlag: 'flag_ch3_minna' }, restoreAt: [21, 3] },
  ] as MapObj[],
});

// ================================================================ 4.13 map_c3_aq_shinkai（深海の 展示室、23×18。全体が暗がり）

const ROWS_SHINKAI = [
  '#######################', // 0
  '#WWWWWWWWWWGGGWWWWWWWW#', // 1
  'DffffQfffffffffffQffff#', // 2
  '#ffffQffQQQQQQfffQffff#', // 3
  '#QQffQffQffffQfffQQQff#', // 4
  '#ffffQffQffffQfffffQff#', // 5
  '#ffQQQffQffQQQQQffQQff#', // 6
  '#ffffffffffQfffQffffff#', // 7
  '#QQQQQQQQffQfffQQQQffQ#', // 8
  '#ffffffQfffQffffffQffQ#', // 9
  '#ffQQffQffffffQffffffQ#', // 10
  '#ffQffffffQQQQQffQQQQQ#', // 11
  '#ffQffQQffQffffffQffff#', // 12
  '#ffQffQfffQffQQQQQffQf#', // 13
  '#ffffffffffffQffffffQf#', // 14
  '#QQQQQffQQQQQQffQQffQf#', // 15
  '#ffffffffffffffffQffff#', // 16
  '#####################D#', // 17
];

registerMap({
  ...COMMON,
  id: 'map_c3_aq_shinkai',
  name: '深海の 展示室',
  rows: ROWS_SHINKAI,
  legend: { ...WALLS, f: { ground: 'tile_floor', step: 'se_step_tatami' }, Q: SOLID, G: { ground: 'void', solid: true, tag: 'iwall' } },
  camera: 'follow',
  lightBase: '#7A8898',
  // the whole room is dark (62 1.7・8.5): ハンコケースの 朱 at his chest and グソっ君's eyes (world/c3dark.ts)
  dark: [{ x: 0, y: 0, w: 23, h: 18 }],
  darkCol: '#2A3A52',
  darkStar: false,
  objects: [
    PR('prop_c3_aq_shinkai_shell', 0, 0),
    // every Q cell: a case or a tank's pillar, joined to its neighbours along the row (the marine snow's is its own)
    ...ROWS_SHINKAI.flatMap((r, y) =>
      [...r].flatMap((c, x) =>
        c === 'Q' && !(x === 17 && y === 2) ? [PR('prop_c3_aq_case', x, y, { l: r[x - 1] === 'Q', r: r[x + 1] === 'Q', v: (x * 7 + y * 3) % 5 })] : [],
      ),
    ),
    // the empty tank at the far end (11–13,1), its glass scratched inside (7.4)
    PR('prop_c3_aq_kara_suisou', 11, 1),
    // マリンスノー: the only thing that moves in the room (8.8)
    PR('prop_c3_aq_marine', 17, 2),
    PR('prop_c3_aq_ya', 1, 2, { dir: 'left' }),
    { t: 'door', id: 'door_c3_aq_shinkai_back', x: 21, y: 17, to: 'map_c3_aq_diorama', tx: 22, ty: 3, dir: 'down', se: 'se_c3_curtain' },
    ...gated({ id: 'door_c3_aq_esa', x: 0, y: 2, to: 'map_c3_aq_esa', tx: 11, ty: 5, dir: 'left', se: 'se_door', cond: { flag: 'flag_ch3_shinkai_done' } }, '『関係者以外』の 戸。／かぎが かかっている。'),
    // the five empty cases (their name cards only; 60 9.5)
    O('obj_c3_shinkai_case_1', 5, 3),
    O('obj_c3_shinkai_case_2', 8, 4),
    O('obj_c3_shinkai_case_3', 18, 4),
    O('obj_c3_shinkai_case_4', 3, 6),
    O('obj_c3_shinkai_case_5', 12, 11),
    ...([[5, 3], [8, 4], [18, 4], [3, 6], [12, 11]] as const).map(([x, y], i) => PR('prop_c3_aq_nafuda_case', x, y, { v: i })),
    O('obj_c3_marine_snow', 17, 2, { fushigi: 'fushigi_ch3_09' }),
    O('obj_c3_kara_suisou', 11, 1, { w: 3, face: 'up' }),
    // the six scraps of the keeper's diary, in this order (60 S18): the paper glints 1px in the eyes' light
    ...([[16, 16], [1, 16], [18, 5], [10, 4], [1, 9], [13, 12]] as const).map(([x, y], k) =>
      O(`obj_c3_nisshi_${String(k + 1).padStart(2, '0')}`, x, y, { prop: 'prop_c3_aq_nisshi', flat: true, cond: { notFlag: `flag_ch3_nisshi_${String(k + 1).padStart(2, '0')}` } }),
    ),
  ] as MapObj[],
});

// ================================================================ 4.14 map_c3_aq_esa（えさの 部屋、14×10）

const ROWS_ESA = [
  '##############', // 0
  '#WWWWWWWWWWWW#', // 1
  '#ooffffffSSoo#', // 2
  '#fffffffffffo#', // 3
  '#ffffoofffff##', // 4
  '#ffffoofffffD#', // 5
  '#ffffffffffff#', // 6
  '#offffffffoof#', // 7
  '#ffffffffffff#', // 8
  '#####D########', // 9
];

registerMap({
  ...COMMON,
  id: 'map_c3_aq_esa',
  name: 'えさの 部屋',
  rows: ROWS_ESA,
  legend: { ...WALLS, f: FLOOR },
  camera: 'fixed',
  lightBase: '#D8DCD4',
  objects: [
    PR('prop_c3_aq_esa_shell', 0, 0),
    PR('prop_c3_aq_nagashi', 1, 2),
    PR('prop_c3_aq_sagyoudai', 9, 2),
    PR('prop_c3_aq_locker', 11, 2),
    PR('prop_c3_aq_esa_desk', 5, 4),
    PR('prop_c3_aq_reitouko', 1, 7),
    PR('prop_c3_aq_fudakake', 10, 7),
    PR('prop_c3_aq_ya', 5, 8, { dir: 'down' }),
    { t: 'door', id: 'door_c3_aq_esa_back', x: 12, y: 5, to: 'map_c3_aq_shinkai', tx: 1, ty: 2, dir: 'right', se: 'se_door' },
    ...gated({ id: 'door_c3_aq_hall', x: 5, y: 9, to: 'map_c3_aq_hall', tx: 12, ty: 16, dir: 'down', se: ['se_c3_key', 'se_door_heavy'], cond: { flag: 'flag_ch3_esa_done' } }, 'ホールへの 戸。／かぎが かかっている。'),
    O('obj_c3_esa_board', 9, 1, { w: 2, face: 'up' }),
    O('obj_c3_esa_clock', 6, 1, { face: 'up' }),
    O('obj_c3_esa_fuda', 10, 7, { w: 2 }),
    O('obj_c3_esa_bucket', 5, 4, { w: 2, h: 2 }),
  ] as MapObj[],
});

// ================================================================ 4.15 map_c3_aq_hall（大水槽の ホール、26×18）

const ROWS_HALL = [
  '##########################', // 0
  '#GGGGGGGGGGGGGGGGGGGGGGGG#', // 1
  '#GGGGGGGGGGGGGGGGGGGGGGGG#', // 2
  '#GGGGGGGGGGGGGGGGGGGGGGGG#', // 3
  '#GGGGGGGGGGGGGGGGGGGGGGGG#', // 4
  '#FFFFFFFFFFFFFFFFFFFFFFFF#', // 5
  '#ffffffffffffffffffffffff#', // 6
  '#fffffffffoooooffffffffff#', // 7
  '#ffffffffffffffffffffffff#', // 8
  '#ffffffffffffffffffffffff#', // 9
  '#ffooofffffffffffffooofff#', // 10
  'Dffffffffffffffffffffffff#', // 11
  '#ffffffffffffffffffffffff#', // 12
  '#ffffffffffffffffffffffff#', // 13
  '#ffffffffffffffffffffffff#', // 14
  '#ffffffffffffffffffffffff#', // 15
  '#ffffffffffffffffffffffff#', // 16
  '############DD############', // 17
];

registerMap({
  ...COMMON,
  id: 'map_c3_aq_hall',
  name: '大水槽の ホール',
  rows: ROWS_HALL,
  legend: { ...WALLS, f: FLOOR, G: { ground: 'void', solid: true, tag: 'iwall' }, F: SOLID },
  camera: 'follow',
  // in front of the big tank (y ≤ 9) the camera holds the whole tank (62 4.15)
  camLocks: [{ x: 1, y: 1, w: 24, h: 9, at: [12, 6] }],
  lightBase: '#7C8C9C',
  objects: [
    PR('prop_c3_aq_hall_shell', 0, 0),
    PR('prop_c3_aq_hall_rail', 1, 5),
    PR('prop_c3_aq_hall_bench', 10, 7),
    PR('prop_c3_aq_hall_dai', 3, 10, { v: 0 }),
    PR('prop_c3_aq_hall_dai', 19, 10, { v: 1 }),
    // the cold yakisoba pack left on the bench after S28 (obj_c3_hall_pack is the scenario's to show)
    PR('prop_c3_aq_yakisoba', 13, 7, {}, { flag: 'flag_ch3_boss_beaten' }),
    ...gated({ id: 'door_c3_aq_hall_back', x: 12, y: 17, w: 2, to: 'map_c3_aq_esa', tx: 5, ty: 8, dir: 'down', se: 'se_door_heavy', cond: { notFlag: 'flag_ch3_tsugao1' } }, SHUT),
    ...gated({ id: 'door_c3_aq_hall_w_in', x: 0, y: 11, to: 'map_c3_aq_jimusho', tx: 12, ty: 5, dir: 'left', se: 'se_door', cond: MINNA }, SHUT),
    O('obj_c3_hall_suisou', 1, 4, { w: 24, face: 'up' }),
    O('obj_c3_hall_bench', 10, 7, { w: 5 }),
    // the pack left on the bench after S28 (60 9.5)
    O('obj_c3_hall_pack', 13, 7, { priority: 1, cond: { flag: 'flag_ch3_boss_beaten' } }),
  ] as MapObj[],
});

// ================================================================ 4.16 map_c3_aq_souko（えさの 倉庫、12×9）

const ROWS_SOUKO = [
  '############', // 0
  '#WWWWWWWWWW#', // 1
  '#XXoXXccXXo#', // 2
  '#cccccccccc#', // 3
  '#XXcccccccX#', // 4
  '#cccccoccXX#', // 5
  '#cccccccccc#', // 6
  '#XXccccccco#', // 7
  '#####DD#####', // 8
];

registerMap({
  ...COMMON,
  id: 'map_c3_aq_souko',
  name: 'えさの 倉庫',
  rows: ROWS_SOUKO,
  legend: { ...WALLS, c: { ground: 'tile_floor', step: 'se_step_tile' }, X: SOLID },
  camera: 'fixed',
  lightBase: '#8C8C9A',
  // S22's night in the store only (62 1.7): while flag_c3_souko_night (the scenario sets and clears it)
  dark: [{ x: 1, y: 2, w: 10, h: 6 }],
  darkCol: '#2E2E44',
  darkStar: false,
  darkCond: { flag: 'flag_c3_souko_night' },
  objects: [
    PR('prop_c3_aq_souko_shell', 0, 0),
    PR('prop_c3_aq_hakoyama', 1, 2, { v: 0 }),
    PR('prop_c3_aq_hakoyama', 4, 2, { v: 1 }),
    PR('prop_c3_aq_hakoyama', 8, 2, { v: 2 }),
    PR('prop_c3_aq_hakoyama', 1, 4, { v: 3 }),
    PR('prop_c3_aq_hakoyama', 10, 4, { v: 4 }),
    PR('prop_c3_aq_hakoyama', 9, 5, { v: 5 }),
    PR('prop_c3_aq_hakoyama', 1, 7, { v: 6 }),
    PR('prop_c3_aq_reitouki', 3, 2),
    PR('prop_c3_aq_daisha_oki', 10, 2),
    PR('prop_c3_aq_souko_tana', 10, 7),
    // the plate on a box with the cold sweet potato (S21; gone once eaten)
    PR('prop_c3_aq_imo_sara', 6, 5, {}, { notFlag: 'flag_ch3_souko' }),
    PR('prop_c3_aq_imo_sara', 6, 5, { empty: true }, { flag: 'flag_ch3_souko' }),
    // the freezer door: 「まだ」 inside from S21 until ヤキソバン scrapes it off (S23)
    PR('prop_c3_aq_souko_door', 5, 8),
    { t: 'door', id: 'door_c3_aq_souko', x: 5, y: 8, w: 2, to: 'map_c3_aq_rouka', tx: 5, ty: 5, dir: 'down', se: 'se_door_heavy', cond: { flag: 'flag_ch3_yakisoban' } },
    O('obj_c3_souko_door', 5, 8, { w: 2, face: 'down' }),
    O('obj_c3_souko_box', 1, 2, { w: 2 }),
    O('obj_c3_souko_denkyu', 6, 2, { face: 'up' }),
  ] as MapObj[],
});

// ================================================================ 4.17 map_c3_aq_rouka（倉庫の外の 廊下、22×7）

const ROWS_ROUKA = [
  '######################', // 0
  '#WWWWWWWWWWWWWWWWWWWW#', // 1
  '#WWWWWWWWWWWWWWWWWWWW#', // 2
  'Dcccccccccccccccccccc#', // 3
  '#cccccccccccccccccccc#', // 4
  '#oocccccccoocccccccoo#', // 5
  '#####DD###############', // 6
];

registerMap({
  ...COMMON,
  id: 'map_c3_aq_rouka',
  name: '倉庫の外の 廊下',
  rows: ROWS_ROUKA,
  legend: { ...WALLS, c: { ground: 'tile_floor', step: 'se_step_tile' } },
  camera: 'fixed',
  lightBase: '#A89C88',
  objects: [
    PR('prop_c3_aq_rouka_shell', 0, 0),
    PR('prop_c3_aq_rouka_desk', 1, 5),
    // ハンコケース on the desk (エゴ left it there, S21〜S23 until he takes it back; nothing is done to the case)
    PR('prop_c3_aq_hankocase', 1, 5, {}, { flag: 'flag_ch3_souko', notFlag: 'flag_ch3_yakisoban' }),
    PR('prop_c3_aq_rouka_bench', 10, 5),
    PR('prop_c3_aq_shoukaki', 19, 5),
    { t: 'door', id: 'door_c3_aq_rouka_souko', x: 5, y: 6, w: 2, to: 'map_c3_aq_souko', tx: 5, ty: 7, dir: 'down', se: 'se_door_heavy' },
    // the west door to the staff passage: S25 on. Until then the third part stops here (its usual text)
    ...gated({ id: 'door_c3_aq_ura', x: 0, y: 3, to: 'map_c3_aq_iriguchi', tx: 18, ty: 3, dir: 'left', se: 'se_door', cond: MINNA }, '従業員の 通路の 戸。／かぎが かかっている。'),
    O('obj_c3_rouka_desk', 1, 5, { w: 2 }),
  ] as MapObj[],
});

// ================================================================ 4.9 map_c3_aq_jimusho（事務所、14×8。S25 で通る）

const ROWS_JIMUSHO = [
  '#WWWWWWWWWWWW#', // 0
  '#WWWWWWWWWWWW#', // 1
  '#offffffffffo#', // 2
  '#ffffoooofffo#', // 3
  '#ffffoooofffo#', // 4
  '#ffffffffffffD', // 5
  '#offfffffffff#', // 6
  '#####D########', // 7
];

registerMap({
  ...COMMON,
  id: 'map_c3_aq_jimusho',
  name: '事務所',
  rows: ROWS_JIMUSHO,
  legend: { ...WALLS, f: { ground: 'wood_bare', step: 'se_step_wood' } },
  camera: 'fixed',
  lightBase: '#6A6478',
  objects: [
    PR('prop_c3_aq_jimusho_shell', 0, 0),
    PR('prop_c3_aq_boushikake', 1, 2),
    PR('prop_c3_aq_jimu_desk', 5, 3),
    PR('prop_c3_aq_shoruidana', 12, 2),
    PR('prop_c3_aq_jimu_kasa', 1, 6),
    { t: 'door', id: 'door_c3_aq_jimusho_back', x: 5, y: 7, to: 'map_c3_aq_kairo', tx: 20, ty: 5, dir: 'down', se: 'se_door' },
    { t: 'door', id: 'door_c3_aq_hall_w', x: 13, y: 5, to: 'map_c3_aq_hall', tx: 1, ty: 11, dir: 'right', se: 'se_door' },
    O('obj_c3_jimu_clocks', 3, 1, { w: 7, face: 'up' }),
    O('obj_c3_jimu_cap', 1, 2),
    O('obj_c3_jimu_lamp', 5, 3, { w: 2 }),
    O('obj_c3_jimu_kairan', 7, 3, { w: 2 }),
  ] as MapObj[],
});
