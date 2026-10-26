// map_hoshi_ue_hata — 上の 畑（2026-10-26 依頼主の採用：げむきか 10/26 の 案5「寝とる うちに、とる」、02_ch2_index）。
// 16×10、画面 1枚。3号ハウスの 上（西の 斜面の ハウスの 裏）の 獣よけの ネットの 向こうに ある、ペロの 小さな
// レタス畑。村の ネットの 戸 (6,19) からだけ 来る（ほかに 出口は ない）。台本は events/ch2/retasu.ts、
// 文は data/text/hoshi_retasu.ts、絵は art/props/retasu_art.ts。
//
//      0123456789012345
//   0  HHHHHHHHHHHHHHHH   北：杉の 林
//   1  F,,:::::::::::,H   西：獣よけの ネット（juugai）。北西の すみの ネットに 草の つる (0,1)
//   2  F,,L:L:L:L:L:L,H   レタスの 畝 3本 × 6株（x3–13, y2・y4・y6。玉の 大きさは それぞれ ちがう）
//   4  F,,L:L:L:L:L:L,H   とる 3株：(5,4) かたい・(9,2) やわらかい・(11,6) かたすぎ（きらり）
//   6  F,,L:L:L:L:L:L,H
//   7  F,,:::::::::::oH   収穫コンテナ (14,7)
//   8  F,o,,,,,,,,,,,oH   小さな かかし (2,8)、霧吹きと バケツ (14,8)
//   9  FFFFFFFFJFFFFFFH   南の はしの ネットの 戸 (8,9)（村の (6,20) へ）
//
// 人：ペロ（畝の あいだ (7,5) 下向き。〔retasu〕から すむまで。台本が 置く）。敵は 置かない（ネットの 内がわ）。
// 全体が 暗がり（夜明け前の 青。ただし 暗い 所も 真っ暗には しない：darkCol を ふつうの 暗がりより 1段 明るく）。
// ペロの ヘッドライトの 光の 輪（台本が 動かす darkLights）と、トマトの 灯りの 輪の 中は はっきり 明るい。

import { registerMap } from '../../world/maps';
import type { DarkLight, MapObj } from '../../world/types';
import { hg, PR } from './hoshi_common';

export const UE_HATA = 'map_hoshi_ue_hata';
export const UE_W = 16;
export const UE_H = 10;

const ROWS = [
  'HHHHHHHHHHHHHHHH', // 0
  'F,,:::::::::::,H', // 1
  'F,,L:L:L:L:L:L,H', // 2
  'F,,:::::::::::,H', // 3
  'F,,L:L:L:L:L:L,H', // 4
  'F,,:::::::::::,H', // 5
  'F,,L:L:L:L:L:L,H', // 6
  'F,,:::::::::::oH', // 7
  'F,o,,,,,,,,,,,oH', // 8
  'FFFFFFFFJFFFFFFH', // 9
];

export type RtKind = 'kata' | 'yawa' | 'kosugi';
/** とる 3株（光る 株）：[x, y, かたさ]。 */
export const RT_TAMA: [number, number, RtKind][] = [
  [5, 4, 'kata'],
  [9, 2, 'yawa'],
  [11, 6, 'kosugi'],
];
/** 18株 ぜんぶ（x3–13 の 1つおき × y2・y4・y6）。 */
export const RT_KABU: [number, number][] = [];
for (const y of [2, 4, 6]) for (const x of [3, 5, 7, 9, 11, 13]) RT_KABU.push([x, y]);
export const RT_PERO_AT: [number, number] = [7, 5];
export const RT_KONTENA_AT: [number, number] = [14, 7];
export const RT_KIRI_AT: [number, number] = [14, 8];
export const RT_KAKASHI_AT: [number, number] = [2, 8];
export const RT_NET_AT: [number, number] = [8, 9];

/** ペロの ヘッドライトの 光（台本が 毎こま ペロの 前へ 動かす。ペロが いない ときは 遠くへ）。 */
export const RT_HEADLAMP: DarkLight = { x: -9, y: -9, ox: 8, oy: 8, r: 46, amp: 1, k: 1.15 };
/** ヘッドライトの 光の 筋の 先の、地面の 小さな 輪。 */
export const RT_HEADLAMP_SPOT: DarkLight = { x: -9, y: -9, ox: 8, oy: 8, r: 26, amp: 0, k: 1 };

const tamaAt = (x: number, y: number) => RT_TAMA.findIndex(([tx, ty]) => tx === x && ty === y);

