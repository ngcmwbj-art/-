// map_hoshi_gakkyuen — 分校の そば畑（2026-10-28 依頼主の 採用：げむきか 10/28 の 案4「ちがう 花が、となりに」、02_ch2_index）。
// 16×10、画面 1枚。分校の 裏の、まつ先生が 毎年 そばを まく 小さな 畑（もとの 学級園）。表示名は 第1章の 夕鳴小の
// 「学級園」と 分けて「分校の そば畑」（ID は 案の まま）。校庭の 北西の すみ（分校の 西の 壁ぎわ）の 竹垣の 戸
// （村の (20,26)）からだけ 来る（ほかに 出口は ない）。台本は events/ch2/soba.ts、文は data/text/hoshi_soba.ts、
// 絵は art/props/soba_art.ts。
//
//      0123456789012345
//   0  HHHHHHHHHHHHHHHH   北：杉（向こうに 体育館の 屋根）
//   1  T,,,,,,,,,,,,,,T   西と 東：竹やぶ
//   2  T,,,,SSSSSS,,,,T   そば畑 6×4（x5–10, y2–3・y5–6。白い 花と うっすら 赤い 茎。歩けない）
//   3  T,,,,SSSSSS,,,,T
//   4  T,,,,::::::,,,,T   畝の 通路（ここと まわりから 花を 調べる）
//   5  T,,,,SSSSSS,,,,T
//   6  T,,,,SSSSSS,,,,T
//   7  Too,,,,,,,,,,ooT   道具小屋 (1–2,7–8)、名札の 杭 (13–14,7–8)
//   8  Too,,,,o,,,,,ooT   当番表 (7,8)（南の 戸の よこ）
//   9  KKKKKKKKJKKKKKKK   南の 竹垣、戸 (8,9)（村の (20,27) へ）
//
// 人は いない。敵は 置かない。全体が 暗がり（暗い 所も 真っ暗には しない：darkCol を 1段 明るく。上の 畑と 同じ）。
// トマトの 灯りの 輪の 中だけ、白い 花が はっきり 浮かぶ。

import { registerMap } from '../../world/maps';
import type { MapObj } from '../../world/types';
import { hg, PR } from './hoshi_common';

export const GAKKYUEN = 'map_hoshi_gakkyuen';
export const GK_W = 16;
export const GK_H = 10;

const ROWS = [
  'HHHHHHHHHHHHHHHH', // 0
  'T,,,,,,,,,,,,,,T', // 1
  'T,,,,SSSSSS,,,,T', // 2
  'T,,,,SSSSSS,,,,T', // 3
  'T,,,,::::::,,,,T', // 4
  'T,,,,SSSSSS,,,,T', // 5
  'T,,,,SSSSSS,,,,T', // 6
  'Too,,,,,,,,,,ooT', // 7
  'Too,,,,o,,,,,ooT', // 8
  'KKKKKKKKJKKKKKKK', // 9
];

/** そばの 株（x5–10 × y2・3・5・6）。 */
export const SB_KABU: [number, number][] = [];
for (const y of [2, 3, 5, 6]) for (let x = 5; x <= 10; x++) SB_KABU.push([x, y]);
export const SB_KOYA_AT: [number, number] = [1, 7];
export const SB_KUI_AT: [number, number] = [13, 7];
export const SB_TOUBAN_AT: [number, number] = [7, 8];
export const SB_TO_AT: [number, number] = [8, 9];

