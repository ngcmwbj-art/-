// map_school — 夕鳴小学校の 裏庭と 学級園 (30_level_art 3.15, 10_narrative 6.7〔toban〕・7.23,
// 02_ch2_index #72; 2026-09-30 依頼主の採用：げむきかの案3「8月31日の 水やり当番」).
// 28×14, about 1.2 screens (the camera moves 64px sideways, 8px up and down).
//
// Through the iron back gate in the park's north hedge (map_town (18,0), pushed north from
// (18,1)) the school's back yard: the back of the building along the north (the staff room's
// windows lit, a teacher's shadow on the frosted glass), 5年2組's class garden in the west
// with its 30 bucket-rice (name tags, kitchen strainer nets against the sparrows), the duty
// board on the garden's bamboo fence, the washing place with the watering cans, the
// Stevenson screen on its patch of lawn, the pool behind its mesh (east, running on past the
// map's edge), the sports shed and its cones (south-east), a cherry tree (south-west).
//
//   0000000000111111111122222222
//   0123456789012345678901234567
// 0 WWWWWWWWWWWWWWWWWWWWWWWWWWWW   the back of the school (prop bld_sch_kousha): 2F sills
// 1 WWWWWWWWWWWWWWWWWWWWWWWWWWWW   1F: classroom windows (x1–9), 通用口 (11), the clock over
// 2 WWWWWWWWWWWWWWWWWWWWWWWWWWWW   the washing place (13–14), 職員室 (16–19), 室外機 (20), 更衣室 (24–25)
// 3 H--------------------------H   the concrete strip along the wall; chalk hopscotch (21–23,3)
// 4 Hkkkkkkkkkkkksss::::PPPPPPPP   garden fence (x1–12; 札 (7,4), duty board (8,4)); 手洗い場 (13–15,4); pool mesh
// 5 Hk::::::::::::::::::Pwwwwwww   the garden's north path (y5) and its gap (12,5); the pool (x21–27, on past the edge)
// 6 Hkbbbbbbbbbbk:::,,,:Pwwwwwww   buckets 1–10 (x2–11)
// 7 Hkbbbbbbbbbbk:::,y,:Pwwwwwww   buckets 11–20; 百葉箱 (17,7) on its lawn
// 8 Hk::::::::::::::,,,:Pwwwwwww   the garden's south path (y8) and its gap (12,8)
// 9 Hkbbbbbbbbbbk:::::::PPPPPPPP   buckets 21–30; the pool's sign (21,9)
// 10 Hkkkkkkkkkkkk::::::::::KKKKH  garden fence; the sports shed (23–26,10–11)
// 11 H::T:::::::::::ooo::::cKKKKH  cherry (3,11); half-buried tyres (15–17,11); cones (22,11)
// 12 H::::::::::::::::::::::::::H
// 13 FFFFFFFFFFFFFFDFFFFFFFFFFFFF  the school's mesh fence; D (14,13): the back gate → map_town (18,1)

import '../../art/props/school';
import { flag } from '../../game/state';
import { registerMap } from '../../world/maps';
import type { MapDef, MapObj, TileSpec } from '../../world/types';
import { BUCKET_NAMES, SCHOOL_OBJ } from '../text/school';
import { KOTEI_OBJ } from '../text/kotei';

export const ROWS_SCHOOL = [
  'WWWWWWWWWWWWWWWWWWWWWWWWWWWW', // 0
  'WWWWWWWWWWWWWWWWWWWWWWWWWWWW', // 1
  'WWWWWWWWWWWWWWWWWWWWWWWWWWWW', // 2
  'H--------------------------H', // 3
  'Hkkkkkkkkkkkksss::::PPPPPPPP', // 4
  'Hk::::::::::::::::::Pwwwwwww', // 5
  'Hkbbbbbbbbbbk:::,,,:Pwwwwwww', // 6
  'Hkbbbbbbbbbbk:::,y,:Pwwwwwww', // 7
  'Hk::::::::::::::,,,:Pwwwwwww', // 8
  'Hkbbbbbbbbbbk:::::::PPPPPPPP', // 9
  'Hkkkkkkkkkkkk::::::::::KKKKH', // 10
  'VggT::f::::::::ooo::::cKKKKH', // 11  V (0,11)–(0,12): the gap in the west hedge, 2 tiles; f (6,11) the 立て札『← 校庭』
  'Vggggggggggggg:::::::::::::H', // 12  g: the gravel way from the back gate to the gap, round the building's west end → 校庭 map_school_kotei (02 #82)
  'FFFFFFFFFFFFFFDFFFFFFFFFFFFF', // 13
];

