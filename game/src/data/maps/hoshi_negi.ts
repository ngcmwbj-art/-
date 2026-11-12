// map_hoshi_negi — 裏の ネギ畑（2026-10-30 依頼主の 採用：げむきか 10/30 の 案5「土を 寄せるほど、白く なる」、02_ch2_index）。
// 16×10、画面 1枚。マサルの 家の 裏の、94歳の 母が 毎年 ネギだけは 自分で 植えてきた 小さな 畑。マサルの 家の 庭の
// 東の はしの 木戸（村の (59,44)）からだけ 来る（ほかに 出口は ない）。台本は events/ch2/negi.ts、文は
// data/text/hoshi_negi.ts、絵は art/props/negi_art.ts。
//
//      0123456789012345
//   0  HHHHHHHHHHHHHHHH   北：杉林の すそ
//   1  F,,,,,,,,,,,,,,B   西：丸太の 柵（庭の がわ）、東：低い 石垣（その 下の 段は 草地）
//   2  F,,NNNNNNNNNN,tB   ネギの 畝 1本目 (3–12,2)（見本：寄せた ばかり）、堆肥の 山 (14,2)
//   3  F,,::::::::::,,B   畝の あいだの 通路
//   4  F,,NNNNNNNNNN,,B   2本目 (3–12,4)（寄せて いない）
//   5  J,,::::::::::,dB   西の 木戸 (0,5)（着くのは (1,5)）、鍬と 移植ごて (14,5)
//   6  F,,NNNNNNNNNN,,B   3本目 (3–12,6)（寄せすぎ：分かれ目まで 埋まりかけ。東の はしに 去年の 札『ここは 私』(13,6)）
//   7  F,,::::::::::,kB   雨水の かめ (14,7)
//   8  F,b,,,,,,,,,mm,B   母の 麦わら帽子を かけた 杭 (2,8)、物置 (12–13,8)
//   9  BBBBBBBBBBBBBBBB   南：低い 石垣
//
// 人：マサル（〔negi〕から すむまで (1,4)。台本が 置く）。敵は 置かない。夜明け前の 薄明（暗がりは 置かない：
// 畝の 土の 線が 見える）。h2 で すんだ あとは 畝の 土の 線が 寄せた ままの 絵（negi_art が flag を 読む）。

import { registerMap } from '../../world/maps';
import type { MapObj } from '../../world/types';
import { hg, PR } from './hoshi_common';

export const NEGI = 'map_hoshi_negi';
export const NH_W = 16;
export const NH_H = 10;

const ROWS = [
  'HHHHHHHHHHHHHHHH', // 0
  'F,,,,,,,,,,,,,,B', // 1
  'F,,NNNNNNNNNN,oB', // 2
  'F,,::::::::::,,B', // 3
  'F,,NNNNNNNNNN,,B', // 4
  'J,,::::::::::,oB', // 5
  'F,,NNNNNNNNNNo,B', // 6
  'F,,::::::::::,oB', // 7
  'F,o,,,,,,,,,oo,B', // 8
  'BBBBBBBBBBBBBBBB', // 9
];

/** 畝の y（1本目・2本目・3本目）。x は 3–12。 */
export const NH_UNE_Y = [2, 4, 6] as const;
export const NH_UNE_X0 = 3;
export const NH_UNE_LEN = 10;
export const NH_TAIHI_AT: [number, number] = [14, 2];
export const NH_DOUGU_AT: [number, number] = [14, 5];
export const NH_KAME_AT: [number, number] = [14, 7];
export const NH_BOUSHI_AT: [number, number] = [2, 8];
export const NH_MONOOKI_AT: [number, number] = [12, 8];
export const NH_FUDA_AT: [number, number] = [13, 6];
export const NH_KIDO_AT: [number, number] = [0, 5];
/** 着く ところ（木戸の 東）。 */
export const NH_IN_AT: [number, number] = [1, 5];
/** マサルの 立ち位置（〔negi〕から すむまで）。 */
export const NH_GEN_AT: [number, number] = [1, 4];
/** グソっ君が 寝ころぶ ところ（しゅんが 立つ 通路〈3本目の 北・南〉の 東の はし。しゅんは その 西 (11,y)）。 */
export const NH_NEKO_AT: [number, number][] = [
  [12, 5],
  [12, 7],
];

/** 絵が flag で 変わる 物（HD-2D は cond の ない 物を 動かない 絵として 焼く：town.ts stillPicture）。 */
const LIVE = { cond: { when: () => true } } as Record<string, unknown>;