const OBJECTS: MapObj[] = [
  // the 18 heads (the three to pick read their flags: picked, left)
  ...RT_KABU.map(([x, y], i) => PR('prop_rt_retasu', x, y, { i, t: tamaAt(x, y) })),
  PR('prop_rt_kontena', RT_KONTENA_AT[0], RT_KONTENA_AT[1]),
  PR('prop_rt_kiri', RT_KIRI_AT[0], RT_KIRI_AT[1]),
  PR('prop_kakashi', RT_KAKASHI_AT[0], RT_KAKASHI_AT[1], { v: 'apron' }),
  PR('prop_rt_to', RT_NET_AT[0], RT_NET_AT[1], { side: 'in' }),
  PR('prop_rt_tsuru', 0, 1),
  // examine (the three to pick: events/ch2/retasu.ts adds them, with their glint)
  ...RT_KABU.filter(([x, y]) => tamaAt(x, y) < 0).map(([x, y], i) => ({ t: 'obj', id: `obj_rt_hoka_${i}`, x, y, script: 'obj_rt_hoka' }) as MapObj),
  { t: 'obj', id: 'obj_rt_kontena', x: RT_KONTENA_AT[0], y: RT_KONTENA_AT[1], script: 'obj_rt_kontena' } as MapObj,
  { t: 'obj', id: 'obj_rt_kiri', x: RT_KIRI_AT[0], y: RT_KIRI_AT[1], script: 'obj_rt_kiri' } as MapObj,
  { t: 'obj', id: 'obj_rt_kakashi', x: RT_KAKASHI_AT[0], y: RT_KAKASHI_AT[1], script: 'obj_rt_kakashi' } as MapObj,
  { t: 'obj', id: 'obj_rt_kusa', x: 0, y: 1, face: 'left', script: 'obj_rt_kusa' } as MapObj,
  { t: 'obj', id: 'obj_rt_net', x: RT_NET_AT[0], y: RT_NET_AT[1], face: 'down', script: 'obj_rt_net' } as MapObj,
  // back down to the village (the net's door behind 3号ハウス)
  { t: 'door', id: 'door_rt_ue_back', x: RT_NET_AT[0], y: RT_NET_AT[1], to: 'map_hoshimidai', tx: 6, ty: 20, dir: 'down', se: 'se_door' } as MapObj,
];

registerMap({
  id: UE_HATA,
  name: '上の 畑',
  kind: 'outdoor',
  chapter: 2,
  stageFlag: 'flag_ch2_stage',
  rows: ROWS,
  legend: {
    F: { ground: 'grass', solid: true, tag: 'fence' },
    J: { ground: 'grass', solid: true, door: true, tag: 'fence' },
    H: { ground: 'grass', solid: true, tag: 'hedge' },
    ',': { ground: 'grass', step: 'se_step_grass' },
    ':': { ground: hg('h_tilled'), step: 'se_step_dirt' },
    L: { ground: hg('h_tilled'), solid: true, tag: 'prop' },
    o: { ground: 'grass', solid: true, tag: 'prop' },
  },
  objects: OBJECTS,
  camera: 'follow',
  variant: 'outdoor',
  pa: 'yama',
  space: 'yama',
  outside: '#0B0B14',
  // all of it in the dark (52 8.5) — but a step lighter than the usual dark (2026-10-26 会議：昼の 屋外の iPad でも 見える)
  dark: [{ x: 0, y: 0, w: UE_W, h: UE_H }],
  darkCol: '#5C5890',
  darkLights: [RT_HEADLAMP, RT_HEADLAMP_SPOT],
  zones: [{ id: 'area_hoshi_ue_hata', name: '上の 畑', x: 0, y: 0, w: UE_W, h: UE_H, wind: 'none' }],
  structMats: [
    { x: 0, y: 1, w: 1, h: UE_H - 1, mat: 'juugai', ch: 'F' },
    { x: 0, y: UE_H - 1, w: UE_W - 1, h: 1, mat: 'juugai', ch: 'F' },
    { x: 0, y: UE_H - 1, w: UE_W - 1, h: 1, mat: 'juugai', ch: 'J' },
    { x: 0, y: 0, w: UE_W, h: 1, mat: 'sugi', ch: 'H' },
    { x: UE_W - 1, y: 0, w: 1, h: UE_H, mat: 'sugi', ch: 'H' },
  ],
  bgm: { 0: 'bgm_hoshi_night', 1: 'bgm_hoshi_night', 2: 'bgm_hoshi_night' },
  amb: { 0: ['amb_h_insects'], 1: ['amb_h_insects'], 2: ['amb_h_insects', 'amb_h_pa_hum'] },
  ambVol: { amb_h_pa_hum: { vol: 0.3, lp: 1200 } },
  onEnter: ['evt_rt_hata_enter'],
});
