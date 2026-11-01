// map_hoshi_sakuzoi — 上の 柵ぞい（2026-10-13 依頼主の採用：げむきか 10/11 の 案3〈厳選5案の 3〉、
// 02_ch2_index #99、52 4.9）。30×14、横に 長い 約1画面と 少し。棚田の いちばん 上の 電気柵の 外、
// 杉の 森の すそに そった 細い 道。台本は events/ch2/sakuzoi.ts、文は data/text/hoshi_sakuzoi.ts。
//
//   北（行0〜3）：杉の 森と、すその ササ・やぶ（暗い。森の 目が 光る 所）。
//   行4：細い 道。行5：道の 南の 草（柵から 1マス はなれて 歩く）。
//   行6：電気柵（2段の 線、白い 支柱。番号札は 東の 1 (28) から 西の 8 (0) へ、4マスごと）。
//        柵の 行は「カウンター」：柵ごしに 内側の トマじいと 話せる。
//   行7：いちばん 上の 段の 畦（柵の 内側、歩けない）。畦の 豆。トマじいは ここ。行8〜：棚田。
//   東の はし (29,4)：村の 耕作放棄地の 北西、杉の すきま (44,0) から 来る。区間の スイッチ (29,5)。
//   西の はし (0,4)：沢の 上への 口の 東どなり。棚田の 戸 (14,1) を 通って 村 (14,2) へ 出る。
//
// 直す 所（はじまってから。直すと 絵が かわる）：掘られた 土 (22)、杉の 枝 (17)、クズの つる (13・10)、
// 内側の 畦草 (6・2)。どれも 柵の 行 (y6) を 道 (y5) から 調べる。

import { registerMap } from '../../world/maps';
import type { MapObj } from '../../world/types';
import { hg, PR } from './hoshi_common';

export const SAKU_W = 30;

const ROWS = [
  'HHHHHHHHHHHHHHHHHHHHHHHHHHHHHH', // 0  杉の 森
  'HHHHHHHHHHHHHHHHHHHHHHHHHHHHHH', // 1
  'HHHHHHHHHHHHHHHHHHHHHHHHHHHHHH', // 2
  'YYYYYYYYYYYYYYYYYYYYYYYYYYYYYY', // 3  森の すそ（ササ・やぶ）
  '::::::::::::::::::::::::::::::', // 4  細い 道（はしの 2つは 出入口）
  ',,,,,,,,,,,,,,,,,,,,,,,,,,,,,o', // 5  柵の 前の 草。区間の スイッチ (29,5)
  'EEEEEEEEEEEEEEEEEEEEEEEEEEEEEE', // 6  電気柵
  'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', // 7  いちばん 上の 段の 畦（内側）
  '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~', // 8  棚田
  '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~', // 9
  '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~', // 10
  'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', // 11 1段 下の 畦
  '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~', // 12
  '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~', // 13
];

/** The spots to fix: [id, tile x, w] on the fence's row (examined from the path, facing down). */
export const SAKU_SPOT_AT: Record<string, number> = { tsuchi: 22, eda: 17, kuzu1: 13, kuzu2: 10, aze1: 6, aze2: 2 };
/** The numbered posts: plate n on the post of tile x (east 1 → west 8). */
export const SAKU_POST_X = [28, 24, 20, 16, 12, 8, 4, 0];

const ON = { flag: 'flag_saku_start', notFlag: 'flag_saku_done' };
const fixedF = (k: string) => `flag_saku_f_${k}`;

function spot(k: string, x: number): MapObj[] {
  const f = fixedF(k);
  const before = { flag: 'flag_saku_start', notFlag: f };
  const out: MapObj[] = [];
  if (k === 'tsuchi') {
    out.push(PR('prop_saku_hole', x, 6, {}, { cond: { notFlag: f } }));
    out.push(PR('prop_saku_hole', x, 6, { fixed: 1 }, { cond: { flag: f } }));
  } else if (k === 'eda') {
    out.push(PR('prop_saku_eda', x, 6, {}, { cond: { notFlag: f } }));
  } else if (k.startsWith('kuzu')) {
    const v = k === 'kuzu1' ? 0 : 1;
    out.push(PR('prop_saku_kuzu', x, 6, { v }, { cond: { notFlag: f } }));
    out.push(PR('prop_saku_kuzu', x, 6, { v, cut: 1 }, { cond: { flag: f } }));
  } else {
    const v = k === 'aze1' ? 0 : 1;
    out.push(PR('prop_saku_azekusa', x, 7, { v }, { cond: { notFlag: f } }));
    out.push(PR('prop_saku_azekusa', x, 7, { v, cut: 1 }, { cond: { flag: f } }));
  }
  // examined from the path (y5) facing the fence: 2 tiles wide
  out.push({ t: 'obj', id: `obj_saku_${k}`, x, y: 6, w: 2, face: 'down', priority: 2, script: 'obj_saku_spot', cond: before } as MapObj);
  return out;
}