const SCHOOL_LEGEND: Record<string, TileSpec> = {
  // the building (drawn by bld_sch_kousha over it)
  W: { ground: 'sidewalk', solid: true, tag: 'facade' },
  '-': { ground: 'sidewalk' },
  ':': { ground: 'dirt' },
  ',': { ground: 'grass' },
  // the school's hedge (kaname, red new shoots) and its mesh fence on the park side
  H: { ground: 'grass', solid: true, tag: 'hedge' },
  F: { ground: 'grass', solid: true, tag: 'fence' },
  // the class garden's bamboo fence and its buckets (prop_sch_gakuen / prop_sch_buckets)
  k: { ground: 'dirt', solid: true, tag: 'prop' },
  b: { ground: 'dirt', solid: true, tag: 'prop' },
  // 手洗い場, 百葉箱, the cones, the half-buried tyres
  s: { ground: 'sidewalk', solid: true, tag: 'prop' },
  o: { ground: 'dirt', solid: true, tag: 'prop' },
  y: { ground: 'grass', solid: true, tag: 'prop' },
  c: { ground: 'dirt', solid: true, tag: 'prop' },
  // the pool's mesh and its water (prop_sch_pool)
  P: { ground: 'sidewalk', solid: true, tag: 'prop' },
  w: { ground: 'sidewalk', solid: true, tag: 'water' },
  // the sports shed (bld_sch_souko)
  K: { ground: 'dirt', solid: true, tag: 'prop' },
  // the cherry's trunk (tree_sakura)
  T: { ground: 'dirt', solid: true, tag: 'trunk' },
  // the back gate out to the park
  D: { ground: 'dirt', solid: true, door: true },
  // the gap in the west hedge: the gravel way round to the school ground (二人十五脚, 02 #82).
  // 2026-10-06 依頼主「校庭に 入る 所が 分かりづらい」: the gap 2 tiles wide, a gravel way to it
  // from the back gate, and a 立て札 on the way
  V: { ground: 'gravel', solid: true, door: true },
  g: { ground: 'gravel' },
  f: { ground: 'dirt', solid: true, tag: 'prop' },
};

type Text = string | Record<string, string>;
const T = SCHOOL_OBJ as Record<string, Text>;
const O = (id: string, x: number, y: number, extra: Record<string, unknown> = {}): MapObj =>
  ({ t: 'obj', id, x, y, text: T[id], ...extra }) as MapObj;
const PR = (prop: string, x: number, y: number, opts?: Record<string, unknown>, extra: Record<string, unknown> = {}): MapObj =>
  ({ t: 'prop', prop, x, y, ...(opts ? { opts } : {}), ...extra }) as MapObj;

/** The bucket rows: tile row of each row of ten (出席番号 1–10, 11–20, 21–30). */
export const BUCKET_ROWS = [6, 7, 9];
/** Tile of bucket `i` (0-based 出席番号 order: west to east, the north row first). */
export function bucketTile(i: number): [number, number] {
  return [2 + (i % 10), BUCKET_ROWS[Math.floor(i / 10)]];
}
/** Object id of bucket `i` (0-based). */
export function bucketId(i: number): string {
  return `obj_sch_bucket_${String(i + 1).padStart(2, '0')}`;
}

const BUCKETS: MapObj[] = BUCKET_NAMES.map((_, i) => {
  const [x, y] = bucketTile(i);
  return { t: 'obj', id: bucketId(i), x, y, script: 'obj_sch_bucket' } as MapObj;
});

