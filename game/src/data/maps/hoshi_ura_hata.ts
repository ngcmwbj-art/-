// map_hoshi_ura_hata — 裏の とうもろこし畑（2026-10-18 依頼主の採用：げむきか 10/18 の 案4「湯を わかしてから」、
// 02_ch2_index #106）。16×10、画面 1枚。シゲじいと スギばあの 家（map_hoshi_minka2）の 東の 壁 (11,4) の 勝手口から
// だけ 来る（村の 外の 地図には 出入口を 足さない）。台本は events/ch2/yuwaka.ts、文は data/text/hoshi_yuwaka.ts、
// 絵は art/props/yuwaka_art.ts。
//
//      0123456789012345
//   0  WFFFFFFFFFFFFFFH   北：獣よけの ネット（juugai）。東の はしは 林（zoki）
//   1  W,,,::::::::::oH   物置 (14,1)（ざると 手ぬぐい）
//   2  W,,,C:C:C:C:C:,H   とうもろこし 3列 × 5株（x4–12, y2・y4・y6。背は しゅんより 高い）
//   4  W,,,C:C:C:C:C:,H
//   5  D,,,::::::::::,H   西の はし (0,5)：勝手口（家の 中へ）
//   6  W,,,C:C:C:C:C:,H
//   9  WFFFFFFFgFFFFFFH   南の ネットの すき間 (8,9)
//
// 人は いない（2人は 集会所で 眠っている）。敵は 置かない（走って 帰る とちゅうで 戦闘に ならない）。
// 全体が 暗がり（トマトの 灯りの 輪の 中だけ 見える）。葉は 灯りで さらさら 光る（風は ないので 動かない）。

import { registerMap } from '../../world/maps';
import type { MapObj } from '../../world/types';
import { hg, PR } from './hoshi_common';

export const URA_HATA = 'map_hoshi_ura_hata';
export const URA_W = 16;
export const URA_H = 10;

const ROWS = [
  'WFFFFFFFFFFFFFFH', // 0
  'W,,,::::::::::oH', // 1
  'W,,,C:C:C:C:C:,H', // 2
  'W,,,::::::::::,H', // 3
  'W,,,C:C:C:C:C:,H', // 4
  'D,,,::::::::::,H', // 5
  'W,,,C:C:C:C:C:,H', // 6
  'W,,,::::::::::,H', // 7
  'W,,,,,,,,,,,,,,H', // 8
  'WFFFFFFFgFFFFFFH', // 9
];

/** 15株：[x, y, 種類]。'tori' とりごろ（4本）・'hayai' これから・'kajiri' 先を かじられた（1本）。 */
export const URA_KABU: [number, number, 'tori' | 'hayai' | 'kajiri'][] = [];
{
  const TORI = ['6,2', '10,4', '4,6', '12,6'];
  for (const y of [2, 4, 6])
    for (const x of [4, 6, 8, 10, 12]) URA_KABU.push([x, y, TORI.includes(`${x},${y}`) ? 'tori' : x === 8 && y === 6 ? 'kajiri' : 'hayai']);
}

const OBJECTS: MapObj[] = [
  // the back of the house: its board wall along the west edge, the kitchen door at (0,5)
  ...Array.from({ length: URA_H }, (_, y) => PR('prop_yw_kabe', 0, y, { door: y === 5 ? 1 : 0, top: y === 0 ? 1 : 0 })),
  // the 15 stalks (the picked ones keep their stalk: the prop reads flag_yw_kabu_<i>)
  ...URA_KABU.flatMap(([x, y, k], i) => [
    PR('prop_yw_corn', x, y, { i, k }, { cond: { notFlag: `flag_yw_kabu_${i}` } }),
    PR('prop_yw_corn', x, y, { i, k, picked: 1 }, { cond: { flag: `flag_yw_kabu_${i}` } }),
  ]),
  // the shed in the north corner
  PR('prop_yw_koya', 14, 1),
  // examine
  ...URA_KABU.map(([x, y], i) => ({ t: 'obj', id: `obj_yw_kabu_${i + 1}`, x, y, script: 'obj_yw_kabu' }) as MapObj),
  { t: 'obj', id: 'obj_yw_koya', x: 14, y: 1, script: 'obj_yw_koya' } as MapObj,
  { t: 'obj', id: 'obj_yw_net', x: 8, y: 9, face: 'down', script: 'obj_yw_net' } as MapObj,
  // back into the house (its east wall's kitchen door)
  { t: 'door', id: 'door_yw_ura_back', x: 0, y: 5, to: 'map_hoshi_minka2', tx: 10, ty: 4, dir: 'left', se: 'se_door' },
];

registerMap({
  id: URA_HATA,
  name: '裏の とうもろこし畑',
  kind: 'outdoor',
  chapter: 2,
  stageFlag: 'flag_ch2_stage',
  rows: ROWS,
  legend: {
    // (the board wall's foot on grass: the ground past the west edge goes on as the edge's, so as grass)
    W: { ground: 'grass', solid: true, tag: 'facade' },
    D: { ground: 'grass', solid: true, door: true, tag: 'facade' },
    F: { ground: 'grass', solid: true, tag: 'fence' },
    g: { ground: 'grass', solid: true, tag: 'fence' },
    H: { ground: 'grass', solid: true, tag: 'hedge' },
    ',': { ground: 'grass', step: 'se_step_grass' },
    ':': { ground: hg('h_tilled'), step: 'se_step_dirt' },
    C: { ground: hg('h_tilled'), solid: true, tag: 'prop' },
    o: { ground: 'grass', solid: true, tag: 'prop' },
  },
  objects: OBJECTS,
  camera: 'follow',
  variant: 'outdoor',
  pa: 'yama',
  space: 'yama',
  outside: '#0B0B14',
  // all of it in the dark: the lantern's ring shows the way (52 8.5)
  dark: [{ x: 0, y: 0, w: URA_W, h: URA_H }],
  zones: [{ id: 'area_hoshi_ura_hata', name: '裏の とうもろこし畑', x: 0, y: 0, w: URA_W, h: URA_H, wind: 'none' }],
  structMats: [
    { x: 1, y: 0, w: URA_W - 2, h: 1, mat: 'juugai', ch: 'F' },
    { x: 1, y: URA_H - 1, w: URA_W - 2, h: 1, mat: 'juugai', ch: 'F' },
    { x: URA_W - 1, y: 0, w: 1, h: URA_H, mat: 'zoki', ch: 'H' },
  ],
  bgm: { 0: 'bgm_hoshi_night', 1: 'bgm_hoshi_night', 2: 'bgm_hoshi_night' },
  amb: { 0: ['amb_h_insects'], 1: ['amb_h_insects'], 2: ['amb_h_insects', 'amb_h_pa_hum'] },
  ambVol: { amb_h_pa_hum: { vol: 0.3, lp: 1200 } },
  onEnter: ['evt_yw_hata_enter'],
});
