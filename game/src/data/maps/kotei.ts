// map_school_kotei — 夕鳴小学校の 校庭（30_level_art 3.17、10_narrative 7.25、02_ch2_index #82。
// 2026-10-05 依頼主の採用：げむきかの新しい案1「二人十五脚」）。36×22、約2画面（カメラは 上下左右に 動く）。
//
// 裏庭 map_school の 西の 生け垣の 口 (0,11)–(0,12)（2マス。(1,11)・(1,12) から 西へ 押す。2026-10-06 に 広げた）から、校舎の 西を 回る 砂利の
// 通路で 南東の すみ (35,20) に 出る。北に 校舎の 正面と 大時計（段階1 から 5時で 止まる）、まん中に
// 消えかけた 白線の 小さな トラック（左回り。ゴールは 北の 直線、朝礼台の 側）、西に 朝礼台、北西に
// 体育倉庫、東に のぼり棒 5本、南西に 走り幅とびの 砂場、南東に 卒業記念の 日時計、南の 金網ぞいに 桜 2本。
// 人は イベントの あいだだけ（flag_kotei_away）：スタートの 線に なんばるわんと コタロウ、朝礼台の 階段に
// ピー・コック。段階2：運動会の 綱 ヒキヅナが 南の 桜の 下から 北東へ 這っていく（はなまるで 直すと、
// 倉庫の 前で まるまる）。
//
//   000000000011111111112222222222333333
//   012345678901234567890123456789012345
// 0 WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW   校舎の 正面（bld_kotei_kousha）：2F の 窓、大時計 (17–18)
// 1 WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW
// 2 WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW   1F の 窓、昇降口 (13–16)
// 3 WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW
// 4 H----------------------------------H   昇降口の 前の コンクリート
// 5 HKKKK::::::::::::::::::::::::::::::H   体育倉庫 (1–4,5–6)
// 6 HKKKK::::::::::::::::::::::::::::::H   トラック（prop_kotei_track, (8,6) から）：x 8〜27、y 6〜17
// 7 H::::::::::::::::::::::::::::::::::H
// 8 H:::::::::::::::::::::::::::::NNNNNH   のぼり棒 (30–34,8)
// 11 H:AAA::::::::::::::::::::::::::::::H  朝礼台 (2–4,11–12)、東に 階段
// 17 Hsssss:::::::::::::::::::::::::Q:::H  砂場 (1–5,17–19)、日時計 (31,17)
// 20 H,,,,,,,T,,,,,,,,,,,,,,,,,,,TggggggD  桜 (8,20)・(28,20)、砂利の 通路 → D (35,20)：裏庭 map_school (1,12) へ
// 21 FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF  学校の 金網

import '../../art/props/kotei';
import { flag } from '../../game/state';
import { registerMap } from '../../world/maps';
import type { MapDef, MapObj, TileSpec } from '../../world/types';
import { KOTEI_OBJ } from '../text/kotei';

export const ROWS_KOTEI = [
  'WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW', // 0
  'WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW', // 1
  'WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW', // 2
  'WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW', // 3
  'H----------------------------------H', // 4
  'HKKKK::::::::::::::::::::::::::::::H', // 5
  'HKKKK::::::::::::::::::::::::::::::H', // 6
  'H::::::::::::::::::::::::::::::::::H', // 7
  'H:::::::::::::::::::::::::::::NNNNNH', // 8
  'H::::::::::::::::::::::::::::::::::H', // 9
  'H::::::::::::::::::::::::::::::::::H', // 10
  'H:AAA::::::::::::::::::::::::::::::H', // 11
  'H:AAA::::::::::::::::::::::::::::::H', // 12
  'H,:::::::::::::::::::::::::::::::::H', // 13
  'H,:::::::::::::::::::::::::::::::::H', // 14
  'H,:::::::::::::::::::::::::::::::::H', // 15
  'H,:::::::::::::::::::::::::::::::::H', // 16
  'Hsssss:::::::::::::::::::::::::Q:::H', // 17
  'Hsssss:::::::::::::::::::::::::::::H', // 18
  'Hsssss::::::::::::::::::::::::gggggD', // 19  g D (35,19)–(35,20): the way to the back yard, 2 tiles (2026-10-06)
  'H,,,,,,,T,,,,,,,,,,,,,,,,,,,TggggggD', // 20
  'FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF', // 21
];

const LEGEND: Record<string, TileSpec> = {
  // the building (drawn by bld_kotei_kousha over it)
  W: { ground: 'sidewalk', solid: true, tag: 'facade' },
  '-': { ground: 'sidewalk' },
  ':': { ground: 'dirt' },
  ',': { ground: 'grass' },
  s: { ground: 'sand' },
  g: { ground: 'gravel' },
  // the school's hedge (kaname, as round the back yard) and its mesh fence on the south
  H: { ground: 'grass', solid: true, tag: 'hedge' },
  F: { ground: 'grass', solid: true, tag: 'fence' },
  // the sports shed, the morning platform, the climbing poles, the sundial
  K: { ground: 'dirt', solid: true, tag: 'prop' },
  A: { ground: 'dirt', solid: true, tag: 'prop' },
  N: { ground: 'dirt', solid: true, tag: 'prop' },
  Q: { ground: 'dirt', solid: true, tag: 'prop' },
  // the cherries' trunks (tree_sakura)
  T: { ground: 'grass', solid: true, tag: 'trunk' },
  // the gravel way round the building's west end, back to the back yard
  D: { ground: 'gravel', solid: true, door: true },
};