const OBJECTS: MapObj[] = [
  // ======================================================== the ground's things (flat first)
  PR('prop_sch_chalk', 21, 3),
  // ======================================================== standing
  { t: 'prop', prop: 'bld_sch_kousha', x: 0, y: 0 },
  PR('prop_sch_gakuen', 1, 4, { side: 'n' }),
  PR('prop_sch_gakuen', 1, 5, { side: 'w' }),
  PR('prop_sch_gakuen', 12, 6, { side: 'e1' }),
  PR('prop_sch_gakuen', 12, 9, { side: 'e2' }),
  PR('prop_sch_gakuen', 1, 10, { side: 's' }),
  ...BUCKET_ROWS.map((y, r) => PR('prop_sch_buckets', 2, y, { row: r })),
  PR('prop_sch_toban', 7, 4),
  PR('prop_sch_teara', 13, 4),
  PR('prop_sch_hyakuyo', 17, 7),
  PR('prop_sch_pool', 20, 4),
  { t: 'prop', prop: 'bld_sch_souko', x: 23, y: 10 },
  PR('prop_sch_cones', 22, 11),
  PR('prop_sch_tires', 15, 11),
  PR('tree_sakura', 3, 11, { v: 2 }),
  PR('prop_sch_uramon_in', 14, 13),

  // ======================================================== examine (10_narrative 7.23)
  // the wall: things high on it are examined from the strip below, facing north
  O('obj_sch_mado', 1, 2, { w: 9, face: 'up' }),
  O('obj_sch_door', 11, 2, { face: 'up' }),
  O('obj_sch_tokei', 13, 2, { w: 2, face: 'up' }),
  O('obj_sch_shokuin', 16, 2, { w: 4, face: 'up' }),
  O('obj_sch_ac', 20, 2, { face: 'up' }),
  O('obj_sch_koui', 24, 2, { w: 2, face: 'up' }),
  O('obj_sch_chalk', 21, 3, { w: 3, flat: true }),
  // the garden: its fence, the seed tag and the duty board (from the path inside, facing north)
  { t: 'obj', id: 'obj_sch_toban', x: 8, y: 4, face: 'up', priority: 2, script: 'obj_sch_toban' } as MapObj,
  O('obj_sch_saku', 7, 4, { face: 'up', priority: 1 }),
  // the rest of the bamboo fence says the same (the tag hangs on it)
  ...([[1, 4, 12, 1], [1, 10, 12, 1], [1, 5, 1, 5], [12, 6, 1, 2], [12, 9, 1, 1]] as const).map(
    ([x, y, w, h], i) => ({ t: 'obj', id: `obj_sch_saku${i + 2}`, x, y, w, h, text: T.obj_sch_saku }) as MapObj,
  ),
  ...BUCKETS,
  // the washing place: the cans hang at its west end
  { t: 'obj', id: 'obj_sch_jouro', x: 13, y: 4, script: 'obj_sch_jouro', priority: 1 } as MapObj,
  { t: 'obj', id: 'obj_sch_teara', x: 14, y: 4, w: 2, script: 'obj_sch_jouro' } as MapObj,
  { t: 'obj', id: 'obj_sch_hyakuyo', x: 17, y: 7, script: 'obj_sch_hyakuyo' } as MapObj,
  // the pool: its sign on the south mesh first, then anywhere along the mesh
  O('obj_sch_pool_fuda', 21, 9, { face: 'up', priority: 1 }),
  O('obj_sch_pool', 20, 4, { w: 8, h: 6 }),
  O('obj_sch_souko', 23, 10, { w: 4, h: 2 }),
  { t: 'obj', id: 'obj_sch_cone', x: 22, y: 11, script: 'obj_sch_cone' } as MapObj,
  O('obj_sch_sakura', 3, 11),
  O('obj_sch_taiya', 15, 11, { w: 3 }),
  O('obj_sch_uramon_in', 14, 13, { face: 'down' }),

  // ======================================================== enemy symbols (20_systems 14; reused)
  // セミファイナル on its back under the cherry (stage 1–2); put right, it clings to the trunk
  {
    t: 'sym', id: 'sym_sch_01', enemies: ['enemy_semi_final'], x: 5, y: 12, move: 'semi',
    cond: { stage: '1-2', flag: 'flag_got_hanko' }, restoreAt: [3, 11], restoreOff: [0, -12],
  } as MapObj,
  // stage 2: two of the PE cones went off singing (コーン・ボーカル, a pair) — put back by the shed
  {
    t: 'sym', id: 'sym_sch_02', enemies: ['enemy_cone_vocal', 'enemy_cone_vocal'], x: 19, y: 10, to: [19, 12], move: 'cone', dir: 'down',
    cond: { stage: 2 }, restoreAt: [21, 12], restoreOff: [2, 0],
  } as MapObj,
  {
    t: 'sym', id: 'sym_sch_02b', link: 'sym_sch_02', enemies: [], x: 17, y: 12, to: [17, 10], move: 'cone', dir: 'up',
    cond: { stage: 2 }, restoreAt: [22, 12], restoreOff: [2, 0], phase: 0.5,
  } as MapObj,

  // ======================================================== the way out
  { t: 'door', id: 'door_sch_town', x: 14, y: 13, to: 'map_town', tx: 18, ty: 1, dir: 'down', se: 'se_door_heavy' },
  // 二人十五脚 (02 #82, 30 3.17): the gap in the west hedge past the cherry, the gravel way round the
  // building's west end to the school ground (pushed west from (1,12))
  { t: 'prop', prop: 'prop_kotei_nishi', x: 0, y: 12 },
  { t: 'obj', id: 'obj_kotei_michi', x: 0, y: 12, face: 'left', text: KOTEI_OBJ.obj_kotei_michi } as MapObj,
  { t: 'door', id: 'door_sch_kotei', x: 0, y: 12, to: 'map_school_kotei', tx: 34, ty: 20, dir: 'left' },
  { t: 'door', id: 'door_sch_kotei2', x: 0, y: 11, to: 'map_school_kotei', tx: 34, ty: 19, dir: 'left' },
  PR('prop_kotei_fuda', 6, 11),
  { t: 'obj', id: 'obj_kotei_fuda', x: 6, y: 11, text: KOTEI_OBJ.obj_kotei_fuda } as MapObj,
];

