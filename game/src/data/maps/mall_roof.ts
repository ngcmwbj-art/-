// 屋上 ゆうやけひろば (map_mall_roof, 24×15; 30_level_art 5.6, 10_narrative
// 7.18 — the side quest 「屋上ゆうやけひろばの『4人目』」, ★2026-09-28 追加).
//
// Up the stairs in the west end of M4's north wall (two tiles wide, ★2026-09-28
// 依頼主の指摘); they come out at the south edge (11–12,14), lane for lane —
// so the way up is pushed north and the way down south, and holding the key
// through the stairs never bounces back.
// A rooftop playground closed for a year: the little stage of the mall's old
// handshake event (where グソっ君 holds his first one) against the north fence (the name book on the table
// beside it, three pipe chairs, the queue line painted all the way to a
// 『最後尾』 placard), two panda cars on the faded turf (one 故障中, one runs
// for 100 yen), a coin binocular at the east fence (100 yen: beyond the
// mountains in the east it is night — 星見台), the FRP water tank, the
// skylight over M4, a pair of air-con units by the south parapet. Up here the
// shadows point straight down (in the town they all point at the mall).

import '../../art/props/mall_roof';
import { registerMap } from '../../world/maps';
import type { MapObj, TileSpec } from '../../world/types';
import { ROOF_OBJ } from '../text/mall_roof';

const ROOF_LEGEND: Record<string, TileSpec> = {
  // the view over the north fence (sky, the hills, the fence on the parapet)
  W: { ground: 'void', solid: true, tag: 'rfence' },
  // the parapets west, east and south (the fence on top)
  '#': { ground: 'void', solid: true, tag: 'parapet' },
  '.': { ground: 'plaza' },
  // the faded artificial turf of the kids' corner
  ',': { ground: 'grass' },
  o: { ground: 'plaza', solid: true, tag: 'prop' },
  q: { ground: 'grass', solid: true, tag: 'prop' },
  // the stair house's steel door (back down to M4)
  D: { ground: 'plaza', solid: true, door: true, tag: 'door' },
};

export const ROWS_ROOF = [
  'WWWWWWWWWWWWWWWWWWWWWWWW',
  'WWWWWWWWWWWWWWWWWWWWWWWW',
  '#oooo...oooooooo..ooo..#',
  '#oooo...ooooooooo.....o#',
  '#......................#',
  '#,,,,,...o.o.o.........#',
  '#qq,,,.................#',
  '#,,,,,.................#',
  '#,,,,,.................#',
  '#,,qq,............ooo..#',
  '#,,,,,ooo.........ooo..#',
  '#,,,,,ooo..............#',
  '#............o.........#',
  '#.............ooo......#',
  '###########DD###########',
];

const O = (id: string, x: number, y: number, extra: Record<string, unknown> = {}): MapObj =>
  ({ t: 'obj', id, x, y, text: ROOF_OBJ[id], ...extra }) as MapObj;
const PR = (prop: string, x: number, y: number, opts?: Record<string, unknown>): MapObj =>
  ({ t: 'prop', prop, x, y, ...(opts ? { opts } : {}) }) as MapObj;

// outside, in stage 2: the town's music and its wind (40_audio 4.2)
const ROOF_BGM = { 0: 'bgm_town_s2', 1: 'bgm_town_s2', 2: 'bgm_town_s2', 3: 'bgm_town_s2' };
const ROOF_AMB = ['amb_s2_town', 'amb_wind'];