const OBJECTS: MapObj[] = [
  // the buckwheat (one tuft a tile; the tags stand among them once paired: art reads flag_sb_fuda)
  ...SB_KABU.map(([x, y], i) => PR('prop_sb_soba', x, y, { i })),
  PR('prop_sb_koya', SB_KOYA_AT[0], SB_KOYA_AT[1]),
  PR('prop_sb_kui', SB_KUI_AT[0], SB_KUI_AT[1]),
  PR('prop_sb_touban', SB_TOUBAN_AT[0], SB_TOUBAN_AT[1]),
  PR('prop_sb_kaki', 0, 9, { gate: SB_TO_AT[0] }),
  PR('prop_sb_to', SB_TO_AT[0], SB_TO_AT[1], { side: 'in' }),
  // examine
  ...SB_KABU.map(([x, y], i) => ({ t: 'obj', id: `obj_sb_soba_${i}`, x, y, script: 'obj_sb_soba' }) as MapObj),
  { t: 'obj', id: 'obj_sb_koya', x: SB_KOYA_AT[0], y: SB_KOYA_AT[1], w: 2, h: 2, script: 'obj_sb_koya' } as MapObj,
  { t: 'obj', id: 'obj_sb_kui', x: SB_KUI_AT[0], y: SB_KUI_AT[1], w: 2, h: 2, script: 'obj_sb_kui' } as MapObj,
  { t: 'obj', id: 'obj_sb_touban', x: SB_TOUBAN_AT[0], y: SB_TOUBAN_AT[1], script: 'obj_sb_touban' } as MapObj,
  { t: 'obj', id: 'obj_sb_sugi', x: 1, y: 0, w: 14, face: 'up', script: 'obj_sb_sugi' } as MapObj,
  { t: 'obj', id: 'obj_sb_to_in', x: SB_TO_AT[0], y: SB_TO_AT[1], face: 'down', script: 'obj_sb_to_in' } as MapObj,
  // back out to the 校庭's corner
  { t: 'door', id: 'door_sb_back', x: SB_TO_AT[0], y: SB_TO_AT[1], to: 'map_hoshimidai', tx: 20, ty: 27, dir: 'down', se: 'se_door' } as MapObj,
];

registerMap({
  id: GAKKYUEN,
  name: '分校の そば畑',
  kind: 'outdoor',
  chapter: 2,
  stageFlag: 'flag_ch2_stage',
  rows: ROWS,
  legend: {
    H: { ground: 'grass', solid: true, tag: 'hedge' },
    T: { ground: 'grass', solid: true, tag: 'hedge' },
    K: { ground: 'grass', solid: true, tag: 'prop' },
    J: { ground: 'grass', solid: true, door: true, tag: 'prop' },
    ',': { ground: 'grass', step: 'se_step_grass' },
    ':': { ground: hg('h_tilled'), step: 'se_step_dirt' },
    S: { ground: hg('h_tilled'), solid: true, tag: 'prop' },
    o: { ground: 'grass', solid: true, tag: 'prop' },
  },
  objects: OBJECTS,
  camera: 'follow',
  variant: 'outdoor',
  pa: 'yama',
  space: 'yama',
  outside: '#0B0B14',
  // all of it in the dark (52 4.5) — a step lighter than the usual dark, as 上の 畑 (2026-10-26 会議：昼の 屋外の iPad)
  dark: [{ x: 0, y: 0, w: GK_W, h: GK_H }],
  darkCol: '#666C9A',
  zones: [{ id: 'area_hoshi_gakkyuen', name: '分校の そば畑', x: 0, y: 0, w: GK_W, h: GK_H, wind: 'none' }],
  structMats: [
    { x: 0, y: 0, w: GK_W, h: 1, mat: 'sugi', ch: 'H' },
    { x: 0, y: 1, w: 1, h: GK_H - 2, mat: 'take', ch: 'T' },
    { x: GK_W - 1, y: 1, w: 1, h: GK_H - 2, mat: 'take', ch: 'T' },
  ],
  bgm: { 0: 'bgm_hoshi_night', 1: 'bgm_hoshi_night', 2: 'bgm_hoshi_night' },
  amb: { 0: ['amb_h_insects'], 1: ['amb_h_insects'], 2: ['amb_h_insects', 'amb_h_pa_hum'] },
  ambVol: { amb_h_pa_hum: { vol: 0.3, lp: 1200 } },
  onEnter: ['evt_sb_enter'],
});