type Text = string | Record<string, string>;
const T = KOTEI_OBJ as Record<string, Text>;
const O = (id: string, x: number, y: number, extra: Record<string, unknown> = {}): MapObj =>
  ({ t: 'obj', id, x, y, text: T[id], ...extra }) as MapObj;
const PR = (prop: string, x: number, y: number, opts?: Record<string, unknown>, extra: Record<string, unknown> = {}): MapObj =>
  ({ t: 'prop', prop, x, y, ...(opts ? { opts } : {}), ...extra }) as MapObj;

/** The people of the race, there only while it is on (from なんばるわんの〔ramune〕 till its end). */
const AWAY = { stage: '1-2', flag: 'flag_kotei_away' };

const OBJECTS: MapObj[] = [
  // ======================================================== flat (the track, the sand pit)
  PR('prop_kotei_track', 8, 6),
  PR('prop_kotei_sunaba', 1, 17),
  // ======================================================== standing
  { t: 'prop', prop: 'bld_kotei_kousha', x: 0, y: 0 },
  { t: 'prop', prop: 'bld_kotei_souko', x: 1, y: 5 },
  PR('prop_kotei_chorei', 2, 11),
  PR('prop_kotei_nobori', 30, 8),
  PR('prop_kotei_hidokei', 31, 17),
  PR('tree_sakura', 8, 20, { v: 1 }),
  PR('tree_sakura', 28, 20, { v: 3 }),

  // ======================================================== examine (10_narrative 7.25)
  O('obj_kotei_tokei', 17, 3, { w: 2, face: 'up', priority: 1 }),
  O('obj_kotei_shoko', 13, 3, { w: 4, face: 'up' }),
  { t: 'obj', id: 'obj_kotei_mado', x: 1, y: 3, w: 12, face: 'up', text: T.obj_kotei_mado } as MapObj,
  { t: 'obj', id: 'obj_kotei_mado2', x: 17, y: 3, w: 18, face: 'up', text: T.obj_kotei_mado } as MapObj,
  O('obj_kotei_souko', 1, 5, { w: 4, h: 2 }),
  O('obj_kotei_chorei', 2, 11, { w: 3, h: 2 }),
  O('obj_kotei_nobori', 30, 8, { w: 5 }),
  O('obj_kotei_sunaba', 1, 17, { w: 5, h: 3, flat: true }),
  O('obj_kotei_hidokei', 31, 17),
  O('obj_kotei_hakusen', 16, 6, { h: 4, flat: true, priority: -1 }),
  { t: 'obj', id: 'obj_kotei_sakura', x: 8, y: 20, text: T.obj_kotei_sakura } as MapObj,
  { t: 'obj', id: 'obj_kotei_sakura2', x: 28, y: 20, text: T.obj_kotei_sakura } as MapObj,

  // ======================================================== the race's people (events/kotei.ts stages them)
  { t: 'npc', id: 'npc_madam', x: 16, y: 8, dir: 'left', cond: AWAY },
  { t: 'npc', id: 'npc_kotaro', x: 16, y: 9, dir: 'left', animal: true, cond: AWAY },
  { t: 'npc', id: 'npc_kazuo', sprite: 'npc_kazuo_out', x: 5, y: 12, dir: 'right', pose: 'sit', off: [-3, -3], cond: AWAY },

  // ======================================================== enemy symbol (stage 2): ヒキヅナ, the tug-of-war rope
  {
    t: 'sym', id: 'sym_kotei_01', enemies: ['enemy_hikizuna'], x: 11, y: 19, to: [24, 19], move: 'cone', dir: 'right',
    cond: { stage: 2 }, restoreAt: [3, 7], restoreOff: [0, 0],
  } as MapObj,

  // ======================================================== the way back
  { t: 'door', id: 'door_kotei_school', x: 35, y: 20, to: 'map_school', tx: 1, ty: 12, dir: 'right' },
  { t: 'door', id: 'door_kotei_school2', x: 35, y: 19, to: 'map_school', tx: 1, ty: 11, dir: 'right' },
];

const DEF: MapDef = {
  id: 'map_school_kotei',
  name: '夕鳴小学校 校庭',
  kind: 'outdoor',
  rows: ROWS_KOTEI,
  legend: LEGEND,
  objects: OBJECTS,
  camera: 'follow',
  space: 'outdoor',
  // the concrete before the entrance; the ground is the park's kind (the school's)
  zones: [
    { id: 'kawabe', x: 0, y: 4, w: 36, h: 1 },
    { id: 'park', x: 0, y: 0, w: 36, h: 22 },
  ],
  structMats: [
    { x: 0, y: 4, w: 1, h: 17, mat: 'kaname' },
    { x: 35, y: 4, w: 1, h: 15, mat: 'kaname' },
  ],
  onEnter: ['lv_in_kotei'],
  outside: '#1B1733',
  bgm: { 0: 'bgm_town_s0', 1: 'bgm_town_s1', 2: 'bgm_town_s2' },
  amb: {
    0: ['amb_higurashi', 'amb_wind'],
    1: ['amb_still'],
    2: ['amb_s2_town', 'amb_wind'],
  },
  groundDecals: [
    { k: 'footprints', x: 6, y: 18, w: 4 },
    { k: 'footprints', x: 29, y: 19, w: 5 },
    { k: 'leafdrift', x: 1, y: 20, w: 6, h: 1, v: 0 },
    { k: 'leafdrift', x: 24, y: 20, w: 4, h: 1, v: 1 },
  ],
};

// stage 2: every long shadow of the school ground points north-east (as round the back yard)
Object.defineProperty(DEF, 'shadowVec', {
  get: (): [number, number] | undefined => (flag('flag_stage') === 2 ? [0.74, -0.46] : undefined),
  enumerable: true,
});

registerMap(DEF);