registerMap({
  id: 'map_mall_roof',
  name: '屋上 ゆうやけひろば',
  kind: 'outdoor',
  rows: ROWS_ROOF,
  legend: ROOF_LEGEND,
  camera: 'follow',
  space: 'outdoor',
  theme: 'roof',
  // up here every shadow falls straight down (the town's all point at the mall)
  shadowVec: [0, 0.34],
  onEnter: ['lv_in_mall_roof'],
  bgm: ROOF_BGM,
  amb: { 0: ROOF_AMB, 1: ROOF_AMB, 2: ROOF_AMB, 3: ROOF_AMB },
  outside: '#1B1733',
  objects: [
    PR('mall_roof_shell', 0, 0),
    PR('mall_roof_machine', 1, 2),
    PR('mall_roof_stairs', 11, 14),
    PR('mall_roof_stage', 8, 2),
    PR('mall_roof_table', 16, 3),
    PR('mall_roof_planters', 18, 2),
    PR('mall_roof_scope', 22, 3),
    PR('mall_roof_chair', 9, 5, { v: 0 }),
    PR('mall_roof_chair', 11, 5, { v: 1 }),
    PR('mall_roof_chair', 13, 5, { v: 2 }),
    PR('mall_roof_panda', 1, 6, { broken: true }),
    PR('mall_roof_panda', 3, 9),
    PR('mall_roof_tank', 18, 9),
    PR('mall_roof_skylight', 6, 10),
    PR('mall_roof_saigobi', 13, 12),
    PR('mall_roof_ac', 14, 13),
    PR('mall_roof_fence_s', 0, 14),
    // examine
    O('obj_roof_welcome', 3, 3, { w: 2, face: 'up' }),
    O('obj_roof_stage', 8, 2, { w: 8, h: 2 }),
    { t: 'obj', id: 'obj_roof_note', x: 16, y: 3, script: 'evt_roof_note', priority: 1 } as MapObj,
    O('obj_roof_chair', 9, 5),
    { ...O('obj_roof_chair', 11, 5), id: 'obj_roof_chair_b' } as MapObj,
    { ...O('obj_roof_chair', 13, 5), id: 'obj_roof_chair_c' } as MapObj,
    { t: 'obj', id: 'obj_roof_panda', x: 3, y: 9, w: 2, script: 'evt_roof_panda' } as MapObj,
    O('obj_roof_panda_broken', 1, 6, { w: 2 }),
    { t: 'obj', id: 'obj_roof_scope', x: 22, y: 3, script: 'evt_roof_scope' } as MapObj,
    O('obj_roof_tank', 18, 9, { w: 3, h: 2 }),
    O('obj_roof_skylight', 6, 10, { w: 3, h: 2 }),
    O('obj_roof_ac', 14, 13, { w: 3 }),
    O('obj_roof_saigobi', 13, 12),
    O('obj_roof_balloon', 6, 1, { face: 'up' }),
    { ...O('obj_roof_balloon', 21, 1, { face: 'up' }), id: 'obj_roof_balloon_e' } as MapObj,
    // the town over the south parapet (everything in it points its shadow here)
    O('obj_roof_town', 1, 14, { w: 10, face: 'down' }),
    { ...O('obj_roof_town', 13, 14, { w: 10, face: 'down' }), id: 'obj_roof_town_e' } as MapObj,
    // down the stairs, two tiles wide: each lane to its own lane of M4's stairwell (2–3,1)
    { t: 'door', id: 'door_roof_m4', x: 11, y: 14, to: 'map_mall_2f', tx: 2, ty: 2, dir: 'down', se: 'se_stairs' },
    { t: 'door', id: 'door_roof_m4_b', x: 12, y: 14, to: 'map_mall_2f', tx: 3, ty: 2, dir: 'down', se: 'se_stairs' },
    // ワスレガサ (someone's umbrella, left by the chairs) and a セミファイナル at the east fence
    { t: 'sym', id: 'sym_mall_roof_01', enemies: ['enemy_wasuregasa'], x: 15, y: 8, move: 'umbrella', radius: 2, restoreAt: [7, 3], restoreOff: [3, 0] },
    { t: 'sym', id: 'sym_mall_roof_02', enemies: ['enemy_semi_final'], x: 22, y: 7, move: 'semi', restoreAt: [22, 8], restoreOff: [3, -8] },
  ],
});
