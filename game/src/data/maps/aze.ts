// map_aze — 畦道の先の 円筒分水 (30_level_art 3.14, 10_narrative 6.26・7.22, 02_ch2_index #67;
// 2026-09-29 依頼主の採用：げむきかの対岸の案3「水の はなまる」). 24×14, one screen (the
// camera moves 8px up and down).
//
// The paddy path south of the river (map_town x12, y41–43) goes on through the end of the
// town's fields to the place where the water is shared with となり町. The path x12 is the
// boundary: west of it となり町, east of it 夕鳴町. In the middle, fenced, the round
// diversion (円筒分水): the water comes under the ground from the mountains, wells up in the
// inner cylinder, spills over its round crest the same height all round, and the ring
// outside it is parted 6 (夕鳴町, east) : 4 (となり町, west) by the paddies' areas; a channel
// leaves each part (row 7). South of it the plank bench straddles the boundary stone, and
// よね (夕鳴町, facing east) and とよぞう (となり町, facing west) sit on it back to back.
//
//   000000000011111111112222
//   012345678901234567890123
// 0 ~~~~~~~~~~~~D~~~~~~~~~~~   D (12,0): back to map_town (12,42)
// 1 ~~~~~~~~~~~~:~~~~~~~~~~~   arrive at (12,1)
// 2 ~~~~~,oo~~~~:~~~~~~~~~~~   the tin shed (6–7,2–3) on a patch of grass
// 3 ~~~~~,oo:::::::::~~~~~~~   the ring path round the fence (x8–16, y3–11); 点検口 (15,3)
// 4 ~~~~~~~~:FFFFFFF:~~~~~~~   the fence (x9–15, y4–10) round the diversion (centre 12.5, 7.5)
// 7 cccccccc:FBBBBBF:ccccccc   the two channels (となり町 west, 夕鳴町 east); slabs at (8,7), (16,7)
// 10 ~~~~~~~~:FFFFFFF:~~~~~~~  the sign on the south fence (14,10)
// 11 ~~~~~~~~:::::::::~~~~~~~
// 12 ~~~~~~~~~~:bbb:~~~~~~~~~  the bench (11–13,12): とよぞう (11) / the stone (12) / よね (13)
// 13 ~~~~~~~~~~:::::~~~~~~~~~  the south end (12,13): 「畦道の 先は、となり町。」

import '../../art/props/aze';
import { registerMap } from '../../world/maps';
import type { MapObj, TileSpec } from '../../world/types';
import { AZE_OBJ } from '../text/aze';

export const ROWS_AZE = [
  '~~~~~~~~~~~~D~~~~~~~~~~~', // 0
  '~~~~~~~~~~~~:~~~~~~~~~~~', // 1
  '~~~~~,oo~~~~:~~~~~~~~~~~', // 2
  '~~~~~,oo:::::::::~~~~~~~', // 3
  '~~~~~~~~:FFFFFFF:~~~~~~~', // 4
  '~~~~~~~~:FBBBBBF:~~~~~~~', // 5
  '~~~~~~~~:FBBBBBF:~~~~~~~', // 6
  'cccccccc:FBBBBBF:ccccccc', // 7
  '~~~~~~~~:FBBBBBF:~~~~~~~', // 8
  '~~~~~~~~:FBBBBBF:~~~~~~~', // 9
  '~~~~~~~~:FFFFFFF:~~~~~~~', // 10
  '~~~~~~~~:::::::::~~~~~~~', // 11
  '~~~~~~~~~~:bbb:~~~~~~~~~', // 12
  '~~~~~~~~~~:::::~~~~~~~~~', // 13
];

const AZE_LEGEND: Record<string, TileSpec> = {
  '~': { ground: 'paddy', solid: true, tag: 'paddy' },
  ':': { ground: 'dirt' },
  ',': { ground: 'grass' },
  // the channels (drawn by prop_aze_suiro over the ridge's earth)
  c: { ground: 'dirt', solid: true, tag: 'water' },
  // the fence and the diversion inside it (prop_bunsui)
  F: { ground: 'grass', solid: true, tag: 'prop' },
  B: { ground: 'grass', solid: true, tag: 'prop' },
  // the bench and the boundary stone (prop_aze_bench; the pair sit on it)
  b: { ground: 'dirt', solid: true, tag: 'prop' },
  o: { ground: 'grass', solid: true, tag: 'prop' },
  // the path goes on north into the town's fields
  D: { ground: 'dirt', solid: true, door: true },
};

type Text = string | Record<string, string>;
const O = (id: string, x: number, y: number, extra: Record<string, unknown> = {}): MapObj =>
  ({ t: 'obj', id, x, y, text: (AZE_OBJ as Record<string, Text>)[id], ...extra }) as MapObj;
const PR = (prop: string, x: number, y: number, opts?: Record<string, unknown>, extra: Record<string, unknown> = {}): MapObj =>
  ({ t: 'prop', prop, x, y, ...(opts ? { opts } : {}), ...extra }) as MapObj;

