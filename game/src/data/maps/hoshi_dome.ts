// map_hoshi_dome — 村営天文台の中（げむきか 10/1 の 3「朝の ほうだけ 光る 星」、
// 02_ch2_index #77、52 4.7、台本は 50 10.25）。12×10、1画面（カメラ固定）。
// 星見の丘の 扉 (4,5) から 北へ 入り（天文台の鍵が あるときだけ）、南の 戸 (6,9) から
// 丘の (4,6) に 出る。10年 閉めきりで 部屋じゅう 暗がり（トマトの 灯りで 見る）。
// スリットを 開けると、ドームの 向きに 合わせて 床に 星あかりの 帯。
//
//      012345678901
//   0  ##WWWWWWWW##   北の 円い 壁（写真 (3,1)、観望会の カレンダー (7,1)）
//   1  #WWWWWWWWWW#
//   2  ##cccccccXX#   机 (9–10,2)
//   3  #cccccccccc#   西の 壁の ハンドル『スリット』(0,3)
//   4  #ccccPPcccc#   柱と 望遠鏡 (5–6,4–5)
//   5  #ccccPPcccc#   西の 壁の ハンドル『ドーム』(0,5)
//   6  #cccccccccc#
//   7  #cXccccccXX#   赤い ライトの 箱 (2,7)、パイプいす (9–10,7)
//   8  ##cccccccc##
//   9  ######D#####   戸 (6,9)

import '../../art/props/dome_art';
import { registerMap } from '../../world/maps';
import type { MapObj, StarlightSpot } from '../../world/types';
import { flag } from '../../game/state';
import { hg, PR } from './hoshi_common';

const ROWS = [
  '##WWWWWWWW##',
  '#WWWWWWWWWW#',
  '##cccccccXX#',
  '#cccccccccc#',
  '#ccccPPcccc#',
  '#ccccPPcccc#',
  '#cccccccccc#',
  '#cXccccccXX#',
  '##cccccccc##',
  '######D#####',
];

/** An examinable here (the texts and the steps are the scenario's: src/events/ch2/dome.ts). */
const X = (id: string, x: number, y: number, extra: Record<string, unknown> = {}): MapObj => ({ t: 'obj', id, x, y, ...extra }) as unknown as MapObj;

const OBJECTS: MapObj[] = [
  PR('prop_dome_shell', 0, 0),
  PR('prop_dome_scope', 5, 4),
  PR('prop_dome_desk', 9, 2),
  PR('prop_dome_lightbox', 2, 7),
  PR('prop_dome_chairs', 9, 7),
  // the telescope on its pier: from any side
  X('obj_dome_scope', 5, 4, { w: 2, h: 2 }),
  // the west wall's hand cranks (from (1,3) / (1,5) facing west)
  X('obj_dome_crank_slit', 0, 3, { face: 'left' }),
  X('obj_dome_crank_rot', 0, 5, { face: 'left' }),
  // the desk: the record book (9,2) and the planisphere (10,2), from below
  X('obj_dome_note', 9, 2, { face: 'up' }),
  X('obj_dome_hayami', 10, 2, { face: 'up' }),
  X('obj_dome_light', 2, 7),
  X('obj_dome_isu', 9, 7, { w: 2 }),
  X('obj_dome_photo', 3, 1, { face: 'up' }),
  { t: 'door', id: 'door_hoshi_dome_out', x: 6, y: 9, to: 'map_hoshi_hill', tx: 4, ty: 6, dir: 'down', se: 'se_dome_door' },
];

/** The starlight through the open slit (readable without the lantern): along the band on the floor, by the dome's direction. */
const az = () => (flag('flag_dome_az') > 0 ? flag('flag_dome_az') : 180);
const open = () => flag('flag_dome_slit') > 0;
const STAR: StarlightSpot[] = [
  // facing east (金星): the band falls from the east side toward the west of the pier
  ...([
    [8, 3],
    [7, 4],
    [4, 6],
  ] as [number, number][]).map(([x, y]) => ({ x, y, r: 1.1, cond: { when: () => open() && az() < 110 } })),
  // facing south-east (the nebula, the Pleiades): nearer the middle
  ...([
    [7, 3],
    [4, 6],
    [3, 7],
  ] as [number, number][]).map(([x, y]) => ({ x, y, r: 1.1, cond: { when: () => open() && az() >= 110 && az() < 170 } })),
  // still south (opened, not turned yet)
  ...([
    [6, 3],
    [5, 6],
    [5, 7],
  ] as [number, number][]).map(([x, y]) => ({ x, y, r: 1.1, cond: { when: () => open() && az() >= 170 } })),
];

registerMap({
  id: 'map_hoshi_dome',
  name: '村営天文台',
  kind: 'indoor',
  chapter: 2,
  stageFlag: 'flag_ch2_stage',
  rows: ROWS,
  legend: {
    '#': { ground: 'void', solid: true, tag: 'void' },
    W: { ground: 'void', solid: true, tag: 'iwall' },
    D: { ground: 'void', solid: true, door: true, tag: 'door' },
    c: { ground: hg('h_concrete'), step: 'se_step_stone' },
    X: { ground: hg('h_concrete'), solid: true, tag: 'prop' },
    P: { ground: hg('h_concrete'), solid: true, tag: 'prop' },
  },
  objects: OBJECTS,
  camera: 'fixed',
  variant: 'house',
  space: 'room',
  outside: '#0B0B14',
  // 10 years shut: the whole room is dark (the tomato light shows it); the slit's starlight when open
  lightBase: '#7C78AA',
  dark: [{ x: 0, y: 0, w: 12, h: 10 }],
  darkEdge: 6,
  starlight: STAR,
  onEnter: ['evt_dome_enter'],
  bgm: { 0: 'bgm_hoshi_night', 1: 'bgm_hoshi_night', 2: 'bgm_hoshi_night' },
  // the night outside through the drum's walls; the loudspeaker next door is heard muffled (indoor)
  amb: { 0: ['amb_h_insects'], 1: ['amb_h_insects'], 2: ['amb_h_insects', 'amb_h_pa_hum'] },
  ambVol: { amb_h_insects: { vol: 0.3, lp: 1800 }, amb_h_pa_hum: { vol: 0.35, lp: 900 } },
});
