// map_hoshi_touge — 峠の カーブ（2026-10-29 依頼主の 採用：げむきか 10/29 の 案5「雲の 下にも、郵便受け」、02_ch2_index）。
// 24×18（雲の 9行は 歩けない。歩く 所は 横に 約1.5画面）。県道の 西の はし（村の (0,38–39)）の 先：県道が 西へ 下りながら 大きく 曲がる 所。
// 北が 谷の がわ（ガードレールの 向こうは 下に 落ちて、いちめんの 雲海。HD-2D では 雲は 道より 低く、北の 遠くまで
// 続き、その 向こうに 山の 尾根と 夜明け前の 空：hd2d/places.ts）。南は 杉の 斜面。東の はしから 入る（〔kumo〕の
// あと だけ。台本は events/ch2/touge.ts、文は data/text/hoshi_touge.ts、絵は art/props/touge_art.ts）。
//
//      012345678901234567890123
//   0  CCCCCCCCCCCCCCCCCCCCCCCC   雲海（歩けない。北の 外へ 続く）。目印の 島 3つ（お寺の 屋根・大杉・鉄塔の 頭）は y0–2：
//   …                             HD-2D では 雲が 道より KUMO_FALL 低く、ガードレールの すぐ 北は 崖の かげに なるので、
//   8  CCCCCCCCCCCCCCCCCCCCCCCC   島は ガードレールから 7〜9 マス 北に 置く（遠くの 島に 見える）
//   9  GGGGGGGGGGGGGGGGGGGGGGGG   ガードレール（x16–19 が 見晴らし：待避所の 北）
//  10  ........................   県道（西へ 下る。西の はし x0 は「この 先は、朝の バスで。」）
//  11  ........................
//  12  ........................
//  13  ,,,,,,o,,,,,o,,,,,,,o...   路肩：古い バス停の 標柱 (6,13)、カーブミラー (12,13)、反射板 (20,13)。東の はし (23,10–13) から 村へ
//  14  HHHHHH,,,,,,,,,,,,,,,,,,   杉の 斜面（南へ 上る）
//  15  HHHHHHHHHHHH,,,,,,,,,,,,
//  16  HHHHHHHHHHHHHHHHHHH,,,,,
//  17  HHHHHHHHHHHHHHHHHHHHHHHH
//
// 人は いない（さんかどは 転回場を 離れない）。敵は 置かない（チョトツは 置かない：通り道と 見晴らしを ふさがない ため）。
// 暗がりは 置かない（星あかりの 白い 雲と、トマトの 灯り）。

import { registerMap } from '../../world/maps';
import type { MapObj } from '../../world/types';
import { hg, PR } from './hoshi_common';

export const TOUGE = 'map_hoshi_touge';
export const TG_W = 24;
export const TG_H = 18;
/** ガードレールの 行。 */
export const TG_RAIL = 9;

const ROWS = [
  'CCCCCCCCCCCCCCCCCCCCCCCC', // 0
  'CCCCCCCCCCCCCCCCCCCCCCCC', // 1
  'CCCCCCCCCCCCCCCCCCCCCCCC', // 2
  'CCCCCCCCCCCCCCCCCCCCCCCC', // 3
  'CCCCCCCCCCCCCCCCCCCCCCCC', // 4
  'CCCCCCCCCCCCCCCCCCCCCCCC', // 5
  'CCCCCCCCCCCCCCCCCCCCCCCC', // 6
  'CCCCCCCCCCCCCCCCCCCCCCCC', // 7
  'CCCCCCCCCCCCCCCCCCCCCCCC', // 8
  'GGGGGGGGGGGGGGGGGGGGGGGG', // 9
  '........................', // 10
  '........................', // 11
  '........................', // 12
  ',,,,,,o,,,,,o,,,,,,,o...', // 13
  'HHHHHH,,,,,,,,,,,,,,,,,,', // 14
  'HHHHHHHHHHHH,,,,,,,,,,,,', // 15
  'HHHHHHHHHHHHHHHHHHH,,,,,', // 16
  'HHHHHHHHHHHHHHHHHHHHHHHH', // 17
];

/** 雲から 出る 目印の 島（雲の マス。0 お寺の 屋根・1 大杉・2 鉄塔の 頭）。 */
export const KS_SHIMA_AT: [number, number][] = [
  [21, 2],
  [4, 1],
  [12, 0],
];
export const KS_HYOCHU_AT: [number, number] = [6, 13];
export const KS_MIRROR_AT: [number, number] = [12, 13];
export const KS_HANSHA_AT: [number, number] = [20, 13];
/** 見晴らし（ガードレールの x16–19。(16–19,10) から 北向きに 調べる）。 */
export const KS_MIHARASHI: { x: number; w: number } = { x: 16, w: 4 };
/** 村から 来た とき 立つ 所（東の はしの 1つ 内）。 */
export const KS_IN_AT: [number, number] = [22, 11];