const OBJECTS: MapObj[] = [
  // the three rows (one tile a prop: the soil line reads its row's flag)
  ...NH_UNE_Y.flatMap((y, r) => Array.from({ length: NH_UNE_LEN }, (_, i) => PR('prop_nh_negi', NH_UNE_X0 + i, y, { r, i }, LIVE))),
  PR('prop_nh_taihi', NH_TAIHI_AT[0], NH_TAIHI_AT[1]),
  PR('prop_nh_dougu', NH_DOUGU_AT[0], NH_DOUGU_AT[1]),
  PR('prop_nh_kame', NH_KAME_AT[0], NH_KAME_AT[1]),
  PR('prop_nh_boushi', NH_BOUSHI_AT[0], NH_BOUSHI_AT[1]),
  PR('prop_nh_monooki', NH_MONOOKI_AT[0], NH_MONOOKI_AT[1]),
  PR('prop_nh_fuda', NH_FUDA_AT[0], NH_FUDA_AT[1]),
  PR('prop_nh_kido', NH_KIDO_AT[0], NH_KIDO_AT[1], { side: 'in' }),
  ...NH_NEKO_AT.map(([x, y], at) => PR('prop_nh_uzumi', x, y, { at }, LIVE)),
  // examine
  ...NH_UNE_Y.map((y, r) => ({ t: 'obj', id: `obj_nh_une_${r}`, x: NH_UNE_X0, y, w: NH_UNE_LEN, script: `obj_nh_une_${r}` }) as MapObj),
  { t: 'obj', id: 'obj_nh_fuda', x: NH_FUDA_AT[0], y: NH_FUDA_AT[1], script: 'obj_nh_une_2' } as MapObj,
  { t: 'obj', id: 'obj_nh_taihi', x: NH_TAIHI_AT[0], y: NH_TAIHI_AT[1], script: 'obj_nh_taihi' } as MapObj,
  { t: 'obj', id: 'obj_nh_dougu', x: NH_DOUGU_AT[0], y: NH_DOUGU_AT[1], script: 'obj_nh_dougu' } as MapObj,
  { t: 'obj', id: 'obj_nh_kame', x: NH_KAME_AT[0], y: NH_KAME_AT[1], script: 'obj_nh_kame' } as MapObj,
  { t: 'obj', id: 'obj_nh_boushi', x: NH_BOUSHI_AT[0], y: NH_BOUSHI_AT[1], script: 'obj_nh_boushi' } as MapObj,
  { t: 'obj', id: 'obj_nh_monooki', x: NH_MONOOKI_AT[0], y: NH_MONOOKI_AT[1], w: 2, script: 'obj_nh_monooki' } as MapObj,
  { t: 'obj', id: 'obj_nh_sugi', x: 1, y: 0, w: 14, face: 'up', script: 'obj_nh_sugi' } as MapObj,
  { t: 'obj', id: 'obj_nh_ishigaki_e', x: 15, y: 1, h: 8, face: 'right', script: 'obj_nh_ishigaki' } as MapObj,
  { t: 'obj', id: 'obj_nh_ishigaki_s', x: 1, y: 9, w: 14, face: 'down', script: 'obj_nh_ishigaki' } as MapObj,
  // the gate (from inside: back to 庭; the fade)
  { t: 'obj', id: 'obj_nh_kido_in', x: NH_KIDO_AT[0], y: NH_KIDO_AT[1], face: 'left', script: 'obj_nh_kido_in' } as MapObj,
  { t: 'door', id: 'door_nh_back', x: NH_KIDO_AT[0], y: NH_KIDO_AT[1], to: 'map_hoshimidai', tx: 58, ty: 44, dir: 'left', se: 'se_door' } as MapObj,
];

registerMap({
  id: NEGI,
  name: '裏の ネギ畑',
  kind: 'outdoor',
  chapter: 2,
  stageFlag: 'flag_ch2_stage',
  rows: ROWS,
  legend: {
    H: { ground: 'grass', solid: true, tag: 'hedge' },
    F: { ground: 'grass', solid: true, tag: 'fence' },
    J: { ground: 'grass', solid: true, door: true, tag: 'fence' },
    B: { ground: 'grass', solid: true, tag: 'wall' },
    ',': { ground: 'grass', step: 'se_step_grass' },
    ':': { ground: hg('h_tilled'), step: 'se_step_dirt' },
    N: { ground: hg('h_tilled'), solid: true, tag: 'prop' },
    o: { ground: 'grass', solid: true, tag: 'prop' },
    // (HD-2D の 外：石垣の 下の 段の 草地。地図の 中には 置かない)
    g: { ground: 'grass', solid: true },
  },
  objects: OBJECTS,
  camera: 'follow',
  variant: 'outdoor',
  pa: 'yama',
  space: 'yama',
  outside: '#0B0B14',
  // 夜明け前の 薄明（暗がりは 置かない：トマトの 灯りで 畝の 土の 線が よく 見える）
  zones: [{ id: 'area_hoshi_negi', name: '裏の ネギ畑', x: 0, y: 0, w: NH_W, h: NH_H, wind: 'none' }],
  structMats: [
    { x: 0, y: 0, w: NH_W, h: 1, mat: 'sugi', ch: 'H' },
    { x: 0, y: 1, w: 1, h: NH_H - 2, mat: 'maruta', ch: 'F' },
    { x: 0, y: 0, w: NH_W, h: NH_H, mat: 'ishigaki', ch: 'B' },
  ],
  bgm: { 0: 'bgm_hoshi_night', 1: 'bgm_hoshi_night', 2: 'bgm_hoshi_night' },
  amb: { 0: ['amb_h_insects'], 1: ['amb_h_insects'], 2: ['amb_h_insects', 'amb_h_pa_hum'] },
  ambVol: { amb_h_pa_hum: { vol: 0.3, lp: 1200 } },
  onEnter: ['evt_nh_enter'],
});
