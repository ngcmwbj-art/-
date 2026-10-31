// map_c3_koishi — 小石の 浜（2026-10-22 依頼主の 採用：げむきか 10/22 の 案1「低う、平たく」、03_ch3_index）。
// 24×10、画面 1枚半。海ぞいの町の 岸壁の 西の はしの 岩 (1,25) に 岩を 2段 けずった 石段（door_c3_koishi、
// events/ch3/mizukiri.ts。段階1〜2 だけ）から だけ 来る。浜の 東の はしの 石段 (22,4) に 着く。ほかに 出口は ない
// （北は トベラの やぶと 低い がけ、西は 岩、南は 海）。
//
//      012345678901234567890123
//   0  HHHHHHHHHHHHHHHHHHHHHHHH   トベラの やぶ
//   1  KKKKKKKKKKKKKKKKKKKKKKKK   低い がけ
//   2  KccccccccccccccccRRccccK   舟揚げの 古い 木の レール (16–17,2–5)（舟は ない。またいで 歩ける）
//   3  KocccccccccccccccRRccccK   大きな 石 (1,3)（持ち上がらない）
//   4  KcccTTcccccccccccRRcccnK   テルの 岩 (4–5,4)（テルが すわる）、東の 石段 (22,4)。東の 岩 (23,4) へ 押すと 港へ
//   5  KccccccccccccccccRRccccK
//   6  KccccccccccccccccccccccK   平たい 石の 光る 点（日の 照り返し。ひろうと 別の 所に 出る）
//   7  zzzzzzzzzzzzzzzzzzzzzzzz   波打ちぎわ（段階1 は 鏡の 海の ふち）
//   8  ~~~~~~~~~~~~~~~~~~~~~~~~   海（南へ 続く。HD-2D は 浜からだけ 南の 水平線が 見える 大写しで）
//
// 人：テル（イベントの 間、テルの 岩に すわる）、子ども 3人（テルが 投げた あと 東の はしで 見ている）。敵は 置かない。
// 台本は events/ch3/mizukiri.ts、文は data/text/c3_mizukiri.ts、絵は art/props/mizukiri_art.ts。

import '../../art/props/mizukiri_art';
import { registerMap } from '../../world/maps';
import type { MapObj } from '../../world/types';
import { cg } from './umizoi';

export const KOISHI = 'map_c3_koishi';
export const KOISHI_W = 24;
export const KOISHI_H = 10;

export const KOISHI_ROWS = [
  'HHHHHHHHHHHHHHHHHHHHHHHH', // 0
  'KKKKKKKKKKKKKKKKKKKKKKKK', // 1
  'KccccccccccccccccRRccccK', // 2
  'KocccccccccccccccRRccccK', // 3
  'KcccTTcccccccccccRRcccnK', // 4
  'KccccccccccccccccRRccccK', // 5
  'KccccccccccccccccccccccK', // 6
  'zzzzzzzzzzzzzzzzzzzzzzzz', // 7
  '~~~~~~~~~~~~~~~~~~~~~~~~', // 8
  '~~~~~~~~~~~~~~~~~~~~~~~~', // 9
];

/** 平たい 石の 光る 点の 出る 所（3つ ずつ。ひろうと 次の 空いた 所へ。拾い直す 歩きは 短く：波打ちぎわの 近く）。 */
export const KOISHI_SPOTS: [number, number][] = [
  [8, 6],
  [12, 7],
  [19, 6],
  [10, 7],
  [15, 6],
  [6, 7],
  [13, 6],
  [17, 7],
];

const OBJECTS: MapObj[] = [
  // the boat rails down the beach, the big flat rock, the big round stone
  { t: 'prop', prop: 'prop_mz_reiru', x: 16, y: 2 },
  { t: 'prop', prop: 'prop_mz_iwa', x: 4, y: 4 },
  { t: 'prop', prop: 'prop_mz_ooki', x: 1, y: 3 },
  // the stone steps up to the quay (east end)
  { t: 'prop', prop: 'prop_mz_dan', x: 23, y: 4, opts: { side: 'koishi' } },
  { t: 'door', id: 'door_c3_koishi_back', x: 23, y: 4, to: 'map_umizoi', tx: 2, ty: 25, dir: 'right', se: 'se_step_stone' },
  // (the things to examine, obj_mz_*, the stones' glints, the people: events/ch3/mizukiri.ts)
] as unknown as MapObj[];

registerMap({
  id: KOISHI,
  name: '小石の 浜',
  kind: 'outdoor',
  chapter: 3,
  stageFlag: 'flag_ch3_stage',
  rows: KOISHI_ROWS,
  legend: {
    H: { ground: cg('c3_kusa'), solid: true, tag: 'hedge' },
    K: { ground: cg('c3_iwa'), solid: true, tag: 'hedge' },
    c: { ground: cg('c3_koishi'), step: 'se_step_gravel' },
    R: { ground: cg('c3_koishi'), step: 'se_step_wood' },
    T: { ground: cg('c3_koishi'), solid: true, tag: 'prop' },
    o: { ground: cg('c3_koishi'), solid: true, tag: 'prop' },
    n: { ground: cg('c3_ishidan'), step: 'se_step_stone' },
    z: { ground: cg('c3_nagisa'), step: 'se_step_wet' },
    '~': { ground: cg('c3_umi'), solid: true, tag: 'water' },
  },
  objects: OBJECTS,
  camera: 'follow',
  variant: 'outdoor',
  space: 'minato',
  outside: '#2A5A82',
  zones: [{ id: 'area_c3_koishi', name: '小石の 浜', x: 0, y: 0, w: KOISHI_W, h: KOISHI_H }],
  structMats: [
    { x: 0, y: 0, w: KOISHI_W, h: KOISHI_H, mat: 'zoki', ch: 'H' },
    { x: 0, y: 0, w: KOISHI_W, h: KOISHI_H, mat: 'c3_iwa', ch: 'K' },
  ],
  onEnter: ['evt_mz_enter'],
  bgm: { 1: 'bgm_umi_noon', 2: 'bgm_umi_noon' },
  amb: { 1: ['amb_c3_umi'], 2: ['amb_c3_umi'] },
});