/** The paddies next to the paths (examined facing them): one text, several rects. */
const TA: [number, number, number, number][] = [
  [0, 0, 12, 2],
  [13, 0, 11, 3],
  [0, 2, 5, 2],
  [8, 2, 4, 1],
  [0, 4, 8, 3],
  [17, 3, 7, 4],
  [0, 8, 8, 4],
  [17, 8, 7, 4],
  [0, 12, 10, 2],
  [15, 12, 9, 2],
];

const OBJECTS: MapObj[] = [
  // ======================================================== the ground's things (flat first)
  PR('prop_aze_suiro', 0, 7),
  PR('prop_bunsui_futa', 15, 3),
  PR('prop_aze_mizuguchi', 17, 8, { dir: 'n' }),
  PR('prop_aze_mizuguchi', 7, 6, { dir: 's', thin: true }),
  // ======================================================== standing
  PR('prop_bunsui', 9, 4),
  PR('prop_aze_sign', 14, 10),
  PR('prop_aze_bench', 11, 12),
  PR('prop_aze_monooki', 6, 2),
  // an egret in となり町's paddy, another in 夕鳴町's (the town's)
  PR('prop_heron', 3, 10, { seed: 1 }),
  PR('prop_heron', 20, 4, { seed: 4 }),

  // ======================================================== examine (10_narrative 7.22)
  { ...O('obj_bunsui', 9, 4, { w: 7, h: 7, script: 'obj_bunsui' }), text: AZE_OBJ.obj_bunsui } as MapObj,
  O('obj_bunsui_sign', 14, 10, { face: 'up', priority: 1 }),
  O('obj_aze_sakai', 12, 12, { priority: 1 }),
  O('obj_aze_monooki', 6, 2, { w: 2, h: 2 }),
  O('obj_aze_mizuguchi', 17, 8, { priority: 1 }),
  O('obj_aze_mizuguchi2', 7, 6, { priority: 1 }),
  { ...O('obj_aze_suiro', 0, 7, { w: 8, script: 'obj_aze_suiro' }) } as MapObj,
  { ...O('obj_aze_suiro', 17, 7, { w: 7, script: 'obj_aze_suiro' }), id: 'obj_aze_suiro2' } as MapObj,
  O('obj_bunsui_futa', 15, 3, { flat: true }),
  ...TA.map(([x, y, w, h], i) => ({ ...O('obj_aze_ta', x, y, { w, h, script: 'obj_aze_ta' }), id: i ? `obj_aze_ta${i + 1}` : 'obj_aze_ta' }) as MapObj),

  // ======================================================== the pair (events/aze.ts sets their poses)
  // とよぞう (となり町) on the west half facing west, よね (夕鳴町) on the east half facing east;
  // drawn 8px in toward the stone so their backs meet over it
  { t: 'npc', id: 'npc_toyozou', x: 11, y: 12, dir: 'left', noTurn: true, pose: 'sit', off: [8, 0], script: 'npc_toyozou' } as MapObj,
  { t: 'npc', id: 'npc_yone', x: 13, y: 12, dir: 'right', noTurn: true, pose: 'sit_t', off: [-8, 0], script: 'npc_yone' } as MapObj,

  // ======================================================== stage 2: someone's umbrella left by the bench (ワスレガサ)
  {
    t: 'sym', id: 'sym_aze_01', enemies: ['enemy_wasuregasa'], x: 16, y: 11, move: 'umbrella', radius: 1,
    cond: { stage: 2 }, restoreAt: [8, 3], restoreOff: [-4, 0],
  } as MapObj,

  // ======================================================== the ends
  { t: 'door', id: 'door_aze_town', x: 12, y: 0, to: 'map_town', tx: 12, ty: 42, dir: 'up', se: 'se_step_dirt' },
  { t: 'trig', id: 'trig_aze_edge', x: 12, y: 13, w: 1, h: 1, on: 'bump', text: AZE_OBJ.obj_aze_edge },
];

registerMap({
  id: 'map_aze',
  name: '畦道の先の 分水',
  kind: 'outdoor',
  rows: ROWS_AZE,
  legend: AZE_LEGEND,
  objects: OBJECTS,
  camera: 'follow',
  space: 'outdoor',
  // the ridge paths get the far bank's grass tufts (ground.ts: theme 'taigan')
  zones: [{ id: 'taigan', x: 0, y: 0, w: 24, h: 14 }],
  // 8月31日の 稲：穂が 出て、垂れはじめている（依頼主は 農家。water.ts riceLayer）
  riceHeads: 0.55,
  onEnter: ['lv_in_aze'],
  outside: '#1B1733',
  // the town's music; the field's air (40 4.2): the water, the wind over the paddies —
  // in stage 1 the diversion stops mid-spill and only the stillness is heard
  bgm: { 0: 'bgm_town_s0', 1: 'bgm_town_s1', 2: 'bgm_town_s2' },
  amb: {
    0: ['amb_higurashi', 'amb_kawabe', 'amb_wind'],
    1: ['amb_still'],
    2: ['amb_s2_town', 'amb_kawabe', 'amb_wind'],
  },
  groundDecals: [{ k: 'footprints', x: 12, y: 1, h: 2, dir: 'v' }],
});