const DEF: MapDef = {
  id: 'map_school',
  name: '夕鳴小学校 裏庭',
  kind: 'outdoor',
  rows: ROWS_SCHOOL,
  legend: SCHOOL_LEGEND,
  objects: OBJECTS,
  camera: 'follow',
  space: 'outdoor',
  // the strip along the wall is concrete slabs; the yard is the park's kind of ground
  zones: [
    { id: 'kawabe', x: 0, y: 3, w: 28, h: 1 },
    { id: 'park', x: 0, y: 0, w: 28, h: 14 },
  ],
  structMats: [
    { x: 0, y: 3, w: 1, h: 8, mat: 'kaname' },
    { x: 27, y: 3, w: 1, h: 10, mat: 'kaname' },
  ],
  onEnter: ['lv_in_school'],
  outside: '#1B1733',
  // the town's music; the yard's air: the evening wind, in stage 1 only the stillness
  bgm: { 0: 'bgm_town_s0', 1: 'bgm_town_s1', 2: 'bgm_town_s2' },
  amb: {
    0: ['amb_higurashi', 'amb_wind'],
    1: ['amb_still'],
    2: ['amb_s2_town', 'amb_wind'],
  },
  groundDecals: [
    { k: 'footprints', x: 14, y: 5, h: 8, dir: 'v' },
    { k: 'footprints', x: 2, y: 5, w: 11 },
    { k: 'footprints', x: 2, y: 8, w: 11 },
    { k: 'leafdrift', x: 1, y: 12, w: 5, h: 1, v: 0 },
  ],
};

// stage 2: every long shadow of the yard points north-east (the bucket-rice's ears too,
// 10 7.23 「穂の 影が、北東を 指している。」). Read by the renderer every frame.
Object.defineProperty(DEF, 'shadowVec', {
  get: (): [number, number] | undefined => (flag('flag_stage') === 2 ? [0.74, -0.46] : undefined),
  enumerable: true,
});

registerMap(DEF);