const OBJECTS: MapObj[] = [
  // ======================================================== 畦の 豆（大豆。いつも）
  PR('prop_ashiato_azemame', 0, 7),
  PR('prop_ashiato_azemame', 5, 7),
  PR('prop_ashiato_azemame', 24, 11),
  // the wood's edge: a few tall pampas and goldenrod in the scrub
  PR('prop_h_susuki', 7, 3, { v: 1 }),
  PR('prop_h_susuki', 19, 3, { v: 2 }),
  PR('prop_h_goldenrod', 25, 3, { v: 1 }),
  PR('prop_h_kunugi', 15, 3),

  // ======================================================== 直す 所
  ...Object.entries(SAKU_SPOT_AT).flatMap(([k, x]) => spot(k, x)),

  // ======================================================== 支柱の 番号札（マサルの 字）
  ...SAKU_POST_X.flatMap((x, i) => [
    PR('prop_saku_fuda', x, 6, { n: i + 1 }),
    { t: 'obj', id: `obj_saku_fuda_${i + 1}`, x, y: 6, face: 'down', priority: 1, script: 'obj_saku_fuda' } as MapObj,
  ]),
  // the rest of the fence's row (the wires)
  { t: 'obj', id: 'obj_saku_sen', x: 0, y: 6, w: SAKU_W, face: 'down', script: 'obj_saku_sen' } as MapObj,

  // ======================================================== 区間の スイッチ（東の はし）
  PR('prop_saku_switch', 29, 5, { on: 1 }, { cond: { notFlag: 'flag_saku_off' } }),
  PR('prop_saku_switch', 29, 5, { on: 0 }, { cond: { flag: 'flag_saku_off' } }),
  { t: 'obj', id: 'obj_saku_switch', x: 29, y: 5, script: 'obj_saku_switch' } as MapObj,

  // ======================================================== 人（見回りの あいだ）
  // マサル（灯りの うしろを 少し はなれて ついてくる。events/ch2/sakuzoi.ts）
  { t: 'npc', id: 'npc_saku_gen', sprite: 'npc_hoshi_gen', x: 28, y: 5, dir: 'left', ghost: true, script: 'npc_saku_gen', cond: ON } as MapObj,
  // トマじい（柵の 内側、いちばん 上の 段の 畦。柵ごしに 話す）
  { t: 'npc', id: 'npc_saku_tome', sprite: 'npc_hoshi_tome', x: 9, y: 7, dir: 'up', script: 'npc_saku_tome', cond: ON } as MapObj,

  // ======================================================== 出入口
  // 東：村の 杉の すきま (44,0) の 前へ
  { t: 'door', id: 'door_saku_e', x: 29, y: 4, step: true, to: 'map_hoshimidai', tx: 44, ty: 1, dir: 'down', se: 'se_step_dirt', cond: { flag: 'flag_saku_done' } },
  // 西：沢の 上への 口の 東どなり → 棚田の 戸 (14,1) を 通って (14,2) へ（戸が 開いている とき）
  { t: 'door', id: 'door_saku_w', x: 0, y: 4, step: true, to: 'map_hoshimidai', tx: 14, ty: 2, dir: 'down', se: 'se_step_dirt', cond: { flag: ['flag_saku_done', 'flag_ch2_sawa_open'] } },
  // 見回りの あいだは 出ない（マサル）。見回りの あと、棚田の 戸が かかっている ときの 西の はし
  { t: 'trig', id: 'trig_saku_door_e', x: 29, y: 4, w: 1, h: 1, script: 'evt_saku_door_wait', cond: ON },
  { t: 'trig', id: 'trig_saku_door_w', x: 0, y: 4, w: 1, h: 1, script: 'evt_saku_door_wait', cond: ON },
  { t: 'trig', id: 'trig_saku_door_w_shut', x: 0, y: 4, w: 1, h: 1, script: 'evt_saku_door_shut', cond: { flag: 'flag_saku_done', notFlag: 'flag_ch2_sawa_open' } },
];

registerMap({
  id: 'map_hoshi_sakuzoi',
  name: '上の 柵ぞい',
  kind: 'outdoor',
  chapter: 2,
  stageFlag: 'flag_ch2_stage',
  rows: ROWS,
  legend: {
    H: { ground: 'grass', solid: true, tag: 'hedge' },
    Y: { ground: 'grass', solid: true, tag: 'hedge' },
    ':': { ground: hg('h_yamamichi'), step: 'se_step_dirt' },
    ',': { ground: 'grass', step: 'se_step_grass' },
    o: { ground: 'grass', solid: true, tag: 'prop' },
    // the fence: talked across (トマじい on the ridge behind it)
    E: { ground: 'grass', solid: true, counter: true, tag: 'fence' },
    A: { ground: hg('h_aze'), solid: true },
    '~': { ground: hg('h_tanada'), solid: true, tag: 'paddy' },
  },
  objects: OBJECTS,
  camera: 'follow',
  variant: 'outdoor',
  pa: 'yama',
  space: 'yama',
  outside: '#0B0B14',
  // the wood and the path along it are a dark (a step darker than the night): the lantern shows the way
  dark: [{ x: 0, y: 0, w: SAKU_W, h: 6 }],
  zones: [{ id: 'area_hoshi_sakuzoi', name: '上の 柵ぞい', x: 0, y: 0, w: SAKU_W, h: 14, wind: 'sugi' }],
  structMats: [
    { x: 0, y: 0, w: SAKU_W, h: 3, mat: 'sugi', ch: 'H' },
    { x: 0, y: 3, w: SAKU_W, h: 1, mat: 'yabu', ch: 'Y' },
    { x: 0, y: 6, w: SAKU_W, h: 1, mat: 'efence', ch: 'E' },
  ],
  bgm: { 0: 'bgm_hoshi_night', 1: 'bgm_hoshi_night', 2: 'bgm_hoshi_night' },
  // 流用のみ：虫と 杉の 葉ずれ、棚田の 水、電源の 箱の カチッ（切って いる あいだは 鳴らない。sakuzoi.ts）
  amb: {
    0: ['amb_h_insects', 'amb_h_wind', 'amb_h_tanada', 'amb_h_fence'],
    1: ['amb_h_insects', 'amb_h_wind', 'amb_h_tanada', 'amb_h_fence'],
    2: ['amb_h_insects', 'amb_h_wind', 'amb_h_tanada', 'amb_h_fence', 'amb_h_pa_hum'],
  },
  ambVol: { amb_h_pa_hum: { vol: 0.3, lp: 1200 } },
});