const OBJECTS: MapObj[] = [
  // the landmarks standing out of the cloud (far off: small)
  ...KS_SHIMA_AT.map(([x, y], i) => PR(`prop_ks2_shima_${i + 1}`, x, y)),
  PR('prop_ks2_hyochu', KS_HYOCHU_AT[0], KS_HYOCHU_AT[1]),
  PR('prop_curve_mirror', KS_MIRROR_AT[0], KS_MIRROR_AT[1]),
  PR('prop_ks2_hansha', KS_HANSHA_AT[0], KS_HANSHA_AT[1]),
  // the road's centre line (flat, going west and down)
  PR('prop_ks2_road', 0, 10),
  // examine
  { t: 'obj', id: 'obj_ks2_hyochu', x: KS_HYOCHU_AT[0], y: KS_HYOCHU_AT[1], script: 'obj_ks2_hyochu' } as MapObj,
  { t: 'obj', id: 'obj_ks2_mirror', x: KS_MIRROR_AT[0], y: KS_MIRROR_AT[1], script: 'obj_ks2_mirror' } as MapObj,
  { t: 'obj', id: 'obj_ks2_hansha', x: KS_HANSHA_AT[0], y: KS_HANSHA_AT[1], script: 'obj_ks2_hansha' } as MapObj,
  { t: 'obj', id: 'obj_ks2_guard', x: 0, y: TG_RAIL, w: KS_MIHARASHI.x, face: 'up', script: 'obj_ks2_guard' } as MapObj,
  { t: 'obj', id: 'obj_ks2_guard_e', x: KS_MIHARASHI.x + KS_MIHARASHI.w, y: TG_RAIL, w: TG_W - KS_MIHARASHI.x - KS_MIHARASHI.w, face: 'up', script: 'obj_ks2_guard' } as MapObj,
  { t: 'obj', id: 'obj_ks2_miharashi', x: KS_MIHARASHI.x, y: TG_RAIL, w: KS_MIHARASHI.w, face: 'up', script: 'obj_ks2_miharashi' } as MapObj,
  { t: 'obj', id: 'obj_ks2_sugi', x: 0, y: 14, w: 6, face: 'down', script: 'obj_ks2_sugi' } as MapObj,
  { t: 'obj', id: 'obj_ks2_sugi_2', x: 6, y: 15, w: 6, face: 'down', script: 'obj_ks2_sugi' } as MapObj,
  // the edges: west (the road goes on down into the cloud: by the morning bus), east (back to the village)
  { t: 'trig', id: 'trig_ks2_west', x: 0, y: 10, w: 1, h: 4, on: 'bump' },
  { t: 'trig', id: 'trig_ks2_back', x: TG_W - 1, y: 10, w: 1, h: 4, on: 'bump' },
];

registerMap({
  id: TOUGE,
  name: '峠の カーブ',
  kind: 'outdoor',
  chapter: 2,
  stageFlag: 'flag_ch2_stage',
  rows: ROWS,
  legend: {
    C: { ground: hg('h_kumo'), solid: true, tag: 'prop' },
    G: { ground: 'grass', solid: true, tag: 'guardrail' },
    '.': { ground: hg('h_road'), step: 'se_step_asphalt' },
    ',': { ground: 'weeds', step: 'se_step_grass' },
    H: { ground: 'grass', solid: true, tag: 'hedge' },
    o: { ground: 'weeds', solid: true, tag: 'prop' },
  },
  objects: OBJECTS,
  camera: 'follow',
  variant: 'outdoor',
  pa: 'yama',
  space: 'yama',
  outside: '#0B0B14',
  zones: [{ id: 'area_hoshi_touge', name: '峠の カーブ', x: 0, y: 0, w: TG_W, h: TG_H, wind: 'hill' }],
  structMats: [
    { x: 0, y: TG_RAIL, w: TG_W, h: 1, mat: 'rail', ch: 'G' },
    { x: 0, y: 14, w: TG_W, h: 4, mat: 'sugi_down', ch: 'H' },
  ],
  bgm: { 0: 'bgm_hoshi_night', 1: 'bgm_hoshi_night', 2: 'bgm_hoshi_night' },
  // h2：山の 放送（防災無線）の 声が 遠くに（今の h2 の 音。台詞は 足さない）
  amb: { 0: ['amb_h_insects'], 1: ['amb_h_insects', 'amb_h_wind'], 2: ['amb_h_insects', 'amb_h_wind', 'amb_h_pa_hum'] },
  ambVol: { amb_h_pa_hum: { vol: 0.25, lp: 900 }, amb_h_wind: { vol: 0.4 } },
  onEnter: ['evt_ks2_enter'],
});
